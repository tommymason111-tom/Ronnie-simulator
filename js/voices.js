// REAL VOICES (ElevenLabs). A character with a voice here speaks their speech bubbles out loud, from where they stand,
// for everyone (single player and every player in a lobby, since everyone draws the same bubbles).
//   - Their written lines are made once (tools/voices.py) and shipped as little mp3s: assets/voices/<char>/<hash>.mp3,
//     listed in assets/voices/manifest.json. They're all downloaded in the background as the game loads (a few MB),
//     so a line is ready the moment it's said.
//   - Only those: a line with no clip (typed chat, a name made up in play) is shown silently. Nothing is ever made
//     on the fly (the owner: typed chat isn't spoken), so the game never asks the server for a voice.
// THE BUBBLE AND THE SOUND START TOGETHER: voiceLine() gets the clip ready first, then shows the bubble (onStart) at the
// exact moment the sound starts. A newer line from the same speaker cancels an older one still getting ready, so you
// never hear the last bubble's line under the new one.
// Characters without a voice here are left as they were.
import { audioCtx, decodeClip, playBuffer, duckVoice, voicePlaying } from './audio.js';

// which characters have a real voice (their clips: tools/voices.py). 'narrator' is the game's own voice (narrator.js)
export const VOICED = new Set(['tommy', 'ronnie', 'narrator']);

// the same short id for a line as tools/voices.py works out (FNV-1a over its UTF-16 code units, whitespace tidied)
export function lineHash(text) {
  const s = String(text).trim().replace(/\s+/g, ' '); let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}
// what actually gets read out: emoji and the like dropped, whitespace tidied (null if there's nothing to say)
export function cleanLine(text) { const c = String(text).replace(/[^\p{L}\p{N}\p{P}\p{Zs}£$€%&+=@#]/gu, '').replace(/\s+/g, ' ').trim(); return c && /[\p{L}\p{N}]/u.test(c) ? c : null; }

// ---- the clips: the list, then every clip's mp3 fetched in the background (kept as the small compressed files;
// a line's decoded only when it's said, which takes a few milliseconds), the last few decoded kept for repeats
let MAN = {}, loaded = false;
const RAW = new Map(), DEC = new Map(), DEC_MAX = 16;
const ready = fetch('./assets/voices/manifest.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(j => { MAN = j || {}; loaded = true; preload(); });
const has = (who, h) => !!(MAN[who] && MAN[who].lines && MAN[who].lines.includes(h));
const clipURL = (who, h) => `./assets/voices/${who}/${h}.mp3?v=${(MAN[who] && MAN[who].v) || 1}`;
function preload() {
  const todo = []; for (const who of VOICED) for (const h of (MAN[who] && MAN[who].lines) || []) todo.push([who, h]);
  let i = 0; const next = () => { if (i >= todo.length) return; const [who, h] = todo[i++], k = who + '/' + h;
    if (RAW.has(k)) return next(); fetch(clipURL(who, h)).then(r => r.ok ? r.arrayBuffer() : null).then(ab => { if (ab) RAW.set(k, ab); }).catch(() => {}).then(next); };
  for (let n = 0; n < 4; n++) next();      // (four at a time)
}
// the first decode on a device is slow (the decoder starting up): do one in the background as soon as sound is on
let warmed = false;
function warmDecoder() { if (warmed) return; const ctx = audioCtx(); if (!ctx || ctx.state !== 'running') return setTimeout(warmDecoder, 500);
  const first = RAW.values().next().value; if (!first) return setTimeout(warmDecoder, 500); warmed = true; decodeClip(first.slice(0)).catch(() => {}); }
ready.then(() => setTimeout(warmDecoder, 300));
function remember(k, buf) { DEC.set(k, buf); while (DEC.size > DEC_MAX) DEC.delete(DEC.keys().next().value); return buf; }
// a line's sound, decoded and ready to play (null if there's none)
function getBuffer(who, clean) {
  return ready.then(() => {
    const ctx = audioCtx(); if (!ctx) return null;
    const h = lineHash(clean), k = who + '/' + h;
    if (DEC.has(k)) { const b = DEC.get(k); DEC.delete(k); DEC.set(k, b); return b; }
    if (has(who, h)) { const raw = RAW.get(k);
      return (raw ? Promise.resolve(raw) : fetch(clipURL(who, h)).then(r => r.ok ? r.arrayBuffer() : null).then(ab => { if (ab) RAW.set(k, ab); return ab; }))
        .then(ab => ab ? decodeClip(ab.slice(0)) : null).then(b => b && remember(k, b)); }
    return null;
  }).catch(() => null);
}

// say `text` in `who`'s real voice at `pos` (null: not placed in the world, e.g. the narrator, or you), starting the
// sound and calling onStart(seconds) at the same moment (show the bubble then). Returns false if there's nothing to
// play (no voice, no clip for this line, no sound yet): show the bubble straight away as usual. If the clip isn't
// ready within maxWait, onStart still happens (silently) and the late sound is dropped.
const pending = new Map();
const ENDS = new Map();
// is anyone but the narrator saying (or about to say) a line?
export function othersTalking(but = ['narrator']) { const now = performance.now(); for (const k of pending.keys()) if (!but.includes(k)) return true; for (const [k, e] of ENDS) if (!but.includes(k) && e > now) return true; return false; }
export const PLAYED = [];      // (the last few lines played: who, id, when. For the tests)
export function hasClip(who, text) { const c = cleanLine(text); return !!(c && has(who, lineHash(c))); }
export function voiceLine(who, text, pos, { key = who, vol = 1, onStart = () => {}, maxWait = 3000 } = {}) {      // (3s: a line's first clip has to download and decode; at 1.2s Ronnie's opening Date Night line was dropped)
  if (!who || !VOICED.has(who) || !text) return false;
  const clean = cleanLine(text); if (!clean) return false;
  const ctx = audioCtx(); if (!ctx || ctx.state !== 'running') return false;      // (no sound yet: just show it)
  const h = lineHash(clean); if (loaded && !has(who, h)) return false;      // (no clip: shown, not spoken)
  const tok = {}; pending.set(key, tok);
  const go = (buf) => { if (pending.get(key) !== tok) return; pending.delete(key); const nar = who === 'narrator', dur = buf ? playBuffer(buf, pos, vol, key, nar ? 'narrator' : 'voices') : 0; if (buf && !nar && voicePlaying('narrator')) duckVoice('narrator', dur);      /* (the narrator never talks over anyone: turned down while they speak) */ if (buf) { ENDS.set(key, performance.now() + dur * 1000); PLAYED.push({ who, h, t: performance.now(), dur }); if (PLAYED.length > 50) PLAYED.shift(); } onStart(dur); };
  const timer = setTimeout(() => go(null), maxWait);
  getBuffer(who, clean).then(buf => { clearTimeout(timer); go(buf); });
  return true;
}
// (kept for old callers: nothing to get ready any more, lines are only ever played from their clips)
export function warmLine() { return Promise.resolve(); }
export const cancelLine = (key) => pending.delete(key);
