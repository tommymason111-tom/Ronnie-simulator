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
const ZC = 0.038;   // middle of the fist along the handle

// per item: axis = item direction that runs through the fist (the fingers wrap
// round it), up = item direction that points up the forearm (+Y), at = the
// point of the item that sits in the middle of the fist, r = its radius there.
const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1], nX = [-1, 0, 0], nY = [0, -1, 0], nZ = [0, 0, -1];
const SPEC = {
  // drinks and tall things: held round the middle, top out of the thumb side
  can:      { axis: nY, up: Z, at: [0, 0, 0], r: 0.033 },
  pint:     { axis: nY, up: Z, at: [0, -0.01, 0], r: 0.039 },
  shake:    { axis: nY, up: Z, at: [0, -0.01, 0], r: 0.035 },
  fries:    { axis: nY, up: Z, at: [0, -0.025, 0], r: 0.028 },
  kebab:    { axis: nY, up: Z, at: [0, -0.03, 0], r: 0.034 },
  icecream: { axis: nY, up: Z, at: [0, -0.045, 0], r: 0.018 },
  broccoli: { axis: nY, up: Z, at: [0, -0.04, 0], r: 0.016 },
  // long things: gripped round the middle (or the handle end)
  hotdog:   { axis: X, up: Y, at: [0, 0, 0], r: 0.028 },
  sausageroll: { axis: X, up: Y, at: [0, 0, 0], r: 0.026 },
  choc:     { axis: X, up: Y, at: [0.035, 0, 0], r: 0.018 },
  carrot:   { axis: nZ, up: Y, at: [0, 0, -0.03], r: 0.014 },
  celery:   { axis: Z, up: Y, at: [0, 0, 0.05], r: 0.014 },
  cucumber: { axis: nZ, up: Y, at: [0, 0, 0.03], r: 0.02 },
  chicken:  { axis: nZ, up: Y, at: [0, 0, -0.055], r: 0.014 },      // by the bone
  // flat things: pinched through their thickness
  burger:   { axis: X, up: Z, at: [0, 0.005, 0], r: 0.042 },
  pizza:    { axis: X, up: Z, at: [0, 0.002, 0.07], r: 0.016 },   // by the crust, point forward
  doughnut: { axis: X, up: Z, at: [0, 0, 0.04], r: 0.022 },     // round the ring
  cookie:   { axis: X, up: Z, at: [0, 0, 0.03], r: 0.012 },
  crisps:   { axis: X, up: Y, at: [0, 0.05, 0], r: 0.016 },     // by the top of the bag
  taco:     { axis: Z, up: Y, at: [0, -0.01, 0], r: 0.032 },
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
