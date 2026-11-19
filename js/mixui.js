// SOUND & FEEL: the sound mix (a slider for each kind of sound) and the buzz, in Settings and in the pause menu.
// Kept on this device (audio.js rs_mix, haptics.js rs_haptics).
import { getMix, setMix, sfx, initAudio } from './audio.js';
import { haptics } from './haptics.js';

const ROWS = [
  ['master', '🔊', 'EVERYTHING'],
  ['music', '🎵', 'MUSIC'],
  ['voices', '🗣️', 'THE SQUAD TALKING'],
  ['fx', '💥', 'SOUND EFFECTS'],
  ['ambience', '🌧️', 'BACKGROUND (THE PUB, OUTSIDE)'],
  ['chat', '🎙️', 'VOICE CHAT (OTHER PLAYERS)'],
];
const TEST = { master: 'ding', music: 'strum', voices: null, fx: 'chomp', ambience: 'rustle', chat: 'notify' };

export function buildMix(el) {
  const m = getMix();
  el.innerHTML = `<div class="mixui">${ROWS.map(([k, ico, name]) => `<label class="mx"><span class="mxn">${ico} ${name}</span><span class="mxv" data-v="${k}">${Math.round(m[k] * 100)}%</span>
      <input type="range" min="0" max="100" step="5" value="${Math.round(m[k] * 100)}" data-k="${k}" aria-label="${name} volume"></label>`).join('')}
    <button class="mxbuzz${haptics.on ? ' on' : ''}" type="button">📳 BUZZ WHEN YOU DO THINGS: <b>${haptics.on ? 'ON' : 'OFF'}</b></button>
    <button class="mxbuzz mxshake${haptics.shake ? ' on' : ''}" type="button">💥 SCREEN SHAKE ON BIG HITS: <b>${haptics.shake ? 'ON' : 'OFF'}</b></button>
    <p class="mxnote">The buzz works on Android phones and Quest controllers (iPhones don't let websites vibrate).</p></div>`;
  let testT = 0;
  el.querySelectorAll('input[type=range]').forEach(r => r.addEventListener('input', () => {
    const k = r.dataset.k; setMix(k, r.value / 100); el.querySelector(`[data-v="${k}"]`).textContent = r.value + '%';
    const now = performance.now(); if (now - testT > 160 && TEST[k]) { testT = now; try { initAudio(); sfx(TEST[k], null, 0.7); } catch (e) {} }      // (a little sound so you can hear the level)
  }));
  const sh = el.querySelector('.mxshake'); sh.addEventListener('click', () => { haptics.shake = !haptics.shake; sh.classList.toggle('on', haptics.shake); sh.querySelector('b').textContent = haptics.shake ? 'ON' : 'OFF'; });
  const b = el.querySelector('.mxbuzz:not(.mxshake)'); b.addEventListener('click', () => { haptics.on = !haptics.on; b.classList.toggle('on', haptics.on); b.querySelector('b').textContent = haptics.on ? 'ON' : 'OFF'; });
}
export const MIX_CSS = `
.mixui { display: flex; flex-direction: column; gap: 10px; text-align: left; }
.mixui .mx { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; font: 800 13px Arial, sans-serif; color: #fff; }
.mixui .mxv { color: #ffd400; font-weight: 900; }
.mixui input[type=range] { grid-column: 1 / -1; width: 100%; accent-color: #ffd400; height: 26px; }
.mixui .mxbuzz { margin-top: 4px; padding: 10px; border-radius: 12px; border: 3px solid #555; background: #222a55; color: #fff; font: 900 13px Arial, sans-serif; }
.mixui .mxbuzz.on { border-color: #39ff14; } .mixui .mxbuzz b { color: #ffd400; }
.mixui .mxnote { margin: 0; font: 600 11px Arial, sans-serif; color: #c9d3ff; }
`;
