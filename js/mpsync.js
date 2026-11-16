// MULTIPLAYER, steps 2 and 3: one shared game.
// The HOST's game is the real one: it runs the squad, the punters, the food and the game mode. About ten times a
// second it sends everyone where every person's body is and where every bit of food is. Everyone else's game shows
// exactly that (their own copies of the squad are puppets) and sends back what they do: what they're holding,
// what they throw, what they eat, who they punch, the shop displays they reach for.
// The squad attacks ONE player at a time, picked at random each time (so you can be picked twice in a row), and
// everyone gets told who's going for who. Whoever you picked to play as is left out of the squad, and everyone
// sees you as them.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { FOODS } from './config.js';
import { SquadMember, SQUAD } from './squad.js';
import { Character, KO_IMPULSE } from './character.js';
import { sfx } from './audio.js';
import { emoteInfo } from './emotes.js';

const TYPES = Object.keys(FOODS);
const SNAP_HZ = 10;
const q3 = (v) => Math.round(v * 1000) / 1000, q2 = (v) => Math.round(v * 100) / 100;
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();

export class MPSync {
  constructor(o) {
    Object.assign(this, o);            // { net, scene, room, physics, player, items, cast, director, words, fx, G, tommy }
    this.seq = 0; this.byNid = new Map(); this.dead = new Map(); this.snapT = 0; this.fullT = 0; this.dirT = 0;
    this.sentDefs = new Set(); this.remoteHolds = new Map(); this.lastSay = new Map();
    this.charSnap = new Map(); this.punchCool = 0; this.rgrabs = new Map();
    // VR on a joining player's game: grabbing one of the host's people sends it to the host
    if (this.player) this.player.remoteGrab = (h, who, part, ph) => this.sendGrab(h, who, part, ph);
    const net = this.net;
    for (const k of ['snap', 'def', 'say', 'dir', 'hold', 'throw', 'bite', 'gone', 'wake', 'woke', 'stun', 'announce', 'coming', 'hitby', 'punch', 'end', 'hitc', 'emote', 'swing', 'sfx', 'rgrab', 'chat', 'char'])
      net.on[k] = (m, p) => this['on_' + k] && this['on_' + k](m, p);
  }
  get host() { return this.net.host; }
  get on() { return this.net.connected && this.net.players.size > 0; }

  // ------------------------------------------------------------------ setting up
  start() {
    const { items, director, room } = this;
    // every item the host makes gets a number everyone can refer to it by
    const spawn0 = items.spawn.bind(items);
    items.spawn = (...a) => { const it = spawn0(...a); if (!it.netMirror) { it.nid = ++this.seq; this.byNid.set(it.nid, it); } return it; };
    const remove0 = items.remove.bind(items);
    items.remove = (it) => { if (it.nid) { this.byNid.delete(it.nid); if (!this.host && this.on && !it.dropNoTell) { this.net.send({ t: 'gone', nid: it.nid }); this.dead.set(it.nid, performance.now()); } } remove0(it); };
    // the shop displays / chairs / bottles: reaching for one on a joining player's game asks the host for it
    const D = room.dormant;
    if (D) { const wake0 = D.wake.bind(D);
      D.wake = (its, e) => { const i = D.entries.indexOf(e);
        if (this.on && !this.host) { e.woken = true; for (const im of e.group.meshes) { im.setMatrixAt(e.index, new THREE.Matrix4().makeScale(0, 0, 0)); im.instanceMatrix.needsUpdate = true; } this.net.send({ t: 'wake', i }); return null; }
        const it = wake0(its, e); if (this.on) this.net.send({ t: 'woke', i }); return it; }; }
    // speech: a host's character speaking tells everyone what they said
    const self = this;
    if (!Character.prototype.__mpSay) { const draw0 = Character.prototype.drawBubble; Character.prototype.__mpSay = true;
      Character.prototype.drawBubble = function (text) { draw0.call(this, text); if (self.on && self.host && !this.netDriven && !this.mpPuppet) self.net.send({ t: 'say', id: this.id, text }); }; }
    // hitting one of the host's people on a joining player's game: tell the host, who knocks them over for real
    // (and the next snapshot shows everyone the ragdoll); the WALLOP / SLAP still shows straight away here
    if (!Character.prototype.__mpKo) { Character.prototype.__mpKo = true; const ko0 = Character.prototype.knockOut;
      Character.prototype.knockOut = function (line) { const r = ko0.call(this, line); if (self.on && self.host && !this.mpPuppet && this.headPos) self.sfxOut('boing', this.headPos(new THREE.Vector3()), 1); return r; }; }
    if (!Character.prototype.__mpHit) { Character.prototype.__mpHit = true;
      const hit0 = Character.prototype.hitBy, slap0 = Character.prototype.slap;
      const fwd = (c, kind, part, point, v, veg) => { self.net.send({ t: 'hitc', id: c.id, kind, part: part.name, p: [q3(point.x), q3(point.y), q3(point.z)], v: [q2(v.x), q2(v.y), q2(v.z)], veg: veg ? 1 : 0 }); };
      Character.prototype.hitBy = function (part, point, impulse, isVeg = false) {
        if (!this.netDriven || !self.on || self.host) { this.mpHitAt = performance.now(); return hit0.call(this, part, point, impulse, isVeg); }
        fwd(this, 'hit', part, point, impulse, isVeg);
        return this.netRag === 1 ? 'wobble' : impulse.length() >= KO_IMPULSE * (this.koMul || 1) ? 'ko' : 'wobble'; };
      Character.prototype.slap = function (part, point, handVel) {
        if (!this.netDriven || !self.on || self.host) return slap0.call(this, part, point, handVel);
        if ((this.slapCool || 0) > 0) return null; this.slapCool = 0.35; setTimeout(() => { this.slapCool = 0; }, 350);
        fwd(this, 'slap', part, point, handVel);
        return this.netRag !== 1 && handVel.length() > 3.2 * (this.koMul || 1) ? 'ko' : 'slap'; };
    }
    director.mp = this;
  }
  // emotes: everyone sees your character do it (you get a little "you did it" here)
  emote(id) {
    if (!this.net.connected) return; const e = emoteInfo(id); if (!e) return;      // (default emotes and every character's own)
    if ((this.emoteCool || 0) > performance.now()) return; this.emoteCool = performance.now() + 600;
    this.net.send({ t: 'emote', e: id });
    if (this.selfBody && this.selfBody()) this.selfBody().doEmote(id);
    const P = this.player; this.words.show(e.icon + ' ' + e.name, P.head.clone().addScaledVector(P.fwd, 1.1).add({ x: 0, y: -0.1, z: 0 }), '#ff4fa3', 0.1, 1.6);
  }
  on_emote(m, p) { const e = emoteInfo(m.e); if (!e || !p || !p.avatar) return;
    if (p.avatar.doEmote) p.avatar.doEmote(m.e); else this.words.show(e.icon, p.avatar.headPos().add({ x: 0, y: 0.45, z: 0 }), '#ffd400', 0.3, e.dur); }
  // someone's switched character mid-game: their old body goes, the new one turns up with their next move
  setChar(c) { if (!this.net.connected) return; this.net.char = c; this.net.send({ t: 'char', c }); }
  on_char(m, p) { if (!p || !m.c) return; p.char = String(m.c).slice(0, 20); if (p.avatar) { p.avatar.dispose(); p.avatar = null; } this.words.show(`${p.name || 'A mate'} IS NOW ${(SQUAD[p.char] || { name: p.char === 'tommy' ? 'Tommy' : 'Ronnie' }).name.toUpperCase()}`, this.player.head.clone().addScaledVector(this.player.fwd, 1.2), '#ffd400', 0.1, 1.6); }
  // chat (multiplayer): a message to everyone; it shows over your character's head and in everyone's chat log
  chat(text) { if (!this.net.connected) return false; text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 90); if (!text) return false;
    const gate = this.chatGate ? this.chatGate() : { ok: true }; if (!gate.ok) { this.onChatBlocked && this.onChatBlocked(gate.why); return false; }     // (Imposter: only in meetings; ghosts only to ghosts)
    this.net.send(gate.ghost ? { t: 'chat', s: text, g: 1 } : { t: 'chat', s: text }); this.onChat && this.onChat((gate.ghost ? '👻 ' : '') + text, null); return true; }
  on_chat(m, p) { const s0 = String(m.s || '').slice(0, 90); if (!s0) return; if (this.chatRecvGate && !this.chatRecvGate(m, p)) return; const s = m.g ? '👻 ' + s0 : s0; if (p && p.avatar && p.avatar.chat) p.avatar.chat(s); this.onChat && this.onChat(s, p); }
  // you swung at something (slap, punch, throw): your character's arm goes for everyone else too
  swing(side = 'R') { if (!this.net.connected) return; const n = performance.now(); if (n - (this.swingAt || 0) < 150) return; this.swingAt = n; this.net.send({ t: 'swing', s: side }); }
  on_swing(m, p) { p && p.avatar && p.avatar.swing && p.avatar.swing(m.s || 'R'); }
  // hit sounds: sent to everyone, played where it happened (so you hear the ones near you louder)
  sfxOut(n, p, v = 1) { if (!this.net.connected) return; const t = performance.now(), at = this.sfxAt || (this.sfxAt = {}); if (t - (at[n] || 0) < 60) return; at[n] = t; this.net.send({ t: 'sfx', n, p: [q2(p.x), q2(p.y), q2(p.z)], v: q2(v) }); }
  on_sfx(m) { if (!['splat', 'thwack', 'boing', 'whoosh', 'slap', 'punch', 'throw'].includes(m.n)) return; sfx(m.n, new THREE.Vector3(...m.p), m.v || 1); }
  // ---- grabbing the host's people from a joining player's VR game: the host holds them with a stand-in hand
  sendGrab(h, who, part, ph) {
    if (!this.on) return; const p = h.palm, v = h.vel || { x: 0, y: 0, z: 0 };
    this.net.send({ t: 'rgrab', ph, id: who.id, part: part.name, side: h.handedness === 'left' ? 'L' : 'R', p: [q3(p.x), q3(p.y), q3(p.z)], v: [q2(v.x), q2(v.y), q2(v.z)] });
  }
  grabMoves(dt) {        // (joining player) where my grabbing hands are
    if ((this.grabT = (this.grabT || 0) - dt) > 0) return; this.grabT = 0.05;
    for (const h of this.player.hands || []) if (h.remoteGrab) this.sendGrab(h, h.remoteGrab.who, h.remoteGrab.part, 'move');
  }
  on_rgrab(m) {
    if (!this.host) return; const key = m.f + m.side, W = this.physics && this.physics.world; if (!W) return;
    let g = this.rgrabs.get(key);
    if (m.ph === 'start') {
      if (g) this.dropGrab(key, g, [0, 0, 0]);
      const c = this.cast.find(x => x.id === m.id), part = c && c.rag.parts[m.part]; if (!part) return;
      const hb = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, shape: new CANNON.Sphere(0.04) }); hb.collisionResponse = false; hb.position.set(...m.p); W.addBody(hb);
      const b = part.body, q = new THREE.Quaternion(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w).invert();
      const off = new THREE.Vector3(m.p[0] - b.position.x, m.p[1] - b.position.y, m.p[2] - b.position.z).applyQuaternion(q);
      const joint = new CANNON.PointToPointConstraint(hb, new CANNON.Vec3(0, 0, 0), b, new CANNON.Vec3(off.x, off.y, off.z), 4000); W.addConstraint(joint);
      part.grabbed = true; c.grabbed(part);
      this.rgrabs.set(key, { hb, joint, part, c, target: new THREE.Vector3(...m.p) });
    } else if (g && m.ph === 'move') g.target.set(...m.p);
    else if (g && m.ph === 'end') this.dropGrab(key, g, m.v);
  }
  dropGrab(key, g, v) {
    const W = this.physics.world; W.removeConstraint(g.joint); W.removeBody(g.hb);
    const b = g.part.body; b.velocity.x += (v[0] || 0) * 0.5; b.velocity.y += (v[1] || 0) * 0.5; b.velocity.z += (v[2] || 0) * 0.5;
    g.part.grabbed = false; g.c.released(); this.rgrabs.delete(key);
  }
  holdGrabs(dt) {        // (host) the stand-in hands follow the real ones
    for (const [key, g] of this.rgrabs) {
      if (!this.net.players.has(key.slice(0, -1))) { this.dropGrab(key, g, [0, 0, 0]); continue; }
      const hb = g.hb, t = g.target, k = Math.min(1, dt * 20);
      const nx = hb.position.x + (t.x - hb.position.x) * k, ny = hb.position.y + (t.y - hb.position.y) * k, nz = hb.position.z + (t.z - hb.position.z) * k;
      hb.velocity.set((nx - hb.position.x) / Math.max(dt, 1e-3), (ny - hb.position.y) / Math.max(dt, 1e-3), (nz - hb.position.z) / Math.max(dt, 1e-3)); hb.position.set(nx, ny, nz);
    }
  }
  on_hitc(m) {
    if (!this.host) return; const c = this.cast.find(x => x.id === m.id); if (!c || c.disposed) return;
    const part = c.rag.parts[m.part] || c.rag.parts.chest, p = new THREE.Vector3(...m.p), v = new THREE.Vector3(...m.v);
    if (m.kind === 'slap') { c.slapCool = 0; c.slap(part, p, v); }
    else if (performance.now() - (c.mpHitAt || 0) > 400) c.hitBy(part, p, v, !!m.veg);   // (unless the food they threw already hit them here)
  }
  // a joining player's game: the host's people and food replace ours
  becomeClient() {
    const { items, director } = this;
    director.remote = true;
    items.minFood = 0; items.respawnQueue.length = 0; items.clientMode = true;
    for (const it of items.items.slice()) if (!it.netMirror) { it.dropNoTell = true; items.remove(it); }
    for (const c of this.cast.slice(1)) c.dispose();
    this.cast.length = 1;
    this.tommy.netDriven = true;
  }
  // which squad members are being played by someone (left out of the squad)
  takenChars() { const s = new Set(); if (!this.net.connected) return s; if (this.net.char && this.net.char !== 'ronnie') s.add(this.net.char); for (const p of this.net.players.values()) if (p.char && p.char !== 'ronnie') s.add(p.char); return s; }

  // ------------------------------------------------------------------ every frame
  update(dt) {
    if (!this.net.connected) return;
    if (this.punchCool > 0) this.punchCool -= dt;
    // someone's playing as Tommy: the real one sits this game out (hidden, out of the way, no attacks)
    const T = this.tommy, bench = this.takenChars().has('tommy');
    if (bench !== !!T.benched) { T.benched = bench; T.rag.group.visible = !bench; T.bubble && (T.bubble.visible = false);
      if (bench) { T.attacks = false; T.directed = false; T.rag.placeAt(0, -60, 0); } else { const sp = this.room.tommySpots[0]; T.rag.placeAt(sp.x, sp.y, 0); } }
    if (bench) { T.attacks = false; T.directed = false; }
    if (this.host) { this.hostUpdate(dt); this.holdGrabs(dt); } else { this.clientUpdate(dt); this.grabMoves(dt); }
    this.punches();
  }

  // ---- host: tell everyone what's what
  hostUpdate(dt) {
    if (!this.on) return;
    // anyone now played by a person leaves the squad
    const taken = this.takenChars();
    for (const c of this.cast.slice(1)) if (taken.has(c.id)) { c.dispose(); this.cast.splice(this.cast.indexOf(c), 1); }
    // the food other people are holding follows their hands; let go without a throw = dropped
    for (const [nid, h] of this.remoteHolds) { const it = this.byNid.get(nid); if (!it || it.dead) { this.remoteHolds.delete(nid); continue; }
      if (performance.now() - h.at > 400) { it.heldBy = null; it.resting = false; it.vel.set(0, 0, 0); this.remoteHolds.delete(nid); continue; }
      it.heldBy = { remote: h.id }; it.prev.copy(it.pos); it.pos.lerp(_v.set(...h.p), 0.6); }
    this.remoteHits();
    if ((this.snapT -= dt) > 0) return;
    this.snapT = 1 / SNAP_HZ;
    const full = (this.fullT -= 1 / SNAP_HZ) <= 0; if (full) this.fullT = 1.0;
    const chars = [];
    for (const c of this.cast) {
      if (!c.rag || !c.rag.list) continue;
      if (c.id.startsWith('p') && !this.sentDefs.has(c.id) && SQUAD[c.id]) { this.sentDefs.add(c.id); this.net.send({ t: 'def', id: c.id, def: SQUAD[c.id] }); }
      const a = [c.id, c.rag.mode === 'ragdoll' ? 1 : 0];
      for (const p of c.rag.list) { const b = p.body; a.push(q3(b.position.x), q3(b.position.y), q3(b.position.z), q2(b.quaternion.x), q2(b.quaternion.y), q2(b.quaternion.z), q2(b.quaternion.w)); }
      chars.push(a);
    }
    const its = [];
    for (const it of this.items.items) {
      if (it.dead) continue;
      if (!it.nid) { it.nid = ++this.seq; this.byNid.set(it.nid, it); }   // (food that was there before the room opened)
      if (!full && it.resting && it.netSent) continue;
      it.netSent = true;
      const r = it.obj.quaternion, s = it.obj.scale.x;
      its.push([it.nid, TYPES.indexOf(it.type), it.variant || 0, q3(it.pos.x), q3(it.pos.y), q3(it.pos.z), q2(r.x), q2(r.y), q2(r.z), q2(r.w), q2(s), it.empty ? 1 : 0, it.heldBy ? (it.heldBy.remote || 'h') : 0]);
    }
    this.net.send({ t: 'snap', c: chars, i: its, full: full ? 1 : 0 });
    if ((this.dirT -= 1 / SNAP_HZ) <= 0) { this.dirT = 0.5; const d = this.director; this.net.send({ t: 'dir', mode: d.fullMode || d.mode, left: d.timeLeft, hud: d.hud(), running: d.running }); }
  }
  // food anyone throws hits the other players too
  remoteHits() {
    for (const it of this.items.items) {
      if (it.dead || it.heldBy || it.resting || !(it.thrownByPlayer || it.incoming) || it.vel.lengthSq() < 4) continue;
      for (const p of this.net.players.values()) { const av = p.avatar; if (!av || it.thrower === p.id) continue;
        const hd = av.headPos(); if (it.pos.distanceTo(hd) < 0.22 + it.radius || it.pos.distanceTo(_v.copy(hd).add({ x: 0, y: -0.45, z: 0 })) < 0.3 + it.radius) {
          this.net.send({ t: 'hitby', to: p.id, veg: it.def.veg ? 1 : 0, v: [q2(it.vel.x), q2(it.vel.z)], type: it.type });
          this.words.show('SPLAT!', it.pos.clone().add({ x: 0, y: 0.2, z: 0 }), '#ff9a36', 0.16, 0.9); sfx('splat', it.pos, 0.7);
          it.vel.multiplyScalar(-0.25); it.thrownByPlayer = false; it.incoming = false; break; } }
    }
  }
  on_hold(m, p) { if (!this.host) return; for (const [nid, x, y, z] of m.h || []) { this.remoteHolds.set(nid, { id: p ? p.id : m.f, p: [x, y, z], at: performance.now() }); const it = this.byNid.get(nid); if (it) { it.heldBy = { remote: m.f }; it.resting = false; it.shelf = false; } } }
  on_throw(m) { if (!this.host) return; const it = this.byNid.get(m.nid); this.remoteHolds.delete(m.nid); if (!it) return;
    it.heldBy = null; it.resting = false; it.pos.set(...m.p); it.prev.copy(it.pos); it.vel.set(...m.v); it.thrownByPlayer = true; it.thrower = m.f; it.spin.set(Math.random() * 10, Math.random() * 10, Math.random() * 10); it.netSent = false; }
  on_bite(m) { if (!this.host) return; const it = this.byNid.get(m.nid); if (it) { it.bitesLeft = m.left; it.empty = !!m.empty; it.netSent = false; } }
  on_gone(m) { if (!this.host) return; const it = this.byNid.get(m.nid); if (it && !it.dead) { it.dropNoTell = true; this.items.remove(it); } }
  on_wake(m) { if (!this.host || !this.room.dormant) return; const e = this.room.dormant.entries[m.i]; if (e && !e.woken) this.room.dormant.wake(this.items, e); }

  // ---- everyone else: show what the host says
  clientUpdate(dt) {
    // smooth everything towards the host's last word
    const k = Math.min(1, dt * 14);
    for (const it of this.items.items) if (it.netMirror && it.netT && !this.heldLocally(it)) { it.pos.lerp(it.netT.p, k); it.obj.quaternion.slerp(it.netT.q, k); it.obj.scale.setScalar(it.obj.scale.x + (it.netT.s - it.obj.scale.x) * k); }
    // tell the host what I'm holding (and where)
    const held = this.localHeld();
    if (held.length && (this.holdT = (this.holdT || 0) - dt) <= 0) { this.holdT = 0.08; this.net.send({ t: 'hold', h: held.filter(it => it.nid).map(it => [it.nid, q3(it.pos.x), q3(it.pos.y), q3(it.pos.z)]) }); }
    // something I was holding has just left my hand: it's been thrown (or dropped)
    for (const it of this.wasHeld || []) if (!held.includes(it) && it.nid && !it.dead) { this.net.send({ t: 'throw', nid: it.nid, p: [q3(it.pos.x), q3(it.pos.y), q3(it.pos.z)], v: [q2(it.vel.x), q2(it.vel.y), q2(it.vel.z)] }); it.netT = null; }
    this.wasHeld = held;
    for (const [nid, t] of this.dead) if (performance.now() - t > 3000) this.dead.delete(nid);
  }
  localHeld() { const P = this.player; return [...(P.hands || []).map(h => h.held), P.flatHolder && P.flatHolder.held].filter(it => it && !it.dead); }
  heldLocally(it) { return this.localHeld().includes(it); }
  on_def(m) { if (!this.host && m.def) SQUAD[m.id] = m.def; }
  on_snap(m) {
    if (this.host) return;
    // the people
    const seen = new Set();
    for (const a of m.c) {
      const id = a[0]; seen.add(id);
      let c = this.cast.find(x => x.id === id);
      if (!c) { if (id === 'tommy' || !SQUAD[id]) continue;
        c = new SquadMember(this.scene, this.room, this.physics, id, [a[2], a[4], 0], this.director); c.netDriven = true; c.active = false; this.cast.push(c); }
      c.netDriven = true;
      const tg = c.netTarget || (c.netTarget = []);
      for (let i = 0; i < c.rag.list.length; i++) { const o = 2 + i * 7; tg[i] = a.slice(o, o + 7); }
      c.netRag = a[1];
    }
    for (const c of this.cast.slice(1)) if (!seen.has(c.id)) { c.dispose(); this.cast.splice(this.cast.indexOf(c), 1); }
    // the food
    const listed = new Set();
    for (const r of m.i) {
      const [nid, ti, v, x, y, z, qx, qy, qz, qw, s, empty, held] = r; listed.add(nid);
      if (this.dead.has(nid)) continue;
      let it = this.byNid.get(nid);
      if (!it || it.dead) { it = this.items.spawn(TYPES[ti], new THREE.Vector3(x, y, z), null, v); it.netMirror = true; it.nid = nid; this.byNid.set(nid, it); it.obj.quaternion.set(qx, qy, qz, qw); it.resting = true; it.spawnScale = 1; }
      if (this.heldLocally(it)) continue;
      it.netT = { p: new THREE.Vector3(x, y, z), q: new THREE.Quaternion(qx, qy, qz, qw), s };
      it.empty = !!empty; it.netHeldBy = held;
    }
    if (m.full) for (const it of this.items.items.slice()) if (it.netMirror && !listed.has(it.nid) && !this.heldLocally(it)) { it.dropNoTell = true; this.items.remove(it); }
  }
  on_say(m) { if (this.host) return; const c = this.cast.find(x => x.id === m.id); if (c && c.rag.mesh) { c.drawBubble(m.text); c.bubble.visible = true; c.speakT = 2.2 + m.text.length * 0.055; } }
  on_dir(m) { if (this.host) return; const d = this.director; d.hostHud = m.hud; d.timeLeft = m.left; if (m.mode && m.mode !== (d.fullMode || d.mode) && d.startRemote) d.startRemote(m.mode); }
  on_woke(m) { const D = this.room.dormant; if (!D) return; const e = D.entries[m.i]; if (e && !e.woken) { e.woken = true; for (const im of e.group.meshes) { im.setMatrixAt(e.index, new THREE.Matrix4().makeScale(0, 0, 0)); im.instanceMatrix.needsUpdate = true; } } }
  on_end(m) { if (this.host) return; this.director.running = false; this.director.showReceipt && this.director.showReceipt(m.lines); this.director.receiptT = 1e9; this.director.g.onGameOver && this.director.g.onGameOver(m.lines); }

  // ------------------------------------------------------------------ the squad picks on one of you at a time
  // everyone who can be attacked: me, and each other player with a body in the game
  targets() {
    const P = this.player, list = [{ id: null, name: this.net.name || 'You', head: P.head, mouth: P.mouth, fwd: P.fwd }];
    for (const p of this.net.players.values()) if (p.avatar) { const hd = p.avatar.headPos(); list.push({ id: p.id, name: p.name, head: hd, mouth: hd.clone().add({ x: 0, y: -0.08, z: 0 }), fwd: p.avatar.fwd() }); }
    return list;
  }
  pickTarget(c) {
    // players only (the squad never go for Tommy or each other), taking turns so everyone gets attacked: whoever's
    // gone longest without one is next
    const t = this.targets(); this.lastHit = this.lastHit || new Map();
    t.sort((a, b) => (this.lastHit.get(a.id || 'host') || 0) - (this.lastHit.get(b.id || 'host') || 0) + (Math.random() - 0.5) * 0.001);
    const pick = t[0]; this.lastHit.set(pick.id || 'host', performance.now());
    c.mpTarget = pick.id ? pick : null;
    const label = pick.id ? pick.name : (this.net.name || 'the host');
    this.net.send({ t: 'coming', who: c.id, target: pick.id, name: label });
    this.fx && this.fx.coming(c, pick.id ? label : null);
    return pick;
  }
  ctxFor(c, ctx) {
    const t = c.mpTarget; if (!t || !t.id) return ctx;
    const p = this.net.players.get(t.id); if (!p || !p.avatar) { c.mpTarget = null; return ctx; }
    const hd = p.avatar.headPos();
    return { head: hd, fwd: p.avatar.fwd(), mouth: hd.clone().add({ x: 0, y: -0.08, z: 0 }), player: ctx.player, handPos: () => p.avatar.handPos(), attachPoint: () => null };
  }
  // the attack lands: on whoever it's aimed at
  sendStun(who, key) { const t = who.mpTarget; if (!t || !t.id) return false; this.net.send({ t: 'stun', to: t.id, who: who.id, key }); return true; }
  on_stun(m) { const c = this.cast.find(x => x.id === m.who) || this.tommy; this.director.stun(c, m.key, true); }
  on_announce(m) { if (this.host) return; this.director.showAnnounce && this.director.showAnnounce(this.cast.find(x => x.id === m.who) || { id: m.who, name: (SQUAD[m.who] || {}).name || m.who }, m.key, m.targetId && m.targetId === this.net.id ? null : m.target); }
  on_coming(m) { if (this.host) return; const c = this.cast.find(x => x.id === m.who); if (!c) return; const mine = m.target === this.net.id; this.fx && this.fx.coming(c, mine ? null : m.name); }

  // ------------------------------------------------------------------ getting hit by food, punching each other
  on_hitby(m) {
    const P = this.player; sfx('splat', P.head, 1);
    this.words.show(m.veg ? 'BLEURGH!' : 'SPLAT!', P.head.clone().addScaledVector(P.fwd, 0.6), m.veg ? '#7cff6a' : '#ff9a36', 0.14, 1);
    P.rig.position.x += (m.v[0] || 0) * 0.03; P.rig.position.z += (m.v[1] || 0) * 0.03;
  }
  // VR: a fast swing into someone's head or body; phone: a tap on them (see main.js) — you can't grab or throw players
  punches() {
    if (this.punchCool > 0 || this.noPunch) return;
    const P = this.player;
    for (const h of P.hands || []) { if (!h.tracked || h.held || h.speed < 1.8) continue;
      for (const p of this.net.players.values()) { const av = p.avatar; if (!av) continue; const hd = av.headPos();
        if (h.palm.distanceTo(hd) < 0.22 || h.palm.distanceTo(_v.copy(hd).add({ x: 0, y: -0.45, z: 0 })) < 0.32) { this.punch(p, h.vel, h.palm); return; } } }
  }
  punch(p, vel, at) {
    if (this.noPunch) return;
    this.punchCool = 0.5;
    // (sent to everyone: the one who got hit falls over on their own screen, everyone else sees them go flying)
    this.net.send({ t: 'punch', side: vel.side || 'R', target: p.id, v: [q2(vel.x), q2(vel.z)], s: q2(vel.length()), at: [q2(at.x), q2(at.y), q2(at.z)] });
    sfx('punch', at, 1); this.sfxOut('thwack', at, 1); this.words.show(vel.length() > 3.5 ? 'KAPOW!' : 'POW!', at.clone().add({ x: 0, y: 0.25, z: 0 }), '#ff5a36', 0.2, 1);
    this.knockAvatar(p, vel, vel.length(), at);
  }
  knockAvatar(p, v, s, at) { const av = p && p.avatar; if (!av) return; if (av.knock) av.knock(v, s, at); else av.flinch && av.flinch(v); }
  on_punch(m, from) {
    const v = new THREE.Vector3(m.v[0] || 0, 0, m.v[1] || 0);
    if (from && from.avatar && from.avatar.swing) from.avatar.swing(m.side || 'R');          // the puncher throws the punch
    if (m.target && m.target !== this.net.id) { this.knockAvatar(this.net.players.get(m.target), v, m.s || 3, m.at && new THREE.Vector3(...m.at)); return; }
    const P = this.player, s = m.s || 3, d = { x: m.v[0] || 0, z: m.v[1] || 0 };
    sfx('punch', P.head, 1); this.words.show('OOF!', P.head.clone().addScaledVector(P.fwd, 0.5), '#ff5a36', 0.16, 1);
    if (s > 3.2 && P.knockDown) P.knockDown(d, 2.4);
    else { const l = Math.hypot(d.x, d.z) || 1; P.rig.position.x += d.x / l * 0.25; P.rig.position.z += d.z / l * 0.25; P.effect && P.effect('dizzy', 1.2); }
  }
}
