// ATTACK CARDS: every attack has its own card (its own look and pattern, its own way in, its own bits flying off it),
// every one comes up and settles in the middle of the screen, and in multiplayer the line names whoever's getting it
// ("ETHAN HITS BETH WITH A PEPSI MAX ATTACK!", not YOU). SHOT_DIR=dir saves a picture of each; VS=name, W/H for the size.
import { launch, newPage, startGame, checker } from './lib/game.mjs';
import fs from 'fs';
const KEYS = ['trip', 'tackle', 'beer', 'dating', 'pepsi', 'jig', 'siu', 'bbq', 'rod', 'diet', 'knee', 'flash', 'oasis', 'nutmeg', 'turkey'];
const WHO = { trip: 'tommy', tackle: 'noah', beer: 'aidan', dating: 'harry', pepsi: 'ethan', jig: 'connor', siu: 'lewis', bbq: 'ian', rod: 'ian', diet: 'chloe', knee: 'aidanw', flash: 'oliver', oasis: 'dylan', nutmeg: 'alfie', turkey: 'ben' };
export default async function () {
  const C = checker('attackcards'), b = await launch(), dir = process.env.SHOT_DIR;
  try {
    const p = await newPage(b, { width: Number(process.env.W || 844), height: Number(process.env.H || 390) });
    await startGame(p, { place: 'pub', mode: 'roam0', dev: false }); await p.click('#play-flat').catch(() => {}); if (process.env.TT) await p.evaluate((t) => { window.__T = t; }, Number(process.env.TT));
    const res = {};
    for (const k of KEYS) {
      for (const vs of [process.env.VS || 'Beth']) {
        await p.evaluate(([k, w, vs]) => { const fx = RS.director.g.fx; fx.removeAll(); fx.cardT = -1; RS.director.showAnnounce({ id: w, name: w === 'aidanw' ? 'Aidan W' : w[0].toUpperCase() + w.slice(1) }, k, vs); RS.renderer.setAnimationLoop(null); const T = Number(window.__T || 1.6); for (let i = 0; i < T * 30; i++) RS.sim(1 / 30); RS.renderer.render(RS.scene, RS.player.camera); const c = fx.card; return { on: c.visible, op: c.material.opacity, x: c.position.x, y: c.position.y, rot: c.rotation.z, pat: fx.cardTh && fx.cardTh.pat, enter: fx.cardTh && fx.cardTh.enter }; }, [k, WHO[k], vs]).then(r => { res[k] = r; }); await p.waitForTimeout(300);
        if (dir) fs.writeFileSync(`${dir}/card_${k}.png`, await p.screenshot());
      }
    }
    for (const k of KEYS) { const r = res[k]; C.ok(r && r.on && r.op > 0.95 && Math.abs(r.x) < 0.08 && Math.abs(r.y) < 0.2 && Math.abs(r.rot) < 0.15, `${k}'s card isn't up and settled in the middle: ${JSON.stringify(r)}`); C.ok(r && r.pat, `${k} has no card of its own`); }
    C.ok(new Set(KEYS.map(k => res[k] && res[k].pat + res[k].enter)).size >= 13, 'the cards are mostly the same: ' + KEYS.map(k => res[k] && res[k].pat + '/' + res[k].enter).join(' '));
    const aim = await p.evaluate(async () => { const { aimAt } = await import('./js/attackfx.js'); return [aimAt('ETHAN HITS YOU WITH A PEPSI MAX ATTACK!', 'Beth'), aimAt('YOU HAVE TO HEAR ALL ABOUT IT', 'Beth'), aimAt('TO GET YOUR HAIRLINE DONE', 'Beth')]; });
    C.ok(aim[0] === 'ETHAN HITS BETH WITH A PEPSI MAX ATTACK!' && aim[1] === 'BETH HAS TO HEAR ALL ABOUT IT' && aim[2] === "TO GET BETH'S HAIRLINE DONE", 'the lines don\'t name the target: ' + JSON.stringify(aim));
    C.ok(!p.errors.length, 'errors: ' + p.errors.slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
