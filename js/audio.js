import { hapticFor } from './haptics.js';
// Procedural sound effects with the Web Audio API — no audio files to download.
// Every sound is synthesised from oscillators and a shared noise buffer, so the
// game loads instantly and costs almost nothing on the Quest.

let ctx = null;
let master = null;
// ---- the sound mix: master, music, voices (the squad), effects, the background, and voice chat; 0..1 each, kept on
// this device
const BUS = {}, MIX_KEYS = ['master', 'music', 'voices', 'fx', 'ambience', 'chat'];
let MIX = { master: 1, music: 0.8, voices: 1, fx: 1, ambience: 0.8, chat: 1 };
try { const m = JSON.parse(localStorage.getItem('rs_mix') || 'null'); if (m) for (const k of MIX_KEYS) if (typeof m[k] === 'number' && m[k] >= 0 && m[k] <= 1) MIX[k] = m[k]; } catch (e) {}
function applyMix() { if (!ctx || !master) return; const t = ctx.currentTime; master.gain.setTargetAtTime(0.8 * MIX.master, t, 0.03); for (const k in BUS) BUS[k].gain.setTargetAtTime(k === 'voices' && npcMute ? 0 : MIX[k], t, 0.03); }
// voice chat: while anyone's talking on it, the squad (NPCs) go quiet, so you can hear each other (voicechat.js)
let npcMute = false;
export function setNpcMute(on) { npcMute = !!on; applyMix(); if (npcMute) try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {} }
export const npcMuted = () => npcMute;
export function getMix() { return { ...MIX }; }
export function setMix(k, v) { if (!MIX_KEYS.includes(k)) return; MIX[k] = Math.max(0, Math.min(1, +v || 0)); try { localStorage.setItem('rs_mix', JSON.stringify(MIX)); } catch (e) {} applyMix(); }
export function mixGains() { const o = { master: master ? master.gain.value / 0.8 : null }; for (const k in BUS) o[k] = BUS[k].gain.value; return o; }      // (for the tests)
export function chatBus() { return ctx && BUS.chat ? { ctx, out: BUS.chat } : null; }      // (voice chat comes in here: voicechat.js)
let noiseBuf = null;
let musicGain = null;
let pitchScale = 1;
let _pv = 1;                   // this sound's own little pitch wobble (the same sound twice in a row never sounds identical)            // eating sounds get deeper as Ronnie grows

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12; comp.ratio.value = 6;
  master = ctx.createGain(); master.gain.value = 0.8;
  master.connect(comp); comp.connect(ctx.destination);
  // the sound mix (Settings): every kind of sound has its own volume on the way to the master
  for (const k of ['music', 'voices', 'fx', 'ambience', 'chat']) { const b = BUS[k] = ctx.createGain(); b.connect(master); }
  applyMix();
  musicGain = ctx.createGain(); musicGain.gain.value = 0.0; musicGain.connect(BUS.music);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  if (ctx.state === 'suspended') ctx.resume();
  unlockIOS();
  startAmbience();
}
// iPhone/iPad: Web Audio is muted by the silent switch unless an <audio> element
// is playing, so play a tiny silent loop alongside it.
function unlockIOS() {
  try {
    const n = 800, b = new Uint8Array(44 + n); const v = new DataView(b.buffer);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true); b.fill(128, 44);
    let bin = ''; for (const x of b) bin += String.fromCharCode(x);
    const a = new Audio('data:audio/wav;base64,' + btoa(bin)); a.loop = true; a.volume = 0.01; a.setAttribute('playsinline', ''); a.play().catch(() => {});
  } catch (e) {}
}

export function setPitchScale(s) { pitchScale = s; }
// HUSH: while a full-screen cut scene plays on your own (Ben's trip to Turkey), the world behind it goes quiet: nobody
// talking, no footsteps, no background noise, the speakers' song turned right down. Sounds with no place in the world
// (the cut scene's own: the plane taking off) still play
let hush = false;
export const hushed = () => hush;
export function setHush(on) {
  on = !!on; if (on === hush) return; hush = on; if (!ctx) return; const t = ctx.currentTime;
  if (on) for (const k of [...VPLAY.keys()]) stopVoice(k);
  if (ambGain) ambGain.gain.setTargetAtTime(on ? 0 : 1, t, 0.15);
  if (songOut) songOut.gain.setTargetAtTime(on ? 0.12 : 0.9, t, 0.2);
}
// where the songs from the speakers go in (through the same master volume / mute as everything else)
let songOut = null;
export function musicBus() { if (!ctx || !master) return null; if (!songOut) { songOut = ctx.createGain(); songOut.gain.value = 0.9; songOut.connect(BUS.music || master); } return { ctx, out: songOut }; }

export function setListener(pos, fwd, up) {
  if (!ctx) return;
  const l = ctx.listener, t = ctx.currentTime;
  if (l.positionX) {
    l.positionX.setValueAtTime(pos.x, t); l.positionY.setValueAtTime(pos.y, t); l.positionZ.setValueAtTime(pos.z, t);
    l.forwardX.setValueAtTime(fwd.x, t); l.forwardY.setValueAtTime(fwd.y, t); l.forwardZ.setValueAtTime(fwd.z, t);
    l.upX.setValueAtTime(up.x, t); l.upY.setValueAtTime(up.y, t); l.upZ.setValueAtTime(up.z, t);
  } else if (l.setPosition) {
    l.setPosition(pos.x, pos.y, pos.z); l.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
  }
}

// Output node: spatial (PannerNode) when a world position is given.
// VOICES (talking, babble, real voices, chat read out) carry only so far: full volume up close, fading to nothing at
// HEAR_RANGE metres, so you only hear the people near you (other sounds keep the gentle fall-off: a crash across the
// pub should still be heard).
export const HEAR_RANGE = 14;
function out(pos, vol = 1, voice = false) {
  const g = ctx.createGain(); g.gain.value = vol;
  if (pos) {
    const p = ctx.createPanner();
    p.panningModel = 'equalpower';
    if (voice) { p.distanceModel = 'linear'; p.refDistance = 2; p.maxDistance = HEAR_RANGE; p.rolloffFactor = 1; }
    else { p.distanceModel = 'inverse'; p.refDistance = 1; p.rolloffFactor = 0.6; }
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; }
    else p.setPosition(pos.x, pos.y, pos.z);
    g.connect(p); p.connect(voice ? BUS.voices || master : BUS.fx || master); g._p = p;
  } else g.connect(voice ? BUS.voices || master : BUS.fx || master);
  return g;
}
// when a sound's last note has finished, unplug its output (Safari never lets go of nodes still plugged into the
// speakers: hundreds of sounds an hour piled up until the iPhone ran out of memory)
let _endT = 0;
function release(g) { const ms = Math.max(0.1, _endT - ctx.currentTime + 0.4) * 1000;
  setTimeout(() => { try { g.disconnect(); if (g._p) g._p.disconnect(); } catch (e) {} }, ms); }

function env(g, t, a, peak, dec) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
}

function noise(dest, t, dur, type, freq, q, peak, attack = 0.005) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;      // (looped: the buffer's only a second long, and a long hiss used to stop dead part-way through)
  src.playbackRate.value = 0.7 + Math.random() * 0.6;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); env(g, t, attack, peak, dur);
  f.frequency.value = freq * _pv;
  src.connect(f); f.connect(g); g.connect(dest);
  src.start(t, Math.random() * 0.5); src.stop(t + attack + dur + 0.05); _endT = Math.max(_endT, t + attack + dur + 0.05);
  return f;
}

function tone(dest, t, type, f0, f1, dur, peak, attack = 0.005) {
  const o = ctx.createOscillator(); o.type = type; f0 *= _pv; f1 *= _pv; _endT = Math.max(_endT, t + attack + dur + 0.05);
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + attack + dur);
  const g = ctx.createGain(); env(g, t, attack, peak, dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + attack + dur + 0.05);
  return o;
}

const SOUNDS = {
  chomp(d, t) {      // big CHOMP (burger)
    const p = pitchScale;
    tone(d, t, 'sine', 160 * p, 50 * p, 0.14, 0.9);
    noise(d, t, 0.10, 'bandpass', 900 * p, 1.2, 0.8);
    noise(d, t + 0.07, 0.12, 'lowpass', 1600 * p, 0.7, 0.5);
  },
  crunch(d, t) {     // pizza crust crunch
    const p = pitchScale;
    for (let i = 0; i < 4; i++) noise(d, t + i * 0.035, 0.05, 'highpass', 1800 * p, 0.8, 0.6);
    tone(d, t, 'sine', 130 * p, 60 * p, 0.1, 0.6);
  },
  squish(d, t) {     // doughnut squish
    const p = pitchScale;
    tone(d, t, 'sine', 320 * p, 90 * p, 0.18, 0.7);
    noise(d, t, 0.16, 'lowpass', 700 * p, 2, 0.6, 0.02);
  },
  gulp(d, t) {       // cartoon GULP with a bass drop
    const p = pitchScale;
    tone(d, t, 'sine', 420 * p, 110 * p, 0.16, 0.7, 0.01);
    tone(d, t + 0.12, 'sine', 90 * p, 38 * p, 0.35, 0.9, 0.01);
  },
  slurp(d, t) {      // one chug gulp from the can
    const p = pitchScale * (0.9 + Math.random() * 0.2);
    tone(d, t, 'sine', 600 * p, 180 * p, 0.12, 0.55, 0.01);
    noise(d, t, 0.12, 'bandpass', 500 * p, 3, 0.3, 0.01);
  },
  psst(d, t) {       // can crack PSSSSHHHT
    tone(d, t, 'square', 2400, 1200, 0.02, 0.3);
    noise(d, t, 0.7, 'highpass', 3500, 0.5, 0.7, 0.01);
  },
  bwoomp(d, t) {     // stage-up inflation
    const o = tone(d, t, 'sine', 55, 240, 0.7, 1.0, 0.05);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 14;
    const lg = ctx.createGain(); lg.gain.value = 25; lfo.connect(lg); lg.connect(o.frequency);
    lfo.start(t); lfo.stop(t + 0.8);
    tone(d, t, 'triangle', 110, 480, 0.6, 0.4, 0.05);
    noise(d, t, 0.6, 'lowpass', 400, 1, 0.4, 0.2);
  },
  fanfare(d, t) {    // little original stage-up fanfare
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => tone(d, t + 0.35 + i * 0.09, 'sawtooth', f, f, 0.18, 0.18, 0.01));
    tone(d, t + 0.75, 'sawtooth', 1047, 1047, 0.5, 0.16, 0.01);
    tone(d, t + 0.75, 'sawtooth', 784, 784, 0.5, 0.12, 0.01);
  },
  smash(d, t) {      // a telly screen going in: a crack, glass showering down, a fizzle
    noise(d, t, 0.08, 'highpass', 3000, 0.7, 1.0, 0.001);
    tone(d, t, 'square', 180, 40, 0.12, 0.45, 0.001);
    for (let i = 0; i < 9; i++) tone(d, t + 0.04 + i * 0.035 + Math.random() * 0.03, 'sine', 2600 + Math.random() * 3200, 2200 + Math.random() * 2400, 0.06 + Math.random() * 0.08, 0.18, 0.001);
    noise(d, t + 0.05, 0.5, 'bandpass', 5200, 1.2, 0.35);
    noise(d, t + 0.1, 0.9, 'bandpass', 900, 3, 0.15);
  },
  thwack(d, t) {     // swatting veg
    noise(d, t, 0.06, 'bandpass', 2500, 0.8, 1.0, 0.001);
    tone(d, t, 'square', 240, 60, 0.09, 0.5, 0.001);
    noise(d, t + 0.02, 0.2, 'lowpass', 900, 1, 0.4);
  },
  splat(d, t) {      // food hits Tommy
    noise(d, t, 0.25, 'lowpass', 1400, 1, 0.9, 0.003);
    tone(d, t, 'sine', 300, 70, 0.15, 0.6);
  },
  boing(d, t) {      // Tommy falls over
    const o = tone(d, t, 'sine', 180, 420, 0.6, 0.6, 0.01);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 18;
    const lg = ctx.createGain(); lg.gain.value = 60; lfo.connect(lg); lg.connect(o.frequency);
    lfo.start(t); lfo.stop(t + 0.7);
  },
  pop(d, t) { tone(d, t, 'sine', 500, 1400, 0.07, 0.4, 0.002); },
  ting(d, t) {       // Tommy's teeth sparkle
    tone(d, t, 'triangle', 2637, 2637, 0.6, 0.25, 0.002);
    tone(d, t + 0.06, 'triangle', 3951, 3951, 0.5, 0.18, 0.002);
  },
  whoosh(d, t) {
    const f = noise(d, t, 0.45, 'bandpass', 400, 2, 0.5, 0.15);
    f.frequency.exponentialRampToValueAtTime(2500, t + 0.45);
  },
  bleurgh(d, t) {    // veg got in. Disgusting.
    const o = tone(d, t, 'sawtooth', 170, 70, 0.8, 0.5, 0.03);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 9;
    const lg = ctx.createGain(); lg.gain.value = 30; lfo.connect(lg); lg.connect(o.frequency);
    lfo.start(t); lfo.stop(t + 0.9);
    noise(d, t, 0.6, 'lowpass', 600, 4, 0.3, 0.05);
  },
  trumpet(d, t) {    // Mango Loco sting (original)
    [[587, 0], [740, 0.12], [880, 0.24], [740, 0.36], [880, 0.48]].forEach(([f, dt]) => {
      tone(d, t + dt, 'sawtooth', f, f, 0.12, 0.2, 0.01);
      tone(d, t + dt, 'square', f * 2, f * 2, 0.08, 0.05, 0.01);
    });
  },
  sadviolin(d, t) {   // the sad trombone: womp... womp... womp... wompppppp (a muted brass slide, the last one wobbling down)
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 3; lp.connect(d);
    [[233, 0, 0.32], [220, 0.42, 0.32], [208, 0.84, 0.32], [196, 1.26, 1.25]].forEach(([f, dt, len], i) => {
      const last = i === 3, a = tone(lp, t + dt, 'sawtooth', f * 1.02, last ? f * 0.9 : f * 0.97, len, 0.16, 0.03), b = tone(lp, t + dt, 'square', f * 0.5, last ? f * 0.45 : f * 0.485, len, 0.05, 0.03);
      // the "wah": the mute opening and closing on each note
      lp.frequency.setValueAtTime(500, t + dt); lp.frequency.linearRampToValueAtTime(1300, t + dt + 0.12); lp.frequency.linearRampToValueAtTime(700, t + dt + len);
      if (last) for (const o of [a, b]) { const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5; const lg = ctx.createGain(); lg.gain.value = 7; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t + dt + 0.2); lfo.stop(t + dt + len + 0.1); }
    });
  },
  thud(d, t) { tone(d, t, 'sine', 90, 40, 0.12, 0.5); noise(d, t, 0.06, 'lowpass', 500, 1, 0.3); },
  shutter(d, t) { noise(d, t, 0.03, 'highpass', 3000, 1, 0.5, 0.001); noise(d, t + 0.06, 0.04, 'bandpass', 2000, 2, 0.4, 0.001); const o = tone(d, t + 0.12, 'sawtooth', 220, 260, 0.14, 0.07, 0.01); wobble(o, t + 0.12, 0.16, 60, 40); },      // a camera: click-clack and the film winding on
  sizzle(d, t) { noise(d, t, 1.6, 'highpass', 4000, 0.5, 0.25, 0.1); },
  fizz(d, t) { noise(d, t, 1.2, 'bandpass', 5000, 0.8, 0.5, 0.02); tone(d, t, 'sine', 200, 900, 0.3, 0.2); },
  whistle(d, t) { tone(d, t, 'sine', 2600, 2700, 0.12, 0.3); tone(d, t + 0.18, 'sine', 2600, 2400, 0.35, 0.3); },
  jet(d, t) { noise(d, t, 2.5, 'lowpass', 600, 1, 0.5, 0.6); tone(d, t, 'sawtooth', 110, 220, 2.2, 0.06, 0.5); },
  siu(d, t) {          // a stadium roar and a big "SIUUUUU"
    noise(d, t, 2.6, 'bandpass', 700, 0.6, 0.55, 0.4); noise(d, t + 0.3, 2.2, 'bandpass', 1500, 0.8, 0.25, 0.3);
    noise(d, t + 0.55, 0.12, 'highpass', 5000, 0.7, 0.45, 0.01);                                   // "S"
    const o = tone(d, t + 0.65, 'sawtooth', 300, 360, 1.5, 0.12, 0.05);                             // "IUUUUU"
    const lfo = ctx.createOscillator(); lfo.frequency.value = 7; const lg = ctx.createGain(); lg.gain.value = 12; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t + 0.65); lfo.stop(t + 2.3);
    tone(d, t + 0.65, 'sine', 600, 720, 1.5, 0.1, 0.05);
  },
  clink(d, t) { tone(d, t, 'triangle', 1800 + Math.random() * 400, 1700, 0.15, 0.2, 0.001); },

  // ================================================================ the rehaul: a sound of its own for every kind of thing
  // ---- buttons and little interface moments
  tap(d, t) { click(d, t, 1900, 0.7); tone(d, t, 'sine', 900, 700, 0.04, 0.3, 0.001); },                           // a button: a soft tick
  toggle(d, t) { click(d, t, 2400, 0.8); click(d, t + 0.05, 1500, 0.7); tone(d, t + 0.05, 'square', 300, 300, 0.02, 0.1, 0.001); },                                            // a switch flicked
  notify(d, t) { bell(d, t, 880, 0.25, 0.5); bell(d, t + 0.13, 1318, 0.25, 0.6); },                                   // someone wants you: a two-note chime
  spawn(d, t) { for (let i = 0; i < 3; i++) tone(d, t + i * 0.04, 'sine', 1400 + i * 500, 1600 + i * 500, 0.08, 0.25, 0.003); },   // something appears: a sparkle
  pickup(d, t) { noise(d, t, 0.05, 'bandpass', 3200, 1.5, 0.35, 0.002); tone(d, t, 'sine', 520, 820, 0.05, 0.25, 0.002); },         // grabbed: a rustle and an upward blip
  sprint(d, t) { const f = noise(d, t, 0.32, 'bandpass', 600, 1.8, 0.45, 0.04); f.frequency.exponentialRampToValueAtTime(3200, t + 0.32); tone(d, t, 'triangle', 220, 440, 0.25, 0.12, 0.02); },
  walk(d, t) { const f = noise(d, t, 0.25, 'bandpass', 2400, 1.8, 0.3, 0.02); f.frequency.exponentialRampToValueAtTime(500, t + 0.25); tone(d, t, 'triangle', 440, 220, 0.25, 0.12, 0.02); },      // sprint off: slowing down
  // ---- money, machines, bells
  coin(d, t) {          // the till: ka-CHING
    noise(d, t, 0.05, 'bandpass', 1800, 2, 0.4, 0.002); click(d, t + 0.02, 900, 0.4);
    bell(d, t + 0.09, 2093, 0.55, 0.45); bell(d, t + 0.09, 2637, 0.5, 0.35); bell(d, t + 0.16, 3136, 0.45, 0.25);
  },
  jackpot(d, t) {       // the fruit machine pays out: a bright arpeggio and coins pouring into the tray
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(d, t + i * 0.07, 'square', f, f, 0.1, 0.09, 0.004));
    for (let i = 0; i < 14; i++) bell(d, t + 0.45 + i * 0.055 + Math.random() * 0.03, 2400 + Math.random() * 1600, 0.12, 0.13);
  },
  reels(d, t) {         // the reels spinning: a fast mechanical ratchet slowing down, then a clunk
    let tt = t; for (let i = 0; i < 16; i++) { click(d, tt, 1300 + (i % 2) * 300, 0.22); tt += 0.035 + i * 0.006; }
    click(d, tt + 0.05, 500, 0.5); tone(d, tt + 0.05, 'sine', 140, 90, 0.08, 0.35, 0.002);
  },
  bell(d, t) { bell(d, t, 1760, 1.0, 0.6); bell(d, t, 2217, 0.9, 0.3); },                                             // the service bell on the hatch: ding!
  ding(d, t) { bell(d, t, 1568, 0.6, 0.45); },                                                                         // a glass full / ready
  // ---- the bar: pouring, glasses, cans, the soda gun
  pour(d, t) {          // a pint pouring: a filling gurgle that rises as the glass fills
    const f = noise(d, t, 1.1, 'bandpass', 380, 4, 0.8, 0.08); f.frequency.exponentialRampToValueAtTime(900, t + 1.1);
    for (let i = 0; i < 6; i++) tone(d, t + 0.1 + i * 0.15 + Math.random() * 0.05, 'sine', 300 + i * 40, 520 + i * 40, 0.05, 0.12, 0.005);
  },
  glass(d, t) { for (let i = 0; i < 2; i++) { const f = 2200 + Math.random() * 900; bell(d, t + i * 0.07, f, 0.35, 0.22 - i * 0.06); bell(d, t + i * 0.07, f * 1.51, 0.25, 0.08); } },   // glasses together
  can(d, t) {           // a can landing / rolling: a hollow tinny clank
    bell(d, t, 620 + Math.random() * 120, 0.18, 0.4); bell(d, t, 1900 + Math.random() * 300, 0.12, 0.2); noise(d, t, 0.04, 'highpass', 2500, 1, 0.3, 0.001);
    for (let i = 1; i < 4; i++) bell(d, t + i * 0.09, 700 + Math.random() * 100, 0.07, 0.12 / i);
  },
  clack(d, t) { click(d, t, 700, 0.9); tone(d, t, 'square', 260, 180, 0.05, 0.3, 0.001); },                          // something plastic put back in its holder
  // ---- things landing, being hit, being thrown
  land(d, t) { tone(d, t, 'sine', 120, 55, 0.1, 0.55, 0.002); noise(d, t, 0.08, 'lowpass', 900, 1, 0.35, 0.002); noise(d, t + 0.01, 0.05, 'bandpass', 2400, 1, 0.12, 0.002); },   // a thing dropped on the floor
  punch(d, t) {         // a fist landing: a meaty thump with a slap on top
    tone(d, t, 'sine', 130, 55, 0.12, 0.8, 0.001); noise(d, t, 0.03, 'highpass', 2500, 0.8, 0.7, 0.001); noise(d, t + 0.01, 0.25, 'lowpass', 260, 2, 0.6, 0.01); tone(d, t + 0.03, 'sawtooth', 210, 120, 0.15, 0.08, 0.01);   // (and an 'oof')
  },
  slap(d, t) { noise(d, t, 0.07, 'highpass', 1800, 0.7, 0.9, 0.001); noise(d, t, 0.12, 'bandpass', 900, 1.5, 0.3, 0.002); },
  throw(d, t) { const f = noise(d, t, 0.22, 'bandpass', 900, 3, 0.9, 0.03); f.frequency.exponentialRampToValueAtTime(260, t + 0.22); },     // something flung: a falling swish
  dart(d, t) { click(d, t, 3200, 0.45); tone(d, t, 'sine', 300, 180, 0.06, 0.4, 0.001); noise(d, t + 0.005, 0.04, 'lowpass', 1200, 1, 0.25, 0.001); },   // a dart hitting the board: thunk
  paddle(d, t) { bell(d, t, 540, 0.09, 0.55); click(d, t, 4200, 0.4); noise(d, t, 0.02, 'bandpass', 1100, 3, 0.3, 0.001); },                          // the ping pong bat: tock
  bounce(d, t) { tone(d, t, 'sine', 2350, 2200, 0.025, 0.3, 0.001); tone(d, t, 'sine', 3720, 3600, 0.015, 0.12, 0.001); tone(d, t, 'triangle', 900, 800, 0.02, 0.12, 0.001); click(d, t, 5000, 0.15); },      // the ball on the table: a hollow celluloid pik
  // ---- the voice of things: a dog, a grunt, a buzzer, an engine
  bark(d, t) { for (const dt of [0, 0.26]) { tone(d, t + dt, 'sawtooth', 520, 300, 0.12, 0.3, 0.008); noise(d, t + dt, 0.1, 'bandpass', 1100, 2, 0.35, 0.005); } },
  grunt(d, t) { const o = tone(d, t, 'sawtooth', 110, 85, 0.45, 0.35, 0.04); wobble(o, t, 0.5, 9, 8); noise(d, t, 0.4, 'bandpass', 500, 2, 0.25, 0.04); },
  buzz(d, t) { const o = tone(d, t, 'sawtooth', 140, 150, 1.2, 0.2, 0.02); wobble(o, t, 1.3, 32, 20); noise(d, t, 1.2, 'bandpass', 3000, 2, 0.08, 0.02); },   // clippers
  engine(d, t) {        // a van pulling away: a revving engine that drops into the distance
    const o = tone(d, t, 'sawtooth', 55, 95, 1.6, 0.22, 0.1); wobble(o, t, 1.8, 26, 9); const f = noise(d, t, 1.6, 'lowpass', 300, 2, 0.4, 0.15); f.frequency.exponentialRampToValueAtTime(1100, t + 1.2);
  },
  skid(d, t) { const o = tone(d, t, 'square', 1500, 1100, 0.6, 0.08, 0.01); wobble(o, t, 0.7, 40, 60); noise(d, t, 0.6, 'bandpass', 2600, 4, 0.4, 0.02); },   // tyres screech
  plane(d, t) { noise(d, t, 2.4, 'bandpass', 900, 0.8, 0.45, 0.7); const f = noise(d, t, 2.4, 'highpass', 2500, 0.7, 0.18, 0.9); f.frequency.exponentialRampToValueAtTime(6000, t + 2.2); tone(d, t, 'triangle', 330, 520, 2.2, 0.04, 0.6); },
  grow(d, t) { for (let i = 0; i < 6; i++) tone(d, t + i * 0.06, 'triangle', 400 * Math.pow(1.19, i), 420 * Math.pow(1.19, i), 0.14, 0.25, 0.005); },   // something growing: a magic rising run
  tick(d, t) { click(d, t, 2600, 0.7); tone(d, t, 'sine', 1200, 1200, 0.03, 0.3, 0.001); },                          // a countdown tick
  stomp(d, t) { tone(d, t, 'sine', 80, 40, 0.18, 0.9, 0.002); bell(d, t, 240, 0.16, 0.35); noise(d, t, 0.04, 'bandpass', 900, 2, 0.5, 0.001); noise(d, t + 0.02, 0.15, 'bandpass', 3500, 1, 0.12, 0.01); },     // a stamping foot / kick drum
  clap(d, t) { for (let i = 0; i < 3; i++) noise(d, t + i * 0.011, 0.05, 'bandpass', 1300, 1.2, 0.6, 0.001); },
  drum(d, t) { tone(d, t, 'sine', 190, 105, 0.32, 0.8, 0.002); tone(d, t, 'triangle', 300, 170, 0.12, 0.25, 0.002); noise(d, t, 0.12, 'bandpass', 2600, 0.8, 0.35, 0.001); },
  zap(d, t) { const o = tone(d, t, 'square', 1800, 200, 0.25, 0.28, 0.002); wobble(o, t, 0.3, 50, 300); },             // a jolt of energy
  kiss(d, t) { tone(d, t, 'sine', 1200, 2600, 0.05, 0.3, 0.002); noise(d, t + 0.03, 0.03, 'highpass', 4000, 1, 0.3, 0.001); },
  rip(d, t) { for (let i = 0; i < 12; i++) noise(d, t + i * 0.03, 0.025, 'bandpass', 900 + i * 260, 2, 0.6, 0.002); },
  cheer(d, t) {         // a crowd going up
    noise(d, t, 1.8, 'bandpass', 900, 0.7, 0.5, 0.25); noise(d, t + 0.1, 1.6, 'bandpass', 2100, 1, 0.22, 0.3);
    for (let i = 0; i < 8; i++) tone(d, t + 0.1 + Math.random() * 0.6, 'sawtooth', 380 + Math.random() * 300, 520 + Math.random() * 300, 0.5 + Math.random() * 0.4, 0.025, 0.1);
  },
  aww(d, t) { noise(d, t, 1.2, 'bandpass', 600, 1, 0.4, 0.2); for (let i = 0; i < 5; i++) tone(d, t + Math.random() * 0.2, 'sawtooth', 340 + Math.random() * 120, 200 + Math.random() * 60, 1.0, 0.025, 0.15); },   // the crowd groans
  snore(d, t) { const f = noise(d, t, 1.4, 'bandpass', 220, 5, 1.0, 0.6); f.frequency.linearRampToValueAtTime(140, t + 1.4); tone(d, t + 0.4, 'sawtooth', 70, 60, 0.9, 0.08, 0.4); },
  anthem(d, t) { [392, 392, 440, 392, 523, 494].forEach((f, i) => { tone(d, t + i * 0.22, 'sawtooth', f, f, 0.2, 0.09, 0.02); tone(d, t + i * 0.22, 'triangle', f / 2, f / 2, 0.2, 0.12, 0.02); }); },   // a terrace chant
  // ---- imposter
  vote(d, t) { bell(d, t, 620, 0.09, 0.4); noise(d, t, 0.03, 'bandpass', 2000, 1.5, 0.6, 0.001); click(d, t + 0.01, 3500, 0.4); },        // a stamp
  fixed(d, t) { [659, 880, 1319].forEach((f, i) => bell(d, t + i * 0.08, f, 0.35, 0.35)); },                                 // a task done
  alarm(d, t) { for (let i = 0; i < 3; i++) { tone(d, t + i * 0.42, 'sawtooth', 620, 620, 0.18, 0.18, 0.01); tone(d, t + i * 0.42 + 0.2, 'sawtooth', 460, 460, 0.18, 0.18, 0.01); } },   // a klaxon
  emergency(d, t) { for (let i = 0; i < 5; i++) bell(d, t + i * 0.12, 1400, 0.1, 0.4); },                                     // the emergency bell, rung hard
  kill(d, t) { const f = noise(d, t, 0.18, 'highpass', 2500, 1, 0.8, 0.002); f.frequency.exponentialRampToValueAtTime(7000, t + 0.15); tone(d, t + 0.05, 'sine', 140, 40, 0.3, 0.9, 0.002); noise(d, t + 0.06, 0.4, 'lowpass', 700, 2, 0.4, 0.01); },
  vent(d, t) { bell(d, t, 330, 0.7, 0.45); bell(d, t, 517, 0.6, 0.3); bell(d, t, 1210, 0.4, 0.15); for (let i = 0; i < 4; i++) noise(d, t + 0.05 + i * 0.07, 0.04, 'bandpass', 4000, 3, 0.25 / (i + 1), 0.001); },   // a metal hatch clanging
  sinister(d, t) { tone(d, t, 'sawtooth', 55, 52, 1.6, 0.25, 0.2); tone(d, t, 'sawtooth', 82, 78, 1.6, 0.15, 0.2); tone(d, t + 0.3, 'sine', 1244, 1174, 1.2, 0.05, 0.3); },
  crewmate(d, t) { [523, 784, 1047, 1568].forEach((f, i) => bell(d, t + i * 0.1, f, 0.6, 0.3)); },
  lightsout(d, t) { const o = tone(d, t, 'sawtooth', 240, 30, 0.9, 0.25, 0.005); click(d, t, 1200, 0.5); noise(d, t, 0.9, 'lowpass', 900, 1, 0.2, 0.02); },
  // ---- cleaning, cards, wires (the little imposter jobs)
  scrub(d, t) { noise(d, t, 0.14, 'bandpass', 2600 + Math.random() * 800, 2.5, 0.35, 0.03); },
  swipe(d, t) { const f = noise(d, t, 0.25, 'bandpass', 1500, 4, 0.5, 0.01); f.frequency.exponentialRampToValueAtTime(3800, t + 0.22); },
  beep(d, t) { tone(d, t, 'square', 1046, 1046, 0.08, 0.22, 0.003); tone(d, t, 'sine', 2092, 2092, 0.06, 0.1, 0.003); },
  error(d, t) { tone(d, t, 'square', 180, 180, 0.12, 0.2, 0.003); tone(d, t + 0.15, 'square', 140, 140, 0.18, 0.2, 0.003); },
  // ---- power-ups
  powerup(d, t) { [392, 523, 659, 784, 1047].forEach((f, i) => tone(d, t + i * 0.05, 'square', f, f * 1.02, 0.09, 0.1, 0.003)); bell(d, t + 0.27, 2093, 0.5, 0.25); },
  powerdown(d, t) { [784, 659, 523, 392].forEach((f, i) => tone(d, t + i * 0.07, 'triangle', f, f * 0.97, 0.1, 0.16, 0.003)); },
  hoover(d, t) { const o = tone(d, t, 'sawtooth', 90, 240, 0.8, 0.12, 0.2); wobble(o, t, 1.6, 60, 4); noise(d, t, 1.4, 'bandpass', 1400, 1, 0.5, 0.3); },
  suck(d, t) { const f = noise(d, t, 0.25, 'bandpass', 400, 3, 0.4, 0.05); f.frequency.exponentialRampToValueAtTime(3000, t + 0.25); tone(d, t + 0.2, 'sine', 600, 1500, 0.05, 0.25, 0.002); },
  // ---- eating: more mouths
  munch(d, t) { const p = pitchScale; for (let i = 0; i < 3; i++) { noise(d, t + i * 0.09, 0.07, 'lowpass', 900 * p, 1.5, 0.55, 0.005); tone(d, t + i * 0.09, 'sine', 140 * p, 80 * p, 0.06, 0.4); } },   // soft bread, a sausage roll
  snap(d, t) { const p = pitchScale; click(d, t, 2800 * p, 0.6); noise(d, t, 0.04, 'highpass', 3000 * p, 1, 0.5, 0.001); tone(d, t + 0.05, 'sine', 180 * p, 90 * p, 0.08, 0.3); },        // chocolate snapping
  lick(d, t) { const p = pitchScale; noise(d, t, 0.18, 'bandpass', 1600 * p, 3, 0.4, 0.04); tone(d, t + 0.05, 'sine', 700 * p, 400 * p, 0.12, 0.25, 0.02); },                              // ice cream
  rustle(d, t) { for (let i = 0; i < 5; i++) noise(d, t + i * 0.03 + Math.random() * 0.02, 0.04, 'highpass', 3500 + Math.random() * 2000, 1, 0.3, 0.002); },                               // a crisp packet
  strum(d, t) { [196, 247, 294, 392, 494, 587].forEach((f, i) => { tone(d, t + i * 0.018, 'triangle', f, f, 0.9, 0.06, 0.002); tone(d, t + i * 0.018, 'sawtooth', f * 2, f * 2, 0.15, 0.015, 0.002); }); },   // a guitar chord
  burp(d, t) { const o = tone(d, t, 'sawtooth', 95, 70, 0.55, 0.45, 0.03); wobble(o, t, 0.6, 22, 14); noise(d, t, 0.5, 'lowpass', 500, 4, 0.3, 0.03); },

  // ================================================================ more sounds: one of its own for every kind of thing
  // ---- the game: combos, growing a size, the meter, countdowns and stings
  combo(d, t) {        // a combo ticking up: each one in a quick run is a semitone higher, so a run of them climbs
    _comboN = t - _comboT < 1.6 ? Math.min(_comboN + 1, 14) : 0; _comboT = t;
    const f = 740 * Math.pow(2, _comboN / 12);
    tone(d, t, 'triangle', f, f * 1.06, 0.045, 0.22, 0.002); tone(d, t + 0.04, 'triangle', f * 1.5, f * 1.52, 0.07, 0.18, 0.002); tone(d, t + 0.04, 'sine', f * 3, f * 3, 0.05, 0.05, 0.002);
  },
  stageup(d, t) {      // growing a size: a deep swell, a bright rising run and a ringing chord on top
    const o = tone(d, t, 'sine', 70, 140, 0.5, 0.5, 0.08); wobble(o, t, 0.6, 7, 6);
    [523, 659, 784, 1047, 1319].forEach((f, i) => { tone(d, t + 0.12 + i * 0.065, 'triangle', f, f, 0.16, 0.2, 0.004); bell(d, t + 0.12 + i * 0.065, f * 2, 0.12, 0.05); });
    for (const f of [1047, 1319, 1568, 2093]) tone(d, t + 0.47, 'triangle', f, f * 1.003, 0.9, 0.09, 0.01);
    const s = noise(d, t + 0.45, 0.8, 'highpass', 6000, 0.7, 0.07, 0.05); s.frequency.setValueAtTime(6000, t + 0.45); s.frequency.exponentialRampToValueAtTime(9000, t + 1.2);
  },
  meterpop(d, t) { tone(d, t, 'sine', 260, 620, 0.05, 0.4, 0.003); tone(d, t + 0.045, 'triangle', 1240, 1180, 0.06, 0.16, 0.002); },      // the eat meter bumping up: blup
  countdown(d, t) { tone(d, t, 'sine', 784, 784, 0.16, 0.35, 0.004); tone(d, t, 'triangle', 1568, 1568, 0.08, 0.06, 0.004); },           // 3.. 2.. 1..
  go(d, t) { tone(d, t, 'sine', 1568, 1568, 0.5, 0.35, 0.004); tone(d, t, 'triangle', 784, 784, 0.45, 0.18, 0.004); tone(d, t, 'sine', 3136, 3136, 0.2, 0.05, 0.004); },
  gamestart(d, t) {    // a game starting: two drum hits and a bright brassy stab
    for (const dt of [0, 0.14]) { tone(d, t + dt, 'sine', 150, 70, 0.18, 0.6, 0.002); noise(d, t + dt, 0.08, 'bandpass', 1800, 0.8, 0.25, 0.001); }
    const lp = filt(d, 'lowpass', 2400, 1); for (const f of [392, 494, 587, 784]) tone(lp, t + 0.3, 'sawtooth', f, f, 0.5, 0.1, 0.01);
    bell(d, t + 0.3, 1568, 0.5, 0.15);
  },
  timeup(d, t) {       // time's up: a game-show buzzer
    const lp = filt(d, 'lowpass', 1500, 2); tone(lp, t, 'sawtooth', 196, 194, 0.7, 0.3, 0.01); tone(lp, t, 'sawtooth', 207, 205, 0.7, 0.25, 0.01); tone(lp, t, 'square', 98, 98, 0.7, 0.12, 0.01);
  },
  award(d, t) {        // an award reveal: a timpani hit, a big brass chord and sparkles falling
    tone(d, t, 'sine', 98, 70, 0.6, 0.7, 0.003); noise(d, t, 0.3, 'lowpass', 400, 1, 0.3, 0.003);
    const lp = filt(d, 'lowpass', 1800, 1); for (const f of [262, 330, 392, 523, 659]) tone(lp, t + 0.02, 'sawtooth', f, f * 1.002, 1.1, 0.07, 0.03);
    for (let i = 0; i < 8; i++) bell(d, t + 0.15 + i * 0.07, 2637 * Math.pow(0.94, i), 0.4, 0.08);
  },
  drumroll(d, t) {     // a snare roll building for 1.2 seconds, then the hit
    for (let i = 0, n = 38; i < n; i++) { const k = i / n; noise(d, t + i * 0.03, 0.04, 'bandpass', 2200, 0.9, 0.08 + 0.3 * k, 0.001); if (i % 2) tone(d, t + i * 0.03, 'triangle', 220, 180, 0.03, 0.04 + 0.1 * k, 0.001); }
    tone(d, t + 1.16, 'sine', 120, 50, 0.3, 0.8, 0.002); noise(d, t + 1.16, 0.25, 'bandpass', 2400, 0.8, 0.5, 0.001); noise(d, t + 1.16, 0.6, 'highpass', 6000, 0.7, 0.18, 0.002);
  },
  victory(d, t) {      // your side won the match: a proper brass fanfare with drums
    const lp = filt(d, 'lowpass', 2600, 1);
    [[392, 0, 0.14], [392, 0.15, 0.08], [392, 0.24, 0.08], [523, 0.33, 0.35], [466, 0.7, 0.18], [523, 0.9, 0.7]].forEach(([f, dt, len]) => { tone(lp, t + dt, 'sawtooth', f, f, len, 0.14, 0.01); tone(lp, t + dt, 'square', f / 2, f / 2, len, 0.05, 0.01); });
    for (const f of [659, 784]) tone(lp, t + 0.9, 'sawtooth', f * 1.003, f, 0.7, 0.06, 0.02);
    for (const dt of [0, 0.33, 0.9]) { tone(d, t + dt, 'sine', 110, 55, 0.25, 0.55, 0.002); noise(d, t + dt, 0.3, 'highpass', 5000, 0.7, 0.12, 0.002); }
  },
  loadwhoosh(d, t) {   // the loading screen sweeping away: a deep rising swell and a sparkle as it lands
    const f = noise(d, t, 0.7, 'bandpass', 220, 1.4, 0.5, 0.25); f.frequency.setValueAtTime(220, t); f.frequency.exponentialRampToValueAtTime(3000, t + 0.7);
    tone(d, t, 'sine', 70, 420, 0.65, 0.3, 0.25);
    [1760, 2349, 2794].forEach((x, i) => bell(d, t + 0.62 + i * 0.05, x, 0.35, 0.08));
  },
  airhorn(d, t) {      // a comedy air horn: two quick blasts and a long one
    const lp = filt(d, 'lowpass', 2600, 1.5);
    for (const [dt, len] of [[0, 0.12], [0.18, 0.12], [0.36, 0.55]]) for (const f of [415, 523, 622]) { const o = tone(lp, t + dt, 'sawtooth', f, f * 0.995, len, 0.09, 0.008); wobble(o, t + dt, len + 0.05, 30, 3); }
  },
  whistle_ref(d, t) {  // a referee's pea whistle: a short peep and a long trilling blast
    for (const [dt, len] of [[0, 0.12], [0.2, 0.55]]) { const o = tone(d, t + dt, 'sine', 2950, 2900, len, 0.22, 0.01); wobble(o, t + dt, len + 0.05, 28, 140); noise(d, t + dt, len, 'bandpass', 3000, 3, 0.12, 0.01); }
  },
  // ---- the lobby and voice chat
  ready(d, t) { tone(d, t, 'triangle', 660, 680, 0.06, 0.28, 0.003); tone(d, t + 0.07, 'triangle', 990, 1000, 0.12, 0.28, 0.003); bell(d, t + 0.07, 1980, 0.25, 0.08); },
  join(d, t) { [523, 659, 784].forEach((f, i) => tone(d, t + i * 0.07, 'sine', f, f, 0.22, 0.22, 0.006)); },
  leave(d, t) { tone(d, t, 'sine', 659, 659, 0.18, 0.22, 0.006); tone(d, t + 0.12, 'sine', 440, 430, 0.3, 0.22, 0.006); click(d, t + 0.36, 900, 0.2); },
  kick(d, t) {         // booted out of the lobby: a boot thump and a falling bwomp
    tone(d, t, 'sine', 140, 50, 0.14, 0.8, 0.002); noise(d, t, 0.05, 'bandpass', 1200, 1.2, 0.5, 0.001);
    const lp = filt(d, 'lowpass', 900, 3); const o = tone(lp, t + 0.08, 'sawtooth', 330, 90, 0.5, 0.25, 0.01); wobble(o, t + 0.08, 0.55, 8, 10);
  },
  mic_on(d, t) { click(d, t, 3200, 0.4); tone(d, t + 0.01, 'sine', 1000, 1000, 0.04, 0.22, 0.003); tone(d, t + 0.07, 'sine', 1500, 1500, 0.06, 0.22, 0.003); },      // mic on: bip-BIP
  mic_off(d, t) { click(d, t, 2400, 0.4); tone(d, t + 0.01, 'sine', 1500, 1500, 0.04, 0.2, 0.003); tone(d, t + 0.07, 'sine', 750, 720, 0.08, 0.2, 0.003); },      // mic off: BIP-bop
  // ---- impacts by what the thing is made of (short; the caller scales the volume by how hard it hit)
  hit_wood(d, t) { noise(d, t, 0.03, 'bandpass', 1200, 3, 0.5, 0.001); bell(d, t, 420, 0.09, 0.4); bell(d, t, 1150, 0.05, 0.15); tone(d, t, 'sine', 180, 150, 0.04, 0.2, 0.001); },      // a hollow wooden tok
  hit_metal(d, t) { click(d, t, 4000, 0.5); for (const [f, dur, pk] of [[523, 0.45, 0.25], [1347, 0.35, 0.16], [2213, 0.25, 0.1], [3571, 0.18, 0.06]]) tone(d, t, 'sine', f, f * 0.997, dur, pk, 0.001); },
  hit_glass(d, t) { click(d, t, 6000, 0.35); bell(d, t, 3300, 0.22, 0.22); tone(d, t, 'sine', 4870, 4860, 0.12, 0.08, 0.001); },
  hit_soft(d, t) { noise(d, t, 0.09, 'lowpass', 650, 0.7, 0.6, 0.006); tone(d, t, 'sine', 150, 95, 0.07, 0.3, 0.004); },
  hit_plastic(d, t) { noise(d, t, 0.035, 'bandpass', 1900, 3, 1.0, 0.001); tone(d, t, 'square', 430, 390, 0.025, 0.15, 0.001); tone(d, t, 'sine', 1150, 1100, 0.05, 0.3, 0.001); },
  hit_ceramic(d, t) { click(d, t, 3600, 0.4); bell(d, t, 2350, 0.16, 0.25); tone(d, t, 'sine', 5150, 5100, 0.07, 0.07, 0.001); noise(d, t, 0.03, 'bandpass', 1500, 2, 0.2, 0.001); },
  hit_cardboard(d, t) { noise(d, t, 0.07, 'bandpass', 480, 1.2, 0.7, 0.002); noise(d, t + 0.005, 0.04, 'highpass', 2600, 0.8, 0.15, 0.002); tone(d, t, 'sine', 125, 90, 0.05, 0.3, 0.002); },
  slosh(d, t) {        // a drink sloshing about in the glass
    const a = noise(d, t, 0.18, 'bandpass', 350, 3, 0.6, 0.04); a.frequency.setValueAtTime(350, t); a.frequency.exponentialRampToValueAtTime(900, t + 0.15);
    const b = noise(d, t + 0.16, 0.2, 'bandpass', 800, 3, 0.45, 0.04); b.frequency.setValueAtTime(800, t + 0.16); b.frequency.exponentialRampToValueAtTime(380, t + 0.36);
    for (let i = 0; i < 3; i++) tone(d, t + 0.05 + i * 0.09 + Math.random() * 0.03, 'sine', 280 + Math.random() * 150, 480 + Math.random() * 200, 0.04, 0.08, 0.004);
  },
  shatter(d, t) {      // a plate or a glass breaking: a crack with a ringing clank, then the pieces bouncing apart in little bursts
    noise(d, t, 0.03, 'highpass', 2500, 0.7, 0.9, 0.0008); bell(d, t, 1150, 0.12, 0.35); bell(d, t, 1730, 0.1, 0.2); tone(d, t, 'sine', 260, 140, 0.04, 0.3, 0.001);
    for (const [dt, n] of [[0.09, 5], [0.21, 4], [0.3, 3], [0.37, 2]]) for (let i = 0; i < n; i++) { const tt = t + dt + Math.random() * 0.03; bell(d, tt, 2500 + Math.random() * 4000, 0.05, 0.16); click(d, tt, 4000 + Math.random() * 3000, 0.15); }
  },
  tipjar(d, t) {       // coins dropping into a glass jar
    [0, 0.07, 0.11, 0.19, 0.24].forEach((dt, i) => { click(d, t + dt, 5000, 0.25); bell(d, t + dt, 3200 + Math.random() * 1400, 0.12, 0.14); bell(d, t + dt, 1450 + i * 20, 0.25, 0.05); });
  },
  // ---- crowds (a room of people, kept soft)
  crowd_ooh(d, t) {    // the room going "ooooh": a dozen voices sliding up and down through an "oo"
    const bus = ctx.createGain(); bus.connect(filt(d, 'bandpass', 330, 3)); bus.connect(filt(d, 'bandpass', 850, 5));
    for (let i = 0; i < 12; i++) { const f = 150 + Math.random() * 130, s = t + Math.random() * 0.12; const o = bend(bus, s, 'sawtooth', [[0, f], [0.35, f * 1.3], [1.1, f * 0.85]], 0.08, 0.12, 0.4); wobble(o, s, 1.2, 4 + Math.random() * 3, 3); }
    noise(d, t, 1.1, 'lowpass', 500, 0.8, 0.12, 0.2);
  },
  crowd_laugh(d, t) {  // the room laughing: voices going "ha ha ha", each at its own speed
    const bus = ctx.createGain(); bus.connect(filt(d, 'bandpass', 750, 2.5)); bus.connect(filt(d, 'bandpass', 1250, 4));
    for (let v = 0; v < 7; v++) { let s = t + Math.random() * 0.25, f = 170 + Math.random() * 160; const gap = 0.13 + Math.random() * 0.06;
      for (let k = 0, n = 4 + Math.floor(Math.random() * 3); k < n; k++) { tone(bus, s, 'sawtooth', f, f * 0.88, 0.07, 0.35 * (1 - k / (n + 1)), 0.012); s += gap; f *= 0.97; } }
    noise(d, t, 1.2, 'bandpass', 1500, 0.8, 0.1, 0.15);
  },
  brawl(d, t) {        // it's kicking off: a chair scraping back, a table thumped, the room going up
    const a = noise(d, t, 0.3, 'bandpass', 700, 6, 0.4, 0.02); a.frequency.setValueAtTime(700, t); a.frequency.exponentialRampToValueAtTime(1300, t + 0.3);
    for (const dt of [0.25, 0.42, 0.55]) { tone(d, t + dt, 'sine', 110, 50, 0.12, 0.6, 0.002); noise(d, t + dt, 0.08, 'lowpass', 600, 1, 0.4, 0.002); }
    bell(d, t + 0.43, 2400, 0.18, 0.12);
    noise(d, t + 0.2, 1.2, 'bandpass', 800, 0.7, 0.3, 0.2); noise(d, t + 0.3, 1.0, 'bandpass', 1900, 1, 0.12, 0.2);
  },
  oneeighty(d, t) {    // ONE HUNDRED AND EIGHTY: the crowd erupts under three big brass hits
    noise(d, t, 1.8, 'bandpass', 1000, 0.6, 0.55, 0.08); noise(d, t + 0.05, 1.6, 'bandpass', 2500, 0.9, 0.2, 0.1);
    const lp = filt(d, 'lowpass', 2200, 1);
    [0, 0.22, 0.44].forEach((dt, i) => { const k = i === 2 ? 1.335 : 1; for (const f of [349, 440, 523]) tone(lp, t + dt, 'sawtooth', f * k, f * k, i === 2 ? 0.7 : 0.16, 0.08, 0.01); tone(d, t + dt, 'sine', 100, 55, 0.2, 0.5, 0.002); });
  },
  // ---- the imposter jobs: each its own
  guinness(d, t) {     // the stout settling: a creamy surge of tiny bubbles, then a soft chime
    const f = noise(d, t, 0.8, 'lowpass', 300, 1, 0.3, 0.15); f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(1400, t + 0.8);
    for (let i = 0; i < 16; i++) tone(d, t + Math.random() * 0.75, 'sine', 2200 + Math.random() * 2400, 2600 + Math.random() * 2400, 0.015, 0.035, 0.002);
    bell(d, t + 0.75, 1175, 0.5, 0.3); bell(d, t + 0.75, 1760, 0.4, 0.12);
  },
  spill(d, t) {        // something overflowing: a splash and drips
    noise(d, t, 0.22, 'lowpass', 1300, 1, 0.75, 0.004); tone(d, t, 'sine', 240, 90, 0.12, 0.4, 0.002);
    for (let i = 0; i < 4; i++) tone(d, t + 0.1 + i * 0.08 + Math.random() * 0.04, 'sine', 700 + Math.random() * 400, 1500 + Math.random() * 600, 0.025, 0.14, 0.002);
  },
  ratchet(d, t) { for (let i = 0; i < 3; i++) { click(d, t + i * 0.025, 2300 - i * 200, 1.0 - i * 0.2); bell(d, t + i * 0.025, 1200 + i * 150, 0.03, 0.14); } },      // a valve wheel cranked round: clack clack clack
  gas_hiss(d, t) {     // gas let out of a keg: a valve thunk and a falling hiss
    tone(d, t, 'sine', 160, 80, 0.07, 0.4, 0.002); click(d, t, 1400, 0.4);
    const f = noise(d, t + 0.02, 0.6, 'bandpass', 2800, 1.2, 0.55, 0.01); f.frequency.setValueAtTime(2800, t + 0.02); f.frequency.exponentialRampToValueAtTime(1100, t + 0.62);
  },
  card_beep(d, t) { tone(d, t, 'sine', 2730, 2730, 0.08, 0.3, 0.002); },      // the card machine reading the card: bip
  receipt(d, t) {      // paid: the approval double-beep, then the receipt printer chattering out the slip, and the tear
    tone(d, t, 'sine', 2730, 2730, 0.06, 0.28, 0.002); tone(d, t + 0.1, 'sine', 2730, 2730, 0.06, 0.28, 0.002);
    for (let i = 0; i < 9; i++) { noise(d, t + 0.22 + i * 0.045, 0.035, 'bandpass', 3200, 2, 0.25, 0.003); tone(d, t + 0.22 + i * 0.045, 'square', 140, 140, 0.03, 0.05, 0.002); }
    const r = noise(d, t + 0.66, 0.1, 'highpass', 2500, 0.8, 0.3, 0.01); r.frequency.setValueAtTime(2500, t + 0.66); r.frequency.exponentialRampToValueAtTime(6000, t + 0.76);
  },
  plug_in(d, t) {      // a jack lead pushed home: a click, a thump, a little speaker hum
    click(d, t, 1600, 0.6); tone(d, t + 0.01, 'sine', 120, 70, 0.07, 0.4, 0.002);
    const lp = filt(d, 'lowpass', 500, 1); tone(lp, t + 0.02, 'sawtooth', 100, 100, 0.25, 0.12, 0.01);
  },
  decks_on(d, t) {     // the decks back on: the needle drops, a scratch, two kicks
    click(d, t, 2500, 0.4); noise(d, t, 0.15, 'highpass', 5000, 0.7, 0.06, 0.005);
    const s = noise(d, t + 0.08, 0.2, 'bandpass', 700, 3, 0.45, 0.01); s.frequency.setValueAtTime(700, t + 0.08); s.frequency.exponentialRampToValueAtTime(2600, t + 0.15); s.frequency.exponentialRampToValueAtTime(600, t + 0.26);
    for (const dt of [0.32, 0.56]) { tone(d, t + dt, 'sine', 150, 45, 0.2, 0.8, 0.002); click(d, t + dt, 3000, 0.25); }
  },
  coins(d, t) { for (let i = 0; i < 6; i++) { const dt = i * 0.03 + Math.random() * 0.02; bell(d, t + dt, 1700 + Math.random() * 1300, 0.14, 0.12); click(d, t + dt, 3000, 0.15); } noise(d, t, 0.22, 'bandpass', 3500, 2, 0.12, 0.02); },      // a handful of coins scooped out: chink chink chink
  reel_stop(d, t) { click(d, t, 2200, 0.4); click(d, t + 0.02, 1900, 0.35); click(d, t + 0.045, 700, 0.6); tone(d, t + 0.045, 'sine', 210, 120, 0.06, 0.45, 0.001); bell(d, t + 0.045, 900, 0.06, 0.12); },      // a reel clunking to a stop
  cherry(d, t) { tone(d, t, 'square', 1319, 1319, 0.05, 0.14, 0.002); tone(d, t + 0.06, 'square', 1760, 1760, 0.08, 0.14, 0.002); tone(d, t + 0.06, 'sine', 3520, 3520, 0.06, 0.05, 0.002); },      // a cherry on the line: an 8-bit bleep
  plunger(d, t) {      // the plunger: a rubbery squelch and a suck
    const f = noise(d, t, 0.15, 'lowpass', 300, 7, 0.6, 0.01); f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(1000, t + 0.15);
    tone(d, t, 'sine', 260, 110, 0.1, 0.4, 0.004); tone(d, t + 0.12, 'sine', 500, 900, 0.03, 0.2, 0.002);
  },
  flush(d, t) {        // the toilet flushing: a rush of water and a gurgle draining away
    const f = noise(d, t, 1.4, 'bandpass', 900, 0.7, 0.55, 0.12); f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(400, t + 1.4);
    noise(d, t, 0.3, 'highpass', 3500, 0.7, 0.2, 0.03);
    for (let i = 0; i < 10; i++) tone(d, t + 0.4 + i * 0.09 + Math.random() * 0.04, 'sine', 180 + Math.random() * 120, 380 + Math.random() * 200, 0.05, 0.12, 0.005);
  },
  loo_catch(d, t) { noise(d, t, 0.06, 'lowpass', 1200, 0.8, 0.45, 0.004); tone(d, t, 'sine', 210, 140, 0.04, 0.2, 0.003); tone(d, t + 0.03, 'triangle', 560, 840, 0.05, 0.16, 0.003); },      // a loo roll caught: fwump, and a little 'got it'
  soggy(d, t) { const f = noise(d, t, 0.2, 'lowpass', 600, 5, 0.6, 0.005); f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(250, t + 0.2); const o = tone(d, t, 'sine', 190, 60, 0.15, 0.4, 0.003); wobble(o, t, 0.2, 25, 30); },      // a wet one: splodge
  page_flip(d, t) { for (let i = 0; i < 4; i++) noise(d, t + i * 0.018, 0.02, 'highpass', 4000, 0.7, 0.25 - i * 0.04, 0.003); noise(d, t + 0.07, 0.06, 'bandpass', 1100, 1.5, 0.15, 0.01); },      // a page of the bookings riffled over
  stamp(d, t) {        // a rubber stamp: the spring goes ka-, the stamp goes CHUNK on the desk
    click(d, t, 2600, 0.35); tone(d, t + 0.05, 'sine', 150, 65, 0.12, 0.7, 0.002); noise(d, t + 0.05, 0.06, 'bandpass', 700, 1.5, 0.5, 0.001); bell(d, t + 0.05, 330, 0.08, 0.15);
  },
  wipe(d, t) { const o = tone(d, t, 'sine', 1700 + Math.random() * 300, 2300, 0.11, 0.12, 0.02); wobble(o, t, 0.15, 32, 90); noise(d, t, 0.12, 'bandpass', 3000, 2, 0.18, 0.03); },      // a cloth squeaking across a table
  broom(d, t) { noise(d, t, 0.18, 'highpass', 1800, 0.5, 0.35, 0.06); noise(d, t + 0.04, 0.08, 'bandpass', 5200, 1.5, 0.12, 0.01); },      // a broom's bristles: shhk
  mop(d, t) { const f = noise(d, t, 0.25, 'lowpass', 700, 2, 0.5, 0.03); f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(1200, t + 0.2); tone(d, t + 0.05, 'sine', 320, 200, 0.12, 0.12, 0.01); },      // a wet mop going round
  keypad(d, t) { const lo = [697, 770, 852, 941][Math.floor(Math.random() * 4)]; tone(d, t, 'sine', 1209, 1209, 0.07, 0.16, 0.002); tone(d, t, 'sine', lo, lo, 0.07, 0.16, 0.002); },      // a keypad key: a phone-style double tone
  unlock(d, t) { [1000, 1333, 2000].forEach((f, i) => tone(d, t + i * 0.06, 'triangle', f, f, 0.05, 0.2, 0.002)); click(d, t + 0.22, 900, 0.5); tone(d, t + 0.22, 'sine', 180, 110, 0.06, 0.3, 0.002); },      // code accepted: bleep bleep bleep, clunk
  breaker(d, t) {      // a circuit breaker thrown: a heavy clunk, a spit of sparks, the hum coming back
    click(d, t, 900, 0.9); tone(d, t, 'sine', 110, 50, 0.1, 0.6, 0.001);
    for (let i = 0; i < 4; i++) noise(d, t + 0.01 + Math.random() * 0.06, 0.012, 'highpass', 5000, 0.7, 0.4, 0.0005);
    const lp = filt(d, 'lowpass', 400, 1); tone(lp, t + 0.05, 'sawtooth', 100, 100, 0.3, 0.1, 0.05);
  },
  gas_tap(d, t) { bell(d, t, 720, 0.06, 0.3); click(d, t, 2100, 0.5); noise(d, t + 0.02, 0.15, 'highpass', 4000, 0.7, 0.25, 0.005); },      // the gas valve lever: clack and a puff
  coupler(d, t) { tone(d, t, 'sine', 120, 70, 0.08, 0.5, 0.001); bell(d, t, 310, 0.2, 0.3); bell(d, t + 0.01, 830, 0.12, 0.15); click(d, t, 1800, 0.4); },      // the keg coupler: a heavy metal clunk
  keg_roll(d, t) { tone(d, t, 'sine', 105, 88, 0.45, 0.6, 0.004); bell(d, t, 236, 0.35, 0.3); bell(d, t, 590, 0.15, 0.1); noise(d, t, 0.4, 'lowpass', 300, 1, 0.3, 0.01); },      // a full keg set down: a hollow boom
  pulley(d, t) { const o = tone(d, t, 'square', 760, 690, 0.06, 0.14, 0.005); wobble(o, t, 0.08, 45, 40); click(d, t, 1300, 0.5); },      // the parasol's winder creaking
  parasol(d, t) {      // the parasol opening: a whoosh up, then the canopy snapping taut
    const f = noise(d, t, 0.25, 'bandpass', 300, 1.5, 0.45, 0.06); f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(1800, t + 0.25);
    noise(d, t + 0.27, 0.04, 'bandpass', 1300, 1.2, 0.8, 0.001); tone(d, t + 0.27, 'sine', 180, 110, 0.06, 0.4, 0.001); click(d, t + 0.3, 2000, 0.3);
  },
  fry(d, t) { for (let i = 0; i < 14; i++) noise(d, t + Math.random() * 0.5, 0.02, 'bandpass', 2000 + Math.random() * 3000, 2, 0.25, 0.001); noise(d, t, 0.5, 'highpass', 5000, 0.7, 0.08, 0.05); },      // the fryer bubbling and spitting
  flare(d, t) { const f = noise(d, t, 0.7, 'lowpass', 250, 1, 0.8, 0.05); f.frequency.setValueAtTime(250, t); f.frequency.exponentialRampToValueAtTime(1600, t + 0.25); tone(d, t, 'sine', 70, 40, 0.5, 0.5, 0.05); noise(d, t + 0.1, 0.6, 'highpass', 3000, 0.7, 0.1, 0.1); },      // the fat catching: WHOOMPH
  dish_splash(d, t) { noise(d, t, 0.2, 'lowpass', 1500, 1, 0.5, 0.004); bell(d, t + 0.02, 480, 0.25, 0.3); bell(d, t + 0.02, 1290, 0.15, 0.1); tone(d, t, 'sine', 200, 120, 0.08, 0.25, 0.002); },      // a pot into the sink
  glass_stack(d, t) { bell(d, t, 3400, 0.18, 0.25); click(d, t, 5500, 0.3); tone(d, t, 'sine', 900, 800, 0.03, 0.2, 0.001); },      // a glass stacked on a glass
  shard(d, t) { for (let i = 0; i < 3; i++) bell(d, t + i * 0.025 + Math.random() * 0.01, 5200 + Math.random() * 2000, 0.05, 0.25); click(d, t, 2600, 0.4); },      // a bit of broken glass into the dustpan
  pipe_turn(d, t) { bell(d, t, 880, 0.08, 0.25); click(d, t, 1400, 0.4); noise(d, t, 0.06, 'bandpass', 2600, 3, 0.2, 0.004); },      // a cable joint turned
  barrier(d, t) {      // the car park barrier: the motor whirring it up, then a clunk at the top
    const lp = filt(d, 'lowpass', 600, 1.5); const o = tone(lp, t, 'sawtooth', 70, 140, 0.8, 0.35, 0.05); wobble(o, t, 0.9, 40, 6);
    noise(d, t, 0.8, 'bandpass', 1200, 2, 0.08, 0.1); click(d, t + 0.85, 700, 0.7); tone(d, t + 0.85, 'sine', 160, 90, 0.08, 0.4, 0.001);
  },
  corkscrew(d, t) { const o = tone(d, t, 'sine', 950, 1150, 0.06, 0.25, 0.01); wobble(o, t, 0.08, 60, 60); noise(d, t, 0.06, 'bandpass', 1600, 3, 0.35, 0.01); },      // the corkscrew creaking in
  cork(d, t) { tone(d, t, 'sine', 240, 1100, 0.025, 0.7, 0.001); tone(d, t, 'sine', 180, 120, 0.05, 0.4, 0.001); noise(d, t, 0.03, 'bandpass', 1500, 1.5, 0.5, 0.001); noise(d, t + 0.03, 0.35, 'highpass', 4500, 0.7, 0.08, 0.02); },      // a cork: POP and a breath of air
  wine_glass(d, t) { tone(d, t, 'sine', 1760, 1758, 1.1, 0.16, 0.002); tone(d, t, 'sine', 1764, 1762, 1.1, 0.12, 0.002); tone(d, t, 'sine', 4870, 4850, 0.4, 0.04, 0.002); },      // a fine wine glass, ringing
  wine_pour(d, t) { for (let i = 0; i < 3; i++) { tone(d, t + i * 0.08, 'sine', 170, 320, 0.05, 0.2, 0.006); noise(d, t + i * 0.08, 0.05, 'lowpass', 800, 2, 0.15, 0.006); } },      // glug glug glug
  napkin(d, t) { const f = noise(d, t, 0.22, 'bandpass', 600, 0.6, 0.3, 0.07); f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(1800, t + 0.22); noise(d, t + 0.2, 0.03, 'highpass', 3000, 0.7, 0.2, 0.002); },      // a fold of cloth: a soft swish and a crease
  fold_done(d, t) { noise(d, t, 0.08, 'lowpass', 600, 1, 0.3, 0.01); tone(d, t + 0.05, 'triangle', 1047, 1047, 0.2, 0.15, 0.004); tone(d, t + 0.13, 'triangle', 1568, 1568, 0.3, 0.13, 0.004); },      // a napkin done: a soft pat and a chime
  lightswitch(d, t) { click(d, t, 1300, 0.8); tone(d, t, 'sine', 240, 160, 0.03, 0.3, 0.001); click(d, t + 0.008, 3200, 0.3); },      // a chunky wall switch
  bulbs_on(d, t) { const lp = filt(d, 'lowpass', 500, 1); tone(lp, t, 'sawtooth', 100, 100, 0.7, 0.12, 0.2); bell(d, t + 0.15, 1319, 0.6, 0.2); bell(d, t + 0.25, 1976, 0.6, 0.15); },      // the lights back on: a hum and a chime
  shock(d, t) { const o = tone(d, t, 'square', 70, 60, 0.35, 0.25, 0.002); wobble(o, t, 0.4, 13, 25); for (let i = 0; i < 8; i++) noise(d, t + Math.random() * 0.35, 0.015, 'highpass', 4000, 0.7, 0.45, 0.0005); },      // ZZZT: a belt off the mains
  bulb_in(d, t) { const o = tone(d, t, 'sine', 2300, 2500, 0.04, 0.06, 0.005); wobble(o, t, 0.05, 50, 80); click(d, t + 0.06, 1700, 0.5); tone(d, t + 0.06, 'sine', 600, 500, 0.03, 0.15, 0.001); },      // a new bulb screwed in
  bulb_twist(d, t) { tone(d, t, 'sine', 2700, 2450, 0.04, 0.18, 0.004); noise(d, t, 0.04, 'bandpass', 3200, 4, 0.25, 0.004); },      // a bulb squeaking as it turns
  bulb_out(d, t) { bell(d, t, 4100, 0.12, 0.15); tone(d, t, 'sine', 650, 500, 0.04, 0.2, 0.002); },      // the dead one out
  grill(d, t) { noise(d, t, 0.9, 'highpass', 3200, 0.7, 0.45, 0.01); tone(d, t, 'sine', 140, 90, 0.06, 0.3, 0.002); noise(d, t, 0.15, 'bandpass', 900, 1, 0.2, 0.004); },      // a burger slapped on the hot grill: TSSSS
  flip(d, t) { noise(d, t, 0.06, 'bandpass', 3200, 2.5, 0.35, 0.004); noise(d, t + 0.09, 0.05, 'lowpass', 900, 1, 0.5, 0.002); noise(d, t + 0.1, 0.5, 'highpass', 3800, 0.7, 0.3, 0.01); },      // the spatula scrapes, the burger slaps down and sizzles
  plate_down(d, t) { tone(d, t, 'sine', 200, 150, 0.04, 0.3, 0.002); [0, 0.07, 0.12, 0.15, 0.17].forEach((dt, i) => bell(d, t + dt, 1900, 0.06, 0.16 / (i + 1))); },      // a plate set down, rattling still
  bin(d, t) { tone(d, t, 'sine', 150, 100, 0.1, 0.5, 0.002); noise(d, t, 0.1, 'bandpass', 600, 3, 0.4, 0.002); bell(d, t, 380, 0.12, 0.15); },      // in the bin: a hollow thunk
  tap_fill(d, t) { const f = noise(d, t, 0.3, 'bandpass', 600, 3, 0.7, 0.02); f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(1500, t + 0.3); tone(d, t, 'sine', 320, 900, 0.3, 0.1, 0.03); },      // the outside tap filling a can
  watering(d, t) { for (let i = 0; i < 7; i++) { const s = t + Math.random() * 0.25, f = 1400 + Math.random() * 1400; tone(d, s, 'sine', f, f * 1.6, 0.02, 0.08, 0.001); } noise(d, t, 0.28, 'bandpass', 2600, 1.5, 0.1, 0.04); },      // a watering can's rose: drips pattering on leaves
  bloom(d, t) { [784, 988, 1175, 1568].forEach((f, i) => bell(d, t + i * 0.05, f, 0.4, 0.12)); noise(d, t + 0.1, 0.3, 'highpass', 7000, 0.7, 0.04, 0.05); },      // a happy basket: a soft harp run
  plop(d, t) { tone(d, t, 'sine', 950, 280, 0.06, 0.45, 0.002); noise(d, t, 0.05, 'lowpass', 900, 1, 0.2, 0.002); },      // dropped back in the water
  net_scoop(d, t) { const f = noise(d, t, 0.2, 'bandpass', 400, 1.5, 0.8, 0.04); f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(1200, t + 0.2); for (let i = 0; i < 3; i++) tone(d, t + 0.15 + i * 0.06, 'sine', 900, 1400, 0.02, 0.08, 0.002); },      // the net through the water, dripping
  quack(d, t) { const bp = filt(d, 'bandpass', 1100, 2.5); for (const dt of [0, 0.22]) { tone(bp, t + dt, 'sawtooth', 620, 470, 0.13, 0.6, 0.01); tone(bp, t + dt, 'square', 310, 240, 0.12, 0.15, 0.01); } },      // a duck, not happy
  litter_bin(d, t) { bell(d, t, 680, 0.12, 0.3); bell(d, t + 0.05, 1950, 0.08, 0.15); noise(d, t + 0.03, 0.06, 'bandpass', 1500, 2, 0.3, 0.002); tone(d, t + 0.08, 'sine', 150, 100, 0.06, 0.3, 0.002); },      // cans and bottles into the bin
  clock_beep(d, t) { tone(d, t, 'sine', 1480, 1480, 0.09, 0.28, 0.003); click(d, t, 4000, 0.15); },      // a button on the time clock
  punch_clock(d, t) { click(d, t, 1800, 0.5); tone(d, t + 0.04, 'sine', 140, 70, 0.08, 0.6, 0.001); noise(d, t + 0.04, 0.05, 'bandpass', 900, 1.5, 0.4, 0.001); bell(d, t + 0.12, 2093, 0.4, 0.25); bell(d, t + 0.12, 2637, 0.3, 0.1); },      // a time card punched: ka-CHUNK, ding
  cutlery(d, t) { for (const [dt, f] of [[0, 3100], [0.04, 4300]]) { bell(d, t + dt, f + Math.random() * 300, 0.08, 0.18); click(d, t + dt, 6000, 0.2); } },      // a knife and fork laid down
  match(d, t) { const f = noise(d, t, 0.1, 'bandpass', 2000, 2, 0.45, 0.01); f.frequency.setValueAtTime(2000, t); f.frequency.exponentialRampToValueAtTime(4500, t + 0.1); noise(d, t + 0.09, 0.35, 'lowpass', 600, 1, 0.35, 0.03); },      // a match struck and catching
  gust(d, t) { const a = noise(d, t, 0.8, 'lowpass', 500, 1.5, 0.5, 0.25); a.frequency.setValueAtTime(500, t); a.frequency.exponentialRampToValueAtTime(1100, t + 0.35); a.frequency.exponentialRampToValueAtTime(350, t + 1.0); noise(d, t + 0.1, 0.6, 'bandpass', 1800, 4, 0.08, 0.2); },      // a gust of wind
  // ---- people and the pub's games
  ko(d, t) {           // knocked out: a cartoon bonk and the birds tweeting round their head
    tone(d, t, 'sine', 700, 180, 0.09, 0.6, 0.001); bell(d, t, 1000, 0.08, 0.25);
    for (let i = 0; i < 3; i++) { const s = t + 0.2 + i * 0.16; tone(d, s, 'sine', 3000, 3700, 0.05, 0.1, 0.004); tone(d, s + 0.06, 'sine', 3300, 3900, 0.04, 0.08, 0.004); }
  },
  bonk(d, t) { tone(d, t, 'sine', 330, 250, 0.12, 0.6, 0.001); bell(d, t, 560, 0.15, 0.3); click(d, t, 2500, 0.3); },      // a ball off the head: tonk
  tackle(d, t) { tone(d, t, 'sine', 80, 35, 0.28, 1.0, 0.002); noise(d, t, 0.25, 'lowpass', 420, 1, 0.6, 0.002); const lp = filt(d, 'lowpass', 900, 1); tone(lp, t + 0.05, 'sawtooth', 150, 90, 0.22, 0.2, 0.02); noise(d, t + 0.02, 0.1, 'bandpass', 2000, 1, 0.2, 0.002); },      // a rugby tackle: WHUMP and an 'oof'
  record_scratch(d, t) { const f = noise(d, t, 0.38, 'bandpass', 600, 2, 1.0, 0.005); f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(3200, t + 0.1); f.frequency.exponentialRampToValueAtTime(500, t + 0.22); f.frequency.exponentialRampToValueAtTime(2600, t + 0.32); const o = tone(d, t, 'sawtooth', 200, 90, 0.35, 0.15, 0.005); wobble(o, t, 0.38, 10, 80); },      // BUSTED: the record stops
  popout(d, t) { tone(d, t, 'sine', 320, 950, 0.05, 0.35, 0.002); const f = noise(d, t, 0.14, 'bandpass', 700, 2, 0.2, 0.01); f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(2200, t + 0.14); },      // food flying out of the bag
  bubble(d, t) { const o = tone(d, t, 'sine', 210, 520, 0.12, 0.3, 0.01); wobble(o, t, 0.14, 30, 40); },      // a bubble appearing: blorp
  warn(d, t) { const o = tone(d, t, 'triangle', 330, 520, 0.22, 0.25, 0.02); wobble(o, t, 0.25, 7, 12); tone(d, t + 0.18, 'sine', 1040, 1040, 0.12, 0.08, 0.004); },      // uh-oh: she's about to look
  roast(d, t) { tone(d, t, 'sine', 210, 170, 0.1, 0.5, 0.002); tone(d, t + 0.13, 'sine', 150, 120, 0.12, 0.5, 0.002); noise(d, t + 0.32, 0.7, 'highpass', 5500, 0.7, 0.3, 0.002); noise(d, t + 0.32, 0.05, 'bandpass', 2000, 1, 0.3, 0.001); },      // a roast lands: ba-dum TSS
  blink(d, t) { tone(d, t, 'sine', 300, 2400, 0.14, 0.3, 0.004); const f = noise(d, t, 0.18, 'bandpass', 800, 3, 0.25, 0.02); f.frequency.setValueAtTime(800, t); f.frequency.exponentialRampToValueAtTime(5000, t + 0.18); bell(d, t + 0.13, 3136, 0.25, 0.1); },      // someone appearing out of thin air
  cast(d, t) {         // a fishing rod cast: the line whizzing off the reel, then a plop
    let tt = t; for (let i = 0; i < 18; i++) { click(d, tt, 3200, 0.25); tt += 0.014 + i * 0.0025; }
    tone(d, t, 'sine', 1900, 800, 0.4, 0.06, 0.02); tone(d, tt + 0.05, 'sine', 900, 300, 0.06, 0.4, 0.002);
  },
  eject(d, t) { tone(d, t, 'sine', 90, 50, 0.2, 0.7, 0.003); const o = tone(d, t + 0.1, 'sine', 1300, 260, 1.0, 0.2, 0.02); wobble(o, t + 0.1, 1.05, 6, 25); noise(d, t, 0.4, 'bandpass', 900, 1, 0.3, 0.05); },      // flung out of the pub: whoomp and a slide whistle falling away
  ghost(d, t) { const o = bend(d, t, 'sine', [[0, 520], [0.4, 700], [1.5, 300]], 0.2, 0.15, 0.6); wobble(o, t, 1.5, 6, 18); bend(d, t + 0.05, 'triangle', [[0, 260], [0.4, 350], [1.5, 150]], 0.06, 0.2, 0.6); noise(d, t, 1.3, 'bandpass', 1200, 1.2, 0.08, 0.4); },      // you're dead: a ghostly wooo
  game_on(d, t) { for (const dt of [0, 0.18]) { bell(d, t + dt, 1046, 0.7, 0.35); tone(d, t + dt, 'sine', 2380, 2370, 0.5, 0.08, 0.002); click(d, t + dt, 3000, 0.3); } },      // a pub game starting: ding ding
  point(d, t) { tone(d, t, 'triangle', 1319, 1760, 0.1, 0.4, 0.003); },      // your point
  point_lose(d, t) { tone(d, t, 'triangle', 440, 400, 0.1, 0.25, 0.003); tone(d, t + 0.11, 'triangle', 330, 280, 0.16, 0.25, 0.003); },      // their point
  darts_reset(d, t) { for (let i = 0; i < 3; i++) { click(d, t + i * 0.05, 4500, 0.35); bell(d, t + i * 0.05, 2600 + i * 300, 0.04, 0.08); } noise(d, t, 0.15, 'highpass', 3000, 0.7, 0.08, 0.01); },      // the darts gathered back up
  attack_in(d, t) {    // an attack's coming: a low brass stab and a timpani hit
    tone(d, t, 'sine', 90, 60, 0.4, 0.6, 0.003); const lp = filt(d, 'lowpass', 1100, 1.5); for (const f of [110, 165, 220, 233]) tone(lp, t, 'sawtooth', f, f * 0.99, 0.55, 0.12, 0.01);
    noise(d, t, 0.15, 'highpass', 3000, 0.7, 0.15, 0.002);
  },
  glasswasher(d, t) { for (let i = 0; i < 8; i++) bell(d, t + Math.random() * 0.2, 2000 + Math.random() * 1600, 0.1, 0.1); tone(d, t + 0.28, 'sine', 120, 70, 0.1, 0.5, 0.002); click(d, t + 0.28, 1200, 0.4); noise(d, t + 0.35, 0.8, 'bandpass', 1200, 0.7, 0.2, 0.2); },      // a rack of glasses in, the door shut, the water starting
  hatch(d, t) { tone(d, t, 'sine', 75, 38, 0.3, 0.9, 0.002); noise(d, t, 0.15, 'bandpass', 420, 1.5, 0.6, 0.002); noise(d, t, 0.04, 'bandpass', 950, 4, 0.4, 0.001); },      // the cellar hatch dropping shut
  crt_on(d, t) { tone(d, t, 'sine', 8000, 8200, 0.6, 0.03, 0.1); tone(d, t, 'sine', 90, 50, 0.08, 0.4, 0.002); noise(d, t + 0.02, 0.3, 'highpass', 3000, 0.7, 0.2, 0.01); },      // the camera monitors flicking on
  clog(d, t) { for (let i = 0; i < 4; i++) { const s = t + i * 0.16 + Math.random() * 0.04; const o = tone(d, s, 'sine', 120 + Math.random() * 40, 60, 0.12, 0.4, 0.01); wobble(o, s, 0.13, 30, 20); noise(d, s, 0.1, 'lowpass', 400, 4, 0.25, 0.01); } },      // a blocked drain glugging
  body_fall(d, t) { tone(d, t, 'sine', 85, 38, 0.22, 0.9, 0.003); noise(d, t, 0.25, 'lowpass', 320, 1, 0.5, 0.004); tone(d, t + 0.14, 'sine', 70, 40, 0.12, 0.45, 0.003); },      // a body hitting the floor
  // ---- BOSS FIGHT (boss.js)
  boss_step(d, t) { tone(d, t, 'sine', 55, 32, 0.35, 0.9, 0.004); noise(d, t, 0.18, 'lowpass', 220, 1.2, 0.5, 0.004); click(d, t + 0.01, 300, 0.25); },      // a giant footstep: a deep floor thump
  boss_stagger(d, t) { const o = tone(d, t, 'triangle', 160, 90, 0.6, 0.35, 0.01); wobble(o, t, 0.6, 9, 22); noise(d, t, 0.25, 'lowpass', 400, 1, 0.3, 0.01); tone(d, t + 0.32, 'sine', 70, 45, 0.25, 0.5, 0.004); },      // the boss reeling: a dizzy wobble, then a stumble
  boss_hitme(d, t) { tone(d, t, 'square', 220, 60, 0.18, 0.3, 0.002); noise(d, t, 0.2, 'bandpass', 1400, 1.5, 0.6, 0.001); tone(d, t + 0.05, 'sine', 120, 50, 0.4, 0.8, 0.003); bell(d, t + 0.25, 1500, 0.5, 0.06); },      // you get flattened: a crunch, a thump and ringing ears
  boss_charge(d, t) { const n = noise(d, t, 1.0, 'bandpass', 300, 1.2, 0.7, 0.25); n.frequency.exponentialRampToValueAtTime(1600, t + 0.9); for (let i = 0; i < 5; i++) tone(d, t + i * 0.18, 'sine', 60, 35, 0.12, 0.6, 0.003); },      // a giant charging: thundering steps and a rush of air
  boss_summon(d, t) { tone(d, t, 'sine', 1900, 2600, 0.18, 0.25, 0.01); tone(d, t + 0.22, 'sine', 2600, 1800, 0.3, 0.25, 0.01); tone(d, t + 0.6, 'sawtooth', 110, 110, 0.4, 0.12, 0.05); },      // a two-finger whistle calling the lads in, then a shout
  fight_bell(d, t) { for (let i = 0; i < 3; i++) { bell(d, t + i * 0.2, 1180, 0.9, 0.35); click(d, t + i * 0.2, 3000, 0.3); } },      // ding ding ding: the fight's on
  boss_warn(d, t) { for (let i = 0; i < 2; i++) tone(d, t + i * 0.16, 'square', 660, 660, 0.1, 0.18, 0.003); tone(d, t + 0.32, 'square', 440, 440, 0.18, 0.18, 0.003); },      // a move's coming: a short warning blip
  boss_throw(d, t) { tone(d, t, 'sawtooth', 140, 90, 0.35, 0.18, 0.05); const n = noise(d, t + 0.15, 0.45, 'bandpass', 500, 2, 0.8, 0.05); n.frequency.exponentialRampToValueAtTime(150, t + 0.6); },      // a giant heave and something huge flying
  boss_food_land(d, t) { noise(d, t, 0.45, 'lowpass', 900, 0.8, 0.9, 0.003); tone(d, t, 'sine', 80, 40, 0.35, 0.8, 0.003); for (let i = 0; i < 6; i++) noise(d, t + 0.08 + Math.random() * 0.3, 0.05, 'bandpass', 1200 + Math.random() * 1500, 3, 0.25, 0.002); },      // giant food landing: a huge squelch with bits spraying
  crit(d, t) { tone(d, t, 'square', 880, 1760, 0.08, 0.2, 0.002); bell(d, t + 0.06, 2637, 0.5, 0.25); noise(d, t, 0.08, 'highpass', 4000, 0.7, 0.4, 0.001); },      // a critical hit (head, weak spot): a bright crack and a ting
  blocked(d, t) { tone(d, t, 'triangle', 300, 300, 0.25, 0.3, 0.002); tone(d, t, 'triangle', 452, 452, 0.25, 0.2, 0.002); click(d, t, 2200, 0.4); },      // bouncing off the boss's shield: a hollow clonk
  heart_up(d, t) { [784, 988, 1319].forEach((f, i) => tone(d, t + i * 0.07, 'sine', f, f * 1.01, 0.22, 0.22, 0.004)); },      // a heart back: a quick sweet rising arpeggio
  slam(d, t) { tone(d, t, 'sine', 70, 28, 0.6, 1.0, 0.003); tone(d, t, 'triangle', 140, 40, 0.3, 0.5, 0.003); noise(d, t, 0.5, 'lowpass', 700, 1, 0.8, 0.003); noise(d, t + 0.02, 0.9, 'lowpass', 260, 0.7, 0.5, 0.05); },      // a giant landing: a deep boom and the ground rumbling
  roar(d, t) { const o = tone(d, t, 'sawtooth', 120, 70, 1.3, 0.35, 0.12); wobble(o, t, 1.4, 11, 18); const o2 = tone(d, t, 'square', 180, 95, 1.2, 0.12, 0.15); wobble(o2, t, 1.3, 7, 25); noise(d, t, 1.3, 'bandpass', 700, 1.2, 0.45, 0.15); },      // a big angry ROAR
  rumble(d, t) { noise(d, t, 2.2, 'lowpass', 160, 0.8, 0.7, 0.9); tone(d, t, 'sine', 45, 38, 2.2, 0.35, 0.8); },      // something huge coming
  boss_win(d, t) { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => { const s = i < 4 ? i * 0.12 : 0.48 + (i - 4) * 0.3; tone(d, t + s, 'square', f, f, i < 4 ? 0.12 : 0.5, 0.1, 0.004); tone(d, t + s, 'triangle', f / 2, f / 2, i < 4 ? 0.12 : 0.5, 0.12, 0.004); }); bell(d, t + 0.78, 2093, 1.2, 0.3); },      // a little original victory fanfare
  defeat(d, t) { [392, 370, 349, 262].forEach((f, i) => { const o = tone(d, t + i * 0.36, 'sawtooth', f, f * (i === 3 ? 0.9 : 0.99), i === 3 ? 1.1 : 0.32, 0.12, 0.02); if (i === 3) wobble(o, t + i * 0.36, 1.1, 6, 8); }); tone(d, t, 'sine', 98, 92, 2.4, 0.2, 0.05); },      // womp, womp, womp, wommmp
  // ---- PROP HUNT (prophunt.js): turning into a prop, the hiders' taunts, a find, a wrong guess, the lock
  ph_poof(d, t) { const f = noise(d, t, 0.38, 'lowpass', 2600, 1, 0.7, 0.004); f.frequency.exponentialRampToValueAtTime(260, t + 0.38); tone(d, t, 'sine', 760, 170, 0.2, 0.35, 0.002); [1760, 2349, 2794].forEach((fq, i) => bell(d, t + 0.08 + i * 0.05, fq, 0.25, 0.12)); },
  ph_quack(d, t) { for (const dt of [0, 0.2]) { const o = tone(d, t + dt, 'sawtooth', 640, 430, 0.13, 0.32, 0.006); wobble(o, t + dt, 0.15, 30, 40); noise(d, t + dt, 0.1, 'bandpass', 1200, 3, 0.35, 0.004); } },
  ph_kazoo(d, t) { const o = tone(d, t, 'sawtooth', 300, 320, 0.28, 0.26, 0.02); wobble(o, t, 0.3, 7, 10); const o2 = tone(d, t + 0.32, 'sawtooth', 400, 240, 0.45, 0.28, 0.02); wobble(o2, t + 0.32, 0.5, 9, 14); noise(d, t, 0.75, 'bandpass', 1500, 4, 0.12, 0.02); },
  ph_airhorn(d, t) { for (const dt of [0, 0.42, 0.84]) for (const fq of [440, 554, 659]) tone(d, t + dt, 'sawtooth', fq, fq * 0.99, dt === 0.84 ? 0.6 : 0.3, 0.12, 0.01); },
  ph_raspberry(d, t) { const o = tone(d, t, 'sawtooth', 95, 62, 0.7, 0.4, 0.02); wobble(o, t, 0.75, 38, 26); noise(d, t, 0.65, 'lowpass', 700, 3, 0.35, 0.02); },
  ph_honk(d, t) { for (const dt of [0, 0.22]) { tone(d, t + dt, 'square', 392, 380, 0.15, 0.2, 0.004); tone(d, t + dt, 'sawtooth', 196, 190, 0.15, 0.16, 0.004); } },
  ph_cuckoo(d, t) { for (const dt of [0, 0.62]) { tone(d, t + dt, 'sine', 784, 780, 0.2, 0.35, 0.01); tone(d, t + dt + 0.24, 'sine', 622, 618, 0.3, 0.35, 0.01); } },
  ph_oi(d, t) { for (const dt of [0, 0.34]) { tone(d, t + dt, 'sawtooth', 190, 250, 0.22, 0.22, 0.01); tone(d, t + dt, 'sine', 600, 2300, 0.22, 0.16, 0.01); noise(d, t + dt, 0.04, 'bandpass', 1800, 2, 0.15, 0.002); } },
  ph_found(d, t) { [523, 659, 784, 1047, 1319].forEach((fq, i) => bell(d, t + i * 0.07, fq, 0.5, 0.35)); noise(d, t, 0.25, 'highpass', 2500, 0.7, 0.4, 0.002); tone(d, t, 'sine', 180, 60, 0.25, 0.5, 0.002); },
  ph_wrong(d, t) { const o = tone(d, t, 'sawtooth', 120, 100, 0.42, 0.3, 0.005); wobble(o, t, 0.45, 18, 10); tone(d, t, 'square', 90, 86, 0.42, 0.14, 0.005); click(d, t, 900, 0.5); },
  ph_lock(d, t) { click(d, t, 1900, 0.8); tone(d, t + 0.02, 'sine', 320, 210, 0.08, 0.35, 0.002); click(d, t + 0.07, 1200, 0.6); },
  ph_unlock(d, t) { click(d, t, 1200, 0.6); tone(d, t + 0.02, 'sine', 210, 340, 0.08, 0.3, 0.002); },
  ph_count(d, t) { tone(d, t, 'sine', 880, 880, 0.12, 0.35, 0.003); tone(d, t, 'triangle', 1760, 1760, 0.08, 0.1, 0.003); },
  ph_check(d, t) { const f = noise(d, t, 0.16, 'bandpass', 700, 3, 0.4, 0.004); f.frequency.exponentialRampToValueAtTime(3200, t + 0.16); bell(d, t + 0.1, 2400, 0.18, 0.2); },
};
// old names still used by a few things (kept, but pointed at the new sounds)
const ALIAS = {};
// a tiny click (a transient through a resonant filter)
function click(d, t, f, peak) { noise(d, t, 0.012, 'bandpass', f, 6, peak, 0.0005); }
// a struck bell / glass: the note plus an inharmonic partial, ringing out
function bell(d, t, f, dur, peak) { tone(d, t, 'sine', f, f * 0.998, dur, peak, 0.002); tone(d, t, 'sine', f * 2.76, f * 2.7, dur * 0.5, peak * 0.3, 0.002); }
// shake an oscillator's pitch (a growl, a rev, a vibrato)
function wobble(o, t, dur, rate, depth) { const l = ctx.createOscillator(); l.frequency.value = rate; const g = ctx.createGain(); g.gain.value = depth; l.connect(g); g.connect(o.frequency); l.start(t); l.stop(t + dur); }
// a filter on the way out, for shaping a whole sound (a mute, a mouth, a tinny speaker)
function filt(d, type, f, q = 1) { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f * _pv; x.Q.value = q; x.connect(d); return x; }
// a held note that bends through several pitches ([[seconds in, Hz], ...]): voices, wails
function bend(d, t, type, pts, peak, attack = 0.02, rel = 0.1) {
  const o = ctx.createOscillator(); o.type = type; const g = ctx.createGain(), end = t + pts[pts.length - 1][0];
  o.frequency.setValueAtTime(pts[0][1] * _pv, t); for (const [dt, f] of pts.slice(1)) o.frequency.linearRampToValueAtTime(f * _pv, t + dt);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.setValueAtTime(peak, Math.max(t + attack, end - rel)); g.gain.exponentialRampToValueAtTime(0.0001, end);
  o.connect(g); g.connect(d); o.start(t); o.stop(end + 0.05); _endT = Math.max(_endT, end + 0.05); return o;
}
let _comboN = 0, _comboT = -9;      // (the combo run: how far up it's climbed, and when the last one was)

export function sfx(name, pos = null, vol = 1) {
  if (!SOUNDS[name]) name = ALIAS[name] || name;
  try { hapticFor(name, pos); } catch (e) {}      // (a buzz too, if it's yours: haptics.js)
  if (!ctx || ctx.state !== 'running') return;
  if (hush && pos) return;      // (the world's gone quiet: a cut scene's on)
  if (!SOUNDS[name]) return;
  // (a busy moment can fire dozens at once: the same sound more than 6 times in a quarter second is just noise)
  const now = ctx.currentTime, h = (_recent[name] = (_recent[name] || []).filter(x => now - x < 0.25)); if (h.length >= 6) return; h.push(now);
  const t = now + 0.005, o = out(pos, vol); _endT = t; _pv = NOVARY.has(name) ? 1 : 0.94 + Math.random() * 0.12;
  try { SOUNDS[name](o, t); } finally { _pv = 1; release(o); }
}
const _recent = {};
// every sound by name (the dev sound board, the tests), in groups for the board; anything not in a group is listed
// under the rest
export const SOUND_NAMES = Object.keys(SOUNDS);
export const hasSound = (name) => !!(SOUNDS[name] || SOUNDS[ALIAS[name]]);
export const SOUND_GROUPS = [
  ['GAME & STINGS', ['combo', 'stageup', 'meterpop', 'countdown', 'go', 'gamestart', 'timeup', 'award', 'drumroll', 'victory', 'loadwhoosh', 'airhorn', 'whistle_ref', 'fanfare', 'sadviolin', 'trumpet', 'bwoomp', 'powerup', 'powerdown']],
  ['BOSS FIGHT', ['slam', 'roar', 'rumble', 'boss_win', 'defeat', 'boss_step', 'boss_stagger', 'boss_hitme', 'boss_charge', 'boss_summon', 'fight_bell', 'boss_warn', 'boss_throw', 'boss_food_land', 'crit', 'blocked', 'heart_up']],
  ['LOBBY & CHAT', ['ready', 'join', 'leave', 'kick', 'mic_on', 'mic_off', 'tap', 'toggle', 'notify', 'error', 'tick', 'beep']],
  ['IMPACTS', ['hit_wood', 'hit_metal', 'hit_glass', 'hit_soft', 'hit_plastic', 'hit_ceramic', 'hit_cardboard', 'shatter', 'smash', 'slosh', 'tipjar', 'land', 'thud', 'body_fall', 'bonk', 'ko', 'tackle', 'punch', 'slap', 'thwack', 'splat']],
  ['CROWDS', ['crowd_ooh', 'crowd_laugh', 'cheer', 'aww', 'brawl', 'oneeighty', 'anthem', 'siu']],
  ['IMPOSTER JOBS', ['guinness', 'spill', 'ratchet', 'gas_hiss', 'card_beep', 'receipt', 'plug_in', 'decks_on', 'coins', 'reel_stop', 'cherry', 'plunger', 'flush', 'loo_catch', 'soggy', 'page_flip', 'stamp', 'wipe', 'broom', 'mop', 'keypad', 'unlock', 'breaker', 'gas_tap', 'coupler', 'keg_roll', 'pulley', 'parasol', 'fry', 'flare', 'dish_splash', 'glass_stack', 'shard', 'pipe_turn', 'barrier', 'corkscrew', 'cork', 'wine_glass', 'wine_pour', 'napkin', 'fold_done', 'lightswitch', 'bulbs_on', 'shock', 'bulb_in', 'bulb_twist', 'bulb_out', 'grill', 'flip', 'plate_down', 'bin', 'tap_fill', 'watering', 'bloom', 'plop', 'net_scoop', 'quack', 'litter_bin', 'clock_beep', 'punch_clock', 'cutlery', 'match', 'gust', 'fixed']],
  ['IMPOSTER', ['vote', 'alarm', 'emergency', 'kill', 'vent', 'sinister', 'crewmate', 'lightsout', 'eject', 'ghost', 'crt_on']],
  ['PUB & GAMES', ['game_on', 'point', 'point_lose', 'darts_reset', 'dart', 'paddle', 'bounce', 'bell', 'ding', 'coin', 'jackpot', 'reels', 'glasswasher', 'hatch', 'record_scratch', 'roast', 'warn', 'bubble', 'popout', 'blink', 'cast', 'attack_in', 'pour', 'glass', 'clink', 'can', 'clack', 'clog']],
];
// a sound rendered to a buffer offline (the tests): through the same compressor as the speakers. Channel 0 is what
// comes out of the speakers, channel 1 the mix before the compressor
export function renderSound(name, { seconds = 4, rate = 22050, pitch = 1 } = {}) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OAC || !SOUNDS[name]) return Promise.resolve(null);
  const oc = new OAC(2, Math.ceil(seconds * rate), rate), was = { ctx, noiseBuf, pitchScale, _endT };
  const nb = oc.createBuffer(1, rate, rate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const comp = oc.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 6;
  const m = oc.createGain(); m.gain.value = 0.8; const merge = oc.createChannelMerger(2); m.connect(comp); comp.connect(merge, 0, 0); m.connect(merge, 0, 1); merge.connect(oc.destination);
  ctx = oc; noiseBuf = nb; pitchScale = pitch; _pv = 1; _endT = 0;
  try { SOUNDS[name](m, 0.005); } finally { ctx = was.ctx; noiseBuf = was.noiseBuf; pitchScale = was.pitchScale; _endT = was._endT; _pv = 1; }
  return oc.startRendering();
}
const NOVARY = new Set(['fanfare', 'sadviolin', 'trumpet', 'siu', 'jackpot', 'crewmate', 'anthem', 'combo', 'stageup', 'countdown', 'go', 'gamestart', 'award', 'victory', 'oneeighty', 'join', 'leave', 'ready', 'game_on', 'point', 'point_lose', 'cherry', 'keypad']);

// Tommy "speaks" in a smooth little babble while his speech bubble is up.
export function babble(pos, syllables = 8, pitch = 1) {
  if (!ctx || ctx.state !== 'running') return; if (hush) return;
  const d = out(pos, 0.25, true);
  let t = ctx.currentTime + 0.02;
  for (let i = 0; i < syllables; i++) {
    const f = (140 + Math.random() * 60) * pitch;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t);
    o.frequency.linearRampToValueAtTime(f * (0.85 + Math.random() * 0.3), t + 0.09);
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 900;
    const g = ctx.createGain(); env(g, t, 0.015, 0.6, 0.08);
    o.connect(flt); flt.connect(g); g.connect(d); o.start(t); o.stop(t + 0.15);
    t += 0.09 + Math.random() * 0.06 + (Math.random() < 0.15 ? 0.12 : 0);
  }
  _endT = t + 0.2; release(d);
}

// ---- LOCO MODE music: a short original mariachi-flavoured loop ----
let musicTimer = null;
const MELODY = [ // [semitones from D4, beats]
  [0, 1], [4, 1], [7, 1], [9, 0.5], [7, 0.5], [4, 1], [5, 1], [7, 2],
  [9, 1], [7, 1], [5, 1], [4, 0.5], [2, 0.5], [0, 1], [2, 1], [0, 2],
];
export function startLocoMusic(seconds) {
  if (!ctx || ctx.state !== 'running') return;
  stopLocoMusic();
  duckAmbience(true);
  musicGain.gain.cancelScheduledValues(ctx.currentTime);
  musicGain.gain.setValueAtTime(0.5, ctx.currentTime);
  const beat = 0.18;
  let t = ctx.currentTime + 0.05;
  const end = t + seconds;
  const schedule = () => {
    while (t < ctx.currentTime + 1 && t < end) {
      for (const [semi, beats] of MELODY) {
        if (t >= end) break;
        const f = 293.66 * Math.pow(2, semi / 12);
        tone(musicGain, t, 'sawtooth', f, f, beats * beat * 0.8, 0.12, 0.01);
        tone(musicGain, t, 'sawtooth', f * 1.26, f * 1.26, beats * beat * 0.8, 0.06, 0.01);
        // oom-pah bass
        tone(musicGain, t, 'triangle', f / 4, f / 4, beat * 0.4, 0.25, 0.005);
        t += beats * beat;
      }
    }
    if (t < end) musicTimer = setTimeout(schedule, 400);
  };
  schedule();
}
export function stopLocoMusic() {
  if (musicTimer) clearTimeout(musicTimer);
  musicTimer = null;
  if (ctx && musicGain) {
    duckAmbience(false);
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
  }
}

// ---------------------------------------------------------------------------
// Background sound for each place, all synthesised (no files):
//   shop       — bland, cheerful supermarket muzak (electric piano, bass, hats)
//                plus the odd "ding-dong" tannoy announcement
//   restaurant — slow fine-dining piano waltz with soft strings, cutlery clinks
//   pub        — quiet: a low murmur of voices, glasses clinking, the odd laugh
// ---------------------------------------------------------------------------
let ambKind = null, ambGain = null, ambTimer = null, ambNext = 0, ambBar = 0, ambListener = null, ambStarted = false, nextEvent = {};
export function setAmbience(kind, listenerFn) { ambKind = kind; ambListener = listenerFn; startAmbience(); }
function startAmbience() {
  if (!ctx || ambStarted || !ambKind || !['shop', 'restaurant'].includes(ambKind)) return;     // (no background noise in the pub: the music from the DJ booth is there instead)
  ambStarted = true;
  ambGain = ctx.createGain(); ambGain.gain.value = 0; ambGain.connect(BUS.ambience || master);
  ambGain.gain.setTargetAtTime(1, ctx.currentTime + 0.2, 1.5);    // fade in
  ambNext = ctx.currentTime + 0.3; ambBar = 0; nextEvent = { a: ctx.currentTime + 3, b: ctx.currentTime + 6, c: ctx.currentTime + 25 };
  if (ambKind === 'pub') pubMurmur();
  const tick = () => {
    if (ctx.state === 'running') { while (ambNext < ctx.currentTime + 1.2) ambNext = BAR[ambKind](ambNext); if (!hush) events(); }
    else ambNext = ctx.currentTime + 0.3;
    ambTimer = setTimeout(tick, 300);
  };
  tick();
}
// quieter while the LOCO MODE tune plays
function duckAmbience(on) { if (ambGain) ambGain.gain.setTargetAtTime(on ? 0.2 : 1, ctx.currentTime, 0.3); }

const hz = (semi, base = 261.63) => base * Math.pow(2, semi / 12);
function note(dest, t, type, f, dur, peak, attack = 0.01) { tone(dest, t, type, f, f, dur, peak, attack); }
function randAround(r0, r1) {
  const h = ambListener ? ambListener() : { x: 0, y: 1.6, z: 0 }, a = Math.random() * Math.PI * 2, r = r0 + Math.random() * (r1 - r0);
  return { x: h.x + Math.cos(a) * r, y: 1.2 + Math.random() * 0.5, z: h.z + Math.sin(a) * r };
}

// one bar of music each call; returns when the next bar starts
const SHOP_CHORDS = [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 7]];   // Cmaj7 Am7 Fmaj7 G
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
let melIdx = 3;
const WALTZ = [[5, 9, 12], [2, 5, 9], [-2, 2, 5], [0, 4, 7, 10]];                     // F Dm Bb C7
const BAR = {
  shop(t) {
    const beat = 0.54, ch = SHOP_CHORDS[ambBar++ % 4], d = ambGain;
    for (const s of ch) { note(d, t, 'sine', hz(s), 1.0, 0.03, 0.02); note(d, t, 'triangle', hz(s + 12), 0.6, 0.008, 0.02); }
    for (const s of ch.slice(1)) note(d, t + beat * 1.5, 'sine', hz(s), 0.7, 0.022, 0.02);
    note(d, t, 'triangle', hz(ch[0] - 24), 0.45, 0.11); note(d, t + beat * 2, 'triangle', hz(ch[0] - 17), 0.45, 0.09);
    for (let i = 0; i < 4; i++) noise(d, t + beat * (i + 0.5), 0.03, 'highpass', 7000, 0.7, 0.018, 0.002);
    for (let i = 0; i < 8; i++) if (Math.random() < 0.45) {
      melIdx = Math.max(0, Math.min(PENTA.length - 1, melIdx + Math.floor(Math.random() * 3) - 1));
      note(d, t + i * beat / 2, 'sine', hz(PENTA[melIdx] + 12), 0.28, 0.035, 0.01);
    }
    return t + beat * 4;
  },
  restaurant(t) {
    const beat = 0.68, ch = WALTZ[ambBar++ % 4], d = ambGain;
    note(d, t, 'triangle', hz(ch[0] - 12), 1.3, 0.07, 0.005);                        // bass note on 1
    for (const b of [1, 2]) for (const s of ch) note(d, t + beat * b, 'triangle', hz(s), 0.6, 0.02, 0.005);
    for (const s of ch.slice(0, 3)) { const o = tone(d, t, 'sawtooth', hz(s), hz(s), beat * 3, 0.006, 0.5); }   // soft strings
    const top = ch[(ambBar * 2) % ch.length] + 12;                                    // a slow tune over the top
    note(d, t, 'sine', hz(top + 12), beat * 2, 0.03, 0.03);
    if (Math.random() < 0.6) note(d, t + beat * 2, 'sine', hz(ch[(ambBar + 1) % ch.length] + 24), beat, 0.025, 0.03);
    return t + beat * 3;
  },
  pub(t) { return t + 1; },
};

// little background events: tannoy chimes, cutlery, clinking glasses, laughter, chatter
function events() {
  const now = ctx.currentTime;
  if (ambKind === 'shop' && now > nextEvent.c) {
    nextEvent.c = now + 50 + Math.random() * 40;
    note(ambGain, now + 0.05, 'sine', 784, 0.6, 0.12); note(ambGain, now + 0.45, 'sine', 622, 0.9, 0.12);      // ding-dong
    setTimeout(() => announce(SHOP_ANNOUNCEMENTS[Math.floor(Math.random() * SHOP_ANNOUNCEMENTS.length)]), 1300);
  }
  if ((ambKind === 'restaurant' || ambKind === 'pub') && now > nextEvent.a) {
    nextEvent.a = now + (ambKind === 'pub' ? 2.5 : 3.5) + Math.random() * 4;
    const p = randAround(3, 7), d = out(p, ambKind === 'pub' ? 0.22 : 0.14);
    tone(d, now + 0.02, 'triangle', 1700 + Math.random() * 600, 1650, 0.15, 0.25, 0.001);
    if (Math.random() < 0.5) tone(d, now + 0.12, 'triangle', 1900 + Math.random() * 500, 1850, 0.12, 0.18, 0.001);
    _endT = now + 0.4; release(d);
  }
  if (ambKind === 'pub' && now > nextEvent.b) {
    nextEvent.b = now + 0.9 + Math.random() * 1.8;
    if (Math.random() < 0.12) {        // someone laughs over by the bar
      const d = out(randAround(4, 8), 0.12);
      for (let i = 0; i < 4; i++) tone(d, now + i * 0.14, 'sine', 320 - i * 18, 280 - i * 18, 0.08, 0.5, 0.01);
      _endT = now + 0.8; release(d);
    } else babbleAt(randAround(3.5, 8), 0.07, 0.8 + Math.random() * 0.5);
  }
  if (ambKind === 'restaurant' && now > nextEvent.b) { nextEvent.b = now + 2 + Math.random() * 3; babbleAt(randAround(4, 8), 0.035, 0.9 + Math.random() * 0.4); }
}
function babbleAt(pos, vol, pitch) {
  const d = out(pos, vol); let t = ctx.currentTime + 0.02;
  for (let i = 0, n = 4 + Math.floor(Math.random() * 6); i < n; i++) {
    const f = (130 + Math.random() * 70) * pitch;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (0.85 + Math.random() * 0.3), t + 0.09);
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 700;
    const g = ctx.createGain(); env(g, t, 0.015, 0.6, 0.08);
    o.connect(flt); flt.connect(g); g.connect(d); o.start(t); o.stop(t + 0.15);
    t += 0.09 + Math.random() * 0.07;
  }
  _endT = t + 0.2; release(d);
}
// a constant low hum of a busy pub, gently rising and falling
function pubMurmur() {
  for (const [freq, vol, rate] of [[320, 0.05, 0.13], [800, 0.02, 0.21]]) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true; src.playbackRate.value = 0.6;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.9;
    const g = ctx.createGain(); g.gain.value = vol;
    const lfo = ctx.createOscillator(); lfo.frequency.value = rate; const lg = ctx.createGain(); lg.gain.value = vol * 0.5; lfo.connect(lg); lg.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(ambGain); src.start(); lfo.start();
  }
}
const SHOP_ANNOUNCEMENTS = [
  'Customer announcement. Would Ronnie please return the bakery to the bakery.',
  'Cleanup on aisle one. It was Ronnie. It is always Ronnie.',
  'Would the owner of a large trolley full of MONSTOR please move it. It is blocking the fire exit. And aisle four.',
  'Today only, all crisps half price. Ronnie, please put down the crisps.',
  'Colleague announcement. Oliver to the tills please. Oliver, stop filming the customers.',
  'Unexpected item in the bagging area. The item is Ronnie.',
];
function announce(text) {
  try {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text); u.rate = 1.0; u.pitch = 1.05; u.volume = 0.55;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

// ---- short tunes for attacks: Connor's Irish jig, Dylan's guitar ----
let tuneTimer = null;
export function playTune(kind, seconds) {
  if (!ctx || ctx.state !== 'running') return;
  if (tuneTimer) clearTimeout(tuneTimer);
  const d = ctx.createGain(); d.gain.value = 0.9; d.connect(BUS.music || master);
  const end = ctx.currentTime + seconds; let t = ctx.currentTime + 0.05, i = 0;
  const D = 293.66, hzS = (s) => D * Math.pow(2, s / 12);
  // jig: a fiddle in 6/8 over a bodhran; guitar: strummed G-D-Em-C, down-down-up-up-down
  // "The Irish Washerwoman" (traditional, 6/8), in G, semitones from D4; null = hold
  const JIG = [9, 5, 5, 0, 5, 5, 9, 5, 9, 12, 10, 9, 10, 7, 7, 2, 7, 7, 10, 7, 10, 14, 12, 10,
               9, 5, 5, 0, 5, 5, 9, 5, 9, 12, 10, 9, 10, 9, 10, 7, 12, 10, 9, 5, 5, 5, null, 12,
               9, 5, 5, 0, 5, 5, 9, 5, 9, 12, 10, 9, 10, 7, 7, 2, 7, 7, 10, 7, 10, 14, 12, 10,
               9, 5, 5, 0, 5, 5, 9, 5, 9, 12, 10, 9, 10, 9, 10, 7, 12, 10, 9, 5, 5, 5, null, null];
  const JIG_BASS = [5, 5, 7, 7, 5, 5, 0, 5];   // a bar (6 eighths) each: G G Am Am G G D G (offset below)
  const CH = [[-5, 2, 7, 11, 14, 19], [-10, -3, 2, 6, 9, 14], [-8, -3, 2, 7, 11, 14], [-9, -2, 2, 7, 10, 14]];
  const sched = () => {
    while (t < ctx.currentTime + 0.8 && t < end) {
      if (kind === 'jig') {
        const s = JIG[i % JIG.length], step = 0.115;
        if (s !== null) {
          const f = hzS(s + 12);
          // fiddle (bowed saw with vibrato) doubled by a tin whistle an octave up
          const o = tone(d, t, 'sawtooth', f, f, step * 0.95, 0.045, 0.012);
          const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5; const lg = ctx.createGain(); lg.gain.value = f * 0.008; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + step + 0.1);
          tone(d, t, 'sine', f * 2, f * 2, step * 0.8, 0.03, 0.008);
          if (i % 7 === 3) tone(d, t, 'sine', f * 2.2, f * 2, 0.04, 0.02, 0.002);        // a little whistle cut
        }
        const bar = Math.floor(i / 6) % 8, beat = i % 6;
        if (beat === 0 || beat === 3) {                                                   // bodhran: deep thump on the beats
          tone(d, t, 'sine', beat === 0 ? 95 : 80, 45, 0.14, 0.4); noise(d, t, 0.05, 'lowpass', 900, 1, 0.12, 0.002);
          const root = hzS(JIG_BASS[bar] - 24);                                            // guitar: root + chord stab
          tone(d, t, 'triangle', root, root, 0.25, 0.09, 0.005);
          for (const iv of [0, 4, 7]) tone(d, t + 0.01, 'triangle', root * 2 * Math.pow(2, (iv + (bar === 2 || bar === 3 ? -1 * (iv === 4) : 0)) / 12), root * 2, 0.18, 0.025, 0.004);
        } else if (beat === 5) noise(d, t, 0.03, 'bandpass', 2500, 2, 0.06, 0.002);       // rim tap
        t += step; i++;
      } else {
        const ch = CH[Math.floor(i / 5) % 4], pat = [0, 0.5, 1.25, 1.75, 2.5][i % 5], up = i % 5 === 2 || i % 5 === 3;
        const bar = Math.floor(i / 5) * 3.0 + ctx.currentTime * 0, tt = t;
        (up ? ch.slice().reverse() : ch).forEach((sm, k) => tone(d, tt + k * 0.012, 'triangle', hzS(sm), hzS(sm), 0.5, up ? 0.025 : 0.04, 0.003));
        const step = [0.5, 0.75, 0.5, 0.75, 0.5][i % 5] * 0.6;
        t += step; i++;
      }
    }
    if (t < end) tuneTimer = setTimeout(sched, 250); else tuneTimer = null;
  };
  sched();
}

// ---- real voice clips (ElevenLabs lines, see voices.js): decoded, then played from where the speaker stands, one
// line at a time per speaker (`key`)
const VPLAY = new Map();
export const audioCtx = () => ctx;
export function decodeClip(ab) { return ctx ? new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)) : Promise.resolve(null); }
// starts it now; returns how long it lasts (seconds)
export function playBuffer(buf, pos = null, vol = 1, key = null) {
  if (!ctx || !buf) return 0; if (hush && pos) return buf.duration; if (key) stopVoice(key);
  const src = ctx.createBufferSource(); src.buffer = buf; const g = out(pos, 1.6 * vol, true); src.connect(g); src.start();
  if (key) VPLAY.set(key, src);
  src.onended = () => { try { src.disconnect(); g.disconnect(); if (g._p) g._p.disconnect(); } catch (e) {} if (key && VPLAY.get(key) === src) VPLAY.delete(key); };
  return buf.duration;
}
export function stopVoice(key) { const s = VPLAY.get(key); if (s) { try { s.stop(); } catch (e) {} VPLAY.delete(key); } }

// ---- BOSS FIGHT music (boss.js): an original driving loop (drums, a pulsing bass, a minor-key riff), faster each phase
let bossTimer = null, bossOut = null;
export function bossMusic(on, phase = 1) {
  if (bossTimer) { clearTimeout(bossTimer); bossTimer = null; }
  if (bossOut) { const o = bossOut; bossOut = null; try { o.gain.setTargetAtTime(0, ctx.currentTime, 0.15); setTimeout(() => { try { o.disconnect(); } catch (e) {} }, 900); } catch (e) {} }
  if (!on || !ctx || !master) return;
  const d = ctx.createGain(); d.gain.value = 0.55; d.connect(master); bossOut = d;
  const bpm = [0, 132, 148, 164][phase] || 140, step = 60 / bpm / 2;      // eighth notes
  const A = 110, hz = (s) => A * Math.pow(2, s / 12);
  const BASS = [0, 0, 12, 0, 3, 0, 10, 0, 0, 0, 12, 0, 7, 5, 3, 2], RIFF = [12, null, 15, 12, null, 19, 17, 15, 12, null, 15, 17, 19, 22, 19, 17], RIFF3 = [24, 22, 19, 24, 22, 19, 17, 19, 24, 22, 19, 27, 26, 24, 22, 19];
  let t = ctx.currentTime + 0.08, i = 0;
  const sched = () => {
    if (bossOut !== d) return;
    while (t < ctx.currentTime + 0.6) {
      const b = i % 16;
      if (b % 4 === 0 || (phase >= 2 && b === 14)) { tone(d, t, 'sine', 120, 40, 0.16, 0.6, 0.002); noise(d, t, 0.03, 'lowpass', 1200, 1, 0.2, 0.001); }      // kick
      if (b % 8 === 4) { noise(d, t, 0.14, 'bandpass', 1900, 0.8, 0.35, 0.002); tone(d, t, 'triangle', 220, 180, 0.08, 0.12, 0.002); }      // snare
      noise(d, t, 0.025, 'highpass', 7000, 1, b % 2 ? 0.05 : 0.09, 0.001);      // hats
      const bs = BASS[b]; tone(d, t, 'sawtooth', hz(bs - 12), hz(bs - 12), step * 0.85, 0.07, 0.004); tone(d, t, 'square', hz(bs - 24), hz(bs - 24), step * 0.85, 0.05, 0.004);
      const rs = (phase >= 3 ? RIFF3 : RIFF)[b]; if (rs !== null && (phase >= 2 || Math.floor(i / 16) % 2 === 1)) tone(d, t, 'square', hz(rs), hz(rs), step * 0.7, 0.025, 0.004);
      t += step; i++;
    }
    bossTimer = setTimeout(sched, 200);
  };
  sched();
}

// say something out loud with the device's speech voice, if it has one
export function shout(text, { rate = 1, pitch = 1, volume = 0.8 } = {}) {
  try { if (!window.speechSynthesis || npcMute) return; const u = new SpeechSynthesisUtterance(text); u.rate = rate; u.pitch = pitch; u.volume = volume; window.speechSynthesis.speak(u); } catch (e) {}
}

// mute / unmute everything (pause menu)
export function setMuted(on) {
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(on ? 0 : 0.8, ctx.currentTime, 0.05);
}

// ---- WEATHER (weather.js drives it): rain hissing and pattering (drumming on the roof when you're in), wind and its
// gusts, hail clattering, thunder rolling in after the flash. All of it goes through one low-pass filter that closes
// right down indoors, so through the walls it's a muffled rumble. All made from noise, like everything else here.
let wx = null;
function wxSetup() {
  if (wx || !ctx || !master) return wx;
  const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const filt = (type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const gain = (v = 0) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const bus = gain(0), lp = filt('lowpass', 16000, 0.4); bus.connect(lp); lp.connect(master);
  const voice = (rate, ...nodes) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate; let a = s; for (const n of nodes) { a.connect(n); a = n; } const g = gain(0); a.connect(g); g.connect(bus); s.start(ctx.currentTime, Math.random() * 2.5); return g; };
  const windF = filt('bandpass', 420, 1.1), whistleF = filt('bandpass', 950, 9);
  wx = { buf, bus, lp, windF, whistleF, next: 0, last: {},
    rain: voice(1, filt('bandpass', 1900, 0.45)), sizzle: voice(1.13, filt('highpass', 5200, 0.6)), body: voice(0.71, filt('lowpass', 380, 0.7)),
    wind: voice(0.55, windF), whistle: voice(0.8, whistleF) };
  return wx;
}
// a single tick: a rain drop splatting close by, or a hailstone hitting something
function wxTick(t, f, peak, dur) {
  const s = ctx.createBufferSource(); s.buffer = wx.buf; s.playbackRate.value = 1.3 + Math.random();
  const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 2.5;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(b); b.connect(g); g.connect(wx.bus); s.start(t, Math.random() * 2.5); s.stop(t + dur + 0.02);
  s.onended = () => { try { s.disconnect(); b.disconnect(); g.disconnect(); } catch (e) {} };
}
// how much of each there is (0..1), and how far indoors you are (0 out in it .. 1 inside)
export function weatherSound({ rain = 0, heavy = 0, wind = 0, hail = 0, snow = 0, indoor = 0 } = {}) {
  if (!ctx || ctx.state !== 'running') return; if (!wx && rain + wind + hail < 0.02) return;
  const w = wxSetup(); if (!w) return;
  const now = ctx.currentTime, set = (k, node, v, tc = 0.4) => { if (Math.abs((w.last[k] ?? -1) - v) < 0.004) return; w.last[k] = v; node.setTargetAtTime(v, now, tc); };
  const out = 1 - indoor;
  set('bus', w.bus.gain, hush ? 0 : 1 - indoor * 0.3, 0.15);
  set('lp', w.lp.frequency, 16000 * Math.pow(650 / 16000, indoor), 0.25);
  set('rain', w.rain.gain, rain * 0.16 * (0.6 + 0.4 * out));
  set('sizzle', w.sizzle.gain, rain * 0.07 * out + hail * 0.05);
  set('body', w.body.gain, (heavy * 0.32 + rain * 0.06 + hail * 0.12) * (1 + indoor * 0.8));
  set('wind', w.wind.gain, wind * wind * 0.3 * (1 - snow * 0.3));
  set('whistle', w.whistle.gain, Math.max(0, wind - 0.55) * 0.05 * out);
  set('windf', w.windF.frequency, 260 + wind * 520, 0.8); set('whf', w.whistleF.frequency, 700 + wind * 700, 1.2);
  if (hush || indoor > 0.97) { w.next = now; return; }
  // close drops and hailstones, one at a time
  if (w.next < now) w.next = now;
  const rate = hail * 38 + rain * 16 * out;
  while (rate > 0.3 && w.next < now + 0.2) { const t = w.next; w.next += -Math.log(1 - Math.random() * 0.999) / rate;
    if (Math.random() * (hail + rain) < hail) wxTick(t, 2600 + Math.random() * 3000, (0.05 + Math.random() * 0.1) * out, 0.03 + Math.random() * 0.03);
    else wxTick(t, 3500 + Math.random() * 5000, (0.02 + Math.random() * 0.05) * out, 0.015 + Math.random() * 0.02); }
}
// thunder: dist 0 (right overhead: a crack, then a long roll) .. 1 (miles off: a low grumble)
export function thunder(dist = 0.5, indoor = 0, vol = 1) {
  if (!ctx || ctx.state !== 'running' || hush) return; const w = wxSetup(); if (!w) return;
  const t = ctx.currentTime + 0.02, near = 1 - dist, nodes = [], dur = 4 + dist * 3.5;
  const out = ctx.createGain(); out.gain.value = vol * (1 - indoor * 0.2); out.connect(w.bus); nodes.push(out);
  if (near > 0.45) { const s = ctx.createBufferSource(); s.buffer = w.buf; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1400; const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55 * near, t + 0.004); g.gain.exponentialRampToValueAtTime(0.05 * near, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + 0.5); nodes.push(s, f, g); }
  // the roll: low noise swelling and falling a few times as it echoes round
  { const s = ctx.createBufferSource(); s.buffer = w.buf; s.loop = true; s.playbackRate.value = 0.32 + Math.random() * 0.08;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 150 + near * 260; f.Q.value = 0.8; f.frequency.setTargetAtTime(90, t + 1, dur / 3);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); let k = t + 0.06 + dist * 0.25, pk = (0.5 + near * 0.6) * vol;
    g.gain.exponentialRampToValueAtTime(pk, k);
    while (k < t + dur - 0.5) { k += 0.35 + Math.random() * 0.9; pk *= 0.55 + Math.random() * 0.5; g.gain.exponentialRampToValueAtTime(Math.max(0.002, pk * (0.4 + Math.random() * 0.6)), k); }
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 2); s.stop(t + dur + 0.1); nodes.push(s, f, g); }
  // the thump you feel more than hear
  { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(58, t); o.frequency.exponentialRampToValueAtTime(28, t + 1.6);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.45 * near * vol + 0.02, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 1.9); nodes.push(o, g); }
  setTimeout(() => { for (const n of nodes) try { n.disconnect(); } catch (e) {} }, (dur + 0.6) * 1000);
}
