// Every place and every solo mode: loads, runs 20 seconds of game (and draws), with no page errors and no crash reports.
// Also checks the crash reporter itself catches a thrown error and a lost 3D context, and that the game draws again
// after the context comes back.
import { launch, newPage, startGame, checker } from './lib/game.mjs';

const GAMES = { pub: ['everyone', 'runpub', 'boss', 'chonkoff', 'chonkoff2', 'roam', 'roam0'], bedroom: ['everyone', 'chonkoff', 'chonkoff2', 'roam', 'roam0'], shop: ['sweep', 'roam', 'roam0'], garden: ['bbq', 'boss', 'roam', 'roam0'], restaurant: ['date', 'roam', 'roam0'], grid: ['roam'] };
const ONLY = process.env.PLACES ? process.env.PLACES.split(',') : null;

export default async function () {
  const C = checker('places'), b = await launch();
  try {
    for (const [place, modes] of Object.entries(GAMES)) for (const mode of modes) {
      if (ONLY && !ONLY.includes(place)) continue;
      const p = await newPage(b, { width: 640, height: 400 });
      try {
        await startGame(p, { place, mode, dev: place === 'grid' });
        const r = await p.evaluate(() => { RS.renderer.setAnimationLoop(null); const t0 = performance.now(); for (let i = 0; i < 4; i++) { RS.sim(5, 1 / 30); RS.shot(); }
          const bad = []; RS.scene.traverse(o => { if (o.position && !(isFinite(o.position.x) && isFinite(o.position.y) && isFinite(o.position.z))) bad.push(o.name || o.type); });
          return { ms: Math.round(performance.now() - t0), nan: bad.slice(0, 5), mode: RS.director.mode }; });
        C.ok(!r.nan.length, `${place}/${mode}: objects at NaN positions: ${r.nan.join(', ')}`);
        const crashes = p.crashes.filter(c => c.k !== 'start' && c.k !== 'hang');
        C.ok(!p.errors.length, `${place}/${mode}: page errors: ${[...new Set(p.errors)].slice(0, 3).join(' | ')}`);
        C.ok(!crashes.length, `${place}/${mode}: crash reports: ${crashes.slice(0, 3).map(c => c.k + ' ' + c.m + ' @' + c.s).join(' | ')}`);
      } catch (e) { C.ok(false, `${place}/${mode}: ${e.message.slice(0, 200)}`); }
      await p.context().close();
    }
    if (!ONLY || ONLY.includes('crash')) {
      // a browser with no 3D at all: a clear message on the loading screen, not LOADING for ever
      { const p = await newPage(b, { width: 390, height: 844, mobile: true });
        await p.addInitScript(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (k, ...a) { return /webgl/.test(k) ? null : g.call(this, k, ...a); }; });
        await p.goto('http://game.local/index.html?go=1&place=bedroom&mode=roam'); await p.waitForTimeout(6000);
        const t = await p.evaluate(() => { const ls = document.getElementById('loadscreen'); return { on: ls.classList.contains('on'), title: ls.querySelector('.lst').textContent, hint: document.getElementById('ls-hint').textContent }; });
        C.ok(t.on && /NO 3D/.test(t.title) && /Chrome or Safari/.test(t.hint), 'no 3D: no clear message on the loading screen: ' + JSON.stringify(t));
        await p.context().close(); }
      // the crash reporter: a thrown error is reported (with where), a lost 3D context is reported, and the game draws again
      const p = await newPage(b, { width: 640, height: 400 });
      await startGame(p, { place: 'bedroom', mode: 'roam' });
      await p.evaluate(() => setTimeout(() => { throw new Error('test explosion'); }, 0)); await p.waitForTimeout(1500);
      const boom = p.crashes.find(c => c.k === 'error' && /test explosion/.test(c.m));
      C.ok(boom, 'crash reporter missed a thrown error');
      C.ok(boom && boom.v && boom.d && boom.p === 'bedroom', 'crash report missing version/device/place: ' + JSON.stringify(boom));
      C.ok(boom && !('name' in boom) && !JSON.stringify(boom).includes('chat'), 'crash report carries more than it should');
      p.errors.length = 0;
      // losing the 3D context: reported; nothing is drawn while it's gone or after it's back (the models' data was let go
      // of, so drawing then threw every frame); then the game reloads itself (main.js) and must come back up and run.
      // The reload is held back for 3s first (a 204 keeps the page where it is) so a slow test machine sees the frames a
      // fast phone would draw in that gap: this is what failed on GitHub's faster machines
      let held = 0, hold = true; await p.route('**/index.html*', r => { if (hold) { held++; return r.fulfill({ status: 204, body: '' }); } return r.fallback(); });
      const had = await p.evaluate(async () => { const gl = RS.renderer.getContext(), ext = gl.getExtension('WEBGL_lose_context'); if (!ext) return false;
        ext.loseContext(); await new Promise(r => setTimeout(r, 800)); ext.restoreContext(); await new Promise(r => setTimeout(r, 3000)); return true; });
      C.ok(had, 'no WEBGL_lose_context extension to test with');
      C.ok(held >= 1, 'the game did not ask to reload after the 3D context came back');
      C.ok(!p.errors.length, 'drawing errors after the 3D context came back (before the reload): ' + [...new Set(p.errors)].slice(0, 2).join(' | ').slice(0, 300));
      hold = false; p.errors.length = 0;
      const nav = p.waitForEvent('framenavigated', { timeout: 30000 }).catch(() => null);
      await p.evaluate(() => location.reload());
      C.ok(await nav, 'the game did not reload itself after the 3D context came back');
      await p.waitForFunction(() => window.RS && document.body.classList.contains('ready'), null, { timeout: 180000 }).catch(() => C.ok(false, 'game did not come back after the reload'));
      const back = await p.evaluate(() => { try { RS.renderer.setAnimationLoop(null); RS.sim(3, 1 / 30); RS.shot(); return !RS.renderer.getContext().isContextLost(); } catch (e) { return 'threw: ' + e.message; } }).catch(e => 'evaluate failed: ' + e.message);
      C.ok(back === true, 'game not running after coming back: ' + back);
      C.ok(p.crashes.some(c => c.k === 'context'), 'crash reporter missed the lost 3D context');
      C.ok(!p.errors.length, 'errors after coming back: ' + p.errors.slice(0, 3).join(' | '));
      await p.context().close();
    }
  } finally { await b.close(); }
  return C.fails;
}
