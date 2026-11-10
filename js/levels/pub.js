// THE OYSTERFLEET — Ronnie's local and workplace (design doc section 84),
// laid out from the floor plan: pub floor with booths, tables and a fireplace,
// the bar with stools and back-bar, kitchen, toilets, and the gambling room
// with the poker table and fruit machines. About 27m x 22m.
import * as THREE from 'three';
import { Kit, carpetTex, tileTex, woodTex, canvasTex, fitText, FONT } from './kit.js';

const S = 0.022, X = (px) => (px - 660) * S, Z = (py) => (py - 505) * S;
const W = (a, b) => Math.abs(X(b) - X(a));
const H = 3.0;

export function buildPub(scene) {
  const k = new Kit(scene, { x0: X(50), x1: X(1280), z0: Z(5), z1: Z(1000), y1: H });
  const WALL = 0x5a3a2a, PLASTER = 0xd9c7a8, DARKWOOD = 0x3b2414, WOOD = 0x8a5a2b, REDLEATHER = 0x6a1f24;
  // rect in plan pixels -> box
  const rect = (px0, py0, px1, py1, h, y, color, opts = {}) => k.box(W(px0, px1), h, Math.abs(Z(py1) - Z(py0)), (X(px0) + X(px1)) / 2, y ?? h / 2, (Z(py0) + Z(py1)) / 2, color, opts);
  const solid = (px0, py0, px1, py1, color = WALL) => rect(px0, py0, px1, py1, H, H / 2, color, { collide: true, block: true });

  // ---- floors ----
  const carpet = carpetTex(), tiles = tileTex(), kTiles = tileTex('#c9c9c4', '#bdbdb7', '#8f8f8a', 48), bTiles = tileTex('#d8d8d8', '#cfcfcf', '#9a9a9a', 40);
  k.floor(X(330), Z(160), X(905), Z(1000), carpet, 0.002, 1.2);
  k.floor(X(905), Z(150), X(1100), Z(1000), tiles, 0.003, 1.0);
  k.floor(X(990), Z(680), X(1275), Z(990), carpet, 0.004, 1.2);
  k.floor(X(55), Z(290), X(355), Z(580), kTiles, 0.002, 0.8);
  k.floor(X(455), Z(5), X(825), Z(160), bTiles, 0.002, 0.6);
  k.floor(X(825), Z(40), X(1100), Z(160), tiles, 0.002, 1.0);
  k.ceiling(0xe8dcc4, 0x6a5a44);

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
  // wood panelling around the pub floor
  k.box(0.04, 1.0, Z(990) - Z(580), X(333), 0.5, (Z(580) + Z(990)) / 2, DARKWOOD);
  k.box(X(905) - X(330), 1.0, 0.04, (X(330) + X(905)) / 2, 0.5, Z(997), DARKWOOD);

  // ---- the bar ----
  rect(985, 165, 1022, 370, 1.1, 0.55, DARKWOOD, { collide: true, block: true });
  rect(945, 360, 990, 625, 1.1, 0.55, DARKWOOD, { collide: true, block: true });
  rect(980, 163, 1027, 372, 0.05, 1.12, 0x6b3f1d);          // polished bar tops
  rect(940, 358, 995, 627, 0.05, 1.12, 0x6b3f1d);
  // back bar: bottles on lit shelves, MONSTOR fridge
  rect(1035, 165, 1072, 640, 2.2, 1.1, 0x2a1a10, { collide: true, block: true });
  const bottles = k.label('bottles', Z(640) - Z(165), 1.2, [X(1033) - 0.01, 1.55, (Z(165) + Z(640)) / 2], [0, -Math.PI / 2, 0], { tex: bottleTex(), glow: true });
  for (let py = 180; py < 620; py += 60) k.lamp(X(1030), 2.35, Z(py), 0xffc070, 0.05);
  // beer taps along the bar
  for (let py = 400; py < 600; py += 35) { k.cyl(0.015, 0.015, 0.32, X(965), 1.3, Z(py), 0xd4af37, 8); k.box(0.05, 0.12, 0.03, X(965), 1.5, Z(py), [0xc8102e, 0x111111, 0x1f4fbf, 0xffd400][(py / 35 | 0) % 4]); }
  // stools
  for (const py of [440, 485, 530, 575]) k.stool(X(922), Z(py));
  for (const py of [230, 285, 335]) k.stool(X(965), Z(py));
  // food on the bar (the "snack station" for this level: first 5 spots)
  for (const py of [420, 470, 520, 570, 610]) k.spawns.push(new THREE.Vector3(X(967), 1.22, Z(py)));
  for (const py of [200, 260, 320]) k.spawns.push(new THREE.Vector3(X(1003), 1.22, Z(py)));
  // crisps on clips behind the bar
  k.label('PORK SCRATCHINGS · CRISPS · NUTS', 1.2, 0.5, [X(1033) - 0.02, 0.8, Z(560)], [0, -Math.PI / 2, 0], { tex: crispsTex() });

  // ---- pub floor: tables, booths, fireplace ----
  const T = (px0, py0, px1, py1, chairs = 1, opts = {}) => k.table((X(px0) + X(px1)) / 2, (Z(py0) + Z(py1)) / 2, W(px0, px1), Math.abs(Z(py1) - Z(py0)), { chairs, top: WOOD, spots: chairs > 1 ? 2 : 1, ...opts });
  T(430, 245, 490, 300); T(575, 210, 630, 250); T(595, 315, 650, 375); T(765, 320, 820, 385); T(390, 355, 440, 420);
  T(505, 500, 600, 540, 2); T(725, 505, 820, 555, 2);
  rect(540, 540, 565, 595, 0.76, 0.38, WOOD, { collide: true, block: true });
  T(475, 615, 520, 670); T(575, 620, 620, 665); T(765, 615, 805, 670);
  T(420, 820, 480, 945, 3); T(628, 825, 685, 950, 3); T(800, 830, 855, 945, 3);
  // top-right booth (L-shaped leather bench) with its table
  rect(775, 178, 925, 200, 1.0, 0.5, REDLEATHER, { block: true });
  rect(903, 178, 925, 300, 1.0, 0.5, REDLEATHER, { block: true });
  T(790, 225, 860, 270, 0);
  // long booth partition with benches and two big tables
  rect(430, 683, 880, 700, 1.25, 0.62, DARKWOOD, { collide: true, block: true });
  rect(440, 700, 870, 720, 0.48, 0.24, REDLEATHER, { block: true });
  rect(440, 700, 870, 708, 0.9, 0.45, REDLEATHER);
  T(465, 725, 625, 760, 0, { spots: 2 }); T(660, 725, 845, 760, 0, { spots: 2 });
  for (let px = 480; px <= 830; px += 50) k.chair(X(px), Z(785), 0);
  // fireplace + chimney breast, stone pillar, lamp column
  rect(665, 280, 735, 410, 1.6, 0.8, 0x8a4a32, { collide: true, block: true });          // chimney breast (brick)
  rect(675, 290, 725, 400, H - 1.6, 1.6 + (H - 1.6) / 2, 0x7a3a28, { block: true });
  rect(672, 300, 728, 340, 0.6, 0.35, 0x221410);
  const fire = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: fireTex(), transparent: true }));
  fire.position.set(X(700), 0.3, Z(342)); scene.add(fire);
  k.lamp(X(700), 0.25, Z(335), 0xff7a1a, 0.18);
  rect(625, 485, 690, 565, H, H / 2, 0x9a9488, { collide: true, block: true });
  rect(680, 605, 740, 660, H, H / 2, 0x3b2414, { collide: true, block: true });
  // wall lamps around the room
  for (const [px, py] of [[480, 170], [560, 170], [880, 170], [340, 600], [340, 800], [340, 950], [600, 990], [880, 990], [1000, 700], [1260, 900]]) k.lamp(X(px), 2.1, Z(py), 0xffcf80, 0.09);

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
    sky: 0xffe6c0, ground: 0x6a4a3a, hemiI: 2.3, sun: 0xffd9a0, sunI: 1.4, sunPos: [-6, 10, 5],
    start: { x: X(870), z: Z(640), yaw: Math.PI * 0.75 },
    board: { x: X(915), y: 1.38, z: Z(860), ry: Math.PI },
    startFood: ['can', 'burger', 'pizza', 'doughnut', 'can', 'burger', 'pizza', 'doughnut', 'burger', 'pizza', 'can', 'doughnut', 'burger', 'pizza', 'doughnut', 'can', 'burger', 'pizza'],
    spotCount: 36,
  });
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
