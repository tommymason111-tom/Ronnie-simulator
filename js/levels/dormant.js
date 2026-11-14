// Shop displays that are really items: bakery buns in the bins, magazines on the racks, Lidl bags
// lying about. Drawn instanced (a few draw calls for hundreds of them); the moment you reach for one
// it turns into a real item you can eat, grab or throw.
import * as THREE from 'three';
import { itemParts } from '../foods.js';

const _zero = new THREE.Matrix4().makeScale(0, 0, 0), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1), _w = new THREE.Vector3();

export class Dormant {
  constructor() { this.entries = []; }
  // an item of `type` (variant v) resting at (x, y, z) turned by yaw, optionally tipped (rx, rz)
  add(type, x, y, z, yaw = 0, v = 0, rx = 0, rz = 0) { this.entries.push({ type, v, pos: new THREE.Vector3(x, y, z), rot: [rx, yaw, rz], woken: false }); }
  build(scene) {
    const groups = new Map();
    for (const e of this.entries) {
      const key = e.type + ':' + (e.type === 'magazine' ? e.v : 0);
      if (!groups.has(key)) groups.set(key, { parts: itemParts(e.type, e.v), list: [] });
      const g = groups.get(key); e.group = g; e.index = g.list.length; g.list.push(e);
    }
    for (const g of groups.values()) {
      g.meshes = g.parts.map(([geo, mat]) => { const im = new THREE.InstancedMesh(geo, mat, g.list.length); im.frustumCulled = false; scene.add(im); return im; });
      g.list.forEach((e, i) => { _m.compose(e.pos, _q.setFromEuler(_e.set(...e.rot)), _s); for (const im of g.meshes) im.setMatrixAt(i, _m); });
      for (const im of g.meshes) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); }
    }
  }
  wake(items, e) {
    e.woken = true;
    for (const im of e.group.meshes) { im.setMatrixAt(e.index, _zero); im.instanceMatrix.needsUpdate = true; }
    const it = items.spawn(e.type, e.pos, null, e.v);
    it.spawnScale = 1; it.obj.scale.setScalar(1); it.resting = true; it.shelf = true; it.fromClutter = true;
    it.obj.rotation.set(...e.rot);
    return it;
  }
  wakeNear(items, p, r) { for (const e of this.entries) if (!e.woken && e.pos.distanceToSquared(p) < r * r) this.wake(items, e); }
  wakeRay(items, ray, reach) {
    for (const e of this.entries) { if (e.woken) continue;
      const along = _w.subVectors(e.pos, ray.origin).dot(ray.direction);
      if (along > 0 && along < reach && ray.distanceSqToPoint(e.pos) < 0.12 * 0.12) this.wake(items, e); }
  }
}
