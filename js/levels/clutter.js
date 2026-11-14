// Detailed party mess: drinks cans (shaped like real cans: domed base, tapered neck,
// rolled rim, printed labels, ring pulls, some crushed), beer bottles (glass, shoulders,
// neck, label, crown cap), crisp packets (puffed pillows with crimped ends and printed
// fronts) and pizza boxes (printed lids; some open with a half-eaten pizza inside).
// Everything is instanced, so a cabin full of rubbish is only a handful of draw calls.
import * as THREE from 'three';
import { canvasTex } from '../textures.js';

const BRANDS = [
  { name: 'MONSTOR', bg: '#111', fg: '#7cff3a', band: '#2a2a2a' },
  { name: 'KOLA', bg: '#c8102e', fg: '#ffffff', band: '#8a0a1e' },
  { name: 'STELLAH', bg: '#f4f0e0', fg: '#b8102e', band: '#d4af37' },
  { name: 'FIZZ', bg: '#1e5aa8', fg: '#ffd400', band: '#0d3a7a' },
  { name: 'LAGERR', bg: '#d4a017', fg: '#1a1a1a', band: '#8a6a0a' },
];

// --- shapes ---
function canGeo() {
  // profile from the middle of the base outwards and up: dome, chamfer, body, shoulder, neck, rim, lid
  const P = [[0, 0.004], [0.02, 0.0], [0.03, 0.003], [0.033, 0.012], [0.033, 0.104], [0.028, 0.115], [0.0265, 0.121], [0.0275, 0.123], [0.024, 0.121], [0, 0.119]];
  return new THREE.LatheGeometry(P.map(([x, y]) => new THREE.Vector2(x, y)), 20);
}
function tabGeo() { const g = new THREE.BoxGeometry(0.012, 0.0015, 0.02); g.translate(0, 0.1205, 0.004); return g; }
function bottleGeo() {
  const P = [[0, 0.003], [0.026, 0], [0.031, 0.006], [0.031, 0.13], [0.029, 0.15], [0.016, 0.185], [0.0115, 0.2], [0.0115, 0.232], [0.0135, 0.236], [0.0125, 0.242], [0, 0.242]];
  return new THREE.LatheGeometry(P.map(([x, y]) => new THREE.Vector2(x, y)), 16);
}
function capGeo() { const g = new THREE.CylinderGeometry(0.0145, 0.0145, 0.008, 14); g.translate(0, 0.243, 0); return g; }
function crispGeo() {
  const g = new THREE.BoxGeometry(0.15, 0.04, 0.22, 6, 2, 14), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), e = Math.min(1, Math.abs(z) / 0.11);
    let k = 1 - Math.pow(e, 5);                                           // puffed in the middle, flat at the crimped ends
    k *= 1 - 0.35 * Math.pow(Math.abs(x) / 0.075, 4);                     // and thinner at the sides
    p.setY(i, y * k + 0.02 * k);
    if (e > 0.9) p.setX(i, x * (1 + 0.04 * Math.sin(z * 900)));          // crimp teeth
  }
  g.computeVertexNormals(); return g;
}

// --- printed textures ---
function canTex(b) {
  // the lathe's v runs up the profile (point index / 9): body is v 3/9..4/9, so the print goes there
  return canvasTex(256, 512, (g, w, h) => {
    const met = g.createLinearGradient(0, 0, w, 0); ['#9aa0a6', '#e8ecef', '#8a9096', '#d8dde0', '#9aa0a6'].forEach((c, i) => met.addColorStop(i / 4, c));
    g.fillStyle = met; g.fillRect(0, 0, w, h);
    const y0 = h * (1 - 4 / 9), y1 = h * (1 - 3 / 9), lh = y1 - y0;
    g.fillStyle = b.bg; g.fillRect(0, y0, w, lh);
    g.fillStyle = b.band; g.fillRect(0, y0, w, lh * 0.12); g.fillRect(0, y1 - lh * 0.12, w, lh * 0.12);
    g.fillStyle = b.fg; g.font = `900 ${Math.round(lh * 0.42)}px "Arial Black", Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.translate(w * 0.25, y0 + lh / 2); g.scale(0.55, 1); g.fillText(b.name, 0, 0); g.restore();
    g.save(); g.translate(w * 0.75, y0 + lh / 2); g.scale(0.55, 1); g.fillText(b.name, 0, 0); g.restore();
    const sh = g.createLinearGradient(0, 0, w, 0); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.18, 'rgba(255,255,255,0.35)'); sh.addColorStop(0.3, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, y0, w, lh);
  });
}
function bottleTex(glass, label, text) {
  // bottle profile v: body 2/10..3/10 -> label
  return canvasTex(128, 512, (g, w, h) => {
    g.fillStyle = glass; g.fillRect(0, 0, w, h);
    const sh = g.createLinearGradient(0, 0, w, 0); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.15, 'rgba(255,255,255,0.4)'); sh.addColorStop(0.25, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
    const y0 = h * (1 - 3 / 10) + 4, y1 = h * (1 - 2 / 10) - 4;
    g.fillStyle = label; g.fillRect(0, y0, w, y1 - y0);
    g.fillStyle = '#d4af37'; g.fillRect(0, y0, w, 3); g.fillRect(0, y1 - 3, w, 3);
    g.fillStyle = '#7a1010'; g.font = '900 15px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 4, (y0 + y1) / 2); g.fillText(text, 3 * w / 4, (y0 + y1) / 2);
    g.fillStyle = label; g.fillRect(0, h * (1 - 7 / 10) - 10, w, 10);                  // neck label
  });
}
function crispTex(col, name, flav) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = col; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.22)'; for (let x = 0; x < w; x += 6) g.fillRect(x, 0, 2, 18), g.fillRect(x, h - 18, 2, 18);   // crimps
    g.fillStyle = '#ffd400'; g.beginPath(); g.ellipse(w / 2, h * 0.42, 92, 52, -0.15, 0, 7); g.fill();
    g.fillStyle = '#c8102e'; g.font = '900 46px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, w / 2, h * 0.42);
    for (let i = 0; i < 5; i++) { g.fillStyle = '#f0c040'; g.beginPath(); g.ellipse(70 + i * 30, h * 0.72, 16, 11, i, 0, 7); g.fill(); g.fillStyle = 'rgba(160,100,20,0.4)'; g.fillRect(64 + i * 30, h * 0.72 - 2, 10, 3); }
    g.fillStyle = '#fff'; g.font = '700 20px Arial, sans-serif'; g.fillText(flav, w / 2, h * 0.88);
  });
}
const card = () => canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#c9a675'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(90,60,20,${Math.random() * 0.12})`; g.fillRect(0, Math.random() * h, w, 1); } });
function pizzaLidTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#efe6d2'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c8102e'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#c8102e'; g.beginPath(); g.arc(w / 2, h / 2 - 10, 62, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = '900 34px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PIZZA', w / 2, h / 2 - 12);
    g.fillStyle = '#1a6a2a'; g.font = '700 18px Arial, sans-serif'; g.fillText('HOT · FRESH · DELICIOUS', w / 2, h - 46);
    g.fillStyle = 'rgba(150,90,30,0.25)'; g.beginPath(); g.ellipse(w * 0.72, h * 0.75, 30, 18, 0.4, 0, 7); g.fill();     // a grease mark
  });
}
function pizzaInsideTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c9a675'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(150,90,30,0.3)'; g.beginPath(); g.arc(w / 2, h / 2, 118, 0, 7); g.fill();                   // grease ring
    const cx = w / 2, cy = h / 2, R = 110, gone = [0, 1, 5];                                                            // three slices already eaten
    for (let i = 0; i < 8; i++) {
      if (gone.includes(i)) continue;
      const a0 = i / 8 * 6.283, a1 = (i + 1) / 8 * 6.283;
      g.fillStyle = '#d99a3a'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0 + 0.02, a1 - 0.02); g.closePath(); g.fill();
      g.fillStyle = '#f2c14e'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R - 12, a0 + 0.04, a1 - 0.04); g.closePath(); g.fill();
      g.fillStyle = '#e8a030'; for (let k = 0; k < 6; k++) { const a = a0 + (a1 - a0) * Math.random(), r = 20 + Math.random() * 70; g.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 6, 3); }
      for (let k = 0; k < 3; k++) { const a = a0 + (a1 - a0) * (0.25 + k * 0.25), r = 35 + k * 22; g.fillStyle = '#b3261e'; g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 9, 0, 7); g.fill(); }
    }
    g.fillStyle = '#d99a3a'; g.beginPath(); g.ellipse(cx + 70, cy - 60, 14, 6, 0.6, 0, 7); g.fill();                 // a bit of crust left behind
  });
}

// lie an upright thing (height along y from 0) on its side: centre it, roll it over, lift it by its radius
const layDown = (radius, halfH) => new THREE.Matrix4().makeTranslation(0, radius, 0).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)).multiply(new THREE.Matrix4().makeTranslation(0, -halfH, 0));

const WAKE = { can: 'can', canLying: 'can', bottle: 'beer', bottleLying: 'beer', crisps: 'crisps', pizza: 'pizza', pizzaOpen: 'pizza' };
const _zero = new THREE.Matrix4().makeScale(0, 0, 0), _w = new THREE.Vector3();

export class Clutter {
  constructor() { this.list = []; this.entries = []; }
  // record an item: kind 'can' | 'canLying' | 'canCrushed' | 'bottle' | 'bottleLying' | 'crisps' | 'pizza' | 'pizzaOpen'
  add(kind, x, y, z, yaw = 0, v = 0) { this.list.push({ kind, x, y, z, yaw, v }); }
  // swap a piece of mess for a real item (hidden decor, real food in its place) so it can be grabbed
  wake(items, e) {
    e.woken = true;
    for (const [key, i] of e.parts) { const im = this.kinds[key].im; im.setMatrixAt(i, _zero); im.instanceMatrix.needsUpdate = true; }
    const type = WAKE[e.kind]; if (!type) return null;
    const it = items.spawn(type, _w.copy(e.pos).add(new THREE.Vector3(0, type === 'pizza' ? 0.03 : type === 'crisps' ? 0.03 : 0.07, 0)));
    it.spawnScale = 1; it.obj.scale.setScalar(1); it.resting = true; it.fromClutter = true;
    if (e.kind === 'canLying' || e.kind === 'bottleLying') { it.obj.rotation.set(0, 0, Math.PI / 2); it.pos.y = e.pos.y + 0.035; }
    return it;
  }
  wakeNear(items, p, r) { if (!this.kinds) return; for (const e of this.entries) if (!e.woken && WAKE[e.kind] && e.pos.distanceToSquared(p) < r * r) this.wake(items, e); }
  wakeRay(items, ray, reach) {
    if (!this.kinds) return;
    for (const e of this.entries) { if (e.woken || !WAKE[e.kind]) continue;
      const along = _w.subVectors(e.pos, ray.origin).dot(ray.direction);
      if (along > 0 && along < reach && ray.distanceSqToPoint(e.pos) < 0.12 * 0.12) this.wake(items, e); }
  }
  build(scene, mapZ = (z) => z) {
    const lam = (t, o = {}) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0, ...o });
    const kinds = {};
    const part = (key, geo, mat) => (kinds[key] = kinds[key] || { geo, mat, m: [] });
    const CAN = canGeo(), TAB = tabGeo(), BOT = bottleGeo(), CAP = capGeo(), CR = crispGeo();
    const canMats = BRANDS.map(b => lam(canTex(b), { roughness: 0.35, metalness: 0.45 }));
    const tabMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.3, metalness: 0.7 });
    const botMats = [lam(bottleTex('#1f5a24', '#f4ecd2', 'LAGERR'), { roughness: 0.15, transparent: true, opacity: 0.92 }), lam(bottleTex('#5a3412', '#e8e0c0', 'BITTER'), { roughness: 0.15, transparent: true, opacity: 0.92 })];
    const capMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.35, metalness: 0.6 });
    const crispMats = [['#c8102e', 'CRISPS', 'READY SALTED'], ['#1e5aa8', 'CRISPS', 'SALT & VINEGAR'], ['#2e7d32', 'CRISPS', 'CHEESE & ONION'], ['#7b1fa2', 'CRUNCH', 'PRAWN COCKTAIL']].map(a => lam(crispTex(...a), { roughness: 0.4, metalness: 0.2, side: THREE.DoubleSide }));
    const cardT = card(), cardM = lam(cardT, { roughness: 0.9 });
    const lidMats = [cardM, cardM, lam(pizzaLidTex(), { roughness: 0.85 }), cardM, cardM, cardM];
    const inMats = [cardM, cardM, lam(pizzaInsideTex(), { roughness: 0.8 }), cardM, cardM, cardM];
    const BOX = new THREE.BoxGeometry(0.4, 0.045, 0.4), TRAY = new THREE.BoxGeometry(0.4, 0.03, 0.4), LID = new THREE.BoxGeometry(0.4, 0.006, 0.4);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(1, 1, 1), V = new THREE.Vector3(), L = new THREE.Matrix4();
    for (const it of this.list) {
      const ent = { kind: it.kind, pos: new THREE.Vector3(it.x, it.y, mapZ(it.z)), parts: [] }; this.entries.push(ent);
      const z = mapZ(it.z), r = Math.abs(Math.sin(it.x * 12.9898 + it.z * 78.233) * 43758.5453) % 1;      // a steady random per item
      const place = (key, geo, mat, local = null, scl = null, tilt = null) => {
        E.set(tilt ? tilt[0] : 0, it.yaw, tilt ? tilt[2] : 0, 'YXZ'); Q.setFromEuler(E);
        M.compose(V.set(it.x, it.y, z), Q, scl || S); if (local) M.multiply(local);
        const pk = part(key, geo, mat); ent.parts.push([key, pk.m.length]); pk.m.push(M.clone());
      };
      if (it.kind === 'can' || it.kind === 'canLying' || it.kind === 'canCrushed') {
        const b = it.v % BRANDS.length;
        if (it.kind === 'can') { place('can' + b, CAN, canMats[b]); place('tab', TAB, tabMat); }
        else if (it.kind === 'canLying') { const lay = layDown(0.033, 0.061);
          place('can' + b, CAN, canMats[b], lay); place('tab', TAB, tabMat, lay.clone()); }
        else { const sc = new THREE.Vector3(1.12, 0.45 + r * 0.2, 0.9); place('can' + b, CAN, canMats[b], null, sc, [0.25 * (r - 0.5), 0, 0.3 * (r - 0.5)]); }
      } else if (it.kind === 'bottle' || it.kind === 'bottleLying') {
        const b = it.v % 2, lay = it.kind === 'bottleLying' ? layDown(0.031, 0.12) : null;
        place('bot' + b, BOT, botMats[b], lay); place('cap', CAP, capMat, lay ? lay.clone() : null);
      } else if (it.kind === 'crisps') {
        place('crisp' + (it.v % 4), CR, crispMats[it.v % 4], null, null, [0.06 * (r - 0.5), 0, 0.08 * (r - 0.5)]);
      } else if (it.kind === 'pizza') {
        place('pbox', BOX, lidMats, new THREE.Matrix4().makeTranslation(0, 0.0225, 0));
      } else if (it.kind === 'pizzaOpen') {
        place('ptray', TRAY, inMats, new THREE.Matrix4().makeTranslation(0, 0.015, 0));
        const hinge = new THREE.Matrix4().makeTranslation(0, 0.03, -0.2).multiply(new THREE.Matrix4().makeRotationX(-1.9 + r * 0.3)).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.2));
        place('plid', LID, lidMats, hinge);
      }
    }
    this.kinds = kinds;
    for (const key in kinds) {
      const k = kinds[key], im = new THREE.InstancedMesh(k.geo, k.mat, k.m.length);
      k.m.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; k.im = im;
      im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im);
    }
  }
}
