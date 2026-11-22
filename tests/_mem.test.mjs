import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';
export default async function () { const C = checker('mem'), host = await startRoomHost(), b = await launch();
  try { for (const spec of (process.env.SPECS || 'pub/prophunt/5,pub/imposter/5,garden/boss/5,pub/everyone/5').split(',')) { const [PL, MO, NN] = spec.split('/'), N = +NN; const p = await newPage(b, { width: 390, height: 844, mobile: true });
      await p.addInitScript(() => { try { sessionStorage.setItem('rs_devmp_ok', '1'); } catch (e) {} });
      await p.goto(`http://game.local/index.html?devmp=${N}&relay=${encodeURIComponent(host.url)}`, { timeout: 240000 });
      await p.waitForFunction((n) => { const m = window.ronnieMP; return m && m.net && m.net.players.size === n && [...m.net.players.values()].every(q => q.ready); }, N, { timeout: 120000 });
      const cdp = await p.context().newCDPSession(p);
      const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); const r = await p.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1); return r; };
      const lobby = await heap();
      await p.evaluate(() => document.getElementById('room-go').click()); await sleep(500);
      await p.evaluate((pl) => { document.querySelector(`.scene[data-id="${pl}"]`).click(); document.querySelector('.screen[data-s="place"] .bigbtn').click(); }, PL); await sleep(600);
      for (let k = 0; k < 4 && !(await p.evaluate((m) => { const f = document.querySelector(`.flip[data-id="${m}"]`); return !f || f.classList.contains('sel'); }, MO)); k++) { await p.evaluate((m) => document.querySelector(`.flip[data-id="${m}"]`).click(), MO); await sleep(400); }
      await p.evaluate(() => { const n = document.querySelector('.screen.on[data-s="mode"] .bigbtn'); n && n.click(); }); await sleep(600);
      await p.evaluate(() => { window.__peak = 0; window.__pk = setInterval(() => { if (performance.memory) window.__peak = Math.max(window.__peak, performance.memory.usedJSHeapSize); }, 200); });
      await p.evaluate(() => document.getElementById('go').click());
      await p.waitForFunction(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); const bt = document.querySelector('#play-flat'); if (bt && bt.offsetParent) bt.click(); return window.RS && RS.director && RS.director.running && document.getElementById('start').classList.contains('gone'); }, null, { timeout: 240000, polling: 500 });
      await sleep(4000); await p.evaluate(() => { const d = RS.director; try { if (d.prophunt && d.prophunt.doStart) d.prophunt.doStart(); if (d.imposter && d.imposter.hostDeal) d.imposter.hostDeal(); } catch (e) {} }); await sleep(20000);
      const g = await heap();
      const info = await p.evaluate(() => { const i = RS.renderer.info; let texBytes = 0; const seen = new Set(); RS.scene.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) for (const k in m) { const t = m[k]; if (t && t.isTexture && !seen.has(t)) { seen.add(t); const im = t.image; if (im && im.width) texBytes += im.width * im.height * 4 * 1.33; } } }); return { geo: i.memory.geometries, tex: i.memory.textures, sceneTex: seen.size, texMB: Math.round(texBytes / 1048576), avatars: [...RS.net.players.values()].filter(q => q.avatar).length, verts: (() => { let v = 0; const gs = new Set(); RS.scene.traverse(o => { if (o.geometry && !gs.has(o.geometry)) { gs.add(o.geometry); const a = o.geometry.attributes.position; if (a) v += a.count; } }); return Math.round(v / 1000) + 'k'; })(), rts: RS.renderer.info.memory.textures }; });
      const peak = await p.evaluate(() => Math.round(window.__peak / 1048576)); console.log(`MEM ${spec} lobby=${lobby}MB peak=${peak}MB game=${g}MB errors=${p.errors.length} ${p.errors.slice(0,2).join('|').slice(0,200)} ${JSON.stringify(info)}`);
      await p.close(); } } finally { await b.close(); await host.close(); } return C.fails; }
