// THE PINT: one Guinness (well, the game's parody GUINNESS STOUT) for the whole game. Every pint you see is built here:
// the food item (and so the squad's props, Run the Pub's punters and shelves, Prop Hunt's pint and Imposter's kit), the
// emotes and Aidan's attack.
//   - a nonic pint glass: the bulge near the top, a thick heavy base, a real rim with glass thickness, a lighter rim band
//     and highlights down the side (the see-through glass look, done with vertex colours: no new material)
//   - near-black stout with a ruby glow where the light gets through at the bottom
//   - a thick creamy head with a slight dome, and the tan line where it meets the stout
//   - a gold harp and GUINNESS in plain block capitals on the glass (no real artwork: a made-up harp, a plain font)
//   - condensation beads, and a drip running down to the base
// pintGeo(): the whole pint as ONE merged, vertex-coloured geometry (one draw, the shared vcLambert material).
// pintGeoLow(): the same pint with fewer pieces (far away: Run the Pub has a lot of pints about).
// pintModel(): the same pint in parts that move (the stout's level, the head sliding when it tips): emotes, attacks.
// Sizes are in metres, centred on the glass (base at y = -0.075, rim at +0.075), as the pint always was.
import * as THREE from 'three';
import { part, merge, vcLambert, sph } from './geo.js';

const SEG = 22;
// the glass, outside: (radius, height) from the base up. A nonic: straight taper, the bulge 2.5cm below the rim
const OUT = [[0.0300, -0.0750], [0.0318, -0.0742], [0.0322, -0.0700], [0.0390, 0.0330], [0.0418, 0.0470], [0.0425, 0.0520], [0.0414, 0.0590], [0.0404, 0.0680], [0.0406, 0.0750]];
const WALL = 0.0022, FLOOR = -0.0655;          // (glass thickness; the top of the heavy base)
const HEAD0 = 0.046, HEAD1 = 0.0685;           // (where the head starts, where it meets the glass: 2.25cm of cream)
export const PINT = { bottom: -0.075, top: 0.075, floor: FLOOR, head0: HEAD0, head1: HEAD1, logoY: 0.006, gY: -0.0185 };
// the outside radius at a height (straight lines between the profile points)
export function pintRadius(y) {
  if (y <= OUT[0][1]) return OUT[0][0];
  for (let i = 1; i < OUT.length; i++) if (y <= OUT[i][1]) { const [r0, y0] = OUT[i - 1], [r1, y1] = OUT[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); }
  return OUT[OUT.length - 1][0];
}
const inner = (y) => pintRadius(y) - WALL;

// colours
const C = {
  stoutTop: 0x120b08, stout: 0x0d0806, ruby: 0x4a0f09, rubyDeep: 0x2a0806,
  tan: 0xb08a5a, head: 0xf1e4c2, headTop: 0xf7eed6,
  glass: 0xd4e6ea, glassLit: 0xf2fbfc, glassBase: 0x7d9396, glassBaseLit: 0xb7cdd0,
  shine: 0x6c6a6a, shine2: 0xa9a7a4, gold: 0xd4a937, goldLit: 0xf2cf5c, word: 0xf3ead2, bead: 0x9aa3aa, beadLit: 0xd6e2e8,
};

// a lathe from (radius, height) points, painted with a colour per height (a gradient up the glass)
function lathe(pts, colAt, seg = SEG, phi0 = 0, phiLen = Math.PI * 2) {
  let g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), seg, phi0, phiLen);
  g = part(g, 0xffffff);
  const pos = g.attributes.position, col = g.attributes.color, c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { c.set(colAt(pos.getY(i), pos.getX(i), pos.getZ(i))); col.setXYZ(i, c.r, c.g, c.b); }
  g.computeVertexNormals();
  return g;
}
const mix = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), Math.min(1, Math.max(0, k))).getHex();
// a flat bit stuck on the glass's surface (wrapped round it): u = across (metres round the front), y = up
function onGlass(geo, color, u, y, rz = 0, lift = 0.0007, rOver = null, front = 0) {
  const r = (rOver ?? pintRadius(y)) + lift, th = front + u / r;
  return part(geo, color, [Math.sin(th) * r, y, Math.cos(th) * r], [0, th, rz]);
}

// ---- the parts
function glassBase() {          // the thick heavy base: pale glass round the side, the stout's ruby showing through on top
  return lathe([[0, -0.075], [0.0296, -0.075], [0.0318, -0.0742], [0.0322, -0.07], [0.0324, FLOOR], [0.028, FLOOR + 0.0004], [0, FLOOR + 0.0004]],
    (y, x, z) => { const k = (y + 0.075) / 0.0095, side = Math.atan2(x, z); return mix(C.glassBaseLit, mix(C.glassBase, C.rubyDeep, k * 0.8), 0.4 + 0.5 * Math.abs(Math.sin(side * 1.5))); });
}
function stoutBody(top = HEAD0, seg = SEG) {         // the stout, just inside the glass: ruby at the very bottom, near-black above
  const pts = [[0, FLOOR + 0.0004]]; for (let k = 0; k <= 8; k++) { const y = FLOOR + 0.0004 + (top - FLOOR - 0.0004) * k / 8; pts.push([pintRadius(y) - 0.0004, y]); }
  pts.push([0, top]);
  return lathe(pts, (y) => { const k = (y - FLOOR) / (top - FLOOR); return k < 0.12 ? mix(C.ruby, C.rubyDeep, k / 0.12) : k < 0.3 ? mix(C.rubyDeep, C.stout, (k - 0.12) / 0.18) : mix(C.stout, C.stoutTop, (k - 0.3) / 0.7); }, seg);
}
function headBand(seg = SEG) {  // the head seen through the glass: a tan line at the bottom, cream above
  const pts = []; for (let k = 0; k <= 4; k++) { const y = HEAD0 + (HEAD1 - HEAD0) * k / 4; pts.push([pintRadius(y) - 0.0004, y]); }
  return lathe(pts, (y) => { const k = (y - HEAD0) / (HEAD1 - HEAD0); return k < 0.15 ? mix(C.tan, C.head, k / 0.15) : C.head; }, seg);
}
function headDome(seg = SEG, at = HEAD1) {          // the top of the head: a gentle dome, sitting just inside the rim
  const r = inner(at) - 0.0002;
  return lathe([[r, at - 0.0006], [r * 0.93, at + 0.0016], [r * 0.7, at + 0.0034], [r * 0.38, at + 0.0044], [0, at + 0.0047]], (y) => mix(C.head, C.headTop, (y - at) / 0.0047), seg);
}
function rimBand(seg = SEG) {   // the empty glass above the head: out, over the lip, back down inside
  const y0 = HEAD1 - 0.0005, ro = (y) => pintRadius(y);
  return lathe([[ro(y0) + 0.00005, y0], [ro(0.072), 0.072], [ro(0.075), 0.075], [ro(0.075) - WALL * 0.5, 0.0757], [ro(0.075) - WALL, 0.075], [inner(0.072), 0.072], [inner(y0), y0]],
    (y, x, z) => { const th = Math.atan2(x, z), lit = Math.max(0, Math.cos(th - 0.6)) ** 6; return mix(y > 0.0745 ? C.glassLit : C.glass, C.glassLit, lit); }, seg);
}
function shine(y0, y1, th, w, col, lift = 0.0005) {      // a highlight down the glass (the light catching it)
  const pts = []; for (let k = 0; k <= 6; k++) { const y = y0 + (y1 - y0) * k / 6; pts.push([pintRadius(y) + lift, y]); }
  return lathe(pts, () => col, 3, th - w / 2, w);
}
function bulgeLine() { return shine(0.0505, 0.0535, 0, Math.PI * 2, C.glassLit, 0.0003); }
// a harp (made up for the game: a pillar, a curved neck, a sound box and strings), gold, on the glass
function harp(parts, y = PINT.logoY, s = 1, front = 0) {
  const g = (geo, col, u, yy, rz = 0) => parts.push(onGlass(geo, col, u * s, y + yy * s, rz, 0.0007, null, front));
  const bx = (w, h) => new THREE.PlaneGeometry(w * s, h * s);
  const P0 = [-0.0095, -0.0125], P1 = [-0.0095, 0.0105], S0 = [-0.0075, -0.0125], S1 = [0.0095, 0.0125];      // (the pillar, the sound box: its foot to its top)
  g(bx(0.0026, P1[1] - P0[1]), C.gold, P0[0], (P0[1] + P1[1]) / 2);                                            // the pillar, at the front
  { const dx = S1[0] - S0[0], dy = S1[1] - S0[1]; g(bx(0.0042, Math.hypot(dx, dy)), C.gold, (S0[0] + S1[0]) / 2, (S0[1] + S1[1]) / 2, -Math.atan2(dx, dy)); }      // the sound box, on the slant
  const neckY = (u) => { const a = (u - P1[0]) / (S1[0] - P1[0]); return P1[1] + (S1[1] - P1[1]) * a + Math.sin(a * Math.PI) * 0.0034 - Math.sin(a * Math.PI * 2) * 0.0012; };
  for (let k = 0; k < 8; k++) { const u0 = P1[0] + (S1[0] - P1[0]) * k / 8, u1 = P1[0] + (S1[0] - P1[0]) * (k + 1) / 8, y0 = neckY(u0), y1 = neckY(u1);      // the neck, curving over the top
    g(bx(Math.hypot(u1 - u0, y1 - y0) + 0.0008, 0.0026), C.gold, (u0 + u1) / 2, (y0 + y1) / 2, Math.atan2(y1 - y0, u1 - u0)); }
  for (let k = 0; k < 6; k++) { const u = -0.0068 + k * 0.0025, top = neckY(u) - 0.0008, bot = S0[1] + (u - S0[0]) * (S1[1] - S0[1]) / (S1[0] - S0[0]) + 0.0012;      // strings, shorter to the back
    if (top - bot > 0.002) g(bx(0.0006, top - bot), C.goldLit, u, (top + bot) / 2); }
  g(bx(S0[0] - P0[0] + 0.0026, 0.0022), C.gold, (P0[0] + S0[0]) / 2, P0[1] + 0.0002);                         // the foot
}
// GUINNESS in plain 3x5 block capitals, cream, round the glass: each lit pixel run is a tiny strip on the surface
const FONT = { G: ['111', '100', '101', '101', '111'], U: ['101', '101', '101', '101', '111'], I: ['111', '010', '010', '010', '111'], N: ['101', '111', '111', '111', '101'], E: ['111', '100', '110', '100', '111'], S: ['111', '100', '111', '001', '111'] };
function word(parts, text = 'GUINNESS', y = PINT.gY, px = 0.0017, front = 0) {
  const cols = text.length * 4 - 1, x0 = -cols * px / 2;
  [...text].forEach((ch, i) => { const f = FONT[ch]; if (!f) return;
    for (let row = 0; row < 5; row++) { const bits = f[row]; let c = 0;
      while (c < 3) { if (bits[c] !== '1') { c++; continue; } let e = c; while (e + 1 < 3 && bits[e + 1] === '1') e++;
        const w = (e - c + 1) * px, u = x0 + (i * 4 + c) * px + w / 2 - px / 2, yy = y + (2 - row) * px;
        parts.push(onGlass(new THREE.PlaneGeometry(w, px), C.word, u, yy, 0, 0.0007, null, front)); c = e + 1; } } });
}
// condensation: beads on the cold glass, and one drip running down to the base
const BEADS = [[2.2, -0.04], [2.6, 0.0], [2.9, -0.055], [3.3, 0.02], [3.7, -0.02], [4.1, 0.035], [-1.2, -0.035], [-1.6, 0.015], [-2.0, -0.058], [-2.4, 0.03], [1.25, 0.03], [1.5, -0.048], [-0.95, 0.04], [0.95, -0.06], [3.0, 0.042], [-2.8, -0.01]];
function condensation(parts, n = BEADS.length) {
  for (let i = 0; i < n; i++) { const [th, y] = BEADS[i], r = pintRadius(y) + 0.0005, s = 0.0011 + (i % 3) * 0.0004;
    parts.push(part(new THREE.IcosahedronGeometry(s, 0), i % 4 ? C.bead : C.beadLit, [Math.sin(th) * r, y, Math.cos(th) * r], [0, th, 0], [1, 1.25, 0.45])); }
  // the drip: a trail down the side and a bead hanging at the bottom of it
  const th = 0.55, y0 = 0.03, y1 = -0.068;
  for (let k = 0; k < 6; k++) { const y = y0 + (y1 - y0) * k / 6, yN = y0 + (y1 - y0) * (k + 1) / 6, r = pintRadius((y + yN) / 2) + 0.0005;
    parts.push(part(new THREE.CylinderGeometry(0.0006 + k * 0.00008, 0.0006 + k * 0.00008, Math.abs(yN - y) + 0.001, 4), C.bead, [Math.sin(th) * r, (y + yN) / 2, Math.cos(th) * r], [0, th, 0], [1, 1, 0.5])); }
  parts.push(part(sph(0.0019, 6, 5), C.beadLit, [Math.sin(th) * (pintRadius(y1) + 0.0012), y1 + 0.001, Math.cos(th) * (pintRadius(y1) + 0.0012)], [0, th, 0], [1, 1.35, 0.6]));
}

// ---- the whole pint (one geometry)
let _hi = null, _low = null;
export function pintGeo() {
  if (_hi) return _hi;
  const p = [glassBase(), stoutBody(), headBand(), headDome(), rimBand(), bulgeLine(),
    shine(-0.066, 0.066, 0.75, 0.1, C.shine), shine(-0.05, 0.045, 0.83, 0.035, C.shine2, 0.0006), shine(-0.06, 0.06, -2.3, 0.07, C.shine)];
  harp(p); word(p); condensation(p);
  _hi = merge(p); _hi.userData.shared = true; _hi.userData.pint = 'hi'; return _hi;
}
export function pintGeoLow() {
  if (_low) return _low;
  const p = [glassBase(), stoutBody(HEAD0, 12), headBand(12), headDome(12), rimBand(12), shine(-0.066, 0.066, 0.75, 0.12, C.shine)];
  harp(p);
  _low = merge(p); _low.userData.shared = true; _low.userData.pint = 'low'; return _low;
}
// (every pint geometry is tagged userData.pint, so tests can find every pint in a scene)
// (how many vertices each has: tests keep them sensible)
export const pintStats = () => ({ hi: pintGeo().attributes.position.count, low: pintGeoLow().attributes.position.count });

// ---- a pint that drinks: the glass (see-through), the stout whose level drops, the head riding on top
// (the see-through glass is a plain transparent two-sided Lambert, a kind the shader warm-up already makes: 'Ldt')
let GLASS_MAT = null, _deco = null, _shell = null;
function decoGeo() {             // everything that stays put: base, rim, highlights, harp, word, beads
  if (_deco) return _deco;
  const p = [glassBase(), rimBand(), bulgeLine(), shine(-0.066, 0.066, 0.75, 0.1, C.shine2), shine(-0.06, 0.06, -2.3, 0.07, C.shine)];
  harp(p); word(p); condensation(p);
  _deco = merge(p); _deco.userData.shared = true; _deco.userData.pint = 'model'; return _deco;
}
function shellGeo() {
  if (_shell) return _shell;
  const pts = []; for (let k = 0; k <= 12; k++) { const y = FLOOR + (HEAD1 - FLOOR) * k / 12; pts.push(new THREE.Vector2(pintRadius(y) - 0.0001, y)); }
  _shell = new THREE.LatheGeometry(pts, SEG); _shell.userData.shared = true; return _shell;
}
export function pintModel() {
  if (!GLASS_MAT) { GLASS_MAT = new THREE.MeshLambertMaterial({ color: 0xe4f2f5, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }); GLASS_MAT.userData.keep = true; }
  const g = new THREE.Group(); g.name = 'pint';
  const stoutGeo = stoutBody(HEAD0, SEG); const P = stoutGeo.attributes.position, rest = new Float32Array(P.array);
  const stout = new THREE.Mesh(stoutGeo, vcLambert); stout.name = 'stout'; stout.userData.rest = rest; g.add(stout);
  const head = new THREE.Group(); head.name = 'head'; g.add(head);
  const hb = new THREE.Mesh(headBand(SEG), vcLambert), hd = new THREE.Mesh(headDome(SEG), vcLambert), hin = new THREE.Group(); hin.position.y = -HEAD0; hin.add(hb, hd); head.add(hin);      // (its pivot: the bottom of the head)
  const deco = new THREE.Mesh(decoGeo(), vcLambert); deco.name = 'deco'; g.add(deco);
  const shell = new THREE.Mesh(shellGeo(), GLASS_MAT); shell.name = 'glass'; shell.renderOrder = 1; g.add(shell);
  g.userData.level = 1; setPintLevel(g, 1);
  return g;
}
// lvl: 1 full, 0 empty. tilt: how far the glass is tipped (radians), the head slides down the high side and the surface
// tries to stay level
export function setPintLevel(g, lvl, tilt = 0) {
  lvl = Math.min(1, Math.max(0, lvl)); g.userData.level = lvl;
  const stout = g.getObjectByName('stout'), head = g.getObjectByName('head'); if (!stout || !head) return;
  // the stout's top drops (the head goes down with it); its sides keep to the glass all the way
  const span = HEAD0 - FLOOR, top = FLOOR + span * lvl, P = stout.geometry.attributes.position, rest = stout.userData.rest;
  for (let i = 0; i < P.count; i++) { const x = rest[i * 3], y = rest[i * 3 + 1], z = rest[i * 3 + 2], k = (y - FLOOR) / span, ny = FLOOR + (top - FLOOR) * Math.max(0, k);
    const r0 = Math.hypot(x, z), want = r0 < 1e-5 ? 0 : pintRadius(ny) - 0.0004, s = r0 < 1e-5 ? 0 : want / r0;
    P.setXYZ(i, x * s, Math.max(FLOOR + 0.0004, ny), z * s); }
  P.needsUpdate = true; stout.geometry.computeBoundingSphere(); stout.visible = lvl > 0.015;
  // the head: thinner as it goes (what's left clings on as a lace at the bottom), narrower lower down the glass
  const thick = 0.25 + 0.75 * Math.min(1, lvl * 2.2), w = pintRadius(top + 0.01) / pintRadius(HEAD0 + 0.01);
  head.visible = lvl > 0.02;
  head.scale.set(w, thick, w); head.position.set(0, top, 0);
  // tipped: the surface stays (roughly) level and slides to the low side
  head.rotation.x = -tilt * 0.55; head.position.z = Math.sin(tilt) * 0.006 * Math.min(1, lvl * 3);
}

// ---- someone else's hand round a pint (Aidan's, bringing it to your lips: his attack): the glass, and his right hand
// round it, made to match (skin, sleeve, cuff). The palm on the glass's right side (+x), four fingers wrapped round the
// front (+z, towards you), the thumb round the back, the wrist and forearm (in his sleeve) going off down and away.
// Two meshes, 'farHand' (behind the glass) and 'nearHand' (in front), so it can be drawn in the right order on top of
// everything (attackfx camProp draws without the depth test).
export function pintInHand({ skin = 0xf3cdb4, sleeve = 0x7ec8e3, cuff = 0x7a1f3d } = {}) {
  const g = new THREE.Group(); g.name = 'pint in hand';
  const pint = pintModel(); g.add(pint);
  const near = [], far = [], nail = mix(skin, 0xffffff, 0.45), knuckle = mix(skin, 0x9a5a3a, 0.18);
  const fy = [-0.006, -0.024, -0.041, -0.057], fr = [0.0088, 0.0092, 0.0088, 0.0076], reach = [1.95, 2.05, 1.95, 1.7];
  fy.forEach((y, i) => { const R = pintRadius(y) + fr[i] * 0.85, arc = reach[i];
    // (a finger: three bones' worth of curve round the glass, a knuckle where it leaves the palm, a nail at the tip)
    const t = new THREE.TorusGeometry(R, fr[i], 7, 16, arc); t.rotateX(Math.PI / 2); near.push(part(t, skin, [0, y, 0]));
    near.push(part(sph(fr[i] * 1.12, 8, 6), knuckle, [R, y, 0]));
    const ex = Math.cos(arc) * R, ez = Math.sin(arc) * R; near.push(part(sph(fr[i] * 0.98, 8, 6), skin, [ex, y, ez]));
    near.push(part(sph(fr[i] * 0.62, 6, 4), nail, [ex + Math.cos(arc) * fr[i] * 0.55, y + 0.002, ez + Math.sin(arc) * fr[i] * 0.55], [0, -arc, 0], [1, 0.6, 1])); });
  // the thumb: round the back of the glass, a bit higher than the first finger
  { const y = 0.012, R = pintRadius(y) + 0.0095, t = new THREE.TorusGeometry(R, 0.0102, 7, 12, 1.25); t.rotateX(-Math.PI / 2); far.push(part(t, skin, [0, y, 0]));
    const ex = Math.cos(-1.25) * R, ez = Math.sin(-1.25) * R; far.push(part(sph(0.0104, 8, 6), skin, [ex, y, ez])); far.push(part(sph(0.0066, 6, 4), nail, [ex, y + 0.003, ez], [0, 1.25, 0], [1, 0.6, 1])); }
  // the palm, flat on the glass's side, and the heel of the hand
  { const x = pintRadius(-0.03) + 0.014; far.push(part(new THREE.BoxGeometry(0.024, 0.082, 0.07, 1, 3, 3), skin, [x, -0.03, -0.006]));
    far.push(part(sph(0.03, 10, 8), skin, [x + 0.004, -0.06, -0.014], [0, 0, 0], [0.55, 0.75, 1])); }
  // the wrist and forearm, in his sleeve, off down to the right and away from you
  { const dir = new THREE.Vector3(0.55, -0.62, -0.56).normalize(), base = new THREE.Vector3(pintRadius(-0.05) + 0.02, -0.075, -0.012), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), e = new THREE.Euler().setFromQuaternion(q);
    const at = (d) => base.clone().addScaledVector(dir, d).toArray();
    far.push(part(new THREE.CylinderGeometry(0.024, 0.026, 0.07, 12), skin, at(0.03), e.toArray().slice(0, 3)));
    far.push(part(new THREE.CylinderGeometry(0.036, 0.034, 0.03, 14), cuff, at(0.075), e.toArray().slice(0, 3)));
    far.push(part(new THREE.CylinderGeometry(0.041, 0.037, 0.36, 14), sleeve, at(0.26), e.toArray().slice(0, 3))); }
  const nm = new THREE.Mesh(merge(near), vcLambert), fm = new THREE.Mesh(merge(far), vcLambert); nm.name = 'nearHand'; fm.name = 'farHand';
  g.add(fm, nm); return g;
}
