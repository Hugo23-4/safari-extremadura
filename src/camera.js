// ============================================================
// camera.js — Orbit + WASD primera persona + modo 4x4 safari
// ============================================================
import * as THREE from 'three';

export function createCameraController(camera, canvas, world) {
  const state = {
    mode: 'orbit',   // 'orbit' | 'safari' | 'car'
    target: new THREE.Vector3(0, 6, 0),
    distance: 60,
    azimuth: Math.PI * 0.25,
    polar: Math.PI * 0.32,
    autoRotate: true,
    autoSpeed: 0.04,
    // Safari mode (a pie)
    safariEyeY: 4.5,
    safariYaw: 0,
    safariPitch: -0.2,
    safariVelocity: new THREE.Vector3(),
    safariHeading: new THREE.Vector3(0, 0, -1),
    keys: {},
    isLocked: false,
    // Car mode
    carPosition: new THREE.Vector3(0, 0, 0),
    carYaw: 0,
    carSpeed: 0,
    carMaxSpeed: 18,    // m/s (~65 km/h)
    carSteer: 0,
    carPathT: 0,        // posición a lo largo del camino (0..1)
    carReverse: false,
    carDistance: 0,     // km
    // Hooks
    onModeChange: null
  };

  const MIN_DIST = 15, MAX_DIST = 140;
  const MIN_POLAR = 0.15, MAX_POLAR = 1.3;

  function applyOrbit() {
    const x = state.distance * Math.sin(state.polar) * Math.sin(state.azimuth);
    const z = state.distance * Math.sin(state.polar) * Math.cos(state.azimuth);
    const y = state.distance * Math.cos(state.polar);
    camera.position.set(
      state.target.x + x,
      state.target.y + y,
      state.target.z + z
    );
    camera.lookAt(state.target);
  }

  // Mouse
  let dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (state.mode === 'orbit') {
      dragging = true;
      lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (state.mode === 'orbit' && dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      state.azimuth -= dx * 0.005;
      state.polar = Math.max(MIN_POLAR, Math.min(MAX_POLAR, state.polar - dy * 0.005));
    } else if (state.mode === 'safari') {
      if (state.isLocked) {
        state.safariYaw   -= e.movementX * 0.0025;
        state.safariPitch -= e.movementY * 0.0025;
        state.safariPitch = Math.max(-1.2, Math.min(0.6, state.safariPitch));
      }
    } else if (state.mode === 'car') {
      if (state.isLocked) {
        // Mirar alrededor dentro del coche
        state.carYaw   -= e.movementX * 0.002;
      }
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    dragging = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
  });
  canvas.addEventListener('wheel', (e) => {
    if (state.mode === 'orbit') {
      state.distance = Math.max(MIN_DIST, Math.min(MAX_DIST, state.distance + e.deltaY * 0.05));
    }
  }, { passive: true });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    state.keys[e.code] = true;
    if (state.mode === 'orbit' && (e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD')) {
      enterSafari();
    }
    if (e.code === 'Escape') {
      if (state.mode === 'safari' || state.mode === 'car') {
        exitToOrbit();
      }
    }
    // Tecla C = coche
    if (e.code === 'KeyC' && state.mode !== 'car') {
      enterCar();
    }
  });
  window.addEventListener('keyup', (e) => { state.keys[e.code] = false; });

  const onLockChange = () => {
    state.isLocked = (document.pointerLockElement === canvas);
  };
  document.addEventListener('pointerlockchange', onLockChange);

  function enterSafari() {
    state.mode = 'safari';
    canvas.requestPointerLock?.();
    if (state.onModeChange) state.onModeChange('safari');
  }
  function enterCar() {
    // Inicializa coche en el inicio del camino
    if (world.pathPoints && world.pathPoints.length > 0) {
      const p0 = world.pathPoints[0];
      state.carPosition.set(p0.x, 0, p0.y);
      state.carPathT = 0;
      state.carYaw = computeYawAtT(0);
    }
    state.mode = 'car';
    state.carSpeed = 0;
    canvas.requestPointerLock?.();
    if (state.onModeChange) state.onModeChange('car');
  }
  function exitToOrbit() {
    state.mode = 'orbit';
    state.autoRotate = true;
    document.exitPointerLock?.();
    if (state.onModeChange) state.onModeChange('orbit');
  }

  // Click raycast
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  canvas.addEventListener('click', (e) => {
    if (state.mode !== 'orbit') return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    if (state.onPick) state.onPick(raycaster);
  });

  // ============== PATH FOLLOWING (modo coche) ==============
  function computeYawAtT(t) {
    if (!world.pathPoints || world.pathPoints.length < 2) return 0;
    const segs = world.pathPoints.length - 1;
    const fIdx = t * segs;
    const i = Math.min(segs - 1, Math.floor(fIdx));
    const a = world.pathPoints[i];
    const b = world.pathPoints[i + 1];
    return Math.atan2(b.x - a.x, b.y - a.y);
  }
  function getPositionAtT(t, out = new THREE.Vector3()) {
    if (!world.pathPoints || world.pathPoints.length < 2) {
      out.set(0, 0, 0);
      return out;
    }
    const segs = world.pathPoints.length - 1;
    const fIdx = t * segs;
    const i = Math.min(segs - 1, Math.floor(fIdx));
    const frac = fIdx - i;
    const a = world.pathPoints[i];
    const b = world.pathPoints[i + 1];
    out.set(
      a.x + (b.x - a.x) * frac,
      0,
      a.y + (b.y - a.y) * frac
    );
    out.y = world.getH(out.x, out.z);
    return out;
  }

  function update(dt) {
    if (state.mode === 'orbit') {
      if (state.autoRotate) state.azimuth += state.autoSpeed * dt;
      applyOrbit();
    } else if (state.mode === 'safari') {
      const forward = new THREE.Vector3(
        Math.sin(state.safariYaw), 0, Math.cos(state.safariYaw)
      );
      const right = new THREE.Vector3(
        Math.cos(state.safariYaw), 0, -Math.sin(state.safariYaw)
      );
      let move = new THREE.Vector3();
      if (state.keys['KeyW']) move.add(forward);
      if (state.keys['KeyS']) move.sub(forward);
      if (state.keys['KeyD']) move.add(right);
      if (state.keys['KeyA']) move.sub(right);
      if (move.lengthSq() > 0) move.normalize();

      const speed = state.keys['Space'] ? 14 : 7;
      state.safariVelocity.lerp(move.multiplyScalar(speed), Math.min(1, dt * 6));

      camera.position.add(state.safariVelocity.clone().multiplyScalar(dt));
      const h = world.getH(camera.position.x, camera.position.z);
      camera.position.y = h + state.safariEyeY + Math.sin(state.safariPitch) * -2;
      const LIM = 100;
      camera.position.x = Math.max(-LIM, Math.min(LIM, camera.position.x));
      camera.position.z = Math.max(-LIM, Math.min(LIM, camera.position.z));

      const cp = Math.cos(state.safariPitch);
      const sp = Math.sin(state.safariPitch);
      camera.lookAt(
        camera.position.x + Math.sin(state.safariYaw) * cp,
        camera.position.y + sp,
        camera.position.z + Math.cos(state.safariYaw) * cp
      );
      const swayX = Math.sin(performance.now() * 0.005) * 0.2;
      const swayY = Math.sin(performance.now() * 0.005 * 2) * 0.12;
      camera.rotation.z = swayX * 0.01;
      camera.rotation.x += swayY * 0.005;
    } else if (state.mode === 'car') {
      updateCar(dt);
    }
  }

  function updateCar(dt) {
    // Acelera / frena / gira
    const accel = state.keys['KeyW'] ? 12 : (state.keys['KeyS'] ? -8 : 0);
    const steer = (state.keys['KeyA'] ? 1 : 0) + (state.keys['KeyD'] ? -1 : 0);

    // Velocidad
    state.carSpeed += accel * dt;
    // Fricción
    state.carSpeed *= Math.max(0, 1 - dt * 0.4);
    // Clamp
    state.carSpeed = Math.max(-state.carMaxSpeed * 0.5, Math.min(state.carMaxSpeed, state.carSpeed));

    // Steering proporcional a la velocidad (más estable a alta velocidad)
    const steerAmount = state.carSpeed > 0.1
      ? steer * Math.min(state.carSpeed / 4, 1.2) * dt * 1.6
      : (state.carSpeed < -0.1
        ? steer * Math.min(-state.carSpeed / 4, 1.2) * dt * 1.6
        : 0);
    state.carYaw += steerAmount;

    // Avanzamos por el path (t)
    // Aproximamos distancia recorrida al integrar velocidad * dt en unidades de t
    // pathPoints está en coordenadas mundo (x,z en m), con longitud ~250 m para 200 segments
    // Asumimos 200m de path total
    const pathLength = 250;
    state.carDistance += Math.abs(state.carSpeed) * dt / 1000; // km
    const ds = state.carSpeed * dt / pathLength;
    state.carPathT += ds;
    state.carPathT = Math.max(0, Math.min(1, state.carPathT));

    // Posición a lo largo del path
    const targetPos = getPositionAtT(state.carPathT);
    state.carPosition.copy(targetPos);

    // El yaw del coche debe seguir la dirección del path
    const pathYaw = computeYawAtT(state.carPathT);
    // Suavizar yaw hacia el del path
    let dy = pathYaw - state.carYaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    state.carYaw += dy * Math.min(1, dt * 4);

    // Cámara en primera persona dentro del coche
    // Posición: dentro del coche (un poco a la izquierda para sentir al conductor)
    const eyeOffset = new THREE.Vector3(
      -0.55, 1.85, 0.4
    ).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.carYaw);

    const cp = Math.cos(0);
    const sp = Math.sin(0);
    const fwd = new THREE.Vector3(Math.sin(state.carYaw), 0, Math.cos(state.carYaw));

    camera.position.copy(state.carPosition).add(eyeOffset);
    // Pequeña vibración por velocidad / terreno
    const vib = Math.abs(state.carSpeed) * 0.008;
    camera.position.x += (Math.random() - 0.5) * vib;
    camera.position.y += (Math.random() - 0.5) * vib * 0.5;
    camera.position.z += (Math.random() - 0.5) * vib;

    camera.lookAt(
      camera.position.x + fwd.x * 10,
      camera.position.y - 0.1,
      camera.position.z + fwd.z * 10
    );
    // Ligero cabeceo al acelerar/frenar
    camera.rotation.x -= state.carSpeed * 0.002;

    // Steering wheel animation
    if (state.steeringWheelObj) {
      state.steeringWheelObj.rotation.x = -steerAmount * 30;
      // (rotación sobre eje Y para volante)
      state.steeringWheelObj.rotation.y = steerAmount * 8;
    }
  }

  return {
    state,
    update,
    enterSafari,
    enterCar,
    exitToOrbit,
    toggleMode,
    focusOn(pos, dist = 25) {
      state.mode = 'orbit';
      state.target.copy(pos);
      state.distance = dist;
      state.autoRotate = false;
      if (state.onModeChange) state.onModeChange('orbit');
    },
    setOnPick(fn) { state.onPick = fn; },
    setOnModeChange(fn) { state.onModeChange = fn; },
    setSteeringWheel(obj) { state.steeringWheelObj = obj; },
    getCarPosition() { return state.carPosition.clone(); },
    getCarYaw() { return state.carYaw; },
    getCarSpeed() { return state.carSpeed; },
    getCarKm() { return state.carDistance; }
  };
}