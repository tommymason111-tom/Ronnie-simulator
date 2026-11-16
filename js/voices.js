// REAL VOICES (ElevenLabs). A character with a voice here speaks their speech bubbles out loud, from where they stand,
// for everyone (single player and every player in a lobby, since everyone draws the same bubbles).
//   - Their written lines are made once (tools/voices.py) and shipped as little mp3s: assets/voices/<char>/<hash>.mp3,
//     listed in assets/voices/manifest.json. Instant, free to play, no server needed.
//   - Anything else they say (typed chat from a player playing as them, a line with no clip yet) is voiced live by the
//     game's server (the /tts endpoint on the relay worker, which holds the ElevenLabs key). If that isn't set up, they
//     just stay quiet (the usual babble).
// Characters without a voice here are left as they were.
import { playVoice, stopVoice } from './audio.js';
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

let MAN = null;
fetch('./assets/voices/manifest.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => { MAN = j || {}; }).catch(() => { MAN = {}; });
const has = (who, h) => !!(MAN && MAN[who] && MAN[who].lines && MAN[who].lines.includes(h));
let liveOK = true;             // (turned off for the session once the server says it can't do voices)

// say `text` in `who`'s real voice at `pos` (a THREE.Vector3, or null for no 3D). `live`: allowed to ask the server
// for lines that weren't made in advance. Returns true if it's going to be spoken (so skip the babble).
export function speak(who, text, pos, { live = true, key = who, vol = 1 } = {}) {
  if (!who || !VOICED.has(who) || !text) return false;
  const clean = cleanLine(text); if (!clean) return false;
  const h = lineHash(clean);
  if (has(who, h)) { playVoice(`./assets/voices/${who}/${h}.mp3`, pos, vol, key); return true; }
  if (!live || !liveOK) return false;
  const url = `${TTS}?v=${encodeURIComponent(who)}&t=${encodeURIComponent(clean.slice(0, MAX_LIVE))}`;
  playVoice(url, pos, vol, key, (status) => { if (status !== 429) liveOK = false; });      // (no server voices: stop asking for this session; just a rate limit: carry on)
  return true;
}
export const hush = (key) => stopVoice(key);
