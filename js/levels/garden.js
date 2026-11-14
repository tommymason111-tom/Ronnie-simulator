// LEWIS'S HOUSE: the back garden on a sunny afternoon, for Ian's barbecue.
// About 18m x 14m: the back of the house (brick, patio doors, windows) along the
// north side, a stone patio with the barbecue and the garden table, then the
// lawn: a paddling pool, a football goal, a shed, flower beds, a washing line,
// all inside a wooden fence, with the neighbours' roofs and trees beyond and a
// big blue sky overhead.
import * as THREE from 'three';
import { Kit, tileTex, canvasTex, FONT, brickTex } from './kit.js';

export const BBQ_SPOT = { x: -3.2, z: -3.9 };        // where the grill is (Ian stands behind it)
export const IAN_SPOT = { x: -3.2, z: -4.75 };

export function buildGarden(scene) {
  const B = { x0: -9, x1: 9, z0: -7, z1: 7 };
  const k = new Kit(scene, { ...B, y1: 8 });
  const R = (x0, z0, x1, z1, h, y, color, opts) => k.box(Math.abs(x1 - x0), h, Math.abs(z1 - z0), (x0 + x1) / 2, y ?? h / 2, (z0 + z1) / 2, color, opts);
  const WOOD = 0x8a5a32, DARKWOOD = 0x5a3a20, WHITE = 0xf4f4f0;

  // ---------------- sky + the world beyond the fence ----------------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 24, 14), new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide, depthWrite: false }));
  sky.position.set(0, -5, 0); sky.renderOrder = -10; scene.add(sky);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshLambertMaterial({ color: 0x5f8f3a }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; scene.add(ground);
  // neighbours' houses and trees peeking over the fence
  for (const [x, z, w, h, c] of [[-14, -12, 9, 6, 0x9a5a3a], [-3, -15, 10, 7, 0xa86a48], [9, -13, 8, 6.5, 0x8a4a32], [14, 3, 6, 5.5, 0xb07a52], [-15, 6, 7, 5, 0x9a6a4a], [2, 13, 12, 6, 0xa45c3c]]) {
    R(x - w / 2, z - 2, x + w / 2, z + 2, h, h / 2, c);
    k.box(w + 0.4, 0.25, 4.6, x, h + 0.9, z, 0x4a3a3a, { rot: [0, 0, 0] });
    k.box(w + 0.4, 1.8, 0.3, x, h + 0.9, z - 2.1, 0x5a4040); k.box(w + 0.4, 1.8, 0.3, x, h + 0.9, z + 2.1, 0x5a4040);
    for (let i = 0; i < Math.floor(w / 2.2); i++) for (const yy of [1.5, 3.6]) k.box(0.9, 1.0, 0.05, x - w / 2 + 1.2 + i * 2.2, yy, z + 2.02 * Math.sign(-z || 1), 0xbfe0f0);
  }
  for (const [x, z, s] of [[-11, -9, 1.2], [6, -10, 1.5], [11, -2, 1.1], [12, 8, 1.4], [-12, 2, 1.3], [-6, 11, 1.2], [8, 11, 1.0]]) {
    k.cyl(0.2 * s, 0.28 * s, 3 * s, x, 1.5 * s, z, 0x5a3a20, 8);
    for (const [dy, r] of [[3.2, 1.8], [4.4, 1.4], [5.3, 0.9]]) k.cyl(0.05, r * s, 1.6 * s, x, dy * s, z, [0x3f7a2e, 0x4a8a34, 0x356a26][Math.round(dy) % 3], 10);
  }

  // ---------------- lawn, patio, path ----------------
  k.floor(B.x0, B.z0, B.x1, B.z1, grassTex(), 0.002, 2.5);
  k.floor(B.x0, B.z0, B.x1, -2.2, tileTex('#c9c1b0', '#bdb4a2', '#9a9282', 96), 0.004, 1.4);          // patio slabs
  k.floor(-0.6, -2.2, 0.6, B.z1, tileTex('#b8b0a0', '#aca494', '#8a8272', 64), 0.005, 1.0);            // stepping-stone path

  // ---------------- the back of the house ----------------
  const BRICK = brickTex();
  k.texBox(18, 6, 0.4, 0, 3, B.z0 - 0.2, BRICK, { tile: 0.9, collide: true, block: true });
  R(-2.2, B.z0 - 0.05, 2.2, B.z0 + 0.02, 2.3, 1.15, 0x2a2a2a);                                        // patio doors frame
  for (const x of [-1.1, 1.1]) R(x - 1.0, B.z0 - 0.04, x + 1.0, B.z0 + 0.03, 2.1, 1.12, 0xa8d4ec);    // glass
  R(-0.03, B.z0, 0.03, B.z0 + 0.04, 2.2, 1.15, WHITE);
  for (const x of [-6, 6]) { R(x - 1.2, B.z0 - 0.03, x + 1.2, B.z0 + 0.05, 1.4, 1.7, WHITE); R(x - 1.1, B.z0, x + 1.1, B.z0 + 0.06, 1.25, 1.7, 0xa8d4ec); R(x - 1.35, B.z0, x + 1.35, B.z0 + 0.25, 0.08, 0.96, WHITE); }
  for (const x of [-4, 0, 4]) { R(x - 1, B.z0 - 0.03, x + 1, B.z0 + 0.05, 1.2, 4.4, WHITE); R(x - 0.92, B.z0, x + 0.92, B.z0 + 0.06, 1.05, 4.4, 0xa8d4ec); }
  R(-9, B.z0, 9, B.z0 + 0.25, 0.15, 5.95, 0x333333);                                                   // gutter
  k.box(18.6, 0.3, 3.4, 0, 6.6, B.z0 - 1.2, 0x5a3a3a, { rot: [-0.55, 0, 0] });                         // roof
  k.label("LEWIS'S HOUSE (IAN'S BARBECUE, IAN'S RULES)", 2.6, 0.5, [0, 2.75, B.z0 + 0.04], [0, 0, 0], { bg: '#fffbe8', fg: '#2e5a1a', border: '#2e5a1a', size: 44 });

  // ---------------- the fence ----------------
  const fence = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), along = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    R(Math.min(x0, x1), Math.min(z0, z1) - (along ? 0.04 : 0), Math.max(x0, x1), Math.max(z0, z1) + (along ? 0.04 : 0), 1.8, 0.9, WOOD, { collide: true, block: true });
    for (let t = 0; t <= len; t += 1.8) { const px = x0 + (x1 - x0) * t / len, pz = z0 + (z1 - z0) * t / len; k.box(0.1, 1.95, 0.1, px, 0.975, pz, DARKWOOD); }
    for (let t = 0.1; t < len; t += 0.16) { const px = x0 + (x1 - x0) * t / len, pz = z0 + (z1 - z0) * t / len; k.box(along ? 0.012 : 0.09, 1.78, along ? 0.09 : 0.012, px, 0.9, pz, 0x7a4e2a); }
  };
  fence(B.x0, B.z1, B.x1, B.z1); fence(B.x0, B.z0, B.x0, B.z1); fence(B.x1, B.z0, B.x1, B.z1);

  // ---------------- patio: the barbecue, the table, the cool box ----------------
  // a big gas barbecue: hood up, grill, side shelves
  const bx = BBQ_SPOT.x, bz = BBQ_SPOT.z;
  R(bx - 0.75, bz - 0.35, bx + 0.75, bz + 0.35, 0.82, 0.41, 0x2a2a2e, { collide: true, block: true });
  R(bx - 0.62, bz - 0.3, bx + 0.62, bz + 0.3, 0.12, 0.88, 0x111111);
  for (let i = 0; i < 9; i++) R(bx - 0.6, bz - 0.28 + i * 0.07, bx + 0.6, bz - 0.27 + i * 0.07, 0.015, 0.95, 0x8a8a8a, i === 0 ? { collide: true } : undefined);
  k.box(1.24, 0.5, 0.03, bx, 1.12, bz - 0.42, 0x8a8a92, { rot: [-0.5, 0, 0] });                       // the lid, flipped open behind
  R(bx - 1.15, bz - 0.3, bx - 0.75, bz + 0.3, 0.04, 0.84, 0x9a9aa0, { collide: true }); R(bx + 0.75, bz - 0.3, bx + 1.15, bz + 0.3, 0.04, 0.84, 0x9a9aa0, { collide: true });
  for (const [dx, dz] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]]) k.cyl(0.05, 0.05, 0.08, bx + dx, 0.04, bz + dz, 0x111111, 8);
  k.lamp(bx, 0.9, bz, 0xff5a10, 0.0, false); k.halo(bx, 1.05, bz, 1.4, 0xff7a30); k.pool(bx, 0.955, bz, 1.2, 0xff6a20);
  k.cyl(0.2, 0.2, 0.9, bx + 1.4, 0.45, bz - 0.2, 0x8a9aa8, 12);                                       // gas bottle
  k.label('IAN\'S GRILL — HEALTHY OPTIONS ONLY (LIES)', 1.2, 0.25, [bx, 1.05, bz + 0.36], [0, 0, 0], { bg: '#111', fg: '#ffd400', border: null, size: 40 });
  // where cooked food lands: the grill and the side shelves
  for (const dx of [-0.4, 0, 0.4]) k.spawns.push(new THREE.Vector3(bx + dx, 1.02, bz));
  k.spawns.push(new THREE.Vector3(bx - 0.95, 0.92, bz), new THREE.Vector3(bx + 0.95, 0.92, bz));
  // garden table with a parasol, and chairs facing it
  const tx = 2.6, tz = -4.2;
  k.table(tx, tz, 2.0, 1.0, { chairs: 2, top: 0xe8e8e8, legs: 0x9a9a9a, chairColor: 0x4a4a4a, spots: 3 });
  k.cyl(0.025, 0.025, 2.4, tx, 1.2, tz, 0xdddddd, 6);
  k.cyl(0.05, 1.6, 0.4, tx, 2.35, tz, 0x1e7a3a, 16); k.cyl(0.02, 1.62, 0.04, tx, 2.16, tz, 0xf4f4f0, 16);
  // cool box full of cans
  R(5.6, -5.4, 6.4, -4.9, 0.45, 0.225, 0x1e5aa8, { collide: true, block: true }); R(5.58, -5.42, 6.42, -4.88, 0.06, 0.48, WHITE);
  k.spawns.push(new THREE.Vector3(5.8, 0.6, -5.15), new THREE.Vector3(6.2, 0.6, -5.15));
  // plant pots along the house
  for (const x of [-8, -5, 4.6, 8]) { k.cyl(0.25, 0.18, 0.45, x, 0.225, -6.5, 0xb05a32, 12); k.cyl(0.05, 0.4, 0.6, x, 0.75, -6.5, 0x3f8a2e, 10); }

  // ---------------- the lawn ----------------
  // paddling pool
  k.cyl(1.2, 1.2, 0.3, 4.5, 0.15, 3.0, 0x2a8ae0, 24, { block: true }); k.cyl(1.05, 1.05, 0.02, 4.5, 0.29, 3.0, 0x7ad0ff, 24);
  // football goal
  const gx = -6.5, gz = 4.5;
  for (const x of [gx - 1.5, gx + 1.5]) k.box(0.08, 1.2, 0.08, x, 0.6, gz, WHITE); k.box(3.08, 0.08, 0.08, gx, 1.2, gz, WHITE);
  for (let i = 0; i < 8; i++) k.box(0.01, 1.2, 0.8, gx - 1.5 + i * 3 / 7, 0.6, gz + 0.4, 0xdddddd);
  // shed
  R(5.5, 5.0, 8.6, 6.8, 2.2, 1.1, 0x6a4a2a, { collide: true, block: true });
  k.box(3.4, 0.12, 2.3, 7.05, 2.3, 5.9, 0x3a2a1a, { rot: [0, 0, 0.12] });
  R(6.4, 4.98, 7.2, 5.02, 1.8, 0.9, 0x4a2e18); R(7.6, 4.98, 8.3, 5.02, 0.6, 1.4, 0xa8d4ec);
  k.label('SHED (CONTAINS IAN\'S FISHING RODS. DO NOT TOUCH.)', 1.3, 0.35, [7.05, 1.95, 4.97], [0, Math.PI, 0], { bg: '#fff', fg: '#111', border: '#6a4a2a', size: 36 });
  // flower beds along the fences
  for (const [x0, z0, x1, z1] of [[-8.8, -1, -8.0, 4], [8.0, -1.5, 8.8, 3.5], [-4, 6.2, 3, 6.9]]) {
    R(x0, z0, x1, z1, 0.18, 0.09, 0x5a3a20);
    for (let i = 0; i < 18; i++) { const fx = x0 + 0.1 + ((i * 37) % 100) / 100 * (x1 - x0 - 0.2), fz = z0 + 0.1 + ((i * 61) % 100) / 100 * (z1 - z0 - 0.2); k.cyl(0.01, 0.01, 0.3, fx, 0.33, fz, 0x3f8a2e, 4); k.box(0.08, 0.06, 0.08, fx, 0.5, fz, [0xff4f7b, 0xffd400, 0xffffff, 0x9a4aff, 0xff7a1a][i % 5]); }
  }
  // washing line
  for (const x of [-3, 3]) k.cyl(0.03, 0.03, 2.0, x, 1.0, 1.5, 0x9a9a9a, 6);
  k.box(6, 0.01, 0.01, 0, 1.9, 1.5, 0xdddddd);
  for (let i = 0; i < 7; i++) k.box(0.4 + (i % 3) * 0.1, 0.5 + (i % 2) * 0.15, 0.01, -2.4 + i * 0.8, 1.6 - (i % 2) * 0.07, 1.5, [0x1e5aa8, 0xd32f2f, 0xffffff, 0xffd400, 0x2e7d32, 0x034694, 0xff9800][i]);
  k.label('LEWY\'S GYM KIT. DO NOT EAT.', 0.8, 0.2, [0, 1.25, 1.52], [0, 0, 0], { bg: '#fff', fg: '#111', border: null, size: 36 });
  // picnic blanket
  k.floor(-4.2, 2.6, -1.8, 4.4, tileTex('#d32f2f', '#f4f4f0', '#d32f2f', 32), 0.008, 0.6);
  for (const [x, z] of [[-3.8, 3.0], [-3.0, 3.0], [-2.2, 3.0], [-3.8, 4.0], [-3.0, 4.0], [-2.2, 4.0]]) k.spawns.push(new THREE.Vector3(x, 0.08, z));
  // garden bench
  R(-6.5, -1.0, -4.9, -0.6, 0.06, 0.45, WOOD, { block: true }); R(-6.5, -1.0, -4.9, -0.94, 0.45, 0.7, WOOD);
  k.spawns.push(new THREE.Vector3(-5.7, 0.55, -0.8));

  // ---------------- sunshine ----------------
  return k.finish({
    name: "Lewis's House",
    sky: 0xbfe0ff, ground: 0x5f8f3a, hemiI: 2.4, sun: 0xfff2d6, sunI: 2.0, sunPos: [6, 12, 8], ambient: 0.45,
    start: { x: 0.5, z: -1.2, yaw: Math.PI * 0.85 },
    board: { x: 3.5, y: 1.38, z: B.z0 + 0.03, ry: 0 },
    startFood: ['can', 'burger', 'hotdog', 'can', 'chicken', 'sausageroll', 'can', 'burger', 'crisps', 'cookie'],
    spotCount: 30,
  });
}

function skyTex() {
  return canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2f7ad8'); gr.addColorStop(0.5, '#7ec0f0'); gr.addColorStop(0.62, '#d8eefc'); gr.addColorStop(1, '#bfe0f0');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const sun = g.createRadialGradient(380, 70, 4, 380, 70, 50); sun.addColorStop(0, 'rgba(255,255,230,1)'); sun.addColorStop(0.3, 'rgba(255,250,200,0.8)'); sun.addColorStop(1, 'rgba(255,250,200,0)'); g.fillStyle = sun; g.fillRect(320, 10, 120, 120);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [x, y, s] of [[60, 60, 1], [180, 90, 0.8], [270, 50, 1.1], [450, 110, 0.7], [120, 120, 0.6]]) for (const [dx, dy, r] of [[0, 0, 16], [16, -6, 18], [34, 0, 14], [18, 6, 15]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, 7); g.fill(); }
  });
}
function grassTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5a9a36'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { g.fillStyle = ['#4e8a2e', '#66a83e', '#5a9a36', '#72b048'][i % 4]; g.fillRect(Math.random() * w, Math.random() * h, 2, 4); }
    for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x, 0, 32, h); }   // mowing stripes
  });
}
