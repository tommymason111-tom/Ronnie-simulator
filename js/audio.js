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
  thud(d, t) { tone(d, t, 'sine', 90, 40, 0.12, 0.5); noise(d, t, 0.06, 'lowpass', 500, 1, 0.3); },
  clink(d, t) { tone(d, t, 'triangle', 1800 + Math.random() * 400, 1700, 0.15, 0.2, 0.001); },
};

export function sfx(name, pos = null, vol = 1) {
  if (!ctx || ctx.state !== 'running' || !SOUNDS[name]) return;
  SOUNDS[name](out(pos, vol), ctx.currentTime + 0.005);
}

// Tommy "speaks" in a smooth little babble while his speech bubble is up.
export function babble(pos, syllables = 8) {
  if (!ctx || ctx.state !== 'running') return;
  const d = out(pos, 0.25);
  let t = ctx.currentTime + 0.02;
  for (let i = 0; i < syllables; i++) {
    const f = 140 + Math.random() * 60;
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
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
  }
}
