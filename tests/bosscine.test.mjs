// THE BOSS FIGHT'S INTRO SHOT: its camera starts near you, so your own body (playing as one of the squad, in a room) and
// anyone right by the camera are left out of the frames it draws (the screen used to be filled with your own back)
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';
export default async function () { const C = checker('bosscine'), host = await startRoomHost(), b = await launch();
  try { const p = await newPage(b, { width: 390, height: 844, mobile: true });
    await p.addInitScript(() => { try { sessionStorage.setItem('rs_devmp_ok', '1'); localStorage.setItem('rs_mp_char', 'lewis'); } catch (e) {} });
    await p.goto(`http://game.local/index.html?devmp=2&relay=${encodeURIComponent(host.url)}`, { timeout: 240000 });
    await p.waitForFunction(() => { const m = window.ronnieMP; return m && m.net && m.net.players.size === 2 && [...m.net.players.values()].every(q => q.ready); }, null, { timeout: 90000 });
    await p.evaluate(() => document.getElementById('room-go').click()); await sleep(500);
    await p.evaluate(() => { document.querySelector('.scene[data-id="garden"]').click(); document.querySelector('.screen[data-s="place"] .bigbtn').click(); }); await sleep(600);
    for (let k = 0; k < 4 && !(await p.evaluate(() => { const f = document.querySelector('.flip[data-id="boss"]'); return !f || f.classList.contains('sel'); })); k++) { await p.evaluate(() => document.querySelector('.flip[data-id="boss"]').click()); await sleep(400); }
    await p.evaluate(() => { const n = document.querySelector('.screen.on[data-s="mode"] .bigbtn'); n && n.click(); }); await sleep(600);
    await p.evaluate(() => document.getElementById('go').click());
    await p.waitForFunction(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); const bt = document.querySelector('#play-flat'); if (bt && bt.offsetParent) bt.click(); return document.body.classList.contains('boss-cine'); }, null, { timeout: 240000, polling: 300 });
    await p.evaluate(() => { const R = RS.renderer, r0 = R.render.bind(R); window.__cineSeen = []; R.render = (s, c) => { if (document.body.classList.contains('boss-cine')) { const sb = RS.selfBody && RS.selfBody(); window.__cineSeen.push((c === (RS.director.boss && RS.director.boss.cam) ? 'cine:' : 'other:') + (sb && sb.c ? sb.c.rag.group.visible : 'none')); } if (0) { const sb = RS.selfBody && RS.selfBody(); window.__cineSeen.push(sb && sb.c ? sb.c.rag.group.visible : 'none'); } return r0(s, c); }; });
    const seen = await p.evaluate(() => window.__cineSeen.slice(0, 40)); 
    C.ok(seen.filter(v => v.startsWith('cine')).length && seen.filter(v => v.startsWith('cine')).every(v => v === 'cine:false'), `your own body was drawn in the boss intro: ${JSON.stringify(seen.slice(0, 10))}`);
    C.ok(!p.errors.length, 'errors ' + p.errors.slice(0, 2).join(' | '));
  } finally { await b.close(); await host.close(); } return C.fails; }
