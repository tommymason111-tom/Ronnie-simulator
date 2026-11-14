// Fully stocked shelves for Lidl: rows of real 3D products (printed cereal boxes, crisp bags,
// tins with labels, pasta bags, fizzy-drink bottles with caps, cans, biscuit tubes, loaves in
// bags, jars of spreads), packed along every shelf facing the aisle, a few gaps where things
// have sold out. All instanced: one draw call per product design.
import * as THREE from 'three';
import { canvasTex } from '../textures.js';

const FONT = '"Arial Black", Impact, sans-serif';
const txt = (g, s, x, y, size, col, maxW, rot = 0) => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col; let f = size; do { g.font = `900 ${f}px ${FONT}`; f -= 2; } while (g.measureText(s).width > maxW && f > 8); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 0, 0); g.restore(); };

// ---------- printed faces ----------
const CEREALS = [['CRUNCHO', '#e53935', '#ffd400'], ['CHOCO POPS', '#5d3a1a', '#ffb300'], ['OATY O\'S', '#f6e6b0', '#2e7d32'], ['FROSTED FLAKES', '#1e88e5', '#ffffff']];
function cerealFront([name, bg, fg]) {
  return canvasTex(128, 192, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.beginPath(); g.ellipse(w / 2, 40, 54, 26, 0, 0, 7); g.fill();
    txt(g, name, w / 2, 40, 22, bg === '#f6e6b0' ? '#5d3a1a' : bg, 96);
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(w / 2, 128, 46, 30, 0, 0, 7); g.fill();                    // the bowl
    g.fillStyle = '#e0e0e0'; g.fillRect(w / 2 - 46, 128, 92, 30);
    for (let i = 0; i < 16; i++) { g.fillStyle = fg; g.beginPath(); g.arc(w / 2 - 34 + (i % 8) * 10, 118 + Math.floor(i / 8) * 8, 5, 0, 7); g.fill(); }
    txt(g, 'NEW! MORE CRUNCH', w / 2, 178, 11, fg, 120);
  });
}
const sideTex = (bg) => canvasTex(64, 64, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(8, 10, w - 16, 4); g.fillRect(8, 22, w - 26, 3); g.fillRect(8, 30, w - 20, 3); });
const CRISPS = [['READY SALTED', '#c8102e'], ['SALT & VINEGAR', '#1e5aa8'], ['CHEESE & ONION', '#2e7d32'], ['PRAWN COCKTAIL', '#d81b60']];
function crispFront([flav, bg]) {
  return canvasTex(128, 192, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.25)'; for (let x = 0; x < w; x += 5) { g.fillRect(x, 0, 2, 12); g.fillRect(x, h - 12, 2, 12); }
    g.fillStyle = '#ffd400'; g.beginPath(); g.ellipse(w / 2, 62, 52, 32, -0.2, 0, 7); g.fill();
    txt(g, 'CRISPS', w / 2, 62, 26, '#c8102e', 96, -0.2);
    for (let i = 0; i < 5; i++) { g.fillStyle = '#f2c14e'; g.beginPath(); g.ellipse(26 + i * 19, 120 + (i % 2) * 6, 13, 9, i, 0, 7); g.fill(); }
    txt(g, flav, w / 2, 160, 14, '#fff', 116); txt(g, '6 PACK', w / 2, 180, 11, '#ffd400', 116);
  });
}
const TINS = [['BEANS', '#1e88e5', '#ff7043'], ['TOMATO SOUP', '#c62828', '#fff3e0'], ['SWEETCORN', '#2e7d32', '#ffd54f'], ['SPAGHETTI HOOPS', '#ff8f00', '#e53935']];
function tinTex([name, bg, art]) {
  // tin lathe: 8 points, body (label) between points 2 and 3 (v 2/7..3/7)
  return canvasTex(256, 256, (g, w, h) => {
    const met = g.createLinearGradient(0, 0, w, 0); ['#8f959b', '#e3e7ea', '#8f959b'].forEach((c, i) => met.addColorStop(i / 2, c)); g.fillStyle = met; g.fillRect(0, 0, w, h);
    const y0 = h * (1 - 3 / 7), y1 = h * (1 - 2 / 7); g.fillStyle = bg; g.fillRect(0, y0, w, y1 - y0);
    for (const cx of [w * 0.25, w * 0.75]) { g.fillStyle = art; g.beginPath(); g.arc(cx, (y0 + y1) / 2 + 10, 16, 0, 7); g.fill(); txt(g, name, cx, y0 + 18, 16, '#fff', 120); }
  });
}
const PASTA = [['FUSILLI', '#1565c0'], ['PENNE', '#2e7d32'], ['SPAGHETTI', '#c62828']];
function pastaFront([name, bg]) {
  return canvasTex(128, 192, (g, w, h) => {
    g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, w, h); g.fillStyle = bg; g.fillRect(0, 0, w, 52); g.fillRect(0, h - 30, w, 30);
    txt(g, name, w / 2, 28, 22, '#fff', 110);
    g.fillStyle = '#e7c46a'; for (let i = 0; i < 22; i++) { g.save(); g.translate(22 + (i % 5) * 21, 72 + Math.floor(i / 5) * 19); g.rotate(i); g.fillRect(-9, -3, 18, 6); g.restore(); }   // through the window
    txt(g, '500g', w / 2, h - 15, 14, '#fff', 100);
  });
}
const DRINKS = [['KOLA', '#3a1a0a', '#c8102e'], ['ORANJ', '#ff8f00', '#1e5aa8'], ['LEMONADE', '#e8f5c8', '#2e7d32'], ['WATER', '#d8eef8', '#1e88e5']];
function bottleTex([name, liquid, label]) {
  // bottle lathe: 10 points, body between points 2 and 3 (v 2/9..3/9); the label is the middle of it
  return canvasTex(128, 512, (g, w, h) => {
    g.fillStyle = liquid; g.fillRect(0, 0, w, h);
    const sh = g.createLinearGradient(0, 0, w, 0); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.12, 'rgba(255,255,255,0.45)'); sh.addColorStop(0.22, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
    const b0 = h * (1 - 3 / 9), b1 = h * (1 - 2 / 9), y0 = b0 + (b1 - b0) * 0.3, y1 = b0 + (b1 - b0) * 0.75; g.fillStyle = label; g.fillRect(0, y0, w, y1 - y0);
    g.fillStyle = '#fff'; g.fillRect(0, y0 + 4, w, 3); txt(g, name, w / 4, (y0 + y1) / 2, 16, '#fff', 60); txt(g, name, 3 * w / 4, (y0 + y1) / 2, 16, '#fff', 60);
  });
}
const CANS = [['MONSTOR', '#111', '#7cff3a'], ['KOLA', '#c8102e', '#fff'], ['FIZZ', '#1e5aa8', '#ffd400'], ['GINGER', '#f4f0e0', '#2e7d32']];
function canTex([name, bg, fg]) {
  return canvasTex(256, 256, (g, w, h) => {
    const met = g.createLinearGradient(0, 0, w, 0); ['#9aa0a6', '#eef1f3', '#9aa0a6'].forEach((c, i) => met.addColorStop(i / 2, c)); g.fillStyle = met; g.fillRect(0, 0, w, h);
    const y0 = h * (1 - 3 / 6), y1 = h * (1 - 2 / 6); g.fillStyle = bg; g.fillRect(0, y0, w, y1 - y0);
    for (const cx of [w * 0.25, w * 0.75]) { g.save(); g.translate(cx, (y0 + y1) / 2); g.rotate(-Math.PI / 2); g.translate(-cx, -(y0 + y1) / 2); txt(g, name, cx, (y0 + y1) / 2, 22, fg, 90); g.restore(); }
  });
}
const BISCUITS = [['DIGESTIVES', '#1e5aa8'], ['CHOCOLATE HOBS', '#5d3a1a'], ['CUSTARD CREAMS', '#f9a825']];
const wrapTex = ([name, bg]) => canvasTex(256, 128, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = '#e0b070'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(40 + i * 60, h / 2 + 14, 18, 0, 7); g.fill(); } txt(g, name, w / 2, 26, 22, '#fff', 230); });
const BREAD = [['WHITE', '#1e5aa8'], ['WHOLEMEAL', '#8d6e63']];
const breadTex = ([name, bg]) => canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#e8d2a0'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(160,110,50,0.25)'; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); } g.fillStyle = bg; g.fillRect(0, h * 0.35, w, h * 0.32); txt(g, name + ' BREAD', w / 2, h * 0.51, 24, '#fff', 230); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 0, w, 8); });
const JARS = [['#5d3a1a', 'CHOC SPREAD'], ['#c8892a', 'PEANUT'], ['#b71c1c', 'JAM']];
function jarTex([fill, name]) {
  // jar lathe: 8 points, body between points 2 and 3
  return canvasTex(128, 256, (g, w, h) => { g.fillStyle = fill; g.fillRect(0, 0, w, h); const y0 = h * (1 - 3 / 7) + 6, y1 = h * (1 - 2 / 7) - 6; g.fillStyle = '#fff8e1'; g.fillRect(0, y0, w, y1 - y0); txt(g, name, w / 4, (y0 + y1) / 2, 14, fill, 60); txt(g, name, 3 * w / 4, (y0 + y1) / 2, 14, fill, 60); });
}
const priceTex = () => canvasTex(512, 32, (g, w, h) => {
  g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 128) { g.fillStyle = '#ffd400'; g.fillRect(x + 8, 3, 70, h - 6); g.fillStyle = '#e53935'; g.fillRect(x + 8, 3, 70, 6); txt(g, '£' + (0.49 + ((x / 128) * 0.37) % 2.5).toFixed(2), x + 43, h / 2 + 3, 16, '#111', 64); g.fillStyle = '#1e4ea8'; g.fillRect(x + 84, 8, 30, h - 16); }
});

// ---------- shapes (front faces +z, standing on y = 0) ----------
const lathe = (pts, seg = 18) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
function shapes() {
  const box = (w, h, d) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); return g; };
  const bag = (w, h, d) => {            // a puffed bag standing up, crimped top and bottom
    const g = new THREE.BoxGeometry(w, h, d, 4, 10, 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), e = Math.abs(y) / (h / 2), k = 1 - Math.pow(e, 4); p.setZ(i, p.getZ(i) * (0.2 + 0.8 * k)); p.setX(i, p.getX(i) * (0.92 + 0.08 * k)); }
    g.computeVertexNormals(); g.translate(0, h / 2, 0); return g;
  };
  const tube = () => { const g = new THREE.CylinderGeometry(0.034, 0.034, 0.2, 16, 1); g.rotateZ(Math.PI / 2); g.translate(0, 0.034, 0); return g; };
  const loaf = () => { const g = new THREE.BoxGeometry(0.12, 0.12, 0.26, 4, 4, 2), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 0) { const x = p.getX(i) / 0.06; p.setY(i, y + 0.025 * (1 - x * x)); } } g.computeVertexNormals(); g.translate(0, 0.06, 0); return g; };
  return {
    cereal: box(0.19, 0.28, 0.07), crisps: bag(0.17, 0.26, 0.09), pasta: bag(0.13, 0.22, 0.05), loaf: loaf(), tube: tube(),
    tin: lathe([[0, 0.002], [0.033, 0], [0.037, 0.006], [0.037, 0.104], [0.035, 0.108], [0.036, 0.11], [0.03, 0.11], [0, 0.109]]),
    bottle: lathe([[0, 0.004], [0.032, 0], [0.044, 0.012], [0.044, 0.2], [0.044, 0.22], [0.03, 0.27], [0.015, 0.3], [0.014, 0.31], [0.016, 0.312], [0, 0.312]]),
    can: lathe([[0, 0.004], [0.026, 0], [0.033, 0.012], [0.033, 0.104], [0.028, 0.115], [0.0265, 0.122], [0, 0.12]]),
    jar: lathe([[0, 0.003], [0.036, 0], [0.04, 0.01], [0.04, 0.1], [0.036, 0.11], [0.032, 0.112], [0.033, 0.12], [0, 0.12]]),
    cap: (() => { const g = new THREE.CylinderGeometry(0.016, 0.016, 0.018, 12); g.translate(0, 0.32, 0); return g; })(),
    lid: (() => { const g = new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16); g.translate(0, 0.128, 0); return g; })(),
  };
}

export class Stock {
  constructor() { this.runs = []; }
  // a run of products along z at (x, y), z0..z1, facing +x (face = 1) or -x (face = -1)
  addRun(cat, x, y, z0, z1, face) { this.runs.push({ cat, x, y, z0, z1, face }); }
  build(scene) {
    const S = shapes(), std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, ...o });
    const boxMats = (front, side) => { const s = std({ map: side }); return [s, s, s, s, std({ map: front }), s]; };
    const D = {};   // design key -> { geo, mat, size (width along the shelf), extra parts }
    CEREALS.forEach((c, i) => D['cereal' + i] = { geo: S.cereal, mat: boxMats(cerealFront(c), sideTex(c[1])), w: 0.2 });
    CRISPS.forEach((c, i) => D['crisps' + i] = { geo: S.crisps, mat: std({ map: crispFront(c), roughness: 0.35, metalness: 0.25 }), w: 0.18 });
    PASTA.forEach((c, i) => D['pasta' + i] = { geo: S.pasta, mat: std({ map: pastaFront(c), roughness: 0.4 }), w: 0.14 });
    TINS.forEach((c, i) => D['tin' + i] = { geo: S.tin, mat: std({ map: tinTex(c), roughness: 0.35, metalness: 0.4 }), w: 0.078 });
    DRINKS.forEach((c, i) => D['bottle' + i] = { geo: S.bottle, mat: std({ map: bottleTex(c), roughness: 0.12, transparent: true, opacity: 0.93 }), w: 0.095, extra: 'cap' + i });
    CANS.forEach((c, i) => D['can' + i] = { geo: S.can, mat: std({ map: canTex(c), roughness: 0.3, metalness: 0.5 }), w: 0.07 });
    BISCUITS.forEach((c, i) => D['tube' + i] = { geo: S.tube, mat: std({ map: wrapTex(c), roughness: 0.4, metalness: 0.2 }), w: 0.075, stackY: 0.068 });
    BREAD.forEach((c, i) => D['loaf' + i] = { geo: S.loaf, mat: std({ map: breadTex(c), roughness: 0.5, transparent: true, opacity: 0.97 }), w: 0.13 });
    JARS.forEach((c, i) => D['jar' + i] = { geo: S.jar, mat: std({ map: jarTex(c), roughness: 0.15 }), w: 0.088, extra: 'lid' + i });
    const capCols = [0xc8102e, 0x1e5aa8, 0x2e7d32, 0x1e88e5], lidCols = [0xd4af37, 0xc62828, 0xffffff];
    capCols.forEach((c, i) => D['cap' + i] = { geo: S.cap, mat: std({ color: c, roughness: 0.4 }) });
    lidCols.forEach((c, i) => D['lid' + i] = { geo: S.lid, mat: std({ color: c, roughness: 0.3, metalness: 0.3 }) });
    const CAT = { crisps: ['crisps', 4], cereal: ['cereal', 4], pasta: ['pasta', 3], tin: ['tin', 4], bottle: ['bottle', 4], can: ['can', 4], tube: ['tube', 3], loaf: ['loaf', 2], jar: ['jar', 3] };
    const list = {}; const push = (key, m) => (list[key] = list[key] || []).push(m);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const r of this.runs) {
      const [base, nv] = CAT[r.cat];
      let z = r.z0 + 0.06, v = Math.floor(rnd() * nv), block = 0;
      while (z < r.z1 - 0.06) {
        if (block <= 0) { v = (v + 1 + Math.floor(rnd() * (nv - 1))) % nv; block = 3 + Math.floor(rnd() * 6); }   // a few of each design together, like a real shelf
        const d = D[base + v], w = d.w;
        if (rnd() < 0.06) { z += w * 2; block--; continue; }                                                          // sold out
        const rows = base === 'tube' ? 2 : 1, deep = base === 'can' || base === 'tin' || base === 'jar' ? 2 : 1;
        for (let k = 0; k < deep; k++) for (let st = 0; st < rows; st++) {
          Q.setFromAxisAngle(up, r.face * Math.PI / 2 + (rnd() - 0.5) * 0.12);
          M.compose(V.set(r.x - r.face * k * 0.085, r.y + st * (d.stackY || 0), z + (rnd() - 0.5) * 0.01), Q, one);
          push(base + v, M.clone()); if (d.extra) push(d.extra, M.clone());
        }
        z += w + 0.008; block--;
      }
    }
    let n = 0;
    for (const key in list) {
      const d = D[key], im = new THREE.InstancedMesh(d.geo, d.mat, list[key].length);
      list[key].forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
      im.receiveShadow = true; scene.add(im); n += list[key].length;
    }
    return n;
  }
}
export { priceTex };
