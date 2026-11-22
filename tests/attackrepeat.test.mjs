// AN ATTACK SET OFF AGAIN STRAIGHT AFTER (Dylan's Oasis, twice in a row): both land. A guard against Tommy's trip and
// Noah's tackle landing twice threw away any attack by the same person within 9 seconds of their last one, so Dylan's
// second go "didn't work". Also each go: the card, then the cutscene, then Dylan's done and can go again.
import { launch, newPage, startGame, checker } from './lib/game.mjs';

export default async function () {
  const C = checker('attackrepeat'), b = await launch();
  try {
    const p = await newPage(b);
    await startGame(p, { place: 'pub', mode: 'everyone' });
    const r = await p.evaluate(async () => { RS.renderer.setAnimationLoop(null); const D = RS.director, out = [];
      D.nextAttackT = 999; const dy = D.cast.find(c => c.id === 'dylan'); if (!dy) return null;
      for (let k = 0; k < 3; k++) {
        for (let i = 0; i < 30 && dy.state === 'act'; i++) RS.sim(1 / 30);
        D.nextAttackT = 999; const ok = D.launch({ c: dy, attack: { key: 'oasis' } }); const saw = { ok, card: false, cut: false, done: false };
        for (let i = 0; i < 30 * 25; i++) { RS.sim(1 / 30); D.nextAttackT = 999; const fx = D.g.fx; if (fx.cardT >= 0) saw.card = true; if (fx.cut && fx.cut.kind === 'oasis') saw.cut = true; if (saw.cut && dy.state !== 'act' && !fx.cut) { saw.done = true; break; } }
        out.push(saw); }
      return out; });
    console.log('  ' + JSON.stringify(r));
    C.ok(r && r.length === 3, 'no Dylan in the pub');
    if (r) r.forEach((s, i) => C.ok(s.ok && s.card && s.cut && s.done, `Dylan's attack, go ${i + 1}, didn't land: ${JSON.stringify(s)}`));
    C.ok(!p.errors.length, 'errors: ' + p.errors.slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
