// Inside Lewis's garage (x 2.1..6.4, z -5.6..-2.4; door on the lawn side at z -4.2..-3.2,
// the toilet door in the wall at z -2.4, x 2.6..3.4): the usual garage stuff and Lewis's and
// Ian's things. Lewis: a weights bench and barbell, dumbbells, kettlebells, a punch bag,
// protein tubs, a Ronaldo poster. Ian: fishing rods on a rack, a tackle box, waders, a landing
// net, a folding chair, a photo of a fish he swears he caught at Canvey Lake.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { part, cyl } from '../geo.js';
import { canvasTex } from '../textures.js';

export function buildGarage(k, scene, R, rnd) {
  const P = (geo, col, x, y, z, rot = [0, 0, 0]) => k.parts.push(part(geo, col, [x, y, z], rot));
  const rb = (w, h, d, r = 0.02) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  const STEEL = 0x8a9098, DARK = 0x2a2a2a, WOOD = 0x9a7048, CARD = 0xb8925a;
  const sign = (t, w, h, pos, rot, o) => k.label(t, w, h, pos, rot, { size: 40, ...o });

  // ---- strip light, cobwebs ----
  k.box(1.25, 0.05, 0.1, 4.3, 2.43, -4.0, 0xeeeeee); k.box(1.2, 0.03, 0.06, 4.3, 2.4, -4.0, 0xfffff4);
  k.lamp(4.3, 2.39, -4.0, 0xf4fbff, 0.035, true);

  // ================= the workbench along the right wall, pegboard of tools above =================
  R(5.75, -5.45, 6.38, -3.55, 0.06, 0.88, WOOD, { collide: true });                               // thick wooden top
  for (const z of [-5.4, -3.6]) for (const x of [5.8, 6.33]) k.box(0.06, 0.85, 0.06, x, 0.425, z, 0x6a4a2a);
  R(5.78, -5.42, 6.36, -3.58, 0.03, 0.25, 0x7a5a3a); k.blockers.push({ x0: 5.72, x1: 6.4, z0: -5.48, z1: -3.52, y1: 0.92 });   // lower shelf
  P(rb(0.22, 0.12, 0.14), 0x3a3a3a, 6.15, 0.97, -5.15); P(new THREE.BoxGeometry(0.14, 0.06, 0.06), 0x555555, 6.15, 1.06, -5.15);   // a vice
  k.cyl(0.012, 0.012, 0.18, 6.0, 1.06, -5.15, STEEL, 6);
  k.box(0.02, 1.0, 1.85, 6.295, 1.55, -4.5, 0xc8a878);                                                   // pegboard
  for (let y = 1.1; y < 2.05; y += 0.06) for (let z = -5.38; z < -3.6; z += 0.06) k.box(0.002, 0.012, 0.012, 6.283, y, z, 0x8a6a48);
  // the tools on it: hammers, a saw, spanners in a row, screwdrivers, pliers, a tape measure, a drill
  const tool = (fn) => fn();
  tool(() => { k.box(0.02, 0.3, 0.03, 6.255, 1.7, -5.2, 0x6a3a1a); k.box(0.03, 0.04, 0.12, 6.255, 1.86, -5.2, 0x333333); });                 // claw hammer
  tool(() => { k.box(0.02, 0.26, 0.03, 6.255, 1.69, -5.05, 0xd32f2f); k.box(0.03, 0.05, 0.1, 6.255, 1.84, -5.05, 0x555555); });               // club hammer
  tool(() => { const g = new THREE.BufferGeometry().setFromPoints([0, 0, 0, 0, 0.1, 0, 0, 0.06, 0.45, 0, 0.0, 0.45].reduce((a, v, i) => (i % 3 === 0 ? a.push(new THREE.Vector3()) : 0, a[a.length - 1].setComponent(i % 3, v), a), []));
    g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); P(g, 0xc0c4c8, 6.260, 1.45, -4.95); P(rb(0.03, 0.12, 0.14, 0.02), 0xd84315, 6.255, 1.5, -5.0); });   // saw
  for (let i = 0; i < 8; i++) { const h = 0.12 + i * 0.02; k.box(0.012, h, 0.022, 6.260, 1.95 - h / 2, -4.6 + i * 0.05, STEEL); k.cyl(0.018, 0.018, 0.012, 6.260, 1.95 - h - 0.01, -4.6 + i * 0.05, STEEL, 10); }   // spanners
  for (let i = 0; i < 6; i++) { k.cyl(0.014, 0.016, 0.1, 6.255, 1.55, -4.15 + i * 0.05, [0xd32f2f, 0xffd400, 0x1e5aa8][i % 3], 8); k.cyl(0.004, 0.004, 0.12, 6.255, 1.44, -4.15 + i * 0.05, STEEL, 6); }   // screwdrivers
  k.box(0.02, 0.16, 0.025, 6.255, 1.3, -4.45, 0xd32f2f); k.box(0.02, 0.16, 0.025, 6.255, 1.3, -4.4, 0xd32f2f); k.box(0.02, 0.06, 0.03, 6.255, 1.4, -4.425, STEEL);   // pliers
  P(rb(0.05, 0.08, 0.08, 0.015), 0xffd400, 6.235, 1.3, -4.2);                                              // tape measure
  P(rb(0.08, 0.2, 0.06, 0.02), 0x1e7a3a, 6.225, 1.32, -3.85); P(rb(0.08, 0.07, 0.18, 0.02), 0x1e7a3a, 6.225, 1.46, -3.9); k.cyl(0.008, 0.008, 0.08, 6.225, 1.46, -4.03, STEEL, 6);   // cordless drill
  // on the bench: a toolbox, a jar of screws, a can of WD-40-ish, a Lewis protein shaker, sandpaper
  P(rb(0.45, 0.2, 0.22, 0.02), 0xc62828, 6.05, 1.01, -4.55); P(new THREE.BoxGeometry(0.3, 0.03, 0.03), DARK, 6.05, 1.14, -4.55);
  k.cyl(0.04, 0.04, 0.1, 5.95, 0.96, -3.85, 0xdde8ee, 12); k.cyl(0.042, 0.042, 0.02, 5.95, 1.02, -3.85, 0xd32f2f, 12);
  k.cyl(0.03, 0.03, 0.17, 6.2, 0.995, -3.75, 0x1e5aa8, 10); k.cyl(0.006, 0.006, 0.05, 6.2, 1.1, -3.75, 0xffd400, 6);
  k.cyl(0.04, 0.035, 0.18, 5.85, 1.0, -5.3, 0x111111, 12); k.cyl(0.042, 0.042, 0.03, 5.85, 1.1, -5.3, 0x39ff14, 12);   // Lewy's shaker
  k.box(0.2, 0.004, 0.14, 6.1, 0.913, -4.1, 0xd8a868, { rot: [0, 0.3, 0] });
  k.spawns.push(new THREE.Vector3(5.95, 0.98, -4.2));
  // under the bench: a big red tool chest and a crate of bottles for the tip
  P(rb(0.5, 0.45, 0.4, 0.02), 0xb71c1c, 6.05, 0.48, -4.9); for (let i = 0; i < 4; i++) k.box(0.42, 0.006, 0.01, 6.05, 0.32 + i * 0.1, -4.695, DARK);
  R(5.85, -4.2, 6.3, -3.7, 0.25, 0.39, 0x2e7d32);

  // ================= metal shelving on the back wall, left of the window =================
  { const x0 = 2.55, x1 = 4.35, z0 = -5.58, z1 = -5.12;
    for (const x of [x0, x1]) for (const z of [z0, z1]) k.box(0.035, 2.0, 0.035, x, 1.0, z, STEEL);
    const levels = [0.15, 0.6, 1.05, 1.5, 1.95];
    for (const y of levels) R(x0, z0, x1, z1, 0.025, y, 0x9aa0a8, { collide: true });
    k.blockers.push({ x0, x1, z0, z1, y1: 2 });
    // what's on it
    const box = (x, y, w, h, label, col = CARD) => { R(x - w / 2, z0 + 0.04, x + w / 2, z0 + 0.42, h, y + 0.013 + h / 2, col); k.box(w, 0.012, 0.04, x, y + 0.013 + h - 0.004, z1 - 0.06, 0xc8a46a); if (label) sign(label, Math.min(w - 0.04, 0.4), 0.09, [x, y + h * 0.55, z0 + 0.425], [0, 0, 0], { bg: '#f4efe0', fg: '#222', border: null, size: 34 }); };
    box(2.85, 0.15, 0.5, 0.36, 'XMAS DECS'); box(3.45, 0.15, 0.55, 0.36, 'IAN\'S FLIES'); box(4.05, 0.15, 0.5, 0.3, 'LEWY TROPHIES');
    box(2.8, 0.6, 0.42, 0.3, 'CABLES?!'); box(3.28, 0.6, 0.4, 0.24, '', 0xa07848);
    for (let i = 0; i < 4; i++) { const x = 3.68 + i * 0.18; k.cyl(0.085, 0.085, 0.2, x, 0.715, -5.3, 0xf4f4f4, 14); k.box(0.17, 0.08, 0.005, x, 0.72, -5.21, [0xd32f2f, 0x1e5aa8, 0x2e7d32, 0xffd400][i]); k.cyl(0.088, 0.088, 0.02, x, 0.83, -5.3, 0x9a9a9a, 14); }   // paint tins
    for (let i = 0; i < 3; i++) { const x = 2.75 + i * 0.28; k.cyl(0.11, 0.11, 0.3, x, 1.215, -5.32, 0x111111, 16); k.box(0.17, 0.12, 0.005, x, 1.2, -5.205, i === 1 ? 0x39ff14 : 0xffffff); k.cyl(0.1, 0.1, 0.04, x, 1.385, -5.32, 0x222222, 16); }   // Lewy's protein tubs
    sign('WHEY', 0.14, 0.06, [3.03, 1.2, -5.2], [0, 0, 0], { bg: '#111', fg: '#39ff14', border: null, size: 60 });
    for (let i = 0; i < 6; i++) { const x = 3.6 + i * 0.12; k.cyl(0.03, 0.03, 0.2, x, 1.165, -5.25, [0x1e88e5, 0xd32f2f, 0xffd400, 0x2e7d32][i % 4], 10); k.cyl(0.015, 0.02, 0.04, x, 1.285, -5.25, 0x111111, 8); }   // spray cans
    box(4.2, 1.05, 0.22, 0.22, '', 0x1e5aa8);
    for (let i = 0; i < 4; i++) { k.cyl(0.05, 0.05, 0.28, 2.75 + i * 0.12, 1.655, -5.3, 0x1e88e5, 10); k.box(0.07, 0.1, 0.005, 2.75 + i * 0.12, 1.64, -5.249, 0xffffff); }   // screenwash
    box(3.55, 1.5, 0.7, 0.32, 'GARDEN STUFF (IAN)'); box(4.15, 1.5, 0.3, 0.2, '');
    k.spawns.push(new THREE.Vector3(3.3, 1.12, -5.3));
  }

  // ================= chest freezer under the window (every garage has one) =================
  P(rb(1.1, 0.86, 0.6, 0.04), 0xf2f2ee, 5.05, 0.43, -5.27); P(rb(1.12, 0.06, 0.62, 0.03), 0xe8e8e4, 5.05, 0.88, -5.27);
  k.box(0.3, 0.03, 0.04, 5.05, 0.8, -4.95, 0xbbbbbb); k.box(0.08, 0.05, 0.01, 4.7, 0.6, -4.965, 0x2e7d32);
  k.blockers.push({ x0: 4.48, x1: 5.62, z0: -5.58, z1: -4.95, y1: 0.92 });
  sign('IAN\'S BAIT — NOT FOOD, RONNIE', 0.6, 0.1, [5.05, 0.92, -5.27], [-Math.PI / 2, 0, 0], { bg: '#fff', fg: '#c62828', border: '#c62828', size: 34 });
  k.cyl(0.033, 0.033, 0.12, 5.45, 0.97, -5.1, 0xc8102e, 10);

  // ================= Lewis's gym corner: bench, barbell, plates, dumbbells, kettlebells, mat, punch bag =================
  { const bx = 4.75, bz = -3.75;
    k.box(1.6, 0.012, 1.0, bx - 0.1, 0.006, bz, 0x1a1a1a);                                            // rubber mat
    P(rb(1.15, 0.1, 0.3, 0.04), 0x111111, bx, 0.47, bz); for (const dx of [-0.45, 0.45]) { k.box(0.05, 0.42, 0.05, bx + dx, 0.21, bz, STEEL); k.box(0.05, 0.03, 0.4, bx + dx, 0.015, bz, STEEL); }   // bench
    for (const dz of [-0.45, 0.45]) { k.box(0.05, 1.1, 0.05, bx - 0.55, 0.55, bz + dz, DARK); k.box(0.1, 0.03, 0.08, bx - 0.5, 0.95, bz + dz, DARK); k.box(0.3, 0.04, 0.05, bx - 0.55, 0.02, bz + dz, DARK); }   // rack uprights
    P(cyl(0.014, 0.014, 1.9, 10), 0xc8ccd0, bx - 0.5, 0.99, bz, [Math.PI / 2, 0, 0]);                    // the bar
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) P(cyl(0.21 - i * 0.04, 0.21 - i * 0.04, 0.04, 20), i ? 0x1e5aa8 : 0xc62828, bx - 0.5, 0.99, bz + s * (0.72 + i * 0.045), [Math.PI / 2, 0, 0]);
    k.blockers.push({ x0: bx - 0.7, x1: bx + 0.65, z0: bz - 0.95, z1: bz + 0.95, y1: 1.1 });
    // dumbbells on a little rack, kettlebells on the floor
    R(4.55, -2.78, 5.45, -2.5, 0.03, 0.4, DARK); for (const x of [4.6, 5.4]) k.box(0.04, 0.4, 0.28, x, 0.2, -2.64, DARK); k.blockers.push({ x0: 4.55, x1: 5.45, z0: -2.78, z1: -2.46, y1: 0.5 });
    for (let i = 0; i < 4; i++) { const x = 4.72 + i * 0.18, r = 0.045 + i * 0.008; for (const s of [-1, 1]) P(cyl(r, r, 0.05, 6), 0x222222, x, 0.45 + r, -2.64 + s * 0.08, [Math.PI / 2, 0, 0]); P(cyl(0.015, 0.015, 0.12, 6), STEEL, x, 0.45 + r, -2.64, [Math.PI / 2, 0, 0]); }
    for (const [x, z, s] of [[3.9, -3.0, 1], [4.15, -2.85, 0.8]]) { k.parts.push(part(new THREE.SphereGeometry(0.11 * s, 12, 9), 0x222222, [x, 0.1 * s, z])); k.parts.push(part(new THREE.TorusGeometry(0.06 * s, 0.015 * s, 6, 14, Math.PI), 0x222222, [x, 0.2 * s, z])); }
    for (let i = 0; i < 3; i++) P(cyl(0.22, 0.22, 0.04, 20), [0x111111, 0x1e5aa8, 0xc62828][i], 6.32, 0.25 + i * 0.03, -3.35, [0, 0, Math.PI / 2 - 0.12]);   // spare plates leaning
    // punch bag hanging from a ceiling bracket
    k.box(0.05, 0.05, 0.4, 3.9, 2.42, -4.6, DARK); k.cyl(0.004, 0.004, 0.45, 3.9, 2.18, -4.6, 0x666666, 4);
    P(new THREE.CapsuleGeometry(0.17, 0.6, 6, 14), 0x8a1a1a, 3.9, 1.48, -4.6); k.cyl(0.175, 0.175, 0.06, 3.9, 1.5, -4.6, 0x111111, 16);
    k.blockers.push({ x0: 3.72, x1: 4.08, z0: -4.78, z1: -4.42, y1: 2 });
    // the Ronaldo shrine on the toilet wall: poster, a Portugal flag, LEG DAY
    k.label('', 0.6, 0.85, [4.9, 1.65, -2.47], [0, Math.PI, 0], { tex: posterTex() });
    k.label('', 0.8, 0.5, [5.75, 1.75, -2.47], [0, Math.PI, 0], { tex: flagTex() });
    sign('LEG DAY IS EVERY DAY — LEWY', 0.7, 0.12, [5.75, 1.35, -2.47], [0, Math.PI, 0], { bg: '#111', fg: '#ffd400', border: null, size: 40 });
    k.spawns.push(new THREE.Vector3(5.0, 0.48, -2.64));
  }

  // ================= Ian's fishing corner on the left wall, beside the door =================
  { const wx = 2.17;
    k.box(0.06, 0.06, 1.0, wx + 0.03, 1.75, -4.95, WOOD); k.box(0.06, 0.06, 1.0, wx + 0.03, 0.12, -4.95, WOOD);   // rod rack, top and bottom
    for (let i = 0; i < 6; i++) {
      const z = -5.38 + i * 0.17, len = 2.2, lean = 0.07;
      P(cyl(0.006, 0.014, len, 6), [0x1a1a1a, 0x2e4a2e, 0x3a2a1a][i % 3], wx + 0.07 + lean * 0.5, len / 2 + 0.05, z, [0, 0, -lean]);
      P(cyl(0.018, 0.018, 0.28, 8), 0xc8a878, wx + 0.06, 0.4, z, [0, 0, -lean]);                                 // cork handle
      P(cyl(0.035, 0.035, 0.04, 12), [0x222222, 0x8a8a8a, 0x1e5aa8][i % 3], wx + 0.12, 0.6, z, [0, 0, Math.PI / 2]);   // reel
    }
    // waders hanging up, a landing net, a keep net
    k.box(0.05, 0.05, 0.05, wx + 0.03, 2.05, -4.45, DARK);
    P(rb(0.06, 0.7, 0.32, 0.03), 0x2e4a2e, wx + 0.06, 1.62, -4.45); for (const dz of [-0.08, 0.08]) P(rb(0.07, 0.75, 0.13, 0.04), 0x2e4a2e, wx + 0.06, 0.95, -4.45 + dz); for (const dz of [-0.08, 0.08]) P(rb(0.12, 0.08, 0.2, 0.03), 0x1a1a1a, wx + 0.1, 0.56, -4.45 + dz);
    P(cyl(0.01, 0.01, 1.5, 6), 0x222222, wx + 0.08, 0.8, -2.62, [0.25, 0, -0.06]); k.parts.push(part(new THREE.TorusGeometry(0.22, 0.012, 6, 18), 0x222222, [wx + 0.1, 1.62, -2.42], [0, Math.PI / 2, 0]));   // landing net
    for (let i = 0; i < 5; i++) k.cyl(0.2, 0.2, 0.012, wx + 0.24, 0.05 + i * 0.12, -2.65, 0x3a5a3a, 14);   // keep net, folded up
    // tackle box, bait tub, folded chair, wellies
    P(rb(0.45, 0.22, 0.28, 0.03), 0x2e7d32, 2.55, 0.11, -5.0); P(new THREE.BoxGeometry(0.3, 0.03, 0.04), DARK, 2.55, 0.24, -5.0); k.box(0.46, 0.01, 0.29, 2.55, 0.165, -5.0, 0x1b5e20);
    k.cyl(0.08, 0.08, 0.1, 2.9, 0.05, -4.9, 0xffffff, 12); k.cyl(0.082, 0.082, 0.015, 2.9, 0.105, -4.9, 0x1e5aa8, 12);
    for (const [y, rz] of [[0.45, 0.08], [0.47, -0.08]]) k.box(0.03, 0.9, 0.5, 2.24, y, -2.9, 0x2e4a2e, { rot: [0, 0, rz] });   // folding chair
    for (const dz of [0, 0.14]) { P(rb(0.12, 0.38, 0.12, 0.03), 0x1a3a1a, 2.4, 0.19, -3.15 + dz); P(rb(0.12, 0.08, 0.26, 0.03), 0x1a3a1a, 2.4, 0.04, -3.2 + dz); }   // wellies by the door
    k.label('', 0.4, 0.3, [wx + 0.04, 1.55, -5.45], [0, Math.PI / 2, 0], { tex: fishPhotoTex() });          // THE fish
    sign('CANVEY LAKE — IAN\'S PEG', 0.55, 0.11, [wx + 0.04, 1.97, -4.95], [0, Math.PI / 2, 0], { bg: '#1e3a5a', fg: '#fff', border: null, size: 40 });
    k.blockers.push({ x0: 2.1, x1: 2.45, z0: -5.55, z1: -4.25, y1: 2 });
  }

  // a bike hanging from the ceiling by its wheels, over the weights
  { const x = 4.5, z = -4.75, y = 2.05;
    for (const dz of [-0.5, 0.5]) { k.parts.push(part(new THREE.TorusGeometry(0.31, 0.02, 6, 24), 0x111111, [x, y - 0.31, z + dz], [0, Math.PI / 2, 0])); k.box(0.02, 0.1, 0.02, x, y + 0.03, z + dz, STEEL); }
    for (const [a, b] of [[[0, -0.31, -0.5], [0, -0.55, -0.05]], [[0, -0.55, -0.05], [0, -0.31, 0.5]], [[0, -0.55, -0.05], [0, -0.7, 0.25]], [[0, -0.7, 0.25], [0, -0.31, -0.5]]]) {
      const A = new THREE.Vector3(x + a[0], y + a[1], z + a[2]), Bv = new THREE.Vector3(x + b[0], y + b[1], z + b[2]), d = Bv.clone().sub(A), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), e = new THREE.Euler().setFromQuaternion(q);
      k.parts.push(part(cyl(0.018, 0.018, d.length(), 8), 0x1e88e5, [(A.x + Bv.x) / 2, (A.y + Bv.y) / 2, (A.z + Bv.z) / 2], [e.x, e.y, e.z]));
    }
    k.box(0.05, 0.05, 0.22, x, y - 0.82, z + 0.25, 0x111111); k.box(0.5, 0.025, 0.025, x, y - 0.6, z - 0.12, 0x333333);   // saddle (upside down), bars
  }
  // tyres stacked in the corner by the toilet wall, an extension reel, a mop bucket
  for (let i = 0; i < 3; i++) { k.cyl(0.3, 0.3, 0.2, 6.05, 0.1 + i * 0.2, -2.75 + (i % 2) * 0.03, 0x1a1a1a, 16, { block: i === 0 }); k.cyl(0.18, 0.18, 0.205, 6.05, 0.1 + i * 0.2, -2.75 + (i % 2) * 0.03, 0x333333, 12); }
  k.cyl(0.14, 0.14, 0.18, 3.6, 0.09, -5.0, 0xff8f00, 14); k.cyl(0.06, 0.06, 0.2, 3.6, 0.1, -5.0, 0x333333, 10);
}

function posterTex() {
  return canvasTex(256, 360, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#c8102e'); gr.addColorStop(1, '#5a0010'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4d0b0'; g.beginPath(); g.arc(w / 2, 110, 38, 0, 7); g.fill(); g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(w / 2, 92, 38, Math.PI, 0); g.fill();
    g.fillStyle = '#c8102e'; g.fillRect(w / 2 - 70, 150, 140, 130); g.fillStyle = '#1b5e20'; g.fillRect(w / 2 - 70, 150, 30, 130);
    g.fillStyle = '#f4d0b0'; g.save(); g.translate(w / 2 - 80, 165); g.rotate(-0.9); g.fillRect(-12, -70, 24, 80); g.restore(); g.save(); g.translate(w / 2 + 80, 165); g.rotate(0.9); g.fillRect(-12, -70, 24, 80); g.restore();   // arms out: SIU
    g.fillStyle = '#ffd400'; g.font = '900 40px Impact, sans-serif'; g.textAlign = 'center'; g.fillText('SIUUUU', w / 2, 330); g.font = '900 64px Impact, sans-serif'; g.fillStyle = '#fff'; g.fillText('7', w / 2, 250);
  });
}
function flagTex() {
  return canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#046a38'; g.fillRect(0, 0, w * 0.4, h); g.fillStyle = '#da291c'; g.fillRect(w * 0.4, 0, w * 0.6, h); g.fillStyle = '#ffe900'; g.beginPath(); g.arc(w * 0.4, h / 2, 34, 0, 7); g.fill(); g.fillStyle = '#da291c'; g.fillRect(w * 0.4 - 18, h / 2 - 22, 36, 44); g.fillStyle = '#fff'; g.fillRect(w * 0.4 - 12, h / 2 - 14, 24, 28); });
}
function fishPhotoTex() {
  return canvasTex(200, 150, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#7ec0f0'; g.fillRect(8, 8, w - 16, 70); g.fillStyle = '#4a7a3a'; g.fillRect(8, 78, w - 16, 44);
    g.fillStyle = '#6a7a3a'; g.beginPath(); g.ellipse(w / 2, 70, 60, 20, -0.1, 0, 7); g.fill(); g.beginPath(); g.moveTo(w / 2 + 56, 70); g.lineTo(w / 2 + 80, 55); g.lineTo(w / 2 + 80, 85); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(w / 2 - 40, 66, 3, 0, 7); g.fill();
    g.fillStyle = '#222'; g.font = '700 13px Arial'; g.textAlign = 'center'; g.fillText('CANVEY 2019 — 34lb (EST.)', w / 2, 140);
  });
}
