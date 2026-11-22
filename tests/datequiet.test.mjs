// DATE NIGHT is quiet in the background: Tommy (and the lads at the other tables) don't chat over the date; only Chloe
// and whoever's speaking in the film talk. When the date's over, everyone can talk again.
// Also: La Grande Portion (the restaurant) is single player only, like the bedroom.
import { readFileSync } from 'node:fs';
import { launch, newPage, startGame, checker, sleep } from './lib/game.mjs';
export default async function () {
  const C = checker('datequiet'), b = await launch();
  try {
    const menu = readFileSync(new URL('../js/menu.js', import.meta.url), 'utf8');
    C.ok(/const SOLO_ONLY = \[[^\]]*'restaurant'/.test(menu), 'La Grande Portion should be single player only (SOLO_ONLY in menu.js)');
    const p = await newPage(b, { width: 390, height: 844, mobile: true });
    await startGame(p, { place: 'restaurant', mode: 'date' });
    await sleep(3000);
    const r = await p.evaluate(() => { RS.renderer.setAnimationLoop(null); RS.sim(1);
      const d = RS.director.date, tommy = RS.cast.find(c => c.id === 'tommy'), chloe = d && d.chloe;
      const other = RS.cast.find(c => c !== tommy && c !== chloe && c.say && c.rag && c.rag.mesh);
      const out = { date: !!d, tommy: !!tommy, chloe: !!chloe, other: other && other.id };
      if (tommy) { tommy.speakT = 0; tommy.voicePending = false; out.tommySays = tommy.say('RONNIE! Put the bread roll DOWN!', 6); out.tommyBank = tommy.say('eat'); }
      if (other) { other.speakT = 0; other.voicePending = false; out.otherSays = other.say('Alright lads?', 6);
        other.speakT = 0; other.voicePending = false; let got = null; const sv = other.say; other.say = function (...a) { got = sv.apply(this, a); return got; }; out.hidden = !!other.dnHidden; d.line(other, 'This is my line in the film.', 6); other.say = sv; out.otherInFilm = got; }
      if (chloe) { chloe.speakT = 0; chloe.voicePending = false; out.chloeSays = chloe.say('Isn\'t this lovely, babe?', 6); }
      RS.director.date.dispose(); RS.director.date = null;
      if (tommy) { tommy.speakT = 0; tommy.voicePending = false; out.tommyAfter = tommy.say('Back to normal, Ron.', 6); }
      return out; });
    console.log('  ' + JSON.stringify(r));
    C.ok(r.date && r.tommy && r.chloe, `Date Night didn't start with Tommy and Chloe: ${JSON.stringify(r)}`);
    C.ok(r.tommySays === false && r.tommyBank === false, `Tommy can still be heard talking during Date Night: ${JSON.stringify(r)}`);
    C.ok(!r.other || r.otherSays === false, `someone at another table can still chat over the date: ${JSON.stringify(r)}`);
    C.ok(!r.other || r.hidden || r.otherInFilm === true, `someone speaking in a film was silenced: ${JSON.stringify(r)}`);
    C.ok(r.chloeSays === true, `Chloe can't talk on the date: ${JSON.stringify(r)}`);
    C.ok(r.tommyAfter === true, `Tommy stays quiet after Date Night's over: ${JSON.stringify(r)}`);
    await p.context().close();
  } finally { await b.close(); }
  return C.fails;
}
