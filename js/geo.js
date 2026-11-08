// Geometry helpers. Lots of coloured primitives get merged into ONE mesh with
// vertex colours — that keeps draw calls tiny, which is what keeps the Quest at 72fps.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

// Prepare a primitive: transform it, paint it one colour, strip UVs.
export function part(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  _m.compose(_p.set(...pos), _q.setFromEuler(_e.set(...rot)), _s.set(...scl));
  g.applyMatrix4(_m);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

export function merge(parts) {
  const g = mergeGeometries(parts, false);
  parts.forEach(p => p.dispose());
  g.computeBoundingSphere();
  return g;
}

// Shared vertex-coloured materials.
export const vcLambert = new THREE.MeshLambertMaterial({ vertexColors: true });
export const vcPhong = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 40, specular: 0x333333 });

export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const cyl = (rt, rb, h, seg = 16) => new THREE.CylinderGeometry(rt, rb, h, seg);
export const sph = (r, ws = 12, hs = 8) => new THREE.SphereGeometry(r, ws, hs);
