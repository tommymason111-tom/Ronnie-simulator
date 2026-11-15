// The Oysterfleet's restaurant, built off the left of the pub from the hand-drawn plan: the main dining room
// (an eight-sided room: round table, tables down the middle, tables along the walls, tables in the angled corners),
// the long bar down its right-hand side with a wall of wine behind it, a side room of three long banqueting tables
// through a wide opening, a hall to the Ladies and the Gents, and the kitchen extended up so the restaurant has its
// own kitchen door next to the bar. Smarter than the pub (from the photos): white tablecloths, honey-wood dining
// chairs, folded napkins, wine glasses, amber candle glasses, brass chandeliers with yellow shades, wall sconces,
// green damask and sage panelling in the side room, a big gilt mirror, yellow floor lamps, wood floors and dark
// patterned carpet, tall windows with drapes.
import * as THREE from 'three';
import { part } from '../geo.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex, tileTex, streetViewTex } from './kit.js';
import { pottedPlant } from './outdoor.js';

const H = 3.0, T = 0.08;
export const REST_H = 4.2;          // the main dining room is taller than the rest of the building
const RH = REST_H;
// ---- the rooms (metres; the pub's restaurant entrance corridor is x -14.04..-9.72, z 2.04..5.16)
export const REST = {
  main: [[-26.26, -14.45], [-16.88, -14.45], [-13.8, -9.78], [-13.8, -8.88], [-13.8, 2.04], [-14.04, 5.16], [-17.6, 10.24], [-27.38, 10.24], [-29.2, 6.74], [-29.2, -10.9]],
  side: [[-39.0, -8.52], [-29.2, -8.52], [-29.2, 3.24], [-39.0, 3.24]],
  hall: [[-20.38, -14.45], [-16.74, -14.45], [-16.74, -19.72], [-23.94, -19.72], [-20.38, -16.22]],
  ladies: [[-23.94, -21.8], [-20.38, -21.8], [-20.38, -19.72], [-23.94, -19.72]],
  gents: [[-20.38, -23.8], [-16.74, -23.8], [-16.74, -19.72], [-20.38, -19.72]],
  kitchen: [[-16.88, -14.45], [-10.2, -14.45], [-10.2, -8.88], [-13.8, -8.88], [-13.8, -9.78]],
};
export const REST_BOUNDS = { x0: -39.4, z0: -24.2 };
const inPoly = (poly, x, z) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
export const inRestaurant = (x, z) => ['main', 'side', 'hall', 'ladies', 'gents'].some(n => inPoly(REST[n], x, z));
export const inNewArea = (x, z) => inRestaurant(x, z) || inPoly(REST.kitchen, x, z);

// ---- textures
function plankTex() {
  return canvasTex(512, 512, (g, w, h) => {
    const rows = 8, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = -((r * 173) % 300);
      while (x < w) {
        const len = 180 + ((r * 37 + x) % 140), sh = 0.86 + ((r * 13 + x * 7) % 23) / 100;
        g.fillStyle = `rgb(${Math.round(150 * sh)},${Math.round(100 * sh)},${Math.round(58 * sh)})`; g.fillRect(x, r * rh, len, rh);
        for (let i = 0; i < 7; i++) { g.strokeStyle = `rgba(70,40,15,${0.08 + (i % 3) * 0.04})`; g.lineWidth = 1; g.beginPath(); const y = r * rh + 6 + i * (rh - 12) / 6; g.moveTo(x, y); g.bezierCurveTo(x + len * 0.3, y + 3, x + len * 0.6, y - 3, x + len, y + 1); g.stroke(); }
        g.fillStyle = 'rgba(40,20,8,0.55)'; g.fillRect(x, r * rh, 2, rh);
        x += len;
      }
      g.fillStyle = 'rgba(40,20,8,0.5)'; g.fillRect(0, r * rh, w, 2);
    }
  });
}
function rugTex(base, fleck, motif) {      // dark patterned restaurant carpet (small repeating medallions)
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < 0.5 ? fleck : 'rgba(0,0,0,0.2)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) {
      const ox = (y / 32) % 2 ? 16 : 0;
      g.strokeStyle = motif; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x + ox + 16, y + 16, 7, 5, 0, 0, 7); g.stroke();
      g.fillStyle = motif; g.fillRect(x + ox + 15, y + 9, 2, 14); g.fillRect(x + ox + 9, y + 15, 14, 2);
    }
  });
}
function paperTex(base, ink, damask) {     // wallpaper: cream with a faint stripe, or green damask
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    if (!damask) { for (let x = 0; x < w; x += 32) { g.fillStyle = ink; g.fillRect(x, 0, 10, h); } return; }
    g.fillStyle = ink;
    for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 128) for (const [ox, oy] of [[64, 64], [0, 0], [128, 0], [0, 128], [128, 128]]) {
      const cx = x + ox, cy = y + oy;
      g.beginPath(); g.moveTo(cx, cy - 46);
      g.bezierCurveTo(cx + 22, cy - 30, cx + 34, cy - 8, cx + 14, cy + 6); g.bezierCurveTo(cx + 34, cy + 18, cx + 22, cy + 38, cx, cy + 50);
      g.bezierCurveTo(cx - 22, cy + 38, cx - 34, cy + 18, cx - 14, cy + 6); g.bezierCurveTo(cx - 34, cy - 8, cx - 22, cy - 30, cx, cy - 46); g.fill();
      g.save(); g.fillStyle = base; g.beginPath(); g.ellipse(cx, cy + 2, 7, 18, 0, 0, 7); g.fill(); g.restore();
      for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(cx + sd * 30, cy - 30, 9, 4, sd * 0.8, 0, 7); g.fill(); g.beginPath(); g.ellipse(cx + sd * 30, cy + 32, 9, 4, -sd * 0.8, 0, 7); g.fill(); }
    }
  });
}
function mirrorTex() {
  return canvasTex(256, 160, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#c9c1ad'); gr.addColorStop(0.45, '#efe9dc'); gr.addColorStop(1, '#a9a08b');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(80,60,40,0.35)'; for (let i = 0; i < 9; i++) g.fillRect(20 + i * 26, 60, 14, 70);       // the room reflected (vague)
    g.fillStyle = 'rgba(255,230,160,0.6)'; g.beginPath(); g.arc(128, 26, 12, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 5; for (const x of [40, 64, 190]) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 40, 0); g.stroke(); }
  });
}
function paintingTex(seed) {
  return canvasTex(192, 144, (g, w, h) => {
    const skies = [['#c9d8e0', '#efe2c4'], ['#e8c9a0', '#f4e6c8'], ['#a9bcc8', '#dfe6e0']][seed % 3];
    const gr = g.createLinearGradient(0, 0, 0, h * 0.6); gr.addColorStop(0, skies[0]); gr.addColorStop(1, skies[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = ['#5a6a3a', '#6a5a3a', '#4a5a4a'][seed % 3]; g.beginPath(); g.moveTo(0, h * 0.62); for (let x = 0; x <= w; x += 16) g.lineTo(x, h * (0.55 + 0.06 * Math.sin(x * 0.05 + seed))); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    if (seed % 3 === 0) { g.fillStyle = '#7a8a9a'; g.fillRect(0, h * 0.72, w, h * 0.1); g.fillStyle = '#f4f0e4'; g.beginPath(); g.moveTo(60, h * 0.72); g.lineTo(80, h * 0.4); g.lineTo(84, h * 0.72); g.fill(); }   // a sailing boat on the estuary
    if (seed % 3 === 1) { g.fillStyle = '#3a4a2a'; for (const x of [40, 120, 150]) { g.beginPath(); g.arc(x, h * 0.5, 18, 0, 7); g.fill(); g.fillRect(x - 3, h * 0.5, 6, 30); } }
    if (seed % 3 === 2) { g.fillStyle = '#8a6a4a'; g.fillRect(80, h * 0.45, 50, 30); g.fillStyle = '#6a3a2a'; g.beginPath(); g.moveTo(76, h * 0.45); g.lineTo(105, h * 0.3); g.lineTo(134, h * 0.45); g.fill(); }
    g.fillStyle = 'rgba(80,50,20,0.12)'; g.fillRect(0, 0, w, h);
  });
}

export function buildRestaurant(k, scene, { chairsAt = [] } = {}) {
  const P = (geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) => k.parts.push(part(geo, color, pos, rot, scl));
  const R = (x0, z0, x1, z1, h, y, color, opts) => k.box(Math.abs(x1 - x0), h, Math.abs(z1 - z0), (x0 + x1) / 2, y ?? h / 2, (z0 + z1) / 2, color, opts);
  const blk = (x0, z0, x1, z1, y1 = H) => k.blockers.push({ x0, x1, z0, z1, y1 });
  // a piece placed in a local frame: (lx, ly, lz) turned by ry about (x, z)
  const L = (geo, color, x, z, ry, lx, ly, lz, rx = 0, rz = 0, ry0 = 0) => { geo.rotateZ(rz); geo.rotateX(rx); geo.rotateY(ry0); geo.translate(lx, ly, lz); geo.rotateY(ry); geo.translate(x, 0, z); k.parts.push(part(geo, color)); };
  const tf = (x, z, ry, lx, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
  const glass = [];                 // every wine glass, tumbler and carafe: one see-through mesh at the end
  const G = (geo, x, y, z, ry = 0, rx = 0) => { let g = geo.index ? geo.toNonIndexed() : geo; g.deleteAttribute('uv'); g.rotateX(rx); g.rotateY(ry); g.translate(x, y, z); glass.push(g); };
  const wineGlassGeo = () => new THREE.LatheGeometry([[0, 0], [0.034, 0], [0.034, 0.003], [0.004, 0.008], [0.004, 0.09], [0.022, 0.105], [0.038, 0.14], [0.036, 0.185], [0.033, 0.19]].map(([a, b]) => new THREE.Vector2(a, b)), 10);
  const tumblerGeo = () => new THREE.LatheGeometry([[0, 0], [0.03, 0], [0.034, 0.1], [0.032, 0.1]].map(([a, b]) => new THREE.Vector2(a, b)), 10);
  const texMat = (tex) => { k.texMats = k.texMats || new Map(); if (!k.texMats.has(tex.uuid)) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; k.texMats.set(tex.uuid, new THREE.MeshLambertMaterial({ map: tex })); } return k.texMats.get(tex.uuid); };
  const texRot = (w, h, d, x, y, z, ry, tex, tile) => {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const q = f * 4 + i; uv.setXY(q, uv.getX(q) * dims[f][0] / tile, uv.getY(q) * dims[f][1] / tile); }
    const m = new THREE.Mesh(g, texMat(tex)); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); (k.texMeshes = k.texMeshes || []).push(m); return m;
  };

  // ---------------------------------------------------------------- textures and colours
  const PLANK = plankTex(), RUG = rugTex('#2a1a1e', '#4a2a30', '#8a6a3a'), RUG2 = rugTex('#1e2230', '#343a50', '#8a7a4a');
  const CREAM_PAPER = paperTex('#efe5cf', 'rgba(255,255,255,0.25)', false), DAMASK = paperTex('#7f8763', '#6b7352', true);
  const WTILE = tileTex('#f6f6f3', '#efefec', '#c9c9c4', 32), KTILE = tileTex('#ffffff', '#f2f2f2', '#c0c0c0', 32), QUARRY = tileTex('#a04a32', '#94442e', '#6a2e1e', 48);
  const RW = 0xf1e6cf, BRASS = 0xc9a24a, DARK = 0x3a2214, HONEY = [0xc98a48, 0xd29452, 0xc28244], CLOTH = 0xf7f6f0, SILVER = 0xc8ccd0, AMBER = 0xd2862a;

  // ---------------------------------------------------------------- floors
  const polyFloor = (poly, tex, y, rep) => {          // a floor cut exactly to a room's outline
    const sh = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z))), g = new THREE.ShapeGeometry(sh);
    const pos = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / rep, pos.getY(i) / rep);
    const t = tex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: t })); m.rotation.x = -Math.PI / 2; m.position.y = y; scene.add(m); return m; };
  polyFloor(REST.main, PLANK, 0.003, 2.0);                                       // oak boards all through the main room
  k.floor(-28.7, -13.7, -19.6, 9.65, RUG, 0.006, 1.4);                          // dark patterned carpet under the dining tables
  k.floor(-39.1, -8.62, -29.1, 3.34, PLANK, 0.004, 2.0);                        // the side room: boards round the edge...
  k.floor(-38.3, -7.7, -30.0, 2.45, RUG2, 0.007, 1.4);                          // ...carpet under the long tables
  k.floor(-24.0, -19.8, -16.7, -14.4, PLANK, 0.005, 2.0);                       // the hall to the toilets
  k.floor(-20.0, -19.0, -17.1, -14.6, RUG, 0.008, 1.4);                         // a runner
  k.floor(-24.0, -23.9, -16.7, -19.7, tileTex('#e2ddd4', '#d6d0c6', '#a8a196', 40), 0.006, 0.6);   // Ladies + Gents
  polyFloor(REST.kitchen, QUARRY, 0.004, 0.5);                                   // kitchen extension (red quarry tiles, like the kitchen)

  // ---------------------------------------------------------------- walls: an edge of a room, and its dressing
  const edge = (poly, i) => { const a = poly[i], b = poly[(i + 1) % poly.length], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
    let nx = -uz, nz = ux; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; if (!inPoly(poly, mx + nx * 0.3, mz + nz * 0.3)) { nx = -nx; nz = -nz; }
    return { ax: a[0], az: a[1], len, ux, uz, nx, nz, ry: Math.atan2(-uz, ux), at: (s, d = 0) => [a[0] + ux * s + nx * d, a[1] + uz * s + nz * d] }; };
  const axisX = (e) => Math.abs(e.uz) < 1e-3, axisZ = (e) => Math.abs(e.ux) < 1e-3;
  // a box lying along the edge, from s0 to s1, at depth d0..d0+dd in front of the wall line (towards the room)
  const slab = (e, s0, s1, y0, h, d0, dd, color, tex, tile = 1) => {
    const len = s1 - s0; if (len <= 0.002) return;
    const [cx, cz] = e.at((s0 + s1) / 2, d0 + dd / 2);
    if (axisX(e)) { if (tex) k.texBox(len, h, dd, cx, y0 + h / 2, cz, tex, { tile }); else k.box(len, h, dd, cx, y0 + h / 2, cz, color); }
    else if (axisZ(e)) { if (tex) k.texBox(dd, h, len, cx, y0 + h / 2, cz, tex, { tile }); else k.box(dd, h, len, cx, y0 + h / 2, cz, color); }
    else if (tex) texRot(len, h, dd, cx, y0 + h / 2, cz, e.ry, tex, tile);
    else k.box(len, h, dd, cx, y0 + h / 2, cz, color, { rot: [0, e.ry, 0] });
  };
  // the wall itself (0.16 thick on the line), with door gaps [s0, s1, top]; top < H leaves a lintel
  const wallBox = (e, s0, s1, y0, y1, color, ext0, ext1) => {
    const a = s0 - ext0, b = s1 + ext1, len = b - a, h = y1 - y0, [cx, cz] = e.at((a + b) / 2);
    if (axisX(e)) k.box(len, h, 2 * T, cx, y0 + h / 2, cz, color, { collide: true, block: y0 < 0.5 });
    else if (axisZ(e)) k.box(2 * T, h, len, cx, y0 + h / 2, cz, color, { collide: true, block: y0 < 0.5 });
    else { k.box(len, h, 2 * T, cx, y0 + h / 2, cz, color, { rot: [0, e.ry, 0] }); if (y0 < 0.5) for (let s = a; s <= b + 0.01; s += 0.16) { const [x, z] = e.at(Math.min(s, b)); blk(x - 0.1, z - 0.1, x + 0.1, z + 0.1, y1); } }
  };
  const wall = (e, gaps = [], color = RW, from = 0, to = e.len, TOPH = H) => {
    const gs = gaps.filter(g => g[1] > from && g[0] < to).sort((p, q) => p[0] - q[0]);
    let s = from;
    for (const [g0, g1, top] of gs) { if (g0 > s) wallBox(e, s, g0, 0, TOPH, color, s === 0 ? T : 0, 0); if (top != null && top < TOPH) wallBox(e, g0, g1, top, TOPH, color, 0, 0); s = g1;
      for (const sd of [g0, g1]) { const [x, z] = e.at(sd); if (axisX(e)) k.box(0.05, top ?? H, 2 * T + 0.03, x, (top ?? H) / 2, z, DARK); else if (axisZ(e)) k.box(2 * T + 0.03, top ?? H, 0.05, x, (top ?? H) / 2, z, DARK); else k.box(0.05, top ?? H, 2 * T + 0.03, x, (top ?? H) / 2, z, DARK, { rot: [0, e.ry, 0] }); } }
    if (to > s) wallBox(e, s, to, 0, TOPH, color, s === 0 ? T : 0, to === e.len ? T : 0);
  };
  // dress a wall face: style 'cream' (the dining room), 'green' (the side room), 'tile' (toilets), 'kitchen'
  const STY = {
    cream: { skirt: DARK, panel: 0xece2cc, mould: 0xf7f0e0, shadow: 0xd6caae, rail: 0xf6efe0, paper: CREAM_PAPER, picture: 0xb89a62, cornice: 0xf7f2e6 },
    green: { skirt: 0x2a1a10, panel: 0x9ea486, mould: 0xb3b898, shadow: 0x80866b, rail: 0xb3b898, paper: DAMASK, picture: null, cornice: 0xf2ede0 },
  };
  const dress = (e, style, gaps = [], from = 0, to = e.len, TOPH = H) => {
    const runs = []; let s = from;
    for (const [g0, g1] of gaps.filter(g => g[1] > from && g[0] < to).sort((p, q) => p[0] - q[0])) { if (g0 > s) runs.push([s, g0]); s = Math.max(s, g1); }
    if (to > s) runs.push([s, to]);
    for (const [a, b] of runs) {
      if (style === 'tile') { slab(e, a, b, 0, 1.5, T, 0.012, 0, WTILE, 0.5); slab(e, a, b, 1.5, 0.04, T, 0.025, 0xd8d8d4); slab(e, a, b, 1.54, H - 1.6, T, 0.004, 0xf4efe6); slab(e, a, b, H - 0.1, 0.1, T, 0.05, 0xf7f2e6); continue; }
      if (style === 'kitchen') { slab(e, a, b, 0, 1.8, T, 0.012, 0, KTILE, 0.3); slab(e, a, b, 0, 0.1, T, 0.03, 0x9aa0a8); slab(e, a, b, 1.8, H - 1.8, T, 0.004, 0xf4f4f0); continue; }
      const st = STY[style];
      slab(e, a, b, 0, 0.18, T, 0.025, st.skirt);                                                   // skirting
      slab(e, a, b, 0.18, 0.74, T, 0.01, st.panel);                                                 // panelled dado
      const np = Math.max(1, Math.round((b - a) / 0.85)), pw = (b - a) / np;
      for (let i = 0; i < np; i++) { const p0 = a + i * pw + 0.07, p1 = a + (i + 1) * pw - 0.07; if (p1 - p0 < 0.15) continue;
        slab(e, p0, p1, 0.27, 0.025, T + 0.01, 0.014, st.mould); slab(e, p0, p1, 0.8, 0.025, T + 0.01, 0.014, st.mould);
        slab(e, p0, p0 + 0.025, 0.27, 0.555, T + 0.01, 0.014, st.mould); slab(e, p1 - 0.025, p1, 0.27, 0.555, T + 0.01, 0.014, st.mould);
        slab(e, p0 + 0.025, p1 - 0.025, 0.295, 0.008, T + 0.01, 0.006, st.shadow); }
      slab(e, a, b, 0.92, 0.05, T, 0.04, st.rail); slab(e, a, b, 0.97, 0.015, T, 0.025, st.rail);   // dado rail
      slab(e, a, b, 0.985, TOPH - 1.13, T, 0.004, 0, st.paper, style === 'green' ? 0.55 : 0.6);        // wallpaper
      if (st.picture) slab(e, a, b, 2.5, 0.03, T, 0.022, st.picture);                               // picture rail
      slab(e, a, b, TOPH - 0.16, 0.07, T, 0.05, st.cornice); slab(e, a, b, TOPH - 0.09, 0.09, T, 0.09, st.cornice); if (TOPH > H) { slab(e, a, b, TOPH - 0.3, 0.05, T, 0.03, st.cornice); slab(e, a, b, 2.9, 0.035, T, 0.02, st.picture || st.cornice); }   // cornice
    }
    // architraves round the doorways
    for (const [g0, g1, top] of gaps) { if (top == null || g1 < from || g0 > to) continue; const c = style === 'tile' || style === 'kitchen' ? 0xf4f2ec : DARK;
      slab(e, g0 - 0.09, g0, 0, top + 0.09, T, 0.03, c); slab(e, g1, g1 + 0.09, 0, top + 0.09, T, 0.03, c); slab(e, g0 - 0.09, g1 + 0.09, top, 0.09, T, 0.03, c); }
  };

  // ---- the main dining room
  const M = REST.main, me = M.map((_, i) => edge(M, i));
  // 0 top (door to the toilets), 1 angled (kitchen door), 2 short wall by the kitchen, 3 behind the bar (the kitchen's own wall),
  // 4 open to the entrance corridor, 5 angled, 6 bottom (windows), 7 angled, 8 left (opening to the side room), 9 angled
  const HALLDOOR = [7.6, 9.1, 2.45], KDOOR = [2.86, 3.86, 2.2], SIDEOPEN = [6.44, 11.48, 2.6];
  for (const [i, g] of [[0, [HALLDOOR]], [1, [KDOOR]], [2, []], [5, []], [6, []], [7, []], [8, [SIDEOPEN]], [9, []]]) wall(me[i], g, RW, 0, me[i].len, RH);
  for (const [i, g] of [[0, [HALLDOOR]], [1, [KDOOR]], [2, []], [3, []], [5, []], [6, []], [7, []], [8, [SIDEOPEN]], [9, []]]) dress(me[i], 'cream', g, 0, me[i].len, RH);
  // the pub's walls only go to 3m: carry the kitchen wall behind the bar, and the wall over the way in, up to the high ceiling
  R(-13.88, -9.78, -13.72, 2.04, RH - H, (H + RH) / 2, RW); R(-14.06, 2.0, -13.76, 5.2, RH - H, (H + RH) / 2, RW);
  { const e4 = edge([[-14.0, 5.16], [-14.0, 2.04], [-15.0, 2.04], [-15.0, 5.16]], 0); slab(e4, 0, 3.12, H, RH - H - 0.16, 0.065, 0.004, 0, CREAM_PAPER, 0.6); slab(e4, 0, 3.12, RH - 0.16, 0.07, 0.065, 0.05, 0xf7f2e6); slab(e4, 0, 3.12, RH - 0.09, 0.09, 0.065, 0.09, 0xf7f2e6); }
  // the high ceiling of the dining room: a flat plaster ceiling cut to the room, with a deep cove round it
  { const sh = new THREE.Shape(M.map(([x, z]) => new THREE.Vector2(x, z))), g = new THREE.ShapeGeometry(sh); g.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0xf7f3ea, emissive: 0xbdb5a2 })); m.position.y = RH; scene.add(m); }
  // the bar's end wall (closing off behind the bar at the top), dressed both sides
  { const e1 = edge([[-17.58, -7.54], [-13.8, -7.54], [-13.8, -9.0], [-17.58, -9.0]], 0), e2 = edge([[-13.8, -7.54], [-17.58, -7.54], [-17.58, -6.0], [-13.8, -6.0]], 0); wall(e1, [], RW, 0, e1.len, RH); dress(e1, 'cream', [], 0, e1.len, RH); dress(e2, 'cream', [], 0, e2.len, RH); }

  // ---- the side room (through the wide opening on the left)
  const SD = REST.side, se = SD.map((_, i) => edge(SD, i));
  wall(se[0]); wall(se[2]); wall(se[3]);
  dress(se[0], 'green'); dress(se[1], 'green', [[2.94, 7.98, 2.6]]); dress(se[2], 'green'); dress(se[3], 'green');
  // the grand opening between them: fluted cream pilasters, a moulded head
  for (const z of [0.3, -4.74]) for (const sx of [-1, 1]) { const x = -29.2 + sx * 0.13, zz = z + (z > -2 ? 0.14 : -0.14);
    k.box(0.1, 2.6, 0.32, x, 1.3, zz, 0xf3ecdc); k.box(0.12, 0.2, 0.36, x, 0.1, zz, 0xe8dfca); k.box(0.12, 0.14, 0.38, x, 2.55, zz, 0xf7f2e6);
    for (let i = -1; i <= 1; i++) k.box(0.104, 2.1, 0.02, x, 1.35, zz + i * 0.08, 0xe2d8c2); }
  for (const sx of [-1, 1]) { k.box(0.06, 0.24, 5.4, -29.2 + sx * 0.12, 2.72, -2.22, 0xf7f2e6); k.box(0.03, 0.06, 5.4, -29.2 + sx * 0.15, 2.62, -2.22, BRASS); }

  // ---- the hall, the Ladies and the Gents
  const HL = REST.hall, he = HL.map((_, i) => edge(HL, i));
  const GENTSDOOR = [0.72, 1.62, 2.15], LADIESDOOR = [4.2, 5.1, 2.15];
  wall(he[1]); wall(he[2], [GENTSDOOR, LADIESDOOR]); wall(he[3]); wall(he[4]);
  dress(he[0], 'cream', [[1.72, 3.22, 2.45]]); dress(he[1], 'cream'); dress(he[2], 'cream', [GENTSDOOR, LADIESDOOR]); dress(he[3], 'cream'); dress(he[4], 'cream');
  const LD = REST.ladies, le = LD.map((_, i) => edge(LD, i)), GT = REST.gents, ge = GT.map((_, i) => edge(GT, i));
  wall(le[0]); wall(le[3]); wall(ge[0]); wall(ge[1]); wall(ge[3]);
  dress(le[0], 'tile'); dress(le[1], 'tile'); dress(le[2], 'tile', [[0.56, 1.46, 2.15]]); dress(le[3], 'tile');
  dress(ge[0], 'tile'); dress(ge[1], 'tile'); dress(ge[2], 'tile', [[0.72, 1.62, 2.15]]); dress(ge[3], 'tile');

  // ---- the kitchen extension
  const KX = REST.kitchen, ke = KX.map((_, i) => edge(KX, i));
  wall(ke[0]); wall(ke[1], [], RW, 2.21, ke[1].len);
  const KDOOR_K = [ke[4].len - KDOOR[1], ke[4].len - KDOOR[0], 2.2];
  dress(ke[0], 'kitchen'); dress(ke[1], 'kitchen'); dress(ke[2], 'kitchen', [[0.77, 1.92, 2.2]]); dress(ke[3], 'kitchen'); dress(ke[4], 'kitchen', [KDOOR_K]);

  // ---------------------------------------------------------------- the dining chairs (honey wood, curved top rail, slatted back)
  let cn = 0;
  const chair = (x, z, ry) => {
    const C = HONEY[cn++ % 3];
    L(new RoundedBoxGeometry(0.44, 0.045, 0.43, 1, 0.014), C, x, z, ry, 0, 0.465, 0);
    for (const sx of [-1, 1]) L(new THREE.BoxGeometry(0.04, 0.45, 0.04), C, x, z, ry, sx * 0.19, 0.225, -0.18, -0.03);                     // front legs
    for (const sx of [-1, 1]) L(new THREE.BoxGeometry(0.04, 0.98, 0.042), C, x, z, ry, sx * 0.19, 0.48, 0.19, 0.07);                       // back legs, raked
    for (const sx of [-1, 1]) L(new THREE.BoxGeometry(0.022, 0.022, 0.36), C, x, z, ry, sx * 0.19, 0.17, 0.0);                             // side stretchers
    L(new THREE.BoxGeometry(0.36, 0.022, 0.022), C, x, z, ry, 0, 0.13, 0.0);
    L(new THREE.BoxGeometry(0.36, 0.06, 0.03), C, x, z, ry, 0, 0.42, -0.19);                                                                 // seat rail
    { const g = new THREE.BoxGeometry(0.44, 0.075, 0.03, 6, 1, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const t = p.getX(i) / 0.22; p.setZ(i, p.getZ(i) + 0.035 * t * t); } g.computeVertexNormals(); L(g, C, x, z, ry, 0, 0.93, 0.245, 0.07); }   // curved top rail
    L(new THREE.BoxGeometry(0.38, 0.03, 0.025), C, x, z, ry, 0, 0.6, 0.225, 0.07);
    for (const t of [-0.12, -0.04, 0.04, 0.12]) L(new THREE.BoxGeometry(0.045, 0.3, 0.014), C, x, z, ry, t, 0.755, 0.235 + Math.abs(t) * 0.04, 0.07);   // slats
    k.blockers.push({ x0: x - 0.24, x1: x + 0.24, z0: z - 0.24, z1: z + 0.24, y1: 0.5 }); chairsAt.push([x, z, ry]);
  };
  // ---------------------------------------------------------------- a laid place: plate, folded napkin, knife, fork, spoon, wine glass, water glass
  const setting = (px, pz, fx, fz, y) => {
    const rx = -fz, rz = fx, a = Math.atan2(-fz, fx);
    P(new THREE.CylinderGeometry(0.135, 0.12, 0.012, 22), 0xffffff, [px, y + 0.006, pz]); P(new THREE.CylinderGeometry(0.1, 0.1, 0.002, 22), 0xf2f0ea, [px, y + 0.0125, pz]);
    P(new THREE.BoxGeometry(0.11, 0.016, 0.19), 0xfdfdfb, [px, y + 0.021, pz], [0, a, 0]); P(new THREE.BoxGeometry(0.11, 0.004, 0.02), 0xe8e6e0, [px, y + 0.03, pz], [0, a, 0]);   // folded napkin
    P(new THREE.BoxGeometry(0.018, 0.004, 0.2), SILVER, [px - rx * 0.17, y + 0.002, pz - rz * 0.17], [0, a, 0]);                    // fork
    P(new THREE.BoxGeometry(0.016, 0.004, 0.21), SILVER, [px + rx * 0.17, y + 0.002, pz + rz * 0.17], [0, a, 0]);                  // knife
    P(new THREE.BoxGeometry(0.17, 0.004, 0.016), SILVER, [px + fx * 0.17, y + 0.002, pz + fz * 0.17], [0, a, 0]);                   // dessert spoon
    G(wineGlassGeo(), px + rx * 0.13 + fx * 0.22, y, pz + rz * 0.13 + fz * 0.22); G(tumblerGeo(), px + rx * 0.03 + fx * 0.26, y, pz + rz * 0.03 + fz * 0.26);
  };
  const votive = (x, y, z) => { P(new THREE.CylinderGeometry(0.035, 0.032, 0.075, 12), AMBER, [x, y + 0.038, z]); k.lamp(x, y + 0.06, z, 0xffb050, 0.016); };
  const spawnsOn = [];
  // ---------------------------------------------------------------- a dressed table: white cloth to the knees, places laid, candles
  const TY = 0.77;
  const clothTable = (x, z, w, d, ry, perSide, ends = false) => {
    L(new THREE.BoxGeometry(w, 0.03, d), CLOTH, x, z, ry, 0, TY - 0.015, 0);
    for (const sd of [-1, 1]) { L(new THREE.BoxGeometry(w + 0.02, 0.3, 0.006), 0xf1f0ea, x, z, ry, 0, TY - 0.15, sd * (d / 2 + 0.005)); L(new THREE.BoxGeometry(0.006, 0.3, d + 0.02), 0xf1f0ea, x, z, ry, sd * (w / 2 + 0.005), TY - 0.15, 0); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { L(new THREE.BoxGeometry(0.05, 0.3, 0.05), 0xf6f5ef, x, z, ry, sx * (w / 2 + 0.01), TY - 0.16, sz * (d / 2 + 0.01), 0, 0, Math.PI / 4); L(new THREE.BoxGeometry(0.055, 0.47, 0.055), 0x4a2a16, x, z, ry, sx * (w / 2 - 0.1), 0.235, sz * (d / 2 - 0.1)); }   // corner folds, legs
    k.colliders.push({ min: new THREE.Vector3(x - Math.max(w, d) / 2, TY - 0.05, z - Math.max(w, d) / 2), max: new THREE.Vector3(x + Math.max(w, d) / 2, TY, z + Math.max(w, d) / 2) });
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry)), hx = c * w / 2 + s * d / 2, hz = s * w / 2 + c * d / 2;
    k.blockers.push({ x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz, y1: TY });
    const seats = [];
    for (let i = 0; i < perSide; i++) { const t = (i + 0.5) / perSide - 0.5; for (const sd of [-1, 1]) seats.push([t * w, sd * (d / 2 + 0.34), 0, -sd]); }
    if (ends) for (const sd of [-1, 1]) seats.push([sd * (w / 2 + 0.34), 0, -sd, 0]);
    for (const [lx, lz, fx, fz] of seats) {
      const [cx, cz] = tf(x, z, ry, lx, lz); chair(cx, cz, Math.atan2(cx - x, cz - z));
      const [px, pz] = tf(x, z, ry, lx + fx * 0.5, lz + fz * 0.5), wf = [fx * Math.cos(ry) + fz * Math.sin(ry), -fx * Math.sin(ry) + fz * Math.cos(ry)];
      setting(px, pz, wf[0], wf[1], TY);
    }
    const nv = Math.max(1, Math.round(w / 0.75));
    for (let i = 0; i < nv; i++) { const t = nv === 1 ? 0 : (i / (nv - 1) - 0.5) * (w - 0.5); const [vx, vz] = tf(x, z, ry, t, 0); votive(vx, TY, vz); if (i % 2 === 0) { const [sx, sz] = tf(x, z, ry, t + 0.12, 0.05); P(new THREE.CylinderGeometry(0.014, 0.016, 0.07, 8), 0xf4f4f4, [sx, TY + 0.035, sz]); P(new THREE.CylinderGeometry(0.014, 0.016, 0.07, 8), 0x3a3a3a, [sx + 0.04, TY + 0.035, sz]); } }
    { const [bx, bz] = tf(x, z, ry, w > 1.6 ? 0.35 : 0.25, -0.02); G(new THREE.LatheGeometry([[0, 0], [0.05, 0], [0.055, 0.1], [0.03, 0.2], [0.022, 0.26], [0.024, 0.27]].map(([a, b]) => new THREE.Vector2(a, b)), 12), bx, TY, bz);   // a water carafe
      P(new THREE.CylinderGeometry(0.045, 0.048, 0.1, 12), 0xe6eef0, [bx, TY + 0.05, bz]); }
    k.pool(x, TY, z, Math.max(w, d) + 0.6, 0xffd090);
    spawnsOn.push([x, z]);
  };
  const roundTable = (x, z, r, n) => {
    P(new THREE.CylinderGeometry(r, r, 0.03, 40), CLOTH, [x, TY - 0.015, z]); P(new THREE.CylinderGeometry(r + 0.008, r + 0.06, 0.34, 40, 1, true), 0xf1f0ea, [x, TY - 0.17, z]);
    P(new THREE.CylinderGeometry(0.06, 0.08, TY - 0.34, 12), 0x4a2a16, [x, (TY - 0.34) / 2, z]); P(new THREE.CylinderGeometry(0.32, 0.36, 0.04, 20), 0x4a2a16, [x, 0.02, z]);
    k.colliders.push({ min: new THREE.Vector3(x - r * 0.75, TY - 0.05, z - r * 0.75), max: new THREE.Vector3(x + r * 0.75, TY, z + r * 0.75) });
    k.blockers.push({ x0: x - r, x1: x + r, z0: z - r, z1: z + r, y1: TY });
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + 0.3, sx = Math.sin(a), sz = Math.cos(a); chair(x + sx * (r + 0.34), z + sz * (r + 0.34), a); setting(x + sx * (r - 0.2), z + sz * (r - 0.2), -sx, -sz, TY); }
    votive(x - 0.1, TY, z); votive(x + 0.1, TY, z + 0.06); votive(x, TY, z - 0.12);
    P(new THREE.CylinderGeometry(0.04, 0.03, 0.18, 12), 0xe8f0f2, [x, TY + 0.09, z + 0.02]);                                    // bud vase with roses
    for (let i = 0; i < 3; i++) { P(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 4), 0x3a6a2a, [x + (i - 1) * 0.02, TY + 0.25, z + 0.02]); P(new THREE.SphereGeometry(0.025, 8, 6), [0xc8202a, 0xe85a6a, 0xf4f0e0][i], [x + (i - 1) * 0.025, TY + 0.36, z + 0.02]); }
    k.pool(x, TY, z, r * 2 + 0.8, 0xffd090); spawnsOn.push([x, z]);
  };

  // ---------------------------------------------------------------- the tables, as on the plan
  const along = (e) => e.ry;                       // a table lined up with an angled wall
  clothTable(-26.85, -11.25, 1.5, 0.9, along(me[9]), 2);                     // top-left corner, along the angled wall
  roundTable(-22.2, -11.5, 0.8, 7);                                            // the round table
  clothTable(-27.0, -7.1, 1.5, 0.9, 0, 2);                                     // along the left wall
  clothTable(-23.0, -7.6, 1.9, 0.95, 0, 3);                                    // down the middle...
  clothTable(-23.0, -3.9, 2.6, 1.05, 0, 4, true);                              // ...the big one...
  clothTable(-23.0, 0.5, 1.9, 0.95, 0, 3);                                     // ...and another
  clothTable(-27.0, 3.3, 1.5, 0.9, 0, 2);                                      // along the left wall
  clothTable(-26.7, 7.0, 1.5, 0.9, along(me[7]), 2);                           // bottom-left corner, along the angled wall
  clothTable(-24.3, 8.35, 0.9, 1.5, 0, 0); { /* chairs for the two long-ways tables are laid by perSide on their long sides */ }
  clothTable(-21.0, 8.35, 0.9, 1.5, 0, 0);
  for (const tx of [-24.3, -21.0]) for (const [lz, sd] of [[-0.35, 1], [0.35, 1], [-0.35, -1], [0.35, -1]]) { const cx = tx + sd * 0.79, cz = 8.35 + lz; chair(cx, cz, Math.atan2(cx - tx, 0)); setting(tx + sd * 0.29, cz, -sd, 0, TY); }
  clothTable(-16.95, 6.5, 1.5, 0.9, along(me[5]), 2);                          // bottom-right corner, along the angled wall

  // ---------------------------------------------------------------- the side room: three long banqueting tables
  for (const z of [-5.6, -2.4, 0.8]) clothTable(-34.1, z, 6.2, 1.0, 0, 9, true);

  // ---------------------------------------------------------------- brass chandeliers with yellow drum shades (like the photo)
  const chandelier = (x, z, arms = 5, drop = 0.75, TOPH = H) => {
    const y = TOPH - drop; rose(x, z, TOPH);
    k.cyl(0.006, 0.006, drop - 0.12, x, TOPH - (drop - 0.12) / 2, z, 0x6a5a3a, 4); k.cyl(0.05, 0.03, 0.04, x, TOPH - 0.02, z, BRASS, 12);
    P(new THREE.SphereGeometry(0.045, 12, 8), BRASS, [x, y, z], [0, 0, 0], [1, 1.3, 1]); k.cyl(0.015, 0.015, 0.2, x, y + 0.13, z, BRASS, 8); P(new THREE.SphereGeometry(0.02, 8, 6), BRASS, [x, y - 0.07, z]);
    for (let i = 0; i < arms; i++) {
      const a = i / arms * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const arc = new THREE.TorusGeometry(0.13, 0.009, 5, 10, Math.PI); arc.rotateX(Math.PI); arc.rotateY(-a); P(arc, BRASS, [x + ca * 0.13, y - 0.02, z + sa * 0.13]);
      const ex = x + ca * 0.27, ez = z + sa * 0.27;
      k.cyl(0.022, 0.015, 0.03, ex, y - 0.01, ez, BRASS, 10); k.cyl(0.009, 0.009, 0.07, ex, y + 0.04, ez, 0xf5f0dc, 6);
      P(new THREE.CylinderGeometry(0.05, 0.075, 0.1, 16, 1, true), 0xf2c55a, [ex, y + 0.11, ez]); P(new THREE.CylinderGeometry(0.052, 0.077, 0.012, 16, 1, true), BRASS, [ex, y + 0.06, ez]);
      k.lamp(ex, y + 0.08, ez, 0xffd27a, 0.035);
    }
    k.pool(x, 0.01, z, 3.4, 0xffc070);
  };
  const spanAt = (poly, z) => { const xs = []; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z)) xs.push(xi + (z - zi) * (xj - xi) / (zj - zi)); } return [Math.min(...xs), Math.max(...xs)]; };
  for (let z = -12.0; z < 10; z += 3.0) { const [x0, x1] = spanAt(M, z), a0 = x0 + 0.06, a1 = x1 - 0.06;          // cream beams right across the room, wall to wall
    R(a0, z - 0.14, a1, z + 0.14, 0.26, RH - 0.13, 0xf4efe4); R(a0, z - 0.17, a1, z + 0.17, 0.04, RH - 0.25, 0xf7f2e6); }
  for (let x = -38.0; x < -29.5; x += 3.0) R(x - 0.11, -8.44, x + 0.11, 3.16, 0.16, H - 0.08, 0xf4efe4);
  const rose = (x, z, TOPH = H) => { P(new THREE.CylinderGeometry(0.36, 0.4, 0.03, 28), 0xf7f2e6, [x, TOPH - 0.015, z]); P(new THREE.TorusGeometry(0.3, 0.025, 6, 28), 0xf0e8d6, [x, TOPH - 0.035, z], [Math.PI / 2, 0, 0]); P(new THREE.CylinderGeometry(0.12, 0.16, 0.05, 20), 0xf7f2e6, [x, TOPH - 0.055, z]); };
  for (const [x, z] of [[-22.2, -11.5], [-26.8, -11.2], [-23.0, -7.6], [-23.0, -3.9], [-23.0, 0.5], [-27.0, -7.1], [-27.0, 3.3], [-26.6, 7.0], [-22.7, 8.35], [-17.0, 6.5]]) chandelier(x, z, 6, 1.55, RH);
  for (const x of [-36.4, -34.1, -31.8]) for (const z of [-5.6, -2.4, 0.8]) chandelier(x, z, 5, 0.7);
  // wall sconces: a brass back plate, two curving arms, little cream shades
  const sconce = (e, s, y = 1.85, shade = 0xf3e2b8) => {
    const [x, z] = e.at(s, T + 0.01), ry = Math.atan2(e.nx, e.nz);
    L(new THREE.BoxGeometry(0.07, 0.16, 0.015), BRASS, x, z, ry, 0, y, 0.008);
    for (const sd of [-1, 1]) { L(new THREE.BoxGeometry(0.012, 0.012, 0.13), BRASS, x, z, ry, sd * 0.06, y - 0.02, 0.07, 0, sd * 0.5); L(new THREE.CylinderGeometry(0.045, 0.06, 0.09, 14, 1, true), shade, x, z, ry, sd * 0.11, y + 0.1, 0.13); L(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6), 0xf5f0dc, x, z, ry, sd * 0.11, y + 0.04, 0.13);
      const [lx, lz] = tf(x, z, ry, sd * 0.11, 0.13); k.lamp(lx, y + 0.08, lz, 0xffd8a0, 0.03); }
    const [gx, gz] = e.at(s, T + 0.3); k.pool(gx, 0.01, gz, 1.3, 0xffd8a0);
  };
  // gilt-framed oil paintings
  let pn = 0;
  const painting = (e, s, w = 0.9, h = 0.65, y = 1.75) => {
    const [x, z] = e.at(s, T), ry = Math.atan2(e.nx, e.nz);
    L(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.045), 0xb8923a, x, z, ry, 0, y, 0.0225); L(new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.05), 0x8a6a2a, x, z, ry, 0, y, 0.025);
    k.label('painting', w, h, [x + e.nx * 0.052, y, z + e.nz * 0.052], [0, ry, 0], { tex: paintingTex(pn++) });
    const [lx, lz] = tf(x, z, ry, 0, 0.12); k.lamp(lx, y + h / 2 + 0.12, lz, 0xffe0a8, 0.025, false); L(new THREE.BoxGeometry(0.26, 0.025, 0.12), BRASS, x, z, ry, 0, y + h / 2 + 0.1, 0.06);
  };
  // tall windows with heavy drapes (street outside)
  let wn = 0;
  const tallWindow = (e, s, w = 1.25, hgt = 2.0, cy = 1.4) => { const [x, z] = e.at(s, 0.1), ry = Math.atan2(e.nx, e.nz); k.window(x, cy, z, w, hgt, ry, streetViewTex(20 + wn++), { frame: 0xf4efe4, bars: 2, curtains: 0x5a1820 });
    const [vx, vz] = e.at(s, T + 0.03); const py = cy + hgt / 2 + 0.22; L(new THREE.BoxGeometry(w + 1.1, 0.32, 0.08), 0x5a1820, vx, vz, ry, 0, py, 0.06); L(new THREE.BoxGeometry(w + 1.1, 0.04, 0.09), 0xc9a24a, vx, vz, ry, 0, py - 0.15, 0.065); };   // pelmet with a gold trim

  // main room walls: windows, sconces, paintings
  for (const s of [1.6, 4.9, 8.2]) tallWindow(me[6], s, 1.3, 2.6, 1.65);
  for (const s of [0.0, 3.25, 6.55, 9.78]) if (s > 0.3 && s < me[6].len - 0.3) sconce(me[6], s);
  painting(me[5], me[5].len / 2, 1.0, 0.75); sconce(me[5], 1.2); sconce(me[5], me[5].len - 1.2);
  painting(me[7], me[7].len / 2, 0.8, 0.6);
  tallWindow(me[8], 1.75, 1.15, 2.6, 1.65); tallWindow(me[8], 16.45, 1.15, 2.6, 1.65);
  painting(me[8], 4.9, 0.8, 0.6); painting(me[8], 13.3, 0.8, 0.6); sconce(me[8], 3.7); sconce(me[8], 6.1); sconce(me[8], 12.1); sconce(me[8], 14.5);
  painting(me[0], 2.0, 1.2, 0.8); painting(me[0], 5.2, 1.2, 0.8); sconce(me[0], 0.9); sconce(me[0], 3.6); sconce(me[0], 6.6);
  painting(me[9], me[9].len / 2, 0.8, 0.6); sconce(me[1], 1.4); painting(me[1], 4.8, 0.6, 0.5);
  // ---- the side room: the big gilt mirror on the end wall between sconces, sconces down both sides, two yellow floor lamps, a sideboard
  { const e = se[3], s = e.len / 2, [x, z] = e.at(s, T), ry = Math.atan2(e.nx, e.nz);
    L(new THREE.BoxGeometry(2.0, 1.25, 0.06), 0xc9a24a, x, z, ry, 0, 1.75, 0.03); L(new THREE.BoxGeometry(1.86, 1.11, 0.07), 0x9a7a32, x, z, ry, 0, 1.75, 0.035);
    for (const [ox, oy] of [[-0.95, 0.6], [0.95, 0.6], [-0.95, -0.6], [0.95, -0.6]]) L(new THREE.SphereGeometry(0.06, 8, 6), 0xd4af37, x, z, ry, ox, 1.75 + oy, 0.05);   // carved corners
    L(new THREE.BoxGeometry(0.4, 0.14, 0.05), 0xd4af37, x, z, ry, 0, 2.43, 0.04);
    k.label('mirror', 1.76, 1.02, [x + e.nx * 0.072, 1.75, z + e.nz * 0.072], [0, ry, 0], { tex: mirrorTex() });
    sconce(e, s - 1.65, 1.95, 0xd8742a); sconce(e, s + 1.65, 1.95, 0xd8742a); }
  for (const s of [1.2, 3.5, 6.3, 8.6]) sconce(se[0], s, 1.9, 0xd8742a);
  for (const s of [1.2, 4.9, 8.6]) sconce(se[2], s, 1.9, 0xd8742a);
  tallWindow(se[2], 3.05, 1.1); tallWindow(se[2], 6.75, 1.1);
  for (const [x, z] of [[-38.5, 2.7], [-29.75, -8.0]]) {                       // yellow floor lamps on brass stands
    k.cyl(0.14, 0.16, 0.03, x, 0.015, z, BRASS, 16); k.cyl(0.012, 0.012, 1.45, x, 0.74, z, BRASS, 8);
    P(new THREE.CylinderGeometry(0.17, 0.24, 0.3, 20, 1, true), 0xf2c23a, [x, 1.6, z]); P(new THREE.CylinderGeometry(0.172, 0.172, 0.01, 20, 1, true), 0xd8a82a, [x, 1.75, z]);
    k.lamp(x, 1.55, z, 0xffd27a, 0.08); k.pool(x, 0.01, z, 1.6, 0xffd070); blk(x - 0.18, z - 0.18, x + 0.18, z + 0.18, 1.8); }
  { const x0 = -35.6, x1 = -32.6, z0 = -8.44, z1 = -7.92;                          // the sideboard: drawers, cupboards, plates, napkins, glasses
    R(x0, z0, x1, z1, 0.86, 0.43, 0x4a2412, { collide: true, block: true }); R(x0 - 0.02, z0, x1 + 0.02, z1 + 0.02, 0.03, 0.875, 0x3a1a0c, { collide: true });
    for (let i = 0; i < 3; i++) { const cx = x0 + 0.5 + i * 1.0; R(cx - 0.45, z1, cx + 0.45, z1 + 0.01, 0.16, 0.73, 0x5a2e18); k.box(0.12, 0.02, 0.02, cx, 0.73, z1 + 0.02, BRASS); R(cx - 0.45, z1, cx + 0.45, z1 + 0.01, 0.5, 0.36, 0x5a2e18); k.box(0.02, 0.1, 0.02, cx + 0.38, 0.4, z1 + 0.02, BRASS); }
    for (let i = 0; i < 10; i++) P(new THREE.CylinderGeometry(0.13, 0.12, 0.012, 20), 0xffffff, [x0 + 0.4, 0.895 + i * 0.013, (z0 + z1) / 2]);
    for (let i = 0; i < 6; i++) P(new THREE.BoxGeometry(0.2, 0.02, 0.2), 0xfdfdfb, [x0 + 1.0, 0.9 + i * 0.022, (z0 + z1) / 2]);
    for (let i = 0; i < 12; i++) G(wineGlassGeo(), x1 - 0.9 + (i % 4) * 0.09, 0.89, z0 + 0.13 + Math.floor(i / 4) * 0.1);
    P(new THREE.CylinderGeometry(0.1, 0.08, 0.22, 16), 0xb8bcc0, [x1 - 0.25, 1.0, (z0 + z1) / 2]); for (let i = 0; i < 2; i++) P(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 10), [0x3a0a10, 0xe8d890][i], [x1 - 0.28 + i * 0.06, 1.08, (z0 + z1) / 2]);   // wine in an ice bucket
    k.spawns.push(new THREE.Vector3(x0 + 1.6, 0.95, (z0 + z1) / 2)); }

  // ---------------------------------------------------------------- the bar down the right-hand side, the wall of wine behind it
  { const fx = -17.5, bx = -16.85, z0 = -7.46, z1 = 2.12, TOPY = 1.08, MAH = 0x4a2010, MAHL = 0x5e2c16, MAHD = 0x2e1408;
    // the counter: panelled mahogany front, a polished top, brass foot rail; a return at the bottom end
    R(fx, z0, bx, z1 - 0.6, TOPY - 0.05, (TOPY - 0.05) / 2, MAH, { collide: true, block: true });
    R(fx, z1 - 0.6, -15.6, z1, TOPY - 0.05, (TOPY - 0.05) / 2, MAH, { collide: true, block: true });
    R(fx - 0.06, z0 - 0.04, bx + 0.02, z1 - 0.6, 0.05, TOPY - 0.025, MAHD, { collide: true }); R(fx - 0.06, z1 - 0.66, -15.58, z1 + 0.06, 0.05, TOPY - 0.025, MAHD, { collide: true });
    const fe = edge([[fx, z1 - 0.6], [fx, z0], [fx - 1, z0], [fx - 1, z1 - 0.6]], 0);     // its front face (facing the room)
    for (let s = 0.15; s < fe.len - 0.2; s += 0.62) { const s1 = Math.min(s + 0.5, fe.len - 0.1); slab(fe, s, s1, 0.22, 0.66, -0.0, 0.02, MAHL); slab(fe, s + 0.04, s1 - 0.04, 0.26, 0.58, 0.02, 0.012, MAH); slab(fe, s, s1, 0.88, 0.02, 0.02, 0.01, 0xc48a4a); }
    slab(fe, 0, fe.len, 0, 0.12, 0, 0.03, MAHD);
    { const g = new THREE.CylinderGeometry(0.025, 0.025, z1 - z0 - 0.6, 12); g.rotateX(Math.PI / 2); P(g, BRASS, [fx - 0.22, 0.2, (z0 + z1 - 0.6) / 2]);
      for (let z = z0 + 0.3; z < z1 - 0.7; z += 1.2) { k.box(0.24, 0.02, 0.03, fx - 0.11, 0.2, z, BRASS); } }
    // on the counter: three brass beer founts with handles, a bowl of lemons, menus, a cocktail shaker, a little lamp
    for (const [i, z] of [-4.8, -4.2, -3.6].entries()) { k.cyl(0.03, 0.04, 0.32, bx - 0.25, TOPY + 0.16, z, BRASS, 12); k.box(0.02, 0.18, 0.02, bx - 0.25, TOPY + 0.42, z, [0x1a1a1a, 0xffffff, 0x7a1f24][i]); k.box(0.06, 0.08, 0.012, bx - 0.25, TOPY + 0.47, z - 0.012, [0xd4af37, 0x1e4ea8, 0xf4f0e4][i]); k.box(0.02, 0.03, 0.06, bx - 0.25, TOPY + 0.27, z - 0.05, BRASS); }
    R(bx - 0.4, -5.1, bx - 0.12, -3.3, 0.008, TOPY + 0.004, 0x222222);
    k.cyl(0.11, 0.07, 0.07, bx - 0.3, TOPY + 0.035, -1.5, 0xf4f4f4, 16); for (let i = 0; i < 6; i++) P(new THREE.SphereGeometry(0.035, 8, 6), 0xf5d020, [bx - 0.32 + (i % 3) * 0.04, TOPY + 0.07 + Math.floor(i / 3) * 0.03, -1.52 + (i % 2) * 0.03], [0, 0, 0], [1, 0.8, 0.8]);
    k.cyl(0.035, 0.03, 0.2, bx - 0.3, TOPY + 0.1, -0.6, 0xd0d4d8, 12); k.cyl(0.025, 0.035, 0.05, bx - 0.3, TOPY + 0.225, -0.6, 0xd0d4d8, 12);
    for (let i = 0; i < 4; i++) R(bx - 0.45, 0.3 + i * 0.02, bx - 0.2, 0.62, 0.006, TOPY + 0.005 + i * 0.007, 0x1b2a1b);
    k.label('THE OYSTERFLEET · À LA CARTE', 0.24, 0.32, [bx - 0.32, TOPY + 0.03, 0.46], [-Math.PI / 2, 0, Math.PI / 2], { bg: '#1b2a1b', fg: '#d4af37', border: '#d4af37', size: 30 });
    for (const z of [-6.2, -2.4, 1.2]) { k.cyl(0.04, 0.05, 0.03, bx - 0.15, TOPY + 0.015, z, BRASS, 12); k.cyl(0.008, 0.008, 0.25, bx - 0.15, TOPY + 0.15, z, BRASS, 6); P(new THREE.CylinderGeometry(0.05, 0.09, 0.09, 16, 1, true), 0x1b3a2a, [bx - 0.15, TOPY + 0.3, z]); k.lamp(bx - 0.15, TOPY + 0.26, z, 0xffd8a0, 0.025); }
    for (const z of [-5.6, -2.0, 0.8]) k.spawns.push(new THREE.Vector3(fx + 0.3, TOPY + 0.08, z));
    // glasses hanging upside-down from a rack over the bar, three brass pendants
    for (const x of [fx + 0.08, bx - 0.08]) R(x - 0.03, z0 + 0.6, x + 0.03, z1 - 1.2, 0.05, 2.33, MAHD); for (let z = z0 + 0.6; z <= z1 - 1.2; z += 0.6) R(fx + 0.05, z - 0.02, bx - 0.05, z + 0.02, 0.04, 2.33, MAHD); for (const z of [z0 + 0.7, z1 - 1.3]) k.cyl(0.008, 0.008, RH - 2.34, (fx + bx) / 2, (RH + 2.34) / 2, z, 0x222222, 4);
    for (let z = z0 + 0.8; z < z1 - 1.3; z += 0.17) for (const dx of [0.15, 0.3, 0.45]) G(wineGlassGeo(), fx + dx, 2.3, z, 0, Math.PI);
    for (const z of [-5.5, -2.7, 0.1]) { k.cyl(0.005, 0.005, RH - 2.3, (fx + bx) / 2 - 0.4, (RH + 2.3) / 2, z, 0x222222, 4); P(new THREE.CylinderGeometry(0.05, 0.16, 0.18, 18, 1, true), BRASS, [(fx + bx) / 2 - 0.4, 2.21, z]); k.lamp((fx + bx) / 2 - 0.4, 2.14, z, 0xffd8a0, 0.05); k.pool(fx - 0.2, TOPY, z, 1.3, 0xffc070); }
    // behind: the back counter (under-counter fridges with lit glass doors), the coffee machine, the till, a sink
    const wx = -13.88, cx0 = wx - 0.62;
    R(cx0, z0, wx, z1 - 0.1, 0.9, 0.45, 0x3a1a0c, { collide: true, block: true }); R(cx0 - 0.03, z0, wx, z1 - 0.1, 0.04, 0.92, 0x2a2a2a, { collide: true });
    for (let z = z0 + 0.2; z < z1 - 0.8; z += 0.72) { R(cx0 - 0.01, z, cx0, z + 0.66, 0.66, 0.42, 0x222222); R(cx0 - 0.015, z + 0.04, cx0 - 0.005, z + 0.62, 0.58, 0.42, 0x9ad0e8);
      for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) P(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), [0x3a7a2a, 0xd8b020, 0x8a1a1a, 0xe8e0c8][(i + r) % 4], [cx0 + 0.15, 0.25 + r * 0.3, z + 0.12 + i * 0.14]); }
    R(cx0 + 0.08, -4.6, wx - 0.05, -4.0, 0.42, 1.15, 0x9aa0a8); R(cx0 + 0.07, -4.55, cx0 + 0.09, -4.05, 0.3, 1.12, 0x222222); for (const z of [-4.45, -4.15]) k.cyl(0.035, 0.03, 0.06, cx0 + 0.12, 1.05, z, 0x222222, 10);   // coffee machine
    for (let i = 0; i < 6; i++) k.cyl(0.04, 0.03, 0.06, cx0 + 0.25 + (i % 2) * 0.1, 1.4 + Math.floor(i / 2) * 0.065, -4.3 + (i % 3) * 0.08, 0xffffff, 10);
    R(cx0 + 0.1, -1.0, cx0 + 0.45, -0.6, 0.06, 0.95, 0x222222); k.box(0.3, 0.22, 0.03, cx0 + 0.25, 1.15, -0.8, 0x111111, { rot: [0, 0, 0.2] }); k.box(0.26, 0.18, 0.005, cx0 + 0.234, 1.15, -0.8, 0x2a6ad8, { rot: [0, Math.PI / 2, 0.2] });   // till
    R(cx0 + 0.08, 0.6, wx - 0.08, 1.2, 0.03, 0.925, 0xb8bcc0); k.cyl(0.01, 0.01, 0.25, wx - 0.12, 1.06, 0.9, 0xd0d4d8, 6);   // glass-wash sink
    // the wine wall: dark shelving up to the cornice, bottles on every shelf, warm strip lights
    const sz0 = z0 + 0.05, sz1 = z1 - 0.15, bays = Math.round((sz1 - sz0) / 0.62), bw = (sz1 - sz0) / bays;
    R(wx - 0.035, sz0, wx - 0.01, sz1, H - 1.05, 1.0 + (H - 1.05) / 2, 0xb07a44);   // a warm lit back panel
    for (let i = 0; i <= bays; i++) R(wx - 0.36, sz0 + i * bw - 0.02, wx - 0.01, sz0 + i * bw + 0.02, H - 1.05, 1.0 + (H - 1.05) / 2, MAH);
    let bn = 0;
    for (let sh = 0; sh < 6; sh++) { const y = 1.0 + sh * 0.32;
      R(wx - 0.36, sz0, wx - 0.01, sz1, 0.025, y, MAH); R(wx - 0.365, sz0, wx - 0.355, sz1, 0.012, y + 0.29, 0xffd890); k.lamp(wx - 0.3, y + 0.28, (sz0 + sz1) / 2 - 2, 0xffd890, 0.02); k.lamp(wx - 0.3, y + 0.28, (sz0 + sz1) / 2 + 2, 0xffd890, 0.02);   // shelf and its light strip
      k.pool(wx - 0.2, y + 0.02, (sz0 + sz1) / 2, 0.5, 0xffc070);
      for (let b = 0; b < bays; b++) for (let i = 0; i < 6; i++) { const z = sz0 + b * bw + 0.07 + i * (bw - 0.14) / 5, col = [0x2a5a22, 0x6a1020, 0xd8c890, 0xe8a0a8, 0x5a0a18, 0x3a6a2a, 0xe0d8a0][(bn++ * 3 + sh) % 7];
        P(new THREE.CylinderGeometry(0.036, 0.036, 0.2, 8), col, [wx - 0.18, y + 0.115, z]); P(new THREE.CylinderGeometry(0.013, 0.03, 0.07, 8), col, [wx - 0.18, y + 0.25, z]); P(new THREE.CylinderGeometry(0.014, 0.014, 0.025, 6), [0xd4af37, 0x8a1a1a, 0x111111][bn % 3], [wx - 0.18, y + 0.29, z]);
        P(new THREE.BoxGeometry(0.003, 0.07, 0.05), 0xf4ecd8, [wx - 0.217, y + 0.1, z]); } }
    R(wx - 0.38, sz0 - 0.02, wx - 0.01, sz1 + 0.02, 0.12, H - 0.06, MAHD);
    k.label('WINE', 0.8, 0.12, [wx - 0.385, H - 0.06, (sz0 + sz1) / 2], [0, -Math.PI / 2, 0], { bg: '#2e1408', fg: '#d4af37', border: null, size: 60 });
    k.lamp(wx - 0.6, RH - 0.02, -3.0, 0xfffbe8, 0.05); k.lamp(wx - 0.6, RH - 0.02, 0.5, 0xfffbe8, 0.05);
  }
  // ---------------------------------------------------------------- the host's lectern by the way in, a waiter's station, plants
  { const x = -15.2, z = 5.75; R(x - 0.28, z - 0.2, x + 0.28, z + 0.2, 1.05, 0.525, 0x4a2010, { block: true }); R(x - 0.32, z - 0.24, x + 0.32, z + 0.24, 0.04, 1.08, 0x2e1408, { rot: [0, 0, 0] });
    R(x - 0.22, z - 0.15, x + 0.22, z + 0.15, 0.012, 1.106, 0xfaf6ea); k.label('RESERVATIONS: RONNIE x 1 (FOR 9)', 0.4, 0.26, [x, 1.114, z], [-Math.PI / 2, 0, Math.PI / 2], { bg: '#faf6ea', fg: '#111', border: null, size: 26 });
    k.cyl(0.04, 0.05, 0.03, x + 0.18, 1.115, z - 0.14, BRASS, 10); k.cyl(0.006, 0.006, 0.25, x + 0.18, 1.24, z - 0.14, BRASS, 6); P(new THREE.CylinderGeometry(0.04, 0.07, 0.07, 14, 1, true), 0x1b3a2a, [x + 0.18, 1.38, z - 0.14]); k.lamp(x + 0.18, 1.36, z - 0.14, 0xffd8a0, 0.02);
    k.label('PLEASE WAIT TO BE SEATED', 0.5, 0.36, [x + 0.29, 0.75, z], [0, Math.PI / 2, 0], { bg: '#1b3a2a', fg: '#d4af37', border: '#d4af37', size: 40 }); }
  const plant = (x, z, s = 1) => pottedPlant(k, x, z, { s: s * 1.1, pot: 0x2a2420, rim: BRASS, fronds: 20 });
  plant(-25.6, -13.75); plant(-28.5, -8.3, 1.1); plant(-28.4, 5.6, 1.1); plant(-18.2, 9.4); plant(-38.4, -7.9, 1.05); plant(-15.0, -8.4, 0.9);
  { const x = -19.6, z0 = -13.95; R(x - 0.7, z0 - 0.42, x + 0.7, z0, 0.92, 0.46, 0x4a2412, { collide: true, block: true }); R(x - 0.72, z0 - 0.44, x + 0.72, z0 + 0.02, 0.03, 0.935, 0x3a1a0c, { collide: true });   // waiter's station: cutlery drawers, folded napkins, jugs
    for (let i = 0; i < 4; i++) { R(x - 0.66 + i * 0.33, z0 - 0.01, x - 0.36 + i * 0.33, z0 + 0.0, 0.14, 0.8, 0x5a2e18); k.box(0.08, 0.015, 0.015, x - 0.51 + i * 0.33, 0.8, z0 + 0.008, BRASS); }
    for (let i = 0; i < 5; i++) P(new THREE.BoxGeometry(0.22, 0.02, 0.22), 0xfdfdfb, [x - 0.4, 0.96 + i * 0.022, z0 - 0.22]);
    for (let i = 0; i < 3; i++) G(new THREE.LatheGeometry([[0, 0], [0.06, 0], [0.065, 0.16], [0.05, 0.22], [0.055, 0.24]].map(([a, b]) => new THREE.Vector2(a, b)), 12), x + 0.1 + i * 0.16, 0.95, z0 - 0.22);
    for (let i = 0; i < 8; i++) P(new THREE.CylinderGeometry(0.11, 0.1, 0.012, 18), 0xffffff, [x + 0.5, 0.96 + i * 0.013, z0 - 0.22]); }

  // ---------------------------------------------------------------- doors: the kitchen's swing doors (propped open), the toilets
  const leaf = (e, s, sd, w, color, window = true, out = -1) => {        // a door leaf hinged at s on edge e, folded back against the wall (out = which side)
    const [hx, hz] = e.at(s, out * T), ry = e.ry + sd * Math.PI / 2, [cx, cz] = [hx + e.nx * out * w / 2, hz + e.nz * out * w / 2];
    k.box(w, 2.08, 0.045, cx, 1.06, cz, color, { rot: [0, Math.atan2(-e.nz * out, e.nx * out), 0] });
    if (window) { const g = new THREE.CylinderGeometry(0.13, 0.13, 0.05, 20); g.rotateX(Math.PI / 2); g.rotateY(Math.atan2(-e.nz * out, e.nx * out)); P(g, 0x9ab8c8, [cx, 1.55, cz]); const g2 = new THREE.TorusGeometry(0.13, 0.015, 6, 20); g2.rotateY(Math.atan2(-e.nz * out, e.nx * out)); P(g2, 0xb8bcc0, [cx, 1.55, cz]); }
    k.box(0.05, 0.3, 0.06, cx, 0.9, cz, 0xb8bcc0, { rot: [0, Math.atan2(-e.nz * out, e.nx * out), 0] });
  };
  leaf(me[1], KDOOR[0] + 0.02, 1, 0.48, 0xd8d2c4); leaf(me[1], KDOOR[1] - 0.02, -1, 0.48, 0xd8d2c4);
  { const [x, z] = me[1].at((KDOOR[0] + KDOOR[1]) / 2, T + 0.01), ry = Math.atan2(me[1].nx, me[1].nz); k.label('KITCHEN — STAFF ONLY', 0.8, 0.18, [x, 2.42, z], [0, ry, 0], { bg: '#2e1408', fg: '#d4af37', border: '#d4af37', size: 50 }); }
  for (const [g, nm, glyph] of [[GENTSDOOR, 'GENTLEMEN', '♂'], [LADIESDOOR, 'LADIES', '♀']]) {
    leaf(he[2], g[0] + 0.02, 1, 0.86, 0x5a2e18, false, -1);
    const [x, z] = he[2].at((g[0] + g[1]) / 2, T + 0.01), ry = Math.atan2(he[2].nx, he[2].nz);
    k.label(glyph + ' ' + nm, 0.7, 0.16, [x, 2.38, z], [0, ry, 0], { bg: '#c9a24a', fg: '#2e1408', border: '#8a6a2a', size: 50 });
  }
  { const [x, z] = me[0].at((HALLDOOR[0] + HALLDOOR[1]) / 2, T + 0.01), ry = Math.atan2(me[0].nx, me[0].nz); k.label('TOILETS', 0.6, 0.16, [x, 2.66, z], [0, ry, 0], { bg: '#2e1408', fg: '#d4af37', border: null, size: 50 }); }
  // the hall: a console table with flowers, framed prints, downlights
  { const x = -20.15, z = -15.35; R(x - 0.15, z - 0.55, x + 0.15, z + 0.55, 0.04, 0.82, 0x4a2412, { block: true }); for (const dz of [-0.48, 0.48]) k.box(0.04, 0.8, 0.04, x, 0.4, z + dz, 0x4a2412);
    G(new THREE.CylinderGeometry(0.06, 0.05, 0.22, 14), x, 0.95, z); for (let i = 0; i < 9; i++) P(new THREE.SphereGeometry(0.04, 8, 6), [0xf4f0e0, 0xe85a6a, 0xf2c23a][i % 3], [x + Math.cos(i * 2.4) * 0.07, 1.2 + (i % 3) * 0.05, z + Math.sin(i * 2.4) * 0.07]); }
  painting(he[1], 2.6, 0.6, 0.45); painting(he[3], 2.5, 0.6, 0.45); sconce(he[1], 1.2); sconce(he[1], 4.1);
  for (const [x, z] of [[-18.5, -15.5], [-18.5, -17.8], [-21.0, -18.9], [-22.2, -21.0], [-18.5, -22.0], [-18.0, -20.6]]) k.lamp(x, H - 0.01, z, 0xfffbe8, 0.035);
  // ---- the Ladies: two cubicles, a vanity with a mirror; the Gents: three urinals, a cubicle, two basins
  const cubicle = (x0, x1, zBack, zFront) => { for (const x of [x0, x1]) R(x - 0.02, zBack, x + 0.02, zFront, 1.95, 1.08, 0x8a5a32); R(x0, zFront - 0.02, x0 + 0.12, zFront + 0.02, 1.95, 1.08, 0x8a5a32); const dw = x1 - x0 - 0.14;
    k.box(dw, 1.8, 0.035, x0 + 0.12 + dw / 2 * Math.cos(1.2), 1.05, zFront - Math.sin(1.2) * dw / 2 * Math.sign(zFront - zBack) * -1, 0x9a6a3a, { rot: [0, 1.2 * Math.sign(zBack - zFront), 0] });
    const tx = (x0 + x1) / 2, dz = Math.sign(zFront - zBack); R(tx - 0.19, zBack + dz * 0.02, tx + 0.19, zBack + dz * 0.2, 0.42, 0.72, 0xfbfbfb); P(new THREE.CylinderGeometry(0.17, 0.13, 0.38, 14), 0xfbfbfb, [tx, 0.19, zBack + dz * 0.47], [0, 0, 0], [1, 1, 1.25]);
    P(new THREE.TorusGeometry(0.15, 0.025, 6, 16), 0x2e1408, [tx, 0.4, zBack + dz * 0.47], [Math.PI / 2, 0, 0], [1, 1.25, 1]); blk(tx - 0.2, Math.min(zBack, zBack + dz * 0.7), tx + 0.2, Math.max(zBack, zBack + dz * 0.7), 0.45); };
  cubicle(-23.86, -22.9, -21.72, -20.5); cubicle(-22.9, -21.94, -21.72, -20.5);
  const vanity = (x, z0, z1, dir) => { R(x, z0, x + dir * 0.5, z1, 0.06, 0.86, 0x2a2420, { collide: true }); R(x, z0, x + dir * 0.48, z1, 0.8, 0.42, 0x4a2412, { block: true });
    for (let z = z0 + 0.35; z < z1 - 0.2; z += 0.7) { P(new THREE.CylinderGeometry(0.17, 0.13, 0.08, 16), 0xfbfbfb, [x + dir * 0.27, 0.87, z]); k.cyl(0.01, 0.01, 0.2, x + dir * 0.07, 0.98, z, BRASS, 6); }
    k.label('mirror', z1 - z0 - 0.1, 0.8, [x + dir * 0.016, 1.55, (z0 + z1) / 2], [0, dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0], { tex: mirrorTex() }); R(x, z0 - 0.04, x + dir * 0.008, z1 + 0.04, 0.9, 1.55, 0xc9a24a); };
  vanity(-20.46, -21.6, -20.3, -1); vanity(-16.82, -22.0, -20.6, -1);
  for (let i = 0; i < 3; i++) { const ux = -18.9 + i * 0.75, uz = -23.72;
    P(new RoundedBoxGeometry(0.4, 0.66, 0.32, 3, 0.07), 0xfbfbfb, [ux, 0.84, uz + 0.16]); P(new THREE.BoxGeometry(0.29, 0.44, 0.02), 0xe2e8ec, [ux, 0.82, uz + 0.315]); k.cyl(0.015, 0.015, 0.4, ux, 1.36, uz + 0.05, BRASS, 8);
    if (i < 2) k.box(0.03, 0.8, 0.45, ux + 0.375, 1.05, uz + 0.25, 0x8a5a32); blk(ux - 0.22, uz, ux + 0.22, uz + 0.4, 1.1); }
  cubicle(-20.3, -19.3, -23.72, -22.4);
  k.box(0.18, 0.32, 0.28, -16.92, 1.25, -20.2, 0xeceff1); k.box(0.18, 0.32, 0.28, -20.55, 1.25, -20.02, 0xeceff1);   // hand dryers

  // ---------------------------------------------------------------- the kitchen extension: dry stores, the walk-in cold room, pastry, the prep island
  { const SS = 0xc8ccd2, SSL = 0xdfe2e6, SSD = 0x9aa0a8;
    // racks of dry stores along the top wall
    const rz0 = -14.37, rz1 = -13.85;
    for (const [x0, x1] of [[-16.2, -15.1], [-15.0, -13.9]]) { for (const y of [0.25, 0.75, 1.25, 1.75]) R(x0, rz0, x1, rz1, 0.025, y, 0xb8bcc2, { collide: true }); for (const x of [x0, x1]) for (const z of [rz0, rz1]) k.box(0.025, 1.85, 0.025, x, 0.925, z, SSD); blk(x0, rz0, x1, rz1, 1.9);
      let i = 0; for (const y of [0.25, 0.75, 1.25, 1.75]) for (let x = x0 + 0.13; x < x1 - 0.1; x += 0.2, i++) { const t = (i * 7) % 5;
        if (t === 0) k.cyl(0.075, 0.075, 0.16, x, y + 0.09, (rz0 + rz1) / 2, [0xc62828, 0x2e7d32, 0xf9a825][i % 3], 12);
        else if (t === 1) R(x - 0.08, rz0 + 0.06, x + 0.08, rz1 - 0.06, 0.12, y + 0.07, 0xf0f0f0);
        else if (t === 2) R(x - 0.09, rz0 + 0.05, x + 0.09, rz1 - 0.05, 0.32, y + 0.17, 0xe8dcc0);
        else if (t === 3) for (let b = 0; b < 3; b++) k.cyl(0.025, 0.025, 0.2, x - 0.05 + b * 0.05, y + 0.11, (rz0 + rz1) / 2, [0x3a7a2a, 0x8a1a1a, 0xe8d890][b], 8);
        else R(x - 0.08, rz0 + 0.06, x + 0.08, rz1 - 0.06, 0.18, y + 0.1, 0xb8905a); } }
    k.label('DRY STORE — FIFO! (RONNIE: THAT IS NOT A SNACK CUPBOARD)', 1.4, 0.24, [-15.05, 2.15, -14.36], [0, 0, 0], { bg: '#fff', fg: '#1f4fbf', border: '#1f4fbf', size: 30 });
    // the walk-in cold room in the top-right corner: steel box, a heavy door with a strip curtain inside, a thermometer, the compressor
    const wx0 = -12.95, wx1 = -10.28, wz0 = -14.37, wz1 = -12.35;
    R(wx0, wz0, wx1, wz1, 2.4, 1.2, SSL, { collide: true, block: true }); R(wx0 - 0.01, wz1 - 0.01, wx1, wz1 + 0.01, 0.12, 2.36, SSD);
    R(-12.2, wz1, -11.3, wz1 + 0.06, 2.0, 1.0, 0xe8eaec); R(-12.22, wz1 + 0.06, -12.12, wz1 + 0.12, 0.3, 1.05, 0x888888); R(-11.42, wz1 + 0.06, -11.32, wz1 + 0.12, 0.3, 1.05, 0x888888);
    k.box(0.06, 0.4, 0.06, -11.45, 1.05, wz1 + 0.13, 0x555555); R(-11.2, wz1, -10.9, wz1 + 0.02, 0.2, 1.55, 0x222222); k.label('2°C', 0.26, 0.16, [-11.05, 1.55, wz1 + 0.021], [0, 0, 0], { bg: '#111', fg: '#39ff14', border: null, size: 60 });
    k.label('WALK-IN COLD ROOM — KEEP SHUT. RONNIE: NO.', 1.1, 0.2, [-11.62, 2.2, wz1 + 0.012], [0, 0, 0], { bg: '#fff', fg: '#c62828', border: '#c62828', size: 32 });
    R(wx0 + 0.3, wz0 + 0.3, wx0 + 1.2, wz0 + 1.1, 0.4, 2.6, 0x9aa0a8); for (let i = 0; i < 6; i++) R(wx0 + 0.32 + i * 0.14, wz0 + 0.32, wx0 + 0.36 + i * 0.14, wz0 + 1.08, 0.36, 2.6, 0x5a6068);
    // the pastry bench on the right-hand wall: a planetary mixer, flour bins, rolling pins, a tray of pies going out
    const px1 = -10.28, px0 = px1 - 0.72, pz0 = -12.15, pz1 = -10.3;
    R(px0, pz0, px1, pz1, 0.9, 0.45, SS, { collide: true, block: true }); R(px0 - 0.02, pz0, px1, pz1, 0.04, 0.92, 0xe0d4b8, { collide: true });   // a beech top for pastry
    k.cyl(0.13, 0.15, 0.1, px1 - 0.3, 0.99, pz0 + 0.35, 0xeeeeee, 14); k.box(0.16, 0.5, 0.16, px1 - 0.18, 1.2, pz0 + 0.35, 0xeeeeee); k.box(0.36, 0.14, 0.2, px1 - 0.3, 1.5, pz0 + 0.35, 0xeeeeee); k.cyl(0.15, 0.11, 0.2, px1 - 0.38, 1.12, pz0 + 0.35, 0xd0d4d8, 16);   // the mixer
    k.cyl(0.03, 0.03, 0.42, px0 + 0.3, 0.955, pz0 + 0.95, 0xc89a5a, 10); R(px0 + 0.08, pz0 + 1.1, px1 - 0.08, pz1 - 0.1, 0.02, 0.93, 0x9aa0a8);
    for (let i = 0; i < 6; i++) { k.cyl(0.07, 0.06, 0.04, px0 + 0.2 + (i % 2) * 0.3, 0.96, pz0 + 1.25 + Math.floor(i / 2) * 0.17, 0xc8863a, 14); }   // pies
    k.spawns.push(new THREE.Vector3(px0 + 0.35, 1.0, pz0 + 1.4));
    k.label('PASTRY', 0.6, 0.18, [px1 - 0.012, 2.1, (pz0 + pz1) / 2], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#2e1408', border: '#d4af37', size: 60 });
    // the prep island in the middle: steel table, under-shelf of pans, boards with veg on, a stack of plates for the restaurant
    const ix0 = -13.0, ix1 = -11.65, iz0 = -11.9, iz1 = -10.95;
    R(ix0, iz0, ix1, iz1, 0.04, 0.9, SSL, { collide: true }); R(ix0 + 0.05, iz0 + 0.05, ix1 - 0.05, iz1 - 0.05, 0.025, 0.3, SS);
    for (const [x, z] of [[ix0 + 0.04, iz0 + 0.04], [ix1 - 0.04, iz0 + 0.04], [ix0 + 0.04, iz1 - 0.04], [ix1 - 0.04, iz1 - 0.04]]) k.box(0.04, 0.9, 0.04, x, 0.45, z, SSD);
    blk(ix0, iz0, ix1, iz1, 0.92);
    R(ix0 + 0.1, iz0 + 0.1, ix0 + 0.55, iz0 + 0.45, 0.025, 0.935, 0x2e7d32); for (let i = 0; i < 5; i++) P(new THREE.SphereGeometry(0.035, 8, 6), [0xd84315, 0xf9a825, 0x2e7d32][i % 3], [ix0 + 0.18 + i * 0.07, 0.97, iz0 + 0.27]);
    R(ix1 - 0.6, iz0 + 0.1, ix1 - 0.15, iz0 + 0.45, 0.025, 0.935, 0xc89a5a); for (let i = 0; i < 4; i++) P(new THREE.SphereGeometry(0.04, 8, 6), 0xf4e8c0, [ix1 - 0.5 + i * 0.1, 0.97, iz0 + 0.28]);
    for (let i = 0; i < 12; i++) k.cyl(0.13, 0.12, 0.012, ix1 - 0.35, 0.93 + i * 0.013, iz1 - 0.25, 0xffffff, 16);
    for (let i = 0; i < 3; i++) k.cyl(0.14, 0.13, 0.12, ix0 + 0.3 + i * 0.4, 0.38, (iz0 + iz1) / 2, 0x9aa0a8, 14);
    k.spawns.push(new THREE.Vector3((ix0 + ix1) / 2, 1.0, (iz0 + iz1) / 2));
    // a hand basin between the racks and the cold room, a trolley of clean plates by the door, bins, the strip lights
    R(-13.75, -14.37, -13.25, -14.0, 0.12, 0.85, 0xf4f4f2); k.cyl(0.012, 0.012, 0.18, -13.5, 1.0, -14.3, 0xd0d0d0, 6); R(-13.7, -14.37, -13.3, -14.3, 0.32, 1.35, 0xe8e8e8);
    k.label('NOW WASH YOUR HANDS', 0.4, 0.14, [-13.5, 1.72, -14.36], [0, 0, 0], { bg: '#fff', fg: '#1f4fbf', border: '#1f4fbf', size: 36 });
    { const tx = -15.15, tz = -13.15; for (const y of [0.15, 0.55, 0.95]) R(tx - 0.32, tz - 0.25, tx + 0.32, tz + 0.25, 0.02, y, SS); for (const dx of [-0.3, 0.3]) for (const dz of [-0.23, 0.23]) k.box(0.025, 1.0, 0.025, tx + dx, 0.5, tz + dz, SSD);
      for (const y of [0.16, 0.56, 0.96]) for (let i = 0; i < 9; i++) k.cyl(0.12, 0.11, 0.012, tx - 0.12, y + 0.02 + i * 0.013, tz, 0xffffff, 16);
      blk(tx - 0.34, tz - 0.27, tx + 0.34, tz + 0.27, 1.0); }
    for (const [i, z] of [-9.35, -9.85].entries()) { k.cyl(0.22, 0.2, 0.75, -10.55, 0.375, z, [0x2e7d32, 0x37474f][i], 12, { block: true }); k.cyl(0.23, 0.23, 0.04, -10.55, 0.77, z, [0x2e7d32, 0x37474f][i], 12); }
    for (const z of [-13.4, -10.6]) for (const x of [-15.3, -12.3]) { k.box(0.14, 0.06, 1.3, x, H - 0.04, z, 0xffffff); k.lamp(x, H - 0.08, z, 0xf4fbff, 0.08, false); }
    k.pool(-13.5, 0, -11.6, 4.5, 0xf4fbff);
    k.label('RESTAURANT KITCHEN — RONNIE MAY NOT ENTER (HE HAS ENTERED)', 1.6, 0.26, [-10.29, 2.5, -9.8], [0, -Math.PI / 2, 0], { bg: '#222', fg: '#ffd400', border: null, size: 34 });
  }

  // ---------------------------------------------------------------- the sign over the way in from the pub
  k.label('THE OYSTERFLEET — THE PUB & THE BAR', 1.9, 0.36, [-14.145, 2.68, 3.6], [0, -Math.PI / 2, 0], { bg: '#1b3a2a', fg: '#d4af37', border: '#d4af37', size: 44 });
  // ---------------------------------------------------------------- downlights, two real lamps for a warm glow, food spots on some tables
  for (let x = -28.5; x < -14; x += 2.4) for (let z = -13.5; z < 10; z += 2.4) if (inPoly(REST.main, x, z) && x < -18.2) k.lamp(x, RH - 0.01, z, 0xfffbe8, 0.035);
  for (let x = -38.4; x < -29.5; x += 2.4) for (const z of [-7.8, 2.6]) k.lamp(x, H - 0.01, z, 0xfffbe8, 0.03);
  k.light(-23.0, 3.3, -2.0, 0xffd8a8, 3.6, 16); k.light(-34.1, 2.6, -2.4, 0xffd8a8, 2.6, 11);
  spawnsOn.forEach(([x, z]) => { k.spawns.push(new THREE.Vector3(x + 0.2, TY + 0.08, z + 0.08), new THREE.Vector3(x - 0.22, TY + 0.08, z - 0.06), new THREE.Vector3(x + 0.02, TY + 0.08, z - 0.2), new THREE.Vector3(x - 0.05, TY + 0.08, z + 0.2)); });

  // all the glassware in one see-through mesh
  const gmat = new THREE.MeshLambertMaterial({ color: 0xe6f2f4, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide }), gcells = new Map(), gc = new THREE.Vector3();
  for (const g of glass) { g.computeBoundingBox(); g.boundingBox.getCenter(gc); const key = Math.floor(gc.x / 6) + ',' + Math.floor(gc.z / 6); (gcells.get(key) || gcells.set(key, []).get(key)).push(g); }
  for (const list of gcells.values()) { const g = mergeGeometries(list, false); g.computeVertexNormals(); const m = new THREE.Mesh(g, gmat); m.renderOrder = 3; scene.add(m); }
}
