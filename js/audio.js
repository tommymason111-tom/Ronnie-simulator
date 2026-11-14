// Procedural sound effects with the Web Audio API — no audio files to download.
// Every sound is synthesised from oscillators and a shared noise buffer, so the
// game loads instantly and costs almost nothing on the Quest.

let ctx = null;
let master = null;
let noiseBuf = null;
let musicGain = null;
let pitchScale = 1;            // eating sounds get deeper as Ronnie grows

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12; comp.ratio.value = 6;
  master = ctx.createGain(); master.gain.value = 0.8;
  master.connect(comp); comp.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = 0.0; musicGain.connect(master);
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
function out(pos, vol = 1) {
  const g = ctx.createGain(); g.gain.value = vol;
  if (pos) {
    const p = ctx.createPanner();
    p.panningModel = 'equalpower'; p.distanceModel = 'inverse';
    p.refDistance = 1; p.rolloffFactor = 0.6;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; }
    else p.setPosition(pos.x, pos.y, pos.z);
    g.connect(p); p.connect(master);
  } else g.connect(master);
  return g;
}

function env(g, t, a, peak, dec) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
}

function noise(dest, t, dur, type, freq, q, peak, attack = 0.005) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  src.playbackRate.value = 0.7 + Math.random() * 0.6;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); env(g, t, attack, peak, dur);
  src.connect(f); f.connect(g); g.connect(dest);
  src.start(t, Math.random() * 0.5); src.stop(t + attack + dur + 0.05);
  return f;
}

function tone(dest, t, type, f0, f1, dur, peak, attack = 0.005) {
  const o = ctx.createOscillator(); o.type = type;
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
  sadviolin(d, t) {   // Chloe's guilt bonus: a sad little falling melody
    [[659, 0], [622, 0.3], [587, 0.6], [523, 0.9]].forEach(([f, dt]) => {
      const o = tone(d, t + dt, 'sawtooth', f, f * 0.98, 0.35, 0.12, 0.05);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 6; const lg = ctx.createGain(); lg.gain.value = 6; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t + dt); lfo.stop(t + dt + 0.45);
    });
  },
  thud(d, t) { tone(d, t, 'sine', 90, 40, 0.12, 0.5); noise(d, t, 0.06, 'lowpass', 500, 1, 0.3); },
  shutter(d, t) { noise(d, t, 0.03, 'highpass', 3000, 1, 0.5, 0.001); noise(d, t + 0.06, 0.04, 'bandpass', 2000, 2, 0.4, 0.001); },
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
};

export function sfx(name, pos = null, vol = 1) {
  if (!ctx || ctx.state !== 'running' || !SOUNDS[name]) return;
  SOUNDS[name](out(pos, vol), ctx.currentTime + 0.005);
}

// Tommy "speaks" in a smooth little babble while his speech bubble is up.
export function babble(pos, syllables = 8, pitch = 1) {
  if (!ctx || ctx.state !== 'running') return;
  const d = out(pos, 0.25);
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
  if (!ctx || ambStarted || !ambKind || !['shop', 'restaurant', 'pub'].includes(ambKind)) return;
  ambStarted = true;
  ambGain = ctx.createGain(); ambGain.gain.value = 0; ambGain.connect(master);
  ambGain.gain.setTargetAtTime(1, ctx.currentTime + 0.2, 1.5);    // fade in
  ambNext = ctx.currentTime + 0.3; ambBar = 0; nextEvent = { a: ctx.currentTime + 3, b: ctx.currentTime + 6, c: ctx.currentTime + 25 };
  if (ambKind === 'pub') pubMurmur();
  const tick = () => {
    if (ctx.state === 'running') { while (ambNext < ctx.currentTime + 1.2) ambNext = BAR[ambKind](ambNext); events(); }
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
  }
  if (ambKind === 'pub' && now > nextEvent.b) {
    nextEvent.b = now + 0.9 + Math.random() * 1.8;
    if (Math.random() < 0.12) {        // someone laughs over by the bar
      const d = out(randAround(4, 8), 0.12);
      for (let i = 0; i < 4; i++) tone(d, now + i * 0.14, 'sine', 320 - i * 18, 280 - i * 18, 0.08, 0.5, 0.01);
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
  const d = ctx.createGain(); d.gain.value = 0.9; d.connect(master);
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

// say something out loud with the device's speech voice, if it has one
export function shout(text, { rate = 1, pitch = 1, volume = 0.8 } = {}) {
  try { if (!window.speechSynthesis) return; const u = new SpeechSynthesisUtterance(text); u.rate = rate; u.pitch = pitch; u.volume = volume; window.speechSynthesis.speak(u); } catch (e) {}
}

// mute / unmute everything (pause menu)
export function setMuted(on) {
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(on ? 0 : 0.8, ctx.currentTime, 0.05);
}
