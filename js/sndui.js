// SEARCH AND DESTROY: what you see and press (mixed into the game in snd.js). The HUD on a phone or computer (score
// bar, ammo, health is the top-left box, kill feed, crosshair with hit markers, where a hit came from, the low health
// red edge), the buttons (FIRE, RELOAD, PLANT/DEFUSE, SCOPE, WATCH), the keys, the GUN PICK (a screen of cards on a
// phone or computer, a panel in VR), the guns in everyone's hands, and the effects (tracers, flashes, the bang).
import * as THREE from 'three';
import { sfx } from './audio.js';
import { rr, txt } from './impgames.js';
import { GUNS, GUN, gunBars, gunModel, newGun, drawGunArt, PERKS } from './sndkit.js';

const TEAMS = { R: { short: 'GREASY SPOONS', col: '#ff5a3d', ico: '🍳' }, B: { short: 'SALAD DODGERS', col: '#3da5ff', ico: '🥗' } };
const VERB = Object.assign(Object.create(null), { ketchup: 'SAUCED', beans: 'BEANED', sausage: 'SAUSAGED', cheese: 'CHEESED', monstor: 'CANNED', gravy: 'GRAVIED' });
const fmt = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const esc = (t) => String(t).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const pic = (c) => `./assets/portraits/${esc(String(c || 'ronnie').replace(/[^a-z0-9_]/gi, ''))}.webp`;
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3();
let tracerGeo = null, flashGeo = null, bitGeo = null, boomGeo = null;

const CSS = `body.snd #btn-eat, body.snd #btn-throw, body.snd #pu-hud, body.snd #btn-sprint, body.snd.sd-alive #btn-emote { display: none !important; }
#sd-ui { position: fixed; right: max(12px, env(safe-area-inset-right)); bottom: max(14px, env(safe-area-inset-bottom)); display: none; flex-direction: column; align-items: flex-end; gap: 8px; z-index: 45; pointer-events: none; }
body.snd.flat #sd-ui { display: flex; } #sd-ui .row { display: flex; gap: 10px; align-items: flex-end; }
#sd-ui button { pointer-events: auto; position: relative; width: 74px; height: 74px; border-radius: 50%; border: 4px solid #fff; color: #fff; font: 900 12px "Arial Black", Arial, sans-serif; text-shadow: 0 2px 3px #000; box-shadow: 0 4px 0 rgba(0,0,0,0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.05; padding: 0; cursor: pointer; transition: transform .1s; touch-action: none; }
#sd-ui button:active, #sd-ui button.on { transform: scale(0.92); } #sd-ui button b { font-size: 26px; display: block; font-weight: normal; } #sd-ui button[hidden] { display: none; } #sd-ui button.off { filter: grayscale(1) brightness(0.55); }
#sd-ui button i { position: absolute; top: -6px; right: -4px; font: 900 10px Arial, sans-serif; font-style: normal; background: #111; border: 2px solid #fff; border-radius: 8px; padding: 1px 5px; }
body.sd-touch #sd-ui button i { display: none; }
#sd-ui .fire { width: 104px; height: 104px; background: radial-gradient(circle at 40% 35%, #ff7a4a, #d62a10); font-size: 14px; } #sd-ui .fire b { font-size: 36px; }
#sd-ui .reload { background: #2a6df4; } #sd-ui .reload.need { animation: sdpulse .6s infinite alternate; background: #ff9f1c; }
#sd-ui .act { background: #7b2ff7; width: 88px; height: 88px; } #sd-ui .act.defuse { background: #00a86b; } #sd-ui .act.on { animation: sdpulse .35s infinite alternate; }
#sd-ui .scope { background: #455a64; } #sd-ui .scope.on { background: #ffd400; color: #111; text-shadow: none; } #sd-ui .watch { background: #37474f; width: 92px; height: 92px; } #sd-ui .guns { background: #2e7d32; width: 92px; height: 92px; animation: sdpulse .8s infinite alternate; }
@keyframes sdpulse { from { box-shadow: 0 0 0 0 rgba(255,255,255,0.6), 0 4px 0 rgba(0,0,0,0.4); } to { box-shadow: 0 0 0 9px rgba(255,255,255,0), 0 4px 0 rgba(0,0,0,0.4); } }
#sd-ammo { pointer-events: none; display: flex; align-items: center; gap: 8px; padding: 6px 12px 8px; border-radius: 14px; background: rgba(8,10,22,0.78); border: 3px solid #fff; color: #fff; font-family: "Arial Black", Arial, sans-serif; position: relative; overflow: hidden; min-width: 168px; box-sizing: border-box; }
#sd-ammo .ic { font-size: 26px; } #sd-ammo .num { display: flex; align-items: baseline; gap: 4px; } #sd-ammo .num b { font-size: 28px; line-height: 1; } #sd-ammo .num em { font-style: normal; font-size: 15px; color: #c3cad6; }
#sd-ammo small { display: block; font-size: 10px; color: #ffd400; letter-spacing: .5px; white-space: nowrap; } #sd-ammo.low .num b { color: #ff5252; } #sd-ammo.empty { border-color: #ff5252; animation: sdshake .4s; }
#sd-ammo u { position: absolute; left: 0; bottom: 0; height: 4px; background: #39ff14; width: 0; } @keyframes sdshake { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
#sd-top { position: fixed; left: 50%; top: max(46px, calc(env(safe-area-inset-top) + 42px)); transform: translateX(-50%); z-index: 44; display: none; flex-direction: column; align-items: center; gap: 3px; pointer-events: none; font-family: "Arial Black", Arial, sans-serif; color: #fff; max-width: calc(100vw - 20px); }
body.snd.flat #sd-top { display: flex; } #sd-top .bar { display: flex; align-items: stretch; border-radius: 14px; overflow: hidden; border: 3px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
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
#sd-feed { position: fixed; right: max(12px, env(safe-area-inset-right)); top: 112px; left: auto; z-index: 43; display: flex; flex-direction: column; gap: 3px; align-items: flex-end; pointer-events: none; font: 900 12px "Arial Black", Arial, sans-serif; color: #fff; max-width: min(320px, 70vw); }
#sd-feed div { background: rgba(8,10,22,0.78); border-radius: 8px; padding: 3px 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; transition: opacity .8s; } #sd-feed div.me { border: 2px solid #ffd400; } #sd-feed div.old { opacity: 0; } #sd-feed .R { color: #ff8a70; } #sd-feed .B { color: #7cc4ff; }
#sd-splash { position: fixed; left: 50%; top: 47%; transform: translate(-50%, -50%); z-index: 48; pointer-events: none; text-align: center; font-family: "Arial Black", Arial, sans-serif; display: none; width: min(560px, 90vw); }
#sd-splash.on { display: block; animation: sdsplash .4s cubic-bezier(.2,1.5,.4,1); } #sd-splash > div { background: rgba(8,10,22,0.86); border: 4px solid currentColor; border-radius: 22px; padding: 14px 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
#sd-splash h1 { margin: 2px 0; font-size: clamp(24px, 7vw, 42px); line-height: 1.05; } #sd-splash p { margin: 4px 0; color: #fff; font-size: 14px; } #sd-splash p.sm { font-size: 12px; color: #c3cad6; } #sd-splash .sc { font-size: 34px; color: #fff; }
#sd-splash .imgs img { width: 54px; height: 54px; border-radius: 50%; border: 3px solid #fff; margin: 4px; object-fit: cover; background: #222; }
@keyframes sdsplash { from { transform: translate(-50%, -50%) scale(0.5); opacity: 0; } }
#sd-scope { position: fixed; inset: 0; z-index: 39; pointer-events: none; display: none; background: radial-gradient(circle at center, rgba(0,0,0,0) 0 min(38vw, 38vh), #000 calc(min(38vw, 38vh) + 2px)); } #sd-scope.on { display: block; }
#sd-scope::before, #sd-scope::after { content: ''; position: absolute; background: rgba(0,0,0,0.85); } #sd-scope::before { left: 50%; top: 10%; bottom: 10%; width: 2px; margin-left: -1px; } #sd-scope::after { top: 50%; left: 10%; right: 10%; height: 2px; margin-top: -1px; }
#sd-pick { position: fixed; inset: 0; z-index: 60; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: max(10px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left)); box-sizing: border-box; background: radial-gradient(circle at 50% 30%, rgba(40,20,70,0.92), rgba(6,6,16,0.95)); font-family: "Arial Black", Arial, sans-serif; color: #fff; touch-action: none; }
#sd-pick.on { display: flex; animation: sdin .25s ease-out; } @keyframes sdin { from { opacity: 0; transform: scale(1.04); } }
#sd-pick .hd { text-align: center; width: min(720px, 100%); } #sd-pick .hd h2 { margin: 0; font-size: clamp(18px, 5vw, 28px); color: #ffd400; } #sd-pick .hd p { margin: 2px 0 0; font-size: 12px; color: #c3cad6; }
#sd-pick .tbar { height: 6px; border-radius: 3px; background: rgba(255,255,255,0.15); overflow: hidden; margin-top: 6px; } #sd-pick .tbar u { display: block; height: 100%; background: linear-gradient(90deg, #39ff14, #ffd400, #ff3b3b); width: 100%; }
#sd-pick .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; width: min(720px, 100%); }
#sd-pick .card { position: relative; display: flex; flex-direction: column; align-items: stretch; gap: 3px; padding: 6px 8px 8px; border-radius: 14px; border: 3px solid rgba(255,255,255,0.25); background: linear-gradient(160deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03)); color: #fff; font: inherit; text-align: left; cursor: pointer; min-width: 0; }
#sd-pick .card:active { transform: scale(0.97); } #sd-pick .card.cur { border-color: #39ff14; background: linear-gradient(160deg, rgba(57,255,20,0.25), rgba(57,255,20,0.06)); box-shadow: 0 0 14px rgba(57,255,20,0.45); }
#sd-pick .card canvas { width: 100%; height: 54px; display: block; } #sd-pick .card .nm { font-size: 12px; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #sd-pick .card .kd { font-size: 9px; color: #ffd400; letter-spacing: 1px; }
#sd-pick .card .bars { display: grid; grid-template-columns: 52px 1fr; gap: 2px 6px; align-items: center; font-size: 8px; color: #c3cad6; } #sd-pick .card .bars s { display: block; height: 5px; border-radius: 3px; background: rgba(255,255,255,0.15); text-decoration: none; overflow: hidden; } #sd-pick .card .bars s u { display: block; height: 100%; }
#sd-pick .card .ln { font-size: 9px; color: #ddd; line-height: 1.15; } #sd-pick .card .tick { position: absolute; right: 6px; top: 4px; font-size: 16px; display: none; } #sd-pick .card.cur .tick { display: block; }
#sd-pick .go { pointer-events: auto; padding: 10px 26px; border-radius: 24px; border: 3px solid #fff; background: #2e7d32; color: #fff; font: 900 16px "Arial Black", Arial, sans-serif; }
@media (min-aspect-ratio: 1/1) { #sd-pick .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-height: 520px) { #sd-pick { gap: 4px; } #sd-pick .card { padding: 3px 6px 5px; gap: 1px; } #sd-pick .card canvas { height: 34px; } #sd-pick .card .ln, #sd-pick .card .bars .x { display: none; } #sd-pick .hd p { display: none; } #sd-pick .go { padding: 5px 18px; font-size: 13px; } }
@media (max-height: 520px) and (min-aspect-ratio: 1/1) { #sd-ui button { width: 62px; height: 62px; font-size: 10px; } #sd-ui button b { font-size: 21px; } #sd-ui .fire { width: 84px; height: 84px; } #sd-ui .act, #sd-ui .watch, #sd-ui .guns { width: 72px; height: 72px; } #sd-ammo { min-width: 140px; padding: 3px 8px 5px; } #sd-ammo .num b { font-size: 22px; } #sd-ammo .ic { font-size: 20px; } #sd-top .tm { font-size: 18px; } }
`;

export const UI = {
  buildUI() {
    const st = document.createElement('style'); st.id = 'sd-style'; st.textContent = CSS; document.head.appendChild(st); this.style = st;
    const ui = document.createElement('div'); ui.id = 'sd-ui';
    ui.innerHTML = `<div id="sd-ammo"><span class="ic">🥫</span><div><div class="num"><b>0</b><em>/ 0</em></div><small>GUN</small></div><u></u></div>
<div class="row"><button class="scope" hidden aria-label="Scope"><b>🔭</b>SCOPE<i>Q</i></button><button class="act" hidden aria-label="Plant or defuse"><b>💣</b><span class="al">PLANT</span><i>E</i></button></div>
<div class="row"><button class="reload" aria-label="Reload"><b>🔄</b>RELOAD<i>R</i></button><button class="guns" hidden aria-label="Pick a gun"><b>🔫</b>GUNS<i>G</i></button><button class="watch" hidden aria-label="Watch"><b>👀</b>WATCH<i>V</i></button><button class="fire" aria-label="Fire"><b>🔥</b>FIRE<i>F</i></button></div>`;
    document.body.appendChild(ui); this.ui = ui; document.body.classList.add('snd'); if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('sd-touch');
    const Q = (c) => ui.querySelector('.' + c); this.B = { scope: Q('scope'), act: Q('act'), reload: Q('reload'), fire: Q('fire'), watch: Q('watch'), guns: Q('guns') }; this.ammoEl = ui.querySelector('#sd-ammo');
    const tap = (el, f) => el.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); f(e); });
    tap(this.B.reload, () => this.doReload()); tap(this.B.scope, () => this.toggleScope()); tap(this.B.watch, () => this.doWatch()); tap(this.B.guns, () => this.openPicker());
    // FIRE: held for an automatic; drag on it to aim at the same time (one thumb does both)
    const fb = this.B.fire; let fid = null, fx = 0, fy = 0;
    fb.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); fid = e.pointerId; fx = e.clientX; fy = e.clientY; try { fb.setPointerCapture(e.pointerId); } catch (er) {} this.my.firing = true; fb.classList.add('on'); this.fire(); });
    fb.addEventListener('pointermove', (e) => { if (e.pointerId !== fid) return; const dx = e.clientX - fx, dy = e.clientY - fy; fx = e.clientX; fy = e.clientY; const P = this.g.player; if (!P.flatMode) return; const k = (this.my.scoped ? 0.0018 : 0.0055); P.flatYaw -= dx * k; P.flatPitch = Math.max(-1.35, Math.min(1.35, P.flatPitch - dy * k)); });
    const fup = (e) => { if (e.pointerId !== fid) return; fid = null; this.my.firing = false; fb.classList.remove('on'); }; fb.addEventListener('pointerup', fup); fb.addEventListener('pointercancel', fup);
    // PLANT / DEFUSE: held down
    const ab = this.B.act; ab.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); try { ab.setPointerCapture(e.pointerId); } catch (er) {} this.actHeld = true; this.startAct(); });
    const aup = () => { this.actHeld = false; this.endAct(); }; ab.addEventListener('pointerup', aup); ab.addEventListener('pointercancel', aup);
    const el = (id) => { const d = document.createElement('div'); d.id = id; document.body.appendChild(d); return d; };
    this.topEl = el('sd-top'); this.crossEl = el('sd-cross'); this.crossEl.innerHTML = '<i class="t u"></i><i class="t d"></i><i class="t l"></i><i class="t r"></i><i class="dot"></i><i id="sd-hm"></i>'; this.hmEl = this.crossEl.querySelector('#sd-hm');
    this.dirEl = el('sd-dir'); this.vigEl = el('sd-vig'); this.flashEl = el('sd-flash'); this.deadEl = el('sd-dead'); this.progEl = el('sd-prog'); this.progEl.innerHTML = '<div class="ring"><b>💣</b></div><span>PLANTING</span>';
    this.popEl = el('sd-pop'); this.feedEl = el('sd-feed'); this.splashEl = el('sd-splash'); this.scopeEl = el('sd-scope'); this.pickEl = el('sd-pick');
    ['pointerdown', 'touchstart', 'mousedown', 'wheel'].forEach(k => this.pickEl.addEventListener(k, (e) => e.stopPropagation()));
    // a computer: the mouse fires (held for an automatic, drag to aim), right button scopes; keys below
    const cv = this.g.renderer.domElement;
    this.onMouse = (e) => { if (e.pointerType !== 'mouse' || !this.g.player.flatMode) return; if (e.button === 0) { this.mouseAt = performance.now(); this.my.firing = true; this.fire(); } else if (e.button === 2) this.toggleScope(); };
    this.onMouseUp = (e) => { if (e.pointerType === 'mouse' && e.button === 0) this.my.firing = false; };
    this.onCtx = (e) => e.preventDefault();
    cv.addEventListener('pointerdown', this.onMouse); window.addEventListener('pointerup', this.onMouseUp); cv.addEventListener('contextmenu', this.onCtx);
    this.onKey = (e) => {
      if (/input|textarea/i.test(e.target.tagName) || this.panel.open) return; const k = e.code, down = e.type === 'keydown';
      if (k === 'KeyF' || k === 'Space') { if (down && !e.repeat) { this.my.firing = true; this.fire(); } else if (!down) this.my.firing = false; }
      else if (k === 'KeyR') { if (down && !e.repeat) this.doReload(); }
      else if (k === 'KeyE') { if (down && !e.repeat) { this.actHeld = true; this.startAct(); } else if (!down) { this.actHeld = false; this.endAct(); } }
      else if (k === 'KeyQ') { if (down && !e.repeat) this.toggleScope(); }
      else if (k === 'KeyV') { if (down && !e.repeat) this.doWatch(); }
      else if (k === 'KeyG' || k === 'KeyB') { if (down && !e.repeat) { if (this.pickOpen) this.closePicker(); else this.openPicker(); } }
      else if (/^Digit[1-6]$/.test(k) && this.pickOpen) { if (down) { const g = GUNS[+k.slice(5) - 1]; if (g) { this.pickGun(g.id); this.closePicker(); } } }
      else if ((k === 'ShiftLeft' || k === 'ShiftRight')) { /* (no sprinting: it's a shooter) */ }
      else return; e.stopPropagation(); e.preventDefault(); };
    window.addEventListener('keydown', this.onKey, true); window.addEventListener('keyup', this.onKey, true);
    this.g.player.sprint = false;
  },
  disposeUI() {
    for (const e of [this.ui, this.style, this.topEl, this.crossEl, this.dirEl, this.vigEl, this.flashEl, this.deadEl, this.progEl, this.popEl, this.feedEl, this.splashEl, this.scopeEl, this.pickEl]) e && e.remove();
    document.body.classList.remove('snd', 'sd-touch', 'sd-alive'); window.removeEventListener('keydown', this.onKey, true); window.removeEventListener('keyup', this.onKey, true);
    const cv = this.g.renderer.domElement; cv.removeEventListener('pointerdown', this.onMouse); window.removeEventListener('pointerup', this.onMouseUp); cv.removeEventListener('contextmenu', this.onCtx);
    clearInterval(this.pickTimer);
  },
  // a tap on the picture (main.js, from touch.js): on a phone, a shot at what you tapped (a mouse has already fired)
  tap(x, y) { if (performance.now() - (this.mouseAt || -1e9) < 800) return; if (!('ontouchstart' in window) && !(navigator.maxTouchPoints > 0)) return; this.fire(x, y); },
  toggleScope() { const G = GUN[this.my.gun], me = this.mine(); if (!G.scope || !me || !me.alive || this.g.renderer.xr.isPresenting) return; if (this.my.reloadEnd) return; this.my.scoped = !this.my.scoped; sfx('sd_scope', null, 0.7); this.updateSpeed(); },

  // ------------------------------------------------------------------ the gun pick (every round)
  openPicker() {
    const me = this.mine(); if (!me || (this.phase !== 'buy' && this.phase !== 'wait')) return;
    if (this.g.renderer.xr.isPresenting || !this.g.player.flatMode) { if (!this.panel.open) this.panel.show(this.pickerScreen(), { canClose: true }); return; }
    const el = this.pickEl; this.pickOpen = true; this.g.player.menuLock = true;
    el.innerHTML = `<div class="hd"><h2>🔫 ROUND ${this.round} · PICK YOUR GUN</h2><p>${me.team === this.att ? '💣 ATTACKING: plant the Vindaloo at A or B' : '🛡️ DEFENDING: guard A and B'} · ${TEAMS[me.team].ico} ${TEAMS[me.team].short}</p><div class="tbar"><u></u></div></div><div class="grid">${GUNS.map((G, i) => `<button class="card${G.id === this.my.gun ? ' cur' : ''}" data-g="${G.id}" style="border-color:${G.id === this.my.gun ? '' : G.col + '66'}"><span class="tick">✅</span><canvas width="300" height="110"></canvas><span class="nm">${G.icon} ${esc(G.name)}</span><span class="kd">${G.kind} · ${i + 1}</span><span class="bars">${gunBars(G).slice(0, 5).map(([n, v], j) => `<em class="${j > 2 ? 'x' : ''}" style="font-style:normal">${n}</em><s class="${j > 2 ? 'x' : ''}"><u style="width:${Math.round(v * 100)}%;background:${G.col}"></u></s>`).join('')}</span><span class="ln">${esc(G.line)}</span></button>`).join('')}</div><button class="go">✓ READY</button>`;
    el.querySelectorAll('canvas').forEach((c, i) => { const g = c.getContext('2d'); drawGunArt(g, GUNS[i].id, 6, 4, 288, 102); });
    el.querySelectorAll('.card').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); this.pickGun(b.dataset.g); el.querySelectorAll('.card').forEach(c => { c.classList.toggle('cur', c.dataset.g === this.my.gun); c.style.borderColor = c.dataset.g === this.my.gun ? '' : GUN[c.dataset.g].col + '66'; }); this.closePicker(); }));      // (picked: straight back to the game, the gun's name pops up)
    el.querySelector('.go').addEventListener('click', (e) => { e.stopPropagation(); this.my.picked = true; sfx('tap', null, 0.5); this.closePicker(); });
    el.classList.add('on'); clearInterval(this.pickTimer);
    const bar = el.querySelector('.tbar u'), T = Math.max(1, this.endsAt - this.clock);
    this.pickTimer = setInterval(() => { if (!this.pickOpen) { clearInterval(this.pickTimer); return; } const left = this.endsAt - this.clock; bar.style.width = Math.max(0, Math.min(100, left / T * 100)) + '%'; if (this.phase !== 'buy' && this.phase !== 'wait') this.closePicker(); }, 120);
  },
  closePicker() {
    if (this.pickOpen) { this.pickOpen = false; this.pickEl.classList.remove('on'); this.pickEl.innerHTML = ''; this.g.player.menuLock = false; clearInterval(this.pickTimer); }
    if (this.panel.open && this.panel.cur && this.panel.cur.sdPick) this.panel.close(true);
  },
  // the same pick on the headset's panel (the right controller points, the trigger picks)
  pickerScreen() {
    const s = { sdPick: true, hover: -1 }, cell = (i) => ({ x: 14 + (i % 2) * 246, y: 92 + Math.floor(i / 2) * 136, w: 238, h: 128 });
    s.draw = (g, t) => { const bg = g.createLinearGradient(0, 0, 0, 512); bg.addColorStop(0, '#2a1458'); bg.addColorStop(1, '#0c0818'); g.fillStyle = bg; rr(g, 4, 4, 504, 504, 30); g.fill(); g.lineWidth = 8; g.strokeStyle = '#ffd400'; rr(g, 4, 4, 504, 504, 30); g.stroke();
      txt(g, `🔫 ROUND ${this.round} · PICK YOUR GUN`, 256, 34, 26, '#ffd400'); const left = Math.max(0, this.endsAt - this.clock); txt(g, `${Math.ceil(left)}s · TRIGGER TO PICK · B TO CLOSE`, 256, 66, 15, '#c3cad6');
      GUNS.forEach((G, i) => { const b = cell(i), cur = G.id === this.my.gun, hov = s.hover === i; g.fillStyle = cur ? 'rgba(57,255,20,0.22)' : hov ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.07)'; rr(g, b.x, b.y, b.w, b.h, 14); g.fill(); g.lineWidth = cur || hov ? 4 : 2; g.strokeStyle = cur ? '#39ff14' : hov ? '#ffd400' : G.col; rr(g, b.x, b.y, b.w, b.h, 14); g.stroke();
        drawGunArt(g, G.id, b.x + 10, b.y + 4, b.w - 20, 54); txt(g, `${G.icon} ${G.name}`, b.x + b.w / 2, b.y + 68, 14, '#fff', 'center', b.w - 14);
        gunBars(G).slice(0, 3).forEach(([n, v], j) => { const y = b.y + 86 + j * 13; txt(g, n, b.x + 12, y, 10, '#c3cad6', 'left', 70); g.fillStyle = 'rgba(255,255,255,0.15)'; rr(g, b.x + 84, y - 4, b.w - 100, 8, 4); g.fill(); g.fillStyle = G.col; rr(g, b.x + 84, y - 4, Math.max(8, (b.w - 100) * v), 8, 4); g.fill(); }); }); };
    const at = (x, y) => GUNS.findIndex((G, i) => { const b = cell(i); return x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h; });
    s.down = (x, y) => { const i = at(x, y); if (i >= 0) { this.pickGun(GUNS[i].id); s.quit = true; } }; s.move = (x, y) => { s.hover = at(x, y); }; s.up = () => {};
    s.update = () => { if (this.phase !== 'buy' && this.phase !== 'wait') s.quit = true; };
    return s;
  },

  // ------------------------------------------------------------------ the HUD
  drawHud(me) {
    const B = this.B, t = this.clock, alive = !!(me && me.alive && this.inRound()), G = GUN[this.my.gun], cap = G.mag * (this.my.perks.ammo ? 2 : 1), buy = this.phase === 'buy';
    document.body.classList.toggle('sd-alive', alive);      // (EMOTE only once you're out: its corner's needed for the gun's buttons)
    B.fire.hidden = !alive; B.reload.hidden = !alive; B.watch.hidden = !(me && !me.alive && this.inRound()); B.guns.hidden = !(buy && alive && !this.pickOpen);
    B.scope.hidden = !(alive && G.scope); B.scope.classList.toggle('on', !!this.my.scoped);
    B.fire.classList.toggle('off', this.phase !== 'live'); B.reload.classList.toggle('need', alive && this.my.mag === 0 && this.my.reserve > 0 && !this.my.reloadEnd);
    const w = alive ? this.actWhat() : null; B.act.hidden = !w && !this.my.act; if (!B.act.hidden) { const k = (this.my.act && this.my.act.k) || (w && w.k); B.act.classList.toggle('defuse', k === 'defuse'); B.act.classList.toggle('on', !!this.my.act); B.act.querySelector('b').textContent = k === 'defuse' ? '🔧' : '💣'; B.act.querySelector('.al').textContent = k === 'defuse' ? 'DEFUSE' : 'PLANT'; }
    this.ammoEl.style.display = alive ? '' : 'none';
    if (alive) { const key = this.my.gun + '|' + this.my.mag + '|' + this.my.reserve + '|' + cap; if (key !== this.ammoKey) { this.ammoKey = key; this.ammoEl.querySelector('.ic').textContent = G.icon; this.ammoEl.querySelector('.num b').textContent = this.my.mag; this.ammoEl.querySelector('.num em').textContent = '/ ' + this.my.reserve; this.ammoEl.querySelector('small').textContent = G.name;
        this.ammoEl.classList.toggle('low', this.my.mag <= Math.ceil(cap * 0.25)); this.ammoEl.classList.toggle('empty', this.my.mag === 0 && this.my.reserve === 0); }
      const u = this.ammoEl.querySelector('u'); if (this.my.reloadEnd) { u.style.width = Math.min(100, (1 - (this.my.reloadEnd - t) / (this.my.reloadLen || 1)) * 100) + '%'; u.style.background = '#39ff14'; } else { u.style.width = (this.my.mag / cap * 100) + '%'; u.style.background = G.col; } }
    // the crosshair: wider when the gun's less accurate (moving, a shotgun), gone when you're scoped or out
    const P = this.g.player, moving = P.flatMove ? Math.hypot(P.flatMove.x, P.flatMove.z) > 0.2 : false, gap = Math.round(5 + G.spread * 260 * (moving ? 1.6 : 1) + (this.kick[this.me] || 0) * 8);
    this.crossEl.classList.toggle('on', alive && !this.my.scoped && !this.pickOpen); if (gap !== this.gapWas) { this.gapWas = gap; const T = this.crossEl.querySelectorAll('.t'); T[0].style.top = (-gap - 9) + 'px'; T[1].style.top = gap + 'px'; T[2].style.left = (-gap - 9) + 'px'; T[3].style.left = gap + 'px'; }
    this.scopeEl.classList.toggle('on', alive && !!this.my.scoped);
    this.vigEl.classList.toggle('on', alive && me.hp < 35); this.deadEl.classList.toggle('on', !!(me && !me.alive && this.inRound()));
    // plant / defuse progress
    if (this.my.act) { const k = Math.min(1, (t - this.my.act.t0) / this.my.act.T); this.progEl.classList.add('on'); this.progEl.querySelector('.ring').style.setProperty('--k', Math.round(k * 100) + '%'); this.progEl.querySelector('b').textContent = this.my.act.k === 'plant' ? '💣' : '🔧'; this.progEl.querySelector('span').textContent = this.my.act.k === 'plant' ? 'PLANTING THE VINDALOO...' : 'DEFUSING...'; }
    else this.progEl.classList.remove('on');
    // the damage direction arcs: turn with you as you look round
    if (this.dmgDirs.length) { const yaw = this.camYaw(); this.dmgDirs = this.dmgDirs.filter(d => { if (t - d.t > 1.3) { d.el.remove(); return false; } d.el.style.transform = `rotate(${(yaw - d.a) * 180 / Math.PI}deg)`; d.el.style.opacity = String(Math.max(0, 1 - (t - d.t) / 1.3)); return true; }); }
    if ((this.hudT = (this.hudT || 0) - 1) > 0) return; this.hudT = 5;
    let h = '';
    if (this.phase === 'wait') h = `<div class="bar"><div class="mid"><small>SEARCH &amp; DESTROY</small><b style="font-size:14px">${this.host ? 'PICKING TEAMS...' : 'WAITING FOR THE HOST'}</b></div></div>`;
    else { const planted = this.bomb.st === 'planted', left = planted ? this.bombAt - t : this.endsAt - t, mid = `<div class="mid${planted ? ' bomb' : this.phase === 'live' && left < 20 ? ' hurry' : ''}"><small>R${this.round} · FIRST TO ${this.win}${this.phase === 'buy' ? ' · PICK' : ''}</small><b>${planted ? '💣 ' : ''}${this.phase === 'over' ? 'FT' : fmt(left)}</b></div>`;
      h = `<div class="bar"><span class="tm R">${TEAMS.R.ico} ${this.sc.R}</span>${mid}<span class="tm B">${this.sc.B} ${TEAMS.B.ico}</span></div>`;
      const pips = (tm) => [...this.F.values()].filter(f => f.team === tm).map(f => `<i class="${f.alive ? '' : 'x'}" title="${esc(f.name)}"></i>`).join('');
      h += `<div class="pips"><span class="R">${pips('R')}</span><span class="B">${pips('B')}</span></div>`;
      if (me) { const att = me.team === this.att, role = !me.alive && this.inRound() ? `<span class="role dead">💀 OUT · WATCHING ${esc(this.spect ? this.nameOf(this.spect).replace(/^🤖 /, '') : '')}</span>` : this.bomb.id === this.me && this.bomb.st === 'carried' ? '<span class="role att">💣 YOU\'VE GOT THE VINDALOO · PLANT AT A OR B</span>'
          : `<span class="role ${att ? 'att' : 'def'}">${att ? (planted ? '💣 DEFEND THE BOMB' : this.bomb.st === 'dropped' ? '💣 PICK UP THE BOMB' : '💣 ATTACK · PLANT AT A OR B') : planted ? `🔧 DEFUSE IT AT ${this.bomb.s || '?'}!` : '🛡️ DEFEND · GUARD A AND B'}</span>`;
        h += role; } }
    if (h !== this.topHtml) { this.topHtml = h; this.topEl.innerHTML = h; }
  },
  camYaw() { const c = this.g.camera, d = c.getWorldDirection(_v); return Math.atan2(-d.x, -d.z); },
  // the top-left box (main.js hudExtras): health, armour, perks with their timers, the gun
  hudExtras() {
    const me = this.mine(); if (!me || !this.inRound()) return { box: { col: '#ff9f1c', label: '💣 SEARCH & DESTROY', big: this.phase === 'over' ? `${this.sc.R}–${this.sc.B}` : '...', sub: this.phase === 'over' ? 'FULL TIME' : this.phase === 'wait' ? 'PICKING TEAMS' : 'NEXT ROUND', bar: { k: this.phase === 'over' ? 1 : 0.15, col: '#ff9f1c', text: this.phase === 'over' ? 'GAME OVER' : 'GETTING READY' } } };
    const col = TEAMS[me.team].col, hp = Math.ceil(me.hp), G = GUN[this.my.gun], t = this.clock, chips = [];
    if (!me.alive) return { box: { col: '#9fb3d9', label: `💀 OUT · ${me.team === this.att ? 'ATTACK' : 'DEFENCE'}`, big: '0', unit: '❤', sub: 'WATCHING', bar: { k: 0, col: '#555' } } };
    chips.push({ t: `${G.icon} ${this.my.reloadEnd ? 'RELOADING' : this.my.mag + '/' + this.my.reserve}`, c: this.my.mag === 0 ? '#ff5252' : '#ffffff' });
    for (const k in this.my.perks) { const e = this.my.perks[k]; if (!(e > t)) continue; const [ico, nm] = PERKS[k] || ['✨', k]; chips.push({ t: e > 1e8 ? `${ico} ${nm}` : `${ico} ${Math.ceil(e - t)}s`, c: '#ff4fd8', pulse: e < 1e8 && e - t < 4 }); }
    if (this.bomb.id === this.me && this.bomb.st === 'carried') chips.push({ t: '💣 BOMB', c: '#ff9f1c', pulse: true });
    return { box: { col: hp < 35 ? '#ff3b3b' : col, label: `${TEAMS[me.team].ico} ${me.team === this.att ? 'ATTACK' : 'DEFENCE'} · R${this.round}`, big: String(hp), unit: '❤', sub: me.ar > 0 ? `🦺 ${Math.round(me.ar)}` : 'NO ARMOUR', bar: { k: hp / 100, col: hp < 35 ? '#ff3b3b' : hp < 65 ? '#ffd400' : '#39ff14' }, chips } };
  },
  hudLine() { if (!this.inRound()) return 'SEARCH & DESTROY'; const planted = this.bomb.st === 'planted'; return `R${this.round} ${this.sc.R}-${this.sc.B} · ${planted ? '💣 ' : ''}${fmt(planted ? this.bombAt - this.clock : this.endsAt - this.clock)}`; },
  // ---- little messages
  toast(s) { this.pop(s, '#ffd400'); if (this.g.renderer.xr.isPresenting) this.g.showBanner(s, ''); },
  pop(s, col) { const e = this.popEl; if (!e) return; e.textContent = s; e.style.color = col || '#fff'; e.className = ''; void e.offsetWidth; e.className = 'on'; },
  feed(html, mine) { const d = document.createElement('div'); d.innerHTML = html; if (mine) d.className = 'me'; this.feedEl.prepend(d); const most = innerWidth < 760 || innerHeight < 500 ? 3 : 5; while (this.feedEl.children.length > most) this.feedEl.lastChild.remove(); setTimeout(() => d.classList.add('old'), 6500); setTimeout(() => d.remove(), 7400); },
  feedKill(K, V, ico, hs) { const n = (f) => `<span class="${f.team}">${esc(f.name.replace(/^🤖 /, '🤖'))}</span>`; this.feed(K ? `${n(K)} ${ico}${hs ? '🎯' : ''} ${n(V)}` : `${ico} ${n(V)}`, (K && K.id === this.me) || V.id === this.me); },
  splash(col, html, ms) { const sp = this.splashEl; if (!sp) return; sp.style.color = col; sp.innerHTML = `<div>${html}</div>`; sp.classList.remove('on'); void sp.offsetWidth; sp.classList.add('on'); clearTimeout(this.splashT); this.splashT = setTimeout(() => sp.classList.remove('on'), ms || 2500); },
  roundSplash(m) {
    const me = this.mine(); if (!me) return; const att = me.team === this.att, mates = [...this.F.values()].filter(f => f.team === me.team);
    const sw = m.sw ? '<p class="sm">🔁 HALF TIME: THE SIDES HAVE SWAPPED</p>' : '';
    this.splash(att ? '#ff9f1c' : '#4fc3ff', `<p>ROUND ${this.round} · ${TEAMS.R.ico} ${this.sc.R} – ${this.sc.B} ${TEAMS.B.ico}</p><h1>${att ? '💣 ATTACK' : '🛡️ DEFEND'}</h1><p>${TEAMS[me.team].ico} ${TEAMS[me.team].short}</p>${sw}<div class="imgs">${mates.slice(0, 6).map(f => `<img src="${pic(f.char)}" alt="">`).join('')}</div>${this.bomb.id === this.me ? '<p>💣 YOU\'RE CARRYING THE VINDALOO</p>' : ''}`, 2600);
    sfx('sd_round', null, 1); if (this.g.renderer.xr.isPresenting) this.g.showBanner(`ROUND ${this.round} · ${att ? 'ATTACK' : 'DEFEND'}`, 'Y: PICK A GUN');
  },
  hitMarker(kill, hs) { const e = this.hmEl; if (!e) return; e.className = kill ? 'kill' : ''; void e.offsetWidth; e.className = (kill ? 'kill ' : '') + 'on'; const P = this.g.player; for (const h of P.hands || []) if (h.handedness === 'right') h.pulse && h.pulse(kill ? 1 : 0.5, kill ? 120 : 40); },
  // shot: a red flash, an arc pointing at whoever did it, a jolt
  hurt(d, p, hs, by) {
    this.flashEl.className = ''; void this.flashEl.offsetWidth; this.flashEl.className = 'on'; sfx('sd_hurt', null, 0.9);
    const P = this.g.player; for (const h of P.hands || []) h.pulse && h.pulse(0.7, 90); if (P.flatMode) P.flatPitch = Math.max(-1.35, Math.min(1.35, P.flatPitch + (Math.random() - 0.3) * 0.03));
    let from = Array.isArray(p) && p.length === 3 ? new THREE.Vector3(p[0], p[1], p[2]) : this.headOf(by, new THREE.Vector3());
    if (from) { const h = P.head, a = Math.atan2(-(from.x - h.x), -(from.z - h.z)), el = document.createElement('div'); el.className = 'arc'; this.dirEl.appendChild(el); this.dmgDirs.push({ el, a, t: this.clock }); while (this.dmgDirs.length > 4) this.dmgDirs.shift().el.remove(); }
    if (this.g.renderer.xr.isPresenting && this.mine()) this.g.showBanner(`❤ ${Math.ceil(this.mine().hp)}`, hs ? 'HEADSHOT!' : 'YOU\'RE HIT!');
  },
  died(K, g, hs, why) {
    this.my.firing = false; this.my.scoped = false; this.endAct(); sfx('sd_dead', null, 1);
    const verb = why === 'boom' ? 'CURRIED' : why === 'left' ? 'OUT' : g ? VERB[g.id] || 'OUT' : 'OUT', who = K && K.id !== this.me ? K.name.replace(/^🤖 /, '') : null;
    this.splash('#ff5252', `<p>💀 YOU'RE OUT FOR THE ROUND</p><h1>${verb}${who ? ' BY ' + esc(who.toUpperCase()) : '!'}</h1>${K && K.id !== this.me ? `<div class="imgs"><img src="${pic(K.char)}" alt=""></div><p>${g ? g.icon + ' ' + esc(g.name) : ''}${hs ? ' · 🎯 HEADSHOT' : ''}</p>` : ''}<p class="sm">You're watching your team now. Back next round.</p>`, 3200);
    if (this.g.renderer.xr.isPresenting) this.g.showBanner(`${verb}${who ? ' BY ' + who.toUpperCase() : ''}`, 'WATCHING · BACK NEXT ROUND');
    this.spect = null; this.doWatch(true);
  },

  // ------------------------------------------------------------------ guns: yours, and everyone else's
  guns(dt, me, xr) {
    const P = this.g.player, t = this.clock, alive = !!(me && me.alive && this.inRound()), G = GUN[this.my.gun];
    for (const id in this.kick) this.kick[id] = Math.max(0, this.kick[id] - dt * 8);
    // a phone or computer: in front of the camera, bottom right: kicks back on each shot, dips for a reload, bobs as you walk
    const flatOn = alive && !xr && P.flatMode && !!P.camera && !this.my.scoped && !this.pickOpen;
    if (flatOn && (!this.vGun || this.vGun.userData.gun !== this.my.gun)) { if (this.vGun && this.vGun.parent) this.vGun.parent.remove(this.vGun); this.vGun = newGun(this.my.gun); this.vGun.traverse(o => { o.frustumCulled = false; }); P.camera.add(this.vGun); }
    if (this.vGun) { this.vGun.visible = flatOn; if (flatOn) { const m = gunModel(this.my.gun), k = this.kick[this.me] || 0, mv = P.flatMove ? Math.min(1, Math.hypot(P.flatMove.x, P.flatMove.z)) : 0, bob = Math.sin(t * 8) * 0.006 * mv;
        let dip = 0, roll = 0; if (this.my.reloadEnd) { const L = this.my.reloadLen || 1, f = 1 - Math.max(0, this.my.reloadEnd - t) / L, s = Math.sin(Math.min(1, f) * Math.PI); dip = s * 0.09; roll = s * 0.7; }
        const draw = this.drawT == null ? 0 : Math.max(0, 1 - (t - this.drawT) * 3); if (this.drawGun !== this.my.gun) { this.drawGun = this.my.gun; this.drawT = t; }
        // (sized to the screen: an upright phone sees less across, so the gun's smaller and further in; its stock just
        // in front of the lens, never through it)
        const asp = this.g.camera.aspect || 1, sc = asp < 1 ? 0.5 : 0.58, x0 = asp < 1 ? 0.085 : 0.13, z0 = (asp < 1 ? -0.27 : -0.26) - Math.max(0, m.rear) * sc;
        this.vGun.scale.setScalar(sc); this.vGun.position.set(x0, (asp < 1 ? -0.17 : -0.14) + bob - dip - draw * 0.15 + k * 0.01, z0 + k * 0.035 * (G.dmg > 50 ? 2 : 1)); this.vGun.rotation.set(k * 0.25 - dip * 3 + draw * 0.8, 0.05, roll);
        const sp = this.vGun.getObjectByName('spin'); if (sp) sp.rotation.z += dt * 40 * (this.my.spin / (G.spin || 1)); } }
    const grip = P.flatGrip; if (grip) { if (flatOn && grip.visible) { grip.visible = false; this.gripHid = true; } else if (!flatOn && this.gripHid && !this.my.scoped) { grip.visible = true; this.gripHid = false; } }
    // the sniper's scope: zoomed right in
    const cam = this.g.camera; if (!xr && cam) { const want = alive && this.my.scoped; if (want && !this.scopedNow) { this.fov0 = cam.fov; cam.fov = this.fov0 * 0.28; cam.updateProjectionMatrix(); this.scopedNow = true; } else if (!want && this.scopedNow) { cam.fov = this.fov0 || cam.fov; cam.updateProjectionMatrix(); this.scopedNow = false; } }
    // VR: on the right controller
    const h = xr ? (P.hands || []).find(h => h.source && h.handedness === 'right' && h.ctrl) : null, vrOn = alive && !!h;
    if (vrOn && (!this.vrGun || this.vrGun.userData.gun !== this.my.gun)) { if (this.vrGun && this.vrGun.parent) this.vrGun.parent.remove(this.vrGun); this.vrGun = newGun(this.my.gun); }
    if (this.vrGun) { if (vrOn && this.vrGun.parent !== h.ctrl) h.ctrl.add(this.vrGun); if (!vrOn && this.vrGun.parent) this.vrGun.parent.remove(this.vrGun); this.vrGun.visible = vrOn;
      if (vrOn) { const k = this.kick[this.me] || 0; let dip = 0; if (this.my.reloadEnd) { const f = 1 - Math.max(0, this.my.reloadEnd - t) / (this.my.reloadLen || 1); dip = Math.sin(Math.min(1, f) * Math.PI); } this.vrGun.position.set(0, -0.03, 0.05 + k * 0.04); this.vrGun.rotation.set(k * 0.3 - dip * 0.9, 0, dip * 0.8); const sp = this.vrGun.getObjectByName('spin'); if (sp) sp.rotation.z += dt * 40 * (this.my.spin / (G.spin || 1)); } }
    // everyone else's: in their right hand, pointing where they look
    const live = new Set();
    if (this.inRound()) for (const [id, f] of this.F) { if (id === this.me || !f.alive) continue; const av = this.avatar(id); if (!av || !av.handPos) continue;
      let q = null; if (f.bot) { const bp = this.host && this.bots && this.bots.get(id) ? this.bots.get(id) : this.botPose.get(id); if (bp) { _e.set(bp.pitch || 0, bp.yaw, 0, 'YXZ'); q = _q.setFromEuler(_e); } }
      else { const np = this.net.players.get(id); if (np && np.pose && Array.isArray(np.pose.q)) q = _q.set(...np.pose.q); }
      if (!q) continue; const hp = av.handPos(); if (!hp || !isFinite(hp.x)) continue;
      let gm = this.rGuns.get(id); if (gm && gm.userData.gun !== f.gun) { this.grp.remove(gm); gm = null; } if (!gm) { gm = newGun(f.gun); gm.scale.setScalar(1.1); this.grp.add(gm); this.rGuns.set(id, gm); }
      live.add(id); av.gunArm = true; gm.visible = !(av.emote && av.emote.active); gm.quaternion.copy(q); gm.position.copy(hp); const k = this.kick[id] || 0; gm.rotateX(k * 0.3); const sp = gm.getObjectByName('spin'); if (sp && k > 0) sp.rotation.z += dt * 30; }
    for (const [id, gm] of this.rGuns) if (!live.has(id)) { this.grp.remove(gm); this.rGuns.delete(id); const av = this.avatar(id); if (av) av.gunArm = false; }
  },

  // ------------------------------------------------------------------ effects
  tracer(a, b, G, mine) {
    if (!tracerGeo) { tracerGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true); tracerGeo.rotateX(Math.PI / 2); tracerGeo.translate(0, 0, 0.5); }
    const d = a.distanceTo(b); if (d < 0.05) return; const tr = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: G.tr || 0xfff3c4, transparent: true, opacity: 0.9, depthWrite: false }));
    const w = (mine ? 0.006 : 0.011) * (G.id === 'sausage' ? 1.8 : G.id === 'beans' ? 1.4 : 1); tr.position.copy(a); tr.lookAt(b); tr.scale.set(w, w, d); tr.frustumCulled = false; tr.userData.t = 0; tr.userData.life = G.id === 'sausage' ? 0.35 : 0.12; this.grp.add(tr); (this.shots || (this.shots = [])).push(tr);
  },
  flash(at, G) {
    if (!flashGeo) flashGeo = new THREE.OctahedronGeometry(0.06); const fl = new THREE.Mesh(flashGeo, new THREE.MeshBasicMaterial({ color: G.id === 'monstor' ? 0xb4ff6a : 0xffd23f, transparent: true, opacity: 1, depthWrite: false }));
    fl.position.copy(at); fl.rotation.set(Math.random() * 3, Math.random() * 3, 0); fl.scale.setScalar(G.pellets > 1 || G.dmg > 50 ? 1.6 : 1); fl.userData.t = 0; fl.userData.life = 0.07; fl.userData.grow = 1; this.grp.add(fl); (this.shots || (this.shots = [])).push(fl);
  },
  // where a shot landed (not on anyone): a splat in the gun's own colour (ketchup, beans, cheese...)
  impact(at, G) { this.burst(at, [G.tr || 0xdddddd, 0xbfbfbf, 0xffffff], G.pellets > 1 ? 2 : 5, 0.8); },
  burst(at, cols, n = 10, speed = 1.8) {
    if (!bitGeo) bitGeo = new THREE.OctahedronGeometry(0.028); const fx = this.fx || (this.fx = []); if (fx.length > 160) return;
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(bitGeo, new THREE.MeshBasicMaterial({ color: cols[i % cols.length], transparent: true, depthWrite: false })); m.position.copy(at); const a = Math.random() * Math.PI * 2, u = Math.random();
      m.userData.v = new THREE.Vector3(Math.cos(a) * speed * (0.4 + u), 1 + Math.random() * 2, Math.sin(a) * speed * (0.4 + u)); m.userData.t = 0; this.grp.add(m); fx.push(m); }
  },
  // THE VINDALOO GOES OFF: a fireball of curry, everyone near it is out, the screen shakes
  explode() {
    const B = this.bomb, at = B.p ? new THREE.Vector3(B.p[0], this.floor(B.p[0], B.p[1]) + 0.4, B.p[1]) : null; if (!at || this.boomFx) return; this.boomFx = 1;
    sfx('sd_boom', at, 1.4); this.burst(at, [0xff6d00, 0xffd400, 0xc1440e, 0x8a3a22, 0xffffff], 60, 6);
    if (!boomGeo) boomGeo = new THREE.SphereGeometry(1, 20, 14); const ball = new THREE.Mesh(boomGeo, new THREE.MeshBasicMaterial({ color: 0xff8a1a, transparent: true, opacity: 0.85, depthWrite: false })); ball.position.copy(at); ball.userData.t = 0; ball.userData.life = 0.9; ball.userData.boom = 1; this.grp.add(ball); (this.shots || (this.shots = [])).push(ball);
    this.g.words && this.g.words.show('💥 CURRY EVERYWHERE!', at.clone().add({ x: 0, y: 2.2, z: 0 }), '#ff9f1c', 0.5, 2.2);
    const P = this.g.player, d = Math.hypot(P.head.x - at.x, P.head.z - at.z); if (d < 25) { const k = 1 - d / 25; for (const h of P.hands || []) h.pulse && h.pulse(k, 300); if (P.flatMode) { let n = 0; const shake = () => { if (n++ > 10 || this.disposed) return; P.flatPitch += (Math.random() - 0.5) * 0.06 * k; P.flatYaw += (Math.random() - 0.5) * 0.06 * k; setTimeout(shake, 35); }; shake(); } }
    this.feed('💥 THE VINDALOO WENT OFF');
  },
  animFx(dt) {
    if (this.shots) this.shots = this.shots.filter(m => { const u = m.userData; u.t += dt; const k = u.t / u.life; if (k >= 1) { this.grp.remove(m); m.material.dispose(); return false; } m.material.opacity = (u.boom ? 0.85 : 1) * (1 - k); if (u.grow) m.scale.multiplyScalar(1 + dt * 12); if (u.boom) m.scale.setScalar(0.5 + Math.sqrt(k) * 7); return true; });
    if (this.fx) this.fx = this.fx.filter(m => { const u = m.userData; u.t += dt; u.v.y -= 7 * dt; m.position.addScaledVector(u.v, dt); m.rotation.x += dt * 8; m.material.opacity = Math.max(0, 1 - u.t / 0.9); if (u.t > 0.9) { this.grp.remove(m); m.material.dispose(); return false; } return true; });
  },
};
