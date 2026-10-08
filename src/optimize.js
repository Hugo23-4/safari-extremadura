// ============================================================
// optimize.js — Menos draw calls sin cambiar el aspecto
// La escena tenía ~2.700 mallas y ~1.250 materiales: el coste por
// objeto de WebGLRenderer.render era el 90% del frame (≈15 fps).
// ============================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const ATTRS = ['position', 'normal', 'uv'];

function materialKey(m) {
  return [
    m.type, m.color?.getHex(), m.emissive?.getHex(), m.emissiveIntensity,
    m.roughness, m.metalness, m.flatShading, m.side, m.transparent, m.opacity,
    m.vertexColors, m.wireframe, m.map?.uuid ?? ''
  ].join('|');
}

// Sustituye los materiales con los mismos parámetros por una sola instancia.
// Pasar el mismo `cache` a varias llamadas comparte materiales entre objetos.
export function shareMaterials(root, cache = new Map()) {
  root.traverse(o => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    const k = materialKey(o.material);
    const shared = cache.get(k);
    if (!shared) cache.set(k, o.material);
    else if (shared !== o.material) o.material = shared;
  });
  return cache;
}

// Copia plana con la transformación aplicada. No usa geometry.clone(): en las
// primitivas (SphereGeometry…) reconstruye la figura entera antes de copiar.
function bakedCopy(src, matrix, indexed) {
  let g = new THREE.BufferGeometry();
  for (const n of ATTRS) if (src.attributes[n]) g.setAttribute(n, src.attributes[n].clone());
  if (src.index) g.setIndex(src.index.clone());
  if (!indexed && g.index) g = g.toNonIndexed();
  if (!g.attributes.normal) g.computeVertexNormals();
  g.applyMatrix4(matrix);
  return g;
}

// Fusiona en una malla por material todas las mallas estáticas bajo `root`.
// Las piezas animadas (las que root.userData referencia: patas, cola, alas)
// y todo lo que cuelga de ellas se quedan como están.
export function mergeStaticMeshes(root) {
  const keep = new Set();
  for (const v of Object.values(root.userData)) {
    for (const o of Array.isArray(v) ? v : [v]) if (o && o.isObject3D) keep.add(o);
  }
  const isKept = (o) => {
    for (let p = o; p && p !== root; p = p.parent) if (keep.has(p)) return true;
    return false;
  };

  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || isKept(o)) return;
    const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}`;
    let b = buckets.get(key);
    if (!b) buckets.set(key, b = { material: o.material, cast: o.castShadow, receive: o.receiveShadow, objs: [] });
    b.objs.push(o);
  });

  const merged = [];
  for (const b of buckets.values()) {
    if (b.objs.length < 2) continue;
    // Indexada si todas lo son (≈4× menos vértices); si se mezclan, todas sin índice
    const indexed = b.objs.every(o => o.geometry.index);
    b.geoms = b.objs.map(o => bakedCopy(o.geometry, new THREE.Matrix4().multiplyMatrices(toRoot, o.matrixWorld), indexed));
    const names = ATTRS.filter(n => b.geoms.every(g => g.attributes[n]));
    for (const g of b.geoms) {
      for (const n of Object.keys(g.attributes)) if (!names.includes(n)) g.deleteAttribute(n);
      g.morphAttributes = {};
    }
    const geo = mergeGeometries(b.geoms, false);
    if (!geo) continue; // atributos incompatibles: se dejan las mallas originales
    const mesh = new THREE.Mesh(geo, b.material);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    root.add(mesh);
    merged.push(...b.objs);
  }

  for (const o of merged) o.removeFromParent();
  // Grupos que se han quedado vacíos
  const prune = (o) => {
    for (const c of [...o.children]) prune(c);
    if (o !== root && !o.isMesh && o.children.length === 0 && !keep.has(o) && (o.type === 'Group' || o.type === 'Object3D')) {
      o.removeFromParent();
    }
  };
  prune(root);
  return root;
}
