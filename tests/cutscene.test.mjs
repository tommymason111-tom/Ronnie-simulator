// BEN'S TRIP TO TURKEY (the full-screen cut scene): it plays for TURKEY_LEN (12s, it dragged at 20), and on your own
// the world behind it stops dead: nobody moves or talks, nothing's thrown, the clock waits, nothing's heard. In a room
// (multiplayer) the others carry on, so the world keeps going there.
import { launch, newPage, startGame, checker } from './lib/game.mjs';

export default async function () {
  const C = checker('cutscene'), b = await launch();
  try {
    for (const multi of [false, true]) {
      const p = await newPage(b, { width: 640, height: 400 });
      await startGame(p, { place: 'pub', mode: 'everyone' });
      const r = await p.evaluate(async (multi) => {
        RS.renderer.setAnimationLoop(null);
        const { Character } = await import('./js/character.js'), A = await import('./js/audio.js'), { TURKEY_LEN } = await import('./js/cutscenes.js');
        const D = RS.director, fx = D.g.fx, ben = RS.cast.find(c => c.id === 'ben');
        if (!ben) return { noBen: RS.cast.map(c => c.id) };
        if (multi) { RS.net.ws = { readyState: 1, send() {}, close() {} }; }      // (pretend we're in a room)
        for (const o of RS.cast) if (o.state === 'act') o.state = 'idle';
        D.pending = null; const ok = D.launch({ c: ben, attack: { key: 'turkey' } });
        let t = 0; while (!fx.inCutscene && t < 30) { RS.sim(0.1, 1 / 30); t += 0.1; }
        if (!fx.inCutscene) return { never: true, ok, state: ben.state };
        // what the world's doing while it plays
        let lines = 0; const show0 = Character.prototype.showLine; Character.prototype.showLine = function (...a) { lines++; return show0.apply(this, a); };
        const where = () => RS.cast.filter(c => c.rag && c.rag.mesh).map(c => [c.rag.root.x, c.rag.root.z]);
        const items = () => RS.items.items.filter(i => !i.dead).map(i => [i.pos.x, i.pos.y, i.pos.z]);
        const w0 = where(), i0 = items(), left0 = D.timeLeft, start = t;
        RS.sim(4, 1 / 30); t += 4;
        const w1 = where(), i1 = items(), moved = Math.max(0, ...w0.map((a, k) => w1[k] ? Math.hypot(a[0] - w1[k][0], a[1] - w1[k][1]) : 0)), itemMoved = Math.max(0, ...i0.map((a, k) => i1[k] ? Math.hypot(a[0] - i1[k][0], a[1] - i1[k][1], a[2] - i1[k][2]) : 0));
        const hushed = A.hushed(), clock = D.timeLeft - left0, linesDuring = lines;
        while (fx.inCutscene && t < start + 40) { RS.sim(0.1, 1 / 30); t += 0.1; }
        const len = t - start + 0.0;
        // and after: the world's going again
        // (people mostly stand about in this game, so: lift a bit of food up and see it fall)
        const it = RS.items.items.find(i => !i.dead && !i.heldBy); let after = 0;
        if (it) { it.obj.position.y += 1.5; it.resting = false; const y0 = it.obj.position.y; RS.sim(1.5, 1 / 30); after = y0 - it.obj.position.y; }
        Character.prototype.showLine = show0;
        return { TURKEY_LEN, len, moved, itemMoved, hushed, hushAfter: A.hushed(), clock, linesDuring, after, timed: D.mode !== 'roam' && D.mode !== 'classic' };
      }, multi);
      const tag = multi ? 'in a room' : 'on your own';
      if (r.noBen) { C.ok(false, `${tag}: Ben isn't in THE WHOLE SQUAD: ${r.noBen}`); await p.context().close(); continue; }
      if (r.never) { C.ok(false, `${tag}: Ben's Turkey cut scene never started (launch ${r.ok}, Ben ${r.state})`); await p.context().close(); continue; }
      console.log(`  ${tag}: played ${r.len.toFixed(1)}s, people moved ${r.moved.toFixed(2)}m, food moved ${r.itemMoved.toFixed(2)}m, ${r.linesDuring} lines, clock ${r.clock.toFixed(1)}s, moved after ${r.after.toFixed(2)}m`);
      C.ok(r.TURKEY_LEN <= 12.5 && Math.abs(r.len - r.TURKEY_LEN) < 1.5, `${tag}: the cut scene played ${r.len.toFixed(1)}s (should be ${r.TURKEY_LEN}s)`);
      if (!multi) {
        C.ok(r.moved < 0.01, `${tag}: people walked about behind the cut scene (${r.moved.toFixed(2)}m)`);
        C.ok(r.itemMoved < 0.01, `${tag}: things moved behind the cut scene (${r.itemMoved.toFixed(2)}m)`);
        C.ok(r.linesDuring === 0, `${tag}: people talked behind the cut scene (${r.linesDuring} lines)`);
        C.ok(r.hushed === true, `${tag}: the world wasn't hushed during the cut scene`);
        C.ok(Math.abs(r.clock) < 0.01, `${tag}: the game clock ran during the cut scene (${r.clock.toFixed(1)}s)`);
        C.ok(r.after > 0.05, `${tag}: the world didn't start again after the cut scene`);
      } else {
        C.ok(r.hushed === false, `${tag}: the world was frozen for everyone in a room`);
      }
      C.ok(r.hushAfter === false, `${tag}: still hushed after the cut scene`);
      C.ok(!p.errors.length, `${tag}: page errors: ` + p.errors.slice(0, 3).join(' | '));
      await p.context().close();
    }
  } finally { await b.close(); }
  return C.fails;
}
