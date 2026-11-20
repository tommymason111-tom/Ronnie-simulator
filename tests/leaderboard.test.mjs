// ONLINE LEADERBOARDS AND RANKED EAT-OFFS, against the real server code run locally.
//   - the server: only your best counts; the board is in order with your rank; nonsense scores and ids are turned away;
//     a flood is slowed down; a ranked match moves ratings (winner up, loser down, it adds up), and the same match sent
//     twice counts once
//   - a solo eat-off puts its score up and the receipt shows the rank; the 🏆 boards open from the title screen with you
//     on them; with no server they say so (the game's fine)
//   - a real ranked eat-off between two games: both receipts get the placings and the rating changes
import { launch, newPage, startGame, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';
const readyUp = async (ps) => { for (const q of ps) await q.evaluate(() => { const m = window.ronnieMP; if (m && m.net && m.role === 'join' && !m.ready) document.querySelector('#room-ready').click(); }).catch(() => {}); await new Promise(r => setTimeout(r, 1500)); };      // (guests ready up: the host's START waits for everyone)

export default async function () {
  const C = checker('leaderboard'), host = await startRoomHost(), http = host.url.replace(/^ws/, 'http'), b = await launch();
  const post = async (path, body, ip) => { const r = await fetch(http + path, { method: 'POST', body: JSON.stringify(body) }); return { st: r.status, j: await r.json().catch(() => null) }; };
  const get = async (q) => (await fetch(http + '/lb?' + q)).json();
  try {
    // ---- the server
    for (const [pid, s] of [['aaaaaaaa', 120], ['bbbbbbbb', 300], ['cccccccc', 200], ['aaaaaaaa', 90], ['aaaaaaaa', 400]]) await post('/lb', { b: 'eatoff', pid, n: 'P' + pid[0], c: 'chloe', s });
    const top = await get('b=eatoff&pid=cccccccc');
    C.ok(top.top.map(r => r.s).join() === '400,300,200' && top.me && top.me.rank === 3, `the board's wrong: ${JSON.stringify(top)}`);
    C.ok(!top.top.some(r => r.pid), 'the board gives away device ids');
    const bad = await Promise.all([post('/lb', { b: 'eatoff', pid: 'dddddddd', s: 999999 }), post('/lb', { b: 'eatoff', pid: 'x', s: 10 }), post('/lb', { b: 'nope', pid: 'dddddddd', s: 10 })]);
    C.ok(bad.every(x => x.st === 400), `nonsense scores should be turned away: ${bad.map(x => x.st)}`);
    let slowed = false; for (let i = 0; i < 25; i++) { const r = await post('/lb', { b: 'sweep', pid: 'eeeeeeee', s: i }); if (r.st === 429) slowed = true; }
    C.ok(slowed, 'a flood of scores was never slowed down');
    await sleep(100);
    // (new "address" for the rest: the limit is per minute; the local server always says 127.0.0.1, so wait it out by using /rank once the minute's up is too slow; ranked checks below tolerate a 429 by retrying after the window)
    const rank = async (rows, match) => { for (let i = 0; i < 3; i++) { const r = await post('/rank', { rows, match }); if (r.st !== 429) return r; await sleep(61000); } };
    const m1 = await rank([{ pid: 'aaaaaaaa', n: 'A', c: 'chloe', s: 200 }, { pid: 'bbbbbbbb', n: 'B', c: 'ben', s: 100 }], 'ROOM-1');
    const m1b = await rank([{ pid: 'aaaaaaaa', n: 'A', c: 'chloe', s: 200 }, { pid: 'bbbbbbbb', n: 'B', c: 'ben', s: 100 }], 'ROOM-1');
    const rk = await get('b=ranked');
    console.log('  ranked: ' + JSON.stringify(m1.j.rows.map(r => [r.n, r.place, r.r, r.d])) + ' board ' + JSON.stringify(rk.top.map(r => [r.n, r.s, r.g])));
    C.ok(m1.j.rows[0].d > 0 && m1.j.rows[1].d < 0 && Math.abs(m1.j.rows[0].d + m1.j.rows[1].d) <= 1, `ratings: ${JSON.stringify(m1.j)}`);
    C.ok(JSON.stringify(m1b.j) === JSON.stringify(m1.j) && rk.top.every(r => r.g === 1), `the same match sent twice counted twice: ${JSON.stringify(rk)}`);
    // ---- a solo eat-off, and the boards screen
    const p = await newPage(b, { width: 390, height: 844, mobile: true });
    await p.addInitScript(() => { try { localStorage.setItem('rs_mp_name', 'SOLO RON'); localStorage.setItem('rs_mp_char', 'ronnie'); } catch (e) {} });
    await startGame(p, { place: 'pub', mode: 'chonkoff', extra: '&relay=' + encodeURIComponent(host.url) }); await p.click('#play-flat').catch(() => {});
    const solo = await p.evaluate(async () => { RS.renderer.setAnimationLoop(null); RS.sim(2, 1 / 30); RS.director.stats.chonk = 250; RS.director.timeLeft = 0.05; RS.sim(0.2, 1 / 30);
      for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 100)); if ((RS.director.lastLines || []).some(l => /ONLINE/.test(l[0]))) break; }
      return (RS.director.lastLines || []).filter(l => /ONLINE/.test(l[0])); });
    console.log('  solo receipt: ' + JSON.stringify(solo));
    C.ok(solo.length === 1 && /#3/.test(solo[0][1]), `the receipt should show the online rank (#3, behind 400 and 300): ${JSON.stringify(solo)}`);
    await p.goto('http://game.local/index.html?relay=' + encodeURIComponent(host.url), { timeout: 120000, waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
    await p.evaluate(() => document.getElementById('lb-open').click()); await p.waitForFunction(() => document.querySelector('#lb-modal .row') || /switched on|Nobody/.test((document.querySelector('#lb-modal .list') || {}).textContent || ''), null, { timeout: 20000 }).catch(() => {}); console.log('  modal: ' + await p.evaluate(() => (document.querySelector('#lb-modal .list') || {}).textContent));
    const ui = await p.evaluate(() => ({ rows: document.querySelectorAll('#lb-modal .row').length, me: (document.querySelector('#lb-modal .row.me .nm') || {}).textContent, you: document.querySelector('#lb-modal .you').textContent, fits: [...document.querySelectorAll('#lb-modal *')].every(e => e.getBoundingClientRect().right <= innerWidth + 1) }));
    await p.screenshot({ path: (process.env.SHOT_DIR || '/tmp') + '/leaderboard.png' }).catch(() => {});
    C.ok(ui.rows === 4 && /SOLO RON/.test(ui.me || '') && /#3/.test(ui.you) && ui.fits, `the boards screen: ${JSON.stringify(ui)}`);
    await p.goto('http://game.local/index.html', { timeout: 120000, waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2000);
    await p.evaluate(() => document.getElementById('lb-open').click()); await p.waitForFunction(() => { const l = document.querySelector('#lb-modal .list'); return l && !/Loading/.test(l.textContent); }, null, { timeout: 20000 });
    const off = await p.evaluate(() => document.querySelector('#lb-modal .list').textContent); C.ok(/switched on/.test(off), `with no server the boards should say so: ${off}`);
    // ---- a ranked eat-off: two games
    const ev = (q, f, a) => q.evaluate(f, a), cl = (q, s) => ev(q, (s) => document.querySelector(s).click(), s);
    const H = await newPage(b, { width: 900, height: 600 }), G = await newPage(b, { width: 390, height: 844, mobile: true });
    for (const q of [H, G]) { await q.goto('http://game.local/index.html?relay=' + encodeURIComponent(host.url), { timeout: 120000, waitUntil: 'domcontentloaded' }); await q.waitForTimeout(2000); }
    const join = async (q, n, ch, code) => { await cl(q, '.playbtn'); await sleep(400); await cl(q, '#pick-multi'); await sleep(400);
      await ev(q, ([n, c]) => { document.querySelector('#mp-myname').value = n; document.querySelector(`#char-grid .mate[data-id="${c}"]`).click(); }, [n, ch]); await cl(q, '#char-next'); await sleep(400);
      if (!code) { await cl(q, '#mp-host2'); await q.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on', null, { timeout: 30000 }); return ev(q, () => ronnieMP.net.code); }
      await ev(q, (c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code); await q.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on', null, { timeout: 30000 }); };
    const code = await join(H, 'HOSTY', 'lewis'); await join(G, 'GUESTY', 'chloe', code); await sleep(1500);
    await cl(H, '#room-go'); await sleep(400); await ev(H, () => document.querySelector('.scene[data-id="pub"]').click()); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="place"] .bigbtn').click()); await sleep(500);
    await ev(H, () => { const c = document.querySelector('.flip[data-id="eatoff"]'); c.click(); document.querySelector('.flip[data-id="eatoff"] [data-pp="2"]').click(); }); await sleep(300);
    const picked = await ev(H, () => document.querySelector('.flip[data-id="eatoff"] [data-pp="2"]').textContent);
    await ev(H, () => document.querySelector('.screen[data-s="mode"] .bigbtn').click()); await sleep(500); await readyUp([G]); await cl(H, '#go');
    for (const q of [H, G]) { await q.waitForFunction(() => document.querySelector('.screen[data-s="intro"].on') || document.body.classList.contains('ready'), null, { timeout: 180000 }); await ev(q, () => { const r = document.querySelector('#intro-ready'); if (r && r.offsetParent) r.click(); }); }
    for (const q of [H, G]) { await q.waitForFunction(() => window.RS && document.body.classList.contains('ready'), null, { timeout: 180000 }); await ev(q, () => document.getElementById('play-flat').click()); }
    await sleep(2500);
    const modes = await Promise.all([H, G].map(q => ev(q, () => RS.director.mode)));
    await ev(G, () => { RS.director.stats.chonk = 180; }); await ev(H, () => { RS.director.stats.chonk = 140; RS.director.timeLeft = 0.1; });
    let res = null; for (let i = 0; i < 40 && !res; i++) { await sleep(500); const r = await Promise.all([H, G].map(q => ev(q, () => (RS.director.lastLines || []).filter(l => l[2]).map(l => l[0] + ' ' + l[1])))); if (r.every(x => x.length >= 3)) res = r; }
    console.log(`  ranked game (${picked}, modes ${modes}): host ${JSON.stringify(res && res[0])} guest ${JSON.stringify(res && res[1])}`);
    C.ok(modes.every(m => m === 'chonkoffr'), `the ranked eat-off didn't start for both: ${modes}`);
    C.ok(res && res.every(x => /1\. GUESTY/.test(x[1]) && /\(\+\d+\)/.test(x[1]) && /2\. HOSTY/.test(x[2]) && /\(-\d+\)/.test(x[2])), `both receipts should show GUESTY winning with ratings: ${JSON.stringify(res)}`);
    for (const [n, q] of [['solo', p], ['host', H], ['guest', G]]) C.ok(!q.errors.length, `${n} page errors: ` + [...new Set(q.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
