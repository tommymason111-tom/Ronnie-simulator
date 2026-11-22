// HOW TO PLAY PICTURES: every page picture of every game (the pic: names in menu.js) draws without an error, draws more
// than its background, and never asks the canvas for an emoji over 64px: an iPhone leaves those out of a canvas altogether
// (Prop Hunt's, the Boss Fight's, Imposter's and Free Roam's pages were blank boxes on an iPhone; headless Chrome draws
// them fine, so the size is what's checked)
import fs from 'fs';
import { launch, newPage, sleep, checker } from './lib/game.mjs';

export default async function () {
  const C = checker('howto'), b = await launch();
  const src = fs.readFileSync(new URL('../js/menu.js', import.meta.url), 'utf8');
  const pics = [...new Set([...src.matchAll(/pic: '([^']+)'/g)].map(m => m[1]))];
  C.ok(pics.length > 20, `only found ${pics.length} pictures in menu.js`);
  try {
    const p = await newPage(b, { width: 700, height: 500 });
    await p.goto('http://game.local/index.html?x=1', { timeout: 120000, waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__howto, null, { timeout: 60000 }); await sleep(500);
    const res = await p.evaluate((pics) => {
      const P = CanvasRenderingContext2D.prototype, ft = P.fillText; let big = [];
      P.fillText = function (t, ...a) { const px = parseFloat((this.font.match(/(\d+(?:\.\d+)?)px/) || [])[1]); if (/\p{Extended_Pictographic}/u.test(String(t)) && px > 64) big.push(`${t} at ${px}px`); return ft.call(this, t, ...a); };
      const out = [];
      for (const pic of pics) { big = []; const cv = document.createElement('canvas'); cv.width = 640; cv.height = 340; let err = null;
        const warn = console.warn; console.warn = (...a) => { err = a.join(' '); }; try { window.__howto.drawHowPic(cv, pic, { device: 'phone', squad: [] }); } finally { console.warn = warn; }
        // (more than the background: count the distinct colours across the middle)
        const d = cv.getContext('2d').getImageData(0, 0, 640, 340).data, cols = new Set(); for (let i = 0; i < d.length; i += 4 * 37) cols.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4));
        out.push({ pic, big: big.slice(0, 2), err, cols: cols.size }); }
      P.fillText = ft; return out; }, pics);
    for (const r of res) {
      C.ok(!r.err, `${r.pic}: drawing it failed: ${r.err}`);
      C.ok(!r.big.length, `${r.pic}: an emoji too big for an iPhone's canvas (it comes out blank): ${r.big.join(', ')}`);
      if (r.pic !== 'squad') C.ok(r.cols > 12, `${r.pic}: the picture is just its background (${r.cols} colours)`);
    }
    console.log(`  ${res.length} pictures drawn`);
    C.ok(!p.errors.length, 'page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
