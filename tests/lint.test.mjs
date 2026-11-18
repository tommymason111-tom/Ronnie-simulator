// Static checks on every game file: names that don't exist, assigning to constants, duplicate keys, impossible
// comparisons, code that can never run (rules in eslint.config.mjs). Plus every file must at least parse.
import { ESLint } from 'eslint';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ROOT, checker } from './lib/game.mjs';

export default async function () {
  const C = checker('lint');
  const eslint = new ESLint({ cwd: ROOT, overrideConfigFile: path.join(ROOT, 'tests/eslint.config.mjs') });
  const res = await eslint.lintFiles(['js/**/*.js']);
  for (const r of res) for (const m of r.messages) C.ok(false, `${path.relative(ROOT, r.filePath)}:${m.line} ${m.ruleId || ''} ${m.message}`);
  for (const f of ['server/worker.js', ...fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f)]) {
    try { execFileSync(process.execPath, ['--check', path.join(ROOT, f)], { stdio: 'pipe' }); } catch (e) { C.ok(false, `${f} doesn't parse: ${String(e.stderr).split('\n').slice(0, 3).join(' ')}`); }
  }
  return C.fails;
}
