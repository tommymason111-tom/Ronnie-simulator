// EVERY GAME LOAD, ON A PHONE: each place starts, then every one of its modes is started in turn (forwards, backwards,
// forwards again: every restart and GAME MODE change is one of these), with a few seconds of play and a picture each
// time. No page errors, no crash reports, and the mode really changes. (Rooms, the test room, the headset and fresh
// page loads of every mode were swept the same way by hand at 2.31.34; mp/snd/prophunt/vrroom keep those covered.)
import { launch, newPage, startGame, checker } from './lib/game.mjs';
const PG = { pub: ['everyone', 'runpub1', 'runpub', 'runpub3', 'boss', 'snd', 'chonkoff', 'chonkoff2', 'roam', 'roam0'], bedroom: ['everyone', 'chonkoff', 'chonkoff2', 'roam', 'roam0'], shop: ['sweep', 'snd', 'roam', 'roam0'], garden: ['bbq', 'boss', 'snd', 'roam', 'roam0'], restaurant: ['date', 'roam', 'roam0'] };
const ONLY = process.env.PLACES ? process.env.PLACES.split(',') : Object.keys(PG);
export default async function () {
  const C = checker('loads'), b = await launch();
  try {
    for (const place of ONLY) {
      const modes = PG[place], p = await newPage(b, { width: 390, height: 844, mobile: true });
      try {
        await startGame(p, { place, mode: modes[0] });
        for (const m of [...modes, ...modes.slice().reverse(), ...modes]) {
          const e0 = p.errors.length, c0 = p.crashes.filter(c => !['start', 'hang'].includes(c.k)).length;
          const r = await p.evaluate((m) => { try { RS.renderer.setAnimationLoop(null); const from = RS.director.fullMode; RS.newGame(m); RS.sim(2, 1 / 30); RS.shot && RS.shot(); RS.sim(1, 1 / 30); return { from, now: RS.director.fullMode }; } catch (e) { return { err: e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ') }; } }, m);
          const er = p.errors.slice(e0), cr = p.crashes.filter(c => !['start', 'hang'].includes(c.k)).slice(c0);
          C.ok(!r.err && !er.length && !cr.length && r.now === m, `${place}: ${r.from} -> ${m}: ${r.err || ''} now=${r.now} ${[...new Set(er)].slice(0, 2).join(' | ')} ${cr.slice(0, 2).map(c => c.k + ' ' + c.m + ' @' + c.s).join(' | ')}`);
        }
      } catch (e) { C.ok(false, `${place}: ${e.message.slice(0, 200)}`); }
      await p.context().close();
    }
  } finally { await b.close(); }
  return C.fails;
}
