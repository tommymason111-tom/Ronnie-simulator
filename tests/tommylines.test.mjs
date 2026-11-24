// WHAT TOMMY SAYS FITS WHAT'S GOING ON:
//   - Tommy's a Chelsea fan (like Ronnie): no line of his has a go at Chelsea (static: every Tommy line in the game)
//   - in Run the Pub (all three nights) Ronnie's behind the bar, so Tommy's digs are about his bar work: none of his lines
//     there (whatever he's saying: chatter, greeting, waiting, hit, slapped, Ronnie eating or drinking, going up a size)
//     mention his weight or the gym, and the squad's chatter there is about the pub too
//   - the new lines are listed for voice clips (tools/voice_lines/tommy.json) with the same id the game looks them up by
import fs from 'fs';
import path from 'path';
import { launch, newPage, startGame, checker, ROOT } from './lib/game.mjs';

const GYM_WEIGHT = /\b(gym|weigh\w*|fat\w*|chins?|belly|bellies|huge|massive|enormous|abs|six-pack|diet\w*|calorie\w*|protein|sit-ups?|work ?out|bulk\w*|xxl|size|big man|big lad|obes\w*|pounds|stone|fridge|buffet|gravity|panorama|earthquake|postcode and weather|waist\w*)\b/i;
// (the squad's own running jokes stay (Lewis and his protein shakes): for them, just no digs at Ronnie's size)
const SQUAD_RX = /\b(fat\w*|chins?|belly|bellies|huge|massive|enormous|diet\w*|calorie\w*|xxl|big lad|obes\w*)\b/i;
const CHELSEA = /chelsea|stamford|\bblues\b|the blues|cole palmer/i;
const ANTI = /(rubbish|useless|worst|hate|bottl|sack|relegat|twelfth|joke|embarrass|of course you support|like the cheese|plays in blue\. like|shambles|pathetic|flop|disgrace)/i;

// every line Tommy has, wherever it's written down (read from the files, not run: some need a browser)
async function tommyLines() {
  const js = (f) => fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
  const { BANKS, STAGE_LINES } = await import(path.join(ROOT, 'js/dialogue.js'));
  const { MODE_LINES, MODE_BANKS } = await import(path.join(ROOT, 'js/modelines.js'));
  const out = [...Object.values(BANKS).flatMap(b => b.lines), ...Object.values(STAGE_LINES), ...Object.values(MODE_LINES.tommy || {}).flat(), ...Object.values(MODE_BANKS.tommy || {}).flatMap(g => Object.values(g).flat())];
  const strs = (src) => [...src.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, '\''));
  out.push(...strs(js('tommy.js')).filter(s => s.length > 12 && / /.test(s)));
  { const b = js('boss.js'), i = b.indexOf('\n  tommy: {'), j = b.indexOf('\n};', i); if (i > 0) out.push(...strs(b.slice(i, j)).filter(s => / /.test(s))); }
  return out;
}

export default async function () {
  const C = checker('tommylines');
  // ---- no Tommy line has a go at Chelsea
  const all = await tommyLines();
  C.ok(all.length > 150, `only found ${all.length} Tommy lines: the search is broken`);
  for (const l of all) if (CHELSEA.test(l)) C.ok(!ANTI.test(l), `Tommy insults Chelsea (he's a Chelsea fan): "${l}"`);
  // ---- Run the Pub: his banks there are about the bar, never his weight or the gym
  const { MODE_BANKS, MODE_LINES, STRICT, modeGroup } = await import(path.join(ROOT, 'js/modelines.js'));
  const rp = MODE_BANKS.tommy && MODE_BANKS.tommy.runpub;
  C.ok(rp && ['greet', 'chatter', 'idle', 'eat', 'drink', 'hit', 'slap', 'stage'].every(k => rp[k] && rp[k].length >= 3), `Tommy's Run the Pub banks are missing some (${rp ? Object.keys(rp) : 'none'})`);
  C.ok(rp && rp.chatter.length >= 25, `Tommy needs plenty of bar digs in Run the Pub (${rp && rp.chatter.length})`);
  for (const m of ['runpub', 'runpub1', 'runpub3']) C.ok(modeGroup(m) === 'runpub' && STRICT.has('runpub'), `${m} isn't counted as Run the Pub for the lines`);
  for (const l of Object.values(rp || {}).flat()) C.ok(!GYM_WEIGHT.test(l), `Tommy's Run the Pub line about weight or the gym: "${l}"`);
  for (const l of Object.values(MODE_LINES).flatMap(g => g.runpub || [])) C.ok(!SQUAD_RX.test(l), `a Run the Pub line about Ronnie's size: "${l}"`);
  // ---- every new line of Tommy's is down for a voice clip, by the id voices.js looks it up with
  { const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/voice_lines/tommy.json'), 'utf8')), have = new Set(list.map(l => l.h));
    const clean = (t) => String(t).replace(/[^\p{L}\p{N}\p{P}\p{Zs}£$€%&+=@#]/gu, '').replace(/\s+/g, ' ').trim();
    const hash = (t) => { const s = String(t).trim().replace(/\s+/g, ' '); let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
    const missing = Object.values(rp || {}).flat().filter(l => !have.has(hash(clean(l))));
    C.ok(!missing.length, `Tommy's Run the Pub lines not in tools/voice_lines/tommy.json (no clip can be made): ${missing.slice(0, 3).join(' | ')}`); }

  // ---- in the game: what Tommy (and the squad) actually say behind the bar
  const b = await launch();
  try {
    const p = await newPage(b, { width: 390, height: 844, mobile: true });
    await startGame(p, { place: 'pub', mode: 'runpub' });
    const r = await p.evaluate(([src, sq]) => { const RX = new RegExp(src, 'i'), SQ = new RegExp(sq, 'i'); RS.renderer.setAnimationLoop(null); RS.sim(2);
      const t = RS.tommy, said = [], bad = [];
      for (const bank of ['greet', 'chatter', 'idle', 'eat', 'drink', 'hit', 'slap']) for (let i = 0; i < 60; i++) { const l = t.line(bank); if (l) said.push(l); if (l && RX.test(l)) bad.push(bank + ': ' + l); }
      const squad = []; for (const c of RS.cast) if (c !== t && c.line) for (let i = 0; i < 30; i++) { const l = c.line('chatter'); if (l && SQ.test(l)) squad.push(c.id + ': ' + l); }
      // a size up while behind the bar: the line that goes with it
      const sz = []; const s0 = t.say.bind(t); t.say = (x, pri) => { sz.push(x); return true; }; RS.addChonk && RS.addChonk(400); RS.sim(0.5); t.say = s0;
      return { mode: RS.director.mode, n: said.length, bad, squad, sz: sz.filter(x => typeof x === 'string' && RX.test(x)) }; }, [GYM_WEIGHT.source, SQUAD_RX.source]);
    C.ok(r.mode === 'runpub' && r.n > 300, `Run the Pub: Tommy didn't say his lines (${r.mode}, ${r.n})`);
    C.ok(!r.bad.length, `Run the Pub: Tommy on Ronnie's weight / the gym: ${r.bad.slice(0, 3).join(' | ')}`);
    C.ok(!r.squad.length, `Run the Pub: the squad on Ronnie's weight / the gym: ${r.squad.slice(0, 3).join(' | ')}`);
    C.ok(!r.sz.length, `Run the Pub: Tommy's line when Ronnie goes up a size: ${r.sz.join(' | ')}`);
    // ...and outside Run the Pub he's his usual self (the mode lines haven't taken over everywhere)
    const r2 = await p.evaluate(() => { RS.newGame('everyone'); RS.sim(1); const t = RS.tommy, s = new Set(); for (let i = 0; i < 200; i++) s.add(t.line('chatter')); return { mode: RS.director.mode, gym: [...s].some(l => /gym|abs/i.test(l || '')) }; });
    C.ok(r2.gym, `outside Run the Pub Tommy's usual digs have gone (${r2.mode})`);
    C.ok(!p.errors.length, 'page errors: ' + p.errors.slice(0, 3).join(' | '));
    await p.context().close();
  } finally { await b.close(); }
  return C.fails;
}
