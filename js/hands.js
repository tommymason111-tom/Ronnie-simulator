// Virtual hands instead of controllers.
//  • Holding Quest controllers: a hand model is wrapped around each controller
//    and its fingers curl with the trigger (index finger) and grip (other
//    fingers); the thumb lowers when it touches a button or the stick.
//  • Hand tracking: three.js's XRHandModelFactory drives the same hand model
//    from your real finger joints.
// The hand models (assets/hands/*.glb) are the WebXR Input Profiles "generic
// hand" (MIT licence). Their bones use the WebXR joint layout:
// -Z points toward the fingertips, +Y out of the back of the hand.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const FINGERS = {
  thumb: ['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'],
  index: ['index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip'],
  middle: ['middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip'],
  ring: ['ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip'],
  pinky: ['pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip'],
};
// [joint index to bend at, radians at full curl]
const BENDS = {
  thumb: [[0, 0.35], [1, 0.6], [2, 0.7]],
  index: [[1, 1.45], [2, 1.65], [3, 1.0]],
  middle: [[1, 1.5], [2, 1.7], [3, 1.0]],
  ring: [[1, 1.55], [2, 1.7], [3, 1.0]],
  pinky: [[1, 1.6], [2, 1.6], [3, 1.0]],
};

// Where the wrist sits relative to the controller's grip space (see README for
// the convention). Tuned by rendering the hand around the Quest controller model.
export const MOUNT = {
  right: { pos: [0.03, 0.07, 0.035], euler: [0, 0, 0] },
  left: { pos: [-0.03, 0.07, 0.035], euler: [0, 0, 0] },
};

const loader = new GLTFLoader();
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _ax = new THREE.Vector3(), _d = new THREE.Vector3();

export class ControllerHand {
  constructor(side) {
    this.side = side;
    this.root = new THREE.Group();
    this.root.visible = false;
    this.curl = { thumb: 0.2, index: 0.2, middle: 0.3, ring: 0.3, pinky: 0.3 };
    this.ready = false;
  }

  async load(baseUrl = './assets/hands/') {
    const gltf = await loader.loadAsync(`${baseUrl}${this.side}.glb`);
    const model = gltf.scene;
    model.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.material = skinMaterial(o.material); } });
    this.bones = {};
    for (const chain of Object.values(FINGERS)) for (const n of chain) this.bones[n] = model.getObjectByName(n);
    this.bones.wrist = model.getObjectByName('wrist');
    this.rest = {};
    for (const [n, b] of Object.entries(this.bones)) this.rest[n] = { p: b.position.clone(), q: b.quaternion.clone() };
    this.model = model;
    this.root.add(model);
    this.applyMount();
    this.ready = true;
    this.update();
  }

  // Place the model so its wrist joint lands on the mount pose.
  applyMount() {
    const w = this.rest.wrist, m = MOUNT[this.side];
    // basis of the wrist in grip space. The controller handle runs along the grip's
    // Z axis, so the fingers wrap around Z: back of hand faces outward (+X right
    // hand, -X left), knuckles point down (-Y), forearm goes up the grip's +Y.
    const s = this.side === 'right' ? 1 : -1;
    const Y = new THREE.Vector3(s, 0, 0), Z = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3().crossVectors(Y, Z);
    _m.makeBasis(X, Y, Z);
    _q.setFromRotationMatrix(_m).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...m.euler)));
    _m.compose(new THREE.Vector3(...m.pos), _q, new THREE.Vector3(1, 1, 1));
    _m2.compose(w.p, w.q, new THREE.Vector3(1, 1, 1)).invert();
    _m.multiply(_m2);
    this.model.matrixAutoUpdate = false;
    this.model.matrix.copy(_m);
  }

  // Simple forward kinematics: bend each finger at its knuckles.
  update() {
    if (!this.bones) return;
    for (const [finger, chain] of Object.entries(FINGERS)) {
      const c = THREE.MathUtils.clamp(this.curl[finger], 0, 1);
      const P = chain.map(n => this.rest[n].p.clone()), Q = chain.map(n => this.rest[n].q.clone());
      for (const [j, full] of BENDS[finger]) {
        _ax.set(1, 0, 0).applyQuaternion(Q[j]);
        _q.setFromAxisAngle(_ax, -full * c);
        for (let k = j + 1; k < chain.length; k++) P[k].sub(P[j]).applyQuaternion(_q).add(P[j]);
        for (let k = j; k < chain.length; k++) Q[k].premultiply(_q);
      }
      chain.forEach((n, i) => { this.bones[n].position.copy(P[i]); this.bones[n].quaternion.copy(Q[i]); });
    }
  }

  // Drive the fingers from the controller's buttons.
  fromGamepad(gp, holding) {
    if (!gp) return;
    const b = gp.buttons, val = (i) => (b[i] ? b[i].value : 0), touch = (i) => !!(b[i] && (b[i].touched || b[i].pressed));
    const trig = val(0), grip = val(1);
    const k = 0.35;   // smoothing
    const tgt = {
      // holding: fingers close exactly round the item (holding = that curl), no further
      index: holding ? holding : 0.12 + 0.88 * trig,
      middle: holding ? holding : 0.3 + 0.7 * grip,
      ring: holding ? holding : 0.32 + 0.68 * grip,
      pinky: holding ? holding : 0.34 + 0.66 * grip,
      thumb: (touch(3) || touch(4) || touch(5) || holding) ? 0.75 : 0.25,
    };
    for (const f in tgt) this.curl[f] += (tgt[f] - this.curl[f]) * k;
    this.update();
  }
}

// Slightly warmer skin tone than the default grey hand, and cheap Lambert shading.
function skinMaterial(old) {
  return new THREE.MeshLambertMaterial({ color: 0xe0ac8a, map: old?.map || null });
}

// Same material for tracked hands (XRHandModelFactory), applied once its mesh loads.
export function skinTrackedHand(handModel) {
  const fix = () => handModel.traverse(o => { if (o.isMesh && !o.userData.skinned) { o.material = skinMaterial(o.material); o.userData.skinned = true; } });
  const iv = setInterval(() => { fix(); if (handModel.children.length) { fix(); clearInterval(iv); } }, 250);
}
