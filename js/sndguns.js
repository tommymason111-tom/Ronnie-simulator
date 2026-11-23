// SEARCH AND DESTROY: your guns (mixed into the game in snd.js). Two slots, a PRIMARY and a SIDEARM, swapped with SWAP
// (Q, the mouse wheel, 1 / 2, X in a headset). Each gun fires its own way (semi, auto, three-round bursts, a pump or a
// bolt between shots, the gatling winding up), has fire modes to flick through, spread that blooms as you fire and
// settles as you rest, a recoil pattern that kicks your aim (and mostly comes back), damage that tails off with range,
// heads and legs worth more and less, and the bigger ones shoot through thin walls. AIM (right mouse, the AIM button,
// or in a headset just bring the gun up to your eye) tightens it and zooms in; the sniper has a scope.
// On a phone or a computer it's in your hands in front of the camera: it sways as you look round, bobs as you walk,
// kicks and settles, and reloads properly (the magazine out and a new one in, shells one at a time for the shotgun, the
// bolt for the sniper, the revolver's cylinder and a speedloader, the gatling's gravy boat). T inspects it. In a
// headset it's on your right controller; take the front of it with your left hand (hold grip) to aim with both.
import * as THREE from 'three';
import { sfx } from './audio.js';
import { track } from './awards.js';
import { SQUAD } from './squad.js';
import { GUN, GUNS, FREE_GUN, falloff, newGun, gunModel, handGeos, beanShellGeo, pliersGeo, bombGeo, flashGeo, flashTexture, projGeo } from './sndkit.js';
import { vcLambert, vcPhong } from './geo.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r2 = (v) => Math.round(v * 100) / 100;
const smooth = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const span = (f, a, b) => smooth((f - a) / (b - a));       // 0 before a, 1 after b, eased between
const bump = (f, a, b) => f <= a || f >= b ? 0 : Math.sin((f - a) / (b - a) * Math.PI);      // 0 -> 1 -> 0 between a and b
const SLEEVE = { R: 0xff5a3d, B: 0x3da5ff };
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _w = new THREE.Vector3(), _m4 = new THREE.Matrix4(), _up = new THREE.Vector3(0, 1, 0);
let flashMat = null, fGeo = null, pliers = null, bombG = null;

// the closest a ray gets to a segment: { t along the ray, d² apart } (for the bodies' hit capsules)
function raySeg(o, d, a, b, out) {
  const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z, wx = o.x - a.x, wy = o.y - a.y, wz = o.z - a.z;
  const B = d.x * ux + d.y * uy + d.z * uz, Cc = ux * ux + uy * uy + uz * uz, D = d.x * wx + d.y * wy + d.z * wz, E = ux * wx + uy * wy + uz * wz, den = Cc - B * B;
  let s = den > 1e-8 ? (E - B * D) / den : 0; s = clamp(s, 0, 1);
  const px = a.x + ux * s, py = a.y + uy * s, pz = a.z + uz * s; let t = d.x * (px - o.x) + d.y * (py - o.y) + d.z * (pz - o.z); if (t < 0) t = 0;
  const qx = o.x + d.x * t - px, qy = o.y + d.y * t - py, qz = o.z + d.z * t - pz; out.t = t; out.d2 = qx * qx + qy * qy + qz * qz; return out;
}
// where a ray goes into and comes out of a box, and the faces it goes in and out by: [tIn, tOut, nIn, 0, nOut] or null
function slab(o, d, b) {
  let t0 = -Infinity, t1 = Infinity, a0 = -1, s0 = 0, a1 = -1, s1 = 0;
  for (let k = 0; k < 3; k++) { const c = k === 0 ? 'x' : k === 1 ? 'y' : 'z', od = d[c], oo = o[c], mn = b.min[c], mx = b.max[c];
    if (Math.abs(od) < 1e-9) { if (oo < mn || oo > mx) return null; continue; }
    let a = (mn - oo) / od, e = (mx - oo) / od; if (a > e) { const tt = a; a = e; e = tt; }
    if (a > t0) { t0 = a; a0 = k; s0 = od > 0 ? -1 : 1; } if (e < t1) { t1 = e; a1 = k; s1 = od > 0 ? 1 : -1; } if (t0 > t1) return null; }
  if (t1 < 0) return null; const n = new THREE.Vector3(), n2 = new THREE.Vector3(); if (a0 >= 0) n.setComponent(a0, s0); if (a1 >= 0) n2.setComponent(a1, s1); return [Math.max(0, t0), t1, n, 0, n2];
}

export const GUNSYS = {
  // ------------------------------------------------------------------ the loadout
  newMy() { return { slots: { P: null, S: { g: FREE_GUN, mag: GUN[FREE_GUN].mag, res: GUN[FREE_GUN].reserve } }, cur: 'S', gun: FREE_GUN, mag: GUN[FREE_GUN].mag, reserve: GUN[FREE_GUN].reserve, modeI: {}, reloadEnd: 0, reloadLen: 0, rl: null, cyc: null,
    nextShot: 0, firing: false, ads: false, adsK: 0, act: null, perks: {}, spin: 0, picked: false, hurtT: 0, bloom: 0, shotN: 0, lastShot: -9, rc: { p: 0, y: 0 }, burst: 0, burstT: 0, drawEnd: 0, insp: 0, autoRl: 0 }; },
  curG() { return GUN[this.my.gun] || GUN[FREE_GUN]; },
  cap(G) { return G.mag * (this.my.perks.ammo ? 2 : 1); },
  // (keep what's in the gun in hand in its slot)
  stash() { const s = this.my.slots[this.my.cur]; if (s && s.g === this.my.gun) { s.mag = this.my.mag; s.res = this.my.reserve; } },
  // put a gun in its slot (a full one, or with what was in it) and take it out
  giveGun(id, mag, res, quiet) {
    const G = GUN[id]; if (!G) return; this.stash(); const dbl = this.my.perks.ammo ? 2 : 1;
    this.my.slots[G.slot] = { g: G.id, mag: Number.isFinite(mag) ? clamp(mag, 0, G.mag * dbl) : G.mag * dbl, res: Number.isFinite(res) ? clamp(res, 0, G.reserve * dbl) : G.reserve * dbl };
    this.my.cur = null; this.switchTo(G.slot, quiet);
  },
  // (the old way in: a full gun of this kind, out in your hands; the tests use it)
  loadGun(id) { const G = GUN[id] || GUN.monstor; this.giveGun(G.id, undefined, undefined, true); this.my.drawEnd = 0; this.my.spin = 0; if (this.host && this.H && this.load) this.load(this.me)[G.slot] = G.id; },
  // the host's word on what you've got: { P, S } (a slot that's changed gets that gun, full)
  setLoadout(P, S, fresh) {
    for (const [k, id] of [['P', P], ['S', S || FREE_GUN]]) { const cur = this.my.slots[k], G = GUN[id];
      if (!G || G.slot !== k) { if (k === 'P') this.my.slots.P = null; continue; }
      if (!cur || cur.g !== id || fresh) { if (this.my.cur === k) this.stash(); this.my.slots[k] = { g: id, mag: this.cap(G), res: G.reserve * (this.my.perks.ammo ? 2 : 1) }; if (this.my.cur === k) this.my.cur = null; } }
    const want = this.my.slots.P ? 'P' : 'S'; if (!this.my.cur || !this.my.slots[this.my.cur]) { this.my.cur = null; this.switchTo(want, true); }
  },
  switchTo(slot, quiet) {
    const s = this.my.slots[slot]; if (!s || (this.my.cur === slot && this.my.gun === s.g)) return false; if (this.my.act) return false;
    this.stash(); this.cancelReload(); this.my.cur = slot; this.my.gun = s.g; this.my.mag = s.mag; this.my.reserve = s.res;
    const G = this.curG(); this.my.ads = false; this.my.burst = 0; this.my.cyc = null; this.my.spin = 0; this.my.insp = 0; this.my.drawEnd = this.clock + G.draw; this.my.bloom = G.spread * 0.5; this.updateSpeed();
    const me = this.mine && this.mine(); if (me) me.gun = G.id;
    if (!quiet) { sfx('sd_swap', null, 0.8); this.net.send({ t: 'sdGun', g: G.id }); }
    return true;
  },
  swapGun() { const o = this.my.cur === 'P' ? 'S' : 'P'; if (this.switchTo(o)) this.pop(`${this.curG().icon} ${this.curG().name}`, this.curG().col); },
  fireMode() { const G = this.curG(); return G.modes[(this.my.modeI[G.id] || 0) % G.modes.length]; },
  cycleMode() { const G = this.curG(); if (G.modes.length < 2) { this.inspect(); return; } this.my.modeI[G.id] = ((this.my.modeI[G.id] || 0) + 1) % G.modes.length; this.my.burst = 0; sfx('sd_mode', null, 0.8); this.pop(`${G.icon} ${this.fireMode().toUpperCase()}`, '#fff'); },
  inspect() { const me = this.mine(); if (!me || !me.alive || this.my.reloadEnd || this.my.cyc || this.my.act || this.my.ads) return; this.my.insp = this.clock; },
  toggleAds(on) {
    const me = this.mine(); if (!me || !me.alive || this.g.renderer.xr.isPresenting) return; const want = on === undefined ? !this.my.ads : !!on; if (want === this.my.ads) return;
    if (want && (this.my.reloadEnd || this.my.act || this.clock < this.my.drawEnd)) return; this.my.ads = want; this.my.insp = 0; if (want && this.curG().scope) sfx('sd_scope', null, 0.7); this.updateSpeed();
  },
  toggleScope() { this.toggleAds(); },
  canShoot() { const me = this.mine(); return !!(me && me.alive && this.phase === 'live' && !this.panel.open && !this.pickOpen && !this.my.act); },

  // ------------------------------------------------------------------ pulling the trigger
  // pressed (a tap, a click, a trigger): once for a semi, the start of a burst or a stream
  fire(sx, sy) {
    if (!this.canShoot()) return; const G = this.curG(), t = this.clock, mode = this.fireMode(); this.my.insp = 0;
    if (this.my.reloadEnd) { if (G.rtype === 'shell' && this.my.mag > 0) this.cancelReload(); else return; }
    if (t < this.my.drawEnd || this.my.cyc) return;
    if (mode === 'burst') { if (this.my.burst > 0 || t < this.my.burstT) return; this.my.burst = G.burst || 3; this.my.bsx = sx; this.my.bsy = sy; this.burstTick(); return; }
    this.shootOnce(sx, sy);
  },
  burstTick() { const G = this.curG(); while (this.my.burst > 0 && this.clock >= this.my.nextShot) { if (!this.shootOnce(this.my.bsx, this.my.bsy)) { this.my.burst = 0; break; } if (--this.my.burst <= 0) this.my.burstT = this.clock + (G.burstGap || 0.3); } },
  // one shot (every pellet): out of the gun, down the line, into whoever's there
  shootOnce(sx, sy) {
    const G = this.curG(), t = this.clock; if (t < this.my.nextShot) return false;
    if (G.spin && this.my.spin < G.spin) return false;      // (the gatling winds up first)
    if (this.my.mag <= 0) { if (!this.clickT || t - this.clickT > 0.35) { this.clickT = t; sfx(`sd_dry_${G.id}`, null, 0.9); this.pop('*CLICK* RELOAD!', '#ff5252'); } if (this.my.reserve > 0) this.doReload(true); return false; }
    const ray = this.aimRay(sx, sy); if (!ray) return false;
    this.my.mag--; this.my.nextShot = t + G.rate; if (G.cycle) this.my.cyc = { t0: t, T: G.cycle, k: G.rtype === 'bolt' ? 'bolt' : 'pump', ej: false };
    const spread = this.spreadNow(G), assist = this.g.renderer.xr.isPresenting || ('ontouchstart' in window) || navigator.maxTouchPoints > 0, P = this.g.player;
    if (G.proj || G.flame) return this.special(G, ray, spread, t);
    const hits = new Map(), ends = [], from = this.muzzle(ray), u = new THREE.Vector3(), w = new THREE.Vector3(), glass = new Set(); let mates = 0;
    u.crossVectors(ray.direction, Math.abs(ray.direction.y) < 0.95 ? _up : new THREE.Vector3(1, 0, 0)).normalize(); w.crossVectors(ray.direction, u);
    for (let n = 0; n < G.pellets; n++) {
      const dir = ray.direction.clone(); if (spread > 0) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread; dir.addScaledVector(u, Math.cos(a) * r).addScaledVector(w, Math.sin(a) * r).normalize(); }
      const tr = this.trace(ray.origin, dir, G.range, G); let h = tr.hit; if (!h && tr.glass < 0 && assist && G.pellets === 1 && n === 0) h = this.assistShot(ray, G.range);
      if (tr.glass >= 0) glass.add(tr.glass);
      if (h && h.mate) { mates++; ends.push(h.point); continue; }
      const end = h ? h.point : tr.end; ends.push(end);
      if (h) { const zm = h.z === 1 ? G.hs : h.z === 2 ? G.limb : 1, dmg = G.dmg * falloff(G, h.t) * zm * (this.perk('dmg') ? 1.5 : 1);
        const e = hits.get(h.id) || { d: 0, z: -1, p: h.point }; e.d += dmg; if (e.z < 0 || h.z === 1 || (h.z === 0 && e.z === 2)) e.z = h.z; hits.set(h.id, e); }
      if (n < 4 || G.pellets < 2) for (const [q, nn] of tr.holes) this.impact(q, nn, G); }
    // what everyone sees: the tracer(s), the flash, the bang; your own gun kicks and spits out an empty
    for (let i = 0; i < Math.min(ends.length, 5); i++) this.tracer(from, ends[i], G, true);
    this.flash(from, G, ray.direction); this.vmFlash(); sfx(G.sfx, null, 0.85); this.kick[this.me] = 1; this.recoil(G); track('sdShots');
    if (!G.cycle && G.rtype !== 'cyl' && G.rtype !== 'shell') this.ejectCasing(G);
    this.my.bloom = Math.min(G.bloomMax || 0, this.my.bloom + (G.bloom || 0)) || this.my.bloom; this.my.shotN++; this.my.lastShot = t;
    for (const h of P.hands || []) if (h.handedness === 'right') h.pulse && h.pulse(G.pellets > 1 || G.dmg > 50 ? 1 : 0.45, 50);
    this.net.send({ t: 'sdShot', a: [r2(from.x), r2(from.y), r2(from.z)], b: [r2(ends[0].x), r2(ends[0].y), r2(ends[0].z)], g: G.i, n: Math.min(5, ends.length) });
    for (const [id, e] of hits) this.ask('sdHit', { v: id, d: Math.round(Math.min(e.d, G.dmg * G.pellets * G.hs * 1.5)), hs: e.z === 1 ? 1 : 0, z: e.z, g: G.id, p: [r2(e.p.x), r2(e.p.y), r2(e.p.z)] });
    for (const i of glass) this.ask('sdGlass', { i });
    if (mates && t > (this.mateT || 0)) { this.mateT = t + 1.2; this.pop('🚫 THAT\'S YOUR TEAM-MATE!', '#4fc3ff'); this.mateHit && this.mateHit(); }
    if (this.my.mag <= 0 && this.my.reserve > 0) this.my.autoRl = t + 0.22;
    return true;
  },
  // the odd ones out: the launcher and the crossbow fire something that flies (projTick does the rest), the flamer
  // sprays sauce a few metres in a cone
  special(G, ray, spread, t) {
    const from = this.muzzle(ray), jit = (d0, sp) => { const d = d0.clone(); if (sp > 0) { const u = new THREE.Vector3().crossVectors(d, Math.abs(d.y) < 0.95 ? _up : new THREE.Vector3(1, 0, 0)).normalize(), w = new THREE.Vector3().crossVectors(d, u), a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * sp; d.addScaledVector(u, Math.cos(a) * r).addScaledVector(w, Math.sin(a) * r).normalize(); } return d; };
    if (G.proj) { const v = jit(ray.direction, spread).multiplyScalar(G.proj.speed); if (G.proj.grav > 5) v.y += 2.2;      // (a lob: aimed a little up)
      this.addProj(G, from, v, this.me); this.net.send({ t: 'sdProj', a: [r2(from.x), r2(from.y), r2(from.z)], v: [r2(v.x), r2(v.y), r2(v.z)], g: G.i });
      this.flash(from, G, ray.direction); this.vmFlash(); sfx(G.sfx, null, 0.9); }
    else { const hits = new Map(), glass = new Set(); let mates = 0;
      for (let n = 0; n < 3; n++) { const d = jit(ray.direction, spread), tr = this.trace(ray.origin, d, G.range, G); if (tr.glass >= 0) glass.add(tr.glass);
        if (tr.hit && tr.hit.mate) mates++; else if (tr.hit) { const e = hits.get(tr.hit.id) || { d: 0, z: tr.hit.z, p: tr.hit.point }; e.d += G.dmg / 3 * falloff(G, tr.hit.t) * (tr.hit.z === 1 ? G.hs : 1) * (this.perk('dmg') ? 1.5 : 1); hits.set(tr.hit.id, e); } }
      this.spray(from, ray.direction, G); if (t > (this.flameSndT || 0)) { this.flameSndT = t + 0.2; sfx(G.sfx, null, 0.7); this.net.send({ t: 'sdShot', a: [r2(from.x), r2(from.y), r2(from.z)], b: [r2(from.x + ray.direction.x * G.range), r2(from.y + ray.direction.y * G.range), r2(from.z + ray.direction.z * G.range)], g: G.i, n: 1 }); }
      for (const [id, e] of hits) this.ask('sdHit', { v: id, d: Math.max(1, Math.round(e.d)), hs: e.z === 1 ? 1 : 0, z: e.z, g: G.id, p: [r2(e.p.x), r2(e.p.y), r2(e.p.z)] });
      for (const i of glass) this.ask('sdGlass', { i }); if (mates && t > (this.mateT || 0)) { this.mateT = t + 1.2; this.pop('🚫 THAT\'S YOUR TEAM-MATE!', '#4fc3ff'); } }
    this.kick[this.me] = 1; this.recoil(G); this.my.lastShot = t; track('sdShots');
    if (this.my.mag <= 0 && this.my.reserve > 0) this.my.autoRl = t + 0.22;
    return true;
  },
  // something flying: an egg on an arc, a chip almost flat. owner: whose it is (only the thrower's own game does the damage)
  addProj(G, at, v, owner) {
    const kind = G.proj.bolt ? 'bolt' : 'egg', m = new THREE.Mesh(projGeo(kind), vcLambert); m.position.copy(at); m.frustumCulled = false; this.grp.add(m);
    (this.projs || (this.projs = [])).push({ G, p: at.clone(), v: v.clone(), owner, m, t: 0, kind });
  },
  projTick(dt) {
    if (!this.projs || !this.projs.length) { this.stuckTick(dt); return; }
    const keep = [];
    for (const pr of this.projs) { pr.t += dt; const G = pr.G, old = pr.p.clone(); pr.v.y -= G.proj.grav * dt; pr.p.addScaledVector(pr.v, dt);
      const seg = pr.p.clone().sub(old), L = seg.length(); let done = pr.t > 6;
      if (L > 1e-4 && !done) { const d = seg.divideScalar(L), mine = pr.owner === this.me, tr = mine ? this.trace(old, d, L, G) : { hit: null, holes: this.hitsAlong(old, d, L, true).slice(0, 1).map(h => [old.clone().addScaledVector(d, h[0]), h[2], h[3]]), glass: -1 };
        let at = null, n = null; if (tr.hit) at = tr.hit.point; else if (tr.glass >= 0) { at = old.clone().addScaledVector(d, Math.max(0, L * 0.5)); } else if (tr.holes.length) { at = tr.holes[0][0]; n = tr.holes[0][1]; }
        if (!mine && tr.holes.length && tr.holes[0][2] >= 0) at = tr.holes[0][0];
        const fl = this.floor(pr.p.x, pr.p.z); if (!at && pr.p.y < fl + 0.03) { at = new THREE.Vector3(pr.p.x, fl + 0.03, pr.p.z); n = new THREE.Vector3(0, 1, 0); }
        if (at) { done = true; if (mine && tr.glass >= 0) this.ask('sdGlass', { i: tr.glass }); this.projHit(pr, at, n, mine ? tr.hit : null); } }
      if (done) { this.grp.remove(pr.m); continue; }
      pr.m.position.copy(pr.p); if (pr.kind === 'bolt') pr.m.lookAt(_v.copy(pr.p).sub(pr.v)); else pr.m.rotation.set(pr.t * 9, pr.t * 5, 0); keep.push(pr); }
    this.projs = keep; this.stuckTick(dt);
  },
  // where it ends up: an egg goes off (everyone near it, if nothing solid's between, is hurt: the nearer, the more); a
  // chip sticks where it lands, or in whoever it hit
  projHit(pr, at, n, hit) {
    const G = pr.G, mine = pr.owner === this.me;
    if (pr.kind === 'bolt') { if (mine && hit && !hit.mate) this.ask('sdHit', { v: hit.id, d: Math.round(G.dmg * (hit.z === 1 ? G.hs : hit.z === 2 ? G.limb : 1) * (this.perk('dmg') ? 1.5 : 1)), hs: hit.z === 1 ? 1 : 0, z: hit.z, g: G.id, p: [r2(at.x), r2(at.y), r2(at.z)] });
      if (mine && hit && hit.mate && this.clock > (this.mateT || 0)) { this.mateT = this.clock + 1.2; this.pop('🚫 THAT\'S YOUR TEAM-MATE!', '#4fc3ff'); }
      sfx('sd_thunk', at, 0.7); if (!hit) { const m = new THREE.Mesh(projGeo('bolt'), vcLambert); m.position.copy(at); m.lookAt(_v.copy(at).sub(pr.v)); this.grp.add(m); (this.stuck || (this.stuck = [])).push({ m, t: 0 }); if (this.stuck.length > 12) this.grp.remove(this.stuck.shift().m); } return; }
    // the egg: a bang of breadcrumbs and sausage meat, a scorch on the floor
    this.burst(at, [0xff8a1a, 0xffd400, 0x9a5a2a, 0xc8823a, 0xffffff], 34, 4); this.mark(new THREE.Vector3(at.x, this.floor(at.x, at.z) + 0.006, at.z), new THREE.Vector3(0, 1, 0), 0x5a3a1a, G.proj.splash * 0.6);
    sfx('sd_eggboom', at, 1.1); const P = this.g.player, dd = Math.hypot(P.head.x - at.x, P.head.z - at.z); if (dd < 10 && P.flatMode) this.shake = Math.max(this.shake || 0, 0.5 * (1 - dd / 10));
    if (!mine) return; const me = this.mine(), h = new THREE.Vector3(), up = at.clone().add({ x: 0, y: 0.25, z: 0 });
    for (const [id, f] of this.F) { if (!f.alive || (me && f.team === me.team)) continue; if (!this.headOf(id, h)) continue; h.y -= 0.6; const d = h.distanceTo(at); if (d > G.proj.splash) continue;
      if (!this.canSee(up, h)) continue;      // (round a corner, behind a wall: nothing)
      const direct = hit && hit.id === id ? G.dmg : 0, dmg = direct + G.proj.sdmg * Math.pow(1 - d / G.proj.splash, 0.7) * (this.perk('dmg') ? 1.5 : 1);
      this.ask('sdHit', { v: id, d: Math.round(dmg), hs: 0, z: 0, g: G.id, p: [r2(h.x), r2(h.y), r2(h.z)] }); }
  },
  stuckTick(dt) { if (!this.stuck) return; this.stuck = this.stuck.filter(s2 => { s2.t += dt; if (s2.t > 6) { this.grp.remove(s2.m); return false; } return true; }); },
  // someone else's egg or chip (or a bot's): just to see (their own game does the damage)
  remoteProj(id, m) { const G = GUNS[Number(m.g)], f = this.F.get(id); if (!G || !G.proj || !f || !f.alive) return; const a = new THREE.Vector3(...m.a), v = new THREE.Vector3(...m.v); if (v.length() > 200) return; this.addProj(G, a, v, id); this.flash(a, G, v.clone().normalize()); sfx(G.sfx, a, 0.8); f.shotT = this.clock; this.kick[id] = 1; },
  // how wide the shots go right now: the gun's own, aimed or not, how much it's bloomed, and moving
  spreadNow(G = this.curG()) {
    const P = this.g.player, k = smooth(this.my.adsK), moving = P.flatMove ? Math.hypot(P.flatMove.x, P.flatMove.z) > 0.2 : false;
    let s = G.spread + (G.ads - G.spread) * k + this.my.bloom; if (moving) s += G.spread * 0.7 * (1 - k * 0.6);
    return s * (this.g.renderer.xr.isPresenting ? 0.8 : 1);
  },
  // a shot down a line: the walls it meets (a thin one it can go through), and the first enemy before the wall that
  // stops it. { hit: { id, t, point, z (0 body, 1 head, 2 legs), mate }, end, holes, glass (a window it hit) }
  trace(o, d, range, G) {
    const W = this.hitsAlong(o, d, range, true);
    if (d.y < -0.02) { const tf = (o.y - this.floor(o.x, o.z)) / -d.y; if (tf > 0 && tf < range) { W.push([tf, 1e9, new THREE.Vector3(0, 1, 0), -1]); W.sort((a, b) => a[0] - b[0]); } }
    const first = W[0], lim = first ? first[0] : range;
    // (team-mates are in the way too: a shot stops at them and does nothing)
    const me = this.mine(); let best = null; const tmp = {}, a = new THREE.Vector3(), b = new THREE.Vector3(), h = new THREE.Vector3();
    if (me) for (const [id, f] of this.F) { if (id === this.me || !f.alive) continue; if (!this.headOf(id, h)) continue; const mate = f.team === me.team;
      const fl = this.floor(h.x, h.z); h.y = Math.max(h.y, fl + 1.2); const hipY = fl + 0.95;
      const test = (t, z) => { if (t >= lim || (best && t >= best.t - (z === 1 ? 0.05 : 0))) return; best = { id, t, z, mate }; };
      a.set(h.x, h.y - 0.05, h.z); raySeg(o, d, a, a, tmp); if (tmp.d2 < 0.17 * 0.17) test(tmp.t, 1);
      a.set(h.x, hipY, h.z); b.set(h.x, h.y - 0.3, h.z); raySeg(o, d, a, b, tmp); if (tmp.d2 < 0.27 * 0.27) test(tmp.t, 0);
      a.set(h.x, fl + 0.12, h.z); b.set(h.x, hipY, h.z); raySeg(o, d, a, b, tmp); if (tmp.d2 < 0.2 * 0.2) test(tmp.t, 2); }
    if (best) { best.point = o.clone().addScaledVector(d, best.t); best.hs = best.z === 1; }
    // where it stopped: a mark on the wall or floor, or the window it hit (which breaks)
    const hitT = best ? best.t : Infinity, at = (tt) => o.clone().addScaledVector(d, tt), holes = [];
    const glass = first && first[0] < hitT && first[3] >= 0 ? first[3] : -1;
    if (first && first[0] < hitT && glass < 0) holes.push([at(first[0]), first[2]]);
    const endT = best ? best.t : Math.max(0.2, Math.min(range, lim));
    return { hit: best, end: at(endT), holes, glass };
  },
  // (kept for the bots and the old tests: just the hit)
  castShot(o, d, range) { return this.trace(o, d, range, this.curG()).hit; },
  // phones and headsets: a little help, a near miss on someone close to the crosshair still counts (as a body shot)
  assistShot(ray, range) {
    const me = this.mine(); let best = null; const h = new THREE.Vector3();
    for (const [id, f] of this.F) { if (id === this.me || !f.alive || f.team === me.team || !this.headOf(id, h)) continue; h.y -= 0.45; const d = h.clone().sub(ray.origin), L = d.length(); if (L > range || L < 0.5) continue;
      const ang = d.normalize().angleTo(ray.direction); if (ang > 0.05 * Math.max(0.6, Math.min(1.5, 8 / L))) continue; if (!this.canSee(ray.origin, h)) continue; if (!best || ang < best.ang) best = { id, t: L, z: 0, hs: false, ang, point: h.clone() }; }
    return best;
  },
  aimRay(sx, sy) {
    const P = this.g.player, ray = new THREE.Ray();
    if (this.g.renderer.xr.isPresenting) { const h = (P.hands || []).find(h => h.source && h.handedness === 'right' && h.ctrl) || (P.hands || []).find(h => h.ctrl); if (!h) return null;
      // (along the gun: with both hands on it, that's where it's pointing)
      if (this.vrGun && this.vrGun.parent) { this.vrGun.updateMatrixWorld(true); this.vrGun.getWorldPosition(ray.origin); this.vrGun.getWorldQuaternion(_q); }
      else { h.ctrl.getWorldPosition(ray.origin); h.ctrl.getWorldQuaternion(_q); }
      ray.direction.set(0, 0, -1).applyQuaternion(_q); return ray; }
    const cam = this.g.camera, rc = new THREE.Raycaster(), cvr = this.g.renderer.domElement.getBoundingClientRect();
    const nx = sx == null ? 0 : ((sx - cvr.left) / cvr.width) * 2 - 1, ny = sy == null ? 0 : -((sy - cvr.top) / cvr.height) * 2 + 1;
    cam.updateMatrixWorld(); rc.setFromCamera({ x: nx, y: ny }, cam); return rc.ray;
  },
  muzzle(ray) {
    const g = this.vGun && this.vGun.visible ? this.vGun : this.vrGun && this.vrGun.parent && this.vrGun.visible ? this.vrGun : null;
    if (g) { g.updateMatrixWorld(true); return g.localToWorld(g.userData.muzzle.clone()); }
    return ray.origin.clone().addScaledVector(ray.direction, 0.3).add({ x: 0, y: -0.12, z: 0 });
  },
  // the kick: your aim's thrown up (and a bit sideways, in the gun's own pattern), and mostly comes back once you stop
  recoil(G) {
    const P = this.g.player; this.vmKickV = (this.vmKickV || 0) + Math.min(1, G.kick * 14 + 0.25);
    if (!P.flatMode || this.g.renderer.xr.isPresenting) return;
    const pat = G.pat ? G.pat[Math.min(this.my.shotN, G.pat.length - 1)] : [0, 1], k = this.my.adsK > 0.5 ? 0.7 : 1;
    const dp = G.kick * pat[1] * k, dy = G.kickY * (pat[0] * 1.5 + (Math.random() - 0.5) * 0.8) * k;
    P.flatPitch = clamp(P.flatPitch + dp, -1.35, 1.35); P.flatYaw += dy; this.my.rc.p += dp; this.my.rc.y += dy;
  },
  // ------------------------------------------------------------------ reloading
  doReload(quiet) {
    const G = this.curG(), cap = this.cap(G); if (this.my.reloadEnd || this.my.mag >= cap) return; const me = this.mine(); if (!me || !me.alive || this.my.act) return;
    if (this.my.reserve <= 0) { if (!quiet) { this.toast('NO AMMO LEFT! FIND AN AMMO BOX'); sfx('sd_empty', null, 0.8); } return; }
    if (this.clock < this.my.drawEnd) return;
    const mul = this.perk('reload') ? 0.5 : 1; this.my.ads = false; this.my.insp = 0; this.my.burst = 0; this.my.cyc = null;
    if (G.rtype === 'shell') { const n = Math.min(cap - this.my.mag, this.my.reserve); this.my.rl = { k: 'shell', t0: this.clock, pre: 0.35 * mul, per: G.reload * mul, n, done: 0 }; this.my.rl.T = this.my.rl.pre + n * this.my.rl.per + 0.3 * mul; }
    else this.my.rl = { k: G.rtype, t0: this.clock, T: G.reload * mul, ev: 0 };
    this.my.reloadEnd = this.clock + this.my.rl.T; this.my.reloadLen = this.my.rl.T; this.net.send({ t: 'sdAct', k: 'reload', on: 1 }); this.updateSpeed();
    sfx(`sd_rl_${G.id}`, null, 0.85); track('sdReloads');
  },
  cancelReload() { if (!this.my.rl && !this.my.reloadEnd) return; this.my.rl = null; this.my.reloadEnd = 0; this.updateSpeed(); },
  reloadTick() {
    const rl = this.my.rl; if (!rl) { this.my.reloadEnd = 0; return; } const G = this.curG(), t = this.clock, f = (t - rl.t0) / rl.T, cap = this.cap(G);
    if (rl.k === 'shell') {      // (one tin at a time: each one counts as it goes in; fire to stop)
      while (rl.done < rl.n && t >= rl.t0 + rl.pre + (rl.done + 0.75) * rl.per) { if (this.my.reserve <= 0 || this.my.mag >= cap) { rl.n = rl.done; break; } this.my.mag++; this.my.reserve--; rl.done++; sfx('sd_shell', null, 0.75); }
      if (t >= rl.t0 + rl.pre + rl.n * rl.per && !rl.pumped) { rl.pumped = true; sfx('sd_pump', null, 0.8); }
      if (t >= rl.t0 + rl.T) { this.my.rl = null; this.my.reloadEnd = 0; this.updateSpeed(); } return; }
    // (the others: the sounds as the magazine comes out, goes in, and the gun's racked; the rounds go in at the end)
    if (rl.ev < 1 && f >= (rl.k === 'cyl' ? 0.2 : 0.62)) { rl.ev = 1; sfx('sd_magin', null, 0.8); if (rl.k === 'cyl' && G.id === 'mustard') for (let i = 0; i < 6; i++) this.ejectCasing(G, i); }
    if (rl.ev < 2 && f >= (rl.k === 'cyl' ? 0.7 : 0.84) && rl.k !== 'box') { rl.ev = 2; sfx(rl.k === 'bolt' ? 'sd_bolt' : 'sd_rack', null, 0.8); }
    if (t >= this.my.reloadEnd) { const n = Math.min(cap - this.my.mag, this.my.reserve); this.my.mag += n; this.my.reserve -= n; this.my.rl = null; this.my.reloadEnd = 0; this.updateSpeed(); }
  },
  // ------------------------------------------------------------------ every frame: the trigger held, the gun settling
  gunTick(dt, alive) {
    const G = this.curG(), t = this.clock, my = this.my, P = this.g.player;
    if (my.reloadEnd) this.reloadTick(); else my.rl = null;
    if (my.autoRl && t >= my.autoRl) { my.autoRl = 0; this.doReload(true); }
    if (my.cyc) { const f = (t - my.cyc.t0) / my.cyc.T; if (f > 0.45 && !my.cyc.ej) { my.cyc.ej = true; sfx(my.cyc.k === 'bolt' ? 'sd_bolt' : 'sd_pump', null, 0.75); this.ejectCasing(G); } if (f >= 1) my.cyc = null; }
    // the gatling winds up while the trigger's held
    if (G.spin) { const was = my.spin; my.spin = my.firing && alive ? Math.min(G.spin, my.spin + dt) : Math.max(0, my.spin - dt * 2); if (my.firing && was === 0 && my.spin > 0) sfx('sd_spinup', null, 0.7); }
    if (alive && this.phase === 'live') { const mode = this.fireMode(); if (my.burst > 0) this.burstTick(); else if (my.firing && mode === 'auto' && !my.reloadEnd && t >= my.drawEnd) this.shootOnce(); }
    // the bloom settles, the spray pattern starts again, the kick comes back down
    my.bloom = Math.max(0, my.bloom - dt * Math.max(0.06, (G.bloomMax || 0.04) * 3)); if (t - my.lastShot > 0.35) my.shotN = 0;
    if (t - my.lastShot > G.rate * 1.4 + 0.04 && (Math.abs(my.rc.p) > 1e-5 || Math.abs(my.rc.y) > 1e-5)) { const k = Math.min(1, dt * 7); if (P.flatMode && !this.g.renderer.xr.isPresenting) { P.flatPitch = clamp(P.flatPitch - my.rc.p * k * 0.85, -1.35, 1.35); P.flatYaw -= my.rc.y * k * 0.85; } my.rc.p -= my.rc.p * k; my.rc.y -= my.rc.y * k; }
    // aiming: in and out (a headset: the gun's up at your eye)
    const xr = this.g.renderer.xr.isPresenting; let want = !!my.ads && alive && !my.reloadEnd && !my.act;
    if (xr) { want = false; if (alive && this.vrGun && this.vrGun.parent && this.vrGun.visible) { this.vrGun.updateMatrixWorld(true); const s = this.vrGun.localToWorld(this.vrGun.userData.sight.clone()), cam = this.g.renderer.xr.getCamera(); cam.getWorldPosition(_v); want = s.distanceTo(_v) < 0.14; } }
    const was = my.adsK; my.adsK = clamp(my.adsK + (want ? 1 : -1) * dt / (G.scope ? 0.28 : 0.17), 0, 1); if ((was > 0.5) !== (my.adsK > 0.5)) this.updateSpeed();
    if (!alive) { my.ads = false; my.firing = false; my.burst = 0; }
    for (const id in this.kick) this.kick[id] = Math.max(0, this.kick[id] - dt * 8);
  },

  // ------------------------------------------------------------------ the gun in your hands (a phone or computer)
  gunsDraw(dt, me, xr) {
    const P = this.g.player, t = this.clock, alive = !!(me && me.alive && this.inRound()), G = this.curG(), my = this.my;
    const scoped = G.scope && my.adsK > 0.85, acting = !!my.act;
    const flatOn = alive && !xr && P.flatMode && !!P.camera && !this.pickOpen;
    if (flatOn && (!this.vm || this.vm.userData.gun !== my.gun || this.vm.userData.team !== (me && me.team))) this.buildVM(me);
    if (this.vm) { this.vm.visible = flatOn; if (flatOn) this.poseVM(dt, G, scoped, acting); }
    this.vGun = this.vm ? this.vm.userData.g : null; if (this.vGun) this.vGun.visible = flatOn && !scoped && !acting;
    const grip = P.flatGrip; if (grip) { if (flatOn && grip.visible) { grip.visible = false; this.gripHid = true; } else if (!flatOn && this.gripHid) { grip.visible = true; this.gripHid = false; } }
    // aimed: the view zooms in (the sniper's scope right in)
    const cam = this.g.camera; if (!xr && cam) { const z = alive ? 1 + (G.zoom - 1) * smooth(my.adsK) : 1; if (z !== this.zoomNow) { if (this.fov0 == null) this.fov0 = cam.fov; cam.fov = this.fov0 * z; cam.updateProjectionMatrix(); this.zoomNow = z; } }
    my.scoped = scoped;
    // VR: on the right controller
    const h = xr ? (P.hands || []).find(h => h.source && h.handedness === 'right' && h.ctrl) : null, vrOn = alive && !!h && !acting;
    if (vrOn && (!this.vrGun || this.vrGun.userData.gun !== my.gun)) { if (this.vrGun && this.vrGun.parent) this.vrGun.parent.remove(this.vrGun); this.vrGun = newGun(my.gun); this.vrGun.add(this.mkFlash()); }
    if (this.vrGun) { if (vrOn && this.vrGun.parent !== h.ctrl) h.ctrl.add(this.vrGun); if (!vrOn && this.vrGun.parent) this.vrGun.parent.remove(this.vrGun); this.vrGun.visible = vrOn;
      if (vrOn) this.poseVR(dt, G, h); }
    this.othersGuns(dt);
  },
  // your hands and the gun: built for this gun, your skin and your team's sleeves
  buildVM(me) {
    const P = this.g.player; if (this.vm && this.vm.parent) this.vm.parent.remove(this.vm);
    const vm = new THREE.Group(); vm.name = 'sd view model'; const g = newGun(this.my.gun), ch = SQUAD[this.net.char || 'ronnie'], skin = (ch && ch.look && ch.look.skin) || 0xf1c3a5, hg = handGeos(skin, SLEEVE[me ? me.team : 'R'] || 0xff5a3d);
    const rH = new THREE.Mesh(hg.r, vcLambert), lH = new THREE.Mesh(hg.l, vcLambert), lHold = new THREE.Group(); rH.name = 'right hand'; lH.name = 'left hand'; g.add(rH); g.add(lHold); lHold.add(lH);
    const shell = new THREE.Mesh(beanShellGeo(), vcPhong); shell.visible = false; shell.position.set(0.0, 0.0, -0.03); lHold.add(shell);
    const fl = this.mkFlash(); g.add(fl);
    // (planting and defusing: the bomb, or the pliers, in your hands instead)
    if (!bombG) bombG = bombGeo(); if (!pliers) pliers = pliersGeo();
    const actG = new THREE.Group(), bomb = new THREE.Mesh(bombG, vcLambert), pl = new THREE.Mesh(pliers, vcPhong), aH = new THREE.Mesh(hg.r, vcLambert); actG.add(bomb); actG.add(pl); actG.add(aH); actG.visible = false;
    vm.add(g); vm.add(actG); vm.traverse(o => { o.frustumCulled = false; o.renderOrder = 5; });
    vm.userData = { gun: this.my.gun, team: me ? me.team : null, g, rH, lH, lHold, shell, flash: fl, actG, bomb, pl, aH, sway: new THREE.Vector2(), swayV: new THREE.Vector2(), bob: 0, kick: 0 };
    P.camera.add(vm); this.vm = vm;
  },
  mkFlash() { if (!flashMat) { flashMat = new THREE.MeshBasicMaterial({ map: flashTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, color: 0xffd890 }); fGeo = flashGeo(); }
    const m = new THREE.Mesh(fGeo, flashMat); m.name = 'flash'; m.visible = false; m.frustumCulled = false; m.renderOrder = 6; return m; },
  vmFlash() { const f = (this.vm && this.vm.visible && this.vm.userData.flash) || (this.vrGun && this.vrGun.visible && this.vrGun.getObjectByName('flash')); if (!f) return; this.flashT = this.clock; },
  // where everything is on the gun this frame: the magazine, the moving part, the spinning barrels (and for the view
  // model: where your other hand is, the gun's tilt for a reload). Shared by the view model, the headset and everyone else's
  poseParts(gun, G, st) {
    const U = gun.userData, M = U.model, P = U.parts, t = this.clock, out = { tilt: 0, roll: 0, lift: 0, hand: null, shell: false, magOff: 0 };
    if (P.mag) { P.mag.position.copy(U.rest.mag); P.mag.rotation.set(0, 0, 0); P.mag.visible = !M.hideMag; }
    if (P.act) { P.act.position.copy(U.rest.act); P.act.rotation.set(0, 0, 0); }
    const rl = st.rl, f = rl ? clamp((t - rl.t0) / rl.T, 0, 1) : 0, mo = M.magDir;
    if (rl && rl.k === 'shell') { const pre = rl.pre / rl.T, endS = (rl.pre + rl.n * rl.per) / rl.T; out.tilt = span(f, 0, pre) * (1 - span(f, endS, 1)); out.roll = -out.tilt * 0.5;
      if (f > pre && f < endS) { const per = rl.per / rl.T, u = ((f - pre) % per) / per; out.shell = u < 0.75; out.hand = [M.magAt.x + 0.01, M.magAt.y - 0.14 * (1 - span(u, 0.1, 0.55)) + 0.02 * span(u, 0.55, 0.75), M.magAt.z + 0.02]; }
      const pf = bump(f, endS, 1); if (P.act) P.act.position.z += pf * M.actLen; if (pf > 0) out.hand = [M.fore.x, M.fore.y, M.fore.z + pf * M.actLen]; }
    else if (rl && rl.k === 'cyl') { const sw = span(f, 0.06, 0.18) * (1 - span(f, 0.72, 0.84)); out.tilt = sw * 0.6; out.lift = bump(f, 0.18, 0.34) * 0.5;
      if (P.act) { P.act.position.x -= sw * M.actLen; P.act.rotation.z = sw * 1.1; }
      const ld = span(f, 0.36, 0.6), on = f > 0.34 && f < 0.66; if (P.mag) { P.mag.visible = on; P.mag.position.set(M.cylAt.x - sw * M.actLen - 0.12 * (1 - ld), M.cylAt.y - 0.18 * (1 - ld), M.cylAt.z + 0.06); }
      out.hand = on ? [P.mag.position.x, P.mag.position.y - 0.02, P.mag.position.z + 0.03] : f > 0.1 && f < 0.9 ? [M.cylAt.x - 0.06, M.cylAt.y - 0.06, M.cylAt.z + 0.04] : null; }
    else if (rl) { out.tilt = span(f, 0, 0.14) * (1 - span(f, 0.86, 1)); out.roll = out.tilt * (rl.k === 'box' ? -0.3 : 0.6);
      const outK = span(f, 0.22, 0.4), inK = span(f, 0.58, 0.76), d = f < 0.5 ? outK : 1 - inK; out.magOff = d;
      if (P.mag) { P.mag.position.addScaledVector(mo, d * 0.28); P.mag.visible = !(f > 0.42 && f < 0.56); }
      out.hand = f < 0.15 ? null : f < 0.42 ? [M.magAt.x + mo.x * d * 0.28, M.magAt.y + mo.y * d * 0.28, M.magAt.z + mo.z * d * 0.28] : f < 0.56 ? [M.magAt.x, M.magAt.y - 0.35, M.magAt.z + 0.05] : f < 0.8 ? [M.magAt.x + mo.x * d * 0.28, M.magAt.y + mo.y * d * 0.28, M.magAt.z + mo.z * d * 0.28] : null;
      const rk = bump(f, 0.8, 0.94); if (P.act && rl.k !== 'box') { if (M.act === 'bolt') { P.act.rotation.z = span(f, 0.8, 0.84) * (1 - span(f, 0.9, 0.94)) * 1.1; P.act.position.z += bump(f, 0.83, 0.91) * M.actLen; } else P.act.position.z += rk * M.actLen; }
      if (rk > 0 && M.act !== 'none') out.hand = [M.actAt ? M.actAt.x + 0.03 : M.fore.x, (M.actAt ? M.actAt.y : M.fore.y), (M.actAt ? M.actAt.z : M.fore.z) + rk * M.actLen]; }
    // between shots: the pump, the bolt, a pistol's slide blowing back
    const cy = st.cyc; if (cy && P.act && !rl) { const k = clamp((t - cy.t0) / cy.T, 0, 1);
      if (cy.k === 'pump') { const b = bump(k, 0.15, 0.9); P.act.position.z += b * M.actLen; out.hand = [M.fore.x, M.fore.y, M.fore.z + b * M.actLen]; }
      else { P.act.rotation.z = span(k, 0.05, 0.25) * (1 - span(k, 0.75, 0.95)) * 1.1; P.act.position.z += bump(k, 0.22, 0.78) * M.actLen; out.hand = k > 0.05 && k < 0.95 ? [M.actAt.x + 0.04, M.actAt.y, M.actAt.z + bump(k, 0.22, 0.78) * M.actLen] : null; } }
    if (P.act && M.act === 'slide' && !rl) { const k = (t - (st.lastShot || -9)) / 0.07; if (k >= 0 && k < 1) P.act.position.z += (1 - k) * M.actLen; if (st.mag === 0 && !rl) P.act.position.z += M.actLen; }      // (slide locked back when it's empty)
    if (P.spin) P.spin.rotation.z += (st.spinK || 0) * 0.66;
    return out;
  },
  poseVM(dt, G, scoped, acting) {
    const U = this.vm.userData, g = U.g, t = this.clock, my = this.my, P = this.g.player, M = g.userData.model, cam = this.g.camera;
    const V = window.__vm || {}, asp = cam.aspect || 1, por = asp < 1, sc = V.sc || (por ? 0.62 : 0.72), k = smooth(my.adsK);
    // the hip spot (bottom right, sized to the screen, its stock just in front of the lens, turned in a little so you see
    // its side) and the aimed one (the sight on your eye line)
    const hx = V.hx ?? (por ? 0.07 : 0.12), hy = V.hy ?? (por ? -0.15 : -0.13), hz = (V.hz ?? (por ? -0.2 : -0.2)) - Math.max(0, M.rear) * sc, hry = V.ry ?? 0.1;
    // (aimed, the gun's tipped up a touch round its sight, so the stock drops away under your chin)
    const arx = V.arx ?? (G.scope ? 0.1 : 0), so = _w.copy(M.sight).multiplyScalar(sc).applyEuler(_e.set(arx, 0, 0)), ax = -so.x, ay = -so.y, az = -(G.scope ? 0.3 : V.az ?? 0.1) - so.z;
    // sway: the gun lags behind as you look round, then catches up; it breathes; it bobs as you walk
    const yaw = P.flatYaw, pitch = P.flatPitch, dy = this.vmYaw == null ? 0 : yaw - this.vmYaw, dp = this.vmPitch == null ? 0 : pitch - this.vmPitch; this.vmYaw = yaw; this.vmPitch = pitch;
    const sw = U.sway, sv = U.swayV, lag = 1 - k * 0.8; sv.x += (-clamp(dy, -0.2, 0.2) * 0.6 * lag - sw.x * 90 * dt) ; sv.y += (-clamp(dp, -0.2, 0.2) * 0.6 * lag - sw.y * 90 * dt); sv.multiplyScalar(Math.max(0, 1 - dt * 14)); sw.addScaledVector(sv, Math.min(1, dt * 30));
    const mv = P.flatMove ? Math.min(1, Math.hypot(P.flatMove.x, P.flatMove.z)) : 0; U.bob += dt * 8.5 * mv; const bk = mv * (1 - k * 0.85);
    const br = Math.sin(t * 1.7) * 0.0022 * (1 - k * 0.8), bx = Math.sin(U.bob) * 0.008 * bk, by = -Math.abs(Math.cos(U.bob)) * 0.009 * bk;
    // the kick: back and up, then settling (a spring)
    U.kick += (this.vmKickV || 0); this.vmKickV = 0; U.kick = Math.min(U.kick, 1.4); const kz = U.kick * (0.02 + G.kick * 0.5) * (1 - k * 0.5), kr = U.kick * (0.05 + G.kick * 2.4) * (1 - k * 0.6); U.kick *= Math.max(0, 1 - dt * 16);
    // getting it out, the reload's tilt, the inspect, a plant or defuse (the gun's put away)
    const draw = my.drawEnd > t ? smooth((my.drawEnd - t) / Math.max(0.1, G.draw)) : 0;
    const st = { rl: my.rl, cyc: my.cyc, lastShot: my.lastShot, mag: my.mag, spinK: G.spin ? my.spin / G.spin * dt * 60 : 0 };
    const pp = this.poseParts(g, G, st);
    const ins = my.insp ? clamp((t - my.insp) / 2.6, 0, 1) : 0; if (ins >= 1) my.insp = 0; const iy = bump(ins, 0, 1), ir = Math.sin(ins * Math.PI * 2) * bump(ins, 0, 1);
    const put = acting ? 1 : 0; this.vmPut = (this.vmPut || 0) + (put - (this.vmPut || 0)) * Math.min(1, dt * 8);
    g.position.set(hx + (ax - hx) * k + bx + sw.x * 0.5 - iy * 0.06, hy + (ay - hy) * k + by + br + sw.y * 0.5 - draw * 0.22 - pp.tilt * 0.02 + pp.lift * 0.02 - this.vmPut * 0.35, hz + (az - hz) * k + kz + iy * 0.03);
    g.rotation.set(kr - draw * 0.9 + pp.tilt * 0.3 + pp.lift + sw.y * 1.2 + iy * 0.15 + (V.rx ?? 0.02) * (1 - k) + arx * k, hry * (1 - k) + sw.x * 1.5 + iy * 1.1, pp.roll * 0.8 + pp.tilt * 0.25 + ir * 0.45 - sw.x * 0.6 + (V.rz ?? -0.06) * (1 - k), 'XYZ');
    g.scale.setScalar(sc); g.visible = !scoped && this.vmPut < 0.95;
    // the other hand: on the front of the gun, or doing the reload
    const hand = pp.hand || [M.fore.x, M.fore.y, M.fore.z]; U.lHold.position.lerp(_v.set(hand[0], hand[1], hand[2]), Math.min(1, dt * (pp.hand ? 22 : 12)));
    U.lH.rotation.set(pp.hand ? -0.4 : 0, 0, pp.hand ? 0.3 : 0); U.shell.visible = !!pp.shell;
    // the muzzle flash
    const fl = U.flash, fk = (t - (this.flashT ?? -9)) / 0.05; fl.visible = fk >= 0 && fk < 1 && !scoped; if (fl.visible) { fl.position.copy(M.muzzle); fl.rotation.set(0, 0, Math.random() * 6); fl.scale.setScalar((G.pellets > 1 || G.dmg > 45 ? 0.16 : 0.1) * (1.2 - fk * 0.5)); flashMat.color.setHex(G.tr || 0xffd890); }
    // planting (the bomb in your hands, going down, a finger on the keypad) or defusing (the pliers snipping)
    const A = U.actG; A.visible = this.vmPut > 0.05; if (A.visible) { const a = my.act || this.lastAct || { k: 'plant', t0: t, T: 1 }; if (my.act) this.lastAct = my.act; const pk = clamp((t - a.t0) / a.T, 0, 1), up = (1 - this.vmPut);
      A.position.set(0, -0.26 - up * 0.3, -0.42); A.rotation.set(0.5, 0, 0); A.scale.setScalar(0.9);
      U.bomb.visible = true; U.bomb.position.set(0, a.k === 'plant' ? -0.04 - pk * 0.12 : -0.16, 0); U.bomb.rotation.set(0.15, Math.PI, 0);
      U.pl.visible = a.k === 'defuse'; U.pl.position.set(0.06, 0.02, 0.18); U.pl.rotation.set(-0.9, 0, Math.sin(t * 14) * 0.25);
      U.aH.visible = true; if (a.k === 'plant') U.aH.position.set(0.02 + Math.sin(t * 7) * 0.02, 0.07 + Math.abs(Math.sin(t * 9)) * 0.03 - pk * 0.12, 0.16); else U.aH.position.set(0.07, 0.03, 0.3); U.aH.rotation.set(-1.1, 0.2, 0); }
  },
  // the headset: the gun on the right controller; the left hand on its front (holding grip) aims it with both
  poseVR(dt, G, h) {
    const gun = this.vrGun, my = this.my, U = gun.userData, M = U.model, k = this.kick[this.me] || 0, P = this.g.player;
    const st = { rl: my.rl, cyc: my.cyc, lastShot: my.lastShot, mag: my.mag, spinK: G.spin ? my.spin / G.spin * dt * 60 : 0 }, pp = this.poseParts(gun, G, st);
    gun.position.set(0, -0.03, 0.05 + k * 0.04); gun.rotation.set(k * 0.3 - pp.tilt * 0.6, 0, pp.roll * 0.8);
    const L = (P.hands || []).find(x => x.source && x.handedness === 'left' && x.ctrl), gp = L && L.source && L.source.gamepad, grip = !!(gp && gp.buttons[1] && gp.buttons[1].pressed);
    this.twoHand = false;
    if (L && grip && !my.rl) { gun.updateMatrixWorld(true); const fore = gun.localToWorld(M.fore.clone()), lp = L.ctrl.getWorldPosition(new THREE.Vector3());
      if (fore.distanceTo(lp) < (this.twoHandWas ? 0.3 : 0.16)) { const rp = h.ctrl.getWorldPosition(new THREE.Vector3()), dir = lp.clone().sub(rp); if (dir.lengthSq() > 0.01) { dir.normalize();
        h.ctrl.getWorldQuaternion(_q); const up = new THREE.Vector3(0, 1, 0).applyQuaternion(_q); _m4.lookAt(new THREE.Vector3(), dir, up); _q2.setFromRotationMatrix(_m4);      // (the gun's -z along the line from your right hand to your left)
        gun.quaternion.copy(_q.invert().multiply(_q2)); gun.rotateX(k * 0.2); this.twoHand = true; } } }
    this.twoHandWas = this.twoHand;
    const fl = gun.getObjectByName('flash'), fk = (this.clock - (this.flashT ?? -9)) / 0.05; if (fl) { fl.visible = fk >= 0 && fk < 1; if (fl.visible) { fl.position.copy(M.muzzle); fl.rotation.set(0, 0, Math.random() * 6); fl.scale.setScalar(G.pellets > 1 || G.dmg > 45 ? 0.16 : 0.1); } }
  },
  // everyone else's: in their right hand, pointing where they look (the magazine dropping when they reload)
  othersGuns(dt) {
    const live = new Set();
    if (this.inRound()) for (const [id, f] of this.F) { if (id === this.me || !f.alive) continue; const av = this.avatar(id); if (!av || !av.handPos) continue;
      let q = null; if (f.bot) { const bp = this.host && this.bots && this.bots.get(id) ? this.bots.get(id) : this.botPose.get(id); if (bp) { _e.set(bp.pitch || 0, bp.yaw, 0, 'YXZ'); q = _q.setFromEuler(_e); } }
      else { const np = this.net.players.get(id); if (np && np.pose && Array.isArray(np.pose.q)) q = _q.set(...np.pose.q); }
      if (!q) continue; const hp = av.handPos(); if (!hp || !isFinite(hp.x)) continue;
      let gm = this.rGuns.get(id); if (gm && gm.userData.gun !== f.gun) { this.grp.remove(gm); gm = null; } if (!gm) { gm = newGun(GUN[f.gun] ? f.gun : FREE_GUN); gm.scale.setScalar(1.1); this.grp.add(gm); this.rGuns.set(id, gm); }
      live.add(id); av.gunArm = true; gm.visible = !(av.emote && av.emote.active) && !f.acting; gm.quaternion.copy(q); gm.position.copy(hp); const k = this.kick[id] || 0; gm.rotateX(k * 0.3);
      const G = GUN[gm.userData.gun], rl = f.rlT != null && this.clock - f.rlT < G.reload ? { k: G.rtype === 'shell' ? 'mag' : G.rtype, t0: f.rlT, T: G.rtype === 'shell' ? 1.6 : G.reload } : null;
      this.poseParts(gm, G, { rl, cyc: null, lastShot: f.shotT, mag: 1, spinK: k > 0 ? dt * 30 : 0 }); }
    for (const [id, gm] of this.rGuns) if (!live.has(id)) { this.grp.remove(gm); this.rGuns.delete(id); const av = this.avatar(id); if (av) av.gunArm = false; }
  },
  disposeGuns() { if (this.vm && this.vm.parent) this.vm.parent.remove(this.vm); this.vm = null; if (this.vrGun && this.vrGun.parent) this.vrGun.parent.remove(this.vrGun); for (const [id, gm] of this.rGuns) { if (gm.parent) gm.parent.remove(gm); const av = this.avatar(id); if (av) av.gunArm = false; } this.rGuns.clear(); },
};
export { slab, raySeg, GUNS };
