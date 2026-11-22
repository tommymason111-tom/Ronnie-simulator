// SUPERMARKET SWEEP in a room (two real games): everyone sees everyone else's trolley rolling along in front of them,
// with what they've got in it; and a Lidl bag grabbed in the sweep opens and then goes (there's no throwing in it)
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';
const WHO = [['HOSTY', 'lewis'], ['BETH', 'chloe']];
export default async function () {
  const C = checker('sweepmp'), host = await startRoomHost(), b = await launch();
  try {
    const pages = [];
    for (const [name, ch] of WHO) { const p = await newPage(b, { width: 390, height: 844, mobile: true }); p.pname = name; p.ch = ch; pages.push(p); await p.goto('http://game.local/index.html?relay=' + encodeURIComponent(host.url)); await p.waitForTimeout(1200); }
    const ev = (p, f, a) => p.evaluate(f, a), cl = (p, s) => ev(p, (s) => document.querySelector(s).click(), s);
    const join = async (p, code) => { await cl(p, '.playbtn'); await sleep(400); await cl(p, '#pick-multi'); await sleep(400);
      await ev(p, ([n, c]) => { document.querySelector('#mp-myname').value = n; document.querySelector(`#char-grid .mate[data-id="${c}"]`).click(); }, [p.pname, p.ch]); await cl(p, '#char-next'); await sleep(400);
      if (!code) { await cl(p, '#mp-host2'); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.code && ronnieMP.net.status === 'on', null, { timeout: 60000 }); return ev(p, () => ronnieMP.net.code); }
      await ev(p, (c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on', null, { timeout: 60000 }); };
    const H = pages[0], code = await join(H); for (const p of pages.slice(1)) await join(p, code);
    await cl(H, '#room-go'); await sleep(400); await ev(H, () => document.querySelector('.scene[data-id="shop"]').click()); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="place"] .bigbtn').click()); await sleep(500);
    await ev(H, () => { const f = () => document.querySelector('.flip[data-id="sweep"]'); f() && f().click(); }); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="mode"] .bigbtn').click()); await sleep(500);
    for (const q of pages) await ev(q, () => { const m = window.ronnieMP; if (m && m.net && m.role === 'join' && !m.ready) document.querySelector('#room-ready').click(); }).catch(() => {}); await sleep(1500);
    await cl(H, '#go');
    for (const p of pages) await p.waitForFunction(() => { for (const id of ['#intro-ready', '#ui-intro-ready', '.howto-ready']) { const r = document.querySelector(id); if (r && r.offsetParent) r.click(); } const st = document.getElementById('start'); const inG = window.RS && document.body.classList.contains('ready') && st && st.classList.contains('gone'); if (inG) { const b = document.querySelector('#play-flat'); if (b && b.offsetParent) b.click(); } return inG && RS.director.mode; }, null, { timeout: 300000, polling: 700 });
    const G = pages[1];
    // each grabs some food: it goes in their trolley, and the other player sees that trolley in front of them, filling up
    const grab = (p) => ev(p, () => { const D = RS.director, out = { remote: !!D.remote, running: D.running, mode: D.mode, sweep: !!D.sweep, trolley: !!(D.trolley && D.trolley.parent) };
      const P = RS.player, f = RS.items.items.filter(it => !it.dead && !it.def.prop && !it.def.veg && !it.heldBy).slice(0, 3); for (const it of f) { RS.player.onGrab ? RS.player.onGrab(it) : D.sweepGrab(it); }
      out.mine = D.sweep ? D.sweep.items : null; return out; });
    const gh = await grab(H), gg = await grab(G); await sleep(4000);
    const seen = async (p) => ev(p, () => { const D = RS.director, o = D.otherTrolleys ? [...D.otherTrolleys.values()] : []; return o.map(t => ({ n: t.g.children.length, vis: !!t.g.parent })); });
    const sh = await seen(H), sg = await seen(G);
    console.log('  ' + JSON.stringify({ gh, gg, sh, sg }));
    C.ok(gh.mine >= 3 && gg.mine >= 3, `grabbing food didn't fill both trolleys: ${JSON.stringify({ gh, gg })}`);
    C.ok(sh.length === 1 && sh[0].vis && sh[0].n > 12, `the host can't see BETH's trolley with her food in it: ${JSON.stringify(sh)}`);
    C.ok(sg.length === 1 && sg[0].vis && sg[0].n > 12, `BETH can't see the host's trolley with their food in it: ${JSON.stringify(sg)}`);
    // a Lidl bag: grabbed in the sweep, it opens and then goes (you can't throw it anywhere)
    const bag = await ev(H, async () => { const P = RS.player; const it = RS.items.spawn('lidlbag', P.head.clone().addScaledVector(P.fwd, 0.6)); P.flatGrab ? P.flatGrab(it) : RS.player.onGrab(it); await new Promise(r => setTimeout(r, 2500)); return { opened: !!it.opened, dead: !!it.dead }; });
    C.ok(bag.opened && bag.dead, `the Lidl bag didn't open and go in the sweep: ${JSON.stringify(bag)}`);
    for (const p of pages) C.ok(!p.errors.length, `${p.pname}: ` + p.errors.slice(0, 3).join(' | '));
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
