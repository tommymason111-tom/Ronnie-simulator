// WEATHER AND THE TIME OF DAY: sunshine, cloud, drizzle, rain, downpours, thunderstorms, fog, snow, hail, gales and
// heatwaves, and a sun that rises, sets and gives way to the moon and the stars. Picked in the pause menu (or left on
// AUTO / the day cycle); in a room the host's choice is everyone's.
//
// How it stays cheap (and never builds a shader in the middle of play):
//   - ONE MAP OF THE LEVEL, made while it loads: for every spot, is it indoors, how high is whatever's on top there (a
//     roof, a parasol, a table, the ground), and how much street-lamp light falls there at night. Looking down on the
//     level once from above gives the heights.
//   - EVERY LIT SURFACE reads that map in its last few lines (patched into three.js's shared fog code, so every shader
//     has it from the start: no new kinds of shader). Outdoors it's darkened and tinted for the time of day and the
//     cloud, lamp-lit at night, darker where wet, with puddles (that reflect the sky and ripple in the rain), snow
//     settling on whatever faces up, lightning lighting it all up. Indoors it's left as the level made it. Fog only
//     thickens outdoors. Under a roof or a parasol stays dry.
//   - The rain / snow / hail is one draw: a few thousand streaks that follow you about, stopping at whatever they land
//     on; splashes are a second, blowing leaves a third. The sky gets one more layer on top (cloud cover, sunsets, the
//     night sky with stars and the moon, lightning bolts). Windows with a painted view outside show the same weather
//     and time (rain running down the glass, a night version of the view).
//   - Lights are never added or removed (that rebuilds every shader): only the sun's light moves, dims and turns to
//     moonlight, and the level's own glows get brighter at night.
// Imposter's lights-out and its fog are left in charge while they're on (see dim() in imposter.js and fogLock).
import * as THREE from 'three';
import { weatherSound, thunder } from './audio.js';

// ---------------------------------------------------------------- the kinds of weather
// cloud cover, how dark it gets, rain, snow, hail, wind, fog, lightning, heat (all 0..1); fine: drizzle-sized drops
export const WEATHERS = {
  clear: { ico: '☀️', name: 'SUNNY', cloud: 0.06, wind: 0.12 },
  cloudy: { ico: '⛅', name: 'CLOUDY', cloud: 0.58, dark: 0.06, wind: 0.25 },
  overcast: { ico: '☁️', name: 'OVERCAST', cloud: 0.97, dark: 0.24, wind: 0.2 },
  drizzle: { ico: '🌦️', name: 'DRIZZLE', cloud: 0.94, dark: 0.28, rain: 0.3, fog: 0.3, wind: 0.15, fine: 1 },
  rain: { ico: '🌧️', name: 'RAIN', cloud: 1, dark: 0.4, rain: 0.6, wind: 0.3, fog: 0.15 },
  heavy: { ico: '🌊', name: 'DOWNPOUR', cloud: 1, dark: 0.55, rain: 1, wind: 0.45, fog: 0.32 },
  storm: { ico: '⛈️', name: 'THUNDERSTORM', cloud: 1, dark: 0.72, rain: 0.9, wind: 0.8, fog: 0.25, bolt: 1 },
  fog: { ico: '🌫️', name: 'FOG', cloud: 0.8, dark: 0.12, fog: 1, wind: 0.03 },
  snow: { ico: '🌨️', name: 'SNOW', cloud: 0.95, dark: 0.18, snow: 0.85, wind: 0.22, fog: 0.3 },
  hail: { ico: '🧊', name: 'HAIL', cloud: 1, dark: 0.5, hail: 1, wind: 0.45, fog: 0.12 },
  windy: { ico: '💨', name: 'GALE', cloud: 0.45, dark: 0.05, wind: 1 },
  heatwave: { ico: '🥵', name: 'HEATWAVE', cloud: 0, heat: 1, wind: 0.05 },
};
const KEYS = ['cloud', 'dark', 'rain', 'snow', 'hail', 'wind', 'fog', 'bolt', 'heat', 'fine'];
// what AUTO moves on to next (and how often): mostly fair, the odd shower, now and then something wild
const NEXT = { clear: ['clear', 'cloudy', 'cloudy', 'windy', 'heatwave'], cloudy: ['clear', 'clear', 'overcast', 'windy', 'drizzle'], overcast: ['cloudy', 'drizzle', 'rain', 'fog', 'snow'],
  drizzle: ['overcast', 'rain', 'cloudy'], rain: ['drizzle', 'heavy', 'overcast', 'hail'], heavy: ['rain', 'storm', 'rain'], storm: ['heavy', 'rain'], fog: ['overcast', 'cloudy', 'clear'],
  snow: ['overcast', 'snow', 'cloudy'], hail: ['rain', 'overcast'], windy: ['cloudy', 'clear', 'rain'], heatwave: ['clear', 'cloudy'] };
// times you can pick (0 = midnight, 0.5 = midday); CYCLE runs a whole day in DAY_SECS (the night goes by quicker)
export const TIMES = { cycle: ['🔄', 'DAY CYCLE'], dawn: ['🌅', 'SUNRISE', 0.243], morning: ['🌤️', 'MORNING', 0.36], noon: ['☀️', 'MIDDAY', 0.5], afternoon: ['🕓', 'AFTERNOON', 0.63], dusk: ['🌇', 'SUNSET', 0.757], night: ['🌙', 'NIGHT', 0.88], midnight: ['🌌', 'MIDNIGHT', 0.0] };
const DAY_SECS = 1200;
const OUTDOOR = new Set(['pub', 'garden', 'grid']);       // places with real outdoors (and a real sky)
// each place: where its sun sits at midday (the level's own sun), its outdoor haze, how much its own sky does sunsets,
// how dark its rooms go at night (lamps on), how far up the sky is
const PLACE = {
  pub: { south: [-0.4, 0.7], haze: [27, 39.5], skyOwn: 0, inNight: [0.9, 0.85, 0.8], sunDist: 14 },
  garden: { south: [8, -5], haze: [22, 40], skyOwn: 0.6, inNight: [0.82, 0.76, 0.72], sunDist: 20 },
  grid: { south: [0.5, 0.5], haze: [30, 39], skyOwn: 0, inNight: [1, 1, 1], sunDist: 12 },
  bedroom: { inNight: [0.5, 0.5, 0.62], sunLo: 0.08 },
  shop: { inNight: [0.95, 0.95, 0.96], sunLo: 0.6 },
  restaurant: { inNight: [0.95, 0.9, 0.86], sunLo: 0.5 },
};

// ---------------------------------------------------------------- the shared bits every lit surface reads
// (plain objects, not three.js vectors, so every material shares the very same ones: nothing to copy each frame)
const U = {
  wxA: { x: 0, y: 0, z: 0, w: 0 },      // on, fog outdoors only, time (s), lightning flash
  wxOut: { x: 1, y: 1, z: 1, w: 0 },    // outdoor light (rgb), wetness
  wxIn: { x: 1, y: 1, z: 1, w: 0 },     // indoor light (rgb), snow lying
  wxLamp: { x: 0, y: 0, z: 0, w: 0 },   // street-lamp light at night (rgb), rain (ripples)
  wxSky: { x: 0.7, y: 0.8, z: 0.9, w: 0 },    // what a puddle reflects
  wxBox: { x: 0, y: 0, z: 1, w: 1 },    // where the map is: x0, z0, 1/width, 1/depth
};
const NEUTRAL = (() => { const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); t.needsUpdate = true; t.userData.keep = true; return t; })();
const LIT_VS = { pars: `
#if defined(LAMBERT) || defined(PHONG) || defined(STANDARD) || defined(WX_BASIC)
#define WX_ON
varying vec3 vWxPos;
#endif
`, main: `
#ifdef WX_ON
{ vec4 wxp = vec4(transformed, 1.0);
#ifdef USE_BATCHING
  wxp = batchingMatrix * wxp;
#endif
#ifdef USE_INSTANCING
  wxp = instanceMatrix * wxp;
#endif
  vWxPos = (modelMatrix * wxp).xyz; }
#endif
` };
const LIT_FS = { pars: `
#if defined(LAMBERT) || defined(PHONG) || defined(STANDARD) || defined(WX_BASIC)
#define WX_ON
varying vec3 vWxPos;
uniform vec4 wxA, wxOut, wxIn, wxLamp, wxSky, wxBox;
uniform sampler2D wxMask;
float wxHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wxNoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(wxHash(i), wxHash(i + vec2(1.0, 0.0)), u.x), mix(wxHash(i + vec2(0.0, 1.0)), wxHash(i + vec2(1.0, 1.0)), u.x), u.y); }
#endif
`, main: `
float wxFogK = 1.0;
#ifdef WX_ON
if (wxA.x > 0.5) {
#ifdef WX_BASIC
  vec3 wxN = vec3(0.0, 1.0, 0.0);
#else
  vec3 wxN = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
#endif
  vec4 wm = texture2D(wxMask, (vWxPos.xz + wxN.xz * 0.3 - wxBox.xy) * wxBox.zw);
  float wTop = wm.b * 14.0 - 1.0;                                     // the top of whatever's here (roof, parasol, ground)
  float wIn = wm.r * step(vWxPos.y, wTop - 0.15);                      // indoors (under the roof)
  float wOut = 1.0 - wIn;
  float wSky = wOut * smoothstep(wTop - 0.35, wTop - 0.08, vWxPos.y);  // open to the sky: the rain lands on it
  float wLamp = wm.g * (1.0 - smoothstep(wm.a * 14.0 - 0.2, wm.a * 14.0 + 2.0, vWxPos.y));      // (lamp light: on what's below the lamps)
  vec3 wk = mix(wxIn.rgb, wxOut.rgb, wOut) + wLamp * wxLamp.rgb * wOut * (0.45 + 0.55 * clamp(wxN.y, 0.0, 1.0));
#ifdef WX_BASIC
  wk = max(wk, vec3(0.42));                                           // (signs and pictures: still readable at night)
#endif
  gl_FragColor.rgb *= wk;
  float wUp = clamp(wxN.y, 0.0, 1.0);
  float wWet = wxOut.w * wSky;
  if (wWet > 0.002) {
    gl_FragColor.rgb *= 1.0 - wWet * (0.1 + 0.2 * wUp);              // wet things are darker
    if (wUp > 0.8) {                                                  // puddles on the flat
      float n = wxNoise(vWxPos.xz * 0.42) * 0.62 + wxNoise(vWxPos.xz * 1.9 + 3.1) * 0.38;
      float pud = smoothstep(0.93 - wWet * 0.36, 0.99 - wWet * 0.36, n) * smoothstep(0.8, 0.95, wUp) * step(vWxPos.y, wTop + 0.12);      // (only on top of whatever's there)
      pud *= 1.0 - 0.8 * smoothstep(0.015, 0.08, gl_FragColor.g - max(gl_FragColor.r, gl_FragColor.b));      // (grass soaks it up)
      vec3 V = normalize(cameraPosition - vWxPos);
      float fr = 0.06 + 0.94 * pow(1.0 - clamp(V.y, 0.0, 1.0), 4.0);
      float rip = 0.0;
      if (wxLamp.w > 0.01) { vec2 q = vWxPos.xz * 2.6; vec2 c = floor(q); vec2 f = fract(q) - 0.5; float h = wxHash(c);
        float t = fract(wxA.z * (0.9 + h * 0.6) + h * 7.0); vec2 o = vec2(wxHash(c + 3.7), wxHash(c + 9.2)) - 0.5;
        rip = (1.0 - t) * (1.0 - smoothstep(0.0, 0.06, abs(length(f - o * 0.4) - t * 0.42))) * step(h, wxLamp.w * 0.9 + 0.1); }
      vec3 refl = wxSky.rgb * (0.75 + rip * 0.55) + wLamp * wxLamp.rgb * 0.7;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.45 + refl * fr, pud * (0.55 + 0.45 * wWet));
    }
  }
  float wSnow = wxIn.w * wSky * smoothstep(0.3, 0.75, wxN.y);
  if (wSnow > 0.002) { float n2 = wxNoise(vWxPos.xz * 3.0) * 0.5 + wxNoise(vWxPos.xz * 0.7) * 0.5;
    wSnow *= smoothstep(0.15, 0.45, n2 + wxIn.w * 0.55 - 0.3);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.93, 0.95, 1.0) * wk, wSnow); }
  gl_FragColor.rgb += wxA.w * wOut * vec3(0.5, 0.56, 0.72) * (0.3 + 0.7 * wUp);     // lightning
  wxFogK = mix(1.0, wOut, wxA.y);
}
#endif
` };
// patch three.js's shared shader code (once, before anything is drawn: every shader is built with it)
(function patchShaders() {
  if (THREE.ShaderChunk.__wx) return; THREE.ShaderChunk.__wx = true;
  const C = THREE.ShaderChunk;
  C.fog_pars_vertex = LIT_VS.pars + C.fog_pars_vertex;
  C.fog_vertex = LIT_VS.main + C.fog_vertex;
  C.fog_pars_fragment = LIT_FS.pars + C.fog_pars_fragment;
  C.fog_fragment = LIT_FS.main + C.fog_fragment.replace(/mix\(\s*gl_FragColor\.rgb\s*,\s*fogColor\s*,\s*fogFactor\s*\)/, 'mix( gl_FragColor.rgb, fogColor, fogFactor * wxFogK )');
  const L = THREE.ShaderLib;
  L.basic.vertexShader = '#define WX_BASIC\n' + L.basic.vertexShader; L.basic.fragmentShader = '#define WX_BASIC\n' + L.basic.fragmentShader;
  for (const k of ['basic', 'lambert', 'phong', 'standard', 'physical']) { if (!L[k]) continue; for (const n in U) L[k].uniforms[n] = { value: U[n] }; L[k].uniforms.wxMask = { value: NEUTRAL }; }
})();
const setMask = (tex) => { for (const k of ['basic', 'lambert', 'phong', 'standard', 'physical']) if (THREE.ShaderLib[k]) THREE.ShaderLib[k].uniforms.wxMask.value = tex; };

// ---------------------------------------------------------------- little helpers
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const v3 = (r, g, b) => ({ r, g, b });
const mixc = (a, b, t) => v3(lerp(a.r, b.r, t), lerp(a.g, b.g, t), lerp(a.b, b.b, t));
const mulc = (a, k) => v3(a.r * k, a.g * k, a.b * k);
const setv = (u, c, w) => { u.x = c.r; u.y = c.g; u.z = c.b; if (w !== undefined) u.w = w; };
let seed = 12345; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const NOISE_GLSL = `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.02 + vec2(1.7, 9.2); a *= 0.5; } return v; }`;

// the sun (and the moon) over England: 51.5° north, a spring-ish day. tod 0..1 from midnight
const LAT = 51.5 * Math.PI / 180;
function skyDir(tod, decl, south, out) {
  const H = (tod - 0.5) * Math.PI * 2, d = decl * Math.PI / 180;
  const east = -Math.cos(d) * Math.sin(H), up = Math.sin(LAT) * Math.sin(d) + Math.cos(LAT) * Math.cos(d) * Math.cos(H), north = Math.cos(LAT) * Math.sin(d) - Math.sin(LAT) * Math.cos(d) * Math.cos(H);
  const sx = south[0], sz = south[1], L = Math.hypot(sx, sz) || 1, Sx = sx / L, Sz = sz / L, Ex = Sz, Ez = -Sx;      // (east is up × south)
  out.set(Ex * east - Sx * north, up, Ez * east - Sz * north).normalize(); return out;
}

// ---------------------------------------------------------------- the map of the level (see the top)
function buildMap(renderer, scene, room, outdoor) {
  if (!outdoor) {      // all indoors: one texel says so
    const d = new Uint8Array([255, 0, 255, 255]), t = new THREE.DataTexture(d, 1, 1); t.needsUpdate = true; t.userData.keep = true;
    return { tex: t, box: { x0: -1e4, z0: -1e4, w: 2e4, d: 2e4 }, res: 1, data: d, inside: () => 1, top: () => 13 };
  }
  const B = room.bounds || { x0: -10, x1: 10, z0: -10, z1: 10 }, pad = 16;
  const x0 = B.x0 - pad, x1 = B.x1 + pad, z0 = B.z0 - pad, z1 = B.z1 + pad, W = x1 - x0, D = z1 - z0;
  const RES = Math.min(512, Math.max(128, 1 << Math.ceil(Math.log2(Math.max(W, D) / 0.16))));
  // heights: the level from straight above, each pixel the height of the top surface there
  const hm = new THREE.ShaderMaterial({ side: THREE.DoubleSide,
    vertexShader: `varying float vY; void main() { vec4 p = vec4(position, 1.0);
      #ifdef USE_INSTANCING
        p = instanceMatrix * p;
      #endif
      p = modelMatrix * p; vY = p.y; gl_Position = projectionMatrix * viewMatrix * p; }`,
    fragmentShader: `varying float vY; void main() { float h = clamp((vY + 1.0) / 16.0, 0.0, 1.0) * 65535.0; float hi = floor(h / 256.0); gl_FragColor = vec4(hi / 255.0, (h - hi * 256.0) / 255.0, 0.0, 1.0); }` });
  const cam = new THREE.OrthographicCamera(-W / 2, W / 2, D / 2, -D / 2, 0.5, 120);
  cam.position.set((x0 + x1) / 2, 60, (z0 + z1) / 2); cam.rotation.set(-Math.PI / 2, 0, 0); cam.updateMatrixWorld(true);
  const hidden = [];
  scene.traverse(o => { if (!o.visible) return; const ms = o.material ? [].concat(o.material) : [];
    let skip = o.isSprite || o.isPoints || o.isLine || o.userData.foliage || (o.renderOrder && Math.abs(o.renderOrder) >= 90);
    if (!skip && o.isMesh) for (const m of ms) if (m.isShaderMaterial || m.blending === THREE.AdditiveBlending || (m.transparent && m.opacity < 0.05)) skip = true;
    if (!skip && o.isMesh && o.geometry) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); if (o.geometry.boundingSphere && o.geometry.boundingSphere.radius > 150 && !o.isInstancedMesh && o.geometry.attributes.position.count < 3000 && o.frustumCulled === false) skip = true; }
    if (skip && (o.isMesh || o.isSprite || o.isPoints || o.isLine)) { o.visible = false; hidden.push(o); } });
  const rt = new THREE.WebGLRenderTarget(RES, RES), buf = new Uint8Array(RES * RES * 4);
  const was = { bg: scene.background, fog: scene.fog, ov: scene.overrideMaterial, obr: scene.onBeforeRender, rt: renderer.getRenderTarget(), cc: renderer.getClearColor(new THREE.Color()), ca: renderer.getClearAlpha(), sh: renderer.shadowMap.autoUpdate, xr: renderer.xr.enabled };
  try {
    scene.background = null; scene.fog = null; scene.overrideMaterial = hm; scene.onBeforeRender = () => {}; renderer.shadowMap.autoUpdate = false; renderer.xr.enabled = false;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, cam); renderer.readRenderTargetPixels(rt, 0, 0, RES, RES, buf);
  } catch (e) { console.warn('weather map', e); }
  finally { scene.background = was.bg; scene.fog = was.fog; scene.overrideMaterial = was.ov; scene.onBeforeRender = was.obr; renderer.setRenderTarget(was.rt); renderer.setClearColor(was.cc, was.ca); renderer.shadowMap.autoUpdate = was.sh; renderer.xr.enabled = was.xr; for (const o of hidden) o.visible = true; rt.dispose(); hm.dispose(); }
  const data = new Uint8Array(RES * RES * 4), indoors = room.indoors || (() => false), sx = W / RES, sz = D / RES;
  const enc = (h) => Math.max(0, Math.min(255, Math.round((h + 1) / 14 * 255)));
  for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) {
    const x = x0 + (i + 0.5) * sx, z = z0 + (j + 0.5) * sz, r = RES - 1 - j, p = (r * RES + i) * 4;
    const h = ((buf[p] * 256 + buf[p + 1]) / 65535) * 16 - 1, inn = indoors(x, z), q = (j * RES + i) * 4;
    data[q] = inn ? 255 : 0; data[q + 1] = 0; data[q + 2] = inn ? Math.max(enc(h), enc(4.2)) : enc(h); data[q + 3] = 255;
  }
  // lamp light at night: a warm pool under every lamp outdoors (street lights, the garden's lights)
  const pools = [], L = room.kitLights || {}, lw = new Float32Array(RES * RES), ly = new Float32Array(RES * RES);
  for (const h of (L.halos && L.halos.list) || []) if (h[3] >= 0.5) pools.push([h[0], h[1], h[2], 1.4 + h[3] * 2.3, 0.85]);
  for (const [, list] of L.lamps || []) for (const l of list) pools.push([l[0], l[1], l[2], 1.2 + l[3] * 6, 0.2]);
  for (const [x, y, z, R0, k] of pools) {
    if (indoors(x, z) || y > 9) continue; const R = R0 * (0.75 + Math.min(1, y / 5) * 0.25);
    const i0 = Math.max(0, Math.floor((x - R - x0) / sx)), i1 = Math.min(RES - 1, Math.ceil((x + R - x0) / sx)), j0 = Math.max(0, Math.floor((z - R - z0) / sz)), j1 = Math.min(RES - 1, Math.ceil((z + R - z0) / sz));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const dx = x0 + (i + 0.5) * sx - x, dz = z0 + (j + 0.5) * sz - z, d = Math.hypot(dx, dz) / R; if (d >= 1) continue;
      const v = k * Math.pow(1 - d, 2.2), q = (j * RES + i) * 4 + 1; data[q] = Math.min(255, data[q] + Math.round(255 * v)); lw[j * RES + i] += v; ly[j * RES + i] += v * y; }
  }
  for (let i = 0; i < RES * RES; i++) data[i * 4 + 3] = lw[i] > 0 ? Math.max(0, Math.min(255, Math.round((ly[i] / lw[i] + 1) / 14 * 255))) : 255;      // (how high the lamps there are)
  const tex = new THREE.DataTexture(data, RES, RES); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true; tex.userData.keep = true;
  const at = (x, z) => { const i = Math.min(RES - 1, Math.max(0, Math.floor((x - x0) / sx))), j = Math.min(RES - 1, Math.max(0, Math.floor((z - z0) / sz))); return (j * RES + i) * 4; };
  return { tex, box: { x0, z0, w: W, d: D }, res: RES, data,
    top: (x, z) => data[at(x, z) + 2] / 255 * 14 - 1,
    inside: (x, y, z) => { const p = at(x, z); return data[p] > 127 && y < data[p + 2] / 255 * 14 - 1 - 0.15 ? 1 : 0; } };
}

// ---------------------------------------------------------------- the sky's weather layer
// drawn over whatever sky the level has, only where the sky shows: darkens it (night, storm clouds), adds to it (cloud,
// a sunset, stars, the moon, lightning), fades it into the fog. Out = what's added + what was there × how much shows
const SKY_VS = `varying vec3 vDir; void main() { vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p; gl_Position.z = p.w * 0.99999; }`;
const SKY_FS = `uniform vec3 uSun, uMoon, uZen, uHor, uFogCol, uSunCol, uCloudLit, uCloudDark; uniform float uTime, uRepl, uCover, uFog, uFlash, uStars, uMoonK, uBoltA, uBoltK, uSeed; uniform vec2 uDrift;
  varying vec3 vDir;` + NOISE_GLSL + `
  void main() {
    vec3 d = normalize(vDir); float h = d.y;
    // a sky of our own (sunset / twilight / night), over the level's
    vec3 sky = mix(uHor, uZen, pow(clamp(h, 0.0, 1.0), 0.55));
    float sd = max(dot(d, uSun), 0.0);
    sky += uSunCol * (pow(sd, 6.0) * 0.55 + pow(sd, 40.0) * 0.6) * smoothstep(-0.25, 0.05, h);
    vec3 add = sky * uRepl; float keep = 1.0 - uRepl;
    if (h < 0.0) { keep = 1.0 - uRepl * 0.85; add = uHor * uRepl * 0.25; }      // (the painted distance below the horizon: darkened)
    // stars and the moon (clear nights)
    if (h > 0.0 && uStars > 0.003) {
      vec3 sp = d * 140.0; vec3 c = floor(sp); float r = hash3(c);
      if (r > 0.985) { vec3 f = fract(sp) - 0.5; float tw = 0.65 + 0.35 * sin(uTime * (1.5 + r * 4.0) + r * 60.0);
        add += vec3(0.9, 0.93, 1.0) * (1.0 - smoothstep(0.0, 0.24, length(f))) * (r - 0.985) * 66.0 * tw * uStars * smoothstep(0.0, 0.15, h); }
      add += vec3(0.25, 0.28, 0.38) * uStars * 0.12 * (1.0 - smoothstep(0.0, 0.55, abs(dot(d, normalize(vec3(0.3, 0.6, -0.74)))))) * fbm(d.xz * 9.0 / (h + 0.3));   // the milky way
    }
    if (uMoonK > 0.003) { float md = dot(d, uMoon);
      vec2 mu = vec2(dot(d, normalize(cross(uMoon, vec3(0.0, 1.0, 0.0)))), d.y - uMoon.y) * 90.0;
      float disc = smoothstep(0.99962, 0.99972, md);
      float crater = 0.78 + 0.22 * noise(mu * 1.6 + 4.0) - 0.15 * smoothstep(0.55, 0.7, noise(mu * 0.9));
      add = mix(add, vec3(0.95, 0.94, 0.86) * crater * 1.15, disc * uMoonK); keep *= 1.0 - disc * uMoonK;
      add += vec3(0.35, 0.4, 0.55) * (pow(max(md, 0.0), 900.0) * 0.6 + pow(max(md, 0.0), 60.0) * 0.12) * uMoonK; }
    // clouds: a high layer drifting with the wind, thickening into overcast
    if (h > -0.02 && uCover > 0.01) {
      vec2 uv = d.xz / (max(h, 0.0) + 0.14) * 1.25 + uDrift;
      float n = fbm(uv * 0.55 + 3.7), n2 = fbm(uv * 1.7 + 11.0 - uDrift * 0.4);
      float shape = n * 0.72 + n2 * 0.38;
      float cov = smoothstep(1.02 - uCover * 1.05, 1.18 - uCover * 0.85, shape) * smoothstep(-0.02, 0.12, h);
      cov = max(cov, smoothstep(0.75, 1.0, uCover) * 0.92 * smoothstep(-0.02, 0.08, h));      // (overcast: a sheet)
      float thick = smoothstep(0.35, 0.95, shape * (0.7 + uCover * 0.5));
      vec3 cc = mix(uCloudLit, uCloudDark, thick);
      cc += uSunCol * pow(sd, 5.0) * (1.0 - thick) * 0.9;                // edges lit by a low sun
      cc += vec3(0.75, 0.8, 1.0) * uFlash * (0.6 + 0.6 * n2);            // lightning inside the clouds
      add = mix(add, cc, cov); keep *= 1.0 - cov;
    }
    // a lightning bolt, now and then
    if (uBoltK > 0.01 && h > -0.02 && h < 0.42) {
      float az = atan(d.x, d.z), dx = az - uBoltA;
      float path = (noise(vec2(h * 18.0, uSeed)) - 0.5) * 0.05 + (noise(vec2(h * 60.0, uSeed + 3.0)) - 0.5) * 0.018;
      float w = 0.0035 + 0.007 * (0.42 - h);
      float bolt = (1.0 - smoothstep(0.0, w, abs(dx - path))) * (1.0 - smoothstep(0.3, 0.42, h));
      float br = (noise(vec2(h * 9.0, uSeed + 7.0)) > 0.62 && h < 0.3) ? (1.0 - smoothstep(0.0, w, abs(dx - path - (0.3 - h) * 0.25))) : 0.0;
      float glow = exp(-abs(dx - path) * 40.0) * (1.0 - smoothstep(0.3, 0.45, h));
      add += vec3(0.85, 0.9, 1.0) * ((bolt + br * 0.7) * 3.0 + glow * 0.45) * uBoltK;
    }
    // fog: the sky closes in to its colour, from the horizon up
    float f = clamp(uFog * (1.25 - smoothstep(-0.1, 0.65, h) * (1.15 - uFog * 0.5)), 0.0, 1.0);
    add = mix(add, uFogCol, f); keep *= 1.0 - f;
    gl_FragColor = vec4(add, keep);
    #include <colorspace_fragment>
  }`;

// ---------------------------------------------------------------- rain, snow, hail, splashes, blowing leaves
// one set of quads; each one's place is worked out on the graphics chip from the time (falling, drifting on the wind,
// wrapped round the camera), and it's hidden once it's below whatever's on top at its spot (a roof, a parasol, the ground)
const P_VS = `attribute vec4 aR; attribute vec3 aC;
  uniform vec3 uCam; uniform vec2 uDrift; uniform float uFall, uTime, uMode, uRad, uHt, uLen, uWid, uRate; uniform vec4 uBox; uniform sampler2D uMask; uniform vec3 uWind;
  varying vec2 vUv; varying float vA; varying float vK; varying vec3 vCol;
  float h1(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    vUv = aC.xy; vK = aC.z; vA = 1.0; vCol = vec3(1.0);
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec3 p; vec3 off;
    float R = uRad;
    if (aC.z < 0.5) {                                              // falling: rain streaks, snowflakes, hailstones
      float sp = 0.85 + 0.3 * aR.w;
      p.y = uCam.y - uHt * 0.3 + mod(aR.y * uHt - uFall * sp - (uCam.y - uHt * 0.3), uHt);
      vec2 sw = uMode > 0.5 && uMode < 1.5 ? vec2(sin(uTime * (0.6 + aR.w) + aR.x * 40.0), cos(uTime * (0.5 + aR.z) + aR.z * 30.0)) * 0.35 : vec2(0.0);
      p.xz = uCam.xz + mod(aR.xz * 2.0 * R + uDrift * (0.85 + 0.3 * aR.w) + sw - uCam.xz + R, 2.0 * R) - R;
      if (uMode < 0.5 || uMode > 1.5) {                            // a streak along the way it's falling (hail: short and fat)
        vec3 dir = normalize(vec3(uWind.x, -1.0, uWind.z));
        float wd = uWid * (0.7 + 0.6 * aR.z), dist = length(p - cameraPosition), px = dist * 0.0021;      // (never thinner than a pixel: fainter instead)
        vA *= min(1.0, wd / px) * 0.75 + 0.25; wd = max(wd, px);
        vec3 side = normalize(cross(dir, normalize(p - cameraPosition))) * wd;
        off = side * (aC.x - 0.5) * 2.0 + dir * uLen * (0.6 + 0.8 * aR.w) * (aC.y - 0.5);
      } else {
        float s = uWid * (0.6 + 0.8 * aR.z), px = length(p - cameraPosition) * 0.0022; vA *= min(1.0, s / px) * 0.6 + 0.4; s = max(s, px);
        off = (right * (aC.x - 0.5) + up * (aC.y - 0.5)) * s * 2.0;
      }
    } else if (aC.z < 1.5) {                                       // a splash where a drop lands (on the ground, a table, a roof)
      float cyc = uTime * uRate * (0.8 + 0.4 * aR.w) + aR.w * 17.0, n = floor(cyc), ph = fract(cyc);
      p.xz = uCam.xz + (vec2(h1(n * 12.9 + aR.x * 91.0), h1(n * 78.2 + aR.y * 47.0)) - 0.5) * 2.0 * R * 0.6;
      vec4 m = texture2D(uMask, (p.xz - uBox.xy) * uBox.zw);
      p.y = m.b * 14.0 - 1.0 + 0.01;
      float s = (uMode > 1.5 ? 0.05 : 0.07 + 0.08 * ph) * (0.7 + 0.6 * aR.z);
      if (uMode > 1.5) p.y += sin(ph * 3.14159) * 0.22 * aR.z;     // (hail bounces)
      off = (right * (aC.x - 0.5) + up * (aC.y - 0.15)) * s * 2.0;
      vA = (1.0 - ph) * step(abs(p.y - uCam.y), 7.0);
    } else {                                                       // leaves and rubbish blowing along
      float cyc = uTime * 0.07 * (0.6 + 0.8 * aR.w) + aR.w * 5.0, n = floor(cyc), ph = fract(cyc);
      vec2 base = vec2(h1(n * 3.1 + aR.x * 77.0), h1(n * 5.7 + aR.y * 31.0)) - 0.5;
      vec2 w = normalize(uWind.xz + vec2(0.001));
      p.xz = uCam.xz + base * 2.0 * R * 0.8 + w * (ph - 0.5) * 2.0 * R * 0.8;
      vec4 m = texture2D(uMask, (p.xz - uBox.xy) * uBox.zw);
      p.y = m.b * 14.0 - 1.0 + 0.04 + abs(sin(ph * 18.0 + aR.z * 9.0)) * (0.15 + aR.z * 0.9) * length(uWind.xz) * 0.25;
      float a = uTime * (4.0 + aR.z * 8.0) + aR.x * 10.0, s = 0.05 + aR.z * 0.05;
      vec3 ax = right * cos(a) + up * sin(a), ay = up * cos(a * 0.7) - right * sin(a * 0.7);
      off = (ax * (aC.x - 0.5) + ay * (aC.y - 0.5) * 0.7) * s * 2.0;
      vA = smoothstep(0.0, 0.1, ph) * (1.0 - smoothstep(0.9, 1.0, ph));
      vCol = mix(mix(vec3(0.55, 0.36, 0.12), vec3(0.75, 0.55, 0.2), aR.y), vec3(0.35, 0.45, 0.15), step(0.7, aR.x));
      if (aR.z > 0.85) vCol = vec3(0.92, 0.9, 0.85);                // (a crisp packet / a bit of paper)
    }
    // hidden under cover (or under the ground), and faded out at the edge of the patch round you
    vec4 m = texture2D(uMask, (p.xz - uBox.xy) * uBox.zw);
    float top = m.b * 14.0 - 1.0;
    if (aC.z < 0.5 && p.y < top) vA = 0.0;
    if (aC.z > 0.5 && m.r > 0.5) vA = 0.0;
    float dc = length(p.xz - uCam.xz);
    vA *= (1.0 - smoothstep(R * 0.7, R, dc)) * smoothstep(0.25, 0.9, length(p - cameraPosition));
    if (vA < 0.004) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    gl_Position = projectionMatrix * viewMatrix * vec4(p + off, 1.0);
  }`;
const P_FS = `uniform float uMode, uAlpha; uniform vec3 uColor; varying vec2 vUv; varying float vA; varying float vK; varying vec3 vCol;
  void main() {
    float a;
    vec3 c = uColor;
    if (vK < 0.5) {
      if (uMode < 0.5) a = (1.0 - smoothstep(0.0, 0.5, abs(vUv.x - 0.5))) * smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.6, 1.0, vUv.y));
      else if (uMode > 1.5) a = (1.0 - smoothstep(0.2, 0.5, abs(vUv.x - 0.5))) * smoothstep(0.0, 0.5, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y));
      else { float r = length(vUv - 0.5) * 2.0; a = uMode > 1.5 ? (1.0 - smoothstep(0.6, 1.0, r)) : (1.0 - smoothstep(0.1, 1.0, r));
        if (uMode > 1.5) c += (1.0 - smoothstep(0.0, 0.5, length(vUv - vec2(0.38, 0.62)))) * 0.4; }
    } else if (vK < 1.5) {
      vec2 q = (vUv - vec2(0.5, 0.15)) * vec2(2.0, 2.0);
      if (uMode > 1.5) a = (1.0 - smoothstep(0.25, 0.5, length(vUv - 0.5)));
      else { float ring = (1.0 - smoothstep(0.0, 0.12, abs(length(q * vec2(1.0, 2.6)) - 0.55))) * step(-0.02, q.y);
        float drops = (1.0 - smoothstep(0.0, 0.1, length(q - vec2(-0.45, 0.65)))) + (1.0 - smoothstep(0.0, 0.1, length(q - vec2(0.5, 0.75)))) + (1.0 - smoothstep(0.0, 0.09, length(q - vec2(0.05, 1.0))));
        a = (ring + drops) * 0.85; }
    } else { float r = length((vUv - 0.5) * vec2(1.0, 1.4)) * 2.0; a = (1.0 - smoothstep(0.75, 1.0, r)); c = vCol * uColor; }
    a *= vA * uAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(c, a);
    #include <colorspace_fragment>
  }`;

// ---------------------------------------------------------------- windows with a painted view outside
// the view becomes a ShaderMaterial: day and night pictures, the sky part (found from the picture) clouds over, fades
// into the fog, goes golden at sunset; rain runs down the glass, snow falls past, lightning flashes
const W_VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const W_FS = `uniform sampler2D uDay, uNight, uSkyM; uniform vec3 uTint, uCloudCol, uFogCol, uDusk; uniform float uNightK, uCloud, uRain, uSnow, uFog, uTime, uFlash, uDark, uOut;
  varying vec2 vUv;` + NOISE_GLSL + `
  void main() {
    vec2 uv = vUv;
    // rain on the glass: beads, and drops running down leaving a trail
    vec2 bend = vec2(0.0); float wet = 0.0;
    if (uRain > 0.01) {
      vec2 g = vec2(uv.x * 26.0, uv.y * 13.0); vec2 c = floor(g), f = fract(g) - 0.5; float h = hash(c);
      float bead = (1.0 - smoothstep(0.12, 0.22, length(f - (vec2(hash(c + 1.3), hash(c + 7.1)) - 0.5) * 0.5))) * step(h, uRain * 0.8);
      float col = floor(uv.x * 40.0), hc = hash(vec2(col, 3.3)), sp = 0.12 + hc * 0.25;
      float y = fract(uv.y + uTime * sp + hc * 10.0); float fx = fract(uv.x * 40.0) - 0.5 + sin(uv.y * 30.0 + hc * 9.0) * 0.12;
      float run = (1.0 - smoothstep(0.0, 0.16, abs(fx))) * (smoothstep(0.0, 0.04, y) * (1.0 - smoothstep(0.04, 0.1, y)) + (1.0 - smoothstep(0.0, 0.09, abs(fx))) * smoothstep(0.05, 0.6, y) * 0.35) * step(hc, uRain * 0.55);
      wet = clamp(bead + run, 0.0, 1.0); bend = (f + vec2(fx, 0.0) * 0.4) * wet * 0.04;
    }
    vec4 dc = texture2D(uDay, uv + bend), nc = texture2D(uNight, uv + bend);
    float sky = texture2D(uSkyM, uv + bend).r;
    vec3 c = mix(dc.rgb, nc.rgb, uNightK);
    c = mix(c, c * uDusk, (1.0 - uNightK) * (0.6 + sky * 0.4));
    vec3 cl = uCloudCol * (0.82 + 0.3 * fbm(vec2(uv.x * 6.0 + uTime * 0.02, uv.y * 3.0)));
    c = mix(c, cl, sky * smoothstep(0.2, 0.95, uCloud));
    c *= mix(1.0, uOut, 1.0 - sky * 0.4);
    c = mix(c, uFogCol, clamp(uFog * (0.55 + 0.45 * sky), 0.0, 0.95));
    if (uSnow > 0.01) { vec2 g = vec2(uv.x * 30.0 + sin(uTime + uv.y * 4.0) * 0.6, uv.y * 20.0 + uTime * 1.6); vec2 cc = floor(g), f = fract(g) - 0.5;
      float fl = (1.0 - smoothstep(0.05, 0.18, length(f - (vec2(hash(cc), hash(cc + 2.0)) - 0.5) * 0.6))) * step(hash(cc + 5.0), uSnow * 0.6);
      c = mix(c, vec3(0.95), fl * 0.85); c = mix(c, vec3(0.9, 0.92, 0.95) * mix(1.0, 0.25, uNightK), (1.0 - sky) * uSnow * 0.45 * (1.0 - smoothstep(0.2, 0.55, uv.y))); }
    c = mix(c, c * 0.6 + uFogCol * 0.25, wet * 0.5);
    c += vec3(0.7, 0.75, 0.9) * uFlash * (0.4 + sky);
    gl_FragColor = vec4(c * uTint, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
// a night version of a painted daytime view, and which part of it is sky (by colour, from the top of each column down)
function viewSet(map) {
  const tag = map.userData.view || {}, img = map.image;
  if (!img || !img.width) return null;
  const w = img.width, h = img.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  let day = map, nightCv = null;
  const g = cv.getContext('2d', { willReadFrequently: true });
  if (tag.make) {      // (it can draw itself both ways: use its own night (or day) picture)
    if (tag.day === false) { day = tag.make(true); day.userData.keep = true; }
    nightCv = tag.day === false ? img : tag.make(false).image;
  }
  g.drawImage(day.image, 0, 0); const D = g.getImageData(0, 0, w, h), px = D.data;
  // sky: the run of blue-ish / white pixels down from the top of each column
  const SW = 128, SH = Math.max(8, Math.round(128 * h / w)), sm = new Uint8Array(SW * SH * 4), skyCol = new Float32Array(w);
  const isSky = (i) => { const r = px[i], gg = px[i + 1], b = px[i + 2]; return (b > 150 && b >= r + 8 && b >= gg - 12) || (r > 225 && gg > 225 && b > 215); };
  for (let x = 0; x < w; x++) { let y = 0; while (y < h && isSky((y * w + x) * 4)) y++; skyCol[x] = y; }
  for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) { const x = Math.floor((i + 0.5) / SW * w), yTop = (j + 0.5) / SH * h, q = ((SH - 1 - j) * SW + i) * 4; sm[q] = yTop < skyCol[x] ? 255 : 0; sm[q + 3] = 255; }
  const skyTex = new THREE.DataTexture(sm, SW, SH); skyTex.magFilter = skyTex.minFilter = THREE.LinearFilter; skyTex.needsUpdate = true; skyTex.userData.keep = true;
  let night;
  if (nightCv) { night = new THREE.CanvasTexture(nightCv); }
  else {      // made up: the same view after dark (a night sky with stars, dim and blue, windows and lamps lit warm)
    let s = (w * 7 + h) | 0; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4;
      if (y < skyCol[x]) { const t = y / Math.max(1, skyCol[x]); px[i] = 10 + 30 * t; px[i + 1] = 16 + 36 * t; px[i + 2] = 44 + 60 * t; }
      else { const r0 = px[i], b0 = px[i + 2], lum = (px[i] + px[i + 1] + px[i + 2]) / 3; px[i] = px[i] * 0.16 + 4; px[i + 1] = px[i + 1] * 0.17 + 5; px[i + 2] = px[i + 2] * 0.24 + 12;
        const cell = Math.sin(Math.floor(x / (w / 11)) * 12.9898 + Math.floor(y / (h / 9)) * 78.233) * 43758.5453, lit = cell - Math.floor(cell);
        if (lum > 170 && b0 > r0 + 20 && y > skyCol[x] + 4 && lit < 0.6) { px[i] = 255; px[i + 1] = 190 + lit * 30; px[i + 2] = 100 + lit * 40; } } }      // (house windows: most of them lit)
    g.putImageData(D, 0, 0);
    for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * (skyCol[Math.floor(x)] || 0) * 0.9; g.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.5})`; g.fillRect(x, y, 1.5, 1.5); }
    for (const [lx, ly] of tag.lamps || []) { const x = lx * w, y = ly * h, R = w * 0.1;      // (its street lamps, lit)
      const gl = g.createRadialGradient(x, y, 1, x, y, R); gl.addColorStop(0, 'rgba(255,214,140,0.95)'); gl.addColorStop(0.15, 'rgba(255,190,110,0.5)'); gl.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = gl; g.fillRect(x - R, y - R, R * 2, R * 2);
      const pool = g.createRadialGradient(x, y + h * 0.35, 1, x, y + h * 0.35, w * 0.16); pool.addColorStop(0, 'rgba(255,190,110,0.35)'); pool.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = pool; g.fillRect(x - w * 0.2, y, w * 0.4, h * 0.7); }
    night = new THREE.CanvasTexture(cv);
  }
  night.colorSpace = THREE.SRGBColorSpace; night.userData.keep = true; night.needsUpdate = true;
  return { day, night, sky: skyTex };
}

// ---------------------------------------------------------------- the weather itself
export function setupWeather({ renderer, scene, room, camera, place }) {
  const outdoor = OUTDOOR.has(place), PL = PLACE[place] || PLACE.bedroom;
  const S = { want: 'auto', time: 'cycle', type: 'clear', tod: 0.36, daySecs: DAY_SECS, autoT: 200 + Math.random() * 120, host: true, t: 0 };
  // remembered on this device (and ?wx=rain&tod=0.9 in the address, for testing)
  try { const sv = JSON.parse(localStorage.getItem('rs_wx') || '{}'); if (WEATHERS[sv.w] || sv.w === 'auto') S.want = sv.w; if (TIMES[sv.t]) S.time = sv.t; } catch (e) {}
  try { const q = new URLSearchParams(location.search); if (WEATHERS[q.get('wx')] || q.get('wx') === 'auto') S.want = q.get('wx'); if (TIMES[q.get('tm')]) S.time = q.get('tm'); if (q.get('tod') != null && isFinite(+q.get('tod'))) { S.time = 'fixed'; S.tod = ((+q.get('tod') % 1) + 1) % 1; } } catch (e) {}
  if (TIMES[S.time] && TIMES[S.time][2] != null) S.tod = TIMES[S.time][2];
  S.type = WEATHERS[S.want] ? S.want : ['clear', 'clear', 'cloudy', 'cloudy', 'clear', 'overcast', 'windy'][Math.floor(Math.random() * 7)];
  const P = {}; for (const k of KEYS) P[k] = WEATHERS[S.type][k] || 0;      // the weather right now (eases towards the chosen one)
  const acc = { wet: P.rain > 0.2 ? 0.8 : 0, snowLie: P.snow > 0.2 ? 0.7 : 0, drift: new THREE.Vector2(), fall: 0, cloudDrift: new THREE.Vector2(), flash: 0, flashT: 0, boltT: 6, boltK: 0, boltA: 0, thunderAt: -1, thunderD: 0, gust: 0, gustT: 0, inside: 0 };

  // -- the map, and every lit surface pointed at it
  const map = buildMap(renderer, scene, room, outdoor);
  setMask(map.tex);
  Object.assign(U.wxBox, { x: map.box.x0, y: map.box.z0, z: 1 / map.box.w, w: 1 / map.box.d });
  if (!scene.fog) scene.fog = new THREE.Fog(0x9db7ff, 1e4, 2e4);      // (every place has a fog from the start, so no shader changes when it's needed)
  const fogBase = scene.fog.color.clone();

  // -- the level's own sky, sun and glows (whatever it has)
  const sun = room.sun && room.sun.isDirectionalLight ? room.sun : null;
  if (sun) sun.userData.wx = true;      // (Imposter's lights-out leaves this one to us: see dim())
  const sun0 = sun ? { I: sun.intensity, col: sun.color.clone(), pos: sun.position.clone(), tgt: sun.target.position.clone() } : null;
  const glows = []; scene.traverse(o => { const m = o.material; if (m && m.isShaderMaterial && m.uniforms && m.uniforms.uIntensity && m.uniforms.uPow) glows.push({ m, I: m.uniforms.uIntensity.value, flat: m.uniforms.uFlat && m.uniforms.uFlat.value > 0.5 }); });
  const waters = []; scene.traverse(o => { const m = o.material; if (m && m.isShaderMaterial && m.uniforms && m.uniforms.uDeep && m.uniforms.uSkyH) waters.push(m); });
  const skyRefs = room.skyRefs || {};      // pub: { dome } / garden: { sky, sun sprite, clouds }
  const sunFx = (room.sunFx || []).map(o => ({ o, op: o.material ? o.material.opacity : 1 }));

  // -- sky layer
  const SU = { uSun: { value: new THREE.Vector3(0, 1, 0) }, uMoon: { value: new THREE.Vector3(0, 1, 0) }, uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uFogCol: { value: new THREE.Color() }, uSunCol: { value: new THREE.Color() },
    uCloudLit: { value: new THREE.Color() }, uCloudDark: { value: new THREE.Color() }, uTime: { value: 0 }, uRepl: { value: 0 }, uCover: { value: 0 }, uFog: { value: 0 }, uFlash: { value: 0 }, uStars: { value: 0 }, uMoonK: { value: 0 },
    uBoltA: { value: 0 }, uBoltK: { value: 0 }, uSeed: { value: 3.7 }, uDrift: { value: new THREE.Vector2() } };
  let skyMesh = null;
  if (outdoor) {
    const mat = new THREE.ShaderMaterial({ uniforms: SU, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, transparent: true,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.SrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
    skyMesh = new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), mat); skyMesh.name = 'weather sky'; skyMesh.frustumCulled = false; skyMesh.renderOrder = -96; skyMesh.matrixAutoUpdate = false;
    const cv = new THREE.Vector3(); skyMesh.onBeforeRender = (r, sc, cam) => { cv.setFromMatrixPosition(cam.matrixWorld); skyMesh.matrixWorld.makeTranslation(cv.x, cv.y, cv.z); };
    scene.add(skyMesh);
  }

  // -- rain / snow / hail, splashes, leaves (outdoor places only)
  const PU = { uCam: { value: new THREE.Vector3() }, uDrift: { value: new THREE.Vector2() }, uFall: { value: 0 }, uTime: { value: 0 }, uMode: { value: 0 }, uRad: { value: 13 }, uHt: { value: 13 }, uLen: { value: 0.5 }, uWid: { value: 0.006 },
    uRate: { value: 1.6 }, uBox: { value: new THREE.Vector4(U.wxBox.x, U.wxBox.y, U.wxBox.z, U.wxBox.w) }, uMask: { value: map.tex }, uWind: { value: new THREE.Vector3() }, uColor: { value: new THREE.Color(0.8, 0.85, 0.9) }, uAlpha: { value: 0.5 } };
  const lowEnd = /Quest|OculusBrowser|Android|iPhone|iPad/i.test(navigator.userAgent || '');
  const NDROP = lowEnd ? 3200 : 6000, NSPL = lowEnd ? 260 : 450, NLEAF = 120;
  const parts = [];
  if (outdoor) {
    const pmat = new THREE.ShaderMaterial({ uniforms: PU, vertexShader: P_VS, fragmentShader: P_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const make = (n, kind) => { const g = new THREE.BufferGeometry(), R = new Float32Array(n * 4 * 4), Cc = new Float32Array(n * 4 * 3), idx = new (n * 4 > 65535 ? Uint32Array : Uint16Array)(n * 6);
      for (let i = 0; i < n; i++) { const r = [rnd(), rnd(), rnd(), rnd()];
        for (let v = 0; v < 4; v++) { R.set(r, (i * 4 + v) * 4); Cc.set([v & 1, v >> 1, kind], (i * 4 + v) * 3); }
        idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6); }
      g.setAttribute('aR', new THREE.BufferAttribute(R, 4)); g.setAttribute('aC', new THREE.BufferAttribute(Cc, 3)); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 4 * 3), 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.setDrawRange(0, 0); const m = new THREE.Mesh(g, pmat); m.frustumCulled = false; m.renderOrder = 6; m.name = 'weather ' + ['drops', 'splashes', 'leaves'][kind]; m.userData.n = n; scene.add(m); parts.push(m); return m; };
    make(NDROP, 0); make(NSPL, 1); make(NLEAF, 2);
    const cv = new THREE.Vector3(); parts[0].onBeforeRender = (r, sc, cam) => { cv.setFromMatrixPosition(cam.matrixWorld); PU.uCam.value.copy(cv); };
  }

  // -- the pub's windows seen from outside: lit up warm at night (one draw, added on top of the dark glass; nothing by day)
  const winGlow = { uK: { value: 0 } };
  { const list = (room.kitLights && room.kitLights.windows) || [];
    if (outdoor && list.length) { const pos = [], col = [], idx = []; let s2 = 77; const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
      for (const w of list) { const ux = -w.nz, uz = w.nx, lit = r2(), c = lit < 0.22 ? [0.12, 0.09, 0.06] : lit < 0.5 ? [0.95, 0.62, 0.3] : lit < 0.8 ? [1.0, 0.76, 0.45] : [0.85, 0.85, 0.75], n = pos.length / 3;
        for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { pos.push(w.x + ux * a * w.w / 2, w.y + b * w.h / 2, w.z + uz * a * w.w / 2); const k = b < 0 ? 1 : 0.7; col.push(c[0] * k, c[1] * k, c[2] * k); }
        idx.push(n, n + 1, n + 2, n, n + 2, n + 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
      const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: winGlow, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: 'varying vec3 vC; void main() { vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform float uK; varying vec3 vC; void main() { gl_FragColor = vec4(vC * uK, 1.0); }' }));
      m.name = 'weather lit windows'; m.renderOrder = 2; scene.add(m); } }

  // -- windows with a painted view
  const WU = { uCloudCol: { value: new THREE.Color() }, uFogCol: { value: new THREE.Color() }, uDusk: { value: new THREE.Color(1, 1, 1) }, uNightK: { value: 0 }, uCloud: { value: 0 }, uRain: { value: 0 }, uSnow: { value: 0 }, uFog: { value: 0 }, uTime: { value: 0 }, uFlash: { value: 0 }, uDark: { value: 0 }, uOut: { value: 1 } };
  { const done = new Map();
    scene.traverse(o => { const m = o.material; if (!o.isMesh || !m || !m.isMeshBasicMaterial || !m.map || !m.map.userData || !m.map.userData.view) return;
      let wm = done.get(m); if (!wm) { const vs = viewSet(m.map); if (!vs) return;
        wm = new THREE.ShaderMaterial({ uniforms: { ...WU, uDay: { value: vs.day }, uNight: { value: vs.night }, uSkyM: { value: vs.sky }, uTint: { value: m.color.clone() } }, vertexShader: W_VS, fragmentShader: W_FS, side: m.side });
        done.set(m, wm); }
      o.material = wm; }); }

  // -- garden plants and parasols sway in the wind (their own materials: built while the level loads, like everything)
  const SWAY = { uWxWind: { value: new THREE.Vector3() }, uWxT: { value: 0 } };
  { const sway = (m, amt, inst) => { if (!m || m.userData.wxSway) return; m.userData.wxSway = true; const prev = m.onBeforeCompile;
      m.onBeforeCompile = (sh, r) => { if (prev && prev !== THREE.Material.prototype.onBeforeCompile) prev(sh, r); Object.assign(sh.uniforms, SWAY);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform vec3 uWxWind; uniform float uWxT;').replace('#include <begin_vertex>', `#include <begin_vertex>
        { ${inst ? 'vec3 wb = instanceMatrix[3].xyz; float hh = max(position.y, 0.0);' : 'vec3 wb = position; float hh = max(position.y - 0.25, 0.0);'}
          float ph = uWxT * (1.6 + uWxWind.y * 1.4) + wb.x * 0.9 + wb.z * 0.7, k = ${amt.toFixed(3)} * hh * uWxWind.y;
          transformed.xz += uWxWind.xz * k * (0.55 + 0.45 * sin(ph)) + vec2(sin(ph * 2.3 + wb.y * 3.0), cos(ph * 1.9 + wb.x)) * k * 0.25; }`); };
      m.customProgramCacheKey = () => 'wxsway' + (inst ? 'i' : '') + amt; m.needsUpdate = true; };
    scene.traverse(o => { if (o.isMesh && o.userData.foliage) { sway(o.material, 0.05, false); if (o.customDepthMaterial) sway(o.customDepthMaterial, 0.05, false); }
      if (o.isInstancedMesh && o.material && o.material.userData && o.material.userData.sway) sway(o.material, o.material.userData.sway, true); }); }

  // -- the fog: set just before each picture is drawn (after the level's own say: the pub turns its haze on and off as
  // you go in and out; here it's only ever on outdoor surfaces anyway, so it stays on). Imposter's fog is its own
  const FOG = { r: fogBase.r, g: fogBase.g, b: fogBase.b, near: 1e4, far: 2e4 };
  function applyFog() { const fog = scene.fog; if (!fog || !fog.isFog) { U.wxA.y = 0; return; } if (scene.userData.fogLock) { U.wxA.y = 0; return; }
    U.wxA.y = 1; fog.color.setRGB(FOG.r, FOG.g, FOG.b); fog.near = FOG.near; fog.far = FOG.far; }
  // (and only this scene: anything else drawn off-screen, like the family photos, is left exactly as it was)
  { const obr0 = scene.onBeforeRender, oar0 = scene.onAfterRender; scene.onBeforeRender = function (...a) { if (obr0) obr0.apply(this, a); applyFog(); U.wxA.x = 1; };
    scene.onAfterRender = function (...a) { U.wxA.x = 0; if (oar0) oar0.apply(this, a); }; }

  // ---------------------------------------------------------------- per frame
  const sunDir = new THREE.Vector3(0, 1, 0), moonDir = new THREE.Vector3(0, 1, 0), tmpV = new THREE.Vector3();
  const C = { night: { zen: v3(0.004, 0.007, 0.022), hor: v3(0.02, 0.03, 0.065) }, dusk: { zen: v3(0.12, 0.17, 0.38), hor: v3(1.0, 0.5, 0.24) } };
  const cBuf = { a: new THREE.Color(), b: new THREE.Color() };
  let lastSend = 0, sentKey = '', sentTod = 0;
  function retarget(type, quick) { if (!WEATHERS[type]) return; S.type = type; S.blendRate = quick ? 1 / 6 : 1 / 25; }
  S.blendRate = 1 / 25;

  function update(dt, cam) {
    dt = Math.min(Math.max(dt || 0, 0), 0.25); S.t += dt;
    // the clock
    if (S.time === 'cycle') { const nightish = Math.abs(((S.tod + 0.5) % 1) - 0.5) < 0.22; S.tod = (S.tod + dt / S.daySecs * (nightish ? 2.2 : 1)) % 1; }
    else if (TIMES[S.time] && TIMES[S.time][2] != null && !(net && net.connected && !net.host && S.heard)) { const want = TIMES[S.time][2]; let d = want - S.tod; d -= Math.round(d); S.tod = (S.tod + d * Math.min(1, dt * 1.2) + 1) % 1; }      // (a guest goes where the host's clock is instead)
    if (S.todTo != null) { let d = S.todTo - S.tod; d -= Math.round(d); S.tod = (S.tod + d * Math.min(1, dt * 1.5) + 1) % 1; if (Math.abs(d) < 1e-4) S.todTo = null; }
    // AUTO: something new every few minutes (the host decides, in a room)
    if (S.want === 'auto' && S.host && (S.autoT -= dt) <= 0) { const n = NEXT[S.type] || ['clear']; retarget(n[Math.floor(Math.random() * n.length)]); S.autoT = 150 + Math.random() * 180; }
    // ease the weather towards what it's becoming
    const T = WEATHERS[S.type] || WEATHERS.clear, k = 1 - Math.exp(-dt * (S.blendRate || 0.04) * 3);
    for (const key of KEYS) P[key] += ((T[key] || 0) - P[key]) * k;
    const rainy = P.rain + P.hail * 0.3, cold = P.snow + P.hail * 0.35;
    acc.wet = clamp01(acc.wet + dt * (rainy > 0.08 ? rainy / 30 : -1 / 140) - dt * P.heat / 40);
    acc.snowLie = clamp01(acc.snowLie + dt * (cold > 0.1 ? cold / 50 : -1 / 120) - dt * rainy / 60);
    // gusts
    if ((acc.gustT -= dt) <= 0) { acc.gustT = 1.5 + Math.random() * 4; acc.gustTo = Math.random(); }
    acc.gust += ((acc.gustTo || 0) - acc.gust) * Math.min(1, dt * 0.8);
    const wind = P.wind * (0.7 + 0.5 * acc.gust), wdir = 0.6 + Math.sin(S.t * 0.013) * 0.5, wx = Math.cos(wdir), wz = Math.sin(wdir);
    // lightning: a flash (or two), the bolt, and thunder after a while (the further, the longer and the softer)
    if (P.bolt > 0.3 && (acc.boltT -= dt) <= 0) { acc.boltT = (5 + Math.random() * 12) / P.bolt; acc.flashT = 0; acc.thunderD = Math.random(); acc.boltA = (Math.random() - 0.5) * 6.2; SU.uSeed.value = Math.random() * 50;
      acc.boltK = acc.thunderD < 0.7 ? 1 : 0; acc.thunderAt = S.t + 0.5 + acc.thunderD * 5.5; }
    if (acc.flashT >= 0) { acc.flashT += dt; const t = acc.flashT, near = 1 - acc.thunderD * 0.6;
      acc.flash = near * (Math.exp(-t * 14) * (t < 0.05 ? t / 0.05 : 1) + (t > 0.13 ? 0.7 * Math.exp(-(t - 0.13) * 10) : 0) + (t > 0.3 ? 0.35 * Math.exp(-(t - 0.3) * 8) : 0));
      if (t > 1.2) { acc.flashT = -1; acc.flash = 0; } }
    const boltShow = acc.flashT >= 0 && acc.flashT < 0.45 ? acc.boltK * (acc.flashT < 0.08 || (acc.flashT > 0.13 && acc.flashT < 0.22) ? 1 : 0.25) : 0;
    if (acc.thunderAt > 0 && S.t >= acc.thunderAt) { acc.thunderAt = -1; try { thunder(acc.thunderD, acc.inside, 1); } catch (e) {} }

    // where the sun and moon are
    skyDir(S.tod, 5, PL.south || [0, 1], sunDir); skyDir((S.tod + 0.5) % 1, 12, PL.south || [0, 1], moonDir);
    const el = sunDir.y, day = smooth(-0.1, 0.2, el), twi = smooth(-0.26, 0.04, el), golden = smooth(0.34, 0.03, el) * smooth(-0.12, 0.0, el), night = 1 - twi;
    const cloud = P.cloud, dark = P.dark, fogK = clamp01(P.fog + P.rain * 0.12 + P.snow * 0.2), moonUp = smooth(-0.02, 0.15, moonDir.y);
    const clearSky = 1 - cloud * 0.92;
    // the colour of the light outdoors
    let dayCol = mixc(v3(1, 1, 1), v3(1.0, 0.76, 0.52), golden * clearSky);
    dayCol = mixc(dayCol, v3(0.86, 0.88, 0.92), cloud * 0.6); dayCol = mulc(dayCol, 1 - dark * 0.4 - fogK * 0.05);
    if (P.heat > 0.01) dayCol = mixc(dayCol, v3(1.08, 1.0, 0.86), P.heat);
    const nightCol = mulc(v3(0.14, 0.17, 0.3), (1 - cloud * 0.3) * (1 - dark * 0.35) * (0.75 + moonUp * 0.35));
    const outCol = mixc(nightCol, dayCol, twi * (0.55 + 0.45 * day));
    const lampK = smooth(0.12, -0.06, el) + dark * 0.35;
    const dim = scene.userData.wxDim ? 1 : 0;
    // indoors at night (or very dark days): the lamps take over
    const inN = PL.inNight || [1, 1, 1], inK = clamp01(night + dark * 0.4);
    const inCol = v3(lerp(1, inN[0], inK), lerp(1, inN[1], inK), lerp(1, inN[2], inK));
    // sky colours
    const zen = mixc(C.night.zen, mixc(C.dusk.zen, v3(0.25, 0.45, 0.85), day), twi), hor = mixc(C.night.hor, mixc(C.dusk.hor, v3(0.74, 0.84, 0.95), smooth(0.02, 0.3, el)), twi);
    let fogCol = { r: fogBase.r, g: fogBase.g, b: fogBase.b };
    fogCol = mixc(fogCol, v3(0.62, 0.65, 0.7), cloud * 0.7); fogCol = mixc(fogCol, v3(0.78, 0.79, 0.8), P.fog * 0.6);
    fogCol = mixc(fogCol, v3(1.0, 0.62, 0.38), golden * clearSky * 0.55); fogCol = mulc(fogCol, (1 - dark * 0.55));
    if (P.heat > 0.01) fogCol = mixc(fogCol, v3(0.95, 0.88, 0.72), P.heat * 0.5);
    fogCol = mixc(v3(0.018, 0.024, 0.045), fogCol, twi * (0.25 + 0.75 * day) + 0.02);

    // ---- every lit surface
    U.wxA.z = S.t; U.wxA.w = acc.flash * 0.9 * (dim ? 0.2 : 1);
    setv(U.wxOut, outCol, outdoor ? acc.wet : 0); setv(U.wxIn, inCol, outdoor ? acc.snowLie : 0);
    U.wxLamp.x = lampK * 0.95; U.wxLamp.y = lampK * 0.66; U.wxLamp.z = lampK * 0.34; winGlow.uK.value = clamp01(lampK * 1.1) * (dim ? 0.1 : 1); U.wxLamp.w = clamp01(P.rain * 1.1 + P.hail * 0.5);
    const skyC = mixc(hor, zen, 0.3); setv(U.wxSky, mixc(mixc(skyC, fogCol, 0.5), v3(0.45, 0.47, 0.5), cloud * 0.5 * day));

    // ---- the fog (Imposter's own while it's on)
    FOG.r = fogCol.r; FOG.g = fogCol.g; FOG.b = fogCol.b;
    if (outdoor) { const [n0, f0] = PL.haze || [30, 39]; const fk = Math.pow(fogK, 0.8);
      FOG.near = lerp(n0, P.fog > 0.5 ? 1.0 : 6, fk) * (1 - P.heat * 0.2); FOG.far = lerp(f0, P.fog > 0.5 ? 15 : 26, fk); }
    applyFog();

    // ---- the sun's light: follows the sun round the sky outside (and its shadows), moonlight at night
    if (sun) {
      const sunUp = smooth(-0.03, 0.12, el), lightDir = sunUp > 0.02 || !(moonUp > 0) ? sunDir : moonDir;
      if (outdoor) { const dd = PL.sunDist || 15, src = el > -0.02 ? sunDir : moonDir; tmpV.copy(src); if (tmpV.y < 0.08) tmpV.y = 0.08; tmpV.normalize(); sun.position.copy(sun0.tgt).addScaledVector(tmpV, dd); }
      void lightDir;
      let I, col;
      const sunLight = sunUp * (1 - cloud * 0.78) * (1 - dark * 0.4) * (1 + P.heat * 0.25);
      const moonLight = (1 - sunUp) * moonUp * 0.22 * (1 - cloud * 0.8);
      if (outdoor) { I = sun0.I * (sunLight * (1 + golden * 0.15) + moonLight); col = mixc(mixc(v3(sun0.col.r, sun0.col.g, sun0.col.b), v3(1.0, 0.62, 0.32), golden * 0.85), v3(0.55, 0.65, 1.0), 1 - sunUp); }
      else { const lo = PL.sunLo ?? 0.5; I = sun0.I * (lo + (1 - lo) * sunUp * (1 - cloud * 0.6) * (1 - dark * 0.5)); col = mixc(mixc(v3(sun0.col.r, sun0.col.g, sun0.col.b), v3(1.0, 0.7, 0.45), golden * 0.7), v3(0.6, 0.68, 1.0), (1 - sunUp) * 0.8); }
      I += acc.flash * (outdoor ? 2.2 : 0.6) * sun0.I / Math.max(0.5, sun0.I);
      if (dim) I *= 0.08;
      sun.intensity = I; sun.color.setRGB(col.r, col.g, col.b);
    }
    for (const g of glows) g.m.uniforms.uIntensity.value = g.I * (1 + (g.flat ? 0.25 : 0.6) * lampK) * (dim ? 0.25 : 1);
    for (const w of waters) { const u = w.uniforms; u.uSun.value.copy(el > 0 ? sunDir : moonDir); u.uSkyH.value.setRGB(hor.r * 0.9 + fogCol.r * 0.1, hor.g * 0.9 + fogCol.g * 0.1, hor.b * 0.9 + fogCol.b * 0.1); u.uSkyZ.value.setRGB(zen.r, zen.g, zen.b);
      if (u.uGlint) u.uGlint.value = (el > 0 ? 1 : 0.25) * (1 - cloud * 0.85); if (u.uDim) u.uDim.value = Math.max(outCol.r, outCol.g, outCol.b); }
    for (const f of sunFx) if (f.o.material) f.o.material.opacity = f.op * smooth(0.0, 0.25, el) * (1 - cloud * 0.85);      // (sunbeams through a window)
    // the level's own sky
    if (skyRefs.dome && skyRefs.dome.uniforms.uSun) skyRefs.dome.uniforms.uSun.value.copy(sunDir);
    if (skyRefs.sky) { skyRefs.sky.material.uniforms.sunPosition.value.copy(sunDir); skyRefs.sky.material.uniforms.turbidity.value = 2.2 + cloud * 6 + P.heat * 4; }
    if (skyRefs.sunSprite) { skyRefs.sunSprite.position.copy(sunDir).multiplyScalar(28); skyRefs.sunSprite.material.opacity = smooth(-0.04, 0.04, el) * (1 - cloud * 0.95); skyRefs.sunSprite.material.color.setRGB(1, lerp(0.96, 0.7, golden), lerp(0.88, 0.5, golden)); }
    if (skyRefs.clouds) skyRefs.clouds.material.color.setRGB(lerp(0.12, 1, twi) * (1 - dark * 0.4), lerp(0.13, 1, twi) * (1 - dark * 0.4) * lerp(1, 0.82, golden), lerp(0.2, 1, twi) * (1 - dark * 0.35) * lerp(1, 0.7, golden));

    // ---- the sky layer
    if (skyMesh) {
      acc.cloudDrift.x += dt * (0.004 + wind * 0.03) * wx; acc.cloudDrift.y += dt * (0.004 + wind * 0.03) * wz;
      const own = PL.skyOwn || 0;
      SU.uRepl.value = Math.max(golden * clearSky * (1 - own) * 0.5, night * 0.94, (1 - day) * (1 - own * 0.6) * 0.6);
      let zz = zen, hh = hor;
      if (P.heat > 0.01) { const hk = P.heat * day; zz = mixc(zen, v3(0.1, 0.3, 0.82), hk); hh = mixc(hor, v3(1.0, 0.88, 0.66), hk); SU.uRepl.value = Math.max(SU.uRepl.value, hk * 0.4); }      // (a heatwave: a deep blue sky going hazy gold at the edges)
      SU.uSun.value.copy(sunDir); SU.uMoon.value.copy(moonDir); SU.uZen.value.setRGB(zz.r, zz.g, zz.b); SU.uHor.value.setRGB(hh.r, hh.g, hh.b);
      SU.uSunCol.value.setRGB(1.0, 0.55, 0.26).multiplyScalar(golden * clearSky * (1 - own * 0.5) * 0.9);
      const lit = mulc(mixc(v3(0.95, 0.96, 0.98), v3(1.0, 0.78, 0.6), golden), lerp(0.035, 1, twi) * (1 - dark * 0.55));
      const shade = mulc(v3(0.62, 0.65, 0.7), lerp(0.02, 1, twi) * (1 - dark * 0.75));
      SU.uCloudLit.value.setRGB(lit.r, lit.g, lit.b); SU.uCloudDark.value.setRGB(shade.r, shade.g, shade.b);
      SU.uCover.value = cloud; SU.uFog.value = clamp01(fogK * 0.95 + P.heat * 0.06); SU.uFogCol.value.setRGB(fogCol.r, fogCol.g, fogCol.b); SU.uFlash.value = acc.flash;
      SU.uStars.value = night * (1 - cloud) * (1 - fogK); SU.uMoonK.value = moonUp * smooth(0.2, -0.05, el) * (1 - cloud * 0.97) * (1 - fogK * 0.8);
      SU.uBoltA.value = acc.boltA; SU.uBoltK.value = boltShow; SU.uTime.value = S.t; SU.uDrift.value.copy(acc.cloudDrift);
      const need = SU.uRepl.value > 0.003 || cloud > 0.02 || SU.uFog.value > 0.003 || SU.uStars.value > 0.003 || SU.uMoonK.value > 0.003 || boltShow > 0;
      skyMesh.geometry.setDrawRange(0, need ? Infinity : 0);      // (nothing to add to the sky: not drawn at all. Never hidden, so its shader's built with the rest)
    }

    // ---- rain / snow / hail
    if (parts.length) {
      const mode = P.snow > Math.max(P.rain, P.hail) ? 1 : P.hail > P.rain ? 2 : 0, amount = clamp01(Math.max(P.rain, P.snow, P.hail));
      const speed = mode === 1 ? 1.1 : mode === 2 ? 14 : (P.fine > 0.5 ? 5 : 9);
      acc.fall += dt * speed; acc.drift.x += dt * wx * wind * (mode === 1 ? 2.5 : 3.5); acc.drift.y += dt * wz * wind * (mode === 1 ? 2.5 : 3.5);
      PU.uFall.value = acc.fall; PU.uDrift.value.copy(acc.drift); PU.uTime.value = S.t; PU.uMode.value = mode;
      PU.uWind.value.set(wx * wind * (mode === 2 ? 0.2 : 0.38), 0, wz * wind * (mode === 2 ? 0.2 : 0.38));
      PU.uLen.value = mode === 0 ? (P.fine > 0.5 ? 0.22 : 0.5 + P.rain * 0.3) : mode === 2 ? 0.3 : 0; PU.uWid.value = mode === 0 ? (P.fine > 0.5 ? 0.004 : 0.006) : mode === 1 ? 0.028 : 0.014;
      PU.uRad.value = mode === 1 ? 12 : 10; PU.uHt.value = mode === 1 ? 12 : 11;
      PU.uRate.value = mode === 2 ? 2.4 : 1.6;
      const light = lerp(0.12, 1, twi) * (1 - dark * 0.35) + acc.flash * 0.8;
      PU.uColor.value.setRGB(0.78, 0.83, 0.9).multiplyScalar(mode === 1 ? light * 1.15 : light);
      PU.uAlpha.value = mode === 0 ? 0.42 : mode === 1 ? 0.9 : 0.85;
      const nd = Math.round(NDROP * (mode === 1 ? 0.55 : mode === 2 ? 0.45 : 1) * amount * (P.fine > 0.5 ? 0.9 : 1));
      parts[0].geometry.setDrawRange(0, amount > 0.02 ? nd * 6 : 0);
      parts[1].geometry.setDrawRange(0, mode !== 1 && amount > 0.05 ? Math.round(NSPL * amount) * 6 : 0);
      parts[2].geometry.setDrawRange(0, wind > 0.35 && mode !== 1 ? Math.round(NLEAF * clamp01((wind - 0.35) * 1.6)) * 6 : 0);
    }
    SWAY.uWxWind.value.set(wx, clamp01(wind), wz); SWAY.uWxT.value = S.t;

    // ---- windows
    WU.uNightK.value = smooth(0.0, -0.12, el); WU.uCloud.value = cloud; WU.uRain.value = clamp01(P.rain * 1.2 + P.hail * 0.6) * (outdoor ? 0.6 : 1); WU.uSnow.value = P.snow; WU.uFog.value = fogK * 0.75;
    WU.uTime.value = S.t; WU.uFlash.value = acc.flash * 0.8; WU.uOut.value = lerp(1, 0.7, dark) * lerp(1, 0.86, cloud * day);
    WU.uFogCol.value.setRGB(fogCol.r, fogCol.g, fogCol.b); { const cl = mulc(v3(0.66, 0.68, 0.72), (1 - dark * 0.55) * lerp(0.15, 1, twi)); WU.uCloudCol.value.setRGB(cl.r, cl.g, cl.b); }
    { const d2 = mixc(v3(1, 1, 1), v3(1.12, 0.8, 0.62), golden * clearSky); WU.uDusk.value.setRGB(d2.r, d2.g, d2.b); }

    // ---- sound (muffled indoors)
    if (cam) { cam.getWorldPosition(tmpV); const ins = map.inside(tmpV.x, tmpV.y, tmpV.z); acc.inside += (ins - acc.inside) * Math.min(1, dt * 4); }
    try { weatherSound({ rain: clamp01(P.rain * (P.fine > 0.5 ? 0.55 : 1)), heavy: clamp01((P.rain - 0.5) * 2), wind: clamp01(wind), hail: clamp01(P.hail), snow: P.snow, indoor: outdoor ? acc.inside : 1 }); } catch (e) {}

    // ---- in a room: the host tells everyone
    if (net && net.connected && net.host && net.players.size && (S.t - lastSend > 5 || sentKey !== S.type + S.want + S.time || (S.time !== 'cycle' && Math.abs(S.tod - sentTod) > 0.015 && S.t - lastSend > 0.5))) send();      // (and while the clock's moving to a new time)
  }

  // ---------------------------------------------------------------- choosing
  function save() { if (!S.host && net && net.connected) return; try { localStorage.setItem('rs_wx', JSON.stringify({ w: S.want, t: S.time })); } catch (e) {} }
  function setWeather(w, quick = true) { if (w !== 'auto' && !WEATHERS[w]) return; S.want = w; if (w !== 'auto') retarget(w, quick); else { S.autoT = 120 + Math.random() * 120; } save(); send(); drawUI(); }
  function setTime(t) { if (!TIMES[t]) return; S.time = t; if (TIMES[t][2] != null) S.todTo = null; save(); send(); drawUI(); }
  // straight there (tests, and a guest catching up)
  function snap() { const T = WEATHERS[S.type]; for (const k of KEYS) P[k] = T[k] || 0; acc.wet = P.rain > 0.2 || P.hail > 0.3 ? 0.85 : 0; acc.snowLie = P.snow > 0.2 ? 0.8 : 0; if (TIMES[S.time] && TIMES[S.time][2] != null) S.tod = TIMES[S.time][2]; }

  // ---------------------------------------------------------------- multiplayer: the host's weather is everyone's
  let net = null;
  function send(to) { if (!net || !net.connected || !net.host) return; lastSend = S.t; sentKey = S.type + S.want + S.time; sentTod = S.tod; const m = { t: 'wx', w: S.type, a: S.want === 'auto' ? 1 : 0, tm: Math.round(S.tod * 1e4) / 1e4, c: S.time, ds: S.daySecs }; if (to) m.to = to; net.send(m); }
  function onWx(m) {
    if (!m || !net || net.host || (net.hostId && m.f && m.f !== net.hostId)) return;
    const w = typeof m.w === 'string' && WEATHERS[m.w] ? m.w : null; if (w && w !== S.type) retarget(w, !S.heard);
    if (typeof m.c === 'string' && (TIMES[m.c] || m.c === 'fixed')) S.time = m.c;
    S.want = m.a ? 'auto' : (w || S.want);
    if (typeof m.ds === 'number' && isFinite(m.ds)) S.daySecs = Math.min(36000, Math.max(60, m.ds));
    if (typeof m.tm === 'number' && isFinite(m.tm)) { const tm = ((m.tm % 1) + 1) % 1; let d = tm - S.tod; d -= Math.round(d); if (!S.heard || Math.abs(d) > 0.25) S.tod = tm; else if (Math.abs(d) > 0.002) S.todTo = tm; }
    if (!S.heard) { S.heard = true; snap(); }
    drawUI();
  }
  function attachNet(n) {
    net = n; if (!n) return;
    const prev = n.on.wx; n.on.wx = (m, p) => { prev && prev(m, p); try { onWx(m); } catch (e) {} };
    const j0 = n.on.join; n.on.join = (m) => { j0 && j0(m); if (n.host && m && m.id) send(m.id); };
    const h0 = n.on.host; n.on.host = (m, was) => { h0 && h0(m, was); S.host = n.host; if (n.host) send(); drawUI(); };
    S.host = !n.connected || n.host; if (n.connected && n.host) send();
  }

  // ---------------------------------------------------------------- the pause menu: WEATHER & TIME
  let ui = null;
  function buildUI() {
    const pause = document.getElementById('pause'), box0 = pause && pause.querySelector('.box'); if (!pause || !box0 || document.getElementById('pause-wx')) return;
    const st = document.createElement('style'); st.textContent = `
#pause .wxbox { display: none; } #pause.show-wx .wxbox { display: block; } #pause.show-wx .box:not(.wxbox) { display: none; }
#pause .wxbox { background: linear-gradient(165deg, #12205c 0%, #1c2c8c 55%, #2a3f9a 100%); }
#pause .wxbox h4 { margin: 12px 0 6px; font: 900 15px "Arial Black", Arial, sans-serif; color: #ffd400; text-align: left; }
#pause .wx-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
#pause .wx-grid button { margin: 0 !important; padding: 7px 2px 6px !important; font: 900 11px Arial, sans-serif !important; border-radius: 12px !important; background: rgba(255,255,255,0.1); color: #fff; display: flex; flex-direction: column; align-items: center; gap: 2px; border: 2px solid transparent !important; line-height: 1.1; }
#pause .wx-grid button b { font-size: 22px; line-height: 1; }
#pause .wx-grid button.cur { background: rgba(255,212,0,0.22); border-color: #ffd400 !important; box-shadow: 0 0 12px rgba(255,212,0,0.35); }
#pause .wx-grid button:disabled { opacity: 0.45; cursor: default; }
#pause .wx-now { font: 700 13px Arial, sans-serif; color: #c9d3ff; margin: 2px 0 4px; }
#pause .wx-note { font: 700 12px Arial, sans-serif; color: #ffb3d4; margin-top: 8px; }`;
    document.head.appendChild(st);
    const btn = document.createElement('button'); btn.className = 'alt'; btn.id = 'pause-wx'; btn.textContent = '🌦️ WEATHER & TIME';
    const grid = box0.querySelector('.pgrid'); btn.classList.add('tile'); if (grid) grid.insertBefore(btn, document.getElementById('pause-settings')); else box0.appendChild(btn);      // (a tile in the pause menu's grid)
    const box = document.createElement('div'); box.className = 'box wxbox'; box.id = 'pause-wxbox';
    box.innerHTML = `<h2>🌦️ WEATHER</h2><p class="wx-now" id="wx-now"></p><h4>THE WEATHER</h4><div class="wx-grid" id="wx-w"></div><h4>THE TIME</h4><div class="wx-grid" id="wx-t"></div><p class="wx-note" id="wx-note"></p><button class="resume" id="wx-back">⬅ BACK</button>`;
    pause.appendChild(box);
    const wb = box.querySelector('#wx-w'), tb = box.querySelector('#wx-t');
    wb.innerHTML = [['auto', '🎲', 'AUTO'], ...Object.entries(WEATHERS).map(([k, v]) => [k, v.ico, v.name])].map(([k, i, n]) => `<button data-w="${k}"><b>${i}</b>${n}</button>`).join('');
    tb.innerHTML = Object.entries(TIMES).map(([k, v]) => `<button data-t="${k}"><b>${v[0]}</b>${v[1]}</button>`).join('');
    wb.addEventListener('click', (e) => { const b = e.target.closest('button[data-w]'); if (b && !b.disabled) setWeather(b.dataset.w); });
    tb.addEventListener('click', (e) => { const b = e.target.closest('button[data-t]'); if (b && !b.disabled) setTime(b.dataset.t); });
    btn.addEventListener('click', () => { window.__menuOpenAt = performance.now(); drawUI(); pause.classList.add('show-wx'); });
    box.querySelector('#wx-back').addEventListener('click', () => pause.classList.remove('show-wx'));
    new MutationObserver(() => { if (!pause.classList.contains('on') && pause.classList.contains('show-wx')) pause.classList.remove('show-wx'); })      // (only when it's there: removing a class that isn't there still rewrites the attribute, which woke this up again, for ever: the whole page froze when the pause menu closed).observe(pause, { attributes: true, attributeFilter: ['class'] });
    ui = { box, wb, tb, now: box.querySelector('#wx-now'), note: box.querySelector('#wx-note') };
    setInterval(() => { if (pause.classList.contains('show-wx')) drawUI(); }, 1000);
    drawUI();
  }
  function clockText() { const m = Math.floor(S.tod * 1440), hh = Math.floor(m / 60), mm = m % 60; return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); }
  function drawUI() {
    if (!ui) return; const guest = !!(net && net.connected && !net.host);
    for (const b of ui.wb.children) { b.classList.toggle('cur', b.dataset.w === S.want); b.disabled = guest; }
    for (const b of ui.tb.children) { b.classList.toggle('cur', b.dataset.t === S.time); b.disabled = guest; }
    const W = WEATHERS[S.type]; ui.now.textContent = `Now: ${W.ico} ${W.name}${S.want === 'auto' ? ' (auto)' : ''} · 🕐 ${clockText()}${S.time === 'cycle' ? ' (day cycle)' : ''}`;
    ui.note.textContent = guest ? '🔒 The host picks the weather and the time' : (outdoor ? '' : 'You\'re indoors here: see it out of the windows (and hear it)');
  }
  buildUI();

  const api = { WEATHERS, TIMES, update, attachNet, setWeather, setTime, snap, state: S, params: P, acc, map, U, sky: skyMesh, parts,
    set(w, t, opts = {}) { if (w) { S.want = w; if (WEATHERS[w]) S.type = w; } if (t != null) { if (typeof t === 'number') { S.time = 'fixed'; S.tod = ((t % 1) + 1) % 1; } else if (TIMES[t]) S.time = t; } if (opts.snap !== false) snap(); drawUI(); },
    clock: clockText, get type() { return S.type; }, get tod() { return S.tod; } };
  window.__weather = api;
  return api;
}
