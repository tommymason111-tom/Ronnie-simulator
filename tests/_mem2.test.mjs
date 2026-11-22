import { launch, newPage, sleep, checker } from './lib/game.mjs';
export default async function () { const C = checker('mem2'), b = await launch();
  try { const p = await newPage(b, { width: 390, height: 844, mobile: true });
    await p.addInitScript(() => { window.__peak = 0; setInterval(() => { if (performance.memory) window.__peak = Math.max(window.__peak, performance.memory.usedJSHeapSize); }, 200); });
    await p.goto('http://game.local/index.html?go=1&place=pub&mode=everyone'); await p.waitForFunction(() => window.RS && document.body.classList.contains('ready'), null, { timeout: 180000 });
    await p.evaluate(() => { const b = document.getElementById('play-flat'); b && b.click(); }); await sleep(12000);
    console.log('SOLO peak', await p.evaluate(() => Math.round(window.__peak / 1048576)), 'MB');
  } finally { await b.close(); } return C.fails; }
