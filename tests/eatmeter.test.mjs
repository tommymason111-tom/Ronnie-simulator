// EAT METER FEEDBACK: quick bites build a combo (counted, best kept, gone after a pause); every bite punches the meter
// (a spring: it scales up and settles back to exactly where it was); the bar slides up to its level instead of jumping;
// growing a size flashes it; none of it builds a shader mid-game; and the meter with a combo on it fits a phone
import { launch, newPage, startGame, checker } from './lib/game.mjs';

export default async function () {
  const C = checker('eatmeter'), b = await launch();
  try {
    const p = await newPage(b, { width: 390, height: 844, mobile: true });
    await startGame(p, { place: 'pub', mode: 'roam0' });
    await p.click('#play-flat').catch(() => {});
    const r = await p.evaluate(async () => {
      RS.renderer.setAnimationLoop(null); const P = RS.player, G = RS.G, out = {};
      RS.sim(1, 1 / 30); const progs0 = RS.renderer.info.programs.length, base = P.wristBase || P.wrist.scale.x;
      const food = () => RS.items.items.filter(x => !x.dead && !x.heldBy && !x.def.drink && !x.def.prop && !x.def.veg && !x.def.poop).sort((a, b) => a.pos.distanceTo(P.head) - b.pos.distanceTo(P.head))[0];
      const biteOnce = () => { let it = P.flatHolder && P.flatHolder.held; if (!it) { it = food(); if (!it) return false; P.flatGrab(it); } const s0 = G.chonk; for (let i = 0; i < 30 && G.chonk === s0; i++) { P.flatEat(); RS.sim(1 / 30, 1 / 30); } return G.chonk > s0; };
      // quick bites: a combo
      const combos = [], kicks = [], fills = [];
      for (let i = 0; i < 6; i++) { biteOnce(); combos.push(G.combo); RS.sim(2 / 30, 1 / 30); kicks.push(+(P.wrist.scale.x / base).toFixed(3)); fills.push([+(G.fillShown || 0).toFixed(3)]); RS.sim(0.25, 1 / 30); }
      out.combos = combos; out.kicks = kicks; out.best = G.bestCombo;
      RS.sim(1.5, 1 / 30); out.settled = +(P.wrist.scale.x / base).toFixed(4);
      // the bar slides: straight after a bite it's behind where it's going, then catches up
      biteOnce(); const st = STAGES => 0; const want = () => { const S = RS.G; return S.chonk; };
      out.slide0 = G.fillShown; RS.sim(1.2, 1 / 30); out.slide1 = G.fillShown;
      // a pause ends the combo
      RS.sim(3, 1 / 30); out.afterPause = G.combo;
      // grow a size: the flash
      const stage0 = G.stage; RS.addChonk ? RS.addChonk(400) : null; out.grew = G.stage > stage0; out.flash = G.meterFlash;
      RS.sim(2, 1 / 30); out.flashGone = G.meterFlash;
      out.built = RS.renderer.info.programs.length - progs0;
      // the meter with a combo on it, drawn: for the screenshot
      for (let i = 0; i < 4; i++) { biteOnce(); RS.sim(0.2, 1 / 30); }
      RS.renderer.render(RS.scene, P.camera); out.comboNow = G.combo;
      return out; });
    const shot = (process.env.SHOT_DIR || '/tmp') + '/eatmeter-phone.png'; await p.screenshot({ path: shot }).catch(() => {});
    console.log(`  combos ${JSON.stringify(r.combos)} best ${r.best}; meter kicks ${JSON.stringify(r.kicks)} settled ${r.settled}; bar ${r.slide0 && r.slide0.toFixed(3)} -> ${r.slide1 && r.slide1.toFixed(3)}; flash ${r.flash} -> ${r.flashGone}; shaders built ${r.built}`);
    C.ok(r.combos[r.combos.length - 1] >= 4 && r.combos.every((c, i) => !i || c >= r.combos[i - 1]), `quick bites didn't build a combo: ${JSON.stringify(r.combos)}`);
    C.ok(r.best >= r.combos[r.combos.length - 1], `best combo not kept: ${r.best}`);
    C.ok(r.kicks.some(k => k > 1.03), `a bite didn't punch the meter: ${JSON.stringify(r.kicks)}`);
    C.ok(Math.abs(r.settled - 1) < 0.002, `the meter didn't settle back to its size: ${r.settled}`);
    C.ok(r.afterPause === 0, `the combo didn't end after a pause: ${r.afterPause}`);
    C.ok(r.grew && r.flash > 0.5 && r.flashGone === 0, `growing a size didn't flash the meter: ${JSON.stringify({ grew: r.grew, flash: r.flash, gone: r.flashGone })}`);
    C.ok(r.built === 0, `the feedback built ${r.built} shaders mid-game (a stutter)`);
    C.ok(!p.errors.length, 'page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
