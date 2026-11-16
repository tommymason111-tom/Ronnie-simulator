// MULTIPLAYER, step 1: room codes and seeing each other.
// Everyone in a room connects to the relay (server/worker.js on Cloudflare). Each player sends where their head and
// hands are (and how big they've got) about 15 times a second; everyone else draws them as a Ronnie: his scanned
// head and shoulders, a body that fills out as he eats, arms reaching to where his hands are, legs that walk when he
// moves, and a name tag. The host is whoever started the room; joiners are sent to the same place and game.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const RELAY = 'wss://ronnie-mp.ronnie-sim.workers.dev';
const SEND_HZ = 15;
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const newCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

export { RemoteRonnie };
export class Net {
  constructor() { this.ws = null; this.id = null; this.host = false; this.players = new Map(); this.on = {}; this.code = null; this.sendT = 0; this.status = 'off'; }
  get connected() { return this.ws && this.ws.readyState === 1; }
  connect(code, name, relay = RELAY) {
    this.code = code.toUpperCase(); this.name = name; this.relay = relay; this.wanted = true; this.status = 'connecting';
    this.open();
    clearInterval(this.ping); this.ping = setInterval(() => this.connected && this.ws.send('{"t":"ping"}'), 20000);
    return new Promise((res, rej) => { this.on.welcome = res; setTimeout(() => this.status === 'connecting' && rej(new Error('timeout')), 8000); });
  }
  open() {
    const ws = this.ws = new WebSocket(`${this.relay}/room/${this.code}?name=${encodeURIComponent(this.name)}`);
    ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } this.handle(m); };
    ws.onclose = () => { if (this.ws !== ws) return; const was = this.status; this.status = 'off'; for (const id of [...this.players.keys()]) this.drop(id);
      // dropped out without meaning to (a phone off the Wi-Fi onto 4G, a tunnel, a blip): straight back into the same room
      // and the same game, as the same name and character, trying again every few seconds for up to 3 minutes
      if (this.wanted && (was === 'on' || this.retryT)) { this.retry(); this.emit('status', 'reconnecting'); } else this.emit('status', 'disconnected'); };
    ws.onerror = () => { if (!this.retryT) { this.status = 'off'; this.emit('status', 'error'); } };
  }
  retry() {
    if (!this.retryT) this.retryT = performance.now();
    if (performance.now() - this.retryT > 180000) { this.retryT = 0; this.wanted = false; this.emit('status', 'disconnected'); return; }
    this.tries = (this.tries || 0) + 1; clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => { if (!this.wanted || this.connected) return; this.status = 'reconnecting'; this.open(); }, Math.min(5000, 400 * 2 ** Math.min(4, this.tries - 1)));
  }
  leave() { this.wanted = false; this.retryT = 0; clearTimeout(this.retryTimer); clearInterval(this.ping); if (this.ws) { const w = this.ws; this.ws = null; try { w.close(); } catch (e) {} } for (const id of [...this.players.keys()]) this.drop(id); this.status = 'off'; }
  send(m) { if (this.connected) this.ws.send(JSON.stringify(m)); }
  emit(k, ...a) { const f = this.on[k]; f && f(...a); }
  handle(m) {
    switch (m.t) {
      case 'welcome': { const back = !!this.retryT; this.retryT = 0; this.tries = 0; this.id = m.id; this.host = m.host; this.status = 'on'; for (const p of m.players) this.players.set(p.id, { id: p.id, name: p.name, host: p.host });
        if (back) { this.send({ t: 'hi', name: this.name, char: this.char, v: window.GAME_BUILD }); this.emit('rejoined', m); }      // (back in: tell everyone who we are again)
        else this.emit('welcome', m);
        this.emit('status', 'connected'); break; }
      case 'join': this.players.set(m.id, { id: m.id, name: m.name }); this.emit('join', m); break;
      case 'leave': this.drop(m.id); this.emit('leave', m); break;
      case 'host': if (m.id === this.id) this.host = true; for (const p of this.players.values()) p.host = p.id === m.id; this.emit('host', m); break;
      case 'pong': break;
      default: { const p = this.players.get(m.f); if (m.t === 'p' && p) { p.pose = m; p.at = performance.now(); (p.buf || (p.buf = [])).push({ t: p.at, ts: typeof m.ts === 'number' ? m.ts : null, m }); if (p.buf.length > 16) p.buf.shift(); } this.emit(m.t, m, p); }
    }
  }
  drop(id) { const p = this.players.get(id); if (p && p.avatar) p.avatar.dispose(); this.players.delete(id); }

  // every frame: send where I am (a few times a second), move everyone else's Ronnie
  update(dt, player, G, scene) {
    if (!this.connected) return;
    if ((this.sendT -= dt) <= 0) {
      this.sendT = 1 / SEND_HZ;
      const P = player, q = P.camera.getWorldQuaternion(new THREE.Quaternion()), r = (v) => Math.round(v * 1000) / 1000;
      // [right, left] by which hand each controller really is (the controllers' own order isn't fixed: on a Quest the
      // first one is often the left, which made everyone else see your arms crossed)
      const side = (k) => P.hands.find(h => h.handedness === k && h.tracked) || null, R0 = side('right'), L0 = side('left');
      const hands = P.flatMode ? [P.flatAnchorPos(), P.head] : [(R0 || P.hands[0]).palm, (L0 || P.hands.find(h => h !== R0) || P.hands[1]).palm];
      // (watching your own emote from out front in VR: everyone else still sees you where you were standing)
      const H = P.vrEmoteHold; if (H) { this.send({ t: 'p', c: this.char || 'ronnie', h: H.h.map(r), q: H.q.map(r), l: H.l.map(r), rh: H.rh.map(r), s: r(P.scale), st: G.stage, flat: 0, ts: Math.round(performance.now()) }); }
      else this.send({ t: 'p', c: this.char || 'ronnie', h: [r(P.head.x), r(P.head.y), r(P.head.z)], q: [r(q.x), r(q.y), r(q.z), r(q.w)], l: [r(hands[1].x), r(hands[1].y), r(hands[1].z)], rh: [r(hands[0].x), r(hands[0].y), r(hands[0].z)], s: r(P.scale), st: G.stage, flat: P.flatMode ? 1 : 0, ts: Math.round(performance.now()) });
    }
    const now = performance.now();
    for (const p of this.players.values()) {
      if (!p.pose) continue;
      if (p.pose.c && !p.char) p.char = p.pose.c;
      if (!p.avatar) p.avatar = (this.makeAvatar && this.makeAvatar(p)) || new RemoteRonnie(scene, p.name);
      // nothing from them for 8 seconds (their connection's gone, and the room hasn't noticed yet): hide them rather than
      // leave a frozen ghost standing there. They're back the moment they send anything
      const stale = now - (p.at || now) > 8000;
      if (stale !== !!p.stale) { p.stale = stale; const a = p.avatar; if (a.impVis) { if (!a.impHidden) a.impVis(!stale); } else if (a.g) a.g.visible = !stale; }
      if (!stale) p.avatar.update(dt, p.pose);
    }
  }
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
    this.scene = scene; this.g = new THREE.Group(); scene.add(this.g);
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
