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

// =============== CARGA POR ETAPAS ===============
// Construir la escena bloquea el hilo ~2 s en PC (más en móvil). Entre etapas se
// cede el control al navegador para que la pantalla de carga se pinte y avance.
const loadingEl = document.getElementById('loading');
const loadStatus = document.getElementById('loadStatus');
const loadFill = document.getElementById('loadFill');

function nextPaint() {
  return new Promise(resolve => {
    // rAF garantiza un pintado; el timeout evita quedarse esperando en pestañas ocultas
    const fallback = setTimeout(resolve, 120);
    requestAnimationFrame(() => { clearTimeout(fallback); setTimeout(resolve, 0); });
  });
}

async function stage(label, pct) {
  if (loadStatus) loadStatus.textContent = label;
  if (loadFill) loadFill.style.width = pct + '%';
  await nextPaint();
}

// Si algo falla al arrancar, decirlo en la pantalla de carga en vez de quedarse colgado
function showLoadError(err) {
  console.error(err);
  if (!loadingEl || loadingEl.classList.contains('hidden')) return;
  if (loadStatus) loadStatus.textContent = 'No se ha podido iniciar la escena 3D · recarga o actualiza el navegador';
}

async function init() {
  // =============== RENDERER ===============
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance'
  });
  // Móvil (dedo como puntero principal): menos píxeles por frame. Con DPR 3 de iPhone
  // a 2 se pintaba 4× la resolución CSS; 1.5 sigue nítido y aligera mucho la GPU
  const isMobile = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  // PCFSoftShadowMap ya no existe en three r186 (caía a PCFShadowMap con aviso en consola)
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Sombras recalculadas 1 de cada 2 frames (ver loop): el sol es fijo y los animales van
  // a 1-2 m/s, no se nota, y la pasada de sombras era ~21% del frame
  renderer.shadowMap.autoUpdate = false;
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
  await stage('Generando Sierra del Torozón…', 12);
  const world = buildTerrain(scene);
  // Sombras a 1024 en móvil (2048 en escritorio): cuarta parte de memoria y de relleno
  if (isMobile && world.sun?.shadow) world.sun.shadow.mapSize.set(1024, 1024);
  buildCortijo(scene, world.getH);
  await stage('Plantando 600 encinas…', 30);
  populateVegetation(scene, world);

  // =============== FAUNA ===============
  await stage('Repartiendo fauna…', 55);
  const fauna = createFauna(scene, world);

  // =============== VEHÍCULO 4×4 ===============
  await stage('Aparcando el 4×4…', 70);
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

  // El primer frame compila los shaders (≈2 s en Windows/ANGLE): avisar antes del tirón
  await stage('Encendiendo el sol…', 85);

  // =============== UI ===============
  const ui = createUI({ fauna, camera, world, scene, cameraCtrl });

  // Cambio de modo: actualizo visibilidad de coche/UI
  cameraCtrl.setOnModeChange((mode) => {
    // El CSS móvil recoloca el HUD según el modo (.app[data-mode="car"])
    canvas.closest('.app')?.setAttribute('data-mode', mode);
    const carHud = document.getElementById('carHud');
    const carLaunch = document.getElementById('carLaunch');
    const guidePanel = document.getElementById('guide');
    if (mode === 'car') {
      if (carHud) carHud.classList.remove('hidden');
      if (carLaunch) carLaunch.classList.add('hidden');
      // Mostrar el panel del guía automáticamente (si sigue en el coche al cumplirse el plazo)
      setTimeout(() => {
        if (cameraCtrl.state.mode === 'car' && guidePanel && guidePanel.classList.contains('hidden')) {
          guidePanel.classList.remove('hidden');
        }
      }, 600);
    } else {
      if (carHud) carHud.classList.add('hidden');
      if (carLaunch) carLaunch.classList.remove('hidden');
      // El guía es del 4×4: al bajarse se cierra (si no, quedaba encima de las especies)
      if (guidePanel) guidePanel.classList.add('hidden');
    }
  });

  // =============== RAYCASTING ===============
  const animalMeshes = fauna.list.map(a => a.mesh);
  cameraCtrl.setOnPick((ray) => {
    const hits = ray.intersectObjects(animalMeshes, true);
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
  // dt con el timestamp de requestAnimationFrame (THREE.Clock está deprecado en r186)
  let lastT = performance.now();
  let totalT = 0;
  let frame = 0;
  function loop(now = performance.now()) {
    const dt = Math.min(Math.max((now - lastT) / 1000, 0), 0.05);
    lastT = now;
    // Con un vídeo hero en pantalla el canvas está oculto: no gastar GPU en la escena
    if (canvas.classList.contains('hidden')) {
      requestAnimationFrame(loop);
      return;
    }
    totalT += dt;

    cameraCtrl.update(dt);
    fauna.update(dt, totalT, camera);

    // Sincronizar coche visible con la posición de la cámara cuando estamos en modo coche
    // Fuera del modo coche no se dibuja (antes solo se bajaba a y=-100: 83 mallas renderizadas igual)
    vehicle.visible = cameraCtrl.state.mode === 'car';
    if (cameraCtrl.state.mode === 'car') {
      vehicle.position.copy(cameraCtrl.state.carPosition);
      vehicle.rotation.y = cameraCtrl.state.carYaw;
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

    if (frame++ % 2 === 0) renderer.shadowMap.needsUpdate = true;
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
}

init().catch(showLoadError);
