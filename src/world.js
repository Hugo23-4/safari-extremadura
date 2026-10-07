// ============================================================
// world.js — Terreno, cielo, iluminación, agua, charca, caminos
// ============================================================
import * as THREE from 'three';
import { SimplexNoise, fbm2D } from './noise.js';

export const PALETTE = {
  skyTop:    new THREE.Color('#f4d59a'),
  skyMid:    new THREE.Color('#e9b873'),
  skyHor:    new THREE.Color('#c8732b'),
  fog:       new THREE.Color('#d8a86a'),
  dirt:      new THREE.Color('#7a4a18'),
  grass:     new THREE.Color('#7a8a3a'),
  grassDry:  new THREE.Color('#a8955a'),
  rock:      new THREE.Color('#6a5a48'),
  water:     new THREE.Color('#3a5868'),
  sand:      new THREE.Color('#c8a878'),
  // path (caminos)
  path:      new THREE.Color('#9a7a48'),
  trunk:     new THREE.Color('#3a2818'),
  leaves:    new THREE.Color('#3a5a2a'),
  leavesDry: new THREE.Color('#5a6a2a'),
};

// =================================================================
// TERRENO
// =================================================================
export function buildTerrain(scene, size = 240, seg = 220) {
  const noise = new SimplexNoise(42);
  const noise2 = new SimplexNoise(73);
  const noise3 = new SimplexNoise(11);

  // Función de elevación con domain warping + sierras marcadas
  const getH = (wx, wz) => {
    // Domain warp: distorsionamos coordenadas con otro noise
    const wxw = wx + fbm2D(noise2, wx * 0.018, wz * 0.018, 3) * 18;
    const wzw = wz + fbm2D(noise3, wx * 0.022, wz * 0.022, 3) * 18;

    // Sierras altas (montaña Torozón)
    let sierra = 0;
    // Loma principal en el cuadrante NE
    const dx = wx - 50, dz = wz - 70;
    const distSierra = Math.sqrt(dx * dx + dz * dz);
    if (distSierra < 60) {
      const k = 1 - distSierra / 60;
      sierra = Math.pow(k, 1.5) * 22;
    }
    // Loma secundaria NO
    const d2x = wx + 70, d2z = wz - 60;
    const distS2 = Math.sqrt(d2x * d2x + d2z * d2z);
    if (distS2 < 40) {
      const k = 1 - distS2 / 40;
      sierra += Math.pow(k, 1.8) * 14;
    }

    // FBM base para valles y colinas suaves
    let h = fbm2D(noise, wxw * 0.014, wzw * 0.014, 5, 2.1, 0.5);
    h += fbm2D(noise, wxw * 0.045, wzw * 0.045, 3, 2.2, 0.4) * 0.35;

    h = h * 9 + sierra;

    // Charca (depresión)
    const pcx = 18, pcz = -25;
    const distCharca = Math.sqrt((wx - pcx) ** 2 + (wz - pcz) ** 2);
    if (distCharca < 14) {
      h -= Math.pow(1 - distCharca / 14, 1.4) * 3;
    }

    // Edge fade
    const cx = wx / (size * 0.5);
    const cz = wz / (size * 0.5);
    const edge = 1 - Math.pow(Math.max(Math.abs(cx), Math.abs(cz)), 5);
    return h * Math.max(0, edge);
  };

  // Camino principal serpenteante (lo definimos como una polyline)
  const pathPoints = [];
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    const x = -size * 0.45 + t * size * 0.9;
    const z = Math.sin(t * 9) * 22 + (noise.noise2D(t * 4, 0) * 6);
    pathPoints.push(new THREE.Vector2(x, z));
  }
  // Función para saber si (x,z) está cerca del camino
  const pathDist = (x, z) => {
    let minD = Infinity;
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const a = pathPoints[i], b = pathPoints[i + 1];
      const ax = a.x, az = a.y, bx = b.x, bz = b.y;
      const dx = bx - ax, dz = bz - az;
      const len2 = dx * dx + dz * dz;
      let t = ((x - ax) * dx + (z - az) * dz) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = ax + t * dx, pz = az + t * dz;
      const d = Math.sqrt((x - px) ** 2 + (z - pz) ** 2);
      if (d < minD) minD = d;
    }
    return minD;
  };

  // ============== GEOMETRY ==============
  const geom = new THREE.PlaneGeometry(size, size, seg, seg);
  geom.rotateX(-Math.PI / 2);
  const pos = geom.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = getH(x, z);
    pos.setY(i, h);

    const pDist = pathDist(x, z);
    let c;

    // Coloración por altura + charca
    const distCharca = Math.sqrt((x - 18) ** 2 + (z + 25) ** 2);

    if (distCharca < 6) {
      // Agua de la charca
      c = PALETTE.water.clone();
    } else if (h < -1.2) c = PALETTE.water;
    else if (h < 0.5) c = PALETTE.dirt;
    else if (h < 4) c = PALETTE.grass;
    else if (h < 8) c = PALETTE.grassDry;
    else c = PALETTE.rock;

    // Camino: zona marrón clara
    if (pDist < 1.6 && h > -0.5) {
      const k = 1 - pDist / 1.6;
      const pathColor = PALETTE.path;
      c = c.clone().lerp(pathColor, k * 0.7);
    }

    // Mezcla con noise para look orgánico
    const blend = (fbm2D(noise, x * 0.06, z * 0.06, 2, 2, 0.5) + 1) * 0.5;
    const tmp = c.clone();
    if (h >= 0.5 && h < 4) tmp.lerp(PALETTE.grassDry, blend * 0.4);
    else if (h >= 4 && h < 8) tmp.lerp(PALETTE.dirt, blend * 0.3);
    else if (h >= 8) tmp.lerp(PALETTE.dirt, blend * 0.5);

    // Micro-variación
    const micro = (noise.noise2D(x * 0.4, z * 0.4) + 1) * 0.5;
    colors[i * 3]     = Math.max(0, Math.min(1, tmp.r * (0.82 + micro * 0.36)));
    colors[i * 3 + 1] = Math.max(0, Math.min(1, tmp.g * (0.82 + micro * 0.36)));
    colors[i * 3 + 2] = Math.max(0, Math.min(1, tmp.b * (0.82 + micro * 0.36)));
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
    flatShading: false
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);

  // ============== ARROYO ==============
  const arroyoGeom = new THREE.PlaneGeometry(size * 1.1, 6, 200, 1);
  arroyoGeom.rotateX(-Math.PI / 2);
  const arroyoPos = arroyoGeom.attributes.position;
  for (let i = 0; i < arroyoPos.count; i++) {
    const x = arroyoPos.getX(i);
    const offset = Math.sin(x * 0.1) * 1.5 + (noise.noise2D(x * 0.07, 0) * 2);
    arroyoPos.setY(i, offset);
    arroyoPos.setZ(i, arroyoPos.getZ(i) * 0.6);
  }
  arroyoGeom.computeVertexNormals();
  const arroyoMat = new THREE.MeshStandardMaterial({
    color: PALETTE.water,
    roughness: 0.25,
    metalness: 0.35,
    transparent: true,
    opacity: 0.88
  });
  const arroyo = new THREE.Mesh(arroyoGeom, arroyoMat);
  arroyo.position.set(0, -0.7, 0);
  arroyo.receiveShadow = true;
  scene.add(arroyo);

  // ============== CHARCA (disco reflectante con ondulación) ==============
  const charcaGeom = new THREE.CircleGeometry(7, 48, 48);
  // Aplicar ondulación a la geometría
  const charcaPos = charcaGeom.attributes.position;
  for (let i = 0; i < charcaPos.count; i++) {
    const x = charcaPos.getX(i);
    const y = charcaPos.getY(i); // será Z tras rotateX
    const r = Math.sqrt(x * x + y * y);
    const ang = Math.atan2(y, x);
    const wave = Math.sin(ang * 6) * 0.05 + Math.cos(ang * 3) * 0.04;
    charcaPos.setZ(i, wave * (r / 7));
  }
  charcaGeom.rotateX(-Math.PI / 2);
  const charcaMat = new THREE.MeshStandardMaterial({
    color: PALETTE.water,
    roughness: 0.1,
    metalness: 0.7,
    transparent: true,
    opacity: 0.92
  });
  const charca = new THREE.Mesh(charcaGeom, charcaMat);
  const charcaY = getH(18, -25) + 0.05;
  charca.position.set(18, charcaY, -25);
  charca.receiveShadow = true;
  scene.add(charca);

  // Anillo de barro alrededor de la charca
  const charcaRingGeom = new THREE.RingGeometry(7, 8.5, 32);
  charcaRingGeom.rotateX(-Math.PI / 2);
  const charcaRing = new THREE.Mesh(charcaRingGeom, new THREE.MeshStandardMaterial({
    color: new THREE.Color('#5a3818'),
    roughness: 1
  }));
  charcaRing.position.set(18, getH(18, -25) + 0.02, -25);
  scene.add(charcaRing);

  // Pequeñas ondas animadas en la charca
  let charcaAnimT = 0;
  function updateCharca(dt) {
    charcaAnimT += dt;
    const arr = charcaGeom.attributes.position;
    for (let i = 0; i < arr.count; i++) {
      const x = arr.getX(i);
      const y = arr.getY(i);
      const r = Math.sqrt(x * x + y * y);
      const ang = Math.atan2(y, x);
      const wave = Math.sin(ang * 5 + charcaAnimT * 1.2) * 0.07 + Math.cos(ang * 3 + charcaAnimT * 0.8) * 0.05;
      arr.setZ(i, wave * (r / 7));
    }
    charcaGeom.attributes.position.needsUpdate = true;
    charcaGeom.computeVertexNormals();
  }

  // ============== CIELO ==============
  const skyGeom = new THREE.SphereGeometry(400, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: PALETTE.skyTop },
      midColor: { value: PALETTE.skyMid },
      horColor: { value: PALETTE.skyHor },
      offset:   { value: 80 },
      exponent: { value: 0.6 }
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vWorld = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vWorld;
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horColor;
      uniform float offset;
      uniform float exponent;
      void main() {
        float h = normalize(vWorld + vec3(0.0, offset, 0.0)).y;
        float t = clamp(h, 0.0, 1.0);
        vec3 col = mix(horColor, midColor, pow(t, exponent));
        col = mix(col, topColor, pow(max(t, 0.0), 1.8));
        vec3 sunDir = normalize(vec3(-0.7, 0.35, -0.3));
        float sunDot = max(0.0, dot(normalize(vWorld), sunDir));
        col += vec3(1.0, 0.7, 0.4) * pow(sunDot, 32.0) * 0.7;
        col += vec3(1.0, 0.5, 0.2) * pow(sunDot, 4.0) * 0.2;
        // Nubes sutiles
        float clouds = sin(vWorld.x * 0.04) * sin(vWorld.z * 0.05) * 0.5 + 0.5;
        clouds *= smoothstep(0.1, 0.4, h) * 0.15;
        col = mix(col, vec3(1.0, 0.85, 0.7), clouds * smoothstep(0.1, 0.5, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false
  });
  const sky = new THREE.Mesh(skyGeom, skyMat);
  scene.add(sky);

  // ============== ILUMINACIÓN ==============
  const hemi = new THREE.HemisphereLight(0xffd9a0, 0x4a2a18, 0.55);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffc070, 1.7);
  sun.position.set(-80, 60, -40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -110;
  sun.shadow.camera.right = 110;
  sun.shadow.camera.top = 110;
  sun.shadow.camera.bottom = -110;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 260;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.05;
  scene.add(sun);

  const amb = new THREE.AmbientLight(0xfff0e0, 0.18);
  scene.add(amb);

  scene.fog = new THREE.FogExp2(PALETTE.fog.getHex(), 0.0075);
  scene.background = PALETTE.fog;

  // ============== VOLUMETRIC GOD RAYS (sun shaft) ==============
  // Un cono de geometría transparente desde el sol, aditivo
  const sunDir = sun.position.clone().normalize();
  const godrayGeom = new THREE.ConeGeometry(80, 200, 80, 1, true);
  godrayGeom.translate(0, -100, 0);
  godrayGeom.rotateX(-Math.PI / 2);
  const godrayMat = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(0xffd9a0) }
    },
    vertexShader: `
      varying float vAlpha;
      varying vec3 vPos;
      void main() {
        vPos = position;
        // alpha alto cerca del apex
        float distFromApex = length(position.xz);
        vAlpha = 1.0 - smoothstep(0.0, 80.0, distFromApex);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      uniform vec3 uColor;
      void main() {
        gl_FragColor = vec4(uColor, vAlpha * 0.18);
      }
    `,
    side: THREE.DoubleSide
  });
  const godray = new THREE.Mesh(godrayGeom, godrayMat);
  godray.position.copy(sunDir.clone().multiplyScalar(60));
  godray.lookAt(new THREE.Vector3(0, 0, 0));
  godray.rotateX(Math.PI / 2);
  scene.add(godray);

  // ============== PARTÍCULAS DE POLVO ==============
  const dustCount = 600;
  const dustGeom = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  const dustVel = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3]     = (Math.random() - 0.5) * 200;
    dustPos[i * 3 + 1] = Math.random() * 25 + 1;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 200;
    dustVel[i * 3]     = (Math.random() - 0.5) * 0.3;
    dustVel[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
    dustVel[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
  }
  dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xffd9a0,
    size: 0.18,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const dust = new THREE.Points(dustGeom, dustMat);
  scene.add(dust);

  function updateDust(dt) {
    const arr = dustGeom.attributes.position.array;
    for (let i = 0; i < dustCount; i++) {
      arr[i * 3]     += dustVel[i * 3] * dt;
      arr[i * 3 + 1] += dustVel[i * 3 + 1] * dt;
      arr[i * 3 + 2] += dustVel[i * 3 + 2] * dt;
      if (arr[i * 3 + 1] > 30) arr[i * 3 + 1] = 1;
      if (arr[i * 3 + 1] < 0.5) arr[i * 3 + 1] = 25;
      if (Math.abs(arr[i * 3]) > 100) dustVel[i * 3] = -dustVel[i * 3];
      if (Math.abs(arr[i * 3 + 2]) > 100) dustVel[i * 3 + 2] = -dustVel[i * 3 + 2];
    }
    dustGeom.attributes.position.needsUpdate = true;
  }

  // ============== CICLO DE LUZ (atardecer progresivo) ==============
  // Empieza atardecer y baja lentamente
  let cycleT = 0;
  function updateLightCycle(dt) {
    cycleT += dt * 0.005; // ~5 minutos real-time = 1 minuto día
    const dayPhase = (Math.sin(cycleT) + 1) * 0.5; // 0=atardecer bajo, 1=amanecer alto
    // mezcla entre atardecer y día
    const sunIntensity = 1.0 + dayPhase * 0.6;
    sun.intensity = sunIntensity;
    hemi.intensity = 0.5 + dayPhase * 0.3;
    amb.intensity = 0.15 + dayPhase * 0.1;
    // Color del sol cambia: rojizo al atardecer, cálido al mediodía
    const sunColor = new THREE.Color().lerpColors(
      new THREE.Color(0xff8050),
      new THREE.Color(0xfff0d0),
      dayPhase
    );
    sun.color.copy(sunColor);
    // Cambiar el color del fog también
    const fogColor = new THREE.Color().lerpColors(
      PALETTE.fog,
      new THREE.Color(0xe8c89a),
      dayPhase
    );
    scene.fog.color.copy(fogColor);
    scene.background = fogColor;
  }

  return {
    mesh, arroyo, charca, charcaRing, sky, sun, hemi, amb, dust, godray,
    getH, size, getPathDist: pathDist, pathPoints,
    updateDust, updateLightCycle, updateCharca
  };
}

// =================================================================
// CORTIJO EXTREMEÑO
// =================================================================
export function buildCortijo(scene, getH) {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe8d4a8, roughness: 1 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf4e0b8, roughness: 0.95 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x7a4a28, roughness: 1 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 1 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x5a3a18, roughness: 1 });
  const winMat = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.6 });

  const px = 35, pz = 18;
  const baseY = getH(px, pz);

  // ============== CASA ==============
  const casaW = 12, casaH = 5, casaD = 7;
  const casaGeom = new THREE.BoxGeometry(casaW, casaH, casaD);
  const casa = new THREE.Mesh(casaGeom, wallMat);
  casa.position.set(0, casaH / 2, 0);
  casa.castShadow = true;
  casa.receiveShadow = true;
  group.add(casa);

  // Base de piedra
  const baseStoneGeom = new THREE.BoxGeometry(casaW + 0.5, 0.6, casaD + 0.5);
  const baseStone = new THREE.Mesh(baseStoneGeom, stoneMat);
  baseStone.position.set(0, 0.3, 0);
  baseStone.castShadow = true;
  baseStone.receiveShadow = true;
  group.add(baseStone);

  // Tejado a dos aguas (prisma triangular)
  const roofGeom = new THREE.BufferGeometry();
  const rv = casaH * 0.6;
  const verts = new Float32Array([
    -casaW/2 - 0.3, casaH, -casaD/2 - 0.3,
     casaW/2 + 0.3, casaH, -casaD/2 - 0.3,
     casaW/2 + 0.3, casaH,  casaD/2 + 0.3,
    -casaW/2 - 0.3, casaH,  casaD/2 + 0.3,
    -casaW/2 - 0.3, casaH + rv, 0,
     casaW/2 + 0.3, casaH + rv, 0
  ]);
  const idx = [
    0, 1, 4,
    1, 2, 4,
    2, 3, 4,
    3, 0, 4,
    0, 1, 3,
    1, 2, 3
  ];
  roofGeom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  roofGeom.setIndex(idx);
  roofGeom.computeVertexNormals();
  const roof = new THREE.Mesh(roofGeom, roofMat);
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  // Puerta (madera)
  const doorGeom = new THREE.BoxGeometry(1.4, 2.4, 0.1);
  const door = new THREE.Mesh(doorGeom, doorMat);
  door.position.set(0, 1.2, casaD / 2 + 0.05);
  group.add(door);

  // Ventanas
  for (const side of [-1, 1]) {
    const winGeom = new THREE.BoxGeometry(0.9, 0.9, 0.1);
    const win = new THREE.Mesh(winGeom, winMat);
    win.position.set(side * 3, 3, casaD / 2 + 0.05);
    group.add(win);
  }
  // Ventanas laterales
  for (const s of [-1, 1]) {
    for (const z of [-2, 2]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.9), winMat);
      win.position.set(s * (casaW/2 + 0.05), 3, z);
      group.add(win);
    }
  }

  // Chimenea
  const chimGeom = new THREE.BoxGeometry(1, 2, 1);
  const chim = new THREE.Mesh(chimGeom, stoneMat);
  chim.position.set(3.5, casaH + 1.2, -1.5);
  chim.castShadow = true;
  group.add(chim);

  // ============== CORRAL ADYACENTE ==============
  // Pared del corral con postes
  const corralGroup = new THREE.Group();
  const corralSize = 14;
  const postGeom = new THREE.CylinderGeometry(0.1, 0.12, 1.6, 5);
  const railsGeom = new THREE.BoxGeometry(corralSize, 0.1, 0.1);
  for (let i = 0; i <= 8; i++) {
    const post = new THREE.Mesh(postGeom, woodMat);
    const a = (i / 8) * Math.PI * 2;
    const r = corralSize / 2;
    post.position.set(Math.cos(a) * r, 0.8, Math.sin(a) * r);
    post.castShadow = true;
    corralGroup.add(post);
  }
  // 2 railes horizontales
  for (const y of [0.5, 1.2]) {
    for (const ang of [0, Math.PI / 2]) {
      const rail = new THREE.Mesh(railsGeom, woodMat);
      rail.position.y = y;
      rail.rotation.y = ang;
      corralGroup.add(rail);
    }
  }
  corralGroup.position.set(0, 0, -12);
  group.add(corralGroup);

  // ============== ALMACÉN / TENADA ==============
  const tenadaGeom = new THREE.BoxGeometry(8, 3, 4);
  const tenada = new THREE.Mesh(tenadaGeom, wallMat);
  tenada.position.set(-10, 1.5, -3);
  tenada.castShadow = true;
  tenada.receiveShadow = true;
  group.add(tenada);
  // Tejado tenada (plano inclinado con tejas)
  const tRoofGeom = new THREE.BoxGeometry(8.4, 0.2, 4.4);
  const tRoof = new THREE.Mesh(tRoofGeom, roofMat);
  tRoof.position.set(-10, 3.1, -3);
  tRoof.rotation.z = -0.15;
  tRoof.castShadow = true;
  group.add(tRoof);

  // ============== ALJIBE (depósito de agua) ==============
  const aljibeGeom = new THREE.CylinderGeometry(2, 2, 1.5, 16);
  const aljibe = new THREE.Mesh(aljibeGeom, stoneMat);
  aljibe.position.set(8, 0.75, 3);
  aljibe.castShadow = true;
  aljibe.receiveShadow = true;
  group.add(aljibe);
  // Tapa del aljibe
  const aljibeTop = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.2, 16), woodMat);
  aljibeTop.position.set(8, 1.6, 3);
  group.add(aljibeTop);

  // ============== POZO (decorativo) ==============
  const pozoGroup = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const piedra = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.3), stoneMat);
    piedra.position.set(Math.cos(a) * 0.8, 0.25, Math.sin(a) * 0.8);
    piedra.castShadow = true;
    pozoGroup.add(piedra);
  }
  // Brocal superior
  const brocal = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 6, 12), woodMat);
  brocal.position.y = 0.55;
  brocal.rotation.x = Math.PI / 2;
  pozoGroup.add(brocal);
  // Palo y polea
  const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 6), woodMat);
  palo.position.set(0, 1.6, 0);
  pozoGroup.add(palo);
  const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), woodMat);
  cross.position.y = 2.4;
  cross.rotation.z = Math.PI / 2;
  pozoGroup.add(cross);
  pozoGroup.position.set(-7, 0, 5);
  group.add(pozoGroup);

  // Colocar todo el grupo en la posición del cortijo
  group.position.set(px, baseY, pz);
  group.rotation.y = 0.4;
  scene.add(group);

  return group;
}