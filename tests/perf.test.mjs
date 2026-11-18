// SMOOTH ON A PHONE / HEADSET: the speed-ups stay in, and still give exactly the same game.
//   - draw calls: each place's busiest view stays under its budget (phones and the Quest choke on draws long before
//     triangles); the food glow is one draw however much food there is; signs are packed onto shared sheets
//   - physics: no pair of bodies that can't be pushed is ever tested (animated characters against the furniture, the
//     floor, each other), and an animated character's joints aren't in the physics world at all
//   - keeping people out of the furniture (nearBlockers) gives exactly what checking every box did
//   - path finding (reused working arrays) finds exactly the same routes as a fresh search
//   - growing a size doesn't stop the game: every belly look is made beforehand
//   - no shader is built in the middle of play (each was a stutter): they're all built while the level loads
import { launch, newPage, startGame, checker } from './lib/game.mjs';

// draw calls from the start spot, all four ways (well under what it was: pub 862, Lidl 1701 before)
const BUDGET = { pub: 640, shop: 1000, restaurant: 260, garden: 480, bedroom: 140 };
const MODES = { pub: 'everyone', shop: 'sweep', restaurant: 'date', garden: 'bbq', bedroom: 'everyone' };

export default async function () {
  const C = checker('perf'), b = await launch();
  try {
    for (const place of Object.keys(BUDGET)) {
      const p = await newPage(b, { width: 900, height: 560 });
      try {
        await startGame(p, { place, mode: MODES[place] });
        const r = await p.evaluate(async () => {
          RS.renderer.setAnimationLoop(null); RS.sim(2, 1 / 30);
          const out = {}, R = RS.renderer, T = RS.THREE, st = RS.room.start;
          // the busiest of the four views from the start spot
          const cam = new T.PerspectiveCamera(70, 900 / 560, 0.05, 40); let worst = 0;
          for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { cam.position.set(st.x, 1.6, st.z); cam.rotation.set(-0.1, yaw, 0, 'YXZ'); cam.updateMatrixWorld(); R.info.reset(); R.render(RS.scene, cam); worst = Math.max(worst, R.info.render.calls); }
          out.calls = worst;
          // the glow round food: one draw for all of it, no sprite per item
          out.haloSprites = 0; for (const it of RS.items.items) it.obj.traverse(o => { if (o.isSprite) out.haloSprites++; });
          out.haloLayers = RS.scene.children.filter(o => o.name === 'food halos').length;
          out.glowing = RS.items.items.filter(it => it.halo && !it.dead).length;
          out.signsLeft = RS.scene.children.filter(o => o.isMesh && o.userData.sign && !o.userData.live && o.userData.sign !== 'photo').length;
          out.signSheets = RS.scene.children.filter(o => o.name === 'signs').length;
          // physics: count pairs the broadphase lets through where neither body can move
          const W = RS.physics.world, CANNON = (await import('cannon-es')), DYN = CANNON.Body.DYNAMIC; let stillPairs = 0, pairs = 0;
          const p1 = [], p2 = []; W.broadphase.collisionPairs(W, p1, p2); pairs = p1.length; for (let i = 0; i < p1.length; i++) if (!(p1[i].type & DYN) && !(p2[i].type & DYN)) stillPairs++;
          out.pairs = pairs; out.stillPairs = stillPairs;
          // an animated character's joints are out of the world; a ragdoll's are in
          const c = RS.cast.find(x => x.rag && x.rag.joints && x.rag.joints.length && x.rag.mode !== 'ragdoll');
          if (c) { const inW = () => c.rag.joints.filter(j => W.constraints.includes(j.c)).length; out.jointsAnim = inW(); c.rag.setMode('ragdoll', 0); out.jointsRag = inW(); out.jointsAll = c.rag.joints.length; c.rag.setMode('anim'); out.jointsBack = inW(); }
          // keeping people out of furniture: the same answer as checking every box, at 3000 random spots
          const room = RS.room, B = room.bounds; let diff = 0;
          const ref = (root) => { for (const k of room.blockers) { const p = 0.22; if (root.x > k.x0 - p && root.x < k.x1 + p && root.z > k.z0 - p && root.z < k.z1 + p) { const dl = root.x - (k.x0 - p), dr = (k.x1 + p) - root.x, dn = root.z - (k.z0 - p), df = (k.z1 + p) - root.z; const mn = Math.min(dl, dr, dn, df); if (mn === dl) root.x = k.x0 - p; else if (mn === dr) root.x = k.x1 + p; else if (mn === dn) root.z = k.z0 - p; else root.z = k.z1 + p; } } };
          const cc = RS.cast.find(x => x.rag && x.rag.constrain); if (cc) { const seat = cc.seated; cc.seated = false; let s = 7;
            const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
            for (let i = 0; i < 3000; i++) { const x = B.x0 + 0.3 + rnd() * (B.x1 - B.x0 - 0.6), z = B.z0 + 0.3 + rnd() * (B.z1 - B.z0 - 0.6), a = { x, z }, q = { x, z }; cc.rag.constrain(a); ref(q); if (a.x !== q.x || a.z !== q.z) diff++; }
            cc.seated = seat; }
          out.pushDiff = diff;
          // path finding: the same routes as a fresh search (the working arrays thrown away before each one)
          const nav = room.nav; out.navDiff = null;
          if (nav) { let s = 11; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647; out.navDiff = 0; const key = (r) => r ? r.map(v => v.x.toFixed(4) + ',' + v.y.toFixed(4)).join(';') : 'none';
            for (let i = 0; i < 40; i++) { const a = [B.x0 + rnd() * (B.x1 - B.x0), B.z0 + rnd() * (B.z1 - B.z0)], c2 = [B.x0 + rnd() * (B.x1 - B.x0), B.z0 + rnd() * (B.z1 - B.z0)];
              const warm = key(nav.path(a[0], a[1], c2[0], c2[1])); nav._g = null; const fresh = key(nav.path(a[0], a[1], c2[0], c2[1])); if (warm !== fresh) out.navDiff++; } }
          return out;
        });
        // no first-time stutters: once the level's warmed up, playing (power-ups, eating, attacks) builds no new shaders
        await p.waitForFunction(() => window.__shaderWarm, null, { timeout: 240000 });
        const sh = await p.evaluate(async () => { const R = RS.renderer, PU = Object.keys((await import('./js/powerups.js')).POWERUPS || {}); let s = 9; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
          for (let i = 0; i < 3; i++) { RS.sim(0.2, 1 / 30); R.render(RS.scene, RS.player.camera); }      // (the very first frames: a sunny place's shadows)
          const n0 = R.info.programs.length;
          for (let i = 0; i < 60; i++) { const k = rnd();
            if (k < 0.25 && RS.powerups && PU.length) RS.powerups.give(PU[Math.floor(rnd() * PU.length)]);
            else if (k < 0.45) { const it = RS.items.items.find(x => !x.dead && !x.heldBy); if (it && RS.player.flatGrab) { RS.player.flatGrab(it); RS.player.flatEat && RS.player.flatEat(); } }
            else if (k < 0.6) { const c = RS.cast.find(x => x.rag && x.rag.mesh && !x.down); if (c) try { RS.director.launch({ c, attack: { key: undefined } }); } catch (e) {} }
            RS.sim(0.25, 1 / 30); R.render(RS.scene, RS.player.camera); }
          return { built: R.info.programs.length - n0, warm: window.__shaderWarm }; });
        C.ok(sh.built === 0, `${place}: ${sh.built} shaders built during play (each one a stutter on a phone or headset): warm-up didn't cover them`);
        // the belly's looks: all made within a short while of starting (in quiet moments), so growing never waits
        await p.waitForTimeout(9000);
        const belly = await p.evaluate(() => { const c = RS.player.bellyModel.cache; let n = 0; for (let s = 0; s <= 5; s++) if (c[s] && c[s].skin && c[s].tee) n++; return n; });
        console.log(`  ${place}: ${r.calls} draws (budget ${BUDGET[place]}), ${r.signSheets} sign sheets (${r.signsLeft} single signs left), ${r.pairs} physics pairs, ${r.glowing} glowing food in ${r.haloLayers} draw, belly looks ready ${belly}/6, ${sh.built} shaders built in play (${sh.warm.programs} warmed in ${sh.warm.ms}ms)`);
        C.ok(r.calls <= BUDGET[place], `${place}: ${r.calls} draw calls (budget ${BUDGET[place]})`);
        C.ok(r.haloSprites === 0 && r.haloLayers === 1, `${place}: food glow isn't one layer (${r.haloSprites} sprites, ${r.haloLayers} layers)`);
        C.ok(r.signsLeft <= 2, `${place}: ${r.signsLeft} signs weren't packed onto sheets`);
        C.ok(r.stillPairs === 0, `${place}: ${r.stillPairs} physics pairs where nothing can move are still being tested`);
        if (r.jointsAll) C.ok(r.jointsAnim === 0 && r.jointsRag === r.jointsAll && r.jointsBack === 0, `${place}: joints in the world: animated ${r.jointsAnim}, ragdoll ${r.jointsRag}/${r.jointsAll}, back ${r.jointsBack}`);
        C.ok(r.pushDiff === 0, `${place}: keeping people out of the furniture gave a different answer at ${r.pushDiff} of 3000 spots`);
        if (r.navDiff !== null) C.ok(r.navDiff === 0, `${place}: ${r.navDiff} of 40 routes differ from a fresh search`);
        C.ok(belly === 6, `${place}: only ${belly} of 6 belly looks made after 9s (growing would stop the game to make one)`);
        C.ok(!p.errors.length, `${place}: page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
      } catch (e) { C.ok(false, `${place}: ${e.message.slice(0, 300)}`); }
      await p.context().close();
    }
  } finally { await b.close(); }
  return C.fails;
}
