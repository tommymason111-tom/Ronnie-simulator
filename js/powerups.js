// POWER-UPS: glowing orbs that turn up now and then around the place (in the eating games). Walk into one to get it:
//   HOOVER MODE   - for a while every bit of food near you flies straight into your mouth (the whole thing, in one go)
//   DOUBLE CHONK  - everything you eat counts double
//   FOOD RAIN     - a shower of food lands all round you
//   SUPER SPEED   - you go much faster
// In multiplayer the host puts them down (everyone sees the same ones) and whoever gets there first gets it.
import * as THREE from 'three';
import { track } from './awards.js';
import { ronnie } from './ronnie.js';
import { narrator } from './narrator.js';

// what the narrator says for one (tools/narrator_lines.mjs makes the same text)
export const narratorPower = (P) => P.name.charAt(0) + P.name.slice(1).toLowerCase() + '! ' + P.line.charAt(0) + P.line.slice(1).toLowerCase();
export const POWERUPS = {
  hoover: { name: 'HOOVER MODE', icon: '🌀', col: 0x00e5ff, css: '#00e5ff', dur: 7, line: 'SUCK IT ALL UP!' },
  double: { name: 'DOUBLE CHONK', icon: '×2', col: 0xffd400, css: '#ffd400', dur: 15, line: 'EVERYTHING COUNTS DOUBLE!' },
  rain:   { name: 'FOOD RAIN', icon: '🍔', col: 0xff6d00, css: '#ff8a1e', dur: 0, line: 'IT\'S RAINING BURGERS!' },
  speed:  { name: 'SUPER SPEED', icon: '⚡', col: 0x76ff03, css: '#9cff4a', dur: 12, line: 'ZOOM!' },
};
const KINDS = Object.keys(POWERUPS);
const RAIN_FOOD = ['burger', 'pizza', 'doughnut', 'hotdog', 'fries', 'kebab', 'chicken', 'taco', 'nuggets', 'pasty', 'burrito', 'waffle', 'cookie', 'choc'];

function iconTex(k) {
  const P = POWERUPS[k], c = document.createElement('canvas'); c.width = 256; c.height = 320; const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2); g.fill();
  g.lineWidth = 10; g.strokeStyle = P.css; g.stroke();
  g.font = (P.icon.length > 1 && !/\p{Emoji_Presentation}/u.test(P.icon) ? '900 110px' : '120px') + ' Arial, sans-serif'; g.fillStyle = '#fff'; g.fillText(P.icon, 128, 136);
  g.font = '900 34px Arial, sans-serif'; g.lineWidth = 8; g.strokeStyle = '#000'; g.strokeText(P.name, 128, 290, 250); g.fillStyle = P.css; g.fillText(P.name, 128, 290, 250);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function orbMesh(k) {
  const P = POWERUPS[k], g = new THREE.Group();
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), new THREE.MeshBasicMaterial({ color: P.col, transparent: true, opacity: 0.35, depthWrite: false }));
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), new THREE.MeshLambertMaterial({ color: P.col, emissive: P.col, emissiveIntensity: 0.7 }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.015, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffffff })); ring.name = 'ring';
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3, 18, 1, true), new THREE.MeshBasicMaterial({ color: P.col, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  beam.position.y = 1.2;
  const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex(k), transparent: true, depthWrite: false })); icon.scale.set(0.42, 0.525, 1); icon.position.y = 0.48; icon.name = 'icon';
  g.add(glow, core, ring, beam, icon); g.userData.core = core; g.userData.ring = ring;
  return g;
}

export class PowerUps {
  // o: { scene, room, items, player, sfx, words, net, mp, eatWhole(it, k), enabled(), noSpawn() }
  // (noSpawn: a mode with none lying about (Date Night), though developer mode's give() still works)
  constructor(o) {
    Object.assign(this, o);
    this.orbs = []; this.active = {}; this.sucking = []; this.nextT = 18; this.seq = 0; this.hum = 0;
    this.hud = document.createElement('div'); this.hud.id = 'pu-hud';
    Object.assign(this.hud.style, { position: 'fixed', top: '62px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 40, pointerEvents: 'none', fontFamily: 'Arial, sans-serif' });
    document.body.appendChild(this.hud);
    if (this.net) { this.net.on.pu = (m) => this.netSpawn(m); this.net.on.pug = (m) => this.netTaken(m); }
  }
  get mpOn() { return this.mp && this.mp.on; }
  // everything off (a new game)
  reset() { for (const o of this.orbs) this.scene.remove(o.obj); this.orbs = []; this.active = {}; this.endSuck(); this.nextT = 18; if (this.player) this.player.puSpeed = 1; if (this.vortex) this.vortex.visible = false; this.drawHud(); }
  mul() { return this.active.double > 0 ? 2 : 1; }

  // ---------------- orbs ----------------
  place(k, p, id) { const obj = orbMesh(k); obj.position.copy(p); this.scene.add(obj); const o = { k, obj, id, age: 0, y0: p.y }; this.orbs.push(o); return o; }
  spawnOne() {
    const sp = this.room.spawns; if (!sp || !sp.length) return;
    const head = this.player.head; let best = null;
    for (let i = 0; i < 40; i++) { const p = sp[Math.floor(Math.random() * sp.length)], d = Math.hypot(p.x - head.x, p.z - head.z);
      if (d > 3.5 && d < 16 && !this.orbs.some(o => o.obj.position.distanceTo(p) < 2)) { best = p; break; } }
    if (!best) return;
    const k = KINDS[Math.floor(Math.random() * KINDS.length)], pos = new THREE.Vector3(best.x, Math.max(0.9, best.y + 0.45), best.z), id = 'pu' + Date.now().toString(36) + (this.seq++);
    this.place(k, pos, id);
    if (this.mpOn) this.net.send({ t: 'pu', id, k, p: [pos.x, pos.y, pos.z] });
  }
  netSpawn(m) { if (!this.enabled() || (this.noSpawn && this.noSpawn()) || this.orbs.some(o => o.id === m.id)) return; this.place(m.k, new THREE.Vector3(...m.p), m.id); }
  netTaken(m) { const o = this.orbs.find(o => o.id === m.id); if (o) this.drop(o, true); }
  drop(o, poof) { this.scene.remove(o.obj); this.orbs.splice(this.orbs.indexOf(o), 1); }

  take(o) {
    const P = POWERUPS[o.k]; if (!o.dev) { this.drop(o); if (this.mpOn) this.net.send({ t: 'pug', id: o.id }); }
    this.sfx('powerup', null, 1); if (!o.dev) track('powers');
    const at = this.player.head.clone().addScaledVector(this.player.fwd, 0.8 * this.player.scale);
    this.words.show(`${P.icon} ${P.name}!`, at.clone().add({ x: 0, y: 0.12, z: 0 }), P.css, 0.13 * this.player.scale, 1.6);
    setTimeout(() => this.words.show(P.line, at, '#ffffff', 0.08 * this.player.scale, 1.2), 450);
    this.player.hands && this.player.hands.forEach(h => h.pulse && h.pulse(0.8, 160));
    if (o.k === 'rain') this.rain(); else this.active[o.k] = (this.active[o.k] || 0) + P.dur;
    if (o.k === 'hoover') this.sfx('hoover', null, 0.8);
    ronnie.ev('power.' + o.k);      // (ronnie.js)
    narrator.say(narratorPower(P));      // (narrator.js: after Ronnie, if he says something)
  }
  // developer mode: switch one on straight away
  give(k) { const P = POWERUPS[k]; if (!P) return; this.take({ k, obj: null, id: null, dev: true }); }
  // a shower of food dropping out of the sky all round you
  rain() {
    const h = this.player.head;
    for (let i = 0; i < 10; i++) setTimeout(() => {
      const a = Math.random() * Math.PI * 2, r = 0.8 + Math.random() * 2.2, type = RAIN_FOOD[Math.floor(Math.random() * RAIN_FOOD.length)];
      const it = this.items.spawn(type, new THREE.Vector3(h.x + Math.cos(a) * r, Math.min(2.6, h.y + 0.9), h.z + Math.sin(a) * r), new THREE.Vector3(0, -1, 0));
      if (it) { it.temp = true; it.fromClutter = true; }
      this.sfx('suck', it ? it.obj.position : null, 0.4);
    }, i * 110);
  }

  // ---------------- hoover ----------------
  edible(it) { const d = it.def; return !it.dead && !it.heldBy && !it.empty && !it.incoming && !it.sucked && !d.veg && !d.prop && !d.poop && !d.stout && !d.shake && d.chonk > 0; }
  hoover(dt) {
    const P = this.player, s = P.scale, mouth = P.mouth || P.head, R = 2.4 * Math.max(1, Math.sqrt(s));      // (toned down: it was clearing whole rooms)
    // the vortex in front of you (just a swirl: it doesn't get in the way of seeing)
    if (!this.vortex) {
      const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d');
      for (let i = 0; i < 8; i++) { g.strokeStyle = i % 2 ? 'rgba(0,229,255,0.9)' : 'rgba(255,255,255,0.7)'; g.lineWidth = 6; g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16 + 40, 128); g.stroke(); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
      const geo = new THREE.ConeGeometry(0.55, 1.4, 24, 1, true); geo.translate(0, -0.7, 0); geo.rotateX(-Math.PI / 2);     // (tip at the origin, opening forwards along -z)
      this.vortex = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      this.vortex.renderOrder = 5; this.scene.add(this.vortex);
    }
    const v = this.vortex; v.visible = true; v.position.copy(mouth).addScaledVector(P.fwd, 0.35 * s); v.scale.setScalar(s);
    v.lookAt(v.position.clone().sub(P.fwd)); v.material.map.offset.x -= dt * 2.5;
    // grab food in range (a few a second), then pull each one into the mouth
    this.grabT = (this.grabT || 0) - dt;
    if (this.grabT <= 0 && !this.sucking.length) { this.grabT = 0.7; let best = null, bd = R;      // (one thing at a time, and only what's in front of you)
      for (const it of this.items.items) { if (!this.edible(it)) continue; const d = it.obj.position.distanceTo(mouth); if (d >= bd) continue; const dx = it.obj.position.x - mouth.x, dz = it.obj.position.z - mouth.z, l = Math.hypot(dx, dz) || 1; if ((dx * P.fwd.x + dz * P.fwd.z) / l < 0.55) continue; bd = d; best = it; }
      if (best) { best.sucked = true; best.heldBy = 'hoover'; this.sucking.push({ it: best, t: 0, from: best.obj.position.clone(), spin: Math.random() * 6 }); } }
    if ((this.hum -= dt) <= 0) { this.hum = 0.9; this.sfx('hoover', null, 0.35); }
  }
  pull(dt) {
    const P = this.player, mouth = P.mouth || P.head;
    for (const s of this.sucking.slice()) {
      const it = s.it; s.t += dt / 0.8; const k = Math.min(1, s.t), e = k * k;
      if (it.dead) { this.sucking.splice(this.sucking.indexOf(s), 1); continue; }
      it.obj.position.copy(s.from).lerp(mouth, e); it.obj.position.y += Math.sin(k * Math.PI) * 0.25;
      it.obj.rotation.y += dt * (8 + s.spin); it.obj.rotation.x += dt * 6; it.obj.scale.setScalar(Math.max(0.25, 1 - e * 0.7));
      if (it.vel) it.vel.set(0, 0, 0); if (it.prev) it.prev.copy(it.obj.position);
      if (k >= 1) { this.sucking.splice(this.sucking.indexOf(s), 1); it.heldBy = null; it.sucked = false; this.eatWhole(it, 'hoover'); }
    }
  }
  endSuck() { for (const s of this.sucking) { s.it.heldBy = null; s.it.sucked = false; s.it.obj.scale.setScalar(1); } this.sucking = []; }

  // ---------------- every frame ----------------
  update(dt, time) {
    const on = this.enabled();
    if (!on) { if (this.orbs.length || Object.keys(this.active).length) this.reset(); return; }
    // the host (or a solo game) puts new ones down now and then: never more than two about
    if (this.noSpawn && this.noSpawn()) { if (this.orbs.length) for (const o of this.orbs.slice()) this.drop(o); }
    else if (!this.mpOn || this.mp.host) { this.nextT -= dt; if (this.nextT <= 0) { this.nextT = 25 + Math.random() * 15; if (this.orbs.length < 2) this.spawnOne(); } }
    const P = this.player, head = P.head, reach = 0.75 + 0.35 * P.scale;
    for (const o of this.orbs.slice()) {
      o.age += dt; const g = o.obj; g.position.y = o.y0 + Math.sin(time * 2.4 + o.age) * 0.08; g.userData.core.rotation.y += dt * 2; g.userData.core.rotation.x += dt * 1.3;
      g.userData.ring.rotation.x = Math.PI / 2 + Math.sin(time * 1.7) * 0.4; g.userData.ring.rotation.y += dt * 1.5;
      g.visible = o.age < 40 || Math.sin(o.age * 14) > 0;           // (blinking: about to go)
      if (o.age > 45) { this.drop(o); continue; }
      if (Math.hypot(head.x - g.position.x, head.z - g.position.z) < reach && head.y > g.position.y - 1.6) this.take(o);
    }
    for (const k in this.active) { this.active[k] -= dt; if (this.active[k] <= 0) { delete this.active[k]; if (k === 'hoover') this.endSuck(); this.sfx('powerdown', null, 0.5); } }
    if (this.active.hoover > 0) this.hoover(dt); else if (this.vortex) this.vortex.visible = false;
    this.pull(dt);
    P.puSpeed = this.active.speed > 0 ? 1.8 : 1;
    this.hudT = (this.hudT || 0) - dt; if (this.hudT <= 0) { this.hudT = 0.25; this.drawHud(); }
  }
  // what's on, and for how long (top middle of the screen)
  drawHud() {
    const parts = []; for (const k in this.active) { const P = POWERUPS[k]; parts.push(`<div style="background:rgba(0,0,0,.72);border:2px solid ${P.css};color:${P.css};border-radius:14px;padding:4px 10px;font-weight:900;font-size:13px;white-space:nowrap">${P.icon} ${P.name} ${Math.ceil(this.active[k])}s</div>`); }
    const html = parts.join(''); if (html !== this.hudHtml) { this.hudHtml = html; this.hud.innerHTML = html; }
  }
}
