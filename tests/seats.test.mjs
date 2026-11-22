// SITTING PROPERLY: every seat in every place (room.seats: the pub's chairs, the restaurant's, the dining room's, Lewis's
// sofas and armchairs and chairs) gets someone sat in it, the whole squad taking turns (all their sizes), plus Run the
// Pub's punters (an old boy, a big lad, a kid, a mum). For each: the thighs sit ON the seat as the seat really is under
// them (a ray down onto the furniture), not floating above it or sunk into it; the hips are over the seat (not off to
// one side, sat back in it); they face the way the seat faces; the feet are on the floor (or dangle, for a kid), never
// through it; the knees go under the table, not through its top. Free roam's sitting spots in Lewis's house are on a
// real seat facing its way. Screenshots of a few (upright phone) with SHOTS=dir.
import fs from 'fs';
import { launch, newPage, startGame, sleep, checker } from './lib/game.mjs';
const SHOTS = process.env.SHOTS || '';
const PLACES = (process.env.PLACES || 'pub,restaurant,garden').split(',');

export default async function () {
  const C = checker('seats'), b = await launch();
  try {
    for (const place of PLACES) {
      const p = await newPage(b, { width: 390, height: 844, mobile: true });
      // (the level's shapes are kept in ordinary memory for this test, so a ray can find the seats' real tops)
      await p.route('**/js/memory.js*', (rt) => rt.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(new URL('../js/memory.js', import.meta.url), 'utf8').replace('export function releaseLevelGeometry(meshes, max = 120) {', 'export function releaseLevelGeometry(meshes, max = 120) { return 0;') }));
      await startGame(p, { place, mode: place === 'pub' ? 'runpub1' : 'roam' }); await sleep(800);
      const r = await p.evaluate(async ({ place, shots }) => {
        RS.renderer.setAnimationLoop(null);
        const T = RS.THREE, room = RS.room, out = { bad: [], n: 0, worst: {}, acts: [], shots: [] };
        const seats = (room.seats || []).slice();
        // who sits: the squad (their own models), plus a few punters in Run the Pub
        const rp = RS.director.runpub; let who = RS.cast.filter(c => c.rag && c !== RS.tommy && c.def);
        if (rp) { rp.update = () => {}; for (const k of ['old', 'lad', 'kid', 'mum', 'old', 'dad']) who.push(rp.add(k)); }
        // hold everyone still: no roaming, no jobs, no attacks
        RS.director.updateRoam = () => {}; RS.director.updateTills = () => {};
        for (const c of RS.cast) { c.active = false; c.roamAct = null; c.tillJob = null; c.rpJob = null; c.stayPut = true; }
        RS.player.rig.position.set(room.bounds.x0 + 0.5, 0, room.bounds.z0 + 0.5);      // (you, out of everyone's way: you'd nudge them out of their seats)
        for (const c of RS.cast) if (!who.includes(c) && c.rag) { c.active = false; c.attacks = false; c.update = () => {}; c.rag.placeAt(room.bounds.x1 - 0.5, room.bounds.z1 - 0.5, 0); }      // (Tommy and anyone else not sitting: out of the way)
        const ray = new T.Raycaster(), hide = new Set(), down = new T.Vector3(0, -1, 0);
        const itemObjs = new Set((RS.items.items || []).map(it => it.obj)), isChar = (o) => { for (let x = o; x; x = x.parent) if (x.isSkinnedMesh || x.isSprite || x.isPoints || x.isLine || itemObjs.has(x)) return true; return false; };      /* (people, and the food lying about, aren't furniture) */
        const statics = []; RS.scene.traverse(o => { if ((o.isMesh || o.isInstancedMesh) && !isChar(o)) { const g = o.geometry, pa = g && g.attributes.position; if (pa && pa.array && pa.array.length && (!g.index || (g.index.array && g.index.array.length))) statics.push(o); else out.freed = (out.freed || 0) + 1; }  });
        // the seat's real top under a point: the highest surface below 0.8m there
        const topAt = (x, z) => { ray.set(new T.Vector3(x, 0.8, z), down); ray.far = 0.8; const h = ray.intersectObjects(statics, false).filter(i => i.point.y > 0.2 && !(i.object.material && i.object.material.transparent && i.object.material.opacity < 0.5)); return h.length ? h[0].point.y : null; };
        const floorAt = (x, z) => (RS.floorAt ? RS.floorAt(x, z) : 0) || 0;
        const blockers = room.blockers || [];
        const V = () => new T.Vector3();
        for (let i = 0; i < seats.length; i += who.length) {
          const batch = seats.slice(i, i + who.length);
          batch.forEach((s, j) => { const c = who[j]; c.state = 'idle'; c.glide = null; c.path = null; c.activity = null; c.clip = null; c.seated = true; c.faceYaw = s.yaw; c.lookOverride = 0; c.rag.placeAt(s.x, s.z, s.yaw); c._seat = null; });
          for (const c of who.slice(batch.length)) c.rag.placeAt(-50, -50, 0);
          for (let f = 0; f < 45; f++) RS.sim(1 / 30);
          batch.forEach((s, j) => {
            const c = who[j], R = c.rag, P = R.parts, name = (c.rp ? c.rp.kind : c.id) + ' in seat ' + (i + j) + ` (${s.x.toFixed(2)}, ${s.z.toFixed(2)})`;
            const fl = floorAt(s.x, s.z), k = R.height / 1.68;
            // the thighs' undersides against the seat's real top, under each thigh
            for (const L of ['uLegL', 'uLegR']) {
              const c0 = R.pos(L, V()), tp = R.tip(L, V()), a0 = c0.clone().multiplyScalar(2).sub(tp), mid = a0.lerp(tp, 0.3), t = P[L].def.t, top = topAt(mid.x, mid.z);      /* (the part of the thigh on the seat: a third of the way to the knee) */
              if (top == null) { out.bad.push(`${name}: no seat under the ${L === 'uLegL' ? 'left' : 'right'} thigh`); continue; }
              const gap = (mid.y - t) - top; out.n++;
              if (Math.abs(gap) > Math.abs(out.worst.gap || 0)) out.worst.gap = +gap.toFixed(3);
              if (gap > 0.035) out.bad.push(`${name}: thigh floating ${(gap * 100).toFixed(1)}cm above the seat (top ${top.toFixed(3)})`);
              if (gap < -0.035) out.bad.push(`${name}: thigh sunk ${(-gap * 100).toFixed(1)}cm into the seat (top ${top.toFixed(3)})`);
            }
            // hips over the seat: across (left/right) and along (sat back, not perched on the front edge or through the back)
            const pel = R.pos('pelvis', V()), fx = Math.sin(s.yaw), fz = Math.cos(s.yaw), dx = pel.x - s.x, dz = pel.z - s.z;
            const along = dx * fx + dz * fz, across = dx * fz - dz * fx;
            if (Math.abs(across) > 0.06) out.bad.push(`${name}: hips ${(across * 100).toFixed(0)}cm off to the side of the seat`);
            if (along > 0.05 || along < -0.13) out.bad.push(`${name}: hips ${(along * 100).toFixed(0)}cm ${along > 0 ? 'forward' : 'back'} of the seat's middle`);
            // facing the seat's way
            const dy = Math.atan2(Math.sin(R.yaw - s.yaw), Math.cos(R.yaw - s.yaw)); if (Math.abs(dy) > 0.12) out.bad.push(`${name}: facing ${(dy * 57.3).toFixed(0)}° off the seat's way`);
            // the feet: never through the floor; an adult's on it
            for (const L of ['lLegL', 'lLegR']) { const a = R.tip(L, V()); if (a.y < fl - 0.02) out.bad.push(`${name}: foot ${((fl - a.y) * 100).toFixed(0)}cm through the floor`);
              if (!(c.rp && c.rp.kind === 'kid') && R.height > 1.45 && a.y > fl + 0.14) out.bad.push(`${name}: feet dangling ${((a.y - fl) * 100).toFixed(0)}cm off the floor`); }
            // the knees under a table, not through its top
            for (const L of ['uLegL', 'uLegR']) { const kn = R.tip(L, V()), t = P[L].def.t;
              for (const bk of blockers) if (bk.y1 > 0.6 && bk.y1 < 0.95 && kn.x > bk.x0 + 0.03 && kn.x < bk.x1 - 0.03 && kn.z > bk.z0 + 0.03 && kn.z < bk.z1 - 0.03 && kn.y + t > fl + bk.y1 - 0.05) out.bad.push(`${name}: knee through the table top (${(kn.y + t).toFixed(2)} vs ${bk.y1})`); }
          });
          if (shots && i === 0) for (let j = 0; j < Math.min(3, batch.length); j++) {
            const s = batch[j], cam = new T.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 50), side = s.yaw + 1.1;
            cam.position.set(s.x + Math.sin(side) * 2.4, 1.3, s.z + Math.cos(side) * 2.4); cam.lookAt(s.x, 0.65, s.z);
            RS.renderer.render(RS.scene, cam); out.shots.push(RS.renderer.domElement.toDataURL('image/jpeg', 0.85));
          }
        }
        out.seats = seats.length;
        // Lewis's house: every free roam 'sit' spot is a real seat, facing its way
        for (const a of room.activities || []) if (a.pose === 'sit') { const s = seats.find(s => Math.hypot(s.x - a.x, s.z - a.z) < 0.25);
          if (!s) out.acts.push(`sitting spot (${a.x.toFixed(2)}, ${a.z.toFixed(2)}) has no seat`); else if (Math.abs(Math.atan2(Math.sin(a.yaw - s.yaw), Math.cos(a.yaw - s.yaw))) > 0.3) out.acts.push(`sitting spot (${a.x.toFixed(2)}, ${a.z.toFixed(2)}) faces the wrong way`); }
        return out;
      }, { place, shots: !!SHOTS });
      console.log(`  ${place}: ${r.seats} seats (${r.freed || 0} meshes can't be hit), ${r.n} thighs checked, worst gap ${r.worst.gap}, ${r.bad.length} problems`);
      C.ok(r.seats > 0, `${place}: no seats listed`);
      C.ok(!r.bad.length, `${place}: ${r.bad.length} bad sits: ${r.bad.slice(0, 8).join(' | ')}`);
      C.ok(!r.acts.length, `${place}: ${r.acts.join(' | ')}`);
      if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); r.shots.forEach((d, i) => fs.writeFileSync(`${SHOTS}/seat-${place}-${i}.jpg`, Buffer.from(d.split(',')[1], 'base64'))); }
      C.ok(!p.errors.length, `${place}: page errors ${p.errors.slice(0, 2).join(' | ')}`);
      await p.close();
    }
  } finally { await b.close(); }
  return C.fails;
}
