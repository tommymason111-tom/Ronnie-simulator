// Food & veg: low-poly merged meshes + a tiny custom physics engine
// (sphere vs. room/furniture boxes). No physics library needed.
import * as THREE from 'three';
import { FOODS, TUNING, pickJunk } from './config.js';
import { part, merge, vcLambert, cyl, sph, box } from './geo.js';
import { canLabelTex } from './textures.js';
import { batMesh } from './pingpong.js';

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

// ---------- more fast food & snacks ----------
function hotdogGeo() {
  const bun = new THREE.CapsuleGeometry(0.026, 0.11, 4, 10); bun.rotateZ(Math.PI / 2);
  const dog = new THREE.CapsuleGeometry(0.014, 0.13, 4, 8); dog.rotateZ(Math.PI / 2);
  const p = [part(bun, 0xe0a04a, [0, -0.008, 0], [0, 0, 0], [1, 0.8, 1]), part(dog, 0xa8442a, [0, 0.014, 0])];
  for (let i = 0; i < 6; i++) p.push(part(box(0.022, 0.004, 0.006), i % 2 ? 0xffd21a : 0xd8352a, [-0.05 + i * 0.02, 0.029, (i % 2 - 0.5) * 0.008], [0, (i % 2 ? 0.6 : -0.6), 0]));
  return merge(p);
}
function friesGeo() {
  const p = [part(cyl(0.04, 0.03, 0.07, 4), 0xd32f2f, [0, -0.02, 0], [0, Math.PI / 4, 0], [1, 1, 0.6])];
  p.push(part(box(0.03, 0.02, 0.003), 0xffd21a, [0, -0.012, 0.022]));
  for (let i = 0; i < 12; i++) p.push(part(box(0.008, 0.07, 0.008), i % 3 ? 0xffcf40 : 0xf0b020, [((i % 4) - 1.5) * 0.012, 0.03 + (i % 3) * 0.006, ((i >> 2) - 1) * 0.008], [(i % 2 - 0.5) * 0.25, 0, ((i % 3) - 1) * 0.15]));
  return merge(p);
}
function kebabGeo() {      // doner in pitta, wrapped in paper
  const p = [part(cyl(0.036, 0.026, 0.13, 14), 0xf1d9a8, [0, -0.005, 0])];
  p.push(part(cyl(0.038, 0.028, 0.08, 14), 0xffffff, [0, -0.03, 0]), part(cyl(0.0385, 0.035, 0.012, 14), 0x1565c0, [0, 0.0, 0]));
  p.push(part(new THREE.IcosahedronGeometry(0.03, 1), 0x8b4a2b, [0, 0.062, 0], [0, 0, 0], [1.1, 0.6, 1.1]));
  p.push(part(new THREE.IcosahedronGeometry(0.016, 0), 0x6fbf3f, [0.014, 0.072, 0.01]));
  p.push(part(new THREE.IcosahedronGeometry(0.013, 0), 0xd8352a, [-0.014, 0.074, -0.004]));
  p.push(part(new THREE.IcosahedronGeometry(0.013, 0), 0xffffff, [0.0, 0.078, -0.016]));
  return merge(p);
}
function chickenGeo() {
  const p = [part(new THREE.IcosahedronGeometry(0.035, 1), 0xc7782a, [0, 0, 0.02], [0, 0, 0], [1, 0.85, 1.4])];
  p.push(part(cyl(0.008, 0.01, 0.06, 8), 0xf3ead8, [0, 0, -0.04], [Math.PI / 2, 0, 0]));
  p.push(part(sph(0.012, 8, 6), 0xf3ead8, [0, 0, -0.072]));
  for (let i = 0; i < 6; i++) p.push(part(new THREE.IcosahedronGeometry(0.012, 0), 0xa85d1c, [Math.cos(i) * 0.025, Math.sin(i * 2) * 0.02, 0.02 + Math.sin(i) * 0.03]));
  return merge(p);
}
function tacoGeo() {
  const shell = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16, 1, true, 0, Math.PI); shell.rotateZ(Math.PI / 2); shell.rotateY(Math.PI / 2);
  const p = [part(shell, 0xf2c14e, [0, 0, 0], [0, 0, 0], [1, 1, 1])];
  p.push(part(box(0.1, 0.02, 0.022), 0x7a3b1a, [0, 0.0, 0]));
  p.push(part(box(0.1, 0.012, 0.024), 0x6fbf3f, [0, 0.014, 0]));
  p.push(part(box(0.08, 0.008, 0.02), 0xffd21a, [0, 0.022, 0]));
  return merge(p);
}
function crispsGeo() {
  const p = [part(box(0.09, 0.12, 0.03), 0x1565c0, [0, 0, 0], [0, 0, 0], [1, 1, 1])];
  p.push(part(box(0.092, 0.012, 0.012), 0x0d47a1, [0, 0.064, 0]), part(box(0.092, 0.012, 0.012), 0x0d47a1, [0, -0.064, 0]));
  p.push(part(cyl(0.025, 0.025, 0.004, 14), 0xffd21a, [0, 0.0, 0.016], [Math.PI / 2, 0, 0]));
  p.push(part(box(0.07, 0.014, 0.002), 0xffffff, [0, 0.038, 0.016]));
  return merge(p);
}
function chocGeo() {
  const p = [part(box(0.13, 0.012, 0.045), 0x5b3a1e)];
  for (let i = 0; i < 4; i++) p.push(part(box(0.028, 0.006, 0.04), 0x6e4626, [-0.045 + i * 0.03, 0.008, 0]));
  p.push(part(box(0.08, 0.016, 0.047), 0x6a1b9a, [0.026, 0.002, 0]));                   // half-peeled wrapper
  p.push(part(box(0.04, 0.002, 0.02), 0xffffff, [0.03, 0.011, 0]));
  return merge(p);
}
function cookieGeo() {
  const p = [part(cyl(0.045, 0.045, 0.012, 16), 0xc98b4a)];
  for (let i = 0; i < 8; i++) p.push(part(new THREE.IcosahedronGeometry(0.006, 0), 0x3b2412, [Math.cos(i * 2.4) * (0.012 + (i % 3) * 0.01), 0.007, Math.sin(i * 2.4) * (0.012 + (i % 3) * 0.01)]));
  return merge(p);
}
function icecreamGeo() {
  const cone = new THREE.ConeGeometry(0.025, 0.09, 10); cone.rotateX(Math.PI);
  return merge([part(cone, 0xd9a05b, [0, -0.03, 0]), part(sph(0.03, 12, 8), 0xffc0d8, [0, 0.025, 0]), part(sph(0.024, 10, 6), 0xfff3d6, [0, 0.055, 0]), part(sph(0.007, 6, 4), 0xd32f2f, [0, 0.08, 0]), part(box(0.006, 0.05, 0.012), 0x5b3a1e, [0.01, 0.07, 0], [0, 0, -0.4])]);
}
function sausageRollGeo() {
  const pastry = new THREE.CapsuleGeometry(0.028, 0.08, 4, 10); pastry.rotateZ(Math.PI / 2);
  const p = [part(pastry, 0xe8b25a, [0, 0, 0], [0, 0, 0], [1, 0.85, 1]), part(cyl(0.016, 0.016, 0.004, 10), 0xc98060, [0.068, 0, 0], [0, 0, Math.PI / 2])];
  for (let i = 0; i < 4; i++) p.push(part(box(0.004, 0.003, 0.04), 0xb7782a, [-0.03 + i * 0.02, 0.024, 0], [0, 0.4, 0]));
  return merge(p);
}
// ---------- more fruit & veg (thrown at Ronnie) ----------
function appleGeo() { return merge([part(sph(0.036, 14, 10), 0xd62828, [0, 0, 0], [0, 0, 0], [1, 0.92, 1]), part(cyl(0.003, 0.003, 0.02, 5), 0x5b3a1e, [0, 0.038, 0]), part(new THREE.ConeGeometry(0.008, 0.024, 4), 0x3fa34d, [0.01, 0.04, 0], [0, 0, -1.2], [1, 1, 0.3])]); }
function pearGeo() { return merge([part(sph(0.034, 14, 10), 0x9ccc3a, [0, -0.012, 0]), part(sph(0.022, 12, 8), 0xa8d040, [0, 0.026, 0]), part(cyl(0.003, 0.003, 0.02, 5), 0x5b3a1e, [0, 0.055, 0])]); }
function orangeGeo() { return merge([part(new THREE.IcosahedronGeometry(0.036, 2), 0xff8c1a), part(new THREE.ConeGeometry(0.008, 0.016, 5), 0x3fa34d, [0, 0.038, 0])]); }
function bananaGeo() {
  const c = new THREE.TorusGeometry(0.07, 0.016, 8, 14, 1.6);
  return merge([part(c, 0xffe135, [0, -0.05, 0], [0, 0, 0.78]), part(cyl(0.006, 0.006, 0.014, 6), 0x5b3a1e, [-0.052, -0.004, 0], [0, 0, 0.9])]);
}
function tomatoGeo() { return merge([part(sph(0.032, 14, 10), 0xe53935, [0, 0, 0], [0, 0, 0], [1, 0.82, 1]), part(new THREE.ConeGeometry(0.018, 0.008, 5), 0x2e7d32, [0, 0.027, 0])]); }
function cucumberGeo() { const g = new THREE.CapsuleGeometry(0.02, 0.15, 4, 10); g.rotateX(Math.PI / 2); return merge([part(g, 0x2f6b2a), part(cyl(0.004, 0.004, 0.01, 5), 0x8bc34a, [0, 0, -0.098], [Math.PI / 2, 0, 0])]); }
function pepperGeo() { return merge([part(sph(0.034, 12, 8), 0xd32f2f, [0, -0.006, 0], [0, 0, 0], [1, 1.15, 1]), part(sph(0.02, 8, 6), 0xc62828, [0.016, -0.03, 0.012]), part(cyl(0.005, 0.006, 0.02, 6), 0x2e7d32, [0, 0.042, 0])]); }
function cauliflowerGeo() {
  const p = [part(new THREE.SphereGeometry(0.04, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0x6aaa3a, [0, -0.006, 0])];
  for (let i = 0; i < 7; i++) p.push(part(new THREE.IcosahedronGeometry(0.022, 1), 0xf5f0dc, [Math.cos(i * 0.9) * (i ? 0.02 : 0), 0.012 + (i ? 0 : 0.012), Math.sin(i * 0.9) * (i ? 0.02 : 0)]));
  return merge(p);
}

// the thing in the toilet. Do NOT eat.
function poopGeo() {
  const B = [0x5a3418, 0x6b3f1d, 0x4e2c12];
  const p = [];
  [[0.045, 0.016, 0], [0.034, 0.014, 0.022], [0.022, 0.012, 0.04]].forEach(([r, t, y], i) => p.push(part(new THREE.TorusGeometry(r, t, 8, 16), B[i], [0, y - 0.02, 0], [Math.PI / 2, 0, i * 0.7])));
  p.push(part(new THREE.SphereGeometry(0.03, 10, 6), B[0], [0, -0.02, 0], [0, 0, 0], [1.4, 0.5, 1.4]));
  p.push(part(new THREE.ConeGeometry(0.014, 0.035, 8), B[1], [0.004, 0.06, 0], [0, 0, -0.3]));
  return merge(p);
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

// a dart: steel tip pointing along -z, tungsten barrel, shaft, flights
function dartGeo() {
  const R = [-Math.PI / 2, 0, 0], p = [];
  p.push(part(cyl(0.0004, 0.0032, 0.03, 8), 0xd0d4da, [0, 0, -0.06], R));
  p.push(part(cyl(0.0045, 0.0045, 0.05, 10), 0x6a6e78, [0, 0, -0.02], R));
  for (let i = 0; i < 4; i++) p.push(part(cyl(0.0048, 0.0048, 0.004, 10), 0x3a3e48, [0, 0, -0.038 + i * 0.012], R));   // knurling
  p.push(part(cyl(0.0025, 0.0025, 0.04, 6), 0x111111, [0, 0, 0.025], R));
  p.push(part(box(0.04, 0.0015, 0.035), 0xd32f2f, [0, 0, 0.05])); p.push(part(box(0.0015, 0.04, 0.035), 0xd32f2f, [0, 0, 0.05]));
  return merge(p);
}

const geoCache = {};
function meshFor(type) {
  if (type === 'can') return canMeshes();
  if (type === 'bat') return batMesh();
  if (!geoCache[type]) geoCache[type] = { burger: burgerGeo, pizza: pizzaGeo, doughnut: doughnutGeo, broccoli: broccoliGeo, carrot: carrotGeo, celery: celeryGeo, sprout: sproutGeo, pint: pintGeo, shake: shakeGeo, poop: poopGeo,
    hotdog: hotdogGeo, fries: friesGeo, kebab: kebabGeo, chicken: chickenGeo, taco: tacoGeo, crisps: crispsGeo, choc: chocGeo, cookie: cookieGeo, icecream: icecreamGeo, sausageroll: sausageRollGeo,
    apple: appleGeo, pear: pearGeo, orange: orangeGeo, banana: bananaGeo, tomato: tomatoGeo, cucumber: cucumberGeo, pepper: pepperGeo, cauliflower: cauliflowerGeo, dart: dartGeo }[type]();
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
  queueRespawn(type, delay = this.respawnDelay || TUNING.respawnDelay) { this.respawnQueue.push({ type, t: delay }); }

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
    // big places never run dry: top up with random junk food every so often
    if (this.minFood && (this.topUpT = (this.topUpT || 0) - dt) <= 0) {
      this.topUpT = 1.0;
      let food = this.respawnQueue.length;
      for (const it of this.items) if (!it.def.veg && !it.def.prop && !it.temp && !it.empty && !it.incoming) food++;
      if (food < this.minFood) { const t = pickJunk(); this.spawn(t, this.freeSpawn()); }
    }
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
      if (it.def.dart) {           // darts fly point first, and can stick in the board
        if (it.vel.lengthSq() > 1) it.obj.quaternion.setFromUnitVectors(_c.set(0, 0, -1), _v.copy(it.vel).normalize());
        if (this.room.dartboard && this.room.dartboard.hitTest(it)) continue;
      } else { it.obj.rotation.x += it.spin.x * dt; it.obj.rotation.y += it.spin.y * dt; it.obj.rotation.z += it.spin.z * dt; }
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
  else if (it.def.bat) { r.x = -Math.PI / 2; r.z = 0; }
  else { r.x = 0; r.z = 0; }
}

function easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
