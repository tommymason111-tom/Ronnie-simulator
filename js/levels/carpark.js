// The Oysterfleet's car park, out the front (from the sketch: an L round the front of the pub, the bays along the top and
// down the right, the way out at the top right). Tarmac with white bays, a disabled bay, two STAFF bays by the pub
// (one of them Lewis's, with his car in it: the passenger window put through, glass all over the floor, and a note
// taped over the hole), a cross-hatched KEEP CLEAR in front of the doors, lamp posts, the bins, a barrier and a ticket
// post at the exit, the pub's big sign by the road. Beyond: the pavement, the road, and houses all round so there's no
// edge of the world.
import * as THREE from 'three';
import { part } from '../geo.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, tileTex } from './kit.js';
import { terrace, leafyHedge, leafyBall } from './outdoor.js';

// the walkable car park (and the front of the pub): metres, pub coordinates
export const CARPARK = [[0.5, -21.7], [7.2, -21.7], [7.2, -23.9], [16.5, -23.9], [16.5, -6.95], [6.12, -6.95], [6.12, -8.88], [3.72, -8.88], [5.64, -11.28], [5.64, -13.2], [4.2, -14.16], [2.28, -14.16], [0.36, -12.24], [0.36, -15.12], [0.5, -15.12]];
const inPoly = (poly, x, z) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
export const inCarPark = (x, z) => inPoly(CARPARK, x, z);
// Lewis's car (Imposter's "sweep up the glass" job is by it)
export const LEWIS_CAR = { x: 8.35, z: -10.88 };

let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export function buildCarPark(k, scene, { brick }) {
  const P = (geo, col, m) => { if (m) geo.applyMatrix4(m); k.parts.push(part(geo, col)); };
  const B = (w, h, d, x, y, z, col, m) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); P(g, col, m); };
  const blk = (x0, z0, x1, z1, y1 = 1.2) => k.blockers.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y1 });

  // ---------------------------------------------------------------- the ground: tarmac, the road, pavements, verges
  const TARMAC = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3d3f43'; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { const v = 40 + Math.floor(Math.random() * 50); g.fillStyle = `rgb(${v},${v},${v + 3})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
    g.strokeStyle = 'rgba(20,20,22,0.5)'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let j = 0; j < 8; j++) { x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); } });
  const ROAD = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#35373b'; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { const v = 36 + Math.floor(Math.random() * 44); g.fillStyle = `rgb(${v},${v},${v + 2})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); } });
  const FLAGS = tileTex('#a8a39a', '#9d978d', '#7f7a72', 64), GRASS = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#5e8a3a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { g.fillStyle = ['#4e7a30', '#6e9a44', '#557f34', '#7aa04c'][i % 4]; g.fillRect(Math.random() * w, Math.random() * h, 2, 3); } });
  // (the land round about sits a little low: a solid bed under the tarmac and the road so there's no step to see)
  const bed = (x0, z0, x1, z1, col = 0x3a3c40) => B(x1 - x0, 0.36, z1 - z0, (x0 + x1) / 2, -0.18, (z0 + z1) / 2, col);
  bed(0.4, -23.95, 16.6, -14.1); bed(5.6, -14.2, 16.6, -6.9); bed(-16.6, -24.1, 0.5, -14.4, 0x4e6a30); bed(16.5, -32.6, 30, 18, 0x4e6a30); bed(-60, -33, 60, -23.9, 0x35373b);
  k.floor(0.45, -21.7, 16.55, -14.12, TARMAC, 0.004, 3); k.floor(7.15, -23.95, 16.55, -21.65, TARMAC, 0.004, 3); k.floor(5.6, -14.2, 16.55, -6.9, TARMAC, 0.004, 3);
  // the pavement along the pub's front and round to the door: stone flags, a kerb on the car park side
  k.floor(0.36, -15.15, 5.7, -14.12, FLAGS, 0.008, 0.6); k.floor(5.6, -14.25, 6.25, -8.88, FLAGS, 0.008, 0.6);
  { const tri = new THREE.Shape([[0.36, -12.24], [2.28, -14.16], [0.36, -14.16]].map(([x, z]) => new THREE.Vector2(x, -z))); const g = new THREE.ShapeGeometry(tri); g.rotateX(-Math.PI / 2); g.translate(0, 0.008, 0); P(g, 0x9d978d); }
  { const tri = new THREE.Shape([[3.72, -8.88], [5.64, -11.28], [5.64, -8.88]].map(([x, z]) => new THREE.Vector2(x, -z))); const g = new THREE.ShapeGeometry(tri); g.rotateX(-Math.PI / 2); g.translate(0, 0.008, 0); P(g, 0x9d978d); }
  B(5.3, 0.04, 0.14, 3.05, 0.02, -15.17, 0x8a8680); B(0.14, 0.04, 5.4, 6.25, 0.02, -11.55, 0x8a8680);
  // the verge over to the left (in front of the toilets and the restaurant): grass, a hedge, trees
  k.floor(-16.6, -24.0, 0.5, -15.1, GRASS, -0.004, 2); k.floor(0.45, -23.95, 7.2, -21.7, GRASS, -0.004, 2);
  // the road: two lanes, a dashed white line, double yellows along our side, the kerbs and pavements both sides
  k.floor(-60, -31.2, 60, -25.2, ROAD, 0.003, 4); k.floor(-60, -25.2, 60, -23.95, FLAGS, 0.12, 0.6); k.floor(-60, -32.6, 60, -31.2, FLAGS, 0.12, 0.6);
  B(120, 0.12, 0.14, 0, 0.06, -25.2, 0x8a8680); B(120, 0.12, 0.14, 0, 0.06, -31.2, 0x8a8680); B(120, 0.12, 1.3, 0, 0.06, -24.6, 0x9d978d); B(120, 0.12, 1.4, 0, 0.06, -31.9, 0x9d978d);
  for (let x = -58; x < 58; x += 3) B(1.6, 0.005, 0.12, x, 0.008, -28.2, 0xf2f2f2);
  for (const z of [-25.42, -25.55]) B(120, 0.005, 0.08, 0, 0.008, z, 0xf4c20d);
  // the dropped kerb and the way in/out of the car park
  B(9.3, 0.13, 1.3, 11.85, 0.065, -24.6, 0x8a8a86);

  // ---------------------------------------------------------------- the bays: white lines, the disabled bay, staff, keep clear
  const line = (x0, z0, x1, z1, col = 0xf2f2f0, wdt = 0.1) => { const L = Math.hypot(x1 - x0, z1 - z0), g = new THREE.BoxGeometry(wdt, 0.006, L); g.rotateY(Math.atan2(x1 - x0, z1 - z0)); g.translate((x0 + x1) / 2, 0.009, (z0 + z1) / 2); P(g, col); };
  const paint = (text, x, z, ry, w = 1.6, h = 0.5, fg = '#f2f2f0', size = 90) => k.label(text, w, h, [x, 0.012, z], [-Math.PI / 2, 0, ry], { bg: 'rgba(0,0,0,0)', fg, border: null, size });
  // along the top: three bays (the first one the disabled bay)
  for (const x of [0.7, 2.85, 5.0, 7.15]) line(x, -21.6, x, -17.0);
  line(0.7, -21.6, 7.15, -21.6);
  { const g = new THREE.PlaneGeometry(2.05, 4.5); g.rotateX(-Math.PI / 2); g.translate(1.775, 0.007, -19.3); P(g, 0x1f5fa8); }
  paint('♿', 1.775, -19.6, Math.PI, 1.4, 1.4, '#ffffff', 300); paint('DISABLED', 1.775, -17.9, Math.PI, 1.6, 0.4, '#f4c20d', 70);
  for (let i = 0; i < 6; i++) line(0.75 + 0.05, -17.05 - i * 0.75, 0.8, -17.05 - i * 0.75 - 0.4, 0xf4c20d, 0.08);
  // down the right: six bays, the cars go in nose first towards the wall
  for (let i = 0; i <= 6; i++) line(12.0, -21.9 + i * 2.5, 16.4, -21.9 + i * 2.5);
  line(16.4, -21.9, 16.4, -6.9);
  // the staff bays along the pub, and the keep clear in front of the doors
  for (const z of [-12.1, -9.65, -7.2]) line(6.3, z, 10.4, z, 0xf4c20d);
  paint('STAFF', 9.6, -10.88, Math.PI / 2, 1.4, 0.45, '#f4c20d', 90); paint('STAFF', 9.6, -8.43, Math.PI / 2, 1.4, 0.45, '#f4c20d', 90);
  { const t = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#f4c20d'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14); g.lineWidth = 9; for (let i = -h; i < w; i += 46) { g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); } });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshLambertMaterial({ map: t, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.x = -Math.PI / 2; m.position.set(7.0, 0.011, -13.6); scene.add(m);
    paint('KEEP CLEAR', 7.0, -15.2, Math.PI, 2.2, 0.45, '#f4c20d', 90); }
  // the way out: arrows, EXIT, a stop line at the barrier
  paint('EXIT ⬆', 11.2, -20.2, Math.PI, 1.8, 0.7, '#f2f2f0', 120); paint('⬇ IN', 9.0, -16.5, 0, 1.4, 0.6, '#f2f2f0', 120); paint('⬆', 11.2, -12.5, Math.PI, 0.8, 0.9, '#f2f2f0', 200);
  line(7.3, -23.3, 16.3, -23.3, 0xf2f2f0, 0.25); paint('SLOW', 11.8, -22.5, Math.PI, 1.6, 0.55, '#f2f2f0', 110);

  // ---------------------------------------------------------------- the walls round it, hedges, trees
  const wall = (x0, z0, x1, z1, h = 0.95) => { const L = Math.hypot(x1 - x0, z1 - z0), along = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    k.texBox(along ? L : 0.25, h, along ? 0.25 : L, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, brick, { tile: 0.9 }); k.box(along ? L + 0.06 : 0.33, 0.07, along ? 0.33 : L + 0.06, (x0 + x1) / 2, h + 0.035, (z0 + z1) / 2, 0xb8b0a4); blk(x0 - 0.15, z0 - 0.15, x1 + 0.15, z1 + 0.15, h);
    for (let s = 0; s <= L + 0.01; s += 3.0) { const x = x0 + (x1 - x0) * s / L, z = z0 + (z1 - z0) * s / L; k.texBox(0.36, h + 0.15, 0.36, x, (h + 0.15) / 2, z, brick, { tile: 0.9 }); k.box(0.42, 0.08, 0.42, x, h + 0.19, z, 0xb8b0a4); } };
  wall(0.5, -21.75, 7.2, -21.75); wall(7.2, -21.75, 7.2, -23.85); wall(16.55, -23.85, 16.55, -6.95); wall(10.68, -6.92, 16.55, -6.92); wall(0.42, -21.75, 0.42, -15.2);
  leafyHedge(k, 0.6, -23.8, 7.0, -22.0, 1.4); leafyHedge(k, 16.75, -23.6, 17.5, -7.2, 1.7);
  const tree = (x, z, h = 4.5, r = 1.5) => { k.cyl(0.13, 0.18, h, x, h / 2, z, 0x4a3524, 10); for (let i = 0; i < 6; i++) { const a = i * 1.05; leafyBall(k, x + Math.cos(a) * r * 0.45, h + Math.sin(i * 2.1) * 0.3, z + Math.sin(a) * r * 0.45, r * 0.62, { n: 30, r: 0.16 }); } leafyBall(k, x, h + 0.55, z, r * 0.7, { n: 30, r: 0.16 }); blk(x - 0.25, z - 0.25, x + 0.25, z + 0.25, 3); };
  tree(-2.5, -20.5); tree(-8.5, -21.0, 5.0, 1.8); tree(3.0, -23.0, 4.2, 1.3); tree(-13.5, -19.5, 4.8, 1.6);
  leafyHedge(k, -16.4, -16.4, 0.3, -15.6, 1.1);

  // ---------------------------------------------------------------- lamp posts (lit), bins, the barrier and ticket post
  const lamp = (x, z, ry = 0) => { k.cyl(0.07, 0.1, 5.2, x, 2.6, z, 0x3a3e44, 10); k.cyl(0.16, 0.18, 0.5, x, 0.25, z, 0x3a3e44, 10);
    const ax = Math.sin(ry), az = Math.cos(ry); k.box(0.06, 0.06, 0.9, x + ax * 0.45, 5.15, z + az * 0.45, 0x3a3e44, { rot: [0, ry, 0] });
    k.box(0.5, 0.12, 0.28, x + ax * 0.85, 5.08, z + az * 0.85, 0x2a2e34, { rot: [0, ry, 0] }); k.box(0.42, 0.03, 0.22, x + ax * 0.85, 5.01, z + az * 0.85, 0xfff4d0, { rot: [0, ry, 0] }); k.halo(x + ax * 0.85, 4.95, z + az * 0.85, 1.4, 0xfff0c0); blk(x - 0.18, z - 0.18, x + 0.18, z + 0.18, 5); };
  lamp(10.8, -21.4, Math.PI / 2); lamp(16.1, -14.8, -Math.PI / 2); lamp(11.2, -7.6, 0); lamp(1.0, -16.2, Math.PI);
  // the big commercial bins and the bottle bank, by the side wall
  const euro = (x, z, col, lid = 0x1a1a1a) => { k.box(1.2, 1.15, 0.95, x, 0.68, z, col); k.box(1.24, 0.08, 1.0, x, 1.29, z + 0.03, lid, { rot: [0.12, 0, 0] }); for (const sx of [-0.45, 0.45]) for (const sz of [-0.35, 0.35]) k.cyl(0.07, 0.07, 0.06, x + sx, 0.07, z + sz, 0x111111, 10); k.box(1.0, 0.04, 0.04, x, 1.05, z - 0.49, 0x9a9a9a); blk(x - 0.65, z - 0.5, x + 0.65, z + 0.5, 1.3); };
  euro(15.6, -6.0 - 2.2, 0x2e6b30); euro(14.2, -8.2, 0x2a2a2a);
  { const x = 13.0, z = -8.25; k.box(1.4, 1.5, 1.0, x, 0.75, z, 0x1f6fa8); for (let i = 0; i < 3; i++) k.cyl(0.11, 0.11, 0.02, x - 0.4 + i * 0.4, 1.3, z - 0.51, 0x111111, 16); k.label('BOTTLES', 0.9, 0.22, [x, 0.9, z - 0.505], [0, Math.PI, 0], { bg: '#1f6fa8', fg: '#fff', border: null, size: 80 }); blk(x - 0.75, z - 0.55, x + 0.75, z + 0.55, 1.5); }
  // the barrier at the exit: a striped arm (up), the post, the ticket machine
  { const x = 7.5, z = -23.4; k.box(0.35, 1.1, 0.35, x, 0.55, z, 0xd8d8d8); k.box(0.38, 0.12, 0.38, x, 1.12, z, 0xd32f2f);
    const arm = new THREE.Group(); arm.position.set(x, 1.0, z); arm.rotation.z = 1.2; scene.add(arm);
    for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.07, 0.07), new THREE.MeshLambertMaterial({ color: i % 2 ? 0xd32f2f : 0xffffff })); s.position.x = 0.2 + i * 0.4; arm.add(s); }
    blk(x - 0.2, z - 0.2, x + 0.2, z + 0.2, 1.2);
    const tx = 8.3, tz = -22.6; k.box(0.45, 1.35, 0.4, tx, 0.68, tz, 0x2a2a2a); k.box(0.36, 0.26, 0.02, tx, 1.08, tz + 0.21, 0x0d2a3a); k.box(0.12, 0.04, 0.02, tx, 0.82, tz + 0.21, 0xc9a24a);
    k.label('PAY AT BAR · PATRONS ONLY', 0.42, 0.12, [tx, 1.28, tz + 0.205], [0, 0, 0], { bg: '#1b3a2a', fg: '#e8c45a', border: null, size: 70 }); blk(tx - 0.25, tz - 0.22, tx + 0.25, tz + 0.22, 1.4); }
  // the signs: the pub's big sign by the road, staff parking, Lewis's reserved board, the disabled bay sign, rules
  const post = (x, z, h = 2.1) => { k.cyl(0.04, 0.04, h, x, h / 2, z, 0x6a6e74, 8); blk(x - 0.1, z - 0.1, x + 0.1, z + 0.1, h); };
  const board = (text, x, z, ry, w, hh, y, o = {}) => k.label(text, w, hh, [x, y, z], [0, ry, 0], { bg: o.bg || '#1b3a2a', fg: o.fg || '#e8c45a', border: o.border === undefined ? '#d4af37' : o.border, size: o.size || 60 });
  { // the pub sign: two oak posts, a swinging-look board with the name, lit from below
    for (const dx of [-1.05, 1.05]) { k.box(0.16, 3.6, 0.16, 4.3 + dx, 1.8, -23.2, 0x3a2416); blk(4.3 + dx - 0.12, -23.3, 4.3 + dx + 0.12, -23.1, 3.6); }
    k.box(2.4, 0.14, 0.2, 4.3, 3.62, -23.2, 0x3a2416);
    const t = canvasTex(512, 300, (g, w, h) => { g.fillStyle = '#1b3a2a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d4af37'; g.lineWidth = 12; g.strokeRect(10, 10, w - 20, h - 20);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e8c45a'; g.font = 'italic 700 70px Georgia, serif'; g.fillText('The Oysterfleet', w / 2, 110); g.font = '700 30px Georgia, serif'; g.fillText('FREE HOUSE · FOOD SERVED DAILY', w / 2, 180); g.font = '700 26px Arial'; g.fillText('CAR PARK · PATRONS ONLY', w / 2, 236); });
    for (const [dz, ry] of [[0.045, 0], [-0.045, Math.PI]]) k.label('pubsign', 2.0, 1.17, [4.3, 2.85, -23.2 + dz], [0, ry, 0], { tex: t });
    k.box(2.06, 1.23, 0.07, 4.3, 2.85, -23.2, 0x3a2416); k.halo(4.3, 2.0, -22.9, 1.2, 0xfff0c0); }
  post(6.15, -12.4); board('STAFF PARKING ONLY\nALL OTHERS WILL BE CLAMPED (OR SHOUTED AT BY IAN)', 6.15, -12.4, Math.PI / 2, 1.0, 0.5, 1.85, { bg: '#ffffff', fg: '#c62828', border: '#c62828', size: 46 });
  post(6.15, -10.88); board('RESERVED\nLEWIS\n(STAFF)', 6.15, -10.88, Math.PI / 2, 0.55, 0.55, 1.85, { bg: '#1b3a2a', fg: '#ffffff', border: '#d4af37', size: 64 });
  post(0.75, -21.3); board('♿ DISABLED BADGE HOLDERS ONLY', 0.75, -21.3, Math.PI, 0.55, 0.5, 1.85, { bg: '#1f5fa8', fg: '#fff', border: '#fff', size: 52 });
  post(16.2, -23.0); board('CUSTOMER PARKING · MAX 3 HOURS\nNO OVERNIGHT SLEEPING IN CARS (THIS MEANS YOU, RONNIE)', 16.2, -23.0, -Math.PI / 2, 1.1, 0.6, 1.8, { bg: '#ffffff', fg: '#1b3a2a', border: '#1b3a2a', size: 40 });
  post(7.4, -21.4); board('WAY OUT ⬆', 7.4, -21.4, Math.PI, 0.6, 0.25, 2.0, { bg: '#1b8a3a', fg: '#fff', border: null, size: 60 });

  // ---------------------------------------------------------------- the cars
  const cars = [
    { x: 3.93, z: -19.35, ry: Math.PI, col: 0x2a5aa8, kind: 'hatch', plate: 'RN21 OYS' },
    { x: 6.07, z: -19.35, ry: Math.PI, col: 0xb8bcc2, kind: 'saloon', plate: 'GU19 PNT' },
    { x: 14.25, z: -20.65, ry: Math.PI / 2, col: 0x1a1a1c, kind: 'suv', plate: 'BD70 KFC' },
    { x: 14.25, z: -18.15, ry: Math.PI / 2, col: 0xf2f2f0, kind: 'hatch', plate: 'WH23 HAM' },
    { x: 14.25, z: -13.15, ry: Math.PI / 2, col: 0x2e5a3a, kind: 'estate', plate: 'LF66 YNW' },
    { x: 14.25, z: -10.65, ry: Math.PI / 2, col: 0x8a1a24, kind: 'saloon', plate: 'CF18 PAL' },
    { x: LEWIS_CAR.x, z: LEWIS_CAR.z, ry: -Math.PI / 2, col: 0xc8102e, kind: 'hatch', plate: 'LE7 WIS', smashed: true },
    { x: 8.35, z: -8.43, ry: -Math.PI / 2, col: 0x3a3e44, kind: 'saloon', plate: 'ST4 FF1' },
  ];
  for (const c of cars) car(k, scene, c, P);
  // a lone trolley someone's left in the empty bay
  { const x = 14.6, z = -15.6; for (const sx of [-0.25, 0.25]) for (const sz of [-0.3, 0.3]) k.cyl(0.04, 0.04, 0.04, x + sx, 0.05, z + sz, 0x111111, 8);
    for (const sx of [-0.27, 0.27]) B(0.02, 0.5, 0.85, x + sx, 0.55, z, 0x9aa0a6); for (const sz of [-0.42, 0.42]) B(0.55, 0.5, 0.02, x, 0.55, z + sz, 0x9aa0a6); B(0.55, 0.02, 0.85, x, 0.3, z, 0x9aa0a6); k.box(0.6, 0.04, 0.04, x, 0.95, z + 0.45, 0xd32f2f); blk(x - 0.35, z - 0.45, x + 0.35, z + 0.45, 1); }

  // ---------------------------------------------------------------- round about: houses across the road and down the side
  terrace(k, scene, { ox: 24, oz: -34.2, ry: Math.PI, n: 7, w: 5.0, D: 7.6, garden: 1.2, brick, seed: 11 });
  terrace(k, scene, { ox: -12, oz: -34.2, ry: Math.PI, n: 6, w: 4.8, D: 7.4, garden: 1.2, brick, seed: 17 });
  terrace(k, scene, { ox: -42, oz: -34.2, ry: Math.PI, n: 5, w: 5.0, D: 7.6, garden: 1.2, brick, seed: 23 });
  terrace(k, scene, { ox: 21.0, oz: 15.5, ry: Math.PI / 2, n: 8, w: 4.8, D: 7.5, garden: 2.0, brick, seed: 29 });
  // a corner shop over the road: a flat-fronted shop, its fascia, a canopy, shutters half up, an A-board
  { const x = 30, z = -35.5; k.texBox(9, 6.2, 8, x, 3.1, z - 4, brick, { tile: 1 }); k.box(9.2, 0.2, 8.2, x, 6.3, z - 4, 0x5a5650);
    k.box(8.6, 2.4, 0.08, x, 1.4, z + 0.02, 0x1d2a33); k.box(8.8, 0.7, 0.2, x, 3.0, z + 0.06, 0x1b6a3a);
    k.label('OYSTERFLEET STORES · NEWS · OFF LICENCE · OPEN TIL LATE', 8.4, 0.55, [x, 3.0, z + 0.17], [0, 0, 0], { bg: '#1b6a3a', fg: '#fff', border: null, size: 60 });
    for (let i = 0; i < 4; i++) k.box(1.9, 0.9, 0.03, x - 3.15 + i * 2.1, 2.1, z + 0.08, 0x9aa0a6); k.halo(x, 2.6, z + 0.6, 2.5, 0xfff4d0); }
  // street lamps along the road, a bus stop, a couple of cars parked on the far side
  for (let x = -40; x <= 40; x += 13) { k.cyl(0.06, 0.09, 5.6, x, 2.8, -32.0, 0x3a3e44, 8); k.box(0.07, 0.07, 1.2, x, 5.5, -31.45, 0x3a3e44); k.box(0.5, 0.12, 0.25, x, 5.45, -30.9, 0x2a2e34); k.box(0.42, 0.03, 0.2, x, 5.38, -30.9, 0xfff4d0); k.halo(x, 5.3, -30.9, 1.4, 0xfff0c0); }
  { const x = -6, z = -32.2; k.box(3.2, 0.06, 1.3, x, 2.45, z, 0x2a2e34); for (const dx of [-1.5, 1.5]) k.cyl(0.04, 0.04, 2.45, x + dx, 1.22, z - 0.5, 0x2a2e34, 8); k.box(3.1, 2.1, 0.03, x, 1.3, z - 0.62, 0x8ea6ba); k.box(2.4, 0.06, 0.3, x, 0.45, z - 0.4, 0x6a6e74);
    k.cyl(0.04, 0.04, 2.8, x + 2.2, 1.4, z + 0.5, 0x6a6e74, 8); k.box(0.45, 0.45, 0.04, x + 2.2, 2.6, z + 0.5, 0xd32f2f); k.label('BUS', 0.36, 0.14, [x + 2.2, 2.6, z + 0.53], [0, 0, 0], { bg: '#d32f2f', fg: '#fff', border: null, size: 80 }); }
  for (const c of [{ x: -20, z: -30.2, ry: Math.PI / 2, col: 0x6a7a8a, kind: 'hatch', plate: 'KE12 BAB' }, { x: 2, z: -30.2, ry: Math.PI / 2, col: 0xd8c08a, kind: 'estate', plate: 'MU62 FTR' }, { x: 26, z: -26.2, ry: -Math.PI / 2, col: 0x5a1a4a, kind: 'saloon', plate: 'BU66 OFF' }]) car(k, scene, c, P);
}

// one car, in detail: a rounded body in its paint (a hatch, a saloon, an estate or an SUV), the glasshouse with the
// pillars in the body colour, black trim, wheels with tyres and alloys, lights front and back, number plates (white
// front, yellow back), mirrors, door handles and shut lines, wipers. Lewis's: the passenger window put through (a hole
// with jagged edges of glass left in the frame), glass all over the floor and the seat, and a note taped over it
function car(k, scene, { x, z, ry = 0, col, kind = 'hatch', plate = 'AB12 CDE', smashed = false }, P) {
  const M = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(1, 1, 1));
  const L = kind === 'suv' ? 4.5 : kind === 'hatch' ? 3.95 : 4.6, W = kind === 'suv' ? 1.86 : 1.76, ride = kind === 'suv' ? 0.42 : 0.3, bodyH = kind === 'suv' ? 0.78 : 0.62;
  const cabL = kind === 'saloon' ? 2.2 : kind === 'hatch' ? 2.15 : 2.6, cabZ = kind === 'saloon' ? -0.15 : kind === 'hatch' ? -0.35 : -0.45, cabH = kind === 'suv' ? 0.7 : 0.58;
  const b = (geo, c, lx, ly, lz) => { geo.translate(lx, ly, lz); P(geo, c, M); };
  const box = (w, h, d, lx, ly, lz, c) => b(new THREE.BoxGeometry(w, h, d), c, lx, ly, lz);
  // body and cabin (rounded), the glass, the black trim
  b(new RoundedBoxGeometry(W, bodyH, L, 3, 0.16), col, 0, ride + bodyH / 2, 0);
  b(new RoundedBoxGeometry(W - 0.14, cabH, cabL, 3, 0.18), col, 0, ride + bodyH + cabH / 2 - 0.04, cabZ);
  const GL = 0x1a2430, gy = ride + bodyH + cabH * 0.48;
  // side glass in two panes each side (the B pillar between, in the paint), the windscreen and the back glass leaning in
  for (const sx of [-1, 1]) for (const [zc, len] of [[cabZ + cabL * 0.22, cabL * 0.38], [cabZ - cabL * 0.22, cabL * 0.36]]) { if (smashed && sx === -1 && zc > cabZ) continue; box(0.02, cabH * 0.66, len, sx * (W / 2 - 0.068), gy, zc, GL); }
  { const g = new THREE.BoxGeometry(W - 0.22, cabH * 0.85, 0.03); g.rotateX(-0.55); b(g, GL, 0, gy + 0.02, cabZ + cabL / 2 - 0.02); }
  { const g = new THREE.BoxGeometry(W - 0.24, cabH * 0.78, 0.03); g.rotateX(0.5); b(g, GL, 0, gy, cabZ - cabL / 2 + 0.02); }
  box(W + 0.02, 0.1, L - 0.3, 0, ride + 0.08, 0, 0x1a1a1a);                                      // sills
  box(W - 0.1, 0.16, 0.12, 0, ride + 0.14, L / 2 - 0.02, 0x1d1d1d); box(W - 0.1, 0.16, 0.12, 0, ride + 0.14, -L / 2 + 0.02, 0x1d1d1d);   // bumpers
  box(W * 0.55, 0.18, 0.04, 0, ride + bodyH * 0.55, L / 2 + 0.01, 0x111111);                    // grille
  for (const sx of [-1, 1]) {
    box(0.38, 0.12, 0.04, sx * (W / 2 - 0.28), ride + bodyH * 0.7, L / 2 - 0.005, 0xf4f6fa);   // headlights
    box(0.34, 0.14, 0.04, sx * (W / 2 - 0.26), ride + bodyH * 0.72, -L / 2 + 0.005, 0xc0141c);  // tail lights
    box(0.05, 0.03, 0.12, sx * (W / 2 + 0.005), ride + bodyH * 0.62, cabZ + cabL * 0.05, 0x3a3a3a);   // door handles
    box(0.05, 0.03, 0.12, sx * (W / 2 + 0.005), ride + bodyH * 0.62, cabZ - cabL * 0.35, 0x3a3a3a);
    box(0.012, bodyH * 0.8, 0.012, sx * (W / 2 + 0.002), ride + bodyH * 0.5, cabZ - cabL * 0.05, 0x222222);   // shut lines
    box(0.012, bodyH * 0.8, 0.012, sx * (W / 2 + 0.002), ride + bodyH * 0.5, cabZ + cabL * 0.42, 0x222222);
    box(0.14, 0.09, 0.2, sx * (W / 2 + 0.06), ride + bodyH + 0.08, cabZ + cabL / 2 - 0.15, col);   // mirrors
    box(0.11, 0.07, 0.015, sx * (W / 2 + 0.06), ride + bodyH + 0.08, cabZ + cabL / 2 - 0.26, 0x8ea6ba);
    for (const wz of [L / 2 - 0.75, -L / 2 + 0.75]) {
      const tyre = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 20); tyre.rotateZ(Math.PI / 2); b(tyre, 0x151515, sx * (W / 2 - 0.08), 0.32, wz);
      const rim = new THREE.CylinderGeometry(0.2, 0.2, 0.012, 16); rim.rotateZ(Math.PI / 2); b(rim, 0xb8bcc2, sx * (W / 2 + 0.035), 0.32, wz);
      for (let s = 0; s < 5; s++) { const sp = new THREE.BoxGeometry(0.01, 0.17, 0.035); sp.rotateX(s * Math.PI * 2 / 5); b(sp, 0x8a8e94, sx * (W / 2 + 0.043), 0.32, wz); }
      const arch = new THREE.CylinderGeometry(0.37, 0.37, 0.05, 16, 1, false, -Math.PI / 2, Math.PI); arch.rotateZ(Math.PI / 2); b(arch, 0x111111, sx * (W / 2 - 0.02), 0.33, wz);
    }
  }
  for (const sx of [-0.25, 0.25]) { const g = new THREE.BoxGeometry(0.02, 0.015, 0.5); g.rotateY(sx * 1.6); b(g, 0x111111, sx * 0.9, ride + bodyH + 0.02, cabZ + cabL / 2 + 0.12); }   // wipers
  if (kind === 'suv' || kind === 'estate') for (const sx of [-1, 1]) box(0.04, 0.04, cabL * 0.9, sx * (W / 2 - 0.2), ride + bodyH + cabH, cabZ, 0x9aa0a6);   // roof rails
  box(0.015, 0.2, 0.015, 0.3, ride + bodyH + cabH + 0.06, cabZ - cabL * 0.4, 0x111111);   // aerial
  // number plates
  const pl = (yellow) => canvasTex(256, 56, (g, w, h) => { g.fillStyle = yellow ? '#f6c90e' : '#f4f4f0'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d4fa0'; g.fillRect(0, 0, 22, h); g.fillStyle = '#ffd700'; g.font = '700 12px Arial'; g.textAlign = 'center'; g.fillText('UK', 11, h - 8); g.fillStyle = '#111'; g.font = '700 38px "Arial Narrow", Arial'; g.textBaseline = 'middle'; g.fillText(plate, w / 2 + 10, h / 2 + 2); });
  for (const [lz, yellow, face] of [[L / 2 + 0.03, false, 0], [-L / 2 - 0.03, true, Math.PI]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.115), new THREE.MeshLambertMaterial({ map: pl(yellow) })); const p = new THREE.Vector3(0, ride + 0.24, lz).applyMatrix4(M); m.position.copy(p); m.rotation.y = ry + face; scene.add(m); }
  // it's solid: you walk round it, food bounces off it
  const cx = Math.cos(ry), sz = Math.sin(ry), hw = Math.abs(cx) * W / 2 + Math.abs(sz) * L / 2, hd = Math.abs(sz) * W / 2 + Math.abs(cx) * L / 2;
  k.blockers.push({ x0: x - hw - 0.05, x1: x + hw + 0.05, z0: z - hd - 0.05, z1: z + hd + 0.05, y1: ride + bodyH + cabH });
  k.colliders.push({ min: new THREE.Vector3(x - hw, 0, z - hd), max: new THREE.Vector3(x + hw, ride + bodyH + cabH, z + hd) });
  if (!smashed) return;
  // Lewis's: the jagged edges of glass still in the frame, the hole, glass on the seat and all over the tarmac, and the note
  const hole = canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#1a2430'; g.fillRect(0, 0, w, h);      // the tinted glass that's left round the edge...
    const edge = []; for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; edge.push([w / 2 + Math.cos(a) * (w * 0.33 + Math.random() * w * 0.12), h / 2 + Math.sin(a) * (h * 0.3 + Math.random() * h * 0.12)]); }
    g.fillStyle = '#0b0806'; g.beginPath(); g.moveTo(...edge[0]); for (const p of edge.slice(1)) g.lineTo(...p); g.closePath(); g.fill();      // ...the hole: the dark inside of the car
    g.fillStyle = '#3a2a22'; g.fillRect(w * 0.3, h * 0.55, w * 0.45, h * 0.3); g.fillStyle = '#2a1e18'; g.fillRect(w * 0.62, h * 0.25, w * 0.1, h * 0.5);     // (the seat, the headrest)
    g.fillStyle = 'rgba(220,240,250,0.9)'; for (let i = 0; i < 40; i++) g.fillRect(w * 0.3 + Math.random() * w * 0.45, h * 0.55 + Math.random() * h * 0.1, 3, 2);   // (glass on the seat)
    g.strokeStyle = 'rgba(235,245,250,0.95)'; g.lineWidth = 2; for (let i = 0; i < 30; i++) { const [ex, ey] = edge[i % 22]; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + (ex - w / 2) * (0.15 + Math.random() * 0.5), ey + (ey - h / 2) * (0.15 + Math.random() * 0.6)); g.stroke(); }
    g.lineWidth = 3; g.beginPath(); g.moveTo(...edge[0]); for (const p of edge.slice(1)) g.lineTo(...p); g.closePath(); g.stroke(); });
  const len = cabL * 0.38, zc = cabZ + cabL * 0.22, gy2 = ride + bodyH + cabH * 0.48;
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(len, cabH * 0.66), new THREE.MeshBasicMaterial({ map: hole, side: THREE.DoubleSide })); const p = new THREE.Vector3(-(W / 2 - 0.066), gy2, zc).applyMatrix4(M); m.position.copy(p); m.rotation.y = ry - Math.PI / 2; scene.add(m); }
  // the note, taped over the hole: an A4 sheet, handwritten in biro, four strips of tape
  const note = canvasTex(400, 300, (g, w, h) => { g.fillStyle = '#fbfaf4'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b9d3ee'; g.lineWidth = 2; for (let y = 50; y < h; y += 34) { g.beginPath(); g.moveTo(10, y); g.lineTo(w - 10, y); g.stroke(); }
    g.strokeStyle = '#e2a0a0'; g.beginPath(); g.moveTo(44, 0); g.lineTo(44, h); g.stroke();
    g.fillStyle = '#1a2a7a'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = 'italic 700 34px "Comic Sans MS", "Segoe Print", cursive';
    ['Sorry,', 'some drunk guy', 'smashed and', 'broke this.'].forEach((s, i) => g.fillText(s, 56, 78 + i * 52));
    g.font = 'italic 22px "Comic Sans MS", cursive'; g.fillText('(it wasn\'t me) — the Oysterfleet', 56, h - 18);
    g.fillStyle = 'rgba(230,230,200,0.75)'; for (const [tx, ty] of [[0, 0], [w - 70, 0], [0, h - 26], [w - 70, h - 26]]) g.fillRect(tx, ty, 70, 26); });
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.31), new THREE.MeshLambertMaterial({ map: note, side: THREE.DoubleSide })); const p = new THREE.Vector3(-(W / 2 - 0.05), gy2 - 0.04, zc - len * 0.18).applyMatrix4(M); m.position.copy(p); m.rotation.set(0, ry - Math.PI / 2, 0.06); scene.add(m); }
  // and a copy under the wiper, so you see it from the front too
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.15), new THREE.MeshLambertMaterial({ map: note })); const p = new THREE.Vector3(0.25, ride + bodyH + 0.12, cabZ + cabL / 2 + 0.05).applyMatrix4(M); m.position.copy(p); m.rotation.set(-0.95, ry, 0, 'YXZ'); m.rotation.order = 'YXZ'; m.rotation.set(-1.0, ry, 0); scene.add(m); }
  // glass everywhere: little cubes of safety glass on the tarmac under the window and on the seat
  for (let i = 0; i < 70; i++) { const s = 0.012 + Math.random() * 0.018, g = new THREE.BoxGeometry(s, s * 0.5, s), a = Math.random() * 6.28, r = Math.random() * 0.9;
    g.rotateY(Math.random() * 3); const lx = -(W / 2 + 0.1 + Math.abs(Math.cos(a)) * r * 0.9), lz = zc + Math.sin(a) * r; g.translate(lx, 0.012, lz); P(g, i % 3 ? 0xcfe6ef : 0xe8f4f8, M); }
  for (let i = 0; i < 18; i++) { const s = 0.015, g = new THREE.BoxGeometry(s, s * 0.5, s); g.translate(-W / 2 + 0.3 + Math.random() * 0.4, ride + bodyH - 0.05, zc + (Math.random() - 0.5) * 0.5); P(g, 0xcfe6ef, M); }
}
