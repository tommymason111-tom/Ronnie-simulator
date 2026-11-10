// THE OYSTERFLEET — Ronnie's local and workplace (design doc section 84),
// laid out from the floor plan: pub floor with booths, tables and a fireplace,
// the bar with stools and back-bar, kitchen, toilets, and the gambling room
// with the poker table and fruit machines. About 27m x 22m.
// Look (from a photo of the real pub): bright cream ceiling and tongue-and-groove
// fascia, red-brick pillars with up/down wall lights, dark wood posts and beams,
// brick and "library" walls in the alcoves, burgundy patterned carpet, grey-brown
// tiles along the bar, honey-oak bar with brass rails and burgundy leather stools,
// tall poseur tables with cream stools, light-wood and dark wheelback chairs,
// iron chandeliers and amber glass pendants.
import * as THREE from 'three';
import { Kit, carpetTex, tileTex, woodTex, canvasTex, fitText, FONT, brickTex, booksWallTex, tngTex, oakPanelTex } from './kit.js';

const S = 0.022, X = (px) => (px - 660) * S, Z = (py) => (py - 505) * S;
const W = (a, b) => Math.abs(X(b) - X(a));
const H = 3.0;

export function buildPub(scene) {
  const k = new Kit(scene, { x0: X(50), x1: X(1280), z0: Z(5), z1: Z(1000), y1: H });
  const WALL = 0xeee6d6, PLASTER = 0xf2ecdf, DARKWOOD = 0x3a2416, WOOD = 0x4a2c18, REDLEATHER = 0x7a1f2a, BRASS = 0xc9a24a, CREAM = 0xe8dcc0, LIGHTWOOD = 0xc89a5a;
  const BRICK = brickTex(), BOOKS = booksWallTex(), TNG = tngTex(), OAK = oakPanelTex();
  // rect in plan pixels -> box
  const rect = (px0, py0, px1, py1, h, y, color, opts = {}) => k.box(W(px0, px1), h, Math.abs(Z(py1) - Z(py0)), (X(px0) + X(px1)) / 2, y ?? h / 2, (Z(py0) + Z(py1)) / 2, color, opts);
  const solid = (px0, py0, px1, py1, color = WALL) => rect(px0, py0, px1, py1, H, H / 2, color, { collide: true, block: true });

  // ---- floors ----
  const carpet = carpetTex('#6a2430', '#4a1620', '#93404a'), tiles = tileTex('#8f8574', '#837a69', '#5e574b', 85), kTiles = tileTex('#c9c9c4', '#bdbdb7', '#8f8f8a', 48), bTiles = tileTex('#d8d8d8', '#cfcfcf', '#9a9a9a', 40);
  k.floor(X(330), Z(160), X(905), Z(1000), carpet, 0.002, 1.2);
  k.floor(X(905), Z(150), X(1100), Z(1000), tiles, 0.003, 1.0);
  k.floor(X(990), Z(680), X(1275), Z(990), carpet, 0.004, 1.2);
  k.floor(X(55), Z(290), X(355), Z(580), kTiles, 0.002, 0.8);
  k.floor(X(455), Z(5), X(825), Z(160), bTiles, 0.002, 0.6);
  k.floor(X(825), Z(40), X(1100), Z(160), tiles, 0.002, 1.0);
  k.ceiling(0xf7f3ea, 0xbdb5a2);
  for (let px = 380; px < 1080; px += 90) for (let py = 200; py < 980; py += 90) k.lamp(X(px), H - 0.01, Z(py), 0xfffbe8, 0.035);   // ceiling spotlights

  k.perimeter(WALL);
  // ---- the outside of the building (solid), so the plan's shape is walkable ----
  solid(50, 5, 355, 290); solid(355, 5, 455, 160); solid(355, 160, 400, 230);
  solid(825, 5, 1280, 40); solid(825, 40, 860, 120);
  solid(1100, 40, 1280, 660); solid(50, 580, 330, 1000);

  // ---- interior walls (doorways left open as on the plan) ----
  const wallX = (px, py0, py1) => k.wall(X(px), Z(py0), X(px), Z(py1), H, PLASTER);
  const wallZ = (py, px0, px1) => k.wall(X(px0), Z(py), X(px1), Z(py), H, PLASTER);
  wallX(345, 290, 515);                       // kitchen | pub floor  (door at the bottom)
  wallZ(160, 455, 720); wallZ(160, 790, 825); // toilets | pub floor (door on the right)
  wallZ(160, 825, 960);                       // pub | lobby
  wallX(1078, 160, 660);                      // back wall behind the bar
  wallZ(680, 990, 1275);                      // gambling room north wall
  wallX(992, 760, 990);                       // gambling room west wall (door at the top)
  // alcove walls: library wallpaper and exposed brick, dark dado rail
  k.texBox(0.04, H, Z(990) - Z(580), X(332), H / 2, (Z(580) + Z(990)) / 2, BOOKS, { tile: 1.2 });
  k.texBox(X(905) - X(330), H, 0.04, (X(330) + X(905)) / 2, H / 2, Z(1000) - 0.12, BRICK, { tile: 0.9 });
  k.texBox(X(720) - X(455), H, 0.04, (X(455) + X(720)) / 2, H / 2, Z(160) + 0.12, BRICK, { tile: 0.9 });
  k.texBox(0.04, H, Z(515) - Z(290), X(345) + 0.12, H / 2, (Z(290) + Z(515)) / 2, BOOKS, { tile: 1.2 });
  k.box(0.06, 0.06, Z(990) - Z(580), X(332) + 0.04, 0.95, (Z(580) + Z(990)) / 2, DARKWOOD);
  // cream tongue-and-groove fascia round the top of the room, with a dark beam under it
  const fascia = (x0, z0, x1, z1) => { const w = Math.max(Math.abs(x1 - x0), 0.3), d = Math.max(Math.abs(z1 - z0), 0.3); k.texBox(w, 0.45, d, (x0 + x1) / 2, H - 0.225, (z0 + z1) / 2, TNG, { tile: 0.6 }); k.box(w + 0.02, 0.1, d + 0.02, (x0 + x1) / 2, H - 0.5, (z0 + z1) / 2, DARKWOOD); };
  fascia(X(330), Z(170), X(905), Z(170)); fascia(X(340), Z(170), X(340), Z(990)); fascia(X(330), Z(990), X(905), Z(990));
  // bulkheads over the alcove openings, on dark posts
  fascia(X(345), Z(455), X(625), Z(455)); fascia(X(560), Z(170), X(560), Z(455));
  fascia(X(740), Z(170), X(740), Z(610)); fascia(X(345), Z(600), X(680), Z(600));
  for (const [px, py] of [[470, 455], [560, 600], [470, 600]]) k.box(0.14, H - 0.5, 0.14, X(px), (H - 0.5) / 2, Z(py), DARKWOOD, { block: true });
  // red-brick pillars with up/down wall lights
  const pillar = (px, py) => {
    k.texBox(0.46, H - 0.05, 0.46, X(px), (H - 0.05) / 2, Z(py), BRICK, { tile: 0.9, collide: true, block: true });
    for (const [dx, dz] of [[0.24, 0], [-0.24, 0], [0, 0.24], [0, -0.24]]) {
      k.box(Math.abs(dx) ? 0.04 : 0.14, 0.12, Math.abs(dz) ? 0.04 : 0.14, X(px) + dx * 1.15, 1.95, Z(py) + dz * 1.15, 0xf2f2f2);
      sconceGlow(k, X(px) + dx * 1.25, 1.95, Z(py) + dz * 1.25, X(px), Z(py));
    }
  };
  [[560, 455], [740, 610], [395, 700], [740, 455], [400, 600]].forEach(([px, py]) => pillar(px, py));
  // white spindle balustrades / half partitions between areas
  const balustrade = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    k.box(alongX ? len : 0.08, 0.08, alongX ? 0.08 : len, (x0 + x1) / 2, 1.0, (z0 + z1) / 2, 0xffffff, { block: true });
    k.box(alongX ? len : 0.1, 0.12, alongX ? 0.1 : len, (x0 + x1) / 2, 0.06, (z0 + z1) / 2, 0xffffff);
    for (let t = 0.06; t < len; t += 0.13) k.box(0.035, 0.9, 0.035, x0 + (x1 - x0) * t / len, 0.52, z0 + (z1 - z0) * t / len, 0xffffff);
  };
  balustrade(X(400), Z(455), X(470), Z(455)); balustrade(X(625), Z(455), X(690), Z(455));
  balustrade(X(740), Z(250), X(740), Z(300));

  // ---- the bar ----
  const barRun = (px0, py0, px1, py1) => {
    const w = W(px0, px1), d = Math.abs(Z(py1) - Z(py0)), x = (X(px0) + X(px1)) / 2, z = (Z(py0) + Z(py1)) / 2;
    k.texBox(w, 1.08, d, x, 0.54, z, OAK, { tile: 0.7, collide: true, block: true });
    k.box(w + 0.1, 0.06, d + 0.1, x, 1.11, z, 0x4a2a14);                       // polished dark top
    k.box(0.05, 0.05, d, X(px0) - 0.1, 1.17, z, BRASS);                         // brass top rail (customer side)
    k.box(0.04, 0.04, d, X(px0) - 0.16, 0.22, z, BRASS);                        // brass foot rail
    for (let t = Z(py0) + 0.3; t < Z(py1); t += 0.9) k.box(0.1, 0.04, 0.03, X(px0) - 0.1, 0.22, t, BRASS);
  };
  barRun(985, 165, 1022, 370);
  barRun(945, 360, 990, 625);
  // back bar: bottles on lit shelves, MONSTOR fridge
  rect(1035, 165, 1072, 640, 2.2, 1.1, 0x2a1a10, { collide: true, block: true });
  const bottles = k.label('bottles', Z(640) - Z(165), 1.2, [X(1033) - 0.01, 1.55, (Z(165) + Z(640)) / 2], [0, -Math.PI / 2, 0], { tex: bottleTex(), glow: true });
  for (let py = 180; py < 620; py += 60) k.lamp(X(1030), 2.35, Z(py), 0xffc070, 0.05);
  // beer taps along the bar
  for (let py = 400; py < 600; py += 35) { k.cyl(0.015, 0.015, 0.32, X(965), 1.3, Z(py), 0xd4af37, 8); k.box(0.05, 0.12, 0.03, X(965), 1.5, Z(py), [0xc8102e, 0x111111, 0x1f4fbf, 0xffd400][(py / 35 | 0) % 4]); }
  // stools
  for (const py of [440, 485, 530, 575]) k.stool(X(922), Z(py), 0x8a1f2a, BRASS);
  for (const py of [230, 285, 335]) k.stool(X(962), Z(py), 0x8a1f2a, BRASS);
  // food on the bar (the "snack station" for this level: first 5 spots)
  for (const py of [420, 470, 520, 570, 610]) k.spawns.push(new THREE.Vector3(X(967), 1.22, Z(py)));
  for (const py of [200, 260, 320]) k.spawns.push(new THREE.Vector3(X(1003), 1.22, Z(py)));
  for (const py of [230, 330, 430, 530]) { k.cyl(0.006, 0.006, 0.9, X(945), H - 0.45, Z(py), 0x222222, 4); k.lamp(X(945), H - 1.0, Z(py), 0xffb050, 0.14); }
  // crisps on clips behind the bar
  k.label('PORK SCRATCHINGS · CRISPS · NUTS', 1.2, 0.5, [X(1033) - 0.02, 0.8, Z(560)], [0, -Math.PI / 2, 0], { tex: crispsTex() });

  // ---- pub floor: tables, booths, fireplace ----
  let alt = 0;
  const T = (px0, py0, px1, py1, chairs = 1, opts = {}) => { const light = (alt++ % 2) === 0; k.table((X(px0) + X(px1)) / 2, (Z(py0) + Z(py1)) / 2, W(px0, px1), Math.abs(Z(py1) - Z(py0)), { chairs, top: WOOD, legs: DARKWOOD, chairColor: light ? LIGHTWOOD : DARKWOOD, seat: light ? null : 0x8a2a2a, spots: chairs > 1 ? 2 : 1, ...opts }); };
  T(430, 245, 490, 300); T(575, 210, 630, 250); T(595, 315, 650, 375); T(765, 320, 820, 385); T(390, 355, 440, 420);
  T(505, 500, 600, 540, 2); T(725, 505, 820, 555, 2);
  rect(540, 540, 565, 595, 0.76, 0.38, WOOD, { collide: true, block: true });
  T(475, 615, 520, 670); T(575, 620, 620, 665); T(765, 615, 805, 670);
  T(420, 820, 480, 945, 3); T(628, 825, 685, 950, 3); T(800, 830, 855, 945, 3);
  // top-right booth (L-shaped leather bench) with its table
  rect(775, 178, 925, 200, 0.45, 0.225, DARKWOOD, { block: true }); rect(775, 196, 925, 210, 0.12, 0.5, REDLEATHER); rect(775, 175, 925, 186, 0.6, 0.75, REDLEATHER);
  rect(903, 178, 925, 300, 0.45, 0.225, DARKWOOD, { block: true }); rect(893, 178, 905, 300, 0.12, 0.5, REDLEATHER); rect(916, 178, 927, 300, 0.6, 0.75, REDLEATHER);
  T(790, 225, 860, 270, 0);
  // long booth partition with benches and two big tables
  rect(430, 683, 880, 700, 1.15, 0.575, 0xf6f2ea, { collide: true, block: true });
  rect(428, 681, 882, 702, 0.06, 1.18, 0xe8dcc0);
  rect(440, 700, 870, 720, 0.45, 0.225, DARKWOOD, { block: true }); rect(440, 706, 870, 722, 0.12, 0.5, REDLEATHER); rect(440, 700, 870, 707, 0.5, 0.8, REDLEATHER);
  T(465, 725, 625, 760, 0, { spots: 2 }); T(660, 725, 845, 760, 0, { spots: 2 });
  for (let px = 480; px <= 830; px += 50) k.chair(X(px), Z(785), 0, LIGHTWOOD);
  // tall poseur tables with cream leather stools
  const poseur = (px, py) => { k.box(0.7, 0.05, 0.7, X(px), 1.05, Z(py), WOOD, { collide: true, block: true }); k.box(0.08, 1.03, 0.08, X(px), 0.52, Z(py), DARKWOOD); k.box(0.5, 0.04, 0.5, X(px), 0.02, Z(py), DARKWOOD); for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) k.stool(X(px) + dx, Z(py) + dz, CREAM, DARKWOOD, 0.72); k.spawns.push(new THREE.Vector3(X(px), 1.13, Z(py))); };
  poseur(860, 445); poseur(860, 615); poseur(510, 385);
  // fireplace + chimney breast, stone pillar, lamp column
  k.texBox(W(665, 735), H - 0.05, Math.abs(Z(410) - Z(280)), X(700), (H - 0.05) / 2, (Z(280) + Z(410)) / 2, BRICK, { tile: 0.9, collide: true, block: true });   // brick chimney breast
  rect(660, 296, 740, 304, 0.08, 1.05, DARKWOOD);   // mantel
  rect(672, 300, 728, 340, 0.6, 0.35, 0x221410);
  const fire = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: fireTex(), transparent: true }));
  fire.position.set(X(700), 0.3, Z(342)); scene.add(fire);
  k.lamp(X(700), 0.25, Z(335), 0xff7a1a, 0.18);
  k.texBox(W(625, 690), H - 0.05, Math.abs(Z(565) - Z(485)), X(657), (H - 0.05) / 2, Z(525), BRICK, { tile: 0.9, collide: true, block: true });
  // wall lamps around the room
  for (const [px, py] of [[480, 175], [880, 175], [345, 800], [345, 950], [600, 985], [880, 985], [1000, 700], [1260, 900]]) { k.lamp(X(px), 2.05, Z(py), 0xff5040, 0.07); k.box(0.12, 0.14, 0.12, X(px), 2.05, Z(py), 0x8a1a1a); }
  // iron chandeliers with little cream shades
  const chandelier = (px, py) => {
    const x = X(px), z = Z(py), y = H - 0.75;
    k.cyl(0.008, 0.008, 0.7, x, H - 0.35, z, 0x1a1a1a, 4); k.cyl(0.05, 0.03, 0.12, x, y, z, 0x1a1a1a, 8);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, ax = x + Math.cos(a) * 0.32, az = z + Math.sin(a) * 0.32;
      k.box(0.32, 0.015, 0.015, (x + ax) / 2, y, (z + az) / 2, 0x1a1a1a, { rot: [0, -a, 0] }); k.cyl(0.05, 0.07, 0.08, ax, y + 0.06, az, 0xf3ead6, 8); k.lamp(ax, y + 0.03, az, 0xfff1d0, 0.035); }
  };
  [[640, 250], [470, 380], [660, 530], [470, 680], [650, 870], [820, 870], [1117, 800]].forEach(([px, py]) => chandelier(px, py));

  // ---- big screens: the football is on ----
  const tv = (x, y, z, ry) => { k.box(2.0, 1.15, 0.08, x, y, z, 0x111111, { rot: [0, ry, 0] }); const s = k.label('tv', 1.9, 1.05, [x + Math.sin(ry) * 0.05, y, z + Math.cos(ry) * 0.05], [0, ry, 0], { tex: tvTex(), glow: true }); return s; };
  tv(X(600), 2.1, Z(168), 0);
  tv(X(1270), 2.0, Z(820), -Math.PI / 2);
  tv(X(340), 2.1, Z(700), Math.PI / 2);

  // ---- gambling room ----
  k.cyl(0.75, 0.75, 0.06, X(1117), 0.78, Z(857), 0x1e7a3a, 28, { collide: true });
  k.cyl(0.8, 0.8, 0.05, X(1117), 0.74, Z(857), 0x5a3a1a, 28);
  k.cyl(0.12, 0.25, 0.72, X(1117), 0.36, Z(857), 0x2a1a10, 12);
  k.blockers.push({ x0: X(1117) - 0.8, x1: X(1117) + 0.8, z0: Z(857) - 0.8, z1: Z(857) + 0.8, y1: 0.8 });
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; k.chair(X(1117) + Math.sin(a) * 1.15, Z(857) + Math.cos(a) * 1.15, a + Math.PI, 0x5a1a1a); }
  k.spawns.push(new THREE.Vector3(X(1117), 0.88, Z(857)));
  for (const py of [760, 815, 870]) {
    rect(1215, py - 22, 1250, py + 22, 1.7, 0.85, 0x222244, { block: true });
    k.label('THE CHIP MACHINE', 0.7, 0.9, [X(1213), 1.1, Z(py)], [0, -Math.PI / 2, 0], { tex: fruitTex(), glow: true });
  }

  // ---- kitchen ----
  const STEEL = 0xb8bcc2;
  rect(75, 298, 330, 345, 0.92, 0.46, STEEL, { collide: true, block: true });
  rect(65, 345, 118, 560, 0.92, 0.46, STEEL, { collide: true, block: true });
  rect(150, 512, 240, 555, 0.92, 0.46, STEEL, { collide: true, block: true });
  for (const px of [150, 220, 290]) k.spawns.push(new THREE.Vector3(X(px), 1.0, Z(322)));
  k.spawns.push(new THREE.Vector3(X(92), 1.0, Z(450)), new THREE.Vector3(X(195), 1.0, Z(533)));
  for (const px of [180, 260]) rect(px - 25, 300, px + 25, 340, 0.05, 0.95, 0x222222);   // hobs
  k.label('PIE OF THE DAY: GONE (RONNIE)', 1.2, 0.6, [X(200), 1.8, Z(292)], [0, 0, 0], { bg: '#222', fg: '#fff', border: '#ffd400', size: 50 });

  // ---- toilets ----
  for (const px of [600, 690, 775]) { rect(px - 18, 20, px + 18, 60, 0.42, 0.21, 0xffffff, { block: true }); rect(px - 18, 8, px + 18, 22, 0.8, 0.4, 0xf0f0f0); }
  rect(495, 10, 535, 40, 0.85, 0.42, 0xffffff, { block: true });
  k.label('STAFF TOILET — RONNIE: USE THE BIG ONE', 1.4, 0.4, [X(600), 1.9, Z(160) - 0.11], [0, Math.PI, 0], { bg: '#fff', fg: '#111', border: '#1f4fbf', size: 44 });

  // ---- the jokes (design doc 84.5) ----
  const signs = [
    ['THE OYSTERFLEET', 3.2, 0.7, [X(1076) - 0.12, 2.65, Z(400)], [0, -Math.PI / 2, 0], { tex: pubSignTex(), glow: true }],
    ['STAFF OF THE MONTH: RONNIE (ATE THE CERTIFICATE)', 0.9, 0.7, [X(334), 1.6, Z(640)], [0, Math.PI / 2, 0], {}],
    ['PLEASE DO NOT FEED THE BARMAN', 1.2, 0.45, [X(1076) - 0.12, 1.6, Z(620)], [0, -Math.PI / 2, 0], { bg: '#fff8e7', fg: '#111' }],
    ["TODAY'S SPECIALS: WHATEVER RONNIE HASN'T EATEN", 1.0, 1.2, [X(334), 1.5, Z(880)], [0, Math.PI / 2, 0], { bg: '#1b2a1b', fg: '#f5f0e6', border: '#8a6a3a', size: 56 }],
    ['MAX OCCUPANCY: 120 (OR 3 RONNIES)', 1.1, 0.45, [X(450), 1.9, Z(165) + 0.12], [0, 0, 0], {}],
    ["STAFF FOOD ALLOWANCE: ONE (1) BAG OF CRISPS. RONNIE THIS MEANS YOU. — THE GAFFER", 1.3, 0.7, [X(1076) - 0.12, 1.6, Z(240)], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111' }],
    ['QUIZ NIGHT — Q1: How many pies did Ronnie eat last night? A: Yes.', 1.2, 0.8, [X(350), 1.5, Z(470)], [0, Math.PI / 2, 0], { bg: '#1b2a1b', fg: '#fff', border: '#8a6a3a', size: 48 }],
    ['CAUTION: RONNIE SWEAT', 0.5, 0.6, [X(925), 0.33, Z(700)], [0, Math.PI / 2, 0], { bg: '#ffd400', fg: '#111', border: '#111', size: 60 }],
    ["TIP JAR: RONNIE'S PASTY FUND", 0.4, 0.2, [X(944), 1.25, Z(470)], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', size: 40 }],
    ['WE DO NOT SERVE SALAD ("YES YOU DO" — Chloe)', 1.0, 0.5, [X(800), 1.9, Z(165) + 0.12], [0, 0, 0], { bg: '#fff', fg: '#c0392b' }],
    ['Times Ronnie got stuck behind the bar: IIII IIII II', 1.0, 0.5, [X(1076) - 0.12, 1.5, Z(500)], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', border: '#111' }],
    ['OYSTERFLEET PIE-EATING CHAMPION — RONNIE (UNDEFEATED, UNCHALLENGED, UNWELL)', 1.2, 0.6, [X(700), 1.9, Z(410) + 0.01], [0, 0, 0], { bg: '#d4af37', fg: '#111', border: '#7a5a10', size: 48 }],
    ['DARTS: RONNIE 180 (pies)', 0.7, 0.7, [X(334), 1.6, Z(370)], [0, Math.PI / 2, 0], { tex: dartTex() }],
    ['LAST ORDERS — Ronnie: last orders means for the CUSTOMERS', 0.8, 0.4, [X(1076) - 0.12, 2.0, Z(330)], [0, -Math.PI / 2, 0], { bg: '#fff06a', fg: '#111', border: null, size: 40 }],
  ];
  for (const [t, w, h, pos, rot, o] of signs) k.label(t, w, h, pos, rot, o);

  return k.finish({
    name: 'The Oysterfleet',
    sky: 0xfff3e0, ground: 0x8a6a5a, hemiI: 2.6, sun: 0xfff0d8, sunI: 1.3, sunPos: [-6, 10, 5],
    start: { x: X(870), z: Z(640), yaw: Math.PI * 0.75 },
    board: { x: X(915), y: 1.38, z: Z(860), ry: Math.PI },
    startFood: ['can', 'burger', 'pizza', 'doughnut', 'can', 'burger', 'pizza', 'doughnut', 'burger', 'pizza', 'can', 'doughnut', 'burger', 'pizza', 'doughnut', 'can', 'burger', 'pizza'],
    spotCount: 36,
  });
}

// soft cones of light above and below a pillar wall light
const GLOW = { mat: null, geo: null };
function sconceGlow(kit, x, y, z, cx, cz) {
  GLOW.kit = kit; GLOW.cx = cx; GLOW.cz = cz;
  if (!GLOW.mat) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,240,210,0.9)'); gr.addColorStop(1, 'rgba(255,240,210,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(26, 0); g.lineTo(38, 0); g.lineTo(64, 128); g.lineTo(0, 128); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    GLOW.mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55, side: THREE.DoubleSide });
    GLOW.geo = new THREE.PlaneGeometry(0.4, 0.55);
  }
  // a pair of soft cones (up and down) facing out from the pillar, batched by the kit
  const out = Math.atan2(x - GLOW.cx, z - GLOW.cz);
  for (const dir of [1, -1]) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y + dir * 0.3, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, out, dir > 0 ? Math.PI : 0, 'YXZ')), new THREE.Vector3(1, 1, 1));
    GLOW.kit.instance(GLOW.geo, GLOW.mat, m);
  }
}

// ---- textures ----
function bottleTex() {
  return canvasTex(1024, 256, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#5a3010'); bg.addColorStop(1, '#2a1408');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    for (const sy of [118, 248]) { g.fillStyle = '#c8a060'; g.fillRect(0, sy, w, 6); }
    const cols = ['#2e7d32', '#c0392b', '#d4a017', '#6d4c41', '#1565c0', '#eeeeee', '#8e24aa', '#ff8f00'];
    for (const base of [118, 248]) for (let x = 8; x < w - 20; x += 24 + (x * 7) % 9) {
      const c = cols[(x / 24 | 0) % cols.length], bh = 60 + (x * 13) % 40;
      g.fillStyle = c; g.globalAlpha = 0.85; g.fillRect(x, base - bh, 18, bh); g.fillRect(x + 6, base - bh - 18, 6, 18); g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 3, base - bh + 4, 3, bh - 8);
    }
  });
}
function crispsTex() {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#3a2414'; g.fillRect(0, 0, w, h);
    const cols = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa'];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) { g.fillStyle = cols[(i + r) % 5]; g.fillRect(14 + i * 55, 20 + r * 120, 44, 95); g.fillStyle = '#fff'; g.font = 'bold 12px Arial'; g.fillText('CRISPS', 18 + i * 55, 70 + r * 120); }
    g.fillStyle = '#ffd400'; g.font = `900 22px ${FONT}`; g.fillText("ONE CLIP LEFT: RONNIE'S", 120, 248);
  });
}
function tvTex() {
  return canvasTex(512, 288, (g, w, h) => {
    g.fillStyle = '#2e8b3a'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) { g.fillStyle = (x / 64) % 2 ? '#2a7f35' : '#319541'; g.fillRect(x, 0, 64, h); }
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(20, 30, w - 40, h - 50); g.beginPath(); g.moveTo(w / 2, 30); g.lineTo(w / 2, h - 20); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2 + 5, 36, 0, 7); g.stroke();
    for (let i = 0; i < 10; i++) { g.fillStyle = i < 5 ? '#1f4fbf' : '#c0392b'; g.beginPath(); g.arc(60 + (i * 47) % 400, 80 + (i * 61) % 160, 7, 0, 7); g.fill(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(300, 150, 5, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(0, 0, w, 30);
    g.fillStyle = '#fff'; g.font = 'bold 18px Arial'; g.fillText("KINGS ROAD FC 2 – 1 SELHURST EAGLES   67'", 12, 21);
    g.fillStyle = 'rgba(200,16,46,0.9)'; g.fillRect(0, h - 26, w, 26); g.fillStyle = '#fff'; g.font = 'bold 15px Arial'; g.fillText('BREAKING: LOCAL BARMAN EATS ENTIRE PUB', 10, h - 8);
  });
}
function fruitTex() {
  return canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#1a1a3a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd400'; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; g.fillText('THE CHIP', w / 2, 40); g.fillText('MACHINE', w / 2, 72);
    const sym = ['🍟', '🍔', '🍕'];
    for (let i = 0; i < 3; i++) { g.fillStyle = '#fff'; g.fillRect(18 + i * 76, 100, 68, 90); g.font = '48px sans-serif'; g.fillText(sym[i], 52 + i * 76, 162); }
    g.fillStyle = '#ff1744'; g.fillRect(40, 220, w - 80, 40); g.fillStyle = '#fff'; g.font = `900 22px ${FONT}`; g.fillText('JACKPOT: 1 PIE', w / 2, 248);
  });
}
function pubSignTex() {
  return canvasTex(1024, 224, (g, w, h) => {
    g.fillStyle = '#1b3a2a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d4af37'; g.lineWidth = 12; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#d4af37'; g.font = `900 110px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('THE OYSTERFLEET', w / 2, h / 2 + 6);
  });
}
function fireTex() {
  return canvasTex(256, 128, (g, w, h) => {
    for (let i = 0; i < 30; i++) { const x = 20 + Math.random() * (w - 40), r = 10 + Math.random() * 26; const gr = g.createRadialGradient(x, h, 0, x, h - r, r * 1.6); gr.addColorStop(0, 'rgba(255,240,150,0.9)'); gr.addColorStop(0.5, 'rgba(255,120,20,0.7)'); gr.addColorStop(1, 'rgba(200,30,0,0)'); g.fillStyle = gr; g.fillRect(x - r * 2, 0, r * 4, h); }
  });
}
function dartTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#222'; g.fillRect(0, 0, w, h);
    const rings = ['#111', '#e8d8b0', '#c0392b', '#e8d8b0', '#2e7d32', '#c0392b'];
    rings.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(w / 2, h / 2 - 10, 100 - i * 17, 0, 7); g.fill(); });
    g.fillStyle = '#fff'; g.font = 'bold 22px Arial'; g.textAlign = 'center'; g.fillText('RONNIE 180 (pies)', w / 2, h - 10);
  });
}
