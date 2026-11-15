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

export const EMOTES = [
  { id: 'finger', name: 'MIDDLE FINGER', icon: '🖕', dur: 3.4 },
  { id: 'griddy', name: 'THE GRIDDY', icon: '🕺', dur: 6.8 },
  { id: 'sixseven', name: 'SIX SEVEN', icon: '🤲', dur: 4.0 },
  { id: 'backflip', name: 'BACKFLIP', icon: '🤸', dur: 2.6 },
];
// each character's own emotes
export const CHAR_EMOTES = {
  ethan: [{ id: 'fifa', name: 'FIFA RAGE', icon: '🎮', dur: 5.2 }, { id: 'pepsi', name: 'PEPSI MAX PILE', icon: '🥤', dur: 5.0 }],
  ben: [{ id: 'hairline', name: 'NEW HAIRLINE', icon: '💇', dur: 4.6 }, { id: 'oldman', name: 'MY BACK', icon: '🦯', dur: 5.4 }],
  tommy: [{ id: 'ball', name: 'MY BALL', icon: '🟤', dur: 5.4 }],
  lewis: [{ id: 'siu', name: 'SIUUU', icon: '🐐', dur: 3.6 }, { id: 'tall', name: 'TOO TALL', icon: '🦒', dur: 5.0 }],
  chloe: [{ id: 'ears', name: 'UCL EARS', icon: '🏆', dur: 5.0 }, { id: 'chloedance', name: 'VICTORY DANCE', icon: '💃', dur: 4.4 }],
  aidanw: [{ id: 'knee', name: 'KNEE PAIN', icon: '🦵', dur: 5.4 }],
  aidan: [{ id: 'guinness', name: 'GUINNESS DREAM', icon: '🍺', dur: 6.4 }],
  dylan: [{ id: 'acl', name: 'ACL EXPLOSION', icon: '💥', dur: 5.0 }, { id: 'airguitar', name: 'WONDERWALL', icon: '🎸', dur: 5.0 }],
  ian: [{ id: 'abuse', name: 'SHOUTING ABUSE', icon: '🤬', dur: 4.6 }, { id: 'cast', name: 'GONE FISHING', icon: '🎣', dur: 4.8 }],
  oliver: [{ id: 'honest', name: 'MY HONEST REACTION', icon: '😐', dur: 4.6 }, { id: 'live', name: 'GOING LIVE', icon: '📸', dur: 4.4 }],
  noah: [{ id: 'bellybounce', name: 'BELLY BOUNCE', icon: '🤰', dur: 4.2 }, { id: 'conversion', name: 'CONVERSION KICK', icon: '🏉', dur: 4.6 }],
  harry: [{ id: 'date', name: 'ON A DATE', icon: '💕', dur: 6.0 }, { id: 'spike', name: 'TOUCHDOWN', icon: '🏈', dur: 4.4 }],
  alfie: [{ id: 'sugar', name: 'SPECIAL STUFF', icon: '🧂', dur: 5.6 }],
  connor: [{ id: 'ynwa', name: 'YNWA SCARF', icon: '🧣', dur: 5.0 }, { id: 'round', name: 'MY ROUND', icon: '🍻', dur: 4.2 }],
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
// hand shapes: how far the fingers curl (the middle finger on its own), and which way the back of the hand faces
const HANDS = { fist: { curl: 1, mid: 1 }, finger: { curl: 1, mid: 0 }, palm: { curl: 0.08, mid: 0.08 }, open: { curl: 0, mid: 0 }, goggle: { curl: 0.55, mid: 0.6 }, grip: { curl: 0.8, mid: 0.8 } };
const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });

// ------------------------------------------------------------------ the body moves
// Runs on a character after its normal (idle / walk) pose has been set and before the ragdoll animates.
// Arm/leg aims are directions in the character's own frame: +x to their left, +y up, +z the way they face.
export class EmotePlayer {
  constructor(c, scene, onWord) {
    this.c = c; this.scene = scene; this.onWord = onWord; this.id = null; this.t = 0; this.w = 0; this.props = {}; this.lastBeat = -1;
  }
  get active() { return !!this.id; }
  start(id) { const e = emoteInfo(id); if (!e) return; if (this.id) this.stop(); this.id = id; this.dur = e.dur; this.t = 0; this.lastBeat = -1; this.marks = {}; }
  stop() { this.id = null; this.hide(); this.clearProps(); this.unstretch(); }
  hide() { const r = this.c.rag; if (r.handHide) r.handHide.lArmL = r.handHide.lArmR = false; if (r.handPose) for (const k in r.handPose) { r.handPose[k].curl = 0; r.handPose[k].mid = 0; r.handPose[k].q.identity(); } }
  dispose() { this.stop(); }
  clearProps() { for (const k in this.props) { const p = this.props[k]; this.scene.remove(p); p.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } this.props = {}; }
  unstretch() { const g = this.c.rag.group; if (g && (g.scale.x !== 1 || g.scale.y !== 1)) { g.scale.set(1, 1, 1); g.position.set(0, 0, 0); } }
  // once per emote: fire a word / sound at a moment
  at(t, when, key, fn) { if (t >= when && !this.marks[key]) { this.marks[key] = true; fn(); } }
  say(txt, where, snd) { this.onWord && this.onWord(txt, where || this.c.headPos(new THREE.Vector3()).add({ x: 0, y: 0.25, z: 0 }), snd); }
  // a point in the character's own frame (x to their left, y up from the floor, z ahead), in the world
  L(x, y, z, out = new THREE.Vector3()) { const r = this.c.rag, k = r.height / 1.68, s = Math.sin(r.yaw), c = Math.cos(r.yaw); return out.set(r.root.x + (x * c + z * s) * k, y * k, r.root.z + (-x * s + z * c) * k); }
  get kH() { return this.c.rag.height / 1.68; }
  prop(key, make) { let p = this.props[key]; if (!p) { p = this.props[key] = make(); this.scene.add(p); } return p; }
  // put a prop in a hand (it sits in the palm, lined up with the forearm)
  inHand(p, S, off = [0, 0, 0], rot = null) {
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
  place() { if (this.id && this.out) this.gestures(this.out, this.w); }
  gestures(out, w) {
    const r = this.c.rag; if (!r.handPose) return;
    for (const S of ['L', 'R']) {
      const name = 'lArm' + S, hp = r.handPose[name], ax = r.handAxes && r.handAxes[name]; if (!hp || !ax) continue;
      const kind = out.hand && out.hand[S], shp = HANDS[kind] || HANDS.open;
      hp.curl = shp.curl * w; hp.mid = shp.mid * w;
      // turn the wrist so the back of the hand faces the way the emote wants (palms up, backs of the hands out...)
      const want = out.back && out.back[S];
      if (want && w > 0.05) {
        const fq = r.partQuat(name, _q2).invert(), b = _v.set(...want).applyAxisAngle(Y, r.yaw).applyQuaternion(fq);     // wanted back-of-hand, in the hand's own (bind) frame
        b.addScaledVector(ax.along, -b.dot(ax.along)); if (b.lengthSq() < 1e-6) { hp.q.identity(); continue; } b.normalize();
        const cur = _v2.copy(ax.palm).negate(), ang = Math.atan2(_v3.crossVectors(cur, b).dot(ax.along), cur.dot(b));
        hp.q.setFromAxisAngle(ax.along, ang * w);
      } else hp.q.identity();
    }
  }

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
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.12, -0.75, 0.55], [-0.35 + shake, 0.15, 1]);
    if (rage > 0) { this.standArms('R', -1, mixv([0.12, -0.75, 0.55], [0.3, 0.9, -0.2], rage), mixv([-0.35, 0.15, 1], [0.1, 0.8, 0.7], rage)); }
    this.legsStand(0.1, 0.15);
    P.chest.setFromAxisAngle(X, 0.25 - rage * 0.3); P.head.setFromAxisAngle(X, 0.35 - rage * 0.5).multiply(_q.setFromAxisAngle(Z, Math.sin(t * 9) * 0.05));
    const pad = this.prop('pad', () => { const g = new THREE.Group(); const m = lam(0x1a1a1e);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.035, 0.07), m); g.add(body);
      for (const x of [-0.06, 0.06]) { const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.04, 4, 8), m); grip.position.set(x, -0.005, -0.04); grip.rotation.x = 1.2; g.add(grip); }
      for (const [x, c] of [[0.04, 0x3fc0ff], [0.055, 0xff4040], [0.025, 0x40ff60], [0.04, 0xffd000]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), lam(c)); b.position.set(x + (c === 0xffd000 ? 0 : 0), 0.02, c === 0xffd000 ? -0.012 : c === 0x40ff60 ? 0.012 : 0); g.add(b); }
      const lb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.01), lam(0x3060ff, { emissive: 0x2040ff })); lb.position.set(0, 0.019, 0.03); g.add(lb); return g; });
    if (!thrown) { r.grip('lArmL', _v); r.grip('lArmR', _v2); pad.position.copy(_v).add(_v2).multiplyScalar(0.5).add({ x: 0, y: 0.02, z: 0 }); pad.rotation.set(0.5, r.yaw, 0); pad.userData.v = null; }
    else { if (!pad.userData.v) { pad.userData.v = this.L(0, 0, 0).sub(this.L(0, 0, -1)).multiplyScalar(3.5).add({ x: 0, y: 3.5, z: 0 }); }
      const v = pad.userData.v; v.y -= 9.8 * 0.016; pad.position.addScaledVector(v, 0.016); pad.rotation.x += 0.4; pad.rotation.z += 0.25; if (pad.position.y < 0.03) { pad.position.y = 0.03; v.y = Math.abs(v.y) * 0.35; v.x *= 0.6; v.z *= 0.6; } }
    this.at(t, 1.0, 'a', () => this.say('COME ON!!')); this.at(t, 2.2, 'b', () => this.say('THAT\'S NEVER OFFSIDE!')); this.at(t, 3.0, 'c', () => this.say('THIS GAME IS RIGGED!', null, 'smash'));
    return { hand: thrown ? { L: 'grip', R: 'open' } : { L: 'grip', R: 'grip' }, bob: -0.02 * kH };
  }
  // ---- ETHAN: a can of Pepsi Max, down in one, crushed and lobbed onto the pile of cans next to him
  pepsi(t) {
    const r = this.c.rag, P = r.pose;
    const drink = ramp(t, 0.5, 1.0) * (1 - ramp(t, 2.6, 2.9)), throwK = ramp(t, 2.9, 3.3);
    this.standArms('R', -1, mixv(mixv([0.2, -1, 0.1], [0.35, -0.1, 0.9], drink), [0.3, 0.9, -0.3], throwK), mixv(mixv([0.1, -1, 0.2], [0.2, 0.95, -0.3], drink), [0.1, 0.8, 0.6], throwK));
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
    const r = this.c.rag, P = r.pose;
    const up = ramp(t, 0.2, 0.7), sweep = Math.sin(t * 3.2) * 0.2;
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv([0.2, -1, 0.05], [0.75, 0.05, 0.45], up), mixv([0.2, -1, 0.1], [-0.55 + sweep * sx, 0.75, 0.35], up));
    this.legsStand(0.1);
    P.head.setFromAxisAngle(X, -0.25 * up).multiply(_q.setFromAxisAngle(Y, Math.sin(t * 1.6) * 0.45 * up));
    P.chest.setFromAxisAngle(X, -0.08 * up);
    const hair = this.prop('hair', () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), lam(0x3a2414)); m.scale.set(1, 0.55, 1.1); return m; });
    const head = this.c.headPos(new THREE.Vector3()); r.partQuat('head', hair.quaternion);
    hair.position.copy(head).add(_v.set(0, 0.06 * this.kH, 0.018 * this.kH).applyQuaternion(hair.quaternion)); hair.scale.setScalar(this.kH * 1.06 * ramp(t, 0.8, 1.6)); hair.scale.y *= 0.62;
    this.at(t, 1.0, 'a', () => this.say('✨ FRESH FROM TURKEY ✨', null, 'ting')); this.at(t, 2.6, 'b', () => this.say('4,000 GRAFTS. LOOK AT IT.', null, 'ting'));
    return { hand: { L: 'open', R: 'open' }, back: { L: [0, 0, -1], R: [0, 0, -1] } };
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
    const r = this.c.rag, P = r.pose;
    const reach = ramp(t, 0.2, 0.6) * (1 - ramp(t, 0.9, 1.2)), out = t > 0.95 && t < 4.6, back = ramp(t, 4.4, 4.7) * (1 - ramp(t, 4.9, 5.2));
    const toss = [[1.4, 2.4], [2.6, 3.6]], inAir = toss.find(([a, b]) => t > a && t < b);
    const throwArm = toss.some(([a]) => t > a - 0.25 && t < a + 0.1) ? 1 : 0;
    const u = mixv(mixv([0.2, -1, 0.1], [0.05, -0.9, 0.35], Math.max(reach, back)), [0.25, -0.3, 0.9], out && !back ? 0.8 : 0);
    const l = mixv(mixv([0.1, -1, 0.2], [-0.5, -0.6, 0.5], Math.max(reach, back)), [0.0, 0.25 + throwArm * 0.5, 1], out && !back ? 0.8 : 0);
    this.standArms('R', -1, u, l); this.standArms('L', 1, [0.25, -1, 0.05], [0.2, -1, 0.1]); this.legsStand(0.12);
    P.head.setFromAxisAngle(X, 0.3 - (inAir ? 0.6 : 0)); P.chest.setFromAxisAngle(X, 0.1 * reach);
    const b = this.prop('ball', () => new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), lam(0xd8c3a0, { emissive: 0x3a2a10 })));
    b.visible = out; b.scale.setScalar(this.kH * (1 + Math.sin(t * 9) * 0.12));
    if (inAir) { const [a, z] = inAir, k = (t - a) / (z - a); r.grip('lArmR', b.position); b.position.y += 4 * k * (1 - k) * 1.1 * this.kH; }
    else r.grip('lArmR', b.position);
    this.at(t, 1.0, 'a', () => this.say('THE FINAL BALL.')); this.at(t, 1.4, 'b', () => this.say('', null, 'whoosh')); this.at(t, 2.6, 'c', () => this.say('', null, 'whoosh'));
    return { hand: { L: 'open', R: out ? 'grip' : 'open' }, bob: -0.01 * this.kH };
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
    const b = this.prop('ball', () => new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), lam(0xd8c3a0, { emissive: 0x3a2a10 })));
    b.visible = t > 0.55 && t < 1.25; r.grip('lArmR', b.position); b.scale.setScalar(this.kH * (1 + Math.sin(t * 14) * 0.15));
    return { hand: { L: 'open', R: b.visible ? 'grip' : 'open' } };
  }

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
    const r = this.c.rag, P = r.pose, g = ramp(t, 0.4, 2.2) * (1 - ramp(t, 4.2, 4.8)), flap = Math.sin(t * 7) * 0.15 * g;
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, [0.55, -0.1, 0.2], [0.1, 0.95, 0.1]);
    this.legsStand(0.1); P.head.setFromAxisAngle(Z, Math.sin(t * 2) * 0.12);
    const head = this.c.headPos(new THREE.Vector3()), hq = r.partQuat('head', new THREE.Quaternion());
    for (const [k, sx] of [['earL', 1], ['earR', -1]]) {
      const e = this.prop(k, () => { const gr = new THREE.Group(); const m = lam(0xf2c6a8); const lobe = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.012, 8, 20), m); lobe.scale.set(0.8, 1.2, 1); gr.add(lobe); const fill = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), lam(0xe0a890, { side: THREE.DoubleSide })); fill.scale.set(0.8, 1.2, 1); gr.add(fill); return gr; });
      const sc = this.kH * (1 + 7 * g);
      e.position.copy(head).add(_v.set(sx * (0.075 * this.kH + 0.022 * sc), 0.01, 0).applyQuaternion(hq)); e.quaternion.copy(hq).multiply(_q.setFromAxisAngle(Y, sx * (1.35 + flap)));
      e.scale.setScalar(sc);
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
    this.standArms('R', -1, mixv([0.2, -1, 0.1], [0.35, -0.1, 0.9], k), mixv([0.1, -1, 0.2], [0.2, 0.95, -0.3], k));
    this.standArms('L', 1, mixv([0.25, -1, 0.05], [1, 0.1, 0.1], fall), mixv([0.2, -1, 0.1], [1, 0.1, 0.1], fall)); if (fall > 0.5) this.standArms('R', -1, [1, 0.1, 0.1], [1, 0.1, 0.1]);
    this.legsStand(0.1 + fall * 0.1); P.head.setFromAxisAngle(X, -0.6 * k + Math.sin(t * 6) * 0.05 * ramp(t, 3, 4)); P.chest.setFromAxisAngle(X, -0.15 * k);
    const pint = this.prop('pint', () => { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.15, 14), lam(0x140a06)); g.add(body); const head = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.04, 0.025, 14), lam(0xf4ead0)); head.position.y = 0.085; head.name = 'head'; g.add(head); return g; });
    pint.visible = fall < 0.3; this.inHand(pint, 'R', [0, 0, 0], [Math.PI / 2, 0, 0]);
    const lvl = cur ? 1 - clamp01((t - cur[0] - 0.3) / (cur[1] - cur[0] - 0.4)) : 1; pint.children[0].scale.y = Math.max(0.05, lvl); pint.children[0].position.y = -0.075 * (1 - lvl); pint.children[1].visible = lvl > 0.1;
    for (const [i, [a]] of cyc.entries()) this.at(t, a + 0.4, 'g' + i, () => this.say(['ONE...', 'TWO...', 'THREE!'][i], null, 'gulp'));
    this.at(t, 4.3, 'f', () => this.say('*HIC*', null, 'thud'));
    const lie = this.lieBack(fall);
    return { hand: { L: 'open', R: fall > 0.3 ? 'open' : 'grip' }, bob: lie.bob, flip: lie.flip, full: true };
  }

  // ---- DYLAN: the ACL goes (cartoon style): a kick, a POP, bits everywhere, down holding the leg
  acl(t) {
    const r = this.c.rag, P = r.pose, kick = ramp(t, 0.3, 0.8) * (1 - ramp(t, 0.9, 1.1)), down = ramp(t, 1.4, 1.9);
    r.aim('uLegR', -0.08, -Math.cos(kick * 1.2), Math.sin(kick * 1.2)); r.aim('lLegR', -0.06, -Math.cos(kick * 1.1), Math.sin(kick * 1.1));
    r.aim('uLegL', 0.08, -1, down * 0.5); r.aim('lLegL', 0.06, -1, down * 0.3);
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv([0.6, 0.1, 0.1], [0.15, -0.6, 0.75], down), mixv([0.6, 0.2, 0.1], [-0.3, -0.5, 0.6], down));
    P.chest.setFromAxisAngle(X, 0.2 * down); P.head.setFromAxisAngle(X, 0.3 * down);
    const bits = this.prop('bits', () => { const g = new THREE.Group(); const cols = [0xff4fa3, 0xffd400, 0x3fc0ff, 0x7cff6a, 0xffffff, 0xe8b08c];
      for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(i % 3 ? new THREE.BoxGeometry(0.02, 0.02, 0.02) : new THREE.TetrahedronGeometry(0.018), lam(cols[i % cols.length], { emissive: 0x222222 })); m.userData.v = new THREE.Vector3(Math.sin(i * 2.4) * 1.6, 1.5 + (i % 5) * 0.5, Math.cos(i * 2.4) * 1.6); g.add(m); } g.visible = false; return g; });
    if (t > 1.0) { if (!bits.visible) { bits.visible = true; r.tip('uLegR', bits.position); for (const m of bits.children) m.position.set(0, 0, 0); }
      for (const m of bits.children) { m.userData.v.y -= 9.8 * 0.016; m.position.addScaledVector(m.userData.v, 0.016); if (m.position.y + bits.position.y < 0.02) { m.position.y = 0.02 - bits.position.y; m.userData.v.multiplyScalar(0.3); } m.rotation.x += 0.2; m.rotation.y += 0.15; } }
    this.at(t, 1.0, 'p', () => this.say('💥 POP! 💥', null, 'pop')); this.at(t, 1.2, 'q', () => this.say('', null, 'boing')); this.at(t, 2.2, 'r', () => this.say('NOT THE ACL AGAIN!', null, 'sadviolin'));
    const lie = this.lieBack(down);
    return { hand: { L: down > 0.5 ? 'grip' : 'open', R: down > 0.5 ? 'grip' : 'open' }, bob: lie.bob, flip: lie.flip, full: true };
  }
  // ---- DYLAN: air guitar, Wonderwall
  airguitar(t) {
    const r = this.c.rag, P = r.pose, strum = Math.sin(t * 14);
    this.standArms('L', 1, [0.15, -0.5, 0.8], [-0.85, 0.15, 0.5]);         // the neck of the guitar
    this.standArms('R', -1, [0.25, -0.75, 0.4], [-0.3, -0.25 + strum * 0.35, 0.8]);
    r.aim('uLegL', 0.12, -1, 0.15); r.aim('lLegL', 0.1, -1, 0); r.aim('uLegR', -0.12, -1, -0.05); r.aim('lLegR', -0.1, -1, 0);
    P.chest.setFromAxisAngle(X, -0.15).multiply(_q.setFromAxisAngle(Y, 0.2)); P.head.setFromAxisAngle(X, -0.25 + Math.abs(Math.sin(t * 3.5)) * 0.25);
    this.at(t, 0.4, 'a', () => this.say('🎸 TODAY IS GONNA BE THE DAY...')); this.at(t, 2.6, 'b', () => this.say('...THAT THEY\'RE GONNA THROW IT BACK TO YOU 🎶'));
    return { hand: { L: 'grip', R: 'grip' }, bob: -0.02 * this.kH };
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
    const r = this.c.rag, P = r.pose, back = ramp(t, 0.3, 0.9) * (1 - ramp(t, 1.0, 1.2)), out = ramp(t, 1.0, 1.25);
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv(mixv([0.15, -0.4, 0.8], [0.15, 0.9, -0.3], back), [0.15, -0.1, 1], out), mixv(mixv([-0.2, -0.2, 0.9], [0.0, 1, 0.2], back), [-0.1, 0.1, 1], out));
    this.legsStand(0.12, 0.1); P.chest.setFromAxisAngle(X, -0.2 * back + 0.15 * out);
    const rod = this.prop('rod', () => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.012, 1.6, 6), lam(0x2a2a2a)); m.position.y = 0.8; g.add(m); const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), lam(0x888888)); reel.rotation.z = Math.PI / 2; reel.position.y = 0.15; g.add(reel);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.6, 0), new THREE.Vector3(0, 0, 3)]), new THREE.LineBasicMaterial({ color: 0xffffff })); line.name = 'line'; g.add(line); return g; });
    r.grip('lArmR', rod.position); r.partQuat('lArmR', rod.quaternion); rod.quaternion.multiply(_q.setFromAxisAngle(X, Math.PI)); rod.scale.setScalar(this.kH);
    const line = rod.getObjectByName('line'); const lp = line.geometry.attributes.position; const reach = out * 3; lp.setXYZ(1, 0, 1.6 - out * 1.5, -reach); lp.needsUpdate = true;
    this.at(t, 1.05, 'c', () => this.say('', null, 'whoosh')); this.at(t, 1.6, 'p', () => this.say('*PLOP*', null, 'pop')); this.at(t, 2.8, 'q', () => this.say('...NOTHING. AGAIN.'));
    return { hand: { L: 'grip', R: 'grip' } };
  }

  // ---- OLIVER: "my honest reaction": feet together, hands crossed in front, head tipped forward. Dead still.
  honest(t) {
    const r = this.c.rag, P = r.pose, br = Math.sin(t * 2) * 0.01;
    r.aim('uLegL', 0.02, -1, 0); r.aim('lLegL', 0.015, -1, 0); r.aim('uLegR', -0.02, -1, 0); r.aim('lLegR', -0.015, -1, 0);
    this.standArms('L', 1, [0.12, -1, 0.32], [-0.45, -0.8, 0.35]); this.standArms('R', -1, [0.12, -1, 0.3], [-0.5, -0.8, 0.38]);
    P.head.setFromAxisAngle(X, 0.42 + br); P.chest.setFromAxisAngle(X, 0.04 + br);
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
    const kid = this.prop('kid', () => { const g = new THREE.Group(); const skin = lam(0xf0c4a4), top = lam(0xff6fa8), bot = lam(0x3a4a7a);
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.2, 4, 10), top); body.position.y = 0.62; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), skin); head.position.y = 0.92; g.add(head);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12, 0, Math.PI * 2, 0, 1.4), lam(0x6a3a1a)); hair.position.y = 0.93; g.add(hair);
      for (const sx of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), lam(0x111111)); eye.position.set(sx * 0.04, 0.94, 0.1); g.add(eye); }
      for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.3, 4, 8), bot); leg.position.set(sx * 0.06, 0.24, 0); leg.name = 'leg' + sx; g.add(leg); }
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.26, 4, 8), skin); arm.position.set(-0.15, 0.62, 0); arm.rotation.z = -0.6; g.add(arm);
      const arm2 = arm.clone(); arm2.position.x = 0.15; arm2.rotation.z = 0.15; g.add(arm2); return g; });
    this.L(0.62, 0, 0.05, kid.position); kid.rotation.y = r.yaw; kid.scale.setScalar(kH);
    kid.getObjectByName('leg-1').rotation.x = 0.5 * s; kid.getObjectByName('leg1').rotation.x = -0.5 * s; kid.position.y = Math.abs(s) * 0.02;
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
    const r = this.c.rag, P = r.pose, kH = this.kH, bend = ramp(t, 0.6, 1.2) * (1 - ramp(t, 3.3, 3.6)), along = clamp01((t - 1.3) / 1.8), wild = ramp(t, 3.6, 3.8) * (1 - ramp(t, 5.0, 5.5));
    this.legsStand(0.14, 0.4 * bend);
    for (const [S, sx] of [['L', 1], ['R', -1]]) this.standArms(S, sx, mixv(mixv([0.25, -1, 0.05], [0.3, -0.6, 0.75], bend), [0.6, 0.6, 0.2], wild), mixv(mixv([0.2, -1, 0.1], [0.1, -0.9, 0.4], bend), [0.5, 0.9, 0], wild));
    P.chest.setFromAxisAngle(X, 0.95 * bend).multiply(_q.setFromAxisAngle(Y, (along - 0.5) * 0.5 * bend)); P.head.setFromAxisAngle(X, 0.4 * bend).multiply(_q.setFromAxisAngle(Y, (along - 0.5) * 0.6 * bend + Math.sin(t * 25) * 0.25 * wild));
    const tbl = this.prop('table', () => { const g = new THREE.Group(); const wood = lam(0x6a4426); const top = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.35), wood); top.position.y = 0.72; g.add(top);
      for (const [x, z] of [[-0.27, -0.14], [0.27, -0.14], [-0.27, 0.14], [0.27, 0.14]]) { const lg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.72, 0.03), wood); lg.position.set(x, 0.36, z); g.add(lg); }
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.006, 0.018), lam(0xffffff, { emissive: 0x666666 })); line.position.set(0, 0.739, 0); line.name = 'line'; g.add(line);
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.05), lam(0x2a7ad8)); bag.position.set(0.24, 0.8, 0.08); g.add(bag);
      const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.03), new THREE.MeshBasicMaterial({ map: labelTex('SUGAR') })); lbl.position.set(0.24, 0.82, 0.106); g.add(lbl); return g; });
    this.L(0, 0, 0.5, tbl.position); tbl.rotation.y = r.yaw; tbl.scale.setScalar(kH * ramp(t, 0, 0.4));
    const line = tbl.getObjectByName('line'); const left = 1 - clamp01(along); line.scale.x = Math.max(0.001, left); line.position.x = 0.2 - 0.2 * left; line.visible = left > 0.01;
    this.at(t, 0.3, 'a', () => this.say('JUST A BIT OF SUGAR, LADS')); this.at(t, 1.4, 'b', () => this.say('', null, 'psst')); this.at(t, 3.7, 'c', () => this.say('⚡ SUGAR RUSH ⚡', null, 'jet'));
    return { hand: { L: 'open', R: 'open' }, bob: -0.08 * bend * kH + Math.abs(Math.sin(t * 20)) * 0.03 * wild * kH };
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
    const r = this.c.rag, P = r.pose, a = Math.sin(t * 16), b = Math.sin(t * 16 + Math.PI);
    this.standArms('L', 1, [0.25, -0.75, 0.6], [-0.35, -0.1 + 0.25 * Math.max(0, a), 0.9]); this.standArms('R', -1, [0.25, -0.75, 0.6], [-0.35, -0.1 + 0.25 * Math.max(0, b), 0.9]);
    this.legsStand(0.14, 0.15); P.chest.setFromAxisAngle(X, -0.15); P.head.setFromAxisAngle(X, 0.25).multiply(_q.setFromAxisAngle(Z, Math.sin(t * 8) * 0.1));
    const beat = Math.floor(t * 16 / Math.PI); if (beat !== this.lastBeat && t > 0.4 && t < 3.8) { this.lastBeat = beat; if (beat % 2 === 0) this.say(beat % 4 ? '' : 'BOM', null, 'thud'); }
    return { hand: { L: 'open', R: 'open' }, bob: Math.abs(Math.sin(t * 8)) * -0.02 * this.kH };
  }
  // ---- RONNIE: chugs a MANGO LOCO, arms up
  loco(t) {
    const r = this.c.rag, P = r.pose, drink = ramp(t, 0.4, 0.9) * (1 - ramp(t, 2.6, 2.9)), cheer = ramp(t, 2.9, 3.2);
    this.standArms('R', -1, mixv(mixv([0.2, -1, 0.1], [0.35, -0.1, 0.9], drink), [0.4, 1, 0.1], cheer), mixv(mixv([0.1, -1, 0.2], [0.2, 0.95, -0.3], drink), [0.3, 1, 0], cheer));
    this.standArms('L', 1, mixv([0.25, -1, 0.05], [0.4, 1, 0.1], cheer), mixv([0.2, -1, 0.1], [0.3, 1, 0], cheer)); this.legsStand(0.12);
    P.head.setFromAxisAngle(X, -0.6 * drink - 0.2 * cheer);
    const can = this.prop('mango', () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.16, 14), lam(0xffffff))); const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0335, 0.0335, 0.07, 14), lam(0xff7a1a)); g.add(band); return g; });
    this.inHand(can, 'R', [0, 0, 0], [Math.PI / 2, 0, 0]);
    this.at(t, 1.0, 'a', () => this.say('', null, 'slurp')); this.at(t, 3.0, 'b', () => this.say('🥭 MANGO LOCO MODE! 🥭', null, 'fanfare'));
    return { hand: { L: 'open', R: 'grip' } };
  }
}

// little textures for props
let _heart = null;
function heartTex() { if (_heart) return _heart; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.font = '52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💖', 32, 36); _heart = new THREE.CanvasTexture(c); _heart.colorSpace = THREE.SRGBColorSpace; return _heart; }
function labelTex(txt, bg = '#ffffff', fg = '#1a3fa8') { const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 512, 64); g.fillStyle = fg; g.font = '900 40px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 256, 34, 500); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
