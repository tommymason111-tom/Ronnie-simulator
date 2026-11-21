// AN ATTACK KNOCKS YOU DOWN ONCE. Tommy's final ball (and Noah's tackle) land when they reach you, with a backstop
// timer as well; when both went off you went down twice, the second time straight after getting up. Here: the backstop
// lands first and the ball arrives after (while you're down, and after you're up), and the other way round. One fall each.
import { launch, newPage, startGame, checker } from './lib/game.mjs';

export default async function () {
  const C = checker('knockonce'), b = await launch();
  try {
    const p = await newPage(b, { width: 640, height: 400 });
    await startGame(p, { place: 'pub', mode: 'everyone' });
    const r = await p.evaluate(() => {
      RS.renderer.setAnimationLoop(null); const D = RS.director, P = RS.player, T = RS.tommy, out = {};
      // count falls: each time a knockdown starts
      let falls = 0; const kd = P.knockDown.bind(P); P.knockDown = (...a) => { const was = !!P.knock; kd(...a); if (!was && P.knock) falls++; };
      const run = (secs) => { for (let i = 0; i < secs * 30; i++) RS.sim(1 / 30, 1 / 30); };
      D.nextAttackT = 1e9;      // (no other attacks)
      // 1) the backstop lands, then Tommy's ball reaches you (while you're down, and again after you're up)
      falls = 0; D.announce(T, 'trip'); run(8); T.onTrip && T.onTrip(T); run(5); T.onTrip && T.onTrip(T); run(6);
      out.backstopThenBall = falls;
      // 2) the ball reaches you first, then the backstop timer runs out
      D.lastHit = null; falls = 0; D.announce(T, 'trip'); run(1); T.onTrip && T.onTrip(T); run(12);
      out.ballThenBackstop = falls;
      // 3) Noah's tackle the same way
      const noah = RS.cast.find(c => c.id === 'noah');
      if (noah) { D.lastHit = null; falls = 0; D.announce(noah, 'tackle'); run(1); D.stun(noah, 'tackle'); run(12); out.tackle = falls; }
      // 4) a later attack still lands (it's only the same one twice that's stopped)
      D.lastHit = { ...(D.lastHit || {}), t: performance.now() - 10000 }; falls = 0; D.stun(T, 'trip'); run(6); out.later = falls;
      return out;
    });
    console.log('  ' + JSON.stringify(r));
    C.ok(r.backstopThenBall === 1, `backstop then ball: knocked down ${r.backstopThenBall} times (want once)`);
    C.ok(r.ballThenBackstop === 1, `ball then backstop: knocked down ${r.ballThenBackstop} times (want once)`);
    if (r.tackle !== undefined) C.ok(r.tackle === 1, `Noah's tackle: knocked down ${r.tackle} times (want once)`);
    C.ok(r.later === 1, `a later attack didn't land: ${r.later}`);
    C.ok(!p.errors.length, 'page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
