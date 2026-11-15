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
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
  float fbm3(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }`;
const SKY_FS = `uniform float uTime; uniform vec3 uSun; uniform sampler2D uPano; varying vec3 vDir;` + NOISE + `
  void main() {
    vec3 d = normalize(vDir); float h = max(d.y, 0.0);
    vec3 zen = vec3(0.24, 0.48, 0.86), hor = vec3(0.74, 0.86, 0.97), ground = vec3(0.42, 0.5, 0.4);
    vec3 col = mix(hor, zen, pow(h, 0.55));
    if (d.y < 0.0) col = mix(hor, ground, min(1.0, -d.y * 1.5));
    float sd = max(dot(d, normalize(uSun)), 0.0);
    col += vec3(1.0, 0.92, 0.75) * (pow(sd, 900.0) * 6.0 + pow(sd, 40.0) * 0.35 + pow(sd, 6.0) * 0.08);   // the sun and its glow
    if (d.y > 0.0) {                                                       // clouds: flattened onto a high layer, drifting
      vec2 uv = d.xz / (d.y + 0.12) * 1.6 + vec2(uTime * 0.012, uTime * 0.004);
      float c = fbm(uv * 0.9), c2 = fbm(uv * 2.3 + 7.0);
      float cov = smoothstep(0.48, 0.78, c * 0.75 + c2 * 0.35);
      vec3 cloud = mix(vec3(0.72, 0.76, 0.82), vec3(1.0), smoothstep(0.3, 0.9, c2)) + vec3(1.0, 0.95, 0.85) * pow(sd, 8.0) * 0.4;
      col = mix(col, cloud, cov * smoothstep(0.0, 0.18, d.y) * 0.92);
    }
    // the distant world painted all the way round: hills, the town, trees, the estuary (hazed by distance)
    float az = atan(d.x, d.z) / 6.2831853 + 0.5, el = asin(clamp(d.y, -1.0, 1.0)), pv = (el + 0.08) / 0.38;
    if (pv >= 0.0 && pv <= 1.0) { vec4 pc = texture2D(uPano, vec2(az, pv)); col = mix(col, pc.rgb, pc.a); }
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;
export const HAZE = new THREE.Color().setRGB(0.74, 0.86, 0.97, THREE.LinearSRGBColorSpace);
export function skyDome(scene, sunDir = [-0.4, 0.55, 0.7]) {
  const mat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uSun: { value: new THREE.Vector3(...sunDir) }, uPano: { value: panoramaTex() } }, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false });
  const m = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), mat);
  m.frustumCulled = false; m.renderOrder = 1000; m.matrixAutoUpdate = false;   // drawn after the solid things, so only the sky you can actually see is worked out
  const v = new THREE.Vector3();
  m.onBeforeRender = (r, sc, cam) => { v.setFromMatrixPosition(cam.matrixWorld); m.position.copy(v); m.updateMatrix(); m.updateMatrixWorld(true); };
  m.userData.keep = true; scene.add(m);
  return { mesh: m, update(t) { mat.uniforms.uTime.value = t; } };
}

// ---- water: rippling, reflecting the sky, sun glints, darker where you look straight down into it
const WATER_VS = `varying vec3 vW;
#include <fog_pars_vertex>
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const WATER_FS = `uniform float uTime; uniform vec3 uDeep, uShallow, uSun; uniform float uFlow, uScale; varying vec3 vW;
#include <fog_pars_fragment>
` + NOISE + `
  void main() {
    vec2 p = vW.xz * uScale; float t = uTime;
    vec2 q = p + vec2(t * uFlow, t * 0.07);
    float e = 0.06;
    vec2 q2 = q * 1.7 + vec2(-t * 0.13, t * 0.05);                     // two layers of ripples drifting across each other
    float h0 = fbm3(q * 1.7) + 0.5 * fbm3(q2 * 2.4);
    float hx = fbm3((q + vec2(e, 0.0)) * 1.7) + 0.5 * fbm3((q2 + vec2(e, 0.0)) * 2.4);
    float hz = fbm3((q + vec2(0.0, e)) * 1.7) + 0.5 * fbm3((q2 + vec2(0.0, e)) * 2.4);
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
    #include <fog_fragment>
  }`;
const waters = [];
export function waterMaterial({ deep = 0x1e3a3a, shallow = 0x4a7a72, flow = 0.05, scale = 0.6, sun = [-0.4, 0.55, 0.7] } = {}) {
  const m = new THREE.ShaderMaterial({ fog: true, uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: { value: 0 }, uDeep: { value: new THREE.Color(deep) }, uShallow: { value: new THREE.Color(shallow) }, uSun: { value: new THREE.Vector3(...sun) }, uFlow: { value: flow }, uScale: { value: scale } },
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
  const n = opts.n || Math.round(R > 1.2 ? 34 * R * R + 12 : 60 * R * R + 12), r = opts.r || Math.max(0.12, R > 1.2 ? R * 0.27 : R * 0.22);   // (big crowns: fewer, larger clumps)
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

// ---- the painted distance (sampled by the sky): u = compass bearing (+z at the middle, -x at a quarter: the river),
// v = height above the horizon, -0.08 to +0.30 radians. Layers from far (very hazy) to near (less hazy).
function panoramaTex() {
  const W = 4096, H = 1024, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const E0 = -0.08, E1 = 0.30, PXR = H / (E1 - E0), HZ = (1 - (0 - E0) / (E1 - E0)) * H;      // pixels per radian, the horizon line
  let sd = 7; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const hz = [223, 239, 251];
  const mixc = (hex, k) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255; return `rgb(${Math.round(r + (hz[0] - r) * k)},${Math.round(gg + (hz[1] - gg) * k)},${Math.round(b + (hz[2] - b) * k)})`; };
  const bump = (x, a) => a.reduce((t, [f, amp, ph]) => t + amp * Math.sin(x * f + ph), 0);
  const riverW = (u) => { const d = Math.abs(((u - 0.25) % 1 + 1.5) % 1 - 0.5); return Math.max(0, Math.min(1, (0.16 - d) / 0.05)); };   // 1 looking out over the river
  // below the horizon: hazy fields, or the estuary on the river side
  for (let x = 0; x < W; x += 4) { const w = riverW(x / W);
    const gr = g.createLinearGradient(0, HZ, 0, H); gr.addColorStop(0, `rgb(${hz})`); gr.addColorStop(1, w > 0.5 ? mixc('#6f8a96', 0.35) : mixc('#7a8c62', 0.45));
    g.fillStyle = gr; g.fillRect(x, HZ, 4, H - HZ); }
  for (let i = 0; i < 260; i++) { const x = R() * W, y = HZ + 4 + R() * (H - HZ - 8), w = riverW(x / W);   // hedgerows between fields / light on the water
    g.fillStyle = w > 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(60,80,50,0.25)'; g.fillRect(x, y, 30 + R() * 160, w > 0.5 ? 1 : 2); }
  // 1. the far hills (wooded hills inland, the low Kent shore across the estuary)
  g.beginPath(); g.moveTo(0, HZ);
  for (let x = 0; x <= W; x += 8) { const u = x / W, rw = riverW(u), h = (1 - rw) * (14 + 26 * Math.max(0, Math.cos((u - 0.5) * 6.28)) + bump(x, [[0.004, 8, 1], [0.011, 4, 2], [0.03, 1.5, 0]])) + rw * (8 + bump(x, [[0.006, 3, 4], [0.02, 1, 1]])); g.lineTo(x, HZ - Math.max(3, h)); }
  g.lineTo(W, HZ); g.closePath(); g.fillStyle = mixc('#5d7686', 0.62); g.fill();
  // 2. the middle distance: rooftops, trees, a church spire, flats, pylons; oil tanks, cranes and ships along the estuary
  const midCol = (hex) => mixc(hex, 0.45);
  for (let x = 0; x < W;) { const u = x / W, rw = riverW(u);
    if (rw > 0.5) {
      const r = R();
      if (r < 0.12) { for (let t = 0; t < 4; t++) { const tw = 14 + R() * 8, th = 9 + R() * 4; g.fillStyle = midCol('#c8ccd0'); g.fillRect(x + t * (tw + 3), HZ - th, tw, th); g.fillStyle = midCol('#9aa0a6'); g.fillRect(x + t * (tw + 3), HZ - th, tw, 2); } x += 80; }      // the oil terminal's tanks
      else if (r < 0.2) { g.fillStyle = midCol('#6a7078'); g.fillRect(x, HZ - 34, 2, 34); g.fillRect(x - 10, HZ - 34, 34, 2); g.fillRect(x + 20, HZ - 34, 1, 14); x += 50; }                       // a crane
      else if (r < 0.3) { g.fillStyle = midCol('#4a5058'); g.fillRect(x, HZ - 6, 44, 5); g.fillRect(x + 8, HZ - 11, 14, 5); g.fillStyle = midCol('#c84a3a'); g.fillRect(x + 26, HZ - 13, 4, 7); x += 70; }   // a ship on the Thames
      else { g.fillStyle = midCol('#5a6a50'); g.fillRect(x, HZ - 3, 40, 3); x += 40; }                                                                                                    // the sea wall
      continue; }
    const r = R(), shade = ['#7a5a4a', '#8a6a52', '#6a4e44', '#9a7a62'][Math.floor(R() * 4)];
    if (r < 0.5) { const hw = 26 + R() * 30, hh = 14 + R() * 8; g.fillStyle = midCol(shade); g.fillRect(x, HZ - hh, hw, hh);                    // a house: walls, roof, chimneys, windows
      g.fillStyle = midCol(['#4a3a36', '#5a4038', '#3e3a3a'][Math.floor(R() * 3)]); g.beginPath(); g.moveTo(x - 2, HZ - hh); g.lineTo(x + hw / 2, HZ - hh - 9 - R() * 4); g.lineTo(x + hw + 2, HZ - hh); g.fill();
      g.fillRect(x + hw * 0.25, HZ - hh - 12, 3, 6); g.fillStyle = midCol('#e8eef2'); for (let w2 = 4; w2 < hw - 4; w2 += 9) g.fillRect(x + w2, HZ - hh + 4, 4, 3); x += hw + 1; }
    else if (r < 0.85) { const n = 2 + Math.floor(R() * 4); for (let t = 0; t < n; t++) { const tr = 9 + R() * 12; g.fillStyle = midCol(['#3e5a32', '#4a6438', '#36502c'][t % 3]); g.beginPath(); g.arc(x + t * tr * 1.2, HZ - tr - 4, tr, 0, 7); g.fill(); g.fillRect(x + t * tr * 1.2 - tr, HZ - tr - 4, tr * 2, tr + 4); } x += n * 14; }
    else if (r < 0.9) { g.fillStyle = midCol('#8a8478'); g.fillRect(x, HZ - 26, 12, 26); g.beginPath(); g.moveTo(x - 1, HZ - 26); g.lineTo(x + 6, HZ - 62); g.lineTo(x + 13, HZ - 26); g.fill(); x += 20; }   // a church spire
    else if (r < 0.94) { g.fillStyle = midCol('#a8a49c'); g.fillRect(x, HZ - 48, 30, 48); g.fillStyle = midCol('#6a7078'); for (let yy = 6; yy < 46; yy += 7) g.fillRect(x + 3, HZ - 48 + yy, 24, 2); x += 36; }   // a block of flats
    else { g.strokeStyle = midCol('#5a5e62'); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, HZ); g.lineTo(x + 6, HZ - 50); g.lineTo(x + 12, HZ); g.moveTo(x - 4, HZ - 40); g.lineTo(x + 16, HZ - 40); g.moveTo(x + 6, HZ - 50); g.quadraticCurveTo(x + 60, HZ - 30, x + 120, HZ - 52); g.stroke(); x += 30; }   // a pylon and its wires
  }
  // 3. a nearer tree line (less hazy), with gaps; reed beds along the river side
  for (let x = 0; x < W; x += 6) { const u = x / W, rw = riverW(u), h = (1 - rw) * Math.max(0, 22 + bump(x, [[0.013, 14, 0], [0.041, 7, 2], [0.11, 3, 1]])) ;
    if (h > 4) { g.fillStyle = mixc(['#2e4a26', '#36542c', '#2a4422'][Math.floor(x / 6) % 3], 0.3); g.beginPath(); g.arc(x + 3, HZ - h + 4, 6 + (h % 5), 0, 7); g.fill(); g.fillRect(x, HZ - h + 4, 6, h - 4); }
    if (rw > 0.3) { g.fillStyle = mixc('#8a8a5a', 0.4); g.fillRect(x, HZ - 2 - R() * 3, 6, 5); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
  return t;
}

// ---- a terrace of houses seen from the back: brick or render, uPVC windows with curtains, back doors, kitchen
// extensions, gutters and downpipes, a tiled roof with chimney stacks and pots, and long back gardens with fences,
// lawns, sheds, washing lines and shrubs. The back wall faces local -z, at (ox, oz), turned by ry; houses run along local +x.
export function terrace(k, scene, { ox, oz, ry = 0, n = 5, w = 5.0, D = 7.5, eave = 5.4, garden = 8, brick, seed: sd0 = 3 }) {
  seed = sd0 * 977 + 13;
  const M4 = new THREE.Matrix4().compose(new THREE.Vector3(ox, 0, oz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(1, 1, 1));
  const P = (geo, col, lx, ly, lz, rx = 0, rz = 0) => { geo.rotateZ(rz); geo.rotateX(rx); geo.translate(lx, ly, lz); geo.applyMatrix4(M4); k.parts.push(part(geo, col)); };
  const B = (w2, h2, d2, lx, ly, lz, col) => P(new THREE.BoxGeometry(w2, h2, d2), col, lx, ly, lz);
  const tex = (geo, t, lx, ly, lz, rx = 0) => { const m = new THREE.Mesh(geo, texMatOf(t)); const v = new THREE.Vector3(lx, ly, lz).applyMatrix4(M4); m.position.copy(v); m.rotation.order = 'YXZ'; m.rotation.set(rx, ry, 0); scene.add(m); (k.texMeshes = k.texMeshes || []).push(m); return m; };
  const uvBox = (w2, h2, d2, tile) => { const g = new THREE.BoxGeometry(w2, h2, d2), uv = g.attributes.uv, dims = [[d2, h2], [d2, h2], [w2, d2], [w2, d2], [w2, h2], [w2, h2]]; for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const q = f * 4 + i; uv.setXY(q, uv.getX(q) * dims[f][0] / tile, uv.getY(q) * dims[f][1] / tile); } return g; };
  const L = n * w, ROOFT = roofTex(), pitch = 0.65, rise = Math.tan(pitch) * D / 2;
  const RENDER = [0xefe6d2, 0xf4f1ea, 0xe8dcc0, 0xdcd4c8], DOORS = [0xf4f4f0, 0x1a1a1a, 0x2e4a3a, 0x3a3a44, 0x7a1a24], CURT = [0xc8b89a, 0x7a2a2a, 0x3a4a6a, 0xe8e0d0, 0x6a7a5a];
  // the window: white frame, a mullion and a top opener, dark glass with the sky in its top half, curtains, a sill
  const win = (lx, ly, ww, hh) => {
    B(ww, hh, 0.04, lx, ly, -0.005, 0x26323c); B(ww * 0.96, hh * 0.32, 0.03, lx, ly + hh * 0.3, -0.012, 0x8ea6ba);
    for (const sx of [-1, 1]) B(ww * 0.16, hh * 0.9, 0.02, lx + sx * ww * 0.38, ly - 0.02, -0.008, CURT[Math.floor(rnd() * CURT.length)]);
    for (const [a, b, c2, d] of [[ww + 0.1, 0.06, 0, hh / 2 + 0.02], [ww + 0.1, 0.06, 0, -hh / 2 - 0.02], [0.06, hh, -ww / 2 - 0.02, 0], [0.06, hh, ww / 2 + 0.02, 0], [0.045, hh, 0, 0], [ww, 0.045, 0, hh * 0.18]]) B(a, b, 0.06, lx + c2, ly + d, -0.03, 0xf6f6f2);
    B(ww + 0.22, 0.06, 0.12, lx, ly - hh / 2 - 0.08, -0.06, 0xd8d4cc);
  };
  const door = (lx, kind) => { if (kind === 'patio') { B(1.7, 2.1, 0.04, lx, 1.05, -0.005, 0x26323c); B(1.65, 0.6, 0.03, lx, 1.8, -0.012, 0x8ea6ba); for (const [a, b, c2, d] of [[1.8, 0.07, 0, 2.12], [0.07, 2.12, -0.88, 1.05], [0.07, 2.12, 0.88, 1.05], [0.06, 2.1, 0, 1.05], [1.8, 0.06, 0, 0.03]]) B(a, b, 0.07, lx + c2, d, -0.035, 0xf6f6f2); return; }
    const c = DOORS[Math.floor(rnd() * DOORS.length)];
    B(0.95, 2.12, 0.06, lx, 1.06, -0.03, 0xf6f6f2); B(0.82, 2.0, 0.05, lx, 1.02, -0.05, c); B(0.5, 0.6, 0.02, lx, 1.55, -0.08, 0x8ea6ba); B(0.04, 0.16, 0.04, lx + 0.32, 1.0, -0.1, 0xc0c0c0); B(1.1, 0.12, 0.35, lx, 0.06, -0.18, 0xb8b4ac); };
  for (let i = 0; i < n; i++) {
    const x0 = i * w, cx = x0 + w / 2, isBrick = rnd() < 0.55;
    if (isBrick) tex(uvBox(w, eave, D, 1.0), brick, cx, eave / 2, D / 2); else B(w, eave, D, cx, eave / 2, D / 2, RENDER[Math.floor(rnd() * RENDER.length)]);
    B(w, 0.2, 0.06, cx, 0.1, -0.03, 0x5a5650);                                                                                         // the plinth
    win(cx - w * 0.22, eave - 1.45, 1.0, 1.15); win(cx + w * 0.24, eave - 1.45, rnd() < 0.5 ? 0.6 : 1.0, rnd() < 0.5 ? 0.8 : 1.15);   // upstairs (a bathroom sometimes)
    const ext = rnd() < 0.4;
    if (ext) {   // a single-storey kitchen extension with a lean-to roof and a roof light
      const ew = w * 0.62, ed = 2.6, ex = x0 + ew / 2 + 0.05, eh = 2.7;
      if (isBrick) tex(uvBox(ew, eh, ed, 1.0), brick, ex, eh / 2, -ed / 2); else B(ew, eh, ed, ex, eh / 2, -ed / 2, 0xf4f1ea);
      const rl = Math.hypot(ed + 0.2, 0.5), rg = new THREE.PlaneGeometry(ew + 0.2, rl), uv = rg.attributes.uv; for (let q = 0; q < uv.count; q++) uv.setXY(q, uv.getX(q) * (ew + 0.2) / 1.2, uv.getY(q) * rl / 1.2);
      tex(rg, ROOFT, ex, eh + 0.25, -ed / 2 - 0.05, -Math.PI / 2 - Math.atan2(0.5, ed + 0.2));
      B(0.7, 0.03, 0.9, ex, eh + 0.3, -ed / 2, 0x8ea6ba);
      // its own window and door (on the garden side)
      const sv = -ed; const keep = (fn) => { const save = M4.clone(); M4.multiply(new THREE.Matrix4().makeTranslation(0, 0, sv)); fn(); M4.copy(save); };
      keep(() => { win(ex - ew * 0.2, 1.5, 1.1, 1.0); door(ex + ew * 0.3, 'door'); });
      win(x0 + w * 0.82, 1.5, 0.9, 1.1);
    } else { win(cx - w * 0.2, 1.5, 1.5, 1.2); door(cx + w * 0.28, rnd() < 0.4 ? 'patio' : 'door'); }
    if (rnd() < 0.3) { B(0.06, 0.4, 0.06, x0 + 0.6, eave - 0.5, -0.05, 0x333333); P(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 16), 0xe8e8e8, x0 + 0.6, eave - 0.2, -0.12, Math.PI / 2 - 0.4); }   // a satellite dish
    // the back garden: lawn, a patio by the house, the fences, a shed or a trampoline, a washing line, shrubs
    B(w - 0.1, 0.02, garden, cx, 0.012, -garden / 2, [0x5a8a36, 0x4e7e30, 0x648e3a][Math.floor(rnd() * 3)]);
    B(w - 0.1, 0.03, 2.2, cx, 0.02, -1.1 - (ext ? 2.6 : 0), 0xb0a89a);
    for (let z = -garden + 0.1; z < -0.3; z += 1.83) { B(0.04, 1.8, 1.8, x0, 0.92, z + 0.9, 0x7a5a3a); B(0.1, 1.9, 0.1, x0, 0.95, z, 0x5a4028); for (let s = 0.1; s < 1.8; s += 0.15) B(0.06, 1.75, 0.012, x0 + 0.03, 0.9, z + s, 0x6a4c30); }
    const r = rnd();
    if (r < 0.45) { const sx = cx + (rnd() - 0.5) * 1.6, sz = -garden + 1.6; B(1.8, 1.9, 1.4, sx, 0.95, sz, [0x5a6a4a, 0x7a5a3a, 0x3a4a5a][Math.floor(rnd() * 3)]); P(new THREE.CylinderGeometry(0.01, 1.3, 0.5, 4, 1), 0x2a2a2a, sx, 2.15, sz, 0, 0); B(0.7, 1.6, 0.03, sx, 0.85, sz - 0.71, 0x4a3a2a); }   // a shed
    else if (r < 0.65) { const tx = cx, tz = -garden * 0.55; P(new THREE.CylinderGeometry(1.6, 1.6, 0.05, 24), 0x111111, tx, 0.75, tz); P(new THREE.TorusGeometry(1.65, 0.05, 6, 24), 0x2a6ad8, tx, 0.77, tz, Math.PI / 2); for (let q = 0; q < 6; q++) B(0.04, 0.75, 0.04, tx + Math.cos(q) * 1.6, 0.37, tz + Math.sin(q) * 1.6, 0x888888); }   // a trampoline
    if (rnd() < 0.5) { B(0.05, 1.9, 0.05, cx - 1.6, 0.95, -garden * 0.4, 0x999999); B(0.05, 1.9, 0.05, cx + 1.6, 0.95, -garden * 0.4, 0x999999); B(3.2, 0.01, 0.01, cx, 1.85, -garden * 0.4, 0xdddddd);
      for (let q = 0; q < 5; q++) B(0.4, 0.5 + rnd() * 0.3, 0.02, cx - 1.2 + q * 0.6, 1.55, -garden * 0.4, [0xffffff, 0x2a4a8a, 0xc83a3a, 0xf2d24a, 0x7aa0c8][q]); }   // washing out on the line
    for (let q = 0; q < 3; q++) { const bx = x0 + 0.5 + rnd() * (w - 1.0), bz = -0.8 - rnd() * (garden - 1.6); leafyBall(k, ...new THREE.Vector3(bx, 0.45, bz).applyMatrix4(M4).toArray(), 0.4 + rnd() * 0.3, { n: 40, r: 0.12 }); }
    // gutter, downpipe, a stack on the party wall, the pots
    B(w, 0.1, 0.12, cx, eave + 0.02, -0.08, 0x2a2a2a); P(new THREE.CylinderGeometry(0.04, 0.04, eave, 8), 0x2a2a2a, x0 + 0.15, eave / 2, -0.06);
    if (i % 2 === 0) { B(0.55, 1.4, 0.9, x0 + 0.02, eave + rise + 0.5, D / 2, 0x8a4a32); B(0.65, 0.1, 1.0, x0 + 0.02, eave + rise + 1.2, D / 2, 0x6a3a28); for (const dz of [-0.22, 0.22]) P(new THREE.CylinderGeometry(0.09, 0.1, 0.35, 10), 0xb8603a, x0 + 0.02, eave + rise + 1.42, D / 2 + dz); }
  }
  // the roof (both slopes), ridge tiles, the gable ends, chimney at the far end
  for (const sdn of [-1, 1]) { const rl = Math.hypot(D / 2 + 0.35, rise + 0.25), rg = new THREE.PlaneGeometry(L + 0.4, rl), uv = rg.attributes.uv; for (let q = 0; q < uv.count; q++) uv.setXY(q, uv.getX(q) * (L + 0.4) / 1.5, uv.getY(q) * rl / 1.5);
    tex(rg, ROOFT, L / 2, eave + rise / 2 - 0.08, D / 2 + sdn * (D / 4 + 0.1), sdn < 0 ? -(Math.PI / 2 + pitch) : -(Math.PI / 2 - pitch)); }
  P(new THREE.CylinderGeometry(0.11, 0.11, L + 0.4, 8), 0x4a2a20, L / 2, eave + rise + 0.03, D / 2, 0, Math.PI / 2);
  for (const ex of [0, L]) { const sh = new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, rise)]); const gg = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }); gg.rotateY(Math.PI / 2); gg.translate(ex - 0.1, eave, D / 2); gg.applyMatrix4(M4); k.parts.push(part(gg, 0x9a5a3e)); }
  // the whole block is solid
  const c = new THREE.Vector3(L / 2, 0, D / 2).applyMatrix4(M4), hx = Math.abs(Math.cos(ry)) * L / 2 + Math.abs(Math.sin(ry)) * D / 2, hz = Math.abs(Math.sin(ry)) * L / 2 + Math.abs(Math.cos(ry)) * D / 2;
  k.blockers.push({ x0: c.x - hx, x1: c.x + hx, z0: c.z - hz, z1: c.z + hz, y1: eave });
}
const texMats = new Map();
function texMatOf(t) { if (!texMats.has(t.uuid)) { t.wrapS = t.wrapT = THREE.RepeatWrapping; texMats.set(t.uuid, new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide })); } return texMats.get(t.uuid); }
let ROOF = null;
function roofTex() {
  if (ROOF) return ROOF;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#6a3a2c'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) for (let x = (y / 16 % 2) * 12; x < 256 + 24; x += 24) { g.fillStyle = ['#7a4232', '#5e3226', '#86503a', '#6a3a2c', '#704030'][(x * 7 + y * 3) % 5]; g.fillRect(x + 1, y + 1, 22, 13); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y + 13, 24, 3); }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '90,100,60' : '200,200,180'},0.18)`; g.fillRect(Math.random() * 256, Math.random() * 256, 3 + Math.random() * 5, 2); }   // lichen
  ROOF = new THREE.CanvasTexture(c); ROOF.colorSpace = THREE.SRGBColorSpace; return ROOF;
}

// ---- a tall indoor fig (ficus) in a pot: braided trunks, branches arching out, a dense crown of broad glossy leaves,
// each one a curved oval with a midrib, darker underneath, angled every which way
export function figTree(k, x, z, { h = 2.1, pot = 0x2a2420, rim = 0xc9a24a } = {}) {
  seed = (Math.abs(Math.round(x * 1000 + z * 77)) % 2147483646) + 1;
  const ph = 0.44, pr = 0.24;
  k.parts.push(part(new THREE.CylinderGeometry(pr, pr * 0.78, ph, 20), pot, [x, ph / 2, z]));
  k.parts.push(part(new THREE.CylinderGeometry(pr * 1.06, pr * 1.06, 0.04, 20), rim, [x, ph - 0.01, z]));
  k.parts.push(part(new THREE.CylinderGeometry(pr * 0.96, pr * 0.96, 0.02, 16), 0x3a2a1c, [x, ph - 0.02, z]));
  for (let i = 0; i < 7; i++) k.parts.push(part(new THREE.SphereGeometry(0.02, 5, 3), 0x8a8478, [x + Math.cos(i * 2.3) * 0.15, ph - 0.005, z + Math.sin(i * 2.3) * 0.15], [0, 0, 0], [1, 0.5, 1]));   // pebbles on the soil
  k.blockers.push({ x0: x - pr, x1: x + pr, z0: z - pr, z1: z + pr, y1: ph });
  const BARK = 0x7a6a58, seg = (p, q, r0, r1, col = BARK) => { const d = new THREE.Vector3().subVectors(q, p), L = d.length(); const g = new THREE.CylinderGeometry(r1, r0, L, 6); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); k.parts.push(part(g, col, [(p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2])); };
  const LEAF = [0x1f4a1a, 0x2a5a20, 0x346a26, 0x2e6224, 0x3e7a2c, 0x264e1c];
  const leafAt = (p, dir) => {            // a leaf on a short stalk, pointing out and drooping
    const a = Math.atan2(dir.z, dir.x) + (rnd() - 0.5) * 1.6, droop = -0.2 - rnd() * 0.7, len = 0.07 + rnd() * 0.035;
    const tip = new THREE.Vector3(Math.cos(a) * Math.cos(droop), Math.sin(droop), Math.sin(a) * Math.cos(droop));
    const c = p.clone().addScaledVector(tip, len * 0.6 + 0.015);
    const g = new THREE.SphereGeometry(1, 6, 3); g.scale(len, 0.004, len * 0.48);
    const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) { const u = pos.getX(i) / len; pos.setY(i, pos.getY(i) - 0.012 * u * u + (Math.abs(pos.getZ(i)) / (len * 0.48)) * 0.006); }   // curl down at the tip, cupped
    g.rotateX((rnd() - 0.5) * 0.9); g.rotateZ(droop); g.rotateY(-a);
    const col = LEAF[Math.floor(rnd() * LEAF.length)];
    k.parts.push(part(g, col, c.toArray()));
    const mr = new THREE.BoxGeometry(len * 1.6, 0.002, 0.003); mr.rotateZ(droop); mr.rotateY(-a); k.parts.push(part(mr, new THREE.Color(col).multiplyScalar(1.5).getHex(), [c.x, c.y + 0.003, c.z]));   // the midrib
  };
  // three trunks twisting round each other
  const tops = [];
  for (let t = 0; t < 3; t++) { let prev = new THREE.Vector3(x + Math.cos(t * 2.1) * 0.03, ph, z + Math.sin(t * 2.1) * 0.03);
    for (let i = 1; i <= 8; i++) { const yy = ph + (h * 0.62) * i / 8, a = t * 2.1 + i * 0.7, q = new THREE.Vector3(x + Math.cos(a) * 0.035, yy, z + Math.sin(a) * 0.035); seg(prev, q, 0.024 - i * 0.0015, 0.023 - i * 0.0016); prev = q; }
    tops.push(prev); }
  // branches: arching out and up from the upper trunks, each splitting into twigs thick with leaves
  const branch = (from, dir, len, depth) => {
    const N = 5; let p = from.clone(); const d = dir.clone().normalize();
    for (let i = 0; i < N; i++) { const q = p.clone().addScaledVector(d, len / N); q.y += (len / N) * (0.25 - i * 0.12); seg(p, q, 0.011 - depth * 0.003 - i * 0.001, 0.01 - depth * 0.003 - i * 0.001);
      const nl = depth === 0 ? 3 : 6; for (let l = 0; l < nl; l++) leafAt(q.clone().lerp(p, rnd()), d);
      if (depth < 1 && i >= 1 && rnd() < 0.7) { const nd = d.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (rnd() - 0.5) * 2.2); nd.y += 0.2 + rnd() * 0.3; branch(q, nd, len * 0.55, depth + 1); }
      p = q; }
    for (let l = 0; l < 10; l++) leafAt(p.clone().add(new THREE.Vector3((rnd() - 0.5) * 0.06, (rnd() - 0.5) * 0.06, (rnd() - 0.5) * 0.06)), d);   // a tuft at the tip
  };
  for (let b = 0; b < 14; b++) { const t = tops[b % 3], from = new THREE.Vector3(t.x, ph + h * (0.3 + 0.32 * (b / 14)) + rnd() * 0.08, t.z), a = b * 2.39996, up = 0.25 + rnd() * 0.5;
    branch(from, new THREE.Vector3(Math.cos(a), up, Math.sin(a)), 0.32 + rnd() * 0.28, 0); }
  for (const t of tops) branch(t, new THREE.Vector3((rnd() - 0.5) * 0.4, 1, (rnd() - 0.5) * 0.4), 0.38, 0);   // the leaders at the top
  for (let i = 0; i < 6; i++) { const a = rnd() * 6.28; leafAt(new THREE.Vector3(x + Math.cos(a) * 0.04, ph + 0.05, z + Math.sin(a) * 0.04), new THREE.Vector3(Math.cos(a), 0, Math.sin(a))); }   // a couple of fallen leaves... on the soil
}
