// THE ROOM CHIP (👥 5 · CODE 👑) in a game: top centre, level with PAUSE / CHAT / VOICE (a phone on its side, a computer),
// and on an upright phone (no room in the middle) just under those buttons in their corner. Never on anything else.
// SHOT_DIR=dir saves pictures; SIZES='[[w,h,mode],...]'
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';
import fs from 'fs';
export default async function () {
  const C = checker('roomchip'), host = await startRoomHost(), b = await launch(), out = process.env.SHOT_DIR;
  try {
    for (const [W, H, mode] of (process.env.SIZES ? JSON.parse(process.env.SIZES) : [[390, 844, 'everyone'], [844, 390, 'everyone'], [1280, 720, 'everyone'], [390, 844, 'imposter']])) {
      const p = await newPage(b, { width: W, height: H, mobile: W < 1000 });
      await p.goto('http://game.local/index.html?relay=' + encodeURIComponent(host.url)); await p.waitForTimeout(1000);
      const ev = (f, a) => p.evaluate(f, a), cl = (s) => ev((s) => document.querySelector(s).click(), s);
      await cl('.playbtn'); await sleep(300); await cl('#pick-multi'); await sleep(300);
      await ev(() => { document.querySelector('#mp-myname').value = 'HOSTY'; document.querySelector('#char-grid .mate[data-id="lewis"]').click(); }); await cl('#char-next'); await sleep(300);
      await cl('#mp-host2'); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.code, null, { timeout: 60000 });
      await cl('#room-go'); await sleep(300); await ev(() => document.querySelector('.scene[data-id="pub"]').click()); await sleep(200);
      await ev(() => document.querySelector('.screen[data-s="place"] .bigbtn').click()); await sleep(400);
      await ev(() => { const f = document.querySelector('.flip[data-id="everyone"]'); f && f.click(); }); await sleep(200);
      await ev(() => document.querySelector('.screen[data-s="mode"] .bigbtn').click()); await sleep(400); await cl('#go');
      await p.waitForFunction(() => { for (const id of ['#intro-ready', '#ui-intro-ready', '.howto-ready']) { const r = document.querySelector(id); if (r && r.offsetParent) r.click(); } const st = document.getElementById('start'); const inG = window.RS && document.body.classList.contains('ready') && st && st.classList.contains('gone'); if (inG) { const b = document.querySelector('#play-flat'); if (b && b.offsetParent) b.click(); } return inG && RS.director.mode; }, null, { timeout: 300000, polling: 700 });
      if (mode !== 'everyone') { await ev((m) => RS.newGame(m), mode); await p.waitForFunction(() => { for (const id of ['#intro-ready', '#ui-intro-ready', '.howto-ready']) { const r = document.querySelector(id); if (r && r.offsetParent) r.click(); } return document.body.classList.contains('ready'); }, null, { timeout: 200000, polling: 700 }); }
      await p.waitForFunction(() => !document.querySelector('#loadscreen.on'), null, { timeout: 120000 }).catch(() => {}); await sleep(4000);
      const r = await ev(() => { const g = (id) => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] : null; }; const m = RS.notes ? RS.notes() : []; return { W: innerWidth, H: innerHeight, meter: (m.find(n => n.id === 'meter' || n.kind === 'meter') || null), chip: g('mp-chip'), menu: g('menu-btn'), chat: g('chat-btn'), vc: g('vc-bar'), boss: g('boss-hud'), next: g('nextAttack'), notes: RS.notes ? RS.notes().length : null }; });
      console.log(W, H, mode, JSON.stringify(r));
      const c = r.chip, mb = r.menu, ov = (a, b) => a && b && a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
      C.ok(!!c, `${W}x${H} ${mode}: no room chip`);
      if (c && mb) { const upright = W < 760 && H > W;
        if (!upright) C.ok(Math.abs((c[0] + c[2]) / 2 - W / 2) < W * 0.15 && Math.abs((c[1] + c[3]) / 2 - (mb[1] + mb[3]) / 2) < 6, `${W}x${H} ${mode}: the room chip isn't top centre, level with PAUSE: ${JSON.stringify({ c, mb })}`);
        else C.ok(c[1] >= mb[3] && c[1] - mb[3] < 20 && Math.abs(c[2] - mb[2]) < 4, `${W}x${H} ${mode}: the room chip isn't just under the corner's buttons: ${JSON.stringify({ c, mb })}`);
        for (const k of ['menu', 'chat', 'vc', 'boss', 'next']) C.ok(!ov(c, r[k]), `${W}x${H} ${mode}: the room chip is on ${k}: ${JSON.stringify({ c, o: r[k] })}`); }
      C.ok(!p.errors.length, `${W}x${H} ${mode}: ` + p.errors.slice(0, 3).join(' | '));
      if (out) await p.screenshot({ timeout: 120000 }).then(b => fs.writeFileSync(`${out}/chip_${W}x${H}_${mode}.png`, b)).catch(() => {});
      await p.context().close();
    }
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
