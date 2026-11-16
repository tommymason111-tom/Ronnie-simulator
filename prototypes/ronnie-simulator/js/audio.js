// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is eating your way to Absolute Unit while Tommy roasts you fun in VR?
// Date: 2026-11-16
// All sound is synthesised with Web Audio: no files to download.
// Pitch drops and volume rises as Ronnie grows (prompt section 8).

let ctx = null, master = null, noiseBuf = null;

export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  // Fixed pattern (not gameplay randomness), so it does not go through rng().
  let s = 12345;
  for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
}

export function setVolume(v) { if (master) master.gain.value = v; }

function env(g, t, a, peak, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function tone(type, f0, f1, dur, peak = 0.3, delay = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  env(g, t, 0.01, peak, dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise(filterType, freq, dur, peak = 0.3, delay = 0, q = 1) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf;
  f.type = filterType; f.frequency.value = freq; f.Q.value = q;
  env(g, t, 0.005, peak, dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, (t * 0.37) % 0.5); src.stop(t + dur + 0.05);
}

// size = Ronnie's scale (1 .. 1.9): bigger = deeper and louder.
export const sfx = {
  chomp(size = 1, saucy = false) {
    const p = 1 / size;
    noise('lowpass', 1800 * p, 0.12, 0.5);
    tone('sine', 140 * p, 50 * p, 0.15, 0.4 * size);
    if (saucy) noise('bandpass', 700 * p, 0.25, 0.3, 0.08, 2);
    noise('lowpass', 1200 * p, 0.09, 0.3, 0.18);
    noise('lowpass', 1000 * p, 0.09, 0.25, 0.32);
    tone('sine', 300 * p, 70 * p, 0.25, 0.35, 0.45); // GULP
  },
  crunch(size = 1) { noise('highpass', 3000 / size, 0.08, 0.5); noise('highpass', 2500 / size, 0.08, 0.4, 0.1); this.chomp(size); },
  pssht() { noise('highpass', 4000, 0.4, 0.45); },
  glug(size = 1) {
    for (let i = 0; i < 4; i++) tone('sine', 260 / size, 120 / size, 0.12, 0.35, i * 0.16);
    tone('triangle', 500, 900, 0.5, 0.15, 0.7); // "AHHH"
  },
  boing() { tone('sine', 120, 600, 0.25, 0.4); tone('sine', 600, 90, 0.5, 0.35, 0.25); },
  ding(level = 1) { tone('triangle', 880 * level, 880 * level, 0.25, 0.25); tone('triangle', 1320 * level, 1320 * level, 0.35, 0.2, 0.08); },
  airhorn() { for (const f of [233, 294, 349]) tone('sawtooth', f, f * 0.98, 0.7, 0.12); },
  splat() { noise('lowpass', 900, 0.25, 0.6); tone('sine', 200, 60, 0.2, 0.4); },
  whoosh() { noise('bandpass', 800, 0.35, 0.3, 0, 0.7); },
  ting() { tone('sine', 2400, 2600, 0.4, 0.12); },
  thud() { tone('sine', 90, 40, 0.25, 0.5); noise('lowpass', 400, 0.15, 0.3); },
  burp(strength = 1) {
    if (!ctx) return;
    const t = ctx.currentTime, dur = 0.4 + strength * 1.6;
    const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    const f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(60, t + dur);
    lfo.frequency.value = 22; lg.gain.value = 25; lfo.connect(lg).connect(o.frequency);
    f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 4;
    env(g, t, 0.03, 0.5 * (0.5 + strength), dur);
    o.connect(f).connect(g).connect(master);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  },
  stageUp() { this.boing(); tone('sine', 60, 30, 0.8, 0.6, 0.1); noise('lowpass', 300, 0.6, 0.4, 0.1); },
  roofPop() { tone('square', 200, 1200, 0.3, 0.2); noise('highpass', 2000, 0.3, 0.3); tone('sine', 900, 1800, 1.2, 0.15, 0.3); },
  choir() { for (const f of [523, 659, 784, 1047]) tone('triangle', f, f, 1.6, 0.08); },
  nooo() { tone('sawtooth', 300, 120, 1.2, 0.12); },
};

// Tommy's voice: the browser's text-to-speech, used as the prompt's "fallback" option (2.2c).
let voice = null, voiceOn = true;
export function setVoiceOn(on) { voiceOn = on; if (!on && window.speechSynthesis) speechSynthesis.cancel(); }
export function voiceAvailable() { return 'speechSynthesis' in window; }
function pickVoice() {
  if (!voiceAvailable()) return null;
  const vs = speechSynthesis.getVoices();
  return vs.find(v => /en-GB/i.test(v.lang) && /male|daniel|george|arthur|ryan/i.test(v.name))
      || vs.find(v => /en-GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
}
export function speak(text, rate, onEnd) {
  if (!voiceOn || !voiceAvailable()) return false;
  try {
    speechSynthesis.cancel();
    if (!voice) voice = pickVoice();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = rate; u.pitch = 0.85;
    if (onEnd) u.onend = onEnd;
    speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}
