// TOMMY — Ronnie's best mate, one day older. Now a full physics ragdoll built
// from his own 3D model (assets/tommy.glb), animated Gang Beasts style: no
// canned animations, just muscles pulling his limbs toward poses. Knock him
// over with food, slap him, grab him and fling him — he always gets back up
// "just trying to help".
import * as THREE from 'three';
import { Ragdoll } from './ragdoll.js';
import { canvasTex, fitText, roundRect, blobTex, beamTex } from './textures.js';
import { Dialogue, BANKS } from './dialogue.js';
import { sfx, babble } from './audio.js';
import { TUNING } from './config.js';
import { Item } from './foods.js';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion();
const KO_IMPULSE = 6;          // N·s — anything harder than this knocks him out
const MODEL_URL = './assets/tommy.glb';

export class Tommy {
  constructor(scene, room, physics) {
    this.scene = scene;
    this.room = room;
    this.dialogue = new Dialogue();
    this.rag = new Ragdoll(scene, physics);

    // personal spotlight that follows him everywhere (section 2.2)
    this.spot = new THREE.SpotLight(0xfff0d0, 9, 5, 0.42, 0.7, 1.2);
    scene.add(this.spot, this.spot.target);
    this.fx = new THREE.Group(); scene.add(this.fx);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.75, 2.5, 20, 1, true),
      new THREE.MeshBasicMaterial({ map: beamTex(), color: 0xfff2d0, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.position.y = 1.3; this.fx.add(cone);
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

    // dizzy stars + teeth sparkle
    const starTex = canvasTex(64, 64, (g) => { g.fillStyle = '#ffe14d'; g.font = '56px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', 32, 34); });
    this.stars = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false }));
      s.scale.setScalar(0.09); s.visible = false; scene.add(s); this.stars.push(s);
    }
    const sparkTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.2, 'rgba(255,255,255,0.8)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); g.fillStyle = '#fff'; g.fillRect(30, 0, 4, 64); g.fillRect(0, 30, 64, 4); });
    this.sparkle = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.sparkle.scale.setScalar(0.12); this.sparkle.visible = false; scene.add(this.sparkle);

    // the broccoli he's about to throw
    this.heldVeg = new Item('broccoli').obj; this.heldVeg.scale.setScalar(1); this.heldVeg.visible = false;
    scene.add(this.heldVeg);

    // state
    this.state = 'enter';
    this.t = 0; this.stateT = 0;
    this.speakT = 0; this.speakPri = 0;
    this.sparkT = 0;
    this.moveTarget = null;
    this.nextMove = 10;
    this.attackTimer = TUNING.firstAttackDelay;
    this.quietT = 0;
    this.pendingLine = null;
    this.hits = 0;
    this.grabbedBy = 0;
    this.slapCool = 0;
    this.onThrow = null;      // (startPos, velocity) => void
    this.setIdlePose(0);
    this.rag.placeAt(room.tommySpots[0].x, room.tommySpots[0].y, Math.PI / 2);
    this.ready = false;
  }

  async load() {
    try { await this.rag.loadModel(MODEL_URL); this.addEyes(); }
    catch (e) { console.warn('Tommy model failed to load, using blocks', e); this.buildFallback(); }
    this.ready = true;
  }

  // Eyes, modelled on photos of the real Tommy: blue-grey irises, heavy upper
  // lids that cover the top of the iris, lower lids that just meet it, set
  // back in the sockets. The face mesh has small openings cut where the eyes
  // go; behind each sits a rotating eyeball, wrapped by skin-coloured upper
  // and lower lids whose edges form the almond shape. He looks at Ronnie,
  // blinks, and goes droopy-eyed and dizzy when knocked out.
  addEyes() {
    const headBone = this.rag.bones[this.rag.list.findIndex(p => p.name === 'head')];
    const EYE_R = 0.0118, LID_R = 0.0127;
    const ballMat = new THREE.MeshPhongMaterial({ map: eyeTexture(), shininess: 70, specular: 0x555555 });
    const ballGeo = new THREE.SphereGeometry(EYE_R, 40, 24);
    // skin colour matched to the baked texture around his eyes (and the body material's lighting)
    const skin = new THREE.Color().setRGB(188 / 255, 129 / 255, 115 / 255, THREE.SRGBColorSpace);
    const lidMat = new THREE.MeshLambertMaterial({ color: skin.clone().multiply(new THREE.Color(0xe6e6e6)), emissive: skin.clone().multiply(new THREE.Color(0x3a3a3a)) });
    const lashMat = new THREE.MeshLambertMaterial({ color: 0x23170f });
    const socketGeo = new THREE.SphereGeometry(1, 24, 16);
    const socketMat = new THREE.MeshLambertMaterial({ color: skin.clone().multiplyScalar(0.45), side: THREE.BackSide });
    const rimMat = new THREE.MeshLambertMaterial({ color: 0x9c6457 });
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
    // A lid is a spherical cap around a tilted pole; tilting the pole backwards makes
    // its edge curve down (upper lid) or up (lower lid) toward the corners = almond.
    const cap = (r, theta, mat) => new THREE.Mesh(new THREE.SphereGeometry(r, 36, 14, 0, Math.PI * 2, 0, theta), mat);
    const UP = new THREE.Vector3(0, 1, 0);
    const lid = (upper) => {
      const tilt = upper ? 0.42 : 0.45, edge = upper ? 0.235 : -0.43;          // edge = elevation where it crosses the front
      const theta = tilt + Math.PI / 2 - Math.abs(edge);
      const g = new THREE.Group();
      const inner = new THREE.Group();
      inner.quaternion.setFromUnitVectors(UP, new THREE.Vector3(0, upper ? Math.cos(tilt) : -Math.cos(tilt), -Math.sin(tilt)));
      inner.add(cap(LID_R, theta, lidMat));
      inner.add(cap(LID_R - 0.00007, theta + (upper ? 0.075 : 0.03), upper ? lashMat : rimMat));   // lash line / lower lid rim
      g.add(inner);
      return g;
    };
    this.eyes = [-1, 1].map(side => {
      const eye = new THREE.Group();
      eye.position.set(side * 0.032, 0.0075, 0.0832);  // head-bone space: lids flush with the skin, eyeball just behind
      eye.rotation.y = side * 0.08;                    // follow the curve of the face a little
      const ball = new THREE.Mesh(ballGeo, ballMat);
      const upper = lid(true), lower = lid(false);
      const socket = new THREE.Mesh(socketGeo, socketMat);   // inside of the socket, so you never see through the head at an angle
      socket.scale.set(0.021, 0.014, 0.03); socket.position.z = -0.0195;   // wide, deep egg behind the skin: catches every sightline through the opening
      const glint = new THREE.Mesh(new THREE.CircleGeometry(0.0007, 10), glintMat);
      glint.position.set(0.0022, 0.0019, EYE_R + 0.0001);
      eye.add(socket, ball, upper, lower, glint);
      headBone.add(eye);
      return { eye, ball, upper, lower, glint, side };
    });
    this.blinkT = 2 + Math.random() * 3;
  }

  updateEyes(dt, target) {
    if (!this.eyes) return;
    this.blinkT -= dt;
    if (this.blinkT < -0.16) this.blinkT = 2.5 + Math.random() * 3.5;
    const blink = this.blinkT < 0 ? Math.sin(Math.min(1, -this.blinkT / 0.16) * Math.PI) : 0;   // 0..1..0
    const ko = this.state === 'ko' || (this.state === 'recover' && this.stateT < 0.5);
    for (const e of this.eyes) {
      let yaw, pitch;
      if (ko) { const a = this.t * 8 + (e.side < 0 ? 0 : Math.PI); yaw = Math.cos(a) * 0.35; pitch = Math.sin(a) * 0.2; }   // dizzy
      else {
        e.eye.updateWorldMatrix(true, false);
        _v.copy(target); e.eye.worldToLocal(_v);
        yaw = THREE.MathUtils.clamp(Math.atan2(_v.x, _v.z), -0.4, 0.4);
        pitch = THREE.MathUtils.clamp(Math.atan2(_v.y, Math.hypot(_v.x, _v.z)), -0.25, 0.25);
      }
      e.ball.rotation.set(-pitch, yaw, 0, 'YXZ');
      // upper lid follows the gaze a little (like real eyes), droops when dazed, sweeps down to blink
      e.upper.rotation.x = -pitch * 0.5 + (ko ? 0.3 : 0) + blink * 0.62;
      e.lower.rotation.x = -pitch * 0.25 - blink * 0.08;
      e.glint.visible = blink < 0.4 && !ko;
    }
  }

  // simple block body if the model can't load (keeps the game playable)
  buildFallback() {
    const mat = new THREE.MeshLambertMaterial({ color: 0xe8b896 });
    this.fallback = this.rag.list.map(p => {
      const d = p.def;
      const m = new THREE.Mesh(d.sphere ? new THREE.SphereGeometry(d.sphere, 12, 8) : new THREE.BoxGeometry(d.half[0] * 2, d.half[1] * 2, d.half[2] * 2), mat);
      this.scene.add(m); return m;
    });
  }

  // ---------------- convenience ----------------
  get pos() { return this.rag.pos('pelvis', this._pos || (this._pos = new THREE.Vector3())); }
  headPos(out) { return this.rag.pos('head', out); }
  get down() { return this.state === 'ko' || this.state === 'recover' || this.state === 'grabbed'; }

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
    babble(this.headPos(_v), Math.min(14, 4 + Math.floor(text.length / 8)));
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
  // Which body part (if any) is a sphere at pos touching?
  partAt(pos, r) { return this.rag.nearestPart(pos, r); }

  // Food / veg hits a body part. Light hits wobble him, hard hits knock him out.
  hitBy(part, point, impulse, isVeg = false) {
    this.rag.hit(part, point, impulse);
    const mag = impulse.length();
    if (this.state === 'grabbed') return 'wobble';
    if (mag >= KO_IMPULSE || part.name === 'head' && mag >= KO_IMPULSE * 0.6) { this.knockOut(isVeg ? 'vegHit' : 'hit'); return 'ko'; }
    if (!this.down && this.speakT <= 0.5 && Math.random() < 0.5) this.say(isVeg ? 'vegHit' : 'hit');
    return 'wobble';
  }

  // A hand swinging into him.
  slap(part, point, handVel) {
    if (this.slapCool > 0) return null;
    this.slapCool = 0.35;
    const speed = handVel.length();
    _v2.copy(handVel).multiplyScalar(2.2); _v2.y += speed * 0.4;
    this.rag.hit(part, point, _v2);
    if (speed > 3.2 && !this.down) { this.knockOut('slap'); return 'ko'; }
    if (!this.down && speed > 1.5 && this.speakT <= 0.5) this.say(speed < 2.2 ? '...was that meant to hurt?' : 'slap', 4);
    return 'slap';
  }

  knockOut(line = 'hit') {
    if (line === 'slap' && !BANKS.slap) line = 'hit';
    this.hits++;
    this.heldVeg.visible = false;
    this.state = 'ko'; this.stateT = 0;
    this.rag.strength = 0;
    this.rag.moveVel.set(0, 0, 0);
    this.pendingLine = line;
    this.bubble.visible = false; this.speakT = 0;
    sfx('boing', this.headPos(_v), 1);
  }

  // Ronnie grabs a body part (VR hands)
  grabbed() {
    this.grabbedBy++;
    if (this.state !== 'grabbed') {
      this.heldVeg.visible = false;
      this.state = 'grabbed'; this.stateT = 0;
      this.rag.moveVel.set(0, 0, 0);
      this.say('Ronnie, put me down. Ronnie. RONNIE. I am a grown man and I am older than you!', 5);
    }
  }
  released() {
    this.grabbedBy = Math.max(0, this.grabbedBy - 1);
    if (this.grabbedBy > 0 || this.state !== 'grabbed') return;
    const sp = this.rag.speed();
    this.state = 'ko'; this.stateT = sp > 3 ? 0 : 1.2;   // flung = full KO, dropped = quick recovery
    this.rag.strength = 0;
    this.pendingLine = sp > 5 ? 'WORTH IIIIIIT!' : 'hit';
    if (sp > 5) { this.say('WORTH IIIIIIT!', 6); this.pendingLine = 'hit'; }
    this.hits++;
  }

  // ---------------- poses (target directions in Tommy's own frame, +Z = forward) ----------------
  setIdlePose(t) {
    const r = this.rag, sway = Math.sin(t * 1.3) * 0.05;
    r.aim('uArmL', 0.12, -1, 0.02 + sway); r.aim('lArmL', 0.08, -1, 0.18);
    r.aim('uArmR', -0.12, -1, 0.02 - sway); r.aim('lArmR', -0.08, -1, 0.18);
    r.aim('uLegL', 0.02, -1, 0); r.aim('lLegL', 0.0, -1, 0.02);
    r.aim('uLegR', -0.02, -1, 0); r.aim('lLegR', 0.0, -1, 0.02);
    r.pose.pelvis.identity(); r.pose.chest.identity();
  }
  talkPose(t) {   // smug little hand gesture while talking
    const g = Math.sin(t * 5);
    this.rag.aim('uArmL', 0.55, -0.55, 0.45); this.rag.aim('lArmL', 0.2, 0.15 + g * 0.25, 1);
  }
  walkPose(t) {
    const r = this.rag, s = Math.sin(t * 8);
    r.aim('uLegL', 0.02, -1, 0.5 * s); r.aim('lLegL', 0, -1, 0.5 * s - 0.25 * Math.max(0, -s));
    r.aim('uLegR', -0.02, -1, -0.5 * s); r.aim('lLegR', 0, -1, -0.5 * s - 0.25 * Math.max(0, s));
    r.aim('uArmL', 0.15, -1, -0.45 * s); r.aim('lArmL', 0.1, -1, 0.1 - 0.3 * s);
    r.aim('uArmR', -0.15, -1, 0.45 * s); r.aim('lArmR', -0.1, -1, 0.1 + 0.3 * s);
    r.pose.chest.setFromAxisAngle(_v.set(0, 1, 0), s * 0.12);
  }
  flailPose(t) {  // dangling in Ronnie's grip: legs kicking, arms windmilling
    const r = this.rag;
    r.aim('uArmL', Math.cos(t * 9), Math.sin(t * 9), 0.3); r.aim('lArmL', Math.cos(t * 9 + 1), Math.sin(t * 9 + 1), 0.3);
    r.aim('uArmR', -Math.cos(t * 8), Math.sin(t * 8), 0.3); r.aim('lArmR', -Math.cos(t * 8 + 1), Math.sin(t * 8 + 1), 0.3);
    r.aim('uLegL', 0.1, -1, Math.sin(t * 12) * 0.9); r.aim('uLegR', -0.1, -1, -Math.sin(t * 12) * 0.9);
    r.aim('lLegL', 0, -1, Math.sin(t * 12 + 1) * 0.6); r.aim('lLegR', 0, -1, -Math.sin(t * 12 + 1) * 0.6);
  }

  // ---------------- behaviour ----------------
  update(dt, playerHead, playerFwd, mouth) {
    const r = this.rag;
    this.t += dt; this.stateT += dt;
    if (this.slapCool > 0) this.slapCool -= dt;
    if (this.speakT > 0) { this.speakT -= dt; if (this.speakT <= 0) { this.bubble.visible = false; if (this.speakPri >= 2 && !this.down && Math.random() < 0.5) this.flashTeeth(); } }
    else this.quietT += dt;

    const pos = this.pos;
    _v.set(playerHead.x - pos.x, 0, playerHead.z - pos.z);
    const toPlayerYaw = Math.atan2(_v.x, _v.z);
    const distToPlayer = _v.length();
    r.moveVel.set(0, 0, 0);
    r.support = 1;

    switch (this.state) {
      case 'enter':
        this.setIdlePose(this.t);
        this.turnTo(toPlayerYaw, dt, 2);
        if (this.stateT > 1.2) { this.say('greet'); this.state = 'idle'; this.stateT = 0; this.nextMove = 9; }
        break;
      case 'idle':
        this.setIdlePose(this.t);
        if (this.speakT > 0) this.talkPose(this.t);
        this.turnTo(toPlayerYaw, dt, 3);
        this.nextMove -= dt;
        this.attackTimer -= dt;
        if (this.attackTimer <= 0 && distToPlayer > 1.2) { this.startWindup(); break; }
        // he only shuffles off if you've been right in his face for a while (so you CAN grab him)
        this.closeT = distToPlayer < 0.8 ? (this.closeT || 0) + dt : 0;
        if (this.nextMove <= 0 || this.closeT > 3) { this.closeT = 0; this.pickSpot(playerHead, playerFwd); }
        if (this.quietT > 14 && this.speakT <= 0) this.say(Math.random() < 0.25 ? 'idle' : 'chatter');
        break;
      case 'walk': {
        _v2.set(this.moveTarget.x - pos.x, 0, this.moveTarget.y - pos.z);
        const d = _v2.length();
        if (d < 0.15 || this.stateT > 8) { this.state = 'idle'; this.stateT = 0; this.nextMove = 8 + Math.random() * 8; break; }
        this.turnTo(Math.atan2(_v2.x, _v2.z), dt, 6);
        r.moveVel.copy(_v2.normalize()).multiplyScalar(Math.min(0.9, d * 2));
        this.walkPose(this.t);
        this.attackTimer -= dt * 0.5;
        break;
      }
      case 'windup': {     // telegraphed: arm back over his head, broccoli in hand
        this.setIdlePose(this.t);
        this.turnTo(toPlayerYaw, dt, 6);
        r.aim('uArmR', -0.25, 0.75, -0.6); r.aim('lArmR', -0.1, 0.6, -0.8);
        r.pose.chest.setFromAxisAngle(_v.set(1, 0, 0), -0.15);
        this.heldVeg.visible = true;
        if (this.stateT >= 0.9) this.release(mouth);
        break;
      }
      case 'throw':
        this.setIdlePose(this.t);
        this.turnTo(toPlayerYaw, dt, 6);
        r.aim('uArmR', -0.15, 0.1, 1); r.aim('lArmR', -0.1, -0.2, 1);
        r.pose.chest.setFromAxisAngle(_v.set(1, 0, 0), 0.2);
        if (this.stateT > 0.6) { this.state = 'idle'; this.stateT = 0; }
        break;
      case 'ko':           // fully limp, seeing stars
        r.strength = 0;
        if (this.stateT > 2.2) { this.state = 'recover'; this.stateT = 0; this.setIdlePose(this.t); this.yawFromBody(); }
        break;
      case 'recover': {    // muscles come back and haul him up, Gang Beasts style
        this.setIdlePose(this.t);
        r.strength = Math.min(1, this.stateT / 0.9);
        if (this.stateT > 1.0 && r.upright() > 0.9) {
          this.state = 'idle'; this.stateT = 0; r.strength = 1;
          if (this.pendingLine) { this.say(this.pendingLine); this.pendingLine = null; }
          this.attackTimer = Math.max(this.attackTimer, 6);
        }
        if (this.stateT > 4) { r.strength = 1; this.state = 'idle'; }
        break;
      }
      case 'grabbed':
        r.strength = 0.35; r.support = 0;
        this.flailPose(this.t);
        break;
    }

    // head looks at the player (within reason)
    const rel = THREE.MathUtils.clamp(wrapAngle(toPlayerYaw - r.yaw), -0.9, 0.9);
    if (!this.down) r.pose.head.setFromAxisAngle(_v.set(0, 1, 0), rel);

    r.sync();
    this.updateEyes(dt, playerHead);
    if (this.fallback) this.fallback.forEach((m, i) => { const b = r.list[i].body; m.position.copy(b.position); m.quaternion.copy(b.quaternion); });

    // effects follow the body
    this.fx.position.set(pos.x, 0, pos.z);
    this.spot.position.set(pos.x, 2.55, pos.z + 0.01);
    this.spot.target.position.set(pos.x, 0, pos.z);
    const head = this.headPos(_v);
    this.bubble.position.set(head.x, Math.max(head.y, 0.7) + 0.55, head.z);
    this.updateStars(this.state === 'ko' || (this.state === 'recover' && this.stateT < 0.6), head);
    if (this.sparkT > 0) {
      this.sparkT -= dt; this.sparkle.visible = this.sparkT > 0; this.sparkle.material.rotation += dt * 6;
      const q = r.parts.head.body.quaternion; _q.set(q.x, q.y, q.z, q.w);
      this.sparkle.position.set(0, -0.06, 0.12).applyQuaternion(_q).add(head);
    }
    if (this.heldVeg.visible) r.tip('lArmR', this.heldVeg.position);
  }

  turnTo(yaw, dt, speed) { this.rag.yaw += wrapAngle(yaw - this.rag.yaw) * Math.min(1, dt * speed); }

  // after a fall, face wherever the body ended up
  yawFromBody() {
    const q = this.rag.parts.pelvis.body.quaternion; _q.set(q.x, q.y, q.z, q.w);
    _v.set(0, 0, 1).applyQuaternion(_q);
    if (Math.abs(_v.y) < 0.9) this.rag.yaw = Math.atan2(_v.x, _v.z);
  }

  flashTeeth() { this.sparkT = 0.5; this.sparkle.visible = true; sfx('ting', this.headPos(_v), 0.8); }

  updateStars(on, head) {
    this.stars.forEach((s, i) => {
      s.visible = on;
      if (!on) return;
      const a = this.t * 5 + i * Math.PI * 2 / 3;
      s.position.set(head.x + Math.cos(a) * 0.16, head.y + 0.16, head.z + Math.sin(a) * 0.16);
    });
  }

  // Pick a hang-out spot away from the player, preferably in front of them.
  pickSpot(playerHead, playerFwd) {
    const pos = this.pos;
    let best = null, bestScore = -Infinity, fallback = null, fd = Infinity;
    for (const s of this.room.tommySpots) {
      const dx = s.x - playerHead.x, dz = s.y - playerHead.z;
      const d = Math.hypot(dx, dz);
      const self = Math.hypot(s.x - pos.x, s.y - pos.z);
      if (self < fd && self > 0.3) { fd = self; fallback = s; }
      if (d < 1.4 || self < 0.3) continue;
      if (!this.pathClear(pos.x, pos.z, s.x, s.y)) continue;
      const facing = (dx * playerFwd.x + dz * playerFwd.z) / d;
      const score = facing * 2 + Math.random();
      if (score > bestScore) { bestScore = score; best = s; }
    }
    this.nextMove = 6 + Math.random() * 6;
    best = best || (Math.hypot(pos.x - playerHead.x, pos.z - playerHead.z) < 0.8 ? fallback : null);
    if (!best) return;
    this.moveTarget = best;
    this.state = 'walk'; this.stateT = 0;
  }

  pathClear(x0, z0, x1, z1) {
    const pad = 0.25;
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
    const start = this.rag.tip('lArmR', new THREE.Vector3());
    start.y = Math.max(start.y, 1.5);
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

// Equirectangular eyeball texture: white, blue-grey iris with fibres and a dark
// limbal ring, pupil — centred on the sphere's +Z direction.
function eyeTexture() {
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
  const mix = (a, b, t) => a + (b - a) * t;
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const phi = (px + 0.5) / W * Math.PI * 2, th = (py + 0.5) / H * Math.PI;
    const x = -Math.cos(phi) * Math.sin(th), y = Math.cos(th), z = Math.sin(phi) * Math.sin(th);
    const a = Math.acos(Math.max(-1, Math.min(1, z))), ang = Math.atan2(y, x);
    let r, gg, b;
    if (a < 0.16) { r = 12; gg = 14; b = 16; }                                    // pupil
    else if (a < 0.47) {                                                           // iris: blue-grey with a hint of green (from Tommy's photo)
      const t = (a - 0.16) / 0.31;
      const fib = 0.85 + 0.15 * Math.sin(ang * 38 + Math.sin(ang * 7) * 3) * Math.sin(ang * 23);
      r = mix(80, 106, t) * fib; gg = mix(100, 130, t) * fib; b = mix(100, 132, t) * fib;
      if (t < 0.18) { r *= 0.8; gg *= 0.85; b *= 0.85; }                            // darker collarette
      if (t > 0.85) { const k = 1 - (t - 0.85) / 0.15 * 0.55; r *= k; gg *= k; b *= k; }   // limbal ring
    } else {                                                                        // white, a little pinker toward the corners
      const t = Math.min(1, (a - 0.47) / 1.1);
      r = mix(226, 214, t); gg = mix(220, 196, t); b = mix(214, 188, t);
    }
    const o = (py * W + px) * 4; d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function wrapAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
