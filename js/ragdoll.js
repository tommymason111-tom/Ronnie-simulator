// Character ragdoll: 11 rigid bodies (pelvis, chest, head, upper/lower arms,
// upper/lower legs) with realistic joints.
//
// Standing / walking ('anim' mode): the bodies are kinematic and follow an
// animated pose exactly (forward kinematics), so characters look and move like
// normal people — no wobble, no flop.
// Knocked out / grabbed ('ragdoll' mode): the bodies go dynamic and it is a
// normal limp ragdoll — elbows and
// knees are hinges that only bend the right way, every joint has swing and
// twist limits, and joint friction + damping make it drop like a heavy body
// instead of rippling like jelly. Getting up ('blend' mode) smoothly blends from
// wherever the body landed back into the animated pose.
//
// The visual model can be Tommy's scanned mesh (auto-skinned to one bone per
// body) or a procedural character built from shapes (see squad.js).
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { characterGroup, GROUP } from './physics.js';

// Every model is downloaded once (shared by every character that uses it), started as early as possible
// (while you're still on the menu), and retried if the connection drops, so nobody turns up invisible.
const MODELS = new Map();
export function fetchModel(url) {
  if (!MODELS.has(url)) {
    const p = (async () => {
      let err;
      for (let i = 0; i < 4; i++) {
        try { return await new GLTFLoader().loadAsync(url); }
        catch (e) { err = e; await new Promise(r => setTimeout(r, 600 * (i + 1))); }
      }
      MODELS.delete(url); throw err;
    })();
    MODELS.set(url, p);
  }
  return MODELS.get(url);
}
export const preloadModels = (urls) => Promise.allSettled(urls.map(fetchModel));
const legSide = (d) => d.name.includes('Leg') ? (d.name.endsWith('L') ? 1 : -1) : 0;

// Bind pose (T-pose), measured from Tommy's model: metres, faces +Z, his left is +X.
// Other characters scale it by height (h), shoulder width (sw) and girth.
//  a→b: bone segment   r: thickness for skinning   half: box size
//  joint: 'cone' (ball joint with swing limit) or 'hinge' (elbow/knee)
//  twist: max twist (rad)   hinge: [axis, min, max]
// A skeleton measured from a model in any pose (arms down, T-pose, arms forward).
// All values in metres on the model; left side given, right side mirrored.
//  sh/el/ha: shoulder, elbow, fingertip   hipX/hipY/kneeY: legs   neckY/topY/headZ: head
//  chestW/chestD/pelvisW: half sizes   arm/leg: limb thickness (half)   zOff: body depth offset
function boundDefs(b) {
  const z = b.zOff || 0, mir = (p, s) => [s * p[0], p[1], p[2]];
  const gx = b.girth || 1, h = b.h;
  const hipY = b.hipY, kneeY = b.kneeY ?? hipY * 0.55, ankY = 0.04 * h / 1.68;
  const arm = (side, s) => [
    { name: 'uArm' + side, parent: 'chest', a: mir(b.sh, s), b: mir(b.el, s), r: b.arm * 1.25, t: b.arm, mass: 2.2 * gx, joint: 'cone', cone: 2.4, twist: 1.0 },
    { name: 'lArm' + side, parent: 'uArm' + side, a: mir(b.el, s), b: mir(b.ha, s), r: b.arm, t: b.arm * 0.85, mass: 1.6 * gx, joint: 'hinge', bend: 'fwd', lim: [0, 2.5] },
  ];
  const leg = (side, s) => [
    { name: 'uLeg' + side, parent: 'pelvis', a: [s * b.hipX, hipY, z], b: [s * b.hipX, kneeY, z], r: b.leg * 1.1, t: b.leg, mass: 6 * gx, joint: 'cone', cone: 1.05, twist: 0.5 },
    { name: 'lLeg' + side, parent: 'uLeg' + side, a: [s * b.hipX, kneeY, z], b: [s * b.hipX, ankY, z + 0.03], r: b.leg * 0.85, t: b.leg * 0.8, mass: 4 * Math.sqrt(gx), joint: 'hinge', bend: 'back', lim: [-0.05, 2.4] },
  ];
  const pelB = hipY + 0.14 * h / 1.68;
  const defs = [
    { name: 'pelvis', a: [0, hipY - 0.04 * h / 1.68, z], b: [0, pelB, z], r: b.pelvisW * 1.05, half: [b.pelvisW, (pelB - hipY + 0.04 * h / 1.68) / 2, b.chestD * 0.95], mass: 10 * gx },
    { name: 'chest', parent: 'pelvis', a: [0, pelB, z], b: [0, b.neckY - 0.02, z], r: b.chestW * 1.15, half: [b.chestW, (b.neckY - 0.02 - pelB) / 2, b.chestD], mass: 14 * gx, joint: 'cone', cone: 0.45, twist: 0.4 },
    { name: 'head', parent: 'chest', a: [0, b.neckY, b.headZ ?? z], b: [0, b.topY, b.headZ ?? z], r: 0.11 * h / 1.68, sphere: 0.12 * h / 1.68, mass: 4.5, joint: 'cone', cone: 0.6, twist: 0.7 },
    ...arm('L', 1), ...arm('R', -1), ...leg('L', 1), ...leg('R', -1),
  ];
  const k = h / 1.68;
  for (const d of defs) d.mass *= k * k * k;
  return defs;
}

export function partDefs(opts = {}) {
  if (opts.bind) return boundDefs({ h: opts.h, girth: opts.girth, ...opts.bind });
  const { h = 1.68, sw = 1, girth = 1, limb = 1 } = opts;
  const k = h / 1.68, gx = girth, sh = sw;
  const arm = (side, s) => [
    { name: 'uArm' + side, parent: 'chest', a: [s(0.21 * sh), 1.35, 0], b: [s(0.21 * sh + 0.29), 1.35, 0], r: 0.065 * limb, t: 0.052 * limb, mass: 2.2 * limb, joint: 'cone', cone: 2.4, twist: 1.0 },
    { name: 'lArm' + side, parent: 'uArm' + side, a: [s(0.21 * sh + 0.29), 1.35, 0], b: [s(0.21 * sh + 0.63), 1.33, 0], r: 0.05 * limb, t: 0.045 * limb, mass: 1.6 * limb, joint: 'hinge', bend: 'fwd', lim: [0, 2.5] },
  ];
  const leg = (side, s) => [
    { name: 'uLeg' + side, parent: 'pelvis', a: [s(0.10 * gx), 0.84, 0], b: [s(0.10 * gx), 0.47, 0], r: 0.085 * limb * Math.sqrt(gx), t: 0.078 * limb * Math.sqrt(gx), mass: 6 * gx, joint: 'cone', cone: 1.4, twist: 0.6 },
    { name: 'lLeg' + side, parent: 'uLeg' + side, a: [s(0.10 * gx), 0.47, 0], b: [s(0.10 * gx), 0.04, 0.03], r: 0.065 * limb, t: 0.065 * limb, mass: 4 * Math.sqrt(gx), joint: 'hinge', bend: 'back', lim: [-0.05, 2.4] },
  ];
  const defs = [
    { name: 'pelvis', a: [0, 0.80, 0], b: [0, 0.98, 0], r: 0.17 * gx, half: [0.16 * gx, 0.1, 0.11 * gx], mass: 10 * gx },
    { name: 'chest', parent: 'pelvis', a: [0, 0.98, 0], b: [0, 1.38, 0], r: 0.2 * Math.max(gx, sh * 0.95), half: [0.17 * Math.max(gx, sh), 0.19, 0.11 * gx], mass: 14 * gx * sh, joint: 'cone', cone: 0.45, twist: 0.4 },
    { name: 'head', parent: 'chest', a: [0, 1.40, 0.02], b: [0, 1.66, 0.02], r: 0.11, sphere: 0.12, mass: 4.5, joint: 'cone', cone: 0.6, twist: 0.7 },
    ...arm('L', (x) => x), ...arm('R', (x) => -x), ...leg('L', (x) => x), ...leg('R', (x) => -x),
  ];
  // scale everything by height (keeps Tommy exactly as measured when h = 1.68)
  for (const d of defs) {
    d.a = d.a.map(v => v * k); d.b = d.b.map(v => v * k);
    d.r *= k; if (d.t) d.t *= k; if (d.half) d.half = d.half.map(v => v * k); if (d.sphere) d.sphere *= k;
    d.mass *= k * k * k;
  }
  return defs;
}

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const _cv = new CANNON.Vec3(), _cv2 = new CANNON.Vec3();
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export class Ragdoll {
  constructor(scene, physics, bodyOpts = {}) {
    this.scene = scene;
    this.physics = physics;
    this.world = physics.world;
    this.defs = partDefs(bodyOpts);
    this.height = bodyOpts.h || 1.68;
    this.parts = {};
    this.list = [];
    this.mode = 'anim';         // 'anim' | 'ragdoll' | 'blend'
    this.strength = 0;          // ragdoll mode only: 0 = limp, >0 = weak flailing muscles (when held)
    this.root = new THREE.Vector3();      // feet position (anim mode)
    this.bob = 0;               // extra hip height (walk bob)
    this.constrain = null;      // (root) => keeps the root out of walls / furniture
    this._fk = this.defs.map(() => ({ p: new THREE.Vector3(), q: new THREE.Quaternion() }));
    this._from = this.defs.map(() => ({ p: new THREE.Vector3(), q: new THREE.Quaternion() }));
    this.yaw = 0;
    this.moveVel = new THREE.Vector3();   // desired walking velocity (world)
    this.standHeight = 0.9 * this.height / 1.68;
    this.joints = [];
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
    const cy = (n) => this.defs.find(d => d.name === n).center;
    this.standHeight = cy('pelvis').y + 0.01;
    this.chestUp = cy('chest').y - cy('pelvis').y;
    this.headUp = cy('head').y - cy('chest').y;
    this.buildBodies();
    this._ctrl = () => this.control();
    this.world.addEventListener('preStep', this._ctrl);
  }

  buildBodies() {
    const cg = characterGroup();
    for (const d of this.defs) {
      const body = new CANNON.Body({
        mass: d.mass,
        // a character's own parts pass through each other, except the two legs, which
        // collide so they can't cross through each other when the body falls
        collisionFilterGroup: cg.group | (legSide(d) === 1 ? GROUP.LLEG : legSide(d) === -1 ? GROUP.RLEG : 0),
        collisionFilterMask: cg.mask | (legSide(d) === 1 ? GROUP.RLEG : legSide(d) === -1 ? GROUP.LLEG : 0),
        linearDamping: 0.08, angularDamping: 0.45,
      });
      if (d.sphere) body.addShape(new CANNON.Sphere(d.sphere));
      else if (d.t) {          // limb: a box along the bone, whatever direction it points in the bind pose
        const len = d.a.distanceTo(d.b);
        d.half = [d.t, len / 2, d.t];
        _q.setFromUnitVectors(Y_AXIS, d.dir);
        body.addShape(new CANNON.Box(new CANNON.Vec3(d.t, len / 2, d.t)), new CANNON.Vec3(0, 0, 0), new CANNON.Quaternion(_q.x, _q.y, _q.z, _q.w));
      } else body.addShape(new CANNON.Box(new CANNON.Vec3(...d.half)));
      body.position.set(d.center.x, d.center.y, d.center.z);
      body.part = d.name;
      body.ragdoll = this;
      body.type = CANNON.Body.KINEMATIC;
      this.world.addBody(body);
      const p = { def: d, body, name: d.name, radius: d.sphere || Math.max(...d.half) };
      this.parts[d.name] = p; this.list.push(p);
    }
    for (const d of this.defs) {
      if (!d.parent) continue;
      const parent = this.parts[d.parent].def, A = this.parts[d.parent].body, B = this.parts[d.name].body;
      const pivotA = new CANNON.Vec3(d.a.x - parent.center.x, d.a.y - parent.center.y, d.a.z - parent.center.z);
      const pivotB = new CANNON.Vec3(d.a.x - d.center.x, d.a.y - d.center.y, d.a.z - d.center.z);
      let c, axis;
      if (d.joint === 'hinge') {
        // elbows and knees: a hinge, plus angle limits enforced in limits().
        // The axis is sideways to the bone, so a positive angle bends the elbow
        // forward and the knee backward, whatever pose the model was made in.
        axis = new THREE.Vector3().crossVectors(d.dir, _v.set(0, 0, 1));
        if (axis.lengthSq() < 1e-4) axis.set(d.dir.y > 0 ? -1 : 1, 0, 0);
        axis.normalize();
        if (d.bend === 'back') axis.negate();
        d.hinge = [axis.toArray(), d.lim[0], d.lim[1]];
        const ca = new CANNON.Vec3(axis.x, axis.y, axis.z);
        c = new CANNON.HingeConstraint(A, B, { pivotA, pivotB, axisA: ca, axisB: ca.clone(), collideConnected: false });
      } else {
        // ball joints: cannon's cone limit for swing; twist is limited in limits()
        // (cannon's own twist limit also blocks swing, so it's left wide open)
        axis = d.dir.clone();
        const ca = new CANNON.Vec3(axis.x, axis.y, axis.z);
        c = new CANNON.ConeTwistConstraint(A, B, { pivotA, pivotB, axisA: ca, axisB: ca.clone(), angle: d.cone, twistAngle: Math.PI, collideConnected: false });
      }
      for (const eq of c.equations) { eq.setSpookParams(5e7, 3, this.physics.STEP); }   // stiff joints: no stretching
      this.world.addConstraint(c);
      this.joints.push({ c, A, B, def: d, axis, hinge: d.joint === 'hinge' ? d.hinge : null, twist: d.twist || 0 });
    }
  }

  // Remove this ragdoll from the physics world (used when a squad member leaves).
  dispose() {
    for (const j of this.joints) this.world.removeConstraint(j.c);
    for (const p of this.list) this.world.removeBody(p.body);
    this.world.removeEventListener('preStep', this._ctrl);
    this.scene.remove(this.group);
  }

  // Joint limits (hinge range, twist) + joint friction. Runs every substep, muscles or not.
  limits() {
    const limp = true;
    for (const j of this.joints) {
      const qa = j.A.quaternion, qb = j.B.quaternion;
      _q.set(qa.x, qa.y, qa.z, qa.w).invert();
      _q2.set(qb.x, qb.y, qb.z, qb.w);
      _q.multiply(_q2);                                  // child relative to parent (identity at bind)
      if (_q.w < 0) { _q.x = -_q.x; _q.y = -_q.y; _q.z = -_q.z; _q.w = -_q.w; }
      const ax = j.axis;
      const ang = 2 * Math.atan2(_q.x * ax.x + _q.y * ax.y + _q.z * ax.z, _q.w);   // rotation about the joint axis
      let lo, hi;
      if (j.hinge) { lo = j.hinge[1]; hi = j.hinge[2]; } else { lo = -j.twist; hi = j.twist; }
      // joint axis in world space (on the child: a twist leaves the bone axis where it is)
      _v.copy(ax).applyQuaternion(_q2.set(qb.x, qb.y, qb.z, qb.w));
      const wa = j.A.angularVelocity, wb = j.B.angularVelocity;
      const rel = (wb.x - wa.x) * _v.x + (wb.y - wa.y) * _v.y + (wb.z - wa.z) * _v.z;
      let fix = 0;
      if (ang > hi) fix = Math.min(0, (hi - ang) * 30 - rel);
      else if (ang < lo) fix = Math.max(0, (lo - ang) * 30 - rel);
      if (fix) {
        const ia = 1 / j.A.mass, ib = 1 / j.B.mass, sum = ia + ib;
        wb.x += _v.x * fix * ib / sum; wb.y += _v.y * fix * ib / sum; wb.z += _v.z * fix * ib / sum;
        wa.x -= _v.x * fix * ia / sum; wa.y -= _v.y * fix * ia / sum; wa.z -= _v.z * fix * ia / sum;
      }
      if (limp) {   // joint friction: neighbouring parts resist spinning against each other
        const f = 0.07, ia = 1 / j.A.mass, ib = 1 / j.B.mass, sum = ia + ib;
        const dx = (wb.x - wa.x) * f, dy = (wb.y - wa.y) * f, dz = (wb.z - wa.z) * f;
        wb.x -= dx * ib / sum; wb.y -= dy * ib / sum; wb.z -= dz * ib / sum;
        wa.x += dx * ia / sum; wa.y += dy * ia / sum; wa.z += dz * ia / sum;
      }
    }
  }

  // Use a pre-built skinned geometry (procedural characters): skinIndex already set.
  setMesh(geo, mat) {
    this.bones = this.defs.map(d => { const b = new THREE.Bone(); b.position.copy(d.center); this.group.add(b); return b; });
    this.mesh = new THREE.SkinnedMesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);
    this.group.updateMatrixWorld(true);
    this.mesh.bind(new THREE.Skeleton(this.bones), this.mesh.matrixWorld);
    this.ready = true;
    this.sync();
  }

  async loadModel(url) {
    const gltf = await fetchModel(url);
    let src = null;
    gltf.scene.traverse(o => { if (o.isMesh && !src) src = o; });
    src.updateWorldMatrix(true, false);
    const geo = src.geometry.clone();
    geo.applyMatrix4(src.matrixWorld);
    const old = src.material;
    // a little self-lighting from his own texture softens the low-poly facets under harsh lights
    const mat = new THREE.MeshLambertMaterial({ map: old.map || null, normalMap: old.normalMap || null, color: 0xe6e6e6, emissive: 0x3a3a3a, emissiveMap: old.map || null });
    if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
    // the eye openings are cut out with a smooth mask (stored in the model's occlusion slot)
    if (old.aoMap) { mat.alphaMap = old.aoMap; mat.alphaTest = 0.5; mat.side = THREE.DoubleSide; }   // double-sided: steep views into a socket never see through his head
    mat.map && (mat.map.anisotropy = 4);

    // ---- automatic skinning: weight each vertex by closeness to each bone segment ----
    const pos = geo.attributes.position, n = pos.count;
    const skinIndex = new Uint16Array(n * 4), skinWeight = new Float32Array(n * 4);
    const ds = new Float32Array(this.defs.length);
    const parentIdx = this.defs.map(d => d.parent ? this.defs.findIndex(e => e.name === d.parent) : -1);
    const adjacent = (i, j) => parentIdx[i] === j || parentIdx[j] === i;
    const headIdx = this.defs.findIndex(d => d.name === 'head'), chestIdx = this.defs.findIndex(d => d.name === 'chest');
    const kH = this.height / 1.68, neckY = this.defs[headIdx].a.y;
    const shoulderX = Math.abs(this.defs.find(d => d.name === 'uArmL').a.x);
    const armSh = this.defs.map(d => d.name.startsWith('uArm') || d.name.startsWith('lArm') ? this.defs.find(e => e.name === 'uArm' + d.name.slice(-1)).a : null);
    const sideOf = this.defs.map(d => d.name.includes('Leg') ? (d.name.endsWith('L') ? 1 : -1) : 0);
    const pelvisIdx = this.defs.findIndex(d => d.name === 'pelvis'), hipJointY = this.defs.find(d => d.name === 'uLegL').a.y;
    const nrm = geo.attributes.normal, _n = new THREE.Vector3(), _c = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      _v.fromBufferAttribute(pos, i);
      if (nrm) _n.fromBufferAttribute(nrm, i);
      let best = 0;
      for (let k = 0; k < this.defs.length; k++) {
        const d = this.defs[k];
        ds[k] = segDist(_v, d.a, d.b) - d.r;
        // skin belongs to a bone only if it faces away from it: stops the side of
        // the torso being glued to an arm hanging against it (and vice versa)
        // (only where arms meet the torso — elsewhere inside-facing folds would be mis-assigned)
        const nearSide = Math.abs(_v.x) < shoulderX + 0.06 * kH && _v.y > hipJointY - 0.1 * kH;
        if (nrm && nearSide && (d.name === 'chest' || d.name === 'pelvis' || d.name.includes('Arm'))) {
          closestOnSeg(_v, d.a, d.b, _c); _c.subVectors(_v, _c);
          const l = _c.length();
          if (l > 0.01 && _n.dot(_c) / l < -0.3) ds[k] += 0.25;
        }
        // the pelvis only owns skin above the tops of the thighs (shorts follow the legs)
        if (k === pelvisIdx && _v.y < hipJointY - 0.03 * kH && Math.abs(_v.x) > 0.03 * kH) ds[k] += 0.3;
        // arms don't own collars / hoods: nothing inboard of the shoulder joint, at or above it
        if (armSh[k] && _v.y > armSh[k].y - 0.08 * kH && Math.abs(_v.x) < Math.abs(armSh[k].x) - 0.035 * kH) ds[k] += 1;
        // thighs never own the torso (belly, shirt hem) above the hips
        if (sideOf[k] && this.defs[k].name.startsWith('uLeg') && _v.y > hipJointY + 0.05 * kH) ds[k] += 1;
        // legs never own skin from the other side of the body (legs pressed together)
        if (sideOf[k] && sideOf[k] * _v.x < -0.005) ds[k] += 1;
        if (ds[k] < ds[best]) best = k;
      }
      // blend smoothly with the bones joined to the nearest one
      const sigma = 0.025;
      let total = 0, slots = [[best, 1]];
      for (let k = 0; k < this.defs.length; k++) {
        if (k === best || !adjacent(k, best)) continue;
        let w = Math.exp(-(ds[k] - ds[best]) / sigma);
        // only blend near the joint the two bones share (arms hanging against the
        // torso must not be glued to the chest along their whole length)
        const joint = parentIdx[k] === best ? this.defs[k].a : this.defs[best].a;
        w *= Math.max(0, 1 - _v.distanceTo(joint) / (0.09 * kH));
        if (w > 0.02) slots.push([k, w]);
      }
      // the head is rigid: everything above the jaw follows the head bone 100%
      // (so the face moves exactly with the eyes, which are attached to that bone);
      // only a short band across the neck blends between chest and head
      // (decided by position, not by nearest bone: the chest's thick capsule used to
      // claim the chin and mouth, splitting the face in two when the head turned)
      const headA = this.defs[headIdx].a, rh = Math.hypot(_v.x - headA.x, _v.z - headA.z);
      const inHead = rh < 0.14 * kH && !this.defs[best].name.includes('Arm');
      if (best === headIdx || best === chestIdx || inHead) {
        const y = _v.y, lo = neckY - 0.045 * kH, hi = neckY + 0.025 * kH;
        if ((best === headIdx || inHead) && y >= hi) slots = [[headIdx, 1]];
        else if (y > lo && y < hi && Math.abs(_v.x) < 0.12 * kH) { const t = (y - lo) / (hi - lo); slots = [[headIdx, t], [chestIdx, 1 - t]]; }
        else if (best === chestIdx) slots = slots.filter(sl => sl[0] !== headIdx);
      }
      slots.sort((a, b) => b[1] - a[1]); slots = slots.slice(0, 4);
      for (const s of slots) total += s[1];
      slots.forEach((s, j) => { skinIndex[i * 4 + j] = s[0]; skinWeight[i * 4 + j] = s[1] / total; });
    }
    // Scans made with arms down have the arms fused to the torso/hips where they
    // touched. Cut triangles that bridge body parts which aren't joined (e.g.
    // forearm↔hip), and joined parts away from their joint (upper arm↔side of
    // chest), so nothing stretches when the limbs move.
    if (geo.index) {
      const idx = geo.index.array, keep = [];
      // first, tidy the labels: skin that's mostly surrounded by arm (e.g. the palm
      // where it pressed against the thigh) becomes arm too, so it moves with the hand
      {
        const nb = Array.from({ length: n }, () => []);
        for (let f = 0; f < idx.length; f += 3) for (let e = 0; e < 3; e++) { const p = idx[f + e], q = idx[f + (e + 1) % 3]; nb[p].push(q); nb[q].push(p); }
        const arm = this.defs.map(d => d.name.startsWith('lArm') || d.name.startsWith('uArm'));
        const handTips = this.defs.filter(d => d.name.startsWith('lArm')).map(d => d.b);
        for (let it = 0; it < 4; it++) {
          const changes = [];
          for (let i = 0; i < n; i++) {
            const me = skinIndex[i * 4];
            if (arm[me] || this.defs[me].name === 'head') continue;
            _v.fromBufferAttribute(pos, i);
            if (!handTips.some(t => _v.distanceTo(t) < 0.11 * kH)) continue;   // only the palm area
            const cnt = {};
            for (const q of nb[i]) { const b = skinIndex[q * 4]; cnt[b] = (cnt[b] || 0) + 1; }
            let bestB = me, bestC = cnt[me] || 0;
            for (const b in cnt) if (arm[b] && cnt[b] > bestC) { bestB = +b; bestC = cnt[b]; }
            if (bestB !== me) changes.push([i, bestB]);
          }
          for (const [i, b] of changes) { skinIndex[i * 4] = b; skinWeight[i * 4] = 1; for (let j = 1; j < 4; j++) { skinIndex[i * 4 + j] = 0; skinWeight[i * 4 + j] = 0; } }
          if (!changes.length) break;
        }
      }
      const near = (a, b, cx, cy, cz) => {
        const j = parentIdx[b] === a ? this.defs[b].a : this.defs[a].a;
        return Math.hypot(cx - j.x, cy - j.y, cz - j.z) < 0.11 * kH;
      };
      const isArm = this.defs.map(d => d.name.includes('Arm'));
      const core = this.defs.map(d => d.name === 'pelvis' || d.name === 'chest' || d.name.startsWith('uLeg'));
      const hipTop = this.defs.find(d => d.name === 'pelvis').a.y + 0.02 * kH;
      let cut = 0;
      for (let f = 0; f < idx.length; f += 3) {
        const a = skinIndex[idx[f] * 4], b = skinIndex[idx[f + 1] * 4], c = skinIndex[idx[f + 2] * 4];
        let ok = true;
        if (a !== b || b !== c) {
          const cx = (pos.getX(idx[f]) + pos.getX(idx[f + 1]) + pos.getX(idx[f + 2])) / 3;
          const cy = (pos.getY(idx[f]) + pos.getY(idx[f + 1]) + pos.getY(idx[f + 2])) / 3;
          const cz = (pos.getZ(idx[f]) + pos.getZ(idx[f + 1]) + pos.getZ(idx[f + 2])) / 3;
          for (const [p, q] of [[a, b], [b, c], [a, c]]) {
            if (p === q) continue;
            if (core[p] && core[q] && !(sideOf[p] && sideOf[q] && sideOf[p] !== sideOf[q])) continue;   // shirt hems over the hips stay joined (but the two legs come apart)
            if (!adjacent(p, q) || ((isArm[p] || isArm[q]) && !near(p, q, cx, cy, cz))) { ok = false; break; }
          }
        }
        if (ok) keep.push(idx[f], idx[f + 1], idx[f + 2]); else cut++;
      }
      if (cut) geo.setIndex(keep);
      this.cutTriangles = cut;
    }
    this.solidifyPieces(geo, skinIndex, skinWeight);
    this.measureHands(geo, skinIndex, skinWeight);
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

  // Keep every loose piece of the scan in one piece. Scans contain small
  // separate fragments (and splitting arms from the body leaves slivers); if a
  // fragment's vertices follow different bones it tears apart and drifts around
  // the body. Each separate piece is found (vertices welded by position), the
  // main body is left alone, every other piece follows a single bone rigidly
  // (whichever bone most of it already followed), and tiny specks are removed.
  // Where each hand really is on the scan: the middle of the hand's own skin
  // (wrist to fingertips), so held things sit in the palm, not off the fingertips.
  measureHands(geo, skinIndex, skinWeight) {
    const pos = geo.attributes.position, kH = this.height / 1.68, v = new THREE.Vector3(), dir = new THREE.Vector3();
    this.handC = {};
    for (const name of ['lArmL', 'lArmR']) {
      const k = this.defs.findIndex(d => d.name === name), d = this.defs[k];
      dir.subVectors(d.b, d.a).normalize();
      const len = 0.15 * kH, sum = new THREE.Vector3(); let n = 0;
      for (let i = 0; i < pos.count; i++) {
        if (skinIndex[i * 4] !== k || skinWeight[i * 4] < 0.5) continue;
        v.fromBufferAttribute(pos, i);
        const along = v.clone().sub(d.b).dot(dir);       // 0 at the fingertips, negative toward the elbow
        if (along < -len || along > 0.03 * kH || v.distanceTo(d.b) > len * 1.3) continue;
        sum.add(v); n++;
      }
      if (n > 20) this.handC[name] = sum.multiplyScalar(1 / n);
    }
  }
  // world position of the middle of a hand (falls back to just short of the fingertips)
  grip(name, out) {
    const p = this.parts[name], d = p.def, b = p.body;
    if (this.handC && this.handC[name]) out.copy(this.handC[name]);
    else out.copy(d.b).lerp(d.a, 0.07 * (this.height / 1.68) / d.a.distanceTo(d.b));
    out.sub(d.center);
    _q.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
    return out.applyQuaternion(_q).add(_v2.set(b.position.x, b.position.y, b.position.z));
  }
  // the forearm's orientation (bind pose = identity)
  partQuat(name, out) { const q = this.parts[name].body.quaternion; return out.set(q.x, q.y, q.z, q.w); }

  solidifyPieces(geo, skinIndex, skinWeight) {
    if (!geo.index) return;
    const pos = geo.attributes.position, n = pos.count, idx = geo.index.array;
    const parent = new Int32Array(n); for (let i = 0; i < n; i++) parent[i] = i;
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    const unite = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
    const seen = new Map();
    for (let i = 0; i < n; i++) {
      const key = `${Math.round(pos.getX(i) * 2000)},${Math.round(pos.getY(i) * 2000)},${Math.round(pos.getZ(i) * 2000)}`;
      const j = seen.get(key); if (j === undefined) seen.set(key, i); else unite(i, j);
    }
    for (let f = 0; f < idx.length; f += 3) { unite(idx[f], idx[f + 1]); unite(idx[f], idx[f + 2]); }
    const tris = new Map();                       // piece root -> triangle count
    for (let f = 0; f < idx.length; f += 3) { const r = find(idx[f]); tris.set(r, (tris.get(r) || 0) + 1); }
    let main = -1, best = 0;
    for (const [r, c] of tris) if (c > best) { best = c; main = r; }
    // small pieces (buttons, strings, flaps, fragments) move rigidly with the bone
    // nearest their middle; big separate parts (leggings, a sleeve) keep normal skinning
    const box = new Map();
    for (let i = 0; i < n; i++) {
      const r = find(i); if (r === main) continue;
      let b = box.get(r); if (!b) box.set(r, b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]);
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.min(b[2], z); b[3] = Math.max(b[3], x); b[4] = Math.max(b[4], y); b[5] = Math.max(b[5], z);
    }
    const kH = this.height / 1.68, boneOf = new Map(), c = new THREE.Vector3();
    for (const [r, b] of box) {
      if (Math.hypot(b[3] - b[0], b[4] - b[1], b[5] - b[2]) > 0.22 * kH) continue;
      c.set((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2);
      let best = 0, bd = 1e9;
      this.defs.forEach((d, k) => { const dd = segDist(c, d.a, d.b) - d.r; if (dd < bd) { bd = dd; best = k; } });
      boneOf.set(r, best);
    }
    for (let i = 0; i < n; i++) {
      const b = boneOf.get(find(i)); if (b === undefined) continue;
      skinIndex[i * 4] = b; skinWeight[i * 4] = 1;
      for (let j = 1; j < 4; j++) { skinIndex[i * 4 + j] = 0; skinWeight[i * 4 + j] = 0; }
    }
    // drop specks (a handful of triangles) — scan noise that would only ever float
    const minTris = Math.max(12, best * 0.0015);
    const keep = [];
    let dropped = 0, pieces = 0;
    for (let f = 0; f < idx.length; f += 3) {
      const r = find(idx[f]);
      if (r !== main && tris.get(r) < minTris) { dropped++; continue; }
      keep.push(idx[f], idx[f + 1], idx[f + 2]);
    }
    for (const [r, c] of tris) if (r !== main && c >= minTris) pieces++;
    if (dropped) geo.setIndex(keep);
    this.pieceInfo = { pieces, dropped };
  }

  // Forward kinematics: world transform of every part for the current pose,
  // root (feet) position and yaw.
  computeFK(out) {
    this.yawQ.setFromAxisAngle(Y_AXIS, this.yaw);
    const base = _v2.set(this.root.x, 0.02 + this.bob, this.root.z);
    this.defs.forEach((d, i) => {     // parents always come first in defs
      const o = out[i];
      o.q.copy(this.yawQ).multiply(this.pose[d.name]);
      if (!d.parent) _v.copy(d.a).applyQuaternion(this.yawQ).add(base);
      else {
        const pi = this.defs.indexOf(this.parts[d.parent].def), pd = this.defs[pi];
        _v.copy(d.a).sub(pd.center).applyQuaternion(out[pi].q).add(out[pi].p);
      }
      o.p.copy(d.center).sub(d.a).applyQuaternion(o.q).add(_v);
    });
    return out;
  }

  // Spawn / teleport: stand at (x, z) facing yaw, animated.
  placeAt(x, z, yaw) {
    this.yaw = yaw; this.root.set(x, 0, z);
    this.setMode('anim');
    this.animate(0);
    for (const p of this.list) { p.body.velocity.setZero(); p.body.angularVelocity.setZero(); }
  }

  // Switch between animated (kinematic) and ragdoll (dynamic) bodies.
  setMode(mode, strength = 0) {
    this.strength = mode === 'ragdoll' ? strength : 0;
    if (mode === this.mode) return;
    const dyn = mode === 'ragdoll';
    for (const p of this.list) {
      const b = p.body;
      b.type = dyn ? CANNON.Body.DYNAMIC : CANNON.Body.KINEMATIC;
      if (!dyn) { b.velocity.setZero(); b.angularVelocity.setZero(); }
      b.updateSolveMassProperties(); b.wakeUp();
    }
    if (mode === 'blend') {
      this.list.forEach((p, i) => { const b = p.body; this._from[i].p.set(b.position.x, b.position.y, b.position.z); this._from[i].q.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w); });
      this.blendT = 0;
    }
    this.mode = mode;
  }

  // Start getting up: stand where the hips landed, facing where the body faces.
  getUp(duration = 0.9) {
    const pel = this.parts.pelvis.body;
    this.root.set(pel.position.x, 0, pel.position.z);
    if (this.constrain) this.constrain(this.root);
    const q = pel.quaternion; _q.set(q.x, q.y, q.z, q.w);
    _v.set(0, 0, 1).applyQuaternion(_q);
    if (Math.hypot(_v.x, _v.z) > 0.2) this.yaw = Math.atan2(_v.x, _v.z);
    else { _v.set(0, 1, 0).applyQuaternion(_q); this.yaw = Math.atan2(-_v.x, -_v.z); }   // lying flat: face away from where the head points
    this.blendDur = duration;
    this.setMode('blend');
  }

  // Drive the bodies from the animation (anim / blend modes). Call once per frame.
  animate(dt) {
    if (this.mode === 'ragdoll') return;
    if (this.constrain) this.constrain(this.root);
    const fk = this.computeFK(this._fk);
    let k = 1;
    if (this.mode === 'blend') {
      this.blendT += dt;
      const t = Math.min(1, this.blendT / this.blendDur);
      k = t * t * (3 - 2 * t);
    }
    this.list.forEach((p, i) => {
      const b = p.body;
      let P = fk[i].p, Q = fk[i].q;
      if (k < 1) { P = _v.copy(this._from[i].p).lerp(fk[i].p, k); Q = _q.copy(this._from[i].q).slerp(fk[i].q, k); }
      if (dt > 0) b.velocity.set((P.x - b.position.x) / dt, (P.y - b.position.y) / dt, (P.z - b.position.z) / dt);
      b.position.set(P.x, P.y, P.z);
      b.quaternion.set(Q.x, Q.y, Q.z, Q.w);
      b.angularVelocity.setZero();
    });
    if (this.mode === 'blend' && k >= 1) this.setMode('anim');
  }

  // Helper: target local rotation that points a limb (bind direction) along dir.
  aim(name, x, y, z) {
    const d = this.parts[name].def;
    _v.set(x, y, z).normalize();
    this.pose[name].setFromUnitVectors(d.dir, _v);
  }

  // ---- ragdoll mode: joint limits every substep, plus weak flailing muscles when held ----
  control() {
    if (this.mode !== 'ragdoll') return;
    this.yawQ.setFromAxisAngle(Y_AXIS, this.yaw);
    this.limits();
    const s = this.strength;
    if (s <= 0.001) return;
    for (const p of this.list) {
      const b = p.body;
      if (p.grabbed) continue;
      _q.copy(this.yawQ).multiply(this.pose[p.name]);
      _q2.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w).invert();
      _q.multiply(_q2);
      if (_q.w < 0) { _q.x = -_q.x; _q.y = -_q.y; _q.z = -_q.z; _q.w = -_q.w; }
      const sinHalf = Math.sqrt(_q.x * _q.x + _q.y * _q.y + _q.z * _q.z);
      const ang = 2 * Math.atan2(sinHalf, _q.w);
      let tx = 0, ty = 0, tz = 0;
      if (sinHalf > 1e-5) { const f = ang * 12 / sinHalf; tx = _q.x * f; ty = _q.y * f; tz = _q.z * f; }
      const w = b.angularVelocity, k = 0.3 * s;
      w.x += (tx - w.x) * k; w.y += (ty - w.y) * k; w.z += (tz - w.z) * k;
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
    if (this.mode !== 'ragdoll') return;
    const b = part.body;
    _cv.set(impulse.x, impulse.y, impulse.z);
    _cv2.set(point.x - b.position.x, point.y - b.position.y, point.z - b.position.z);
    b.applyImpulse(_cv, _cv2);
  }

  // Push the whole body (e.g. a big launch)
  shove(vx, vy, vz) { for (const p of this.list) { p.body.velocity.x += vx; p.body.velocity.y += vy; p.body.velocity.z += vz; } }
}

function closestOnSeg(p, a, b, out) {
  out.subVectors(b, a);
  const l2 = out.lengthSq();
  const t = l2 > 0 ? Math.max(0, Math.min(1, _v2.subVectors(p, a).dot(out) / l2)) : 0;
  return out.multiplyScalar(t).add(a);
}

function segDist(p, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const apx = p.x - a.x, apy = p.y - a.y, apz = p.z - a.z;
  const l2 = abx * abx + aby * aby + abz * abz;
  const t = l2 > 0 ? Math.max(0, Math.min(1, (apx * abx + apy * aby + apz * abz) / l2)) : 0;
  const dx = apx - abx * t, dy = apy - aby * t, dz = apz - abz * t;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
