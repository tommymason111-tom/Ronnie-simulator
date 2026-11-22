// RUN THE PUB's TO DO and ORDERS don't flicker: over 240 frames they're not rebuilt (their contents only change when
// what they say changes) and they don't jump about (one bit of code places each). SIZES='[[w,h],...]'
import { launch, newPage, startGame, checker, sleep } from './lib/game.mjs';
export default async function () {
  const C = checker('rpflicker'), b = await launch();
  try {
    for (const [W, H] of (process.env.SIZES ? JSON.parse(process.env.SIZES) : [[390, 844], [1280, 720]])) {
    const p = await newPage(b, { width: W, height: H, mobile: W < 1000 });
    await startGame(p, { place: 'pub', mode: 'runpub' });
    await sleep(8000);
    const r = await p.evaluate(async () => { const log = []; let last = {}, imgs = 0; const mo = new MutationObserver((l) => { for (const x of l) imgs += x.addedNodes.length; }); for (const id of ['rp-orders', 'rp-events']) { const e = document.getElementById(id); e && mo.observe(e, { childList: true, subtree: true }); }
      for (let i = 0; i < 240; i++) { await new Promise(res => requestAnimationFrame(res));
        for (const id of ['rp-orders', 'rp-events']) { const e = document.getElementById(id); if (!e) continue; const cs = getComputedStyle(e), r = e.getBoundingClientRect(); const s = `${e.innerHTML.length > 0 ? '' : 'EMPTY '}${cs.display}|${cs.visibility}|${(+cs.opacity).toFixed(2)}|${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)}x${Math.round(r.height)}|tight:${document.body.classList.contains('rp-tight')}`;
          if (last[id] !== s) { log.push(i + ' ' + id + ' ' + s); last[id] = s; } } }
      log.push('rebuilds(nodes added): ' + imgs); return log; });
    console.log(W + 'x' + H + ' changes: ' + r.length); const rb = +(r.find(l => l.startsWith('rebuilds')) || '0').split(': ')[1]; C.ok(rb === 0, `${W}x${H}: TO DO / ORDERS rebuilt ${rb} times with nothing changing`); console.log(r.slice(0, 12).join('\n')); C.ok(r.length <= 6, `${W}x${H}: TO DO / ORDERS moved or changed ${r.length} times in 240 frames`); await p.context().close(); }
  } finally { await b.close(); }
  return C.fails;
}
