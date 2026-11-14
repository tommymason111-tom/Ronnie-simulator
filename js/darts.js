// Darts in the cabin at Lewis's: a proper board in a cabinet whose doors open
// out either side, chalkboards on the inside of the doors for the scores.
// Three darts on the little high table by the oche: pick one up, throw it
// (VR: a real throw; phone/PC: the THROW button). Where it sticks scores like
// a real board (singles, doubles, trebles, 25, bull). 501 down, three darts a
// visit; go below zero and it's BUST, hit zero exactly for GAME SHOT. After
// each visit the darts come back to the table.
import * as THREE from 'three';
import { sfx } from './audio.js';
import { canvasTex } from './textures.js';
import { PlayButton } from './playbutton.js';

const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
// regulation sizes (metres, radius)
const RB = { bull: 0.00635, outer: 0.0159, tIn: 0.099, tOut: 0.107, dIn: 0.162, dOut: 0.170, face: 0.225 };
const TIP = 0.075;            // dart centre -> tip

export function scoreAt(u, v) {
  const r = Math.hypot(u, v);
  if (r > RB.dOut) return { pts: 0, label: 'MISS' };
  if (r < RB.bull) return { pts: 50, label: 'BULL' };
  if (r < RB.outer) return { pts: 25, label: '25' };
  const deg = (Math.atan2(u, v) * 180 / Math.PI + 360 + 9) % 360;      // clockwise from the top, 20 at the top
  const n = ORDER[Math.floor(deg / 18) % 20];
  if (r > RB.tIn && r < RB.tOut) return { pts: n * 3, label: 'T' + n };
  if (r > RB.dIn) return { pts: n * 2, label: 'D' + n };
  return { pts: n, label: String(n) };
}

export function dartboardTex() {
  return canvasTex(1024, 1024, (g, w) => {
    const c = w / 2, s = c / RB.face;          // px per metre
    g.fillStyle = '#111'; g.beginPath(); g.arc(c, c, c, 0, 7); g.fill();
    const wedge = (r0, r1, i, col) => {
      const a0 = (-90 - 9 + i * 18) * Math.PI / 180, a1 = a0 + 18 * Math.PI / 180;
      g.beginPath(); g.arc(c, c, r1 * s, a0, a1); g.arc(c, c, r0 * s, a1, a0, true); g.closePath(); g.fillStyle = col; g.fill();
    };
    for (let i = 0; i < 20; i++) {
      const dark = i % 2 === 0;
      wedge(RB.outer, RB.tIn, i, dark ? '#1a1a1a' : '#efe3c4');
      wedge(RB.tIn, RB.tOut, i, dark ? '#c8102e' : '#1f8a3a');
      wedge(RB.tOut, RB.dIn, i, dark ? '#1a1a1a' : '#efe3c4');
      wedge(RB.dIn, RB.dOut, i, dark ? '#c8102e' : '#1f8a3a');
    }
    g.fillStyle = '#1f8a3a'; g.beginPath(); g.arc(c, c, RB.outer * s, 0, 7); g.fill();
    g.fillStyle = '#c8102e'; g.beginPath(); g.arc(c, c, RB.bull * s, 0, 7); g.fill();
    // the wire
    g.strokeStyle = '#c0c0c0'; g.lineWidth = 2;
    for (const r of [RB.outer, RB.tIn, RB.tOut, RB.dIn, RB.dOut]) { g.beginPath(); g.arc(c, c, r * s, 0, 7); g.stroke(); }
    for (let i = 0; i < 20; i++) { const a = (-90 - 9 + i * 18) * Math.PI / 180; g.beginPath(); g.moveTo(c + Math.cos(a) * RB.outer * s, c + Math.sin(a) * RB.outer * s); g.lineTo(c + Math.cos(a) * RB.dOut * s, c + Math.sin(a) * RB.dOut * s); g.stroke(); }
    // numbers round the outside
    g.fillStyle = '#fff'; g.font = '900 54px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 20; i++) { const a = (-90 + i * 18) * Math.PI / 180, r = (RB.dOut + RB.face) / 2 * s; g.save(); g.translate(c + Math.cos(a) * r, c + Math.sin(a) * r); g.rotate(a + Math.PI / 2); g.fillText(ORDER[i], 0, 0); g.restore(); }
  });
}

export class DartGame {
  // center: middle of the board face; normal: which way it faces; up: board's up
  constructor({ center, normal, up = new THREE.Vector3(0, 1, 0), stand, chalkL, chalkR }) {
    this.c = center.clone(); this.n = normal.clone().normalize(); this.up = up.clone().normalize();
    this.right = new THREE.Vector3().crossVectors(this.up, this.n).normalize();     // board's +u (to the thrower's right)
    this.stand = stand;                         // [Vector3 x3] where the darts wait
    this.chalkL = chalkL; this.chalkR = chalkR; // { tex, g } canvases inside the doors
    this.darts = []; this.visit = []; this.left = 501; this.hist = []; this.best = 0; this.tons = 0; this.wins = 0;
    this.collectT = 0; this.msg = '';
    this.draw();
  }
  attach(items) {
    this.items = items; this.playing = false;
    const scene = items.scene;
    this.button = new PlayButton(scene, this.stand[1].clone().add(new THREE.Vector3(0, 0.55, 0)), 'DARTS');
    // where the dart you're holding is going: a red ring and dot on the board
    this.marker = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.014, 0.02, 24), new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.9, depthTest: false }));
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.005, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
    this.marker.add(ring, dot); this.marker.renderOrder = 6; ring.renderOrder = dot.renderOrder = 6;
    this.marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.n); this.marker.visible = false; scene.add(this.marker);
  }
  toggle() { if (!this.button.press()) return; this.playing ? this.stop() : this.start(); }
  start() {
    this.playing = true; this.button.set(true);
    this.left = 501; this.hist = []; this.visit = []; this.lastVisit = []; this.msg = 'GAME ON!'; this.collectT = 0;
    for (const d of this.darts) if (!d.dead) this.items.remove(d);
    this.darts = []; for (let i = 0; i < 3; i++) this.darts.push(this.spawn(i));
    sfx('ting', this.c, 0.6); this.draw();
  }
  stop() {
    this.playing = false; this.button.set(false); this.marker.visible = false;
    for (const d of this.darts) { if (d.heldBy) { d.heldBy.held = null; d.heldBy = null; } if (!d.dead) this.items.remove(d); }
    this.darts = []; this.msg = ''; this.draw();
  }
  // where would the dart in your hand land? phone/PC: where the middle of the screen points; headset: along the dart
  aimPoint(it, player) {
    let o, dir;
    if (it.heldBy.isFlat) { o = player.camera.getWorldPosition(_a); dir = player.camera.getWorldDirection(_d); }
    else { it.obj.updateMatrixWorld(true); o = _a.setFromMatrixPosition(it.obj.matrixWorld); dir = _d.set(0, 0, -1).applyQuaternion(it.obj.getWorldQuaternion(_q)); }
    const den = dir.dot(this.n); if (den > -0.15) return null;
    const t = _t.subVectors(this.c, o).dot(this.n) / den; if (t < 0 || t > 5) return null;
    const p = o.addScaledVector(dir, t), r = _b.subVectors(p, this.c).length();
    return r < RB.face + 0.12 ? p : null;
  }
  spawn(i) {
    const it = this.items.spawn('dart', this.stand[i]);
    it.obj.rotation.set(0, Math.PI / 2 + (i - 1) * 0.15, 0);
    it.dartSlot = i; it.flying = false; it.stuck = false;
    return it;
  }
  // called by the item physics each step for a moving dart: stick it in the board?
  hitTest(it) {
    if (it.vel.lengthSq() < 4) return false;
    const d = _d.copy(it.vel).normalize();
    const a = _a.copy(it.prev).addScaledVector(d, TIP), b = _b.copy(it.pos).addScaledVector(d, TIP);
    const sa = _t.subVectors(a, this.c).dot(this.n), sb = _t.subVectors(b, this.c).dot(this.n);
    if (!(sa > 0 && sb <= 0)) return false;
    const p = a.lerp(b, sa / (sa - sb));
    _t.subVectors(p, this.c);
    const u = _t.dot(this.right), v = _t.dot(this.up);
    if (Math.hypot(u, v) > RB.face + 0.03) return false;           // missed the board: the wall/cabinet handles it
    it.pos.copy(p).addScaledVector(d, -TIP + 0.014);                  // tip buried a little
    it.obj.quaternion.setFromUnitVectors(_z.set(0, 0, -1), d);
    it.vel.set(0, 0, 0); it.spin.set(0, 0, 0); it.resting = true; it.stuck = true;
    sfx('thwack', p, 0.6);
    if (it.flying) { it.flying = false; this.score(scoreAt(u, v), p); }
    return true;
  }
  score(s, at) {
    this.visit.push(s);
    const sum = this.visit.reduce((t, x) => t + x.pts, 0);
    if (this.words) this.words.show(s.label === 'MISS' ? 'MISS!' : s.label === 'BULL' ? 'BULLSEYE!' : s.label[0] === 'T' ? 'TREBLE ' + s.label.slice(1) + '!' : s.label[0] === 'D' ? 'DOUBLE ' + s.label.slice(1) + '!' : s.label, _a.copy(at).addScaledVector(this.n, 0.25).add(_t.set(0, 0.2, 0)), s.pts >= 50 || s.label[0] === 'T' ? '#ffd400' : '#ffffff', 0.12, 1.2);
    if (this.left - sum < 0 || this.left - sum === 1) { this.endVisit('BUST!'); return; }
    if (this.left - sum === 0) { this.endVisit('GAME SHOT!'); return; }
    if (this.visit.length >= 3) this.endVisit();
    else this.draw();
  }
  endVisit(tag = '') {
    const sum = this.visit.reduce((t, x) => t + x.pts, 0);
    if (tag === 'BUST!') { this.hist.push('BUST'); sfx('sadviolin', this.c, 0.5); }
    else {
      this.left -= sum; this.hist.push(sum); this.best = Math.max(this.best, sum);
      if (sum === 180) { this.tons++; tag = 'ONE HUNDRED AND EIGHTY!'; sfx('fanfare', this.c, 1); }
      else if (sum >= 100) { tag = 'TON' + (sum > 100 ? '-' + (sum - 100) : '') + '!'; sfx('trumpet', this.c, 0.7); }
    }
    if (tag === 'GAME SHOT!') { this.wins++; sfx('fanfare', this.c, 1); }
    this.msg = tag || 'SCORED ' + sum;
    if (this.words && tag) this.words.show(tag, _a.copy(this.c).addScaledVector(this.n, 0.6).add(_t.set(0, 0.35, 0)), '#ffd400', 0.16, 2.2);
    this.lastVisit = this.visit; this.visit = [];
    if (tag === 'GAME SHOT!') { this.left = 501; this.hist = []; }
    this.collectT = 2.4;            // then the darts go back on the table
    this.draw();
  }
  update(dt, player) {
    if (!this.items) return;
    this.button.tick(dt); this.button.visible = !!this.allowed;
    if (!this.allowed && this.playing) this.stop();
    if (!this.playing) return;
    const held = this.darts.find(d => d.heldBy && !d.dead), p = held && player ? this.aimPoint(held, player) : null;
    this.marker.visible = !!p; if (p) this.marker.position.copy(p).addScaledVector(this.n, 0.004);
    for (let i = 0; i < this.darts.length; i++) {
      const it = this.darts[i];
      if (it.dead) { if ((it.deadT = (it.deadT || 0) + dt) > 2) this.darts[i] = this.spawn(i); continue; }
      if (it.heldBy) { it.wasHeld = true; it.stuck = false; it.flying = false; it.resting = false; continue; }
      if (it.wasHeld) { it.wasHeld = false; it.flying = true; }                      // just let go: in the air
      if (it.flying && it.resting && !it.stuck) { it.flying = false; this.score({ pts: 0, label: 'MISS' }, it.pos); }   // on the floor
    }
    if (this.collectT > 0 && (this.collectT -= dt) <= 0) {
      for (let i = 0; i < this.darts.length; i++) { const it = this.darts[i]; if (!it.heldBy) { if (!it.dead) this.items.remove(it); this.darts[i] = this.spawn(i); } }
      sfx('pop', this.c, 0.4);
    }
  }
  // the chalkboards inside the doors
  draw() {
    const chalk = (cv, lines) => {
      const { g, tex } = cv, w = g.canvas.width, h = g.canvas.height;
      g.fillStyle = '#1c2a24'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 1); }   // old chalk dust
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const [txt, y, size, col] of lines) { g.fillStyle = col || 'rgba(245,245,235,0.92)'; g.font = `700 ${size}px "Comic Sans MS", "Chalkboard SE", "Marker Felt", cursive, sans-serif`; g.fillText(txt, w / 2, y); }
      tex.needsUpdate = true;
    };
    if (this.chalkL) {
      const L = [['RONNIE', 40, 40, '#ffe680'], [String(this.left), 120, 96]];
      let rem = 501; const rows = this.hist.slice(-7);
      this.hist.forEach(x => { if (x !== 'BUST') rem -= x; });
      let y = 205; for (const x of rows) { L.push([x === 'BUST' ? 'BUST' : String(x), y, 36, x === 'BUST' ? '#ff9a9a' : null]); y += 42; }
      L.push(['501 · DOUBLE NOT NEEDED', 490, 18, '#9fb4a8']);
      chalk(this.chalkL, L);
    }
    if (this.chalkR) {
      const v = this.visit.length ? this.visit : (this.lastVisit || []);
      const R = [['THIS VISIT', 40, 34, '#ffe680']];
      for (let i = 0; i < 3; i++) R.push([v[i] ? v[i].label : '–', 95 + i * 46, 38]);
      R.push([v.length ? String(v.reduce((t, x) => t + x.pts, 0)) : '', 245, 44, '#ffe680']);
      R.push([this.msg, 300, 26, '#9ad8ff']);
      R.push(['BEST VISIT: ' + this.best, 360, 26]); R.push(['180s: ' + this.tons, 400, 26]); R.push(['GAMES WON: ' + this.wins, 440, 26]);
      R.push(['oche is the yellow line', 490, 18, '#9fb4a8']);
      chalk(this.chalkR, R);
    }
  }
}
export function chalkCanvas() { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 512; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return { g: cv.getContext('2d'), tex }; }
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _t = new THREE.Vector3(), _z = new THREE.Vector3(), _q = new THREE.Quaternion();
