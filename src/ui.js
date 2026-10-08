// ============================================================
// ui.js — Minimapa, brújula, secciones, intro, HUD coche, panel guía
// ============================================================
import * as THREE from 'three';
import { toggleAmbient } from './sound.js';

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
  // Solo animales: contra toda la escena (terreno + 600 encinas) costaba ~33 ms por frame
  const animalMeshes = fauna.list.map(a => a.mesh);

  function updateCrosshairAndTooltip() {
    if (cameraCtrl.state.mode === 'car') {
      if (crosshairEl) crosshairEl.style.opacity = '0.25';
      return;
    }
    if (crosshairEl) crosshairEl.style.opacity = '1';
    ndc.set(0, 0);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(animalMeshes, true);
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
        const dist = Math.round(foundAnimal.position.distanceTo(camera.position));
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

  // No-op si ya se saltó: si no, el final de runLoading volvía a abrir el intro encima de la app
  function skipLoading() {
    if (loadingEl.classList.contains('hidden')) return;
    loadingEl.classList.add('hidden');
    introEl.classList.remove('hidden');
  }

  // Las etapas reales de carga las narra main.js; aquí solo se completa la barra
  async function runLoading() {
    fillEl.style.width = '100%';
    statusEl.textContent = 'Listos para la partida';
    await new Promise(r => setTimeout(r, 500));
    skipLoading();
  }
  runLoading();

  document.getElementById('introSkip')?.addEventListener('click', startApp);
  document.getElementById('introStart')?.addEventListener('click', startApp);
  loadingEl.addEventListener('click', skipLoading);
  // "Pulsa cualquier tecla para omitir" (antes solo funcionaba el click)
  window.addEventListener('keydown', skipLoading);

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
    // Con una sección abierta el CSS oculta los controles flotantes (no tapan el formulario)
    appEl.classList.toggle('has-section', name !== 'hero');
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
        toast('ESPECIE: ' + sp.toUpperCase(), 'focus cámara');
      }
      document.querySelectorAll('.spe').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.code.startsWith('Digit')) {
      const k = e.code.replace('Digit', '');
      document.querySelector(`.spe[data-key="${k}"]`)?.click();
    }
  });

  document.getElementById('actOrbit')?.addEventListener('click', () => {
    cameraCtrl.exitToOrbit();
    toast('VISTA ORBITAL', 'modo cinematográfico');
  });

  // Sonido ambiente sintetizado (sound.js: viento, grillos, pájaros, brama)
  document.getElementById('actSound')?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    try {
      const on = toggleAmbient();
      btn.classList.toggle('on', on);
      toast(on ? '♪ SONIDO ON' : '♪ SONIDO OFF');
    } catch (err) {
      toast('Sonido no disponible', 'tu navegador no soporta Web Audio');
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

  // Función para añadir mensaje al chat (textContent: el texto del usuario no se interpreta como HTML)
  function addGuideMsg(text, who = 'user') {
    const div = document.createElement('div');
    div.className = `guide__msg guide__msg--${who}`;
    div.textContent = text;
    guideChat.appendChild(div);
    guideChat.scrollTop = guideChat.scrollHeight;
  }

  // Respuestas de Manolo: locales, por palabras clave (no hay backend)
  const SPECIES_FACTS = {
    ciervo: 'El rey de la dehesa. Los machos tiran las cuernas cada primavera y les vuelven a crecer.',
    jabali: 'Va en piara y hoza el suelo buscando bellotas y raíces.',
    gamo:   'Se distingue por las manchas claras y la cornamenta en forma de pala.',
    corzo:  'Es el cérvido más pequeño de la península. Cuando se asusta, ladra.',
    bufalo: 'Le encanta revolcarse en el barro de la charca para quitarse el calor.',
    zorro:  'Listo y oportunista: come de todo, desde conejos hasta fruta.',
    liebre: 'Si la asustas, sale disparada en zigzag.',
    lince:  'Se le reconoce por los pinceles negros de las orejas y las patillas. Verlo es pura suerte.',
    buitre: 'Planea aprovechando las corrientes de aire caliente, casi sin batir las alas.'
  };

  function describeAnimalAt(side) {
    const fwd = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const rel = new THREE.Vector3();
    let best = null, bd = 150;
    for (const a of fauna.list) {
      rel.copy(a.position).sub(camera.position).setY(0);
      const d = rel.length();
      if (d >= bd || d < 1) continue;
      rel.divideScalar(d);
      const ahead = rel.dot(fwd), lateral = rel.dot(right);
      const ok = side === 'right' ? lateral > 0.2
        : side === 'left' ? lateral < -0.2
        : ahead > 0.5;
      if (ok) { bd = d; best = a; }
    }
    if (!best) return 'Ahora mismo no veo nada por ese lado. Paciencia, que en la dehesa todo aparece.';
    const article = best.species === 'liebre' ? 'una' : 'un';
    return `Eso es ${article} ${SPECIES_NAMES[best.species].toLowerCase()}, a unos ${Math.round(bd)} metros. ${SPECIES_FACTS[best.species]}`;
  }

  function guideAnswer(question) {
    const q = question.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (/derecha/.test(q)) return describeAnimalAt('right');
    if (/izquierda/.test(q)) return describeAnimalAt('left');
    if (/(que|eso).*(veo|es eso)|delante|enfrente/.test(q)) return describeAnimalAt('ahead');
    if (/epoca|cuando|berrea/.test(q)) return 'La berrea va de mediados de septiembre a mediados de octubre. Lo mejor es salir al amanecer o al atardecer.';
    if (/brama|bramido/.test(q)) return 'Es el macho en celo: brama para atraer a las hembras y avisar a los rivales de que esa manada es suya.';
    if (/lince/.test(q)) return 'Haberlos, haylos: en Extremadura se reintrodujo en 2014, en el valle del Matachel. Por aquí es muy raro verlo, así que si lo ves, apúntalo.';
    if (/dehesa/.test(q)) return 'Es un bosque aclarado de encinas y alcornoques con pasto debajo, mantenido por el ganado y la gente del campo. El paisaje típico de Extremadura.';
    if (/cortijo|historia|casa/.test(q)) return 'El cortijo es la casa de labor de la finca: muros encalados, corrales para el ganado y la sombra de las encinas alrededor.';
    if (/precio|cuesta|reserv|plaza|fecha/.test(q)) {
      setTimeout(() => showSection('reserva'), 1200);
      return 'Las salidas y los precios los tienes en Misiones. Te abro el formulario de reserva y te contestamos en 24 horas.';
    }
    for (const sp of Object.keys(SPECIES_FACTS)) {
      if (q.includes(sp) || (sp === 'jabali' && q.includes('jabal')) || (sp === 'bufalo' && q.includes('bufal'))) {
        return SPECIES_FACTS[sp];
      }
    }
    return 'Eso te lo cuento en persona durante el safari. Si quieres venir, abre la sección de reservas.';
  }

  guideForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = guideInput.value.trim();
    if (!q) return;
    addGuideMsg(q, 'user');
    guideInput.value = '';
    setTimeout(() => addGuideMsg(guideAnswer(q), 'bot'), 450);
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