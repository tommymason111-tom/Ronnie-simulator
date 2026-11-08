// RONNIE SIMULATOR — Phase 1 (WebXR / three.js, runs in the Meta Quest 3 browser).
import * as THREE from 'three';
import { STAGES, FOODS, TUNING } from './config.js';
import { buildRoom } from './room.js';
import { ItemManager } from './foods.js';
import { Crumbs, Words, Tint } from './fx.js';
import { Player } from './player.js';
import { Tommy } from './tommy.js';
import { STAGE_LINES } from './dialogue.js';
import { initAudio, sfx, setListener, setPitchScale, startLocoMusic, stopLocoMusic } from './audio.js';
import { canvasTex, FONT } from './textures.js';

// ---------------- renderer / scene ----------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.xr.setFoveation(1);
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9db7ff);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 40);
camera.position.set(0, 1.6, 0);

const room = buildRoom(scene);
const player = new Player(renderer, scene, camera);
const items = new ItemManager(scene, room);
player.items = items;
const tommy = new Tommy(scene, room);
const crumbs = new Crumbs(scene);
const words = new Words(scene);
const tint = new Tint(camera);

// ---------------- game state ----------------
const G = {
  chonk: 0, stage: 0, eaten: 0, swats: 0,
  locoT: 0, gagT: 0, lastBite: -1, lastEatLine: -10, lastLand: 0,
  scaleFrom: 1, scaleTo: 1, scaleT: 1,
  wristDirty: true, wristT: 0, fps: 72, fpsFrames: 0, fpsT: 0,
};
const clock = new THREE.Clock();
let time = 0;

// starting food: one of each on the snack station, more around the room
[['burger', 0], ['pizza', 1], ['doughnut', 2], ['can', 3]].forEach(([t, i]) => items.spawn(t, room.spawns[i]));
['burger', 'pizza', 'doughnut', 'can', 'burger', 'doughnut'].forEach(t => items.spawn(t, items.freeSpawn()));

// ---------------- events ----------------
items.onLand = (it, speed) => {
  if (time - G.lastLand < 0.08) return;
  G.lastLand = time;
  sfx(it.type === 'can' ? 'clink' : 'thud', it.pos, Math.min(1, speed / 4));
};
items.onSpawn = () => sfx('pop', null, 0.15);
player.onGrab = (it) => {
  sfx('pop', it.pos, 0.3);
  if (it.thrownByTommy) { words.show('CAUGHT!', it.pos.clone().add(new THREE.Vector3(0, 0.15, 0)), '#7cff6a', 0.22); it.thrownByTommy = false; }
};
player.onRelease = (it, h, sp) => { if (sp > 2.5) sfx('whoosh', it.pos, Math.min(1, sp / 6)); };

tommy.onThrow = (start, vel) => {
  const b = items.spawn('broccoli', start, vel);
  b.thrownByTommy = true;
  b.spin.set(6, 3, 2);
};

const SNACK_SFX = { burger: 'chomp', pizza: 'crunch', doughnut: 'squish' };
const SNACK_WORD = { burger: ['CHOMP!', 'MUNCH!', 'NOM!'], pizza: ['CRUNCH!', 'MUNCH!'], doughnut: ['SQUISH!', 'NOM NOM!'] };
const CRUMB_COLORS = {
  burger: [0xd9933f, 0x5a2e14, 0x4caf3c, 0xffc21a, 0xe0a04a],
  pizza: [0xf2b233, 0xc9852f, 0xb3261e, 0xffe08a],
  doughnut: [0xff6fae, 0xd9a05b, 0x3fc1ff, 0xfff04a, 0xffffff],
  broccoli: [0x2e7d32, 0x9ccc65, 0x1b5e20],
  can: [0xff9a1f, 0xffe94d],
};
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion();

function addChonk(n) {
  G.chonk = Math.max(STAGES[G.stage].chonk, G.chonk + n);
  while (G.stage < STAGES.length - 1 && G.chonk >= STAGES[G.stage + 1].chonk) stageUp();
  G.wristDirty = true;
}

function bite(it, hand) {
  if (time - G.lastBite < TUNING.biteCooldown) return;
  G.lastBite = time;
  const fx = _a.copy(player.mouth).addScaledVector(player.fwd, 0.12 * player.scale);
  if (it.def.veg) { gag(it); return; }
  it.bitesLeft--;
  sfx(SNACK_SFX[it.type], fx, 1);
  crumbs.burst(fx, CRUMB_COLORS[it.type], 26, 1.5, player.fwd);
  const w = SNACK_WORD[it.type];
  words.show(w[Math.floor(Math.random() * w.length)], _b.copy(player.head).addScaledVector(player.fwd, 0.7 * player.scale).add({ x: 0, y: 0.05, z: 0 }), '#ffd400', 0.12 * player.scale);
  hand && hand.pulse(0.9, 70);
  addChonk((it.def.chonk / it.def.bites) * (G.locoT > 0 ? TUNING.locoMultiplier : 1));
  if (it.bitesLeft <= 0) {
    setTimeout(() => sfx('gulp', null, 1), 220);
    items.remove(it);
    items.queueRespawn(it.type);
    G.eaten++;
    if (time - G.lastEatLine > 7 && Math.random() < 0.6) { G.lastEatLine = time; setTimeout(() => tommy.say('eat'), 700); }
  } else {
    it.obj.scale.setScalar(0.55 + 0.45 * it.eatFraction);
  }
}

function gag(veg) {
  items.remove(veg);
  G.gagT = TUNING.gagTime;
  addChonk(FOODS.broccoli.chonk);
  sfx('bleurgh', null, 1);
  crumbs.burst(_a.copy(player.mouth).addScaledVector(player.fwd, 0.1), CRUMB_COLORS.broccoli, 30, 1.8, player.fwd);
  words.show('BLEURGH!', _b.copy(player.head).addScaledVector(player.fwd, 0.8 * player.scale), '#7cff6a', 0.15 * player.scale, 1.4);
  player.hands.forEach(h => h.pulse(1, 200));
  setTimeout(() => tommy.say('vegEaten'), 600);
}

function drinkUpdate(it, hand, dt) {
  if (it.empty) return;
  _a.set(0, 1, 0).applyQuaternion(it.obj.quaternion);
  const tilt = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(_a.y, -1, 1)));
  const near = it.pos.distanceTo(player.mouth) < (TUNING.mouthRadius + 0.06) * player.scale;
  if (!near) return;
  if (!it.opened) { it.opened = true; sfx('psst', it.pos, 1); hand && hand.pulse(0.6, 120); }
  if (tilt < TUNING.chugTiltDeg) return;
  const before = it.chug;
  it.chug += dt;
  if (Math.floor(before / 0.3) !== Math.floor(it.chug / 0.3)) { sfx('slurp', null, 0.9); hand && hand.pulse(0.4, 40); }
  if (it.chug >= TUNING.chugTime) finishCan(it);
}

function finishCan(it) {
  it.empty = true;
  sfx('gulp', null, 1);
  setTimeout(() => sfx('trumpet', null, 1), 250);
  addChonk(it.def.chonk);
  startLoco();
  words.show('MANGO LOCO!', _b.copy(player.head).addScaledVector(player.fwd, 0.9 * player.scale), '#ff9a1f', 0.15 * player.scale, 1.6);
  G.eaten++;
  items.queueRespawn('can', 8);
  setTimeout(() => tommy.say('drink'), 900);
}

function startLoco() {
  G.locoT = TUNING.locoDuration;
  startLocoMusic(TUNING.locoDuration);
  room.hemi.color.set(0xffb070);
  G.wristDirty = true;
}

function stageUp() {
  G.stage++;
  const st = STAGES[G.stage];
  G.scaleFrom = player.scale; G.scaleTo = st.scale; G.scaleT = 0;
  player.setBelly(st.belly);
  setPitchScale(1 / Math.pow(st.scale, 0.8));
  sfx('bwoomp', null, 1); sfx('fanfare', null, 1);
  showBanner(`STAGE ${G.stage + 1}`, st.name.toUpperCase());
  player.hands.forEach(h => h.pulse(1, 300));
  tommy.say(STAGE_LINES[G.stage + 1] || "You're getting bigger, Ron. Still younger though.", 5);
}

// ---------------- stage-up banner ----------------
const bannerCanvas = document.createElement('canvas'); bannerCanvas.width = 1024; bannerCanvas.height = 384;
const bannerTex = new THREE.CanvasTexture(bannerCanvas); bannerTex.colorSpace = THREE.SRGBColorSpace;
const banner = new THREE.Sprite(new THREE.SpriteMaterial({ map: bannerTex, transparent: true, depthTest: false, depthWrite: false }));
banner.renderOrder = 15; banner.visible = false; scene.add(banner);
let bannerT = 0;
function showBanner(top, big) {
  const g = bannerCanvas.getContext('2d'), w = 1024, h = 384;
  g.clearRect(0, 0, w, h);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.font = `900 70px ${FONT}`; g.lineWidth = 16; g.strokeStyle = '#111'; g.strokeText(top, w / 2, 90); g.fillStyle = '#39ff14'; g.fillText(top, w / 2, 90);
  let size = 130; g.font = `900 ${size}px ${FONT}`;
  while (g.measureText(big).width > w - 60 && size > 40) { size -= 6; g.font = `900 ${size}px ${FONT}`; }
  g.lineWidth = 22; g.strokeText(big, w / 2, 240); g.fillStyle = '#ffd400'; g.fillText(big, w / 2, 240);
  bannerTex.needsUpdate = true;
  bannerT = 2.6; banner.visible = true;
}

// ---------------- broccoli & thrown food ----------------
// Distance from point p to the segment a→b (the path an item moved this frame).
const _seg = new THREE.Vector3(), _ap = new THREE.Vector3();
function segDist(p, a, b) {
  _seg.subVectors(b, a); _ap.subVectors(p, a);
  const l2 = _seg.lengthSq();
  const t = l2 > 1e-8 ? THREE.MathUtils.clamp(_ap.dot(_seg) / l2, 0, 1) : 0;
  return _ap.addScaledVector(_seg, -t).length();
}
function vegAndHits(dt) {
  for (let i = items.items.length - 1; i >= 0; i--) {
    const it = items.items[i];
    if (it.dead || it.heldBy || it.resting) continue;
    // Tommy's broccoli coming at you
    if (it.thrownByTommy) {
      let handled = false;
      for (const h of player.hands) {
        if (!h.tracked) continue;
        const reach = (h.held ? h.held.radius + 0.05 : 0.1) * Math.max(1, player.scale) + it.radius;
        const hp = h.held ? h.held.pos : h.palm;
        if (segDist(hp, it.prev, it.pos) > reach) continue;
        if (h.speed > TUNING.swatSpeed) {        // SWAT
          it.vel.copy(h.vel).multiplyScalar(1.6); it.vel.y += 1.2;
          it.spin.set(20, 14, 9);
          sfx('thwack', it.pos, 1);
          words.show('THWACK!', it.pos.clone().add({ x: 0, y: 0.15, z: 0 }), '#7cff6a', 0.22 * player.scale);
          G.swats++; G.wristDirty = true;
          setTimeout(() => tommy.say('vegSwat'), 450);
        } else {                                  // BLOCK
          it.vel.multiplyScalar(-0.3);
          sfx('thud', it.pos, 0.8);
          words.show('BLOCKED!', it.pos.clone().add({ x: 0, y: 0.12, z: 0 }), '#ffffff', 0.16 * player.scale);
        }
        h.pulse(1, 90);
        it.thrownByTommy = false; it.thrownByPlayer = true; it.swatted = true;
        handled = true; break;
      }
      if (!handled && segDist(player.head, it.prev, it.pos) < 0.17 * player.scale + it.radius) { gag(it); continue; }
    }
    // anything Ronnie throws at Tommy knocks him over
    if (it.thrownByPlayer && it.vel.lengthSq() > 1.5 * 1.5 && tommy.hitTest(it.pos, it.radius)) {
      const veg = it.type === 'broccoli';
      _a.copy(it.vel).setY(0).normalize();
      tommy.knockDown(_a, veg);
      sfx('splat', it.pos, 1);
      words.show(veg ? 'RETURN TO SENDER!' : ['SPLAT!', 'WALLOP!', 'POW!'][Math.floor(Math.random() * 3)], it.pos.clone().add({ x: 0, y: 0.3, z: 0 }), veg ? '#7cff6a' : '#ff5a36', 0.25, 1.3);
      it.vel.multiplyScalar(-0.25);
      it.thrownByPlayer = false;
    }
  }
}

// ---------------- flat-screen (iPad / desktop) preview controls ----------------
let yaw = 0, pitch = -0.45, dragging = false, moved = 0, lastX = 0, lastY = 0;
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', (e) => { initAudio(); dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; });
window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
  moved += Math.abs(dx) + Math.abs(dy);
  yaw -= dx * 0.005; pitch = THREE.MathUtils.clamp(pitch - dy * 0.005, -1.3, 1.3);
});
window.addEventListener('pointerup', (e) => {
  if (!dragging) return; dragging = false;
  if (moved > 10 || renderer.xr.isPresenting) return;
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  let best = null, bd = Infinity;
  for (const it of items.items) {
    const d = raycaster.ray.distanceSqToPoint(it.pos);
    const along = _a.subVectors(it.pos, raycaster.ray.origin).dot(raycaster.ray.direction);
    if (along > 0 && d < (it.radius + 0.06) ** 2 && along < bd) { bd = along; best = it; }
  }
  if (!best) return;
  if (best.thrownByTommy) {     // tap to swat
    best.vel.copy(raycaster.ray.direction).multiplyScalar(5); best.vel.y += 2;
    best.thrownByTommy = false; best.thrownByPlayer = true;
    sfx('thwack', best.pos, 1); words.show('THWACK!', best.pos.clone(), '#7cff6a', 0.22);
    G.swats++; G.wristDirty = true; setTimeout(() => tommy.say('vegSwat'), 450);
  } else if (best.type === 'can') { if (!best.empty) { sfx('psst', null, 1); finishCan(best); } }
  else { G.lastBite = -1; bite(best, null); }
});

// ---------------- Enter VR ----------------
const vrBtn = document.getElementById('enter-vr');
const status = document.getElementById('status');
async function setupVR() {
  if (!('xr' in navigator)) { vrBtn.textContent = 'NO VR HERE'; status.textContent = 'WebXR not available here — open this page in the Meta Quest browser. You can still look around: drag to look, tap food to eat.'; return; }
  const ok = await navigator.xr.isSessionSupported('immersive-vr').catch(() => false);
  if (!ok) { vrBtn.textContent = 'NO VR HERE'; status.textContent = 'VR not supported on this device — this is the flat preview. Drag to look, tap food to eat, tap broccoli to swat.'; return; }
  vrBtn.disabled = false; vrBtn.textContent = 'ENTER VR';
  status.textContent = 'Ready! Put the headset on and press ENTER VR.';
  let session = null;
  vrBtn.addEventListener('click', async () => {
    initAudio();
    if (session) { session.end(); return; }
    try {
      session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'] });
      session.addEventListener('end', () => { session = null; vrBtn.textContent = 'ENTER VR'; document.body.classList.remove('in-vr'); camera.position.set(0, 1.6, 0); });
      await renderer.xr.setSession(session);
      vrBtn.textContent = 'EXIT VR';
      document.body.classList.add('in-vr');
    } catch (err) { status.textContent = 'Could not start VR: ' + err.message; session = null; }
  });
}
setupVR();
document.getElementById('sound').addEventListener('click', () => { initAudio(); sfx('chomp'); });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------- main loop ----------------
function elasticOut(t) { return t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1; }

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  time += dt;
  const xr = renderer.xr.isPresenting;

  if (!xr) { camera.position.set(0, 1.6, 0); camera.rotation.set(pitch, yaw, 0, 'YXZ'); }

  // growth tween (0.6s elastic "boing")
  if (G.scaleT < 1) {
    G.scaleT = Math.min(1, G.scaleT + dt / 0.6);
    player.setScale(G.scaleFrom + (G.scaleTo - G.scaleFrom) * elasticOut(G.scaleT));
  }

  player.update(dt, time);

  // eating & drinking held food
  for (const h of player.hands) {
    const it = h.held;
    if (!it || it.dead) continue;
    if (it.def.drink) { drinkUpdate(it, h, dt); continue; }
    if (it.pos.distanceTo(player.mouth) < TUNING.mouthRadius * player.scale + it.radius * 0.5) bite(it, h);
  }

  items.update(dt);
  vegAndHits(dt);
  tommy.update(dt, player.head, player.fwd, player.mouth);

  // timers & tint
  if (G.locoT > 0) {
    G.locoT -= dt; if (Math.floor((G.locoT + dt) * 10) !== Math.floor(G.locoT * 10)) G.wristDirty = true;
    if (G.locoT <= 0) { G.locoT = 0; stopLocoMusic(); room.hemi.color.set(0xc9d6ff); G.wristDirty = true; }
  }
  if (G.gagT > 0) G.gagT -= dt;
  if (G.gagT > 0) tint.set(0x2bd62b, 0.35 * Math.min(1, G.gagT));
  else if (G.locoT > 0) tint.set(0xff8a00, 0.13 + Math.sin(time * 8) * 0.03);
  else tint.set(0xff8a00, 0);
  tint.update(dt);

  crumbs.update(dt);
  words.update(dt);
  room.update(dt);

  if (bannerT > 0) {
    bannerT -= dt;
    const k = 2.6 - bannerT;
    const pop = k < 0.25 ? k / 0.25 * 1.15 : 1.15 - Math.min(0.15, (k - 0.25));
    banner.scale.set(1.2 * pop * player.scale, 0.45 * pop * player.scale, 1);
    banner.position.copy(player.head).addScaledVector(player.fwd, 1.3 * player.scale);
    banner.material.opacity = bannerT < 0.4 ? bannerT / 0.4 : 1;
    if (bannerT <= 0) banner.visible = false;
  }

  // fps (shown on the wrist so you can check you're at 72)
  G.fpsFrames++; G.fpsT += dt;
  if (G.fpsT >= 1) { G.fps = Math.round(G.fpsFrames / G.fpsT); G.fpsFrames = 0; G.fpsT = 0; G.wristDirty = true; }
  G.wristT -= dt;
  if (G.wristDirty && G.wristT <= 0) {
    G.wristDirty = false; G.wristT = 0.1;
    const max = G.stage === STAGES.length - 1;
    const cur = STAGES[G.stage].chonk, next = max ? cur : STAGES[G.stage + 1].chonk;
    player.drawWrist({
      stage: G.stage, stages: STAGES.length, name: STAGES[G.stage].name, chonk: G.chonk, next, max,
      fill: max ? 1 : (G.chonk - cur) / (next - cur), loco: G.locoT, eaten: G.eaten, swats: G.swats, fps: G.fps,
    });
  }

  _b.set(0, 1, 0).applyQuaternion(camera.getWorldQuaternion(_q));
  setListener(player.head, player.fwd, _b);

  renderer.render(scene, camera);
});

// Debug handle for testing in a desktop browser console.
window.RS = { G, player, items, tommy, addChonk, scene, renderer };
