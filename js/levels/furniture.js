// Proper furniture for Lewis's house: soft sofas and armchairs (rounded cushions, plump arms,
// tilted back cushions, scatter pillows, a throw, little feet), kitchen unit fronts (doors,
// drawers, handles, kick plinth), a TV with a picture on, stair carpet with brass rods, a
// boarded fence, wheelie bins.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { part, cyl } from '../geo.js';
import { canvasTex } from '../textures.js';

const rbox = (w, h, d, r = 0.04) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
const shade = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();

// a sofa (or armchair when seats = 1). Faces local -z, like the chairs; ry turns it.
export function sofa(k, { x, z, len, depth = 0.88, ry = 0, color = 0x5a6a7a, seats = 3, armL = true, armR = true, pillows = 2, throwCol = null, back = true }) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const P = (geo, col, lx, y, lz, rot = [0, 0, 0]) => { const px = x + lx * c + lz * s, pz = z - lx * s + lz * c; k.parts.push(part(geo, col, [px, y, pz], [rot[0], ry + rot[1], rot[2]])); };
  const arm = 0.18, inner = len - (armL ? arm : 0) - (armR ? arm : 0), x0 = -len / 2 + (armL ? arm : 0);
  const dark = shade(color, 0.8), light = shade(color, 1.08);
  P(rbox(len - 0.04, 0.24, depth - 0.06, 0.03), dark, 0, 0.2, 0.0);                                        // the base
  for (const lx of [-len / 2 + 0.08, len / 2 - 0.08]) for (const lz of [-depth / 2 + 0.08, depth / 2 - 0.1]) P(new THREE.CylinderGeometry(0.025, 0.02, 0.08, 8), 0x2a1a10, lx, 0.04, lz);   // feet
  const sw = inner / seats;
  for (let i = 0; i < seats; i++) {
    const lx = x0 + sw * (i + 0.5);
    P(rbox(sw - 0.02, 0.15, depth - 0.24, 0.06), light, lx, 0.39, -0.08);                                 // seat cushion
    if (back) P(rbox(sw - 0.03, 0.46, 0.2, 0.08), light, lx, 0.66, depth / 2 - 0.22, [-0.16, 0, 0]);     // back cushion, leaning back
  }
  if (back) P(rbox(len - 0.02, 0.62, 0.16, 0.05), color, 0, 0.55, depth / 2 - 0.08);                       // the frame behind
  for (const [on, lx] of [[armL, -len / 2 + arm / 2], [armR, len / 2 - arm / 2]]) if (on) {
    P(rbox(arm, 0.42, depth - 0.02, 0.07), color, lx, 0.39, 0);                                           // plump rounded arms
    P(rbox(arm + 0.02, 0.1, depth, 0.05), light, lx, 0.6, 0);
  }
  const PILL = [0xd8c8a0, 0xb84a3a, 0xe8e0d0, 0x3a5a4a];
  for (let i = 0; i < pillows; i++) { const lx = i % 2 ? len / 2 - (armR ? arm : 0) - 0.2 : -len / 2 + (armL ? arm : 0) + 0.2; P(rbox(0.36, 0.34, 0.11, 0.06), PILL[i % 4], lx, 0.62, depth / 2 - 0.36, [-0.3, (i % 2 ? -0.3 : 0.3), (i % 2 ? 0.15 : -0.15)]); }
  if (throwCol != null) { P(new THREE.BoxGeometry(0.5, 0.012, depth - 0.1), throwCol, len / 2 - (armR ? arm : 0) - 0.3, 0.475, -0.06, [0, 0.1, 0]); P(new THREE.BoxGeometry(0.5, 0.42, 0.012), throwCol, len / 2 - (armR ? arm : 0) - 0.3, 0.27, -depth / 2 + 0.03, [0, 0.1, 0]); }
  // footprint for walking / collisions
  const hx = Math.abs(c) * len / 2 + Math.abs(s) * depth / 2, hz = Math.abs(s) * len / 2 + Math.abs(c) * depth / 2;
  k.blockers.push({ x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz, y1: 0.75 });
}

// kitchen unit fronts on one face of a run of base units: doors (with a drawer line), handles,
// the kick plinth. axis 'x' = the face runs along x at z = c; d = which way it faces
export function unitFronts(k, axis, c, a0, a1, d, col = 0xf2f2ee, skip = []) {
  const n = Math.max(1, Math.round((a1 - a0) / 0.6)), w = (a1 - a0) / n, seam = shade(col, 0.72), hand = 0x9aa0a6;
  const B = (w2, h, t, a, y, off, colr) => axis === 'x' ? k.box(w2, h, t, a, y, c + d * off, colr) : k.box(t, h, w2, c + d * off, y, a, colr);
  B(a1 - a0, 0.1, 0.01, (a0 + a1) / 2, 0.05, -0.04, 0x2a2a2a);                                             // recessed kick plinth
  for (let i = 0; i < n; i++) {
    const m = a0 + w * (i + 0.5); if (skip.some(([s0, s1]) => m > s0 && m < s1)) continue;
    B(w - 0.006, 0.7, 0.012, m, 0.46, 0.006, col);                                                         // door
    B(w - 0.006, 0.14, 0.014, m, 0.82, 0.007, shade(col, 0.97));                                           // drawer
    B(0.006, 0.86, 0.016, m - w / 2, 0.47, 0.007, seam);                                                   // gap between doors
    B(0.12, 0.012, 0.03, m, 0.82, 0.03, hand); B(0.012, 0.12, 0.03, m + (i % 2 ? -1 : 1) * (w / 2 - 0.06), 0.62, 0.03, hand);   // bar handles
    B(w - 0.006, 0.006, 0.016, m, 0.745, 0.008, seam);
  }
}

// a flat-screen TV on a thin stand, a picture on it (the football: Spurs losing), a soundbar
export function tv(k, scene, { x, y, z, ry, w = 1.25 }) {
  const h = w * 0.58, c = Math.cos(ry), s = Math.sin(ry);
  const P = (geo, col, lx, ly, lz) => k.parts.push(part(geo, col, [x + lx * c + lz * s, y + ly, z - lx * s + lz * c], [0, ry, 0]));
  P(rbox(w, h, 0.04, 0.01), 0x111111, 0, 0, 0);
  P(new THREE.BoxGeometry(0.06, 0.16, 0.04), 0x1a1a1a, 0, -h / 2 - 0.08, 0.02); P(new THREE.BoxGeometry(0.4, 0.015, 0.2), 0x1a1a1a, 0, -h / 2 - 0.16, 0.02);   // stand
  P(rbox(0.8, 0.07, 0.08, 0.02), 0x222222, 0, -h / 2 - 0.12, -0.12);                                       // soundbar in front
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.04, h - 0.04), new THREE.MeshBasicMaterial({ map: matchTex(), color: 0xdddddd }));
  scr.position.set(x - 0.021 * s, y, z - 0.021 * c); scr.rotation.y = ry + Math.PI; scene.add(scr);
  return scr;
}
function matchTex() {
  return canvasTex(512, 296, (g, w, h) => {
    g.fillStyle = '#2f8a3a'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 48) { g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x, 0, 24, h); }
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3; g.strokeRect(20, 30, w - 40, h - 50); g.beginPath(); g.moveTo(w / 2, 30); g.lineTo(w / 2, h - 20); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2 + 5, 40, 0, 7); g.stroke();
    for (let i = 0; i < 18; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#c8102e'; const px = 40 + ((i * 97) % (w - 80)), py = 50 + ((i * 53) % (h - 90)); g.fillRect(px, py, 6, 12); }
    g.fillStyle = '#111'; g.fillRect(10, 8, 168, 26); g.fillStyle = '#fff'; g.font = '700 16px Arial'; g.fillText('TOT 0 - 3 ARS  78:12', 18, 27);
  });
}

// carpet up the stairs, held with brass rods
export function stairRunner(k, { x0, x1, zTop, step = 0.34, rise = 0.2, n = 13, col = 0x7a2a3a }) {
  const w = x1 - x0, mx = (x0 + x1) / 2;
  for (let i = 0; i < n; i++) {
    const zf = zTop - i * step;                                // front edge (nosing) of step i
    k.box(w, 0.012, step - 0.01, mx, rise * (i + 1) + 0.006, zf - step / 2, col);                           // on the tread
    k.box(w, rise, 0.012, mx, rise * i + rise / 2, zf + 0.006, col);                                        // down the riser
    k.box(w + 0.06, 0.016, 0.016, mx, rise * i + 0.02, zf + 0.012, 0xc8a050);                               // brass rod
    k.box(1.05, 0.02, 0.03, (x0 + x1) / 2, rise * (i + 1) + 0.002, zf + 0.012, 0xf0ece4);                   // white nosing
  }
}

// close-boarded fence panels: vertical boards with gaps and grain
let _fenceTex = null;
export function fenceTex() {
  return _fenceTex || (_fenceTex = canvasTex(256, 256, (g, w, h) => {
    for (let x = 0, i = 0; x < w; x += 21, i++) {
      g.fillStyle = ['#8a5a32', '#7e5230', '#946238', '#80542e'][i % 4]; g.fillRect(x, 0, 20, h);
      for (let k = 0; k < 6; k++) { g.strokeStyle = 'rgba(50,25,10,0.18)'; g.beginPath(); g.moveTo(x + 3 + k * 3, 0); g.bezierCurveTo(x + 2 + k * 3, h * 0.3, x + 5 + k * 3, h * 0.7, x + 3 + k * 3, h); g.stroke(); }
      g.fillStyle = 'rgba(20,10,4,0.75)'; g.fillRect(x + 20, 0, 1, h);
      if (i % 3 === 0) { g.fillStyle = 'rgba(40,20,8,0.6)'; g.beginPath(); g.ellipse(x + 10, 60 + i * 13 % 150, 3, 5, 0, 0, 7); g.fill(); }   // knots
    }
  }));
}

// a wheelie bin: tub, lid, wheels, handle, a number painted on
export function wheelieBin(k, { x, z, ry = 0, col = 0x1a1a1a, lidCol = null }) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const P = (geo, colr, lx, y, lz, rot = [0, 0, 0]) => k.parts.push(part(geo, colr, [x + lx * c + lz * s, y, z - lx * s + lz * c], [rot[0], ry + rot[1], rot[2]]));
  P(rbox(0.58, 0.95, 0.7, 0.04), col, 0, 0.52, 0);
  P(rbox(0.62, 0.05, 0.76, 0.02), lidCol ?? shade(col, 1.2), 0, 1.02, -0.02);
  P(new THREE.BoxGeometry(0.5, 0.04, 0.04), shade(col, 0.7), 0, 0.98, 0.37);                               // handle
  for (const lx of [-0.27, 0.27]) P(cyl(0.1, 0.1, 0.05, 12), 0x111111, lx, 0.1, 0.32, [0, 0, Math.PI / 2]);
  P(new THREE.BoxGeometry(0.16, 0.12, 0.005), 0xf4f4f4, 0, 0.75, -0.355);                                   // the house number
  k.blockers.push({ x0: x - 0.38, x1: x + 0.38, z0: z - 0.4, z1: z + 0.4, y1: 1.05 });
}
