// LIDL: the discount supermarket where Oliver works (design doc 66.3).
// Same 30m x 22m footprint, broken up into proper areas so it doesn't feel like
// one big open hall:
//   entrance + trolley bay + fruit & veg (the bit Ronnie walks straight past)
//   in-store bakery with its wall of bins, deli/hot counter
//   five numbered aisles with hanging signs and end-cap offers
//   THE MIDDLE AISLE of random special buys
//   fridge wall + freezer islands (MONSTOR glowing)
//   checkouts and self-checkouts, walled-off warehouse and staff room behind
//   "STAFF ONLY" strip curtains.
// Plan (x east, z south): entrance doors in the south wall at x 9..11.
import * as THREE from 'three';
import { Kit, tileTex, canvasTex, FONT, streetViewTex } from './kit.js';

const H = 4.0;

export function buildSupermarket(scene) {
  const k = new Kit(scene, { x0: -15, x1: 15, z0: -11, z1: 11, y1: H });
  const WALL = 0xeeeeea, BLUE = 0x1e4ea8, YEL = 0xffd400, RED = 0xe53935, SHELF = 0xd0d4da, LEDGE = 0xb9bec6, STEEL = 0xa8aeb6, WOOD = 0xb07a45;
  const R = (x0, z0, x1, z1, h, y, color, opts) => k.box(Math.abs(x1 - x0), h, Math.abs(z1 - z0), (x0 + x1) / 2, y ?? h / 2, (z0 + z1) / 2, color, opts);
  const T2 = 0.08;
  const wallX = (x, z0, z1, h = H, c = WALL) => R(x - T2, z0 - T2, x + T2, z1 + T2, h, h / 2, c, { collide: true, block: true });
  const wallZ = (z, x0, x1, h = H, c = WALL) => R(x0 - T2, z - T2, x1 + T2, z + T2, h, h / 2, c, { collide: true, block: true });
  const sign = (t, w, h, pos, rot, o = {}) => k.label(t, w, h, pos, rot, o);

  // ================================================================ shell
  k.floor(-15, -11, 15, 11, tileTex('#e9e6df', '#dedad2', '#c8c3b8', 64), 0.002, 1.2);
  k.floor(9, -11, 15, -4, tileTex('#9a9a96', '#8e8e8a', '#6e6e6a', 64), 0.003, 1.5);       // warehouse concrete
  k.floor(-15, 5.6, 15, 11, tileTex('#d9d4c8', '#cfcabd', '#b5afa2', 64), 0.003, 1.2);      // front-of-store tiles
  k.ceiling(0xf4f4f4, 0x5a5a5a);
  wallZ(-11, -15, 15); wallZ(11, -15, 15); wallX(-15, -11, 11); wallX(15, -11, 11);
  // blue and yellow brand stripe round the walls
  R(-14.9, -10.92, 14.9, -10.9, 0.25, 2.9, BLUE); R(-14.9, 10.9, 14.9, 10.92, 0.25, 2.9, BLUE);
  R(-14.92, -10.9, -14.9, 10.9, 0.25, 2.9, BLUE); R(14.9, -10.9, 14.92, 10.9, 0.25, 2.9, BLUE);
  R(-14.9, -10.92, 14.9, -10.9, 0.08, 2.72, YEL); R(-14.92, -10.9, -14.9, 10.9, 0.08, 2.72, YEL);
  // strip lights in rows, and a lower suspended grid over the front so the hall isn't one big box
  for (let x = -13; x <= 13; x += 3.25) k.box(0.22, 0.05, 20, x, H - 0.05, 0, 0xffffff);
  for (let x = -14; x <= 14; x += 2) k.lamp(x, H - 0.08, 8.5, 0xffffff, 0.06);

  // ================================================================ entrance, trolleys, fruit & veg
  // glass sliding doors in the south wall, rubber mat, trolley bay
  R(8.8, 10.82, 11.2, 10.9, 2.6, 1.3, 0x9ec9e0); R(9.98, 10.8, 10.02, 10.9, 2.6, 1.3, 0x666666);
  R(8.8, 10.78, 11.2, 10.92, 0.25, 2.75, BLUE);
  R(9.0, 9.4, 11.0, 10.7, 0.01, 0.006, 0x333333);
  sign('WELCOME TO LIDL', 2.3, 0.22, [10, 2.95, 10.76], [0, Math.PI, 0], { bg: '#1e4ea8', fg: '#ffd400', border: null, size: 60, glow: true });
  for (let i = 0; i < 6; i++) { const x = 12.2 + i * 0.36; R(x - 0.16, 9.2, x + 0.16, 10.6, 0.04, 0.95, 0x9aa0a8); R(x - 0.16, 9.2, x + 0.16, 9.25, 0.9, 0.5, 0x9aa0a8); R(x - 0.17, 9.2, x + 0.17, 9.3, 0.05, 1.0, BLUE); }
  R(12.0, 9.0, 14.3, 10.8, 1.1, 0.55, 0x9aa0a8, { block: true });
  sign('TROLLEYS (RONNIE: TWO)', 1.4, 0.3, [13.2, 1.6, 8.97], [0, Math.PI, 0], { bg: '#ffd400', fg: '#1e4ea8', border: null, size: 46 });
  for (let i = 0; i < 4; i++) R(7.6, 9.8 + i * 0.05, 8.3, 10.3 + i * 0.05, 0.25, 0.13 + i * 0.25, RED);            // stacked baskets
  // fruit & veg: angled crate tables with produce, under a green awning
  const crates = (x, z, cols) => {
    R(x - 0.9, z - 0.6, x + 0.9, z + 0.6, 0.75, 0.375, WOOD, { collide: true, block: true });
    cols.forEach((c, i) => { const cx = x - 0.6 + (i % 3) * 0.6, cz = z - 0.3 + Math.floor(i / 3) * 0.6; R(cx - 0.27, cz - 0.27, cx + 0.27, cz + 0.27, 0.08, 0.79, 0x6d4c2a); for (let j = 0; j < 6; j++) k.cyl(0.055, 0.055, 0.09, cx - 0.14 + (j % 3) * 0.14, 0.86, cz - 0.08 + Math.floor(j / 3) * 0.16, c, 8); });
  };
  crates(5.0, 6.9, [0xd62828, 0xff8c1a, 0xffe135, 0x7cb342, 0x9ccc3a, 0xe53935]);
  crates(5.0, 4.4, [0x2e7d32, 0xff7a1a, 0xf5f0dc, 0x6a1b9a, 0xd32f2f, 0x8bc34a]);
  crates(8.4, 4.4, [0xffe135, 0x7cb342, 0xd62828, 0xff8c1a, 0x2f6b2a, 0xffc107]);
  crates(11.8, 4.4, [0x9ccc65, 0xe53935, 0x6aaa3a, 0xffe135, 0xd62828, 0xff8c1a]);
  R(3.6, 3.2, 13.2, 3.3, 0.06, 2.6, 0x2e7d32); for (const x of [3.7, 13.1]) R(x - 0.04, 3.22, x + 0.04, 3.3, 2.6, 1.3, 0x2e7d32);
  sign('FRESH FRUIT & VEG — RONNIE HAS NEVER BEEN IN THIS SECTION', 4.2, 0.45, [8.4, 2.95, 3.32], [0, 0, 0], { bg: '#2e7d32', fg: '#fff', border: '#ffd400', size: 44 });
  sign('BANANAS: 5 FOR 50p (RONNIE: "WHAT\'S A BANANA?")', 1.6, 0.35, [8.4, 1.15, 5.01], [0, 0, 0], { bg: '#ffe135', fg: '#111', border: null, size: 40 });
  sign('WONKY VEG: STILL BETTER SHAPE THAN RONNIE', 1.6, 0.35, [11.8, 1.15, 5.01], [0, 0, 0], { bg: '#fff', fg: '#2e7d32', border: '#2e7d32', size: 40 });

  // ================================================================ bakery + hot counter (east)
  // the famous wall of bakery bins, ovens behind, tongs and paper bags
  R(14.0, -3.6, 14.92, 2.6, 2.3, 1.15, 0x8a5a2a, { collide: true, block: true });
  for (let z = -3.2; z < 2.4; z += 0.62) for (const y of [0.55, 1.05, 1.55]) { R(13.55, z - 0.28, 14.0, z + 0.28, 0.42, y, 0xf2e6d0, { collide: true }); R(13.53, z - 0.27, 13.56, z + 0.27, 0.32, y, 0x9ec9e0); k.spawns.push(new THREE.Vector3(13.78, y + 0.27, z)); }
  R(14.4, -3.4, 14.92, 2.4, 0.5, 2.6, 0x444444); for (let z = -3; z < 2.3; z += 1.3) k.lamp(14.35, 2.6, z, 0xff8a30, 0.1);
  sign('IN-STORE BAKERY — FRESH EVERY 2 HOURS (RONNIE: EVERY 2 MINUTES)', 5.4, 0.45, [13.5, 2.95, -0.5], [0, -Math.PI / 2, 0], { bg: '#fff3e0', fg: '#8a4a10', border: '#8a4a10', size: 44, glow: true });
  sign('CUSTOMERS MAY ONLY USE TONGS (THIS INCLUDES RONNIE\'S MOUTH)', 1.4, 0.4, [13.52, 2.15, -2.6], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#c0392b', border: '#c0392b', size: 36 });
  R(12.6, -0.6, 13.0, -0.2, 0.9, 0.45, 0xc8a070); R(12.62, -0.55, 12.98, -0.25, 0.25, 1.02, 0xf2e6d0);   // paper bag stand
  // deli / hot chicken counter with a glass front
  R(9.6, -3.8, 13.0, -3.0, 1.0, 0.5, 0xeceff1, { collide: true, block: true });
  R(9.6, -3.05, 13.0, -2.98, 0.45, 1.23, 0xb3e5fc);
  for (let x = 9.9; x < 12.9; x += 0.5) { k.cyl(0.07, 0.06, 0.08, x, 1.06, -3.4, 0xc7782a, 10); k.spawns.push(new THREE.Vector3(x, 1.12, -3.4)); }
  for (let x = 10.2; x < 12.9; x += 0.8) k.lamp(x, 1.75, -3.4, 0xff6a20, 0.06);
  sign('HOT CHICKEN — ROTISSERIE (RONNIE HAS BEEN ASKED TO STOP WATCHING IT SPIN)', 3.3, 0.4, [11.3, 2.2, -3.82], [0, 0, 0], { bg: '#c62828', fg: '#fff', border: '#ffd400', size: 40 });

  // ================================================================ warehouse + staff room (behind the walls, NE)
  wallZ(-4, 9, 15); wallX(9, -11, -6.0); wallX(9, -4.6, -4);                       // door gap at z -6.0..-4.6
  for (let z = -5.95; z < -4.6; z += 0.1) R(8.98, z, 9.02, z + 0.07, 2.2, 1.1, 0x9ec9e0);   // plastic strip curtain
  R(8.9, -6.0, 9.1, -4.6, H - 2.3, 2.3 + (H - 2.3) / 2, WALL);
  sign('STAFF ONLY (YES, RONNIE, THAT MEANS YOU)', 1.6, 0.3, [8.88, 2.5, -5.3], [0, -Math.PI / 2, 0], { bg: '#c62828', fg: '#fff', border: null, size: 44 });
  // pallets of stock, cage trolleys, a pallet jack
  const pallet = (x, z, c, h) => { R(x - 0.6, z - 0.5, x + 0.6, z + 0.5, 0.14, 0.07, 0xc8a070, { collide: true }); R(x - 0.55, z - 0.45, x + 0.55, z + 0.45, h, 0.14 + h / 2, c, { collide: true, block: true }); k.spawns.push(new THREE.Vector3(x, 0.14 + h + 0.08, z)); };
  pallet(10.4, -10.2, 0xc8a070, 1.1); pallet(11.9, -10.2, 0xff9a1f, 0.9); pallet(13.4, -10.2, 0xc8a070, 1.4); pallet(13.6, -8.3, 0x39a845, 0.8);
  sign('MONSTOR: 4,000 CANS. ORDERED BY: ???. DRUNK BY: ONE MAN.', 1.0, 0.4, [11.9, 1.25, -9.69], [0, 0, 0], { bg: '#111', fg: '#39ff14', border: '#39ff14', size: 36, glow: true });
  for (const z of [-7.6, -6.6]) { R(9.6, z - 0.35, 10.4, z + 0.35, 0.04, 0.2, 0x777777); for (const dx of [-0.38, 0.38]) R(10 + dx - 0.02, z - 0.35, 10 + dx + 0.02, z + 0.35, 1.6, 0.9, 0x777777); R(9.6, z - 0.3, 10.4, z + 0.3, 0.9, 0.67, 0xd6b48a); }
  R(12.4, -6.6, 13.4, -6.1, 0.12, 0.12, RED); R(12.4, -6.6, 12.5, -6.1, 1.1, 0.6, RED);   // pallet jack
  // staff room in the corner: table, kettle, lockers, a rota on the wall
  wallX(12.2, -5.9, -4.0, 2.6);
  R(12.6, -5.6, 14.2, -4.6, 0.04, 0.74, 0xe0e0e0, { collide: true }); R(13.35, -5.15, 13.45, -5.05, 0.72, 0.36, 0x333333);
  k.chair(12.9, -4.3, 0, 0x1e4ea8); k.chair(13.9, -4.3, 0, 0x1e4ea8);
  k.spawns.push(new THREE.Vector3(13.0, 0.84, -5.1), new THREE.Vector3(13.8, 0.84, -5.1));
  k.cyl(0.07, 0.08, 0.22, 14.0, 0.87, -5.4, 0xeeeeee, 10);
  for (let z = -5.8; z < -4.2; z += 0.4) R(14.6, z, 14.92, z + 0.38, 1.9, 0.95, 0x607d8b);
  sign("OLIVER'S LOCKER: CONTAINS ONE (1) EMERGENCY SANDWICH. IT'S GONE. RONNIE.", 0.36, 0.5, [14.58, 1.4, -4.4], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', border: null, size: 30 });
  sign('STAFF ROTA — Oliver: tills · Oliver: filming customers · Ronnie: BANNED (see photo)', 1.2, 0.7, [12.2 + 0.1, 1.6, -5.0], [0, Math.PI / 2, 0], { bg: '#fffde7', fg: '#111', border: '#1e4ea8', size: 34 });

  // ================================================================ fridge wall + freezer islands (north)
  R(-14.92, -10.92, 8.9, -10.0, 2.3, 1.15, 0xdfe6ee, { collide: true, block: true });
  k.label('fridges', 23.4, 2.0, [-3.0, 1.15, -9.98], [0, 0, 0], { tex: fridgeTex(), glow: true });
  for (let x = -13; x <= 7.5; x += 2.2) k.spawns.push(new THREE.Vector3(x, 0.3, -9.7));
  for (let x = -14; x < 9; x += 2) k.lamp(x, 2.38, -10.1, 0xddf6ff, 0.08);
  // two freezer islands with sliding lids, with an aisle all round them
  for (const x of [-10, -4]) {
    R(x - 2.0, -8.6, x + 2.0, -7.6, 0.85, 0.425, 0xeeeeee, { collide: true, block: true });
    R(x - 1.95, -8.55, x + 1.95, -7.65, 0.02, 0.86, 0xa8d8ef);
    for (let dx = -1.6; dx <= 1.6; dx += 0.8) k.spawns.push(new THREE.Vector3(x + dx, 0.95, -8.1));
  }
  sign('FROZEN: PIZZA, CHIPS, ICE CREAM. ALSO RONNIE\'S HANDS, STUCK IN HERE SINCE 7AM', 4.2, 0.4, [-7, 2.9, -8.1], [0, 0, 0], { bg: '#e3f2fd', fg: '#0d47a1', border: '#0d47a1', size: 40 });
  sign('LIMIT 2 PER CUSTOMER (RONNIE: 0)', 2.4, 0.5, [-3.0, 2.55, -9.97], [0, 0, 0], { bg: '#fff', fg: '#c0392b' });
  sign('MONSTOR: UNLEASH THE MONSTOR. RONNIE UNLEASHED IT. NOBODY CAN FIND IT.', 2.4, 0.5, [5.5, 2.55, -9.97], [0, 0, 0], { bg: '#111', fg: '#39ff14', border: '#39ff14', size: 36, glow: true });

  // ================================================================ the aisles (with a cross-aisle through the middle)
  const shelfTexes = [productTex(0), productTex(1), productTex(2), productTex(3)];
  const shelf = (x, z0, z1, ti) => {
    const len = z1 - z0, zc = (z0 + z1) / 2;
    k.box(1.0, 1.75, len, x, 0.875, zc, SHELF, { collide: true, block: true });
    for (const side of [-1, 1]) {
      for (const y of [0.55, 1.05, 1.5]) k.box(0.28, 0.03, len, x + side * 0.62, y, zc, LEDGE, { collide: true });
      k.label('shelf', len, 1.6, [x + side * 0.505, 0.9, zc], [0, side * Math.PI / 2, 0], { tex: shelfTexes[(ti + (side > 0 ? 1 : 0)) % 4] });
      for (let z = z0 + 0.4; z < z1 - 0.3; z += 0.55) for (const y of [0.62, 1.12, 1.57]) k.spawns.push(new THREE.Vector3(x + side * 0.62, y, z + (y > 1 ? 0.2 : 0)));   // every shelf, all the way along
    }
    // end caps: offer bays facing the cross-aisle and the front
    for (const [ez, dir] of [[z0, -1], [z1, 1]]) { R(x - 0.5, ez + dir * 0.0, x + 0.5, ez + dir * 0.45, 1.2, 0.6, YEL, { collide: true, block: true }); k.spawns.push(new THREE.Vector3(x, 1.28, ez + dir * 0.22)); }
  };
  const AISLES = [
    [-12.5, '1', 'CRISPS & SNACKS (RONNIE\'S AISLE)'],
    [-9.5, '2', 'BISCUITS & SWEETS'],
    [-6.5, '3', 'TINS, PASTA & ALSO SALAD (NEVER VISITED)'],
    [-3.5, '4', 'DRINKS & MONSTOR'],
    [-0.5, '5', 'CEREAL, BREAD & SPREADS'],
  ];
  AISLES.forEach(([x, n, name], i) => {
    shelf(x, -6.4, -2.4, i); shelf(x, -0.6, 3.6, i + 1);
    // hanging aisle sign
    k.cyl(0.006, 0.006, 0.8, x, H - 0.4, -1.5, 0x333333, 4);
    sign(`${n}  ${name}`, 2.0, 0.42, [x, H - 1.0, -1.49], [0, 0, 0], { bg: '#1e4ea8', fg: '#fff', border: '#ffd400', size: 40 });
    sign(`${n}  ${name}`, 2.0, 0.42, [x, H - 1.0, -1.51], [0, Math.PI, 0], { bg: '#1e4ea8', fg: '#fff', border: '#ffd400', size: 40 });
  });
  const offers = ['REDUCED: RONNIE GOT HERE FIRST', 'BUY ONE GET ONE FREE (RONNIE: BUY ONE GET ONE FREE GET ONE FREE)', 'CRISPS: FAMILY SIZE (RONNIE SIZE: 3 BAGS)', 'NEW! FAT-FREE (RONNIE: HARD PASS)', 'TODAY ONLY: EVERYTHING (RONNIE: EVERY DAY)'];
  AISLES.forEach(([x], i) => sign(offers[i], 0.95, 0.5, [x, 1.45, 3.6 + 0.46], [0, 0, 0], { bg: '#ffeb3b', fg: '#111', border: '#e53935', size: 34 }));

  // ================================================================ THE MIDDLE AISLE (special buys), x 2..6
  const bin = (x, z, c, label) => { R(x - 0.8, z - 0.9, x + 0.8, z + 0.9, 0.7, 0.35, BLUE, { collide: true, block: true }); R(x - 0.82, z - 0.92, x + 0.82, z + 0.92, 0.08, 0.74, YEL); k.spawns.push(new THREE.Vector3(x - 0.3, 0.85, z - 0.4), new THREE.Vector3(x + 0.3, 0.85, z + 0.4)); if (label) sign(label, 1.4, 0.35, [x, 1.05, z + 0.93], [0, 0, 0], { bg: '#fff', fg: '#1e4ea8', border: '#e53935', size: 34 }); };
  bin(3.0, -5.6, 0, 'SNORKEL SET £9.99 (RONNIE: CAN\'T SNORKEL, CAN EAT)'); bin(3.0, -2.6, 0, 'WELDING MASK (WHY?)'); bin(3.0, 0.4, 0, 'ELECTRIC BLANKET, 3 SIZES: S, M, RONNIE');
  // random special-buy props
  k.cyl(0.6, 0.6, 0.25, 5.3, 0.13, -5.0, 0x4fc3f7, 20, { block: true }); k.cyl(0.55, 0.55, 0.02, 5.3, 0.26, -5.0, 0x81d4fa, 20);   // paddling pool
  k.cyl(0.12, 0.12, 0.7, 5.3, 0.35, -2.3, 0xff6fae, 10); k.cyl(0.07, 0.03, 0.3, 5.3, 0.85, -2.2, 0xff6fae, 8);                     // inflatable flamingo
  R(5.0, 0.0, 5.6, 0.6, 1.1, 0.55, RED); R(5.05, 0.05, 5.55, 0.55, 0.25, 1.2, 0x333333);                                             // ski jacket on a dummy
  R(4.9, 1.6, 5.8, 2.4, 0.5, 0.25, 0x37474f, { block: true }); R(4.95, 1.6, 5.75, 1.65, 0.3, 0.6, 0x37474f);                           // pressure washer box
  sign('MIDDLE AISLE: ANYTHING CAN HAPPEN (RONNIE WILL EAT IT)', 3.2, 0.7, [4.2, 3.0, -6.9], [0, 0, 0], { bg: '#ffd400', fg: '#1e4ea8', border: '#e53935', size: 60, glow: true });

  // ================================================================ checkouts + self-checkouts (south-west), with an exit barrier
  for (let i = 0; i < 5; i++) {
    const x = -13 + i * 2.4;
    R(x - 0.4, 6.0, x + 0.4, 8.9, 0.85, 0.425, 0x2a2f38, { collide: true, block: true });
    R(x - 0.25, 6.2, x + 0.25, 8.0, 0.02, 0.86, 0x111111);
    R(x + 0.45, 8.0, x + 1.0, 8.6, 0.8, 0.4, 0x37474f, { block: true }); R(x + 0.5, 8.1, x + 0.95, 8.5, 0.35, 0.98, 0x263238);     // till + seat
    k.cyl(0.02, 0.02, 1.6, x - 0.35, 1.65, 6.05, 0x888888, 6);
    sign(`${i + 1}`, 0.4, 0.4, [x - 0.35, 2.6, 6.05], [0, 0, 0], { bg: '#1e4ea8', fg: '#ffd400', border: null, size: 200 });
    k.spawns.push(new THREE.Vector3(x, 0.95, 6.5), new THREE.Vector3(x, 0.95, 7.3));
    // impulse-buy racks at every till
    R(x - 0.85, 5.9, x - 0.5, 6.5, 1.3, 0.65, 0xffffff, { collide: true }); for (const y of [0.5, 0.85, 1.2]) R(x - 0.86, 5.9, x - 0.84, 6.5, 0.12, y, [RED, YEL, 0x8e24aa][Math.round(y * 3) % 3]);
  }
  sign('TILL 3: OLIVER (FILMING YOU)', 0.9, 0.3, [-8.2, 2.1, 6.03], [0, 0, 0], { bg: '#fff', fg: '#1e4ea8', border: '#ffd400', size: 40 });
  for (let i = 0; i < 4; i++) { const x = -0.4 + i * 1.3; R(x - 0.42, 6.6, x + 0.42, 7.3, 1.4, 0.7, 0xe0e0e0, { block: true }); sign('UNEXPECTED ITEM IN BAGGING AREA: RONNIE', 0.6, 0.4, [x, 1.15, 6.58], [0, Math.PI, 0], { bg: '#003', fg: '#ff5252', border: null, size: 30, glow: true }); }
  sign('SELF CHECKOUT — PLEASE PLACE RONNIE IN THE BAGGING AREA', 3.6, 0.35, [1.55, 2.4, 6.55], [0, Math.PI, 0], { bg: '#1e4ea8', fg: '#fff', border: '#ffd400', size: 40 });
  // waist-high rail between the shop floor and the exit
  R(-14.9, 9.6, 7.2, 9.7, 0.06, 1.0, 0x888888, { block: true }); for (let x = -14.6; x < 7.2; x += 1.2) R(x - 0.03, 9.6, x + 0.03, 9.7, 1.0, 0.5, 0x888888);
  sign('EXIT — RECEIPTS ARE CHECKED. RONNIE\'S RECEIPT IS 4 METRES LONG.', 2.6, 0.35, [-4, 1.45, 9.72], [0, Math.PI, 0], { bg: '#fff', fg: '#111', border: '#1e4ea8', size: 36 });

  // ================================================================ branding + more jokes
  sign('LIDL', 6, 1.4, [-4, 3.35, 10.88], [0, Math.PI, 0], { tex: logoTex(), glow: true });
  sign('LIDL', 4, 0.95, [-14.88, 3.35, 0], [0, Math.PI / 2, 0], { tex: logoTex(), glow: true });
  const jokes = [
    ['STAFF PICK: OLIVER RECOMMENDS... RUNNING', 2.4, 0.6, [14.88, 2.45, 6.0], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#1e4ea8', border: '#ffd400', size: 60 }],
    ['PRICE: PRICELESS (PLEASE LEAVE)', 1.6, 0.45, [-14.88, 2.0, 7.5], [0, Math.PI / 2, 0], { bg: '#000', fg: '#39ff14', border: null, size: 50, glow: true }],
    ['CUSTOMER OF THE MONTH: RONNIE (12 MONTHS RUNNING) (NOT RUNNING. WALKING SLOWLY. TO THE BAKERY.)', 1.4, 0.9, [-14.88, 1.9, -3.5], [0, Math.PI / 2, 0], { bg: '#fffde7', fg: '#111', border: '#1e4ea8', size: 36 }],
    ['WE PRICE-MATCH ANY SUPERMARKET THAT HASN\'T BANNED RONNIE (THERE ARE NONE LEFT)', 1.8, 0.6, [-14.88, 1.9, 3.5], [0, Math.PI / 2, 0], { bg: '#fff', fg: '#c0392b', border: '#c0392b', size: 36 }],
    ['CLEAN-UP IN AISLE 1. AGAIN. IT WAS RONNIE. AGAIN.', 1.6, 0.4, [-12.5, 2.1, -6.9], [0, 0, 0], { bg: '#ffd400', fg: '#111', border: '#111', size: 40 }],
    ['FREE SAMPLES (ONE PER CUSTOMER) (RONNIE HAS HAD 31)', 1.4, 0.35, [11.3, 1.7, -3.83], [0, 0, 0], { bg: '#fff', fg: '#111', border: '#c62828', size: 36 }],
    ['LOST CHILD? PLEASE WAIT BY THE TILLS. LOST RONNIE? CHECK THE BAKERY.', 1.6, 0.5, [14.88, 2.0, 1.0], [0, -Math.PI / 2, 0], { bg: '#e3f2fd', fg: '#0d47a1', border: '#0d47a1', size: 36 }],
    ['TROLLEY £1 COIN. RONNIE\'S TROLLEY NEEDS A MORTGAGE.', 1.4, 0.35, [12.0, 2.3, 10.88], [0, Math.PI, 0], { bg: '#fff', fg: '#1e4ea8', border: '#ffd400', size: 36 }],
  ];
  for (const [t, w, h, pos, rot, o] of jokes) sign(t, w, h, pos, rot, o);

  // ================================================================ windows onto the car park + light
  for (const [i, x] of [3.2, 5.6, 13.3].entries()) k.window(x, 2.1, 10.86, 1.8, 1.2, Math.PI, streetViewTex(i + 3, true), { frame: 0x1e4ea8, bars: 1 });
  // bright pools under the strip lights and on the bakery and deli counters
  for (let x = -13; x <= 13; x += 3.25) for (let z = -8; z <= 8; z += 4) k.pool(x, 0, z, 3.0, 0xf4f8ff);
  for (let z = -3; z < 2.4; z += 1.3) k.pool(13.4, 0, z, 1.6, 0xffc070);
  for (let x = 10.2; x < 12.9; x += 0.8) k.pool(x, 1.0, -3.4, 0.7, 0xff8a40);
  k.pool(-3.0, 0, -9.2, 6, 0x9fffb0);     // the MONSTOR fridge glow on the floor
  return k.finish({
    name: 'Lidl',
    sky: 0xf4f8ff, ground: 0x9a9a9a, hemiI: 2.2, sun: 0xffffff, sunI: 0.9, sunPos: [3, 10, 6],
    start: { x: 10.0, z: 8.4, yaw: Math.PI * 0.15 },
    board: { x: 7.4, y: 1.38, z: 10.85, ry: Math.PI },
    startFood: ['can', 'burger', 'pizza', 'doughnut', 'doughnut', 'doughnut', 'burger', 'pizza', 'can', 'doughnut', 'burger', 'pizza', 'doughnut', 'can', 'burger', 'pizza', 'doughnut', 'can'],
    spotCount: 36,
  });
}

function productTex(seed) {
  return canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#e8eaee'; g.fillRect(0, 0, w, h);
    const palettes = [['#e53935', '#fdd835', '#1e88e5'], ['#43a047', '#fb8c00', '#8e24aa'], ['#ff7043', '#26c6da', '#ffee58'], ['#5d4037', '#ef5350', '#66bb6a']];
    const pal = palettes[seed % 4];
    for (let row = 0; row < 3; row++) {
      const y = 12 + row * 82;
      g.fillStyle = '#b9bec6'; g.fillRect(0, y + 70, w, 6);
      for (let x = 6; x < w - 20; x += 26) {
        const c = pal[(x / 26 + row + seed) % 3 | 0], ph = 40 + ((x * 7 + row * 13) % 25);
        g.fillStyle = c; g.fillRect(x, y + 70 - ph, 22, ph);
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x + 3, y + 70 - ph + 8, 16, 6);
      }
      g.fillStyle = '#ffeb3b'; for (let i = 0; i < 4; i++) g.fillRect(60 + i * 240 + seed * 20, y + 62, 30, 14);
    }
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
