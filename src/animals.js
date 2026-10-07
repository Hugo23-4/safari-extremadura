// ============================================================
// animals.js — Fauna completa: ciervo, jabalí, corzo, búfalo,
//              buitre, GAMO, ZORRO, LIEBRE
// ============================================================
import * as THREE from 'three';
import { SimplexNoise } from './noise.js';
import { PALETTE } from './world.js';

// ============== COLORES ==============
const c = (hex) => new THREE.Color(hex);
const C = {
  deerBody: c('#8a4a25'), deerLight: c('#b0764a'),
  boarBody: c('#2a1a14'), boarLight: c('#4a2a18'),
  roeBody:  c('#9a6a3a'), roeLight: c('#c8a06a'), roeWhite: c('#e9eae4'),
  bufBody:  c('#1a1410'),
  vultureBody: c('#5a4a3a'), vultureLight: c('#d8d4c8'),
  fallowBody: c('#a07040'), fallowSpots: c('#e8d4a0'), fallowDark: c('#5a3818'),
  foxBody: c('#c8732b'), foxDark: c('#3a1810'), foxWhite: c('#e8e0d0'),
  hareBody: c('#9a7050'), hareWhite: c('#d8c8a8'),
};

function makeLeg(side, limb, color, len = 1) {
  const geo = new THREE.CylinderGeometry(0.07, 0.06, len, 5);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  m.position.set(side === 'L' ? -0.15 : 0.15, len / 2, limb === 'F' ? 0.4 : -0.4);
  m.castShadow = true;
  m.userData.basePos = m.position.clone();
  m.userData.phase = (side === 'L' ? 0 : Math.PI) + (limb === 'F' ? 0 : Math.PI / 2);
  return m;
}

// =================================================================
// CIERVO — 3 tipos: macho alfa, hembra, cervatillo
// =================================================================
function makeAntlers(antlerMat, complex = false) {
  const g = new THREE.Group();
  // Astas más elaboradas con geometría tipo cornamenta
  for (const s of [-1, 1]) {
    // Beam principal (asta)
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.7, 6), antlerMat);
    beam.position.set(0.78, 2.05, s * 0.13);
    beam.rotation.z = -Math.PI / 4;
    g.add(beam);
    // 3 ramas principales en cada lado
    const branches = [
      { pos: [0.85, 2.25, s * 0.16], len: 0.45, ang: -0.5 },  // brow tine
      { pos: [0.95, 2.45, s * 0.18], len: 0.35, ang: -0.3 },  // tine 2
      { pos: [1.05, 2.55, s * 0.19], len: 0.30, ang: -0.15 }, // tine 3
      { pos: [1.15, 2.62, s * 0.18], len: 0.25, ang: 0.05 }   // top
    ];
    for (const b of branches) {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.045, b.len, 5),
        antlerMat
      );
      m.position.set(...b.pos);
      m.rotation.z = -Math.PI / 4 + b.ang;
      g.add(m);
      // Punta (cono)
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.04, 0.1, 4),
        antlerMat
      );
      tip.position.set(
        b.pos[0] + Math.sin(b.ang) * b.len * 0.5,
        b.pos[1] + Math.cos(b.ang) * b.len * 0.5,
        b.pos[2]
      );
      tip.rotation.z = -Math.PI / 4 + b.ang;
      g.add(tip);
    }
    if (complex) {
      // Copa (más puntas) — 10 puntas total
      const extraBranches = [
        { pos: [0.92, 2.35, s * 0.20], len: 0.20, ang: -0.4 },
        { pos: [1.08, 2.55, s * 0.22], len: 0.18, ang: -0.1 }
      ];
      for (const b of extraBranches) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, b.len, 4), antlerMat);
        m.position.set(...b.pos);
        m.rotation.z = -Math.PI / 4 + b.ang;
        g.add(m);
      }
    }
  }
  return g;
}

function makeDeerBody(opts = {}) {
  // Construye cuerpo genérico reutilizable
  const {
    scale = 1,
    type = 'male',     // 'male' | 'female' | 'fawn'
    hasAntlers = true,
    bodyColor = C.deerBody,
    lightColor = C.deerLight
  } = opts;
  const g = new THREE.Group();
  g.userData.species = 'ciervo';
  g.userData.deerType = type;
  const mat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.9 });
  const matL = new THREE.MeshStandardMaterial({ color: lightColor, roughness: 0.9 });

  // Tamaño base según tipo
  const sizes = {
    male:   { body: 0.65, scale: 1.15, neck: 1.0, head: 0.45, leg: 1.1 },
    female: { body: 0.55, scale: 1.0,  neck: 0.85, head: 0.40, leg: 1.0 },
    fawn:   { body: 0.35, scale: 0.65, neck: 0.55, head: 0.25, leg: 0.65 }
  };
  const s = sizes[type];
  const bodyHeight = 1.0 * s.scale;

  // Cuerpo más voluminoso para macho
  const body = new THREE.Mesh(new THREE.SphereGeometry(s.body, 12, 8), mat);
  body.scale.set(1.65, 0.9, 0.85);
  body.position.set(0, bodyHeight, 0);
  body.castShadow = true;
  g.add(body);

  // Cuello más grueso en macho (papada para berrea)
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2 * s.scale, 0.32 * s.scale, s.neck, 8),
    mat
  );
  neck.position.set(0.55 * s.scale, bodyHeight + 0.4 * s.scale, 0);
  neck.rotation.z = -Math.PI / 5;
  g.add(neck);

  // Papada en macho (glande / Gordillo) — característica de berrea
  if (type === 'male') {
    const papadaMat = new THREE.MeshStandardMaterial({ color: 0x6a3a18, roughness: 1 });
    const papada = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), papadaMat);
    papada.position.set(0.45, bodyHeight + 0.2, 0);
    papada.scale.set(1, 1.3, 0.8);
    g.add(papada);
  }

  // Cabeza
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(s.head, 0.38 * s.scale, 0.38 * s.scale),
    mat
  );
  head.position.set(1.0 * s.scale, bodyHeight + 0.7 * s.scale, 0);
  head.castShadow = true;
  g.add(head);

  // Hocico
  const snout = new THREE.Mesh(
    new THREE.BoxGeometry(0.28 * s.scale, 0.22 * s.scale, 0.30 * s.scale),
    matL
  );
  snout.position.set(1.25 * s.scale, bodyHeight + 0.62 * s.scale, 0);
  g.add(snout);

  // Narinas
  for (const ns of [-1, 1]) {
    const nari = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 4), c('#0a0808'));
    nari.position.set(1.38 * s.scale, bodyHeight + 0.62 * s.scale, ns * 0.08 * s.scale);
    g.add(nari);
  }

  // Ojos (con brillo)
  for (const s2 of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), c('#1a1410'));
    eye.position.set(1.1 * s.scale, bodyHeight + 0.8 * s.scale, s2 * 0.17 * s.scale);
    g.add(eye);
    // Brillo del ojo
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4), c('#fff8e0'));
    shine.position.set(1.13 * s.scale, bodyHeight + 0.82 * s.scale, s2 * 0.18 * s.scale);
    g.add(shine);
  }

  // Orejas con interior
  for (const s2 of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 5), mat);
    ear.position.set(0.88 * s.scale, bodyHeight + 1.0 * s.scale, s2 * 0.18 * s.scale);
    ear.rotation.z = -Math.PI / 6;
    ear.rotation.x = s2 * Math.PI / 4;
    g.add(ear);
    const earIn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 5), c('#c8a070'));
    earIn.position.set(0.93 * s.scale, bodyHeight + 1.0 * s.scale, s2 * 0.18 * s.scale);
    earIn.rotation.z = -Math.PI / 6;
    earIn.rotation.x = s2 * Math.PI / 4;
    g.add(earIn);
  }

  // Astas
  if (hasAntlers && type === 'male') {
    const antlerMat = new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 1 });
    const antlers = makeAntlers(antlerMat, true); // 10 puntas para macho alfa
    g.add(antlers);
  } else if (hasAntlers && type === 'female') {
    // Hembras sin astas (a veces solo botones)
    const btnMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 1 });
    for (const s2 of [-1, 1]) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), btnMat);
      btn.position.set(0.85 * s.scale, bodyHeight + 1.0 * s.scale, s2 * 0.15 * s.scale);
      g.add(btn);
    }
  }

  // Patas más estilizadas
  const legs = [];
  for (const s2 of ['L', 'R']) {
    for (const l of ['F', 'B']) {
      const leg = makeLeg(s2, l, bodyColor, s.leg);
      legs.push(leg);
      g.add(leg);
    }
  }
  g.userData.legs = legs;

  // Cola con mancha blanca (espejo) — más prominente en hembras
  const tailMat = new THREE.MeshStandardMaterial({
    color: type === 'female' ? c('#f4e8c8') : c('#c89878'),
    roughness: 1
  });
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), tailMat);
  tail.position.set(-0.85 * s.scale, bodyHeight + 0.05 * s.scale, 0);
  g.add(tail);

  // Manchas blancas del cervatillo (característica de cría)
  if (type === 'fawn') {
    const spotMat = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 1 });
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), spotMat);
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.2;
      const r = 0.4 * s.scale;
      m.position.set(
        Math.cos(a) * r * 0.7,
        bodyHeight + 0.05,
        Math.sin(a) * r * 0.85
      );
      m.scale.set(1, 0.6, 1);
      g.add(m);
    }
  }

  g.scale.setScalar(scale);
  g.userData.bobPhase = Math.random() * Math.PI * 2;
  g.userData.bodyBaseY = bodyHeight;
  return g;
}

export function makeDeer(opts = {}) {
  return makeDeerBody({ ...opts, type: opts.type || 'male' });
}
export function makeDoe() { return makeDeerBody({ type: 'female' }); }
export function makeFawn() { return makeDeerBody({ type: 'fawn', hasAntlers: false }); }

// =================================================================
// JABALÍ
// =================================================================
export function makeBoar(scale = 1) {
  const g = new THREE.Group();
  g.userData.species = 'jabali';
  const mat = new THREE.MeshStandardMaterial({ color: C.boarBody, roughness: 1 });
  const matL = new THREE.MeshStandardMaterial({ color: C.boarLight, roughness: 1 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 7), mat);
  body.scale.set(1.4, 0.85, 0.85);
  body.position.set(0, 0.85, 0);
  body.castShadow = true;
  g.add(body);

  // Pelaje erizado (varios conos pequeños)
  const peloMat = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 1 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const pelo = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 3), peloMat);
    pelo.position.set(Math.cos(a) * 0.45, 1.05, Math.sin(a) * 0.4);
    pelo.rotation.z = -Math.PI / 4 + Math.cos(a) * 0.4;
    pelo.rotation.x = Math.sin(a) * 0.4;
    g.add(pelo);
  }

  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.35, 7, 6), mat);
  hump.position.set(0.5, 1.2, 0);
  g.add(hump);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.7, 7), mat);
  head.rotation.z = -Math.PI / 2;
  head.position.set(0.95, 0.85, 0);
  g.add(head);

  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 8), matL);
  snout.rotation.z = Math.PI / 2;
  snout.position.set(1.3, 0.75, 0);
  g.add(snout);

  // Hocico: dos narinas
  for (const s of [-1, 1]) {
    const nari = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 4), c('#1a1410'));
    nari.rotation.z = Math.PI / 2;
    nari.position.set(1.38, 0.78, s * 0.08);
    g.add(nari);
  }

  for (const s of [-1, 1]) {
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), c('#e9eae4'));
    tusk.rotation.z = Math.PI / 2.2;
    tusk.position.set(1.2, 0.65, s * 0.15);
    g.add(tusk);
  }

  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 4), mat);
    ear.position.set(0.75, 1.15, s * 0.16);
    ear.rotation.z = Math.PI / 4;
    g.add(ear);
  }

  // Ojos
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), c('#c8732b'));
    eye.position.set(0.85, 0.95, s * 0.15);
    g.add(eye);
  }

  const legs = [];
  for (const s of ['L', 'R']) {
    for (const l of ['F', 'B']) {
      const leg = makeLeg(s, l, C.boarBody, 0.85);
      legs.push(leg);
      g.add(leg);
    }
  }
  g.userData.legs = legs;

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.4, 4), matL);
  tail.position.set(-0.8, 1.0, 0);
  tail.rotation.z = Math.PI / 4;
  g.add(tail);
  const mecho = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), c('#3a2818'));
  mecho.position.set(-0.95, 0.85, 0);
  g.add(mecho);

  g.scale.setScalar(scale);
  g.userData.bobPhase = Math.random() * Math.PI * 2;
  return g;
}

// =================================================================
// CORZO
// =================================================================
export function makeRoe(scale = 1, hasAntlers = true) {
  const g = new THREE.Group();
  g.userData.species = 'corzo';
  const mat = new THREE.MeshStandardMaterial({ color: C.roeBody, roughness: 1 });
  const matL = new THREE.MeshStandardMaterial({ color: C.roeLight, roughness: 1 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 9, 6), mat);
  body.scale.set(1.4, 0.85, 0.85);
  body.position.set(0, 0.8, 0);
  body.castShadow = true;
  g.add(body);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.7, 6), mat);
  neck.position.set(0.42, 1.15, 0);
  neck.rotation.z = -Math.PI / 5;
  g.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.28), mat);
  head.position.set(0.75, 1.35, 0);
  g.add(head);

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.22), matL);
  snout.position.set(0.93, 1.28, 0);
  g.add(snout);

  // Mancha blanca en cuello
  const patch = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), C.roeWhite);
  patch.position.set(0.2, 1.0, 0);
  patch.scale.set(1, 1, 0.5);
  g.add(patch);

  // Espejo
  const rump = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 5), C.roeWhite);
  rump.position.set(-0.55, 0.9, 0);
  rump.scale.set(1, 0.7, 0.5);
  g.add(rump);

  // Ojos (grandes, negros)
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), c('#0a0a0a'));
    eye.position.set(0.85, 1.42, s * 0.14);
    g.add(eye);
  }

  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 5), mat);
    ear.position.set(0.7, 1.55, s * 0.15);
    ear.rotation.z = -Math.PI / 6;
    ear.rotation.x = s * Math.PI / 4;
    g.add(ear);
  }

  if (hasAntlers) {
    const antlerMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 1 });
    for (const s of [-1, 1]) {
      // Pequeñas astas con 2 puntas
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.18, 5), antlerMat);
      base.position.set(0.65, 1.62, s * 0.12);
      base.rotation.z = -Math.PI / 6;
      g.add(base);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.12, 5), antlerMat);
      tip.position.set(0.72, 1.78, s * 0.13);
      tip.rotation.z = -Math.PI / 4;
      g.add(tip);
    }
  }

  const legs = [];
  for (const s of ['L', 'R']) {
    for (const l of ['F', 'B']) {
      const leg = makeLeg(s, l, C.roeBody, 0.85);
      leg.scale.set(0.85, 0.95, 0.85);
      legs.push(leg);
      g.add(leg);
    }
  }
  g.userData.legs = legs;

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), C.roeWhite);
  tail.position.set(-0.65, 0.95, 0);
  g.add(tail);

  g.scale.setScalar(scale);
  g.userData.bobPhase = Math.random() * Math.PI * 2;
  return g;
}

// =================================================================
// LINCE IBÉRICO (Lynx pardinus) — el felino más amenazado de España
// =================================================================
export function makeLynx(scale = 1) {
  const g = new THREE.Group();
  g.userData.species = 'lince';
  const mat = new THREE.MeshStandardMaterial({ color: c('#a07a4a'), roughness: 0.9 });
  const matSpots = new THREE.MeshStandardMaterial({ color: c('#3a2010'), roughness: 0.9 });
  const matW = new THREE.MeshStandardMaterial({ color: c('#e8d8b0'), roughness: 1 });
  const matDark = new THREE.MeshStandardMaterial({ color: c('#5a3818'), roughness: 1 });

  // Cuerpo ágil
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 7), mat);
  body.scale.set(1.4, 0.85, 0.85);
  body.position.set(0, 0.6, 0);
  body.castShadow = true;
  g.add(body);

  // Manchas negras (rosetas)
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), matSpots);
    const a = (i / 14) * Math.PI * 2 + Math.random() * 0.2;
    const r = 0.3;
    m.position.set(
      Math.cos(a) * r * 0.85,
      0.7,
      Math.sin(a) * r * 0.85
    );
    m.scale.set(1.2, 0.4, 1.2);
    g.add(m);
  }

  // Pecho claro
  const pecho = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), matW);
  pecho.position.set(0.35, 0.5, 0);
  pecho.scale.set(0.7, 1, 0.6);
  g.add(pecho);

  // Cabeza
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat);
  head.scale.set(1.1, 1, 0.95);
  head.position.set(0.55, 0.78, 0);
  g.add(head);

  // Hocico blanco con bordes negros
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), matW);
  snout.position.set(0.78, 0.7, 0);
  snout.scale.set(1, 0.8, 0.8);
  g.add(snout);
  // Nariz
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), c('#1a1410'));
  nose.position.set(0.9, 0.7, 0);
  g.add(nose);

  // Ojos grandes amarillos (característica del lince)
  for (const s of [-1, 1]) {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), c('#e8e0b8'));
    eyeWhite.position.set(0.55, 0.85, s * 0.13);
    g.add(eyeWhite);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), c('#1a1410'));
    pupil.position.set(0.58, 0.85, s * 0.16);
    g.add(pupil);
  }

  // CARACTERÍSTICA: pinceles negros en las orejas
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 5), mat);
    ear.position.set(0.48, 1.0, s * 0.16);
    ear.rotation.z = -Math.PI / 4;
    ear.rotation.x = s * Math.PI / 6;
    g.add(ear);
    // Pincel negro (característica emblemática)
    const pincel = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18, 4), matDark);
    pincel.position.set(0.5, 1.18, s * 0.16);
    pincel.rotation.z = -Math.PI / 4;
    pincel.rotation.x = s * Math.PI / 6;
    g.add(pincel);
  }

  // Patas largas y estilizadas
  const legs = [];
  for (const s of ['L', 'R']) {
    for (const l of ['F', 'B']) {
      const leg = makeLeg(s, l, mat.color, 0.7);
      leg.scale.set(0.8, 1.1, 0.8);
      legs.push(leg);
      g.add(leg);
    }
  }
  g.userData.legs = legs;

  // Cola corta con punta negra
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.3, 5), mat);
  tail.position.set(-0.45, 0.65, 0);
  tail.rotation.z = Math.PI / 3;
  g.add(tail);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), matDark);
  tip.position.set(-0.55, 0.55, 0);
  g.add(tip);

  g.scale.setScalar(scale);
  g.userData.bobPhase = Math.random() * Math.PI * 2;
  return g;
}

// =================================================================
// BÚFALO
// =================================================================
export function makeBuffalo(scale = 1) {
  const g = new THREE.Group();
  g.userData.species = 'bufalo';
  const mat = new THREE.MeshStandardMaterial({ color: C.bufBody, roughness: 1 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8), mat);
  body.scale.set(1.6, 0.9, 0.85);
  body.position.set(0, 1.3, 0);
  body.castShadow = true;
  g.add(body);

  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), mat);
  hump.position.set(0.5, 1.85, 0);
  g.add(hump);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.55), mat);
  head.position.set(1.15, 1.45, 0);
  g.add(head);

  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 8), c('#3a2a20'));
  snout.rotation.z = Math.PI / 2;
  snout.position.set(1.5, 1.35, 0);
  g.add(snout);

  // Ojos
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), c('#1a1410'));
    eye.position.set(1.2, 1.55, s * 0.22);
    g.add(eye);
  }

  for (const s of [-1, 1]) {
    const hornGroup = new THREE.Group();
    const horn = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 6, 8, Math.PI), c('#2a1810'));
    horn.position.set(0, 0.4, 0);
    horn.rotation.x = s * Math.PI / 8;
    hornGroup.add(horn);
    hornGroup.position.set(1.15, 1.7, s * 0.22);
    hornGroup.rotation.y = s * Math.PI / 8;
    g.add(hornGroup);
  }

  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 5), mat);
    ear.position.set(1.0, 1.8, s * 0.25);
    ear.rotation.z = Math.PI / 5;
    g.add(ear);
  }

  const legs = [];
  for (const s of ['L', 'R']) {
    for (const l of ['F', 'B']) {
      const leg = makeLeg(s, l, C.bufBody, 1.0);
      leg.scale.set(1.4, 0.9, 1.4);
      legs.push(leg);
      g.add(leg);
    }
  }
  g.userData.legs = legs;

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.7, 4), mat);
  tail.position.set(-0.85, 1.3, 0);
  tail.rotation.z = Math.PI / 4;
  g.add(tail);
  const tassel = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), c('#3a2818'));
  tassel.position.set(-1.05, 1.05, 0);
  g.add(tassel);

  g.scale.setScalar(scale);
  g.userData.bobPhase = Math.random() * Math.PI * 2;
  return g;
}

// =================================================================
// BUITRE (volando)
// =================================================================
export function makeVulture(scale = 1) {
  const g = new THREE.Group();
  g.userData.species = 'buitre';
  const mat = new THREE.MeshStandardMaterial({ color: C.vultureBody, roughness: 0.8 });
  const matL = new THREE.MeshStandardMaterial({ color: C.vultureLight, roughness: 0.8, side: THREE.DoubleSide });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 5), mat);
  body.scale.set(1.6, 0.8, 0.9);
  body.castShadow = true;
  g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), c('#a8a098'));
  head.position.set(0.28, 0.05, 0);
  g.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), c('#3a2a18'));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.4, 0.05, 0);
  g.add(beak);

  // Alas
  const wingL = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), matL);
  wingL.rotation.y = Math.PI / 2;
  wingL.position.set(0, 0.05, 0.5);
  g.add(wingL);
  const wingR = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), matL);
  wingR.rotation.y = Math.PI / 2;
  wingR.position.set(0, 0.05, -0.5);
  g.add(wingR);

  const tailMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), matL);
  tailMesh.position.set(-0.32, 0, 0);
  g.add(tailMesh);

  g.userData.wingL = wingL;
  g.userData.wingR = wingR;

  g.scale.setScalar(scale);
  return g;
}

// =================================================================
// GAMO (Dama dama) - muy típico de Extremadura
// =================================================================
export function makeFallow(scale = 1, hasAntlers = true) {
  const g = new THREE.Group();
  g.userData.species = 'gamo';
  const mat = new THREE.MeshStandardMaterial({ color: C.fallowBody, roughness: 1 });
  const matL = new THREE.MeshStandardMaterial({ color: C.fallowDark, roughness: 1 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 7), mat);
  body.scale.set(1.45, 0.85, 0.85);
  body.position.set(0, 0.95, 0);
  body.castShadow = true;
  g.add(body);

  // Manchas blancas (característica del gamo)
  const manchaMat = new THREE.MeshStandardMaterial({ color: C.fallowSpots, roughness: 1 });
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), manchaMat);
    const a = (i / 14) * Math.PI * 2;
    const r = 0.45;
    m.position.set(Math.cos(a) * r * 0.7, 1.0, Math.sin(a) * r * 0.9);
    m.scale.set(1, 0.6, 1);
    g.add(m);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.8, 7), mat);
  neck.position.set(0.5, 1.4, 0);
  neck.rotation.z = -Math.PI / 5;
  g.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.32), mat);
  head.position.set(0.88, 1.6, 0);
  g.add(head);

  // Hocico más oscuro
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.26), matL);
  snout.position.set(1.08, 1.55, 0);
  g.add(snout);

  // Ojos
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), c('#0a0a0a'));
    eye.position.set(0.98, 1.7, s * 0.15);
    g.add(eye);
  }

  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 5), mat);
    ear.position.set(0.78, 1.88, s * 0.17);
    ear.rotation.z = -Math.PI / 6;
    ear.rotation.x = s * Math.PI / 4;
    g.add(ear);
  }

  // Astas PALMEADAS (característica del gamo macho)
  if (hasAntlers) {
    const antlerMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 1 });
    for (const s of [-1, 1]) {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.4, 5), antlerMat);
      base.position.set(0.72, 1.92, s * 0.13);
      base.rotation.z = -Math.PI / 4;
      g.add(base);
      // Pala (paleta del gamo)
      const pala = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.05), antlerMat);
      pala.position.set(0.9, 2.1, s * 0.16);
      pala.rotation.z = -Math.PI / 4;
      g.add(pala);
    }
  }

  const legs = [];
  for (const s of ['L', 'R']) {
    for (const l of ['F', 'B']) {
      const leg = makeLeg(s, l, C.fallowBody, 0.95);
      legs.push(leg);
      g.add(leg);
    }
  }
  g.userData.legs = legs;

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), matL);
  tail.position.set(-0.78, 1.05, 0);
  g.add(tail);
  // Línea dorsal oscura
  const dorsal = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.04), matL);
  dorsal.position.set(0, 1.4, 0);
  g.add(dorsal);

  g.scale.setScalar(scale);
  g.userData.bobPhase = Math.random() * Math.PI * 2;
  return g;
}

// =================================================================
// ZORRO
// =================================================================
export function makeFox(scale = 1) {
  const g = new THREE.Group();
  g.userData.species = 'zorro';
  const mat = new THREE.MeshStandardMaterial({ color: C.foxBody, roughness: 1 });
  const matD = new THREE.MeshStandardMaterial({ color: C.foxDark, roughness: 1 });
  const matW = new THREE.MeshStandardMaterial({ color: C.foxWhite, roughness: 1 });

  // Cuerpo esbelto
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 9, 6), mat);
  body.scale.set(1.5, 0.7, 0.75);
  body.position.set(0, 0.55, 0);
  body.castShadow = true;
  g.add(body);

  // Pecho blanco
  const pecho = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), matW);
  pecho.position.set(0.35, 0.45, 0);
  pecho.scale.set(0.8, 1, 0.6);
  g.add(pecho);

  // Cabeza puntiaguda
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 6), mat);
  head.rotation.z = -Math.PI / 2;
  head.position.set(0.55, 0.65, 0);
  g.add(head);

  // Hocico blanco
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.2, 5), matW);
  snout.rotation.z = -Math.PI / 2;
  snout.position.set(0.78, 0.58, 0);
  g.add(snout);

  // Nariz negra
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), c('#1a1410'));
  nose.position.set(0.9, 0.6, 0);
  g.add(nose);

  // Ojos
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), c('#1a1410'));
    eye.position.set(0.55, 0.72, s * 0.11);
    g.add(eye);
  }

  // Orejas triangulares
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 4), mat);
    ear.position.set(0.42, 0.9, s * 0.14);
    ear.rotation.z = -Math.PI / 3.5;
    ear.rotation.x = s * 0.4;
    g.add(ear);
    // Interior
    const earIn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), c('#3a1810'));
    earIn.position.set(0.45, 0.9, s * 0.14);
    earIn.rotation.z = -Math.PI / 3.5;
    earIn.rotation.x = s * 0.4;
    g.add(earIn);
  }

  // Patas finas
  const legs = [];
  for (const s of ['L', 'R']) {
    for (const l of ['F', 'B']) {
      const leg = makeLeg(s, l, C.foxBody, 0.55);
      leg.scale.set(0.7, 1, 0.7);
      legs.push(leg);
      g.add(leg);
    }
  }
  g.userData.legs = legs;

  // "Calcetines" negros en patas
  for (const s of ['L', 'R']) {
    for (const l of ['F', 'B']) {
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.18, 5), matD);
      sock.position.set(s === 'L' ? -0.1 : 0.1, 0.1, l === 'F' ? 0.35 : -0.35);
      g.add(sock);
    }
  }

  // Cola larga y poblada
  const tailGroup = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.12 - i * 0.01, 6, 5), mat);
    seg.position.set(-0.5 - i * 0.13, 0.6 + Math.sin(i * 0.4) * 0.05, 0);
    tailGroup.add(seg);
  }
  // Punta blanca
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), matW);
  tip.position.set(-1.3, 0.65, 0);
  tailGroup.add(tip);
  g.add(tailGroup);
  g.userData.tail = tailGroup;

  g.scale.setScalar(scale);
  g.userData.bobPhase = Math.random() * Math.PI * 2;
  return g;
}

// =================================================================
// LIEBRE
// =================================================================
export function makeHare(scale = 1) {
  const g = new THREE.Group();
  g.userData.species = 'liebre';
  const mat = new THREE.MeshStandardMaterial({ color: C.hareBody, roughness: 1 });
  const matW = new THREE.MeshStandardMaterial({ color: C.hareWhite, roughness: 1 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat);
  body.scale.set(1.3, 0.7, 0.85);
  body.position.set(0, 0.32, 0);
  body.castShadow = true;
  g.add(body);

  // Cabeza
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 5), mat);
  head.position.set(0.32, 0.45, 0);
  g.add(head);

  // Hocico
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), matW);
  snout.position.set(0.45, 0.4, 0);
  g.add(snout);

  // Ojos grandes
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), c('#1a1410'));
    eye.position.set(0.34, 0.5, s * 0.1);
    g.add(eye);
  }

  // Orejas larguísimas (característica)
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.025, 0.4, 5), mat);
    ear.position.set(0.25, 0.78, s * 0.08);
    ear.rotation.z = -0.15;
    ear.rotation.x = s * 0.1;
    g.add(ear);
    // Interior rosa
    const earIn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.35, 5), c('#d88a8a'));
    earIn.position.set(0.27, 0.78, s * 0.08);
    earIn.rotation.z = -0.15;
    earIn.rotation.x = s * 0.1;
    g.add(earIn);
  }

  // Patas traseras grandes (característica liebre)
  for (const s of [-1, 1]) {
    const legBack = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), mat);
    legBack.scale.set(1, 0.5, 1.4);
    legBack.position.set(-0.15, 0.12, s * 0.18);
    g.add(legBack);
  }
  // Patas delanteras más finas
  for (const s of ['L', 'R']) {
    const legFront = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.3, 4), mat);
    legFront.position.set(s === 'L' ? -0.08 : 0.08, 0.15, 0.18);
    g.add(legFront);
  }
  g.userData.legs = [
    ...[{ x: -0.08, y: 0.15, z: 0.18 }, { x: 0.08, y: 0.15, z: 0.18 }],
    ...[{ x: -0.15, y: 0.12, z: -0.18 }, { x: 0.15, y: 0.12, z: -0.18 }]
  ];

  // Colita blanca
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), matW);
  tail.position.set(-0.28, 0.4, 0);
  g.add(tail);

  g.scale.setScalar(scale);
  g.userData.bobPhase = Math.random() * Math.PI * 2;
  return g;
}

// =================================================================
// ANIMAL CLASS
// =================================================================
class Animal {
  constructor(mesh, opts) {
    this.mesh = mesh;
    this.species = mesh.userData.species;
    this.position = mesh.position;
    this.velocity = new THREE.Vector3();
    this.target = null;
    this.speed = opts.speed || 1;
    this.state = 'walk';
    this.stateTime = 0;
    this.scale = opts.scale || 1;
    this.heading = Math.random() * Math.PI * 2;
    this.legPhase = Math.random() * Math.PI * 2;
    this.bobPhase = mesh.userData.bobPhase || 0;
    this.id = Math.random().toString(36).slice(2, 9);
    this.followOffset = null; // para miembros de manada
    this.herd = null;
    this.isAlpha = false;
    this.isHerdMember = false;
    this.isFawn = false;
    this.bramaTimer = 0;
    mesh.userData.animal = this;
  }

  pickTarget(bounds, getH, allAnimals) {
    const minDist = 10;
    for (let tries = 0; tries < 20; tries++) {
      const x = (Math.random() - 0.5) * bounds * 0.85;
      const z = (Math.random() - 0.5) * bounds * 0.85;
      const dist = Math.sqrt(x*x + z*z);
      if (dist > minDist && dist < bounds * 0.45) {
        const h = getH(x, z);
        let ok = false;
        if (this.species === 'jabali' && h < 4 && h > -0.5) ok = true;
        if (this.species === 'corzo' && h > 1 && h < 6) ok = true;
        if (this.species === 'ciervo' && h > 0 && h < 7) ok = true;
        if (this.species === 'bufalo' && h < 2) ok = true;
        if (this.species === 'gamo' && h > 0 && h < 6) ok = true;
        if (this.species === 'zorro' && h > -0.5 && h < 5) ok = true;
        if (this.species === 'liebre' && h > -0.5 && h < 4) ok = true;
        if (ok) return new THREE.Vector3(x, h, z);
      }
    }
    return new THREE.Vector3(
      (Math.random() - 0.5) * bounds * 0.4,
      0,
      (Math.random() - 0.5) * bounds * 0.4
    );
  }

  update(dt, t, allAnimals, camera) {
    this.stateTime += dt;

    // ===== Brama del macho alfa =====
    if (this.isAlpha && this.species === 'ciervo') {
      this.bramaTimer -= dt;
      if (this.bramaTimer <= 0) {
        this.bramaTimer = 6 + Math.random() * 10;
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('deer-brama', {
            detail: { position: this.position.clone(), volume: 0.6 + Math.random() * 0.4 }
          }));
        }
      }
    }

    if (this.stateTime > (this.state === 'graze' ? 4 : 7)) {
      this.state = Math.random() < 0.35 ? 'graze' : 'walk';
      this.stateTime = 0;
      if (this.state === 'walk' && (!this.target || this.position.distanceTo(this.target) < 3)) {
        // Macho alfa marca destino para la manada
        if (this.isAlpha && this.herd) {
          this.target = this.position.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 30, 0, (Math.random() - 0.5) * 30
          ));
          this.herd.target = this.target;
        } else {
          this.target = this.pickTarget(150, allAnimals.getH, allAnimals.list);
        }
      }
    }

    // Huir de cámara
    if (camera && !['buitre'].includes(this.species)) {
      const distToCam = this.position.distanceTo(camera.position);
      let fleeDist = 12;
      if (this.species === 'liebre') fleeDist = 18;
      if (this.species === 'corzo') fleeDist = 22;
      if (distToCam < fleeDist) {
        this.state = 'flee';
        this.stateTime = 0;
        const away = this.position.clone().sub(camera.position).setY(0).normalize();
        this.target = this.position.clone().add(away.multiplyScalar(40));
        // Macho alfa propaga pánico a su manada
        if (this.isAlpha && this.herd) {
          for (const m of this.herd.members) {
            if (m !== this) {
              m.state = 'flee';
              m.stateTime = 0;
              const a = m.position.clone().sub(camera.position).setY(0).normalize();
              m.target = m.position.clone().add(a.multiplyScalar(30));
            }
          }
        }
      } else if (distToCam > fleeDist + 8 && this.state === 'flee') {
        this.state = 'walk';
      }
    }

    // ===== COHESIÓN (ciervos en manada) =====
    if (this.herd && this.herd.alpha && !this.isAlpha && this.state !== 'flee') {
      const alpha = this.herd.alpha;
      const distToAlpha = this.position.distanceTo(alpha.position);
      const maxDist = this.isFawn ? 5 : 9;
      if (distToAlpha > maxDist) {
        // Acercarse manteniendo offset
        const target = alpha.position.clone().add(this.followOffset || new THREE.Vector3());
        this.target = target;
        if (this.state === 'graze') this.state = 'walk';
      }
      // Sincronizar graze con el alfa
      if (alpha.state === 'graze' && distToAlpha < maxDist + 2 && Math.random() < 0.015) {
        this.state = 'graze';
      }
    }

    let speed = 0;
    let direction = new THREE.Vector3();

    if (this.state === 'graze' || this.state === 'alert') {
      speed = 0;
    } else if (this.state === 'flee') {
      speed = this.speed * (this.species === 'liebre' ? 5 : this.species === 'corzo' ? 4 : 3);
      if (!this.target) {
        this.target = this.position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 30, 0, (Math.random() - 0.5) * 30
        ));
      }
    } else {
      speed = this.speed;
      if (!this.target || this.position.distanceTo(this.target) < 3) {
        if (this.isAlpha && this.herd) {
          this.target = this.position.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 30, 0, (Math.random() - 0.5) * 30
          ));
        } else {
          this.target = this.pickTarget(150, allAnimals.getH, allAnimals.list);
        }
      }
    }

    if (this.target && (this.state === 'walk' || this.state === 'flee')) {
      direction.copy(this.target).sub(this.position).setY(0).normalize();
      const targetHeading = Math.atan2(direction.x, direction.z);
      let dh = targetHeading - this.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      this.heading += dh * Math.min(1, dt * 4);
    }

    if (speed > 0 && direction.lengthSq() > 0) {
      this.velocity.set(
        Math.sin(this.heading) * speed,
        0,
        Math.cos(this.heading) * speed
      );
      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;
      this.position.y = allAnimals.getH(this.position.x, this.position.z) + 0.1;
    } else {
      this.velocity.set(0, 0, 0);
    }

    this.mesh.rotation.y = this.heading;

    // Animación patas
    if (speed > 0.01) {
      this.legPhase += dt * speed * (this.species === 'liebre' ? 14 : 8);
      const legs = this.mesh.userData.legs || [];
      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        const phase = this.legPhase + (leg.userData.phase || 0);
        leg.position.x = leg.userData.basePos.x + Math.sin(phase) * 0.08;
        leg.position.z = leg.userData.basePos.z + Math.cos(phase) * 0.08;
      }
      this.mesh.position.y = this.position.y + Math.sin(this.legPhase * 2) * 0.04;
    } else {
      const legs = this.mesh.userData.legs || [];
      for (const leg of legs) {
        if (leg.userData.basePos) {
          leg.position.x = leg.userData.basePos.x;
          leg.position.z = leg.userData.basePos.z;
        }
      }
      this.mesh.position.y = this.position.y;
    }

    // Cola del zorro (menea)
    if (this.species === 'zorro' && this.mesh.userData.tail) {
      this.mesh.userData.tail.rotation.y = Math.sin(t * 6 + this.bobPhase) * 0.4;
    }
  }
}

// Vulture
class Vulture extends Animal {
  constructor(mesh, opts) {
    super(mesh, opts);
    this.radius = 30 + Math.random() * 80;
    this.center = new THREE.Vector3(
      (Math.random() - 0.5) * 100,
      22 + Math.random() * 28,
      (Math.random() - 0.5) * 100
    );
    this.angle = Math.random() * Math.PI * 2;
    this.angularSpeed = (0.05 + Math.random() * 0.1) * (Math.random() > 0.5 ? 1 : -1);
    this.altPhase = Math.random() * Math.PI * 2;
  }
  pickTarget() { return null; }
  update(dt, t, allAnimals, camera) {
    this.angle += this.angularSpeed * dt;
    this.altPhase += dt * 0.3;
    const altOsc = Math.sin(this.altPhase) * 5;
    this.mesh.position.set(
      this.center.x + Math.cos(this.angle) * this.radius,
      this.center.y + altOsc,
      this.center.z + Math.sin(this.angle) * this.radius
    );
    const targetHeading = this.angle + (this.angularSpeed > 0 ? Math.PI / 2 : -Math.PI / 2);
    this.mesh.rotation.y = targetHeading;
    this.mesh.rotation.z = -Math.sin(this.altPhase) * 0.15;
    const wings = this.mesh.userData;
    const flap = Math.sin(t * 1.2 + this.bobPhase) * 0.18;
    wings.wingL.rotation.x = flap;
    wings.wingR.rotation.x = -flap;
  }
}

// =================================================================
// FAUNA MANAGER
// =================================================================
export function createFauna(scene, world) {
  const list = [];
  const allAnimals = { list, getH: world.getH };
  const herds = []; // Para ciervos — referencia a manadas cohesivas

  // ====== MANADAS DE CIERVOS con macho alfa + hembras + crías ======
  for (let h = 0; h < 3; h++) {
    const cx = (Math.random() - 0.5) * 100;
    const cz = (Math.random() - 0.5) * 100;
    const herd = { alpha: null, members: [], center: new THREE.Vector3(cx, 0, cz) };

    // Macho alfa (más grande, astas 10 puntas)
    const alpha = makeDeer({ scale: 1.1 + Math.random() * 0.1, type: 'male' });
    alpha.position.set(cx, world.getH(cx, cz), cz);
    alpha.userData.isAlpha = true;
    alpha.userData.herdId = h;
    scene.add(alpha);
    const alphaAnimal = new Animal(alpha, { speed: 1.3 + Math.random() * 0.3 });
    alphaAnimal.isAlpha = true;
    alphaAnimal.herd = herd;
    alphaAnimal.bramaTimer = Math.random() * 5;
    list.push(alphaAnimal);
    herd.alpha = alphaAnimal;
    herd.members.push(alphaAnimal);

    // 4-6 hembras (más esbeltas, sin astas)
    const nFemales = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < nFemales; i++) {
      const doe = makeDoe();
      const a = (i / nFemales) * Math.PI * 2 + Math.random() * 0.3;
      doe.position.set(
        cx + Math.cos(a) * (3 + Math.random() * 2),
        world.getH(cx, cz),
        cz + Math.sin(a) * (3 + Math.random() * 2)
      );
      doe.userData.herdId = h;
      scene.add(doe);
      const animal = new Animal(doe, { speed: 1.2 + Math.random() * 0.3 });
      animal.isHerdMember = true;
      animal.herd = herd;
      animal.followOffset = new THREE.Vector3(
        Math.cos(a) * 3.5,
        0,
        Math.sin(a) * 3.5
      );
      list.push(animal);
      herd.members.push(animal);
    }

    // 2-3 cervatillos
    const nFawns = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < nFawns; i++) {
      const fawn = makeFawn();
      const a = (i / nFawns) * Math.PI * 2;
      fawn.position.set(
        cx + Math.cos(a) * 2.5,
        world.getH(cx, cz),
        cz + Math.sin(a) * 2.5
      );
      fawn.userData.herdId = h;
      scene.add(fawn);
      const animal = new Animal(fawn, { speed: 1.0 + Math.random() * 0.2 });
      animal.isFawn = true;
      animal.herd = herd;
      animal.followOffset = new THREE.Vector3(
        Math.cos(a) * 2.2,
        0,
        Math.sin(a) * 2.2
      );
      list.push(animal);
      herd.members.push(animal);
    }

    herds.push(herd);
  }

  // 24 jabalíes en piara
  for (let i = 0; i < 24; i++) {
    const boar = makeBoar(0.85 + Math.random() * 0.25);
    const a = (i / 24) * Math.PI * 2;
    const r = Math.random() * 6;
    const bx = (Math.random() - 0.5) * 100;
    const bz = (Math.random() - 0.5) * 100;
    boar.position.set(bx + Math.cos(a) * r, world.getH(bx, bz), bz + Math.sin(a) * r);
    scene.add(boar);
    list.push(new Animal(boar, { speed: 1.2 + Math.random() * 0.3 }));
  }

  // 10 corzos dispersos
  for (let i = 0; i < 10; i++) {
    const roe = makeRoe(0.8 + Math.random() * 0.2, Math.random() > 0.5);
    const x = (Math.random() - 0.5) * 180;
    const z = (Math.random() - 0.5) * 180;
    roe.position.set(x, world.getH(x, z), z);
    scene.add(roe);
    list.push(new Animal(roe, { speed: 2.0 + Math.random() * 0.5 }));
  }

  // 5 búfalos
  for (let i = 0; i < 5; i++) {
    const buf = makeBuffalo(1.1 + Math.random() * 0.2);
    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;
    buf.position.set(x, world.getH(x, z), z);
    scene.add(buf);
    list.push(new Animal(buf, { speed: 0.6 + Math.random() * 0.2 }));
  }

  // 8 gamos
  for (let i = 0; i < 8; i++) {
    const fa = makeFallow(0.9 + Math.random() * 0.2, Math.random() > 0.4);
    const x = (Math.random() - 0.5) * 150;
    const z = (Math.random() - 0.5) * 150;
    fa.position.set(x, world.getH(x, z), z);
    scene.add(fa);
    list.push(new Animal(fa, { speed: 1.5 + Math.random() * 0.4 }));
  }

  // 4 zorros
  for (let i = 0; i < 4; i++) {
    const fox = makeFox(1.0 + Math.random() * 0.2);
    const x = (Math.random() - 0.5) * 150;
    const z = (Math.random() - 0.5) * 150;
    fox.position.set(x, world.getH(x, z), z);
    scene.add(fox);
    list.push(new Animal(fox, { speed: 1.8 + Math.random() * 0.4 }));
  }

  // 12 liebres
  for (let i = 0; i < 12; i++) {
    const hare = makeHare(1.0 + Math.random() * 0.3);
    const x = (Math.random() - 0.5) * 180;
    const z = (Math.random() - 0.5) * 180;
    hare.position.set(x, world.getH(x, z), z);
    scene.add(hare);
    list.push(new Animal(hare, { speed: 2.5 + Math.random() * 0.6 }));
  }

  // 14 buitres volando
  for (let i = 0; i < 14; i++) {
    const v = makeVulture(1.4 + Math.random() * 0.4);
    scene.add(v);
    list.push(new Vulture(v, {}));
  }

  // 3 linces ibéricos (raros, sigilosos)
  for (let i = 0; i < 3; i++) {
    const lynx = makeLynx(0.95 + Math.random() * 0.2);
    const x = (Math.random() - 0.5) * 150;
    const z = (Math.random() - 0.5) * 150;
    lynx.position.set(x, world.getH(x, z), z);
    scene.add(lynx);
    list.push(new Animal(lynx, { speed: 1.6 + Math.random() * 0.5 }));
  }

  function update(dt, t, camera) {
    for (const a of list) a.update(dt, t, allAnimals, camera);
  }

  function count() {
    const out = { ciervo: 0, jabali: 0, corzo: 0, bufalo: 0, buitre: 0, gamo: 0, zorro: 0, liebre: 0, lince: 0 };
    for (const a of list) out[a.species]++;
    return out;
  }

  function visibleCount(camera) {
    let n = 0;
    const dir = new THREE.Vector3();
    for (const a of list) {
      if (a.species === 'buitre') continue;
      dir.copy(a.position).sub(camera.position);
      const dist = dir.length();
      if (dist > 250) continue;
      dir.normalize();
      const dot = dir.dot(camera.getWorldDirection(new THREE.Vector3()));
      if (dot > 0.4 && dist < 120) n++;
    }
    return n;
  }

  return { list, update, count, visibleCount };
}