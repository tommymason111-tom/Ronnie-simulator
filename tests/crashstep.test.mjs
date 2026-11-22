// WHERE IT DIED: the crash reporter's heartbeat notes what the game was doing (the menu screen, each loading step,
// playing) and how many fake players were in the test room. A session the phone killed (an iPhone's "A problem
// repeatedly occurred") is reported with it, and the developer's test room shows it on the next load
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';

export default async function () {
  const C = checker('crashstep'), host = await startRoomHost(), b = await launch();
  try {
    const p = await newPage(b, { width: 390, height: 844, mobile: true }); const sent = [];
    await p.route('http://crash.local/**', (r) => { try { sent.push(JSON.parse(r.request().postData() || '{}')); } catch (e) {} r.fulfill({ status: 200, body: 'ok' }); });
    await p.addInitScript(() => { try { if (!sessionStorage.getItem('__once')) { sessionStorage.setItem('__once', '1'); sessionStorage.setItem('rs_devmp_ok', '1');
      localStorage.setItem('rs_run', JSON.stringify({ v: '2.31.16', t0: Date.now() - 60000, last: Date.now() - 5000, p: 'pub', md: 'prophunt', mp: 6, mem: 300, bg: false, st: 'loading: place', fk: 5 })); } } catch (e) {} });
    await p.goto(`http://game.local/index.html?devmp=2&relay=${encodeURIComponent(host.url)}&crash=${encodeURIComponent('http://crash.local/crash')}`, { timeout: 240000 });
    await p.waitForFunction(() => { const m = window.ronnieMP; return m && m.net && m.net.players.size === 2; }, null, { timeout: 90000 });
    await sleep(4000);
    const shown = await p.evaluate(() => { const e = document.getElementById('room-lastkill'); return e && !e.hidden ? e.textContent : null; });
    C.ok(shown && /loading: place/.test(shown) && /5 fake players/.test(shown), `the test room didn't say what the game was doing when it was killed: ${shown}`);
    const k = sent.find(x => x.k === 'killed');
    C.ok(k && /during: loading: place/.test(k.m || JSON.stringify(k)), `the killed report didn't say where it died: ${JSON.stringify(sent).slice(0, 300)}`);
    // the heartbeat follows along (the lobby now)
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('rs_run') || '{}'));
    C.ok(/^menu: room/.test(st.st || '') && st.fk === 2, `the heartbeat isn't keeping track: ${JSON.stringify(st)}`);
    C.ok(!p.errors.length, 'page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
