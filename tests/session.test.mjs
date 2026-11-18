// A LONG SESSION: game after game in the same place mustn't pile things up (the game got slower the longer you played):
//   - Supermarket Sweep tops the shop up to the same food every time (it added ~100 more each sweep)
//   - after Run the Pub (drinks only) the pub has its food back within a few seconds (it came back one a second)
//   - nothing a game puts in the world is left behind when the next starts (Lewis's waiter plate was, every time)
//   - a game that isn't one of this place's starts this place's own game instead (Run the Pub crashed in the bedroom)
import { launch, newPage, startGame, checker } from './lib/game.mjs';

const RUNS = { shop: ['sweep', 'roam', 'roam0'], pub: ['everyone', 'runpub', 'chonkoff', 'roam', 'roam0'], garden: ['bbq', 'roam'], restaurant: ['date', 'roam'] };

export default async function () {
  const C = checker('session'), b = await launch();
  try {
    for (const [place, modes] of Object.entries(RUNS)) {
      const p = await newPage(b, { width: 640, height: 400 });
      try {
        await startGame(p, { place, mode: modes[0] });
        const r = await p.evaluate((modes) => {
          RS.renderer.setAnimationLoop(null);
          const food = () => RS.items.items.filter(i => !i.dead && !i.def.drink && !i.def.prop).length;
          const census = () => { const c = new Map(); for (const o of RS.scene.children) { if (RS.items.items.some(i => i.obj === o)) continue; const k = o.type + ':' + o.children.length + ':' + (o.name || ''); c.set(k, (c.get(k) || 0) + 1); } return c; };
          const round = () => { const out = {}; for (const m of modes) { RS.newGame(m); RS.sim(4, 1 / 30); out[m] = food(); } return out; };
          const r1 = round(), c1 = census(), counts = [r1];
          for (let i = 0; i < 4; i++) counts.push(round());
          const c2 = census(), grew = []; for (const [k, v] of c2) { const w = c1.get(k) || 0; if (v > w) grew.push(`${k} ${w}->${v}`); }
          return { counts, grew, minFood: RS.items.minFood };
        }, modes);
        const first = r.counts[0], last = r.counts[r.counts.length - 1];
        console.log(`  ${place}: food per game, first round ${JSON.stringify(first)}, fifth ${JSON.stringify(last)}`);
        for (const m of modes) C.ok(last[m] <= first[m] * 1.1 + 5, `${place}/${m}: food piled up game after game: ${first[m]} -> ${last[m]}`);
        if (place === 'pub') for (const m of modes) if (m !== 'runpub') C.ok(last[m] >= r.minFood * 0.85, `pub/${m}: only ${last[m]} food 4s into the game (after Run the Pub it should be back to ~${r.minFood})`);
        C.ok(!r.grew.length, `${place}: things left behind in the world game after game: ${r.grew.slice(0, 5).join(', ')}`);
        C.ok(!p.errors.length, `${place}: page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
      } catch (e) { C.ok(false, `${place}: ${e.message.slice(0, 300)}`); }
      await p.context().close();
    }
    // a game that doesn't belong here (another player's restart message, a stray call: Run the Pub in the bedroom crashed
    // its job board, looking for the pub's seats) starts this place's own game instead
    for (const [place, wrong] of [['bedroom', 'runpub'], ['garden', 'sweep'], ['shop', 'bbq'], ['restaurant', 'runpub']]) {
      const p = await newPage(b, { width: 640, height: 400 });
      try { await startGame(p, { place, mode: 'roam' });
        const r = await p.evaluate((w) => { RS.renderer.setAnimationLoop(null); let threw = null; try { RS.newGame(w); RS.sim(40, 1 / 30); } catch (e) { threw = e.message; } return { threw, mode: RS.director.mode }; }, wrong);
        C.ok(!r.threw && r.mode !== wrong, `${place}: starting ${wrong} there: ${r.threw || 'it ran ' + r.mode}`);
        C.ok(!p.errors.length, `${place}/${wrong}: page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
      } catch (e) { C.ok(false, `${place}/${wrong}: ${e.message.slice(0, 300)}`); }
      await p.context().close();
    }
  } finally { await b.close(); }
  return C.fails;
}
