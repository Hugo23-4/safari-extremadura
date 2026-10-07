// ============================================================
// ui.js — Minimapa, brújula, secciones, intro, HUD coche, panel guía
// ============================================================
import * as THREE from 'three';

const SPECIES_COLORS = {
  ciervo: '#a36b3a',
  jabali: '#2b2118',
  gamo:   '#a07040',
  corzo:  '#7a5a32',
  bufalo: '#1a1814',
  zorro:  '#c8732b',
  liebre: '#9a7050',
  lince:  '#a07a4a',
  buitre: '#cfcfcf'
};

const SPECIES_NAMES = {
  ciervo: 'CIERVO IBÉRICO',
  jabali: 'JABALÍ',
  gamo:   'GAMO',
  corzo:  'CORZO',
  bufalo: 'BÚFALO DE AGUA',
  zorro:  'ZORRO ROJO',
  liebre: 'LIEBRE IBÉRICA',
  lince:  'LINCE IBÉRICO',
  buitre: 'BUITRE LEONADO'
};

export function createUI({ fauna, camera, world, scene, cameraCtrl }) {
  // ============ MINIMAPA ============
  const minimapCanvas = document.getElementById('minimap');
  const mctx = minimapCanvas.getContext('2d');
  const MW = minimapCanvas.width;
  const MH = minimapCanvas.height;
  const MAP_SIZE = 240;
  const encinaPoints = [];
  for (let i = 0; i < 80; i++) {
    const a = (i / 80) * Math.PI * 2 + Math.random() * 0.1;
    const r = (0.18 + Math.random() * 0.32) * MW * 0.46;
    encinaPoints.push({ x: MW / 2 + Math.cos(a) * r, y: MH / 2 + Math.sin(a) * r });
  }

  function drawMinimap() {
    mctx.clearRect(0, 0, MW, MH);
    mctx.fillStyle = '#1b1410'; mctx.fillRect(0, 0, MW, MH);
    mctx.strokeStyle = 'rgba(233,184,115,0.06)'; mctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const p = (i / 10) * MW;
      mctx.beginPath(); mctx.moveTo(p, 0); mctx.lineTo(p, MH); mctx.stroke();
      mctx.beginPath(); mctx.moveTo(0, p); mctx.lineTo(MW, p); mctx.stroke();
    }
    mctx.strokeStyle = 'rgba(233,184,115,0.4)'; mctx.lineWidth = 1;
    mctx.strokeRect(0.5, 0.5, MW - 1, MH - 1);
    mctx.fillStyle = '#3a2820';
    mctx.beginPath(); mctx.arc(MW / 2, MH / 2, MW * 0.46, 0, Math.PI * 2);
    mctx.fill();
    mctx.fillStyle = 'rgba(58,122,42,0.55)';
    for (const p of encinaPoints) mctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    mctx.strokeStyle = 'rgba(58,88,104,0.6)'; mctx.lineWidth = 2;
    mctx.beginPath();
    for (let i = 0; i < 60; i++) {
      const x = (i / 60) * MW;
      mctx.lineTo(x, MH / 2 + Math.sin(i * 0.4) * 4);
    }
    mctx.stroke();
    for (const a of fauna.list) {
      const mx = (a.position.x / MAP_SIZE + 0.5) * MW;
      const mz = (a.position.z / MAP_SIZE + 0.5) * MH;
      if (mx < 0 || mx > MW || mz < 0 || mz > MH) continue;
      mctx.fillStyle = SPECIES_COLORS[a.species] || '#fff';
      mctx.beginPath();
      mctx.arc(mx, mz, a.species === 'buitre' ? 2 : 2.2, 0, Math.PI * 2);
      mctx.fill();
    }
    // Cámara o coche
    const px = camera.position.x;
    const pz = camera.position.z;
    const mx = (px / MAP_SIZE + 0.5) * MW;
    const mz = (pz / MAP_SIZE + 0.5) * MH;
    if (mx >= 0 && mx <= MW && mz >= 0 && mz <= MH) {
      const ang = Math.atan2(
        Math.sin(cameraCtrl.state.carYaw),
        Math.cos(cameraCtrl.state.carYaw)
      );
      mctx.save();
      mctx.translate(mx, mz);
      mctx.rotate(-ang);
      mctx.fillStyle = cameraCtrl.state.mode === 'car' ? '#e9b873' : '#f4d59a';
      mctx.beginPath();
      mctx.moveTo(0, -8); mctx.lineTo(6, 6); mctx.lineTo(0, 3); mctx.lineTo(-6, 6);
      mctx.closePath(); mctx.fill();
      mctx.strokeStyle = '#1b1410'; mctx.lineWidth = 1; mctx.stroke();
      mctx.restore();
    }
  }

  const compassNeedle = document.querySelector('.compass__needle');
  function updateCompass() {
    const dir = camera.getWorldDirection(new THREE.Vector3());
    const ang = Math.atan2(dir.x, dir.z);
    compassNeedle.style.transform = `translate(-50%, -50%) rotate(${-ang}rad)`;
  }

  function updateClock() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const txt = `${hh}:${mm}`;
    const c1 = document.getElementById('clock');
    const c2 = document.getElementById('clock2');
    if (c1) c1.textContent = txt;
    if (c2) c2.textContent = txt;
  }

  function updateCounts() {
    const c = fauna.count();
    const map = {
      cntCiervo: c.ciervo, cntJabali: c.jabali, cntGamo: c.gamo,
      cntCorzo:  c.corzo,  cntBufalo: c.bufalo, cntZorro: c.zorro,
      cntLiebre: c.liebre, cntLince:  c.lince,  cntBuitre: c.buitre
    };
    for (const [id, val] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val).padStart(2, '0');
    }
    const vc = document.getElementById('visibleCount');
    if (vc) vc.textContent = String(fauna.visibleCount(camera)).padStart(2, '0');
  }

  // ============ CROSSHAIR + TOOLTIP ============
  const tooltipEl = document.getElementById('faunaTip');
  const crosshairEl = document.getElementById('crosshair');
  const crosshairDot = document.getElementById('crosshairDot');
  const crosshairLabel = document.getElementById('crosshairLabel');
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function updateCrosshairAndTooltip() {
    if (cameraCtrl.state.mode === 'car') {
      if (crosshairEl) crosshairEl.style.opacity = '0.25';
      return;
    }
    if (crosshairEl) crosshairEl.style.opacity = '1';
    ndc.set(0, 0);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    let foundAnimal = null;
    for (const h of hits) {
      let obj = h.object;
      while (obj && !obj.userData?.species) obj = obj.parent;
      if (obj && obj.userData?.species) { foundAnimal = obj; break; }
    }
    if (foundAnimal) {
      const sp = foundAnimal.userData.species;
      const col = SPECIES_COLORS[sp];
      if (crosshairEl) crosshairEl.classList.add('active');
      if (crosshairDot) crosshairDot.setAttribute('fill', col);
      if (crosshairLabel) {
        const dist = Math.round(foundAnimal.parent.position.distanceTo(camera.position));
        crosshairLabel.textContent = `${SPECIES_NAMES[sp]} · ${dist}m`;
        crosshairLabel.style.color = col;
        crosshairLabel.style.borderColor = col;
      }
    } else {
      if (crosshairEl) crosshairEl.classList.remove('active');
      if (crosshairDot) crosshairDot.setAttribute('fill', '#e9b873');
      if (crosshairLabel) {
        crosshairLabel.textContent = '— mira alrededor —';
        crosshairLabel.style.color = '#e9b873';
        crosshairLabel.style.borderColor = 'rgba(233,184,115,0.4)';
      }
    }
  }

  function toast(msg, sub) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = msg + (sub ? `<small>${sub}</small>` : '');
    document.getElementById('toasts').appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity 0.3s, transform 0.3s';
      t.style.opacity = '0';
      t.style.transform = 'translateY(-12px)';
      setTimeout(() => t.remove(), 300);
    }, 2400);
  }

  // ============ INTRO ============
  const loadingEl = document.getElementById('loading');
  const introEl   = document.getElementById('intro');
  const appEl     = document.getElementById('app');
  const fillEl    = document.getElementById('loadFill');
  const statusEl  = document.getElementById('loadStatus');

  const STATUSES = [
    'Inicializando dehesa…', 'Generando Sierra del Torozón…',
    'Plantando 600 encinas…', 'Construyendo cortijo extremeño…',
    'Repartiendo fauna…', 'Aparcando el 4×4…',
    'Cargando mapa de Manolo…', 'Listos para la partida'
  ];

  async function runLoading() {
    for (let i = 0; i < STATUSES.length; i++) {
      fillEl.value = STATUSES[i];
      fillEl.style.width = ((i + 1) / STATUSES.length * 100) + '%';
      statusEl.textContent = STATUSES[i];
      await new Promise(r => setTimeout(r, 280));
    }
    await new Promise(r => setTimeout(r, 350));
    loadingEl.classList.add('hidden');
    introEl.classList.remove('hidden');
  }
  runLoading();

  document.getElementById('introSkip')?.addEventListener('click', startApp);
  document.getElementById('introStart')?.addEventListener('click', startApp);
  loadingEl.addEventListener('click', () => {
    loadingEl.classList.add('hidden');
    introEl.classList.remove('hidden');
  });

  function startApp() {
    introEl.classList.add('hidden');
    appEl.classList.remove('hidden');
    setTimeout(() => toast('MISIÓN INICIADA', 'explora el Torozón'), 400);
    setTimeout(() => toast('9 ESPECIES DETECTADAS', 'radio 250m'), 2400);
    document.getElementById('scrollcue')?.classList.add('hidden');
  }

  // ============ SECTIONS ============
  const sidenav = document.getElementById('sidenav');
  function showSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    if (name !== 'hero') {
      const el = document.getElementById('sec-' + name);
      if (el) el.classList.add('active');
    }
    sidenav.querySelectorAll('.sn').forEach(b => {
      b.classList.toggle('sn--active', b.dataset.target === name);
    });
  }
  sidenav.querySelectorAll('.sn').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.target));
  });
  document.getElementById('scrollcue')?.addEventListener('click', () => showSection('especies'));

  document.querySelectorAll('.spe').forEach(btn => {
    btn.addEventListener('click', () => {
      const sp = btn.dataset.species;
      const list = fauna.list.filter(a => a.species === sp);
      if (!list.length) return;
      let best = null, bd = Infinity;
      for (const a of list) {
        const d = a.position.distanceTo(camera.position);
        if (d < bd) { bd = d; best = a; }
      }
      if (best) {
        const newTarget = best.position.clone();
        newTarget.y += 2;
        cameraCtrl.focusOn(newTarget, 20);
        toast('ESPÉCIE: ' + sp.toUpperCase(), 'focus cámara');
      }
      document.querySelectorAll('.spe').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.code.startsWith('Digit')) {
      const k = e.code.replace('Digit', '');
      document.querySelector(`.spe[data-key="${k}"]`)?.click();
    }
  });

  document.getElementById('actOrbit')?.addEventListener('click', () => {
    cameraCtrl.exitToOrbit();
    toast('VISTA ORBITAL', 'modo cinematográfico');
  });

  // Sound (imported from sound module inline because ui is large already)
  document.getElementById('actSound')?.addEventListener('click', async (e) => {
    const audio = document.getElementById('ambient');
    try {
      if (audio.paused) { await audio.play(); e.currentTarget.classList.add('on'); toast('♪ SONIDO ON'); }
      else { audio.pause(); e.currentTarget.classList.remove('on'); toast('♪ SONIDO OFF'); }
    } catch (err) {
      toast('Sonido no disponible', 'pulsa cualquier tecla');
    }
  });

  // ============ CAR MODE BUTTON ============
  document.getElementById('carLaunch')?.addEventListener('click', () => {
    cameraCtrl.enterCar();
    toast('🚙 4×4 ACTIVADO', 'W acelerar · A/D girar · Esc salir');
  });

  // HUD coche
  function updateCarHud() {
    if (cameraCtrl.state.mode !== 'car') return;
    const kmh = Math.abs(cameraCtrl.state.carSpeed * 3.6).toFixed(0);
    const sp = document.getElementById('carSpeedKmh');
    if (sp) sp.textContent = kmh;
    const rpm = (Math.abs(cameraCtrl.state.carSpeed) / cameraCtrl.state.carMaxSpeed * 100).toFixed(0);
    const rpmEl = document.getElementById('carRpm');
    if (rpmEl) rpmEl.style.setProperty('--w', Math.min(100, rpm) + '%');
    const fuelEl = document.getElementById('carFuel');
    if (fuelEl) fuelEl.style.setProperty('--w', '85%'); // estático
    const km = document.getElementById('carKm');
    if (km) km.textContent = cameraCtrl.state.carDistance.toFixed(2);
    const tp = document.getElementById('carT');
    if (tp) tp.textContent = (cameraCtrl.state.carPathT * 100).toFixed(0) + '%';
  }

  // ============ FORM ============
  const form = document.getElementById('reserveForm');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    toast('¡RESERVA RECIBIDA!', 'te contactamos en 24h');
    form.reset();
    setTimeout(() => showSection('hero'), 1800);
  });
  document.querySelectorAll('.exp__cta').forEach(btn => {
    btn.addEventListener('click', () => showSection('reserva'));
  });

  // ============ GUÍA DEL SAFARI ============
  const guidePanel = document.getElementById('guide');
  const guideForm = document.getElementById('guideForm');
  const guideInput = document.getElementById('guideInput');
  const guideChat = document.getElementById('guideChat');
  const guideClose = document.getElementById('guideClose');

  document.getElementById('guideClose')?.addEventListener('click', () => {
    guidePanel.classList.add('hidden');
  });

  // Función para añadir mensaje al chat
  function addGuideMsg(text, who = 'user') {
    const div = document.createElement('div');
    div.className = `guide__msg guide__msg--${who}`;
    div.innerHTML = text;
    guideChat.appendChild(div);
    guideChat.scrollTop = guideChat.scrollHeight;
  }

  // Cuando Hugo pregunta, se notifica para que YO le responda por chat
  guideForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = guideInput.value.trim();
    if (!q) return;
    addGuideMsg(q, 'user');
    guideInput.value = '';
    // Notificación al exterior para que el asistente responda
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('guide-question', {
        detail: {
          question: q,
          carMode: cameraCtrl.state.mode === 'car',
          carPathT: cameraCtrl.state.carPathT,
          carKm: cameraCtrl.state.carDistance
        }
      }));
    }
    // Mensaje de espera
    setTimeout(() => {
      addGuideMsg('<i>Manolo está pensando… te contesto arriba en el chat principal.</i>', 'bot');
    }, 400);
  });

  // Sugerencias
  document.querySelectorAll('.guide__suggest button').forEach(b => {
    b.addEventListener('click', () => {
      guideInput.value = b.dataset.q;
      guideForm.dispatchEvent(new Event('submit'));
    });
  });

  setInterval(updateClock, 30000);
  updateClock();

  function update() {
    drawMinimap();
    updateCompass();
    updateCounts();
    updateCrosshairAndTooltip();
    updateCarHud();
  }

  return { update, toast, showSection };
}