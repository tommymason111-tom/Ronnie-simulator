// A BUSY LOBBY, through the real room server (run locally). LOBBY12_ONLY=full,leave,back,spoof,ingame,ver,slow picks parts.
//  full:  twelve in a room (four real games on upright phones, one a 12-letter name, and eight light players from
//         lib/bots.mjs): everyone's card on every phone, nothing off the side or covered (a long name pushed the third
//         column off the screen), a guest's READY button says it's ready, START waits for everyone, the 13th is turned
//         away and told the room's full (not to check their internet)
//  leave: the host leaves the lobby: the next player really is the host (CHOOSE THE GAME, options, kick: a guest left
//         holding hosting couldn't start anything), only the host's word on the game counts, and the game they start
//         runs on their phone (it loaded as a guest's, so nobody ran it: the clock never moved)
//  back:  the host comes back from a game (their page reloads into the lobby and the room hands hosting on meanwhile):
//         exactly one host afterwards, and it's them (both used to think they were the host)
//  spoof: a message that carries its own "f" (who it's from: the room puts that at the front) is still from whoever sent
//         it: no nameless extra player (the Boss Fight's drops and Ian's food made one in everyone's game), and a guest
//         can't pass off a kick as the host's
//  ingame: the room's door once its game is going: locked still means locked, and someone who comes in late gets the
//         room's options (only the lobby did either: anyone could walk into a locked room's game, and a late arrival played
//         by the normal rules)
//  ver:   the host on an older version than a guest updates (the page reloads into the room): still the host after
//  slow:  a line so slow the join gives up: it doesn't get in later anyway (everyone had a player who was never there,
//         never ready, holding up START)
import fs from 'fs';
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';
import { startBot } from './lib/bots.mjs';
import WebSocket from 'ws';
import { ev, openMenu, hostRoom, joinRoom, readyUp, pickGame, tapIn, freeRun } from './lib/room.mjs';
const ONLY = (process.env.LOBBY12_ONLY || 'full,leave,back,spoof,ingame,ver,slow').split(',');
const BTN = fs.readFileSync(new URL('./lib/btncheck.js', import.meta.url), 'utf8'), TXT = fs.readFileSync(new URL('./lib/textcheck.js', import.meta.url), 'utf8');
const PHONE = { width: 390, height: 844, mobile: true };
const lob = (p) => ev(p, () => ({ role: ronnieMP.role, host: !!(ronnieMP.net && ronnieMP.net.host), go: document.querySelector('#room-go').style.display !== 'none', ready: document.querySelector('#room-ready').style.display !== 'none', opts: !document.querySelector('#room-opts-btn').hidden, kick: document.querySelectorAll('#room-players [data-kick]').length, hostTag: [...document.querySelectorAll('#room-players .rp')].filter(e => [...e.querySelectorAll('.tag')].some(t => t.textContent === 'HOST')).map(e => e.querySelector('b').textContent) }));

export default async function () {
  const C = checker('lobby12'), host = await startRoomHost(), b = await launch();
  const pages = [], bots = [];
  const fresh = async (opts = PHONE) => { const p = await newPage(b, opts); pages.push(p); await openMenu(p, host.url); return p; };
  const done = async () => { for (const x of bots.splice(0)) x.stop(); for (const p of pages.splice(0)) { for (const e of [...new Set(p.errors)].slice(0, 3)) C.ok(false, `${p.pname || 'a page'}: ${e}`); const cr = p.crashes.filter(c => c.k !== 'start' && c.k !== 'hang'); C.ok(!cr.length, `${p.pname}: crash reports ${JSON.stringify(cr).slice(0, 300)}`); await p.context().close().catch(() => {}); } };
  try {
    if (ONLY.includes('full')) {
      const H = await fresh(); H.pname = 'HOST'; const code = await hostRoom(H, 'HOSTY', 'lewis');
      const NAMES = [['WWWWWWWWWWWW', 'chloe'], ['MAXIMILLIANA', 'harry'], ['BEN', 'ethan']], G = [];
      for (const [n, c] of NAMES) { const p = await fresh(); p.pname = n; await joinRoom(p, code, n, c); G.push(p); }
      for (let i = 0; i < 8; i++) bots.push(startBot(host.url, code, { name: 'BOT ' + (i + 1) }));
      await sleep(3000);
      for (const p of [H, ...G]) { const n = await ev(p, () => document.querySelectorAll('#room-players .rp:not(.empty)').length); C.ok(n === 12, `${p.pname} sees ${n} cards, not 12`); }
      await readyUp(G[0]); await sleep(1200);
      const rb = await ev(G[0], () => ({ txt: document.querySelector('#room-ready').textContent, on: document.querySelector('#room-ready').classList.contains('on') }));
      C.ok(rb.on && /READY!/.test(rb.txt), `the READY button doesn't say you're ready after tapping it: ${JSON.stringify(rb)}`);
      await readyUp(G[0], false); await sleep(600);
      C.ok(/I'M READY/.test(await ev(G[0], () => document.querySelector('#room-ready').textContent)), 'the READY button didn\'t go back to I\'M READY');
      for (const p of G) await readyUp(p); await sleep(1500);
      // the list on a phone: every card and button on screen, no text cut off or on other text
      for (const p of [H, G[0]]) {
        await ev(p, (s) => { if (!window.__btnCheck) (0, eval)(s); }, BTN); await ev(p, (s) => { if (!window.__textCheck) (0, eval)(s); }, TXT);
        const tb = await ev(p, () => window.__textCheck(document.querySelector('.screen.on[data-s="room"]'))), bb = await ev(p, () => window.__btnCheck('.screen.on[data-s="room"]'));
        const cards = await ev(p, () => [...document.querySelectorAll('#room-players .rp')].filter(e => { const r = e.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1; }).map(e => e.textContent.slice(0, 20)));
        C.ok(!cards.length, `${p.pname}: cards off the side of the phone: ${cards.join(' | ')}`);
        C.ok(!tb.length, `${p.pname}: lobby text cut off or covered: ${JSON.stringify(tb.slice(0, 4))}`);
        C.ok(!bb.length, `${p.pname}: lobby buttons off screen or covered: ${JSON.stringify(bb.slice(0, 4))}`);
      }
      // START waits for the eight who haven't readied
      await pickGame(H, 'pub', 'everyone', false);
      const gate = await ev(H, () => { document.getElementById('go').click(); return { txt: document.getElementById('go').textContent, loading: document.getElementById('loadscreen').classList.contains('on') }; });
      C.ok(/WAITING FOR 8/.test(gate.txt) && !gate.loading, `START should wait for the 8 not ready: ${JSON.stringify(gate)}`);
      // the 13th: a real phone, turned away, told it's full
      const X = await fresh(); X.pname = '13TH';
      await (async () => { await ev(X, () => document.querySelector('.playbtn').click()); await sleep(300); await ev(X, () => document.querySelector('#pick-multi').click()); await sleep(300);
        await ev(X, () => { document.querySelector('#mp-myname').value = 'LATE'; document.querySelector('#char-next').click(); }); await sleep(300);
        await ev(X, (c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code); })();
      await X.waitForFunction(() => !/Connecting/.test(document.querySelector('#mp-status2').textContent), null, { timeout: 15000, polling: 300 }).catch(() => {});
      const x = await ev(X, () => ({ msg: document.querySelector('#mp-status2').textContent, inRoom: !!document.querySelector('.screen.on[data-s="room"]') }));
      C.ok(!x.inRoom && /full/i.test(x.msg), `the 13th player wasn't told the room is full: ${JSON.stringify(x)}`);
      const n12 = await ev(H, () => ronnieMP.net.players.size + 1); C.ok(n12 === 12, `the room has ${n12} after the 13th tried`);
      await done();
    }
    if (ONLY.includes('leave')) {
      const H = await fresh(); H.pname = 'HOST'; const code = await hostRoom(H, 'HOSTY', 'lewis');
      const P1 = await fresh(); P1.pname = 'P1'; await joinRoom(P1, code, 'PONE', 'chloe');
      const P2 = await fresh(); P2.pname = 'P2'; await joinRoom(P2, code, 'PTWO', 'harry');
      await sleep(1500); await ev(H, () => document.querySelector('#room-leave').click()); await sleep(2500);
      const a = await lob(P1), c = await lob(P2);
      C.ok(a.host && a.go && !a.ready && a.opts && a.kick === 1, `the player handed hosting can't run the lobby: ${JSON.stringify(a)}`);
      C.ok(!c.host && !c.go && c.ready && JSON.stringify(c.hostTag) === '["PONE"]', `the other guest's lobby is wrong: ${JSON.stringify(c)}`);
      // a guest's word on the game is ignored
      await ev(P2, () => ronnieMP.net.send({ t: 'setup', place: 'shop', mode: 'sweep' })); await sleep(1500);
      C.ok(await ev(P1, () => !!document.querySelector('.screen.on[data-s="room"]')), 'a guest\'s "setup" took the new host out of the lobby');
      await readyUp(P2); await sleep(1000);
      await pickGame(P1, 'pub', 'chonkoff');
      for (const p of [P1, P2]) await tapIn(p);
      for (const p of [P1, P2]) await freeRun(p);
      const t0 = await ev(P2, () => RS.director.timeLeft); await sleep(5000);
      const s1 = await ev(P1, () => ({ remote: !!RS.director.remote, host: RS.net.host, mode: RS.director.mode, left: RS.director.timeLeft })), s2 = await ev(P2, () => ({ remote: !!RS.director.remote, host: RS.net.host, mode: RS.director.mode, left: RS.director.timeLeft }));
      C.ok(!s1.remote && s1.host && s1.mode === 'chonkoff', `the new host's game loaded as a guest's: ${JSON.stringify(s1)}`);
      C.ok(s2.remote && s2.mode === 'chonkoff' && s2.left < t0 - 1, `the guest's game isn't being run (the clock should go down from ${t0}): ${JSON.stringify(s2)}`);
      await done();
    }
    if (ONLY.includes('back')) {
      const H = await fresh(); H.pname = 'HOST'; const code = await hostRoom(H, 'HOSTY', 'lewis');
      const P1 = await fresh(); P1.pname = 'P1'; await joinRoom(P1, code, 'PONE', 'chloe');
      const P2 = await fresh(); P2.pname = 'P2'; await joinRoom(P2, code, 'PTWO', 'harry');
      await sleep(1500);
      // as at the end of a game: the host's page goes back to the lobby (RETURN TO LOBBY reloads it)
      await ev(H, ([c, r]) => { sessionStorage.setItem('rs_was_host', '1'); location.href = location.pathname + '?lobby=' + c + '&relay=' + encodeURIComponent(r); }, [code, host.url]);
      await H.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on' && document.querySelector('.screen.on[data-s="room"]'), null, { timeout: 60000, polling: 300 });
      await sleep(5000);
      const all = [['HOSTY', await lob(H)], ['PONE', await lob(P1)], ['PTWO', await lob(P2)]];
      const bosses = all.filter(([, s]) => s.go || s.opts || s.role === 'host').map(([n]) => n), hosts = all.filter(([, s]) => s.host).map(([n]) => n);
      C.ok(bosses.length === 1 && hosts.length === 1 && bosses[0] === hosts[0], `after the host came back there should be exactly one host: lobby buttons on ${bosses}, the room says ${hosts} ${JSON.stringify(all)}`);
      C.ok(hosts[0] === 'HOSTY', `the host coming back from a game isn't the host any more: ${hosts}`);
      await done();
    }
    if (ONLY.includes('spoof')) {
      const H = await fresh(); H.pname = 'HOST'; const code = await hostRoom(H, 'HOSTY', 'lewis');
      const G = await fresh(); G.pname = 'GUEST'; await joinRoom(G, code, 'GUESTY', 'chloe');
      const ws = new WebSocket(`${host.url}/room/${code}?name=SNEAKY&pid=sneaky1234`); await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); }); await sleep(1500);
      const hid = await ev(H, () => ronnieMP.net.id), gid = await ev(G, () => ronnieMP.net.id);
      for (const m of [{ t: 'bbqS', ph: 'cook', f: 'burger' }, { t: 'bossA', k: 'drop', x: 1, z: 1, f: 1.35 }, { t: 'chat', s: 'hiya', f: 'nobody99' }, { t: 'kick', to: gid, why: 'kick', f: hid }]) ws.send(JSON.stringify(m));
      await sleep(2000);
      const hp = await ev(H, () => [...ronnieMP.net.players.values()].map(p => String(p.id) + ':' + p.name)), g = await ev(G, () => ({ in: !!(ronnieMP.net && ronnieMP.net.status === 'on'), players: ronnieMP.net ? [...ronnieMP.net.players.values()].map(p => String(p.id) + ':' + p.name) : [] }));
      C.ok(hp.length === 2 && g.players.length === 2, `a message with its own "f" made a player who isn't there: host sees ${JSON.stringify(hp)}, guest ${JSON.stringify(g.players)}`);
      C.ok(g.in, 'a guest kicked someone by putting the host\'s id on the message');
      ws.close(); await done();
    }
    if (ONLY.includes('ingame')) {
      const H = await fresh(); H.pname = 'HOST'; const code = await hostRoom(H, 'HOSTY', 'lewis');
      await ev(H, () => { document.querySelector('#room-opts [data-ok="attacks"][data-ov="off"]').click(); document.querySelector('#room-opts [data-ok="len"][data-ov="long"]').click(); document.querySelector('#room-opts [data-lock]').click(); }); await sleep(500);
      await pickGame(H, 'pub', 'roam'); await tapIn(H); await freeRun(H); await sleep(2000);
      const tryJoin = async (p, name) => { await ev(p, () => document.querySelector('.playbtn').click()); await sleep(300); await ev(p, () => document.querySelector('#pick-multi').click()); await sleep(300);
        await ev(p, (n) => { document.querySelector('#mp-myname').value = n; document.querySelector('#char-next').click(); }, name); await sleep(300);
        await ev(p, (c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code); await sleep(5000); };
      const X = await fresh(); X.pname = 'LOCKEDOUT'; await tryJoin(X, 'NOSY');
      const x = await ev(X, () => ({ out: !ronnieMP.net, msg: document.querySelector('#mp-status2').textContent, loading: document.body.classList.contains('ready') || document.getElementById('loadscreen').classList.contains('on') }));
      C.ok(x.out && /locked/i.test(x.msg) && !x.loading, `someone got into a locked room's game: ${JSON.stringify(x)}`);
      await ev(H, () => { ronnieMP.locked = false; });      // (there's no lock button in the game: as if it had been left open)
      const Y = await fresh(); Y.pname = 'LATE'; await tryJoin(Y, 'LATECOMER');
      const y = await ev(Y, () => ({ ...window.__roomOpts }));
      C.ok(y.attacks === 'off' && y.len === 'long', `a late arrival didn't get the room's options: ${JSON.stringify(y)}`);
      await done();
    }
    if (ONLY.includes('ver')) {
      const H = await fresh(); H.pname = 'HOST'; const code = await hostRoom(H, 'HOSTY', 'lewis');
      const P1 = await newPage(b, PHONE); P1.pname = 'NEWER'; pages.push(P1);
      await P1.addInitScript(() => { let v = ''; Object.defineProperty(window, 'GAME_BUILD', { get: () => window.__older ? v : '99.0.0', set: (x) => { v = x; }, configurable: true }); });      // (a newer version, until the host has updated)
      await openMenu(P1, host.url); await joinRoom(P1, code, 'PONE', 'chloe');
      await H.waitForFunction(() => window.__updating, null, { timeout: 15000, polling: 200 }).catch(() => {});
      const upd = await ev(H, () => !!window.__updating).catch(() => true); await ev(P1, () => { window.__older = true; });      // (the reload brings the host the new version: here, the newer one stops saying so)
      await sleep(4000);
      await H.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on' && document.querySelector('.screen.on[data-s="room"]'), null, { timeout: 60000, polling: 300 }).catch(() => {});
      await H.waitForFunction(() => ronnieMP.net.host, null, { timeout: 20000, polling: 500 }).catch(() => {});
      const h = await lob(H), p1 = await lob(P1);
      C.ok(upd, 'the host on the older version wasn\'t told to update');
      C.ok(h.host && h.go && !p1.host && !p1.go, `the host who updated isn't the host any more: ${JSON.stringify(h)} / ${JSON.stringify(p1)}`);
      await done();
    }
    if (ONLY.includes('slow')) {
      const H = await fresh(); H.pname = 'HOST'; const code = await hostRoom(H, 'HOSTY', 'lewis');
      const S = await newPage(b, PHONE); S.pname = 'SLOW'; pages.push(S); await openMenu(S, host.url + '/net/9000/0');      // (nine seconds each way: past the eight the join waits)
      await ev(S, () => document.querySelector('.playbtn').click()); await sleep(300); await ev(S, () => document.querySelector('#pick-multi').click()); await sleep(300);
      await ev(S, () => { document.querySelector('#mp-myname').value = 'SLOWCOACH'; document.querySelector('#char-next').click(); }); await sleep(300);
      await ev(S, (c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code);
      await sleep(30000);
      const s = await ev(S, () => ({ msg: document.querySelector('#mp-status2').textContent, inRoom: !!document.querySelector('.screen.on[data-s="room"]') }));
      const n = await ev(H, () => [...ronnieMP.net.players.values()].map(p => p.name));
      C.ok(!s.inRoom && !n.length, `a join that gave up got into the room anyway: the slow page says ${JSON.stringify(s)}, the host has ${JSON.stringify(n)}`);
      await done();
    }
  } finally { for (const x of bots) x.stop(); await b.close(); await host.close(); }
  return C.fails;
}
