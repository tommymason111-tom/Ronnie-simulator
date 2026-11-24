// BOSS FIGHT: a giant version of one of the lads (or Tommy) turns up and everyone (on your own, or the whole room
// together) fights them off by eating to power up and throwing food at them.
//   - Bosses take turns (NOAH, LEWIS, CHLOE, TOMMY: a different one each fight), each with their own moves and lines.
//   - An entrance: they drop out of the sky, the ground shakes, their name comes up (a film on a phone or a computer,
//     a card in the headset).
//   - A big health bar with their name at the top of the screen (over their head in the headset).
//   - Three phases, each harder: telegraphed moves you can see coming on the floor
//       SLAM    a red circle round them: get OUT of it before they land
//       WAVE    a red ring with a green middle: get IN CLOSE (phase 2 on)
//       THROW   giant food lobbed at you: a target on the floor where it'll land: move
//       CHARGE  a red lane: get out of the way. They run out of puff at the end: free hits
//       SUMMON  some of the lads run at you (phase 2 on): one hit of food knocks them out
//   - Weak points: the head (x2), and when they're out of puff a glowing weak spot (x3).
//   - You've five hearts: a hit knocks you down and takes one. Finish a bit of food: one back. The more you've eaten
//     (your Eat Meter stage), the harder you throw.
// Multiplayer: the host's game runs the boss and tells everyone where it is and what it's doing (bossS, ten times a
// second) and every move it makes (bossA). Each game looks after its own player: dodging, being hit, hearts. Food a
// joining player throws that hits the boss is sent to the host (bossHit), who takes it off the boss's health.
import * as THREE from 'three';
import { SquadMember, SQUAD } from './squad.js';
import { Tommy } from './tommy.js';
import { Character } from './character.js';
import { Item } from './foods.js';
import { FOODS, STAGES, pickJunk } from './config.js';
import { sfx, bossMusic } from './audio.js';
import { FONT, roundRect } from './textures.js';
const BOSS_FOOD = 2;      // (the food in the BOSS FIGHT: twice the usual size, so it reads as ammo for a giant, and it's easy to see, grab and hit with)

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _q = new THREE.Quaternion(), _X = new THREE.Vector3(1, 0, 0), _Y = new THREE.Vector3(0, 1, 0), _Z = new THREE.Vector3(0, 0, 1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const GRAV = 9.81;
export const MAX_HEARTS = 5;
const IFRAMES = 2.8;           // after a hit: a moment to get up and away before the next one counts
const OUT_T = 12;              // multiplayer: knocked out (no hearts left) for this long, then back up with two
const FIGHT_T = 420;           // seven minutes: still standing after that and the boss has won (it gets bored and goes home)

// ---------------------------------------------------------------- the bosses
// moves: what each attack is called for this boss (the card / warning), sfx for it, and their lines
export const BOSSES = {
  noah: { name: 'NOAH', title: 'THE PROP FORWARD', icon: '🏉', color: '#C62828', S: 2.25, proj: 'orange', projName: 'HALF-TIME ORANGES',
    moves: { slam: 'SCRUM STAMP', wave: 'THE RUCK', throw: 'HALF-TIME ORANGES', charge: 'THE TACKLE', summon: 'THE FRONT ROW' },
    tag: 'Eighty minutes. No subs. No snacks.',
    say: {
      intro: ['Right, Ronnie. Eighty minutes. No subs. No snacks.'],
      slam: ['SCRUM DOWN!', 'CROUCH! BIND! SET!'], wave: ['RUCK! Get in or get out, Ron!'], throw: ['Half-time oranges! CATCH!', 'Have an orange! Have SIX!'],
      charge: ['TACKLE! It\'s for your own good, mate!', 'Brace, Ronnie! BRACE!'], summon: ['FRONT ROW! Get in here!', 'Lads! Pack down on him!'],
      hurt: ['Good hit! I\'m just trying to help!', 'Barely felt it, Ron!', 'That\'s a yellow card, Ronnie!'], head: ['NOT THE FACE! I\'ve got a match Sunday!'],
      tired: ['Need... an... orange...', 'Water boy! WATER BOY!'], phase2: ['Second half, Ronnie. Now I\'m warmed up.'], phase3: ['FINAL QUARTER! I\'m going for the TRY!'],
      win: ['Full time! Noah wins! Ronnie\'s on the bench. Eating it.'], lose: ['I bounced. I BOUNCED. Like a bouncy castle full of gravy.'],
      hitYou: ['TRY! Ronnie is the ball!', 'Got him! Food\'s down!'],
    } },
  lewis: { name: 'LEWIS', title: 'BRO-NALDO', icon: '⚽', color: '#E8303A', S: 2.1, proj: 'shake', projName: 'PROTEIN SHAKES',
    moves: { slam: 'THE SIUUU', wave: 'LEG DAY', throw: 'PROTEIN SHAKES', charge: 'THE RONALDO RUN', summon: 'THE GYM LADS' },
    tag: 'Leg day, bro. EVERY day is leg day.',
    say: {
      intro: ['Bro. BRO. Put the pastry down. It\'s leg day.'],
      slam: ['SIUUUUUUU!', 'Watch this, bro! SIUUU!'], wave: ['LEG DAY! Feel the burn, bro!'], throw: ['Protein, bro! Proper fuel!', 'Shakes on the table, bro! GAINS!'],
      charge: ['Ronaldo run! Out the way, bro!'], summon: ['Gym lads! Spot me!', 'Lads! LADS! He\'s skipping cardio!'],
      hurt: ['Is that it, bro?', 'Didn\'t even hurt, bro. I\'m just trying to help.'], head: ['Not the face, bro! The face is for the gram!'],
      tired: ['Bro... I skipped cardio... BRO...'], phase2: ['That was the warm-up, bro.'], phase3: ['Beast mode, bro! BEAST MODE!'],
      win: ['Gains, bro. Gains. You\'re on the protein shakes now.'], lose: ['Bro... you\'re bulking. Not like that, bro...'],
      hitYou: ['SIUUU!', 'Bro! Get UP, bro!'],
    } },
  chloe: { name: 'CHLOE', title: 'THE DIET', icon: '🥗', color: '#B57BFF', S: 2.35, proj: 'broccoli', projName: 'BROCCOLI BOMBS',
    moves: { slam: 'THE SALAD SPINNER', wave: 'FIVE A DAY', throw: 'BROCCOLI BOMBS', charge: 'THE INTERVENTION', summon: 'THE SUPPORT GROUP' },
    tag: 'It\'s for your own good, babe.',
    say: {
      intro: ['Ronnie. Babe. We need to talk about the fridge.'],
      slam: ['Salad ambush! It\'s for your own good, babe!'], wave: ['Five a day, Ronnie! FIVE! A! DAY!'], throw: ['Eat your greens, babe!', 'That\'s Gerald. Gerald had DREAMS, Ronnie.'],
      charge: ['Intervention! Hold still, babe!'], summon: ['Everyone! Support group! NOW!'],
      hurt: ['Ronnie! I\'m trying to SAVE you!', 'Did you just throw a doughnut at your GIRLFRIEND?'], head: ['My HAIR, Ronnie! I just had it done!'],
      tired: ['I\'m not tired. I\'m DISAPPOINTED.'], phase2: ['Right. No more Mrs Nice Girlfriend.'], phase3: ['That\'s it. You\'re sleeping on the sofa. If it survives.'],
      win: ['I\'ve ordered you a salad. A BIG one. For your size.'], lose: ['Fine. FINE. Eat it. I\'ll just watch. Like a nature documentary.'],
      hitYou: ['SALAD! In your FACE!', 'Healthy option, babe!'],
    } },
  tommy: { name: 'TOMMY', title: 'THE OLDER TWIN', icon: '🟤', color: '#C9A227', S: 2.4, proj: 'broccoli', projName: 'BROCCOLI BARRAGE',
    moves: { slam: 'THE BIG BROTHER STOMP', wave: 'THE ABS OF STEEL', throw: 'BROCCOLI BARRAGE', charge: 'THE SIBLING RIVALRY', summon: 'THE LADS' },
    tag: 'A whole day older. A whole day wiser.',
    say: {
      intro: ['Respect your elders, Ronnie. I\'ve been alive a WHOLE day longer than you.'],
      slam: ['Big brother STOMP!'], wave: ['Feel these abs, Ron! FEEL THEM!'], throw: ['Broccoli! For your own good!', 'Five a day, little brother!'],
      charge: ['Sibling rivalry, Ron! Coming through!'], summon: ['Lads! Help your big brother out!'],
      hurt: ['I\'m just trying to help!', 'You hit like you eat. A LOT.'], head: ['Not the face! I need it for my abs!'],
      tired: ['Hang on... I need... my abs need a rest...'], phase2: ['When I was your age — so, yesterday — I was STRONGER.'], phase3: ['I\'m the OLDER one, Ronnie! RESPECT IT!'],
      win: ['Big brother wins. Again. A whole day of practice, Ron.'], lose: ['I\'ll tell Mum you were good. I\'ll lie.'],
      hitYou: ['Down you go, little brother!', 'Twin powers... ACTIVATE!'],
    } },
};
export const BOSS_ORDER = ['noah', 'lewis', 'chloe', 'tommy'];

// ---------------------------------------------------------------- where it's fought
//  box: where the boss walks (x0, x1, z0, z1)   play: where the food falls   home: where it lands   start: where you start
//  avoid: [x, z, r] a circle the boss keeps out of (the beer garden's outdoor bar)   patio: the patio's furniture is
//  stacked away for the fight (room.patio, levels/pub.js), so it's a clear arena with the bar in the middle for cover
export const ARENAS = {
  garden: { name: 'LEWIS\'S GARDEN', box: [-5.5, 1.3, -11.2, -1.6], play: [-6.1, 1.8, -11.8, -0.8], home: [-3.2, -6.8], start: [-1.6, -1.6, 0] },      // Lewis's lawn
  carpark: { name: 'THE CAR PARK', box: [7.9, 11.3, -22.9, -13.4], play: [3.9, 16.2, -23.4, -12.4], home: [9.6, -20.4], start: [9.6, -13.9, 0] },        // the pub's car park out the front
  beergarden: { name: 'THE BEER GARDEN', box: [-5.4, 7.6, 24.4, 41.4], play: [-6.4, 9.6, 23.6, 42.2], home: [6.4, 38.8], start: [-4.2, 38.6, 0], avoid: [1.85, 32.4, 4.3], patio: true },      // the pub's beer garden, round the outdoor bar
};
// where each place can have it: the Oysterfleet's car park or its beer garden (one at random each fight), Lewis's lawn
export const PLACE_ARENAS = { pub: ['carpark', 'beergarden'], garden: ['garden'] };
export const BOSS_PLACES = Object.keys(PLACE_ARENAS);
// the host picks (everyone else gets it in the boss's state): ?arena=beergarden in the address, sessionStorage rs_arena
// or window.__bossArena (tests, the developer mode) force one, as long as the place has it
export function pickArena(placeId, rnd = Math.random) {
  const list = PLACE_ARENAS[placeId] || ['garden'];
  let want = null; try { want = window.__bossArena || new URLSearchParams(location.search).get('arena') || sessionStorage.getItem('rs_arena'); } catch (e) {}
  if (want && list.includes(want)) return want;
  return list[Math.min(list.length - 1, Math.floor(rnd() * list.length))];
}

// telegraph times (how long the warning's up), by phase
const TELE = { slam: [1.7, 1.35, 1.1], wave: [1.8, 1.5, 1.25], throw: [0.95, 0.8, 0.65], charge: [1.5, 1.2, 1.0], summon: [1.0, 1.0, 0.9] };
const WEIGHTS = [{ slam: 3, throw: 4, charge: 3 }, { slam: 2, wave: 2, throw: 3, charge: 3, summon: 2 }, { slam: 2, wave: 3, throw: 3, charge: 3, summon: 2 }];
const DMG_CAP = 320;

// ---------------------------------------------------------------- shared look bits (made once)
let GEO = null;
function geos() {
  if (GEO) return GEO;
  const lane = new THREE.PlaneGeometry(1, 1); lane.rotateX(-Math.PI / 2); lane.translate(0, 0, 0.5);
  const disc = new THREE.CircleGeometry(1, 56); disc.rotateX(-Math.PI / 2);
  const ring = new THREE.RingGeometry(0.93, 1, 72); ring.rotateX(-Math.PI / 2);
  const thick = new THREE.RingGeometry(0.72, 1, 72); thick.rotateX(-Math.PI / 2);
  return (GEO = { lane, disc, ring, thick });
}
const flatMat = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
let _glowT = null;
function glowTex() {
  if (_glowT) return _glowT;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,240,120,0.95)'); gr.addColorStop(0.55, 'rgba(255,120,30,0.5)'); gr.addColorStop(1, 'rgba(255,60,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 40, 0, 7); g.stroke();
  g.lineWidth = 5; for (const a of [0, 1.5708, 3.1416, 4.7124]) { g.beginPath(); g.moveTo(64 + Math.cos(a) * 30, 64 + Math.sin(a) * 30); g.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58); g.stroke(); }
  _glowT = new THREE.CanvasTexture(c); _glowT.colorSpace = THREE.SRGBColorSpace; return _glowT;
}

// ---------------------------------------------------------------- damage numbers (their own little pool: words.js has six sprites for everything)
class Numbers {
  constructor(scene) {
    this.scene = scene; this.live = []; this.pool = [];
    for (let i = 0; i < 10; i++) {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 112; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false })); s.renderOrder = 14; s.visible = false; s.userData = { cv, tex }; scene.add(s); this.pool.push(s);
    }
  }
  show(text, sub, pos, color, size = 0.55) {
    const s = this.pool.pop() || (this.live.length ? this.live.shift().s : null); if (!s) return;
    const { cv, tex } = s.userData, g = cv.getContext('2d'); g.clearRect(0, 0, 256, 112);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    if (sub) { g.font = `900 26px ${FONT}`; g.lineWidth = 7; g.strokeStyle = '#111'; g.strokeText(sub, 128, 20); g.fillStyle = '#fff'; g.fillText(sub, 128, 20); }
    let f = 64; g.font = `900 ${f}px ${FONT}`; while (g.measureText(text).width > 240 && f > 24) { f -= 4; g.font = `900 ${f}px ${FONT}`; }
    g.lineWidth = 12; g.strokeStyle = '#111'; g.strokeText(text, 128, sub ? 70 : 58); g.fillStyle = color; g.fillText(text, 128, sub ? 70 : 58);
    tex.needsUpdate = true;
    s.position.copy(pos); s.visible = true; s.material.opacity = 1;
    this.live.push({ s, t: 0, size, vx: (Math.random() - 0.5) * 0.6 });
  }
  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const n = this.live[i]; n.t += dt; const k = n.t / 1.1, pop = n.t < 0.12 ? 0.6 + n.t / 0.12 * 0.7 : 1.3 - Math.min(0.3, (n.t - 0.12) * 1.5);
      n.s.scale.set(n.size * 2.29 * pop, n.size * pop, 1); n.s.position.y += (1.2 - n.t) * dt; n.s.position.x += n.vx * dt;
      n.s.material.opacity = k > 0.65 ? Math.max(0, 1 - (k - 0.65) / 0.35) : 1;
      if (k >= 1) { n.s.visible = false; this.live.splice(i, 1); this.pool.push(n.s); }
    }
  }
  dispose() { for (const s of [...this.pool, ...this.live.map(n => n.s)]) { this.scene.remove(s); s.material.map.dispose(); s.material.dispose(); } this.pool = []; this.live = []; }
}

// ---------------------------------------------------------------- the on-screen bits (phone / computer)
const CSS = `
#boss-hud { position: fixed; left: 50%; top: calc(max(8px, env(safe-area-inset-top)) + 4px); transform: translateX(-50%); width: min(560px, calc(100vw - 260px)); min-width: 300px; z-index: 21; pointer-events: none; display: none; font-family: "Arial Black", Arial, sans-serif; color: #fff; text-shadow: 0 2px 0 #000; }
body.flat #boss-hud.on { display: block; } body.gameover #boss-hud, body.boss-cine #boss-hud { display: none !important; }
body.boss-cine #touch, body.boss-cine #mp-chip, body.boss-cine #chat-log, body.boss-cine #vc-list, body.boss-cine #warm-bar { visibility: hidden !important; }
#boss-hud .bh-say { margin: 6px auto 0; width: fit-content; max-width: 100%; text-align: center; font: italic 700 14px Arial, sans-serif; padding: 4px 12px; border-radius: 10px; background: rgba(0,0,0,0.62); display: none; }
#boss-hud .bh-say.on { display: block; } #boss-hud .bh-say b { font: 900 13px "Arial Black", Arial, sans-serif; color: var(--bc, #ffd400); font-style: normal; margin-right: 6px; }
#boss-hud .bh-top { display: flex; align-items: flex-end; gap: 8px; margin-bottom: 3px; }
#boss-hud .bh-face { width: 40px; height: 40px; border-radius: 50%; border: 3px solid var(--bc, #ffd400); object-fit: cover; background: #222; flex: none; box-shadow: 0 2px 0 #000; }
#boss-hud .bh-name { font-size: 22px; line-height: 1; letter-spacing: 1px; color: #fff; white-space: nowrap; }
#boss-hud .bh-title { font-size: 11px; color: var(--bc, #ffd400); letter-spacing: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#boss-hud .bh-ph { margin-left: auto; font-size: 12px; padding: 3px 8px; border-radius: 8px; background: rgba(0,0,0,0.6); border: 2px solid var(--bc, #ffd400); white-space: nowrap; flex: none; }
#boss-hud .bh-bar { position: relative; height: 22px; border-radius: 11px; background: rgba(10,10,20,0.78); border: 3px solid #111; box-shadow: 0 0 0 2px rgba(255,255,255,0.55), 0 3px 0 rgba(0,0,0,0.4); overflow: hidden; }
#boss-hud .bh-bar i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 8px; }
#boss-hud .bh-trail { background: #fff3b0; transition: width .5s ease-out .25s; }
#boss-hud .bh-fill { background: linear-gradient(180deg, #ff5a5a, #c00 55%, #7a0000); }
#boss-hud.ph2 .bh-fill { background: linear-gradient(180deg, #ffb13b, #e8590c 55%, #8a2a00); }
#boss-hud.ph3 .bh-fill { background: linear-gradient(180deg, #e879f9, #a21caf 55%, #4a044e); }
#boss-hud .bh-bar b { position: absolute; top: 0; bottom: 0; width: 3px; background: rgba(0,0,0,0.6); }
#boss-hud .bh-hp { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; letter-spacing: 1px; }
#boss-hud.low .bh-bar { animation: bhlow .5s infinite alternate; } @keyframes bhlow { to { box-shadow: 0 0 0 2px #fff, 0 0 14px #ff2a2a; } }
#boss-hud.hit .bh-bar { animation: bhhit .18s; } @keyframes bhhit { 0% { transform: translateX(-4px); } 50% { transform: translateX(4px); } 100% { transform: none; } }
#boss-hud.shield .bh-fill { filter: grayscale(0.7) brightness(1.4); }
#boss-hud .bh-me { display: flex; justify-content: center; gap: 10px; margin-top: 5px; font-size: 13px; }
#boss-hud .bh-me .bh-st { display: inline-flex; flex-direction: column; align-items: center; background: rgba(0,0,0,0.6); padding: 2px 9px 3px; border-radius: 9px; white-space: nowrap; line-height: 1.1; }
#boss-hud .bh-me .bh-st small { font: 900 9.5px Arial, sans-serif; letter-spacing: 1px; color: #c9d3ff; text-shadow: none; }      /* (a little label over each: whose health, whose power) */
#boss-hud .bh-warn { margin: 6px auto 0; width: fit-content; max-width: 100%; text-align: center; font-size: 14px; padding: 5px 12px; border-radius: 11px; background: rgba(200,0,0,0.88); border: 2px solid #ffd400; display: none; animation: bhwarn .35s infinite alternate; }
#boss-hud .bh-warn.on { display: block; } #boss-hud .bh-warn.good { background: rgba(0,140,40,0.9); } @keyframes bhwarn { to { transform: scale(1.06); } }
@media (max-aspect-ratio: 1/1) { #boss-hud { width: calc(100vw - 20px); min-width: 0; } #boss-hud .bh-name { font-size: 19px; } #boss-hud .bh-face { width: 34px; height: 34px; } }
/* a phone (either way up): the card is one row and the bar; nothing says the same thing twice */
body.compact-ui #boss-hud { display: none; grid-template-columns: 1fr auto; grid-template-areas: "top me" "bar bar" "warn warn" "say say"; column-gap: 6px; align-items: center; }
body.compact-ui.flat #boss-hud.on { display: grid; }
body.compact-ui #boss-hud .bh-top { grid-area: top; align-items: center; gap: 6px; margin: 0 0 4px; min-width: 0; }
body.compact-ui #boss-hud .bh-me { grid-area: me; margin: 0 0 4px; gap: 4px; font-size: 11px; justify-content: flex-end; }
body.compact-ui #boss-hud .bh-me .bh-st { padding: 1px 6px 2px; } body.compact-ui #boss-hud .bh-me .bh-st small { font-size: 8.5px; }
body.compact-ui #boss-hud .bh-bar { grid-area: bar; height: 18px; } body.compact-ui #boss-hud .bh-hp { font-size: 11px; }
body.compact-ui #boss-hud .bh-warn { grid-area: warn; font-size: 12px; padding: 4px 10px; margin-top: 5px; }
body.compact-ui #boss-hud .bh-say { grid-area: say; font-size: 12px; padding: 3px 10px; margin-top: 5px; }
body.compact-ui #boss-hud .bh-warn.on ~ .bh-say { display: none; }      /* (a warning up: the quote waits) */
body.compact-ui #boss-hud .bh-title { display: none; }
body.compact-ui #boss-hud .bh-face { width: 28px; height: 28px; border-width: 2px; }
body.compact-ui #boss-hud .bh-name { font-size: 16px; }
body.compact-ui #boss-hud .bh-ph { margin-left: 4px; font-size: 10px; padding: 2px 6px; }
body.compact-ui.ui-boss #mp-chip { display: none !important; }
body.compact-ui.ui-boss #chat-log > :nth-last-child(n+3) { display: none; }
#boss-over { position: fixed; inset: 0; z-index: 44; display: none; align-items: center; justify-content: center; pointer-events: none; font-family: "Arial Black", Arial, sans-serif; text-align: center; color: #fff; overflow: hidden; }
#boss-over.on { display: flex; } #boss-over .bo-bg { position: absolute; inset: 0; background: radial-gradient(circle, rgba(0,0,0,0.25), rgba(0,0,0,0.75)); animation: bofade .5s both; }
#boss-over.win .bo-bg { background: radial-gradient(circle, rgba(255,214,0,0.35), rgba(60,20,0,0.8)); } #boss-over.lose .bo-bg { background: radial-gradient(circle, rgba(120,0,0,0.35), rgba(20,0,0,0.85)); }
#boss-over .bo-box { position: relative; padding: 0 16px; max-width: 94vw; animation: bopop .6s cubic-bezier(.2,1.6,.4,1) both .15s; }
#boss-over .bo-face { width: min(26vw, 120px); height: min(26vw, 120px); border-radius: 50%; border: 6px solid #ffd400; object-fit: cover; box-shadow: 0 6px 0 #000; }
#boss-over.lose .bo-face { border-color: #ff3b3b; transform: rotate(-8deg); } #boss-over.win .bo-face { filter: grayscale(0.6); transform: rotate(14deg); }
#boss-over h1 { margin: 10px 0 2px; font-size: clamp(34px, 10vw, 84px); line-height: 0.95; -webkit-text-stroke: 3px #111; color: #ffd400; text-shadow: 0 6px 0 #111; letter-spacing: 1px; }
#boss-over.lose h1 { color: #ff4d4d; } #boss-over h2 { margin: 4px 0; font-size: clamp(15px, 4.2vw, 26px); text-shadow: 0 3px 0 #000; }
#boss-over p { margin: 8px auto 0; max-width: 560px; font: italic 700 clamp(13px, 3.6vw, 18px) Arial, sans-serif; text-shadow: 0 2px 0 #000; }
@keyframes bofade { from { opacity: 0; } } @keyframes bopop { from { opacity: 0; transform: scale(0.3) rotate(-10deg); } }
#boss-intro { position: fixed; inset: 0; z-index: 43; display: none; pointer-events: none; font-family: "Arial Black", Arial, sans-serif; color: #fff; overflow: hidden; }
#boss-intro.on { display: block; } #boss-intro .bi-bar { position: absolute; left: 0; right: 0; height: 11vh; background: #000; transition: transform .45s ease-out; }
#boss-intro .bi-bar.t { top: 0; transform: translateY(-100%); } #boss-intro .bi-bar.b { bottom: 0; transform: translateY(100%); }
#boss-intro.bars .bi-bar { transform: none; }
#boss-intro .bi-plate { position: absolute; left: 0; bottom: calc(11vh + 4vh); display: flex; align-items: center; gap: 14px; padding: 12px 26px 12px 18px; background: linear-gradient(90deg, var(--bc, #c62828) 70%, transparent); transform: translateX(-110%); transition: transform .5s cubic-bezier(.2,1.3,.4,1); max-width: 92vw; box-sizing: border-box; }
#boss-intro.plate .bi-plate { transform: none; }
#boss-intro .bi-plate img { width: min(18vw, 84px); height: min(18vw, 84px); border-radius: 50%; border: 5px solid #ffd400; object-fit: cover; flex: none; background: #222; }
#boss-intro .bi-k { font-size: clamp(11px, 2.6vw, 15px); letter-spacing: 3px; color: #ffd400; }
#boss-intro .bi-n { font-size: clamp(36px, 11vw, 78px); line-height: 1.08; margin: 2px 0; -webkit-text-stroke: 2px #111; text-shadow: 0 5px 0 #111; }
#boss-intro .bi-t { font-size: clamp(14px, 4vw, 24px); letter-spacing: 2px; text-shadow: 0 3px 0 #111; }
#boss-intro .bi-q { position: absolute; left: 50%; top: calc(11vh + 3vh); transform: translateX(-50%); width: min(88vw, 640px); text-align: center; font: italic 700 clamp(14px, 3.8vw, 22px) Arial, sans-serif; text-shadow: 0 2px 0 #000, 0 0 12px #000; opacity: 0; transition: opacity .4s; }
#boss-intro.plate .bi-q { opacity: 1; }
#boss-intro .bi-skip { position: absolute; right: 14px; bottom: calc(11vh + 10px); font: 900 12px Arial; color: rgba(255,255,255,0.7); }
`;
function css() { if (document.getElementById('boss-css')) return; const s = document.createElement('style'); s.id = 'boss-css'; s.textContent = CSS; document.head.appendChild(s); }
const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const portrait = (id) => `./assets/portraits/${id}.webp`;

// ---------------------------------------------------------------- the fight
export class BossFight {
  // g: { scene, room, physics, player, items, words, crumbs, G, cast, director, net, mp, camera, renderer, fx, hint, showBanner }
  constructor(g, pick = null) {
    this.g = g; css();
    // the arena: the host picks one of the place's (the joiners are told it with the boss: see onState)
    this.setArena(this.host ? pickArena(g.room.placeId) : (PLACE_ARENAS[g.room.placeId] || ['garden'])[0]);
    this.fightN = (Date.now() % 100000);
    this.hearts = MAX_HEARTS; this.iframe = 0; this.out = 0; this.over = null; this.overT = 0;
    this.hazards = []; this.projs = []; this.minions = []; this.minionIds = []; this.mCool = new Map();
    this.stats = { dmg: 0, hits: 0, crits: 0, thrown: 0, kd: 0, ate: 0, healed: 0, minions: 0 };
    this.players = new Map();          // (host) everyone's state: id -> { name, hp, out, dmg, hits, crits, kd }
    this.numbers = new Numbers(g.scene);
    this.t = 0; this.st = 'none'; this.stT = 0; this.act = null; this.ph = 1; this.hp = 1; this.mx = 1; this.cool = 3; this.nAttacks = 0; this.lastAtk = null; this.stagger = 0;
    this.placed = false; this.lastStage = g.G.stage;
    this.wasHost = this.host;
    this.buildHud();
    // VR throws and the THROW button: a little help aiming at something four metres tall
    this.rel0 = g.player.onRelease; g.player.onRelease = (it, h, sp) => { try { this.rel0 && this.rel0(it, h, sp); } finally { this.assist(it, h); } };
    // multiplayer messages
    this.handlers = {};
    const on = (k, f) => { this.handlers[k] = g.net.on[k]; g.net.on[k] = (m, p) => { try { f(m, p); } catch (e) { console.warn('boss', k, e); } }; };
    const fromHost = (p) => !g.net.hostId || (p && p.id === g.net.hostId);      // (only the host's word on the boss counts)
    on('bossS', (m, p) => { if (fromHost(p)) this.onState(m); }); on('bossA', (m, p) => { if (!this.host && fromHost(p)) this.apply(m, true); });
    on('end', (m, p) => { if (!this.host && m && Array.isArray(m.lines)) m.lines = this.summary(m.lines.filter(l => Array.isArray(l) && typeof l[0] === 'string' && TEAM_ROW.test(l[0]))); const f = this.handlers.end; f && f(m, p); });
    on('bossHit', (m, p) => this.onRemoteHit(m, p)); on('bossP', (m, p) => this.onPlayer(m, p)); on('bossHi', (m, p) => { if (this.host && p) this.sendState(true); });
    if (this.host) this.begin(pick || nextBoss(g.mp && g.mp.takenChars ? g.mp.takenChars() : new Set()));
    else { g.net.send({ t: 'bossHi' }); this.st = 'wait'; }
    sfx('gamestart', null, 1);
  }
  get host() { return !this.g.director.remote; }
  get mpOn() { return !!(this.g.net && this.g.net.connected && this.g.mp && this.g.mp.on); }
  get def() { return BOSSES[this.id] || BOSSES.noah; }
  get pct() { return this.mx > 0 ? clamp(this.hp / this.mx, 0, 1) : 0; }
  get power() { const G = this.g.G; return Math.round((1 + 0.1 * G.stage) * (G.locoT > 0 ? 1.5 : 1) * (G.stoutT > 0 ? 1.25 : 1) * 10) / 10; }
  get shielded() { return ['none', 'wait', 'drop', 'roar', 'phase', 'dead', 'win'].includes(this.st); }
  get playerCount() { return 1 + (this.mpOn ? this.g.net.players.size : 0); }

  // ---------------------------------------------------------------- set up (host)
  begin(id) { this.seenAtk = new Set();
    this.id = BOSSES[id] ? id : 'noah';
    this.mx = Math.round(900 * (1 + 0.6 * (this.playerCount - 1))); this.hp = this.mx;
    this.ph = 1; this.S0 = this.def.S; this.S = this.S0;
    this.makeChar();
    this.setSt('drop'); this.dropY = 16;
    this.startIntro();
    this.sendState(true);
  }
  setArena(id) {
    if (!ARENAS[id] || id === this.arena) return;
    const room = this.g.room;
    if (this.A && this.A.patio && room.patio) room.patio.clear(false, this.g.physics);      // (the furniture back out)
    this.arena = id; this.A = ARENAS[id];
    if (this.A.patio && room.patio) room.patio.clear(true, this.g.physics);
    this.placed = false;
  }
  makeChar() {
    const g = this.g, [hx, hz] = this.A.home;
    if (this.c) { this.c.dispose(); this.c = null; }
    const yaw = Math.atan2(this.A.start[0] - hx, this.A.start[1] - hz);
    let c;
    if (this.id === 'tommy') { c = new Tommy(g.scene, g.room, g.physics); c.load(); c.rag.placeAt(hx, hz, yaw); }
    else c = new SquadMember(g.scene, g.room, g.physics, this.id, [hx, hz, yaw], g.director);
    c.bossBody = true; c.mpPuppet = true; c.active = false; c.state = 'idle'; c.attacks = false; c.name = this.def.name.charAt(0) + this.def.name.slice(1).toLowerCase();
    for (const p of c.rag.list) p.body.collisionResponse = false;      // (drawn four metres tall, but its physics is person-sized: nothing bumps into it)
    const B = this.A.box, P = 0.6, solid = (g.room.blockers || []).filter(k => (k.y1 ?? 2) > 0.45 && k.x1 > B[0] - P && k.x0 < B[1] + P && k.z1 > B[2] - P && k.z0 < B[3] + P && Math.max(k.x1 - k.x0, k.z1 - k.z0) < 5);
    const AV = this.A.avoid;
    c.rag.constrain = (root) => { root.x = clamp(root.x, B[0], B[1]); root.z = clamp(root.z, B[2], B[3]);
      if (AV) { const dx = root.x - AV[0], dz = root.z - AV[1], d = Math.hypot(dx, dz); if (d < AV[2]) { const k = d > 1e-3 ? AV[2] / d : 0; root.x = d > 1e-3 ? AV[0] + dx * k : AV[0] + AV[2]; root.z = AV[1] + dz * k; } }      // (round the outdoor bar, never through it)      // (stays on its patch, and steps round the furniture: the ping-pong table, the cars)
      for (const k of solid) if (root.x > k.x0 - P && root.x < k.x1 + P && root.z > k.z0 - P && root.z < k.z1 + P) {
        const dl = root.x - (k.x0 - P), dr = (k.x1 + P) - root.x, dn = root.z - (k.z0 - P), df = (k.z1 + P) - root.z, mn = Math.min(dl, dr, dn, df);
        if (mn === dl) root.x = k.x0 - P; else if (mn === dr) root.x = k.x1 + P; else if (mn === dn) root.z = k.z0 - P; else root.z = k.z1 + P; } };
    if (c.prop) c.prop.visible = false;
    { const sl = c.showLine.bind(c); c.showLine = (...a) => { sl(...a); if (g.player.flatMode && !g.renderer.xr.isPresenting) c.bubble.visible = false; }; }      // (on a screen: subtitles instead, see drawHud)
    c.rag.bulk = { w: this.S, h: this.S };
    this.c = c; this.x = hx; this.z = hz; this.yaw = yaw;
    this.baseCol = null; this.flashT = 0; this.shadSet = false;
  }
  // the body's own material (the hit flash and the angry red go on it)
  mat() { const m = this.c && this.c.rag.mesh && this.c.rag.mesh.material; if (m && !Array.isArray(m) && m.emissive) { if (!this.baseCol) this.baseCol = { e: m.emissive.clone(), c: m.color.clone() }; return m; } return null; }

  // ---------------------------------------------------------------- per frame
  update(dt, ctx) {
    const g = this.g, P = g.player;
    this.t += dt;
    if (this.host !== this.wasHost) { this.wasHost = this.host; if (this.host) this.becomeHost(); }
    if (!this.placed && (this.host || this.arenaKnown || this.t > 3)) { this.placed = true; this.placePlayer(); }      // (a joiner: once the host's said which arena)
    this.updateIntro(dt);
    if (this.c) {
      if (this.host) this.think(dt); else this.follow(dt);
      this.animate(dt);
    }
    this.updateHazards(dt);
    this.updateProjs(dt);
    this.foodHits();
    if (this.g.renderer && this.g.renderer.xr.isPresenting) this.handPunches();
    this.updateMinions(dt);
    this.updateMe(dt);
    if (this.host) this.ammo(dt);
    // (every bit of food in the fight is boss-sized, on everyone's screen: a joiner's copies of the host's food, and any that
    // was already lying about, too)
    if ((this.sizeT = (this.sizeT || 0) - dt) <= 0) { this.sizeT = 0.25; for (const it of this.g.items.items) if (!it.dead && !it.heldBy && it.sizeK === 1 && !it.def.prop && !it.def.drink && !it.def.poop && it.setSize) it.setSize(BOSS_FOOD); }
    // (in your hand on a phone or computer, it's its usual size: a boss-sized burger right in front of the camera covered a
    // third of the screen. It's boss-sized again the moment it leaves your hand, so it still hits like one. A headset's
    // real hand holds the big one)
    { const P = this.g.player, held = P.flatMode && P.flatHolder ? P.flatHolder.held : null;
      if (this.heldSmall && this.heldSmall !== held) { if (!this.heldSmall.dead && this.heldSmall.setSize) this.heldSmall.setSize(BOSS_FOOD); this.heldSmall = null; }
      if (held && held.sizeK === BOSS_FOOD && held.setSize) { held.setSize(1); this.heldSmall = held; } }
    this.numbers.update(dt);
    this.drawHud(dt);
    this.updateOver(dt);
    if (this.host && this.mpOn && (this.sendT = (this.sendT || 0) - dt) <= 0) { this.sendT = 0.1; this.sendState(false); }
    // a camera shake (screen only: in the headset it'd make you ill)
    if (this.shakeT > 0) { this.shakeT -= dt; if (P.flatMode && !g.renderer.xr.isPresenting) { const k = this.shakeA * Math.min(1, this.shakeT * 3); g.camera.position.x += (Math.random() - 0.5) * k; g.camera.position.y += (Math.random() - 0.5) * k; } }
    // music: faster each phase
    const want = this.over || this.st === 'none' || this.st === 'wait' ? 0 : this.ph;
    if (want !== this.musicPh) { this.musicPh = want; bossMusic(!!want, want); }
  }

  // ---------------------------------------------------------------- the boss's brain (host)
  setSt(st, act = null) { this.st = st; this.stT = 0; this.act = act; this.did = {}; }
  targets() {
    const P = this.g.player, out = [];
    if (!this.out) out.push({ id: null, x: P.head.x, z: P.head.z });
    if (this.mpOn) for (const p of this.g.net.players.values()) { const ps = this.players.get(p.id); if (!p.avatar || (ps && ps.out)) continue; const h = p.avatar.headPos(); out.push({ id: p.id, x: h.x, z: h.z }); }
    if (!out.length) out.push({ id: null, x: P.head.x, z: P.head.z });
    return out;
  }
  pickTarget() { const t = this.targets(); this.tgI = ((this.tgI || 0) + 1) % t.length; return t[Math.floor(Math.random() * t.length)] || t[0]; }
  think(dt) {
    this.stT += dt;
    const ph = this.ph - 1, B = this.A.box;
    if (!this.target || (this.retargetT = (this.retargetT || 0) - dt) <= 0) { this.retargetT = 4; this.target = this.pickTarget(); }
    else { const fresh = this.targets().find(t => t.id === this.target.id); if (fresh) this.target = fresh; }
    const T = this.target, dx = T.x - this.x, dz = T.z - this.z, dist = Math.hypot(dx, dz) || 1;
    this.moving = 0;
    switch (this.st) {
      case 'drop': {
        this.dropV = (this.dropV || 0) + GRAV * 1.6 * dt; this.dropY = Math.max(0, this.dropY - this.dropV * dt);
        if (this.dropY <= 0 && !this.did.land) { this.did.land = true; this.emit({ k: 'land', x: this.x, z: this.z }); this.setSt('roar'); }
        break;
      }
      case 'roar': if (this.stT > 2.6) { this.setSt('idle'); this.cool = 1.5; this.say('intro'); } break;
      case 'idle': {
        this.faceTo(Math.atan2(dx, dz), dt, 3);
        // keep about five metres off (closer when angry), and drift sideways
        const want = [5.2, 4.6, 4.0][ph], sp = [1.3, 1.6, 1.9][ph];
        let mx = 0, mz = 0; if (dist > want + 0.8) { mx = dx / dist; mz = dz / dist; } else if (dist < want - 1.4) { mx = -dx / dist; mz = -dz / dist; }
        const side = Math.sin(this.t * 0.6) > 0 ? 1 : -1; mx += -dz / dist * 0.35 * side; mz += dx / dist * 0.35 * side;
        const l = Math.hypot(mx, mz); if (l > 0.05) { this.x = clamp(this.x + mx / l * sp * dt, B[0], B[1]); this.z = clamp(this.z + mz / l * sp * dt, B[2], B[3]); this.moving = sp; }
        if ((this.cool -= dt) <= 0) this.startAttack();
        break;
      }
      case 'tele': {
        if (this.act === 'throw' || this.act === 'summon' || this.act === 'slam' || this.act === 'wave') this.faceTo(Math.atan2(dx, dz), dt, 4);
        if (this.stT >= this.teleT) this.doAttack();
        break;
      }
      case 'slam': if (this.stT >= 0.32 && !this.did.hit) { this.did.hit = true; this.emit({ k: 'slam', x: this.x, z: this.z, r: this.slamR, r0: this.act === 'wave' ? this.safeR : 0 }); }
        if (this.stT >= 0.9) { if (this.again > 0) { this.again--; this.tele(this.act, 0.75); } else this.after(); } break;
      case 'throw': {
        this.faceTo(Math.atan2(dx, dz), dt, 5);
        const n = this.throwN, gap = [0.5, 0.42, 0.34][ph];
        while ((this.did.n || 0) < n && this.stT >= 0.18 + (this.did.n || 0) * gap) { this.did.n = (this.did.n || 0) + 1; this.throwOne(this.did.n > 1); }
        if (this.stT >= 0.18 + n * gap + 0.4) this.after();
        break;
      }
      case 'charge': {
        const L = this.lane, u = clamp(this.stT / L.d, 0, 1); this.x = lerp(L.x0, L.x1, u); this.z = lerp(L.z0, L.z1, u); this.moving = L.v; this.yaw = Math.atan2(L.x1 - L.x0, L.z1 - L.z0);
        if (u >= 1) { if (this.again > 0) { this.again--; this.tele('charge', 0.7); } else { this.emit({ k: 'thud', x: this.x, z: this.z }); this.tired(2.8); } }
        break;
      }
      case 'summon': if (this.stT >= 0.7 && !this.did.s) { this.did.s = true; this.summon(); } if (this.stT >= 1.7) this.after(); break;
      case 'tired': if (this.stT >= this.tiredT) { this.setSt('idle'); this.cool = 0.8; } break;
      case 'stagger': if (this.stT >= 1.1) { this.setSt('idle'); this.cool = 0.6; } break;
      case 'phase': if (this.stT >= 3.4) { this.setSt('idle'); this.cool = 0.5; } break;
      case 'dead': if (this.stT >= 2.0 && !this.did.v) { this.did.v = true; this.emit({ k: 'win' }); } break;
      case 'win': break;
    }
    // the clock: still standing after seven minutes and it's the boss's game
    if (!this.over && !this.shielded && this.t > FIGHT_T + 8) this.lose('time');
    // everyone down at once: the boss wins
    if (!this.over && this.st !== 'none' && this.st !== 'drop') {
      const meOut = this.out > 0 || this.hearts <= 0, all = [...(this.mpOn ? this.g.net.players.keys() : [])].every(id => { const ps = this.players.get(id); return ps && ps.out; });
      if (meOut && all) this.lose('down');
    }
  }
  faceTo(yaw, dt, sp) { this.yaw += wrap(yaw - this.yaw) * Math.min(1, dt * sp); }
  startAttack() {
    const ph = this.ph - 1, W = { ...WEIGHTS[ph] };
    if (this.lastAtk) W[this.lastAtk] = (W[this.lastAtk] || 0) * 0.25;
    if (this.minions.some(c => !c.disposed)) delete W.summon;
    // (every move it has gets a go before any comes round again: a quick fight used to finish without ever showing one)
    const seen = this.seenAtk || (this.seenAtk = new Set()), fresh = Object.keys(W).filter(k => W[k] > 0 && !seen.has(k)); if (fresh.length) for (const k in W) if (!fresh.includes(k)) delete W[k];
    let tot = 0; for (const k in W) tot += W[k]; let r = Math.random() * tot, pick = 'throw';
    for (const k in W) { r -= W[k]; if (r <= 0) { pick = k; break; } }
    if (this.forceNext) { pick = this.forceNext; this.forceNext = null; }      // (a new phase opens with one of its new moves)
    this.lastAtk = pick; this.nAttacks++; this.seenAtk.add(pick);
    this.again = pick === 'slam' && ph === 2 ? 1 : pick === 'charge' && ph >= 1 && Math.random() < (ph === 2 ? 0.8 : 0.4) ? 1 : 0;
    this.tele(pick);
  }
  tele(a, mul = 1) {
    const ph = this.ph - 1, d = TELE[a][ph] * mul, T = this.target || this.pickTarget();
    this.teleT = d; this.setSt('tele', a);
    const ev = { k: 'tele', a, d, x: this.x, z: this.z };
    if (a === 'slam') { this.slamR = [4.4, 5.2, 6.0][ph] * (this.again === 0 && ph === 2 && mul < 1 ? 1.3 : 1); ev.r = this.slamR; }
    if (a === 'wave') { this.slamR = 11; this.safeR = [2.6, 2.4, 2.2][ph]; ev.r = this.slamR; ev.r0 = this.safeR; }
    if (a === 'charge') {
      const B = this.A.box, dx = T.x - this.x, dz = T.z - this.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
      let len = l + 3; for (let i = 0; i < 40; i++) { const ex = this.x + ux * len, ez = this.z + uz * len; if (ex >= B[0] - 1.2 && ex <= B[1] + 1.2 && ez >= B[2] - 1.2 && ez <= B[3] + 1.2) break; len *= 0.94; }
      len = clamp(len, 3, 15); const v = [8, 9.5, 11][ph];
      { const ex = clamp(this.x + ux * len, B[0], B[1]), ez = clamp(this.z + uz * len, B[2], B[3]); len = Math.max(2.5, Math.hypot(ex - this.x, ez - this.z)); }
      this.lane = { x0: this.x, z0: this.z, x1: this.x + ux * len, z1: this.z + uz * len, d: len / v, v, w: 1.5 * this.S / 2.25 };
      Object.assign(ev, { x1: this.lane.x1, z1: this.lane.z1, w: this.lane.w });
      this.yaw = Math.atan2(ux, uz);
    }
    if (a === 'throw') this.throwN = [1, 3, 5][ph];
    this.emit(ev);
    if (mul === 1) this.say(a, 0.5);
  }
  doAttack() {
    const a = this.act;
    if (a === 'slam' || a === 'wave') this.setSt('slam', a);
    else if (a === 'throw') this.setSt('throw', a);
    else if (a === 'charge') { this.setSt('charge', a); this.emit({ k: 'charge', x0: this.lane.x0, z0: this.lane.z0, x1: this.lane.x1, z1: this.lane.z1, d: this.lane.d, w: this.lane.w }); }
    else if (a === 'summon') this.setSt('summon', a);
    else this.after();
  }
  after() { if (this.nAttacks % 3 === 0) this.tired(2.6); else { this.setSt('idle'); this.cool = [2.6, 2.0, 1.4][this.ph - 1] + Math.random() * 0.8; this.retargetT = 0; } }
  tired(t) { this.tiredT = t; this.setSt('tired'); this.say('tired', 0.6); this.emit({ k: 'tired', d: t }); }
  throwOne(spread) {
    const T = spread ? this.pickTarget() : (this.target || this.pickTarget()), r = this.c.rag;
    const hand = this.drawn(r.tip('lArmR', _v)), ph = this.ph - 1;
    const tx = T.x + (spread ? (Math.random() - 0.5) * 3.2 : 0), tz = T.z + (spread ? (Math.random() - 0.5) * 3.2 : 0);
    this.emit({ k: 'drop', x0: hand.x, y0: Math.max(1.5, hand.y), z0: hand.z, x: tx, z: tz, fl: [1.35, 1.2, 1.05][ph], r: [1.5, 1.6, 1.7][ph], it: this.def.proj });
  }
  summon() {
    const g = this.g, taken = g.mp && g.mp.takenChars ? g.mp.takenChars() : new Set();
    const pool = Object.keys(SQUAD).filter(s => !SQUAD[s].playerOnly && !/^p\d+$/.test(s) && s !== this.id && s !== 'aidanw' && !taken.has(s) && !g.cast.some(c => c.id === s));
    const n = Math.min(pool.length, this.ph >= 3 ? 3 : 2), B = this.A.box, ids = [];
    for (let i = 0; i < n; i++) {
      const sid = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      const a = this.yaw + (i - (n - 1) / 2) * 1.1, x = clamp(this.x + Math.sin(a) * 1.8, B[0] - 1, B[1] + 1), z = clamp(this.z + Math.cos(a) * 1.8, B[2] - 1, B[3] + 1);
      const c = new SquadMember(g.scene, g.room, g.physics, sid, [x, z, a], g.director);
      c.bossMinion = true; c.koMul = 1; c.active = false; c.state = 'act'; c.stateT = 0; c.life = 18; c.chatterEvery = 1e9;
      const T = this.pickTarget(); c.mpTarget = T.id ? (g.mp && g.mp.targets ? g.mp.targets().find(q => q.id === T.id) : null) || null : null;
      c.actUpdate = (dt, cx) => { c.setIdlePose(c.t); c.chaseTo(cx.head.x, cx.head.z, dt, 2.3, 0.35); };
      c.onEvent = (name) => { if (name === 'ko' || name === 'flung') this.minionDown(c); };
      g.cast.push(c); this.minions.push(c); ids.push(sid);
      Character.onBlink && Character.onBlink(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 0, z));
      setTimeout(() => { if (!c.disposed) c.say(['Coming, ' + this.def.name.charAt(0) + this.def.name.slice(1).toLowerCase() + '!', 'Sorry Ron! Orders!', 'I\'m just trying to help!'][i % 3], 5); }, 400 + i * 500);
    }
    this.emit({ k: 'summon', ids });
  }
  minionDown(c) {
    if (c.bossGone) return; c.bossGone = true; this.stats.minions++;
    this.numbers.show('KO!', '', c.headPos(_v).clone().add({ x: 0, y: 0.4, z: 0 }), '#7cff6a', 0.45);
    setTimeout(() => this.poof(c), 1300);
  }
  poof(c) {
    if (!c || c.disposed) return; const g = this.g, at = c.pos.clone();
    Character.onBlink && Character.onBlink(at, at);
    c.dispose(); const i = g.cast.indexOf(c); if (i >= 0) g.cast.splice(i, 1);
    this.minions = this.minions.filter(m => m !== c);
  }
  updateMinions(dt) {
    const g = this.g, P = g.player;
    // (host) they run out of steam after a while
    if (this.host) for (const c of this.minions.slice()) { if (c.disposed) continue; c.life -= dt; if (c.life <= 0 && !c.bossGone) { c.bossGone = true; this.poof(c); } }
    this.minionIds = this.host ? this.minions.filter(c => !c.disposed && !c.bossGone).map(c => c.id) : this.minionIds;
    // on every game: one reaching YOU knocks you down
    for (const [k, t] of this.mCool) { if (t - dt <= 0) this.mCool.delete(k); else this.mCool.set(k, t - dt); }
    for (const c of g.cast) {
      if (!this.minionIds.includes(c.id) || c.disposed || this.mCool.has(c.id)) continue;
      if (this.host && (c.down || c.bossGone)) continue;
      if (!this.host && c.netRag === 1) continue;
      const p = c.pos; if (Math.hypot(p.x - P.head.x, p.z - P.head.z) > 0.7 * Math.max(1, P.scale)) continue;
      this.mCool.set(c.id, 3);
      if (this.ouch('minion', p, 1)) { if (this.host) { c.say('Sorry Ron! Got to be done!', 5); setTimeout(() => this.poof(c), 900); c.bossGone = true; } else this.g.net.send({ t: 'bossP', mk: c.id }); }
    }
  }
  // what the boss says (and everyone hears)
  say(kind, chance = 1) { if (Math.random() > chance) return; const L = this.def.say[kind]; if (!L || !L.length) return; const s = L[Math.floor(Math.random() * L.length)]; this.emit({ k: 'say', s }); }

  // ---------------------------------------------------------------- what happens (host and everyone: the same moves on every game)
  emit(ev) { this.apply(ev, false); if (this.host && this.mpOn) { ev.t = 'bossA'; this.g.net.send(ev); } }
  apply(ev, remote) {
    const g = this.g, num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
    switch (ev.k) {
      case 'say': if (this.c && typeof ev.s === 'string') { this.c.say(ev.s.slice(0, 160), 5); this.sayText = ev.s.slice(0, 160); this.sayT = 3.6; } break;
      case 'land': {
        const at = new THREE.Vector3(num(ev.x, this.x), 0.1, num(ev.z, this.z));
        sfx('slam', at, 1); this.shake(0.12, 0.8);
        g.crumbs.burst(at, [0x8a7a5a, 0x6f8f45, 0xb8b0a0, 0x5a4a3a], 60, 4.5);
        this.wave(at.x, at.z, 0, 4.5, 'dust');
        break;
      }
      case 'tele': this.teleFx(ev); break;
      case 'slam': {
        const x = num(ev.x, this.x), z = num(ev.z, this.z), r = clamp(num(ev.r, 4), 0.5, 14), r0 = clamp(num(ev.r0, 0), 0, r - 0.3);
        sfx('slam', new THREE.Vector3(x, 0.2, z), 1); this.shake(0.1, 0.6);
        g.crumbs.burst(new THREE.Vector3(x, 0.2, z), [0x8a7a5a, 0x6f8f45, 0xb8b0a0, 0xffffff], 50, 4);
        this.clearTele();
        this.wave(x, z, r0, r, r0 > 0 ? 'donut' : 'out');
        for (const p of g.player.hands || []) p.pulse && p.pulse(0.8, 160);
        break;
      }
      case 'drop': this.projectile(ev); break;
      case 'charge': this.clearTele(); this.lane = { x0: num(ev.x0), z0: num(ev.z0), x1: num(ev.x1), z1: num(ev.z1), d: clamp(num(ev.d, 1), 0.2, 4), w: clamp(num(ev.w, 1.5), 0.3, 4), t0: this.t, hit: false };
        if (!this.host) { this.setSt('charge', 'charge'); } sfx('boss_charge', null, 0.8); break;
      case 'thud': sfx('boss_step', new THREE.Vector3(num(ev.x, this.x), 1, num(ev.z, this.z)), 1); this.shake(0.06, 0.4); break;
      case 'tired': this.clearTele(); g.hint && g.hint(`${this.def.name} IS OUT OF PUFF! HIT THE WEAK SPOT!`); break;
      case 'summon': if (Array.isArray(ev.ids)) { this.minionIds = ev.ids.filter(s => typeof s === 'string').slice(0, 4); sfx('boss_summon', null, 0.9); g.hint && g.hint('THROW FOOD AT THE LADS: ONE HIT KNOCKS THEM OUT'); } break;
      case 'hit': { if (!remote || ev.b === this.g.net.id) break; const at = new THREE.Vector3(num(ev.x, this.x), num(ev.y, 2), num(ev.z, this.z)); this.hitFx(num(ev.d), at, num(ev.w), false); break; }
      case 'blocked': if (remote && ev.b !== this.g.net.id) this.numbers.show('BLOCKED', '', new THREE.Vector3(num(ev.x, this.x), num(ev.y, 3), num(ev.z, this.z)), '#c9d3ff', 0.4); break;
      case 'stagger': sfx('boss_stagger', null, 0.6); this.clearTele(); break;
      case 'dead': if (!this.host) { this.setSt('dead'); this.clearTele(); } sfx('roar', null, 0.8); break;
      case 'phase': this.phaseFx(clamp(Math.round(num(ev.ph, 2)), 1, 3)); break;
      case 'win': this.finish(true); break;
      case 'lose': this.finish(false, ev.why); break;
    }
  }

  // ---------------------------------------------------------------- the warnings on the floor
  floorY(x, z) { const f = this.g.room.floorAt; return (f ? f(x, z) : 0) + 0.035; }
  teleFx(ev) {
    this.clearTele();
    const g = this.g, G = geos(), x = +ev.x || 0, z = +ev.z || 0, d = clamp(+ev.d || 1, 0.2, 4), grp = new THREE.Group(); grp.renderOrder = 3;
    const add = (geo, color, op, ro = 3) => { const m = new THREE.Mesh(geo, flatMat(color, op)); m.renderOrder = ro; m.frustumCulled = false; grp.add(m); return m; };
    const h = { kind: 'tele', a: ev.a, t: 0, d, grp, x, z }; this.teleT = d;
    if (ev.a === 'slam') { const r = clamp(+ev.r || 4, 0.5, 14); h.zone = add(G.disc, 0xff2020, 0.18); h.zone.scale.setScalar(r); h.edge = add(G.ring, 0xff3030, 0.85, 4); h.edge.scale.setScalar(r); h.fill = add(G.disc, 0xff6a00, 0.22, 4); h.fill.scale.setScalar(0.01); h.r = r;
      this.warn(`⚠ ${this.def.moves.slam}! GET OUT OF THE RED!`); sfx('boss_warn', null, 0.5); }
    else if (ev.a === 'wave') { const r = clamp(+ev.r || 10, 1, 14), r0 = clamp(+ev.r0 || 2.4, 0.5, r - 0.5); h.zone = add(G.thick, 0xff2020, 0.16); h.zone.scale.setScalar(r); h.safe = add(G.disc, 0x39ff14, 0.28, 4); h.safe.scale.setScalar(r0); h.edge = add(G.ring, 0x7cff6a, 0.95, 5); h.edge.scale.setScalar(r0); h.r = r; h.r0 = r0;
      this.warn(`⚠ ${this.def.moves.wave}! GET IN CLOSE: STAND IN THE GREEN!`, true); sfx('boss_warn', null, 0.5); }
    else if (ev.a === 'charge') { const x1 = +ev.x1 || x, z1 = +ev.z1 || z, len = Math.hypot(x1 - x, z1 - z), w = clamp(+ev.w || 1.5, 0.3, 4);
      h.zone = add(G.lane, 0xff2020, 0.22); h.zone.scale.set(w * 2, 1, len); h.zone.rotation.y = Math.atan2(x1 - x, z1 - z); h.fill = add(G.lane, 0xff7a00, 0.35, 4); h.fill.scale.set(w * 2, 1, 0.01); h.fill.rotation.y = h.zone.rotation.y; h.len = len;
      this.warn(`⚠ ${this.def.moves.charge}! GET OUT OF THE WAY!`); sfx('boss_warn', null, 0.5); }
    else if (ev.a === 'throw') this.warn(`⚠ ${this.def.moves.throw}! WATCH FOR THE TARGETS!`);
    else if (ev.a === 'summon') this.warn(`⚠ ${this.def.moves.summon}! KNOCK THEM OUT WITH FOOD!`);
    grp.position.set(x, this.floorY(x, z), z); g.scene.add(grp);
    this.hazards.push(h); this.teleH = h;
  }
  clearTele() { if (this.teleH) { this.teleH.done = true; this.teleH = null; } }
  warn(text, good = false) { this.warnText = text; this.warnGood = good; this.warnT = 2.4; }
  // a shockwave rolling out over the ground
  wave(x, z, r0, r, kind) {
    const G = geos(), grp = new THREE.Group(), m = new THREE.Mesh(G.thick, flatMat(kind === 'dust' ? 0xd8cbb0 : 0xffd27a, 0.85)); m.renderOrder = 4; m.frustumCulled = false; grp.add(m);
    const m2 = new THREE.Mesh(G.ring, flatMat(0xffffff, 0.9)); m2.renderOrder = 5; m2.frustumCulled = false; grp.add(m2);
    grp.position.set(x, this.floorY(x, z) + 0.02, z); this.g.scene.add(grp);
    this.hazards.push({ kind: 'wave', type: kind, t: 0, x, z, r0, r, grp, m, m2, hit: kind === 'dust', v: kind === 'dust' ? 9 : 14 });
  }
  projectile(ev) {
    const g = this.g, num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
    const from = new THREE.Vector3(num(ev.x0), clamp(num(ev.y0, 3), 0, 20), num(ev.z0)), to = new THREE.Vector3(num(ev.x), 0, num(ev.z)), f = clamp(num(ev.fl, 1.3), 0.4, 3), r = clamp(num(ev.r, 1.5), 0.3, 3);
    if (from.distanceTo(to) > 60) return;
    to.y = this.floorY(to.x, to.z);
    const type = FOODS[ev.it] ? ev.it : 'orange', obj = new Item(type).obj; obj.scale.setScalar(5.5); obj.traverse(o => { o.frustumCulled = false; }); g.scene.add(obj); obj.position.copy(from);
    const G = geos(), mk = new THREE.Group(), zone = new THREE.Mesh(G.disc, flatMat(0xff2020, 0.25)), edge = new THREE.Mesh(G.ring, flatMat(0xff3030, 0.9)), close = new THREE.Mesh(G.ring, flatMat(0xffffff, 0.9));
    for (const m of [zone, edge, close]) { m.renderOrder = 4; m.frustumCulled = false; mk.add(m); } zone.scale.setScalar(r); edge.scale.setScalar(r);
    mk.position.copy(to); g.scene.add(mk);
    const vy = (to.y - from.y + 0.5 * GRAV * f * f) / f;
    this.projs.push({ obj, type, mk, close, from, to, f, r, t: 0, vy, spin: new THREE.Vector3(Math.random() * 6, Math.random() * 6, 0) });
    sfx('boss_throw', from, 1);
  }
  updateHazards(dt) {
    const g = this.g, P = g.player, me = P.head;
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i]; h.t += dt;
      if (h.kind === 'tele') {
        const k = clamp(h.t / h.d, 0, 1), pulse = 0.5 + 0.5 * Math.sin(h.t * (8 + k * 14));
        if (h.zone) h.zone.material.opacity = (h.a === 'wave' ? 0.12 : 0.14) + pulse * 0.16;
        if (h.fill && h.a === 'slam') h.fill.scale.setScalar(Math.max(0.01, h.r * k));
        if (h.fill && h.a === 'charge') h.fill.scale.z = Math.max(0.01, h.len * k);
        if (h.a !== 'charge' && this.c) { h.grp.position.x = this.x; h.grp.position.z = this.z; }
        if (h.done || h.t > h.d + 1.5) { g.scene.remove(h.grp); this.hazards.splice(i, 1); }
        continue;
      }
      if (h.kind === 'wave') {
        const R = h.r0 + h.v * h.t, out = R > h.r + 0.6;
        h.grp.scale.setScalar(Math.max(0.01, Math.min(R, h.r + 0.3)));
        h.m.material.opacity = Math.max(0, 0.8 * (1 - (R - h.r0) / (h.r - h.r0 + 1)));
        h.m2.material.opacity = h.m.material.opacity;
        // does it reach you? (it's a wave along the ground: you're hit if it rolls over where you stand)
        if (!h.hit && !this.out) { const d = Math.hypot(me.x - h.x, me.z - h.z); if (d <= h.r && d >= h.r0 && d <= R && d >= R - 1.3) { h.hit = true; this.ouch('slam', new THREE.Vector3(h.x, 0, h.z), 1); } }
        if (out) { g.scene.remove(h.grp); this.hazards.splice(i, 1); }
      }
    }
    // charging: anyone in its way goes flying
    if (this.st === 'charge' && this.lane && !this.lane.hit && this.c) {
      const d = Math.hypot(me.x - this.x, me.z - this.z);
      if (d < this.lane.w * 0.65 + 0.35) { this.lane.hit = true; this.ouch('charge', new THREE.Vector3(this.x, 0, this.z), 1, 2.4); }
    }
    if (this.warnT > 0) this.warnT -= dt;
  }
  updateProjs(dt) {
    const g = this.g, P = g.player;
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i]; p.t += dt;
      const u = Math.min(p.t, p.f);
      p.obj.position.set(lerp(p.from.x, p.to.x, u / p.f), p.from.y + p.vy * u - 0.5 * GRAV * u * u, lerp(p.from.z, p.to.z, u / p.f));
      p.obj.rotation.x += p.spin.x * dt; p.obj.rotation.y += p.spin.y * dt;
      const k = clamp(p.t / p.f, 0, 1); p.close.scale.setScalar(Math.max(0.05, p.r * (1 - k) + 0.05)); p.mk.children[0].material.opacity = 0.18 + 0.2 * (0.5 + 0.5 * Math.sin(p.t * 20));
      if (p.t >= p.f && !p.landed) {
        p.landed = true; sfx('boss_food_land', p.to, 1); g.crumbs.burst(p.to.clone().setY(0.3), FOOD_COL[p.type] || [0xff8c1a, 0xffc04a, 0x6fbf3f], 40, 3);
        if (!this.out && Math.hypot(P.head.x - p.to.x, P.head.z - p.to.z) <= p.r) this.ouch('throw', p.to, 1);
      }
      if (p.t >= p.f + 0.25) { g.scene.remove(p.obj); g.scene.remove(p.mk); this.projs.splice(i, 1); }
    }
  }

  // ---------------------------------------------------------------- you getting hit
  ouch(kind, from, dmg = 1, lie = 1.6) {
    const g = this.g, P = g.player;
    if (this.over || this.iframe > 0 || this.out > 0 || P.knock || this.inIntro) return false;
    this.hearts = Math.max(0, this.hearts - dmg); this.iframe = IFRAMES; this.stats.kd++;
    P.dropAll(); P.knockDown({ x: P.head.x - from.x, z: P.head.z - from.z }, lie);
    g.G.fxTint = 0xff2020; g.G.fxTintT = 0.6; g.G.fxTintOp = 0.35;
    sfx('boss_hitme', null, 1);
    g.words.show(this.hearts > 0 ? `OOF! -${dmg} ❤` : 'KNOCKED OUT!', P.head.clone().addScaledVector(P.fwd, 0.7 * P.scale), '#ff5252', 0.12 * P.scale, 1.3);
    for (const h of P.hands || []) h.pulse && h.pulse(1, 220);
    if (Math.random() < 0.5) this.say('hitYou');
    if (this.hearts <= 0) this.knockedOut();
    this.tellHost();
    return true;
  }
  knockedOut() {
    const g = this.g, P = g.player;
    if (!this.mpOn) { if (this.host) this.lose('down'); return; }
    this.out = OUT_T; P.effect('frozen', OUT_T); P.effect('noEat', OUT_T); P.effect('dizzy', OUT_T, { amp: 0.6 });
    g.hint && g.hint(`KNOCKED OUT! BACK UP IN ${OUT_T}s (THE OTHERS CAN STILL WIN IT)`);
  }
  updateMe(dt) {
    const g = this.g, P = g.player;
    if (this.iframe > 0) this.iframe -= dt;
    if (this.out > 0) { this.out -= dt; g.G.fxTint = 0x400000; g.G.fxTintT = 0.2; g.G.fxTintOp = 0.35;
      if (this.out <= 0) { this.out = 0; this.hearts = 2; this.iframe = IFRAMES; g.words.show('BACK UP! ❤❤', P.head.clone().addScaledVector(P.fwd, 0.8), '#7cff6a', 0.12, 1.4); this.tellHost(); } }
    // grew a stage: you throw harder now
    if (g.G.stage !== this.lastStage) { if (g.G.stage > this.lastStage && !this.over) { g.words.show(`POWER x${this.power}!`, P.head.clone().addScaledVector(P.fwd, 0.9 * P.scale).add({ x: 0, y: -0.1, z: 0 }), '#ff9a1f', 0.11 * P.scale, 1.4); } this.lastStage = g.G.stage; }
  }
  tellHost() { if (!this.host && this.mpOn) this.g.net.send({ t: 'bossP', hp: this.hearts, out: this.out > 0 ? 1 : 0, kd: this.stats.kd }); }
  onAte() { if (this.over) return; this.stats.ateB = (this.stats.ateB || 0) + 1; }
  onFinished(it) {
    if (this.over || !it || it.def.veg) return; this.stats.ate++;
    if (this.hearts < MAX_HEARTS && this.out <= 0) { this.hearts++; this.stats.healed++; const P = this.g.player; this.g.words.show('+1 ❤', P.head.clone().addScaledVector(P.fwd, 0.75 * P.scale).add({ x: 0.12, y: 0.12, z: 0 }), '#ff6b9a', 0.11 * P.scale, 1.2); sfx('heart_up', null, 0.5); this.tellHost(); }
  }

  // ---------------------------------------------------------------- your food hitting the boss
  drawn(v) { return this.c ? this.c.rag.drawn(v) : v; }
  // where each part of the boss is drawn, and how big it is there
  boxes() {
    const r = this.c.rag, out = this._boxes || (this._boxes = r.list.map(() => ({ c: new THREE.Vector3(), r: 0, head: false, name: '' })));
    r.list.forEach((p, i) => { const b = out[i]; this.drawn(r.pos(p.name, b.c)); b.head = p.name === 'head'; b.r = p.radius * this.S * (b.head ? 1.3 : 1.08) + 0.06; b.name = p.name; });
    return out;
  }
  weakSpot(out) { const r = this.c.rag; this.drawn(r.pos('chest', out)); out.x += Math.sin(this.yaw) * 0.32 * this.S; out.z += Math.cos(this.yaw) * 0.32 * this.S; return out; }
  foodHits() {
    if (!this.c || !this.c.rag.list.length || this.st === 'none' || this.st === 'wait') return;
    const g = this.g; let B = null;
    for (const it of g.items.items) {
      if (it.dead || it.heldBy || it.resting || !it.thrownByPlayer || it.remoteOwner || it.bossHitT === this.fightN) continue;
      if (it.netMirror && !it.ownedHere) continue;
      if (it.vel.lengthSq() < 4) continue;
      if (Math.hypot(it.pos.x - this.x, it.pos.z - this.z) > 3 * this.S) continue;
      B = B || this.boxes();
      let best = null, bd = Infinity;
      for (const b of B) { const d = segDist(b.c, it.prev, it.pos) - b.r - it.radius; if (d < 0 && d < bd) { bd = d; best = b; } }
      if (!best) continue;
      it.bossHitT = this.fightN; it.thrownByPlayer = false;
      const at = it.pos.clone();
      let w = best.head ? 1 : 0;
      if (this.st === 'tired' && this.weakSpot(_v3).distanceTo(at) < 0.55 * this.S / 2.25 + it.radius) w = 2;
      else if (this.st === 'tired' && best.head) w = 2;
      const base = it.def.veg ? 6 : it.def.drink ? 18 : it.def.prop ? 12 : clamp(14 + (it.def.chonk || 10), 14, 50);
      const dmg = Math.round(Math.min(DMG_CAP, base * this.power * (w === 2 ? 3 : w === 1 ? 2 : this.st === 'tired' ? 1.5 : 1)));
      it.vel.set(-it.vel.x * 0.15, 1.5, -it.vel.z * 0.15); it.temp = true;
      g.crumbs.burst(at, FOOD_COL[it.type] || [0xffd400, 0xff8c1a, 0xffffff], 22, 2.2);
      this.stats.thrown++;
      if (this.host) this.damage(dmg, at, w, null);
      else { this.hitFx(this.shielded ? 0 : dmg, at, w, true); if (!this.shielded) { this.stats.dmg += dmg; this.stats.hits++; if (w) this.stats.crits++; } this.g.net.send({ t: 'bossHit', d: dmg, w, p: [r2(at.x), r2(at.y), r2(at.z)] }); }
    }
  }
  // (host) a hit counts
  damage(dmg, at, w, by) {
    if (this.over || this.hp <= 0) return;
    if (this.shielded) { this.emit({ k: 'blocked', x: r2(at.x), y: r2(at.y), z: r2(at.z), b: by || this.g.net.id || '' }); if (!by) this.numbers.show('BLOCKED', '', at, '#c9d3ff', 0.4); return; }
    dmg = clamp(Math.round(dmg), 1, DMG_CAP);
    this.hp = Math.max(0, this.hp - dmg);
    const ps = by ? this.players.get(by) : null, s = ps || this.stats; s.dmg = (s.dmg || 0) + dmg; s.hits = (s.hits || 0) + 1; if (w) s.crits = (s.crits || 0) + 1;
    if (!by) this.hitFx(dmg, at, w, true);
    if (this.mpOn) this.g.net.send({ t: 'bossA', k: 'hit', d: dmg, x: r2(at.x), y: r2(at.y), z: r2(at.z), w, b: by || this.g.net.id || '' });
    if (by) this.hitFx(dmg, at, w, false);
    if (Math.random() < 0.25) this.say(w === 1 ? 'head' : 'hurt');
    // staggered: enough damage quickly knocks them off their stride (and stops what they were winding up)
    this.stagger += dmg;
    if (this.hp <= 0) { this.die(); return; }
    const want = this.pct <= 1 / 3 ? 3 : this.pct <= 2 / 3 ? 2 : 1;
    if (want > this.ph) { this.ph = want; this.forceNext = want === 2 ? (Math.random() < 0.5 ? 'wave' : 'summon') : 'wave'; this.setSt('phase'); this.clearTele(); this.emit({ k: 'phase', ph: want }); this.say('phase' + want); this.stagger = 0; return; }
    if (this.stagger > 110 + this.ph * 30 && (this.st === 'idle' || this.st === 'tele')) { this.stagger = 0; this.setSt('stagger'); this.emit({ k: 'stagger' }); }
  }
  // the hit, as everyone sees it: a number, a flash, a flinch
  hitFx(dmg, at, w, mine) {
    if (!dmg) { this.numbers.show('BLOCKED', '', at, '#c9d3ff', 0.4); sfx('blocked', at, 0.6); return; }
    this.numbers.show('-' + dmg, w === 2 ? 'WEAK SPOT!' : w === 1 ? 'HEADSHOT!' : '', at, w === 2 ? '#ff4fd8' : w === 1 ? '#ff5a36' : mine ? '#ffd400' : '#ffffff', w ? 0.7 : 0.5);
    sfx('splat', at, 1); if (w) sfx('crit', at, 0.8);
    this.flashT = w ? 0.22 : 0.14; this.flashW = w;
    if (this.c) { const dir = _v.set(this.x - at.x, 0, this.z - at.z); this.c.flinch(dir, w ? 1 : 0.6); }
    this.hudHit = 0.2;
  }
  // (host) food a joining player threw hit the boss on their game
  onRemoteHit(m, p) {
    if (!this.host || !p || !p.id) return;
    const d = +m.d, w = m.w === 1 || m.w === 2 ? m.w : 0; if (!isFinite(d) || d <= 0) return;
    const now = performance.now(), ps = this.players.get(p.id) || this.newP(p);
    if (now - (ps.lastHit || 0) < 120) return; ps.lastHit = now;
    const at = Array.isArray(m.p) && m.p.length === 3 && m.p.every(n => typeof n === 'number' && isFinite(n) && Math.abs(n) < 1e4) ? new THREE.Vector3(...m.p) : new THREE.Vector3(this.x, 2.5, this.z);
    if (at.distanceTo(_v.set(this.x, at.y, this.z)) > 6 * this.S) return;      // (nowhere near it)
    this.damage(Math.min(d, DMG_CAP), at, w, p.id);
  }
  newP(p) { const ps = { name: p.name || 'Player', hp: MAX_HEARTS, out: 0, dmg: 0, hits: 0, crits: 0, kd: 0 }; this.players.set(p.id, ps); return ps; }
  onPlayer(m, p) {
    if (!this.host || !p || !p.id) return; const ps = this.players.get(p.id) || this.newP(p);
    if (typeof m.hp === 'number' && isFinite(m.hp)) ps.hp = clamp(Math.round(m.hp), 0, MAX_HEARTS);
    if (m.out !== undefined) ps.out = m.out ? 1 : 0; if (typeof m.kd === 'number' && isFinite(m.kd)) ps.kd = clamp(Math.round(m.kd), 0, 999);
    if (typeof m.mk === 'string') { const c = this.minions.find(q => q.id === m.mk); if (c && !c.bossGone) { c.bossGone = true; setTimeout(() => this.poof(c), 600); } }
  }
  die() {
    this.setSt('dead'); this.clearTele(); this.say('lose');
    for (const c of this.minions.slice()) this.poof(c);
    this.emit({ k: 'dead' });
  }
  lose(why) { if (this.over) return; this.setSt('win'); this.clearTele(); this.say('win'); this.emit({ k: 'lose', why }); }

  // ---------------------------------------------------------------- the end
  finish(won, why) {
    if (this.over) return;
    const g = this.g; this.over = won ? 'win' : 'lose'; this.overT = 0; this.clearTele();
    if (!this.host) this.setSt(won ? 'dead' : 'win');
    this.result = { won, why, time: this.t };
    const el = this.overEl, d = this.def;
    el.className = 'on ' + (won ? 'win' : 'lose');
    el.innerHTML = `<div class="bo-bg"></div><div class="bo-box"><img class="bo-face" src="${portrait(this.id)}" onerror="this.style.visibility='hidden'"><h1>${won ? 'BOSS DEFEATED!' : 'YOU GOT BATTERED'}</h1><h2>${esc(d.name)} · ${esc(d.title)}</h2><p>“${esc((won ? d.say.lose : d.say.win)[0])}”</p></div>`;
    sfx(won ? 'boss_win' : 'defeat', null, 1); if (won) setTimeout(() => sfx('cheer', null, 0.8), 400);
    if (won) for (let i = 0; i < 8; i++) setTimeout(() => { if (!this.c || this.disposed) return; const at = this.drawn(this.c.rag.pos('chest', new THREE.Vector3())); g.crumbs.burst(at.add({ x: (Math.random() - 0.5) * 3, y: 1 + Math.random() * 2, z: (Math.random() - 0.5) * 3 }), [0xffd400, 0xff4fa3, 0x39ff14, 0x3fa3ff, 0xffffff], 40, 3.5); }, i * 220);
    if (g.renderer.xr.isPresenting && g.fx) g.fx.showCard({ name: d.name, top: 'BOSS FIGHT · ' + d.name, title: won ? 'BOSS DEFEATED!' : 'YOU GOT BATTERED', sub: d.title, icon: won ? '🏆' : d.icon, color: won ? '#c08a00' : d.color });
    if (!won) for (const c of this.minions) if (!c.disposed) c.active = false;
  }
  updateOver(dt) {
    if (!this.over) return; this.overT += dt;
    if (this.overT > 4.6 && !this.ended) { this.ended = true; this.overEl.className = ''; if (this.g.fx) this.g.fx.hideCard(); if (this.host) this.g.director.end(); }
  }
  summary(teamRows = null) {
    const d = this.def, won = this.result ? this.result.won : this.hp <= 0, t = Math.round(this.result ? this.result.time : this.t), lines = [];
    lines.push(['MODE', 'BOSS FIGHT']);
    lines.push(['BOSS', `${d.name}`]);
    lines.push([`"${d.title}"`, '']);
    lines.push(['RESULT', won ? 'VICTORY!' : 'DEFEAT']);
    lines.push(['TIME', `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`]);
    if (!won) lines.push([`BOSS HEALTH LEFT`, `${Math.round(this.pct * 100)}%`]);
    const team = teamRows ? teamRows.length > 0 : this.mpOn && this.players.size > 0;
    lines.push([team ? 'YOUR DAMAGE' : 'DAMAGE DEALT', Math.round(this.stats.dmg)]);
    lines.push(['HITS · HEADSHOTS/WEAK SPOTS', `${this.stats.hits} · ${this.stats.crits}`]);
    lines.push(['TIMES KNOCKED DOWN', this.stats.kd]);
    lines.push(['FOOD EATEN', this.g.G.eaten]);
    if (this.stats.minions) lines.push(['LADS KNOCKED OUT', this.stats.minions]);
    if (teamRows) lines.push(...teamRows);
    else if (team) {
      const all = [[this.g.net.name || 'Host', this.stats.dmg], ...[...this.players.values()].map(p => [p.name, p.dmg || 0])].sort((a, b) => b[1] - a[1]);
      lines.push(['TEAM DAMAGE', Math.round(all.reduce((s, x) => s + x[1], 0))]);
      for (const [n, d] of all.slice(0, 6)) lines.push(['· ' + String(n).toUpperCase().slice(0, 16), Math.round(d)]);
      lines.push(['MVP: ' + String(all[0][0]).toUpperCase().slice(0, 14), Math.round(all[0][1])]);
    }
    lines.push([won ? `${d.name.charAt(0) + d.name.slice(1).toLowerCase()}: "${d.say.lose[0]}"` : `${d.name.charAt(0) + d.name.slice(1).toLowerCase()}: "${d.say.win[0]}"`, '']);
    lines.push([`NEXT UP: ${BOSSES[peekBoss()].name}`, '']);
    return lines;
  }

  // ---------------------------------------------------------------- phases
  phaseFx(ph) {
    const g = this.g, d = this.def;
    if (!this.host) { this.ph = ph; this.setSt('phase'); }
    this.clearTele(); this.S = this.S0 * (1 + 0.07 * (ph - 1));
    sfx('roar', null, 1); this.shake(0.08, 1.4);
    if (g.fx) g.fx.showCard({ name: d.name, top: `${d.name} · PHASE ${ph}`, title: `PHASE ${ph}: ${ph === 2 ? d.name + ' IS FUMING' : d.name + ' HAS LOST IT'}`, sub: ph === 2 ? 'NEW MOVES INCOMING!' : 'FASTER. BIGGER. ANGRIER.', icon: ph === 2 ? '😤' : '🤬', color: d.color });
    setTimeout(() => g.fx && g.fx.hideCard(), 2600);
    g.showBanner && !g.fx && g.showBanner('PHASE ' + ph, d.name + ' IS ANGRY');
  }

  // ---------------------------------------------------------------- multiplayer
  stateMsg() { return { t: 'bossS', ar: this.arena, b: this.id, hp: this.hp, mx: this.mx, ph: this.ph, st: this.st, a: this.act || '', at: r2(this.stT), x: r2(this.x), z: r2(this.z), y: r2(this.yaw), s: r2(this.S), dy: r2(this.dropY || 0), mi: this.minionIds, tm: r2(this.t), o: this.over ? (this.over === 'win' ? 1 : 2) : 0 }; }
  sendState(full) { if (!this.mpOn || !this.id) return; this.g.net.send(this.stateMsg()); }
  onState(m) {
    if (this.host) return;
    const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
    if (typeof m.b !== 'string' || !BOSSES[m.b]) return;
    this.stateAt = performance.now();
    if (typeof m.ar === 'string' && ARENAS[m.ar] && (PLACE_ARENAS[this.g.room.placeId] || []).includes(m.ar) && m.ar !== this.arena) { this.setArena(m.ar); this.arenaKnown = true; if (this.c) { this.c.dispose(); this.c = null; this.id = null; } }
    else if (typeof m.ar === 'string') this.arenaKnown = true;
    if (m.b !== this.id) { this.id = m.b; this.S0 = this.def.S; this.S = num(m.s, this.S0); this.makeChar(); this.x = num(m.x, this.A.home[0]); this.z = num(m.z, this.A.home[1]); if (m.st === 'drop' || m.st === 'roar') this.startIntro(); }
    this.mx = Math.max(1, num(m.mx, this.mx)); this.hp = clamp(num(m.hp, this.hp), 0, this.mx); this.ph = clamp(Math.round(num(m.ph, 1)), 1, 3);
    this.S = clamp(num(m.s, this.S), 0.5, 5); this.dropY = clamp(num(m.dy, 0), 0, 30);
    this.nx = num(m.x, this.x); this.nz = num(m.z, this.z); this.nyaw = num(m.y, this.yaw);
    if (typeof m.st === 'string' && m.st !== this.st && !(this.over && (m.st === 'dead' || m.st === 'win'))) { this.st = m.st; this.stT = clamp(num(m.at, 0), 0, 30); this.act = typeof m.a === 'string' ? m.a : null; }
    if (Array.isArray(m.mi)) this.minionIds = m.mi.filter(s => typeof s === 'string').slice(0, 4);
    if (typeof m.tm === 'number' && isFinite(m.tm)) this.hostT = m.tm;
  }
  follow(dt) {
    this.stT += dt;
    if (this.st === 'charge' && this.lane) { const L = this.lane, u = clamp((this.t - L.t0) / L.d, 0, 1); this.x = lerp(L.x0, L.x1, u); this.z = lerp(L.z0, L.z1, u); this.yaw = Math.atan2(L.x1 - L.x0, L.z1 - L.z0); this.moving = Math.hypot(L.x1 - L.x0, L.z1 - L.z0) / L.d; return; }
    if (this.nx === undefined) return;
    const k = Math.min(1, dt * 8), px = this.x, pz = this.z;
    this.x += (this.nx - this.x) * k; this.z += (this.nz - this.z) * k; this.yaw += wrap(this.nyaw - this.yaw) * k;
    this.moving = Math.hypot(this.x - px, this.z - pz) / Math.max(dt, 1e-3); if (this.moving < 0.3) this.moving = 0;
  }
  // the host's left and it's us now: carry on from exactly where it was
  becomeHost() { this.players.clear(); if (!this.id) { this.begin(nextBoss(new Set())); return; } if (this.st === 'wait' || this.st === 'none') this.setSt('idle'); this.cool = 2; this.lastAtk = null; }

  // ---------------------------------------------------------------- the body (host and everyone else alike)
  animate(dt) {
    const c = this.c, r = c.rag, S = this.S, st = this.st, k = this.stT;
    c.t += dt;
    if (c.speakT > 0) { c.speakT -= dt; if (c.speakT <= 0) c.bubble.visible = false; }
    if (r.mode !== 'anim' && r.mode !== 'blend') r.setMode('anim');
    for (const n in r.pose) r.pose[n].identity();
    r.bob = 0; r.root.set(this.x, 0, this.z); r.yaw = this.yaw;
    let lookPitch = 0.25, lookYaw = 0;
    const A = (n, x, y, z) => r.aim(n, x, y, z), lean = (a) => r.pose.chest.premultiply(_q.setFromAxisAngle(_X, a)), crouch = (h) => { A('uLegL', 0.08, -1, h * 1.4); A('lLegL', 0, -1, -h * 1.2); A('uLegR', -0.08, -1, h * 1.4); A('lLegR', 0, -1, -h * 1.2); r.bob = -0.32 * h * r.height / 1.68; };
    switch (st) {
      case 'none': case 'wait': c.setIdlePose(c.t); break;
      case 'drop': { const fall = this.dropY > 0.01; r.bob = (this.dropY || 0) / S;
        if (fall) { A('uArmL', 0.9, 0.6, -0.1); A('lArmL', 0.7, 0.9, 0); A('uArmR', -0.9, 0.6, -0.1); A('lArmR', -0.7, 0.9, 0); A('uLegL', 0.2, -1, 0.3); A('uLegR', -0.2, -1, -0.2); A('lLegL', 0, -1, -0.4); A('lLegR', 0, -1, -0.2); lookPitch = 0.5; }
        else { crouch(0.8); A('uArmL', 0.3, -0.6, 0.6); A('uArmR', -0.3, -0.6, 0.6); A('lArmL', 0.1, -1, 0.1); A('lArmR', -0.1, -1, 0.1); lean(0.4); } break; }
      case 'roar': case 'phase': {
        const kneel = st === 'phase' && k < 1.2, u = st === 'phase' ? clamp((k - 1.2) / 0.4, 0, 1) : clamp(k / 0.35, 0, 1), tr = Math.sin(this.t * 40) * 0.025 * u;
        if (kneel) { A('uLegL', 0.05, -0.2, 1); A('lLegL', 0, -1, 0.05); A('uLegR', -0.05, -1, -0.3); A('lLegR', 0, -0.2, -1); r.bob = -0.42 * r.height / 1.68; lean(0.55); A('uArmL', 0.3, -0.8, 0.5); A('uArmR', -0.3, -0.8, 0.5); A('lArmL', 0, -1, 0.3); A('lArmR', 0, -1, 0.3); lookPitch = 0.6; break; }
        A('uArmL', 1, 0.35 * u - 0.25, 0.2); A('lArmL', 0.7, 0.8, 0.25 + tr); A('uArmR', -1, 0.35 * u - 0.25, 0.2); A('lArmR', -0.7, 0.8, 0.25 - tr); lean(-0.24 * u + tr); crouch(0.25);
        lookPitch = -0.45 * u; break; }
      case 'idle': case 'tele': case 'slam': case 'throw': case 'summon': case 'win': {
        if (this.moving > 0.05 && st === 'idle') c.walkPose(dt, this.moving / S); else { c.setIdlePose(c.t); c.personalityPose && c.personalityPose(c.t); }
        lean(0.06);
        if (st === 'tele') { const td = this.teleT || (TELE[this.act] ? TELE[this.act][this.ph - 1] : 1); this.telePose(A, lean, crouch, clamp(k / Math.max(0.2, td), 0, 1)); }
        if (st === 'slam') { const u = clamp(k / 0.32, 0, 1);
          if (this.act === 'wave' || this.id === 'lewis') { r.bob = Math.sin(u * Math.PI) * 0.5 * (1 - u) + (u >= 1 ? -0.12 : 0); }
          A('uArmL', 0.5, 0.7 - u * 1.4, 0.35 + u * 0.7); A('lArmL', 0.25, 0.9 - u * 1.6, 0.3 + u * 0.6); A('uArmR', -0.5, 0.7 - u * 1.4, 0.35 + u * 0.7); A('lArmR', -0.25, 0.9 - u * 1.6, 0.3 + u * 0.6);
          lean(-0.3 + u * 0.9); crouch(0.2 + u * 0.6); lookPitch = 0.6; }
        if (st === 'throw') { const ph2 = (k % 0.42) / 0.42; if (ph2 < 0.5) { A('uArmR', -0.3, 0.7, -0.6); A('lArmR', -0.1, 0.75, -0.8); r.pose.chest.premultiply(_q.setFromAxisAngle(_Y, 0.4)); } else { A('uArmR', 0.1, -0.3, 1); A('lArmR', 0.2, -0.6, 1); r.pose.chest.premultiply(_q.setFromAxisAngle(_Y, -0.35)); lean(0.3); } A('uArmL', 0.3, 0, 1); A('lArmL', 0.1, 0.1, 1); }
        if (st === 'summon') { const w = Math.sin(this.t * 12); A('uArmL', 0.5, 1, 0.1); A('lArmL', 0.4 + w * 0.3, 1, 0); A('uArmR', -0.4, -0.2, 0.9); A('lArmR', 0.6, 0.6, 0.2); lookPitch = -0.1; }
        if (st === 'win') { const s = Math.sin(this.t * 6); A('uArmL', 1, 0.25, 0); A('lArmL', 0.1, 1, 0.1); A('uArmR', -1, 0.25, 0); A('lArmR', -0.1, 1, 0.1); r.bob = Math.abs(s) * 0.05; r.yaw += s * 0.15; lookPitch = -0.2; }
        break; }
      case 'charge': { c.walkPose(dt, Math.max(2.5, (this.moving || 8) / S)); lean(0.55); A('uArmL', 0.35, -0.3, 0.9); A('uArmR', -0.35, -0.3, 0.9); A('lArmL', 0.1, 0.2, 1); A('lArmR', -0.1, 0.2, 1); lookPitch = -0.35; break; }
      case 'tired': { const br = Math.sin(this.t * 7) * 0.05; crouch(0.45); lean(0.75 + br); A('uArmL', 0.25, -0.8, 0.55); A('lArmL', 0.05, -1, 0.15); A('uArmR', -0.25, -0.8, 0.55); A('lArmR', -0.05, -1, 0.15); lookPitch = -0.5; break; }
      case 'stagger': { const s = Math.sin(this.t * 13); lean(-0.45); A('uArmL', 0.9, 0.3 + s * 0.4, -0.3); A('lArmL', 0.6, 0.8, 0); A('uArmR', -0.9, 0.3 - s * 0.4, -0.3); A('lArmR', -0.6, 0.8, 0); A('uLegL', 0.1, -1, -0.25); A('uLegR', -0.1, -1, 0.15); lookPitch = -0.5;
        if (this.host) { this.x -= Math.sin(this.yaw) * 0.8 * dt; this.z -= Math.cos(this.yaw) * 0.8 * dt; } break; }
      case 'dead': {
        const u = ease(k / 1.6), kH = r.height / 1.68;
        A('uArmL', 0.75, 0.66, 0.05); A('lArmL', 0.55, 0.83, 0.05); A('uArmR', -0.82, -0.57, 0.05); A('lArmR', -0.62, -0.78, 0.05); A('uLegL', 0.3, -0.95, 0.02); A('uLegR', -0.2, -0.97, 0.02); A('lLegL', 0.35, -0.94, 0.02); A('lLegR', -0.3, -0.95, 0.05);
        _q.setFromAxisAngle(_X, -Math.PI / 2 * u); for (const n in r.pose) r.pose[n].premultiply(_q);
        r.bob = -0.8 * kH * u; lookPitch = 0;
        if (k > 1.5 && !this.did.thud) { this.did.thud = true; sfx('slam', new THREE.Vector3(this.x, 0, this.z), 1); this.shake(0.1, 0.7); this.g.crumbs.burst(new THREE.Vector3(this.x, 0.2, this.z), [0x8a7a5a, 0xb8b0a0, 0xffffff], 60, 4); }
        break; }
    }
    // head: looking down at whoever it's after
    if (st !== 'dead') r.pose.head.premultiply(_q.setFromAxisAngle(_X, lookPitch)).premultiply(_q.setFromAxisAngle(_Y, lookYaw));
    c.applyFlinch && c.applyFlinch(dt);
    r.bulk = { w: S, h: S };
    r.animate(dt); r.sync();
    if (this.host && st !== 'drop') { this.x = r.root.x; this.z = r.root.z; }      // (where it really ended up: round the furniture)
    if (dt > 0) { const k = Math.min(1, dt * 6); this.vx = lerp(this.vx || 0, (this.x - (this.px ?? this.x)) / dt, k); this.vz = lerp(this.vz || 0, (this.z - (this.pz ?? this.z)) / dt, k); this.px = this.x; this.pz = this.z; }
    if (c.updateEyes) c.updateEyes(dt, this.g.player.head);
    // a sunny place: its shadow on from the moment its model's in (as the place does for everyone, a second later), so the
    // shadow's shader is built in the warm-up that follows the model loading, not the moment it first falls into the sun
    if (!this.shadSet && r.mesh && this.g.room.shadows) { this.shadSet = true; r.group.traverse(o => { if ((o.isSkinnedMesh || (o.isMesh && o.parent && o.parent.isBone)) && !o.userData.shad) { o.castShadow = true; o.userData.shad = true; } }); window.__onModelReady && window.__onModelReady(); }
    // the bits that go with the body, drawn where the body's drawn
    const head = this.drawn(r.pos('head', _v2));
    if (c.fx) { c.fx.position.set(this.x, 0, this.z); c.fx.scale.setScalar(S * 1.2); }
    c.bubble.userData.head.copy(head).add({ x: 0, y: 0.25 * S, z: 0 }); c.bubble.position.copy(c.bubble.userData.head);
    if (this.g.player.flatMode && !this.g.renderer.xr.isPresenting) c.bubble.visible = false;      // (on a screen its lines are subtitles under the health bar: a bubble up there sat behind it)
    if (c.stars) { const on = st === 'tired' || st === 'stagger'; c.stars.forEach((s, i) => { s.visible = on; if (!on) return; const a = this.t * 5 + i * Math.PI * 2 / 3; s.position.set(head.x + Math.cos(a) * 0.2 * S, head.y + 0.2 * S, head.z + Math.sin(a) * 0.2 * S); s.scale.setScalar(0.09 * S); }); }
    // hit flash, angry red as it goes
    const m = this.mat();
    if (m) {
      this.flashT = Math.max(0, (this.flashT || 0) - dt);
      const angry = (this.ph - 1) / 2, f = this.flashT > 0 ? 1 : 0;
      m.emissive.copy(this.baseCol.e); if (f) m.emissive.setRGB(this.flashW === 2 ? 0.9 : 0.85, this.flashW === 2 ? 0.2 : this.flashW === 1 ? 0.25 : 0.85, this.flashW === 2 ? 0.9 : this.flashW === 1 ? 0.15 : 0.85);
      m.color.copy(this.baseCol.c).lerp(_c3.setRGB(1, 0.62, 0.6), angry * 0.6);
    }
    // the weak spot (out of puff)
    if (!this.weak) { this.weak = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, depthTest: false })); this.weak.renderOrder = 13; this.weak.visible = false; this.g.scene.add(this.weak); }
    this.weak.visible = st === 'tired';
    if (this.weak.visible) { this.weakSpot(this.weak.position); this.weak.scale.setScalar((0.55 + Math.sin(this.t * 10) * 0.08) * S / 2.25); this.weak.material.rotation += dt * 2; }
  }
  telePose(A, lean, crouch, u) {
    const a = this.act, r = this.c.rag, t = this.t;
    if (a === 'slam' || a === 'wave') { A('uArmL', 0.55, 0.7, 0.35); A('lArmL', 0.25, 0.9, 0.3); A('uArmR', -0.55, 0.7, 0.35); A('lArmR', -0.25, 0.9, 0.3); lean(-0.2 * u); crouch(0.15 + 0.35 * u); r.bob += Math.sin(t * 30) * 0.01 * u; }
    else if (a === 'throw') { A('uArmR', -0.3, 0.7, -0.7 * u); A('lArmR', -0.1, 0.75, -0.85 * u); A('uArmL', 0.25, 0.05, 1); A('lArmL', 0.1, 0.1, 1); r.pose.chest.premultiply(_q.setFromAxisAngle(_Y, 0.45 * u)); }
    else if (a === 'charge') { crouch(0.55); lean(0.75 * u); A('uArmL', 0.3, -0.5, 0.8); A('uArmR', -0.3, -0.5, 0.8); A('lArmL', 0, -0.4, 1); A('lArmR', 0, -0.4, 1); A('uLegR', -0.08, -1, -0.5 + Math.sin(t * 14) * 0.25 * u); }
    else if (a === 'summon') { A('uArmR', -0.3, 0.3, 0.9); A('lArmR', 0.5, 0.8, 0.2); A('uArmL', 0.6, 0.9, 0.1); A('lArmL', 0.2, 1, 0); }
  }
  shake(a, t) { this.shakeA = Math.max(this.shakeA && this.shakeT > 0 ? this.shakeA : 0, a); this.shakeT = Math.max(this.shakeT || 0, t); }

  // ---------------------------------------------------------------- food: there's always some about
  ammo(dt) {
    if ((this.ammoT = (this.ammoT || 0) - dt) > 0 || this.over) return; this.ammoT = 0.6;
    const g = this.g, R = this.A.play, mine = g.items.items.filter(it => !it.dead && it.bossAmmo);
    const near = g.items.items.filter(it => !it.dead && !it.heldBy && !it.def.veg && !it.def.prop && it.pos.x > R[0] && it.pos.x < R[1] && it.pos.z > R[2] && it.pos.z < R[3]).length;
    if (near >= 10 + this.playerCount * 2 || mine.length > 40) return;
    const nav = g.room.nav, P = g.player;
    for (let tries = 0; tries < 12; tries++) {
      // near a player (somebody always has food within a few steps), not on top of the boss
      const tg = this.targets(), T = tg[Math.floor(Math.random() * tg.length)] || { x: P.head.x, z: P.head.z };
      const a = Math.random() * Math.PI * 2, d = 1.2 + Math.random() * 3.5, x = clamp(T.x + Math.cos(a) * d, R[0], R[1]), z = clamp(T.z + Math.sin(a) * d, R[2], R[3]);
      if (nav) { const k = nav.idx(x, z); if (k < 0 || !nav.free[k]) continue; }
      if (Math.hypot(x - this.x, z - this.z) < 2.2) continue;
      const it = g.items.spawn(Math.random() < 0.18 ? 'can' : pickJunk(), new THREE.Vector3(x, 3.2, z), new THREE.Vector3(0, -1, 0));
      it.bossAmmo = true; it.setSize(BOSS_FOOD); it.spawnScale = 1; it.obj.scale.setScalar(1);
      return;
    }
  }

  // ---------------------------------------------------------------- aiming help
  // VR swing or the THROW button: if it's roughly at the boss, it goes at the bit you were aiming for
  assist(it, h) {
    if (!it || !it.thrownByPlayer || !this.c || this.over || it.dead) return;
    const v = it.vel, sp = v.length(); if (sp < 2) return;
    const dir = _v.copy(v).normalize(), B = this.boxes(); let best = null, ba = 0.3;
    for (const b of B) { const to = _v2.subVectors(b.c, it.pos), l = to.length(); if (l < 0.5 || l > 25) continue; const ang = Math.acos(clamp(to.dot(dir) / l, -1, 1)) - Math.atan(b.r / l); if (ang < ba) { ba = ang; best = b; } }
    if (!best) return;
    this.aimAt(it, best.c, Math.max(sp, 9), true);
  }
  aimAt(it, target, speed = 11, lead = false) {
    if (lead && this.vx !== undefined) { const t0 = clamp(Math.hypot(target.x - it.pos.x, target.z - it.pos.z) / speed, 0.18, 1.6); target = _v2.copy(target); target.x += clamp(this.vx, -12, 12) * t0; target.z += clamp(this.vz, -12, 12) * t0; }      // (where it'll be when the food gets there)
    const d = _v3.subVectors(target, it.pos), flat = Math.hypot(d.x, d.z), t = clamp(flat / speed, 0.18, 1.6);
    let vy = (d.y + 0.5 * GRAV * t * t) / t;
    const ceil = this.g.room.bounds.y1 - 0.2, apex = it.pos.y + (vy > 0 ? vy * vy / (2 * GRAV) : 0);
    if (apex > ceil && vy > 0) vy = Math.sqrt(Math.max(0, 2 * GRAV * (ceil - it.pos.y)));
    it.vel.set(d.x / t, vy, d.z / t); it.thrownByPlayer = true;
  }
  // phones: tap the boss while holding food and it's thrown at where you tapped
  // A PUNCH (tap them up close on a phone; swing a hand into them in VR): a small hit, every 0.35s at most. Thrown food
  // does three to ten times as much, so it's for when you've nothing to throw
  punch(at, w = 0, dir = null) {
    if (!this.c || this.over || this.st === 'none' || this.st === 'wait') return false;
    const now = performance.now(); if (now - (this.punchAt || 0) < 350) return false; this.punchAt = now;
    const dmg = Math.round(clamp((w ? 8 : 5) * this.power * (this.st === 'tired' ? 1.5 : 1), 3, 30));
    sfx('punch', at, 1); this.g.crumbs && this.g.crumbs.burst(at, [0xffffff, 0xffd400], 8, 1.4); this.g.words && this.g.words.show(['POW!', 'BIFF!', 'WHACK!'][Math.floor(Math.random() * 3)], at.clone().add({ x: 0, y: 0.25, z: 0 }), '#ff5a36', 0.22, 0.8);
    this.g.net && this.g.net.connected && this.g.mp && this.g.mp.swing && this.g.mp.swing('R');
    if (this.host) this.damage(dmg, at, w, null);
    else { this.hitFx(this.shielded ? 0 : dmg, at, w, true); if (!this.shielded) { this.stats.dmg += dmg; this.stats.hits++; } this.g.net.send({ t: 'bossHit', d: dmg, w, p: [r2(at.x), r2(at.y), r2(at.z)] }); }
    return true;
  }
  // (VR) a hand swung into the boss
  handPunches() {
    const P = this.g.player; if (!this.c || !P.hands) return; let B = null;
    for (const h of P.hands) { if (!h.tracked || h.held || h.speed < 1.6) continue; B = B || this.boxes();
      for (const b of B) if (b.c.distanceTo(h.palm) < b.r + 0.05) { if (this.punch(h.palm.clone(), b.head ? 1 : 0)) h.pulse && h.pulse(1, 80); break; } }
  }
  tap(ray) {
    if (!this.c || this.over || !this.c.rag.list.length) return false;
    const B = this.boxes(); let best = null, bd = Infinity;
    for (const b of B) { const along = _v.subVectors(b.c, ray.origin).dot(ray.direction); if (along > 0 && along < bd && ray.distanceSqToPoint(b.c) < b.r * b.r * 1.3) { bd = along; best = b; } }
    if (!best) return false;
    const P = this.g.player, f = P.flatHolder, it = f && f.held;
    const at = ray.at(bd, new THREE.Vector3()); at.lerp(best.c, 0.5);
    // nothing in your hand: punch them (close enough to reach), for a little damage. Thrown food's the real weapon
    if (!it) { const reach = 1.7 * Math.max(1, P.scale || 1) + best.r + 0.3; if (Math.hypot(P.head.x - best.c.x, P.head.z - best.c.z) > reach) {      // (along the ground to them: they're a giant, so their chest is way up above you)
 this.g.hint && this.g.hint('Get closer to punch ' + this.def.name + ', or grab some food and throw it'); return true; }
      this.punch(at, best.head ? 1 : 0, P.fwd); return true; }
    P.flatThrow(9);
    if (!it.dead) this.aimAt(it, at, 12, true);
    return true;
  }
  // (tests and the developer bench) throw what you're holding at a bit of the boss
  throwHeldAt(part = 'head') {
    const P = this.g.player, f = P.flatHolder, it = f && f.held; if (!it || !this.c) return false;
    const at = this.drawn(this.c.rag.pos(part, new THREE.Vector3()));
    P.flatThrow(9); if (!it.dead) this.aimAt(it, at, 12, true); return true;
  }

  // ---------------------------------------------------------------- the start: where everyone stands, the entrance
  placePlayer() {
    const P = this.g.player, net = this.g.net, s = this.A.start;
    const ids = [net.id, ...net.players.keys()].filter(Boolean).sort(), i = net.connected ? Math.max(0, ids.indexOf(net.id)) : 0;
    const off = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.9;
    P.flatDrop && P.flatDrop(); for (const h of P.hands) if (h.held) { h.held.heldBy = null; h.held = null; }
    P.rig.position.set(s[0] + off, 0, s[1]); P.rig.rotation.y = s[2];
    if (P.flatMode) { P.flatYaw = 0; P.flatPitch = 0.12; }
    P.resetHandHistory && P.resetHandHistory();
    const [hx, hz] = this.A.home; P.faceToward && P.faceToward(hx, hz, 0.3);
  }
  startIntro() {
    const g = this.g, P = g.player, d = this.def;
    this.inIntro = true; this.introT = 0;
    P.effect('frozen', 6.2); P.effect('noEat', 6.2);
    const flat = P.flatMode && !g.renderer.xr.isPresenting;
    this.cine = flat ? { t: 0 } : null;
    if (flat) {
      const el = this.introEl; el.style.setProperty('--bc', d.color);
      el.innerHTML = `<div class="bi-bar t"></div><div class="bi-bar b"></div><div class="bi-q">“${esc(d.say.intro[0])}”</div><div class="bi-plate"><img src="${portrait(this.id)}" onerror="this.style.visibility='hidden'"><div><div class="bi-k">⚠ BOSS FIGHT ⚠</div><div class="bi-n">${esc(d.name)}</div><div class="bi-t">${esc(d.title)}</div></div></div>`;
      el.className = 'on'; void el.offsetWidth; el.classList.add('bars'); document.body.classList.add('boss-cine');
      if (P.flatGrip) { this.hidGrip = P.flatGrip.visible; P.flatGrip.visible = false; }
      if (P.wrist) { this.hidWrist = P.wrist.visible; P.wrist.visible = false; }
    }
    sfx('rumble', null, 1);
  }
  updateIntro(dt) {
    if (!this.inIntro) return;
    const g = this.g, P = g.player, d = this.def; this.introT += dt;
    const t = this.introT;
    if (t > 2.1 && !this.platedOn) { this.platedOn = true; if (this.introEl.classList.contains('on')) this.introEl.classList.add('plate'); else if (g.fx) g.fx.showCard({ name: d.name, top: '⚠ BOSS FIGHT ⚠', title: d.name + ': ' + d.title, sub: d.tag.toUpperCase(), icon: d.icon, color: d.color }); sfx('roar', null, 1); }
    if (t > 5.6 && !this.introOff) { this.introOff = true; this.introEl.classList.remove('plate', 'bars'); if (g.fx) g.fx.hideCard(); }
    if (t > 6.2) {
      this.inIntro = false; this.cine = null; this.introEl.className = ''; document.body.classList.remove('boss-cine');
      if (P.flatGrip && this.hidGrip !== undefined) P.flatGrip.visible = this.hidGrip; if (P.wrist && this.hidWrist !== undefined) P.wrist.visible = this.hidWrist;
      g.hint && g.hint(P.flatMode ? `Grab food, then TAP ${d.name} (or aim and press THROW). Aim for the head!` : `Grab food and throw it at ${d.name}. Aim for the head!`);
      g.words.show('FIGHT!', P.head.clone().addScaledVector(P.fwd, 1.4 * P.scale).add({ x: 0, y: -0.25 * P.scale, z: 0 }), '#ffd400', 0.13 * P.scale, 1.2);
      sfx('fight_bell', null, 1);
    }
    if (this.cine) this.cine.t = t;
  }
  // the film's camera (phone / computer): main.js draws through it while the entrance plays
  cineCam() {
    const ci = this.cine; if (!ci || !this.c) return null;
    const g = this.g, cam = this.cam || (this.cam = new THREE.PerspectiveCamera(60, 1, 0.05, 200)), t = ci.t, S = this.S;
    cam.aspect = g.camera.aspect; cam.fov = g.camera.fov + 6; cam.updateProjectionMatrix();
    const eye = g.camera.getWorldPosition(_v), bx = this.x, bz = this.z, fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const head = this.drawn(this.c.rag.pos('head', _v2)).clone();
    if (t < 2.2) {      // the sky: here it comes
      const k = ease(t / 2.0); cam.position.set(lerp(eye.x, bx + fx * 9, 0.25), 1.0, lerp(eye.z, bz + fz * 9, 0.25));
      cam.lookAt(bx, Math.max(head.y * 0.55, ((this.dropY || 0) + 1.6 * S) * (1 - k * 0.5)), bz);
    } else if (t < 5.0) {      // up close: low, looking up at the face, pushing in
      const k = ease((t - 2.2) / 2.8), dd = lerp(3.6, 2.6, k) * S / 2.25, side = lerp(0.9, 0.4, k);
      cam.position.set(bx + fx * dd + fz * side, 0.9 + k * 0.5, bz + fz * dd - fx * side);
      cam.lookAt(head.x, head.y - 0.1 * S, head.z);
    } else {      // back to your own eyes
      const k = ease((t - 5.0) / 1.0), from = new THREE.Vector3(bx + fx * 2.6 * S / 2.25 + fz * 0.4, 1.4, bz + fz * 2.6 * S / 2.25 - fx * 0.4);
      cam.position.copy(from).lerp(eye, k);
      const look = head.clone().lerp(eye.clone().add(g.player.fwd.clone().multiplyScalar(5)), k); cam.lookAt(look);
    }
    if (this.shakeT > 0) { cam.position.x += (Math.random() - 0.5) * this.shakeA * 1.5; cam.position.y += (Math.random() - 0.5) * this.shakeA * 1.5; }
    return cam;
  }

  // ---------------------------------------------------------------- the health bar
  buildHud() {
    const mk = (id) => { let el = document.getElementById(id); if (!el) { el = document.createElement('div'); el.id = id; document.body.appendChild(el); } el.className = ''; return el; };
    this.hudEl = mk('boss-hud'); this.introEl = mk('boss-intro'); this.overEl = mk('boss-over');
    this.hudEl.innerHTML = '<div class="bh-top"><img class="bh-face" alt=""><div style="min-width:0"><div class="bh-name"></div><div class="bh-title"></div></div><div class="bh-ph"></div></div><div class="bh-bar"><i class="bh-trail"></i><i class="bh-fill"></i><b style="left:33.3%"></b><b style="left:66.6%"></b><span class="bh-hp"></span></div><div class="bh-me"><span class="bh-st"><small>YOUR HEALTH</small><span class="bh-hearts"></span></span><span class="bh-st"><small>YOUR POWER</small><span class="bh-pow"></span></span></div><div class="bh-warn"></div><div class="bh-say"></div>';
    const q = (s) => this.hudEl.querySelector(s);
    this.ui = { face: q('.bh-face'), name: q('.bh-name'), title: q('.bh-title'), ph: q('.bh-ph'), fill: q('.bh-fill'), trail: q('.bh-trail'), hp: q('.bh-hp'), hearts: q('.bh-hearts'), pow: q('.bh-pow'), warn: q('.bh-warn'), say: q('.bh-say') };
    // in the headset: a bar over its head
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    this.bar3 = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); this.bar3.renderOrder = 12; this.bar3.visible = false; this.bar3.userData = { cv, tex }; this.g.scene.add(this.bar3);
  }
  drawHud(dt) {
    const g = this.g, d = this.def, ui = this.ui, xr = g.renderer.xr.isPresenting;
    this.hudEl.classList.toggle('on', !!this.id && !this.inIntro && !this.ended);
    if (!this.id) return;
    if (this.sayT > 0) this.sayT -= dt;
    const key = [this.id, this.hp, this.mx, this.ph, this.hearts, this.power, this.out > 0 ? Math.ceil(this.out) : 0, this.shielded, this.warnT > 0 ? this.warnText : '', this.sayT > 0 ? this.sayText : ''].join('|');
    if (this.hudHit > 0) { this.hudHit -= dt; if (!this.hudEl.classList.contains('hit')) this.hudEl.classList.add('hit'); } else this.hudEl.classList.remove('hit');
    if (key !== this.hudKey) {
      this.hudKey = key; const pct = this.pct * 100;
      if (ui.face.dataset.id !== this.id) { ui.face.dataset.id = this.id; ui.face.src = portrait(this.id); this.hudEl.style.setProperty('--bc', d.color); }
      ui.name.textContent = d.name; ui.title.textContent = d.title; ui.ph.textContent = this.shielded && this.st === 'phase' ? '🛡 PHASE ' + this.ph : 'PHASE ' + this.ph;
      ui.fill.style.width = pct.toFixed(1) + '%'; ui.trail.style.width = pct.toFixed(1) + '%'; ui.hp.textContent = `${Math.ceil(this.hp)} / ${this.mx}`;
      this.hudEl.classList.toggle('ph2', this.ph === 2); this.hudEl.classList.toggle('ph3', this.ph === 3); this.hudEl.classList.toggle('low', pct < 15 && pct > 0); this.hudEl.classList.toggle('shield', this.shielded);
      ui.hearts.textContent = this.out > 0 ? `💫 OUT · ${Math.ceil(this.out)}s` : '❤️'.repeat(this.hearts) + '🖤'.repeat(MAX_HEARTS - this.hearts);
      ui.pow.textContent = `💪 x${this.power.toFixed(1)}`;      // (the label over it says YOUR POWER)
      const on = this.warnT > 0 && this.warnText; ui.warn.classList.toggle('on', !!on); ui.warn.classList.toggle('good', !!this.warnGood); if (on) ui.warn.textContent = this.warnText;
      const sy = this.sayT > 0 && this.sayText; ui.say.classList.toggle('on', !!sy); if (sy) ui.say.innerHTML = `<b>${esc(d.name)}</b>“${esc(this.sayText)}”`;
      this.drawBar3();
    }
    // portrait phones: under the Eat Meter box in the corner (it takes the top of the screen)
    this.placeHud();
    // the headset's bar: over its head
    this.bar3.visible = !!(xr && this.c && !this.over && !this.inIntro);
    if (this.bar3.visible) { const h = this.drawn(this.c.rag.pos('head', _v)); this.bar3.position.set(h.x, h.y + 0.55 * this.S, h.z); this.bar3.scale.set(2.6, 0.65, 1); }
  }
  placeHud() {
    const cam = this.g.camera, asp = cam.aspect, key = asp.toFixed(3) + ':' + cam.fov.toFixed(1) + ':' + innerHeight;
    if (key === this.hudPlace) return; this.hudPlace = key;
    if (asp >= 1) { this.hudEl.style.top = ''; return; }
    const hh = 0.3 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), hw = hh * asp, sc = Math.min(1.25, hw * 1.12 / 0.1);
    const below = (0.075 * sc + 0.024) / (2 * hh) * innerHeight;
    this.hudEl.style.top = Math.round(below + 6) + 'px';
  }
  drawBar3() {
    const { cv, tex } = this.bar3.userData, g = cv.getContext('2d'), d = this.def, w = 512;
    g.clearRect(0, 0, w, 128);
    g.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(g, 4, 4, w - 8, 120, 22); g.fill();
    g.textBaseline = 'middle'; g.textAlign = 'left'; g.font = `900 34px ${FONT}`; g.fillStyle = '#fff'; g.fillText(d.name, 20, 32);
    g.textAlign = 'right'; g.font = `900 22px ${FONT}`; g.fillStyle = d.color; g.fillText('PHASE ' + this.ph, w - 20, 32);
    g.fillStyle = '#222'; roundRect(g, 20, 58, w - 40, 30, 14); g.fill();
    g.fillStyle = this.ph === 3 ? '#c026d3' : this.ph === 2 ? '#e8590c' : '#d00'; if (this.pct > 0.005) { roundRect(g, 20, 58, (w - 40) * this.pct, 30, 14); g.fill(); }
    g.textAlign = 'center'; g.font = `900 18px ${FONT}`; g.fillStyle = '#fff'; g.fillText(this.warnT > 0 && this.warnText ? this.warnText.slice(0, 44) : `${Math.ceil(this.hp)} / ${this.mx}`, w / 2, 106);
    tex.needsUpdate = true;
  }
  // the wrist (headset) / the line under the Eat Meter
  hud() { if (!this.id) return 'BOSS FIGHT · GET READY'; return `${this.out > 0 ? 'OUT ' + Math.ceil(this.out) + 's' : '❤'.repeat(this.hearts)} · POWER x${this.power.toFixed(1)} · ${this.def.name} ${Math.ceil(this.pct * 100)}%`; }

  dispose() {
    const g = this.g; this.disposed = true;
    if (this.A && this.A.patio && g.room.patio) g.room.patio.clear(false, g.physics);      // (the beer garden's benches back out)
    for (const it of g.items.items) if (it.sizeK !== 1 && it.setSize) it.setSize(1);      // (the fight's over: food back to its usual size)
    bossMusic(false);
    for (const k in this.handlers) { if (this.handlers[k]) g.net.on[k] = this.handlers[k]; else delete g.net.on[k]; }
    g.player.onRelease = this.rel0;
    for (const h of this.hazards) g.scene.remove(h.grp); this.hazards = [];
    for (const p of this.projs) { g.scene.remove(p.obj); g.scene.remove(p.mk); } this.projs = [];
    for (const c of this.minions.slice()) { if (!c.disposed) c.dispose(); const i = g.cast.indexOf(c); if (i >= 0) g.cast.splice(i, 1); } this.minions = [];
    if (this.c) { this.c.dispose(); this.c = null; }
    if (this.weak) { g.scene.remove(this.weak); this.weak.material.dispose(); }
    g.scene.remove(this.bar3); this.bar3.material.map.dispose(); this.bar3.material.dispose();
    this.numbers.dispose();
    for (const it of g.items.items.slice()) if (it.bossAmmo && !it.dead && !it.heldBy) g.items.remove(it);
    for (const el of [this.hudEl, this.introEl, this.overEl]) el.className = '';
    document.body.classList.remove('boss-cine');
    const P = g.player; if (P.flatGrip && this.hidGrip !== undefined && this.inIntro) P.flatGrip.visible = this.hidGrip; if (P.wrist && this.hidWrist !== undefined && this.inIntro) P.wrist.visible = true;
  }
}

// ---------------------------------------------------------------- helpers
const _c3 = new THREE.Color();
const r2 = (v) => Math.round(v * 100) / 100;
const TEAM_ROW = /^(TEAM DAMAGE|MVP: |· )/;
const FOOD_COL = { orange: [0xff8c1a, 0xffc04a, 0xffffff], shake: [0xf3ead8, 0xc98a4a, 0xffffff], broccoli: [0x2e7d32, 0x9ccc65, 0x1b5e20], burger: [0xd9933f, 0x5a2e14, 0x4caf3c, 0xffc21a], pizza: [0xf2b233, 0xc9852f, 0xb3261e] };
function segDist(p, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z, apx = p.x - a.x, apy = p.y - a.y, apz = p.z - a.z, l2 = abx * abx + aby * aby + abz * abz;
  const t = l2 > 1e-9 ? clamp((apx * abx + apy * aby + apz * abz) / l2, 0, 1) : 0;
  return Math.hypot(apx - abx * t, apy - aby * t, apz - abz * t);
}
// whose turn is it? (a different boss each fight; ?boss=noah in the address picks one)
const safeGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
export function peekBoss() { const i = +(safeGet('rs_boss_i') || 0) || 0; return BOSS_ORDER[((i % BOSS_ORDER.length) + BOSS_ORDER.length) % BOSS_ORDER.length]; }
export function nextBoss(taken) {
  let q = null; try { q = new URLSearchParams(location.search).get('boss'); } catch (e) {}
  if (window.__bossPick && BOSSES[window.__bossPick]) { const p = window.__bossPick; window.__bossPick = null; return p; }
  if (q && BOSSES[q]) return q;
  let i = +(safeGet('rs_boss_i') || 0) || 0;
  for (let k = 0; k < BOSS_ORDER.length; k++) { const id = BOSS_ORDER[(i + k) % BOSS_ORDER.length]; if (!taken.has(id)) { safeSet('rs_boss_i', String(i + k + 1)); return id; } }
  safeSet('rs_boss_i', String(i + 1)); return BOSS_ORDER[i % BOSS_ORDER.length];
}
