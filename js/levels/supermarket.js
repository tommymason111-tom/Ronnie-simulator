// LIDDLE-PRICE — the discount supermarket where Oliver works (design doc 66.3):
// long aisles, the infamous middle aisle, bakery, fridge wall of MONSTOR,
// checkouts with conveyor belts and self-checkouts. About 30m x 22m.
import * as THREE from 'three';
import { Kit, tileTex, canvasTex, fitText, FONT } from './kit.js';

export function buildSupermarket(scene) {
  const k = new Kit(scene, { x0: -15, x1: 15, z0: -11, z1: 11, y1: 4.0 });
  k.floor(-15, -11, 15, 11, tileTex('#e9e6df', '#dedad2', '#c8c3b8', 64), 0.002, 1.2);
  k.ceiling(0xf4f4f4, 0x5a5a5a);
  // strip lights
  for (let x = -12; x <= 12; x += 4) k.box(0.25, 0.05, 18, x, 3.95, 0, 0xffffff);

  // ---- shelving aisles (front ledges hold food) ----
  const shelfTexes = [productTex(0), productTex(1), productTex(2), productTex(3)];
  const aisle = (x, z0, z1, ti) => {
    const len = z1 - z0, zc = (z0 + z1) / 2;
    k.box(1.0, 1.75, len, x, 0.875, zc, 0xd0d4da, { collide: true, block: true });
    for (const side of [-1, 1]) {
      for (const y of [0.55, 1.05, 1.5]) k.box(0.28, 0.03, len, x + side * 0.62, y, zc, 0xb9bec6, { collide: true });
      k.label('shelf', len, 1.6, [x + side * 0.505, 0.9, zc], [0, side * Math.PI / 2, 0], { tex: shelfTexes[(ti + (side > 0 ? 1 : 0)) % 4] });
      for (let z = z0 + 1; z < z1 - 0.5; z += 2.4) k.spawns.push(new THREE.Vector3(x + side * 0.62, 1.12, z));
    }
  };
  [-12, -9, -6, -3].forEach((x, i) => aisle(x, -8, 3, i));
  [7, 10].forEach((x, i) => aisle(x, -1.5, 4, i + 2));

  // ---- THE MIDDLE AISLE: random stuff in bins (all edible, obviously) ----
  for (let z = -7; z <= 2; z += 3) {
    k.box(1.6, 0.7, 2.2, 1.5, 0.35, z, 0x1e4ea8, { collide: true, block: true });
    k.box(1.62, 0.08, 2.22, 1.5, 0.74, z, 0xffd400);
    k.spawns.push(new THREE.Vector3(1.2, 0.85, z - 0.5), new THREE.Vector3(1.8, 0.85, z + 0.5));
  }
  k.label('MIDDLE AISLE: ANYTHING CAN HAPPEN (RONNIE WILL EAT IT)', 3.2, 0.7, [1.5, 3.1, -8.5], [0, 0, 0], { bg: '#ffd400', fg: '#1e4ea8', border: '#e53935', size: 60, glow: true });
  // inflatable flamingo, paddling pool, ski jacket... as bright props
  k.cyl(0.6, 0.6, 0.25, 1.5, 0.87, -4, 0x4fc3f7, 20); k.cyl(0.12, 0.12, 0.7, 1.4, 1.15, 2, 0xff6fae, 10); k.box(0.5, 0.6, 0.1, 1.6, 1.05, -1, 0xe53935);

  // ---- fridge wall at the back: glowing MONSTOR ----
  k.box(26, 2.3, 0.9, 0, 1.15, -10.4, 0xdfe6ee, { collide: true, block: true });
  k.label('fridges', 25.6, 2.0, [0, 1.15, -9.94], [0, 0, 0], { tex: fridgeTex(), glow: true });
  for (let x = -12; x <= 12; x += 3) k.spawns.push(new THREE.Vector3(x, 0.3, -9.6));

  // ---- bakery ----
  k.box(7.5, 0.95, 1.2, 11, 0.475, -8.6, 0xc8a070, { collide: true, block: true });
  k.box(1.2, 0.95, 4.0, 14.2, 0.475, -6.5, 0xc8a070, { collide: true, block: true });
  for (let x = 7.8; x <= 14; x += 1.2) k.spawns.push(new THREE.Vector3(x, 1.03, -8.6));
  for (let z = -7.8; z <= -5; z += 1.2) k.spawns.push(new THREE.Vector3(14.2, 1.03, z));
  k.label('BAKERY: RONNIE-FREE ZONE (FAILED)', 3.0, 0.6, [11, 2.6, -9.9], [0, 0, 0], { bg: '#fff3e0', fg: '#8a4a10', border: '#8a4a10', size: 60 });

  // ---- checkouts with conveyor belts ----
  for (let i = 0; i < 4; i++) {
    const x = -11 + i * 3.2;
    k.box(0.8, 0.85, 3.2, x, 0.425, 6.6, 0x2a2f38, { collide: true, block: true });
    k.box(0.5, 0.02, 2.4, x, 0.86, 6.3, 0x111111);
    k.box(0.4, 0.45, 0.4, x - 0.6, 1.0, 7.9, 0x333a44);
    k.label(`${i + 1}`, 0.4, 0.4, [x, 2.2, 6.6], [0, Math.PI, 0], { bg: '#1e4ea8', fg: '#ffd400', border: null, size: 200 });
    k.spawns.push(new THREE.Vector3(x, 0.95, 5.6), new THREE.Vector3(x, 0.95, 6.6));
  }
  for (let i = 0; i < 3; i++) { k.box(0.9, 1.4, 0.7, 4 + i * 1.6, 0.7, 7.2, 0xe0e0e0, { block: true }); k.label('UNEXPECTED ITEM IN BAGGING AREA: RONNIE', 0.6, 0.4, [4 + i * 1.6, 1.15, 7.56], [0, 0, 0], { bg: '#003', fg: '#ff5252', border: null, size: 30, glow: true }); }

  // ---- branding + jokes ----
  k.label('LIDDLE-PRICE', 6, 1.4, [0, 3.2, 10.9], [0, Math.PI, 0], { tex: logoTex(), glow: true });
  k.label('LIDDLE-PRICE', 4, 0.95, [-15 + 0.02, 3.0, 0], [0, Math.PI / 2, 0], { tex: logoTex(), glow: true });
  k.label('STAFF PICK: OLIVER RECOMMENDS... RUNNING', 2.4, 0.6, [15 - 0.02, 2.4, 2], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#1e4ea8', border: '#ffd400', size: 60 });
  k.label('REDUCED', 1.2, 0.6, [-7.5, 2.5, 3.6], [0, Math.PI, 0], { bg: '#ffeb3b', fg: '#111', border: null, size: 120 });
  k.label('LIMIT 2 PER CUSTOMER (RONNIE: 0)', 2.4, 0.5, [0, 2.5, -9.93], [0, 0, 0], { bg: '#fff', fg: '#c0392b' });
  k.label('PRICE: PRICELESS (PLEASE LEAVE)', 1.6, 0.45, [-6, 2.0, 8.4], [0, Math.PI, 0], { bg: '#000', fg: '#39ff14', border: null, size: 50, glow: true });

  return k.finish({
    name: 'Liddle-Price',
    sky: 0xf4f8ff, ground: 0x9a9a9a, hemiI: 2.2, sun: 0xffffff, sunI: 0.9, sunPos: [3, 10, 6],
    start: { x: 1.5, z: 4.6, yaw: 0 },
    board: { x: -2.2, y: 1.38, z: 9.6, ry: Math.PI * 0.85 },
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
    g.fillStyle = '#fff'; g.font = `900 110px ${FONT}`; g.textBaseline = 'middle'; g.fillText('LIDDLE-PRICE', 240, h / 2 + 6);
  });
}
