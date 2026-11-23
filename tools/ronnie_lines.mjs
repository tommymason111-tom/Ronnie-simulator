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
export function ronnieLines() {
  const lines = [];
  const { RONNIE_LINES } = loadData(); for (const l of Object.values(RONNIE_LINES).flat()) lines.push(l);
  // Date Night: what he says in the films
  const dn = src('js/datenight.js'); const re = /this\.line\((this\.ron|r),\s*/g; let m;
  while ((m = re.exec(dn))) for (const l of strings(dn, m.index + m[0].length)) lines.push(l);
  { const k = dn.indexOf("ex.pick || { line: "); if (k > 0) lines.push(str(dn, k + 19)[0]); }      // (no excuse picked)
  const dg = src('js/dngames.js'); const re2 = /label: '(?:[^'\\]|\\.)*', line: /g; while ((m = re2.exec(dg))) lines.push(str(dg, m.index + m[0].length)[0]);
  // squad.js: a Ronnie body's own banks
  const sq = src('js/squad.js'), r0 = sq.indexOf('  ronnie: {'), r1 = sq.indexOf('\n  },', r0), rb = sq.slice(r0, r1), b = rb.indexOf('banks: {');
  if (b > 0) { const seg = rb.slice(b, rb.indexOf('}', b)); for (const mm of seg.matchAll(/\[([^\]]*)\]/g)) { let k = 0; const t = mm[1]; while ((k = t.indexOf("'", k)) >= 0) { const [v, n] = str(t, k); lines.push(v); k = n; } } }
  return [...new Set(lines)];
}
// js/ronnielines.js is plain data: read it without a browser
function loadData() { const t = src('js/ronnielines.js').replace(/export const /g, 'const ').replace(/$/, '\nreturn { RONNIE_LINES };'); return new Function(t)(); }
// what's said out loud: the *stage directions* left out
export const spoken = (t) => t.replace(/\*[^*]*\*/g, ' ').replace(/\s+/g, ' ').replace(/^\s*[.,]\s*/, '').trim();

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { lineHash, cleanLine } = gameHashers(), out = [], seen = new Set();
  for (const l of ronnieLines()) { const c = cleanLine(l); if (!c) continue; const h = lineHash(c); if (seen.has(h)) continue; seen.add(h); const t = spoken(c); if (t && /[A-Za-z]/.test(t)) out.push({ h, t }); }
  fs.writeFileSync(path.join(ROOT, 'tools/voice_lines/ronnie.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(`ronnie: ${out.length} lines, ${out.reduce((n, l) => n + l.t.length, 0)} characters -> tools/voice_lines/ronnie.json`);
}
