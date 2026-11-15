// EMOTES (multiplayer): pick one off the emote wheel and your character does it for everyone to see.
// Everything is done with the character's own body, hands included: the scanned hands have their own finger joints
// (see ragdoll.js splitFingers), so a fist, a middle finger or palms up are the model's real hands.
//
// The wheel has two pages: DEFAULT EMOTES (anyone) and the character's own emotes (e.g. "CHLOE'S EMOTES").
//
//   MIDDLE FINGER  both hands up in front of the chest, backs of the hands out, middle fingers up. Chin up, cocky hip,
//                  two little forward pumps with a nod.
//   THE GRIDDY     as it's really done: a bouncy hop on the standing foot every beat while the other foot is lifted
//                  behind (heel up, knee bent) and then kicked out in front to land on its HEEL with the toes up and
//                  the leg nearly straight, swapping feet every beat and creeping forward. The body leans forward, the
//                  arms swing hard from the shoulders in opposition to the legs, elbows bent, loose fists, swinging
//                  right back behind the hips. Every 8 counts: the "goggles", hands up round the eyes with the
//                  elbows out wide and the head tipped back a touch, feet still going.
//   SIX SEVEN      elbows tucked in, forearms out front palms up, see-sawing ("six" right hand, "seven" left hand)
//   BACKFLIP       crouch, jump, tucked backwards somersault, land, arms up.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skelClone } from 'three/addons/utils/SkeletonUtils.js';
import { FINGERS, BENDS } from './hands.js';

export const EMOTES = [
  { id: 'finger', name: 'MIDDLE FINGER', icon: '🖕', dur: 3.4 },
  { id: 'griddy', name: 'THE GRIDDY', icon: '🕺', dur: 6.8 },
  { id: 'sixseven', name: 'SIX SEVEN', icon: '🤲', dur: 4.0 },
  { id: 'backflip', name: 'BACKFLIP', icon: '🤸', dur: 2.6 },
];
// each character's own emotes
export const CHAR_EMOTES = {
  ethan: [{ id: 'fifa', name: 'FIFA RAGE', icon: '🎮', dur: 5.2 }, { id: 'pepsi', name: 'PEPSI MAX PILE', icon: '🥤', dur: 5.0 }, { id: 'sniff', name: 'PASTY SNIFFER', icon: '👃', dur: 4.4 }],
  ben: [{ id: 'hairline', name: 'NEW HAIRLINE', icon: '💇', dur: 4.6 }, { id: 'oldman', name: 'MY BACK', icon: '🦯', dur: 5.4 }, { id: 'turkey', name: 'TO TURKEY!', icon: '✈️', dur: 4.6 }],
  tommy: [{ id: 'ball', name: 'MY BALL', icon: '🟤', dur: 5.8 }, { id: 'older', name: 'ONE DAY OLDER', icon: '☝️', dur: 4.0 }],
  lewis: [{ id: 'siu', name: 'SIUUU', icon: '🐐', dur: 3.6 }, { id: 'tall', name: 'TOO TALL', icon: '🦒', dur: 5.0 }, { id: 'legday', name: 'LEG DAY', icon: '🏋️', dur: 5.0 }],
  chloe: [{ id: 'ears', name: 'UCL EARS', icon: '🏆', dur: 5.0 }, { id: 'chloedance', name: 'VICTORY DANCE', icon: '💃', dur: 4.4 }, { id: 'salad', name: 'SALAD TOSS', icon: '🥗', dur: 4.6 }],
  aidanw: [{ id: 'knee', name: 'KNEE PAIN', icon: '🦵', dur: 5.4 }, { id: 'beard', name: 'BEARD GROWTH', icon: '🧔', dur: 6.4 }],
  aidan: [{ id: 'guinness', name: 'GUINNESS DREAM', icon: '🍺', dur: 6.4 }, { id: 'settle', name: 'LET IT SETTLE', icon: '⏳', dur: 5.0 }],
  dylan: [{ id: 'acl', name: 'ACL EXPLOSION', icon: '💥', dur: 5.4 }, { id: 'airguitar', name: 'WONDERWALL', icon: '🎤', dur: 5.4 }, { id: 'oompa', name: 'OOMPA LOOMPA', icon: '🍫', dur: 5.4 }],
  ian: [{ id: 'abuse', name: 'SHOUTING ABUSE', icon: '🤬', dur: 4.6 }, { id: 'cast', name: 'GONE FISHING', icon: '🎣', dur: 4.8 }, { id: 'flip', name: 'BURGER FLIP', icon: '🍔', dur: 4.6 }],
  oliver: [{ id: 'honest', name: 'MY HONEST REACTION', icon: '😐', dur: 4.6 }, { id: 'live', name: 'GOING LIVE', icon: '📸', dur: 4.4 }],
  noah: [{ id: 'bellybounce', name: 'BELLY BOUNCE', icon: '🤰', dur: 4.2 }, { id: 'conversion', name: 'CONVERSION KICK', icon: '🏉', dur: 4.6 }],
  harry: [{ id: 'date', name: 'ON A DATE', icon: '💕', dur: 6.0 }, { id: 'spike', name: 'TOUCHDOWN', icon: '🏈', dur: 4.4 }, { id: 'swipe', name: 'SWIPE RIGHT', icon: '👉', dur: 4.4 }, { id: 'van', name: 'HARRY\'S VAN', icon: '🚐', dur: 9.0 }],
  alfie: [{ id: 'sugar', name: 'SPECIAL STUFF', icon: '🧂', dur: 5.6 }, { id: 'nutmeg', name: 'THE NUTMEG', icon: '⚽', dur: 4.6 }],
  connor: [{ id: 'ynwa', name: 'YNWA SCARF', icon: '🧣', dur: 5.0 }, { id: 'round', name: 'MY ROUND', icon: '🍻', dur: 4.2 }, { id: 'jig', name: 'IRISH JIG', icon: '☘️', dur: 5.0 }],
  ronnie: [{ id: 'drum', name: 'BELLY DRUM', icon: '🥁', dur: 4.4 }, { id: 'loco', name: 'MANGO LOCO', icon: '🥭', dur: 4.6 }],
};
const ALL = [...EMOTES, ...Object.values(CHAR_EMOTES).flat(), { id: 'ballthrow', name: 'THE FINAL BALL', icon: '🟤', dur: 2.2 }];   // (the last one is Tommy's attack, not on the wheel)
export const emoteInfo = (id) => ALL.find(e => e.id === id);

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ss = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const ramp = (t, a, b) => ss((t - a) / (b - a));
const pulse = (t, at, w) => Math.exp(-(((t - at) / w) ** 2));
const mixv = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
// drinking (right arm, before standArms flips x): the elbow forward and a little out at chest height, the forearm
// folded right back up to the mouth
const DRINK_U = [0.32, -0.42, 0.85], DRINK_L = [-0.45, 0.8, -0.35];
// hand shapes: how far the fingers curl (the middle finger on its own), and which way the back of the hand faces
const HANDS = { spidey: { curl: 1, mid: 1 }, point: { curl: 1, mid: 1 }, fist: { curl: 1, mid: 1 }, finger: { curl: 1, mid: 0 }, palm: { curl: 0.08, mid: 0.08 }, open: { curl: 0, mid: 0 }, goggle: { curl: 0.55, mid: 0.6 }, grip: { curl: 0.8, mid: 0.8 } };
const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });

// ------------------------------------------------------------------ hands for gestures
// The scanned models' fingers are joined together (no gaps between them), so bending them leaves stretched skin.
// For a gesture (a fist, the middle finger, palms up...) the character's hand is swapped for a fully jointed hand
// (every finger bone), coloured to match their own skin from their model, at their wrist, for as long as the gesture.
const HAND_SRC = {}; const loadHand = (side) => HAND_SRC[side] || (HAND_SRC[side] = new GLTFLoader().loadAsync(`./assets/hands/${side}.glb`).then(g => g.scene).catch(e => { console.warn('hand', e); return null; }));
loadHand('left'); loadHand('right');
// per hand shape, how far each finger curls (0 straight .. 1 a tight fist)
const CURLS = {
  fist: { thumb: 0.8, index: 1, middle: 1, ring: 1, pinky: 1 },
  finger: { thumb: 0.85, index: 1, middle: 0, ring: 1, pinky: 1 },
  palm: { thumb: 0.15, index: 0.08, middle: 0.06, ring: 0.1, pinky: 0.14 },
  goggle: { thumb: 0.45, index: 0.62, middle: 0.2, ring: 0.18, pinky: 0.15 },
  grip: { thumb: 0.6, index: 0.7, middle: 0.72, ring: 0.75, pinky: 0.78 },
  open: { thumb: 0.15, index: 0.1, middle: 0.12, ring: 0.14, pinky: 0.16 },
  point: { thumb: 0.8, index: 0, middle: 1, ring: 1, pinky: 1 },
  spidey: { thumb: 0.1, index: 0, middle: 1, ring: 1, pinky: 0 },
};
class ModelHand {
  constructor(side, color, scene) {
    this.side = side; this.root = new THREE.Group(); this.root.visible = false; scene.add(this.root); this.ready = false;
    loadHand(side).then(src => { if (!src) return; const m = skelClone(src); m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.material = new THREE.MeshLambertMaterial({ color, emissive: new THREE.Color(color).multiplyScalar(0.18) }); } });
      this.bones = {}; for (const ch of Object.values(FINGERS)) for (const n of ch) this.bones[n] = m.getObjectByName(n); this.wrist = m.getObjectByName('wrist');
      this.rest = {}; for (const [n, b] of Object.entries(this.bones)) this.rest[n] = { p: b.position.clone(), q: b.quaternion.clone() };
      m.updateMatrixWorld(true); this.wristInv = this.wrist.matrixWorld.clone().invert(); this.model = m; m.matrixAutoUpdate = false; this.root.add(m); this.ready = true; });
  }
  pose(curl) {
    if (!this.ready) return; const ax = new THREE.Vector3(), q = new THREE.Quaternion();
    for (const [f, chain] of Object.entries(FINGERS)) { const c = THREE.MathUtils.clamp(curl[f] ?? 0, 0, 1), P = chain.map(n => this.rest[n].p.clone()), Q = chain.map(n => this.rest[n].q.clone());
      for (const [j, full] of BENDS[f]) { ax.set(1, 0, 0).applyQuaternion(Q[j]); q.setFromAxisAngle(ax, -full * c); for (let k = j + 1; k < chain.length; k++) P[k].sub(P[j]).applyQuaternion(q).add(P[j]); for (let k = j; k < chain.length; k++) Q[k].premultiply(q); }
      chain.forEach((n, i) => { this.bones[n].position.copy(P[i]); this.bones[n].quaternion.copy(Q[i]); }); }
  }
  // the wrist at `at`, fingers pointing along `along`, the back of the hand towards `back`
  place(at, along, back, scale) {
    if (!this.ready) return; const z = along.clone().negate().normalize(), y = back.clone().addScaledVector(z, -back.dot(z)); if (y.lengthSq() < 1e-6) y.set(0, 1, 0).addScaledVector(z, -z.y); y.normalize();
    const x = new THREE.Vector3().crossVectors(y, z), m = new THREE.Matrix4().makeBasis(x, y, z).setPosition(at); m.scale(new THREE.Vector3(scale, scale, scale));
    this.model.matrix.copy(m).multiply(this.wristInv); this.model.matrixWorldNeedsUpdate = true;
  }
  dispose() { this.root.parent && this.root.parent.remove(this.root); }
}
// the colour of a character's skin, from their own model's texture round the hands
function skinColour(rag) {
  if (rag._skinCol) return rag._skinCol; let col = new THREE.Color(0xe2b08c);
  try { const mesh = rag.mesh, img = mesh.material.map && mesh.material.map.image, uv = mesh.geometry.attributes.uv, si = mesh.geometry.attributes.skinIndex;
    if (img && uv && si && rag.handBone) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 128, 128); const d = g.getImageData(0, 0, 128, 128).data;
      const hb = new Set(Object.values(rag.handBone)); let r = 0, gg = 0, b = 0, n = 0;
      for (let i = 0; i < uv.count && n < 400; i += 3) { if (!hb.has(si.getX(i))) continue; const px = Math.min(127, Math.max(0, Math.floor(uv.getX(i) * 128))), py = Math.min(127, Math.max(0, Math.floor(uv.getY(i) * 128))), k = (py * 128 + px) * 4; r += d[k]; gg += d[k + 1]; b += d[k + 2]; n++; }
      if (n > 10) col = new THREE.Color().setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace); } } catch (e) { /* (a texture we can't read: the default) */ }
  return (rag._skinCol = col);
}

// ------------------------------------------------------------------ the body moves
// Runs on a character after its normal (idle / walk) pose has been set and before the ragdoll animates.
// Arm/leg aims are directions in the character's own frame: +x to their left, +y up, +z the way they face.
export class EmotePlayer {
  constructor(c, scene, onWord) {
    this.c = c; this.scene = scene; this.onWord = onWord; this.id = null; this.t = 0; this.w = 0; this.props = {}; this.lastBeat = -1;
  }
  get active() { return !!this.id; }
  start(id) { const e = emoteInfo(id); if (!e) return; if (this.id) this.stop(); this.id = id; this.dur = e.dur; this.t = 0; this.lastBeat = -1; this.marks = {}; this.tblAt = null; }
  stop() { this.id = null; this.hide(); this.clearProps(); this.unstretch(); if (this.undo) { for (const f of this.undo) try { f(); } catch (e) {} this.undo = null; } }
  onStop(f) { (this.undo || (this.undo = [])).push(f); }
  hide() { this.hideHands(); const r = this.c.rag; if (r.handHide) r.handHide.lArmL = r.handHide.lArmR = false; if (r.handPose) for (const k in r.handPose) { r.handPose[k].curl = 0; r.handPose[k].mid = 0; r.handPose[k].q.identity(); } }
  dispose() { this.stop(); if (this.mh) { this.mh.L.dispose(); this.mh.R.dispose(); this.mh = null; } }
  clearProps() { this.holding = null; for (const k in this.props) { const p = this.props[k]; this.scene.remove(p); p.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } this.props = {}; }
  unstretch() { const g = this.c.rag.group; if (g && (g.scale.x !== 1 || g.scale.y !== 1)) { g.scale.set(1, 1, 1); g.position.set(0, 0, 0); } }
  // once per emote: fire a word / sound at a moment
  at(t, when, key, fn) { if (t >= when && !this.marks[key]) { this.marks[key] = true; fn(); } }
  say(txt, where, snd) { this.onWord && this.onWord(txt, where || this.c.headPos(new THREE.Vector3()).add({ x: 0, y: 0.25, z: 0 }), snd); }
  // a point in the character's own frame (x to their left, y up from the floor, z ahead), in the world
  L(x, y, z, out = new THREE.Vector3()) { const r = this.c.rag, k = r.height / 1.68, s = Math.sin(r.yaw), c = Math.cos(r.yaw); return out.set(r.root.x + (x * c + z * s) * k, y * k, r.root.z + (-x * s + z * c) * k); }
  get kH() { return this.c.rag.height / 1.68; }
  prop(key, make) { let p = this.props[key]; if (!p) { p = this.props[key] = make(); this.scene.add(p); } return p; }
  // put a prop in a hand (it sits in the palm, lined up with the forearm)
  inHand(p, S, off = [0, 0, 0], rot = null) { (this.holding || (this.holding = new Map())).set(p, [S, off, rot]); this.placeInHand(p, S, off, rot); }
  placeInHand(p, S, off = [0, 0, 0], rot = null) {
    const r = this.c.rag, name = 'lArm' + S; r.grip(name, p.position); r.partQuat(name, p.quaternion);
    if (off[0] || off[1] || off[2]) p.position.add(_v.set(...off).multiplyScalar(this.kH).applyQuaternion(p.quaternion));
    if (rot) p.quaternion.multiply(_q.setFromEuler(new THREE.Euler(...rot)));
  }

  // vr: their arms come from their real hands (leave the arms alone)
  update(dt, vr) {
    if (!this.id) return 0;
    this.t += dt; const t = this.t, D = this.dur;
    if (t >= D) { this.stop(); return 0; }
    const w = ramp(t, 0, 0.22) * (1 - ramp(t, D - 0.35, D)); this.w = w;
    const r = this.c.rag, base = {};
    for (const k in r.pose) base[k] = r.pose[k].clone();
    const bob0 = r.bob || 0;
    const out = this[this.id](t, vr) || {};      // sets r.pose.* (and returns the hand shapes, hip bob, whole-body turns)
    for (const k in r.pose) { if (vr && !out.full && /Arm/.test(k)) { r.pose[k].copy(base[k]); continue; } r.pose[k].copy(base[k].slerp(r.pose[k], w)); }
    if (out.spin) { _q.setFromAxisAngle(Y, out.spin * w); for (const k in r.pose) r.pose[k].premultiply(_q); }      // the whole body turns round
    if (out.flip) { _q.setFromAxisAngle(X, out.flip * (out.flipNoBlend ? 1 : w)); for (const k in r.pose) r.pose[k].premultiply(_q); }      // ...or over (round the hips)
    r.bob = bob0 + (out.bob || 0) * w;
    // stretched tall (and thin), from the floor up
    const g = r.group; if (out.stretch && g) { const sy = 1 + (out.stretch[0] - 1) * w, sx = 1 + (out.stretch[1] - 1) * w; g.scale.set(sx, sy, sx); g.position.set(r.root.x * (1 - sx), 0, r.root.z * (1 - sx)); } else this.unstretch();
    this.out = out;
    return w;
  }
  // after the body has moved this frame: the hands (the model's own fingers), and any props
  place() { if (this.id && this.c.prop && this.c.prop.visible) { const pr = this.c.prop; pr.visible = false; this.onStop(() => { pr.visible = true; }); }      // (their usual pint / phone / rod is put away for the emote)
    if (this.id && this.c.reelLine) this.c.reelLine.visible = false;
    if (this.id && this.out) { this.gestures(this.out, this.w); if (this.holding) for (const [p, [S, off, rot]] of this.holding) if (p.visible && p.parent) this.placeInHand(p, S, off, rot); } }      // (held things follow the hand after it's moved: no lagging behind)
  gestures(out, w) {
    const r = this.c.rag; if (!r.handPose) return;
    if (!this.mh) { const col = skinColour(r); this.mh = { L: new ModelHand('left', col, this.scene), R: new ModelHand('right', col, this.scene) }; }
    for (const S of ['L', 'R']) {
      const name = 'lArm' + S, hp = r.handPose[name], ax = r.handAxes && r.handAxes[name], mh = this.mh[S]; if (!hp || !ax) continue;
      hp.curl = 0; hp.mid = 0; hp.q.identity();             // (the scanned fingers are never bent: no stretched skin)
      const kind = out.hand && out.hand[S], swap = !!kind && kind !== 'open' && w > 0.25 && mh.ready && !this.c.down;
      mh.root.visible = swap; if (r.handHide) r.handHide[name] = swap;
      if (!swap) continue;
      const wr = new THREE.Vector3(), dir = new THREE.Vector3(); r.wrist(name, wr, dir);
      const fq = r.partQuat(name, new THREE.Quaternion());
      const want = out.back && out.back[S], back = want ? new THREE.Vector3(...want).applyAxisAngle(Y, r.yaw) : ax.palm.clone().negate().applyQuaternion(fq);
      mh.pose(CURLS[kind] || CURLS.open); mh.place(wr, dir, back, this.kH * 1.02);
    }
  }
  hideHands() { if (this.mh) for (const S of ['L', 'R']) this.mh[S].root.visible = false; }

  // ================================================================ DEFAULT EMOTES
  finger(t) {
    const r = this.c.rag, P = r.pose;
    const up = ramp(t, 0.1, 0.45);
    const pump = pulse(t, 1.15, 0.09) + pulse(t, 1.95, 0.09) * 1.1 + pulse(t, 2.6, 0.11) * 0.6;
    for (const [S, sx] of [['L', 1], ['R', -1]]) {
      r.aim('uArm' + S, sx * (0.32 - up * 0.06), -0.55 + up * 0.25, 0.75 + pump * 0.25);
      r.aim('lArm' + S, sx * 0.04, 0.95 * up - 0.4 * (1 - up), 0.32 + pump * 0.45 + (1 - up) * 0.6);
    }
    r.aim('uLegL', 0.14, -1, 0.05); r.aim('lLegL', 0.1, -1, -0.1);
    r.aim('uLegR', -0.05, -1, 0.0); r.aim('lLegR', -0.03, -1, 0.0);
    P.pelvis.setFromAxisAngle(Z, -0.07).multiply(_q.setFromAxisAngle(Y, 0.08));
    P.chest.setFromAxisAngle(X, 0.05 + pump * 0.14).multiply(_q.setFromAxisAngle(Z, 0.05));
    P.head.setFromAxisAngle(X, -0.2 + pump * 0.22).multiply(_q.setFromAxisAngle(Z, 0.14)).multiply(_q.setFromAxisAngle(Y, -0.08));
    return { hand: t > 0.25 ? { L: 'finger', R: 'finger' } : null, back: { L: [0, 0, 1], R: [0, 0, 1] }, bob: -0.012 * this.kH };
  }

  // THE GRIDDY (see the top of the file). One beat = one step = 0.3 s.
  griddy(t) {
    const r = this.c.rag, P = r.pose, kH = this.kH;
    const B = 0.3, n = Math.floor(t / B), ph = (t % B) / B, side = n % 2 ? 'R' : 'L', sx = side === 'L' ? 1 : -1, other = side === 'L' ? 'R' : 'L';
    const bar = (t / B) % 8, g = t > B * 6 ? ss((bar - 5.6) / 0.5) * (1 - ss((bar - 7.6) / 0.4)) + (bar < 0.4 && t > B * 8 ? 1 - ss(bar / 0.4) : 0) : 0;
    // the working leg: heel kicked up behind (knee bent), swung through, and planted out front on the HEEL with the
    // leg almost straight (toes up), then it becomes the standing leg as the other one goes
    let hip, knee;
    if (ph < 0.35) { const k = ph / 0.35; hip = -0.25 + 0.55 * ss(k); knee = 1.5 * Math.sin(Math.PI * Math.min(1, k * 1.1)); }      // heel up behind, swinging through
    else { const k = (ph - 0.35) / 0.65; hip = 0.3 + 0.12 * Math.sin(Math.PI * Math.min(1, k * 1.4)) - 0.25 * ss((k - 0.6) / 0.4); knee = 0.08 * (1 - k); }   // out front on the heel, then back under
    r.aim('uLeg' + side, sx * 0.08, -Math.cos(hip), Math.sin(hip)); r.aim('lLeg' + side, sx * 0.06, -Math.cos(hip - knee), Math.sin(hip - knee));
    // the standing leg: a little hop on every beat (the knee sinks as you land, springs as you go up)
    const sink = 0.5 + 0.5 * Math.cos(2 * Math.PI * ph);
    r.aim('uLeg' + other, -sx * 0.07, -1, 0.08 + sink * 0.18); r.aim('lLeg' + other, -sx * 0.05, -1, 0.04 - sink * 0.22);
    const bob = (0.045 * Math.max(0, Math.sin(Math.PI * ph)) - 0.035 - sink * 0.02) * kH;
    // arms: swinging hard from the shoulders against the legs (the arm on the kicking leg's side goes back), elbows
    // bent to ~90°, loose fists, right back past the hips
    const sw = Math.sin(Math.PI * Math.min(1, ph / 0.7)) * sx;      // +: the left arm swings forward
    for (const [S, s] of [['L', 1], ['R', -1]]) {
      const f = -sw * s;            // (opposite to the leg on the same side)
      const u = [s * 0.18, -0.85 + Math.max(0, f) * 0.25, 0.75 * f], l = [s * 0.06, -0.2 + 0.45 * Math.max(0, f), 1 + 0.2 * f];
      const gu = [s * 0.75, 0.05, 0.45], gl = [-s * 0.75, 0.55, 0.25];
      r.aim('uArm' + S, ...mixv(u, gu, g)); r.aim('lArm' + S, ...mixv(l, gl, g));
    }
    // leaning forward over it, the chest twisting with the arms, hips against; head down, nodding on the beat
    P.chest.setFromAxisAngle(X, 0.3 * (1 - g) + 0.05 * g).multiply(_q.setFromAxisAngle(Y, 0.25 * sw * (1 - g)));
    P.pelvis.setFromAxisAngle(Y, -0.14 * sw * (1 - g)).multiply(_q.setFromAxisAngle(X, 0.08 * (1 - g)));
    P.head.setFromAxisAngle(X, (0.18 + 0.1 * sink) * (1 - g) - 0.15 * g).multiply(_q.setFromAxisAngle(Z, 0.06 * sw));
    return { hand: g > 0.5 ? { L: 'goggle', R: 'goggle' } : { L: 'fist', R: 'fist' }, back: g > 0.5 ? { L: [0, 0, 1], R: [0, 0, 1] } : null, bob };
  }

  backflip(t) {
    const r = this.c.rag, P = r.pose, kH = this.kH;
    const crouch = ramp(t, 0.05, 0.42) * (1 - ramp(t, 0.42, 0.56));
    const air = clamp01((t - 0.55) / 0.85), flying = t > 0.55 && t < 1.4;
    const tuck = ramp(t, 0.6, 0.78) * (1 - ramp(t, 1.15, 1.35));
    const land = ramp(t, 1.38, 1.5) * (1 - ramp(t, 1.6, 2.0));
    const cheer = ramp(t, 1.75, 1.95);
    const knee = Math.max(crouch * 1.5, land * 1.1), hip = Math.max(crouch * 0.9, land * 0.7);
    for (const [S, sx] of [['L', 1], ['R', -1]]) {
      const th = hip * (1 - tuck) + tuck * 1.7, kn = knee * (1 - tuck) + tuck * 2.3;
      r.aim('uLeg' + S, sx * (0.06 + tuck * 0.05), -Math.cos(th), Math.sin(th));
      r.aim('lLeg' + S, sx * 0.04, -Math.cos(th - kn), Math.sin(th - kn));
    }
    const up = ramp(t, 0.42, 0.56) * (1 - tuck);
    for (const [S, sx] of [['L', 1], ['R', -1]]) {
      let u = [sx * 0.2, -0.55, -0.8], l = [sx * 0.15, -0.6, -0.75];
      u = mixv(u, [sx * 0.15, 1, 0.15], up); l = mixv(l, [sx * 0.1, 1, 0.1], up);
      u = mixv(u, [sx * 0.25, -0.3, 1], tuck); l = mixv(l, [sx * -0.1, -0.8, 0.5], tuck);
      u = mixv(u, [sx * 1, 0.1, 0.25], land); l = mixv(l, [sx * 1, 0.15, 0.2], land);
      u = mixv(u, [sx * 0.45, 1, 0.1], cheer); l = mixv(l, [sx * 0.35, 1, 0], cheer);
      r.aim('uArm' + S, ...u); r.aim('lArm' + S, ...l);
    }
    P.chest.setFromAxisAngle(X, crouch * 0.45 + tuck * 0.5 + land * 0.25 - cheer * 0.08);
    P.head.setFromAxisAngle(X, tuck * 0.45 - up * 0.25 - cheer * 0.2);
    const bob = (flying ? 0.95 * kH * 4 * air * (1 - air) : 0) - crouch * 0.28 * kH - land * 0.2 * kH + tuck * 0.25 * kH * (flying ? 1 : 0);
    const flip = flying ? -Math.PI * 2 * ss((t - 0.58) / 0.78) : 0;
    this.at(t, 0.5, 'whoosh', () => this.say('', null, 'whoosh'));
    return { hand: tuck > 0.5 ? { L: 'fist', R: 'fist' } : cheer > 0.5 ? { L: 'open', R: 'open' } : null, bob, flip, full: true };
  }

  // SIX SEVEN: "six" on the right hand, "seven" on the left
  sixseven(t) {
    const r = this.c.rag, P = r.pose, kH = this.kH;
    const f = 2.3, s = Math.sin(2 * Math.PI * f * (t - 0.2)), go = ramp(t, 0.05, 0.3);
    r.aim('uArmL', 0.24, -1, 0.12); r.aim('lArmL', 0.1, (0.05 - 0.62 * s) * go, 1);
    r.aim('uArmR', -0.24, -1, 0.12); r.aim('lArmR', -0.1, (0.05 + 0.62 * s) * go, 1);
    P.chest.setFromAxisAngle(Z, -0.07 * s).multiply(_q.setFromAxisAngle(X, -0.04)).multiply(_q.setFromAxisAngle(Y, -0.05 * s));
    P.pelvis.setFromAxisAngle(Z, 0.035 * s);
    P.head.setFromAxisAngle(X, 0.1 * Math.abs(s) - 0.04).multiply(_q.setFromAxisAngle(Z, 0.13 * s)).multiply(_q.setFromAxisAngle(Y, -0.08 * s));
    const k = Math.abs(s);
    r.aim('uLegL', 0.07, -1, 0.07 * k); r.aim('lLegL', 0.05, -1, -0.12 * k);
    r.aim('uLegR', -0.07, -1, 0.07 * k); r.aim('lLegR', -0.05, -1, -0.12 * k);
    const beat = Math.floor(f * (t - 0.2) * 2 + 0.5);
    if (t > 0.3 && beat !== this.lastBeat) { this.lastBeat = beat; const six = beat % 2 === 0, S = six ? 'R' : 'L'; this.say(six ? '6' : '7', r.tip('lArm' + S, new THREE.Vector3())); }
    return { hand: { L: 'palm', R: 'palm' }, back: { L: [0, -1, 0], R: [0, -1, 0] }, bob: -0.02 * k * kH };
  }

  // ================================================================ CHARACTER EMOTES
  // ---- shared poses
  standArms(S, sx, u, l) { this.c.rag.aim('uArm' + S, sx * u[0], u[1], u[2]); this.c.rag.aim('lArm' + S, sx * l[0], l[1], l[2]); }
  legsStand(spread = 0.08, bend = 0) { const r = this.c.rag; r.aim('uLegL', spread, -1, bend * 0.5); r.aim('lLegL', spread * 0.7, -1, -bend * 0.5); r.aim('uLegR', -spread, -1, bend * 0.5); r.aim('lLegR', -spread * 0.7, -1, -bend * 0.5); }
  walkLegs(t, rate = 1.6, amp = 0.38) { const r = this.c.rag, s = Math.sin(t * rate * Math.PI * 2);
    r.aim('uLegL', 0.07, -1, amp * s); r.aim('lLegL', 0.05, -1, amp * s - Math.max(0, -s) * 0.5); r.aim('uLegR', -0.07, -1, -amp * s); r.aim('lLegR', -0.05, -1, -amp * s - Math.max(0, s) * 0.5); return s; }
  // lying flat on the back (k: 0 standing .. 1 down)
  lieBack(k) { return { flip: -Math.PI / 2 * k, bob: -0.78 * this.kH * k, flipNoBlend: false }; }

  // ---- ETHAN: playing FIFA, losing, the controller goes flying
  fifa(t) {
    const r = this.c.rag, P = r.pose, kH = this.kH;
    const rage = ramp(t, 2.9, 3.1), thrown = t > 3.15;
    const shake = Math.sin(t * 38) * 0.04 * (1 - rage);
    // both hands on the pad in front of his belly (elbows tucked in), thumbs going; then the right arm hurls it
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.2, -0.85, 0.42], [-0.22 + shake, 0.2, 1]);
    if (rage > 0) { this.standArms('R', -1, mixv([0.2, -0.85, 0.42], [0.3, 0.9, -0.2], rage), mixv([-0.22, 0.2, 1], [0.1, 0.8, 0.7], rage)); }
    this.legsStand(0.1, 0.15);
    P.chest.setFromAxisAngle(X, 0.25 - rage * 0.3); P.head.setFromAxisAngle(X, 0.35 - rage * 0.5).multiply(_q.setFromAxisAngle(Z, Math.sin(t * 9) * 0.05));
    const pad = this.prop('pad', () => { const g = new THREE.Group(); const m = lam(0x1a1a1e);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.035, 0.07), m); g.add(body);
      for (const x of [-0.06, 0.06]) { const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.04, 4, 8), m); grip.position.set(x, -0.005, -0.04); grip.rotation.x = 1.2; g.add(grip); }
      for (const [x, c] of [[0.04, 0x3fc0ff], [0.055, 0xff4040], [0.025, 0x40ff60], [0.04, 0xffd000]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), lam(c)); b.position.set(x + (c === 0xffd000 ? 0 : 0), 0.02, c === 0xffd000 ? -0.012 : c === 0x40ff60 ? 0.012 : 0); g.add(b); }
      const lb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.01), lam(0x3060ff, { emissive: 0x2040ff })); lb.position.set(0, 0.019, 0.03); g.add(lb); return g; });
    if (!thrown) { r.grip('lArmL', _v); r.grip('lArmR', _v2); pad.position.copy(_v).add(_v2).multiplyScalar(0.5).add({ x: 0, y: 0.015, z: 0 }); pad.rotation.set(0, r.yaw, 0); pad.rotateX(0.75); pad.scale.setScalar(this.kH * Math.max(1, _v.distanceTo(_v2) / 0.15)); pad.userData.v = null; this.padHands = true; }
    else { if (!pad.userData.v) { pad.userData.v = this.L(0, 0, 0).sub(this.L(0, 0, -1)).multiplyScalar(3.5).add({ x: 0, y: 3.5, z: 0 }); }
      const v = pad.userData.v; v.y -= 9.8 * 0.016; pad.position.addScaledVector(v, 0.016); pad.rotation.x += 0.4; pad.rotation.z += 0.25; if (pad.position.y < 0.03) { pad.position.y = 0.03; v.y = Math.abs(v.y) * 0.35; v.x *= 0.6; v.z *= 0.6; } }
    this.at(t, 1.0, 'a', () => this.say('COME ON!!')); this.at(t, 2.2, 'b', () => this.say('THAT\'S NEVER OFFSIDE!')); this.at(t, 3.0, 'c', () => this.say('THIS GAME IS RIGGED!', null, 'smash'));
    return { hand: thrown ? { L: 'grip', R: 'open' } : { L: 'grip', R: 'grip' }, bob: -0.02 * kH };
  }
  // ---- ETHAN: a can of Pepsi Max, down in one, crushed and lobbed onto the pile of cans next to him
  pepsi(t) {
    const r = this.c.rag, P = r.pose;
    const drink = ramp(t, 0.5, 1.0) * (1 - ramp(t, 2.6, 2.9)), throwK = ramp(t, 2.9, 3.3);
    this.standArms('R', -1, mixv(mixv([0.2, -1, 0.1], DRINK_U, drink), [0.3, 0.9, -0.3], throwK), mixv(mixv([0.1, -1, 0.2], DRINK_L, drink), [0.1, 0.8, 0.6], throwK));
    this.standArms('L', 1, [0.25, -1, 0.05], [0.25, -1, 0.15]); this.legsStand();
    P.head.setFromAxisAngle(X, -0.55 * drink); P.chest.setFromAxisAngle(X, -0.12 * drink);
    const pile = this.prop('pile', () => { const g = new THREE.Group(); const geo = new THREE.CylinderGeometry(0.033, 0.033, 0.12, 12); const mats = [lam(0x101820), lam(0x1a3fa8), lam(0x0a0a0a)];
      let i = 0; for (let row = 0; row < 5; row++) for (let k = 0; k < 6 - row; k++) { const m = new THREE.Mesh(geo, mats[i++ % 3]); m.position.set((k - (5 - row) / 2) * 0.07, 0.06 + row * 0.12, (Math.sin(i * 7) * 0.04)); m.rotation.z = Math.sin(i * 3) * 0.08; g.add(m); }
      for (let k = 0; k < 9; k++) { const m = new THREE.Mesh(geo, mats[k % 3]); m.rotation.z = Math.PI / 2; m.rotation.y = k; m.position.set(Math.sin(k * 2.3) * 0.28, 0.035, Math.cos(k * 2.3) * 0.18); g.add(m); }
      return g; });
    this.L(0.75, 0, 0.2, pile.position); pile.rotation.y = r.yaw; pile.scale.setScalar(this.kH * ramp(t, 0, 0.4));
    const can = this.prop('can', () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 14), lam(0x101820))); const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0335, 0.0335, 0.04, 14), lam(0x1a3fa8)); g.add(band); return g; });
    if (t < 3.25) { this.inHand(can, 'R', [0, 0, 0], [Math.PI / 2, 0, 0]); can.scale.set(1, t > 2.6 ? 0.45 : 1, 1); can.userData.v = null; }
    else { if (!can.userData.v) { const to = this.L(0.75, 0.75, 0.2); can.userData.v = to.sub(can.position).multiplyScalar(1.4).add({ x: 0, y: 2.2, z: 0 }); }
      const v = can.userData.v, top = this.L(0.75, 0.68, 0.2).y; v.y -= 9.8 * 0.016; can.position.addScaledVector(v, 0.016); can.rotation.x += 0.3; if (can.position.y < top && v.y < 0) { v.set(0, 0, 0); can.position.y = top; } }
    this.at(t, 1.0, 'g', () => this.say('', null, 'slurp')); this.at(t, 2.65, 'c', () => this.say('*CRUNCH*', null, 'crunch')); this.at(t, 3.9, 'p', () => this.say('THAT\'S 4,000, LADS', null, 'clink'));
    return { hand: { L: 'open', R: 'grip' } };
  }

  // ---- BEN: the new hairline (fresh from Turkey), shown off
  hairline(t) {
    // head pushed forward and tipped down to show it off, one finger pointing right at the new hairline, the other
    // hand running back through his hair (front to back, again and again)
    const r = this.c.rag, P = r.pose, up = ramp(t, 0.15, 0.6), brush = ((t - 0.6) % 1.1) / 1.1, br = t > 0.6 ? brush : 0;
    this.standArms('R', -1, mixv([0.2, -1, 0.05], [-0.3, -0.3, 0.9], up), mixv([0.2, -1, 0.1], [-0.2, 0.92, -0.2], up));           // elbow out front, finger up at the hairline
    const bu = mixv([0.55, 0.55, 0.45], [0.45, 0.85, -0.2], ss(br)), bl = mixv([-0.55, 0.45, 0.4], [-0.5, -0.05, -0.75], ss(br));      // brushing back over the top
    this.standArms('L', 1, mixv([0.25, -1, 0.05], bu, up), mixv([0.2, -1, 0.1], bl, up));
    this.legsStand(0.1, 0.1);
    P.chest.setFromAxisAngle(X, 0.22 * up); P.head.setFromAxisAngle(X, 0.35 * up).multiply(_q.setFromAxisAngle(Y, Math.sin(t * 1.4) * 0.25 * up));
    const hair = this.prop('hair', () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), lam(0x3a2414)); return m; });
    const head = this.c.headPos(new THREE.Vector3()); r.partQuat('head', hair.quaternion);
    hair.position.copy(head).add(_v.set(0, 0.06 * this.kH, 0.018 * this.kH).applyQuaternion(hair.quaternion)); hair.scale.setScalar(this.kH * 1.06 * ramp(t, 0.8, 1.6)); hair.scale.y *= 0.62;
    this.at(t, 0.9, 'a', () => this.say('LOOK AT THAT. LOOK.', null, 'ting')); this.at(t, 2.3, 'b', () => this.say('✨ 4,000 GRAFTS ✨', null, 'ting')); this.at(t, 3.6, 'c', () => this.say('FRESH FROM TURKEY, BOYS'));
    return { hand: { R: 'point', L: 'open' }, back: { L: [0, 1, 0] } };
  }
  // ---- BEN: old age: hunched over a walking stick, hand on his bad back, shuffling
  oldman(t) {
    const r = this.c.rag, P = r.pose, s = Math.sin(t * 1.1 * Math.PI * 2);
    r.aim('uLegL', 0.07, -1, 0.15 + 0.12 * s); r.aim('lLegL', 0.05, -1, -0.05 + 0.12 * s); r.aim('uLegR', -0.07, -1, 0.15 - 0.12 * s); r.aim('lLegR', -0.05, -1, -0.05 - 0.12 * s);
    this.standArms('R', -1, [0.25, -0.8, 0.55], [0.1, -1, 0.35]);
    this.standArms('L', 1, [0.4, -0.6, -0.6], [-0.6, 0.1, -0.6]);       // hand round on the small of his back
    P.chest.setFromAxisAngle(X, 0.55 + Math.abs(s) * 0.05); P.pelvis.setFromAxisAngle(X, 0.15); P.head.setFromAxisAngle(X, -0.35).multiply(_q.setFromAxisAngle(Z, s * 0.05));
    const stick = this.prop('stick', () => { const g = new THREE.Group(); const m = lam(0x5a3a1a); const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 8), m); shaft.position.y = -0.45; g.add(shaft);
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), m); hook.position.set(0.05, 0, 0); g.add(hook); const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.03, 8), lam(0x111111)); tip.position.y = -0.9; g.add(tip); return g; });
    r.grip('lArmR', stick.position); stick.rotation.set(0.12, r.yaw, 0); stick.scale.setScalar(Math.max(0.6, stick.position.y / 0.9));
    this.at(t, 0.6, 'a', () => this.say('OOOH, ME BACK...')); this.at(t, 2.8, 'b', () => this.say('IN MY DAY THIS WAS ALL FIELDS'));
    return { hand: { L: 'open', R: 'grip' }, bob: -0.05 * this.kH };
  }

  // ---- TOMMY: his ball, out of the front of his trousers, thrown up twice and caught, then put back
  ball(t) {
    // 0.2 hand down the front of his trousers... 0.6-1.7 a struggle (tugging, leaning back, wincing)... POP, it's out;
    // thrown up and caught twice (watching it the whole way), then tucked back where it came from
    const r = this.c.rag, P = r.pose, kH = this.kH;
    const reach = ramp(t, 0.2, 0.55), tug = t > 0.6 && t < 1.7 ? Math.abs(Math.sin((t - 0.6) * 11)) : 0, popped = t > 1.7, back = ramp(t, 5.0, 5.35);
    const out = popped && t < 5.35, toss = [[2.3, 3.3], [3.6, 4.6]], inAir = toss.find(([a, b]) => t > a && t < b);
    const throwArm = toss.some(([a]) => t > a - 0.25 && t < a + 0.1) ? 1 : 0, show = out && !back ? ramp(t, 1.7, 2.0) : 0;
    let u = mixv([0.2, -1, 0.1], [0.05, -0.9, 0.35], Math.max(reach * (1 - show), back)), l = mixv([0.1, -1, 0.2], [-0.5, -0.6, 0.5 + tug * 0.12], Math.max(reach * (1 - show), back));
    u = mixv(u, [0.25, -0.3, 0.9], show); l = mixv(l, [0.0, 0.25 + throwArm * 0.5, 1], show);
    this.standArms('R', -1, u, l);
    this.standArms('L', 1, tug ? [0.35, -0.7, 0.3] : [0.25, -1, 0.05], tug ? [0.5, -0.2, 0.5] : [0.2, -1, 0.1]);         // (the other hand out for balance while he tugs)
    this.legsStand(0.12 + tug * 0.04, tug * 0.5);
    P.chest.setFromAxisAngle(X, 0.12 * reach - 0.18 * tug).multiply(_q.setFromAxisAngle(Z, Math.sin(t * 13) * 0.05 * (tug ? 1 : 0)));
    P.head.setFromAxisAngle(X, (inAir ? -0.6 : 0.35 * (1 - show)) - 0.2 * tug).multiply(_q.setFromAxisAngle(Z, tug * 0.15));
    const b = this.prop('ball', () => hairyBall(0.045));
    b.visible = out; b.scale.setScalar(kH * (1 + Math.sin(t * 8) * 0.14 + Math.sin(t * 13.7) * 0.04));       // (pulsing)
    if (inAir) { const [a, z] = inAir, k = (t - a) / (z - a); r.grip('lArmR', b.position); b.position.y += 4 * k * (1 - k) * 0.9 * kH; b.rotation.x += 0.2; }
    else r.grip('lArmR', b.position);
    this.at(t, 0.7, 'n', () => this.say('NNNGH...', null, 'thud')); this.at(t, 1.2, 'o', () => this.say('IT\'S STUCK...')); this.at(t, 1.7, 'p', () => this.say('POP!', null, 'pop'));
    this.at(t, 2.0, 'a', () => this.say('THE FINAL BALL.')); this.at(t, 2.3, 'b', () => this.say('', null, 'whoosh')); this.at(t, 3.6, 'c', () => this.say('', null, 'whoosh'));
    return { hand: { L: tug ? 'grip' : 'open', R: out || (reach > 0.5 && !popped) ? 'grip' : 'open' }, bob: (-0.01 - 0.03 * tug) * kH };
  }

  // ---- TOMMY'S ATTACK: the final ball out of the front of his trousers, wound up and thrown (the flight is in tommy.js)
  ballthrow(t) {
    const r = this.c.rag, P = r.pose, reach = ramp(t, 0.1, 0.45) * (1 - ramp(t, 0.6, 0.8)), wind = ramp(t, 0.75, 1.1) * (1 - ramp(t, 1.2, 1.3)), fling = ramp(t, 1.2, 1.32) * (1 - ramp(t, 1.7, 2.0));
    let u = mixv([0.2, -1, 0.1], [0.05, -0.9, 0.35], reach), l = mixv([0.1, -1, 0.2], [-0.5, -0.6, 0.5], reach);
    u = mixv(u, [0.45, 0.8, -0.4], wind); l = mixv(l, [0.2, 0.9, -0.5], wind);
    u = mixv(u, [0.1, 0.1, 1], fling); l = mixv(l, [0.05, 0, 1], fling);
    this.standArms('R', -1, u, l); this.standArms('L', 1, mixv([0.25, -1, 0.05], [0.4, 0.2, 0.8], wind), [0.2, -0.6, 0.6]);
    r.aim('uLegL', 0.1, -1, 0.25 * wind); r.aim('lLegL', 0.08, -1, 0.1); r.aim('uLegR', -0.1, -1, -0.15 * wind); r.aim('lLegR', -0.08, -1, -0.1);
    P.chest.setFromAxisAngle(X, 0.15 * reach - 0.15 * wind + 0.25 * fling).multiply(_q.setFromAxisAngle(Y, -0.35 * wind + 0.3 * fling));
    const b = this.prop('ball', () => hairyBall(0.045));
    b.visible = t > 0.55 && t < 1.25; r.grip('lArmR', b.position); b.scale.setScalar(this.kH * (1 + Math.sin(t * 14) * 0.15));
    return { hand: { L: 'open', R: b.visible ? 'grip' : 'open' } };
  }

  // ================================================================ MORE CHARACTER EMOTES
  // ---- ETHAN: smells a pasty from three postcodes away: nose up, sniffing, turning to find it
  sniff(t) { const r = this.c.rag, P = r.pose, sn = Math.abs(Math.sin(t * 16)) * ramp(t, 0.2, 0.5), look = Math.sin(t * 1.3) * 0.7;
    this.standArms('L', 1, [0.25, -1, 0.1], [0.2, -0.9, 0.3]); this.standArms('R', -1, [0.35, -0.55, 0.7], [-0.4, 0.6, 0.6]); this.legsStand(0.1);
    P.chest.setFromAxisAngle(X, -0.12 + sn * 0.04).multiply(_q.setFromAxisAngle(Y, look * 0.4)); P.head.setFromAxisAngle(X, -0.35 + sn * 0.08).multiply(_q.setFromAxisAngle(Y, look));
    this.at(t, 0.5, 'a', () => this.say('*SNIFF SNIFF*')); this.at(t, 2.2, 'b', () => this.say('...PASTY. THREE POSTCODES THAT WAY.')); this.at(t, 3.3, 'c', () => this.say('', null, 'slurp'));
    return { hand: { R: 'point', L: 'open' }, spin: look * 0.3 }; }
  // ---- BEN: arms out like a plane, banking round: off to Turkey
  turkey(t) { const r = this.c.rag, P = r.pose, bank = Math.sin(t * 2.2) * 0.35, up = ramp(t, 0.1, 0.5);
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv([0.2, -1, 0.05], [1, 0.05 + bank * sx, -0.05], up), mixv([0.2, -1, 0.1], [1, 0.05 + bank * sx, -0.05], up));
    const s2 = this.walkLegs(t, 1.8, 0.3); P.chest.setFromAxisAngle(Z, -bank * 0.6).multiply(_q.setFromAxisAngle(X, 0.2)); P.head.setFromAxisAngle(Z, -bank * 0.4);
    this.at(t, 0.4, 'a', () => this.say('✈️ NEXT STOP: ISTANBUL', null, 'jet')); this.at(t, 2.6, 'b', () => this.say('BRING YOUR PASSPORT, RON'));
    return { hand: { L: 'open', R: 'open' }, back: { L: [0, 1, 0], R: [0, 1, 0] }, spin: Math.sin(t * 1.1) * 0.8, bob: Math.abs(s2) * 0.02 * this.kH }; }
  // ---- TOMMY: one day older than you: a finger up, smug, tapping his chest
  older(t) { const r = this.c.rag, P = r.pose, tap = Math.max(0, Math.sin(t * 6)) * ramp(t, 1.8, 2.0);
    this.standArms('R', -1, [0.15, -0.2, 0.95], [0.05, 0.95, 0.25]); this.standArms('L', 1, [0.25, -0.8, 0.5], [-0.7, 0.3, 0.3 - tap * 0.2]); this.legsStand(0.12);
    P.chest.setFromAxisAngle(X, -0.1); P.head.setFromAxisAngle(X, -0.25).multiply(_q.setFromAxisAngle(Z, 0.15));
    this.at(t, 0.4, 'a', () => this.say('ONE. WHOLE. DAY.')); this.at(t, 2.0, 'b', () => this.say('RESPECT YOUR ELDERS, RONNIE.'));
    return { hand: { R: 'point', L: 'open' }, back: { R: [0, 0, 1] } }; }
  // ---- LEWIS: leg day: squats with an imaginary bar across his shoulders
  legday(t) {
    // a loaded barbell across his shoulders (big plates on each end), squatting deep, counting his reps
    const r = this.c.rag, P = r.pose, sq = (1 - Math.cos(Math.max(0, t - 0.4) * 3.2)) / 2 * ramp(t, 0.3, 0.6), kH = this.kH;
    for (const [S, sx] of [['L', 1], ['R', -1]]) { this.standArms(S, sx, [0.72, -0.62, -0.3], [0.2, 0.72, -0.62]); r.aim('uLeg' + S, sx * 0.2, -Math.cos(sq * 1.35), Math.sin(sq * 1.35)); r.aim('lLeg' + S, sx * 0.15, -1, -sq * 0.45); }
    P.chest.setFromAxisAngle(X, sq * 0.45); P.head.setFromAxisAngle(X, -0.3 * sq);
    const bar = this.prop('barbell', () => { const g = new THREE.Group(), steel = lam(0xb8bcc2), plate = lam(0x1a1a1a);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.8, 10), steel); b.rotation.z = Math.PI / 2; g.add(b);
      for (const sx of [-1, 1]) for (const [x, rad] of [[0.62, 0.22], [0.67, 0.22], [0.72, 0.16]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.04, 22), x === 0.72 ? lam(0xc62828) : plate); p.rotation.z = Math.PI / 2; p.position.x = sx * x; g.add(p); }
      for (const sx of [-1, 1]) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 10), steel); col.rotation.z = Math.PI / 2; col.position.x = sx * 0.55; g.add(col); } return g; });
    // the bar lives in his hands: centred between the two grips, pointing from one hand to the other
    const gL = r.grip('lArmL', new THREE.Vector3()), gR = r.grip('lArmR', new THREE.Vector3()); bar.position.copy(gL).add(gR).multiplyScalar(0.5);
    bar.quaternion.setFromUnitVectors(X, gL.sub(gR).normalize()); bar.scale.setScalar(kH);
    const n = Math.floor(Math.max(0, t - 0.4) * 3.2 / (Math.PI * 2) + 0.5); if (n > 0 && n !== this.lastBeat) { this.lastBeat = n; this.say(`${n}...`, null, 'thud'); }
    this.at(t, 4.2, 'z', () => this.say('LEG DAY, RON. EVERY DAY.'));
    return { hand: { L: 'grip', R: 'grip' }, back: { L: [0, 0, -1], R: [0, 0, -1] }, bob: -sq * 0.42 * kH };
  }
  // ---- CHLOE: tossing a salad in a big bowl (for Ronnie, obviously)
  salad(t) { const r = this.c.rag, P = r.pose, tossT = Math.sin(t * 7), up = ramp(t, 0.2, 0.5);
    this.standArms('L', 1, [0.3, -0.8, 0.55], [-0.4, -0.1, 0.9]); this.standArms('R', -1, [0.3, -0.7, 0.6], [-0.4, 0.1 + tossT * 0.3, 0.9]); this.legsStand(0.1);
    P.head.setFromAxisAngle(X, 0.35);
    const bowl = this.prop('bowl', () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lam(0xf4f0e6, { side: THREE.DoubleSide })); g.add(b);
      for (let i = 0; i < 18; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), lam(i % 4 ? 0x6abf3a : 0xd8352a)); l.scale.set(1, 0.35, 1); l.position.set(Math.sin(i * 2.4) * 0.07, -0.03 + (i % 3) * 0.015, Math.cos(i * 2.4) * 0.07); l.name = 'leaf' + i; g.add(l); } return g; });
    this.L(0, 1.0, 0.38, bowl.position); bowl.rotation.y = r.yaw; bowl.scale.setScalar(this.kH * up);
    for (let i = 0; i < 18; i++) { const l = bowl.getObjectByName('leaf' + i); l.position.y = -0.03 + (i % 3) * 0.015 + Math.max(0, Math.sin(t * 7 + i)) * 0.06; }
    this.at(t, 0.6, 'a', () => this.say('🥗 FRESH SALAD, RONNIE!')); this.at(t, 2.6, 'b', () => this.say('NO CROUTONS. NO DRESSING. NO FUN.'));
    return { hand: { L: 'grip', R: 'grip' } }; }
  // ---- AIDAN W: growing his beard out: stroking his chin as it sprouts, then grows, and GROWS, right down to his
  // belly, bushy and wide; then hands on hips, admiring it
  beard(t) {
    const r = this.c.rag, P = r.pose, kH = this.kH, grow = ss(ramp(t, 0.5, 4.3)), proud = ramp(t, 4.4, 4.8);
    const g = grow + Math.max(0, Math.sin(t * 9)) * 0.03 * (grow > 0 && grow < 1 ? 1 : 0);   // (in little spurts)
    // right hand at the chin, running down the beard (further down the longer it gets); then fists on hips, chest out
    const stroke = (1 - Math.cos(t * 4)) / 2, down = stroke * (0.25 + g * 0.75) * (1 - proud);
    const hipU = [0.7, -0.5, -0.3], hipL = [-0.5, -0.65, 0.2];
    this.standArms('R', -1, mixv(mixv(DRINK_U, [0.15, -0.9, 0.35], down), hipU, proud), mixv(mixv(DRINK_L, [-0.6, 0.4, 0.68], down), hipL, proud));
    this.standArms('L', 1, mixv([0.3, -0.85, 0.25], hipU, proud), mixv([0.1, -0.7, 0.5], hipL, proud)); this.legsStand(0.12 + proud * 0.06);
    P.chest.setFromAxisAngle(X, -0.12 * proud); P.head.setFromAxisAngle(X, 0.12 * (1 - proud) - 0.3 * proud + Math.sin(t * 2) * 0.04).multiply(_q.setFromAxisAngle(Y, Math.sin(t * 1.3) * 0.25 * proud));
    const bd = this.prop('beard', () => { const grp = new THREE.Group(), cols = [0x7a4426, 0x925630, 0x6a3a1e, 0xa8683a].map(c => lam(c));
      // stubble round the jaw and the moustache
      const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 22, 12, 0, Math.PI, Math.PI * 0.55, Math.PI * 0.35), cols[0]); jaw.scale.set(1.02, 1, 1.1); jaw.position.set(0, 0.07, -0.06); jaw.name = 'jaw'; grp.add(jaw);
      for (const sx of [-1, 1]) { const tache = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.06, 6), cols[1]); tache.rotation.z = sx * (Math.PI / 2 + 0.35); tache.position.set(sx * 0.025, 0.04, 0.045); grp.add(tache); }
      // the long beard: a tapered core with dozens of hair strands hanging off it (unit length, scaled as it grows)
      const hang = new THREE.Group(); hang.name = 'hang'; grp.add(hang);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.012, 1, 14, 1, false, -Math.PI / 2, Math.PI), cols[0]); core.position.set(0, -0.5, 0.0); hang.add(core);
      for (let i = 0; i < 70; i++) { const a = (i / 70) * Math.PI - Math.PI / 2 + Math.sin(i * 7.1) * 0.08, ring = (i % 3) / 3, L = 0.7 + ((i * 37) % 30) / 100 - Math.abs(Math.sin(a)) * 0.25;
        const st = new THREE.Mesh(new THREE.ConeGeometry(0.018 + (i % 4) * 0.004, L, 5), cols[i % 4]); st.rotation.x = Math.PI;
        const rr = 0.07 - ring * 0.02; st.position.set(Math.sin(a) * rr, -L / 2, Math.cos(a) * rr * 0.8 + 0.01); st.rotation.z = -Math.sin(a) * 0.08; hang.add(st); }
      return grp; });
    // under his chin, following his head
    const head = this.c.headPos(new THREE.Vector3()); r.partQuat('head', bd.quaternion); bd.position.copy(head).add(_v.set(0, -0.135 * kH, 0.03 * kH).applyQuaternion(bd.quaternion)); bd.scale.setScalar(kH);
    const hang = bd.getObjectByName('hang'), len = 0.03 + g * 0.72, wid = 0.8 + g * 1.5;
    hang.scale.set(wid, len, 0.8 + g * 0.5); hang.rotation.x = -0.12 * g + Math.sin(t * 2.2) * 0.05 * g;
    bd.getObjectByName('jaw').scale.set(1.02 + g * 0.25, 1 + g * 0.3, 1.1 + g * 0.3);
    this.at(t, 0.3, 'a', () => this.say('*strokes chin*')); this.at(t, 1.2, 'b', () => this.say('NO-SHAVE NOVEMBER...', null, 'boing')); this.at(t, 2.3, 'c', () => this.say('...DECEMBER...', null, 'boing'));
    this.at(t, 3.3, 'd', () => this.say('...THE WHOLE YEAR', null, 'boing')); this.at(t, 4.6, 'e', () => this.say('🧔 BEHOLD. THE BEARD.', null, 'jet'));
    return { hand: { L: proud > 0.5 ? 'fist' : 'open', R: proud > 0.5 ? 'fist' : 'open' } };
  }
  // ---- AIDAN O: let it settle: pint held up to the light, watching it, then a slow proper sip
  settle(t) { const r = this.c.rag, P = r.pose, up = ramp(t, 0.2, 0.6) * (1 - ramp(t, 3.0, 3.3)), sip = ramp(t, 3.2, 3.5) * (1 - ramp(t, 4.3, 4.6));
    this.standArms('R', -1, mixv(mixv([0.2, -1, 0.1], [0.3, 0.1, 0.95], up), DRINK_U, sip), mixv(mixv([0.1, -1, 0.2], [0.1, 0.6, 0.8], up), DRINK_L, sip));
    this.standArms('L', 1, [0.25, -1, 0.05], [0.2, -1, 0.1]); this.legsStand(0.1);
    P.head.setFromAxisAngle(X, -0.15 * up - 0.4 * sip);
    const pint = this.prop('pint', () => { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.15, 14), lam(0x140a06)); g.add(body); const head = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.04, 0.025, 14), lam(0xf4ead0)); head.position.y = 0.085; g.add(head); return g; });
    this.inHand(pint, 'R', [0, 0.01, 0], [Math.PI / 2 - 0.9 * sip, 0, 0]);
    const k = Math.min(1, t / 2.6); pint.children[0].material.color.setRGB(0.42 - 0.34 * k, 0.28 - 0.24 * k, 0.16 - 0.14 * k);      // (it settles from tan to black)
    this.at(t, 0.6, 'a', () => this.say('⏳ LET IT SETTLE...')); this.at(t, 2.0, 'b', () => this.say('...nearly...')); this.at(t, 3.4, 'c', () => this.say('PERFECT.', null, 'gulp'));
    return { hand: { L: 'open', R: 'grip' } }; }
  // ---- IAN: flipping burgers on the barbecue with his spatula
  flip(t) {
    // at his barbecue: the grill in front of him, coals glowing, a burger sizzling; the spatula slides under it and
    // flips it (up, a full turn over, back down on the grill), again and again
    const r = this.c.rag, P = r.pose, kH = this.kH, F = 1.4, ph = (t % F) / F, n = Math.floor(t / F);
    const scoop = ph < 0.3 ? ss(ph / 0.3) : ph < 0.55 ? 1 : 1 - ss((ph - 0.55) / 0.3), lift = ph > 0.3 && ph < 0.55 ? Math.sin((ph - 0.3) / 0.25 * Math.PI) : 0;
    this.standArms('R', -1, [0.3, -0.55, 0.8], [-0.1, -0.5 + lift * 0.9 + scoop * 0.2, 0.95]); this.standArms('L', 1, [0.35, -0.85, 0.3], [0.2, -0.7, 0.6]); this.legsStand(0.14);
    P.chest.setFromAxisAngle(X, 0.3); P.head.setFromAxisAngle(X, 0.45);
    const bbq = this.prop('bbq', () => { const g = new THREE.Group(), blk = lam(0x1c1c1c);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.4), blk); body.position.y = 0.76; g.add(body);
      for (const [x, z] of [[-0.27, -0.16], [0.27, -0.16], [-0.27, 0.16], [0.27, 0.16]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), blk); l.position.set(x, 0.35, z); g.add(l); }
      const coals = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.02, 0.34), lam(0xff4a10, { emissive: 0xc02800 })); coals.position.y = 0.8; g.add(coals);
      for (let i = -6; i <= 6; i++) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.38, 4), lam(0x888888)); bar.rotation.x = Math.PI / 2; bar.position.set(i * 0.045, 0.845, 0); g.add(bar); }
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.3), lam(0x6a4426)); shelf.position.set(0.42, 0.8, 0); g.add(shelf);
      const pat = new THREE.Group(); pat.name = 'patty'; const meat = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 18), lam(0x5a2a14)); pat.add(meat);
      const marks = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.004, 18), lam(0x2a1206)); marks.position.y = 0.01; pat.add(marks); pat.position.set(-0.05, 0.86, 0.02); g.add(pat); return g; });
    this.L(0.05, 0, 0.62, bbq.position); bbq.rotation.y = r.yaw; bbq.scale.setScalar(kH);
    const pat = bbq.getObjectByName('patty'); pat.position.y = 0.86 + lift * 0.22; pat.rotation.x = n * Math.PI + (ph > 0.3 && ph < 0.55 ? (ph - 0.3) / 0.25 * Math.PI : ph >= 0.55 ? Math.PI : 0);
    const sp = this.prop('spatula', () => { const g = new THREE.Group(); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.25, 6), lam(0x3a2414)); h.position.y = 0.12; g.add(h); const b = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.005, 0.11), lam(0xb0b4b8)); b.position.set(0, 0.26, 0.04); g.add(b); return g; });
    // the spatula from his hand to the burger
    const hand = r.grip('lArmR', new THREE.Vector3()), pw = new THREE.Vector3(); pat.getWorldPosition(pw); sp.position.copy(hand); sp.quaternion.setFromUnitVectors(Y, pw.clone().sub(hand).normalize()); sp.scale.setScalar(Math.min(1.4, hand.distanceTo(pw) / 0.28));
    if (ph > 0.3 && Math.floor((t - 1 / 60) / F) === n && ((t - 1 / 60) % F) / F <= 0.3) this.say(['FLIP!', 'SIZZLE!', 'HEALTHY? NEVER.', 'PERFECT!'][n % 4], null, n % 2 ? 'sizzle' : 'whoosh');
    if (Math.random() < 0.02) this.say('', null, 'sizzle');
    return { hand: { R: 'grip', L: 'open' } };
  }
  // ---- HARRY: swiping left on his phone, again and again
  swipe(t) {
    // swiping RIGHT on every single one: YES, yes, YES (the phone flashes green every time)
    const r = this.c.rag, P = r.pose, sw = ((t * 1.6) % 1), sx2 = sw < 0.5 ? sw * 2 : 1;
    this.standArms('L', 1, [0.25, -0.5, 0.8], [-0.3, 0.2, 0.95]); this.standArms('R', -1, [0.35, -0.55, 0.7], [0.32 - sx2 * 0.38, 0.3, 0.9]); this.legsStand(0.1);
    P.head.setFromAxisAngle(X, 0.45);
    const ph = this.prop('phone', () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.01), lam(0x111111))); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.14), new THREE.MeshBasicMaterial({ color: 0xff3a6a })); sc.position.z = 0.006; sc.name = 'screen'; g.add(sc); return g; });
    this.inHand(ph, 'L', [0, 0.03, 0], [-1.2, 0, 0]); ph.getObjectByName('screen').material.color.setHex(sw > 0.45 && sw < 0.75 ? 0x2ed47a : 0xff3a6a);
    const n = Math.floor(t * 1.6); if (n !== this.lastBeat && t > 0.3) { this.lastBeat = n; this.say(['YES! 💚', 'YES.', 'OBVIOUSLY YES', 'IT\'S A MATCH!', 'YES YES YES'][n % 5], null, 'ting'); }
    return { hand: { L: 'grip', R: 'point' } };
  }
  // ---- HARRY'S VAN: a white van screeches up beside him, the back doors fly open, he loads his five kids in one at
  // a time (they hop in), slams the doors and the van drives off
  van(t) {
    const r = this.c.rag, P = r.pose, kH = this.kH, arrive = ramp(t, 0, 1.6), doors = ramp(t, 1.7, 2.1) * (1 - ramp(t, 7.0, 7.3)), leave = ramp(t, 7.4, 9.0);
    const wave = Math.sin(t * 7);
    this.standArms('R', -1, [0.5, 0.1, 0.4], [0.3, 0.9 , 0.2 + wave * 0.3]); this.standArms('L', 1, [0.45, -0.5, 0.5], [0.4, -0.2, 0.8]); this.legsStand(0.12);
    P.head.setFromAxisAngle(Y, 0.6);
    const van = this.prop('van', vanMesh);
    // the van comes in from behind him, pulls up alongside (back doors next to him), then drives away forwards
    const side = 2.0, along = (-12 * (1 - ss(arrive))) + 14 * leave * leave;
    this.L(side, 0, along + 1.6, van.position); van.rotation.y = r.yaw; van.scale.setScalar(1);
    for (const w of van.userData.wheels) w.rotation.x += ((arrive < 1 ? 1 - arrive : 0) * 0.6 + leave * 0.8);
    const blink = arrive >= 1 && leave === 0 && Math.sin(t * 9) > 0; for (const m of van.userData.hazards) m.visible = blink;
    for (const sx of [-1, 1]) van.getObjectByName('door' + sx).rotation.y = sx * -doors * 1.9;
    // the five kids: they come out from behind Harry, run to the back of the van and hop in, one by one
    const cols = [0xff6fa8, 0x3fa3ff, 0x7cff6a, 0xffd400, 0xff7a1a], hair = [0x6a3a1a, 0xe8c070, 0x1a1210, 0xa0522d, 0x3a2416];
    const backDoor = this.L(side, 0, -1.05 + along), inVan = this.L(side, 0, -0.2 + along);
    for (let i = 0; i < 5; i++) {
      const k = this.prop('kid' + i, () => kidMesh(cols[i], hair[i], i % 2 === 0)), start = 2.2 + i * 0.85, kt = clamp01((t - start) / 0.8);
      const from = this.L(-0.6 + i * 0.3, 0, -0.8 - (i % 2) * 0.3), to = backDoor.clone();
      const hop = clamp01((kt - 0.7) / 0.3); k.visible = t < start + 0.85;
      k.position.copy(from).lerp(to, ss(Math.min(1, kt / 0.7))).lerp(inVan, hop); k.position.y = hop > 0 ? Math.sin(hop * Math.PI) * 0.25 + hop * 0.42 : Math.abs(Math.sin(t * 9)) * 0.03 * (kt > 0 ? 1 : 0);
      k.rotation.y = kt > 0 ? Math.atan2(to.x - from.x, to.z - from.z) : r.yaw; k.scale.setScalar(0.85 + (i % 3) * 0.08); walkKid(k, t * 9 + i);
      this.at(t, start + 0.8, 'k' + i, () => this.say(`${i + 1}...`, null, 'boing'));
    }
    this.at(t, 1.5, 'a', () => this.say('🚐 SCREEECH', null, 'whistle')); this.at(t, 1.8, 'b', () => this.say('IN YOU GET, KIDS!')); this.at(t, 7.0, 'c', () => this.say('*SLAM*', null, 'thud')); this.at(t, 7.5, 'd', () => this.say('SEE YOU LADS!', null, 'jet'));
    return { hand: { L: 'open', R: 'open' } };
  }

  // ---- ALFIE: the nutmeg: a ball at his feet, step-overs, then through the legs
  nutmeg(t) { const r = this.c.rag, P = r.pose, kH = this.kH, st = Math.sin(t * 7), go = t > 2.8;
    r.aim('uLegL', 0.12 + Math.max(0, st) * 0.2, -1, 0.15 + Math.max(0, st) * 0.3); r.aim('lLegL', 0.1, -1, 0.05); r.aim('uLegR', -0.12 - Math.max(0, -st) * 0.2, -1, 0.15 + Math.max(0, -st) * 0.3); r.aim('lLegR', -0.1, -1, 0.05);
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.45, -0.7, 0.1], [0.4, -0.6, 0.2]);
    P.chest.setFromAxisAngle(X, 0.3).multiply(_q.setFromAxisAngle(Y, st * 0.25)); P.head.setFromAxisAngle(X, 0.45);
    const ball = this.prop('fball', () => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true })); return m; });
    if (!go) { this.L(st * 0.1, 0.11, 0.35, ball.position); ball.rotation.z = st; } else { const k = Math.min(1, (t - 2.8) / 0.6); this.L(0, 0.11, 0.35 - k * 1.4, ball.position); ball.rotation.x -= 0.4; }
    ball.scale.setScalar(kH);
    this.at(t, 0.5, 'a', () => this.say('STEP-OVER... STEP-OVER...')); this.at(t, 2.9, 'b', () => this.say('🌀 NUTMEG!', null, 'whoosh')); this.at(t, 3.6, 'c', () => this.say('OLÉ!'));
    return { hand: { L: 'open', R: 'open' }, bob: Math.abs(st) * 0.02 * kH }; }
  // ---- CONNOR: an Irish jig: arms dead straight down, feet flying
  jig(t) { const r = this.c.rag, P = r.pose, kH = this.kH, b = t * 7, s1 = Math.sin(b), s2 = Math.sin(b * 2);
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.05, -1, 0], [0.04, -1, 0.02]);
    const kick = (ph) => Math.max(0, Math.sin(ph)); r.aim('uLegL', 0.08, -1, 0.5 * kick(b)); r.aim('lLegL', 0.06, -1, 0.5 * kick(b) - kick(b + 1) * 0.9);
    r.aim('uLegR', -0.08, -1, 0.5 * kick(b + Math.PI)); r.aim('lLegR', -0.06, -1, 0.5 * kick(b + Math.PI) - kick(b + Math.PI + 1) * 0.9);
    P.chest.setFromAxisAngle(X, -0.05); P.head.setFromAxisAngle(X, -0.1);
    const beat = Math.floor(b / Math.PI); if (beat !== this.lastBeat && t > 0.3) { this.lastBeat = beat; if (beat % 2) this.say('', null, 'thud'); }
    this.at(t, 0.5, 'a', () => this.say('☘️ DIDDLY-AYE!')); this.at(t, 3.0, 'b', () => this.say('UP THE REDS!'));
    return { hand: { L: 'fist', R: 'fist' }, bob: Math.abs(s2) * 0.05 * kH }; }

  // ---- LEWIS: SIUUU: a run, a jump with a half-turn in the air, landing legs wide, arms flung down and out
  siu(t) {
    const r = this.c.rag, P = r.pose, kH = this.kH;
    const run = t < 0.8, jump = t >= 0.8 && t < 1.45, land = ramp(t, 1.4, 1.55);
    let bob = 0, spin = 0;
    if (run) { const s = this.walkLegs(t, 2.6, 0.55); for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.15, -0.7, -0.6 * s * sx], [0.1, -0.2, 1]); P.chest.setFromAxisAngle(X, 0.25); }
    else {
      const k = clamp01((t - 0.8) / 0.65); bob = jump ? 4 * k * (1 - k) * 0.55 * kH : 0; spin = Math.PI * ss(k);
      for (const [S, sx] of [['L', 1], ['R', -1]]) {
        r.aim('uLeg' + S, sx * (0.12 + land * 0.32), -1, jump ? 0.3 : 0); r.aim('lLeg' + S, sx * (0.1 + land * 0.3), -1, jump ? -0.3 : 0);
        this.standArms(S, sx, mixv([0.3, 0.9, 0.1], [0.7, -0.65, 0.05], land), mixv([0.2, 0.95, 0], [0.7, -0.7, 0.05], land));
      }
      P.chest.setFromAxisAngle(X, -0.2 * land); P.head.setFromAxisAngle(X, -0.3 * land);
      bob -= land * 0.1 * kH;
    }
    this.at(t, 1.42, 's', () => this.say('SIUUUUU!', null, 'siu'));
    return { hand: { L: 'open', R: 'open' }, back: land > 0.5 ? { L: [0, 0, -1], R: [0, 0, -1] } : null, bob, spin };
  }
  // ---- LEWIS: too tall: grows tall and lanky, head through the ceiling
  tall(t) {
    const r = this.c.rag, P = r.pose, g = ramp(t, 0.3, 1.6) * (1 - ramp(t, 4.0, 4.7)), wob = Math.sin(t * 3) * 0.06 * g;
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.18 + wob, -1, 0.05], [0.12, -1, 0.1 + wob]);
    this.legsStand(0.06); P.head.setFromAxisAngle(X, 0.2 * g).multiply(_q.setFromAxisAngle(Z, wob * 2));
    this.at(t, 1.7, 'a', () => this.say('MIND YOUR HEAD, LEWY!', null, 'thud')); this.at(t, 3.0, 'b', () => this.say('IS IT COLD UP HERE?'));
    return { hand: { L: 'open', R: 'open' }, stretch: [1 + 1.6 * g, 1 - 0.3 * g] };
  }

  // ---- CHLOE: "UCL ears": her ears grow and grow (like the Champions League trophy's handles)
  ears(t) {
    const r = this.c.rag, P = r.pose, g = ramp(t, 0.5, 3.0) * (1 - ramp(t, 4.2, 4.8)), flap = Math.sin(t * 6) * 0.12 * g;
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.55, -0.1, 0.2], [0.1, 0.95, 0.1]);
    this.legsStand(0.1); P.head.setFromAxisAngle(Z, Math.sin(t * 2) * 0.12);
    const head = this.c.headPos(new THREE.Vector3()), hq = r.partQuat('head', new THREE.Quaternion());
    for (const [k, sx] of [['earL', 1], ['earR', -1]]) {
      const e = this.prop(k, () => earMesh(sx));
      // from her own ears' size, growing out from the side of her head (the root stays where an ear joins the head),
      // standing out sideways with the inside of the ear turned forwards, flapping a little as they get huge
      const grow = 1 + 5.5 * g, sc = this.kH * grow, out = 0.4 + 0.5 * g + flap, yq = _q2.setFromAxisAngle(Y, r.yaw);
      e.position.copy(head).add(_v.set(sx * (0.075 + 0.036 * (grow - 1) * Math.cos(out)), 0.004 + 0.012 * (grow - 1), -0.015 - 0.006 * (grow - 1)).multiplyScalar(this.kH).applyQuaternion(yq));
      e.quaternion.copy(yq).multiply(_q.setFromAxisAngle(Y, -sx * out)); e.scale.setScalar(sc);
    }
    this.at(t, 1.2, 'a', () => this.say('🏆 UCL EARS 🏆', null, 'trumpet'));
    return { hand: { L: 'open', R: 'open' } };
  }
  // ---- CHLOE: her strange little victory dance
  chloedance(t) {
    const r = this.c.rag, P = r.pose, s = Math.sin(t * 7), c2 = Math.cos(t * 3.5);
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.5, 0.2 + 0.4 * s * sx, 0.3], [0.2, 0.9, 0.3 + 0.3 * c2]);
    r.aim('uLegL', 0.1, -1, 0.2 * s); r.aim('lLegL', 0.08, -1, -0.1 * Math.max(0, s)); r.aim('uLegR', -0.1, -1, -0.2 * s); r.aim('lLegR', -0.08, -1, -0.1 * Math.max(0, -s));
    P.pelvis.setFromAxisAngle(Z, 0.12 * s); P.chest.setFromAxisAngle(Z, -0.1 * s); P.head.setFromAxisAngle(Z, 0.15 * c2);
    this.at(t, 0.6, 'a', () => this.say('WINNER WINNER!'));
    return { hand: { L: 'open', R: 'open' }, bob: Math.abs(s) * 0.03 * this.kH, spin: Math.sin(t * 1.4) * 0.6 };
  }

  // ---- AIDAN W: the knee goes: hopping, then down on his back clutching it
  knee(t) {
    const r = this.c.rag, P = r.pose, down = ramp(t, 1.4, 1.9), rock = Math.sin(t * 5) * 0.08 * down;
    const hop = t < 1.4 ? Math.abs(Math.sin(t * 9)) * 0.06 * this.kH : 0;
    // the bad knee pulled up, both hands round it
    r.aim('uLegR', -0.1, -0.2 + 0.2 * down, 0.95); r.aim('lLegR', -0.05, -1, 0.3);
    r.aim('uLegL', 0.08, -1, 0.05 + down * 0.4); r.aim('lLegL', 0.06, -1, down * 0.2);
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.15, -0.6, 0.75], [-0.3, -0.5, 0.6]);
    P.chest.setFromAxisAngle(X, 0.35 + rock); P.head.setFromAxisAngle(X, 0.3);
    this.at(t, 0.3, 'a', () => this.say('ARGH! THE KNEE!')); this.at(t, 1.6, 'b', () => this.say('', null, 'thud')); this.at(t, 2.4, 'c', () => this.say('IT\'S GONE AGAIN, LADS', null, 'sadviolin'));
    const lie = this.lieBack(down);
    return { hand: { L: 'grip', R: 'grip' }, bob: hop + lie.bob, flip: lie.flip + rock, full: true };
  }

  // ---- AIDAN O: Guinness dream: three pints, one after another, then straight down flat on his back
  guinness(t) {
    const r = this.c.rag, P = r.pose;
    const cyc = [[0.4, 1.4], [1.6, 2.6], [2.8, 3.8]], cur = cyc.find(([a, b]) => t > a - 0.2 && t < b + 0.1), k = cur ? ss((t - cur[0]) / 0.3) * (1 - ss((t - cur[1] + 0.2) / 0.3)) : 0;
    const fall = ramp(t, 4.0, 4.5);
    // the drinking arm: elbow up and out in front, forearm bent right back so the glass is at his lips, tipped up
    this.standArms('R', -1, mixv([0.2, -1, 0.1], DRINK_U, k), mixv([0.1, -1, 0.2], DRINK_L, k));
    this.standArms('L', 1, mixv([0.25, -1, 0.05], [1, 0.1, 0.1], fall), mixv([0.2, -1, 0.1], [1, 0.1, 0.1], fall)); if (fall > 0.5) this.standArms('R', -1, [1, 0.1, 0.1], [1, 0.1, 0.1]);
    this.legsStand(0.1 + fall * 0.1); P.head.setFromAxisAngle(X, -0.6 * k + Math.sin(t * 6) * 0.05 * ramp(t, 3, 4)); P.chest.setFromAxisAngle(X, -0.15 * k);
    const pint = this.prop('pint', () => { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.15, 14), lam(0x140a06)); g.add(body); const head = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.04, 0.025, 14), lam(0xf4ead0)); head.position.y = 0.085; head.name = 'head'; g.add(head); return g; });
    pint.visible = fall < 0.3; this.inHand(pint, 'R', [0, 0.01, 0], [Math.PI / 2 - 0.9 * k, 0, 0]);
    const lvl = cur ? 1 - clamp01((t - cur[0] - 0.3) / (cur[1] - cur[0] - 0.4)) : 1; pint.children[0].scale.y = Math.max(0.05, lvl); pint.children[0].position.y = -0.075 * (1 - lvl); pint.children[1].visible = lvl > 0.1;
    for (const [i, [a]] of cyc.entries()) this.at(t, a + 0.4, 'g' + i, () => this.say(['ONE...', 'TWO...', 'THREE!'][i], null, 'gulp'));
    this.at(t, 4.3, 'f', () => this.say('*HIC*', null, 'thud'));
    const lie = this.lieBack(fall);
    return { hand: { L: 'open', R: fall > 0.3 ? 'open' : 'grip' }, bob: lie.bob, flip: lie.flip, full: true };
  }

  // ---- DYLAN: the ACL goes, cartoon style: a wobble, the knee swells up like a balloon, BANG, the bottom half of the
  // leg pings off (spinning, bouncing across the floor, a sock and trainer still on it), a stump with a little red cap
  // and a few red cartoon splats, stars round his head, and he topples over clutching what's left
  acl(t) {
    const r = this.c.rag, P = r.pose, kH = this.kH, kick = ramp(t, 0.2, 0.6) * (1 - ramp(t, 0.7, 0.9)), swell = ramp(t, 0.6, 1.25), off = t >= 1.25, down = ramp(t, 1.9, 2.4);
    const wob = t > 0.6 && !off ? Math.sin(t * 40) * 0.08 * swell : 0;
    r.aim('uLegR', -0.08, -Math.cos(kick * 1.2) , Math.sin(kick * 1.2) + wob); r.aim('lLegR', -0.06, -Math.cos(kick * 1.1), Math.sin(kick * 1.1));
    r.aim('uLegL', 0.08, -1, down * 0.5); r.aim('lLegL', 0.06, -1, down * 0.3);
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv(off ? [0.9, 0.5, 0.2] : [0.6, 0.1, 0.1], [0.15, -0.6, 0.75], down), mixv(off ? [0.6, 0.9, 0.1] : [0.6, 0.2, 0.1], [-0.3, -0.5, 0.6], down));
    P.chest.setFromAxisAngle(X, 0.2 * down - (off && !down ? 0.15 : 0)); P.head.setFromAxisAngle(X, 0.3 * down - (off && down < 0.5 ? 0.3 : 0));
    if (!r.partHide) r.partHide = {}; r.partHide.lLegR = off; if (!this.undo || !this.undo.length) this.onStop(() => { if (r.partHide) r.partHide.lLegR = false; });
    const knee = r.tip('uLegR', new THREE.Vector3());
    // the swelling knee: a balloon of skin growing at the joint
    const bal = this.prop('balloon', () => new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), lam(0xe8b08c, { emissive: 0x401810 })));
    bal.visible = t > 0.6 && !off; bal.position.copy(knee); bal.scale.setScalar(kH * (0.8 + swell * 1.6 + Math.sin(t * 30) * 0.05 * swell));
    // the leg that comes off
    const leg = this.prop('leg', () => { const g = new THREE.Group(); const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.3, 6, 12), lam(0xe0a882)); shin.position.y = -0.17; g.add(shin);
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.045, 0.1, 12), lam(0xf5f5f5)); sock.position.y = -0.33; g.add(sock);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.25), lam(0xf5f5f5)); shoe.position.set(0, -0.4, 0.06); g.add(shoe); const sole = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.02, 0.26), lam(0x888888)); sole.position.set(0, -0.44, 0.06); g.add(sole);
      const cap = new THREE.Mesh(new THREE.CircleGeometry(0.046, 16), lam(0xd81b2a, { side: THREE.DoubleSide })); cap.rotation.x = -Math.PI / 2; cap.position.y = 0.01; g.add(cap); g.visible = false; return g; });
    if (off) { if (!leg.visible) { leg.visible = true; leg.position.copy(knee); leg.rotation.set(0, r.yaw, 0); const out = this.L(-0.6, 0, 0.3).sub(this.L(0, 0, 0)); leg.userData.v = out.multiplyScalar(2.2).add(new THREE.Vector3(0, 3.2, 0)); leg.userData.w = 9; }
      const v = leg.userData.v; v.y -= 9.8 / 60; leg.position.addScaledVector(v, 1 / 60); leg.rotation.x += leg.userData.w / 60; leg.rotation.z += leg.userData.w * 0.4 / 60;
      if (leg.position.y < 0.12 * kH) { leg.position.y = 0.12 * kH; v.y = Math.abs(v.y) * 0.45; v.x *= 0.7; v.z *= 0.7; leg.userData.w *= 0.6; } leg.scale.setScalar(kH); }
    // the stump: a cartoon red cap (and a bone end) on the knee
    const stump = this.prop('stump', () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam(0xd81b2a))); const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.04, 8), lam(0xfff4e0)); bone.position.y = -0.02; g.add(bone); g.rotation.x = Math.PI; return g; });
    stump.visible = off; stump.position.copy(knee); stump.scale.setScalar(kH);
    // the bang: red and white cartoon splats and stars flying out of the knee
    const bits = this.prop('bits', () => { const g = new THREE.Group(); for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(i % 3 ? new THREE.SphereGeometry(0.018, 6, 4) : new THREE.OctahedronGeometry(0.022), lam(i % 3 ? 0xd81b2a : i % 2 ? 0xffd400 : 0xffffff, { emissive: 0x330000 })); m.userData.v = new THREE.Vector3(Math.sin(i * 2.4) * 1.8, 1.2 + (i % 5) * 0.5, Math.cos(i * 2.4) * 1.8); g.add(m); } g.visible = false; return g; });
    if (off) { if (!bits.visible) { bits.visible = true; bits.position.copy(knee); for (const m of bits.children) m.position.set(0, 0, 0); }
      for (const m of bits.children) { m.userData.v.y -= 9.8 / 60; m.position.addScaledVector(m.userData.v, 1 / 60); if (m.position.y + bits.position.y < 0.01) { m.position.y = 0.01 - bits.position.y; m.userData.v.set(0, 0, 0); m.scale.set(1.8, 0.2, 1.8); } } }
    this.at(t, 0.65, 'w', () => this.say('UH OH...', null, 'boing')); this.at(t, 1.25, 'p', () => this.say('💥 BANG! 💥', null, 'pop')); this.at(t, 1.3, 'q', () => this.say('', null, 'smash'));
    this.at(t, 1.8, 'r', () => this.say('...THAT\'S NOT MEANT TO DO THAT', null, 'boing')); this.at(t, 2.8, 's', () => this.say('ACL: GONE. LEG: ALSO GONE.', null, 'sadviolin'));
    const lie = this.lieBack(down);
    return { hand: { L: down > 0.5 ? 'grip' : 'open', R: down > 0.5 ? 'grip' : 'open' }, bob: (off && down < 0.1 ? Math.abs(Math.sin(t * 9)) * 0.06 * kH : 0) + lie.bob, flip: lie.flip, full: true };
  }
  // ---- DYLAN: Wonderwall, Liam style: hands clasped behind his back, leaning in, head tipped up into the mic on its stand
  airguitar(t) {
    const r = this.c.rag, P = r.pose, kH = this.kH, sway = Math.sin(t * 2.1) * 0.05, belt = Math.abs(Math.sin(t * 3.5));
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.18, -0.85, -0.45], [-0.75, -0.2, -0.55]);           // hands behind his back
    r.aim('uLegL', 0.13, -1, 0.04); r.aim('lLegL', 0.1, -1, 0); r.aim('uLegR', -0.13, -1, -0.02); r.aim('lLegR', -0.1, -1, 0);
    P.pelvis.setFromAxisAngle(X, 0.22); P.chest.setFromAxisAngle(X, 0.58 + sway).multiply(_q.setFromAxisAngle(Z, sway));
    P.head.setFromAxisAngle(X, -0.8 - belt * 0.1).multiply(_q.setFromAxisAngle(Z, -sway * 2));
    const mic = this.prop('mic', () => { const g = new THREE.Group(), m = lam(0x1a1a1a), silver = lam(0xb8bcc2);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.025, 20), m); base.position.y = 0.012; g.add(base);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.38, 8), silver); pole.position.y = 0.7; g.add(pole);
      const clip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.09, 8), m); clip.position.set(0, 1.42, -0.03); clip.rotation.x = 0.9; g.add(clip);
      const mc = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.12, 12), m); mc.position.set(0, 1.45, -0.09); mc.rotation.x = 0.9; g.add(mc);
      const grille = new THREE.Mesh(new THREE.SphereGeometry(0.027, 12, 8), silver); grille.position.set(0, 1.48, -0.13); g.add(grille); return g; });
    // the long navy trench coat: his clothes painted navy, plus the long skirt of the coat hanging from the hips to his
    // shins (follows the pelvis), the collar turned up
    paintRag(this, { uCoat: this.w });
    const coat = this.prop('coat', () => { const g = new THREE.Group(), navy = lam(0x14213d, { side: THREE.DoubleSide }), dark = lam(0x0c1528, { side: THREE.DoubleSide });
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.27, 0.62, 22, 1, true, 0.25, Math.PI * 2 - 0.5), navy); skirt.position.y = -0.33; g.add(skirt);   // (split at the front)
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.018, 6, 22), dark); belt.rotation.x = Math.PI / 2; belt.scale.set(1, 0.75, 1); g.add(belt);
      for (const sx of [-1, 1]) for (const y of [0.12, -0.08]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), dark); b.position.set(sx * 0.06, y - 0.12, 0.2 + y * 0.1); g.add(b); }
      return g; });
    const coll = this.prop('collar', () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.1, 18, 1, true, 0.6, Math.PI * 2 - 1.2), lam(0x14213d, { side: THREE.DoubleSide })); return m; });
    { const b = r.parts.pelvis.body.position; coat.position.set(b.x, b.y, b.z); } r.partQuat('pelvis', coat.quaternion); coat.position.y += 0.08 * kH; coat.scale.set(kH, kH, kH * 0.8); coat.scale.y = kH;
    const nk = this.c.headPos(new THREE.Vector3()); r.partQuat('chest', coll.quaternion); coll.position.copy(nk).add(_v.set(0, -0.13 * kH, -0.01 * kH).applyQuaternion(coll.quaternion)); coll.scale.setScalar(kH);
    this.L(0, 0, 0.4, mic.position); mic.rotation.y = r.yaw + Math.PI; mic.scale.setScalar(kH);
    const LY = ['🎤 TODAY IS GONNA BE THE DAY...', '...THAT THEY\'RE GONNA THROW IT BACK TO YOU 🎶', 'AND AFTER ALL... 🎶', 'YOU\'RE MY WONDERWAAALL 🎶'];
    LY.forEach((l, i) => this.at(t, 0.4 + i * 1.15, 'l' + i, () => this.say(l)));
    return { hand: { L: 'grip', R: 'grip' }, bob: -0.03 * kH };
  }
  // ---- DYLAN: the Oompa Loompa dance: orange all over, bright green hair, the little side-step and knee bob with
  // the arms swinging across, "OOMPA LOOMPA DOOMPETY DOO"
  oompa(t) {
    const r = this.c.rag, P = r.pose, kH = this.kH, ph = t * 3.6, step = Math.sin(ph), bounce = Math.abs(Math.sin(ph)), turn = ramp(t, 0, 0.4);
    // turning orange and the hair dyed bright green: painted onto his own model (a plain tint if there's no model)
    if (!paintRag(this, { uOrange: turn * this.w, uHair: turn * this.w })) { const mat = r.mesh && r.mesh.material; if (mat && mat.color && !this.orange) { const o = this.orange = mat.color.clone(); this.onStop(() => { mat.color.copy(o); this.orange = null; }); }
      if (mat && mat.color) mat.color.copy(this.orange).lerp(new THREE.Color(0xff7a10), 0.9 * turn * this.w); }
    // side to side: step out, close, knees bobbing; arms bent, swinging across the body together
    r.aim('uLegL', 0.12 + Math.max(0, step) * 0.15, -1, 0.15 * bounce); r.aim('lLegL', 0.08, -1, -0.15 * bounce);
    r.aim('uLegR', -0.12 - Math.max(0, -step) * 0.15, -1, 0.15 * bounce); r.aim('lLegR', -0.08, -1, -0.15 * bounce);
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.35, -0.75, 0.35], [-0.35 * step * sx - 0.05, 0.25, 0.9]);
    P.pelvis.setFromAxisAngle(Y, step * 0.25); P.chest.setFromAxisAngle(Z, step * 0.1); P.head.setFromAxisAngle(Z, -step * 0.18).multiply(_q.setFromAxisAngle(X, -0.1));
    const LY = ['🎵 OOMPA LOOMPA', 'DOOMPETY DOO 🎵', 'I\'VE GOT ANOTHER', 'PUZZLE FOR YOU 🎵'];
    LY.forEach((l, i) => this.at(t, 0.5 + i * 0.95, 'o' + i, () => this.say(l, null, i % 2 ? 'boing' : 'pop')));
    return { hand: { L: 'fist', R: 'fist' }, bob: (-0.05 * bounce) * kH, spin: Math.sin(t * 1.8) * 0.5 };
  }

  // ---- IAN: shouting abuse (all of it bleeped)
  abuse(t) {
    const r = this.c.rag, P = r.pose, jab = Math.max(0, Math.sin(t * 7)), shake = Math.sin(t * 22) * 0.06;
    this.standArms('R', -1, [0.25, -0.1 + jab * 0.2, 0.9], [0.05, 0.1 + shake, 1]);
    this.standArms('L', 1, [0.3, -0.7, 0.3], [0.2, -0.2, 0.8]);
    this.legsStand(0.12, 0.1); P.chest.setFromAxisAngle(X, 0.3 + jab * 0.1); P.head.setFromAxisAngle(X, -0.15 + jab * 0.15).multiply(_q.setFromAxisAngle(Z, shake));
    const L = ['#@%&*!', 'YOU ABSOLUTE ****!', '[BLEEP] [BLEEP]!', '%$#@ OFF!', 'REF! ARE YOU ****ING BLIND?!'];
    for (let i = 0; i < 5; i++) this.at(t, 0.3 + i * 0.8, 'w' + i, () => this.say(L[i], null, i % 2 ? 'whistle' : 'thwack'));
    return { hand: { L: 'fist', R: 'fist' } };
  }
  // ---- IAN: casting the rod out
  cast(t) {
    // the rod held up in front, swung back over his shoulder, then whipped forward: the line flies out in an arc to
    // the float bobbing far out in front, a wait... and nothing
    const r = this.c.rag, P = r.pose, kH = this.kH, back = ramp(t, 0.3, 0.9) * (1 - ramp(t, 1.0, 1.15)), out = ramp(t, 1.0, 1.2);
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv(mixv([0.15, -0.5, 0.75], [0.2, 0.75, 0.2], back), [0.15, -0.3, 0.9], out), mixv(mixv([-0.25, -0.1, 0.95], [-0.1, 0.9, -0.3], back), [-0.15, 0.15, 0.98], out));
    this.legsStand(0.14, 0.1); P.chest.setFromAxisAngle(X, -0.15 * back + 0.1 * out);
    const rod = this.prop('rod', () => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.012, 1.6, 6), lam(0x2a2a2a)); m.position.y = 0.8; g.add(m); const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), lam(0x888888)); reel.rotation.z = Math.PI / 2; reel.position.y = 0.12; g.add(reel); return g; });
    // which way the rod points: up and a little forward at rest, right back over his shoulder, then out at 40°
    const rest = new THREE.Vector3(0, 0.75, 0.66), up = new THREE.Vector3(0, 0.7, -0.7), cast = new THREE.Vector3(0, 0.62, 0.78);
    const d = rest.clone().lerp(up, back).lerp(cast, out).normalize().applyAxisAngle(Y, r.yaw);
    r.grip('lArmR', rod.position); rod.quaternion.setFromUnitVectors(Y, d); rod.scale.setScalar(kH);
    const tip = rod.position.clone().addScaledVector(d, 1.6 * kH);
    const line = this.prop('line', () => new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 16 }, () => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: 0xeeeeee })));
    const flo = this.prop('float', () => { const g = new THREE.Group(); const a = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), lam(0xff3a3a)); g.add(a); const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lam(0xffffff)); g.add(b2); return g; });
    const fly = clamp01((t - 1.05) / 0.7), far = this.L(0, 0.02, 0.5 + 4.5 * fly); far.y = 0.02 + (fly < 1 ? Math.sin(fly * Math.PI) * 1.4 : Math.sin(t * 3) * 0.01);
    flo.visible = t > 1.05; flo.position.copy(t > 1.05 ? far : tip); flo.scale.setScalar(kH);
    const pts = []; for (let i = 0; i < 16; i++) { const k = i / 15, p = tip.clone().lerp(t > 1.05 ? far : tip.clone().add({ x: 0, y: -0.3, z: 0 }), k); p.y -= Math.sin(k * Math.PI) * 0.25 * (t > 1.05 ? 1 : 0.3); pts.push(p); }
    line.geometry.setFromPoints(pts);
    this.at(t, 1.0, 'c', () => this.say('', null, 'whoosh')); this.at(t, 1.8, 'p', () => this.say('*PLOP*', null, 'pop')); this.at(t, 3.0, 'q', () => this.say('...NOTHING. AGAIN.'));
    return { hand: { L: 'grip', R: 'grip' } };
  }
  // ---- OLIVER: "my honest reaction": feet together, hands crossed in front, head tipped forward. Dead still.
  honest(t) {
    // feet together, hands crossed in front, head tipped forward... nodding slowly up and down
    const r = this.c.rag, P = r.pose, nod = Math.sin(t * 4.2) * 0.22 * ramp(t, 0.4, 0.8);
    r.aim('uLegL', 0.02, -1, 0); r.aim('lLegL', 0.015, -1, 0); r.aim('uLegR', -0.02, -1, 0); r.aim('lLegR', -0.015, -1, 0);
    this.standArms('L', 1, [0.12, -1, 0.32], [-0.45, -0.8, 0.35]); this.standArms('R', -1, [0.12, -1, 0.3], [-0.5, -0.8, 0.38]);
    P.head.setFromAxisAngle(X, 0.3 + nod); P.chest.setFromAxisAngle(X, 0.04 + nod * 0.1);
    this.at(t, 0.5, 'a', () => this.say('MY HONEST REACTION'));
    return { hand: { L: 'open', R: 'open' } };
  }
  // ---- OLIVER: going live: phone out at arm's length, selfie, flash
  live(t) {
    const r = this.c.rag, P = r.pose;
    this.standArms('R', -1, [0.25, 0.25, 0.9], [0.1, 0.35, 0.95]); this.standArms('L', 1, [0.3, -0.8, 0.3], [0.5 + Math.sin(t * 6) * 0.2, 0.3, 0.6]);
    this.legsStand(0.1); P.head.setFromAxisAngle(X, -0.1).multiply(_q.setFromAxisAngle(Z, Math.sin(t * 2) * 0.15));
    const ph = this.prop('phone', () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.01), lam(0x111111))); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.14), new THREE.MeshBasicMaterial({ color: 0xff3a6a })); scr.position.z = -0.006; scr.rotation.y = Math.PI; g.add(scr);
      const fl = new THREE.PointLight(0xffffff, 0, 3); fl.name = 'flash'; g.add(fl); return g; });
    this.inHand(ph, 'R', [0, 0.03, 0]); ph.lookAt(this.c.headPos(_v)); ph.getObjectByName('flash').intensity = (t > 2.0 && t < 2.15) || (t > 3.0 && t < 3.15) ? 8 : 0;
    this.at(t, 0.5, 'a', () => this.say('🔴 LIVE')); this.at(t, 2.0, 'b', () => this.say('📸', null, 'shutter')); this.at(t, 3.0, 'c', () => this.say('📸 GONE VIRAL', null, 'shutter'));
    return { hand: { L: 'open', R: 'grip' } };
  }

  // ---- NOAH: belly bounce: down onto the belly, BOING, and back up on his feet
  bellybounce(t) {
    const r = this.c.rag, P = r.pose, kH = this.kH;
    const dive = ramp(t, 0.3, 0.9), up = ramp(t, 2.6, 3.3), k = dive * (1 - up);
    const b1 = pulse(t, 1.3, 0.18), b2 = pulse(t, 1.9, 0.15) * 0.6;
    for (const [S, sx] of [['L', 1], ['R', -1]]) { this.standArms(S, sx, mixv([0.2, -1, 0.05], [0.6, 0.1, 0.6], k), mixv([0.2, -1, 0.1], [0.6, 0.2, 0.7], k)); r.aim('uLeg' + S, sx * 0.1, -1, -0.1 * k); r.aim('lLeg' + S, sx * 0.08, -1, -0.3 * k); }
    P.head.setFromAxisAngle(X, -0.6 * k);
    this.at(t, 1.25, 'a', () => this.say('BOING!', null, 'boing')); this.at(t, 1.85, 'b', () => this.say('boing', null, 'boing')); this.at(t, 3.2, 'c', () => this.say('TA-DAA!', null, 'ting'));
    return { hand: { L: 'open', R: 'open' }, flip: Math.PI / 2 * k, bob: (-0.72 * k + (b1 * 0.35 + b2 * 0.25)) * kH, full: true };
  }
  // ---- NOAH: a rugby conversion: ball down, steps back, kicks it through the posts
  conversion(t) {
    const r = this.c.rag, P = r.pose, kH = this.kH;
    const run = t > 0.9 && t < 1.6, kick = ramp(t, 1.5, 1.75) * (1 - ramp(t, 2.0, 2.4)), cheer = ramp(t, 2.6, 2.9);
    if (run) this.walkLegs(t, 2.4, 0.4);
    else { r.aim('uLegR', -0.08, -Math.cos(kick * 1.4), Math.sin(kick * 1.4)); r.aim('lLegR', -0.06, -Math.cos(kick * 1.2), Math.sin(kick * 1.2)); r.aim('uLegL', 0.08, -1, 0); r.aim('lLegL', 0.06, -1, 0); }
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv([0.5, -0.4, 0.2], [0.35, 1, 0.1], cheer), mixv([0.4, -0.5, 0.3], [0.25, 1, 0], cheer));
    P.chest.setFromAxisAngle(X, 0.2 * (1 - cheer)); P.head.setFromAxisAngle(X, 0.4 * (1 - cheer) - 0.3 * cheer);
    const ball = this.prop('rugby', () => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), lam(0xf4f0e6)); m.scale.set(0.62, 0.62, 1); g.add(m); const st = new THREE.Mesh(new THREE.TorusGeometry(0.063, 0.006, 6, 20), lam(0x1f4fbf)); st.position.z = 0.05; g.add(st); const st2 = st.clone(); st2.position.z = -0.05; g.add(st2); return g; });
    if (t < 1.72) { this.L(0, 0.08, 0.55, ball.position); ball.rotation.set(-1.2, r.yaw, 0); ball.userData.v = null; }
    else { if (!ball.userData.v) ball.userData.v = this.L(0, 0, 1).sub(this.L(0, 0, 0)).multiplyScalar(6).add({ x: 0, y: 6, z: 0 }); const v = ball.userData.v; v.y -= 9.8 * 0.016; ball.position.addScaledVector(v, 0.016); ball.rotation.x += 0.35; }
    this.at(t, 1.72, 'k', () => this.say('', null, 'thwack')); this.at(t, 2.6, 'c', () => this.say('🏉 OVER THE BAR! CONVERSION!', null, 'whistle'));
    return { hand: { L: 'open', R: 'open' }, bob: run ? Math.abs(Math.sin(t * 15)) * 0.03 * kH : 0 };
  }

  // ---- HARRY: on a date: hand in hand with his little one, walking, hearts floating up between them
  date(t) {
    const r = this.c.rag, P = r.pose, kH = this.kH, s = this.walkLegs(t, 1.4, 0.32);
    this.standArms('L', 1, [0.45, -0.95, 0.05], [0.4, -0.95, 0.1]); this.standArms('R', -1, [0.15, -1, 0.25 * s], [0.1, -1, 0.3 + 0.2 * s]);
    P.head.setFromAxisAngle(Y, 0.6).multiply(_q.setFromAxisAngle(X, 0.35)); P.chest.setFromAxisAngle(Y, 0.08);
    const kid = this.prop('kid', () => kidMesh(0xff6fa8, 0x6a3a1a, true));
    this.L(0.62, 0, 0.05, kid.position); kid.rotation.y = r.yaw; kid.scale.setScalar(kH);
    walkKid(kid, t * 1.4 * Math.PI * 2); kid.position.y = Math.abs(s) * 0.02;
    for (let i = 0; i < 4; i++) { const h = this.prop('heart' + i, () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex(), transparent: true, depthWrite: false })); return sp; });
      const k = ((t * 0.5 + i / 4) % 1); this.L(0.3 + Math.sin(t * 2 + i) * 0.08, 1.0 + k * 1.1, 0.1, h.position); h.scale.setScalar(0.16 * (1 - k * 0.5) * kH); h.material.opacity = Math.min(1, (1 - k) * 2); }
    this.at(t, 0.6, 'a', () => this.say('💕 DATE NIGHT 💕')); this.at(t, 3.0, 'b', () => this.say('BEST DATE I\'VE HAD ALL YEAR'));
    return { hand: { L: 'grip', R: 'open' } };
  }
  // ---- HARRY: touchdown: ball up, SPIKED into the floor, then a little dance
  spike(t) {
    const r = this.c.rag, P = r.pose, raise = ramp(t, 0.2, 0.8), slam = ramp(t, 1.1, 1.25), dance = ramp(t, 1.6, 1.8), s = Math.sin(t * 9);
    let u = mixv([0.2, -1, 0.1], [0.3, 1, 0.05], raise), l = mixv([0.1, -1, 0.2], [0.2, 1, 0], raise);
    u = mixv(u, [0.3, -0.8, 0.5], slam); l = mixv(l, [0.2, -0.9, 0.4], slam);
    u = mixv(u, [0.7, 0.3 * s, 0.2], dance); l = mixv(l, [0.1, 0.9, 0.3], dance);
    this.standArms('R', -1, u, l); this.standArms('L', 1, mixv([0.25, -1, 0.05], [0.7, -0.3 * s, 0.2], dance), mixv([0.2, -1, 0.1], [0.1, 0.9, 0.3], dance));
    this.legsStand(0.15, 0.2 * dance * Math.abs(s)); P.chest.setFromAxisAngle(X, 0.3 * slam * (1 - dance)).multiply(_q.setFromAxisAngle(Y, 0.3 * s * dance));
    const ball = this.prop('nfl', () => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), lam(0x7a3a16)); m.scale.set(0.62, 0.62, 1); g.add(m); const lace = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.07), lam(0xffffff)); lace.position.y = 0.056; g.add(lace); return g; });
    if (t < 1.25) { this.inHand(ball, 'R'); ball.userData.v = null; }
    else { if (!ball.userData.v) { ball.userData.v = new THREE.Vector3(Math.sin(r.yaw) * 0.6, -4, Math.cos(r.yaw) * 0.6); }
      const v = ball.userData.v; v.y -= 9.8 * 0.016; ball.position.addScaledVector(v, 0.016); ball.rotation.x += 0.3; ball.rotation.z += 0.17; if (ball.position.y < 0.06) { ball.position.y = 0.06; v.y = Math.abs(v.y) * 0.6; v.x += (Math.random() - 0.5) * 1.5; v.z += (Math.random() - 0.5) * 1.5; } }
    this.at(t, 1.25, 's', () => this.say('🏈 TOUCHDOWN!', null, 'thwack'));
    return { hand: { L: 'open', R: t < 1.25 ? 'grip' : 'open' }, bob: dance * Math.abs(s) * 0.03 * this.kH };
  }

  // ---- ALFIE: "special stuff": a line of SUGAR on a little table, face down along it, gone
  sugar(t) {
    // bent right over the little table, nose down on the line of sugar, sliding along it (it vanishes as he goes),
    // then straight up, wide-eyed
    const r = this.c.rag, P = r.pose, kH = this.kH, bend = ramp(t, 0.5, 1.2) * (1 - ramp(t, 3.3, 3.6)), along = clamp01((t - 1.3) / 1.8), wild = ramp(t, 3.6, 3.8) * (1 - ramp(t, 5.0, 5.5));
    for (const [S, sx] of [['L', 1], ['R', -1]]) { r.aim('uLeg' + S, sx * 0.16, -1, 0.55 * bend); r.aim('lLeg' + S, sx * 0.12, -1, -0.45 * bend); }
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv(mixv([0.25, -1, 0.05], [0.3, -0.45, 0.85], bend), [0.6, 0.6, 0.2], wild), mixv(mixv([0.2, -1, 0.1], [0.05, -0.75, 0.6], bend), [0.5, 0.9, 0], wild));
    P.pelvis.setFromAxisAngle(X, 0.6 * bend);
    P.chest.setFromAxisAngle(X, 1.3 * bend).multiply(_q.setFromAxisAngle(Y, (along - 0.5) * 0.35 * bend)); P.head.setFromAxisAngle(X, 0.45 * bend).multiply(_q.setFromAxisAngle(Y, (along - 0.5) * 0.4 * bend + Math.sin(t * 25) * 0.25 * wild));
    const tbl = this.prop('table', () => { const g = new THREE.Group(); const wood = lam(0x6a4426); const top = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.35), wood); top.position.y = 0.72; g.add(top);
      for (const [x, z] of [[-0.27, -0.14], [0.27, -0.14], [-0.27, 0.14], [0.27, 0.14]]) { const lg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.72, 0.03), wood); lg.position.set(x, 0.36, z); g.add(lg); }
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.006, 0.018), lam(0xffffff, { emissive: 0x666666 })); line.position.set(0, 0.739, 0); line.name = 'line'; g.add(line);
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.05), lam(0x2a7ad8)); bag.position.set(0.24, 0.8, 0.12); g.add(bag);
      const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.03), new THREE.MeshBasicMaterial({ map: labelTex('SUGAR') })); lbl.position.set(0.24, 0.82, 0.146); g.add(lbl); return g; });
    tbl.rotation.y = r.yaw; tbl.scale.setScalar(kH * ramp(t, 0, 0.4));
    // the table sits right under his face (and slides sideways so the line passes under his nose)
    const face = this.c.headPos(new THREE.Vector3()), fwd = _v.set(Math.sin(r.yaw), 0, Math.cos(r.yaw)), side = _v2.set(Math.cos(r.yaw), 0, -Math.sin(r.yaw));
    if (!this.tblAt) this.tblAt = this.L(0, 0, 0.72); const home = this.tblAt;
    // once he's bent over, the table sits right under his face so the nose is down on the line
    const nose = face.clone().addScaledVector(fwd, 0.08 * kH); home.x += (nose.x - home.x) * bend; home.z += (nose.z - home.z) * bend;
    tbl.position.copy(home).addScaledVector(side, (0.5 - along) * 0.4 * kH * (bend > 0.5 ? 1 : 0));
    tbl.scale.y = kH * ramp(t, 0, 0.4) * Math.min(1.15, Math.max(0.55, 1 + ((face.y - 0.1 * kH) / (0.74 * kH) - 1) * bend));
    const line = tbl.getObjectByName('line'); const left = 1 - clamp01(along); line.scale.x = Math.max(0.001, left); line.position.x = -0.2 + 0.2 * left; line.visible = left > 0.01;
    this.at(t, 0.3, 'a', () => this.say('JUST A BIT OF SUGAR, LADS')); this.at(t, 1.4, 'b', () => this.say('', null, 'psst')); this.at(t, 3.7, 'c', () => this.say('⚡ SUGAR RUSH ⚡', null, 'jet'));
    return { hand: { L: 'open', R: 'open' }, bob: -0.26 * bend * kH + Math.abs(Math.sin(t * 20)) * 0.03 * wild * kH };
  }
  // ---- CONNOR: scarf up over his head, You'll Never Walk Alone
  ynwa(t) {
    const r = this.c.rag, P = r.pose, up = ramp(t, 0.2, 0.7), sw = Math.sin(t * 2.2) * 0.15;
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv([0.2, -1, 0.05], [0.5, 0.85, 0.05], up), mixv([0.2, -1, 0.1], [0.35, 0.95, 0], up));
    this.legsStand(0.12); P.chest.setFromAxisAngle(Z, sw); P.head.setFromAxisAngle(X, -0.3 * up);
    const sc = this.prop('scarf', () => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.13, 0.01, 20, 1, 1), new THREE.MeshLambertMaterial({ map: labelTex('YOU\'LL NEVER WALK ALONE', '#c8102e', '#fff'), side: THREE.DoubleSide })); g.add(m); return g; });
    r.grip('lArmL', _v); r.grip('lArmR', _v2); sc.position.copy(_v).add(_v2).multiplyScalar(0.5); sc.rotation.set(0, r.yaw, 0); sc.scale.set(Math.max(0.2, _v.distanceTo(_v2)) * 1.1, this.kH, 1);
    this.at(t, 0.8, 'a', () => this.say('🎶 WALK ON... WALK ON... 🎶')); this.at(t, 2.8, 'b', () => this.say('🎶 YOU\'LL NEVER WALK ALONE! 🎶', null, 'trumpet'));
    return { hand: { L: 'grip', R: 'grip' } };
  }
  // ---- CONNOR: his round: a pint in each hand, cheers
  round(t) {
    const r = this.c.rag, P = r.pose, up = ramp(t, 0.3, 0.8), clink = pulse(t, 1.4, 0.12);
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv([0.2, -1, 0.05], [0.3 - clink * 0.2, 0.2, 0.9], up), mixv([0.2, -1, 0.1], [0.15 - clink * 0.25, 0.6, 0.7], up));
    this.legsStand(0.1); P.head.setFromAxisAngle(X, -0.15 * up);
    for (const S of ['L', 'R']) { const p = this.prop('pint' + S, () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.15, 14), lam(0x140a06))); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.04, 0.025, 14), lam(0xf4ead0)); h.position.y = 0.085; g.add(h); return g; });
      this.inHand(p, S, [0, 0, 0], [Math.PI / 2, 0, 0]); }
    this.at(t, 1.4, 'c', () => this.say('SLÁINTE!', null, 'clink')); this.at(t, 2.6, 'b', () => this.say('MY ROUND, LADS!'));
    return { hand: { L: 'grip', R: 'grip' } };
  }

  // ---- RONNIE: drumming on his own belly
  drum(t) {
    // both hands slapping down on the front of his belly in turn (palms on it), the belly wobbling, BOM BOM
    const r = this.c.rag, P = r.pose, a = Math.max(0, Math.sin(t * 16)), b = Math.max(0, Math.sin(t * 16 + Math.PI)), fat = 1 + (r.fat || 0) * 0.6;
    this.standArms('L', 1, [0.3, -0.8, 0.5], [-0.35, -0.35 + a * 0.35, 0.85 * fat]); this.standArms('R', -1, [0.3, -0.8, 0.5], [-0.35, -0.35 + b * 0.35, 0.85 * fat]);
    this.legsStand(0.14, 0.15); P.chest.setFromAxisAngle(X, -0.18); P.pelvis.setFromAxisAngle(X, -0.06); P.head.setFromAxisAngle(X, 0.3).multiply(_q.setFromAxisAngle(Z, Math.sin(t * 8) * 0.1));
    const beat = Math.floor(t * 16 / Math.PI); if (beat !== this.lastBeat && t > 0.4 && t < 3.8) { this.lastBeat = beat; this.say(beat % 4 ? '' : 'BOM', null, 'thud'); }
    return { hand: { L: 'palm', R: 'palm' }, back: { L: [0, 0, -1], R: [0, 0, -1] }, bob: Math.abs(Math.sin(t * 8)) * -0.02 * this.kH };
  }
  // ---- RONNIE: chugs a MANGO LOCO, arms up
  loco(t) {
    const r = this.c.rag, P = r.pose, drink = ramp(t, 0.4, 0.9) * (1 - ramp(t, 2.6, 2.9)), cheer = ramp(t, 2.9, 3.2);
    this.standArms('R', -1, mixv(mixv([0.2, -1, 0.1], DRINK_U, drink), [0.4, 1, 0.1], cheer), mixv(mixv([0.1, -1, 0.2], DRINK_L, drink), [0.3, 1, 0], cheer));
    this.standArms('L', 1, mixv([0.25, -1, 0.05], [0.4, 1, 0.1], cheer), mixv([0.2, -1, 0.1], [0.3, 1, 0], cheer)); this.legsStand(0.12);
    P.head.setFromAxisAngle(X, -0.6 * drink - 0.2 * cheer);
    const can = this.prop('mango', () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.16, 14), lam(0xffffff))); const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0335, 0.0335, 0.07, 14), lam(0xff7a1a)); g.add(band); return g; });
    this.inHand(can, 'R', [0, 0, 0], [Math.PI / 2, 0, 0]);
    this.at(t, 1.0, 'a', () => this.say('', null, 'slurp')); this.at(t, 3.0, 'b', () => this.say('🥭 MANGO LOCO MODE! 🥭', null, 'fanfare'));
    return { hand: { L: 'open', R: 'grip' } };
  }
}

// a proper ear: the outline (round at the top, narrowing to a soft lobe), the curl of the rim, the hollow inside
// and the little flap in front, made from the ear's own shape. Built for a right-way-out ear on that side.
function earMesh(sx) {
  const g = new THREE.Group(), skin = lam(0xf0c2a2), inner = lam(0xd99a82), deep = lam(0xb87262);
  const sh = new THREE.Shape(); sh.moveTo(0, -0.032); sh.bezierCurveTo(0.014, -0.034, 0.018, -0.02, 0.016, -0.006); sh.bezierCurveTo(0.03, 0.006, 0.03, 0.03, 0.012, 0.036);
  sh.bezierCurveTo(-0.006, 0.042, -0.02, 0.03, -0.018, 0.012); sh.bezierCurveTo(-0.017, 0.0, -0.01, -0.006, -0.012, -0.018); sh.bezierCurveTo(-0.013, -0.028, -0.008, -0.032, 0, -0.032);
  const ext = (shape, d, b) => new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 18 });
  const outer = new THREE.Mesh(ext(sh, 0.004, 0.003), skin); g.add(outer);
  // the hollow (concha) and the curl of the rim, a little further out
  const c = new THREE.Shape(); c.moveTo(0.002, -0.014); c.bezierCurveTo(0.012, -0.012, 0.016, 0.0, 0.014, 0.012); c.bezierCurveTo(0.01, 0.024, -0.004, 0.026, -0.008, 0.014); c.bezierCurveTo(-0.011, 0.004, -0.006, -0.012, 0.002, -0.014);
  const hollow = new THREE.Mesh(ext(c, 0.001, 0.0015), inner); hollow.position.z = 0.0065; g.add(hollow);
  const d = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), deep); d.scale.set(1, 1.3, 0.35); d.position.set(0.002, -0.002, 0.009); g.add(d);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.0035, 6, 24, Math.PI * 1.25), skin); rim.position.set(0.004, 0.012, 0.007); rim.rotation.z = -0.2; g.add(rim);
  const tragus = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 8), skin); tragus.position.set(-0.012, -0.006, 0.008); g.add(tragus);
  // face outwards from the side of the head, mirrored for the left ear
  const holder = new THREE.Group(); g.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; if (sx > 0) g.scale.x = -1; holder.add(g); return holder;
}

// Tommy's ball: beige and a bit wrinkled, with short curly hairs growing out of it (each rooted in the skin and
// curling over, so they're part of it), shared with his attack
export function hairyBall(R = 0.045) {
  const g = new THREE.Group(), geo = new THREE.SphereGeometry(R, 28, 20), p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * 260) * Math.sin(v.y * 240) * Math.sin(v.z * 280); v.multiplyScalar(1 + n * 0.035 + Math.sin(v.y * 90) * 0.02); v.y *= 1.08; p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals(); g.add(new THREE.Mesh(geo, lam(0xd9bf9e, { emissive: 0x3a2412 })));
  const pts = [], up = new THREE.Vector3(0, 1, 0), t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let k = 0; k < 140; k++) {
    const z = rnd() * 2 - 1, a = rnd() * Math.PI * 2, rr = Math.sqrt(1 - z * z), n = new THREE.Vector3(rr * Math.cos(a), z, rr * Math.sin(a));
    t1.crossVectors(n, Math.abs(n.y) < 0.9 ? up : new THREE.Vector3(1, 0, 0)).normalize(); t2.crossVectors(n, t1);
    const root = n.clone().multiplyScalar(R * 0.97), L = R * (0.2 + rnd() * 0.22), curl = rnd() * 6.28, seg = 5;
    let prev = root.clone();
    for (let j = 1; j <= seg; j++) { const s = j / seg, c = curl + s * 4.5; const q = root.clone().addScaledVector(n, L * s * 0.55).addScaledVector(t1, Math.cos(c) * L * 0.28 * s).addScaledVector(t2, Math.sin(c) * L * 0.28 * s); pts.push(prev.x, prev.y, prev.z, q.x, q.y, q.z); prev = q; }
  }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.add(new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ color: 0x2a180c })));
  return g;
}

// paint the character's own model (ragdoll.paint uniforms): set every frame, cleared when the emote stops
function paintRag(em, vals) { const p = em.c.rag.paint; if (!p) return false; if (!em.painted) { em.painted = true; em.onStop(() => { for (const k of ['uOrange', 'uHair', 'uCoat']) p[k].value = 0; em.painted = false; }); }
  for (const k in vals) p[k].value = vals[k]; return true; }

// Harry's white panel van: one shaped body (bonnet, windscreen, roof), cab windows, sliding-door seams, mirrors,
// grille, lights, bumpers, plates, wheels with hubcaps, roof rack and ladder, a driver, and twin back doors (pivots
// named door-1 / door1) that open onto the inside. Back of the van at z -2.2, front at +2.4.
function vanMesh() {
  const g = new THREE.Group(), white = lam(0xf2f2f0), glass = new THREE.MeshPhongMaterial({ color: 0x1c2a36, shininess: 90, specular: 0x8899aa }), blk = lam(0x161616), grey = lam(0x4a4d52), silver = lam(0xc4c8cc), chrome = new THREE.MeshPhongMaterial({ color: 0xdfe3e6, shininess: 120, specular: 0xffffff });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, par = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); par.add(m); return m; };
  // the body: a side profile (z along the van, y up) extruded across its width, edges rounded off
  const sh = new THREE.Shape(); sh.moveTo(-2.2, 0.42); sh.lineTo(-2.2, 2.0); sh.quadraticCurveTo(-2.2, 2.08, -2.1, 2.08); sh.lineTo(0.95, 2.08); sh.quadraticCurveTo(1.1, 2.08, 1.18, 1.98);
  sh.lineTo(1.72, 1.32); sh.quadraticCurveTo(1.8, 1.24, 1.95, 1.22); sh.lineTo(2.3, 1.14); sh.quadraticCurveTo(2.42, 1.1, 2.42, 0.95); sh.lineTo(2.42, 0.5); sh.quadraticCurveTo(2.42, 0.42, 2.32, 0.42); sh.lineTo(-2.2, 0.42);
  const bg = new THREE.ExtrudeGeometry(sh, { depth: 1.8, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3, curveSegments: 10 }); bg.rotateY(-Math.PI / 2); bg.translate(0.9, 0, 0);
  add(bg, white, 0, 0, 0);
  // windscreen (follows the slope), side cab windows, the little quarter window
  const wsLen = Math.hypot(1.72 - 1.18, 1.98 - 1.32); add(new THREE.PlaneGeometry(1.7, wsLen * 0.92), glass, 0, 1.65, 1.47, -(Math.PI / 2 - Math.atan2(1.98 - 1.32, 1.72 - 1.18)));
  for (const sx of [-1, 1]) { const x = sx * 0.948, ry = sx * Math.PI / 2;
    const win = new THREE.Shape(); win.moveTo(0, 0); win.lineTo(0.62, 0); win.lineTo(0.62, 0.32); win.lineTo(0.38, 0.55); win.lineTo(0, 0.55); win.lineTo(0, 0);
    const wm = add(new THREE.ShapeGeometry(win), glass, x, 1.32, sx > 0 ? 0.78 : 1.4, 0, ry); wm.scale.x = 1;
    add(new THREE.PlaneGeometry(0.004, 1.15), blk, x + sx * 0.002, 1.05, 0.72, 0, ry);           // cab door seams
    add(new THREE.PlaneGeometry(0.004, 1.2), blk, x + sx * 0.002, 1.05, 1.5, 0, ry);
    add(new THREE.BoxGeometry(0.03, 0.03, 0.14), grey, x + sx * 0.01, 1.22, 0.85);                // cab door handle
    add(new THREE.PlaneGeometry(0.004, 1.45), blk, x + sx * 0.002, 1.2, -0.95, 0, ry);           // sliding side door seams + track
    add(new THREE.PlaneGeometry(1.6, 0.012), grey, x + sx * 0.002, 1.62, -0.15, 0, ry);
    add(new THREE.BoxGeometry(0.03, 0.035, 0.18), grey, x + sx * 0.01, 1.2, 0.5);                 // side door handle
    // wing mirror on an arm
    add(new THREE.BoxGeometry(0.12, 0.03, 0.03), blk, sx * 1.0, 1.42, 1.62); add(new THREE.BoxGeometry(0.05, 0.22, 0.14), blk, sx * 1.08, 1.45, 1.6);
    add(new THREE.PlaneGeometry(0.12, 0.18), chrome, sx * 1.08, 1.45, 1.528, 0, Math.PI);
    // plastic sill and wheel-arch trims
    add(new THREE.BoxGeometry(0.03, 0.12, 2.4), grey, sx * 0.95, 0.5, 0.2);
    for (const z of [1.55, -1.35]) { const arch = add(new THREE.TorusGeometry(0.42, 0.045, 6, 20, Math.PI), grey, sx * 0.955, 0.42, z, 0, ry); arch.scale.set(1, 1, 0.6); }
    // indicator repeater
    add(new THREE.BoxGeometry(0.02, 0.03, 0.06), lam(0xff9a00, { emissive: 0x663300 }), sx * 0.96, 1.0, 1.7);
  }
  // the livery down both sides
  const liv = labelTex("HARRY & KIDS LTD · NO JOB TOO SMALL", '#1f4fbf', '#fff');
  for (const sx of [-1, 1]) add(new THREE.PlaneGeometry(2.5, 0.22), new THREE.MeshBasicMaterial({ map: liv }), sx * 0.951, 1.15, -0.95, 0, sx * Math.PI / 2);
  for (const sx of [-1, 1]) add(new THREE.PlaneGeometry(1.2, 0.05), new THREE.MeshBasicMaterial({ color: 0x1f4fbf }), sx * 0.951, 1.36, -0.95, 0, sx * Math.PI / 2);
  // front: grille with slats, badge, headlights, indicators, bumper, number plate
  add(new THREE.BoxGeometry(1.0, 0.32, 0.04), blk, 0, 0.88, 2.45); for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.94, 0.02, 0.02), grey, 0, 0.77 + i * 0.075, 2.475);
  add(new THREE.SphereGeometry(0.05, 12, 8), chrome, 0, 0.9, 2.48).scale.set(1.4, 1, 0.3);
  for (const sx of [-1, 1]) { const hl = add(new THREE.BoxGeometry(0.34, 0.16, 0.05), new THREE.MeshBasicMaterial({ color: 0xfffbe0 }), sx * 0.7, 0.98, 2.42, 0, sx * 0.15); hl.name = 'headlight';
    add(new THREE.BoxGeometry(0.1, 0.06, 0.04), lam(0xff9a00, { emissive: 0x884400 }), sx * 0.87, 0.86, 2.42); }
  add(new THREE.BoxGeometry(1.95, 0.22, 0.16), grey, 0, 0.52, 2.44); add(new THREE.BoxGeometry(1.4, 0.05, 0.05), blk, 0, 0.52, 2.53);
  for (const sx of [-1, 1]) add(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12), new THREE.MeshBasicMaterial({ color: 0xfff6c0 }), sx * 0.75, 0.5, 2.52, Math.PI / 2);   // fog lights
  add(new THREE.PlaneGeometry(0.52, 0.11), new THREE.MeshBasicMaterial({ map: labelTex('H4 RRY', '#ffffff', '#111') }), 0, 0.62, 2.535);
  // wipers
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.55, 0.015, 0.015), blk, sx * 0.3, 1.38, 1.73, 0, 0, sx * 0.2);
  // back: bumper with a step, tail lights, hazards (flash while parked), rear plate, reflectors, exhaust
  add(new THREE.BoxGeometry(1.95, 0.2, 0.16), grey, 0, 0.5, -2.3); add(new THREE.BoxGeometry(0.7, 0.05, 0.22), blk, 0, 0.62, -2.33);
  g.userData.hazards = [];
  for (const sx of [-1, 1]) { add(new THREE.BoxGeometry(0.12, 0.6, 0.06), lam(0xc8101e, { emissive: 0x4a0008 }), sx * 0.9, 1.05, -2.27);
    const hz = add(new THREE.BoxGeometry(0.13, 0.12, 0.07), new THREE.MeshBasicMaterial({ color: 0xffa200 }), sx * 0.9, 1.42, -2.27); hz.visible = false; g.userData.hazards.push(hz);
    const fz = add(new THREE.BoxGeometry(0.13, 0.12, 0.07), new THREE.MeshBasicMaterial({ color: 0xffa200 }), sx * 0.87, 0.86, 2.43); fz.visible = false; g.userData.hazards.push(fz);
    add(new THREE.CircleGeometry(0.035, 10), new THREE.MeshBasicMaterial({ color: 0xff2020 }), sx * 0.7, 0.5, -2.385, 0, Math.PI); }
  add(new THREE.PlaneGeometry(0.52, 0.11), new THREE.MeshBasicMaterial({ map: labelTex('H4 RRY', '#ffd400', '#111'), side: THREE.DoubleSide }), 0, 0.5, -2.39, 0, Math.PI);
  add(new THREE.BoxGeometry(0.3, 0.04, 0.05), lam(0xc8101e, { emissive: 0x4a0008 }), 0, 2.1, -2.2);   // high brake light
  add(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 10), grey, -0.6, 0.38, -2.25, Math.PI / 2);
  // inside: a dark load bay with a floor and two benches (for the kids)
  add(new THREE.BoxGeometry(1.76, 1.5, 0.02), lam(0x26282b), 0, 1.22, -0.2); add(new THREE.BoxGeometry(1.76, 0.03, 2.0), lam(0x5a5048), 0, 0.5, -1.2);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.3, 0.3, 1.8), lam(0x3a4a6a), sx * 0.7, 0.66, -1.2);
  add(new THREE.BoxGeometry(1.76, 1.5, 0.02), lam(0x2e3034), 0, 1.25, -2.12).visible = false;
  // the back doors: hinged at the outer edges, with windows, handles and a hinge each
  for (const sx of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sx * 0.95, 1.22, -2.26); piv.name = 'door' + sx; g.add(piv);
    add(new THREE.BoxGeometry(0.94, 1.56, 0.05), white, -sx * 0.475, 0, 0, 0, 0, 0, piv);
    add(new THREE.PlaneGeometry(0.62, 0.42), glass, -sx * 0.47, 0.38, -0.028, 0, Math.PI, 0, piv);
    add(new THREE.BoxGeometry(0.03, 0.18, 0.04), grey, -sx * 0.85, -0.05, -0.04, 0, 0, 0, piv);
    for (const y of [0.55, -0.55]) add(new THREE.BoxGeometry(0.06, 0.1, 0.06), blk, -sx * 0.02, y, -0.02, 0, 0, 0, piv);
    if (sx > 0) add(new THREE.PlaneGeometry(0.8, 0.14), new THREE.MeshBasicMaterial({ map: labelTex('HOW\'S MY PARENTING?', '#ffffff', '#1f4fbf') }), -0.47, -0.25, -0.028, 0, Math.PI, 0, piv); }
  // roof rack with a ladder on it
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.04, 0.04, 3.0), silver, sx * 0.82, 2.2, -0.6);
  for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(1.68, 0.03, 0.04), silver, 0, 2.2, -2.0 + i * 0.7);
  for (let i = 0; i < 4; i++) { const leg = add(new THREE.BoxGeometry(0.04, 0.1, 0.04), silver, (i % 2 ? 1 : -1) * 0.82, 2.14, i < 2 ? -2.0 : 0.8); }
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.035, 0.035, 2.6), lam(0xb08a3a), sx * 0.2, 2.26, -0.6);
  for (let i = 0; i < 9; i++) add(new THREE.BoxGeometry(0.4, 0.025, 0.025), lam(0xb08a3a), 0, 2.26, -1.8 + i * 0.3);
  // the driver
  const drv = new THREE.Group(); drv.position.set(-0.45, 1.05, 1.15); g.add(drv);
  add(new THREE.CapsuleGeometry(0.17, 0.3, 4, 10), lam(0x2b6cc4), 0, 0.2, 0, 0, 0, 0, drv); add(new THREE.SphereGeometry(0.12, 14, 10), lam(0xe0b090), 0, 0.55, 0.02, 0, 0, 0, drv);
  add(new THREE.SphereGeometry(0.125, 14, 10, 0, Math.PI * 2, 0, 1.3), lam(0x2a1a10), 0, 0.57, 0, 0, 0, 0, drv);
  add(new THREE.TorusGeometry(0.16, 0.02, 6, 18), blk, 0, 0.32, 0.35, -0.9, 0, 0, drv);   // steering wheel
  // wheels: tyre, sidewall, hubcap, nuts; each in a group that spins about its axle
  g.userData.wheels = [];
  for (const [x, z] of [[-0.86, 1.55], [0.86, 1.55], [-0.86, -1.35], [0.86, -1.35]]) { const w = new THREE.Group(); w.position.set(x, 0.37, z); g.add(w); g.userData.wheels.push(w);
    const sx = Math.sign(x);
    add(new THREE.CylinderGeometry(0.37, 0.37, 0.24, 24), blk, 0, 0, 0, 0, 0, Math.PI / 2, w);
    add(new THREE.TorusGeometry(0.3, 0.06, 8, 24), lam(0x222222), sx * 0.1, 0, 0, 0, Math.PI / 2, 0, w);
    add(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 20), silver, sx * 0.125, 0, 0, 0, 0, Math.PI / 2, w);
    add(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 12), chrome, sx * 0.14, 0, 0, 0, 0, Math.PI / 2, w);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 6), grey, sx * 0.14, Math.cos(a) * 0.13, Math.sin(a) * 0.13, 0, 0, Math.PI / 2, w); }
    // spokes so you can see it turn
    for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(0.01, 0.03, 0.34), grey, sx * 0.137, 0, 0, i / 5 * Math.PI, 0, 0, w);
    add(new THREE.BoxGeometry(0.2, 0.22, 0.015), blk, x, 0.3, z - sx * 0 - 0.42);   // mud flap
  }
  return g;
}

// a little kid (Harry's): a body, head, hair (a ponytail if she has one), legs that walk, an arm to hold hands
function kidMesh(top = 0xff6fa8, hairCol = 0x6a3a1a, pony = true, sc = 1) {
  const g = new THREE.Group(), skin = lam(0xf0c4a4), topM = lam(top), bot = lam(0x3a4a7a);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.2, 4, 10), topM); body.position.y = 0.62; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), skin); head.position.y = 0.92; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12, 0, Math.PI * 2, 0, 1.4), lam(hairCol)); hair.position.y = 0.93; hair.rotation.x = -0.3; g.add(hair);
  if (pony) { const tie = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.008, 6, 12), lam(0xff2e8a)); tie.position.set(0, 0.97, -0.105); g.add(tie);
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.13, 4, 8), lam(hairCol)); tail.position.set(0, 0.9, -0.13); tail.rotation.x = 0.35; tail.name = 'pony'; g.add(tail); }
  for (const sx of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), lam(0x111111)); eye.position.set(sx * 0.04, 0.94, 0.1); g.add(eye); }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 4, 10, Math.PI), lam(0x8a2a2a)); smile.rotation.z = Math.PI; smile.position.set(0, 0.89, 0.103); g.add(smile);
  for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.3, 4, 8), bot); leg.position.set(sx * 0.06, 0.24, 0); leg.name = 'leg' + sx; g.add(leg); }
  for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.26, 4, 8), skin); arm.position.set(sx * 0.15, 0.62, 0); arm.rotation.z = sx * 0.3; arm.name = 'arm' + sx; g.add(arm); }
  g.scale.setScalar(sc); return g;
}
const walkKid = (k, ph) => { const s = Math.sin(ph); k.getObjectByName('leg-1').rotation.x = 0.5 * s; k.getObjectByName('leg1').rotation.x = -0.5 * s; const p = k.getObjectByName('pony'); if (p) p.rotation.x = 0.35 + Math.sin(ph * 2) * 0.15; };

// little textures for props
let _heart = null;
function heartTex() { if (_heart) return _heart; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.font = '52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💖', 32, 36); _heart = new THREE.CanvasTexture(c); _heart.colorSpace = THREE.SRGBColorSpace; return _heart; }
function labelTex(txt, bg = '#ffffff', fg = '#1a3fa8') { const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 512, 64); g.fillStyle = fg; g.font = '900 40px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 256, 34, 500); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
