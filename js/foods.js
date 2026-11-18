// Food & veg: low-poly merged meshes + a tiny custom physics engine
// (sphere vs. room/furniture boxes). No physics library needed.
import * as THREE from 'three';
import { FOODS, TUNING, pickJunk } from './config.js';
import { part, merge, vcLambert, cyl, sph, box } from './geo.js';
import { canLabelTex } from './textures.js';
import { batMesh } from './pingpong.js';
import { HI } from './foodmodels.js';

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
// a pint of (parody) GUINNESS STOUT with a creamy head
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
// far-away versions of the newer fast food (the detailed ones are in foodmodels.js)
const lowNew = {
  nuggets: () => merge([part(box(0.09, 0.05, 0.06), 0xd32f2f, [0, -0.025, 0]), part(sph(0.03, 8, 6), 0xd9902e, [0, 0.004, 0], [0, 0, 0], [1.4, 0.5, 0.9])]),
  pasty: () => merge([part(sph(0.05, 12, 8, 0, Math.PI), 0xe0a050, [0, -0.012, 0], [0, 0, 0], [1.25, 0.62, 0.6])]),
  onionrings: () => merge([part(cyl(0.05, 0.05, 0.016, 12), 0xf5f0e0, [0, -0.006, 0], [0, 0, 0], [1.2, 1, 0.85]), part(new THREE.TorusGeometry(0.02, 0.0075, 6, 12), 0xe0a040, [0, 0.008, 0], [Math.PI / 2, 0, 0])]),
  burrito: () => merge([part(new THREE.CapsuleGeometry(0.028, 0.1, 3, 8).rotateZ(Math.PI / 2), 0xf2dcae), part(cyl(0.0295, 0.0295, 0.07, 10).rotateZ(Math.PI / 2), 0xcfd4d8, [-0.035, 0, 0])]),
  waffle: () => merge([part(box(0.1, 0.014, 0.1), 0xe0a050, [0, -0.004, 0]), part(sph(0.016, 8, 6), 0xfffcf4, [0.012, 0.012, 0.01])]),
  pancakes: () => merge([part(cyl(0.046, 0.046, 0.038, 14), 0xe8b060, [0, -0.006, 0]), part(cyl(0.04, 0.04, 0.002, 14), 0x9a4a10, [0, 0.0135, 0])]),
  churros: () => merge([part(cyl(0.03, 0.024, 0.055, 10), 0xd32f2f, [0, -0.03, 0]), part(box(0.03, 0.11, 0.014), 0xc98a3a, [0, 0.0, 0])]),
  cupcake: () => merge([part(cyl(0.03, 0.024, 0.032, 12), 0x3fa3ff, [0, -0.022, 0]), part(new THREE.ConeGeometry(0.03, 0.06, 12), 0xffb0d8, [0, 0.025, 0])]),
  baconbap: () => merge([part(cyl(0.058, 0.06, 0.022, 14), 0xe8c890, [0, -0.03, 0]), part(cyl(0.06, 0.06, 0.008, 14), 0xd9707a, [0, -0.013, 0]), part(sph(0.06, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xe0b880, [0, 0.006, 0], [0, 0, 0], [1, 0.85, 1])]),
};
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

// a bottle of lager: green glass, label, gold cap (stands on y = 0 -> centred like the can)
function beerGeo() {
  const p = [];
  p.push(part(cyl(0.031, 0.031, 0.13, 14), 0x1f5a24, [0, -0.045, 0]));
  p.push(part(cyl(0.0315, 0.0315, 0.06, 14), 0xf4ecd2, [0, -0.05, 0]));              // label
  p.push(part(cyl(0.013, 0.031, 0.05, 14), 0x1f5a24, [0, 0.045, 0]));                // shoulders
  p.push(part(cyl(0.012, 0.013, 0.05, 10), 0x1f5a24, [0, 0.095, 0]));                // neck
  p.push(part(cyl(0.0145, 0.0145, 0.01, 10), 0xd4af37, [0, 0.124, 0]));              // cap
  return merge(p);
}
// ---- behind the bar: glasses, cups and what goes in them (Run the Pub)
const GLASSC = 0xcfe6ee;
function glassGeo() {            // an empty pint glass (nonic: the bulge near the top)
  const p = [part(new THREE.LatheGeometry([[0, -0.07], [0.03, -0.07], [0.033, -0.05], [0.04, 0.035], [0.043, 0.05], [0.041, 0.06], [0.04, 0.07], [0.037, 0.07], [0.038, 0.06], [0.04, 0.05], [0.037, 0.035], [0.03, -0.062], [0, -0.062]].map(([x, y]) => new THREE.Vector2(x, y)), 20), GLASSC)];
  return merge(p);
}
function ciderGeo() {
  const p = [];
  p.push(part(cyl(0.031, 0.031, 0.13, 14), 0x8a4a12, [0, -0.045, 0]));
  p.push(part(cyl(0.0315, 0.0315, 0.06, 14), 0xc8102e, [0, -0.05, 0]));
  p.push(part(cyl(0.032, 0.032, 0.012, 14), 0x7cc84a, [0, -0.03, 0]));               // the apple stripe
  p.push(part(cyl(0.013, 0.031, 0.05, 14), 0x8a4a12, [0, 0.045, 0]));
  p.push(part(cyl(0.012, 0.013, 0.05, 10), 0x8a4a12, [0, 0.095, 0]));
  p.push(part(cyl(0.0145, 0.0145, 0.01, 10), 0xc0c0c0, [0, 0.124, 0]));
  return merge(p);
}
function wineGeo(v = 0) {         // a glass of red (0) or white (1)
  const p = [];
  p.push(part(cyl(0.032, 0.034, 0.004, 18), GLASSC, [0, -0.085, 0]), part(cyl(0.004, 0.004, 0.07, 8), GLASSC, [0, -0.05, 0]));
  p.push(part(new THREE.LatheGeometry([[0.004, -0.015], [0.026, -0.005], [0.036, 0.02], [0.034, 0.05], [0.031, 0.065]].map(([x, y]) => new THREE.Vector2(x, y)), 20), GLASSC));
  p.push(part(new THREE.LatheGeometry([[0, -0.012], [0.024, -0.004], [0.033, 0.016], [0, 0.016]].map(([x, y]) => new THREE.Vector2(x, y)), 20), v ? 0xf2e2a0 : 0x7a0a24));
  return merge(p);
}
function mugGeo(full) {
  const p = [part(cyl(0.036, 0.033, 0.08, 18), 0xf6f6f2), part(new THREE.TorusGeometry(0.018, 0.006, 6, 12, Math.PI), 0xf6f6f2, [0.036, 0, 0], [0, 0, -Math.PI / 2])];
  p.push(part(cyl(0.031, 0.031, 0.002, 18), full ? 0x6a3a1a : 0xe0e0dc, [0, full ? 0.034 : -0.035, 0]));
  if (full) { p.push(part(cyl(0.024, 0.024, 0.002, 16), 0xd8b080, [0, 0.0355, 0])); for (let i = 0; i < 3; i++) p.push(part(new THREE.TorusGeometry(0.008 + i * 0.006, 0.0012, 4, 16), 0xf0dcc0, [0, 0.0365, 0], [Math.PI / 2, 0, 0])); }   // crema and a latte-art swirl
  return merge(p);
}
function cupGeo(v = -1) {          // a plastic tumbler: empty (-1), Coke (0) or Fanta (1), with ice and a straw
  const p = [part(new THREE.LatheGeometry([[0, -0.045], [0.028, -0.045], [0.036, 0.045], [0.034, 0.045], [0.026, -0.04], [0, -0.04]].map(([x, y]) => new THREE.Vector2(x, y)), 18), 0xe8f2f6)];
  if (v >= 0) { p.push(part(cyl(0.0335, 0.027, 0.075, 16), v ? 0xff8a00 : 0x3a1a0a, [0, -0.004, 0])); for (let i = 0; i < 4; i++) p.push(part(box(0.014, 0.014, 0.014), 0xf0faff, [Math.cos(i * 1.6) * 0.014, 0.03, Math.sin(i * 1.6) * 0.014], [i, i * 2, 0]));
    p.push(part(cyl(0.003, 0.003, 0.12, 6), v ? 0x2a8aff : 0xff3a3a, [0.012, 0.04, 0], [0, 0, -0.2])); }
  return merge(p);
}
function sodagunGeo() {           // the bar's soft-drink gun: buttons on top, the nozzle, the hose
  const p = [part(box(0.035, 0.05, 0.03), 0x1a1a1a, [0, 0.0, 0]), part(cyl(0.012, 0.009, 0.03, 10), 0x222222, [0, -0.035, 0.01])];
  [[0xc8102e, -0.01], [0xff8a00, 0.0], [0x7cc84a, 0.01]].forEach(([c, x]) => p.push(part(cyl(0.004, 0.004, 0.004, 8), c, [x, 0.026, 0])));
  p.push(part(cyl(0.009, 0.009, 0.06, 8), 0x333333, [0, 0.045, -0.012], [0.5, 0, 0]));                // the hose going off
  return merge(p);
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


// ---------- the Lidl bakery ----------
const GOLD = 0xd99a3a, DGOLD = 0xb8742a, PALE = 0xf0c878;
function croissantGeo() {
  // a crescent of rolled pastry: a thick bent body with rolled ridges across it, tapering points
  const p = [];
  const body = new THREE.TorusGeometry(0.035, 0.019, 10, 18, Math.PI * 1.15); body.rotateX(Math.PI / 2); body.rotateY(Math.PI * 0.07 + Math.PI);
  p.push(part(body, GOLD, [0, 0, 0.012], [0, 0, 0], [1, 0.75, 1]));
  for (let i = 0; i < 7; i++) { const a = Math.PI * (0.62 + i * 0.13) + Math.PI, r = 0.019 * (1 - Math.abs(i - 3) * 0.17);
    const ring = new THREE.TorusGeometry(r, 0.0045, 6, 12); ring.rotateY(-a);
    p.push(part(ring, i % 2 ? DGOLD : GOLD, [Math.cos(a) * 0.035, 0, Math.sin(a) * -0.035 + 0.012], [0, 0, 0], [1, 0.8, 1])); }
  for (const s of [-1, 1]) p.push(part(new THREE.ConeGeometry(0.012, 0.03, 8), DGOLD, [s * 0.04, 0, 0.03], [Math.PI / 2, 0, -s * 0.9]));
  return merge(p);
}
function baguetteGeo() {
  const g = new THREE.CapsuleGeometry(0.024, 0.26, 6, 12); g.rotateZ(Math.PI / 2);
  const p = [part(g, 0xc98a3c, [0, 0, 0], [0, 0, 0], [1, 0.8, 1.05])];
  for (let i = 0; i < 5; i++) p.push(part(new THREE.CapsuleGeometry(0.006, 0.035, 3, 6), 0xf0d090, [-0.11 + i * 0.055, 0.018, 0], [0, 0.5, Math.PI / 2], [1, 0.5, 1]));   // the slashes
  for (let i = 0; i < 18; i++) p.push(part(new THREE.IcosahedronGeometry(0.0025, 0), 0xf6efe0, [-0.14 + Math.random() * 0.28, 0.019, (Math.random() - 0.5) * 0.03]));     // flour
  return merge(p);
}
function muffinGeo() {
  const cup = new THREE.LatheGeometry([[0.024, -0.03], [0.03, 0.01], [0.031, 0.012]].map(([x, y]) => new THREE.Vector2(x, y)), 16);
  const p = [part(cup, 0xf2f0ea)];
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; p.push(part(new THREE.BoxGeometry(0.002, 0.04, 0.004), 0xd8d4c8, [Math.cos(a) * 0.028, -0.01, Math.sin(a) * 0.028], [0, -a, 0.08])); }   // paper pleats
  p.push(part(new THREE.SphereGeometry(0.037, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x5a2e14, [0, 0.008, 0], [0, 0, 0], [1, 0.85, 1]));                                                  // domed top
  for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 0.006 + (i % 4) * 0.008; p.push(part(new THREE.IcosahedronGeometry(0.0045, 0), 0x2a140a, [Math.cos(a) * r, 0.008 + Math.sqrt(Math.max(0, 0.037 * 0.037 - r * r)) * 0.85, Math.sin(a) * r])); }
  return merge(p);
}
function painchocGeo() {
  const p = [];
  for (let i = 0; i < 3; i++) { const g = new THREE.CapsuleGeometry(0.018 - i * 0.002, 0.07, 4, 10); g.rotateZ(Math.PI / 2); p.push(part(g, i % 2 ? GOLD : DGOLD, [0, -0.008 + i * 0.012, 0], [0, 0, 0], [1, 0.55, 1.6 - i * 0.25])); }   // laminated layers
  for (const s of [-1, 1]) p.push(part(new THREE.BoxGeometry(0.008, 0.012, 0.022), 0x3a1a0a, [s * 0.052, 0.0, 0]));        // chocolate poking out the ends
  return merge(p);
}
function swirlGeo() {
  const p = [part(cyl(0.045, 0.047, 0.022, 20), GOLD)];
  for (let i = 0; i < 4; i++) p.push(part(new THREE.TorusGeometry(0.01 + i * 0.011, 0.004, 5, 20), 0x7a4018, [0, 0.011, 0], [Math.PI / 2, 0, 0]));   // the cinnamon spiral
  for (let i = 0; i < 6; i++) p.push(part(new THREE.CapsuleGeometry(0.0025, 0.07, 2, 4), 0xffffff, [0, 0.014, -0.03 + i * 0.012], [0, 0.3 * (i % 2 ? 1 : -1), Math.PI / 2]));   // icing drizzle
  return merge(p);
}
function icedbunGeo() {
  const g = new THREE.CapsuleGeometry(0.026, 0.08, 4, 12); g.rotateZ(Math.PI / 2);
  const ice = new THREE.CapsuleGeometry(0.022, 0.078, 4, 12); ice.rotateZ(Math.PI / 2);
  return merge([part(g, PALE, [0, 0, 0], [0, 0, 0], [1, 0.8, 1]), part(ice, 0xfff8f0, [0, 0.009, 0], [0, 0, 0], [1, 0.6, 1.02]), part(sph(0.006, 8, 6), 0xd32f2f, [0, 0.026, 0])]);
}
function pretzelGeo() {
  const p = [];
  const loop = (cx, a0) => { const t = new THREE.TorusGeometry(0.022, 0.008, 6, 14, Math.PI * 1.6); t.rotateX(Math.PI / 2); t.rotateY(a0); return part(t, 0x8a4a1a, [cx, 0, 0]); };
  p.push(loop(-0.018, 0.3), loop(0.018, Math.PI - 0.3 + Math.PI * 0.4));
  const cross = new THREE.CapsuleGeometry(0.008, 0.05, 3, 6); cross.rotateZ(Math.PI / 2);
  p.push(part(cross, 0x8a4a1a, [0, 0.004, 0.012], [0, 0.6, 0]), part(cross.clone(), 0x8a4a1a, [0, 0.004, 0.012], [0, -0.6, 0]));
  for (let i = 0; i < 14; i++) p.push(part(new THREE.IcosahedronGeometry(0.002, 0), 0xffffff, [(Math.random() - 0.5) * 0.08, 0.009, (Math.random() - 0.5) * 0.05]));   // salt
  return merge(p);
}
// ---------- a magazine (printed cover) and a Lidl bag ----------
const MAG_COVERS = [['HEAT', '#e53935'], ['GOSSIP!', '#ec407a'], ['TOTAL FOOTY', '#1e88e5'], ['CAKE WEEKLY', '#fdd835'], ['GAMER', '#111111'], ['CHAT', '#8e24aa'], ['TV TIMES', '#ff7043'], ['PIE MONTHLY', '#43a047']];
let magMats = null;
export function magazineCoverTex([title, bg]) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 168; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 128, 168);
  g.fillStyle = bg === '#fdd835' ? '#111' : '#fff'; g.font = '900 20px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.fillText(title, 64, 26, 120);
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(16, 36, 96, 96);
  g.fillStyle = '#f0c8a0'; g.beginPath(); g.arc(64, 78, 24, 0, 7); g.fill(); g.fillStyle = '#5a3a20'; g.fillRect(40, 54, 48, 12);   // a celebrity
  g.fillStyle = '#2a4a8a'; g.fillRect(36, 104, 56, 28);
  g.fillStyle = '#ffd400'; g.font = '900 12px Arial'; g.fillText('RONNIE: "I ATE IT ALL"', 64, 148, 120); g.fillStyle = '#fff'; g.font = '700 10px Arial'; g.fillText('£2.50', 110, 162);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const MAG_GEO = (() => { const g = new THREE.BoxGeometry(0.17, 0.006, 0.22); return g; })();
export function magazineParts(v) {
  if (!magMats) { const pages = new THREE.MeshLambertMaterial({ color: 0xf4f2ec }); magMats = MAG_COVERS.map(c => { const cov = new THREE.MeshLambertMaterial({ map: magazineCoverTex(c) }); return [pages, pages, cov, pages, pages, pages]; }); }
  return [[MAG_GEO, magMats[v % magMats.length]]];
}
let bagCache = null;
export function bagParts() {
  if (!bagCache) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#1e4ea8'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#ffd400'; g.fillRect(0, 210, 256, 46);
    g.fillStyle = '#ffd400'; g.beginPath(); g.arc(128, 110, 80, 0, 7); g.fill(); g.strokeStyle = '#e53935'; g.lineWidth = 8; g.beginPath(); g.arc(128, 110, 72, 0, 7); g.stroke();
    g.fillStyle = '#e53935'; g.font = '900 60px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Lidl', 128, 114);
    g.fillStyle = '#1e4ea8'; g.font = '900 22px Arial'; g.fillText('BAG FOR LIFE', 128, 233);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    // a bag that's a bit wider at the bottom, with gussets, a folded top hem and two handles
    const body = new THREE.BoxGeometry(0.3, 0.32, 0.14, 4, 6, 2), pa = body.attributes.position;
    for (let i = 0; i < pa.count; i++) { const y = pa.getY(i), k = 1 - (y + 0.16) / 0.32 * 0.12; pa.setX(i, pa.getX(i) * k); pa.setZ(i, pa.getZ(i) * (1 - 0.15 * Math.pow(Math.abs(pa.getX(i)) / 0.15, 2))); }
    body.computeVertexNormals();
    const side = new THREE.MeshLambertMaterial({ color: 0x1e4ea8 }), face = new THREE.MeshLambertMaterial({ map: t });
    const hem = new THREE.BoxGeometry(0.27, 0.025, 0.13); hem.translate(0, 0.165, 0);
    const handle = merge([part(new THREE.TorusGeometry(0.07, 0.008, 6, 14, Math.PI), 0xffd400, [0, 0.17, 0.035]), part(new THREE.TorusGeometry(0.07, 0.008, 6, 14, Math.PI), 0xffd400, [0, 0.17, -0.035])]);
    bagCache = [[body, [side, side, side, side, face, face]], [hem, new THREE.MeshLambertMaterial({ color: 0x173f8a })], [handle, vcLambert]];
  }
  return bagCache;
}

// ---------- the pub's loose things ----------
// back-bar bottles: vodka, whisky, gin, rum, red wine, white wine (stand on y = -0.12, like the lager)
const SPIRITS = [[0xdfeef2, 0xf4f4f4, 0xc0c0c0], [0xb8741a, 0xf4e6c8, 0x2a1a0a], [0x2e7d4a, 0xe8f0e8, 0xd4af37], [0x3a1a0a, 0xf2d24a, 0x1a1a1a], [0x3a0a14, 0xf4ecd8, 0x7a1a24], [0xc8d898, 0xf4ecd8, 0xd4af37]];
const spiritGeos = [];
function spiritGeo(v) {
  if (spiritGeos[v]) return spiritGeos[v];
  const [glass, label, cap] = SPIRITS[v % SPIRITS.length], wine = v >= 4, p = [];
  if (wine) { p.push(part(cyl(0.036, 0.036, 0.19, 14), glass, [0, -0.025, 0])); p.push(part(cyl(0.013, 0.036, 0.05, 14), glass, [0, 0.095, 0])); p.push(part(cyl(0.013, 0.013, 0.08, 10), glass, [0, 0.16, 0])); p.push(part(cyl(0.015, 0.015, 0.04, 10), cap, [0, 0.19, 0])); p.push(part(cyl(0.037, 0.037, 0.08, 14), label, [0, -0.04, 0])); }
  else { p.push(part(box(0.075, 0.18, 0.05), glass, [0, -0.03, 0])); p.push(part(cyl(0.014, 0.03, 0.04, 10), glass, [0, 0.08, 0])); p.push(part(cyl(0.013, 0.013, 0.05, 10), glass, [0, 0.12, 0])); p.push(part(cyl(0.016, 0.016, 0.03, 10), cap, [0, 0.155, 0])); p.push(part(box(0.077, 0.08, 0.052), label, [0, -0.04, 0])); p.push(part(box(0.06, 0.012, 0.053), cap, [0, 0.01, 0])); }
  return (spiritGeos[v] = merge(p));
}
// condiments: ketchup, brown sauce, malt vinegar, salt, pepper (stand on y = -0.035)
const condGeos = [];
function condimentGeo(v) {
  if (condGeos[v]) return condGeos[v];
  const p = [];
  if (v === 0 || v === 1) { const c = v ? 0x5a2a14 : 0xc8102e; p.push(part(cyl(0.028, 0.03, 0.13, 12), c, [0, 0.03, 0])); p.push(part(cyl(0.029, 0.029, 0.06, 12), v ? 0xd4af37 : 0xf4f4f0, [0, 0.03, 0])); p.push(part(cyl(0.012, 0.022, 0.03, 10), c, [0, 0.11, 0])); p.push(part(cyl(0.014, 0.014, 0.02, 8), 0xf4f4f0, [0, 0.13, 0])); }
  else if (v === 2) { p.push(part(cyl(0.024, 0.026, 0.12, 12), 0x6a3a14, [0, 0.025, 0])); p.push(part(cyl(0.025, 0.025, 0.05, 12), 0xf0e0b0, [0, 0.02, 0])); p.push(part(cyl(0.01, 0.018, 0.03, 8), 0x6a3a14, [0, 0.1, 0])); p.push(part(cyl(0.011, 0.011, 0.02, 8), 0x222222, [0, 0.12, 0])); }
  else { const c = v === 3 ? 0xf4f4f4 : 0x3a3a3a; p.push(part(cyl(0.016, 0.018, 0.075, 10), 0xdfeff2, [0, 0.0, 0])); p.push(part(cyl(0.015, 0.015, 0.05, 10), c, [0, -0.008, 0])); p.push(part(cyl(0.017, 0.017, 0.02, 10), 0xc0c4c8, [0, 0.045, 0])); }
  return (condGeos[v] = merge(p));
}
// beer mats: square coasters in the brewery colours (lie flat, centred)
const MATC = [[0xc8202a, 0xffffff], [0x1e6a32, 0xffffff], [0x1f4fbf, 0xffd400], [0x111111, 0xd4af37], [0xf2e8d0, 0x7a1f24], [0xffd400, 0xc8202a]];
const matGeos = [];
function beermatGeo(v) {
  if (matGeos[v]) return matGeos[v];
  const [a, b] = MATC[v % MATC.length];
  return (matGeos[v] = merge([part(box(0.095, 0.003, 0.095), a), part(box(0.075, 0.002, 0.075), b, [0, 0.0015, 0]), part(box(0.06, 0.0025, 0.06), a, [0, 0.002, 0]), part(cyl(0.012, 0.012, 0.003, 10), b, [0, 0.0025, 0])]));
}
// the pub's honey-pine wheelback chair (stands on y = -0.3: the item is a 0.3 ball for physics), facing -z
const PINEC = [0xd49a52, 0xcc9048, 0xd8a25c];
const chairGeos = [];
function chairGeo(v) {
  if (chairGeos[v]) return chairGeos[v];
  const C = PINEC[v % 3], D = 0xb07a38, y0 = -0.3, p = [];
  p.push(part(box(0.44, 0.045, 0.42), C, [0, y0 + 0.455, -0.01])); p.push(part(box(0.36, 0.01, 0.3), D, [0, y0 + 0.476, 0]));
  for (const sx of [-1, 1]) { p.push(part(cyl(0.018, 0.022, 0.46, 8), C, [sx * 0.18, y0 + 0.23, -0.17])); p.push(part(cyl(0.019, 0.023, 0.98, 8), C, [sx * 0.18, y0 + 0.49, 0.17 + 0.03], [0.06, 0, 0])); p.push(part(cyl(0.011, 0.011, 0.34, 6), C, [sx * 0.18, y0 + 0.16, 0], [Math.PI / 2, 0, 0])); }
  p.push(part(cyl(0.011, 0.011, 0.36, 6), C, [0, y0 + 0.16, 0], [0, 0, Math.PI / 2])); p.push(part(cyl(0.01, 0.01, 0.36, 6), C, [0, y0 + 0.26, -0.17], [0, 0, Math.PI / 2]));
  p.push(part(box(0.44, 0.1, 0.03), C, [0, y0 + 0.93, 0.255], [0.1, 0, 0])); p.push(part(box(0.4, 0.035, 0.022), C, [0, y0 + 0.66, 0.22], [0.1, 0, 0]));
  for (const t of [-0.15, -0.075, 0, 0.075, 0.15]) p.push(part(cyl(0.007, 0.0105, 0.28, 6), C, [t, y0 + 0.8, 0.235], [0.1, 0, 0]));
  return (chairGeos[v] = merge(p));
}

const geoCache = {};
function meshFor(type, v = 0) {
  if (type === 'can') return canMeshes();
  if (type === 'magazine' || type === 'lidlbag') { const g = new THREE.Group(); for (const [geo, mat] of (type === 'magazine' ? magazineParts(v) : bagParts())) g.add(new THREE.Mesh(geo, mat)); return g; }
  if (type === 'bat') return batMesh();
  if (type === 'spirit') return new THREE.Mesh(spiritGeo(v), vcLambert);
  if (type === 'condiment') return new THREE.Mesh(condimentGeo(v), vcLambert);
  if (type === 'beermat') return new THREE.Mesh(beermatGeo(v), vcLambert);
  if (type === 'chair') return new THREE.Mesh(chairGeo(v), vcLambert);
  if (type === 'wine' || type === 'soft') { const k = type + v; if (!geoCache[k]) geoCache[k] = type === 'wine' ? wineGeo(v) : cupGeo(v); return new THREE.Mesh(geoCache[k], vcLambert); }
  if (type === 'mug' || type === 'coffee') { if (!geoCache[type]) geoCache[type] = mugGeo(type === 'coffee'); return new THREE.Mesh(geoCache[type], vcLambert); }
  if (type === 'cup') { if (!geoCache.cup) geoCache.cup = cupGeo(-1); return new THREE.Mesh(geoCache.cup, vcLambert); }
  if (!geoCache[type]) geoCache[type] = { burger: burgerGeo, pizza: pizzaGeo, doughnut: doughnutGeo, broccoli: broccoliGeo, carrot: carrotGeo, celery: celeryGeo, sprout: sproutGeo, pint: pintGeo, shake: shakeGeo, poop: poopGeo,
    hotdog: hotdogGeo, fries: friesGeo, kebab: kebabGeo, chicken: chickenGeo, taco: tacoGeo, crisps: crispsGeo, choc: chocGeo, cookie: cookieGeo, icecream: icecreamGeo, sausageroll: sausageRollGeo,
    croissant: croissantGeo, baguette: baguetteGeo, muffin: muffinGeo, painchoc: painchocGeo, swirl: swirlGeo, icedbun: icedbunGeo, pretzel: pretzelGeo,
    apple: appleGeo, pear: pearGeo, orange: orangeGeo, banana: bananaGeo, tomato: tomatoGeo, cucumber: cucumberGeo, pepper: pepperGeo, cauliflower: cauliflowerGeo, dart: dartGeo, beer: beerGeo, glass: glassGeo, cider: ciderGeo, sodagun: sodagunGeo, ...lowNew }[type]();
  return new THREE.Mesh(geoCache[type], vcLambert);
}

// geometry + material pairs for showing an item without making it a real item (instanced shop displays)
export function itemParts(type, v = 0) {
  if (type === 'magazine') return magazineParts(v);
  if (type === 'lidlbag') return bagParts();
  const m = meshFor(type, v); const out = []; m.traverse(o => { if (o.isMesh) out.push([o.geometry, o.material]); }); return out;
}

// ---------- items ----------
const _v = new THREE.Vector3(), _c = new THREE.Vector3();

// food comes bigger than life (easier to see, grab and throw); drinks and props stay their real size
export const FOOD_BIG = 1.6;
const bigFor = (def) => (def.prop || def.drink || def.poop) ? 1 : FOOD_BIG;
const hiCache = {};
// Every bit of food is one solid piece: anything that isn't touching the rest (a seed floating off the bun, a loose
// crumb, a topping hovering over the cheese) is taken out. Pieces count as touching if they come within 2.5mm of
// a piece that's already part of the food, starting from the biggest.
export const foodStats = {};
function solidOnly(geo, name) {
  const pos = geo.attributes.position, n = pos.count, idx = geo.index ? geo.index.array : null, T = idx ? idx.length / 3 : n / 3;
  const vi = (t, k) => idx ? idx[t * 3 + k] : t * 3 + k;
  // vertices at the same spot are the same vertex; triangles sharing one are the same piece
  const key = new Map(), id = new Int32Array(n); for (let i = 0; i < n; i++) { const k = Math.round(pos.getX(i) * 1e4) + ',' + Math.round(pos.getY(i) * 1e4) + ',' + Math.round(pos.getZ(i) * 1e4); let v = key.get(k); if (v === undefined) { v = key.size; key.set(k, v); } id[i] = v; }
  const par = new Int32Array(key.size).map((_, i) => i), find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  for (let t = 0; t < T; t++) { const a = find(id[vi(t, 0)]), b = find(id[vi(t, 1)]), c = find(id[vi(t, 2)]); par[b] = a; par[find(c)] = a; }
  const comps = new Map(); for (let i = 0; i < n; i++) { const r = find(id[i]); (comps.get(r) || comps.set(r, []).get(r)).push(i); }
  if (comps.size < 2) { foodStats[name] = { pieces: 1, removed: 0, tris: T }; return geo; }
  const list = [...comps.values()].sort((a, b) => b.length - a.length), E = 0.006, cell = (x) => Math.floor(x / E), grid = new Map();
  const addPiece = (vs) => { for (const i of vs) { const k = cell(pos.getX(i)) + ',' + cell(pos.getY(i)) + ',' + cell(pos.getZ(i)); (grid.get(k) || grid.set(k, []).get(k)).push(i); } };
  const touches = (vs) => { for (const i of vs) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), cx = cell(x), cy = cell(y), cz = cell(z);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) { const g = grid.get((cx + a) + ',' + (cy + b) + ',' + (cz + c)); if (g) for (const j of g) if ((pos.getX(j) - x) ** 2 + (pos.getY(j) - y) ** 2 + (pos.getZ(j) - z) ** 2 < E * E) return true; } } return false; };
  const keep = new Set([0]); addPiece(list[0]);
  for (let changed = true; changed;) { changed = false; for (let k = 1; k < list.length; k++) if (!keep.has(k) && touches(list[k])) { keep.add(k); addPiece(list[k]); changed = true; } }
  // anything still loose isn't thrown away: it's moved onto the food (the shortest way) until it touches, so the
  // toppings, seeds and chips all sit on it as one piece
  const keptV = []; for (const k of keep) for (const i of list[k]) keptV.push(i);
  const step = Math.max(1, Math.floor(keptV.length / 3000)); let moved = 0;
  for (let k = 1; k < list.length; k++) {
    if (keep.has(k)) continue; const vs = list[k]; let bd = Infinity, bi = -1, bj = -1;
    for (const i of vs) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); for (let m = 0; m < keptV.length; m += step) { const j = keptV[m], d = (pos.getX(j) - x) ** 2 + (pos.getY(j) - y) ** 2 + (pos.getZ(j) - z) ** 2; if (d < bd) { bd = d; bi = i; bj = j; } } }
    if (bi < 0) continue; const dx = pos.getX(bj) - pos.getX(bi), dy = pos.getY(bj) - pos.getY(bi), dz = pos.getZ(bj) - pos.getZ(bi), L = Math.sqrt(bd), f = L > 0 ? Math.max(0, (L - 0.0008) / L) : 0;
    for (const i of vs) pos.setXYZ(i, pos.getX(i) + dx * f, pos.getY(i) + dy * f, pos.getZ(i) + dz * f);
    keep.add(k); for (const i of vs) keptV.push(i); moved++;
  }
  pos.needsUpdate = true; geo.computeBoundingSphere();
  foodStats[name] = { pieces: list.length, attached: list.length - moved, moved, tris: T };
  return geo;
}
// make every food's shapes now (one kind per call), in quiet moments (main.js), so the first burger of the game doesn't
// stop it while its detailed shape is worked out. Returns false once they're all made.
let warmList = null;
export function warmFood() {
  if (!warmList) warmList = Object.keys(FOODS);
  while (warmList.length) { const type = warmList.shift(); try { sizedMesh(type, 0); return true; } catch (e) {} }
  return false;
}
export const HI_NEAR = 3.2;      // (metres: closer than this you see the detailed fast food)
const sizedMesh = (type, v) => {
  let m = meshFor(type, v);
  if (HI[type]) { const lod = new THREE.LOD(); lod.addLevel(new THREE.Mesh(hiCache[type] || (hiCache[type] = solidOnly(HI[type](), type)), vcLambert), 0); lod.addLevel(m, HI_NEAR); m = lod; }
  const k = bigFor(FOODS[type]); if (k !== 1) m.scale.multiplyScalar(k); return m; };
// THE GLOW round food you can pick up: one soft warm halo per item, gently pulsing. All of them are drawn together, as
// ONE instanced layer of camera-facing squares (it was a sprite per item: 300 food in the shop = 300 separate draws, a
// big cost on a phone or a headset). Same picture, same size, same blending and haze as the sprites were.
const HALO_MAT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,245,190,1)'); r.addColorStop(0.3, 'rgba(255,220,100,0.6)'); r.addColorStop(0.65, 'rgba(255,200,60,0.18)'); r.addColorStop(1, 'rgba(255,200,60,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 });
  // (each square turned to face you, like a sprite: its centre placed by the instance, its size from the instance's scale)
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mvPosition.xy += position.xy * length(instanceMatrix[0].xyz);
    gl_Position = projectionMatrix * mvPosition;`); };
  m.customProgramCacheKey = () => 'halo-billboard';
  return m; })();
export const foodGlow = (t) => { HALO_MAT.opacity = 0.34 + Math.sin(t * 2.6) * 0.12; };
const _bc = new THREE.Vector3(), _bp = new THREE.Vector3();
const HALO_MAX = 2048, _hm = new THREE.Matrix4(), _hp = new THREE.Vector3(), _hq = new THREE.Quaternion(), _hs = new THREE.Vector3();
function haloLayer(scene) {
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), HALO_MAT, HALO_MAX);
  im.count = 0; im.frustumCulled = false; im.renderOrder = 2; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.name = 'food halos'; im.raycast = () => {};      // (never in the way of a pointer)
  scene.add(im); return im;
}
export class Item {
  constructor(type, v = 0) {
    this.type = type;
    this.def = FOODS[type];
    this.variant = v;
    this.obj = new THREE.Group();
    this.obj.add(sizedMesh(type, v));
    this.radius = this.def.radius * bigFor(this.def);
    // food you can pick up glows a little (a soft warm halo round it, gently pulsing) so it stands out
    if (bigFor(this.def) !== 1) this.halo = { visible: true, size: this.radius * 7 };      // (drawn by the manager's halo layer)
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
    this.shelf = false; this.fromClutter = false;
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
  setVariant(v) { if (this.variant === v) return; this.variant = v; const s = this.obj.scale.x; this.obj.clear(); this.obj.add(sizedMesh(this.type, v)); this.obj.scale.setScalar(s); }
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
    this.halos = haloLayer(scene);
    this.batches = new Map();      // food shape -> { im (one instanced draw for every bit of food with that shape), n }
  }
  // EVERY BIT OF FOOD WITH THE SAME SHAPE IN ONE DRAW: it was a draw each (~120 in the pub, ~160 in Lidl, each costing
  // the phone or headset the same however small the food); now it's one per kind of shape (~25-30). Called just before
  // the picture's drawn (scene.onBeforeRender: everything's in its final place by then, for whichever camera's
  // drawing). Each food's own shape stays where it was (the game moves it, holds it, scales it as it's eaten), just
  // not drawn itself. The close-up / far-away detail is picked the same way the LOD did (HI_NEAR from the camera).
  syncDraw(camera) {
    const B = this.batches; for (const b of B.values()) b.n = 0;
    const cam = _bc.setFromMatrixPosition(camera.matrixWorld), zoom = camera.zoom || 1;
    for (const it of this.items) {
      const o = it.obj; if (it.dead || !o.parent) continue;
      let vis = true; for (let q = o; q; q = q.parent) if (!q.visible) { vis = false; break; } if (!vis) continue;
      for (const c of o.children) {
        let m = null;
        if (c.isLOD) { c.autoUpdate = false; const lv = c.levels; c.getWorldPosition(_bp); const d = _bp.distanceTo(cam) / zoom; let pick = lv[0].object;
          for (const l of lv) { if (d >= l.distance) pick = l.object; } for (const l of lv) l.object.visible = false; m = pick; }
        else if (c.isMesh && !c.isInstancedMesh) m = c;
        if (!m || m.material !== vcLambert || !m.geometry) { if (c.isLOD && m) m.visible = true; continue; }      // (any other kind of material: drawn as it was)
        m.visible = false; m.updateWorldMatrix(true, false);
        let b = B.get(m.geometry); if (!b) B.set(m.geometry, b = { im: null, n: 0, cap: 0 });
        if (b.n >= b.cap) this.growBatch(b, m.geometry, Math.max(8, b.cap * 2));
        b.im.setMatrixAt(b.n++, m.matrixWorld);
      }
    }
    for (const b of B.values()) { if (!b.im) continue; b.im.count = b.n; b.im.visible = b.n > 0; if (b.n) b.im.instanceMatrix.needsUpdate = true; }
  }
  growBatch(b, geo, cap) {
    const im = new THREE.InstancedMesh(geo, vcLambert, cap); im.frustumCulled = false; im.raycast = () => {}; im.name = 'food batch'; im.count = 0;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (b.im) { im.instanceMatrix.array.set(b.im.instanceMatrix.array.subarray(0, b.n * 16)); this.scene.remove(b.im); b.im.dispose(); }
    b.im = im; b.cap = cap; this.scene.add(im);
  }
  // every glowing item's halo, where it is right now (hidden while it's held, finished, or not in the world)
  updateHalos() {
    const im = this.halos; if (!im.parent) this.scene.add(im); let n = 0;
    for (const it of this.items) { const h = it.halo; if (!h || it.dead || !h.visible || !it.obj.visible || !it.obj.parent || n >= HALO_MAX) continue;
      let o = it.obj, vis = true; while (o) { if (!o.visible) { vis = false; break; } o = o.parent; } if (!vis) continue;
      if (it.obj.parent === this.scene) { _hp.copy(it.obj.position); _hs.setScalar(h.size * it.obj.scale.x); }
      else { it.obj.updateWorldMatrix(true, false); it.obj.matrixWorld.decompose(_hp, _hq, _hs); _hs.setScalar(h.size * _hs.x); }
      _hm.compose(_hp, _hq.identity(), _hs); im.setMatrixAt(n++, _hm); }
    im.count = n; if (n) im.instanceMatrix.needsUpdate = true;
  }

  spawn(type, pos, vel = null, v = null) {
    if (this.drinksOnly && FOODS[type] && !FOODS[type].drink && !FOODS[type].prop) type = 'beer';      // (Run the Pub: anything that would turn up is a drink)
    const pool = this.pool[type] || (this.pool[type] = []);
    const it = pool.pop() || new Item(type, v ?? 0);
    if (v !== null && v !== undefined) it.setVariant(v);
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

  // a free place for new food: never on top of another bit of food (they used to pile up on each other), and never
  // right next to a player (it looked like eating made more appear in front of you). If every spot is taken, the
  // emptiest one.
  freeSpawn() {
    const sp = this.room.spawns, avoid = this.avoid ? this.avoid() : [], GAP = 0.3 * 0.3;
    const room = (p) => { let m = 1e9; for (const it of this.items) { if (it.dead || it.heldBy) continue; const d = it.pos.distanceToSquared(p); if (d < m) m = d; } return m; };
    let best = sp[0], bd = -1;
    for (let tries = 0; tries < 60; tries++) {
      const p = sp[Math.floor(Math.random() * sp.length)];
      if (tries < 45 && avoid.some(a => Math.hypot(a.x - p.x, a.z - p.z) < 4)) continue;
      const d = room(p); if (d > GAP) return p; if (d > bd) { bd = d; best = p; }
    }
    return best;
  }
  // more places for food: next to every spot the level gives, wherever the same flat surface carries on (a table,
  // a counter, a bench) and nothing solid's in the way. Uses the level's collision boxes, so it's quick.
  densify() {
    const sp = this.room.spawns, cols = this.room.colliders || []; if (!sp.length || !cols.length) return 0;
    const surfaceAt = (x, z, y, inset = 0.07) => { let top = null;
      for (const b of cols) { if (x < b.min.x + inset || x > b.max.x - inset || z < b.min.z + inset || z > b.max.z - inset) continue; const t = b.max.y; if (t > y - 0.3 && t < y + 0.01 && (top === null || t > top)) top = t; }
      return top; };
    const blocked = (p, c, s0) => cols.some(b => b.max.y > s0 + 0.03 && b.min.y < s0 + 0.2 && Math.max(p.x, c.x) > b.min.x - 0.09 && Math.min(p.x, c.x) < b.max.x + 0.09 && Math.max(p.z, c.z) > b.min.z - 0.09 && Math.min(p.z, c.z) < b.max.z + 0.09);
    const all = sp.slice(), added = [], N = 6;
    for (const p of sp) {
      const s0 = surfaceAt(p.x, p.z, p.y, 0); if (s0 === null) continue;
      for (let k = 0; k < N; k++) { const a = k / N * Math.PI * 2 + 0.4, c = new THREE.Vector3(p.x + Math.cos(a) * 0.32, p.y, p.z + Math.sin(a) * 0.32);
        if (all.some(q => Math.abs(q.y - c.y) < 0.3 && (q.x - c.x) ** 2 + (q.z - c.z) ** 2 < 0.28 * 0.28)) continue;
        const s1 = surfaceAt(c.x, c.z, p.y); if (s1 === null || Math.abs(s1 - s0) > 0.02 || blocked(p, c, s0)) continue;
        added.push(c); all.push(c); }
    }
    sp.push(...added); return added.length;
  }
  nearest(point, radius, filter = null) {
    if (this.room.clutter && !this.drinksOnly) this.room.clutter.wakeNear(this, point, radius + 0.05);
    if (this.room.dormant && !this.drinksOnly) this.room.dormant.wakeNear(this, point, radius + 0.05);       // shop displays: bakery, magazines, bags     // cans, bottles, crisps and pizza lying about can be picked up
    let best = null, bd = radius * radius;
    for (const it of this.items) {
      if (it.dead || (filter && !filter(it))) continue;
      const d = it.pos.distanceToSquared(point) - it.radius * it.radius;
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }

  update(dt) { this.update1(dt); this.updateHalos(); }
  update1(dt) {
    if (this.clientMode) { for (const it of this.items) { it.age += dt; if (it.spawnScale < 1) { it.spawnScale = Math.min(1, it.spawnScale + dt * 4); } if (it.obj.scale.x < 0.05 && !it.heldBy) it.obj.scale.setScalar(Math.max(0.05, it.spawnScale) * (0.55 + 0.45 * it.eatFraction)); if (it.netMirror && !it.heldBy) it.prev.copy(it.pos); else if (!it.netMirror) {} } this.items.filter(it => !it.netMirror && !it.heldBy).forEach(() => {}); }
    // big places never run dry: top up with random junk food every so often
    if (!this.clientMode && this.minFood && (this.topUpT = (this.topUpT || 0) - dt) <= 0) {
      this.topUpT = this.topUpEvery || 1.0;
      let food = this.respawnQueue.length;
      for (const it of this.items) if (!it.def.veg && !it.def.prop && !it.temp && !it.empty && !it.incoming) food++;
      // (far short, e.g. straight after Run the Pub, which only has drinks: fill back up within a couple of seconds, a few
      // a frame, instead of one a second, which left the next game nearly empty of food for minutes)
      const n = food < this.minFood * 0.9 ? Math.min(4, this.minFood - food) : food < this.minFood ? 1 : 0; if (n > 1) this.topUpT = 0.05;
      for (let k = 0; k < n; k++) { const veg = this.vegShare && Math.random() < this.vegShare; const it = this.spawn(veg ? ['apple', 'banana', 'orange', 'broccoli', 'carrot', 'pear', 'tomato'][Math.floor(Math.random() * 7)] : pickJunk(), this.freeSpawn()); if (veg) it.shelf = true; }
    }
    for (const it of this.items) if (it.halo) it.halo.visible = !it.heldBy && !it.empty;
    for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
      const r = this.respawnQueue[i];
      r.t -= dt;
      if (r.t <= 0 && this.clientMode) { this.respawnQueue.splice(i, 1); continue; }
      if (r.t <= 0) { this.respawnQueue.splice(i, 1); this.spawn(r.type, this.freeSpawn()); this.onSpawn && this.onSpawn(r.type); }
    }
    const b = this.room.bounds, g = TUNING.gravity;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.age += dt;
      if (it.spawnScale < 1) { it.spawnScale = Math.min(1, it.spawnScale + dt * 4); it.obj.scale.setScalar(easeOutBack(it.spawnScale) * (0.55 + 0.45 * it.eatFraction)); }
      else if (it.obj.scale.x < 0.05 && !it.heldBy) it.obj.scale.setScalar(0.55 + 0.45 * it.eatFraction);      // (put out full-size straight away, e.g. the glasses behind the bar: they were left tiny, so invisible)
      if (it.heldBy) { it.resting = false; it.restTime = 0; continue; }
      if ((it.netMirror && !it.ownedHere) || it.remoteOwner) continue;      // (multiplayer: whoever owns it moves it: the host, or whoever grabbed it last)
      if (it.resting) {
        it.restTime += dt;
        if ((it.def.veg || it.empty || it.temp) && it.restTime > 6 && !it.shelf) this.remove(it);
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
      // tellies: anything thrown hard at the screen smashes it
      if (this.room.tvs && it.vel.lengthSq() > 6) for (const tv of this.room.tvs) { if (tv.broken) continue;
        const d0 = _v.subVectors(it.prev, tv.c).dot(tv.n), d1 = _c.subVectors(it.pos, tv.c).dot(tv.n);
        if (d0 > -0.02 && d1 < it.radius + 0.02 && d0 - d1 > 1e-4) {
          const k = THREE.MathUtils.clamp((d0 - it.radius) / (d0 - d1), 0, 1), hp = it.prev.clone().lerp(it.pos, k), off = hp.clone().sub(tv.c);
          const u = off.dot(tv.u), w = off.y;
          if (Math.abs(u) < tv.w / 2 + it.radius && Math.abs(w) < tv.h / 2 + it.radius) {
            tv.broken = true; this.onTvSmash && this.onTvSmash(tv, hp, u / tv.w + 0.5, w / tv.h + 0.5);
            it.pos.copy(hp).addScaledVector(tv.n, it.radius + 0.01); const vn = it.vel.dot(tv.n); it.vel.addScaledVector(tv.n, -vn * 1.4).multiplyScalar(0.4); } } }
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
  else if (it.def.mag) { r.x = 0; r.z = 0; }
  else if (it.def.bat) { r.x = -Math.PI / 2; r.z = 0; }
  else if (it.def.flat) { r.x = 0; r.z = 0; }
  else { r.x = 0; r.z = 0; }
}

function easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
