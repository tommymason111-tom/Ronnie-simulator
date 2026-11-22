// SQUAD PROPS IN A ROOM: on a joining player's game the host moves the squad, and their props (Lewis's jug, the pints,
// the phones, Ian's rod) stay in their hands. They were left where they were made: the middle of the pub floor
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';
const WHO = [['HOSTY', 'lewis'], ['BETH', 'chloe']];
export default async function () {
  const C = checker('propsmp'), host = await startRoomHost(), b = await launch();
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
    const G = pages[1]; await sleep(6000);
    // on the joining player's game (the host moves the squad): every prop in its owner's hand, none left in the middle of the floor
    const r = await ev(G, () => { const T = RS.THREE, out = []; for (const c of RS.cast) { if (!c.prop || !c.rag || !c.rag.list || !c.rag.list.length) continue;
        const hand = c.rag.grip(c.id === 'lewis' ? 'lArmL' : 'lArmR', new T.Vector3()), p = c.prop.position; out.push({ id: c.id, net: !!c.netDriven, d: +p.distanceTo(hand).toFixed(2), at: [p.x, p.y, p.z].map(v => +v.toFixed(2)) }); }
      return out; });
    console.log('  ' + JSON.stringify(r));
    C.ok(r.length > 0 && r.some(x => x.net), `no squad props driven by the host on the guest's game: ${JSON.stringify(r)}`);
    for (const x of r) C.ok(x.d < 0.35 && !(Math.abs(x.at[0]) < 0.01 && Math.abs(x.at[2]) < 0.01), `${x.id}'s prop isn't in their hand on the guest's game: ${JSON.stringify(x)}`);
    for (const p of pages) C.ok(!p.errors.length, `${p.pname}: ` + p.errors.slice(0, 3).join(' | '));
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
