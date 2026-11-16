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
  ethan: [{ id: 'fifa', name: 'FIFA RAGE', icon: '🎮', dur: 5.2 }, { id: 'pepsi', name: 'PEPSI MAX PILE', icon: '🥤', dur: 5.0 }, { id: 'kfc', name: 'BARGAIN BUCKET', icon: '🍗', dur: 5.6 }, { id: 'hala', name: 'HALA MADRID', icon: '👑', dur: 5.2 , cam: 1.2 }],
  ben: [{ id: 'hairline', name: 'NEW HAIRLINE', icon: '💇', dur: 4.6 }, { id: 'oldman', name: 'MY BACK', icon: '🦯', dur: 5.4 }, { id: 'turkey', name: 'TO TURKEY!', icon: '✈️', dur: 9.6 , cam: 1.5 }, { id: 'windy', name: 'HAIR IN THE WIND', icon: '💨', dur: 5.0 }],
  tommy: [{ id: 'ball', name: 'MY BALL', icon: '🟤', dur: 5.8 }, { id: 'older', name: 'ONE DAY OLDER', icon: '☝️', dur: 4.0 }, { id: 'help', name: 'JUST TRYING TO HELP', icon: '🤷', dur: 4.4 }, { id: 'broccoli', name: 'EAT YOUR GREENS', icon: '🥦', dur: 4.6 }],
  lewis: [{ id: 'siu', name: 'SIUUU', icon: '🐐', dur: 3.6 }, { id: 'tall', name: 'TOO TALL', icon: '🦒', dur: 5.0 }, { id: 'legday', name: 'LEG DAY', icon: '🏋️', dur: 5.0 }, { id: 'palace', name: 'GLAD ALL OVER', icon: '🦅', dur: 5.6 , cam: 1.3 }],
  chloe: [{ id: 'ears', name: 'UCL EARS', icon: '🏆', dur: 5.0 }, { id: 'wagamama', name: 'WAGAMAMA SPECIAL', icon: '🍜', dur: 5.4 }, { id: 'calories', name: 'COUNTING CALORIES', icon: '📝', dur: 4.8 }, { id: 'chester', name: 'CHESTER!', icon: '🐶', dur: 5.0 , cam: 1.1 }],
  aidanw: [{ id: 'knee', name: 'THE KNEE', icon: '🦵', dur: 6.0 }, { id: 'beard', name: 'BEARD GROWTH', icon: '🧔', dur: 6.4 }, { id: 'spurs', name: 'TROPHY CABINET', icon: '🏆', dur: 5.0 }, { id: 'cards', name: 'SHINY CARD', icon: '🃏', dur: 4.4 }],
  aidan: [{ id: 'guinness', name: 'GUINNESS DREAM', icon: '🍺', dur: 6.8 }, { id: 'splitg', name: 'SPLIT THE G', icon: '🎯', dur: 5.6 }, { id: 'drunk', name: 'JUST THE ONE', icon: '🥴', dur: 5.2 }, { id: 'kebab', name: '3AM KEBAB', icon: '🥙', dur: 4.8 }],
  dylan: [{ id: 'acl', name: 'ACL EXPLOSION', icon: '💥', dur: 5.4 }, { id: 'airguitar', name: 'WONDERWALL', icon: '🎤', dur: 5.4 }, { id: 'oompa', name: 'OOMPA LOOMPA', icon: '🍫', dur: 5.4 }, { id: 'bubbles', name: 'BLOWING BUBBLES', icon: '🫧', dur: 5.6 }],
  ian: [{ id: 'abuse', name: 'SHOUTING ABUSE', icon: '🤬', dur: 4.6 }, { id: 'cast', name: 'GONE FISHING', icon: '🎣', dur: 4.8 }, { id: 'flip', name: 'BURGER FLIP', icon: '🍔', dur: 4.6 }, { id: 'boot', name: 'THE BIG CATCH', icon: '🥾', dur: 4.8 }],
  oliver: [{ id: 'honest', name: 'MY HONEST REACTION', icon: '😐', dur: 4.6 }, { id: 'live', name: 'GOING LIVE', icon: '📸', dur: 4.4 }, { id: 'security', name: 'LIDL SECURITY', icon: '📻', dur: 4.8 }, { id: 'unbox', name: 'UNBOXING', icon: '📦', dur: 4.8 }],
  noah: [{ id: 'bellybounce', name: 'BELLY BOUNCE', icon: '🤰', dur: 4.2 }, { id: 'conversion', name: 'CONVERSION KICK', icon: '🏉', dur: 4.6 }, { id: 'scrum', name: 'SCRUM DOWN', icon: '💪', dur: 4.4 }, { id: 'tryline', name: 'TRY TIME', icon: '🏉', dur: 4.6 , cam: 1.4 }],
  harry: [{ id: 'date', name: 'ON A DATE', icon: '💕', dur: 6.0 }, { id: 'spike', name: 'TOUCHDOWN', icon: '🏈', dur: 4.4 }, { id: 'swipe', name: 'SWIPE RIGHT', icon: '👉', dur: 4.4 }, { id: 'van', name: 'HARRY\'S VAN', icon: '🚐', dur: 9.0 , cam: 2.0 }],
  alfie: [{ id: 'sugar', name: 'SPECIAL STUFF', icon: '🧂', dur: 5.6 }, { id: 'topbins', name: 'TOP BINS', icon: '⚽', dur: 4.6 , cam: 1.6 }, { id: 'signing', name: 'HERE WE GO', icon: '✍️', dur: 4.8 , cam: 1.15 }, { id: 'tattoo', name: 'THE BACK PIECE', icon: '🐉', dur: 4.8 , cam: 1.2 }],
  connor: [{ id: 'ynwa', name: 'YNWA SCARF', icon: '🧣', dur: 5.0 }, { id: 'round', name: 'MY ROUND', icon: '🍻', dur: 4.2 }, { id: 'jig', name: 'IRISH JIG', icon: '☘️', dur: 5.0 }, { id: 'slip', name: 'THE SLIP', icon: '🍌', dur: 5.0 , cam: 1.4 }],
  ronnie: [{ id: 'drum', name: 'BELLY DRUM', icon: '🥁', dur: 4.4 }, { id: 'loco', name: 'MANGO LOCO', icon: '🥭', dur: 4.6 }, { id: 'fridge', name: 'FRIDGE RAID', icon: '🧊', dur: 5.0 }, { id: 'nap', name: 'FOOD COMA', icon: '💤', dur: 5.2 }],
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
const HANDS = { ok: { curl: 0.65, mid: 0 }, peace: { curl: 1, mid: 0 }, spidey: { curl: 1, mid: 1 }, point: { curl: 1, mid: 1 }, fist: { curl: 1, mid: 1 }, finger: { curl: 1, mid: 0 }, palm: { curl: 0.08, mid: 0.08 }, open: { curl: 0, mid: 0 }, goggle: { curl: 0.55, mid: 0.6 }, grip: { curl: 0.8, mid: 0.8 } };
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
  peace: { thumb: 0.9, index: 0, middle: 0, ring: 1, pinky: 1 },
  ok: { thumb: 0.8, index: 0.95, middle: 0.04, ring: 0.06, pinky: 0.1 },      // (the OK sign: thumb and first finger touching in a ring, the other three up)
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
  try { const mesh = rag.mesh, img = mesh.material.map && (mesh.material.map.userData.thumb || mesh.material.map.image), uv = mesh.geometry.attributes.uv, si = mesh.geometry.attributes.skinIndex;
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
  unstretch() { const r = this.c.rag; r.stretchS = null; r.applyScale && r.applyScale(); }
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
    for (const k in this.props) { const p = this.props[k], u = p.userData; if (u.rawP) { p.position.copy(u.rawP); p.scale.copy(u.rawS); u.rawP = null; } }   // (undo last frame's drawn-bigger move: see drawProps)
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
    if (out.stretch) { r.stretchS = [1 + (out.stretch[1] - 1) * w, 1 + (out.stretch[0] - 1) * w]; r.applyScale(); } else this.unstretch();
    this.out = out;
    return w;
  }
  // after the body has moved this frame: the hands (the model's own fingers), and any props
  place() { if (this.id && this.c.prop && this.c.prop.visible) { const pr = this.c.prop; pr.visible = false; this.onStop(() => { pr.visible = true; }); }      // (their usual pint / phone / rod is put away for the emote)
    if (this.id && this.c.reelLine) this.c.reelLine.visible = false;
    if (this.id && this.out) { this.gestures(this.out, this.w); if (this.holding) for (const [p, [S, off, rot]] of this.holding) if (p.visible && p.parent) this.placeInHand(p, S, off, rot); this.drawProps(); } }
  // a body drawn bigger (a player's stage, a stretch): the props move out with it and grow to match (undone next frame)
  drawProps() { const r = this.c.rag, g = r.group; if (!g || (g.scale.x === 1 && g.scale.y === 1)) return; const k = (g.scale.x + g.scale.y) / 2;
    for (const key in this.props) { const p = this.props[key], u = p.userData; u.rawP = p.position.clone(); u.rawS = p.scale.clone(); r.drawn(p.position); p.scale.multiplyScalar(k); } }      // (held things follow the hand after it's moved: no lagging behind)
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
      const g = r.group, gk = g ? (g.scale.x + g.scale.y) / 2 : 1; r.drawn(wr);
      mh.pose(CURLS[kind] || CURLS.open); mh.place(wr, dir, back, this.kH * 1.02 * gk);
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
    // part one: arms straight down, just out from the sides, the forearms flicking up now and then; part two: arms bent
    // up, both hands making the OK sign at face level (the goggles), bouncing. The legs never stop: steady tiptoe steps forward;
    // both arms always move together
    const r = this.c.rag, P = r.pose, kH = this.kH, peace = ss((t - 3.0) / 0.35);
    const s = this.walkLegs(t, 1.9, 0.24), tip = Math.abs(s);
    const flick = Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.1)), 6), pump = Math.sin(t * Math.PI * 1.9) * 0.12;
    for (const [S, sx] of [['L', 1], ['R', -1]]) {
      const fl = flick;      // (both together)
      const du = [0.3, -1, 0.06], dl = mixv([0.32, -1, 0.08], [0.25, 0.35, 0.9], fl);
      const pu = [0.72, -0.3 + pump, 0.55], pl = [-0.7, 0.62, 0.34];      // (forearms up and in: the OK rings held over the eyes, like goggles)
      this.standArms(S, sx, mixv(du, pu, peace), mixv(dl, pl, peace));
    }
    P.chest.setFromAxisAngle(X, 0.12 + 0.05 * tip).multiply(_q.setFromAxisAngle(Y, s * 0.12)); P.pelvis.setFromAxisAngle(Y, -s * 0.1);
    P.head.setFromAxisAngle(X, -0.05 + Math.sin(t * Math.PI * 1.9) * 0.08 * peace);
    this.at(t, 0.2, 'a', () => this.say('🕺 THE GRIDDY', null, 'pop')); this.at(t, 3.1, 'b', () => this.say('👌 👌', null, 'boing'));
    return { hand: { L: peace > 0.5 ? 'ok' : 'fist', R: peace > 0.5 ? 'ok' : 'fist' }, back: peace > 0.5 ? { L: [0, 0, 1], R: [0, 0, 1] } : null, bob: (0.035 + tip * 0.025) * kH };
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
    // the pile of empties: proper printed cans, a pyramid with a few crushed ones round the bottom
    const pile = this.prop('pile', () => { const g = new THREE.Group(); let i = 0;
      for (let row = 0; row < 5; row++) for (let k = 0; k < 6 - row; k++) { const m = pepsiCan(); m.position.set((k - (5 - row) / 2) * 0.07, 0.06 + row * 0.122, Math.sin(i * 7) * 0.02); m.rotation.y = i * 1.3; g.add(m); i++; }
      for (let k = 0; k < 9; k++) { const m = pepsiCan(); m.scale.set(1, 0.4, 1); m.rotation.set(0, k, Math.PI / 2); m.position.set(Math.sin(k * 2.3) * 0.3, 0.034, Math.cos(k * 2.3) * 0.2); g.add(m); }
      return g; });
    this.L(0.75, 0, 0.2, pile.position); pile.rotation.y = r.yaw; pile.scale.setScalar(this.kH * ramp(t, 0, 0.4));
    const can = this.prop('can', pepsiCan);
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
  kfc(t) {
    // a KFC Bargain Bucket "for one": bucket in one arm, a drumstick at a time up to the mouth, the bones flung on the floor
    const r = this.c.rag, P = r.pose, kH = this.kH, cyc = (t * 0.9) % 1, bite = Math.sin(cyc * Math.PI), n = Math.floor(t * 0.9);
    this.standArms('L', 1, [0.25, -0.75, 0.45], [-0.55, -0.1, 0.8]); this.legsStand(0.1);
    this.standArms('R', -1, mixv([0.3, -0.75, 0.5], DRINK_U, bite), mixv([-0.2, -0.3, 0.9], DRINK_L, bite));
    P.head.setFromAxisAngle(X, 0.25 - bite * 0.35); P.chest.setFromAxisAngle(X, 0.08);
    const b = this.prop('bucket', bucketMesh); this.inHand(b, 'L', [0, 0.06, 0.02], [0, 0, 0]);
    const d = this.prop('drum', drumstick); this.inHand(d, 'R', [0, 0.02, 0], [Math.PI / 2, 0, 0]); d.scale.setScalar(this.kH * (1 - clamp01((cyc - 0.55) / 0.3) * 0.5));
    for (let i = 0; i < 9; i++) { const p = b.getObjectByName('piece' + i); if (p) p.visible = i >= n; }
    for (let i = 0; i < 5; i++) { const bn = this.prop('bone' + i, () => { const g = new THREE.Group(); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.07, 6), lam(0xf4ead8)); s.rotation.z = Math.PI / 2; g.add(s); return g; });
      bn.visible = n > i; this.L(0.3 + Math.sin(i * 2) * 0.25, 0.01, 0.35 + Math.cos(i * 3) * 0.15, bn.position); bn.rotation.y = i * 1.7; }
    if (n !== this.lastBeat) { this.lastBeat = n; this.say(['🍗 BARGAIN BUCKET', 'FOR ONE.', 'FINGER LICKIN\'', 'ANOTHER ONE', 'SAVE SOME? NO.'][n % 5], null, 'crunch'); }
    return { hand: { L: 'grip', R: 'grip' } };
  }
  // ---- BEN: arms out like a plane, banking round: off to Turkey
  turkey(t) {
    // the Turkish Airlines plane, a huge Turkish flag down its side, lands right in front of him (side on), the stairs
    // come down, he waves his little flag and goes up; the plane takes off; "two weeks later" it's back and so is he
    const r = this.c.rag, P = r.pose, kH = this.kH, gone = t > 3.7 && t < 8.3;
    if (!this.benBack) { this.benBack = true; this.onStop(() => { if (r.group) r.group.visible = true; this.benBack = false; }); }
    if (r.group) r.group.visible = !gone;
    const wave = Math.sin(t * 9);
    if (t < 3.0 || t > 8.3) { const cheer = ramp(t, 8.3, 8.6);
      this.standArms('R', -1, [0.45, 0.85, 0.1], [0.3 + wave * 0.3, 0.95, 0.1]); this.standArms('L', 1, mixv([0.2, -1, 0.1], [0.4, 0.9, 0.1], cheer), mixv([0.2, -1, 0.15], [0.3, 0.95, 0.1], cheer)); this.legsStand(0.1); P.head.setFromAxisAngle(X, -0.15); }
    else { const s = this.walkLegs(t, 2, 0.4); this.standArms('L', 1, [0.15, -0.9, 0.5 * s], [0.12, -0.5, 0.9]); this.standArms('R', -1, [0.45, 0.85, 0.1], [0.3 + wave * 0.3, 0.95, 0.1]); }
    const fl = this.prop('trflag', () => { const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 6), lam(0xd4af37)); pole.position.y = 0.3; g.add(pole);
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.24, 10, 1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: trFlagTex() })); cl.position.set(0.18, 0.47, 0); cl.name = 'cloth'; g.add(cl); return g; });
    this.inHand(fl, 'R', [0, 0.02, 0], [Math.PI / 2, 0, 0]); const pa = fl.getObjectByName('cloth').geometry.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i); pa.setZ(i, Math.sin(x * 14 - t * 10) * 0.025 * (x + 0.18) * 4); } pa.needsUpdate = true;
    const pl = this.prop('plane', planeMesh);
    let x, y, pitch = 0, spin = 0;
    if (t < 3.8) { const k = clamp01(t / 2.6); x = -26 * Math.pow(1 - k, 2); y = 7 * Math.pow(1 - clamp01(k * 1.25), 2); pitch = -0.08 * (1 - k); spin = (1 - k) * 2; }
    else if (t < 6.2) { const k = clamp01((t - 3.8) / 2.0); x = 32 * k * k; y = 10 * Math.pow(Math.max(0, k - 0.25) / 0.75, 1.6); pitch = 0.22 * Math.min(1, k * 3); spin = k * 2; }
    else { const k = clamp01((t - 6.2) / 1.9); x = -26 * Math.pow(1 - k, 2); y = 7 * Math.pow(1 - clamp01(k * 1.25), 2); pitch = -0.08 * (1 - k); spin = (1 - k) * 2; }
    // side on behind him (so the camera in front sees it), nose to his right, the door (3m along) right behind him
    const PS = 0.5; this.L((3.0 - x) * PS, 0, -2.9, pl.position); pl.position.y = y * PS; pl.rotation.set(0, r.yaw - Math.PI / 2, 0); pl.rotateX(-pitch); pl.scale.setScalar(PS * kH);
    for (const w of pl.userData.wheels) w.rotation.y += spin * 0.5;
    const st = pl.getObjectByName('stairs'); st.visible = (t > 2.4 && t < 3.9) || t > 7.9;
    for (let i = 0; i < 4; i++) { const tx = this.prop('cf' + i, () => new THREE.Sprite(new THREE.SpriteMaterial({ map: trFlagTex(), transparent: true }))); const k = ((t * 0.7 + i / 4) % 1);
      tx.visible = t > 8.3; tx.position.copy(this.L(Math.sin(i * 2.1) * 1.2, 2.4 - k * 1.8, 0.8 + Math.cos(i) * 0.4)); tx.scale.set(0.24 * kH, 0.16 * kH, 1); }
    this.at(t, 0.3, 'a', () => this.say('✈️ MY FLIGHT\'S IN, LADS', null, 'jet')); this.at(t, 2.6, 'b', () => this.say('🇹🇷 ISTANBUL, HERE I COME!'));
    this.at(t, 3.9, 'c', () => this.say('', null, 'jet')); this.at(t, 5.6, 'd', () => this.say('🇹🇷 ...TWO WEEKS LATER... 🇹🇷'));
    this.at(t, 8.4, 'e', () => this.say('I\'M BACK! TEŞEKKÜRLER TURKEY! 🇹🇷', null, 'fanfare'));
    return { hand: { L: 'open', R: 'grip' } };
  }
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
  wagamama(t) {
    // the Wagamama special: a big bowl of ramen (noodles, broth, egg, katsu) and chopsticks: noodles up, SLURP
    const r = this.c.rag, P = r.pose, kH = this.kH, cyc = (t * 0.8) % 1, up = Math.sin(cyc * Math.PI);
    this.standArms('L', 1, [0.22, -0.75, 0.5], [-0.5, -0.05, 0.85]); this.legsStand(0.1);
    this.standArms('R', -1, mixv([0.28, -0.6, 0.6], DRINK_U, up), mixv([-0.35, 0.05, 0.9], DRINK_L, up));
    P.head.setFromAxisAngle(X, 0.3 - up * 0.3);
    const bowl = this.prop('bowl', () => { const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x111111, side: THREE.DoubleSide, shininess: 60 })); g.add(b);
      const broth = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), lam(0xc98a3a)); broth.rotation.x = -Math.PI / 2; broth.position.y = -0.025; g.add(broth);
      for (let i = 0; i < 14; i++) { const n = new THREE.Mesh(new THREE.TorusGeometry(0.03 + (i % 4) * 0.012, 0.004, 4, 16, Math.PI * 1.4), lam(0xf3dc9a)); n.rotation.set(Math.PI / 2, 0, i); n.position.set(Math.sin(i) * 0.03, -0.02, Math.cos(i * 1.3) * 0.03); g.add(n); }
      for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam(0xffffff)); e.position.set(sx * 0.05, -0.02, 0.04); g.add(e); const y = new THREE.Mesh(new THREE.CircleGeometry(0.012, 10), lam(0xff9a1a)); y.rotation.x = -Math.PI / 2; y.position.set(sx * 0.05, -0.0005, 0.04); g.add(y); }
      const katsu = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.015, 0.04), lam(0xc88a3a)); katsu.position.set(0.02, -0.012, -0.05); katsu.rotation.y = 0.3; g.add(katsu);
      for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.004, 0.02), lam(0x3faa3a)); sp.position.set(-0.05 + i * 0.01, -0.015, -0.02 + Math.sin(i) * 0.02); g.add(sp); }
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.03), new THREE.MeshBasicMaterial({ map: labelTex('wagamama', '#e2001a', '#fff'), side: THREE.DoubleSide })); tag.position.set(0, -0.06, 0.125); g.add(tag); return g; });
    this.inHand(bowl, 'L', [0, 0.08, 0.02], [0, 0, 0]);
    const sticks = this.prop('sticks', () => { const g = new THREE.Group(); for (const dx of [-0.006, 0.006]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.22, 6), lam(0x2a2a2a)); s.position.set(dx, 0.08, 0); g.add(s); }
      const nd = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 4, 12, Math.PI), lam(0xf3dc9a)); nd.position.y = 0.18; nd.name = 'nd'; g.add(nd); return g; });
    this.inHand(sticks, 'R', [0, 0, 0], [Math.PI / 2 + 0.6, 0, 0]);
    sticks.getObjectByName('nd').visible = up > 0.15;
    const n = Math.floor(t * 0.8); if (n !== this.lastBeat && cyc > 0.45) { this.lastBeat = n; this.say(['🍜 SLUUURP', 'KATSU CURRY. EXTRA KATSU.', 'WAGAMAMA SPECIAL 😋', 'NO SALAD TODAY'][n % 4], null, 'slurp'); }
    return { hand: { L: 'grip', R: 'grip' } };
  }
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
  splitg(t) {
    // SPLIT THE G: a fresh pint, one long pull... the line stops dead in the middle of the G. Then the pint comes up
    // huge in front of him, glowing, the line right through the G for everyone to see
    const r = this.c.rag, P = r.pose, kH = this.kH, sip = ramp(t, 0.8, 1.2) * (1 - ramp(t, 3.0, 3.3)), look = ramp(t, 3.3, 3.7), big = ramp(t, 3.4, 4.0);
    this.standArms('R', -1, mixv(mixv([0.25, -0.75, 0.55], DRINK_U, sip), [0.3, 0.2, 0.95], look), mixv(mixv([-0.2, -0.2, 0.95], DRINK_L, sip), [-0.15, 0.75, 0.65], look));
    this.standArms('L', 1, mixv([0.25, -1, 0.05], [0.5, 0.75, 0.3], big), mixv([0.2, -1, 0.1], [0.3, 0.95, 0.1], big)); this.legsStand(0.1);
    P.head.setFromAxisAngle(X, -0.5 * sip - 0.25 * big);
    const setLvl = (pint, lvl) => { const stout = pint.getObjectByName('stout'), head = pint.getObjectByName('head'); stout.scale.y = lvl; stout.position.y = -0.075 + 0.075 * lvl; head.position.y = -0.075 + 0.15 * lvl + 0.005; };
    const pint = this.prop('pintg', pintG); this.inHand(pint, 'R', [0, 0.01, 0], [Math.PI / 2 - 1.1 * sip, 0, 0]);
    const lvl = 1 - 0.5 * ss(clamp01((t - 1.2) / 1.7)); setLvl(pint, lvl); pint.visible = big < 0.5;
    const bp = this.prop('bigpint', () => { const g = pintG(); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.003, 6, 32), new THREE.MeshBasicMaterial({ color: 0xffd400 })); ring.rotation.x = Math.PI / 2; ring.name = 'ring'; g.add(ring);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: cvTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,220,90,0.8)'); gr.addColorStop(1, 'rgba(255,220,90,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false })); glow.scale.setScalar(0.3); glow.position.z = -0.03; g.add(glow);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: cvTex(256, 72, (c, w, h) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.strokeStyle = '#d4af37'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6); cvTxt(c, 'SPLIT ✓', w / 2, h / 2 + 2, 40, '#ffd400'); }), transparent: true })); tag.scale.set(0.14, 0.04, 1); tag.position.y = 0.14; g.add(tag); return g; });
    bp.visible = big > 0; setLvl(bp, 0.5); bp.getObjectByName('ring').position.y = -0.075 + 0.075; bp.position.copy(this.L(0, 1.25 + big * 0.35 + Math.sin(t * 2) * 0.03, 0.75)); bp.rotation.set(0, r.yaw + Math.sin(t * 1.5) * 0.25, 0); bp.scale.setScalar(kH * (0.5 + 3.6 * big));
    for (let i = 0; i < 10; i++) { const s = this.prop('spark' + i, () => new THREE.Mesh(new THREE.OctahedronGeometry(0.02), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd400 : 0xffffff })));
      s.visible = big > 0.5; const a = t * 2.5 + i * 0.63; s.position.copy(bp.position).add({ x: Math.cos(a) * 0.38 * kH, y: Math.sin(a * 1.7) * 0.25 * kH, z: Math.sin(a) * 0.38 * kH }); s.rotation.y = t * 4; }
    this.at(t, 0.3, 'a', () => this.say('RIGHT. WATCH THIS.')); this.at(t, 1.2, 'b', () => this.say('', null, 'gulp')); this.at(t, 3.4, 'c', () => this.say('🎯 SPLIT THE G!', null, 'fanfare'));
    this.at(t, 4.5, 'd', () => this.say('LOOK AT IT. DEAD CENTRE. FRAME IT.'));
    return { hand: { L: big > 0.5 ? 'point' : 'open', R: 'grip' } };
  }
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
    // swiping RIGHT on every single one: his finger goes across the phone screen, left to right. YES, yes, YES
    const r = this.c.rag, P = r.pose, kH = this.kH, cyc = (t * 1.25) % 1, sw = ss(clamp01((cyc - 0.25) / 0.35)), lift = cyc < 0.25 ? 1 - cyc / 0.25 : cyc > 0.6 ? (cyc - 0.6) / 0.4 : 0;
    this.standArms('L', 1, [0.22, -0.55, 0.78], [-0.38, 0.25, 0.9]); this.legsStand(0.1);
    P.head.setFromAxisAngle(X, 0.5);
    const ph = this.prop('phone', () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.01), lam(0x111111))); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.14), new THREE.MeshBasicMaterial({ color: 0xff3a6a })); sc.position.z = 0.006; sc.name = 'screen'; g.add(sc);
      const card = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.08), new THREE.MeshBasicMaterial({ map: cvTex(64, 100, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 100); c.fillStyle = '#f4c7a1'; c.beginPath(); c.arc(32, 40, 18, 0, 7); c.fill(); c.fillStyle = '#6a3a1a'; c.fillRect(14, 18, 36, 10); cvTxt(c, '💚', 32, 82, 18, '#000'); }) })); card.position.z = 0.007; card.name = 'card'; g.add(card); return g; });
    this.inHand(ph, 'L', [0, 0.03, 0], [-1.2, 0, 0]);
    // the right forefinger on the screen: from its left edge across to the right (his right), lifted between swipes
    const head = this.c.headPos(new THREE.Vector3()), toFace = head.clone().sub(ph.position).normalize(), right = new THREE.Vector3(-Math.cos(r.yaw), 0, Math.sin(r.yaw));
    const tgt = ph.position.clone().addScaledVector(right, (sw - 0.5) * 0.07 * kH).addScaledVector(toFace, (0.012 + lift * 0.05) * kH);
    this.reachTo('R', tgt, 0.05 * kH);
    const card = ph.getObjectByName('card'); card.position.x = -(sw * 0.09); card.rotation.z = -sw * 0.5; card.visible = sw < 0.95;
    ph.getObjectByName('screen').material.color.setHex(sw > 0.6 ? 0x2ed47a : 0xff3a6a);
    const n = Math.floor(t * 1.25); if (n !== this.lastBeat && cyc > 0.6) { this.lastBeat = n; this.say(['YES! 💚', 'YES.', 'OBVIOUSLY YES', 'IT\'S A MATCH!', 'YES YES YES'][n % 5], null, 'ting'); }
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
    // (it comes from in front of him, facing him, and parks beside him with its back doors just in front: whichever way
    // he's facing you see the kids climb in the back; then it drives off behind him)
    const side = 2.0, along = -1.2 + 12 * (1 - ss(arrive)) - 14 * leave * leave;
    this.L(side, 0, along, van.position); van.rotation.y = r.yaw + Math.PI; van.scale.setScalar(1);
    for (const w of van.userData.wheels) w.rotation.x += ((arrive < 1 ? 1 - arrive : 0) * 0.6 + leave * 0.8);
    const blink = arrive >= 1 && leave === 0 && Math.sin(t * 9) > 0; for (const m of van.userData.hazards) m.visible = blink;
    for (const sx of [-1, 1]) van.getObjectByName('door' + sx).rotation.y = sx * -doors * 1.9;
    // the five kids: they come out from behind Harry, run to the back of the van and hop in, one by one
    const cols = [0xff6fa8, 0x3fa3ff, 0x7cff6a, 0xffd400, 0xff7a1a], hair = [0x6a3a1a, 0xe8c070, 0x1a1210, 0xa0522d, 0x3a2416];
    const backDoor = this.L(side, 0, along + 2.65), inVan = this.L(side, 0, along + 1.8);
    for (let i = 0; i < 5; i++) {
      const k = this.prop('kid' + i, () => kidMesh(cols[i], hair[i], i % 2 === 0)), start = 2.2 + i * 0.85, kt = clamp01((t - start) / 0.8);
      const from = this.L(-0.5 + i * 0.25, 0, -0.5 - (i % 2) * 0.3), to = backDoor.clone();
      const hop = clamp01((kt - 0.7) / 0.3); k.visible = t < start + 0.85;
      k.position.copy(from).lerp(to, ss(Math.min(1, kt / 0.7))).lerp(inVan, hop); k.position.y = hop > 0 ? Math.sin(hop * Math.PI) * 0.25 + hop * 0.42 : Math.abs(Math.sin(t * 9)) * 0.03 * (kt > 0 ? 1 : 0);
      k.rotation.y = kt > 0 ? Math.atan2(to.x - from.x, to.z - from.z) : r.yaw; k.scale.setScalar(0.85 + (i % 3) * 0.08); walkKid(k, t * 9 + i);
      this.at(t, start + 0.8, 'k' + i, () => this.say(`${i + 1}...`, null, 'boing'));
    }
    this.at(t, 1.5, 'a', () => this.say('🚐 SCREEECH', null, 'whistle')); this.at(t, 1.8, 'b', () => this.say('IN YOU GET, KIDS!')); this.at(t, 7.0, 'c', () => this.say('*SLAM*', null, 'thud')); this.at(t, 7.5, 'd', () => this.say('SEE YOU LATER KIDS! 👋', null, 'jet'));
    return { hand: { L: 'open', R: 'open' } };
  }

  // a hand (the fingertips, tip: how far short of them) put on a point, elbow down and out: a two-bone reach
  reachTo(S, target, tip = 0) {
    const r = this.c.rag, U = r.parts['uArm' + S], Lw = r.parts['lArm' + S]; if (!U || !Lw) return;
    const ub = U.body, q = new THREE.Quaternion(ub.quaternion.x, ub.quaternion.y, ub.quaternion.z, ub.quaternion.w);
    const sh = U.def.a.clone().sub(U.def.center).applyQuaternion(q).add(new THREE.Vector3(ub.position.x, ub.position.y, ub.position.z));
    const L1 = U.def.a.distanceTo(U.def.b), L2 = Math.max(0.12, Lw.def.a.distanceTo(Lw.def.b) - tip);
    const to = target.clone().sub(sh), D = THREE.MathUtils.clamp(to.length(), Math.abs(L1 - L2) + 0.02, L1 + L2 - 0.005), dir = to.normalize();
    const a = (L1 * L1 - L2 * L2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, L1 * L1 - a * a)), outw = new THREE.Vector3(S === 'L' ? 1 : -1, 0, 0).applyAxisAngle(Y, r.yaw);
    const hint = new THREE.Vector3(0, -1, 0).addScaledVector(outw, 0.7), perp = hint.addScaledVector(dir, -hint.dot(dir)); if (perp.lengthSq() < 1e-6) perp.copy(outw); perp.normalize();
    const E = sh.clone().addScaledVector(dir, a).addScaledVector(perp, h), T = sh.clone().addScaledVector(dir, D);
    const du = E.clone().sub(sh).applyAxisAngle(Y, -r.yaw).normalize(), dl = T.sub(E).applyAxisAngle(Y, -r.yaw).normalize();
    r.aim('uArm' + S, du.x, du.y, du.z); r.aim('lArm' + S, dl.x, dl.y, dl.z);
  }
  // something worn on the chest (a number on the back, a hi-vis vest): x, y, z from the chest centre, turned by face
  onChest(p, x = 0, y = 0.06, z = -0.16, face = Math.PI) { const r = this.c.rag, k = this.kH, cq = r.partQuat('chest', new THREE.Quaternion()), cp = r.pos('chest', new THREE.Vector3());
    p.quaternion.copy(cq).multiply(new THREE.Quaternion().setFromAxisAngle(Y, face)); p.position.copy(cp).add(new THREE.Vector3(x * k, y * k, z * k).applyQuaternion(cq)); p.scale.setScalar(k); }
  // ======================== batch 2: four each, taking the mick ========================
  // ---- ETHAN: Wolves. Scarf up, singing... the score comes in, down on his knees in tears
  hala(t) {
    // HALA MADRID: all in white, the scarf held up over his head singing, then THE trophy (big ears) lifted high, the
    // confetti coming down
    const r = this.c.rag, P = r.pose, kH = this.kH, lift = ramp(t, 2.2, 2.7), sing = Math.sin(t * 5) * 0.08;
    kitRag(this, 0xf5f5f5, 0.3, 0.84);
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv([0.45, 0.85, 0.12 + sing], [0.2, 0.95, 0.15], lift), mixv([0.3, 0.95, 0.1], [0.08, 0.99, 0.05], lift));
    this.legsStand(0.15); P.head.setFromAxisAngle(X, -0.4 - 0.15 * lift); P.chest.setFromAxisAngle(X, -0.12 * lift);
    const sc = this.prop('rmscarf', () => signMesh(1.0, 0.14, cvTex(512, 72, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#5b2a86'; c.fillRect(0, 0, w, 10); c.fillRect(0, h - 10, w, 10); c.fillStyle = '#d4af37'; c.fillRect(0, 10, w, 4); c.fillRect(0, h - 14, w, 4); cvTxt(c, '👑 REAL MADRID 👑', w / 2, h / 2 + 2, 34, '#5b2a86'); })));
    const a = r.grip('lArmL', new THREE.Vector3()), b = r.grip('lArmR', new THREE.Vector3()), mid = a.clone().add(b).multiplyScalar(0.5);
    sc.visible = lift < 0.5; sc.position.copy(mid); sc.lookAt(mid.clone().add(new THREE.Vector3(Math.sin(r.yaw), 0, Math.cos(r.yaw))));
    const cup = this.prop('ucl', () => { const g = new THREE.Group(), s = new THREE.MeshPhongMaterial({ color: 0xdfe3e8, shininess: 140, specular: 0xffffff });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 20), s); g.add(base); const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.18, 16), s); stem.position.y = 0.15; g.add(stem);
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), s); bowl.rotation.x = Math.PI; bowl.position.y = 0.4; g.add(bowl);
      for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 8, 24, Math.PI * 1.4), s); ear.position.set(sx * 0.15, 0.36, 0); ear.rotation.set(0, Math.PI / 2, sx > 0 ? -0.4 : Math.PI + 0.4); g.add(ear); } return g; });
    cup.visible = lift > 0.3; cup.position.copy(mid).add({ x: 0, y: 0.05, z: 0 }); cup.rotation.y = t; cup.scale.setScalar(kH);
    for (let i = 0; i < 24; i++) { const cf = this.prop('cf' + i, () => new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.05), new THREE.MeshBasicMaterial({ color: [0xffffff, 0xd4af37, 0x5b2a86][i % 3], side: THREE.DoubleSide })));
      const k = ((t * 0.5 + i / 24) % 1); cf.visible = lift > 0.5; cf.position.copy(this.L(Math.sin(i * 2.7) * 1.2, 2.6 - k * 2.6, Math.cos(i * 1.9) * 1.0)); cf.rotation.set(t * 3 + i, t * 2, i); }
    this.at(t, 0.3, 'a', () => this.say('🎶 HALA MADRID... Y NADA MÁS! 🎶')); this.at(t, 2.3, 'b', () => this.say('🏆 NUMBER FIFTEEN!', null, 'fanfare')); this.at(t, 3.6, 'c', () => this.say('THE KINGS OF EUROPE, RON. THE KINGS.'));
    return { hand: { L: 'grip', R: 'grip' } };
  }
  // ---- BEN: Turkey teeth: the grin, the gleam
  windy(t) {
    // the new hair, in the wind: a gust picks up, his grafts start lifting off one by one and blowing away, and he's
    // chasing them round grabbing at the air
    const r = this.c.rag, P = r.pose, kH = this.kH, gust = ramp(t, 0.6, 1.2), chase = ramp(t, 2.4, 2.8);
    if (chase < 0.5) { this.standArms('R', -1, [0.35, 0.65, 0.5], [0.0, 0.9, 0.35]); this.standArms('L', 1, [0.3, 0.6, 0.55], [-0.05, 0.9, 0.35]); this.legsStand(0.14); P.head.setFromAxisAngle(X, 0.2 * gust).multiply(_q.setFromAxisAngle(Z, Math.sin(t * 7) * 0.1 * gust)); }
    else { const s = this.walkLegs(t, 2.4, 0.45); this.standArms('R', -1, [0.4, 0.75 + Math.sin(t * 8) * 0.2, 0.5], [0.2, 0.9, 0.4]); this.standArms('L', 1, [0.4, 0.5 + Math.cos(t * 8) * 0.2, 0.6], [0.2, 0.8, 0.5]); P.head.setFromAxisAngle(X, -0.4); void s; }
    const hp = this.c.headPos(new THREE.Vector3()), hq = r.partQuat('head', new THREE.Quaternion()), hair = 0x3a2416;
    const bald = this.prop('bald', () => new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), lam(skinColour(r))));
    bald.quaternion.copy(hq); bald.position.copy(hp).add(_v.set(0, 0.03 * kH, -0.005 * kH).applyQuaternion(hq)); bald.scale.setScalar(kH * 1.05); bald.visible = gust > 0.1;
    for (let i = 0; i < 9; i++) { const pl = this.prop('plug' + i, () => { const g = new THREE.Group(); const d = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), lam(hair, { side: THREE.DoubleSide })); d.rotation.x = -Math.PI / 2; g.add(d); for (let k = 0; k < 14; k++) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.002, 0.06, 4), lam(hair)); h.position.set(Math.cos(k) * 0.02, 0.02, Math.sin(k) * 0.02); g.add(h); } return g; });
      const t0 = 1.0 + i * 0.22, k = clamp01((t - t0) / 2.4), a = i * 0.7, home = _v2.set(Math.cos(a) * 0.06, 0.1, Math.sin(a) * 0.06).applyQuaternion(hq).multiplyScalar(kH).add(hp);
      if (k <= 0) { pl.position.copy(home); pl.quaternion.copy(hq); } else { pl.position.copy(home).add(this.L(-k * 2.5 - Math.sin(i) * 0.3, 0, k * 0.4 + Math.cos(i) * 0.3).sub(this.L(0, 0, 0))); pl.position.y += Math.sin(k * 6 + i) * 0.25 + k * 0.6; pl.rotation.set(k * 9 + i, k * 7, k * 5); }
      pl.scale.setScalar(kH); }
    for (let i = 0; i < 5; i++) { const w = this.prop('wind' + i, () => new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.012), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide })));
      const k = (t * 1.4 + i / 5) % 1; w.visible = gust > 0.2; w.position.copy(this.L(1.5 - k * 3.5, 1.2 + i * 0.18, 0.2 + Math.sin(i) * 0.3)); w.rotation.set(0, r.yaw + Math.PI / 2, 0); w.material.opacity = 0.6 * Math.sin(k * Math.PI); }
    this.at(t, 0.3, 'a', () => this.say('FRESH FROM ISTANBUL. NOT ONE GREY.')); this.at(t, 1.1, 'b', () => this.say('', null, 'whoosh')); this.at(t, 1.6, 'c', () => this.say('...NO. NO NO NO NO.', null, 'boing'));
    this.at(t, 2.6, 'd', () => this.say('MY GRAFTS!! COME BACK!! THAT WAS £2,000!', null, 'sadviolin'));
    return { hand: { L: 'open', R: 'open' } };
  }
  // ---- TOMMY: just trying to help (the shrug)
  help(t) { const r = this.c.rag, P = r.pose, sh = ramp(t, 0.2, 0.5), bob = Math.abs(Math.sin(t * 3)) * sh;
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv([0.2, -1, 0.1], [0.32, -0.8 + bob * 0.1, 0.35], sh), mixv([0.2, -1, 0.15], [0.5, -0.1, 0.85], sh)); this.legsStand(0.1);
    P.head.setFromAxisAngle(Z, 0.25 * sh).multiply(_q.setFromAxisAngle(X, -0.1)); P.chest.setFromAxisAngle(X, -0.08 * sh);
    this.at(t, 0.4, 'a', () => this.say('I\'M JUST TRYING TO HELP, RON 🤷')); this.at(t, 2.4, 'b', () => this.say('...AND I\'M OLDER THAN YOU.'));
    return { hand: { L: 'palm', R: 'palm' }, back: { L: [0, -1, 0], R: [0, -1, 0] }, bob: bob * 0.03 * this.kH }; }
  // ---- TOMMY: eat your greens: here comes the aeroplane... with a broccoli
  broccoli(t) { const r = this.c.rag, P = r.pose, a = t * 3, k = ramp(t, 0.2, 0.6);
    this.standArms('R', -1, mixv([0.2, -1, 0.1], [0.3 + Math.sin(a) * 0.3, 0.15 + Math.cos(a) * 0.3, 0.9], k), mixv([0.2, -1, 0.15], [0.2 + Math.sin(a) * 0.3, 0.25 + Math.cos(a) * 0.3, 0.95], k));
    this.standArms('L', 1, [0.9, 0.05, 0.1], [0.95, 0.1, 0.05]); this.legsStand(0.12); P.chest.setFromAxisAngle(Z, Math.sin(a) * 0.1);
    const b = this.prop('broc', () => { const g = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.12, 8), lam(0x9ccc65)); g.add(st);
      for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), lam(i % 2 ? 0x2e7d32 : 0x388e3c)); f.position.set(Math.cos(i * 2.4) * 0.04 * (i ? 1 : 0), 0.09 + (i % 3) * 0.012, Math.sin(i * 2.4) * 0.04 * (i ? 1 : 0)); g.add(f); } return g; });
    this.inHand(b, 'R', [0, 0.02, 0], [Math.PI / 2, 0, 0]);
    this.at(t, 0.3, 'a', () => this.say('✈️ HERE COMES THE AEROPLANE, RON...')); this.at(t, 2.6, 'b', () => this.say('🥦 EAT YOUR GREENS!', null, 'jet'));
    return { hand: { L: 'open', R: 'grip' } }; }
  // ---- LEWIS: Man United, 14th: he points at the table, then the facepalm, then down on his knees
  palace(t) {
    // GLAD ALL OVER: the Palace flag up on its pole, waving, an eagle (KAYLA) soaring round over his head, and on the
    // chorus the stomp-stomp and the clap
    const r = this.c.rag, P = r.pose, kH = this.kH, chorus = t > 2.4, beat = (t * 2) % 1, stomp = chorus ? Math.max(0, Math.sin(beat * Math.PI * 2)) : 0, clap = chorus && beat > 0.5 ? Math.sin((beat - 0.5) * Math.PI * 2) : 0;
    const wave = Math.sin(t * 4);
    if (!chorus) { this.standArms('R', -1, [0.3, 0.85, 0.3], [0.2 + wave * 0.15, 0.95, 0.2]); this.standArms('L', 1, [0.3, -0.6, 0.3], [-0.4, 0.4, 0.6]); this.legsStand(0.14); }
    else { for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.25, -0.35, 0.85], [-0.2 - clap * 0.5, 0.3 + clap * 0.2, 0.95]); r.aim('uLegL', 0.14, -1, stomp * 0.45); r.aim('lLegL', 0.1, -1, -stomp * 0.3); r.aim('uLegR', -0.14, -1, 0); r.aim('lLegR', -0.1, -1, 0); }
    P.head.setFromAxisAngle(X, -0.3);
    const flag = this.prop('pflag', () => { const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 8), lam(0xd4af37)); pole.position.y = 0.65; g.add(pole);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.48, 12, 1), new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, map: cvTex(300, 192, (c, w, h) => { for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#1b458f' : '#c4122e'; c.fillRect(i * 50, 0, 50, h); } c.fillStyle = 'rgba(255,255,255,0.92)'; c.beginPath(); c.arc(150, 96, 62, 0, 7); c.fill(); cvTxt(c, '🦅', 150, 92, 70, '#1b458f'); cvTxt(c, 'CPFC', 150, 150, 22, '#c4122e'); }) })); cloth.position.set(0.38, 1.05, 0); cloth.name = 'cloth'; g.add(cloth); return g; });
    flag.visible = !chorus; if (!chorus) { this.inHand(flag, 'R', [0, 0.02, 0], [Math.PI / 2, 0, 0]); const cl = flag.getObjectByName('cloth'), pa = cl.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i); pa.setZ(i, Math.sin(x * 9 - t * 9) * 0.05 * (x + 0.38)); } pa.needsUpdate = true; }
    const eagle = this.prop('eagle', () => { const g = new THREE.Group(), br = lam(0x5a3a1a), wh = lam(0xffffff), yl = lam(0xffc107); const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.2, 4, 8), br); b.rotation.x = Math.PI / 2; g.add(b);
      const hd = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), wh); hd.position.z = 0.17; g.add(hd); const bk = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 6), yl); bk.rotation.x = Math.PI / 2; bk.position.set(0, -0.01, 0.24); g.add(bk);
      for (const sx of [-1, 1]) { const w = new THREE.Group(); w.name = 'w' + sx; const ws = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.012, 0.18), br); ws.position.x = sx * 0.23; w.add(ws); const tip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.1), lam(0x2a1a0a)); tip.position.set(sx * 0.45, 0, -0.02); w.add(tip); g.add(w); }
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.14), wh); tl.position.z = -0.2; g.add(tl); return g; });
    const a = t * 1.3, hp = this.c.headPos(new THREE.Vector3()); eagle.position.set(hp.x + Math.cos(a) * 1.1, hp.y + 0.9 + Math.sin(t * 2) * 0.12, hp.z + Math.sin(a) * 1.1); eagle.rotation.set(0, -a, Math.sin(t * 2) * 0.3); eagle.scale.setScalar(kH);
    for (const sx of [-1, 1]) eagle.getObjectByName('w' + sx).rotation.z = sx * Math.sin(t * 9) * 0.45;
    this.at(t, 0.3, 'a', () => this.say('🦅 EAGLES!')); this.at(t, 2.4, 'b', () => this.say('🎶 I\'M FEELIN\' GLAD ALL OVER...', null, 'thud')); this.at(t, 3.6, 'c', () => this.say('*STOMP STOMP* 👏 *STOMP STOMP* 👏', null, 'thud'));
    this.at(t, 4.6, 'd', () => this.say('SOUTH LONDON AND PROUD.'));
    return { hand: { L: chorus ? 'palm' : 'open', R: chorus ? 'palm' : 'grip' }, bob: stomp * 0.02 * kH };
  }
  // ---- CHLOE: counting calories: notebook and pen, writing it all down, shaking her head at every one
  calories(t) { const r = this.c.rag, P = r.pose, scrib = Math.sin(t * 18) * 0.06;
    this.standArms('L', 1, [0.25, -0.65, 0.55], [-0.45, 0.15, 0.85]); this.standArms('R', -1, [0.3, -0.7, 0.55], [-0.15 + scrib, 0.05, 0.95]); this.legsStand(0.1);
    P.head.setFromAxisAngle(X, 0.45).multiply(_q.setFromAxisAngle(Y, Math.sin(t * 5) * 0.12 * (Math.floor(t) % 2)));
    const nb = this.prop('note', () => signMesh(0.16, 0.2, cvTex(160, 200, (c, w, h) => { c.fillStyle = '#fff8dc'; c.fillRect(0, 0, w, h); c.strokeStyle = '#9ec5ff'; for (let y = 30; y < h; y += 18) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } cvTxt(c, 'kcal', w / 2, 16, 18, '#c2185b'); ['900 ✗', '1,200 ✗', '45 ✓'].forEach((s, i) => cvTxt(c, s, w / 2, 50 + i * 36, 20, i < 2 ? '#d32f2f' : '#2e7d32')); })));
    this.inHand(nb, 'L', [0, 0.06, 0.02], [-1.2, 0, 0]);
    const pen = this.prop('pen', () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.13, 6), lam(0xc2185b)); return m; }); this.inHand(pen, 'R', [0, 0.02, 0], [Math.PI / 2, 0, 0]);
    const L = ['BURGER: 900 KCAL. ❌', 'CHIPS: 1,200. ❌❌', 'CELERY: 6. ✅', 'RONNIE: OFF THE CHART 📈'];
    for (let i = 0; i < 4; i++) this.at(t, 0.4 + i * 1.0, 'c' + i, () => this.say(L[i], null, i === 2 ? 'ting' : 'thud'));
    return { hand: { L: 'grip', R: 'grip' } }; }
  // ---- CHLOE: gym selfie: phone up high, hand on hip, a pose, flash, another pose, flash
  chester(t) {
    // CHESTER! Her cockapoo comes bounding in, leaps up into her arms, she holds him up and spins him round, he licks
    // her face, tail going like mad
    const r = this.c.rag, P = r.pose, kH = this.kH, run = clamp01(t / 1.4), leap = clamp01((t - 1.4) / 0.4), held = t > 1.8, lick = held ? Math.max(0, Math.sin(t * 9)) : 0;
    const catchK = ramp(t, 1.3, 1.6);
    this.standArms('L', 1, mixv([0.3, -0.6, 0.6], [0.25, -0.35, 0.85], catchK), mixv([0.2, -0.3, 0.9], [-0.55, 0.2, 0.75], catchK));
    this.standArms('R', -1, mixv([0.3, -0.6, 0.6], [0.25, -0.35, 0.85], catchK), mixv([0.2, -0.3, 0.9], [-0.55, 0.2, 0.75], catchK));
    r.aim('uLegL', 0.12, -1, 0.35 * (1 - catchK)); r.aim('lLegL', 0.1, -1, -0.45 * (1 - catchK)); r.aim('uLegR', -0.12, -1, 0.35 * (1 - catchK)); r.aim('lLegR', -0.1, -1, -0.45 * (1 - catchK));
    P.chest.setFromAxisAngle(X, 0.3 * (1 - catchK)); P.head.setFromAxisAngle(X, 0.25 - 0.15 * lick).multiply(_q.setFromAxisAngle(Y, Math.sin(t * 2) * 0.2 * (held ? 1 : 0)));
    const dog = this.prop('chester', dogMesh); dog.scale.setScalar(kH * 0.72);
    if (!held) { const from = this.L(-1.8, 0, -1.6), to = this.L(0, 0, 0.5); dog.position.copy(from).lerp(to, ss(run)); dog.position.y = run < 1 ? Math.abs(Math.sin(t * 12)) * 0.05 : 0;
      if (leap > 0) { const c = this.c.rag.pos('chest', new THREE.Vector3()); dog.position.lerp(c.add({ x: 0, y: -0.45, z: 0 }), ss(leap)); dog.position.y += Math.sin(leap * Math.PI) * 0.4; }
      dog.rotation.set(0, Math.atan2(to.x - from.x, to.z - from.z), 0); dog.userData.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 14 + (i % 2 ? 0 : Math.PI)) * 0.6 * (run < 1 ? 1 : 0); }); }
    else { dog.position.copy(this.L(0, 0.78, 0.32)); dog.rotation.set(0, r.yaw + Math.sin(t * 2) * 0.3, 0); dog.userData.legs.forEach((l, i) => { l.rotation.x = i < 2 ? -0.9 : 0.4; }); }
    dog.getObjectByName('tail').rotation.y = Math.sin(t * 22) * 0.6; dog.getObjectByName('head').rotation.x = held ? -0.35 - lick * 0.3 : Math.sin(t * 6) * 0.1;
    dog.getObjectByName('tongue').scale.set(1, 1 + lick * 1.2, 1); for (const sx of [-1, 1]) dog.getObjectByName('head').getObjectByName('ear' + sx).rotation.z = sx * (0.1 + Math.sin(t * 12) * 0.15);
    for (let i = 0; i < 3; i++) { const h = this.prop('hrt' + i, () => new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex(), transparent: true, depthWrite: false }))); const k = ((t * 0.6 + i / 3) % 1); h.visible = held; h.position.copy(dog.position).add({ x: Math.sin(i * 2) * 0.2, y: 0.4 + k * 0.6, z: 0 }); h.scale.setScalar(0.12 * kH); h.material.opacity = 1 - k; }
    this.at(t, 0.2, 'a', () => this.say('CHESTERRRR! 🐶')); this.at(t, 0.8, 'b', () => this.say('WOOF WOOF!', null, 'boing')); this.at(t, 1.9, 'c', () => this.say('WHO\'S A GOOD BOY?! YOU ARE!'));
    this.at(t, 3.4, 'd', () => this.say('*SLURP* ...EW. LOVE YOU.', null, 'slurp'));
    return { hand: { L: 'open', R: 'open' }, bob: -0.25 * (1 - catchK) * kH * (t < 1.4 ? ramp(t, 0.6, 1.0) : 1) };
  }
  // ---- AIDAN W: the Spurs trophy cabinet: open it up... cobwebs, dust, a tumbleweed rolls out
  spurs(t) { const r = this.c.rag, P = r.pose, kH = this.kH, open = ramp(t, 0.8, 1.4);
    this.standArms('L', 1, mixv([0.2, -1, 0.1], [0.55, -0.2, 0.75], ramp(t, 0.3, 0.8) * (1 - ramp(t, 1.5, 1.8))), [0.4, 0.05, 0.9]); this.standArms('R', -1, [0.2, -1, 0.1], [0.2, -1, 0.15]); this.legsStand(0.1);
    P.head.setFromAxisAngle(X, 0.1).multiply(_q.setFromAxisAngle(Y, 0.7 + Math.sin(t * 1.5) * 0.3 * ramp(t, 2, 2.5)));
    const cab = this.prop('cab', () => { const g = new THREE.Group(), wood = lam(0x5a3a22), glass = new THREE.MeshPhongMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.25, depthWrite: false });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.4), wood); body.position.y = 0.85; g.add(body); const inner = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.02), lam(0x1a1a1a)); inner.position.set(0, 0.9, 0.19); g.add(inner);
      for (const y of [0.55, 1.0, 1.4]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.3), lam(0x7a5a3a)); sh.position.set(0, y, 0.05); g.add(sh); }
      const sign = signMesh(0.8, 0.16, cvTex(400, 80, (c, w, h) => { c.fillStyle = '#132257'; c.fillRect(0, 0, w, h); cvTxt(c, '🐓 THFC TROPHIES', w / 2, h / 2, 36, '#fff'); })); sign.position.set(0, 1.62, 0.205); g.add(sign);
      const web = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 24 }, (_, i) => new THREE.Vector3(Math.cos(i / 2) * (i % 2 ? 0.15 : 0), 1.25 + Math.sin(i / 2) * (i % 2 ? 0.12 : 0), 0.15))), new THREE.LineBasicMaterial({ color: 0xdddddd })); g.add(web);
      for (const sx of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sx * 0.45, 0.9, 0.21); piv.name = 'door' + sx; const d = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.5, 0.02), glass); d.position.x = -sx * 0.22; piv.add(d); g.add(piv); } return g; });
    this.L(0.85, 0, 0.45, cab.position); cab.rotation.y = r.yaw - 0.55; cab.scale.setScalar(kH);
    for (const sx of [-1, 1]) cab.getObjectByName('door' + sx).rotation.y = sx * open * 1.6;
    const tw = this.prop('tumble', () => new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), new THREE.MeshBasicMaterial({ color: 0x9c7a4a, wireframe: true })));
    const k = clamp01((t - 1.6) / 2.4); tw.visible = t > 1.6; this.L(-2.5 * k, 0.12 + Math.abs(Math.sin(k * 14)) * 0.08, 0.6, tw.position); tw.rotation.z += 0.15;
    this.at(t, 0.3, 'a', () => this.say('LET\'S HAVE A LOOK AT THE TROPHIES 🏆')); this.at(t, 1.5, 'b', () => this.say('...', null, 'whistle')); this.at(t, 2.6, 'c', () => this.say('...NOTHING SINCE 2008.', null, 'sadviolin'));
    return { hand: { L: 'open', R: 'grip' } }; }
  // ---- AIDAN W: the trading card: a holo, held up to the light, then a kiss
  cards(t) { const r = this.c.rag, P = r.pose, up = ramp(t, 0.2, 0.6), kiss = ramp(t, 2.8, 3.1) * (1 - ramp(t, 3.6, 3.9));
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv(mixv([0.2, -1, 0.1], [0.12, -0.1, 0.95], up), DRINK_U, kiss), mixv(mixv([0.2, -1, 0.15], [-0.4, 0.55, 0.75], up), DRINK_L, kiss));
    this.legsStand(0.1); P.head.setFromAxisAngle(X, -0.25 * up);
    const card = this.prop('card', () => signMesh(0.09, 0.125, cvTex(180, 250, (c, w, h) => { const g2 = c.createLinearGradient(0, 0, w, h); ['#ff5ec4', '#ffd400', '#5ef1ff', '#7cff6a', '#c47bff'].forEach((col, i) => g2.addColorStop(i / 4, col)); c.fillStyle = g2; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(14, 14, w - 28, 130); c.fillStyle = '#f9a825'; c.beginPath(); c.arc(w / 2, 80, 40, 0, 7); c.fill(); cvTxt(c, 'HOLO', w / 2, 175, 34, '#111'); cvTxt(c, '1st EDITION', w / 2, 215, 18, '#111'); })));
    const a = r.grip('lArmL', new THREE.Vector3()), b = r.grip('lArmR', new THREE.Vector3()); card.position.copy(a).add(b).multiplyScalar(0.5).add({ x: 0, y: 0.06, z: 0 }); card.lookAt(this.c.headPos(new THREE.Vector3())); card.material.color.setHSL((t * 0.4) % 1, 0.6, 0.85);
    this.at(t, 0.4, 'a', () => this.say('✨ IT\'S A HOLO! ✨', null, 'ting')); this.at(t, 1.8, 'b', () => this.say('1ST EDITION. MINT. NOT FOR SALE.')); this.at(t, 3.0, 'c', () => this.say('*MWAH*', null, 'pop'));
    return { hand: { L: 'grip', R: 'grip' } }; }
  // ---- AIDAN O: "just the one": swaying, hiccupping, pint sloshing, telling everyone he loves them
  drunk(t) { const r = this.c.rag, P = r.pose, kH = this.kH, sway = Math.sin(t * 1.7), hic = Math.max(0, Math.sin(t * 2.3 + 1)) ** 12;
    this.walkLegs(t, 0.7, 0.18); this.standArms('R', -1, [0.35, -0.3 + hic * 0.2, 0.8], [0.1 + sway * 0.2, 0.2, 0.95]); this.standArms('L', 1, [0.75, -0.2 + sway * 0.3, 0.2], [0.8, 0.1, 0.3]);
    P.chest.setFromAxisAngle(Z, sway * 0.25).multiply(_q.setFromAxisAngle(X, 0.1 + hic * 0.2)); P.head.setFromAxisAngle(Z, sway * 0.4).multiply(_q.setFromAxisAngle(X, Math.sin(t * 3.1) * 0.15));
    const pint = this.prop('pint', pintG); this.inHand(pint, 'R', [0, 0.01, 0], [Math.PI / 2 + sway * 0.4, 0, 0]);
    const L = ['JUST THE ONE, LADS... *HIC*', 'I LOVE YOU LADS. I MEAN IT.', 'WHO MOVED THE FLOOR?', 'ANOTHER ROUND! *HIC*'];
    for (let i = 0; i < 4; i++) this.at(t, 0.3 + i * 1.2, 'd' + i, () => this.say(L[i], null, i % 2 ? 'boing' : 'gulp'));
    return { hand: { L: 'open', R: 'grip' }, spin: sway * 0.5, bob: -Math.abs(sway) * 0.04 * kH }; }
  // ---- AIDAN O: the 3am kebab: doner in a pitta, chilli sauce everywhere, chips falling out
  kebab(t) { const r = this.c.rag, P = r.pose, cyc = (t * 0.85) % 1, bite = Math.sin(cyc * Math.PI);
    this.standArms('R', -1, mixv([0.3, -0.7, 0.5], DRINK_U, bite), mixv([-0.2, -0.2, 0.9], DRINK_L, bite)); this.standArms('L', 1, [0.25, -0.7, 0.5], [-0.3, -0.2, 0.9]); this.legsStand(0.12);
    P.head.setFromAxisAngle(X, 0.2 - bite * 0.3).multiply(_q.setFromAxisAngle(Z, Math.sin(t * 1.4) * 0.15));
    const kb = this.prop('kebab', () => { const g = new THREE.Group(); const pitta = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10, 0, Math.PI), lam(0xe8c98a, { side: THREE.DoubleSide })); pitta.scale.set(1, 1.5, 0.55); g.add(pitta);
      const meat = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.1, 10), lam(0x8a5030)); meat.position.y = 0.04; g.add(meat);
      for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.02), lam(i % 2 ? 0x7cbf3a : 0xd32f2f)); l.position.set(Math.cos(i) * 0.03, 0.1, Math.sin(i) * 0.02); l.rotation.y = i; g.add(l); }
      const sauce = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.006, 4, 12), lam(0xc62828)); sauce.rotation.x = Math.PI / 2; sauce.position.y = 0.105; g.add(sauce); return g; });
    this.inHand(kb, 'R', [0, 0.04, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 4; i++) { const c = this.prop('chip' + i, () => new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.05), lam(0xf2c14e))); const k = ((t * 0.7 + i * 0.25) % 1); c.position.copy(kb.position).add({ x: Math.sin(i * 3) * 0.05, y: -k * 1.1, z: Math.cos(i * 3) * 0.05 }); c.rotation.set(k * 6, i, k * 4); c.visible = c.position.y > 0.02; }
    this.at(t, 0.3, 'a', () => this.say('🥙 3AM KEBAB')); this.at(t, 1.6, 'b', () => this.say('', null, 'chomp')); this.at(t, 2.6, 'c', () => this.say('BEST MEAL OF THE DAY. EVERY DAY.'));
    return { hand: { L: 'open', R: 'grip' } }; }
  // ---- DYLAN: West Ham: forever blowing bubbles... and the score: they all pop at once
  bubbles(t) { const r = this.c.rag, P = r.pose, kH = this.kH, pop = t > 3.3;
    this.standArms('R', -1, DRINK_U, DRINK_L); this.standArms('L', 1, [0.5, 0.2 + Math.sin(t * 2) * 0.2, 0.5], [0.4, 0.6, 0.6]); this.legsStand(0.1); P.head.setFromAxisAngle(X, -0.2).multiply(_q.setFromAxisAngle(Z, Math.sin(t * 2) * 0.15));
    const wand = this.prop('wand', () => { const g = new THREE.Group(); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 6), lam(0x7a263a)); s.position.y = 0.07; g.add(s); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.004, 6, 16), lam(0x1bb1e7)); ring.position.y = 0.16; g.add(ring); return g; });
    this.inHand(wand, 'R', [0, 0.02, 0], [Math.PI / 2 + 0.8, 0, 0]);
    const mouth = this.c.headPos(new THREE.Vector3());
    for (let i = 0; i < 10; i++) { const b = this.prop('bub' + i, () => new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), new THREE.MeshPhongMaterial({ color: i % 2 ? 0x9fd8ff : 0xffc6e0, transparent: true, opacity: 0.35, shininess: 120, depthWrite: false })));
      const k = ((t * 0.35 + i / 10) % 1); b.visible = !pop || t < 3.35; b.position.copy(mouth).add(this.L(Math.sin(i * 2.1) * 0.6 * k, 0, 0.3 + k * 0.9).sub(this.L(0, 0, 0)).setY(0.1 + k * 1.2)); b.scale.setScalar((0.5 + (i % 3) * 0.3) * kH); }
    const sc = this.prop('whu', () => new THREE.Sprite(new THREE.SpriteMaterial({ map: cvTex(512, 140, (c, w, h) => { c.fillStyle = '#7a263a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#1bb1e7'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10); cvTxt(c, 'WEST HAM 0 - 3', w / 2, h / 2, 56, '#fff'); }) })));
    sc.visible = pop; this.L(0, 2.3, 0.4, sc.position); sc.scale.set(1.1 * kH, 0.3 * kH, 1);
    this.at(t, 0.3, 'a', () => this.say('🎶 I\'M FOREVER BLOWING BUBBLES...')); this.at(t, 1.8, 'b', () => this.say('🎶 PRETTY BUBBLES IN THE AIR...'));
    this.at(t, 3.3, 'c', () => this.say('*POP POP POP*', null, 'pop')); this.at(t, 3.9, 'd', () => this.say('...THEY FLY SO HIGH, THEY NEARLY REACH THE SKY... THEN LOSE 3-0.', null, 'sadviolin'));
    return { hand: { L: 'open', R: 'grip' } }; }
  // ---- IAN: the big catch... reeling in, heaving, and out flies an old boot
  boot(t) { const r = this.c.rag, P = r.pose, kH = this.kH, heave = Math.sin(t * 5) * 0.5 + 0.5, out = clamp01((t - 2.6) / 0.9);
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.15, -0.2 + heave * 0.25 * (1 - out), 0.85], [-0.25, 0.3 + heave * 0.3 * (1 - out), 0.9]);
    r.aim('uLegL', 0.15, -1, -0.25 * (1 - out)); r.aim('lLegL', 0.12, -1, 0.1); r.aim('uLegR', -0.15, -1, 0.35 * (1 - out)); r.aim('lLegR', -0.12, -1, -0.3 * (1 - out));
    P.chest.setFromAxisAngle(X, -0.3 * heave * (1 - out)); P.head.setFromAxisAngle(X, -0.2);
    const rod = this.prop('rod', () => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.012, 1.6, 6), lam(0x2a2a2a)); m.position.y = 0.8; g.add(m); return g; });
    r.grip('lArmR', rod.position); const d = new THREE.Vector3(0, 0.75 + heave * 0.2 * (1 - out), 0.66).normalize().applyAxisAngle(Y, r.yaw); rod.quaternion.setFromUnitVectors(Y, d); rod.scale.setScalar(1 - 0.25 * heave * (1 - out));
    const tip = rod.position.clone().addScaledVector(d, 1.6);
    const boot = this.prop('boot', () => { const g = new THREE.Group(), lea = lam(0x4a3220); const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.12), lea); leg.position.y = 0.16; g.add(leg); const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.28), lea); foot.position.set(0, 0.04, 0.08); g.add(foot);
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.02, 0.29), lam(0x111111)); sole.position.set(0, 0, 0.08); g.add(sole); const weed = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 4, 10), lam(0x3a7a2a)); weed.position.set(0, 0.27, 0); g.add(weed); return g; });
    const far = this.L(0, -0.4, 4), land = this.L(0.4, 0, 0.7), mid = far.clone().lerp(land, out); mid.y = out < 1 ? -0.4 + Math.sin(out * Math.PI) * 2 + out * 0.4 : 0; boot.position.copy(mid); boot.rotation.set(out * 8, r.yaw, 0); boot.visible = out > 0;
    const line = this.prop('line', () => new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xdddddd })));
    const lp = line.geometry.attributes.position; lp.setXYZ(0, tip.x, tip.y, tip.z); const e = out > 0 ? boot.position : far; lp.setXYZ(1, e.x, Math.max(e.y, 0), e.z); lp.needsUpdate = true;
    this.at(t, 0.3, 'a', () => this.say('IT\'S A BIG ONE! IT\'S A BIG ONE!!')); this.at(t, 2.7, 'b', () => this.say('', null, 'whoosh')); this.at(t, 3.6, 'c', () => this.say('...A BOOT. AGAIN. CANVEY LAKE.', null, 'thud'));
    return { hand: { L: 'grip', R: 'grip' } }; }
  // ---- OLIVER: Lidl security: hi-vis on, walkie-talkie, deadly serious
  security(t) { const r = this.c.rag, P = r.pose, kH = this.kH, talk = Math.abs(Math.sin(t * 9)) * 0.1;
    this.standArms('R', -1, DRINK_U, DRINK_L); this.standArms('L', 1, [0.35, -0.3, 0.85], [-0.05, 0.05, 1]); this.legsStand(0.16); P.head.setFromAxisAngle(Y, Math.sin(t * 1.3) * 0.5).multiply(_q.setFromAxisAngle(X, -talk));
    const w = this.prop('walkie', () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.03), lam(0x1a1a1a))); const a = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 6), lam(0x1a1a1a)); a.position.set(0.015, 0.1, 0); g.add(a); const led = new THREE.Mesh(new THREE.SphereGeometry(0.005), new THREE.MeshBasicMaterial({ color: 0xff2222 })); led.position.set(-0.01, 0.055, 0.016); g.add(led); return g; });
    this.inHand(w, 'R', [0, 0.04, 0], [0, 0, 0]);
    // the hi-vis: his own top painted fluorescent yellow (so it fits him exactly), the SECURITY lettering on the back,
    // a badge on the front, sitting right on the surface of his chest
    kitRag(this, 0xe6ff00, 0.52, 0.83);
    const cd = ((r.parts.chest.def.half && r.parts.chest.def.half[2]) || 0.13) / kH;
    const back = this.prop('vb', () => signMesh(0.24, 0.07, cvTex(256, 76, (c, w2, h) => { c.fillStyle = '#c0c0c0'; c.fillRect(0, 0, w2, 8); c.fillRect(0, h - 8, w2, 8); cvTxt(c, 'SECURITY', w2 / 2, h / 2 + 2, 44, '#111'); })));
    this.onChest(back, 0, 0.1, -(cd + 0.012), Math.PI);
    const badge = this.prop('vf', () => signMesh(0.07, 0.04, cvTex(128, 72, (c, w2, h) => { c.fillStyle = '#0050aa'; c.fillRect(0, 0, w2, h); c.fillStyle = '#ffe000'; c.fillRect(8, 8, w2 - 16, h - 16); cvTxt(c, 'LIDL', w2 / 2, h / 2 + 2, 30, '#d00'); })));
    this.onChest(badge, -0.06, 0.12, cd + 0.012, 0);
    const L = ['📻 CODE RED. AISLE FOUR.', 'A MAN EATING CRISPS. OPEN. NOT PAID.', 'I\'M GOING IN. OVER.', '...HE\'S BIGGER THAN ME. OVER.'];
    for (let i = 0; i < 4; i++) this.at(t, 0.3 + i * 1.05, 's' + i, () => this.say(L[i], null, 'psst'));
    return { hand: { L: 'point', R: 'grip' } }; }
  // ---- OLIVER: the unboxing video: crouch, rip it open, the FAKE shock face... it's a spatula
  unbox(t) { const r = this.c.rag, P = r.pose, kH = this.kH, crouch = ramp(t, 0.2, 0.6) * (1 - ramp(t, 2.4, 2.8)), open = ramp(t, 1.0, 1.5), shock = ramp(t, 2.6, 2.9);
    r.aim('uLegL', 0.15, -1, 0.95 * crouch); r.aim('lLegL', 0.12, -1, -1.2 * crouch); r.aim('uLegR', -0.15, -1, 0.95 * crouch); r.aim('lLegR', -0.12, -1, -1.2 * crouch);
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv([0.25, -0.6, 0.75], [0.35, 0.6, 0.6], shock), mixv([0.1, -0.7, 0.75], [-0.45, 0.85, 0.2], shock));
    P.chest.setFromAxisAngle(X, 0.5 * crouch - 0.15 * shock); P.head.setFromAxisAngle(X, 0.4 * crouch - 0.2 * shock);
    const box = this.prop('box', () => { const g = new THREE.Group(), card = lam(0xc49a6c); const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.4), card); b.position.y = 0.2; g.add(b);
      const tape = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.402, 0.402), lam(0xd9c49a)); tape.position.y = 0.2; g.add(tape);
      for (const sx of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sx * 0.25, 0.4, 0); piv.name = 'flap' + sx; const f = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.01, 0.4), card); f.position.x = -sx * 0.125; piv.add(f); g.add(piv); }
      const sp = new THREE.Group(); sp.name = 'spat'; const h = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.2, 6), lam(0x222222)); h.position.y = 0.1; sp.add(h); const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.008), lam(0x444444)); head.position.y = 0.24; sp.add(head); g.add(sp); return g; });
    this.L(0, 0, 0.55, box.position); box.rotation.y = r.yaw; box.scale.setScalar(kH);
    for (const sx of [-1, 1]) box.getObjectByName('flap' + sx).rotation.z = sx * -open * 2.2;
    const sp = box.getObjectByName('spat'); sp.position.y = 0.1 + ramp(t, 1.6, 2.4) * 0.55; sp.rotation.z = Math.sin(t * 4) * 0.2;
    this.at(t, 0.3, 'a', () => this.say('HEY GUYS! UNBOXING TIME 📦')); this.at(t, 1.2, 'b', () => this.say('*RIIIP*', null, 'squish')); this.at(t, 2.7, 'c', () => this.say('😱 OH. MY. GOD.', null, 'fanfare')); this.at(t, 3.7, 'd', () => this.say('...IT\'S A SPATULA. LIKE AND SUBSCRIBE.'));
    return { hand: { L: shock > 0.5 ? 'open' : 'grip', R: shock > 0.5 ? 'open' : 'grip' }, bob: -0.35 * crouch * kH }; }
  // ---- NOAH: scrum down: crouch, bind, set... HEAVE (legs driving)
  scrum(t) { const r = this.c.rag, P = r.pose, kH = this.kH, down = ramp(t, 0.3, 0.9), drive = t > 2.2 ? Math.sin(t * 9) : 0;
    r.aim('uLegL', 0.2, -1, 0.9 * down + drive * 0.2); r.aim('lLegL', 0.15, -1, -0.8 * down); r.aim('uLegR', -0.2, -1, 0.9 * down - drive * 0.2); r.aim('lLegR', -0.15, -1, -0.8 * down);
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv([0.2, -1, 0.1], [0.75, -0.1, 0.6], down), mixv([0.2, -1, 0.15], [-0.55, 0, 0.85], down));
    P.pelvis.setFromAxisAngle(X, 0.5 * down); P.chest.setFromAxisAngle(X, 0.85 * down); P.head.setFromAxisAngle(X, -0.7 * down);
    this.at(t, 0.3, 'a', () => this.say('CROUCH...')); this.at(t, 1.0, 'b', () => this.say('BIND...')); this.at(t, 1.7, 'c', () => this.say('SET!', null, 'thud')); this.at(t, 2.3, 'd', () => this.say('💪 HEEEAAAVE!!', null, 'jet'));
    return { hand: { L: 'grip', R: 'grip' }, bob: (-0.35 * down + Math.abs(drive) * 0.02) * kH }; }
  // ---- NOAH: the protein shake: a massive shaker, shaken like mad, then necked
  tryline(t) {
    // TRY TIME: a run at the line with the ball tucked under his arm, a dive over it, ball grounded with both hands, up
    // with the arms in the air while the crowd goes up
    const r = this.c.rag, P = r.pose, kH = this.kH, dive = ramp(t, 1.5, 1.85), up = ramp(t, 3.0, 3.5), ground = dive * (1 - up);
    if (t < 1.5) { const s = this.walkLegs(t, 2.6, 0.5); this.standArms('L', 1, [0.25, -0.5, 0.3], [-0.6, 0.1, 0.6]); this.standArms('R', -1, [0.15, -0.7, -0.6 * s], [0.1, -0.2, 1]); P.chest.setFromAxisAngle(X, 0.35); }
    else if (up < 0.5) { for (const [S, sx] of [['L', 1], ['R', -1]]) { this.standArms(S, sx, [0.15, 0.95, 0.2], [0.1, 0.98, 0.1]); r.aim('uLeg' + S, sx * 0.1, -1, -0.2); r.aim('lLeg' + S, sx * 0.08, -1, 0); } P.head.setFromAxisAngle(X, -0.5); }
    else { this.legsStand(0.14); for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.35, 0.9, 0.1], [0.3, 0.95, 0.05]); P.head.setFromAxisAngle(X, -0.3); }
    const ball = this.prop('rball', () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), lam(0xf4f0e6)); b.scale.set(0.62, 0.62, 1); g.add(b);
      for (const z of [-0.05, 0.05]) { const st = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.006, 4, 18), lam(0xc8102e)); st.position.z = z; g.add(st); } const lc = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.004, 0.08), lam(0x2a2a2a)); lc.position.y = 0.063; g.add(lc); return g; });
    if (t < 1.5) this.inHand(ball, 'L', [0, 0.04, 0], [0, 0, 0]); else { const at = this.L(0, 0.06, 1.5); ball.position.copy(at); ball.rotation.set(0, r.yaw, 0); }
    // the try line and the posts beyond it
    const posts = this.prop('posts', () => { const g = new THREE.Group(), w = lam(0xffffff); for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.2, 10), w); p.position.set(sx * 1.4, 2.1, 0); g.add(p); const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.2, 12), lam(0xc8102e)); pad.position.set(sx * 1.4, 0.6, 0); g.add(pad); }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.8, 10), w); bar.rotation.z = Math.PI / 2; bar.position.y = 1.5; g.add(bar); const line = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff })); line.rotation.x = -Math.PI / 2; line.position.set(0, 0.012, 4.0); g.add(line); return g; });
    this.L(0, 0, -2.6, posts.position); posts.rotation.y = r.yaw; posts.scale.setScalar(kH);
    this.at(t, 0.2, 'a', () => this.say('🏉 GIVE IT TO THE BIG MAN!')); this.at(t, 1.6, 'b', () => this.say('', null, 'thud')); this.at(t, 2.0, 'c', () => this.say('TRYYYYY!!', null, 'fanfare')); this.at(t, 3.4, 'd', () => this.say('THAT\'S FIVE POINTS, RON. FIVE.', null, 'siu'));
    return { hand: { L: t < 1.5 ? 'grip' : 'open', R: 'open' }, flip: Math.PI / 2 * ground, bob: (-0.78 * ground + (t < 1.5 ? Math.abs(Math.sin(t * 8)) * 0.03 : 0)) * kH, full: true };
  }
  // ---- ALFIE: the Chelsea project: signing contract after contract, the pile getting taller and taller
  signing(t) {
    // SIGNING DAY: the contract on the desk, pen, signed with a flourish, then the shirt held up for the cameras (ALFIE
    // 10), flashes going off. HERE WE GO.
    const r = this.c.rag, P = r.pose, kH = this.kH, sign = t < 1.8, scrib = Math.sin(t * 16) * 0.05, show = ramp(t, 1.9, 2.3);
    if (sign) { this.standArms('R', -1, [0.3, -0.7, 0.55], [-0.15 + scrib, -0.45, 0.85]); this.standArms('L', 1, [0.25, -0.75, 0.45], [-0.3, -0.5, 0.8]); P.chest.setFromAxisAngle(X, 0.3); P.head.setFromAxisAngle(X, 0.5); }
    else { for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv([0.25, -0.75, 0.45], [0.3, 0.35, 0.85], show), mixv([-0.3, -0.5, 0.8], [-0.1, 0.55, 0.8], show)); P.head.setFromAxisAngle(X, -0.1); }
    this.legsStand(0.12);
    const desk = this.prop('sdesk', () => { const g = new THREE.Group(); const top = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.5), lam(0x034694)); top.position.y = 0.78; g.add(top); const front = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.74, 0.02), lam(0x022a5a)); front.position.set(0, 0.39, 0.24); g.add(front);
      const lg = signMesh(0.3, 0.3, cvTex(128, 128, (c) => { c.fillStyle = '#034694'; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill(); c.strokeStyle = '#d4af37'; c.lineWidth = 6; c.stroke(); cvTxt(c, '🦁', 64, 60, 60, '#fff'); cvTxt(c, 'CFC', 64, 108, 18, '#fff'); })); lg.position.set(0, 0.45, 0.252); g.add(lg);
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.28), new THREE.MeshBasicMaterial({ map: cvTex(150, 200, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); cvTxt(c, 'CONTRACT', w / 2, 20, 16, '#034694'); c.fillStyle = '#999'; for (let y = 40; y < 170; y += 10) c.fillRect(14, y, w - 28, 2); c.strokeStyle = '#034694'; c.lineWidth = 3; c.beginPath(); c.moveTo(20, 186); c.bezierCurveTo(50, 160, 70, 200, 130, 180); c.stroke(); }) })); paper.rotation.x = -Math.PI / 2; paper.position.set(0, 0.805, 0); g.add(paper);
      const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.12, 8), lam(0x111111)); mic.position.set(0.35, 0.86, 0); g.add(mic); return g; });
    this.L(0, 0, 0.55, desk.position); desk.rotation.y = r.yaw + Math.PI; desk.scale.setScalar(kH);
    const pen = this.prop('pen', () => new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.004, 0.14, 6), lam(0xd4af37))); pen.visible = sign; if (sign) this.inHand(pen, 'R', [0, 0.02, 0], [Math.PI / 2, 0, 0]);
    const shirt = this.prop('cshirt', () => { const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, map: cvTex(256, 256, (c, w, h) => { c.fillStyle = '#034694'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(0, 0, w, 14); cvTxt(c, 'ALFIE', w / 2, 70, 44, '#fff'); cvTxt(c, '10', w / 2, 160, 120, '#fff'); }) });
      const body = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.62), m); g.add(body); for (const sx of [-1, 1]) { const sl = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.18), lam(0x034694, { side: THREE.DoubleSide })); sl.position.set(sx * 0.33, 0.2, 0); sl.rotation.z = sx * -0.6; g.add(sl); } return g; });
    const a = r.grip('lArmL', new THREE.Vector3()), b = r.grip('lArmR', new THREE.Vector3()); shirt.visible = !sign; shirt.position.copy(a).add(b).multiplyScalar(0.5).add({ x: 0, y: -0.2, z: 0 }); shirt.rotation.set(0, r.yaw, 0); shirt.scale.setScalar(kH);
    for (let i = 0; i < 4; i++) { const f = this.prop('fl' + i, () => new THREE.Sprite(new THREE.SpriteMaterial({ map: cvTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); }), transparent: true, depthWrite: false })));
      const k = ((t * 1.3 + i * 0.31) % 1); f.visible = !sign && k < 0.12; f.position.copy(this.L(-1.2 + i * 0.8, 1.5 + (i % 2) * 0.3, 2.4)); f.scale.setScalar(0.5); }
    this.at(t, 0.3, 'a', () => this.say('✍️ WHERE DO I SIGN?')); this.at(t, 1.6, 'b', () => this.say('', null, 'ting')); this.at(t, 2.0, 'c', () => this.say('🔵 HERE WE GO! 🔵', null, 'fanfare'));
    this.at(t, 3.3, 'd', () => this.say('EIGHT-YEAR CONTRACT. I\'M 47 WHEN IT ENDS.'));
    return { hand: { L: sign ? 'open' : 'grip', R: 'grip' } };
  }
  // ---- ALFIE: the back piece: turns round to show off his "dragon"... it's just the tail
  tattoo(t) {
    // the back piece: shirt off, face down on the tattoo bed, the tattooist leans in with the gun buzzing... the needle
    // touches his back and he's straight up off the bed: OWWW! TOO PAINFUL. NOPE.
    const r = this.c.rag, P = r.pose, kH = this.kH, touch = 2.6, up = ramp(t, touch, touch + 0.35), lie = 1 - up;
    kitRag(this, skinColour(r), 0.5, 0.86);
    if (lie > 0.5) { for (const [S, sx] of [['L', 1], ['R', -1]]) { this.standArms(S, sx, [0.4, 0.9, 0.1], [0.25, 0.95, 0.1]); r.aim('uLeg' + S, sx * 0.06, -1, 0); r.aim('lLeg' + S, sx * 0.05, -1, 0); } P.head.setFromAxisAngle(Y, 0.6); }
    else { const s = this.walkLegs(t, 2.6, 0.5); for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.5, 0.75, 0.3], [0.4, 0.85, 0.3]); P.head.setFromAxisAngle(X, -0.3); void s; }
    const bed = this.prop('tbed', () => { const g = new THREE.Group(); const pad = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 1.95), lam(0x1a1a1a)); pad.position.y = 0.7; g.add(pad); const paper = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.005, 1.8), lam(0xf4f4f4)); paper.position.y = 0.765; g.add(paper);
      for (const [x, z] of [[-0.25, -0.85], [0.25, -0.85], [-0.25, 0.85], [0.25, 0.85]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.64, 8), lam(0xb8bcc2)); l.position.set(x, 0.32, z); g.add(l); }
      const lamp = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 8), lam(0x222222)); pole.position.set(0.55, 0.8, -0.3); lamp.add(pole); const head = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.1, 16), lam(0xf0f0f0, { emissive: 0x666666 })); head.position.set(0.4, 1.6, -0.3); head.rotation.z = 0.6; lamp.add(head); g.add(lamp);
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.25), lam(0xb8bcc2)); tray.position.set(-0.6, 0.85, 0.2); g.add(tray); for (let i = 0; i < 5; i++) { const ink = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.05, 8), lam([0x111111, 0xc62828, 0x1565c0, 0x2e7d32, 0xffd400][i])); ink.position.set(-0.72 + i * 0.06, 0.885, 0.2); g.add(ink); }
      const tstand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 8), lam(0x222222)); tstand.position.set(-0.6, 0.42, 0.2); g.add(tstand); return g; });
    this.L(0, 0, 0.25, bed.position); bed.rotation.y = r.yaw; bed.scale.setScalar(kH);
    // the tattooist: black tee, sleeves of tattoos, a beard, gloves, leaning over with the gun
    const tt = this.prop('tatman', () => { const g = new THREE.Group(), blk = lam(0x161616), skin = lam(0xd9a07a), ink = lam(0x2a4a6a);
      const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.65, 4, 8), lam(0x2a2a3a)); legs.position.y = 0.42; g.add(legs); const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.42, 4, 10), blk); torso.position.y = 1.15; torso.rotation.x = 0.35; torso.name = 'torso'; g.add(torso);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), skin); head.position.set(0, 1.55, 0.18); g.add(head); const beard = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, Math.PI * 0.5), lam(0x2a1a10)); beard.position.set(0, 1.5, 0.22); g.add(beard);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), blk); cap.position.set(0, 1.58, 0.17); g.add(cap);
      for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.4, 4, 8), ink); arm.position.set(sx * 0.24, 1.15, 0.28); arm.rotation.x = -1.1; g.add(arm); const glove = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), lam(0x222222)); glove.position.set(sx * 0.2, 1.0, 0.5); g.add(glove); }
      const gun = new THREE.Group(); gun.name = 'gun'; const gb = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.14, 10), lam(0x8a2a2a)); gb.rotation.x = Math.PI / 2; gun.add(gb); const nd = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.05, 4), lam(0xdddddd)); nd.rotation.x = Math.PI / 2; nd.position.z = 0.09; gun.add(nd); gun.position.set(-0.2, 1.02, 0.56); g.add(gun); return g; });
    const lean = ramp(t, 0.8, touch); this.L(0.75, 0, 0.35, tt.position); tt.rotation.y = r.yaw - Math.PI / 2; tt.scale.setScalar(kH); tt.getObjectByName('gun').position.y = 1.02 - lean * 0.12 + Math.sin(t * 60) * 0.004 * lean;
    tt.visible = true;
    this.at(t, 0.2, 'a', () => this.say('THE BACK PIECE. A DRAGON. THE WHOLE BACK.')); this.at(t, 1.2, 'b', () => this.say('*BZZZZZZZZ*', null, 'jet')); this.at(t, touch, 'c', () => this.say('OWWWWW!!', null, 'smash'));
    this.at(t, touch + 0.8, 'd', () => this.say('TOO PAINFUL. NOPE. NOPE NOPE NOPE.', null, 'boing'));
    return { hand: { L: 'open', R: 'open' }, flip: Math.PI / 2 * lie, bob: (-0.08 * lie + Math.sin(up * Math.PI) * 0.35) * kH, full: true };
  }
  // ---- CONNOR: the slip: running in for the big moment... banana skin, legs up, flat on his back
  slip(t) {
    // THE GERRARD SLIP (Anfield, April 2014): full Liverpool kit, the 8 and the armband. Sakho's pass rolls in, he goes
    // to take it... it runs under his foot, his standing leg goes and he's down on his backside. He scrambles, can't get
    // up, and Demba Ba is away, all the way through, and slots it. Then the long chase back that's never going to make it
    const r = this.c.rag, P = r.pose, kH = this.kH, go = ramp(t, 0.85, 1.1), sit = ramp(t, 0.95, 1.25) * (1 - ramp(t, 2.5, 2.9)), chase = ramp(t, 2.7, 3.0);
    kitRag(this, 0xc8102e, 0.08, 0.84);
    const scr = t > 1.3 && t < 2.6 ? Math.sin(t * 11) : 0;
    if (t < 0.85) { this.legsStand(0.13); for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.35, -0.85, 0.2], [0.3, -0.8, 0.4]); P.head.setFromAxisAngle(X, 0.45).multiply(_q.setFromAxisAngle(Y, -0.5 * (1 - ramp(t, 0.4, 0.8)))); }
    else if (sit > 0.05 || t < 2.6) {
      // the right foot goes to the ball and slides on, the left skids out: arms fly up, then back to the floor behind him
      r.aim('uLegR', -0.12, mixv([-1, 0.3], [-0.25, 1], sit)[0], mixv([-1, 0.3], [-0.25, 1], sit)[1]); r.aim('lLegR', -0.1, -0.15 + scr * 0.08, 1);
      r.aim('uLegL', 0.14, -0.35 - scr * 0.15, 0.95); r.aim('lLegL', 0.1, -0.6 + scr * 0.3, 0.75 - scr * 0.2);
      const fly = ramp(t, 0.85, 1.0) * (1 - ramp(t, 1.05, 1.25));
      for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv([0.4, -0.75, -0.45 - (S === 'L' ? scr : -scr) * 0.15], [0.7, 0.6, 0.2], fly), mixv([0.3, -0.9, -0.3], [0.6, 0.75, 0.2], fly));
      P.head.setFromAxisAngle(X, -0.2 + 0.15 * scr).multiply(_q.setFromAxisAngle(Y, 0.8 * ramp(t, 1.5, 1.9)));     // (watching Ba go)
    } else { this.walkLegs(t, 2.6, 0.55 * chase); for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.2, -0.8, 0.45 * Math.sin(t * 16) * sx], [0.15, -0.3, 0.95]); P.chest.setFromAxisAngle(X, 0.2); P.head.setFromAxisAngle(Y, 0.9).multiply(_q.setFromAxisAngle(X, 0.25)); }
    // the 8 on his back, the captain's armband
    const num = this.prop('lfc8', () => signMesh(0.16, 0.2, cvTex(96, 120, (c, w, h) => { cvTxt(c, 'GERRARD', w / 2, 14, 15, '#fff'); cvTxt(c, '8', w / 2, 72, 84, '#fff'); })));
    const cd = ((r.parts.chest.def.half && r.parts.chest.def.half[2]) || 0.13) / kH; this.onChest(num, 0, 0.06, -(cd + 0.012), Math.PI);
    const crest = this.prop('lfc', () => signMesh(0.06, 0.07, cvTex(80, 96, (c) => { cvTxt(c, '🐦', 40, 40, 50, '#f6eb61'); cvTxt(c, 'LFC', 40, 84, 20, '#f6eb61'); }))); this.onChest(crest, -0.06, 0.12, cd + 0.012, 0);
    const band = this.prop('armband', () => new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.05, 14, 1, true), lam(0xffd400, { side: THREE.DoubleSide })));
    r.pos('uArmL', band.position); r.partQuat('uArmL', band.quaternion); band.scale.setScalar(kH);
    // the pass, the ball under his foot, Ba taking it on and away to the goal
    const ball = this.prop('fball', () => { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true })); b.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.112, 0), new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true }))); return b; });
    const ba = this.prop('ba', () => { const g = kidMesh(0x034694, 0x111111, false, 1.15); g.traverse(o => { if (o.isMesh && o.material.color && o.material.color.getHex() === 0xf0c4a4) o.material = lam(0x5a3a22); }); const n = signMesh(0.14, 0.16, cvTex(96, 110, (c, w) => { cvTxt(c, 'BA', w / 2, 14, 16, '#fff'); cvTxt(c, '19', w / 2, 70, 66, '#fff'); })); n.position.set(0, 1.25, -0.16); n.rotation.y = Math.PI; g.add(n); return g; });
    const goal = this.prop('goal', () => { const g = new THREE.Group(), w = lam(0xffffff), W = 3.2, Hh = 1.6, D = 1.0;
      for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, Hh, 10), w); p.position.set(sx * W / 2, Hh / 2, 0); g.add(p); }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, W, 10), w); bar.rotation.z = Math.PI / 2; bar.position.y = Hh; g.add(bar);
      const net = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, D, 16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.45 })); net.position.set(0, Hh / 2, D / 2); net.name = 'net'; g.add(net); return g; });
    this.L(-3.6, 0, -3.6, goal.position); goal.rotation.y = r.yaw - Math.PI * 0.75; goal.scale.setScalar(kH);
    const pass0 = this.L(2.6, 0.11, 1.1), foot = this.L(0.05, 0.11, 0.3), under = this.L(-0.35, 0.11, -0.45), baPick = this.L(-0.6, 0, -0.8), shot = this.L(-2.6, 0, -2.6), net = this.L(-3.9, 0.3, -3.6);
    if (t < 0.85) ball.position.copy(pass0).lerp(foot, ss(t / 0.85));
    else if (t < 1.65) ball.position.copy(foot).lerp(under, clamp01((t - 0.85) / 0.8));
    else if (t < 3.1) { const k = (t - 1.65) / 1.45; ball.position.copy(under).lerp(shot, k).add(this.L(0, 0, 0.3).sub(this.L(0, 0, 0)).multiplyScalar(0)); ball.position.y = 0.11; }
    else ball.position.copy(shot).setY(0.11).lerp(net, clamp01((t - 3.1) / 0.3));
    ball.rotation.x += 0.25; ball.scale.setScalar(kH);
    const baFrom = this.L(1.8, 0, -1.6); let bp;
    if (t < 1.65) bp = baFrom.clone().lerp(baPick, ss(clamp01((t - 0.9) / 0.75))); else bp = baPick.clone().lerp(shot, clamp01((t - 1.65) / 1.45));
    ba.visible = t > 0.9; const dir = t < 1.65 ? baPick.clone().sub(baFrom) : shot.clone().sub(baPick); ba.position.copy(bp); ba.rotation.y = Math.atan2(dir.x, dir.z); walkKid(ba, t * 15); ba.scale.setScalar(kH);
    goal.getObjectByName('net').scale.z = 1 + (t > 3.4 ? Math.max(0, 0.35 - (t - 3.4) * 0.6) : 0);
    const card = this.prop('slipcard', () => new THREE.Sprite(new THREE.SpriteMaterial({ map: cvTex(640, 200, (c, w, h) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c8102e'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10); cvTxt(c, 'GERRARD HAS SLIPPED...', w / 2, 70, 50, '#fff'); cvTxt(c, '...DEMBA BA IS IN HERE!', w / 2, 140, 46, '#4fc3ff'); }) })));
    card.visible = t > 1.4; this.L(0, 2.35, 0.2, card.position); card.scale.set(1.3 * kH, 0.41 * kH, 1);
    this.at(t, 0.15, 'a', () => this.say('THIS DOES NOT SLIP. WE GO TO NORWICH, WE DO THE SAME.')); this.at(t, 0.95, 'b', () => this.say('WHOA—', null, 'boing')); this.at(t, 1.15, 'c', () => this.say('', null, 'thud'));
    this.at(t, 1.5, 'd', () => this.say('🎙️ GERRARD HAS SLIPPED!', null, 'whistle')); this.at(t, 2.2, 'e', () => this.say('🎙️ ...AND DEMBA BA IS IN HERE!'));
    this.at(t, 3.4, 'f', () => this.say('🎙️ ...AND HE SCORES. 0-1.', null, 'sadviolin'));
    return { hand: { L: 'open', R: 'open' }, bob: (-0.7 * sit) * kH, flip: -0.55 * sit, full: true };
  }
  // ---- RONNIE: the fridge raid: the fridge, the light, everything out of it and into him
  fridge(t) { const r = this.c.rag, P = r.pose, kH = this.kH, open = ramp(t, 0.4, 0.9), cyc = (t * 0.9) % 1, eat = t > 1.2 ? Math.sin(cyc * Math.PI) : 0, n = Math.floor(t * 0.9);
    this.standArms('R', -1, DRINK_U.map((v, i) => v * eat + [0.3, -0.9, 0.2][i] * (1 - eat)), DRINK_L.map((v, i) => v * eat + [0.2, -0.95, 0.2][i] * (1 - eat))); this.standArms('L', 1, [0.95, 0.15, 0.25], [0.95, 0.25, 0.2]); this.legsStand(0.14); P.chest.setFromAxisAngle(Z, 0.12 * (1 - eat)); P.head.setFromAxisAngle(Y, 0.7 * (1 - eat)).multiply(_q.setFromAxisAngle(X, 0.1 - eat * 0.2));
    const f = this.prop('fridge', () => { const g = new THREE.Group(), white = lam(0xf2f2f2); const b = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.8, 0.65), white); b.position.y = 0.9; g.add(b); const inn = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.7, 0.02), new THREE.MeshBasicMaterial({ color: 0xfff6d0 })); inn.position.set(0, 0.92, 0.325); g.add(inn);
      ['🍔', '🍰', '🍕', '🌭', '🍗', '🧀'].forEach((e, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cvTex(64, 64, (c) => { c.font = '50px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e, 32, 36); }) })); s.scale.setScalar(0.18); s.position.set(-0.18 + (i % 3) * 0.18, 0.55 + Math.floor(i / 3) * 0.45, 0.35); s.name = 'f' + i; g.add(s); });
      const piv = new THREE.Group(); piv.position.set(0.375, 0.9, 0.33); piv.name = 'door'; const d = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.8, 0.05), white); d.position.x = -0.375; piv.add(d); g.add(piv); return g; });
    this.L(0.95, 0, 0.05, f.position); f.rotation.y = r.yaw;      // (beside him, open towards whoever's watching, so you see him raid it)
    f.scale.setScalar(kH); f.getObjectByName('door').rotation.y = open * 1.8;
    for (let i = 0; i < 6; i++) f.getObjectByName('f' + i).visible = i >= n;
    if (n !== this.lastBeat && t > 1.2) { this.lastBeat = n; this.say(['🌙 MIDNIGHT SNACK', 'AND THAT', 'AND THAT ONE', 'IS THERE MORE?'][n % 4], null, 'chomp'); }
    return { hand: { L: 'open', R: 'grip' } }; }
  // ---- RONNIE: the food coma: big stretch and yawn, a pat of the belly, flat out, snoring
  nap(t) { const r = this.c.rag, P = r.pose, kH = this.kH, yawn = ramp(t, 0.2, 0.7) * (1 - ramp(t, 1.4, 1.8)), down = ramp(t, 1.9, 2.5);
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv(mixv([0.2, -1, 0.1], [0.3, 0.95, 0], yawn), [0.3, -0.6, 0.6], down), mixv(mixv([0.2, -1, 0.15], [0.2, 0.98, 0], yawn), [-0.6, -0.1, 0.6], down));
    this.legsStand(0.12); P.head.setFromAxisAngle(X, -0.4 * yawn);
    for (let i = 0; i < 3; i++) { const z = this.prop('z' + i, () => new THREE.Sprite(new THREE.SpriteMaterial({ map: cvTex(64, 64, (c) => cvTxt(c, 'Z', 32, 34, 52, '#9fd8ff')), transparent: true, depthWrite: false })));
      const k = ((t * 0.5 + i / 3) % 1), hp = this.c.headPos(new THREE.Vector3()); z.visible = down > 0.8; z.position.copy(hp).add({ x: k * 0.3, y: 0.15 + k * 0.6, z: 0 }); z.scale.setScalar((0.1 + k * 0.15) * kH); z.material.opacity = 1 - k; }
    this.at(t, 0.3, 'a', () => this.say('*YAAAWN*')); this.at(t, 1.6, 'b', () => this.say('FOOD COMA. NIGHT LADS.')); this.at(t, 2.8, 'c', () => this.say('💤 ZZZZZ...', null, 'bwoomp'));
    const lie = this.lieBack(down);
    return { hand: { L: 'open', R: 'open' }, bob: lie.bob, flip: lie.flip, full: true }; }

  // ---- ALFIE: the nutmeg: a ball at his feet, step-overs, then through the legs
  topbins(t) {
    // TOP BINS: a touch, a step back, the strike... it bends into the top corner, the net bulges, and the knee slide
    const r = this.c.rag, P = r.pose, kH = this.kH, strike = ramp(t, 0.9, 1.15), slide = ramp(t, 2.2, 2.6), turn = 1 - ramp(t, 1.9, 2.3);
    if (slide < 0.1) { const back = ramp(t, 0.4, 0.9) * (1 - strike);
      r.aim('uLegR', -0.1, -Math.cos(-0.6 * back + 1.1 * strike), Math.sin(-0.6 * back + 1.1 * strike)); r.aim('lLegR', -0.08, -Math.cos(-1.0 * back + 0.9 * strike), Math.sin(-1.0 * back + 0.9 * strike)); r.aim('uLegL', 0.12, -1, 0.1); r.aim('lLegL', 0.1, -1, 0);
      for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.7, -0.2, sx > 0 ? 0.3 : -0.3], [0.7, -0.1, 0.2]); P.chest.setFromAxisAngle(X, 0.2 - 0.25 * strike); P.head.setFromAxisAngle(X, 0.3 - 0.4 * strike); }
    else { r.aim('uLegL', 0.15, -0.2, 1); r.aim('lLegL', 0.12, -1, 0); r.aim('uLegR', -0.15, -0.2, 1); r.aim('lLegR', -0.12, -1, 0); for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.8, 0.5, 0.1], [0.7, 0.7, 0.1]); P.chest.setFromAxisAngle(X, -0.45 * slide); P.head.setFromAxisAngle(X, -0.5 * slide); }
    const goal = this.prop('goal', () => { const g = new THREE.Group(), w = lam(0xffffff), W = 3.2, Hh = 1.6, D = 1.0;
      for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, Hh, 10), w); p.position.set(sx * W / 2, Hh / 2, 0); g.add(p); }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, W, 10), w); bar.rotation.z = Math.PI / 2; bar.position.y = Hh; g.add(bar);
      const net = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, D, 16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.45 })); net.position.set(0, Hh / 2, D / 2); net.name = 'net'; g.add(net); return g; });
    this.L(-3.4, 0, -3.4, goal.position); goal.rotation.y = r.yaw - Math.PI * 0.75; goal.scale.setScalar(kH);
    const ball = this.prop('fball', () => { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true })); const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.112, 0), new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true })); b.add(s); return b; });
    const k = clamp01((t - 1.1) / 0.75), from = this.L(0.3, 0.11, 0.25), to = this.L(-4.5, 1.42, -2.6);
    if (t < 1.1) ball.position.copy(from); else { ball.position.copy(from).lerp(to, k); ball.position.add(this.L(Math.sin(k * Math.PI) * 0.6, 0, Math.sin(k * Math.PI) * 0.6).sub(this.L(0, 0, 0))); ball.position.y += Math.sin(k * Math.PI) * 0.5; }
    ball.rotation.x += 0.3 * (t > 1.1 && k < 1 ? 1 : 0); ball.rotation.y += 0.25 * (t > 1.1 && k < 1 ? 1 : 0);
    const net = goal.getObjectByName('net'); net.scale.z = 1 + (k >= 1 ? Math.max(0, 0.35 - (t - 1.85) * 0.5) : 0);
    this.at(t, 1.0, 'a', () => this.say('', null, 'thwack')); this.at(t, 1.85, 'b', () => this.say('⚽ TOP BINS!!', null, 'siu')); this.at(t, 2.4, 'c', () => this.say('*KNEE SLIIIDE*', null, 'whoosh')); this.at(t, 3.6, 'd', () => this.say('PUSKÁS. CALL ME.'));
    return { hand: { L: 'open', R: 'open' }, bob: -slide * 0.42 * kH, spin: 0.9 * turn };
  }
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
    // the 7 on his back (RONALDO across the top)
    const seven = this.prop('seven', () => signMesh(0.28, 0.36, cvTex(256, 330, (c, w, h) => { c.lineJoin = 'round'; c.font = '900 40px Arial Black, Arial'; c.textAlign = 'center'; c.lineWidth = 6; c.strokeStyle = '#c8102e'; c.strokeText('RONALDO', w / 2, 40); c.fillStyle = '#fff'; c.fillText('RONALDO', w / 2, 40);
      c.font = '900 250px Arial Black, Arial'; c.lineWidth = 14; c.strokeText('7', w / 2, 270); c.fillText('7', w / 2, 270); })));
    this.onChest(seven, 0, 0.04, -0.158, Math.PI);
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

  // ---- AIDAN W: the knee goes: hopping, then down on his back clutching it
  knee(t) {
    // hobbling about on crutches (the bad leg held up), one crutch slips... down he goes, both hands round the knee
    const r = this.c.rag, P = r.pose, kH = this.kH, fall = ramp(t, 2.7, 3.15), rock = Math.sin(t * 5) * 0.08 * fall, hob = Math.abs(Math.sin(t * 5.5));
    if (fall < 0.5) {
      r.aim('uLegR', -0.1, -0.75, 0.55); r.aim('lLegR', -0.06, -1, -0.25); r.aim('uLegL', 0.09, -1, 0.06 * hob); r.aim('lLegL', 0.07, -1, 0);
      for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.3, -1, 0.12 + hob * 0.1], [0.32, -1, 0.3]);
      P.chest.setFromAxisAngle(X, 0.18);
    } else {
      r.aim('uLegR', -0.1, -0.2 + 0.2 * fall, 0.95); r.aim('lLegR', -0.05, -1, 0.3); r.aim('uLegL', 0.08, -1, 0.45); r.aim('lLegL', 0.06, -1, 0.2);
      for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.15, -0.6, 0.75], [-0.3, -0.5, 0.6]); P.chest.setFromAxisAngle(X, 0.35 + rock); P.head.setFromAxisAngle(X, 0.3);
    }
    for (const [i, sx] of [[0, 1], [1, -1]]) {
      const c = this.prop('crutch' + i, () => { const g = new THREE.Group(), al = new THREE.MeshPhongMaterial({ color: 0xb8bcc2, shininess: 80 }), grip = lam(0x222222);
        for (const dx of [-0.025, 0.025]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.85, 8), al); p.position.set(dx, 0.85, 0); g.add(p); }
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.45, 8), al); leg.position.y = 0.225; g.add(leg);
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.04, 10), grip); foot.position.y = 0.02; g.add(foot);
        const pad = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.12, 4, 8), grip); pad.rotation.z = Math.PI / 2; pad.position.y = 1.28; g.add(pad);
        const hand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.11, 8), grip); hand.rotation.x = Math.PI / 2; hand.position.y = 0.82; g.add(hand); return g; });
      if (fall < 0.5) { const top = this.L(sx * 0.27, 1.28, 0.02), foot = this.L(sx * 0.36, 0, 0.22 + hob * 0.06), d = top.clone().sub(foot); c.position.copy(foot); c.quaternion.setFromUnitVectors(Y, d.normalize()); c.scale.setScalar(kH); }
      else { const k = clamp01((t - 2.7) / 0.35); this.L(sx * (0.36 + k * 0.3), 0.02, 0.22 + k * 0.3, c.position); c.quaternion.setFromEuler(new THREE.Euler(Math.PI / 2 * k, r.yaw + sx * 0.4, 0)); }
    }
    this.at(t, 0.3, 'a', () => this.say('*HOBBLE* *HOBBLE*')); this.at(t, 2.7, 'b', () => this.say('WHOA—', null, 'boing')); this.at(t, 3.1, 'c', () => this.say('', null, 'thud'));
    this.at(t, 3.6, 'd', () => this.say('ARGH! THE KNEE! IT\'S GONE AGAIN!', null, 'sadviolin'));
    const lie = this.lieBack(fall);
    return { hand: { L: 'grip', R: 'grip' }, bob: (fall < 0.5 ? hob * 0.05 * kH : 0) + lie.bob, flip: lie.flip + rock, full: true };
  }
  // ---- AIDAN O: Guinness dream: three pints, one after another, then straight down flat on his back
  guinness(t) {
    // the Guinness dream: SIX of them, quick, one in each hand turn about, gone in seconds each... then flat on his
    // back, stars round his head
    const r = this.c.rag, P = r.pose, kH = this.kH, DUR = 0.62, N = 6, n = Math.min(N - 1, Math.floor(t / DUR)), ph = (t % DUR) / DUR, drinking = t < N * DUR;
    const fall = ramp(t, N * DUR + 0.3, N * DUR + 0.8), side = n % 2 ? 'L' : 'R', k = drinking ? Math.sin(ph * Math.PI) : 0;
    for (const [S, sx] of [['L', 1], ['R', -1]]) { const on = S === side ? k : 0; this.standArms(S, sx, mixv(mixv([0.35, -0.5, 0.6], DRINK_U, on), [1, 0.1, 0.1], fall), mixv(mixv([-0.2, -0.1, 0.95], DRINK_L, on), [1, 0.1, 0.1], fall)); }
    this.legsStand(0.12 + fall * 0.1); P.head.setFromAxisAngle(X, -0.6 * k + Math.sin(t * 6) * 0.05 * ramp(t, 2, 4)); P.chest.setFromAxisAngle(X, -0.15 * k);
    for (const S of ['L', 'R']) { const pint = this.prop('pint' + S, pintG); pint.visible = fall < 0.3; const on = S === side ? k : 0; this.inHand(pint, S, [0, 0.01, 0], [Math.PI / 2 - 1.0 * on, 0, 0]);
      const lvl = S === side && drinking ? 1 - clamp01((ph - 0.25) / 0.6) : 1; const st = pint.getObjectByName('stout'), hd = pint.getObjectByName('head'); st.scale.y = Math.max(0.04, lvl); st.position.y = -0.075 + 0.075 * lvl; hd.position.y = -0.075 + 0.15 * lvl + 0.005; hd.visible = lvl > 0.06; }
    for (let i = 0; i < N; i++) this.at(t, i * DUR + 0.3, 'g' + i, () => this.say(['ONE!', 'TWO!', 'THREE!', 'FOUR!', 'FIVE!', 'SIX!!'][i], null, 'gulp'));
    for (let i = 0; i < 5; i++) { const s = this.prop('dz' + i, () => new THREE.Mesh(new THREE.OctahedronGeometry(0.03), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd400 : 0xffffff }))); const hp = this.c.headPos(new THREE.Vector3()), a = t * 4 + i * 1.256; s.visible = fall > 0.8; s.position.set(hp.x + Math.cos(a) * 0.22, hp.y + 0.18, hp.z + Math.sin(a) * 0.22); s.rotation.y += 0.2; }
    this.at(t, N * DUR + 0.5, 'f', () => this.say('*HIC*... THE ROOM\'S SPINNING, LADS', null, 'thud'));
    const lie = this.lieBack(fall);
    return { hand: { L: fall > 0.3 ? 'open' : 'grip', R: fall > 0.3 ? 'open' : 'grip' }, bob: lie.bob, flip: lie.flip + (fall > 0.9 ? Math.sin(t * 3) * 0.05 : 0), full: true };
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
    this.standArms('L', 1, [0.38, -0.95, 0.08], [0.3, -0.95, 0.12]); this.standArms('R', -1, [0.15, -1, 0.25 * s], [0.1, -1, 0.3 + 0.2 * s]);
    P.head.setFromAxisAngle(Y, 0.6).multiply(_q.setFromAxisAngle(X, 0.35)); P.chest.setFromAxisAngle(Y, 0.08);
    const kid = this.prop('kid', () => kidMesh(0xff6fa8, 0x6a3a1a, true));
    this.L(0.62, 0, 0.05, kid.position); kid.rotation.y = r.yaw; kid.scale.setScalar(kH);
    walkKid(kid, t * 1.4 * Math.PI * 2); kid.position.y = Math.abs(s) * 0.02;
    // she's holding his hand: her near arm reaches to where his hand really is
    { const hand = r.grip('lArmL', new THREE.Vector3()); kid.updateMatrixWorld(true); const loc = kid.worldToLocal(hand), arm = kid.getObjectByName('arm-1'), sh = new THREE.Vector3(-0.13, 0.74, 0), d = loc.sub(sh), len = Math.min(0.45, Math.max(0.15, d.length()));
      d.normalize(); arm.position.copy(sh).addScaledVector(d, len / 2); arm.quaternion.setFromUnitVectors(Y, d); arm.scale.set(1, len / 0.33, 1); }
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
    const line = tbl.getObjectByName('line'); const left = 1 - clamp01(along); line.scale.x = Math.max(0.001, left); line.position.x = 0.2 - 0.2 * left; line.visible = left > 0.01;
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
// a kit / shirtless: the clothes between two heights (fractions of the body, from the floor) painted one colour
function kitRag(em, col, y0, y1) { const r = em.c.rag, p = r.paint; if (!p || !r.paintBB) return false;
  if (!em.kitted) { em.kitted = true; const oy = p.uCoatY.value.clone(), oc = p.uCoatCol.value.clone(); em.onStop(() => { p.uCoat.value = 0; p.uCoatY.value.copy(oy); p.uCoatCol.value.copy(oc); em.kitted = false; }); }
  p.uCoat.value = em.w; p.uCoatCol.value.copy(col && col.isColor ? col : new THREE.Color(col)); p.uCoatY.value.set(r.paintBB.min + r.paintBB.h * y0, r.paintBB.min + r.paintBB.h * y1); return true; }
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
  // HARRY'S CANDY, big down both sides: a pink candy-stripe panel, the name in bubble letters, lollipops and sweets
  const logo = cvTex(1024, 384, (c, w, h) => { c.fillStyle = '#fff0f7'; c.beginPath(); c.roundRect(8, 8, w - 16, h - 16, 60); c.fill();
    c.save(); c.beginPath(); c.roundRect(8, 8, w - 16, h - 16, 60); c.clip(); for (let i = -10; i < 40; i++) { c.fillStyle = i % 2 ? '#ff4fa3' : '#ffd1e8'; c.beginPath(); c.moveTo(i * 40, 0); c.lineTo(i * 40 + 20, 0); c.lineTo(i * 40 - 140, h); c.lineTo(i * 40 - 160, h); c.fill(); } c.restore();
    c.fillStyle = 'rgba(255,255,255,0.88)'; c.beginPath(); c.roundRect(120, 70, w - 240, h - 140, 50); c.fill();
    c.lineJoin = 'round'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 120px Arial Black, Arial'; c.lineWidth = 22; c.strokeStyle = '#7a1f3d'; c.strokeText("HARRY'S", w / 2, 150); c.fillStyle = '#ff4fa3'; c.fillText("HARRY'S", w / 2, 150);
    c.font = '900 100px Arial Black, Arial'; c.strokeText('CANDY', w / 2, 262); c.fillStyle = '#ffd400'; c.fillText('CANDY', w / 2, 262);
    for (const [x, col] of [[70, '#2ec4ff'], [w - 70, '#7cff6a']]) { c.fillStyle = '#eee'; c.fillRect(x - 6, 190, 12, 150); c.fillStyle = col; c.beginPath(); c.arc(x, 160, 52, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 8; c.beginPath(); for (let a = 0; a < 12; a += 0.2) c.lineTo(x + Math.cos(a) * a * 4.2, 160 + Math.sin(a) * a * 4.2); c.stroke(); }
    c.lineWidth = 12; c.strokeStyle = '#7a1f3d'; c.beginPath(); c.roundRect(8, 8, w - 16, h - 16, 60); c.stroke(); });
  for (const sx of [-1, 1]) add(new THREE.PlaneGeometry(2.9, 1.09), new THREE.MeshBasicMaterial({ map: logo, transparent: true }), sx * 0.952, 1.32, -0.7, 0, sx * Math.PI / 2);
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
  // the open doorway: a dark load bay (with the floor and a bench end) seen when the back doors swing open; the kids
  // climbing in vanish into it. It sits just inside the closed doors, so they hide it.
  const bay = new THREE.Group(); bay.position.set(0, 1.22, -2.262); bay.rotation.y = Math.PI; g.add(bay);
  add(new THREE.PlaneGeometry(1.74, 1.5), new THREE.MeshBasicMaterial({ color: 0x15171a }), 0, 0, 0, 0, 0, 0, bay);
  add(new THREE.PlaneGeometry(1.74, 0.25), new THREE.MeshBasicMaterial({ color: 0x3a342e }), 0, -0.62, 0.001, 0, 0, 0, bay);
  for (const sx of [-1, 1]) add(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x2a3550 }), sx * 0.7, -0.45, 0.002, 0, 0, 0, bay);
  add(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0x3a3f44 }), 0.1, 0.45, 0.002, 0, 0, 0, bay);   // the little window into the cab
  // the back doors: hinged at the outer edges, with windows, handles and a hinge each
  for (const sx of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sx * 0.95, 1.22, -2.26); piv.name = 'door' + sx; g.add(piv);
    add(new THREE.BoxGeometry(0.94, 1.56, 0.05), white, -sx * 0.475, 0, 0, 0, 0, 0, piv);
    add(new THREE.PlaneGeometry(0.62, 0.42), glass, -sx * 0.47, 0.38, -0.028, 0, Math.PI, 0, piv);
    add(new THREE.BoxGeometry(0.03, 0.18, 0.04), grey, -sx * 0.85, -0.05, -0.04, 0, 0, 0, piv);
    for (const y of [0.55, -0.55]) add(new THREE.BoxGeometry(0.06, 0.1, 0.06), blk, -sx * 0.02, y, -0.02, 0, 0, 0, piv);
  }
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

// ---- shared prop builders (emotes, batch 2) ----
function cvTex(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const cvTxt = (g, s, x, y, size, col, font = 'Arial Black, Arial') => { g.font = `900 ${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(s, x, y); };
const signMesh = (w, h, tex) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true }));
// a Pepsi Max can: printed body (black, the blue band, the globe), silver lid with a ring pull, rims top and bottom
let _pepsiTex = null;
function pepsiCan() {
  _pepsiTex = _pepsiTex || cvTex(256, 128, (g, w, h) => { g.fillStyle = '#05070c'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a3fa8'); gr.addColorStop(1, '#0b1f66'); g.fillStyle = gr; g.fillRect(0, 70, w, 26);
    for (const cx of [60, 188]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, 40, 20, 0, 7); g.fill(); g.fillStyle = '#e4002b'; g.beginPath(); g.arc(cx, 40, 20, Math.PI * 1.05, Math.PI * 1.95); g.fill(); g.fillStyle = '#1a3fa8'; g.beginPath(); g.arc(cx, 40, 20, Math.PI * 0.05, Math.PI * 0.95); g.fill(); }
    cvTxt(g, 'pepsi', 124, 40, 26, '#fff', 'Arial'); cvTxt(g, 'MAX', 124, 83, 20, '#fff'); cvTxt(g, 'MAX', 252, 83, 20, '#fff'); });
  const g = new THREE.Group(), metal = new THREE.MeshPhongMaterial({ color: 0xc8ccd2, shininess: 90, specular: 0xffffff });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.11, 20, 1, true), new THREE.MeshPhongMaterial({ map: _pepsiTex, shininess: 60, specular: 0x666666 })));
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.033, 0.012, 20), metal); top.position.y = 0.061; g.add(top);
  const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.027, 0.01, 20), metal); bot.position.y = -0.06; g.add(bot);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.002, 4, 10), metal); ring.rotation.x = Math.PI / 2; ring.position.set(0.006, 0.068, 0); g.add(ring);
  return g;
}
// the Turkish Airlines plane: white fuselage, red tail with the Turkish flag, the name down the side, windows, wings,
// engines, landing gear, a door on the left with stairs that fold down
function planeMesh() {
  const g = new THREE.Group(), white = new THREE.MeshPhongMaterial({ color: 0xf6f6f6, shininess: 50 }), red = lam(0xc8102e), grey = lam(0x9aa0a6), dark = lam(0x1c2430), blk = lam(0x111111);
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0, p = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); p.add(o); return o; };
  add(new THREE.CylinderGeometry(0.95, 0.95, 9, 28), white, 0, 2.0, 0, Math.PI / 2);
  add(new THREE.SphereGeometry(0.95, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), white, 0, 2.0, 4.5, Math.PI / 2).scale.set(1, 1.7, 1);
  add(new THREE.ConeGeometry(0.95, 3.2, 28), white, 0, 2.15, -6.1, -Math.PI / 2).scale.set(1, 1, 0.8);
  add(new THREE.CylinderGeometry(0.96, 0.96, 9, 28, 1, true, Math.PI * 0.85, Math.PI * 0.3), red, 0, 2.0, 0, Math.PI / 2);     // the red belly stripe
  const name = cvTex(1024, 128, (c, w, h) => { cvTxt(c, 'TURKISH AIRLINES', w / 2, h / 2, 92, '#c8102e'); });
  const flag = cvTex(256, 170, (c, w, h) => { c.fillStyle = '#e30a17'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.beginPath(); c.arc(100, 85, 48, 0, 7); c.fill(); c.fillStyle = '#e30a17'; c.beginPath(); c.arc(114, 85, 39, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 9 : 22; c.lineTo(168 + Math.cos(a) * r, 85 + Math.sin(a) * r); } c.fill(); });
  const wins = cvTex(1024, 64, (c, w, h) => { for (let i = 0; i < 26; i++) { c.fillStyle = '#1c2430'; c.beginPath(); c.ellipse(30 + i * 38, 32, 10, 15, 0, 0, 7); c.fill(); } });
  for (const sx of [-1, 1]) {
    add(new THREE.PlaneGeometry(4.6, 0.54), new THREE.MeshBasicMaterial({ map: name, transparent: true }), sx * 0.955, 2.6, 0.4, 0, sx * Math.PI / 2);
    add(new THREE.PlaneGeometry(5.4, 0.3), new THREE.MeshBasicMaterial({ map: wins, transparent: true }), sx * 0.957, 2.12, 0.4, 0, sx * Math.PI / 2);
    add(new THREE.PlaneGeometry(2.1, 1.4), new THREE.MeshBasicMaterial({ map: flag }), sx * 0.962, 2.0, -3.15, 0, sx * Math.PI / 2);          // a huge Turkish flag down the side
    add(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshBasicMaterial({ map: flag, side: THREE.DoubleSide }), sx * 3.3, 1.54, -0.5, -Math.PI / 2, 0, sx * 0.28);   // and on top of each wing
    add(new THREE.BoxGeometry(4.2, 0.16, 1.9), white, sx * 2.9, 1.45, -0.4, 0, sx * -0.28, sx * -0.06);          // wings, swept back
    add(new THREE.BoxGeometry(0.1, 0.5, 0.5), white, sx * 5.0, 1.65, -1.2);                                         // winglets
    add(new THREE.CylinderGeometry(0.42, 0.38, 1.6, 18), grey, sx * 2.3, 1.0, 0.4, Math.PI / 2);                    // engines
    add(new THREE.CircleGeometry(0.38, 18), dark, sx * 2.3, 1.0, 1.21);
    add(new THREE.BoxGeometry(1.8, 0.1, 0.9), white, sx * 1.2, 2.45, -6.4, 0, sx * -0.3);                           // tailplanes
    add(new THREE.PlaneGeometry(1.6, 1.05), new THREE.MeshBasicMaterial({ map: flag }), sx * 0.09, 3.85, -6.3, 0, sx * Math.PI / 2);
  }
  add(new THREE.BoxGeometry(0.14, 2.6, 2.4), red, 0, 3.8, -6.2, -0.35);                                              // the tail fin
  add(new THREE.PlaneGeometry(1.1, 0.35), dark, 0, 2.55, 5.6, -0.6);                                                 // cockpit windows
  const door = add(new THREE.PlaneGeometry(0.75, 1.45), new THREE.MeshBasicMaterial({ color: 0x2a3a4a }), 0.958, 1.95, 3.0, 0, Math.PI / 2); door.name = 'door';
  const st = new THREE.Group(); st.name = 'stairs'; g.add(st); st.position.set(0.96, 1.3, 3.0);
  for (let i = 0; i < 7; i++) add(new THREE.BoxGeometry(0.28, 0.06, 0.8), grey, 0.14 + i * 0.28, -i * 0.19, 0, 0, 0, 0, st);
  for (const sz of [-0.42, 0.42]) add(new THREE.BoxGeometry(2.1, 0.05, 0.04), lam(0xdddddd), 1.0, 0.25 - 0.62, sz, 0, 0, -0.6, st);
  g.userData.wheels = [];
  for (const [x, z] of [[0, 3.6], [-1.3, -0.4], [1.3, -0.4]]) { add(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), grey, x, 0.95, z); const w = add(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 16), blk, x, 0.3, z, 0, 0, Math.PI / 2); g.userData.wheels.push(w); }
  return g;
}
// KFC bargain bucket: red and white stripes, the Colonel, "BARGAIN BUCKET", piled with fried chicken
function bucketMesh() {
  const tex = cvTex(512, 256, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#fff' : '#d0021b'; c.fillRect(i * w / 16, 0, w / 16 + 1, h); }
    for (const cx of [128, 384]) { c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, 110, 62, 0, 7); c.fill(); c.fillStyle = '#d0021b'; c.beginPath(); c.arc(cx, 110, 56, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, 102, 34, 0, 7); c.fill();
      c.fillStyle = '#222'; c.fillRect(cx - 20, 92, 14, 6); c.fillRect(cx + 6, 92, 14, 6); c.fillStyle = '#eee'; c.beginPath(); c.moveTo(cx - 18, 118); c.quadraticCurveTo(cx, 150, cx + 18, 118); c.fill(); cvTxt(c, 'KFC', cx, 196, 40, '#fff'); }
    cvTxt(c, 'BARGAIN', 256, 60, 26, '#d0021b'); });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.095, 0.22, 26, 1, true), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide })));
  const base = new THREE.Mesh(new THREE.CircleGeometry(0.095, 24), lam(0xffffff)); base.rotation.x = -Math.PI / 2; base.position.y = -0.11; g.add(base);
  for (let i = 0; i < 9; i++) { const d = drumstick(); d.position.set(Math.cos(i * 2.4) * 0.06, 0.1 + (i % 3) * 0.025, Math.sin(i * 2.4) * 0.06); d.rotation.set(Math.sin(i) * 1.2, i, Math.cos(i) * 1.2); d.name = 'piece' + i; g.add(d); }
  return g;
}
function drumstick() { const g = new THREE.Group(), crust = lam(0xb5651d), dark = lam(0x8a4a14);
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), crust); m.scale.set(1, 1.45, 1); g.add(m);
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), i % 2 ? crust : dark); b.position.set(Math.cos(i) * 0.032, (i - 3) * 0.012, Math.sin(i) * 0.032); g.add(b); }
  const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.05, 6), lam(0xf4ead8)); bone.position.y = 0.07; g.add(bone); const knob = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), lam(0xf4ead8)); knob.position.y = 0.096; g.add(knob); return g; }
// a Guinness: the glass (with the harp-gold G on it), the black stout, the cream head
function pintG() { const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.034, 0.16, 18, 1, true), new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, shininess: 100, side: THREE.DoubleSide, depthWrite: false })); g.add(glass);
  const stout = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.033, 0.15, 18), lam(0x0e0806)); stout.name = 'stout'; g.add(stout);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.0415, 0.041, 0.018, 18), lam(0xf1e3c4)); head.name = 'head'; g.add(head);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), new THREE.MeshBasicMaterial({ map: cvTex(128, 128, (c) => { cvTxt(c, 'G', 64, 70, 110, '#d4af37', 'Georgia, serif'); c.strokeStyle = '#d4af37'; c.lineWidth = 3; c.strokeRect(10, 6, 108, 116); }), transparent: true, depthTest: true }));
  logo.position.set(0, 0.0, 0.0405); g.add(logo); return g; }
// Chester, Chloe's cockapoo: apricot curls all over (a body of little curls, curly legs, a domed curly head), long
// floppy curly ears, a black nose, glossy eyes with a glint, a pink tongue, a red collar with a gold tag, a curly tail
function dogMesh() {
  const g = new THREE.Group(), C1 = lam(0xd9a066), C2 = lam(0xc98a4e), C3 = lam(0xe8b47a), blk = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 120, specular: 0xffffff });
  const curl = (p, x, y, z, r, i) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), [C1, C2, C3][i % 3]); m.position.set(x, y, z); p.add(m); return m; };
  const body = new THREE.Group(); body.name = 'body'; body.position.y = 0.3; g.add(body);
  const core = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.22, 6, 12), C1); core.rotation.x = Math.PI / 2; body.add(core);
  for (let i = 0; i < 46; i++) { const a = i * 2.39996, z = -0.17 + (i / 46) * 0.34, rr = 0.11; curl(body, Math.cos(a) * rr, Math.sin(a) * rr * 0.95, z, 0.04 + (i % 4) * 0.006, i); }
  // legs: a pivot at the hip, curly all the way down, a little paw
  g.userData.legs = [];
  for (const [x, z] of [[-0.07, 0.13], [0.07, 0.13], [-0.07, -0.13], [0.07, -0.13]]) { const piv = new THREE.Group(); piv.position.set(x, 0.26, z); g.add(piv); g.userData.legs.push(piv);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.22, 10), C1); leg.position.y = -0.11; piv.add(leg);
    for (let k = 0; k < 6; k++) curl(piv, Math.cos(k * 2) * 0.03, -0.03 - k * 0.035, Math.sin(k * 2) * 0.03, 0.03, k);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), C2); paw.scale.set(1, 0.6, 1.3); paw.position.set(0, -0.235, 0.012); piv.add(paw); }
  // the tail: curly, up and over, wagging
  const tail = new THREE.Group(); tail.name = 'tail'; tail.position.set(0, 0.36, -0.2); g.add(tail);
  for (let k = 0; k < 6; k++) curl(tail, 0, Math.sin(k * 0.5) * 0.08, -Math.cos(k * 0.45) * 0.03 - k * 0.012, 0.035 - k * 0.003, k);
  // the head: domed curly top, a short muzzle, nose, eyes, ears, tongue, collar
  const head = new THREE.Group(); head.name = 'head'; head.position.set(0, 0.48, 0.22); g.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 14), C1); head.add(skull);
  for (let i = 0; i < 26; i++) { const a = i * 2.39996, y = 0.02 + (i / 26) * 0.08, rr = Math.sqrt(Math.max(0, 0.01 - (y - 0.02) * (y - 0.02))) * 9 * 0.1 + 0.04; curl(head, Math.cos(a) * rr, y + 0.03, Math.sin(a) * rr - 0.01, 0.035, i); }
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), C3); muzzle.scale.set(1, 0.8, 1.1); muzzle.position.set(0, -0.03, 0.08); head.add(muzzle);
  for (let i = 0; i < 8; i++) curl(head, Math.cos(i * 0.8) * 0.05, -0.04 + Math.sin(i * 1.7) * 0.02, 0.1, 0.022, i);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), blk); nose.scale.set(1.2, 0.8, 0.8); nose.position.set(0, -0.015, 0.145); head.add(nose);
  for (const sx of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), blk); eye.position.set(sx * 0.042, 0.02, 0.085); head.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(sx * 0.038, 0.027, 0.101); head.add(glint);
    const ear = new THREE.Group(); ear.position.set(sx * 0.085, 0.03, 0); ear.name = 'ear' + sx; head.add(ear);
    for (let k = 0; k < 7; k++) curl(ear, sx * 0.012, -k * 0.026, (k % 2) * 0.012 - 0.01, 0.034 - k * 0.0015, k + (sx > 0 ? 1 : 0)); }
  const tongue = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.03, 4, 8), lam(0xff7a9a)); tongue.rotation.x = 1.3; tongue.position.set(0, -0.07, 0.12); tongue.name = 'tongue'; head.add(tongue);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 8, 20), lam(0xd32f2f)); collar.rotation.x = Math.PI / 2 - 0.5; collar.position.set(0, 0.42, 0.17); g.add(collar);
  const tag = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), new THREE.MeshBasicMaterial({ map: cvTex(64, 64, (c) => { c.fillStyle = '#d4af37'; c.beginPath(); c.arc(32, 32, 31, 0, 7); c.fill(); cvTxt(c, 'CHESTER', 32, 34, 11, '#5a3a00'); }), side: THREE.DoubleSide }));
  tag.position.set(0, 0.36, 0.245); g.add(tag);
  return g;
}
let _trFlag = null;
function trFlagTex() { return _trFlag || (_trFlag = cvTex(256, 170, (c) => { c.fillStyle = '#e30a17'; c.fillRect(0, 0, 256, 170); c.fillStyle = '#fff'; c.beginPath(); c.arc(100, 85, 48, 0, 7); c.fill(); c.fillStyle = '#e30a17'; c.beginPath(); c.arc(114, 85, 39, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 9 : 22; c.lineTo(168 + Math.cos(a) * rr, 85 + Math.sin(a) * rr); } c.fill(); })); }
