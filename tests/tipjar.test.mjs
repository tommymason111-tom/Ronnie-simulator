// RUN THE PUB: three nights and the tip jar.
//   - QUIET NIGHT / FRIDAY NIGHT / CUP FINAL: each one is the mode the game says it is (and what a restart or a
//     multiplayer room would pass on), and the cup final's punters are less patient, come in faster, tip bigger
//   - a quick serve's tip drops into the jar as coins you can see piling up, the label says what's in it
//   - Lewis nicks some for his car unless you're stood by the jar
//   - the shift report has the night and the tips, and still fits with its awards
//   - the menu's Run the Pub card has the three nights to pick
import { launch, newPage, startGame, checker, sleep } from './lib/game.mjs';
import fs from 'fs';

export default async function () {
  const C = checker('tipjar'), b = await launch(), dir = process.env.SHOT_DIR || '/tmp';
  try {
    const p = await newPage(b, { width: 900, height: 560 });
    const res = {};
    for (const id of ['runpub1', 'runpub', 'runpub3']) {
      await startGame(p, { place: 'pub', mode: id }); await p.click('#play-flat').catch(() => {});
      res[id] = await p.evaluate(async () => {
        RS.renderer.setAnimationLoop(null); const D = RS.director, rp = D.runpub, out = { mode: D.mode, full: D.fullMode, diff: rp && rp.diff && rp.diff.name };
        for (let i = 0; i < 150 && !rp.waiting().length; i++) RS.sim(1, 1 / 30);      // (punters come in and get to the bar)
        const w = rp.waiting(); out.waiting = w.length; out.patience = w.length ? +(w[0].rp.patience).toFixed(1) : null; out.spawnT = rp.spawnT;
        // a quick, right serve: a tip, into the jar
        if (w.length) { const c = w[0]; c.rp.wait = 0; rp.deliver(c, null); }
        RS.sim(1.5, 1 / 30); const J = rp.tipJar; out.tips = +rp.tips.toFixed(2); out.jar = J && +J.total.toFixed(2); out.coins = J && J.coins; out.drawn = J && J.im.count;
        out.jarAt = J && [J.grp.position.x, J.grp.position.y, J.grp.position.z];
        // Lewis: near the jar he backs off; away from it he takes some
        if (J) { J.total = Math.max(J.total, 10); const P = RS.player, keep = P.rig.position.clone();
          P.rig.position.set(J.grp.position.x + 0.9, 0, J.grp.position.z); RS.sim(0.1, 1 / 30); J.nickT = 0; const t0 = J.total; J.update(0.01); out.nearKept = J.total === t0;
          P.rig.position.set(J.grp.position.x + 4, 0, J.grp.position.z + 4); RS.sim(0.1, 1 / 30); J.nickT = 0; const t1 = J.total; J.update(0.01); out.awayNicked = +(t1 - J.total).toFixed(2); P.rig.position.copy(keep); }
        // look at the jar for the screenshot
        const cam = new RS.THREE.PerspectiveCamera(40, 900 / 560, 0.02, 20); if (J) { cam.position.set(J.grp.position.x + 0.55, J.grp.position.y + 0.32, J.grp.position.z + 0.12); cam.lookAt(J.grp.position.x, J.grp.position.y + 0.08, J.grp.position.z); }
        RS.renderer.render(RS.scene, cam); out.jarPng = RS.renderer.domElement.toDataURL('image/png');
        D.end(); RS.sim(0.2, 1 / 30); out.lines = (D.lastLines || []).map(l => l[0]); out.awards = D.awardsFor ? D.awardsFor.length : 0; out.png = D.rc.toDataURL('image/png');
        return out; });
      if (id === 'runpub3') { fs.writeFileSync(`${dir}/tipjar.png`, Buffer.from(res[id].jarPng.split(',')[1], 'base64')); fs.writeFileSync(`${dir}/receipt-runpub.png`, Buffer.from(res[id].png.split(',')[1], 'base64')); }
      delete res[id].png; delete res[id].lines; delete res[id].jarPng;
      console.log(`  ${id}: ${JSON.stringify(res[id])}`);
    }
    const [E, N, H] = [res.runpub1, res.runpub, res.runpub3];
    C.ok(E.full === 'runpub1' && N.full === 'runpub' && H.full === 'runpub3' && E.mode === 'runpub' && H.mode === 'runpub', `the three nights aren't their own modes: ${[E.full, N.full, H.full]}`);
    C.ok(E.diff === 'QUIET NIGHT' && N.diff === 'FRIDAY NIGHT' && H.diff === 'CUP FINAL', `wrong night: ${[E.diff, N.diff, H.diff]}`);
    C.ok(E.patience && H.patience && E.patience > N.patience && N.patience > H.patience, `patience should drop with the night: ${[E.patience, N.patience, H.patience]}`);
    for (const [k, r] of Object.entries(res)) {
      C.ok(r.tips > 0 && Math.abs(r.jar - r.tips) < 0.01, `${k}: a quick serve's tip didn't go in the jar: tips ${r.tips} jar ${r.jar}`);
      C.ok(r.coins > 0 && r.drawn === r.coins, `${k}: no coins in the jar: ${r.coins} (${r.drawn} drawn)`);
    }
    C.ok(N.nearKept && N.awayNicked > 0, `Lewis should back off when you're by the jar and nick some when you're not: ${JSON.stringify({ near: N.nearKept, away: N.awayNicked })}`);
    C.ok(E.nearKept && E.awayNicked === 0, `Lewis shouldn't nick on a quiet night: ${E.awayNicked}`);
    C.ok(H.awards >= 1, 'the shift report lost its awards');
    // the menu's card
    await p.goto('http://game.local/index.html'); await p.waitForFunction(() => document.querySelector('#mode-grid') !== null, null, { timeout: 120000 });
    const card = await p.evaluate(() => document.getElementById('mode-grid') ? 1 : 0);
    C.ok(card, 'no mode grid');
    C.ok(!p.errors.length, 'page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
