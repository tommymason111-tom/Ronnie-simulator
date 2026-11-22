// THE SCREEN IN A ROOM, ON A PHONE: every busy mode with the multiplayer bits showing (the corner's buttons, the room
// chip, a chat line, the voice button), portrait and on its side: no bit of text may sit on another, or off the screen,
// and the Boss Fight has no top-left box (its own health bar says it all). VIEWS=390x844,844x390 MODES=garden/boss,...
// (lib/textcheck.js reads every bit of text on the screen)
import fs from 'fs';
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';
const CHECK = fs.readFileSync(new URL('./lib/textcheck.js', import.meta.url), 'utf8'), SHOTS = process.env.SHOTS || '';
const LIST = (process.env.MODES || 'garden/boss,pub/everyone,pub/runpub,pub/imposter').split(',');
const VIEWS = (process.env.VIEWS || '390x844,844x390').split(',').map(v => v.split('x').map(Number));
export default async function () {
  const C = checker('hudlayout'), host = await startRoomHost(), b = await launch();
  try {
    for (const [W, H] of VIEWS) for (const pm of LIST) { const [place, mode] = pm.split('/');
      const p = await newPage(b, { width: W, height: H, mobile: true, warm: !!process.env.WARM });
      try {
        await p.addInitScript(() => { try { sessionStorage.setItem('rs_devmp_ok', '1'); } catch (e) {} });
        await p.goto(`http://game.local/index.html?devmp=2&relay=${encodeURIComponent(host.url)}`, { timeout: 240000 });
        await p.waitForFunction(() => { const m = window.ronnieMP; return m && m.net && m.net.players.size === 2 && [...m.net.players.values()].every(q => q.ready); }, null, { timeout: 90000 });
        const ev = (f, a) => p.evaluate(f, a);
        await ev(() => document.getElementById('room-go').click()); await sleep(500);
        await ev((pl) => { document.querySelector(`.scene[data-id="${pl}"]`).click(); document.querySelector('.screen[data-s="place"] .bigbtn').click(); }, place); await sleep(600);
        for (let k = 0; k < 4 && !(await ev((m) => { const f = document.querySelector(`.flip[data-id="${m}"]`); return !f || f.classList.contains('sel'); }, mode)); k++) { await ev((m) => document.querySelector(`.flip[data-id="${m}"]`).click(), mode); await sleep(350); }
        await ev(() => { const n = document.querySelector('.screen.on[data-s="mode"] .bigbtn'); n && n.click(); }); await sleep(600);
        await ev(() => document.getElementById('go').click());
        await p.waitForFunction(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); const st = document.getElementById('start'), g = window.RS && document.body.classList.contains('ready') && st && st.classList.contains('gone'); if (g) { const bt = document.querySelector('#play-flat'); if (bt && bt.offsetParent) bt.click(); } return g && !RS.player.menuLock; }, null, { timeout: 240000, polling: 700 });
        if (mode === 'boss') await p.waitForFunction(() => document.querySelector('#boss-hud.on') && !document.body.classList.contains('boss-cine'), null, { timeout: 120000 }).catch(() => {});
        await sleep(+(process.env.WAITS || 6000));
        // a chat line or two, so the log shows
        await ev(() => { const c = window.__fakes && window.__fakes.bots[0]; if (c) c.send({ t: 'chat', s: 'come on lads' }); });
        await sleep(1500); await ev(() => window.__layoutHud && window.__layoutHud()); await sleep(400);
        if (SHOTS) await p.screenshot({ path: `${SHOTS}/hud_${mode}_${W}.png` });
        await ev(CHECK); const probs = (await ev(() => window.__textCheck())).filter(o => o.kind === 'text on text' || o.kind === 'off the side of the screen');
        const info = await ev(() => ({ meter: !!(RS.player.wrist && RS.player.wrist.visible), warm: RS.warm && RS.warm() }));
        console.log(`  ${W}x${H} ${mode}: top-left box ${info.meter} ${probs.length ? '\n    ' + probs.map(o => `${o.kind}: ${o.text} × ${o.by || ''} | ${o.where}`).join('\n    ') : 'no overlaps'}`);
        for (const o of probs) C.ok(false, `${W}x${H} ${mode}: ${o.kind}: ${o.text} × ${o.by || ''} (${o.where})`);
        if (mode === 'boss') C.ok(!info.meter, `${W}x${H} boss: the top-left box is showing (the boss's bar says it all)`);
        if (W < 760 || H < 500) C.ok(await ev(() => document.body.classList.contains('compact-ui') && document.getElementById('menu-btn').textContent.trim() === '⏸'), `${W}x${H} ${mode}: the corner's buttons aren't the compact row`);
        C.ok(!p.errors.length, `${W}x${H} ${mode}: errors ${p.errors.slice(0, 2).join(' | ')}`);
      } catch (e) { C.ok(false, `${W}x${H} ${mode}: ${e.message.slice(0, 200)}`); }
      await p.close();
    }
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
