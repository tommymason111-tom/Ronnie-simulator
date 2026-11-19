// Two real games playing together through the real room server (run locally): a computer hosts, a phone joins, through
// the menus. They play THE WHOLE SQUAD in the pub (the host runs the squad and the food, the guest gets snapshots), the
// guest grabs food and throws it, punches, chats and emotes, the host changes the game from the pause menu, the guest's
// line drops and comes back. Checked: they see each other, NOT ONE real message is thrown away by the message checks
// (a check that's too strict breaks the game quietly), no errors, no crash reports.
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';

export default async function () {
  const C = checker('mp'), host = await startRoomHost(), b = await launch();
  try {
    const H = await newPage(b, { width: 900, height: 560 }), G = await newPage(b, { width: 390, height: 844, mobile: true });
    const ev = (p, f, a) => p.evaluate(f, a), cl = (p, s) => ev(p, (s) => document.querySelector(s).click(), s);
    for (const p of [H, G]) { await p.goto('http://game.local/index.html?relay=' + encodeURIComponent(host.url), { timeout: 120000, waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2000); }
    const join = async (p, n, ch, code) => { await cl(p, '.playbtn'); await sleep(400); await cl(p, '#pick-multi'); await sleep(400);
      await ev(p, ([n, c]) => { document.querySelector('#mp-myname').value = n; document.querySelector(`#char-grid .mate[data-id="${c}"]`).click(); }, [n, ch]); await cl(p, '#char-next'); await sleep(400);
      if (!code) { await cl(p, '#mp-host2'); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.code && ronnieMP.net.status === 'on', null, { timeout: 30000 }); return ev(p, () => ronnieMP.net.code); }
      await ev(p, (c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on', null, { timeout: 30000 }); };
    const code = await join(H, 'HOSTY', 'lewis'); await join(G, 'GUESTY', 'chloe', code);
    await cl(H, '#room-go'); await sleep(400); await ev(H, () => document.querySelector('.scene[data-id="pub"]').click()); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="place"] .bigbtn').click()); await sleep(500);
    await ev(H, () => { const f = () => document.querySelector('.flip[data-id="everyone"]'); f().click(); f().click(); }); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="mode"] .bigbtn').click()); await sleep(500); await cl(H, '#go');
    for (const p of [H, G]) { await p.waitForFunction(() => document.querySelector('.screen[data-s="intro"].on') || document.body.classList.contains('ready'), null, { timeout: 120000 }); await ev(p, () => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); }); }
    for (const p of [H, G]) { await p.waitForFunction(() => window.RS && document.body.classList.contains('ready'), null, { timeout: 180000 }); await ev(p, () => document.getElementById('play-flat').click()); }
    // play: both run their games (no drawing) and walk about; the guest grabs and throws food, punches, chats, emotes
    for (const [k, p] of [H, G].entries()) await ev(p, (k) => { RS.renderer.setAnimationLoop(null); let t = 0; window.__run = setInterval(() => { t += 0.05; RS.player.flatMove.x = Math.sin(t * 0.7 + k) * 0.5; RS.player.flatMove.z = Math.cos(t * 0.5 + k) * 0.5; RS.sim(0.05, 0.05); }, 50); }, k);
    await sleep(8000);
    for (let i = 0; i < 6; i++) {
      await ev(G, () => { const P = RS.player, it = RS.items.items.filter(x => !x.dead && !x.heldBy).sort((a, b2) => a.pos.distanceTo(P.head) - b2.pos.distanceTo(P.head))[0]; if (it && P.flatGrab) { P.flatGrab(it); setTimeout(() => P.flatThrow && P.flatThrow(6), 600); } });
      await sleep(2500);
    }
    await ev(G, () => { const p = [...RS.net.players.values()][0]; if (p && p.avatar) RS.mp.punch(p, new RS.THREE.Vector3(2, 0, 2), p.avatar.headPos()); RS.mp.chat('test chat'); RS.mp.emote('griddy'); });
    await sleep(4000);
    // the host changes the game from the pause menu: everyone restarts into it
    await ev(H, () => RS.newGame('roam')); await sleep(6000);
    // the guest's line drops and comes back on its own
    await ev(G, () => RS.net.ws.close()); await sleep(9000);
    const look = (p) => ev(p, () => ({ connected: RS.net.connected, mode: RS.director.fullMode || RS.director.mode, players: [...RS.net.players.values()].map(q => ({ name: q.name, model: !!q.avatar })), bad: RS.net.badMsgs || 0, emitErrs: RS.net.emitErrs ? Object.keys(RS.net.emitErrs) : [] }));
    const h = await look(H), g = await look(G);
    C.ok(h.connected && g.connected, `not both connected at the end: host ${h.connected}, guest ${g.connected}`);
    C.ok(h.players.some(q => q.name === 'GUESTY' && q.model), 'host does not see the guest: ' + JSON.stringify(h.players));
    C.ok(g.players.some(q => q.name === 'HOSTY' && q.model), 'guest does not see the host: ' + JSON.stringify(g.players));
    C.ok(h.mode === 'roam' && g.mode === 'roam', `host's game change didn't reach everyone: host ${h.mode}, guest ${g.mode}`);
    C.ok(!h.bad && !g.bad, `real messages thrown away by the message checks: host ${h.bad}, guest ${g.bad}`);
    C.ok(!h.emitErrs.length && !g.emitErrs.length, `message handlers errored: host ${h.emitErrs}, guest ${g.emitErrs}`);
    for (const [n, p] of [['host', H], ['guest', G]]) {
      C.ok(!p.errors.length, `${n}: page errors: ` + [...new Set(p.errors)].slice(0, 4).join(' | '));
      const cr = p.crashes.filter(c => c.k !== 'start' && c.k !== 'hang'); C.ok(!cr.length, `${n}: crash reports: ` + cr.slice(0, 4).map(c => c.k + ' ' + c.m + ' @' + c.s).join(' | '));
    }
    C.ok(host.stats.in > 200, 'hardly any messages went through the room: ' + host.stats.in);
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
