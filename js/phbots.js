// PROP HUNT'S BOTS: a room of fewer than six people gets the squad to make it up to six (FILL). The host's game runs
// them and tells everyone with the usual Prop Hunt messages (a bot's prop, lock, taunt and shots carry its id), plus
// where each one is (phBots, ten times a second), so on a guest's game they're the same as anyone else: a squad
// member's body with 🤖 on the name tag, a prop when they're hiding.
//   - HIDERS: dealt a prop like anyone (sometimes swapping it), they go and hide where that kind of thing really is in the
//     map (by one of the same things: a keg by the kegs, a bin by the bins), lock in and keep still, taunt now and then,
//     sometimes move off when a seeker's sniffing about close by, and leg it (the speed burst) when they're shot.
//   - SEEKERS: held at the start while the hiders hide, then off round the map on real paths, looking at what's about;
//     they shoot what looks off (more likely if it moved or made a noise), miss now and then, waste the odd shot on the
//     real thing, and chase a hider they've hit.
// Rounds deal people and bots alike; between rounds bots make way for anyone who's joined and come back for anyone
// who's left. The developer test room's fake players count as people.
import * as THREE from 'three';
import { SQUAD } from './squad.js';

export const FILL = 6;
const WALK = 1.9, RUN = 3.1, SEE = 13;
const rnd = (a, b) => a + Math.random() * (b - a);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const _e = new THREE.Euler(), _q = new THREE.Quaternion();

export class PhBots {
  constructor(ph) { this.ph = ph; this.st = new Map(); this.pose = new Map(); this.puppets = new Map(); this.sendT = 0; this.list = []; this.n = 0; }
  get on() { return !(typeof window !== 'undefined' && window.__phNoBots); }      // (a test of Prop Hunt with people only)
  isBot(id) { const p = this.ph.players.get(String(id)); return !!(p && p.bot); }
  // the host: bots to make the room up to six, kept from round to round, made way for as people come
  fill(humans) {
    if (!this.on) { this.list = []; return []; }
    const want = Math.max(0, FILL - humans.length);
    while (this.list.length > want) { const b = this.list.pop(); this.st.delete(b.id); this.dropPuppet(b.id); }
    const taken = new Set([...humans.map(p => p.char), ...this.list.map(b => b.char)]);
    const pool = shuffle(Object.keys(SQUAD).filter(c => !SQUAD[c].playerOnly && !/^p\d+$/.test(c) && !taken.has(c)));
    while (this.list.length < want) { const ch = pool.shift() || 'tommy', nm = (SQUAD[ch] && SQUAD[ch].name) || 'Tommy';
      this.list.push({ id: 'phb' + (this.n++), name: '🤖 ' + nm.toUpperCase(), char: ch, bot: 1 }); }
    return this.list.slice();
  }
  // a new round's dealt: the host puts every bot at the start, with a plan for its side
  dealt() {
    const ph = this.ph, room = ph.g.room, s = room.start || { x: 0, z: 0, yaw: 0 }, nav = room.nav;
    const spots = nav && nav.spread ? nav.spread(s.x, s.z, s.yaw, 14, 0.75) : [];
    let i = 2; for (const p of ph.players.values()) { if (!p.bot) continue; const sp = spots[i++ % Math.max(1, spots.length)] || { x: s.x, y: s.z };
      this.st.set(p.id, { id: p.id, x: sp.x, z: sp.y, yaw: s.yaw, path: [], pathFor: null, seeker: p.role === 'seeker', t0: ph.now(), pickAt: ph.now() + rnd(1.5, 4), swapAt: Math.random() < 0.3 ? ph.now() + rnd(6, 14) : 0,
        spot: null, nextShot: 0, tauntAt: 0, runUntil: 0, chase: null, moveAt: 0, wanderAt: 0 }); }
    for (const id of [...this.st.keys()]) if (!this.isBot(id)) this.st.delete(id);
    this.reach = null;
  }
  // every spot on foot from the start (the map's own walls and furniture between): hiding anywhere else can't be got to
  reachable() {
    if (this.reach) return this.reach; const nav = this.ph.g.room.nav, s = this.ph.g.room.start || { x: 0, z: 0 }, out = new Set(); if (!nav) return out;
    const k0 = nav.nearestFree(s.x, s.z); if (k0 < 0) return out; const q = [k0]; out.add(k0);
    for (let h = 0; h < q.length; h++) { const k = q[h], i = k % nav.nx, j = Math.floor(k / nav.nx);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nav.nx || jj >= nav.nz) continue; const m = jj * nav.nx + ii; if (nav.free[m] && !out.has(m)) { out.add(m); q.push(m); } } }
    return (this.reach = out);
  }
  // hosting came here: carry on with the bots from where they were drawn
  becomeHost() {
    const ph = this.ph; this.list = [];
    for (const p of ph.players.values()) { if (!p.bot) continue; this.list.push({ id: p.id, name: p.name, char: p.char, bot: 1 }); const n = Number(String(p.id).slice(3)); if (isFinite(n)) this.n = Math.max(this.n, n + 1);
      const bp = this.pose.get(p.id); if (!this.st.has(p.id)) this.st.set(p.id, { id: p.id, x: bp ? bp.x : 0, z: bp ? bp.z : 0, yaw: bp ? bp.yaw : 0, path: [], seeker: p.role === 'seeker', t0: ph.now(), pickAt: ph.now() + 1, swapAt: 0, spot: p.lp ? { x: p.lp[0], z: p.lp[1], yaw: p.ly || 0 } : null, nextShot: ph.now() + 2, tauntAt: ph.now() + rnd(8, 20), runUntil: 0, chase: null, moveAt: 0, wanderAt: 0 }); }
  }
  // where a bot is: the host's own plan, or the host's word on it
  posOf(id, out) { const b = this.ph.host ? this.st.get(id) : null; if (b) return out.set(b.x, this.ph.floor(b.x, b.z), b.z); const q = this.pose.get(id); return q ? out.set(q.x, this.ph.floor(q.x, q.z), q.z) : null; }
  yawOf(id) { const b = this.ph.host ? this.st.get(id) : null; if (b) return b.yaw; const q = this.pose.get(id); return q ? q.yaw : 0; }
  // a guest: the host's word on where the bots are (smoothed in update)
  onPoses(m) { if (!Array.isArray(m.b)) return; for (const e of m.b.slice(0, 12)) { if (!Array.isArray(e) || e.length < 4) continue; const [id, x, z, yaw] = e; if (![x, z, yaw].every(Number.isFinite) || Math.abs(x) > 1e4 || Math.abs(z) > 1e4) continue;
    const q = this.pose.get(String(id)) || { x, z, yaw }; q.tx = x; q.tz = z; q.tyaw = yaw; if (Math.hypot(q.x - x, q.z - z) > 3) { q.x = x; q.z = z; } this.pose.set(String(id), q); } }
  // ---- the host's game: the bots' minds
  hostUpdate(dt) {
    const ph = this.ph; if (!ph.H || !this.st.size) return; const t = ph.now(), nav = ph.g.room.nav;
    for (const [id, b] of this.st) { const p = ph.players.get(id); if (!p || !p.bot) continue;
      if (p.role === 'hider') this.hider(b, p, t, nav, dt); else if (p.role === 'seeker') this.seeker(b, p, t, nav, dt); }
    if (ph.net.connected && ph.net.players.size && (this.sendT -= dt) <= 0) { this.sendT = 0.1; const r2 = (v) => Math.round(v * 100) / 100; ph.net.send({ t: 'phBots', b: [...this.st.values()].map(b => [b.id, r2(b.x), r2(b.z), r2(b.yaw)]) }); }
  }
  hider(b, p, t, nav, dt) {
    const ph = this.ph; if (p.found || !ph.playing()) return;
    if (!p.kind) { if (t >= b.pickAt || ph.phase === 'seek') this.dealProp(p); return; }
    if (b.swapAt && t >= b.swapAt && ph.phase === 'hide' && !p.locked) { b.swapAt = 0; this.dealProp(p); b.spot = null; }
    if (!b.spot) { b.spot = this.hideSpot(p.kind, b); b.path = []; }
    const fast = t < b.runUntil;
    if (fast) { if (!b.path.length && b.run) this.goTo(b, b.run.x, b.run.z, nav); this.walk(b, dt, RUN); if (!b.path.length) b.run = null; return; }
    if (!p.locked) { const d = Math.hypot(b.x - b.spot.x, b.z - b.spot.z);
      // (no way there, or not getting anywhere: somewhere else like it; after a few goes, here will do)
      if (d > 0.35) { if (!b.path.length && !this.goTo(b, b.spot.x, b.spot.z, nav)) b.stuck = 9; this.walk(b, dt, WALK);
        if (b.stuck > 2.5) { b.tries = (b.tries || 0) + 1; b.spot = b.tries > 3 ? { x: b.x, z: b.z, yaw: b.yaw } : this.hideSpot(p.kind, b, true); b.path = []; b.stuck = 0; } return; }
      b.tries = 0;
      b.x = b.spot.x; b.z = b.spot.z; b.yaw = b.spot.yaw; const m = { on: 1, p: [Math.round(b.x * 100) / 100, Math.round(b.z * 100) / 100], y: Math.round(b.yaw * 100) / 100 };
      ph.net.send({ t: 'phLock', id: b.id, ...m }); ph.setLock(b.id, m); b.tauntAt = Math.max(b.tauntAt, t + rnd(10, 25)); return; }
    if (ph.phase !== 'seek') return;
    if (t >= b.tauntAt) { b.tauntAt = t + rnd(18, 38); const i = Math.floor(Math.random() * 8); ph.net.send({ t: 'phTaunt', id: b.id, i }); if (ph.taunted(b.id, i, false)) ph.hostTaunt(b.id); }
    // a seeker sniffing about close by: now and then, nerve goes and they move off to somewhere else like it
    if (t >= b.moveAt) { b.moveAt = t + 2; const me = new THREE.Vector3(b.x, 0, b.z), q = new THREE.Vector3();
      const close = ph.seekers().some(s => !s.gone && ph.posOf(s.id, q) && ph.hd(q, me) < 3.5);
      if (close && t - (ph.H.seekStart || 0) > 8 && Math.random() < 0.1) { this.unlock(b); b.spot = this.hideSpot(p.kind, b, true); b.path = []; } }
  }
  // shot: unlocked, and off at a run somewhere a few metres away; then hide again
  hit(id) { const b = this.st.get(id), p = this.ph.players.get(id); if (!b || !p || p.found) return; this.unlock(b); const nav = this.ph.g.room.nav;
    let to = null; for (let k = 0; k < 12 && !to; k++) { const a = Math.random() * 6.28, r = rnd(5, 9), x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r, c = nav && nav.nearestFree(x, z); if (c >= 0 && c != null) { const v = nav.center(c); to = { x: v.x, z: v.y }; } }
    b.run = to || { x: b.x, z: b.z }; b.path = []; b.runUntil = this.ph.now() + 3; b.spot = this.hideSpot(p.kind, b, true, b.run); }
  unlock(b) { const p = this.ph.players.get(b.id); if (!p || !p.locked) return; this.ph.net.send({ t: 'phLock', id: b.id, on: 0 }); this.ph.setLock(b.id, { on: 0 }); }
  dealProp(p) { const ph = this.ph, pool = ph.kinds.filter(k => k !== p.kind); if (!pool.length) return; const k = pool[Math.floor(Math.random() * pool.length)]; ph.net.send({ t: 'phProp', id: p.id, k }); ph.setKind(p.id, k); }
  // somewhere to hide as this kind of thing: beside one of the real ones (not one another bot's by), else by a wall
  hideSpot(kind, b, far, near) {
    const ph = this.ph, nav = ph.g.room.nav, from = near || b, taken = [...this.st.values()].filter(o => o !== b && o.spot).map(o => o.spot);
    // (the nearer ones more likely, a bit of chance in it; moving off: one at least a few metres from here)
    const dist = (d) => Math.hypot(d.x - from.x, d.z - from.z);
    const same = ph.decoys.filter(d => d.k === kind && !taken.some(s => Math.hypot(s.x - d.x, s.z - d.z) < 1.2) && (!far || (dist(d) > 3 && dist(d) < 25))).map(d => ({ d, sc: dist(d) * rnd(0.5, 1.5) })).sort((a, c) => a.sc - c.sc).map(o => o.d);
    for (const d of same.slice(0, 6)) { if (!nav) return { x: d.x + 0.7, z: d.z, yaw: d.yaw || 0 };
      const R = this.reachable();
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + rnd(0, 0.5), x = d.x + Math.cos(a) * 0.75, z = d.z + Math.sin(a) * 0.75, c = nav.idx(x, z); if (c >= 0 && R.has(c)) return { x, z, yaw: (d.e ? d.e.rot[1] : d.yaw) || 0 }; } }
    if (nav) { const R = [...this.reachable()]; for (let k = 0; k < 40 && R.length; k++) { const v = nav.center(R[Math.floor(Math.random() * R.length)]); if (Math.hypot(v.x - from.x, v.y - from.z) < 25 && Math.hypot(v.x - from.x, v.y - from.z) > 3) return { x: v.x, z: v.y, yaw: rnd(0, 6.28) }; } }
    return { x: b.x, z: b.z, yaw: b.yaw };
  }
  seeker(b, p, t, nav, dt) {
    const ph = this.ph, H = ph.H; if (ph.phase !== 'seek' || p.gone) return; if ((H.outUntil[p.id] || 0) > t) return;
    // chasing one it's hit: where they are now; otherwise wandering the map on real paths
    if (b.chase) { const T = ph.players.get(b.chase), q = new THREE.Vector3(); if (!T || T.found || !ph.posOf(b.chase, q) || t > b.chaseUntil) b.chase = null; else if (!b.path.length || t >= b.wanderAt) { b.wanderAt = t + 1; this.goTo(b, q.x, q.z, nav); } }
    if (!b.chase && (!b.path.length || t >= b.wanderAt)) { b.wanderAt = t + rnd(6, 12); const d = ph.decoys.length ? ph.decoys[Math.floor(Math.random() * ph.decoys.length)] : null;
      if (d) this.goTo(b, d.x + rnd(-2, 2), d.z + rnd(-2, 2), nav); else if (nav) { const c = Math.floor(Math.random() * nav.free.length); if (nav.free[c]) { const v = nav.center(c); this.goTo(b, v.x, v.y, nav); } } }
    this.walk(b, dt, b.chase ? WALK * 1.25 : WALK);
    if (t < b.nextShot) return; b.nextShot = t + rnd(1.1, 2.4);
    // what's in sight: the hiders' props and the real things, nearest first; something that moved or made a noise looks off
    const eye = new THREE.Vector3(b.x, ph.floor(b.x, b.z) + 1.5, b.z), opts = [];
    for (const [id, pr] of ph.props) { const T = ph.players.get(id); if (!T || T.found || T.role !== 'hider' || pr.gone || !pr.kind) continue; const d = ph.hd(eye, pr.pos); if (d > SEE) continue;
      let w = 0.28 + (d < 6 ? 0.2 : 0) + ((pr.speed || 0) > 0.25 ? 0.45 : 0) + (t - (T.tauntAt || -99) < 6 ? 0.35 : 0) + (id === b.chase ? 0.5 : 0); opts.push({ h: id, x: pr.pos.x, y: pr.pos.y + ph.K[pr.kind].h / 2, z: pr.pos.z, d, w }); }
    ph.decoys.forEach((dd, i) => { const d = ph.hd(eye, dd); if (d > SEE * 0.7) return; opts.push({ i, x: dd.x, y: (dd.e ? dd.e.pos.y : dd.y) + ph.K[dd.k].h / 2, z: dd.z, d, w: 0.02 }); });
    const seen = opts.filter(o => { const dir = new THREE.Vector3(o.x - eye.x, o.y - eye.y, o.z - eye.z), L = dir.length(); return L > 0.3 && !ph.walled(new THREE.Ray(eye, dir.normalize()), L - 0.3); });
    let pick = null; for (const o of shuffle(seen)) if (Math.random() < o.w) { pick = o; break; }
    if (!pick) return;
    b.yaw = Math.atan2(-(pick.x - b.x), -(pick.z - b.z));
    const miss = pick.h && Math.random() < 0.22, end = new THREE.Vector3(pick.x + (miss ? rnd(-0.9, 0.9) : 0), pick.y + (miss ? rnd(0.3, 0.8) : 0), pick.z + (miss ? rnd(-0.9, 0.9) : 0));
    const a = eye.clone().add({ x: 0, y: -0.25, z: 0 }), r2 = (v) => [Math.round(v.x * 100) / 100, Math.round(v.y * 100) / 100, Math.round(v.z * 100) / 100];
    ph.net.send({ t: 'phShot', id: b.id, a: r2(a), b: r2(end), h: miss ? 0 : 1 }); ph.shotFx(a, end, !miss, false); ph.gunKick[b.id] = 1;
    if (miss) return;
    if (pick.h) { b.chase = pick.h; b.chaseUntil = t + 12; ph.hostIn('phChk', { v: 'h:' + pick.h, p: r2(end) }, b.id); }
    else ph.hostIn('phChk', { v: 'd:' + pick.i, p: r2(end) }, b.id);
  }
  goTo(b, x, z, nav) { const p = nav ? nav.path(b.x, b.z, x, z) : [new THREE.Vector2(x, z)]; b.path = p || []; b.stuck = 0; b.last = null; return !!(p && p.length); }
  walk(b, dt, speed) {
    if (!b.path.length) return; const w = b.path[0], dx = w.x - b.x, dz = w.y - b.z, d = Math.hypot(dx, dz), step = speed * dt;
    if (d <= step) { b.x = w.x; b.z = w.y; b.path.shift(); } else { b.x += dx / d * step; b.z += dz / d * step; }
    if (d > 0.05) { const want = Math.atan2(-dx, -dz); let dy = want - b.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; b.yaw += dy * Math.min(1, dt * 8); }
    // (stuck: hardly moved in the last second and a half)
    const L = b.last || (b.last = { x: b.x, z: b.z, t: 0 }); L.t += dt; if (L.t > 1.5) { b.stuck = Math.hypot(b.x - L.x, b.z - L.z) < 0.2 ? (b.stuck || 0) + L.t : 0; L.x = b.x; L.z = b.z; L.t = 0; }
  }
  // ---- everyone's game: each bot's body (one of the squad, like another player's), moved to where it is
  puppet(id) { return this.puppets.get(id) || null; }
  dropPuppet(id) { const pu = this.puppets.get(id); if (pu) { try { pu.dispose(); } catch (e) {} this.puppets.delete(id); } }
  update(dt) {
    const ph = this.ph, live = new Set();
    for (const p of ph.players.values()) { if (!p.bot) continue; live.add(p.id);
      let pu = this.puppets.get(p.id); if (!pu && ph.g.makePuppet) { try { pu = ph.g.makePuppet({ id: p.id, name: p.name, char: p.char, bot: true }); } catch (e) { pu = null; } if (pu) this.puppets.set(p.id, pu); }
      if (!ph.host) { const q = this.pose.get(p.id); if (q) { const k = Math.min(1, dt * 10); q.x += ((q.tx ?? q.x) - q.x) * k; q.z += ((q.tz ?? q.z) - q.z) * k; let dy = (q.tyaw ?? q.yaw) - q.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; q.yaw += dy * k; } }
      if (!pu) continue; const v = this.posOf(p.id, new THREE.Vector3()); if (!v) continue;
      try { pu.update(dt, this.poseMsg(v.x, v.z, this.yawOf(p.id))); } catch (e) { if (!this.warned) { this.warned = true; console.warn('prop hunt bot', e); } } }
    for (const id of [...this.puppets.keys()]) if (!live.has(id)) this.dropPuppet(id);
  }
  // a bot's pose, as a player's game would send it: head, which way it looks, its hands
  poseMsg(x, z, yaw) {
    const y0 = this.ph.floor(x, z), hy = y0 + 1.62, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    _e.set(-0.05, yaw, 0, 'YXZ'); _q.setFromEuler(_e);
    return { h: [x, hy, z], q: [_q.x, _q.y, _q.z, _q.w], l: [x - rx * 0.2 + fx * 0.2, y0 + 1.0, z - rz * 0.2 + fz * 0.2], rh: [x + fx * 0.42 + rx * 0.16, hy - 0.3, z + fz * 0.42 + rz * 0.16], s: 1, st: 0, flat: 1 };
  }
  dispose() { for (const id of [...this.puppets.keys()]) this.dropPuppet(id); this.st.clear(); }
}
