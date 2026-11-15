// Ronnie's belly as you look down at it: a real (white, fair-skinned) belly with a navel, rolls and an overhang that
// grows every stage, under his blue T-shirt. As he gets bigger the shirt rides up (the bottom of the belly starts
// showing), then it splits and rips (holes, frayed edges), until it's just tatters across his chest.
// Built in a unit space (radius ~1, front of the belly towards -z) and scaled to the belly's size by the player.
import * as THREE from 'three';

const SKIN = new THREE.Color(0xf1c4a6), CREASE = new THREE.Color(0xb47a62), PINK = new THREE.Color(0xe8a090), NAVEL = new THREE.Color(0x7a4a3a);
const TEE = new THREE.Color(0x1f4fbf), TEE_DARK = new THREE.Color(0x15398c), FRAY = new THREE.Color(0x8aa6e6);
//               stage:  1      2      3      4      5      6
const HEM_B = [-1.15, -1.0, -0.9, -0.75, -0.55, -0.3];        // where the bottom of the shirt sits at the back...
const HEM_F = [-1.15, -0.6, -0.32, -0.08, 0.14, 0.38];         // ...and at the front (it rides up over the belly)
const TEAR  = [0, 0, 0, 0.22, 0.48, 0.78];                   // how ripped the shirt is
const SAG   = [0.04, 0.11, 0.19, 0.28, 0.36, 0.45];          // how far the lower belly hangs forward and down
const ROLL  = [0, 0.03, 0.055, 0.08, 0.1, 0.12];               // how deep the folds are
const n3 = (x, y, z) => Math.sin(x * 7.1 + y * 3.3) * Math.sin(y * 5.7 - z * 4.1) * 0.6 + Math.sin(z * 9.3 + x * 2.2) * 0.4;

// the shape: an egg, the lower front pushed out and down, a navel, a fold under the belly and love handles
function shapeAt(v, st) {
  const s = SAG[st], r = ROLL[st];
  let { x, y, z } = v;
  x *= 1.1; z *= 0.92;
  const front = Math.max(0, -z), low = Math.max(0, -y);
  z -= s * front * low * 1.6; y -= s * front * low * 0.55;                     // the overhang
  // the fold under the belly: a smile-shaped crease across the front, deeper in the middle
  const foldY = -0.62 + Math.abs(x) * 0.28 - s * 0.6;
  const fd = Math.exp(-(((y - foldY) / 0.07) ** 2)) * front;
  z += r * 1.4 * fd; y += r * 0.4 * fd;
  // love handles: a roll at each side
  const side = Math.max(0, Math.abs(x) - 0.75);
  x -= Math.sign(x) * r * 1.5 * Math.exp(-(((y + 0.2) / 0.08) ** 2)) * side * 3;
  // the navel
  const nd = Math.hypot(x, y + 0.18 + s * 0.15) ;
  if (front > 0.5) z += Math.exp(-((nd / 0.06) ** 2)) * 0.05;
  return { x, y, z, fold: fd, navel: front > 0.5 ? Math.exp(-((nd / 0.04) ** 2)) : 0, handle: side > 0 ? Math.exp(-(((y + 0.2) / 0.1) ** 2)) : 0 };
}

function build(st, shirt) {
  const gi = new THREE.SphereGeometry(1, 96, 64), orig = gi.attributes.position.clone();
  { const pp = gi.attributes.position, w = new THREE.Vector3(); for (let i = 0; i < pp.count; i++) { w.fromBufferAttribute(pp, i); const s2 = shapeAt(w, st), k = shirt ? 1.018 + Math.max(0, -w.z) * 0.01 : 1; pp.setXYZ(i, s2.x * k, s2.y * k, s2.z * k); } gi.computeVertexNormals(); }
  gi.setAttribute('orig', orig);
  const g = gi.toNonIndexed(), p = g.attributes.position, n = p.count, O = g.attributes.orig;
  const col = new Float32Array(n * 3), v = new THREE.Vector3(), c = new THREE.Color();
  const info = [];
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(O, i); const o = v.clone(), s = shapeAt(v.clone(), st); info.push({ o, s });
    if (!shirt) {
      c.copy(SKIN).lerp(PINK, Math.max(0, -o.y) * 0.18 + s.fold * 0.25);
      c.lerp(CREASE, Math.min(1, s.fold * 0.9 + s.handle * 0.35)); c.lerp(NAVEL, s.navel * 0.9);
      c.multiplyScalar(1 - n3(o.x * 3, o.y * 3, o.z * 3) * 0.03);
    } else {
      c.copy(TEE);
      // stretched across the belly: faint pull lines, and the shirt lighter where it's tight over the front
      if (o.z < -0.2 && Math.abs(Math.sin(o.y * 22 + o.x * o.x * 6)) < 0.18) c.lerp(TEE_DARK, 0.5);
      c.multiplyScalar(1 + Math.max(0, -o.z) * 0.08);
    }
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (shirt) {
    // cut the shirt: below the hem (ragged once it's tearing), and rips through it
    const tear = TEAR[st], keep = [];
    const hemAt = (o) => HEM_B[st] + (HEM_F[st] - HEM_B[st]) * Math.max(0, -o.z) + (tear ? n3(o.x * 5, 0, o.z * 5) * 0.06 * (1 + tear * 2) : Math.sin(Math.atan2(o.z, o.x) * 3) * 0.015);
    const rip = (o) => tear && o.z < 0.2 && n3(o.x * 2.3 + 3, o.y * 2.3, o.z * 2.3) > 1 - tear * 0.9;      // (big ragged holes across the front)
    for (let t = 0; t < n; t += 3) {
      const a = info[t].o, b = info[t + 1].o, d = info[t + 2].o, m = new THREE.Vector3().add(a).add(b).add(d).divideScalar(3);
      if (m.y < hemAt(m)) continue;
      if (rip(m)) continue;      // the rips
      keep.push(t);
    }
    const ng = new THREE.BufferGeometry(), P = new Float32Array(keep.length * 9), C = new Float32Array(keep.length * 9);
    keep.forEach((t, j) => { for (let k = 0; k < 3; k++) { P.set([p.getX(t + k), p.getY(t + k), p.getZ(t + k)], (j * 3 + k) * 3);
      // frayed, lighter edges round the hem and the rips
      const o = info[t + k].o, near = Math.abs(o.y - hemAt(o)) < 0.07 || (tear && o.z < 0.2 && n3(o.x * 2.3 + 3, o.y * 2.3, o.z * 2.3) > 1 - tear * 0.9 - 0.14);
      const cc = new THREE.Color(col[(t + k) * 3], col[(t + k) * 3 + 1], col[(t + k) * 3 + 2]); if (near && st >= 2) cc.lerp(FRAY, 0.55);
      C.set([cc.r, cc.g, cc.b], (j * 3 + k) * 3); } });
    const N = new Float32Array(keep.length * 9); keep.forEach((t, j) => { for (let k = 0; k < 3; k++) N.set([g.attributes.normal.getX(t + k), g.attributes.normal.getY(t + k), g.attributes.normal.getZ(t + k)], (j * 3 + k) * 3); });
    ng.setAttribute('position', new THREE.BufferAttribute(P, 3)); ng.setAttribute('color', new THREE.BufferAttribute(C, 3)); ng.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.dispose(); return ng;
  }
  g.deleteAttribute('orig'); return g;
}

export class Belly {
  constructor() {
    this.group = new THREE.Group();
    const skinMat = new THREE.MeshLambertMaterial({ vertexColors: true }), teeMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.skin = new THREE.Mesh(new THREE.BufferGeometry(), skinMat); this.tee = new THREE.Mesh(new THREE.BufferGeometry(), teeMat);
    this.group.add(this.skin, this.tee); this.cache = {}; this.stage = -1; this.setStage(0);
  }
  setStage(st) {
    st = Math.max(0, Math.min(5, st)); if (st === this.stage) return; this.stage = st;
    const c = this.cache[st] || (this.cache[st] = { skin: build(st, false), tee: build(st, true) });
    this.skin.geometry = c.skin; this.tee.geometry = c.tee;
  }
  // which stage a belly size means (the stages' belly values: 1, 1.25, 1.55, 1.9, 2.3, 2.8)
  static stageFor(b) { return [1.12, 1.4, 1.72, 2.1, 2.55].filter(x => b >= x).length; }
}
