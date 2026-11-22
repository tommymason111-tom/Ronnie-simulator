// EACH MODE SHOWS WHAT IT NEEDS (phone): the buttons (SUPERMARKET SWEEP grabs into the trolley, so no EAT or THROW;
// RUN THE PUB has no food, so no EAT until there's a drink or the soda gun in your hand; BOSS FIGHT's big button is
// THROW) and the top-left box (the eat meter with the mode's own chips under it, or a box of its own for SWEEP and
// BOSS FIGHT). And the popups: the pause menu fades in and out, and the game can be tapped straight after.
import { launch, newPage, startGame, sleep, checker } from './lib/game.mjs';

const MODES = [
  ['pub', 'everyone', { eat: true, thr: true, chips: /EATEN/ }],      // (the attack countdown is the red bar at the top on a phone)
  ['shop', 'sweep', { eat: false, thr: false, box: /TROLLEY/ }],
  ['garden', 'bbq', { eat: true, thr: true, chips: /IAN/ }],
  ['restaurant', 'date', { eat: true, thr: false, chips: /EAT NOW|LOOKING/ }],      // (sat at the table: no throwing, no joystick)
  ['bedroom', 'chonkoff', { eat: true, thr: true, chips: /EATEN/ }],
  ['pub', 'runpub', { eat: false, thr: false }],
  ['pub', 'roam', { eat: true, thr: true, chips: /EATEN/ }],
  ['garden', 'boss', { eat: true, thr: true, big: 'throw' }],
  ['shop', 'snd', { eat: false, thr: false, box: /❤/ }],      // (SEARCH AND DESTROY: guns only; its box is your health, armour, ammo and perks)
];

export default async function () {
  const C = checker('modeui'), b = await launch();
  try {
    for (const [place, mode, want] of MODES) {
      const p = await newPage(b, { width: 844, height: 390, mobile: true });
      try {
        await startGame(p, { place, mode }); await sleep(800);
        const r = await p.evaluate(() => { RS.renderer.setAnimationLoop(null); for (let i = 0; i < 300; i++) RS.sim(1 / 30);
          const vis = (id) => getComputedStyle(document.getElementById(id)).display !== 'none', sz = (id) => document.getElementById(id).getBoundingClientRect().width;
          const x = RS.hudExtras(); return { eat: vis('btn-eat'), thr: vis('btn-throw'), eatW: sz('btn-eat'), thrW: sz('btn-throw'), extras: x ? JSON.stringify(x) : null }; });
        C.ok(r.eat === want.eat, `${mode}: EAT ${r.eat ? 'shown' : 'hidden'} (want ${want.eat ? 'shown' : 'hidden'})`);
        C.ok(r.thr === want.thr, `${mode}: THROW ${r.thr ? 'shown' : 'hidden'} (want ${want.thr ? 'shown' : 'hidden'})`);
        if (want.chips) C.ok(r.extras && /"chips"/.test(r.extras) && want.chips.test(r.extras), `${mode}: top-left box chips ${r.extras}`);
        if (want.box) C.ok(r.extras && /"box"/.test(r.extras) && want.box.test(r.extras), `${mode}: no box of its own: ${r.extras}`);
        if (want.big === 'throw') C.ok(r.thrW > r.eatW, `${mode}: THROW isn't the big button (${r.thrW} vs ${r.eatW})`);
        if (mode === 'runpub') {      // (a drink in your hand: DRINK and THROW come back)
          const r2 = await p.evaluate(() => { const it = RS.items.items.find(i => i.def.drink && !i.dead); if (!it) return null; RS.player.flatGrab(it); for (let i = 0; i < 3; i++) RS.sim(1 / 30);
            const vis = (id) => getComputedStyle(document.getElementById(id)).display !== 'none'; return { eat: vis('btn-eat'), thr: vis('btn-throw'), held: !!RS.player.flatHolder.held }; });
          if (r2 && r2.held) C.ok(r2.eat && r2.thr, `runpub with a drink in hand: ${JSON.stringify(r2)}`);
        }
        console.log(`  ${mode}: eat ${r.eat} throw ${r.thr} ${(r.extras || '').slice(0, 90)}`);
        C.ok(!p.errors.length, `${mode}: page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
      } catch (e) { C.ok(false, `${mode}: ${e.message.slice(0, 200)}`); }
      await p.close();
    }
    // the pause menu: fades in, out, and the game takes a tap straight after
    const p = await newPage(b, { width: 390, height: 844, mobile: true });
    await startGame(p, { place: 'pub', mode: 'everyone' });
    await p.evaluate(() => document.getElementById('menu-btn').click());
    /* (a slow test machine can take a few frames for the fade: wait for it rather than a fixed time) */
    await p.waitForFunction(() => +getComputedStyle(document.getElementById('pause')).opacity > 0.95, null, { timeout: 8000, polling: 100 }).catch(() => {});
    const open = await p.evaluate(() => { const c = getComputedStyle(document.getElementById('pause')); return { d: c.display, o: +c.opacity }; });
    C.ok(open.d === 'flex' && open.o > 0.95, `the pause menu didn't open: ${JSON.stringify(open)}`);
    await p.evaluate(() => document.getElementById('pause-resume').click());
    const during = await p.evaluate(() => getComputedStyle(document.getElementById('pause')).pointerEvents);
    C.ok(during === 'none', `the closing pause menu can still be tapped (${during})`);
    await p.waitForFunction(() => getComputedStyle(document.getElementById('pause')).display === 'none', null, { timeout: 8000, polling: 100 }).catch(() => {});
    const shut = await p.evaluate(() => { const c = getComputedStyle(document.getElementById('pause')), e = document.getElementById('btn-eat'), r = e.getBoundingClientRect(); return { d: c.display, hit: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === e }; });
    C.ok(shut.d === 'none' && shut.hit, `after closing, the pause menu is ${shut.d} and EAT ${shut.hit ? 'can' : "can't"} be tapped`);
    C.ok(!p.errors.length, 'pause: page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
