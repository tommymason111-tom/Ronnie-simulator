// Runs the tests: node run.mjs (all of them) or node run.mjs server ragdoll ... (just those). Each test file exports
// default async () => [list of failures]. Exit code 1 if anything failed.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const want = process.argv.slice(2);
const files = fs.readdirSync(HERE).filter(f => f.endsWith('.test.mjs') && (!want.length || want.some(w => f.startsWith(w)))).sort();
let failed = 0;
for (const f of files) {
  const t0 = Date.now(); let fails;
  try { fails = await (await import(path.join(HERE, f))).default(); } catch (e) { fails = ['CRASHED: ' + (e.stack || e).toString().slice(0, 800)]; }
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  if (fails.length) { failed++; console.log(`FAIL ${f} (${secs}s)`); for (const x of fails) console.log('   - ' + x); }
  else console.log(`ok   ${f} (${secs}s)`);
}
console.log(failed ? `\n${failed} of ${files.length} test files failed` : `\nall ${files.length} test files passed`);
process.exit(failed ? 1 : 0);
