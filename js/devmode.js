// DEVELOPER MODE (Settings cog -> DEVELOPER MODE): a test bench in the Oysterfleet.
//   EMOTES    pick anyone in the squad: they appear in front of you and do any of their emotes (or all of them in turn)
//   ATTACKS   set off any character's attack on you, there and then
//   IMPOSTER  play any Imposter job (and the two sabotage fixes) straight away, without a game
//   SOUNDS    every sound effect by name, with a play button and a search box, to audition them all
//   MODELS    any character (Ronnie, Tommy, the squad, the punters) at any of the 10 sizes, on a turntable in front of
//             you: one, all ten sizes in a row, or everyone at one size; idle, walking, running or an emote; a camera
//             to look at them. They're the very bodies other players see (a player's body at that stage: main.js)
//   MULTIPLAYER  a test room: you host a real room with as many fake players (fakeplayers.js) as you pick, 1 to 11,
//             who join, ready up and play along in every mode, so any mode can be tried with a crowd on your own
// Nothing here changes the game itself: the random attacks are switched off while it's open, that's all.
import * as THREE from 'three';
import { EMOTES, CHAR_EMOTES, emoteInfo } from './emotes.js';
import { TASKS, makeCamFeeds } from './imposter.js';
import { Panel, makeGame } from './impgames.js';
import { SQUAD } from './squad.js';
import { POWERUPS } from './powerups.js';
import { SOUND_NAMES, SOUND_GROUPS, sfx, initAudio } from './audio.js';
import { STAGES } from './config.js';
import { makePunter } from './runpub.js';

const KIND_ICON = { hold: '🍺', crank: '⚙️', swipe: '💳', wires: '🔌', collect: '🧺', plunge: '🪠', order: '📖', scrub: '🧽', code: '🔢', dial: '⏲️', switches: '💡', reels: '🍒', catch: '🧻', temp: '🍟', sort: '🍽️', whack: '🍺', simon: '🕒', place: '🍴', light: '🕯️', stacker: '🍹', sweep: '🧹', pipes: '🚧', coupler: '🛢️', raise: '⛱️', wine: '🍷', fold: '🧻', bulbs: '💡', grill: '🍔', water: '🌸', net: '🥫' };
const NAME = (id) => id === 'tommy' ? 'TOMMY' : ((SQUAD[id] && SQUAD[id].name) || id).toUpperCase();

export function startDev(RS) {
  window.__devMode = true;
  const P = RS.player, D = RS.director;
  // ---- the look
  const st = document.createElement('style'); st.textContent = `
  #dev-btn { position: fixed; left: 50%; bottom: max(14px, env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 72; font: 900 15px 'Courier New', monospace; letter-spacing: 1px; color: #39ff14; background: rgba(0,10,2,0.92); border: 2px solid #39ff14; border-radius: 10px; padding: 8px 16px; box-shadow: 0 0 16px rgba(57,255,20,0.6); cursor: pointer; text-shadow: 0 0 6px #39ff14; }
  body.snd.sd-touch #dev-btn { bottom: calc(max(14px, env(safe-area-inset-bottom)) + 124px); }      /* (SEARCH AND DESTROY on a phone: above its RELOAD / GUNS / FIRE row, not over GUNS) */
  body.paused #dev-btn, body.paused #dev-panel { display: none !important; }      /* (the pause menu's own BACK buttons sit where this would be) */
  #dev-btn:active { transform: translateX(-50%) translateY(2px); box-shadow: 0 1px 0 #111; }
  #dev-panel { position: fixed; left: 50%; bottom: calc(max(14px, env(safe-area-inset-bottom)) + 52px); transform: translateX(-50%); width: min(94vw, 560px); max-height: min(62vh, 520px); z-index: 72; display: none; flex-direction: column;
    background: rgba(0,10,2,0.95); border: 2px solid #39ff14; border-radius: 12px; box-shadow: 0 0 30px rgba(57,255,20,0.45), inset 0 0 40px rgba(57,255,20,0.08); color: #b8ffb0; font: 700 14px 'Courier New', monospace; overflow: hidden; }
  #dev-panel::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 2px, transparent 2px 4px); }
  #dev-panel.on { display: flex; }
  #dev-panel .dv-tabs { display: flex; gap: 6px; padding: 10px 10px 6px; }
  #dev-panel .dv-tabs { flex-wrap: wrap; }
  #dev-panel .dv-tabs button { flex: 1 1 40%; font: 900 13px 'Courier New', monospace; padding: 9px 4px; border-radius: 10px; border: 2px solid #39ff14; background: transparent; color: #39ff14; cursor: pointer; }
  #dev-panel .dv-tabs button.on { background: #39ff14; color: #111; }
  #dev-panel .dv-body { overflow-y: auto; padding: 4px 10px 12px; -webkit-overflow-scrolling: touch; }
  #dev-panel h5 { margin: 10px 2px 6px; color: #39ff14; font: 900 13px 'Courier New', monospace; letter-spacing: 1px; text-shadow: 0 0 6px #39ff14; }
  #dev-panel h5::before { content: '> '; }
  #dev-panel .dv-row { display: flex; flex-wrap: wrap; gap: 6px; }
  #dev-panel .dv-chip, #dev-panel .dv-act { font: 800 13px 'Courier New', monospace; padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(57,255,20,0.45); background: rgba(57,255,20,0.06); color: #c8ffc0; cursor: pointer; text-align: left; }
  #dev-panel .dv-chip.on { border-color: #39ff14; background: #39ff14; color: #001a00; box-shadow: 0 0 12px #39ff14; }
  #dev-panel .dv-act { display: flex; align-items: center; gap: 8px; width: 100%; }
  #dev-panel .dv-act i { font-style: normal; font-size: 18px; }
  #dev-panel .dv-act small { margin-left: auto; color: #4fbf4a; font-weight: 700; }
  #dev-panel .dv-act:active, #dev-panel .dv-chip:active { transform: scale(0.97); }
  #dev-panel .dv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr)); gap: 6px; }
  #dev-panel .dv-wide { background: #39ff14; color: #001a00; border-color: #b8ffb0; justify-content: center; font-weight: 900; box-shadow: 0 0 12px rgba(57,255,20,0.6); }
  #dev-panel .dv-note { color: #6fdf6a; font-weight: 600; font-size: 12px; margin: 2px 2px 6px; }
  #dev-panel .dv-note::before { content: '// '; }
  #dev-panel .dv-search { width: 100%; box-sizing: border-box; font: 800 14px 'Courier New', monospace; padding: 9px 10px; margin: 2px 0 4px; border-radius: 6px; border: 1px solid #39ff14; background: rgba(0,0,0,0.6); color: #b8ffb0; }
  #dev-panel .dv-fk { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 10px 0; } #dev-panel .dv-fk > div { text-align: center; } #dev-panel .dv-fk b { display: block; font-size: 44px; color: #39ff14; text-shadow: 0 0 12px #39ff14; line-height: 1; } #dev-panel .dv-fk small { font-size: 11px; color: #6fdf6a; }
  #dev-panel .dv-fkb { width: 54px; height: 54px; justify-content: center; font-size: 26px; } #dev-panel .dv-fkq { justify-content: center; margin-bottom: 10px; } #dev-panel .dv-fkq .dv-chip { min-width: 44px; text-align: center; }
  #dev-panel .dv-snd { grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr)); }
  #dev-panel .dv-snd .dv-act { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #dev-panel .dv-snd .dv-act.on { background: #39ff14; color: #001a00; }
  #dev-panel .dv-mnav { display: flex; align-items: center; gap: 8px; margin: 6px 0; } #dev-panel .dv-mnav b { flex: 1; text-align: center; font-size: 20px; color: #39ff14; text-shadow: 0 0 10px #39ff14; } #dev-panel .dv-mnav .dv-act { width: 54px; justify-content: center; font-size: 22px; }
  #dev-panel .dv-mz .dv-chip { min-width: 34px; text-align: center; padding: 8px 6px; } #dev-panel .dv-mrow { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 140px), 1fr)); gap: 6px; margin: 6px 0; } #dev-panel .dv-mrow .dv-act { justify-content: center; }
  #dev-tag { position: fixed; top: max(8px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); z-index: 72; font: 900 12px 'Courier New', monospace; letter-spacing: 1px; color: #39ff14; background: rgba(0,10,2,0.9); border: 1px solid #39ff14; padding: 3px 10px; border-radius: 6px; pointer-events: none; text-shadow: 0 0 6px #39ff14; box-shadow: 0 0 12px rgba(57,255,20,0.5); }`;
  document.head.appendChild(st);
  const btn = document.createElement('button'); btn.id = 'dev-btn'; btn.textContent = '>_ DEV'; document.body.appendChild(btn);
  const tag = document.createElement('div'); tag.id = 'dev-tag'; tag.textContent = '>_ DEVELOPER MODE'; document.body.appendChild(tag);
  const panel = document.createElement('div'); panel.id = 'dev-panel'; document.body.appendChild(panel);
  ['pointerdown', 'touchstart', 'mousedown', 'wheel'].forEach(k => { panel.addEventListener(k, (e) => e.stopPropagation()); btn.addEventListener(k, (e) => e.stopPropagation()); });
  ['keydown', 'keyup'].forEach(k => panel.addEventListener(k, (e) => { if (e.target.matches && e.target.matches('input')) e.stopPropagation(); }));      // (typing in the sound search doesn't walk you about)
  const open = (on) => { panel.classList.toggle('on', on); btn.textContent = on ? '[ X ] CLOSE' : '>_ DEV'; };
  btn.addEventListener('click', () => open(!panel.classList.contains('on')));

  // ---- the random attacks stay off while you test
  // ---- nobody attacks you unless you ask: always free roam (the squad wandering about, no attack countdown), and Tommy
  // never starts anything himself (he's only "on" while he's doing the attack you set off, then he's off again)
  if (D && D.fullMode !== 'roam' && D.fullMode !== 'roam0') { try { RS.newGame('roam'); } catch (e) { console.warn('dev', e); } }
  // (only ever switched once: it used to try every second if the game wasn't plain free roam, which could restart
  // the game over and over until a phone ran out of memory)
  const quiet = () => { if (D) D.nextAttackT = Math.max(D.nextAttackT || 0, 600);
    const t = RS.tommy; if (t) { t.directed = true; t.attacks = !!(t.devTrip && t.busyAttacking); if (t.devTrip && !t.attacks) t.devTrip = false; } };

  // ---- EMOTES: a stand-in of the character, a couple of metres in front of you, facing you
  let pup = null, pupChar = null, queue = [], pupAt = null;
  const spawnPup = (ch) => {
    if (pup && pupChar === ch) return pup; if (pup) { try { pup.dispose(); } catch (e) {} pup = null; }
    const f = new THREE.Vector3(P.fwd.x, 0, P.fwd.z).normalize(); pupAt = P.head.clone().addScaledVector(f, 2.3);
    pup = RS.net.makeAvatar({ id: 'dev_' + ch, name: NAME(ch), char: ch }); pupChar = ch; return pup; };
  const pose = () => { const d = new THREE.Vector3(P.head.x - pupAt.x, 0, P.head.z - pupAt.z), yaw = Math.atan2(-d.x, -d.z), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
    const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), fw = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const fy = RS.floorAt ? RS.floorAt(pupAt.x, pupAt.z) || 0 : 0, l = pupAt.clone().addScaledVector(side, -0.25).addScaledVector(fw, 0.1), rh = pupAt.clone().addScaledVector(side, 0.25).addScaledVector(fw, 0.15);
    return { t: 'p', c: pupChar, h: [pupAt.x, fy + 1.62, pupAt.z], q: [q.x, q.y, q.z, q.w], l: [l.x, fy + 1.0, l.z], rh: [rh.x, fy + 1.05, rh.z], s: 1, st: 0, flat: 1 }; };
  const play = (ch, id) => { const p = spawnPup(ch); if (!p) return; queue = []; setTimeout(() => p === pup && p.doEmote(id), pup && p.__ready ? 0 : 600); p.__ready = true; open(false); };
  const playAll = (ch) => { const ids = EMOTES.map(e => e.id).concat((CHAR_EMOTES[ch] || []).map(e => e.id)); const p = spawnPup(ch); if (!p) return; queue = ids.slice(); p.__ready = true; nextQ = 0.6; open(false); };
  let nextQ = 0;

  // ---- ATTACKS: the character comes in a couple of metres in front of you and does it
  const attack = (who, key) => {
    const c = RS.cast.find(x => x.id === who) || (who === 'tommy' ? RS.tommy : null); if (!c) return toast('THEY\'RE NOT IN THIS GAME');
    if (pup) { try { pup.dispose(); } catch (e) {} pup = null; pupChar = null; queue = []; }      // (the emote stand-in would be in their way)
    for (const o of RS.cast) if (o.state === 'act') o.state = 'idle';
    const fx = D.g.fx; fx && fx.endCutscene && fx.endCutscene(); fx && fx.hideCard && fx.hideCard(); P.clearEffects && P.clearEffects(); D.pending = null;
    const f = new THREE.Vector3(P.fwd.x, 0, P.fwd.z).normalize(); 
    if (c === RS.tommy) { c.attacks = true; c.devTrip = true; c.directed = true; }
    const ok = D.launch({ c, attack: { key } }); if (!ok) return toast('THEY\'RE BUSY: TRY AGAIN IN A SECOND');
    open(false); };

  // ---- IMPOSTER JOBS: the job's own game, straight away
  const jobs = new Panel({ scene: RS.scene, player: P, renderer: RS.renderer });
  const job = (kind, o, name) => { open(false); jobs.show(makeGame(kind, o), { onDone: () => toast('✅ ' + name.toUpperCase() + ': DONE') }); };

  // ---- MODELS: anyone, at any of the 10 sizes, on a turntable in front of you. Each one is the same body another
  // player sees when someone playing as that character has grown to that stage (net.makeAvatar: main.js's SquadPuppet,
  // given that stage and that size), so what you see here is exactly what players get
  const PUNTERS = [['old', 'OLD BOY'], ['lad', 'LAD'], ['dad', 'DAD'], ['mum', 'MUM'], ['kid', 'KID'], ['hool', 'FOOTY FAN']];
  const mChars = ['ronnie', 'tommy', ...Object.keys(SQUAD).filter(id => id !== 'ronnie' && !/^p\d+$/.test(id) && !SQUAD[id].playerOnly), ...PUNTERS.map(([k]) => 'punter:' + k)];
  const mName = (ch) => ch.startsWith('punter:') ? 'PUNTER: ' + PUNTERS.find(x => 'punter:' + x[0] === ch)[1] : NAME(ch);
  const M = { ch: 'ronnie', size: 1, view: null, anim: 'idle', figs: [], cam: null, back: null, punters: new Map(), center: null, span: 1, emoteI: 0 };
  const ringGeo = new THREE.RingGeometry(0.42, 0.5, 40); ringGeo.rotateX(-Math.PI / 2);
  const tickGeo = new THREE.BoxGeometry(0.06, 0.012, 0.16);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x39ff14, transparent: true, opacity: 0.85, depthWrite: false });
  const punterId = (kind) => { let id = M.punters.get(kind); if (!id || !SQUAD[id]) { id = makePunter(kind); M.punters.set(kind, id); } return id; };      // (one look per kind while they're out: the same person at every size)
  const mDrop = () => { for (const f of M.figs) { try { f.av.dispose(); } catch (e) {} RS.scene.remove(f.ring); } M.figs = []; };
  const mClear = () => { mDrop(); M.view = null; camBack(); for (const id of M.punters.values()) delete SQUAD[id]; M.punters.clear(); };
  // one body: character ch at size n (1-10) standing at x,z
  const mFig = (ch, n, x, z, yaw) => {
    const st = n - 1, char = ch.startsWith('punter:') ? punterId(ch.slice(7)) : ch;
    const av = RS.net.makeAvatar({ id: 'model_' + ch + '_' + n, name: mName(ch).replace('PUNTER: ', '') + ' · SIZE ' + n, char }); if (!av) return null;
    av.fatNow = Math.min(1, st / (STAGES.length - 1)); av.sNow = STAGES[st].scale;      // (straight to that size: a player's body eases into it)
    const fy = RS.floorAt ? RS.floorAt(x, z) || 0 : 0, ring = new THREE.Group(); ring.add(new THREE.Mesh(ringGeo, ringMat)); const tk = new THREE.Mesh(tickGeo, ringMat); tk.position.set(0, 0.006, -0.5); ring.add(tk);
    ring.position.set(x, fy + 0.008, z); ring.scale.setScalar(STAGES[st].scale * (1 + 0.55 * av.fatNow) * 0.95); RS.scene.add(ring);
    const f = { av, ch, char, n, st, x, z, fy, yaw, ring, a: 0 }; M.figs.push(f); return f; };
  const mPose = (f, dt) => {
    const s = STAGES[f.st].scale, r = 0.85 * s; let x = f.x, z = f.z, yaw;
    if (M.anim === 'walk' || M.anim === 'run') { const v = M.anim === 'run' ? 3.1 : 1.25; f.a += dt * v / r; x = f.x + Math.cos(f.a) * r; z = f.z + Math.sin(f.a) * r; yaw = Math.atan2(-Math.sin(f.a), Math.cos(f.a)); }      // (round the turntable at walking or running pace)
    else { f.yaw += dt * 0.5; yaw = f.yaw; }      // (standing on the turntable as it turns)
    f.ring.rotation.y = yaw;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw - Math.PI, 0, 'YXZ')), fw = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const l = new THREE.Vector3(x, 0, z).addScaledVector(side, 0.25 * s).addScaledVector(fw, 0.1), rh = new THREE.Vector3(x, 0, z).addScaledVector(side, -0.25 * s).addScaledVector(fw, 0.15);
    return { t: 'p', c: f.char, h: [x, f.fy + 1.62 * s, z], q: [q.x, q.y, q.z, q.w], l: [l.x, f.fy + 1.0 * s, l.z], rh: [rh.x, f.fy + 1.05 * s, rh.z], s, st: f.st, flat: 1 }; };
  // what's on show: 'one' (the character at the size), 'sizes' (them at 1 to 10), 'all' (everyone at the size)
  const mShow = (view) => {
    mDrop(); if (pup) { try { pup.dispose(); } catch (e) {} pup = null; pupChar = null; queue = []; }
    M.view = view; if (!view) return;
    const fw = new THREE.Vector3(P.fwd.x, 0, P.fwd.z).normalize(), right = new THREE.Vector3(-fw.z, 0, fw.x), face = Math.atan2(-fw.x, -fw.z);      // (facing you)
    const list = view === 'one' ? [[M.ch, M.size]] : view === 'sizes' ? STAGES.map((_, i) => [M.ch, i + 1]) : mChars.map(c => [c, M.size]);
    const w = list.map(([, n]) => 1.05 * STAGES[n - 1].scale * (1 + 0.55 * (n - 1) / (STAGES.length - 1)) + 0.3);
    // in rows of up to 13m (everyone at the biggest size is wider than most rooms): each row behind the last, staggered
    const rows = []; let cur = [], cw = 0; list.forEach((x, i) => { if (cur.length && cw + w[i] > 13) { rows.push(cur); cur = []; cw = 0; } cur.push(i); cw += w[i]; }); if (cur.length) rows.push(cur);
    const gap = Math.max(...w) * 1.15, dist = view === 'one' ? 2.6 : 3.4;
    let span = 0; rows.forEach((r, k) => { const rw = r.reduce((a, i) => a + w[i], 0); span = Math.max(span, rw); let at = -rw / 2 + (k % 2 ? Math.min(w[r[0]] / 2, 0.6) : 0);
      for (const i of r) { const c = at + w[i] / 2; at += w[i]; const p = P.head.clone().addScaledVector(fw, dist + k * gap).addScaledVector(right, c); mFig(list[i][0], list[i][1], p.x, p.z, face); } });
    const mid = P.head.clone().addScaledVector(fw, dist + (rows.length - 1) * gap / 2); mid.y = 0;
    M.center = mid; M.span = span; M.depth = (rows.length - 1) * gap; M.fw = fw; if (M.cam) camOn(); };
  const mAnimate = (a) => { if (a !== 'emote') { M.anim = a; return; } const ids = EMOTES.map(e => e.id), id = ids[M.emoteI++ % ids.length]; M.anim = 'idle'; for (const f of M.figs) f.av.doEmote(id); toast('▶ ' + (emoteInfo(id) || { name: id }).name); };
  // the camera: on a phone or a computer its own camera, out in front of them and slowly drifting round (main.js draws
  // with window.__devCam); in a headset you're turned to face them. BACK puts it all back
  const camOn = () => { if (!M.center) return; const vrNow = RS.renderer.xr && RS.renderer.xr.isPresenting;
    if (vrNow) { if (!M.back) M.back = { yaw: P.rig.rotation.y }; P.faceToward(M.center.x, M.center.z, 0.4); M.cam = 'vr'; return; }
    if (!M.cam || M.cam === 'vr') M.cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 200); M.camT = 0; window.__devCam = () => M.cam && M.cam !== 'vr' ? M.cam : null; camStep(0); };
  const camBack = () => { if (M.cam === 'vr' && M.back) P.rig.rotation.y = M.back.yaw; M.back = null; M.cam = null; window.__devCam = null; };
  // (out in front and above them, far enough back to get them all in, never out of the level: in close, it widens)
  const camStep = (dt) => { const c = M.cam; if (!c || c === 'vr' || !M.center) return; M.camT += dt; c.aspect = innerWidth / innerHeight;
    const big = M.figs.reduce((m, f) => Math.max(m, STAGES[f.st].scale), 1), fy = M.figs.length ? M.figs[0].fy : 0, V = THREE.MathUtils;
    const fitW = (M.span / 2 + 0.6) / Math.tan(Math.atan(Math.tan(V.degToRad(30)) * c.aspect)), want = Math.max(3.2 * big, fitW + M.depth / 2);
    const a = Math.sin(M.camT * 0.25) * 0.3, dir = M.fw.clone().multiplyScalar(-1).applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
    const b = RS.room && RS.room.bounds; let d = want;
    if (b) for (let k = 0; k < 40; k++) { const x = M.center.x + dir.x * d, z = M.center.z + dir.z * d; if (x > b.x0 + 0.5 && x < b.x1 - 0.5 && z > b.z0 + 0.5 && z < b.z1 - 0.5) break; d *= 0.92; }
    const top = b && b.y1 ? b.y1 - 0.3 : 99; c.position.set(M.center.x + dir.x * d, Math.min(top, fy + 1.2 * big + d * 0.3), M.center.z + dir.z * d); c.lookAt(M.center.x, fy + 0.85 * big, M.center.z);
    const need = 2 * Math.atan((M.span / 2 + 0.6) / Math.max(1, d - M.depth / 2)), vfov = 2 * Math.atan(Math.tan(need / 2) / c.aspect);
    c.fov = V.clamp(V.radToDeg(vfov), 50, 100); c.updateProjectionMatrix(); };
  window.__devModels = { M, show: mShow, clear: mClear, animate: mAnimate, cam: (on) => on ? camOn() : camBack(), chars: mChars };
  window.addEventListener('pagehide', mClear);

  // ---- a little message
  const toastEl = document.createElement('div'); Object.assign(toastEl.style, { position: 'fixed', top: '64px', left: '50%', transform: 'translateX(-50%)', zIndex: 73, background: '#111', color: '#39ff14', font: '900 14px system-ui, sans-serif', padding: '8px 14px', borderRadius: '10px', display: 'none' }); document.body.appendChild(toastEl);
  let toastT = null; function toast(t) { toastEl.textContent = t; toastEl.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => { toastEl.style.display = 'none'; }, 2200); }

  // ---- the panel's pages
  const chars = ['tommy', ...Object.keys(CHAR_EMOTES).filter(c => c !== 'tommy')].filter(c => c === 'tommy' || SQUAD[c]);
  let tab = 'emotes', sel = chars[0], sq = '', nFake = (() => { try { return Math.max(1, Math.min(11, +localStorage.getItem('rs_dev_nfake') || 3)); } catch (e) { return 3; } })();
  // the sound board: audio.js's groups, then anything that isn't in one
  const soundGroups = () => { const seen = new Set(), g = SOUND_GROUPS.map(([n, l]) => [n, l.filter(s => SOUND_NAMES.includes(s) && !seen.has(s) && seen.add(s))]);
    g.push(['EVERYTHING ELSE', SOUND_NAMES.filter(s => !seen.has(s))]); return g.filter(x => x[1].length); };
  const filterSounds = () => { const q = sq.trim().toLowerCase();
    panel.querySelectorAll('.dv-sgrp').forEach(grp => { let n = 0; grp.querySelectorAll('[data-snd]').forEach(b => { const on = !q || b.dataset.snd.includes(q); b.style.display = on ? '' : 'none'; n += on; }); grp.style.display = n ? '' : 'none'; }); };
  const render = () => {
    const T = (id, label) => `<button data-tab="${id}" class="${tab === id ? 'on' : ''}">${label}</button>`;
    let body = '';
    if (tab === 'emotes') {
      body += `<div class="dv-note">Pick someone, then tap an emote: they do it in front of you.</div><div class="dv-row">${chars.map(c => `<button class="dv-chip ${c === sel ? 'on' : ''}" data-ch="${c}">${NAME(c)}</button>`).join('')}</div>`;
      body += `<h5>${NAME(sel)}'S EMOTES</h5><div class="dv-grid"><button class="dv-act dv-wide" data-all="${sel}">▶ PLAY THEM ALL IN TURN</button>`;
      for (const e of (CHAR_EMOTES[sel] || [])) body += `<button class="dv-act" data-em="${e.id}"><i>${e.icon || '🎭'}</i>${e.name}<small>${e.dur}s</small></button>`;
      body += `</div><h5>EVERYONE'S EMOTES</h5><div class="dv-grid">${EMOTES.map(e => `<button class="dv-act" data-em="${e.id}"><i>${e.icon || '🎭'}</i>${e.name}<small>${e.dur}s</small></button>`).join('')}</div>`;
    } else if (tab === 'attacks') {
      const list = D.attackList ? D.attackList() : [];
      body += `<div class="dv-note">Tap one: that person comes up and does it to you.</div><div class="dv-grid">`;
      for (const [who, a] of list) body += `<button class="dv-act" data-who="${who}" data-key="${a.key}"><i>${a.icon}</i>${a.title}<small>${NAME(who)}</small></button>`;
      body += `</div>`;
    } else if (tab === 'power') {
      body += `<div class="dv-note">Tap one: it switches on now, as if you'd picked it up.</div><div class="dv-grid">`;
      for (const [k, P] of Object.entries(POWERUPS)) body += `<button class="dv-act" data-pu="${k}"><i>${P.icon}</i>${P.name}<small>${P.dur ? P.dur + 's' : 'NOW'}</small></button>`;
      body += `</div>`;
    } else if (tab === 'mp') {
      body += `<div class="dv-note">Test any mode with a crowd: you host a real room and fake players join it. They ready up, walk about and play along (Prop Hunt, Imposter, Boss Fight and the rest). Pick how many, then choose the game in the lobby as normal.</div>`;
      body += `<div class="dv-fk"><button class="dv-act dv-fkb" data-fk="-1">−</button><div><b>${nFake}</b><small>FAKE PLAYER${nFake === 1 ? '' : 'S'} · ${nFake + 1} IN THE ROOM WITH YOU</small></div><button class="dv-act dv-fkb" data-fk="1">+</button></div>`;
      body += `<div class="dv-row dv-fkq">${[1, 2, 3, 5, 7, 11].map(k => `<button class="dv-chip ${k === nFake ? 'on' : ''}" data-fkn="${k}">${k}</button>`).join('')}</div>`;
      body += `<div class="dv-grid"><button class="dv-act dv-wide" data-mproom="1">▶ OPEN A TEST ROOM</button></div><div class="dv-note">You can add or remove fake players in the lobby too (the green bar). It needs the internet: it's a real room on the room server.</div>`;
    } else if (tab === 'models') {
      const i = mChars.indexOf(M.ch), on = (v) => M.view === v ? ' dv-wide' : '';
      body += `<div class="dv-note">Anyone at any of the 10 sizes, on a turntable in front of you: the same body other players see at that size.</div>`;
      body += `<div class="dv-mnav"><button class="dv-act" data-mstep="-1" aria-label="Previous character">◀</button><b>${mName(M.ch)}</b><button class="dv-act" data-mstep="1" aria-label="Next character">▶</button></div><div class="dv-note">${i + 1} of ${mChars.length}</div>`;
      body += `<h5>SIZE ${M.size} / 10 · ${STAGES[M.size - 1].name.toUpperCase()}</h5><div class="dv-fk"><button class="dv-act dv-fkb" data-msz="-1" aria-label="Smaller">−</button><div><b>${M.size}</b><small>SIZE</small></div><button class="dv-act dv-fkb" data-msz="1" aria-label="Bigger">+</button></div>`;
      body += `<div class="dv-row dv-fkq dv-mz">${STAGES.map((_, k) => `<button class="dv-chip ${k + 1 === M.size ? 'on' : ''}" data-msn="${k + 1}">${k + 1}</button>`).join('')}</div>`;
      body += `<h5>SHOW</h5><div class="dv-mrow"><button class="dv-act${on('one')}" data-mview="one">👤 JUST THEM</button><button class="dv-act${on('sizes')}" data-mview="sizes">📏 ALL SIZES</button><button class="dv-act${on('all')}" data-mview="all">👥 ALL CHARACTERS</button></div>`;
      body += `<h5>MOVE</h5><div class="dv-mrow">${[['idle', '🧍 IDLE'], ['walk', '🚶 WALK'], ['run', '🏃 RUN'], ['emote', '🕺 EMOTE']].map(([k, l]) => `<button class="dv-act${M.anim === k && M.view ? ' dv-wide' : ''}" data-manim="${k}">${l}</button>`).join('')}</div>`;
      body += `<div class="dv-mrow"><button class="dv-act${M.cam ? ' dv-wide' : ''}" data-mcam="1">${M.cam ? '↩ BACK TO YOUR EYES' : '🎥 LOOK AT THEM'}</button><button class="dv-act" data-mclear="1">✖ CLEAR</button></div>`;
      body += `<div class="dv-note">${mChars.length} characters: Ronnie, Tommy, the squad and six kinds of punter.</div>`;
    } else if (tab === 'sounds') {
      body += `<div class="dv-note">Every sound effect (${SOUND_NAMES.length}). Tap one to hear it.</div><input class="dv-search" type="search" placeholder="SEARCH SOUNDS..." autocomplete="off">`;
      for (const [g, list] of soundGroups()) body += `<div class="dv-sgrp"><h5>${g}</h5><div class="dv-grid dv-snd">${list.map(s => `<button class="dv-act" data-snd="${s}"><i>▶</i>${s}</button>`).join('')}</div></div>`;
    } else {
      body += `<div class="dv-note">Every Imposter job's game. Tap one to play it now.</div><div class="dv-grid">`;
      for (const t of TASKS) body += `<button class="dv-act" data-job="${t.id}"><i>${t.o && t.o.icon || KIND_ICON[t.kind] || '🔧'}</i>${t.name}<small>${t.room}</small></button>`;
      body += `</div><h5>SABOTAGE FIXES</h5><div class="dv-grid"><button class="dv-act" data-fix="lights"><i>💡</i>Fix the lights<small>FUSE BOX</small></button><button class="dv-act" data-fix="valve"><i>🛢️</i>Release a keg valve<small>KEG PRESSURE</small></button></div>`;
      body += `<h5>SECURITY</h5><div class="dv-grid"><button class="dv-act" data-cams="1"><i>📹</i>Security cameras<small>STAFF ROOM</small></button></div>`;
    }
    panel.innerHTML = `<div class="dv-tabs">${T('emotes', '🎭 EMOTES')}${T('attacks', '💥 ATTACKS')}${T('imposter', '🔪 IMPOSTER JOBS')}${T('power', '⚡ POWER-UPS')}${T('sounds', '🔊 SOUNDS')}${T('models', '👤 MODELS')}${T('mp', '👥 MULTIPLAYER')}</div><div class="dv-body">${body}</div>`;
    if (tab === 'sounds') { panel.querySelector('.dv-search').value = sq; filterSounds(); }
  };
  panel.addEventListener('input', (e) => { if (e.target.matches('.dv-search')) { sq = e.target.value; filterSounds(); } });
  panel.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.tab) { tab = d.tab; render(); return; }
    if (d.snd) { try { initAudio(); sfx(d.snd); } catch (err) { console.warn('dev sound', err); } b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 250); return; }
    if (d.ch) { sel = d.ch; render(); return; }
    if (d.mstep || d.msz || d.msn) { if (d.mstep) M.ch = mChars[(mChars.indexOf(M.ch) + +d.mstep + mChars.length) % mChars.length]; if (d.msz) M.size = Math.max(1, Math.min(10, M.size + +d.msz)); if (d.msn) M.size = +d.msn;
      if (!M.view) mShow('one'); else if (!(M.view === 'all' && d.mstep) && !(M.view === 'sizes' && !d.mstep)) mShow(M.view); render(); return; }      // (a line-up stays as it is when what changed isn't in it)
    if (d.mview) { mShow(d.mview); render(); return; }
    if (d.manim) { if (!M.view) mShow('one'); mAnimate(d.manim); render(); return; }
    if (d.mcam) { if (M.cam) camBack(); else { if (!M.view) mShow('one'); camOn(); } render(); return; }
    if (d.mclear) { mClear(); render(); return; }
    if (d.fk || d.fkn) { nFake = Math.max(1, Math.min(11, d.fkn ? +d.fkn : nFake + +d.fk)); try { localStorage.setItem('rs_dev_nfake', nFake); } catch (er) {} render(); return; }
    if (d.mproom) {      // (the request goes in this tab's storage as well as the address, and the address can't be an old cached copy: either way the menu opens the room)
      try { sessionStorage.setItem('rs_devmp_ok', '1'); sessionStorage.setItem('rs_devmp_req', JSON.stringify({ n: nFake, t: Date.now() })); } catch (er) {}
      b.textContent = '⏳ OPENING THE TEST ROOM…'; setTimeout(() => { location.href = location.pathname + '?devmp=' + nFake + '&u=' + Date.now(); }, 60); return; }
    if (d.all) return playAll(d.all);
    if (d.em) return play(sel, d.em);
    if (d.who) return attack(d.who, d.key);
    if (d.cams) { open(false); const game = makeCamFeeds({ renderer: RS.renderer, scene: RS.scene }); jobs.show(game, { onClose: () => game.dispose() }); return; }
    if (d.pu) { if (!RS.powerups || !RS.powerups.give) return toast('NO POWER-UPS HERE'); RS.powerups.give(d.pu); open(false); return toast('⚡ ' + POWERUPS[d.pu].name); }
    if (d.job) { const t = TASKS.find(x => x.id === d.job); return job(t.kind, t.o, t.name); }
    if (d.fix === 'lights') return job('switches', { title: 'FIX THE LIGHTS' }, 'the lights');
    if (d.fix === 'valve') return job('crank', { title: 'KEG ROOM VALVE', hint: 'RELEASE THE PRESSURE', turns: 2 }, 'the keg valve'); });
  render(); open(!(RS.renderer && RS.renderer.xr && RS.renderer.xr.isPresenting));      // (in the headset it starts closed: walk about, B brings it up)

  // ---- every frame
  RS.onFrame.push((dt) => { quiet(); jobs.update(dt);
    for (const f of M.figs) f.av.update(dt, mPose(f, dt)); camStep(dt);
    if (pup) { pup.update(dt, pose());
      if (queue.length && !(pup.emote && pup.emote.active) && (nextQ -= dt) <= 0) { const id = queue.shift(); pup.doEmote(id); const e = emoteInfo(id); toast('▶ ' + (e ? e.name : id) + (queue.length ? `  (${queue.length} more)` : '')); nextQ = 0.8; } } });
}
