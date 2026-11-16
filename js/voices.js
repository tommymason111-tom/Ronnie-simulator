// REAL VOICES (ElevenLabs). A character with a voice here speaks their speech bubbles out loud, from where they stand,
// for everyone (single player and every player in a lobby, since everyone draws the same bubbles).
//   - Their written lines are made once (tools/voices.py) and shipped as little mp3s: assets/voices/<char>/<hash>.mp3,
//     listed in assets/voices/manifest.json. They're all downloaded in the background as the game loads (a few MB),
//     so a line is ready the moment it's said.
//   - Anything else they say (typed chat from a player playing as them, a line with no clip) is voiced by the game's
//     server (the /tts endpoint on the relay worker, which holds the ElevenLabs key).
// THE BUBBLE AND THE SOUND START TOGETHER: voiceLine() gets the clip ready first, then shows the bubble (onStart) at the
// exact moment the sound starts. A newer line from the same speaker cancels an older one still getting ready, so you
// never hear the last bubble's line under the new one.
// Characters without a voice here are left as they were.
import { audioCtx, decodeClip, playBuffer } from './audio.js';
import { RELAY } from './net.js';

// which characters have a real voice (the voice itself lives on ElevenLabs; the server maps the name to it)
export const VOICED = new Set(['tommy']);
const TTS = RELAY.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:') + '/tts';
const MAX_LIVE = 160;          // (typed chat longer than this is cut short when spoken)

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
let MAN = {};
const RAW = new Map(), DEC = new Map(), DEC_MAX = 16;
const ready = fetch('./assets/voices/manifest.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(j => { MAN = j || {}; preload(); });
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
let liveOK = true;             // (turned off for the session if the server can't do voices)
// a line's sound, decoded and ready to play (null if there's none)
function getBuffer(who, clean, live) {
  return ready.then(() => {
    const ctx = audioCtx(); if (!ctx) return null;
    const h = lineHash(clean), k = who + '/' + h;
    if (DEC.has(k)) { const b = DEC.get(k); DEC.delete(k); DEC.set(k, b); return b; }
    if (has(who, h)) { const raw = RAW.get(k);
      return (raw ? Promise.resolve(raw) : fetch(clipURL(who, h)).then(r => r.ok ? r.arrayBuffer() : null).then(ab => { if (ab) RAW.set(k, ab); return ab; }))
        .then(ab => ab ? decodeClip(ab.slice(0)) : null).then(b => b && remember(k, b)); }
    if (!live || !liveOK) return null;
    const lk = who + '/live/' + h; if (DEC.has(lk)) return DEC.get(lk);
    return fetch(`${TTS}?v=${encodeURIComponent(who)}&t=${encodeURIComponent(clean.slice(0, MAX_LIVE))}`)
      .then(r => { if (!r.ok) { if (r.status !== 429) liveOK = false; return null; } return r.arrayBuffer(); })
      .then(ab => ab ? decodeClip(ab) : null).then(b => b && remember(lk, b)).catch(() => null);
  }).catch(() => null);
}

// say `text` in `who`'s real voice at `pos`, starting the sound and calling onStart(seconds) at the same moment (show
// the bubble then). Returns false if they've no voice (show the bubble straight away as usual). If the sound isn't
// ready within maxWait, onStart still happens (silently) and the late sound is dropped.
const pending = new Map();
export function voiceLine(who, text, pos, { key = who, live = true, vol = 1, onStart = () => {}, maxWait = null } = {}) {
  if (!who || !VOICED.has(who) || !text) return false;
  const clean = cleanLine(text); if (!clean) return false;
  const ctx = audioCtx(); if (!ctx || ctx.state !== 'running') return false;      // (no sound yet: just show it)
  const tok = {}; pending.set(key, tok);
  const clip = has(who, lineHash(clean)), wait = maxWait ?? (clip ? 1200 : 6000);
  const go = (buf) => { if (pending.get(key) !== tok) return; pending.delete(key); const dur = buf ? playBuffer(buf, pos, vol, key) : 0; onStart(dur); };
  const timer = setTimeout(() => go(null), wait);
  getBuffer(who, clean, live).then(buf => { clearTimeout(timer); go(buf); });
  return true;
}
// get a line ready without saying it (the sender of a chat message does this before it goes out, so everyone else
// gets it straight from the server's cache). Resolves when it's ready, or after maxWait.
export function warmLine(who, text, maxWait = 5000) {
  if (!who || !VOICED.has(who)) return Promise.resolve();
  const clean = cleanLine(text); if (!clean) return Promise.resolve();
  return Promise.race([getBuffer(who, clean, true), new Promise(r => setTimeout(r, maxWait))]);
}
export const cancelLine = (key) => pending.delete(key);
