// How Ronnie holds things: where each item sits in the (controller / on-screen)
// fist, so the fingers close round it instead of the item floating in the hand.
//
// Grip space (see hands.js applyMount): the fist wraps the grip's Z axis (index
// finger at z≈0.015 ... pinky at z≈0.067, thumb at z≈0), the palm faces -X and
// the fingers curl from the knuckles (-Y) round to -X; the wrist is up at +Y.
// The hole the fingers make was measured from the hand model at each curl.
import * as THREE from 'three';

// curl -> hole centre (x, y) and inner radius (finger skin to finger skin)
const FIST = [
  [0.40, -0.0317, -0.0126, 0.0424],
  [0.50, -0.0209, -0.0113, 0.0323],
  [0.60, -0.0141, -0.0100, 0.0259],
  [0.70, -0.0086, -0.0096, 0.0210],
  [0.85, -0.0031, -0.0086, 0.0162],
];
const ZC = 0.038;
// the top of the closed fist (thumb and index finger), where flat food sits
const REST_AT = [-0.012, -0.03, -0.022];   // middle of the fist along the handle

// per item: axis = item direction that runs through the fist (the fingers wrap
// round it), up = item direction that points up the forearm (+Y), at = the
// point of the item that sits in the middle of the fist, r = its radius there.
const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1], nX = [-1, 0, 0], nY = [0, -1, 0], nZ = [0, 0, -1];
const SPEC = {
  // drinks and tall things: held round the middle, top out of the thumb side
  can:      { axis: nY, up: Z, at: [0, 0, 0], r: 0.033 },
  bat:      { axis: nY, up: X, at: [0, -0.1, 0], r: 0.013 },              // table tennis bat: shakehand grip, face along the palm
  pint:     { axis: nY, up: Z, at: [0, -0.01, 0], r: 0.039 },
  shake:    { axis: nY, up: Z, at: [0, -0.01, 0], r: 0.035 },
  fries:    { axis: nY, up: Z, at: [0, -0.025, 0], r: 0.028 },
  kebab:    { axis: nY, up: Z, at: [0, -0.03, 0], r: 0.034 },
  icecream: { axis: nY, up: Z, at: [0, -0.045, 0], r: 0.018 },
  broccoli: { axis: nY, up: Z, at: [0, -0.04, 0], r: 0.016 },
  // long things: gripped round the middle (or the handle end)
  choc:     { axis: X, up: Y, at: [0.035, 0, 0], r: 0.018 },
  carrot:   { axis: nZ, up: Y, at: [0, 0, -0.03], r: 0.014 },
  celery:   { axis: Z, up: Y, at: [0, 0, 0.05], r: 0.014 },
  cucumber: { axis: nZ, up: Y, at: [0, 0, 0.03], r: 0.02 },
  chicken:  { axis: nZ, up: Y, at: [0, 0, -0.055], r: 0.014 },      // by the bone
  // flat things: pinched through their thickness
  // flat food is held the right way up, sitting on the thumb and fingers, the
  // way you'd actually hold it to eat: rest = the item's bottom point that sits
  // on top of the fist, fwd = the item direction that points away from you
  burger:   { rest: [0, -0.045, 0], fwd: nZ },                  // buns level, bottom bun on the hand
  pizza:    { rest: [0, -0.008, 0.055], fwd: nZ, tilt: 0.25 },  // crust in the fingers, point out in front, a little droop
  doughnut: { rest: [0, -0.02, 0.035], fwd: nZ },               // flat, held at its edge
  cookie:   { rest: [0, -0.008, 0.03], fwd: nZ },
  taco:     { rest: [0, -0.03, 0], fwd: X },                    // filling up, along the hand
  hotdog:   { rest: [0, -0.03, 0], fwd: X },                    // bun level, pointing out in front
  sausageroll: { rest: [0, -0.025, 0], fwd: X },
  crisps:   { axis: nY, up: Z, at: [0, -0.045, 0], r: 0.016 },  // bag upright, bottom in the fist
  // round things: in the palm
  apple: { r: 0.036 }, pear: { axis: nY, up: Z, at: [0, -0.012, 0], r: 0.034 }, orange: { r: 0.036 }, tomato: { r: 0.03 },
  pepper: { r: 0.034 }, sprout: { r: 0.028 }, cauliflower: { r: 0.04 },
  banana: { axis: X, up: Y, at: [0, 0.0, 0], r: 0.017 },
};

const cache = {};
const _a = new THREE.Vector3(), _u = new THREE.Vector3(), _w = new THREE.Vector3(), _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion();
export function holdTransform(type, side = 'right') {
  const key = type + side;
  if (cache[key]) return cache[key];
  const s = SPEC[type] || { r: 0.03 };
  if (s.rest) {
    // grip "up" is -Z (thumb side), "forward" is -Y (the way the knuckles face)
    const up = new THREE.Vector3(0, 1, 0), fwd = new THREE.Vector3().fromArray(s.fwd), sd = new THREE.Vector3().crossVectors(fwd, up);
    _m1.makeBasis(sd, up, fwd);                                   // item frame
    _m2.makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, -1, 0));   // (fwd x up, up, fwd) in grip space
    const q = new THREE.Quaternion().setFromRotationMatrix(_m2).multiply(new THREE.Quaternion().setFromRotationMatrix(_m1).invert());
    if (s.tilt) q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), s.tilt));   // tip droops down a bit
    const p = new THREE.Vector3(...REST_AT).sub(new THREE.Vector3().fromArray(s.rest).applyQuaternion(q));
    if (side === 'left') { p.x = -p.x; q.set(q.x, -q.y, -q.z, q.w); }
    return (cache[key] = { p, q, curl: 0.85 });
  }
  // how tight the fist closes: hole the size of the item
  let i = 0;
  while (i < FIST.length - 2 && FIST[i + 1][3] > s.r) i++;
  const A = FIST[i], B = FIST[i + 1], t = THREE.MathUtils.clamp((A[3] - s.r) / (A[3] - B[3]), 0, 1);
  const curl = A[0] + (B[0] - A[0]) * t, cx = A[1] + (B[1] - A[1]) * t, cy = A[2] + (B[2] - A[2]) * t;
  // rotation taking item axis -> grip Z, item up -> grip Y
  _a.fromArray(s.axis || nY).normalize(); _u.fromArray(s.up || Z); _u.addScaledVector(_a, -_u.dot(_a)).normalize(); _w.crossVectors(_u, _a);
  _m1.makeBasis(_w, _u, _a);                    // item frame (as columns)
  const q = new THREE.Quaternion().setFromRotationMatrix(_m1).invert();
  const p = new THREE.Vector3(cx, cy, ZC).sub(new THREE.Vector3().fromArray(s.at || [0, 0, 0]).applyQuaternion(q));
  if (side === 'left') { p.x = -p.x; q.set(q.x, -q.y, -q.z, q.w); }
  return (cache[key] = { p, q, curl });
}
