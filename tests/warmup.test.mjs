// THE WARM-UP: a room's game (here the Boss Fight in the pub's car park) opens with everyone in the map, free to walk
// about, and no boss yet; the host has a START button, the others are told the host starts it. The host's START begins
// the game for everyone. Someone who arrives during the warm-up gets the warm-up too. And chat: a message while the
// chat's closed puts a count on the CHAT button (in the lobby and in the game), opening it clears it.
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';

export default async function () {
  const C = checker('warmup'), host = await startRoomHost(), b = await launch();
  try {
    const WHO = [['HOSTY', 'lewis'], ['BETH', 'chloe'], ['CARL', 'ethan']], pages = [];
    for (const [n, c] of WHO) { const p = await newPage(b, { width: 640, height: 400, warm: true }); p.pname = n; pages.push(p);
      await p.goto('http://game.local/index.html?relay=' + encodeURIComponent(host.url), { timeout: 240000 }); await sleep(1200);
      await p.evaluate(() => document.querySelector('.playbtn').click()); await sleep(400); await p.evaluate(() => document.querySelector('#pick-multi').click()); await sleep(400);
      await p.evaluate(([n, c]) => { document.querySelector('#mp-myname').value = n; document.querySelector(`#char-grid .mate[data-id="${c}"]`).click(); }, [n, c]); await p.evaluate(() => document.querySelector('#char-next').click()); await sleep(400); }
    const [H, J, L] = pages, ev = (p, f, a) => p.evaluate(f, a);
    await ev(H, () => document.querySelector('#mp-host2').click()); await H.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on'); const code = await ev(H, () => ronnieMP.net.code);
    const join = async (p) => { await ev(p, (c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on'); };
    await join(J); await sleep(1500);
    // lobby chat: two messages from BETH while the host's chat is closed -> a 2 on the host's CHAT button
    for (const t of ['hello', 'ready?']) { await ev(J, (t) => { document.getElementById('room-chat-in').value = t; document.getElementById('room-chat-send').click(); }, t); await sleep(700); }
    const lb = await ev(H, () => { const e = document.getElementById('room-chat-badge'); return { hidden: e.hidden, n: e.textContent }; });
    C.ok(!lb.hidden && lb.n === '2', `the lobby's CHAT button didn't show 2 unread: ${JSON.stringify(lb)}`);
    await ev(H, () => document.getElementById('room-chat-btn').click()); await sleep(300);
    C.ok(await ev(H, () => document.getElementById('room-chat-badge').hidden), 'opening the chat didn\'t clear the count');
    await ev(H, () => document.getElementById('room-chat-btn').click());
    // into the Boss Fight (the pub's car park)
    await ev(J, () => document.getElementById('room-ready').click()); await sleep(800);
    await ev(H, () => document.getElementById('room-go').click()); await sleep(400);
    await ev(H, () => { document.querySelector('.scene[data-id="pub"]').click(); document.querySelector('.screen[data-s="place"] .bigbtn').click(); }); await sleep(500);
    for (let k = 0; k < 4 && !(await ev(H, () => { const f = document.querySelector('.flip[data-id="boss"]'); return f && f.classList.contains('sel'); })); k++) { await ev(H, () => document.querySelector('.flip[data-id="boss"]').click()); await sleep(350); }
    C.ok(await ev(H, () => document.querySelector('.flip[data-id="boss"]').classList.contains('sel')), 'couldn\'t pick the Boss Fight card');
    await ev(H, () => document.querySelector('.screen[data-s="mode"] .bigbtn').click()); await sleep(500);
    await ev(H, () => document.getElementById('go').click());
    const tapIn = (p) => p.waitForFunction(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); const st = document.getElementById('start'), g = window.RS && document.body.classList.contains('ready') && st && st.classList.contains('gone');
      if (g) { const bt = document.querySelector('#play-flat'); if (bt && bt.offsetParent) bt.click(); } return g && !RS.player.menuLock; }, null, { timeout: 240000, polling: 700 });
    for (const p of [H, J]) await tapIn(p);
    await sleep(2500);
    const st = (p) => ev(p, () => ({ warm: RS.warm(), mode: RS.director.mode, boss: !!(RS.director.boss && RS.director.boss.id), bar: document.getElementById('warm-bar').classList.contains('on'), btn: !!document.querySelector('#warm-bar button'), text: document.getElementById('warm-bar').textContent }));
    const sH = await st(H), sJ = await st(J);
    C.ok(sH.warm === 'boss' && sH.mode === 'roam' && !sH.boss && sH.bar && sH.btn, `the host isn't in a warm-up with a START button: ${JSON.stringify(sH)}`);
    C.ok(sJ.warm === 'boss' && sJ.mode === 'roam' && !sJ.boss && sJ.bar && !sJ.btn && /starts it/.test(sJ.text), `the guest isn't in the warm-up, waiting for the host: ${JSON.stringify(sJ)}`);
    // they can walk about in the warm-up
    await ev(H, () => { RS.renderer.__render = RS.renderer.render; RS.renderer.render = () => {}; });      // (the host's game not drawing while the guest walks: two at once leave each very few frames on the test machine)
    let moved = 0; const lock = await ev(J, () => ({ menuLock: !!RS.player.menuLock, noTurn: !!RS.player.noTurn, pinned: !!RS.player.pinned, flat: !!RS.player.flatMode }));
    await J.bringToFront(); await sleep(1000);      // (the test browser only keeps the front tab's game running smoothly)
    if (process.env.DBG) { await J.keyboard.down('KeyW'); for (let i = 0; i < 6; i++) { await sleep(500); console.log(JSON.stringify(await ev(J, () => { const P = RS.player; return { pos: [+P.head.x.toFixed(2), +P.head.z.toFixed(2)], mv: P.flatMove, touch: document.getElementById('touch').className, act: document.activeElement && (document.activeElement.id || document.activeElement.tagName), knock: !!P.knock, sp: P.speedMul, pin: P.pinned, frames: RS.renderer.info.render.frame }; }))); } await J.keyboard.up('KeyW'); }
    for (const k of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) { const p0 = await ev(J, () => [RS.player.head.x, RS.player.head.z]); await J.keyboard.down(k); await sleep(2500); await J.keyboard.up(k);
      moved = Math.max(moved, await ev(J, (p0) => Math.hypot(RS.player.head.x - p0[0], RS.player.head.z - p0[1]), p0)); }
    C.ok(moved > 0.2, `couldn't walk about in the warm-up (moved ${moved.toFixed(2)}m at most) ${JSON.stringify(lock)}`);
    // a late arrival gets the warm-up too
    await ev(J, () => { RS.renderer.__render = RS.renderer.render; RS.renderer.render = () => {}; });      // (two games drawing slow the test machine right down: the newcomer needs it)
    await join(L); await tapIn(L).catch(async (e) => { throw new Error('the late arrival never got in: ' + JSON.stringify(await ev(L, () => ({ screen: (document.querySelector('.screen.on') || {}).dataset?.s, start: document.getElementById('start').className, msg: (document.getElementById('room-msg') || {}).textContent, rs: !!window.RS })))); }); await sleep(4000);
    const sL = await st(L); C.ok(sL.warm === 'boss' && !sL.boss, `the late arrival isn't in the warm-up: ${JSON.stringify(sL)}`);
    // in-game chat: a message while the chat's closed -> a 1 on the CHAT button
    await ev(J, () => window.ronnieMP && RS.mp && RS.mp.chat ? RS.mp.chat('here we go') : document.getElementById('chat-btn').click());
    await ev(J, () => { const i = document.getElementById('chat-in'); if (i && document.getElementById('chat-box').classList.contains('on')) { i.value = 'here we go'; document.getElementById('chat-send').click(); } });
    await sleep(1500);
    const gb = await ev(H, () => { const e = document.getElementById('chat-badge'); return e ? { hidden: e.hidden, n: e.textContent } : null; });
    C.ok(gb && !gb.hidden && gb.n === '1', `the game's CHAT button didn't show 1 unread: ${JSON.stringify(gb)}`);
    C.ok(await ev(H, () => getComputedStyle(document.getElementById('pause-warm')).display !== 'none'), 'the host\'s pause menu has no START (the way in from a headset)');
    C.ok(await ev(J, () => getComputedStyle(document.getElementById('pause-warm')).display === 'none'), 'a guest\'s pause menu has a START');
    // the host presses START: the boss fight begins for everyone
    await ev(H, () => document.querySelector('#warm-bar button').click());
    for (const p of pages) { const ok = await p.waitForFunction(() => !RS.warm() && RS.director.mode === 'boss', null, { timeout: 60000 }).then(() => true, () => false); C.ok(ok, `${p.pname}: the Boss Fight didn't start when the host pressed START: ${JSON.stringify(await st(p))}`); }
    for (const p of pages) C.ok(!(await ev(p, () => document.getElementById('warm-bar').classList.contains('on'))), `${p.pname}: the warm-up bar is still up`);
    for (const p of pages) C.ok(!p.errors.length, `${p.pname}: page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
