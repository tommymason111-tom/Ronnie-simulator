// LA GRANDE PORTION — the fancy restaurant for Date Night with Chloe (design
// doc F-C2): candlelit round tables, a dessert trolley, a long buffet counter,
// chandeliers. Ronnie and Chloe's table is in the middle. About 24m x 18m.
import * as THREE from 'three';
import { Kit, woodTex, canvasTex, FONT } from './kit.js';

export const DATE_TABLE = { x: 0, z: 0.6 };      // Ronnie sits at z + 0.8, Chloe at z - 0.75

export function buildRestaurant(scene) {
  const k = new Kit(scene, { x0: -12, x1: 12, z0: -9, z1: 9, y1: 3.4 });
  k.floor(-12, -9, 12, 9, woodTex('#4a2a16'), 0.002, 1.5);
  k.ceiling(0x3a1a1a, 0x1a0a0a);
  // deep red walls with gold trim
  for (const [x0, z0, x1, z1] of [[-12, -9, 12, -9], [-12, 9, 12, 9], [-12, -9, -12, 9], [12, -9, 12, 9]]) k.box(Math.max(0.1, Math.abs(x1 - x0)), 3.4, Math.max(0.1, Math.abs(z1 - z0)), (x0 + x1) / 2, 1.7, (z0 + z1) / 2, 0x5a0f18);
  for (const [x0, z0, x1, z1] of [[-12, -8.94, 12, -8.94], [-12, 8.94, 12, 8.94]]) k.box(24, 0.08, 0.02, 0, 1.0, z0, 0xd4af37);

  // the date table (round, for two) and the other diners' tables
  k.table(DATE_TABLE.x, DATE_TABLE.z, 1.0, 1.0, { round: true, cloth: 0xf5f0e8, chairs: 0, spots: 1 });
  k.chair(DATE_TABLE.x, DATE_TABLE.z - 0.75, Math.PI, 0x3a0a10);
  k.chair(DATE_TABLE.x, DATE_TABLE.z + 0.78, 0, 0x3a0a10);
  const tables = [[-7, -5], [-3.5, -5], [3.5, -5], [7, -5], [-8, 0], [-4.5, 1], [4.5, 1], [8, 0], [-7, 5.5], [-3, 5.5], [3, 5.5], [7, 5.5]];
  for (const [x, z] of tables) {
    k.table(x, z, 1.1, 1.1, { round: true, cloth: 0xf5f0e8, chairs: 0, spots: 1 });
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; k.chair(x + Math.sin(a) * 0.85, z + Math.cos(a) * 0.85, a, 0x3a0a10); }
  }
  for (const [x, z] of [[DATE_TABLE.x, DATE_TABLE.z], ...tables]) { k.cyl(0.02, 0.02, 0.18, x + 0.18, 0.86, z - 0.15, 0xfff3d0, 8); k.lamp(x + 0.18, 0.97, z - 0.15, 0xffb84d, 0.03); }

  // dessert trolley + the long buffet counter at the back
  k.box(1.4, 0.85, 0.7, 4.0, 0.425, -1.8, 0xd4af37, { collide: true, block: true });
  for (const dx of [-0.45, 0, 0.45]) k.spawns.push(new THREE.Vector3(4.0 + dx, 0.95, -1.8));
  k.label('DESSERT TROLLEY (NOT FOR RONNIE)', 1.2, 0.25, [4.0, 0.55, -1.44], [0, 0, 0], { bg: '#3a0a10', fg: '#d4af37', border: null, size: 40 });
  k.box(12, 0.95, 1.1, 0, 0.475, -8.2, 0xe8e0d0, { collide: true, block: true });
  for (let x = -5.5; x <= 5.5; x += 1.1) k.spawns.push(new THREE.Vector3(x, 1.05, -8.2));
  // chandeliers
  for (const [x, z] of [[-6, -3], [0, -3], [6, -3], [-6, 3], [0, 3], [6, 3]]) { k.lamp(x, 2.8, z, 0xffe6a8, 0.25); k.cyl(0.01, 0.01, 0.6, x, 3.1, z, 0xd4af37, 6); }
  // jokes
  k.label('LA GRANDE PORTION', 6, 1.0, [0, 2.6, -8.9], [0, 0, 0], { tex: nameTex(), glow: true });
  k.label("TONIGHT'S SPECIAL: EVERYTHING (RONNIE'S TABLE)", 2.4, 0.9, [-11.95, 1.8, 0], [0, Math.PI / 2, 0], { bg: '#1b1b1b', fg: '#f5f0e6', border: '#d4af37', size: 54 });
  k.label('PLEASE DO NOT EAT FROM OTHER TABLES (RONNIE)', 2.4, 0.6, [11.95, 1.8, 0], [0, -Math.PI / 2, 0], { bg: '#f5f0e6', fg: '#5a0f18', border: '#d4af37', size: 50 });

  return k.finish({
    name: 'La Grande Portion',
    sky: 0xffd9b0, ground: 0x3a1010, hemiI: 1.5, sun: 0xffc890, sunI: 0.8, sunPos: [2, 10, 4],
    start: { x: DATE_TABLE.x, z: DATE_TABLE.z + 1.05, yaw: 0 },
    board: { x: -3.2, y: 1.38, z: 8.85, ry: Math.PI },
    startFood: ['burger', 'pizza', 'doughnut', 'burger', 'pizza', 'doughnut', 'burger', 'pizza', 'doughnut', 'burger', 'pizza', 'doughnut', 'doughnut', 'doughnut', 'can', 'burger'],
    spotCount: 24,
  });
}

function nameTex() {
  return canvasTex(1024, 170, (g, w, h) => {
    g.fillStyle = '#1a0508'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d4af37'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#d4af37'; g.font = 'italic 96px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('La Grande Portion', w / 2, h / 2 + 4);
  });
}
