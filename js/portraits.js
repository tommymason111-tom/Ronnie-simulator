// Family photos made from the characters' own 3D scans: each photo slot is a canvas texture in the level; once
// the models have loaded, the people are posed side by side, photographed (rendered offscreen, head and
// shoulders), and printed onto the canvas over a painted backdrop with a caption.
import * as THREE from 'three';
import { fetchModel, skinOf } from './ragdoll.js';

async function personMesh(url) {
  const gltf = await fetchModel(url);
  let src = null; gltf.scene.traverse(o => { if (o.isMesh && !src) src = o; });
  src.updateWorldMatrix(true, false);
  const geo = src.geometry.clone(); geo.applyMatrix4(src.matrixWorld);
  const old = src.material, skin = skinOf(gltf, old), mat = new THREE.MeshLambertMaterial({ map: skin.map, color: 0xffffff, emissive: 0x2a2a2a, emissiveMap: skin.map });
  if (old.aoMap) { mat.alphaMap = skin.alphaMap; mat.alphaTest = 0.5; mat.side = THREE.DoubleSide; }
  return new THREE.Mesh(geo, mat);
}

const BACKDROPS = {
  studio: (g, w, h) => { const gr = g.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h / 2, w * 0.8); gr.addColorStop(0, '#9aa8b8'); gr.addColorStop(1, '#3a4656'); g.fillStyle = gr; g.fillRect(0, 0, w, h); },
  beach: (g, w, h) => { const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#5aa8e8'); s.addColorStop(0.55, '#bfe4fa'); s.addColorStop(0.56, '#2a7ab8'); s.addColorStop(0.7, '#3a9ad0'); s.addColorStop(0.71, '#f0d8a0'); s.addColorStop(1, '#e0c080'); g.fillStyle = s; g.fillRect(0, 0, w, h); g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(w * 0.85, h * 0.15, 18, 0, 7); g.fill(); },
  xmas: (g, w, h) => { g.fillStyle = '#5a1a1a'; g.fillRect(0, 0, w, h); g.fillStyle = '#1e5a2a'; g.beginPath(); g.moveTo(w * 0.85, h * 0.1); g.lineTo(w * 1.05, h * 0.8); g.lineTo(w * 0.65, h * 0.8); g.fill(); for (let i = 0; i < 40; i++) { g.fillStyle = ['#ffd400', '#ff5252', '#80d8ff', '#fff'][i % 4]; g.beginPath(); g.arc(Math.random() * w, Math.random() * h * 0.6, 2.5, 0, 7); g.fill(); } },
  gym: (g, w, h) => { g.fillStyle = '#2a2a2e'; g.fillRect(0, 0, w, h); g.fillStyle = '#444'; for (let x = 0; x < w; x += 40) g.fillRect(x, 0, 3, h); g.fillStyle = '#c62828'; g.fillRect(0, h * 0.12, w, 10); g.fillStyle = '#111'; for (const x of [w * 0.12, w * 0.88]) { g.beginPath(); g.arc(x, h * 0.55, 26, 0, 7); g.fill(); } },
  lake: (g, w, h) => { const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#a8c8e0'); s.addColorStop(0.45, '#e0eef6'); s.addColorStop(0.46, '#4a6a3a'); s.addColorStop(0.55, '#3a6a8a'); s.addColorStop(1, '#2a5a7a'); g.fillStyle = s; g.fillRect(0, 0, w, h); g.fillStyle = '#2e4a2a'; for (let x = 0; x < w; x += 14) { g.beginPath(); g.moveTo(x, h * 0.46); g.lineTo(x + 7, h * 0.3 - (x % 3) * 6); g.lineTo(x + 14, h * 0.46); g.fill(); } },
};
// draw a placeholder straight away (so the frame never looks empty) and return a slot
export function photoSlot(w, h, { who, bg = 'studio', caption = '' }) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  (BACKDROPS[bg] || BACKDROPS.studio)(g, w, h); g.fillStyle = '#f4f2ec'; g.fillRect(0, h - 26, w, 26);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return { canvas: c, tex, who, bg, caption };
}

export async function paintPhotos(renderer, slots) {
  const people = {};
  for (const s of slots) for (const u of s.who) if (!people[u]) people[u] = personMesh(u).catch(() => null);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a6a, 2.2)); const key = new THREE.DirectionalLight(0xfff4e8, 1.6); key.position.set(-1, 2, 3); scene.add(key);
  for (const s of slots) {
    const meshes = (await Promise.all(s.who.map(u => people[u]))).filter(Boolean);
    if (!meshes.length) continue;
    const { canvas: c } = s, W = c.width, Hh = c.height, g = c.getContext('2d');
    // stand them side by side, shoulder to shoulder, heads lined up roughly
    const grp = new THREE.Group(); let x = 0, top = 0, minTop = Infinity;
    const placed = meshes.map(m => { const mm = m.clone(); mm.material = m.material.clone(); m.geometry.computeBoundingBox(); const b0 = m.geometry.boundingBox, sc = 1.8 / (b0.max.y - b0.min.y); mm.scale.setScalar(sc); const bb = b0.clone(); bb.min.multiplyScalar(sc); bb.max.multiplyScalar(sc); return { mm, bb, wd: 0.5 }; });   // (scaled to a person's height)
    const totalW = placed.reduce((a, p) => a + p.wd, 0);
    // (each person's arms are trimmed off at the shoulders by two clipping planes)
    for (const p of placed) { p.mm.position.set(x - totalW / 2 + p.wd / 2 - (p.bb.min.x + p.bb.max.x) / 2, -p.bb.min.y, -(p.bb.min.z + p.bb.max.z) / 2); const cx = x - totalW / 2 + p.wd / 2; p.mm.material.clippingPlanes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), cx + 0.235), new THREE.Plane(new THREE.Vector3(1, 0, 0), -(cx - 0.235))]; x += p.wd; grp.add(p.mm); top = Math.max(top, p.bb.max.y - p.bb.min.y); minTop = Math.min(minTop, p.bb.max.y - p.bb.min.y); }
    scene.add(grp);
    // head and shoulders: from a bit above the tallest head down to mid chest
    const yTop = top + 0.05, yBot = minTop * 0.64, cam = new THREE.OrthographicCamera(), aspect = W / (Hh - 26);
    const fh = yTop - yBot, fw = Math.max(fh * aspect, totalW * 1.05);
    const fhh = fw / aspect; cam.left = -fw / 2; cam.right = fw / 2; cam.top = fhh / 2; cam.bottom = -fhh / 2; cam.near = 0.01; cam.far = 20;
    cam.position.set(0, yTop - fhh / 2, 5); cam.lookAt(0, yTop - fhh / 2, 0); cam.updateProjectionMatrix();
    const rt = new THREE.WebGLRenderTarget(W, Hh - 26); rt.texture.colorSpace = THREE.SRGBColorSpace;
    const prevRT = renderer.getRenderTarget(), prevXR = renderer.xr.enabled, prevC = new THREE.Color(), prevA = renderer.getClearAlpha(); renderer.getClearColor(prevC);
    const prevClip = renderer.localClippingEnabled; renderer.localClippingEnabled = true; renderer.xr.enabled = false; renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, cam);
    const px = new Uint8Array(W * (Hh - 26) * 4); renderer.readRenderTargetPixels(rt, 0, 0, W, Hh - 26, px);
    renderer.setRenderTarget(prevRT); renderer.setClearColor(prevC, prevA); renderer.xr.enabled = prevXR; renderer.localClippingEnabled = prevClip; rt.dispose(); scene.remove(grp);
    const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = Hh - 26; const tg = tmp.getContext('2d'), img = tg.createImageData(W, Hh - 26);
    for (let y = 0; y < Hh - 26; y++) img.data.set(px.subarray((Hh - 27 - y) * W * 4, (Hh - 26 - y) * W * 4), y * W * 4);   // (flip it the right way up)
    tg.putImageData(img, 0, 0);
    (BACKDROPS[s.bg] || BACKDROPS.studio)(g, W, Hh); g.drawImage(tmp, 0, 0);
    g.fillStyle = 'rgba(255,230,190,0.08)'; g.fillRect(0, 0, W, Hh - 26);                           // a warm old-photo tint
    g.fillStyle = '#f4f2ec'; g.fillRect(0, Hh - 26, W, 26); g.fillStyle = '#3a3a3a'; g.font = 'italic 15px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s.caption, W / 2, Hh - 13, W - 10);
    s.tex.needsUpdate = true;
  }
}
