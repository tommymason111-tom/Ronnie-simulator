// LOCOMOTION (js/gait.js): walking, jogging and sprinting, for a thin body and the biggest one, and another player's body
// run from the network. On an upright phone, on a fake clock (1/60 s steps), in the empty test grid:
// - a foot on the floor doesn't slide (its point of contact, heel or ball, stays put through stance)
// - cadence and stride both grow with speed (walk < jog < sprint), and stay in the range people really move at
// - the arms swing against the legs (left arm back when the left leg's forward)
// - the elbows bend more at a sprint (~90 degrees) than walking
// - the knees bend the right way (forwards), every ankle is where the IK put it (no stretched or detached limbs), no NaN
// - stood still the feet stay planted, and turning on the spot they step round (not sliding round on their heels)
// SHOTS=dir saves a side-on strip of each run.
import fs from 'fs';
import { launch, newPage, startGame, checker } from './lib/game.mjs';
const SHOTS = process.env.SHOTS || '';

export default async function () {
  const C = checker('locomotion'), b = await launch();
  try {
    const p = await newPage(b, { width: 390, height: 844, mobile: true });
    await startGame(p, { place: 'grid', mode: 'roam', dev: true });
    const r = await p.evaluate(async (shots) => {
      RS.renderer.setAnimationLoop(null);
      const T = RS.THREE, out = { bad: [], runs: [], shots: {} };
      const { SquadMember } = await import('./js/squad.js');
      const fat = new SquadMember(RS.scene, RS.room, RS.physics, 'ronnie', [0, 0, 0], RS.director); RS.cast.push(fat);
      for (let i = 0; i < 300 && !fat.rag.modelLoaded; i++) await new Promise(res => setTimeout(res, 100));
      for (let i = 0; i < 300 && !RS.tommy.rag.modelLoaded; i++) await new Promise(res => setTimeout(res, 100));
      if (!fat.rag.footAxes || !RS.tommy.rag.footAxes) out.bad.push('a scanned body has no feet of its own (ragdoll splitFeet)');
      for (const o of RS.cast) if (o.rag) { o.active = false; o.rag.placeAt(25, 25, 0); }
      RS.player.rig.position.set(15, 0, 15);
      const V = new T.Vector3(), Q = new T.Quaternion(), V2 = new T.Vector3();
      // a point of the body (bind pose, metres) where it's drawn now
      const at = (rg, boneIdx, centre, pt, outV) => { const bn = rg.bones[boneIdx]; return outV.copy(pt).sub(centre).applyQuaternion(bn.quaternion).add(bn.position); };
      // (the bones as drawn this frame: the physics bodies have been carried on by the physics step since)
      const bone = (rg, name) => rg.bones[rg.list.indexOf(rg.parts[name])];
      const dirOf = (rg, name) => new T.Vector3().copy(rg.parts[name].def.dir).applyQuaternion(bone(rg, name).quaternion);
      const ptOf = (rg, name, pt) => { const bn = bone(rg, name); return pt.clone().sub(rg.parts[name].def.center).applyQuaternion(bn.quaternion).add(bn.position); };
      const cam = new T.PerspectiveCamera(30, 0.5, 0.05, 80);
      // one run: drive them in a straight line at v (their real walking: moveVel), or a network player at v
      const run = async (label, c, v, drive) => {
        const rg = drive === 'net' ? c.c.rag : c.rag, g = drive === 'net' ? null : c.gait; rg.placeAt(0, -14, 0);
        let t0 = 0;
        if (drive === 'npc') { c.state = 'act'; c.actUpdate = (dt) => { t0 += dt; const k = Math.min(1, t0 / 0.6); rg.moveVel.set(0, 0, v * k); c.walkPose(dt, v * k); }; }
        const step = (dt) => { if (drive === 'net') { t0 += dt; const k = Math.min(1, t0 / 0.6); c.netZ = (c.netZ ?? -14) + v * k * dt; const q = [0, 1, 0, 0];
            c.update(dt, { h: [0, 1.62, c.netZ], q, rh: [-0.25, 1.05, c.netZ + 0.15], l: [0.25, 1.0, c.netZ + 0.1], s: 1, st: c.st || 0, flat: 1 }); }
          RS.player.rig.position.set(3, 0, rg.root.z); RS.sim(dt, dt); };      // (watched from close by: far away a body takes a cheaper path)
        const body = drive === 'net' ? c.c : c, R = body.rag;
        if (drive === 'net') c.netZ = -14;
        for (let i = 0; i < 120; i++) step(1 / 60);
        const gg = drive === 'net' ? body.gait : g;
        const legs = ['L', 'R'].map(S => { const name = 'lLeg' + S, fa = R.footAxes && R.footAxes[name], d = R.parts[name].def; return { S, name, fa, centre: d.center, bi: R.footBone ? R.footBone[name] : -1, heel: fa ? new T.Vector3(fa.ankle.x, fa.sole, fa.heel) : null, ball: fa ? new T.Vector3(fa.ankle.x, fa.sole, fa.ball) : null, ank: fa ? fa.ankle : d.b }; });
        const st = { slide: [0, 0], slideAt: ['', ''], lands: 0, t: 0, hipArm: [], elbow: [], kneeBad: 0, reach: 0, nan: 0, stretch: 0, bob: [] };
        const prevC = [null, null], wasSt = [true, true];
        const tiles = [];
        const N = 240;
        for (let f = 0; f < N; f++) {
          step(1 / 60); st.t += 1 / 60;
          for (let i = 0; i < 2; i++) {
            const ft = gg.feet[i], L = legs[i];
            if (ft.stance && !wasSt[i]) st.lands++;
            // the contact point: the lower of the heel and the ball of the foot, as drawn
            if (L.fa && L.bi >= 0) {
              const h = at(R, L.bi, L.centre, L.heel, new T.Vector3()), bl = at(R, L.bi, L.centre, L.ball, new T.Vector3()), cp = h.y < bl.y ? h : bl; cp.which = h.y < bl.y ? 'h' : 'b';      // (whichever it's rolling on: the heel just after landing, the ball later)
              st.lowY = Math.min(st.lowY ?? 9, cp.y);
              if (ft.stance && wasSt[i] && prevC[i] && prevC[i].which === cp.which && cp.y < 0.06) { st.checked = (st.checked || 0) + 1; const d = Math.hypot(cp.x - prevC[i].x, cp.z - prevC[i].z); st.slide[i] += d; if (d > 0.012) st.slideAt[i] = `frame ${f} moved ${(d * 100).toFixed(1)}cm (ph ${gg.ph.toFixed(2)})`; }
              prevC[i] = ft.stance ? cp : null;
            }
            wasSt[i] = ft.stance;
            // the knee: in front of the line from hip to ankle (it bends forwards), seen along the way the foot points
            const u = R.parts['uLeg' + L.S], hipW = ptOf(R, 'uLeg' + L.S, u.def.a), kneeW = ptOf(R, 'uLeg' + L.S, u.def.b), ankW = ptOf(R, L.name, L.ank);
            const fwd = new T.Vector3(Math.sin(ft.fyaw), 0, Math.cos(ft.fyaw)), mid = hipW.clone().lerp(ankW, 0.5), bend = kneeW.clone().sub(mid).dot(fwd);
            if (bend < -0.01) st.kneeBad++;
            // the ankle where the IK put it (the leg reaches its foot: nothing stretched, nothing left hanging)
            const want = new T.Vector3(ft.ax, ft.ay, ft.az), miss = ankW.distanceTo(want); if (miss > st.reach) { st.reach = miss; st.reachAt = `${ft.stance ? 'stance' : 'swing w' + ft.w.toFixed(2)} ph ${gg.ph.toFixed(2)} hipToAnkle ${hipW.distanceTo(want).toFixed(3)}`; }
            // the thigh and shin keep their lengths
            const lA = ptOf(R, L.name, R.parts[L.name].def.a);
            st.stretch = Math.max(st.stretch, lA.distanceTo(kneeW), Math.abs(hipW.distanceTo(kneeW) - u.def.a.distanceTo(u.def.b)));
            // arms against legs: the thigh's forward swing and the same side's upper arm's
            const th = dirOf(R, 'uLeg' + L.S), ar = dirOf(R, 'uArm' + L.S), yawF = new T.Vector3(Math.sin(R.yaw), 0, Math.cos(R.yaw));
            st.hipArm.push([th.dot(yawF), ar.dot(yawF)]);
            const ua = dirOf(R, 'uArm' + L.S), la = dirOf(R, 'lArm' + L.S); st.elbow.push(Math.acos(Math.max(-1, Math.min(1, ua.dot(la)))));
          }
          st.bob.push(R.bob);
          for (const part of R.list) { const q = part.body.position; if (!isFinite(q.x + q.y + q.z)) st.nan++; }
          if (shots && f % 6 === 0 && tiles.length < 10) { const pv = R.pos('pelvis', new T.Vector3()); cam.position.set(pv.x + 5.2, 0.95, pv.z); cam.lookAt(pv.x, 0.88, pv.z); RS.renderer.setPixelRatio(1); RS.renderer.setSize(200, 400, false); RS.renderer.render(RS.scene, cam); tiles.push(RS.renderer.domElement.toDataURL('image/jpeg', 0.85)); }
        }
        const corr = (a) => { const n = a.length, mx = a.reduce((s, x) => s + x[0], 0) / n, my = a.reduce((s, x) => s + x[1], 0) / n; let sxy = 0, sxx = 0, syy = 0; for (const [x, y] of a) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; } return sxy / Math.sqrt(sxx * syy || 1); };
        const cadence = st.lands / st.t * 60, stride = v / (st.lands / st.t / 2);
        const res = { label, v, cadence: +cadence.toFixed(1), stride: +stride.toFixed(2), slide: st.slide.map(x => +(x * 100).toFixed(2)), slideAt: st.slideAt, armCorr: +corr(st.hipArm).toFixed(2), elbow: +(st.elbow.reduce((s, x) => s + x, 0) / st.elbow.length * 180 / Math.PI).toFixed(1), kneeBad: st.kneeBad, reach: +(st.reach * 100).toFixed(2), reachAt: st.reachAt, stretch: +(st.stretch * 1000).toFixed(2), nan: st.nan, bob: [+(Math.min(...st.bob) * 100).toFixed(1), +(Math.max(...st.bob) * 100).toFixed(1)], lands: st.lands, checked: st.checked || 0, lowY: +((st.lowY ?? 9) * 100).toFixed(1) };
        if (tiles.length) { const cv = document.createElement('canvas'); cv.width = 200 * tiles.length; cv.height = 400; const g2 = cv.getContext('2d');
          for (let i = 0; i < tiles.length; i++) { const im = new Image(); im.src = tiles[i]; await im.decode(); g2.drawImage(im, i * 200, 0); }
          out.shots[label.replace(/\W+/g, '_')] = cv.toDataURL('image/jpeg', 0.85); RS.renderer.setSize(innerWidth, innerHeight, false); }
        if (drive === 'npc') { c.state = 'idle'; c.actUpdate = null; rg.moveVel.set(0, 0, 0); }
        return res;
      };
      const thin = RS.tommy;
      fat.rag.fat = 1; fat.heavy = 1;
      for (const [who, c] of [['thin', thin], ['fat', fat]]) for (const [gaitName, v] of [['walk', 1.3], ['jog', 2.6], ['sprint', 4.9]]) out.runs.push(await run(`${who} ${gaitName}`, c, v, 'npc'));
      // another player, from the network (their body follows where they are: the speed comes from that)
      const av = RS.net.makeAvatar({ id: 'loco', name: 'RUNNER', char: 'lewis' });
      for (let i = 0; i < 300 && !av.c.rag.modelLoaded; i++) await new Promise(res => setTimeout(res, 100));
      for (const [gaitName, v] of [['walk', 1.3], ['jog', 2.34], ['sprint', 4.9]]) { av.first = true; av.netZ = -14; out.runs.push(await run(`remote ${gaitName}`, av, v, 'net')); }
      // stood still: feet planted (nothing moves at all), then turned on the spot: they step round
      { const c = thin, rg = c.rag; rg.placeAt(0, 0, 0); c.state = 'idle'; c.faceYaw = 0; c.lookOverride = 0;
        for (let i = 0; i < 60; i++) RS.sim(1 / 60, 1 / 60);
        const fp = () => c.gait.feet.map(f => [f.px, f.pz]); const a = fp(); for (let i = 0; i < 120; i++) RS.sim(1 / 60, 1 / 60); const b2 = fp();
        const moved = Math.max(...a.map((x, i) => Math.hypot(x[0] - b2[i][0], x[1] - b2[i][1])));
        if (moved > 0.005) out.bad.push(`stood still, a foot moved ${(moved * 100).toFixed(1)}cm`);
        c.faceYaw = Math.PI * 0.9; let lands = 0; const was = c.gait.feet.map(f => f.stance);
        for (let i = 0; i < 180; i++) { RS.sim(1 / 60, 1 / 60); c.gait.feet.forEach((f, j) => { if (f.stance && !was[j]) lands++; was[j] = f.stance; }); }
        const yawErr = c.gait.feet.map(f => Math.abs(Math.atan2(Math.sin(f.pyaw - rg.yaw), Math.cos(f.pyaw - rg.yaw))));
        out.turn = { lands, yawErr: yawErr.map(x => +x.toFixed(2)) };
        if (lands < 2) out.bad.push(`turning round on the spot took ${lands} steps (should step round)`);
        if (Math.max(...yawErr) > 0.6) out.bad.push(`after turning round the feet still point ${Math.max(...yawErr).toFixed(2)} rad away from the body`); }
      try { av.dispose(); } catch (e) {}
      // the biggest belly sprinting and sat down: the upper thigh never comes up through the shirt (thigh skin more than
      // 1.5cm in front of the belly's own surface, well above the hem: the shorts tore up through the shirt before the
      // belly was made to ride up with the knee, ragdoll.js bellyRides / addBellyMorph)
      out.poke = {};
      for (const who of ['ronnie', 'lewis']) {
        const c = who === 'ronnie' ? fat : new SquadMember(RS.scene, RS.room, RS.physics, who, [0, 0, 0], RS.director); if (c !== fat) RS.cast.push(c);
        for (let i = 0; i < 300 && !c.rag.modelLoaded; i++) await new Promise(res => setTimeout(res, 100));
        const r = c.rag, M = r.mesh, G = M.geometry, si = G.attributes.skinIndex, sw = G.attributes.skinWeight, ps = G.attributes.position, nr = G.attributes.normal, D = r.defs, kH = r.height / 1.68;
        r.fat = 1; c.heavy = 1; c.active = false;
        const bi = (n) => D.findIndex(d => d.name === n), hipY = r.parts.uLegL.def.a.y, hz = r.parts.uLegL.def.a.z;
        const share = (i, set) => { let t = 0; for (let j = 0; j < 4; j++) if (set.includes(si.getComponent(i, j))) t += sw.getComponent(i, j); return t; };
        const TH = [bi('uLegL'), bi('uLegR')], TO = [bi('pelvis'), bi('chest')], thighV = [], bellyV = [];
        for (let i = 0; i < ps.count; i++) { const y = ps.getY(i), z = ps.getZ(i); if (z < hz) continue;
          if (share(i, TH) > 0.9 && y > hipY - 0.15 * kH && y < hipY + 0.05 * kH) thighV.push(i);
          else if (share(i, TO) > 0.9 && y > hipY + 0.12 * kH && y < hipY + 0.35 * kH && nr.getZ(i) > 0.3) bellyV.push(i); }
        const P1 = new T.Vector3(), P2 = new T.Vector3(), N2 = new T.Vector3(), cq = new T.Quaternion();
        const poke = () => { r.group.updateMatrixWorld(true); M.skeleton.update(); const bp = bellyV.map(i => M.getVertexPosition(i, new T.Vector3())); let n = 0;
          const q = r.parts.chest.body.quaternion; cq.set(q.x, q.y, q.z, q.w);
          for (const i of thighV) { M.getVertexPosition(i, P1); let best = 1e9, bk = -1; for (let k = 0; k < bp.length; k++) { const d = P1.distanceToSquared(bp[k]); if (d < best) { best = d; bk = k; } }
            if (bk < 0 || best > 0.0144) continue; N2.fromBufferAttribute(nr, bellyV[bk]).applyQuaternion(cq); if (P2.subVectors(P1, bp[bk]).dot(N2) > 0.015) n++; }
          return n; };
        let sprint = 0, sat = 0, t0 = 0; r.placeAt(0, -14, 0);
        c.state = 'act'; c.actUpdate = (dt) => { t0 += dt; const k = Math.min(1, t0 / 0.6); r.moveVel.set(0, 0, 4.9 * k); c.walkPose(dt, 4.9 * k); };
        for (let f = 0; f < 150; f++) { RS.player.rig.position.set(0, 0, r.root.z + 7); RS.sim(1 / 60, 1 / 60); if (f > 90 && f % 3 === 0) sprint = Math.max(sprint, poke()); }
        // sat down: the deepest bend the hips get (the seats test's way of sitting someone)
        c.state = 'idle'; c.actUpdate = null; r.moveVel.set(0, 0, 0); c.seated = true; c.faceYaw = 0; c.lookOverride = 0; r.placeAt(0, 0, 0);
        for (let f = 0; f < 60; f++) { RS.sim(1 / 60, 1 / 60); }
        sat = poke(); c.seated = false;
        out.poke[who] = { sprint, sat, thigh: thighV.length };
      }
      return out;
    }, SHOTS);
    for (const x of r.runs) console.log('   ', JSON.stringify(x));
    console.log('    turn', JSON.stringify(r.turn));
    r.bad.forEach(x => C.ok(false, x));
    console.log('    poke-through', JSON.stringify(r.poke));
    for (const [who, x] of Object.entries(r.poke || {})) { C.ok(x.thigh > 50, `${who}: found only ${x.thigh} upper-thigh points to check`); C.ok(x.sprint < 120 && x.sat < 120, `${who} at the biggest: ${Math.max(x.sprint, x.sat)} points of the upper thigh came up through the shirt (${x.sprint} sprinting, ${x.sat} sat)`); }
    const by = (l) => r.runs.find(x => x.label === l);
    for (const who of ['thin', 'fat', 'remote']) {
      const w = by(`${who} walk`), j = by(`${who} jog`), s = by(`${who} sprint`);
      C.ok(w.cadence < j.cadence && j.cadence < s.cadence, `${who}: cadence doesn't grow with speed (${w.cadence}, ${j.cadence}, ${s.cadence})`);
      C.ok(w.stride < j.stride && j.stride < s.stride, `${who}: stride doesn't grow with speed (${w.stride}, ${j.stride}, ${s.stride})`);
      C.ok(w.cadence > 80 && w.cadence < 140, `${who} walk: cadence ${w.cadence} steps/min (people walk at ~100-125)`);
      C.ok(s.cadence > 150 && s.cadence < 240, `${who} sprint: cadence ${s.cadence} steps/min`);
      C.ok(s.elbow > w.elbow + 35, `${who}: elbows bend ${w.elbow} deg walking and only ${s.elbow} sprinting`);
      C.ok(s.elbow > 65, `${who} sprint: elbows only bent ${s.elbow} deg (a sprint's ~90)`);
      for (const x of [w, j, s]) {
        C.ok(x.armCorr < -0.4, `${x.label}: arms don't swing against the legs (correlation ${x.armCorr})`);
        C.ok(x.checked > 20, `${x.label}: only ${x.checked} frames of planted feet measured (lowest contact ${x.lowY}cm)`);
        C.ok(Math.max(...x.slide) < 3, `${x.label}: a planted foot slid ${Math.max(...x.slide)}cm over the run (${x.slideAt.join(' / ')})`);
        C.ok(x.kneeBad === 0, `${x.label}: a knee bent backwards ${x.kneeBad} times`);
        C.ok(x.reach < 1.5, `${x.label}: an ankle ended up ${x.reach}cm from where its foot should be (a stretched or short leg): ${x.reachAt}`);
        C.ok(x.stretch < 1, `${x.label}: a leg changed length by ${x.stretch}mm`);
        C.ok(x.nan === 0, `${x.label}: NaN in the body`);
        C.ok(x.bob[0] > -25, `${x.label}: the hips dropped ${-x.bob[0]}cm`);
      }
    }
    C.ok(by('fat sprint').stride < by('thin sprint').stride, `the biggest body's sprint stride (${by('fat sprint').stride}) isn't shorter than a thin one's (${by('thin sprint').stride})`);
    if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); for (const [k, u] of Object.entries(r.shots)) fs.writeFileSync(`${SHOTS}/loco_${k}.jpg`, Buffer.from(u.split(',')[1], 'base64')); }
    C.ok(!p.errors.length, 'page errors: ' + p.errors.slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
