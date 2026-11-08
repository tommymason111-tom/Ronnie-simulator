// The player IS Ronnie: XR rig, controllers + hand tracking, grab/throw,
// hand velocity (for swats), smooth locomotion + snap turn, the wrist Chonk
// Meter and Ronnie's ever-growing belly.
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { TUNING, ROOM } from './config.js';
import { FONT, roundRect } from './textures.js';

const HIST = 6;
const _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _qi = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

class Hand {
  constructor(i) {
    this.index = i;
    this.source = null;
    this.handedness = i === 0 ? 'left' : 'right';
    this.isHand = false;
    this.sel = false; this.sq = false;
    this.held = null;
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

    const cmf = new XRControllerModelFactory();
    const hmf = new XRHandModelFactory();
    this.hands.forEach((h, i) => {
      const ctrl = renderer.xr.getController(i);
      const grip = renderer.xr.getControllerGrip(i);
      const hand = renderer.xr.getHand(i);
      h.ctrl = ctrl; h.grip = grip; h.hand = hand;
      grip.add(cmf.createControllerModel(grip));
      hand.add(hmf.createHandModel(hand, 'mesh'));
      this.rig.add(ctrl, grip, hand);
      ctrl.addEventListener('connected', (e) => {
        h.source = e.data; h.isHand = !!e.data.hand; h.handedness = e.data.handedness || h.handedness;
        h.sel = h.sq = false;
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
    }
    this.updateWristParent(xr);
    this.updateBelly(dt, t);
  }

  updateHand(h, dt, t) {
    h.tracked = false;
    if (!h.source) return;
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
    if (!h.tracked) return;

    // velocity from a short position history (works for hands and controllers)
    const slot = h.hist[h.hi]; slot.p.copy(h.palm); slot.t = t; h.hi = (h.hi + 1) % HIST;
    const oldest = h.hist[h.hi];
    const span = t - oldest.t;
    if (span > 0.005 && span < 0.5) { h.vel.subVectors(h.palm, oldest.p).multiplyScalar(1 / span); h.speed = h.vel.length(); }

    // held item follows the hand
    if (h.held) {
      if (h.held.dead) { h.held = null; return; }
      const o = h.held.obj;
      o.position.copy(h.offPos).applyQuaternion(h.quat).add(h.pos);
      o.quaternion.copy(h.quat).multiply(h.offQuat);
    }
  }

  grab(h) {
    if (!h.tracked || h.held || !this.items) return;
    const r = TUNING.grabRadius * Math.max(1, this.scale);
    const it = this.items.nearest(h.pos, r);
    if (!it) return;
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

  release(h, silent = false) {
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
    // keep Ronnie's head inside the room
    this.rig.updateMatrixWorld(true);
    this.camera.getWorldPosition(_v);
    const m = 0.2, hw = ROOM.w / 2 - m, hd = ROOM.d / 2 - m;
    const cx = THREE.MathUtils.clamp(_v.x, -hw, hw), cz = THREE.MathUtils.clamp(_v.z, -hd, hd);
    this.rig.position.x += cx - _v.x; this.rig.position.z += cz - _v.z;
  }

  rotateAroundHead(angle) {
    this.rig.updateMatrixWorld(true);
    this.camera.getWorldPosition(_v);
    this.rig.rotation.y += angle;
    this.rig.updateMatrixWorld(true);
    this.camera.getWorldPosition(_v2);
    this.rig.position.x += _v.x - _v2.x; this.rig.position.z += _v.z - _v2.z;
  }

  // Scale Ronnie while keeping his head where it is horizontally.
  setScale(s) {
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
    if (parent === this.wristParent) return;
    this.wristParent = parent;
    if (!parent) { this.wrist.removeFromParent(); return; }
    parent.add(this.wrist);
    this.wrist.scale.setScalar(1);
    if (mode === 'flat') {          // flat-screen preview: bottom-left of the view
      this.wrist.position.set(-0.12, 0.075, -0.3); this.wrist.rotation.set(0, 0, 0); this.wrist.scale.setScalar(0.8);
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
