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
  path(x0, z0, x1, z1) {
    const s = this.nearestFree(x0, z0), t = this.nearestFree(x1, z1);
    if (s < 0 || t < 0) return null;
    if (s === t) return [new THREE.Vector2(x1, z1)];
    const n = this.nx * this.nz, g = new Float32Array(n).fill(Infinity), came = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
    const open = [s]; g[s] = 0;
    const tx = t % this.nx, tz = Math.floor(t / this.nx);
    const h = (k) => { const dx = Math.abs(k % this.nx - tx), dz = Math.abs(Math.floor(k / this.nx) - tz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    const f = new Float32Array(n); f[s] = h(s);
    let found = false, iter = 0;
    while (open.length && iter++ < 20000) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
      const k = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      if (k === t) { found = true; break; }
      if (closed[k]) continue; closed[k] = 1;
      const ki = k % this.nx, kj = Math.floor(k / this.nx);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const i = ki + di, j = kj + dj;
        if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) continue;
        const m = j * this.nx + i;
        if (!this.free[m] || closed[m]) continue;
        if (di && dj && (!this.free[kj * this.nx + i] || !this.free[j * this.nx + ki])) continue;   // no corner cutting
        const ng = g[k] + (di && dj ? 1.414 : 1);
        if (ng < g[m]) { g[m] = ng; came[m] = k; f[m] = ng + h(m); open.push(m); }
      }
    }
    if (!found) return null;
    const cells = []; for (let k = t; k !== -1; k = came[k]) cells.push(k);
    cells.reverse();
    // string-pull: keep only the waypoints needed for straight walking
    const pts = cells.map(k => this.center(k));
    const out = []; let a = 0;
    while (a < pts.length - 1) {
      let b = pts.length - 1;
      while (b > a + 1 && !this.clear(pts[a], pts[b])) b--;
      out.push(pts[b]); a = b;
    }
    out[out.length - 1] = new THREE.Vector2(x1, z1);
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
