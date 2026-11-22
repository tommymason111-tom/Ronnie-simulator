import { launch, newPage, sleep, checker } from './lib/game.mjs';
export default async function () { const C = checker('sh'), b = await launch();
  try { for (const [w,h,n] of [[390,844,'p'],[844,390,'l']]) { const p = await newPage(b, { width: w, height: h, mobile: true });
    await p.goto('http://game.local/index.html?x=1', { timeout: 120000, waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__menuShow, null, { timeout: 60000 }); await sleep(1500);
    await p.evaluate(() => window.__menuShow('place')); await sleep(1500); await p.screenshot({ path: '/tmp/claude-0/-home-user-Ronnie-simulator/9fc1b6a3-9c77-50a0-9dd9-c1b46e95e9c3/scratchpad/sh_place_'+n+'.png' });
    console.log('H2', JSON.stringify(await p.evaluate(() => { const h = document.querySelector('.screen.on h2'); const c = getComputedStyle(h); return { ov: c.overflow, w: h.clientWidth, sw: h.scrollWidth, h: h.clientHeight, sh: h.scrollHeight, fs: c.fontSize, ws: c.whiteSpace }; })));
    await p.evaluate(() => window.__menuShow('title')); await sleep(800);
    await p.evaluate(() => document.getElementById('cog').click()); await sleep(800); await p.screenshot({ path: '/tmp/claude-0/-home-user-Ronnie-simulator/9fc1b6a3-9c77-50a0-9dd9-c1b46e95e9c3/scratchpad/sh_set_'+n+'.png' });
    await p.evaluate(() => document.getElementById('set-mixbtn').click()); await sleep(800); await p.screenshot({ path: '/tmp/claude-0/-home-user-Ronnie-simulator/9fc1b6a3-9c77-50a0-9dd9-c1b46e95e9c3/scratchpad/sh_mix_'+n+'.png' });
    console.log('SETUPD', JSON.stringify(await p.evaluate(() => { const u = document.getElementById('set-updates'), c = getComputedStyle(u); const r = u.getBoundingClientRect(); return { ov: c.overflowY, r: [r.top, r.bottom].map(Math.round), sh: u.scrollHeight, ch: u.clientHeight, pos: c.position }; })));
    await p.evaluate(() => document.getElementById('set-close').click()); await sleep(500);
    await p.evaluate(() => document.getElementById('lb-open').click()); await sleep(3000); await p.screenshot({ path: '/tmp/claude-0/-home-user-Ronnie-simulator/9fc1b6a3-9c77-50a0-9dd9-c1b46e95e9c3/scratchpad/sh_lb_'+n+'.png' });
    await p.close(); } } finally { await b.close(); } return C.fails; }
