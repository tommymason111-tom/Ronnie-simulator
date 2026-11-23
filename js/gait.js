// Locomotion for every body in the game (the squad, Tommy, punters, staff, other players, bots, your own body): standing,
// walking, jogging and sprinting, with starts, stops and turns, worked out from how people really move.
//
// It's the base layer: legs, hips and the trunk come from here every frame, and anything else (an emote, a seat, a
// punter's clip, a gun held up in Search & Destroy) can pose the arms, or the whole body, over the top of it.
//
// How it works
//  - One phase runs round a stride (0..1). The left foot lands at 0, the right at 0.5. Each foot is on the ground for the
//    first `duty` of its half of the cycle and in the air for the rest.
//  - A foot on the ground is LOCKED where it landed (in the world), and the leg reaches it with two-bone IK
//    (hip -> knee -> ankle), so nothing slides. It rolls heel -> flat -> ball the way a real foot does (the "three
//    rockers": the foot pivots on the heel after heel strike, the shin rolls over the flat foot, then the heel lifts and
//    it pivots on the ball until toe-off).
//  - A foot in the air swings from where it took off to where it will land. Where it lands is planned from the speed:
//    half a stance length ahead of where the hip will be, so the foot is under the body at mid-stance. Its path follows
//    the hip and knee angle curves of a real swing (so a sprint gets the heel kicked up behind and the knee driven high),
//    pinned to the exact take-off and landing spots.
//  - How fast the feet cycle (cadence) and how long they stay down (duty factor) come from tables of real speed data,
//    scaled for leg length (dynamic similarity), so a walk blends into a jog and a sprint with no pop.
//  - The pelvis bobs, drops on the swing side, twists with the legs and tilts forward with speed; the chest twists the
//    other way; the arms swing opposite to the legs with the elbows bending to ~90 degrees at a sprint; the body leans
//    into accelerations and round corners; the head stays level.
//  - Heavier bodies (a player's stage, a punter's gut) step shorter and quicker, plant their feet wider, swing their
//    legs and arms out round the belly, bounce and waddle more, and land with a thud that wobbles the belly.
//
// Where the numbers come from (all turned into the tables below; nothing copied from any animation file)
//  - Walking joint angles over the gait cycle: D. A. Winter, "The Biomechanics and Motor Control of Human Gait" (1991)
//    and J. Perry & J. Burnfield, "Gait Analysis" (2010): hip ~30 deg flexed at heel strike, ~10 deg extended at
//    toe-off (~62% of the cycle), peak swing flexion ~33 deg at ~85%; knee ~15-20 deg loading flexion, ~40 deg at
//    toe-off, peak ~60-65 deg at ~73%; foot ~15-20 deg toe-up at heel strike, flat from ~15% to ~45% of stance.
//  - Running and sprinting: T. F. Novacheck, "The biomechanics of running", Gait & Posture 7 (1998); R. A. Mann &
//    J. Hagy, "Biomechanics of walking, running, and sprinting", Am J Sports Med 8 (1980) (swing hip flexion ~40 deg
//    jogging, ~60 running, ~80 sprinting; swing knee flexion ~90 jogging rising to ~125-130 sprinting; stance shrinking
//    from ~40% of the stride when jogging to under ~30% sprinting).
//  - Walk-run transition near Froude number 0.5 (~2.1 m/s for a 0.9 m leg) and ~135-140 steps/min (R. McN. Alexander;
//    Tudor-Locke et al. 2020); cadence ~100-120 steps/min walking, ~160-170 jogging, ~180-200 fast running.
//  - Vertical movement of the centre of mass: ~2% of body height walking (highest at mid-stance, the inverted
//    pendulum); 6-10 cm running (lowest at mid-stance, the spring); pelvis rotation ~4-5 deg and obliquity ~4-5 deg each
//    way walking, more running; thorax counter-rotating; arm swing ~20 deg each way walking with ~20-30 deg of elbow
//    bend, ~90 deg elbows running (Pontzer et al., "Control and function of arm swing in human walking and running",
//    J Exp Biol 2009).
//  - Procedural ideas: D. Rosen, "An Indie Approach to Procedural Animation" (GDC 2014, Overgrowth): few key poses,
//    stride driven by real ground speed, springs for weight; foot locking with two-bone IK and planned footholds as in
//    most procedural locomotion write-ups.
import * as THREE from 'three';
import { FLOOR } from './ragdoll.js';

const D = Math.PI / 180, TAU = Math.PI * 2;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const frac = (x) => x - Math.floor(x);
const wrap = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const minJerk = (w) => w * w * w * (10 - 15 * w + 6 * w * w);       // (a foot in the air: sets off and arrives smoothly)

// ---- curves: [x, value, x, value, ...], a smooth curve through the points (flat at every peak and trough, so a peak in
// the data is a peak in the curve, never overshot) ----
function curve(pts, k = 1) {
  const n = pts.length / 2, xs = new Float64Array(n), ys = new Float64Array(n), ms = new Float64Array(n);
  for (let i = 0; i < n; i++) { xs[i] = pts[i * 2]; ys[i] = pts[i * 2 + 1] * k; }
  for (let i = 0; i < n; i++) {
    if (i === 0) ms[i] = (ys[1] - ys[0]) / (xs[1] - xs[0]);
    else if (i === n - 1) ms[i] = (ys[i] - ys[i - 1]) / (xs[i] - xs[i - 1]);
    else { const a = (ys[i] - ys[i - 1]) / (xs[i] - xs[i - 1]), b = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]); ms[i] = a * b <= 0 ? 0 : (ys[i + 1] - ys[i - 1]) / (xs[i + 1] - xs[i - 1]); }
  }
  return { xs, ys, ms, n };
}
export function ev(c, x) {
  const xs = c.xs, n = c.n; if (x <= xs[0]) return c.ys[0]; if (x >= xs[n - 1]) return c.ys[n - 1];
  let i = 0; while (x > xs[i + 1]) i++;
  const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * c.ys[i] + (t3 - 2 * t2 + t) * h * c.ms[i] + (-2 * t3 + 3 * t2) * c.ys[i + 1] + (t3 - t2) * h * c.ms[i + 1];
}
const tri = (w, r, s) => ({ w: curve(w, D), r: curve(r, D), s: curve(s, D) });
const ev3 = (t, x, run, spr) => ev(t.w, x) * (1 - run) + (ev(t.r, x) * (1 - spr) + ev(t.s, x) * spr) * run;
const mix3 = (w, r, s, run, spr) => w * (1 - run) + (r * (1 - spr) + s * spr) * run;

// ---- the tables ----
// Cadence (steps a minute) against speed (m/s, for a 0.9 m leg). Walking ~100-120, the walk-run change at ~2.1 m/s and
// ~135-140 steps/min, jogging ~160-170, fast running ~180-200.
export const CADENCE = curve([0, 70, 0.5, 82, 1.0, 100, 1.3, 110, 1.6, 119, 2.0, 132, 2.3, 150, 2.6, 157, 3.0, 162, 3.5, 168, 4.0, 173, 5.0, 182, 6.0, 192, 8.0, 230]);
// Duty factor (the part of a stride a foot is on the ground): ~0.6 walking (double support), dropping under 0.5 the moment
// it's a run (a flight phase), ~0.38 jogging, ~0.3 fast running.
export const DUTY = curve([0, 0.66, 1.0, 0.63, 1.6, 0.61, 2.05, 0.59, 2.3, 0.41, 3.0, 0.38, 4.0, 0.34, 5.0, 0.31, 6.5, 0.28]);
// Swing: hip flexion (+ = thigh forward) and knee flexion against swing progress (0 = toe-off, 1 = landing), in degrees.
// Walk: Winter / Perry (60-100% of the cycle). Run and sprint: Novacheck, Mann & Hagy.
const SW_HIP = tri([0, -5, 0.25, 10, 0.5, 25, 0.68, 33, 1, 30], [0, -12, 0.25, 12, 0.5, 40, 0.75, 56, 1, 42], [0, -20, 0.22, 16, 0.48, 64, 0.72, 80, 1, 48]);
const SW_KNEE = tri([0, 38, 0.15, 55, 0.32, 63, 0.5, 55, 0.75, 25, 1, 4], [0, 28, 0.2, 72, 0.42, 100, 0.68, 70, 0.88, 32, 1, 18], [0, 32, 0.18, 94, 0.4, 128, 0.62, 96, 0.85, 42, 1, 22]);
// Stance: the foot's pitch against the ground (+ = toes down) over stance (0 = landing, 1 = toe-off). A walk lands on the
// heel toes up (~18 deg), goes flat, peels off the ball; a jog lands nearer the middle of the foot; a sprint lands on the
// ball and the heel barely touches.
const ST_PITCH = tri([0, -18, 0.15, 0, 0.55, 0, 0.8, 14, 1, 36], [0, -8, 0.12, 0, 0.45, 0, 0.75, 14, 1, 32], [0, 7, 0.3, 2, 0.55, 7, 0.8, 24, 1, 44]);

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const _H = new THREE.Vector3(), _T = new THREE.Vector3(), _K = new THREE.Vector3(), _P = new THREE.Vector3(), _n = new THREE.Vector3(), _u = new THREE.Vector3(), _s = new THREE.Vector3();
const _X = new THREE.Vector3(1, 0, 0), _Y = new THREE.Vector3(0, 1, 0), _Z = new THREE.Vector3(0, 0, 1);
const _F = new THREE.Quaternion(), _qi = new THREE.Quaternion();
const _rk = { x: 0, y: 0, z: 0 }, _fk = { al: 0, up: 0 };
const LEG = ['uLegL', 'lLegL', 'uLegR', 'lLegR'], SIDES = ['L', 'R'], FOREARMS = ['lArmL', 'lArmR'], SHINS = ['lLegL', 'lLegR'];

// q: turn bind direction `from` onto `to`, then twist about `to` so the bind's forward (+Z: the front of the knee) faces
// `fwd` as nearly as it can
function limbQuat(q, from, to, fwd) {
  q.setFromUnitVectors(from, to);
  _v.copy(_Z).applyQuaternion(q); _v.addScaledVector(to, -_v.dot(to));
  _v2.copy(fwd).addScaledVector(to, -fwd.dot(to));
  if (_v.lengthSq() < 1e-8 || _v2.lengthSq() < 1e-8) return q;
  _v.normalize(); _v2.normalize();
  const ang = Math.atan2(_v3.crossVectors(_v, _v2).dot(to), _v.dot(_v2));
  return q.premultiply(_q2.setFromAxisAngle(to, ang));
}

function makeFoot(side) {
  return { side, stance: true, ph: 0, phL: 0, w: 0,
    px: 0, py: 0, pz: 0, pyaw: 0,                  // where it's planted (the ankle with the foot flat; x, z in the world as drawn)
    tx: 0, ty: 0, tz: 0, tyaw: 0,                  // where it'll land
    x0: 0, y0: 0, z0: 0, pitch0: 0, ank0: 0,       // where it took off from
    ax: 0, ay: 0, az: 0, pitch: 0, fyaw: 0,        // this frame: the ankle, the foot's pitch (+ = toes down) and which way it points
    rigid: 0, ankRel: 0 };
}

export class Gait {
  // where the player is looking from (Character.update keeps it): a long way off, a body skips the second placing of its
  // legs each frame (a planted foot may shift by one frame's step there, never building up: not visible that far away)
  static eye = null;
  constructor(c) {
    this.c = c; const r = this.r = c.rag; r.legIK = this;
    this.ph = 0.05; this.frame = -1; this.lastT = null; this.reset = true;
    this.vx = 0; this.vz = 0; this.vb = 0; this.acc = 0; this.accL = 0; this.yawRate = 0; this.lastYaw = 0; this.lx = 0; this.lz = 0;
    this.run = 0; this.spr = 0; this.duty = 0.66; this.f = 0; this.moveW = 0; this.idleW = 1; this.heavy = 0; this.shift = 0; this.need = false;
    this.thud = 0; this.thudV = 0; this.meas = 0; this.mvT = 0; this.lean = 0; this.bank = 0; this.dropS = 0;
    this.feet = [makeFoot(1), makeFoot(-1)];
    this.wq = [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()];
    this.written = false; this.curl = 0; this.curlF = -1;
    this.gk = undefined; this.geom();
  }
  // the leg's measurements, from the body's bind pose (and its feet, once the model's loaded)
  geom() {
    const r = this.r, P = r.parts, kH = r.height / 1.68; this.gk = r.footAxes;
    const pel = P.pelvis.def; this.pelA = pel.a.clone(); this.kH = kH;
    this.leg = ['L', 'R'].map((S) => {
      const u = P['uLeg' + S].def, l = P['lLeg' + S].def, fa = r.footAxes && r.footAxes['lLeg' + S];
      const ank = fa ? fa.ankle.clone() : l.b.clone(), sole = fa ? fa.sole : Math.min(0, l.b.y - 0.04 * kH);
      const heelZ = fa ? fa.heel : ank.z - 0.055 * kH, ballZ = fa ? fa.ball : ank.z + 0.12 * kH;
      return { hip: u.a.clone(), knee: u.b.clone(), ank, L1: u.a.distanceTo(u.b), L2: l.a.distanceTo(ank),
        vT: u.b.clone().sub(u.a).normalize(), vS: ank.clone().sub(l.a).normalize(),
        heel: new THREE.Vector3(0, sole - ank.y, heelZ - ank.z), ball: new THREE.Vector3(0, sole - ank.y, ballZ - ank.z), foot: !!fa };
    });
    this.legLen = this.leg[0].hip.y;
    this.norm = Math.sqrt(0.9 / Math.max(0.3, this.legLen));        // (dynamic similarity: a short leg at the same speed is going "faster")
  }
  // which way round the floor is at a point
  floorAt(x, z) { return FLOOR.at ? FLOOR.at(x, z) : 0; }

  // Run once a frame, from setIdlePose / walkPose (the first call in a frame moves things on; any more just pose again)
  update(dt, walking = false) {
    const r = this.r, c = this.c;
    if (r.footAxes !== this.gk) { this.geom(); this.reset = true; }
    if (dt == null) { const t = c.t || 0; dt = this.lastT == null ? 0 : clamp(t - this.lastT, 0, 0.1); this.lastT = t; } else this.lastT = c.t;
    if (this.frame !== r.frameNo) { this.frame = r.frameNo; this.advance(clamp(dt, 0, 0.1)); }
    this.poseBody(walking);
    this.solve();
  }

  // the body's scale as drawn (a player's stage, a boss): the planning's done as drawn, the legs solved in the body
  scales() { const g = this.r.group, o = this._sc || (this._sc = [1, 1]); o[0] = g ? g.scale.x || 1 : 1; o[1] = g ? g.scale.y || 1 : 1; return o; }

  neutral(foot, rx, rz, yaw, out) {
    const leg = this.leg[foot.side > 0 ? 0 : 1], kH = this.kH, h = this.heavy, run = this.run, spr = this.spr, mw = this.moveW;
    // how far out from the middle each foot lands: walking a little inside the hips, running nearly in a line, a big belly
    // further out (the legs go round it)
    const narrow = mix3(0.035, 0.06, 0.075, run, spr) * kH * mw;
    const x = foot.side * Math.max(0.02 * kH, Math.abs(leg.ank.x) - narrow + 0.07 * h * kH + 0.01 * (1 - mw) * kH), z = leg.ank.z;
    const [sx] = this._s;
    const s = Math.sin(yaw), cy = Math.cos(yaw);
    out.x = rx + (x * cy + z * s) * sx; out.z = rz + (-x * s + z * cy) * sx;
    out.yaw = yaw + foot.side * 0.12 * h;
    return out;
  }

  doReset() {
    const r = this.r; this.reset = false; this._s = this.scales();
    for (const f of this.feet) {
      const n = this.neutral(f, r.root.x, r.root.z, r.yaw, _rk);
      f.px = f.tx = f.ax = n.x; f.pz = f.tz = f.az = n.z; f.pyaw = f.tyaw = f.fyaw = n.yaw;
      f.py = f.ty = f.ay = this.floorAt(n.x, n.z) + 0.02 + this.leg[0].ank.y; f.stance = true; f.pitch = 0; f.w = 0;
    }
    this.ph = 0.05; this.lx = r.root.x; this.lz = r.root.z; this.lastYaw = r.yaw; this.vx = this.vz = this.vb = 0; this.idleW = 1; this.moveW = 0;
  }

  // ---- moving on: speed, the phase, the feet ----
  advance(dt) {
    const r = this.r, c = this.c, root = r.root;
    this._s = this.scales(); const [sx, sy] = this._s;
    const jump = Math.hypot(root.x - this.lx, root.z - this.lz);
    if (this.reset || r.mode !== 'anim' || !r._lastP || c.seated || jump > 1.2 * sx) this.doReset();
    // how fast and which way: what they're asked to walk at (the squad), or else how far they really went (other players)
    // (what they're asked to walk at is exact, unless they're not really getting there: walking into a wall or a table,
    // where the feet would otherwise stride along on the spot)
    let vx = this.vx, vz = this.vz; const mv = r.moveVel;
    if (dt > 0) { vx = (root.x - this.lx) / dt; vz = (root.z - this.lz) / dt; }
    // (how fast they really went, smoothed over a few frames: one frame's movement over the next frame's time is noisy
    // when frame times vary)
    if (dt > 0) this.meas += (Math.hypot(vx, vz) - this.meas) * (1 - Math.exp(-dt / 0.25));
    const m2 = mv ? mv.x * mv.x + mv.z * mv.z : 0;
    if (m2 > 1e-6 && (this.meas > 0.4 * Math.sqrt(m2) || this.mvT < 0.4)) { vx = mv.x; vz = mv.z; }
    this.mvT = m2 > 1e-6 ? (this.mvT || 0) + dt : 0;
    const k = dt > 0 ? 1 - Math.exp(-dt / 0.1) : 0;
    this.vx += (vx - this.vx) * k; this.vz += (vz - this.vz) * k;
    this.lx = root.x; this.lz = root.z;
    if (dt > 0) { const yr = wrap(r.yaw - this.lastYaw) / dt; this.yawRate += (clamp(yr, -8, 8) - this.yawRate) * (1 - Math.exp(-dt / 0.15)); }
    this.lastYaw = r.yaw;
    const vd = Math.hypot(this.vx, this.vz), vb = vd / sx, vn = vd / sy * this.norm;
    if (dt > 0) { const a = (vb - this.vb) / dt; this.acc += (clamp(a, -12, 12) - this.acc) * (1 - Math.exp(-dt / 0.2)); }
    this.vb = vb; this.vn = vn;
    const g = c.cfg && c.cfg.body && c.cfg.body.girth || 1;
    this.heavy = clamp(Math.max(r.fat || 0, c.heavy || 0, (g - 1.1) * 1.8), 0, 1);
    const h = this.heavy;
    this.run = sstep(1.95, 2.35, vn); this.spr = sstep(3.4, 4.8, vn);
    this.moveW += (sstep(0.05, 0.55, vb) - this.moveW) * (dt > 0 ? 1 - Math.exp(-dt / 0.12) : 0);
    // heavier: shorter, quicker steps (the same speed), and longer on the ground
    let f = ev(CADENCE, vn) / 120 * (1 + 0.2 * h);
    this.duty = clamp(ev(DUTY, vn) + 0.05 * h * this.run, 0.25, 0.7);
    const feet = this.feet, anySwing = !feet[0].stance || !feet[1].stance;
    // stood still: only step when a foot's been left behind (turning on the spot, a shove) or one's still in the air
    let err = 0;
    if (vb < 0.3) for (const ft of feet) { const n = this.neutral(ft, root.x, root.z, r.yaw, _rk); err = Math.max(err, Math.hypot(n.x - ft.px, n.z - ft.pz) / sx / this.kH, Math.abs(wrap(n.yaw - ft.pyaw)) * 0.25); }
    this.need = vb > 0.07 || anySwing || err > 0.13;
    if (this.need && vb < 0.45) f = Math.max(f, 0.85);        // (a step on the spot is a brisk one)
    this.f = f;
    if (this.need) this.ph = frac(this.ph + f * dt);
    this.idleW += ((vb < 0.07 && !anySwing ? 1 : 0) - this.idleW) * (dt > 0 ? 1 - Math.exp(-dt / 0.2) : 0);
    // leaning into a speed-up, back out of a slow-down; banking into a turn (v·ω/g)
    this.accL += (clamp(Math.atan(this.acc / 9.81) * 0.7, -0.2, 0.3) - this.accL) * (dt > 0 ? 1 - Math.exp(-dt / 0.15) : 0);
    this.bank = clamp(vb * this.yawRate / 9.81 * 0.8, -0.32, 0.32) * this.moveW;
    // the trunk's lean: a little walking, more running, a big one sprinting (plus the speed-up lean); a big belly leans back
    const leanW = ((mix3(3, 8, 17, this.run, this.spr) * D - 3 * D * h * (1 - this.run)) + this.accL) * this.moveW;
    this.lean += (leanW - this.lean) * (dt > 0 ? 1 - Math.exp(-dt / 0.12) : 0);
    // the thud of landing (heavier: a bigger one), on a spring
    if (dt > 0) { this.thudV += (-120 * this.thud - 14 * this.thudV) * dt; this.thud += this.thudV * dt; }
    const Tst = this.duty / Math.max(0.3, f);
    for (const ft of feet) {
      const phf = frac(this.ph + (ft.side > 0 ? 0 : 0.5)), prev = ft.ph; ft.ph = phf;
      if (ft.stance) {
        // at full stretch behind (the hips would have to drop to keep it down) or left behind altogether: up it comes now,
        // as a real leg does when it runs out of reach (so a fast run spends less of its stride on the ground)
        const far = ft.stretch || Math.hypot(ft.px - root.x, ft.pz - root.z) / sx > (this.leg[0].L1 + this.leg[0].L2) * 1.05;
        if (this.need && (phf >= this.duty || far)) this.lift(ft, phf);
      } else {
        const wrapped = phf < prev - 0.3;
        ft.w = wrapped ? 1 : Math.max(ft.w, clamp((phf - ft.phL) / Math.max(0.05, 1 - ft.phL), 0, 1));
        if (ft.w < 0.85) this.target(ft, phf, f, Tst);
        if (ft.w >= 1) this.land(ft);
      }
    }
  }
  lift(ft, phf) { ft.stance = false; ft.phL = Math.min(phf, 0.97); ft.w = 0; ft.x0 = ft.ax; ft.y0 = ft.ay; ft.z0 = ft.az; ft.pitch0 = ft.pitch; ft.ank0 = ft.ankRel; this.target(ft, phf, this.f, this.duty / Math.max(0.3, this.f));
    const i = ft.side > 0 ? 0 : 1, sx = this._s[0]; this.swingPoint(ft, i, 0, _P);
    // (a foot that leaves the floor at full stretch: taken from just within the leg's reach, never stretching it)
    const hp = this._hip, dx = (ft.ax - hp.x) / sx, dy = ft.ay - hp.y, dz = (ft.az - hp.z) / sx, d = Math.hypot(dx, dy, dz), L = (this.leg[i].L1 + this.leg[i].L2) * 0.995;
    if (d > L) { const k = L / d; ft.ax = hp.x + dx * k * sx; ft.ay = hp.y + dy * k; ft.az = hp.z + dz * k * sx; }
    ft.o0x = ft.ax - _P.x; ft.o0y = ft.ay - _P.y; ft.o0z = ft.az - _P.z; }
  // the swinging ankle w of the way through its swing, by the swing curves, from where the hip is now (x, z as drawn)
  swingPoint(ft, i, w, out) {
    const r = this.r, P = r.pose, root = r.root, sx = this._s[0], leg = this.leg[i], yaw = r.yaw, sn = Math.sin(yaw), cs = Math.cos(yaw);
    _H.copy(leg.hip).sub(this.pelA).applyQuaternion(P.pelvis).add(this.pelA);
    const sz = r.shiftZ || 0, sw = r.swayX || 0, by = 0.02 + r.bob + this.floorAt(root.x, root.z);
    const hx = sn * sz + cs * sw + _H.x * cs + _H.z * sn, hz = cs * sz - sn * sw - _H.x * sn + _H.z * cs;
    // which way it swings: the way they're going (or towards where it'll land, stepping on the spot)
    let dx = sn, dz = cs; const v = this.vb;
    if (v > 0.25) { const l = Math.hypot(this.vx, this.vz); dx = this.vx / l; dz = this.vz / l; }
    else { const ex = ft.tx - ft.x0, ez = ft.tz - ft.z0, l = Math.hypot(ex, ez); if (l > 0.05 * this.kH) { dx = ex / l; dz = ez / l; } }
    const amp = clamp(this.vn / 1.3, 0.3, 1) * (0.4 + 0.6 * Math.max(0, dx * sn + dz * cs));
    this.swingFK(w, leg, amp, _fk);
    const hp = this._hip || (this._hip = { x: 0, y: 0, z: 0 }); hp.x = root.x + hx * sx; hp.y = by + _H.y; hp.z = root.z + hz * sx;
    out.x = hp.x + dx * _fk.al * sx; out.z = hp.z + dz * _fk.al * sx; out.y = hp.y + _fk.up;
    return out;
  }
  land(ft) {
    ft.stance = true; ft.w = 0; ft.px = ft.tx; ft.pz = ft.tz; ft.py = ft.ty; ft.pyaw = ft.tyaw;
    this.thudV -= (0.05 + 0.3 * this.heavy) * Math.min(1.5, this.vb * 0.6) * this.kH;
  }
  // where the foot in the air will land: under where the hip will be at mid-stance
  target(ft, phf, f, Tst) {
    const r = this.r, tr = Math.max(0, 1 - phf) / Math.max(0.3, f), yawT = r.yaw + clamp(this.yawRate * tr, -0.6, 0.6);
    // (the foot lands ahead of the hip by a share of the ground it covers in stance: about half walking, less running,
    // ~1/3 sprinting: runners land nearly under themselves and push off a long way behind; never so far it overstrides)
    const fwdShare = mix3(0.5, 0.38, 0.32, this.run, this.spr), reach = this.leg[0].L1 + this.leg[0].L2;
    const ahead = this.vb > 0.07 ? tr + Math.min(Tst * fwdShare, 0.42 * reach / Math.max(0.1, this.vb)) : 0;
    const n = this.neutral(ft, r.root.x + this.vx * ahead, r.root.z + this.vz * ahead, yawT, _rk);
    ft.tx = n.x; ft.tz = n.z; ft.tyaw = n.yaw; ft.ty = this.floorAt(n.x, n.z) + 0.02 + this.leg[0].ank.y;
  }

  // the ankle of a planted foot, rolled to `pitch` round its heel (toes up) or its ball (heel up)
  rocker(ft, leg, px, py, pz, yaw, pitch, out) {
    const C = pitch < 0 ? leg.heel : leg.ball, cp = Math.cos(pitch), sp = Math.sin(pitch);
    const ry = C.y * cp - C.z * sp, rz = C.y * sp + C.z * cp;
    const dy = C.y - ry, dz = C.z - rz, sx = this._s[0];
    out.x = px + dz * Math.sin(yaw) * sx; out.z = pz + dz * Math.cos(yaw) * sx; out.y = py + dy;
    return out;
  }
  // the swing's shape, from the hip and knee curves: ankle along / up from the hip, in the leg's own plane
  swingFK(w, leg, amp, out) {
    const a = ev3(SW_HIP, w, this.run, this.spr) * amp, kn = ev3(SW_KNEE, w, this.run, this.spr) * amp;
    out.al = leg.L1 * Math.sin(a) + leg.L2 * Math.sin(a - kn); out.up = -leg.L1 * Math.cos(a) - leg.L2 * Math.cos(a - kn);
    return out;
  }

  // ---- this frame's pose: hips, trunk, arms ----
  poseBody(walking) {
    const r = this.r, c = this.c, P = r.pose, kH = this.kH, run = this.run, spr = this.spr, mw = this.moveW, h = this.heavy;
    const ph = this.ph, m = this.duty * 0.5, cyc = Math.cos(TAU * ph), side = Math.cos(TAU * (ph - m)), dbl = Math.cos(2 * TAU * (ph - m));
    // the pelvis: twists with the legs, drops on the swinging side, tips forward with speed (and a belly makes it all bigger)
    const pYaw = -mix3(5, 7, 9, run, spr) * D * cyc * mw;
    const obl = mix3(4, 6, 5, run, spr) * D * (1 + h) * side * mw - this.shift * 0.045 * (1 - mw);
    const tilt = (mix3(2, 7, 12, run, spr) + mix3(1.5, 2.5, 3, run, spr) * dbl) * D * mw;
    const roll = -this.bank;
    P.pelvis.setFromAxisAngle(_Y, pYaw).multiply(_q.setFromAxisAngle(_Z, obl + roll * 0.8)).multiply(_q.setFromAxisAngle(_X, tilt));
    // side to side over the foot that's down (a waddle when heavy), into a turn, and the weight on one leg stood still
    r.swayX = (mix3(0.022, 0.01, 0.006, run, spr) + 0.05 * h) * kH * side * mw + this.bank * this.leg[0].hip.y * 0.6 - this.shift * 0.022 * kH * (1 - mw);
    // up and down: highest at mid-stance walking (vaulting over the leg), lowest at mid-stance running (the spring), a
    // bit lower overall running; heavier bounces more
    const amp = 1 + 0.7 * h;
    const bw = (0.018 * dbl * amp - 0.024) * kH, br = (-mix3(0.035, 0.035, 0.027, 1, spr) * amp * dbl - mix3(0.03, 0.03, 0.05, 1, spr)) * kH;
    r.bob = (bw * (1 - run) + br * run) * mw - 0.008 * kH * Math.abs(this.shift) * (1 - mw) + this.thud;
    r.jiggle = h > 0.02 ? clamp(-this.thud / kH * 6 * h, -0.25, 0.25) : 0;
    this.upper(walking);
  }
  upper(walking) {
    const r = this.r, c = this.c, P = r.pose, run = this.run, spr = this.spr, mw = this.moveW, h = this.heavy;
    if (mw < 0.002 && !walking) { this.curlTo(0); return; }
    const ph = this.ph, cyc = Math.cos(TAU * ph);
    // the chest: turns against the pelvis, leans with speed (a big lean at a sprint) and into a speed-up, banks into turns
    const thor = mix3(6, 10, 14, run, spr) * D * cyc * mw;
    _q.setFromAxisAngle(_Y, thor).multiply(_q2.setFromAxisAngle(_X, this.lean)).multiply(_qi.setFromAxisAngle(_Z, -this.bank * 0.5));
    if (walking) P.chest.copy(_q); else P.chest.slerp(_q, mw);
    // the arms: opposite to the legs (a touch behind them), out round a belly; elbows bend more the faster, most when the
    // arm's forward (hand up by the chin at a sprint, down by the hip at the back)
    const ca = Math.cos(TAU * (ph - mix3(-0.05, -0.15, -0.19, run, spr))),      // (the arm's furthest back as its thigh's furthest forward: late in the swing, and later the faster)
      A = mix3(20, 42, 55, run, spr) * D * mw * (1 - 0.25 * h), mean = mix3(-2, 3, -3, run, spr) * D * mw;
    const eB = mix3(22, 82, 92, run, spr) * D, eV = mix3(12, 15, 26, run, spr) * D, ab = mix3(8, 12, 10, run, spr) * D + 28 * D * h;
    const st = Math.sin(thor), ct = Math.cos(thor), lean = this.lean * 0.6, sl = Math.sin(lean), cl = Math.cos(lean);
    for (const S of SIDES) {
      const sx = S === 'L' ? 1 : -1, ts = mean - sx * A * ca, fw = A > 1e-4 ? (ts - mean) / A : 0;
      const el = 10 * D + (eB + eV * fw - 10 * D) * mw;
      const sb = Math.sin(ab), cb = Math.cos(ab);
      this.armDir(sx * sb, -cb * Math.cos(ts), cb * Math.sin(ts), st, ct, sl, cl);
      const u0 = _v.x, u1 = _v.y, u2 = _v.z;
      const ang = ts + el, cross = 0.18 * run * Math.max(0, fw) * mw;
      this.armDir(sx * (sb * 0.6 - cross), -cb * Math.cos(ang), cb * Math.sin(ang), st, ct, sl, cl);
      if (walking) { r.aim('uArm' + S, u0, u1, u2); r.aim('lArm' + S, _v.x, _v.y, _v.z); }
      else { _q2.copy(P['uArm' + S]); r.aim('uArm' + S, u0, u1, u2); P['uArm' + S].copy(_q2.slerp(P['uArm' + S], mw)); _q2.copy(P['lArm' + S]); r.aim('lArm' + S, _v.x, _v.y, _v.z); P['lArm' + S].copy(_q2.slerp(P['lArm' + S], mw)); }
    }
    // hands: relaxed walking, a loose fist running
    this.curlTo((0.2 + 0.32 * run) * mw);
    // the head stays level and looks where it's going (it's posed on its own, not carried by the chest)
    if (walking) { const he = this.he || (this.he = { yaw: 0, pitch: 0 }); he.yaw = -thor * 0.25; he.pitch = -0.02 + 0.1 * spr * mw + 0.03 * run * mw; c.headExtra = he; }
  }
  armDir(x, y, z, st, ct, sl, cl) {
    // carried by the chest's lean (partly) and twist
    const y1 = y * cl - z * sl, z1 = y * sl + z * cl;
    return _v.set(x * ct + z1 * st, y1, -x * st + z1 * ct);
  }
  // (anything posed after this, an emote's hands or a VR player's own fingers, sets its own curl over the top)
  curlTo(want) {
    const hp = this.r.handPose; if (!hp) return;
    if (this.curlF !== this.frame) { this.curlF = this.frame; this.curl += (want - this.curl) * 0.15; }
    for (const n of FOREARMS) { const p = hp[n]; if (p) p.curl = this.curl; }
  }

  // ---- the legs: each ankle where it should be this frame, then two-bone IK, then the foot ----
  solve() {
    const r = this.r, P = r.pose;
    this.place();
    this.bob0 = r.bob; this.solveLegs(true); this.bob1 = r.bob;
    // (what we wrote, to know next time if anyone's posed the legs over us)
    for (let i = 0; i < 4; i++) this.wq[i].copy(P[LEG[i]]);
    this.written = true;
  }
  // where each ankle is this frame (planted ones where they're planted, rolled; swinging ones carried with the hips)
  place() {
    const r = this.r, [sx] = this._s || this.scales(), kH = this.kH;
    const yaw = r.yaw, sy_ = Math.sin(yaw), cy_ = Math.cos(yaw);
    // where each ankle is this frame (as drawn), and its pitch
    for (let i = 0; i < 2; i++) {
      const ft = this.feet[i], leg = this.leg[i];
      if (ft.stance) {
        const u = clamp(ft.ph / Math.max(0.05, this.duty), 0, 1);
        let pitch = ev3(ST_PITCH, u, this.run, this.spr) * (1 - this.idleW) * Math.min(1, this.moveW * 2 + 0.3);
        if (!leg.foot) pitch = clamp(ft.rigid, -0.5, 0.6);        // (no ankle in this body: the whole foot rolls as the shin tips)
        this.rocker(ft, leg, ft.px, ft.py, ft.pz, ft.pyaw, pitch, _rk);
        ft.ax = _rk.x; ft.ay = _rk.y; ft.az = _rk.z; ft.pitch = pitch; ft.fyaw = ft.pyaw;
      } else {
        // in the air: the hip's own swing (the hip and knee curves, so it's always in reach: the heel kicks up behind, the
        // knee drives through), carried along with the hips, eased from where it took off to where it'll land
        const w = ft.w, s = minJerk(w);
        const hs = leg.foot ? ev3(ST_PITCH, 0, this.run, this.spr) : clamp(ft.rigid, -0.5, 0.6);
        this.rocker(ft, leg, ft.tx, ft.ty, ft.tz, ft.tyaw, hs, _rk);
        const x1 = _rk.x, y1 = _rk.y, z1 = _rk.z, tr = (1 - w) * (1 - ft.phL) / Math.max(0.3, this.f);
        this.swingPoint(ft, i, 1, _P); const o1x = x1 - _P.x - this.vx * tr, o1y = y1 - _P.y, o1z = z1 - _P.z - this.vz * tr;
        this.swingPoint(ft, i, w, _P);
        const out = 0.05 * this.heavy * kH * Math.sin(Math.PI * w) * ft.side;       // (round the belly)
        ft.ax = _P.x + ft.o0x * (1 - s) + o1x * s + out * cy_ * sx;
        ft.az = _P.z + ft.o0z * (1 - s) + o1z * s - out * sy_ * sx;
        // (never through the floor: at least a little clearance mid-swing)
        ft.ay = Math.max(_P.y + ft.o0y * (1 - s) + o1y * s, ft.y0 + (y1 - ft.y0) * s + 0.035 * kH * Math.sin(Math.PI * w));
        ft.fyaw = ft.pyaw + wrap(ft.tyaw - ft.pyaw) * s;
      }
    }
  }
  // two-bone IK for both legs from the ankle spots; lowers the hips if a leg can't reach (no stretched legs, no sliding)
  solveLegs(dropOk) {
    const r = this.r, P = r.pose, root = r.root, [sx] = this._s || this.scales();
    const yaw = r.yaw, sn = Math.sin(yaw), cs = Math.cos(yaw), sz = r.shiftZ || 0, sw = r.swayX || 0;
    const bx = root.x + sn * sz + cs * sw, bz = root.z + cs * sz - sn * sw;
    let by = 0.02 + r.bob + (FLOOR.at ? FLOOR.at(root.x, root.z) : 0);
    // hips and ankles in the body's own frame
    for (let pass = 0; pass < 2; pass++) {
      let drop = 0;
      for (let i = 0; i < 2; i++) {
        const ft = this.feet[i], leg = this.leg[i];
        _H.copy(leg.hip).sub(this.pelA).applyQuaternion(P.pelvis).add(this.pelA);
        const wx = root.x + (ft.ax - root.x) / sx - bx, wz = root.z + (ft.az - root.z) / sx - bz;
        _T.set(wx * cs - wz * sn, ft.ay - by, wx * sn + wz * cs);
        ft.lx = _T.x; ft.ly = _T.y; ft.lz = _T.z; ft.hx = _H.x; ft.hy = _H.y; ft.hz = _H.z;
        if (pass === 0) ft.stretch = false;
        if (ft.stance || ft.w > 0.92) { const L = (leg.L1 + leg.L2) * 0.992, dh2 = (_T.x - _H.x) ** 2 + (_T.z - _H.z) ** 2;
          let need = dh2 < L * L ? _H.y - (_T.y + Math.sqrt(L * L - dh2)) : 0.3 * this.kH;
          const behind = ft.stance && _T.z < _H.z;
          if (behind) { need = Math.min(need, 0.085 * this.kH);       // (a trailing leg never drags the hips right down: it's about to lift)
            // (and lifts a couple of frames early rather than late: near full stretch what it needs grows fast)
            const dh = Math.sqrt(dh2) + this.vb * 0.012, nAhead = dh < L ? _H.y - (_T.y + Math.sqrt(L * L - dh * dh)) : 1;
            if (pass === 0 && nAhead > 0.075 * this.kH) ft.stretch = true; }
          drop = Math.max(drop, need); }
      }
      if (pass === 0 && dropOk && drop > 1e-4) { const d = Math.min(drop, 0.3 * this.kH); r.bob -= d; by -= d; continue; }
      break;
    }
    for (let i = 0; i < 2; i++) {
      const ft = this.feet[i], leg = this.leg[i], S = i === 0 ? 'L' : 'R';
      _H.set(ft.hx, ft.hy, ft.hz); _T.set(ft.lx, ft.ly, ft.lz);
      const L1 = leg.L1, L2 = leg.L2;
      _n.subVectors(_T, _H); let d = _n.length(); if (d < 1e-6) { _n.set(0, -1, 0); d = 1e-6; } else _n.multiplyScalar(1 / d);
      d = clamp(d, Math.abs(L1 - L2) + 1e-3, (L1 + L2) * 0.9995);
      const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, L1 * L1 - a * a));
      // the knee points where the foot does (out a little round a belly)
      const fy = ft.fyaw - r.yaw;
      _P.set(Math.sin(fy) + ft.side * 0.25 * this.heavy, 0, Math.cos(fy));
      _v3.copy(_P).addScaledVector(_n, -_P.dot(_n)); if (_v3.lengthSq() < 1e-6) _v3.set(0, 0, 1); _v3.normalize();
      _K.copy(_H).addScaledVector(_n, a).addScaledVector(_v3, hh);
      _u.subVectors(_K, _H).normalize(); _s.copy(_H).addScaledVector(_n, d).sub(_K).normalize();
      limbQuat(P['uLeg' + S], leg.vT, _u, _P);
      limbQuat(P['lLeg' + S], leg.vS, _s, _P);
      // the foot: flat on the floor (or rolled to its pitch) whatever the shin's doing, within what an ankle can do
      _v.copy(_Z).applyQuaternion(P['lLeg' + S]); const rigid = Math.atan2(-_v.y, Math.hypot(_v.x, _v.z)); ft.rigid = rigid;
      if (!ft.stance) {        // in the air: the ankle points the toes after toe-off, comes back to neutral, then sets for landing
        const w = ft.w, hs = ev3(ST_PITCH, 0, this.run, this.spr);
        const rel = ft.ank0 * (1 - sstep(0, 0.55, w)), gw = sstep(0.6, 1, w);
        ft.pitch = (rigid + rel) * (1 - gw) + hs * gw;
      }
      ft.ankRel = ft.pitch - rigid;
      const fp = r.footPose && r.footPose['lLeg' + S];
      if (fp) { _F.setFromAxisAngle(_Y, fy).multiply(_q.setFromAxisAngle(_X, ft.pitch));
        fp.q.copy(P['lLeg' + S]).invert().multiply(_F);
        const ang = 2 * Math.acos(clamp(Math.abs(fp.q.w), 0, 1)); if (ang > 0.85) fp.q.slerp(_qi.identity(), 1 - 0.85 / ang); }
    }
  }
  // Called by the ragdoll just before it places the body (after the walking's moved it): the legs again, from where it
  // really is now, if nobody's posed over them. Otherwise the feet ease back to plain
  late() {
    const r = this.r;
    if (this.frame !== r.frameNo || !this.written) { this.relax(); return; }
    const eye = Gait.eye; if (eye && (r.root.x - eye.x) ** 2 + (r.root.z - eye.z) ** 2 > 256) return;
    const P = r.pose; for (let i = 0; i < 4; i++) { const a = P[LEG[i]], b = this.wq[i]; if (a.x !== b.x || a.y !== b.y || a.z !== b.z || a.w !== b.w) { this.relax(); return; } }
    if (r.bob === this.bob1) r.bob = this.bob0;        // (the hips' own height again, before this frame's lowering, if nobody's changed it)
    if (!this.feet[0].stance || !this.feet[1].stance) this.place();       // (a swinging foot goes with the hips, which have moved on)
    this.solveLegs(true); this.bob1 = r.bob;
    for (let i = 0; i < 4; i++) this.wq[i].copy(P[LEG[i]]);
  }
  owns(name) { const i = LEG.indexOf(name); if (i < 0 || !this.written || this.frame !== this.r.frameNo) return false; const a = this.r.pose[name], b = this.wq[i]; return a.x === b.x && a.y === b.y && a.z === b.z && a.w === b.w; }
  relax() {
    const r = this.r; if (r.swayX) r.swayX *= 0.8; if (Math.abs(r.swayX) < 1e-4) r.swayX = 0; r.jiggle = 0;
    if (r.footPose) for (const n in r.footPose) { const q = r.footPose[n].q; if (q.w < 0.99999) q.slerp(_qi.identity(), 0.2); }
  }
}

// A body copied part by part from someone else's game (the host's squad on a guest's): no gait runs here, so its feet are
// set from its shins: flat on the floor when they're down there, the ankle easing back to plain in the air
const _qs = new THREE.Quaternion(), _qf = new THREE.Quaternion();
export function netFeet(r) {
  if (!r.footPose || !r.footAxes) return;
  for (const name of SHINS) {
    const fp = r.footPose[name], fa = r.footAxes[name], part = r.parts[name]; if (!fp || !fa || !part) continue;
    const b = part.body, q = b.quaternion; _qs.set(q.x, q.y, q.z, q.w);
    _v.copy(fa.ankle).sub(part.def.center).applyQuaternion(_qs);
    const ay = b.position.y + _v.y, fl = FLOOR.at ? FLOOR.at(b.position.x + _v.x, b.position.z + _v.z) : 0;
    const down = 1 - sstep(0.04, 0.12, ay - (fl + 0.02 + fa.ankle.y));
    _v.copy(_Z).applyQuaternion(_qs); const yaw = Math.atan2(_v.x, _v.z);
    _qf.setFromAxisAngle(_Y, yaw); _qf.premultiply(_q.copy(_qs).invert());          // (flat, pointing where the shin does)
    fp.q.copy(_qi.identity()).slerp(_qf, down);
    const ang = 2 * Math.acos(clamp(Math.abs(fp.q.w), 0, 1)); if (ang > 0.85) fp.q.slerp(_qi.identity(), 1 - 0.85 / ang);
  }
}
