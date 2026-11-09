// Food & veg: low-poly merged meshes + a tiny custom physics engine
// (sphere vs. room/furniture boxes). No physics library needed.
import * as THREE from 'three';
import { FOODS, TUNING } from './config.js';
import { part, merge, vcLambert, cyl, sph, box } from './geo.js';
import { canLabelTex } from './textures.js';

// ---------- geometry ----------
function burgerGeo() {
  const p = [];
  p.push(part(cyl(0.062, 0.058, 0.025, 20), 0xd9933f, [0, -0.032, 0]));                 // bottom bun
  p.push(part(cyl(0.066, 0.066, 0.02, 20), 0x5a2e14, [0, -0.012, 0]));                  // patty
  p.push(part(box(0.11, 0.004, 0.11), 0xffc21a, [0, 0.0, 0], [0, 0.6, 0]));               // cheese
  p.push(part(cyl(0.07, 0.07, 0.006, 14), 0x4caf3c, [0, 0.006, 0]));                    // lettuce
  p.push(part(cyl(0.05, 0.05, 0.008, 12), 0xd8352a, [0.01, 0.013, 0.005]));             // tomato
  const top = new THREE.SphereGeometry(0.064, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  p.push(part(top, 0xe0a04a, [0, 0.015, 0], [0, 0, 0], [1, 0.62, 1]));                   // top bun
  for (let i = 0; i < 9; i++) {
    const a = i * 2.3, r = 0.015 + (i % 3) * 0.013;
    p.push(part(sph(0.004, 4, 3), 0xfff4d6, [Math.cos(a) * r, 0.015 + 0.04 * Math.sqrt(1 - (r / 0.064) ** 2) * 0.95, Math.sin(a) * r], [0, 0, 0], [1.6, 0.6, 1]));
  }
  return merge(p);
}

function pizzaGeo() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.09); s.lineTo(-0.07, -0.07); s.lineTo(0.07, -0.07); s.lineTo(0, 0.09);
  const slab = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false });
  const p = [];
  p.push(part(slab, 0xf2b233, [0, -0.006, 0.0], [-Math.PI / 2, 0, 0]));               // cheesy slice (flat, point toward -z)
  p.push(part(cyl(0.012, 0.012, 0.15, 8), 0xc9852f, [0, 0.002, 0.07], [0, 0, Math.PI / 2])); // crust
  for (const [x, z] of [[0, -0.03], [-0.025, 0.03], [0.028, 0.035], [0.0, 0.01]])
    p.push(part(cyl(0.014, 0.014, 0.004, 10), 0xb3261e, [x, 0.008, z]));                // pepperoni
  return merge(p);
}

function doughnutGeo() {
  const p = [];
  p.push(part(new THREE.TorusGeometry(0.04, 0.02, 10, 22), 0xd9a05b, [0, 0, 0], [Math.PI / 2, 0, 0]));
  const icing = new THREE.TorusGeometry(0.04, 0.021, 8, 22, Math.PI * 2);
  p.push(part(icing, 0xff6fae, [0, 0.006, 0], [Math.PI / 2, 0, 0], [1.02, 1.02, 0.75]));
  const cols = [0xffffff, 0x3fc1ff, 0xfff04a, 0x7cff6a, 0xff4040];
  for (let i = 0; i < 18; i++) {
    const a = i * 0.349 + (i % 2) * 0.1, r = 0.032 + (i % 3) * 0.008;
    p.push(part(box(0.008, 0.003, 0.003), cols[i % cols.length], [Math.cos(a) * r, 0.022, Math.sin(a) * r], [0, i * 1.1, 0]));
  }
  return merge(p);
}

function broccoliGeo() {
  const p = [];
  p.push(part(cyl(0.012, 0.018, 0.07, 8), 0x9ccc65, [0, -0.03, 0]));
  const greens = [0x2e7d32, 0x388e3c, 0x1b5e20];
  const blobs = [[0, 0.03, 0, 0.034], [0.028, 0.018, 0.01, 0.026], [-0.026, 0.02, 0.008, 0.026], [0.006, 0.02, 0.028, 0.025], [0.004, 0.018, -0.027, 0.025]];
  blobs.forEach(([x, y, z, r], i) => p.push(part(new THREE.IcosahedronGeometry(r, 1), greens[i % 3], [x, y, z])));
  // angry googly eyes + eyebrows
  for (const s of [-1, 1]) {
    p.push(part(sph(0.011, 8, 6), 0xffffff, [s * 0.013, 0.03, 0.03]));
    p.push(part(sph(0.005, 6, 4), 0x000000, [s * 0.012, 0.029, 0.04]));
    p.push(part(box(0.016, 0.004, 0.004), 0x0b2a0b, [s * 0.013, 0.045, 0.036], [0, 0, s * -0.5]));
  }
  return merge(p);
}

function carrotGeo() {
  const g = new THREE.ConeGeometry(0.018, 0.14, 10); g.rotateX(Math.PI / 2);
  return merge([part(g, 0xff7a1a), part(new THREE.ConeGeometry(0.012, 0.04, 6), 0x3fa34d, [0, 0, -0.085], [-Math.PI / 2, 0, 0]), part(new THREE.ConeGeometry(0.008, 0.035, 5), 0x2e8b3d, [0.006, 0.004, -0.08], [-Math.PI / 2, 0, 0.5])]);
}
function celeryGeo() {
  const p = [part(cyl(0.012, 0.014, 0.2, 8), 0x9ccc65, [0, 0, 0], [Math.PI / 2, 0, 0])];
  for (let i = 0; i < 4; i++) p.push(part(new THREE.IcosahedronGeometry(0.014, 0), 0x6aaa3a, [(i - 1.5) * 0.008, 0.008, -0.1]));
  return merge(p);
}
function sproutGeo() {
  return merge([part(new THREE.IcosahedronGeometry(0.028, 1), 0x7cb342), part(new THREE.IcosahedronGeometry(0.02, 1), 0x9ccc65, [0.01, 0.012, 0.01]), part(cyl(0.006, 0.008, 0.012, 6), 0xc5e1a5, [0, -0.028, 0])]);
}
// a pint of (parody) BLACK LIFFEY STOUT with a creamy head
function pintGeo() {
  return merge([
    part(cyl(0.042, 0.034, 0.12, 18), 0x140c08, [0, -0.01, 0]),
    part(cyl(0.043, 0.042, 0.022, 18), 0xf3e6c8, [0, 0.061, 0]),
    part(cyl(0.035, 0.035, 0.006, 18), 0xd8d8d8, [0, -0.073, 0]),
    part(box(0.05, 0.03, 0.002), 0xd4af37, [0, 0.0, 0.039]),
  ]);
}
// protein shake: white tub-bottle with a red lid
function shakeGeo() {
  return merge([part(cyl(0.035, 0.035, 0.13, 16), 0xf2f2f2), part(cyl(0.037, 0.037, 0.03, 16), 0xd32f2f, [0, 0.075, 0]), part(box(0.05, 0.05, 0.002), 0x1565c0, [0, 0, 0.035])]);
}

let canGeoCache = null;
function canMeshes() {
  if (!canGeoCache) {
    canGeoCache = {
      body: new THREE.CylinderGeometry(0.033, 0.033, 0.14, 18, 1, true),
      ends: merge([
        part(cyl(0.029, 0.033, 0.012, 18), 0xd0d0d0, [0, 0.076, 0]),
        part(cyl(0.033, 0.029, 0.012, 18), 0xb0b0b0, [0, -0.076, 0]),
        part(box(0.016, 0.003, 0.026), 0x999999, [0, 0.083, 0.008]),      // ring pull
      ]),
      mat: new THREE.MeshPhongMaterial({ map: canLabelTex(), shininess: 60, specular: 0x555555 }),
    };
  }
  const g = new THREE.Group();
  g.add(new THREE.Mesh(canGeoCache.body, canGeoCache.mat));
  g.add(new THREE.Mesh(canGeoCache.ends, vcLambert));
  return g;
}

const geoCache = {};
function meshFor(type) {
  if (type === 'can') return canMeshes();
  if (!geoCache[type]) geoCache[type] = { burger: burgerGeo, pizza: pizzaGeo, doughnut: doughnutGeo, broccoli: broccoliGeo, carrot: carrotGeo, celery: celeryGeo, sprout: sproutGeo, pint: pintGeo, shake: shakeGeo }[type]();
  return new THREE.Mesh(geoCache[type], vcLambert);
}

// ---------- items ----------
const _v = new THREE.Vector3(), _c = new THREE.Vector3();

export class Item {
  constructor(type) {
    this.type = type;
    this.def = FOODS[type];
    this.obj = new THREE.Group();
    this.obj.add(meshFor(type));
    this.radius = this.def.radius;
    this.vel = new THREE.Vector3();
    this.prev = new THREE.Vector3();   // position last frame (for swept hit tests)
    this.spin = new THREE.Vector3();
    this.reset();
  }
  reset() {
    this.bitesLeft = this.def.bites;
    this.heldBy = null;
    this.resting = false;
    this.dead = false;
    this.empty = false;        // finished can
    this.opened = false;
    this.chug = 0;
    this.thrownByPlayer = false;
    this.incoming = false;      // thrown at Ronnie by a character
    this.foodPass = false;      // ...and it's food (Harry's passes), not veg
    this.thrower = null;
    this.temp = false;
    this.swatted = false;
    this.restTime = 0;
    this.age = 0;
    this.spawnScale = 0.01;
    this.obj.scale.setScalar(0.01);
    this.vel.set(0, 0, 0); this.spin.set(0, 0, 0);
    this.obj.visible = true;
  }
  get pos() { return this.obj.position; }
  get eatFraction() { return this.bitesLeft / this.def.bites; }
}

export class ItemManager {
  constructor(scene, room) {
    this.scene = scene;
    this.room = room;
    this.items = [];
    this.pool = {};
    this.respawnQueue = [];
    this.onLand = null;        // callback(item, speed)
  }

  spawn(type, pos, vel = null) {
    const pool = this.pool[type] || (this.pool[type] = []);
    const it = pool.pop() || new Item(type);
    it.reset();
    it.obj.position.copy(pos);
    it.prev.copy(pos);
    it.obj.rotation.set(0, Math.random() * Math.PI * 2, 0);
    if (vel) { it.vel.copy(vel); it.spawnScale = 1; it.obj.scale.setScalar(1); }
    this.scene.add(it.obj);
    this.items.push(it);
    return it;
  }

  remove(it) {
    it.dead = true;
    it.heldBy = null;
    this.scene.remove(it.obj);
    const i = this.items.indexOf(it);
    if (i >= 0) this.items.splice(i, 1);
    (this.pool[it.type] || (this.pool[it.type] = [])).push(it);
  }

  // Put a fresh item of this type on a free spawn spot after a delay.
  queueRespawn(type, delay = TUNING.respawnDelay) { this.respawnQueue.push({ type, t: delay }); }

  freeSpawn() {
    const sp = this.room.spawns;
    for (let tries = 0; tries < 20; tries++) {
      const p = sp[Math.floor(Math.random() * sp.length)];
      if (this.items.every(it => it.pos.distanceToSquared(p) > 0.15 * 0.15)) return p;
    }
    return sp[Math.floor(Math.random() * sp.length)];
  }

  nearest(point, radius, filter = null) {
    let best = null, bd = radius * radius;
    for (const it of this.items) {
      if (it.dead || (filter && !filter(it))) continue;
      const d = it.pos.distanceToSquared(point) - it.radius * it.radius;
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }

  update(dt) {
    for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
      const r = this.respawnQueue[i];
      r.t -= dt;
      if (r.t <= 0) { this.respawnQueue.splice(i, 1); this.spawn(r.type, this.freeSpawn()); this.onSpawn && this.onSpawn(r.type); }
    }
    const b = this.room.bounds, g = TUNING.gravity;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.age += dt;
      if (it.spawnScale < 1) { it.spawnScale = Math.min(1, it.spawnScale + dt * 4); it.obj.scale.setScalar(easeOutBack(it.spawnScale) * (0.55 + 0.45 * it.eatFraction)); }
      if (it.heldBy) { it.resting = false; it.restTime = 0; continue; }
      if (it.resting) {
        it.restTime += dt;
        if ((it.def.veg || it.empty || it.temp) && it.restTime > 6) this.remove(it);
        continue;
      }
      // integrate
      it.prev.copy(it.pos);
      it.vel.y += g * dt;
      it.pos.addScaledVector(it.vel, dt);
      it.obj.rotation.x += it.spin.x * dt; it.obj.rotation.y += it.spin.y * dt; it.obj.rotation.z += it.spin.z * dt;
      const r = it.radius;
      let hit = false, impact = 0;
      // room shell
      if (it.pos.y < r) { impact = Math.max(impact, -it.vel.y); it.pos.y = r; it.vel.y = -it.vel.y * 0.3; it.vel.x *= 0.7; it.vel.z *= 0.7; hit = true; }
      if (it.pos.y > b.y1 - r) { it.pos.y = b.y1 - r; it.vel.y = -Math.abs(it.vel.y) * 0.3; }
      if (it.pos.x < b.x0 + r) { impact = Math.max(impact, -it.vel.x); it.pos.x = b.x0 + r; it.vel.x = Math.abs(it.vel.x) * 0.35; }
      if (it.pos.x > b.x1 - r) { impact = Math.max(impact, it.vel.x); it.pos.x = b.x1 - r; it.vel.x = -Math.abs(it.vel.x) * 0.35; }
      if (it.pos.z < b.z0 + r) { impact = Math.max(impact, -it.vel.z); it.pos.z = b.z0 + r; it.vel.z = Math.abs(it.vel.z) * 0.35; }
      if (it.pos.z > b.z1 - r) { impact = Math.max(impact, it.vel.z); it.pos.z = b.z1 - r; it.vel.z = -Math.abs(it.vel.z) * 0.35; }
      // furniture
      let onTop = it.pos.y <= r + 0.001;
      for (const c of this.room.colliders) {
        _c.copy(it.pos).clamp(c.min, c.max);
        _v.subVectors(it.pos, _c);
        const d2 = _v.lengthSq();
        if (d2 >= r * r) continue;
        const d = Math.sqrt(d2);
        if (d < 1e-5) { _v.set(0, 1, 0); } else _v.multiplyScalar(1 / d);
        it.pos.addScaledVector(_v, r - d);
        const vn = it.vel.dot(_v);
        if (vn < 0) { impact = Math.max(impact, -vn); it.vel.addScaledVector(_v, -vn * 1.3); it.vel.multiplyScalar(0.75); }
        if (_v.y > 0.7) onTop = true;
        hit = true;
      }
      if (hit && impact > 0.6 && this.onLand) this.onLand(it, impact);
      if (onTop) {
        it.spin.multiplyScalar(0.9);
        if (it.vel.lengthSq() < 0.02) { it.resting = true; it.vel.set(0, 0, 0); settle(it); }
      }
    }
  }
}

// Lay things down nicely when they come to rest.
function settle(it) {
  const r = it.obj.rotation;
  if (it.def.drink) { r.x = it.empty ? Math.PI / 2 : 0; r.z = 0; }
  else { r.x = 0; r.z = 0; }
}

function easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
