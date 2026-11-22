// The player IS Ronnie: XR rig, hands (never controllers — you see hands whose
// fingers curl as you press the trigger/grip, or your real tracked fingers),
// grab/throw, hand velocity (for swats and slaps), physics hand bodies that can
// shove Tommy's ragdoll, grabbing Tommy himself, smooth locomotion + snap turn,
// the wrist Chonk Meter, Ronnie's ever-growing belly, and a first-person hand
// for playing on a phone / tablet.
import * as THREE from 'three';
import { feelFor } from './foods.js';
import { nearBlockers, NEAR_SAFE } from './perf.js';
import { Belly } from './belly.js';
import * as CANNON from 'cannon-es';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { TUNING, ROOM } from './config.js';
import { FONT, roundRect } from './textures.js';
import { ControllerHand, skinTrackedHand } from './hands.js';
import { GROUP } from './physics.js';
import { holdTransform } from './hold.js';

const HIST = 6;
const _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _qi = new THREE.Quaternion();
const _pv = new THREE.Vector3(), _pd = new THREE.Vector3(), _pw = new THREE.Vector3(), _pq = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);
const FLAT_REST = 1.45;   // on-screen hand: fist upright (controller-handle axis pointing up)

class Hand {
  constructor(i) {
    this.index = i;
    this.source = null;
    this.handedness = i === 0 ? 'left' : 'right';
    this.isHand = false;
    this.sel = false; this.sq = false;
    this.held = null;
    this.heldPart = null;                    // a Tommy body part we're holding
    this.joint = null;                       // physics constraint for that
    this.ctrlHand = null;                    // hand model shown around the controller
    this.body = null;                        // kinematic physics sphere
    this.pos = new THREE.Vector3();          // grab point (world)
    this.quat = new THREE.Quaternion();
    this.palm = new THREE.Vector3();         // swat point (world)
    this.vel = new THREE.Vector3();
    this.speed = 0;
    this.tracked = false;
    this.offPos = new THREE.Vector3();
    this.offQuat = new THREE.Quaternion();
    this.hist = Array.from({ length: HIST }, () => ({ p: new THREE.Vector3(), t: 0 }));
    this.hi = 0;
  }
  get grabbing() { return this.sel || this.sq; }
  pulse(intensity = 0.5, ms = 40) {
    const a = this.source?.gamepad?.hapticActuators?.[0];
    if (a && a.pulse) { try { a.pulse(intensity, ms); } catch (e) { /* ignore */ } }
  }
}

export class Player {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.rig = new THREE.Group();
    this.rig.position.set(0.05, 0, 0.45);
    this.rig.add(camera);
    scene.add(this.rig);
    this.scale = 1;
    this.clearEffects();
    this.head = new THREE.Vector3();
    this.fwd = new THREE.Vector3(0, 0, -1);
    this.mouth = new THREE.Vector3();
    this.hands = [new Hand(0), new Hand(1)];
    this.onGrab = null; this.onRelease = null;
    this.snapReady = true;
    this.items = null;     // ItemManager, set by game
    this.tommy = null;     // set by game (for grabbing his ragdoll)
    this.physics = null;

    const hmf = new XRHandModelFactory();
    hmf.setPath('./assets/hands/');
    this.ctrlHands = {};
    // both controller hand models load now, before the headset goes on, so they're there the moment you arrive
    for (const side of ['left', 'right']) { const ch = this.ctrlHands[side] = new ControllerHand(side); ch.load().catch(e => console.warn('hand model', e)); }
    this.hands.forEach((h, i) => {
      const ctrl = renderer.xr.getController(i);
      const grip = renderer.xr.getControllerGrip(i);
      const hand = renderer.xr.getHand(i);
      h.ctrl = ctrl; h.grip = grip; h.hand = hand;
      const tracked = hmf.createHandModel(hand, 'mesh');
      hand.add(tracked);
      skinTrackedHand(tracked);
      this.rig.add(ctrl, grip, hand);
      ctrl.addEventListener('connected', (e) => {
        h.source = e.data; h.isHand = !!e.data.hand; h.handedness = e.data.handedness || h.handedness;
        h.sel = h.sq = false;
        if (!h.isHand) this.attachControllerHand(h);
      });
      ctrl.addEventListener('disconnected', () => { this.release(h, true); h.source = null; h.tracked = false; });
      const down = (k) => () => { const was = h.grabbing; h[k] = true; if (!was) this.grab(h); };
      const up = (k) => () => { h[k] = false; if (!h.grabbing) this.release(h); };
      ctrl.addEventListener('selectstart', down('sel'));
      ctrl.addEventListener('selectend', up('sel'));
      ctrl.addEventListener('squeezestart', down('sq'));
      ctrl.addEventListener('squeezeend', up('sq'));
    });

    this.buildWrist();
    this.buildBelly();
  }

  handByHandedness(side) { return this.hands.find(h => h.source && h.handedness === side) || null; }

  // A hand model wrapped around the (invisible) controller.
  attachControllerHand(h) {
    const side = h.handedness === 'left' ? 'left' : 'right';
    let ch = this.ctrlHands[side];
    if (!ch) { ch = this.ctrlHands[side] = new ControllerHand(side); ch.load().catch(e => console.warn('hand model', e)); }
    if (h.ctrlHand && h.ctrlHand !== ch) h.ctrlHand.root.visible = false;
    h.grip.add(ch.root);
    h.ctrlHand = ch;
  }

  // Noah's tackle: everything in your hands goes flying
  dropAll() {
    for (const h of this.hands) { if (h.heldPart) this.releaseTommy(h); if (h.held) { const it = h.held; this.release(h, true); it.vel.set((Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2); } }
    if (this.flatHolder?.held) { const it = this.flatHolder.held; this.flatDrop(); it.vel.set((Math.random() - 0.5) * 2, 1.5, 1); }
  }

  // Knocked flat on your back (Noah's tackle, Tommy's trip): the whole rig tips
  // over around your feet, you lie on the floor for a moment, then get back up.
  // dir: horizontal direction you get pushed in. lie: seconds on the floor.
  knockDown(dir, lie = 2.0) {
    if (this.knock || this.throwAnim) return;
    this.rig.updateMatrixWorld(true);
    this.camera.getWorldPosition(_v);
    const d = new THREE.Vector3(dir.x, 0, dir.z);
    if (d.lengthSq() < 1e-6) d.set(-this.fwd.x, 0, -this.fwd.z);
    d.normalize();
    // remember the yaw as a plain number: copying the quaternion back can come out
    // as an equivalent Euler with x = z = 180°, which turned the walking controls round
    this.knock = { t: 0, lie, pos: this.rig.position.clone(), yaw: this.rig.rotation.y, q: this.rig.quaternion.clone(), pivot: new THREE.Vector3(_v.x, 0, _v.z), axis: new THREE.Vector3().crossVectors(UP, d).normalize() };
  }
  updateKnock(dt) {
    const k = this.knock;
    k.t += dt;
    const FALL = 0.35, LIE = 0.6 + k.lie, UPT = 0.9, MAX = 1.3;
    let a;
    if (k.t < FALL) { const u = k.t / FALL; a = MAX * u * u; }                       // topple, speeding up
    else if (k.t < FALL + 0.25) a = MAX - 0.12 * Math.sin((k.t - FALL) / 0.25 * Math.PI);   // thud + little bounce
    else if (k.t < LIE) a = MAX;
    else if (k.t < LIE + UPT) { const u = (k.t - LIE) / UPT; a = MAX * (1 - u * u * (3 - 2 * u)); }
    else a = 0;
    _q.setFromAxisAngle(k.axis, a);
    this.rig.position.copy(k.pos).sub(k.pivot).applyQuaternion(_q).add(k.pivot);
    this.rig.quaternion.copy(_q).multiply(k.q);
    if (k.t >= LIE + UPT) { this.rig.position.copy(k.pos); this.rig.rotation.set(0, k.yaw, 0); this.knock = null; this.resetHandHistory(); }
  }

  // ---------------- status effects from the squad's interventions ----------------
  // dizzy (wobbly view, drifting), frozen (can't walk), jig (forced to dance),
  // tether (on Ian's line: can't get far), spin (nutmegged), slow, noEat.
  effect(kind, dur, opts = {}) {
    const fx = this.fx;
    if (kind === 'tether') { this.rig.updateMatrixWorld(true); this.camera.getWorldPosition(_v); fx.tether = { t: dur, x: _v.x, z: _v.z, r: opts.r || 0.6 }; return; }
    if (kind === 'spin') { fx.spin = Math.max(fx.spin, dur); fx.spinLeft = Math.PI * 2 * (opts.turns || 1); fx.spinSpeed = opts.speed || 7; return; }
    if (kind === 'dizzy') fx.dizzyAmp = Math.max(opts.amp || 1, fx.dizzy > 0 ? fx.dizzyAmp || 1 : 0);
    if (kind === 'siu') { this.siuAnim = { t: 0 }; fx.frozen = Math.max(fx.frozen, dur); return; }
    fx[kind] = Math.max(fx[kind] || 0, dur);
  }
  clearEffects() { if (this.jigY) this.rig.position.y -= this.jigY; if (this.siuY) { this.rig.position.y -= this.siuY; this.siuY = 0; } this.siuAnim = null; this.fx = { dizzy: 0, frozen: 0, jig: 0, tether: null, spin: 0, spinLeft: 0, slow: 0, noEat: 0 }; this.jigY = 0; }
  get stunned() { return !!(this.knock || this.throwAnim || this.fx.frozen > 0 || this.fx.jig > 0); }
  get canEat() { return !(this.fx.noEat > 0) && !this.knock && !this.throwAnim; }
  // Lewis picks you up and throws you across the room: fly in an arc to `to`, land in a heap
  throwTo(to, height = 1.2) {
    if (this.knock || this.throwAnim) return;
    this.rig.updateMatrixWorld(true); this.camera.getWorldPosition(_v);
    this.throwAnim = { t: 0, dur: 0.9, from: this.rig.position.clone(), dx: to.x - _v.x, dz: to.z - _v.z, h: height };
  }
  updateEffects(dt, t) {
    const fx = this.fx;
    for (const k of ['dizzy', 'frozen', 'jig', 'spin', 'slow', 'noEat']) if (fx[k] > 0) fx[k] = Math.max(0, fx[k] - dt);
    // thrown across the room
    if (this.throwAnim) {
      const a = this.throwAnim; a.t += dt;
      const u = Math.min(1, a.t / a.dur);
      this.rig.position.set(a.from.x + a.dx * u, a.from.y + Math.sin(u * Math.PI) * a.h, a.from.z + a.dz * u);
      if (u >= 1) { this.rig.position.y = a.from.y; this.throwAnim = null; this.resetHandHistory(); this.onLanded && this.onLanded(); this.knockDown({ x: a.dx, z: a.dz }, 1.2); }
      return;
    }
    // dizzy: the view sways and you drift sideways
    if (fx.dizzy > 0 && !this.knock) {
      const k = Math.min(1, fx.dizzy) * (fx.dizzyAmp || 1), f = 1 + (k - 1) * 0.6;     // amp > 1: faster and wilder
      this.rotateAroundHead(Math.sin(t * 1.7 * f) * 0.35 * dt * k);
      _v.set(this.fwd.z, 0, -this.fwd.x).normalize().multiplyScalar(Math.sin(t * 1.1 * f) * 0.35 * dt * k);
      this.rig.position.add(_v);
      if (this.flatMode) { this.camera.rotation.z = Math.sin(t * 1.3 * f) * 0.12 * k; this.camera.rotation.x += Math.sin(t * 2.3 * f) * 0.05 * k; }
    }
    // nutmegged: spin round once
    if (fx.spinLeft > 0) { const step = Math.min(fx.spinLeft, dt * (fx.spinSpeed || 7)); fx.spinLeft -= step; this.rotateAroundHead(step); }
    // SIUUU: crouch, jump, turn round in the air, land
    if (this.siuAnim) {
      const a = this.siuAnim; a.t += dt;
      const y = a.t < 0.25 ? -0.12 * a.t / 0.25 : a.t < 0.85 ? -0.12 + Math.sin((a.t - 0.25) / 0.6 * Math.PI) * 0.75 + 0.12 * (a.t - 0.25) / 0.6 : 0;
      this.rig.position.y += y - (this.siuY || 0); this.siuY = y;
      if (a.t > 0.3 && a.t < 0.8) this.rotateAroundHead(Math.PI * dt / 0.5);
      if (a.t >= 0.9) { this.rig.position.y -= this.siuY || 0; this.siuY = 0; this.siuAnim = null; this.resetHandHistory(); }
    }
    // Irish jig: bounce up and down
    const jy = fx.jig > 0 ? Math.abs(Math.sin(t * 9)) * 0.09 : 0;
    this.rig.position.y += jy - (this.jigY || 0); this.jigY = jy;
    // on Ian's line: can't get further than r from where you were hooked
    if (fx.tether) {
      fx.tether.t -= dt;
      this.rig.updateMatrixWorld(true); this.camera.getWorldPosition(_v);
      const dx = _v.x - fx.tether.x, dz = _v.z - fx.tether.z, d = Math.hypot(dx, dz);
      if (d > fx.tether.r) { const f = (d - fx.tether.r) / d; this.rig.position.x -= dx * f; this.rig.position.z -= dz * f; }
      if (fx.tether.t <= 0) fx.tether = null;
    }
  }
  get downed() { return !!this.knock; }

  // where the on-screen hand is (phone mode) — Dylan clings to it
  flatAnchorPos() {
    if (!this.flatGrip) return this.head.clone();
    return this.flatGrip.getWorldPosition(new THREE.Vector3());
  }

  // Kinematic spheres that follow your palms, so you can physically shove Tommy.
  setPhysics(physics) {
    this.physics = physics;
    this.flatBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, collisionFilterGroup: 0, collisionFilterMask: 0 });
    this.flatBody.addShape(new CANNON.Sphere(0.03));
    physics.world.addBody(this.flatBody);
    for (const h of this.hands) {
      h.body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, collisionFilterGroup: GROUP.HAND, collisionFilterMask: GROUP.RAGDOLL | GROUP.CHARS });
      h.body.addShape(new CANNON.Sphere(0.05));
      h.body.position.set(0, -10, 0);
      physics.world.addBody(h.body);
    }
  }

  // ---------------- per-frame ----------------
  update(dt, t) {
    const xr = this.renderer.xr.isPresenting;
    // food that's been finished (or taken away) leaves your hand: you go and get another one
    for (const h of this.hands) if (h.held && h.held.dead) h.held = null;
    if (this.flatHolder && this.flatHolder.held && this.flatHolder.held.dead) { this.flatHolder.held = null; this.flatEatT = -1; }
    this.rig.updateMatrixWorld(true);

    // head, forward, mouth
    this.camera.getWorldPosition(this.head);
    this.camera.getWorldDirection(this.fwd);
    _v.set(0, -1, 0).applyQuaternion(this.camera.getWorldQuaternion(_q));
    this.mouth.copy(this.head).addScaledVector(_v, 0.075 * this.scale).addScaledVector(this.fwd, 0.06 * this.scale);

    if (xr) {
      for (const h of this.hands) this.updateHand(h, dt, t);
      for (const h of this.hands) this.updatePointer(h);
      if (!this.stunned && !this.menuLock && !this.emoteLock) this.locomotion(dt, this.fx.slow > 0 ? 0.45 : 1);     // (not while a menu's open)
    } else {
      for (const h of this.hands) { if (h.body) h.body.position.set(0, -10, 0); if (h.ctrlHand) h.ctrlHand.root.visible = false; if (h.ptr) h.ptr.visible = h.ptrDot.visible = false; }
      const mv = this.flatMove;
      if ((this.stunned || this.menuLock || this.emoteLock) && mv) this.flatMove = { x: 0, z: 0 };
      else if (this.fx.slow > 0 && mv) this.flatMove = { x: mv.x * 0.45, z: mv.z * 0.45 };
      this.updateFlat(dt, t);
      if (mv) this.flatMove = mv;
    }
    if (this.knock) this.updateKnock(dt);
    this.updateEffects(dt, t);
    this.placeHeld();
    this.updateWristParent(xr); this.wristFx(dt);
    this.updateBelly(dt, t);
  }

  updateHand(h, dt, t) {
    h.tracked = false;
    if (h.ctrlHand) h.ctrlHand.root.visible = !!h.source && !h.isHand && h.grip.visible;
    if (!h.source) { if (h.body) h.body.position.set(0, -10, 0); return; }
    if (h.isHand) {
      const j = h.hand.joints;
      const it = j['index-finger-tip'], th = j['thumb-tip'], wr = j['wrist'], mc = j['middle-finger-metacarpal'];
      if (it && th && wr && it.visible && th.visible && wr.visible) {
        it.getWorldPosition(h.pos); th.getWorldPosition(_v); h.pos.add(_v).multiplyScalar(0.5);
        wr.getWorldQuaternion(h.quat);
        (mc && mc.visible ? mc : wr).getWorldPosition(h.palm);
        h.tracked = true;
      }
    } else if (h.grip.visible) {
      h.grip.matrixWorld.decompose(h.pos, h.quat, _s);
      h.palm.copy(h.pos);
      h.tracked = true;
    }
    if (!h.tracked) { if (h.body) h.body.position.set(0, -10, 0); return; }

    // velocity from a short position history (works for hands and controllers)
    const slot = h.hist[h.hi]; slot.p.copy(h.palm); slot.t = t; h.hi = (h.hi + 1) % HIST;
    const oldest = h.hist[h.hi];
    const span = t - oldest.t;
    if (span > 0.005 && span < 0.5) { h.vel.subVectors(h.palm, oldest.p).multiplyScalar(1 / span); h.speed = h.vel.length(); }

    // fingers follow the trigger / grip
    if (h.ctrlHand && !h.isHand) h.ctrlHand.fromGamepad(h.source.gamepad, h.held && !h.isHand ? holdTransform(h.held.type, h.handedness).curl : h.heldPart ? 0.85 : 0);

    // physics hand follows the palm (with its velocity, so it imparts momentum)
    if (h.body) {
      h.body.position.set(h.palm.x, h.palm.y, h.palm.z);
      h.body.velocity.set(h.vel.x, h.vel.y, h.vel.z);
      h.body.collisionResponse = !h.heldPart;
      h.body.shapes[0].radius = 0.05 * this.scale; h.body.updateBoundingRadius();
    }

    // held item follows the hand
    if (h.held && h.held.dead) h.held = null;
    // (the held item itself is placed in placeHeld(), after everything has moved)
  }

  // Put held food exactly in the hand. Runs LAST each frame, after walking, dizzy
  // sway, spins, jigs, falls and jumps have moved the view, so it can't lag behind
  // the hand and float next to it.
  placeHeld() {
    this.rig.updateMatrixWorld(true);
    for (const h of this.hands) {
      const it = h.held; if (!it || it.dead || !h.tracked) continue;
      const o = it.obj;
      if (h.isHand) {     // real tracked fingers do the holding: keep it where it was pinched
        const j = h.hand.joints, a = j['index-finger-tip'], b = j['thumb-tip'], w = j['wrist'];
        if (a && b && w) { a.getWorldPosition(h.pos); b.getWorldPosition(_v); h.pos.add(_v).multiplyScalar(0.5); w.getWorldQuaternion(h.quat); }
        o.position.copy(h.offPos).applyQuaternion(h.quat).add(h.pos);
        o.quaternion.copy(h.quat).multiply(h.offQuat);
      } else {            // controller: it sits in the fist, fingers closed round it
        h.grip.matrixWorld.decompose(h.pos, h.quat, _s);
        const ht = holdTransform(it.type, h.handedness === 'left' ? 'left' : 'right');
        o.position.copy(ht.p).multiplyScalar(_s.x).applyQuaternion(h.quat).add(h.pos);
        o.quaternion.copy(h.quat).multiply(ht.q);
      }
    }
    const f = this.flatHolder;
    if (this.flatMode && f && f.held && !f.held.dead && !f.held.filling) {      // (not while it's standing under the tap being filled)
      this.camera.updateMatrixWorld(true);
      this.flatGrip.updateMatrixWorld(true);
      this.flatGrip.matrixWorld.decompose(_v, _q, _s);
      const ht = holdTransform(f.held.type, 'right'), o = f.held.obj;
      o.position.copy(ht.p).multiplyScalar(_s.x).applyQuaternion(_q).add(_v);
      o.quaternion.copy(_q).multiply(ht.q);
    }
  }

  // Point a controller at something on the floor (or across the room) and pull the trigger: it flies straight into
  // your hand, so you don't have to bend down for it. The pointer line shows what you'd get.
  pointTarget(h) {
    if (!h.ctrl || !h.tracked || h.isHand || !this.items || this.menuLock || this.noGrab) return null;
    h.ctrl.getWorldPosition(_pv); _pd.set(0, 0, -1).applyQuaternion(h.ctrl.getWorldQuaternion(_pq));
    let best = null, bs = 1e9;
    for (const it of this.items.items) {
      if (it.dead || it.heldBy || it.empty || !it.obj.visible || it.def.gun) continue;
      _pw.subVectors(it.pos, _pv); const along = _pw.dot(_pd); if (along < 0.35 || along > 7) continue;
      const off = Math.sqrt(Math.max(0, _pw.lengthSq() - along * along)), tol = Math.max(0.09, it.radius * 1.3) + along * 0.025;
      if (off > tol) continue; const score = off / tol + along * 0.05; if (score < bs) { bs = score; best = it; }
    }
    return best;
  }
  updatePointer(h) {
    if (!h.ctrl) return;
    if (!h.ptr) { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
      h.ptr = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffd400, transparent: true, opacity: 0.85, depthTest: false })); h.ptr.renderOrder = 30; h.ptr.frustumCulled = false; this.scene.add(h.ptr);
      h.ptrDot = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.065, 24), new THREE.MeshBasicMaterial({ color: 0xffd400, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide })); h.ptrDot.renderOrder = 30; this.scene.add(h.ptrDot); }
    const tgt = (h.held || h.heldPart || h.remoteGrab) ? null : this.pointTarget(h);
    // (not when it's right there in your hand's reach anyway)
    const show = !!tgt && tgt.pos.distanceTo(h.pos) > TUNING.grabRadius * Math.max(1, this.scale) * 1.5;
    h.ptr.visible = h.ptrDot.visible = show; h.ptrTarget = show ? tgt : null;
    if (show) { h.ctrl.getWorldPosition(_pv); const p = h.ptr.geometry.attributes.position; p.setXYZ(0, _pv.x, _pv.y, _pv.z); p.setXYZ(1, tgt.pos.x, tgt.pos.y, tgt.pos.z); p.needsUpdate = true;
      h.ptrDot.position.copy(tgt.pos); h.ptrDot.lookAt(_pv); h.ptrDot.scale.setScalar(Math.max(1, tgt.radius / 0.06)); }
  }
  grab(h) {
    if (this.noGrab) return;               // (Imposter: no picking anything up)
    if (this.wheelOpen) return;            // (the trigger's picking an emote)
    if (!h.tracked || h.held || h.heldPart || h.remoteGrab || !this.items) return;
    const r = TUNING.grabRadius * Math.max(1, this.scale);
    let it = this.items.nearest(h.pos, r);
    if (!it) { this.grabTommy(h); if (h.heldPart || h.heldWho || h.remoteGrab || h.joint) return;
      it = h.sel ? (h.ptrTarget || this.pointTarget(h)) : null; if (!it) return;          // pointing at something: it comes to you
      it.pos.copy(h.pos); it.prev.copy(h.pos); it.resting = false; it.shelf = false; this.items.onPointGrab && this.items.onPointGrab(it); }
    if (it.heldBy && it.heldBy !== h) { it.heldBy.held = null; }
    it.heldBy = h; h.held = it; it.resting = false;
    it.vel.set(0, 0, 0);
    _qi.copy(h.quat).invert();
    h.offPos.subVectors(it.pos, h.pos).applyQuaternion(_qi);
    if (h.offPos.length() > 0.03) h.offPos.setLength(0.03);  // pull it snugly into the hand
    h.offQuat.copy(_qi).multiply(it.obj.quaternion);
    h.pulse(0.4, 30);
    this.onGrab && this.onGrab(it, h);
  }

  // Grab whichever bit of Tommy is in your hand and hang on with a springy joint.
  grabTommy(h) {
    if (!this.cast || !this.physics || !h.body) return;
    let part = null, who = null;
    for (const c of this.cast) { part = c.partAt(h.pos, 0.07 * this.scale); if (part) { who = c; break; } }
    if (!part) return;
    // one of the host's people (a joining player's game): the host's game does the holding, following this hand
    if (who.netDriven && this.remoteGrab) { h.remoteGrab = { who, part }; h.pulse(0.8, 60); this.remoteGrab(h, who, part, 'start'); return; }
    h.heldWho = who;
    const b = part.body;
    _q.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w).invert();
    _v.set(h.pos.x - b.position.x, h.pos.y - b.position.y, h.pos.z - b.position.z).applyQuaternion(_q);
    h.body.position.set(h.pos.x, h.pos.y, h.pos.z);
    h.joint = new CANNON.PointToPointConstraint(h.body, new CANNON.Vec3(h.pos.x - h.palm.x, h.pos.y - h.palm.y, h.pos.z - h.palm.z), b, new CANNON.Vec3(_v.x, _v.y, _v.z), 4000);
    this.physics.world.addConstraint(h.joint);
    part.grabbed = true;
    h.heldPart = part;
    h.pulse(0.8, 60);
    who.grabbed(part);
  }

  releaseTommy(h) {
    if (h.remoteGrab) { const g = h.remoteGrab; h.remoteGrab = null; this.remoteGrab && this.remoteGrab(h, g.who, g.part, 'end'); return; }
    if (!h.heldPart) return;
    this.physics.world.removeConstraint(h.joint);
    h.joint = null;
    const b = h.heldPart.body;
    b.velocity.x += h.vel.x * 0.5; b.velocity.y += h.vel.y * 0.5; b.velocity.z += h.vel.z * 0.5;
    if (!this.hands.some(o => o !== h && o.heldPart === h.heldPart)) h.heldPart.grabbed = false;
    h.heldPart = null;
    h.heldWho && h.heldWho.released();
    h.heldWho = null;
  }

  release(h, silent = false) {
    if (h.heldPart || h.remoteGrab) { this.releaseTommy(h); return; }
    const it = h.held;
    if (!it) return;
    h.held = null;
    if (it.heldBy !== h) return;
    it.heldBy = null;
    if (it.dead) return;
    it.vel.copy(h.vel).multiplyScalar(TUNING.throwBoost);
    const sp = it.vel.length();
    it.spin.set((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(sp * 6);
    it.thrownByPlayer = sp > 1.2;
    if (!silent) this.onRelease && this.onRelease(it, h, sp);
  }

  // Left stick: smooth move (head-relative). Right stick: 30° snap turn.
  locomotion(dt, mul = 1) {
    let mx = 0, mz = 0, turn = 0;
    for (const h of this.hands) {
      const gp = h.source?.gamepad;
      if (!gp || h.isHand) continue;
      const ax = gp.axes.length >= 4 ? gp.axes[2] : gp.axes[0] || 0;
      const ay = gp.axes.length >= 4 ? gp.axes[3] : gp.axes[1] || 0;
      if (h.handedness === 'left') { mx = ax; mz = ay; const click = !!(gp.buttons[3] && gp.buttons[3].pressed); if (click && !this.sprintHeld) { this.sprint = !this.sprint; h.pulse && h.pulse(0.5, 60); } this.sprintHeld = click; }   // click the left stick: sprint on / off
      else turn = (this.noTurn || this.emoteLock) ? 0 : ax;      // (not while the emote wheel is using the stick)
    }
    if (Math.abs(mx) > 0.15 || Math.abs(mz) > 0.15) {
      _v.set(this.fwd.x, 0, this.fwd.z).normalize();
      _v2.crossVectors(_v, UP);       // right
      const sp = TUNING.moveSpeed * dt * mul * (this.speedMul || 1) * (this.puSpeed || 1) * (this.sprint ? 2.1 : 1) * (this.ghost ? 1.25 : 1);
      this.rig.position.addScaledVector(_v, -mz * sp).addScaledVector(_v2, mx * sp);
    }
    if (this.snapReady && Math.abs(turn) > 0.7) {
      this.snapReady = false;
      this.rotateAroundHead(-Math.sign(turn) * THREE.MathUtils.degToRad(TUNING.snapTurnDeg));
    } else if (Math.abs(turn) < 0.3) this.snapReady = true;
    this.clampHead();
  }

  // Keep Ronnie's head inside the room and out of the furniture.
  clampHead() {
    this.rig.updateMatrixWorld(true);
    this.camera.getWorldPosition(_v);
    if (this.zoomLean > 0.001) { const f = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.getWorldQuaternion(new THREE.Quaternion())); _v.addScaledVector(f, -this.zoomLean); }   // (ignore the darts lean-in)
    const m = 0.2, B = this.room ? this.room.bounds : { x0: -ROOM.w / 2, x1: ROOM.w / 2, z0: -ROOM.d / 2, z1: ROOM.d / 2 };
    let cx = THREE.MathUtils.clamp(_v.x, B.x0 + m, B.x1 - m), cz = THREE.MathUtils.clamp(_v.z, B.z0 + m, B.z1 - m);
    const r = 0.22, sx = cx, sz = cz;
    // (a ghost (Imposter, once you're dead) floats straight through walls and furniture, anywhere in the map)
    if (this.ghost) { this.rig.position.x += cx - _v.x; this.rig.position.z += cz - _v.z; return; }
    const push = (list) => { for (const b of list) {
      if (!this.flatMode && !((b.y1 ?? 1) > 1.6)) continue;   // in VR only walls stop you (you can lean over tables)
      const nx = THREE.MathUtils.clamp(cx, b.x0, b.x1), nz = THREE.MathUtils.clamp(cz, b.z0, b.z1);
      const dx = cx - nx, dz = cz - nz, d = Math.hypot(dx, dz);
      if (d < r) { if (d < 1e-4) { cz = b.z1 + r; } else { cx = nx + dx / d * r; cz = nz + dz / d * r; } if (Math.abs(cx - sx) > NEAR_SAFE || Math.abs(cz - sz) > NEAR_SAFE) far = true; }
    } };
    let far = false;
    if (this.room) { push(nearBlockers(this.room, sx, sz));      // (only the furniture near you: perf.js; the whole lot if you were ever pushed further than that covers)
      if (far) { cx = sx; cz = sz; push(this.room.blockers || []); } }
    this.rig.position.x += cx - _v.x; this.rig.position.z += cz - _v.z;
    // raised floors (the Oysterfleet's top-left seating area): step up and down smoothly
    const fy = this.room?.floorAt ? this.room.floorAt(cx, cz) : 0, f0 = this.floorY || 0, f1 = Math.abs(fy - f0) < 0.005 ? fy : f0 + (fy - f0) * 0.25;
    if (f1 !== f0) { this.rig.position.y += f1 - f0; this.floorY = f1; }
  }

  // ---------------- phone / tablet / desktop (no headset) ----------------
  enterFlat() {
    this.flatMode = true;
    if (this.flatHolder) return;
    this.flatYaw = 0; this.flatPitch = -0.22;
    this.flatMove = { x: 0, z: 0 };
    // an invisible "controller" held in front-right of the camera, with a hand around it
    this.flatGrip = new THREE.Group();
    this.flatGrip.position.set(0.18, -0.21, -0.4);
    this.flatGrip.rotation.set(FLAT_REST, 0.3, 0);
    this.itemTwist = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);  // item "up" = through the fist
    this.camera.add(this.flatGrip);
    this.flatHandModel = new ControllerHand('right');
    this.flatHandModel.load().then(() => { this.flatHandModel.root.visible = true; }).catch(() => {});
    this.flatGrip.add(this.flatHandModel.root);
    this.flatHolder = { isFlat: true, held: null, pulse() {}, vel: new THREE.Vector3(), speed: 0 };
    this.flatEatT = -1;
  }

  flatGrab(it) {
    if (this.noGrab) return;
    const f = this.flatHolder;
    if (f.held) this.flatDrop();
    if (it.heldBy && it.heldBy !== f) it.heldBy.held = null;
    it.heldBy = f; f.held = it; it.resting = false; it.vel.set(0, 0, 0);
    this.onGrab && this.onGrab(it, f);
  }

  flatThrow(power = 7) {
    const f = this.flatHolder, it = f?.held;
    if (!it) return;
    if (it.def.bat && this.room && this.room.pingpong) { this.room.pingpong.smash(); return; }     // THROW with the bat = smash / serve
    f.held = null; it.heldBy = null;
    const fe = it.feel || feelFor(it.type, it.def); it.vel.copy(this.fwd).multiplyScalar(power * fe.throw); it.vel.y += 1.6 * Math.min(1, fe.throw + 0.1);      // (heavy things don't go as far)
    // darts on a phone/PC: they go where the middle of the screen is pointing (give or take a wobble)
    const db = this.room && this.room.dartboard;
    if (it.def.dart && db) {
      const o = this.camera.getWorldPosition(new THREE.Vector3()), dir = this.camera.getWorldDirection(new THREE.Vector3());
      if (this.zoomLean > 0.001) { it.pos.addScaledVector(dir, -this.zoomLean); it.prev.copy(it.pos); }      // zoomed in: the dart still leaves from where you're actually standing
      const den = dir.dot(db.n);
      if (den < -0.2) {
        const t = new THREE.Vector3().subVectors(db.c, o).dot(db.n) / den;
        if (t > 0 && t < 4.5) {
          const target = o.addScaledVector(dir, t).addScaledVector(db.right, (Math.random() - 0.5) * 0.035).addScaledVector(db.up, (Math.random() - 0.5) * 0.035);
          const T = Math.max(0.12, it.pos.distanceTo(target) / 10), g = -9.81;
          it.vel.subVectors(target, it.pos).multiplyScalar(1 / T); it.vel.y -= 0.5 * g * T - 0.08;     // (+ a touch for the frame-step drop)
        }
      }
    }
    // it tumbles end over end, the way a thrown thing does (a bit of wobble; a magazine flaps, a pint barely turns)
    const side = new THREE.Vector3(-this.fwd.z, 0, this.fwd.x).normalize(), tum = it.def.mag || it.def.mat ? 6 : it.def.drink || it.def.vessel ? 4 : it.def.chair ? 2 : 11;
    it.spin.copy(side).multiplyScalar(tum * (0.8 + Math.random() * 0.4)).add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(tum * 0.5));
    it.thrownByPlayer = true;
    this.onRelease && this.onRelease(it, f, power);
  }

  shake(k) { if (!(this.renderer && this.renderer.xr.isPresenting)) { this.shakeA = Math.min(1.2, Math.max(this.shakeA || 0, k)); this.shakeT = 0; } }

  flatDrop() { const f = this.flatHolder; if (f?.held) { f.held.heldBy = null; f.held = null; } }

  // EAT button: swing the held food up to the mouth (the normal bite / chug code does the rest)
  flatEat() { if (this.flatHolder?.held && this.flatEatT < 0) this.flatEatT = 0; }

  updateFlat(dt, t) {
    if (!this.flatMode) return;
    this.camera.rotation.set(this.flatPitch, this.flatYaw, 0, 'YXZ');
    // darts zoom: lean your view in towards where you're looking (your hand and the dart come with it)
    this.zoomLean = (this.zoomLean || 0) + ((this.zoom ? (this.zoomDist || 1.4) : 0) - (this.zoomLean || 0)) * Math.min(1, dt * 7);
    this.camera.position.set(0, 1.6, 0);
    // a hit lands: the view jolts and settles (a few quick decaying wobbles; never in VR)
    if (this.shakeA > 0.002) { this.shakeT = (this.shakeT || 0) + dt; const a = this.shakeA, t = this.shakeT * 38;
      this.camera.position.x += a * 0.035 * Math.sin(t); this.camera.position.y += a * 0.025 * Math.sin(t * 1.37 + 1); this.camera.rotation.z += a * 0.02 * Math.sin(t * 0.9 + 2);
      this.shakeA *= Math.exp(-dt * 9); } else this.shakeA = 0;
    if (this.zoomLean > 0.001) { const f = new THREE.Vector3(0, 0, -1).applyEuler(this.camera.rotation); this.camera.position.addScaledVector(f, this.zoomLean); }
    const mx = this.flatMove.x, mz = this.flatMove.z;
    if (Math.abs(mx) > 0.05 || Math.abs(mz) > 0.05) {
      const sp = TUNING.moveSpeed * dt * 0.9 * (this.speedMul || 1) * (this.puSpeed || 1) * (this.sprint ? 2.1 : 1) * (this.ghost ? 1.25 : 1);
      const yw = this.flatYaw + this.rig.rotation.y, sy = Math.sin(yw), cy = Math.cos(yw);
      this.rig.position.x += (-sy * -mz + cy * mx) * sp;
      this.rig.position.z += (-cy * -mz - sy * mx) * sp;
    }
    this.clampHead();
    if (this.flatBody) { const p = this.flatAnchorPos(); this.flatBody.position.set(p.x, p.y, p.z); }
    // the eat swing: grip moves from its rest spot to just under the nose and back
    const g = this.flatGrip, f = this.flatHolder;
    let k = 0;
    if (this.flatEatT >= 0) {
      this.flatEatT += dt;
      const drink = f.held && f.held.def.drink;
      const dur = drink ? 1.9 : 0.6;
      k = this.flatEatT < 0.25 ? this.flatEatT / 0.25 : this.flatEatT > dur - 0.25 ? Math.max(0, (dur - this.flatEatT) / 0.25) : 1;
      if (this.flatEatT >= dur || !f.held) { this.flatEatT = -1; k = 0; }
      g.position.set(0.18 - 0.18 * k, -0.21 + 0.13 * k, -0.4 + 0.26 * k);
      g.rotation.set(FLAT_REST + (drink ? 1.7 : 0.2) * k, 0.3 * (1 - k), 0);
    } else { g.position.set(0.18, -0.21 + Math.sin(t * 2) * 0.004, -0.4); g.rotation.set(FLAT_REST, 0.3, 0); }
    if (this.flatHandModel.ready) { const c = f.held ? holdTransform(f.held.type, 'right').curl : 0.35; for (const n in this.flatHandModel.curl) this.flatHandModel.curl[n] += (c - this.flatHandModel.curl[n]) * 0.3; this.flatHandModel.update(); }
    if (f.held && f.held.dead) f.held = null;
  }

  // After the rig jumps (snap turn, growth, teleport) hands would look like they
  // moved at warp speed — forget their recent history so nothing gets flung or slapped.
  resetHandHistory() {
    for (const h of this.hands) { for (const e of h.hist) e.t = -10; h.vel.set(0, 0, 0); h.speed = 0; }
  }

  // Turn Ronnie round to face someone (an attacker): a quick eased turn of the whole view, in VR or on a phone
  faceToward(x, z, dur = 0.45) { this.faceGoal = { x, z, t: 0, dur }; }
  updateFace(dt) {
    const f = this.faceGoal; if (!f) return;
    f.t += dt;
    this.rig.updateMatrixWorld(true); this.camera.getWorldPosition(_v); this.camera.getWorldDirection(_v2);
    const want = Math.atan2(-(f.x - _v.x), -(f.z - _v.z)), have = Math.atan2(-_v2.x, -_v2.z);
    let d = want - have; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    const step = d * Math.min(1, dt * 9 / Math.max(0.2, f.dur));
    if (this.flatMode) { this.flatYaw += step; this.flatPitch += (-0.12 - this.flatPitch) * Math.min(1, dt * 6); } else this.rotateAroundHead(step);
    if (Math.abs(d) < 0.02 || f.t > f.dur + 0.6) this.faceGoal = null;
  }

  rotateAroundHead(angle) {
    this.resetHandHistory();
    this.rig.updateMatrixWorld(true);
    this.camera.getWorldPosition(_v);
    this.rig.rotation.y += angle;
    this.rig.updateMatrixWorld(true);
    this.camera.getWorldPosition(_v2);
    this.rig.position.x += _v.x - _v2.x; this.rig.position.z += _v.z - _v2.z;
  }

  // Scale Ronnie while keeping his head where it is horizontally.
  setScale(s) {
    this.resetHandHistory();
    this.rig.updateMatrixWorld(true);
    this.camera.getWorldPosition(_v);
    this.scale = s;
    this.rig.scale.setScalar(s);
    this.rig.updateMatrixWorld(true);
    this.camera.getWorldPosition(_v2);
    this.rig.position.x += _v.x - _v2.x; this.rig.position.z += _v.z - _v2.z;
  }

  // ---------------- wrist Chonk Meter ----------------
  // a bite punches the meter: a quick springy scale-up with a little wobble, settling back (every frame, no redraw)
  wristKick(k = 0.2) { this.wKick = Math.min(0.6, (this.wKick || 0) + k); this.wKickV = (this.wKickV || 0) + k * 6; this.wWob = (this.wWob || 0) + k * (Math.random() < 0.5 ? -1 : 1) * 0.6; }
  wristFx(dt) {
    if (!this.wrist) return; const base = this.wristBase || 1;
    // (a spring: stiff, a bit bouncy)
    this.wKickV = (this.wKickV || 0) + (-(this.wKick || 0) * 260 - (this.wKickV || 0) * 16) * Math.min(dt, 0.05); this.wKick = (this.wKick || 0) + this.wKickV * Math.min(dt, 0.05);
    this.wWob = (this.wWob || 0) * Math.exp(-dt * 7);
    if (Math.abs(this.wKick) < 1e-4 && Math.abs(this.wKickV) < 1e-3 && Math.abs(this.wWob) < 1e-4) { this.wKick = this.wKickV = this.wWob = 0; }
    this.wrist.scale.setScalar(base * (1 + Math.max(-0.2, this.wKick)));
    this.wrist.rotation.z = (this.wristRotZ || 0) + this.wWob * Math.sin(performance.now() / 45);
  }
  buildWrist() {
    this.wristCanvas = document.createElement('canvas');
    this.wristCanvas.width = 512; this.wristCanvas.height = 384;
    this.wristTex = new THREE.CanvasTexture(this.wristCanvas);
    this.wristTex.colorSpace = THREE.SRGBColorSpace;
    this.wristTex.generateMipmaps = false; this.wristTex.minFilter = THREE.LinearFilter;
    const mat = new THREE.MeshBasicMaterial({ map: this.wristTex, transparent: true, toneMapped: false });
    this.wrist = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.075), mat);
    this.wrist.renderOrder = 5;
    this.wristParent = null;
  }

  drawWrist(state) {
    const g = this.wristCanvas.getContext('2d'), w = 512, H = 384, h = 320;
    g.clearRect(0, 0, w, H);
    // which game you're in, above the box (always on show)
    if (state.dev) {      // developer mode: a terminal prompt, green on black, with a blinking cursor
      const t = '>_ DEVELOPER MODE' + (Math.floor(performance.now() / 500) % 2 ? ' █' : ''); g.fillStyle = 'rgba(0,10,2,0.88)'; roundRect(g, 4, 6, 420, 54, 10); g.fill(); g.strokeStyle = '#39ff14'; g.lineWidth = 3; roundRect(g, 4, 6, 420, 54, 10); g.stroke();
      g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = '900 32px "Courier New", monospace'; g.shadowColor = '#39ff14'; g.shadowBlur = 10; g.fillStyle = '#39ff14'; g.fillText(t, 18, 34); g.shadowBlur = 0;
    } else { const t = (state.title || '').toUpperCase(); g.textAlign = 'left'; g.textBaseline = 'middle'; let f = 40; do { g.font = `900 ${f}px ${FONT}`; f -= 2; } while (g.measureText(t).width > w - 40 && f > 16);
      g.lineWidth = 9; g.strokeStyle = '#111'; g.lineJoin = 'round'; g.strokeText(t, 14, 32); g.fillStyle = '#ffd400'; g.fillText(t, 14, 32); }
    g.save(); g.translate(0, 64);
    if (state.pub) { this.drawPubBox(g, w, h, state); g.restore(); this.wristTex.needsUpdate = true; return; }
    if (state.imp) { this.drawImpBox(g, w, h, state.imp); g.restore(); this.wristTex.needsUpdate = true; return; }
    if (state.custom) { state.custom(g, w, h); g.restore(); this.wristTex.needsUpdate = true; return; }      // (a mode that draws its own: PROP HUNT)
    if (state.extras && state.extras.box) { this.drawStatBox(g, w, h, state.extras.box, state.fps); g.restore(); this.wristTex.needsUpdate = true; return; }      // (SWEEP, BOSS FIGHT)
    g.fillStyle = '#111827'; roundRect(g, 4, 4, w - 8, h - 8, 40); g.fill();
    // (nearly the next size: the border glows gold, pulsing)
    g.lineWidth = 8 + (state.glow || 0) * 6; g.strokeStyle = state.loco > 0 ? '#ff9a1f' : state.glow ? `rgb(255,${Math.round(212 + 30 * state.glow)},${Math.round(40 * state.glow)})` : '#39ff14'; roundRect(g, 4, 4, w - 8, h - 8, 40); g.stroke();
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillStyle = '#c3cad6'; g.font = `900 34px ${FONT}`;
    g.fillText(`EAT METER · STAGE ${state.stage + 1}/${state.stages}`, 30, 44);
    g.fillStyle = '#ffffff'; { const room = w - 60 - (state.combo ? 170 : 0); let f = 54; do { g.font = `900 ${f}px ${FONT}`; f -= 2; } while (g.measureText(state.name.toUpperCase()).width > room && f > 18); }      // (room left for a combo badge)
    g.fillText(state.name.toUpperCase(), 30, 98);
    // belly-shaped bar that bulges as it fills
    const bx = 30, by = 140, bw = w - 60, bh = 70, k = Math.max(0, Math.min(1, state.fill));
    g.fillStyle = '#374151'; roundRect(g, bx, by, bw, bh, 35); g.fill();
    if (k > 0.01) {
      const grad = g.createLinearGradient(bx, 0, bx + bw, 0);
      grad.addColorStop(0, '#39ff14'); grad.addColorStop(0.6, '#ffe600'); grad.addColorStop(1, '#ff4d4d');
      g.fillStyle = grad;
      const bulge = 10 * k;
      g.beginPath();
      g.moveTo(bx + 30, by - bulge * 0.3);
      g.quadraticCurveTo(bx + bw * k * 0.5, by - bulge, bx + Math.max(30, bw * k - 25), by - bulge * 0.3);
      g.quadraticCurveTo(bx + bw * k + bulge, by + bh / 2, bx + Math.max(30, bw * k - 25), by + bh + bulge * 0.3);
      g.quadraticCurveTo(bx + bw * k * 0.5, by + bh + bulge, bx + 30, by + bh + bulge * 0.3);
      g.quadraticCurveTo(bx - 4, by + bh / 2, bx + 30, by - bulge * 0.3);
      g.fill();
    }
    // a combo: a badge on the bar's top right, its timer draining round the bottom
    if (state.combo) { const c = state.combo, cw = 150, cx = w - 30 - cw, cy = by - 54;
      g.fillStyle = c.col; roundRect(g, cx, cy, cw, 44, 22); g.fill(); g.fillStyle = '#111'; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; g.fillText(`x${c.n} COMBO`, cx + cw / 2, cy + 23);
      g.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(g, cx + 10, cy + 38, cw - 20, 5, 3); g.fill(); g.fillStyle = '#fff'; roundRect(g, cx + 10, cy + 38, (cw - 20) * Math.max(0, Math.min(1, c.left)), 5, 3); g.fill(); g.textAlign = 'left'; }
    g.fillStyle = '#ffffff'; g.font = `900 42px ${FONT}`; g.textAlign = 'center';
    g.fillText(state.max ? `${Math.round(state.chonk)} — MAXED OUT` : `${Math.round(state.chonk)} / ${state.next}`, w / 2, by + bh / 2 + 2);
    g.textAlign = 'left';
    if (state.loco > 0) {
      g.fillStyle = '#ff9a1f'; g.font = `900 36px ${FONT}`;
      g.fillText(`MANGO LOCO MODE x3 · ${state.loco.toFixed(1)}s`, 30, 262);
    } else if (state.stout > 0) {
      g.fillStyle = '#f3e6c8'; g.font = `900 36px ${FONT}`;
      g.fillText(`STOUT MODE x2 · ${state.stout.toFixed(1)}s`, 30, 262);
    } else if (state.extras && state.extras.chips) { this.drawChips(g, 30, 256, w - 60, state.extras.chips);
    } else if (state.modeLine) {
      g.fillStyle = '#ffd400'; g.font = `900 32px ${FONT}`;
      let size = 32; while (g.measureText(state.modeLine).width > w - 60 && size > 14) { size -= 2; g.font = `900 ${size}px ${FONT}`; }
      g.fillText(state.modeLine, 30, 262);
    } else {
      g.fillStyle = '#6b7280'; g.font = `900 28px ${FONT}`;
      g.fillText(`Eaten: ${state.eaten}  Swats: ${state.swats}`, 30, 262);
    }
    if (state.flash > 0) { g.fillStyle = `rgba(255,255,255,${0.75 * state.flash})`; roundRect(g, 4, 4, w - 8, h - 8, 40); g.fill(); }      // (a size up: a white flash)
    if (!this.flatMode || window.__devMode) { g.textAlign = 'right'; g.font = `900 24px ${FONT}`;      // (the frame rate: in a headset, or developer mode; on a phone it's just clutter)
      g.fillStyle = state.fps >= 70 ? '#39ff14' : state.fps >= 60 ? '#ffe600' : '#ff4d4d';
      g.fillText(`${state.fps} fps`, w - 30, 296); }
    g.restore();
    this.wristTex.needsUpdate = true;
  }
  // a row of rounded chips (the clock, BUSTED hearts...): shrunk to fit; a pulsing one breathes
  drawChips(g, x, y, maxW, chips) {
    // (big enough to read on an upright phone, where the box is small: if they don't all fit, the last ones (the least
    // important) are left off, rather than everything shrinking to a size nobody can read)
    const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 140); let f = 36, ws;
    const measure = () => { g.font = `900 ${f}px ${FONT}`; ws = chips.map(c => g.measureText(c.t).width + 32); return ws.reduce((a, b) => a + b, 0) + (chips.length - 1) * 10; };
    while (measure() > maxW && f > 28) f -= 2;
    while (chips.length > 1 && measure() > maxW) chips = chips.slice(0, -1);
    while (measure() > maxW && f > 18) f -= 2;
    g.textAlign = 'center'; g.textBaseline = 'middle'; let cx = x;
    chips.forEach((c, i) => { const cw = ws[i], hh = f + 18; g.globalAlpha = c.pulse ? pulse : 1;
      g.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(g, cx, y - hh / 2, cw, hh, hh / 2); g.fill(); g.lineWidth = 3; g.strokeStyle = c.c || '#fff'; roundRect(g, cx, y - hh / 2, cw, hh, hh / 2); g.stroke();
      g.fillStyle = c.c || '#fff'; g.fillText(c.t, cx + cw / 2, y + 1); cx += cw + 10; });
    g.globalAlpha = 1; g.textAlign = 'left';
  }
  // a mode's own box in place of the eat meter: a label, one big number, a bar, chips (SUPERMARKET SWEEP, BOSS FIGHT)
  drawStatBox(g, w, h, b, fps) {
    const col = b.col || '#39ff14';
    g.fillStyle = '#111827'; roundRect(g, 4, 4, w - 8, h - 8, 40); g.fill(); g.lineWidth = 8; g.strokeStyle = col; roundRect(g, 4, 4, w - 8, h - 8, 40); g.stroke();
    g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#c3cad6'; { let f = 34; do { g.font = `900 ${f}px ${FONT}`; f -= 2; } while (g.measureText(b.label).width > w - 60 && f > 16); } g.fillText(b.label, 30, 44);
    const roomy = !b.chips, bigY = roomy ? 120 : 104;      // (no chips: a bigger number and the bar lower down)
    g.fillStyle = '#ffffff'; g.font = `900 ${roomy ? 84 : 64}px ${FONT}`; g.fillText(b.big, 30, bigY); const bw = g.measureText(b.big).width;
    if (b.unit) { g.fillStyle = col; g.font = `900 34px ${FONT}`; g.fillText(b.unit, 42 + bw, bigY + 14); }
    if (b.sub) { g.textAlign = 'right'; g.fillStyle = '#9aa4b8'; g.font = `900 30px ${FONT}`; g.fillText(b.sub, w - 30, bigY + 8); g.textAlign = 'left'; }
    if (b.bar) { const bx = 30, by = roomy ? 190 : 150, bW = w - 60, bh = roomy ? 56 : 46, k = Math.max(0, Math.min(1, b.bar.k));
      g.fillStyle = '#374151'; roundRect(g, bx, by, bW, bh, 23); g.fill(); if (k > 0.01) { g.fillStyle = b.bar.col || col; roundRect(g, bx, by, Math.max(46, bW * k), bh, 23); g.fill(); }
      if (b.bar.text) { g.fillStyle = '#fff'; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.strokeText(b.bar.text, w / 2, by + bh / 2 + 1); g.fillText(b.bar.text, w / 2, by + bh / 2 + 1); g.textAlign = 'left'; } }
    if (b.chips) this.drawChips(g, 30, 248, w - 60, b.chips);
    if (!this.flatMode || window.__devMode) { g.textAlign = 'right'; g.font = `900 24px ${FONT}`; g.fillStyle = fps >= 70 ? '#39ff14' : fps >= 60 ? '#ffe600' : '#ff4d4d'; g.fillText(`${fps} fps`, w - 30, 296); } g.textAlign = 'left';
  }
  // IMPOSTER: who you are, the task bar, your jobs (ticked off), the kill cooldown, any sabotage
  drawImpBox(g, w, h, st) {
    const col = st.role === 'IMPOSTER' ? '#ff3b3b' : st.role === 'GHOST' ? '#9fb3d9' : '#4fc3ff';
    g.fillStyle = '#0d1020'; roundRect(g, 4, 4, w - 8, h - 8, 40); g.fill(); g.lineWidth = 8; g.strokeStyle = st.sab ? '#ff3b3b' : col; roundRect(g, 4, 4, w - 8, h - 8, 40); g.stroke();
    g.textBaseline = 'middle'; g.textAlign = 'left';
    if (!st.role) { g.fillStyle = '#ffd400'; g.font = `900 30px ${FONT}`; g.fillText('🔪 IMPOSTER', 30, 50); g.fillStyle = '#fff'; g.font = `900 22px ${FONT}`;
      const words = (st.msg || 'GETTING READY...').split(' '); let line = '', y = 110; for (const wd of words) { if (g.measureText(line + wd).width > w - 60) { g.fillText(line, 30, y); y += 32; line = ''; } line += wd + ' '; } g.fillText(line, 30, y); return; }
    g.fillStyle = col; g.font = `900 30px ${FONT}`; g.fillText(st.role === 'GHOST' ? '👻 GHOST' : st.role === 'IMPOSTER' ? '🔪 IMPOSTER' : '😇 THE FAITHFUL', 30, 40);
    g.textAlign = 'right'; g.fillStyle = '#c9d3ff'; g.font = `900 22px ${FONT}`; g.fillText(st.meeting !== null ? `🗳 MEETING ${st.meeting}s` : st.kill !== null ? (st.kill > 0 ? `🍳 KILL IN ${st.kill}s` : '🍳 KILL READY') : `${st.alive}/${st.total} ALIVE`, w - 28, 40); g.textAlign = 'left';
    // the task bar (everyone's jobs, all together)
    const k = Math.min(1, st.bar.done / Math.max(1, st.bar.total)); g.fillStyle = '#2b3350'; roundRect(g, 26, 66, w - 52, 30, 15); g.fill(); g.fillStyle = '#39ff14'; if (k > 0.01) { roundRect(g, 26, 66, (w - 52) * k, 30, 15); g.fill(); }
    g.fillStyle = '#fff'; g.font = `900 18px ${FONT}`; g.textAlign = 'center'; g.fillText(`TOTAL JOBS DONE ${st.bar.done}/${st.bar.total}`, w / 2, 82); g.textAlign = 'left';
    let y = 120; if (st.imp) { g.fillStyle = '#ff6b6b'; g.font = `900 19px ${FONT}`; g.fillText('Kill the faithful. Fake jobs to look busy:', 30, y); y += 30; }
    for (const t of st.tasks) { g.fillStyle = t.done ? '#39ff14' : st.imp ? '#ffb4b4' : '#ffffff'; let f = 21; g.font = `900 ${f}px ${FONT}`; const s = `${t.done ? '✓' : '•'} ${t.room}: ${t.name}`; while (g.measureText(s).width > w - 56 && f > 13) { f--; g.font = `900 ${f}px ${FONT}`; } g.fillText(s, 30, y); y += 29; if (y > h - 34) break; }
    if (st.sab) { g.fillStyle = 'rgba(200,0,0,0.85)'; roundRect(g, 20, h - 52, w - 40, 40, 14); g.fill(); g.fillStyle = '#fff'; g.font = `900 22px ${FONT}`; g.textAlign = 'center'; g.fillText('⚠ ' + st.sab + ' ⚠', w / 2, h - 32); }
  }
  // Run the Pub: no eat meter, just the shift: time left, takings, how many you've served, the star rating
  drawPubBox(g, w, h, st) {
    const p = st.pub;
    g.fillStyle = '#1a0f0a'; roundRect(g, 4, 4, w - 8, h - 8, 40); g.fill(); g.lineWidth = 8; g.strokeStyle = p.time < 30 ? '#ff4d4d' : '#d4af37'; roundRect(g, 4, 4, w - 8, h - 8, 40); g.stroke();
    const m = Math.max(0, Math.floor(p.time / 60)), sec = Math.max(0, Math.floor(p.time % 60));
    g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillStyle = '#9ca3af'; g.font = `900 26px ${FONT}`; g.fillText('TIME LEFT', 34, 46); g.fillText('TAKINGS', 280, 46);
    g.fillStyle = p.time < 30 ? '#ff6b6b' : '#ffffff'; g.font = `900 64px ${FONT}`; g.fillText(`${m}:${String(sec).padStart(2, '0')}`, 30, 104);
    g.fillStyle = '#39ff14'; g.font = `900 60px ${FONT}`; let f = 60; while (g.measureText('£' + p.money.toFixed(2)).width > 210 && f > 30) { f -= 4; g.font = `900 ${f}px ${FONT}`; } g.fillText('£' + p.money.toFixed(2), 276, 104);
    g.fillStyle = 'rgba(255,255,255,0.1)'; roundRect(g, 26, 150, w - 52, 74, 22); g.fill();
    g.fillStyle = '#fff'; g.font = `900 40px ${FONT}`; g.fillText(`🍺 SERVED ${p.served}`, 44, 188);
    g.textAlign = 'right'; g.fillStyle = '#ffd400'; g.font = `900 36px ${FONT}`; g.fillText(p.stars, w - 44, 188);
    g.textAlign = 'left'; g.fillStyle = p.waiting ? '#ffb050' : '#7cff6a'; g.font = `900 28px ${FONT}`; g.fillText(p.waiting ? `${p.waiting} WAITING AT THE BAR` : 'NOBODY WAITING', 34, 262);
  }

  updateWristParent(xr) {
    let parent = null, mode = 'flat';
    if (!xr) parent = this.camera;
    else {
      const left = this.handByHandedness('left');
      if (left && left.isHand) { parent = left.hand.joints['wrist'] || null; mode = 'joint'; }
      else if (left) { parent = left.grip; mode = 'grip'; }
    }
    if (mode === 'flat' && parent) {   // pin to the top-left corner of the screen, whatever its shape
      const d = 0.3, hh = d * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)), hw = hh * this.camera.aspect;
      const sc = Math.min(1.25, hw * (this.camera.aspect < 1 ? 1.12 : 0.9) / 0.1);     // (a phone held upright: a bit bigger, easier to read)
      this.wrist.position.set(-hw + 0.05 * sc + 0.008, hh - 0.0375 * sc - 0.024, -d);
      this.wrist.scale.setScalar(sc); this.wristBase = sc;
    }
    if (parent === this.wristParent) return;
    this.wristParent = parent;
    if (!parent) { this.wrist.removeFromParent(); return; }
    parent.add(this.wrist);
    this.wrist.scale.setScalar(1); this.wristBase = mode === 'flat' ? this.wristBase || 1 : 1;
    if (mode === 'flat') {          // flat-screen preview: bottom-left of the view
      this.wrist.rotation.set(0, 0, 0); this.wristRotZ = 0;
    } else if (mode === 'joint') {  // hand tracking: on the back of the wrist (+Y = back of hand)
      this.wrist.position.set(0, 0.03, 0.03); this.wrist.rotation.set(-Math.PI / 2 + 0.35, 0, 0); this.wristRotZ = 0;
    } else {                        // controller: on top of the wrist, tilted toward your eyes
      this.wrist.position.set(0, 0.035, 0.1); this.wrist.rotation.set(-Math.PI / 2 + 0.55, 0, 0); this.wristRotZ = 0;
    }
  }

  // ---------------- the belly ----------------
  buildBelly() {
    // a real belly under his T-shirt (belly.js): bigger, saggier and more on show every stage
    this.bellyModel = new Belly();
    this.belly = new THREE.Group();
    this.bellyBall = this.bellyModel.group;
    this.belly.add(this.bellyBall);
    this.rig.add(this.belly);
    this.bellyTarget = 1; this.bellyNow = 1; this.bellyVel = 0;
  }

  setBelly(b) { this.bellyTarget = b; this.bellyModel && this.bellyModel.setStage(Belly.stageFor(b)); }

  updateBelly(dt, t) {
    // springy wobble toward the target size
    const k = 120, damp = 9;
    this.bellyVel += ((this.bellyTarget - this.bellyNow) * k - this.bellyVel * damp) * dt;
    this.bellyNow += this.bellyVel * dt;
    const b = Math.max(0.5, this.bellyNow);
    const R = 0.17 * Math.pow(b, 0.75);
    this.bellyBall.scale.setScalar(R);
    // in rig space, under the head, following head yaw only
    const cp = this.camera.position, cq = this.camera.quaternion;
    _v.set(0, 0, -1).applyQuaternion(cq); _v.y = 0;
    if (_v.lengthSq() < 1e-4) _v.set(0, 0, -1); _v.normalize();
    const drop = 0.58 + (R - 0.17) * 0.4;
    this.belly.position.set(cp.x + _v.x * (R * 0.5), Math.max(R, cp.y - drop), cp.z + _v.z * (R * 0.5));
    this.belly.rotation.y = Math.atan2(-_v.x, -_v.z);
    this.belly.visible = !this.hideBelly;     // (playing as someone else in multiplayer: you see their body instead)
  }
}
