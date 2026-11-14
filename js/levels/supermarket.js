// LIDL: the discount supermarket where Oliver works. Laid out from the floor plan:
//   (x east, z south; the shop floor is x -11..11, z -14.7..14.7, entrance foyer x 11..14.4)
//   back wall: MILK fridges (left), then more fridges (yoghurts, cheese, ham)
//   top half (all LOW, you can see over it): the freezer island, two MIDDLE AISLES of wire basket
//     bins full of special buys, a double-sided meat chiller; dairy fridges and MONSTOR on the right wall
//   cross aisle with stacks of cola, drinks, crisps and chocolate at every aisle end
//   bottom half: ALCOHOL, TOILETRIES, CHOCOLATE SWEETS & CRISPS, VEG crates and a fruit & veg wall
//   front: self-checkout pen behind silver rails, tills 3 2 1, magazine shelves and a glass screen
//     between the entrance and the exit lane, tall windows onto the car park all along the front
//   the BAKERY: a wall of bins along the angled wall, and behind the glass the bake-off room with
//     its ovens and racks of bread; the back stock room (STAFF ONLY) behind the right-hand wall
// Mostly white, grey and black; prices and signs in blue and yellow; Lidl bags all over (pick one up).
import * as THREE from 'three';
import { Stock, priceTex } from './stock.js';
import { Kit, tileTex, canvasTex, FONT, streetViewTex } from './kit.js';
import { Dormant } from './dormant.js';
import { part } from '../geo.js';

const H = 4.0;
// the angled bakery line (glass, with the bins in front of it) and the rooms
const G0 = [3.4, 2.62], G1 = [6.96, 7.1], G2 = [11.0, 8.17];
const INSIDE = [
  [[-11, -14.7], [3.4, -14.7], [3.4, 2.62], G1, G2, [11, 14.7], [-11, 14.7]],                    // shop floor
  [[3.4, -14.7], [8.5, -14.7], [8.5, -1.4], [3.4, -1.4]],                                        // stock room
  [[3.4, -1.4], [8.5, -1.4], [8.5, 4.6], [11, 4.6], [11, 8.17], G1, [3.4, 2.62]],                // bake-off room
  [[11, 9.0], [14.4, 9.0], [14.4, 14.7], [11, 14.7]],                                            // foyer
];
const inPoly = (poly, x, z) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const inside = (x, z) => INSIDE.some(p => inPoly(p, x, z));

export function buildSupermarket(scene) {
  const sceneStart = scene.children.length;
  const k = new Kit(scene, { x0: -11, x1: 14.4, z0: -14.7, z1: 14.7, y1: H });
  const WALL = 0xf4f4f2, BLUE = 0x1e4ea8, YEL = 0xffd400, RED = 0xe53935, SHELF = 0xc6c9cd, LEDGE = 0xdadcdf, BLACK = 0x26282c, STEEL = 0xa8aeb6, CHROME = 0xd8dce0, WHITE = 0xfafafa;
  const R = (x0, z0, x1, z1, h, y, color, opts) => k.box(Math.abs(x1 - x0), h, Math.abs(z1 - z0), (x0 + x1) / 2, y ?? h / 2, (z0 + z1) / 2, color, opts);
  const T2 = 0.08;
  const wallX = (x, z0, z1, h = H, c = WALL) => R(x - T2, z0 - T2, x + T2, z1 + T2, h, h / 2, c, { collide: true, block: true });
  const wallZ = (z, x0, x1, h = H, c = WALL) => R(x0 - T2, z - T2, x1 + T2, z + T2, h, h / 2, c, { collide: true, block: true });
  const sign = (t, w, h, pos, rot, o = {}) => k.label(t, w, h, pos, rot, o);
  const blk = (x0, z0, x1, z1, y1 = 2) => k.blockers.push({ x0, x1, z0, z1, y1 });
  const BS = { bg: '#1e4ea8', fg: '#ffd400', border: '#ffd400', size: 54 };
  const hang = (t, x, z, w = 2.2, ry = 0) => {
    for (const dx of [-w / 2 + 0.15, w / 2 - 0.15]) k.box(0.01, 0.75, 0.01, x + Math.cos(ry) * dx, H - 0.38, z - Math.sin(ry) * dx, 0x333333);
    k.box(w + 0.04, 0.49, 0.02, x, H - 0.98, z, 0x1e4ea8, { rot: [0, ry, 0] });                                  // the sign board itself
    sign(t, w, 0.45, [x + Math.sin(ry) * 0.012, H - 0.98, z + Math.cos(ry) * 0.012], [0, ry, 0], BS);
    sign(t, w, 0.45, [x - Math.sin(ry) * 0.012, H - 0.98, z - Math.cos(ry) * 0.012], [0, ry + Math.PI, 0], BS);
  };
  const glassMat = new THREE.MeshLambertMaterial({ color: 0xd8f0f8, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  const glass = (x, y, z, w, h, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMat); m.position.set(x, y, z); m.rotation.y = ry; m.renderOrder = 3; scene.add(m); return m; };
  const stock = new Stock(), PRICES = priceTex(), dorm = new Dormant();
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // ================================================================ shell
  k.floor(-11, -14.7, 14.4, 14.7, tileTex('#e6e6e4', '#dcdcda', '#c2c2c0', 64), 0.002, 1.2);
  k.floor(3.4, -14.7, 8.5, -1.4, tileTex('#9a9a96', '#8e8e8a', '#6e6e6a', 64), 0.003, 1.5);          // stock room concrete
  { const t = tileTex('#b84a32', '#a8442e', '#7a2e1e', 48); t.wrapS = t.wrapT = THREE.RepeatWrapping;        // bake-off room: red quarry tiles (only behind the glass)
    const g = new THREE.ShapeGeometry(new THREE.Shape(INSIDE[2].map(([x, z]) => new THREE.Vector2(x, z)))); g.rotateX(Math.PI / 2);
    const uv = g.attributes.uv, pa = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pa.getX(i) / 0.6, pa.getZ(i) / 0.6);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide })); m.position.y = 0.0035; scene.add(m); }
  k.floor(11, 9.0, 14.4, 14.7, tileTex('#7a7a78', '#707070', '#5a5a58', 64), 0.003, 1.0);           // foyer
  R(11.3, 10.0, 13.9, 13.9, 0.012, 0.007, 0x2a2a2a);
  k.ceiling(0xf6f6f6, 0x5a5a5a);
  wallZ(-14.7, -11, 8.5); wallX(-11, -14.7, 14.7); wallZ(14.7, -11, 14.4);
  // the right-hand wall: the stock room behind it (strip-curtain door off the meat aisle), the bake-off room after it
  wallX(3.4, -14.7, -5.3); wallX(3.4, -3.9, G0[1]); R(3.32, -5.3, 3.48, -3.9, H - 2.3, 2.3 + (H - 2.3) / 2, WALL);
  // the STAFF ONLY doorway: steel frame with buffer rails, a rail of overlapping clear PVC strips (slightly swung),
  // a lit sign box over it, notices, a keypad, yellow-and-black hazard tape on the floor, a cage trolley and a bin by it
  { const sx = 3.32, za = -5.3, zb = -3.9, STL = 0xa8aeb6;
    const stripMat = new THREE.MeshLambertMaterial({ color: 0xcfe8f0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    const sg = new THREE.PlaneGeometry(0.2, 2.18);
    for (let i = 0, z = za + 0.08; z < zb - 0.08; z += 0.13, i++) { const m = new THREE.Mesh(sg, stripMat); m.position.set(3.4 + (i % 2 ? 0.012 : -0.012), 1.17, z + 0.06); m.rotation.y = Math.PI / 2 + Math.sin(i * 1.7) * 0.18; m.rotation.z = Math.sin(i * 2.3) * 0.02; m.renderOrder = 3; scene.add(m); }
    R(3.3, za, 3.5, zb, 0.06, 2.28, 0x777c84);                                                                  // the strip rail
    for (const z of [za, zb]) { R(3.28, z - 0.06, 3.52, z + 0.06, 2.3, 1.15, STL); R(3.22, z - 0.05, 3.28, z + 0.05, 0.8, 0.5, 0xffd400); }   // steel jambs, yellow buffers
    R(3.27, za - 0.06, 3.53, zb + 0.06, 0.08, 2.34, STL);
    for (const z of [za + 0.03, zb - 0.03]) for (const y of [0.3, 0.8]) R(3.2, z - 0.025, 3.28, z + 0.025, 0.05, y, 0x3a3c40);   // corner guards
    // hazard tape across the floor at the threshold
    const tape = canvasTex(256, 32, (g, w, h) => { for (let x = -32; x < w + 32; x += 32) { g.fillStyle = '#ffd400'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 16, 0); g.lineTo(x + 32, h); g.lineTo(x + 16, h); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.moveTo(x + 16, 0); g.lineTo(x + 32, 0); g.lineTo(x + 48, h); g.lineTo(x + 32, h); g.fill(); } });
    k.label('tape', zb - za, 0.1, [3.2, 0.006, (za + zb) / 2], [-Math.PI / 2, 0, Math.PI / 2], { tex: tape });
    // the lit sign box over the door
    R(3.18, za + 0.05, 3.3, zb - 0.05, 0.36, 2.62, 0xc62828);
    // notices and a keypad beside it
    k.box(0.06, 0.16, 0.1, 3.29, 1.35, zb + 0.22, 0x2a2a2a); k.box(0.01, 0.1, 0.07, 3.255, 1.36, zb + 0.22, 0x445566); k.lamp(3.25, 1.43, zb + 0.22, 0x39ff14, 0.01, false);
    blk(3.2, za - 0.08, 3.55, za + 0.06, H); blk(3.2, zb - 0.06, 3.55, zb + 0.08, H);
    // a cage trolley of stock waiting by the door, a tall bin
    const cz = za - 0.55; R(2.7, cz - 0.35, 3.25, cz + 0.35, 0.05, 0.12, 0x777777); for (const [dx, dz] of [[-0.25, -0.33], [0.25, -0.33], [-0.25, 0.33], [0.25, 0.33]]) k.box(0.02, 1.55, 0.02, 2.975 + dx, 0.9, cz + dz, 0x888888);
    for (let y = 0.3; y < 1.7; y += 0.18) { k.box(0.52, 0.015, 0.015, 2.975, y, cz - 0.33, 0x888888); k.box(0.015, 0.015, 0.66, 2.73, y, cz, 0x888888); }
    for (let i = 0; i < 6; i++) R(2.76 + (i % 2) * 0.24, cz - 0.3 + Math.floor(i / 2) * 0.0, 2.98 + (i % 2) * 0.24, cz + 0.3, 0.3, 0.3 + Math.floor(i / 2) * 0.32, [0xc8a070, 0xd6b48a, 0xb8905a][i % 3]);
    for (const [dx, dz] of [[-0.22, -0.3], [0.22, -0.3], [-0.22, 0.3], [0.22, 0.3]]) k.cyl(0.03, 0.03, 0.05, 2.975 + dx, 0.03, cz + dz, 0x222222, 8);
    blk(2.68, cz - 0.37, 3.27, cz + 0.37, 1.7);
    k.cyl(0.17, 0.15, 0.85, 3.08, 0.425, zb + 0.55, 0x2a2a2a, 12, { block: true }); k.cyl(0.18, 0.18, 0.04, 3.08, 0.86, zb + 0.55, 0x1e4ea8, 12);
  }
  wallZ(-1.4, 3.4, 6.0); wallZ(-1.4, 7.0, 8.5); R(6.0, -1.48, 7.0, -1.32, H - 2.2, 2.2 + (H - 2.2) / 2, WALL);    // stock room | bake-off room (door)
  wallX(8.5, -14.7, 4.6); wallZ(4.6, 8.5, 11); wallX(11, 4.6, G2[1]);
  // everything outside the rooms is solid (merged into strips so it stays cheap)
  { const C = 0.3;
    for (let z = -14.7; z < 14.7 - 1e-6; z += C) { let s = null;
      for (let x = -11; x < 14.4 + C; x += C) { const solid = x < 14.4 && !inside(x + C / 2, z + C / 2); if (solid && s === null) s = x; if (!solid && s !== null) { blk(s, z, Math.min(x, 14.4), Math.min(z + C, 14.7), H); s = null; } } } }
  // the front wall onto the foyer: entrance (z 9.5..11.7) and exit (z 12.6..14.4) gaps
  wallX(11, G2[1], 9.5); wallX(11, 11.7, 12.6); wallX(11, 14.4, 14.7);
  for (const [z0, z1] of [[9.5, 11.7], [12.6, 14.4]]) { R(10.92, z0, 11.08, z1, H - 2.4, 2.4 + (H - 2.4) / 2, WALL); R(10.9, z0, 11.1, z1, 0.06, 2.37, BLACK); for (const z of [z0 + 0.04, z1 - 0.04]) R(10.92, z - 0.04, 11.08, z + 0.04, 2.4, 1.2, BLACK); }
  for (const [z0, z1] of [[9.5, 9.85], [11.35, 11.7]]) R(10.97, z0, 11.03, z1, 2.3, 1.15, 0xbfe0ee);
  sign('ENTRANCE', 1.4, 0.3, [10.88, 2.6, 10.6], [0, -Math.PI / 2, 0], BS); sign('EXIT', 1.0, 0.3, [10.88, 2.6, 13.5], [0, -Math.PI / 2, 0], { ...BS, bg: '#fff', fg: '#1e4ea8' });
  sign('NO ENTRY', 0.6, 0.25, [11.095, 2.7, 13.5], [0, Math.PI / 2, 0], { bg: '#c62828', fg: '#fff', border: null, size: 60 });
  R(10.6, 12.62, 10.66, 14.38, 0.06, 1.0, STEEL); for (const z of [12.65, 13.5, 14.35]) R(10.6, z - 0.03, 10.66, z + 0.03, 1.0, 0.5, STEEL);
  k.blockers.push({ x0: 10.55, x1: 10.7, z0: 12.62, z1: 13.1, y1: 1.0 });
  // the foyer: glass doors out to the car park, flowers along the wall
  wallZ(9.0, 11, 14.4); wallX(14.4, 9.0, 14.7);
  k.window(14.36, 1.3, 11.8, 2.6, 2.4, -Math.PI / 2, carParkTex(2), { frame: BLACK, bars: 1 });
  sign('LIDL', 2.2, 0.55, [14.305, 3.0, 11.8], [0, -Math.PI / 2, 0], { tex: logoTex(), glow: true });
  for (let i = 0; i < 9; i++) {
    const x = 11.4 + i * 0.33, z = 9.35 + (i % 2) * 0.28, y = (i % 2) * 0.25;
    k.cyl(0.13, 0.11, 0.28, x, y + 0.14, z, 0x2a2c30, 10);
    for (let j = 0; j < 7; j++) { const a = j * 0.9 + i, r = 0.06 + (j % 3) * 0.03; k.box(0.008, 0.45, 0.008, x + Math.cos(a) * r * 0.5, y + 0.45, z + Math.sin(a) * r * 0.5, 0x3a7a2a); k.parts.push(...[]); k.cyl(0.04, 0.03, 0.05, x + Math.cos(a) * r, y + 0.68 + (j % 2) * 0.05, z + Math.sin(a) * r, [0xe91e63, 0xffeb3b, 0xffffff, 0xff7043, 0xab47bc][(i + j) % 5], 7); }
  }
  R(11.2, 9.1, 14.3, 9.75, 0.25, 0.125, BLACK, { block: true });
  sign('FRESH FLOWERS £2.99 (RONNIE ATE THE DAFFODILS)', 2.4, 0.3, [12.8, 1.55, 9.1], [0, 0, 0], { bg: '#ffd400', fg: '#1e4ea8', border: null, size: 40 });
  // lights
  for (let x = -9.5; x <= 2.5; x += 3) k.box(0.2, 0.05, 28.6, x, H - 0.04, 0, 0xffffff);
  for (let x = 4.5; x <= 10.5; x += 3) k.box(0.2, 0.05, 5.0, x, H - 0.04, 11.9, 0xffffff);
  for (let x = -9.5; x <= 2.5; x += 3) for (let z = -12; z <= 13; z += 5) k.pool(x, 0, z, 3.2, 0xf4f8ff);
  for (const [x, z] of [[5.5, 11], [8.5, 11.5], [12.7, 11.8]]) k.pool(x, 0, z, 3, 0xf4f8ff);
  R(-10.92, -14.6, -10.9, 14.6, 0.25, 2.9, BLUE); R(-10.92, -14.6, -10.9, 14.6, 0.08, 2.72, YEL);
  R(-10.9, 14.6, 10.9, 14.62, 0.25, 3.1, BLUE); R(-10.9, 14.6, 10.9, 14.62, 0.08, 2.92, YEL);
  // tall windows all along the front: floor to head height, the car park outside
  { const tex = [carParkTex(0), carParkTex(1), carParkTex(3)];
    for (let x = -10.6, i = 0; x < 10.6; x += 2.4, i++) {
      const w = Math.min(2.3, 10.8 - x - 0.05), cx = x + w / 2;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.15), new THREE.MeshBasicMaterial({ map: tex[i % 3], color: 0xe8e8e8 })); m.position.set(cx, 1.1, 14.61); m.rotation.y = Math.PI; scene.add(m);
      glass(cx, 1.1, 14.59, w, 2.15, Math.PI);
      R(x - 0.04, 14.52, x + 0.04, 14.62, 2.25, 1.12, BLACK);
    }
    R(-10.9, 14.5, 10.9, 14.62, 0.08, 2.22, BLACK); R(-10.9, 14.5, 10.9, 14.62, 0.06, 0.03, BLACK);
  }

  // ================================================================ shelving
  const LEVELS = [0.1, 0.55, 1.05, 1.5];
  // a tall double-sided gondola run along z
  const shelf = (x, z0, z1, left, right) => {
    const len = z1 - z0, zc = (z0 + z1) / 2;
    k.box(0.5, 1.8, len, x, 0.9, zc, SHELF, { collide: true, block: true });
    k.box(1.1, 0.1, len, x, 0.05, zc, BLACK);
    for (const [side, cats] of [[-1, left], [1, right]]) {
      LEVELS.forEach((y, li) => {
        k.box(0.3, 0.03, len, x + side * 0.4, y, zc, LEDGE, { collide: true });
        k.texBox(0.006, 0.04, len, x + side * 0.553, y - 0.005, zc, PRICES, { tile: 0.5 });
        stock.addRun(cats[li], x + side * 0.37, y + 0.016, z0 + 0.05, z1 - 0.05, side);
      });
      for (let z = z0 + 0.4; z < z1 - 0.3; z += 0.55) for (const y of [0.62, 1.12, 1.57]) k.spawns.push(new THREE.Vector3(x + side * 0.45, y, z + (y > 1 ? 0.2 : 0)));
      R(x + side * 0.25 - 0.004, z0, x + side * 0.25 + 0.004, z1, 0.14, 1.95, BLUE);
    }
    k.blockers.push({ x0: x - 0.56, x1: x + 0.56, z0, z1, y1: 1.8 });
  };
  const wallShelf = (x, z0, z1, dir, cats) => {
    const len = z1 - z0, zc = (z0 + z1) / 2;
    k.box(0.12, 2.0, len, x, 1.0, zc, SHELF, { collide: true }); k.box(0.55, 0.1, len, x + dir * 0.27, 0.05, zc, BLACK);
    LEVELS.forEach((y, li) => { k.box(0.4, 0.03, len, x + dir * 0.26, y, zc, LEDGE, { collide: true }); k.texBox(0.006, 0.04, len, x + dir * 0.463, y - 0.005, zc, PRICES, { tile: 0.5 }); stock.addRun(cats[li], x + dir * 0.3, y + 0.016, z0 + 0.05, z1 - 0.05, dir); });
    for (let z = z0 + 0.4; z < z1 - 0.3; z += 0.55) for (const y of [0.62, 1.12, 1.57]) k.spawns.push(new THREE.Vector3(x + dir * 0.36, y, z));
    k.blockers.push({ x0: Math.min(x, x + dir * 0.48), x1: Math.max(x, x + dir * 0.48), z0, z1, y1: 2 });
  };
  // an open multideck chiller along x (facing +z/-z) or along z (facing +x/-x); `tiers` 4 (tall) or 3 (low island)
  const chiller = (along, c, a0, a1, dir, cats, tag, { low = false } = {}) => {
    const len = a1 - a0, ac = (a0 + a1) / 2, P = (o, w, h, d, y, col, opts) => along === 'x' ? k.box(len * w, h, d, ac, y, c + dir * o, col, opts) : k.box(d, h, len * w, c + dir * o, y, ac, col, opts);
    const TOP = low ? 1.25 : 2.1, tiers = low ? [0.35, 0.72, 1.05] : [0.35, 0.75, 1.15, 1.55];
    P(0.05, 1, TOP, 0.1, TOP / 2, BLACK); P(0.35, 1, 0.3, 0.6, 0.15, BLACK, { collide: true });
    if (!low) { P(0.32, 1, 0.12, 0.66, 2.1, BLACK); P(0.6, 1, 0.03, 0.06, 2.02, 0xeaf6ff); }
    tiers.forEach((y, li) => {
      P(0.33 - li * (low ? 0.06 : 0), 1, 0.025, 0.52 - li * (low ? 0.12 : 0), y, 0xe8ecef, { collide: true });
      const pc = c + dir * (0.6 - li * (low ? 0.12 : 0)), pz = y - 0.005, run = 0.3 - li * (low ? 0.06 : 0);
      if (along === 'x') { k.texBox(len, 0.04, 0.006, ac, pz, pc, PRICES, { tile: 0.5 }); stock.addRunX(cats[li], c + dir * run, y + 0.013, a0 + 0.05, a1 - 0.05, dir); }
      else { k.texBox(0.006, 0.04, len, pc, pz, ac, PRICES, { tile: 0.5 }); stock.addRun(cats[li], c + dir * run, y + 0.013, a0 + 0.05, a1 - 0.05, dir); }
      for (let a = a0 + 0.35; a < a1 - 0.3; a += 0.6) k.spawns.push(along === 'x' ? new THREE.Vector3(a, y + 0.07, c + dir * (run + 0.12)) : new THREE.Vector3(c + dir * (run + 0.12), y + 0.07, a));
    });
    if (!low) for (let a = a0 + 1; a < a1; a += 2) k.lamp(along === 'x' ? a : c + dir * 0.5, 1.98, along === 'x' ? c + dir * 0.5 : a, 0xe0f4ff, 0.05, false);
    if (along === 'x') blk(a0, Math.min(c, c + dir * 0.68), a1, Math.max(c, c + dir * 0.68), TOP); else blk(Math.min(c, c + dir * 0.68), a0, Math.max(c, c + dir * 0.68), a1, TOP);
    if (tag && !low) { P(0.63, Math.min(1, 2.4 / len), 0.36, 0.03, 2.33, BLUE); for (const o of [-1.0, 1.0]) if (along === 'x') k.box(0.02, 0.3, 0.02, ac + o, 2.3, c + dir * 0.63, 0x888888); else k.box(0.02, 0.3, 0.02, c + dir * 0.63, 2.3, ac + o, 0x888888);
      if (along === 'x') sign(tag, 2.2, 0.32, [ac, 2.33, c + dir * 0.6475], [0, dir > 0 ? 0 : Math.PI, 0], BS); else sign(tag, 2.2, 0.32, [c + dir * 0.6475, 2.33, ac], [0, dir * Math.PI / 2, 0], BS); }
  };
  // a stack of drinks / crisps / chocolate on a pallet at an aisle end, with a price board on a pole
  const STACKS = { can: ['KOLA 24 CANS £6.99', 0.125, 6], bottle: ['KOLA 2L 2 FOR £3', 0.32, 3], crisps: ['CRISPS MULTIPACK £1.49', 0.27, 3], choc: ['CHOCOLATE 3 FOR £2', 0.17, 4], wine: ['WINE £4.99', 0.345, 2] };
  const endStack = (x, z, cat, dir) => {      // a slim stack of boxes/packs against the end of an aisle (dir: which way it faces)
    const [txt, lh] = STACKS[cat], layers = Math.max(2, Math.min(4, Math.floor(0.62 / (lh + 0.008)))), cz = z + dir * 0.17;
    R(x - 0.48, cz - 0.16, x + 0.48, cz + 0.16, 0.06, 0.03, 0xc8a070);
    R(x - 0.47, cz - 0.15, x + 0.47, cz + 0.15, 0.02, 0.07, 0xd6b48a, { collide: true });
    stock.addStack(cat, x, cz, 0.88, 0.26, 0.08, layers, lh + 0.008, dir, cat === 'bottle' ? 0.1 : cat === 'can' ? 0.072 : cat === 'crisps' ? 0.11 : 0.1);
    const top = 0.09 + layers * (lh + 0.008);
    R(x - 0.47, cz - 0.15, x + 0.47, cz + 0.15, 0.004, top, 0xe8f0f4);
    k.box(0.02, 0.26, 0.02, x, top + 0.02, cz, 0x888888); k.box(0.52, 0.24, 0.02, x, top + 0.2, cz, 0xffd400); sign(txt, 0.5, 0.22, [x, top + 0.2, cz + dir * 0.0115], [0, dir > 0 ? 0 : Math.PI, 0], { bg: '#ffd400', fg: '#1e4ea8', border: null, size: 40 });
    k.spawns.push(new THREE.Vector3(x, top + 0.1, cz));
    blk(x - 0.48, cz - 0.16, x + 0.48, cz + 0.16, top);
  };

  // ---- back wall: MILK, then more fridges
  chiller('x', -14.62, -10.9, -6.1, 1, ['milk', 'milk', 'milk', 'yog'], 'MILK');
  chiller('x', -14.62, -6.0, 3.25, 1, ['meat', 'yog', 'jar', 'yog'], 'CHEESE, HAM & YOGHURTS');
  sign('MILK: 4 PINTS FOR £1.45 (RONNIE: "IS THAT ONE SERVING?")', 2.4, 0.4, [-8.5, 2.75, -14.61], [0, 0, 0], { bg: '#fff', fg: '#1e4ea8', border: '#ffd400', size: 40 });
  // ---- top half: all low, so you can see right over it
  const ZA0 = -12.3, ZA1 = -5.9, ZB0 = -3.5, ZB1 = 3.5;
  const AX = -7.7, BX = -4.5, CX = -1.3;
  // chest freezers along the left wall
  const chest = (x0, x1, z0, z1, dir) => {
    R(x0, z0, x1, z1, 0.85, 0.425, WHITE, { collide: true }); R(x0 - 0.02, z0, x1 + 0.02, z1, 0.08, 0.04, BLACK);
    R(x0 + 0.04, z0 + 0.04, x1 - 0.04, z1 - 0.04, 0.02, 0.87, 0xbfe3f5);
    const cx = (x0 + x1) / 2; stock.addStack('froze', cx, (z0 + z1) / 2, x1 - x0 - 0.2, z1 - z0 - 0.2, 0.5, 2, 0.06, dir, 0.17);
    k.texBox(0.006, 0.05, z1 - z0, dir > 0 ? x1 + 0.005 : x0 - 0.005, 0.78, (z0 + z1) / 2, PRICES, { tile: 0.5 });
    for (let z = z0 + 0.4; z < z1 - 0.3; z += 0.6) k.spawns.push(new THREE.Vector3(cx, 0.95, z));
    blk(x0, z0, x1, z1, 0.9);
  };
  // tall upright freezers with glass doors: shelves of frozen food lit inside, a frosty glow, handles, a header strip
  const freezerBank = (x, z0, z1, dir, cats = ['froze', 'froze', 'froze', 'froze']) => {      // a bank against x (its back), doors facing dir (+1 / -1 along x)
    const D = 0.72, H2 = 2.15, len = z1 - z0, zc = (z0 + z1) / 2, fx = x + dir * D;
    R(Math.min(x, fx), z0, Math.max(x, fx), z1, 0.12, 0.06, BLACK);                                         // plinth
    R(Math.min(x, fx), z0, Math.max(x, fx), z1, 0.08, H2 + 0.04, WHITE);                                     // top
    R(Math.min(x, x + dir * 0.06), z0, Math.max(x, x + dir * 0.06), z1, H2, H2 / 2, 0xe8eef2);               // back
    for (const z of [z0, z1]) R(Math.min(x, fx), z - 0.03, Math.max(x, fx), z + 0.03, H2, H2 / 2, WHITE);   // ends
    [0.35, 0.78, 1.21, 1.64].forEach((y, li) => { R(Math.min(x, fx - dir * 0.08), z0 + 0.04, Math.max(x, fx - dir * 0.08), z1 - 0.04, 0.025, y, 0xd8e4ea, { collide: true });
      stock.addRun(cats[li], x + dir * 0.35, y + 0.013, z0 + 0.08, z1 - 0.08, dir); if (cats[li] !== 'milk') stock.addRun(cats[li], x + dir * 0.18, y + 0.013, z0 + 0.08, z1 - 0.08, dir);
      k.texBox(0.006, 0.035, len - 0.08, fx - dir * 0.08, y - 0.005, zc, PRICES, { tile: 0.5 });
      for (let z = z0 + 0.4; z < z1 - 0.3; z += 0.7) k.spawns.push(new THREE.Vector3(x + dir * 0.45, y + 0.08, z)); });
    // the glass doors: frames, mullions, handles, frosty glass
    const nd = Math.max(1, Math.round(len / 0.75)), dw = len / nd;
    const g = new THREE.Mesh(new THREE.PlaneGeometry(len - 0.06, H2 - 0.18), glassMat); g.position.set(fx + dir * 0.005, 0.09 + (H2 - 0.18) / 2 + 0.03, zc); g.rotation.y = dir * Math.PI / 2; g.renderOrder = 3; scene.add(g);
    for (let i = 0; i <= nd; i++) R(fx - 0.025, z0 + i * dw - 0.025, fx + 0.025, z0 + i * dw + 0.025, H2 - 0.1, H2 / 2 + 0.03, 0x2a2c30);
    for (const y of [0.13, H2 - 0.03]) R(fx - 0.025, z0, fx + 0.025, z1, 0.05, y, 0x2a2c30);
    for (let i = 0; i < nd; i++) k.box(0.03, 0.55, 0.025, fx + dir * 0.04, 1.1, z0 + i * dw + dw - 0.09, 0xc8ccd0);
    for (let z = z0 + 0.4; z < z1; z += 0.9) k.lamp(fx - dir * 0.06, H2 - 0.12, z, 0xe0f4ff, 0.05, false);
    k.pool(fx + dir * 0.8, 0, zc, Math.min(4, len), 0xdff2ff);
    R(Math.min(fx, fx + dir * 0.02), z0, Math.max(fx, fx + dir * 0.02), z1, 0.18, H2 + 0.15, BLUE);           // header strip
    blk(Math.min(x, fx) - 0.02, z0, Math.max(x, fx) + 0.02, z1, H2 + 0.1);
  };
  freezerBank(-10.95, -13.6, -6.2, 1);
  // the freezer island: chest freezers back to back
  freezerBank(AX, ZA0, ZA1, -1); freezerBank(AX, ZA0, ZA1, 1);                          // the freezer aisle: tall, doors both sides
  // the MIDDLE AISLE: wire basket bins on a low plinth, special buys tipped in, price cards on sticks
  const CARDS = ['AIR FRYER £39.99', 'DRILL SET £24.99', 'SNORKEL SET £9.99', 'HEATED BLANKET £29.99', 'SLOW COOKER £19.99', 'SKI GOGGLES £12.99', 'WELDING MASK £14.99', 'PRESSURE WASHER £59.99', 'KITCHEN ROLL 4 £1.99', 'PADDLING POOL £7.99'];
  const cardTex = CARDS.map(t => canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#ffd400'; g.fillRect(0, 0, w, h); g.fillStyle = '#1e4ea8'; g.fillRect(0, 0, w, 30); g.fillStyle = '#fff'; g.font = `900 20px ${FONT}`; g.textAlign = 'center'; g.fillText('MIDDLE OF LIDL', w / 2, 22); const [name, price] = [t.slice(0, t.lastIndexOf(' ')), t.slice(t.lastIndexOf(' ') + 1)]; g.fillStyle = '#1e4ea8'; g.font = `900 22px ${FONT}`; g.fillText(name, w / 2, 58, w - 12); g.fillStyle = '#e53935'; g.font = `900 40px ${FONT}`; g.fillText(price, w / 2, 106); }));
  const WIRE = 0x9aa0a8;
  const baskets = (x, z0, z1) => {
    const len = z1 - z0, zc = (z0 + z1) / 2, W = 1.1, FL = 0.42, TOPY = 0.92;
    R(x - W / 2, z0, x + W / 2, z1, 0.12, 0.06, BLACK);                                                         // plinth
    R(x - W / 2 + 0.03, z0 + 0.03, x + W / 2 - 0.03, z1 - 0.03, 0.3, 0.27, 0x4a4e54);                          // frame under the bins
    const n = Math.max(2, Math.round(len / 1.25)), bl = len / n;
    for (let i = 0; i < n; i++) {
      const b0 = z0 + i * bl + 0.03, b1 = b0 + bl - 0.06, bc = (b0 + b1) / 2;
      R(x - W / 2 + 0.03, b0, x + W / 2 - 0.03, b1, 0.012, FL, WIRE, { collide: true });                      // mesh floor
      for (const y of [FL + 0.16, FL + 0.33, TOPY]) { R(x - W / 2 + 0.02, b0, x - W / 2 + 0.035, b1, 0.012, y, WIRE); R(x + W / 2 - 0.035, b0, x + W / 2 - 0.02, b1, 0.012, y, WIRE); R(x - W / 2 + 0.02, b0, x + W / 2 - 0.02, b0 + 0.015, 0.012, y, WIRE); R(x - W / 2 + 0.02, b1 - 0.015, x + W / 2 - 0.02, b1, 0.012, y, WIRE); }
      for (let z = b0; z <= b1 + 1e-3; z += 0.08) for (const sx of [-1, 1]) k.box(0.008, TOPY - FL, 0.008, x + sx * (W / 2 - 0.028), (FL + TOPY) / 2, z, WIRE);       // the wire uprights
      for (let xx = x - W / 2 + 0.03; xx <= x + W / 2 - 0.02; xx += 0.08) for (const zz of [b0 + 0.008, b1 - 0.008]) k.box(0.008, TOPY - FL, 0.008, xx, (FL + TOPY) / 2, zz, WIRE);
      R(x - 0.008, b0, x + 0.008, b1, TOPY - FL, (FL + TOPY) / 2, WIRE);                                        // divider down the middle
      for (const side of [-1, 1]) {
        const cat = ['buy', 'buy', 'roll', 'buy', 'buy'][Math.floor(rnd() * 5)];
        stock.addStack(cat, x + side * 0.27, bc, 0.44, bl - 0.16, FL + 0.01, cat === 'roll' ? 2 : 2, cat === 'roll' ? 0.25 : 0.33, side, cat === 'roll' ? 0.2 : 0.3);
        const tex = cardTex[Math.floor(rnd() * cardTex.length)];
        k.box(0.012, 0.5, 0.012, x + side * (W / 2 - 0.05), TOPY + 0.2, bc, 0x666666);
        k.box(0.012, 0.19, 0.36, x + side * (W / 2 - 0.05), TOPY + 0.42, bc, 0xffd400);                                     // the card's stiff backing
        sign('card', 0.34, 0.17, [x + side * (W / 2 - 0.05 + 0.0075), TOPY + 0.42, bc], [0, side * Math.PI / 2, 0], { tex });
        k.spawns.push(new THREE.Vector3(x + side * 0.27, TOPY + 0.15, bc + (rnd() - 0.5) * 0.4));
      }
    }
    blk(x - W / 2, z0, x + W / 2, z1, TOPY);
  };
  baskets(BX, ZA0, ZA1); baskets(CX, ZA0, ZA1);
  // the meat: a low double-sided chiller island
  freezerBank(0.85, ZA0 + 0.3, ZA1 - 0.3, -1, ['meat', 'meat', 'meat', 'meat']); freezerBank(0.85, ZA0 + 0.3, ZA1 - 0.3, 1, ['meat', 'yog', 'meat', 'jar']);   // tall glass-door fridges, both sides
  // the right-hand wall: dairy & salad fridges, the MONSTOR fridge
  freezerBank(3.32, -11.9, -6.0, -1, ['yog', 'milk', 'meat', 'jar']);                   // dairy, salads & ready meals: glass-door fridges
  // the MONSTOR fridge: black cabinet, lit green inside, three shelves packed with real cans behind a glass door
  { const x1 = 3.32, x0 = 2.7, z0 = -14.0, z1 = -12.3, zc = (z0 + z1) / 2, FH = 2.0;
    R(x0, z0, x1, z1, 0.12, 0.06, BLACK); R(x0, z0, x1, z1, 0.1, FH - 0.05, BLACK);                                  // plinth, top
    R(x1 - 0.05, z0, x1, z1, FH, FH / 2, 0x0e2a12); for (const z of [z0 + 0.03, z1 - 0.03]) R(x0, z - 0.03, x1, z + 0.03, FH, FH / 2, BLACK);
    [0.16, 0.6, 1.04, 1.48].forEach(y => { R(x0 + 0.05, z0 + 0.06, x1 - 0.05, z1 - 0.06, 0.02, y, 0x9aa0a6, { collide: true });
      stock.addRun('can', x0 + 0.3, y + 0.012, z0 + 0.1, z1 - 0.1, -1);
      for (let z = z0 + 0.3; z < z1 - 0.2; z += 0.4) k.spawns.push(new THREE.Vector3(x0 + 0.2, y + 0.1, z)); });
    for (const y of [0.45, 0.9, 1.35, 1.8]) k.lamp(x0 + 0.08, y, zc, 0x6aff4a, 0.05, false);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0 - 0.12, FH - 0.25), glassMat); gl.position.set(x0 - 0.005, 0.12 + (FH - 0.25) / 2, zc); gl.rotation.y = -Math.PI / 2; gl.renderOrder = 3; scene.add(gl);
    for (const z of [z0 + 0.03, zc, z1 - 0.03]) R(x0 - 0.03, z - 0.03, x0, z + 0.03, FH - 0.15, FH / 2, 0x111111);
    for (const y of [0.13, FH - 0.12]) R(x0 - 0.03, z0, x0, z1, 0.05, y, 0x111111);
    for (const z of [zc - 0.08, zc + 0.08]) k.box(0.03, 0.6, 0.025, x0 - 0.05, 1.05, z, 0xc8ccd0);
    R(x0 - 0.04, z0, x0, z1, 0.28, FH + 0.1, BLACK);
    const hdr = canvasTex(512, 96, (g, w, h) => { g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, w, h); g.fillStyle = '#39ff14'; g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MONSTOR', w / 2, h / 2 + 2); g.strokeStyle = '#39ff14'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12); });
    k.label('MONSTOR', z1 - z0 - 0.1, 0.24, [x0 - 0.045, FH + 0.1, zc], [0, -Math.PI / 2, 0], { tex: hdr, glow: true });
    blk(x0 - 0.06, z0, x1, z1, FH + 0.2);
  }
  k.pool(2.5, 0, -13.1, 2.4, 0x9fffb0);
  // ---- bottom half: alcohol, toiletries, chocolate sweets & crisps, veg
  wallShelf(-10.95, ZB0, ZB1, 1, ['can', 'wine', 'wine', 'bottle']);
  shelf(AX, ZB0, ZB1, ['wine', 'bottle', 'wine', 'wine'], ['toil', 'toil', 'roll', 'toil']);
  shelf(BX, ZB0, ZB1, ['toil', 'roll', 'toil', 'toil'], ['choc', 'sweets', 'crisps', 'choc']);
  shelf(CX, ZB0, ZB1, ['crisps', 'choc', 'sweets', 'crisps'], ['cereal', 'loaf', 'tube', 'cereal']);
  sign('ALCOHOL — CHALLENGE 25 (RONNIE: CHALLENGE 25 SAUSAGE ROLLS)', 2.4, 0.4, [-10.87, 2.45, 0], [0, Math.PI / 2, 0], { bg: '#fff', fg: '#1e4ea8', border: '#ffd400', size: 40 });
  // stacks at the ends of the aisles, along the cross aisle (and the front)
  endStack(AX, ZA1, 'can', 1); endStack(BX, ZA1, 'bottle', 1); endStack(CX, ZA1, 'crisps', 1);
  endStack(AX, ZB0, 'choc', -1); endStack(BX, ZB0, 'can', -1); endStack(CX, ZB0, 'wine', -1);
  endStack(AX, ZB1, 'bottle', 1); endStack(BX, ZB1, 'choc', 1); endStack(CX, ZB1, 'crisps', 1);
  // fruit and veg: black crates on stands, the produce itself real (pick it up... it's veg, Ronnie)
  const PRODUCE = { apple: 0.036, orange: 0.037, pear: 0.04, tomato: 0.03, pepper: 0.04, banana: 0.04, cucumber: 0.025, carrot: 0.03, broccoli: 0.05, cauliflower: 0.05, celery: 0.04, sprout: 0.02 };
  const fillCrate = (type, cx, cz, w, d, y, tilt = 0, rotY = 0) => {
    const r = PRODUCE[type] || 0.04, step = r * 2.05, nx = Math.max(1, Math.floor(w / step)), nz = Math.max(1, Math.floor(d / step));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const lx = -w / 2 + step * (i + 0.5), lz = -d / 2 + step * (j + 0.5), c = Math.cos(rotY), s = Math.sin(rotY);
      dorm.add(type, cx + lx * c + lz * s, y + r + lz * Math.sin(tilt) * 0, cz - lx * s + lz * c, rnd() * 6.28, 0);
    }
  };
  const crates = (x, z, w, d, types, rows) => {
    R(x - w / 2, z - d / 2, x + w / 2, z + d / 2, 0.66, 0.33, BLACK, { collide: true, block: true });
    const cw = w / 2, cd = d / rows;
    types.forEach((t, i) => { const cx = x - w / 4 + (i % 2) * cw, cz = z - d / 2 + cd / 2 + Math.floor(i / 2) * cd;
      R(cx - cw / 2 + 0.03, cz - cd / 2 + 0.03, cx + cw / 2 - 0.03, cz + cd / 2 - 0.03, 0.02, 0.67, 0x3a3c40, { collide: true });
      for (const [a, b, c2, d2] of [[-1, -1, 1, -1], [-1, 1, 1, 1], [-1, -1, -1, 1], [1, -1, 1, 1]]) R(cx + a * (cw / 2 - 0.03), cz + b * (cd / 2 - 0.03), cx + c2 * (cw / 2 - 0.03) + 0.015, cz + d2 * (cd / 2 - 0.03) + 0.015, 0.12, 0.74, 0x2a2c30);
      fillCrate(t, cx, cz, cw - 0.12, cd - 0.12, 0.68); });
    k.texBox(w, 0.05, 0.006, x, 0.66, z + d / 2 + 0.003, PRICES, { tile: 0.5 }); k.texBox(w, 0.05, 0.006, x, 0.66, z - d / 2 - 0.003, PRICES, { tile: 0.5 });
  };
  crates(0.95, -2.3, 0.95, 2.0, ['broccoli', 'carrot', 'cauliflower', 'pepper', 'cucumber', 'tomato'], 3);
  crates(0.95, 0.15, 0.95, 2.0, ['sprout', 'celery', 'pepper', 'carrot', 'broccoli', 'tomato'], 3);
  crates(0.95, 2.45, 0.95, 1.6, ['apple', 'orange', 'banana', 'pear'], 2);
  // the fruit & veg wall along the right-hand wall: three angled tiers of crates under a mirror
  { const x = 3.32, z0 = -3.6, z1 = 2.4, types = ['apple', 'orange', 'banana', 'pear', 'tomato', 'pepper', 'carrot', 'broccoli', 'cucumber', 'cauliflower'];
    R(x - 0.75, z0, x, z1, 0.3, 0.15, BLACK, { block: true }); blk(x - 0.8, z0, x, z1, 1.6);
    [[0.42, 0.7], [0.82, 0.5], [1.2, 0.3]].forEach(([y, d], ti) => {
      R(x - d - 0.05, z0, x, z1, 0.04, y - 0.02, 0x2a2c30, { collide: true });
      k.texBox(0.006, 0.05, z1 - z0, x - d - 0.055, y - 0.02, (z0 + z1) / 2, PRICES, { tile: 0.5 });
      for (let z = z0, i = ti * 3; z < z1 - 0.3; z += 0.6, i++) { for (const [a0, b0, a1, b1] of [[x - d - 0.02, z + 0.03, x - 0.02, z + 0.05], [x - d - 0.02, z + 0.55, x - 0.02, z + 0.57], [x - d - 0.02, z + 0.03, x - d, z + 0.57], [x - 0.04, z + 0.03, x - 0.02, z + 0.57]]) R(a0, b0, a1, b1, 0.1, y + 0.05, 0x3a3c40); fillCrate(types[i % types.length], x - d / 2 - 0.02, z + 0.3, d - 0.1, 0.48, y + 0.02); }
    });
    k.label('mirror', z1 - z0, 0.6, [x - 0.02, 1.85, (z0 + z1) / 2], [0, -Math.PI / 2, 0], { tex: mirrorTex(), glow: true });
    sign('FRESH FRUIT & VEG — RONNIE HAS NEVER BEEN IN THIS SECTION', 3.2, 0.35, [x - 0.03, 2.45, (z0 + z1) / 2], [0, -Math.PI / 2, 0], { bg: '#2e7d32', fg: '#fff', border: '#ffd400', size: 40 });
    k.spawns.push(new THREE.Vector3(x - 0.3, 1.45, -1.0));
  }
  sign('BANANAS: 5 FOR 50p (RONNIE: "WHAT\'S A BANANA?")', 0.9, 0.3, [0.95, 0.42, 3.256], [0, 0, 0], { bg: '#ffd400', fg: '#1e4ea8', border: null, size: 36 });
  // ---- the hanging aisle signs
  hang('FREEZERS', -9.0, -9.1, 1.8, 0); hang('MIDDLE AISLE', (AX + BX) / 2, -9.1, 2.0, 0); hang('MIDDLE AISLE', (BX + CX) / 2, -9.1, 2.0, 0); hang('FRESH MEAT', 2.2, -9.1, 1.6, 0);
  hang('ALCOHOL', -9.2, 0, 1.8, 0); hang('TOILETRIES', (AX + BX) / 2, 0, 1.8, 0); hang('CHOCOLATE, SWEETS & CRISPS', (BX + CX) / 2, 0, 2.6, 0); hang('FRUIT & VEG', 2.1, 0, 1.6, 0);
  { const t = canvasTex(1024, 256, (g, w, h) => { g.fillStyle = '#ffd400'; g.fillRect(0, 0, w, h); g.fillStyle = '#1e4ea8'; g.fillRect(0, 0, w, 40); g.fillRect(0, h - 40, w, 40); g.fillStyle = '#1e4ea8'; g.font = `900 110px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MIDDLE OF LIDL', w / 2, h / 2 + 4); });
    const mx = (BX + CX) / 2, mz = -11.4; for (const dx of [-1.6, 1.6]) k.box(0.012, 0.5, 0.012, mx + dx, H - 0.25, mz, 0x333333);
    k.box(3.68, 0.94, 0.03, mx, H - 0.95, mz, 0x1e4ea8);
    for (const ry of [0, Math.PI]) sign('MIDDLE OF LIDL', 3.6, 0.9, [mx, H - 0.95, mz + (ry ? -0.0165 : 0.0165)], [0, ry, 0], { tex: t, glow: true }); }

  // ================================================================ the bakery: bins in front of the glass, the bake-off room behind
  const BAKE_TYPES = ['croissant', 'painchoc', 'muffin', 'swirl', 'icedbun', 'pretzel', 'doughnut', 'cookie', 'sausageroll'];
  const BAKE_SIZE = { croissant: 0.03, painchoc: 0.03, muffin: 0.038, swirl: 0.015, icedbun: 0.03, pretzel: 0.012, doughnut: 0.03, cookie: 0.01, sausageroll: 0.028, baguette: 0.025 };
  const BAKE_NAME = { croissant: 'CROISSANT 39p', painchoc: 'PAIN AU CHOC 45p', muffin: 'CHOC MUFFIN 69p', swirl: 'CINNAMON SWIRL 55p', icedbun: 'ICED BUN 49p', pretzel: 'PRETZEL 59p', doughnut: 'DOUGHNUT 35p', cookie: 'COOKIE 29p', sausageroll: 'SAUSAGE ROLL 49p', baguette: 'BAGUETTE 45p' };
  const bakeTags = {};
  const bakeTag = (t) => bakeTags[t] || (bakeTags[t] = canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#ffd400'; g.fillRect(0, 0, w, h); g.fillStyle = '#1e4ea8'; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(BAKE_NAME[t], w / 2, h / 2 + 2, w - 10); }));
  const WOODB = 0xc49a62, WOODD = 0x8a5a2a;
  let bi = 0;
  for (const [[ax, az], [bx, bz]] of [[G0, G1], [G1, G2]]) {
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = -uz, nz = ux, ry = Math.atan2(-dz, dx);
    // the glass screen (with a header above it), a blue BAKERY band, bins along the front
    glass((ax + bx) / 2, 1.4, (az + bz) / 2, L, 2.8, ry);
    k.box(L + 0.1, H - 2.8, 0.16, (ax + bx) / 2, 2.8 + (H - 2.8) / 2, (az + bz) / 2, WALL, { rot: [0, ry, 0] });
    k.box(L, 0.3, 0.02, (ax + bx) / 2 + nx * 0.09, 3.0, (az + bz) / 2 + nz * 0.09, BLUE, { rot: [0, ry, 0] });
    for (let t = 0; t <= L; t += Math.min(1.2, L)) k.box(0.06, 2.8, 0.06, ax + ux * t, 1.4, az + uz * t, CHROME);
    for (let s = 0; s <= L; s += 0.18) { const x = ax + ux * s, z = az + uz * s; blk(x - 0.1, z - 0.1, x + 0.1, z + 0.1, H); }
    sign('BAKERY', 1.6, 0.4, [(ax + bx) / 2 + nx * 0.11, 3.0, (az + bz) / 2 + nz * 0.11], [0, ry, 0], BS);
    for (let t = 0.5; t < L - 0.45; t += 0.66) {
      const x = ax + ux * t + nx * 0.3, z = az + uz * t + nz * 0.3, at = (lx, lz) => [x + ux * lx + nx * lz, z + uz * lx + nz * lz];
      const box = (w, h, d, lx, y, lz, col, opts) => { const [px, pz] = at(lx, lz); k.box(w, h, d, px, y, pz, col, { rot: [0, ry, 0], ...opts }); };
      box(0.62, 1.42, 0.06, 0, 0.71, -0.22, WOODD);                                                                  // back board
      for (const s of [-1, 1]) box(0.03, 1.42, 0.5, s * 0.3, 0.71, 0, WOODB);                                       // sides
      box(0.62, 0.3, 0.5, 0, 0.15, 0, WOODD);                                                                       // base
      blk(x - 0.32, z - 0.32, x + 0.32, z + 0.32, 1.42);
      if (bi % 5 === 4) {           // a tall basket of baguettes standing up
        box(0.56, 0.5, 0.44, 0, 0.55, 0, 0xb08050);
        for (let i = 0; i < 6; i++) { const [px, pz] = at(-0.2 + (i % 3) * 0.2, -0.08 + Math.floor(i / 3) * 0.16); dorm.add('baguette', px, 0.85 + (i % 2) * 0.05, pz, ry, 0, 0, Math.PI / 2 - 0.15 + (i % 3) * 0.1); }
        sign('tag', 0.3, 0.075, [at(0, 0.226)[0], 0.62, at(0, 0.226)[1]], [0, ry, 0], { tex: bakeTag('baguette') });
      } else {
        [0.35, 0.78, 1.2].forEach((y, ti) => {
          const type = BAKE_TYPES[(bi * 3 + ti) % BAKE_TYPES.length], h = BAKE_SIZE[type] || 0.03;
          box(0.56, 0.02, 0.44, 0, y, 0, 0xf2e6d0);                                                                  // tray
          box(0.56, 0.06, 0.012, 0, y + 0.04, 0.225, 0xcfe8f2);                                                       // a low perspex lip
          k.colliders.push({ min: new THREE.Vector3(x - 0.2, y - 0.02, z - 0.2), max: new THREE.Vector3(x + 0.2, y + 0.012, z + 0.2) });
          for (let i = 0; i < 6; i++) { const [px, pz] = at(-0.18 + (i % 3) * 0.18, -0.1 + Math.floor(i / 3) * 0.2); dorm.add(type, px, y + 0.012 + h + (i % 2) * 0.004, pz, ry + (rnd() - 0.5) * 0.6, 0); }
          sign('tag', 0.3, 0.055, [at(0, 0.2335)[0], y + 0.04, at(0, 0.2335)[1]], [0, ry, 0], { tex: bakeTag(type) });
        });
      }
      bi++;
    }
    k.lamp((ax + bx) / 2 + nx * 0.6, 2.4, (az + bz) / 2 + nz * 0.6, 0xffd8a0, 0.08);
  }
  for (const [px, pz] of [G0, G1, G2]) { k.box(0.34, H, 0.34, px, H / 2, pz, WALL, { rot: [0, Math.PI / 4, 0] }); k.box(0.36, 0.3, 0.36, px, 3.0, pz, BLUE, { rot: [0, Math.PI / 4, 0] }); blk(px - 0.2, pz - 0.2, px + 0.2, pz + 0.2, H); }   // corners joined up
  sign('IN-STORE BAKERY — FRESH EVERY 2 HOURS (RONNIE: EVERY 2 MINUTES)', 3.4, 0.36, [8.9, 3.45, 7.74], [0, Math.atan2(-(G2[1] - G1[1]), G2[0] - G1[0]), 0], { bg: '#fff3e0', fg: '#8a4a10', border: '#ffd400', size: 40, glow: true });
  for (const [x, z] of [[4.4, 5.6], [8.5, 9.1]]) k.pool(x, 0, z, 2.4, 0xffd8a0);
  // the bake-off room: deck ovens glowing, rack trolleys of trays, a proving cabinet, the bench, flour
  { const STEEL2 = 0xc8ccd2, oven = ovenTex();
    const deckOven = (x, z, ry) => {
      const c = Math.cos(ry), s = Math.sin(ry), at = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
      k.box(1.3, 1.9, 0.9, x, 0.95, z, STEEL2, { rot: [0, ry, 0] });
      for (const y of [0.5, 1.0, 1.5]) { const [px, pz] = at(0, 0.455); k.label('oven', 1.1, 0.36, [px, y, pz], [0, ry, 0], { tex: oven, glow: true }); const [hx, hz] = at(0, 0.48); k.box(0.9, 0.025, 0.03, hx, y + 0.22, hz, 0x333333, { rot: [0, ry, 0] }); k.halo(px + s * 0.1, y, pz + c * 0.1, 0.9, 0xff9a40); }
      const [px, pz] = at(0.5, 0.46); k.box(0.12, 0.2, 0.02, px, 1.8, pz, 0x111111, { rot: [0, ry, 0] });
      blk(x - 0.65, z - 0.65, x + 0.65, z + 0.65, 1.9);
    };
    deckOven(8.0, 0.0, -Math.PI / 2); deckOven(8.0, 1.5, -Math.PI / 2); deckOven(8.0, 3.0, -Math.PI / 2);
    deckOven(9.75, 5.12, 0);
    // a rack oven (tall, the door open a crack) and a proving cabinet against the stock-room wall
    R(3.6, -1.32, 4.9, -0.2, 2.4, 1.2, STEEL2, { block: true }); k.label('oven', 0.7, 1.6, [4.25, 1.1, -0.19], [0, 0, 0], { tex: oven, glow: true }); k.halo(4.25, 1.1, 0.0, 1.4, 0xff9a40);
    R(5.1, -1.32, 5.9, -0.6, 2.0, 1.0, STEEL2, { block: true }); R(5.15, -0.6, 5.85, -0.58, 1.7, 1.0, 0xcfe8f2);
    sign('PROVING', 0.5, 0.1, [5.5, 1.925, -0.595], [0, 0, 0], { bg: '#fff', fg: '#111', border: null, size: 50 });
    // rack trolleys of trays (the bread on them is real too)
    const rack = (x, z, types) => {
      for (const dx of [-0.3, 0.3]) for (const dz of [-0.35, 0.35]) k.box(0.025, 1.75, 0.025, x + dx, 0.9, z + dz, STEEL2);
      for (let i = 0; i < 9; i++) { const y = 0.2 + i * 0.17; R(x - 0.3, z - 0.35, x + 0.3, z + 0.35, 0.012, y, 0x6a6e74, { collide: true });
        if (i % 2 === 0) { const type = types[(i / 2) % types.length]; for (let j = 0; j < 6; j++) dorm.add(type, x - 0.18 + (j % 3) * 0.18, y + 0.006 + (BAKE_SIZE[type] || 0.03), z - 0.2 + Math.floor(j / 3) * 0.3, rnd() * 6.28, 0); } }
      for (const dx of [-0.25, 0.25]) for (const dz of [-0.3, 0.3]) k.cyl(0.03, 0.03, 0.04, x + dx, 0.03, z + dz, 0x222222, 8);
      blk(x - 0.33, z - 0.38, x + 0.33, z + 0.38, 1.8);
    };
    rack(5.0, 1.5, ['croissant', 'painchoc', 'muffin']); rack(6.6, 3.4, ['swirl', 'icedbun', 'pretzel']); rack(9.3, 6.6, ['doughnut', 'croissant', 'cookie']);
    // the stainless bench with dough, a rolling pin, flour, baguettes cooling
    R(5.6, -0.1, 7.2, 0.6, 0.04, 0.9, STEEL2, { collide: true }); for (const [x, z] of [[5.65, -0.05], [7.15, -0.05], [5.65, 0.55], [7.15, 0.55]]) k.box(0.04, 0.88, 0.04, x, 0.44, z, STEEL2);
    R(5.7, 0.0, 7.1, 0.5, 0.02, 0.4, STEEL2); blk(5.6, -0.1, 7.2, 0.6, 0.92);
    k.parts.push(...[]);
    for (let i = 0; i < 3; i++) k.cyl(0.08, 0.09, 0.05, 5.9 + i * 0.25, 0.945, 0.2, 0xf4e6c8, 14);          // dough balls
    k.cyl(0.025, 0.025, 0.42, 6.7, 0.945, 0.3, 0xc8a070, 10); for (let i = 0; i < 4; i++) dorm.add('baguette', 6.2 + i * 0.05, 0.945, 0.45 - i * 0.06, 0.2, 0);
    for (const [x, z] of [[3.7, 1.6], [3.7, 2.1], [4.15, 1.75]]) { k.box(0.4, 0.55, 0.3, x, 0.28, z, 0xe8dcc0, { rot: [0, 0.3, 0] }); k.box(0.36, 0.08, 0.26, x, 0.6, z, 0xd8c8a8, { rot: [0, 0.3, 0] }); }
    blk(3.5, 1.4, 4.4, 2.3, 0.7);
    sign('BAKE-OFF — RONNIE IS NOT ALLOWED BEHIND THE GLASS', 2.0, 0.3, [5.8, 2.6, -1.3], [0, 0, 0], { bg: '#fff3e0', fg: '#8a4a10', border: '#ffd400', size: 38 });
    for (const [x, z] of [[5.5, 1.0], [8.2, 1.5], [9.8, 6.2]]) { k.lamp(x, H - 0.05, z, 0xfff1d8, 0.1); k.pool(x, 0, z, 2.6, 0xffd8a0); }
    k.light(6.2, 2.6, 2.0, 0xffb060, 3.5, 7);
    for (const z of [0.0, 1.5, 3.0]) k.spawns.push(new THREE.Vector3(6.4, 0.95, 0.2));
  }

  // ================================================================ front: self checkouts (silver rails), tills, magazines
  const RAIL = (x0, z0, x1, z1) => {
    const L = Math.hypot(x1 - x0, z1 - z0), along = Math.abs(x1 - x0) > Math.abs(z1 - z0), n = Math.max(1, Math.round(L / 1.2));
    for (let i = 0; i <= n; i++) { const t = i / n; k.cyl(0.025, 0.025, 1.0, x0 + (x1 - x0) * t, 0.5, z0 + (z1 - z0) * t, CHROME, 10); k.cyl(0.05, 0.05, 0.02, x0 + (x1 - x0) * t, 0.01, z0 + (z1 - z0) * t, CHROME, 10); }
    for (const y of [0.45, 1.0]) k.box(along ? L : 0.04, 0.04, along ? 0.04 : L, (x0 + x1) / 2, y, (z0 + z1) / 2, CHROME);
    blk(Math.min(x0, x1) - 0.05, Math.min(z0, z1) - 0.05, Math.max(x0, x1) + 0.05, Math.max(z0, z1) + 0.05, 1.0);
  };
  RAIL(-11, 5.27, -7.67, 5.27);
  k.box(2.7, 0.45, 0.02, -9.3, 2.4, 5.29, 0xffffff);
  sign('CUSTOMER SERVICE (RONNIE: PLEASE STOP ASKING FOR THE MANAGER\'S LUNCH)', 2.6, 0.35, [-9.3, 2.4, 5.3015], [0, 0, 0], { bg: '#fff', fg: '#1e4ea8', border: '#ffd400', size: 36 });
  k.box(0.02, 1.0, 0.02, -10.2, H - 0.5, 5.3, 0x333333); k.box(0.02, 1.0, 0.02, -8.4, H - 0.5, 5.3, 0x333333);
  RAIL(-9.93, 6.6, -7.13, 6.6); RAIL(-7.13, 6.6, -7.13, 7.8); RAIL(-7.13, 7.8, -4.93, 7.8); RAIL(-4.93, 7.8, -4.93, 12.33); RAIL(-11, 7.8, -8.33, 7.8);
  const kiosk = (x, z, dir) => {      // dir: which way the customer stands (+x or -x of it)
    const yaw = dir > 0 ? Math.PI / 2 : -Math.PI / 2, T = 0.32, at = (lx, lz) => [x + dir * lz, z - dir * lx];
    const P = (geo, col, lx, y, lz, tilt = 0) => { geo.rotateX(-tilt); geo.rotateY(yaw); const [px, pz] = at(lx, lz); geo.translate(px, y, pz); k.parts.push(part(geo, col)); };
    R(x - 0.3, z - 0.2, x + 0.3, z + 0.2, 0.88, 0.44, 0xe6e6e4, { block: true, collide: true });                                   // the scanner unit
    P(new THREE.BoxGeometry(0.34, 0.02, 0.28), 0x111111, 0, 0.895, 0.02); P(new THREE.BoxGeometry(0.3, 0.012, 0.24), 0x3a6a8a, 0, 0.902, 0.02);   // scanner glass
    P(new THREE.BoxGeometry(0.05, 0.42, 0.05), 0x666a70, 0, 1.1, -0.18);                                                           // the screen's stand
    P(new THREE.BoxGeometry(0.46, 0.34, 0.04), BLACK, 0, 1.42, -0.17, T);                                                          // the screen, facing you, leaning back a little
    { const m = k.label('scan', 0.42, 0.3, [0, 0, 0], [0, 0, 0], { tex: kioskTex(), glow: true }); const [px, pz] = at(0, -0.17 + 0.022 * Math.cos(T)); m.position.set(px, 1.42 + 0.022 * Math.sin(T), pz); m.rotation.order = 'YXZ'; m.rotation.set(-T, yaw, 0); }
    P(new THREE.BoxGeometry(0.1, 0.06, 0.02), 0x222222, 0.14, 1.05, 0.2); P(new THREE.BoxGeometry(0.08, 0.004, 0.06), 0x2a2a2a, 0.15, 0.885, 0.14);   // card reader, receipt slot
    // a shelf to put your basket/shopping down on one side, the bagging area with a bag on the other
    P(new THREE.BoxGeometry(0.42, 0.04, 0.4), 0xb8bcc2, -0.45, 0.62, 0.02); P(new THREE.BoxGeometry(0.04, 0.6, 0.36), 0x9aa0a6, -0.65, 0.3, 0.02);
    k.colliders.push({ min: new THREE.Vector3(Math.min(...[at(-0.66, -0.18)[0], at(-0.24, 0.22)[0]]), 0.6, Math.min(at(-0.66, -0.18)[1], at(-0.24, 0.22)[1])), max: new THREE.Vector3(Math.max(at(-0.66, -0.18)[0], at(-0.24, 0.22)[0]), 0.64, Math.max(at(-0.66, -0.18)[1], at(-0.24, 0.22)[1])) });
    P(new THREE.BoxGeometry(0.42, 0.03, 0.4), 0xd0d2d4, 0.45, 0.8, 0.02); P(new THREE.BoxGeometry(0.42, 0.8, 0.04), 0xc8cacc, 0.45, 0.4, -0.18);
    for (const lx of [0.27, 0.63]) P(new THREE.BoxGeometry(0.02, 0.4, 0.02), 0x9aa0a6, lx, 1.0, -0.15); P(new THREE.BoxGeometry(0.38, 0.02, 0.02), 0x9aa0a6, 0.45, 1.2, -0.15);   // bag hooks
    blk(Math.min(at(-0.68, -0.22)[0], at(0.68, 0.22)[0]), Math.min(at(-0.68, -0.22)[1], at(0.68, 0.22)[1]), Math.max(at(-0.68, -0.22)[0], at(0.68, 0.22)[0]), Math.max(at(-0.68, -0.22)[1], at(0.68, 0.22)[1]), 0.9);
    k.spawns.push(new THREE.Vector3(at(-0.45, 0.02)[0], 0.7, at(-0.45, 0.02)[1]));
    { const [px, pz] = at(0.45, 0.02); dorm.add('lidlbag', px, 0.815 + 0.16, pz, yaw); }
  };
  for (const z of [9.0, 10.4, 11.8, 13.2]) kiosk(-10.4, z, 1);
  for (const z of [9.0, 10.4, 11.8]) kiosk(-5.65, z, -1);
  hang('SELF CHECKOUTS', -8.0, 10.6, 2.4, 0);
  k.box(0.02, 0.36, 1.9, -4.93, 0.73, 10.0, 0x111133);
  sign('UNEXPECTED ITEM IN BAGGING AREA: RONNIE', 1.8, 0.3, [-4.9185, 0.73, 10.0], [0, Math.PI / 2, 0], { bg: '#003', fg: '#ff5252', border: null, size: 34, glow: true });
  [[-3.45, '3'], [-0.99, '2'], [1.53, '1']].forEach(([x, n]) => {
    R(x - 0.4, 7.15, x + 0.4, 12.3, 0.85, 0.425, BLACK, { collide: true, block: true });
    R(x - 0.3, 7.25, x + 0.3, 10.6, 0.02, 0.86, 0x111111); R(x - 0.32, 10.6, x + 0.32, 10.62, 0.06, 0.88, 0x555555);
    R(x - 0.38, 10.7, x + 0.38, 12.25, 0.03, 0.865, 0x8a8e94);
    R(x - 1.0, 10.7, x - 0.45, 11.4, 0.85, 0.425, 0x3a3c40, { block: true }); R(x - 0.95, 10.8, x - 0.5, 11.3, 0.3, 1.0, BLACK);       // the cashier's seat
    k.box(0.32, 0.22, 0.05, x - 0.25, 1.15, 10.55, BLACK); k.box(0.28, 0.18, 0.01, x - 0.25, 1.15, 10.52, 0x2a6ad8);
    k.cyl(0.025, 0.025, 1.9, x + 0.3, 1.8, 7.2, 0x888888, 6);
    k.box(0.46, 0.46, 0.02, x + 0.3, 2.85, 7.195, 0x1e4ea8);
    sign(n, 0.42, 0.42, [x + 0.3, 2.85, 7.2065], [0, 0, 0], { bg: '#1e4ea8', fg: '#ffd400', border: '#ffd400', size: 200 });
    sign(n, 0.42, 0.42, [x + 0.3, 2.85, 7.1835], [0, Math.PI, 0], { bg: '#1e4ea8', fg: '#ffd400', border: '#ffd400', size: 200 });
    k.spawns.push(new THREE.Vector3(x, 0.95, 8.0), new THREE.Vector3(x, 0.95, 9.2));
    R(x + 0.5, 7.15, x + 0.85, 8.2, 1.3, 0.65, WHITE, { collide: true, block: true });                                                // sweets by the queue
    for (const [i, y] of [0.45, 0.8, 1.15].entries()) { R(x + 0.84, 7.2, x + 0.86, 8.15, 0.14, y, [RED, YEL, 0x8e24aa][i]); stock.addRun(['choc', 'sweets', 'choc'][i], x + 0.92, y - 0.05, 7.22, 8.13, 1); }
    dorm.add('lidlbag', x - 0.1, 0.88 + 0.16, 11.9, 0.2); dorm.add('lidlbag', x + 0.15, 0.88 + 0.16, 11.45, -0.3);
  });
  k.box(0.94, 0.34, 0.02, -3.15, 2.35, 7.215, 0xffffff);
  sign('TILL 3: OLIVER (FILMING YOU)', 0.9, 0.3, [-3.15, 2.35, 7.2265], [0, 0, 0], { bg: '#fff', fg: '#1e4ea8', border: '#ffd400', size: 40 });
  // magazines: proper shelving (four sloping shelves, a magazine every 20cm, all of them throwable)
  const magShelf = (x0, x1, z, sides) => {      // along x at z, faces -z and/or +z
    const len = x1 - x0, xc = (x0 + x1) / 2;
    R(x0, z - 0.06, x1, z + 0.06, 1.55, 0.775, SHELF, { collide: true }); R(x0, z - 0.3, x1, z + 0.3, 0.1, 0.05, BLACK);
    for (const side of sides) [0.35, 0.7, 1.05, 1.4].forEach((y, i) => {
      R(x0, z + side * 0.06, x1, z + side * 0.28, 0.02, y, LEDGE, { collide: true }); R(x0, z + side * 0.27, x1, z + side * 0.29, 0.05, y + 0.03, CHROME);
      for (let x = x0 + 0.12; x < x1 - 0.08; x += 0.2) dorm.add('magazine', x, y + 0.02, z + side * 0.17, 0, Math.floor(rnd() * 8), side * 0.35, 0);
    });
    blk(x0, z - 0.3, x1, z + 0.3, 1.55);
  };
  magShelf(3.45, 7.0, 12.2, [1]);                 // magazines on the exit-lane side only
  { const x = 3.4, z0 = 8.3, z1 = 12.1;      // along the end of the tills, facing into the entrance and exit side
    R(x - 0.06, z0, x + 0.06, z1, 1.55, 0.775, SHELF, { collide: true }); R(x - 0.06, z0, x + 0.3, z1, 0.1, 0.05, BLACK);
    [0.35, 0.7, 1.05, 1.4].forEach(y => { R(x + 0.06, z0, x + 0.28, z1, 0.02, y, LEDGE, { collide: true }); R(x + 0.27, z0, x + 0.29, z1, 0.05, y + 0.03, CHROME);
      for (let z = z0 + 0.12; z < z1 - 0.08; z += 0.2) dorm.add('magazine', x + 0.17, y + 0.02, z, 0, Math.floor(rnd() * 8), 0, -0.35); });
    blk(x - 0.06, z0, x + 0.3, z1, 1.55);
  }
  hang('MAGAZINES', 5.2, 12.2, 1.8, 0);
  // a clear glass screen (head height) between the entrance and the exit lane, up to the magazines
  { const x0 = 7.05, x1 = 10.85, z = 12.2;
    glass((x0 + x1) / 2, 0.95, z, x1 - x0, 1.8, 0);
    R(x0, z - 0.03, x1, z + 0.03, 0.05, 1.85, CHROME); R(x0, z - 0.03, x1, z + 0.03, 0.05, 0.03, CHROME);
    for (let x = x0; x <= x1 + 1e-3; x += (x1 - x0) / 3) R(x - 0.025, z - 0.025, x + 0.025, z + 0.025, 1.88, 0.94, CHROME);
    blk(x0, z - 0.06, x1, z + 0.06, 1.9);
  }
  sign('EXIT — RECEIPTS ARE CHECKED. RONNIE\'S RECEIPT IS 4 METRES LONG.', 2.6, 0.35, [8.0, 2.65, 14.61], [0, Math.PI, 0], { bg: '#fff', fg: '#111', border: '#1e4ea8', size: 36 });

  // ================================================================ Lidl bags lying about (pick one up: what's inside?)
  for (const [x, z, ry] of [[-6.1, -8.0, 0.4], [-2.9, 1.5, 2.0], [-9.0, -1.2, 1.0], [2.2, -9.5, 3.0], [-6.0, 4.6, 0.8], [5.0, 10.6, 2.4], [-9.3, -4.6, 1.6], [-2.9, -8.6, 2.2], [7.5, 9.8, 0.6]]) dorm.add('lidlbag', x, 0.16, z, ry);

  // ================================================================ the back stock room (STAFF ONLY)
  sign('STAFF ONLY (YES, RONNIE, THAT MEANS YOU)', 1.3, 0.32, [3.175, 2.62, -4.6], [0, -Math.PI / 2, 0], { bg: '#c62828', fg: '#fff', border: null, size: 44, glow: true });
  k.box(0.02, 0.4, 0.3, 3.31, 1.5, -3.9 + 0.62, 0xffffff); sign('AUTHORISED PERSONNEL ONLY · HI-VIS BEYOND THIS POINT', 0.28, 0.38, [3.297, 1.5, -3.9 + 0.62], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#c62828', border: '#c62828', size: 40 });
  k.box(0.02, 0.32, 0.3, 3.31, 1.5, -5.3 - 0.35, 0x1e4ea8); sign('CAUTION: FORKLIFTS & RONNIES', 0.28, 0.3, [3.297, 1.5, -5.3 - 0.35], [0, -Math.PI / 2, 0], { bg: '#ffd400', fg: '#111', border: '#111', size: 40 });
  const pallet = (x, z, c, h) => { R(x - 0.6, z - 0.5, x + 0.6, z + 0.5, 0.14, 0.07, 0xc8a070, { collide: true }); R(x - 0.55, z - 0.45, x + 0.55, z + 0.45, h, 0.14 + h / 2, c, { collide: true, block: true }); k.spawns.push(new THREE.Vector3(x, 0.14 + h + 0.08, z)); };
  pallet(5.0, -13.6, 0xc8a070, 1.1); pallet(6.6, -13.6, 0x39a845, 0.9); pallet(7.4, -11.0, 0xc8a070, 1.4); pallet(5.0, -11.0, 0xe8e8e8, 0.8);
  sign('MONSTOR: 4,000 CANS. ORDERED BY: ???. DRUNK BY: ONE MAN.', 1.0, 0.4, [6.6, 0.6, -13.145], [0, 0, 0], { bg: '#111', fg: '#39ff14', border: '#39ff14', size: 36, glow: true });
  for (const z of [-8.4, -7.2]) { R(5.4, z - 0.35, 6.2, z + 0.35, 0.04, 0.2, 0x777777); for (const dx of [-0.38, 0.38]) R(5.8 + dx - 0.02, z - 0.35, 5.8 + dx + 0.02, z + 0.35, 1.6, 0.9, 0x777777); R(5.4, z - 0.3, 6.2, z + 0.3, 0.9, 0.67, 0xd6b48a, { block: true }); }
  R(7.4, -6.6, 8.3, -6.1, 0.12, 0.12, RED); R(7.4, -6.6, 7.5, -6.1, 1.1, 0.6, RED);
  for (const y of [0.1, 1.0, 1.9, 2.8]) R(8.0, -12.4, 8.42, -4.8, 0.05, y, 0xff8a1f, { collide: true });
  for (const z of [-12.4, -8.6, -4.8]) R(7.98, z - 0.04, 8.44, z + 0.04, 3.0, 1.5, 0x1e4ea8);
  for (let z = -12.2; z < -5.0; z += 0.55) for (const y of [0.13, 1.03, 1.93]) R(8.03, z, 8.4, z + 0.45, 0.4 + ((z * 7 + y) % 0.3), y + 0.22, [0xc8a070, 0xd6b48a, 0xb8905a][Math.abs(Math.round(z * 3 + y)) % 3]);
  blk(7.95, -12.4, 8.5, -4.8, 3);
  R(4.0, -3.4, 5.4, -2.4, 0.04, 0.74, 0xe0e0e0, { collide: true }); R(4.65, -2.95, 4.75, -2.85, 0.72, 0.36, 0x333333); blk(4.0, -3.4, 5.4, -2.4, 0.76);
  k.chair(4.3, -3.8, 0, 0x1e4ea8); k.chair(5.1, -3.8, 0, 0x1e4ea8);
  k.spawns.push(new THREE.Vector3(4.4, 0.84, -2.9), new THREE.Vector3(5.1, 0.84, -2.9));
  k.cyl(0.07, 0.08, 0.22, 5.2, 0.87, -2.6, 0xeeeeee, 10);
  for (let x = 7.2; x < 8.4; x += 0.4) R(x, -2.0, x + 0.38, -1.55, 1.9, 0.95, 0x607d8b, { block: true });
  sign("OLIVER'S LOCKER: CONTAINS ONE (1) EMERGENCY SANDWICH. IT'S GONE. RONNIE.", 0.36, 0.5, [7.4, 1.4, -2.01], [0, Math.PI, 0], { bg: '#fff', fg: '#111', border: null, size: 30 });
  sign('STAFF ROTA — Oliver: tills · Oliver: filming customers · Aidan W: sitting down (knee) · Ronnie: BANNED', 1.3, 0.7, [3.5, 1.6, -2.6], [0, Math.PI / 2, 0], { bg: '#fffde7', fg: '#111', border: '#1e4ea8', size: 34 });
  sign('BAKE-OFF →', 0.8, 0.25, [6.5, 2.4, -1.5], [0, Math.PI, 0], { bg: '#fff3e0', fg: '#8a4a10', border: null, size: 50 });
  for (let z = -13; z < -2; z += 4) k.lamp(6.0, H - 0.1, z, 0xffffff, 0.08);

  // ================================================================ branding + jokes
  sign('LIDL', 4, 0.95, [-10.88, 3.35, -4.7], [0, Math.PI / 2, 0], { tex: logoTex(), glow: true });
  sign('LIDL', 4, 0.95, [-4.0, 3.45, 14.595], [0, Math.PI, 0], { tex: logoTex(), glow: true });
  const jokes = [
    ['PRICE: PRICELESS (PLEASE LEAVE)', 1.6, 0.45, [-10.88, 2.0, 9.5], [0, Math.PI / 2, 0], { bg: '#000', fg: '#ffd400', border: null, size: 50, glow: true }],
    ['CUSTOMER OF THE MONTH: RONNIE (12 MONTHS RUNNING) (NOT RUNNING. WALKING SLOWLY. TO THE BAKERY.)', 1.4, 0.9, [-10.88, 1.9, -8.0], [0, Math.PI / 2, 0], { bg: '#fffde7', fg: '#111', border: '#1e4ea8', size: 36 }],
    ['LOST CHILD? PLEASE WAIT BY THE TILLS. LOST RONNIE? CHECK THE BAKERY.', 0.8, 0.5, [10.915, 2.0, 12.15], [0, -Math.PI / 2, 0], { bg: '#e3f2fd', fg: '#0d47a1', border: '#0d47a1', size: 36 }],
    ['TROLLEY £1 COIN. RONNIE\'S TROLLEY NEEDS A MORTGAGE.', 1.4, 0.35, [12.7, 2.3, 14.58], [0, Math.PI, 0], { bg: '#fff', fg: '#1e4ea8', border: '#ffd400', size: 36 }],
  ];
  for (const [t, w, h, pos, rot, o] of jokes) sign(t, w, h, pos, rot, o);
  for (let i = 0; i < 5; i++) { const z = 13.0 + i * 0.3; R(13.2, z - 0.13, 14.2, z + 0.13, 0.04, 0.95, 0x9aa0a8); R(13.2, z - 0.13, 13.25, z + 0.13, 0.9, 0.5, 0x9aa0a8); R(14.12, z - 0.14, 14.22, z + 0.14, 0.05, 1.0, BLUE); }
  blk(13.1, 12.8, 14.35, 14.6, 1.1);
  for (let i = 0; i < 4; i++) R(11.3, 14.1, 11.9, 14.5, 0.22, 0.12 + i * 0.22, i % 2 ? YEL : BLUE);
  blk(11.25, 14.05, 11.95, 14.55, 1);

  widenAisles(k, scene, sceneStart, stock, dorm);
  stock.build(scene);
  dorm.build(scene);
  const room = k.finish({
    name: 'Lidl',
    sky: 0xf4f8ff, ground: 0x9a9a9a, hemiI: 2.2, sun: 0xffffff, sunI: 0.9, sunPos: [3, 10, 6],
    start: { x: 12.9, z: 10.25, yaw: Math.PI / 2 },       // in the foyer by the flowers, facing the way in
    board: { x: widenX(-10.89), y: 1.6, z: -4.6, ry: Math.PI / 2 },
    startFood: ['can', 'burger', 'pizza', 'doughnut', 'doughnut', 'doughnut', 'burger', 'pizza', 'can', 'doughnut', 'burger', 'pizza', 'doughnut', 'can', 'burger', 'pizza', 'doughnut', 'can'],
    spotCount: 36,
  });
  room.dormant = dorm;
  room.tills = [-3.45, -0.99, 1.53].map(widenX);
  return room;
}

function carParkTex(seed) {
  return canvasTex(512, 384, (g, w, h) => {
    let s = seed * 97 + 13; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const sky = g.createLinearGradient(0, 0, 0, h * 0.45); sky.addColorStop(0, '#8fc4ec'); sky.addColorStop(1, '#dceefa'); g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.45);
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(r() * w, 30 + r() * 60, 50 + r() * 40, 12, 0, 0, 7); g.fill(); }
    for (let x = 0; x < w; x += 18) { g.fillStyle = ['#3e6b34', '#4f7f3c', '#355c2c'][(x / 18 | 0) % 3]; g.beginPath(); g.arc(x, h * 0.42, 22 + r() * 14, Math.PI, 0); g.fill(); }        // trees beyond
    g.fillStyle = '#8a8a86'; g.fillRect(0, h * 0.42, w, 10);                                                                                                // the kerb
    g.fillStyle = '#4a4c50'; g.fillRect(0, h * 0.44, w, h * 0.56);                                                                                        // tarmac
    g.strokeStyle = '#f2f2f0'; g.lineWidth = 3; for (let x = -40; x < w + 40; x += 70) { g.beginPath(); g.moveTo(x, h * 0.5); g.lineTo(x - 30, h * 0.72); g.stroke(); g.beginPath(); g.moveTo(x + 20, h * 0.78); g.lineTo(x - 20, h); g.stroke(); }
    const car = (x, y, sc, col) => { g.fillStyle = col; g.beginPath(); g.roundRect(x - 34 * sc, y - 14 * sc, 68 * sc, 18 * sc, 6 * sc); g.fill(); g.beginPath(); g.roundRect(x - 20 * sc, y - 26 * sc, 40 * sc, 14 * sc, 6 * sc); g.fill();
      g.fillStyle = '#a8c8e0'; g.fillRect(x - 16 * sc, y - 23 * sc, 14 * sc, 9 * sc); g.fillRect(x + 2 * sc, y - 23 * sc, 14 * sc, 9 * sc); g.fillStyle = '#111'; for (const dx of [-20, 20]) { g.beginPath(); g.arc(x + dx * sc, y + 4 * sc, 7 * sc, 0, 7); g.fill(); } };
    const cols = ['#c62828', '#1565c0', '#eeeeee', '#212121', '#9e9e9e', '#2e7d32', '#f9a825', '#6d4c41'];
    for (let i = 0; i < 6; i++) car(30 + i * 85 + r() * 20, h * 0.62, 0.8, cols[Math.floor(r() * cols.length)]);
    for (let i = 0; i < 4; i++) car(60 + i * 120 + r() * 30, h * 0.92, 1.3, cols[Math.floor(r() * cols.length)]);
    g.fillStyle = '#555'; for (const x of [140, 400]) { g.fillRect(x, h * 0.2, 4, h * 0.3); g.fillRect(x - 14, h * 0.2, 30, 5); }                        // lamp posts
    g.fillStyle = '#1e4ea8'; g.fillRect(w * 0.7, h * 0.47, 60, 30); g.fillStyle = '#ffd400'; g.fillRect(w * 0.7 + 4, h * 0.47 + 4, 52, 8);            // trolley shelter
  });
}
function ovenTex() {
  return canvasTex(256, 96, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3a1a0a'); gr.addColorStop(1, '#ff8a2a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) { g.fillStyle = '#c98a3c'; g.beginPath(); g.ellipse(20 + i * 36, h * 0.66, 14, 9, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,240,200,0.5)'; g.fillRect(14 + i * 36, h * 0.6, 8, 2); }
    g.strokeStyle = '#888'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
  });
}
function mirrorTex() {
  return canvasTex(256, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#dfe8ee'); gr.addColorStop(0.5, '#f8fbfd'); gr.addColorStop(1, '#cdd8e0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
}
function kioskTex() {
  return canvasTex(256, 192, (g, w, h) => {
    g.fillStyle = '#1e4ea8'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd400'; g.fillRect(0, 0, w, 36);
    g.fillStyle = '#1e4ea8'; g.font = `900 22px ${FONT}`; g.textAlign = 'center'; g.fillText('SCAN YOUR ITEMS', w / 2, 26);
    g.fillStyle = '#fff'; g.font = `900 18px ${FONT}`; g.fillText('Unexpected item', w / 2, 90); g.fillText('in bagging area', w / 2, 116);
    g.fillStyle = '#ffd400'; g.fillRect(w / 2 - 60, 140, 120, 34); g.fillStyle = '#1e4ea8'; g.fillText('PAY £0.00', w / 2, 164);
  });
}
function fridgeTex() {
  return canvasTex(2048, 160, (g, w, h) => {
    g.fillStyle = '#0b1a10'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 128) { g.strokeStyle = '#9aa'; g.lineWidth = 4; g.strokeRect(x + 2, 2, 124, h - 4); }
    for (let x = 8; x < w; x += 14) for (const y of [22, 72, 122]) { g.fillStyle = (x / 14 | 0) % 7 === 0 ? '#ff9a1f' : '#111'; g.fillRect(x, y, 10, 28); g.fillStyle = '#39ff14'; g.fillRect(x + 2, y + 4, 6, 3); }
    g.fillStyle = 'rgba(57,255,20,0.18)'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#39ff14'; g.font = `900 38px ${FONT}`; g.textAlign = 'center';
    for (let x = 256; x < w; x += 512) g.fillText('MONSTOR — UNLEASH THE MONSTOR', x, 60);
  });
}
function logoTex() {
  return canvasTex(1024, 240, (g, w, h) => {
    g.fillStyle = '#1e4ea8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd400'; g.beginPath(); g.arc(120, h / 2, 90, 0, 7); g.fill();
    g.fillStyle = '#e53935'; g.beginPath(); g.arc(120, h / 2, 60, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = `900 170px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText('LIDL', (240 + w) / 2, h / 2 + 8);
  });
}

// ---------------------------------------------------------------- double-width aisles
// The shop is laid out on the plan's grid, then every walkway between the shelf runs is doubled in width:
// the shelf units keep their size and slide apart, the left wall goes back, and anything long (walls, floors,
// the back fridges, rails, windows) stretches to suit. widenX maps an old x to its new place.
const AISLES = [[-10.2, -8.45], [-6.98, -5.06], [-3.94, -1.86], [-0.74, 0.13], [1.57, 2.52]];   // the walkways (free in both halves)
export function widenX(x) {
  let sh = 0;
  for (let i = AISLES.length - 1; i >= 0; i--) {
    const [a, b] = AISLES[i], e = b - a;
    if (x >= b) continue;
    if (x <= a) { sh -= e; continue; }
    sh -= e * (b - x) / (b - a);
  }
  return x + sh;
}
function widenAisles(k, scene, sceneStart, stock, dorm) {
  const M = widenX, RIGID = 1.0, box = new THREE.Box3();
  const mapRange = (a, b) => (b - a < RIGID) ? [a + M((a + b) / 2) - (a + b) / 2, b + M((a + b) / 2) - (a + b) / 2] : [M(a), M(b)];
  // the merged geometry
  for (const g of k.parts) {
    g.computeBoundingBox(); const bb = g.boundingBox, pa = g.attributes.position;
    const xl = bb.max.x - bb.min.x, signBoard = xl < 4 && bb.max.z - bb.min.z < 0.06 && bb.max.y - bb.min.y > 0.2;    // (sign boards move, they don't stretch)
    if (xl < RIGID || signBoard) { const d = M((bb.min.x + bb.max.x) / 2) - (bb.min.x + bb.max.x) / 2; if (d) g.translate(d, 0, 0); }
    else { for (let i = 0; i < pa.count; i++) pa.setX(i, M(pa.getX(i))); pa.needsUpdate = true; g.computeBoundingBox(); g.computeBoundingSphere(); }
  }
  // meshes already in the scene: signs move, long panels (floors, windows, textured walls, the ceiling) stretch
  for (const o of scene.children.slice(sceneStart)) {
    if (!o.isMesh) continue;
    o.updateMatrixWorld(true); box.setFromObject(o);
    const a = box.min.x, b = box.max.x, cx = (a + b) / 2;
    if (o.userData.sign || b - a < RIGID) { o.position.x += M(cx) - cx; continue; }
    const r = (M(b) - M(a)) / (b - a); if (Math.abs(r - 1) < 1e-4) { o.position.x += M(cx) - cx; continue; }
    const lx = new THREE.Vector3(1, 0, 0).applyQuaternion(o.quaternion);
    if (Math.abs(lx.x) > 0.9) o.scale.x *= r; else o.scale.z *= r;                       // (the local axis that lies along world x)
    o.position.x = (M(a) + M(b)) / 2 + (o.position.x - cx) * r;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    o.material = mats.map(m => { if (!m.map) return m; const c = m.clone(); c.map = m.map.clone(); c.map.needsUpdate = true; c.map.wrapS = THREE.RepeatWrapping; c.map.repeat.x *= r; return c; });
    if (!Array.isArray(o.userData.mats) && o.material.length === 1) o.material = o.material[0];
  }
  for (const c of k.colliders) [c.min.x, c.max.x] = mapRange(c.min.x, c.max.x);
  for (const b of k.blockers) [b.x0, b.x1] = mapRange(b.x0, b.x1);
  for (const r of k.boxRec || []) [r.min[0], r.max[0]] = mapRange(r.min[0], r.max[0]);
  for (const p of k.spawns) p.x = M(p.x);
  for (const L of k.lights || []) L.l.position.x = M(L.l.position.x);
  for (const [, list] of k.lamps || []) for (const l of list) l[0] = M(l[0]);
  for (const gb of [k.halos, k.pools]) if (gb) for (const l of gb.list) l[0] = M(l[0]);
  for (const v of (k.inst || new Map()).values()) for (const m of v.list) m.elements[12] = M(m.elements[12]);
  for (const r of stock.runs) { if (r.alongX) { r.z0 = M(r.z0); r.z1 = M(r.z1); } else r.x = M(r.x); }
  for (const e of dorm.entries) e.pos.x = M(e.pos.x);
  k.bounds.x0 = M(k.bounds.x0);
}
