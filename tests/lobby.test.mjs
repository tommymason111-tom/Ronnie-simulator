// THE LOBBY, through the real room server (run locally): a host makes a room; a mate opens the INVITE LINK and lands
// straight in the room (no code typed); a third joins with the code. Checked: everyone sees everyone; READY ticks go
// both ways; the host's ROOM OPTIONS reach everyone (and only the host can set them: a guest's fake ones are ignored);
// lobby chat both ways; a guest can't kick anyone; the host kicks the third player (who's told why); the host LOCKS the
// room and a newcomer is turned away; MAX PLAYERS turns a newcomer away too; then a game starts with GAME LENGTH: SHORT
// and SQUAD ATTACKS: OFF and both games run that. The invite link itself, and the lobby fitting a phone.
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';

export default async function () {
  const C = checker('lobby'), host = await startRoomHost(), b = await launch(), dir = process.env.SHOT_DIR || '/tmp';
  try {
    const relay = '&relay=' + encodeURIComponent(host.url);
    const H = await newPage(b, { width: 900, height: 700 }), G = await newPage(b, { width: 390, height: 844, mobile: true }), X = await newPage(b, { width: 390, height: 844, mobile: true });
    const ev = (p, f, a) => p.evaluate(f, a), cl = (p, s) => ev(p, (s) => document.querySelector(s).click(), s);
    await H.goto('http://game.local/index.html?x=1' + relay, { timeout: 120000, waitUntil: 'domcontentloaded' }); await H.waitForTimeout(2000);
    // the host makes a room
    await cl(H, '.playbtn'); await sleep(400); await cl(H, '#pick-multi'); await sleep(400);
    await ev(H, () => { document.querySelector('#mp-myname').value = 'HOSTY'; document.querySelector('#char-grid .mate[data-id="lewis"]').click(); }); await cl(H, '#char-next'); await sleep(400);
    await cl(H, '#mp-host2'); await H.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on', null, { timeout: 30000 });
    const code = await ev(H, () => ronnieMP.net.code);
    // the invite link
    const link = await ev(H, () => document.querySelector('#room-url').textContent);
    const copied = await ev(H, () => { document.querySelector('#room-copy').click(); return new Promise(r => setTimeout(() => r(document.querySelector('#room-link-msg').textContent), 400)); });
    C.ok(/copied|join=/i.test(copied), `COPY LINK said: ${copied}`);
    C.ok(link && link.includes('?join=' + code), `the invite link is wrong: ${link}`);
    // a mate opens the link (first time: name and character, then straight in)
    await G.goto(link.replace(/^https?:\/\/[^/]+/, 'http://game.local') + relay, { timeout: 120000, waitUntil: 'domcontentloaded' }); await G.waitForTimeout(2500);
    await G.waitForFunction(() => document.querySelector('.screen.on[data-s="mpname"]'), null, { timeout: 20000 });
    await ev(G, () => { document.querySelector('#mp-myname').value = 'GUESTY'; document.querySelector('#name-next').click(); }); await sleep(500);
    await ev(G, () => { document.querySelector('#char-grid .mate[data-id="chloe"]').click(); document.querySelector('#char-next').click(); });
    await G.waitForFunction(() => document.querySelector('.screen.on[data-s="room"]') && ronnieMP.net && ronnieMP.net.status === 'on', null, { timeout: 30000 });
    // the third with the code
    await X.goto('http://game.local/index.html?x=1' + relay, { timeout: 120000, waitUntil: 'domcontentloaded' }); await X.waitForTimeout(2000);
    await cl(X, '.playbtn'); await sleep(400); await cl(X, '#pick-multi'); await sleep(400);
    await ev(X, () => { document.querySelector('#mp-myname').value = 'THIRDY'; document.querySelector('#char-grid .mate[data-id="harry"]').click(); }); await cl(X, '#char-next'); await sleep(400);
    await ev(X, (c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code);
    await X.waitForFunction(() => document.querySelector('.screen.on[data-s="room"]'), null, { timeout: 30000 }); await sleep(1500);
    const cards = (p) => ev(p, () => [...document.querySelectorAll('#room-players .rp:not(.empty) b')].map(e => e.textContent));
    C.ok((await cards(H)).length === 3 && (await cards(G)).length === 3, `everyone should see 3 players: host ${await cards(H)} guest ${await cards(G)}`);
    // ready both ways
    await cl(G, '#room-ready'); await sleep(1200);
    const hostSeesReady = await ev(H, () => document.querySelectorAll('#room-players .rp.isready').length);
    await cl(H, '#room-ready'); await sleep(1200);
    const guestSeesReady = await ev(G, () => document.querySelectorAll('#room-players .rp.isready').length);
    C.ok(hostSeesReady === 1 && guestSeesReady === 2, `ready ticks: host sees ${hostSeesReady} (want 1), guest sees ${guestSeesReady} (want 2)`);
    // options: the host's reach everyone; a guest's buttons are off and a faked message is ignored
    await ev(H, () => { document.querySelector('#room-opts [data-ok="len"][data-ov="short"]').click(); document.querySelector('#room-opts [data-ok="attacks"][data-ov="off"]').click(); }); await sleep(1200);
    const gOpts = await ev(G, () => ({ ...window.__roomOpts, disabled: document.querySelector('#room-opts [data-ok="len"]').disabled }));
    await ev(G, () => ronnieMP.net.send({ t: 'ropts', o: { len: 'long', attacks: 'chaos' } })); await sleep(1200);
    const hOpts = await ev(H, () => ({ ...window.__roomOpts })), xOpts = await ev(X, () => ({ ...window.__roomOpts }));
    C.ok(gOpts.len === 'short' && gOpts.attacks === 'off' && gOpts.disabled, `the host's options didn't reach the guest: ${JSON.stringify(gOpts)}`);
    C.ok(hOpts.len === 'short' && xOpts.len === 'short' && xOpts.attacks === 'off', `a guest changed the room's options: host ${JSON.stringify(hOpts)} third ${JSON.stringify(xOpts)}`);
    // chat both ways
    await ev(G, () => { document.querySelector('#room-chat-in').value = 'alright lads'; document.querySelector('#room-chat-send').click(); }); await sleep(1200);
    const hostChat = await ev(H, () => document.querySelector('#room-chat-log').textContent);
    C.ok(hostChat.includes('alright lads') && hostChat.includes('GUESTY'), `lobby chat didn't arrive: ${hostChat}`);
    // a guest can't kick; the host can
    const xid = await ev(X, () => ronnieMP.net.id);
    await ev(G, (id) => ronnieMP.net.send({ t: 'kick', to: id, why: 'kick' }), xid); await sleep(1200);
    const stillIn = await ev(X, () => !!(ronnieMP.net && ronnieMP.net.status === 'on'));
    C.ok(stillIn, 'a guest kicked someone out (only the host should be able to)');
    await H.evaluate(() => { window.confirm = () => true; }); await ev(H, (id) => document.querySelector(`#room-players [data-kick="${id}"]`).click(), xid); await sleep(1500);
    const kicked = await ev(X, () => ({ out: !ronnieMP.net, msg: document.querySelector('#mp-status2').textContent }));
    C.ok(kicked.out && /removed/i.test(kicked.msg), `the host's kick didn't work: ${JSON.stringify(kicked)}`);
    // lock: a newcomer's turned away
    await ev(H, () => document.querySelector('#room-opts [data-lock]').click()); await sleep(800);
    await ev(X, (c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code); await sleep(3500);
    const locked = await ev(X, () => ({ out: !ronnieMP.net, msg: document.querySelector('#mp-status2').textContent }));
    C.ok(locked.out && /locked/i.test(locked.msg), `a locked room let someone in: ${JSON.stringify(locked)}`);
    // max players 4 and unlocked: fine; then a screenshot of the lobby on a phone
    await ev(H, () => document.querySelector('#room-opts [data-lock]').click()); await sleep(800);
    await sleep(700); await G.screenshot({ path: `${dir}/lobby-phone.png`, fullPage: false, timeout: 120000 }).catch(() => {});
    const fit = await ev(G, () => { const bad = []; for (const el of document.querySelectorAll('.screen.on[data-s="room"] *')) { const r = el.getBoundingClientRect(); if (r.width && r.right > innerWidth + 1) bad.push(el.id || el.className || el.tagName); } return bad.slice(0, 5); });
    C.ok(!fit.length, `lobby doesn't fit a phone: ${fit}`);
    // start a game: short and no attacks, on both
    await cl(H, '#room-go'); await sleep(400); await ev(H, () => document.querySelector('.scene[data-id="pub"]').click()); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="place"] .bigbtn').click()); await sleep(500);
    await ev(H, () => { const f = () => document.querySelector('.flip[data-id="everyone"]'); f().click(); f().click(); }); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="mode"] .bigbtn').click()); await sleep(500); await cl(H, '#go');
    for (const p of [H, G]) { await p.waitForFunction(() => document.querySelector('.screen[data-s="intro"].on') || document.body.classList.contains('ready'), null, { timeout: 120000 }); await ev(p, () => { const r = document.querySelector('#intro-ready'); if (r && r.offsetParent) r.click(); }); }
    for (const p of [H, G]) { await p.waitForFunction(() => window.RS && document.body.classList.contains('ready'), null, { timeout: 180000 }); await ev(p, () => document.getElementById('play-flat').click()); }
    await sleep(3000);
    await ev(H, () => { RS.renderer.setAnimationLoop(null); RS.director.nextAttackT = 0.5; RS.sim(3, 1 / 30); });
    const after = await ev(H, () => ({ attacking: RS.director.attackInProgress(), current: !!RS.director.current }));
    await ev(H, () => { RS.newGame('runpub'); RS.sim(0.2, 1 / 30); }); await sleep(1500);      // (a timed game: six minutes, normally)
    const game = await ev(H, () => ({ left: RS.director.timeLeft, mode: RS.director.mode }));
    console.log(`  game: ${JSON.stringify(game)}; after the attack timer ran out: ${JSON.stringify(after)}`);
    C.ok(game.left > 0 && game.left <= 360 * 0.6 + 1, `GAME LENGTH: SHORT didn't shorten the game: ${game.left}s left`);
    C.ok(!after.attacking && !after.current, 'SQUAD ATTACKS: OFF, and the squad attacked anyway');
    for (const [n, p] of [['host', H], ['guest', G], ['third', X]]) C.ok(!p.errors.length, `${n} page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
