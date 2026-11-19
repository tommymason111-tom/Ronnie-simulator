// RONNIE SIMULATOR — Phase 1 (WebXR / three.js, runs in the Meta Quest 3 browser,
// and on phones / tablets / computers with on-screen controls).
import * as THREE from 'three';
import { STAGES, FOODS, TUNING, JUNK_TYPES, pickJunk } from './config.js';
import { buildRoom } from './room.js';
import { buildGrid } from './levels/grid.js';
import { ItemManager } from './foods.js';
import { Character } from './character.js';
import { Crumbs, Words, Tint } from './fx.js';
import { Player } from './player.js';
import { Tommy } from './tommy.js';
import { STAGE_LINES } from './dialogue.js';
import { AttackFX } from './attackfx.js';
import { initAudio, sfx, setListener, setPitchScale, startLocoMusic, stopLocoMusic, setAmbience, setMuted, setHush } from './audio.js';
import { voiceLine, warmLine, VOICED } from './voices.js';
import { DomPanel } from './vrdom.js';
import { FONT } from './textures.js';
import { createPhysics } from './physics.js';
import { setupTouch } from './touch.js';
import { Director, MODES } from './modes.js';
import { buildPub } from './levels/pub.js';
import { buildSupermarket } from './levels/supermarket.js';
import { buildRestaurant } from './levels/restaurant.js';
import { preloadModels, FLOOR } from './ragdoll.js';
import { SQUAD } from './squad.js';
import { buildGarden } from './levels/garden.js';
import { Net, newCode } from './net.js';
import { MPSync } from './mpsync.js';
import { foodGlow, warmFood } from './foods.js';
import { EMOTES, CHAR_EMOTES, EmotePlayer, emoteInfo } from './emotes.js';
import { mergeMaterialGroups, atlasSigns } from './perf.js';
import { warmShaders, learnShaders } from './shaderwarm.js';
import { track, trackMax } from './awards.js';
import { roomNum } from './roomopts.js';
import { VoiceChat } from './voicechat.js';
import { sweep, releaseLevelGeometry, releaseTextures, noteLevelTextures, releaseLevelCanvases } from './memory.js';
import { Music } from './music.js';
import { PowerUps } from './powerups.js';
import { buildMix, MIX_CSS } from './mixui.js';
import { haptics } from './haptics.js';
import { Imposter } from './imposter.js';
import { BossFight } from './boss.js';      // (BOSS FIGHT)
import { TVs } from './tv.js';
import { SquadMember as SquadMemberMP, SQUAD as SQUAD_MP } from './squad.js';
import { setupWeather } from './weather.js';      // (weather and the time of day; importing it also readies every shader for it)

// start downloading everyone's 3D model now, while the menu is still up
const MEDIA_ON = false;      // the DJ booth / music and the TVs (off for now)
const MODEL_LOAD = preloadModels(['./assets/tommy.glb', ...Object.values(SQUAD).filter(d => !d.playerOnly).map(d => d.model).filter(Boolean)]);   // (Ronnie's body only loads if someone plays as him)
// wait for the start screen: where are we playing, and what mode?
const SEL = await (window.ronnieMenu || Promise.resolve({ place: 'pub', mode: 'everyone' }));
// ...and make sure everyone's actually arrived before the game starts (so nobody's invisible)
{ const st = document.getElementById('status'); let done = false;
  setTimeout(() => { if (!done && st) st.textContent = 'Getting the squad ready…'; }, 400);
  window.__ls && window.__ls('squad');
  await Promise.race([MODEL_LOAD, new Promise(r => setTimeout(r, 25000))]); done = true;
  // (the place is built in one go next: tick the step and let it be drawn first. The loading animations keep going
  // while it builds; in the headset the page's frames are paused, so don't wait long for one)
  if (window.__ls) { window.__ls('place'); await new Promise(r => { let d = false; const go = () => { if (!d) { d = true; r(); } }; requestAnimationFrame(() => setTimeout(go, 0)); setTimeout(go, 60); }); } }

// ---------------- renderer / scene ----------------
// (a device or browser that can't do 3D at all: say so on the loading screen, instead of LOADING for ever)
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
catch (e) {
  const ls = document.getElementById('loadscreen');
  if (ls) { clearInterval(ls._tips); const t = ls.querySelector('.lst'), h = document.getElementById('ls-hint');      // (the tips stop turning over: this message stays)
    if (t) t.textContent = 'NO 3D ON THIS BROWSER';
    if (h) h.textContent = "This browser can't show 3D right now. Try Chrome or Safari, switch on hardware acceleration in its settings, or close some tabs and restart it."; ls.classList.add('on', 'no3d'); }
  window.__crash && window.__crash('context', e, { where: 'no webgl' });
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.xr.setFoveation(1);
document.getElementById('app').appendChild(renderer.domElement);
// iPhones can take the graphics chip's memory back (the app in the background, or short of memory). three.js can't
// rebuild a whole level after that, so start the page again cleanly rather than leave a black or frozen screen
// While it's gone nothing is drawn at all: the 3D models' data was handed to the graphics card and let go of (to save a
// phone's memory), so a context that comes back empty can't be filled again, and every frame drawn then threw
window.__glLost = false;
renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); window.__glLost = true; console.warn('graphics context lost'); }, false);
renderer.domElement.addEventListener('webglcontextrestored', () => { window.__glLost = true; location.reload(); }, false);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9db7ff);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 40);
camera.position.set(0, 1.6, 0);

const BUILD = { bedroom: buildRoom, pub: buildPub, shop: buildSupermarket, restaurant: buildRestaurant, garden: buildGarden, grid: buildGrid };
const room = (BUILD[SEL.place] || buildRoom)(scene);
atlasSigns(scene); mergeMaterialGroups(scene);      // (fewer draws, same picture: see perf.js)
const learnShader = learnShaders(renderer, scene);
const levelMeshes = []; scene.traverse(o => { if (o.isMesh) levelMeshes.push(o); });      // (the level itself: see memory.js)
releaseLevelGeometry(levelMeshes, Infinity); noteLevelTextures(levelMeshes);      // (each piece's spare copy goes the moment it's first sent to the graphics chip: the peak while loading is what phones close a page for)
const weather = setupWeather({ renderer, scene, room, camera, place: BUILD[SEL.place] ? SEL.place : 'bedroom' });      // WEATHER + DAY/NIGHT (weather.js): its map of the level, sky, rain; weather.update(dt) each frame
FLOOR.at = room.floorAt || null;
if (room.familyPhotos) setTimeout(() => import('./portraits.js').then(m => m.paintPhotos(renderer, room.familyPhotos)).catch(e => console.warn('photos', e)), 400);   // family photos from the models            // (raised floors: the ragdolls stand on them)
if (room.shadows) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }     // sunny places get real sun shadows
room.placeId = BUILD[SEL.place] ? SEL.place : 'bedroom';
room.camera = camera;              // (the level's light pool follows whoever's looking)
room.start = room.start || { x: 0.05, z: 0.45, yaw: 0 };
// Tommy turns up a few metres from where you start
if (room.big) room.tommySpots.sort((a, b) => Math.abs(Math.hypot(a.x - room.start.x, a.y - room.start.z) - 3) - Math.abs(Math.hypot(b.x - room.start.x, b.y - room.start.z) - 3));
const player = new Player(renderer, scene, camera);
player.rig.position.set(room.start.x, 0, room.start.z);
player.rig.rotation.y = room.start.yaw;
const items = new ItemManager(scene, room);
{ const before = scene.onBeforeRender; scene.onBeforeRender = function (r, sc, cam, ...a) { if (before) before.call(this, r, sc, cam, ...a); try { items.syncDraw(cam); } catch (e) { console.warn('food draw', e); } }; }      // (all the food drawn a shape at a time: foods.js syncDraw)
{ const t0 = performance.now(), n = items.densify(); console.log('food spots', room.spawns.length, '(+' + n + ')', Math.round(performance.now() - t0) + 'ms'); }
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
// someone appearing in front of you for an attack: a puff where they were, a puff where they land, a zap
Character.onBlink = (from, to) => { try { const W = ['#ffffff', '#d8e4ff', '#b8ffb0', '#ffd400']; crumbs.burst(from.clone().setY(1.0), W, 26, 1.4); crumbs.burst(to.clone().setY(1.0), W, 34, 1.6); sfx('blink', to, 0.7);
  words.show('POOF!', to.clone().setY(2.1), '#ffffff', 0.16, 0.7); } catch (e) {} };
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

// food never appears right next to a player (you, or anyone in the room)
items.viewer = player.head;   // (food outlines show near you)
items.avoid = () => { const out = [player.head]; try { for (const p of net.players.values()) if (p.pose && p.pose.h) out.push({ x: p.pose.h[0], z: p.pose.h[2] }); } catch (e) {} return out; };   // (net isn't set up yet while the first food goes out)
// starting food: one of each on the snack station, more around the room
if (room.startFood) room.startFood.forEach(t => items.spawn(t, items.freeSpawn()));
// special things placed by the level (the poop in the Oysterfleet toilet)
const placeExtras = () => (room.extraItems || []).forEach(e => { if (items.items.some(i => i.type === e.type && !i.dead)) return; const it = items.spawn(e.type, e.pos); it.spawnScale = 1; it.obj.scale.setScalar(1); });
placeExtras();
// fruit machines pay out in food: a little burst of it, flying out of the tray at you
room.onPayout = (m) => {
  sfx('jackpot', m.front, 1); words.show('JACKPOT!', m.front.clone().add({ x: 0, y: 0.7, z: 0 }), '#ffd400', 0.22, 1.4);
  for (let i = 0; i < 4; i++) setTimeout(() => {
    const dir = _a.set(player.head.x - m.tray.x, 0, player.head.z - m.tray.z).normalize();
    const it = items.spawn(i % 2 ? m.win.food : pickJunk(), m.tray.clone(), new THREE.Vector3(dir.x * 2.2 + (Math.random() - 0.5) * 0.8, 2.2 + Math.random(), dir.z * 2.2 + (Math.random() - 0.5) * 0.8));
    it.spawnScale = 1; it.obj.scale.setScalar(1); sfx('coin', m.tray, 0.8);
  }, 150 + i * 160);
};
// big places: loads more food, every kind, and it keeps topping up
if (room.big) {
  // spread round every table, counter and bench in the place (each spot used once before any doubles up)
  const spots = room.spawns.slice().sort(() => Math.random() - 0.5);
  items.topUpEvery = 0.4;
  for (let i = 0; i < 140; i++) items.spawn(JUNK_TYPES[i % JUNK_TYPES.length], i < spots.length && items.items.every(it => it.pos.distanceToSquared(spots[i]) > 0.3 * 0.3) ? spots[i] : items.freeSpawn());
  items.respawnDelay = 1.5;
  items.minFood = 150;
}
else {
  [['burger', 0], ['pizza', 1], ['doughnut', 2], ['can', 3]].forEach(([t, i]) => items.spawn(t, room.spawns[i]));
  ['burger', 'pizza', 'doughnut', 'can', 'burger', 'doughnut', 'hotdog', 'fries', 'chicken', 'kebab', 'cookie', 'taco', 'pizza', 'burger'].forEach(t => items.spawn(t, items.freeSpawn()));
}

// ---------------- events ----------------
// a chair picked up: the space it stood in is free again
room.takenBlocker = (b) => { physics.removeBox(b.x0, b.x1, b.z0, b.z1); const i = room.blockers.indexOf(b); if (i >= 0) room.blockers.splice(i, 1); };
// a telly hit by something thrown: the screen cracks and goes dark, glass sprays out, a shower of sparks
items.onTvSmash = (tv, p, u, v) => { track('tvs');
  sfx('smash', p, 1);
  const c = document.createElement('canvas'); c.width = 256; c.height = 144; const g = c.getContext('2d');
  g.fillStyle = '#060708'; g.fillRect(0, 0, 256, 144);
  for (let i = 0; i < 7; i++) { g.fillStyle = ['#ff2a6a', '#2affd4', '#ffd400', '#3a6aff'][i % 4]; g.globalAlpha = 0.5; g.fillRect(Math.random() * 256, 0, 2 + Math.random() * 4, 144); }   // dead pixel lines
  g.globalAlpha = 1;
  const hx = THREE.MathUtils.clamp(u, 0.05, 0.95) * 256, hy = (1 - THREE.MathUtils.clamp(v, 0.05, 0.95)) * 144;
  g.strokeStyle = 'rgba(230,240,255,0.85)'; g.lineWidth = 1.4;
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + Math.random() * 0.3; let x = hx, y = hy; g.beginPath(); g.moveTo(x, y);
    for (let s2 = 0; s2 < 6; s2++) { x += Math.cos(a + (Math.random() - 0.5) * 0.6) * (14 + Math.random() * 20); y += Math.sin(a + (Math.random() - 0.5) * 0.6) * (14 + Math.random() * 20); g.lineTo(x, y); } g.stroke(); }
  for (let r = 8; r < 70; r += 14 + Math.random() * 10) { g.beginPath(); for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2, rr = r * (0.8 + Math.random() * 0.4); i ? g.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr) : g.moveTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr); } g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(hx, hy, 5, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  tv.label.material.map = t; tv.label.material.needsUpdate = true;
  const out = p.clone().addScaledVector(tv.n, 1.2); out.y -= 0.6;
  attackFx.spray(p, out, 0xdfeff8, 14); attackFx.spray(p, p.clone().addScaledVector(tv.n, 0.8).setY(p.y + 0.3), 0xffd060, 10);
  words.show('SMASH!', p.clone().addScaledVector(tv.n, 0.3), '#ffffff', 0.12, 1.4);
  G.tvsSmashed = (G.tvsSmashed || 0) + 1; director.onTvSmash && director.onTvSmash(tv); if (typeof tvs !== 'undefined') tvs.smashed();
};
items.onLand = (it, speed) => {
  if (time - G.lastLand < 0.08) return;
  G.lastLand = time;
  // what it's made of decides what it sounds like landing (a full drink sloshes; a glass hitting hard shatters)
  const d = it.def, v = Math.min(1, speed / 4), glassy = /pint|glass|wine|beer|cider|spirit/.test(it.type);
  if (glassy && speed > 6.5) sfx('shatter', it.pos, v);
  else if (d.drink && !it.empty && speed > 2.5) { sfx(glassy ? 'hit_glass' : it.type === 'can' ? 'can' : 'hit_plastic', it.pos, v); sfx('slosh', it.pos, v * 0.8); }
  else sfx(it.type === 'can' ? 'can' : glassy ? 'hit_glass' : it.type === 'mug' ? 'hit_ceramic' : d.chair ? 'hit_wood' : d.mag || d.bag || d.mat ? 'hit_cardboard' : d.condiment || it.type === 'cup' || it.type === 'soft' ? 'hit_plastic' : d.prop ? 'hit_metal' : 'hit_soft', it.pos, v);
};
// PHYSICS FEEL: a hard landing kicks up a little puff of dust (and crumbs off food); a heavy one right by you jolts the view
{ const _land = items.onLand;
  items.onLand = (it, speed) => { _land(it, speed);
    if (speed > 3.2) { const at = it.pos.clone(); at.y = Math.max(0.02, at.y - it.radius * 0.8);
      crumbs.burst(at, it.def.drink || it.def.vessel || it.def.prop ? [0xd9d4c8, 0xbdb6a6, 0xeeeae0] : [0xc89850, 0xa8783a, 0xe0c080, 0xd9d4c8], Math.min(14, Math.round(speed * 2)), 0.5 + speed * 0.08);
      if ((it.def.mass || 0) >= 1 && it.pos.distanceTo(player.head) < 3) player.shake(Math.min(0.8, speed / 8)); } }; }
items.onSpawn = () => sfx('spawn', null, 0.15);
player.onGrab = (it) => {
  // Supermarket Sweep: straight into the trolley
  if (director.running && director.mode === 'sweep' && !it.incoming && !it.def.prop) { const h = it.heldBy; if (h) h.held = null; it.heldBy = null; director.sweepGrab(it); return; }
  sfx('pickup', it.pos, 0.3);
  if (it.def.bag && !it.opened) openBag(it);
  if (it.incoming) {
    words.show('CAUGHT!', it.pos.clone().add(new THREE.Vector3(0, 0.15, 0)), '#7cff6a', 0.22);
    if (it.foodPass) { director.onCaught(); it.thrower && setTimeout(() => it.thrower.say('caught', 4), 400); }
    it.incoming = false;
  }
};
// Lidl bags: the first time you pick one up it opens on the screen and shows you what's inside,
// then the food pops out in front of you (the bag's still yours to throw)
const BAG_FOOD = { burger: '🍔', pizza: '🍕', doughnut: '🍩', hotdog: '🌭', fries: '🍟', kebab: '🥙', chicken: '🍗', taco: '🌮', crisps: '🥔', choc: '🍫', cookie: '🍪', icecream: '🍦', sausageroll: '🥐', croissant: '🥐', baguette: '🥖', muffin: '🧁', pretzel: '🥨', can: '🥤', shake: '🥛' };
function openBag(bag) {
  bag.opened = true;
  const n = 2 + Math.floor(Math.random() * 3), pool = Object.keys(BAG_FOOD), found = [];
  for (let i = 0; i < n; i++) found.push(pool[Math.floor(Math.random() * pool.length)]);
  const el = document.getElementById('bagreveal');
  if (el) {
    el.innerHTML = `<div class="bagbox"><div class="bag"><div class="flap"></div><span>Lidl</span></div><div class="bagtitle">IN THE BAG...</div><div class="bagfound">${found.map((t, i) => `<div class="bf" style="animation-delay:${0.55 + i * 0.22}s"><b>${BAG_FOOD[t]}</b><i>${FOODS[t].label}</i></div>`).join('')}</div></div>`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(openBag.t); openBag.t = setTimeout(() => el.classList.remove('show'), 2600 + n * 220);
  }
  sfx('rustle', bag.pos, 0.8);
  found.forEach((t, i) => setTimeout(() => {
    const from = _a.copy(player.head).addScaledVector(player.fwd, 0.55 * player.scale); from.y -= 0.25 * player.scale;
    const v = new THREE.Vector3(player.fwd.x * 0.6 + (Math.random() - 0.5) * 0.8, 2.0 + Math.random() * 0.6, player.fwd.z * 0.6 + (Math.random() - 0.5) * 0.8);
    const it = items.spawn(t, from.clone(), v); it.spawnScale = 0.2; sfx('popout', from, 0.6);
  }, 700 + i * 220));
}
// you can only hold one thing at a time
function holdingMsg(it) { const n = (it.def.label || it.type).replace(/^Bottle off the back bar$/, 'bottle').toLowerCase(), a = /^[aeiou]/.test(n) ? 'an' : 'a';
  const t = `You're already holding ${/s$/.test(n) && !/ss$/.test(n) ? 'some' : a} ${n}!`; touch.hint(t); words.show(t.toUpperCase(), player.head.clone().addScaledVector(player.fwd, 0.8).add({ x: 0, y: -0.15, z: 0 }), '#ffd400', 0.07 * player.scale, 1.4); }
player.onBlocked = (it) => holdingMsg(it);
player.onRelease = (it, h, sp) => { if (sp > 1.2 || h && h.isFlat) track('throws'); if (sp > 2.5) sfx('throw', it.pos, Math.min(1, sp / 6)); if (sp > 1.2) try { mp.swing(h && h.handedness === 'left' ? 'L' : 'R'); } catch (e) {} };

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
tommy.cardUp = () => !!(attackFx && attackFx.cardT >= 0);      // (his throw waits till the attack card's gone)
tommy.canTrip = () => director.canAttack(tommy, 'trip');   // he waits his turn like everyone else

const SNACK_SFX = { burger: 'chomp', pizza: 'crunch', doughnut: 'squish', hotdog: 'munch', fries: 'crunch', kebab: 'chomp', chicken: 'crunch', taco: 'crunch', crisps: 'crunch', choc: 'snap', cookie: 'crunch', icecream: 'lick', sausageroll: 'munch', croissant: 'munch', baguette: 'munch', muffin: 'squish', painchoc: 'munch', swirl: 'lick', icedbun: 'squish', pretzel: 'crunch', nuggets: 'crunch', pasty: 'munch', onionrings: 'crunch', burrito: 'munch', waffle: 'crunch', pancakes: 'squish', churros: 'crunch', cupcake: 'squish', baconbap: 'munch' };
const SNACK_WORD = { burger: ['CHOMP!', 'MUNCH!', 'NOM!'], pizza: ['CRUNCH!', 'MUNCH!'], doughnut: ['SQUISH!', 'NOM NOM!'],
  hotdog: ['CHOMP!', 'DOG DOWN!'], fries: ['CRUNCH!', 'CHIPPY!'], kebab: ['DONER!', 'CHOMP!', '3AM VIBES!'], chicken: ['CRUNCH!', 'FINGER LICKIN!'], taco: ['CRUNCH!', 'TACO TIME!'],
  crisps: ['CRUNCH!', 'RUSTLE!'], choc: ['SNAP!', 'NOM!'], cookie: ['CRUNCH!', 'NOM!'], icecream: ['BRAIN FREEZE!', 'SLURP!'], sausageroll: ['FLAKY!', 'CHOMP!'],
  croissant: ['FLAKY!', 'OUI OUI!'], baguette: ['CRUNCH!', 'OH LA LA!'], muffin: ['SQUISH!', 'CHOC!'], painchoc: ['FLAKY!', 'MAGNIFIQUE!'], swirl: ['SWIRL!', 'NOM!'], icedbun: ['STICKY!', 'NOM!'], pretzel: ['TWISTED!', 'CRUNCH!'],
  nuggets: ['NUGGIES!', 'CRUNCH!'], pasty: ['PROPER PASTY!', 'CHOMP!'], onionrings: ['RING RING!', 'CRUNCH!'], burrito: ['BURRITO!', 'CHOMP!'], waffle: ['WAFFLE!', 'CRUNCH!'],
  pancakes: ['STACKED!', 'SYRUPY!'], churros: ['OLE!', 'CRUNCH!'], cupcake: ['SQUISH!', 'SPRINKLES!'], baconbap: ['BACON!', 'BAP!'] };
const CRUMB_COLORS = {
  nuggets: [0xd9902e, 0xf0c070, 0xa86020], pasty: [0xe0a050, 0xf2cf90, 0x8a5a3a], onionrings: [0xe0a040, 0xf6d080, 0xfaf6e8], burrito: [0xf2dcae, 0x5a2a1a, 0xd8352a, 0x6fbf3f],
  waffle: [0xe0a050, 0xd8102e, 0xfffcf4], pancakes: [0xe8b060, 0x9a4a10, 0x2a2a6a], churros: [0xc98a3a, 0xf4e6c8, 0x3a1a08], cupcake: [0xffb0d8, 0xc98a4a, 0x3fa3ff], baconbap: [0xe8c890, 0xd9707a, 0xf6e6d8],
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
  croissant: [0xd99a3a, 0xf0c878, 0xb8742a], baguette: [0xc98a3c, 0xf6efe0], muffin: [0x5a2e14, 0x2a140a, 0xf2f0ea], painchoc: [0xd99a3a, 0x3a1a0a], swirl: [0xd99a3a, 0x7a4018, 0xffffff], icedbun: [0xf0c878, 0xfff8f0, 0xd32f2f], pretzel: [0x8a4a1a, 0xffffff],
};
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion();

// ---------------- eat meter feedback: every bite punches the meter, a "+N" floats up from your mouth, quick bites in
// a row build a COMBO (its own rising sound, a badge with a draining timer on the meter, bigger and brighter the
// higher it goes), and the bar slides up to its new level instead of jumping
const COMBO_GAP = 2.4, COMBO_TIERS = [[2, '#39ff14', 'COMBO'], [4, '#00e5ff', 'NICE'], [7, '#ffd400', 'GREEDY'], [11, '#ff9a1f', 'UNSTOPPABLE'], [16, '#ff3b8b', 'BOTTOMLESS'], [25, '#c77dff', 'LEGENDARY']];
function comboTier(n) { let t = null; for (const x of COMBO_TIERS) if (n >= x[0]) t = x; return t; }
function eatFeedback(amount) {
  G.combo = time - (G.comboAt ?? -99) < COMBO_GAP ? (G.combo || 0) + 1 : 1; G.comboAt = time; G.bestCombo = Math.max(G.bestCombo || 0, G.combo);
  player.wristKick(0.16 + Math.min(0.14, G.combo * 0.012));
  const up = _b.copy(player.mouth).addScaledVector(player.fwd, 0.35 * player.scale).add({ x: 0.06 * player.scale, y: 0.09 * player.scale, z: 0 });
  words.show('+' + Math.max(1, Math.round(amount)), up, '#39ff14', 0.07 * player.scale, 0.9);
  const tier = comboTier(G.combo);
  if (tier) { sfx('combo', null, 0.5 + Math.min(0.5, G.combo * 0.04));
    if (G.combo === tier[0] || G.combo % 5 === 0) words.show(`x${G.combo} ${tier[2]}!`, _c.copy(player.head).addScaledVector(player.fwd, 0.9 * player.scale).add({ x: 0, y: 0.18 * player.scale, z: 0 }), tier[1], (0.11 + Math.min(0.08, G.combo * 0.004)) * player.scale, 1.1); }
  G.wristDirty = true;
}
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
  if (it.def.prop) { words.show(it.def.dart ? 'THAT\'S A DART, RON' : it.def.mag ? 'THAT\'S A MAGAZINE, RON' : it.def.bag ? 'THAT\'S A BAG, RON' : 'THAT\'S A BAT, RON', _b.copy(player.head).addScaledVector(player.fwd, 0.7 * player.scale), '#ff5252', 0.08 * player.scale, 1); return; }
  if (it.def.veg) { gag(it); return; }
  if (it.def.poop) { poopOver(it); return; }
  it.bitesLeft--;
  if (it.nid && mp.on && !mp.host && it.bitesLeft > 0) net.send({ t: 'bite', nid: it.nid, left: it.bitesLeft });
  sfx(SNACK_SFX[it.type] || 'chomp', fx, 1);
  crumbs.burst(fx, CRUMB_COLORS[it.type] || CRUMB_COLORS.burger, 26, 1.5, player.fwd);     // (anything without its own crumbs gets burger crumbs: never nothing)
  const w = SNACK_WORD[it.type] || SNACK_WORD.burger;      // (every food says something, even ones without their own words: a missing one stopped the game)
  words.show(w[Math.floor(Math.random() * w.length)], _b.copy(player.head).addScaledVector(player.fwd, 0.7 * player.scale).add({ x: 0, y: 0.05, z: 0 }), '#ffd400', 0.12 * player.scale);
  hand && hand.pulse(0.9, 70);
  const amount = (it.def.chonk / it.def.bites) * chonkMul();
  addChonk(amount);
  eatFeedback(amount);
  track('bites'); if (it.def.drink) track('drinks'); trackMax('combo', G.combo);      // (the end-of-game awards)
  director.onAte(it, amount);
  if (it.bitesLeft <= 0) {
    setTimeout(() => sfx('gulp', null, 1), 220);
    for (const h of player.hands) if (h.held === it) h.held = null; if (player.flatHolder && player.flatHolder.held === it) player.flatHolder.held = null;      // (all gone: empty hand)
    items.remove(it);
    if (!it.foodPass && !it.fromClutter && !room.big) items.queueRespawn(it.type);     // (big places top themselves up, away from everyone)
    G.eaten++;
    director.onFinished(it);
    if (time - G.lastEatLine > 7 && Math.random() < 0.6) { G.lastEatLine = time; setTimeout(() => tommy.say('eat'), 700); }
  } else {
    it.obj.scale.setScalar(0.55 + 0.45 * it.eatFraction);
  }
}

function chonkMul() { return (G.locoT > 0 ? TUNING.locoMultiplier : 1) * (G.stoutT > 0 ? 2 : 1) * (powerups ? powerups.mul() : 1); }

// HOOVER MODE: a bit of food sucked into the mouth, all of it in one go
function hooverEat(it) {
  if (it.dead) return;
  const amount = it.def.chonk * chonkMul();
  addChonk(amount); director.onAte(it, amount);
  const fx = _a.copy(player.mouth).addScaledVector(player.fwd, 0.12 * player.scale);
  sfx(SNACK_SFX[it.type] || 'chomp', fx, 0.8); sfx('pop', fx, 0.5);
  crumbs.burst(fx, CRUMB_COLORS[it.type] || CRUMB_COLORS.burger, 18, 1.4, player.fwd);
  words.show('SHLUUURP!', _b.copy(player.head).addScaledVector(player.fwd, 0.7 * player.scale).add({ x: (Math.random() - 0.5) * 0.3, y: 0.1, z: 0 }), '#00e5ff', 0.09 * player.scale, 0.7);
  for (const h of player.hands) if (h.held === it) h.held = null; if (player.flatHolder && player.flatHolder.held === it) player.flatHolder.held = null;
  items.remove(it);
  if (!it.foodPass && !it.fromClutter && !it.temp && !room.big) items.queueRespawn(it.type);
  G.eaten++; director.onFinished(it);
}

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
  const thrower = veg.thrower; track('veg');
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
  sfx('bwoomp', null, 1); sfx('stageup', null, 1);      // (its own sound: the fanfare is a game starting)
  player.wristKick(0.45); G.meterFlash = 1;
  showBanner(`STAGE ${G.stage + 1}`, stageNameOf(G.stage).toUpperCase());
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
  // developer mode: its own start-up message, as a terminal would print it
  if ((window.__devMode || window.__devPending) && /^FREE ROAM/.test(top)) { g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#39ff14'; g.shadowBlur = 24;
    g.fillStyle = 'rgba(0,10,2,0.85)'; g.fillRect(40, 30, w - 80, 300); g.strokeStyle = '#39ff14'; g.lineWidth = 6; g.strokeRect(40, 30, w - 80, 300);
    g.font = '900 64px "Courier New", monospace'; g.fillStyle = '#39ff14'; g.fillText('>_ DEVELOPER MODE', w / 2, 120); g.font = '900 40px "Courier New", monospace'; g.fillStyle = '#b8ffb0'; g.fillText('SYSTEM ONLINE · TAP  >_ DEV', w / 2, 230); g.shadowBlur = 0;
    bannerTex.needsUpdate = true; bannerT = 3.2; banner.visible = true; return; }
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
    if (it.thrownByPlayer && !it.remoteOwner && it.vel.lengthSq() > 1.5 * 1.5) {      // (something another player threw: their game does its hits, and tells the host)
      _b.addVectors(it.prev, it.pos).multiplyScalar(0.5);
      let part = null, who = null;
      for (const c of cast) { part = c.partAt(it.pos, it.radius) || c.partAt(_b, it.radius); if (part) { who = c; break; } }
      if (part) {
        const veg = !!it.def.veg;
        const mass = it.def.mass * (it.empty ? 0.3 : 1);
        _a.copy(it.vel).multiplyScalar(mass * 6);        // cartoon physics: food hits 6x harder than real life
        const res = who.hitBy(part, it.pos, _a, veg); track('hits'); if (who === tommy) track('tommy');
        hitSfx('splat', it.pos, res === 'ko' ? 1 : 0.6);
        if (res === 'ko') words.show(veg ? 'RETURN TO SENDER!' : ['SPLAT!', 'WALLOP!', 'POW!'][Math.floor(Math.random() * 3)], it.pos.clone().add({ x: 0, y: 0.3, z: 0 }), veg ? '#7cff6a' : '#ff5a36', 0.25, 1.3);
        else words.show('SPLAT!', it.pos.clone().add({ x: 0, y: 0.2, z: 0 }), '#ff9a36', 0.16, 0.9);
        it.vel.multiplyScalar(-0.25);
        it.thrownByPlayer = false;
      }
    }
  }
}

// a hit sound here that the other players hear too, from where it happened (louder the nearer they are)
function hitSfx(name, pos, vol = 1) { sfx(name, pos, vol); try { mp.sfxOut(name, pos, vol); } catch (e) {} }
// ---------------- slaps (VR hands swinging into Tommy) ----------------
function slaps() {
  for (const h of player.hands) {
    if (!h.tracked || h.held || h.heldPart || h.speed < 1.6) continue;
    let part = null, who = null;
    for (const c of cast) { part = c.partAt(h.palm, 0.05 * player.scale); if (part) { who = c; break; } }
    if (!part) continue;
    const res = who.slap(part, h.palm, h.vel);
    if (!res) continue;
    mp.swing(h.handedness === 'left' ? 'L' : 'R');
    h.pulse(1, 80);
    hitSfx(res === 'ko' ? 'punch' : 'slap', h.palm, 1);
    words.show(res === 'ko' ? 'WALLOP!' : 'SLAP!', h.palm.clone().add({ x: 0, y: 0.25, z: 0 }), '#ff5a36', 0.2, 1);
  }
}

// ---------------- phone / tablet / computer controls ----------------
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
const touch = setupTouch({
  canvas: renderer.domElement,
  onUserGesture: () => initAudio(),
  onMove: (x, z) => { if (player.flatMode) { player.flatMove.x = x; player.flatMove.z = z; } },
  onLook: (dx, dy) => { if (G.over) return;      // (the game's over: you're looking at your receipt)
    if (!player.flatMode) return;
    player.flatYaw -= dx; player.flatPitch = THREE.MathUtils.clamp(player.flatPitch - dy, -1.35, 1.35);
  },
  onEat: () => { const h = player.flatHolder?.held; if (h && h.def.gun && director.runpub && director.runpub.bar) { director.runpub.bar.toggleFlavour(); return; } if (h) player.flatEat(); },
  onThrow: () => player.flatThrow(),
  onEmote: (id) => { track('emotes'); mp.emote(id); },
  onZoom: (dir) => { player.zoom = dir === undefined ? !player.zoom : dir; return player.zoom; },
  onSprint: () => { player.sprint = !player.sprint; sfx(player.sprint ? 'sprint' : 'walk', null, 0.4); return player.sprint; },
  onTap: (x, y) => {
    if (!player.flatMode) return;
    ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const ray = raycaster.ray, reach = 3 * player.scale;
    if (director.tapBubble(ray)) return;
    if (director.boss && director.boss.tap(ray)) return;      // (BOSS FIGHT: holding food, tap the boss to throw it there)
    if (MEDIA_ON && music.tap(ray, reach)) return;                       // the music button on the speakers / DJ deck
    if (director.runpub && director.runpub.tapGive && director.runpub.tapGive(ray)) return;   // Run the Pub: holding a drink, tap someone to give it to them
    if (director.runpub && director.runpub.bar && director.runpub.bar.tap(ray)) return;   // Run the Pub: the tap, the coffee machine, the soft-drink gun
    if (MEDIA_ON && tvs.hitTV(ray, reach)) return;                        // a telly: put a video on it
    // the lightbox sign in Lewis's cabin: tap it to write your own message
    if (room.lightbox) { const lb = room.lightbox, lp = lb.mesh.getWorldPosition(_b);
      const along = _a.subVectors(lp, ray.origin).dot(ray.direction);
      if (along > 0 && ray.distanceSqToPoint(lp) < 0.18 * 0.18) {
        if (along > reach + 1.5) { touch.hint('Walk up to the sign to change it'); return; }
        const t = window.prompt('What should the lightbox say? (use | for a new line, 3 lines max)', lb.text.replace(/\n/g, ' | '));
        if (t !== null) { lb.set(t.replace(/\s*\|\s*/g, '\n')); sfx('toggle', lp, 0.6); }
        return;
      } }
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
      if (along > 0 && ray.distanceSqToPoint(m.screen) < 0.4 * 0.4) {
        if (along > reach + 0.5) { touch.hint('Walk up to the machine to play it'); return; }
        if (director.imposter) { director.imposter.useMachine && director.imposter.useMachine(); return; }      // (Imposter: it's your job, not a go on it)
        if (m.spin()) sfx('reels', m.front, 1);
        return;
      }
    }
    // nearest thing along the tap: food or a bit of Tommy (the mess lying about wakes up into real food first)
    room.clutter && room.clutter.wakeRay(items, ray, reach + 1);
    room.dormant && room.dormant.wakeRay(items, ray, reach + 1);
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
    // tap another player = punch them (players can't be picked up or thrown)
    for (const p of net.players.values()) { const av = p.avatar; if (!av) continue; const hd = av.headPos();
      for (const pt of [hd, hd.clone().add({ x: 0, y: -0.45, z: 0 })]) { const along = _a.subVectors(pt, ray.origin).dot(ray.direction);
        if (along > 0 && along < bd && ray.distanceSqToPoint(pt) < 0.3 * 0.3) { if (along > reach) { touch.hint(`Get closer to punch ${p.name}!`); return; } mp.punch(p, _a.copy(ray.direction).multiplyScalar(4.5), pt.clone()); return; } } }
    if (part) {                         // tap someone = slap them
      if (bd > reach && who.state !== 'clinging') { touch.hint(`Get closer to slap ${who.name}!`); return; }
      const pos = part.body.position; _b.set(pos.x, pos.y, pos.z);
      const res = who.slap(part, _b, _a.copy(ray.direction).multiplyScalar(4.2)); mp.swing('R');
      if (res) { hitSfx(res === 'ko' ? 'punch' : 'slap', _b, 1); words.show(res === 'ko' ? 'WALLOP!' : 'SLAP!', _b.clone().add({ x: 0, y: 0.3, z: 0 }), '#ff5a36', 0.22, 1); }
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
    if (player.flatHolder.held && player.flatHolder.held !== best) { holdingMsg(player.flatHolder.held); return; }
    player.flatGrab(best);
  },
});
touch.setEmotes(EMOTES, () => charEmotes(), () => charEmoteTitle());
// darts: zoom in on the board (button, wheel or Z) while you're holding a dart: your view leans in towards it
let zoomShown = null;
function updateZoom() {
  const held = player.flatHolder?.held, db = room.dartboard, can = !!(player.flatMode && held && held.def.dart && db && db.playing);
  if (!can) player.zoom = false;
  if (can) { const d = camera.getWorldPosition(_a).distanceTo(db.c) + (player.zoomLean || 0); player.zoomDist = Math.max(0, Math.min(1.6, d - 0.75)); }   // stop short of the board
  if (zoomShown !== can + '|' + !!player.zoom) { zoomShown = can + '|' + !!player.zoom; touch.setZoomAvailable(can, !!player.zoom); }
}
// in multiplayer the stages are named after who you're playing as (Snacky Lewis, Chunky Chloe...)
function stageNameOf(i) { let on = false; try { on = net.connected; } catch (e) {} const base = STAGES[i].name, c = on && net.char && net.char !== 'ronnie' ? (net.char === 'tommy' ? 'Tommy' : (SQUAD_MP[net.char] && SQUAD_MP[net.char].name)) : null; return c ? base.replace('Ronnie', c) : base; }
function updateTouchUI() {
  const held = player.flatHolder?.held;
  const gun = held && held.def.gun && director.runpub && director.runpub.bar;
  touch.setEatLabel(gun ? (director.runpub.bar.gunFlavour ? 'FANTA ⇄' : 'COKE ⇄') : held && held.def.drink ? 'DRINK' : 'EAT', gun || (!!held && !held.empty && !held.def.prop));
  touch.setThrowEnabled(!!held);
  touch.setEmoteAvailable(!!net.connected);
}
function mpAfterStart() { if (director.remote) mp.becomeClient(); }
// back to the start of the map (in multiplayer, spread out a little so nobody spawns inside anyone else)
function respawnPlayer() {
  const s = room.start, ids = [net.id, ...net.players.keys()].filter(Boolean).sort(), i = net.connected ? Math.max(0, ids.indexOf(net.id)) : 0;
  const a = s.yaw + Math.PI / 2, off = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.75;
  player.flatDrop && player.flatDrop(); for (const h of player.hands) if (h.held) { h.held.heldBy = null; h.held = null; }
  player.rig.position.set(s.x + Math.sin(a) * off, 0, s.z + Math.cos(a) * off); player.rig.rotation.y = s.yaw;
  if (player.flatMode) { player.flatYaw = 0; player.flatPitch = -0.22; }
  player.resetHandHistory && player.resetHandHistory();
}
// a new game, for this player: off the end screen / pause menu, the mode started fresh, back at the start
function newGame(id, why) {
  // (only the games this place has: Run the Pub needs the pub's bar and seats, the sweep needs Lidl. A game from anywhere
  // else (another player's restart message, a stray call) starts this place's own first game instead of crashing)
  { const ok = PLACE_GAMES[room.placeId]; if (ok && !ok.includes(id)) { console.warn('not a game for ' + room.placeId + ': ' + id); id = ok[0]; } }
  if (G.over) { G.over = false; player.menuLock = false; player.noTurn = false; document.body.classList.remove('gameover'); pauseEl.classList.remove('show-end'); if (player.flatMode) touch.show(true); if (player.wrist) player.wrist.visible = true;
    const rc = director.receipt; if (rc && rc.parent === camera) { camera.remove(rc); rc.visible = false; } }
  setPaused(false); attackFx.removeAll(); SEL.mode = id;
  const tag = document.getElementById('ready-tag'); if (tag && PAUSE_MODES[id]) tag.textContent = tag.textContent.replace(/·.*$/, '· ' + PAUSE_MODES[id][1]);
  director.start(id); mpAfterStart(); rewarm(); if (director.imposter) director.imposter.needSpawn = 2; else respawnPlayer();
  setTimeout(() => { try { sweep(scene); } catch (e) {} }, 1500);      // (Imposter puts everyone round the bell)
  if (why) showBanner(why, (PAUSE_MODES[id] ? PAUSE_MODES[id][1] : id.toUpperCase()));
}
// the host changes the game (or restarts it): everyone in the room starts the new one together, from the start
function hostNewGame(id) { newGame(id); if (net.connected && net.host) net.send({ t: 'restart', mode: id }); }
function startFlat() {
  initAudio();
  player.enterFlat();
  document.body.classList.add('flat');
  touch.show(true);
  startOnce();
}
// the game starts once: pressing PLAY again, or going into VR after starting flat, must never restart it (an Imposter
// game already dealt would drop the host back to the lobby, still being asked to ring the bell)
let gameBegun = false;
function startOnce() { if (gameBegun && director.running) return; gameBegun = true; director.start(chosenMode()); mpAfterStart(); rewarm(); }
// once a game's people are in: build their shaders (and their shadows') now, not the first time each is seen (shaderwarm.js)
// (a character's model has just loaded: once the last of a batch is in, build its shaders too)
{ let t = null; window.__onModelReady = () => { clearTimeout(t); window.__shaderWarm = null; t = setTimeout(rewarm, 500); }; }
function rewarm() { window.__shaderWarm = null; setTimeout(() => { if (renderer.xr.isPresenting || window.__glLost) { window.__shaderWarm = { skipped: true }; return; } warmShaders(renderer, scene, camera).then(r => { window.__shaderWarm = r; }).catch(() => {}); }, 300); }
function chosenMode() { const m = ['classic', 'intervention', 'veggie', 'catch'].includes(SEL.mode) || !SEL.mode ? 'everyone' : SEL.mode; return m.startsWith('imposter') && !(window.ronnieMP && window.ronnieMP.role) ? 'everyone' : m; }   // old links still work
{ const pf = document.getElementById('play-flat'); pf.addEventListener('click', startFlat); pf.disabled = false; pf.innerHTML = '<span class="pi">▶</span> PLAY'; }

// ---------------- Enter VR ----------------
const vrBtn = document.getElementById('enter-vr');
const status = document.getElementById('status');
async function setupVR() {
  // (the VR button only shows on something that can actually do VR: a headset, or a computer with one plugged in)
  status.textContent = '';
  if (!('xr' in navigator)) { vrBtn.hidden = true; return; }
  const ok = await navigator.xr.isSessionSupported('immersive-vr').catch(() => false);
  if (!ok) { vrBtn.hidden = true; return; }
  vrBtn.hidden = false; vrBtn.disabled = false; vrBtn.textContent = '🥽 PLAY IN VR'; document.body.classList.add('vr-capable');
  const pf = document.getElementById('play-flat'); if (pf) pf.innerHTML = '🖥️ PLAY ON SCREEN';
  let session = null;
  const begin = async (handed) => {
    initAudio();
    if (session) { session.end(); return; }
    try {
      if (handed) { session = handed; if (window.__menuVRRelease) window.__menuVRRelease(); }     // already in the headset from the menu
      else session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'] });
      session.addEventListener('end', () => { session = null; vrBtn.textContent = '🥽 PLAY IN VR'; document.body.classList.remove('in-vr'); camera.position.set(0, 1.6, 0); });
      await renderer.xr.setSession(session);
      // a session carried on from the menu already has its controllers: they never "connect" again, so the hands
      // wouldn't show until a controller went to sleep and woke up. Tell the game about them straight away.
      if (session.inputSources && session.inputSources.length) { try { const ev = new Event('inputsourceschange'); ev.added = [...session.inputSources]; ev.removed = []; session.dispatchEvent(ev); } catch (e) { console.warn('controllers', e); } }
      if (player.flatMode) { player.flatDrop(); player.flatMode = false; if (player.flatGrip) player.flatGrip.visible = false; touch.show(false); document.body.classList.remove('flat'); }
      vrBtn.textContent = 'EXIT VR';
      document.body.classList.add('in-vr');
      startOnce();
    } catch (err) {
      status.textContent = 'Could not start VR: ' + err.message;
      if (handed) { try { handed.end(); } catch (e) {} status.textContent = 'Press 🥽 PLAY IN VR to carry on in the headset.'; }
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
// ---------------- getting ready in quiet moments ----------------
// Things that take a while to make the first time (each of the belly's looks) are made beforehand, one piece at a time,
// while nothing much is happening (before PLAY, or when a frame finishes early), not the moment they're needed (growing
// a size stopped the game dead for a third of a second on a phone)
{ const jobs = [() => player.bellyModel && player.bellyModel.warm(), warmFood];
  const idle = window.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: 3000 }) : (f) => setTimeout(() => f({ timeRemaining: () => 8 }), 400);
  const tick = (dl) => { if (!jobs.length) return; if (document.body.classList.contains('ready') && (dl.timeRemaining() > 6 || !player.flatMode && !renderer.xr.isPresenting)) {
      // (as many pieces as fit in the spare time the browser gives us, not one per quarter second: on a slow device that
      // took so long the belly could still be unmade when you grew)
      let n = 0; do { try { if (!jobs[0]()) jobs.shift(); } catch (e) { jobs.shift(); } n++; } while (jobs.length && n < 20 && dl.timeRemaining() > 6); }
    if (jobs.length) setTimeout(() => idle(tick), 60); };
  setTimeout(() => idle(tick), 1500); }
// ---------------- memory (phones close a page that uses too much: see memory.js) ----------------
// once, just after the level's ready: draw the whole level into a single pixel, so every shape and picture is sent to the
// graphics chip now (and their spare copies let go of straight away), instead of bit by bit as you walk round and film
// emotes from new angles (memory creeping up the longer you played, and a stutter each time a new room came into view)
function warmUpload() {
  try { const was = levelMeshes.map(o => o.frustumCulled); for (const o of levelMeshes) o.frustumCulled = false;
    renderer.setScissorTest(true); renderer.setScissor(0, 0, 1, 1); renderer.render(scene, camera);
    renderer.setScissorTest(false); levelMeshes.forEach((o, i) => { o.frustumCulled = was[i]; }); } catch (e) { renderer.setScissorTest(false); console.warn('warm', e); }
}
{ let released = false, ticks = 0;
  setInterval(() => {
    if (!document.body.classList.contains('ready') || window.__glLost) return; ticks++;      // (nothing's let go of while the 3D context is lost: its objects belong to the old one)
    try {
      if (ticks === 1) window.__ls && window.__ls('food');
      if (ticks === 1 && !renderer.xr.isPresenting) { warmUpload(); warmShaders(renderer, scene, camera).then(r => { window.__shaderWarm = r; }).catch(e => console.warn('shaders', e)); }      // (every shader built now, in the background: shaderwarm.js)
      if (!released && ticks > 2) { if (!releaseLevelGeometry(levelMeshes, 150)) released = true; }
      if (ticks > 2) { releaseTextures(renderer, scene); releaseLevelCanvases(renderer); }
      sweep(scene);
    } catch (e) { console.warn('memory', e); }
  }, 2000); }

// ---------------- modes ----------------
function resetRonnie() {
  player.clearEffects(); G.fxTintT = 0; attackFx.removeAll(); powerups && powerups.reset();
  G.combo = 0; G.comboAt = -99; G.bestCombo = 0; G.fillShown = null; G.meterFlash = 0;
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
  onGameOver: (lines) => gameOver(lines),
  // IMPOSTER (multiplayer): the whole game lives in imposter.js
  makeImposter: (n) => new Imposter({ scene, room, player, net, mp, words, renderer, camera, items, tommy, selfBody: () => selfBody, showBanner: (a, b) => showBanner(a, b),
    restart: () => hostNewGame(director.fullMode), leave: () => leaveGame() }, n),
  // BOSS FIGHT: the whole fight lives in boss.js
  makeBoss: () => new BossFight({ scene, room, physics, player, items, words, crumbs, G, cast, director, net, mp, camera, renderer, fx: attackFx, hint: (t) => touch.hint(t), showBanner: (a, b) => showBanner(a, b) }),
  hint: (t) => touch.hint(t),
  stageName: () => stageNameOf(G.stage), stageNo: () => G.stage,
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

// ---------------- chat (multiplayer): a button under PAUSE, a box to type in, and a little log under the Eat Meter
function wrapText(g, text, maxW) { const words = text.split(' '), out = []; let ln = ''; for (const w of words) { const t = ln ? ln + ' ' + w : w; if (g.measureText(t).width > maxW && ln) { out.push(ln); ln = w; } else ln = t; } if (ln) out.push(ln); return out; }
const chatUI = (() => {
  const st = document.createElement('style'); st.textContent = `
#chat-btn { position: fixed; top: calc(max(10px, env(safe-area-inset-top)) + 40px); right: max(10px, env(safe-area-inset-right)); z-index: 20; display: none; font: 900 12px Arial, sans-serif; padding: 8px 12px; border-radius: 12px; border: 0; background: rgba(0,0,0,0.6); color: #fff; }
body.flat.mpon #chat-btn { display: block; }
#chat-box { position: fixed; left: 50%; top: max(10px, env(safe-area-inset-top)); transform: translateX(-50%); z-index: 45; display: none; gap: 6px; background: rgba(10,12,30,0.92); padding: 8px; border-radius: 16px; border: 3px solid #ffd400; width: min(520px, 92vw); box-sizing: border-box; }
#chat-box.on { display: flex; } #chat-box input { flex: 1; min-width: 0; font: 700 16px Arial; padding: 9px 10px; border-radius: 10px; border: 0; }
#chat-box button { font: 900 13px Arial; border: 0; border-radius: 10px; padding: 0 12px; background: #39ff14; color: #111; } #chat-box button.x { background: #444; color: #fff; }
#chat-log { position: fixed; z-index: 19; pointer-events: none; display: none; flex-direction: column; gap: 3px; max-width: 46vw; }
body.flat.mpon #chat-log { display: flex; }
#chat-log div { font: 700 12px Arial, sans-serif; color: #fff; background: rgba(0,0,0,0.55); padding: 3px 8px; border-radius: 8px; text-shadow: 0 1px 2px #000; transition: opacity .6s; }
#chat-log div b { color: #ffd400; }`;
  document.head.appendChild(st);
  const btn = document.createElement('button'); btn.id = 'chat-btn'; btn.textContent = '💬 CHAT'; document.body.appendChild(btn);
  const box = document.createElement('div'); box.id = 'chat-box'; box.innerHTML = '<input id="chat-in" maxlength="90" placeholder="Say something…" enterkeyhint="send" autocomplete="off"><button id="chat-send">SEND</button><button class="x" id="chat-x">✕</button>'; document.body.appendChild(box);
  const log = document.createElement('div'); log.id = 'chat-log'; document.body.appendChild(log);
  const inp = box.querySelector('input');
  const close = () => { box.classList.remove('on'); inp.blur(); };
  const send = () => { if (mp.chat(inp.value)) inp.value = ''; close(); };
  btn.addEventListener('click', () => { box.classList.add('on'); setTimeout(() => inp.focus(), 30); });
  box.querySelector('#chat-send').addEventListener('click', send); box.querySelector('#chat-x').addEventListener('click', close);
  inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') send(); if (e.key === 'Escape') close(); });
  inp.addEventListener('keyup', (e) => e.stopPropagation());
  const add = (name, text) => { const d = document.createElement('div'); d.innerHTML = `<b></b> `; d.querySelector('b').textContent = name + ':'; d.appendChild(document.createTextNode(text)); log.appendChild(d);
    while (log.children.length > 5) log.firstChild.remove(); setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 700); }, 15000); };
  // the log sits just under the Eat Meter, wherever that is on this screen
  const corners = [[-0.05, -0.03125], [0.05, -0.03125]].map(([x, y]) => new THREE.Vector3(x, y, 0)), v = new THREE.Vector3();
  const place = () => { if (!player.wrist || !player.wrist.visible) return; let x0 = 1e9, y1 = -1e9; player.wrist.updateMatrixWorld();
    for (const c of corners) { v.copy(c).applyMatrix4(player.wrist.matrixWorld).project(camera); const sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight; x0 = Math.min(x0, sx); y1 = Math.max(y1, sy); }
    if (isFinite(x0)) { log.style.left = Math.max(6, x0) + 'px'; log.style.top = (y1 + 6) + 'px'; } };
  return { add, update() { document.body.classList.toggle('mpon', !!net.connected); if (net.connected && player.flatMode) place(); }, get typing() { return box.classList.contains('on'); } };
})();

// ---------------- main loop ----------------
function elasticOut(t) { return t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1; }

// ---------------- pause menu (the ⏸ button on phones / computers) ----------------
let paused = false;
const pauseEl = document.getElementById('pause');
// ---------------- the end of a game: you're held looking at the receipt (your final score), everything else goes,
// and the only way on is MAIN MENU (or, in multiplayer, back to the room's lobby with the same people)
function gameOver(lines) {
  if (G.over) return; G.over = true; player.menuLock = true; player.noTurn = true; player.flatMove = { x: 0, z: 0 };
  document.body.classList.add('gameover'); touch.show(false); if (player.wrist) player.wrist.visible = false;
  const leaveTxt = net.connected ? '↩ RETURN TO LOBBY' : '🏠 MAIN MENU';
  document.getElementById('over-leave').textContent = leaveTxt; document.getElementById('end-leave').textContent = leaveTxt;
  // multiplayer: the host can start the same game again for everyone, right from here (nobody goes back to the menu)
  for (const id of ['over-again', 'end-again']) { const el = document.getElementById(id); el.style.display = !net.connected || net.host ? '' : 'none'; el.textContent = net.connected ? '▶ PLAY AGAIN (EVERYONE)' : '▶ PLAY AGAIN'; }
  setTimeout(placeReceipt, 30);
  try { sessionStorage.setItem('rs_was_host', net.connected && net.host ? '1' : ''); } catch (e) {}
  const best = (lines || []).find(l => l[1] !== '' && l[1] !== undefined); document.getElementById('end-where').textContent = best ? `${best[0]}: ${best[1]}` : 'Here\'s how you did';
  const rc = director.receipt; if (rc) { camera.add(rc); rc.renderOrder = 999; rc.material.depthTest = false; rc.material.depthWrite = false; rc.rotation.set(0, 0, 0); placeReceipt(); rc.visible = true; }
  if (renderer.xr.isPresenting) { setPaused(true); pauseEl.classList.add('show-end'); }
}
// the receipt: as big as fits on this screen, between a little gap at the top and the buttons at the bottom (any phone,
// either way up, a computer); in the headset, a card in front of you
function placeReceipt() { const rc = director.receipt; if (!rc || !G.over) return;
  if (renderer.xr.isPresenting) { rc.position.set(-0.3, -0.05, -0.8); rc.scale.setScalar(0.62); return; }
  const d = 0.62, vh = 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), vw = vh * camera.aspect, px = Math.max(200, window.innerHeight);
  const btn = document.getElementById('over'), bh = (btn && btn.offsetHeight ? btn.offsetHeight : 70) + 28, topGap = 14;
  const availH = vh * (1 - (bh + topGap) / px), sc = Math.min(availH / 0.88, (vw * 0.94) / 0.5);
  rc.scale.setScalar(sc); rc.position.set(0, vh / 2 - (topGap / px) * vh - 0.44 * sc, -d); }
window.addEventListener('resize', () => setTimeout(placeReceipt, 60));
const leaveGame = () => { location.href = location.pathname + (net.connected && net.code ? '?lobby=' + encodeURIComponent(net.code) : ''); };
document.getElementById('over-leave').addEventListener('click', leaveGame);
for (const id of ['over-again', 'end-again']) document.getElementById(id).addEventListener('click', () => { if (net.connected && !net.host) return; initAudio(); const m = curMode(); if (director.mode === 'chonkoff2') SEL.mode = 'chonkoff2'; if (net.connected) hostNewGame(m); else newGame(m); });
document.getElementById('end-leave').addEventListener('click', leaveGame);
renderer.xr.addEventListener('sessionend', () => { if (vrEC) vrEmoteView(false); if (G.over) { setPaused(false); } });
function setPaused(on) {
  if (!on && G.over && renderer.xr.isPresenting) return;        // (no un-pausing back into a finished game)
  // (a menu open: you stay put until you close it, even in multiplayer where the game carries on)
  paused = on; player.menuLock = on; pauseEl.classList.toggle('on', on); pauseEl.classList.toggle('in-vr', renderer.xr.isPresenting); if (!on) { pauseEl.classList.remove('show-chars', 'show-ctrls', 'show-modes', 'show-music', 'show-tv'); vrPause && vrPause.close(); }
  if (on) { const guest = !!(net.connected && !net.host);   // multiplayer: only the host changes the game or restarts it
    document.getElementById('pause-mode').style.display = guest ? 'none' : ''; document.getElementById('pause-restart').style.display = guest ? 'none' : ''; document.getElementById('pause-char').style.display = net.connected ? '' : 'none';
    const t = document.getElementById('ready-tag'); document.getElementById('pause-where').textContent = (t ? t.textContent : '') + (guest ? ' · the host picks the game' : ''); try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} }
  setMuted(on || soundOff);
}
let soundOff = false;
document.getElementById('menu-btn').addEventListener('click', () => setPaused(true));
document.getElementById('pause-resume').addEventListener('click', () => { initAudio(); setPaused(false); });
document.getElementById('pause-restart').addEventListener('click', () => { hostNewGame(curMode()); });
function curMode() { return director.mode ? director.fullMode : chosenMode(); }
// the FPS / ping display (switched on and off from the pause menu; remembered on this device)
const statsEl = document.createElement('div'); statsEl.id = 'net-stats';
statsEl.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:max(6px,env(safe-area-inset-bottom));z-index:60;pointer-events:none;background:rgba(0,0,0,0.72);color:#fff;font:700 12px/1.2 ui-monospace,Menlo,monospace;padding:4px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.35);display:none;white-space:nowrap';
document.body.appendChild(statsEl);
let showStats = false; try { showStats = localStorage.getItem('rs_stats') === '1'; } catch (e) {}
const statsBtn = () => { const b = document.getElementById('pause-stats'); if (b) b.textContent = showStats ? '📶 FPS / PING: ON' : '📶 FPS / PING: OFF'; statsEl.style.display = showStats ? 'block' : 'none'; };
document.getElementById('pause-stats')?.addEventListener('click', () => { showStats = !showStats; try { localStorage.setItem('rs_stats', showStats ? '1' : '0'); } catch (e) {} statsBtn(); });
statsBtn();
setInterval(() => { if (!showStats) return; const n = (window.ronnieMP && window.ronnieMP.net) || null, on = n && n.connected;
  const ping = on ? Math.round(n.rtt || 0) : null, col = ping === null ? '#fff' : ping < 80 ? '#7cff6a' : ping < 160 ? '#ffd400' : '#ff5252';
  statsEl.innerHTML = `FPS <b style="color:${G.fps >= 50 ? '#7cff6a' : G.fps >= 28 ? '#ffd400' : '#ff5252'}">${G.fps}</b>` + (on ? ` · PING <b style="color:${col}">${ping}ms</b> · ${n.players.size + 1} IN ROOM` : ' · SOLO'); }, 500);
// SOUND & FEEL: the sound mix and the buzz (mixui.js)
{ const st = document.createElement('style'); st.textContent = MIX_CSS; document.head.appendChild(st); }
document.getElementById('pause-mix').addEventListener('click', () => { buildMix(document.getElementById('pause-mix-body')); pauseEl.classList.add('show-mix'); });
document.getElementById('pause-mix-back').addEventListener('click', () => pauseEl.classList.remove('show-mix'));
// the buzz: VR controllers' rumble while in the headset, and where your head is (only your own sounds buzz)
haptics.hookShake((k) => player.shake(k));
haptics.hook((strength, ms) => { if (!renderer.xr.isPresenting) return false; for (const h of player.hands) if (h.source && h.pulse) h.pulse(strength, Math.max(20, ms)); return true; }, () => player.head);
document.getElementById('pause-sound').addEventListener('click', (e) => { soundOff = !soundOff; e.currentTarget.textContent = soundOff ? '🔇 SOUND: OFF' : '🔊 SOUND: ON'; });
document.getElementById('pause-quit').addEventListener('click', () => {
  if (net.connected && !renderer.xr.isPresenting && !window.confirm('Leave the game? You\'ll drop out of the room.')) return;     // (multiplayer: no leaving by accident)
  location.href = location.pathname; });
// the tap that opened a menu (the music, a TV) mustn't also press whatever button it lands on in that menu
document.getElementById('pause').addEventListener('click', (e) => { if (performance.now() - (window.__menuOpenAt || 0) < 450) { e.stopPropagation(); e.preventDefault(); } }, true);
document.getElementById('pause-controls').addEventListener('click', () => {
  const touchy = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
  document.querySelectorAll('#pause .clist').forEach(l => l.classList.toggle('on', l.dataset.d === (renderer.xr.isPresenting ? 'vr' : touchy ? 'touch' : 'pc')));
  pauseEl.classList.add('show-ctrls');
});
// change game mode from the pause menu (only the games this place has)
const PAUSE_MODES = {
  everyone: ['👥', 'THE WHOLE SQUAD', 'Everyone takes turns attacking you while you eat'],
  chonkoff: ['⏱️', 'EAT-OFF · 1 PLAYER', '60 seconds. Eat everything'],
  chonkoff2: ['🆚', 'EAT-OFF · 2 PLAYERS', 'Pass-and-play: who eats more?'],
  chonkoffr: ['🏅', 'RANKED EAT-OFF', 'Everyone at once, 60 seconds: your online rating is on the line'],
  sweep: ['🛒', 'SUPERMARKET SWEEP', 'Grab the most calories. Dodge security'],
  bbq: ['🍖', "IAN'S BARBECUE", 'Eat off the grill before Ian makes it healthy'],
  date: ['💜', 'DATE NIGHT', 'Eat when Chloe looks away'],
  roam: ['🚶', 'FREE ROAM · WITH THE SQUAD', 'Have a look round. Everyone\'s about, nobody attacks'],
  roam0: ['🧍', 'FREE ROAM · JUST YOU', 'The place to yourself: no NPCs at all'],
  runpub1: ['🌙', 'RUN THE PUB · QUIET NIGHT', 'Easy: a few regulars, plenty of patience'],
  runpub: ['🍺', 'RUN THE PUB · FRIDAY NIGHT', 'Behind the bar: serve the punters, sort out the trouble'],
  runpub3: ['🔥', 'RUN THE PUB · CUP FINAL', 'Hard: rammed, impatient, kicking off. Big tips though'],
  imposter: ['🔪', 'IMPOSTER · 1 IMPOSTER', 'Multiplayer: do your jobs, find the imposter, vote them out'],
  imposter2: ['🔪', 'IMPOSTER · 2 IMPOSTERS', 'Multiplayer: two imposters among you (5+ players)'],
  boss: ['👹', 'BOSS FIGHT', 'A giant mate: eat to power up, throw food to bring them down'],      // (BOSS FIGHT)
};
const PLACE_GAMES = { pub: ['everyone', 'runpub1', 'runpub', 'runpub3', 'imposter', 'imposter2', 'boss', 'chonkoff', 'chonkoff2', 'chonkoffr', 'roam', 'roam0'], bedroom: ['everyone', 'chonkoff', 'chonkoff2', 'chonkoffr', 'roam', 'roam0'], shop: ['sweep', 'roam', 'roam0'], garden: ['bbq', 'boss', 'roam', 'roam0'], restaurant: ['date', 'roam', 'roam0'] };
const modeTitle = () => { const m = director.fullMode; return (PAUSE_MODES[m] && PAUSE_MODES[m][1]) || (m === 'classic' ? 'CLASSIC' : m === 'intervention' ? 'THE SQUAD' : (m || '').toUpperCase()); };
function showPauseModes() {
  const list = document.getElementById('pause-mode-list'), cur = director.fullMode;
  list.innerHTML = (PLACE_GAMES[room.placeId] || PLACE_GAMES.bedroom).filter(id => net.connected || !PAUSE_MODES[id] || !id.startsWith('imposter')).map(id => { const [ico, name, desc] = PAUSE_MODES[id];
    return `<button class="alt mode-opt${id === cur ? ' cur' : ''}" data-id="${id}">${ico} ${name}<small>${id === cur ? 'Playing now · tap to restart' : desc}</small></button>`; }).join('');
  list.querySelectorAll('.mode-opt').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.id; SEL.mode = id;
    try { const st = JSON.parse(localStorage.getItem('rs_menu') || '{}'); st.mode = id; localStorage.setItem('rs_menu', JSON.stringify(st)); } catch (e) {}
    initAudio(); hostNewGame(id);
  }));
  pauseEl.classList.add('show-modes');
}
document.getElementById('pause-mode').addEventListener('click', showPauseModes);
// multiplayer: change who you're playing as without leaving the game (body, name on the HUD, emotes all switch)
function showPauseChars() {
  const grid = document.getElementById('pause-char-grid'), taken = new Set([...net.players.values()].map(p => p.char).filter(c => c && c !== 'ronnie'));
  const ids = ['ronnie', 'tommy', ...Object.keys(SQUAD).filter(id => id !== 'ronnie' && !/^p\d+$/.test(id) && SQUAD[id].model)];
  const nm = (id) => id === 'tommy' ? 'Tommy' : (SQUAD[id] && SQUAD[id].name) || id;
  grid.innerHTML = ids.map(id => `<button class="alt${id === net.char ? ' cur' : ''}" data-id="${id}" ${taken.has(id) && id !== net.char ? 'disabled' : ''}><img src="./assets/portraits/${id}.webp" alt="">${nm(id).toUpperCase()}</button>`).join('');
  grid.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { if (b.disabled) return; const id = b.dataset.id; if (id === net.char) { pauseEl.classList.remove('show-chars'); return; }
    mp.setChar(id); try { localStorage.setItem('rs_mp_char', id); } catch (e) {} if (selfBody) { selfBody.dispose(); selfBody = null; } G.wristDirty = true;
    words.show(`YOU'RE ${nm(id).toUpperCase()} NOW`, player.head.clone().addScaledVector(player.fwd, 1.1), '#ffd400', 0.1, 1.6); pauseEl.classList.remove('show-chars'); initAudio(); setPaused(false); }));
  pauseEl.classList.add('show-chars');
}
document.getElementById('pause-char').addEventListener('click', showPauseChars);
document.getElementById('pause-chars-back').addEventListener('click', () => pauseEl.classList.remove('show-chars'));
document.getElementById('pause-modes-back').addEventListener('click', () => pauseEl.classList.remove('show-modes'));
document.getElementById('pause-ctrls-back').addEventListener('click', () => pauseEl.classList.remove('show-ctrls'));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && player.flatMode) setPaused(!paused); });
document.addEventListener('visibilitychange', () => { if (document.hidden && player.flatMode && !paused) setPaused(true); });   // switching apps pauses

// the loading screen goes once the first frame of the level has been drawn
let loadShown = true;
function hideLoading() { if (!loadShown) return; loadShown = false; const ls = document.getElementById('loadscreen'); if (ls && ls.classList.contains('on')) { window.__ls && window.__ls('go'); setTimeout(() => { ls.classList.add('fade'); setTimeout(() => ls.classList.remove('on', 'fade'), 320); }, 220); } }
const menuCam = new THREE.PerspectiveCamera(70, 1, 0.05, 40), menuShot = { t: 0, yaw: 0, dir: 1 };
// ---------------- the pause menu in the headset ----------------
// The phone's pause menu, drawn on a panel that floats in front of you: point a controller (or your hand) at a
// button and pull the trigger (or pinch). It mirrors whatever the phone menu is showing (main page, controls,
// game modes), and pressing a button presses the real one, so the two never disagree.
// VR menus: the real page (the pause menu, the dev menu) on a panel in front of you, exactly as it looks on a phone or
// a computer (vrdom.js): point and pull the trigger to tap, hold it and move to drag, the stick to scroll
const vrPointers = () => player.hands.filter(h => h.source && h.ctrl).map(h => { const gp = h.source.gamepad; return { obj: h.ctrl, down: !!(gp && gp.buttons[0] && gp.buttons[0].pressed), stickY: gp && gp.axes ? (gp.axes[3] || 0) : 0, h }; });
const vrLasers = (() => { const ls = [0, 1].map(() => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffd400, depthTest: false })); l.renderOrder = 61; l.visible = false; return l; });
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.007, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd400, depthTest: false })); dot.renderOrder = 62; dot.visible = false; scene.add(dot);
  return { show(ptrs) { dot.visible = false; ptrs.forEach((p, i) => { const l = ls[i]; if (!l) return; if (l.parent !== p.obj) p.obj.add(l); l.visible = true; l.scale.z = p.hit ? p.hit.distance : 1.5; if (p.hit) { dot.position.copy(p.hit.point); dot.visible = true; } }); },
    hide() { ls.forEach(l => { l.visible = false; }); dot.visible = false; } }; })();
function vrMenu(getEl, width) {
  const panel = new DomPanel(scene, { width, renderOrder: 60 });
  const back = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 10), new THREE.MeshBasicMaterial({ color: 0x080c28, transparent: true, opacity: 0.55, side: THREE.BackSide, depthTest: false, depthWrite: false }));
  back.renderOrder = 59; back.visible = false; scene.add(back);
  const _fd = new THREE.Vector3();
  // always in front of you: it follows your head (gently), wherever you are and whichever way you turn
  function follow(snap) {
    _fd.set(player.fwd.x, 0, player.fwd.z); if (_fd.lengthSq() < 1e-6) _fd.set(0, 0, -1); _fd.normalize();
    const want = player.head.clone().addScaledVector(_fd, 1.0); want.y = player.head.y - 0.12;
    if (snap || panel.mesh.position.distanceTo(want) > 1.5) panel.mesh.position.copy(want); else panel.mesh.position.lerp(want, 0.08);
    panel.mesh.lookAt(player.head.x, panel.mesh.position.y, player.head.z); back.position.copy(player.head);
  }
  return {
    open() { if (panel.open) return; panel.show(getEl); back.visible = true; follow(true); },
    close() { if (!panel.open) return; panel.hide(); back.visible = false; vrLasers.hide(); },
    update(dt) { if (!panel.open) return; follow(false); const ptrs = vrPointers(); panel.update(dt, ptrs); vrLasers.show(ptrs); },
    get open_() { return panel.open; }, panel,
  };
}
var vrPause = vrMenu(() => [...document.querySelectorAll('#pause .box')].find(b => getComputedStyle(b).display !== 'none'), 0.95);
// developer mode in VR: B brings up the dev menu (the same one as on a phone or a computer), B again (or its CLOSE) puts it away
const vrDev = (() => { const m = vrMenu(() => document.getElementById('dev-panel'), 1.0); let bWas = false;
  return { update(dt) {
    const h = player.hands.find(h => h.source && h.handedness === 'right' && h.source.gamepad), gp = h && h.source.gamepad, b = !!(gp && gp.buttons[5] && gp.buttons[5].pressed);
    const dp = document.getElementById('dev-panel'), on = !!(dp && dp.classList.contains('on'));
    if (!window.__devMode || !renderer.xr.isPresenting || paused) { if (m.open_) m.close(); bWas = b; return; }
    if (b && !bWas) { const btn = document.getElementById('dev-btn'); if (btn) btn.click(); }      // (the dev button: opens / closes the dev menu, as on a phone)
    bWas = b;
    const nowOn = !!(dp && dp.classList.contains('on'));
    if (nowOn && !m.open_) { m.open(); player.menuLock = true; } else if (!nowOn && m.open_) { m.close(); player.menuLock = paused; }
    void on; m.update(dt);
  }, get open() { return m.open_; }, menu: m }; })();
// Quest: the left menu button (or Y) pauses; so does the Quest's own menu coming up over the game
let menuHeld = false;
function vrMenuButtons() {
  let down = false;
  for (const h of player.hands) { const gp = h.source && h.source.gamepad; if (!gp || h.handedness !== 'left') continue;
    gp.buttons.forEach((b, i) => { if (b && b.pressed && ![0, 1, 2, 3, 4, 6].includes(i)) down = true; }); }      // (5 = Y; anything past the usual ones = the menu button)
  if (down && !menuHeld) { if (paused) { initAudio(); setPaused(false); } else setPaused(true); }
  menuHeld = down;
}
// leaving the headset with the game paused: the headset menu goes (and its dark backdrop), the phone/computer pause
// menu shows instead; coming back in, the menu's in front of you again
renderer.xr.addEventListener('sessionend', () => { vrPause.close(); pauseEl.classList.remove('in-vr'); player.menuLock = paused; player.noTurn = false; player.wheelOpen = false; });
renderer.xr.addEventListener('sessionstart', () => { if (paused) pauseEl.classList.add('in-vr'); });
// developer mode, putting the headset on: the dev menu (which opens by itself on a phone or computer) starts closed, so
// you can walk about straight away. B brings it up
renderer.xr.addEventListener('sessionstart', () => { if (!window.__devMode) return; const dp = document.getElementById('dev-panel'), btn = document.getElementById('dev-btn'); if (dp && btn && dp.classList.contains('on')) btn.click(); });
renderer.xr.addEventListener('sessionstart', () => { const s = renderer.xr.getSession(); s.addEventListener('visibilitychange', () => { if (s.visibilityState !== 'visible' && !paused && director.running) setPaused(true); }); });

// VR emote wheel (multiplayer): press B once to open it (it stays open in front of you), push the right stick at an
// emote and press A or the trigger to do it. One slot flips between DEFAULT EMOTES and your character's own. B again
// closes it.
const charEmotes = () => CHAR_EMOTES[net.char] || [];
const charEmoteTitle = () => `${((SQUAD[net.char] && SQUAD[net.char].name) || 'MY').toUpperCase()}'S EMOTES`;
const vrEmote = (() => {
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  mesh.renderOrder = 61; mesh.visible = false; scene.add(mesh);
  let open = false, sel = -1, drawn = '', page = 0, bWas = false, okWas = false;
  // page -1: pick a set first (DEFAULT EMOTES or your character's), then 0 / 1: that set's wheel (with a way back)
  const slots = () => { const own = charEmotes();
    if (page < 0) return [{ id: '__def', icon: '😎', name: 'DEFAULT EMOTES' }, { id: '__own', icon: own[0] ? own[0].icon : '⭐', name: charEmoteTitle() }];
    const list = page === 0 ? EMOTES : own; return own.length ? [...list, { id: '__back', icon: '⬅', name: 'BACK' }] : list; };
  const draw = () => { const L = slots(), key = page + '|' + sel + '|' + L.length; if (drawn === key) return; drawn = key; g.clearRect(0, 0, S, S); const n = L.length, c = S / 2;
    g.fillStyle = 'rgba(20,28,90,0.9)'; g.beginPath(); g.arc(c, c, 250, 0, Math.PI * 2); g.fill(); g.lineWidth = 8; g.strokeStyle = '#ffd400'; g.stroke();
    const r = n === 2 ? 100 : n > 6 ? 72 : 84;
    L.forEach((e, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n, two = page < 0, x = two ? c + (i ? 112 : -112) : c + Math.cos(a) * 165, y = two ? c + 40 : c + Math.sin(a) * 165, pg = e.id.startsWith('__');
      g.fillStyle = i === sel ? '#ff4fa3' : pg ? '#3a2a7a' : '#1c2c8c'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.lineWidth = 6; g.strokeStyle = i === sel ? '#fff' : '#ffd400'; g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${r * 0.7}px serif`; g.fillText(e.icon, x, y - 14); g.fillStyle = '#fff';
      let f = 20; do { g.font = `900 ${f}px Arial`; f--; } while (g.measureText(e.name).width > r * 1.8 && f > 10); g.fillText(e.name, x, y + r * 0.52); });
    g.fillStyle = '#ffd400'; g.font = '900 24px Arial'; g.textAlign = 'center'; g.fillText(page < 0 ? 'WHICH EMOTES?' : page === 0 ? 'DEFAULT EMOTES' : charEmoteTitle(), c, page < 0 ? c - 120 : c - 22);
    g.fillStyle = '#fff'; g.font = '900 17px Arial'; if (page >= 0) { g.fillText(sel < 0 ? 'STICK TO PICK' : 'A / TRIGGER TO GO', c, c + 10); g.fillText('B TO CLOSE', c, c + 34); } else { g.fillText('STICK LEFT / RIGHT, THEN A', c, c + 175); } tex.needsUpdate = true; };
  const place = () => { const f = new THREE.Vector3(player.fwd.x, 0, player.fwd.z).normalize(); mesh.position.copy(player.head).addScaledVector(f, 0.55).add({ x: 0, y: -0.08, z: 0 }); mesh.lookAt(player.head); };
  const close = () => { open = false; mesh.visible = false; player.noTurn = false; player.wheelOpen = false; };
  return { update() {
    const h = player.hands.find(h => h.source && h.handedness === 'right' && h.source.gamepad), gp = h && h.source.gamepad;
    const bDown = !!(gp && gp.buttons[5] && gp.buttons[5].pressed), ok = !!(gp && ((gp.buttons[4] && gp.buttons[4].pressed) || (gp.buttons[0] && gp.buttons[0].pressed)));
    if (!net.connected || !renderer.xr.isPresenting || paused || window.__devMode) { if (open) close(); bWas = bDown; okWas = ok; return; }      // (developer mode: B is the dev menu, which has the emotes)
    if (bDown && !bWas) { if (open) close(); else { open = true; sel = -1; drawn = ''; page = charEmotes().length ? -1 : 0; player.noTurn = true; player.wheelOpen = true; } }
    bWas = bDown;
    if (open) {
      place(); mesh.visible = true; const L = slots();
      const ax = gp && (gp.axes.length >= 4 ? gp.axes[2] : gp.axes[0]) || 0, ay = gp && (gp.axes.length >= 4 ? gp.axes[3] : gp.axes[1]) || 0;
      if (page < 0) { if (Math.abs(ax) > 0.55) { const i = ax < 0 ? 0 : 1; if (i !== sel) { sel = i; h && h.pulse && h.pulse(0.3, 20); } } }
      else if (Math.hypot(ax, ay) > 0.55) { let a = Math.atan2(ay, ax) + Math.PI / 2; const n = L.length; a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); const i = Math.round(a / (2 * Math.PI / n)) % n; if (i !== sel) { sel = i; h && h.pulse && h.pulse(0.3, 20); } }
      if (ok && !okWas && sel >= 0) { const e = L[sel]; if (e.id === '__def' || e.id === '__own' || e.id === '__back') { page = e.id === '__def' ? 0 : e.id === '__own' ? 1 : -1; sel = -1; drawn = ''; h && h.pulse && h.pulse(0.5, 30); } else { close(); track('emotes'); mp.emote(e.id); } }
      if (open) draw();
    }
    okWas = ok;
  }, get open() { return open; } };
})();
// multiplayer as one of the squad (or Tommy): you see your own character's body when you look down, not Ronnie's belly
let selfBody = null, selfBodyErrs = 0;
function selfBodyUpdate(dt) {
  const want = net.connected && net.char && net.char !== 'ronnie';
  if (!want || !selfBody) { if (vrEC) vrEmoteView(false); }
  if (!want) { if (selfBody) { selfBody.dispose(); selfBody = null; player.hideBelly = false; } return; }
  if (!selfBody) { selfBody = net.makeAvatar({ char: net.char, name: '', self: true }); player.hideBelly = !!selfBody; if (!selfBody) return; }
  const q = camera.getWorldQuaternion(new THREE.Quaternion()), side = (k) => player.hands.find(h => h.handedness === k && h.tracked);
  const R0 = side('right'), L0 = side('left'), rh = player.flatMode ? player.flatAnchorPos() : (R0 ? R0.palm : player.head), lh = player.flatMode ? player.head : (L0 ? L0.palm : player.head);
  const live = { h: [player.head.x, player.head.y, player.head.z], q: [q.x, q.y, q.z, q.w], rh: [rh.x, rh.y, rh.z], l: [lh.x, lh.y, lh.z], flat: player.flatMode ? 1 : 0, st: G.stage };
  const vr = renderer.xr.isPresenting && !player.flatMode, emo = !!(selfBody.emote && selfBody.emote.active);
  vrEmoteView(vr && emo, live);
  selfBody.update(dt, player.vrEmoteHold ? { ...player.vrEmoteHold, st: G.stage } : live);
  // in VR your own arms aren't drawn on your body (your real hands are right there: the body's copy of them only lagged
  // behind and jittered about). Everyone else still sees them, smoothed. They're back for an emote, watched from out front
  const r = selfBody.c.rag, hideArms = vr && !emo; if (!r.partHide) r.partHide = {};
  for (const n of ['uArmL', 'lArmL', 'uArmR', 'lArmR']) r.partHide[n] = hideArms;
  if (!r.handHide) return;
  if (hideArms) { r.handHide.lArmL = r.handHide.lArmR = true; selfBody.armsHid = true; } else if (selfBody.armsHid) { r.handHide.lArmL = r.handHide.lArmR = false; selfBody.armsHid = false; }
}
// VR: your own emote, watched from out front. When it starts, your body stays where it was (and that's where everyone
// else sees you), and you're stood a couple of metres in front of it, facing it, until it's over; then you're back in it
let vrEC = null;
function vrEmoteView(on, live) {
  const sb = selfBody;
  if (on && !vrEC && sb) {
    const r = sb.c.rag, f = sb.fwd(), big = r.group ? r.group.scale.y : 1, ei = sb.emote.id && emoteInfo(sb.emote.id), dist = 2.5 * big * ((ei && ei.cam) || 1), a = 0.3, side = new THREE.Vector3(f.z, 0, -f.x);
    const look = new THREE.Vector3(r.root.x, 1.1 * big, r.root.z), want = emoteBestSpot(look, f, dist, 1.1 * big);
    vrEC = { pos: player.rig.position.clone(), rot: player.rig.rotation.y };
    player.vrEmoteHold = { h: live.h.slice(), q: live.q.slice(), rh: live.rh.slice(), l: live.l.slice(), flat: 0 };
    player.emoteLock = true;
    // turn so you face your body, then slide across so your head's on the spot
    const yawOf = (v) => Math.atan2(-v.x, -v.z), fw = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));
    player.rig.rotation.y += yawOf(look.clone().sub(want)) - yawOf(fw); player.rig.updateMatrixWorld(true);
    const eye = camera.getWorldPosition(new THREE.Vector3()); player.rig.position.x += want.x - eye.x; player.rig.position.z += want.z - eye.z;
    player.rig.updateMatrixWorld(true); player.resetHandHistory && player.resetHandHistory();
    if (sb.c.rag) sb.c.rag.hideHead = false;
  } else if (!on && vrEC) {
    player.rig.position.copy(vrEC.pos); player.rig.rotation.y = vrEC.rot; player.rig.updateMatrixWorld(true);
    player.resetHandHistory && player.resetHandHistory();
    vrEC = null; player.vrEmoteHold = null; player.emoteLock = false;
  }
}
// the last line of defence: anything at an impossible position (NaN or Infinity: from a bad message, or a division by
// zero somewhere) goes back to where it last was, standing still. A NaN in the physics spreads to everything it touches
// and the whole room goes blank, so it's stopped here, every frame, and reported the first time
const _goodPos = new WeakMap(); let nanSeen = false, _rigGood = null;
const fin3 = (v) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
function nanGuard() {
  const bodies = physics.world.bodies;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i], p = b.position, q = b.quaternion;
    if (fin3(p) && fin3(b.velocity) && Number.isFinite(q.w) && fin3(q)) { let g = _goodPos.get(b); if (!g) _goodPos.set(b, g = [p.x, p.y, p.z]); else { g[0] = p.x; g[1] = p.y; g[2] = p.z; } continue; }
    const g = _goodPos.get(b) || [0, -50, 0]; p.set(g[0], g[1], g[2]); b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0); if (!(Number.isFinite(q.w) && fin3(q))) q.set(0, 0, 0, 1);
    if (b.previousPosition) b.previousPosition.copy(p); if (b.interpolatedPosition) b.interpolatedPosition.copy(p);
    if (!nanSeen) { nanSeen = true; try { window.__crash && window.__crash('caught', new Error('physics body at an impossible position (put back)')); } catch (e) {} }
  }
  const rp = player.rig.position;
  if (fin3(rp)) (_rigGood || (_rigGood = rp.clone())).copy(rp);
  else { rp.copy(_rigGood || new THREE.Vector3(0, 0, 0)); if (!nanSeen) { nanSeen = true; try { window.__crash && window.__crash('caught', new Error('player at an impossible position (put back)')); } catch (e) {} } }
}
let powerups = null;
function frame(simDt) {
  foodGlow(performance.now() / 1000);
  chatUI.update(); music.update(Math.min(0.05, 1 / 60)); tvs.update(1 / 60); pauseEl.classList.toggle('playing', !!(music.state.playing && music.state.key));
  if (renderer.xr.isPresenting && simDt == null) { vrMenuButtons(); vrEmote.update(); vrDev.update(1 / 60); }
  if (paused && simDt == null && net.connected) { if (renderer.xr.isPresenting) { vrPause.open(); vrPause.update(1 / 60); } }
  else if (paused && simDt == null) { clock.getDelta(); if (renderer.xr.isPresenting) { vrPause.open(); vrPause.update(1 / 60); } renderer.render(scene, camera); return; }    // frozen until RESUME
  const dt = simDt ?? Math.min(clock.getDelta(), 0.05);
  try { selfBodyUpdate(dt); } catch (e) { if (!selfBodyErrs++) { window.__crash && window.__crash('frame', e, { where: 'self body' }); console.warn('self body', e); } }      // (with the real frame time: a fixed 1/60 made your own body's emotes run slow and its physics bodies run away)
  time += dt;
  for (const f of (window.RS && window.RS.onFrame) || []) try { f(dt); } catch (e) { console.warn('onFrame', e); }      // (developer mode's test bench)
  const xr = renderer.xr.isPresenting;
  if (loadShown && time > 0.15) hideLoading();
  if (!xr) updateZoom();      // a couple of frames in: the level's there

  // WAITING (before PLAY): nothing runs, no people, no physics, no food. Just a slow turn round one spot in the map,
  // cutting to a different part of it every few seconds.
  if (!xr && !player.flatMode && simDt == null) {
    if ((menuShot.t -= dt) <= 0) {
      const spots = room.tommySpots || [];
      let s = { x: room.start.x, y: room.start.z };
      // a spot with a clear view (nothing right in front of the lens: a bush, a pillar)
      const meshes = scene.children.filter(o => o.isMesh && !o.isInstancedMesh && o.visible && o.material && !o.material.transparent && !o.userData.cpuFreed), rc = new THREE.Raycaster();
      for (let tries = 0; tries < 6 && spots.length; tries++) {
        const c = spots[Math.floor(Math.random() * spots.length)], y = (room.floorAt ? room.floorAt(c.x, c.y) : 0) + 1.65; let ok = true;
        for (const b of room.blockers || []) if (c.x > b.x0 - 1 && c.x < b.x1 + 1 && c.y > b.z0 - 1 && c.y < b.z1 + 1 && (b.y1 ?? 2) > 1.2) { ok = false; break; }      // (the level's own shapes: by their footprints)
        for (let a = 0; a < 6 && ok; a++) { rc.set(_b.set(c.x, y, c.y), new THREE.Vector3(Math.sin(a * 1.047), 0, Math.cos(a * 1.047))); rc.far = 1.0; if (rc.intersectObjects(meshes, false).length) ok = false; }
        s = c; if (ok) break;
      }
      menuShot.t = 6.5; menuShot.yaw = Math.random() * Math.PI * 2; menuShot.dir = Math.random() < 0.5 ? -1 : 1;
      menuCam.position.set(s.x, (room.floorAt ? room.floorAt(s.x, s.y) : 0) + 1.65, s.y);
    }
    menuShot.yaw += dt * 0.09 * menuShot.dir;
    menuCam.rotation.set(-0.12, menuShot.yaw, 0, 'YXZ');
    if (menuCam.aspect !== camera.aspect) { menuCam.aspect = camera.aspect; menuCam.fov = camera.fov; menuCam.updateProjectionMatrix(); }
    room.camera = menuCam; room.update(dt); room.camera = camera;
    weather.update(dt, menuCam);      // (weather.js)
    renderer.render(scene, menuCam);
    return;
  }

  // growth tween (0.6s elastic "boing")
  if (G.scaleT < 1) {
    G.scaleT = Math.min(1, G.scaleT + dt / 0.6);
    player.setScale(G.scaleFrom + (G.scaleTo - G.scaleFrom) * elasticOut(G.scaleT));
  }

  { const rp = player.rig.position, lw = G.lastWalk || (G.lastWalk = rp.clone()), d = Math.hypot(rp.x - lw.x, rp.z - lw.z); if (d < 2 && director.running && !G.over) track('walk', d); lw.copy(rp); }      // (how far you walked: the awards)
  player.update(dt, time); player.updateFace(dt);
  net.update(dt, player, G, scene);

  // touch the cabin lightbox in VR to flick to the next message
  if (xr && room.lightbox) { const lp = room.lightbox.mesh.getWorldPosition(_b); for (const h of player.hands) if (h.tracked && h.palm.distanceTo(lp) < 0.14) { if (!room.lightbox.cool) { room.lightbox.next(); sfx('toggle', lp, 0.6); h.pulse && h.pulse(0.5, 50); } room.lightbox.cool = 1; } if (room.lightbox.cool) room.lightbox.cool = Math.max(0, room.lightbox.cool - dt) || 0; }
  // press a game's PLAY sign by touching it (headset hands)
  if (xr) for (const gm of room.games || []) if (gm.button && gm.button.visible) for (const h of player.hands) if (h.tracked && h.palm.distanceTo(gm.button.position) < 0.2) { gm.toggle(); h.pulse && h.pulse(0.6, 60); }
  // play a fruit machine by touching it (headset hands)
  if (room.machines && xr && !director.imposter) for (const h of player.hands) if (h.tracked) for (const m of room.machines) if (h.palm.distanceTo(m.front) < 0.35 && m.spin()) { sfx('reels', m.front, 1); h.pulse && h.pulse(0.6, 80); }
  // eating & drinking held food (VR hands, or the on-screen hand)
  for (const h of player.flatMode ? [player.flatHolder] : player.hands) {
    const it = h.held;
    if (!it || it.dead) continue;
    if (it.def.drink) { drinkUpdate(it, h, dt); continue; }
    if (!it.def.prop && mouthGap(it) < TUNING.mouthRadius * player.scale) bite(it, h);
  }

  // A FULL-SCREEN CUT SCENE ON YOUR OWN (Ben's trip to Turkey): the world behind it stops dead (nobody walks about,
  // talks or throws anything, the timer waits, nothing's heard) until it's over. In a room the others carry on playing,
  // so it keeps running there
  const held = !!(attackFx.inCutscene && !net.connected);
  setHush(held);
  if (held) { attackFx.update(dt); if (player.flatMode) { updateTouchUI(); touch.busy(true); } G.fpsFrames++; G.fpsT += dt; if (G.fpsT >= 1) { G.fps = Math.round(G.fpsFrames / G.fpsT); G.fpsFrames = 0; G.fpsT = 0; }
    if (simDt == null) renderer.render(scene, camera); return; }
  items.update(dt);
  vegAndHits(dt);
  if (xr) slaps();
  physics.step(dt);
  nanGuard();
  if (room.nav) room.nav.spent = 0;      // (each frame's path finding allowance: nav.js)
  for (const c of cast) c.update(dt, mp.ctxFor(c, ctx));
  mp.update(dt);
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
  try { powerups && powerups.update(dt, time); } catch (e) { window.__crash && window.__crash('frame', e, { where: 'powerups' }); console.error('powerups', e); }
  attackFx.update(dt);
  if (player.flatMode) { updateTouchUI(); touch.busy(!!(attackFx.cut && !attackFx.cut.overlay)); }

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
  weather.update(dt, camera);      // weather and the time of day (weather.js)
  for (const gm of room.games || []) { gm.allowed = director.mode === 'roam'; gm.update(dt, player); }     // darts / table tennis: Free Roam only

  if (bannerT > 0) {
    bannerT -= dt;
    const k = 2.6 - bannerT;
    const pop = k < 0.25 ? k / 0.25 * 1.15 : 1.15 - Math.min(0.15, (k - 0.25));
    const bs = renderer.xr.isPresenting ? 0.6 : 1;        // (headset: smaller, so it's all in the middle of your view)
    banner.scale.set(1.2 * pop * player.scale * bs, 0.45 * pop * player.scale * bs, 1);
    banner.position.copy(player.head).addScaledVector(player.fwd, 1.3 * player.scale);
    banner.material.opacity = bannerT < 0.4 ? bannerT / 0.4 : 1;
    if (bannerT <= 0) banner.visible = false;
  }

  // fps (shown on the wrist so you can check you're at 72)
  G.fpsFrames++; G.fpsT += dt;
  if (G.fpsT >= 1) { G.fps = Math.round(G.fpsFrames / G.fpsT); G.fpsFrames = 0; G.fpsT = 0; G.wristDirty = true;
}
  G.wristT -= dt;
  if (director.running && director.mode !== 'classic' && Math.floor(director.timeLeft) !== G.lastHudSec) { G.lastHudSec = Math.floor(director.timeLeft); G.wristDirty = true; }
  { const hl = director.hud(); if (hl !== G.lastHudLine) { G.lastHudLine = hl; G.wristDirty = true; } if (director.imposter && (G.impHudT = (G.impHudT || 0) - dt) <= 0) { G.impHudT = 0.25; G.wristDirty = true; } }   // e.g. the attack countdown ticking
  // (the meter's moving parts: the bar sliding to its level, the combo timer draining, the flash, the near-full glow:
  // redrawn quicker while any of them is moving)
  { const max0 = G.stage === STAGES.length - 1, c0 = STAGES[G.stage].chonk, n0 = max0 ? c0 : STAGES[G.stage + 1].chonk, want = max0 ? 1 : Math.max(0, Math.min(1, (G.chonk - c0) / (n0 - c0)));
    if (G.fillShown == null || want < G.fillShown - 0.5) G.fillShown = want; else G.fillShown += (want - G.fillShown) * Math.min(1, dt * 9);
    if (G.meterFlash > 0) G.meterFlash = Math.max(0, G.meterFlash - dt * 2.2);
    const comboLive = G.combo >= 2 && time - G.comboAt < COMBO_GAP; if (!comboLive && G.combo >= 2 && time - G.comboAt >= COMBO_GAP) { G.combo = 0; G.wristDirty = true; }
    if (Math.abs(want - G.fillShown) > 0.002 || G.meterFlash > 0 || comboLive || (!max0 && want > 0.85)) { G.wristDirty = true; if (G.wristT > 1 / 30) G.wristT = 1 / 30; } }
  if (G.wristDirty && G.wristT <= 0) {
    G.wristDirty = false; G.wristT = 0.1;
    const max = G.stage === STAGES.length - 1;
    const cur = STAGES[G.stage].chonk, next = max ? cur : STAGES[G.stage + 1].chonk;
    const tierNow = G.combo >= 2 && time - G.comboAt < COMBO_GAP ? comboTier(G.combo) : null;
    player.drawWrist({
      stage: G.stage, stages: STAGES.length, name: stageNameOf(G.stage), chonk: G.chonk, next, max,
      fill: G.fillShown ?? (max ? 1 : (G.chonk - cur) / (next - cur)), loco: G.locoT, combo: tierNow ? { n: G.combo, col: tierNow[1], word: tierNow[2], left: 1 - (time - G.comboAt) / COMBO_GAP } : null, flash: G.meterFlash || 0, glow: !max && (G.chonk - cur) / (next - cur) > 0.85 ? 0.5 + 0.5 * Math.sin(time * 9) : 0, stout: G.stoutT, eaten: G.eaten, swats: G.swats, fps: G.fps,
      modeLine: (window.__devMode || window.__devPending) ? 'TEST BENCH · NO RANDOM ATTACKS' : director.hud(), title: (window.__devMode || window.__devPending) ? 'DEVELOPER MODE' : modeTitle(), dev: !!(window.__devMode || window.__devPending),
      pub: director.runpub ? director.runpub.hudState(director.timeLeft) : null,
      imp: director.imposter ? director.imposter.hudState() : null,
    });
  }

  _b.set(0, 1, 0).applyQuaternion(camera.getWorldQuaternion(_q));
  setListener(player.head, player.fwd, _b);

  if (simDt == null) renderer.render(scene, (director.boss && director.boss.cineCam()) || (director.imposter && director.imposter.replay && director.imposter.replay.cam) || emoteCam() || camera);      // (Imposter's end-of-game replay and the BOSS FIGHT entrance film from their own cameras)
  learnShader();      // (a shader built during play: remember its kind, so next time it's built up front)
}
// your own emote, on a phone or a computer: the camera swings round in front of you so you can watch your character do
// it (your own head shows while it does), then back to your eyes when it's done
const thirdCam = new THREE.PerspectiveCamera(55, 1, 0.05, 200); let ecK = 0, ecHidHand = false, ecLock = null;
function emoteCam() {
  const sb = selfBody, on = !!(sb && player.flatMode && !renderer.xr.isPresenting && sb.emote && sb.emote.active);
  ecK = on ? Math.min(1, ecK + 0.06) : 0;
  if (sb && sb.c && sb.c.rag) sb.c.rag.hideHead = !on && !vrEC;
  // (your first-person hand, floating by the camera, mustn't show while you watch yourself from out front)
  if (player.flatGrip) { if (on && player.flatGrip.visible) { player.flatGrip.visible = false; ecHidHand = true; } else if (!on && ecHidHand) { player.flatGrip.visible = true; ecHidHand = false; } }
  if (!on) { ecLock = null; return null; }
  // where it sits and what it looks at are worked out once, when the emote starts, then held completely still (no
  // following the bob of the body or where your head's turned)
  if (!ecLock || ecLock.em !== sb.emote.id || (sb.emote.t || 0) < ecLock.lastT) {
    const r = sb.c.rag, f = sb.fwd(), a = 0.3, ch = r.drawn ? r.drawn(r.pos('chest', new THREE.Vector3())) : r.pos('chest', new THREE.Vector3());
    const big = r.group ? r.group.scale.y : 1, ei = sb.emote.id && emoteInfo(sb.emote.id), dist = 2.9 * big * ((ei && ei.cam) || 1), side = new THREE.Vector3(f.z, 0, -f.x);
    const look = new THREE.Vector3(r.root.x, Math.max(0.6, ch.y * 0.85), r.root.z), want = emoteBestSpot(look, f, dist, 1.55 * big);
    ecLock = { em: sb.emote.id, lastT: 0, want, look }; }
  ecLock.lastT = sb.emote.t || 0;
  const eye = camera.getWorldPosition(new THREE.Vector3()); thirdCam.position.copy(eye).lerp(ecLock.want, ecK * ecK * (3 - 2 * ecK));
  thirdCam.aspect = camera.aspect; thirdCam.fov = camera.fov; thirdCam.updateProjectionMatrix(); thirdCam.lookAt(ecLock.look);
  return thirdCam;
}
// the emote camera mustn't end up behind a wall or inside the furniture (a chair back filling the screen): come in along
// the line towards you until the view's clear (walls and solid things from the room's colliders, tables and chairs from
// its footprints), but never closer than about a metre
const _ecBox = new THREE.Box3(), _ecHit = new THREE.Vector3(), _ecRay = new THREE.Ray();
// where to watch your own emote from: out in front, a little to one side. If a wall or the furniture is in the way there
// (you're stood by a wall: the view came right in to your nose), try round the other side, then further round, and take
// whichever spot sees you from furthest away (the ones nearer straight-on win if they're nearly as good)
function emoteBestSpot(look, f, dist, y) {
  const side = new THREE.Vector3(f.z, 0, -f.x); let best = null;
  for (const [i, a] of [0.3, -0.3, 0.75, -0.75, 1.25, -1.25, 1.8, -1.8].entries()) {
    const w = new THREE.Vector3(look.x, y, look.z).addScaledVector(f, Math.cos(a) * dist).addScaledVector(side, Math.sin(a) * dist);
    emoteCamSpot(look, w); const d = Math.hypot(w.x - look.x, w.z - look.z) - i * 0.04;
    if (!best || d > best.d) best = { d, w }; if (d >= dist * 0.97) break; }
  return best.w;
}
function emoteCamSpot(look, want) {
  const dir = want.clone().sub(look), d = dir.length(); if (d < 1e-3) return want; dir.normalize(); _ecRay.set(look, dir); let best = d;
  for (const c of room.colliders || []) { _ecBox.min.copy(c.min); _ecBox.max.copy(c.max); if (_ecBox.containsPoint(look)) continue;      // walls and solid things right across the line
    if (_ecRay.intersectBox(_ecBox, _ecHit)) { const t = _ecHit.distanceTo(look); if (t < best) best = t - 0.15; } }
  // furniture right where the lens would be (it fills the bottom of the picture): step in until there's half a metre clear
  const near = (x, z) => (room.blockers || []).some(b => (b.y1 ?? 2) > 0.3 && x > b.x0 - 0.45 && x < b.x1 + 0.45 && z > b.z0 - 0.45 && z < b.z1 + 0.45)
    || (room.dormant ? room.dormant.entries : []).some(e => !e.woken && e.type === 'chair' && Math.hypot(e.pos.x - x, e.pos.z - z) < 0.75)      // (the pub's stools and chairs: pick-up-able, so not in the footprints)
    || items.items.some(it => !it.dead && it.type === 'chair' && Math.hypot(it.pos.x - x, it.pos.z - z) < 0.75);
  let t = best; while (t > 0.9 && near(look.x + dir.x * t, look.z + dir.z * t)) t -= 0.1;
  t = Math.max(0.9, t); if (t < d) want.copy(look).addScaledVector(dir, t);
  return want;
}
// (one bad frame must never stop the game: log it, still draw, carry on with the next)
let frameErrs = 0;
renderer.setAnimationLoop(() => { if (window.__glLost) return; try { frame(); } catch (e) { window.__crash && window.__crash('frame', e); if (frameErrs++ < 5) console.error('frame', e); try { renderer.render(scene, camera); } catch (e2) {} } });

// Debug handle for testing in a desktop browser console.
// ---------------- multiplayer: the room was set up on the menu (SOLO / MULTIPLAYER), this carries it on ----------------
const net = (window.ronnieMP && window.ronnieMP.net) || new Net();
net.char = net.char || (window.ronnieMP && window.ronnieMP.char().id) || 'ronnie';
{ const $ = (id) => document.getElementById(id);
  const chip = () => { const n = net.players.size + 1, re = net.status === 'reconnecting';
    $('mp-chip').textContent = re ? `📶 RECONNECTING TO ROOM ${net.code}…` : `👥 ROOM ${net.code} · ${n} PLAYER${n > 1 ? 'S' : ''}${net.host ? ' · HOST' : ''}`;
    $('mp-chip').classList.toggle('on', net.connected || re); $('mp-chip').classList.toggle('re', re); };
  // the host tells anyone who joins late which place and game to load
  net.on.join = (m) => { chip(); if (m.quiet) { net.send({ t: 'hi', to: m.id, name: net.name, char: net.char }); return; } if (net.host) net.send({ t: 'setup', to: m.id, place: room.placeId, mode: director.fullMode || director.mode || SEL.mode }); words.show((m.name || 'A mate') + ' JOINED!', player.head.clone().addScaledVector(player.fwd, 1.2), '#ffd400', 0.12, 1.6); };
  net.on.leave = () => chip(); net.on.status = () => chip();
  // a new host (the old one left, or handed it over): everyone's told who; if it's you, your game takes over running
  // everything (the squad, the food, the game) from exactly where it was
  net.on.host = (m, was) => { chip();
    if (m.id === net.id && !was) { mp.becomeHost(); director.imposter && director.imposter.becomeHost && director.imposter.becomeHost(); showBanner('👑 YOU\'RE THE HOST NOW', m.why === 'given' ? 'HANDED BACK TO YOU' : 'THE HOST LEFT: YOU\'RE RUNNING THE GAME'); }
    else if (m.id !== net.id) showBanner('👑 ' + String(m.name || 'SOMEONE').toUpperCase() + ' IS THE HOST', m.why === 'given' ? 'HOSTING WAS HANDED OVER' : 'THE HOST LEFT');
    if (was && m.id !== net.id) mp.becomeGuest && mp.becomeGuest(); };
  // your progress (how big you've got, what you've eaten), kept by the room: drop out and come back, and it's yours again
  // the host's phone locked or went to another app: a phone stops the page, so everyone's game would stop with it.
  // Hand hosting on to the next player before it does (the room tells everyone; it can be handed back later)
  const handOff = () => { if (!net.connected || !net.host || !net.players.size) return; const next = [...net.players.values()][0]; if (next) net.send({ t: 'giveHost', to: next.id }); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && !renderer.xr.isPresenting) handOff(); });
  window.addEventListener('pagehide', handOff);
  setInterval(() => { if (net.connected) try { localStorage.setItem('rs_mp_last', JSON.stringify({ code: net.code, t: Date.now() })); } catch (e) {} }, 5000);      // (the home screen's REJOIN button)
  setInterval(() => { if (net.connected && director.running) net.send({ t: 'save', d: { chonk: Math.round(G.chonk * 10) / 10, stage: G.stage, eaten: G.eaten, swats: G.swats }, c: net.char }); }, 2000);
  let restored = false; const restore = () => { const sv = net.saved; if (restored || !net.back || !sv || !director.running) return; restored = true;
    if (sv.chonk > G.chonk) addChonk(sv.chonk - G.chonk); G.eaten = Math.max(G.eaten, sv.eaten || 0); G.swats = Math.max(G.swats, sv.swats || 0); G.wristDirty = true;
    words.show('WELCOME BACK!', player.head.clone().addScaledVector(player.fwd, 1.2), '#7cff6a', 0.14, 2); };
  setInterval(restore, 1500);
  // tap the room chip: who's in the room, and who each of them is playing as
  { const pop = document.createElement('div'); pop.id = 'roster-pop'; document.body.appendChild(pop);
    const st = document.createElement('style'); st.textContent = `#mp-chip { cursor: pointer; pointer-events: auto; } #mp-chip::after { content: ' ▾'; }
#roster-pop { display: none; position: fixed; z-index: 46; top: calc(max(10px, env(safe-area-inset-top)) + 34px); left: 50%; transform: translateX(-50%); width: min(300px, 86vw); background: rgba(12,16,52,0.96); border: 3px solid #ffd400; border-radius: 16px; padding: 10px; color: #fff; font: 700 13px Arial, sans-serif; }
#roster-pop.on { display: block; } #roster-pop h4 { margin: 0 0 6px; font: 900 14px "Arial Black", Arial; color: #ffd400; text-align: center; }
#roster-pop .p { display: flex; align-items: center; gap: 8px; padding: 5px 6px; border-radius: 10px; background: rgba(255,255,255,0.08); margin: 4px 0; }
#roster-pop img { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; border: 2px solid #ffd400; flex: none; } #roster-pop b { display: block; } #roster-pop small { color: #c9d3ff; }`; document.head.appendChild(st);
    const charName = (c) => (c === 'tommy' ? 'Tommy' : (SQUAD[c] && SQUAD[c].name) || 'Ronnie'), esc = (t) => String(t || '').replace(/</g, '&lt;');
    const row = (name, c, tags) => `<div class="p"><img src="./assets/portraits/${c || 'ronnie'}.webp" onerror="this.style.visibility='hidden'"><div><b>${esc(name)}${tags}</b><small>playing as ${esc(charName(c))}</small></div></div>`;
    const draw = () => { const orig = net.orig && net.orig !== net.id && net.players.get(net.orig);
      pop.innerHTML = `<h4>👥 ROOM ${esc(net.code)} · ${net.players.size + 1}/${net.max || 12}</h4>` + row(net.name || 'You', net.char, ' (you)' + (net.host ? ' · 👑 HOST' : '')) + [...net.players.values()].map(p => row(p.name || 'Player', p.char, p.host ? ' · 👑 HOST' : '')).join('')
        + (net.host && orig ? `<button id="give-host" style="margin-top:8px;width:100%;padding:10px;border:0;border-radius:12px;background:#ffd400;color:#111;font:900 13px 'Arial Black',Arial;cursor:pointer">👑 GIVE HOST BACK TO ${esc(orig.name || 'THEM').toUpperCase()}</button>` : '');
      const gb = pop.querySelector('#give-host'); if (gb) gb.onclick = (e) => { e.stopPropagation(); net.send({ t: 'giveHost', to: net.orig }); pop.classList.remove('on'); }; };
    $('mp-chip').addEventListener('click', (e) => { e.stopPropagation(); draw(); pop.classList.toggle('on'); });
    document.addEventListener('pointerdown', (e) => { if (pop.classList.contains('on') && !pop.contains(e.target) && e.target.id !== 'mp-chip') pop.classList.remove('on'); }, true); }
  net.on.setup = () => {};
  // everyone on the same version: whoever's behind updates (straight back into the same room)
  const vNum = (v) => String(v || '0').split('.').map(Number).reduce((a, n) => a * 1000 + (n || 0), 0);
  net.on.ver = (m) => { if (vNum(m.v) > vNum(window.GAME_BUILD) && !window.__updating) { window.__updating = true; showBanner('YOUR MATE HAS A NEWER VERSION', 'UPDATING...');
    setTimeout(() => { location.href = location.pathname + '?lobby=' + encodeURIComponent(net.code || '') + '&u=' + Date.now(); }, 1600); } };
  const sayVer = () => net.send({ t: 'ver', v: window.GAME_BUILD }); if (net.connected) sayVer(); const j0 = net.on.join; net.on.join = (m) => { j0 && j0(m); sayVer(); };
// ---------------- VOICE CHAT (multiplayer, off until you turn it on): the 🎙️ button under CHAT, who's talking down the
// left side and on their name tags; the squad go quiet while anyone's on it (voicechat.js)
const voice = new VoiceChat(net); window.__voice = voice;
{ const vOn = (m, p) => voice.onMsg(m, p); net.on.vc = vOn; net.on.rtc = vOn;
  const l0 = net.on.leave; net.on.leave = (m) => { l0 && l0(m); if (m && m.id != null) voice.left(m.id); };
  const j1 = net.on.join; net.on.join = (m) => { j1 && j1(m); if (voice.on && m && m.id != null) net.send({ t: 'vc', to: m.id, on: 1, m: voice.muted ? 1 : 0 }); };
  const st = document.createElement('style'); st.textContent = `
#vc-bar { position: fixed; top: calc(max(10px, env(safe-area-inset-top)) + 78px); right: max(10px, env(safe-area-inset-right)); z-index: 20; display: none; gap: 6px; }
body.flat.mpon #vc-bar { display: flex; } body:not(.mpon) #pause-voice { display: none; } body.gameover #vc-bar, body.gameover #vc-list { display: none !important; }
#vc-bar button { font: 900 12px Arial, sans-serif; padding: 8px 12px; border-radius: 12px; border: 2px solid transparent; background: rgba(0,0,0,0.6); color: #fff; cursor: pointer; }
#vc-bar #vc-btn.on { background: rgba(20,120,40,0.85); border-color: #39ff14; } #vc-bar #vc-btn.talk { box-shadow: 0 0 0 3px #39ff14, 0 0 14px #39ff14; }
#vc-bar #vc-mute { display: none; } #vc-bar.on #vc-mute { display: block; } #vc-bar #vc-mute.on { background: rgba(160,20,20,0.85); border-color: #ff3b3b; }
#vc-list { position: fixed; left: max(10px, env(safe-area-inset-left)); top: 42%; z-index: 19; display: none; flex-direction: column; gap: 5px; pointer-events: none; }
body.mpon #vc-list.any { display: flex; }
#vc-list div { display: flex; align-items: center; gap: 6px; font: 800 12px Arial, sans-serif; color: #fff; background: rgba(0,0,0,0.55); padding: 4px 9px 4px 4px; border-radius: 999px; border: 2px solid transparent; transition: border-color .12s, transform .12s, background .12s; }
#vc-list div img { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; background: #222; }
#vc-list div.talk { border-color: #39ff14; background: rgba(20,90,30,0.8); transform: scale(1.08); } #vc-list div.mute { opacity: 0.6; }
#vc-err { position: fixed; left: 50%; top: 30%; transform: translateX(-50%); z-index: 46; display: none; max-width: min(360px, 90vw); font: 800 14px Arial, sans-serif; color: #fff; background: rgba(120,20,20,0.95); padding: 12px 14px; border-radius: 14px; text-align: center; }`;
  document.head.appendChild(st);
  const bar = document.createElement('div'); bar.id = 'vc-bar'; bar.innerHTML = '<button id="vc-btn" type="button">🎙️ VOICE: OFF</button><button id="vc-mute" type="button" aria-label="Mute my microphone">🔇</button>'; document.body.appendChild(bar);
  const list = document.createElement('div'); list.id = 'vc-list'; document.body.appendChild(list);
  const err = document.createElement('div'); err.id = 'vc-err'; document.body.appendChild(err);
  const btn = bar.querySelector('#vc-btn'), mute = bar.querySelector('#vc-mute');
  const draw = () => { btn.classList.toggle('on', voice.on); bar.classList.toggle('on', voice.on); btn.textContent = voice.starting ? '🎙️ …' : voice.on ? '🎙️ VOICE: ON' : '🎙️ VOICE: OFF';
    mute.classList.toggle('on', voice.muted); mute.textContent = voice.muted ? '🔇 MUTED' : '🎤';
    const rows = []; if (voice.on) rows.push({ id: 'me', name: (net.name || 'You') + ' (you)', char: net.char, m: voice.muted });
    for (const [id, o] of voice.remoteOn) { const p = net.players.get(id); rows.push({ id, name: p ? p.name || 'Player' : 'Player', char: p && p.char, m: o.muted }); }
    list.innerHTML = rows.map(r => `<div data-v="${String(r.id).replace(/"/g, '')}" class="${r.m ? 'mute' : ''}"><img src="./assets/portraits/${r.char === 'ronnie' || !r.char ? 'ronnie' : r.char}.webp" alt="">${r.m ? '🔇 ' : '🎙️ '}<span></span></div>`).join('');
    [...list.children].forEach((d, i) => { d.querySelector('span').textContent = rows[i].name; d.querySelector('img').onerror = function () { this.style.visibility = 'hidden'; }; });
    list.classList.toggle('any', rows.length > 0);
    if (voice.err) { err.textContent = '🎙️ ' + voice.err; err.style.display = 'block'; clearTimeout(err._t); err._t = setTimeout(() => { err.style.display = 'none'; voice.err = ''; }, 4500); } };
  const pv = document.getElementById('pause-voice');
  if (pv) pv.addEventListener('click', () => btn.click());      // (the pause menu has it too: that's the way in from VR)
  voice.onChange = () => { draw(); if (pv) pv.textContent = voice.on ? (voice.muted ? '🎙️ VOICE CHAT: ON (MUTED)' : '🎙️ VOICE CHAT: ON · TAP TO LEAVE') : '🎙️ VOICE CHAT: OFF · TAP TO JOIN'; };
  voice.onChange();
  btn.addEventListener('click', async () => { if (voice.on) { voice.stop(); sfx('mic_off', null, 0.6); } else { draw(); if (await voice.start()) sfx('mic_on', null, 0.6); } draw(); });
  mute.addEventListener('click', () => { voice.setMuted(!voice.muted); });
  // who's talking: their tag glows, their row down the side lights up, your button glows when it's you
  voice.onLevels = (lv) => { for (const p of net.players.values()) if (p.avatar && p.avatar.setSpeaking) p.avatar.setSpeaking(lv.get(p.id) || 0);
    btn.classList.toggle('talk', (lv.get('me') || 0) > 0);
    for (const d of list.children) { const v = lv.get(d.dataset.v === 'me' ? 'me' : d.dataset.v) || 0; d.classList.toggle('talk', v > 0); } };
}
  // the host started a new game (changed the mode, or restarted): everyone starts it, back at the start of the map
  net.on.restart = (m) => { if (net.host || !m.mode) return; newGame(m.mode, 'NEW GAME'); };
  if (net.connected) chip();
}
// the shared game (food and people): see mpsync.js
const mp = new MPSync({ net, scene, room, physics, player, items, cast, director, words, fx: attackFx, G, tommy });
weather.attachNet(net);      // (in a room the host's weather and time are everyone's: weather.js)
// who's close enough to hear the squad talk (character.js only lets people chat near a player): you, and when you're
// running the game for a room, everyone in it too (their games show the lines you send them)
Character.hearers = () => { const a = [player.head]; if (net.connected && mp.host) for (const p of net.players.values()) if (p.avatar && !p.avatar.gone) a.push(p.avatar.pos); return a; };
director.startRemote = (id) => { if (!net.host && director.mode && (PAUSE_MODES[id] || id === 'imposter')) newGame(id, 'NEW GAME'); };
// power-ups turn up in the eating games (not Run the Pub, the Sweep or Imposter)
powerups = new PowerUps({ scene, room, items, player, sfx, words, net, mp, eatWhole: (it) => hooverEat(it),
  enabled: () => director.running && !G.over && !paused && !['runpub', 'sweep', 'imposter'].includes(director.mode) && roomNum('powerups') > 0 });
mp.selfBody = () => selfBody;      // (your emotes play on your own body too)
mp.onChat = (text, p) => { chatUI.add(p ? (p.name || 'PLAYER') : 'YOU', text); if (!p) voiceLine(net.char, text, player.head, { key: 'chat_me' }); };      // (you hear your own message in your character's voice too)
mp.voiceWarm = (text) => VOICED.has(net.char) ? warmLine(net.char, text) : null;      // (voices.js)
mp.onChatBlocked = (why) => words.show(why || 'NOT NOW', player.head.clone().addScaledVector(player.fwd, 0.8), '#ff5252', 0.07, 1.4);
// music from the speakers (the DJ booth, the hi-fi, the tannoy): only the host picks, everyone hears it
// (switched off for now, with the TVs: MEDIA_ON brings both back. The speakers and tellies stay as scenery.)
const music = new Music({ scene, room, net, player, words, hint: (t) => touch.hint(t), ui: {
  open() { window.__menuOpenAt = performance.now(); initAudio(); setPaused(true); pauseEl.classList.add('show-music'); setMuted(soundOff); music.render(); },
  say(t) { const m = document.getElementById('mus-msg'); if (m) { m.textContent = t; clearTimeout(m._t); m._t = setTimeout(() => { m.textContent = ''; }, 2600); } },
} });
document.getElementById('mus-close').addEventListener('click', () => { initAudio(); setPaused(false); });
// the tellies: tap / poke one to put a video on it (only the host chooses in multiplayer)
if (!MEDIA_ON && music.button) music.button.visible = false;
const tvs = new TVs({ scene, room, net, player, hint: (t) => touch.hint(t), ui: {
  open() { window.__menuOpenAt = performance.now(); initAudio(); setPaused(true); pauseEl.classList.add('show-tv'); setMuted(soundOff); tvs.render(); },
  say(t) { const m = document.getElementById('tv-msg'); if (m) { m.textContent = t; clearTimeout(m._t); m._t = setTimeout(() => { m.textContent = ''; }, 2800); } },
} });
document.getElementById('tv-close').addEventListener('click', () => { initAudio(); setPaused(false); });
mp.start();
if (window.ronnieMP && window.ronnieMP.role === 'join') director.remote = true;
// someone playing as a squad member: their own body, moved by where their head and hands are
net.makeAvatar = (p) => { if (!p.char || (p.char !== 'tommy' && !SQUAD_MP[p.char])) return null; return new SquadPuppet(p); };   // (Ronnie too: his full-body model)
// which way a pose faces (its yaw), and a phone player's hand as it sits relative to them: [right-ish, up, forward-ish]
const _Y = new THREE.Vector3(0, 1, 0);
function yawOfQ(q) { const f = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion(q[0], q[1], q[2], q[3])); return Math.atan2(f.x, f.z); }
function localHand(m) { const v = new THREE.Vector3(m.rh[0] - m.h[0], m.rh[1] - m.h[1], m.rh[2] - m.h[2]).applyAxisAngle(_Y, -yawOfQ(m.q)); return [v.x, v.y, v.z]; }
// the squad's faces for the name tags (loaded once each; every tag waiting on one is redrawn when it arrives)
const PORTRAITS = new Map();
function portrait(ch, onload) { if (!ch) return null; let e = PORTRAITS.get(ch);
  if (!e) { const img = new Image(); e = { img, wait: [] }; PORTRAITS.set(ch, e); img.onload = () => { const w = e.wait; e.wait = []; for (const f of w) try { f(); } catch (er) {} }; img.onerror = () => { e.wait = []; }; img.src = `./assets/portraits/${ch}.webp`; }
  if (!e.img.complete && onload && e.wait.length < 30) e.wait.push(onload); return e.img; }
class SquadPuppet {
  constructor(p) { this.c = p.char === 'tommy' ? (() => { const t = new Tommy(scene, room, physics); t.load(); return t; })() : new SquadMemberMP(scene, room, physics, p.char, [0, 0, 0], director); this.c.attacks = false; this.c.mpPuppet = true; this.c.active = false; this.pos = new THREE.Vector3(); this.yaw = 0; this.rh = new THREE.Vector3(); this.lh = new THREE.Vector3(); this.first = true; this.c.name = p.name || this.c.name;
    // a name tag over their head (so you can tell a real player from the squad): their name, and who they're playing as
    this.p = p; this.tagC = document.createElement('canvas'); this.tagC.width = 400; this.tagC.height = 120; this.tagTex = new THREE.CanvasTexture(this.tagC); this.tagTex.colorSpace = THREE.SRGBColorSpace;
    this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tagTex, depthTest: false, transparent: true })); this.tag.scale.set(0.56, 0.168, 1); this.tag.renderOrder = 12; this.tag.userData.remoteRonnie = !p.self; scene.add(this.tag); this.drawTag();
    this.down = 0; this.hT = {}; this.armW = { R: 0, L: 0 }; this.armT = { R: 0, L: 0 }; this.prevH = { R: new THREE.Vector3(), L: new THREE.Vector3() }; this.swingT = 0;
    this.c.rag.constrain = null;      // (a real player: where they are is where they are. Pushing them out of the tables made them jump about as they walked past)
    if (p.self) {               // your own body (seen from inside it): no head in the way, no name tag, no bumping into it
      this.tag.visible = false; this.c.rag.hideHead = true; for (const pt of this.c.rag.list) { pt.body.collisionResponse = false; } }
    this.emote = new EmotePlayer(this.c, scene, (txt, at, snd) => { if (snd) sfx(snd, this.c.headPos(new THREE.Vector3()), 0.8); if (txt && at) words.show(txt, at.clone().add({ x: 0, y: this.p.self ? 0.15 : 0.38, z: 0 }), '#ffd400', 0.22, 0.8); }); }      // (above the name tag, never on it)
  // where they were a moment ago, played back smoothly. Every pose says when it was SENT (their clock), so it's played
  // back with the timing it was made with, not the uneven timing it arrived with (the network bunches them up and
  // spreads them out: following arrival times made hands and heads speed up and stall). How far behind to play grows
  // on a jittery connection and shrinks on a steady one. Between poses it follows a smooth curve (not straight lines
  // with a corner at every update), and if the next pose is late it carries on the way it was going for a moment.
  smoothPose(pose) {
    const buf = this.p.buf; if (!buf || buf.length < 2) return pose;
    const J = this.jit || (this.jit = { off: null, dev: 25, gap: 67, D: 110, seen: null, at: 0 }), now = performance.now(), last = buf[buf.length - 1];
    const T = (e) => e.ts != null && J.off != null ? e.ts + J.off : e.t;          // a pose's time on our clock
    if (last !== J.seen) {
      if (last.ts != null) { const o = last.t - last.ts;          // (their clock -> ours: the quickest trip seen, creeping up slowly so a drifting clock can't strand it)
        J.off = J.off == null ? o : Math.min(o, J.off + (now - (J.at || now)) * 0.002);
        const late = o - J.off, L = J.lt || (J.lt = []); L.push(late); if (L.length > 60) L.shift();
        // (how late a pose usually is: most of the last 3 seconds' worth, not the worst. A phone network's odd hiccup (a 4G
        // handover) is ridden out by the catching up below, not by drawing everyone a third of a second behind from then on)
        if (L.length >= 8) { const so = L.slice().sort((x, y) => x - y); J.dev = so[Math.floor(so.length * 0.85)]; }
        const prev = J.seen; if (prev && prev.ts != null && last.ts > prev.ts) J.gap += (Math.min(120, last.ts - prev.ts) - J.gap) * 0.1; }
      J.seen = last; J.at = now; }
    J.D += (Math.min(300, Math.max(55, J.gap * 1.05 + J.dev + 10)) - J.D) * 0.02;      // (eased, so the playback never jumps)
    // the playback clock: normally just "now, a moment ago". If the poses stop coming (a stall: a lost packet holds up
    // everything behind it), it slows down smoothly as it runs out instead of freezing, then catches up a little faster
    // than real time when they arrive, instead of jumping
    const want = now - J.D, Tl = T(last);
    if (J.pt == null || Math.abs(want - J.pt) > 3000) J.pt = want;
    // (behind after a hiccup: catches up faster the further behind it is, a quick glide rather than a long drag or a jump)
    else { let rate = 1 + Math.max(-0.5, Math.min(0.6, (want - J.pt) / 300)); const ahead = Tl - J.pt; if (ahead < -40) rate = Math.min(rate, Math.max(0, 1 + (ahead + 40) / 80));      // (out of poses: carries on the way they were going for a moment, then eases to a stop. It used to start slowing 50ms before running out, every time a pose was a little late: a stutter)
      J.pt += Math.max(0, now - (J.pn || now)) * rate; }
    J.pn = now;
    // a long gap between two of their poses: nothing changed (a game only sends what's changed: they stood still), or their
    // game froze for a moment. Nothing happened in it, so they're held where they were until just before the next pose
    // and the clock skips across it. (Played out as time, someone who stood still a second and set off was drawn a second
    // late, then sped up to catch up)
    const IDLE = 250, n = buf.length;
    for (let j = n - 1; j > 0; j--) { const tA = T(buf[j - 1]), tB = T(buf[j]); if (tB <= J.pt) break;
      if (tB - tA > IDLE && J.pt > tA && J.pt < tB - J.gap) { J.pt = Math.max(J.pt, Math.min(want, tB - J.gap)); break; } }
    const rt = J.pt;
    let i = n - 2; while (i > 0 && T(buf[i]) > rt) i--;
    this.p.keepFrom = (buf[Math.max(0, i - 1)] || {}).ts;      // (the buffer keeps these: net.js pushPose)
    const a = buf[i], b = buf[i + 1], tb = T(b), held = tb - T(a) > IDLE, ta = held ? tb - J.gap : T(a), span = Math.max(1, tb - ta);
    let k = (rt - ta) / span;
    if (k < 0) return a.m;
    const A = a.m, B = b.m, e0 = buf[i - 1] || a, e3 = buf[i + 2] || b, P0 = e0.m, P3 = e3.m;
    // late (past the newest pose): carry on the way it was going for a moment (at most 120ms: the playback clock eases to a
    // stop just there too, so when poses come again they carry on from where this left them, no jump). Which way and how
    // fast is taken over at least 40ms of poses, and never faster than a person moves: from just the last two, sent a
    // few milliseconds apart after a hitch, a millimetre of wobble came out as metres a second and threw them across the room
    if (k > 1) { const ex = Math.min(rt - tb, 120); let j = i; while (j > 0 && tb - T(buf[j]) < 40) j--;
      const o = buf[j], to = T(o), dtv = Math.max(40, tb - to);
      const on = (key, vmax) => B[key].map((v, n) => { const vel = Math.max(-vmax, Math.min(vmax, (v - o.m[key][n]) / dtv)); return v + vel * ex; });
      const q2 = new THREE.Quaternion(...B.q);
      return { ...B, h: on('h', 0.006), rh: on('rh', 0.004), l: on('l', 0.004), q: [q2.x, q2.y, q2.z, q2.w], fcv: null, rl: B.flat ? localHand(B) : null }; }
    // between two poses: a smooth curve through them, its slopes scaled by the real time between each pair (they don't
    // arrive evenly: assuming they did bent the curve out past the poses when one gap was short and the next long)
    const s0 = Math.max(1, tb - T(e0)), s3 = Math.max(1, T(e3) - ta), f1 = held ? 0 : e0 === a ? 1 : span / s0, f2 = e3 === b ? 1 : span / s3;      // (held still: it sets off from a standstill)
    const cr = (p0, p1, p2, p3) => p1.map((v, j) => { const m1 = (p2[j] - p0[j]) * f1, m2 = (p3[j] - v) * f2, k2 = k * k, k3 = k2 * k;
        return (2 * k3 - 3 * k2 + 1) * v + (k3 - 2 * k2 + k) * m1 + (-2 * k3 + 3 * k2) * p2[j] + (k3 - k2) * m2; });
    const q = new THREE.Quaternion(...A.q).slerp(new THREE.Quaternion(...B.q), Math.min(1, k));
    // (hand tracking's finger curls too: blended between the two poses, not stepping from one to the next 20 times a second)
    let fcv = null; if (typeof B.fc === 'string' && typeof A.fc === 'string' && A.fc.length === B.fc.length) { const kk = Math.min(1, k); fcv = [];
      for (let j = 0; j < B.fc.length; j++) { const x = B.fc.charCodeAt(j) - 48, y = A.fc.charCodeAt(j) - 48; fcv.push(x < 0 || x > 9 ? null : y < 0 || y > 9 ? x / 9 : (y + (x - y) * kk) / 9); } }
    // (a phone player's hand, in front of them: blended where it is to them (in front, to the right), not where it is in the
    // room. In the room, turning round took it straight across, through their head, and up came the arm to eat)
    let rl = null; if (B.flat && A.flat) { const la = localHand(A), lb = localHand(B), kk = Math.min(1, k); rl = la.map((v, j) => v + (lb[j] - v) * kk); }
    return { ...B, h: cr(P0.h, A.h, B.h, P3.h), rh: cr(P0.rh, A.rh, B.rh, P3.rh), l: cr(P0.l, A.l, B.l, P3.l), q: [q.x, q.y, q.z, q.w], fcv, rl };
  }
  // Imposter: a body (flat out where they were killed), hidden (a ghost, or down a trapdoor), or an imposter's mate (red tag)
  impVis(v) { const r = this.c.rag; if (r.group) r.group.visible = v; if (this.c.fx) this.c.fx.visible = v; if (this.c.prop) this.c.prop.visible = v && !this.emote.active; this.tag.visible = v && !this.p.self; if (!v) { if (this.chatS) this.chatS.visible = false; this.emote.active && this.emote.stop && this.emote.stop(); } }
  // Imposter: a body, laid out on its back like the chalk outline at a crime scene: one arm up by the head, the other
  // down by the side, the legs apart, the head lolled to one side. It drops into it (no flailing ragdoll)
  layOut(dt) {
    const r = this.c.rag; if (this.emote.active) this.emote.stop(); if (r.mode !== 'anim') r.setMode('anim');
    this.layK = Math.min(1, (this.layK || 0) + dt * 2.2); const k = this.layK * this.layK * (3 - 2 * this.layK), kH = r.height / 1.68;
    for (const n in r.pose) r.pose[n].identity();
    r.aim('uArmL', 0.75, 0.66, 0.05); r.aim('lArmL', 0.55, 0.83, 0.05);       // (his left arm flung up by his head)
    r.aim('uArmR', -0.82, -0.57, 0.05); r.aim('lArmR', -0.62, -0.78, 0.05);   // (the right one down and out)
    r.aim('uLegL', 0.36, -0.93, 0.02); r.aim('lLegL', 0.42, -0.9, 0.02); r.aim('uLegR', -0.22, -0.97, 0.02); r.aim('lLegR', -0.36, -0.93, 0.05);
    r.pose.head.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.6);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2 * k);
    for (const n in r.pose) r.pose[n].premultiply(q);
    r.bob = -0.8 * kH * k; r.animate(dt); r.sync();
  }
  update(dt, pose) {
    if (!this.impBody) this.layK = 0;
    if (this.impRed !== this.tagRed) { this.tagRed = this.impRed; this.drawTag(); }
    if (this.impHidden) { if (!this.impOff) { this.impOff = true; this.impVis(false); } return; }
    if (this.impOff) { this.impOff = false; this.impVis(true); }
    if (this.impBody) { this.layOut(dt); this.tag.visible = false; return; }
    pose = this.smoothPose(pose);
    // fatter every stage they go up (seen by everyone)
    { const want = Math.min(1, (pose.st || 0) / (STAGES.length - 1)); this.fatNow = (this.fatNow || 0) + (want - (this.fatNow || 0)) * Math.min(1, dt * 3); this.c.rag.fat = Math.min(1, this.fatNow * 1.3);
      // ...and drawn bigger: as tall as they've grown (their head is up there) and wider still, up to nearly twice as wide
      const sNow = this.sNow = (this.sNow || 1) + ((pose.s || 1) - (this.sNow || 1)) * Math.min(1, dt * 3), f = this.fatNow;
      this.c.rag.bulk = (sNow > 1.001 || f > 0.001) ? { h: sNow, w: sNow * (1 + 0.55 * f) } : null; }
    // (a last touch of smoothing on the body: light on a steady connection (it's all lag there), more on a jittery one)
    const J0 = this.jit, kr = J0 ? 25 + 35 * THREE.MathUtils.clamp(1 - (J0.dev - 30) / 60, 0, 1) : 25;
    const c = this.c, r = c.rag, k = this.first ? 1 : Math.min(1, dt * kr);
    // (no body moves faster than a person can: where the playback's own target jumps (its guess corrected as a late pose
    // comes in after a hiccup), the jump is taken up and let out over a moment, the whole body and its hands together.
    // A real jump (a respawn: 2m or more) still snaps straight there)
    const tH = _a.set(...pose.h), off = this.hOff || (this.hOff = new THREE.Vector3());
    if (this.lastH && !this.first) { const d = _c.copy(tH).sub(this.lastH), L = d.length(), lim = 4 * Math.max(dt, 1 / 120) + 0.005; if (L >= 2) off.set(0, 0, 0); else if (L > lim) off.addScaledVector(d, -(1 - lim / L)); }
    (this.lastH || (this.lastH = new THREE.Vector3())).copy(tH); off.multiplyScalar(Math.exp(-dt / 0.15)); tH.add(off);
    const prev = this.pos.clone(); this.pos.lerp(tH, k); if (pose.flat) { this.rh.lerp(_b.set(...pose.rh).add(off), k); this.lh.lerp(_b.set(...pose.l).add(off), k); } else { this.rh.set(...pose.rh).add(off); this.lh.set(...pose.l).add(off); }
    // knocked flat: a limp ragdoll (like the NPCs), then up again where they landed
    if (this.down > 0) { this.down -= dt; r.sync(); const pl = r.parts.pelvis.body.position; c.fx.position.set(pl.x, 0, pl.z);
      if (this.down <= 0) { c.state = 'idle'; c.setIdlePose(c.t); r.pose.head.identity(); r.getUp(0.9); }
      this.placeTag(); return; }
    const q = new THREE.Quaternion(...pose.q), f = new THREE.Vector3(0, 0, -1).applyQuaternion(q); const yaw = Math.atan2(f.x, f.z);
    let dy = yaw - this.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    // (turning on a spring: speeds up and slows down smoothly. Eased straight in, a quick about-turn was fastest in its very
    // first frame, the hands swinging round at 8 m/s)
    if (this.first) { this.yaw = yaw; this.yawV = 0; } else { const K = 110, st = Math.min(dt, 0.05); this.yawV = (this.yawV || 0) + (K * dy - 2 * Math.sqrt(K) * (this.yawV || 0)) * st; this.yaw += this.yawV * st; }
    const speed = Math.hypot(this.pos.x - prev.x, this.pos.z - prev.z) / Math.max(dt, 1e-3);
    if (this.first) { r.placeAt(this.pos.x, this.pos.z, this.yaw); this.first = false; this.prevH.R.copy(this.rh); this.prevH.L.copy(this.lh); }
    if (pose.flat && pose.rl) this.rh.copy(this.pos).add(_b.set(pose.rl[0], pose.rl[1], pose.rl[2]).applyAxisAngle(_Y, this.yaw));      // (their hand, turned with their body as it's drawn)
    r.root.x = this.pos.x; r.root.z = this.pos.z; r.yaw = this.yaw;
    if (this.p.self) { r.root.x -= Math.sin(this.yaw) * 0.2; r.root.z -= Math.cos(this.yaw) * 0.2; }      // (just behind your eyes, so looking down you see your chest, belly and legs)
    // walking or standing: from a smoothed speed (a network update arriving a little early or late made it flicker
    // across the line every frame), with a gap between "starts walking" and "stops", and the two poses blended over a
    // moment, not swapped: the arms and legs snapped from one pose to the other, the arms most of all
    { const sp = this.spd = this.spd == null ? speed : this.spd + (speed - this.spd) * (1 - Math.exp(-dt * 6));
      if (this.walking ? sp < 0.15 : sp > 0.3) this.walking = !this.walking;
      const ww = this.walkW = (this.walkW || 0) + ((this.walking ? 1 : 0) - (this.walkW || 0)) * (1 - Math.exp(-dt * 7));
      c.setIdlePose(c.t += dt);
      if (ww > 0.005) { const idle = {}; for (const n in r.pose) idle[n] = r.pose[n].clone(); const bob0 = r.bob || 0, he0 = c.headExtra;
        c.walkPose(dt, THREE.MathUtils.clamp(sp, 0.35, 3));
        if (ww < 0.995) { for (const n in r.pose) r.pose[n].copy(idle[n].slerp(r.pose[n], ww)); r.bob = bob0 + ((r.bob || 0) - bob0) * ww; if (he0 && c.headExtra) c.headExtra = { yaw: he0.yaw + (c.headExtra.yaw - he0.yaw) * ww, pitch: he0.pitch + (c.headExtra.pitch - he0.pitch) * ww }; } } }
    // an emote off the wheel: the whole body does it (a VR player's arms stay their own real arms)
    // (a VR player's emote is the whole body too: their real arms would only fight it and flail about)
    const em = this.emote.active ? this.emote.update(dt, false) : 0;
    if (em > 0) { r.animate(dt); r.sync(); this.emote.place(); c.fx.position.set(this.pos.x, 0, this.pos.z); this.placeTag(); return; }
    // a VR player's arms are their real arms: shoulder to elbow to hand, wherever they hold them.
    // A phone player's arm hangs naturally and only comes up to hit something (a swing or punch we were told
    // about) or to eat (hand up at the mouth), then drops back down
    const head = this.pos, chest = r.pos('chest', new THREE.Vector3());
    if (this.swingT > 0) this.swingT -= dt;
    for (const [side, h] of [['R', this.rh], ['L', this.lh]]) {
      if (pose.flat && side === 'L') continue;                 // (phone players only have the one hand)
      // a VR hand: smoothed, with a little dead zone (a still hand is a still arm: tracking jitter and the uneven updates
      // made the arms flap about), and nothing taken from a hand that isn't really there (an untracked controller sends
      // wherever it last was, or nowhere: the arm went flying after it)
      if (!pose.flat) { const ok = h.distanceTo(head) < 1.15 * (pose.s || 1) && h.y > 0.15; const ft = this.hT[side] || (this.hT[side] = h.clone());
        if (!ok) { this.armT[side] = Math.min(this.armT[side], 0); this.armW[side] += (0 - this.armW[side]) * Math.min(1, dt * 5); continue; }
        // (a "one euro" filter: held still, it's heavily smoothed so tracking wobble never shows; moving, the smoothing
        // drops away with speed so a wave or a punch comes through at full size, straight away)
        const F = this.hF || (this.hF = {}), f = F[side] || (F[side] = { v: 0 });
        if (h.distanceTo(ft) > 0.6) { ft.copy(h); f.v = 0; }
        else { const sp = h.distanceTo(ft) / Math.max(dt, 1e-3); f.v += (sp - f.v) * (1 - Math.exp(-dt * 2 * Math.PI * 1.0));
          const fc = 1.6 + 6 * f.v, a = 1 - Math.exp(-dt * 2 * Math.PI * fc); ft.lerp(h, a); } }
      const hv = h.distanceTo(this.prevH[side]) / Math.max(dt, 1e-3); this.prevH[side].copy(h);
      const atMouth = h.distanceTo(head) < 0.28, swinging = !pose.flat && hv > 2.2;
      const punching = this.swingT > 0 && (side === (this.swingSide || 'R') || !pose.flat);
      if (!pose.flat || atMouth || swinging || punching) this.armT[side] = 0.45;
      else this.armT[side] -= dt;
      let want = this.armT[side] > 0 ? 1 : 0;
      if (!pose.flat) this.armW[side] += (want - this.armW[side]) * Math.min(1, dt * (want ? 14 : 5));
      else { // (a phone player's arm: on a spring, and already starting up as the hand nears the mouth, so it rises and
        // drops smoothly: switched on all at once the whole arm swung up in a frame or two, a big jerk on everyone else's screen)
        const md = h.distanceTo(head); want = Math.max(want, THREE.MathUtils.smoothstep(0.47 - md, 0, 0.17));      // (their hand rests 0.49m from their head: the arm stays down until it's on its way up)
        const sv = this.armV || (this.armV = { R: 0, L: 0 }), K = 90, st = Math.min(dt, 0.05);
        sv[side] += (K * (want - this.armW[side]) - 2 * Math.sqrt(K) * sv[side]) * st; this.armW[side] = THREE.MathUtils.clamp(this.armW[side] + sv[side] * st, 0, 1); }
      const w = this.armW[side]; if (w < 0.01) continue;
      if (!pose.flat) { this.ikDt = dt; this.reachArm(side, this.hT[side], w); continue; }
      // (eating: the hand goes to their mouth with the elbow bent, like a real arm, not the whole arm swung straight up)
      if (!punching) { if (h.distanceTo(chest) > 1.2) continue; this.ikDt = dt; this.reachArm(side, h, w); continue; }
      let d;
      if (pose.flat && punching && !atMouth) { const k = 1 - this.swingT / 0.38; d = new THREE.Vector3(side === 'R' ? 0.1 : -0.1, 0.2 + 0.25 * (1 - k), 0.6 + k); }   // a phone player's jab: cocked, then straight out in front
      else { d = h.clone().sub(chest).applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.yaw); if (d.length() > 1.2 || d.lengthSq() < 1e-6) continue; }
      d.normalize();
      for (const n of ['uArm' + side, 'lArm' + side]) { const rest = r.pose[n].clone(); r.aim(n, d.x, d.y, d.z); r.pose[n].copy(rest.slerp(r.pose[n], w)); }
    }
    if (!em) r.pose.head.setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.clamp(-Math.asin(f.y), -0.6, 0.6));
    // hand tracking: their real fingers (sent only by players using it): how bent the fingers are, and the middle one
    if (!em && pose.fc && r.handPose) for (const [side, o] of [['R', 0], ['L', 5]]) { const hp = r.handPose['lArm' + side], s5 = pose.fc.slice(o, o + 5); if (!hp || s5[1] === '-') continue;
      const d = (i) => pose.fcv && pose.fcv[o + i] != null ? pose.fcv[o + i] : (s5.charCodeAt(i) - 48) / 9, curl = (d(1) + d(3) + d(4)) / 3, mid = d(2); hp.curl += (curl - hp.curl) * Math.min(1, dt * 15); hp.mid += (mid - hp.mid) * Math.min(1, dt * 15); }
    r.animate(dt); r.sync(); if (em) this.emote.place(); c.fx.position.set(this.pos.x, 0, this.pos.z); this.placeTag();
  }
  headPos() { return this.c.headPos(new THREE.Vector3()); }
  fwd() { return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  handPos() { return this.rh.clone(); }
  // two-bone reach: put the palm on the target, with the elbow bending down and out like a real arm
  reachArm(side, target, w) {
    const r = this.c.rag, U = r.parts['uArm' + side], L = r.parts['lArm' + side], kH = r.height / 1.68, Yax = new THREE.Vector3(0, 1, 0);
    // the shoulder: where the animation last put the upper arm (not where the physics has carried it on to since)
    const q = r.animQuat('uArm' + side, new THREE.Quaternion());
    const S = U.def.a.clone().sub(U.def.center).applyQuaternion(q).add(r.animPos('uArm' + side, new THREE.Vector3()));
    const L1 = U.def.a.distanceTo(U.def.b), L2 = Math.max(0.12, L.def.a.distanceTo(L.def.b) - 0.085 * kH);     // upper arm; forearm to the palm
    const toT = target.clone().sub(S), D = THREE.MathUtils.clamp(toT.length(), Math.abs(L1 - L2) + 0.02, L1 + L2 - 0.005), dir = toT.normalize();
    const a = (L1 * L1 - L2 * L2 + D * D) / (2 * D), hh = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const fwd = this.fwd(), outw = new THREE.Vector3(side === 'L' ? 1 : -1, 0, 0).applyAxisAngle(Yax, this.yaw);
    const hint = new THREE.Vector3(0, -1, 0).addScaledVector(outw, 0.6).addScaledVector(fwd, -0.35);         // elbows go down, out and back
    const perp = hint.addScaledVector(dir, -hint.dot(dir)); if (perp.lengthSq() < 1e-6) perp.copy(outw); perp.normalize();
    const E = S.clone().addScaledVector(dir, a).addScaledVector(perp, hh), T = S.clone().addScaledVector(dir, D);
    let du = E.clone().sub(S).applyAxisAngle(Yax, -this.yaw).normalize(), dl = T.clone().sub(E).applyAxisAngle(Yax, -this.yaw).normalize();
    // (eased from last frame, so the elbow never flicks from one side to the other)
    const ik = this.ik || (this.ik = {}), prev = ik[side];
    if (prev) { const ke = 1 - Math.exp(-(this.ikDt || 1 / 72) * 30); du = prev.u.lerp(du, ke).normalize(); dl = prev.l.lerp(dl, ke).normalize(); }
    ik[side] = { u: du.clone(), l: dl.clone() };
    for (const [n, d] of [['uArm' + side, du], ['lArm' + side, dl]]) { const rest = r.pose[n].clone(); r.aim(n, d.x, d.y, d.z); r.pose[n].copy(rest.slerp(r.pose[n], w)); }
  }
  swing(side = 'R') { this.swingT = 0.38; this.swingSide = side; }
  // NAME TAG: their character's face, their name, who they're playing as (and 👑 if they're the host), how big they've
  // got (the pips along the bottom), how good their connection is (the bars), and a green glow while they're talking
  drawTag() { const x = this.tagC.getContext('2d'), p = this.p, nm = (p.name || 'PLAYER').toUpperCase(), W = 400, H = 120; this.tagName = p.name; this.tagKey = this.tagState(); x.clearRect(0, 0, W, H);
    const talk = this.speaking > 0.05, edge = this.tagRed ? '#ff3b3b' : talk ? '#39ff14' : p.host ? '#ffd400' : '#5b7cff';
    x.fillStyle = 'rgba(10,14,30,0.86)'; x.beginPath(); x.roundRect(5, 5, W - 10, H - 10, 26); x.fill(); x.lineWidth = talk ? 9 : 6; x.strokeStyle = edge; x.stroke();
    // their face
    const img = portrait(p.char, () => this.drawTag()), cx = 62, cy = H / 2, r = 42;
    x.save(); x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = '#1e2a5a'; x.fill(); x.clip(); if (img && img.complete && img.naturalWidth) x.drawImage(img, cx - r, cy - r, r * 2, r * 2); x.restore();
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.lineWidth = 4; x.strokeStyle = edge; x.stroke();
    if (p.host) { x.font = '30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('👑', cx + 30, cy - 34); }
    if (talk) { x.font = '28px sans-serif'; x.textAlign = 'center'; x.fillText('🎙️', cx - 32, cy + 32); }
    // the name and who they are
    const tx = 118, tw = W - tx - 62; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = '#ffd400'; let f = 40; do { x.font = `900 ${f}px Arial`; f -= 2; } while (x.measureText(nm).width > tw && f > 16); x.fillText(nm, tx, 38, tw);      // (a very long name squeezes in rather than run into the bars)
    const who = p.char === 'tommy' ? 'Tommy' : SQUAD_MP[p.char]?.name || this.c.name;
    x.fillStyle = this.tagRed ? '#ff6b6b' : '#c9d3ff'; f = 21; const sub = (this.tagRed ? '🔪 IMPOSTER · ' : p.host ? 'HOST · ' : '') + 'as ' + who; do { x.font = `700 ${f}px Arial`; f--; } while (x.measureText(sub).width > tw + 50 && f > 12); x.fillText(sub, tx, 70, tw + 50);
    // how big they've got: ten pips
    const st = Math.max(0, Math.min(10, (p.pose && p.pose.st || 0) + 1));
    for (let i = 0; i < 10; i++) { x.fillStyle = i < st ? (i >= 7 ? '#ff5a36' : i >= 4 ? '#ffb020' : '#39ff14') : 'rgba(255,255,255,0.18)'; x.beginPath(); x.roundRect(tx + i * 22, 90, 18, 12, 4); x.fill(); }
    // their connection: three bars (green: fine; yellow: a bit behind; red: struggling)
    const q = this.tagNet || 3, col = q >= 3 ? '#39ff14' : q === 2 ? '#ffd400' : '#ff3b3b';
    for (let i = 0; i < 3; i++) { x.fillStyle = i < q ? col : 'rgba(255,255,255,0.2)'; const bh = 10 + i * 9; x.fillRect(W - 52 + i * 12, 44 - bh / 2 + 6, 8, bh); }
    this.tagTex.needsUpdate = true; }
  // what the tag shows (redrawn only when this changes)
  tagState() { const p = this.p; return [p.name, p.char, p.host ? 1 : 0, this.tagRed ? 1 : 0, this.speaking > 0.05 ? 1 : 0, p.pose && p.pose.st || 0, this.tagNet || 3].join('|'); }
  // a chat message: a black speech bubble over their head (black, so you can tell it from the squad's white ones)
  chat(text) {      // (a real voice: the bubble comes up as their voice starts; voices.js)
    if (this.p.self || !voiceLine(this.p.char, text, this.c.headPos(new THREE.Vector3()), { key: 'chat_' + (this.p.id || this.p.name), onStart: (dur) => this.drawChat(text, dur) })) this.drawChat(text, 0);
  }
  drawChat(text, dur = 0) {
    if (!this.chatS) { const c = document.createElement('canvas'); c.width = 512; c.height = 200; this.chatC = c; this.chatT = new THREE.CanvasTexture(c); this.chatT.colorSpace = THREE.SRGBColorSpace;
      this.chatS = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.chatT, depthTest: false, transparent: true })); this.chatS.renderOrder = 13; scene.add(this.chatS); }
    const g = this.chatC.getContext('2d'); g.clearRect(0, 0, 512, 200);
    let f = 34, lines; do { g.font = `700 ${f}px Arial`; lines = wrapText(g, text, 460); f -= 2; } while (lines.length > 3 && f > 18);
    const lh = f + 8, h = lines.length * lh + 30;
    g.fillStyle = 'rgba(12,12,16,0.94)'; g.beginPath(); g.roundRect(6, 6, 500, h, 26); g.fill(); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke();
    g.beginPath(); g.moveTo(230, h + 4); g.lineTo(256, h + 34); g.lineTo(282, h + 4); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((l, i) => g.fillText(l, 256, 6 + 15 + lh / 2 + i * lh));
    this.chatT.needsUpdate = true; this.chatS.scale.set(0.9, 0.9 * 200 / 512, 1); this.chatS.visible = true; this.chatUntil = performance.now() + Math.max(2500 + text.length * 70, dur * 1000 + 600);
  }
  placeTag() { if (this.chatS) { const on = performance.now() < this.chatUntil; this.chatS.visible = on; if (on) { const h = this.c.rag.drawn(this.c.headPos(new THREE.Vector3())); this.chatS.position.set(h.x, h.y + (this.p.self ? 0.4 : 0.6), h.z); } }
    if (this.p.self) return; if (this.p.name !== this.tagName) this.c.name = this.p.name || this.c.name;
    const now = performance.now(); if (!(now < this.tagCheck)) { this.tagCheck = now + 400; const age = now - (this.p.at || now); this.tagNet = age < 600 ? 3 : age < 1600 ? 2 : 1; if (this.tagState() !== this.tagKey) this.drawTag(); }
    const h = this.c.rag.drawn(this.c.headPos(new THREE.Vector3())), d = h.distanceTo(player.head), k = THREE.MathUtils.clamp(d / 5, 1, 2.4);      // (further away, a bit bigger, so you can still read it)
    this.tag.scale.set(0.56 * k, 0.168 * k, 1); this.tag.position.set(h.x, h.y + 0.34 + 0.084 * k, h.z); this.tag.material.opacity = d > 30 ? Math.max(0, 1 - (d - 30) / 10) : 1; }
  // voice chat: how loud they are right now (0..1). The tag glows green, a mic shows, and their name pulses a little
  setSpeaking(v) { const was = this.speaking > 0.05; this.speaking = v; if ((v > 0.05) !== was && !this.p.self) this.drawTag(); }
  flinch(v) { this.c.flinch(v.clone ? v.clone() : new THREE.Vector3(v.x, 0, v.z), 1); }
  // a proper hit: go limp and fly, same as the NPCs (a light one is just a flinch)
  knock(v, s, at) {
    if (this.down > 0) { const b = this.c.rag.parts.chest; this.c.rag.hit(b, b.body.position, new THREE.Vector3(v.x, 0, v.z).normalize().multiplyScalar(s * 2.2)); return; }
    if (s <= 3.2) { this.flinch(v); return; }
    const c = this.c, r = c.rag; this.emote.stop(); c.knockOut('hit'); this.down = 2.4;
    const dir = new THREE.Vector3(v.x, 0, v.z); if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1); dir.normalize();
    const imp = dir.multiplyScalar(s * 2.2); imp.y = s * 0.9;
    const part = r.parts.head, p = at || part.body.position; r.hit(part, new THREE.Vector3(p.x, p.y, p.z), imp);
  }
  doEmote(id) { if (this.down > 0) return; this.emote.start(id); }
  dispose() { if (this.chatS) scene.remove(this.chatS); scene.remove(this.tag); this.tagTex.dispose(); this.emote.dispose(); this.c.dispose(); }
}
window.RS = { onFrame: [], vrPanels: () => ({ pause: vrPause.panel, dev: vrDev.menu.panel }), resetSelfBody: () => { if (selfBody) { selfBody.dispose(); selfBody = null; } }, emoteCamSpot, newGame: (m) => newGame(m), time: () => time, room, roomSpawns: () => room.spawns, floorAt: room.floorAt, powerups, net, mp, music, tvs, THREE, G, player, items, tommy, cast, director, addChonk, scene, renderer, physics, startFlat, shot: () => { renderer.render(scene, emoteCam() || camera); return renderer.domElement.toDataURL('image/jpeg', 0.8); }, sim: (secs, step = 1 / 30) => { for (let t = 0; t < secs; t += step) frame(step); } };   // (sim: run the game without drawing, for tests)
// developer mode (Settings cog -> DEVELOPER MODE): the test bench comes up once you press PLAY. (Only for this visit:
// starting the page again goes back to normal)
{ let dev = false; try { dev = sessionStorage.getItem('rs_dev') === '1' && localStorage.getItem('rs_dev_locked') !== '1'; sessionStorage.removeItem('rs_dev'); } catch (e) {} window.__devPending = dev;
  if (dev) { let on = false; const go = () => { if (on) return; on = true; import('./devmode.js').then(m => m.startDev(window.RS)).catch(e => console.warn('dev', e)); };
    for (const id of ['play-flat', 'enter-vr']) { const b = document.getElementById(id); if (b) b.addEventListener('click', () => setTimeout(go, 400)); } } }
