// MULTIPLAYER, step 1: room codes and seeing each other.
// Everyone in a room connects to the relay (server/worker.js on Cloudflare). Each player sends where their head and
// hands are (and how big they've got) about 15 times a second; everyone else draws them as a Ronnie: his scanned
// head and shoulders, a body that fills out as he eats, arms reaching to where his hands are, legs that walk when he
// moves, and a name tag. The host is whoever started the room; joiners are sent to the same place and game.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const RELAY = 'wss://ronnie-mp12.ronnie-sim.workers.dev';      // (the 12-player room server; the old 6-player one is ronnie-mp)
const SEND_HZ = 20;                  // where you are, up to 20 times a second (only when it's changed; once a second regardless)
// this device's player ID: kept, so dropping out and coming back to the same room makes you the same player again
export const devicePid = () => { try { let p = localStorage.getItem('rs_pid'); if (!p || !/^[a-z0-9]{8,12}$/.test(p)) { p = Array.from({ length: 10 }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join(''); localStorage.setItem('rs_pid', p); } return p; } catch (e) { return null; } };
// how bent each finger is (0 straight .. 9 curled), thumb first, from a tracked hand's joints: 5 characters a hand
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
function fingerCurls(hand) {
  const J = hand && hand.joints; if (!J || !J['index-finger-tip']) return null; let s = '';
  for (const f of ['thumb', 'index-finger', 'middle-finger', 'ring-finger', 'pinky-finger']) {
    const m = J[f + '-metacarpal'], p = J[f + '-phalanx-proximal'], t = J[f + '-tip']; if (!m || !p || !t) { s += '0'; continue; }
    m.getWorldPosition(_a); p.getWorldPosition(_b); t.getWorldPosition(_c); const u = _b.clone().sub(_a).normalize(), v = _c.sub(_b).normalize();
    s += Math.max(0, Math.min(9, Math.round(Math.acos(Math.max(-1, Math.min(1, u.dot(v)))) / 1.7 * 9))); }
  return s;
}
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const newCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

export { RemoteRonnie };
// every message from the room is checked before the game sees it. Messages only come from other copies of this game,
// but an older version, a bug, or someone messing about could send anything: a number where a list goes, a huge list,
// null in a position. Those made the game throw, or put people and things at impossible positions that then spread
// through the physics. A message that isn't sensible is simply dropped.
const POSE_VEC = { h: 3, l: 3, rh: 3, q: 4 };
// what each kind of message must carry (a field ending ! is required): positions are real numbers in lists of the right
// length; lists of things (held food, the host's snapshot) have numbers where the game does sums with them
const nums = (a, from, to) => { for (let i = from; i < Math.min(to, a.length); i++) if (a[i] !== undefined && a[i] !== null && typeof a[i] !== 'number') return false; for (let i = from; i < Math.min(to, a.length); i++) if (a[i] === null) return false; return true; };
const T = {
  v2: (x) => Array.isArray(x) && x.length === 2 && x.every(n => typeof n === 'number' && Math.abs(n) < 1e5),
  v3: (x) => Array.isArray(x) && x.length === 3 && x.every(n => typeof n === 'number' && Math.abs(n) < 1e5),
  v4: (x) => Array.isArray(x) && x.length === 4 && x.every(n => typeof n === 'number' && Math.abs(n) < 1e5),
  num: (x) => typeof x === 'number', str: (x) => typeof x === 'string', id: (x) => typeof x === 'string' || typeof x === 'number',
  arr: (x) => Array.isArray(x), obj: (x) => !!x && typeof x === 'object' && !Array.isArray(x),
  holds: (x) => Array.isArray(x) && x.every(e => Array.isArray(e) && e.length >= 4 && nums(e, 1, 11)),
  chars: (x) => Array.isArray(x) && x.every(a => Array.isArray(a) && a.length >= 2 && nums(a, 2, a.length)),
  items: (x) => Array.isArray(x) && x.every(r => Array.isArray(r) && r.length >= 11 && nums(r, 3, 11)),
};
const SCHEMA = {
  p: { 'h!': 'v3', 'q!': 'v4', 'l!': 'v3', 'rh!': 'v3', s: 'num', st: 'num', ts: 'num', c: 'str' },      // (a pose: where their head and both hands are, always all four)
  hitby: { 'v!': 'v2' }, hitc: { 'id!': 'id', 'p!': 'v3', 'v!': 'v3', part: 'str' }, punch: { 'v!': 'v2', at: 'v3', s: 'num', target: 'id', side: 'str' },
  rgrab: { 'side!': 'str', ph: 'str', p: 'v3', v: 'v3', id: 'id', part: 'str' }, throw: { 'nid!': 'id', 'p!': 'v3', 'v!': 'v3' }, rel: { 'nid!': 'id', 'p!': 'v3', q: 'v4' },
  hold: { 'h!': 'holds' }, snap: { 'c!': 'chars', 'i!': 'items' }, sfx: { 'n!': 'str', 'p!': 'v3', v: 'num' }, pu: { 'p!': 'v3' }, bite: { 'nid!': 'id', left: 'num' },
  wake: { 'i!': 'num' }, woke: { 'i!': 'num' }, dir: { left: 'num', mode: 'str', hud: 'str' }, swing: { s: 'str' }, music: { vol: 'num', pos: 'num' }, tv: { vol: 'num', pos: 'num' },
  save: { 'd!': 'obj' }, emote: { 'e!': 'str' }, char: { 'c!': 'str' }, chat: { 's!': 'str' }, say: { 'text!': 'str' }, stun: { who: 'id' }, coming: { who: 'id' }, setup: { place: 'str', mode: 'str' },
  songpart: { i: 'num', n: 'num', d: 'str' }, vidpart: { i: 'num', n: 'num', d: 'str' }, own: { 'nid!': 'id', id: 'id' }, grab: { 'nid!': 'id' }, gone: { 'nid!': 'id' }, end: { lines: 'arr' },
  welcome: { players: 'arr' }, join: { 'id!': 'id' }, leave: { 'id!': 'id' }, host: { 'id!': 'id' },
  // BOSS FIGHT (boss.js): the host's word on the boss, its moves, a joiner's hit on it, a joiner's hearts
  bossS: { 'b!': 'str', 'hp!': 'num', 'mx!': 'num', ph: 'num', st: 'str', a: 'str', at: 'num', x: 'num', z: 'num', y: 'num', s: 'num', dy: 'num', mi: 'arr', tm: 'num', o: 'num' },
  bossA: { 'k!': 'str', x: 'num', y: 'num', z: 'num', x0: 'num', y0: 'num', z0: 'num', x1: 'num', z1: 'num', r: 'num', r0: 'num', d: 'num', w: 'num', f: 'num', ph: 'num', s: 'str', a: 'str', it: 'str', ids: 'arr' },
  bossHit: { 'd!': 'num', p: 'v3', w: 'num' }, bossP: { hp: 'num', kd: 'num', mk: 'str' },
  // IAN'S BARBECUE (bbqmode.js): the host's word on Ian, "he's caught you", and how the shoving match went
  bbqS: { ph: 'str', n: 'num', ko: 'num', h: 'num', nd: 'num', gu: 'num', tg: 'str', tn: 'str', f: 'str', at: 'num' }, bbqF: { f: 'str' }, bbqR: { w: 'num', st: 'num' },
  wx: { w: 'str', a: 'num', tm: 'num', c: 'str', ds: 'num' },
  rcheck: { 'k!': 'str', 'mode!': 'str' }, rready: { 'k!': 'str', r: 'num' }, rstat: { 'k!': 'str', ready: 'arr' }, rdone: { 'k!': 'str' }, warm: { 'mode!': 'str' },      // (the READY CHECK before a room's new game: readycheck.js)      // (the host's weather and time of day: weather.js)
  // PROP HUNT (prophunt.js)
  phChk: { v: 'str', p: 'v3' }, phProp: { 'k!': 'str', id: 'id' }, phLock: { p: 'v2', y: 'num' }, phTaunt: { i: 'num' }, phLobby: { n: 'num' },
  phRound: { 'list!': 'arr', 'seek!': 'arr', hide: 'arr', lay: 'arr', r: 'num', of: 'num', ht: 'num', st: 'num', tot: 'obj' }, phGo: { st: 'num' }, phClock: { ph: 'str', left: 'num' },
  phFound: { 'v!': 'id', 'by!': 'id', p: 'v3', k: 'str', hp: 'num' }, phMiss: { 'by!': 'id', hp: 'num', d: 'num' }, phHit: { 'v!': 'id', 'by!': 'id', hp: 'num', p: 'v3' }, phHp: { 'id!': 'id', hp: 'num' }, phShot: { 'a!': 'v3', 'b!': 'v3', h: 'num' }, phOut: { 'id!': 'id', secs: 'num' }, phBack: { 'id!': 'id', hp: 'num' },
  phPts: { 'id!': 'id', d: 'num', why: 'str' }, phAuto: { 'id!': 'id', i: 'num' }, phEnd: { tot: 'obj', rp: 'obj', alive: 'arr', stats: 'obj', why: 'str', win: 'str' }, phOver: { tot: 'obj', aw: 'arr', stats: 'obj' },
  phState: { round: 'obj', ph: 'str', left: 'num', kinds: 'obj', locks: 'obj', found: 'arr', hp: 'obj', tot: 'obj' },
};
function okMessage(m) {
  if (!m || typeof m !== 'object' || Array.isArray(m) || typeof m.t !== 'string' || !m.t || m.t.length > 24) return false;
  let budget = 30000;
  const ok = (v, depth) => {
    if (--budget < 0 || depth > 8) return false;
    if (v === null || typeof v === 'boolean') return true;
    if (typeof v === 'number') return Number.isFinite(v) && Math.abs(v) < 1e13;
    if (typeof v === 'string') return v.length <= 70000;      // (a song shared between players comes in chunks of text)
    if (Array.isArray(v)) { if (v.length > 5000) return false; for (const x of v) if (!ok(x, depth + 1)) return false; return true; }
    if (typeof v === 'object') { for (const k of Object.keys(v)) { if (k === '__proto__' || k === 'constructor' || k === 'prototype' || !ok(v[k], depth + 1)) return false; } return true; }
    return false;
  };
  if (!ok(m, 0)) return false;
  for (const k of ['f', 'id', 'to', 'target']) if (m[k] != null && typeof m[k] !== 'string' && typeof m[k] !== 'number') return false;
  const sc = SCHEMA[m.t]; if (sc) for (const key in sc) { const req = key.endsWith('!'), k = req ? key.slice(0, -1) : key; if (m[k] === undefined || m[k] === null) { if (req) return false; continue; } if (!T[sc[key]](m[k])) return false; }
  if (m.t === 'p') for (const k in POSE_VEC) if (k in m && !(Array.isArray(m[k]) && m[k].length === POSE_VEC[k] && m[k].every(x => typeof x === 'number' && Math.abs(x) < 1e4))) return false;      // (where someone's head and hands are: three real numbers each, a sensible size)
  return true;
}
export { okMessage };

export class Net {
  constructor() { this.ws = null; this.id = null; this.host = false; this.players = new Map(); this.on = {}; this.code = null; this.sendT = 0; this.status = 'off'; this.rtt = 0; this.lastSent = ''; this.lastSentAt = 0; this.max = 12; }
  get connected() { return this.ws && this.ws.readyState === 1; }
  connect(code, name, relay = RELAY) {
    this.code = code.toUpperCase(); this.name = name; this.relay = relay; this.wanted = true; this.tries = 0; this.status = 'connecting';
    if (!this.visHooked) { this.visHooked = true;      // (back from the background on a phone: check the line straight away)
      document.addEventListener('visibilitychange', () => { if (document.hidden) return; const t = performance.now();
        setTimeout(() => { if (this.wanted && this.id && this.status === 'on' && (!this.connected || (this.lastMsg || 0) < t)) { this.tries = 0; this.lost(true); } }, 1500); }); }      // (nothing at all in the 1.5s since: the line died while we were away)
    clearInterval(this.ping); this.ping = setInterval(() => {      // every 2s: the ping display, and a check the line's still alive
      const now = performance.now(), stalled = now - (this.lastTick || now) > 3500; this.lastTick = now;
      if (stalled) this.lastMsg = Math.max(this.lastMsg || 0, now - 2000);      // (this page was frozen, e.g. loading a level: that silence was ours, not the line's)
      if (this.connected) { this.ws.send(JSON.stringify({ t: 'ping', c: Math.round(now) }));
        if (this.id && this.status === 'on' && now - (this.lastMsg || 0) > 7000) this.lost(true); } }, 2000);
    this.open();
    return new Promise((res, rej) => { this.on.welcome = res; this.on.welcomeFail = rej; setTimeout(() => this.status === 'connecting' && rej(new Error('timeout')), 8000); });
  }
  open() {
    const pid = devicePid(); const ws = this.ws = new WebSocket(`${this.relay}/room/${this.code}?name=${encodeURIComponent(this.name)}${pid ? '&pid=' + pid : ''}`);
    ws.onmessage = (ev) => { if (this.ws !== ws) return; this.lastMsg = performance.now(); let m; try { m = JSON.parse(ev.data); } catch (e) { return; } this.handle(m); };
    ws.onclose = () => { if (this.ws !== ws) return;
      if (this.status === 'connecting') { if (this.on.welcomeFail) this.on.welcomeFail(new Error('The room is full (12 players) or couldn\'t be reached')); this.wanted = false; this.off(); return; }
      if (this.wanted && this.id) { this.lost(); return; }      // dropped out mid-game (Wi-Fi to 4G, a tunnel, the phone slept): get back in
      this.off(); };
    ws.onerror = () => { if (this.ws !== ws) return; this.emit('status', 'error'); };
  }
  // the connection's gone: keep trying to get back in as the same player (the room hands everything back), quicker at
  // first; everyone else stays where they were meanwhile. Gives up after about three minutes
  lost(now = false) {
    if (!this.wanted) return;
    // (a line that still looks open is left for the room to swap out when we're back: closing it first would tell the
    // room we'd gone, and hosting would move on for nothing)
    const w = this.ws; this.ws = null; if (w) { w.onclose = w.onmessage = w.onerror = null; if (w.readyState <= 1) (this.stale || (this.stale = [])).push(w); }
    if (this.status !== 'reconnecting') { this.status = 'reconnecting'; this.lostAt = performance.now(); this.drops = (this.drops || 0) + 1; this.emit('status', 'reconnecting'); }
    if (performance.now() - this.lostAt > 180000) { this.wanted = false; this.off(); return; }
    const wait = now ? 0 : [250, 600, 1200, 2000, 3000, 4000][Math.min(this.tries, 5)]; this.tries++;
    clearTimeout(this.retryT); this.retryT = setTimeout(() => { if (this.wanted && this.status === 'reconnecting') this.open(); }, wait);
  }
  off() { this.status = 'off'; this.emit('status', 'disconnected'); for (const id of [...this.players.keys()]) this.drop(id); }
  leave() { for (const o of this.stale || []) try { o.close(); } catch (e) {} this.stale = []; this.wanted = false; clearTimeout(this.retryT); clearInterval(this.ping); if (this.ws) { const w = this.ws; this.ws = null; try { w.close(); } catch (e) {} } for (const id of [...this.players.keys()]) this.drop(id); this.status = 'off'; }
  send(m) { if (this.connected) this.ws.send(JSON.stringify(m)); }
  // (one message that trips a bug mustn't take the game down: it's caught, reported once, and the game carries on)
  emit(k, ...a) { const f = this.on[k]; if (!f) return; try { f(...a); } catch (e) { const n = (this.emitErrs = this.emitErrs || {}); if (!n[k]) { n[k] = 1; try { window.__crash && window.__crash('caught', e, { where: 'net ' + String(k).slice(0, 16) }); } catch (e2) {} } } }
  handle(m) {
    if (!okMessage(m)) { this.badMsgs = (this.badMsgs || 0) + 1; return; }      // (see okMessage: anything malformed is dropped at the door)
    try { this.handle1(m); } catch (e) { const n = (this.emitErrs = this.emitErrs || {}); if (!n['@' + m.t]) { n['@' + m.t] = 1; try { window.__crash && window.__crash('caught', e, { where: 'net handle ' + m.t.slice(0, 16) }); } catch (e2) {} } }
  }
  handle1(m) {
    switch (m.t) {
      case 'welcome': { const again = this.status === 'reconnecting', wasHost = this.host; this.id = m.id; this.host = m.host; this.hostId = m.hostId || (m.host ? m.id : null); this.hostName = m.hostName || ''; this.orig = m.orig || null; this.saved = m.saved || null; this.back = !!m.back; this.max = m.max || this.max; this.status = 'on'; this.tries = 0; for (const o of this.stale || []) try { o.close(); } catch (e) {} this.stale = [];
        const listed = new Set(m.players.map(p => p.id));
        for (const id of [...this.players.keys()]) if (!listed.has(id)) this.drop(id);      // (anyone who left while we were away)
        for (const p of m.players) { const o = this.players.get(p.id); if (o) Object.assign(o, { name: p.name, host: p.host, char: p.char || o.char }); else this.players.set(p.id, { id: p.id, name: p.name, host: p.host, char: p.char || undefined }); }
        this.emit('welcome', m); this.emit('status', 'connected');
        if (again && wasHost !== this.host) this.emit('host', { id: this.hostId, name: this.hostName, why: 'back' }, wasHost);      // (hosting moved on while we were gone, or came to us)
        break; }
      case 'join': { const o = this.players.get(m.id); if (o) o.name = m.name; else this.players.set(m.id, { id: m.id, name: m.name }); this.emit('join', m); break; }      // (the same player back again keeps their Ronnie: no second copy left standing)
      case 'leave': this.drop(m.id); this.emit('leave', m); break;
      case 'host': { const was = this.host; this.host = m.id === this.id; this.hostId = m.id; this.hostName = m.name || ''; for (const p of this.players.values()) p.host = p.id === m.id; this.emit('host', m, was); break; }
      case 'pong': if (m.c) { const r = performance.now() - m.c; this.rtt = this.rtt ? this.rtt * 0.7 + r * 0.3 : r; } break;
      default: { if (m.f && m.f !== this.id && !this.players.has(m.f) && this.status === 'on') { this.players.set(m.f, { id: m.f, name: m.name || '' }); this.emit('join', { id: m.f, name: m.name || '', quiet: true }); }      // (someone we missed coming in, e.g. while we were reconnecting: they're plainly here, so they're seen)
        const p = this.players.get(m.f); if (m.t === 'p' && p) pushPose(p, m, performance.now()); this.emit(m.t, m, p); }
    }
  }
  drop(id) { const p = this.players.get(id); if (p && p.avatar) p.avatar.dispose(); this.players.delete(id); }

  // every frame: send where I am (a few times a second), move everyone else's Ronnie
  update(dt, player, G, scene) {
    if (!this.connected) return;
    if ((this.sendT -= dt) <= 0) {
      this.sendT += 1 / SEND_HZ; if (this.sendT < 0) this.sendT = 1 / SEND_HZ;
      const P = player, q = P.camera.getWorldQuaternion(new THREE.Quaternion()), r = (v) => Math.round(v * 1000) / 1000;
      // [right, left] by which hand each controller really is (the controllers' own order isn't fixed: on a Quest the
      // first one is often the left, which made everyone else see your arms crossed)
      const side = (k) => P.hands.find(h => h.handedness === k && h.tracked) || null, R0 = side('right'), L0 = side('left');
      const hands = P.flatMode ? [P.flatAnchorPos(), P.head] : [(R0 || P.hands[0]).palm, (L0 || P.hands.find(h => h !== R0) || P.hands[1]).palm];
      const r2 = (v) => Math.round(v * 100) / 100;      // (head and hands to the millimetre, which way you're looking to 1/100)
      const m = { t: 'p', c: this.char || 'ronnie', h: [r(P.head.x), r(P.head.y), r(P.head.z)], q: [r2(q.x), r2(q.y), r2(q.z), r2(q.w)], l: [r(hands[1].x), r(hands[1].y), r(hands[1].z)], rh: [r(hands[0].x), r(hands[0].y), r(hands[0].z)], s: r(P.scale), st: G.stage, flat: P.flatMode ? 1 : 0 };
      // (watching your own emote from out front in VR: everyone else still sees you where you were standing)
      const H = P.vrEmoteHold; if (H) { m.h = H.h.map(r); m.q = H.q.map(r2); m.l = H.l.map(r); m.rh = H.rh.map(r); m.flat = 0; }
      // hand tracking (only if you're actually using it): how bent each finger is, 10 characters for both hands. (Called
      // fc: the room marks every message with who sent it as f, which would overwrite it and lose where you are)
      if (!P.flatMode && (R0 && R0.isHand || L0 && L0.isHand)) m.fc = (R0 && R0.isHand && fingerCurls(R0.hand) || '-----') + (L0 && L0.isHand && fingerCurls(L0.hand) || '-----');
      // only what's changed: nothing new, nothing sent (but once a second anyway, so nobody thinks you've gone). When you
      // stop, it's sent once more unchanged: two the same tell everyone you've stopped (from just the one, they couldn't tell
      // stopping from a late update, carried you on for a moment, then pulled you back)
      const key = JSON.stringify(m), now = performance.now(), changed = key !== this.lastSent;
      if (changed || this.moved || now - this.lastSentAt > 1000) { this.moved = changed; this.lastSent = key; this.lastSentAt = now; m.ts = Math.round(now); this.send(m); this.sentN = (this.sentN || 0) + 1; }
    }
    for (const p of this.players.values()) {
      if (!p.pose) continue;
      if (p.pose.c && !p.char) p.char = p.pose.c;
      if (!p.avatar) p.avatar = (this.makeAvatar && this.makeAvatar(p)) || new RemoteRonnie(scene, p.name);
      p.avatar.update(dt, p.pose);
    }
  }
}

// a pose that's come in from someone: kept with when it came, for their avatar to play back smoothly (main.js smoothPose).
// The last few seconds are kept (not just the last 16: after a phone network's hiccup, a burst of poses pushed out the
// one being played and they jumped half a metre)
export function pushPose(p, m, now) {
  p.pose = m; p.at = now; const b = p.buf || (p.buf = []); b.push({ t: now, ts: typeof m.ts === 'number' ? m.ts : null, m });
  // (never one the avatar's still playing from: p.keepFrom, set by smoothPose. A burst that came in together, after a
  // hiccup, got old together and went all at once, the pose being played with it)
  while (b.length > 200 || (b.length > 4 && now - b[0].t > 4000 && (p.keepFrom == null || b[0].ts == null || b[0].ts < p.keepFrom))) b.shift();
}

// ---- someone else's Ronnie
let headProto = null;
function loadHead() {
  if (headProto) return headProto;
  headProto = new GLTFLoader().loadAsync('./assets/ronnie_head.glb').then((g) => {
    let src = null; g.scene.traverse(o => { if (!src && o.isMesh) src = o; });
    src.updateWorldMatrix(true, false);
    const geo = src.geometry.clone().applyMatrix4(src.matrixWorld); geo.computeBoundingBox();
    const bb = geo.boundingBox, h = bb.max.y - bb.min.y, k = 0.62 / h;     // head and shoulders, 62cm tall
    geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.max.y, -(bb.min.z + bb.max.z) / 2); geo.scale(k, k, k);   // top of the head at y = 0
    const m = src.material; if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
    return { geo, mat: new THREE.MeshStandardMaterial({ map: m.map || null, roughness: 0.75, metalness: 0 }) };
  });
  return headProto;
}
const SHIRT = 0xe8e0d0, SKIN = 0xf0c0a0, SHORTS = 0x2a3a5a;
class RemoteRonnie {
  constructor(scene, name) {
    this.scene = scene; this.g = new THREE.Group(); this.g.userData.remoteRonnie = true; scene.add(this.g);
    this.pos = new THREE.Vector3(); this.q = new THREE.Quaternion(); this.yaw = 0; this.lh = new THREE.Vector3(); this.rh = new THREE.Vector3(); this.first = true; this.walk = 0;
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
    this.headG = new THREE.Group(); this.g.add(this.headG);
    loadHead().then(({ geo, mat: m }) => { if (this.gone) return; const mesh = new THREE.Mesh(geo, m); mesh.position.y = 0.13; mesh.rotation.y = Math.PI; this.headG.add(mesh); });
    this.body = new THREE.Group(); this.g.add(this.body);
    this.belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.32, 8, 18), mat(SHIRT)); this.body.add(this.belly);
    this.hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.08, 6, 14), mat(SHORTS)); this.body.add(this.hips);
    this.legs = [0, 1].map(() => { const g = new THREE.Group(); const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.32, 6, 10), mat(SHORTS)); thigh.position.y = -0.2; g.add(thigh);
      const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.34, 6, 10), mat(SKIN)); shin.position.y = -0.62; g.add(shin);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.26), mat(0xf4f4f4)); shoe.position.set(0, -0.84, 0.05); g.add(shoe); this.body.add(g); return g; });
    this.arms = [0, 1].map(() => { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1, 8), mat(SKIN)); a.geometry.translate(0, 0.5, 0); a.geometry.rotateX(Math.PI / 2); this.g.add(a);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), mat(SKIN)); hand.scale.set(1, 0.7, 1.3); this.g.add(hand); return { a, hand }; });
    // name tag
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
    x.fillStyle = 'rgba(10,14,30,0.8)'; x.beginPath(); x.roundRect(2, 2, 252, 60, 18); x.fill(); x.fillStyle = '#ffd400'; x.font = '900 34px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name.toUpperCase(), 128, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); this.tag.scale.set(0.5, 0.125, 1); this.tag.renderOrder = 12; this.g.add(this.tag);
  }
  update(dt, p) {
    const k = this.first ? 1 : Math.min(1, dt * 12); this.first = false;
    const prev = this.pos.clone();
    this.pos.lerp(new THREE.Vector3(...p.h), k); this.q.slerp(new THREE.Quaternion(...p.q), k);
    this.lh.lerp(new THREE.Vector3(...p.l), k); this.rh.lerp(new THREE.Vector3(...p.rh), k);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.q); const yaw = Math.atan2(fwd.x, fwd.z);
    let dy = yaw - this.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; this.yaw += dy * Math.min(1, dt * 6);
    const s = p.s || 1, fat = 1 + (p.st || 0) * 0.28;
    this.headG.position.copy(this.pos); this.headG.quaternion.copy(this.q); this.headG.scale.setScalar(s);
    // the body hangs under the head, facing where he's facing; fatter as he goes up the stages
    const floor = this.pos.y - 1.6 * s;
    this.body.position.set(this.pos.x, this.pos.y - 0.68 * s, this.pos.z); this.body.rotation.y = this.yaw; this.body.scale.setScalar(s);
    this.belly.scale.set(fat * 1.05, 1, fat * 1.25); this.belly.position.set(0, -0.08, 0.04 * fat);
    this.hips.position.y = -0.38; this.hips.scale.set(fat * 0.95, 1, fat);
    const moved = Math.hypot(this.pos.x - prev.x, this.pos.z - prev.z) / Math.max(dt, 1e-3);
    this.walk += dt * Math.min(moved, 3) * 4.2; const sw = moved > 0.15 ? Math.sin(this.walk) * 0.5 : 0;
    this.legs.forEach((g, i) => { g.position.set((i ? 0.1 : -0.1) * fat, -0.45, 0); g.rotation.x = i ? sw : -sw; });
    // arms from the shoulders to the hands
    this.arms.forEach(({ a, hand }, i) => {
      const sh = new THREE.Vector3((i ? -0.2 : 0.2) * fat * s, -0.3 * s, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw).add(this.pos);
      let tip = i ? this.rh : this.lh;
      if (p.flat && i === 1) tip = sh.clone().add(new THREE.Vector3(0, -0.6 * s, 0.05 * s).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw));   // phone players: the spare arm hangs down
      const d = tip.distanceTo(sh), L = Math.min(d, 0.75 * s);
      const end = sh.clone().add(tip.clone().sub(sh).normalize().multiplyScalar(L));
      a.position.copy(sh); a.lookAt(end); a.scale.set(s, s, L); hand.position.copy(end); hand.quaternion.copy(a.quaternion); hand.scale.set(s, 0.7 * s, 1.3 * s);
    });
    this.tag.position.set(this.pos.x, this.pos.y + 0.32 * s, this.pos.z);
    // knocked over: the whole body topples away from the punch (pivoting at the feet), lies there, then gets back up
    if (this.downT > 0) { this.downT -= dt; const t = 2.4 - this.downT, a = t < 0.35 ? (t / 0.35) * (Math.PI / 2) : this.downT < 0.6 ? Math.max(0, this.downT / 0.6) * (Math.PI / 2) : Math.PI / 2;
      const foot = new THREE.Vector3(this.pos.x, floor, this.pos.z), Q = new THREE.Quaternion().setFromAxisAngle(this.downAxis, a);
      this.g.quaternion.copy(Q); this.g.position.copy(foot).sub(foot.clone().applyQuaternion(Q)); }
    else if (this.g.position.lengthSq() > 0) { this.g.quaternion.identity(); this.g.position.set(0, 0, 0); }
  }
  knock(v, s) { if (s <= 3.2 || this.downT > 0) return; const d = new THREE.Vector3(v.x, 0, v.z); if (d.lengthSq() < 1e-6) d.set(0, 0, 1); d.normalize(); this.downAxis = new THREE.Vector3(d.z, 0, -d.x); this.downT = 2.4; }
  dispose() { this.gone = true; this.scene.remove(this.g); }
  headPos() { return this.pos.clone(); }
  fwd() { return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  handPos() { return this.rh.clone(); }
  flinch() { this.g.position.x += 0; }
}
