import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';
export default async function () {
  const C = checker('chat'), host = await startRoomHost(), b = await launch();
  try {
    const pages = [];
    for (const [n, c] of [['HOSTY', 'lewis'], ['BETH', 'chloe']]) { const p = await newPage(b, { width: 390, height: 844, mobile: true }); pages.push(p); await p.goto('http://game.local/index.html?relay=' + encodeURIComponent(host.url), { timeout: 240000 }); await sleep(1200);
      await p.evaluate(() => document.querySelector('.playbtn').click()); await sleep(400); await p.evaluate(() => document.querySelector('#pick-multi').click()); await sleep(400);
      await p.evaluate(([n, c]) => { document.querySelector('#mp-myname').value = n; document.querySelector(`#char-grid .mate[data-id="${c}"]`).click(); }, [n, c]); await p.evaluate(() => document.querySelector('#char-next').click()); await sleep(400); }
    const [H, J] = pages;
    await H.evaluate(() => document.querySelector('#mp-host2').click()); await H.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on'); const code = await H.evaluate(() => ronnieMP.net.code);
    await J.evaluate((c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code); await J.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on'); await sleep(1500);
    for (const t of ['hello', 'you there?']) { await J.evaluate((t) => { document.getElementById('room-chat-in').value = t; document.getElementById('room-chat-send') ? document.getElementById('room-chat-send').click() : null; }, t); await sleep(800); }
    console.log(JSON.stringify(await H.evaluate(() => { const bd = document.getElementById('room-chat-badge'), r = bd.getBoundingClientRect(), cs = getComputedStyle(bd), u = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { hidden: bd.hidden, text: bd.textContent, rect: [r.x, r.y, r.width, r.height].map(Math.round), disp: cs.display, vis: cs.visibility, top: u && (u.id || u.className), sendBtn: !!document.getElementById('room-chat-send') }; })));
    await H.screenshot({ path: '/tmp/claude-0/-home-user-Ronnie-simulator/9fc1b6a3-9c77-50a0-9dd9-c1b46e95e9c3/scratchpad/chatbadge.png' });
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
