// The 3D Ronnie on the start screen: his real scanned head, eating.
//
// How the mouth works (worked out from the scan):
//   - his lips meet along a line at y ≈ 0.4595 (model units; the head is ~2.5x
//     life size), from x = -0.066 to +0.066, dipping ~3mm at the corners
//   - the jaw hinges at the joint just in front of the ear (TMJ): (0, 0.50, 0.09)
//   - when he opens, the lower jaw rotates down about that hinge and slides a
//     touch forward; chewing adds a small side-to-side grind
// At load the mesh is CUT exactly along the lip line (each triangle crossing it
// is split, with separate vertices above and below), and every vertex is skinned
// to two bones: head and jaw. Lower lip, chin and jaw follow the jaw fully; the
// cheeks blend so the skin stretches; the neck and everything behind the jaw
// stays still. Behind the lips there's a dark mouth, top and bottom teeth and a
// tongue, so when he opens you see inside rather than through his head.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Item } from './foods.js';

const LIP_Y = 0.4595, MOUTH_HW = 0.066, PIVOT = new THREE.Vector3(0, 0.50, 0.09);
const lipY = (x) => LIP_Y - 0.003 * Math.min(1, (x / MOUTH_HW) ** 2);
const MOUTH = new THREE.Vector3(0, LIP_Y - 0.004, 0.355);      // just in front of the lips
const FOOD_SCALE = 2.0, TRAY_SCALE = 1.55;                                       // food is real size; his head is ~2.4x life size
const FOODS = ['burger', 'pizza', 'doughnut', 'hotdog', 'chicken', 'kebab', 'cookie', 'icecream', 'fries', 'sausageroll', 'taco', 'can'];
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export async function startHero(holder, { onTap, onEat, sfx } = {}) {
  const W = () => holder.clientWidth || 300, H = () => holder.clientHeight || 300;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(W(), H(), false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const canvas = renderer.domElement; canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;cursor:grab';
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4e8, 0x6a7aa8, 1.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(0.8, 1.6, 2.2); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ab8ff, 1.6); rim.position.set(-1.6, 1.2, -1); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
  camera.position.set(0, 0.6, 2.05); camera.lookAt(0, 0.56, 0);

  const gltf = await new GLTFLoader().loadAsync('./assets/ronnie_head.glb');
  let src = null; gltf.scene.traverse(o => { if (!src && o.isMesh) src = o; });
  src.updateWorldMatrix(true, false);
  const geo = cutLips(src.geometry.clone().applyMatrix4(src.matrixWorld));
  const old = src.material;
  const mat = new THREE.MeshStandardMaterial({ map: old.map, normalMap: old.normalMap || null, roughness: 0.75, metalness: 0 });
  if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;

  // ---- skeleton: head (root) + jaw hinged at the TMJ ----
  const rootBone = new THREE.Bone(), jaw = new THREE.Bone();
  jaw.position.copy(PIVOT); rootBone.add(jaw);
  skinJaw(geo);
  const head = new THREE.SkinnedMesh(geo, mat);
  head.add(rootBone); head.bind(new THREE.Skeleton([rootBone, jaw]));
  head.frustumCulled = false;
  const bust = new THREE.Group(); bust.add(head); scene.add(bust);

  // ---- inside the mouth ----
  const dark = new THREE.MeshBasicMaterial({ color: 0x2a0606, side: THREE.BackSide });
  const cavity = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), dark);
  cavity.scale.set(0.085, 0.068, 0.09); cavity.position.set(0, LIP_Y - 0.014, 0.224); head.add(cavity);
  // teeth: a row of individual teeth (gaps, rounded tips, a little shadow at the gum)
  const tc = document.createElement('canvas'); tc.width = 256; tc.height = 32; const tg = tc.getContext('2d');
  tg.fillStyle = '#3a1010'; tg.fillRect(0, 0, 256, 32);
  const widths = [18, 20, 22, 26, 34, 34, 26, 22, 20, 18];   // canines/incisors wider in the middle
  let tx = (256 - widths.reduce((a, b) => a + b, 0)) / 2;
  for (const w of widths) { const gr = tg.createLinearGradient(0, 0, 0, 32); gr.addColorStop(0, '#a89880'); gr.addColorStop(0.3, '#ece3d2'); gr.addColorStop(1, '#d8ccb8'); tg.fillStyle = gr; tg.fillRect(tx + 1, 1, w - 2, 30); tx += w; }
  const toothTex = new THREE.CanvasTexture(tc); toothTex.colorSpace = THREE.SRGBColorSpace;
  const toothMat = new THREE.MeshStandardMaterial({ map: toothTex, roughness: 0.4, side: THREE.DoubleSide });
  const lowTex = toothTex.clone(); lowTex.flipY = false; lowTex.needsUpdate = true;
  const toothMatLow = new THREE.MeshStandardMaterial({ map: lowTex, roughness: 0.4, side: THREE.DoubleSide });
  const teethArc = (y, h) => { const g = new THREE.CylinderGeometry(0.044, 0.044, h, 22, 1, true, -1.05, 2.1); g.translate(0, y, 0); return g; };
  const upperTeeth = new THREE.Mesh(teethArc(0, 0.012), toothMat); upperTeeth.position.set(0, LIP_Y - 0.001, 0.281); head.add(upperTeeth);
  const lowerTeeth = new THREE.Mesh(teethArc(0, 0.011), toothMatLow); lowerTeeth.position.set(0, LIP_Y - 0.008 - PIVOT.y, 0.282 - PIVOT.z); jaw.add(lowerTeeth);
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshStandardMaterial({ color: 0xb8434f, roughness: 0.5 }));
  tongue.scale.set(0.034, 0.012, 0.04); tongue.position.set(0, LIP_Y - 0.022 - PIVOT.y, 0.276 - PIVOT.z); jaw.add(tongue);

  // ---- food: a few bits floating round him that you can drag to his mouth ----
  const SPOTS = [new THREE.Vector3(-0.31, 0.27, 0.32), new THREE.Vector3(0.31, 0.29, 0.32), new THREE.Vector3(0.34, 0.74, 0.2)];
  let fi = Math.floor(Math.random() * FOODS.length);
  const nextType = () => FOODS[fi++ % FOODS.length];
  const makeFood = (type) => { const it = new Item(type); const o = it.obj; o.scale.setScalar(TRAY_SCALE); o.userData.type = type; o.userData.bites = type === 'can' ? 1 : 3; scene.add(o); return o; };
  const tray = SPOTS.map((p, i) => { const o = makeFood(nextType()); o.position.copy(p); o.userData.home = p; o.userData.pop = 1; return o; });

  // ---- animation state ----
  let jawOpen = 0, jawTarget = 0, grind = 0, t = 0, eating = null, dragging = null, idleT = 2.5, lookX = 0, lookY = 0, nod = 0, talkT = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.38), hit = new THREE.Vector3();

  // eat: bring the food to his mouth, open, bite (a third disappears), chew, repeat, swallow
  function eat(o) {
    if (eating) return;
    eating = { o, phase: 'bring', t: 0, from: o.position.clone(), bites: o.userData.bites, chew: 0 };
    o.userData.home && (o.userData.homeless = true);
  }
  function updateEat(dt) {
    const e = eating; if (!e) return;
    e.t += dt;
    const bitePos = MOUTH.clone().add(new THREE.Vector3(0.025, -0.035, 0.07));
    const EAT_ROT = new THREE.Euler(-0.55, 0.5, 0.15);
    if (e.phase === 'bring') {
      const u = smooth(0, 1, e.t / 0.45);
      e.o.position.lerpVectors(e.from, bitePos, u); e.o.scale.setScalar(TRAY_SCALE + (FOOD_SCALE - TRAY_SCALE) * u);
      e.o.quaternion.slerp(new THREE.Quaternion().setFromEuler(EAT_ROT), Math.min(1, dt * 8));
      jawTarget = 0.12 * u;
      if (u >= 1) { e.phase = 'open'; e.t = 0; }
    } else if (e.phase === 'open') {            // wide open, lean in a little
      jawTarget = 0.30; nod = 0.06;
      e.o.position.lerp(MOUTH.clone().add(new THREE.Vector3(0.02, -0.03, 0.045)), Math.min(1, dt * 10));
      if (e.t > 0.28) { e.phase = 'bite'; e.t = 0; }
    } else if (e.phase === 'bite') {            // CHOMP: snap shut, a chunk goes
      jawTarget = 0;
      if (e.t > 0.06 && !e.bitten) {
        e.bitten = true; e.bites--; sfx && sfx('chomp');
        const s = FOOD_SCALE * (0.35 + 0.65 * e.bites / e.o.userData.bites); e.o.scale.setScalar(s);
        crumbs(e.o.position);
      }
      e.o.position.lerp(bitePos.clone().add(new THREE.Vector3(0.01, -0.02, 0.03)), Math.min(1, dt * 8));
      if (e.t > 0.18) { e.phase = 'chew'; e.t = 0; e.bitten = false; nod = 0; }
    } else if (e.phase === 'chew') {            // 3 chews: the jaw drops a little and grinds side to side
      const cyc = e.t * 2 * Math.PI * 1.7;
      jawTarget = 0.035 + 0.07 * Math.max(0, Math.sin(cyc)); grind = 0.045 * Math.sin(cyc * 0.5);
      if (e.bites <= 0) { e.o.visible = false; }
      if (e.t > 1.1) {
        grind = 0;
        if (e.bites > 0) { e.phase = 'open'; e.t = 0; }
        else { e.phase = 'swallow'; e.t = 0; sfx && sfx('gulp'); onEat && onEat(e.o.userData.type); }
      }
    } else if (e.phase === 'swallow') {         // gulp: a little nod
      jawTarget = 0; nod = 0.05 * Math.sin(Math.min(1, e.t / 0.4) * Math.PI);
      if (e.t > 0.5) {
        const o = e.o, home = o.userData.home;
        if (home) { scene.remove(o); const n = makeFood(nextType()); n.userData.home = home; n.position.copy(home); n.scale.setScalar(0.01); n.userData.pop = 0; tray[tray.indexOf(o)] = n; }
        else scene.remove(o);
        eating = null; idleT = 3 + Math.random() * 2;
      }
    }
  }
  // crumbs: little bits that fall from the bite
  const crumbGeo = new THREE.BoxGeometry(0.008, 0.008, 0.008), crumbList = [];
  function crumbs(at) {
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(crumbGeo, new THREE.MeshLambertMaterial({ color: [0xd9933f, 0x5a2e14, 0x4caf3c, 0xffc21a][i % 4] }));
      m.position.copy(at); m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 0.4, Math.random() * 0.25, 0.1 + Math.random() * 0.25); m.userData.life = 0.9;
      scene.add(m); crumbList.push(m);
    }
  }

  // ---- input: drag food to his mouth, tap him to talk ----
  const toNdc = (e) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  let downAt = null, moved = 0;
  canvas.addEventListener('pointerdown', (e) => {
    toNdc(e); downAt = { x: e.clientX, y: e.clientY }; moved = 0;
    ray.setFromCamera(ndc, camera);
    // grab the nearest food under the finger (generous: within ~45px)
    let best = null, bd = 1e9; const r = canvas.getBoundingClientRect();
    for (const o of tray) { if (!o.visible || (eating && eating.o === o)) continue; const p = o.position.clone().project(camera); const dx = (p.x - ndc.x) * r.width / 2, dy = (p.y - ndc.y) * r.height / 2, d = Math.hypot(dx, dy); if (d < 48 && d < bd) { bd = d; best = o; } }
    if (best) { dragging = best; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; e.preventDefault(); }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (downAt) moved = Math.max(moved, Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y));
    toNdc(e);
    lookX = ndc.x; lookY = ndc.y;
    if (!dragging) return;
    ray.setFromCamera(ndc, camera); if (ray.ray.intersectPlane(plane, hit)) dragging.position.lerp(hit, 0.7);
    dragging.rotation.set(dragging.userData.type === 'can' ? 0.15 : 0.85, 0.3, 0, 'YXZ');
    // close to his mouth: he opens up for it, and takes it
    const d = dragging.position.distanceTo(MOUTH);
    jawTarget = Math.max(jawTarget, 0.25 * smooth(0.25, 0.08, d));
    if (d < 0.09) { const o = dragging; dragging = null; canvas.style.cursor = 'grab'; o.userData.home = o.userData.home; eat(o); }
  });
  const up = (e) => {
    if (dragging) { dragging = null; canvas.style.cursor = 'grab'; }
    else if (downAt && moved < 10) { talkT = 1.4; onTap && onTap(); }      // a tap on him
    downAt = null;
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', () => { dragging = null; downAt = null; });
  holder.appendChild(canvas);

  // ---- the loop ----
  let running = true, last = performance.now();
  const _q = new THREE.Quaternion(), _e = new THREE.Euler();
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (renderer.domElement.width !== Math.round(W() * renderer.getPixelRatio())) { renderer.setSize(W(), H(), false); camera.aspect = W() / H(); camera.updateProjectionMatrix(); }
    // auto-eat when nobody's playing with him
    if (!eating && !dragging) { idleT -= dt; if (idleT <= 0) { const o = tray[Math.floor(Math.random() * tray.length)]; if (o.userData.pop >= 1) eat(o); else idleT = 0.5; } }
    if (!eating && !dragging && talkT <= 0) jawTarget = 0;
    if (talkT > 0) { talkT -= dt; jawTarget = 0.06 + 0.06 * Math.abs(Math.sin(t * 13)); if (talkT <= 0) jawTarget = 0; }
    updateEat(dt);
    // jaw follows its target quickly but not instantly (muscle), slides forward a touch as it opens
    jawOpen += (jawTarget - jawOpen) * Math.min(1, dt * 18);
    jaw.rotation.set(jawOpen, grind, grind * 0.4);
    jaw.position.set(PIVOT.x, PIVOT.y - jawOpen * 0.01, PIVOT.z + jawOpen * 0.03);
    // head: breathing bob, looks at your finger/mouse, leans in for bites, nods to swallow
    const ty = THREE.MathUtils.clamp(lookX, -1, 1) * 0.35, tx = -THREE.MathUtils.clamp(lookY - 0.1, -1, 1) * 0.15 + nod * 3;
    bust.rotation.y += (ty - bust.rotation.y) * Math.min(1, dt * 3);
    bust.rotation.x += (tx - bust.rotation.x) * Math.min(1, dt * 4);
    bust.position.y = Math.sin(t * 1.6) * 0.004;
    // tray food bobs and spins; new food pops in
    for (const o of tray) {
      if (o === dragging || (eating && eating.o === o)) continue;
      if (o.userData.pop < 1) { o.userData.pop = Math.min(1, o.userData.pop + dt * 3); o.scale.setScalar(TRAY_SCALE * (1 - Math.pow(1 - o.userData.pop, 3))); }
      const h = o.userData.home; o.position.lerp(new THREE.Vector3(h.x, h.y + Math.sin(t * 2 + h.x * 9) * 0.015, h.z), Math.min(1, dt * 6));
      o.userData.spin = (o.userData.spin || Math.random() * 6) + dt * 0.7;
      o.rotation.set(o.userData.type === 'can' ? 0.15 : 0.85, o.userData.spin, 0, 'YXZ');
    }
    for (let i = crumbList.length - 1; i >= 0; i--) { const c = crumbList[i]; c.userData.life -= dt; c.userData.v.y -= 1.4 * dt; c.position.addScaledVector(c.userData.v, dt); c.rotation.x += dt * 9; if (c.userData.life <= 0) { scene.remove(c); crumbList.splice(i, 1); } }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return {
    ready: true,
    canvas,
    stop() { running = false; renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); canvas.remove(); },
    talk(sec = 1.4) { talkT = sec; },
    eatNow() { if (!eating) eat(tray[0]); },
    _debug: { set open(v) { jawTarget = v; talkT = 99; jawOpen = v; }, camera, tray, bust },
  };
}

// ---------------------------------------------------------------------------
// Split every triangle that crosses the lip line (inside the mouth's width) so
// the top and bottom lips become separate edges that can pull apart.
function cutLips(g) {
  if (g.index) g = g.toNonIndexed();
  const names = Object.keys(g.attributes), src = names.map(n => g.attributes[n]);
  const out = names.map(() => []);
  const n = g.attributes.position.count;
  const P = g.attributes.position;
  const side = (i) => P.getY(i) - lipY(P.getX(i));          // > 0 above the lips, < 0 below
  const push = (vals) => vals.forEach((arr, k) => out[k].push(...arr));
  const vert = (i) => src.map(a => { const r = []; for (let c = 0; c < a.itemSize; c++) r.push(a.array[i * a.itemSize + c]); return r; });
  const mix = (A, B, t) => A.map((a, k) => a.map((v, c) => v + (B[k][c] - v) * t));
  const lowerFlag = [];                                     // which output vertices are the bottom lip's copy
  for (let f = 0; f < n; f += 3) {
    const ids = [f, f + 1, f + 2], s = ids.map(side), V = ids.map(vert);
    const xs = ids.map(i => P.getX(i)), zs = ids.map(i => P.getZ(i));
    const inMouth = Math.max(...xs.map(Math.abs)) < MOUTH_HW && Math.min(...zs) > 0.26;
    const pos = s.filter(v => v >= 0).length;
    if (!inMouth || pos === 0 || pos === 3) { V.forEach(v => push(v)); ids.forEach((_, k) => lowerFlag.push(s[k] < 0 ? 1 : 0)); continue; }
    // one vertex alone on one side
    const lone = s.findIndex((v, k) => (v >= 0) !== (s[(k + 1) % 3] >= 0) && (v >= 0) !== (s[(k + 2) % 3] >= 0));
    const a = lone, b = (lone + 1) % 3, c = (lone + 2) % 3;
    const tab = s[a] / (s[a] - s[b]), tac = s[a] / (s[a] - s[c]);
    const pab = mix(V[a], V[b], tab), pac = mix(V[a], V[c], tac);
    const aLow = s[a] < 0 ? 1 : 0, bLow = 1 - aLow;
    // the lone vertex's side: (a, pab, pac); the other side: (pab, b, c), (pab, c, pac)  (same winding)
    push(V[a]); push(pab); push(pac); lowerFlag.push(aLow, aLow, aLow);
    push(pab); push(V[b]); push(V[c]); lowerFlag.push(bLow, bLow, bLow);
    push(pab); push(V[c]); push(pac); lowerFlag.push(bLow, bLow, bLow);
  }
  const ng = new THREE.BufferGeometry();
  names.forEach((nm, k) => ng.setAttribute(nm, new THREE.Float32BufferAttribute(out[k], src[k].itemSize)));
  ng.userData.lower = Uint8Array.from(lowerFlag);
  return ng;
}

// Two-bone skin: 0 = head, 1 = jaw.
function skinJaw(g) {
  const P = g.attributes.position, n = P.count, low = g.userData.lower;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), ax = Math.abs(x), ly = lipY(Math.min(ax, MOUTH_HW));
    // how far "down" this is, relative to the lips: hard split between the lips, a
    // wide soft band out at the cheeks so the skin stretches instead of tearing
    const inside = 1 - smooth(MOUTH_HW - 0.004, MOUTH_HW + 0.03, ax);
    const soft = 1 - smooth(ly - 0.045, ly + 0.02, y);
    // lips: open fully in the middle and taper to closed at the corners (both
    // copies of a cut vertex end up with the same weight at the corner, so the
    // opening is lens-shaped, not a slot)
    const k = 1 - smooth(0.03, MOUTH_HW - 0.004, ax);
    const hard = low[i] ? soft + (1 - soft) * k : soft * (1 - k);
    let w = hard * inside + soft * (1 - inside);
    if (inside > 0.99 && Math.abs(y - ly) > 0.025) w = y < ly ? 1 : 0;
    // only the jaw: not the neck under it, not behind the jaw angle, not the ears
    const jawLineY = 0.40 - (z - 0.08) * (0.07 / 0.26);              // chin (z .34, y .33) to jaw angle (z .08, y .40)
    w *= smooth(jawLineY - 0.045, jawLineY - 0.005, y);              // fades out down the neck
    w *= smooth(0.04, 0.13, z);                                       // nothing behind the jaw joint
    w *= 1 - smooth(0.20, 0.27, ax);                                  // nor the far sides of the face
    si[i * 4] = 0; si[i * 4 + 1] = 1; sw[i * 4] = 1 - w; sw[i * 4 + 1] = w;
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.computeBoundingSphere();
}
