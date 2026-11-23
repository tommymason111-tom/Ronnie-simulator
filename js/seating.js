// SITTING DOWN PROPERLY: hips on the seat (at that seat's own height), sat back in it, thighs along the seat and the
// lower legs down to the floor in front (or dangling, for a kid), facing the way the seat faces, the forearms on the
// table if there's one in front at the right height (hands in the lap if not). Every level lists its seats in
// room.seats ({ x, z, yaw, h }: h is the seat's top above the floor there); anywhere not listed gets an ordinary chair.
// Sitting down and getting up are eased (the whole body, not just the hips dropping), and so is every change of pose
// while someone's stood or sat about (smoothPose), so nothing ever snaps from one pose to the next.
import * as THREE from 'three';
import { nearBlockers } from './perf.js';

export const SEAT_H = 0.475;          // an ordinary chair (the pub's are 0.48, the restaurant's 0.475-0.515, a sofa cushion 0.465)
const _v = new THREE.Vector3(), _q = new THREE.Quaternion();

// the seat at (x, z): its height and what's in front of it (a table's top, if there is one within reach)
export function seatInfo(room, x, z, yaw) {
  let best = null, bd = 0.42;
  for (const s of room.seats || []) { const d = Math.abs(s.x - x) + Math.abs(s.z - z); if (d < bd) { bd = d; best = s; } }
  const h = best ? best.h : SEAT_H;
  // a table in front: a blocker between ~0.6 and 0.9 high, 0.3-0.75m ahead of the hips
  let table = 0;
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  for (const d of [0.35, 0.5, 0.65]) { const px = x + fx * d, pz = z + fz * d;
    for (const b of nearBlockers(room, px, pz)) if (b.y1 > 0.6 && b.y1 < 0.92 && px > b.x0 && px < b.x1 && pz > b.z0 && pz < b.z1 && Math.abs(b.x1 - b.x0) < 4 && Math.abs(b.z1 - b.z0) < 4) { table = Math.max(table, b.y1); }
    if (table) break; }
  return { h, table, seat: best };
}

// the legs (and hips) for sitting on a seat of height h: returns the bob (hip height) and how far back the hips sit
export function sitLegs(c, info, t) {
  const r = c.rag, P = r.parts, ul = P.uLegL.def, ll = P.lLegL.def, k = r.height / 1.68;
  const thighLen = ul.a.distanceTo(ul.b), shinLen = ll.a.distanceTo(ll.b);
  const thick = (ul.t || 0.078 * k) * 1.02;                  // the thigh's own thickness under the hip joint (squashed a little on the seat)
  const footY = 0.055 * k, out = 0.07;
  // the thighs slope down a little to the knee (more for short legs, to get the feet to the floor; a kid's can't), and
  // the hips sit up by enough that the thigh rests ON the seat along its length, not just at the back
  const sinD = r.height < 1.4 ? 0.06 : Math.min(0.3, Math.max(0.05, (info.h + thick - shinLen - footY) / (0.7 * thighLen)));
  const hipY = info.h + thick + 0.3 * thighLen * sinD;
  const drop = sinD / Math.sqrt(1 - sinD * sinD), n = Math.hypot(out, drop, 1);
  const kneeY = hipY - thighLen * drop / n;
  const need = kneeY - footY;
  let sy, sz;
  if (shinLen > need) { sy = -need / shinLen; sz = Math.sqrt(Math.max(0, 1 - sy * sy)); }      // feet flat on the floor, the shins sloping forward as much as they need
  else { const sw = c.rp && c.rp.kind === 'kid' ? Math.sin(t * 3.1 + (c.idPhase || 0)) * 0.22 : 0; sy = -1; sz = 0.12 + sw; }   // (too short to reach: the feet dangle, a kid's swinging)
  r.aim('uLegL', out, -drop, 1); r.aim('uLegR', -out, -drop, 1);
  r.aim('lLegL', 0.02, sy, sz); r.aim('lLegR', -0.02, sy, sz * (c.rp && c.rp.kind === 'kid' ? 0.9 : 1));
  r.pose.pelvis.identity();
  return { bob: hipY - ul.a.y - 0.02, back: -0.045 * k - (P.pelvis.def.center.z || 0) };      // (sat back in the seat; a model whose hips aren't over its feet is put right)
}

// the arms at rest: forearms on the table (when it's at a height they can reach), else hands in the lap
export function seatArms(c, info, hipY) {
  const r = c.rag, P = r.parts, ua = P.uArmL.def, la = P.lArmL.def, ul = P.uLegL.def;
  const upLen = ua.a.distanceTo(ua.b), shoulderY = hipY + (ua.a.y - ul.a.y);
  const drop = shoulderY - (info.table + 0.05);
  if (info.table && drop > 0.08 && drop < upLen * 0.95) {
    const y = -drop / upLen, zz = Math.sqrt(Math.max(0.01, 1 - y * y - 0.04));
    r.aim('uArmL', 0.2, y, zz); r.aim('lArmL', -0.28, 0.02, 1);
    r.aim('uArmR', -0.2, y, zz); r.aim('lArmR', 0.28, 0.02, 1);
    return 'table';
  }
  r.aim('uArmL', 0.16, -1, 0.28); r.aim('lArmL', -0.12, -0.42, 1);
  r.aim('uArmR', -0.16, -1, 0.28); r.aim('lArmR', 0.12, -0.42, 1);
  return 'lap';
}

// every change of pose eased (stood or sat about; and the first moments of a walk out of a seat): each part turns
// toward where the animation wants it, quickly normally, slowly while sitting down or getting up
const PARTS = ['pelvis', 'chest', 'uArmL', 'lArmL', 'uArmR', 'lArmR', 'uLegL', 'lLegL', 'uLegR', 'lLegR'];
export function smoothPose(c, dt, rate) {
  const r = c.rag, S = c._smooth || (c._smooth = { q: {}, bob: r.bob, shift: r.shiftZ || 0 });
  const k = 1 - Math.exp(-dt * rate);
  for (const n of PARTS) { const p = r.pose[n]; if (!p) continue; const q = S.q[n]; if (!q) { S.q[n] = p.clone(); continue; }
    // (legs on planted feet (gait.js) aren't eased once they've caught up: eased, a stepping foot slid over the floor)
    if (c.gait && c.gait.owns(n) && q.angleTo(p) < 0.15) { q.copy(p); continue; }
    q.slerp(p, k); p.copy(q); }
  S.bob += (r.bob - S.bob) * k; r.bob = S.bob;
  S.shift += ((r.shiftZ || 0) - S.shift) * k; r.shiftZ = S.shift;
}
export function resetSmooth(c) { c._smooth = null; }
