// Outdoor pieces that need to look real: a sky dome (blue gradient, soft drifting clouds, a bright sun),
// moving water (ripples, sky reflections that get stronger at a glancing angle, sun glints), and leafy
// foliage (hedges and trees covered in hundreds of overlapping leaf clumps, not smooth shapes).
import * as THREE from 'three';
import { part } from '../geo.js';

// ---- the sky: a big sphere that follows the camera, drawn behind everything
const SKY_VS = `varying vec3 vDir; void main() { vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.99999; }`;
const NOISE = `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }`;
const SKY_FS = `uniform float uTime; uniform vec3 uSun; varying vec3 vDir;` + NOISE + `
  void main() {
    vec3 d = normalize(vDir); float h = max(d.y, 0.0);
    vec3 zen = vec3(0.24, 0.48, 0.86), hor = vec3(0.74, 0.86, 0.97), ground = vec3(0.55, 0.6, 0.62);
    vec3 col = mix(hor, zen, pow(h, 0.55));
    if (d.y < 0.0) col = mix(hor, ground, min(1.0, -d.y * 4.0));
    float sd = max(dot(d, normalize(uSun)), 0.0);
    col += vec3(1.0, 0.92, 0.75) * (pow(sd, 900.0) * 6.0 + pow(sd, 40.0) * 0.35 + pow(sd, 6.0) * 0.08);   // the sun and its glow
    if (d.y > 0.0) {                                                       // clouds: flattened onto a high layer, drifting
      vec2 uv = d.xz / (d.y + 0.12) * 1.6 + vec2(uTime * 0.012, uTime * 0.004);
      float c = fbm(uv * 0.9), c2 = fbm(uv * 2.3 + 7.0);
      float cov = smoothstep(0.48, 0.78, c * 0.75 + c2 * 0.35);
      vec3 cloud = mix(vec3(0.72, 0.76, 0.82), vec3(1.0), smoothstep(0.3, 0.9, c2)) + vec3(1.0, 0.95, 0.85) * pow(sd, 8.0) * 0.4;
      col = mix(col, cloud, cov * smoothstep(0.0, 0.18, d.y) * 0.92);
    }
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;
export function skyDome(scene, sunDir = [-0.4, 0.55, 0.7]) {
  const mat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uSun: { value: new THREE.Vector3(...sunDir) } }, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false });
  const m = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), mat);
  m.frustumCulled = false; m.renderOrder = -10; m.matrixAutoUpdate = false;
  const v = new THREE.Vector3();
  m.onBeforeRender = (r, sc, cam) => { v.setFromMatrixPosition(cam.matrixWorld); m.position.copy(v); m.updateMatrix(); m.updateMatrixWorld(true); };
  m.userData.keep = true; scene.add(m);
  return { mesh: m, update(t) { mat.uniforms.uTime.value = t; } };
}

// ---- water: rippling, reflecting the sky, sun glints, darker where you look straight down into it
const WATER_VS = `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const WATER_FS = `uniform float uTime; uniform vec3 uDeep, uShallow, uSun; uniform float uFlow, uScale; varying vec3 vW;` + NOISE + `
  void main() {
    vec2 p = vW.xz * uScale; float t = uTime;
    vec2 q = p + vec2(t * uFlow, t * 0.07);
    float e = 0.06;
    float h0 = fbm(q * 1.7) + 0.5 * fbm(q * 4.1 - t * 0.2);
    float hx = fbm((q + vec2(e, 0.0)) * 1.7) + 0.5 * fbm((q + vec2(e, 0.0)) * 4.1 - t * 0.2);
    float hz = fbm((q + vec2(0.0, e)) * 1.7) + 0.5 * fbm((q + vec2(0.0, e)) * 4.1 - t * 0.2);
    vec3 n = normalize(vec3((h0 - hx) * 1.6, 1.0, (h0 - hz) * 1.6));
    vec3 v = normalize(cameraPosition - vW);
    float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
    vec3 r = reflect(-v, n);
    vec3 sky = mix(vec3(0.74, 0.86, 0.97), vec3(0.3, 0.52, 0.86), pow(max(r.y, 0.0), 0.6));
    vec3 body = mix(uDeep, uShallow, 0.35 + 0.4 * h0);
    vec3 col = mix(body, sky, clamp(fres * 1.15, 0.0, 0.85));
    float spec = pow(max(dot(r, normalize(uSun)), 0.0), 220.0);
    col += vec3(1.0, 0.95, 0.8) * spec * 2.2;
    col += vec3(0.9) * smoothstep(0.72, 0.9, h0) * 0.06;                  // a few bright crests
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;
const waters = [];
export function waterMaterial({ deep = 0x1e3a3a, shallow = 0x4a7a72, flow = 0.05, scale = 0.6, sun = [-0.4, 0.55, 0.7] } = {}) {
  const m = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uDeep: { value: new THREE.Color(deep) }, uShallow: { value: new THREE.Color(shallow) }, uSun: { value: new THREE.Vector3(...sun) }, uFlow: { value: flow }, uScale: { value: scale } },
    vertexShader: WATER_VS, fragmentShader: WATER_FS, side: THREE.DoubleSide });
  waters.push(m); return m;
}
export function updateOutdoor(t) { for (const m of waters) m.uniforms.uTime.value = t; }

// ---- foliage: a solid core with a skin of overlapping leaf clumps in mixed greens
const GREENS = [0x2e5a1e, 0x3a6a24, 0x4a7a2c, 0x56883a, 0x3e7030, 0x6a9a42, 0x2a4e1c];
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const shade = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
function clump(k, x, y, z, r, greens = GREENS) {
  const g = new THREE.IcosahedronGeometry(r, 0); g.scale(1 + rnd() * 0.4, 0.75 + rnd() * 0.4, 1 + rnd() * 0.4); g.rotateY(rnd() * 6); g.rotateX((rnd() - 0.5) * 0.8);
  k.parts.push(part(g, shade(greens[Math.floor(rnd() * greens.length)], 0.85 + rnd() * 0.3), [x, y, z]));
}
// a clipped hedge: box x0..x1, z0..z1, up to height h (base hidden by its own skirt of leaves)
export function leafyHedge(k, x0, z0, x1, z1, h, opts = {}) {
  const step = opts.step || 0.22, r = opts.r || 0.15, core = opts.core ?? 0x24461a;
  k.box(x1 - x0 - 0.12, h - 0.1, z1 - z0 - 0.12, (x0 + x1) / 2, (h - 0.1) / 2, (z0 + z1) / 2, core);
  const J = () => (rnd() - 0.5) * step * 0.7;
  for (let x = x0 + step / 2; x < x1; x += step) for (let z = z0 + step / 2; z < z1; z += step) clump(k, x + J(), h - 0.05 + rnd() * 0.08, z + J(), r * (0.8 + rnd() * 0.5));    // the top
  for (let y = 0.12; y < h - 0.05; y += step * 0.9) {
    for (let x = x0 + step / 2; x < x1; x += step) for (const z of [z0 + 0.03, z1 - 0.03]) clump(k, x + J(), y + J(), z + J() * 0.3, r * (0.8 + rnd() * 0.5));
    for (let z = z0 + step / 2; z < z1; z += step) for (const x of [x0 + 0.03, x1 - 0.03]) clump(k, x + J() * 0.3, y + J(), z + J(), r * (0.8 + rnd() * 0.5));
  }
  k.blockers.push({ x0, x1, z0, z1, y1: h });
}
// a round bush / tree crown: a ball of clumps
export function leafyBall(k, x, y, z, R, opts = {}) {
  const n = opts.n || Math.round(60 * R * R + 12), r = opts.r || Math.max(0.12, R * 0.22);
  k.parts.push(part(new THREE.IcosahedronGeometry(R * 0.82, 1), shade(GREENS[0], 0.8), [x, y, z]));
  for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u), rr = R * (0.85 + rnd() * 0.2);
    clump(k, x + Math.cos(a) * s * rr, y + u * rr * 0.85, z + Math.sin(a) * s * rr, r * (0.7 + rnd() * 0.6)); }
}

// ---- a full potted plant (a kentia-palm / fern sort: arching fronds thick with leaflets) in a pot with soil
export function pottedPlant(k, x, z, { s = 1, pot = 0x2a2420, rim = null, fronds = 18, kind = 'palm' } = {}) {
  const ph = 0.46 * s, pr = 0.22 * s;
  k.parts.push(part(new THREE.CylinderGeometry(pr, pr * 0.75, ph, 18), pot, [x, ph / 2, z]));
  k.parts.push(part(new THREE.CylinderGeometry(pr * 1.06, pr * 1.06, 0.04 * s, 18), rim ?? shade(pot, 1.25), [x, ph - 0.01, z]));
  k.parts.push(part(new THREE.CylinderGeometry(pr * 0.96, pr * 0.96, 0.02, 16), 0x3a2a1c, [x, ph - 0.02, z]));
  k.blockers.push({ x0: x - pr, x1: x + pr, z0: z - pr, z1: z + pr, y1: ph });
  const LEAF = [0x2e6a26, 0x3a7a2e, 0x2a5e22, 0x468a34, 0x356e28];
  if (kind === 'bush') { leafyBall(k, x, ph + 0.35 * s, z, 0.42 * s, { n: 90, r: 0.07 * s }); return; }
  for (let f = 0; f < fronds; f++) {
    const a = f * 2.39996 + rnd() * 0.3, e = 0.95 + (f % 4) * 0.15 + rnd() * 0.15, L = (0.85 + rnd() * 0.5) * s, gr = (0.42 + rnd() * 0.25) / s;
    const dx = Math.cos(a), dz = Math.sin(a), sx = -dz, sz = dx, y0 = ph - 0.02;
    const at = (t) => { const d = L * t; return [x + dx * (d * Math.cos(e) + 0.03), y0 + d * Math.sin(e) - gr * d * d, z + dz * (d * Math.cos(e) + 0.03)]; };
    const N = 8; let prev = at(0);
    for (let i = 1; i <= N; i++) { const p = at(i / N), m = [(p[0] + prev[0]) / 2, (p[1] + prev[1]) / 2, (p[2] + prev[2]) / 2], len = Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]);
      const g = new THREE.CylinderGeometry(0.004 * s, 0.006 * s, len, 4); const dir = new THREE.Vector3(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]).normalize();
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)); k.parts.push(part(g, 0x4a6a2a, m)); prev = p; }
    for (let i = 3; i <= 22; i++) { const t = i / 23, p = at(t), ll = (0.16 - 0.08 * t) * s * (0.9 + rnd() * 0.2), col = LEAF[(f + i) % LEAF.length];
      for (const sd of [-1, 1]) {   // a pair of leaflets, swept forward and drooping
        const fw = 0.55, lx = sx * sd * Math.cos(fw) + dx * Math.sin(fw), lz = sz * sd * Math.cos(fw) + dz * Math.sin(fw);
        const g = new THREE.SphereGeometry(1, 4, 2); g.scale(ll / 2, 0.003, 0.016 * s); g.rotateZ(-0.35 - t * 0.3); g.rotateY(Math.atan2(-lz, lx));
        k.parts.push(part(g, shade(col, 0.9 + rnd() * 0.2), [p[0] + lx * ll * 0.45, p[1] - 0.01, p[2] + lz * ll * 0.45])); } }
  }
}
