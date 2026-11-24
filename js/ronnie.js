// RONNIE TALKS: the player (Ronnie, in first person) says his own lines (ronnielines.js) in his real voice (voices.js)
// when something happens: bites and favourite foods, combos, growing a stage and the shirt going, the squad's attacks,
// getting knocked down, power-ups, free roam chatter, and each mode's big moments (Date Night, the Sweep, Ian's
// Barbecue, Run the Pub, Boss Fight, Imposter, Prop Hunt, Search & Destroy, the eat-offs, the start and end of a game).
//   - In first person the line is his own voice (not placed in the world: it's you) with a small caption at the bottom
//     of the screen, kept clear of every button and bit of text (a little panel in front of you in a headset).
//   - Most of it is noticed from the game's own state each frame (nothing to wire into each mode); a bite and a
//     power-up are told (modes.js onAte, powerups.js take).
//   - Never too much: a gap after every line (longer for the chit-chat), each kind of line has its own wait, and the
//     same line never twice in a row (nor again until most of its kind have had a go).
//   - In a room, playing as Ronnie: the lines that matter (attacks, stages, power-ups, kills, the result) go to the
//     others as a line id ('rsay'), and they hear it from your body like any other voiced line. Not in Imposter or
//     Prop Hunt (a voice from a hiding place would give you away).
//   - The voice goes through the voices volume, so voice chat's NPC mute and the settings' VOICES slider apply.
import { RONNIE_LINES as L, ALL_RONNIE_LINES } from './ronnielines.js';
import { voiceLine, lineHash, cleanLine } from './voices.js';
import { Character } from './character.js';
import { narrator } from './narrator.js';

const FOOD_KEY = { pint: 'eat.pint', beer: 'eat.beer', cider: 'eat.beer', can: 'eat.can', croissant: 'eat.pastry', painchoc: 'eat.pastry', swirl: 'eat.pastry', muffin: 'eat.pastry', icedbun: 'eat.pastry', pretzel: 'eat.pastry', baguette: 'eat.pastry', wine: 'eat.wine', spirit: 'eat.wine', coffee: 'eat.coffee' };
// how long before the same kind of line again (seconds), and the chit-chat that waits for a longer quiet
const COOL = { bite: 14, combo: 12, bigcombo: 20, idle: 26, 'date.sweet': 16, 'date.away': 12, 'date.sneak': 9, 'date.back': 14, 'sweep.grab': 10, 'sweep.idle': 30, 'runpub.serve': 14, 'runpub.idle': 30,
  'boss.hurt': 8, 'boss.crit': 10, 'prophunt.hit': 8, 'imposter.job': 12, 'bbq.ask': 14, knocked: 6 };
const CHAT = new Set(['bite', 'combo', 'idle', 'date.sweet', 'date.away', 'date.back', 'sweep.grab', 'sweep.idle', 'runpub.serve', 'runpub.idle', 'imposter.job']);
// what the others in a room hear too
const SENT = /^(hit|knocked|stage|rip|power|start|win|lose|boss\.(start|phase|win|lose)|snd\.(plant|defuse|kill|die)|runpub\.(fight|walkout)|sweep\.caught|bbq\.(forced|ko|fought)|eatoff\.(start|end)|date\.(caught|win|lose))/;
const QUIET_MODES = new Set(['imposter', 'prophunt']);
const BY_HASH = new Map(ALL_RONNIE_LINES.map(l => [lineHash(cleanLine(l)), l]));

let RS = null, cap = null, vr = null;
const S = { t: 0, lastT: -99, lastLine: null, coolT: {}, recent: {}, said: [], sentT: -99, queue: [] };
// the singleton the game talks to (calls before it's started do nothing)
export const ronnie = {
  ate(item) { try { ate(item); } catch (e) {} },
  ev(key, o) { try { say(key, o); } catch (e) {} },
  get said() { return S.said; },
};

// ---- is the player Ronnie? (on your own you always are; in a room, if you picked him)
function meRonnie() { const n = RS && RS.net; return !n || !n.connected || !n.char || n.char === 'ronnie'; }
const D = () => RS && RS.director;
function pick(key) {
  const list = L[key]; if (!list || !list.length) return null;
  const rec = S.recent[key] || (S.recent[key] = []);
  let pool = list.filter(l => !rec.includes(l) && l !== S.lastLine); if (!pool.length) pool = list.filter(l => l !== S.lastLine); if (!pool.length) return null;
  const l = pool[Math.floor(Math.random() * pool.length)];
  rec.push(l); while (rec.length > Math.max(0, list.length - 1)) rec.shift();
  return l;
}
// someone important talking near you (an attack, a film line): the chit-chat waits
function busyNearby() { const P = RS.player; for (const c of Character.ALL || []) { if (c.disposed || c.mpPuppet || !(c.speakT > 0.6 || c.voicePending) || (c.speakPri || 0) < 4) continue; try { if (c.pos && Math.hypot(c.pos.x - P.head.x, c.pos.z - P.head.z) < 6) return true; } catch (e) {} } return false; }

// say a line of this kind (if it's time). o.force: skip the waits (tests, the developer); o.p: the chance it's said
function say(key, o = {}) {
  if (!RS || !meRonnie()) return false;
  const base = key.replace(/\.\d+$/, '');
  if (!L[key]) return false;
  if (!o.force) {
    if (o.p != null && Math.random() > o.p) return false;
    const gap = S.t - S.lastT, chat = CHAT.has(base) || base.startsWith('eat.') && base !== 'eat.veg';
    if (gap < (chat ? 8 : 1.6)) return false;
    if ((S.coolT[base] || -99) > S.t) return false;
    if (chat && busyNearby()) return false;
  }
  const text = pick(key); if (!text) return false;
  S.lastT = S.t; S.lastLine = text; S.coolT[base] = S.t + (COOL[base] ?? (base.startsWith('eat.') ? 20 : 4));
  S.said.push({ key, text, t: S.t }); if (S.said.length > 60) S.said.shift();
  speak(text, key);
  // in a room: the ones that matter, to everyone (at most one every 3 seconds)
  const n = RS.net, D0 = D();
  if (n && n.connected && SENT.test(key) && !(D0 && QUIET_MODES.has(D0.mode)) && S.t - S.sentT > 3) { S.sentT = S.t; try { n.send({ t: 'rsay', i: lineHash(cleanLine(text)) }); } catch (e) {} }
  return true;
}
// out loud: Date Night's films have him in the shot (his stand-in says it, on the film's caption); otherwise it's you
function speak(text, key) {
  const dn = D() && D().date;
  if (dn && dn.state !== 'play' && dn.state !== 'over' && dn.ron && !dn.ron.disposed && dn.live) { try { dn.live(dn.ron, text, 0); } catch (e) {} return; }
  if (!voiceLine('ronnie', text, null, { key: 'ronnie_me', onStart: (dur) => caption(text, dur) })) caption(text, 0);
}

// ---------------------------------------------------------------- the caption
function makeCaption() {
  const st = document.createElement('style'); st.textContent = `
  #ron-cap { position: fixed; left: 50%; top: 70%; transform: translateX(-50%); z-index: 58; pointer-events: none; max-width: min(84vw, 520px); box-sizing: border-box;
    padding: 7px 14px 8px; border-radius: 12px; background: rgba(8,10,18,0.78); border: 2px solid rgba(255,212,0,0.85); box-shadow: 0 4px 14px rgba(0,0,0,0.35);
    color: #fff; font: 800 15px/1.25 system-ui, -apple-system, 'Segoe UI', sans-serif; text-align: center; opacity: 0; transition: opacity 0.18s; visibility: hidden; }
  #ron-cap.on { opacity: 1; visibility: visible; }
  #ron-cap b { color: #ffd400; font-weight: 900; letter-spacing: 0.5px; margin-right: 6px; }
  body.paused #ron-cap { display: none; }`;
  document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'ron-cap'; el.setAttribute('aria-live', 'polite'); document.body.appendChild(el);
  return { el, until: 0, placeT: 0 };
}
function caption(text, dur) {
  if (!cap) cap = makeCaption();
  cap.el.innerHTML = '<b>RONNIE</b>'; cap.el.appendChild(document.createTextNode(text));
  cap.until = S.t + Math.max(2.2 + text.length * 0.05, (dur || 0) + 0.5); cap.text = text;
  const inVR = RS.renderer && RS.renderer.xr && RS.renderer.xr.isPresenting;
  if (inVR) { cap.el.classList.remove('on'); vrCaption(text); } else { cap.el.classList.add('on'); place(); }
}
// the lowest spot near the bottom middle where it sits on nothing: no button, no panel, no text (layout() in main.js
// lays out the rest of the screen; this just finds the gap it left). Nowhere free: hidden (the voice still plays)
function place() {
  const el = cap.el, W = innerWidth, H = innerHeight; el.style.visibility = ''; el.style.top = '0px';
  const r0 = el.getBoundingClientRect(), w = r0.width, h = r0.height, x0 = (W - w) / 2;
  const obs = [], seen = new Set();
  const add = (e) => { if (!e || seen.has(e) || e === el || el.contains(e) || e.contains(el)) return; seen.add(e); const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || (r.width > W * 0.95 && r.height > H * 0.85)) return;
    if (r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) return; const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return; obs.push(r); };
  for (const e of document.body.children) if (e.tagName !== 'CANVAS' && e.tagName !== 'SCRIPT' && e.tagName !== 'STYLE') add(e);
  for (const e of document.querySelectorAll('button, [id]')) if (e.tagName !== 'CANVAS' && e.tagName !== 'STYLE' && e.tagName !== 'SCRIPT') { const c = e.closest('body > *'); if (c && seen.has(c) && obs.length && c.getBoundingClientRect().width < W * 0.95) continue; add(e); }
  const safeB = 10; let y = H - h - safeB - 8, ok = false;
  for (; y > H * 0.3; y -= 8) { const a = { left: x0 - 4, right: x0 + w + 4, top: y - 4, bottom: y + h + 4 }; if (!obs.some(r => r.left < a.right && r.right > a.left && r.top < a.bottom && r.bottom > a.top)) { ok = true; break; } }
  el.style.top = Math.round(y) + 'px'; if (!ok) el.style.visibility = 'hidden';
}
// in a headset: a little caption panel low in front of your eyes
function vrCaption(text) {
  const THREE = RS.THREE; if (!THREE) return;
  if (!vr) { const c = document.createElement('canvas'); c.width = 1024; c.height = 200; const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false })); s.renderOrder = 16; s.position.set(0, -0.3, -1.15); s.scale.set(0.62, 0.62 * 200 / 1024, 1); s.visible = false;
    (RS.player.camera || RS.renderer.xr.getCamera()).add(s); vr = { c, tex, s }; }
  const g = vr.c.getContext('2d'); g.clearRect(0, 0, 1024, 200);
  g.fillStyle = 'rgba(8,10,18,0.82)'; g.beginPath(); g.roundRect(8, 8, 1008, 184, 30); g.fill(); g.lineWidth = 6; g.strokeStyle = '#ffd400'; g.stroke();
  let f = 50, lines; const words = String(text).split(' ');
  const wrap = (wd) => { const out = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > wd && cur) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; };
  do { g.font = `800 ${f}px system-ui, sans-serif`; lines = wrap(900); f -= 3; } while (lines.length * (f + 8) > 130 && f > 24);
  g.fillStyle = '#ffd400'; g.font = '900 30px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RONNIE', 512, 38);
  g.font = `800 ${f + 3}px system-ui, sans-serif`; g.fillStyle = '#fff'; lines.forEach((l, i) => g.fillText(l, 512, 112 + (i - (lines.length - 1) / 2) * (f + 8)));
  vr.tex.needsUpdate = true; vr.s.visible = true;
}

// ---------------------------------------------------------------- a bite (modes.js onAte)
function ate(item) {
  if (!RS || !item || !item.def) return; const d0 = D(), t = item.type;
  if (d0 && d0.mode === 'date' && d0.date && d0.date.state === 'play' && !d0.date.look) { S.ateAway = true; say('date.sneak', { p: 0.6 }); if (Math.random() < 0.3 && !S.sneakNarr) { S.sneakNarr = 1; narrator.line('date.sneak'); } return; }      // (the narrator, once a night: after him)
  if (item.def.veg || item.def.prop) return;
  const k = FOOD_KEY[t] || (L['eat.' + t] ? 'eat.' + t : null);
  if (k && Math.random() < 0.45 && say(k)) return;
  say('bite', { p: 0.3 });
}

// ---------------------------------------------------------------- every frame: what's changed
const P0 = {};
function update(dt) {
  S.t += dt;
  if (cap && cap.until && S.t > cap.until) { cap.until = 0; cap.el.classList.remove('on'); if (vr) vr.s.visible = false; }
  else if (cap && cap.until && (cap.placeT -= dt) <= 0) { cap.placeT = 0.3; if (!(RS.renderer.xr && RS.renderer.xr.isPresenting)) place(); }
  if (S.queue.length && S.queue[0].at <= S.t) { const q = S.queue.shift(); say(q.key, q.o); }
  const d0 = D(), G = RS.G, P = RS.player; if (!d0 || !G) return;
  const was = { ...P0 }, mode = d0.mode, run = d0.running;
  // a new game
  if (d0.stats !== P0.stats) { P0.stats = d0.stats; if (run) { Object.assign(P0, { stage: G.stage, hit: d0.lastHit, combo: 0 }); startLine(mode); } }
  // the end of one
  if (was.run && !run) endLine(mode);
  P0.run = run;
  if (!run) return;
  // growing
  if (G.stage > (P0.stage ?? G.stage)) { say('stage.' + G.stage, { force: true }) || say('stage'); if (G.stage === 4 || G.stage === 6 || G.stage === 8) S.queue.push({ at: S.t + 3, key: 'rip', o: { force: true } }); }
  P0.stage = G.stage;
  // the squad's attacks landing, being knocked flat, a vegetable, combos
  if (d0.lastHit && d0.lastHit !== P0.hit) { const k = 'hit.' + d0.lastHit.key; say(L[k] ? k : 'hit', { force: true }); S.hitAt = S.t; }
  P0.hit = d0.lastHit;
  const kn = !!P.knock; if (kn && !P0.knock && S.t - (S.hitAt ?? -99) > 2.5) say('knocked'); P0.knock = kn;
  const gag = G.gagT > 0; if (gag && !P0.gag) say('eat.veg', { force: S.t - S.lastT > 1.5 }); P0.gag = gag;
  const cb = G.combo || 0; if (cb >= 11 && (P0.combo || 0) < 11) say('bigcombo'); else if (cb >= 7 && (P0.combo || 0) < 7) say('combo', { p: 0.7 }); P0.combo = cb;
  modeLines(d0, mode, dt);
}
function startLine(mode) {
  const k = { date: 'date.start', sweep: 'sweep.start', bbq: 'bbq.start', runpub: 'runpub.start', boss: 'boss.start', chonkoff: 'eatoff.start', chonkoff2: 'eatoff.start', chonkoffr: 'eatoff.start' }[mode] || (QUIET_MODES.has(mode) || mode === 'snd' ? null : 'start');
  P0.idleT = 20 + Math.random() * 15; P0.m = {}; S.sneakNarr = 0;
  if (k && (mode !== 'roam' || Math.random() < 0.5)) S.queue.push({ at: S.t + 2.2, key: k, o: { force: true } });
}
function endLine(mode) {
  const d0 = D(); let k = 'end';
  try {
    if (mode === 'date' && d0.date) k = d0.date.catches >= 3 ? 'date.lose' : 'date.win';
    else if (mode === 'boss' && d0.boss && d0.boss.over) k = d0.boss.over === 'win' ? 'boss.win' : 'boss.lose';
    else if (mode === 'bbq' && d0.bbqm && d0.bbqm.won != null) k = d0.bbqm.won ? 'win' : 'lose';
    else if (mode === 'snd' && d0.snd && d0.snd.overMsg && d0.snd.mine()) k = d0.snd.overMsg.win === d0.snd.mine().team ? 'win' : 'lose';
    else if (/^chonkoff/.test(mode)) k = 'eatoff.end';
  } catch (e) {}
  S.queue = []; S.queue.push({ at: S.t + 0.8, key: k, o: { force: true } });
}
// each mode's moments, from its own state
function modeLines(d0, mode, dt) {
  const M = P0.m || (P0.m = {}), ch = (k, v) => { const o = M[k]; M[k] = v; return o; };
  // free roam (and the plain eating modes): a bit of chatter now and then
  if ((P0.idleT -= dt) <= 0) { P0.idleT = 28 + Math.random() * 22;
    const k = mode === 'roam' || mode === 'classic' || mode === 'everyone' || mode === 'intervention' || mode === 'veggie' ? 'idle' : mode === 'sweep' ? 'sweep.idle' : mode === 'runpub' ? 'runpub.idle' : mode === 'date' && d0.date && d0.date.state === 'play' && d0.date.look ? 'date.sweet' : null;
    if (k && !say(k)) P0.idleT = 6 + Math.random() * 4; }      // (someone else talking: try again in a few seconds)
  if (mode === 'date' && d0.date) { const dn = d0.date;
    const look = dn.state === 'play' ? !!dn.look : null, pl = ch('look', look);
    if (pl === true && look === false) { S.ateAway = false; say('date.away', { p: 0.45 }); }
    if (pl === false && look === true && S.ateAway) say('date.back', { p: 0.5 });
    const c = dn.catches || 0, pc = ch('catches', c); if (pc != null && c > pc) say('date.caught', { force: true }); }
  else if (mode === 'sweep' && d0.sweep) { const sw = d0.sweep;
    const pc = ch('caught', sw.caught); if (pc != null && sw.caught > pc) say('sweep.caught', { force: true });
    const pi = ch('items', sw.items); if (pi != null && sw.items > pi) say('sweep.grab', { p: 0.4 }); }
  else if (mode === 'bbq' && d0.bbqm) { const b = d0.bbqm, near = b.ian && b.ian.pos && Math.hypot(b.ian.pos.x - RS.player.head.x, b.ian.pos.z - RS.player.head.z) < 4.5;
    const pp = ch('phase', b.phase); if (pp !== b.phase && near) { if (b.phase === 'ask') say('bbq.ask', { p: 0.6 }); else if (b.phase === 'force') say('bbq.force', { force: true }); }
    const pf = ch('feed', !!b.feed); if (b.feed && pf === false) say('bbq.forced', { force: true });
    const st = b.stats || {}, pfo = ch('fought', st.fought), pko = ch('ko', st.ko);
    if (pko != null && st.ko > pko) say('bbq.ko', { force: true }); else if (pfo != null && st.fought > pfo) say('bbq.fought'); }
  else if (mode === 'runpub' && d0.runpub) { const r = d0.runpub;
    for (const [f, k, p] of [['fights', 'runpub.fight', 1], ['walkouts', 'runpub.walkout', 0.7], ['wrong', 'runpub.wrong', 0.6], ['served', 'runpub.serve', 0.3]]) { const o = ch(f, r[f]); if (o != null && r[f] > o && say(k, { p })) break; } }
  else if (mode === 'boss' && d0.boss) { const b = d0.boss;
    const ph = ch('hearts', b.hearts); if (ph != null && b.hearts < ph) say('boss.hurt', { p: 0.7 });
    const pph = ch('ph', b.ph); if (pph != null && b.ph > pph && !b.over) say('boss.phase', { force: true });
    const cr = b.stats ? b.stats.crits : 0, pcr = ch('crits', cr); if (pcr != null && cr > pcr) say('boss.crit', { p: 0.6 }); }
  else if (mode === 'imposter' && d0.imposter) { const im = d0.imposter, me = im.mine && im.mine();
    const pp = ch('phase', im.phase); if (pp !== im.phase) { if (im.phase === 'play' && !M.role && me) { M.role = 1; say(im.amImp() ? 'imposter.imp' : 'imposter.crew', { force: true }); } if (im.phase === 'meeting') say('imposter.meeting', { p: 0.7 }); }
    if (me) { const al = ch('alive', !!me.alive); if (al === true && !me.alive) say('imposter.dead', { force: true });
      const dn = me.done ? me.done.size ?? me.done.length : 0, pd = ch('done', dn); if (pd != null && dn > pd && !im.amImp()) say('imposter.job', { p: 0.6 }); } }
  else if (mode === 'prophunt' && d0.prophunt) { const ph = d0.prophunt, me = ph.mine && ph.mine();
    const pp = ch('phase', ph.phase); if (pp !== ph.phase && ph.phase === 'hide' && me) say(me.role === 'hider' ? 'prophunt.hider' : me.role === 'seeker' ? 'prophunt.seeker' : 'start', { force: me.role === 'hider' || me.role === 'seeker' });
    if (me) { const f = ch('found', !!me.found); if (f === false && me.found) say('prophunt.found', { force: true });
      const hp = me.hp ?? null, php = ch('hp', hp); if (php != null && hp != null && hp < php) say('prophunt.hit', { p: 0.6 }); } }
  else if (mode === 'snd' && d0.snd) { const sd = d0.snd, me = sd.mine && sd.mine();
    const pp = ch('phase', sd.phase); if (pp !== sd.phase && sd.phase === 'buy') say('snd.buy', { p: 0.5 });
    const bs = sd.bomb && sd.bomb.st, pb = ch('bomb', bs); if (pb !== bs && pb != null) { if (bs === 'planted') say('snd.plant', { force: true }); else if (bs === 'defused') say('snd.defuse', { force: true }); }
    if (me) { const k = me.k || 0, pk = ch('k', k); if (pk != null && k > pk) say('snd.kill', { force: true });
      const al = ch('alive', !!me.alive); if (al === true && !me.alive && sd.phase === 'live') say('snd.die', { force: true }); } }
  else if (/^chonkoff/.test(mode)) { const tl = d0.timeLeft, pt = ch('tl', tl); if (pt != null && pt > 10 && tl <= 10 && tl > 0) say('eatoff.last', { force: true }); }
}

// ---------------------------------------------------------------- someone else playing as Ronnie said one
function heard(m, p) {
  if (!m || !p || p.char !== 'ronnie' || !p.avatar || typeof p.avatar.sayLine !== 'function' || p.avatar.impHidden) return;
  const d0 = D(); if (d0 && QUIET_MODES.has(d0.mode)) return;
  const text = BY_HASH.get(String(m.i)); if (!text) return;      // (only his real lines: nothing made up comes through)
  const now = performance.now(); if (now - (p.rsayAt || 0) < 1500) return; p.rsayAt = now;
  p.avatar.sayLine(text);
}

export function startRonnie(rs) {
  if (RS) return ronnie; RS = rs;
  (rs.onFrame || (rs.onFrame = [])).push(update);
  if (rs.net) rs.net.on.rsay = heard;
  ronnie.say = (key, o) => say(key, { force: true, ...o });
  ronnie.pick = pick; ronnie.state = S; ronnie.lines = L;
  ronnie.caption = () => cap && cap.until ? { text: cap.text, el: cap.el } : null;
  ronnie.vrCaption = () => vr && vr.s.visible ? vr.s : null;
  return ronnie;
}
