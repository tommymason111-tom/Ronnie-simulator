// THE NARRATOR: the game's own voice (a deep American man: ElevenLabs' premade "Brian", clips made with eleven_v3 by
// tools/voices.py from tools/voice_lines/narrator.json). Not placed in the world, a little under the game, on its own
// slider in the sound mix (THE NARRATOR: 0 turns it off), and quiet while voice chat is on (audio.js npcMute).
//   - Says: Date Night's narration, the stage directions in anyone's lines ("*a single tear*" -> "A single tear fell.",
//     after or before the character's own words: character.js, narration.js splitLine), the attack cards, banners
//     (a mode starting, Run the Pub's events, a wave...), GET READY, power-ups, and each mode's calls (a Boss Fight
//     phase, an Imposter meeting, Prop Hunt and Search & Destroy rounds), the end of a game, and a few asides.
//   - Only ever from a clip: text with a player's name in it has no clip and is left silent. Nothing is made live.
//   - Never over anyone: if someone's mid-line it waits (a few seconds at most, then drops it); if someone starts
//     talking while it's speaking, it's turned right down until they've finished (voices.js).
import { NARRATION as N, lineParts, joinBanner } from './narration.js';
import { voiceLine, hasClip, cleanLine, othersTalking } from './voices.js';

let RS = null;
const S = { t: 0, said: [], q: [], last: new Map(), until: 0, seen: {} };
const VOL = 0.85;
export const narrator = {
  // say this text (if it has a clip). o.now: don't wait for quiet (Date Night's films, a line's own direction);
  // o.onStart(dur): when it starts (or straight away if it won't be said)
  say(text, o = {}) { try { return say(text, o); } catch (e) { if (o.onStart) o.onStart(0); return false; } },
  line(key, o) { const l = N[key]; if (!l || !l.length) return false; return narrator.say(l[Math.floor(Math.random() * l.length)], o); },
  // a banner (top line, big line): the two together if that has a clip, else whichever does
  banner(top, big) { const a = clean2(top), b = clean2(big); for (const t of [a && b ? joinBanner(a, b) : null, b, a]) if (t && hasClip('narrator', t)) return narrator.say(t); return false; },
  get said() { return S.said; },
};
const clean2 = (t) => { const c = cleanLine(String(t || '')); return c ? c.replace(/[.!?]+$/, '') + (/[!?]$/.test(c) ? c.slice(-1) : '') : null; };

function someoneTalking() { return performance.now() < S.until || othersTalking(); }
function say(text, o) {
  const done = () => { if (o.onStart) o.onStart(0); return false; };
  if (!text || !hasClip('narrator', text)) return done();
  const now = performance.now(), k = cleanLine(text);
  if (!o.now && (S.last.get(k) || 0) > now - 4000) return done();      // (the same thing twice at once: a banner and its card)
  if (!o.now && someoneTalking()) { S.q.push({ text, o, until: S.t + 4 }); if (S.q.length > 2) S.q.shift(); return true; }
  return play(text, o);
}
function play(text, o) {
  const k = cleanLine(text); S.last.set(k, performance.now());
  const ok = voiceLine('narrator', text, null, { key: 'narrator', vol: VOL, maxWait: 3000, onStart: (dur) => { S.until = performance.now() + dur * 1000; S.said.push({ text, t: S.t, dur }); if (S.said.length > 60) S.said.shift(); if (o.onStart) o.onStart(dur); } });
  if (!ok && o.onStart) o.onStart(0);
  return ok;
}

// every frame: the queue, and each mode's moments
const P = {};
function update(dt) {
  S.t += dt;
  if (S.q.length && !someoneTalking()) { const q = S.q.shift(); if (q.until >= S.t) play(q.text, q.o); }
  S.q = S.q.filter(q => q.until >= S.t);
  const d = RS.director; if (!d) return;
  const ch = (k, v) => { const o = P[k]; P[k] = v; return o; };
  if (ch('stats', d.stats) !== d.stats) { for (const k in P) if (k !== 'stats') delete P[k]; }
  const run = !!d.running, wasRun = ch('run', run); if (wasRun && !run) narrator.line('gameover');
  if (!run) return;
  // the squad's attacks: an aside now and then, once they've landed
  if (d.lastHit && ch('hit', d.lastHit) !== d.lastHit && P.hit && Math.random() < 0.5) { const key = 'attack.' + d.lastHit.key; if (N[key]) setTimeout(() => narrator.line(key), 3500); }
  if (d.boss) { const ph = d.boss.ph, p0 = ch('bph', ph); if (p0 != null && ph > p0 && !d.boss.over) narrator.line('boss.phase.' + ph); }
  if (d.imposter) { const im = d.imposter, p0 = ch('iph', im.phase); if (p0 !== im.phase) { if (im.phase === 'meeting') narrator.line('imposter.meeting'); else if (im.phase === 'eject') narrator.line('imposter.ejected'); } }
  if (d.prophunt) { const ph = d.prophunt.phase, p0 = ch('pph', ph); if (p0 !== ph) { if (ph === 'hide') narrator.line('prophunt.hide'); else if (ph === 'seek') narrator.line('prophunt.seek'); } }
  if (d.snd) { const sd = d.snd, p0 = ch('sph', sd.phase); if (p0 !== sd.phase) { if (sd.phase === 'buy') narrator.line('snd.buy'); else if (sd.phase === 'live') narrator.line('snd.go'); }
    const bs = sd.bomb && sd.bomb.st, b0 = ch('bomb', bs); if (b0 != null && b0 !== bs) { if (bs === 'planted') narrator.line('snd.planted'); else if (bs === 'defused') narrator.line('snd.defused'); } }
  if (d.date) { const dn = d.date, c = dn.catches || 0, c0 = ch('dc', c); if (c0 != null && c > c0 && Math.random() < 0.5) setTimeout(() => narrator.line('date.caught'), 1500); }
}
// a character's line with a stage direction in it: the character says their words, the narrator the direction
// (before or after, never on top of each other). sayChar(spokenText, onStart) says the character's part. Returns the
// text to show (the spoken part) and the narration
export function sayWithDirections(text, sayChar) {
  const p = lineParts(text); if (!p.has) { sayChar(text); return p; }
  if (p.narratorFirst) narrator.say(p.dir, { now: true, onStart: (d) => setTimeout(() => sayChar(p.say), d * 1000 + 150) });
  else sayChar(p.say, (d) => setTimeout(() => narrator.say(p.dir, { now: true }), (d > 0 ? d : 0.6 + p.say.length * 0.045) * 1000 + 200));
  return p;
}
export function startNarrator(rs) { if (RS) return narrator; RS = rs; (rs.onFrame || (rs.onFrame = [])).push(update); narrator.state = S; return narrator; }
export { lineParts };
