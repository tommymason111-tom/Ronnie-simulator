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
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

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
  renderer.xr.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const canvas = renderer.domElement; canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;cursor:grab';
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4e8, 0x6a7aa8, 1.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(0.8, 1.6, 2.2); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ab8ff, 1.6); rim.position.set(-1.6, 1.2, -1); scene.add(rim);
  // everything of his lives in `world`: identity on the menu, shrunk to life size in VR
  const world = new THREE.Group(); scene.add(world);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
  camera.position.set(0, 0.6, 2.05); camera.lookAt(0, 0.56, 0);

  const gltf = await new GLTFLoader().loadAsync('./assets/ronnie_head.glb');
  let src = null; gltf.scene.traverse(o => { if (!src && o.isMesh) src = o; });
  src.updateWorldMatrix(true, false);
  const geo = cutLips(src.geometry.clone().applyMatrix4(src.matrixWorld));
  const old = src.material;
  const mat = new THREE.MeshStandardMaterial({ map: old.map, normalMap: old.normalMap || null, roughness: 0.75, metalness: 0 });
  // only his body fades out, right at the bottom of the shirt (the food never fades)
  mat.transparent = true;
  const fadeU = { value: new THREE.Vector2(-1, -0.9) };
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vBodyY;').replace('#include <skinning_vertex>', '#include <skinning_vertex>\nvBodyY = transformed.y;');
    sh.uniforms.uFade = fadeU;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vBodyY;\nuniform vec2 uFade;').replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a *= smoothstep(uFade.x, uFade.y, vBodyY);');
  };

  if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;

  // ---- skeleton: head (root) + jaw hinged at the TMJ ----
  const rootBone = new THREE.Bone(), jaw = new THREE.Bone();
  jaw.position.copy(PIVOT); rootBone.add(jaw);
  skinJaw(geo);
  const head = new THREE.SkinnedMesh(geo, mat);
  head.add(rootBone); head.bind(new THREE.Skeleton([rootBone, jaw]));
  head.frustumCulled = false;
  const bust = new THREE.Group(); bust.add(head); world.add(bust);
  geo.computeBoundingBox(); const BOTTOM_Y = geo.boundingBox.min.y;

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
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshStandardMaterial({ color: 0xb8434f, roughness: 0.5 }));
  tongue.scale.set(0.034, 0.012, 0.04); tongue.position.set(0, LIP_Y - 0.022 - PIVOT.y, 0.276 - PIVOT.z); jaw.add(tongue);

  // ---- food: a few bits floating round him that you can drag to his mouth ----
  const SPOTS = [new THREE.Vector3(-0.31, 0.27, 0.32), new THREE.Vector3(0.31, 0.29, 0.32), new THREE.Vector3(0.34, 0.74, 0.2)];
  let fi = Math.floor(Math.random() * FOODS.length);
  const nextType = () => FOODS[fi++ % FOODS.length];
  const makeFood = (type) => { const it = new Item(type); const o = it.obj; o.scale.setScalar(TRAY_SCALE); o.userData.type = type; o.userData.bites = type === 'can' ? 1 : 3; world.add(o); return o; };
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
        else { e.phase = 'swallow'; e.t = 0; sfx && sfx('gulp'); onEat && onEat(e.o.userData.type); if (renderer.xr.isPresenting) say(['NOM!', 'MUNCH!', 'GULP!', 'YUM!'][Math.floor(Math.random() * 4)], 1.2); }
      }
    } else if (e.phase === 'swallow') {         // gulp: a little nod
      jawTarget = 0; nod = 0.05 * Math.sin(Math.min(1, e.t / 0.4) * Math.PI);
      if (e.t > 0.5) {
        const o = e.o, home = o.userData.home;
        if (home) { world.remove(o); const n = makeFood(nextType()); n.userData.home = home; n.position.copy(home); n.scale.setScalar(0.01); n.userData.pop = 0; tray[tray.indexOf(o)] = n; }
        else world.remove(o);
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
      world.add(m); crumbList.push(m);
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

  // ======================= VR: meet him in the headset =======================
  // His head is ~2.4x life size, so in VR `world` shrinks to S and floats ~0.75m
  // in front of you at eye height. A floating panel next to him picks the place
  // and mode, and PLAY hands the same headset session over to the game.
  const S = 0.42;
  const vrRoom = new THREE.Group(); vrRoom.visible = false; scene.add(vrRoom);
  {
    const sky = new THREE.SphereGeometry(15, 32, 16), col = [], c = new THREE.Color(), top = new THREE.Color(0x1f4fbf), bot = new THREE.Color(0x3a2a6a);
    const pa = sky.attributes.position; for (let i = 0; i < pa.count; i++) { c.lerpColors(bot, top, THREE.MathUtils.clamp(pa.getY(i) / 15 + 0.35, 0, 1)); col.push(c.r, c.g, c.b); }
    sky.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    vrRoom.add(new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false })));
    const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 48), new THREE.MeshStandardMaterial({ color: 0x2a2050, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; vrRoom.add(floor);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 48), new THREE.MeshBasicMaterial({ color: 0xffd400 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005; ring.name = 'ring'; vrRoom.add(ring);
    // the big logo behind him
    const lc = document.createElement('canvas'); lc.width = 1024; lc.height = 300; const lg = lc.getContext('2d');
    lg.textAlign = 'center'; lg.font = '900 150px Impact, "Arial Black", sans-serif';
    for (const [txt, y] of [['RONNIE', 135], ['SIMULATOR', 280]]) {
      lg.font = (y > 200 ? '900 120px' : '900 150px') + ' Impact, "Arial Black", sans-serif';
      for (let k = 8; k > 0; k--) { lg.fillStyle = k > 4 ? '#7a2a00' : '#ff7a00'; lg.fillText(txt, 512 + k, y + k); }
      lg.fillStyle = '#ffd400'; lg.fillText(txt, 512, y);
    }
    const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace;
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.4), new THREE.MeshBasicMaterial({ map: lt, transparent: true }));
    logo.name = 'logo'; vrRoom.add(logo);
  }
  // the menu panel
  const PW = 512, PH = 640;
  const pc = document.createElement('canvas'); pc.width = PW; pc.height = PH; const pg = pc.getContext('2d');
  const ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshBasicMaterial({ map: ptex, transparent: true }));
  panel.visible = false; scene.add(panel);
  const BTN = { pp: [16, 128, 96, 82], pn: [400, 128, 96, 82], mp: [16, 262, 96, 82], mn: [400, 262, 96, 82], play: [40, 384, 432, 110], exit: [136, 528, 240, 76] };
  let hover = null, drawnKey = '';
  function drawPanel() {
    const info = (window.menuVR && window.menuVR.info()) || { place: 'THE OYSTERFLEET', mode: 'THE WHOLE SQUAD' };
    const key = info.place + '|' + info.mode + '|' + hover; if (key === drawnKey) return; drawnKey = key;
    const g = pg; g.clearRect(0, 0, PW, PH);
    const rr = (x, y, w, h, r, fill, stroke) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = 6; g.strokeStyle = stroke; g.stroke(); } };
    rr(4, 4, PW - 8, PH - 8, 34, 'rgba(20,14,48,0.92)', '#ffd400');
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const fit = (txt, max, size) => { let f = size; do { g.font = `900 ${f}px "Arial Black", Impact, sans-serif`; f -= 2; } while (g.measureText(txt).width > max && f > 12); };
    const row = (label, y, val, a, b) => {
      g.fillStyle = '#9fb4ff'; fit(label, 400, 24); g.fillText(label, PW / 2, y - 22);
      for (const id of [a, b]) { const [x, yy, w, h] = BTN[id]; rr(x, yy, w, h, 18, hover === id ? '#ffd400' : '#3b2f7a'); g.fillStyle = hover === id ? '#2a1208' : '#fff'; fit(id.endsWith('p') ? '◀' : '▶', 80, 44); g.fillText(id.endsWith('p') ? '◀' : '▶', x + w / 2, yy + h / 2 + 2); }
      g.fillStyle = '#fff'; fit(val, 270, 34); g.fillText(val, PW / 2, y + 41);
    };
    g.fillStyle = '#ffd400'; fit('PICK AND PLAY', 440, 40); g.fillText('PICK AND PLAY', PW / 2, 50);
    row('PLACE', 128, info.place, 'pp', 'pn');
    row('MODE', 262, info.mode, 'mp', 'mn');
    { const [x, y, w, h] = BTN.play; rr(x, y, w, h, 26, hover === 'play' ? '#ffe866' : '#ffd400', '#ff7a00'); g.fillStyle = '#2a1208'; fit('PLAY ➜', 380, 64); g.fillText('PLAY ➜', x + w / 2, y + h / 2 + 3); }
    { const [x, y, w, h] = BTN.exit; rr(x, y, w, h, 20, hover === 'exit' ? '#ff6a6a' : '#5a2030'); g.fillStyle = '#fff'; fit('EXIT VR', 200, 30); g.fillText('EXIT VR', x + w / 2, y + h / 2 + 2); }
    g.fillStyle = '#9fb4ff'; fit('grab the food and feed him!', 440, 22); g.fillText('grab the food and feed him!', PW / 2, PH - 14 - 2);
    ptex.needsUpdate = true;
  }
  const btnAt = (uv) => { const x = uv.x * PW, y = (1 - uv.y) * PH; for (const id in BTN) { const [bx, by, w, h] = BTN[id]; if (x >= bx && x <= bx + w && y >= by && y <= by + h) return id; } return null; };
  // something to point at for "tap him to talk" (cheaper than raycasting the skinned scan)
  const headProxy = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  headProxy.position.set(0, 0.52, 0.06); bust.add(headProxy);

  const xray = new THREE.Raycaster(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const ctrls = [];
  const cmf = new XRControllerModelFactory(), hmf = new XRHandModelFactory();
  for (let i = 0; i < 2; i++) {
    const c = renderer.xr.getController(i);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffd400, transparent: true, opacity: 0.8 }));
    line.scale.z = 2; c.add(line); c.userData.line = line;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd400 })); dot.visible = false; scene.add(dot); c.userData.dot = dot;
    c.addEventListener('selectstart', () => press(c, true));
    c.addEventListener('selectend', () => release(c));
    c.addEventListener('squeezestart', () => press(c, false));
    c.addEventListener('squeezeend', () => release(c));
    c.addEventListener('disconnected', () => release(c));
    scene.add(c); ctrls.push(c);
    const grip = renderer.xr.getControllerGrip(i); grip.add(cmf.createControllerModel(grip)); scene.add(grip);
    const hand = renderer.xr.getHand(i); hand.add(hmf.createHandModel(hand, 'mesh')); scene.add(hand);
  }
  const freeFood = () => tray.filter(o => o.visible && !o.userData.held && !(eating && eating.o === o) && o.userData.pop >= 1);
  const foodOf = (obj) => { while (obj) { if (tray.includes(obj)) return obj; obj = obj.parent; } return null; };
  function press(c, select) {
    if (!running || !renderer.xr.isPresenting || c.userData.held) return;
    c.updateMatrixWorld(); v1.setFromMatrixPosition(c.matrixWorld);
    // reach out and grab food that's right there...
    let best = null, bd = 0.13;
    for (const o of freeFood()) { const d = o.getWorldPosition(v2).distanceTo(v1); if (d < bd) { bd = d; best = o; } }
    // ...or point at it, at the panel, or at him
    if (!best) {
      xray.setFromXRController(c);
      const hits = xray.intersectObjects([...(select ? [panel] : []), ...freeFood(), headProxy], true);
      const h = hits[0];
      if (h && h.object === panel) { const id = btnAt(h.uv); if (id) panelPress(id); return; }
      if (h && h.object === headProxy) { talkT = 1.4; say(onTap && onTap()); return; }
      if (h) best = foodOf(h.object);
    }
    if (best) { best.userData.held = c; c.userData.held = best; c.attach(best); sfx && sfx('pop'); }
  }
  function release(c) {
    const o = c.userData.held; if (!o) return;
    c.userData.held = null; o.userData.held = null; world.attach(o);
  }
  function panelPress(id) {
    const m = window.menuVR; if (!m) return;
    if (id === 'pp') m.step('place', -1); else if (id === 'pn') m.step('place', 1);
    else if (id === 'mp') m.step('mode', -1); else if (id === 'mn') m.step('mode', 1);
    else if (id === 'play') { handing = true; window.__menuVRSession = renderer.xr.getSession(); m.play(); }
    else if (id === 'exit') renderer.xr.getSession() && renderer.xr.getSession().end();
    drawnKey = ''; drawPanel();
  }
  let vrPlace = false, handing = false, vrSession = null;
  function placeVR() {
    const cam = renderer.xr.getCamera(); cam.updateMatrixWorld();
    const p = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion); dir.y = 0; if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1); dir.normalize();
    const right = new THREE.Vector3(-dir.z, 0, dir.x);
    const floorY = p.y > 0.6 ? 0 : p.y - 1.5;      // no floor tracking: assume ~1.5m eyes
    world.scale.setScalar(S);
    world.position.copy(p).addScaledVector(dir, 0.75); world.position.y = p.y - 0.56 * S;
    world.rotation.set(0, Math.atan2(-dir.x, -dir.z), 0);
    vrRoom.position.set(p.x, floorY, p.z);
    const ring = vrRoom.getObjectByName('ring'); ring.position.set(world.position.x - p.x, 0.005, world.position.z - p.z);
    const logo = vrRoom.getObjectByName('logo'); logo.position.set(dir.x * 5, (p.y - floorY) + 1.5, dir.z * 5); logo.lookAt(0, logo.position.y, 0);
    panel.position.copy(p).addScaledVector(dir, 0.62).addScaledVector(right, 0.42); panel.position.y = p.y - 0.12;
    panel.lookAt(p.x, panel.position.y, p.z); panel.rotateX(-0.15);
    vrPlace = false;
  }
  function vrFrame(dt) {
    if (vrPlace) placeVR();
    // he looks at you
    const cam = renderer.xr.getCamera(); v1.setFromMatrixPosition(cam.matrixWorld); world.worldToLocal(v1);
    lookX = THREE.MathUtils.clamp(Math.atan2(v1.x, v1.z) / 0.35, -1.5, 1.5);
    lookY = THREE.MathUtils.clamp(0.1 + Math.atan2(v1.y - 0.56, v1.z) / 0.15, -1, 1);
    const mouthW = world.localToWorld(MOUTH.clone());
    let hv = null;
    for (const c of ctrls) {
      const o = c.userData.held, line = c.userData.line, dot = c.userData.dot;
      dot.visible = false; line.scale.z = 2;
      if (o) {
        line.visible = false;
        o.position.lerp(v2.set(0, -0.01, -0.06), Math.min(1, dt * 10));     // pulls in to your hand
        const d = o.getWorldPosition(v2).distanceTo(mouthW);
        jawTarget = Math.max(jawTarget, 0.25 * smooth(0.16, 0.05, d));
        if (d < 0.07 && !eating) { release(c); eat(o); }
        continue;
      }
      line.visible = true;
      xray.setFromXRController(c);
      const h = xray.intersectObject(panel)[0];
      if (h) { line.scale.z = h.distance; dot.position.copy(h.point); dot.visible = true; hv = hv || btnAt(h.uv); }
    }
    if (hv !== hover) { hover = hv; drawPanel(); }
  }
  async function enterVR() {
    if (!navigator.xr || renderer.xr.isPresenting) return;
    const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'] });
    vrSession = s;
    s.addEventListener('end', () => {
      vrSession = null;
      if (handing) return;                     // the game has it now
      for (const c of ctrls) release(c);
      world.position.set(0, 0, 0); world.rotation.set(0, 0, 0); world.scale.setScalar(1);
      vrRoom.visible = false; panel.visible = false; lookX = lookY = 0;
      fadeU.value.set(-1, -0.9);                // re-fit the flat fade next frame
      document.body.classList.remove('hero-vr');
      if (!holderVisible()) pause();
    });
    renderer.xr.setReferenceSpaceType('local-floor');
    await renderer.xr.setSession(s);
    vrRoom.visible = true; panel.visible = true; vrPlace = true; drawnKey = ''; drawPanel();
    fadeU.value.set(BOTTOM_Y, BOTTOM_Y + 0.12);
    document.body.classList.add('hero-vr');
    running = true; renderer.setAnimationLoop(frame);
  }
  const holderVisible = () => !!holder.offsetParent;
  // a speech bubble over his head (VR only: the page's bubble is behind the headset)
  const bc = document.createElement('canvas'); bc.width = 512; bc.height = 160; const bg = bc.getContext('2d');
  const btex = new THREE.CanvasTexture(bc); btex.colorSpace = THREE.SRGBColorSpace;
  const bubble = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.1125), new THREE.MeshBasicMaterial({ map: btex, transparent: true, depthTest: false }));
  bubble.visible = false; bubble.userData.t = 0; bubble.renderOrder = 5; scene.add(bubble);
  function say(txt, sec = 2.2) {
    if (!txt) return;
    bg.clearRect(0, 0, 512, 160); bg.beginPath(); bg.roundRect(6, 6, 500, 120, 40); bg.moveTo(230, 124); bg.lineTo(256, 156); bg.lineTo(282, 124);
    bg.fillStyle = '#fff'; bg.fill(); bg.lineWidth = 6; bg.strokeStyle = '#2a1208'; bg.stroke();
    bg.fillStyle = '#2a1208'; bg.textAlign = 'center'; bg.textBaseline = 'middle';
    let f = 46; do { bg.font = `900 ${f}px "Arial Black", Impact, sans-serif`; f -= 2; } while (bg.measureText(txt).width > 470 && f > 14);
    bg.fillText(txt, 256, 68); btex.needsUpdate = true;
    world.localToWorld(bubble.position.set(0, 0.98, 0.1)); bubble.userData.t = sec;
  }

  // ---- the loop ----
  let running = true, last = performance.now();
  function frame(now) {
    if (!running) return;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;     // (XR frame times can run on a different clock) t += dt;
    const inVR = renderer.xr.isPresenting;
    if (!inVR && (renderer.domElement.width !== Math.round(W() * renderer.getPixelRatio()) || fadeU.value.x < -0.5)) {
      renderer.setSize(W(), H(), false); camera.aspect = W() / H(); camera.updateProjectionMatrix();
      const rb = new THREE.Raycaster(); rb.setFromCamera(new THREE.Vector2(0, -1), camera); const hb = new THREE.Vector3();
      if (rb.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.1), hb)) fadeU.value.set(hb.y + 0.004, hb.y + 0.055);
    }
    // auto-eat when nobody's playing with him
    if (!eating && !dragging) { idleT -= dt; if (idleT <= 0) { const o = tray[Math.floor(Math.random() * tray.length)]; if (o.userData.pop >= 1 && !o.userData.held) eat(o); else idleT = 0.5; } }
    if (!eating && !dragging && talkT <= 0) jawTarget = 0;
    if (inVR) vrFrame(dt);
    if (bubble.userData.t > 0) { bubble.userData.t -= dt; bubble.visible = inVR && bubble.userData.t > 0; if (bubble.visible) { const cp = renderer.xr.getCamera(); bubble.lookAt(v1.setFromMatrixPosition(cp.matrixWorld)); } }
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
      if (o === dragging || o.userData.held || (eating && eating.o === o)) continue;
      if (o.userData.pop < 1) { o.userData.pop = Math.min(1, o.userData.pop + dt * 3); o.scale.setScalar(TRAY_SCALE * (1 - Math.pow(1 - o.userData.pop, 3))); }
      const h = o.userData.home; o.position.lerp(new THREE.Vector3(h.x, h.y + Math.sin(t * 2 + h.x * 9) * 0.015, h.z), Math.min(1, dt * 6));
      o.userData.spin = (o.userData.spin || Math.random() * 6) + dt * 0.7;
      o.rotation.set(o.userData.type === 'can' ? 0.15 : 0.85, o.userData.spin, 0, 'YXZ');
    }
    for (let i = crumbList.length - 1; i >= 0; i--) { const c = crumbList[i]; c.userData.life -= dt; c.userData.v.y -= 1.4 * dt; c.position.addScaledVector(c.userData.v, dt); c.rotation.x += dt * 9; if (c.userData.life <= 0) { world.remove(c); crumbList.splice(i, 1); } }
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);
  function pause() { if (renderer.xr.isPresenting) return; if (running) { running = false; renderer.setAnimationLoop(null); } }
  function resume() { if (!running) { running = true; last = performance.now(); renderer.setAnimationLoop(frame); } }
  // PLAY in VR: keep drawing him in the headset while the level loads, until the
  // game takes the session over (window.__menuVRRelease, called by main.js)
  window.__menuVRRelease = () => { if (!handing) return; running = false; renderer.setAnimationLoop(null); window.__menuVRRelease = null; };
  return {
    ready: true,
    canvas,
    stop() {
      canvas.remove();
      if (handing && renderer.xr.isPresenting) { panel.visible = false; say('LOADING…', 30); return; }
      running = false; renderer.setAnimationLoop(null); renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss();
    },
    pause, resume,
    enterVR,
    get inVR() { return renderer.xr.isPresenting; },
    talk(sec = 1.4) { talkT = sec; },
    eatNow() { if (!eating) eat(tray[0]); },
    _debug: { set open(v) { jawTarget = v; talkT = 99; jawOpen = v; }, camera, tray, bust, world, panel, renderer, MOUTH },
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
