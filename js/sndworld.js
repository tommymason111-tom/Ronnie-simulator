// SEARCH AND DESTROY: what shots can and can't go through (mixed into the game in snd.js). Every solid thing in the level
// stops a shot (walls, doors, counters, tables, the lot: the level's own collision boxes). Nothing goes through a wall.
// The one way through is a window, and only once it's broken: the glass stops the first shot and shatters (bits of
// glass, a smash), then shots go through the gap. In a room the host says which windows are broken, so everyone's the same.
// The windows are the level's own panes of glass, found when the round starts (any big, thin, see-through pane).
// The boxes are filed in a grid of 2m squares so a shot only looks at the ones near its line.
import * as THREE from 'three';
import { sfx } from './audio.js';

const CELL = 2, PAD = 1.1;
const _b = new THREE.Box3(), _v = new THREE.Vector3(), _s = new THREE.Vector3();

// where a ray goes into and comes out of a box, and the face it goes in by: [tIn, tOut, nIn] or null
function slab(o, d, b) {
  let t0 = -Infinity, t1 = Infinity, a0 = -1, s0 = 0;
  for (let k = 0; k < 3; k++) { const c = k === 0 ? 'x' : k === 1 ? 'y' : 'z', od = d[c], oo = o[c], mn = b.min[c], mx = b.max[c];
    if (Math.abs(od) < 1e-9) { if (oo < mn || oo > mx) return null; continue; }
    let a = (mn - oo) / od, e = (mx - oo) / od; if (a > e) { const tt = a; a = e; e = tt; }
    if (a > t0) { t0 = a; a0 = k; s0 = od > 0 ? -1 : 1; } if (e < t1) t1 = e; if (t0 > t1) return null; }
  if (t1 < 0) return null; const n = new THREE.Vector3(); if (a0 >= 0) n.setComponent(a0, s0); return [Math.max(0, t0), t1, n];
}

export const WORLD = {
  // the level's solid boxes and its windows, filed by where they are
  buildWalls() {
    const room = this.g.room; this.windows = [];
    // the windows: big thin see-through panes (not a fridge door: both sides over 0.7m)
    this.g.scene.traverse(o => { if (!o.isMesh || o.isInstancedMesh || !o.material || Array.isArray(o.material) || !o.visible) return; const m = o.material; if (!m.transparent || !(m.opacity <= 0.35) || m.map) return;
      _b.setFromObject(o); _b.getSize(_s); const d = [_s.x, _s.y, _s.z].sort((a, b) => a - b); if (d[0] > 0.08 || d[1] < 0.7 || _s.y < 0.6) return;
      const box = _b.clone(); for (const c of ['x', 'z']) if (_s[c] < 0.08) { box.min[c] -= 0.06; box.max[c] += 0.06; }
      this.windows.push({ i: this.windows.length, mesh: o, box, broken: false, c: box.getCenter(new THREE.Vector3()) }); });
    // the solid boxes: everything the level collides with, except the panes themselves (a window's own box is the window)
    const winCovers = (b) => this.windows.some(w => { const i = b.clone().intersect(w.box); if (i.isEmpty()) return false; const s = i.getSize(_s), bs = b.getSize(new THREE.Vector3()); return s.x * s.y * s.z > 0.6 * Math.max(1e-6, bs.x * bs.y * bs.z); });
    // (a wall built solid across a window's opening has the window cut out of it, so a broken one is a real gap)
    const cut = (b) => { let out = [b]; for (const w of this.windows) { const next = []; for (const B of out) { const W = w.box.clone(); const s3 = W.getSize(new THREE.Vector3()), ax = s3.x < s3.z ? 'x' : 'z'; W.min[ax] = Math.min(W.min[ax], B.min[ax]) - 0.01; W.max[ax] = Math.max(W.max[ax], B.max[ax]) + 0.01;
        if (!B.intersectsBox(W) || B.clone().intersect(W).isEmpty()) { next.push(B); continue; } const I = B.clone().intersect(W), sI = I.getSize(new THREE.Vector3()); if (sI.x * sI.y * sI.z < 1e-4) { next.push(B); continue; }
        let rest = B.clone(); for (const c of ['x', 'y', 'z']) { if (rest.min[c] < I.min[c]) { const p2 = rest.clone(); p2.max[c] = I.min[c]; next.push(p2); rest.min[c] = I.min[c]; } if (rest.max[c] > I.max[c]) { const p2 = rest.clone(); p2.min[c] = I.max[c]; next.push(p2); rest.max[c] = I.max[c]; } } } out = next; } return out; };
    this.walls = (room.colliders || []).map(b => new THREE.Box3(b.min.clone(), b.max.clone())).filter(b => !b.isEmpty() && !winCovers(b)).flatMap(cut).concat(this.extraWalls || []);
    this.grid = new Map(); const add = (list, kind) => list.forEach((b, i) => { const B = kind ? b.box : b; for (let x = Math.floor((B.min.x - PAD) / CELL); x <= Math.floor((B.max.x + PAD) / CELL); x++) for (let z = Math.floor((B.min.z - PAD) / CELL); z <= Math.floor((B.max.z + PAD) / CELL); z++) { const k = x * 4096 + z; let c = this.grid.get(k); if (!c) this.grid.set(k, c = { w: [], g: [] }); (kind ? c.g : c.w).push(i); } });
    add(this.walls, 0); add(this.windows, 1); this.qMark = new Uint32Array(this.walls.length); this.gMark = new Uint32Array(this.windows.length); this.qN = 0;
  },
  // every box (and intact window) along a line, nearest first: [tIn, tOut, normal, window index or -1]
  hitsAlong(o, d, range, glass = true) {
    if (!this.grid) this.buildWalls(); const out = [], q = ++this.qN; let lastK = null;
    for (let t = 0; t <= range + CELL; t += CELL * 0.5) { const x = o.x + d.x * Math.min(t, range), z = o.z + d.z * Math.min(t, range), k = Math.floor(x / CELL) * 4096 + Math.floor(z / CELL); if (k === lastK) continue; lastK = k; const c = this.grid.get(k); if (!c) continue;
      for (const i of c.w) { if (this.qMark[i] === q) continue; this.qMark[i] = q; const b = this.walls[i]; if (b.containsPoint(o)) continue; const s = slab(o, d, b); if (s && s[0] < range) out.push([s[0], s[1], s[2], -1]); }
      if (glass) for (const i of c.g) { if (this.gMark[i] === q) continue; this.gMark[i] = q; const w = this.windows[i]; if (w.broken || w.box.containsPoint(o)) continue; const s = slab(o, d, w.box); if (s && s[0] < range) out.push([s[0], s[1], s[2], i]); } }
    return out.sort((a, b) => a[0] - b[0]);
  },
  // how far a line gets before something solid (or the floor); windows count unless they're broken
  wallT(ray, max, glass = true) {
    const h = this.hitsAlong(ray.origin, ray.direction, max, glass); let t = h.length ? Math.min(max, h[0][0]) : max;
    if (ray.direction.y < -0.02) t = Math.min(t, (ray.origin.y - this.floor(ray.origin.x, ray.origin.z)) / -ray.direction.y);
    return Math.max(0.2, t);
  },
  walled(ray, t) { return this.hitsAlong(ray.origin, ray.direction, t, false).some(h => h[0] < t); },
  // can a sees b (through glass, yes: it's see-through)
  canSee(a, b) { const d = _v.copy(b).sub(a), L = d.length(); if (L < 0.01) return true; return !this.walled(new THREE.Ray(a.clone(), d.divideScalar(L)), L - 0.2); },
  // the first intact window on a line before t, or -1
  glassOn(o, d, t) { const h = this.hitsAlong(o, d, t, true); for (const e of h) { if (e[0] >= t) break; if (e[3] < 0) return -1; return e[3]; } return -1; },
  // a window goes (the host's word): the pane vanishes in a shower of glass and a smash
  breakGlass(i, quiet) {
    const w = this.windows && this.windows[i]; if (!w || w.broken) return; w.broken = true; w.mesh.visible = false; if (quiet) return;
    const at = w.c, s = w.box.getSize(_s);
    for (let k = 0; k < 4; k++) this.burst(new THREE.Vector3(at.x + (Math.random() - 0.5) * s.x * 0.8, at.y + (Math.random() - 0.5) * s.y * 0.8, at.z + (Math.random() - 0.5) * s.z * 0.8), [0xd8f0ff, 0xffffff, 0xa8d8f0], 10, 2.2);
    sfx('sd_glass', at, 1);
  },
  mendGlass() { for (const w of this.windows || []) if (w.broken) { w.broken = false; w.mesh.visible = true; } },
};
export { slab };
