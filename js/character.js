// Shared behaviour for every character (Tommy and the squad): a physics
// ragdoll body, a speech bubble in their colour, walking, poses, throwing
// things, getting hit / slapped / knocked out / grabbed, and getting back up.
// Tommy (tommy.js) and the squad (squad.js) build on this.
import * as THREE from 'three';
import { Ragdoll } from './ragdoll.js';
import { canvasTex, fitText, roundRect, blobTex } from './textures.js';
import { Dialogue, BANKS } from './dialogue.js';
import { sfx, babble } from './audio.js';
import { TUNING } from './config.js';
import { Item } from './foods.js';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion();
export const KO_IMPULSE = 6;          // N·s — anything harder than this knocks someone out

let starTex = null;

export class Character {
  // cfg: { id, name, color, body: {h, sw, girth, limb}, banks: { bank: [lines] }, spawn: [x, z, yaw] }
  constructor(scene, room, physics, cfg) {
    this.scene = scene;
    this.room = room;
    this.physics = physics;
    this.cfg = cfg;
    this.id = cfg.id;
    this.name = cfg.name;
    this.color = cfg.color || '#1f4fbf';
    this.dialogue = new Dialogue();
    this.banks = cfg.banks || {};
    this.rag = new Ragdoll(scene, physics, cfg.body || {});
    this.koMul = cfg.koMul || 1;

    this.fx = new THREE.Group(); scene.add(this.fx);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.004; this.fx.add(blob);

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

    // dizzy stars
    starTex = starTex || canvasTex(64, 64, (g) => { g.fillStyle = '#ffe14d'; g.font = '56px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', 32, 34); });
    this.stars = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false }));
      s.scale.setScalar(0.09); s.visible = false; scene.add(s); this.stars.push(s);
    }

    this.heldItem = null;      // mesh shown in the hand while winding up a throw
    this.state = 'enter';
    this.t = Math.random() * 10; this.stateT = 0;
    this.speakT = 0; this.speakPri = 0;
    this.moveTarget = null;
    this.nextMove = 8 + Math.random() * 6;
    this.quietT = Math.random() * 8;
    this.pendingLine = null;
    this.hits = 0;
    this.grabbedBy = 0;
    this.slapCool = 0;
    this.onThrow = null;        // (start, velocity, itemType, thrower) => item
    this.onEvent = null;        // (name, data) => void
    this.active = true;         // false = standing aside (doesn't wander or attack)
    this.setIdlePose(0);
    // keep animated characters inside the room and out of the furniture
    this.rag.constrain = (root) => {
      const b = this.room.bounds, m = 0.3;
      root.x = THREE.MathUtils.clamp(root.x, b.x0 + m, b.x1 - m);
      root.z = THREE.MathUtils.clamp(root.z, b.z0 + m, b.z1 - m);
      for (const k of this.room.blockers) {
        const p = 0.22;
        if (root.x > k.x0 - p && root.x < k.x1 + p && root.z > k.z0 - p && root.z < k.z1 + p) {
          const dl = root.x - (k.x0 - p), dr = (k.x1 + p) - root.x, dn = root.z - (k.z0 - p), df = (k.z1 + p) - root.z;
          const mn = Math.min(dl, dr, dn, df);
          if (mn === dl) root.x = k.x0 - p; else if (mn === dr) root.x = k.x1 + p; else if (mn === dn) root.z = k.z0 - p; else root.z = k.z1 + p;
        }
      }
    };
    const sp = cfg.spawn || [room.tommySpots[0].x, room.tommySpots[0].y, 0];
    this.rag.placeAt(sp[0], sp[1], sp[2] || 0);
  }

  // ---------------- convenience ----------------
  get pos() { return this.rag.pos('pelvis', this._pos || (this._pos = new THREE.Vector3())); }
  headPos(out) { return this.rag.pos('head', out); }
  get down() { return this.state === 'ko' || this.state === 'recover' || this.state === 'grabbed' || this.state === 'clinging'; }
  get busy() { return this.down || this.state === 'act' || this.state === 'windup' || this.state === 'throw'; }

  // ---------------- speech ----------------
  line(bank) {
    const own = this.banks[bank];
    if (own && own.length) {
      const fresh = own.filter(l => !this.dialogue.recent.includes(l));
      const pool = fresh.length ? fresh : own;
      const l = pool[Math.floor(Math.random() * pool.length)];
      this.dialogue.recent.push(l); if (this.dialogue.recent.length > 8) this.dialogue.recent.shift();
      return l;
    }
    if (BANKS[bank] && this.cfg.globalBanks) return this.dialogue.pick(bank);
    return null;
  }

  say(bankOrText, priority = null) {
    const isBank = !!(this.banks[bankOrText] || (this.cfg.globalBanks && BANKS[bankOrText]));
    const pri = priority ?? (isBank && BANKS[bankOrText] ? BANKS[bankOrText].pri : 3);
    if (this.speakT > 0.6 && pri < this.speakPri) return false;
    const text = isBank ? this.line(bankOrText) : (BANKS[bankOrText] || this.banks[bankOrText] ? null : bankOrText);
    if (!text) return false;
    this.drawBubble(text);
    this.bubble.visible = true;
    this.speakT = 2.2 + text.length * 0.055;
    this.speakPri = pri;
    this.quietT = 0;
    babble(this.headPos(_v), Math.min(14, 4 + Math.floor(text.length / 8)), this.cfg.voicePitch || 1);
    return true;
  }

  drawBubble(text) {
    const g = this.bubbleCanvas.getContext('2d'), w = 1024, h = 512;
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.25)'; roundRect(g, 26, 26, w - 40, h - 130, 60); g.fill();
    g.fillStyle = '#ffffff'; roundRect(g, 16, 16, w - 40, h - 130, 60); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 50, h - 116); g.lineTo(w / 2 + 30, h - 116); g.lineTo(w / 2 - 30, h - 20); g.closePath(); g.fill();
    g.lineWidth = 10; g.strokeStyle = this.color;
    roundRect(g, 16, 16, w - 40, h - 130, 60); g.stroke();
    g.beginPath(); g.moveTo(w / 2 - 50, h - 112); g.lineTo(w / 2 - 30, h - 20); g.lineTo(w / 2 + 30, h - 112); g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(w / 2 - 44, h - 125, 70, 14);
    g.font = '900 34px Arial'; g.fillStyle = this.color; g.textAlign = 'left'; g.fillText(this.name.toUpperCase(), 60, 66);
    fitText(g, text, 56, 84, w - 120, h - 230, 64, { color: '#111' });
    this.bubbleTex.needsUpdate = true;
  }

  // ---------------- getting hit ----------------
  partAt(pos, r) { return this.rag.nearestPart(pos, r); }

  hitBy(part, point, impulse, isVeg = false) {
    const mag = impulse.length();
    if (this.rag.mode === 'ragdoll') { this.rag.hit(part, point, impulse); return 'wobble'; }
    const ko = KO_IMPULSE * this.koMul;
    if (mag >= ko || part.name === 'head' && mag >= ko * 0.6) { this.knockOut(isVeg ? 'vegHit' : 'hit'); this.rag.hit(part, point, impulse); return 'ko'; }
    this.flinch(impulse, part.name === 'head' ? 1 : 0.6);
    if (!this.down && this.speakT <= 0.5 && Math.random() < 0.5) this.say(isVeg && this.banks.vegHit ? 'vegHit' : 'hit');
    return 'wobble';
  }

  slap(part, point, handVel) {
    if (this.slapCool > 0) return null;
    this.slapCool = 0.35;
    const speed = handVel.length();
    _v2.copy(handVel).multiplyScalar(2.2); _v2.y += speed * 0.4;
    if (this.state === 'clinging') { this.rag.hit(part, point, _v2); this.letGo(true); return 'ko'; }
    if (this.rag.mode === 'ragdoll') { this.rag.hit(part, point, _v2); return 'slap'; }
    if (speed > 3.2 * this.koMul && !this.down) { this.knockOut('slap'); this.rag.hit(part, point, _v2); return 'ko'; }
    this.flinch(_v2, part.name === 'head' ? 1 : 0.7);
    if (!this.down && speed > 1.5 && this.speakT <= 0.5) this.say(this.banks.slap ? 'slap' : 'hit', 4);
    return 'slap';
  }

  knockOut(line = 'hit') {
    if (!this.banks[line] && !(this.cfg.globalBanks && BANKS[line])) line = 'hit';
    this.hits++;
    this.dropHeld();
    this.cancelAction && this.cancelAction();
    this.state = 'ko'; this.stateT = 0;
    this.rag.setMode('ragdoll', 0);
    this.rag.moveVel.set(0, 0, 0);
    this.pendingLine = line;
    this.bubble.visible = false; this.speakT = 0;
    sfx('boing', this.headPos(_v), 1);
    this.onEvent && this.onEvent('ko', this);
  }

  grabbed() {
    this.grabbedBy++;
    if (this.state !== 'grabbed') {
      if (this.state === 'clinging') this.letGo(false);
      this.dropHeld();
      this.cancelAction && this.cancelAction();
      this.state = 'grabbed'; this.stateT = 0;
      this.rag.setMode('ragdoll', 0.25);
      this.rag.moveVel.set(0, 0, 0);
      this.say('grabbed', 5);
    }
  }
  released() {
    this.grabbedBy = Math.max(0, this.grabbedBy - 1);
    if (this.grabbedBy > 0 || this.state !== 'grabbed') return;
    const sp = this.rag.speed();
    this.state = 'ko'; this.stateT = sp > 3 ? 0 : 1.2;
    this.rag.setMode('ragdoll', 0);
    this.pendingLine = 'hit';
    if (sp > 5) this.say(this.banks.launched ? 'launched' : 'WORTH IIIIIIT!', 6);
    this.hits++;
    this.onEvent && this.onEvent('flung', this);
  }

  dropHeld() { if (this.heldItem) this.heldItem.visible = false; }

  // A light hit: an animated recoil away from the hit (no ragdoll)
  flinch(dir, amount = 0.7) {
    _v.copy(dir); _v.y = 0;
    if (_v.lengthSq() < 1e-6) _v.set(0, 0, -1);
    _v.normalize().applyAxisAngle(_v2.set(0, 1, 0), -this.rag.yaw);     // into their own frame
    this.flinchDir = { x: _v.x, z: _v.z, amount, t: 0 };
  }
  applyFlinch(dt) {
    const f = this.flinchDir;
    if (!f) return;
    f.t += dt;
    const k = f.t < 0.12 ? f.t / 0.12 : Math.max(0, 1 - (f.t - 0.12) / 0.45);
    if (k <= 0 && f.t > 0.2) { this.flinchDir = null; return; }
    const a = 0.35 * f.amount * k;
    // lean away from the hit: rotate about the axis perpendicular to it
    _q.setFromAxisAngle(_v.set(f.z, 0, -f.x).normalize(), a);
    this.rag.pose.chest.premultiply(_q);
    this.rag.pose.head.premultiply(_q).premultiply(_q);
    this.rag.root.x += f.x * 0.25 * dt * k * 6; this.rag.root.z += f.z * 0.25 * dt * k * 6;   // step back a touch
  }

  // ---------------- poses (target directions in their own frame, +Z = forward) ----------------
  setIdlePose(t) {
    const r = this.rag, breathe = Math.sin(t * 1.6) * 0.012, sway = Math.sin(t * 0.7) * 0.02;
    r.aim('uArmL', 0.1, -1, 0.0 + sway); r.aim('lArmL', 0.05, -1, 0.14);
    r.aim('uArmR', -0.1, -1, 0.0 - sway); r.aim('lArmR', -0.05, -1, 0.14);
    r.aim('uLegL', 0.015, -1, 0); r.aim('lLegL', 0.0, -1, 0.02);
    r.aim('uLegR', -0.015, -1, 0); r.aim('lLegR', 0.0, -1, 0.02);
    r.pose.pelvis.identity(); r.pose.chest.setFromAxisAngle(_v.set(1, 0, 0), breathe);
    r.bob = 0;
  }
  // each character can override this for their own idle (flexing, filming, holding a pint...)
  personalityPose(t) {}
  talkPose(t) {
    const g = Math.sin(t * 5);
    this.rag.aim('uArmL', 0.55, -0.55, 0.45); this.rag.aim('lArmL', 0.2, 0.15 + g * 0.25, 1);
  }
  // phase advances with distance walked, so feet don't slide
  walkPose(dt, speed = 0.9) {
    const r = this.rag, legLen = r.height * 0.5, A = 0.38;
    this.walkPhase = (this.walkPhase || 0) + dt * speed * Math.PI / (2 * legLen * Math.sin(A));
    const ph = this.walkPhase, s = Math.sin(ph), c = Math.cos(ph);
    const kneeL = Math.max(0, -c) * 0.55, kneeR = Math.max(0, c) * 0.55;   // swing leg bends its knee
    r.aim('uLegL', 0.015, -1, Math.tan(A * s)); r.aim('lLegL', 0, -1, Math.tan(A * s) - kneeL);
    r.aim('uLegR', -0.015, -1, -Math.tan(A * s)); r.aim('lLegR', 0, -1, -Math.tan(A * s) - kneeR);
    r.aim('uArmL', 0.1, -1, -0.35 * s); r.aim('lArmL', 0.05, -1, 0.2 - 0.25 * s);
    r.aim('uArmR', -0.1, -1, 0.35 * s); r.aim('lArmR', -0.05, -1, 0.2 + 0.25 * s);
    r.pose.chest.setFromAxisAngle(_v.set(0, 1, 0), s * 0.08);
    r.pose.pelvis.setFromAxisAngle(_v.set(0, 1, 0), -s * 0.06);
    r.bob = -Math.abs(s) * 0.025 * r.height / 1.68 + 0.01;
  }
  flailPose(t) {
    const r = this.rag;
    r.aim('uArmL', Math.cos(t * 9), Math.sin(t * 9), 0.3); r.aim('lArmL', Math.cos(t * 9 + 1), Math.sin(t * 9 + 1), 0.3);
    r.aim('uArmR', -Math.cos(t * 8), Math.sin(t * 8), 0.3); r.aim('lArmR', -Math.cos(t * 8 + 1), Math.sin(t * 8 + 1), 0.3);
    r.aim('uLegL', 0.1, -1, Math.sin(t * 12) * 0.9); r.aim('uLegR', -0.1, -1, -Math.sin(t * 12) * 0.9);
    r.aim('lLegL', 0, -1, Math.sin(t * 12 + 1) * 0.6); r.aim('lLegR', 0, -1, -Math.sin(t * 12 + 1) * 0.6);
  }
  windupPose() {
    const r = this.rag;
    r.aim('uArmR', -0.25, 0.75, -0.6); r.aim('lArmR', -0.1, 0.6, -0.8);
    r.pose.chest.setFromAxisAngle(_v.set(1, 0, 0), -0.15);
  }
  throwPose() {
    const r = this.rag;
    r.aim('uArmR', -0.15, 0.1, 1); r.aim('lArmR', -0.1, -0.2, 1);
    r.pose.chest.setFromAxisAngle(_v.set(1, 0, 0), 0.2);
  }

  // ---------------- behaviour ----------------
  // ctx: { head, fwd, mouth, player }
  update(dt, ctx) {
    const r = this.rag;
    this.t += dt; this.stateT += dt;
    if (this.slapCool > 0) this.slapCool -= dt;
    if (this.speakT > 0) { this.speakT -= dt; if (this.speakT <= 0) { this.bubble.visible = false; this.onSpeechEnd && this.onSpeechEnd(); } }
    else this.quietT += dt;

    const pos = this.pos, playerHead = ctx.head;
    _v.set(playerHead.x - pos.x, 0, playerHead.z - pos.z);
    const toPlayerYaw = Math.atan2(_v.x, _v.z);
    this.distToPlayer = _v.length();
    r.moveVel.set(0, 0, 0);

    switch (this.state) {
      case 'enter':
        this.setIdlePose(this.t); this.personalityPose(this.t);
        this.turnTo(toPlayerYaw, dt, 2);
        if (this.stateT > 1.0 + (this.cfg.enterDelay || 0)) { this.say('greet'); this.state = 'idle'; this.stateT = 0; }
        break;
      case 'idle':
        this.setIdlePose(this.t);
        this.personalityPose(this.t);
        if (this.speakT > 0 && !this.cfg.noTalkPose) this.talkPose(this.t);
        this.turnTo(toPlayerYaw, dt, 3);
        if (!this.active) break;
        this.nextMove -= dt;
        this.idleTick && this.idleTick(dt, ctx);
        if (this.state !== 'idle') break;
        this.closeT = this.distToPlayer < 0.8 ? (this.closeT || 0) + dt : 0;
        if (this.nextMove <= 0 || this.closeT > 3) { this.closeT = 0; this.pickSpot(playerHead, ctx.fwd); }
        if (this.quietT > (this.cfg.chatterEvery || 16) && this.speakT <= 0) this.say('chatter', 1);
        break;
      case 'walk': {
        _v2.set(this.moveTarget.x - pos.x, 0, this.moveTarget.y - pos.z);
        const d = _v2.length();
        if (d < 0.15 && this.path && this.path.length) { this.moveTarget = this.path.shift(); break; }   // next waypoint
        if (d < 0.15 || this.stateT > (this.walkLimit || 8)) { this.state = this.afterWalk || 'idle'; this.afterWalk = null; this.stateT = 0; this.nextMove = 8 + Math.random() * 8; break; }
        this.turnTo(Math.atan2(_v2.x, _v2.z), dt, 6);
        const sp = this.walkSpeed || 0.9;
        r.moveVel.copy(_v2.normalize()).multiplyScalar(Math.min(sp, d * 2.5));
        this.walkPose(dt, r.moveVel.length());
        break;
      }
      case 'windup':
        this.setIdlePose(this.t);
        this.turnTo(toPlayerYaw, dt, 6);
        this.windupPose();
        if (this.heldItem) this.heldItem.visible = true;
        if (this.stateT >= (this.throwSpec?.windup ?? 0.9)) this.release(ctx);
        break;
      case 'throw':
        this.setIdlePose(this.t);
        this.turnTo(toPlayerYaw, dt, 6);
        this.throwPose();
        if (this.stateT > 0.6) { this.state = 'idle'; this.stateT = 0; this.onEvent && this.onEvent('thrown', this); }
        break;
      case 'act':                    // character-specific move (see squad.js)
        this.actUpdate && this.actUpdate(dt, ctx);
        break;
      case 'clinging':               // hanging off Ronnie (Dylan)
        r.setMode('ragdoll', 0.25);
        this.flailPose(this.t);
        this.clingUpdate && this.clingUpdate(dt, ctx);
        break;
      case 'ko':                     // a proper limp ragdoll
        if (this.stateT > (this.cfg.koTime || 2.2)) { this.state = 'recover'; this.stateT = 0; this.setIdlePose(this.t); r.pose.head.identity(); r.getUp(0.9); }
        break;
      case 'recover':                // blend from where they landed back to standing
        this.setIdlePose(this.t);
        if (r.mode === 'anim') {
          this.state = 'idle'; this.stateT = 0;
          if (this.pendingLine) { this.say(this.pendingLine, 4); this.pendingLine = null; }
          this.onEvent && this.onEvent('up', this);
        }
        break;
      case 'grabbed':
        this.flailPose(this.t);
        break;
    }

    // head turns smoothly to look at the player (within reason)
    if (!this.down) {
      const rel = this.lookOverride != null ? this.lookOverride : THREE.MathUtils.clamp(wrapAngle(toPlayerYaw - r.yaw), -0.8, 0.8);
      this.headYaw = (this.headYaw || 0) + (rel - (this.headYaw || 0)) * Math.min(1, dt * 5);
      r.pose.head.setFromAxisAngle(_v.set(0, 1, 0), this.headYaw);
      this.applyFlinch(dt);
    }
    // animated characters walk by moving their feet (root); ragdolls are left to physics
    if (r.mode !== 'ragdoll') {
      r.root.x += r.moveVel.x * dt; r.root.z += r.moveVel.z * dt;
      r.animate(dt);
    }
    r.sync();
    this.afterUpdate && this.afterUpdate(dt, ctx);

    this.fx.position.set(pos.x, 0, pos.z);
    const head = this.headPos(_v);
    this.bubble.position.set(head.x, Math.max(head.y, 0.7) + 0.55, head.z);
    this.updateStars(this.state === 'ko' || (this.state === 'recover' && this.stateT < 0.6), head);
    if (this.heldItem && this.heldItem.visible) r.tip('lArmR', this.heldItem.position);
  }

  turnTo(yaw, dt, speed) { this.rag.yaw += wrapAngle(yaw - this.rag.yaw) * Math.min(1, dt * speed); }

  yawFromBody() {
    const q = this.rag.parts.pelvis.body.quaternion; _q.set(q.x, q.y, q.z, q.w);
    _v.set(0, 0, 1).applyQuaternion(_q);
    if (Math.abs(_v.y) < 0.9) this.rag.yaw = Math.atan2(_v.x, _v.z);
  }

  updateStars(on, head) {
    this.stars.forEach((s, i) => {
      s.visible = on;
      if (!on) return;
      const a = this.t * 5 + i * Math.PI * 2 / 3;
      s.position.set(head.x + Math.cos(a) * 0.16, head.y + 0.16, head.z + Math.sin(a) * 0.16);
    });
  }

  // Walk somewhere (x, z); state goes back to idle (or `after`) on arrival.
  goTo(x, z, speed = 0.9, after = null) {
    // big levels: follow a path round the furniture
    const nav = this.room.nav, pos = this.pos;
    this.path = nav ? nav.path(pos.x, pos.z, x, z) : null;
    if (this.path && this.path.length) { this.moveTarget = this.path.shift(); this.walkLimit = 8 + Math.hypot(x - pos.x, z - pos.z) * 1.6; }
    else { this.moveTarget = new THREE.Vector2(x, z); this.walkLimit = 8; }
    this.walkSpeed = speed;
    this.afterWalk = after;
    this.state = 'walk'; this.stateT = 0;
  }

  pickSpot(playerHead, playerFwd) {
    const pos = this.pos;
    let best = null, bestScore = -Infinity, fallback = null, fd = Infinity;
    for (const s of this.room.tommySpots) {
      const dx = s.x - playerHead.x, dz = s.y - playerHead.z;
      const d = Math.hypot(dx, dz);
      const self = Math.hypot(s.x - pos.x, s.y - pos.z);
      if (self < fd && self > 0.3) { fd = self; fallback = s; }
      if (d < 1.4 || self < 0.3) continue;
      if (this.othersNear && this.othersNear(s)) continue;
      if (!this.room.nav && !this.pathClear(pos.x, pos.z, s.x, s.y)) continue;
      if (this.room.nav && d > 9) continue;   // big levels: hang around within sight of Ronnie
      const facing = (dx * playerFwd.x + dz * playerFwd.z) / d;
      const score = facing * 2 + Math.random();
      if (score > bestScore) { bestScore = score; best = s; }
    }
    this.nextMove = 6 + Math.random() * 6;
    best = best || (Math.hypot(pos.x - playerHead.x, pos.z - playerHead.z) < 0.8 ? fallback : null);
    if (!best) return;
    this.goTo(best.x, best.y, 0.9);
  }

  pathClear(x0, z0, x1, z1) {
    const pad = 0.25;
    for (let i = 1; i <= 20; i++) {
      const t = i / 20, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      for (const b of this.room.blockers) if (x > b.x0 - pad && x < b.x1 + pad && z > b.z0 - pad && z < b.z1 + pad) return false;
    }
    return true;
  }

  // ---------------- throwing things at Ronnie ----------------
  // spec: { item: 'broccoli', speed: 3, windup: 0.9, line: 'vegThrow', target: 'mouth' | 'chest' }
  startThrow(spec) {
    if (this.down) return false;
    this.throwSpec = spec;
    if (!this.heldItem || this.heldItemType !== spec.item) {
      if (this.heldItem) this.scene.remove(this.heldItem);
      this.heldItem = new Item(spec.item).obj; this.heldItem.scale.setScalar(1); this.scene.add(this.heldItem);
      this.heldItemType = spec.item;
    }
    this.heldItem.visible = false;
    if (spec.line) this.say(spec.line, 3);
    this.state = 'windup'; this.stateT = 0;
    return true;
  }

  release(ctx) {
    const spec = this.throwSpec || { item: 'broccoli', speed: TUNING.broccoliSpeed };
    if (this.heldItem) this.heldItem.visible = false;
    this.state = 'throw'; this.stateT = 0;
    const start = this.rag.tip('lArmR', new THREE.Vector3());
    start.y = Math.max(start.y, 1.2);
    const target = _v.copy(spec.target === 'chest' ? ctx.head : ctx.mouth);
    if (spec.target === 'chest') target.y -= 0.35;
    if (spec.spread) { target.x += (Math.random() - 0.5) * spec.spread; target.z += (Math.random() - 0.5) * spec.spread; }
    const vel = ballistic(start, target, spec.speed || TUNING.broccoliSpeed, this.room.bounds.y1);
    sfx('whoosh', start, 0.8);
    this.onThrow && this.onThrow(start, vel, spec.item, this, spec);
  }
}

// Velocity for a lob from start to target at roughly `speed` m/s horizontally, under the ceiling.
export function ballistic(start, target, speed, ceiling) {
  const dist = Math.hypot(target.x - start.x, target.z - start.z);
  let T = THREE.MathUtils.clamp(dist / speed, 0.45, 1.3);
  for (let i = 0; i < 20; i++) {
    const vy = (target.y - start.y) / T - 0.5 * TUNING.gravity * T;
    if (vy <= 0 || start.y + (vy * vy) / (-2 * TUNING.gravity) < ceiling - 0.2) break;
    T *= 0.92;
  }
  return new THREE.Vector3((target.x - start.x) / T, (target.y - start.y) / T - 0.5 * TUNING.gravity * T, (target.z - start.z) / T);
}

export function wrapAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
