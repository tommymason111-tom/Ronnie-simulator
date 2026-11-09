// The player IS Ronnie: XR rig, hands (never controllers — you see hands whose
// fingers curl as you press the trigger/grip, or your real tracked fingers),
// grab/throw, hand velocity (for swats and slaps), physics hand bodies that can
// shove Tommy's ragdoll, grabbing Tommy himself, smooth locomotion + snap turn,
// the wrist Chonk Meter, Ronnie's ever-growing belly, and a first-person hand
// for playing on a phone / tablet.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { TUNING, ROOM } from './config.js';
import { FONT, roundRect } from './textures.js';
import { ControllerHand, skinTrackedHand } from './hands.js';
import { GROUP } from './physics.js';

const HIST = 6;
const _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _qi = new THREE.Quaternion();
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

  // Kinematic spheres that follow your palms, so you can physically shove Tommy.
  setPhysics(physics) {
    this.physics = physics;
    for (const h of this.hands) {
      h.body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, collisionFilterGroup: GROUP.HAND, collisionFilterMask: GROUP.RAGDOLL });
      h.body.addShape(new CANNON.Sphere(0.05));
      h.body.position.set(0, -10, 0);
      physics.world.addBody(h.body);
    }
  }

  // ---------------- per-frame ----------------
  update(dt, t) {
    const xr = this.renderer.xr.isPresenting;
    this.rig.updateMatrixWorld(true);

    // head, forward, mouth
    this.camera.getWorldPosition(this.head);
    this.camera.getWorldDirection(this.fwd);
    _v.set(0, -1, 0).applyQuaternion(this.camera.getWorldQuaternion(_q));
    this.mouth.copy(this.head).addScaledVector(_v, 0.075 * this.scale).addScaledVector(this.fwd, 0.06 * this.scale);

    if (xr) {
      for (const h of this.hands) this.updateHand(h, dt, t);
      this.locomotion(dt);
    } else {
      for (const h of this.hands) { if (h.body) h.body.position.set(0, -10, 0); if (h.ctrlHand) h.ctrlHand.root.visible = false; }
      this.updateFlat(dt, t);
    }
    this.updateWristParent(xr);
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
    if (h.ctrlHand && !h.isHand) h.ctrlHand.fromGamepad(h.source.gamepad, !!(h.held || h.heldPart));

    // physics hand follows the palm (with its velocity, so it imparts momentum)
    if (h.body) {
      h.body.position.set(h.palm.x, h.palm.y, h.palm.z);
      h.body.velocity.set(h.vel.x, h.vel.y, h.vel.z);
      h.body.collisionResponse = !h.heldPart;
      h.body.shapes[0].radius = 0.05 * this.scale; h.body.updateBoundingRadius();
    }

    // held item follows the hand
    if (h.held) {
      if (h.held.dead) { h.held = null; return; }
      const o = h.held.obj;
      o.position.copy(h.offPos).applyQuaternion(h.quat).add(h.pos);
      o.quaternion.copy(h.quat).multiply(h.offQuat);
    }
  }

  grab(h) {
    if (!h.tracked || h.held || h.heldPart || !this.items) return;
    const r = TUNING.grabRadius * Math.max(1, this.scale);
    const it = this.items.nearest(h.pos, r);
    if (!it) { this.grabTommy(h); return; }
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
    if (!this.tommy || !this.physics || !h.body) return;
    const part = this.tommy.partAt(h.pos, 0.07 * this.scale);
    if (!part) return;
    const b = part.body;
    _q.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w).invert();
    _v.set(h.pos.x - b.position.x, h.pos.y - b.position.y, h.pos.z - b.position.z).applyQuaternion(_q);
    h.body.position.set(h.pos.x, h.pos.y, h.pos.z);
    h.joint = new CANNON.PointToPointConstraint(h.body, new CANNON.Vec3(h.pos.x - h.palm.x, h.pos.y - h.palm.y, h.pos.z - h.palm.z), b, new CANNON.Vec3(_v.x, _v.y, _v.z), 4000);
    this.physics.world.addConstraint(h.joint);
    part.grabbed = true;
    h.heldPart = part;
    h.pulse(0.8, 60);
    this.tommy.grabbed(part);
  }

  releaseTommy(h) {
    if (!h.heldPart) return;
    this.physics.world.removeConstraint(h.joint);
    h.joint = null;
    const b = h.heldPart.body;
    b.velocity.x += h.vel.x * 0.5; b.velocity.y += h.vel.y * 0.5; b.velocity.z += h.vel.z * 0.5;
    if (!this.hands.some(o => o !== h && o.heldPart === h.heldPart)) h.heldPart.grabbed = false;
    h.heldPart = null;
    this.tommy.released();
  }

  release(h, silent = false) {
    if (h.heldPart) { this.releaseTommy(h); return; }
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
  locomotion(dt) {
    let mx = 0, mz = 0, turn = 0;
    for (const h of this.hands) {
      const gp = h.source?.gamepad;
      if (!gp || h.isHand) continue;
      const ax = gp.axes.length >= 4 ? gp.axes[2] : gp.axes[0] || 0;
      const ay = gp.axes.length >= 4 ? gp.axes[3] : gp.axes[1] || 0;
      if (h.handedness === 'left') { mx = ax; mz = ay; }
      else turn = ax;
    }
    if (Math.abs(mx) > 0.15 || Math.abs(mz) > 0.15) {
      _v.set(this.fwd.x, 0, this.fwd.z).normalize();
      _v2.crossVectors(_v, UP);       // right
      const sp = TUNING.moveSpeed * dt;
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
    const m = 0.2, hw = ROOM.w / 2 - m, hd = ROOM.d / 2 - m;
    let cx = THREE.MathUtils.clamp(_v.x, -hw, hw), cz = THREE.MathUtils.clamp(_v.z, -hd, hd);
    const r = 0.22;
    for (const b of this.room?.blockers || []) {
      const nx = THREE.MathUtils.clamp(cx, b.x0, b.x1), nz = THREE.MathUtils.clamp(cz, b.z0, b.z1);
      const dx = cx - nx, dz = cz - nz, d = Math.hypot(dx, dz);
      if (d < r && this.flatMode) { if (d < 1e-4) { cz = b.z1 + r; } else { cx = nx + dx / d * r; cz = nz + dz / d * r; } }
    }
    this.rig.position.x += cx - _v.x; this.rig.position.z += cz - _v.z;
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
    const f = this.flatHolder;
    if (f.held) this.flatDrop();
    if (it.heldBy && it.heldBy !== f) it.heldBy.held = null;
    it.heldBy = f; f.held = it; it.resting = false; it.vel.set(0, 0, 0);
    this.onGrab && this.onGrab(it, f);
  }

  flatThrow(power = 7) {
    const f = this.flatHolder, it = f?.held;
    if (!it) return;
    f.held = null; it.heldBy = null;
    it.vel.copy(this.fwd).multiplyScalar(power); it.vel.y += 1.6;
    it.spin.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(30);
    it.thrownByPlayer = true;
    this.onRelease && this.onRelease(it, f, power);
  }

  flatDrop() { const f = this.flatHolder; if (f?.held) { f.held.heldBy = null; f.held = null; } }

  // EAT button: swing the held food up to the mouth (the normal bite / chug code does the rest)
  flatEat() { if (this.flatHolder?.held && this.flatEatT < 0) this.flatEatT = 0; }

  updateFlat(dt, t) {
    if (!this.flatMode) return;
    this.camera.position.set(0, 1.6, 0);
    this.camera.rotation.set(this.flatPitch, this.flatYaw, 0, 'YXZ');
    const mx = this.flatMove.x, mz = this.flatMove.z;
    if (Math.abs(mx) > 0.05 || Math.abs(mz) > 0.05) {
      const sp = TUNING.moveSpeed * dt * 0.9;
      const sy = Math.sin(this.flatYaw), cy = Math.cos(this.flatYaw);
      this.rig.position.x += (-sy * -mz + cy * mx) * sp;
      this.rig.position.z += (-cy * -mz - sy * mx) * sp;
    }
    this.clampHead();
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
      g.rotation.set(FLAT_REST + (drink ? 1.3 : 0.2) * k, 0.3 * (1 - k), 0);
    } else { g.position.set(0.18, -0.21 + Math.sin(t * 2) * 0.004, -0.4); g.rotation.set(FLAT_REST, 0.3, 0); }
    if (this.flatHandModel.ready) { const c = f.held ? 0.85 : 0.35; for (const n in this.flatHandModel.curl) this.flatHandModel.curl[n] += (c - this.flatHandModel.curl[n]) * 0.3; this.flatHandModel.update(); }
    if (f.held) {
      if (f.held.dead) { f.held = null; return; }
      this.camera.updateMatrixWorld(true);
      g.updateMatrixWorld(true);
      const o = f.held.obj;
      g.matrixWorld.decompose(o.position, o.quaternion, _s);
      o.quaternion.multiply(this.itemTwist);
    }
  }

  // After the rig jumps (snap turn, growth, teleport) hands would look like they
  // moved at warp speed — forget their recent history so nothing gets flung or slapped.
  resetHandHistory() {
    for (const h of this.hands) { for (const e of h.hist) e.t = -10; h.vel.set(0, 0, 0); h.speed = 0; }
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
  buildWrist() {
    this.wristCanvas = document.createElement('canvas');
    this.wristCanvas.width = 512; this.wristCanvas.height = 320;
    this.wristTex = new THREE.CanvasTexture(this.wristCanvas);
    this.wristTex.colorSpace = THREE.SRGBColorSpace;
    this.wristTex.generateMipmaps = false; this.wristTex.minFilter = THREE.LinearFilter;
    const mat = new THREE.MeshBasicMaterial({ map: this.wristTex, transparent: true, toneMapped: false });
    this.wrist = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.0625), mat);
    this.wrist.renderOrder = 5;
    this.wristParent = null;
  }

  drawWrist(state) {
    const g = this.wristCanvas.getContext('2d'), w = 512, h = 320;
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#111827'; roundRect(g, 4, 4, w - 8, h - 8, 40); g.fill();
    g.lineWidth = 8; g.strokeStyle = state.loco > 0 ? '#ff9a1f' : '#39ff14'; roundRect(g, 4, 4, w - 8, h - 8, 40); g.stroke();
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillStyle = '#9ca3af'; g.font = `900 30px ${FONT}`;
    g.fillText(`CHONK METER · STAGE ${state.stage + 1}/${state.stages}`, 30, 44);
    g.fillStyle = '#ffffff'; g.font = `900 46px ${FONT}`;
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
    g.fillStyle = '#ffffff'; g.font = `900 34px ${FONT}`; g.textAlign = 'center';
    g.fillText(state.max ? `${Math.round(state.chonk)} — MAXED OUT` : `${Math.round(state.chonk)} / ${state.next}`, w / 2, by + bh / 2 + 2);
    g.textAlign = 'left';
    if (state.loco > 0) {
      g.fillStyle = '#ff9a1f'; g.font = `900 36px ${FONT}`;
      g.fillText(`MANGO LOCO MODE x3 · ${state.loco.toFixed(1)}s`, 30, 262);
    } else {
      g.fillStyle = '#6b7280'; g.font = `900 28px ${FONT}`;
      g.fillText(`Eaten: ${state.eaten}  Swats: ${state.swats}`, 30, 262);
    }
    g.textAlign = 'right'; g.font = `900 24px ${FONT}`;
    g.fillStyle = state.fps >= 70 ? '#39ff14' : state.fps >= 60 ? '#ffe600' : '#ff4d4d';
    g.fillText(`${state.fps} fps`, w - 30, 296);
    this.wristTex.needsUpdate = true;
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
      const sc = Math.min(1.15, hw * 0.9 / 0.1);
      this.wrist.position.set(-hw + 0.05 * sc + 0.008, hh - 0.031 * sc - 0.03, -d);
      this.wrist.scale.setScalar(sc);
    }
    if (parent === this.wristParent) return;
    this.wristParent = parent;
    if (!parent) { this.wrist.removeFromParent(); return; }
    parent.add(this.wrist);
    this.wrist.scale.setScalar(1);
    if (mode === 'flat') {          // flat-screen preview: bottom-left of the view
      this.wrist.rotation.set(0, 0, 0);
    } else if (mode === 'joint') {  // hand tracking: on the back of the wrist (+Y = back of hand)
      this.wrist.position.set(0, 0.03, 0.03); this.wrist.rotation.set(-Math.PI / 2 + 0.35, 0, 0);
    } else {                        // controller: on top of the wrist, tilted toward your eyes
      this.wrist.position.set(0, 0.035, 0.1); this.wrist.rotation.set(-Math.PI / 2 + 0.55, 0, 0);
    }
  }

  // ---------------- the belly ----------------
  buildBelly() {
    const shirt = new THREE.MeshLambertMaterial({ color: 0x1f4fbf });
    this.belly = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), shirt);
    ball.scale.set(1.1, 1, 0.9);
    this.bellyBall = ball;
    const button = new THREE.Mesh(new THREE.CircleGeometry(0.01, 10), new THREE.MeshBasicMaterial({ color: 0x0d2a70 }));
    this.bellyButton = button;
    this.belly.add(ball, button);
    this.rig.add(this.belly);
    this.bellyTarget = 1; this.bellyNow = 1; this.bellyVel = 0;
  }

  setBelly(b) { this.bellyTarget = b; }

  updateBelly(dt, t) {
    // springy wobble toward the target size
    const k = 120, damp = 9;
    this.bellyVel += ((this.bellyTarget - this.bellyNow) * k - this.bellyVel * damp) * dt;
    this.bellyNow += this.bellyVel * dt;
    const b = Math.max(0.5, this.bellyNow);
    const R = 0.17 * Math.pow(b, 0.75);
    this.bellyBall.scale.set(1.1 * R / 0.17, R / 0.17, 0.9 * R / 0.17);
    // in rig space, under the head, following head yaw only
    const cp = this.camera.position, cq = this.camera.quaternion;
    _v.set(0, 0, -1).applyQuaternion(cq); _v.y = 0;
    if (_v.lengthSq() < 1e-4) _v.set(0, 0, -1); _v.normalize();
    const drop = 0.58 + (R - 0.17) * 0.4;
    this.belly.position.set(cp.x + _v.x * (R * 0.5), Math.max(R, cp.y - drop), cp.z + _v.z * (R * 0.5));
    this.belly.rotation.y = Math.atan2(-_v.x, -_v.z);
    this.bellyButton.position.set(0, -R * 0.1, -R * 0.9 - 0.002);
    this.bellyButton.rotation.y = Math.PI;
    this.belly.visible = true;
  }
}
