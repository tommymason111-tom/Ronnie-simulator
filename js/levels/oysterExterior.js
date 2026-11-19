// The Oysterfleet from outside, built from the photo of the real one: a ground floor of soft orange-red brick (a few
// buff ones mixed in), black-stained timber weatherboarding on the floors above, steep roofs of orange clay tiles with
// white fascias, white bargeboards up the gables, black gutters and downpipes, white uPVC windows with top openers.
// A tall three-storey gabled block over the entrance with lower two-storey wings either side, and "OYSTERFLEET /
// HOTEL / PUB & RESTAURANT" in gold serif letters on the boarding of the left wing. A round blue plaque on the brick.
// The entrance porch sticks out: its own little orange-tiled gable with white bargeboards, a big maroon triangular
// "Hotel & Pub" sign with the O logo filling the gable, a maroon ENTRANCE board under it, dark timber posts, brick
// dwarf walls with arched leaded windows (blue stained glass round the edges), window boxes of flowers, hanging
// baskets, the doors pinned open. A maroon A-board out on the pavement. Round the right: a side door with a maroon
// sign, black railings, a white sign board. All the way round (front, sides and back) the same: brick below, black
// boarding above, orange tiles on top.
// Everything here is outside the building or above its ceiling, so the inside is just as it was.
import * as THREE from 'three';
import { part } from '../geo.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex } from './kit.js';

let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;

// ---- textures (each covers 1.2m square of wall / roof)
export function photoBrickTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#cdbfae'; g.fillRect(0, 0, w, h);                    // the mortar: pale, a bit grey
    const ch = 32, bw = 92, cols = ['#c0683a', '#b65c33', '#cc7445', '#a9532f', '#c97b4e', '#b9643c', '#d08655', '#9e4b2b', '#c4a074', '#bf6d41'];
    for (let r = 0; r < h / ch; r++) for (let x = -((r % 2) * bw / 2); x < w; x += bw) {
      const c = cols[Math.floor(rnd() * cols.length)]; g.fillStyle = c; g.fillRect(x + 2, r * ch + 2, bw - 4, ch - 4);
      for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '60,25,10' : '235,190,150'},${0.08 + rnd() * 0.12})`; g.fillRect(x + 2 + rnd() * (bw - 6), r * ch + 2 + rnd() * (ch - 6), 2 + rnd() * 5, 1 + rnd() * 3); }
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + 2, r * ch + ch - 4, bw - 4, 2);          // (a little shadow under each)
    }
  });
}
export function boardTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const n = 8, bh = h / n;
    for (let i = 0; i < n; i++) { const y = i * bh, base = 26 + Math.floor(rnd() * 7);
      g.fillStyle = `rgb(${base},${base + 1},${base + 3})`; g.fillRect(0, y, w, bh);
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '70,72,76' : '8,8,10'},${0.15 + rnd() * 0.2})`; g.fillRect(rnd() * w, y + 3 + rnd() * (bh - 8), 20 + rnd() * 60, 1); }   // grain
      g.fillStyle = 'rgba(80,82,88,0.55)'; g.fillRect(0, y, w, 2);               // the top edge catching the light
      g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(0, y + bh - 4, w, 4);        // the shadow under the overlap
      if (rnd() < 0.5) { const jx = rnd() * w; g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(jx, y, 2, bh); }   // a butt joint now and then
    }
  });
}
export function tileTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const rows = 12, rh = h / rows, tw = 34, cols = ['#b5552f', '#c0623a', '#a84a2a', '#c96d42', '#9f4426', '#b85d36', '#a3502e'];
    g.fillStyle = '#5a2414'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < rows; r++) for (let x = -((r % 2) * tw / 2); x < w; x += tw) {
      g.fillStyle = cols[Math.floor(rnd() * cols.length)]; g.fillRect(x + 1, r * rh, tw - 2, rh - 1);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 1, r * rh + rh - 4, tw - 2, 3);                  // the shadow at the bottom of each tile
      if (rnd() < 0.18) { g.fillStyle = 'rgba(150,140,80,0.35)'; g.beginPath(); g.arc(x + rnd() * tw, r * rh + rnd() * rh, 2 + rnd() * 4, 0, 7); g.fill(); }   // a bit of lichen
    }
  });
}
function leadedTex() {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#2b2620'; g.fillRect(0, 0, w, h);
    g.save(); g.beginPath(); g.moveTo(6, h - 6); g.lineTo(6, 52); g.quadraticCurveTo(w / 2, -10, w - 6, 52); g.lineTo(w - 6, h - 6); g.closePath(); g.clip();
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#dfe8ec'); gr.addColorStop(1, '#b9c6cc'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1f5fb0'; g.fillRect(6, 0, 14, h); g.fillRect(w - 20, 0, 14, h); g.fillRect(0, 44, w, 12); g.fillRect(0, h - 22, w, 16);   // the blue border panes
    g.fillStyle = '#2f7ad0'; for (let y = 60; y < h - 22; y += 26) { g.fillRect(6, y, 14, 10); g.fillRect(w - 20, y, 14, 10); }
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(24, 64, 10, h - 100);                          // a glint
    g.strokeStyle = '#3a3530'; g.lineWidth = 2; for (let i = -10; i < 20; i++) { g.beginPath(); g.moveTo(i * 16, 56); g.lineTo(i * 16 + 200, 256); g.stroke(); g.beginPath(); g.moveTo(i * 16 + 200, 56); g.lineTo(i * 16, 256); g.stroke(); }   // the diamond leading
    g.restore();
    g.strokeStyle = '#3a2416'; g.lineWidth = 8; g.beginPath(); g.moveTo(6, h - 6); g.lineTo(6, 52); g.quadraticCurveTo(w / 2, -10, w - 6, 52); g.lineTo(w - 6, h - 6); g.closePath(); g.stroke();
  });
}
// the O logo: a white circle-and-swirl "O"
function oLogo(g, cx, cy, r, col = '#fff') { g.strokeStyle = col; g.lineWidth = r * 0.22; g.beginPath(); g.ellipse(cx, cy, r * 0.78, r, 0, 0, Math.PI * 2); g.stroke();
  g.lineWidth = r * 0.12; g.beginPath(); g.moveTo(cx - r * 0.2, cy - r * 0.55); g.quadraticCurveTo(cx + r * 0.35, cy - r * 0.2, cx - r * 0.05, cy + r * 0.55); g.stroke(); }

export function buildExterior(k, scene, { blk }) {
  const BRICK = photoBrickTex(), BOARD = boardTex(), TILE = tileTex();
  // geometry batched by what it's made of (one mesh each in the end): coloured bits go to the kit's merge
  const tex = { brick: [], board: [], tile: [] };
  const col = (geo, c) => k.parts.push(part(geo, c));
  const B = (w, h, d, x, y, z, c, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); col(g, c); };
  // a textured box (UVs in metres, so the bricks / boards / tiles keep their real size), optionally turned
  const TB = (kind, w, h, d, x, y, z, ry = 0, rep = 1.2) => { const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const n = f * 4 + i; uv.setXY(n, uv.getX(n) * dims[f][0] / rep, uv.getY(n) * dims[f][1] / rep); }
    if (ry) g.rotateY(ry); g.translate(x, y, z); tex[kind].push(g.toNonIndexed()); };
  // a flat polygon (three points or four) with UVs from two axes (metres)
  const poly = (kind, pts, uvOf) => { const P = [], U = []; const tri = (a, b, c) => { for (const p of [a, b, c]) { P.push(...p); U.push(...uvOf(p)); } };
    tri(pts[0], pts[1], pts[2]); if (pts[3]) tri(pts[0], pts[2], pts[3]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.computeVertexNormals(); tex[kind].push(g); };
  const WHITE = 0xf4f4f0, BLACK = 0x161616, GLASS = 0x26323c, SKY = 0x8ea6ba;

  // ---------------------------------------------------------------- the upper storeys and roofs
  // a block: its footprint, where the boarding starts and stops, which way the ridge runs, how steep
  const blocks = [
    { x0: -10.2, x1: 0.36, z0: -15.12, z1: -8.88, y1: 5.6, ridge: 'x', pitch: 38 },        // left wing (over the toilets)
    { x0: 1.4, x1: 6.12, z0: -14.24, z1: -7.2, y1: 8.3, ridge: 'z', pitch: 52 },           // the tall block over the entrance
    { x0: 6.12, x1: 10.68, z0: -6.84, z1: 7.92, y1: 5.6, ridge: 'z', pitch: 40 },          // right wing (staff room, keg room, back room)
    { x0: -9.72, x1: 6.12, z0: -8.88, z1: 0.36, y1: 5.6, ridge: 'x', pitch: 32 },          // the bar and the pub floor, front half
    { x0: -9.72, x1: 6.12, z0: 0.36, z1: 7.92, y1: 5.6, ridge: 'x', pitch: 32 },           // ...back half
  ];
  const Y0 = 2.95;
  for (const b of blocks) {
    const W = b.x1 - b.x0, D = b.z1 - b.z0, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    TB('board', W, b.y1 - Y0, D, cx, (Y0 + b.y1) / 2, cz);
    roof(b.x0, b.x1, b.z0, b.z1, b.y1, b.ridge, b.pitch);
    // a white band where the brick stops and the boarding starts
    B(W + 0.06, 0.08, D + 0.06, cx, Y0 + 0.02, cz, 0xe8e4dc);
  }
  // single-storey bits get lean-to roofs: the kitchen against the pub, the men's toilets against the left wing,
  // the gambling room a little gable of its own
  leanTo(-13.8, -9.72, -8.88, 2.04, 'x+', 3.0, 4.6);
  leanTo(-10.2, -4.44, -16.08, -15.12, 'z+', 3.0, 3.7);
  leanTo(0.36, 1.4, -14.2, -8.88, 'x+', 3.0, 3.6);
  roof(4.68, 9.0, 7.92, 15.48, 3.0, 'z', 35);

  // a pitched roof over a rectangle: two tiled slopes, boarded gables, white bargeboards and fascias, black gutters
  function roof(x0, x1, z0, z1, ye, ridge, pitchDeg, o = 0.32) {
    const p = pitchDeg * Math.PI / 180, t = Math.tan(p);
    if (ridge === 'x') {
      const hs = (z1 - z0) / 2, zm = (z0 + z1) / 2, yr = ye + hs * t, yo = ye - o * t, sl = (hs + o) / Math.cos(p);
      // the slopes (tile UVs: along the ridge, and down the slope)
      poly('tile', [[x0 - o, yo, z0 - o], [x1 + o, yo, z0 - o], [x1 + o, yr, zm], [x0 - o, yr, zm]], ([x, y, z]) => [x / 1.2, Math.hypot(z - (z0 - o), y - yo) / 1.2]);
      poly('tile', [[x1 + o, yo, z1 + o], [x0 - o, yo, z1 + o], [x0 - o, yr, zm], [x1 + o, yr, zm]], ([x, y, z]) => [x / 1.2, Math.hypot(z - (z1 + o), y - yo) / 1.2]);
      for (const x of [x0, x1]) poly('board', [[x, ye, z0], [x, ye, z1], [x, yr, zm]], ([, y, z]) => [z / 1.2, y / 1.2]);          // the gables
      for (const [x, sx] of [[x0 - o, -1], [x1 + o, 1]]) for (const [zs, s2] of [[z0 - o, -1], [z1 + o, 1]]) {       // bargeboards up both rakes, both ends
        const g = new THREE.BoxGeometry(0.05, 0.24, sl); g.rotateX(s2 < 0 ? -p : p); g.translate(x + sx * 0.02, (yo + yr) / 2 - 0.08, (zs + zm) / 2); col(g, WHITE); }
      for (const z of [z0 - o, z1 + o]) { B(x1 - x0 + 2 * o, 0.22, 0.05, (x0 + x1) / 2, yo - 0.1, z, WHITE); const gu = new THREE.CylinderGeometry(0.065, 0.065, x1 - x0 + 2 * o, 8, 1, true, 0, Math.PI); gu.rotateZ(Math.PI / 2); gu.translate((x0 + x1) / 2, yo - 0.2, z + (z < zm ? -0.06 : 0.06)); col(gu, BLACK); }
      { const rg = new THREE.CylinderGeometry(0.09, 0.09, x1 - x0 + 2 * o, 8, 1, false, 0, Math.PI); rg.rotateZ(Math.PI / 2); rg.rotateX(-Math.PI / 2); rg.translate((x0 + x1) / 2, yr - 0.02, zm); col(rg, 0x8a3a20); }   // the ridge tiles
    } else {
      const hs = (x1 - x0) / 2, xm = (x0 + x1) / 2, yr = ye + hs * t, yo = ye - o * t, sl = (hs + o) / Math.cos(p);
      poly('tile', [[x0 - o, yo, z1 + o], [x0 - o, yo, z0 - o], [xm, yr, z0 - o], [xm, yr, z1 + o]], ([x, y, z]) => [z / 1.2, Math.hypot(x - (x0 - o), y - yo) / 1.2]);
      poly('tile', [[x1 + o, yo, z0 - o], [x1 + o, yo, z1 + o], [xm, yr, z1 + o], [xm, yr, z0 - o]], ([x, y, z]) => [z / 1.2, Math.hypot(x - (x1 + o), y - yo) / 1.2]);
      for (const z of [z0, z1]) poly('board', [[x0, ye, z], [x1, ye, z], [xm, yr, z]], ([x, y]) => [x / 1.2, y / 1.2]);
      for (const [z, sz] of [[z0 - o, -1], [z1 + o, 1]]) for (const [xs, s2] of [[x0 - o, -1], [x1 + o, 1]]) {
        const g = new THREE.BoxGeometry(sl, 0.24, 0.05); g.rotateZ(s2 < 0 ? p : -p); g.translate((xs + xm) / 2, (yo + yr) / 2 - 0.08, z + sz * 0.02); col(g, WHITE); }
      for (const x of [x0 - o, x1 + o]) { B(0.05, 0.22, z1 - z0 + 2 * o, x, yo - 0.1, (z0 + z1) / 2, WHITE); const gu = new THREE.CylinderGeometry(0.065, 0.065, z1 - z0 + 2 * o, 8, 1, true, 0, Math.PI); gu.rotateX(Math.PI / 2); gu.translate(x + (x < xm ? -0.06 : 0.06), yo - 0.2, (z0 + z1) / 2); col(gu, BLACK); }
      { const rg = new THREE.CylinderGeometry(0.09, 0.09, z1 - z0 + 2 * o, 8, 1, false, 0, Math.PI); rg.rotateX(Math.PI / 2); rg.translate(xm, yr - 0.02, (z0 + z1) / 2); col(rg, 0x8a3a20); }
    }
  }
  // a lean-to: one tiled slope from the low side up to the high side ('x+': rising towards +x, 'z+': towards +z)
  function leanTo(x0, x1, z0, z1, dir, ylo, yhi, o = 0.25) {
    if (dir === 'x+') { poly('tile', [[x0 - o, ylo, z1 + o], [x0 - o, ylo, z0 - o], [x1, yhi, z0 - o], [x1, yhi, z1 + o]], ([x, y, z]) => [z / 1.2, Math.hypot(x - (x0 - o), y - ylo) / 1.2]);
      B(0.05, 0.22, z1 - z0 + 2 * o, x0 - o, ylo - 0.1, (z0 + z1) / 2, WHITE);
      for (const z of [z0, z1]) poly('board', [[x0, Y0, z], [x1, Y0, z], [x1, yhi, z], [x0, ylo, z]], ([x, y]) => [x / 1.2, y / 1.2]); }
    else { poly('tile', [[x0 - o, ylo, z0 - o], [x1 + o, ylo, z0 - o], [x1 + o, yhi, z1], [x0 - o, yhi, z1]], ([x, y, z]) => [x / 1.2, Math.hypot(z - (z0 - o), y - ylo) / 1.2]);
      B(x1 - x0 + 2 * o, 0.22, 0.05, (x0 + x1) / 2, ylo - 0.1, z0 - o, WHITE);
      for (const x of [x0, x1]) poly('board', [[x, Y0, z0], [x, Y0, z1], [x, yhi, z1], [x, ylo, z0]], ([, y, z]) => [z / 1.2, y / 1.2]); }
  }

  // ---------------------------------------------------------------- windows: white uPVC casements with top openers
  // on a wall facing (nx, nz) at the point (x, z): w x h, its middle at height y. Panes: how many side by side
  const win = (x, z, nx, nz, y, w, h, panes = 2, frosted = false) => {
    const ux = -nz, uz = nx, ry = Math.atan2(-uz, ux), at = (s, d) => [x + ux * s + nx * d, z + uz * s + nz * d];
    (k.wxWindows = k.wxWindows || []).push({ x: x + nx * 0.062, z: z + nz * 0.062, nx, nz, y, w, h });      // (weather.js: lit up at night)
    { const [px, pz] = at(0, 0.03); B(w, h, 0.04, px, y, pz, frosted ? 0xdfe8ec : GLASS, ry); }
    if (!frosted) { const [px, pz] = at(0, 0.045); B(w * 0.94, h * 0.3, 0.02, px, y + h * 0.3, pz, SKY, ry); }            // the sky in the top half
    const fr = (ww, hh, s, yy) => { const [px, pz] = at(s, 0.07); B(ww, hh, 0.07, px, yy, pz, WHITE, ry); };
    fr(w + 0.1, 0.07, 0, y + h / 2); fr(w + 0.1, 0.07, 0, y - h / 2); fr(0.07, h + 0.1, -w / 2, y); fr(0.07, h + 0.1, w / 2, y);
    for (let i = 1; i < panes; i++) fr(0.06, h, -w / 2 + i * w / panes, y);
    fr(w, 0.06, 0, y + h * 0.22);                                                                           // the transom: the top openers above it
    { const [px, pz] = at(0, 0.1); B(w + 0.2, 0.05, 0.14, px, y - h / 2 - 0.06, pz, WHITE, ry); }        // the sill
  };
  // left wing, front (its upper floor), with room for the name
  for (const x of [-8.9, -6.6]) win(x, -15.12 - 0.02, 0, -1, 4.35, 1.0, 1.1);
  for (const z of [-13.4, -10.6]) win(-10.2 - 0.02, z, -1, 0, 4.35, 1.0, 1.1);                     // its far end
  // the tall block: two up the middle floor, one at the top, and down its sides
  for (const x of [2.55, 4.95]) win(x, -14.24 - 0.02, 0, -1, 4.35, 0.95, 1.1);
  win(3.75, -14.24 - 0.02, 0, -1, 6.95, 0.9, 1.0);
  for (const z of [-12.6, -9.4]) { win(6.12 + 0.02, z, 1, 0, 4.35, 0.95, 1.1); win(6.12 + 0.02, z, 1, 0, 6.95, 0.9, 1.0); win(1.4 - 0.02, z, -1, 0, 4.35, 0.95, 1.1); }
  // the right wing: the big windows at the front (like the photo's), then all down its side and on the back
  for (const x of [7.25, 9.55]) win(x, -6.84 - 0.02, 0, -1, 4.3, 1.5, 1.35, 3);
  for (const z of [-4.2, -0.8, 2.6, 6.0]) win(10.68 + 0.02, z, 1, 0, 4.3, 1.3, 1.25, 2);
  win(8.4, 7.92 + 0.02, 0, 1, 4.3, 1.3, 1.25, 2);
  // the back of the pub (seen over the conservatory from the garden)
  for (const x of [-8.2, -5.4, -2.6, 0.2, 3.0]) win(x, 7.92 + 0.02, 0, 1, 4.3, 1.1, 1.15, 2);
  // the ground floor at the front: frosted toilet windows in white frames
  for (const x of [-8.6, -6.4]) win(x, -16.08 - 0.12, 0, -1, 2.0, 0.75, 0.6, 2, true);
  for (const x of [-3.2, -1.6]) win(x, -15.12 - 0.12, 0, -1, 2.0, 0.75, 0.6, 2, true);

  // ---------------------------------------------------------------- downpipes, the name, the plaque
  const pipe = (x, z, yTop) => { const g = new THREE.CylinderGeometry(0.04, 0.04, yTop, 8); g.translate(x, yTop / 2, z); col(g, BLACK);
    for (let y = 0.6; y < yTop; y += 1.2) B(0.1, 0.04, 0.1, x, y, z, BLACK); const sh = new THREE.CylinderGeometry(0.05, 0.04, 0.2, 8); sh.rotateX(-0.6); sh.translate(x, 0.12, z); col(sh, BLACK); };
  for (const [x, z, yt] of [[-10.26, -15.22, 5.25], [0.3, -15.22, 5.25], [1.45, -14.33, 7.9], [6.07, -14.33, 7.9], [6.2, -6.92, 5.25], [10.62, -6.92, 5.25], [10.76, 7.86, 5.25], [-9.66, 7.98, 5.25]]) pipe(x, z, yt);
  // OYSTERFLEET / HOTEL / PUB & RESTAURANT in gold serif capitals on the left wing's boarding
  { const t = canvasTex(1024, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowOffsetY = 4; g.shadowBlur = 4;
      const gold = g.createLinearGradient(0, 0, 0, h); gold.addColorStop(0, '#f2d27a'); gold.addColorStop(0.5, '#c9a24a'); gold.addColorStop(1, '#e8c46a'); g.fillStyle = gold;
      let fs = 150; do { g.font = `700 ${fs}px Georgia, "Times New Roman", serif`; fs -= 4; } while (g.measureText('OYSTERFLEET').width > w - 40); g.fillText('OYSTERFLEET', w / 2, 130); g.font = '700 92px Georgia, serif'; g.fillText('HOTEL', w / 2, 290); g.font = '700 86px Georgia, serif'; g.fillText('PUB & RESTAURANT', w / 2, 420); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 2.0), new THREE.MeshLambertMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); m.position.set(-2.55, 4.25, -15.12 - 0.07); m.rotation.y = Math.PI; scene.add(m); }
  // the blue plaque
  { const t = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#1d4f9c'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.stroke();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 22px Georgia, serif'; ['THE OYSTERFLEET', '—', 'A HOUSE OF', 'GOOD CHEER', 'SINCE 1820'].forEach((s, i) => g.fillText(s, 128, 72 + i * 28)); });
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.24, 32), new THREE.MeshLambertMaterial({ map: t })); m.position.set(2.75, 2.1, -14.16 - 0.15); m.rotation.y = Math.PI; scene.add(m); }

  // ---------------------------------------------------------------- the entrance porch
  // built out from the door (on the angled corner), facing the car park. s: across the porch; d: out from the door
  { const dx0 = 4.2, dz0 = -14.16, dx1 = 5.64, dz1 = -13.2, L = Math.hypot(dx1 - dx0, dz1 - dz0), ux = (dx1 - dx0) / L, uz = (dz1 - dz0) / L, nx = uz, nz = -ux;   // (n: out of the building)
    const cx = (dx0 + dx1) / 2, cz = (dz0 + dz1) / 2, ry = Math.atan2(-uz, ux), out = Math.atan2(nx, nz), P = (s, d) => [cx + ux * s + nx * d, cz + uz * s + nz * d];
    const M = new THREE.Matrix4().makeRotationY(ry).setPosition(cx, 0, cz);      // porch space (x = s, y, z = -d) to the world
    const pb = (w, h, dd, s, y, d, c) => { const [x, z] = P(s, d); B(w, h, dd, x, y, z, c, ry); };
    const pt = (kind, w, h, dd, s, y, d) => { const [x, z] = P(s, d); TB(kind, w, h, dd, x, y, z, ry, kind === 'brick' ? 1.2 : 1.2); };
    const SW = 1.12, DP = 1.95, OAK = 0x3a2416, MAROON = 0x7a1a2e;
    // the floor: red quarry tiles; the step
    pb(2 * SW + 0.2, 0.03, DP + 0.1, 0, 0.015, DP / 2, 0x7a3326); pb(2 * SW + 0.3, 0.08, 0.3, 0, 0.04, DP + 0.12, 0x8a8680);
    // brick dwarf walls: both sides, and the front either side of the doorway
    for (const s of [-SW, SW]) { pt('brick', 0.22, 0.92, DP - 0.05, s, 0.46, DP / 2 + 0.02); pb(0.28, 0.06, DP, s, 0.95, DP / 2 + 0.02, 0xc8c0b2); }
    for (const s of [-(SW + 0.5) / 2 - 0.02, (SW + 0.5) / 2 + 0.02]) { pt('brick', SW - 0.5, 0.92, 0.22, s, 0.46, DP - 0.09); pb(SW - 0.44, 0.06, 0.28, s, 0.95, DP - 0.09, 0xc8c0b2); }
    // the timber frame: corner posts, door posts, the head beam, a plate along each side
    for (const [s, d] of [[-SW, DP - 0.06], [SW, DP - 0.06], [-SW, 0.06], [SW, 0.06], [-0.5, DP - 0.06], [0.5, DP - 0.06]]) pb(0.14, 2.42, 0.14, s, 1.21, d, OAK);
    pb(2 * SW + 0.14, 0.18, 0.16, 0, 2.33, DP - 0.06, OAK); for (const s of [-SW, SW]) pb(0.16, 0.16, DP, s, 2.34, DP / 2, OAK);
    for (const s of [-0.5, 0.5]) pb(0.04, 2.15, 0.06, s * 0.96, 1.08, DP - 0.12, 0x2a1a10);         // door stops
    // the leaded windows, arched at the top, on the front either side of the door and down both sides
    const lead = leadedTex(), lm = new THREE.MeshLambertMaterial({ map: lead, side: THREE.DoubleSide });
    const lw = (s, d, w, face) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.18), lm); const [x, z] = P(s, d); m.position.set(x, 1.6, z); m.rotation.y = face; scene.add(m); };
    lw(-(SW + 0.5) / 2, DP - 0.06, SW - 0.6, out); lw((SW + 0.5) / 2, DP - 0.06, SW - 0.6, out);
    for (const s of [-SW, SW]) for (const d of [0.55, 1.4]) lw(s, d, 0.62, out + (s < 0 ? -Math.PI / 2 : Math.PI / 2));
    // window boxes of flowers under the front windows, hanging baskets on the front corners
    const flowers = (x, y, z, n, r) => { for (let i = 0; i < n; i++) { const g = new THREE.IcosahedronGeometry(r * (0.6 + rnd() * 0.6), 0); g.translate(x + (rnd() - 0.5) * 0.45, y + rnd() * 0.12, z + (rnd() - 0.5) * 0.2); col(g, [0xe8457a, 0xf4f4f4, 0x9b4fd1, 0xd8243a, 0xffb3d1, 0xffd400][Math.floor(rnd() * 6)]); }
      for (let i = 0; i < n; i++) { const g = new THREE.IcosahedronGeometry(r * (0.8 + rnd() * 0.5), 0); g.translate(x + (rnd() - 0.5) * 0.5, y - 0.04 + rnd() * 0.08, z + (rnd() - 0.5) * 0.24); col(g, [0x2e6b2a, 0x3f8a32, 0x245a22][Math.floor(rnd() * 3)]); } };
    for (const s of [-(SW + 0.5) / 2, (SW + 0.5) / 2]) { pb(SW - 0.55, 0.16, 0.2, s, 1.06, DP + 0.08, 0x2a2a2a); const [x, z] = P(s, DP + 0.08); flowers(x, 1.2, z, 16, 0.045);
      for (let i = 0; i < 5; i++) { const [tx, tz] = P(s - 0.2 + i * 0.1, DP + 0.2); const g = new THREE.CylinderGeometry(0.012, 0.008, 0.25 + rnd() * 0.15, 4); g.translate(tx, 0.95, tz); col(g, 0x3f8a32); } }
    for (const s of [-SW - 0.25, SW + 0.25]) { const [x, z] = P(s, DP + 0.05); B(0.04, 0.04, 0.4, x, 2.25, z, BLACK, ry); const bk = new THREE.SphereGeometry(0.18, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); bk.translate(x, 1.92, z); col(bk, 0x2a1a10); flowers(x, 1.98, z, 22, 0.05); }
    // the doors: pinned back open against the sides (inside the porch)
    pb(0.05, 2.05, 0.46, -0.47, 1.06, DP - 0.36, 0x5a3418); pb(0.05, 2.05, 0.46, 0.47, 1.06, DP - 0.36, 0x5a3418);
    for (const s of [-0.44, 0.44]) { pb(0.02, 0.5, 0.3, s, 1.6, DP - 0.36, 0x8ea6ba); pb(0.03, 0.03, 0.12, s * 0.98, 1.05, DP - 0.5, 0xc9a24a); }
    // the ENTRANCE board on the head beam, the lantern under the gable
    pb(2 * SW - 0.1, 0.2, 0.04, 0, 2.53, DP - 0.02, MAROON);
    { const [x, z] = P(0, DP + 0.005); k.label('ENTRANCE', 1.6, 0.17, [x, 2.53, z], [0, out, 0], { bg: '#7a1a2e', fg: '#f4f0e6', border: null, size: 110 }); }
    { const [x, z] = P(0, DP * 0.55); B(0.16, 0.24, 0.16, x, 2.15, z, BLACK, ry); B(0.11, 0.17, 0.11, x, 2.14, z, 0xffe8a8, ry); k.halo(x, 2.14, z, 0.8, 0xffd890); }
    // the roof: a little gable of orange tiles, white bargeboards, the big maroon "Hotel & Pub" sign filling the front
    const ye = 2.62, yr = 3.72, ov = 0.28, half = SW + 0.3, d0 = -0.1, d1 = DP + ov;
    const toW = (s, y, d) => { const v = new THREE.Vector3(s, y, -d).applyMatrix4(M); return [v.x, v.y, v.z]; };
    for (const sg of [-1, 1]) poly('tile', [toW(sg * half, ye, d0), toW(sg * half, ye, d1), toW(0, yr, d1), toW(0, yr, d0)].map((p, i) => p), (p) => { const v = new THREE.Vector3(...p).sub(new THREE.Vector3(cx, 0, cz)); return [v.dot(new THREE.Vector3(nx, 0, nz)) / 1.2, (p[1] - ye) / 0.7 / 1.2 * 1.6]; });
    const sl = Math.hypot(half, yr - ye);
    for (const sg of [-1, 1]) { const g = new THREE.BoxGeometry(sl + 0.08, 0.26, 0.06); g.rotateZ(sg * -Math.atan2(yr - ye, half)); g.translate(sg * half / 2, (ye + yr) / 2 - 0.1, -(d1 + 0.01)); g.applyMatrix4(M); col(g, WHITE); }
    for (const sg of [-1, 1]) { const g = new THREE.BoxGeometry(0.05, 0.2, d1 - d0); g.translate(sg * (half + 0.02), ye - 0.08, -(d0 + d1) / 2); g.applyMatrix4(M); col(g, WHITE);
      const gu = new THREE.CylinderGeometry(0.055, 0.055, d1 - d0, 8, 1, true, 0, Math.PI); gu.rotateX(Math.PI / 2); gu.translate(sg * (half + 0.07), ye - 0.18, -(d0 + d1) / 2); gu.applyMatrix4(M); col(gu, BLACK); }
    { const rg = new THREE.CylinderGeometry(0.07, 0.07, d1 - d0, 8, 1, false, 0, Math.PI); rg.rotateX(Math.PI / 2); rg.rotateZ(Math.PI / 2); rg.translate(0, yr - 0.01, -(d0 + d1) / 2); rg.applyMatrix4(M); col(rg, 0x8a3a20); }
    // the sign: a maroon triangle with a white edge, the O, "Hotel & Pub"
    { const t = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#7a1a2e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f4f0e6'; g.lineWidth = 10; g.beginPath(); g.moveTo(14, h - 8); g.lineTo(w / 2, 10); g.lineTo(w - 14, h - 8); g.closePath(); g.stroke();
        oLogo(g, w / 2, 130, 44); g.fillStyle = '#f4f0e6'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '400 52px "Trebuchet MS", Arial, sans-serif'; g.fillText('Hotel & Pub', w / 2, 212); });
      const sw2 = half - 0.08, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-sw2, ye + 0.02, 0, sw2, ye + 0.02, 0, 0, yr - 0.08, 0], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide })); const [x, z] = P(0, DP + 0.14); m.position.set(x, 0, z); m.rotation.y = out; scene.add(m); }
    // you walk round it and through it, not into its walls
    const wallBlk = (s0, d0b, s1, d1b) => { for (let f = 0; f <= 1.0001; f += 0.1) { const [x, z] = P(s0 + (s1 - s0) * f, d0b + (d1b - d0b) * f); blk(x - 0.13, z - 0.13, x + 0.13, z + 0.13, 2.4); } };
    wallBlk(-SW, 0.05, -SW, DP); wallBlk(SW, 0.05, SW, DP); wallBlk(-SW, DP - 0.09, -0.55, DP - 0.09); wallBlk(0.55, DP - 0.09, SW, DP - 0.09);
    // the maroon A-board out on the pavement, to the left of the porch
    { const [x, z] = P(-SW - 1.05, 1.0), ab = canvasTex(256, 384, (g, w, h) => { g.fillStyle = '#7a1a2e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f4f0e6'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
        oLogo(g, w / 2, 90, 40); g.fillStyle = '#f4f0e6'; g.textAlign = 'center'; g.font = '400 34px "Trebuchet MS", Arial'; g.fillText('Hotel & Pub', w / 2, 172); g.font = '700 22px Arial'; ['FOOD SERVED DAILY', '12 – 9PM', '', 'SUNDAY ROASTS', 'RONNIE: ONE (1) EACH'].forEach((s, i) => g.fillText(s, w / 2, 222 + i * 30)); });
      for (const sg of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.85), new THREE.MeshLambertMaterial({ map: ab, side: THREE.DoubleSide })); m.position.set(x + nx * sg * 0.12, 0.47, z + nz * sg * 0.12); m.rotation.set(0, out, 0); m.rotateX(sg * 0.14); scene.add(m); }
      blk(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 0.9); }
  }

  // ---------------------------------------------------------------- round the right: side door, railings, the sign
  { const x = 5.64 + 0.11;
    B(0.06, 2.05, 0.92, x, 1.03, -12.55, 0x5a3418); B(0.08, 2.15, 1.02, x - 0.01, 1.07, -12.55, 0x3a2416);
    for (const yy of [0.5, 1.45]) B(0.02, 0.6, 0.7, x + 0.035, yy, -12.55, 0x6a4020); B(0.04, 0.04, 0.14, x + 0.05, 1.05, -12.2, 0xc9a24a);
    k.label('PRIVATE · STAFF ONLY', 0.5, 0.3, [x + 0.04, 1.55, -12.9 - 0.25], [0, Math.PI / 2, 0], { bg: '#7a1a2e', fg: '#f4f0e6', border: null, size: 54 });
    k.label('THE LIGHTHOUSE BAR\nSPORTS · POOL · DARTS\nALL WELCOME', 1.0, 0.62, [x + 0.02, 1.7, -11.65], [0, Math.PI / 2, 0], { bg: '#fbfaf6', fg: '#1b3a5a', border: '#8a8a8a', size: 46 });
    for (let z = -13.05; z <= -11.4; z += 0.33) { const g = new THREE.CylinderGeometry(0.018, 0.018, 1.0, 6); g.translate(5.98, 0.5, z); col(g, BLACK); }
    B(0.04, 0.04, 1.7, 5.98, 1.0, -12.22, BLACK); B(0.03, 0.03, 1.7, 5.98, 0.55, -12.22, BLACK);
    for (let z = -12.9; z <= -11.5; z += 0.7) { const g = new THREE.BoxGeometry(0.02, 0.6, 0.02); g.rotateX(0.75); g.translate(5.98, 0.78, z + 0.18); col(g, BLACK); }
    blk(5.9, -13.1, 6.05, -11.35, 1.1);
    // a hanging basket by the downpipe
    { const bx = 5.8, bz = -11.15; B(0.4, 0.04, 0.04, bx + 0.1, 2.3, bz, BLACK); const bk = new THREE.SphereGeometry(0.17, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); bk.translate(bx + 0.25, 1.98, bz); col(bk, 0x2a1a10);
      for (let i = 0; i < 22; i++) { const g = new THREE.IcosahedronGeometry(0.045, 0); g.translate(bx + 0.25 + (rnd() - 0.5) * 0.35, 2.02 + rnd() * 0.12, bz + (rnd() - 0.5) * 0.35); col(g, [0xe8457a, 0xf4f4f4, 0x9b4fd1, 0x2e6b2a, 0x3f8a32][Math.floor(rnd() * 5)]); } }
  }

  // ---------------------------------------------------------------- finish: one mesh per material
  for (const [kind, map] of [['brick', BRICK], ['board', BOARD], ['tile', TILE]]) { if (!tex[kind].length) continue;
    map.wrapS = map.wrapT = THREE.RepeatWrapping; const g = mergeGeometries(tex[kind].map(x => x.index ? x.toNonIndexed() : x), false);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map, side: kind === 'board' || kind === 'tile' ? THREE.DoubleSide : THREE.FrontSide })); scene.add(m); }
  return { BRICK };
}
