// LIDL: the discount supermarket where Oliver works. Laid out from the floor plan:
//   (x east, z south; the shop floor is x -11..11, z -14.7..14.7, entrance foyer x 11..14.4)
//   back wall: MILK fridges (left), then more fridges (yoghurts, cheese, ham)
//   top half, four runs: FREEZER aisle (chest freezers on the left wall), two MIDDLE AISLES of
//     special buys, then the FRIDGE aisle with the meats against the stock-room wall
//   cross aisle
//   bottom half: ALCOHOL (left wall), TOILETRIES, CHOCOLATE, SWEETS & CRISPS, then VEG and a FRUIT stand
//   front: self-checkout pen (left), tills 3, 2, 1, magazines, the BAKERY along the angled wall,
//     entrance (FLOWERS in the foyer) and the exit lane along the front wall
//   the back stock room (STAFF ONLY, through the strip curtain) behind the meat fridges
// Mostly white, grey and black; prices and signs in blue and yellow; Lidl bags all over.
import * as THREE from 'three';
import { Stock, priceTex } from './stock.js';
import { Kit, tileTex, canvasTex, FONT, streetViewTex } from './kit.js';

const H = 4.0;

export function buildSupermarket(scene) {
  const k = new Kit(scene, { x0: -11, x1: 14.4, z0: -14.7, z1: 14.7, y1: H });
  const WALL = 0xf4f4f2, BLUE = 0x1e4ea8, YEL = 0xffd400, RED = 0xe53935, SHELF = 0xc6c9cd, LEDGE = 0xdadcdf, BLACK = 0x26282c, STEEL = 0xa8aeb6, WOOD = 0xb07a45, WHITE = 0xfafafa;
  const R = (x0, z0, x1, z1, h, y, color, opts) => k.box(Math.abs(x1 - x0), h, Math.abs(z1 - z0), (x0 + x1) / 2, y ?? h / 2, (z0 + z1) / 2, color, opts);
  const T2 = 0.08;
  const wallX = (x, z0, z1, h = H, c = WALL) => R(x - T2, z0 - T2, x + T2, z1 + T2, h, h / 2, c, { collide: true, block: true });
  const wallZ = (z, x0, x1, h = H, c = WALL) => R(x0 - T2, z - T2, x1 + T2, z + T2, h, h / 2, c, { collide: true, block: true });
  const sign = (t, w, h, pos, rot, o = {}) => k.label(t, w, h, pos, rot, o);
  const blk = (x0, z0, x1, z1, y1 = 2) => k.blockers.push({ x0, x1, z0, z1, y1 });
  const BS = { bg: '#1e4ea8', fg: '#ffd400', border: '#ffd400', size: 54 };                       // blue and yellow store signs
  const hang = (t, x, z, w = 2.2, ry = 0) => {                                                     // a sign hung from the ceiling, both sides
    for (const dx of [-w / 2 + 0.15, w / 2 - 0.15]) k.box(0.01, 0.75, 0.01, x + Math.cos(ry) * dx, H - 0.38, z - Math.sin(ry) * dx, 0x333333);
    sign(t, w, 0.45, [x + Math.sin(ry) * 0.012, H - 0.98, z + Math.cos(ry) * 0.012], [0, ry, 0], BS);
    sign(t, w, 0.45, [x - Math.sin(ry) * 0.012, H - 0.98, z - Math.cos(ry) * 0.012], [0, ry + Math.PI, 0], BS);
  };
  const stock = new Stock(), PRICES = priceTex();

  // ================================================================ shell
  k.floor(-11, -14.7, 14.4, 14.7, tileTex('#e6e6e4', '#dcdcda', '#c2c2c0', 64), 0.002, 1.2);
  k.floor(3.4, -14.7, 8.5, 3.9, tileTex('#9a9a96', '#8e8e8a', '#6e6e6a', 64), 0.003, 1.5);         // stock room concrete
  k.floor(11, 9.0, 14.4, 14.7, tileTex('#7a7a78', '#707070', '#5a5a58', 64), 0.003, 1.0);          // foyer
  R(11.3, 10.0, 13.9, 13.9, 0.012, 0.007, 0x2a2a2a);                                                // entrance mat
  k.ceiling(0xf6f6f6, 0x5a5a5a);
  wallZ(-14.7, -11, 8.5); wallX(-11, -14.7, 14.7); wallZ(14.7, -11, 14.4);
  // the stock room walls (door with a strip curtain off the meat aisle)
  wallX(3.4, -14.7, -5.3); wallX(3.4, -3.9, 3.9); R(3.32, -5.3, 3.48, -3.9, H - 2.3, 2.3 + (H - 2.3) / 2, WALL);
  for (let z = -5.28; z < -3.92; z += 0.1) R(3.38, z, 3.42, z + 0.08, 2.3, 1.15, 0xbfe0ee);
  wallZ(3.9, 3.4, 8.5); wallX(8.5, -14.7, 3.9);
  // the angled bakery walls: (3.4, 3.9) -> (6.5, 7.8) -> (11, 9.0)
  const DIAG = [[3.4, 3.9, 6.5, 7.8], [6.5, 7.8, 11.0, 9.0]];
  for (const [ax, az, bx, bz] of DIAG) {
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx);
    k.box(L + 0.16, H, 0.16, (ax + bx) / 2, H / 2, (az + bz) / 2, WALL, { rot: [0, ry, 0] });
    k.box(L, 0.25, 0.02, (ax + bx) / 2 - dz / L * 0.09, 2.9, (az + bz) / 2 + dx / L * 0.09, BLUE, { rot: [0, ry, 0] });      // brand stripe
    for (let t = 0; t <= 1; t += 0.2 / L) { const x = ax + dx * t, z = az + dz * t; blk(x - 0.12, z - 0.12, x + 0.12, z + 0.12, H); }
  }
  // what's behind the angled wall and outside the foyer: solid
  blk(8.5, -14.7, 14.4, 7.8, H); blk(11.0, 7.8, 14.4, 9.0, H);
  for (let x = 3.4; x < 11; x += 0.2) { const zd = x < 6.5 ? 3.9 + (x - 3.4) * (3.9 / 3.1) : 7.8 + (x - 6.5) * (1.2 / 4.5); if (zd - 0.15 > 3.9) blk(x, 3.9, x + 0.2, zd - 0.15, H); }
  // the front wall onto the foyer: entrance (z 9.5..11.7) and exit (z 12.6..14.4) gaps
  wallX(11, 9.0, 9.5); wallX(11, 11.7, 12.6); wallX(11, 14.4, 14.7);
  for (const [z0, z1] of [[9.5, 11.7], [12.6, 14.4]]) { R(10.92, z0, 11.08, z1, H - 2.4, 2.4 + (H - 2.4) / 2, WALL); R(10.9, z0, 11.1, z1, 0.06, 2.37, BLACK); for (const z of [z0 + 0.04, z1 - 0.04]) R(10.92, z - 0.04, 11.08, z + 0.04, 2.4, 1.2, BLACK); }
  for (const [z0, z1] of [[9.5, 9.85], [11.35, 11.7]]) R(10.97, z0, 11.03, z1, 2.3, 1.15, 0xbfe0ee);                         // sliding doors, open
  sign('ENTRANCE', 1.4, 0.3, [10.88, 2.6, 10.6], [0, -Math.PI / 2, 0], BS); sign('EXIT', 1.0, 0.3, [10.88, 2.6, 13.5], [0, -Math.PI / 2, 0], { ...BS, bg: '#fff', fg: '#1e4ea8' });
  sign('NO ENTRY', 0.6, 0.25, [11.12, 1.6, 13.5], [0, Math.PI / 2, 0], { bg: '#c62828', fg: '#fff', border: null, size: 60 });
  R(10.6, 12.62, 10.66, 14.38, 0.06, 1.0, STEEL); for (const z of [12.65, 13.5, 14.35]) R(10.6, z - 0.03, 10.66, z + 0.03, 1.0, 0.5, STEEL);   // exit gate (one way)
  k.blockers.push({ x0: 10.55, x1: 10.7, z0: 12.62, z1: 13.1, y1: 1.0 });
  // the foyer: glass doors out to the car park, flowers along the wall
  wallZ(9.0, 11, 14.4); wallX(14.4, 9.0, 14.7);
  k.window(14.36, 1.3, 11.8, 2.6, 2.4, -Math.PI / 2, streetViewTex(4, true), { frame: BLACK, bars: 1 });
  sign('LIDL', 2.2, 0.55, [14.35, 3.0, 11.8], [0, -Math.PI / 2, 0], { tex: logoTex(), glow: true });
  for (let i = 0; i < 9; i++) {           // buckets of flowers on a stepped stand
    const x = 11.4 + i * 0.33, z = 9.35 + (i % 2) * 0.28, y = (i % 2) * 0.25;
    k.cyl(0.13, 0.11, 0.28, x, y + 0.14, z, 0x2a2c30, 10);
    for (let j = 0; j < 7; j++) { const a = j * 0.9 + i, r = 0.06 + (j % 3) * 0.03; k.box(0.008, 0.45, 0.008, x + Math.cos(a) * r * 0.5, y + 0.45, z + Math.sin(a) * r * 0.5, 0x3a7a2a); k.cyl(0.04, 0.03, 0.05, x + Math.cos(a) * r, y + 0.68 + (j % 2) * 0.05, z + Math.sin(a) * r, [0xe91e63, 0xffeb3b, 0xffffff, 0xff7043, 0xab47bc][(i + j) % 5], 7); }
  }
  R(11.2, 9.1, 14.3, 9.75, 0.25, 0.125, BLACK, { block: true });
  sign('FRESH FLOWERS £2.99 (RONNIE ATE THE DAFFODILS)', 2.4, 0.3, [12.8, 1.55, 9.1], [0, 0, 0], { bg: '#ffd400', fg: '#1e4ea8', border: null, size: 40 });
  // lights: long strips in rows, and the glow pools under them
  for (let x = -9.5; x <= 2.5; x += 3) k.box(0.2, 0.05, 28.6, x, H - 0.04, 0, 0xffffff);
  for (let x = 4.5; x <= 10.5; x += 3) k.box(0.2, 0.05, 5.2, x, H - 0.04, 11.8, 0xffffff);
  for (let x = -9.5; x <= 2.5; x += 3) for (let z = -12; z <= 13; z += 5) k.pool(x, 0, z, 3.2, 0xf4f8ff);
  for (const [x, z] of [[5.5, 11], [8.5, 11.5], [12.7, 11.8]]) k.pool(x, 0, z, 3, 0xf4f8ff);
  // blue and yellow brand stripe round the shop walls
  R(-10.92, -14.6, -10.9, 14.6, 0.25, 2.9, BLUE); R(-10.92, -14.6, -10.9, 14.6, 0.08, 2.72, YEL);
  R(-10.9, 14.6, 10.9, 14.62, 0.25, 2.9, BLUE); R(-10.9, 14.6, 10.9, 14.62, 0.08, 2.72, YEL);
  R(3.48, -2.8, 3.5, 3.8, 0.25, 2.9, BLUE);

  // ================================================================ shelving
  // a double-sided gondola run along z: cats = 4 product kinds (bottom to top) per side, or null (plain back)
  const LEVELS = [0.1, 0.55, 1.05, 1.5];
  const shelf = (x, z0, z1, left, right, { capFront = true } = {}) => {
    const len = z1 - z0, zc = (z0 + z1) / 2;
    k.box(0.5, 1.8, len, x, 0.9, zc, SHELF, { collide: true, block: true });
    k.box(1.1, 0.1, len, x, 0.05, zc, BLACK);                                                    // kick plate
    for (const [side, cats] of [[-1, left], [1, right]]) {
      if (!cats) continue;
      LEVELS.forEach((y, li) => {
        k.box(0.3, 0.03, len, x + side * 0.4, y, zc, LEDGE, { collide: true });
        k.texBox(0.006, 0.04, len, x + side * 0.553, y - 0.005, zc, PRICES, { tile: 0.5 });          // blue strip, yellow price tags
        stock.addRun(cats[li], x + side * 0.37, y + 0.016, z0 + 0.05, z1 - 0.05, side);
      });
      for (let z = z0 + 0.4; z < z1 - 0.3; z += 0.55) for (const y of [0.62, 1.12, 1.57]) k.spawns.push(new THREE.Vector3(x + side * 0.45, y, z + (y > 1 ? 0.2 : 0)));
      R(x + side * 0.25 - 0.004, z0, x + side * 0.25 + 0.004, z1, 0.14, 1.95, BLUE);                // blue header strip on top
    }
    k.blockers.push({ x0: x - 0.56, x1: x + 0.56, z0, z1, y1: 1.8 });
    // end caps: yellow offer bays at both ends
    for (const [ez, dir] of [[z0, -1], [z1, 1]]) {
      R(x - 0.5, ez, x + 0.5, ez + dir * 0.45, 1.1, 0.55, WHITE, { collide: true, block: true }); R(x - 0.5, ez + dir * 0.44, x + 0.5, ez + dir * 0.46, 0.2, 1.0, YEL);
      k.spawns.push(new THREE.Vector3(x - 0.2, 1.18, ez + dir * 0.22), new THREE.Vector3(x + 0.2, 1.18, ez + dir * 0.22));
    }
  };
  // a single-sided run against a wall, facing +x (dir 1) or -x (dir -1)
  const wallShelf = (x, z0, z1, dir, cats) => {
    const len = z1 - z0, zc = (z0 + z1) / 2;
    k.box(0.12, 2.0, len, x, 1.0, zc, SHELF, { collide: true }); k.box(0.55, 0.1, len, x + dir * 0.27, 0.05, zc, BLACK);
    LEVELS.forEach((y, li) => { k.box(0.4, 0.03, len, x + dir * 0.26, y, zc, LEDGE, { collide: true }); k.texBox(0.006, 0.04, len, x + dir * 0.463, y - 0.005, zc, PRICES, { tile: 0.5 }); stock.addRun(cats[li], x + dir * 0.3, y + 0.016, z0 + 0.05, z1 - 0.05, dir); });
    for (let z = z0 + 0.4; z < z1 - 0.3; z += 0.55) for (const y of [0.62, 1.12, 1.57]) k.spawns.push(new THREE.Vector3(x + dir * 0.36, y, z));
    k.blockers.push({ x0: Math.min(x, x + dir * 0.48), x1: Math.max(x, x + dir * 0.48), z0, z1, y1: 2 });
  };
  // an open multideck chiller, running along x (against the back wall, facing +z) or along z (facing +x)
  const chiller = (along, c, a0, a1, dir, cats, tag) => {
    const len = a1 - a0, ac = (a0 + a1) / 2, P = (o, w, h, d, y, col, opts) => along === 'x' ? k.box(len * w, h, d, ac, y, c + dir * o, col, opts) : k.box(d, h, len * w, c + dir * o, y, ac, col, opts);
    P(0.05, 1, 2.1, 0.1, 1.05, BLACK);                                   // black back
    P(0.35, 1, 0.3, 0.6, 0.15, BLACK, { collide: true });                // base
    P(0.32, 1, 0.12, 0.66, 2.1, BLACK);                                  // canopy
    P(0.6, 1, 0.03, 0.06, 2.02, 0xeaf6ff);                               // light strip
    [0.35, 0.75, 1.15, 1.55].forEach((y, li) => {
      P(0.33, 1, 0.025, 0.52, y, 0xe8ecef, { collide: true });
      const pc = c + dir * 0.6, pz = y - 0.005;
      if (along === 'x') { k.texBox(len, 0.04, 0.006, ac, pz, pc, PRICES, { tile: 0.5 }); stock.addRunX(cats[li], c + dir * 0.3, y + 0.013, a0 + 0.05, a1 - 0.05, dir); }
      else { k.texBox(0.006, 0.04, len, pc, pz, ac, PRICES, { tile: 0.5 }); stock.addRun(cats[li], c + dir * 0.3, y + 0.013, a0 + 0.05, a1 - 0.05, dir); }
      for (let a = a0 + 0.35; a < a1 - 0.3; a += 0.6) k.spawns.push(along === 'x' ? new THREE.Vector3(a, y + 0.07, c + dir * 0.45) : new THREE.Vector3(c + dir * 0.45, y + 0.07, a));
    });
    for (let a = a0 + 1; a < a1; a += 2) k.lamp(along === 'x' ? a : c + dir * 0.5, 1.98, along === 'x' ? c + dir * 0.5 : a, 0xe0f4ff, 0.05, false);
    if (along === 'x') { blk(a0, Math.min(c, c + dir * 0.68), a1, Math.max(c, c + dir * 0.68)); sign(tag, 2.2, 0.32, [ac, 2.32, c + dir * 0.68], [0, dir > 0 ? 0 : Math.PI, 0], BS); }
    else { blk(Math.min(c, c + dir * 0.68), a0, Math.max(c, c + dir * 0.68), a1); sign(tag, 2.2, 0.32, [c + dir * 0.68, 2.32, ac], [0, dir * Math.PI / 2, 0], BS); }
  };

  // ---- back wall: MILK, then more fridge bits
  chiller('x', -14.62, -10.9, -6.1, 1, ['milk', 'milk', 'milk', 'yog'], 'MILK');
  chiller('x', -14.62, -6.0, 3.25, 1, ['meat', 'yog', 'jar', 'yog'], 'CHEESE, HAM & YOGHURTS');
  sign('MILK: 4 PINTS FOR £1.45 (RONNIE: "IS THAT ONE SERVING?")', 2.4, 0.4, [-8.5, 2.75, -14.5], [0, 0, 0], { bg: '#fff', fg: '#1e4ea8', border: '#ffd400', size: 40 });
  // ---- top half: freezer aisle, two middle aisles, the meat fridge
  const ZA0 = -12.3, ZA1 = -5.9, ZB0 = -3.5, ZB1 = 3.5;
  // chest freezers along the left wall, frozen stuff stacked inside under sliding glass lids
  for (const [z0, z1] of [[-13.6, -10.0], [-9.8, -6.2]]) {
    R(-10.95, z0, -10.0, z1, 0.85, 0.425, WHITE, { collide: true, block: true }); R(-10.97, z0, -9.98, z1, 0.08, 0.04, BLACK);
    R(-10.9, z0 + 0.05, -10.05, z1 - 0.05, 0.02, 0.87, 0xbfe3f5);
    stock.addRun('froze', -10.47, 0.6, z0 + 0.1, z1 - 0.1, 1);
    k.texBox(0.006, 0.05, z1 - z0, -9.995, 0.78, (z0 + z1) / 2, PRICES, { tile: 0.5 });
    for (let z = z0 + 0.4; z < z1 - 0.3; z += 0.6) k.spawns.push(new THREE.Vector3(-10.47, 0.95, z));
  }
  shelf(-7.27, ZA0, ZA1, ['froze', 'froze', 'froze', 'froze'], ['buy', 'buy', 'buy', 'roll']);
  R(-7.84, ZA0, -7.83, ZA1, 1.75, 0.95, 0xcfeaf6, {});                                                   // (upright freezer doors over that side)
  for (let z = ZA0; z <= ZA1; z += 0.8) R(-7.86, z - 0.02, -7.82, z + 0.02, 1.75, 0.95, BLACK);
  shelf(-4.12, ZA0, ZA1, ['buy', 'roll', 'buy', 'buy'], ['buy', 'buy', 'roll', 'buy']);
  shelf(-0.99, ZA0, ZA1, ['buy', 'buy', 'tin', 'buy'], ['tin', 'pasta', 'jar', 'cereal']);
  chiller('z', 1.1, -11.9, -6.1, 1, ['meat', 'meat', 'meat', 'meat'], 'FRESH MEAT');
  k.box(0.08, 2.1, 5.8, 1.08, 1.05, -9.0, 0xdfe2e5);                                                   // (back of the meat fridge, facing the middle aisle)
  // ---- bottom half: alcohol, toiletries, chocolate sweets & crisps, veg and fruit
  wallShelf(-10.95, ZB0, ZB1, 1, ['can', 'wine', 'wine', 'bottle']);
  shelf(-7.27, ZB0, ZB1, ['wine', 'bottle', 'wine', 'wine'], ['toil', 'toil', 'roll', 'toil']);
  shelf(-4.12, ZB0, ZB1, ['toil', 'roll', 'toil', 'toil'], ['choc', 'sweets', 'crisps', 'choc']);
  shelf(-0.99, ZB0, ZB1, ['crisps', 'choc', 'sweets', 'crisps'], ['cereal', 'loaf', 'tube', 'cereal']);
  for (let i = 0; i < 4; i++) R(-9.8 + (i % 2) * 0.45, ZB0 - 0.9, -9.4 + (i % 2) * 0.45, ZB0 - 0.6, 0.3, 0.15 + Math.floor(i / 2) * 0.3, [0xc8a050, 0x2e7d32][i % 2], { block: true });   // crates of beer stacked at the end
  sign('ALCOHOL — CHALLENGE 25 (RONNIE: CHALLENGE 25 SAUSAGE ROLLS)', 2.4, 0.4, [-10.87, 2.45, 0], [0, Math.PI / 2, 0], { bg: '#fff', fg: '#1e4ea8', border: '#ffd400', size: 40 });
  // fruit and veg: angled crate stands (natural colours, black crates)
  const crates = (x, z, w, d, cols, rows) => {
    R(x - w / 2, z - d / 2, x + w / 2, z + d / 2, 0.72, 0.36, BLACK, { collide: true, block: true });
    const cw = w / 2, cd = d / rows;
    cols.forEach((c, i) => { const cx = x - w / 4 + (i % 2) * cw, cz = z - d / 2 + cd / 2 + Math.floor(i / 2) * cd; R(cx - cw / 2 + 0.03, cz - cd / 2 + 0.03, cx + cw / 2 - 0.03, cz + cd / 2 - 0.03, 0.1, 0.77, 0x3a3c40);
      for (let j = 0; j < 6; j++) k.cyl(0.05, 0.05, 0.08, cx - 0.14 + (j % 3) * 0.14, 0.86, cz - 0.1 + Math.floor(j / 3) * 0.2, c, 8); k.spawns.push(new THREE.Vector3(cx, 0.95, cz)); });
    k.texBox(w, 0.05, 0.006, x, 0.72, z + d / 2 + 0.003, PRICES, { tile: 0.5 }); k.texBox(w, 0.05, 0.006, x, 0.72, z - d / 2 - 0.003, PRICES, { tile: 0.5 });
  };
  crates(1.8, -2.4, 1.3, 1.9, [0x2e7d32, 0xff7a1a, 0xf5f0dc, 0x6a1b9a, 0x8bc34a, 0xd32f2f], 3);         // vegetables
  crates(1.8, -0.1, 1.3, 1.9, [0x9ccc3a, 0xe8e0c8, 0x6aaa3a, 0xb06a2a, 0x2f6b2a, 0xffc107], 3);
  crates(1.5, 1.85, 1.0, 2.6, [0xd62828, 0xff8c1a, 0xffe135, 0x7cb342, 0xe53935, 0x9ccc65, 0xffe135, 0xff8c1a], 4);   // the fruit stand
  sign('BANANAS: 5 FOR 50p (RONNIE: "WHAT\'S A BANANA?")', 1.0, 0.3, [1.5, 1.05, 3.16], [0, 0, 0], { bg: '#ffd400', fg: '#1e4ea8', border: null, size: 36 });
  // the MONSTOR fridge against the stock-room wall, glowing
  R(2.85, -3.3, 3.32, -1.7, 2.0, 1.0, BLACK, { block: true }); k.label('fridges', 1.6, 1.8, [2.84, 1.0, -2.5], [0, -Math.PI / 2, 0], { tex: fridgeTex(), glow: true });
  for (let z = -3.0; z < -1.8; z += 0.4) for (const y of [0.5, 1.0, 1.5]) k.spawns.push(new THREE.Vector3(2.95, y, z));
  for (const y of [0.42, 0.92, 1.42]) R(2.85, -3.25, 3.3, -1.75, 0.03, y, 0x444444, { collide: true });
  k.pool(2.6, 0, -2.5, 2.4, 0x9fffb0);
  // ---- the hanging aisle signs
  hang('FREEZERS', -9.4, -9.1, 1.8, 0); hang('MIDDLE AISLE', -5.7, -9.1, 2.0, 0); hang('MIDDLE AISLE', -2.55, -9.1, 2.0, 0); hang('FRESH MEAT', 2.65, -9.1, 1.6, 0);
  hang('ALCOHOL', -9.1, 0, 1.8, 0); hang('TOILETRIES', -5.7, 0, 1.8, 0); hang('CHOCOLATE, SWEETS & CRISPS', -2.55, 0, 2.6, 0); hang('FRUIT & VEG', 2.4, 0, 1.6, 0);
  sign('MIDDLE AISLE: ANYTHING CAN HAPPEN (RONNIE WILL EAT IT)', 3.0, 0.6, [-4.1, 2.6, ZA1 + 0.47], [0, 0, 0], { bg: '#ffd400', fg: '#1e4ea8', border: '#e53935', size: 56, glow: true });

  // ================================================================ bakery, along the angled wall
  for (const [ax, az, bx, bz] of DIAG) {
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = -uz, nz = ux, ry = Math.atan2(-dz, dx);
    for (let t = 0.45; t < L - 0.4; t += 0.64) {
      const x = ax + ux * t + nx * 0.33, z = az + uz * t + nz * 0.33;
      k.box(0.6, 2.0, 0.5, x, 1.0, z, 0xb88a52, { rot: [0, ry, 0] });                               // wooden bin unit
      for (const y of [0.55, 1.05, 1.55]) {
        k.box(0.56, 0.3, 0.03, x + nx * 0.26, y + 0.27, z + nz * 0.26, 0xcfe8f2, { rot: [0, ry, 0] }); k.box(0.56, 0.03, 0.05, x + nx * 0.26, y + 0.42, z + nz * 0.26, 0x8a5a2a, { rot: [0, ry, 0] });   // perspex flap with a wooden handle bar
        k.box(0.54, 0.02, 0.44, x + nx * 0.02, y, z + nz * 0.02, 0xf2e6d0, { rot: [0, ry, 0] });
        k.colliders.push({ min: new THREE.Vector3(x - 0.2, y - 0.02, z - 0.2), max: new THREE.Vector3(x + 0.2, y + 0.01, z + 0.2) });
        k.spawns.push(new THREE.Vector3(x + nx * 0.05, y + 0.08, z + nz * 0.05));
      }
      blk(x - 0.3, z - 0.3, x + 0.3, z + 0.3);
    }
    k.lamp((ax + bx) / 2 + nx * 0.5, 2.3, (az + bz) / 2 + nz * 0.5, 0xffd8a0, 0.08);
    sign('BAKERY', 1.6, 0.4, [(ax + bx) / 2 + nx * 0.1, 2.6, (az + bz) / 2 + nz * 0.1], [0, ry, 0], BS);
  }
  sign('IN-STORE BAKERY — FRESH EVERY 2 HOURS (RONNIE: EVERY 2 MINUTES)', 3.4, 0.36, [8.8, 3.2, 8.55], [0, Math.atan2(-1.2, 4.5), 0], { bg: '#fff3e0', fg: '#8a4a10', border: '#ffd400', size: 40, glow: true });
  R(6.2, 8.3, 6.6, 8.7, 0.9, 0.45, 0xc8a070, { block: true }); R(6.22, 8.35, 6.58, 8.65, 0.25, 1.02, 0xf2e6d0);   // paper bags and tongs
  for (const [x, z] of [[5.2, 6.6], [8.6, 8.9]]) k.pool(x, 0, z, 2.2, 0xffd8a0);

  // ================================================================ front: self checkouts, tills, magazines
  const PART = (x0, z0, x1, z1, h = 1.15) => R(Math.min(x0, x1) - 0.05, Math.min(z0, z1) - 0.05, Math.max(x0, x1) + 0.05, Math.max(z0, z1) + 0.05, h, h / 2, 0x3a3c40, { collide: true, block: true });
  PART(-11, 5.27, -7.67, 5.27, 1.4); R(-11, 5.2, -7.6, 5.34, 0.12, 1.46, BLUE);
  sign('CUSTOMER SERVICE (RONNIE: PLEASE STOP ASKING FOR THE MANAGER\'S LUNCH)', 2.6, 0.35, [-9.3, 2.4, 5.36], [0, 0, 0], { bg: '#fff', fg: '#1e4ea8', border: '#ffd400', size: 36 });
  PART(-9.93, 6.6, -7.13, 6.6); PART(-7.13, 6.6, -7.13, 7.8); PART(-7.13, 7.8, -4.93, 7.8); PART(-4.93, 7.8, -4.93, 12.33); PART(-11, 7.8, -8.33, 7.8);
  // self-checkout kiosks in the pen
  const kiosk = (x, z, dir) => {
    R(x - 0.3, z - 0.32, x + 0.3, z + 0.32, 0.9, 0.45, 0xe6e6e4, { block: true, collide: true });
    k.box(0.05, 0.36, 0.48, x - dir * 0.18, 1.18, z, BLACK, { rot: [0, 0, dir * 0.3] }); k.label('scan', 0.42, 0.3, [x - dir * 0.15, 1.19, z], [0, dir * Math.PI / 2, -dir * 0.3], { tex: kioskTex(), glow: true });
    R(x + dir * 0.32 - 0.25, z - 0.3, x + dir * 0.32 + 0.25, z + 0.3, 0.8, 0.4, 0xd0d2d4, { block: true });                  // bagging area
    k.box(0.12, 0.02, 0.22, x, 0.91, z, 0x111111);                                                                            // scanner glass
    k.spawns.push(new THREE.Vector3(x + dir * 0.32, 0.86, z));
  };
  for (const z of [9.0, 10.4, 11.8, 13.2]) kiosk(-10.4, z, 1);
  for (const z of [9.0, 10.4, 11.8]) kiosk(-5.65, z, -1);
  hang('SELF CHECKOUTS', -8.0, 10.6, 2.4, 0);
  sign('UNEXPECTED ITEM IN BAGGING AREA: RONNIE', 1.8, 0.3, [-4.86, 1.4, 10.0], [0, Math.PI / 2, 0], { bg: '#003', fg: '#ff5252', border: null, size: 34, glow: true });
  // staffed tills 3, 2, 1: black belts, a cashier's seat, a number on a pole, sweets at the end
  [[-3.45, '3'], [-0.99, '2'], [1.53, '1']].forEach(([x, n]) => {
    R(x - 0.4, 7.15, x + 0.4, 12.3, 0.85, 0.425, BLACK, { collide: true, block: true });
    R(x - 0.3, 7.25, x + 0.3, 10.6, 0.02, 0.86, 0x111111); R(x - 0.32, 10.6, x + 0.32, 10.62, 0.06, 0.88, 0x555555);
    R(x - 0.38, 10.7, x + 0.38, 12.25, 0.03, 0.865, 0x8a8e94);                                                              // packing shelf
    R(x + 0.45, 10.7, x + 1.0, 11.4, 0.85, 0.425, 0x3a3c40, { block: true }); R(x + 0.5, 10.8, x + 0.95, 11.3, 0.3, 1.0, BLACK);   // cashier's seat
    k.box(0.32, 0.22, 0.05, x + 0.25, 1.15, 10.55, BLACK); k.box(0.28, 0.18, 0.01, x + 0.25, 1.15, 10.52, 0x2a6ad8);     // till screen
    k.cyl(0.025, 0.025, 1.9, x - 0.3, 1.8, 7.2, 0x888888, 6);
    sign(n, 0.42, 0.42, [x - 0.3, 2.85, 7.2], [0, 0, 0], { bg: '#1e4ea8', fg: '#ffd400', border: '#ffd400', size: 200 });
    sign(n, 0.42, 0.42, [x - 0.3, 2.85, 7.19], [0, Math.PI, 0], { bg: '#1e4ea8', fg: '#ffd400', border: '#ffd400', size: 200 });
    k.spawns.push(new THREE.Vector3(x, 0.95, 8.0), new THREE.Vector3(x, 0.95, 9.2), new THREE.Vector3(x, 0.92, 11.6));
    R(x - 0.85, 7.15, x - 0.5, 8.2, 1.3, 0.65, WHITE, { collide: true, block: true });                                         // sweets rack
    for (const [i, y] of [0.45, 0.8, 1.15].entries()) { R(x - 0.86, 7.2, x - 0.84, 8.15, 0.14, y, [RED, YEL, 0x8e24aa][i]); k.spawns.push(new THREE.Vector3(x - 0.67, y + 0.12, 7.6)); }
  });
  sign('TILL 3: OLIVER (FILMING YOU)', 0.9, 0.3, [-3.75, 2.35, 7.21], [0, 0, 0], { bg: '#fff', fg: '#1e4ea8', border: '#ffd400', size: 40 });
  // magazines: a rack facing the tills and a long low rack between the entrance and the exit lane
  const mags = magTex();
  R(3.3, 8.3, 3.5, 12.3, 1.3, 0.65, SHELF, { collide: true, block: true }); k.label('mags', 4.0, 1.1, [3.29, 0.68, 10.3], [0, -Math.PI / 2, 0], { tex: mags }); k.label('mags', 4.0, 1.1, [3.51, 0.68, 10.3], [0, Math.PI / 2, 0], { tex: mags });
  for (const [x0, x1] of [[3.4, 4.5], [8.33, 10.9]]) { R(x0, 12.1, x1, 12.3, 1.2, 0.6, SHELF, { collide: true, block: true }); k.label('mags', x1 - x0, 1.0, [(x0 + x1) / 2, 0.62, 12.09], [0, Math.PI, 0], { tex: mags }); k.label('mags', x1 - x0, 1.0, [(x0 + x1) / 2, 0.62, 12.31], [0, 0, 0], { tex: mags }); }
  hang('MAGAZINES', 6.4, 12.2, 1.8, 0);
  sign('EXIT — RECEIPTS ARE CHECKED. RONNIE\'S RECEIPT IS 4 METRES LONG.', 2.6, 0.35, [6.4, 1.6, 14.58], [0, Math.PI, 0], { bg: '#fff', fg: '#111', border: '#1e4ea8', size: 36 });
  // windows onto the car park along the front
  for (const [i, x] of [-2.2, 0.4, 8.5].entries()) k.window(x, 2.1, 14.6, 1.8, 1.2, Math.PI, streetViewTex(i + 3, true), { frame: BLACK, bars: 1 });

  // ================================================================ Lidl bags: at the tills, the kiosks, a rack of them, a few dropped
  const bagGeo = new THREE.BoxGeometry(0.34, 0.38, 0.16); bagGeo.translate(0, 0.19, 0);
  const bagSide = new THREE.MeshLambertMaterial({ color: BLUE }), bagFace = new THREE.MeshLambertMaterial({ map: bagTex() });
  const bagMat = [bagSide, bagSide, bagSide, bagSide, bagFace, bagFace];
  const handleGeo = new THREE.TorusGeometry(0.08, 0.012, 4, 10, Math.PI); handleGeo.translate(0, 0.38, 0);
  const handleMat = new THREE.MeshLambertMaterial({ color: YEL });
  const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), V4 = new THREE.Vector3(), S4 = new THREE.Vector3(1, 1, 1), UP = new THREE.Vector3(0, 1, 0);
  const bag = (x, y, z, ry = 0, tip = 0) => { Q4.setFromEuler(new THREE.Euler(tip, ry, 0, 'YXZ')); M4.compose(V4.set(x, y, z), Q4, S4); k.instance(bagGeo, bagMat, M4.clone()); for (const s of [-0.05, 0.05]) { const h = M4.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, s)); k.instance(handleGeo, handleMat, h); } };
  for (const x of [-3.45, -0.99, 1.53]) { bag(x - 0.1, 0.88, 11.9, 0.2); bag(x + 0.15, 0.88, 11.5, -0.3); }
  for (const z of [9.0, 10.4, 11.8, 13.2]) bag(-10.08, 0.8, z, Math.PI / 2);
  for (const z of [9.0, 10.4, 11.8]) bag(-5.97, 0.8, z, -Math.PI / 2);
  // the bag-for-life rack by the tills
  R(2.4, 6.2, 3.2, 6.5, 1.6, 0.8, STEEL, { block: true });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) bag(2.55 + i * 0.25, 0.5 + j * 0.6, 6.12, 0);
  sign('BAG FOR LIFE 20p (RONNIE\'S ARE FOR LUNCH)', 0.9, 0.25, [2.8, 1.75, 6.1], [0, Math.PI, 0], { bg: '#ffd400', fg: '#1e4ea8', border: null, size: 36 });
  // a few left lying round the shop (somebody's had a sweep already)
  for (const [x, z, ry] of [[-5.6, -8.0, 0.4], [-2.4, 1.5, 2.0], [-9.0, -1.2, 1.0], [2.6, -9.5, 3.0], [-6.0, 4.6, 0.8], [5.0, 10.6, 2.4], [-8.5, -4.6, 1.6]]) bag(x, 0.0, z, ry, (ry * 7) % 1 > 0.5 ? 1.45 : 0);

  // ================================================================ the back stock room (STAFF ONLY)
  sign('STAFF ONLY (YES, RONNIE, THAT MEANS YOU)', 1.4, 0.3, [3.24, 2.5, -4.6], [0, -Math.PI / 2, 0], { bg: '#c62828', fg: '#fff', border: null, size: 44 });
  const pallet = (x, z, c, h) => { R(x - 0.6, z - 0.5, x + 0.6, z + 0.5, 0.14, 0.07, 0xc8a070, { collide: true }); R(x - 0.55, z - 0.45, x + 0.55, z + 0.45, h, 0.14 + h / 2, c, { collide: true, block: true }); k.spawns.push(new THREE.Vector3(x, 0.14 + h + 0.08, z)); };
  pallet(5.0, -13.6, 0xc8a070, 1.1); pallet(6.6, -13.6, 0x39a845, 0.9); pallet(7.6, -11.6, 0xc8a070, 1.4); pallet(5.0, -9.0, 0xe8e8e8, 0.8); pallet(7.6, -7.0, 0xc8a070, 1.2);
  sign('MONSTOR: 4,000 CANS. ORDERED BY: ???. DRUNK BY: ONE MAN.', 1.0, 0.4, [6.6, 1.3, -13.09], [0, 0, 0], { bg: '#111', fg: '#39ff14', border: '#39ff14', size: 36, glow: true });
  for (const z of [-4.0, -2.8]) { R(5.4, z - 0.35, 6.2, z + 0.35, 0.04, 0.2, 0x777777); for (const dx of [-0.38, 0.38]) R(5.8 + dx - 0.02, z - 0.35, 5.8 + dx + 0.02, z + 0.35, 1.6, 0.9, 0x777777); R(5.4, z - 0.3, 6.2, z + 0.3, 0.9, 0.67, 0xd6b48a, { block: true }); }
  R(7.4, -4.6, 8.3, -4.1, 0.12, 0.12, RED); R(7.4, -4.6, 7.5, -4.1, 1.1, 0.6, RED);                               // pallet jack
  // racking down the back wall of the stock room, full of boxes
  for (const y of [0.1, 1.0, 1.9, 2.8]) R(8.0, -12.4, 8.42, -1.0, 0.05, y, 0xff8a1f, { collide: true });
  for (const z of [-12.4, -8.6, -4.8, -1.0]) R(7.98, z - 0.04, 8.44, z + 0.04, 3.0, 1.5, 0x1e4ea8);
  for (let z = -12.2; z < -1.2; z += 0.55) for (const y of [0.13, 1.03, 1.93]) R(8.03, z, 8.4, z + 0.45, 0.4 + ((z * 7 + y) % 0.3), y + 0.22, [0xc8a070, 0xd6b48a, 0xb8905a][Math.abs(Math.round(z * 3 + y)) % 3]);
  blk(7.95, -12.4, 8.5, -1.0, 3);
  // a staff corner: table, kettle, lockers, the rota
  R(4.0, 1.6, 5.4, 2.6, 0.04, 0.74, 0xe0e0e0, { collide: true }); R(4.65, 2.05, 4.75, 2.15, 0.72, 0.36, 0x333333); blk(4.0, 1.6, 5.4, 2.6, 0.76);
  k.chair(4.3, 1.2, Math.PI, 0x1e4ea8); k.chair(5.1, 1.2, Math.PI, 0x1e4ea8);
  k.spawns.push(new THREE.Vector3(4.4, 0.84, 2.1), new THREE.Vector3(5.1, 0.84, 2.1));
  k.cyl(0.07, 0.08, 0.22, 5.2, 0.87, 2.4, 0xeeeeee, 10);
  for (let x = 6.0; x < 8.3; x += 0.42) R(x, 3.45, x + 0.4, 3.8, 1.9, 0.95, 0x607d8b, { block: true });
  sign("OLIVER'S LOCKER: CONTAINS ONE (1) EMERGENCY SANDWICH. IT'S GONE. RONNIE.", 0.36, 0.5, [6.22, 1.4, 3.44], [0, Math.PI, 0], { bg: '#fff', fg: '#111', border: null, size: 30 });
  sign('STAFF ROTA — Oliver: tills · Oliver: filming customers · Aidan W: sitting down (knee) · Ronnie: BANNED', 1.3, 0.7, [3.5, 1.6, 1.0], [0, Math.PI / 2, 0], { bg: '#fffde7', fg: '#111', border: '#1e4ea8', size: 34 });
  for (let z = -13; z < 3; z += 4) k.lamp(6.0, H - 0.1, z, 0xffffff, 0.08);

  // ================================================================ branding + jokes
  sign('LIDL', 4, 0.95, [-10.88, 3.35, -4.7], [0, Math.PI / 2, 0], { tex: logoTex(), glow: true });
  sign('LIDL', 4, 0.95, [-4.0, 3.35, 14.58], [0, Math.PI, 0], { tex: logoTex(), glow: true });
  const jokes = [
    ['PRICE: PRICELESS (PLEASE LEAVE)', 1.6, 0.45, [-10.88, 2.0, 9.5], [0, Math.PI / 2, 0], { bg: '#000', fg: '#ffd400', border: null, size: 50, glow: true }],
    ['CUSTOMER OF THE MONTH: RONNIE (12 MONTHS RUNNING) (NOT RUNNING. WALKING SLOWLY. TO THE BAKERY.)', 1.4, 0.9, [-10.88, 1.9, -8.0], [0, Math.PI / 2, 0], { bg: '#fffde7', fg: '#111', border: '#1e4ea8', size: 36 }],
    ['WE PRICE-MATCH ANY SUPERMARKET THAT HASN\'T BANNED RONNIE (THERE ARE NONE LEFT)', 1.8, 0.6, [3.32, 1.9, 1.5], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#1e4ea8', border: '#ffd400', size: 36 }],
    ['LOST CHILD? PLEASE WAIT BY THE TILLS. LOST RONNIE? CHECK THE BAKERY.', 1.6, 0.5, [10.88, 2.0, 12.15], [0, -Math.PI / 2, 0], { bg: '#e3f2fd', fg: '#0d47a1', border: '#0d47a1', size: 36 }],
    ['TROLLEY £1 COIN. RONNIE\'S TROLLEY NEEDS A MORTGAGE.', 1.4, 0.35, [12.7, 2.3, 14.58], [0, Math.PI, 0], { bg: '#fff', fg: '#1e4ea8', border: '#ffd400', size: 36 }],
  ];
  for (const [t, w, h, pos, rot, o] of jokes) sign(t, w, h, pos, rot, o);
  // trolleys and baskets in the foyer
  for (let i = 0; i < 5; i++) { const z = 13.0 + i * 0.3; R(13.2, z - 0.13, 14.2, z + 0.13, 0.04, 0.95, 0x9aa0a8); R(13.2, z - 0.13, 13.25, z + 0.13, 0.9, 0.5, 0x9aa0a8); R(14.12, z - 0.14, 14.22, z + 0.14, 0.05, 1.0, BLUE); }
  blk(13.1, 12.8, 14.35, 14.6, 1.1);
  for (let i = 0; i < 4; i++) R(11.3, 14.1 + 0 * i, 11.9, 14.5, 0.22, 0.12 + i * 0.22, i % 2 ? YEL : BLUE);
  blk(11.25, 14.05, 11.95, 14.55, 1);

  stock.build(scene);
  return k.finish({
    name: 'Lidl',
    sky: 0xf4f8ff, ground: 0x9a9a9a, hemiI: 2.2, sun: 0xffffff, sunI: 0.9, sunPos: [3, 10, 6],
    start: { x: 12.6, z: 11.0, yaw: Math.PI / 2 },
    board: { x: 8.8, y: 1.4, z: 14.6, ry: Math.PI },
    startFood: ['can', 'burger', 'pizza', 'doughnut', 'doughnut', 'doughnut', 'burger', 'pizza', 'can', 'doughnut', 'burger', 'pizza', 'doughnut', 'can', 'burger', 'pizza', 'doughnut', 'can'],
    spotCount: 36,
  });
}

function bagTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#1e4ea8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd400'; g.fillRect(0, h - 46, w, 46);
    g.fillStyle = '#ffd400'; g.beginPath(); g.arc(w / 2, h / 2 - 10, 86, 0, 7); g.fill();
    g.strokeStyle = '#e53935'; g.lineWidth = 8; g.beginPath(); g.arc(w / 2, h / 2 - 10, 78, 0, 7); g.stroke();
    g.fillStyle = '#e53935'; g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Lidl', w / 2, h / 2 - 6);
    g.fillStyle = '#1e4ea8'; g.font = `900 22px ${FONT}`; g.fillText('BAG FOR LIFE', w / 2, h - 23);
  });
}
function kioskTex() {
  return canvasTex(256, 192, (g, w, h) => {
    g.fillStyle = '#1e4ea8'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd400'; g.fillRect(0, 0, w, 36);
    g.fillStyle = '#1e4ea8'; g.font = `900 22px ${FONT}`; g.textAlign = 'center'; g.fillText('SCAN YOUR ITEMS', w / 2, 26);
    g.fillStyle = '#fff'; g.font = `900 18px ${FONT}`; g.fillText('Unexpected item', w / 2, 90); g.fillText('in bagging area', w / 2, 116);
    g.fillStyle = '#ffd400'; g.fillRect(w / 2 - 60, 140, 120, 34); g.fillStyle = '#1e4ea8'; g.fillText('PAY £0.00', w / 2, 164);
  });
}
function magTex() {
  return canvasTex(1024, 300, (g, w, h) => {
    g.fillStyle = '#c6c9cd'; g.fillRect(0, 0, w, h);
    const cols = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa', '#ff7043', '#111', '#ec407a'], titles = ['HEAT', 'GOSSIP!', 'TOTAL FOOTY', 'MATCH', 'CAKE WEEKLY', 'TV TIMES', 'GAMER', 'CHAT'];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) {
      const x = 6 + i * 84, y = 6 + r * 98, c = cols[(i * 3 + r) % 8];
      g.fillStyle = c; g.fillRect(x, y, 78, 90); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(x + 8, y + 28, 62, 44);
      g.fillStyle = c === '#fdd835' ? '#111' : '#fff'; g.font = `900 14px ${FONT}`; g.textAlign = 'center'; g.fillText(titles[(i + r * 5) % 8], x + 39, y + 20);
      if ((i + r) % 5 === 0) { g.fillStyle = '#c62828'; g.font = `900 11px ${FONT}`; g.fillText('RONNIE: BANNED', x + 39, y + 84); }
    }
  });
}
function backTex() {
  return canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#dfe3e8'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 6; y < h; y += 16) for (let x = 6; x < w; x += 16) g.fillRect(x, y, 3, 3); });   // pegboard
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
