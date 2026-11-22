// MULTIPLAYER, THE WHOLE SQUAD (two real games in one room):
//   - an attack says who it's aimed at: the target's card says "➜ YOU", everyone else's names them (and the line says
//     their name, not YOU), and a target marker floats over their head on everyone else's game
//   - RESTART ROUND: the host has it on the pause menu and in its SETTINGS; a guest gets ASK FOR A RESTART, which
//     asks the host in the chat
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';
const WHO = [['HOSTY', 'lewis'], ['BETH', 'chloe']];
export default async function () {
  const C = checker('squadmp'), host = await startRoomHost(), b = await launch();
  try {
    const pages = [];
    for (const [name, ch] of WHO) { const p = await newPage(b, { width: 390, height: 844, mobile: true }); p.pname = name; p.ch = ch; pages.push(p); await p.goto('http://game.local/index.html?relay=' + encodeURIComponent(host.url)); await p.waitForTimeout(1200); }
    const ev = (p, f, a) => p.evaluate(f, a), cl = (p, s) => ev(p, (s) => document.querySelector(s).click(), s);
    const join = async (p, code) => { await cl(p, '.playbtn'); await sleep(400); await cl(p, '#pick-multi'); await sleep(400);
      await ev(p, ([n, c]) => { document.querySelector('#mp-myname').value = n; document.querySelector(`#char-grid .mate[data-id="${c}"]`).click(); }, [p.pname, p.ch]); await cl(p, '#char-next'); await sleep(400);
      if (!code) { await cl(p, '#mp-host2'); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.code && ronnieMP.net.status === 'on', null, { timeout: 60000 }); return ev(p, () => ronnieMP.net.code); }
      await ev(p, (c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on', null, { timeout: 60000 }); };
    const H = pages[0], code = await join(H); for (const p of pages.slice(1)) await join(p, code);
    await cl(H, '#room-go'); await sleep(400); await ev(H, () => document.querySelector('.scene[data-id="pub"]').click()); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="place"] .bigbtn').click()); await sleep(500);
    await ev(H, () => { const f = () => document.querySelector('.flip[data-id="everyone"]'); f() && f().click(); }); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="mode"] .bigbtn').click()); await sleep(500);
    for (const q of pages) await ev(q, () => { const m = window.ronnieMP; if (m && m.net && m.role === 'join' && !m.ready) document.querySelector('#room-ready').click(); }).catch(() => {}); await sleep(1500);
    await cl(H, '#go');
    for (const p of pages) await p.waitForFunction(() => { for (const id of ['#intro-ready', '#ui-intro-ready', '.howto-ready']) { const r = document.querySelector(id); if (r && r.offsetParent) r.click(); } const st = document.getElementById('start'); const inG = window.RS && document.body.classList.contains('ready') && st && st.classList.contains('gone'); if (inG) { const b = document.querySelector('#play-flat'); if (b && b.offsetParent) b.click(); } return inG && RS.director.mode; }, null, { timeout: 300000, polling: 700 });
    const G = pages[1], gid = await ev(G, () => RS.net.id);
    for (const p of pages) await ev(p, () => { window.__cards = []; const f = RS.director.g.fx, s0 = f.showCard.bind(f); f.showCard = (o) => { __cards.push({ vs: o.vs, key: o.key }); return s0(o); }; });
    // the host's squad go for the guest
    await ev(H, (gid) => { const d = RS.director; d.mp.pickTarget = function (c) { const t = this.targets().find(q => q.id === gid); c.mpTarget = t; this.net.send({ t: 'coming', who: c.id, target: t.id, name: t.name }); return t; }; d.nextAttackT = 999; const c = d.cast.find(x => x.id === 'oliver') || d.cast.find(x => x !== RS.tommy && x.id !== 'tommy'); d.launch({ c, attack: d.nextAttack(c) || { key: 'flash' } }); }, gid);
    await H.waitForFunction(() => __cards.length > 0, null, { timeout: 90000, polling: 500 }).catch(() => {});
    await G.waitForFunction(() => __cards.length > 0, null, { timeout: 30000, polling: 500 }).catch(() => {});
    const hc = await ev(H, () => ({ cards: __cards, marker: !!(RS.director.g.fx.tgt && RS.director.g.fx.tgt.visible) }));
    const gc = await ev(G, () => ({ cards: __cards, marker: !!(RS.director.g.fx.tgt && RS.director.g.fx.tgt.visible) }));
    C.ok(hc.cards.length && hc.cards[0].vs === 'BETH' && hc.cards[0].key, `the host's card doesn't say who's getting it: ${JSON.stringify(hc)}`);
    C.ok(hc.marker, `no target marker over BETH on the host's game: ${JSON.stringify(hc)}`);
    C.ok(gc.cards.length && gc.cards[0].vs === 'YOU', `BETH's own card doesn't say YOU: ${JSON.stringify(gc)}`);
    C.ok(!gc.marker, `BETH has a target marker on her own game: ${JSON.stringify(gc)}`);
    console.log('  hosts before restart check: ' + JSON.stringify([await ev(H, () => RS.net.host), await ev(G, () => RS.net.host), await ev(H, () => document.hidden), await ev(G, () => document.hidden)]));
    // RESTART ROUND
    const btns = async (p, sub) => ev(p, (sub) => { document.getElementById('menu-btn').click(); if (sub) document.getElementById('pause-settings').click(); const out = [...document.querySelectorAll('#pause button')].filter(b => b.offsetParent && /RESTART/.test(b.textContent)).map(b => b.textContent.trim()); return out; }, sub);
    const hp = await btns(H, false); await sleep(300); await ev(H, () => document.getElementById('pause-resume').click()); const hs = await btns(H, true);
    C.ok(hp.includes('🔄 RESTART ROUND') && hs.includes('🔄 RESTART ROUND'), `the host's RESTART ROUND isn't on the pause menu and in SETTINGS: ${JSON.stringify({ hp, hs })}`);
    await ev(H, () => { document.getElementById('pause-set-back') && document.getElementById('pause-set-back').click(); document.getElementById('pause-resume').click(); });
    const gp = await btns(G, false);
    C.ok(gp.includes('🔄 ASK FOR A RESTART'), `the guest has no ASK FOR A RESTART: ${JSON.stringify(gp)}`);
    await ev(G, () => document.getElementById('pause-restart').click()); await sleep(2500);
    const got = await ev(H, () => [...document.querySelectorAll('#chat-log *, #chat-box *')].map(e => e.textContent).join(' | '));
    C.ok(/restart/i.test(got), `the host never heard the guest ask for a restart: ${got.slice(0, 200)}`);
    // a guest's GAME MODE: there, and it asks the host
    await ev(G, () => { document.getElementById('menu-btn').click(); }); await sleep(300);
    const gm = await ev(G, () => { const b = document.getElementById('pause-mode'); return !!(b && b.offsetParent); });
    C.ok(gm, 'the guest has no GAME MODE button');
    await ev(G, () => { document.getElementById('pause-mode').click(); const o = [...document.querySelectorAll('#pause-mode-list .mode-opt')].find(b => !b.classList.contains('cur')); o && o.click(); }); await sleep(2500);
    const got2 = await ev(H, () => [...document.querySelectorAll('#chat-log *, #chat-box *')].map(e => e.textContent).join(' | '));
    C.ok(/Can we play/i.test(got2), `the host never heard the guest ask for a game: ${got2.slice(0, 200)}`);
    // the host's phone goes to another app for a moment: hosting goes to BETH while they're away, and comes back
    const vis = (p, hidden) => ev(p, (h) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => h ? 'hidden' : 'visible' }); document.dispatchEvent(new Event('visibilitychange')); }, hidden);
    await vis(H, true); await sleep(2500);
    const mid = [await ev(H, () => RS.net.host), await ev(G, () => RS.net.host)];
    await ev(H, () => { if (window.__paused !== undefined) {} document.getElementById('pause-resume') && document.getElementById('pause-resume').click(); });
    await vis(H, false); await sleep(5000);
    const back = [await ev(H, () => RS.net.host), await ev(G, () => RS.net.host)];
    C.ok(!mid[0] && mid[1], `the host going away didn't hand hosting to the other player: ${JSON.stringify(mid)}`);
    C.ok(back[0] && !back[1], `hosting didn't come back to the host when they returned: ${JSON.stringify(back)}`);
    // the food's still there for both, and can be eaten
    const food = async (p) => ev(p, () => RS.items.items.filter(it => !it.dead && !it.def.prop && !it.def.drink).length);
    const fh = await food(H), fg = await food(G); C.ok(fh > 5 && fg > 5, `food went after the host came back: host ${fh}, guest ${fg}`);
    for (const p of pages) C.ok(!p.errors.length, `${p.pname}: ` + p.errors.slice(0, 3).join(' | '));
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
