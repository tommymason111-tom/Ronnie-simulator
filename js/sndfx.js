// SEARCH AND DESTROY: the effects (mixed into the game in snd.js). Tracers that fly from the muzzle (the sniper's
// leaves a trail), muzzle flashes, sauce splats left on the walls and floor where shots land (in each gun's own sauce,
// through both sides of a wall a shot went through), a puff of bits, the empties spat out of your gun and tinkling on
// the floor, a splat on the floor under whoever's hit, everyone else's footsteps where they are, and THE VINDALOO going
// off. All pooled: a few instanced meshes and a handful of reused ones, made once, so nothing's built mid-round.
import * as THREE from 'three';
import { sfx } from './audio.js';
import { casingGeo, splatTexture, flashGeo, flashTexture, GUN } from './sndkit.js';

const N_BITS = 220, N_MARKS = 120, N_CASES = 48, N_TR = 28, N_FL = 8;
const _eu = new THREE.Euler(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _z = new THREE.Vector3(0, 0, 1), _c = new THREE.Color();
const CASE_COL = Object.assign(Object.create(null), { beans: 0xff7a1a, gravy: 0x9a6a3a, cheese: 0xffb300, mustard: 0xffc400 });
let boomGeo = null;

export const FX = {
  initFx() {
    const grp = this.grp;
    // the bits (a puff when a shot lands, a burst when someone's hit or goes down): one instanced mesh, coloured each
    this.bitM = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.028), new THREE.MeshBasicMaterial({ color: 0xffffff }), N_BITS); this.bitM.count = 0; this.bitM.frustumCulled = false; this.bitM.name = 'sd bits'; this.bitM.setColorAt(0, _c.set(1, 1, 1)); grp.add(this.bitM); this.bits = [];
    // the marks on the walls and floor: one instanced mesh of splats, the oldest painted over first
    this.markM = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: splatTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), N_MARKS);
    this.markM.count = 0; this.markM.frustumCulled = false; this.markM.name = 'sd marks'; this.markM.renderOrder = 1; this.markM.setColorAt(0, _c.set(1, 1, 1)); grp.add(this.markM); this.markN = 0;
    // the empties
    this.caseM = new THREE.InstancedMesh(casingGeo(), new THREE.MeshLambertMaterial({ color: 0xffffff }), N_CASES); this.caseM.count = 0; this.caseM.frustumCulled = false; this.caseM.name = 'sd casings'; this.caseM.setColorAt(0, _c.set(1, 1, 1)); grp.add(this.caseM); this.cases = [];
    // tracers and muzzle flashes, reused
    const tg = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true); tg.rotateX(Math.PI / 2); tg.translate(0, 0, 0.5);
    this.trPool = []; for (let i = 0; i < N_TR; i++) { const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); m.visible = false; m.frustumCulled = false; m.name = 'sd tracer'; m.userData.life = 0; grp.add(m); this.trPool.push(m); }
    const fg = flashGeo(); this.flPool = []; for (let i = 0; i < N_FL; i++) { const m = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ map: flashTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); m.visible = false; m.frustumCulled = false; m.name = 'sd flash'; m.userData.life = 0; grp.add(m); this.flPool.push(m); }
    this.trI = 0; this.flI = 0; this.stepAt = new Map(); this.shots = [];
  },
  // a tracer from a to b: a streak flying along it (the sniper's leaves a trail hanging in the air)
  tracer(a, b, G, mine) {
    const d = a.distanceTo(b); if (d < 0.05 || !this.trPool) return; const m = this.trPool[this.trI++ % N_TR], u = m.userData, trail = G.id === 'sausage' || G.id === 'baguette';
    u.a = a.clone(); u.b = b.clone(); u.d = d; u.t = 0; u.speed = 160; u.trail = trail; u.w = (mine ? 0.005 : 0.009) * (G.id === 'sausage' ? 2 : G.pellets > 1 ? 0.8 : G.dmg > 45 ? 1.5 : 1); u.life = trail ? 0.7 : d / u.speed + 0.06;
    m.material.color.setHex(G.tr || 0xfff3c4); m.material.opacity = 0.95; m.visible = true;
  },
  // the flash at someone's muzzle (your own gun's is on the gun itself: sndguns.js)
  flash(at, G, dir) {
    if (!this.flPool) return; const m = this.flPool[this.flI++ % N_FL], u = m.userData; m.position.copy(at); if (dir) { _v.copy(at).add(dir); m.lookAt(_v); m.rotateZ(Math.random() * 6); } else m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    u.t = 0; u.life = 0.06; u.s = G.pellets > 1 || G.dmg > 45 ? 0.32 : 0.2; m.scale.setScalar(u.s); m.material.color.setHex(G.id === 'monstor' ? 0xb4ff6a : 0xffd890); m.material.opacity = 1; m.visible = true;
  },
  // where a shot lands on a wall or the floor: a splat of the gun's sauce left there, a puff, a little splat noise
  impact(at, n, G) {
    if (!at || !n) return; this.mark(at, n, G.splat || 0xbbbbbb, G.pellets > 1 ? 0.07 : G.id === 'sausage' ? 0.2 : G.dmg > 45 ? 0.15 : 0.1);
    this.burst(_v.copy(at).addScaledVector(n, 0.03), [G.tr || 0xdddddd, G.splat || 0xbfbfbf, 0xffffff], G.pellets > 1 ? 2 : 5, 0.8);
    if ((this.impT = (this.impT || 0)) < this.clock) { this.impT = this.clock + 0.05; sfx('sd_impact', at, 0.45); }
  },
  mark(at, n, col, size) {
    if (!this.markM) return; const i = this.markN++ % N_MARKS; _q.setFromUnitVectors(_z, n); _q2.setFromAxisAngle(_z, Math.random() * 6.28); _q.multiply(_q2);
    _m.compose(_v.copy(at).addScaledVector(n, 0.01), _q, _s.set(size * (0.8 + Math.random() * 0.4), size * (0.8 + Math.random() * 0.4), 1)); this.markM.setMatrixAt(i, _m); this.markM.setColorAt(i, _c.setHex(col));
    this.markM.count = Math.min(N_MARKS, Math.max(this.markM.count, i + 1)); this.markM.instanceMatrix.needsUpdate = true; this.markM.instanceColor.needsUpdate = true;
  },
  // someone hit: sauce on the floor under them (the gun's own)
  splatFloor(at, G, big) { const fl = this.floor(at.x, at.z); this.mark(_v.set(at.x + (Math.random() - 0.5) * 0.4, fl + 0.005, at.z + (Math.random() - 0.5) * 0.4), new THREE.Vector3(0, 1, 0), (G && G.splat) || 0xc62828, big ? 0.9 : 0.35 + Math.random() * 0.2); },
  clearMarks() { if (this.markM) { this.markM.count = 0; this.markN = 0; } for (const c of this.cases || []) c.life = 0; },
  // a puff of bits
  burst(at, cols, n = 10, speed = 1.8) {
    if (!this.bits) return; for (let i = 0; i < n; i++) { if (this.bits.length >= N_BITS) this.bits.shift(); const a = Math.random() * Math.PI * 2, u = Math.random();
      this.bits.push({ p: at.clone(), v: new THREE.Vector3(Math.cos(a) * speed * (0.4 + u), 1 + Math.random() * 2, Math.sin(a) * speed * (0.4 + u)), t: 0, life: 0.6 + Math.random() * 0.4, c: cols[i % cols.length], r: Math.random() * 6 }); }
  },
  // the flamer's spray: blobs of hot sauce thrown forward, falling
  spray(at, dir, G) { if (!this.bits) return; for (let i = 0; i < 6; i++) { if (this.bits.length >= N_BITS) this.bits.shift(); const v = dir.clone().multiplyScalar(6 + Math.random() * 5).add({ x: (Math.random() - 0.5) * 1.6, y: (Math.random() - 0.2) * 1.4, z: (Math.random() - 0.5) * 1.6 });
    this.bits.push({ p: at.clone(), v, t: 0, life: 0.45 + Math.random() * 0.3, c: [0xff3b1a, 0xff8a1a, 0xffd400, 0xb71c1c][i % 4], r: Math.random() * 6 }); } },
  // an empty out of your gun's ejection port (the revolver: the cylinder tipped out)
  ejectCasing(G, i = 0) {
    if (!this.cases) return; const g = this.vGun && this.vGun.visible ? this.vGun : this.vrGun && this.vrGun.visible && this.vrGun.parent ? this.vrGun : null; if (!g) return;
    g.updateMatrixWorld(true); const p = g.localToWorld(g.userData.model.eject.clone()), qw = g.getWorldQuaternion(new THREE.Quaternion());
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(qw), up = new THREE.Vector3(0, 1, 0).applyQuaternion(qw), back = new THREE.Vector3(0, 0, 1).applyQuaternion(qw);
    const v = G.rtype === 'cyl' ? up.clone().multiplyScalar(-0.6).addScaledVector(back, 0.3).add({ x: (Math.random() - 0.5) * 0.4, y: 0, z: (Math.random() - 0.5) * 0.4 }) : right.multiplyScalar(1.3 + Math.random() * 0.6).addScaledVector(up, 1.3 + Math.random() * 0.5).addScaledVector(back, 0.3);
    if (this.cases.length >= N_CASES) this.cases.shift(); this.cases.push({ p, v, r: new THREE.Euler(Math.random() * 3, Math.random() * 3, 0), w: new THREE.Vector3(Math.random() * 20 - 10, Math.random() * 20 - 10, 0), t: 0, life: 4, c: CASE_COL[G.id] || 0xd4a74a, s: G.pellets > 1 ? 1.6 : G.dmg > 45 ? 1.3 : 1, bounced: 0, i });
  },
  // THE VINDALOO GOES OFF: a fireball of curry, everyone near it is out, the screen shakes
  explode() {
    const B = this.bomb, at = B.p ? new THREE.Vector3(B.p[0], this.floor(B.p[0], B.p[1]) + 0.4, B.p[1]) : null; if (!at || this.boomFx) return; this.boomFx = 1;
    sfx('sd_boom', at, 1.4); this.burst(at, [0xff6d00, 0xffd400, 0xc1440e, 0x8a3a22, 0xffffff], 70, 6);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = 1 + Math.random() * 3; this.mark(new THREE.Vector3(at.x + Math.cos(a) * r, this.floor(at.x, at.z) + 0.006, at.z + Math.sin(a) * r), new THREE.Vector3(0, 1, 0), i % 2 ? 0xc1440e : 0x8a3a22, 0.8 + Math.random() * 1.2); }
    if (!boomGeo) boomGeo = new THREE.SphereGeometry(1, 20, 14); const ball = new THREE.Mesh(boomGeo, new THREE.MeshBasicMaterial({ color: 0xff8a1a, transparent: true, opacity: 0.85, depthWrite: false })); ball.position.copy(at); ball.userData = { t: 0, life: 0.9, boom: 1 }; this.grp.add(ball); this.shots.push(ball);
    this.g.words && this.g.words.show('💥 CURRY EVERYWHERE!', at.clone().add({ x: 0, y: 2.2, z: 0 }), '#ff9f1c', 0.5, 2.2);
    const P = this.g.player, d = Math.hypot(P.head.x - at.x, P.head.z - at.z); if (d < 25) { const k = 1 - d / 25; for (const h of P.hands || []) h.pulse && h.pulse(k, 300); if (P.flatMode) this.shake = Math.max(this.shake || 0, k); }
    this.feed('💥 THE VINDALOO WENT OFF');
  },
  animFx(dt) {
    const t = this.clock;
    // tracers
    if (this.trPool) for (const m of this.trPool) { const u = m.userData; if (!m.visible) continue; u.t += dt; if (u.t >= u.life) { m.visible = false; continue; }
      if (u.trail) { const k = u.t / u.life, head = Math.min(u.d, u.t * u.speed * 1.5); m.position.copy(u.a); m.lookAt(u.b); m.scale.set(u.w * (1 + k * 2), u.w * (1 + k * 2), Math.max(0.01, head)); m.material.opacity = 0.8 * (1 - k); }
      else { const head = Math.min(u.d, u.t * u.speed), L = Math.min(u.d, 3.5, head), k = head >= u.d ? (u.t - u.d / u.speed) / 0.06 : 0; _v.copy(u.b).sub(u.a).normalize(); m.position.copy(u.a).addScaledVector(_v, head - L); m.lookAt(u.b); m.scale.set(u.w, u.w, Math.max(0.01, L * (1 - k))); m.material.opacity = 0.95 * (1 - k); } }
    if (this.flPool) for (const m of this.flPool) { if (!m.visible) continue; const u = m.userData; u.t += dt; if (u.t >= u.life) { m.visible = false; continue; } m.scale.setScalar(u.s * (1 + u.t / u.life)); m.material.opacity = 1 - u.t / u.life; }
    // the bits: thrown out, falling, shrinking away
    if (this.bitM) { let n = 0; this.bits = this.bits.filter(b => { b.t += dt; return b.t < b.life; });
      for (const b of this.bits) { b.v.y -= 7 * dt; b.p.addScaledVector(b.v, dt); const fl = this.floor(b.p.x, b.p.z); if (b.p.y < fl + 0.02) { b.p.y = fl + 0.02; b.v.multiplyScalar(0.3); }
        b.r += dt * 8; _q.setFromEuler(_eu.set(b.r, b.r * 0.7, 0)); _m.compose(b.p, _q, _s.setScalar(Math.max(0.01, 1 - b.t / b.life))); this.bitM.setMatrixAt(n, _m); this.bitM.setColorAt(n, _c.setHex(b.c)); n++; }
      this.bitM.count = n; this.bitM.instanceMatrix.needsUpdate = true; if (this.bitM.instanceColor) this.bitM.instanceColor.needsUpdate = true; }
    // the empties: out, down, a bounce and a tinkle, then lying there a while
    if (this.caseM) { let n = 0; this.cases = this.cases.filter(c => { c.t += dt; return c.t < c.life; });
      for (const c of this.cases) { if (c.bounced < 3) { c.v.y -= 9.8 * dt; c.p.addScaledVector(c.v, dt); c.r.x += c.w.x * dt; c.r.y += c.w.y * dt; const fl = this.floor(c.p.x, c.p.z) + 0.006;
          if (c.p.y < fl) { c.p.y = fl; c.v.y = -c.v.y * 0.35; c.v.x *= 0.5; c.v.z *= 0.5; c.w.multiplyScalar(0.4); c.bounced++; if (c.bounced === 1 && (this.caseT || 0) < t) { this.caseT = t + 0.06; sfx('sd_casing', c.p, 0.35); } if (c.bounced >= 3) { c.r.x = Math.PI / 2; c.r.z = 0; } } }
        _q.setFromEuler(c.r); _m.compose(c.p, _q, _s.setScalar(c.s * (c.t > c.life - 0.5 ? (c.life - c.t) / 0.5 : 1))); this.caseM.setMatrixAt(n, _m); this.caseM.setColorAt(n, _c.setHex(c.c)); n++; }
      this.caseM.count = n; this.caseM.instanceMatrix.needsUpdate = true; if (this.caseM.instanceColor) this.caseM.instanceColor.needsUpdate = true; }
    // the bang's fireball
    if (this.shots.length) this.shots = this.shots.filter(m => { const u = m.userData; u.t += dt; const k = u.t / u.life; if (k >= 1) { this.grp.remove(m); m.material.dispose(); return false; } m.material.opacity = 0.85 * (1 - k); m.scale.setScalar(0.5 + Math.sqrt(k) * 7); return true; });
    // the screen shaking (a phone or computer, near the bang)
    if (this.shake > 0) { const P = this.g.player; if (P.flatMode) { P.flatPitch += (Math.random() - 0.5) * 0.05 * this.shake; P.flatYaw += (Math.random() - 0.5) * 0.05 * this.shake; } this.shake = Math.max(0, this.shake - dt * 2.5); }
  },
  // everyone else's footsteps, from where they are (the louder the closer: you hear them coming round the corner)
  stepsTick() {
    if (!this.inRound()) return; const P = this.g.player.head, h = new THREE.Vector3();
    for (const [id, f] of this.F) { if (id === this.me || !f.alive || !this.headOf(id, h)) continue; const was = this.stepAt.get(id); if (!was) { this.stepAt.set(id, { x: h.x, z: h.z, acc: 0 }); continue; }
      const d = Math.hypot(h.x - was.x, h.z - was.z); was.x = h.x; was.z = h.z; if (d > 2) continue; was.acc += d;      // (a jump across the map isn't walking)
      if (was.acc > 1.45) { was.acc = 0; const far = Math.hypot(h.x - P.x, h.z - P.z); if (far < 22) sfx('sd_step', h.set(h.x, this.floor(h.x, h.z) + 0.05, h.z), 0.55 * (1 - far / 26)); } }
  },
  disposeFx() { for (const m of this.shots || []) m.material.dispose(); this.shots = []; },
};
export { GUN };
