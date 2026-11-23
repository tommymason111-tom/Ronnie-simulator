#!/usr/bin/env node
// Writes tools/voice_lines/narrator.json: everything the narrator says (js/narrator.js), for tools/voices.py:
//   node tools/narrator_lines.mjs && python3 tools/voices.py narrator nPczCjzI2devNBz1zQrb --emphasis
// (nPczCjzI2devNBz1zQrb: ElevenLabs' premade "Brian", a deep American man.) The lines:
//   - js/narration.js: his own lines (GET READY, the modes' calls, the end, a few asides)
//   - every *stage direction* in a character's line (datenight.js, dngames.js), narrated (narration.js lineParts)
//   - Date Night's narration (datenight.js narrate('...'): the ones with a name or a number worked out in play are left out)
//   - the attack cards (modes.js ATTACKS titles), the power-ups (powerups.js), and every banner whose words are fixed
//     (showBanner('...', '...') anywhere, and each mode's opening banner: its name and SHORT line in modes.js)
// The ids are the game's own (voices.js lineHash/cleanLine over the text as the game passes it); what ElevenLabs gets is
// that text in ordinary case (a banner's CAPITALS would be shouted).
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { gameHashers } from './ronnie_lines.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
function str(s, i) { const q = s[i]; let o = ''; for (let k = i + 1; k < s.length; k++) { const c = s[k]; if (c === '\\') { o += s[++k]; continue; } if (c === q) return [o, k + 1]; o += c; } throw new Error('unfinished string'); }
// narration.js (pure: no imports)
export function loadNarration() { const t = src('js/narration.js').replace(/export (const|function) /g, '$1 ').replace(/export \{[^}]*\};?/g, '') + '\nreturn { DIRECTIONS, NARRATION, splitLine, lineParts, joinBanner };'; return new Function(t)(); }
// the arguments of a call starting at s[i] (just after its '('): their source text
function args(s, i) { const out = []; let d = 0, cur = '', k = i;
  for (; k < s.length; k++) { const c = s[k];
    if (c === "'" || c === '"' || c === '`') { const [, n] = str(s, k); cur += s.slice(k, n); k = n - 1; continue; }
    if (c === '(' || c === '[' || c === '{') d++; else if (c === ')' || c === ']' || c === '}') { if (d === 0) break; d--; }
    if (c === ',' && d === 0) { out.push(cur.trim()); cur = ''; continue; } cur += c; }
  out.push(cur.trim()); return out; }
// what a bit of source can be when it's fixed text: 'x' -> ['x'], c ? 'x' : 'y' -> ['x', 'y'], anything else -> null
function literal(a) { a = a.trim();
  if (a[0] === "'" || a[0] === '"') { try { const [v, n] = str(a, 0); if (n === a.length) return [v]; } catch (e) {} }
  const t = /^[^?'"`]+\?\s*('(?:[^'\\]|\\.)*')\s*:\s*('(?:[^'\\]|\\.)*')$/.exec(a); if (t) return [str(t[1], 0)[0], str(t[2], 0)[0]];
  return null; }
const SKIP = /ALREADY ASKED|ASKED THE HOST|NEWER VERSION|DEVELOPER|·|^Y:|PLAYER$|^YOU ARE NOW$|MENU BUTTON|\(/;      // (and nothing with an (aside) in it: said aloud it's a stage direction)
// the game's narrator.js clean2: a banner part, its full stop dropped
const clean2 = (cleanLine, t) => { const c = cleanLine(String(t || '')); return c ? c.replace(/[.!?]+$/, '') + (/[!?]$/.test(c) ? c.slice(-1) : '') : null; };
// ordinary case for something written in CAPITALS (names kept)
const NAMES = ['Ronnie', 'Tommy', 'Chloe', 'Lewis', 'Harry', 'Aidan', 'Noah', 'Oliver', 'Dylan', 'Connor', 'Ethan', 'Ian', 'Alfie', 'Ben', 'Lidl', 'Oysterfleet', 'Ronaldo', 'Oasis', 'Pepsi', 'Max', 'Irish', 'Turkey', 'Lewy', 'Liam', 'Gallagher', 'Chester', 'Guinness'];
export function ordinary(t) {
  const letters = t.replace(/[^A-Za-z]/g, ''); if (!letters || letters.replace(/[^A-Z]/g, '').length / letters.length < 0.7) return t;
  let o = t.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bi\b/g, 'I').replace(/\b([ab])\b(?= or| and|$|[.!?])/g, (m) => m.toUpperCase());
  for (const n of NAMES) o = o.replace(new RegExp('\\b' + n.toLowerCase() + '\\b', 'g'), n);
  o = o.replace(/\bAidan w\b/g, 'Aidan W').replace(/\b2p\b/g, '2P');
  return o; }

export function narratorLines() {
  const { cleanLine } = gameHashers(), { NARRATION, lineParts, joinBanner } = loadNarration(), out = [];
  const add = (text, kind) => { if (text && /[A-Za-z]/.test(text)) out.push([text, kind]); };
  for (const l of Object.values(NARRATION).flat()) add(l, 'own');
  // stage directions in anyone's lines, and Date Night's narration
  for (const f of ['js/datenight.js', 'js/dngames.js']) { const s = src(f);
    for (let i = 0; i < s.length; i++) { if (s[i] !== "'") continue; let v, n; try { [v, n] = str(s, i); } catch (e) { break; } if (/\*[a-z][^*]*\*/.test(v)) add(lineParts(v).dir, 'dir'); i = n - 1; }
    let m; const re = /\bnarrate\(/g; while ((m = re.exec(s))) { const a = args(s, m.index + m[0].length)[0] || ''; const l = literal(a); if (l) l.forEach(x => add(x, 'story'));
      else if (/^R\(\[/.test(a)) { const inner = a.slice(3, -2); for (const p of args(inner, 0)) { const x = literal(p); if (x) x.forEach(y => add(y, 'story')); } }
      else if (/^\w+ \? /.test(a)) { const x = literal(a); if (x) x.forEach(y => add(y, 'story')); } } }
  // the attack cards
  const md = src('js/modes.js'); { const a = md.indexOf('const ATTACKS = {'), b = md.indexOf('\n};', a); for (const m of md.slice(a, b).matchAll(/title: '((?:[^'\\]|\\.)*)'/g)) add(str("'" + m[1] + "'", 0)[0].replace(/!+$/, '') + '!', 'card'); }
  // the power-ups (powerups.js narratorPower)
  const pu = src('js/powerups.js'); for (const m of pu.matchAll(/name: '((?:[^'\\]|\\.)*)'[^\n]*?line: '((?:[^'\\]|\\.)*)'/g)) { const name = str("'" + m[1] + "'", 0)[0], line = str("'" + m[2] + "'", 0)[0]; add(name.charAt(0) + name.slice(1).toLowerCase() + '! ' + line.charAt(0) + line.slice(1).toLowerCase(), 'card'); }
  // banners with fixed words, anywhere
  const banner = (A, B) => { const a = A && A.filter(x => !SKIP.test(x)), b = B && B.filter(x => !SKIP.test(x));
    if (a && b) { for (const x of a) for (const y of b) { const p = clean2(cleanLine, x), q = clean2(cleanLine, y); if (p && q) add(joinBanner(p, q), 'card'); } }
    else for (const x of a || b || []) { const p = clean2(cleanLine, x); if (p) add(p, 'card'); } };
  for (const f of fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js'))) { const s = src('js/' + f); let m; const re = /showBanner\(/g;
    while ((m = re.exec(s))) { const [a, b] = args(s, m.index + m[0].length); if (/^`?STAGE/.test(a || '')) continue; banner(literal(a || ''), literal(b || '')); } }
  // each mode's opening banner (modes.js: showBanner(m.name, SHORT[id] || 'EAT EVERYTHING'))
  { const sh = md.slice(md.indexOf('const SHORT = {')), shEnd = sh.indexOf('};'), S = {}; for (const m of sh.slice(0, shEnd).matchAll(/(\w+): '((?:[^'\\]|\\.)*)'/g)) S[m[1]] = str("'" + m[2] + "'", 0)[0];
    const mo = md.slice(md.indexOf('export const MODES = {')); for (const m of mo.slice(0, mo.indexOf('\n};')).matchAll(/^\s+(\w+):\s+\{ name: (['"])((?:[^\\]|\\.)*?)\2/gm)) { if (m[1] === 'boss') continue; banner([m[3].replace(/\\'/g, "'")], [S[m[1]] || 'EAT EVERYTHING']); } }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { lineHash, cleanLine } = gameHashers(), out = [], seen = new Set();
  const TAG = { own: '', dir: '', story: '', card: '[excited]' };
  for (const [l, kind] of narratorLines()) { const c = cleanLine(l); if (!c) continue; const h = lineHash(c); if (seen.has(h)) continue; seen.add(h); out.push({ h, t: ordinary(c), tag: TAG[kind] ?? '' }); }
  fs.writeFileSync(path.join(ROOT, 'tools/voice_lines/narrator.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(`narrator: ${out.length} lines, ${out.reduce((n, l) => n + l.t.length, 0)} characters -> tools/voice_lines/narrator.json`);
}
