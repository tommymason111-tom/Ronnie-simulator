// DEVELOPER MODE SURVIVES A RELOAD: the map picker starts developer mode on a page that reads a note in the tab. The
// update check can reload that page into a newer version on the way in: it used to come back as an ordinary free roam
// (the note was gone). Here the update check answers "newer" a moment in: the page reloads, and PLAY still opens
// developer mode. And back on the title screen it's over (a normal game after it is normal)
import { launch, newPage, sleep, checker } from './lib/game.mjs';

export default async function () {
  const C = checker('devreload'), b = await launch();
  try {
    const p = await newPage(b, { width: 390, height: 844, mobile: true });
    await p.route('**/version.json*', async (r) => { await sleep(12000); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ v: '9.9.9' }) }); });
    await p.addInitScript(() => { try { if (!sessionStorage.getItem('__once')) { sessionStorage.setItem('__once', '1'); sessionStorage.setItem('rs_dev', '1'); } } catch (e) {} });
    await p.goto('http://game.local/index.html?go=1&place=grid&mode=roam', { timeout: 120000 });
    const reloaded = await (async () => { for (let k = 0; k < 40; k++) { await sleep(1000); const v = await p.evaluate(() => /[?&]v=9\.9\.9/.test(location.search)).catch(() => false); if (v) return true; } return false; })();
    let dev = false;
    for (let k = 0; k < 120 && !dev; k++) { await sleep(1000);
      dev = await p.evaluate(() => { if (!window.RS || !document.body.classList.contains('ready')) return false; const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); const bt = document.getElementById('play-flat'); if (bt && bt.offsetParent) bt.click(); return !!window.__devMode; }).catch(() => false); }
    C.ok(reloaded, "the update check didn't reload the page (the test's set-up)");
    C.ok(dev, 'after the update reload, PLAY started an ordinary game, not developer mode');
    // the title screen ends it
    await p.goto('http://game.local/index.html', { timeout: 120000 }); await sleep(1500);
    C.ok(await p.evaluate(() => sessionStorage.getItem('rs_dev') === null), "developer mode was still on after going back to the title screen");
    C.ok(!p.errors.length, 'page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
