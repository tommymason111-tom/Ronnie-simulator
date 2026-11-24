// THE PINT (js/pint.js): one detailed Guinness for the whole game, held like a real glass.
//   - static: every place a pint is made uses pint.js (no pint glasses built by hand anywhere else)
//   - the model: sensible vertex counts (a far-away version for Run the Pub's crowds), the near one detailed, the
//     drinking one's level really drops, the stout never pokes out of the glass, every shape tagged
//   - every pint in the game is the shared one: a food pint (near and far), the squad's prop, Prop Hunt's pint, the emotes,
//     Aidan's attack
//   - held: the squad's pints (Aidan, Connor) are in the hand (within a few centimetres) and upright, fingers closed on it
//     only as far as the scanned skin can take (no triangle stretched past 1.5x its area);
//     an emote's pints (Connor's round, Aidan's Guinness dream) are in the hand and upright until he drinks, tipped while
//     he drinks, and the level drops
//   - Aidan's attack: his hand brings the pint in, it tips and drains, the moustache, the dizzy
// on an upright phone (390x844)
import fs from 'fs';
import path from 'path';
import { launch, newPage, startGame, checker, ROOT } from './lib/game.mjs';

export default async function () {
  const C = checker('pint');
  // ---- static: one builder
  const src = (f) => fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
  for (const [f, want] of [['foods.js', /from '\.\/pint\.js'/], ['emotes.js', /from '\.\/pint\.js'/], ['modes.js', /from '\.\/pint\.js'/], ['squad.js', /makeProp[\s\S]{0,200}new Item\('pint'\)/], ['prophunt.js', /itemParts\('pint'\)/]])
    C.ok(want.test(src(f)), `${f} doesn't take its pint from pint.js (${want})`);
  { const e = src('emotes.js'); C.ok(!/function pintG\b/.test(e) && !/CylinderGeometry\(0\.04, 0\.032, 0\.15/.test(e), 'emotes.js still builds its own pint glass'); }
  for (const f of fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js') && f !== 'pint.js')) { const s = src(f); C.ok(!/function pint\w*Geo\s*\(/.test(s) && !/pintGeo\s*\(\)\s*\{/.test(s), `${f} has its own pint geometry builder: use pint.js`); }

  const b = await launch();
  try {
    const p = await newPage(b, { width: 390, height: 844, mobile: true });
    await startGame(p, { place: 'pub', mode: 'everyone' });
    // ---- the model, and everything using it
    const m = await p.evaluate(async () => { RS.renderer.setAnimationLoop(null); RS.sim(2);
      const P = await import('/js/pint.js'), F = await import('/js/foods.js'), T = RS.THREE;
      const st = P.pintStats(), hi = P.pintGeo(), low = P.pintGeoLow();
      // a food pint: its near and far shapes
      const it = new F.Item('pint'), lod = it.obj.children.find(c => c.isLOD), lv = lod ? lod.levels.map(l => l.object.geometry) : [];
      const parts = F.itemParts('pint');
      // the stout stays inside the glass at every level, and drops
      const mdl = P.pintModel(), stout = mdl.getObjectByName('stout'), head = mdl.getObjectByName('head'); let out = 0, tops = [];
      for (const lvl of [1, 0.7, 0.42, 0.1]) { P.setPintLevel(mdl, lvl); const pa = stout.geometry.attributes.position; let top = -1;
        for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i); top = Math.max(top, y); if (Math.hypot(x, z) > P.pintRadius(y) + 1e-4) out++; } tops.push(+top.toFixed(4)); }
      // the squad's props
      const props = RS.cast.filter(c => c.prop && (c.id === 'aidan' || c.id === 'connor')).map(c => { let g = null; c.prop.traverse(o => { if (o.isLOD) g = o.levels.map(l => l.object.geometry.userData.pint); }); return [c.id, g]; });
      return { st, tagged: hi.userData.pint === 'hi' && low.userData.pint === 'low', lod: lv[0] === hi && lv[1] === low, parts: parts.length === 1 && parts[0][0] === hi,
        out, tops, headVis: head.visible, props, hiBox: (hi.computeBoundingBox(), [hi.boundingBox.min.y, hi.boundingBox.max.y, hi.boundingBox.max.x].map(v => +v.toFixed(3))) }; });
    console.log(`  pint: ${m.st.hi} vertices near, ${m.st.low} far; size ${JSON.stringify(m.hiBox)}; stout tops ${m.tops}`);
    C.ok(m.st.hi > 1500 && m.st.hi < 9000, `the near pint's vertex count isn't sensible (${m.st.hi})`);
    C.ok(m.st.low > 200 && m.st.low < 2400 && m.st.low < m.st.hi / 2, `the far pint isn't light enough for a crowd (${m.st.low} vs ${m.st.hi})`);
    C.ok(m.tagged && m.lod && m.parts, `the food pint / Prop Hunt's pint aren't the shared pint (${JSON.stringify({ tagged: m.tagged, lod: m.lod, parts: m.parts })})`);
    C.ok(m.out === 0, `the stout pokes out through the glass at ${m.out} points as it drains`);
    C.ok(m.tops.every((t, i) => !i || t < m.tops[i - 1] - 0.01), `the stout's level doesn't drop: ${m.tops}`);
    C.ok(Math.abs(m.hiBox[0] + 0.075) < 0.004 && Math.abs(m.hiBox[1] - 0.076) < 0.004 && m.hiBox[2] < 0.05, `the pint's not pint-sized: ${m.hiBox}`);
    C.ok(m.props.length >= 2 && m.props.every(([, g]) => g && g[0] === 'hi' && g[1] === 'low'), `the squad's pints aren't the shared pint: ${JSON.stringify(m.props)}`);
    // ---- the squad hold their pints in their hands, upright, fingers round them
    const h = await p.evaluate(() => { RS.sim(1); const T = RS.THREE, out = [];
      for (const c of RS.cast.filter(c => c.prop && (c.id === 'aidan' || c.id === 'connor'))) { let worst = 0, tilt = 0;
        for (let i = 0; i < 40; i++) { RS.sim(1 / 30); if (!c.prop.visible) continue; const hand = c.rag.grip('lArmR', new T.Vector3()); worst = Math.max(worst, hand.distanceTo(c.prop.position) / (c.rag.height / 1.68));
          const up = new T.Vector3(0, 1, 0).applyQuaternion(c.prop.quaternion); tilt = Math.max(tilt, Math.acos(Math.min(1, up.y))); }
        out.push({ id: c.id, worst: +worst.toFixed(3), tilt: +tilt.toFixed(3), curl: c.rag.handPose && c.rag.handPose.lArmR ? c.rag.handPose.lArmR.curl : null }); }
      return out; });
    console.log('  held:', JSON.stringify(h));
    C.ok(h.length >= 2, 'Aidan and Connor aren\'t carrying their pints');
    for (const r of h) { C.ok(r.worst < 0.085, `${r.id}'s pint isn't in his hand (${r.worst}m from the middle of it)`); C.ok(r.worst > 0.02, `${r.id}'s pint is through his palm (${r.worst}m from the middle of it)`);
      C.ok(r.tilt < 0.05, `${r.id}'s pint isn't upright (${r.tilt} rad)`); C.ok(r.curl === null || r.curl > 0.02, `${r.id}'s fingers aren't closed on his pint (curl ${r.curl})`); }
    // ---- the fingers round the glass don't tear the scanned skin: no triangle of the hand stretched past 1.5x its area
    const st = await p.evaluate(async () => { const T = RS.THREE, { GLASS_CURL } = await import('/js/squad.js'), out = [];
      for (const c of RS.cast.filter(c => c.prop && c.rag.handPose && c.rag.handPose.lArmR && !['phone', 'rod', 'jug'].includes(c.def && c.def.look.prop))) {
        const rag = c.rag, mesh = rag.mesh, g = mesh.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, idx = g.index.array, fb = new Set();
        rag.extraBones.forEach((eb, j) => { if (eb.name === 'lArmR' && eb.kind !== 'hand') fb.add(rag.defs.length + j); });
        const tris = []; for (let f = 0; f < idx.length; f += 3) { let k = 0; for (let v = 0; v < 3; v++) for (let s2 = 0; s2 < 4; s2++) if (fb.has(si.getComponent(idx[f + v], s2)) && sw.getComponent(idx[f + v], s2) > 0.01) k = 1; if (k) tris.push(f); }
        const a = new T.Vector3(), b2 = new T.Vector3(), c2 = new T.Vector3(), area = () => { RS.scene.updateMatrixWorld(true); mesh.skeleton.update(); return tris.map(f => { mesh.getVertexPosition(idx[f], a); mesh.getVertexPosition(idx[f + 1], b2); mesh.getVertexPosition(idx[f + 2], c2); return b2.sub(a).cross(c2.sub(a)).length() / 2; }); };
        const hp = rag.handPose.lArmR, was = hp.curl; hp.curl = 0; rag.sync(); const a0 = area(); hp.curl = GLASS_CURL; rag.sync(); const a1 = area(); hp.curl = was; rag.sync();
        let mx = 0; a1.forEach((v, i) => { if (a0[i] > 1e-9) mx = Math.max(mx, v / a0[i]); }); out.push({ id: c.id, tris: tris.length, worst: +mx.toFixed(2), curl: GLASS_CURL }); }
      return out; });
    console.log('  finger skin:', JSON.stringify(st));
    C.ok(st.length >= 2 && st.every(r => r.tris > 50), `couldn't measure the fingers' skin: ${JSON.stringify(st)}`);
    for (const r of st) C.ok(r.worst <= 1.5, `${r.id}'s fingers round the glass stretch the skin ${r.worst}x (keep it under 1.5x: GLASS_CURL in squad.js)`);
    // ---- the emotes: Connor's round (upright, in both hands), Aidan's Guinness dream (tipped when he drinks, the level drops)
    const e = await p.evaluate(async () => { const T = RS.THREE, P = RS.player, res = {};
      for (const [ch, em, secs] of [['connor', 'round', 2.4], ['aidan', 'guinness', 3.4]]) {
        const at = P.head.clone().add(new T.Vector3(P.fwd.x, 0, P.fwd.z).normalize().multiplyScalar(2.3)), pup = RS.net.makeAvatar({ id: 'pt_' + ch, name: ch, char: ch });
        const q = new T.Quaternion().setFromEuler(new T.Euler(0, Math.atan2(at.x - P.head.x, at.z - P.head.z), 0)), pose = { t: 'p', c: ch, h: [at.x, 1.62, at.z], q: [q.x, q.y, q.z, q.w], l: [at.x, 1, at.z], rh: [at.x, 1.05, at.z], s: 1, st: 0, flat: 1 };
        const step = (s) => { for (let t = 0; t < s; t += 1 / 30) { RS.sim(1 / 30); pup.update(1 / 30, pose); } };
        for (let i = 0; i < 100 && !(pup.c && pup.c.rag && pup.c.rag.mesh); i++) { await new Promise(r => setTimeout(r, 100)); step(0.1); }
        step(1); pup.doEmote(em); const r = { far: 0, tiltIdle: 0, tiltDrink: 0, minLvl: 1, n: 0 };
        for (let t = 0; t < secs; t += 1 / 30) { step(1 / 30); const E = pup.emote; if (!E || !E.glasses) continue;
          for (const [S, gl] of E.glasses) { const p2 = gl.p; if (!p2.visible) continue; r.n++; if (!gl.wr) continue; r.far = Math.max(r.far, gl.wr.distanceTo(p2.position));      // (from the wrist of the hand round it)
            const tilt = Math.acos(Math.min(1, new T.Vector3(0, 1, 0).applyQuaternion(p2.quaternion).y)); if (gl.drink > 0.5) r.tiltDrink = Math.max(r.tiltDrink, tilt); else if (gl.drink === 0) r.tiltIdle = Math.max(r.tiltIdle, tilt);
            r.minLvl = Math.min(r.minLvl, p2.userData.level ?? 1); } }
        res[em] = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, +(+v).toFixed(3)])); pup.dispose(); }
      return res; });
    console.log('  emotes:', JSON.stringify(e));
    C.ok(e.round && e.round.n > 20 && e.round.far < 0.11 && e.round.tiltIdle < 0.2, `Connor's round: pints not in his hands / not upright (${JSON.stringify(e.round)})`);
    C.ok(e.guinness && e.guinness.n > 20 && e.guinness.far < 0.11 && e.guinness.tiltDrink > 0.8 && e.guinness.minLvl < 0.3, `Aidan's Guinness dream: not held, tipped or drunk (${JSON.stringify(e.guinness)})`);
    // ---- Aidan's attack: the pint in his hand comes in, tips, drains; the moustache; the dizzy
    const a = await p.evaluate(async () => { const D = RS.director, A = RS.cast.find(c => c.id === 'aidan'), P = RS.player; if (!A) return { none: true };
      D.stun(A, 'beer'); const cam = P.camera, find = (n) => { let o = null; cam.traverse(x => { if (x.name === n) o = x; }); return o; };
      const rig = find('pint in hand'), pint = rig && rig.getObjectByName('pint'), hands = rig ? ['farHand', 'nearHand'].map(n => !!rig.getObjectByName(n)) : [];
      const lv = [], rot = []; for (let i = 0; i < 6; i++) { RS.sim(0.35); await new Promise(r => setTimeout(r, 30)); lv.push(+(pint ? pint.userData.level : 1).toFixed(2)); rot.push(+(rig ? Math.acos(new RS.THREE.Vector3(0, 1, 0).applyQuaternion(rig.quaternion).y) : 0).toFixed(2)); }
      await new Promise(r => setTimeout(r, 2700)); RS.sim(0.2);
      return { rig: !!rig, hands, lv, rot, dizzy: P.fx ? +(P.fx.dizzy || 0).toFixed(2) : -1 }; });
    console.log('  attack:', JSON.stringify(a));
    C.ok(a.rig && a.hands.every(Boolean), `Aidan's attack: no pint in his hand in front of you (${JSON.stringify(a)})`);
    C.ok(a.lv && Math.min(...a.lv) < 0.3 && a.lv[0] > 0.9, `Aidan's attack: the pint doesn't drain (${a.lv})`);
    C.ok(a.rot && Math.max(...a.rot) > 1.2, `Aidan's attack: the glass never tips up (${a.rot})`);
    C.ok(a.dizzy > 0, `Aidan's attack: not dizzy after the pint (${a.dizzy})`);
    C.ok(!p.errors.length, 'page errors: ' + p.errors.slice(0, 3).join(' | '));
    await p.context().close();
  } finally { await b.close(); }
  return C.fails;
}
