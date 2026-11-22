// RUN THE PUB's TABLE NUMBERS: one number over each real table in the restaurant (the long tables used to be split
// into lots of "tables", a number every few chairs), every chair on a numbered table, no two numbers close together
import { launch, newPage, startGame, checker } from './lib/game.mjs';

export default async function () {
  const C = checker('tablenums'), b = await launch();
  try {
    const p = await newPage(b);
    await startGame(p, { place: 'pub', mode: 'runpub' });
    const r = await p.evaluate(() => { const rp = RS.director.runpub, T = rp && rp.jobs && rp.jobs.tables, real = (RS.room.diningTables || []).filter(t => t.x < -14.5);
      const chairs = (RS.room.chairsAt || []).filter(s => s[0] < -14.5).length, seated = T ? T.reduce((a, t) => a + t.seats.length, 0) : 0;
      let close = 0; if (T) for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) if (T[i].at.distanceTo(T[j].at) < 1.2) close++;
      return { signs: T ? T.length : null, real: real.length, chairs, seated, close, numbers: T ? T.map(t => t.n) : [] }; });
    console.log('  ' + JSON.stringify(r));
    C.ok(r.real >= 10, `the restaurant doesn't list its tables (${r.real})`);
    C.ok(r.signs === r.real, `${r.signs} table numbers for ${r.real} tables`);
    C.ok(r.close === 0, `${r.close} pairs of table numbers right next to each other`);
    C.ok(r.seated === r.chairs, `${r.seated} of ${r.chairs} restaurant chairs are on a numbered table`);
    C.ok(r.numbers.every((n, i) => n === i + 1), `table numbers aren't 1 to ${r.signs}: ${r.numbers}`);
    C.ok(!p.errors.length, 'errors: ' + p.errors.slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
