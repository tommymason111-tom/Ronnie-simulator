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
const _hm = new THREE.Matrix4(), _hm2 = new THREE.Matrix4(), _hm3 = new THREE.Matrix4(), _hp = new THREE.Vector3(), _hq = new THREE.Quaternion(), _hq2 = new THREE.Quaternion(), _hs = new THREE.Vector3();
// a rotation q about the point p, as a matrix
const _pmR = new THREE.Matrix4(), _pmT = new THREE.Matrix4();
const pivotM = (p, q) => _hm3.makeTranslation(p.x, p.y, p.z).multiply(_pmR.makeRotationFromQuaternion(q)).multiply(_pmT.makeTranslation(-p.x, -p.y, -p.z));
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { characterGroup, GROUP } from './physics.js';

// Every model is downloaded once (shared by every character that uses it), started as early as possible
// (while you're still on the menu), and retried if the connection drops, so nobody turns up invisible.
const MODELS = new Map();
// raised floors: the level can tell the ragdolls how high the floor is at (x, z)
export const FLOOR = { at: null };
export function fetchModel(url) {
  if (!MODELS.has(url)) {
    const p = (async () => {
      let err;
      for (let i = 0; i < 4; i++) {
        try { const g = await new GLTFLoader().loadAsync(url); g.parser = null; return g; }      // (the loader keeps the whole download and its pieces too: only the model's needed)
        catch (e) { err = e; await new Promise(r => setTimeout(r, 600 * (i + 1))); }
      }
      MODELS.delete(url); throw err;
    })();
    MODELS.set(url, p);
  }
  return MODELS.get(url);
}
// A character's picture and its cut-out mask (the eye openings; the model keeps it in its occlusion slot) made into
// ONE picture: the mask goes in the colour picture's spare alpha channel. Drawn exactly the same (the mask is cut at
// the same 0.5 either way, and filtered the same), but one picture on the graphics chip instead of two, and the
// originals let go of. Done once per model, shared by everything that shows that person.
// phones (an iPhone above all) get the characters' skins at 1024 x 1024: still sharper than a phone screen ever shows a
// character, and less than half the memory each (with the whole squad about, 1536 x 1536 was ~95MB more than this)
const PHONE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)));
const SKIN_MAX = PHONE ? 1024 : 4096;
// ...and their surface detail (the normal map) at 512 on a phone: you can't tell at phone size, and it's a quarter of the memory
function phoneNormal(gltf, n) {
  if (!n || !PHONE) return n || null; if (gltf.__normal) return gltf.__normal;
  try { const im = n.image; if (!im || !im.width || im.width <= 512) return (gltf.__normal = n);
    const c = document.createElement('canvas'); c.width = c.height = 512; c.getContext('2d').drawImage(im, 0, 0, 512, 512);
    const t = new THREE.CanvasTexture(c); t.flipY = n.flipY; t.wrapS = n.wrapS; t.wrapT = n.wrapT; t.channel = n.channel; t.colorSpace = n.colorSpace;
    t.offset.copy(n.offset); t.repeat.copy(n.repeat); t.rotation = n.rotation; t.center.copy(n.center); t.anisotropy = 4; t.userData.keep = true;
    try { im.close && im.close(); } catch (e) {} n.dispose();
    return (gltf.__normal = t); } catch (e) { return (gltf.__normal = n); }
}
export function skinOf(gltf, old) {
  if (gltf.__skin) return gltf.__skin;
  const m = old.map, a = old.aoMap, mi = m && m.image; let out = { map: m || null, alphaMap: a || null, thumb: null };
  try {
    if (mi && mi.width) { const th = document.createElement('canvas'); th.width = th.height = 128; th.getContext('2d').drawImage(mi, 0, 0, 128, 128); out.thumb = th; }      // (a little copy: emotes read skin colour from it)
    const same = a && a.image && a.image.width && a.channel === m.channel && a.offset.equals(m.offset) && a.repeat.equals(m.repeat) && a.rotation === m.rotation;
    if (mi && mi.width && same) {
      const k = Math.min(1, SKIN_MAX / Math.max(mi.width, mi.height)), w = Math.round(mi.width * k), h = Math.round(mi.height * k), c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(mi, 0, 0, w, h); const px = g.getImageData(0, 0, w, h).data;
      g.clearRect(0, 0, w, h); g.drawImage(a.image, 0, 0, w, h); const al = g.getImageData(0, 0, w, h).data;
      for (let i = 3; i < px.length; i += 4) px[i] = al[i - 2];                  // (the mask's green, as three.js reads it)
      c.width = c.height = 1;
      const t = new THREE.DataTexture(px, w, h, THREE.RGBAFormat);
      t.colorSpace = THREE.SRGBColorSpace; t.flipY = m.flipY; t.wrapS = m.wrapS; t.wrapT = m.wrapT; t.channel = m.channel;
      t.offset.copy(m.offset); t.repeat.copy(m.repeat); t.rotation = m.rotation; t.center.copy(m.center);
      t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4;
      t.userData.keep = true; t.userData.thumb = out.thumb; t.needsUpdate = true;
      t.onUpdate = () => { t.image = { data: null, width: w, height: h }; };      // (on the chip: the spare copy goes)
      out = { map: t, alphaMap: null, packed: true, thumb: out.thumb };
      for (const im of [mi, a.image]) try { im.close && im.close(); } catch (e) {}
    }
  } catch (e) { console.warn('skin', e); }
  if (out.map) out.map.userData.thumb = out.thumb;
  return (gltf.__skin = out);
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
    this.shiftZ = 0;            // the hips moved forward (+) / back (-) along the way they face (sitting back in a chair)
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
    this.jointsOn = true; this.syncJoints();
  }
  // The joints only matter while the body is a ragdoll (physics moving it). While it's being animated every part is
  // placed by the animation, so the joints are taken out of the physics world: solving them was most of the physics
  // cost (every character's ten-odd joints, sixteen passes, every step, for nothing)
  syncJoints() {
    const want = this.mode === 'ragdoll'; if (want === this.jointsOn) return; this.jointsOn = want;
    for (const j of this.joints) { if (want) this.world.addConstraint(j.c); else this.world.removeConstraint(j.c); }
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
    const skin = skinOf(gltf, old);
    const mat = new THREE.MeshLambertMaterial({ map: skin.map, normalMap: phoneNormal(gltf, old.normalMap), color: 0xe6e6e6, emissive: 0x3a3a3a, emissiveMap: skin.map, side: old.side || THREE.FrontSide });   // (double-sided if the model says so)
    if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
    // the eye openings are cut out with a smooth mask (stored in the model's occlusion slot; packed into the picture's alpha)
    if (old.aoMap) { mat.alphaMap = skin.alphaMap; mat.alphaTest = 0.5; mat.side = THREE.DoubleSide; }   // double-sided: steep views into a socket never see through his head
    mat.map && (mat.map.anisotropy = 4);
    // emote paint: dye the hair (dark texels on the top of the head), turn the skin orange, put a navy coat on (clothes
    // between the knees and the neck), all from the model's own texture. Heights are bind-pose fractions of the model.
    geo.computeBoundingBox(); const bb = geo.boundingBox, hgt = bb.max.y - bb.min.y;
    const paint = this.paint = { uOrange: { value: 0 }, uHair: { value: 0 }, uHairCol: { value: new THREE.Color(0x39ff14) }, uCoat: { value: 0 }, uCoatCol: { value: new THREE.Color(0x14213d) },
      uHairY: { value: bb.max.y - hgt * 0.065 }, uCoatY: { value: new THREE.Vector2(bb.min.y + hgt * 0.3, bb.min.y + hgt * 0.84) } };
    this.paintBB = { min: bb.min.y, h: hgt };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, paint);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vBindY;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBindY = position.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vBindY; uniform float uOrange, uHair, uHairY, uCoat; uniform vec3 uHairCol, uCoatCol; uniform vec2 uCoatY;')
        .replace('#include <map_fragment>', `#include <map_fragment>
        if (uOrange + uHair + uCoat > 0.0) { vec3 c = diffuseColor.rgb; float lum = dot(c, vec3(0.299, 0.587, 0.114));
          float skin = smoothstep(0.03, 0.1, c.r - c.b) * step(c.g, c.r) * smoothstep(0.12, 0.25, lum);
          float hair = uHair * smoothstep(uHairY - 0.015, uHairY + 0.015, vBindY) * (1.0 - smoothstep(0.1, 0.22, lum));
          float coat = uCoat * (1.0 - skin) * smoothstep(uCoatY.x - 0.02, uCoatY.x + 0.02, vBindY) * (1.0 - smoothstep(uCoatY.y - 0.02, uCoatY.y + 0.02, vBindY));
          c = mix(c, vec3(1.0, 0.17, 0.01) * (0.45 + lum * 1.1), uOrange * mix(0.8, 1.0, skin));
          c = mix(c, uHairCol * (0.75 + lum * 2.0), hair);
          c = mix(c, uCoatCol * (0.7 + lum * 0.8), coat);
          diffuseColor.rgb = c; }`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n        totalEmissiveRadiance = mix(totalEmissiveRadiance, diffuseColor.rgb * 0.3, clamp(uOrange + uHair + uCoat, 0.0, 1.0));');
    };

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
    const slotK = new Int32Array(this.defs.length + 2), slotW = new Float64Array(this.defs.length + 2);      // (one vertex's bones and weights)
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
      // (worked in two small reused buffers, not new arrays for every vertex: a model has tens of thousands of vertices
      // and every squad member is skinned while the level loads, so the throwaway arrays were a lot of
      // garbage while the level loads. Same weights, same order, to the last bit as the arrays gave)
      const sigma = 0.025;
      let total = 0, ns = 1; slotK[0] = best; slotW[0] = 1;
      for (let k = 0; k < this.defs.length; k++) {
        if (k === best || !adjacent(k, best)) continue;
        let w = Math.exp(-(ds[k] - ds[best]) / sigma);
        // only blend near the joint the two bones share (arms hanging against the
        // torso must not be glued to the chest along their whole length)
        const joint = parentIdx[k] === best ? this.defs[k].a : this.defs[best].a;
        w *= Math.max(0, 1 - _v.distanceTo(joint) / (0.09 * kH));
        if (w > 0.02) { slotK[ns] = k; slotW[ns] = w; ns++; }
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
        if ((best === headIdx || inHead) && y >= hi) { ns = 1; slotK[0] = headIdx; slotW[0] = 1; }
        else if (y > lo && y < hi && Math.abs(_v.x) < 0.12 * kH) { const t = (y - lo) / (hi - lo); ns = 2; slotK[0] = headIdx; slotW[0] = t; slotK[1] = chestIdx; slotW[1] = 1 - t; }
        else if (best === chestIdx) { let m = 0; for (let j = 0; j < ns; j++) if (slotK[j] !== headIdx) { slotK[m] = slotK[j]; slotW[m] = slotW[j]; m++; } ns = m; }
      }
      // heaviest first (a stable sort, as Array.sort is: equal weights keep their order), the top four kept
      for (let j = 1; j < ns; j++) { const kk = slotK[j], ww = slotW[j]; let q = j - 1; while (q >= 0 && slotW[q] < ww) { slotK[q + 1] = slotK[q]; slotW[q + 1] = slotW[q]; q--; } slotK[q + 1] = kk; slotW[q + 1] = ww; }
      if (ns > 4) ns = 4;
      for (let j = 0; j < ns; j++) total += slotW[j];
      for (let j = 0; j < ns; j++) { skinIndex[i * 4 + j] = slotK[j]; skinWeight[i * 4 + j] = slotW[j] / total; }
    }
    // Elbows and knees bend smoothly: across a band either side of the joint the skin blends from the upper bone to
    // the lower one by how far along the limb it is (nearest-bone weights left sharp creases and spikes there)
    for (const [up, lo] of [['uArmL', 'lArmL'], ['uArmR', 'lArmR'], ['uLegL', 'lLegL'], ['uLegR', 'lLegR']]) {
      const iu = this.defs.findIndex(d => d.name === up), il = this.defs.findIndex(d => d.name === lo); if (iu < 0 || il < 0) continue;
      const J = this.defs[il].a, dir = this.defs[il].dir.clone().add(this.defs[iu].dir).normalize(), r = (up.startsWith('uArm') ? 0.075 : 0.085) * kH;
      for (let i = 0; i < n; i++) { const b0 = skinIndex[i * 4]; if (b0 !== iu && b0 !== il) continue;
        _v.fromBufferAttribute(pos, i); const sAlong = _v.clone().sub(J).dot(dir); if (Math.abs(sAlong) > r * 1.6) continue;
        const w = THREE.MathUtils.smoothstep(sAlong, -r, r);
        skinIndex[i * 4] = il; skinWeight[i * 4] = w; skinIndex[i * 4 + 1] = iu; skinWeight[i * 4 + 1] = 1 - w; skinIndex[i * 4 + 2] = skinIndex[i * 4 + 3] = 0; skinWeight[i * 4 + 2] = skinWeight[i * 4 + 3] = 0;
        if (w > 0.5) continue; skinIndex[i * 4] = iu; skinWeight[i * 4] = 1 - w; skinIndex[i * 4 + 1] = il; skinWeight[i * 4 + 1] = w;      // (the bigger share first)
      }
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
      const shoulder = (a, b) => this.defs[a].name.startsWith('uArm') && this.defs[b].name === 'chest';
      const core = this.defs.map(d => d.name === 'pelvis' || d.name === 'chest' || d.name.startsWith('uLeg'));
      const hipTop = this.defs.find(d => d.name === 'pelvis').a.y + 0.02 * kH;
      let cut = 0; this._cutTris = [];
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
            if (adjacent(p, q) && (shoulder(p, q) || shoulder(q, p))) continue;        // the armpit: the skin stretches with the arm, never tears open
            if (!adjacent(p, q) || ((isArm[p] || isArm[q]) && !near(p, q, cx, cy, cz))) { ok = false; break; }
          }
        }
        if (ok) keep.push(idx[f], idx[f + 1], idx[f + 2]); else { cut++; this._cutTris.push(idx[f], idx[f + 1], idx[f + 2]); }
      }
      if (cut) geo.setIndex(keep);
      this.cutTriangles = cut;
    }
    this.solidifyPieces(geo, skinIndex, skinWeight);
    this.measureHands(geo, skinIndex, skinWeight);
    this.splitHands(geo, skinIndex, skinWeight);
    this.weldWeights(geo, skinIndex, skinWeight);
    const sk = this.capCuts(geo, skinIndex, skinWeight);
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sk.skinIndex, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sk.skinWeight, 4));

    // ---- one bone per body, all siblings, bind = T-pose ----
    this.bones = this.defs.map(d => { const b = new THREE.Bone(); b.position.copy(d.center); this.group.add(b); return b; });
    for (const eb of this.extraBones || []) { const b = new THREE.Bone(); b.position.copy(this.parts[eb.name].def.center); this.group.add(b); this.bones.push(b); }
    this.addBellyMorph(geo);
    this.mesh = new THREE.SkinnedMesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);
    this.group.updateMatrixWorld(true);
    this.mesh.bind(new THREE.Skeleton(this.bones), this.mesh.matrixWorld);
    if (geo.morphAttributes.position) { this.mesh.updateMorphTargets(); this.mesh.morphTargetInfluences[0] = 0; }
    this.ready = true;
    this.modelLoaded = true;
    this.sync();
    try { window.__onModelReady && window.__onModelReady(); } catch (e) {}      // (main.js builds its shaders, and its shadow's, straight away)
    // (clothes going wrong must never fail the model: that used to put a second, made-up body inside this one)
    if (this.wantUniform) try { this.wearUniform(); } catch (e) { console.warn('uniform', e); }
    if (this.wantShoes) try { this.wearShoes(this.wantShoes); } catch (e) { console.warn('shoes', e); }
  }

  // A Lidl staff uniform: a navy polo shirt (short sleeves, yellow trim) and navy trousers made from
  // the body itself (the torso, upper arms and legs of the skin, pushed out a little and skinned to
  // the same bones, so it moves exactly with them), a Lidl badge on the chest and a name badge.
  // The head, forearms, hands and shoes stay as they are.
  // Trainers: a shell round each foot made from the model's own foot (so it fits and moves with the leg):
  // the upper in `color` with a slight sheen, a darker sole.
  wearShoes(color = 0x111111) {
    this.wantShoes = color;
    if (!this.modelLoaded || this.shoes) return;
    const src = this.mesh.geometry, pos = src.attributes.position, nrm = src.attributes.normal, n = pos.count;
    if (!nrm) return;
    const si = src.attributes.skinIndex, D = this.defs, kH = this.height / 1.68, v = new THREE.Vector3();
    const legs = D.map((d, i) => d.name.startsWith('lLeg') ? i : -1).filter(i => i >= 0);
    let minY = Infinity; for (let i = 0; i < n; i++) if (legs.includes(si.getX(i))) minY = Math.min(minY, pos.getY(i));
    const top = minY + 0.11 * kH, sole = minY + 0.028 * kH;
    const kind = new Uint8Array(n);
    for (let i = 0; i < n; i++) { if (!legs.includes(si.getX(i))) continue; const y = pos.getY(i); if (y < top) kind[i] = 1; }
    const geo = new THREE.BufferGeometry(), P = new Float32Array(n * 3), C = new Float32Array(n * 3), up = new THREE.Color(color), dark = new THREE.Color(0x3a3a3a), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const y = pos.getY(i), off = (y < sole ? 0.016 : 0.011) * kH;
      P[i * 3] = pos.getX(i) + nrm.getX(i) * off; P[i * 3 + 1] = Math.max(minY - 0.004, pos.getY(i) + nrm.getY(i) * off); P[i * 3 + 2] = pos.getZ(i) + nrm.getZ(i) * off;
      c.copy(y < minY + 0.018 * kH ? dark : up); c.multiplyScalar(0.92 + 0.08 * Math.sin(i * 7.31));
      C[i * 3] = c.r; C[i * 3 + 1] = c.g; C[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', nrm.clone()); geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
    geo.setAttribute('skinIndex', si.clone()); geo.setAttribute('skinWeight', src.attributes.skinWeight.clone());
    const idx = src.index ? src.index.array : Array.from({ length: n }, (_, i) => i), keep = [];
    for (let f = 0; f < idx.length; f += 3) { const a = idx[f], b = idx[f + 1], cc = idx[f + 2]; if (kind[a] + kind[b] + kind[cc] >= 2) keep.push(a, b, cc); }
    for (const i of keep) if (!kind[i]) P[i * 3 + 1] = Math.min(P[i * 3 + 1], top);          // a clean line round the ankle, no spikes
    geo.setIndex(keep);
    const shell = new THREE.SkinnedMesh(geo, new THREE.MeshPhongMaterial({ vertexColors: true, side: THREE.DoubleSide, shininess: 40, specular: 0x333333 })); shell.frustumCulled = false;
    this.group.add(shell); shell.bind(this.mesh.skeleton, this.mesh.bindMatrix);
    this.shoes = shell;
  }

  wearUniform(name = '') {
    this.wantUniform = true; this.uniformName = name || this.uniformName || '';
    if (!this.modelLoaded || this.uniform) return;
    const src = this.mesh.geometry, pos = src.attributes.position, nrm = src.attributes.normal, n = pos.count;
    if (!nrm) return;
    const si = src.attributes.skinIndex, D = this.defs, kH = this.height / 1.68;
    const ix = (nm) => D.findIndex(d => d.name === nm), head = ix('head'), chest = ix('chest'), pelvis = ix('pelvis');
    const neckY = D[head].a.y, hipY = D[ix('uLegL')].a.y, beltY = hipY + 0.07 * kH, collarY = neckY - 0.045 * kH;
    const v = new THREE.Vector3(), segT = (d) => { const ab = v.clone().sub(d.a), L = d.b.distanceTo(d.a); return L > 1e-4 ? ab.dot(d.dir) / L : 0; };
    // per vertex: 0 = not clothing, 1 = shirt, 2 = trousers; plus a trim flag
    const kind = new Uint8Array(n), trim = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, i);
      const b = si.getX(i), d = D[b]; if (!d) continue;      // (the hands have their own bones now: no uniform on them)
      const nm = d.name;
      if (b === head) continue;
      if (b === chest) {       // everything but a round neck opening (the shoulders stay covered right up to the top)
        const r = Math.hypot(v.x - D[head].a.x, v.z - D[head].a.z);
        if (v.y > collarY && r < 0.095 * kH) continue;
        if (v.y > collarY - 0.06 * kH && r < 0.11 * kH && v.y > collarY - 0.06 * kH + (r - 0.06 * kH) * 0.6) trim[i] = 1;
        kind[i] = v.y > beltY ? 1 : 2; continue;
      }
      if (b === pelvis) { kind[i] = v.y > beltY ? 1 : 2; continue; }
      if (nm.startsWith('uArm')) { kind[i] = 1; continue; }
      if (nm.startsWith('lArm')) { const t = segT(d); if (t < 0.8) { kind[i] = 1; if (t > 0.72) trim[i] = 1; } continue; }   // long sleeves, a cuff at the wrist
      if (nm.startsWith('uLeg')) { kind[i] = 2; continue; }
      if (nm.startsWith('lLeg')) { if (segT(d) < 0.86) kind[i] = 2; continue; }
    }
    // the shell: the same vertices, pushed out along their normals (shirt a touch looser than the trousers)
    const geo = new THREE.BufferGeometry(), P = new Float32Array(n * 3), C = new Float32Array(n * 3);
    const NAVY = new THREE.Color(0x1b2a52), DARK = new THREE.Color(0x141b33), YEL = new THREE.Color(0xffd400), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const off = (kind[i] === 2 ? 0.011 : 0.014) * kH;
      P[i * 3] = pos.getX(i) + nrm.getX(i) * off; P[i * 3 + 1] = pos.getY(i) + nrm.getY(i) * off; P[i * 3 + 2] = pos.getZ(i) + nrm.getZ(i) * off;
      c.copy(kind[i] === 2 ? DARK : NAVY);
      const shade = 0.97 + 0.03 * Math.sin(i * 12.9898); c.multiplyScalar(shade);     // a little weave
      C[i * 3] = c.r; C[i * 3 + 1] = c.g; C[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('normal', nrm.clone());
    geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
    geo.setAttribute('skinIndex', si.clone()); geo.setAttribute('skinWeight', src.attributes.skinWeight.clone());
    const idx = src.index ? src.index.array : Array.from({ length: n }, (_, i) => i), keep = [];
    for (let f = 0; f < idx.length; f += 3) { const a = idx[f], b = idx[f + 1], cc = idx[f + 2]; if ((kind[a] ? 1 : 0) + (kind[b] ? 1 : 0) + (kind[cc] ? 1 : 0) >= 2) keep.push(a, b, cc); }   // (2 of 3: smoother edges)
    geo.setIndex(keep);
    if (src.morphAttributes.position) { geo.morphAttributes.position = src.morphAttributes.position; geo.morphTargetsRelative = src.morphTargetsRelative; }     // (the shirt grows with the belly)
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x0b0f1c, side: THREE.DoubleSide });
    const shell = new THREE.SkinnedMesh(geo, mat); shell.frustumCulled = false; if (geo.morphAttributes.position) shell.updateMorphTargets();
    this.group.add(shell); shell.bind(this.mesh.skeleton, this.mesh.bindMatrix);
    // badges on the chest: the Lidl logo over the heart, a name badge on the other side
    const front = (sx) => {     // the front of the chest at this side, just under the collar
      let best = null;
      for (let i = 0; i < n; i++) { if (kind[i] !== 1) continue; v.fromBufferAttribute(pos, i);
        if (v.y < neckY - 0.2 * kH || v.y > neckY - 0.11 * kH || Math.abs(v.x - sx * 0.065 * kH) > 0.03 * kH) continue;
        if (!best || v.z > best.z) best = v.clone(); }
      return best;
    };
    const cb = this.bones[chest], cc = D[chest].center;
    const badge = (tex, w, h, p) => { if (!p) return; const m = new THREE.Mesh(new THREE.PlaneGeometry(w * kH, h * kH), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      m.position.set(p.x - cc.x, p.y - cc.y, p.z - cc.z + 0.018 * kH); cb.add(m); };
    // a proper polo collar: a yellow-edged navy band round the neck opening, on the chest bone
    { const na = D[head].a, ring = new THREE.TorusGeometry(0.097 * kH, 0.014 * kH, 8, 28); ring.rotateX(Math.PI / 2); ring.scale(1, 1, 0.9);
      const col = new THREE.Mesh(ring, new THREE.MeshLambertMaterial({ color: 0x1b2a52, emissive: 0x0b0f1c }));
      col.position.set(na.x - cc.x, collarY + 0.012 * kH - cc.y, na.z - cc.z - 0.004 * kH); col.rotation.x = 0.18; cb.add(col);
      const edge = new THREE.Mesh(new THREE.TorusGeometry(0.106 * kH, 0.004 * kH, 6, 28), new THREE.MeshLambertMaterial({ color: 0xffd400, emissive: 0x332a00 }));
      edge.geometry.rotateX(Math.PI / 2); edge.scale.set(1, 1, 0.9); edge.position.copy(col.position).add(new THREE.Vector3(0, 0.012 * kH, 0)); edge.rotation.x = 0.18; cb.add(edge);
      // placket: two buttons down the front
      for (let k = 0; k < 2; k++) { const fp = front(0); if (!fp) break; const bt = new THREE.Mesh(new THREE.SphereGeometry(0.006 * kH, 6, 4), new THREE.MeshLambertMaterial({ color: 0xffd400 })); bt.position.set(fp.x - cc.x, fp.y + 0.03 * kH - k * 0.035 * kH - cc.y, fp.z - cc.z + 0.016 * kH); cb.add(bt); } }
    badge(UNIFORM_TEX.logo(), 0.075, 0.075, front(1));
    badge(UNIFORM_TEX.name(this.uniformName), 0.075, 0.03, front(-1));
    this.uniform = shell;
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
  // A "fat" shape for the scanned model (used for players getting bigger in multiplayer): the lower front of the
  // torso swells into a round belly that pushes out and sags a little, the waist and hips widen, love handles at the
  // sides. Stored as a morph (0 = as scanned, 1 = the biggest) so it rides along with the skinning.
  // The skin that joined two parts that move apart (an arm pressed against the side, the palm on the thigh) used to be
  // cut out, which left holes in the body when the arms swung. Instead it's put back, stuck fast to the body (the
  // chest, the hips, or a thigh): the body stays whole and the limb just moves away from it.
  // Copies of the same point (where the texture has a seam) must move together, or the skin splits open along the
  // seam when a limb moves: every copy gets the same (averaged) bone weights.
  weldWeights(geo, skinIndex, skinWeight) {
    const pos = geo.attributes.position, n = pos.count, groups = new Map();
    for (let i = 0; i < n; i++) { const key = `${Math.round(pos.getX(i) * 4000)},${Math.round(pos.getY(i) * 4000)},${Math.round(pos.getZ(i) * 4000)}`; const g = groups.get(key); if (g) g.push(i); else groups.set(key, [i]); }
    let fixed = 0;
    for (const g of groups.values()) {
      if (g.length < 2) continue;
      let same = true; for (const i of g) for (let j = 0; j < 4; j++) if (skinIndex[i * 4 + j] !== skinIndex[g[0] * 4 + j] || Math.abs(skinWeight[i * 4 + j] - skinWeight[g[0] * 4 + j]) > 1e-3) same = false;
      if (same) continue;
      // only copies on joined parts (a seam on the arm, the shoulder...): a palm resting on a thigh in the scan shares
      // points with the thigh, and averaging those made a strip of skin stretch from the hand to the leg
      const doms = [...new Set(g.map(i => skinIndex[i * 4]))], par = (b) => { const d = this.defs[b]; return d && d.parent ? this.defs.findIndex(e => e.name === d.parent) : -1; };
      if (doms.some(a => doms.some(b => a !== b && par(a) !== b && par(b) !== a))) continue;
      const acc = new Map(); for (const i of g) for (let j = 0; j < 4; j++) { const w = skinWeight[i * 4 + j]; if (w > 0) acc.set(skinIndex[i * 4 + j], (acc.get(skinIndex[i * 4 + j]) || 0) + w); }
      const top = [...acc].sort((a, b) => b[1] - a[1]).slice(0, 4), tot = top.reduce((t, x) => t + x[1], 0);
      for (const i of g) for (let j = 0; j < 4; j++) { skinIndex[i * 4 + j] = top[j] ? top[j][0] : 0; skinWeight[i * 4 + j] = top[j] ? top[j][1] / tot : 0; }
      fixed++;
    }
    this.weldedSeams = fixed;
  }
  capCuts(geo, skinIndex, skinWeight) {
    const tris = this._cutTris || []; this._cutTris = null; if (!tris.length || !geo.index) return { skinIndex, skinWeight };
    const D = this.defs, n = geo.attributes.position.count, rank = (b) => { const nm = D[b] ? D[b].name : ''; return nm === 'chest' ? 5 : nm === 'pelvis' ? 4 : nm.startsWith('uLeg') ? 3 : nm === 'head' ? 2 : nm.startsWith('lLeg') ? 1 : 0; };
    const dup = new Map(), extra = [], newTris = [];
    for (let f = 0; f < tris.length; f += 3) {
      const vs = [tris[f], tris[f + 1], tris[f + 2]], ls = vs.map(v => skinIndex[v * 4]);
      if (ls.some(l => !D[l] || D[l].name.startsWith('lArm'))) continue;      // (skin where a hand touched the thigh is just dropped: put back, it hung off the leg like a strip)
      let target = ls[0]; for (const l of ls) if (rank(l) > rank(target)) target = l;
      if (rank(target) === 0) { target = ls.find((l, i) => ls.indexOf(l) !== i) ?? ls[0]; }        // (no body part in it: whichever two of them share)
      for (const v of vs) {
        if (skinIndex[v * 4] === target && skinWeight[v * 4] > 0.99) { newTris.push(v); continue; }
        const key = v * 64 + target; let nv = dup.get(key); if (nv === undefined) { nv = n + extra.length; dup.set(key, nv); extra.push([v, target]); }
        newTris.push(nv);
      }
    }
    const m = n + extra.length;
    for (const name of Object.keys(geo.attributes)) {
      const at = geo.attributes[name], k = at.itemSize, arr = new at.array.constructor(m * k);
      for (let v = 0; v < n; v++) for (let c = 0; c < k; c++) arr[v * k + c] = at.getComponent(v, c);          // (works for interleaved data too)
      extra.forEach(([v], j) => { for (let c = 0; c < k; c++) arr[(n + j) * k + c] = at.getComponent(v, c); });
      geo.setAttribute(name, new THREE.BufferAttribute(arr, k, at.normalized));
    }
    const si = new Uint16Array(m * 4), sw = new Float32Array(m * 4); si.set(skinIndex); sw.set(skinWeight);
    extra.forEach(([, t], j) => { si[(n + j) * 4] = t; sw[(n + j) * 4] = 1; });
    geo.setIndex(Array.from(geo.index.array).concat(newTris));
    this.cappedTriangles = tris.length / 3;
    return { skinIndex: si, skinWeight: sw };
  }

  addBellyMorph(geo) {
    const ch = this.parts.chest && this.parts.chest.def, pe = this.parts.pelvis && this.parts.pelvis.def; if (!ch || !pe) return;
    const pos = geo.attributes.position, d = new Float32Array(pos.count * 3), v = new THREE.Vector3(), kH = this.height / 1.68;
    const y0 = pe.a.y, y1 = ch.b.y, bellyY = y0 + (y1 - y0) * 0.36, zc = ch.center.z, W = (ch.half ? ch.half[0] : 0.17) * 1.25, D = ch.half ? ch.half[2] : 0.12;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i); if (v.y < y0 - 0.12 * kH || v.y > y1 - 0.05 * kH) continue;
      const fy = Math.exp(-(((v.y - bellyY) / (0.2 * kH)) ** 2)), fx = Math.exp(-((v.x / (W * 1.4)) ** 2)), front = THREE.MathUtils.smoothstep(v.z - zc, -D * 0.6, D * 0.9);
      if (Math.abs(v.x) > W * 2.2) continue;                                               // (not the arms hanging by the sides)
      const belly = fy * fx * front, waist = Math.exp(-(((v.y - (y0 + (y1 - y0) * 0.22)) / (0.22 * kH)) ** 2));
      d[i * 3] = v.x * 0.38 * waist;                                                        // wider at the waist and hips
      d[i * 3 + 1] = -0.035 * kH * belly;                                                   // the belly hangs a bit
      d[i * 3 + 2] = 0.2 * kH * belly + (v.z - zc) * 0.25 * waist;                          // out the front (and a bit deeper all round)
    }
    geo.morphAttributes.position = [new THREE.BufferAttribute(d, 3)]; geo.morphTargetsRelative = true;
  }
  // Give each scanned hand (wrist to fingertips) its own bone that normally just follows the forearm, so a hand
  // can be tucked away inside the forearm (scaled to nothing) while a posed gesture hand stands in for it (emotes).
  splitHands(geo, skinIndex, skinWeight) {
    const pos = geo.attributes.position, kH = this.height / 1.68, v = new THREE.Vector3(), dir = new THREE.Vector3();
    this.handBone = {}; this.handHide = { lArmL: false, lArmR: false }; this.handLen = 0.165 * kH;
    this.extraBones = []; this.handAxes = {}; this.handPose = {};
    const handVerts = {};
    ['lArmL', 'lArmR'].forEach((name) => {
      const k = this.defs.findIndex(d => d.name === name); if (k < 0) return; const d = this.defs[k], nb = this.defs.length + this.extraBones.length;
      dir.subVectors(d.b, d.a).normalize(); const list = [];
      for (let i = 0; i < pos.count; i++) {
        if (skinIndex[i * 4] !== k) continue;
        v.fromBufferAttribute(pos, i); if (v.clone().sub(d.b).dot(dir) < -this.handLen) continue;      // (up the arm from the wrist)
        for (let sl = 0; sl < 4; sl++) if (skinIndex[i * 4 + sl] === k) skinIndex[i * 4 + sl] = nb;
        list.push(i);
      }
      if (list.length) { this.handBone[name] = nb; this.extraBones.push({ kind: 'hand', name }); handVerts[name] = list; }
    });
    // the fingers of the model's own hand: two more bones per hand (the middle finger, and the rest), hinged across
    // the knuckles, so a hand can make a fist or flip someone off with its own fingers
    for (const name of Object.keys(handVerts)) try { this.splitFingers(geo, name, handVerts[name], pos, skinIndex, skinWeight, dir.subVectors(this.parts[name].def.b, this.parts[name].def.a).normalize().clone()); } catch (e) { console.warn('fingers', e); }
  }
  splitFingers(geo, name, list, pos, skinIndex, skinWeight, armDir) {
    const kH = this.height / 1.68, v = new THREE.Vector3(), hc = new THREE.Vector3();
    for (const i of list) hc.add(v.fromBufferAttribute(pos, i)); hc.multiplyScalar(1 / list.length);
    // the hand's shape: longest spread = along the fingers, next = across the knuckles, least = through the palm
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const i of list) { v.fromBufferAttribute(pos, i).sub(hc); const a = [v.x, v.y, v.z]; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r][c] += a[r] * a[c]; }
    const mul = (x) => new THREE.Vector3(C[0][0] * x.x + C[0][1] * x.y + C[0][2] * x.z, C[1][0] * x.x + C[1][1] * x.y + C[1][2] * x.z, C[2][0] * x.x + C[2][1] * x.y + C[2][2] * x.z);
    const eig = (seed, not) => { let x = seed.clone(); for (let it = 0; it < 60; it++) { if (not) x.addScaledVector(not, -x.dot(not)); x = mul(x).normalize(); } if (not) { x.addScaledVector(not, -x.dot(not)).normalize(); } return x; };
    const along = eig(armDir.clone().add(new THREE.Vector3(0.1, 0.05, 0.02)).normalize()); if (along.dot(armDir) < 0) along.negate();
    let width = eig(new THREE.Vector3(0.3, 0.2, 1).normalize(), along), palm = new THREE.Vector3().crossVectors(along, width).normalize();
    // which way the palm faces: in towards the body (arms down) or down (arms out)
    const inward = new THREE.Vector3(-Math.sign(hc.x) || 1, 0, 0);
    if (Math.abs(palm.y) > Math.abs(palm.x)) { if (palm.y > 0) palm.negate(); } else if (palm.dot(inward) < 0) palm.negate();
    width.crossVectors(palm, along).normalize();
    if (width.z < 0) { width.negate(); }           // (+width = the thumb / index finger side: forwards, for arms hanging down)
    let aMin = 1e9, aMax = -1e9; for (const i of list) { const t = v.fromBufferAttribute(pos, i).sub(hc).dot(along); aMin = Math.min(aMin, t); aMax = Math.max(aMax, t); }
    const fl = Math.min(0.085 * kH, (aMax - aMin) * 0.47), knA = aMax - fl, blend = 0.012 * kH;
    const fing = list.filter(i => v.fromBufferAttribute(pos, i).sub(hc).dot(along) > knA - blend);
    let uMin = 1e9, uMax = -1e9; for (const i of fing) { const u = v.fromBufferAttribute(pos, i).sub(hc).dot(width); uMin = Math.min(uMin, u); uMax = Math.max(uMax, u); }
    const hb = this.handBone[name], restB = this.defs.length + this.extraBones.length, midB = restB + 1;
    for (const i of fing) {
      v.fromBufferAttribute(pos, i).sub(hc); const t = v.dot(along), un = (v.dot(width) - uMin) / Math.max(1e-6, uMax - uMin);
      const w = THREE.MathUtils.smoothstep(t, knA - blend, knA + blend), fb = un > 0.5 && un < 0.73 ? midB : restB;
      skinIndex[i * 4] = fb; skinWeight[i * 4] = w; skinIndex[i * 4 + 1] = hb; skinWeight[i * 4 + 1] = 1 - w; skinIndex[i * 4 + 2] = skinIndex[i * 4 + 3] = 0; skinWeight[i * 4 + 2] = skinWeight[i * 4 + 3] = 0;
    }
    // the middle finger comes away from the ones either side of it (scanned fingers are often joined up)
    if (geo.index) { const idx = geo.index.array, keep = [], isF = new Set(fing);
      for (let f = 0; f < idx.length; f += 3) { const a = idx[f], b = idx[f + 1], c = idx[f + 2];
        if (isF.has(a) && isF.has(b) && isF.has(c)) { const ba = skinIndex[a * 4], bb = skinIndex[b * 4], bc = skinIndex[c * 4];
          if ((ba === midB || bb === midB || bc === midB) && !(ba === midB && bb === midB && bc === midB) && [a, b, c].every(q => v.fromBufferAttribute(pos, q).sub(hc).dot(along) > knA + blend * 0.4)) continue; }
        keep.push(a, b, c); }
      geo.setIndex(keep); }
    const knuckle = hc.clone().addScaledVector(along, knA).addScaledVector(palm, 0.006 * kH), wristP = hc.clone().addScaledVector(along, aMin + 0.01 * kH);
    // which way round the knuckle line curls the fingers in towards the palm
    const curlSign = new THREE.Vector3().crossVectors(width, along).dot(palm) > 0 ? 1 : -1;
    this.handAxes[name] = { along, width, palm, knuckle, wrist: wristP, curlSign };
    this.handPose[name] = { q: new THREE.Quaternion(), curl: 0, mid: 0 };
    this.extraBones.push({ kind: 'fingers', name }, { kind: 'middle', name });
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
    const base = _v2.set(this.root.x, 0.02 + this.bob + (FLOOR.at ? FLOOR.at(this.root.x, this.root.z) : 0), this.root.z);
    if (this.shiftZ) { base.x += Math.sin(this.yaw) * this.shiftZ; base.z += Math.cos(this.yaw) * this.shiftZ; }
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
    this.yaw = yaw; this.root.set(x, 0, z); this._lastP = null; this.constrainForget && this.constrainForget();
    this.setMode('anim');
    this.animate(0);
    for (const p of this.list) { p.body.velocity.setZero(); p.body.angularVelocity.setZero(); }
  }

  // Switch between animated (kinematic) and ragdoll (dynamic) bodies.
  setMode(mode, strength = 0) {
    this.strength = mode === 'ragdoll' ? strength : 0;
    if (mode === this.mode) return;
    const dyn = mode === 'ragdoll'; if (dyn) { this._lastP = null; this.fkReady = false; }
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
    this.mode = mode; this.syncJoints();
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
    const last = this._lastP || (this._lastP = this.list.map(() => null)); this.fkReady = true;
    this.list.forEach((p, i) => {
      const b = p.body;
      let P = fk[i].p, Q = fk[i].q;
      if (k < 1) { P = _v.copy(this._from[i].p).lerp(fk[i].p, k); Q = _q.copy(this._from[i].q).slerp(fk[i].q, k); }
      // its speed is how far the ANIMATION moved it since last frame, never measured from where the body is now: the physics
      // step carries a moving body on past its spot, and measuring from there fed back on itself (an arm overshooting further
      // each frame, then swinging metres either side of the body; worst at a headset's 72/90 frames a second)
      const L = last[i];
      if (dt > 0 && L && L.distanceToSquared(P) < 1) b.velocity.set((P.x - L.x) / dt, (P.y - L.y) / dt, (P.z - L.z) / dt); else b.velocity.set(0, 0, 0);
      (last[i] || (last[i] = P.clone())).copy(P);
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
      bone.scale.setScalar(1);
    });
    // getting fatter (players in multiplayer, as they go up the stages): the belly and waist swell, mostly forwards,
    // the hips and thighs thicken; 0 = as they are, 1 = the biggest
    if (this.mesh && this.mesh.morphTargetInfluences) this.mesh.morphTargetInfluences[0] = Math.max(0, this.fat || 0);
    if (this.uniform && this.uniform.morphTargetInfluences) this.uniform.morphTargetInfluences[0] = Math.max(0, this.fat || 0);     // (the belly: see addBellyMorph)
    if (this.fat > 0.001) for (const name of ['uLegL', 'uLegR']) { const part = this.parts[name]; if (!part) continue; const k = 1 + 0.22 * this.fat; this.bones[this.list.indexOf(part)].scale.set(k, 1, k); }   // thicker thighs
    if (this.hideHead) { const hb = this.bones[this.list.indexOf(this.parts.head)]; hb && hb.scale.setScalar(0.001); }   // (your own body, seen from inside your head)
    // a limb that's come off (an emote): it shrinks away into the joint it hung from, leaving a stump
    if (this.partHide) for (const name in this.partHide) { if (!this.partHide[name]) continue; const part = this.parts[name], bone = part && this.bones[this.list.indexOf(part)]; if (!bone) continue;
      const b = part.body, c = part.def.center, a = part.def.a;
      _hm.compose(_hp.set(b.position.x, b.position.y, b.position.z), _hq.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w), _hs.set(1, 1, 1)).multiply(_hm2.makeTranslation(-c.x, -c.y, -c.z))
        .multiply(_hm3.makeTranslation(a.x, a.y, a.z).multiply(_pmR.makeScale(0.001, 0.001, 0.001)).multiply(_pmT.makeTranslation(-a.x, -a.y, -a.z))).multiply(_hm2.makeTranslation(c.x, c.y, c.z));
      _hm.decompose(bone.position, bone.quaternion, bone.scale); }
    // the hands (and their fingers) ride on the forearms, turned at the wrist and curled at the knuckles as posed
    if (this.extraBones) this.extraBones.forEach((eb, j) => {
      const bone = this.bones[this.defs.length + j]; if (!bone) return; const b = this.parts[eb.name].body, c = this.parts[eb.name].def.center, ax = this.handAxes && this.handAxes[eb.name], hp = this.handPose && this.handPose[eb.name];
      _hm.compose(_hp.set(b.position.x, b.position.y, b.position.z), _hq.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w), _hs.set(1, 1, 1)).multiply(_hm2.makeTranslation(-c.x, -c.y, -c.z));
      if (ax && hp) {
        if (hp.q.w < 0.99999) _hm.multiply(pivotM(ax.wrist, hp.q));
        const curl = eb.kind === 'fingers' ? hp.curl : eb.kind === 'middle' ? hp.mid : 0;
        if (curl) _hm.multiply(pivotM(ax.knuckle, _hq2.setFromAxisAngle(ax.width, curl * 1.55 * ax.curlSign)));
      }
      // a hand that's hidden (a gesture hand stands in for it) shrinks away into the wrist, not the middle of the arm
      if (this.handHide[eb.name]) { const w = ax ? ax.wrist : this.parts[eb.name].def.b; _hm.multiply(_hm3.makeTranslation(w.x, w.y, w.z).multiply(_pmR.makeScale(0.001, 0.001, 0.001)).multiply(_pmT.makeTranslation(-w.x, -w.y, -w.z))); }
      _hm.multiply(_hm2.makeTranslation(c.x, c.y, c.z)); _hm.decompose(bone.position, bone.quaternion, bone.scale);
    });
    this.applyScale();
    this.cullBounds();
  }
  // only drawn while it's in view: each frame, a ball round where the body really is (from its parts, with room for the
  // flesh, the belly and the hands), so the graphics chip can skip a character behind you or out of the way. Characters
  // used to be drawn wherever they were (an animated body's own bounds don't move with it): with twelve players, every
  // phone drew all eleven others every frame, looking at them or not. Nothing in view looks any different
  cullBounds() {
    if (!this.mesh || !this.list.length) return;
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (const p of this.list) { const q = p.body.position; if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y; if (q.z < z0) z0 = q.z; if (q.z > z1) z1 = q.z; }
    const S = this._cs || (this._cs = new THREE.Sphere()); S.center.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    let r = 0; for (const p of this.list) r = Math.max(r, S.center.distanceTo(p.body.position));
    S.radius = r + 0.5 * (this.height / 1.68) * (1 + Math.max(0, this.fat || 0));
    if (!Number.isFinite(S.radius) || !Number.isFinite(S.center.x)) { S.center.set(0, 0, 0); S.radius = 1e6; }      // (never hidden by a bad number)
    if (!this._skin || this._skinN !== this.group.children.length) { this._skinN = this.group.children.length; this._skin = []; this.group.traverse(o => { if (o.isSkinnedMesh) this._skin.push(o); }); }
    for (const m of this._skin) { m.boundingSphere = S; m.frustumCulled = true; }
  }
  // how big the body is drawn, around where it stands: bulk (a player's stage in multiplayer: taller and much wider)
  // times an emote's stretch (tall and thin...)
  applyScale() {
    const g = this.group; if (!g) return; const B = this.bulk, S = this.stretchS, W = (B ? B.w : 1) * (S ? S[0] : 1), H = (B ? B.h : 1) * (S ? S[1] : 1);
    if (W === 1 && H === 1) { if (g.scale.x !== 1 || g.scale.y !== 1) { g.scale.set(1, 1, 1); g.position.set(0, 0, 0); } return; }
    g.scale.set(W, H, W); g.position.set(this.root.x * (1 - W), 0, this.root.z * (1 - W));
  }
  // a world point on the body (from the physics) moved to where it's drawn when the body is drawn bigger
  drawn(v) { const g = this.group; if (!g || (g.scale.x === 1 && g.scale.y === 1)) return v; v.x = this.root.x + (v.x - this.root.x) * g.scale.x; v.y *= g.scale.y; v.z = this.root.z + (v.z - this.root.z) * g.scale.z; return v; }
  // the wrist (where the hand starts) and the way the forearm points, in the world
  wrist(name, out, dirOut) {
    const p = this.parts[name], d = p.def, b = p.body; _q.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
    dirOut.copy(d.dir).applyQuaternion(_q).normalize();
    return this.tip(name, out).addScaledVector(dirOut, -(this.handLen || 0.165 * this.height / 1.68));
  }

  // ---- queries ----
  pos(name, out) { const b = this.parts[name].body.position; return out.set(b.x, b.y, b.z); }
  animPos(name, out) { const i = this.list.indexOf(this.parts[name]), L = this._lastP && this._lastP[i]; if (this.fkReady && L) return out.copy(L); return this.pos(name, out); }
  animQuat(name, out) { const i = this.list.indexOf(this.parts[name]); if (this.fkReady && this._fk && this._fk[i]) return out.copy(this._fk[i].q); return this.partQuat(name, out); }
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

// ---- Lidl uniform badges ----
const UNIFORM_TEX = {
  _logo: null,
  logo() {
    if (this._logo) return this._logo;
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#1e4ea8'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#ffd400'; g.beginPath(); g.arc(64, 64, 54, 0, 7); g.fill();
    g.strokeStyle = '#e53935'; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 49, 0, 7); g.stroke();
    g.fillStyle = '#1e4ea8'; g.font = '900 38px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Lidl', 64, 67);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (this._logo = t);
  },
  name(nm) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#1e4ea8'; g.fillRect(0, 0, 256, 26);
    g.fillStyle = '#ffd400'; g.font = '900 20px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LIDL', 128, 14);
    g.fillStyle = '#111'; g.font = '900 40px Arial, sans-serif'; g.fillText((nm || 'STAFF').toUpperCase(), 128, 62);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  },
};
