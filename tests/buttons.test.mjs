// EVERY BUTTON ON A PHONE, upright and on its side: on every menu screen, the settings, the leaderboards, the lobby and its
// sheets, the in-game buttons, every page of the pause menu, the end of a game, and multiplayer's own bits (chat, the
// characters page, the room's player list), every button that shows is brought into view the way a finger would scroll
// to it, and must then be all on the screen, be what a tap on it presses (nothing over it), and have no text cut off.
// Also: a game ending while the pause menu (WEATHER & TIME) is open used to leave the end-of-game buttons on top of the
// menu, covering its BACK button: now the menu closes for the receipt, and the menu can't open over a finished game.
// ONLY=title,game,mp  SIZES=portrait,landscape
import fs from 'fs';
import { launch, newPage, startGame, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';

const BTN = fs.readFileSync(new URL('./lib/btncheck.js', import.meta.url), 'utf8'), TXT = fs.readFileSync(new URL('./lib/textcheck.js', import.meta.url), 'utf8');
const ONLY = (process.env.ONLY || 'title,game,mp').split(','), SIZES = [[390, 844, 'portrait'], [844, 390, 'landscape']].filter(s => !process.env.SIZES || process.env.SIZES.includes(s[2]));

export default async function () {
  const C = checker('buttons'), b = await launch(); let host = null;
  const prep = async (p) => { await p.addInitScript(BTN); await p.addInitScript(TXT); };
  // (no fade half-way: a finger lands on what's drawn once it's still)
  const settle = (p) => p.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || (a.effect && a.effect.getTiming && a.effect.getTiming().iterations === Infinity)), null, { timeout: 6000, polling: 150 }).catch(() => {});
  const check = async (p, tag, scope) => {
    await settle(p);
    await p.evaluate(() => { window.__sc = [...document.querySelectorAll('*')].filter(e => e.scrollTop || e.scrollLeft).map(e => [e, e.scrollTop, e.scrollLeft]); return 1; });
    const bad = await p.evaluate((s) => window.__btnCheck(s), scope);
    await p.evaluate(() => { for (const e of document.querySelectorAll('*')) if (e.scrollTop || e.scrollLeft) { e.scrollTop = 0; e.scrollLeft = 0; } for (const [e, t, l] of window.__sc) { e.scrollTop = t; e.scrollLeft = l; } }); await sleep(150);
    const cut = (await p.evaluate((s) => window.__textCheck(typeof s === 'string' ? document.querySelector(s) : null), scope)).filter(t => t.kind !== 'covered by other text' || /button/i.test(t.where));
    C.ok(!bad.length, `${tag}: buttons that can't be pressed: ${bad.slice(0, 4).map(x => `${x.what} ${x.why}`).join(' | ')}`);
    C.ok(!cut.length, `${tag}: text cut off: ${cut.slice(0, 4).map(x => `"${x.text}" ${x.kind} (${x.where})`).join(' | ')}`);
    return bad.length + cut.length;
  };
  // (a menu open: no button outside it may show on the screen: Prop Hunt's START used to, over the pause menu)
  const strays = (p, keep) => p.evaluate((keep) => [...document.querySelectorAll('button, [role="button"]')].filter(e => { if (e.closest(keep)) return false;
      for (let a = e; a && a !== document.documentElement; a = a.parentElement) { const c = getComputedStyle(a); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false; }
      const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; }).map(e => (e.id ? '#' + e.id + ' ' : '') + '"' + e.textContent.trim().slice(0, 20) + '"'), keep);
  try {
    for (const [w, h, sz] of SIZES) {
      // ---------------------------------------------------------------- the menus before a game
      if (ONLY.includes('title')) { const p = await newPage(b, { width: w, height: h, mobile: true }); await prep(p);
        try {
          await p.goto('http://game.local/index.html?x=1', { timeout: 120000, waitUntil: 'domcontentloaded' });
          await p.waitForFunction(() => window.__menuShow, null, { timeout: 60000 }); await sleep(1500);
          for (const s of ['title', 'how', 'squad', 'players', 'mpname', 'mp', 'place', 'mode', 'ready', 'intro']) {
            await p.evaluate((s) => window.__menuShow(s), s); await sleep(700);
            if (await p.evaluate((s) => !!document.querySelector(`.screen.on[data-s="${s}"]`), s)) await check(p, `${sz} menu "${s}"`, `.screen.on[data-s="${s}"]`);
          }
          await p.evaluate(() => window.__menuShow('title')); await sleep(600);
          await p.evaluate(() => document.getElementById('cog').click()); await sleep(500);
          await check(p, `${sz} settings`, '#settings');
          { const st = await strays(p, '#settings'); C.ok(!st.length, `${sz} settings: buttons still showing round it: ${st.slice(0, 5).join(', ')}`); }
          await p.evaluate(() => document.getElementById('set-mixbtn') && document.getElementById('set-mixbtn').click()); await sleep(600);
          await check(p, `${sz} settings + SOUND & FEEL`, '#settings');
          await p.evaluate(() => document.getElementById('set-close').click()); await sleep(500);
          await p.evaluate(() => document.getElementById('lb-open').click());
          if (await p.waitForFunction(() => document.getElementById('lb-modal'), null, { timeout: 15000 }).then(() => true, () => false)) { await sleep(1500); await check(p, `${sz} leaderboards`, '#lb-modal'); }
          C.ok(!p.errors.length, `${sz} menus: page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
        } finally { await p.close().catch(() => {}); } }

      // ---------------------------------------------------------------- a game (solo): the in-game buttons, the pause menu's pages, the end
      if (ONLY.includes('game')) { const p = await newPage(b, { width: w, height: h, mobile: true }); await prep(p);
        try {
          await startGame(p, { place: 'pub', mode: 'everyone' }); await sleep(1500);
          await check(p, `${sz} in game`, null);
          await p.evaluate(() => document.getElementById('menu-btn').click()); await sleep(600);
          await check(p, `${sz} pause`, '#pause');
          { const st = await strays(p, '#pause'); C.ok(!st.length, `${sz} pause: buttons still showing round it: ${st.slice(0, 5).join(', ')}`); }
          for (const [open, cls, back] of [['#pause-settings', 'show-set', null], ['#pause-mix', 'show-mix', '#pause-mix-back'], ['#pause-controls', 'show-ctrls', '#pause-ctrls-back'], ['#pause-set-back', null, null], ['#pause-wx', 'show-wx', '#wx-back'], ['#pause-mode', 'show-modes', '#pause-modes-back']]) {
            await p.evaluate((s) => document.querySelector(s).click(), open); await sleep(600);
            if (cls) { C.ok(await p.evaluate((c) => document.getElementById('pause').classList.contains(c), cls), `${sz}: ${open} didn't open its page`); await check(p, `${sz} pause ${cls}`, '#pause'); }
            if (back) { await p.evaluate((s) => document.querySelector(s).click(), back); await sleep(500); }
          }
          // the end of the game arriving with WEATHER & TIME open (multiplayer carries on while you're in a menu)
          await p.evaluate(() => document.getElementById('pause-wx').click()); await sleep(500);
          await p.evaluate(() => RS.director.end());
          await p.waitForFunction(() => document.body.classList.contains('gameover'), null, { timeout: 20000 }).catch(() => {}); await sleep(1500);
          C.ok(await p.evaluate(() => !document.getElementById('pause').classList.contains('on')), `${sz}: the pause menu stayed open over the end of the game`);
          await check(p, `${sz} end of the game`, '#over');
          await p.keyboard.press('Escape'); await sleep(400);
          await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
          C.ok(await p.evaluate(() => !document.getElementById('pause').classList.contains('on')), `${sz}: the pause menu opened over the finished game's receipt`);
          C.ok(!p.errors.length, `${sz} game: page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
        } finally { await p.close().catch(() => {}); } }

      // ---------------------------------------------------------------- multiplayer: the lobby, its sheets, and a game in a room
      if (ONLY.includes('mp')) { host = host || await startRoomHost(); const p = await newPage(b, { width: w, height: h, mobile: true }); await prep(p);
        try {
          await p.addInitScript(() => { try { sessionStorage.setItem('rs_devmp_ok', '1'); } catch (e) {} });
          await p.goto(`http://game.local/index.html?devmp=3&relay=${encodeURIComponent(host.url)}`, { timeout: 240000 });
          await p.waitForFunction(() => { const m = window.ronnieMP; return m && m.net && m.net.players.size === 3 && [...m.net.players.values()].every(q => q.ready); }, null, { timeout: 90000, polling: 500 });
          await sleep(800); await check(p, `${sz} lobby`, '.screen.on[data-s="room"]');
          for (const id of ['room-opts-btn', 'room-chat-btn', 'room-count']) {
            await p.evaluate((i) => document.getElementById(i).click(), id); await sleep(600);
            await check(p, `${sz} lobby + ${id}`, '.rsheet.open');
            await p.evaluate((i) => document.getElementById(i).click(), id); await sleep(400);
          }
          await p.evaluate(() => document.getElementById('room-go').click()); await sleep(500);
          await p.evaluate(() => { document.querySelector('.scene[data-id="pub"]').click(); document.querySelector('.screen[data-s="place"] .bigbtn').click(); }); await sleep(600);
          await p.evaluate(() => { const f = document.querySelector('.flip[data-id="everyone"]'); f && f.click(); document.querySelector('.screen[data-s="mode"] .bigbtn').click(); }); await sleep(600);
          await p.evaluate(() => document.getElementById('go').click());
          await p.waitForFunction(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); const st = document.getElementById('start'), inGame = window.RS && document.body.classList.contains('ready') && st && st.classList.contains('gone');
            if (inGame) { const bt = document.querySelector('#play-flat'); if (bt && bt.offsetParent) bt.click(); } return inGame && !RS.player.menuLock && RS.director.running; }, null, { timeout: 240000, polling: 700 });
          const lsGone = await p.waitForFunction(() => !document.querySelector('#loadscreen.on'), null, { timeout: 120000 }).then(() => true, () => false);
          C.ok(lsGone, `${sz} room: the loading screen never went`); await sleep(2500);
          await check(p, `${sz} in a room`, null);
          await p.evaluate(() => document.getElementById('mp-chip').click()); await sleep(500);
          await check(p, `${sz} in a room + who's here`, '#roster-pop');
          await p.evaluate(() => document.getElementById('mp-chip').click()); await sleep(300);
          await p.evaluate(() => document.getElementById('chat-btn').click()); await sleep(500);
          await check(p, `${sz} in a room + chat`, '#chat-box');
          const ov = await p.evaluate(() => { const c = document.getElementById('chat-box').getBoundingClientRect(); return ['menu-btn', 'chat-btn', 'vc-btn', 'mp-chip'].filter(id => { const e = document.getElementById(id); if (!e || !e.offsetParent) return false; const r = e.getBoundingClientRect(); return r.width && r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top; }); });
          C.ok(!ov.length, `${sz} room: the chat box sits on ${ov.join(', ')}`);
          await p.evaluate(() => document.getElementById('chat-x').click()); await sleep(300);
          await p.evaluate(() => document.getElementById('menu-btn').click()); await sleep(600);
          await check(p, `${sz} room pause`, '#pause');
          { const st = await strays(p, '#pause'); C.ok(!st.length, `${sz} room pause: buttons still showing round it: ${st.slice(0, 5).join(', ')}`); }
          await p.evaluate(() => document.getElementById('pause-char').click()); await sleep(700);
          await check(p, `${sz} room pause: characters`, '#pause');
          await p.evaluate(() => document.getElementById('pause-chars-back').click()); await sleep(400);
          // (the owner's screenshot: WEATHER & TIME open when the game ended: PLAY AGAIN / RETURN TO LOBBY were over its BACK)
          await p.evaluate(() => document.getElementById('pause-wx').click()); await sleep(500);
          await p.evaluate(() => RS.director.end());
          await p.waitForFunction(() => document.body.classList.contains('gameover'), null, { timeout: 20000 }).catch(() => {}); await sleep(1500);
          C.ok(await p.evaluate(() => !document.getElementById('pause').classList.contains('on')), `${sz} room: the pause menu stayed open over the end of the game`);
          await check(p, `${sz} room: end of the game`, '#over');
          // PROP HUNT (the owner's report: its START button showed over the pause menu)
          await p.evaluate(() => RS.newGame('prophunt'));
          await p.waitForFunction(() => { for (const id of ['#intro-ready', '#ui-intro-ready', '.howto-ready']) { const r = document.querySelector(id); if (r && r.offsetParent) r.click(); } return window.RS && RS.director.prophunt && !RS.player.menuLock; }, null, { timeout: 120000, polling: 500 }).catch(() => {});
          await sleep(2500);
          C.ok(await p.evaluate(() => [...document.querySelectorAll('#ph-ui button')].some(e => !e.hidden && e.offsetParent)), `${sz} prop hunt: none of its buttons were showing to begin with`);
          await p.evaluate(() => document.getElementById('menu-btn').click()); await sleep(700);
          { const st = await strays(p, '#pause'); C.ok(!st.length, `${sz} prop hunt pause: buttons still showing round it: ${st.slice(0, 5).join(', ')}`); }
          await p.evaluate(() => document.getElementById('pause-resume').click()); await sleep(600);
          C.ok(await p.evaluate(() => [...document.querySelectorAll('#ph-ui button')].some(e => !e.hidden && e.offsetParent && getComputedStyle(document.getElementById('ph-ui')).visibility !== 'hidden')), `${sz} prop hunt: its buttons didn't come back after the pause menu`);
          C.ok(!p.errors.length, `${sz} room: page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
        } finally { await p.close().catch(() => {}); } }
    }
  } finally { await b.close(); if (host) await host.close(); }
  return C.fails;
}
