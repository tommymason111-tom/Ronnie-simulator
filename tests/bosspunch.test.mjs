// PUNCHING THE BOSS: with nothing in your hand, tap the boss up close and you punch them, for a little damage (thrown
// food does far more). From too far away, a tap doesn't punch: it says to get closer.
import { launch, newPage, startGame, sleep, checker } from './lib/game.mjs';
export default async function () { const C = checker('bosspunch'), b = await launch();
  try { const p = await newPage(b, { width: 390, height: 844, mobile: true }); await startGame(p, { place: 'garden', mode: 'boss' });
    await p.waitForFunction(() => RS.director.boss && !document.body.classList.contains('boss-cine') && RS.director.boss.c && ['none', 'wait'].indexOf(RS.director.boss.st) < 0, null, { timeout: 180000, polling: 500 }).catch(() => {}); await sleep(1500);
    const r = await p.evaluate(async () => { const T = RS.THREE, B = RS.director.boss, P = RS.player; RS.renderer.setAnimationLoop(null);
      const ray = (dist) => { const ch = B.c.rag.pos('chest', new T.Vector3()); B.drawn(ch); const dx = ch.x - P.head.x, dz = ch.z - P.head.z, d = Math.hypot(dx, dz);
        P.rig.position.x += dx * (1 - dist / d); P.rig.position.z += dz * (1 - dist / d); P.rig.updateMatrixWorld(true); RS.sim(1 / 60); const o = P.camera.getWorldPosition(new T.Vector3()); return new T.Ray(o, ch.clone().sub(o).normalize()); };
      const f = P.flatHolder; if (f && f.held) P.flatDrop && P.flatDrop();
      const h0 = B.g.hint; B.g.hint = (t) => { window.__lastHint = t; }; const hp0 = B.hp; B.punchAt = 0; const far = B.tap(ray(12)); const hpFar = B.hp;
      B.punchAt = 0; const near = B.tap(ray(1.2 + B.S * 0.3)); const hp1 = B.hp;
      window.__lastHint = null; B.punchAt = 0; const t2 = B.tap(ray(1.2 + B.S * 0.3)); const hp2 = B.hp, st2 = B.st, h2 = window.__lastHint, sh2 = !!B.shielded;
      return { t2, st2, h2, sh2, held: !!(P.flatHolder && P.flatHolder.held), sh: !!B.shielded, punchAt: B.punchAt, hint: window.__lastHint, st: B.st, far, near, hp0, hpFar, hp1, hp2, host: B.host }; });
    console.log('  ' + JSON.stringify(r));
    C.ok(r.hpFar === r.hp0, `a punch from 12m away hurt the boss: ${JSON.stringify(r)}`);
    const d1 = r.hp0 - r.hp1, d2 = r.hp1 - r.hp2;
    C.ok(d1 > 0 && d1 <= 30 && d2 > 0, `punching up close didn't do a little damage: ${JSON.stringify(r)}`);
    C.ok(!p.errors.length, p.errors.slice(0, 2).join('|'));
  } finally { await b.close(); } return C.fails; }
