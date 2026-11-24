#!/usr/bin/env node
// Writes tools/voice_lines/ronnie.json: every line Ronnie says in the game, for tools/voices.py to make his clips.
//   node tools/ronnie_lines.mjs            (then: python3 tools/voices.py ronnie "Ronnie")
// The lines: js/ronnielines.js (his own lines, ronnie.js), plus what he says in Date Night's films (datenight.js: every
// this.line(this.ron / r, ...)), his excuses there (dngames.js EXCUSES) and his squad.js banks (a Ronnie body getting hit).
// The ids are worked out with the game's own lineHash/cleanLine (taken from js/voices.js, so they always match), over
// the line as the game shows it; the text sent to ElevenLabs drops the *stage directions* (they're shown, not said).
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// the game's own lineHash and cleanLine (voices.js), so the ids are exactly what the game looks up
export function gameHashers() {
  const v = src('js/voices.js');
  const grab = (name) => { const i = v.indexOf('export function ' + name); if (i < 0) throw new Error('no ' + name + ' in voices.js'); let d = 0, j = v.indexOf('{', i);
    for (let k = j; k < v.length; k++) { if (v[k] === '{') d++; else if (v[k] === '}' && --d === 0) return v.slice(i + 7, k + 1); } throw new Error('unfinished ' + name); };
  return new Function(grab('lineHash') + '\n' + grab('cleanLine') + '\nreturn { lineHash, cleanLine };')();
}
// a single-quoted JS string starting at s[i] -> [value, index after it]
function str(s, i) { let o = ''; for (let k = i + 1; k < s.length; k++) { const c = s[k]; if (c === '\\') { const n = s[++k]; o += n === 'n' ? '\n' : n; continue; } if (c === "'") return [o, k + 1]; o += c; } throw new Error('unfinished string'); }
// the string(s) at s[i]: 'text' or R(['a', 'b'])
function strings(s, i) { while (s[i] === ' ') i++;
  if (s[i] === "'") return [str(s, i)[0]];
  if (s.startsWith('R([', i)) { const out = []; let k = i + 3; for (;;) { while (/[\s,]/.test(s[k])) k++; if (s[k] !== "'") break; const [v, n] = str(s, k); out.push(v); k = n; } return out; }
  return []; }
export function ronnieLines(withKinds = false) {
  const lines = [], kind = new Map(), add = (l, k) => { lines.push(l); if (!kind.has(l)) kind.set(l, k); };
  const { RONNIE_LINES } = loadData(); for (const [k, list] of Object.entries(RONNIE_LINES)) for (const l of list) add(l, k);
  // Date Night: what he says in the films
  const dn = src('js/datenight.js'); const re = /this\.line\((this\.ron|r),\s*/g; let m;
  while ((m = re.exec(dn))) for (const l of strings(dn, m.index + m[0].length)) add(l, 'film');
  { const k = dn.indexOf("ex.pick || { line: "); if (k > 0) add(str(dn, k + 19)[0], 'excuse'); }      // (no excuse picked)
  const dg = src('js/dngames.js'); const re2 = /label: '(?:[^'\\]|\\.)*', line: /g; while ((m = re2.exec(dg))) add(str(dg, m.index + m[0].length)[0], 'excuse');
  // squad.js: a Ronnie body's own banks
  const sq = src('js/squad.js'), r0 = sq.indexOf('  ronnie: {'), r1 = sq.indexOf('\n  },', r0), rb = sq.slice(r0, r1), b = rb.indexOf('banks: {');
  if (b > 0) { const seg = rb.slice(b, rb.indexOf('}', b)); for (const mm of seg.matchAll(/\[([^\]]*)\]/g)) { let k = 0; const t = mm[1]; while ((k = t.indexOf("'", k)) >= 0) { const [v, n] = str(t, k); add(v, 'hit'); k = n; } } }
  const u = [...new Set(lines)]; return withKinds ? u.map(l => [l, kind.get(l)]) : u;
}
// how each kind of line is said (ElevenLabs v3's audio tags, before the line: the voice acts it, it isn't read out)
export function tagFor(kind, t) {
  const k = String(kind || '');
  if (/^(date\.(away|sneak)|imposter\.imp|prophunt\.hider)$/.test(k)) return '[whispers]';
  if (/^(date\.caught|sweep\.caught|excuse)$/.test(k)) return '[nervous]';
  if (/^(hit|knocked|boss\.hurt|prophunt\.hit|snd\.die|bbq\.(force|forced)|eat\.veg|runpub\.(wrong|walkout))/.test(k)) return '[frustrated]';
  if (/^(rip|lose|boss\.lose|date\.lose)$/.test(k)) return '[sad]';
  if (/^(date\.(sweet|start|win|back))$/.test(k)) return '[happy]';
  if (/^(idle|runpub\.idle|sweep\.idle|film)$/.test(k)) return t.includes('!') ? '[excited]' : '[mischievously]';
  return t.includes('!') ? '[excited]' : '[happy]';
}
// js/ronnielines.js is plain data: read it without a browser
function loadData() { const t = src('js/ronnielines.js').replace(/export const /g, 'const ').replace(/$/, '\nreturn { RONNIE_LINES };'); return new Function(t)(); }
// what's said out loud: the *stage directions* left out
// what's said out loud: the *stage directions* left out (the narrator says those: js/narration.js lineParts, the
// same split the game makes, so the ids match what character.js asks for)
export const spoken = (t) => { const n = new Function(src('js/narration.js').replace(/export (const|function) /g, '$1 ') + '\nreturn { lineParts };')(); return n.lineParts(t).say; };

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { lineHash, cleanLine } = gameHashers(), out = [], seen = new Set();
  for (const [l, k] of ronnieLines(true)) { const c = cleanLine(spoken(l)); if (!c || !/[A-Za-z]/.test(c)) continue; const h = lineHash(c); if (seen.has(h)) continue; seen.add(h); out.push({ h, t: c, tag: tagFor(k, c) }); }
  fs.writeFileSync(path.join(ROOT, 'tools/voice_lines/ronnie.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(`ronnie: ${out.length} lines, ${out.reduce((n, l) => n + l.t.length, 0)} characters -> tools/voice_lines/ronnie.json`);
}
