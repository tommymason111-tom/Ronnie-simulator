// THE MENUS ON A PHONE (touch, 390x844 and landscape): every button works first time and nothing freezes.
//   - LET'S EAT, tapped with a finger, starts the game (loading screen, then the level)
//   - pause -> RESTART ROUND, three times running, and the page still answers straight after each (closing the pause
//     menu once set off a never-ending loop in the weather menu's watcher: the whole game froze)
//   - the pause menu fits the screen (no long list off the bottom), SETTINGS opens its own page and its pages come back
//     to it, and every page's BACK button is on screen and is what a finger at it would press
import { launch, newPage, sleep, checker } from './lib/game.mjs';

export default async function () {
  const C = checker('menus'), b = await launch();
  const alive = (p) => Promise.race([p.evaluate(() => 1).then(() => true), sleep(8000).then(() => false)]);      // (a frozen page never answers)
  // (the page has settled: no menu mid-fade, so a finger lands where the button is drawn)
  const settle = (p) => p.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || !(a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#pause'))), null, { timeout: 4000 }).catch(() => {});
  const tapSel = async (p, sel) => { await settle(p); const r = await p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null; }, sel); if (!r) return false;
    return Promise.race([p.touchscreen.tap(r.x, r.y).then(() => true), sleep(20000).then(() => false)]); };
  const onScreen = async (p, sel) => { await settle(p); return p.evaluate((s) => { const e = document.querySelector(s); if (!e) return { none: true }; const r = e.getBoundingClientRect(), u = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { in: r.width > 0 && r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1, top: !!u && (u === e || e.contains(u)), r: [Math.round(r.top), Math.round(r.bottom)], h: innerHeight }; }, sel); };
  try {
    for (const [w, h, name] of [[390, 844, 'phone'], [844, 390, 'landscape']]) {
      const p = await newPage(b, { width: w, height: h, mobile: true });
      try {
        // LET'S EAT with a finger
        await p.goto('http://game.local/index.html?x=1', { timeout: 120000, waitUntil: 'domcontentloaded' }); await sleep(2500);
        // the settings cog: with SOUND & FEEL open (a long box) its CLOSE and ✕ are still on screen and on top
        await p.evaluate(() => { document.getElementById('cog').click(); }); await sleep(400);
        await p.evaluate(() => document.getElementById('set-mixbtn').click()); await sleep(900);
        for (const sel of ['#set-close', '#set-x']) { const o = await onScreen(p, sel); C.ok(o.in && o.top, `${name}: settings with SOUND & FEEL open: ${sel} isn't on screen / on top: ${JSON.stringify(o)}`); }
        await tapSel(p, '#set-close'); await sleep(400);
        C.ok(await p.evaluate(() => document.getElementById('settings').hidden), `${name}: the settings CLOSE didn't close it`);
        await p.evaluate(() => { document.querySelector('.playbtn').click(); }); await sleep(500);
        await p.evaluate(() => document.querySelector('#pick-solo').click()); await sleep(500);
        await p.evaluate(() => { document.querySelector('.scene[data-id="pub"]').click(); document.querySelector('.screen[data-s="place"] .bigbtn').click(); }); await sleep(600);
        { const mpOnly = await p.evaluate(() => ['snd', 'imposter', 'prophunt'].filter(id => { const f = document.querySelector('.flip[data-id="' + id + '"]'); return f && f.offsetParent; }));      /* (multiplayer-only games aren't offered on your own) */
          C.ok(mpOnly.length === 0, `${name}: the solo pub menu offers multiplayer-only games: ${mpOnly.join(', ')}`); }
        await p.evaluate(() => { const f = document.querySelector('.flip[data-id="everyone"]'); f && f.click(); document.querySelector('.screen[data-s="mode"] .bigbtn').click(); }); await sleep(800);
        const tapped = await tapSel(p, '#go'); await sleep(400);
        const ls = await p.evaluate(() => document.getElementById('loadscreen').classList.contains('on') || document.body.classList.contains('ready'));
        C.ok(tapped && ls, `${name}: LET'S EAT tapped with a finger didn't start anything (tapped ${tapped}, loading ${ls})`);
        await p.waitForFunction(() => window.RS && document.body.classList.contains('ready'), null, { timeout: 180000 });
        await p.waitForFunction(() => !document.getElementById('loadscreen').classList.contains('on'), null, { timeout: 120000 }).catch(() => {});      // (the loading screen's gone)
        await p.evaluate(() => document.getElementById('play-flat').click()); await sleep(2500);
        await p.evaluate(() => { window.__pl = []; new MutationObserver(() => window.__pl.push('pause:' + document.getElementById('pause').className + '@' + Math.round(performance.now()))).observe(document.getElementById('pause'), { attributes: true, attributeFilter: ['class'] }); for (const t of ['pointerdown', 'pointerup', 'click']) addEventListener(t, (e) => window.__pl.push(t + ':' + (e.target.id || e.target.className) + ':' + e.isTrusted + '@' + Math.round(performance.now())), true); });
        // pause -> RESTART ROUND, three times, the page answering every time
        for (let k = 0; k < 3; k++) {
          await tapSel(p, '#menu-btn'); await sleep(500);
          const paused = await p.evaluate(() => document.getElementById('pause').classList.contains('on'));
          const cover = paused ? null : await p.evaluate(() => { const r = document.getElementById('menu-btn').getBoundingClientRect(), u = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { r: [Math.round(r.x), Math.round(r.y), Math.round(r.width)], top: u && (u.id || u.className || u.tagName), body: document.body.className }; });
          C.ok(paused, `${name}: the pause button didn't open the menu (#${k + 1}): ${JSON.stringify(cover)} ${JSON.stringify(await p.evaluate(() => window.__pl))}`);
          const fit = await p.evaluate(() => { const b = document.querySelector('#pause .box'), r = b.getBoundingClientRect(); return { fits: r.top >= -1 && r.bottom <= innerHeight + 1 && b.scrollHeight <= b.clientHeight + 2, h: Math.round(r.height), sh: b.scrollHeight }; });
          if (k === 0) C.ok(fit.fits, `${name}: the pause menu doesn't fit the screen without scrolling: ${JSON.stringify(fit)}`);
          const ok = await tapSel(p, '#pause-restart'); await sleep(1200);
          const live = await alive(p);
          const st = live ? await p.evaluate(() => ({ paused: document.getElementById('pause').classList.contains('on'), running: RS.director.running })) : null;
          C.ok(paused && ok && live && st && !st.paused && st.running, `${name}: RESTART ROUND #${k + 1} froze or did nothing (paused first: ${paused}, tap went through: ${ok}, page alive: ${live}, after: ${JSON.stringify(st)})`);
          if (!live) break;
        }
        // SETTINGS and its pages: every BACK on screen and pressable; back from SOUND & FEEL lands on SETTINGS
        await tapSel(p, '#menu-btn'); await sleep(500);
        await tapSel(p, '#pause-settings'); await sleep(400);
        C.ok(await p.evaluate(() => document.getElementById('pause').classList.contains('show-set')), `${name}: SETTINGS didn't open`);
        for (const [open, back, cls] of [['#pause-mix', '#pause-mix-back', 'show-mix'], ['#pause-controls', '#pause-ctrls-back', 'show-ctrls']]) {
          await tapSel(p, open); await sleep(600);
          const o = await onScreen(p, back);
          C.ok(o.in && o.top, `${name}: ${open} page's BACK isn't on screen or is covered: ${JSON.stringify(o)}`);
          await tapSel(p, back); await sleep(500);
          const where = await p.evaluate(() => document.getElementById('pause').className);
          C.ok(!where.includes(cls) && where.includes('show-set'), `${name}: BACK from ${open} should land on SETTINGS: ${where}`);
        }
        await tapSel(p, '#pause-set-back'); await sleep(400);
        for (const [open, back, cls] of [['#pause-wx', '#wx-back', 'show-wx'], ['#pause-mode', '#pause-modes-back', 'show-modes']]) {
          await tapSel(p, open); await sleep(700);
          const o = await onScreen(p, back);
          C.ok(o.in && o.top, `${name}: ${open} page's BACK isn't on screen or is covered: ${JSON.stringify(o)}`);
          await tapSel(p, back); await sleep(600);
          C.ok(!(await p.evaluate((c) => document.getElementById('pause').classList.contains(c), cls)), `${name}: BACK from ${open} didn't close it`);
        }
        await tapSel(p, '#pause-resume'); await sleep(500);
        C.ok(await alive(p) && !(await p.evaluate(() => document.getElementById('pause').classList.contains('on'))), `${name}: RESUME didn't close the menu`);
        C.ok(!p.errors.length, `${name}: page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
      } finally { await p.close().catch(() => {}); }
    }
  } finally { await b.close(); }
  return C.fails;
}
