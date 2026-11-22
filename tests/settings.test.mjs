// SETTINGS FITS THE SCREEN: on five phone sizes, upright and on its side, the title screen's settings opens with SOUND & FEEL,
// DEVELOPER MODE, CLOSE and ✕ all on screen and on top without scrolling (the update notes scroll in their own box)
import { launch, newPage, sleep, checker } from './lib/game.mjs';
export default async function () { const C = checker('settings'), b = await launch();
  try { for (const [w, h] of [[390, 844], [375, 667], [320, 568], [844, 390], [667, 375]]) { const p = await newPage(b, { width: w, height: h, mobile: true });
    await p.goto('http://game.local/index.html?x=1', { timeout: 120000, waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__menuShow, null, { timeout: 60000 }); await sleep(1200);
    await p.evaluate(() => document.getElementById('cog').click()); await sleep(900);
    const r = await p.evaluate(() => ['set-mixbtn', 'set-dev', 'set-close', 'set-x'].map(id => { const e = document.getElementById(id), r = e.getBoundingClientRect(), u = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return `${id}:${r.top >= 0 && r.bottom <= innerHeight && (u === e || e.contains(u)) ? 'ok' : 'BAD ' + Math.round(r.top) + '-' + Math.round(r.bottom) + ' ' + (u && (u.id || u.className))}`; }).join(' ') + ' upd=' + Math.round(document.getElementById('set-updates').getBoundingClientRect().height));
    C.ok(!/BAD/.test(r), `${w}x${h}: ${r}`);
    await p.close(); } } finally { await b.close(); } return C.fails; }
