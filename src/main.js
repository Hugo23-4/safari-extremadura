// ============================================================
// main.js — Entry point
// ============================================================
import * as THREE from 'three';
import { buildTerrain, buildCortijo } from './world.js';
import { populateVegetation } from './trees.js';
import { createFauna } from './animals.js';
import { createCameraController } from './camera.js';
import { createUI } from './ui.js';
import { buildSafariVehicle } from './vehicle.js';

// =============== RENDERER ===============
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

// =============== SCENE + CAMERA ===============
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);

// =============== WORLD ===============
const world = buildTerrain(scene);
const cortijo = buildCortijo(scene, world.getH);
const vegetation = populateVegetation(scene, world);

// =============== FAUNA ===============
const fauna = createFauna(scene, world);

// =============== VEHÍCULO 4×4 ===============
const vehicle = buildSafariVehicle();
scene.add(vehicle);
// Lo posicionamos en el inicio del camino
if (world.pathPoints && world.pathPoints.length > 0) {
  const p0 = world.pathPoints[0];
  vehicle.position.set(p0.x, world.getH(p0.x, p0.y), p0.y);
}
// Le añadimos el interior como hijo
const interior = vehicle.userData.interior;
vehicle.add(interior);

// =============== CAMERA ===============
const cameraCtrl = createCameraController(camera, canvas, world);
cameraCtrl.setSteeringWheel(vehicle.userData.steeringWheel);

// =============== UI ===============
const ui = createUI({ fauna, camera, world, scene, cameraCtrl });
ui.setCameraController(cameraCtrl);

// Cambio de modo: actualizo visibilidad de coche/UI
cameraCtrl.setOnModeChange((mode) => {
  const carHud = document.getElementById('carHud');
  const carLaunch = document.getElementById('carLaunch');
  const guidePanel = document.getElementById('guide');
  if (mode === 'car') {
    if (carHud) carHud.classList.remove('hidden');
    if (carLaunch) carLaunch.classList.add('hidden');
    // Mostrar el panel del guía automáticamente
    setTimeout(() => {
      if (guidePanel && guidePanel.classList.contains('hidden')) {
        guidePanel.classList.remove('hidden');
      }
    }, 600);
  } else {
    if (carHud) carHud.classList.add('hidden');
    if (carLaunch) carLaunch.classList.remove('hidden');
  }
});

// =============== RAYCASTING ===============
cameraCtrl.setOnPick((ray) => {
  const hits = ray.intersectObjects(scene.children, true);
  for (const h of hits) {
    let obj = h.object;
    while (obj && !obj.userData?.animal && !obj.userData?.species) obj = obj.parent;
    if (obj && obj.userData?.species) {
      ui.toast('IDENTIFICADO: ' + obj.userData.species.toUpperCase(), 'haz click para seguir');
      cameraCtrl.focusOn(obj.position.clone().add(new THREE.Vector3(0, 2, 0)), 15);
      return;
    }
  }
});

// =============== RESIZE ===============
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
});

// =============== RENDER LOOP ===============
const clock = new THREE.Clock();
let totalT = 0;
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  totalT += dt;

  cameraCtrl.update(dt);
  fauna.update(dt, totalT, camera);

  // Sincronizar coche visible con la posición de la cámara cuando estamos en modo coche
  if (cameraCtrl.state.mode === 'car') {
    vehicle.position.copy(cameraCtrl.state.carPosition);
    vehicle.rotation.y = cameraCtrl.state.carYaw;
  } else {
    // Fuera del coche: ocultamos el coche tras otros vehículos
    vehicle.position.y = -100;
  }

  world.sky.position.copy(camera.position);
  world.updateDust(dt);
  world.updateLightCycle(dt);
  world.updateCharca(dt);

  // Animación ruedas
  if (vehicle.userData.wheels) {
    const rotSpeed = cameraCtrl.state.carSpeed * dt * 4;
    for (const w of vehicle.userData.wheels) {
      w.children[0].rotation.y += rotSpeed;
    }
  }

  ui.update();

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();

// =============== HMR ===============
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    renderer.dispose();
  });
}