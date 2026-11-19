// LOADING SCREEN: going into a game ticks off its steps (the squad, the place, the food, GO) and then goes away;
// it wears the place's colours and the mode's card; the tip changes every few seconds; its animations only move
// things (so they keep going while the level is built); and it fits a phone and a computer with nothing cut off.
import { launch, newPage, startGame, checker, sleep } from './lib/game.mjs';

export default async function () {
  const C = checker('loading'), b = await launch(), dir = process.env.SHOT_DIR || '/tmp';
  try {
    // a real game: the steps it reached, and the screen gone at the end
    const p = await newPage(b, { width: 390, height: 844, mobile: true });
    await p.addInitScript(() => { window.__steps = []; const iv = setInterval(() => { const ls = document.getElementById('loadscreen'); if (ls && ls.dataset.step && __steps[__steps.length - 1] !== ls.dataset.step) __steps.push(ls.dataset.step); }, 5); setTimeout(() => clearInterval(iv), 600000); });
    await startGame(p, { place: 'pub', mode: 'everyone' }); await sleep(1500);
    const real = await p.evaluate(() => ({ steps: window.__steps, on: document.getElementById('loadscreen').classList.contains('on') }));
    console.log('  steps in a real load: ' + real.steps.join(' > ') + (real.on ? ' (STILL SHOWING)' : ''));
    C.ok(real.steps.includes('go') && real.steps.includes('place') && !real.on, `the loading steps didn't run through to GO and go away: ${JSON.stringify(real)}`);
    await p.evaluate(() => RS.renderer.setAnimationLoop(null));      // (the 3D behind it, drawn in software, holds up screenshots)
    // each layout, phone and computer, a few places and modes
    for (const [w, h, mob] of [[390, 844, true], [1280, 720, false], [844, 390, true]]) {
      await p.setViewportSize({ width: w, height: h });
      for (const [place, mode] of [['pub', 'imposter2'], ['shop', 'sweep'], ['restaurant', 'chonkoff2']]) {
        const r = await p.evaluate(async ({ place, mode }) => {
          window.__lsShow(place, mode); window.__ls('place'); await new Promise(r => setTimeout(r, 600));
          const ls = document.getElementById('loadscreen'), vw = innerWidth, vh = innerHeight, bad = [];
          for (const el of ls.querySelectorAll('.lscard, .lsp, .lschips b, .lssteps li, .lsh, .lsbar, .lst')) { const q = el.getBoundingClientRect();
            if (q.width && (q.left < -1 || q.right > vw + 1 || q.top < -1 || q.bottom > vh + 1)) bad.push(el.className + ' off screen'); if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') bad.push(el.className + ' cut off'); }
          const anims = new Set(); for (const a of document.getAnimations()) { if (!ls.contains(a.effect.target)) continue; for (const k of a.effect.getKeyframes()) for (const prop in k) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(prop)) anims.add(prop); }
          const tip0 = document.getElementById('ls-hint').textContent; await new Promise(r => setTimeout(r, 3700)); const tip1 = document.getElementById('ls-hint').textContent;
          return { bad, props: [...anims], tipChanged: tip0 !== tip1, place: document.getElementById('ls-place').textContent, ac: getComputedStyle(ls).getPropertyValue('--ac').trim(), chips: ls.querySelectorAll('.lschips b').length, step: ls.dataset.step };
        }, { place, mode });
        await p.screenshot({ path: `${dir}/loading-${w}x${h}-${place}.png`, timeout: 120000, animations: 'disabled' });
        C.ok(!r.bad.length, `${w}x${h} ${place}/${mode}: ${r.bad.join(', ')}`);
        C.ok(r.props.every(k => ['transform', 'opacity'].includes(k)), `${w}x${h}: loading animations move more than transform/opacity (they'd freeze while the level builds): ${r.props}`);
        C.ok(place === 'pub' || !r.place.includes('OYSTERFLEET'), `${place}: the loading screen shows the wrong place: ${r.place}`);
        C.ok(r.tipChanged, `${place}: the tip didn't change`);
        C.ok(r.chips >= 2 && r.ac && r.place.length > 5, `${place}/${mode}: no mode card on the loading screen: ${JSON.stringify(r)}`);
        await p.evaluate(() => document.getElementById('loadscreen').classList.remove('on'));
      }
    }
    C.ok(!p.errors.length, 'page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
