// Detailed fast food: what you see up close (within a few metres; further away the simple versions in foods.js are
// drawn instead, so the Quest keeps its frame rate). Every model is built from shaped pieces with lumpy surfaces,
// toasting and char painted into the vertex colours, and the little things that make food look real: sesame seeds,
// grill marks, melted cheese drooping over the edge, sauce drizzles, sprinkles, crumbs.
// Each one keeps the size and orientation of the simple version (so it sits in the hand the same way).
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { part, merge, cyl, sph, box } from './geo.js';

// ---------------------------------------------------------------- helpers
let SEED = 1;
const rnd = () => { SEED = (SEED * 16807) % 2147483647; return (SEED - 1) / 2147483646; };
const rr = (a, b) => a + rnd() * (b - a);
// smooth-ish 3D noise from sines (same position -> same value, so shared vertices stay joined)
const noise = (x, y, z, f = 60) => (Math.sin(x * f * 1.3 + y * f * 0.7) * Math.sin(y * f * 1.1 - z * f * 0.9) + Math.sin(z * f * 1.7 + x * f * 0.5) * 0.6) * 0.5;
// push vertices in/out (from a centre point) by noise: lumpy, bumpy, crispy surfaces
function lumpy(geo, amp, f = 60, c = new THREE.Vector3(), mask = null) {
  let g = geo.index ? geo : mergeVertices(geo.deleteAttribute('normal') && geo || geo);
  const p = g.attributes.position, v = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = mask ? mask(v) : 1; if (!k) continue; d.copy(v).sub(c); const L = d.length() || 1; v.addScaledVector(d.divideScalar(L), noise(v.x, v.y, v.z, f) * amp * k); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
// paint a piece: colour per vertex from its position (toasted edges, grill marks, speckles)
function paint(g, fn) {
  const p = g.attributes.position, c = g.attributes.color, v = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); col.setRGB(c.getX(i), c.getY(i), c.getZ(i)); fn(col, v); c.setXYZ(i, col.r, col.g, col.b); }
  return g;
}
const darken = (col, k) => col.multiplyScalar(Math.max(0, 1 - k));
const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
// a tube along a list of points (sauce drizzles, bacon, cheese strings)
const tube = (pts, r, seg = 24, rs = 6) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg, r, rs, false);
const S = (seed) => { SEED = seed; };
// an open surface (a taco shell, a paper wrapper) seen from both sides: the same piece again, facing the other way
function twoSided(g) { const b = g.clone(); const idx = b.index; if (idx) { const a = idx.array; for (let i = 0; i < a.length; i += 3) { const t = a[i]; a[i] = a[i + 2]; a[i + 2] = t; } } b.computeVertexNormals(); g.computeVertexNormals(); return [g, b]; }
const parts2 = (g, color, pos, rot, scl, fn) => twoSided(g).map((x, i) => { const q = part(x, color, pos, rot, scl); return fn ? paint(q, (c, v) => fn(c, v, i)) : q; });

// ---------------------------------------------------------------- BURGER
export function burgerHi() {
  S(11); const p = [];
  // bottom bun: flat underside, rounded edge, toasted cut face on top
  p.push(paint(part(lathe([[0, -0.046], [0.052, -0.046], [0.06, -0.042], [0.064, -0.034], [0.062, -0.024], [0.058, -0.021], [0, -0.021]]), 0xd99447), (c, v) => { if (v.y > -0.023) darken(c, 0.25); darken(c, noise(v.x, v.y, v.z, 120) * 0.08); }));
  // patty: thick, lumpy, charred top/bottom with grill marks
  const patty = lumpy(new THREE.CylinderGeometry(0.066, 0.067, 0.02, 40, 3), 0.0022, 140);
  p.push(paint(part(patty, 0x5a2e14, [0, -0.011, 0]), (c, v) => { darken(c, 0.15 * (0.5 + noise(v.x, v.y, v.z, 200))); if (Math.abs(v.y + 0.011) > 0.008 && Math.abs(Math.sin((v.x + v.z) * 120)) > 0.85) darken(c, 0.55); }));
  // melted cheese: a square slice with its corners drooping over the patty
  const ch = new THREE.PlaneGeometry(0.115, 0.115, 16, 16); ch.rotateX(-Math.PI / 2); ch.rotateY(0.5);
  { const pp = ch.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), z = pp.getZ(i), r = Math.hypot(x, z); pp.setY(i, r > 0.058 ? -(r - 0.058) * 1.1 - Math.pow(Math.max(0, r - 0.06), 2) * 30 : 0); } ch.computeVertexNormals(); }
  p.push(paint(part(ch, 0xffb81a, [0, 0.0005, 0]), (c, v) => darken(c, -0.05 + noise(v.x, 0, v.z, 90) * 0.06)));
  // tomato slices with seeds
  for (const [x, z] of [[0.018, 0.012], [-0.022, -0.008]]) {
    p.push(part(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 24), 0xd32f2f, [x, 0.0055, z]));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; p.push(part(sph(0.0045, 6, 4), 0xffa07a, [x + Math.cos(a) * 0.015, 0.0088, z + Math.sin(a) * 0.015], [0, a, 0], [1.4, 0.4, 0.8])); }
  }
  // red onion rings, pickles
  for (const [x, z, s] of [[0.0, 0.03, 0.022], [-0.03, 0.02, 0.018]]) p.push(part(new THREE.TorusGeometry(s, 0.0022, 6, 24), 0x9c4a8a, [x, 0.0095, z], [Math.PI / 2, 0, 0]));
  for (const [x, z] of [[0.03, -0.022], [-0.008, -0.03]]) p.push(paint(part(new THREE.CylinderGeometry(0.013, 0.013, 0.003, 16), 0x6b8e23, [x, 0.0105, z]), (c, v) => { if (Math.hypot(v.x - x, v.z - z) < 0.008) c.lerp(new THREE.Color(0xc5d86d), 0.6); }));
  // ruffled lettuce round the edge
  const lt = new THREE.RingGeometry(0.035, 0.074, 64, 3); lt.rotateX(-Math.PI / 2);
  { const pp = lt.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), z = pp.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); pp.setY(i, Math.sin(a * 13) * 0.005 * (r - 0.035) / 0.039 - (r - 0.035) * 0.08); } lt.computeVertexNormals(); }
  p.push(paint(part(lt, 0x5cb83a, [0, 0.013, 0]), (c, v) => { const r = Math.hypot(v.x, v.z); c.lerp(new THREE.Color(0xb5e07a), Math.max(0, (r - 0.05) / 0.03) * 0.6); }));
  // sauce oozing out
  for (let i = 0; i < 5; i++) { const a = i * 1.37 + 0.4; p.push(part(sph(0.006, 8, 6), 0xff5a1f, [Math.cos(a) * 0.066, 0.008 - (i % 2) * 0.004, Math.sin(a) * 0.066], [0, 0, 0], [1.6, 0.8, 1])); }
  // top bun: domed, golden with a darker crown, with sesame seeds
  const top = lumpy(lathe([[0, 0.068], [0.03, 0.065], [0.05, 0.055], [0.062, 0.04], [0.067, 0.026], [0.064, 0.016], [0.0, 0.016]], 40), 0.0012, 80);
  p.push(paint(part(top, 0xe39a45), (c, v) => { darken(c, Math.max(0, (v.y - 0.04) / 0.03) * 0.28); if (v.y < 0.02) c.lerp(new THREE.Color(0xf2d8a0), 0.5); }));
  for (let i = 0; i < 34; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.052, y = 0.016 + 0.052 * Math.sqrt(Math.max(0, 1 - (r / 0.067) ** 2)) * 1.0;
    p.push(part(sph(0.0028, 6, 4), 0xfff2cc, [Math.cos(a) * r, y + 0.0015, Math.sin(a) * r], [rnd(), a, 0], [1.7, 0.55, 1])); }
  return merge(p);
}

// ---------------------------------------------------------------- PIZZA SLICE (tip towards -z, crust along x at +z)
export function pizzaHi() {
  S(21); const p = [];
  const sh = new THREE.Shape(); sh.moveTo(0, -0.092); sh.lineTo(-0.074, 0.064); sh.quadraticCurveTo(0, 0.078, 0.074, 0.064); sh.lineTo(0, -0.092);
  const base = new THREE.ExtrudeGeometry(sh, { depth: 0.007, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 16 });
  base.rotateX(Math.PI / 2);
  p.push(paint(part(base, 0xe8c070, [0, -0.002, 0]), (c, v) => { if (v.y < -0.006) darken(c, 0.25 + noise(v.x, 0, v.z, 160) * 0.1); }));
  // cheese: wavy melted layer with bubbles and browned spots
  const ch = new THREE.ShapeGeometry(sh, 24); ch.rotateX(Math.PI / 2);
  const cg = new THREE.BufferGeometry().copy(ch); { const pp = cg.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), z = pp.getZ(i); pp.setY(i, 0.0035 + Math.max(0, noise(x, 0, z, 110)) * 0.003); } cg.computeVertexNormals(); }
  p.push(paint(part(cg, 0xffcf3a, [0, 0, 0]), (c, v) => { const n = noise(v.x, 0, v.z, 170); if (n > 0.45) darken(c, 0.3); c.lerp(new THREE.Color(0xff9a1a), Math.max(0, -n) * 0.25); }));
  // the puffy crust along the back, browned on top
  const crust = tube([[-0.077, 0.004, 0.064], [-0.04, 0.0065, 0.074], [0, 0.0075, 0.078], [0.04, 0.0065, 0.074], [0.077, 0.004, 0.064]], 0.012, 40, 14);
  p.push(paint(part(lumpy(crust, 0.0012, 110), 0xd9933f), (c, v) => { darken(c, Math.max(0, v.y - 0.008) * 18); darken(c, noise(v.x, v.y, v.z, 220) * 0.08); }));
  // pepperoni: cupped slices with darker crisp rims
  for (const [x, z, s] of [[0, -0.04, 0.014], [-0.026, 0.012, 0.016], [0.028, 0.02, 0.015], [0.002, 0.045, 0.014], [-0.012, -0.012, 0.012]]) {
    const pep = lathe([[0, 0.0], [s * 0.6, 0.0008], [s, 0.0025], [s * 1.02, 0.0035], [0, 0.0012]], 24);
    p.push(paint(part(pep, 0xb3261e, [x, 0.006, z]), (c, v) => { if (Math.hypot(v.x - x, v.z - z) > s * 0.8) darken(c, 0.4); else if (noise(v.x, 0, v.z, 400) > 0.6) c.lerp(new THREE.Color(0xe07060), 0.5); }));
  }
  // basil leaves, olive rings, oregano flecks
  for (const [x, z, a] of [[0.018, -0.015, 0.5], [-0.035, 0.04, 2.1]]) p.push(part(sph(0.009, 10, 6), 0x2e7d32, [x, 0.0085, z], [0, a, 0], [1.6, 0.25, 0.8]));
  for (const [x, z] of [[-0.012, 0.03], [0.04, 0.05], [0.01, -0.06]]) p.push(part(new THREE.TorusGeometry(0.0045, 0.0018, 6, 14), 0x1a1a1a, [x, 0.0075, z], [Math.PI / 2, 0, 0]));
  for (let i = 0; i < 40; i++) { const t = rnd(), w = (rnd() - 0.5) * 2; p.push(part(box(0.0018, 0.0006, 0.0014), 0x3a5a1a, [w * 0.06 * (1 - t) * 0.9 + 0, 0.0075, -0.08 + t * 0.14], [0, rnd() * 3, 0])); }
  // a string of cheese drooping off the tip
  p.push(part(tube([[0, 0.004, -0.086], [0.002, -0.004, -0.094], [0.001, -0.018, -0.097], [0, -0.026, -0.096]], 0.0022, 12, 6), 0xffd34d));
  return merge(p);
}

// ---------------------------------------------------------------- DOUGHNUT (flat, in the x-z plane)
export function doughnutHi() {
  S(31); const p = [];
  const dough = lumpy(new THREE.TorusGeometry(0.04, 0.021, 18, 48), 0.0008, 90); dough.rotateX(Math.PI / 2);
  p.push(paint(part(dough, 0xd9a05b), (c, v) => { const r = Math.hypot(v.x, v.z); if (Math.abs(v.y) < 0.004) c.lerp(new THREE.Color(0xf5d8a0), 0.7); else if (r > 0.055 || r < 0.026) darken(c, 0.1); darken(c, noise(v.x, v.y, v.z, 160) * 0.06); }));
  // icing on the top half, with drips down the outside and inside
  const ic = new THREE.TorusGeometry(0.0402, 0.0222, 16, 64, Math.PI * 2); ic.rotateX(Math.PI / 2);
  { const pp = ic.attributes.position; const keep = []; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i), a = Math.atan2(z, x), drip = 0.004 + Math.max(0, Math.sin(a * 7) * Math.sin(a * 3 + 1)) * 0.009; if (y < -drip + 0.003) pp.setY(i, Math.max(y, -drip + 0.003)); } ic.computeVertexNormals(); }
  p.push(paint(part(ic, 0xff6fae, [0, 0.0012, 0]), (c, v) => { if (v.y > 0.012) c.lerp(new THREE.Color(0xffa8cf), 0.4); }));
  const cols = [0xffffff, 0x3fc1ff, 0xfff04a, 0x7cff6a, 0xff4040, 0xff9a1a, 0xb070ff];
  for (let i = 0; i < 70; i++) { const a = rnd() * Math.PI * 2, r = 0.04 + (rnd() - 0.5) * 0.03, y = 0.021 * Math.sqrt(Math.max(0, 1 - ((r - 0.04) / 0.022) ** 2)) + 0.0035;
    p.push(part(new THREE.CapsuleGeometry(0.0011, 0.0055, 2, 4), cols[i % cols.length], [Math.cos(a) * r, y, Math.sin(a) * r], [Math.PI / 2, rnd() * 6, rnd() * 6])); }
  return merge(p);
}

// ---------------------------------------------------------------- HOT DOG (along x)
export function hotdogHi() {
  S(41); const p = [];
  // a split, toasted bun: two halves either side of the sausage
  for (const sd of [-1, 1]) {
    const half = new THREE.CapsuleGeometry(0.02, 0.115, 6, 16); half.rotateZ(Math.PI / 2);
    p.push(paint(part(lumpy(half, 0.0008, 70), 0xe2a24e, [0, -0.008, sd * 0.012], [0, 0, 0], [1, 0.95, 0.9]), (c, v) => { if (v.y > 0.004 && v.z * sd < 0.012) c.lerp(new THREE.Color(0xf6dfae), 0.6); else darken(c, Math.max(0, v.y + 0.006) * 4); }));
  }
  // the sausage: glossy, ends rounded, grill marks across it
  const dog = new THREE.CapsuleGeometry(0.0135, 0.14, 8, 18); dog.rotateZ(Math.PI / 2);
  p.push(paint(part(dog, 0xa8442a, [0, 0.01, 0]), (c, v) => { if (Math.abs(Math.sin(v.x * 140 + v.z * 40)) > 0.9 && v.y > 0.012) darken(c, 0.55); if (v.y > 0.02) c.lerp(new THREE.Color(0xc86a40), 0.3); }));
  // fried onions, a mustard zig-zag and a line of ketchup
  for (let i = 0; i < 26; i++) p.push(part(tube([[0, 0, 0], [rr(-0.004, 0.004), 0.0015, 0.004], [rr(-0.006, 0.006), 0.0005, 0.009]], 0.0011, 4, 4), 0xc88a3a, [rr(-0.06, 0.06), 0.02 + rr(0, 0.004), rr(-0.008, 0.004)], [0, rnd() * 6, 0]));
  const zig = []; for (let i = 0; i <= 14; i++) zig.push([-0.065 + i * 0.0093, 0.0245 + (i % 2) * 0.0008, (i % 2 ? 0.007 : -0.007)]);
  p.push(part(tube(zig, 0.0019, 80, 6), 0xffcf1a));
  p.push(part(tube([[-0.06, 0.024, 0.0015], [-0.02, 0.0252, -0.001], [0.02, 0.0252, 0.001], [0.06, 0.024, -0.0015]], 0.0016, 30, 6), 0xd42a1e));
  return merge(p);
}

// ---------------------------------------------------------------- CHIPS (a carton of fries, upright)
export function friesHi() {
  S(51); const p = [];
  // the carton: flared, with a scooped front and back, red with a yellow arc
  const cart = new THREE.CylinderGeometry(0.042, 0.031, 0.075, 24, 6, true);
  { const pp = cart.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i); const sq = 0.62; pp.setZ(i, z * sq); if (y > 0.03) pp.setY(i, y + Math.abs(x) * 0.25 - 0.004); } cart.computeVertexNormals(); }
  p.push(paint(part(cart, 0xd32f2f, [0, -0.02, 0]), (c, v) => { const a = Math.atan2(v.x, v.z), dy = v.y + 0.02; if (Math.abs(v.z) > 0.012 && Math.abs((dy - 0.002) - Math.cos(v.x * 30) * 0.008) < 0.0045) c.setHex(0xffcf1a); }));
  p.push(part(new THREE.CylinderGeometry(0.031, 0.031, 0.002, 24), 0xb71c1c, [0, -0.057, 0], [0, 0, 0], [1, 1, 0.62]));
  // ~40 chips, all different: lengths, lean, golden with browned tips, a few sticking right out
  for (let i = 0; i < 42; i++) {
    const L = rr(0.06, 0.1), x = rr(-0.028, 0.028), z = rr(-0.013, 0.013), th = rr(0.0035, 0.0048);
    const f = new THREE.BoxGeometry(th, L, th * 0.9, 1, 4, 1);
    const g = paint(part(f, rnd() < 0.2 ? 0xf0b020 : 0xffd04a, [x, -0.01 + L / 2 - 0.02 + rr(0, 0.02), z], [rr(-0.25, 0.25), rr(0, 3), rr(-0.3, 0.3) + x * 4]), (c, v) => { if (v.y > 0.045) darken(c, (v.y - 0.045) * 6); });
    p.push(g);
  }
  return merge(p);
}

// ---------------------------------------------------------------- DONER KEBAB in pitta, in its paper (upright)
export function kebabHi() {
  S(61); const p = [];
  // the paper wrapper (open top) with a blue stripe, and foil peeking out
  const paper = new THREE.CylinderGeometry(0.041, 0.032, 0.085, 28, 4, true);
  { const pp = paper.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i), a = Math.atan2(z, x); pp.setY(i, y + (y > 0 ? Math.sin(a * 3) * 0.006 : 0)); pp.setZ(i, z * 0.72); } paper.computeVertexNormals(); }
  p.push(...parts2(paper, 0xf5f5f0, [0, -0.032, 0], [0, 0, 0], [1, 1, 1], (c, v) => { if (Math.abs(v.y + 0.012) < 0.005) c.setHex(0x1565c0); if (noise(v.x, v.y, v.z, 200) > 0.7) darken(c, 0.06); }));
  p.push(part(new THREE.CylinderGeometry(0.0415, 0.04, 0.008, 28, 1, true), 0xc8ccd0, [0, -0.074, 0], [0, 0, 0], [1, 1, 0.72]));
  // the pitta: a puffy half-moon pocket, opened at the top
  // the pitta: two curved, toasted sides standing up out of the paper, the filling packed in between
  for (const th of [0, Math.PI]) { const side = lumpy(new THREE.CylinderGeometry(0.05, 0.05, 0.095, 24, 6, true, th - 0.75, 1.5), 0.0012, 90);
    p.push(...parts2(side, 0xf0d8a0, [0, 0.026, 0], [0, 0, 0], [1, 1, 0.42], (c, v, i) => { darken(c, Math.max(0, noise(v.x, v.y, v.z, 120)) * 0.18 + (i ? 0.08 : 0)); if (noise(v.x, v.y, v.z, 300) > 0.72) darken(c, 0.35); if (v.y > 0.068) darken(c, 0.12); })); }
  // the meat: dozens of thin curled shavings, browned edges
  for (let i = 0; i < 46; i++) {
    const a = rr(-1.2, 1.2), w = rr(0.014, 0.026), y = rr(0.03, 0.068), z = rr(-0.012, 0.012), x = rr(-0.026, 0.026);
    const sl = new THREE.PlaneGeometry(w, rr(0.008, 0.014), 4, 2); { const pp = sl.attributes.position; for (let k = 0; k < pp.count; k++) pp.setZ(k, Math.sin(pp.getX(k) / w * 3) * 0.003); sl.computeVertexNormals(); }
    p.push(paint(part(sl, 0x8a4a28, [x, y, z], [rr(-1.2, 1.2), a, rr(-0.6, 0.6)]), (c, v) => { if (noise(v.x, v.y, v.z, 400) > 0.3) darken(c, 0.3); else c.lerp(new THREE.Color(0xb0703c), 0.4); }));
  }
  // salad: shredded lettuce, red cabbage, onion, tomato
  for (let i = 0; i < 30; i++) p.push(part(box(rr(0.012, 0.022), 0.0012, 0.003), [0x7cc84a, 0x9fdc6a, 0x6a2a6e, 0xf2eef0][i % 4], [rr(-0.028, 0.028), rr(0.058, 0.078), rr(-0.012, 0.012)], [rr(0, 3), rr(0, 3), rr(0, 3)]));
  for (let i = 0; i < 5; i++) p.push(part(new THREE.CylinderGeometry(0.008, 0.008, 0.003, 14), 0xd8352a, [rr(-0.022, 0.022), rr(0.064, 0.074), rr(-0.01, 0.01)], [rr(-1, 1), 0, rr(-1, 1)]));
  // chilli sauce and garlic sauce drizzled over the top
  for (const [col, off] of [[0xd8261a, 0], [0xfaf6e8, 0.006]]) { const pts = []; for (let i = 0; i <= 10; i++) pts.push([-0.03 + i * 0.006, 0.077 + Math.sin(i * 1.3 + off * 300) * 0.003, Math.sin(i * 1.9 + off * 500) * 0.009]); p.push(part(tube(pts, 0.0018, 40, 5), col)); }
  return merge(p);
}

// ---------------------------------------------------------------- FRIED CHICKEN drumstick (meat at +z, bone to -z)
export function chickenHi() {
  S(71); const p = [];
  const meat = lumpy(new THREE.SphereGeometry(0.035, 40, 30), 0.0035, 150);
  p.push(paint(part(meat, 0xc7782a, [0, 0, 0.02], [0, 0, 0], [1, 0.85, 1.42]), (c, v) => { const n = noise(v.x, v.y, v.z, 220); if (n > 0.3) darken(c, 0.25); else if (n < -0.4) c.lerp(new THREE.Color(0xe8a050), 0.5); }));
  // crispy bits stuck on
  for (let i = 0; i < 26; i++) { const th = rnd() * Math.PI, ph = rnd() * Math.PI * 2; const v = new THREE.Vector3(Math.sin(th) * Math.cos(ph) * 0.035, Math.cos(th) * 0.03, Math.sin(th) * Math.sin(ph) * 0.048 + 0.02); p.push(part(new THREE.IcosahedronGeometry(rr(0.003, 0.006), 0), rnd() < 0.5 ? 0xa85d1c : 0xd08a3a, [v.x, v.y, v.z])); }
  // the bone, with its knobbly end
  p.push(part(lathe([[0.0075, 0], [0.0068, 0.02], [0.0072, 0.04], [0.0095, 0.055], [0, 0.056]], 14), 0xf3ead8, [0, 0, -0.03], [-Math.PI / 2, 0, 0]));
  p.push(part(sph(0.009, 12, 8), 0xf6efe2, [0.004, 0, -0.084]), part(sph(0.008, 12, 8), 0xf6efe2, [-0.004, 0.001, -0.083]));
  return merge(p);
}

// ---------------------------------------------------------------- TACO (shell open at the top, along x)
export function tacoHi() {
  S(81); const p = [];
  const shell = new THREE.CylinderGeometry(0.046, 0.046, 0.11, 32, 4, true, Math.PI * 1.5 - 1.65, 3.3); shell.rotateZ(Math.PI / 2);
  { const pp = shell.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i); if (y > 0.0) pp.setY(i, y + Math.sin(x * 90) * 0.0025); } shell.computeVertexNormals(); }
  p.push(...parts2(shell, 0xf2c14e, [0, 0.03, 0], [0, 0, 0], [1, 1, 1], (c, v, i) => { if (noise(v.x, v.y, v.z, 260) > 0.5) darken(c, 0.3); if (i) darken(c, 0.08); }));
  // beef mince
  for (let i = 0; i < 60; i++) p.push(part(new THREE.IcosahedronGeometry(rr(0.0035, 0.0065), 0), rnd() < 0.5 ? 0x6a3016 : 0x7a3b1a, [rr(-0.048, 0.048), rr(-0.012, 0.0), rr(-0.01, 0.01)]));
  // shredded lettuce, diced tomato, grated cheese, a dollop of soured cream
  for (let i = 0; i < 34; i++) p.push(part(box(rr(0.012, 0.024), 0.0012, 0.003), rnd() < 0.5 ? 0x7cc84a : 0xa8e070, [rr(-0.048, 0.048), rr(0.002, 0.01), rr(-0.014, 0.014)], [rr(-0.5, 0.5), rr(0, 3), rr(-0.5, 0.5)]));
  for (let i = 0; i < 14; i++) p.push(part(box(0.006, 0.005, 0.006), 0xd8352a, [rr(-0.045, 0.045), rr(0.009, 0.014), rr(-0.01, 0.01)], [rnd(), rnd(), rnd()]));
  for (let i = 0; i < 30; i++) p.push(part(box(0.012, 0.0015, 0.002), 0xffc21a, [rr(-0.045, 0.045), rr(0.012, 0.017), rr(-0.012, 0.012)], [rr(-0.4, 0.4), rr(0, 3), 0]));
  p.push(part(lumpy(sph(0.012, 16, 10), 0.001, 200), 0xfaf8f0, [0.012, 0.018, 0], [0, 0, 0], [1.4, 0.6, 1]));
  return merge(p);
}

// ---------------------------------------------------------------- CRISPS (a pillowy bag, upright)
export function crispsHi() {
  S(91); const p = [];
  const bag = new THREE.BoxGeometry(0.09, 0.11, 0.03, 12, 14, 4);
  { const pp = bag.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i) / 0.045, y = pp.getY(i) / 0.055, z = pp.getZ(i); const puff = (1 - x * x) * (1 - y * y * y * y); pp.setZ(i, z * (0.35 + puff * 1.2) + noise(x, y, z, 6) * 0.001); pp.setX(i, pp.getX(i) * (1 - Math.abs(y) ** 6 * 0.04)); } bag.computeVertexNormals(); }
  p.push(paint(part(bag, 0x1565c0), (c, v) => {
    const fx = v.x, fy = v.y;
    if (Math.hypot(fx, fy + 0.008) < 0.026) c.setHex(0xffd21a);                                  // the big golden crisp picture
    if (Math.hypot(fx, fy + 0.008) < 0.026 && noise(fx, fy, 0, 300) > 0.4) c.setHex(0xe8a818);
    if (fy > 0.03 && fy < 0.044 && Math.abs(fx) < 0.036) c.setHex(0xffffff);                  // the name banner
    if (fy > -0.05 && fy < -0.04 && Math.abs(fx) < 0.03) c.setHex(0xd32f2f);                   // "NEW! EXTRA SALT"
    if (Math.abs(v.z) < 0.004) darken(c, 0.15); }));
  // crimped seals top and bottom
  for (const sy of [-1, 1]) { const g = new THREE.BoxGeometry(0.092, 0.012, 0.004, 24, 1, 1); { const pp = g.attributes.position; for (let i = 0; i < pp.count; i++) pp.setZ(i, pp.getZ(i) + (Math.floor((pp.getX(i) + 0.046) / 0.004) % 2 ? 0.0012 : -0.0012)); }
    p.push(part(g, 0x0d47a1, [0, sy * 0.061, 0])); }
  // a couple of crisps peeking from a split corner
  for (let i = 0; i < 3; i++) { const cr = new THREE.SphereGeometry(0.012, 12, 8, 0, Math.PI * 2, 0, 0.6); p.push(paint(part(lumpy(cr, 0.0006, 300), 0xf2c840, [0.03 + i * 0.006, 0.066, rr(-0.004, 0.004)], [rr(-1, 1), rnd() * 3, rr(-1, 1)]), (c, v) => darken(c, noise(v.x, v.y, v.z, 500) * 0.12))); }
  return merge(p);
}

// ---------------------------------------------------------------- CHOCOLATE BAR (along x), wrapper peeled back
export function chocHi() {
  S(101); const p = [];
  p.push(part(new THREE.BoxGeometry(0.13, 0.007, 0.045), 0x4e2f16, [0, -0.003, 0]));
  // the chunks: bevelled blocks with a moulded logo dent
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
    const bx = new THREE.BoxGeometry(0.019, 0.007, 0.0195, 3, 2, 3);
    { const pp = bx.attributes.position; for (let k = 0; k < pp.count; k++) { const x = pp.getX(k), y = pp.getY(k), z = pp.getZ(k); if (y > 0) { const sc = 0.82; pp.setX(k, x * sc); pp.setZ(k, z * sc); if (Math.abs(x) < 0.004 && Math.abs(z) < 0.004) pp.setY(k, y - 0.0012); } } bx.computeVertexNormals(); }
    p.push(paint(part(bx, 0x5e3a1c, [-0.054 + i * 0.0215, 0.0035, -0.011 + j * 0.022]), (c, v) => { if (v.y > 0.006) c.lerp(new THREE.Color(0x7a4c26), 0.4); }));
  }
  // the wrapper: purple paper round the end, gold foil torn back, the end of the bar bitten off
  const wr = new THREE.BoxGeometry(0.075, 0.016, 0.048, 8, 2, 4); { const pp = wr.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i); if (x < -0.03) { pp.setY(i, pp.getY(i) * (1 + Math.sin(i * 7.3) * 0.15)); pp.setZ(i, pp.getZ(i) * (1 + Math.sin(i * 3.1) * 0.08)); } } wr.computeVertexNormals(); }
  p.push(paint(part(wr, 0x6a1b9a, [0.03, 0.002, 0]), (c, v) => { if (v.y > 0.008 && Math.abs(v.z) < 0.012 && v.x > 0.015 && v.x < 0.055) c.setHex(0xffffff); if (Math.abs(v.z) > 0.0225 && Math.abs(v.y) < 0.004) c.setHex(0xffd400); }));
  const foil = new THREE.PlaneGeometry(0.03, 0.05, 6, 6); { const pp = foil.attributes.position; for (let i = 0; i < pp.count; i++) pp.setZ(i, noise(pp.getX(i), pp.getY(i), 0, 200) * 0.003); foil.computeVertexNormals(); }
  p.push(part(foil, 0xd4c070, [-0.012, 0.012, 0], [-Math.PI / 2 + 0.5, 0, 0.15]));
  return merge(p);
}

// ---------------------------------------------------------------- COOKIE (flat disc)
export function cookieHi() {
  S(111); const p = [];
  const dome = lathe([[0, 0.0075], [0.025, 0.007], [0.04, 0.0045], [0.046, 0.0], [0.044, -0.0055], [0, -0.006]], 40);
  { const pp = dome.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), z = pp.getZ(i), a = Math.atan2(z, x), k = 1 + Math.sin(a * 5) * 0.04 + Math.sin(a * 11) * 0.02; pp.setX(i, x * k); pp.setZ(i, z * k); } }
  p.push(paint(part(lumpy(dome, 0.0012, 130), 0xc98b4a), (c, v) => { const r = Math.hypot(v.x, v.z); c.lerp(new THREE.Color(0x9a5a28), Math.max(0, (r - 0.034) / 0.012) * 0.6); if (Math.abs(noise(v.x, 0, v.z, 160)) < 0.04 && v.y > 0.004) darken(c, 0.35); }));
  for (let i = 0; i < 14; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.036, s = rr(0.0025, 0.0045); p.push(part(lumpy(new THREE.IcosahedronGeometry(s, 1), s * 0.2, 600), 0x3b2412, [Math.cos(a) * r, 0.0068 - (r / 0.046) ** 2 * 0.003, Math.sin(a) * r], [rnd(), rnd(), rnd()], [1, 0.6, 1])); }
  for (let i = 0; i < 12; i++) { const a = rnd() * Math.PI * 2, r = 0.045; p.push(part(sph(0.0015, 4, 3), 0xb07a3a, [Math.cos(a) * r, -0.006, Math.sin(a) * r])); }   // crumbs
  return merge(p);
}

// ---------------------------------------------------------------- ICE CREAM cone (upright)
export function icecreamHi() {
  S(121); const p = [];
  const cone = new THREE.ConeGeometry(0.026, 0.095, 24, 10, true); cone.rotateX(Math.PI);
  p.push(paint(part(cone, 0xd9a05b, [0, -0.028, 0]), (c, v) => { const a = Math.atan2(v.z, v.x), t = v.y * 140; if (Math.abs(Math.sin(a * 6 + t)) > 0.9 || Math.abs(Math.sin(a * 6 - t)) > 0.9) darken(c, 0.32); }));   // waffle diamonds
  p.push(part(new THREE.TorusGeometry(0.0255, 0.003, 8, 28), 0xc48a4a, [0, 0.019, 0], [Math.PI / 2, 0, 0]));
  // two scoops, textured, with a melting drip
  for (const [y, s, col] of [[0.032, 0.03, 0xffc0d8], [0.062, 0.026, 0xfff3d6]]) p.push(paint(part(lumpy(sph(s, 28, 20), s * 0.07, 160), col, [0, y, 0]), (c, v) => darken(c, noise(v.x, v.y, v.z, 300) * 0.05)));
  p.push(part(tube([[0.026, 0.024, 0.006], [0.028, 0.012, 0.007], [0.0265, 0.004, 0.0075]], 0.004, 10, 8), 0xffc0d8));
  // chocolate sauce over the top, sprinkles, a flake and a cherry
  { const pts = []; for (let i = 0; i <= 18; i++) { const a = i * 0.7; pts.push([Math.cos(a) * 0.016 * (1 - i / 30), 0.084 - i * 0.0012, Math.sin(a) * 0.016 * (1 - i / 30)]); } p.push(part(tube(pts, 0.0028, 60, 6), 0x5a2a12)); }
  for (let i = 0; i < 26; i++) { const th = rnd() * 1.1, ph = rnd() * 6.28; p.push(part(new THREE.CapsuleGeometry(0.001, 0.004, 2, 4), [0xff4040, 0x3fc1ff, 0xfff04a, 0x7cff6a, 0xffffff][i % 5], [Math.sin(th) * Math.cos(ph) * 0.026, 0.062 + Math.cos(th) * 0.026, Math.sin(th) * Math.sin(ph) * 0.026], [rnd() * 3, rnd() * 3, 0])); }
  const flake = new THREE.CylinderGeometry(0.006, 0.006, 0.055, 8, 6); { const pp = flake.attributes.position; for (let i = 0; i < pp.count; i++) { const a = Math.atan2(pp.getZ(i), pp.getX(i)), r = 0.006 * (0.75 + Math.abs(Math.sin(a * 4 + pp.getY(i) * 300)) * 0.35); pp.setX(i, Math.cos(a) * r); pp.setZ(i, Math.sin(a) * r); } flake.computeVertexNormals(); }
  p.push(part(flake, 0x6a3a1a, [0.012, 0.085, -0.004], [0.1, 0, -0.35]));
  p.push(part(sph(0.0075, 14, 10), 0xc8102e, [-0.004, 0.091, 0.004]), part(tube([[-0.004, 0.098, 0.004], [-0.002, 0.106, 0.002], [0.003, 0.112, 0.001]], 0.0009, 8, 4), 0x3a5a1a));
  return merge(p);
}

// ---------------------------------------------------------------- SAUSAGE ROLL (along x)
export function sausageRollHi() {
  S(131); const p = [];
  // layered flaky pastry (several sheets, each a touch different), glazed golden on top
  for (let k = 0; k < 4; k++) {
    const sh = new THREE.CapsuleGeometry(0.0275 - k * 0.0012, 0.085, 6, 22); sh.rotateZ(Math.PI / 2);
    p.push(paint(part(lumpy(sh, 0.0007, 140), [0xe8b25a, 0xf0c070, 0xe0a850, 0xf6d090][k], [0, k * 0.0008, 0], [0, 0, 0], [1 - k * 0.012, 0.86, 1]), (c, v) => { if (v.y > 0.012) darken(c, (v.y - 0.012) * 9); }));
  }
  // the scored slashes across the top
  for (let i = 0; i < 5; i++) p.push(part(box(0.0025, 0.004, 0.034), 0x9a5e22, [-0.04 + i * 0.02, 0.0235, 0], [0, 0.35, 0]));
  // the open ends: sausagemeat with flecks of herb, pastry layers round it
  for (const sd of [-1, 1]) {
    p.push(paint(part(new THREE.CircleGeometry(0.017, 20), 0xc98a70, [sd * 0.0705, 0, 0], [0, sd * Math.PI / 2, 0]), (c, v) => { if (noise(v.x, v.y, v.z, 500) > 0.5) c.setHex(0x8a5a40); }));
    p.push(paint(part(new THREE.RingGeometry(0.017, 0.0262, 24, 3), 0xf6dca0, [sd * 0.0702, 0, 0], [0, sd * Math.PI / 2, 0], [1, 0.86, 1]), (c, v) => { if (Math.floor(Math.hypot(v.y, v.z) * 700) % 2) darken(c, 0.12); }));   // layers of pastry round it
  }
  for (let i = 0; i < 18; i++) p.push(part(box(0.003, 0.0015, 0.004), 0xf0c878, [rr(-0.05, 0.05), rr(0.02, 0.026), rr(-0.02, 0.02)], [rnd(), rnd(), rnd()]));   // loose flakes
  return merge(p);
}

// ================================================================ NEW FOODS
// ---------------------------------------------------------------- CHICKEN NUGGETS in a box with a dip (upright box)
export function nuggetsHi() {
  S(141); const p = [];
  const bx = new THREE.BoxGeometry(0.09, 0.05, 0.06, 6, 4, 4); p.push(paint(part(bx, 0xd32f2f, [0, -0.025, 0]), (c, v) => { if (v.y > -0.006) c.setHex(0xffd21a); if (Math.abs(v.z) > 0.029 && Math.abs(v.y + 0.025) < 0.008 && Math.abs(v.x) < 0.03) c.setHex(0xffffff); }));
  const lid = new THREE.BoxGeometry(0.09, 0.003, 0.06); p.push(part(lid, 0xd32f2f, [0, 0.02, -0.042], [-1.1, 0, 0]));
  for (let i = 0; i < 6; i++) { const n = lumpy(new THREE.SphereGeometry(0.016, 20, 14), 0.0018, 260); p.push(paint(part(n, 0xd9902e, [-0.028 + (i % 3) * 0.028, 0.006 + Math.floor(i / 3) * 0.008, -0.012 + Math.floor(i / 3) * 0.022], [rnd(), rnd() * 3, rnd()], [1.25, 0.65, 1]), (c, v) => { if (noise(v.x, v.y, v.z, 400) > 0.35) darken(c, 0.25); })); }
  p.push(part(new THREE.CylinderGeometry(0.014, 0.012, 0.014, 20), 0xffffff, [0.052, -0.04, 0.032]), part(new THREE.CylinderGeometry(0.0125, 0.0125, 0.002, 20), 0xc0521a, [0.052, -0.0335, 0.032]));
  return merge(p);
}
// ---------------------------------------------------------------- CORNISH PASTY (flat, crimp along the top)
export function pastyHi() {
  S(151); const p = [];
  const body = new THREE.SphereGeometry(0.05, 40, 24, 0, Math.PI); body.rotateX(-Math.PI / 2); body.rotateY(Math.PI / 2);
  { const pp = body.attributes.position; for (let i = 0; i < pp.count; i++) { pp.setY(i, pp.getY(i) * 0.62); pp.setZ(i, pp.getZ(i) * 0.6); } }
  p.push(paint(part(lumpy(body, 0.0012, 90), 0xe0a050, [0, -0.012, 0], [0, 0, 0], [1.25, 1, 1]), (c, v) => { darken(c, Math.max(0, v.y + 0.0) * 6 + noise(v.x, v.y, v.z, 180) * 0.08); if (v.y < -0.008) c.lerp(new THREE.Color(0xf2cf90), 0.4); }));
  // the crimp: a rope of little twisted folds along the top
  for (let i = 0; i < 22; i++) { const t = i / 21, a = Math.PI * t, x = Math.cos(a) * 0.06, y = -0.012 + Math.sin(a) * 0.032;
    p.push(paint(part(lumpy(new THREE.SphereGeometry(0.0065, 10, 8), 0.0006, 400), 0xd08a3a, [x, y + 0.004, 0], [0, 0, a + 0.8], [1.3, 0.75, 0.9]), (c, v) => darken(c, Math.max(0, noise(v.x, v.y, v.z, 300)) * 0.25))); }
  p.push(part(new THREE.CircleGeometry(0.003, 10), 0x5a3418, [0.012, 0.012, 0.0305]));    // steam hole
  return merge(p);
}
// ---------------------------------------------------------------- ONION RINGS in a paper tray (flat)
export function onionringsHi() {
  S(161); const p = [];
  const tray = lathe([[0, -0.012], [0.05, -0.012], [0.056, 0.004], [0.057, 0.005]], 32); p.push(paint(part(tray, 0xf5f0e0, [0, 0, 0], [0, 0, 0], [1.2, 1, 0.85]), (c, v) => { if (Math.floor(Math.atan2(v.z, v.x) * 5) % 2 === 0 && v.y > -0.008) c.setHex(0xd32f2f); }));
  for (let i = 0; i < 6; i++) { const R = rr(0.016, 0.022), ring = lumpy(new THREE.TorusGeometry(R, 0.0075, 14, 36), 0.0016, 200);
    p.push(paint(part(ring, 0xe0a040, [rr(-0.032, 0.032), -0.002 + i * 0.006, rr(-0.018, 0.018)], [Math.PI / 2 + rr(-0.35, 0.35), rr(0, 3), rr(-0.3, 0.3)]), (c, v) => { const n = noise(v.x, v.y, v.z, 350); if (n > 0.3) darken(c, 0.25); else if (n < -0.4) c.lerp(new THREE.Color(0xf6d080), 0.5); })); }
  return merge(p);
}
// ---------------------------------------------------------------- BURRITO in foil (along x)
export function burritoHi() {
  S(171); const p = [];
  const tort = new THREE.CapsuleGeometry(0.028, 0.1, 8, 24); tort.rotateZ(Math.PI / 2);
  p.push(paint(part(lumpy(tort, 0.0008, 60), 0xf2dcae), (c, v) => { if (noise(v.x, v.y, v.z, 220) > 0.7) c.lerp(new THREE.Color(0x9a6a30), 0.5); }));
  // the fold seam
  p.push(part(tube([[-0.06, 0.02, 0.018], [0, 0.026, 0.014], [0.05, 0.02, 0.018]], 0.002, 20, 5), 0xe8cc98));
  // foil round one half, crinkled
  const foil = new THREE.CylinderGeometry(0.0295, 0.0295, 0.07, 28, 10, true); foil.rotateZ(Math.PI / 2);
  { const pp = foil.attributes.position; for (let i = 0; i < pp.count; i++) { const n = noise(pp.getX(i), pp.getY(i), pp.getZ(i), 260) * 0.0015; pp.setY(i, pp.getY(i) * (1 + n * 30)); pp.setZ(i, pp.getZ(i) * (1 + n * 30)); } foil.computeVertexNormals(); }
  p.push(paint(part(foil, 0xcfd4d8, [-0.035, 0, 0]), (c, v) => darken(c, -0.1 + noise(v.x, v.y, v.z, 300) * 0.15)));
  // the bitten end: rice, beans, beef, peppers, sour cream
  const end = new THREE.CircleGeometry(0.025, 24); p.push(part(end, 0xf2dcae, [0.0785, 0, 0], [0, Math.PI / 2, 0]));
  for (let i = 0; i < 40; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 0.022; p.push(part(new THREE.IcosahedronGeometry(rr(0.002, 0.004), 0), [0xffffff, 0x5a2a1a, 0x7a3b1a, 0xd8352a, 0x6fbf3f, 0xfaf3e0][i % 6], [0.079 + rnd() * 0.004, Math.sin(a) * r, Math.cos(a) * r])); }
  return merge(p);
}
// ---------------------------------------------------------------- BELGIAN WAFFLE with strawberries and cream (flat)
export function waffleHi() {
  S(181); const p = [];
  p.push(paint(part(new THREE.BoxGeometry(0.1, 0.012, 0.1, 1, 1, 1), 0xe0a050, [0, -0.006, 0]), (c, v) => darken(c, 0.1)));
  // the grid: raised walls round deep pockets
  for (let i = 0; i <= 5; i++) { p.push(part(box(0.1, 0.006, 0.006), 0xe8ac58, [0, 0.003, -0.05 + i * 0.02])); p.push(part(box(0.006, 0.006, 0.1), 0xe8ac58, [-0.05 + i * 0.02, 0.003, 0])); }
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) p.push(part(box(0.014, 0.001, 0.014), 0xc0803a, [-0.04 + i * 0.02, 0.0002, -0.04 + j * 0.02]));
  // cream, strawberries, a dusting of sugar, maple syrup running into the squares
  p.push(paint(part(lumpy(new THREE.ConeGeometry(0.018, 0.024, 18, 4), 0.0012, 300), 0xfffcf4, [0.012, 0.017, 0.01]), (c, v) => darken(c, noise(v.x, v.y, v.z, 400) * 0.04)));
  for (const [x, z] of [[-0.025, -0.02], [0.03, -0.028], [-0.015, 0.03]]) { const s = lathe([[0, -0.009], [0.006, -0.006], [0.0085, 0.001], [0.007, 0.006], [0, 0.008]], 16); p.push(paint(part(s, 0xd8102e, [x, 0.013, z], [0, 0, 1.4]), (c, v) => { if (noise(v.x, v.y, v.z, 900) > 0.6) c.setHex(0xffe080); })); p.push(part(new THREE.ConeGeometry(0.006, 0.004, 6), 0x3a8a2a, [x - 0.009, 0.013, z], [0, 0, 1.4])); }
  for (let i = 0; i < 9; i++) p.push(part(box(0.016, 0.0014, 0.016), 0xa04a10, [-0.04 + (i % 3) * 0.04, 0.0014, -0.04 + Math.floor(i / 3) * 0.04]));
  for (let i = 0; i < 60; i++) p.push(part(sph(0.0009, 3, 2), 0xffffff, [rr(-0.048, 0.048), 0.0065, rr(-0.048, 0.048)]));
  return merge(p);
}
// ---------------------------------------------------------------- PANCAKE STACK with butter, syrup, blueberries (flat)
export function pancakesHi() {
  S(191); const p = [];
  for (let k = 0; k < 4; k++) { const pc = lumpy(new THREE.CylinderGeometry(0.046, 0.046, 0.009, 36, 2), 0.0012, 70);
    p.push(paint(part(pc, 0xe8b060, [rr(-0.002, 0.002), -0.02 + k * 0.0095, rr(-0.002, 0.002)]), (c, v) => { const y = v.y - (-0.02 + k * 0.0095); if (Math.abs(y) > 0.003) darken(c, 0.25 + noise(v.x, 0, v.z, 160) * 0.15); else c.lerp(new THREE.Color(0xf6dca8), 0.4); })); }
  p.push(part(lumpy(new THREE.BoxGeometry(0.018, 0.009, 0.016, 2, 2, 2), 0.0006, 300), 0xfff2a0, [0.002, 0.0215, 0], [0.1, 0.4, 0.05]));
  // syrup over the top and running down the sides
  const sy = new THREE.CylinderGeometry(0.04, 0.04, 0.0015, 36); p.push(part(sy, 0x9a4a10, [0, 0.0185, 0]));
  for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, L = rr(0.008, 0.03); p.push(part(tube([[Math.cos(a) * 0.043, 0.018, Math.sin(a) * 0.043], [Math.cos(a) * 0.047, 0.018 - L / 2, Math.sin(a) * 0.047], [Math.cos(a) * 0.047, 0.018 - L, Math.sin(a) * 0.047]], 0.0022, 8, 6), 0x9a4a10)); }
  for (let i = 0; i < 7; i++) { const a = rnd() * 6.28, r = rr(0.01, 0.034); p.push(part(sph(0.0045, 10, 8), 0x2a2a6a, [Math.cos(a) * r, 0.022, Math.sin(a) * r])); }
  return merge(p);
}
// ---------------------------------------------------------------- CHURROS in a cup with chocolate (upright cup)
export function churrosHi() {
  S(201); const p = [];
  p.push(paint(part(new THREE.CylinderGeometry(0.03, 0.024, 0.055, 24, 2, true), 0xffffff, [0, -0.03, 0]), (c, v) => { if (Math.floor(Math.atan2(v.z, v.x) * 4) % 2) c.setHex(0xd32f2f); }));
  // star-shaped ridged sticks, sugar-dusted
  const star = new THREE.Shape(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = i % 2 ? 0.0055 : 0.0075; i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  for (let i = 0; i < 4; i++) { const st = new THREE.ExtrudeGeometry(star, { depth: rr(0.1, 0.12), bevelEnabled: false, steps: 6 }); st.rotateX(-Math.PI / 2);
    { const pp = st.attributes.position; for (let k = 0; k < pp.count; k++) pp.setX(k, pp.getX(k) + Math.sin(pp.getY(k) * 25) * 0.003); }
    p.push(paint(part(st, 0xc98a3a, [rr(-0.012, 0.012), -0.05, rr(-0.01, 0.01)], [rr(-0.2, 0.2), rnd() * 3, rr(-0.2, 0.2)]), (c, v) => { if (noise(v.x, v.y, v.z, 500) > 0.2) c.lerp(new THREE.Color(0xf4e6c8), 0.5); })); }
  p.push(part(new THREE.CylinderGeometry(0.014, 0.012, 0.016, 18), 0xffffff, [0.04, -0.05, 0.01]), part(new THREE.CylinderGeometry(0.013, 0.013, 0.002, 18), 0x3a1a08, [0.04, -0.0425, 0.01]));
  return merge(p);
}
// ---------------------------------------------------------------- CUPCAKE (upright)
export function cupcakeHi() {
  S(211); const p = [];
  const case_ = new THREE.CylinderGeometry(0.03, 0.024, 0.032, 48, 1, true); { const pp = case_.attributes.position; for (let i = 0; i < pp.count; i++) { const a = Math.atan2(pp.getZ(i), pp.getX(i)), k = 1 + (Math.floor(a / (Math.PI * 2) * 48) % 2) * 0.05; pp.setX(i, pp.getX(i) * k); pp.setZ(i, pp.getZ(i) * k); } case_.computeVertexNormals(); }
  p.push(part(case_, 0x3fa3ff, [0, -0.022, 0]), part(new THREE.CircleGeometry(0.024, 24), 0x2a80d0, [0, -0.038, 0], [Math.PI / 2, 0, 0]));
  p.push(paint(part(lumpy(sph(0.031, 28, 14), 0.0015, 120), 0xc98a4a, [0, -0.004, 0], [0, 0, 0], [1, 0.45, 1]), (c, v) => darken(c, 0.1)));
  // a piped swirl of frosting: stacked, shrinking rings, ending in a peak
  for (let k = 0; k < 5; k++) p.push(part(new THREE.TorusGeometry(0.025 - k * 0.0045, 0.0085 - k * 0.0008, 12, 32), 0xffb0d8, [0, 0.008 + k * 0.0085, 0], [Math.PI / 2, 0, k * 0.6]));
  p.push(part(new THREE.ConeGeometry(0.007, 0.014, 12), 0xffb0d8, [0, 0.054, 0]));
  for (let i = 0; i < 30; i++) { const a = rnd() * 6.28, y = rr(0.01, 0.045), r = 0.03 - (y - 0.01) * 0.6; p.push(part(new THREE.CapsuleGeometry(0.001, 0.004, 2, 4), [0xff4040, 0x3fc1ff, 0xfff04a, 0x7cff6a, 0xffffff][i % 5], [Math.cos(a) * r, y, Math.sin(a) * r], [rnd() * 3, rnd() * 3, 0])); }
  p.push(part(sph(0.0065, 14, 10), 0xc8102e, [0, 0.064, 0]), part(tube([[0, 0.07, 0], [0.002, 0.078, 0.001], [0.006, 0.084, 0]], 0.0008, 8, 4), 0x3a5a1a));
  return merge(p);
}
// ---------------------------------------------------------------- CHOCOLATE BROWNIE (flat square)
export function brownieHi() {
  S(221); const p = [];
  const b = new THREE.BoxGeometry(0.07, 0.03, 0.07, 10, 4, 10);
  { const pp = b.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i); if (y > 0.01) pp.setY(i, y + noise(x, 0, z, 120) * 0.0025); pp.setX(i, x + noise(0, y, z, 200) * 0.0012); } b.computeVertexNormals(); }
  p.push(paint(part(b, 0x3a1e0e), (c, v) => { if (v.y > 0.013) { c.setHex(0x4e2a14); if (Math.abs(noise(v.x, 0, v.z, 140)) < 0.05) c.setHex(0x8a5a3a); } else if (noise(v.x, v.y, v.z, 600) > 0.5) c.setHex(0x2a1208); }));
  for (let i = 0; i < 6; i++) p.push(part(lumpy(new THREE.IcosahedronGeometry(0.006, 1), 0.0015, 600), 0xc8a070, [rr(-0.028, 0.028), 0.017, rr(-0.028, 0.028)], [rnd(), rnd(), rnd()], [1.2, 0.6, 1]));
  for (let i = 0; i < 8; i++) p.push(part(new THREE.IcosahedronGeometry(0.004, 0), 0x2a1208, [rr(-0.03, 0.03), rr(-0.01, 0.012), 0.0355], [rnd(), rnd(), rnd()]));
  return merge(p);
}
// ---------------------------------------------------------------- BACON BAP (like a burger)
export function baconbapHi() {
  S(231); const p = [];
  p.push(paint(part(lathe([[0, -0.04], [0.05, -0.04], [0.058, -0.034], [0.06, -0.022], [0, -0.018]], 32), 0xe8c890), (c, v) => { if (v.y > -0.02) c.lerp(new THREE.Color(0xfaf2e0), 0.6); }));
  // rashers of back bacon: wavy, pink with a white fat edge, crispy brown patches, hanging out of the bun
  for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([-0.07 + t * 0.14, -0.014 + k * 0.004 + Math.sin(t * 9 + k) * 0.003, (k - 1) * 0.016 + Math.sin(t * 5 + k * 2) * 0.006]); }
    const r = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(q => new THREE.Vector3(...q))), 48, 0.012, 8, false);
    { const pp = r.attributes.position; for (let i = 0; i < pp.count; i++) pp.setY(i, (pp.getY(i) - (-0.014 + k * 0.004)) * 0.2 + (-0.014 + k * 0.004)); r.computeVertexNormals(); }
    p.push(paint(part(r, 0xd9707a), (c, v) => { if (Math.abs(v.z - (k - 1) * 0.016) > 0.007 + Math.sin(v.x * 300) * 0.001) c.setHex(0xf6e6d8); if (noise(v.x, v.y, v.z, 300) > 0.5) c.lerp(new THREE.Color(0x8a3a20), 0.6); })); }
  // a splodge of brown sauce
  p.push(part(lumpy(sph(0.012, 12, 8), 0.0015, 300), 0x5a2a12, [0.01, 0.0, 0.008], [0, 0, 0], [1.6, 0.35, 1.2]));
  // the soft bap on top, floury
  const top = lumpy(lathe([[0, 0.058], [0.03, 0.054], [0.05, 0.042], [0.06, 0.022], [0.06, 0.006], [0, 0.006]], 36), 0.0015, 70);
  p.push(paint(part(top, 0xe0b880), (c, v) => { if (noise(v.x, v.y, v.z, 500) > 0.2 && v.y > 0.03) c.lerp(new THREE.Color(0xffffff), 0.75); }));
  return merge(p);
}

export const HI = { burger: burgerHi, pizza: pizzaHi, doughnut: doughnutHi, hotdog: hotdogHi, fries: friesHi, kebab: kebabHi, chicken: chickenHi, taco: tacoHi, crisps: crispsHi, choc: chocHi, cookie: cookieHi, icecream: icecreamHi, sausageroll: sausageRollHi,
  nuggets: nuggetsHi, pasty: pastyHi, onionrings: onionringsHi, burrito: burritoHi, waffle: waffleHi, pancakes: pancakesHi, churros: churrosHi, cupcake: cupcakeHi, brownie: brownieHi, baconbap: baconbapHi };
