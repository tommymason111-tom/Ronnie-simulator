// Getting several real games into one room through the real menus: openMenu(page, relayUrl), hostRoom(page, name, char)
// -> code, joinRoom(page, code, name, char), readyUp(page), pickGame(hostPage, place, mode), tapIn(page) (through the
// intro and PLAY into the game). Used by the many-player tests (lobby12, churn).
import { sleep } from './game.mjs';

export const ev = (p, f, a) => p.evaluate(f, a);
export async function openMenu(p, relay, extra = '') {
  await p.goto('http://game.local/index.html?relay=' + encodeURIComponent(relay) + extra, { timeout: 240000, waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => !!(document.querySelector('.playbtn') && window.ronnieMenu), null, { timeout: 120000, polling: 300 }); await sleep(600);
}
// title -> MULTIPLAYER -> name -> character (left on the HOST / JOIN screen)
export async function namePick(p, name, char) {
  await ev(p, () => document.querySelector('.playbtn').click()); await sleep(300); await ev(p, () => document.querySelector('#pick-multi').click()); await sleep(300);
  await ev(p, ([n, c]) => { document.querySelector('#mp-myname').value = n; const m = document.querySelector(`#char-grid .mate[data-id="${c}"]`); if (m) m.click(); }, [name, char]);
  await ev(p, () => document.querySelector('#char-next').click()); await sleep(300);
}
export async function hostRoom(p, name, char) {
  await namePick(p, name, char);
  await ev(p, () => document.querySelector('#mp-host2').click());
  await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on' && document.querySelector('.screen.on[data-s="room"]'), null, { timeout: 30000, polling: 300 });
  return ev(p, () => ronnieMP.net.code);
}
export async function joinRoom(p, code, name, char) {
  await namePick(p, name, char);
  await ev(p, (c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code);
  await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on' && document.querySelector('.screen.on[data-s="room"]'), null, { timeout: 30000, polling: 300 });
}
export const readyUp = (p, on = true) => ev(p, (on) => { if (!!ronnieMP.ready !== on) document.querySelector('#room-ready').click(); }, on);
const SUB = { chonkoff: ['eatoff', 1], chonkoffr: ['eatoff', 2], imposter: ['imposter', 1], imposter2: ['imposter', 2], runpub1: ['runpub', 1], runpub: ['runpub', 2], runpub3: ['runpub', 3], roam: ['roam', 1], roam0: ['roam', 2] };
// the host: CHOOSE THE GAME -> place -> mode -> (the ready screen); press START with go = true
export async function pickGame(H, place, mode, go = true) {
  await ev(H, () => document.querySelector('#room-go').click()); await sleep(300);
  await ev(H, (pl) => { document.querySelector(`.scene[data-id="${pl}"]`).click(); document.querySelector('.screen[data-s="place"] .bigbtn').click(); }, place); await sleep(400);
  const [card, pp] = SUB[mode] || [mode, 0];
  if (pp) await ev(H, ([c, n]) => document.querySelector(`.flip[data-id="${c}"] .front [data-pp="${n}"]`).click(), [card, pp]);
  else for (let k = 0; k < 4 && !(await ev(H, (m) => { const f = document.querySelector(`.flip[data-id="${m}"]`); return f && f.classList.contains('sel'); }, card)); k++) { await ev(H, (m) => document.querySelector(`.flip[data-id="${m}"]`).click(), card); await sleep(300); }
  await sleep(300);
  await ev(H, () => document.querySelector('.screen[data-s="mode"] .bigbtn').click()); await sleep(400);
  if (go) await ev(H, () => document.getElementById('go').click());
}
// through the intro and PLAY into the running game
export const tapIn = (p, timeout = 240000) => p.waitForFunction(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); const st = document.getElementById('start'), g = window.RS && document.body.classList.contains('ready') && st && st.classList.contains('gone');
  if (g) { const bt = document.querySelector('#play-flat'); if (bt && bt.offsetParent) bt.click(); } return g && RS.director && RS.director.running; }, null, { timeout, polling: 700 });
// a game that isn't on screen still runs (the test browser holds back a page's frames when it isn't the front one)
export const freeRun = (p) => ev(p, () => { if (window.__freeRun) return; window.__freeRun = setInterval(() => { try { if (!RS.__noFree) RS.sim(0.1, 1 / 30); } catch (e) {} }, 100); RS.renderer.setAnimationLoop(null); });
