// Grid navigation for the characters: a walkable grid over the level (cells
// blocked by furniture and walls, padded by a body width) and A* paths, so the
// squad can find their way round a whole pub or supermarket.
import * as THREE from 'three';

export class NavGrid {
  constructor(room, cell = 0.3, pad = 0.28) {
    const b = room.bounds;
    this.cell = cell; this.x0 = b.x0; this.z0 = b.z0;
    this.nx = Math.ceil((b.x1 - b.x0) / cell); this.nz = Math.ceil((b.z1 - b.z0) / cell);
    this.free = new Uint8Array(this.nx * this.nz);
    for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) {
      const x = this.x0 + (i + 0.5) * cell, z = this.z0 + (j + 0.5) * cell;
      let ok = x > b.x0 + pad && x < b.x1 - pad && z > b.z0 + pad && z < b.z1 - pad;
      if (ok) for (const k of room.blockers) if (x > k.x0 - pad && x < k.x1 + pad && z > k.z0 - pad && z < k.z1 + pad) { ok = false; break; }
      this.free[j * this.nx + i] = ok ? 1 : 0;
    }
  }
  idx(x, z) {
    const i = Math.floor((x - this.x0) / this.cell), j = Math.floor((z - this.z0) / this.cell);
    if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return -1;
    return j * this.nx + i;
  }
  center(k, out = new THREE.Vector2()) { return out.set(this.x0 + ((k % this.nx) + 0.5) * this.cell, this.z0 + (Math.floor(k / this.nx) + 0.5) * this.cell); }
  // nearest free cell (spiral search)
  nearestFree(x, z) {
    const k = this.idx(x, z);
    if (k >= 0 && this.free[k]) return k;
    const ci = Math.floor((x - this.x0) / this.cell), cj = Math.floor((z - this.z0) / this.cell);
    for (let r = 1; r < 25; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const i = ci + di, j = cj + dj;
      if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) continue;
      if (this.free[j * this.nx + i]) return j * this.nx + i;
    }
    return -1;
  }
  // A* from (x0,z0) to (x1,z1): array of Vector2 waypoints (simplified), or null
  // (how long path finding has taken this frame: main.js zeroes it every frame. Once it's over BUDGET, anyone else setting
  // off this frame walks straight at their goal for a frame and gets their route on the next: several people picking
  // somewhere to go in the same frame stuttered the game)
  get busy() { return this.spent > 3; }
  path(x0, z0, x1, z1) { const t0 = performance.now(); try { return this.path1(x0, z0, x1, z1); } finally { this.spent = (this.spent || 0) + performance.now() - t0; } }
  path1(x0, z0, x1, z1) {
    const s = this.nearestFree(x0, z0), t = this.nearestFree(x1, z1);
    if (s < 0 || t < 0) return null;
    if (s === t) return [new THREE.Vector2(x1, z1)];
    // (the search's working arrays are kept between searches, not made afresh: half a megabyte for the pub, every time
    // anyone set off somewhere. A cell's g / came / closed only count if they were set in THIS search (its stamp))
    const n = this.nx * this.nz;
    if (!this._g || this._g.length !== n) { this._g = new Float32Array(n); this._f = new Float32Array(n); this._came = new Int32Array(n); this._seen = new Uint32Array(n); this._shut = new Uint32Array(n); this._gen = 0; }
    const gen = ++this._gen; if (gen >= 0xffffffff) { this._seen.fill(0); this._shut.fill(0); this._gen = 1; }
    const G = this._g, came = this._came, seen = this._seen, shut = this._shut, cur = this._gen;
    const g = { get: (k) => seen[k] === cur ? G[k] : Infinity };
    // a binary heap of cells ordered by f (fast even across a whole pub)
    const heap = [], push = (k) => { heap.push(k); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (f[heap[p]] <= f[k]) break; heap[i] = heap[p]; i = p; } heap[i] = k; };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) { let i = 0; const fl = f[last];
        for (;;) { const l = 2 * i + 1, r = l + 1; let m = -1, fm = fl;
          if (l < heap.length && f[heap[l]] < fm) { m = l; fm = f[heap[l]]; }
          if (r < heap.length && f[heap[r]] < fm) { m = r; }
          if (m < 0) break; heap[i] = heap[m]; i = m; }
        heap[i] = last; }
      return top; };
    seen[s] = cur; G[s] = 0; came[s] = -1;
    const tx = t % this.nx, tz = Math.floor(t / this.nx);
    const h = (k) => { const dx = Math.abs(k % this.nx - tx), dz = Math.abs(Math.floor(k / this.nx) - tz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    const f = this._f; f[s] = h(s); push(s);
    let found = false, iter = 0;
    while (heap.length && iter++ < 40000) {
      const k = pop();
      if (k === t) { found = true; break; }
      if (shut[k] === cur) continue; shut[k] = cur;
      const ki = k % this.nx, kj = Math.floor(k / this.nx);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const i = ki + di, j = kj + dj;
        if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) continue;
        const m = j * this.nx + i;
        if (!this.free[m] || shut[m] === cur) continue;
        if (di && dj && (!this.free[kj * this.nx + i] || !this.free[j * this.nx + ki])) continue;   // no corner cutting
        const ng = G[k] + (di && dj ? 1.414 : 1);
        if (ng < g.get(m)) { seen[m] = cur; G[m] = ng; came[m] = k; f[m] = ng + h(m); push(m); }
      }
    }
    if (!found) return null;
    const cells = []; for (let k = t; k !== -1; k = came[k]) cells.push(k);      // (every cell on the way was set in this search)
    cells.reverse();
    // string-pull: keep only the waypoints needed for straight walking
    const pts = cells.map(k => this.center(k));
    const out = []; let a = 0;
    while (a < pts.length - 1) {
      let b = pts.length - 1;
      while (b > a + 1 && !this.clear(pts[a], pts[b])) b--;
      out.push(pts[b]); a = b;
    }
    { const tk = this.idx(x1, z1); if (tk >= 0 && this.free[tk]) out[out.length - 1] = new THREE.Vector2(x1, z1); }   // (a goal inside furniture: stop at the nearest free spot instead)
    return out;
  }
  clear(a, b) {
    const d = a.distanceTo(b), steps = Math.ceil(d / (this.cell * 0.5));
    for (let s = 1; s < steps; s++) {
      const t = s / steps, k = this.idx(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
      if (k < 0 || !this.free[k]) return false;
    }
    return true;
  }
  // spread-out hang-out spots with some elbow room
  sampleSpots(n, minGap = 2.2) {
    const out = [], cand = [];
    for (let k = 0; k < this.free.length; k++) {
      if (!this.free[k]) continue;
      const i = k % this.nx, j = Math.floor(k / this.nx);
      let room = true;
      for (let dj = -2; dj <= 2 && room; dj++) for (let di = -2; di <= 2; di++) { const m = (j + dj) * this.nx + (i + di); if (i + di < 0 || i + di >= this.nx || j + dj < 0 || j + dj >= this.nz || !this.free[m]) { room = false; break; } }
      if (room) cand.push(k);
    }
    for (let tries = 0; tries < 3000 && out.length < n && cand.length; tries++) {
      const p = this.center(cand[Math.floor(Math.random() * cand.length)]);
      if (out.every(o => o.distanceTo(p) > minGap)) out.push(p.clone());
    }
    return out;
  }
}
