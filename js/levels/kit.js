// Level-building kit: furniture made of coloured boxes merged into one mesh,
// walls, textured floors, signs, food spots and lights. Every level returns the
// same "room" object the game uses (bounds, colliders, blockers, spawns...).
import * as THREE from 'three';
import { part, merge, vcLambert, box, cyl } from '../geo.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex, signTex, signFits, fitText, FONT } from '../textures.js';
import { NavGrid } from '../nav.js';
import { GlowBatch } from './glow.js';

export class Kit {
  constructor(scene, bounds) {
    this.scene = scene;
    this.bounds = bounds;            // { x0, x1, z0, z1, y1 }
    this.parts = [];
    this.colliders = [];             // surfaces food can land on / bounce off
    this.blockers = [];              // solid footprints (people walk round them)
    this.spawns = [];                // where food appears
    this.geoCache = new Map();
  }
  // a coloured box; collide = food can sit on it, block = people/Ronnie can't walk through
  box(w, h, d, x, y, z, color, { collide = false, block = false, rot = null } = {}) {
    const g = part(box(w, h, d), color, [x, y, z], rot || [0, 0, 0]);
    this.parts.push(g);
    if (!rot || (!rot[0] && !rot[1] && !rot[2])) (this.boxRec = this.boxRec || []).push({ g, color, off: [0, 0, 0], min: [x - w / 2, y - h / 2, z - d / 2], max: [x + w / 2, y + h / 2, z + d / 2] });
    if (collide) this.colliders.push({ min: new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2), max: new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2) });
    if (block) this.blockers.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y1: y + h / 2 });
  }
  // The bare faces of the room's walls: every tall plain wall box (of these colours) gives its two faces, minus
  // the bits already covered by something tall against them (cladding, shelving, another wall), and only the
  // faces that look into a room. Each face: { axis: 'x' | 'z' (the normal), dir: +1 / -1, c: the face plane,
  // a0, a1: its extent along the wall }.
  wallFaces({ colors, minH = 2.5, inside = () => true, skip = () => false }) {
    const L = this.boxRec || [], out = [];
    for (const r of L) {
      if (!colors.has(r.color) || r.max[1] - r.min[1] < minH || r.min[1] > 0.05) continue;
      const dx = r.max[0] - r.min[0], dz = r.max[2] - r.min[2], alongZ = dz > dx, n = alongZ ? 0 : 2, al = alongZ ? 2 : 0;
      if ((alongZ ? dx : dz) > 0.5 || (alongZ ? dz : dx) < 0.4) continue;
      for (const dir of [-1, 1]) {
        const c = dir > 0 ? r.max[n] : r.min[n], a0 = r.min[al], a1 = r.max[al], mid = (a0 + a1) / 2;
        const px = alongZ ? c + dir * 0.25 : mid, pz = alongZ ? mid : c + dir * 0.25;
        if (!inside(px, pz)) continue;
        let free = [[a0, a1]];
        for (const o of L) {
          if (o === r || o.max[1] - o.min[1] < 1.2 || o.min[1] > 0.5) continue;
          const touches = dir > 0 ? (o.min[n] > c - 0.03 && o.min[n] < c + 0.1 && o.max[n] > c + 0.004) : (o.max[n] < c + 0.03 && o.max[n] > c - 0.1 && o.min[n] < c - 0.004);
          if (!touches) continue;
          const b0 = o.min[al], b1 = o.max[al]; if (b1 <= a0 || b0 >= a1) continue;
          free = free.flatMap(([u, v]) => (b1 <= u || b0 >= v) ? [[u, v]] : [[u, Math.max(u, b0)], [Math.min(v, b1), v]].filter(([p, q]) => q - p > 1e-3));
        }
        for (const [u, v] of free) if (v - u >= 0.3) { const f = { axis: alongZ ? 'x' : 'z', dir, c, a0: u, a1: v }; if (!skip(f)) out.push(f); }
      }
    }
    return out;
  }
  // is the space in front of this bit of a wall face empty (nothing standing there that would hide a picture)?
  clearInFront(f, a0, a1, y0, y1, depth = 0.6) {
    const n = f.axis === 'x' ? 0 : 2, al = f.axis === 'x' ? 2 : 0, lo = f.dir > 0 ? f.c + 0.01 : f.c - depth, hi = f.dir > 0 ? f.c + depth : f.c - 0.01;
    for (const o of this.boxRec || []) { if (o.max[n] <= lo || o.min[n] >= hi || o.max[al] <= a0 || o.min[al] >= a1 || o.max[1] <= y0 || o.min[1] >= y1) continue; return false; }
    for (const b of this.blockers) { const bl = f.axis === 'x' ? [b.x0, b.x1, b.z0, b.z1] : [b.z0, b.z1, b.x0, b.x1]; if (bl[1] <= lo || bl[0] >= hi || bl[3] <= a0 || bl[2] >= a1 || (b.y1 ?? 2) <= y0) continue; return false; }
    return true;
  }
  // Textured boxes (walls, cladding, panelling, bulkheads...) that share a material are merged into one mesh per
  // 8m patch: the same look, far fewer draw calls, and patches out of view are still skipped.
  mergeTexBoxes() {
    const groups = new Map();
    for (const m of this.texMeshes || []) {
      if (m.parent !== this.scene || Array.isArray(m.material)) continue;
      m.updateMatrixWorld(true); const p = m.getWorldPosition(new THREE.Vector3()), key = m.material.uuid + ':' + Math.floor(p.x / 8) + ',' + Math.floor(p.z / 8);
      (groups.get(key) || groups.set(key, []).get(key)).push(m);
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      const geos = list.map(m => m.geometry.clone().applyMatrix4(m.matrixWorld));
      const g = mergeGeometries(geos, false); if (!g) continue;
      geos.forEach(x => x.dispose());
      const merged = new THREE.Mesh(g, list[0].material); this.scene.add(merged);
      for (const m of list) { this.scene.remove(m); m.geometry.dispose(); }
    }
  }
  // Two boxes with a face in exactly the same place flicker ("z-fighting": the GPU can't tell which is in front).
  // Find every such pair (same plane, facing the same way, overlapping) and pull the later box's face in by 1.5mm.
  separateCoplanar() {
    const L = this.boxRec || [], E = 1e-4, EPS = 0.0015, key = (v) => Math.round(v / E);
    let n = 0;
    for (let a = 0; a < 3; a++) for (const side of ['min', 'max']) {
      const buckets = new Map();
      L.forEach((b, i) => { const k = key(b[side][a]); (buckets.get(k) || buckets.set(k, []).get(k)).push(i); });
      for (const ids of buckets.values()) {
        if (ids.length < 2) continue;
        for (let jj = 1; jj < ids.length; jj++) for (let ii = 0; ii < jj; ii++) {
          const A = L[ids[ii]], Bx = L[ids[jj]], o1 = (a + 1) % 3, o2 = (a + 2) % 3;
          const ov1 = Math.min(A.max[o1], Bx.max[o1]) - Math.max(A.min[o1], Bx.min[o1]), ov2 = Math.min(A.max[o2], Bx.max[o2]) - Math.max(A.min[o2], Bx.min[o2]);
          if (ov1 <= 1e-4 || ov2 <= 1e-4) continue;
          // move the face of whichever box is thicker along this axis (the thin one may be a cladding sheet)
          const tA = A.max[a] - A.min[a], tB = Bx.max[a] - Bx.min[a], M = tB >= tA ? Bx : A;
          if (M.max[a] - M.min[a] < EPS * 3) continue;
          const plane = M[side][a], dir = side === 'max' ? -1 : 1, pos = M.g.attributes ? M.g.attributes.position : null;
          if (M.g.isMesh) { const gp = M.g.geometry.attributes.position, c = M.g.position.getComponent(a); for (let i = 0; i < gp.count; i++) if (Math.abs(gp.getComponent(i, a) + c - plane) < 1e-5) gp.setComponent(i, a, gp.getComponent(i, a) + dir * EPS); gp.needsUpdate = true; }
          else if (pos) { for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getComponent(i, a) - plane) < 1e-5) pos.setComponent(i, a, pos.getComponent(i, a) + dir * EPS); pos.needsUpdate = true; }
          M[side][a] += dir * EPS; n++;
        }
      }
    }
    return n;
  }
  cyl(rt, rb, h, x, y, z, color, seg = 16, { block = false, collide = false } = {}) {
    this.parts.push(part(cyl(rt, rb, h, seg), color, [x, y, z]));
    const r = Math.max(rt, rb);
    if (block) this.blockers.push({ x0: x - r, x1: x + r, z0: z - r, z1: z + r, y1: y + h / 2 });
    if (collide) this.colliders.push({ min: new THREE.Vector3(x - r * 0.7, y - h / 2, z - r * 0.7), max: new THREE.Vector3(x + r * 0.7, y + h / 2, z + r * 0.7) });
  }
  // a box with a texture repeating every `tile` metres (brick pillars, book walls, panelling)
  texBox(w, h, d, x, y, z, tex, { tile = 1, collide = false, block = false, color = 0xffffff } = {}) {
    const key = tex.uuid;
    this.texMats = this.texMats || new Map();
    if (!this.texMats.has(key)) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; this.texMats.set(key, new THREE.MeshLambertMaterial({ map: tex, color })); }
    const g = new THREE.BoxGeometry(w, h, d);
    // scale UVs per face so the pattern keeps its real-world size
    const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / tile, uv.getY(k) * dims[f][1] / tile); }
    const m = new THREE.Mesh(g, this.texMats.get(key));
    m.position.set(x, y, z); this.scene.add(m); (this.texMeshes = this.texMeshes || []).push(m);
    (this.boxRec = this.boxRec || []).push({ g: m, min: [x - w / 2, y - h / 2, z - d / 2], max: [x + w / 2, y + h / 2, z + d / 2] });
    if (collide) this.colliders.push({ min: new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2), max: new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2) });
    if (block) this.blockers.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y1: y + h / 2 });
    return m;
  }
  // an axis-aligned wall from (x0,z0) to (x1,z1); one of the two must match
  wall(x0, z0, x1, z1, h, color = 0xe9dcc6, thick = 0.2) {
    const w = Math.max(Math.abs(x1 - x0), thick), d = Math.max(Math.abs(z1 - z0), thick);
    this.box(w, h, d, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, color, { collide: true, block: true });
  }
  floor(x0, z0, x1, z1, tex, y = 0.002, repeat = 1) {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    const t = tex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set((x1 - x0) / repeat, (z1 - z0) / repeat);
    this.floorN = (this.floorN || 0) + 1;
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: t, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));   // (overlapping floors sit at different heights; a big offset here drew floors over the bottoms of walls)
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    this.scene.add(m);
    return m;
  }
  ceiling(color = 0xf2ece2, emissive = 0x6a5e4c) {
    const b = this.bounds;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(b.x1 - b.x0, b.z1 - b.z0), new THREE.MeshLambertMaterial({ color, emissive }));
    m.rotation.x = Math.PI / 2; m.position.set((b.x0 + b.x1) / 2, b.y1, (b.z0 + b.z1) / 2);
    this.scene.add(m);
  }
  // a sign / poster (text, or a ready-made texture)
  label(text, w, h, pos, rot, opts = {}) {
    // text signs: drawn sharp, and if the words won't fit at a readable size the sign grows taller (never cut off)
    let tex = opts.tex;
    if (!tex) {
      const W = Math.max(512, Math.min(1024, Math.round(w * 420 / 64) * 64)), size = (opts.size || 64) * W / 512, minPx = Math.max(12, W / w * 0.035);   // ~420px a metre; letters at least 3.5cm tall
      const px = (hh) => Math.max(64, Math.min(2048, Math.round(W * hh / w / 16) * 16));
      const h0 = h; if (!opts.title) for (let i = 0; i < 4 && h < h0 * 1.3 && !signFits(text, W, px(h), size, minPx); i++) h = Math.min(h0 * 1.3, h * 1.1);   // a little taller if it helps
      tex = signTex(text, { w: W, h: px(h), bg: opts.bg, fg: opts.fg, border: opts.border === undefined ? '#c0392b' : opts.border, size, title: opts.title, minSize: 6 });                       // ...then smaller letters: never cut off
    }
    const key = w + 'x' + h;
    if (!this.geoCache.has(key)) this.geoCache.set(key, new THREE.PlaneGeometry(w, h));
    const PO = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 };
    const mat = opts.glow ? new THREE.MeshBasicMaterial({ map: tex, ...PO }) : new THREE.MeshLambertMaterial({ map: tex, ...PO });
    const m = new THREE.Mesh(this.geoCache.get(key), mat);
    m.position.set(...pos); m.rotation.set(...rot); m.userData.sign = text; m.userData.size = [w, h];
    this.scene.add(m);
    return m;
  }
  // a table with chairs; its top is a food spot. seats: chairs per long side
  table(x, z, w, d, { h = 0.76, top = 0x8a5a2b, legs = 0x4a3020, chairs = 2, chairColor = 0x5a3a22, seat = null, cloth = null, round = false, spots = 2 } = {}) {
    if (round) {
      this.cyl(w / 2, w / 2, 0.04, x, h - 0.02, z, cloth || top, 24, { collide: true });
      this.cyl(0.05, 0.08, h - 0.04, x, (h - 0.04) / 2, z, legs, 10);
      if (cloth) this.cyl(w / 2 + 0.01, w / 2 + 0.06, 0.3, x, h - 0.17, z, cloth, 24);
      this.blockers.push({ x0: x - w / 2, x1: x + w / 2, z0: z - w / 2, z1: z + w / 2, y1: h });
    } else {
      this.box(w, 0.05, d, x, h - 0.025, z, cloth || top, { collide: true, block: true });
      if (cloth) this.box(w + 0.04, 0.25, d + 0.04, x, h - 0.15, z, cloth);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box(0.06, h - 0.05, 0.06, x + sx * (w / 2 - 0.08), (h - 0.05) / 2, z + sz * (d / 2 - 0.08), legs);
    }
    // chairs along the long sides
    const alongX = w >= d, n = chairs, len = alongX ? w : d;
    for (let i = 0; i < n; i++) for (const side of [-1, 1]) {
      const t = (i + 0.5) / n - 0.5;
      const cx = alongX ? x + t * len : x + side * (w / 2 + 0.32), cz = alongX ? z + side * (d / 2 + 0.32) : z + t * len;
      this.chair(cx, cz, alongX ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2), chairColor, seat);
    }
    for (let i = 0; i < spots; i++) {
      const t = spots === 1 ? 0 : (i / (spots - 1) - 0.5) * 0.6;
      this.spawns.push(new THREE.Vector3(alongX ? x + t * w : x, h + 0.08, alongX ? z : z + t * d));
    }
  }
  // ry = direction the chair faces (0 = toward -z); every part is rotated with it,
  // so chairs round a round table look right at any angle
  chair(x, z, ry, color = 0x5a3a22, seat = null) {
    const c = Math.cos(ry), s = Math.sin(ry);
    const at = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];      // local (x right, z back) -> world
    const rb = (w, h, d, lx, y, lz, col) => { const [px, pz] = at(lx, lz); this.box(w, h, d, px, y, pz, col, { rot: [0, ry, 0] }); };
    rb(0.42, 0.05, 0.42, 0, 0.45, 0, color);
    if (seat) rb(0.38, 0.05, 0.38, 0, 0.49, 0, seat);                  // padded seat
    rb(0.44, 0.07, 0.05, 0, 0.92, 0.2, color);                          // curved top rail
    for (const t of [-0.15, -0.05, 0.05, 0.15]) rb(0.025, 0.42, 0.025, t, 0.7, 0.2, color);   // spindles
    for (const a of [-1, 1]) for (const b of [-1, 1]) rb(0.04, 0.44, 0.04, a * 0.17, 0.22, b * 0.17, 0x2a1a10);
  }
  stool(x, z, color = 0x7a1f24, metal = 0x222222, h = 0.75) {
    this.cyl(0.18, 0.17, 0.1, x, h, z, color, 16);                    // padded leather seat
    this.cyl(0.185, 0.185, 0.02, x, h - 0.05, z, metal, 16);            // trim ring
    this.cyl(0.03, 0.05, h - 0.03, x, (h - 0.03) / 2, z, metal, 8);
    this.cyl(0.14, 0.14, 0.015, x, 0.3, z, metal, 12);                  // foot ring
    this.blockers.push({ x0: x - 0.18, x1: x + 0.18, z0: z - 0.18, z1: z + 0.18, y1: 0.78 });
  }
  // a warm glowing lamp (no real light: just an emissive shade); batched in finish()
  lamp(x, y, z, color = 0xffd9a0, size = 0.18, halo = true) {
    if (halo) this.halo(x, y, z, Math.min(1.6, size * 7 + 0.12), color);
    this.lamps = this.lamps || new Map();
    if (!this.lamps.has(color)) this.lamps.set(color, []);
    this.lamps.get(color).push([x, y, z, size]);
  }
  // a soft glow round a light (billboard), and a warm pool of light on a surface
  halo(x, y, z, size, color = 0xffd9a0) { (this.halos = this.halos || new GlowBatch(false, 0.55, 2.4)).add(x, y, z, size, color); }
  pool(x, y, z, size, color = 0xffc070) { (this.pools = this.pools || new GlowBatch(true, 0.42, 1.6)).add(x, y + 0.004, z, size, color); }
  // a real (per-pixel) light: use sparingly, a handful per level
  light(x, y, z, color = 0xffb060, intensity = 4, distance = 7, flicker = 0) {
    const l = new THREE.PointLight(color, intensity, distance, 1.6); l.position.set(x, y, z);     // (a 'virtual' light: the pool in finish() lights the nearest few for real)
    (this.lights = this.lights || []).push({ l, base: intensity, flicker });
    return l;
  }
  // a window in a wall: frame, glazing bars, sill, and a glowing view of outside.
  // ry: which way the window faces into the room (0 = +z, PI = -z, PI/2 = +x, -PI/2 = -x)
  window(x, y, z, w, h, ry, view, { frame = 0xf2ece0, bars = 2, curtains = null } = {}) {
    const c = Math.cos(ry), s = Math.sin(ry), across = Math.abs(c) > 0.5;
    const put = (dw, dh, dd, ox, oy, od, color) => this.box(across ? dw : dd, dh, across ? dd : dw, x + (across ? ox : od * s), y + oy, z + (across ? od * c : ox), color);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: view, color: 0xdddddd }));
    glass.position.set(x - s * 0.005, y, z - c * 0.005); glass.rotation.y = ry; this.scene.add(glass);
    put(w + 0.16, 0.08, 0.1, 0, h / 2 + 0.04, 0.03, frame); put(w + 0.16, 0.08, 0.1, 0, -h / 2 - 0.04, 0.03, frame);
    put(0.08, h, 0.1, -w / 2 - 0.04, 0, 0.03, frame); put(0.08, h, 0.1, w / 2 + 0.04, 0, 0.03, frame);
    for (let i = 1; i <= bars; i++) put(0.03, h, 0.04, -w / 2 + w * i / (bars + 1), 0, 0.02, frame);
    put(w, 0.03, 0.04, 0, 0, 0.02, frame);
    put(w + 0.3, 0.05, 0.22, 0, -h / 2 - 0.1, 0.1, frame);                 // sill
    if (curtains) { put(0.28, h + 0.5, 0.06, -w / 2 - 0.22, 0.1, 0.1, curtains); put(0.28, h + 0.5, 0.06, w / 2 + 0.22, 0.1, 0.1, curtains); put(w + 0.9, 0.06, 0.06, 0, h / 2 + 0.4, 0.12, 0x2a1a10); }
    this.halo(x + s * 0.2, y, z + c * 0.2, Math.max(w, h) * 1.1, 0x9ab8ff);
  }
  // any repeated mesh (e.g. light glows): batched into one instanced draw call per geometry+material
  instance(geo, mat, matrix) {
    this.inst = this.inst || new Map();
    const key = geo.uuid + mat.uuid;
    if (!this.inst.has(key)) this.inst.set(key, { geo, mat, list: [] });
    this.inst.get(key).list.push(matrix.clone());
  }
  flushInstances() {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const geo = new THREE.SphereGeometry(1, 12, 8);
    for (const [color, list] of this.lamps || []) {
      const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color }), list.length);
      list.forEach(([x, y, z, s], i) => im.setMatrixAt(i, m4.compose(v.set(x, y, z), q.identity(), sc.setScalar(s))));
      im.instanceMatrix.needsUpdate = true; this.scene.add(im);
    }
    for (const { geo: g, mat, list } of (this.inst || new Map()).values()) {
      const im = new THREE.InstancedMesh(g, mat, list.length);
      list.forEach((m, i) => im.setMatrixAt(i, m));
      im.instanceMatrix.needsUpdate = true; im.renderOrder = 2; this.scene.add(im);
    }
  }
  // closing walls round the whole level (inside faces)
  perimeter(color = 0xeee6d6) {
    const b = this.bounds, h = b.y1, t = 0.1;
    this.box(b.x1 - b.x0, h, t, (b.x0 + b.x1) / 2, h / 2, b.z0 + t / 2, color);
    this.box(b.x1 - b.x0, h, t, (b.x0 + b.x1) / 2, h / 2, b.z1 - t / 2, color);
    this.box(t, h, b.z1 - b.z0, b.x0 + t / 2, h / 2, (b.z0 + b.z1) / 2, color);
    this.box(t, h, b.z1 - b.z0, b.x1 - t / 2, h / 2, (b.z0 + b.z1) / 2, color);
  }
  finish({ sky = 0xffe6c4, ground = 0x5a3a22, hemiI = 1.6, sun = 0xffe0b0, sunI = 1.6, sunPos = [5, 9, 4], start, board, startFood, spotCount = 30, name, ambient = 0.55 } = {}) {
    this.flushInstances();
    this.mergeTexBoxes();
    this.zfixed = this.separateCoplanar();
    if (this.pools) this.pools.build(this.scene);
    if (this.halos) this.halos.build(this.scene);
    // merge the furniture in 12m patches (not one mesh for the whole level), so patches out of view aren't drawn
    const cells = new Map(), c = new THREE.Vector3();
    for (const p of this.parts) { p.computeBoundingBox(); p.boundingBox.getCenter(c); const w = this.splitX != null && c.x < this.splitX, cs = w ? 6 : 12, key = (w ? 'W' : '') + Math.floor(c.x / cs) + ',' + Math.floor(c.z / cs); (cells.get(key) || cells.set(key, []).get(key)).push(p); }
    for (const list of cells.values()) this.scene.add(new THREE.Mesh(merge(list), vcLambert));
    const hemi = new THREE.HemisphereLight(sky, ground, hemiI);
    this.scene.add(hemi);
    this.scene.add(new THREE.AmbientLight(0xfff0dc, ambient));     // big rooms need a little fill everywhere
    const dl = new THREE.DirectionalLight(sun, sunI); dl.position.set(...sunPos); this.scene.add(dl);
    const lights = this.lights || [];
    const room = {
      name, big: true,
      colliders: this.colliders, blockers: this.blockers, spawns: this.spawns, bounds: this.bounds,
      hemi, sun: dl, start, board, startFood,
      update(dt) {          // flickering lights (fires, candles)
        this.t = (this.t || 0) + dt;
        for (const L of lights) if (L.flicker) L.l.intensity = L.base * (1 - L.flicker * 0.5 + L.flicker * 0.5 * (Math.sin(this.t * 13) * 0.3 + Math.sin(this.t * 7.3) * 0.4 + Math.sin(this.t * 23) * 0.3));
        this.updateLightPool && this.updateLightPool(dt);
      },
    };
    // LIGHT POOL: a big place has a dozen or more warm lights, and every lit pixel on screen pays for every one of
    // them (twice in a headset). Each light only reaches a few metres, so only the ones near you matter: a fixed
    // handful of real lights is moved to the nearest of them, fading in and out as you walk, and the rest cost nothing.
    if (lights.length) {
      const N = Math.min(lights.length, 5), pool = [], cam = new THREE.Vector3();
      for (let i = 0; i < N; i++) { const p = new THREE.PointLight(0xffffff, 0, 1, 1.6); p.userData.src = null; p.userData.w = 0; this.scene.add(p); pool.push(p); }
      let t = 0, want = [];
      room.updateLightPool = (dt) => {
        const c = room.camera; if (!c) return;
        c.getWorldPosition(cam);
        if ((t -= dt) <= 0) { t = 0.2;
          want = lights.map(L => ({ L, d: Math.max(0, L.l.position.distanceTo(cam) - L.l.distance * 0.75) })).sort((a, b) => a.d - b.d).slice(0, N).map(o => o.L); }
        for (const p of pool) if (p.userData.src && !want.includes(p.userData.src)) p.userData.leaving = true;
        for (const L of want) if (!pool.some(p => p.userData.src === L)) { const free = pool.find(p => !p.userData.src) || pool.find(p => p.userData.leaving && p.userData.w < 0.05); if (free) { free.userData.src = L; free.userData.leaving = false; free.userData.w = 0; } }
        for (const p of pool) { const L = p.userData.src; if (!L) { p.intensity = 0; continue; }
          p.userData.w = THREE.MathUtils.clamp(p.userData.w + (p.userData.leaving ? -dt : dt) * 3, 0, 1);
          if (p.userData.leaving && p.userData.w <= 0) { p.userData.src = null; p.intensity = 0; continue; }
          p.position.copy(L.l.position); p.color.copy(L.l.color); p.distance = L.l.distance; p.intensity = L.l.intensity * p.userData.w; }
      };
    }
    room.nav = new NavGrid(room);
    room.tommySpots = room.nav.sampleSpots(spotCount);
    room.zfixed = this.zfixed;
    return room;
  }
}

// ---- shared textures ----
export function carpetTex(base = '#5a1e14', fleck = '#8a3a22', gold = '#b8862e') {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { g.fillStyle = Math.random() < 0.5 ? fleck : 'rgba(0,0,0,0.18)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.strokeStyle = gold; g.lineWidth = 3;
    for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) {
      g.beginPath(); g.moveTo(x + 32, y + 8); g.lineTo(x + 56, y + 32); g.lineTo(x + 32, y + 56); g.lineTo(x + 8, y + 32); g.closePath(); g.stroke();
      g.fillStyle = gold; g.beginPath(); g.arc(x + 32, y + 32, 4, 0, 7); g.fill();
    }
  });
}
export function tileTex(a = '#9a9183', b = '#8a8173', line = '#6d665a', size = 64) {
  return canvasTex(256, 256, (g, w, h) => {
    for (let y = 0; y < h; y += size) for (let x = 0; x < w; x += size) {
      g.fillStyle = ((x + y) / size) % 2 ? a : b; g.fillRect(x, y, size, size);
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(x + Math.random() * size, y + Math.random() * size, 3, 3); }
    }
    g.strokeStyle = line; g.lineWidth = 2;
    for (let p = 0; p <= w; p += size) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); }
  });
}
export function woodTex(c = '#7a4e2a') {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = c; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y, w, 2); for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(40,20,5,0.15)'; g.beginPath(); g.moveTo(0, y + 5 + i * 4); g.bezierCurveTo(80, y + 2 + i * 5, 170, y + 9 + i * 3, w, y + 5 + i * 4); g.stroke(); } }
  });
}
export function brickTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d8cbb4'; g.fillRect(0, 0, w, h);                    // mortar
    const bh = 32, bw = 64;
    for (let r = 0; r < h / bh; r++) for (let c = -1; c < w / bw + 1; c++) {
      const x = c * bw + (r % 2) * bw / 2, y = r * bh;
      const t = Math.random();
      const col = t < 0.4 ? [150, 62, 42] : t < 0.7 ? [168, 78, 50] : t < 0.88 ? [128, 54, 40] : [182, 104, 70];
      g.fillStyle = `rgb(${col.map(v => v + (Math.random() * 16 - 8) | 0).join(',')})`;
      g.fillRect(x + 3, y + 3, bw - 6, bh - 6);
      for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + 3 + Math.random() * (bw - 8), y + 3 + Math.random() * (bh - 8), 2, 2); }
    }
  });
}
// "library" wallpaper: rows of book spines
export function booksWallTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#4a2a16'; g.fillRect(0, 0, w, h);
    const cols = ['#7a1f24', '#2e4a2a', '#1f2f5a', '#8a5a2a', '#5a1a2a', '#3a3a3a', '#a07a3a', '#6a2a1a'];
    for (let row = 0; row < 4; row++) {
      const y0 = row * 128;
      g.fillStyle = '#2a1608'; g.fillRect(0, y0 + 118, w, 10);
      for (let x = 2; x < w - 6;) {
        const bw = 9 + Math.random() * 12, bh = 80 + Math.random() * 32;
        g.fillStyle = cols[(Math.random() * cols.length) | 0]; g.fillRect(x, y0 + 118 - bh, bw, bh);
        g.fillStyle = 'rgba(212,175,55,0.7)'; g.fillRect(x + 1, y0 + 118 - bh + 10, bw - 2, 3); g.fillRect(x + 1, y0 + 118 - 14, bw - 2, 2);
        x += bw + 1;
      }
    }
  });
}
// cream tongue-and-groove panelling
export function tngTex() {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#f1e9d6'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(120,100,70,0.35)'; g.fillRect(x, 0, 2, h); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 2, 0, 1, h); }
  });
}
// honey-oak raised panelling (bar front)
export function oakPanelTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c99a58'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(120,70,20,0.12)'; g.beginPath(); g.moveTo(0, i * 7); g.bezierCurveTo(80, i * 7 + 4, 170, i * 7 - 3, w, i * 7 + 2); g.stroke(); }
    for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(90,50,10,0.45)'; g.fillRect(x, 0, 4, h); g.fillStyle = 'rgba(255,230,180,0.35)'; g.fillRect(x + 4, 0, 2, h); }
    g.fillStyle = 'rgba(90,50,10,0.4)'; g.fillRect(0, h - 10, w, 10);
  });
}
export { canvasTex, signTex, fitText, FONT };

// a night-time view out of a window: sky, terraced houses with lit windows, a street lamp
export function streetViewTex(seed = 0, day = false) {
  return canvasTex(512, 384, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.7);
    if (day) { sky.addColorStop(0, '#7ec8ff'); sky.addColorStop(1, '#d8f0ff'); } else { sky.addColorStop(0, '#0a1230'); sky.addColorStop(1, '#3a3a6a'); }
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    if (!day) for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect((i * 97 + seed * 31) % w, (i * 53) % (h * 0.4), 2, 2); }
    else for (let i = 0; i < 3; i++) { g.fillStyle = '#fff'; g.beginPath(); g.arc(80 + i * 160 + seed * 20, 60 + i * 15, 26, 0, 7); g.arc(110 + i * 160 + seed * 20, 50 + i * 15, 30, 0, 7); g.fill(); }
    // houses
    for (let i = 0; i < 5; i++) {
      const x = i * 110 - 20 + (seed * 37) % 60, hh = 150 + ((i + seed) % 3) * 30, y = h * 0.78 - hh;
      g.fillStyle = ['#6a3a2a', '#7a4a3a', '#5a4a4a', '#8a5a3a'][(i + seed) % 4]; g.fillRect(x, y, 104, hh);
      g.fillStyle = '#2a1a1a'; g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + 52, y - 40); g.lineTo(x + 110, y); g.fill();
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { g.fillStyle = day ? '#9ec9e0' : ((i + r + c + seed) % 3 ? '#ffd27a' : '#1a1a2a'); g.fillRect(x + 16 + c * 46, y + 24 + r * 60, 28, 34); }
      g.fillStyle = '#3a2416'; g.fillRect(x + 40, y + hh - 50, 24, 50);
    }
    // pavement, road, a parked car, the street lamp
    g.fillStyle = '#5a5a5a'; g.fillRect(0, h * 0.78, w, h * 0.06); g.fillStyle = '#2a2a2e'; g.fillRect(0, h * 0.84, w, h * 0.16);
    g.fillStyle = ['#c62828', '#1565c0', '#2e7d32'][seed % 3]; g.fillRect(260 - seed * 40, h * 0.8, 130, 30); g.fillRect(285 - seed * 40, h * 0.76, 80, 20);
    g.fillStyle = '#111'; g.beginPath(); g.arc(290 - seed * 40, h * 0.88, 13, 0, 7); g.arc(360 - seed * 40, h * 0.88, 13, 0, 7); g.fill();
    g.fillStyle = '#222'; g.fillRect(80, h * 0.3, 6, h * 0.5);
    if (!day) { const gl = g.createRadialGradient(83, h * 0.3, 2, 83, h * 0.3, 90); gl.addColorStop(0, 'rgba(255,210,120,0.9)'); gl.addColorStop(1, 'rgba(255,210,120,0)'); g.fillStyle = gl; g.fillRect(0, 0, 200, h); }
  });
}
