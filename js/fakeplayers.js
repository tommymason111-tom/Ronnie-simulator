// FAKE PLAYERS (developer mode): pretend mates in a real room, for testing multiplayer on your own. Each one is a real
// player as far as the room server and your game can tell: it joins over its own connection to the same room, says
// who it's playing as, readies up, and walks round the map (along real paths, so not through walls) sending where it
// is like a phone would. In the game modes it plays along:
//   - the READY card before a game: it taps I'M READY
//   - PROP HUNT: as a hider it turns into one of the map's things, finds a spot, locks in and taunts now and then (and
//     legs it when it's shot); as a seeker it wanders and takes shots, sometimes at a hider
//   - IMPOSTER: a crewmate walks to its jobs and does them; an imposter stalks someone and kills when it can; in a
//     meeting it votes (someone, or skip)
//   - BOSS FIGHT: it chips away at the boss with thrown food
//   - SEARCH AND DESTROY: it picks a gun, walks to a site (the bomb carrier plants there; defenders guard, and defuse a
//     planted bomb), picks up a dropped bomb, and shoots at enemies it can see
//   - everything else: it wanders, stops, "eats" (its hand to its mouth)
// startFakePlayers(code, n) -> { bots, set(n), stop() }. Nothing here is loaded unless developer mode asks for it.
import { RELAY } from './net.js';
import { SQUAD } from './squad.js';
import { TASKS, IMP } from './imposter.js';
import { MAPS as SD_MAPS, GUNS as SD_GUNS } from './sndkit.js';

const NAMES = ['LEWIS', 'CHLOE', 'ETHAN', 'HARRY', 'AIDAN', 'NOAH', 'OLIVER', 'DYLAN', 'CONNOR', 'ALFIE', 'BEN', 'IAN'];
const rnd = (a, b) => a + Math.random() * (b - a), pick = (l) => l[Math.floor(Math.random() * l.length)];
const r3 = (v) => Math.round(v * 1000) / 1000, r2 = (v) => Math.round(v * 100) / 100;

class FakePlayer {
  constructor(code, i, relay, pid0) {
    const chars = Object.keys(SQUAD).filter(c => c !== 'ronnie'), ch = chars.find(c => c.toUpperCase().startsWith(NAMES[i % NAMES.length].slice(0, 4))) || chars[i % chars.length] || 'ethan';
    this.i = i; this.char = ch; this.name = `BOT ${NAMES[i % NAMES.length]}`; this.id = null; this.hostId = null; this.poses = new Map(); this.alive = true;
    this.pos = null; this.yaw = Math.random() * 6.28; this.path = []; this.waitT = rnd(0.5, 2); this.eatT = 0; this.t0 = performance.now();
    this.mode = null; this.ph = null; this.im = null; this.boss = null; this.sentAt = 0; this.last = '';
    const pid = this.pid = pid0 || Array.from({ length: 10 }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join('');      // (the same id again after a page reload: the room knows it's the same player back)
    this.ws = new WebSocket(`${relay}/room/${code}?name=${encodeURIComponent(this.name)}&pid=${pid}`);
    this.ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (er) { return; } try { this.on(m); } catch (er) { console.warn('fake player', er); } };
    this.ws.onopen = () => { this.send({ t: 'hi', name: this.name, char: this.char, v: window.GAME_BUILD }); setTimeout(() => this.send({ t: 'ready', r: 1 }), rnd(200, 500));      /* (straight away: they're there to be tested with, not waited for) */ };
  }
  send(m) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m)); }
  later(ms, f) { setTimeout(() => { if (this.ws && this.ws.readyState === 1) f(); }, ms); }
  stop() { try { this.ws.close(); } catch (e) {} this.ws = null; }

  // ---------------------------------------------------------------- what the room says
  on(m) {
    const t = m.t;
    if (t === 'welcome') { this.id = m.id; this.hostId = m.hostId || null; return; }
    if (t === 'host') { this.hostId = m.id; return; }
    if (t === 'join') { this.send({ t: 'hi', to: m.id, name: this.name, char: this.char, v: window.GAME_BUILD }); this.send({ t: 'ready', r: 1, to: m.id }); return; }
    if (t === 'leave') { this.poses.delete(m.id); return; }
    if (t === 'p' && m.f && Array.isArray(m.h)) { this.poses.set(m.f, { x: m.h[0], z: m.h[2], at: performance.now() }); return; }
    if (t === 'setup' || t === 'restart') { this.mode = m.mode || this.mode; this.reset(); return; }
    if (t === 'rcheck' && typeof m.k === 'string') { this.later(rnd(150, 450), () => this.send({ t: 'rready', k: m.k, r: 1 })); return; }
    // PROP HUNT
    if (t === 'phRound' && Array.isArray(m.seek)) { this.im = null; this.boss = null; const seeker = m.seek.map(String).includes(String(this.id));
      this.ph = { role: seeker ? 'seeker' : 'hider', phase: 'hide', kind: null, locked: false, found: false, shotT: rnd(2, 4), tauntT: rnd(12, 25) };
      if (!seeker) this.later(rnd(400, 900), () => { const ph = window.RS && window.RS.director && window.RS.director.prophunt, kinds = (ph && ph.kinds) || []; if (!kinds.length || !this.ph) return; this.ph.kind = pick(kinds); this.send({ t: 'phProp', k: this.ph.kind }); });
      this.path = []; this.waitT = 0; return; }
    if (t === 'phGo' && this.ph) { this.ph.phase = 'seek'; return; }
    if ((t === 'phFound' && String(m.v) === String(this.id)) && this.ph) { this.ph.found = true; return; }
    if (t === 'phHit' && this.ph && String(m.v) === String(this.id)) { this.ph.locked = false; this.send({ t: 'phLock', on: 0 }); this.path = []; this.waitT = 0; this.run = 3; return; }      // (shot: unlock and leg it)
    if ((t === 'phEnd' || t === 'phOver') && this.ph) { this.ph.phase = 'end'; return; }
    // IMPOSTER
    if (t === 'imStart' && Array.isArray(m.imps)) { const me = String(this.id); this.ph = null; this.boss = null; this.alive = true; this.run = 0;      // (a new game: whatever it was doing in the last one's over)
      this.im = { imp: m.imps.map(String).includes(me), tasks: ((m.tasks && m.tasks[this.id]) || []).slice(), dead: new Set(), imps: new Set(m.imps.map(String)), phase: 'play', killCD: IMP.START_CD + 6, doing: null };
      this.path = []; this.waitT = rnd(1, 3); return; }
    if (t === 'imDead' && this.im) { this.im.dead.add(String(m.v)); if (String(m.v) === String(this.id)) this.alive = false; return; }
    if (t === 'imMeet' && this.im) { this.im.phase = 'meeting'; this.path = []; const dur = Math.max(6, Math.min(30, (Number(m.dur) || 30) * 0.4));
      if (this.alive) this.later(rnd(700, 1300), () =>      /* (a vote straight away: the meeting's over as soon as you've voted too) */ { if (!this.im || this.im.phase !== 'meeting') return; const live = [...this.poses.keys(), this.hostId].filter(id => id && !this.im.dead.has(String(id)) && String(id) !== String(this.id) && !(this.im.imp && this.im.imps.has(String(id))));
        this.send({ t: 'imV', v: Math.random() < 0.3 || !live.length ? 'skip' : pick(live) }); }); return; }
    if ((t === 'imRes' || t === 'imRound') && this.im) { this.im.phase = 'play'; this.im.killCD = Math.max(this.im.killCD, IMP.KILL_CD); return; }
    if (t === 'imWin' && this.im) { this.im.phase = 'over'; return; }
    // SEARCH AND DESTROY
    if (t === 'sdRound' && Array.isArray(m.list)) { const me = String(this.id), e = m.list.find(x => Array.isArray(x) && String(x[0]) === me); this.ph = null; this.im = null; this.boss = null;
      if (!e) { this.sd = null; return; }
      const team = e[3]; this.sd = { team, att: team === m.att, alive: true, phase: 'buy', car: String(m.car) === me, teams: Object.fromEntries(m.list.filter(Array.isArray).map(x => [String(x[0]), x[3]])), dead: new Set(), bots: {}, bomb: null, site: Math.random() < 0.5 ? 'A' : 'B', shotT: rnd(0.6, 1.4), actT: 0, gun: pick(SD_GUNS) };
      const sp = m.sp && m.sp[this.id]; if (Array.isArray(sp) && Number.isFinite(sp[0])) { this.pos = { x: sp[0], z: sp[1] }; this.yaw = sp[2] || 0; }
      this.path = []; this.waitT = 0; this.later(rnd(300, 1200), () => this.sd && this.send({ t: 'sdGun', g: this.sd.gun.id })); return; }
    if (t === 'sdGo' && this.sd) { this.sd.phase = 'live'; return; }
    if (t === 'sdKill' && this.sd) { this.sd.dead.add(String(m.v)); if (String(m.v) === String(this.id)) { this.sd.alive = false; this.sd.actT = 0; this.path = []; } return; }
    if (t === 'sdBomb' && this.sd) { this.sd.bomb = m; this.sd.car = m.st === 'carried' && String(m.id) === String(this.id); if (m.st === 'planted' && m.s) this.sd.site = m.s; return; }
    if (t === 'sdBots' && this.sd && Array.isArray(m.b)) { for (const e of m.b) if (Array.isArray(e)) this.sd.bots[String(e[0])] = { x: e[1], z: e[2] }; return; }
    if ((t === 'sdEnd' || t === 'sdOver') && this.sd) { this.sd.phase = 'end'; return; }
    // BOSS FIGHT
    if (t === 'bossS') { if (this.ph || this.im) { this.ph = null; this.im = null; } this.boss = { hp: m.hp, st: m.st, x: m.x, z: m.z, at: performance.now() }; return; }
  }
  reset() { this.sd = null; this.ph = null; this.im = null; this.boss = null; this.alive = true; this.run = 0; this.path = []; this.waitT = rnd(0.5, 2); this.pos = null; }

  // ---------------------------------------------------------------- every frame
  update(dt) {
    if (!this.ws || this.ws.readyState !== 1 || !this.id) return;
    const RS = window.RS, room = RS && RS.room, nav = room && room.nav; if (!nav) return;
    const host = this.hostId && this.poses.get(this.hostId);
    // start somewhere near the host (or anywhere free)
    if (!this.pos || !Number.isFinite(this.pos.x)) { const near = host || { x: 0, z: 0 }; const k = this.freeNear(nav, near.x, near.z, 4); if (k < 0) return; const c = nav.center(k); this.pos = { x: c.x, z: c.y }; }
    const ph = this.ph, im = this.im;
    // what it's doing
    if (this.sd) this.sdPlay(nav, dt);
    else if (ph && ph.found) { this.wander(nav, dt, host, 10); }      // (a found hider: a ghost, mooching about)
    else if (ph && ph.role === 'hider') {
      if (!ph.locked && ph.kind && (ph.phase === 'hide' || this.run > 0)) { if (!this.path.length && (this.run || 0) <= 0) { this.lockHere(); } else this.walk(nav, dt, 2.2); if (!this.path.length && this.run > 0) this.goto(nav, this.pos.x + rnd(-6, 6), this.pos.z + rnd(-6, 6)); this.run -= dt; }
      if ((ph.tauntT -= dt) <= 0 && ph.phase === 'seek') { ph.tauntT = rnd(14, 30); this.send({ t: 'phTaunt', i: Math.floor(Math.random() * 8) }); }
    } else if (ph && ph.role === 'seeker') {
      if (ph.phase === 'seek') { this.wander(nav, dt, null, 14); if ((ph.shotT -= dt) <= 0) { ph.shotT = rnd(1.6, 3.5); this.shoot(); } }
    } else if (im && im.phase === 'play') {
      if (!this.alive) this.wander(nav, dt, null, 12);
      else if (im.imp) this.stalk(nav, dt);
      else this.doJobs(nav, dt);
    } else if (im && im.phase === 'meeting') { /* sat at the table */ }
    else { this.wander(nav, dt, host, 9); if (this.boss && this.boss.hp > 0 && Math.random() < dt / 4) this.send({ t: 'bossHit', d: Math.round(rnd(12, 30)), w: Math.random() < 0.15 ? 1 : 0, p: [r2(this.boss.x || 0), 2.5, r2(this.boss.z || 0)] }); }
    if (im && im.killCD > 0) im.killCD -= dt;
    this.pose(dt, RS);
  }
  // SEARCH AND DESTROY: plant, defuse, pick the bomb up, guard a site, shoot whoever it can see
  sdPlay(nav, dt) {
    const sd = this.sd, M = SD_MAPS[(window.RS && window.RS.room && window.RS.room.placeId) || 'pub'] || SD_MAPS.pub; if (!sd.alive || sd.phase !== 'live') return;
    if (sd.actT > 0) { sd.actT -= dt; if (sd.actT <= 0) { this.send(sd.acting === 'plant' ? { t: 'sdPlant', s: sd.site, p: [r2(this.pos.x), r2(this.pos.z)] } : { t: 'sdDefuse' }); sd.acting = null; } return; }
    if ((sd.shotT -= dt) <= 0) { sd.shotT = rnd(0.45, 1.1) * (sd.gun.rate > 0.5 ? 2 : 1); const tg = this.sdTarget(); if (tg) { const a = [r2(this.pos.x), 1.4, r2(this.pos.z)], b = [r2(tg.x), 1.2, r2(tg.z)];
      this.yaw = Math.atan2(-(tg.x - this.pos.x), -(tg.z - this.pos.z)); this.send({ t: 'sdShot', a, b, g: SD_GUNS.indexOf(sd.gun), n: 1 }); if (Math.random() < 0.55) this.send({ t: 'sdHit', v: tg.id, d: Math.round(sd.gun.dmg * Math.min(2, sd.gun.pellets) * 0.8), hs: 0, p: b }); return; } }
    const b = sd.bomb, d2 = (p) => Math.hypot(p[0] - this.pos.x, p[1] - this.pos.z); let goal = null;
    if (sd.att) { if (sd.car) { const S = M[sd.site]; goal = S; if (d2(S) < S[2] * 0.6) { sd.actT = 3.6; sd.acting = 'plant'; this.path = []; this.send({ t: 'sdAct', k: 'plant', on: 1 }); return; } }
      else if (b && b.st === 'dropped' && Array.isArray(b.p)) { goal = b.p; if (d2(b.p) < 1.2) this.send({ t: 'sdTake', i: -1 }); }
      else if (b && b.st === 'planted' && Array.isArray(b.p)) goal = [b.p[0] + 2, b.p[1] + 1];
      else { const S = M[sd.site]; goal = [S[0] + (this.i % 3 - 1) * 2, S[1] + 1.5]; } }
    else if (b && b.st === 'planted' && Array.isArray(b.p)) { goal = b.p; if (d2(b.p) < 1.0) { sd.actT = 6.9; sd.acting = 'defuse'; this.path = []; this.send({ t: 'sdAct', k: 'defuse', on: 1 }); return; } }
    else { const S = M[this.i % 2 ? 'A' : 'B']; goal = [S[0] + (this.i % 3 - 1) * 1.6, S[1] - 1.2]; }
    if (!goal) return; if (d2(goal) < 0.8) { this.path = []; return; }
    if (!this.path.length || !this.sdGoal || Math.hypot(this.sdGoal[0] - goal[0], this.sdGoal[1] - goal[1]) > 1) { this.sdGoal = [goal[0], goal[1]]; this.goto(nav, goal[0], goal[1]); }
    this.walk(nav, dt, 2.2);
  }
  sdTarget() {
    const sd = this.sd, me = this.pos, snd = window.RS && window.RS.director && window.RS.director.snd, out = [];
    for (const [id, p] of this.poses) if (sd.teams[String(id)] && sd.teams[String(id)] !== sd.team && !sd.dead.has(String(id))) out.push({ id: String(id), x: p.x, z: p.z });
    for (const id in sd.bots) if (sd.teams[id] && sd.teams[id] !== sd.team && !sd.dead.has(id)) out.push({ id, x: sd.bots[id].x, z: sd.bots[id].z });
    let best = null, bd = 20; for (const o of out) { const d = Math.hypot(o.x - me.x, o.z - me.z); if (d >= bd) continue;
      if (snd && snd.canSee && window.RS.THREE) { const T = window.RS.THREE; if (!snd.canSee(new T.Vector3(me.x, 1.5, me.z), new T.Vector3(o.x, 1.4, o.z))) continue; } best = o; bd = d; }
    return best;
  }
  freeNear(nav, x, z, r) { for (let k = 0; k < 40; k++) { const q = nav.idx(x + rnd(-r, r), z + rnd(-r, r)); if (q >= 0 && nav.free[q]) return q; } return nav.nearestFree(x, z); }
  goto(nav, x, z) { const p = nav.path(this.pos.x, this.pos.z, x, z); this.path = p ? p.map(v => ({ x: v.x, z: v.y })) : []; }
  walk(nav, dt, speed = 1.35) {
    if (!this.path.length) return false; const w = this.path[0], dx = w.x - this.pos.x, dz = w.z - this.pos.z, d = Math.hypot(dx, dz), step = speed * dt;
    if (d <= step) { this.pos.x = w.x; this.pos.z = w.z; this.path.shift(); } else { this.pos.x += dx / d * step; this.pos.z += dz / d * step; }
    if (d > 0.01) { const want = Math.atan2(-dx, -dz); let dy = want - this.yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283; this.yaw += dy * Math.min(1, dt * 6); }
    return true;
  }
  wander(nav, dt, near, r) {
    if (this.walk(nav, dt)) return;
    if ((this.waitT -= dt) > 0) { this.eatT = Math.max(0, this.eatT - dt); return; }
    this.waitT = rnd(1.5, 4); if (Math.random() < 0.3) this.eatT = 1.2;      // (stood still a moment, sometimes with a bite to eat)
    const c = near || this.pos, k = this.freeNear(nav, c.x, c.z, r); if (k >= 0) { const p = nav.center(k); this.goto(nav, p.x, p.y); }
  }
  lockHere() { const ph = this.ph; if (!ph || ph.locked) return; ph.locked = true; this.send({ t: 'phLock', on: 1, p: [r2(this.pos.x), r2(this.pos.z)], y: r2(this.yaw) }); }
  shoot() {
    const ph = window.RS && window.RS.director && window.RS.director.prophunt; if (!ph) return; const me = this.pos, a = [r2(me.x), 1.45, r2(me.z)];
    // a hider within range, sometimes: a shot at them; otherwise at something nearby
    const hiders = [...ph.props.entries()].filter(([id, pr]) => pr && !pr.gone && String(id) !== String(this.id) && Math.hypot(pr.pos.x - me.x, pr.pos.z - me.z) < 14);
    if (hiders.length && Math.random() < 0.45) { const [id, pr] = pick(hiders), b = [r2(pr.pos.x), r2(pr.pos.y + 0.4), r2(pr.pos.z)];
      this.send({ t: 'phShot', a, b, h: 1 }); this.send({ t: 'phChk', v: 'h:' + id, p: b }); this.yaw = Math.atan2(-(b[0] - me.x), -(b[2] - me.z)); return; }
    const ang = this.yaw + rnd(-0.6, 0.6), d = rnd(3, 9); this.send({ t: 'phShot', a, b: [r2(me.x - Math.sin(ang) * d), 0.6, r2(me.z - Math.cos(ang) * d)], h: 0 });
  }
  doJobs(nav, dt) {
    const im = this.im; if (this.walk(nav, dt, 1.8)) return;
    if (im.doing) { if ((im.doT -= dt) <= 0) { this.send({ t: 'imT', task: im.doing }); im.tasks = im.tasks.filter(x => x !== im.doing); im.doing = null; this.waitT = rnd(0.5, 2); } else this.eatT = 0.4; return; }
    if ((this.waitT -= dt) > 0) return;
    const id = im.tasks[0]; if (!id) { this.wander(nav, dt, null, 10); return; }
    const T = TASKS.find(x => x.id === id); if (!T || !T.at) { im.tasks.shift(); return; }
    if (Math.hypot(T.at[0] - this.pos.x, T.at[1] - this.pos.z) < 1.2) { im.doing = id; im.doT = rnd(3, 6); return; }
    this.goto(nav, T.at[0], T.at[1]); if (!this.path.length) im.tasks.push(im.tasks.shift());      // (can't get there: try the next one)
  }
  stalk(nav, dt) {
    const im = this.im, me = String(this.id);
    const prey = [...this.poses.entries()].filter(([id, p]) => !im.dead.has(String(id)) && !im.imps.has(String(id)) && String(id) !== me && performance.now() - p.at < 3000).map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => Math.hypot(a.x - this.pos.x, a.z - this.pos.z) - Math.hypot(b.x - this.pos.x, b.z - this.pos.z))[0];
    if (!prey || im.killCD > 4) { this.wander(nav, dt, null, 12); return; }
    const d = Math.hypot(prey.x - this.pos.x, prey.z - this.pos.z);
    if (d < IMP.KILL_R && im.killCD <= 0) { this.send({ t: 'imK', v: prey.id }); im.killCD = IMP.KILL_CD; this.path = []; this.waitT = rnd(1, 2); return; }
    if (!this.path.length || (this.reT = (this.reT || 0) - dt) <= 0) { this.reT = 1; this.goto(nav, prey.x, prey.z); }
    this.walk(nav, dt, 1.6);
  }
  // where it is, like the game sends it: head, which way it's looking, both hands (a bite: the right hand at its mouth)
  pose(dt, RS) {
    const y0 = (RS.floorAt ? RS.floorAt(this.pos.x, this.pos.z) : (RS.room && RS.room.floorAt ? RS.room.floorAt(this.pos.x, this.pos.z) : 0)) || 0;
    const yaw = this.yaw, qy = Math.sin(yaw / 2), qw = Math.cos(yaw / 2), fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const k = this.eatT > 0 ? Math.sin(Math.min(1, (1.2 - this.eatT) / 1.2) * Math.PI) : 0; if (this.eatT > 0) this.eatT = Math.max(0, this.eatT - dt);
    const hx = this.pos.x, hz = this.pos.z, hy = y0 + 1.62;
    const m = { t: 'p', c: this.char, h: [r3(hx), r3(hy), r3(hz)], q: [0, r2(qy), 0, r2(qw)], l: [r3(hx - rx * 0.2 + fx * 0.25), r3(y0 + 1.0), r3(hz - rz * 0.2 + fz * 0.25)],
      rh: [r3(hx + fx * (0.4 - 0.25 * k) + rx * (0.18 - 0.1 * k)), r3(hy - 0.21 + 0.13 * k), r3(hz + fz * (0.4 - 0.25 * k) + rz * (0.18 - 0.1 * k))], s: 1, st: 0, flat: 1 };
    const key = m.h.join() + m.q.join() + m.rh.join(), now = performance.now();
    if ((key !== this.last && now - this.sentAt > 66) || now - this.sentAt > 1000) { this.last = key; this.sentAt = now; m.ts = Math.round(now - this.t0 + 1e6); this.send(m); }
  }
}

export function startFakePlayers(code, n, relay = RELAY, pids = []) {
  const bots = []; let raf = 0, last = performance.now();
  const tick = () => { const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; for (const b of bots) { try { b.update(dt); } catch (e) { if (!b.warned) { b.warned = true; console.warn('fake player', e); } } } raf = requestAnimationFrame(tick); };      // (one fake player tripping up never stops the rest, or the game)
  const ctl = {
    bots, code,
    set(k) { k = Math.max(0, Math.min(11, k | 0)); while (bots.length > k) bots.pop().stop(); while (bots.length < k) bots.push(new FakePlayer(code, bots.length, relay, pids[bots.length])); return bots.length; },
    pids() { return bots.map(b => b.pid); },
    stop() { cancelAnimationFrame(raf); clearInterval(ctl.bg); while (bots.length) bots.pop().stop(); },
  };
  ctl.set(n); raf = requestAnimationFrame(tick);
  ctl.bg = setInterval(() => { if (document.hidden) { const now = performance.now(), dt = Math.min(0.5, (now - last) / 1000); last = now; for (const b of bots) { try { b.update(dt); } catch (e) {} } } }, 250);      // (keeps going in a background tab)
  return ctl;
}
