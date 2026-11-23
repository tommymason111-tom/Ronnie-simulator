// SEARCH AND DESTROY: what you see and press (mixed into the game in snd.js). The HUD on a phone or computer (score
// bar with every round so far, ammo with the fire mode and both your guns, health is the top-left box, kill feed with
// headshots, wallbangs and assists, crosshair that opens up as your aim blooms, hit markers, where a hit came from,
// the low health red edge, the countdown to GO), the buttons (FIRE, RELOAD, AIM, SWAP, PLANT/DEFUSE/TAKE, SHOP, WATCH),
// the keys, the SHOP (a screen of cards on a phone or computer, a panel in VR), the SCOREBOARD (held: the score bar on a
// phone, TAB, the left stick in a headset), the death recap, and the round's start and end (the MVP, the money).
import * as THREE from 'three';
import { sfx } from './audio.js';
import { track } from './awards.js';
import { rr, txt } from './impgames.js';
import { GUNS, GUN, PRIMARIES, SIDEARMS, FREE_GUN, gunBars, drawGunArt, PERKS, money } from './sndkit.js';

const TEAMS = { R: { short: 'GREASY SPOONS', col: '#ff5a3d', ico: '🍳' }, B: { short: 'SALAD DODGERS', col: '#3da5ff', ico: '🥗' } };
const VERB = Object.assign(Object.create(null), { ketchup: 'SAUCED', brown: 'BROWN-SAUCED', mustard: 'MUSTARDED', beans: 'BEANED', sausage: 'SAUSAGED', cheese: 'CHEESED', monstor: 'CANNED', baguette: 'BAGUETTED', gravy: 'GRAVIED' });
const WHY = Object.assign(Object.create(null), { wiped: '💀', boom: '💥', defused: '🔧', time: '⏱️' });
const MULTI = ['', '', '🍽️ DOUBLE HELPING!', '🍔 TRIPLE DECKER!', '🧀 QUAD CHEESE!', '🏆 ALL YOU CAN EAT!'];
const fmt = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const esc = (t) => String(t).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const pic = (c) => `./assets/portraits/${esc(String(c || 'ronnie').replace(/[^a-z0-9_]/gi, ''))}.webp`;
const nm = (f) => esc(String(f.name || '').replace(/^🤖 /, ''));
const SHOP_ORDER = [...PRIMARIES, ...SIDEARMS];
const _v = new THREE.Vector3();

const CSS = `body.snd #btn-eat, body.snd #btn-throw, body.snd #pu-hud, body.snd #btn-sprint, body.snd.sd-alive #btn-emote { display: none !important; }
#sd-ui { position: fixed; right: max(12px, env(safe-area-inset-right)); bottom: max(14px, env(safe-area-inset-bottom)); display: none; flex-direction: column; align-items: flex-end; gap: 8px; z-index: 45; pointer-events: none; }
body.snd.flat #sd-ui { display: flex; } #sd-ui .row { display: flex; gap: 10px; align-items: flex-end; }
#sd-ui button { pointer-events: auto; position: relative; width: 74px; height: 74px; border-radius: 50%; border: 4px solid #fff; color: #fff; font: 900 12px "Arial Black", Arial, sans-serif; text-shadow: 0 2px 3px #000; box-shadow: 0 4px 0 rgba(0,0,0,0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.05; padding: 0; cursor: pointer; transition: transform .1s; touch-action: none; }
#sd-ui button:active, #sd-ui button.on { transform: scale(0.92); } #sd-ui button b { font-size: 26px; display: block; font-weight: normal; } #sd-ui button[hidden] { display: none; } #sd-ui button.off { filter: grayscale(1) brightness(0.55); }
#sd-ui button i { position: absolute; top: -6px; right: -4px; font: 900 10px Arial, sans-serif; font-style: normal; background: #111; border: 2px solid #fff; border-radius: 8px; padding: 1px 5px; }
body.sd-touch #sd-ui button i { display: none; }
#sd-ui .fire { width: 104px; height: 104px; background: radial-gradient(circle at 40% 35%, #ff7a4a, #d62a10); font-size: 14px; } #sd-ui .fire b { font-size: 36px; }
#sd-ui .reload { background: #2a6df4; } #sd-ui .reload.need { animation: sdpulse .6s infinite alternate; background: #ff9f1c; }
#sd-ui .act { background: #7b2ff7; width: 88px; height: 88px; } #sd-ui .act.defuse { background: #00a86b; } #sd-ui .act.grab { background: #c77700; } #sd-ui .act.on { animation: sdpulse .35s infinite alternate; }
#sd-ui .aim { background: #455a64; } #sd-ui .aim.on { background: #ffd400; color: #111; text-shadow: none; } #sd-ui .swap { background: #6d4c41; } #sd-ui .swap b { font-size: 22px; }
#sd-ui .watch { background: #37474f; width: 92px; height: 92px; } #sd-ui .guns { background: #2e7d32; width: 92px; height: 92px; animation: sdpulse .8s infinite alternate; }
@keyframes sdpulse { from { box-shadow: 0 0 0 0 rgba(255,255,255,0.6), 0 4px 0 rgba(0,0,0,0.4); } to { box-shadow: 0 0 0 9px rgba(255,255,255,0), 0 4px 0 rgba(0,0,0,0.4); } }
#sd-ammo { pointer-events: auto; cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 6px 12px 8px; border-radius: 14px; background: rgba(8,10,22,0.78); border: 3px solid #fff; color: #fff; font-family: "Arial Black", Arial, sans-serif; position: relative; overflow: hidden; min-width: 168px; box-sizing: border-box; touch-action: none; }
#sd-ammo .ic { font-size: 26px; } #sd-ammo .num { display: flex; align-items: baseline; gap: 4px; } #sd-ammo .num b { font-size: 28px; line-height: 1; } #sd-ammo .num em { font-style: normal; font-size: 15px; color: #c3cad6; }
#sd-ammo small { display: block; font-size: 10px; color: #ffd400; letter-spacing: .5px; white-space: nowrap; } #sd-ammo.low .num b { color: #ff5252; } #sd-ammo.empty { border-color: #ff5252; animation: sdshake .4s; }
#sd-ammo .sl { display: flex; flex-direction: column; gap: 2px; margin-left: auto; font-size: 13px; } #sd-ammo .sl span { opacity: 0.4; } #sd-ammo .sl span.on { opacity: 1; }
#sd-ammo u { position: absolute; left: 0; bottom: 0; height: 4px; background: #39ff14; width: 0; } @keyframes sdshake { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
#sd-top { position: fixed; left: 50%; top: max(46px, calc(env(safe-area-inset-top) + 42px)); transform: translateX(-50%); z-index: 44; display: none; flex-direction: column; align-items: center; gap: 3px; pointer-events: none; font-family: "Arial Black", Arial, sans-serif; color: #fff; max-width: calc(100vw - 20px); }
body.snd.flat #sd-top { display: flex; } #sd-top .bar { display: flex; align-items: stretch; border-radius: 14px; overflow: hidden; border: 3px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.5); pointer-events: auto; touch-action: none; cursor: pointer; }
#sd-top .tm { display: flex; align-items: center; gap: 4px; padding: 2px 10px; font-size: 22px; min-width: 48px; justify-content: center; } #sd-top .tm.R { background: #ff5a3d; } #sd-top .tm.B { background: #3da5ff; }
#sd-top .mid { background: rgba(8,10,22,0.88); padding: 2px 10px; text-align: center; min-width: 74px; } #sd-top .mid small { display: block; font-size: 9px; color: #c3cad6; white-space: nowrap; } #sd-top .mid b { font-size: 19px; line-height: 1.1; } #sd-top .mid.bomb b { color: #ff3b3b; animation: sdblink .5s infinite alternate; } #sd-top .mid.hurry b { color: #ff9f1c; }
@keyframes sdblink { to { opacity: 0.45; } }
#sd-top .pips { display: flex; gap: 10px; font-size: 11px; } #sd-top .pips span { display: flex; gap: 2px; } #sd-top .pips i { width: 10px; height: 10px; border-radius: 50%; border: 2px solid #fff; display: inline-block; } #sd-top .pips .R i { background: #ff5a3d; } #sd-top .pips .B i { background: #3da5ff; } #sd-top .pips i.x { background: #333 !important; opacity: 0.6; }
#sd-top .role { font-size: 11px; padding: 2px 10px; border-radius: 10px; background: rgba(8,10,22,0.8); white-space: nowrap; } #sd-top .role.att { color: #ff9f1c; } #sd-top .role.def { color: #4fc3ff; } #sd-top .role.dead { color: #9fb3d9; }
#sd-cross { position: fixed; left: 50%; top: 50%; width: 0; height: 0; z-index: 41; pointer-events: none; display: none; } body.snd.flat #sd-cross.on { display: block; }
#sd-cross .t { position: absolute; background: #fff; box-shadow: 0 0 2px #000, 0 0 1px #000; } #sd-cross .t.u, #sd-cross .t.d { width: 2px; height: 9px; left: -1px; } #sd-cross .t.l, #sd-cross .t.r { width: 9px; height: 2px; top: -1px; }
#sd-cross .dot { position: absolute; width: 4px; height: 4px; left: -2px; top: -2px; border-radius: 50%; background: #ff3b3b; box-shadow: 0 0 2px #000; }
#sd-hm { position: absolute; left: -16px; top: -16px; width: 32px; height: 32px; opacity: 0; } #sd-hm::before, #sd-hm::after { content: ''; position: absolute; left: 14px; top: 0; width: 4px; height: 32px; background: linear-gradient(#fff 0 35%, transparent 35% 65%, #fff 65%); }
#sd-hm::before { transform: rotate(45deg); } #sd-hm::after { transform: rotate(-45deg); } #sd-hm.on { animation: sdhm .35s ease-out; } #sd-hm.kill::before, #sd-hm.kill::after { background: linear-gradient(#ff2020 0 35%, transparent 35% 65%, #ff2020 65%); } #sd-hm.kill.on { animation: sdhm .6s ease-out; }
#sd-hm.hs::before, #sd-hm.hs::after { background: linear-gradient(#ffd400 0 35%, transparent 35% 65%, #ffd400 65%); }
@keyframes sdhm { 0% { opacity: 1; transform: scale(1.4); } 100% { opacity: 0; transform: scale(1); } }
#sd-dir { position: fixed; left: 50%; top: 50%; width: 0; height: 0; z-index: 41; pointer-events: none; } #sd-dir .arc { position: absolute; left: -70px; top: -70px; width: 140px; height: 140px; transition: opacity 1.1s; }
#sd-dir .arc::before { content: ''; position: absolute; left: 40px; top: -8px; width: 60px; height: 24px; border-radius: 50% 50% 0 0 / 100% 100% 0 0; border-top: 7px solid rgba(255,30,30,0.9); filter: drop-shadow(0 0 4px #f00); }
#sd-vig { position: fixed; inset: 0; pointer-events: none; z-index: 40; opacity: 0; transition: opacity .3s; background: radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(170,0,0,0.6) 100%); } #sd-vig.on { opacity: 1; animation: sdbeat 1.1s infinite; }
@keyframes sdbeat { 0%, 100% { opacity: 0.55; } 15% { opacity: 1; } 30% { opacity: 0.7; } 45% { opacity: 0.95; } }
#sd-flash { position: fixed; inset: 0; pointer-events: none; z-index: 42; opacity: 0; background: radial-gradient(ellipse, rgba(255,0,0,0) 35%, rgba(255,0,0,0.5)); } #sd-flash.on { animation: sdflash .45s ease-out; } @keyframes sdflash { from { opacity: 1; } to { opacity: 0; } }
#sd-dead { position: fixed; inset: 0; pointer-events: none; z-index: 39; opacity: 0; transition: opacity .6s; background: linear-gradient(rgba(40,40,60,0.15), rgba(10,10,20,0.35)); filter: grayscale(1); } #sd-dead.on { opacity: 1; }
#sd-prog { position: fixed; left: 50%; top: 62%; transform: translate(-50%, -50%); z-index: 46; display: none; flex-direction: column; align-items: center; gap: 4px; pointer-events: none; font: 900 14px "Arial Black", Arial, sans-serif; color: #fff; text-shadow: 0 2px 3px #000; }
#sd-prog.on { display: flex; } #sd-prog .ring { width: 84px; height: 84px; border-radius: 50%; background: conic-gradient(#39ff14 var(--k, 0%), rgba(0,0,0,0.6) 0); display: flex; align-items: center; justify-content: center; border: 3px solid #fff; } #sd-prog .ring b { font-size: 34px; font-weight: normal; }
#sd-pop { position: fixed; left: 50%; top: 70%; transform: translateX(-50%); z-index: 47; pointer-events: none; font: 900 20px "Arial Black", Arial, sans-serif; text-shadow: 0 2px 4px #000, 0 0 2px #000; opacity: 0; white-space: nowrap; max-width: 92vw; overflow: hidden; text-overflow: ellipsis; } #sd-pop.on { animation: sdpop 1.6s ease-out forwards; }
@keyframes sdpop { 0% { opacity: 0; transform: translateX(-50%) scale(0.6); } 12% { opacity: 1; transform: translateX(-50%) scale(1.08); } 22% { transform: translateX(-50%) scale(1); } 75% { opacity: 1; } 100% { opacity: 0; transform: translateX(-50%) translateY(-18px); } }
#sd-multi { position: fixed; left: 50%; top: 31%; transform: translateX(-50%); z-index: 47; pointer-events: none; font: 900 30px "Arial Black", Arial, sans-serif; color: #ffd400; text-shadow: 0 3px 0 #b33, 0 0 12px rgba(255,80,0,0.7); opacity: 0; white-space: nowrap; } #sd-multi.on { animation: sdpop 2s ease-out forwards; }
#sd-count { position: fixed; left: 50%; top: 40%; transform: translate(-50%, -50%); z-index: 47; pointer-events: none; font: 900 96px "Arial Black", Arial, sans-serif; color: #fff; text-shadow: 0 6px 0 rgba(0,0,0,0.5), 0 0 24px #ff9f1c; opacity: 0; } #sd-count.on { animation: sdcount .9s ease-out forwards; }
@keyframes sdcount { 0% { opacity: 0; transform: translate(-50%, -50%) scale(2); } 20% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.7); } }
#sd-feed { position: fixed; right: max(12px, env(safe-area-inset-right)); top: 112px; left: auto; z-index: 43; display: flex; flex-direction: column; gap: 3px; align-items: flex-end; pointer-events: none; font: 900 12px "Arial Black", Arial, sans-serif; color: #fff; max-width: min(320px, 70vw); }
#sd-feed div { background: rgba(8,10,22,0.78); border-radius: 8px; padding: 3px 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; transition: opacity .8s; } #sd-feed div.me { border: 2px solid #ffd400; } #sd-feed div.old { opacity: 0; } #sd-feed .R { color: #ff8a70; } #sd-feed .B { color: #7cc4ff; } #sd-feed small { font-size: 10px; opacity: 0.85; }
#sd-splash { position: fixed; left: 50%; top: 47%; transform: translate(-50%, -50%); z-index: 48; pointer-events: none; text-align: center; font-family: "Arial Black", Arial, sans-serif; display: none; width: min(560px, 90vw); }
#sd-splash.on { display: block; animation: sdsplash .4s cubic-bezier(.2,1.5,.4,1); } #sd-splash > div { background: rgba(8,10,22,0.86); border: 4px solid currentColor; border-radius: 22px; padding: 14px 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
#sd-splash h1 { margin: 2px 0; font-size: clamp(22px, 6.5vw, 40px); line-height: 1.05; } #sd-splash p { margin: 4px 0; color: #fff; font-size: 14px; } #sd-splash p.sm { font-size: 12px; color: #c3cad6; } #sd-splash .sc { font-size: 34px; color: #fff; }
#sd-splash .imgs img { width: 54px; height: 54px; border-radius: 50%; border: 3px solid #fff; margin: 4px; object-fit: cover; background: #222; }
#sd-splash .hist { display: flex; justify-content: center; gap: 4px; margin: 4px 0; } #sd-splash .hist i { font-style: normal; font-size: 13px; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; } #sd-splash .hist i.R { background: #ff5a3d; } #sd-splash .hist i.B { background: #3da5ff; }
#sd-splash .mvp { display: flex; align-items: center; gap: 10px; justify-content: center; margin: 6px auto 2px; padding: 6px 10px; border-radius: 14px; background: rgba(255,212,0,0.14); border: 2px solid #ffd400; max-width: 100%; box-sizing: border-box; } #sd-splash .mvp img { width: 46px; height: 46px; border-radius: 50%; border: 3px solid #ffd400; object-fit: cover; background: #222; flex: none; }
#sd-splash .mvp div { text-align: left; min-width: 0; } #sd-splash .mvp b { display: block; color: #ffd400; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #sd-splash .mvp span { display: block; color: #fff; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#sd-splash .cash { color: #39ff14; font-size: 15px; } #sd-splash .rec { display: grid; grid-template-columns: auto auto; gap: 2px 12px; justify-content: center; font-size: 12px; color: #fff; margin: 6px 0 2px; } #sd-splash .rec span:nth-child(odd) { color: #c3cad6; text-align: right; } #sd-splash .rec span:nth-child(even) { text-align: left; }
@keyframes sdsplash { from { transform: translate(-50%, -50%) scale(0.5); opacity: 0; } }
#sd-scope { position: fixed; inset: 0; z-index: 39; pointer-events: none; display: none; background: radial-gradient(circle at center, rgba(0,0,0,0) 0 min(38vw, 38vh), #000 calc(min(38vw, 38vh) + 2px)); } #sd-scope.on { display: block; }
#sd-scope::before, #sd-scope::after { content: ''; position: absolute; background: rgba(0,0,0,0.85); } #sd-scope::before { left: 50%; top: 10%; bottom: 10%; width: 2px; margin-left: -1px; } #sd-scope::after { top: 50%; left: 10%; right: 10%; height: 2px; margin-top: -1px; }
#sd-pick { position: fixed; inset: 0; z-index: 60; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: max(10px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left)); box-sizing: border-box; background: radial-gradient(circle at 50% 30%, rgba(40,20,70,0.92), rgba(6,6,16,0.95)); font-family: "Arial Black", Arial, sans-serif; color: #fff; touch-action: none; }
#sd-pick.on { display: flex; animation: sdin .25s ease-out; } @keyframes sdin { from { opacity: 0; transform: scale(1.04); } }
#sd-pick .hd { text-align: center; width: min(900px, 100%); } #sd-pick .hd h2 { margin: 0; font-size: clamp(17px, 4.6vw, 26px); color: #ffd400; } #sd-pick .hd p { margin: 2px 0 0; font-size: 12px; color: #c3cad6; } #sd-pick .hd .cash { color: #39ff14; font-size: clamp(16px, 4.4vw, 22px); }
#sd-pick .tbar { height: 6px; border-radius: 3px; background: rgba(255,255,255,0.15); overflow: hidden; margin-top: 5px; } #sd-pick .tbar u { display: block; height: 100%; background: linear-gradient(90deg, #39ff14, #ffd400, #ff3b3b); width: 100%; }
#sd-pick .lb { width: min(900px, 100%); font-size: 11px; color: #ffd400; letter-spacing: 1px; text-align: left; }
#sd-pick .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; width: min(900px, 100%); } #sd-pick .grid.s { grid-template-columns: repeat(3, minmax(0, 1fr)); }
#sd-pick .card { position: relative; display: flex; flex-direction: column; align-items: stretch; gap: 2px; padding: 5px 7px 6px; border-radius: 14px; border: 3px solid rgba(255,255,255,0.25); background: linear-gradient(160deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03)); color: #fff; font: inherit; text-align: left; cursor: pointer; min-width: 0; }
#sd-pick .card:active { transform: scale(0.97); } #sd-pick .card.cur { border-color: #39ff14; background: linear-gradient(160deg, rgba(57,255,20,0.25), rgba(57,255,20,0.06)); box-shadow: 0 0 14px rgba(57,255,20,0.45); } #sd-pick .card.no { filter: grayscale(0.85) brightness(0.7); }
#sd-pick .card canvas { width: 100%; height: 46px; display: block; } #sd-pick .card .nm { font-size: 11px; line-height: 1.1; overflow-wrap: anywhere; } #sd-pick .card .kd { font-size: 9px; color: #c3cad6; letter-spacing: 1px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0 4px; white-space: nowrap; } #sd-pick .card .kd b { color: #39ff14; font-size: 11px; } #sd-pick .card.no .kd b { color: #ff6b6b; }
#sd-pick .card .bars { display: grid; grid-template-columns: 52px 1fr; gap: 2px 6px; align-items: center; font-size: 8px; color: #c3cad6; } #sd-pick .card .bars s { display: block; height: 5px; border-radius: 3px; background: rgba(255,255,255,0.15); text-decoration: none; overflow: hidden; } #sd-pick .card .bars s u { display: block; height: 100%; }
#sd-pick .card .ln { font-size: 9px; color: #ddd; line-height: 1.15; } #sd-pick .card .tick { position: absolute; right: 6px; top: 4px; font-size: 15px; display: none; } #sd-pick .card.cur .tick { display: block; }
#sd-pick .grid.s .card .bars, #sd-pick .grid.s .card .ln { display: none; } #sd-pick .grid.s .card canvas { height: 34px; }
#sd-pick .go { pointer-events: auto; padding: 9px 26px; border-radius: 24px; border: 3px solid #fff; background: #2e7d32; color: #fff; font: 900 16px "Arial Black", Arial, sans-serif; }
@media (min-aspect-ratio: 1/1) { #sd-pick .grid { grid-template-columns: repeat(6, minmax(0, 1fr)); } #sd-pick .card .nm { font-size: 10px; } #sd-pick .grid.s { grid-template-columns: repeat(3, minmax(0, 1fr)); width: min(560px, 100%); } #sd-pick .lb { width: min(900px, 100%); } }
@media (max-height: 520px) { #sd-pick { gap: 3px; } #sd-pick .card { padding: 3px 6px 4px; gap: 1px; } #sd-pick .card canvas { height: 30px; } #sd-pick .grid.s .card canvas { height: 22px; } #sd-pick .card .ln, #sd-pick .card .bars .x { display: none; } #sd-pick .hd p { display: none; } #sd-pick .go { padding: 4px 18px; font-size: 13px; } #sd-pick .lb { font-size: 9px; } }
@media (max-height: 520px) and (min-aspect-ratio: 1/1) { #sd-ui button { width: 62px; height: 62px; font-size: 10px; } #sd-ui button b { font-size: 21px; } #sd-ui .fire { width: 84px; height: 84px; } #sd-ui .act, #sd-ui .watch, #sd-ui .guns { width: 72px; height: 72px; } #sd-ammo { min-width: 140px; padding: 3px 8px 5px; } #sd-ammo .num b { font-size: 22px; } #sd-ammo .ic { font-size: 20px; } #sd-top .tm { font-size: 18px; } #sd-ui .row { gap: 8px; } }
#sd-board { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 58; display: none; width: min(640px, calc(100vw - 16px)); max-height: calc(100vh - 16px); overflow: hidden; box-sizing: border-box; padding: 8px 10px 10px; border-radius: 18px; background: rgba(8,10,22,0.93); border: 3px solid #fff; color: #fff; font-family: "Arial Black", Arial, sans-serif; pointer-events: none; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
#sd-board.on { display: block; animation: sdbin .15s ease-out; } @keyframes sdbin { from { opacity: 0; transform: translate(-50%, -50%) scale(1.04); } } #sd-board .hd { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 22px; } #sd-board .hd .R { color: #ff8a70; } #sd-board .hd .B { color: #7cc4ff; } #sd-board .hd small { font-size: 10px; color: #c3cad6; display: block; text-align: center; }
#sd-board .hist { display: flex; justify-content: center; gap: 3px; margin: 4px 0 6px; flex-wrap: wrap; } #sd-board .hist i { font-style: normal; font-size: 11px; width: 20px; height: 20px; border-radius: 5px; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; } #sd-board .hist i.R { background: #ff5a3d; } #sd-board .hist i.B { background: #3da5ff; } #sd-board .hist i.n { background: transparent; opacity: 0.35; }
#sd-board table { width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed; margin-top: 4px; } #sd-board th { font-size: 9px; color: #c3cad6; font-weight: 900; padding: 2px 0; text-align: center; } #sd-board th:first-child { text-align: left; padding-left: 4px; }
#sd-board td { padding: 2px 0; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-top: 1px solid rgba(255,255,255,0.08); } #sd-board td.n { text-align: left; padding-left: 4px; } #sd-board td.n img { width: 18px; height: 18px; border-radius: 50%; vertical-align: middle; margin-right: 4px; object-fit: cover; background: #222; }
#sd-board tr.R td.n { color: #ffb0a0; } #sd-board tr.B td.n { color: #a8d8ff; } #sd-board tr.me td { background: rgba(255,212,0,0.16); } #sd-board tr.dead td { opacity: 0.5; } #sd-board .bt { font-size: 8px; background: #555; border-radius: 4px; padding: 0 3px; margin-left: 3px; vertical-align: middle; color: #fff; }
body.sd-over #sd-top, body.sd-over #sd-ui, body.sd-over #sd-feed, body.sd-over #sd-cross, body.sd-over #sd-prog, body.sd-over #sd-pop, body.sd-over #sd-multi, body.sd-over #sd-count, body.sd-over #sd-splash, body.sd-over #sd-dir, body.sd-over #sd-vig, body.sd-over #sd-dead, body.sd-over #sd-scope, body.sd-over #sd-pick, body.sd-over #sd-board, body.snd.gameover #over { display: none !important; }
#sd-end { position: fixed; left: 50%; top: max(64px, calc(env(safe-area-inset-top) + 58px)); transform: translateX(-50%); z-index: 46; display: none; flex-direction: column; gap: 6px; width: min(640px, calc(100vw - 16px)); max-height: calc(100% - max(64px, calc(env(safe-area-inset-top) + 58px)) - max(10px, env(safe-area-inset-bottom))); box-sizing: border-box; padding: 8px 10px 10px; border-radius: 18px; background: rgba(8,10,22,0.95); border: 3px solid #ffd400; color: #fff; font-family: "Arial Black", Arial, sans-serif; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
body.sd-over.flat #sd-end { display: flex; animation: sdein .3s ease-out; } @keyframes sdein { from { opacity: 0; transform: translateX(-50%) scale(1.04); } } body.sd-over.sd-again #sd-end { display: none; }
#sd-end .hd { text-align: center; } #sd-end .hd small { display: block; font-size: 10px; color: #c3cad6; letter-spacing: 1px; } #sd-end .hd h2 { margin: 0; font-size: clamp(20px, 6.4vw, 30px); line-height: 1.1; } #sd-end .hd .sc { font-size: 22px; }
#sd-end .bd { overflow-y: auto; min-height: 0; flex: 0 1 auto; overscroll-behavior: contain; } #sd-end .bd .tt { font-size: 15px; padding: 4px 8px; margin-top: 6px; border-radius: 8px; text-align: left; display: flex; justify-content: space-between; } #sd-end .bd .tt.R { background: rgba(255,90,61,0.3); } #sd-end .bd .tt.B { background: rgba(61,165,255,0.3); }
#sd-end table { width: 100%; border-collapse: collapse; font-size: 15px; table-layout: fixed; } #sd-end .x { display: none; } #sd-end.more .x { display: table-cell; } #sd-end td.k { color: #ffd400; } #sd-end table.R { border-left: 4px solid #ff5a3d; } #sd-end table.B { border-left: 4px solid #3da5ff; } #sd-end th { font-size: 9px; color: #c3cad6; padding: 1px 0; text-align: center; } #sd-end th:first-child { text-align: left; padding-left: 4px; }
#sd-end td { padding: 3px 0; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-top: 1px solid rgba(255,255,255,0.08); } #sd-end td.n { text-align: left; padding-left: 4px; } #sd-end td.n img { width: 16px; height: 16px; border-radius: 50%; vertical-align: middle; margin-right: 4px; object-fit: cover; background: #222; }
#sd-end tr.R td.n { color: #ffb0a0; } #sd-end tr.B td.n { color: #a8d8ff; } #sd-end tr.me td { background: rgba(255,212,0,0.16); } #sd-end .bt { font-size: 8px; background: #555; border-radius: 4px; padding: 0 3px; margin-left: 3px; vertical-align: middle; }
#sd-end .you { font-size: 11px; text-align: center; color: #ffd400; } #sd-end .aw { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; font-size: 10px; } #sd-end .aw span { background: rgba(255,255,255,0.1); border-radius: 8px; padding: 2px 6px; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
#sd-end .bts { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; } #sd-end .bts button { font: 900 clamp(13px, 3.8vw, 18px) "Arial Black", Arial, sans-serif; padding: 10px 16px; border-radius: 16px; border: 4px solid #111; background: #39ff14; color: #111; box-shadow: 0 5px 0 rgba(0,0,0,0.4); cursor: pointer; max-width: 100%; }
#sd-end .bts button.leave { background: #ffd400; } #sd-end .bts button.more { background: #455a64; color: #fff; border-color: #fff; font-size: 12px; padding: 8px 10px; } #sd-end .wait { font-size: 11px; color: #c3cad6; text-align: center; }
#sd-board .tt { font-size: 11px; padding: 3px 4px; margin-top: 4px; border-radius: 8px; text-align: left; } #sd-board .tt.R { background: rgba(255,90,61,0.3); } #sd-board .tt.B { background: rgba(61,165,255,0.3); }
`;

export const UI = {
  buildUI() {
    const st = document.createElement('style'); st.id = 'sd-style'; st.textContent = CSS; document.head.appendChild(st); this.style = st;
    const ui = document.createElement('div'); ui.id = 'sd-ui';
    ui.innerHTML = `<div id="sd-ammo" role="button" aria-label="Fire mode"><span class="ic">🍅</span><div><div class="num"><b>0</b><em>/ 0</em></div><small>GUN</small></div><span class="sl"><span class="p">🔫</span><span class="s">🍅</span></span><u></u></div>
<div class="row"><button class="swap" hidden aria-label="Swap guns"><b>🔁</b>SWAP<i>Q</i></button><button class="aim" hidden aria-label="Aim"><b>🎯</b>AIM<i>RMB</i></button><button class="act" hidden aria-label="Plant, defuse or take"><b>💣</b><span class="al">PLANT</span><i>E</i></button></div>
<div class="row"><button class="reload" aria-label="Reload"><b>🔄</b>RELOAD<i>R</i></button><button class="guns" hidden aria-label="Shop"><b>🛒</b>SHOP<i>B</i></button><button class="watch" hidden aria-label="Watch"><b>👀</b>WATCH<i>V</i></button><button class="fire" aria-label="Fire"><b>🔥</b>FIRE<i>F</i></button></div>`;
    document.body.appendChild(ui); this.ui = ui; document.body.classList.add('snd'); if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('sd-touch');
    const Q = (c) => ui.querySelector('.' + c); this.B = { aim: Q('aim'), swap: Q('swap'), act: Q('act'), reload: Q('reload'), fire: Q('fire'), watch: Q('watch'), guns: Q('guns') }; this.B.scope = this.B.aim; this.ammoEl = ui.querySelector('#sd-ammo');
    const tap = (el, f) => el.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); f(e); });
    tap(this.B.reload, () => this.doReload()); tap(this.B.aim, () => this.toggleAds()); tap(this.B.swap, () => this.swapGun()); tap(this.B.watch, () => this.doWatch()); tap(this.B.guns, () => this.openPicker());
    // the ammo box: a tap flicks the fire mode, held it's the inspect
    let am = 0; this.ammoEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); am = performance.now(); clearTimeout(this.amT); this.amT = setTimeout(() => { am = 0; this.inspect(); }, 450); });
    const amUp = (e) => { e.stopPropagation(); clearTimeout(this.amT); if (am && performance.now() - am < 450) this.cycleMode(); am = 0; }; this.ammoEl.addEventListener('pointerup', amUp); this.ammoEl.addEventListener('pointercancel', () => { clearTimeout(this.amT); am = 0; });
    // FIRE: held for an automatic; drag on it to aim at the same time (one thumb does both)
    const fb = this.B.fire; let fid = null, fx = 0, fy = 0;
    fb.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); fid = e.pointerId; fx = e.clientX; fy = e.clientY; try { fb.setPointerCapture(e.pointerId); } catch (er) {} this.my.firing = true; fb.classList.add('on'); this.fire(); });
    fb.addEventListener('pointermove', (e) => { if (e.pointerId !== fid) return; const dx = e.clientX - fx, dy = e.clientY - fy; fx = e.clientX; fy = e.clientY; const P = this.g.player; if (!P.flatMode) return; const k = 0.0055 * (this.zoomNow || 1); P.flatYaw -= dx * k; P.flatPitch = Math.max(-1.35, Math.min(1.35, P.flatPitch - dy * k)); });
    const fup = (e) => { if (e.pointerId !== fid) return; fid = null; this.my.firing = false; fb.classList.remove('on'); }; fb.addEventListener('pointerup', fup); fb.addEventListener('pointercancel', fup);
    // PLANT / DEFUSE: held down (TAKE a gun off the floor: a tap)
    const ab = this.B.act; ab.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); try { ab.setPointerCapture(e.pointerId); } catch (er) {} this.actHeld = true; this.startAct(); });
    const aup = () => { this.actHeld = false; this.endAct(); }; ab.addEventListener('pointerup', aup); ab.addEventListener('pointercancel', aup);
    const el = (id) => { const d = document.createElement('div'); d.id = id; document.body.appendChild(d); return d; };
    this.topEl = el('sd-top'); this.crossEl = el('sd-cross'); this.crossEl.innerHTML = '<i class="t u"></i><i class="t d"></i><i class="t l"></i><i class="t r"></i><i class="dot"></i><i id="sd-hm"></i>'; this.hmEl = this.crossEl.querySelector('#sd-hm');
    this.dirEl = el('sd-dir'); this.vigEl = el('sd-vig'); this.flashEl = el('sd-flash'); this.deadEl = el('sd-dead'); this.progEl = el('sd-prog'); this.progEl.innerHTML = '<div class="ring"><b>💣</b></div><span>PLANTING</span>';
    this.popEl = el('sd-pop'); this.multiEl = el('sd-multi'); this.countEl = el('sd-count'); this.feedEl = el('sd-feed'); this.splashEl = el('sd-splash'); this.scopeEl = el('sd-scope'); this.pickEl = el('sd-pick'); this.boardEl = el('sd-board'); this.endEl = el('sd-end');
    ['pointerdown', 'touchstart', 'mousedown', 'wheel'].forEach(k => this.pickEl.addEventListener(k, (e) => e.stopPropagation()));
    // the score bar: held, the scoreboard
    this.topEl.addEventListener('pointerdown', (e) => { if (!e.target.closest || !e.target.closest('.bar')) return; e.stopPropagation(); e.preventDefault(); try { this.topEl.setPointerCapture(e.pointerId); } catch (er) {} this.showBoard(true); });
    const tup = () => { if (!this.boardPinned) this.showBoard(false); }; this.topEl.addEventListener('pointerup', tup); this.topEl.addEventListener('pointercancel', tup);
    // a computer: the mouse fires (held for an automatic, drag to aim), the right button aims (held), the wheel swaps; keys below
    const cv = this.g.renderer.domElement;
    this.onMouse = (e) => { if (e.pointerType !== 'mouse' || !this.g.player.flatMode) return; if (e.button === 0) { this.mouseAt = performance.now(); this.my.firing = true; this.fire(); } else if (e.button === 2) this.toggleAds(true); };
    this.onMouseUp = (e) => { if (e.pointerType === 'mouse' && e.button === 0) this.my.firing = false; if (e.pointerType === 'mouse' && e.button === 2) this.toggleAds(false); };
    this.onCtx = (e) => e.preventDefault(); this.onWheel = (e) => { if (this.pickOpen || !this.g.player.flatMode) return; if (performance.now() - (this.wheelT || 0) > 250) { this.wheelT = performance.now(); this.swapGun(); } };
    cv.addEventListener('pointerdown', this.onMouse); window.addEventListener('pointerup', this.onMouseUp); cv.addEventListener('contextmenu', this.onCtx); cv.addEventListener('wheel', this.onWheel, { passive: true });
    this.onKey = (e) => {
      if (/input|textarea/i.test(e.target.tagName) || this.panel.open) return; const k = e.code, down = e.type === 'keydown';
      if (k === 'KeyF' || k === 'Space') { if (down && !e.repeat) { this.my.firing = true; this.fire(); } else if (!down) this.my.firing = false; }
      else if (k === 'KeyR') { if (down && !e.repeat) this.doReload(); }
      else if (k === 'KeyE') { if (down && !e.repeat) { this.actHeld = true; this.startAct(); } else if (!down) { this.actHeld = false; this.endAct(); } }
      else if (k === 'KeyQ') { if (down && !e.repeat) this.swapGun(); }
      else if (k === 'KeyZ') { if (down && !e.repeat) this.toggleAds(); }
      else if (k === 'KeyX') { if (down && !e.repeat) this.cycleMode(); }
      else if (k === 'KeyT') { if (down && !e.repeat) this.inspect(); }
      else if (k === 'Tab') { if (!e.repeat) this.showBoard(down); }
      else if (k === 'KeyV') { if (down && !e.repeat) this.doWatch(); }
      else if (k === 'KeyG' || k === 'KeyB') { if (down && !e.repeat) { if (this.pickOpen) this.closePicker(); else this.openPicker(); } }
      else if (/^Digit[1-9]$/.test(k)) { if (!down || e.repeat) return; const n = +k.slice(5); if (this.pickOpen) { const G = SHOP_ORDER[n - 1]; if (G) this.pickGun(G.id); } else if (n <= 2) this.switchTo(n === 1 ? 'P' : 'S'); }
      else if ((k === 'ShiftLeft' || k === 'ShiftRight')) { /* (no sprinting: it's a shooter) */ }
      else return; e.stopPropagation(); e.preventDefault(); };
    window.addEventListener('keydown', this.onKey, true); window.addEventListener('keyup', this.onKey, true);
    this.g.player.sprint = false;
  },
  disposeUI() {
    for (const e of [this.ui, this.style, this.topEl, this.crossEl, this.dirEl, this.vigEl, this.flashEl, this.deadEl, this.progEl, this.popEl, this.multiEl, this.countEl, this.feedEl, this.splashEl, this.scopeEl, this.pickEl, this.boardEl, this.endEl]) e && e.remove();
    document.body.classList.remove('snd', 'sd-touch', 'sd-alive', 'sd-over', 'sd-again'); clearInterval(this.againT); window.removeEventListener('keydown', this.onKey, true); window.removeEventListener('keyup', this.onKey, true);
    const cv = this.g.renderer.domElement; cv.removeEventListener('pointerdown', this.onMouse); window.removeEventListener('pointerup', this.onMouseUp); cv.removeEventListener('contextmenu', this.onCtx); cv.removeEventListener('wheel', this.onWheel);
    clearInterval(this.pickTimer); clearTimeout(this.amT); clearTimeout(this.boardT);
  },
  // a tap on the picture (main.js, from touch.js): on a phone, a shot at what you tapped (a mouse has already fired)
  tap(x, y) { if (performance.now() - (this.mouseAt || -1e9) < 800) return; if (!('ontouchstart' in window) && !(navigator.maxTouchPoints > 0)) return; this.fire(x, y); },

  // ------------------------------------------------------------------ the shop (every round)
  openPicker() {
    const me = this.mine(); if (!me || (this.phase !== 'buy' && this.phase !== 'wait')) return;
    if (this.g.renderer.xr.isPresenting || !this.g.player.flatMode) { if (!this.panel.open) this.panel.show(this.pickerScreen(), { canClose: true }); return; }
    const el = this.pickEl; this.pickOpen = true; this.g.player.menuLock = true; this.my.ads = false;
    const card = (G, i) => `<button class="card" data-g="${G.id}" style="border-color:${G.col}66"><span class="tick">✅</span><canvas width="300" height="110"></canvas><span class="nm">${G.icon} ${esc(G.name)}</span><span class="kd"><span>${G.kind} · ${i + 1}</span><b>${G.cost ? money(G.cost) : 'FREE'}</b></span><span class="bars">${gunBars(G).slice(0, 4).map(([n, v], j) => `<em class="${j > 2 ? 'x' : ''}" style="font-style:normal">${n}</em><s class="${j > 2 ? 'x' : ''}"><u style="width:${Math.round(v * 100)}%;background:${G.col}"></u></s>`).join('')}</span><span class="ln">${esc(G.line)}</span></button>`;
    el.innerHTML = `<div class="hd"><h2>🛒 ROUND ${this.round} · THE SHOP</h2><div class="cash"></div><p>${me.team === this.att ? '💣 ATTACKING: plant the Vindaloo at A or B' : '🛡️ DEFENDING: guard A and B'} · ${TEAMS[me.team].ico} ${TEAMS[me.team].short}</p><div class="tbar"><u></u></div></div>
<div class="lb">PRIMARY</div><div class="grid p">${PRIMARIES.map((G, i) => card(G, i)).join('')}</div><div class="lb">SIDEARM</div><div class="grid s">${SIDEARMS.map((G, i) => card(G, PRIMARIES.length + i)).join('')}</div><button class="go">✓ DONE</button>`;
    el.querySelectorAll('canvas').forEach((c) => { const g = c.getContext('2d'); drawGunArt(g, c.closest('.card').dataset.g, 6, 4, 288, 102); });
    el.querySelectorAll('.card').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); this.pickGun(b.dataset.g); }));
    el.querySelector('.go').addEventListener('click', (e) => { e.stopPropagation(); this.my.picked = true; sfx('tap', null, 0.5); this.closePicker(); });
    el.classList.add('on'); clearInterval(this.pickTimer); this.shopRefresh();
    const bar = el.querySelector('.tbar u'), T = Math.max(1, this.endsAt - this.clock);
    this.pickTimer = setInterval(() => { if (!this.pickOpen) { clearInterval(this.pickTimer); return; } const left = this.endsAt - this.clock; bar.style.width = Math.max(0, Math.min(100, left / T * 100)) + '%'; if (this.phase !== 'buy' && this.phase !== 'wait') this.closePicker(); }, 120);
  },
  // the cards: what you've got ticked, what you can't afford greyed, your money
  shopRefresh() {
    if (!this.pickOpen) return; const el = this.pickEl, me = this.mine(), L = (me && me.load) || {}, c = this.cash[this.me] ?? 0;
    const h = el.querySelector('.hd .cash'); if (h) h.textContent = `💷 DINNER MONEY ${money(c)}`;
    el.querySelectorAll('.card').forEach(b => { const G = GUN[b.dataset.g], cur = L[G.slot] === G.id, b2 = b.querySelector('.kd b'); b.classList.toggle('cur', cur); b.classList.toggle('no', !cur && G.cost > c); b.style.borderColor = cur ? '' : G.col + '66'; b2.textContent = cur ? 'YOURS' : G.cost ? money(G.cost) : 'FREE'; });
  },
  closePicker() {
    if (this.pickOpen) { this.pickOpen = false; this.pickEl.classList.remove('on'); this.pickEl.innerHTML = ''; this.g.player.menuLock = false; clearInterval(this.pickTimer); }
    if (this.panel.open && this.panel.cur && this.panel.cur.sdPick) this.panel.close(true);
  },
  // the same shop on the headset's panel (the right controller points, the trigger buys)
  pickerScreen() {
    const s = { sdPick: true, hover: -1 }, cell = (i) => ({ x: 12 + (i % 3) * 164, y: 96 + Math.floor(i / 3) * 132, w: 156, h: 124 });
    s.draw = (g) => { const bg = g.createLinearGradient(0, 0, 0, 512); bg.addColorStop(0, '#2a1458'); bg.addColorStop(1, '#0c0818'); g.fillStyle = bg; rr(g, 4, 4, 504, 504, 30); g.fill(); g.lineWidth = 8; g.strokeStyle = '#ffd400'; rr(g, 4, 4, 504, 504, 30); g.stroke();
      const me = this.mine(), L = (me && me.load) || {}, c = this.cash[this.me] ?? 0;
      txt(g, `🛒 ROUND ${this.round} · THE SHOP`, 256, 30, 24, '#ffd400'); txt(g, `💷 ${money(c)}`, 256, 58, 20, '#39ff14'); const left = Math.max(0, this.endsAt - this.clock); txt(g, `${Math.ceil(left)}s · TRIGGER TO BUY · B TO CLOSE`, 256, 82, 13, '#c3cad6');
      SHOP_ORDER.forEach((G, i) => { const b = cell(i), cur = L[G.slot] === G.id, hov = s.hover === i, no = !cur && G.cost > c; g.globalAlpha = no ? 0.5 : 1;
        g.fillStyle = cur ? 'rgba(57,255,20,0.22)' : hov ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.07)'; rr(g, b.x, b.y, b.w, b.h, 14); g.fill(); g.lineWidth = cur || hov ? 4 : 2; g.strokeStyle = cur ? '#39ff14' : hov ? '#ffd400' : G.col; rr(g, b.x, b.y, b.w, b.h, 14); g.stroke();
        drawGunArt(g, G.id, b.x + 8, b.y + 4, b.w - 16, 48); txt(g, `${G.icon} ${G.name}`, b.x + b.w / 2, b.y + 64, 12, '#fff', 'center', b.w - 10); txt(g, G.kind, b.x + b.w / 2, b.y + 82, 10, '#c3cad6', 'center', b.w - 10);
        txt(g, cur ? 'YOURS' : G.cost ? money(G.cost) : 'FREE', b.x + b.w / 2, b.y + 104, 16, no ? '#ff6b6b' : '#39ff14', 'center', b.w - 10); g.globalAlpha = 1; }); };
    const at = (x, y) => SHOP_ORDER.findIndex((G, i) => { const b = cell(i); return x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h; });
    s.down = (x, y) => { const i = at(x, y); if (i >= 0) { this.pickGun(SHOP_ORDER[i].id); s.quit = true; } }; s.move = (x, y) => { s.hover = at(x, y); }; s.up = () => {};
    s.update = () => { if (this.phase !== 'buy' && this.phase !== 'wait') s.quit = true; };
    return s;
  },

  // ------------------------------------------------------------------ the scoreboard
  boardRows() {
    const rows = { R: [], B: [] }; for (const f of this.F.values()) rows[f.team].push(f);
    for (const t in rows) rows[t].sort((a, b) => (b.k || 0) - (a.k || 0) || (b.a || 0) - (a.a || 0) || (a.d || 0) - (b.d || 0)); return rows;
  },
  histHtml() { const n = Math.max(this.win * 2 - 1, this.hist.length); let h = ''; for (let i = 0; i < n; i++) { const e = this.hist[i]; h += e ? `<i class="${e[0]}">${WHY[e[1]] || '•'}</i>` : '<i class="n">·</i>'; } return h; },
  showBoard(on, ms) {
    const el = this.boardEl; if (!el) return; clearTimeout(this.boardT); this.boardPinned = !!ms;
    if (!on) { el.classList.remove('on'); this.boardOn = false; return; }
    this.renderBoard(); el.classList.add('on'); this.boardOn = true; if (ms) this.boardT = setTimeout(() => { this.boardPinned = false; this.showBoard(false); }, ms);
  },
  renderBoard() {
    const el = this.boardEl, mt = this.myTeam(), rows = this.boardRows();
    const row = (f) => { const c = this.cash[f.id], carry = this.bomb.st === 'carried' && this.bomb.id === f.id && (f.team === mt || this.phase === 'over');
      return `<tr class="${f.team}${f.id === this.me ? ' me' : ''}${f.alive || !this.inRound() ? '' : ' dead'}"><td class="n"><img src="${pic(f.char)}" alt="">${carry ? '💣' : ''}${!f.alive && this.inRound() ? '💀' : ''}${nm(f)}${f.bot ? '<span class="bt">BOT</span>' : ''}</td><td>${f.k || 0}</td><td>${f.d || 0}</td><td>${f.mvp || 0}</td><td>${f.team === mt && c != null ? money(c) : '—'}</td></tr>`; };
    const head = '<tr><th style="width:50%">PLAYER</th><th>K</th><th>D</th><th>⭐</th><th style="width:19%">£</th></tr>';
    const team = (t) => `<div class="tt ${t}">${TEAMS[t].ico} ${TEAMS[t].short} · ${t === this.att ? 'ATTACK' : 'DEFENCE'}</div><table>${head}${rows[t].map(row).join('')}</table>`;
    el.innerHTML = `<div class="hd"><span class="R">${TEAMS.R.ico} ${this.sc.R}</span><div><small>ROUND ${this.round} · FIRST TO ${this.win}</small>SCOREBOARD</div><span class="B">${this.sc.B} ${TEAMS.B.ico}</span></div><div class="hist">${this.histHtml()}</div>${team(mt === 'B' ? 'B' : 'R')}${team(mt === 'B' ? 'R' : 'B')}`;
  },
  // THE MATCH IS OVER: the live HUD and its prompts go; up comes the final scoreboard (both teams, every round), your
  // own game, the awards, and the way on: PLAY AGAIN (the host in a room: everyone's ready check) and back to the room's
  // lobby or the main menu (the same buttons as every other mode's receipt: main.js's #over-again and #over-leave)
  showEnd() {
    const el = this.endEl; if (!el) return; this.showBoard(false); this.closePicker(); document.body.classList.add('sd-over');
    const m = this.overMsg || {}, win = m.win === 'B' ? 'B' : 'R', mt = this.myTeam(), rows = this.boardRows(), room = !!this.net.connected, boss = !room || !!this.net.host;
    const st0 = m.st && Array.isArray(m.st[this.me]) ? m.st[this.me] : [], st = (i) => Number.isFinite(st0[i]) ? st0[i] : 0;
    // (simple and big: the winners, then each team in its colours, best first: name, kills, deaths, MVP stars. MORE adds assists and the bomb)
    const row = (f) => `<tr class="${f.team}${f.id === this.me ? ' me' : ''}"><td class="n">${f.id === this.me ? '▶ ' : ''}${nm(f)}${f.bot ? '<span class="bt">BOT</span>' : ''}</td><td class="k">${f.k || 0}</td><td>${f.d || 0}</td><td class="x">${f.a || 0}</td><td class="x">${(f.pl || 0) + (f.df || 0)}</td><td>${f.mvp ? '⭐' + f.mvp : ''}</td></tr>`;
    const head = '<tr><th style="width:52%">PLAYER</th><th>KILLS</th><th>DEATHS</th><th class="x">ASSISTS</th><th class="x">💣</th><th>MVP</th></tr>';
    const team = (t) => `<div class="tt ${t}"><b>${TEAMS[t].ico} ${TEAMS[t].short}</b><b>${this.sc[t]}</b></div><table class="${t}">${head}${rows[t].map(row).join('')}</table>`;
    const aw = (Array.isArray(m.aw) ? m.aw : []).slice(0, 3).filter(Array.isArray).map(a => `<span>${esc(a[0])} ${esc(a[1])}: ${esc(String(this.nameOf(String(a[2]))).replace(/^🤖 /, ''))}</span>`).join('');
    const lo = win === 'R' ? 'B' : 'R';
    el.innerHTML = `<div class="hd"><h2 style="color:${TEAMS[win].col}">${TEAMS[win].ico} ${TEAMS[win].short} WIN <span style="white-space:nowrap">${this.sc[win]}–${this.sc[lo]}</span></h2><small>${mt ? (mt === win ? '🏆 YOUR TEAM WON' : 'YOUR TEAM LOST · GO AND GET A KEBAB') : 'FULL TIME'}</small></div>`
      + `<div class="bd">${team(win)}${team(lo)}${mt ? `<div class="you">YOU: ${st(0)} KILLS · ${st(1)} DEATHS · ${st(7)} ASSISTS · ${st(3)} DAMAGE</div>` : ''}${aw ? `<div class="aw">${aw}</div>` : ''}</div>`
      + `<div class="bts"><button class="more" type="button">MORE ▾</button>${boss ? `<button class="again" type="button">${room ? '▶ PLAY AGAIN (EVERYONE)' : '▶ PLAY AGAIN'}</button>` : ''}<button class="leave" type="button">${room ? '↩ RETURN TO LOBBY' : '🏠 MAIN MENU'}</button></div>${boss ? '' : '<div class="wait">The host can start the next game</div>'}`;
    el.querySelector('.more').addEventListener('click', (e) => { e.stopPropagation(); const on = el.classList.toggle('more'); e.currentTarget.textContent = on ? 'LESS ▴' : 'MORE ▾'; });
    const go = (id) => { sfx('tap', null, 0.5); const b = document.getElementById(id); if (b) b.click(); };
    // (PLAY AGAIN in a room opens everyone's READY card: the board steps out of its way, and comes back if it's called off)
    const a = el.querySelector('.again'); if (a) a.addEventListener('click', (e) => { e.stopPropagation(); document.body.classList.add('sd-again'); go('over-again');
      clearInterval(this.againT); this.againT = setInterval(() => { const rc = document.getElementById('rc-card'), up = rc && getComputedStyle(rc).display !== 'none' && rc.offsetHeight > 0; if (this.disposed || this.phase !== 'over') { clearInterval(this.againT); return; } if (!up && Date.now() - t0 > 1200) { document.body.classList.remove('sd-again'); clearInterval(this.againT); } }, 400); const t0 = Date.now(); });
    el.querySelector('.leave').addEventListener('click', (e) => { e.stopPropagation(); go('over-leave'); });
    ['pointerdown', 'touchstart', 'mousedown'].forEach(k => el.addEventListener(k, (e) => e.stopPropagation()));
    this.g.player.menuLock = true;
  },
  // the headset: held left stick, the same board on the panel
  boardHeld(on) {
    if (on && !this.panel.open) { this.panel.show(this.boardScreen(), { canClose: true }); }
    else if (!on && this.panel.open && this.panel.cur && this.panel.cur.sdBoard) this.panel.close(true);
  },
  boardScreen() {
    const s = { sdBoard: true };
    s.draw = (g) => { g.fillStyle = 'rgba(8,10,22,0.95)'; rr(g, 4, 4, 504, 504, 26); g.fill(); g.lineWidth = 6; g.strokeStyle = '#fff'; rr(g, 4, 4, 504, 504, 26); g.stroke();
      txt(g, `${TEAMS.R.ico} ${this.sc.R}  –  ${this.sc.B} ${TEAMS.B.ico}`, 256, 32, 26, '#fff'); txt(g, `ROUND ${this.round} · FIRST TO ${this.win}`, 256, 58, 13, '#c3cad6');
      const rows = this.boardRows(), mt = this.myTeam(); let y = 82;
      for (const t of [mt === 'B' ? 'B' : 'R', mt === 'B' ? 'R' : 'B']) { g.fillStyle = TEAMS[t].col; rr(g, 14, y, 484, 22, 8); g.fill(); txt(g, `${TEAMS[t].short}   K   D   A   💣   ⭐`, 256, y + 11, 13, '#fff'); y += 28;
        for (const f of rows[t]) { if (f.id === this.me) { g.fillStyle = 'rgba(255,212,0,0.18)'; g.fillRect(14, y - 2, 484, 24); } g.globalAlpha = f.alive || !this.inRound() ? 1 : 0.5;
          txt(g, `${f.alive || !this.inRound() ? '' : '💀'}${String(f.name).replace(/^🤖 /, '🤖')}`, 22, y + 10, 14, '#fff', 'left', 230); [f.k, f.d, f.a, (f.pl || 0) + (f.df || 0), f.mvp].forEach((v, j) => txt(g, String(v || 0), 300 + j * 44, y + 10, 14, '#fff'));
          g.globalAlpha = 1; y += 24; } y += 6; } };
    s.down = () => {}; s.move = () => {}; s.up = () => {}; s.update = () => {};
    return s;
  },

  // ------------------------------------------------------------------ the HUD
  drawHud(me) {
    const B = this.B, t = this.clock, alive = !!(me && me.alive && this.inRound()), G = this.curG(), cap = this.cap(G), buy = this.phase === 'buy';
    document.body.classList.toggle('sd-alive', alive);      // (EMOTE only once you're out: its corner's needed for the gun's buttons)
    B.fire.hidden = !alive; B.reload.hidden = !alive; B.watch.hidden = !(me && !me.alive && this.inRound()); B.guns.hidden = !(buy && alive && !this.pickOpen);
    const other = this.my.slots[this.my.cur === 'P' ? 'S' : 'P']; B.swap.hidden = !(alive && other); if (!B.swap.hidden) { const og = GUN[other.g], k = og.id + '|' + this.my.cur; if (k !== this.swapKey) { this.swapKey = k; B.swap.querySelector('b').textContent = og.icon; } }
    B.aim.hidden = !alive; B.aim.classList.toggle('on', !!this.my.ads);
    B.fire.classList.toggle('off', this.phase !== 'live'); B.reload.classList.toggle('need', alive && this.my.mag === 0 && this.my.reserve > 0 && !this.my.reloadEnd);
    const w = alive ? this.actWhat() : null; B.act.hidden = !w && !this.my.act; if (!B.act.hidden) { const k = (this.my.act && this.my.act.k) || (w && w.k); B.act.classList.toggle('defuse', k === 'defuse'); B.act.classList.toggle('grab', k === 'grab'); B.act.classList.toggle('on', !!this.my.act);
      B.act.querySelector('b').textContent = k === 'defuse' ? '🔧' : k === 'grab' ? (GUN[w.g] || G).icon : '💣'; B.act.querySelector('.al').textContent = k === 'defuse' ? 'DEFUSE' : k === 'grab' ? 'TAKE' : 'PLANT'; }
    this.ammoEl.style.display = alive ? '' : 'none';
    if (alive) { const mode = this.fireMode(), key = this.my.gun + '|' + this.my.mag + '|' + this.my.reserve + '|' + cap + '|' + mode + '|' + this.my.cur + '|' + (this.my.slots.P && this.my.slots.P.g); if (key !== this.ammoKey) { this.ammoKey = key; this.ammoEl.querySelector('.ic').textContent = G.icon; this.ammoEl.querySelector('.num b').textContent = this.my.mag; this.ammoEl.querySelector('.num em').textContent = '/ ' + this.my.reserve;
        this.ammoEl.querySelector('small').textContent = `${G.name} · ${mode.toUpperCase()}`; const sp = this.ammoEl.querySelector('.sl .p'), ss = this.ammoEl.querySelector('.sl .s'); sp.textContent = this.my.slots.P ? GUN[this.my.slots.P.g].icon : '·'; ss.textContent = GUN[this.my.slots.S.g].icon; sp.classList.toggle('on', this.my.cur === 'P'); ss.classList.toggle('on', this.my.cur === 'S');
        this.ammoEl.classList.toggle('low', this.my.mag <= Math.ceil(cap * 0.25)); this.ammoEl.classList.toggle('empty', this.my.mag === 0 && this.my.reserve === 0); }
      const u = this.ammoEl.querySelector('u'); if (this.my.reloadEnd) { u.style.width = Math.min(100, (1 - (this.my.reloadEnd - t) / (this.my.reloadLen || 1)) * 100) + '%'; u.style.background = '#39ff14'; } else { u.style.width = (this.my.mag / cap * 100) + '%'; u.style.background = G.col; } }
    // the crosshair: as wide as the shots really go right now (aimed in, bloomed, moving), gone when you're scoped or out
    const gap = Math.round(4 + this.spreadNow(G) * 260 / (this.zoomNow || 1) + (this.kick[this.me] || 0) * 6);
    this.crossEl.classList.toggle('on', alive && !this.my.scoped && !this.pickOpen && !(this.my.adsK > 0.9 && G.scope)); if (gap !== this.gapWas) { this.gapWas = gap; const T = this.crossEl.querySelectorAll('.t'); T[0].style.top = (-gap - 9) + 'px'; T[1].style.top = gap + 'px'; T[2].style.left = (-gap - 9) + 'px'; T[3].style.left = gap + 'px'; }
    this.scopeEl.classList.toggle('on', alive && !!this.my.scoped);
    this.vigEl.classList.toggle('on', alive && me.hp < 35); this.deadEl.classList.toggle('on', !!(me && !me.alive && this.inRound()));
    // plant / defuse progress
    if (this.my.act) { const k = Math.min(1, (t - this.my.act.t0) / this.my.act.T); this.progEl.classList.add('on'); this.progEl.querySelector('.ring').style.setProperty('--k', Math.round(k * 100) + '%'); this.progEl.querySelector('b').textContent = this.my.act.k === 'plant' ? '💣' : '🔧'; this.progEl.querySelector('span').textContent = this.my.act.k === 'plant' ? 'PLANTING THE VINDALOO...' : 'DEFUSING...'; }
    else this.progEl.classList.remove('on');
    // the damage direction arcs: turn with you as you look round
    if (this.dmgDirs.length) { const yaw = this.camYaw(); this.dmgDirs = this.dmgDirs.filter(d => { if (t - d.t > 1.3) { d.el.remove(); return false; } d.el.style.transform = `rotate(${(yaw - d.a) * 180 / Math.PI}deg)`; d.el.style.opacity = String(Math.max(0, 1 - (t - d.t) / 1.3)); return true; }); }
    if (this.boardOn && (this.boardRT = (this.boardRT || 0) - 1) <= 0) { this.boardRT = 15; this.renderBoard(); }
    if ((this.hudT = (this.hudT || 0) - 1) > 0) return; this.hudT = 5;
    let h = '';
    if (this.phase === 'wait') h = `<div class="bar"><div class="mid"><small>SEARCH &amp; DESTROY</small><b style="font-size:14px">${this.host ? 'PICKING TEAMS...' : 'WAITING FOR THE HOST'}</b></div></div>`;
    else { const planted = this.bomb.st === 'planted', left = planted ? this.bombAt - t : this.endsAt - t, mid = `<div class="mid${planted ? ' bomb' : this.phase === 'live' && left < 20 ? ' hurry' : ''}"><small>R${this.round} · FIRST TO ${this.win}${this.phase === 'buy' ? ' · SHOP' : ''}</small><b>${planted ? '💣 ' : ''}${this.phase === 'over' ? 'FT' : fmt(left)}</b></div>`;
      h = `<div class="bar"><span class="tm R">${TEAMS.R.ico} ${this.sc.R}</span>${mid}<span class="tm B">${this.sc.B} ${TEAMS.B.ico}</span></div>`;
      const pips = (tm) => [...this.F.values()].filter(f => f.team === tm).map(f => `<i class="${f.alive ? '' : 'x'}" title="${esc(f.name)}"></i>`).join('');
      h += `<div class="pips"><span class="R">${pips('R')}</span><span class="B">${pips('B')}</span></div>`;
      if (me) { const att = me.team === this.att, role = !me.alive && this.inRound() ? `<span class="role dead">💀 OUT · WATCHING ${esc(this.spect ? this.nameOf(this.spect).replace(/^🤖 /, '') : '')}</span>` : this.bomb.id === this.me && this.bomb.st === 'carried' ? '<span class="role att">💣 YOU\'VE GOT THE VINDALOO · PLANT AT A OR B</span>'
          : buy ? `<span class="role ${att ? 'att' : 'def'}">💷 ${money(this.cash[this.me] ?? 0)} · ${att ? '💣 ATTACK' : '🛡️ DEFEND'}</span>`
          : `<span class="role ${att ? 'att' : 'def'}">${att ? (planted ? '💣 DEFEND THE BOMB' : this.bomb.st === 'dropped' ? '💣 PICK UP THE BOMB' : '💣 ATTACK · PLANT AT A OR B') : planted ? `🔧 DEFUSE IT AT ${this.bomb.s || '?'}!` : '🛡️ DEFEND · GUARD A AND B'}</span>`;
        h += role; } }
    if (h !== this.topHtml) { this.topHtml = h; this.topEl.innerHTML = h; }
  },
  camYaw() { const c = this.g.camera, d = c.getWorldDirection(_v); return Math.atan2(-d.x, -d.z); },
  // GO in three, two, one (the last seconds of the shop)
  countdown() {
    if (this.phase !== 'buy') { this.countN = null; return; } const n = Math.ceil(this.endsAt - this.clock); if (n > 3 || n < 1 || n === this.countN) return; this.countN = n; sfx('sd_tick', null, 0.8);
    if (this.g.renderer.xr.isPresenting) { this.g.showBanner(String(n), 'GET READY'); return; } const e = this.countEl; if (!e) return; e.textContent = n; e.className = ''; void e.offsetWidth; e.className = 'on';
  },
  // the top-left box (main.js hudExtras): health, armour, perks with their timers, the gun, your money
  hudExtras() {
    const me = this.mine(); if (!me || !this.inRound()) return { box: { col: '#ff9f1c', label: '💣 SEARCH & DESTROY', big: this.phase === 'over' ? `${this.sc.R}–${this.sc.B}` : '...', sub: this.phase === 'over' ? 'FULL TIME' : this.phase === 'wait' ? 'PICKING TEAMS' : 'NEXT ROUND', bar: { k: this.phase === 'over' ? 1 : 0.15, col: '#ff9f1c', text: this.phase === 'over' ? 'GAME OVER' : 'GETTING READY' } } };
    const col = TEAMS[me.team].col, hp = Math.ceil(me.hp), G = this.curG(), t = this.clock, chips = [];
    if (!me.alive) return { box: { col: '#9fb3d9', label: `💀 OUT · ${me.team === this.att ? 'ATTACK' : 'DEFENCE'}`, big: '0', unit: '❤', sub: 'WATCHING', bar: { k: 0, col: '#555' } } };
    chips.push({ t: `${G.icon} ${this.my.reloadEnd ? 'RELOADING' : this.my.mag + '/' + this.my.reserve}`, c: this.my.mag === 0 ? '#ff5252' : '#ffffff' });
    chips.push({ t: `💷 ${money(this.cash[this.me] ?? 0)}`, c: '#39ff14' });
    for (const k in this.my.perks) { const e = this.my.perks[k]; if (!(e > t)) continue; const [ico, nm2] = PERKS[k] || ['✨', k]; chips.push({ t: e > 1e8 ? `${ico} ${nm2}` : `${ico} ${Math.ceil(e - t)}s`, c: '#ff4fd8', pulse: e < 1e8 && e - t < 4 }); }
    if (this.bomb.id === this.me && this.bomb.st === 'carried') chips.push({ t: '💣 BOMB', c: '#ff9f1c', pulse: true });
    return { box: { col: hp < 35 ? '#ff3b3b' : col, label: `${TEAMS[me.team].ico} ${me.team === this.att ? 'ATTACK' : 'DEFENCE'} · R${this.round}`, big: String(hp), unit: '❤', sub: me.ar > 0 ? `🦺 ${Math.round(me.ar)}` : 'NO ARMOUR', bar: { k: hp / 100, col: hp < 35 ? '#ff3b3b' : hp < 65 ? '#ffd400' : '#39ff14' }, chips } };
  },
  hudLine() { if (!this.inRound()) return 'SEARCH & DESTROY'; const planted = this.bomb.st === 'planted'; return `R${this.round} ${this.sc.R}-${this.sc.B} · ${planted ? '💣 ' : ''}${fmt(planted ? this.bombAt - this.clock : this.endsAt - this.clock)}`; },
  // ---- little messages
  toast(s) { this.pop(s, '#ffd400'); if (this.g.renderer.xr.isPresenting) this.g.showBanner(s, ''); },
  pop(s, col) { const e = this.popEl; if (!e) return; e.textContent = s; e.style.color = col || '#fff'; e.className = ''; void e.offsetWidth; e.className = 'on'; },
  multiKill(n) { if (n < 2) return; const s = MULTI[Math.min(5, n)]; sfx('sd_multi', null, 0.9); track('sdMulti'); if (this.g.renderer.xr.isPresenting) { this.g.showBanner(s, ''); return; } const e = this.multiEl; if (!e) return; e.textContent = s; e.className = ''; void e.offsetWidth; e.className = 'on'; },
  feed(html, mine) { const d = document.createElement('div'); d.innerHTML = html; if (mine) d.className = 'me'; this.feedEl.prepend(d); const most = innerWidth < 760 || innerHeight < 500 ? 3 : 5; while (this.feedEl.children.length > most) this.feedEl.lastChild.remove(); setTimeout(() => d.classList.add('old'), 6500); setTimeout(() => d.remove(), 7400); },
  feedKill(K, V, ico, hs, as) { const n = (f) => `<span class="${f.team}">${esc(f.name.replace(/^🤖 /, '🤖'))}</span>`; const ass = as && as.length ? ` <small>+ ${as.map(a => esc(a.name.replace(/^🤖 /, ''))).join(', ')}</small>` : '';
    this.feed(K ? `${n(K)}${ass} ${ico}${hs ? '🎯' : ''} ${n(V)}` : `${ico} ${n(V)}`, (K && K.id === this.me) || V.id === this.me || (as || []).some(a => a.id === this.me)); },
  splash(col, html, ms) { const sp = this.splashEl; if (!sp) return; sp.style.color = col; sp.innerHTML = `<div>${html}</div>`; sp.classList.remove('on'); void sp.offsetWidth; sp.classList.add('on'); clearTimeout(this.splashT); this.splashT = setTimeout(() => sp.classList.remove('on'), ms || 2500); },
  roundSplash(m) {
    const me = this.mine(); if (!me) return; const att = me.team === this.att, mates = [...this.F.values()].filter(f => f.team === me.team);
    const sw = m.sw ? '<p class="sm">🔁 HALF TIME: THE SIDES HAVE SWAPPED (AND EVERYONE\'S MONEY\'S BACK TO THE START)</p>' : '';
    this.splash(att ? '#ff9f1c' : '#4fc3ff', `<p>ROUND ${this.round} · ${TEAMS.R.ico} ${this.sc.R} – ${this.sc.B} ${TEAMS.B.ico}</p><h1>${att ? '💣 ATTACK' : '🛡️ DEFEND'}</h1><p>${TEAMS[me.team].ico} ${TEAMS[me.team].short} · 💷 ${money(this.cash[this.me] ?? 0)}</p>${sw}<div class="imgs">${mates.slice(0, 6).map(f => `<img src="${pic(f.char)}" alt="">`).join('')}</div>${this.bomb.id === this.me ? '<p>💣 YOU\'RE CARRYING THE VINDALOO</p>' : ''}`, 2600);
    sfx('sd_round', null, 1); if (this.g.renderer.xr.isPresenting) this.g.showBanner(`ROUND ${this.round} · ${att ? 'ATTACK' : 'DEFEND'}`, 'Y: THE SHOP');
  },
  // a round over: who won and how, every round so far, the MVP, what you've earned
  roundEndSplash(win, why, mvp, mw, earned, last) {
    const W = { wiped: win === this.att ? 'THE DEFENDERS ARE ALL OUT' : 'THE ATTACKERS ARE ALL OUT', boom: 'THE VINDALOO WENT OFF', defused: 'THE VINDALOO WAS DEFUSED', time: 'TIME! NO PLANT' }[why] || '';
    this.splash(TEAMS[win].col, `<p>ROUND ${this.round} · ${esc(W)}</p><h1>${TEAMS[win].ico} ${TEAMS[win].short} WIN</h1><div class="sc"><b style="color:${TEAMS.R.col}">${this.sc.R}</b> – <b style="color:${TEAMS.B.col}">${this.sc.B}</b></div><div class="hist">${this.hist.map(e => `<i class="${e[0]}">${WHY[e[1]] || '•'}</i>`).join('')}</div>`
      + (mvp ? `<div class="mvp"><img src="${pic(mvp.char)}" alt=""><div><b>⭐ ROUND MVP: ${nm(mvp)}</b><span>${esc(mw)}</span></div></div>` : '')
      + (earned > 0 && !last ? `<p class="cash">💷 +${money(earned)} DINNER MONEY</p>` : '') + (last ? '' : this.round === this.half ? '<p class="sm">🔁 HALF TIME NEXT: SIDES SWAP</p>' : ''), 4600);
    if (mvp && mvp.id === this.me) { sfx('sd_mvp', null, 0.9); track('sdMvp'); }
  },
  hitMarker(kill, hs) { const e = this.hmEl; if (!e) return; const c = (kill ? 'kill ' : '') + (hs ? 'hs ' : ''); e.className = c; void e.offsetWidth; e.className = c + 'on'; const P = this.g.player; for (const h of P.hands || []) if (h.handedness === 'right') h.pulse && h.pulse(kill ? 1 : 0.5, kill ? 120 : 40); },
  // shot: a red flash, an arc pointing at whoever did it, a jolt
  hurt(d, p, hs, by) {
    this.flashEl.className = ''; void this.flashEl.offsetWidth; this.flashEl.className = 'on'; sfx('sd_hurt', null, 0.9);
    const P = this.g.player; for (const h of P.hands || []) h.pulse && h.pulse(0.7, 90); if (P.flatMode) P.flatPitch = Math.max(-1.35, Math.min(1.35, P.flatPitch + (Math.random() - 0.3) * 0.03));
    let from = Array.isArray(p) && p.length === 3 ? new THREE.Vector3(p[0], p[1], p[2]) : this.headOf(by, new THREE.Vector3());
    if (from) { const h = P.head, a = Math.atan2(-(from.x - h.x), -(from.z - h.z)), el = document.createElement('div'); el.className = 'arc'; this.dirEl.appendChild(el); this.dmgDirs.push({ el, a, t: this.clock }); while (this.dmgDirs.length > 4) this.dmgDirs.shift().el.remove(); }
    if (this.g.renderer.xr.isPresenting && this.mine()) this.g.showBanner(`❤ ${Math.ceil(this.mine().hp)}`, hs ? 'HEADSHOT!' : 'YOU\'RE HIT!');
  },
  // out: who got you, with what, from how far, how much they had left; what you did to them and they did to you.
  // Then (a phone or computer) a look at them before you watch your team
  died(K, g, hs, why, ds) {
    this.my.firing = false; this.my.ads = false; this.endAct(); this.cancelReload(); sfx('sd_dead', null, 1);
    const verb = why === 'boom' ? 'CURRIED' : why === 'left' ? 'OUT' : g ? VERB[g.id] || 'OUT' : 'OUT', who = K && K.id !== this.me ? K.name.replace(/^🤖 /, '') : null;
    let rec = ''; if (who) { const gave = this.dmgLog.filter(e => e.by === this.me && e.v === K.id), took = this.dmgLog.filter(e => e.by === K.id && e.v === this.me), sum = (a) => Math.round(a.reduce((s, e) => s + e.d, 0)), zones = (a) => { const z = [0, 0, 0]; a.forEach(e => z[e.z]++); return [z[1] ? `${z[1]} HEAD` : '', z[0] ? `${z[0]} BODY` : '', z[2] ? `${z[2]} LEGS` : ''].filter(Boolean).join(' · ') || '—'; };
      rec = `<div class="rec"><span>THEY DID</span><span>${sum(took)} IN ${took.length} HIT${took.length === 1 ? '' : 'S'} (${zones(took)})</span><span>YOU DID</span><span>${sum(gave)} IN ${gave.length} HIT${gave.length === 1 ? '' : 'S'}</span><span>THEY'RE ON</span><span>${Math.ceil(K.hp)} ❤${K.ar > 0 ? ` · 🦺 ${Math.round(K.ar)}` : ''}</span></div>`; }
    this.splash('#ff5252', `<p>💀 YOU'RE OUT FOR THE ROUND</p><h1>${verb}${who ? ' BY ' + esc(who.toUpperCase()) : '!'}</h1>${K && K.id !== this.me ? `<div class="imgs"><img src="${pic(K.char)}" alt=""></div><p>${g ? g.icon + ' ' + esc(g.name) : ''}${hs ? ' · 🎯 HEADSHOT' : ''}${ds ? ` · ${ds}m` : ''}</p>${rec}` : ''}<p class="sm">You're watching your team now. Back next round.</p>`, 3600);
    if (this.g.renderer.xr.isPresenting) this.g.showBanner(`${verb}${who ? ' BY ' + who.toUpperCase() : ''}`, 'WATCHING · BACK NEXT ROUND');
    this.spect = null; this.deathCam = who && this.g.player.flatMode && !this.g.renderer.xr.isPresenting ? { by: K.id, at: this.g.player.head.clone(), t0: this.clock } : null; if (!this.deathCam) this.doWatch(true);
  },
};
