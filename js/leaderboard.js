// ONLINE LEADERBOARDS: your best eat-off, supermarket sweep and Run the Pub nights go up on the room server's boards,
// with the name and character you play as online, plus RANKED EAT-OFF ratings. If the server doesn't have them (not
// switched on yet, or no internet), the game carries on exactly as before and the boards say so.
import { RELAY, devicePid } from './net.js';

export const LB_NAMES = { eatoff: ['⏱️', 'EAT-OFF'], sweep: ['🛒', 'SUPERMARKET SWEEP'], runpub1: ['🌙', 'RUN THE PUB · QUIET NIGHT'], runpub: ['🍺', 'RUN THE PUB · FRIDAY NIGHT'], runpub3: ['🔥', 'RUN THE PUB · CUP FINAL'], ranked: ['🏅', 'RANKED EAT-OFF'] };
const UNIT = { eatoff: (s) => s + ' pts', sweep: (s) => s.toLocaleString() + ' kcal', runpub1: (s) => '£' + s, runpub: (s) => '£' + s, runpub3: (s) => '£' + s, ranked: (s) => s + ' rating' };
const base = () => { let r = RELAY; try { r = window.__relay || new URLSearchParams(location.search).get('relay') || RELAY; } catch (e) {} return r.replace(/^ws/, 'http').replace(/\/$/, ''); };
const me = () => { let n = 'Ronnie', c = 'ronnie'; try { n = localStorage.getItem('rs_mp_name') || n; c = localStorage.getItem('rs_mp_char') || c; } catch (e) {} return { n, c, pid: devicePid() }; };
async function call(path, body) {
  try { const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(base() + path, body ? { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'text/plain' }, signal: ctl.signal } : { signal: ctl.signal });
    clearTimeout(t); if (!r.ok) return null; return await r.json(); } catch (e) { return null; }
}
// a finished game's score (only ever your best is kept); -> { rank, best } or null
export function submitScore(b, s) { const m = me(); if (!LB_NAMES[b] || !m.pid || !(s >= 0)) return Promise.resolve(null); return call('/lb', { b, s: Math.round(s), pid: m.pid, n: m.n, c: m.c }); }
export function getBoard(b) { const m = me(); return call(`/lb?b=${encodeURIComponent(b)}&pid=${m.pid || ''}`); }
// a ranked match's results (everyone's game sends the same match; it's counted once) -> rows with new ratings
export function postRanked(rows, match) { return call('/rank', { rows, match }); }

// ---- the leaderboards screen (from the title screen)
export function openBoards(first = 'eatoff') {
  let el = document.getElementById('lb-modal'); if (el) el.remove();
  el = document.createElement('div'); el.id = 'lb-modal'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Leaderboards');
  el.innerHTML = `<style>
#lb-modal { position: fixed; inset: 0; z-index: 80; background: rgba(4,8,30,0.9); display: flex; align-items: center; justify-content: center; padding: 12px; box-sizing: border-box; animation: lbin .25s ease-out; }
@keyframes lbin { from { opacity: 0; transform: scale(0.96); } }
#lb-modal .box { width: min(560px, 100%); max-height: 100%; display: flex; flex-direction: column; background: #101a5c; border: 4px solid #ffd400; border-radius: 22px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); overflow: hidden; }
#lb-modal h2 { margin: 12px 0 6px; text-align: center; font: 900 26px "Arial Black", Arial, sans-serif; color: #ffd400; text-shadow: 2px 2px 0 #7a2a00; }
#lb-modal .tabs { display: flex; gap: 6px; overflow-x: auto; padding: 4px 10px 8px; scrollbar-width: none; } #lb-modal .tabs::-webkit-scrollbar { display: none; }
#lb-modal .tabs button { flex: 0 0 auto; font: 900 12px Arial, sans-serif; padding: 8px 10px; border-radius: 12px; border: 2px solid #5b7cff; background: #1c2a7a; color: #c9d3ff; cursor: pointer; white-space: nowrap; }
#lb-modal .tabs button.on { background: #ffd400; color: #111; border-color: #111; }
#lb-modal .list { flex: 1; overflow-y: auto; padding: 0 10px 8px; min-height: 120px; }
#lb-modal .row { display: grid; grid-template-columns: 36px 34px 1fr auto; align-items: center; gap: 8px; padding: 7px 8px; margin: 4px 0; border-radius: 12px; background: rgba(255,255,255,0.06); font: 800 14px Arial, sans-serif; color: #fff; animation: lbrow .3s ease-out backwards; }
@keyframes lbrow { from { opacity: 0; transform: translateX(-12px); } }
#lb-modal .row.me { background: rgba(57,255,20,0.2); outline: 2px solid #39ff14; }
#lb-modal .row .rk { font: 900 16px "Arial Black", Arial, sans-serif; color: #ffd400; text-align: center; } #lb-modal .row img { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; background: #222; }
#lb-modal .row .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } #lb-modal .row .sc { color: #39ff14; font-weight: 900; }
#lb-modal .msg { text-align: center; color: #c9d3ff; font: 700 14px Arial, sans-serif; padding: 24px 10px; } #lb-modal .you { text-align: center; color: #39ff14; font: 800 13px Arial, sans-serif; padding: 4px; min-height: 1.2em; }
#lb-modal .close { margin: 8px 10px 12px; font: 900 16px "Arial Black", Arial, sans-serif; padding: 12px; border-radius: 14px; border: 3px solid #fff; background: #2a3db0; color: #fff; cursor: pointer; }
</style><div class="box"><h2>🏆 LEADERBOARDS</h2><div class="tabs">${Object.entries(LB_NAMES).map(([k, [i, n]]) => `<button type="button" data-b="${k}">${i} ${n}</button>`).join('')}</div><div class="list"></div><div class="you"></div><button class="close" type="button">CLOSE</button></div>`;
  document.body.appendChild(el);
  const list = el.querySelector('.list'), you = el.querySelector('.you'), esc = (t) => String(t).replace(/[<>&"]/g, '');
  const show = async (b) => {
    el.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x.dataset.b === b)); list.innerHTML = '<div class="msg">Loading…</div>'; you.textContent = '';
    const d = await getBoard(b); if (!el.isConnected || el.querySelector('.tabs .on').dataset.b !== b) return;
    if (!d) { list.innerHTML = '<div class="msg">The leaderboards aren\'t switched on yet (or you\'re offline). Your scores still count on this device.</div>'; return; }
    if (!d.top.length) { list.innerHTML = `<div class="msg">Nobody's on this one yet. Be the first!</div>`; return; }
    list.innerHTML = d.top.map((r, i) => `<div class="row${r.me ? ' me' : ''}" style="animation-delay:${i * 0.03}s"><span class="rk">${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span><img src="./assets/portraits/${esc(r.c || 'ronnie')}.webp" alt="" onerror="this.style.visibility='hidden'"><span class="nm">${esc(r.n)}${b === 'ranked' && r.g ? ` <small style="color:#9fb0ff">${r.w}W · ${r.g} played</small>` : ''}</span><span class="sc">${UNIT[b](r.s)}</span></div>`).join('');
    you.textContent = d.me ? `YOU: #${d.me.rank} of ${d.n} · ${UNIT[b](d.me.s)}` : 'Play it to get on the board!';
  };
  el.querySelector('.tabs').addEventListener('click', (e) => { const t = e.target.closest('[data-b]'); if (t) show(t.dataset.b); });
  const bye = () => { if (el.classList.contains('bye')) return; el.classList.add('bye'); setTimeout(() => el.remove(), 170); };      // (it fades out first)
  el.querySelector('.close').addEventListener('click', bye); el.addEventListener('click', (e) => { if (e.target === el) bye(); });
  show(LB_NAMES[first] ? first : 'eatoff');
}
