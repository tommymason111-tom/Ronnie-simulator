// END-OF-GAME AWARDS: play a game (eat lots, fast; throw things at Tommy), end it, and the receipt gets your awards:
// the ones you earned (a hoover, a combo, Tommy's nemesis...), never one you didn't, stamped on one by one, all fitting
// on the receipt. A game where you do nothing gets the participation medal. The next game starts counting from zero.
import { launch, newPage, startGame, checker, sleep } from './lib/game.mjs';
import fs from 'fs';

export default async function () {
  const C = checker('awards'), b = await launch(), dir = process.env.SHOT_DIR || '/tmp';
  try {
    const p = await newPage(b, { width: 390, height: 844, mobile: true });
    await startGame(p, { place: 'pub', mode: 'chonkoff' });
    await p.click('#play-flat').catch(() => {});
    const r = await p.evaluate(async () => {
      RS.renderer.setAnimationLoop(null); const P = RS.player, G = RS.G, D = RS.director, out = {};
      const { stats } = await import('./js/awards.js');
      RS.sim(1, 1 / 30);
      const food = () => RS.items.items.filter(x => !x.dead && !x.heldBy && !x.def.drink && !x.def.prop && !x.def.veg && !x.def.poop).sort((a, b) => a.pos.distanceTo(P.head) - b.pos.distanceTo(P.head))[0];
      let bites = 0;
      for (let i = 0; i < 40 && bites < 22; i++) { let it = P.flatHolder.held || food(); if (!it) break; if (!P.flatHolder.held) P.flatGrab(it); const s0 = G.chonk; for (let k = 0; k < 30 && G.chonk === s0; k++) { P.flatEat(); RS.sim(1 / 30, 1 / 30); } if (G.chonk > s0) bites++; RS.sim(0.1, 1 / 30); }
      // throw things straight at Tommy
      const T = RS.tommy; let thrown = 0;
      for (let i = 0; i < 4; i++) { const it = food(); if (!it || !T) break; const tp = T.pos ? T.pos.clone() : null; if (!tp) break; tp.y = 1.2; P.flatGrab(it); it.pos.copy(tp).add({ x: 0.6, y: 0.1, z: 0 }); it.prev.copy(it.pos); P.flatThrow(7); it.vel.set(-6, 0, 0); thrown++; RS.sim(0.4, 1 / 30); }
      out.stats = { ...stats }; delete out.stats.t0;
      D.end(); RS.sim(0.1, 1 / 30);
      out.awards = (D.awardsFor || []).map(a => a[1]);
      await new Promise(r => setTimeout(r, 4500));      // (they stamp on one by one)
      out.stampedDone = D.awardShown == null && !D.stamping; out.stampDbg = { shown: D.awardShown, stamping: D.stamping, vis: D.receipt.visible, same: D.lastLines === D.lastLines };
      out.png = D.rc.toDataURL('image/png');
      // the next game: counting from zero, and doing nothing gets the medal
      RS.newGame ? RS.newGame('chonkoff') : D.start('chonkoff'); RS.sim(0.5, 1 / 30);
      out.afterKeys = Object.keys(stats).filter(k => k !== 't0' && stats[k] > (k === 'walk' ? 1 : 0)).map(k => k + '=' + stats[k]); out.after = out.afterKeys.length;
      D.end(); RS.sim(0.1, 1 / 30); out.idle = (D.awardsFor || []).map(a => a[1]);
      return out; });
    fs.writeFileSync(`${dir}/receipt-awards.png`, Buffer.from(r.png.split(',')[1], 'base64'));
    console.log(`  stats ${JSON.stringify(r.stats)}\n  awards: ${r.awards.join(' | ')}; doing nothing: ${r.idle.join(' | ')}`);
    C.ok(r.awards.length >= 1 && r.awards.length <= 3, `wrong number of awards: ${r.awards}`);
    C.ok(r.stats.bites >= 15 ? r.awards.includes('HOOVER OF THE YEAR') || r.awards.length === 3 : true, `ate ${r.stats.bites} bites and didn't get HOOVER: ${r.awards}`);
    C.ok(!r.awards.includes('SECRET VEGAN') && !r.awards.includes('TV LICENCE REVOKED') && !r.awards.includes('PARTICIPATION MEDAL'), `an award that wasn't earned: ${r.awards}`);
    C.ok(r.stampedDone, 'the awards never finished stamping on: ' + JSON.stringify(r.stampDbg));
    C.ok(r.after === 0, `the next game didn't start counting from zero: ${r.afterKeys}`);
    C.ok(r.idle.length === 1 && r.idle[0] === 'PARTICIPATION MEDAL', `doing nothing should get the participation medal: ${r.idle}`);
    C.ok(!p.errors.length, 'page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
