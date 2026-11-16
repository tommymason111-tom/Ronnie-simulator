// Keeping memory down (phones, iPhones above all, close a page that uses too much: "A problem repeatedly occurred").
// Nothing here changes how anything looks: it only stops memory piling up.
//
// 1. A SWEEPER. Everything the game draws (shapes, materials, pictures) is noted. Every few seconds, and after every
//    new game, anything that's no longer in the world (the last game's characters, their speech bubbles, a finished
//    emote's props, an old mode's signs...) is let go of on the graphics chip. If it's ever wanted again it's simply
//    sent back (three.js re-uploads it), so nothing can go missing; it just stops building up game after game.
// 2. ONE COPY, NOT TWO. Once the level's shapes and the photos inside models are on the graphics chip, the copies the
//    browser was also keeping in ordinary memory are thrown away (the chip's copy is the one that's drawn). Only for
//    things that never change and are never let go of.
import * as THREE from 'three';

const SEEN = { geo: new Set(), mat: new Set(), tex: new Set() };
const KEEP = new WeakSet();
// every picture is noted the moment it's made (or redrawn), not just if it happens to be in the world when we look:
// some come and go between looks (a portrait for an attack, a sign swapped for a new one) and were never let go of
{ const d = Object.getOwnPropertyDescriptor(THREE.Texture.prototype, 'needsUpdate');
  if (d && d.set && !THREE.Texture.prototype.__memNoted) { THREE.Texture.prototype.__memNoted = true;
    Object.defineProperty(THREE.Texture.prototype, 'needsUpdate', { configurable: true, get: d.get, set(v) {
      // (a level picture whose spare copy was let go of, being drawn on again: put its picture back first, if whoever
      // draws on it still has it; if nobody does, nothing can have changed, and the chip's copy stays as it is)
      if (v && this.__cvRef) { const c = this.__cvRef.deref(); if (!c) return; this.source.data = c; this.__cvRef = null; }
      d.set.call(this, v); if (v) SEEN.tex.add(this); } }); } }           // let go of the spare copy: never dispose these (they couldn't be sent again)
// a level shape whose spare copy is gone can't be sent to the chip again, so it must never be let go of (by anything)
{ const d = THREE.BufferGeometry.prototype.dispose; if (!d.__memSafe) { const f = function () { if (this.__cpuFreed) return; return d.call(this); }; f.__memSafe = true; THREE.BufferGeometry.prototype.dispose = f; } }
const texKeys = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap', 'aoMap', 'bumpMap', 'lightMap', 'specularMap', 'displacementMap', 'envMap', 'gradientMap'];
const each = (root, f) => root.traverse(o => { if (o.geometry) f('geo', o.geometry, o); const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
  for (const m of ms) { f('mat', m, o); for (const k of texKeys) if (m[k] && m[k].isTexture) f('tex', m[k], o); if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && u.value && u.value.isTexture) f('tex', u.value, o); } });

// what's in the world right now (and note it as seen)
function inUse(scene, extra = []) { const U = { geo: new Set(), mat: new Set(), tex: new Set() };
  const add = (kind, r) => { U[kind].add(r); SEEN[kind].add(r); }; each(scene, add); for (const o of extra) if (o) each(o, add); return U; }

// let go of everything that's no longer in the world
export function sweep(scene, extra) {
  const U = inUse(scene, extra); let n = 0;
  for (const kind of ['geo', 'mat', 'tex']) for (const r of [...SEEN[kind]]) {
    if (U[kind].has(r)) continue; SEEN[kind].delete(r);
    if (KEEP.has(r) || r.isRenderTargetTexture || r.isVideoTexture || (r.userData && r.userData.keep)) continue;
    try { r.dispose(); n++; } catch (e) {} }
  return n;
}

// throw away the ordinary-memory copy of the level's shapes, once they're on the graphics chip
export function releaseLevelGeometry(meshes, max = 120) {
  // (a few at a time: each is sent to the chip once more, and its spare copy goes the moment that's done)
  let n = 0, bytes = 0;
  for (const o of meshes) { if (n >= max) break; const g = o.geometry; if (!g || KEEP.has(g) || o.isSkinnedMesh || (g.morphAttributes && Object.keys(g.morphAttributes).length)) continue;
    if (!g.boundingSphere) g.computeBoundingSphere(); if (!g.boundingBox) g.computeBoundingBox();      // (worked out first: they need the shape)
    KEEP.add(g); g.__cpuFreed = true; o.userData.cpuFreed = true; n++;
    for (const a of [...Object.values(g.attributes), g.index]) if (a && a.array && a.onUpload) { bytes += a.array.byteLength; a.onUpload(function () { this.array = null; }); a.needsUpdate = true; } }
  return n;
}
// ...and of the photos inside models (characters, hands, food): only once they're actually on the chip. (Pictures the
// game draws itself are left alone: some get drawn on again later, a sign you write on, a photo, a scoreboard.)
export function releaseTextures(renderer, scene) {
  let bytes = 0; const props = renderer.properties;
  each(scene, (kind, t) => { if (kind !== 'tex' || KEEP.has(t) || !t.image || t.isRenderTargetTexture || t.isVideoTexture) return;
    const im = t.image; if (!(typeof ImageBitmap !== 'undefined' && im instanceof ImageBitmap)) return;
    const p = props.get(t); if (!p || !p.__webglTexture || t.version === 0 || (p.__version !== undefined && p.__version !== t.version)) return;      // (not on the chip yet, or due an update)
    KEEP.add(t); if (t.source) KEEP.add(t.source);
    bytes += (im.width || 0) * (im.height || 0) * 4;
    const w = im.width, h = im.height; try { im.close(); } catch (e) {} t.source.data = { width: w, height: h };
  });
  return bytes;
}
// ...and the pictures the level draws for itself (signs, posters, labels, menus, wallpaper): once one is on the chip, the
// texture stops holding its canvas. Nothing else holds most of them, so their memory goes (on an iPhone these were
// ~150MB, and Safari also has a hard limit on canvas memory). The few that are drawn on again later (a scoreboard, the
// fruit machine's screen, the lightbox) are still held by the code that draws them, so they're kept, and handed back
// to the texture the moment they're redrawn (see needsUpdate above). Pictures not yet seen are sent to the chip a few
// at a time, so their canvases can go too (and walking into a new room never stalls on uploading its pictures).
const LEVELTEX = [];
export function noteLevelTextures(meshes) {
  const s = new Set(); for (const o of meshes) { const ms = o.material ? [].concat(o.material) : []; for (const m of ms) for (const k of texKeys) { const t = m[k]; if (t && t.isTexture && !s.has(t)) { s.add(t); LEVELTEX.push(t); } } }
  return LEVELTEX.length;
}
const isCanvas = (im) => (typeof HTMLCanvasElement !== 'undefined' && im instanceof HTMLCanvasElement) || (typeof OffscreenCanvas !== 'undefined' && im instanceof OffscreenCanvas);
export function releaseLevelCanvases(renderer, uploadMax = 24) {
  if (typeof WeakRef === 'undefined') return 0;
  const props = renderer.properties; let n = 0, up = 0;
  for (let i = LEVELTEX.length - 1; i >= 0; i--) { const t = LEVELTEX[i], im = t.image;
    if (!im || !isCanvas(im) || t.isRenderTargetTexture) { LEVELTEX.splice(i, 1); continue; }
    let p = props.get(t);
    if ((!p || !p.__webglTexture) && up < uploadMax) { try { renderer.initTexture(t); up++; } catch (e) { LEVELTEX.splice(i, 1); continue; } p = props.get(t); }
    if (!p || !p.__webglTexture || t.version === 0 || (p.__version !== undefined && p.__version !== t.version)) continue;      // (not on the chip yet, or due an update)
    KEEP.add(t); if (t.source) KEEP.add(t.source);
    t.__cvRef = new WeakRef(im); t.source.data = { width: im.width, height: im.height }; LEVELTEX.splice(i, 1); n++;
  }
  return n;
}
export const keep = (r) => { if (r) KEEP.add(r); return r; };
