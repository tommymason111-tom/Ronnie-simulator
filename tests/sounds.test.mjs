// SOUND EFFECTS: every sound is real, good and its own.
//   - every sound name the game plays (sfx('...'), the attacks' sounds, the snacks' bites, the emotes' sounds, the
//     sound mix's test sounds...) exists in audio.js
//   - every sound renders (offline, through the same compressor as the speakers) without throwing: not silent, not
//     clipping after the compressor, not too loud going into it, not absurdly long; and plays in a real page too
//   - no two sounds sound the same: every pair is further apart (spectrum + loudness over time) than a sound is from
//     another play of itself (the pitch wobble and the noise make no two plays identical)
//   - one sound for one kind of action: a sound used in more than one place (a job, a file) has to be a shared UI
//     sound (tap, error...) or listed in RELATED below with why those uses are the same thing. Give a new kind of
//     action its own sound in js/audio.js rather than borrowing one
// Also prints how many places use each sound (SHOW=1 for the full list).
import fs from 'fs';
import path from 'path';
import { launch, newPage, startGame, checker, ROOT } from './lib/game.mjs';

// interface sounds: the same tap for every button is right
const UI = new Set(['tap', 'toggle', 'error', 'tick', 'notify']);
// sounds shared on purpose: the places they may be used in (a file, or impgames.js:<job kind>), and why it's the same
const RELATED = {
  flip: { why: 'a burger flipped on a grill (the Imposter grill job, Ian at his barbecue)', in: ['impgames.js:grill', 'bbqmode.js'] },
  warn: { why: 'a warning: someone\'s about to catch you (Ian closing in, Chloe turning round)', in: ['bbqmode.js', 'datenight.js', 'dngames.js'] },
  victory: { why: 'winning: the Imposter game, seeing Ian off for good', in: ['imposter.js', 'bbqmode.js'] },
  attack_in: { why: 'an attack coming for you (the squad\'s attack card, Ian\'s force-feed)', in: ['modes.js', 'bbqmode.js'] },
  reel_stop: { why: 'a fruit machine reel stopping (the Imposter fruit machine job, Prop Hunt\'s prop reel)', in: ['impgames.js:reels', 'prophunt.js'] },
  whistle_ref: { why: 'a referee\'s whistle (a round starting or stopping)', in: ['main.js', 'prophunt.js'] },
  kill: { why: 'a kill: as it happens, and the same kill in the end-of-game replay', in: ['imposter.js', 'impreplay.js'] },
  fixed: { why: 'a job or a step of one finished', in: ['impgames.js:Panel', 'imposter.js', 'pubjobs.js'] },
  spill: { why: 'a drink or water overflowing', in: ['impgames.js:hold', 'impgames.js:wine', 'impgames.js:water'] },
  gas_hiss: { why: 'gas let out of a keg', in: ['impgames.js:crank', 'impgames.js:dial', 'impgames.js:coupler'] },
  pour: { why: 'a pint pouring', in: ['barstations.js', 'impgames.js:hold'] },
  glass: { why: 'glasses knocking together: collecting empties, a glass landing, cheers, Date Night\'s pints shuffled about', in: ['impgames.js:whack', 'pubjobs.js', 'main.js', 'modes.js', 'emotes.js', 'datenight.js', 'dngames.js'] },
  game_on: { why: 'a pub game (darts, ping pong) starting', in: ['darts.js', 'pingpong.js'] },
  plate_down: { why: 'food put down on a plate', in: ['impgames.js:grill', 'modes.js', 'datenight.js'] },
  clack: { why: 'something clicking into place', in: ['barstations.js', 'emotes.js'] },
  smash: { why: 'something smashed to bits (a telly, a controller)', in: ['main.js', 'emotes.js'] },
  land: { why: 'a thing dropped on the floor', in: ['main.js', 'emotes.js'] },
  burp: { why: 'a burp / a hiccup', in: ['emotes.js'] },
  jackpot: { why: 'a pay-out: the fruit machine, the tip jar passing another £10', in: ['main.js', 'impgames.js:reels', 'tipjar.js'] },
  plunger: { why: 'the plunger in the toilet', in: ['impgames.js:plunge', 'runpub.js'] },
  shatter: { why: 'a glass breaking', in: ['impgames.js:stacker', 'runpub.js', 'main.js'] },
  breaker: { why: 'the fuse box breaker', in: ['impgames.js:switches', 'runpub.js'] },
  lightsout: { why: 'the lights going out (Imposter sabotage, Run the Pub fuse)', in: ['imposter.js', 'runpub.js'] },
  hit_soft: { why: 'a material impact: anything soft hitting something', in: '*' },
  hit_cardboard: { why: 'a material impact: anything cardboard (a loo roll) hitting something', in: '*' },
  hit_wood: { why: 'a material impact', in: '*' }, hit_metal: { why: 'a material impact', in: '*' }, hit_glass: { why: 'a material impact', in: '*' },
  hit_plastic: { why: 'a material impact', in: '*' }, hit_ceramic: { why: 'a material impact', in: '*' },
  sadviolin: { why: 'the comic womp-womp when you lose or let yourself down', in: ['darts.js', 'pingpong.js', 'imposter.js', 'runpub.js', 'modes.js', 'emotes.js', 'prophunt.js', 'datenight.js'] },
  fanfare: { why: 'winning a pub game (darts, ping pong, a Prop Hunt round), a big emote finish', in: ['darts.js', 'pingpong.js', 'emotes.js', 'prophunt.js'] },
  gamestart: { why: 'a game starting', in: ['modes.js', 'boss.js'] },
  coin: { why: 'the till: money in (Run the Pub, the shop), the fruit machine paying', in: ['runpub.js', 'modes.js', 'main.js', 'emotes.js'] },
  bell: { why: 'the service bell on the kitchen hatch', in: ['runpub.js'] },
  ding: { why: 'a drink ready / a yes', in: ['barstations.js', 'emotes.js', 'mixui.js', 'datenight.js', 'dngames.js'] },
  alarm: { why: 'an alarm going off (Imposter, Date Night\'s fire alarm)', in: ['imposter.js', 'datenight.js'] },
  aww: { why: 'a crowd groaning', in: ['runpub.js', 'imposter.js'] },
  cheer: { why: 'a crowd cheering', in: ['runpub.js', 'emotes.js', 'boss.js', 'prophunt.js', 'bbqmode.js', 'datenight.js', 'dngames.js'] },
  anthem: { why: 'a terrace chant', in: ['runpub.js', 'emotes.js'] },
  sizzle: { why: 'the barbecue', in: ['modes.js', 'squad.js', 'emotes.js', 'bbqmode.js'] },
  fizz: { why: 'a fizzy drink: the soda gun, the Pepsi attack', in: ['barstations.js', 'modes.js'] },
  psst: { why: 'a can cracked open', in: ['main.js', 'modes.js', 'emotes.js'] },
  clap: { why: 'clapping', in: ['modes.js', 'emotes.js'] },
  kiss: { why: 'a kiss', in: ['modes.js', 'emotes.js'] },
  strum: { why: 'a guitar', in: ['modes.js', 'emotes.js', 'mixui.js'] },
  siu: { why: 'SIUUU', in: ['modes.js', 'emotes.js'] },
  powerdown: { why: 'a power going off (a power-up running out, Chloe\'s diet)', in: ['powerups.js', 'modes.js'] },
  plane: { why: 'a plane', in: ['modes.js', 'emotes.js'] },
  whistle: { why: 'a wolf whistle', in: ['modes.js', 'emotes.js'] },
  shutter: { why: 'a camera', in: ['modes.js', 'emotes.js', 'dngames.js'] },
  chomp: { why: 'eating', in: ['main.js', 'ronnieHero.js', 'emotes.js', 'mixui.js', 'datenight.js', 'dngames.js'] },
  crunch: { why: 'eating', in: ['main.js', 'emotes.js'] }, munch: { why: 'eating', in: ['main.js'] },
  gulp: { why: 'swallowing', in: ['main.js', 'ronnieHero.js', 'modes.js', 'emotes.js', 'bbqmode.js', 'dngames.js'] },
  slurp: { why: 'drinking', in: ['main.js', 'emotes.js'] },
  pop: { why: 'a pop: a mouthful finished, a bubble popped', in: ['main.js', 'modes.js', 'emotes.js'] },
  bleurgh: { why: 'veg: disgusting', in: ['main.js', 'modes.js', 'bbqmode.js'] },
  trumpet: { why: 'a ta-daa: a ton at darts, Mango Loco', in: ['main.js', 'darts.js'] },
  thwack: { why: 'a swat / a hit', in: ['main.js', 'mpsync.js', 'emotes.js', 'bbqmode.js', 'dngames.js'] },
  thud: { why: 'a dull thud: blocked, landed', in: ['main.js', 'modes.js', 'emotes.js'] },
  splat: { why: 'food hitting someone (Tommy, a player, the boss)', in: ['main.js', 'mpsync.js', 'boss.js'] },
  punch: { why: 'a punch landing', in: ['main.js', 'mpsync.js', 'runpub.js', 'bbqmode.js', 'boss.js'] },
  slap: { why: 'a slap', in: ['main.js', 'mpsync.js', 'emotes.js', 'bbqmode.js'] },
  throw: { why: 'something thrown', in: ['main.js', 'character.js', 'mpsync.js'] },
  whoosh: { why: 'something flying past', in: ['tommy.js', 'mpsync.js', 'emotes.js', 'datenight.js'] },
  boing: { why: 'a cartoon spring (Dylan leaping out of the bin or into Date Night, Noah bouncing off Big Ronnie, emotes)', in: ['squad.js', 'modes.js', 'mpsync.js', 'emotes.js', 'datenight.js'] },
  ting: { why: 'a sparkle (Tommy\'s teeth)', in: ['tommy.js', 'emotes.js'] },
  grunt: { why: 'a grunt', in: ['emotes.js', 'bbqmode.js', 'dngames.js'] }, rustle: { why: 'a crisp packet / a carrier bag', in: ['main.js', 'mixui.js'] },
  reels: { why: 'the fruit machine reels spinning', in: ['main.js', 'prophunt.js'] },
  dn_smooth: { why: 'Date Night: got away with it (a film won, a smooth ACT NATURAL)', in: ['datenight.js', 'dngames.js'] },
  crowd_ooh: { why: 'a crowd going "ooh" (a big moment in the replay, the whole restaurant watching on Date Night)', in: ['impreplay.js', 'datenight.js', 'dngames.js'] },
  flush: { why: 'a toilet flushing (the plunger job, Chloe in the loo on Date Night)', in: ['impgames.js:plunge', 'datenight.js', 'dngames.js'] },
  sprint: { why: 'legging it (sprint on, Date Night\'s dash round the restaurant)', in: ['main.js', 'datenight.js'] },
};
const ALLOW_SIMILAR = [];      // pairs allowed to sound alike: none

// ---- every sound name the game plays, and where
function scan() {
  const dir = path.join(ROOT, 'js'), files = [...fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => 'js/' + f), ...fs.readdirSync(path.join(dir, 'levels')).filter(f => f.endsWith('.js')).map(f => 'js/levels/' + f)];
  const uses = [];      // { name, file, line, ctx }
  const lits = (s) => [...s.replace(/[!=]==? *'[^']*'/g, '').matchAll(/'([a-z0-9_]+)'/g)].map(m => m[1]);      // (not the 'x' in a === 'x' ? ...)
  for (const f of files) {
    if (f === 'js/audio.js') continue;
    const base = path.basename(f), lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n');
    let ctx = base, inGames = false;
    lines.forEach((L, i) => {
      if (base === 'impgames.js') { const g = L.match(/^ {2}([a-z]+)\((o = \{\})?\) \{/), top = L.match(/^(?:export )?(?:class|const|function) (\w+)/);      // (each job's game is its own place)
        if (top) { ctx = 'impgames.js:' + top[1]; inGames = /GAMES$/.test(top[1]); } else if (g && inGames) ctx = 'impgames.js:' + g[1]; }
      const add = (name) => uses.push({ name, file: f, line: i + 1, ctx });
      // sfx('name', ...) and sfx(a ? 'x' : 'y', ...): the first argument's literals
      for (const m of L.matchAll(/\bsfx\(/g)) { let d = 0, j = m.index + 4, arg = ''; for (; j < L.length; j++) { const c = L[j]; if (c === '(' || c === '[') d++; else if (c === ')' || c === ']') { if (!d) break; d--; } else if (c === ',' && !d) break; arg += c; } lits(arg).forEach(add); }
      for (const m of L.matchAll(/\bsfx: *'([a-z0-9_]+)'/g)) add(m[1]);                                        // the attacks' sounds
      if (/SNACK_SFX = \{/.test(L)) lits(L.split('{')[1]).forEach(add);                                         // the snacks' bites
      if (base === 'mixui.js' && /const TEST = \{/.test(L)) lits(L).forEach(add);                               // the mix's test sounds
      for (const m of L.matchAll(/\[([^\]]*)\]\.includes\(m\.n\)/g)) lits(m[1]).forEach(add);                   // sounds other players can send
      if (base === 'emotes.js') for (const m of L.matchAll(/\bsay\([^;]*?,\s*null,\s*([^()]*?)\)/g)) lits(m[1]).forEach(add);   // emote sounds
    });
  }
  return uses;
}

export default async function () {
  const C = checker('sounds'), uses = scan(), b = await launch();
  try {
    const p = await newPage(b, { width: 640, height: 400 });
    await p.goto('http://game.local/version.json');
    const used = [...new Set(uses.map(u => u.name))];
    const r = await p.evaluate(async ({ used }) => {
      const A = await import('./js/audio.js');
      const out = { names: A.SOUND_NAMES, missing: used.filter(n => !A.hasSound(n)), groups: A.SOUND_GROUPS, f: {}, throws: [] };
      // ---- a little FFT for the spectrum
      const N = 1024, cosT = new Float32Array(N / 2), sinT = new Float32Array(N / 2); for (let i = 0; i < N / 2; i++) { cosT[i] = Math.cos(2 * Math.PI * i / N); sinT[i] = -Math.sin(2 * Math.PI * i / N); }
      const fft = (re, im) => { for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
        for (let len = 2; len <= N; len <<= 1) { const h = len >> 1, st = N / len; for (let i = 0; i < N; i += len) for (let k = 0; k < h; k++) { const c = cosT[k * st], s = sinT[k * st], a = i + k, bb = a + h, tr = re[bb] * c - im[bb] * s, ti = re[bb] * s + im[bb] * c; re[bb] = re[a] - tr; im[bb] = im[a] - ti; re[a] += tr; im[a] += ti; } } };
      const SR = 32000, BANDS = 24, edges = Array.from({ length: BANDS + 1 }, (_, i) => 50 * Math.pow(12000 / 50, i / BANDS)), ENV = 60, EF = 0.04, SG_T = 24, SG_B = 12, SG_DT = 0.05;      // (spectrum, loudness over time, and a coarse spectrogram: 12 bands x 50ms for 1.2s)
      const db = (v) => Math.max(-60, 10 * Math.log10(v + 1e-12));
      const feats = (buf) => {
        const x = buf.getChannelData(0), raw = buf.getChannelData(1); let peak = 0, rawPeak = 0, last = 0, ss = 0;
        for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a; const q = Math.abs(raw[i]); if (q > rawPeak) rawPeak = q; if (a > 0.003) last = i; ss += x[i] * x[i]; }
        const spec = new Float64Array(BANDS), sg = new Float64Array(SG_T * SG_B), re = new Float32Array(N), im = new Float32Array(N);
        for (let s0 = 0; s0 + N <= Math.max(N, last + N) && s0 + N <= x.length; s0 += N / 2) { for (let i = 0; i < N; i++) { re[i] = x[s0 + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)); im[i] = 0; } fft(re, im);
          for (let k = 1; k < N / 2; k++) { const hz = k * SR / N, p = re[k] * re[k] + im[k] * im[k]; for (let bnd = 0; bnd < BANDS; bnd++) if (hz >= edges[bnd] && hz < edges[bnd + 1]) { spec[bnd] += p; const ti = Math.floor(s0 / SR / SG_DT); if (ti < SG_T) sg[ti * SG_B + (bnd >> 1)] += p; break; } } }
        const sdb = [...spec].map(db), smax = Math.max(...sdb), env = [];
        for (let e = 0; e < ENV; e++) { let s = 0; const a = Math.floor(e * EF * SR), z = Math.floor((e + 1) * EF * SR); for (let i = a; i < z && i < x.length; i++) s += x[i] * x[i]; env.push(db(s / (z - a))); }
        const emax = Math.max(...env), gdb = [...sg].map(db), gmax = Math.max(...gdb);
        return { peak, rawPeak, dur: last / SR, rms: Math.sqrt(ss / Math.max(1, last)), spec: sdb.map(v => Math.max(0, (v - smax + 60) / 60)), env: env.map(v => Math.max(0, (v - emax + 60) / 60)), sg: gdb.map(v => Math.max(0, (v - gmax + 50) / 50)) };
      };
      // three plays of each, with the same three dice rolls for every sound (so a run is repeatable: the pitch wobble and
      // the noise are the same each time the test runs)
      const rnd = Math.random, seeded = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
      const play = async (n, k) => { Math.random = seeded(k * 7919); try { return A.renderSound(n, { rate: SR }); } finally { Math.random = rnd; } };
      for (const n of A.SOUND_NAMES) { try { out.f[n] = []; for (let k = 1; k <= 3; k++) out.f[n].push(feats(await play(n, k))); } catch (e) { out.throws.push(n + ': ' + e.message); } }
      // and every one through the real speakers' chain, as the game plays them (no throwing, nothing left behind)
      A.initAudio(); try { await A.audioCtx().resume(); } catch (e) {} out.state = A.audioCtx() && A.audioCtx().state;
      for (const n of A.SOUND_NAMES) { try { A.sfx(n, null, 0.01); A.sfx(n, { x: 3, y: 1, z: 2 }, 0.01); } catch (e) { out.throws.push('live ' + n + ': ' + e.message); } }
      return out;
    }, { used });

    // ---- names
    C.ok(!r.missing.length, `sounds the game plays that don't exist in audio.js: ${r.missing.map(n => `${n} (${uses.filter(u => u.name === n).map(u => u.file.slice(3) + ':' + u.line).join(', ')})`).join('; ')}`);
    C.ok(!r.throws.length, `sounds that throw: ${r.throws.slice(0, 5).join(' | ')}`);
    const grouped = new Set(r.groups.flatMap(g => g[1])); C.ok([...grouped].every(n => r.names.includes(n)), `the sound board lists sounds that don't exist: ${[...grouped].filter(n => !r.names.includes(n)).join(', ')}`);

    // ---- quality
    const md = (x, y) => { let s = 0; for (let i = 0; i < x.length; i++) s += Math.abs(x[i] - y[i]); return s / x.length; };
    const dist = (a, b) => md(a.spec, b.spec) + md(a.env, b.env) + md(a.sg, b.sg);
    let maxRaw = ['', 0];
    for (const [n, [f]] of Object.entries(r.f)) {
      C.ok(f.peak > 0.02 && f.rms > 0.003, `${n} is (nearly) silent: peak ${f.peak.toFixed(3)} rms ${f.rms.toFixed(4)}`);
      C.ok(f.peak <= 1.0, `${n} clips after the compressor: peak ${f.peak.toFixed(2)}`);
      C.ok(f.rawPeak <= 2.2, `${n} goes into the compressor far too hot: ${f.rawPeak.toFixed(2)} (keep it under 2.2)`);
      C.ok(f.dur <= 3.6, `${n} lasts ${f.dur.toFixed(1)}s`);
      if (f.rawPeak > maxRaw[1]) maxRaw = [n, f.rawPeak];
    }
    // ---- no two alike
    const names = Object.keys(r.f), self = {}, D = (a, c) => { let s = 0, k = 0; for (const x of r.f[a]) for (const y of r.f[c]) if (x !== y) { s += dist(x, y); k++; } return s / k; };
    for (const n of names) self[n] = D(n, n);      // (how far apart three plays of the same sound are)
    const alike = []; let closest = [null, 9];
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      const a = names[i], c = names[j]; if (ALLOW_SIMILAR.some(([x, y]) => (x === a && y === c) || (x === c && y === a))) continue;
      const d = D(a, c), need = (self[a] + self[c]) / 2 * 1.3 + 0.05;
      if (d < need) alike.push(`${a} ~ ${c} (${d.toFixed(3)} < ${need.toFixed(3)})`);
      if (d - need < closest[1]) closest = [`${a} ~ ${c} ${d.toFixed(3)} (needs ${need.toFixed(3)})`, d - need];
    }
    if (process.env.DEBUG) { const L = names.map(n => [n, r.f[n][0].rms, r.f[n][0].peak]).sort((a, b) => a[1] - b[1]); console.log('loudness (rms/peak):', L.map(([n, v, pk]) => `${n} ${v.toFixed(3)}/${pk.toFixed(2)}`).join(', ')); }
    if (process.env.DEBUG) { console.log('self:', names.map(n => [n, self[n]]).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([n, v]) => n + ' ' + v.toFixed(3)).join(', ')); console.log(alike.join('\n')); }
    C.ok(!alike.length, `${alike.length} pairs of sounds sound the same: ${alike.slice(0, 12).join(', ')}`);

    // ---- one sound, one kind of action
    const by = {}; for (const u of uses) (by[u.name] = by[u.name] || []).push(u);
    for (const [n, us] of Object.entries(by)) {
      const ctxs = [...new Set(us.map(u => u.ctx))]; if (ctxs.length < 2 || UI.has(n)) continue;
      const rel = RELATED[n];
      if (!rel) { C.ok(false, `'${n}' is used for different things (${us.map(u => u.ctx.replace(/\.js/, '') + ':' + u.line).join(', ')}): give each its own sound, or list it in RELATED with why they're the same`); continue; }
      if (rel.in === '*') continue;
      const extra = ctxs.filter(c => !rel.in.includes(c)); C.ok(!extra.length, `'${n}' (${rel.why}) is also used in ${extra.join(', ')}: give that its own sound, or add it to RELATED if it's the same thing`);
    }
    const rows = Object.entries(by).map(([n, us]) => [n, us.length, new Set(us.map(u => u.ctx)).size]).sort((a, b) => b[1] - a[1]);
    console.log(`  ${r.names.length} sounds, ${used.length} used from ${uses.length} places (live context: ${r.state}); loudest into the compressor: ${maxRaw[0]} ${maxRaw[1].toFixed(2)}; closest pair: ${closest[0]}`);
    console.log('  most used: ' + rows.slice(0, process.env.SHOW ? 999 : 14).map(([n, k, c]) => `${n} ${k}${c > 1 ? '/' + c : ''}`).join(', ') + (process.env.SHOW ? '' : ' ... (SHOW=1 for all)'));
    const unused = r.names.filter(n => !by[n]); if (unused.length) console.log(`  not played anywhere yet (${unused.length}): ${unused.join(', ')}`);
    C.ok(!p.errors.length, 'page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));

    // ---- the developer mode sound board, on a phone: every sound listed, the search finds them, a tap plays one
    const q = await newPage(b, { width: 390, height: 844, mobile: true });
    await startGame(q, { place: 'grid', mode: 'roam', dev: true });
    const board = await q.evaluate(async () => {
      const panel = document.getElementById('dev-panel'); if (!panel) return { none: true };
      if (!panel.classList.contains('on')) document.getElementById('dev-btn').click();
      panel.querySelector('[data-tab="sounds"]').click();
      const all = panel.querySelectorAll('[data-snd]').length, s = panel.querySelector('.dv-search');
      s.value = 'hit_'; s.dispatchEvent(new Event('input', { bubbles: true }));
      const shown = [...panel.querySelectorAll('[data-snd]')].filter(x => x.style.display !== 'none');
      const A = await import('./js/audio.js'); shown[0] && shown[0].click(); const played = !!A.audioCtx();
      const r = panel.getBoundingClientRect();
      return { all, names: A.SOUND_NAMES.length, shown: shown.map(x => x.dataset.snd), played, fits: r.left >= 0 && r.right <= innerWidth + 1, wide: panel.querySelector('.dv-body').scrollWidth > panel.querySelector('.dv-body').clientWidth + 1 };
    });
    if (process.env.SHOT_DIR) { await q.evaluate(() => { const s = document.querySelector('#dev-panel .dv-search'); s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); }); await q.screenshot({ path: process.env.SHOT_DIR + '/sound-board.png' }).catch(() => {}); }
    C.ok(!board.none, 'no developer panel in developer mode');
    C.ok(board.all >= board.names, `the sound board lists ${board.all} of ${board.names} sounds`);
    C.ok(board.shown && board.shown.length === 7 && board.shown.every(n => n.startsWith('hit_')), `searching the sound board for "hit_" shows ${JSON.stringify(board.shown)}`);
    C.ok(board.played, 'tapping a sound on the board didn\'t start the audio');
    C.ok(board.fits && !board.wide, `the sound board doesn't fit a phone: ${JSON.stringify({ fits: board.fits, wide: board.wide })}`);
    C.ok(!q.errors.length, 'sound board page errors: ' + [...new Set(q.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
