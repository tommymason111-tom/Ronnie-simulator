// DEVELOPER MODE (Settings cog -> DEVELOPER MODE): a test bench in the Oysterfleet.
//   EMOTES    pick anyone in the squad: they appear in front of you and do any of their emotes (or all of them in turn)
//   ATTACKS   set off any character's attack on you, there and then
//   IMPOSTER  play any Imposter job (and the two sabotage fixes) straight away, without a game
//   SOUNDS    every sound effect by name, with a play button and a search box, to audition them all
// Nothing here changes the game itself: the random attacks are switched off while it's open, that's all.
import * as THREE from 'three';
import { EMOTES, CHAR_EMOTES, emoteInfo } from './emotes.js';
import { TASKS, makeCamFeeds } from './imposter.js';
import { Panel, makeGame } from './impgames.js';
import { SQUAD } from './squad.js';
import { POWERUPS } from './powerups.js';
import { SOUND_NAMES, SOUND_GROUPS, sfx, initAudio } from './audio.js';

const KIND_ICON = { hold: '🍺', crank: '⚙️', swipe: '💳', wires: '🔌', collect: '🧺', plunge: '🪠', order: '📖', scrub: '🧽', code: '🔢', dial: '⏲️', switches: '💡', reels: '🍒', catch: '🧻', temp: '🍟', sort: '🍽️', whack: '🍺', simon: '🕒', place: '🍴', light: '🕯️', stacker: '🍹', sweep: '🧹', pipes: '🚧', coupler: '🛢️', raise: '⛱️', wine: '🍷', fold: '🧻', bulbs: '💡', grill: '🍔', water: '🌸', net: '🥫' };
const NAME = (id) => id === 'tommy' ? 'TOMMY' : ((SQUAD[id] && SQUAD[id].name) || id).toUpperCase();

export function startDev(RS) {
  window.__devMode = true;
  const P = RS.player, D = RS.director;
  // ---- the look
  const st = document.createElement('style'); st.textContent = `
  #dev-btn { position: fixed; left: 50%; bottom: max(14px, env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 72; font: 900 15px 'Courier New', monospace; letter-spacing: 1px; color: #39ff14; background: rgba(0,10,2,0.92); border: 2px solid #39ff14; border-radius: 10px; padding: 8px 16px; box-shadow: 0 0 16px rgba(57,255,20,0.6); cursor: pointer; text-shadow: 0 0 6px #39ff14; }
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
  #dev-panel .dv-snd { grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr)); }
  #dev-panel .dv-snd .dv-act { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #dev-panel .dv-snd .dv-act.on { background: #39ff14; color: #001a00; }
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

  // ---- a little message
  const toastEl = document.createElement('div'); Object.assign(toastEl.style, { position: 'fixed', top: '64px', left: '50%', transform: 'translateX(-50%)', zIndex: 73, background: '#111', color: '#39ff14', font: '900 14px system-ui, sans-serif', padding: '8px 14px', borderRadius: '10px', display: 'none' }); document.body.appendChild(toastEl);
  let toastT = null; function toast(t) { toastEl.textContent = t; toastEl.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => { toastEl.style.display = 'none'; }, 2200); }

  // ---- the panel's pages
  const chars = ['tommy', ...Object.keys(CHAR_EMOTES).filter(c => c !== 'tommy')].filter(c => c === 'tommy' || SQUAD[c]);
  let tab = 'emotes', sel = chars[0], sq = '';
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
    } else if (tab === 'sounds') {
      body += `<div class="dv-note">Every sound effect (${SOUND_NAMES.length}). Tap one to hear it.</div><input class="dv-search" type="search" placeholder="SEARCH SOUNDS..." autocomplete="off">`;
      for (const [g, list] of soundGroups()) body += `<div class="dv-sgrp"><h5>${g}</h5><div class="dv-grid dv-snd">${list.map(s => `<button class="dv-act" data-snd="${s}"><i>▶</i>${s}</button>`).join('')}</div></div>`;
    } else {
      body += `<div class="dv-note">Every Imposter job's game. Tap one to play it now.</div><div class="dv-grid">`;
      for (const t of TASKS) body += `<button class="dv-act" data-job="${t.id}"><i>${t.o && t.o.icon || KIND_ICON[t.kind] || '🔧'}</i>${t.name}<small>${t.room}</small></button>`;
      body += `</div><h5>SABOTAGE FIXES</h5><div class="dv-grid"><button class="dv-act" data-fix="lights"><i>💡</i>Fix the lights<small>FUSE BOX</small></button><button class="dv-act" data-fix="valve"><i>🛢️</i>Release a keg valve<small>KEG PRESSURE</small></button></div>`;
      body += `<h5>SECURITY</h5><div class="dv-grid"><button class="dv-act" data-cams="1"><i>📹</i>Security cameras<small>STAFF ROOM</small></button></div>`;
    }
    panel.innerHTML = `<div class="dv-tabs">${T('emotes', '🎭 EMOTES')}${T('attacks', '💥 ATTACKS')}${T('imposter', '🔪 IMPOSTER JOBS')}${T('power', '⚡ POWER-UPS')}${T('sounds', '🔊 SOUNDS')}</div><div class="dv-body">${body}</div>`;
    if (tab === 'sounds') { panel.querySelector('.dv-search').value = sq; filterSounds(); }
  };
  panel.addEventListener('input', (e) => { if (e.target.matches('.dv-search')) { sq = e.target.value; filterSounds(); } });
  panel.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.tab) { tab = d.tab; render(); return; }
    if (d.snd) { try { initAudio(); sfx(d.snd); } catch (err) { console.warn('dev sound', err); } b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 250); return; }
    if (d.ch) { sel = d.ch; render(); return; }
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
    if (pup) { pup.update(dt, pose());
      if (queue.length && !(pup.emote && pup.emote.active) && (nextQ -= dt) <= 0) { const id = queue.shift(); pup.doEmote(id); const e = emoteInfo(id); toast('▶ ' + (e ? e.name : id) + (queue.length ? `  (${queue.length} more)` : '')); nextQ = 0.8; } } });
}
