// Active ragdoll, Gang Beasts style.
//
// What makes Gang Beasts characters feel the way they do:
//  1. They are ALWAYS physics ragdolls — there is no animation playing on the
//     body. Every limb is a rigid body joined to its neighbours.
//  2. "Muscles" steer each limb toward a target pose, but only with limited
//     strength, so everything wobbles, overshoots and flails.
//  3. Balance is cheated: an invisible lift holds the hips up and keeps the
//     chest stacked above them, so they waddle instead of standing perfectly.
//  4. A big hit drops muscle strength to ~0 (knocked out) — they go fully
//     limp, then the muscles come back and haul them up off the floor.
//  5. You can grab any body part and drag / fling them around.
//
// The visual model (Tommy's scan) has no skeleton, so at load time we build
// one bone per physics body and compute skin weights from distance to each
// bone segment. Bones are driven directly from the physics bodies.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GROUP } from './physics.js';

// Bind pose (T-pose) measured from the model: metres, Tommy faces +Z.
// a→b is the bone segment, r its thickness for skinning, half the box size.
const L = (x) => x, R = (x) => -x;   // Tommy's left is +X
function partDefs() {
  const arm = (side, s) => [
    { name: 'uArm' + side, parent: 'chest', a: [s(0.21), 1.35, 0], b: [s(0.50), 1.35, 0], r: 0.065, half: [0.14, 0.05, 0.055], mass: 2.2, cone: 2.6, twist: Math.PI },
    { name: 'lArm' + side, parent: 'uArm' + side, a: [s(0.50), 1.35, 0], b: [s(0.84), 1.33, 0], r: 0.05, half: [0.17, 0.045, 0.045], mass: 1.6, cone: 1.8, twist: Math.PI },
  ];
  const leg = (side, s) => [
    { name: 'uLeg' + side, parent: 'pelvis', a: [s(0.10), 0.84, 0], b: [s(0.10), 0.47, 0], r: 0.085, half: [0.075, 0.185, 0.08], mass: 6, cone: 1.4, twist: Math.PI },
    { name: 'lLeg' + side, parent: 'uLeg' + side, a: [s(0.10), 0.47, 0], b: [s(0.10), 0.04, 0.03], r: 0.065, half: [0.06, 0.215, 0.085], mass: 4, cone: 1.5, twist: Math.PI },
  ];
  return [
    { name: 'pelvis', a: [0, 0.80, 0], b: [0, 0.98, 0], r: 0.17, half: [0.16, 0.1, 0.11], mass: 10 },
    { name: 'chest', parent: 'pelvis', a: [0, 0.98, 0], b: [0, 1.38, 0], r: 0.2, half: [0.17, 0.19, 0.11], mass: 14, cone: 0.5, twist: 0.4 },
    { name: 'head', parent: 'chest', a: [0, 1.40, 0.02], b: [0, 1.66, 0.02], r: 0.11, sphere: 0.12, mass: 4.5, cone: 0.6, twist: 0.6 },
    ...arm('L', L), ...arm('R', R), ...leg('L', L), ...leg('R', R),
  ];
}

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const _cv = new CANNON.Vec3(), _cv2 = new CANNON.Vec3();
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export class Ragdoll {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    this.world = physics.world;
    this.defs = partDefs();
    this.parts = {};
    this.list = [];
    this.strength = 1;          // 0 = limp, 1 = full muscle
    this.support = 1;           // 0..1 how much the invisible lift holds him up
    this.yaw = 0;
    this.moveVel = new THREE.Vector3();   // desired walking velocity (world)
    this.standHeight = 0.9;
    this.pose = {};             // part name -> target local quaternion (THREE)
    this.yawQ = new THREE.Quaternion();
    this.group = new THREE.Group();
    scene.add(this.group);
    this.ready = false;
    for (const d of this.defs) {
      d.a = new THREE.Vector3(...d.a); d.b = new THREE.Vector3(...d.b);
      d.center = d.a.clone().add(d.b).multiplyScalar(0.5);
      d.dir = d.b.clone().sub(d.a).normalize();
      this.pose[d.name] = new THREE.Quaternion();
    }
    this.buildBodies();
    this.world.addEventListener('preStep', () => this.control());
  }

  buildBodies() {
    for (const d of this.defs) {
      const body = new CANNON.Body({
        mass: d.mass,
        collisionFilterGroup: GROUP.RAGDOLL,
        collisionFilterMask: GROUP.STATIC | GROUP.HAND,
        linearDamping: 0.05, angularDamping: 0.3,
      });
      body.addShape(d.sphere ? new CANNON.Sphere(d.sphere) : new CANNON.Box(new CANNON.Vec3(...d.half)));
      body.position.set(d.center.x, d.center.y, d.center.z);
      body.part = d.name;
      this.world.addBody(body);
      const p = { def: d, body, name: d.name, radius: d.sphere || Math.max(...d.half) };
      this.parts[d.name] = p; this.list.push(p);
    }
    for (const d of this.defs) {
      if (!d.parent) continue;
      const parent = this.parts[d.parent].def, A = this.parts[d.parent].body, B = this.parts[d.name].body;
      const pivotA = new CANNON.Vec3(d.a.x - parent.center.x, d.a.y - parent.center.y, d.a.z - parent.center.z);
      const pivotB = new CANNON.Vec3(d.a.x - d.center.x, d.a.y - d.center.y, d.a.z - d.center.z);
      const axis = new CANNON.Vec3(d.dir.x, d.dir.y, d.dir.z);
      const c = new CANNON.ConeTwistConstraint(A, B, { pivotA, pivotB, axisA: axis, axisB: axis.clone(), angle: d.cone, twistAngle: d.twist, collideConnected: false });
      this.world.addConstraint(c);
    }
  }

  async loadModel(url) {
    const gltf = await new GLTFLoader().loadAsync(url);
    let src = null;
    gltf.scene.traverse(o => { if (o.isMesh && !src) src = o; });
    src.updateWorldMatrix(true, false);
    const geo = src.geometry.clone();
    geo.applyMatrix4(src.matrixWorld);
    const old = src.material;
    // a little self-lighting from his own texture softens the low-poly facets under harsh lights
    const mat = new THREE.MeshLambertMaterial({ map: old.map || null, normalMap: old.normalMap || null, color: 0xe6e6e6, emissive: 0x3a3a3a, emissiveMap: old.map || null });
    if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
    mat.map && (mat.map.anisotropy = 4);

    // ---- automatic skinning: weight each vertex by closeness to each bone segment ----
    const pos = geo.attributes.position, n = pos.count;
    const skinIndex = new Uint16Array(n * 4), skinWeight = new Float32Array(n * 4);
    const ds = new Float32Array(this.defs.length);
    const parentIdx = this.defs.map(d => d.parent ? this.defs.findIndex(e => e.name === d.parent) : -1);
    const adjacent = (i, j) => parentIdx[i] === j || parentIdx[j] === i;
    for (let i = 0; i < n; i++) {
      _v.fromBufferAttribute(pos, i);
      let best = 0;
      for (let k = 0; k < this.defs.length; k++) {
        const d = this.defs[k];
        ds[k] = segDist(_v, d.a, d.b) - d.r;
        if (ds[k] < ds[best]) best = k;
      }
      // blend smoothly with the bones joined to the nearest one
      const sigma = 0.025;
      let total = 0, slots = [[best, 1]];
      for (let k = 0; k < this.defs.length; k++) {
        if (k === best || !adjacent(k, best)) continue;
        const w = Math.exp(-(ds[k] - ds[best]) / sigma);
        if (w > 0.02) slots.push([k, w]);
      }
      slots.sort((a, b) => b[1] - a[1]); slots = slots.slice(0, 4);
      for (const s of slots) total += s[1];
      slots.forEach((s, j) => { skinIndex[i * 4 + j] = s[0]; skinWeight[i * 4 + j] = s[1] / total; });
    }
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));

    // ---- one bone per body, all siblings, bind = T-pose ----
    this.bones = this.defs.map(d => { const b = new THREE.Bone(); b.position.copy(d.center); this.group.add(b); return b; });
    this.mesh = new THREE.SkinnedMesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);
    this.group.updateMatrixWorld(true);
    this.mesh.bind(new THREE.Skeleton(this.bones), this.mesh.matrixWorld);
    this.ready = true;
    this.sync();
  }

  // Put every body into the target pose at a given position/yaw (used for spawning).
  placeAt(x, z, yaw) {
    this.yaw = yaw; this.yawQ.setFromAxisAngle(Y_AXIS, yaw);
    const base = new THREE.Vector3(x, 0.02, z);
    const worldQ = {}, worldP = {};
    for (const d of this.defs) {     // parents always come first in defs
      const q = new THREE.Quaternion().copy(this.yawQ).multiply(this.pose[d.name]);
      worldQ[d.name] = q;
      let joint;
      if (!d.parent) joint = d.a.clone().applyQuaternion(this.yawQ).add(base);
      else {
        const pd = this.parts[d.parent].def;
        joint = d.a.clone().sub(pd.center).applyQuaternion(worldQ[d.parent]).add(worldP[d.parent]);
      }
      worldP[d.name] = d.center.clone().sub(d.a).applyQuaternion(q).add(joint);
      const b = this.parts[d.name].body;
      b.position.set(worldP[d.name].x, worldP[d.name].y, worldP[d.name].z);
      b.quaternion.set(q.x, q.y, q.z, q.w);
      b.velocity.setZero(); b.angularVelocity.setZero();
    }
    this.sync();
  }

  // Helper: target local rotation that points a limb (bind direction) along dir.
  aim(name, x, y, z) {
    const d = this.parts[name].def;
    _v.set(x, y, z).normalize();
    this.pose[name].setFromUnitVectors(d.dir, _v);
  }

  // ---- muscles + balance, applied every physics substep ----
  control() {
    const s = this.strength;
    this.yawQ.setFromAxisAngle(Y_AXIS, this.yaw);
    if (s <= 0.001) return;
    for (const p of this.list) {
      const b = p.body;
      if (p.grabbed) continue;
      // orientation error -> angular velocity steering (stable PD in velocity space)
      _q.copy(this.yawQ).multiply(this.pose[p.name]);
      _q2.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w).invert();
      _q.multiply(_q2);
      if (_q.w < 0) { _q.x = -_q.x; _q.y = -_q.y; _q.z = -_q.z; _q.w = -_q.w; }
      const sinHalf = Math.sqrt(_q.x * _q.x + _q.y * _q.y + _q.z * _q.z);
      const ang = 2 * Math.atan2(sinHalf, _q.w);
      const gain = 14, k = (p.name === 'chest' || p.name === 'pelvis' ? 0.28 : p.name === 'head' ? 0.2 : 0.16) * s;
      let tx = 0, ty = 0, tz = 0;
      if (sinHalf > 1e-5) { const f = ang * gain / sinHalf; tx = _q.x * f; ty = _q.y * f; tz = _q.z * f; }
      const w = b.angularVelocity;
      w.x += (tx - w.x) * k; w.y += (ty - w.y) * k; w.z += (tz - w.z) * k;
    }
    // invisible lift + walking for the hips, chest kept stacked over them
    const sup = s * this.support;
    if (sup > 0.001) {
      // cancel gravity on the upper body (the "puppet strings"); legs stay a bit heavy
      const g = 9.81 * this.physics.STEP * sup;
      for (const p of this.list) { if (!p.grabbed) p.body.velocity.y += g * (p.name.startsWith('lLeg') ? 0.3 : p.name.startsWith('uLeg') ? 0.8 : 1); }
      const pel = this.parts.pelvis.body, ch = this.parts.chest.body, hd = this.parts.head.body;
      const vy = (this.standHeight - pel.position.y) * 9;
      pel.velocity.y += (vy - pel.velocity.y) * 0.22 * sup;
      pel.velocity.x += (this.moveVel.x - pel.velocity.x) * 0.12 * sup;
      pel.velocity.z += (this.moveVel.z - pel.velocity.z) * 0.12 * sup;
      _v.set(0, 0.3, 0).applyQuaternion(this.yawQ);
      const cx = pel.position.x + _v.x, cy = pel.position.y + 0.3, cz = pel.position.z + _v.z;
      ch.velocity.x += ((cx - ch.position.x) * 8 + pel.velocity.x - ch.velocity.x) * 0.12 * sup;
      ch.velocity.y += ((cy - ch.position.y) * 8 + pel.velocity.y - ch.velocity.y) * 0.12 * sup;
      ch.velocity.z += ((cz - ch.position.z) * 8 + pel.velocity.z - ch.velocity.z) * 0.12 * sup;
      hd.velocity.y += ((ch.position.y + 0.36 - hd.position.y) * 6 - hd.velocity.y) * 0.08 * sup;
    }
  }

  sync() {
    if (!this.bones) return;
    this.list.forEach((p, i) => {
      const b = p.body, bone = this.bones[i];
      bone.position.set(b.position.x, b.position.y, b.position.z);
      bone.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
    });
  }

  // ---- queries ----
  pos(name, out) { const b = this.parts[name].body.position; return out.set(b.x, b.y, b.z); }
  vel(name, out) { const b = this.parts[name].body.velocity; return out.set(b.x, b.y, b.z); }
  // world point at the end of a limb (e.g. the hand)
  tip(name, out) {
    const p = this.parts[name], d = p.def, b = p.body;
    out.copy(d.b).sub(d.center);
    _q.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
    return out.applyQuaternion(_q).add(_v2.set(b.position.x, b.position.y, b.position.z));
  }
  upright() { const q = this.parts.chest.body.quaternion; _q.set(q.x, q.y, q.z, q.w); return _v.set(0, 1, 0).applyQuaternion(_q).y; }
  speed() { const v = this.parts.chest.body.velocity; return Math.hypot(v.x, v.y, v.z); }

  // Nearest body part to a point (within its own size + extra).
  nearestPart(point, extra = 0) {
    let best = null, bd = Infinity;
    for (const p of this.list) {
      const b = p.body.position;
      const d = Math.hypot(point.x - b.x, point.y - b.y, point.z - b.z) - p.radius - extra;
      if (d < 0 && d < bd) { bd = d; best = p; }
    }
    return best;
  }

  hit(part, point, impulse) {
    const b = part.body;
    _cv.set(impulse.x, impulse.y, impulse.z);
    _cv2.set(point.x - b.position.x, point.y - b.position.y, point.z - b.position.z);
    b.applyImpulse(_cv, _cv2);
  }

  // Push the whole body (e.g. a big launch)
  shove(vx, vy, vz) { for (const p of this.list) { p.body.velocity.x += vx; p.body.velocity.y += vy; p.body.velocity.z += vz; } }
}

function segDist(p, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const apx = p.x - a.x, apy = p.y - a.y, apz = p.z - a.z;
  const l2 = abx * abx + aby * aby + abz * abz;
  const t = l2 > 0 ? Math.max(0, Math.min(1, (apx * abx + apy * aby + apz * abz) / l2)) : 0;
  const dx = apx - abx * t, dy = apy - aby * t, dz = apz - abz * t;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
