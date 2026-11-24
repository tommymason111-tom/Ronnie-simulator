// SOUND & FEEL: the buzz and the sound mix.
//   - your own sounds buzz the phone (each action its own pattern); someone else's, across the room, don't; off is off
//   - eating for real buzzes
//   - every slider really turns its kind of sound up and down, and is kept on the device
//   - the SOUND & FEEL panel opens from the pause menu, fits a phone, and every control works
import { launch, newPage, startGame, checker } from './lib/game.mjs';

export default async function () {
  const C = checker('feel'), b = await launch();
  try {
    const p = await newPage(b, { width: 390, height: 844, mobile: true });
    await p.addInitScript(() => { window.__buzz = []; Object.defineProperty(navigator, 'vibrate', { value: (pat) => { window.__buzz.push(pat); return true; }, configurable: true }); });
    await startGame(p, { place: 'pub', mode: 'roam0' });
    await p.click('#play-flat').catch(() => {});
    const r = await p.evaluate(async () => {
      const A = await import('./js/audio.js'), { haptics } = await import('./js/haptics.js'); A.initAudio(); try { await A.audioCtx().resume(); } catch (e) {}
      const out = {}; const take = () => __buzz.splice(0);
      haptics.on = true; take(); await new Promise(r => setTimeout(r, 80));
      A.sfx('chomp'); out.mine = take();
      await new Promise(r => setTimeout(r, 80)); const far = RS.player.head.clone(); far.x += 6; A.sfx('punch', far); out.far = take();
      await new Promise(r => setTimeout(r, 80)); A.sfx('punch'); out.punch = take();
      haptics.on = false; take(); await new Promise(r => setTimeout(r, 80)); A.sfx('chomp'); out.off = take(); haptics.on = true; take();
      // eating for real
      await new Promise(r => setTimeout(r, 80)); RS.renderer.setAnimationLoop(null);
      const it = RS.items.items.filter(x => !x.dead && !x.heldBy && !x.def.drink).sort((a, b) => a.pos.distanceTo(RS.player.head) - b.pos.distanceTo(RS.player.head))[0];
      if (it && RS.player.flatGrab) { RS.player.flatGrab(it); for (let i = 0; i < 40 && !__buzz.length; i++) { RS.player.flatEat && RS.player.flatEat(); RS.sim(0.1, 1 / 30); } }
      out.ate = take().length;
      // the mix
      const before = A.mixGains(); A.setMix('fx', 0.25); A.setMix('music', 0); A.setMix('master', 0.5); await new Promise(r => setTimeout(r, 300));
      out.gains = A.mixGains(); out.saved = JSON.parse(localStorage.getItem('rs_mix')); out.before = before;
      A.setMix('fx', 1); A.setMix('music', 0.8); A.setMix('master', 1);
      return out; });
    C.ok(Array.isArray(r.mine) && r.mine.length === 1 && r.mine[0][0] === 18, `your own bite didn't buzz its pattern: ${JSON.stringify(r.mine)}`);
    C.ok(r.far.length === 0, `a punch across the room buzzed your phone: ${JSON.stringify(r.far)}`);
    C.ok(r.punch.length === 1 && r.punch[0].length === 3, `your punch didn't buzz its own pattern: ${JSON.stringify(r.punch)}`);
    C.ok(r.off.length === 0, `the buzz is off but it still buzzed: ${JSON.stringify(r.off)}`);
    C.ok(r.ate > 0, 'eating food for real never buzzed');
    C.ok(Math.abs(r.gains.fx - 0.25) < 0.02 && r.gains.music < 0.02 && Math.abs(r.gains.master - 0.5) < 0.02, `the sliders don't change the sound: ${JSON.stringify(r.gains)}`);
    C.ok(r.saved && r.saved.fx === 0.25 && r.saved.music === 0, 'the mix isn\'t kept on the device');
    // the panel, from the pause menu, on a phone
    await p.evaluate(() => { document.querySelector('#pausebtn, #pause-btn, .pausebtn') ? document.querySelector('#pausebtn, #pause-btn, .pausebtn').click() : null; document.getElementById('pause').classList.add('on'); document.getElementById('pause-mix').click(); });
    await p.waitForTimeout(400);
    const ui = await p.evaluate(() => { const box = document.getElementById('pause-mixbox'), r = box.getBoundingClientRect(), sliders = [...box.querySelectorAll('input[type=range]')];
      const cut = [...box.querySelectorAll('.mxn, .mxbuzz')].filter(e => e.scrollWidth > e.clientWidth + 1).length;
      const fxS = box.querySelector('input[data-k="fx"]'); fxS.value = 40; fxS.dispatchEvent(new Event('input', { bubbles: true }));
      const fx = JSON.parse(localStorage.getItem('rs_mix')).fx; const bz = box.querySelector('.mxbuzz'); bz.click(); const hOff = localStorage.getItem('rs_haptics'); bz.click();
      return { shown: r.width > 0 && r.height > 0, fits: r.left >= 0 && r.right <= innerWidth + 1, sliders: sliders.length, cut, fx, hOff, hOn: localStorage.getItem('rs_haptics') }; });
    await p.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + '/mix-phone.png' : '/tmp/mix-phone.png' }).catch(() => {});
    C.ok(ui.shown && ui.fits, `the SOUND & FEEL panel doesn't show or fit a phone: ${JSON.stringify(ui)}`);
    C.ok(ui.sliders === 7, `${ui.sliders} sliders (want 7: the narrator has its own)`);
    C.ok(ui.cut === 0, `${ui.cut} labels cut off on a phone`);
    C.ok(Math.abs(ui.fx - 0.4) < 0.01 && ui.hOff === '0' && ui.hOn === '1', `the panel's controls don't work: ${JSON.stringify(ui)}`);
    console.log(`  buzz: bite ${JSON.stringify(r.mine)}, punch ${JSON.stringify(r.punch)}, far ${r.far.length}, off ${r.off.length}, ate ${r.ate}; mix ${JSON.stringify(r.gains)}`);
    C.ok(!p.errors.length, 'page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
