// THE TEST GRID (developer mode only): a big, empty, open room. A white and grey checkered floor and walls, nothing
// else in it: no buildings, no furniture. For trying out emotes, attacks and jobs with nothing in the way.
import * as THREE from 'three';
import { Kit, canvasTex } from './kit.js';

const H = 6, X = 20, Z = 20;      // 40m x 40m, 6m walls

const checker = (a, b, n = 2) => canvasTex(256, 256, (g, w, h) => {
  const s = w / n; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { g.fillStyle = (i + j) % 2 ? b : a; g.fillRect(i * s, j * s, s, s); }
  g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 2; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
});

export function buildGrid(scene) {
  const k = new Kit(scene, { x0: -X, x1: X, z0: -Z, z1: Z, y1: H });
  scene.background = new THREE.Color(0xdfe3e8);
  // the floor: 1m white and grey squares
  k.floor(-X, -Z, X, Z, checker('#f4f5f7', '#b9bec6'), 0.002, 2);
  // the walls: the same squares, a little darker, all the way round
  const wallTex = checker('#e9ebee', '#a9aeb6');
  const wall = (x0, z0, x1, z1) => { const w = Math.max(0.2, Math.abs(x1 - x0)), d = Math.max(0.2, Math.abs(z1 - z0));
    k.texBox(w, H, d, (x0 + x1) / 2, H / 2, (z0 + z1) / 2, wallTex, { tile: 2, collide: true, block: true }); };
  wall(-X, -Z - 0.1, X, -Z + 0.1); wall(-X, Z - 0.1, X, Z + 0.1); wall(-X - 0.1, -Z, -X + 0.1, Z); wall(X - 0.1, -Z, X + 0.1, Z);
  // a few spots round the middle where food can turn up (on the floor: there's nothing else)
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = 3 + (i % 4) * 2.5; k.spawns.push(new THREE.Vector3(Math.cos(a) * r, 0.1, Math.sin(a) * r)); }
  return k.finish({
    name: 'The Test Grid',
    sky: 0xffffff, ground: 0xb9bec6, hemiI: 2.0, sun: 0xffffff, sunI: 1.2, sunPos: [6, 14, 4], ambient: 0.7,
    start: { x: 0, z: 4, yaw: 0 },
    board: { x: 0, y: 1.38, z: Z - 0.12, ry: Math.PI },
    startFood: ['burger', 'pizza', 'doughnut', 'burger', 'can', 'pizza'],
    spotCount: 24,
  });
}
