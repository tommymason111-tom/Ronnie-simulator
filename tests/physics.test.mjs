// PHYSICS FEEL: things behave like what they are.
//   - an apple dropped on the floor bounces higher than a burger, and rolls on much further when it's moving
//   - a burger squashes when it lands, wobbles, and ends up exactly its own shape again
//   - something landing on its side tips over to rest over a few frames (no snap), and ends lying flat
//   - heavy things don't throw as far as light ones; a throw tumbles end over end
//   - a punch shakes the view on a phone, it settles back to dead still, and the setting turns it off
//   - none of it builds a shader mid-game, no page errors
import { launch, newPage, startGame, checker } from './lib/game.mjs';

export default async function () {
  const C = checker('physics'), b = await launch();
  try {
    const p = await newPage(b, { width: 640, height: 400 });
    await startGame(p, { place: 'grid', mode: 'roam0' }).catch(async () => startGame(p, { place: 'pub', mode: 'roam0' }));
    await p.click('#play-flat').catch(() => {});
    const r = await p.evaluate(async () => {
      RS.renderer.setAnimationLoop(null); RS.sim(0.5, 1 / 30);
      const T = RS.THREE, P = RS.player, I = RS.items, out = {}, progs0 = RS.renderer.info.programs.length;
      const spot = P.head.clone(); spot.y = 0; const f = P.fwd.clone(); f.y = 0; f.normalize(); spot.addScaledVector(f, 1.2);
      const drop = (type, h, vx = 0) => { const it = I.spawn(type, spot.clone().setY(h)); it.spawnScale = 1; it.obj.scale.setScalar(1); it.resting = false; it.vel.set(vx, 0, 0); it.spin.set(0, 0, 0); return it; };
      const run = (it, secs, fn) => { for (let t = 0; t < secs; t += 1 / 60) { RS.sim(1 / 60, 1 / 60); fn && fn(it); } };
      // bounce height
      const bounceOf = (type) => { const it = drop(type, 1.4); let hit = false, peak = 0, minY = 9; run(it, 1.2, (x) => { if (!hit && x.vel.y > 0) hit = true; if (hit) peak = Math.max(peak, x.pos.y - x.radius); }); I.remove(it); return +peak.toFixed(3); };
      out.bApple = bounceOf('apple'); out.bBurger = bounceOf('burger');
      // roll distance
      const rollOf = (type) => { const it = drop(type, 0.2, 2.2); const x0 = it.pos.x; run(it, 3); const d = Math.abs(it.pos.x - x0); I.remove(it); return +d.toFixed(2); };
      out.rApple = rollOf('apple'); out.rBurger = rollOf('burger');
      // squash
      { const it = drop('burger', 1.6); let minRatio = 1; run(it, 1.6, (x) => { const s = x.obj.scale; minRatio = Math.min(minRatio, s.y / s.x); }); const s = it.obj.scale; out.squash = +minRatio.toFixed(3); out.after = [s.x, s.y, s.z].map(v => +v.toFixed(4)); I.remove(it); }
      // tipping over to rest
      { const it = drop('cookie', 0.3); it.obj.rotation.set(1.2, 0, 0.9); it.spin.set(0, 0, 0); let restF = -1, flatF = -1, n = 0;
        run(it, 2, (x) => { n++; if (x.resting && restF < 0) restF = n; if (restF > 0 && flatF < 0 && Math.abs(Math.sin(x.obj.rotation.x)) + Math.abs(Math.sin(x.obj.rotation.z)) < 0.01) flatF = n; });
        out.tipFrames = flatF - restF; out.flat = flatF > 0; I.remove(it); }
      // throws
      const throwOf = (type) => { const it = I.spawn(type, P.head.clone()); it.spawnScale = 1; P.flatGrab(it); P.flatThrow(7); const v = it.vel.clone(); const side = new T.Vector3(-P.fwd.z, 0, P.fwd.x).normalize(); const along = Math.abs(it.spin.dot(side)) / (it.spin.length() || 1); I.remove(it); return { speed: +Math.hypot(v.x, v.z).toFixed(2), along: +along.toFixed(2) }; };
      out.tCookie = throwOf('cookie'); out.tPint = throwOf('pint');
      // shake
      const A = await import('./js/audio.js'), { haptics } = await import('./js/haptics.js'); haptics.shake = true; P.shakeA = 0;
      const cam = P.camera, still = () => { RS.sim(1 / 60, 1 / 60); return [cam.position.x, cam.position.y, cam.rotation.z]; };
      const s0 = still(); A.sfx('punch'); let maxOff = 0; for (let i = 0; i < 20; i++) { const s = still(); maxOff = Math.max(maxOff, Math.abs(s[0] - s0[0]) + Math.abs(s[1] - s0[1])); }
      for (let i = 0; i < 90; i++) still(); const s2 = still(); out.shook = +maxOff.toFixed(4); out.settled = +(Math.abs(s2[0] - s0[0]) + Math.abs(s2[1] - s0[1])).toFixed(5);
      haptics.shake = false; P.shakeA = 0; await new Promise(r => setTimeout(r, 80)); A.sfx('punch'); let off2 = 0; for (let i = 0; i < 10; i++) { const s = still(); off2 = Math.max(off2, Math.abs(s[0] - s0[0]) + Math.abs(s[1] - s0[1])); }
      out.offShook = +off2.toFixed(4); haptics.shake = true;
      out.built = RS.renderer.info.programs.length - progs0;
      return out; });
    console.log('  ' + JSON.stringify(r));
    C.ok(r.bApple > r.bBurger * 1.8 && r.bApple > 0.05, `an apple should bounce higher than a burger: apple ${r.bApple} burger ${r.bBurger}`);
    C.ok(r.rApple > r.rBurger * 2.5 && r.rApple > 0.8, `an apple should roll on further than a burger slides: apple ${r.rApple} m, burger ${r.rBurger} m`);
    C.ok(r.squash < 0.93, `a dropped burger didn't squash: ${r.squash}`);
    C.ok(r.after.every(v => Math.abs(v - r.after[0]) < 1e-4), `the burger didn't get its shape back: ${JSON.stringify(r.after)}`);
    C.ok(r.flat && r.tipFrames >= 3, `something on its side should tip over to rest in a few frames: ${r.tipFrames} frames, flat ${r.flat}`);
    C.ok(r.tCookie.speed > r.tPint.speed * 1.2, `a pint shouldn't throw as far as a cookie: ${JSON.stringify([r.tCookie, r.tPint])}`);
    C.ok(r.tCookie.along > 0.6, `a throw should tumble end over end: ${r.tCookie.along}`);
    C.ok(r.shook > 0.01 && r.settled < 1e-4, `a punch should shake the view and settle back: shook ${r.shook} settled ${r.settled}`);
    C.ok(r.offShook < 1e-4, `screen shake off still shook: ${r.offShook}`);
    C.ok(r.built === 0, `built ${r.built} shaders mid-game`);
    C.ok(!p.errors.length, 'page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
