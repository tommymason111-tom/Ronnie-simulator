// NEAR ENOUGH TO PRESS IT: the ping pong and darts PLAY buttons (and the like) only work when you're stood by them. You
// used to be able to start ping pong from across the garden. On a phone: stand at a distance, look at the button, tap it
import { launch, newPage, startGame, sleep, checker } from './lib/game.mjs';

export default async function () {
  const C = checker('reach'), b = await launch();
  try {
    const p = await newPage(b, { width: 390, height: 844, mobile: true });
    await startGame(p, { place: 'garden', mode: 'roam', extra: '&npcs=0' }); await sleep(1500);
    await p.evaluate(() => RS.renderer.setAnimationLoop(null));
    for (const which of ['pingpong', 'dartboard']) for (const dist of [6, 4, 1.6]) {
      // stand `dist` from the button (on the side it faces you from), looking at it, and tap where it is on the screen
      const at = await p.evaluate(([which, dist]) => {
        const g = RS.room[which]; if (g.playing) g.toggle(); g.button.cool = 0; if (g.button.t) g.button.t = 0;
        const bp = g.button.position, from = which === 'pingpong' ? { x: 0, z: -1 } : { x: 0, z: 1 }, T = RS.THREE;
        const st = which === 'dartboard' && g.stand ? g.stand[1] : null; let dx = from.x, dz = from.z;
        if (st) { const v = new T.Vector3(st.x - bp.x, 0, st.z - bp.z); if (v.length() > 0.01) { v.normalize(); dx = v.x; dz = v.z; } else { const tgt = g.board ? g.board.position || g.c : null; if (tgt) { const w = new T.Vector3(bp.x - tgt.x, 0, bp.z - tgt.z).normalize(); dx = w.x; dz = w.z; } } }
        const pl = RS.player; pl.rig.position.set(bp.x + dx * dist, 0, bp.z + dz * dist);
        pl.rig.rotation.set(0, 0, 0); pl.flatYaw = Math.atan2(dx, dz); for (let i = 0; i < 4; i++) RS.sim(1 / 30);
        pl.flatPitch = Math.atan2(bp.y - pl.head.y, dist); pl.flatYaw = Math.atan2(dx, dz); RS.sim(1 / 60); pl.camera.updateMatrixWorld(true);
        const v = bp.clone().project(pl.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, on: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 };
      }, [which, dist]);
      if (!at.on) { C.ok(false, `${which} at ${dist}m: the button wasn't on the screen to tap`); continue; }
      await p.touchscreen.tap(at.x, at.y); await sleep(300); await p.evaluate(() => RS.sim(1 / 30));
      const playing = await p.evaluate((w) => RS.room[w].playing, which);
      console.log(`  ${which} from ${dist}m: ${playing ? 'started' : 'not started'}`);
      C.ok(dist > 2.5 ? !playing : playing, `${which}: tapping its PLAY button from ${dist}m ${playing ? 'started it (too far away)' : "didn't start it (stood right by it)"}`);
    }
    C.ok(!p.errors.length, 'page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
