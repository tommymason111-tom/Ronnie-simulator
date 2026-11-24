// Builds assets/squad/ronnie.glb from the owner's two scans of Ronnie (the files he attached, not kept in the repo):
//   the full-body scan  (Ronnie_full_body_model-optimized.glb, 491k triangles, 512 x 512 textures)
//   the close-up scan   (Ron_close_up_model-optimized.glb, 484k triangles of head and shoulders, 512 x 512 textures:
//                        the same scan the title screen's head, assets/ronnie_head.glb, is made from)
//
// What it does:
//  1. the body scan is scaled to 1.80m (the frame squad.js's bind points for Ronnie are measured in, unchanged)
//  2. the close-up scan is lined up on the body's head (head width/depth, then ICP with scale) and the body's head
//     is shrink-wrapped onto it, blending in across the neck: in-game Ronnie gets the close-up's face shape
//  3. simplified with meshoptimizer, the head and the body separately (HEAD / BODY triangles: far more than the other
//     squad members' 24k), smooth normals
//  4. a clean new texture atlas (xatlas) with the head at HEADSCALE x the texel density of the body
//  5. every texel of a TEX x TEX colour map and normal map is baked from the high-res scans: the body's colour from
//     the body scan, the head's from the close-up scan (its own 512 texture spends ~10x more pixels on the face),
//     brightness-matched to the body, blended in just above the shirt collar; the normal map carries the 975k triangles of scanned detail the
//     simplified mesh can't
//  6. written as the other squad models are (colour JPEG, normal JPEG, an all-white eye mask PNG in the occlusion
//     slot so ragdoll.js packs his skin exactly like everyone else's: 1024 on a phone, full size on a computer)
//
//   cd tools && npm install && node bake_ronnie.mjs <full body .glb> <close-up .glb> ../assets/squad/ronnie.glb
//   (env: HEAD=26000 BODY=44000 TEX=2048 HEADSCALE=3 WRAP=1 Q=88 NQ=80; about 2 minutes)
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import createXAtlas from 'xatlas-wasm';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import jpeg from 'jpeg-js';
import zlib from 'node:zlib';
await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const [, , BODY_SRC, CLOSE_SRC, OUT] = process.argv;
if (!OUT) { console.log('node bake_ronnie.mjs <full body .glb> <close-up .glb> <out .glb>'); process.exit(1); }
const E = (k, d) => +(process.env[k] ?? d);
const HEAD = E('HEAD', 26000), BODY = E('BODY', 44000), TEX = E('TEX', 2048), HEADSCALE = E('HEADSCALE', 3), HT = E('HEIGHT', 1.80);
// heights in the 1.80m frame: the head's own triangles above SPLIT. The close-up takes over just above the body scan's
// shirt collar, which is low at the front and high at the back: from COLLAR + (FRONTZ - z) * TILT, over BAND metres
// (never the shoulders or the collar itself: the close-up's shirt is a different one)
const SPLIT = E('SPLIT', 1.47), COLLAR = E('COLLAR', 1.508), FRONTZ = E('FRONTZ', 0.04), TILT = E('TILT', 0.4), BAND = E('BAND', 0.025);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

async function readScan(file, scale) {
  const doc = await io.read(file); await doc.transform(dequantize());
  const node = doc.getRoot().listNodes().find(n => n.getMesh()), prim = node.getMesh().listPrimitives()[0], mat = prim.getMaterial();
  const pa = prim.getAttribute('POSITION'), ua = prim.getAttribute('TEXCOORD_0'), na = prim.getAttribute('NORMAL'), n = pa.getCount(), v = [0, 0, 0];
  const s = node.getScale(), P = new Float32Array(n * 3), UV = new Float32Array(n * 2), N = new Float32Array(n * 3);
  let ymin = 1e9, ymax = -1e9;
  for (let i = 0; i < n; i++) { pa.getElement(i, v); for (let k = 0; k < 3; k++) P[i * 3 + k] = v[k] * s[k]; ymin = Math.min(ymin, P[i * 3 + 1]); ymax = Math.max(ymax, P[i * 3 + 1]); }
  const k = scale ? scale / (ymax - ymin) : 1;
  for (let i = 0; i < n; i++) { P[i * 3] *= k; P[i * 3 + 1] = (P[i * 3 + 1] - ymin) * k; P[i * 3 + 2] *= k; }
  for (let i = 0; i < n; i++) { ua.getElement(i, v); UV[i * 2] = v[0]; UV[i * 2 + 1] = v[1]; na.getElement(i, v); const l = Math.hypot(v[0], v[1], v[2]) || 1; N[i * 3] = v[0] / l; N[i * 3 + 1] = v[1] / l; N[i * 3 + 2] = v[2] / l; }
  const img = jpeg.decode(Buffer.from(mat.getBaseColorTexture().getImage()), { useTArray: true });
  console.log(file.split('/').pop(), n, 'verts', prim.getIndices().getCount() / 3, 'tris, colour', img.width, 'x', img.height);
  return { P, UV, N, IDX: Uint32Array.from(prim.getIndices().getArray()), img };
}
const body = await readScan(BODY_SRC, HT), close = await readScan(CLOSE_SRC, 0);
// the scans' own textures have black between their pieces: anything sampled at the edge of a piece pulled some of it
// in (dark specks on the shirt). Find the texels the scan really uses and grow its colours out over the black.
function fillGaps({ img, UV, IDX }) {
  const W = img.width, H = img.height, used = new Uint8Array(W * H), d = img.data;
  for (let f = 0; f < IDX.length; f += 3) {
    const a = IDX[f], b = IDX[f + 1], c = IDX[f + 2];
    const ax = UV[a * 2] * W, ay = UV[a * 2 + 1] * H, bx = UV[b * 2] * W, by = UV[b * 2 + 1] * H, cx = UV[c * 2] * W, cy = UV[c * 2 + 1] * H;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx) - 1)), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx) + 1)), y0 = Math.max(0, Math.floor(Math.min(ay, by, cy) - 1)), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy) + 1));
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (Math.abs(den) < 1e-9) { used[y * W + x] = 1; continue; }
      const px = x + 0.5, py = y + 0.5, w0 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den, w1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den;
      const m = 0.75 / Math.sqrt(Math.abs(den));      // (about a texel of slack all round)
      if (w0 > -m && w1 > -m && 1 - w0 - w1 > -m) used[y * W + x] = 1;
    }
  }
  let grown = 0;
  for (let it = 0; it < 6; it++) {
    const add = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (used[y * W + x]) continue; const s = [0, 0, 0]; let n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H || !used[yy * W + xx]) continue; const o = (yy * W + xx) * 4; s[0] += d[o]; s[1] += d[o + 1]; s[2] += d[o + 2]; n++; }
      if (n) add.push([y * W + x, s[0] / n, s[1] / n, s[2] / n]); }
    for (const [i, r, g, b] of add) { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; used[i] = 1; } grown += add.length;
  }
  console.log('grew colour over', grown, 'unused texels');
}
fillGaps(body); fillGaps(close);

// ---- 1. weld the body by position (texture seams split vertices; the shape doesn't care) ----
function weldPos(P, IDX) {
  const key = new Map(), remap = new Uint32Array(P.length / 3), W = []; let nU = 0;
  for (let i = 0; i < P.length / 3; i++) {
    const k = `${Math.round(P[i * 3] * 1e5)},${Math.round(P[i * 3 + 1] * 1e5)},${Math.round(P[i * 3 + 2] * 1e5)}`;
    let id = key.get(k); if (id === undefined) { id = nU++; key.set(k, id); W.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); } remap[i] = id;
  }
  const T = []; for (let f = 0; f < IDX.length; f += 3) { const a = remap[IDX[f]], b = remap[IDX[f + 1]], c = remap[IDX[f + 2]]; if (a !== b && b !== c && a !== c) T.push(a, b, c); }
  return { W: new Float32Array(W), T: Uint32Array.from(T), remap };
}
const bw = weldPos(body.P, body.IDX);

// ---- 2. line the close-up up on the body's head: x_body = s * R * x_close + t ----
const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(close.P, 3)); cg.setIndex(new THREE.BufferAttribute(close.IDX, 1));
const cbvh = new MeshBVH(cg);
const slab = (P, ylo, yhi) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, n = 0; for (let i = 0; i < P.length; i += 3) { const y = P[i + 1]; if (y < ylo || y > yhi) continue; x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); z0 = Math.min(z0, P[i + 2]); z1 = Math.max(z1, P[i + 2]); n++; } return { w: x1 - x0, d: z1 - z0, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, n }; };
let bTop = -1e9; for (let i = 1; i < bw.W.length; i += 3) bTop = Math.max(bTop, bw.W[i]);
let cTop = -1e9; for (let i = 1; i < close.P.length; i += 3) cTop = Math.max(cTop, close.P[i]);
let s = 1; const bs = slab(bw.W, bTop - 0.11, bTop - 0.09); let cs;
for (let it = 0; it < 8; it++) { cs = slab(close.P, cTop - 0.11 / s, cTop - 0.09 / s); s = (bs.w / cs.w + bs.d / cs.d) / 2; }
const R = new THREE.Matrix3().identity(), t = new THREE.Vector3(bs.cx - s * cs.cx, bTop - s * cTop, 0);
{ const cz = slab(close.P, cTop - 0.11 / s, cTop - 0.09 / s); t.z = bs.cz - s * cz.cz; }
const headW = (x, y, z) => { const c = COLLAR + Math.max(0, FRONTZ - z) * TILT; return smooth(c + 0.004, c + 0.004 + BAND, y); };
console.log('first guess: scale', s.toFixed(4), 't', t.toArray().map(x => x.toFixed(4)).join(','));
// ICP with scale (Horn's quaternion method) on the body's head above the chin
const toClose = (p, out) => { out.copy(p).sub(t).multiplyScalar(1 / s).applyMatrix3(new THREE.Matrix3().copy(R).transpose()); return out; };
const Rt = () => new THREE.Matrix3().copy(R).transpose();
const fromClose = (p, out) => out.copy(p).applyMatrix3(R).multiplyScalar(s).add(t);
const Q = []; for (let i = 0; i < bw.W.length / 3; i++) if (bw.W[i * 3 + 1] > 1.57 && (i % 3 === 0)) Q.push(new THREE.Vector3().fromArray(bw.W, i * 3));
console.log('ICP points', Q.length);
function horn(A, B) {        // best s, R, t with B ~ s R A + t
  const n = A.length, ca = new THREE.Vector3(), cb = new THREE.Vector3(); A.forEach(a => ca.add(a)); B.forEach(b => cb.add(b)); ca.multiplyScalar(1 / n); cb.multiplyScalar(1 / n);
  const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; let va = 0, vb = 0;
  for (let i = 0; i < n; i++) { const a = A[i].clone().sub(ca), b = B[i].clone().sub(cb); va += a.lengthSq(); vb += b.lengthSq(); const aa = [a.x, a.y, a.z], bb = [b.x, b.y, b.z]; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) S[r][c] += aa[r] * bb[c]; }
  const [[xx, xy, xz], [yx, yy, yz], [zx, zy, zz]] = S;
  const N = [[xx + yy + zz, yz - zy, zx - xz, xy - yx], [yz - zy, xx - yy - zz, xy + yx, zx + xz], [zx - xz, xy + yx, -xx + yy - zz, yz + zy], [xy - yx, zx + xz, yz + zy, -xx - yy + zz]];
  const sh = Math.abs(xx) + Math.abs(yy) + Math.abs(zz) + Math.abs(xy) + Math.abs(xz) + Math.abs(yx) + Math.abs(yz) + Math.abs(zx) + Math.abs(zy);
  let q = [1, 0, 0, 0];
  for (let it = 0; it < 400; it++) { const r = [0, 0, 0, 0]; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) r[i] += (N[i][j] + (i === j ? sh : 0)) * q[j]; const l = Math.hypot(...r); q = r.map(x => x / l); }
  const quat = new THREE.Quaternion(q[1], q[2], q[3], q[0]), Rm = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(quat));
  const sc = Math.sqrt(vb / va), tt = cb.clone().sub(ca.clone().applyMatrix3(Rm).multiplyScalar(sc));
  return { s: sc, R: Rm, t: tt };
}
const hit = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 }, _p = new THREE.Vector3(), _q = new THREE.Vector3();
for (let it = 0; it < 40; it++) {
  const thr = it < 10 ? 0.04 : it < 25 ? 0.02 : 0.012, A = [], B = []; let err = 0;
  const RT = Rt();
  for (const q of Q) { _p.copy(q).sub(t).multiplyScalar(1 / s).applyMatrix3(RT); cbvh.closestPointToPoint(_p, hit); const d = hit.distance * s; if (d < thr) { A.push(hit.point.clone()); B.push(q); err += d * d; } }
  const fit = horn(A, B); s = fit.s; R.copy(fit.R); t.copy(fit.t);
  if (it % 10 === 9 || it === 0) console.log('ICP', it, 'pairs', A.length, '/', Q.length, 'rms', Math.sqrt(err / A.length).toFixed(4), 'scale', s.toFixed(4));
}
console.log('close-up -> body: scale', s.toFixed(4), 't', t.toArray().map(x => x.toFixed(4)).join(','), 'R', Array.from(R.elements).map(x => x.toFixed(3)).join(','));

// ---- 3. shrink-wrap the body's head onto the close-up (fading in across the neck), then smooth the move ----
const nW = bw.W.length / 3, WP = new Float32Array(bw.W), D = new Float32Array(nW * 3), wW = new Float32Array(nW);
if (E('WRAP', 1)) {
  const RT = Rt(); let moved = 0;
  for (let i = 0; i < nW; i++) {
    const w = headW(bw.W[i * 3], bw.W[i * 3 + 1], bw.W[i * 3 + 2]); if (w <= 0) continue;
    _q.fromArray(bw.W, i * 3); _p.copy(_q).sub(t).multiplyScalar(1 / s).applyMatrix3(RT); cbvh.closestPointToPoint(_p, hit);
    fromClose(hit.point, _p); const d = _p.distanceTo(_q); if (d > 0.05) continue;
    wW[i] = w; D[i * 3] = (_p.x - _q.x) * w; D[i * 3 + 1] = (_p.y - _q.y) * w; D[i * 3 + 2] = (_p.z - _q.z) * w; moved++;
  }
  // a few rounds of averaging the move with the neighbours (no folds where two body points chose one spot)
  const nb = new Array(nW); for (let i = 0; i < nW; i++) nb[i] = [];
  for (let f = 0; f < bw.T.length; f += 3) for (let e = 0; e < 3; e++) { const a = bw.T[f + e], b = bw.T[f + (e + 1) % 3]; if (wW[a] > 0 || wW[b] > 0) { nb[a].push(b); nb[b].push(a); } }
  for (let r = 0; r < 3; r++) { const D2 = new Float32Array(D); for (let i = 0; i < nW; i++) { if (!(wW[i] > 0) || !nb[i].length) continue; let x = 0, y = 0, z = 0; for (const j of nb[i]) { x += D[j * 3]; y += D[j * 3 + 1]; z += D[j * 3 + 2]; } const m = nb[i].length; D2[i * 3] = D[i * 3] * 0.5 + x / m * 0.5; D2[i * 3 + 1] = D[i * 3 + 1] * 0.5 + y / m * 0.5; D2[i * 3 + 2] = D[i * 3 + 2] * 0.5 + z / m * 0.5; } D.set(D2); }
  for (let i = 0; i < nW * 3; i++) WP[i] += D[i];
  console.log('wrapped', moved, 'head vertices onto the close-up');
}
// the body scan, wrapped, at full resolution (what the bake samples): its own UVs, the welded positions moved
const BP = new Float32Array(body.P.length); for (let i = 0; i < body.P.length / 3; i++) { const r = bw.remap[i]; BP[i * 3] = WP[r * 3]; BP[i * 3 + 1] = WP[r * 3 + 1]; BP[i * 3 + 2] = WP[r * 3 + 2]; }
const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(BP, 3)); bg.setIndex(new THREE.BufferAttribute(body.IDX, 1));
// normals of the wrapped body from the welded shape (the scan's own where nothing moved)
const BN = new Float32Array(body.N);
{ const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(WP, 3)); g.setIndex(new THREE.BufferAttribute(bw.T, 1)); g.computeVertexNormals(); const gn = g.attributes.normal.array;
  for (let i = 0; i < body.P.length / 3; i++) { const r = bw.remap[i]; if (wW[r] > 0) { BN[i * 3] = gn[r * 3]; BN[i * 3 + 1] = gn[r * 3 + 1]; BN[i * 3 + 2] = gn[r * 3 + 2]; } } }
const bbvh = new MeshBVH(bg);

// ---- 4. simplify: the head and the body separately ----
const head = [], rest = [];
for (let f = 0; f < bw.T.length; f += 3) { const a = bw.T[f], b = bw.T[f + 1], c = bw.T[f + 2]; const y = (WP[a * 3 + 1] + WP[b * 3 + 1] + WP[c * 3 + 1]) / 3; (y > SPLIT ? head : rest).push(a, b, c); }
const simp = (arr, tris, err) => MeshoptSimplifier.simplify(Uint32Array.from(arr), WP, 3, tris * 3, err, ['LockBorder'])[0];
const h = simp(head, HEAD, 0.001), b = simp(rest, BODY, 0.01);
console.log('head', head.length / 3, '->', h.length / 3, ' body', rest.length / 3, '->', b.length / 3);
const sIdx = new Uint32Array(h.length + b.length); sIdx.set(h); sIdx.set(b, h.length);
const [cmp, nV] = MeshoptSimplifier.compactMesh(sIdx);
const SP = new Float32Array(nV * 3);
for (let i = 0; i < cmp.length; i++) if (cmp[i] !== 0xffffffff) { SP[cmp[i] * 3] = WP[i * 3]; SP[cmp[i] * 3 + 1] = WP[i * 3 + 1]; SP[cmp[i] * 3 + 2] = WP[i * 3 + 2]; }
const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(SP, 3)); sg.setIndex(new THREE.BufferAttribute(sIdx, 1)); sg.computeVertexNormals();
const SN = sg.attributes.normal.array;
console.log('simplified', nV, 'verts', sIdx.length / 3, 'tris');

// ---- 5. unwrap; the head gets HEADSCALE x the texel density ----
const xa = await createXAtlas(), atlas = xa.createAtlas(), XP = new Float32Array(SP);
for (let i = 0; i < nV; i++) if (SP[i * 3 + 1] > SPLIT) { XP[i * 3] *= HEADSCALE; XP[i * 3 + 1] = SPLIT + (SP[i * 3 + 1] - SPLIT) * HEADSCALE; XP[i * 3 + 2] *= HEADSCALE; }
if (atlas.addMesh({ positions: XP, indices: sIdx }) !== xa.AddMeshError.Success) throw new Error('xatlas');
atlas.generate({ maxCost: E('MAXCOST', 4) }, { resolution: TEX, padding: 6, bilinear: true });
const am = atlas.getMesh(0), AW = atlas.width, AH = atlas.height;
console.log('atlas', AW, AH, 'charts', atlas.chartCount, 'atlases', atlas.atlasCount);
const nO = am.vertices.length, OP = new Float32Array(nO * 3), ON = new Float32Array(nO * 3), OUV = new Float32Array(nO * 2);
am.vertices.forEach((vx, i) => { const r = vx.xref; for (let k = 0; k < 3; k++) { OP[i * 3 + k] = SP[r * 3 + k]; ON[i * 3 + k] = SN[r * 3 + k]; } OUV[i * 2] = vx.uv[0] / AW; OUV[i * 2 + 1] = vx.uv[1] / AH; });
const OIDX = Uint32Array.from(am.indices); atlas.destroy();

// ---- 6. bake: every texel samples the scans ----
const TW = TEX, TH = TEX, NT = TW * TH;
const colB = new Float32Array(NT * 3), colC = new Float32Array(NT * 3), wC = new Float32Array(NT), nout = new Uint8ClampedArray(NT * 4), filled = new Uint8Array(NT);
function sample(img, u, v, o) {      // bicubic (Catmull-Rom): smoother than bilinear when a 512 picture is spread over more texels
  const W = img.width, H = img.height, d = img.data, x = u * W - 0.5, y = v * H - 0.5, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const cr = (t) => [((-t + 2) * t - 1) * t / 2, (((3 * t - 5) * t) * t + 2) / 2, ((-3 * t + 4) * t + 1) * t / 2, ((t - 1) * t * t) / 2];
  const wx = cr(fx), wy = cr(fy);
  for (let c = 0; c < 3; c++) { let acc = 0; for (let j = 0; j < 4; j++) { const yy = Math.min(H - 1, Math.max(0, y0 - 1 + j)); let row = 0; for (let i = 0; i < 4; i++) { const xx = Math.min(W - 1, Math.max(0, x0 - 1 + i)); row += d[(yy * W + xx) * 4 + c] * wx[i]; } acc += row * wy[j]; } o[c] = Math.min(255, Math.max(0, acc)); }
}
const tri = new THREE.Triangle(), bary = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
const ray = new THREE.Ray(), nrm = new THREE.Vector3(), p = new THREE.Vector3(), nh = new THREE.Vector3(), nc = new THREE.Vector3();
const gu = new THREE.Vector3(), gv = new THREE.Vector3(), d1 = new THREE.Vector3(), d2 = new THREE.Vector3(), Tt = new THREE.Vector3(), Bt = new THREE.Vector3(), M3 = new THREE.Matrix3();
const CAGE = 0.006, col = [0, 0, 0], RT = Rt();
// the surface a viewer would see from just outside the low-poly point (closest point if the ray misses); returns the face
function project(bvh, IDX, P, pt, n, out, cage = CAGE) {
  ray.origin.copy(pt).addScaledVector(n, cage); ray.direction.copy(n).negate();
  const rh = bvh.raycastFirst(ray, THREE.DoubleSide);
  if (rh && rh.distance < cage * 2.5) { out.copy(rh.point); return rh.faceIndex; }
  bvh.closestPointToPoint(pt, hit); out.copy(hit.point); return hit.faceIndex;
}
function surf(IDX, P, N, UV, img, face, at, outN, outC) {
  const i0 = IDX[face * 3], i1 = IDX[face * 3 + 1], i2 = IDX[face * 3 + 2];
  A.fromArray(P, i0 * 3); B.fromArray(P, i1 * 3); C.fromArray(P, i2 * 3); tri.set(A, B, C); tri.getBarycoord(at, bary);
  outN.set(N[i0 * 3] * bary.x + N[i1 * 3] * bary.y + N[i2 * 3] * bary.z, N[i0 * 3 + 1] * bary.x + N[i1 * 3 + 1] * bary.y + N[i2 * 3 + 1] * bary.z, N[i0 * 3 + 2] * bary.x + N[i1 * 3 + 2] * bary.y + N[i2 * 3 + 2] * bary.z).normalize();
  sample(img, UV[i0 * 2] * bary.x + UV[i1 * 2] * bary.y + UV[i2 * 2] * bary.z, UV[i0 * 2 + 1] * bary.x + UV[i1 * 2 + 1] * bary.y + UV[i2 * 2 + 1] * bary.z, outC);
}
const hp = new THREE.Vector3(), cp = new THREE.Vector3(), cn = new THREE.Vector3(), cc = [0, 0, 0];
console.time('bake');
for (let f = 0; f < OIDX.length; f += 3) {
  const ia = OIDX[f], ib = OIDX[f + 1], ic = OIDX[f + 2];
  const ax = OUV[ia * 2] * TW, ay = OUV[ia * 2 + 1] * TH, bx = OUV[ib * 2] * TW, by = OUV[ib * 2 + 1] * TH, cx = OUV[ic * 2] * TW, cy = OUV[ic * 2 + 1] * TH;
  const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(den) < 1e-12) continue;
  d1.set(OP[ib * 3] - OP[ia * 3], OP[ib * 3 + 1] - OP[ia * 3 + 1], OP[ib * 3 + 2] - OP[ia * 3 + 2]); d2.set(OP[ic * 3] - OP[ia * 3], OP[ic * 3 + 1] - OP[ia * 3 + 1], OP[ic * 3 + 2] - OP[ia * 3 + 2]);
  { const g11 = d1.dot(d1), g12 = d1.dot(d2), g22 = d2.dot(d2), gd = g11 * g22 - g12 * g12, du1 = OUV[ib * 2] - OUV[ia * 2], du2 = OUV[ic * 2] - OUV[ia * 2], dv1 = OUV[ib * 2 + 1] - OUV[ia * 2 + 1], dv2 = OUV[ic * 2 + 1] - OUV[ia * 2 + 1];
    if (Math.abs(gd) > 1e-20) { gu.copy(d1).multiplyScalar((g22 * du1 - g12 * du2) / gd).addScaledVector(d2, (-g12 * du1 + g11 * du2) / gd); gv.copy(d1).multiplyScalar((g22 * dv1 - g12 * dv2) / gd).addScaledVector(d2, (-g12 * dv1 + g11 * dv2) / gd); } else { gu.set(1, 0, 0); gv.set(0, 1, 0); } }
  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)) - 1), maxX = Math.min(TW - 1, Math.ceil(Math.max(ax, bx, cx)) + 1), minY = Math.max(0, Math.floor(Math.min(ay, by, cy)) - 1), maxY = Math.min(TH - 1, Math.ceil(Math.max(ay, by, cy)) + 1);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const px = x + 0.5, py = y + 0.5; let w0 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den, w1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den, w2 = 1 - w0 - w1;
    if (w0 < -0.02 || w1 < -0.02 || w2 < -0.02) continue;
    w0 = Math.max(0, w0); w1 = Math.max(0, w1); w2 = Math.max(0, w2); const sm = w0 + w1 + w2; w0 /= sm; w1 /= sm; w2 /= sm;
    const ti = y * TW + x; if (filled[ti]) continue;
    p.set(OP[ia * 3] * w0 + OP[ib * 3] * w1 + OP[ic * 3] * w2, OP[ia * 3 + 1] * w0 + OP[ib * 3 + 1] * w1 + OP[ic * 3 + 1] * w2, OP[ia * 3 + 2] * w0 + OP[ib * 3 + 2] * w1 + OP[ic * 3 + 2] * w2);
    nrm.set(ON[ia * 3] * w0 + ON[ib * 3] * w1 + ON[ic * 3] * w2, ON[ia * 3 + 1] * w0 + ON[ib * 3 + 1] * w1 + ON[ic * 3 + 1] * w2, ON[ia * 3 + 2] * w0 + ON[ib * 3 + 2] * w1 + ON[ic * 3 + 2] * w2).normalize();
    // the body scan
    const fb = project(bbvh, body.IDX, BP, p, nrm, hp); surf(body.IDX, BP, BN, body.UV, body.img, fb, hp, nh, col);
    colB[ti * 3] = col[0]; colB[ti * 3 + 1] = col[1]; colB[ti * 3 + 2] = col[2];
    // the close-up scan, from the neck up
    const wc = E('WRAP', 1) ? headW(p.x, p.y, p.z) : 0; wC[ti] = wc;
    if (wc > 0) {
      cp.copy(p).sub(t).multiplyScalar(1 / s).applyMatrix3(RT); nc.copy(nrm).applyMatrix3(RT).normalize();
      const fc = project(cbvh, close.IDX, close.P, cp, nc, hp, CAGE / s);      // (in the close-up's own units)
      surf(close.IDX, close.P, close.N, close.UV, close.img, fc, hp, cn, cc);
      cn.applyMatrix3(R).normalize(); colC[ti * 3] = cc[0]; colC[ti * 3 + 1] = cc[1]; colC[ti * 3 + 2] = cc[2];
      nh.multiplyScalar(1 - wc).addScaledVector(cn, wc).normalize();
    }
    // scanned normal -> tangent space of the simplified surface (three.js convention)
    if (nh.dot(nrm) < 0) nh.negate();
    Tt.copy(gu).addScaledVector(nrm, -nrm.dot(gu)); Bt.copy(gv).addScaledVector(nrm, -nrm.dot(gv));
    const scl = 1 / Math.sqrt(Math.max(Tt.lengthSq(), Bt.lengthSq(), 1e-30)); Tt.multiplyScalar(scl); Bt.multiplyScalar(scl);
    M3.set(Tt.x, Bt.x, nrm.x, Tt.y, Bt.y, nrm.y, Tt.z, Bt.z, nrm.z);
    if (Math.abs(M3.determinant()) > 1e-8) { M3.invert(); nh.applyMatrix3(M3).normalize(); if (nh.z < 0.05) { nh.z = 0.05; nh.normalize(); } } else nh.set(0, 0, 1);
    nout[ti * 4] = (nh.x * 0.5 + 0.5) * 255; nout[ti * 4 + 1] = (nh.y * 0.5 + 0.5) * 255; nout[ti * 4 + 2] = (nh.z * 0.5 + 0.5) * 255; nout[ti * 4 + 3] = 255;
    filled[ti] = 1;
  }
}
console.timeEnd('bake');
// match the close-up's brightness to the body scan's (one gain for all three channels, so the face keeps its own
// colour): compared on skin seen by both, from the neck up
const gain = [1, 1, 1];
{ let lb = 0, lc = 0, n = 0; const L = (a, i) => 0.299 * a[i * 3] + 0.587 * a[i * 3 + 1] + 0.114 * a[i * 3 + 2];
  const skin = (a, i) => a[i * 3] > a[i * 3 + 1] && a[i * 3 + 1] > a[i * 3 + 2] && a[i * 3] - a[i * 3 + 2] > 25 && L(a, i) > 70;
  for (let i = 0; i < NT; i++) if (filled[i] && wC[i] > 0.5 && skin(colB, i) && skin(colC, i)) { lb += L(colB, i); lc += L(colC, i); n++; }
  if (n > 100) gain.fill(Math.min(1.2, Math.max(0.85, lb / lc)));
  console.log('skin texels compared', n, 'close-up brightness gain', gain[0].toFixed(3)); }
const out = new Uint8ClampedArray(NT * 4);
for (let i = 0; i < NT; i++) { if (!filled[i]) continue; const w = wC[i]; for (let c = 0; c < 3; c++) out[i * 4 + c] = colB[i * 3 + c] * (1 - w) + colC[i * 3 + c] * gain[c] * w; out[i * 4 + 3] = 255; }
// dilate so mipmaps and filtering never pull background into the seams
for (let it = 0; it < 8; it++) {
  const add = [];
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) { const i = y * TW + x; if (filled[i]) continue; let n = 0; const a = [0, 0, 0, 0, 0, 0];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= TW || yy >= TH) continue; const j = yy * TW + xx; if (!filled[j]) continue; for (let c = 0; c < 3; c++) { a[c] += out[j * 4 + c]; a[3 + c] += nout[j * 4 + c]; } n++; }
    if (n) add.push([i, a.map(v => v / n)]); }
  for (const [i, a] of add) { for (let c = 0; c < 3; c++) { out[i * 4 + c] = a[c]; nout[i * 4 + c] = a[3 + c]; } out[i * 4 + 3] = nout[i * 4 + 3] = 255; filled[i] = 1; }
}
for (let i = 0; i < NT; i++) if (!filled[i]) { out[i * 4 + 3] = 255; nout[i * 4] = 128; nout[i * 4 + 1] = 128; nout[i * 4 + 2] = 255; nout[i * 4 + 3] = 255; }
const jpg = jpeg.encode({ data: out, width: TW, height: TH }, E('Q', 88)).data, njpg = jpeg.encode({ data: nout, width: TW, height: TH }, E('NQ', 80)).data;
console.log('colour jpeg', jpg.length, 'normal jpeg', njpg.length);

// ---- 7. the eye mask: all white (his eyes are the scan's own), as the other squad models have ----
function whitePng(Wd) {
  const crc32 = (buf) => { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((Wd + 1) * Wd, 255); for (let y = 0; y < Wd; y++) raw[y * (Wd + 1)] = 0;
  const ih = Buffer.alloc(13); ih.writeUInt32BE(Wd, 0); ih.writeUInt32BE(Wd, 4); ih[8] = 8;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// ---- 8. write ----
const nd = new Document(), buf = nd.createBuffer();
const tex = nd.createTexture('ronnie_baked').setImage(new Uint8Array(jpg)).setMimeType('image/jpeg');
const mtex = nd.createTexture('ronnie_eye_openings_alpha').setImage(new Uint8Array(whitePng(1024))).setMimeType('image/png');
const ntex = nd.createTexture('ronnie_normal_threejs').setImage(new Uint8Array(njpg)).setMimeType('image/jpeg');
const m2 = nd.createMaterial('ronnie').setBaseColorTexture(tex).setNormalTexture(ntex).setOcclusionTexture(mtex).setMetallicFactor(0).setRoughnessFactor(0.85);
const prim = nd.createPrimitive().setMaterial(m2)
  .setAttribute('POSITION', nd.createAccessor().setType('VEC3').setArray(OP).setBuffer(buf))
  .setAttribute('NORMAL', nd.createAccessor().setType('VEC3').setArray(ON).setBuffer(buf))
  .setAttribute('TEXCOORD_0', nd.createAccessor().setType('VEC2').setArray(OUV).setBuffer(buf))
  .setIndices(nd.createAccessor().setType('SCALAR').setArray(nO < 65536 ? Uint16Array.from(OIDX) : OIDX).setBuffer(buf));
nd.createScene('Scene').addChild(nd.createNode('ronnie').setMesh(nd.createMesh('ronnie').addPrimitive(prim)));
await new NodeIO().write(OUT, nd);
console.log('wrote', OUT, nO, 'verts', OIDX.length / 3, 'tris');
