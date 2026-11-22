// NOTIFICATIONS DON'T PILE UP (an upright phone): eating fast (the snack words, the +N, the combo words), and then
// everything at once (a banner, an attack card, the squad talking, a hint, more eating): sampled through it, no two
// notifications on the screen overlap (RS.notes(): the 3D ones projected, and the page ones). They used to: the eating
// word, the +N and the combo stacked on each other
import { launch, newPage, startGame, sleep, checker } from './lib/game.mjs';

export default async function () {
  const C = checker('notify'), b = await launch();
  try {
    for (const [w, h] of [[390, 844], [844, 390]]) {
      const p = await newPage(b, { width: w, height: h, mobile: true });
      await startGame(p, { place: 'pub', mode: 'everyone' }); await sleep(1500);
      await p.evaluate(() => RS.renderer.setAnimationLoop(null));
      const res = await p.evaluate(() => {
        const bad = new Map(), hit = (a, b) => a.x0 < b.x1 - 2 && a.x1 > b.x0 + 2 && a.y0 < b.y1 - 2 && a.y1 > b.y0 + 2;
        const look = (tag) => { const n = RS.notes(); for (const r of n) if (/^(speech|word)/.test(r.k) && r.y1 > 0 && r.y0 < innerHeight && (r.x0 < -2 || r.x1 > innerWidth + 2)) { const k = `${tag}: ${r.k} runs off the side of the screen`; bad.set(k, (bad.get(k) || 0) + 1); } for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) if (hit(n[i], n[j])) { const k = `${tag}: ${n[i].k} × ${n[j].k}`; bad.set(k, (bad.get(k) || 0) + 1); if (!window.__dbg) window.__dbg = []; window.__dbg.push(JSON.stringify([n[i], n[j]].map(r => [r.k, Math.round(r.x0), Math.round(r.y0), Math.round(r.x1), Math.round(r.y1)])) + ' cardT=' + (RS.attackFx.cardT || 0).toFixed(2)); } return n.length; };
        const food = () => RS.items.items.find(it => !it.heldBy && it.def && !it.def.prop && !it.def.veg && !it.def.poop && it.bitesLeft > 0);
        let most = 0;
        // 1. eating fast: a bite every 0.3s (combos build)
        for (let i = 0; i < 14; i++) { const it = food(); if (it) RS.bite(it); for (let k = 0; k < 3; k++) { RS.sim(0.1); most = Math.max(most, look('eating')); } }
        // 2. everything at once
        RS.director.nextAttackT = 0.05; RS.showBanner('THE WHOLE SQUAD', "EVERYONE'S HERE");
        const near = RS.cast.filter(c => !c.benched).slice(0, 3); near.forEach((c, i) => c.say(['Alright Ron!', 'Big lad!', 'Save some for us'][i], 4));
        const hint = document.getElementById('hint'); if (hint) { hint.textContent = 'Walk up to it to play'; hint.classList.add('on'); }
        for (let i = 0; i < 25; i++) { if (i % 3 === 0) { const it = food(); if (it) RS.bite(it); } RS.sim(0.2); most = Math.max(most, look('all at once')); }
        return { dbg: window.__dbg || [], bad: [...bad].map(([k, n]) => `${k} (${n}x)`), most };
      });
      for (const d of res.dbg || []) console.log('    DBG ' + d);
      console.log(`  ${w}x${h}: up to ${res.most} notifications at once; ${res.bad.length ? 'overlaps:\n    ' + res.bad.join('\n    ') : 'no overlaps'}`);
      C.ok(!res.bad.length, `${w}x${h}: notifications overlapping: ${res.bad.slice(0, 5).join(' | ')}`);
      C.ok(!p.errors.length, `${w}x${h}: page errors ${p.errors.slice(0, 2).join(' | ')}`);
      await p.close();
    }
  } finally { await b.close(); }
  return C.fails;
}
