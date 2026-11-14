// RONNIE SIMULATOR — Phase 1 (WebXR / three.js, runs in the Meta Quest 3 browser,
// and on phones / tablets / computers with on-screen controls).
import * as THREE from 'three';
import { STAGES, FOODS, TUNING, JUNK_TYPES, pickJunk } from './config.js';
import { buildRoom } from './room.js';
import { ItemManager } from './foods.js';
import { Crumbs, Words, Tint } from './fx.js';
import { Player } from './player.js';
import { Tommy } from './tommy.js';
import { STAGE_LINES } from './dialogue.js';
import { AttackFX } from './attackfx.js';
import { initAudio, sfx, setListener, setPitchScale, startLocoMusic, stopLocoMusic, setAmbience, setMuted } from './audio.js';
import { FONT } from './textures.js';
import { createPhysics } from './physics.js';
import { setupTouch } from './touch.js';
import { Director, MODES } from './modes.js';
import { buildPub } from './levels/pub.js';
import { buildSupermarket } from './levels/supermarket.js';
import { buildRestaurant } from './levels/restaurant.js';
import { preloadModels } from './ragdoll.js';
import { SQUAD } from './squad.js';
import { buildGarden } from './levels/garden.js';

// start downloading everyone's 3D model now, while the menu is still up
const MODEL_LOAD = preloadModels(['./assets/tommy.glb', ...Object.values(SQUAD).map(d => d.model).filter(Boolean)]);
// wait for the start screen: where are we playing, and what mode?
const SEL = await (window.ronnieMenu || Promise.resolve({ place: 'pub', mode: 'everyone' }));
// ...and make sure everyone's actually arrived before the game starts (so nobody's invisible)
{ const st = document.getElementById('status'); let done = false;
  setTimeout(() => { if (!done && st) st.textContent = 'Getting the squad ready…'; }, 400);
  await Promise.race([MODEL_LOAD, new Promise(r => setTimeout(r, 25000))]); done = true; }

// ---------------- renderer / scene ----------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
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

const BUILD = { bedroom: buildRoom, pub: buildPub, shop: buildSupermarket, restaurant: buildRestaurant, garden: buildGarden };
const room = (BUILD[SEL.place] || buildRoom)(scene);
if (room.shadows) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }     // sunny places get real sun shadows
room.placeId = BUILD[SEL.place] ? SEL.place : 'bedroom';
room.start = room.start || { x: 0.05, z: 0.45, yaw: 0 };
// Tommy turns up a few metres from where you start
if (room.big) room.tommySpots.sort((a, b) => Math.abs(Math.hypot(a.x - room.start.x, a.y - room.start.z) - 3) - Math.abs(Math.hypot(b.x - room.start.x, b.y - room.start.z) - 3));
const player = new Player(renderer, scene, camera);
player.rig.position.set(room.start.x, 0, room.start.z);
player.rig.rotation.y = room.start.yaw;
const items = new ItemManager(scene, room);
player.items = items;
for (const gm of room.games || []) gm.attach(items, player);     // darts, table tennis... (words hooked up below)
const physics = createPhysics(room);
const tommy = new Tommy(scene, room, physics);
tommy.load();
player.setPhysics(physics);
const cast = [tommy];          // Tommy + whichever squad members the mode brings
player.cast = cast;
player.room = room;
const crumbs = new Crumbs(scene);
const words = new Words(scene);
for (const gm of room.games || []) gm.words = words;
const attackFx = new AttackFX(scene, camera, player);
const tint = new Tint(camera);

// ---------------- game state ----------------
setAmbience(SEL.place, () => player.head);   // starts as soon as sound is allowed (first tap)
const G = {
  chonk: 0, stage: 0, eaten: 0, swats: 0,
  locoT: 0, stoutT: 0, gagT: 0, lastBite: -1, lastEatLine: -10, lastLand: 0,
  scaleFrom: 1, scaleTo: 1, scaleT: 1,
  wristDirty: true, wristT: 0, fps: 72, fpsFrames: 0, fpsT: 0,
};
const clock = new THREE.Clock();
let time = 0;

// starting food: one of each on the snack station, more around the room
if (room.startFood) room.startFood.forEach(t => items.spawn(t, items.freeSpawn()));
// special things placed by the level (the poop in the Oysterfleet toilet)
const placeExtras = () => (room.extraItems || []).forEach(e => { if (items.items.some(i => i.type === e.type && !i.dead)) return; const it = items.spawn(e.type, e.pos); it.spawnScale = 1; it.obj.scale.setScalar(1); });
placeExtras();
// fruit machines pay out in food: a little burst of it, flying out of the tray at you
room.onPayout = (m) => {
  sfx('fanfare', m.front, 1); words.show('JACKPOT!', m.front.clone().add({ x: 0, y: 0.7, z: 0 }), '#ffd400', 0.22, 1.4);
  for (let i = 0; i < 4; i++) setTimeout(() => {
    const dir = _a.set(player.head.x - m.tray.x, 0, player.head.z - m.tray.z).normalize();
    const it = items.spawn(i % 2 ? m.win.food : pickJunk(), m.tray.clone(), new THREE.Vector3(dir.x * 2.2 + (Math.random() - 0.5) * 0.8, 2.2 + Math.random(), dir.z * 2.2 + (Math.random() - 0.5) * 0.8));
    it.spawnScale = 1; it.obj.scale.setScalar(1); sfx('pop', m.tray, 0.8);
  }, 150 + i * 160);
};
// big places: loads more food, every kind, and it keeps topping up
if (room.big) {
  for (let i = 0; i < 26; i++) items.spawn(JUNK_TYPES[i % JUNK_TYPES.length], items.freeSpawn());
  items.respawnDelay = 1.5;
  items.minFood = 44;
}
else {
  [['burger', 0], ['pizza', 1], ['doughnut', 2], ['can', 3]].forEach(([t, i]) => items.spawn(t, room.spawns[i]));
  ['burger', 'pizza', 'doughnut', 'can', 'burger', 'doughnut'].forEach(t => items.spawn(t, items.freeSpawn()));
}

// ---------------- events ----------------
items.onLand = (it, speed) => {
  if (time - G.lastLand < 0.08) return;
  G.lastLand = time;
  sfx(it.type === 'can' ? 'clink' : 'thud', it.pos, Math.min(1, speed / 4));
};
items.onSpawn = () => sfx('pop', null, 0.15);
player.onGrab = (it) => {
  // Supermarket Sweep: straight into the trolley
  if (director.running && director.mode === 'sweep' && !it.incoming && !it.def.prop) { const h = it.heldBy; if (h) h.held = null; it.heldBy = null; director.sweepGrab(it); return; }
  sfx('pop', it.pos, 0.3);
  if (it.incoming) {
    words.show('CAUGHT!', it.pos.clone().add(new THREE.Vector3(0, 0.15, 0)), '#7cff6a', 0.22);
    if (it.foodPass) { director.onCaught(); it.thrower && setTimeout(() => it.thrower.say('caught', 4), 400); }
    it.incoming = false;
  }
};
player.onRelease = (it, h, sp) => { if (sp > 2.5) sfx('whoosh', it.pos, Math.min(1, sp / 6)); };

// anyone throwing anything at Ronnie
function onThrow(start, vel, type, who, spec) {
  const b = items.spawn(type, start, vel);
  b.incoming = true; b.thrower = who; b.foodPass = !!(spec && spec.food); b.temp = !b.foodPass || true;
  b.spin.set(6, 3, 2);
  return b;
}
tommy.onThrow = onThrow;
tommy.onTrip = (t) => director.stun(t, 'tommy');
tommy.onTripAnnounce = (t) => director.announce(t, 'trip');
tommy.canTrip = () => director.canAttack(tommy, 'trip');   // he waits his turn like everyone else

const SNACK_SFX = { burger: 'chomp', pizza: 'crunch', doughnut: 'squish', hotdog: 'chomp', fries: 'crunch', kebab: 'chomp', chicken: 'crunch', taco: 'crunch', crisps: 'crunch', choc: 'crunch', cookie: 'crunch', icecream: 'squish', sausageroll: 'chomp' };
const SNACK_WORD = { burger: ['CHOMP!', 'MUNCH!', 'NOM!'], pizza: ['CRUNCH!', 'MUNCH!'], doughnut: ['SQUISH!', 'NOM NOM!'],
  hotdog: ['CHOMP!', 'DOG DOWN!'], fries: ['CRUNCH!', 'CHIPPY!'], kebab: ['DONER!', 'CHOMP!', '3AM VIBES!'], chicken: ['CRUNCH!', 'FINGER LICKIN!'], taco: ['CRUNCH!', 'TACO TIME!'],
  crisps: ['CRUNCH!', 'RUSTLE!'], choc: ['SNAP!', 'NOM!'], cookie: ['CRUNCH!', 'NOM!'], icecream: ['BRAIN FREEZE!', 'SLURP!'], sausageroll: ['FLAKY!', 'CHOMP!'] };
const CRUMB_COLORS = {
  burger: [0xd9933f, 0x5a2e14, 0x4caf3c, 0xffc21a, 0xe0a04a],
  pizza: [0xf2b233, 0xc9852f, 0xb3261e, 0xffe08a],
  doughnut: [0xff6fae, 0xd9a05b, 0x3fc1ff, 0xfff04a, 0xffffff],
  broccoli: [0x2e7d32, 0x9ccc65, 0x1b5e20],
  carrot: [0xff7a1a, 0x3fa34d], celery: [0x9ccc65, 0x6aaa3a], sprout: [0x7cb342, 0x9ccc65],
  can: [0xff9a1f, 0xffe94d],
  hotdog: [0xe0a04a, 0xa8442a, 0xffd21a, 0xd8352a], fries: [0xffcf40, 0xf0b020, 0xd32f2f], kebab: [0xf1d9a8, 0x8b4a2b, 0x6fbf3f, 0xd8352a],
  chicken: [0xc7782a, 0xa85d1c, 0xf3ead8], taco: [0xf2c14e, 0x7a3b1a, 0x6fbf3f, 0xffd21a], crisps: [0xffe08a, 0xf2c14e, 0x1565c0],
  choc: [0x5b3a1e, 0x6e4626, 0x6a1b9a], cookie: [0xc98b4a, 0x3b2412], icecream: [0xffc0d8, 0xfff3d6, 0xd9a05b], sausageroll: [0xe8b25a, 0xc98060, 0xb7782a],
  apple: [0xd62828, 0xfff3d6], pear: [0x9ccc3a, 0xf3f0c0], orange: [0xff8c1a, 0xffc04a], banana: [0xffe135, 0xfff6c8], tomato: [0xe53935, 0xffc107],
  cucumber: [0x2f6b2a, 0xc5e1a5], pepper: [0xd32f2f, 0xffffff], cauliflower: [0xf5f0dc, 0x6aaa3a],
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
  if (!player.canEat) {          // on a diet / fizzed up / flat on the floor
    words.show(player.fx.noEat > 0 ? 'NOT ALLOWED!' : 'CAN\'T!', _b.copy(player.head).addScaledVector(player.fwd, 0.7 * player.scale), '#ff5252', 0.1 * player.scale, 0.8);
    return;
  }
  const fx = _a.copy(player.mouth).addScaledVector(player.fwd, 0.12 * player.scale);
  if (it.def.prop) { words.show(it.def.dart ? 'THAT\'S A DART, RON' : 'THAT\'S A BAT, RON', _b.copy(player.head).addScaledVector(player.fwd, 0.7 * player.scale), '#ff5252', 0.08 * player.scale, 1); return; }
  if (it.def.veg) { gag(it); return; }
  if (it.def.poop) { poopOver(it); return; }
  it.bitesLeft--;
  sfx(SNACK_SFX[it.type], fx, 1);
  crumbs.burst(fx, CRUMB_COLORS[it.type], 26, 1.5, player.fwd);
  const w = SNACK_WORD[it.type];
  words.show(w[Math.floor(Math.random() * w.length)], _b.copy(player.head).addScaledVector(player.fwd, 0.7 * player.scale).add({ x: 0, y: 0.05, z: 0 }), '#ffd400', 0.12 * player.scale);
  hand && hand.pulse(0.9, 70);
  const amount = (it.def.chonk / it.def.bites) * chonkMul();
  addChonk(amount);
  director.onAte(it, amount);
  if (it.bitesLeft <= 0) {
    setTimeout(() => sfx('gulp', null, 1), 220);
    items.remove(it);
    if (!it.foodPass && !it.fromClutter) items.queueRespawn(it.type);
    G.eaten++;
    director.onFinished(it);
    if (time - G.lastEatLine > 7 && Math.random() < 0.6) { G.lastEatLine = time; setTimeout(() => tommy.say('eat'), 700); }
  } else {
    it.obj.scale.setScalar(0.55 + 0.45 * it.eatFraction);
  }
}

function chonkMul() { return (G.locoT > 0 ? TUNING.locoMultiplier : 1) * (G.stoutT > 0 ? 2 : 1); }

// Harry's pass lands in Ronnie's mouth: the whole thing goes down in one, +50%
function eatWhole(it) {
  const amount = it.def.chonk * 1.5 * chonkMul();
  addChonk(amount); director.onAte(it, amount); director.onCaught();
  const fx = _a.copy(player.mouth).addScaledVector(player.fwd, 0.12 * player.scale);
  sfx('chomp', fx, 1); setTimeout(() => sfx('gulp', null, 1), 200);
  crumbs.burst(fx, CRUMB_COLORS[it.type] || CRUMB_COLORS.burger, 30, 1.7, player.fwd);
  words.show('IN THE MOUTH! x1.5', _b.copy(player.head).addScaledVector(player.fwd, 0.75 * player.scale).add({ x: 0, y: 0.08, z: 0 }), '#ffd400', 0.13 * player.scale, 1.3);
  player.hands.forEach(h => h.pulse(0.8, 90));
  items.remove(it);
  G.eaten++;
  if (it.thrower) setTimeout(() => it.thrower.say('caught', 4), 500);
}

// Ronnie tried to eat the poop. Red screen, GAME OVER, start again.
function poopOver(it) {
  if (G.poopT > 0) return;
  items.remove(it);
  G.poopT = 4.5;
  sfx('bleurgh', null, 1);
  player.hands.forEach(h => h.pulse(1, 400));
  showBanner("NOOO, DON'T EAT THAT!", 'GAME OVER');
  setTimeout(() => tommy.say('RONNIE! THAT WAS FROM THE TOILET! Game over. GAME OVER.', 5), 700);
  setTimeout(() => {
    director.end();
    resetRonnie();
    setTimeout(placeExtras, 6000);
  }, 3500);
}

function gag(veg) {
  const thrower = veg.thrower;
  director.onVegEaten();
  items.remove(veg);
  G.gagT = TUNING.gagTime;
  addChonk(veg.def.chonk || FOODS.broccoli.chonk);
  sfx('bleurgh', null, 1);
  crumbs.burst(_a.copy(player.mouth).addScaledVector(player.fwd, 0.1), CRUMB_COLORS[veg.type] || CRUMB_COLORS.broccoli, 30, 1.8, player.fwd);
  words.show('BLEURGH!', _b.copy(player.head).addScaledVector(player.fwd, 0.8 * player.scale), '#7cff6a', 0.15 * player.scale, 1.4);
  player.hands.forEach(h => h.pulse(1, 200));
  setTimeout(() => (thrower && thrower !== tommy && thrower.banks.vegEaten ? thrower : tommy).say('vegEaten'), 600);
}

// How close the nearest bit of an item is to Ronnie's mouth (not its centre: a
// pizza held by the crust has its middle a long way from the tip you bite).
const _bc = new THREE.Vector3();
function mouthGap(it) {
  if (it.bsR === undefined) {
    let m = null; it.obj.traverse(o => { if (!m && o.isMesh && o.geometry) m = o; });
    const g = m && m.geometry; if (g && !g.boundingSphere) g.computeBoundingSphere();
    it.bsC = g ? g.boundingSphere.center.clone() : new THREE.Vector3(); it.bsR = g ? g.boundingSphere.radius : it.radius;
    if (it.type === 'can') { it.bsC.set(0, 0, 0); it.bsR = 0.08; }
  }
  it.obj.updateMatrixWorld(true);
  _bc.copy(it.bsC).applyMatrix4(it.obj.matrixWorld);
  return Math.max(0, _bc.distanceTo(player.mouth) - it.bsR * 0.8 * it.obj.scale.x);
}

function drinkUpdate(it, hand, dt) {
  if (it.empty) return;
  _a.set(0, 1, 0).applyQuaternion(it.obj.quaternion);
  const tilt = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(_a.y, -1, 1)));
  const near = mouthGap(it) < (TUNING.mouthRadius + 0.03) * player.scale;
  if (!near) return;
  if (!it.opened) { it.opened = true; sfx('psst', it.pos, 1); hand && hand.pulse(0.6, 120); }
  if (tilt < TUNING.chugTiltDeg) return;
  const before = it.chug;
  it.chug += dt;
  if (Math.floor(before / 0.3) !== Math.floor(it.chug / 0.3)) { sfx('slurp', null, 0.9); hand && hand.pulse(0.4, 40); }
  if (it.chug >= TUNING.chugTime) finishDrink(it);
}

function finishDrink(it) {
  it.empty = true;
  sfx('gulp', null, 1);
  const say = (who, bank) => who && setTimeout(() => who.say(bank, 4), 900);
  const at = _b.copy(player.head).addScaledVector(player.fwd, 0.9 * player.scale);
  let amount = it.def.chonk;
  if (it.def.stout) {          // Aidan's pint: STOUT MODE — cosy amber slow-mo, x2 Chonk
    const settled = it.placedAt && performance.now() - it.placedAt > 10000;
    if (settled) { amount += 15; words.show('PATIENCE BONUS', at.clone().add({ x: 0, y: 0.15, z: 0 }), '#f3e6c8', 0.12 * player.scale, 1.6); }
    G.stoutT = 10; G.wristDirty = true;
    words.show('STOUT MODE!', at, '#f3e6c8', 0.15 * player.scale, 1.6);
    say(it.placedBy, settled ? 'drank' : 'snap');
  } else if (it.def.shake) {   // Lewis's protein: makes you grow FASTER
    amount *= 1.5;
    words.show('BULKING!', at, '#e53935', 0.15 * player.scale, 1.6);
    say(it.placedBy || cast.find(c => c.id === 'lewis'), 'shake');
  } else if (it.def.beer) {    // a lager from Lewis's mess
    words.show(['CHEERS!', 'GET IT DOWN YA!', 'WARM. STILL GOOD.'][Math.floor(Math.random() * 3)], at, '#ffd400', 0.13 * player.scale, 1.4);
  } else {
    setTimeout(() => sfx('trumpet', null, 1), 250);
    startLoco();
    words.show('MANGO LOCO!', at, '#ff9a1f', 0.15 * player.scale, 1.6);
    if (!it.fromClutter) items.queueRespawn('can', 8);
    setTimeout(() => tommy.say('drink'), 900);
  }
  addChonk(amount);
  director.onAte(it, amount); director.onFinished(it);
  G.eaten++;
}
function finishCan(it) { finishDrink(it); }

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
  let ts = 70; g.font = `900 ${ts}px ${FONT}`; while (g.measureText(top).width > w - 60 && ts > 30) { ts -= 4; g.font = `900 ${ts}px ${FONT}`; }
  g.lineWidth = 16; g.strokeStyle = '#111'; g.strokeText(top, w / 2, 90); g.fillStyle = '#39ff14'; g.fillText(top, w / 2, 90);
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
    // food passes (Harry): straight into the mouth if you let them
    if (it.incoming && it.foodPass) {
      if (segDist(player.mouth, it.prev, it.pos) < 0.15 * player.scale + it.radius) { eatWhole(it); continue; }
    }
    // veg coming at you
    else if (it.incoming) {
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
          G.swats++; G.wristDirty = true; director.onSwat();
          setTimeout(() => tommy.say('vegSwat'), 450);
        } else {                                  // BLOCK
          it.vel.multiplyScalar(-0.3);
          sfx('thud', it.pos, 0.8);
          words.show('BLOCKED!', it.pos.clone().add({ x: 0, y: 0.12, z: 0 }), '#ffffff', 0.16 * player.scale);
        }
        h.pulse(1, 90);
        it.incoming = false; it.thrownByPlayer = true; it.swatted = true;
        handled = true; break;
      }
      if (!handled && segDist(player.head, it.prev, it.pos) < 0.17 * player.scale + it.radius) { gag(it); continue; }
    }
    // anything Ronnie throws at someone hits their ragdoll: light hits shove, hard ones knock them out
    if (it.thrownByPlayer && it.vel.lengthSq() > 1.5 * 1.5) {
      _b.addVectors(it.prev, it.pos).multiplyScalar(0.5);
      let part = null, who = null;
      for (const c of cast) { part = c.partAt(it.pos, it.radius) || c.partAt(_b, it.radius); if (part) { who = c; break; } }
      if (part) {
        const veg = !!it.def.veg;
        const mass = it.def.mass * (it.empty ? 0.3 : 1);
        _a.copy(it.vel).multiplyScalar(mass * 6);        // cartoon physics: food hits 6x harder than real life
        const res = who.hitBy(part, it.pos, _a, veg);
        sfx('splat', it.pos, res === 'ko' ? 1 : 0.6);
        if (res === 'ko') words.show(veg ? 'RETURN TO SENDER!' : ['SPLAT!', 'WALLOP!', 'POW!'][Math.floor(Math.random() * 3)], it.pos.clone().add({ x: 0, y: 0.3, z: 0 }), veg ? '#7cff6a' : '#ff5a36', 0.25, 1.3);
        else words.show('SPLAT!', it.pos.clone().add({ x: 0, y: 0.2, z: 0 }), '#ff9a36', 0.16, 0.9);
        it.vel.multiplyScalar(-0.25);
        it.thrownByPlayer = false;
      }
    }
  }
}

// ---------------- slaps (VR hands swinging into Tommy) ----------------
function slaps() {
  for (const h of player.hands) {
    if (!h.tracked || h.held || h.heldPart || h.speed < 1.6) continue;
    let part = null, who = null;
    for (const c of cast) { part = c.partAt(h.palm, 0.05 * player.scale); if (part) { who = c; break; } }
    if (!part) continue;
    const res = who.slap(part, h.palm, h.vel);
    if (!res) continue;
    h.pulse(1, 80);
    sfx(res === 'ko' ? 'splat' : 'thwack', h.palm, 1);
    words.show(res === 'ko' ? 'WALLOP!' : 'SLAP!', h.palm.clone().add({ x: 0, y: 0.25, z: 0 }), '#ff5a36', 0.2, 1);
  }
}

// ---------------- phone / tablet / computer controls ----------------
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
const touch = setupTouch({
  canvas: renderer.domElement,
  onUserGesture: () => initAudio(),
  onMove: (x, z) => { if (player.flatMode) { player.flatMove.x = x; player.flatMove.z = z; } },
  onLook: (dx, dy) => {
    if (!player.flatMode) return;
    player.flatYaw -= dx; player.flatPitch = THREE.MathUtils.clamp(player.flatPitch - dy, -1.35, 1.35);
  },
  onEat: () => { if (player.flatHolder?.held) player.flatEat(); },
  onThrow: () => player.flatThrow(),
  onSprint: () => { player.sprint = !player.sprint; sfx(player.sprint ? 'whoosh' : 'pop', null, 0.4); return player.sprint; },
  onTap: (x, y) => {
    if (!player.flatMode) return;
    ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const ray = raycaster.ray, reach = 3 * player.scale;
    if (director.tapBoard(ray) || director.tapBubble(ray)) return;
    // the PLAY / STOP signs over the little games
    for (const gm of room.games || []) if (gm.button && gm.button.visible) {
      const along = _a.subVectors(gm.button.position, ray.origin).dot(ray.direction);
      if (along > 0 && ray.distanceSqToPoint(gm.button.position) < 0.16 * 0.16 * 4) {
        if (along > reach + 1.5) { touch.hint('Walk up to it to play'); return; }
        gm.toggle(); return;
      }
    }
    // tap a fruit machine to play it
    for (const m of room.machines || []) {
      const along = _a.subVectors(m.front, ray.origin).dot(ray.direction);
      if (along > 0 && ray.distanceSqToPoint(_b.set(12.93, 1.1, m.z)) < 0.4 * 0.4) {
        if (along > reach + 0.5) { touch.hint('Walk up to the machine to play it'); return; }
        if (m.spin()) sfx('ting', m.front, 1);
        return;
      }
    }
    // nearest thing along the tap: food or a bit of Tommy (the mess lying about wakes up into real food first)
    room.clutter && room.clutter.wakeRay(items, ray, reach + 1);
    let best = null, bd = Infinity;
    for (const it of items.items) {
      if (it.heldBy) continue;
      const along = _a.subVectors(it.pos, ray.origin).dot(ray.direction);
      if (along > 0 && along < bd && ray.distanceSqToPoint(it.pos) < (it.radius + 0.07) ** 2) { bd = along; best = it; }
    }
    let part = null, who = null;
    for (const c of cast) for (const p of c.rag.list) {
      const b = p.body.position; _b.set(b.x, b.y, b.z);
      const along = _a.subVectors(_b, ray.origin).dot(ray.direction);
      if (along > 0 && along < bd && ray.distanceSqToPoint(_b) < (p.radius + 0.04) ** 2) { bd = along; part = p; who = c; best = null; }
    }
    if (part) {                         // tap someone = slap them
      if (bd > reach && who.state !== 'clinging') { touch.hint(`Get closer to slap ${who.name}!`); return; }
      const pos = part.body.position; _b.set(pos.x, pos.y, pos.z);
      const res = who.slap(part, _b, _a.copy(ray.direction).multiplyScalar(4.2));
      if (res) { sfx(res === 'ko' ? 'splat' : 'thwack', _b, 1); words.show(res === 'ko' ? 'WALLOP!' : 'SLAP!', _b.clone().add({ x: 0, y: 0.3, z: 0 }), '#ff5a36', 0.22, 1); }
      return;
    }
    if (!best) return;
    if (best.incoming) {           // tap incoming broccoli = swat
      best.vel.copy(ray.direction).multiplyScalar(5); best.vel.y += 2; best.vel.x += (Math.random() - 0.5) * 4;
      best.incoming = false; best.thrownByPlayer = true;
      sfx('thwack', best.pos, 1); words.show('THWACK!', best.pos.clone(), '#7cff6a', 0.22);
      G.swats++; G.wristDirty = true; director.onSwat(); setTimeout(() => tommy.say('vegSwat'), 450);
      return;
    }
    if (bd > reach) { touch.hint('Too far — walk closer with the joystick'); return; }
    player.flatGrab(best);
  },
});
function updateTouchUI() {
  const held = player.flatHolder?.held;
  touch.setEatLabel(held && held.def.drink ? 'DRINK' : 'EAT', !!held && !held.empty);
  touch.setThrowEnabled(!!held);
}
function startFlat() {
  initAudio();
  player.enterFlat();
  document.body.classList.add('flat');
  touch.show(true);
  director.start(chosenMode());
}
function chosenMode() { return ['classic', 'intervention', 'veggie', 'catch'].includes(SEL.mode) || !SEL.mode ? 'everyone' : SEL.mode; }   // old links still work
document.getElementById('play-flat').addEventListener('click', startFlat);

// ---------------- Enter VR ----------------
const vrBtn = document.getElementById('enter-vr');
const status = document.getElementById('status');
async function setupVR() {
  if (!('xr' in navigator)) { vrBtn.textContent = 'NO VR HERE'; status.textContent = 'No VR here — press PLAY ON THIS SCREEN to play with touch controls (or open this page in the Meta Quest browser for VR).'; return; }
  const ok = await navigator.xr.isSessionSupported('immersive-vr').catch(() => false);
  if (!ok) { vrBtn.textContent = 'NO VR HERE'; status.textContent = 'No VR on this device — press PLAY ON THIS SCREEN to play with touch controls.'; return; }
  vrBtn.disabled = false; vrBtn.textContent = 'ENTER VR';
  status.textContent = 'Ready! Put the headset on and press ENTER VR.';
  let session = null;
  const begin = async (handed) => {
    initAudio();
    if (session) { session.end(); return; }
    try {
      if (handed) { session = handed; if (window.__menuVRRelease) window.__menuVRRelease(); }     // already in the headset from the menu
      else session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'] });
      session.addEventListener('end', () => { session = null; vrBtn.textContent = 'ENTER VR'; document.body.classList.remove('in-vr'); camera.position.set(0, 1.6, 0); });
      await renderer.xr.setSession(session);
      if (player.flatMode) { player.flatDrop(); player.flatMode = false; if (player.flatGrip) player.flatGrip.visible = false; touch.show(false); document.body.classList.remove('flat'); }
      vrBtn.textContent = 'EXIT VR';
      document.body.classList.add('in-vr');
      director.start(chosenMode());
    } catch (err) {
      status.textContent = 'Could not start VR: ' + err.message;
      if (handed) { try { handed.end(); } catch (e) {} status.textContent = 'Press ENTER VR to carry on in the headset.'; }
      session = null;
    }
  };
  vrBtn.addEventListener('click', () => begin());
  // pressed PLAY on the floating menu in VR: carry straight on in the same session
  const handed = window.__menuVRSession; window.__menuVRSession = null;
  if (handed) begin(handed);
}
setupVR();
document.getElementById('sound').addEventListener('click', () => { initAudio(); sfx('chomp'); });

// Keep at least ~75° of horizontal view, so portrait phones aren't looking through a letterbox.
function fitCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  const hHalf = Math.tan(THREE.MathUtils.degToRad(37.5));
  camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(hHalf / aspect)), 60, 100);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
fitCamera();
window.addEventListener('resize', fitCamera);

// ---------------- modes ----------------
function resetRonnie() {
  player.clearEffects(); G.fxTintT = 0; attackFx.removeAll();
  G.chonk = 0; G.stage = 0; G.eaten = 0; G.swats = 0; G.locoT = 0; G.stoutT = 0; G.gagT = 0;
  G.scaleFrom = player.scale; G.scaleTo = 1; G.scaleT = player.scale === 1 ? 1 : 0;
  player.setBelly(STAGES[0].belly); setPitchScale(1); stopLocoMusic(); room.hemi.color.set(0xc9d6ff);
  for (const it of items.items.slice()) if (it.temp || it.incoming || it.empty || it.def.veg || it.def.stout || it.def.shake) items.remove(it);
  tommy.state = 'idle'; if (tommy.rag.mode !== 'anim') tommy.rag.placeAt(tommy.pos.x, tommy.pos.z, tommy.rag.yaw); tommy.attackTimer = 12;
  G.wristDirty = true;
}
const director = new Director({
  scene, room, physics, player, items, words, G, tommy, cast, onThrow, addChonk, resetRonnie, fx: attackFx, crumbs,
  showBanner: (a, b) => showBanner(a, b),
  stageName: () => STAGES[G.stage].name,
  // points that pop bubbles / press board buttons: palms, fingertips and held food
  popPoints: (fingers) => {
    const pts = [];
    if (!renderer.xr.isPresenting) return pts;
    for (const h of player.hands) {
      if (!h.tracked) continue;
      pts.push(h.palm);
      if (h.held) pts.push(h.held.pos);
      if (fingers && h.isHand && h.hand.joints['index-finger-tip']) pts.push(h.hand.joints['index-finger-tip'].getWorldPosition(new THREE.Vector3()));
      if (fingers && !h.isHand) pts.push(h.pos.clone().addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(h.quat), 0.08));
    }
    return pts;
  },
});
// what characters need to know about Ronnie each frame
const ctx = {
  head: player.head, fwd: player.fwd, mouth: player.mouth, player,
  handPos: () => {
    if (player.flatMode) return player.flatAnchorPos();
    const h = player.hands.filter(h => h.tracked).sort((a, b) => b.palm.y - a.palm.y)[0];
    return h ? h.palm.clone() : player.head.clone().addScaledVector(player.fwd, 0.4);
  },
  // Dylan grabs onto whichever hand is closest
  attachPoint: (who) => {
    const tip = who.rag.tip('lArmR', new THREE.Vector3());
    if (player.flatMode) return tip.distanceTo(player.flatAnchorPos()) < 0.5 ? { body: player.flatBody, speed: 0 } : null;
    let best = null, bd = 0.45;
    for (const h of player.hands) if (h.tracked && h.body && h.palm.distanceTo(tip) < bd) { bd = h.palm.distanceTo(tip); best = h; }
    return best ? { body: best.body, get speed() { return best.speed; } } : null;
  },
};

// ---------------- main loop ----------------
function elasticOut(t) { return t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1; }

// ---------------- pause menu (the ⏸ button on phones / computers) ----------------
let paused = false;
const pauseEl = document.getElementById('pause');
function setPaused(on) {
  paused = on; pauseEl.classList.toggle('on', on); if (!on) pauseEl.classList.remove('show-ctrls');
  if (on) { const t = document.getElementById('ready-tag'); document.getElementById('pause-where').textContent = t ? t.textContent : ''; try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} }
  setMuted(on || soundOff);
}
let soundOff = false;
document.getElementById('menu-btn').addEventListener('click', () => setPaused(true));
document.getElementById('pause-resume').addEventListener('click', () => { initAudio(); setPaused(false); });
document.getElementById('pause-restart').addEventListener('click', () => { setPaused(false); director.start(chosenMode()); });
document.getElementById('pause-sound').addEventListener('click', (e) => { soundOff = !soundOff; e.currentTarget.textContent = soundOff ? '🔇 SOUND: OFF' : '🔊 SOUND: ON'; });
document.getElementById('pause-quit').addEventListener('click', () => { location.href = location.pathname; });
document.getElementById('pause-controls').addEventListener('click', () => {
  const touchy = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
  document.querySelectorAll('#pause .clist').forEach(l => l.classList.toggle('on', l.dataset.d === (touchy ? 'touch' : 'pc')));
  pauseEl.classList.add('show-ctrls');
});
document.getElementById('pause-ctrls-back').addEventListener('click', () => pauseEl.classList.remove('show-ctrls'));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && player.flatMode) setPaused(!paused); });
document.addEventListener('visibilitychange', () => { if (document.hidden && player.flatMode && !paused) setPaused(true); });   // switching apps pauses

// the loading screen goes once the first frame of the level has been drawn
let loadShown = true;
function hideLoading() { if (!loadShown) return; loadShown = false; const ls = document.getElementById('loadscreen'); if (ls && ls.classList.contains('on')) { ls.classList.add('fade'); setTimeout(() => ls.classList.remove('on', 'fade'), 320); } }
renderer.setAnimationLoop(() => {
  if (paused) { clock.getDelta(); renderer.render(scene, camera); return; }    // frozen until RESUME
  const dt = Math.min(clock.getDelta(), 0.05);
  time += dt;
  const xr = renderer.xr.isPresenting;
  if (loadShown && time > 0.15) hideLoading();      // a couple of frames in: the level's there

  if (!xr && !player.flatMode) { camera.position.set(0, 1.6, 0); camera.rotation.set(-0.3, time * 0.05, 0, 'YXZ'); }   // slow look-around behind the menu

  // growth tween (0.6s elastic "boing")
  if (G.scaleT < 1) {
    G.scaleT = Math.min(1, G.scaleT + dt / 0.6);
    player.setScale(G.scaleFrom + (G.scaleTo - G.scaleFrom) * elasticOut(G.scaleT));
  }

  player.update(dt, time);

  // press a game's PLAY sign by touching it (headset hands)
  if (xr) for (const gm of room.games || []) if (gm.button && gm.button.visible) for (const h of player.hands) if (h.tracked && h.palm.distanceTo(gm.button.position) < 0.2) { gm.toggle(); h.pulse && h.pulse(0.6, 60); }
  // play a fruit machine by touching it (headset hands)
  if (room.machines && xr) for (const h of player.hands) if (h.tracked) for (const m of room.machines) if (h.palm.distanceTo(m.front) < 0.35 && m.spin()) { sfx('ting', m.front, 1); h.pulse && h.pulse(0.6, 80); }
  // eating & drinking held food (VR hands, or the on-screen hand)
  for (const h of player.flatMode ? [player.flatHolder] : player.hands) {
    const it = h.held;
    if (!it || it.dead) continue;
    if (it.def.drink) { drinkUpdate(it, h, dt); continue; }
    if (!it.def.prop && mouthGap(it) < TUNING.mouthRadius * player.scale) bite(it, h);
  }

  items.update(dt);
  vegAndHits(dt);
  if (xr) slaps();
  physics.step(dt);
  for (const c of cast) c.update(dt, ctx);
  // people don't walk through each other (or through Ronnie)
  for (let i = 0; i < cast.length; i++) {
    const a = cast[i].rag; if (a.mode === 'ragdoll') continue;
    const dxp = a.root.x - player.head.x, dzp = a.root.z - player.head.z, dp = Math.hypot(dxp, dzp), minP = 0.45 * player.scale;
    if (dp < minP && dp > 1e-3) { a.root.x += dxp / dp * (minP - dp); a.root.z += dzp / dp * (minP - dp); }
    for (let j = i + 1; j < cast.length; j++) {
      const b = cast[j].rag; if (b.mode === 'ragdoll') continue;
      const dx = b.root.x - a.root.x, dz = b.root.z - a.root.z, d = Math.hypot(dx, dz);
      if (d < 0.55 && d > 1e-3) { const p = (0.55 - d) / 2 / d; a.root.x -= dx * p; a.root.z -= dz * p; b.root.x += dx * p; b.root.z += dz * p; }
    }
  }
  director.update(dt, ctx);
  attackFx.update(dt);
  if (player.flatMode) updateTouchUI();

  // timers & tint
  if (G.locoT > 0) {
    G.locoT -= dt; if (Math.floor((G.locoT + dt) * 10) !== Math.floor(G.locoT * 10)) G.wristDirty = true;
    if (G.locoT <= 0) { G.locoT = 0; stopLocoMusic(); room.hemi.color.set(0xc9d6ff); G.wristDirty = true; }
  }
  if (G.stoutT > 0) { G.stoutT -= dt; if (Math.floor((G.stoutT + dt) * 10) !== Math.floor(G.stoutT * 10)) G.wristDirty = true; }
  if (G.gagT > 0) G.gagT -= dt;
  if (G.poopT > 0) { G.poopT -= dt; tint.set(0xff0000, 0.5 * Math.min(1, G.poopT)); }
  else if (G.fxTintT > 0) { G.fxTintT -= dt; tint.set(G.fxTint, G.fxTintOp * Math.min(1, G.fxTintT)); }
  else if (G.gagT > 0) tint.set(0x2bd62b, 0.35 * Math.min(1, G.gagT));
  else if (G.stoutT > 0) tint.set(0x8a5a1a, 0.18);
  else if (G.locoT > 0) tint.set(0xff8a00, 0.13 + Math.sin(time * 8) * 0.03);
  else tint.set(0xff8a00, 0);
  tint.update(dt);

  crumbs.update(dt);
  words.update(dt);
  room.update(dt);
  for (const gm of room.games || []) { gm.allowed = director.mode === 'roam'; gm.update(dt, player); }     // darts / table tennis: Free Roam only

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
  if (director.running && director.mode !== 'classic' && Math.floor(director.timeLeft) !== G.lastHudSec) { G.lastHudSec = Math.floor(director.timeLeft); G.wristDirty = true; }
  { const hl = director.hud(); if (hl !== G.lastHudLine) { G.lastHudLine = hl; G.wristDirty = true; } }   // e.g. the attack countdown ticking
  if (G.wristDirty && G.wristT <= 0) {
    G.wristDirty = false; G.wristT = 0.1;
    const max = G.stage === STAGES.length - 1;
    const cur = STAGES[G.stage].chonk, next = max ? cur : STAGES[G.stage + 1].chonk;
    player.drawWrist({
      stage: G.stage, stages: STAGES.length, name: STAGES[G.stage].name, chonk: G.chonk, next, max,
      fill: max ? 1 : (G.chonk - cur) / (next - cur), loco: G.locoT, stout: G.stoutT, eaten: G.eaten, swats: G.swats, fps: G.fps,
      modeLine: director.hud(),
    });
  }

  _b.set(0, 1, 0).applyQuaternion(camera.getWorldQuaternion(_q));
  setListener(player.head, player.fwd, _b);

  renderer.render(scene, camera);
});

// Debug handle for testing in a desktop browser console.
window.RS = { G, player, items, tommy, cast, director, addChonk, scene, renderer, physics, startFlat };
