// GETTING UP: knock every character over (hard, in a random direction) in six places and modes, three times, and watch
// every frame while they get up and go back to what they were doing: nobody jumps more than 0.65m in a frame (a step out of a corner of the furniture is all) (they
// used to get up and vanish back into their chair, their till or their job, metres away). They walk back, and glide the
// last bit into a seat. (An attack starting is left out: it pops the attacker in front of you on purpose)
import { launch, newPage, startGame, sleep, checker } from './lib/game.mjs';
export default async function () { const C = checker('getup'), b = await launch();
  try { for (const [place, mode] of [['pub', 'roam'], ['pub', 'everyone'], ['garden', 'roam'], ['shop', 'roam'], ['restaurant', 'date'], ['pub', 'runpub']]) {
    const p = await newPage(b, { width: 800, height: 600 }); await startGame(p, { place, mode }); await sleep(1000);
    const r = await p.evaluate(() => { RS.renderer.setAnimationLoop(null); const out = [], T = RS.THREE;
      for (let round = 0; round < 3; round++) {
        for (const c of RS.cast) { if (!c.rag || c.down) continue; c.knockOut('hit'); const pel = c.rag.parts.pelvis.body; const a = Math.random() * 6.28, sp = 4 + Math.random() * 6; pel.velocity.set(Math.cos(a) * sp, 2 + Math.random() * 3, Math.sin(a) * sp); }
        const last = new Map(), info = new Map();
        for (let f = 0; f < 30 * 14; f++) { RS.sim(1 / 30);
          for (const c of RS.cast) { if (!c.rag) continue; const rt = c.rag.root, pel = c.rag.parts.pelvis.body.position; const now = { x: rt.x, z: rt.z, px: pel.x, pz: pel.z, s: c.tripping ? 'act' : c.state, m: c.rag.mode };      /* (Tommy's ball attack counts as an attack too) */
            const L = last.get(c); if (L && L.m !== 'ragdoll' && now.m !== 'ragdoll' && L.s !== 'act' && now.s !== 'act') { const d = Math.hypot(now.px - L.px, now.pz - L.pz); if (d > 0.65) out.push(`${c.id} round ${round} f${f}: pelvis jumped ${d.toFixed(2)}m (${L.s}/${L.m} -> ${now.s}/${now.m})`); }
            if (L && L.s === 'ko' && now.s === 'recover') { const d = Math.hypot(now.x - L.px, now.z - L.pz); if (d > 1.2) out.push(`${c.id} round ${round}: stood up ${d.toFixed(2)}m from where it lay`); }
            last.set(c, now); } } }
      return out; });
    console.log(`  ${place}/${mode}: ${r.length} jumps`); C.ok(!r.length, `${place}/${mode}: characters jumped about after being knocked over: ${r.slice(0, 4).join(' | ')}`); C.ok(!p.errors.length, `${place}/${mode}: page errors ${p.errors.slice(0, 2).join(' | ')}`);
    await p.close(); } } finally { await b.close(); } return C.fails; }
