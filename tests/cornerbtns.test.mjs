// THE CORNER'S BUTTONS: PAUSE, CHAT and VOICE are always there, together in the top-right corner, in every mode of a
// room's game (and PAUSE playing on your own): on screen, not covered by anything, in one row of round icons on a phone.
// Through the warm-up, every mode of the pub, Lidl and Lewis's (Imposter, Prop Hunt and Search & Destroy before and
// after their start), the READY card, the end of a game (the receipt), and Date Night on your own; each on an upright
// phone and on its side. PLACES=pub,shop,garden,restaurant narrows it.
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';
import { ev, openMenu, hostRoom, joinRoom, readyUp, pickGame, tapIn } from './lib/room.mjs';
const PLACES = (process.env.PLACES || 'pub,shop,garden,restaurant').split(',');
const MODES = { pub: ['everyone', 'chonkoff', 'runpub', 'boss', 'imposter', 'prophunt', 'snd', 'roam'], shop: ['sweep', 'prophunt', 'snd'], garden: ['bbq', 'boss', 'prophunt', 'snd'] };
const SIZES = [[390, 844], [844, 390]];

// (in the page) each of the corner's buttons: shown, on screen, in the top-right, what a tap on it would press
function corner(ids) {
  const out = {}, W = innerWidth, H = innerHeight;
  for (const id of ids) { const el = document.getElementById(id); if (!el) { out[id] = 'missing'; continue; }
    let hid = null; for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.1) { hid = (e.id || e.tagName) + ' ' + (c.display === 'none' ? 'display:none' : c.visibility === 'hidden' ? 'hidden' : 'see-through'); break; } }
    if (hid) { out[id] = 'not shown (' + hid + ')'; continue; }
    const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) { out[id] = 'no size'; continue; }
    if (r.left < 0 || r.top < 0 || r.right > W + 0.5 || r.bottom > H + 0.5) { out[id] = `off the screen [${[r.left, r.top, r.right, r.bottom].map(Math.round)}]`; continue; }
    if (r.left < W * 0.4 || r.top > Math.min(140, H * 0.35)) { out[id] = `not in the top-right [${[r.left, r.top].map(Math.round)}] of ${W}x${H}`; continue; }
    const u = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!u || (u !== el && !el.contains(u))) { out[id] = 'covered by ' + (u ? (u.id ? '#' + u.id : u.tagName.toLowerCase() + '.' + String(u.className).split(' ')[0]) : 'nothing'); continue; }
    out[id] = 'ok'; out[id + '@'] = [Math.round(r.top), Math.round(r.bottom)]; }
  return out;
}

export default async function () {
  const C = checker('cornerbtns'), host = await startRoomHost(), b = await launch();
  const check = async (p, what, room = true) => {
    for (const [w, h] of SIZES) {
      await p.setViewportSize({ width: w, height: h }); await sleep(900); await ev(p, () => { try { window.__layoutHud && window.__layoutHud(); } catch (e) {} });
      const ids = room ? ['menu-btn', 'chat-btn', 'vc-btn'] : ['menu-btn'], r = await ev(p, corner, ids);
      const bad = ids.filter(id => r[id] !== 'ok').map(id => `${id}: ${r[id]}`);
      if (!bad.length && room) { const tops = ids.map(id => r[id + '@'][0]); if (Math.max(...tops) - Math.min(...tops) > 8) bad.push(`not in one row (tops ${tops})`); }
      C.ok(!bad.length, `${p.pname} ${what} at ${w}x${h}: ${bad.join('; ')}`);
    }
    await p.setViewportSize({ width: 390, height: 844 });
  };
  try {
    for (const place of PLACES) {
      if (place === 'restaurant') {      // DATE NIGHT: on your own (no CHAT or VOICE there)
        const p = await newPage(b, { width: 390, height: 844, mobile: true }); p.pname = 'SOLO';
        await openMenu(p, host.url, '&go=1&place=restaurant&mode=date');
        await tapIn(p); await sleep(4000); await check(p, 'date night (solo)', false);
        C.ok(!p.errors.length, 'date night: ' + p.errors.slice(0, 2).join(' | ')); await p.context().close(); continue;
      }
      const mk = async (n) => { const p = await newPage(b, { width: 390, height: 844, mobile: true, warm: true }); p.pname = n; await openMenu(p, host.url); return p; };
      const H = await mk('HOST'), G = await mk('GUEST');
      const code = await hostRoom(H, 'HOSTY', 'lewis'); await joinRoom(G, code, 'GUESTY', 'chloe'); await sleep(800); await readyUp(G); await sleep(800);
      const first = MODES[place][0];
      await pickGame(H, place, first); for (const p of [H, G]) await tapIn(p); for (const p of [H, G]) await p.waitForFunction(() => !document.querySelector('#loadscreen.on'), null, { timeout: 120000, polling: 500 }).catch(() => {}); await sleep(3000);
      if (await ev(H, () => !!RS.warm())) { for (const p of [H, G]) await check(p, `${place} warm-up`); await ev(H, () => RS.warmStart()); await sleep(3000); }
      for (const mode of MODES[place]) {
        if (mode !== first) { for (const p of [H, G]) await ev(p, (m) => RS.newGame(m), mode); await sleep(3500); }
        for (const p of [H, G]) await check(p, `${place} ${mode}`);
        if (/imposter|prophunt/.test(mode)) { await ev(H, () => { const d = RS.director; if (d.imposter) d.imposter.hostDeal(); if (d.prophunt) d.prophunt.doStart(); }); await sleep(6000); for (const p of [H, G]) await check(p, `${place} ${mode} (started)`); }
        if (mode === 'snd') { await ev(H, () => { const s = RS.director.snd; if (s && s.hostStart && !s.H) s.hostStart(); }).catch(() => {}); await sleep(6000); for (const p of [H, G]) await check(p, `${place} ${mode} (started)`); }
      }
      // the READY card for a new game, and the end of a game
      if (place === 'pub') {
        for (const p of [H, G]) await ev(p, () => RS.newGame('chonkoff')); await sleep(2000);
        await ev(H, () => { document.getElementById('menu-btn').click(); document.getElementById('pause-restart').click(); }); await sleep(2000);
        for (const p of [H, G]) await check(p, 'the READY card');
        await ev(H, () => { const x = document.querySelector('#rc-card .rc-x'); if (x) x.click(); }); await sleep(1000);
        await ev(H, () => { RS.director.timeLeft = 0.3; RS.sim(1, 1 / 30); }); await sleep(3000);
        C.ok(await ev(G, () => RS.G.over), 'the guest\'s game didn\'t end');
        for (const p of [H, G]) await check(p, 'the receipt (game over)');
      }
      for (const p of [H, G]) { C.ok(!p.errors.length, `${place} ${p.pname}: ` + [...new Set(p.errors)].slice(0, 3).join(' | ')); await p.context().close(); }
    }
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
