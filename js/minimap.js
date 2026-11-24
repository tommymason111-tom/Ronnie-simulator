// THE MAP: a plan of the level from straight above, worked out from the level itself (no hand-drawn plans to keep up
// to date): made once while the level loads, before anyone's in it.
//   - The level is looked at once from above with the roofs and ceilings cut away (anything higher than head height
//     isn't drawn), each surface in its own colour (its material's colour, its texture's average colour, its vertex
//     colours), with its height kept as well. Floors, rugs, tables, chairs, the bar, cars, the stream all show.
//   - Walls are drawn from the level's collision boxes (they're thin from above, so the picture alone would lose them).
//   - Light from the top left: higher things cast a little shade and get an outline, so it reads like a plan.
// Modes put their own marks on it (you, your team, the bomb sites...) and show it two ways: a small map that turns with
// you (under the top-left box: tap it for the big one) and the big map, north up, with a CLOSE button.
import * as THREE from 'three';

const CUT = 2.25;      // (how far above the floor the level's cut off: under the ceilings, over the furniture)

function texAvg(t, cache) {
  if (cache.has(t)) return cache.get(t); let c = null;
  try { const im = t.image; if (im && (im.width || im.videoWidth) && !(im.data)) { const cv = document.createElement('canvas'); cv.width = cv.height = 4; const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, 4, 4); const d = g.getImageData(0, 0, 4, 4).data; let r = 0, gg = 0, b = 0, a = 0;
    for (let i = 0; i < d.length; i += 4) { const w = d[i + 3] / 255; r += d[i] * w; gg += d[i + 1] * w; b += d[i + 2] * w; a += w; } if (a > 0.5) c = new THREE.Color(r / a / 255, gg / a / 255, b / a / 255).convertSRGBToLinear(); } } catch (e) { c = null; }
  cache.set(t, c); return c;
}

// the plan: { cv (a canvas, north up: x across, z down), x0, z0, w, d (metres), ppm (pixels a metre) }
export function buildPlan(renderer, scene, room, opts = {}) {
  const B = room.bounds || { x0: -10, x1: 10, z0: -10, z1: 10 }, pad = opts.pad ?? 2;
  const x0 = B.x0 - pad, x1 = B.x1 + pad, z0 = B.z0 - pad, z1 = B.z1 + pad, W = x1 - x0, D = z1 - z0;
  const ppm = Math.min(28, 1024 / Math.max(W, D)), RW = Math.max(16, Math.round(W * ppm)), RH = Math.max(16, Math.round(D * ppm));
  const base = room.floorAt ? (room.floorAt(room.start ? room.start.x : 0, room.start ? room.start.z : 0) || 0) : 0, cut = base + (opts.cut ?? CUT);
  const mat = new THREE.ShaderMaterial({ side: THREE.DoubleSide, vertexColors: true,
    uniforms: { uCol: { value: new THREE.Color(1, 1, 1) }, uVC: { value: 0 }, uCut: { value: cut } },
    vertexShader: `uniform vec3 uCol; uniform float uVC; varying float vY; varying vec3 vC; void main() { vec4 p = vec4(position, 1.0);
      #ifdef USE_INSTANCING
        p = instanceMatrix * p;
      #endif
      p = modelMatrix * p; vY = p.y; vC = uCol;
      #ifdef USE_COLOR
        vC *= mix(vec3(1.0), color.rgb, uVC);
      #endif
      #ifdef USE_INSTANCING_COLOR
        vC *= instanceColor;
      #endif
      gl_Position = projectionMatrix * viewMatrix * p; }`,
    fragmentShader: `uniform float uCut; varying float vY; varying vec3 vC; void main() { if (vY > uCut) discard; gl_FragColor = vec4(vC, clamp((vY + 1.0) / 4.0, 0.0, 1.0)); }` });
  const cam = new THREE.OrthographicCamera(-W / 2, W / 2, D / 2, -D / 2, 0.5, 200);
  cam.position.set((x0 + x1) / 2, 80, (z0 + z1) / 2); cam.rotation.set(-Math.PI / 2, 0, 0); cam.updateMatrixWorld(true);
  const hidden = [], hooked = [], cache = new Map(), col = new THREE.Color();
  // each thing in its own colour: set just before it's drawn
  const colOf = (m) => { col.setRGB(1, 1, 1); if (!m) return col; if (m.color) col.copy(m.color); const t = m.map && texAvg(m.map, cache); if (t) col.multiply(t); if (m.emissive && m.emissiveIntensity > 0.5 && !m.map) col.add(m.emissive); return col; };
  const before = function (r, sc, c2, geo, m2, group) { const ms = this.material, m = Array.isArray(ms) ? ms[(group && group.materialIndex) || 0] : ms; mat.uniforms.uCol.value.copy(colOf(m)); mat.uniforms.uVC.value = geo && geo.attributes.color && m && m.vertexColors ? 1 : 0; mat.uniformsNeedUpdate = true; };
  scene.traverse(o => { if (!o.visible) return; const ms = o.material ? [].concat(o.material) : [];
    let skip = o.isSprite || o.isPoints || o.isLine || !!o.userData.foliage || (o.renderOrder && Math.abs(o.renderOrder) >= 90);
    if (!skip && o.isMesh) for (const m of ms) if (!m || m.isShaderMaterial || m.blending === THREE.AdditiveBlending || (m.transparent && m.opacity < 0.4) || m.colorWrite === false) skip = true;
    if (skip && (o.isMesh || o.isSprite || o.isPoints || o.isLine)) { o.visible = false; hidden.push(o); return; }
    if (o.isMesh) { hooked.push([o, o.onBeforeRender]); o.onBeforeRender = before; } });
  const rt = new THREE.WebGLRenderTarget(RW, RH), buf = new Uint8Array(RW * RH * 4);
  const was = { bg: scene.background, fog: scene.fog, ov: scene.overrideMaterial, obr: scene.onBeforeRender, rt: renderer.getRenderTarget(), cc: renderer.getClearColor(new THREE.Color()), ca: renderer.getClearAlpha(), sh: renderer.shadowMap.autoUpdate, xr: renderer.xr.enabled };
  let ok = false;
  try { scene.background = null; scene.fog = null; scene.overrideMaterial = mat; scene.onBeforeRender = () => {}; renderer.shadowMap.autoUpdate = false; renderer.xr.enabled = false;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, cam); renderer.readRenderTargetPixels(rt, 0, 0, RW, RH, buf); ok = true;
  } catch (e) { console.warn('map', e); }
  finally { scene.background = was.bg; scene.fog = was.fog; scene.overrideMaterial = was.ov; scene.onBeforeRender = was.obr; renderer.setRenderTarget(was.rt); renderer.setClearColor(was.cc, was.ca); renderer.shadowMap.autoUpdate = was.sh; renderer.xr.enabled = was.xr;
    for (const o of hidden) o.visible = true; for (const [o, f] of hooked) o.onBeforeRender = f; rt.dispose(); mat.dispose(); }
  if (!ok) return null;
  // the picture: north up (the render's rows are bottom first), linear colours to the screen's, shade and outlines
  const cv = document.createElement('canvas'); cv.width = RW; cv.height = RH; const g = cv.getContext('2d'), img = g.createImageData(RW, RH), o = img.data;
  const H = new Float32Array(RW * RH), S = (v) => Math.round(255 * Math.pow(Math.min(1, v / 255), 1 / 2.2));
  for (let j = 0; j < RH; j++) for (let i = 0; i < RW; i++) { const p = ((RH - 1 - j) * RW + i) * 4; H[j * RW + i] = buf[p + 3] ? buf[p + 3] / 255 * 4 - 1 : -9; }
  for (let j = 0; j < RH; j++) for (let i = 0; i < RW; i++) {
    const p = ((RH - 1 - j) * RW + i) * 4, q = (j * RW + i) * 4, h = H[j * RW + i];
    if (h < -5) { o[q] = 34; o[q + 1] = 44; o[q + 2] = 40; o[q + 3] = 255; continue; }      // (nothing there: off the edge)
    const hl = i > 1 && j > 1 ? H[(j - 2) * RW + i - 2] : h, hn = Math.max(...[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([a, b]) => { const ii = i + a, jj = j + b; return ii >= 0 && jj >= 0 && ii < RW && jj < RH ? Math.abs(H[jj * RW + ii] - h) : 0; }));
    let k = 1 + Math.max(-0.35, Math.min(0.2, (h - hl) * 0.9)); if (hl - h > 0.15) k *= 0.72; if (hn > 0.22) k *= 0.62;      // (lit from the top left, a shadow below anything taller, an outline round the edges)
    k *= 0.9 + Math.min(0.25, Math.max(0, h - base) * 0.12);      // (the higher, the lighter)
    o[q] = Math.min(255, S(buf[p]) * k); o[q + 1] = Math.min(255, S(buf[p + 1]) * k); o[q + 2] = Math.min(255, S(buf[p + 2]) * k); o[q + 3] = 255; }
  g.putImageData(img, 0, 0);
  // the walls: the level's tall collision boxes, dark with a light edge
  const P = (x, z) => [(x - x0) * ppm, (z - z0) * ppm];
  g.lineJoin = 'miter';
  for (const b of room.colliders || []) { if (!b || !b.min) continue; const tall = b.max.y - base > 1.6 && b.min.y - base < 1.2; if (!tall) continue;
    const [u0, v0] = P(b.min.x, b.min.z), [u1, v1] = P(b.max.x, b.max.z), w = Math.max(2.2, u1 - u0), hh = Math.max(2.2, v1 - v0), cu = (u0 + u1) / 2, cvv = (v0 + v1) / 2;
    if (w * hh > 0.4 * RW * RH) continue;      // (a box round the whole level: not a wall)
    g.fillStyle = '#1c1714'; g.fillRect(cu - w / 2, cvv - hh / 2, w, hh); }
  return { cv, x0, z0, w: W, d: D, ppm, base };
}

// ---------------------------------------------------------------- the small map and the big one
const CSS = `
#mm-mini { position: fixed; left: 10px; top: 120px; width: 112px; height: 112px; z-index: 30; border-radius: 16px; border: 3px solid #ffd400; background: #222c28; box-shadow: 0 3px 10px rgba(0,0,0,0.5); overflow: hidden; display: none; pointer-events: auto; cursor: pointer; touch-action: none; padding: 0; }
#mm-mini.on { display: block; } #mm-mini canvas { width: 100%; height: 100%; display: block; } #mm-mini b { position: absolute; right: 3px; bottom: 2px; font: 900 10px "Arial Black", Arial, sans-serif; color: #fff; text-shadow: 0 1px 2px #000; pointer-events: none; }
#mm-full { position: fixed; inset: 0; z-index: 72; display: none; align-items: center; justify-content: center; flex-direction: column; gap: 6px; background: rgba(6,8,14,0.72); padding: max(10px, env(safe-area-inset-top)) 8px max(10px, env(safe-area-inset-bottom)); box-sizing: border-box; pointer-events: auto; }
#mm-full.on { display: flex; } #mm-full .wrap { position: relative; max-width: 100%; display: flex; flex: 0 1 auto; min-height: 0; }
#mm-full canvas { display: block; max-width: calc(100vw - 16px); max-height: calc(100vh - 150px); max-height: calc(100dvh - 150px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); width: auto; height: auto; border-radius: 14px; border: 4px solid #ffd400; box-shadow: 0 10px 40px rgba(0,0,0,0.7); }
#mm-full .x { position: absolute; top: 6px; right: 6px; font: 900 15px system-ui, sans-serif; color: #111; background: #ffd400; border: 3px solid #111; border-radius: 12px; padding: 6px 12px; box-shadow: 0 3px 0 #111; cursor: pointer; }
#mm-full .ttl { font: 900 17px "Arial Black", Arial, sans-serif; color: #ffd400; text-shadow: 0 2px 3px #000; text-align: center; max-width: calc(100vw - 20px); }
#mm-full .key { font: 900 11px "Arial Black", Arial, sans-serif; color: #fff; text-align: center; max-width: calc(100vw - 20px); box-sizing: border-box; padding: 6px 10px; border-radius: 12px; background: #121620; border: 3px solid #ffd400; }
#mm-full .ttl { padding: 5px 12px; border-radius: 12px; background: #121620; border: 3px solid #ffd400; box-sizing: border-box; }
@media (min-width: 760px) and (min-height: 500px) { #mm-mini { width: 150px; height: 150px; } }
`;

// marks: [{ x, z, k: 'me' | 'mate' | 'foe' | 'site' | 'bomb' | 'spawn', col, t (a label), yaw }]
export class MapView {
  constructor(plan, { marks, title = '🗺️ MAP', key = '', range = 16 } = {}) {
    this.plan = plan; this.marksFn = marks || (() => []); this.title = title; this.keyText = key; this.range = range; this.t = 0;
    if (!document.getElementById('mm-css')) { const st = document.createElement('style'); st.id = 'mm-css'; st.textContent = CSS; document.head.appendChild(st); }
    const mini = this.mini = document.createElement('button'); mini.id = 'mm-mini'; mini.type = 'button'; mini.setAttribute('aria-label', 'Map'); mini.innerHTML = '<canvas width="224" height="224"></canvas><b>🗺️ MAP</b>'; document.body.appendChild(mini);
    this.miniCv = mini.querySelector('canvas'); mini.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(true); }); mini.addEventListener('pointerdown', (e) => e.stopPropagation());
    const full = this.full = document.createElement('div'); full.id = 'mm-full'; full.innerHTML = `<div class="ttl"></div><div class="wrap"><canvas></canvas><button class="x" type="button">✕ CLOSE</button></div><div class="key"></div>`; document.body.appendChild(full);
    this.fullCv = full.querySelector('canvas'); full.querySelector('.x').addEventListener('click', (e) => { e.stopPropagation(); this.toggle(false); }); full.addEventListener('pointerdown', (e) => e.stopPropagation());
    full.addEventListener('click', (e) => { if (e.target === full) this.toggle(false); });
    this.onKey = (e) => { if (e.code === 'KeyM' && !e.repeat && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) && this.allowed) { this.toggle(); e.stopPropagation(); } }; addEventListener('keydown', this.onKey, true);
    this.allowed = false;
  }
  get open() { return this.full.classList.contains('on'); }
  toggle(on) { const want = on === undefined ? !this.open : !!on; if (want && !this.allowed) return; this.full.classList.toggle('on', want); if (want) { this.drawFull(); } }
  // show: the small map wanted now (the mode says: in play, not in a menu); yaw: which way you face
  update(show, P, yaw) {
    this.allowed = !!show; this.mini.classList.toggle('on', !!show); if (!show) { if (this.open) this.toggle(false); return; }
    const now = performance.now(); if (now - (this.last || 0) < 90) return; this.last = now; const marks = this.marksFn() || []; this.drawMini(P, yaw, marks); if (this.open) this.drawFull(marks);
  }
  drawMini(P, yaw, marks) {
    const c = this.miniCv, g = c.getContext('2d'), N = c.width, pl = this.plan, R = this.range, k = N / (2 * R);
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#222c28'; g.fillRect(0, 0, N, N);
    // you in the middle facing up: the plan turned round you
    g.save(); g.translate(N / 2, N / 2 + N * 0.12); g.rotate(yaw); g.scale(k / pl.ppm, k / pl.ppm); g.drawImage(pl.cv, -(P.x - pl.x0) * pl.ppm, -(P.z - pl.z0) * pl.ppm); g.restore();
    const to = (x, z) => { const dx = (x - P.x) * k, dz = (z - P.z) * k, c2 = Math.cos(yaw), s2 = Math.sin(yaw); return [N / 2 + dx * c2 - dz * s2, N / 2 + N * 0.12 + dx * s2 + dz * c2]; };
    const took = [];
    for (const m of marks) { if (m.k === 'me') continue; let [u, v] = to(m.x, m.z); const edge = m.k === 'site' || m.k === 'bomb'; const inR = u > 8 && u < N - 8 && v > 8 && v < N - 8;
      if (!inR) { if (!edge) continue; u = Math.max(20, Math.min(N - 20, u)); v = Math.max(20, Math.min(N - 20, v)); for (let k = 0; k < 4 && took.some(([a, b]) => Math.abs(a - u) < 36 && Math.abs(b - v) < 36); k++) { if (u <= 20 || u >= N - 20) v += v + 40 > N - 20 ? -40 : 40; else u += u + 40 > N - 20 ? -40 : 40; } took.push([u, v]); }
      this.mark(g, m, u, v, 2.2, 0); }
    const me = marks.find(m => m.k === 'me'); this.mark(g, me || { k: 'me', col: '#39ff14' }, N / 2, N / 2 + N * 0.12, 2.2, 0, 0);
  }
  drawFull(marks) {
    marks = marks || this.marksFn() || []; const pl = this.plan, c = this.fullCv, S = 1, TOP = 0, W = pl.cv.width, H = pl.cv.height + TOP;
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const g = c.getContext('2d'); g.setTransform(S, 0, 0, S, 0, 0); g.fillStyle = '#121620'; g.fillRect(0, 0, W, H); g.drawImage(pl.cv, 0, TOP);
    const sz = Math.max(1.6, W / 380); this.labels = [];
    const order = ['spawn', 'site', 'bomb', 'foe', 'mate', 'me'], list = [...marks].sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k)), at = (m) => [(m.x - pl.x0) * pl.ppm, (m.z - pl.z0) * pl.ppm + TOP];
    this.lbl = new Set(); for (const m of [...list].reverse()) { if (!m.t || m.k === 'site' || m.k === 'bomb') continue; const [u, v] = at(m); if (this.free(g, m.t, u, v + 8 * sz, 8 * sz)) this.lbl.add(m); }      // (labels: you first, then your team, then the rest, where there's room)
    for (const m of list) { const [u, v] = at(m); this.mark(g, m, u, v, sz, 0, m.yaw, true); }
    const tt = this.full.querySelector('.ttl'); if (tt.textContent !== this.title) tt.textContent = this.title;
    const kt = this.full.querySelector('.key'); if (kt.textContent !== this.keyText) kt.textContent = this.keyText;
  }
  // one mark: you (an arrow), a team-mate (a dot in their colour), a site (a lettered square), the bomb, a spawn
  mark(g, m, u, v, sz, rot = 0, yaw, big) {
    g.save(); g.translate(u, v); g.lineJoin = 'round';
    const col = m.col || '#fff';
    if (m.k === 'me' || ((m.k === 'mate' || m.k === 'foe') && yaw !== undefined && big)) { if (yaw !== undefined) g.rotate(-yaw); const r = (m.k === 'me' ? 7 : 5.5) * sz; g.beginPath(); g.moveTo(0, -r * 1.2); g.lineTo(r * 0.85, r * 0.8); g.lineTo(0, r * 0.35); g.lineTo(-r * 0.85, r * 0.8); g.closePath(); g.fillStyle = col; g.fill(); g.lineWidth = 2 * sz / 1.6; g.strokeStyle = '#000'; g.stroke(); }
    else if (m.k === 'mate' || m.k === 'foe') { g.beginPath(); g.arc(0, 0, 4.5 * sz, 0, 7); g.fillStyle = col; g.fill(); g.lineWidth = 1.6 * sz / 1.6; g.strokeStyle = '#000'; g.stroke(); }
    else if (m.k === 'site') { g.rotate(rot); const r = 8 * sz; if (big && m.r) { g.beginPath(); g.arc(0, 0, m.r * this.plan.ppm, 0, 7); g.fillStyle = 'rgba(255,212,0,0.22)'; g.fill(); g.setLineDash([6, 4]); g.lineWidth = 2.5; g.strokeStyle = '#ffd400'; g.stroke(); g.setLineDash([]); }
      g.fillStyle = 'rgba(10,12,22,0.88)'; g.fillRect(-r, -r, 2 * r, 2 * r); g.lineWidth = 2 * sz / 1.6; g.strokeStyle = col; g.strokeRect(-r, -r, 2 * r, 2 * r); g.fillStyle = col; g.font = `900 ${Math.round(11 * sz)}px "Arial Black", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(m.t || '?', 0, 1); }
    else if (m.k === 'bomb') { g.rotate(rot); g.font = `${Math.round(11 * sz)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.beginPath(); g.arc(0, 0, 8 * sz, 0, 7); g.fillStyle = 'rgba(200,20,20,0.9)'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke(); g.fillText('💣', 0, 1); }
    else if (m.k === 'spawn') { g.rotate(rot); const r = 7 * sz; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fill(); g.lineWidth = 2; g.strokeStyle = col; g.setLineDash([3, 3]); g.stroke(); g.setLineDash([]); }
    if (big && m.t && m.k !== 'site' && m.k !== 'bomb' && this.lbl && this.lbl.has(m)) { g.rotate(yaw !== undefined && (m.k === 'me' || m.k === 'mate' || m.k === 'foe') ? yaw : 0); g.font = `900 ${Math.round(8 * sz)}px "Arial Black", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'top'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(m.t, 0, 8 * sz); g.fillStyle = '#fff'; g.fillText(m.t, 0, 8 * sz); }
    g.restore();
  }
  // (a label only where no other label is: the first in (you, then your team...) gets the spot)
  free(g, t, u, v, f) { g.font = `900 ${Math.round(f)}px "Arial Black", Arial, sans-serif`; const w = g.measureText(t).width, b = [u - w / 2, v, u + w / 2, v + f];
    if ((this.labels || []).some(o => o[0] < b[2] && o[2] > b[0] && o[1] < b[3] && o[3] > b[1])) return false; (this.labels || (this.labels = [])).push(b); return true; }
  dispose() { removeEventListener('keydown', this.onKey, true); this.mini.remove(); this.full.remove(); }
}
