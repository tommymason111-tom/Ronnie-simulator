// DEVELOPER MODE'S TEST ROOM: the dev panel's MULTIPLAYER page opens a room (?devmp=N) and fills it with N fake players
// (js/fakeplayers.js). Here, on a local room server: they all join and ready up (START unlocks), walk about once the
// game's going, tap I'M READY on the host's ready card, and play along: in Prop Hunt the hiders turn into things and lock
// in, in Imposter the crew do their jobs. The lobby's bar adds and takes them away. FAKES=4 (1 to 11)
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';

export default async function () {
  const C = checker('fakeplayers'), N = Math.max(1, Math.min(11, Number(process.env.FAKES) || 4)), host = await startRoomHost(), b = await launch();
  try {
    const p = await newPage(b, { width: 640, height: 400 });
    await p.addInitScript(() => { try { sessionStorage.setItem('rs_devmp_ok', '1'); } catch (e) {} });
    await p.goto(`http://game.local/index.html?devmp=${N}&relay=${encodeURIComponent(host.url)}`, { timeout: 240000 });
    const ev = (f, a) => p.evaluate(f, a);
    // the room: everyone in, everyone ready, START unlocked
    const inRoom = await p.waitForFunction((n) => { const m = window.ronnieMP; return m && m.net && m.net.status === 'on' && m.net.players.size === n && [...m.net.players.values()].every(q => q.ready && q.char); }, N, { timeout: 90000, polling: 500 }).then(() => true, () => false);
    const r0 = await ev(() => { const m = window.ronnieMP; return { host: m && m.role, n: m && m.net && m.net.players.size, names: m && m.net ? [...m.net.players.values()].map(q => `${q.name}/${q.char}/${q.ready ? 'R' : '-'}`) : [], bar: !document.getElementById('room-fakes').hidden }; });
    C.ok(inRoom && r0.host === 'host' && r0.bar, `the test room didn't fill with ${N} ready fake players: ${JSON.stringify(r0)}`);
    console.log(`  room: ${r0.names.join(', ')}`);
    // the green bar: one more, one fewer
    await ev(() => document.querySelector('#room-fakes [data-f="1"]').click());
    const up = await p.waitForFunction((n) => window.ronnieMP.net.players.size === n, N + 1, { timeout: 30000 }).then(() => true, () => false);
    await ev(() => document.querySelector('#room-fakes [data-f="-1"]').click());
    const down = await p.waitForFunction((n) => window.ronnieMP.net.players.size === n, N, { timeout: 30000 }).then(() => true, () => false);
    C.ok(up && down, `the lobby's + and − didn't add and take away a fake player (${up}, ${down})`);
    // into a game (the pub, free roam)
    await ev(() => document.getElementById('room-go').click()); await sleep(400);
    await ev(() => { document.querySelector('.scene[data-id="pub"]').click(); document.querySelector('.screen[data-s="place"] .bigbtn').click(); }); await sleep(500);
    await ev(() => { const f = document.querySelector('.flip[data-id="roam"]'); f && f.click(); document.querySelector('.screen[data-s="mode"] .bigbtn').click(); }); await sleep(500);
    C.ok(await ev(() => !document.getElementById('go').classList.contains('wait')), 'START is still locked with every fake player ready');
    await ev(() => document.getElementById('go').click());
    await p.waitForFunction(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); const st = document.getElementById('start'), inGame = window.RS && document.body.classList.contains('ready') && st && st.classList.contains('gone');
      if (inGame) { const bt = document.querySelector('#play-flat'); if (bt && bt.offsetParent) bt.click(); } return inGame && !RS.player.menuLock; }, null, { timeout: 240000, polling: 700 });
    await ev(() => { RS.renderer.__render = RS.renderer.render; RS.renderer.render = () => {}; });      // (no pictures needed: keeps the test machine quick)
    // they walk about (their Ronnies move)
    const where = () => ev(() => [...RS.net.players.values()].map(q => q.avatar ? [+q.avatar.pos.x.toFixed(2), +q.avatar.pos.z.toFixed(2)] : null));
    await sleep(3000); const w1 = await where(); let w2 = w1; const far = w1.map(() => 0);
    for (let k = 0; k < 4; k++) { await sleep(4000); w2 = await where(); w2.forEach((b, i) => { const a = w1[i]; if (a && b) far[i] = Math.max(far[i], Math.hypot(a[0] - b[0], a[1] - b[1])); }); }
    const moved = far.filter(d => d > 0.5).length;
    C.ok(w2.filter(Boolean).length === N && moved >= Math.ceil(N / 2), `the fake players aren't walking about: ${moved} of ${N} moved (${JSON.stringify(w1)} -> ${JSON.stringify(w2)})`);
    // the host's ready card for a new game: they all tap I'M READY
    await ev(() => window.__rc.begin('prophunt'));
    const allReady = await p.waitForFunction(() => { const g = document.querySelector('#rc-card .rc-go'); return g && !g.disabled; }, null, { timeout: 30000 }).then(() => true, () => false);
    C.ok(allReady, 'the fake players never readied up on the ready card: ' + await ev(() => (document.querySelector('#rc-card .rc-sum') || {}).textContent));
    await ev(() => document.querySelector('#rc-card .rc-go') && document.querySelector('#rc-card .rc-go').click());
    await p.waitForFunction(() => { for (const id of ['#intro-ready', '#ui-intro-ready', '.howto-ready']) { const r = document.querySelector(id); if (r && r.offsetParent) r.click(); } return window.RS && RS.director.prophunt; }, null, { timeout: 120000, polling: 500 });
    await sleep(2500);
    // PROP HUNT: start; the hiding bots become things and lock in
    await ev(() => RS.director.prophunt.doStart());
    await p.waitForFunction(() => RS.director.prophunt.phase === 'hide', null, { timeout: 30000 }).catch(() => {});
    await sleep(9000);
    const ph = await ev(() => { const m = RS.director.prophunt; const bots = [...m.players.values()].filter(q => q.id !== m.me); return { hiders: bots.filter(q => q.role === 'hider').map(q => ({ k: q.kind, locked: !!q.locked })), seekers: bots.filter(q => q.role === 'seeker').length }; });
    const hidOk = ph.hiders.filter(h => h.k).length, lockOk = ph.hiders.filter(h => h.locked).length;
    C.ok(ph.hiders.length > 0 && hidOk === ph.hiders.length && lockOk >= Math.ceil(ph.hiders.length / 2), `Prop Hunt: the fake hiders didn't turn into things and lock in: ${JSON.stringify(ph)}`);
    console.log(`  prop hunt: ${ph.hiders.length} fake hiders (${hidOk} props, ${lockOk} locked), ${ph.seekers} fake seekers`);
    // IMPOSTER: the crew walk to their jobs and do them
    await ev(() => RS.newGame('imposter'));
    await p.waitForFunction(() => { for (const id of ['#intro-ready', '#ui-intro-ready', '.howto-ready']) { const r = document.querySelector(id); if (r && r.offsetParent) r.click(); } return window.RS && RS.director.imposter; }, null, { timeout: 120000, polling: 500 });
    await sleep(2500);
    if (N + 1 >= 3) { await ev(() => RS.director.imposter.hostDeal());
      const jobs = await p.waitForFunction(() => { const m = RS.director.imposter; return m && m.bar && m.bar.done > 0; }, null, { timeout: 300000, polling: 1000 }).then(() => true, () => false);
      const st = await ev(() => { const m = RS.director.imposter; return { bar: m.bar, phase: m.phase, players: m.players.size, dead: [...m.players.values()].filter(q => !q.alive).length }; });
      C.ok(jobs, `Imposter: no fake crewmate did a job: ${JSON.stringify(st)}`);
      console.log(`  imposter: ${JSON.stringify(st)}`); }
    C.ok(!p.errors.length, 'page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
    // the dev panel's request still opens the room when the address loses it on the way (an update reload, an old cached
    // page): it's in the tab's storage too (it used to land on the title screen and sit there)
    const q = await newPage(b, { width: 390, height: 844, mobile: true });
    await q.addInitScript(() => { try { if (!sessionStorage.getItem('__once')) { sessionStorage.setItem('__once', '1'); sessionStorage.setItem('rs_devmp_ok', '1'); sessionStorage.setItem('rs_devmp_req', JSON.stringify({ n: 2, t: Date.now() })); } } catch (e) {} });
    await q.goto(`http://game.local/index.html?relay=${encodeURIComponent(host.url)}`, { timeout: 240000 });
    const viaStore = await q.waitForFunction(() => { const m = window.ronnieMP; return m && m.net && m.net.players.size === 2 && document.querySelector('.screen.on[data-s="room"]'); }, null, { timeout: 90000 }).then(() => true, () => false);
    C.ok(viaStore, 'the test room didn\'t open from the stored request (no ?devmp in the address): ' + await q.evaluate(() => (document.querySelector('.screen.on') || {}).dataset?.s));
    C.ok(!q.errors.length, 'stored request: page errors: ' + [...new Set(q.errors)].slice(0, 3).join(' | '));
    // the update check reloading the page into a newer version while the room's being set up (the owner's phone, testing
    // straight after an update): it used to land on the title screen. Now it carries on (or rejoins the room it opened)
    const u = await newPage(b, { width: 390, height: 844, mobile: true });
    await u.route('**/version.json*', async (r) => { await sleep(2500); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ v: '9.9.9' }) }); });
    await u.addInitScript(() => { try { sessionStorage.setItem('rs_devmp_ok', '1'); } catch (e) {} });
    await u.goto(`http://game.local/index.html?devmp=2&relay=${encodeURIComponent(host.url)}`, { timeout: 240000 });
    const reloaded = await u.waitForFunction(() => /[?&]v=9\.9\.9/.test(location.search) || sessionStorage.getItem('rs_reload_9.9.9'), null, { timeout: 60000 }).then(() => true, () => false);
    let viaUpdate = false; for (let k = 0; k < 60 && !viaUpdate; k++) { await sleep(2000);      // (polled: the reload throws away anything waiting in the old page)
      viaUpdate = await u.evaluate(() => { const m = window.ronnieMP; return !!(m && m.net && m.net.players.size === 2 && document.querySelector('.screen.on[data-s="room"]')); }).catch(() => false); }
    const after = await u.evaluate(() => { const m = window.ronnieMP; return m && m.net ? [...m.net.players.values()].map(q => `${q.name}${q.away ? "(away)" : ""}`).join(", ") : "-"; }).catch(() => "?");
    C.ok(reloaded && viaUpdate, `an update reload while the test room was opening didn't end in the room (reloaded ${reloaded}, players: ${after}): on the ${await u.evaluate(() => (document.querySelector('.screen.on') || {}).dataset?.s)} screen`);
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
