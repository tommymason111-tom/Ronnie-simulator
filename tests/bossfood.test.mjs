// THE BOSS FIGHT'S FOOD: every bit of food in the fight is twice its usual size (easy to see, grab and hit with), but in
// your hand on a phone it's its usual size (a boss-sized burger in front of the camera covered a third of the screen),
// and it's boss-sized again once it leaves your hand
import { launch, newPage, startGame, sleep, checker } from './lib/game.mjs';
export default async function () { const C = checker('bossfood'), b = await launch();
  try { const p = await newPage(b, { width: 390, height: 844, mobile: true }); await startGame(p, { place: 'garden', mode: 'boss' });
    await p.waitForFunction(() => RS.director.boss && !document.body.classList.contains('boss-cine'), null, { timeout: 120000 }).catch(() => {}); await sleep(5000);
    const r = await p.evaluate(() => { const f = RS.items.items.filter(it => !it.dead && !it.def.prop && !it.def.drink); return { n: f.length, big: f.filter(it => it.sizeK === 2).length }; });
    // look at the nearest bit of food
    await p.evaluate(() => { RS.renderer.setAnimationLoop(null); const P = RS.player, f = RS.items.items.filter(it => !it.dead && !it.def.prop && !it.def.drink).sort((a, b) => Math.hypot(a.pos.x - P.head.x, a.pos.z - P.head.z) - Math.hypot(b.pos.x - P.head.x, b.pos.z - P.head.z))[0];
      if (f) { const dx = f.pos.x - P.head.x, dz = f.pos.z - P.head.z, d = Math.hypot(dx, dz); P.rig.position.x += dx * (1 - 1.6 / d); P.rig.position.z += dz * (1 - 1.6 / d); P.rig.rotation.set(0, 0, 0); P.flatYaw = Math.atan2(-dx, -dz); P.flatPitch = -0.45; }
      for (let i = 0; i < 3; i++) RS.sim(1 / 30); RS.renderer.render(RS.scene, P.camera); });
    await p.evaluate(() => { const P = RS.player, f = RS.items.items.filter(it => !it.dead && !it.def.prop && !it.def.drink && it.type === 'burger')[0] || RS.items.items.find(it => !it.dead && !it.def.prop && !it.def.drink); P.flatPitch = -0.1; P.flatGrab(f); for (let i = 0; i < 20; i++) RS.sim(1 / 30); window.__held = f; window.__heldK = f.sizeK; P.flatDrop(); for (let i = 0; i < 20; i++) RS.sim(1 / 30); window.__afterK = f.sizeK; });
    const hk = await p.evaluate(() => [window.__heldK, window.__afterK]);
    C.ok(hk[0] === 1 && hk[1] === 2, `held food should be its usual size, and 2x again once dropped: ${hk}`);
    C.ok(r.n > 0 && r.big === r.n, `boss food not all 2x: ${JSON.stringify(r)}`); C.ok(!p.errors.length, p.errors.slice(0, 2).join('|'));
  } finally { await b.close(); } return C.fails; }
