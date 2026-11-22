// NO FIRST-TIME STUTTERS: the graphics chip has to build a little program (a "shader") for every different kind of
// material the first time it draws one. Built in the middle of play, that's a freeze (tens to hundreds of milliseconds
// on a phone or a headset, each time something new turns up: a power-up, an attack's effects, an emote's props).
// Here they're all built while the level loads instead, in the background (the browser builds them in parallel):
//   - everything already in the level, and
//   - one tiny invisible stand-in for every kind of material the game uses later (SIGS below, plus any new kind this
//     device has met before: remembered in localStorage, so next time it's ready up front too).
// The stand-ins' materials are kept (never let go of), so those programs stay built for the whole game (letting go of
// the last material using one throws the program away, and it was built all over again the next time).
// Nothing here changes how anything looks.
import * as THREE from 'three';

const KEY = 'rs_shader_sigs', MAX_LEARNT = 80;
// first letter: the material (L Lambert, B Basic, P Phong, S sprite, K line); then m: picture, v: vertex colours,
// d: two-sided, b: inside-out (back side), t: see-through, i: instanced (c: per-instance colour), a: alpha test,
// f0: not in the haze. (Each of these is a different program to the graphics chip)
const SIGS = [
  'Lvs',      // (s: skinned. Run the Pub's punters: their bodies are drawn in their own vertex colours, and they only turn up once the night's started)
  'L', 'Lm', 'Lv', 'Lvd', 'Ld', 'Lmd', 'Li', 'Lmi', 'Lvi', 'Lic', 'Lma', 'Lt', 'Lmt', 'Lvt', 'Ldt', 'Lmdt',
  'B', 'Bm', 'Bv', 'Bd', 'Bmd', 'Bi', 'Bmi', 'Bic', 'Bma', 'Bf0', 'Bmf0', 'Bt', 'Bmt', 'Bdt', 'Bmdt', 'Bbt', 'Bmbt', 'Bvt', 'Bmtf0', 'Btf0',
  'P', 'Pm', 'Pv', 'Pd', 'Pt', 'Pmt',
  'Sm', 'Smf0', 'S',
  'K', 'Kt',
];
const sigOf = (o, m) => {
  const t = m.isMeshLambertMaterial ? 'L' : m.isMeshBasicMaterial ? 'B' : m.isMeshPhongMaterial ? 'P' : m.isSpriteMaterial ? 'S' : m.isLineBasicMaterial ? 'K' : null;
  if (!t || m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile || o.isSkinnedMesh || o.morphTargetInfluences) return null;     // (custom and skinned ones are warmed by being in the level)
  return t + (m.map ? 'm' : '') + (m.vertexColors ? 'v' : '') + (m.side === THREE.DoubleSide ? 'd' : '') + (m.side === THREE.BackSide ? 'b' : '') + (m.transparent && t !== 'S' ? 't' : '') + (o.isInstancedMesh ? 'i' : '') + (o.isInstancedMesh && o.instanceColor ? 'c' : '') + (m.alphaTest > 0 ? 'a' : '') + (m.fog === false ? 'f0' : '');
};
let tex = null;
function probe(sig) {
  const t = sig[0], has = (c) => sig.slice(1).includes(c), f0 = sig.includes('f0');
  if (!tex) { const c = document.createElement('canvas'); c.width = c.height = 4; tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.userData.keep = true; }
  const o = { side: has('d') ? THREE.DoubleSide : has('b') ? THREE.BackSide : THREE.FrontSide, vertexColors: has('v'), alphaTest: has('a') ? 0.5 : 0, transparent: has('t') }; if (has('m')) o.map = tex; if (f0) o.fog = false;
  let obj, mat;
  if (t === 'S') { mat = new THREE.SpriteMaterial({ map: has('m') ? tex : null, fog: !f0 }); obj = new THREE.Sprite(mat); }
  else if (t === 'K') { mat = new THREE.LineBasicMaterial({ transparent: has('t') }); obj = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0.01, 0)]), mat); }
  else {
    mat = new (t === 'L' ? THREE.MeshLambertMaterial : t === 'B' ? THREE.MeshBasicMaterial : THREE.MeshPhongMaterial)(o);
    const g = new THREE.PlaneGeometry(0.01, 0.01); if (has('v')) g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(g.attributes.position.count * 3).fill(1), 3));
    if (has('s')) { g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(g.attributes.position.count * 4).fill(0), 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(g.attributes.position.count * 4).fill(0).map((v, i) => i % 4 ? 0 : 1), 4));
      const bone = new THREE.Bone(); obj = new THREE.SkinnedMesh(g, mat); obj.add(bone); obj.bind(new THREE.Skeleton([bone])); }
    else if (has('i')) { obj = new THREE.InstancedMesh(g, mat, 1); obj.setMatrixAt(0, new THREE.Matrix4()); if (has('c')) obj.setColorAt(0, new THREE.Color(1, 1, 1)); }
    else obj = new THREE.Mesh(g, mat);
  }
  mat.userData.keep = true; obj.frustumCulled = false; obj.raycast = () => {}; obj.layers.set(31);      // (on a layer no camera draws: built, never drawn)
  return obj;
}
async function waitReady(renderer, maxMs = 6000) {
  const t0 = performance.now();
  for (;;) { let pending = 0;
    for (const p of renderer.info.programs || []) { try { if (p.isReady && !p.isReady()) pending++; } catch (e) {} }
    if (!pending || performance.now() - t0 > maxMs) return; await new Promise(r => setTimeout(r, 30)); }
}
const learnt = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
const KEEP = [];      // (the stand-ins' materials, held so their programs are never thrown away)

// build every shader the level and the game will need, without stopping the page. Resolves when done (or at once if
// the browser can't do it in the background: then it's done the ordinary way, still before play)
export async function warmShaders(renderer, scene, camera) {
  const sigs = [...new Set([...SIGS, ...learnt()])];
  const grp = new THREE.Group(); grp.name = 'shader warm-up';
  for (const s of sigs) { try { const o = probe(s); grp.add(o); KEEP.push(o.material); } catch (e) {} }
  grp.position.copy(camera.getWorldPosition(new THREE.Vector3())); scene.add(grp); grp.updateMatrixWorld(true);
  const t0 = performance.now();
  // (renderer.compile starts every program building; with the browser's parallel shader building that doesn't wait for
  // them. Then they're waited for here, gently. Not three.js's compileAsync: its own waiting threw, outside anyone's
  // reach, if a material it was waiting on was let go of meanwhile, e.g. starting a new game straight away)
  try { renderer.compile(scene, camera); } catch (e) { console.warn('shader warm-up', e); }
  await waitReady(renderer);
  // sunny places draw shadows too, with their own programs: one hidden 1-pixel frame with everything in it builds them
  if (renderer.shadowMap.enabled && !renderer.xr.isPresenting) {
    // (stand-ins that cast shadows too, one for each kind of shadow program: plain, instanced, a body with a skeleton,
    // and cut-out pictures (alpha test), each one- and two-sided: whatever turns up mid-game casting a shadow)
    const sg = new THREE.Group(); sg.position.copy(grp.position); scene.add(sg);
    for (const kind of ['m', 'i', 's']) for (const cut of [false, true]) for (const side of [THREE.FrontSide, THREE.DoubleSide]) {
      const mat = new THREE.MeshLambertMaterial({ side, map: cut ? (tex || null) : null, alphaTest: cut ? 0.5 : 0, vertexColors: false }); mat.userData.keep = true; KEEP.push(mat);
      const g = new THREE.BoxGeometry(0.01, 0.01, 0.01); let o;
      if (kind === 'i') { o = new THREE.InstancedMesh(g, mat, 1); o.setMatrixAt(0, new THREE.Matrix4()); }
      else if (kind === 's') { const n = g.attributes.position.count; g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(n * 4).fill(0), 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(n * 4).fill(0).map((v, k) => k % 4 ? 0 : 1), 4));
        o = new THREE.SkinnedMesh(g, mat); const bone = new THREE.Bone(); o.add(bone); o.bind(new THREE.Skeleton([bone])); }
      else o = new THREE.Mesh(g, mat);
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; sg.add(o); }
    sg.updateMatrixWorld(true);
    const was = [], hid = [], lods = []; scene.traverse(o => { if ((o.isMesh || o.isSprite) && o.frustumCulled) { was.push(o); o.frustumCulled = false; }
      if (o.isLOD && o.autoUpdate) { lods.push(o); o.autoUpdate = false; }      // (every level of detail, near and far, shown for this one frame)
      if ((o.isMesh || o.isLOD || o.isGroup) && !o.visible && o.name !== 'food batch') { hid.push(o); o.visible = true; } });      // (and whatever's hidden now but shown later)
    const auto = renderer.shadowMap.autoUpdate; renderer.shadowMap.needsUpdate = true;
    try { renderer.setScissorTest(true); renderer.setScissor(0, 0, 1, 1); renderer.render(scene, camera); } catch (e) { console.warn('shadow warm-up', e); }
    renderer.setScissorTest(false); renderer.shadowMap.autoUpdate = auto; for (const o of was) o.frustumCulled = true; for (const o of hid) o.visible = false; for (const o of lods) o.autoUpdate = true;
    scene.remove(sg); sg.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.skeleton) o.skeleton.dispose(); });
  }
  scene.remove(grp); for (const o of grp.children) if (o.geometry) o.geometry.dispose();
  const ms = Math.round(performance.now() - t0);
  return { programs: renderer.info.programs.length, sigs: sigs.length, ms };
}
// watch for any program built during play: remember what kind of material needed it, so next time it's warmed up front
export function learnShaders(renderer, scene) {
  let n = renderer.info.programs.length;
  return () => {
    const now = renderer.info.programs.length; if (now <= n) { n = now; return; } n = now;
    const have = new Set(learnt()), add = [];
    scene.traverseVisible(o => { if (!o.material) return; for (const m of [].concat(o.material)) { const s = sigOf(o, m); if (s && !SIGS.includes(s) && !have.has(s)) { have.add(s); add.push(s); } } });
    if (add.length) try { localStorage.setItem(KEY, JSON.stringify([...have].slice(-MAX_LEARNT))); } catch (e) {}
  };
}
