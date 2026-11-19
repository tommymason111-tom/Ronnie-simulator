// RUN THE PUB: the TIP JAR on the bar, next to the Guinness tap. Every tip drops in as coins (you see them fall in and
// pile up), there's a little label with what's in it, and every £10 the bar gets a cheer. Now and then Lewis comes
// past "borrowing" some for his car; stand near the jar and he thinks better of it.
import * as THREE from 'three';
import { sfx } from './audio.js';
import { canvasTex, FONT, roundRect } from './textures.js';

const MAX_COINS = 90, JAR = { x: 2.66, y: 1.088, z: -7.05, r: 0.075, h: 0.2 };
const COIN = [0xd4af37, 0xc0c4c8, 0xb87333];      // (pound coins, silver, coppers)
export class TipJar {
  constructor(rp) {
    this.rp = rp; this.g = rp.g; this.total = 0; this.coins = 0; this.falling = []; this.nextMile = 10; this.wob = 0; this.nickT = 70 + Math.random() * 60;
    const grp = this.grp = new THREE.Group(); grp.position.set(JAR.x, JAR.y, JAR.z); grp.name = 'tip jar'; this.g.scene.add(grp);
    // the jar: a glass with a thick rim and a cork-coloured lid hole
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(JAR.r, JAR.r * 0.92, JAR.h, 24, 1, true), new THREE.MeshLambertMaterial({ color: 0xcfe8f0, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
    glass.position.y = JAR.h / 2; glass.renderOrder = 3; grp.add(glass);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(JAR.r * 0.92, JAR.r * 0.92, 0.012, 24), new THREE.MeshLambertMaterial({ color: 0xb8d4dc })); base.position.y = 0.006; grp.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(JAR.r, 0.008, 6, 24), new THREE.MeshLambertMaterial({ color: 0xe8f4f8 })); rim.rotation.x = Math.PI / 2; rim.position.y = JAR.h; grp.add(rim);
    // the coins inside: one draw for all of them
    const cg = new THREE.CylinderGeometry(0.014, 0.014, 0.004, 12);
    this.im = new THREE.InstancedMesh(cg, new THREE.MeshLambertMaterial({ color: 0xffffff }), MAX_COINS); this.im.count = 0; this.im.frustumCulled = false; grp.add(this.im);
    // the label on the front
    this.labelC = document.createElement('canvas'); this.labelC.width = 256; this.labelC.height = 128;
    this.labelT = new THREE.CanvasTexture(this.labelC); this.labelT.colorSpace = THREE.SRGBColorSpace;
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.075), new THREE.MeshBasicMaterial({ map: this.labelT, transparent: true }));
    lab.position.set(-JAR.r - 0.002, 0.1, 0); lab.rotation.y = -Math.PI / 2; lab.renderOrder = 4; grp.add(lab); lab.userData.live = true;
    this.drawLabel();
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1); this._c = new THREE.Color();
  }
  drawLabel() {
    const g = this.labelC.getContext('2d'); g.clearRect(0, 0, 256, 128);
    g.fillStyle = '#fff7d6'; roundRect(g, 6, 6, 244, 116, 18); g.fill(); g.lineWidth = 6; g.strokeStyle = '#7a4a10'; g.stroke();
    g.fillStyle = '#7a4a10'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 40px ${FONT}`; g.fillText('TIPS 🙏', 128, 44);
    g.fillStyle = '#15803d'; g.font = `900 38px ${FONT}`; g.fillText('£' + this.total.toFixed(2), 128, 92);
    this.labelT.needsUpdate = true;
  }
  // a tip: that many coins drop in from above the jar
  add(amount) {
    if (!(amount > 0)) return;
    this.total += amount; const n = Math.max(1, Math.min(6, Math.round(amount / 0.4)));
    for (let i = 0; i < n; i++) this.falling.push({ t: -i * 0.09, y: 0.42 + Math.random() * 0.1, x: (Math.random() - 0.5) * 0.04, z: (Math.random() - 0.5) * 0.04, col: COIN[Math.floor(Math.random() * 3)] });
    this.drawLabel(); this.wob = Math.max(this.wob, 0.5);
    if (this.total >= this.nextMile) { const m = this.nextMile; this.nextMile += 10;
      this.g.showBanner(`TIP JAR: £${m}!`, m >= 30 ? 'THE PUNTERS LOVE YOU' : 'KEEP THEM COMING'); sfx('jackpot', null, 0.6);
      const st = this.rp.cast.find(c => c.id === 'aidan' || c.id === 'connor'); st && st.say(R(['Tip jar\'s FILLING UP, Ron!', 'We\'re splitting that, yeah?', 'Ron! You\'re a natural, mate!']), 3); }
  }
  // where coin number i sits in the pile (a loose heap, a ring at a time)
  slot(i) { const ring = 7, layer = Math.floor(i / ring), k = i % ring, a = k / ring * Math.PI * 2 + layer * 0.7, rr = k === 0 ? 0 : JAR.r * 0.55;
    return [Math.cos(a) * rr * (k ? 1 : 0), 0.014 + layer * 0.0045, Math.sin(a) * rr * (k ? 1 : 0), layer * 0.9 + k * 1.3]; }
  setCoin(i, x, y, z, tilt, col) { this._e.set(tilt, i * 1.7, tilt * 0.6); this._q.setFromEuler(this._e); this._p.set(x, y, z); this._m.compose(this._p, this._q, this._s); this.im.setMatrixAt(i, this._m); this.im.setColorAt(i, this._c.set(col)); }
  update(dt) {
    // coins falling in, then landing on the pile
    let dirty = false;
    for (let i = this.falling.length - 1; i >= 0; i--) { const f = this.falling[i]; f.t += dt; if (f.t < 0) continue;
      const y = f.y - 4.9 * f.t * f.t, [sx, sy, sz] = this.slot(Math.min(this.coins, MAX_COINS - 1));
      if (y <= sy) { this.falling.splice(i, 1); if (this.coins < MAX_COINS) { this.setCoin(this.coins, sx + f.x * 0.3, sy, sz + f.z * 0.3, 0.25, f.col); this.coins++; this.im.count = this.coins; } dirty = true; sfx('tipjar', this.grp.position, 0.35); this.wob = Math.max(this.wob, 0.25); continue; }
      const k = Math.min(MAX_COINS - 1, this.coins + 1); this.setCoin(k, f.x, y, f.z, f.t * 14, f.col); this.im.count = Math.max(this.im.count, k + 1); dirty = true; }
    if (!this.falling.length && this.im.count > this.coins) { this.im.count = this.coins; }
    if (dirty) { this.im.instanceMatrix.needsUpdate = true; if (this.im.instanceColor) this.im.instanceColor.needsUpdate = true; }
    // a little wobble when something lands in it
    if (this.wob > 0.001) { this.wob *= Math.exp(-dt * 6); const t = performance.now() / 1000; this.grp.rotation.z = Math.sin(t * 30) * 0.06 * this.wob; this.grp.rotation.x = Math.cos(t * 27) * 0.04 * this.wob; } else { this.grp.rotation.set(0, 0, 0); }
    // Lewis "borrowing" from it for his car (Friday night and the cup final): stand near it and he leaves it
    if (this.rp.diff.nick && this.total >= 4 && (this.nickT -= dt) <= 0) {
      this.nickT = 80 + Math.random() * 70; const P = this.g.player, near = Math.hypot(P.head.x - JAR.x, P.head.z - JAR.z) < 1.6, lewis = this.rp.cast.find(c => c.id === 'lewis');
      if (near) { lewis && lewis.say(R(['I was just... counting it, bro. For you.', 'Relax, Ron. I was only looking.']), 3); this.g.words.show('LEWIS BACKED OFF', this.grp.position.clone().add({ x: 0, y: 0.45, z: 0 }), '#39ff14', 0.07, 1.5); }
      else { const took = Math.round(Math.min(this.total * 0.25, 8) * 10) / 10; this.total -= took; this.nicked = (this.nicked || 0) + took; this.coins = Math.max(0, this.coins - Math.round(took / 0.4)); this.im.count = this.coins; this.drawLabel(); this.wob = 1;
        lewis && lewis.say(R(['Just borrowing a bit for the car, bro. It\'s an emergency.', 'I\'ll pay it back. Probably. The car needs a new bumper.']), 4);
        this.g.words.show(`LEWIS NICKED £${took.toFixed(2)}!`, this.grp.position.clone().add({ x: 0, y: 0.45, z: 0 }), '#ff3a3a', 0.08, 2); sfx('error', this.grp.position, 0.5); }
    }
  }
  dispose() { this.g.scene.remove(this.grp); this.grp.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); }
}
const R = (a) => a[Math.floor(Math.random() * a.length)];
// how busy the night is
export const RP_DIFF = {
  1: { name: 'QUIET NIGHT', patience: 1.5, spawn: 1.45, events: 1.7, tip: 0.8, nick: false },
  2: { name: 'FRIDAY NIGHT', patience: 1, spawn: 1, events: 1, tip: 1, nick: true },
  3: { name: 'CUP FINAL', patience: 0.68, spawn: 0.62, events: 0.66, tip: 1.6, nick: true },
};
