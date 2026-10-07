// ============================================================
// trees.js — Encinas, alcornoques, madroños, arbustos, setos,
//            rocas, cerca de piedra, hierba instanciada
// ============================================================
import * as THREE from 'three';
import { SimplexNoise } from './noise.js';
import { PALETTE } from './world.js';

function makeEncina() {
  const g = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.32, 2.2, 6, 4);
  const tPos = trunkGeo.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const x = tPos.getX(i), y = tPos.getY(i), z = tPos.getZ(i);
    const noise = Math.sin(y * 5) * 0.08 + Math.cos(y * 2.3 + x) * 0.05;
    tPos.setX(i, x + noise);
    tPos.setZ(i, z + Math.sin(y * 3.7 + x) * 0.05);
  }
  trunkGeo.computeVertexNormals();
  const trunkMat = new THREE.MeshStandardMaterial({
    color: PALETTE.trunk,
    roughness: 1
  });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  g.add(trunk);

  // Copa multi-esfera con hojas + hojas secas mezcladas
  const leavesMat = new THREE.MeshStandardMaterial({ color: PALETTE.leaves, roughness: 0.95 });
  const leavesDryMat = new THREE.MeshStandardMaterial({ color: PALETTE.leavesDry, roughness: 0.95 });
  const blobs = [
    { x: 0,   y: 2.6, z: 0,    r: 1.1 },
    { x: 0.6, y: 2.9, z: 0.2,  r: 0.9 },
    { x:-0.5, y: 2.7, z:-0.3,  r: 0.95 },
    { x: 0.2, y: 3.2, z: 0.0,  r: 0.8 },
    { x: 0.0, y: 2.3, z: 0.5,  r: 0.7 },
    { x: 0.1, y: 2.4, z:-0.4,  r: 0.7 },
    { x:-0.3, y: 3.0, z: 0.4,  r: 0.65 }
  ];
  for (const b of blobs) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(b.r, 8, 6),
      Math.random() > 0.5 ? leavesMat : leavesDryMat
    );
    s.position.set(b.x, b.y, b.z);
    s.castShadow = true;
    s.receiveShadow = true;
    g.add(s);
  }
  return g;
}

function makeMadrono() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.15, 1.4, 5),
    new THREE.MeshStandardMaterial({ color: 0x6a4828, roughness: 1 })
  );
  trunk.position.y = 0.7;
  trunk.castShadow = true;
  g.add(trunk);
  const mat = new THREE.MeshStandardMaterial({ color: 0x2a4a28, roughness: 1 });
  for (let i = 0; i < 3; i++) {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.6, 7, 6), mat);
    blob.position.set(
      (Math.random() - 0.5) * 0.6,
      1.4 + i * 0.3,
      (Math.random() - 0.5) * 0.6
    );
    blob.scale.set(1.2, 0.9, 1.2);
    blob.castShadow = true;
    g.add(blob);
  }
  // Frutos rojos (pequeñas esferas)
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 5, 4),
      new THREE.MeshStandardMaterial({ color: 0xb3322a, roughness: 0.7 })
    );
    f.position.set(
      (Math.random() - 0.5) * 0.7,
      1.5 + Math.random() * 0.7,
      (Math.random() - 0.5) * 0.7
    );
    g.add(f);
  }
  return g;
}

function makeArbusto() {
  const g = new THREE.Group();
  const mat1 = new THREE.MeshStandardMaterial({ color: PALETTE.leavesDry, roughness: 1 });
  const mat2 = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6a5a2a'), roughness: 1 });
  const mat3 = new THREE.MeshStandardMaterial({ color: new THREE.Color('#4a5a2a'), roughness: 1 });
  for (let i = 0; i < 4; i++) {
    const r = 0.5 + Math.random() * 0.4;
    const m = [mat1, mat2, mat3][Math.floor(Math.random() * 3)];
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), m);
    s.position.set(
      (Math.random() - 0.5) * 1.4,
      r * 0.5,
      (Math.random() - 0.5) * 1.4
    );
    s.scale.y = 0.7;
    s.castShadow = true;
    g.add(s);
  }
  return g;
}

function makeSeto() {
  // Seto alargado, ideal para transporte
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3a4a28'), roughness: 1 });
  for (let i = 0; i < 6; i++) {
    const r = 0.5 + Math.random() * 0.3;
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), mat);
    s.position.set(i * 0.6 - 1.5, r * 0.5, (Math.random() - 0.5) * 0.4);
    s.castShadow = true;
    g.add(s);
  }
  return g;
}

function makeRock() {
  const r = 0.4 + Math.random() * 1.4;
  const geo = new THREE.DodecahedronGeometry(r, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, pos.getX(i) * (0.7 + Math.random() * 0.5));
    pos.setY(i, pos.getY(i) * (0.5 + Math.random() * 0.3));
    pos.setZ(i, pos.getZ(i) * (0.7 + Math.random() * 0.5));
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: PALETTE.rock, roughness: 1, flatShading: true });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function makeStoneFence(segments) {
  // Cerca de piedra apilada
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xb09060, roughness: 1 });
  for (let i = 0; i < segments; i++) {
    // 2-3 piedras apiladas por segmento
    const stackH = 2 + Math.floor(Math.random() * 2);
    for (let j = 0; j < stackH; j++) {
      const w = 0.4 + Math.random() * 0.3;
      const h = 0.3 + Math.random() * 0.15;
      const d = 0.4 + Math.random() * 0.3;
      const stone = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      stone.position.set(i * 0.7, j * h + h / 2, 0);
      stone.rotation.y = (Math.random() - 0.5) * 0.4;
      g.add(stone);
    }
  }
  return g;
}

export function populateVegetation(scene, world) {
  const noise = new SimplexNoise(7);
  const group = new THREE.Group();
  const { getH, SIZE } = world;

  const N_ENCINAS = 600;
  const N_ARBUSTOS = 900;
  const N_MADRONOS = 80;
  const N_ROCAS = 140;

  const encinas = [];
  const arbustos = [];
  const madronos = [];
  const rocas = [];

  for (let i = 0; i < 8000; i++) {
    const x = (Math.random() - 0.5) * SIZE * 0.92;
    const z = (Math.random() - 0.5) * SIZE * 0.92;
    const h = getH(x, z);
    const density = (noise.noise2D(x * 0.04, z * 0.04) + 1) * 0.5;
    if (h > 0.3 && h < 6 && density > 0.3 && encinas.length < N_ENCINAS) {
      if (Math.random() < density) encinas.push({ x, z });
    }
    if (h > -0.5 && h < 7 && arbustos.length < N_ARBUSTOS) {
      if (Math.random() < 0.35) arbustos.push({ x, z });
    }
    if (h > 0.5 && h < 5 && madronos.length < N_MADRONOS) {
      if (Math.random() < 0.08) madronos.push({ x, z });
    }
    if (h > 4 && rocas.length < 80) {
      if (Math.random() < 0.25) rocas.push({ x, z });
    }
    if (h > 6 && rocas.length < N_ROCAS) {
      if (Math.random() < 0.15) rocas.push({ x, z });
    }
  }

  for (const e of encinas) {
    const encina = makeEncina();
    encina.position.set(e.x, getH(e.x, e.z), e.z);
    encina.rotation.y = Math.random() * Math.PI * 2;
    const s = 0.7 + Math.random() * 0.9;
    encina.scale.setScalar(s);
    group.add(encina);
  }

  for (const a of arbustos) {
    const arb = makeArbusto();
    arb.position.set(a.x, getH(a.x, a.z), a.z);
    arb.rotation.y = Math.random() * Math.PI * 2;
    const s = 0.6 + Math.random() * 0.7;
    arb.scale.setScalar(s);
    group.add(arb);
  }

  for (const m of madronos) {
    const mad = makeMadrono();
    mad.position.set(m.x, getH(m.x, m.z), m.z);
    mad.rotation.y = Math.random() * Math.PI * 2;
    const s = 0.8 + Math.random() * 0.4;
    mad.scale.setScalar(s);
    group.add(mad);
  }

  for (const r of rocas) {
    const rock = makeRock();
    rock.position.set(r.x, getH(r.x, r.z) - 0.2, r.z);
    rock.rotation.y = Math.random() * Math.PI * 2;
    group.add(rock);
  }

  // Setos en grupos (lindes de "propiedades")
  for (let i = 0; i < 16; i++) {
    const seto = makeSeto();
    const cx = (Math.random() - 0.5) * SIZE * 0.6;
    const cz = (Math.random() - 0.5) * SIZE * 0.6;
    seto.position.set(cx, getH(cx, cz), cz);
    seto.rotation.y = Math.random() * Math.PI * 2;
    seto.scale.setScalar(1.0 + Math.random() * 0.5);
    group.add(seto);
  }

  // Cercas de piedra (segmentos dispersos)
  for (let i = 0; i < 14; i++) {
    const fence = makeStoneFence(8 + Math.floor(Math.random() * 8));
    const cx = (Math.random() - 0.5) * SIZE * 0.7;
    const cz = (Math.random() - 0.5) * SIZE * 0.7;
    fence.position.set(cx, getH(cx, cz), cz);
    fence.rotation.y = Math.random() * Math.PI * 2;
    group.add(fence);
  }

  scene.add(group);

  // ============ HIERBA ALTA con InstancedMesh ============
  const grassCount = 5000;
  const grassGeo = new THREE.PlaneGeometry(0.3, 0.6, 1, 2);
  const gp = grassGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    if (gp.getY(i) > 0) {
      gp.setX(i, gp.getX(i) + (Math.random() - 0.5) * 0.05);
    }
  }
  grassGeo.translate(0, 0.3, 0);
  const grassInst = new THREE.InstancedMesh(
    grassGeo,
    new THREE.MeshStandardMaterial({
      color: PALETTE.grassDry,
      roughness: 1,
      side: THREE.DoubleSide
    }),
    grassCount
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < grassCount; i++) {
    const x = (Math.random() - 0.5) * SIZE * 0.9;
    const z = (Math.random() - 0.5) * SIZE * 0.9;
    const h = getH(x, z);
    if (h < 0.3 || h > 5.5) {
      dummy.position.set(0, -1000, 0);
    } else {
      dummy.position.set(x, h + 0.05, z);
    }
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    const s = 0.6 + Math.random() * 1.0;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    grassInst.setMatrixAt(i, dummy.matrix);
  }
  grassInst.instanceMatrix.needsUpdate = true;
  grassInst.receiveShadow = true;
  scene.add(grassInst);

  return {
    group, grassInst,
    count: { encinas: encinas.length, arbustos: arbustos.length, madronos: madronos.length, rocas: rocas.length }
  };
}