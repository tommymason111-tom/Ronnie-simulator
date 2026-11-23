// THE GAME CLOSED ON YOU: after the phone shut the game (crash.js's rs_lastkill) or it hit an error (rs_lasterr) in the
// last 15 minutes, the title screen says what it was doing, so it can be passed on; ✕ clears it. Older ones don't show.
// Also: the READY card keeps the & in SEARCH & DESTROY (it used to be dropped).
import { readFileSync } from 'node:fs';
import { launch, newPage, checker, sleep } from './lib/game.mjs';
export default async function () {
  const C = checker('lastclose'), b = await launch();
  try {
    const p = await newPage(b, { width: 390, height: 844, mobile: true });
    await p.addInitScript(() => { try { if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1'); const now = Date.now();
      localStorage.setItem('rs_lastkill', JSON.stringify({ at: now - 60000, st: 'new game: snd', p: 'pub', md: 'roam', fk: 4, mem: 900, v: '9.9.9' }));
      localStorage.setItem('rs_lasterr', JSON.stringify({ at: now - 30000, k: 'error', m: 'boom <b>x</b>', s: 'snd.js:10', p: 'pub', md: 'snd', v: '9.9.9' })); } catch (e) {} });
    await p.goto('http://game.local/index.html'); await sleep(3500);
    const r = await p.evaluate(() => { const el = document.getElementById('last-close'); if (!el) return null; const rc = el.getBoundingClientRect(); return { text: el.textContent, html: el.innerHTML, on: rc.width > 0 && rc.top >= 0 && rc.bottom <= innerHeight && rc.right <= innerWidth }; });
    C.ok(r && /PHONE CLOSED THE GAME/.test(r.text) && /new game: snd/.test(r.text) && /4 fake players/.test(r.text) && /900MB/.test(r.text), `the title screen doesn't say the phone closed the game: ${JSON.stringify(r)}`);
    C.ok(r && /LAST ERROR/.test(r.text) && /boom/.test(r.text) && !/<b>x/.test(r.html), `the last error isn't shown (or isn't cleaned): ${JSON.stringify(r)}`);
    C.ok(r && r.on, `the note isn't on screen on an upright phone: ${JSON.stringify(r)}`);
    await p.evaluate(() => document.querySelector('#last-close button').click());
    const gone = await p.evaluate(() => !document.getElementById('last-close') && !localStorage.getItem('rs_lastkill') && !localStorage.getItem('rs_lasterr'));
    C.ok(gone, '✕ didn\'t clear the note');
    // an old one doesn't show
    await p.evaluate(() => localStorage.setItem('rs_lastkill', JSON.stringify({ at: Date.now() - 3600000, st: 'x' }))); await p.reload(); await sleep(3000);
    C.ok(await p.evaluate(() => !document.getElementById('last-close')), 'an hour-old close still shows on the title screen');
    C.ok(p.errors.length === 0, 'page errors: ' + p.errors.slice(0, 3).join(' | '));
    await p.context().close();
    // the READY card escapes, not drops, the &
    const rc = readFileSync(new URL('../js/readycheck.js', import.meta.url), 'utf8');
    C.ok(/replace\(\/&\/g, '&amp;'\)/.test(rc), 'readycheck.js drops & from mode names (SEARCH & DESTROY showed as SEARCH DESTROY)');
  } finally { await b.close(); }
  return C.fails;
}
