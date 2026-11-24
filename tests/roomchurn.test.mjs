// PEOPLE COMING AND GOING IN A ROOM'S GAME (real games through the local room server, upright phones).
// ROOMCHURN_ONLY=sweep,runpub,rcjoin,overback picks parts.
//  sweep:    a guest's game has every bit of the host's food, each the right thing (the guest's own count of food numbers
//            clashed with the host's: half the Supermarket Sweep's shelves missing on a guest, the rest jumping about)
//  runpub:   the host leaves Run the Pub: the new host's pub doesn't fill up with 150 pints (the food a guest's game had
//            put aside at its first game came back when hosting came over)
//  rcjoin:   the READY card with someone joining while it's up: they don't hold START up while they're loading or in the
//            lobby (nobody there has a card to tap), and once they're in the game they get the card (it was sent while
//            they were still in the menus) and START waits for them
//  overback: the end of a game, the host goes back to the lobby first: hosting comes back to them there (the guest it
//            went to is still on the receipt), and the finished game doesn't pull them in
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';
import { ev, openMenu, hostRoom, joinRoom, readyUp, pickGame, tapIn, freeRun } from './lib/room.mjs';
const ONLY = (process.env.ROOMCHURN_ONLY || 'sweep,runpub,rcjoin,overback').split(',');
const PHONE = { width: 390, height: 844, mobile: true };
const WHO = [['HOSTY', 'lewis'], ['BETH', 'chloe'], ['CARL', 'harry']];

export default async function () {
  const C = checker('roomchurn'), host = await startRoomHost(), b = await launch();
  const all = [];
  // a room of n real games in place/mode: [host, ...guests]
  const room = async (n, place, mode) => {
    const ps = [];
    for (let i = 0; i < n; i++) { const p = await newPage(b, PHONE); p.pname = WHO[i][0]; all.push(p); ps.push(p); await openMenu(p, host.url); }
    const code = await hostRoom(ps[0], ...WHO[0]); for (let i = 1; i < n; i++) await joinRoom(ps[i], code, ...WHO[i]);
    await sleep(1000); for (const p of ps.slice(1)) await readyUp(p); await sleep(1200);
    await pickGame(ps[0], place, mode);
    for (const p of ps) await tapIn(p);
    for (const p of ps) await freeRun(p);
    await sleep(3000); ps.code = code; return ps;
  };
  const done = async () => { for (const p of all.splice(0)) { if (p.isClosed()) continue; for (const e of [...new Set(p.errors)].slice(0, 3)) C.ok(false, `${p.pname}: ${e}`); const cr = p.crashes.filter(c => c.k !== 'start' && c.k !== 'hang'); C.ok(!cr.length, `${p.pname}: crash reports ${JSON.stringify(cr).slice(0, 300)}`); await p.context().close().catch(() => {}); } };
  try {
    if (ONLY.includes('sweep')) {
      const [H, G] = await room(2, 'shop', 'sweep'); await sleep(3000);
      const food = (p) => ev(p, () => RS.items.items.filter(i => !i.dead && i.nid).map(i => [i.nid, i.type]));
      const h = await food(H), g = new Map((await food(G)).map(([n, t]) => [n, t]));
      const missing = h.filter(([n]) => !g.has(n)), wrong = h.filter(([n, t]) => g.has(n) && g.get(n) !== t);
      C.ok(h.length > 200 && missing.length < 5 && !wrong.length, `the guest's sweep doesn't have the host's food: host ${h.length}, missing on the guest ${missing.length}, the wrong thing ${wrong.length}`);
      await done();
    }
    if (ONLY.includes('runpub')) {
      const [H, G, X] = await room(3, 'pub', 'runpub1'); await sleep(2000);
      const n = (p) => ev(p, () => RS.items.items.filter(i => !i.dead).length);
      const before = await n(G); await H.close(); await sleep(8000);
      const s = await ev(G, () => ({ host: RS.net.host, mode: RS.director.mode, n: RS.items.items.filter(i => !i.dead).length, minFood: RS.items.minFood })), x = await ev(X, () => ({ host: RS.net.host, mode: RS.director.mode }));
      C.ok(s.host !== x.host && s.mode === 'runpub' && x.mode === 'runpub', `hosting didn't move on cleanly: ${JSON.stringify(s)} / ${JSON.stringify(x)}`);
      const nh = s.host ? s : { ...(await ev(X, () => ({ n: RS.items.items.filter(i => !i.dead).length, minFood: RS.items.minFood }))) };
      C.ok(nh.n - before < 25 && !nh.minFood, `the new host's Run the Pub filled up with stuff: ${before} things before, ${nh.n} after (keeping ${nh.minFood} about)`);
      await done();
    }
    if (ONLY.includes('rcjoin')) {
      const [H, G] = await room(2, 'pub', 'roam');
      await ev(H, () => { document.getElementById('menu-btn').click(); document.getElementById('pause-restart').click(); }); await sleep(1500);
      const card = (p) => ev(p, () => { const c = document.getElementById('rc-card'), g = c.querySelector('.rc-go'); return { on: c.classList.contains('on'), go: g ? !g.disabled : null, n: c.querySelectorAll('.rc-p').length, txt: (c.querySelector('.rc-sum') || {}).textContent }; });
      C.ok((await card(H)).on, 'the host\'s READY card didn\'t come up');
      // CARL joins the room while the card's up: in the menus, then loading
      const X = await newPage(b, PHONE); X.pname = 'CARL'; all.push(X); await openMenu(X, host.url); await joinRoom(X, H.code ? H.code : await ev(H, () => RS.net.code), ...WHO[2]).catch(() => {});
      await G.waitForFunction(() => document.getElementById('rc-card').classList.contains('on'), null, { timeout: 15000, polling: 300 }).catch(() => {});
      await ev(G, () => document.querySelector('#rc-card .rc-ready').click()); await sleep(2500);
      const c1 = await card(H);
      C.ok(c1.go === true, `START is held up by someone who isn't in the game yet: ${JSON.stringify(c1)}`);
      await tapIn(X); await freeRun(X); await sleep(4000);
      const cx = await card(X), c2 = await card(H);
      C.ok(cx.on, `the player who joined while the READY card was up never got it: ${JSON.stringify(cx)}`);
      C.ok(c2.go === false && c2.n === 3, `once they're in, START should wait for them: ${JSON.stringify(c2)}`);
      await ev(X, () => { const r = document.querySelector('#rc-card .rc-ready'); if (r) r.click(); }); await sleep(2500);
      const c3 = await card(H); C.ok(c3.go === true, `START didn't unlock once the newcomer was ready: ${JSON.stringify(c3)}`);
      await ev(H, () => document.querySelector('#rc-card .rc-go').click()); await sleep(3000);
      for (const p of [H, G, X]) { const m = await ev(p, () => RS.director.mode); C.ok(m === 'roam', `${p.pname} isn't in the new game: ${m}`); }
      await done();
    }
    if (ONLY.includes('overback')) {
      const [H, G] = await room(2, 'pub', 'chonkoff');
      await ev(H, () => { RS.director.timeLeft = 0.3; }); await sleep(3000);
      const over = await ev(G, () => RS.G.over); C.ok(over, 'the guest\'s game didn\'t end');
      await ev(H, () => document.getElementById('over-leave').click());
      await H.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on' && document.querySelector('.screen.on[data-s="room"]'), null, { timeout: 90000, polling: 500 });
      await H.waitForFunction(() => ronnieMP.net.host, null, { timeout: 20000, polling: 500 }).catch(() => {});
      await sleep(4000);
      const h = await ev(H, () => ({ host: ronnieMP.net.host, role: ronnieMP.role, screen: (document.querySelector('.screen.on') || {}).dataset?.s, loading: document.getElementById('loadscreen').classList.contains('on') || document.body.classList.contains('ready'), go: document.querySelector('#room-go').style.display !== 'none' }));
      const g = await ev(G, () => ({ host: RS.net.host, over: RS.G.over }));
      C.ok(h.host && h.go && h.screen === 'room' && !h.loading && !g.host, `the host back in the lobby first should be the host there (and not pulled into the finished game): host ${JSON.stringify(h)}, guest ${JSON.stringify(g)}`);
      await done();
    }
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
