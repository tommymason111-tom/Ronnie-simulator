// EMOTES (multiplayer): pick one off the emote wheel and your character does it for everyone to see.
//
//   MIDDLE FINGER  both hands come up in front of the chest, backs of the hands to whoever's looking, middle
//                  fingers up (the rest curled into a fist, thumb tucked over them). A chin-up, smug tilt of the
//                  head, a cocky hip, and two little forward "pumps" of the hands with a nod.
//   THE GRIDDY     the dance: quick alternating steps on the spot, each one a knee lift with the heel kicked back,
//                  then the foot flicked out in front onto its heel; a little hop on every step. Hunched forward,
//                  fists pumping in opposition to the legs, the chest twisting with them. Every eighth count the
//                  hands go up to the eyes as "goggles" (thumb and index finger in rings, the other fingers
//                  fanned) with the elbows out wide, while the feet keep going.
//   SIX SEVEN      elbows tucked into the sides, forearms out in front with the palms up, see-sawing: one hand up
//                  as the other goes down ("six... seven..."), a shrug of the shoulders, the head bobbing and
//                  tilting side to side, a little bounce in the knees.
//
// On someone playing in VR the arms are always their real arms; the emote moves everything else.
import * as THREE from 'three';

export const EMOTES = [
  { id: 'finger', name: 'MIDDLE FINGER', icon: '🖕', dur: 3.4 },
  { id: 'griddy', name: 'THE GRIDDY', icon: '🕺', dur: 6.4 },
  { id: 'sixseven', name: 'SIX SEVEN', icon: '🤲', dur: 4.0 },
];

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ss = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const ramp = (t, a, b) => ss((t - a) / (b - a));

// ------------------------------------------------------------------ a posable hand
// Local frame: +Y runs from the wrist out along the fingers, +Z is the back of the hand, -Z the palm.
// side: 'L' or 'R' (the thumb is on the character's inside: +X for a left hand, -X for a right).
// Sizes are for an average adult hand (palm 8.5cm wide, 9.5cm long; middle finger ~9.5cm).
const FING = [   // name, x across the knuckles (thumb side first), lengths of the three bones, radius
  ['index', 0.029, [0.042, 0.025, 0.021], 0.0092],
  ['middle', 0.0095, [0.046, 0.029, 0.022], 0.0097],
  ['ring', -0.0105, [0.043, 0.027, 0.021], 0.0091],
  ['pinky', -0.029, [0.034, 0.020, 0.018], 0.0079],
];
const SHAPES = {
  //           index           middle          ring            pinky           thumb [spread, a, b, c]      splay
  fist:   { f: [[1.55, 1.7, 0.9], [1.6, 1.7, 0.9], [1.6, 1.65, 0.85], [1.55, 1.6, 0.8]], th: [0.15, 0.95, 0.55, 0.5], splay: 0 },
  finger: { f: [[1.6, 1.75, 0.9], [0.0, 0.03, 0.02], [1.65, 1.7, 0.85], [1.6, 1.65, 0.8]], th: [0.12, 1.0, 0.6, 0.45], splay: 0 },
  goggle: { f: [[0.95, 1.15, 0.95], [0.25, 0.3, 0.2], [0.3, 0.35, 0.25], [0.35, 0.4, 0.3]], th: [0.55, 0.75, 0.5, 0.6], splay: 0.14 },
  palm:   { f: [[0.12, 0.16, 0.08], [0.1, 0.14, 0.08], [0.14, 0.18, 0.1], [0.2, 0.22, 0.12]], th: [0.75, 0.25, 0.15, 0.1], splay: 0.09 },
};
export class GestureHand {
  constructor(side, skin = 0xe2b08c) {
    this.side = side; const sg = side === 'L' ? 1 : -1; this.sg = sg;
    const mat = new THREE.MeshLambertMaterial({ color: skin }), nail = new THREE.MeshLambertMaterial({ color: new THREE.Color(skin).lerp(new THREE.Color(0xffd8d0), 0.55) });
    const knuck = new THREE.MeshLambertMaterial({ color: new THREE.Color(skin).multiplyScalar(0.93) });
    this.root = new THREE.Group(); this.root.visible = false;
    // the palm: a rounded slab, slightly wider at the knuckles, a pad of muscle at the base of the thumb
    const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.03, 6, 12), mat); palm.scale.set(1.42, 1.25, 0.52); palm.position.set(0, 0.048, -0.002); this.root.add(palm);
    const heel = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), mat); heel.scale.set(1.0, 1.3, 0.75); heel.position.set(sg * 0.02, 0.025, -0.009); this.root.add(heel);
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.029, 0.04, 14), mat); wrist.scale.set(1.25, 1, 0.75); wrist.position.y = -0.008; this.root.add(wrist);
    // tendons on the back of the hand
    for (const [, x] of FING) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.06, 5), knuck); t.position.set(sg * x * 0.85, 0.055, 0.0145); t.rotation.z = -sg * x * 0.9; this.root.add(t); }
    this.fingers = FING.map(([name, x, L, r]) => {
      const base = new THREE.Group(); base.position.set(sg * x, 0.093 - Math.abs(x) * 0.18, 0); this.root.add(base);
      const kn = new THREE.Mesh(new THREE.SphereGeometry(r * 1.12, 10, 8), knuck); kn.position.z = 0.003; base.add(kn);   // knuckle
      let parent = base; const segs = [];
      L.forEach((len, i) => {
        const g = new THREE.Group(); parent.add(g); if (i) g.position.y = L[i - 1];
        const rr = r * (1 - i * 0.1), cap = new THREE.Mesh(new THREE.CapsuleGeometry(rr, len - rr * 1.2, 4, 10), mat); cap.position.y = len / 2; cap.scale.z = 0.92; g.add(cap);
        if (i < 2) { const j = new THREE.Mesh(new THREE.SphereGeometry(rr * 1.04, 8, 6), knuck); j.position.y = len; g.add(j); }      // joint
        if (i === 2) { const n = new THREE.Mesh(new THREE.BoxGeometry(rr * 1.35, len * 0.48, rr * 0.5), nail); n.position.set(0, len * 0.66, rr * 0.82); g.add(n); }   // nail
        segs.push(g); parent = g;
      });
      return { name, base, segs };
    });
    // the thumb: from low on the inside of the palm, three bones
    const tb = new THREE.Group(); tb.position.set(sg * 0.036, 0.022, -0.006); this.root.add(tb);
    let parent = tb; this.thumb = [];
    [[0.038, 0.012], [0.032, 0.0105], [0.027, 0.0098]].forEach(([len, r], i) => {
      const g = new THREE.Group(); parent.add(g); if (i) g.position.y = [0.038, 0.032][i - 1];
      const cap = new THREE.Mesh(new THREE.CapsuleGeometry(r, len - r * 1.1, 4, 10), mat); cap.position.y = len / 2; g.add(cap);
      if (i === 2) { const n = new THREE.Mesh(new THREE.BoxGeometry(r * 1.4, len * 0.5, r * 0.5), nail); n.position.set(0, len * 0.62, r * 0.85); g.add(n); }
      this.thumb.push(g); parent = g;
    });
    this.cur = null; this.shape('fist');
  }
  // bend the fingers into a shape (curl: + = towards the palm)
  shape(kind) {
    if (this.cur === kind) return; this.cur = kind; const S = SHAPES[kind], sg = this.sg;
    this.fingers.forEach((f, i) => { const c = S.f[i]; f.base.rotation.set(-c[0], 0, -sg * (i - 1.5) * S.splay * -1); f.segs[1].rotation.x = -c[1]; f.segs[2].rotation.x = -c[2]; f.segs[0].rotation.x = 0; });
    const [spread, a, b, c] = S.th;
    // the thumb swings out from the palm (spread), then folds across it (a) and curls (b, c)
    this.thumb[0].rotation.set(-a * 0.55, sg * 0.25, sg * (0.55 + spread));
    this.thumb[1].rotation.set(-b, 0, -sg * a * 0.35);
    this.thumb[2].rotation.set(-c, 0, 0);
  }
  // put the hand on a wrist: fingers along `along`, the back of the hand towards `back`
  place(wrist, along, back, scale) {
    const y = _v.copy(along).normalize(), z = _v2.copy(back).addScaledVector(y, -back.dot(y));
    if (z.lengthSq() < 1e-5) z.copy(Math.abs(y.y) < 0.9 ? Y : Z).addScaledVector(y, -(Math.abs(y.y) < 0.9 ? y.y : y.z)); z.normalize();
    const x = new THREE.Vector3().crossVectors(y, z);
    _m.makeBasis(x, y, z); this.root.quaternion.setFromRotationMatrix(_m); this.root.position.copy(wrist); this.root.scale.setScalar(scale);
  }
}

// ------------------------------------------------------------------ the body moves
// Runs on a character after its normal (idle / walk) pose has been set and before the ragdoll animates.
// Arm/leg aims are directions in the character's own frame: +x to their left, +y up, +z the way they face.
export class EmotePlayer {
  constructor(c, scene, onWord) {
    this.c = c; this.scene = scene; this.onWord = onWord; this.id = null; this.t = 0; this.w = 0;
    const skin = (c.def && c.def.look && c.def.look.skin) || 0xe2b08c;
    this.hands = { L: new GestureHand('L', skin), R: new GestureHand('R', skin) };
    scene.add(this.hands.L.root, this.hands.R.root);
    this.lastBeat = -1;
  }
  get active() { return !!this.id; }
  start(id) { const e = EMOTES.find(x => x.id === id); if (!e) return; this.id = id; this.dur = e.dur; this.t = 0; this.lastBeat = -1; }
  stop() { this.id = null; this.hide(); }
  hide() { const r = this.c.rag; this.hands.L.root.visible = this.hands.R.root.visible = false; if (r.handHide) r.handHide.lArmL = r.handHide.lArmR = false; }
  dispose() { this.scene.remove(this.hands.L.root, this.hands.R.root); }

  // vr: their arms come from their real hands (leave the arms alone)
  update(dt, vr) {
    if (!this.id) return 0;
    this.t += dt; const t = this.t, D = this.dur;
    if (t >= D) { this.stop(); return 0; }
    const w = ramp(t, 0, 0.22) * (1 - ramp(t, D - 0.35, D)); this.w = w;
    const r = this.c.rag, base = {};
    for (const k in r.pose) base[k] = r.pose[k].clone();
    const bob0 = r.bob || 0;
    const out = this[this.id](t, vr);      // sets r.pose.* (and returns the hand shapes + hip bob)
    // blend from what they were doing into the emote and back out
    for (const k in r.pose) { if (vr && /Arm/.test(k)) { r.pose[k].copy(base[k]); continue; } r.pose[k].copy(base[k].slerp(r.pose[k], w)); }
    r.bob = bob0 + (out.bob || 0) * w;
    this.out = out;
    return w;
  }
  // after the body has moved this frame: put the gesture hands on the wrists
  place() { if (this.id && this.out) this.gestures(this.out, this.w); }
  gestures(out, w) {
    const r = this.c.rag, c = this.c, fwd = _v.set(Math.sin(r.yaw), 0, Math.cos(r.yaw)).clone(), kH = r.height / 1.68;
    for (const S of ['L', 'R']) {
      const h = this.hands[S], kind = out.hand && out.hand[S], name = 'lArm' + S, on = !!kind && w > 0.35 && r.handHide && c.rag.modelLoaded !== false && !c.down;
      h.root.visible = on; if (r.handHide) r.handHide[name] = on;
      if (!on) continue;
      h.shape(kind);
      const wr = new THREE.Vector3(), dir = new THREE.Vector3(); r.wrist(name, wr, dir);
      const sideOut = new THREE.Vector3(S === 'L' ? 1 : -1, 0, 0).applyAxisAngle(Y, r.yaw);
      const back = kind === 'palm' ? new THREE.Vector3(0, -1, 0) : kind === 'fist' ? sideOut : fwd;   // palms up / thumbs up / backs of the hands out front
      h.place(wr, dir, back, kH * 1.04);
    }
  }

  // ---------------------------------------------------------------- MIDDLE FINGER
  finger(t) {
    const r = this.c.rag, P = r.pose;
    const up = ramp(t, 0.1, 0.45);
    const pump = Math.exp(-(((t - 1.15) / 0.09) ** 2)) + Math.exp(-(((t - 1.95) / 0.09) ** 2)) * 1.1 + Math.exp(-(((t - 2.6) / 0.11) ** 2)) * 0.6;
    for (const [S, sx] of [['L', 1], ['R', -1]]) {
      // upper arm: elbow forward and a little out, at belly height; forearm up, hand in front of the shoulder
      r.aim('uArm' + S, sx * (0.32 - up * 0.06), -0.55 + up * 0.25, 0.75 + pump * 0.25);
      r.aim('lArm' + S, sx * 0.04, 0.95 * up - 0.4 * (1 - up), 0.32 + pump * 0.45 + (1 - up) * 0.6);
    }
    // weight on the right leg, left knee relaxed and turned out: a cocky stance
    r.aim('uLegL', 0.14, -1, 0.05); r.aim('lLegL', 0.1, -1, -0.1);
    r.aim('uLegR', -0.05, -1, 0.0); r.aim('lLegR', -0.03, -1, 0.0);
    P.pelvis.setFromAxisAngle(Z, -0.07).multiply(_q.setFromAxisAngle(Y, 0.08));
    P.chest.setFromAxisAngle(X, 0.05 + pump * 0.14).multiply(_q.setFromAxisAngle(Z, 0.05));
    // chin up, head cocked to one side, a nod with each pump
    P.head.setFromAxisAngle(X, -0.2 + pump * 0.22).multiply(_q.setFromAxisAngle(Z, 0.14)).multiply(_q.setFromAxisAngle(Y, -0.08));
    return { hand: t > 0.25 ? { L: 'finger', R: 'finger' } : null, bob: -0.012 * r.height / 1.68 };
  }

  // ---------------------------------------------------------------- THE GRIDDY
  griddy(t) {
    const r = this.c.rag, P = r.pose, kH = r.height / 1.68;
    const B = 0.36, n = Math.floor(t / B), ph = (t % B) / B, side = n % 2 ? 'R' : 'L', sx = side === 'L' ? 1 : -1, other = side === 'L' ? 'R' : 'L';
    // goggles on counts 7-8 of every 8 (eased in and out)
    const bar = t / B % 8, g = ss((bar - 5.6) / 0.5) * (1 - ss((bar - 7.6) / 0.4)) + (bar < 0.4 ? 1 - ss(bar / 0.4) : 0) * (t > B * 8 ? 1 : 0);
    // the stepping leg: knee up with the heel kicked back, then the foot flicked out front onto its heel, then home
    const hip = 0.62 * Math.sin(Math.PI * Math.min(1, ph / 0.8)), knee = ph < 0.42 ? 1.5 * Math.sin(Math.PI * ph / 0.42) : -0.3 * Math.sin(Math.PI * Math.min(1, (ph - 0.42) / 0.5));
    r.aim('uLeg' + side, sx * 0.07, -1, hip); r.aim('lLeg' + side, sx * 0.05, -1, hip - knee);
    // the standing leg: soft knee, springing
    const spring = 0.12 + 0.1 * Math.sin(Math.PI * ph);
    r.aim('uLeg' + other, -sx * 0.08, -1, 0.1 + spring * 0.4); r.aim('lLeg' + other, -sx * 0.05, -1, 0.1 - spring);
    // a hop on every step
    const bob = (0.03 * Math.sin(Math.PI * ph) - 0.03) * kH;
    // fists pumping against the legs, elbows bent
    const sw = Math.sin(Math.PI * ph) * sx;      // + = left arm forward
    const pumpL = sw, pumpR = -sw;
    const arms = {
      L: [[0.2, -0.85, 0.15 + 0.55 * pumpL], [0.06, 0.05 + 0.3 * pumpL, 1]],
      R: [[-0.2, -0.85, 0.15 + 0.55 * pumpR], [-0.06, 0.05 + 0.3 * pumpR, 1]],
    };
    // goggles: elbows up and out at shoulder height, hands round the eyes
    const gog = { L: [[0.6, -0.05, 0.6], [-0.72, 0.6, 0.18]], R: [[-0.6, -0.05, 0.6], [0.72, 0.6, 0.18]] };
    for (const S of ['L', 'R']) {
      const a = arms[S], b = gog[S], mix = (i) => a[i].map((v, k) => v + (b[i][k] - v) * g);
      r.aim('uArm' + S, ...mix(0)); r.aim('lArm' + S, ...mix(1));
    }
    // hunched forward, the chest twisting with the arms, the hips going the other way; head down and bobbing (up for the goggles)
    P.chest.setFromAxisAngle(X, 0.32 * (1 - g) + 0.08 * g).multiply(_q.setFromAxisAngle(Y, 0.22 * sw * (1 - g)));
    P.pelvis.setFromAxisAngle(Y, -0.12 * sw * (1 - g)).multiply(_q.setFromAxisAngle(Z, 0.05 * sx));
    P.head.setFromAxisAngle(X, (0.12 + 0.08 * Math.sin(Math.PI * ph * 2)) * (1 - g) - 0.08 * g).multiply(_q.setFromAxisAngle(Z, 0.05 * sw));
    if (n !== this.lastBeat) { this.lastBeat = n; }
    return { hand: g > 0.5 ? { L: 'goggle', R: 'goggle' } : { L: 'fist', R: 'fist' }, bob };
  }

  // ---------------------------------------------------------------- SIX SEVEN
  sixseven(t) {
    const r = this.c.rag, P = r.pose, kH = r.height / 1.68;
    const f = 2.3, s = Math.sin(2 * Math.PI * f * (t - 0.2)), go = ramp(t, 0.05, 0.3);
    // elbows tucked into the sides, forearms out front palms up, see-sawing
    r.aim('uArmL', 0.24, -1, 0.12); r.aim('lArmL', 0.1, (0.05 + 0.62 * s) * go, 1);
    r.aim('uArmR', -0.24, -1, 0.12); r.aim('lArmR', -0.1, (0.05 - 0.62 * s) * go, 1);
    // shoulders shrug with it (the chest rocks), a little sway in the hips
    P.chest.setFromAxisAngle(Z, 0.07 * s).multiply(_q.setFromAxisAngle(X, -0.04)).multiply(_q.setFromAxisAngle(Y, 0.05 * s));
    P.pelvis.setFromAxisAngle(Z, -0.035 * s);
    // the head bobs on every beat and tilts towards the hand that's down
    P.head.setFromAxisAngle(X, 0.1 * Math.abs(s) - 0.04).multiply(_q.setFromAxisAngle(Z, -0.13 * s)).multiply(_q.setFromAxisAngle(Y, 0.08 * s));
    // knees bounce on every beat
    const k = Math.abs(s);
    r.aim('uLegL', 0.07, -1, 0.07 * k); r.aim('lLegL', 0.05, -1, -0.12 * k);
    r.aim('uLegR', -0.07, -1, 0.07 * k); r.aim('lLegR', -0.05, -1, -0.12 * k);
    // "6" ... "7" as each hand comes up
    const beat = Math.floor(f * (t - 0.2) * 2 + 0.5);
    if (t > 0.3 && beat !== this.lastBeat) { this.lastBeat = beat; const S = beat % 2 ? 'R' : 'L'; this.onWord && this.onWord(beat % 2 ? '7' : '6', r.tip('lArm' + S, new THREE.Vector3())); }
    return { hand: { L: 'palm', R: 'palm' }, bob: -0.02 * k * kH };
  }
}
