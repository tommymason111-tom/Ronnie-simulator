// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is eating your way to Absolute Unit while Tommy roasts you fun in VR?
// Date: 2026-11-16
// Ronnie Simulator — Level 1: Ronnie's Bedroom. WebXR (Quest 3 browser) + desktop.
import * as THREE from 'three';
import { STAGES, COMBOS, FOODS, EXCUSES, LINES, SIGN_TEXT } from './data.js';
import { initAudio, setVolume, sfx, speak, setVoiceOn, voiceAvailable } from './audio.js';

// ---------- config, seeded randomness, address options ----------
const tune = new Proxy({}, { get: (_, k) => { const c = window.CONFIG[k]; return c && typeof c === 'object' ? c.value : c; } });
const params = new URLSearchParams(location.search);
const CHEAP = params.get('render') === 'cheap';
let seed = (Number(params.get('seed') ?? window.CONFIG.seed) || 1) >>> 0;
function rng() { // mulberry32
  seed = (seed + 0x6D2B79F5) >>> 0; let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = a => a[Math.floor(rng() * a.length)];
const rand = (a, b) => a + rng() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- renderer, scene, player rig ----------
const renderer = new THREE.WebGLRenderer({ antialias: !CHEAP, powerPreference: 'high-performance' });
renderer.setPixelRatio(CHEAP ? 0.5 : Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.xr.setFoveation(1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd3ff);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.03, 200);
const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);
const EYE = 1.6;
camera.position.set(0, EYE, 0);

const hemi = new THREE.HemisphereLight(0xfff1dc, 0x6b5a4a, 2.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(2, 4, 1.5);
scene.add(sun);

// Shared materials and geometry so the GPU draws as little as possible.
const matCache = new Map();
const lam = (color, extra) => {
  const key = color + (extra ? JSON.stringify(extra) : '');
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, ...extra }));
  return matCache.get(key);
};
const V = () => new THREE.Vector3();
const tmpA = V(), tmpB = V(), tmpC = V(), headPos = V(), headDir = V();

// ---------- canvas text (signs, HUD, bubbles) ----------
const FONT = '900 {s}px Impact, "Arial Black", "Helvetica Neue", sans-serif';
function drawLines(g, lines, x, y, w, h, color, maxSize = 999) {
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  const n = lines.length;
  for (let i = 0; i < n; i++) {
    let s = Math.min(Math.floor(h / n * 0.8), maxSize);
    g.font = FONT.replace('{s}', s);
    while (g.measureText(lines[i]).width > w * 0.92 && s > 8) { s -= 2; g.font = FONT.replace('{s}', s); }
    g.fillText(lines[i], x + w / 2, y + h * (i + 0.5) / n);
  }
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function signTex(lines, { bg = '#fffdf2', fg = '#1b1b1b', border = '#1b1b1b', w = 512, h = 256 } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (border) { g.strokeStyle = border; g.lineWidth = Math.max(6, w / 50); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth); }
    drawLines(g, lines, w * 0.04, h * 0.06, w * 0.92, h * 0.88, fg);
  });
}
const staticMeshes = [];
function addStatic(mesh, parent = scene) { parent.add(mesh); mesh.updateMatrix(); mesh.matrixAutoUpdate = false; staticMeshes.push(mesh); return mesh; }
function sign(tex, w, h, x, y, z, rotY = 0, rotX = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  m.position.set(x, y, z); m.rotation.set(rotX, rotY, 0);
  return addStatic(m);
}

// ---------- the bedroom ----------
const ROOM = 2.5, CEIL = 2.6;
const solids = [];   // boxes the player, Tommy and food collide with
const surfaces = []; // where food spawns: {minX,maxX,minZ,maxZ,y,w}
function box(w, h, d, color, x, y, z, solid = true) {
  const m = addStatic(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(color)));
  m.position.set(x, y, z); m.updateMatrix();
  if (solid) solids.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top: y + h / 2, bottom: y - h / 2 });
  return m;
}
function surface(minX, maxX, minZ, maxZ, y, w) { surfaces.push({ minX, maxX, minZ, maxZ, y, w }); }

const floorTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#b5814f'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#a9744a' : '#bb8957'; g.fillRect(0, i * 64, w, 60); }
});
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(3, 3);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM * 2, ROOM * 2), new THREE.MeshLambertMaterial({ map: floorTex }));
floor.rotation.x = -Math.PI / 2; addStatic(floor);

const walls = [];
const wallMat = lam(0xcfe0f2);
for (const [x, z, ry] of [[0, -ROOM, 0], [0, ROOM, Math.PI], [-ROOM, 0, Math.PI / 2], [ROOM, 0, -Math.PI / 2]]) {
  const w = new THREE.Mesh(new THREE.PlaneGeometry(ROOM * 2, CEIL), wallMat);
  w.position.set(x, CEIL / 2, z); w.rotation.y = ry; scene.add(w);
  walls.push({ mesh: w, home: w.position.clone(), out: new THREE.Vector3(Math.sign(x), 0, Math.sign(z)) });
}
const roof = new THREE.Mesh(new THREE.PlaneGeometry(ROOM * 2, ROOM * 2), new THREE.MeshBasicMaterial({ color: 0xe9eef3 }));
roof.rotation.x = Math.PI / 2; roof.position.y = CEIL; scene.add(roof);
const roofLight = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16), new THREE.MeshBasicMaterial({ color: 0xfffbe0 }));
roofLight.position.set(0, -0.03, 0); roofLight.rotation.x = Math.PI / 2; roof.add(roofLight);
const roofAnim = { on: false, vel: V(), spin: 0 };

// Bed against the left wall
box(1.4, 0.35, 2.0, 0x5a3d2b, -1.75, 0.175, -1.0);
box(1.35, 0.15, 1.95, 0x2f5fb3, -1.75, 0.425, -1.0, false);
solids[solids.length - 1].top = 0.5; // the base box's top becomes the mattress top
box(1.4, 0.9, 0.08, 0x5a3d2b, -1.75, 0.45, -2.0);
box(0.6, 0.12, 0.35, 0xffffff, -1.75, 0.56, -1.75, false);
sign(signTex(SIGN_TEXT.bed, { bg: '#2f5fb3', fg: '#fff', border: null }), 0.9, 0.45, -1.75, 0.505, -0.7, 0, -Math.PI / 2);
surface(-2.35, -1.15, -1.5, -0.1, 0.5, 2);

// Desk, monitor and gaming chair
box(1.2, 0.05, 0.6, 0x3b3b44, 1.8, 0.73, -2.1);
for (const [x, z] of [[1.25, -2.35], [2.35, -2.35], [1.25, -1.85], [2.35, -1.85]]) box(0.05, 0.71, 0.05, 0x222228, x, 0.355, z, false);
solids.push({ minX: 1.2, maxX: 2.4, minZ: -2.4, maxZ: -1.8, top: 0.755, bottom: 0 });
box(0.6, 0.36, 0.04, 0x111111, 1.8, 1.0, -2.3, false);
sign(signTex(SIGN_TEXT.monitor, { bg: '#ffd54a', fg: '#7a4b00', border: null }), 0.56, 0.32, 1.8, 1.0, -2.275);
surface(1.3, 2.3, -2.05, -1.85, 0.755, 1.5);
box(0.55, 0.1, 0.55, 0xc0262d, 1.7, 0.48, -1.25);
box(0.55, 0.75, 0.1, 0x1b1b1b, 1.7, 0.9, -0.98, false);
sign(signTex(SIGN_TEXT.chair, { bg: '#c0262d', fg: '#fff', border: '#fff' }), 0.4, 0.2, 1.7, 1.05, -1.04, Math.PI);

// Mini fridge (with a shopping list and a padlock that's open)
box(0.5, 0.85, 0.5, 0xf2f2f2, 2.2, 0.425, 0.4);
sign(signTex(SIGN_TEXT.fridge, { bg: '#fff59d', border: null }), 0.32, 0.3, 1.948, 0.55, 0.4, -Math.PI / 2);
sign(signTex(SIGN_TEXT.padlock, { bg: '#c8c8c8', border: '#555' }), 0.14, 0.09, 1.948, 0.25, 0.4, -Math.PI / 2);
surface(2.02, 2.38, 0.22, 0.58, 0.85, 1);

// Wardrobe (S ... PARACHUTE) with a little mirror
box(0.6, 2.0, 1.2, 0x8a5a36, 2.2, 1.0, 1.75);
SIGN_TEXT.wardrobe.forEach((t, i) => sign(signTex([t], { bg: '#f0e0c0', w: 256, h: 96 }), 0.36, 0.12, 1.898, 1.75 - i * 0.2, 1.75, -Math.PI / 2));
sign(signTex(SIGN_TEXT.mirrorNote, { bg: '#fff59d', border: null }), 0.22, 0.16, 1.898, 1.82, 1.3, -Math.PI / 2);

// Bookshelf with fat-joke spines, a trophy and a clock above
box(1.0, 1.2, 0.25, 0x6e4a2f, 0, 0.6, -2.37);
sign(canvasTex(512, 300, (g, w, h) => {
  g.fillStyle = '#4a3020'; g.fillRect(0, 0, w, h);
  const cols = ['#c0392b', '#2f5fb3', '#27ae60', '#8e44ad', '#e67e22'];
  SIGN_TEXT.books.forEach((t, i) => {
    const bx = 20 + i * 96; g.fillStyle = cols[i]; g.fillRect(bx, 12, 84, h - 24);
    g.save(); g.translate(bx + 42, h / 2); g.rotate(-Math.PI / 2);
    drawLines(g, [t], -h / 2 + 16, -38, h - 32, 76, '#fff', 30); g.restore();
  });
}), 0.9, 0.53, 0, 0.88, -2.244);
surface(-0.42, 0.42, -2.45, -2.3, 1.2, 0.6);
box(0.1, 0.2, 0.1, 0xffcc33, 0.3, 1.3, -2.37, false);
sign(signTex(SIGN_TEXT.trophy, { bg: '#ffcc33', border: null }), 0.26, 0.08, 0.3, 1.22, -2.243);
const clockFace = sign(canvasTex(256, 256, (g, w) => {
  g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 4, 0, Math.PI * 2); g.fill();
  g.lineWidth = 10; g.strokeStyle = '#222'; g.stroke();
  const foods = ['🍕', '🍔', '🍩', '🌭', '🍟', '🍰', '🥤', '🍗', '🌮', '🍪', '🧁', '🥨'];
  g.font = '28px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  foods.forEach((f, i) => { const a = i / 12 * Math.PI * 2 - Math.PI / 2; g.fillText(f, w / 2 + Math.cos(a) * 96, w / 2 + Math.sin(a) * 96); });
  drawLines(g, SIGN_TEXT.clock, 60, 90, 136, 76, '#c0262d');
}), 0.45, 0.45, 0, 2.05, -2.49);
const clockHand = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.17, 0.01), lam(0x777777));
clockHand.geometry.translate(0, 0.07, 0); clockHand.position.set(0, 2.05, -2.48); scene.add(clockHand);

// Posters, calendar, window, scarf, bin, scales, rug
sign(signTex(SIGN_TEXT.wanted, { bg: '#f3e2b3', fg: '#5a2d0c', border: '#5a2d0c', w: 384, h: 512 }), 0.55, 0.73, -1.0, 1.7, -2.49);
sign(canvasTex(384, 512, (g, w, h) => {
  g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e9b48f'; g.fillRect(w * 0.3, h * 0.28, w * 0.4, h * 0.36); // torso
  g.strokeStyle = '#b07a5a'; g.lineWidth = 5;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) g.strokeRect(w * 0.38 + c * w * 0.12, h * 0.38 + r * h * 0.075, w * 0.1, h * 0.06); // abs
  g.fillStyle = '#e9b48f'; g.beginPath(); g.arc(w / 2, h * 0.2, w * 0.1, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#6b4423'; g.fillRect(w * 0.39, h * 0.1, w * 0.22, h * 0.04);
  drawLines(g, ['BE MORE TOMMY'], 0, h * 0.68, w, h * 0.14, '#ffd54a');
  drawLines(g, ['HARD WORK PAYS OFF'], 0, h * 0.82, w, h * 0.1, '#fff');
}), 0.62, 0.82, 2.49, 1.6, -0.7, -Math.PI / 2);
sign(signTex(SIGN_TEXT.calendar, { w: 384, h: 384, border: '#c0262d' }), 0.42, 0.42, 0.9, 1.55, -2.49);
sign(canvasTex(512, 384, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6ec6ff'); gr.addColorStop(1, '#d6f0ff');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#7c8a96'; for (let i = 0; i < 6; i++) g.fillRect(i * 90, h * 0.55 - (i % 3) * 30, 80, h);
  g.fillStyle = '#fff'; g.fillRect(w * 0.18, h * 0.16, w * 0.64, h * 0.34);
  drawLines(g, SIGN_TEXT.window, w * 0.18, h * 0.16, w * 0.64, h * 0.34, '#c0262d');
  g.strokeStyle = '#fff'; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
}), 1.1, 0.82, -2.49, 1.6, -0.75, Math.PI / 2);
sign(signTex(SIGN_TEXT.scarf, { bg: '#1d4fd8', fg: '#fff', border: null, w: 1024, h: 64 }), 2.6, 0.16, -2.49, 2.35, -0.9, Math.PI / 2);
const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.4, 14), lam(0x555b63)); bin.position.set(0.85, 0.2, -2.15); addStatic(bin);
solids.push({ minX: 0.68, maxX: 1.02, minZ: -2.32, maxZ: -1.98, top: 0.4, bottom: 0 });
sign(signTex(SIGN_TEXT.bin, { bg: '#fff', w: 384, h: 160 }), 0.3, 0.12, 0.85, 0.25, -1.975);
box(0.32, 0.05, 0.32, 0xdddddd, -0.85, 0.025, 0.25);
sign(signTex(SIGN_TEXT.scales, { bg: '#ddd', w: 256, h: 128, border: null }), 0.2, 0.1, -0.85, 0.052, 0.25, 0, -Math.PI / 2);
sign(canvasTex(512, 512, (g, w) => {
  g.fillStyle = '#d9a441'; g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, 7); g.fill();
  g.fillStyle = '#f7d35e'; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 30, 0, 7); g.fill();
  g.fillStyle = '#b8322a';
  for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 60 + (i % 3) * 60; g.beginPath(); g.arc(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r, 28, 0, 7); g.fill(); }
}), 1.6, 1.6, 0.2, 0.004, 0.6, 0, -Math.PI / 2).material.alphaTest = 0.5;

// Door (dynamic sign), doormat, height chart, light switch
box(0.95, 2.05, 0.06, 0x7a5133, -1.3, 1.025, 2.47, false);
const doorSignMat = new THREE.MeshBasicMaterial({ map: signTex([SIGN_TEXT.door[0]], { bg: '#fff', w: 384, h: 128 }) });
const doorSign = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.14), doorSignMat);
doorSign.position.set(-1.3, 1.25, 2.435); doorSign.rotation.y = Math.PI; scene.add(doorSign);
let doorSignStage = 0;
sign(signTex(SIGN_TEXT.doormat, { bg: '#8d6e4a', fg: '#2b1d10', border: null }), 0.8, 0.45, -1.3, 0.004, 2.1, Math.PI, -Math.PI / 2);
sign(canvasTex(160, 1024, (g, w, h) => {
  g.fillStyle = '#fff8e1'; g.fillRect(0, 0, w, h); g.fillStyle = '#333';
  for (let cm = 0; cm <= 200; cm += 10) { const y = h - cm / 200 * h; g.fillRect(0, y, cm % 50 ? 20 : 40, 3); }
  const mark = (cm, t, col) => { const y = h - cm / 200 * h; g.fillStyle = col; g.fillRect(0, y - 3, w, 6); g.font = 'bold 18px sans-serif'; g.textAlign = 'right'; g.fillText(t, w - 6, y - 10); };
  mark(168, 'Tommy (perfect)', '#b8860b'); mark(178, 'Ronnie (height)', '#1d4fd8');
}), 0.16, 2.0, -0.55, 1.0, 2.49, Math.PI);
sign(canvasTex(512, 96, (g, w, h) => {
  g.fillStyle = '#1d4fd8'; g.fillRect(0, 0, w, h); drawLines(g, ['RONNIE (width) →→→'], 0, 0, w, h, '#fff');
}), 1.2, 0.22, 0.2, 1.4, 2.49, Math.PI);
sign(signTex(SIGN_TEXT.switch, { bg: '#fff', w: 256, h: 128 }), 0.16, 0.08, -0.65, 1.2, 2.49, Math.PI);

// Floor "knee-deep" in empty MONSTOR cans: one instanced mesh = one draw call.
const canTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#111'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#39ff14'; g.lineWidth = 14;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(70 + i * 40, 50); g.lineTo(60 + i * 40, 150); g.stroke(); }
  drawLines(g, ['MONSTOR'], 0, 170, w, 60, '#39ff14');
});
const canGeo = new THREE.CylinderGeometry(0.033, 0.033, 0.16, 12);
const canMat = new THREE.MeshLambertMaterial({ map: canTex });
{
  const N = 70, inst = new THREE.InstancedMesh(canGeo, canMat, N), o = new THREE.Object3D();
  for (let i = 0; i < N; i++) {
    let x, z; do { x = rand(-2.4, 2.4); z = rand(-2.4, 2.4); } while (Math.abs(x) < 1.6 && Math.abs(z) < 1.6);
    o.position.set(x, 0.033, z); o.rotation.set(Math.PI / 2, 0, rand(0, Math.PI * 2)); o.updateMatrix(); inst.setMatrixAt(i, o.matrix);
  }
  addStatic(inst);
}

// ---------- food ----------
function foodBuilders() {
  const S = (r, c, ...a) => new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8, ...a), lam(c));
  const C = (rt, rb, h, c, seg = 14) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), Array.isArray(c) ? c : lam(c));
  const B = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), Array.isArray(c) || c.isMaterial ? c : lam(c));
  const at = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; };
  const crispsMat = new THREE.MeshLambertMaterial({ map: signTex(['CRISPS', 'RONNIE-SIZE'], { bg: '#e53935', fg: '#ffeb3b', border: '#ffeb3b', w: 256, h: 320 }) });
  const nugMat = new THREE.MeshLambertMaterial({ map: signTex(['NUGGETS'], { bg: '#d32f2f', fg: '#fff', border: null, w: 256, h: 128 }) });
  const burger = (gold) => {
    const g = new THREE.Group(), k = gold ? 0xffcc33 : null;
    g.add(at(C(0.055, 0.055, 0.025, k ?? 0xd9a25a), 0, -0.03, 0));
    g.add(at(C(0.06, 0.06, 0.022, k ?? 0x5b3a1e), 0, -0.007, 0));
    g.add(at(B(0.11, 0.005, 0.11, k ?? 0xffc107), 0, 0.006, 0, 0, Math.PI / 4));
    g.add(at(C(0.064, 0.064, 0.006, k ?? 0x66bb6a), 0, 0.012, 0));
    const top = S(0.057, k ?? 0xd9a25a, 0, Math.PI * 2, 0, Math.PI / 2); top.scale.y = 0.7; g.add(at(top, 0, 0.014, 0));
    if (gold) g.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff176, transparent: true, opacity: 0.25, depthWrite: false })));
    return g;
  };
  return {
    crisps: () => { const g = new THREE.Group(); g.add(B(0.14, 0.19, 0.045, crispsMat)); return g; },
    choc: () => { const g = new THREE.Group(); g.add(B(0.16, 0.022, 0.06, 0x6a1b9a)); g.add(at(B(0.04, 0.024, 0.062, 0x4e2a12), 0.07, 0, 0)); return g; },
    doughnut: () => {
      const g = new THREE.Group();
      g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.022, 8, 16), lam(0xc68642)), 0, 0, 0, Math.PI / 2));
      const icing = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.02, 8, 16), lam(0xff80ab)); icing.scale.set(1, 1, 0.6);
      g.add(at(icing, 0, 0.01, 0, Math.PI / 2)); return g;
    },
    pizza: () => {
      const g = new THREE.Group(), sh = new THREE.Shape();
      sh.moveTo(0, -0.09); sh.lineTo(-0.075, 0.09); sh.lineTo(0.075, 0.09); sh.lineTo(0, -0.09);
      g.add(at(new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false }), lam(0xf7d35e)), 0, -0.006, 0, Math.PI / 2));
      g.add(at(B(0.16, 0.022, 0.025, 0xc68642), 0, 0, 0.09));
      for (const [x, z] of [[0, 0.02], [-0.025, 0.055], [0.028, 0.06]]) g.add(at(C(0.014, 0.014, 0.004, 0xb8322a, 10), x, 0.008, z));
      return g;
    },
    burger: () => burger(false),
    golden: () => burger(true),
    nuggets: () => {
      const g = new THREE.Group(); g.add(C(0.075, 0.058, 0.14, [nugMat, lam(0xffffff), lam(0xffffff)]));
      for (const [x, z] of [[0.02, 0.01], [-0.025, 0.015], [0, -0.025]]) { const n = S(0.025, 0xd8973c); n.scale.y = 0.6; g.add(at(n, x, 0.075, z)); }
      return g;
    },
    kebab: () => {
      const g = new THREE.Group(); g.add(at(C(0.06, 0.04, 0.2, 0xf0d9a8), 0, 0, 0, 0, 0, Math.PI / 2.4));
      const meat = S(0.045, 0x8d4f2a); meat.scale.set(1, 0.7, 1); g.add(at(meat, -0.07, 0.04, 0));
      g.add(at(S(0.025, 0x66bb6a), -0.05, 0.06, 0.02)); g.add(at(S(0.02, 0xe53935), -0.09, 0.05, -0.02));
      return g;
    },
    can: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(canGeo, [canMat, lam(0xb0b0b0), lam(0xb0b0b0)])); return g; },
    cake: () => {
      const g = new THREE.Group(); g.add(C(0.14, 0.14, 0.1, 0xf8bbd0, 20)); g.add(at(C(0.143, 0.143, 0.02, 0xffffff, 20), 0, 0.055, 0));
      g.add(at(C(0.006, 0.006, 0.06, 0x42a5f5, 6), 0, 0.09, 0));
      g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb300 })), 0, 0.128, 0));
      return g;
    },
  };
}
const BUILD = foodBuilders();
const pools = {};
const foods = [];
const FOOD_BY_ID = Object.fromEntries(FOODS.map(f => [f.id, f]));
function pickFood() {
  if (rng() < tune.golden_chance) return FOOD_BY_ID.golden;
  const list = FOODS.filter(f => f.id !== 'golden');
  let t = rng() * list.reduce((s, f) => s + f.weight, 0);
  for (const f of list) { t -= f.weight; if (t <= 0) return f; }
  return list[0];
}
function pickSurface() {
  let t = rng() * (surfaces.reduce((s, x) => s + x.w, 0));
  for (const s of surfaces) { t -= s.w; if (t <= 0) return s; }
  return surfaces[0];
}
function spawnFood(data = pickFood()) {
  const pool = pools[data.kind] ||= [];
  let f = pool.pop();
  if (!f) { f = { data, group: BUILD[data.kind](), vel: V(), spin: V() }; scene.add(f.group); }
  const s = pickSurface();
  f.data = data; f.held = null; f.resting = false; f.thrown = false;
  f.group.visible = true;
  f.group.position.set(rand(s.minX, s.maxX), s.y + data.r + 0.03, rand(s.minZ, s.maxZ));
  f.group.rotation.set(0, rand(0, Math.PI * 2), 0);
  f.vel.set(0, 0, 0); f.spin.set(0, 0, 0);
  foods.push(f);
  return f;
}
function removeFood(f) {
  const i = foods.indexOf(f); if (i >= 0) foods.splice(i, 1);
  f.group.visible = false; f.held = null;
  (pools[f.data.kind] ||= []).push(f);
}
surface(-1.0, 1.4, -1.4, 1.6, 0, 3); // floor area in the middle of the room

// ---------- Ronnie's belly (look down!) ----------
const shirtTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#1d4fd8'; g.fillRect(0, 0, w, h); drawLines(g, ['KINGS ROAD FC'], 0, h * 0.35, w, h * 0.3, '#fff'); });
const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshLambertMaterial({ map: shirtTex }));
rig.add(belly);

// ---------- hands ----------
const handMat = lam(0xf3c6a2);
function makeHand() {
  const g = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), handMat); palm.scale.set(1, 0.7, 1.25); g.add(palm);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.04, 3, 6), handMat); f.position.set(-0.027 + i * 0.018, 0, -0.065); f.rotation.x = Math.PI / 2; g.add(f); }
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 10), lam(0x1d4fd8)); sleeve.rotation.x = Math.PI / 2; sleeve.position.z = 0.09; g.add(sleeve);
  return g;
}
const hands = [0, 1].map(i => {
  const ctrl = renderer.xr.getController(i), grip = renderer.xr.getControllerGrip(i);
  rig.add(ctrl); rig.add(grip);
  const mesh = makeHand(); grip.add(mesh);
  const h = { i, ctrl, grip, mesh, source: null, held: null, pos: V(), prev: V(), vel: V(), squeeze: false, a: false, b: false, turnArmed: true, drumCd: 0, slapCd: 0 };
  ctrl.addEventListener('connected', e => { h.source = e.data; });
  ctrl.addEventListener('disconnected', () => { if (h.held) drop(h.held); h.source = null; });
  return h;
});

// Wrist / desktop HUD: one canvas drawn a few times a second.
const hudCanvas = document.createElement('canvas'); hudCanvas.width = 512; hudCanvas.height = 300;
hudCanvas.id = 'hud';
document.body.appendChild(hudCanvas);
const hudTex = new THREE.CanvasTexture(hudCanvas); hudTex.colorSpace = THREE.SRGBColorSpace;
const wrist = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.094), new THREE.MeshBasicMaterial({ map: hudTex, transparent: true }));
wrist.position.set(0, 0.045, 0.06); wrist.rotation.x = -Math.PI / 2.6; wrist.visible = false;

// Head-attached announcement panel and MONSTOR glow ring.
const annCanvas = document.createElement('canvas'); annCanvas.width = 1024; annCanvas.height = 256;
const annTex = new THREE.CanvasTexture(annCanvas); annTex.colorSpace = THREE.SRGBColorSpace;
const announce = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ map: annTex, transparent: true, depthTest: false }));
announce.position.set(0, 0.22, -1.4); announce.renderOrder = 10; announce.visible = false; camera.add(announce);
const ring = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.7, 40), new THREE.MeshBasicMaterial({ color: 0x39ff14, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
ring.position.z = -0.2; ring.renderOrder = 9; camera.add(ring);

// Floating "+15" popups and crumbs
const popups = Array.from({ length: 6 }, () => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  s.scale.set(0.3, 0.11, 1); s.visible = false; s.renderOrder = 8; scene.add(s);
  return { s, c, t, life: 0 };
});
let popupIx = 0;
function popup(text, pos, color = '#ff8f00') {
  const p = popups[popupIx++ % popups.length], g = p.c.getContext('2d');
  g.clearRect(0, 0, 256, 96); g.lineWidth = 10; g.strokeStyle = '#000'; g.font = FONT.replace('{s}', 64); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.strokeText(text, 128, 48); g.fillStyle = color; g.fillText(text, 128, 48);
  p.t.needsUpdate = true; p.s.position.copy(pos); p.s.visible = true; p.life = 0.9;
  p.s.scale.set(0.16 * scaleNow(), 0.06 * scaleNow(), 1);
}
const CRUMBS = 80;
const crumbs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.012, 0.012), lam(0xd9a25a), CRUMBS);
crumbs.frustumCulled = false; scene.add(crumbs);
const crumbData = Array.from({ length: CRUMBS }, () => ({ p: V(), v: V(), life: 0 }));
let crumbIx = 0;
const dummy = new THREE.Object3D();
function burstCrumbs(pos, n = 12) {
  for (let i = 0; i < n; i++) {
    const c = crumbData[crumbIx++ % CRUMBS];
    c.p.copy(pos); c.v.set(rand(-1.2, 1.2), rand(0.5, 2), rand(-1.2, 1.2)); c.life = 1.2;
  }
}

// ---------- Tommy ----------
const tommy = (() => {
  const root = new THREE.Group(), pivot = new THREE.Group(), body = new THREE.Group();
  root.add(pivot); pivot.add(body); body.position.y = -0.9; pivot.position.y = 0.9;
  const skin = lam(0xe9b48f), white = lam(0xffffff), shade = lam(0xe6e6e6), dark = lam(0x2b2b30), hairM = lam(0x6b4423), beardM = lam(0x8b6a4a);
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); body.add(m); return m; };
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.15, 0.82, 0.17), dark, s * 0.1, 0.45, 0);
    add(new THREE.BoxGeometry(0.15, 0.07, 0.26), white, s * 0.1, 0.035, 0.04);
    add(new THREE.BoxGeometry(0.1, 0.18, 0.12), white, s * 0.27, 1.33, 0);      // sleeve
    add(new THREE.BoxGeometry(0.085, 0.36, 0.09), skin, s * 0.27, 1.06, 0);     // arm
  }
  add(new THREE.BoxGeometry(0.44, 0.56, 0.24), white, 0, 1.15, 0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) add(new THREE.BoxGeometry(0.075, 0.06, 0.02), shade, -0.045 + c * 0.09, 1.0 + r * 0.075, 0.122);
  add(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 10), skin, 0, 1.47, 0);
  add(new THREE.SphereGeometry(0.12, 16, 12), skin, 0, 1.6, 0);
  const beard = add(new THREE.SphereGeometry(0.125, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2.6), beardM, 0, 1.6, 0.005);
  beard.scale.set(1, 1.05, 1.02);
  add(new THREE.BoxGeometry(0.07, 0.025, 0.02), white, 0, 1.53, 0.118);        // perfect teeth
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.016, 8, 6), dark, s * 0.042, 1.62, 0.108);
  const hair = new THREE.Group(); hair.position.set(0, 1.6, 0); body.add(hair);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.3), hairM); hair.add(cap);
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.035, 0.07), hairM); c.position.set(s * 0.06, 0.07, 0.095); c.rotation.z = s * -0.5; hair.add(c); }
  // His personal spotlight: a gold glow on the floor (no real light: cheap on Quest)
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.35, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.006; scene.add(glow);
  // Speech bubble
  const bc = document.createElement('canvas'); bc.width = 1024; bc.height = 320;
  const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace;
  const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: bt, transparent: true }));
  bubble.scale.set(1.3, 0.406, 1); bubble.visible = false; scene.add(bubble);
  scene.add(root);
  return { root, pivot, body, hair, glow, bubble, bc, bt, state: 'walk', vel: V(), ang: V(), timer: 0, invuln: 0, hairTimer: 0, launchFrom: V(), yaw: 0, walkT: 0 };
})();

function setBubble(text) {
  const g = tommy.bc.getContext('2d'), w = 1024, h = 320;
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#fffdf2'; g.strokeStyle = '#ffb300'; g.lineWidth = 10;
  g.beginPath(); g.roundRect(8, 8, w - 16, h - 60, 40); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(w / 2 - 30, h - 54); g.lineTo(w / 2, h - 8); g.lineTo(w / 2 + 30, h - 54); g.fill();
  // word wrap
  g.font = 'bold 44px "Arial Black", Arial, sans-serif'; g.fillStyle = '#1b1b1b'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const words = text.split(' '), lines = []; let line = '';
  for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > w - 80) { lines.push(line); line = wd; } else line = t; }
  lines.push(line);
  const lh = 54, y0 = (h - 52) / 2 - (lines.length - 1) * lh / 2 + 4;
  lines.slice(0, 4).forEach((l, i) => g.fillText(l, w / 2, y0 + i * lh));
  tommy.bt.needsUpdate = true; tommy.bubble.visible = true;
  const sub = document.getElementById('subtitle'); if (sub) { sub.textContent = 'TOMMY: ' + text; sub.style.opacity = 1; }
}

// ---------- game state ----------
const state = {};
function resetState() {
  Object.assign(state, {
    scene: 'play', time: 0, chonk: 0, stage: 0, kcal: 0, eaten: 0, cans: 0, excuses: 0,
    combo: 0, bestCombo: 0, lastEat: -99, monstor: 0, unleash: 0, canTimes: [], burp: 0, burpFull: 0,
    tommyHits: 0, tommyLaunches: 0, furthest: 0, over: false, endAt: 0, respawns: [],
    scaleFrom: 1, scaleTo: 1, scaleT: 1, lastLine: -99, speakingUntil: 0, linePri: 0, recent: [], nextChatter: 6, excuseCd: 0,
    announceUntil: 0, endTimer: -1,
  });
}
const scaleNow = () => rig.scale.x;

// ---------- Tommy's dialogue ----------
function say(bank, pri = 1, idx = -1) {
  const list = Array.isArray(bank) ? bank : LINES[bank];
  if (!list) return;
  if (state.time < state.speakingUntil && pri <= state.linePri) return;
  let text = idx >= 0 ? list[idx] : null;
  if (!text) {
    const fresh = list.filter(l => l && !state.recent.includes(l));
    text = pick(fresh.length ? fresh : list.filter(Boolean));
  }
  state.recent.push(text); if (state.recent.length > 8) state.recent.shift();
  state.linePri = pri;
  state.speakingUntil = state.time + Math.max(2.2, text.length * 0.06) / tune.voice_rate;
  state.lastLine = state.time;
  state.nextChatter = state.time + tune.tommy_chatter;
  setBubble(text);
  speak(text, tune.voice_rate);
  if (rng() < 0.3) sfx.ting();
}

function showAnnounce(lines, color = '#ffd54a', time = 2.4) {
  const g = annCanvas.getContext('2d'), w = 1024, h = 256;
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.roundRect(0, 0, w, h, 36); g.fill();
  g.lineWidth = 8; g.strokeStyle = '#000';
  drawLines(g, lines, 20, 10, w - 40, h - 20, color);
  annTex.needsUpdate = true; announce.visible = true; state.announceUntil = state.time + time;
}

// ---------- eating, combos, MONSTOR, stages ----------
function mouthPos(out) { camera.getWorldPosition(out); out.y -= 0.07 * scaleNow(); return out; }

function eat(f) {
  const d = f.data, t = state.time;
  if (f.held && f.held !== 'desktop') f.held.held = null;
  if (f.held === 'desktop') desk.held = null;
  mouthPos(tmpA);
  burstCrumbs(tmpA.lerp(f.group.position, 0.5), d.monstor ? 0 : 12);
  removeFood(f);
  state.respawns.push(t + tune.respawn_delay);

  const win = state.monstor > 0 ? tune.combo_window + 0.5 : tune.combo_window;
  state.combo = (t - state.lastEat <= win) ? state.combo + 1 : 1;
  state.lastEat = t;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const tier = COMBOS.find(c => state.combo >= c.hits);
  const mult = tier ? tier.mult : 1;
  const gain = Math.round(d.chonk * tune.chonk_multiplier * mult * (state.monstor > 0 ? 2 : 1));
  state.chonk += gain; state.kcal += d.kcal; state.eaten++;
  mouthPos(tmpA); camera.getWorldDirection(tmpB); tmpA.addScaledVector(tmpB, 0.9 * scaleNow());
  tmpC.set(-tmpB.z, 0, tmpB.x).normalize(); tmpA.addScaledVector(tmpC, rand(0.15, 0.3) * (rng() < 0.5 ? -1 : 1) * scaleNow()); tmpA.y += rand(0.05, 0.2) * scaleNow();
  popup('+' + gain + (mult > 1 ? ' x' + mult : ''), tmpA, state.monstor > 0 ? '#39ff14' : '#ff8f00');

  const size = scaleNow();
  if (d.kind === 'crisps') sfx.crunch(size); else if (d.monstor) { sfx.pssht(); sfx.glug(size); } else sfx.chomp(size, ['kebab', 'burger', 'pizza'].includes(d.kind));

  if (tier && state.combo === tier.hits) {
    showAnnounce([tier.shout], '#ff8f00', 1.6);
    if (tier.mult >= 5) sfx.airhorn(); else sfx.ding(tier.mult >= 3 ? 1.5 : 1);
    say(tier.bank, 2);
  } else if (d.id === 'golden') {
    sfx.choir(); showAnnounce(['THE GOLDEN BURGER', '+' + gain], '#ffd54a', 3); say(['The GOLDEN burger? Ron, that was a museum piece.'], 3);
  } else if (rng() < 0.3) say(d.monstor ? 'drink' : 'eat', 1);

  if (d.monstor) {
    state.cans++; state.monstor = tune.monstor_time;
    state.burp = Math.min(100, state.burp + tune.burp_per_can);
    state.canTimes = state.canTimes.filter(x => t - x < tune.unleash_window); state.canTimes.push(t);
    if (state.canTimes.length >= tune.unleash_cans && state.unleash <= 0) {
      state.unleash = tune.unleash_time; state.canTimes = [];
      showAnnounce(['UNLEASH THE MONSTOR'], '#39ff14', 2.5); sfx.airhorn(); say('unleash', 3);
    }
  }
  checkStage();
}

function checkStage() {
  while (state.stage < STAGES.length - 1 && state.chonk >= STAGES[state.stage + 1].chonk) {
    state.stage++;
    const st = STAGES[state.stage];
    state.scaleFrom = scaleNow(); state.scaleTo = st.scale; state.scaleT = 0;
    sfx.stageUp();
    showAnnounce([`STAGE ${state.stage + 1}: ${st.name.toUpperCase()}`, `${st.chins} CHINS`], '#ffd54a', 2.6);
    say(LINES.stage[state.stage] ? [LINES.stage[state.stage]] : 'roast', 3);
    if (st.scale * EYE > CEIL - 0.25 && !roofAnim.on && roof.visible) popRoof();
    if (state.stage === STAGES.length - 1 && state.endTimer < 0) state.endTimer = 3; // too fat for the room
  }
}

function popRoof() {
  roofAnim.on = true; roofAnim.vel.set(0.6, 7, -0.4); roofAnim.spin = 2.5; sfx.roofPop();
}

function drop(f, vel) {
  if (f.held && f.held !== 'desktop') f.held.held = null;
  if (f.held === 'desktop') desk.held = null;
  f.held = null; f.resting = false; f.thrown = true;
  if (vel) f.vel.copy(vel); else f.vel.set(0, 0, 0);
  f.spin.set(rand(-6, 6), rand(-6, 6), rand(-6, 6)).multiplyScalar(Math.min(1, f.vel.length() / 4));
}

// ---------- excuses & burps ----------
function excuse() {
  if (state.excuseCd > 0 || state.over) return;
  state.excuseCd = 3.5; state.excuses++;
  const i = Math.floor(rng() * EXCUSES.length);
  showAnnounce(['"' + EXCUSES[i] + '"'], '#64b5f6', 2);
  sfx.boing();
  state.pendingExcuse = { at: state.time + 1.3, i };
}

function burp(force = 1) {
  const g = state.burp / 100;
  if (g < 0.1 || state.over) return;
  const strength = g * force;
  sfx.burp(strength);
  showAnnounce([strength > 1.2 ? 'BWAAAAAAAARP!!' : 'BWAAARP!'], '#39ff14', 1.4);
  const r = tune.burp_radius * scaleNow() * Math.max(0.35, strength);
  mouthPos(headPos);
  tmpA.set(tommy.root.position.x, 1.1, tommy.root.position.z);
  if (tmpA.distanceTo(headPos) < r + 0.3) {
    tmpB.subVectors(tmpA, headPos).setY(0).normalize().multiplyScalar(3 + 4 * strength); tmpB.y = 2.5 + 2 * strength;
    if (launchTommy(tmpB, 'burp')) tommy.hairTimer = 15;
  }
  for (const f of foods) {
    if (f.held) continue;
    const d = f.group.position.distanceTo(headPos);
    if (d < r) { tmpB.subVectors(f.group.position, headPos).normalize().multiplyScalar(4 * strength * (1 - d / r) + 1); tmpB.y += 1.5; drop(f, tmpB); f.thrown = false; }
  }
  state.burp = 0; state.burpFull = 0;
}

// ---------- Tommy behaviour ----------
function launchTommy(v, why) {
  if (tommy.invuln > 0 || tommy.state === 'down' || tommy.state === 'getup') return false;
  if (tommy.state !== 'air') {
    tommy.state = 'air'; tommy.root.position.y += 0.9; tommy.pivot.position.y = 0;
    tommy.launchFrom.copy(tommy.root.position);
  }
  tommy.vel.copy(v); tommy.ang.set(rand(-8, 8), rand(-4, 4), rand(-8, 8));
  tommy.why = why; state.tommyHits++; state.tommyLaunches++;
  sfx.splat(); sfx.whoosh();
  tmpA.copy(tommy.root.position); tmpA.y += 0.6;
  popup(why === 'burp' ? 'BWAAARP!' : why === 'belly' ? 'BOIIING!' : why === 'slap' ? 'SLAP!' : 'WALLOP!', tmpA, '#ffffff');
  return true;
}

function pushOut(p, r) { // p: Vector3 (xz used); pushes out of solids and keeps inside the room
  const lim = ROOM + wallOut - r;
  p.x = clamp(p.x, -lim, lim); p.z = clamp(p.z, -lim, lim);
  for (const s of solids) {
    if (p.x > s.minX - r && p.x < s.maxX + r && p.z > s.minZ - r && p.z < s.maxZ + r) {
      const l = p.x - (s.minX - r), rr = (s.maxX + r) - p.x, f = p.z - (s.minZ - r), b = (s.maxZ + r) - p.z;
      const m = Math.min(l, rr, f, b);
      if (m === l) p.x = s.minX - r; else if (m === rr) p.x = s.maxX + r; else if (m === f) p.z = s.minZ - r; else p.z = s.maxZ + r;
    }
  }
}

function stepTommy(dt) {
  const T = tommy, p = T.root.position;
  T.invuln = Math.max(0, T.invuln - dt);
  if (T.hairTimer > 0) { T.hairTimer -= dt; T.hair.scale.set(1.3, 2.2, 1.3); T.hair.rotation.z = Math.sin(state.time * 30) * 0.2; }
  else { T.hair.scale.set(1, 1, 1); T.hair.rotation.z = 0; }
  camera.getWorldPosition(headPos);

  if (T.state === 'walk') {
    const want = tune.tommy_distance * (0.7 + 0.5 * scaleNow());
    tmpA.set(p.x - headPos.x, 0, p.z - headPos.z);
    const d = tmpA.length() || 0.001;
    let speed = 0;
    if (d > want + 0.5) speed = -1.4; else if (d < want - 0.4) speed = 1.0;
    if (speed) { tmpA.multiplyScalar(speed * dt / d); p.add(tmpA); T.walkT += dt * 9; }
    pushOut(p, 0.3);
    p.y = 0;
    const yaw = Math.atan2(headPos.x - p.x, headPos.z - p.z);
    let dy = yaw - T.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); T.yaw += dy * Math.min(1, dt * 5);
    T.root.rotation.set(0, T.yaw, 0);
    T.pivot.position.y = 0.9 + (speed ? Math.abs(Math.sin(T.walkT)) * 0.03 : 0);
    T.pivot.rotation.set(0, 0, speed ? Math.sin(T.walkT) * 0.04 : 0);
    // Belly bump: walk into him once you're big enough
    const bellyR = bellyRadius() * scaleNow();
    if (state.stage >= 2 && d < bellyR + 0.3 && moveSpeed > 0.4) {
      tmpB.set(p.x - headPos.x, 0, p.z - headPos.z).normalize().multiplyScalar(2 + 2.5 * scaleNow()); tmpB.y = 2 + scaleNow();
      launchTommy(tmpB, 'belly');
    }
  } else if (T.state === 'air') {
    T.vel.y -= 9.8 * 0.7 * dt;
    p.addScaledVector(T.vel, dt);
    T.pivot.rotation.x += T.ang.x * dt; T.pivot.rotation.y += T.ang.y * dt; T.pivot.rotation.z += T.ang.z * dt;
    const lim = ROOM + wallOut - 0.35;
    if (Math.abs(p.x) > lim) { p.x = Math.sign(p.x) * lim; T.vel.x *= -0.5; sfx.thud(); }
    if (Math.abs(p.z) > lim) { p.z = Math.sign(p.z) * lim; T.vel.z *= -0.5; sfx.thud(); }
    if (roof.visible && !roofAnim.on && p.y > CEIL - 0.3) { p.y = CEIL - 0.3; T.vel.y = -Math.abs(T.vel.y) * 0.4; sfx.thud(); }
    if (p.y < 0.28) {
      p.y = 0.28;
      if (T.vel.y < -1.5) sfx.thud();
      T.vel.y = Math.abs(T.vel.y) * 0.35; T.vel.x *= 0.7; T.vel.z *= 0.7; T.ang.multiplyScalar(0.6);
      if (T.vel.length() < 0.6) {
        T.state = 'down'; T.timer = 0.9;
        const dist = Math.hypot(p.x - T.launchFrom.x, p.z - T.launchFrom.z);
        state.furthest = Math.max(state.furthest, dist);
        T.downRot = new THREE.Euler(Math.cos(T.pivot.rotation.x) > 0 ? -Math.PI / 2 : Math.PI / 2, T.pivot.rotation.y, 0);
      }
    }
  } else if (T.state === 'down') {
    T.timer -= dt;
    T.pivot.rotation.x += (T.downRot.x - T.pivot.rotation.x) * Math.min(1, dt * 10);
    T.pivot.rotation.z += (0 - T.pivot.rotation.z) * Math.min(1, dt * 10);
    p.y += (0.15 - p.y) * Math.min(1, dt * 10);
    if (T.timer <= 0) { T.state = 'getup'; T.timer = 0.5; }
  } else if (T.state === 'getup') {
    T.timer -= dt;
    const k = Math.min(1, dt * 8);
    T.pivot.rotation.x += (0 - T.pivot.rotation.x) * k; T.pivot.rotation.z += (0 - T.pivot.rotation.z) * k;
    T.pivot.rotation.y += (0 - T.pivot.rotation.y) * k;
    p.y += (0.9 - p.y) * k;
    if (T.timer <= 0) {
      T.state = 'walk'; p.y = 0; T.pivot.position.y = 0.9; T.pivot.rotation.set(0, 0, 0); T.invuln = 1.5;
      pushOut(p, 0.3);
      if (T.why === 'burp') say('burp', 2);
      else if (T.why === 'belly') say('belly', 2);
      else if (state.tommyHits >= 10 && !state.saidHitMany) { state.saidHitMany = true; say('hitMany', 2); }
      else say('hit', 2);
    }
  }
  // glow + bubble follow
  T.glow.position.set(p.x, 0.006, p.z);
  T.bubble.position.set(p.x, (T.state === 'walk' ? 2.1 : p.y + 0.9), p.z);
  if (state.time > state.speakingUntil + 0.6) {
    T.bubble.visible = false; const sub = document.getElementById('subtitle'); if (sub) sub.style.opacity = 0;
  }
}

// ---------- food physics ----------
let wallOut = 0;
function stepFood(f, dt) {
  const p = f.group.position, v = f.vel, r = f.data.r;
  if (f.resting) return;
  v.y -= 9.8 * dt;
  p.addScaledVector(v, dt);
  f.group.rotation.x += f.spin.x * dt; f.group.rotation.y += f.spin.y * dt; f.group.rotation.z += f.spin.z * dt;
  let grounded = false;
  if (p.y < r) { p.y = r; v.y = -v.y * 0.3; grounded = true; }
  const lim = ROOM + wallOut - r;
  if (Math.abs(p.x) > lim) { p.x = Math.sign(p.x) * lim; v.x *= -0.4; }
  if (Math.abs(p.z) > lim) { p.z = Math.sign(p.z) * lim; v.z *= -0.4; }
  if (roof.visible && !roofAnim.on && p.y > CEIL - r) { p.y = CEIL - r; v.y = -Math.abs(v.y) * 0.3; }
  for (const s of solids) {
    if (p.x > s.minX - r && p.x < s.maxX + r && p.z > s.minZ - r && p.z < s.maxZ + r && p.y - r < s.top && p.y + r > s.bottom) {
      if (s.top - (p.y - r) < 0.12 && v.y <= 0.5) { p.y = s.top + r; v.y = -v.y * 0.3; grounded = true; }
      else {
        const l = p.x - (s.minX - r), rr = (s.maxX + r) - p.x, fz = p.z - (s.minZ - r), b = (s.maxZ + r) - p.z, m = Math.min(l, rr, fz, b);
        if (m === l) { p.x = s.minX - r; v.x = -Math.abs(v.x) * 0.4; } else if (m === rr) { p.x = s.maxX + r; v.x = Math.abs(v.x) * 0.4; }
        else if (m === fz) { p.z = s.minZ - r; v.z = -Math.abs(v.z) * 0.4; } else { p.z = s.maxZ + r; v.z = Math.abs(v.z) * 0.4; }
      }
    }
  }
  if (grounded) {
    v.x *= 0.85; v.z *= 0.85; f.spin.multiplyScalar(0.8);
    if (v.lengthSq() < 0.04) { v.set(0, 0, 0); f.resting = true; f.thrown = false; }
  }
  // Thrown food hits Tommy
  if (f.thrown && tommy.state === 'walk') {
    const tp = tommy.root.position;
    if (Math.hypot(p.x - tp.x, p.z - tp.z) < 0.28 + r && p.y > 0.1 && p.y < 1.8) {
      const speed = v.length();
      if (speed > tune.tommy_hit_speed) {
        tmpA.copy(v).setY(0).normalize().multiplyScalar(Math.min(10, 2.5 + speed * 0.5 + f.data.chonk * 0.05)); tmpA.y = 3.2;
        launchTommy(tmpA, 'food');
        v.multiplyScalar(-0.3); f.thrown = false;
      }
    }
  }
}

// ---------- input ----------
const keys = new Set();
const desk = { yaw: 0, pitch: 0, held: null, eatT: -1, locked: false };
let moveSpeed = 0; const lastHead = V();
const isXR = () => renderer.xr.isPresenting;

addEventListener('keydown', e => {
  keys.add(e.code);
  if (state.scene !== 'play') return;
  if (e.code === 'KeyQ') excuse();
  if (e.code === 'KeyB') burp();
  if (e.code === 'KeyE' && desk.held) desk.eatT = 0;
  if (e.code === 'KeyF' && desk.held) throwDesk();
  if (e.code === 'KeyR' && state.over) restart();
});
addEventListener('keyup', e => keys.delete(e.code));
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
renderer.domElement.addEventListener('mousedown', e => {
  if (isXR() || state.scene !== 'play') return;
  if (!desk.locked) { renderer.domElement.requestPointerLock?.(); return; }
  if (state.over) { restart(); return; }
  if (e.button === 2) { if (desk.held) throwDesk(); return; }
  if (desk.held) desk.eatT = 0; else grabDesk();
});
document.addEventListener('pointerlockchange', () => {
  desk.locked = document.pointerLockElement === renderer.domElement;
  document.getElementById('paused').style.display = (!desk.locked && state.scene === 'play' && !isXR() && started) ? 'flex' : 'none';
});
addEventListener('mousemove', e => {
  if (!desk.locked) return;
  desk.yaw -= e.movementX * 0.0025; desk.pitch = clamp(desk.pitch - e.movementY * 0.0025, -1.45, 1.45);
});

function grabDesk() {
  camera.getWorldPosition(tmpA); camera.getWorldDirection(tmpB);
  let best = null, bestT = tune.reach * scaleNow();
  for (const f of foods) {
    if (f.held) continue;
    tmpC.subVectors(f.group.position, tmpA);
    const t = tmpC.dot(tmpB); if (t <= 0 || t > bestT) continue;
    const perp2 = tmpC.lengthSq() - t * t, rr = f.data.r + 0.1 * scaleNow();
    if (perp2 < rr * rr) { best = f; bestT = t; }
  }
  if (best) { best.held = 'desktop'; best.resting = false; desk.held = best; desk.eatT = -1; sfx.whoosh(); }
}
function throwDesk() {
  const f = desk.held; if (!f) return;
  camera.getWorldDirection(tmpB);
  tmpB.multiplyScalar(tune.throw_speed); tmpB.y += 1.2;
  drop(f, tmpB);
}

function tryGrab(h) {
  let best = null, bestD = tune.grab_radius * scaleNow();
  for (const f of foods) {
    if (f.held) continue;
    const d = f.group.position.distanceTo(h.pos) - f.data.r;
    if (d < bestD) { best = f; bestD = d; }
  }
  if (best) { best.held = h; best.resting = false; h.held = best; pulse(h, 0.4, 40); }
}
function pulse(h, s, ms) { try { h.source?.gamepad?.hapticActuators?.[0]?.pulse(s, ms); } catch { /* no haptics */ } }

const pressed = (b) => !!(b && b.pressed);
function pollXR(dt) {
  camera.getWorldPosition(headPos);
  for (const h of hands) {
    h.grip.getWorldPosition(h.pos);
    if (dt > 0) { tmpA.subVectors(h.pos, h.prev).divideScalar(dt); h.vel.lerp(tmpA, 0.6); }
    h.prev.copy(h.pos);
    const gp = h.source?.gamepad; if (!gp) continue;
    const right = h.source.handedness === 'right';
    if (!right && wrist.parent !== h.grip) { h.grip.add(wrist); wrist.visible = true; }
    const sq = pressed(gp.buttons[1]) || pressed(gp.buttons[0]);
    if (state.over) { if (sq && !h.squeeze) restart(); h.squeeze = sq; continue; }
    if (sq && !h.squeeze && !h.held) tryGrab(h);
    if (!sq && h.squeeze && h.held) { tmpA.copy(h.vel).multiplyScalar(1.4); drop(h.held, tmpA); }
    h.squeeze = sq;
    const a = pressed(gp.buttons[4]), b = pressed(gp.buttons[5]);
    if (a && !h.a) { if (right) excuse(); else burp(); }
    if (b && !h.b) { if (right) burp(); else excuse(); }
    h.a = a; h.b = b;
    const ax = gp.axes[2] ?? 0, ay = gp.axes[3] ?? 0;
    if (right) {
      if (Math.abs(ax) > 0.7 && h.turnArmed) { snapTurn(-Math.sign(ax) * tune.snap_turn * Math.PI / 180); h.turnArmed = false; }
      if (Math.abs(ax) < 0.3) h.turnArmed = true;
    } else if (Math.hypot(ax, ay) > 0.15) {
      camera.getWorldDirection(headDir); headDir.y = 0; headDir.normalize();
      const sp = tune.move_speed * STAGES[state.stage].speed * (0.6 + 0.4 * scaleNow()) * dt;
      rig.position.x += (headDir.x * -ay + -headDir.z * ax) * sp;
      rig.position.z += (headDir.z * -ay + headDir.x * ax) * sp;
    }
    // Slap Tommy / drum the belly
    h.slapCd = Math.max(0, h.slapCd - dt); h.drumCd = Math.max(0, h.drumCd - dt);
    const hs = h.vel.length();
    if (hs > tune.slap_speed && h.slapCd <= 0 && tommy.state === 'walk') {
      const tp = tommy.root.position;
      if (Math.hypot(h.pos.x - tp.x, h.pos.z - tp.z) < 0.35 && h.pos.y > 0.8 && h.pos.y < 1.85) {
        tmpA.copy(h.vel).multiplyScalar(1.2); tmpA.y = Math.max(tmpA.y, 2);
        if (launchTommy(tmpA, 'slap')) { pulse(h, 1, 120); h.slapCd = 0.5; }
      }
    }
    belly.getWorldPosition(tmpB);
    if (hs > 1 && h.drumCd <= 0 && h.pos.distanceTo(tmpB) < belly.scale.x * scaleNow() * 1.05) {
      sfx.ding(0.25 / scaleNow()); sfx.thud(); pulse(h, 0.6, 60); h.drumCd = 0.25;
    }
  }
}
function snapTurn(a) {
  camera.getWorldPosition(tmpA);
  rig.rotation.y += a;
  rig.updateMatrixWorld(true);
  camera.getWorldPosition(tmpB);
  rig.position.x += tmpA.x - tmpB.x; rig.position.z += tmpA.z - tmpB.z;
}

function pollDesktop(dt) {
  rig.rotation.y = desk.yaw; camera.rotation.set(desk.pitch, 0, 0); camera.position.set(0, EYE, 0);
  const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  if ((f || s) && !state.over) {
    const sp = tune.move_speed * STAGES[state.stage].speed * (0.6 + 0.4 * scaleNow()) * dt / Math.hypot(f, s);
    rig.position.x += (-Math.sin(desk.yaw) * f + Math.cos(desk.yaw) * s) * sp;
    rig.position.z += (-Math.cos(desk.yaw) * f - Math.sin(desk.yaw) * s) * sp;
  }
}

// Keep Ronnie's head inside the room and out of furniture.
function constrainPlayer() {
  rig.updateMatrixWorld(true);
  camera.getWorldPosition(tmpA);
  tmpB.copy(tmpA);
  pushOut(tmpB, 0.25 * scaleNow());
  rig.position.x += tmpB.x - tmpA.x; rig.position.z += tmpB.z - tmpA.z;
}

function bellyRadius() { return 0.16 + 0.055 * state.stage; }

// Held items follow hands (per frame, for smoothness); eating is checked here too.
function updateHeld(dt) {
  mouthPos(tmpC);
  const mouthR = tune.mouth_radius * scaleNow();
  for (const h of hands) {
    const f = h.held; if (!f) continue;
    f.group.position.copy(h.pos); h.grip.getWorldQuaternion(f.group.quaternion);
    if (f.group.position.distanceTo(tmpC) < mouthR) { pulse(h, 0.7, 80); eat(f); }
  }
  if (desk.held && !isXR()) {
    const f = desk.held;
    if (desk.eatT >= 0) desk.eatT += dt / 0.18;
    const k = clamp(desk.eatT, 0, 1);
    tmpA.set(0.22 * (1 - k), -0.2 + 0.14 * k, -0.45 + 0.33 * k);
    camera.localToWorld(tmpA); f.group.position.copy(tmpA);
    f.group.rotation.set(desk.pitch, desk.yaw, 0);
    if (desk.eatT >= 1) { desk.eatT = -1; eat(f); }
  }
  // Belly hangs below the head, facing where you look.
  camera.getWorldDirection(headDir); headDir.y = 0; headDir.normalize();
  const br = bellyRadius();
  camera.getWorldPosition(tmpA); rig.worldToLocal(tmpA);
  const yawLocal = Math.atan2(headDir.x, headDir.z) - rig.rotation.y;
  belly.position.set(tmpA.x + Math.sin(yawLocal) * (br * 0.55), 1.05 - br * 0.25, tmpA.z + Math.cos(yawLocal) * (br * 0.55));
  belly.rotation.y = yawLocal;
  const wob = 1 + Math.sin(state.time * 7) * 0.012 * (moveSpeed > 0.2 ? 3 : 1);
  belly.scale.set(br * wob, br * 0.9 / wob, br * 1.05);
}

// ---------- HUD ----------
let hudDirty = 0;
function drawHud() {
  const g = hudCanvas.getContext('2d'), w = 512, h = 300;
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(15,20,40,0.85)'; g.beginPath(); g.roundRect(0, 0, w, h, 28); g.fill();
  const st = STAGES[state.stage], nx = STAGES[state.stage + 1];
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#ffd54a'; g.font = FONT.replace('{s}', 40); g.fillText(`${state.stage + 1}. ${st.name.toUpperCase()}`, 20, 50);
  const frac = nx ? (state.chonk - st.chonk) / (nx.chonk - st.chonk) : 1;
  g.fillStyle = '#333'; g.fillRect(20, 66, w - 40, 30);
  g.fillStyle = '#ff8f00'; g.fillRect(20, 66, (w - 40) * clamp(frac, 0, 1), 30);
  g.fillStyle = '#fff'; g.font = 'bold 22px Arial'; g.fillText(`CHONK ${state.chonk}${nx ? ' / ' + nx.chonk : ' MAX'}`, 30, 89);
  const left = Math.max(0, tune.level_time - state.time);
  g.font = 'bold 26px Arial'; g.fillStyle = '#fff';
  g.fillText(`⏱ ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`, 20, 134);
  g.fillText(`Chins: ${st.chins}`, 190, 134);
  g.fillText(`Combo: ${state.combo > 1 && state.time - state.lastEat < tune.combo_window + 0.5 ? 'x' + (COMBOS.find(c => state.combo >= c.hits)?.mult ?? 1) + ' (' + state.combo + ')' : '-'}`, 330, 134);
  g.fillStyle = '#39ff14'; g.fillText(state.unleash > 0 ? `UNLEASHED ${state.unleash.toFixed(1)}s` : state.monstor > 0 ? `MONSTOR MODE ${state.monstor.toFixed(1)}s` : 'MONSTOR: drink a can', 20, 176);
  g.fillStyle = '#fff'; g.fillText('Burp', 20, 220);
  g.fillStyle = '#333'; g.fillRect(100, 198, w - 120, 28);
  g.fillStyle = state.burp >= 100 ? (Math.floor(state.time * 6) % 2 ? '#ff5252' : '#39ff14') : '#7cb342'; g.fillRect(100, 198, (w - 120) * state.burp / 100, 28);
  g.fillStyle = '#aaa'; g.font = 'bold 20px Arial';
  g.fillText(isXR() ? 'Grip: grab · bring to mouth: eat · A: excuse · B: burp' : 'Click: grab/eat · RMB/F: throw · Q: excuse · B: burp', 20, 270);
  hudTex.needsUpdate = true;
}

// ---------- scorecard ----------
const card = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.25), new THREE.MeshBasicMaterial({ transparent: true }));
card.visible = false; scene.add(card);
function showScorecard() {
  const stars = state.stage >= 7 ? 3 : state.stage >= 5 ? 2 : state.stage >= 3 ? 1 : 0;
  card.material.map?.dispose();
  card.material.map = canvasTex(800, 1000, (g, w, h) => {
    g.fillStyle = '#fffef5'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1b1b1b'; g.textAlign = 'center';
    g.font = FONT.replace('{s}', 64); g.fillText('RONNIE SIMULATOR', w / 2, 90);
    g.font = 'bold 30px monospace'; g.fillText('*** RECEIPT — RONNIE\'S BEDROOM ***', w / 2, 140);
    g.font = '64px serif'; g.fillStyle = '#ffb300'; g.fillText('★'.repeat(stars) + '☆'.repeat(3 - stars), w / 2, 220);
    const rows = [
      ['Stage reached', `${state.stage + 1}. ${STAGES[state.stage].name}`],
      ['Calories', state.kcal.toLocaleString()],
      ['Items eaten', state.eaten], ['MONSTOR cans', state.cans], ['Chins gained', STAGES[state.stage].chins - 1],
      ['Biggest combo', state.bestCombo], ['Excuses shouted', state.excuses],
      ['Times Tommy tried to help', state.tommyHits + 3], ['Tommy launched', state.tommyLaunches + ' times'],
      ['Furthest Tommy launch', state.furthest.toFixed(1) + ' m'],
    ];
    g.font = 'bold 30px monospace'; g.fillStyle = '#1b1b1b';
    rows.forEach(([k, v], i) => { const y = 290 + i * 54; g.textAlign = 'left'; g.fillText(k, 50, y); g.textAlign = 'right'; g.fillText(String(v), w - 50, y); });
    g.textAlign = 'center'; g.font = 'bold 30px monospace';
    g.fillText('- - - - - - - - - - - - - - - - - -', w / 2, 860);
    g.fillText(isXR() ? 'Squeeze to play again' : 'Click or press R to play again', w / 2, 920);
  });
  card.material.needsUpdate = true;
  camera.getWorldPosition(tmpA); camera.getWorldDirection(tmpB); tmpB.y = 0; tmpB.normalize();
  card.position.copy(tmpA).addScaledVector(tmpB, 1.4 * scaleNow()); card.position.y = tmpA.y;
  card.scale.setScalar(scaleNow());
  card.lookAt(tmpA.x, tmpA.y, tmpA.z);
  card.visible = true;
}

function endLevel(why) {
  if (state.over) return;
  state.over = true; state.scene = 'play';
  for (const h of hands) if (h.held) drop(h.held);
  if (desk.held) drop(desk.held);
  showAnnounce([why === 'size' ? 'TOO FAT FOR THE ROOM!' : "TIME'S UP!"], '#ff5252', 3);
  sfx.airhorn();
  say('end', 4);
  showScorecard();
  window.game.result = { stage: state.stage + 1, chonk: state.chonk };
}

// ---------- main step ----------
const STEP = 1 / 90;
function step(dt) {
  state.time += dt;
  state.excuseCd = Math.max(0, state.excuseCd - dt);
  if (state.pendingExcuse && state.time >= state.pendingExcuse.at) { say('excuse', 2, state.pendingExcuse.i); state.pendingExcuse = null; }
  if (state.monstor > 0) state.monstor = Math.max(0, state.monstor - dt);
  if (state.unleash > 0) state.unleash = Math.max(0, state.unleash - dt);
  if (state.time > state.announceUntil) announce.visible = false;

  // growth tween (elastic "boing")
  if (state.scaleT < 1) {
    state.scaleT = Math.min(1, state.scaleT + dt / 0.8);
    const t = state.scaleT;
    const e = t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
    rig.scale.setScalar(state.scaleFrom + (state.scaleTo - state.scaleFrom) * e);
  }
  if (roofAnim.on) {
    roof.position.addScaledVector(roofAnim.vel, dt); roofAnim.vel.y += 2 * dt; roof.rotation.z += roofAnim.spin * dt;
    if (roof.position.y > 40) { roof.visible = false; roofAnim.on = false; }
  }
  if (state.over) { wallOut += (0.7 - wallOut) * Math.min(1, dt * 3); }
  for (const w of walls) { w.mesh.position.copy(w.home).addScaledVector(w.out, wallOut); }

  // respawns
  while (state.respawns.length && state.respawns[0] <= state.time) {
    state.respawns.shift();
    if (foods.length < tune.food_on_map && !state.over) spawnFood();
  }
  for (const f of foods) if (!f.held) stepFood(f, dt);

  // UNLEASH THE MONSTOR: hoover food into your mouth
  if (state.unleash > 0) {
    mouthPos(tmpC);
    const R = tune.unleash_radius * scaleNow();
    for (const f of foods.slice()) {
      if (f.held) continue;
      const d = f.group.position.distanceTo(tmpC);
      if (d < R) {
        f.resting = false; tmpA.subVectors(tmpC, f.group.position).normalize().multiplyScalar(5);
        f.vel.lerp(tmpA, 0.2); f.vel.y += 9.8 * dt;
        if (d < tune.mouth_radius * scaleNow() + 0.05) eat(f);
      }
    }
  }

  // burp gauge: involuntary burp after 10s at 100%
  if (state.burp >= 100) { state.burpFull += dt; if (state.burpFull > 10) { state.burp = 100; burp(2); } }

  stepTommy(dt);

  // chatter
  if (!state.over) {
    if (state.time > state.nextChatter && state.time > state.speakingUntil) {
      if (state.time - state.lastEat > 20 && state.eaten > 0) say('idle', 1); else say(rng() < 0.4 ? 'age' : 'roast', 1);
    }
    if (state.endTimer > 0) { state.endTimer -= dt; if (state.endTimer <= 0) endLevel('size'); }
    if (state.time >= tune.level_time) endLevel('time');
  }

  // door sign changes with size
  if (doorSignStage !== state.stage) {
    doorSignStage = state.stage;
    doorSignMat.map.dispose(); doorSignMat.map = signTex([SIGN_TEXT.door[state.stage]], { bg: '#fff', w: 384, h: 128 }); doorSignMat.needsUpdate = true;
  }
  clockHand.rotation.z -= dt * 4;
}

// Frame-rate effects that do not change the game (crumbs, popups, glow).
function animateFx(dt) {
  for (let i = 0; i < CRUMBS; i++) {
    const c = crumbData[i];
    if (c.life > 0) {
      c.life -= dt; c.v.y -= 9.8 * dt; c.p.addScaledVector(c.v, dt); if (c.p.y < 0.006) { c.p.y = 0.006; c.v.set(0, 0, 0); }
      dummy.position.copy(c.p); dummy.scale.setScalar(c.life > 0 ? 1 : 0);
    } else { dummy.position.set(0, -10, 0); dummy.scale.setScalar(0); }
    dummy.updateMatrix(); crumbs.setMatrixAt(i, dummy.matrix);
  }
  crumbs.instanceMatrix.needsUpdate = true;
  for (const p of popups) {
    if (p.life <= 0) continue;
    p.life -= dt; p.s.position.y += dt * 0.35 * scaleNow(); p.s.material.opacity = Math.min(1, p.life * 2);
    if (p.life <= 0 || state.over) { p.s.visible = false; p.life = 0; }
  }
  const m = state.unleash > 0 ? 0.35 + Math.sin(state.time * 20) * 0.1 : state.monstor > 0 ? 0.16 + Math.sin(state.time * 8) * 0.05 : 0;
  ring.material.opacity += (m - ring.material.opacity) * Math.min(1, dt * 6);
  ring.visible = ring.material.opacity > 0.01;
  hemi.color.setHex(state.monstor > 0 ? 0xd8ffd0 : 0xfff1dc);
  tommy.glow.material.opacity = 0.28 + Math.sin(state.time * 3) * 0.07;
  for (const f of foods) if (f.data.id === 'golden' && !f.held) f.group.rotation.y += dt * 1.5;
}

// ---------- start / restart ----------
let started = false;
function restart() {
  for (const f of foods.slice()) removeFood(f);
  desk.held = null; for (const h of hands) h.held = null;
  resetState();
  rig.scale.setScalar(1); rig.position.set(0, 0, 1.2); desk.yaw = 0; desk.pitch = 0;
  if (!isXR()) rig.rotation.y = 0;
  roof.visible = true; roof.position.set(0, CEIL, 0); roof.rotation.set(Math.PI / 2, 0, 0); roofAnim.on = false;
  wallOut = 0; card.visible = false; announce.visible = false;
  tommy.state = 'walk'; tommy.root.position.set(-1.2, 0, 2.0); tommy.pivot.position.y = 0.9; tommy.pivot.rotation.set(0, 0, 0); tommy.invuln = 0; tommy.hairTimer = 0;
  for (let i = 0; i < tune.food_on_map; i++) spawnFood(i === 0 ? FOOD_BY_ID.can : undefined);
  drawHud();
  say('greet', 3, 0);
}

let lastT = -1, acc = 0;
renderer.setAnimationLoop((tms) => {
  const now = window.GAME_CLOCK ? window.GAME_CLOCK() : tms / 1000;
  const dt = lastT < 0 ? 0 : Math.min(0.1, now - lastT); lastT = now;
  if (state.scene === 'play' && started && (isXR() || desk.locked || window.game.manual)) {
    if (isXR()) pollXR(dt); else pollDesktop(dt);
    if (!state.over) constrainPlayer();
    camera.getWorldPosition(tmpA);
    moveSpeed = dt > 0 ? Math.hypot(tmpA.x - lastHead.x, tmpA.z - lastHead.z) / dt : 0; lastHead.copy(tmpA);
    acc += dt;
    while (acc >= STEP) { step(STEP); acc -= STEP; }
    updateHeld(dt);
    animateFx(dt);
    if ((hudDirty += dt) > 0.15) { hudDirty = 0; drawHud(); }
  }
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
});

renderer.xr.addEventListener('sessionstart', () => { document.getElementById('title').style.display = 'none'; document.getElementById('paused').style.display = 'none'; });
renderer.xr.addEventListener('sessionend', () => {
  camera.position.set(0, EYE, 0); wrist.parent?.remove(wrist); wrist.visible = false;
  document.getElementById('title').style.display = 'flex';
});

function begin() {
  initAudio(); setVolume(tune.volume);
  setVoiceOn(document.getElementById('voice').checked);
  if (!started) { started = true; restart(); }
}

document.getElementById('play-desktop').addEventListener('click', () => {
  begin(); document.getElementById('title').style.display = 'none';
  renderer.domElement.requestPointerLock?.();
});
document.getElementById('paused').addEventListener('click', () => renderer.domElement.requestPointerLock?.());
document.getElementById('voice').addEventListener('change', e => setVoiceOn(e.target.checked));
if (!voiceAvailable()) document.getElementById('voice-row').style.display = 'none';

const vrBtn = document.getElementById('play-vr');
if (navigator.xr) {
  navigator.xr.isSessionSupported('immersive-vr').then(ok => {
    if (!ok) { vrBtn.textContent = 'VR not available here'; return; }
    vrBtn.disabled = false; vrBtn.textContent = 'ENTER VR';
    vrBtn.addEventListener('click', async () => {
      begin();
      try {
        const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
        await renderer.xr.setSession(session);
      } catch (err) { vrBtn.textContent = 'Could not start VR'; console.warn(err); }
    });
  }).catch(() => { vrBtn.textContent = 'VR not available here'; });
} else {
  vrBtn.textContent = location.protocol === 'https:' || location.hostname === 'localhost' ? 'VR not available here' : 'VR needs https';
}

// Hooks for automated checks: window.game.{scene,state,press,step}
resetState(); state.scene = 'title';
window.game = {
  get scene() { return state.scene; }, state, manual: false,
  start() { begin(); document.getElementById('title').style.display = 'none'; this.manual = true; },
  press(code) { dispatchEvent(new KeyboardEvent('keydown', { code })); dispatchEvent(new KeyboardEvent('keyup', { code })); },
  hold(code, on = true) { on ? keys.add(code) : keys.delete(code); },
  step(n = 1) { for (let i = 0; i < n; i++) { step(STEP); updateHeld(STEP); animateFx(STEP); } drawHud(); },
  look(yaw, pitch) { desk.yaw = yaw; desk.pitch = pitch; pollDesktop(0); },
  click(button = 0) { if (button === 2) throwDesk(); else if (desk.held) desk.eatT = 0; else grabDesk(); },
  foods, tommy, eat, rig,
};
if (params.get('scene') === 'play') window.game.start();
