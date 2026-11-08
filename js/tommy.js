// TOMMY — Ronnie's best mate. 168cm, white T, black joggers, brown curtains,
// neat beard, personal spotlight, one day older. Roasts you constantly and
// throws broccoli "just trying to help".
import * as THREE from 'three';
import { part, merge, vcLambert, box, cyl, sph } from './geo.js';
import { canvasTex, fitText, roundRect, blobTex, beamTex } from './textures.js';
import { Dialogue, BANKS } from './dialogue.js';
import { sfx, babble } from './audio.js';
import { TUNING } from './config.js';
import { Item } from './foods.js';

const SKIN = 0xe8b896, HAIR = 0x7a4f2a, BEARD = 0x8b5e34, SHIRT = 0xfafafa, JOG = 0x1c1c1c, SHOE = 0xffffff;
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();

export class Tommy {
  constructor(scene, room) {
    this.scene = scene;
    this.room = room;
    this.dialogue = new Dialogue();
    this.root = new THREE.Group();
    this.body = new THREE.Group();            // pivot at the feet (for falling over)
    this.root.add(this.body);
    this.buildModel();
    scene.add(this.root);

    // personal spotlight that follows him everywhere (section 2.2)
    this.spot = new THREE.SpotLight(0xfff0d0, 9, 5, 0.42, 0.7, 1.2);
    scene.add(this.spot, this.spot.target);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.75, 2.5, 20, 1, true),
      new THREE.MeshBasicMaterial({ map: beamTex(), color: 0xfff2d0, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.position.y = 1.3;
    this.root.add(cone);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.004;
    this.root.add(blob);

    // speech bubble
    this.bubbleCanvas = document.createElement('canvas');
    this.bubbleCanvas.width = 1024; this.bubbleCanvas.height = 512;
    this.bubbleTex = new THREE.CanvasTexture(this.bubbleCanvas);
    this.bubbleTex.colorSpace = THREE.SRGBColorSpace;
    this.bubbleTex.generateMipmaps = false; this.bubbleTex.minFilter = THREE.LinearFilter;
    this.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.bubbleTex, transparent: true, depthTest: false, depthWrite: false }));
    this.bubble.renderOrder = 12;
    this.bubble.scale.set(1.2, 0.6, 1);
    this.bubble.visible = false;
    scene.add(this.bubble);

    // dizzy stars + teeth sparkle
    const starTex = canvasTex(64, 64, (g) => { g.fillStyle = '#ffe14d'; g.font = '56px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', 32, 34); });
    this.stars = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false }));
      s.scale.setScalar(0.09); s.visible = false; scene.add(s); this.stars.push(s);
    }
    const sparkTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.2, 'rgba(255,255,255,0.8)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); g.fillStyle = '#fff'; g.fillRect(30, 0, 4, 64); g.fillRect(0, 30, 64, 4); });
    this.sparkle = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.sparkle.scale.setScalar(0.12); this.sparkle.visible = false;
    this.head.add(this.sparkle); this.sparkle.position.set(0.0, -0.045, 0.11);

    // state
    this.state = 'enter';
    this.t = 0;
    this.stateT = 0;
    this.speakT = 0; this.speakPri = 0;
    this.sparkT = 0;
    this.moveTarget = null;
    this.nextMove = 10;
    this.attackTimer = TUNING.firstAttackDelay;
    this.quietT = 0;
    this.pendingLine = null;
    this.hits = 0;
    this.onThrow = null;      // (startPos, velocity) => void
    this.root.position.set(room.tommySpots[0].x, 0, room.tommySpots[0].y);
    this.root.rotation.y = Math.PI / 2;
  }

  buildModel() {
    const p = [];
    // trainers + joggers + hips
    for (const s of [-1, 1]) {
      p.push(part(box(0.11, 0.07, 0.27), SHOE, [s * 0.095, 0.035, 0.03]));
      p.push(part(box(0.112, 0.02, 0.272), 0xdddddd, [s * 0.095, 0.01, 0.03]));
    }
    p.push(part(box(0.33, 0.16, 0.2), JOG, [0, 0.9, 0]));
    // torso (fitted white T) with a visible six-pack
    p.push(part(new THREE.CapsuleGeometry(0.16, 0.34, 6, 14), SHIRT, [0, 1.17, 0], [0, 0, 0], [1.05, 1, 0.66]));
    p.push(part(box(0.44, 0.1, 0.17), SHIRT, [0, 1.36, 0]));                                   // shoulders
    for (let r = 0; r < 3; r++) for (const s of [-1, 1])
      p.push(part(box(0.052, 0.05, 0.012), 0xe9e9e9, [s * 0.032, 1.02 + r * 0.065, 0.1]));
    p.push(part(box(0.2, 0.08, 0.012), 0xececec, [0, 1.25, 0.1]));                           // pecs
    // left arm (static), short sleeve
    p.push(part(cyl(0.055, 0.05, 0.14, 10), SHIRT, [-0.25, 1.32, 0], [0, 0, 0.12]));
    p.push(part(cyl(0.042, 0.036, 0.5, 10), SKIN, [-0.27, 1.02, 0.02], [0, 0, 0.06]));
    p.push(part(sph(0.045), SKIN, [-0.285, 0.75, 0.03]));
    // neck
    p.push(part(cyl(0.05, 0.055, 0.1, 10), SKIN, [0, 1.46, 0]));
    this.body.add(new THREE.Mesh(merge(p), vcLambert));

    // legs (for walking swing)
    this.legs = [];
    for (const s of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(s * 0.095, 0.86, 0);
      leg.add(new THREE.Mesh(merge([part(cyl(0.07, 0.055, 0.8, 10), JOG, [0, -0.41, 0])]), vcLambert));
      this.body.add(leg); this.legs.push(leg);
    }
    // right arm (throwing arm) pivots at the shoulder
    this.arm = new THREE.Group(); this.arm.position.set(0.25, 1.36, 0);
    this.arm.add(new THREE.Mesh(merge([
      part(cyl(0.055, 0.05, 0.14, 10), SHIRT, [0, -0.04, 0]),
      part(cyl(0.042, 0.036, 0.5, 10), SKIN, [0.01, -0.33, 0.02]),
      part(sph(0.045), SKIN, [0.012, -0.6, 0.03]),
    ]), vcLambert));
    this.hand = new THREE.Object3D(); this.hand.position.set(0.012, -0.63, 0.06); this.arm.add(this.hand);
    this.heldVeg = new Item('broccoli').obj; this.heldVeg.scale.setScalar(1); this.heldVeg.visible = false;
    this.heldVeg.position.set(0, -0.03, 0); this.hand.add(this.heldVeg);
    this.body.add(this.arm);
    this.arm.rotation.z = 0.06;

    // head with beard and the perfect curtains
    this.head = new THREE.Group(); this.head.position.set(0, 1.58, 0.0);
    const h = [];
    h.push(part(sph(0.105, 18, 14), SKIN, [0, 0, 0], [0, 0, 0], [0.9, 1.06, 0.98]));
    h.push(part(new THREE.SphereGeometry(0.104, 16, 10, 0, Math.PI, Math.PI * 0.52, Math.PI * 0.38), BEARD, [0, -0.004, 0.006], [0, 0, 0], [0.94, 1.07, 1.01]));
    h.push(part(box(0.06, 0.012, 0.02), BEARD, [0, -0.032, 0.095]));                           // moustache
    h.push(part(box(0.045, 0.012, 0.01), 0xffffff, [0, -0.05, 0.1]));                          // sparkling teeth
    h.push(part(new THREE.SphereGeometry(0.112, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), HAIR, [0, 0.012, -0.004], [0, 0, 0], [0.93, 1.05, 1.0]));
    for (const s of [-1, 1]) {
      h.push(part(sph(0.06, 12, 8), HAIR, [s * 0.045, 0.06, 0.06], [0.3, 0, s * -0.6], [1.0, 0.45, 0.75])); // curtains
      h.push(part(sph(0.012, 8, 6), 0x2a1a10, [s * 0.034, 0.012, 0.095]));                                // eyes
      h.push(part(box(0.035, 0.008, 0.01), 0x5a3a20, [s * 0.034, 0.034, 0.098], [0, 0, s * 0.12]));      // brows
      h.push(part(sph(0.02, 8, 6), SKIN, [s * 0.094, 0.0, 0.0]));                                         // ears
    }
    h.push(part(box(0.016, 0.03, 0.02), 0xdca686, [0, -0.008, 0.105]));                       // nose
    this.head.add(new THREE.Mesh(merge(h), vcLambert));
    this.body.add(this.head);
  }

  // ---------------- speech ----------------
  say(bankOrText, priority = null) {
    const isBank = !!BANKS[bankOrText];
    const pri = priority ?? (isBank ? BANKS[bankOrText].pri : 2);
    if (this.speakT > 0.6 && pri < this.speakPri) return false;
    const text = isBank ? this.dialogue.pick(bankOrText) : bankOrText;
    this.drawBubble(text);
    this.bubble.visible = true;
    this.speakT = 2.2 + text.length * 0.055;
    this.speakPri = pri;
    this.quietT = 0;
    this.head.getWorldPosition(_v);
    babble(_v, Math.min(14, 4 + Math.floor(text.length / 8)));
    return true;
  }

  drawBubble(text) {
    const g = this.bubbleCanvas.getContext('2d'), w = 1024, h = 512;
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.25)'; roundRect(g, 26, 26, w - 40, h - 130, 60); g.fill();
    g.fillStyle = '#ffffff'; roundRect(g, 16, 16, w - 40, h - 130, 60); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 50, h - 116); g.lineTo(w / 2 + 30, h - 116); g.lineTo(w / 2 - 30, h - 20); g.closePath(); g.fill();
    g.lineWidth = 10; g.strokeStyle = '#111';
    roundRect(g, 16, 16, w - 40, h - 130, 60); g.stroke();
    g.beginPath(); g.moveTo(w / 2 - 50, h - 112); g.lineTo(w / 2 - 30, h - 20); g.lineTo(w / 2 + 30, h - 112); g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(w / 2 - 44, h - 125, 70, 14);
    g.font = '900 34px Arial'; g.fillStyle = '#1f4fbf'; g.textAlign = 'left'; g.fillText('TOMMY', 60, 66);
    fitText(g, text, 56, 84, w - 120, h - 230, 64, { color: '#111' });
    this.bubbleTex.needsUpdate = true;
  }

  // ---------------- getting hit ----------------
  // Capsule test: is a sphere at pos (radius r) touching Tommy?
  hitTest(pos, r) {
    if (this.state === 'fallen' || this.state === 'getup') return false;
    const base = this.root.position;
    const y = THREE.MathUtils.clamp(pos.y, 0.2, 1.62);
    const dx = pos.x - base.x, dz = pos.z - base.z, dy = pos.y - y;
    const rr = (y > 1.45 ? 0.13 : 0.22) + r;
    return dx * dx + dz * dz + dy * dy < rr * rr;
  }

  knockDown(fromDir, isVeg = false) {
    this.hits++;
    this.heldVeg.visible = false;
    this.state = 'fallen';
    this.stateT = 0;
    this.fallDir = Math.atan2(fromDir.x, fromDir.z) - this.root.rotation.y;
    this.pendingLine = isVeg ? 'vegHit' : 'hit';
    this.bubble.visible = false; this.speakT = 0;
    this.head.getWorldPosition(_v);
    sfx('boing', _v, 1);
  }

  headPos(out) { return this.head.getWorldPosition(out); }

  // ---------------- behaviour ----------------
  update(dt, playerHead, playerFwd, mouth) {
    this.t += dt; this.stateT += dt;
    if (this.speakT > 0) { this.speakT -= dt; if (this.speakT <= 0) { this.bubble.visible = false; if (this.speakPri >= 2 && Math.random() < 0.5) this.flashTeeth(); } }
    else this.quietT += dt;
    if (this.sparkT > 0) { this.sparkT -= dt; this.sparkle.visible = this.sparkT > 0; this.sparkle.material.rotation += dt * 6; }

    const pos = this.root.position;
    _v.set(playerHead.x - pos.x, 0, playerHead.z - pos.z);
    const toPlayerYaw = Math.atan2(_v.x, _v.z);
    const distToPlayer = _v.length();

    // body pose defaults
    let bodyTilt = 0, armX = 0, legSwing = 0;

    switch (this.state) {
      case 'enter':      // leaning in the doorway, spotlight on
        this.turnTo(toPlayerYaw, dt, 4);
        bodyTilt = -0.12;
        if (this.stateT > 1.2) { this.say('greet'); this.state = 'idle'; this.stateT = 0; this.nextMove = 9; }
        break;
      case 'idle': {
        this.turnTo(toPlayerYaw, dt, 3);
        this.nextMove -= dt;
        this.attackTimer -= dt;
        if (this.attackTimer <= 0 && distToPlayer > 1.2) { this.startWindup(); break; }
        if (this.nextMove <= 0 || distToPlayer < 1.1) this.pickSpot(playerHead, playerFwd);
        if (this.quietT > 14 && this.speakT <= 0) this.say(Math.random() < 0.25 ? 'idle' : 'chatter');
        break;
      }
      case 'walk': {
        _v2.set(this.moveTarget.x - pos.x, 0, this.moveTarget.y - pos.z);
        const d = _v2.length();
        if (d < 0.05) { this.state = 'idle'; this.stateT = 0; this.nextMove = 8 + Math.random() * 8; break; }
        this.turnTo(Math.atan2(_v2.x, _v2.z), dt, 8);
        const step = Math.min(d, 1.1 * dt);
        pos.addScaledVector(_v2.normalize(), step);
        legSwing = Math.sin(this.t * 9) * 0.45;
        this.attackTimer -= dt * 0.5;
        break;
      }
      case 'windup': {   // telegraphed: arm goes back over his head, broccoli in hand
        this.turnTo(toPlayerYaw, dt, 8);
        const k = Math.min(1, this.stateT / 0.9);
        armX = -2.6 * easeInOut(k);
        bodyTilt = -0.1 * k;
        this.heldVeg.visible = true;
        if (this.stateT >= 0.9) this.release(mouth);
        break;
      }
      case 'throw': {
        this.turnTo(toPlayerYaw, dt, 6);
        const k = Math.min(1, this.stateT / 0.35);
        armX = -2.6 + 3.6 * easeOutQuad(k);
        bodyTilt = 0.12 * (1 - k);
        if (this.stateT > 0.6) { this.state = 'idle'; this.stateT = 0; }
        break;
      }
      case 'fallen': {   // flop over backwards, see stars
        const k = Math.min(1, this.stateT / 0.35);
        // topple in the direction the food was travelling
        this.body.rotation.x = 1.45 * easeOutBounce(k) * Math.cos(this.fallDir);
        this.body.rotation.z = -1.45 * easeOutBounce(k) * Math.sin(this.fallDir);
        armX = -1.2;
        this.updateStars(true);
        if (this.stateT > 2.0) { this.state = 'getup'; this.stateT = 0; this.fallX = this.body.rotation.x; this.fallZ = this.body.rotation.z; }
        break;
      }
      case 'getup': {
        const k = Math.min(1, this.stateT / 0.6);
        this.body.rotation.x = this.fallX * (1 - easeInOut(k));
        this.body.rotation.z = this.fallZ * (1 - easeInOut(k));
        this.updateStars(k < 0.7);
        if (k >= 1) {
          this.state = 'idle'; this.stateT = 0; this.updateStars(false);
          this.body.rotation.set(0, 0, 0);
          if (this.pendingLine) { this.say(this.pendingLine); this.pendingLine = null; }
          this.attackTimer = Math.max(this.attackTimer, 6);
        }
        break;
      }
    }

    if (this.state !== 'fallen' && this.state !== 'getup') {
      this.body.rotation.x = bodyTilt;
      this.body.rotation.z = 0;
      // breathing + smug little bob while talking
      this.body.position.y = Math.sin(this.t * 2.2) * 0.004 + (this.speakT > 0 ? Math.abs(Math.sin(this.t * 7)) * 0.006 : 0);
    }
    this.arm.rotation.x = armX;
    this.legs[0].rotation.x = legSwing; this.legs[1].rotation.x = -legSwing;

    // head tracks the player
    let rel = wrapAngle(toPlayerYaw - this.root.rotation.y);
    this.head.rotation.y = THREE.MathUtils.clamp(rel, -0.9, 0.9);
    this.head.rotation.x = -0.08;

    // spotlight follows
    this.spot.position.set(pos.x, 2.55, pos.z + 0.01);
    this.spot.target.position.set(pos.x, 0, pos.z);

    // bubble above head
    this.head.getWorldPosition(_v);
    this.bubble.position.set(_v.x, Math.max(_v.y, 1.2) + 0.5, _v.z);
  }

  turnTo(yaw, dt, speed) {
    const d = wrapAngle(yaw - this.root.rotation.y);
    this.root.rotation.y += d * Math.min(1, dt * speed);
  }

  flashTeeth() {
    this.sparkT = 0.5; this.sparkle.visible = true;
    this.head.getWorldPosition(_v); sfx('ting', _v, 0.8);
  }

  updateStars(on) {
    this.head.getWorldPosition(_v);
    this.stars.forEach((s, i) => {
      s.visible = on;
      if (!on) return;
      const a = this.t * 5 + i * Math.PI * 2 / 3;
      s.position.set(_v.x + Math.cos(a) * 0.16, _v.y + 0.14, _v.z + Math.sin(a) * 0.16);
    });
  }

  // Pick a hang-out spot away from the player, preferably in front of them.
  pickSpot(playerHead, playerFwd) {
    const pos = this.root.position;
    let best = null, bestScore = -Infinity;
    for (const s of this.room.tommySpots) {
      const dx = s.x - playerHead.x, dz = s.y - playerHead.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.4 || Math.hypot(s.x - pos.x, s.y - pos.z) < 0.3) continue;
      if (!this.pathClear(pos.x, pos.z, s.x, s.y)) continue;
      const facing = (dx * playerFwd.x + dz * playerFwd.z) / d;
      const score = facing * 2 + Math.random();
      if (score > bestScore) { bestScore = score; best = s; }
    }
    this.nextMove = 6 + Math.random() * 6;
    if (!best) return;
    this.moveTarget = best;
    this.state = 'walk'; this.stateT = 0;
  }

  pathClear(x0, z0, x1, z1) {
    const pad = 0.22;
    for (let i = 1; i <= 20; i++) {
      const t = i / 20, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      for (const b of this.room.blockers) if (x > b.x0 - pad && x < b.x1 + pad && z > b.z0 - pad && z < b.z1 + pad) return false;
    }
    return true;
  }

  startWindup() {
    this.say('vegThrow');
    this.state = 'windup'; this.stateT = 0;
    const [a, b] = TUNING.attackInterval;
    this.attackTimer = a + Math.random() * (b - a);
  }

  release(mouth) {
    this.heldVeg.visible = false;
    this.state = 'throw'; this.stateT = 0;
    this.arm.rotation.x = -2.6;
    this.root.updateMatrixWorld(true);
    const start = this.hand.getWorldPosition(new THREE.Vector3());
    start.y += 0.1;
    // aim at the mouth with a ballistic arc that stays under the 2.6m ceiling
    const target = _v.copy(mouth);
    const dist = Math.hypot(target.x - start.x, target.z - start.z);
    let T = THREE.MathUtils.clamp(dist / TUNING.broccoliSpeed, 0.5, 1.2);
    for (let i = 0; i < 20; i++) {
      const vy = (target.y - start.y) / T - 0.5 * TUNING.gravity * T;
      if (vy <= 0 || start.y + (vy * vy) / (-2 * TUNING.gravity) < this.room.bounds.y1 - 0.2) break;
      T *= 0.92;
    }
    const vel = new THREE.Vector3(
      (target.x - start.x) / T,
      (target.y - start.y) / T - 0.5 * TUNING.gravity * T,
      (target.z - start.z) / T,
    );
    sfx('whoosh', start, 0.8);
    this.onThrow && this.onThrow(start, vel);
  }
}

function wrapAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }
function easeOutBounce(x) {
  const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}
