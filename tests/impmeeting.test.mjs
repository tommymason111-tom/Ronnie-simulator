// IMPOSTER'S MEETING on an upright phone (three real games in a room): the vote screen is up, and PAUSE, CHAT and
// VOICE are still on top of it (nothing over them where you'd tap), they work (CHAT opens its box over the vote screen,
// PAUSE its menu), and after the meeting they're back to normal
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';
const readyUp = async (ps) => { for (const q of ps) await q.evaluate(() => { const m = window.ronnieMP; if (m && m.net && m.role === 'join' && !m.ready) document.querySelector('#room-ready').click(); }).catch(() => {}); await new Promise(r => setTimeout(r, 1500)); };      // (guests ready up: the host's START waits for everyone)

const WHO = [['HOSTY', 'lewis'], ['BETH', 'chloe'], ['CARL', 'harry']];

export default async function () {
  const C = checker('impmeeting'), host = await startRoomHost(), b = await launch();
  try {
    const pages = [];
    for (const [name, ch] of WHO) { const p = await newPage(b, { width: 390, height: 844, mobile: true }); p.pname = name; p.ch = ch; pages.push(p);
      await p.goto('http://game.local/index.html?relay=' + encodeURIComponent(host.url)); await p.waitForTimeout(1200); }
    const ev = (p, f, a) => p.evaluate(f, a), cl = (p, s) => ev(p, (s) => document.querySelector(s).click(), s);
    const join = async (p, code) => { await cl(p, '.playbtn'); await sleep(400); await cl(p, '#pick-multi'); await sleep(400);
      await ev(p, ([n, c]) => { document.querySelector('#mp-myname').value = n; document.querySelector(`#char-grid .mate[data-id="${c}"]`).click(); }, [p.pname, p.ch]); await cl(p, '#char-next'); await sleep(400);
      if (!code) { await cl(p, '#mp-host2'); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.code && ronnieMP.net.status === 'on', null, { timeout: 60000 }); return ev(p, () => ronnieMP.net.code); }
      await ev(p, (c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on', null, { timeout: 60000 }); };
    const H = pages[0], code = await join(H); for (const p of pages.slice(1)) await join(p, code);
    // the host picks the pub
    await cl(H, '#room-go'); await sleep(400); await ev(H, () => document.querySelector('.scene[data-id="pub"]').click()); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="place"] .bigbtn').click()); await sleep(500);
    await ev(H, () => { const f = () => document.querySelector('.flip[data-id="roam"]'); f() && f().click(); }); await sleep(300);      // (everyone in first, then the host changes the game to Imposter below)
    await ev(H, () => document.querySelector('.screen[data-s="mode"] .bigbtn').click()); await sleep(500); await readyUp(pages); await cl(H, '#go');
    // (each game, host first: through the how-to-play page, PLAY, and into the pub; the others follow the host in)
    const tapIn = (p) => p.waitForFunction(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click();
      const st = document.getElementById('start'), inGame = window.RS && document.body.classList.contains('ready') && st && st.classList.contains('gone');
      if (inGame) { const b = document.querySelector('#play-flat'); if (b && b.offsetParent) b.click(); }
      return inGame && !RS.player.menuLock; }, null, { timeout: 300000, polling: 700 });
    for (const p of pages) await tapIn(p).catch(async () => { throw new Error(p.pname + ' never got into the game: ' + JSON.stringify(await ev(p, () => ({ screen: (document.querySelector('.screen.on') || {}).dataset?.s, mode: window.RS && RS.director.mode })))); });
    // (the host changes the game to Imposter: everyone's game follows, as when a real host changes mode)
    if (!(await ev(H, () => !!RS.director.imposter))) await ev(H, () => RS.newGame('imposter'));
    for (const p of pages) await p.waitForFunction(() => { for (const id of ['#intro-ready', '#ui-intro-ready', '.howto-ready']) { const r = document.querySelector(id); if (r && r.offsetParent) r.click(); } return window.RS && document.body.classList.contains('ready') && RS.director.imposter; }, null, { timeout: 240000, polling: 700 }).catch(async () => { throw new Error(p.pname + ' not in Imposter: ' + JSON.stringify(await ev(p, () => ({ mode: RS.director.mode, full: RS.director.fullMode, imp: !!RS.director.imposter, running: RS.director.running }))) + ' errors: ' + p.errors.slice(0, 3).join(' | ')); });
    for (const p of pages) await ev(p, () => { RS.renderer.__render = RS.renderer.render; RS.renderer.render = () => {}; });
    await sleep(6000);      // (everyone's in the pub, models loading)
    // the host rings the bell: roles dealt; the intro; play
    for (const p of pages) await ev(p, () => { const m = RS.director.imposter, a0 = m.apply.bind(m); window.__ilog = []; m.apply = (k, msg) => { __ilog.push(Math.round(performance.now() / 100) / 10 + ' ' + k + (msg && msg.v ? ':' + msg.v : '')); return a0(k, msg); }; window.__imp0 = m; });
    await ev(H, () => RS.director.imposter.hostDeal());
    for (const p of pages) await p.waitForFunction(() => RS.director.imposter.phase === 'play', null, { timeout: 60000 });
    await sleep(1500);
    const I = async (p) => ev(p, () => { const m = RS.director.imposter, me = m.mine(); return { id: m.me, imp: !!(me && me.imp), alive: !!(me && me.alive) }; });
    const info = []; for (const p of pages) info.push(await I(p));
    const impI = info.findIndex(x => x.imp); C.ok(impI >= 0, 'nobody was dealt the imposter');
    if (impI < 0) return C.fails;
    const imp = pages[impI], victims = pages.map((p, i) => i).filter(i => i !== impI).slice(0, 2),      // (the host first when it can be: being the referee mustn't stop you being killed)
      living = pages.map((p, i) => i).filter(i => i !== impI && !victims.includes(i));
    // the host rings the bell: a meeting
    await ev(H, () => { const m = RS.director.imposter; if (m.H) m.H.emergCD = 0; m.emergCD = 0; m.ask('imM', {}); });
    for (const p of pages) await p.waitForFunction(() => RS.director.imposter.phase === 'meeting', null, { timeout: 30000 }).catch(() => {});
    await sleep(4000);      // (the splash goes, the vote screen comes up)
    const top = (p) => ev(p, () => { const out = {}; for (const id of ['menu-btn', 'chat-btn', 'vc-bar']) { const e = document.getElementById(id); const cs = e && getComputedStyle(e); if (!e || cs.display === 'none' || cs.visibility === 'hidden' || !e.getBoundingClientRect().width) { out[id] = 'hidden'; continue; } const r = e.getBoundingClientRect(), at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); out[id] = !!(at && (at === e || e.contains(at))) || (at ? (at.id || at.tagName) : 'none'); }
      const pn = document.getElementById('imp-panel'); out.panel = !!(pn && pn.style.display !== 'none'); out.phase = RS.director.imposter.phase; out.body = document.body.className.slice(0, 160); return out; });
    for (const p of pages) { const t = await top(p); console.log('  ' + p.pname + ' ' + JSON.stringify(t));
      C.ok(t.phase === 'meeting' && t.panel, `${p.pname}: no vote screen up: ${JSON.stringify(t)}`);
      C.ok(t['menu-btn'] === true && t['chat-btn'] === true && (t['vc-bar'] === true || t['vc-bar'] === 'hidden'), `${p.pname}: PAUSE / CHAT / VOICE covered by the vote screen: ${JSON.stringify(t)}`); }
    // CHAT opens over the vote screen, and a message goes
    const P0 = pages[0];
    const chat = await ev(P0, async () => { document.getElementById('chat-btn').click(); await new Promise(r => setTimeout(r, 400)); const b = document.getElementById('chat-box'), r = b.getBoundingClientRect(), at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { open: b.classList.contains('on'), onTop: !!(at && b.contains(at)) }; });
    C.ok(chat.open && chat.onTop, `CHAT doesn't open over the vote screen: ${JSON.stringify(chat)}`);
    await ev(P0, () => document.getElementById('chat-x').click());
    const pause = await ev(P0, async () => { document.getElementById('menu-btn').click(); await new Promise(r => setTimeout(r, 500)); const b = document.querySelector('#pause .box'), r = b.getBoundingClientRect(), at = document.elementFromPoint(r.left + r.width / 2, r.top + 30); const out = { open: document.getElementById('pause').classList.contains('on'), onTop: !!(at && document.getElementById('pause').contains(at)) }; document.getElementById('pause-resume').click(); return out; });
    C.ok(pause.open && pause.onTop, `PAUSE doesn't open over the vote screen: ${JSON.stringify(pause)}`);
    // after the meeting: the flag's gone
    await ev(H, () => RS.director.imposter.hostEndMeeting()); await sleep(9000);
    for (const p of pages) C.ok(!(await ev(p, () => RS.director.imposter.phase !== 'meeting' && document.body.classList.contains('imp-meeting'))), `${p.pname}: the meeting flag stayed after the meeting`);
    for (const p of pages) C.ok(!p.errors.length, `${p.pname}: page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
