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

  // Keyboard (ignorado mientras se escribe en formularios: "Carlos" no debe subir al 4×4)
  const isTypingTarget = (t) => !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  const appEl = document.getElementById('app');
  window.addEventListener('keydown', (e) => {
    // Ni escribiendo, ni con la app aún tapada por el loading/intro (la tecla solo omite la carga)
    if (isTypingTarget(e.target) || appEl?.classList.contains('hidden')) return;
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
  // Si la ventana pierde el foco con una tecla pulsada, no seguir andando solo
  window.addEventListener('blur', () => { state.keys = {}; });

  // ============ TOUCH CONTROLS (móvil / iPhone) ============
  // Detectar si hay pantalla táctil
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  // Pointer lock solo con ratón: en móvil no existe o rechaza la promesa
  const hasFinePointer = window.matchMedia?.('(any-pointer: fine)').matches ?? true;
  let updateTouchUi = null;

  // Tap largo en safari/car para simular look-around (drag dedo en pantalla)
  let touchLookId = null;
  let touchLookX = 0, touchLookY = 0;
  canvas.addEventListener('touchstart', (e) => {
    if (state.mode === 'safari' || state.mode === 'car') {
      // Capturar primer touch para look-around
      const t = e.touches[0];
      touchLookId = t.identifier;
      touchLookX = t.clientX;
      touchLookY = t.clientY;
      if (e.cancelable) e.preventDefault();
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (state.mode === 'safari' || state.mode === 'car') {
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (t.identifier === touchLookId) {
          const dx = t.clientX - touchLookX;
          const dy = t.clientY - touchLookY;
          touchLookX = t.clientX;
          touchLookY = t.clientY;
          if (state.mode === 'safari') {
            state.safariYaw   -= dx * 0.005;
            state.safariPitch -= dy * 0.005;
            state.safariPitch = Math.max(-1.2, Math.min(0.6, state.safariPitch));
          } else {
            state.carYaw -= dx * 0.004;
          }
          break;
        }
      }
      if (e.cancelable) e.preventDefault();
    }
  }, { passive: false });

  // Con touch-action:none Chrome manda estos eventos como no cancelables: preventDefault
  // solo si se puede (evita avisos en consola; iOS antiguo sí lo necesita para no rebotar).
  // Mantener pulsado tampoco debe abrir el menú contextual (Android)
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('touchend', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === touchLookId) {
        touchLookId = null;
      }
    }
  });

  // Crear D-pad táctil solo en dispositivos táctiles
  if (isTouch) {
    const dpad = document.createElement('div');
    dpad.className = 'touch-dpad';
    dpad.innerHTML = `
      <button class="dpad-btn dpad-up" data-key="KeyW" aria-label="Adelante"><span>▲</span></button>
      <button class="dpad-btn dpad-left" data-key="KeyA" aria-label="Izquierda"><span>◀</span></button>
      <button class="dpad-btn dpad-right" data-key="KeyD" aria-label="Derecha"><span>▶</span></button>
      <button class="dpad-btn dpad-down" data-key="KeyS" aria-label="Atrás"><span>▼</span></button>
      <button class="dpad-btn dpad-shift" data-key="Space" aria-label="Sprint">⚡</button>
    `;
    // Dentro de #app: así no asoma sobre el loading/intro (que ocultan #app)
    const touchRoot = document.getElementById('app') || document.body;
    touchRoot.appendChild(dpad);
    dpad.addEventListener('contextmenu', (e) => e.preventDefault());

    // Soporte multi-touch: cada botón mantiene su estado
    dpad.querySelectorAll('.dpad-btn').forEach(btn => {
      const key = btn.dataset.key;
      const press = (e) => {
        if (e.cancelable) e.preventDefault();
        state.keys[key] = true;
        btn.classList.add('pressed');
        // Primer press en safari → entrar
        if (state.mode === 'orbit') enterSafari();
        // Si está en safari y toca shift, sprint
      };
      const release = (e) => {
        if (e.cancelable) e.preventDefault();
        state.keys[key] = false;
        btn.classList.remove('pressed');
      };
      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('touchend', release, { passive: false });
      btn.addEventListener('touchcancel', release, { passive: false });
      // Para desktop debugging
      btn.addEventListener('mousedown', press);
      btn.addEventListener('mouseup', release);
      btn.addEventListener('mouseleave', release);
    });

    // Crear botón "salir" visible en touch
    const exitBtn = document.createElement('button');
    exitBtn.className = 'touch-exit';
    exitBtn.innerHTML = '✕';
    exitBtn.setAttribute('aria-label', 'Salir del modo safari');
    exitBtn.addEventListener('click', () => exitToOrbit());
    touchRoot.appendChild(exitBtn);
    // (Sin botón táctil propio para el 4×4: "SUBIR AL 4×4" de la UI ya funciona con el dedo)

    // Mostrar/ocultar controles según modo. El D-pad también se ve en orbital:
    // es la única forma de bajar a pie en móvil (el primer toque entra en safari).
    // Va por notifyModeChange y no por state.onModeChange, que main.js sobrescribe.
    updateTouchUi = () => {
      const isMovable = state.mode === 'safari' || state.mode === 'car';
      dpad.classList.add('visible');
      exitBtn.classList.toggle('visible', isMovable);
    };
    updateTouchUi();
  }

  function notifyModeChange(mode) {
    if (state.onModeChange) state.onModeChange(mode);
    if (updateTouchUi) updateTouchUi();
  }

  const onLockChange = () => {
    state.isLocked = (document.pointerLockElement === canvas);
  };
  document.addEventListener('pointerlockchange', onLockChange);

  function lockPointer() {
    if (!hasFinePointer || !canvas.requestPointerLock) return;
    try {
      const p = canvas.requestPointerLock();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {}
  }

  function enterSafari() {
    // Arrancar mirando hacia donde miraba la cámara orbital, sin salto de vista
    const dir = camera.getWorldDirection(new THREE.Vector3());
    state.safariYaw = Math.atan2(dir.x, dir.z);
    state.safariPitch = -0.2;
    state.mode = 'safari';
    lockPointer();
    notifyModeChange('safari');
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
    lockPointer();
    notifyModeChange('car');
  }
  function exitToOrbit() {
    state.mode = 'orbit';
    state.autoRotate = true;
    if (document.pointerLockElement) document.exitPointerLock?.();
    notifyModeChange('orbit');
  }

  // Click raycast
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  canvas.addEventListener('click', (e) => {
    // Tras soltar el ratón con Esc, un click vuelve a capturarlo para mirar
    if (state.mode !== 'orbit') { if (!state.isLocked) lockPointer(); return; }
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
    // Ojos por encima de la carrocería (macizo hasta y=1.8) y bajo el techo (y=2.36):
    // a 1.85 la vista era el techo del capó
    const eyeOffset = new THREE.Vector3(
      -0.55, 2.2, 0.6
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
    focusOn(pos, dist = 25) {
      state.mode = 'orbit';
      state.target.copy(pos);
      state.distance = dist;
      state.autoRotate = false;
      if (document.pointerLockElement) document.exitPointerLock?.();
      notifyModeChange('orbit');
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