// Drawing less often for the same picture (phones and headsets choke on draw calls long before triangles).
// Nothing here changes how anything looks.
//
// FEWER MATERIAL SWITCHES: a shape painted with several materials is drawn once per painted part ("group"). A product
// box with its front picture on one face and the plain side picture on the other five was SIX draws per batch of boxes,
// though five of them used the very same material. Here every shape in the level is rearranged so all the faces that
// share a material sit together: that box becomes two draws. The triangles themselves don't change at all.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const regrouped = new Map();      // geometry uuid + which material each part uses -> the rearranged copy (shared)
export function mergeMaterialGroups(root) {
  let saved = 0;
  root.traverse(o => {
    if (!(o.isMesh || o.isInstancedMesh) || o.isSkinnedMesh || !Array.isArray(o.material)) return;
    const g = o.geometry; if (!g || !g.groups || g.groups.length < 2 || (g.morphAttributes && Object.keys(g.morphAttributes).length)) return;
    const mats = o.material, uniq = [], slot = new Map();
    for (const gr of g.groups) { const m = mats[gr.materialIndex]; if (!m) return; if (!slot.has(m)) { slot.set(m, uniq.length); uniq.push(m); } }
    if (uniq.length >= g.groups.length) return;      // (every part has its own material already)
    const key = g.uuid + ':' + g.groups.map(gr => slot.get(mats[gr.materialIndex])).join(',');
    let ng = regrouped.get(key);
    if (!ng) {
      const idx = g.index ? g.index.array : null; if (!idx && !g.attributes.position) return;
      const src = idx || null, out = [];
      const groups = []; let start = 0;
      for (let s = 0; s < uniq.length; s++) {
        const from = out.length;
        for (const gr of g.groups) { if (slot.get(mats[gr.materialIndex]) !== s) continue;
          const end = Math.min(gr.start + gr.count, src ? src.length : g.attributes.position.count);
          for (let i = gr.start; i < end; i++) out.push(src ? src[i] : i); }
        groups.push({ start: from, count: out.length - from, materialIndex: s }); start = out.length;
      }
      ng = new THREE.BufferGeometry();
      for (const [k, a] of Object.entries(g.attributes)) ng.setAttribute(k, a);      // (the same vertex data, shared: only the order they're drawn in changes)
      const vcount = g.attributes.position.count;
      ng.setIndex(new (vcount > 65535 ? THREE.Uint32BufferAttribute : THREE.Uint16BufferAttribute)(out, 1));
      for (const gr of groups) ng.addGroup(gr.start, gr.count, gr.materialIndex);
      if (g.boundingSphere) ng.boundingSphere = g.boundingSphere.clone(); else ng.computeBoundingSphere();
      if (g.boundingBox) ng.boundingBox = g.boundingBox.clone();
      ng.userData = g.userData; ng.name = g.name;
      regrouped.set(key, ng);
    }
    saved += (g.groups.length - uniq.length) * (o.isInstancedMesh ? 1 : 1);
    o.geometry = ng; o.material = uniq;
  });
  return saved;
}

// MANY SPRITES, ONE DRAW: a layer of camera-facing squares sharing one picture, each with its own place, size and tint,
// drawn together (a separate sprite each was a separate draw: e.g. the glow on every bit of food in Lidl). Looks the
// same as sprites: the same picture, tint, see-through-ness, blending and haze. Fill it each frame with begin/push/end.
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _c = new THREE.Color();
export function billboardMaterial(opts) {
  const m = new THREE.MeshBasicMaterial(opts);
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mvPosition.xy += position.xy * length(instanceMatrix[0].xyz);
    gl_Position = projectionMatrix * mvPosition;`); };
  m.customProgramCacheKey = () => 'billboard';
  return m;
}
export class SpriteLayer {
  constructor(scene, { max = 1024, renderOrder = 0, ...mat } = {}) {
    this.scene = scene; this.max = max;
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), billboardMaterial({ transparent: true, depthWrite: false, ...mat }), max);
    const im = this.mesh; im.count = 0; im.frustumCulled = false; im.renderOrder = renderOrder; im.raycast = () => {};
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.setColorAt(0, _c.set(0xffffff)); im.instanceColor.setUsage(THREE.DynamicDrawUsage);
    scene.add(im); this.n = 0;
  }
  begin() { this.n = 0; if (!this.mesh.parent) this.scene.add(this.mesh); }
  push(pos, size, color = 0xffffff) { if (this.n >= this.max) return; _m.compose(_p.copy(pos), _q, _s.setScalar(size)); this.mesh.setMatrixAt(this.n, _m); this.mesh.setColorAt(this.n, _c.set(color)); this.n++; }
  end() { const im = this.mesh; im.count = this.n; if (this.n) { im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; } }
  clear() { this.n = 0; this.end(); }
  dispose() { this.mesh.removeFromParent(); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}

// SIGNS ON ONE SHEET: the level's flat signs, posters and labels (each its own picture: ~170 draws in the pub) are packed
// onto a few big picture sheets, at their full size (not a pixel smaller), and the signs in each part of the map become
// one shape. Signs that get drawn on again later (a fruit machine's screen) are marked userData.live and left alone, and
// if one is drawn on anyway it simply comes back out as its own sign again (unpackSign), so nothing can go stale.
const isCanvas = (im) => (typeof HTMLCanvasElement !== 'undefined' && im instanceof HTMLCanvasElement) || (typeof OffscreenCanvas !== 'undefined' && im instanceof OffscreenCanvas);
const OTHER_MAPS = ['normalMap', 'emissiveMap', 'alphaMap', 'aoMap', 'bumpMap', 'lightMap', 'specularMap', 'envMap'];
const matKey = (m) => [m.type, m.transparent, m.opacity, m.side, m.depthWrite, m.depthTest, m.alphaTest, m.color && m.color.getHex(), m.emissive && m.emissive.getHex(), m.polygonOffset, m.polygonOffsetFactor, m.polygonOffsetUnits, m.toneMapped, m.fog, m.blending, m.map.colorSpace].join('|');
export function atlasSigns(scene, { page = 2048, pad = 8, cell = 24 } = {}) {
  const cands = scene.children.filter(o => {
    if (!o.isMesh || o.isInstancedMesh || !o.userData.sign || o.userData.live || o.userData.sign === 'photo' || !o.visible || o.children.length) return false;
    const m = o.material, t = m && m.map, g = o.geometry;
    if (Array.isArray(m) || !t || !t.image || !isCanvas(t.image) || !g.attributes.uv || g.attributes.position.count > 64 || g.groups.length > 1) return false;
    if (!(m.isMeshLambertMaterial || m.isMeshBasicMaterial) || m.vertexColors || OTHER_MAPS.some(k => m[k])) return false;
    if (t.repeat.x !== 1 || t.repeat.y !== 1 || t.offset.x || t.offset.y || t.rotation || t.flipY !== true) return false;
    const w = t.image.width, h = t.image.height; if (!w || !h || w + pad * 2 > page || h + pad * 2 > page) return false;
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); if (u < -1e-4 || u > 1.0001 || v < -1e-4 || v > 1.0001) return false; }
    return true;
  });
  const groups = new Map(); for (const o of cands) { const k = matKey(o.material); (groups.get(k) || groups.set(k, []).get(k)).push(o); }
  // every picture's users in the whole level (a picture shared with something that isn't packed must be kept as it is)
  const users = new Map(); scene.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) for (const k of ['map', ...OTHER_MAPS]) { const t = m[k]; if (t && t.isTexture) users.set(t, (users.get(t) || 0) + 1); } });
  let packed = 0, pages = 0, draws = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    // pack the pictures, tallest first, in rows across sheets
    const pics = [...new Set(list.map(o => o.material.map))].sort((a, b) => b.image.height - a.image.height);
    const sheets = []; let sh = null;
    const newSheet = () => { sh = { x: pad, y: pad, rowH: 0, items: [] }; sheets.push(sh); };
    newSheet(); const where = new Map();
    for (const t of pics) { const w = t.image.width, h = t.image.height;
      if (sh.x + w + pad > page) { sh.x = pad; sh.y += sh.rowH + pad * 2; sh.rowH = 0; }
      if (sh.y + h + pad > page) newSheet();
      where.set(t, { sheet: sh, x: sh.x, y: sh.y, w, h }); sh.items.push(t); sh.x += w + pad * 2; sh.rowH = Math.max(sh.rowH, h); }
    for (const s of sheets) {
      const H = Math.min(page, s.y + s.rowH + pad), cv = document.createElement('canvas'); cv.width = page; cv.height = H; const g = cv.getContext('2d');
      for (const t of s.items) { const r = where.get(t);
        g.drawImage(t.image, r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2);      // (the picture stretched a little underneath: its edges carry on into the gap, so nothing bleeds in from next door)
        g.drawImage(t.image, r.x, r.y, r.w, r.h); }
      const tex = new THREE.CanvasTexture(cv); const t0 = s.items[0];
      tex.colorSpace = t0.colorSpace; tex.anisotropy = Math.max(...s.items.map(t => t.anisotropy || 1)); tex.magFilter = t0.magFilter; tex.minFilter = t0.minFilter; tex.generateMipmaps = t0.generateMipmaps;
      s.tex = tex; s.H = H; pages++;
    }
    // each sheet's signs, part of the map by part of the map, as one shape
    const byCell = new Map();
    for (const o of list) { const r = where.get(o.material.map); o.updateWorldMatrix(true, false); const p = o.getWorldPosition(new THREE.Vector3());
      const k = sheets.indexOf(r.sheet) + ':' + Math.floor(p.x / cell) + ',' + Math.floor(p.z / cell); (byCell.get(k) || byCell.set(k, []).get(k)).push(o); }
    for (const members of byCell.values()) {
      const r0 = where.get(members[0].material.map), sheet = r0.sheet, parts = [];
      for (const o of members) { const r = where.get(o.material.map), g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
        if (!g.attributes.normal) g.computeVertexNormals();
        g.applyMatrix4(o.matrixWorld); const uv = g.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, (r.x + uv.getX(i) * r.w) / page, 1 - (r.y + (1 - uv.getY(i)) * r.h) / sheet.H);
        g.clearGroups(); parts.push(g); }
      const merged = mergeGeometries(parts, false); if (!merged) continue;
      merged.userData.keepCPU = true;      // (kept: a sign that's drawn on again is taken back out of it)
      const mat = members[0].material.clone(); mat.map = sheet.tex;
      const mesh = new THREE.Mesh(merged, mat); mesh.name = 'signs'; mesh.renderOrder = members[0].renderOrder; mesh.receiveShadow = members.some(o => o.receiveShadow); mesh.castShadow = members.some(o => o.castShadow);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix(); scene.add(mesh); draws++;
      let at = 0; for (const o of members) { const n = o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count;
        const t = o.material.map; o.userData.packed = { mesh, start: at, count: n }; at += n;
        o.removeFromParent(); packed++;
        // (if anything draws on this sign's picture again, it comes back out as its own sign: see unpackSign)
        (t.__packedSigns || (t.__packedSigns = [])).push(o); t.__onRedraw = () => { for (const s of t.__packedSigns.splice(0)) unpackSign(scene, s); };
        // the sign's own picture isn't drawn any more: let go of it (as memory.js does once a picture's on the chip). If
        // whoever drew it still has it, it comes back the moment it's drawn on (memory.js), and the sign with it
        t.__packedN = (t.__packedN || 0) + 1;
        if (t.__packedN === users.get(t) && !t.__cvRef && typeof WeakRef !== 'undefined') { const im = t.image; t.__cvRef = new WeakRef(im); t.source.data = { width: im.width, height: im.height }; } }
    }
  }
  return { packed, pages, draws };
}
export function unpackSign(scene, o) {
  const pk = o.userData.packed; if (!pk) return; o.userData.packed = null;
  const pos = pk.mesh.geometry.attributes.position; if (pos.array) { for (let i = pk.start; i < pk.start + pk.count; i++) pos.setXYZ(i, 0, -1000, 0); pos.needsUpdate = true; }
  scene.add(o);
}

// FURNITURE NEAR A SPOT: the level's blocking boxes (room.blockers: thousands in the pub) sorted into 2m squares, so
// keeping someone out of the furniture only looks at what's near them instead of everything in the level, every person,
// every frame. Gives the boxes in their original order (callers push out of them one after another, the same as before).
// Anything within NEAR_SAFE metres of the spot is always included; callers fall back to the full list if they end up
// further than that from where they started.
export const NEAR_SAFE = 0.6;
const GRID = 2, MARGIN = 1.2;
export function nearBlockers(room, x, z) {
  const B = room.blockers || [];
  let g = room.__bgrid;
  if (!g || g.arr !== B || g.len !== B.length) {
    g = room.__bgrid = { arr: B, len: B.length, cells: new Map(), out: [] };
    B.forEach((b, i) => { for (let cx = Math.floor((b.x0 - MARGIN) / GRID); cx <= Math.floor((b.x1 + MARGIN) / GRID); cx++) for (let cz = Math.floor((b.z0 - MARGIN) / GRID); cz <= Math.floor((b.z1 + MARGIN) / GRID); cz++) {
      const k = cx * 100003 + cz; let l = g.cells.get(k); if (!l) g.cells.set(k, l = []); l.push(i); } });
  }
  const l = g.cells.get(Math.floor(x / GRID) * 100003 + Math.floor(z / GRID));
  const out = g.out; out.length = 0; if (l) for (const i of l) out.push(B[i]);
  return out;
}
