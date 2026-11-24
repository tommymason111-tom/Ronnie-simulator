// QUALITY TIERS: how much detail the characters (and the picture round them) get, picked for the device when the game
// loads, changeable in SETTINGS (AUTO / ULTRA / HIGH / MEDIUM / LOW), and stepped down on AUTO if the frame rate drops.
//
//   ULTRA  (computers)      the characters smoothed (each triangle split in four, curved to the surface), a 4096 x 4096
//                           skin and cloth detail atlas made on the graphics chip at load (pores, weave), sharper texture
//                           filtering, a 4096 sun shadow map, soft contact shadows under everyone indoors, a finer picture
//   HIGH   (iPhone/iPad,    exactly the game as it was before tiers: same models, same textures (1024 skins on a phone),
//           Android)        same shadows, same picture
//   MEDIUM (Meta Quest)     lighter models (fewer triangles near, far fewer further off: switched by distance), 1024
//                           skins with 512 surface detail, a 1024 shadow map, only nearby people cast shadows
//   LOW    (the floor the   lighter again, 512 skins, a 512 shadow map, only people right by you cast shadows, no
//           auto-drop stops at) antialiasing (next load)
//
// What changes at once: the picture's resolution, the shadow map, who casts shadows, which model each person shows (built
// in quiet moments, a person at a time). What waits for the next game (place) loaded: the textures, the ULTRA smoothing
// and detail (they'd need new shaders: building one mid-game is a stutter), antialiasing.
//
// THE FRAME-RATE WATCH (AUTO only): the real frame rate, averaged over a few seconds, ignoring hitches (a frame over
// 0.25s: loading, a tab switch), the first seconds of play, and anything that isn't play (paused, a cut scene, the
// receipt, the loading screen). The target is the screen's own refresh rate: 72 on the Quest (the headset's frame rate
// in VR), the owner's 72 on fast screens, and on a 60Hz screen (most phones and laptops, which can never show more than
// 60) it only steps down when it falls clearly under 60. One step down at a time, at most every 10s, never back up mid-game.
import * as THREE from 'three';

export const TIERS = ['ultra', 'high', 'medium', 'low'];
const NAMES = { auto: 'AUTO', ultra: 'ULTRA', high: 'HIGH', medium: 'MEDIUM', low: 'LOW' };
const KEY = 'rs_quality';
const UA = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
const TOUCH = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;
// a phone or tablet (the same test ragdoll.js always used for its phone-sized pictures)
export const PHONE = /iPhone|iPad|iPod|Android/i.test(UA) || (TOUCH > 1 && /Macintosh/.test(UA));

// ---------------------------------------------------------------- which device is this?
export function detectTier({ ua = UA, touch = TOUCH, mem = (typeof navigator !== 'undefined' && navigator.deviceMemory) || 0, cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 0 } = {}) {
  if (/OculusBrowser|\bQuest\b|Pacific|PicoBrowser|Wolvic|\bVR\b.*Safari/i.test(ua)) return 'medium';      // (a standalone headset)
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && touch > 1)) return 'high';                       // (iPadOS says it's a Mac, with touch)
  if (/Android/i.test(ua)) return (mem && mem <= 2) || (cores && cores <= 2) ? 'medium' : 'high';              // (a clearly weak Android)
  if (/Mobile|Tablet|Silk|KAIOS/i.test(ua)) return 'high';
  return 'ultra';
}
const urlQ = (() => { try { const q = new URLSearchParams(location.search).get('q'); return q && TIERS.includes(q.toLowerCase()) ? q.toLowerCase() : null; } catch (e) { return null; } })();
const stored = () => { try { const s = localStorage.getItem(KEY); return s && (s === 'auto' || TIERS.includes(s)) ? s : 'auto'; } catch (e) { return 'auto'; } };
// automated browsers (the test suite) play at HIGH, the game as it always was, unless a test asks for a tier with ?q=
const AUTOMATED = typeof navigator !== 'undefined' && !!navigator.webdriver;
export const DETECTED = detectTier();
const S = {
  choice: urlQ || (AUTOMATED && stored() === 'auto' ? 'high' : stored()),      // auto | a tier
  dropped: null,          // AUTO's own step down this page (a tier), if it made one
  live: null,             // the tier in force now
  build: null,            // the tier this page's textures and shaders were made at (fixed for the page)
};
const autoTier = () => S.dropped || DETECTED;
const want = () => (S.choice === 'auto' ? autoTier() : S.choice);
S.live = S.build = want();
export const quality = {
  get tier() { return S.live; }, get buildTier() { return S.build; }, get choice() { return S.choice; }, detected: DETECTED,
};

// ---------------------------------------------------------------- what each tier means
// skin: biggest character picture side; normal: biggest surface-detail picture side; geo: the levels of detail, near to
// far ('sub' = smoothed, 'base' = the model as it is, a number = that share of its triangles), with where each ends (m)
const SPEC = {
  ultra: { skin: 4096, normal: 1e9, aniso: 16, pr: [1.25, 2], shadow: 4096, casters: Infinity, geo: [['sub', 4.5], ['base', Infinity]], blob: true, aa: true, xrScale: 1 },
  high: { skin: PHONE ? 1024 : 4096, normal: PHONE ? 512 : 1e9, aniso: 4, pr: [0, 1.75], shadow: 2048, casters: Infinity, geo: [['base', Infinity]], aa: true, xrScale: 1 },
  medium: { skin: 1024, normal: 512, aniso: 4, pr: [0, 1.25], shadow: 1024, casters: 9, geo: [[0.6, 5], [0.28, Infinity]], aa: true, xrScale: 1 },
  low: { skin: 512, normal: 256, aniso: 2, pr: [0, 1], shadow: 512, casters: 4, geo: [[0.3, 3.5], [0.14, Infinity]], aa: false, xrScale: 0.85 },
};
export const spec = (t = S.live) => SPEC[t] || SPEC.high;
// the pictures are made once per model when it loads: at the page's own tier
export const skinCaps = () => ({ skin: SPEC[S.build].skin, normal: SPEC[S.build].normal, aniso: SPEC[S.build].aniso });
export const antialias = () => SPEC[S.build].aa;
export function pixelRatio(t = S.live) { const [lo, hi] = spec(t).pr, d = (typeof window !== 'undefined' && window.devicePixelRatio) || 1; return Math.min(hi, Math.max(lo, d)); }

// ================================================================= THE CHARACTERS' SHAPES
// Every character's model goes through here once it's skinned (ragdoll.js loadModel). The model as it is ('base') is
// kept; the tier's levels are made from it (smoothed for ULTRA, lighter for MEDIUM/LOW), and each frame the mesh shows
// the level for how far away it is (the same material: no new shader, ever).
const RAGS = new Set(), TIMES = { sub: 0, dec: 0, detail: 0 };
export function charGeo(rag, geo) {
  const q = rag.qlod = { base: geo, sub: null, dec: new Map(), levels: null, cur: 0, tier: null };
  if (S.build === 'ultra') { const t0 = performance.now(); try { q.sub = subdividePN(geo); } catch (e) { console.warn('quality: smoothing', e); } TIMES.sub += performance.now() - t0; }
  setLevels(rag, S.live);
  RAGS.add(rag);
  return q.levels[0].geo;
}
// the model shells (shoes, a uniform) are made from the near model as it is (never a far one, never the smoothed one)
export const shellGeo = (rag) => (rag.qlod ? (rag.qlod.levels && typeof rag.qlod.levels[0].kind === 'number' ? rag.qlod.levels[0].geo : rag.qlod.base) : rag.mesh.geometry);
function levelGeo(q, kind) {
  if (kind === 'base') return q.base;
  if (kind === 'sub') return q.sub || q.base;
  let g = q.dec.get(kind); if (!g) { const t0 = performance.now(); g = decimate(q.base, kind); TIMES.dec += performance.now() - t0; q.dec.set(kind, g); } return g;
}
function setLevels(rag, tier) {
  const q = rag.qlod; if (!q) return;
  q.levels = spec(tier).geo.map(([kind, far]) => { const g = levelGeo(q, kind); g.userData.keep = true; return { kind, far, geo: g }; });
  q.tier = tier; q.cur = 0;
  // whatever's no longer one of its levels goes (from the graphics chip, and the lighter copies from memory too)
  const used = new Set(q.levels.map(l => l.geo));
  for (const [k, g] of [...q.dec]) if (!used.has(g)) { q.dec.delete(k); g.userData.keep = false; g.dispose(); }
  for (const g of [q.base, q.sub]) if (g && !used.has(g)) { g.userData.keep = false; }
  if (rag.mesh && rag.mesh.geometry !== q.levels[0].geo) rag.mesh.geometry = q.levels[0].geo;
}
const _cp = new THREE.Vector3();
function updateLods(camPos) {
  for (const rag of RAGS) {
    const q = rag.qlod;
    if (!rag.group.parent || !q) { RAGS.delete(rag); if (q) for (const g of [q.base, q.sub, ...q.dec.values()]) if (g) { g.userData.keep = false; g.dispose(); } continue; }      // (gone: let its shapes go)
    if (q.tier !== S.live && !q.pending) continue;
    if (!rag.mesh || q.levels.length < 2) continue;
    const pb = rag.parts && rag.parts.pelvis && rag.parts.pelvis.body; if (!pb) continue;
    const d = Math.hypot(pb.position.x - camPos.x, pb.position.y - camPos.y, pb.position.z - camPos.z) / Math.max(0.6, (rag.height || 1.75) / 1.75);
    let i = q.cur;
    while (i < q.levels.length - 1 && d > q.levels[i].far * 1.08) i++;      // (a little either way of the line: no flicking back and forth on it)
    while (i > 0 && d < q.levels[i - 1].far * 0.92) i--;
    if (i !== q.cur) { q.cur = i; rag.mesh.geometry = q.levels[i].geo; }
  }
}
// a tier change mid-game: each person's levels remade, one person at a time (a lighter model takes a few ms to make)
let relevel = [];
function queueRelevel() { relevel = [...RAGS]; }
function relevelStep() { const rag = relevel.shift(); if (rag && rag.qlod && rag.group.parent) setLevels(rag, S.live); }

// ULTRA: every triangle split in four, the new corners lifted onto the curved surface the corners' normals describe
// (curved "PN" triangles), so outlines, heads, hands and fingers are rounder. Everything else on a new corner is the
// average of the edge's ends: texture position, the belly's shape, and the bone weights (the four biggest kept, adding
// up to one), so it bends with the skeleton exactly as the skin round it does.
export function subdividePN(geo, curve = 0.75) {
  if (!geo.index) return geo;
  const P = geo.attributes.position, N = geo.attributes.normal, n = P.count, idx = geo.index.array;
  if (!N) return geo;
  // copies of one point (texture seams) share one curved normal and one new point per edge, so no seam can open
  const wid = new Int32Array(n), wmap = new Map(), wn = [];
  for (let i = 0; i < n; i++) { const k = Math.round(P.getX(i) * 8000) + ',' + Math.round(P.getY(i) * 8000) + ',' + Math.round(P.getZ(i) * 8000);
    let w = wmap.get(k); if (w === undefined) { w = wn.length / 3; wmap.set(k, w); wn.push(0, 0, 0); } wid[i] = w; wn[w * 3] += N.getX(i); wn[w * 3 + 1] += N.getY(i); wn[w * 3 + 2] += N.getZ(i); }
  for (let w = 0; w < wn.length; w += 3) { const l = Math.hypot(wn[w], wn[w + 1], wn[w + 2]) || 1; wn[w] /= l; wn[w + 1] /= l; wn[w + 2] /= l; }
  const edges = new Map(), mids = [];
  const T = idx.length / 3, out = new Uint32Array(T * 12);
  const mid = (a, b) => { const k = a < b ? a * n + b : b * n + a; let m = edges.get(k); if (m === undefined) { m = n + mids.length; edges.set(k, m); mids.push(a < b ? a : b, a < b ? b : a); } return m; };
  for (let t = 0; t < T; t++) {
    const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2], ab = mid(a, b), bc = mid(b, c), ca = mid(c, a), o = t * 12;
    out[o] = a; out[o + 1] = ab; out[o + 2] = ca; out[o + 3] = ab; out[o + 4] = b; out[o + 5] = bc;
    out[o + 6] = ca; out[o + 7] = bc; out[o + 8] = c; out[o + 9] = ab; out[o + 10] = bc; out[o + 11] = ca;
  }
  const M = mids.length / 2, total = n + M, g = new THREE.BufferGeometry();
  const lerpAttr = (at, normalize) => {
    const k = at.itemSize, arr = new at.array.constructor(total * k);
    for (let v = 0; v < n; v++) for (let c = 0; c < k; c++) arr[v * k + c] = at.getComponent(v, c);
    for (let m = 0; m < M; m++) { const a = mids[m * 2], b = mids[m * 2 + 1]; let l = 0;
      for (let c = 0; c < k; c++) { const x = (at.getComponent(a, c) + at.getComponent(b, c)) * 0.5; arr[(n + m) * k + c] = x; l += x * x; }
      if (normalize && l > 0) { l = Math.sqrt(l); for (let c = 0; c < k; c++) arr[(n + m) * k + c] /= l; } }
    return new THREE.BufferAttribute(arr, k, at.normalized);
  };
  for (const name of Object.keys(geo.attributes)) {
    if (name === 'skinIndex' || name === 'skinWeight' || name === 'position') continue;
    g.setAttribute(name, lerpAttr(geo.attributes[name], name === 'normal'));
  }
  // the curved new points (by the welded points and normals: both copies of a seam edge land on the same spot)
  { const arr = new Float32Array(total * 3);
    for (let v = 0; v < n; v++) { arr[v * 3] = P.getX(v); arr[v * 3 + 1] = P.getY(v); arr[v * 3 + 2] = P.getZ(v); }
    for (let m = 0; m < M; m++) { let a = mids[m * 2], b = mids[m * 2 + 1]; if (wid[a] > wid[b]) { const s = a; a = b; b = s; }
      const wa = wid[a] * 3, wb = wid[b] * 3, ax = P.getX(a), ay = P.getY(a), az = P.getZ(a), bx = P.getX(b), by = P.getY(b), bz = P.getZ(b);
      const dx = bx - ax, dy = by - ay, dz = bz - az;
      const w12 = dx * wn[wa] + dy * wn[wa + 1] + dz * wn[wa + 2], w21 = -(dx * wn[wb] + dy * wn[wb + 1] + dz * wn[wb + 2]);
      const k = curve / 8;
      arr[(n + m) * 3] = (ax + bx) * 0.5 - k * (w12 * wn[wa] + w21 * wn[wb]);
      arr[(n + m) * 3 + 1] = (ay + by) * 0.5 - k * (w12 * wn[wa + 1] + w21 * wn[wb + 1]);
      arr[(n + m) * 3 + 2] = (az + bz) * 0.5 - k * (w12 * wn[wa + 2] + w21 * wn[wb + 2]); }
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3)); }
  // bone weights: both ends' weights shared half and half, the four biggest kept, adding up to one
  { const SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
    if (SI && SW) {
      const si = new SI.array.constructor(total * 4), sw = new Float32Array(total * 4);
      for (let v = 0; v < n; v++) for (let c = 0; c < 4; c++) { si[v * 4 + c] = SI.getComponent(v, c); sw[v * 4 + c] = SW.getComponent(v, c); }
      const acc = new Map();
      for (let m = 0; m < M; m++) { acc.clear();
        for (const e of [mids[m * 2], mids[m * 2 + 1]]) for (let c = 0; c < 4; c++) { const w = SW.getComponent(e, c); if (w > 0) { const b = SI.getComponent(e, c); acc.set(b, (acc.get(b) || 0) + w * 0.5); } }
        const top = [...acc].sort((x, y) => y[1] - x[1]).slice(0, 4), tot = top.reduce((s, x) => s + x[1], 0) || 1;
        for (let c = 0; c < 4; c++) { si[(n + m) * 4 + c] = top[c] ? top[c][0] : 0; sw[(n + m) * 4 + c] = top[c] ? top[c][1] / tot : 0; } }
      g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    } }
  for (const name of Object.keys(geo.morphAttributes)) g.morphAttributes[name] = geo.morphAttributes[name].map(a => lerpAttr(a, false));
  g.morphTargetsRelative = geo.morphTargetsRelative;
  g.setIndex(new THREE.BufferAttribute(out, 1));
  return g;
}

// MEDIUM / LOW: a lighter model by gathering nearby points into one (a grid over the body, finer or coarser to keep the
// wanted share of triangles). Points are only gathered with others on the same bone (an arm never fuses to the body),
// and each kept point is a real point of the model with its own texture position and bone weights, so it's skinned
// exactly as before. Every copy of a point (texture seams) moves to the same spot, so nothing opens up.
export function decimate(geo, share) {
  if (!geo.index) return geo;
  const P = geo.attributes.position, n = P.count, idx = geo.index.array, T = idx.length / 3;
  const SI = geo.attributes.skinIndex, UV = geo.attributes.uv;
  geo.computeBoundingBox(); const bb = geo.boundingBox, size = bb.getSize(new THREE.Vector3());
  const bone = new Int32Array(n); for (let i = 0; i < n; i++) bone[i] = SI ? SI.getX(i) : 0;
  const run = (cell) => {
    const sp = new Map(), sid = new Int32Array(n), at = new Map(), aid = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const cx = Math.floor((P.getX(i) - bb.min.x) / cell), cy = Math.floor((P.getY(i) - bb.min.y) / cell), cz = Math.floor((P.getZ(i) - bb.min.z) / cell);
      const ks = ((cx * 2048 + cy) * 2048 + cz) * 64 + (bone[i] & 63);
      let s = sp.get(ks); if (s === undefined) { s = sp.size; sp.set(ks, s); } sid[i] = s;
      const ka = ks * 4096 + (UV ? Math.floor(UV.getX(i) * 48) * 64 + Math.floor(UV.getY(i) * 48) : 0);      // (a texture island never shares a point with another)
      let a = at.get(ka); if (a === undefined) { a = at.size; at.set(ka, a); } aid[i] = a;
    }
    let tris = 0; for (let t = 0; t < T; t++) { const a = aid[idx[t * 3]], b = aid[idx[t * 3 + 1]], c = aid[idx[t * 3 + 2]]; if (a !== b && b !== c && a !== c) tris++; }
    return { sid, aid, S: sp.size, A: at.size, tris };
  };
  // the cell size for the share wanted (halving the gap a few times)
  const area = 2 * (size.x * size.y + size.y * size.z + size.x * size.z);
  let lo = 0.001, hi = Math.sqrt(area / 50), best = null;
  for (let it = 0; it < 9; it++) { const c = Math.sqrt(lo * hi), r = run(c); if (r.tris > T * share) lo = c; else hi = c; if (!best || Math.abs(r.tris - T * share) < Math.abs(best.tris - T * share)) best = r; }
  const { sid, aid, S: NS, A: NA } = best;
  // each gathered point: the average spot of its points (shared by its copies), the real point nearest it for the rest
  const sum = new Float64Array(NS * 4);
  for (let i = 0; i < n; i++) { const s = sid[i] * 4; sum[s] += P.getX(i); sum[s + 1] += P.getY(i); sum[s + 2] += P.getZ(i); sum[s + 3]++; }
  const rep = new Int32Array(NA).fill(-1), repD = new Float64Array(NA).fill(Infinity);
  for (let i = 0; i < n; i++) { const s = sid[i] * 4, k = sum[s + 3], d = (P.getX(i) - sum[s] / k) ** 2 + (P.getY(i) - sum[s + 1] / k) ** 2 + (P.getZ(i) - sum[s + 2] / k) ** 2; const a = aid[i]; if (d < repD[a]) { repD[a] = d; rep[a] = i; } }
  const g = new THREE.BufferGeometry();
  for (const name of Object.keys(geo.attributes)) {
    const at = geo.attributes[name], k = at.itemSize, arr = new at.array.constructor(NA * k);
    for (let a = 0; a < NA; a++) for (let c = 0; c < k; c++) arr[a * k + c] = at.getComponent(rep[a], c);
    g.setAttribute(name, new THREE.BufferAttribute(arr, k, at.normalized));
  }
  { const p = g.attributes.position; for (let a = 0; a < NA; a++) { const s = sid[rep[a]] * 4, k = sum[s + 3]; p.setXYZ(a, sum[s] / k, sum[s + 1] / k, sum[s + 2] / k); } }
  for (const name of Object.keys(geo.morphAttributes)) g.morphAttributes[name] = geo.morphAttributes[name].map(at => {
    const k = at.itemSize, acc = new Float64Array(NS * k), arr = new Float32Array(NA * k);
    for (let i = 0; i < n; i++) for (let c = 0; c < k; c++) acc[sid[i] * k + c] += at.getComponent(i, c);
    for (let a = 0; a < NA; a++) { const s = sid[rep[a]], cnt = sum[s * 4 + 3]; for (let c = 0; c < k; c++) arr[a * k + c] = acc[s * k + c] / cnt; }
    return new THREE.BufferAttribute(arr, k);
  });
  g.morphTargetsRelative = geo.morphTargetsRelative;
  const out = [], seen = new Set();
  for (let t = 0; t < T; t++) { const a = aid[idx[t * 3]], b = aid[idx[t * 3 + 1]], c = aid[idx[t * 3 + 2]]; if (a === b || b === c || a === c) continue;
    const m = Math.min(a, b, c), M = Math.max(a, b, c), key = (m * NA + (a + b + c - m - M)) * NA + M; if (seen.has(key)) continue; seen.add(key); out.push(a, b, c); }
  g.setIndex(new THREE.BufferAttribute(NA > 65535 ? new Uint32Array(out) : new Uint16Array(out), 1));
  return g;
}

// ================================================================= ULTRA: SKIN AND CLOTH DETAIL
// A 4096 x 4096 detail atlas over each character's own texture layout (2048 on a phone or tablet set to ULTRA), drawn
// once on the graphics chip when the game loads (no files, nothing to download): skin gets pores and fine creases, clothes
// a woven texture. Each character's shader reads it, finds skin or cloth by the colour under it, and bends the light by
// it (and shades its little hollows), only up close: further off it averages away to the picture as it always was.
const DETAIL = { value: null }, DET_STR = { value: 0 };
const DETAIL_GLSL = `
  float rsDetShade = 1.0;
  #ifdef USE_NORMALMAP_TANGENTSPACE
  if (uDetStr > 0.0) {
    vec4 rsD = texture2D(uDetail, vNormalMapUv);
    vec3 rsC = diffuseColor.rgb; float rsL = dot(rsC, vec3(0.299, 0.587, 0.114));
    float rsSkin = smoothstep(0.03, 0.1, rsC.r - rsC.b) * step(rsC.g, rsC.r) * smoothstep(0.12, 0.25, rsL);
    vec2 rsN = mix(rsD.ba, rsD.rg, rsSkin) * 2.0 - 1.0;
    normal = normalize(normal + tbn * vec3(rsN * uDetStr * mix(0.9, 0.55, rsSkin), 0.0));
    rsDetShade = 1.0 + dot(rsN, vec2(-0.5, 0.8)) * uDetStr * mix(0.3, 0.16, rsSkin);
    diffuseColor.rgb *= rsDetShade;
  }
  #endif`;
export function charMat(mat) {
  if (S.build !== 'ultra') return mat;
  const base = mat.onBeforeCompile;
  mat.onBeforeCompile = function (sh, r) {
    base.call(this, sh, r);
    sh.uniforms.uDetail = DETAIL; sh.uniforms.uDetStr = DET_STR;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uDetail; uniform float uDetStr;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + DETAIL_GLSL)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance *= rsDetShade;');
  };
  const key = base.toString() + '|rs-detail-1';
  mat.customProgramCacheKey = () => key;
  const a = SPEC.ultra.aniso; for (const t of [mat.map, mat.normalMap]) if (t) t.anisotropy = a;
  return mat;
}
const DETAIL_FRAG = `
  precision highp float; varying vec2 vUv; uniform float uSize;
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  vec2 h22(vec2 p) { float a = h21(p); return vec2(a, h21(p + a + 17.0)); }
  // value noise that repeats every 'per' cells
  float vnoise(vec2 p, float per) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    float a = h21(mod(i, per)), b = h21(mod(i + vec2(1, 0), per)), c = h21(mod(i + vec2(0, 1), per)), d = h21(mod(i + vec2(1, 1), per));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }
  // pores: the distance to the nearest of one scattered point per cell
  float pores(vec2 p, float per) { vec2 i = floor(p), f = fract(p); float d = 9.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 o = vec2(x, y), c = mod(i + o, per), r = h22(c) * 0.8 + 0.1;
      vec2 q = o + r - f; d = min(d, dot(q, q) * (0.6 + h21(c + 3.1))); }
    return d; }
  float skinH(vec2 uv) {
    float s = uSize, pr = s / 5.0;                                    // a pore every ~5 texels
    float h = -exp(-pores(uv * pr, pr) / 0.035) * 0.9;
    h += (vnoise(uv * s / 24.0, s / 24.0) - 0.5) * 0.9 + (vnoise(uv * s / 9.0, s / 9.0) - 0.5) * 0.45;
    float cr = vnoise(vec2(uv.x * s / 40.0, uv.y * s / 6.0), s / 40.0);   // fine creases
    h -= smoothstep(0.08, 0.0, abs(cr - 0.5)) * 0.35;
    return h; }
  float clothH(vec2 uv) {
    float per = uSize / 8.0; vec2 q = uv * per, i = floor(q), f = fract(q);      // a thread every ~8 texels, over and under
    float over = mod(i.x + i.y, 2.0);
    float wu = sqrt(max(0.0, sin(3.14159 * f.y))), wv = sqrt(max(0.0, sin(3.14159 * f.x)));
    float bend = sin(3.14159 * (over > 0.5 ? f.x : f.y));
    float h = max(wu * mix(0.55, 1.0, over) * (0.75 + 0.25 * (over > 0.5 ? bend : 1.0)), wv * mix(1.0, 0.55, over) * (0.75 + 0.25 * (over < 0.5 ? bend : 1.0)));
    h += (vnoise(uv * uSize / 2.0, uSize / 2.0) - 0.5) * 0.25 + (vnoise(uv * uSize / 64.0, uSize / 64.0) - 0.5) * 0.4;
    return h; }
  void main() { gl_FragColor = vec4(skinH(vUv), clothH(vUv), 0.0, 1.0); }`;
// (second pass: the heights' slopes, from the texels either side, as the two surface-detail normals)
const DETAIL_NORMALS = `
  precision highp float; varying vec2 vUv; uniform float uSize; uniform sampler2D uH;
  void main() {
    float e = 1.0 / uSize;
    vec2 l = texture2D(uH, vUv - vec2(e, 0)).rg, r = texture2D(uH, vUv + vec2(e, 0)).rg, d = texture2D(uH, vUv - vec2(0, e)).rg, u = texture2D(uH, vUv + vec2(0, e)).rg;
    vec2 sn = vec2(l.x - r.x, d.x - u.x) * 0.9, cn = vec2(l.y - r.y, d.y - u.y) * 0.8;
    sn /= max(1.0, length(sn)); cn /= max(1.0, length(cn));
    gl_FragColor = vec4(sn * 0.5 + 0.5, cn * 0.5 + 0.5);
  }`;
function makeDetail(renderer) {
  if (S.build !== 'ultra' || DETAIL.value) return;
  const size = PHONE ? 2048 : Math.min(4096, renderer.capabilities.maxTextureSize || 4096);
  const rt = new THREE.WebGLRenderTarget(size, size, { depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, colorSpace: THREE.NoColorSpace });
  rt.texture.anisotropy = SPEC.ultra.aniso; rt.texture.userData.keep = true;
  const hrt = new THREE.WebGLRenderTarget(size, size, { depthBuffer: false, type: (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float')) ? THREE.HalfFloatType : THREE.UnsignedByteType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, colorSpace: THREE.NoColorSpace });
  const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const m1 = new THREE.ShaderMaterial({ uniforms: { uSize: { value: size } }, vertexShader: VS, fragmentShader: DETAIL_FRAG, depthTest: false, depthWrite: false });
  const m2 = new THREE.ShaderMaterial({ uniforms: { uSize: { value: size }, uH: { value: hrt.texture } }, vertexShader: VS, fragmentShader: DETAIL_NORMALS, depthTest: false, depthWrite: false });
  const sc = new THREE.Scene(), cam = new THREE.Camera(), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m1); quad.frustumCulled = false; sc.add(quad);
  const was = renderer.getRenderTarget(), xr = renderer.xr.enabled, t0 = performance.now();
  try { renderer.xr.enabled = false; renderer.setRenderTarget(hrt); renderer.render(sc, cam); quad.material = m2; renderer.setRenderTarget(rt); renderer.render(sc, cam); } catch (e) { console.warn('quality: detail', e); }
  finally { renderer.setRenderTarget(was); renderer.xr.enabled = xr; }
  TIMES.detail = performance.now() - t0;
  m1.dispose(); m2.dispose(); quad.geometry.dispose(); hrt.dispose();
  DETAIL.value = rt.texture; DETAIL.rt = rt; DET_STR.value = 1;
}

// ================================================================= THE PICTURE: resolution, shadows, contact shadows
let R = null;      // { renderer, scene, camera, room }
export function attach(o) {
  R = o; S.t0 = now(); S.grace = 8;
  makeDetail(o.renderer);
  if (S.build === 'ultra' && !(o.room && o.room.shadows)) makeBlobs(o.scene);
  applyLive(true);
  try { window.__quality = API; } catch (e) {}
}
function applyLive(first) {
  if (!R) return;
  const r = R.renderer, sp = spec();
  if (!r.xr.isPresenting) { const pr = pixelRatio(); if (Math.abs(r.getPixelRatio() - pr) > 1e-3) r.setPixelRatio(pr); try { r.xr.setFramebufferScaleFactor(sp.xrScale); } catch (e) {} }
  const sun = R.room && R.room.shadows && R.room.sun;
  if (sun && sun.shadow) { const want = Math.min(sp.shadow, r.capabilities.maxTextureSize || 4096);
    if (sun.shadow.mapSize.x !== want) { sun.shadow.mapSize.set(want, want); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } } }
  DET_STR.value = DETAIL.value && S.live === 'ultra' ? 1 : 0;
  if (BLOB) BLOB.visible = S.live === 'ultra';
  if (!first) queueRelevel();
}
// MEDIUM / LOW: only people near you cast a shadow (the sun's shadow map is drawn again every frame: each body in it is
// another draw of every triangle)
const _wp = new THREE.Vector3();
function updateCasters(camPos) {
  const lim = spec().casters;
  for (const rag of RAGS) { const m = rag.mesh; if (!m || !m.userData.shad) continue;      // (only those the level made cast one)
    const pb = rag.parts && rag.parts.pelvis && rag.parts.pelvis.body; if (!pb) continue;
    const on = lim === Infinity || Math.hypot(pb.position.x - camPos.x, pb.position.z - camPos.z) < lim;
    if (m.castShadow !== on) rag.group.traverse(o => { if (o.isSkinnedMesh || (o.isMesh && o.parent && o.parent.isBone)) o.castShadow = on; }); }
}
// ULTRA indoors (no sun): a soft contact shadow on the floor under everyone, all of them in one draw
let BLOB = null; const BLOB_N = 32;
function makeBlobs(scene) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c); tex.userData.keep = true;
  const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); mat.userData.keep = true;
  BLOB = new THREE.InstancedMesh(geo, mat, BLOB_N); BLOB.name = 'contact shadows'; BLOB.frustumCulled = false; BLOB.renderOrder = -1; BLOB.raycast = () => {};
  const m = new THREE.Matrix4().makeTranslation(0, -1000, 0); for (let i = 0; i < BLOB_N; i++) BLOB.setMatrixAt(i, m);
  scene.add(BLOB);
}
const _bm = new THREE.Matrix4(), _bq = new THREE.Quaternion(), _bs = new THREE.Vector3(), _bp = new THREE.Vector3();
function updateBlobs() {
  if (!BLOB || !BLOB.visible) return;
  let i = 0; const fl = R.room && R.room.floorAt;
  for (const rag of RAGS) { if (i >= BLOB_N) break; const m = rag.mesh; if (!m || !rag.group.visible || !m.visible || (m.material && (m.material.transparent || m.material.opacity < 1))) continue;
    let vis = true; for (let p = rag.group.parent; p; p = p.parent) if (!p.visible) { vis = false; break; } if (!vis) continue;
    const pb = rag.parts && rag.parts.pelvis && rag.parts.pelvis.body; if (!pb) continue;
    const x = pb.position.x, z = pb.position.z, y = (fl ? fl(x, z) || 0 : 0), up = Math.max(0, pb.position.y - y - rag.standHeight * 0.5), k = (rag.height || 1.75) / 1.75;
    const s = Math.max(0.2, 0.95 - up * 0.5) * k;
    _bm.compose(_bp.set(x, y + 0.006, z), _bq.identity(), _bs.set(s * 0.95, 1, s * 0.95)); BLOB.setMatrixAt(i++, _bm); }
  _bm.makeTranslation(0, -1000, 0); for (let j = i; j < BLOB_N; j++) BLOB.setMatrixAt(j, _bm);
  BLOB.instanceMatrix.needsUpdate = true;
}

// ================================================================= THE FRAME-RATE WATCH
let now = () => performance.now();
// the screen's own refresh rate, from the browser's frame timing while the menu and loading screen are up
const HZ = { value: 60, samples: [] };
const SNAP = [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 240];
export const snapHz = (hz) => SNAP.reduce((b, s) => Math.abs(s - hz) < Math.abs(b - hz) ? s : b, 60);
export function estimateHz(intervals) { const v = intervals.filter(x => x > 2 && x < 60).sort((a, b) => a - b); if (v.length < 8) return 60; return snapHz(1000 / v[Math.floor(v.length / 2)]); }
if (typeof requestAnimationFrame !== 'undefined') { let last = 0, n = 0; const tick = (t) => { if (last) HZ.samples.push(t - last); last = t; if (++n < 90) requestAnimationFrame(tick); else HZ.value = estimateHz(HZ.samples); }; requestAnimationFrame(tick); }
// the frame rate it steps down under: the owner's 72 (a Quest, a fast screen), clearly under 60 on a 60Hz screen
export function dropBelow(hz) { return hz >= 70 ? 72 * 0.94 : hz * 0.92; }
const targetHz = () => { const r = R && R.renderer; if (r && r.xr.isPresenting) { const s = r.xr.getSession && r.xr.getSession(); return (s && s.frameRate) || 72; } return HZ.value; };
const W = { last: 0, sum: 0, n: 0, list: [], nextCheck: 0, cool: 0 };
const WINDOW = 3, COOLDOWN = 10;
export function frame(simDt, busy, cam) {
  if (!R) return;
  if (relevel.length) relevelStep();
  const c = cam || R.camera; c.getWorldPosition(_cp);
  updateLods(_cp); updateCasters(_cp); updateBlobs();
  if (simDt != null) return;      // (a test stepping the game by hand: no real frames to time)
  const t = now(), dt = W.last ? (t - W.last) / 1000 : 0; W.last = t;
  if (S.choice !== 'auto' || busy || document.hidden) { W.list.length = 0; W.sum = 0; W.grace = Math.max(W.grace || 0, 2); return; }
  if (S.grace > 0) { S.grace -= Math.min(dt, 0.25); return; }       // (the first seconds of play)
  if (W.grace > 0) { W.grace -= Math.min(dt, 0.25); return; }       // (and just after anything that isn't play)
  if (W.cool > 0) W.cool -= Math.min(dt, 0.25);
  if (!dt || dt > 0.25) return;                                        // (a hitch: loading something, a tab switch)
  W.list.push(dt); W.sum += dt; while (W.sum > WINDOW && W.list.length > 1) W.sum -= W.list.shift();
  if (W.sum < WINDOW * 0.95 || W.cool > 0) return;
  const fps = W.list.length / W.sum; W.fps = fps;
  if (fps < dropBelow(targetHz())) stepDown(fps);
}
function stepDown(fps) {
  const i = TIERS.indexOf(S.live); if (i < 0 || i >= TIERS.length - 1) return;
  S.dropped = TIERS[i + 1]; S.live = S.dropped; W.cool = COOLDOWN; W.list.length = 0; W.sum = 0; S.drops = (S.drops || 0) + 1;
  applyLive(); refreshUI();
  toast(`Quality lowered to ${NAMES[S.live]} to keep it smooth`);
  console.log('quality: stepped down to', S.live, 'at', Math.round(fps), 'fps');
}

// ================================================================= SETTINGS
export function setChoice(c) {
  if (c !== 'auto' && !TIERS.includes(c)) return;
  S.choice = c; S.dropped = null; try { localStorage.setItem(KEY, c); } catch (e) {}
  const was = S.live; S.live = want();
  if (was !== S.live) applyLive();
  refreshUI();
  return { tier: S.live, nextGame: needsReload() };
}
const needsReload = () => S.live !== S.build && (S.live === 'ultra' || S.build === 'ultra' || spec(S.live).skin !== spec(S.build).skin);
const ORDER = ['auto', 'ultra', 'high', 'medium', 'low'];
const label = () => `✨ QUALITY: ${S.choice === 'auto' ? 'AUTO · ' + NAMES[S.live] : NAMES[S.choice]}`;
function refreshUI() {
  if (typeof document === 'undefined') return;
  for (const id of ['set-quality', 'pause-quality']) { const b = document.getElementById(id); if (b) b.textContent = label(); }
  const nt = document.getElementById('set-quality-note'); if (nt) nt.textContent = noteText();
}
const noteText = () => (needsReload() && R ? `Characters switch to ${NAMES[S.live]} detail at the next game` : S.choice === 'auto' ? `AUTO picked ${NAMES[DETECTED]} for this device (steps down if it can't keep up)` : 'Your choice: AUTO picks for this device');
function cycle() {
  const c = ORDER[(ORDER.indexOf(S.choice) + 1) % ORDER.length], r = setChoice(c);
  if (R) toast(r.nextGame ? `Quality: ${NAMES[c]}. Characters change at the next game` : `Quality: ${NAMES[c]}`);
}
function wire() {
  for (const id of ['set-quality', 'pause-quality']) { const b = document.getElementById(id); if (b && !b.__q) { b.__q = true; b.addEventListener('click', cycle); } }
  refreshUI();
}
if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire(); }
let toastT = 0;
function toast(msg) {
  if (typeof document === 'undefined') return;
  let el = document.getElementById('q-toast');
  if (!el) { el = document.createElement('div'); el.id = 'q-toast'; el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 14px;border-radius:12px;background:rgba(17,20,40,0.92);border:2px solid #ffd400;color:#fff;font:700 13px Arial,sans-serif;text-align:center;pointer-events:none;transition:opacity .3s;opacity:0';
    document.body.appendChild(el); }
  el.textContent = '✨ ' + msg; el.style.opacity = '1'; clearTimeout(toastT); toastT = setTimeout(() => { el.style.opacity = '0'; }, 3200);
  S.lastToast = msg;
}

// for tests and the developer: what's going on
const API = {
  get times() { return { sub: Math.round(TIMES.sub), dec: Math.round(TIMES.dec), detail: Math.round(TIMES.detail) }; },
  get state() { return { choice: S.choice, tier: S.live, build: S.build, detected: DETECTED, dropped: S.dropped, drops: S.drops || 0, hz: HZ.value, fps: W.fps || 0, toast: S.lastToast || '' }; },
  setChoice, detectTier, dropBelow, estimateHz, frame, spec,
  setClock(f) { now = f || (() => performance.now()); W.last = 0; },
  setHz(h) { HZ.value = h; },
  resetWatch() { S.grace = 0; W.grace = 0; W.cool = 0; W.list.length = 0; W.sum = 0; W.last = 0; },
  // every character's triangles (the level showing now, and each level)
  chars() { return [...RAGS].filter(r => r.qlod && r.mesh).map(r => ({ id: r.qlodId || '', tris: r.mesh.geometry.index.count / 3, levels: r.qlod.levels.map(l => ({ kind: l.kind, far: l.far, tris: l.geo.index.count / 3 })), cur: r.qlod.cur, base: r.qlod.base.index.count / 3 })); },
  detail: () => (DETAIL.value ? DETAIL.value.image.width || DETAIL.rt.width : 0),
  blobs: () => !!(BLOB && BLOB.visible),
};
try { if (typeof window !== 'undefined') window.__quality = API; } catch (e) {}
