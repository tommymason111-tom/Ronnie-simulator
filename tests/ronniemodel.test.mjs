// RONNIE'S MODEL (assets/squad/ronnie.glb, made by tools/bake_ronnie.mjs from the owner's full-body and close-up scans):
// at least as detailed as every other squad member: more triangles once loaded and skinned (ragdoll.js loadModel),
// pictures (colour and surface detail) at least as big, the file a sensible size for a phone, skinned properly (every
// vertex's weights are numbers and add up to 1, every bone exists). He works where he's seen: Date Night, a room with
// a player as Ronnie (fat stage 10 too), and the title screen. An upright phone first, then a computer.
import fs from 'node:fs';
import path from 'node:path';
import { launch, newPage, startGame, checker, sleep, ROOT } from './lib/game.mjs';

// ---- the files themselves: triangles and picture sizes straight from each .glb
function glbInfo(file) {
  const f = fs.readFileSync(file), L = f.readUInt32LE(12), j = JSON.parse(f.subarray(20, 20 + L).toString()), B = f.subarray(20 + L + 8);
  const pr = j.meshes[0].primitives[0], tris = pr.indices != null ? j.accessors[pr.indices].count / 3 : j.accessors[pr.attributes.POSITION].count / 3;
  const size = (ti) => { if (ti == null) return 0; const im = j.images[j.textures[ti].source], bv = j.bufferViews[im.bufferView], d = B.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
    if (d[0] === 0x89) return d.readUInt32BE(16);      // PNG: width from IHDR
    for (let o = 2; o < d.length;) { const m = d[o + 1], len = d.readUInt16BE(o + 2); if (m >= 0xc0 && m <= 0xc2) return d.readUInt16BE(o + 7); o += 2 + len; }      // JPEG: width from SOF
    return 0; };
  const m = j.materials[pr.material || 0];
  return { tris, bytes: f.length, map: size(m.pbrMetallicRoughness && m.pbrMetallicRoughness.baseColorTexture && m.pbrMetallicRoughness.baseColorTexture.index), normal: size(m.normalTexture && m.normalTexture.index), mask: !!m.occlusionTexture };
}

// ---- in the game: every squad member with a model, loaded as the game loads them; Ronnie's skinning checked
const LOAD_ALL = async () => {
  const { SquadMember, SQUAD } = await import('./js/squad.js');
  const R = window.RS, ids = Object.keys(SQUAD).filter(id => SQUAD[id].model);
  const cs = ids.map((id, i) => new SquadMember(R.scene, R.room, R.physics, id, [-6 + (i % 7) * 2, -8 - Math.floor(i / 7) * 2, 0], R));
  const t0 = performance.now();
  while (cs.some(c => !c.rag.modelLoaded) && performance.now() - t0 < 120000) await new Promise(r => setTimeout(r, 250));
  const out = {};
  for (const c of cs) {
    const m = c.rag.mesh; if (!m || !c.rag.modelLoaded) { out[c.id] = null; continue; }
    const g = m.geometry, mat = m.material, w = (t) => t ? (t.image && t.image.width) || 0 : 0;
    const info = { tris: (g.index ? g.index.count : g.attributes.position.count) / 3, verts: g.attributes.position.count, map: w(mat.map), normal: w(mat.normalMap) };
    if (c.id === 'ronnie') {
      const si = g.attributes.skinIndex, sw = g.attributes.skinWeight, nb = m.skeleton.bones.length; let nan = 0, sum = 0, badBone = 0, worst = 0;
      for (let i = 0; i < sw.count; i++) { let s = 0; for (let k = 0; k < 4; k++) { const v = sw.getComponent(i, k); if (!Number.isFinite(v) || v < 0) nan++; s += v; if (v > 0 && si.getComponent(i, k) >= nb) badBone++; }
        const e = Math.abs(s - 1); if (e > 1e-3) sum++; worst = Math.max(worst, e); }
      let badPos = 0; const p = g.attributes.position.array; for (let i = 0; i < p.length; i++) if (!Number.isFinite(p[i])) badPos++;
      Object.assign(info, { nan, sum, badBone, worst, badPos, cut: c.rag.cutTriangles || 0 });
    }
    out[c.id] = info;
  }
  for (const c of cs) try { c.dispose(); } catch (e) {}
  return out;
};

// what went wrong on a page: errors, and crash reports other than 'start' and 'hang' (the test itself holds the page
// while it loads every model and steps the game)
const problems = (p) => p.errors.concat(p.crashes.filter(c => c.k !== 'start' && c.k !== 'hang').map(c => c.k + ' ' + c.m + ' @' + c.s));
export default async function () {
  const C = checker('ronniemodel'); let b = await launch();
  const fresh = async () => { await b.close(); b = await launch(); };      // (a new browser for each part: each loads every model, a lot of memory)
  try {
    // the files
    const dir = path.join(ROOT, 'assets/squad'), files = fs.readdirSync(dir).filter(f => f.endsWith('.glb'));
    const info = Object.fromEntries(files.map(f => [f.replace('.glb', ''), glbInfo(path.join(dir, f))])), ron = info.ronnie, others = Object.entries(info).filter(([k]) => k !== 'ronnie');
    const maxOf = (k) => Math.max(...others.map(([, v]) => v[k]));
    console.log(`    ronnie.glb: ${ron.tris} triangles, colour ${ron.map}, normal ${ron.normal}, ${(ron.bytes / 1048576).toFixed(2)}MB (the others: up to ${maxOf('tris')} triangles, colour ${maxOf('map')}, normal ${maxOf('normal')})`);
    C.ok(ron.tris >= 2 * maxOf('tris'), `ronnie.glb has ${ron.tris} triangles: not well over the other squad members' (up to ${maxOf('tris')})`);
    C.ok(ron.map >= 2048 && ron.map >= maxOf('map'), `ronnie.glb's colour picture is ${ron.map}: smaller than 2048 or than another squad member's (${maxOf('map')})`);
    C.ok(ron.normal >= maxOf('normal'), `ronnie.glb's normal map is ${ron.normal}: smaller than another squad member's (${maxOf('normal')})`);
    C.ok(ron.mask, 'ronnie.glb has no mask in its occlusion slot: his skin isn\'t packed (or capped at 1024 on a phone) like everyone else\'s');
    C.ok(ron.bytes < 5 * 1048576, `ronnie.glb is ${(ron.bytes / 1048576).toFixed(2)}MB: too big for a phone (under 5MB)`);
    C.ok(ron.map <= 2048 && ron.normal <= 2048, 'ronnie.glb has a picture over 2048: too much memory on a phone');

    // 1. an upright phone: every model loaded as the game loads it; then Ronnie as another player's body in a room
    {
      const p = await newPage(b, { width: 390, height: 844, mobile: true });
      await startGame(p, { place: 'grid', mode: 'roam', dev: true });
      await p.evaluate(() => RS.renderer.setAnimationLoop(null));
      const got = await p.evaluate(LOAD_ALL), r = got.ronnie;
      C.ok(!!r, 'Ronnie\'s model never loaded on a phone');
      if (r) {
        const oth = Object.entries(got).filter(([k, v]) => k !== 'ronnie' && v);
        for (const [k, v] of oth) {
          C.ok(r.tris >= v.tris, `phone: Ronnie has ${r.tris} triangles once skinned, ${k} has more (${v.tris})`);
          C.ok(r.map >= v.map && r.normal >= v.normal, `phone: Ronnie's pictures (${r.map}/${r.normal}) are smaller than ${k}'s (${v.map}/${v.normal})`);
        }
        C.ok(r.nan === 0 && r.badPos === 0, `Ronnie's skin has ${r.nan} weights and ${r.badPos} positions that aren't numbers`);
        C.ok(r.sum === 0, `${r.sum} of Ronnie's vertices have weights that don't add up to 1 (worst off by ${r.worst})`);
        C.ok(r.badBone === 0, `${r.badBone} of Ronnie's vertex weights point at bones that don't exist`);
        C.ok(r.cut < r.tris * 0.05, `skinning Ronnie cut ${r.cut} triangles apart (of ${r.tris}): the model doesn't fit his bind points`);
      }
      // another player as Ronnie (his full-body model as their body), walking about, at fat stage 10 and back
      const mp = await p.evaluate(async () => {
        const R = window.RS, THREE = R.THREE, pup = R.net.makeAvatar({ id: 'test_ron', name: 'Ron', char: 'ronnie' }); if (!pup) return { err: 'no avatar' };
        const t0 = performance.now(); while (!(pup.c && pup.c.rag && pup.c.rag.modelLoaded) && performance.now() - t0 < 60000) await new Promise(r => setTimeout(r, 200));
        const q = new THREE.Quaternion(); let bad = 0;
        for (let i = 0; i < 180; i++) {
          const x = Math.sin(i / 30) * 2, z = -4 + Math.cos(i / 30) * 2, st = Math.min(10, Math.floor(i / 12));
          q.setFromEuler(new THREE.Euler(0, i / 30, 0));
          pup.update(1 / 30, { t: 'p', c: 'ronnie', h: [x, 1.7, z], q: [q.x, q.y, q.z, q.w], l: [x - 0.3, 1.0, z], rh: [x + 0.3, 1.05, z], s: 1, st, flat: 1 });
          R.sim(1 / 30);
          const m = pup.c.rag.mesh; if (m) { m.updateMatrixWorld(true); const bs = m.skeleton.bones; for (const bn of bs) if (!Number.isFinite(bn.matrixWorld.elements[12])) bad++; }
        }
        R.renderer.render(R.scene, R.camera || new THREE.PerspectiveCamera());
        const out = { loaded: pup.c.rag.modelLoaded, fat: pup.c.rag.fat, bad };
        pup.dispose(); return out;
      });
      C.ok(!mp.err && mp.loaded, `a player as Ronnie: ${mp.err || 'his model never loaded'}`);
      C.ok(mp.fat > 0.9, `a player as Ronnie at stage 10 isn't fat (rag.fat ${mp.fat})`);
      C.ok(mp.bad === 0, `a player as Ronnie: ${mp.bad} bone positions that aren't numbers`);
      C.ok(!problems(p).length, 'phone page errors: ' + problems(p).slice(0, 3).join(' | '));
      await p.context().close();
    }

    await fresh();
    // 2. Date Night on an upright phone: Ronnie at the table, a few seconds of the date
    {
      const p = await newPage(b, { width: 390, height: 844, mobile: true });
      await startGame(p, { place: 'restaurant', mode: 'date' });
      await p.evaluate(() => RS.renderer.setAnimationLoop(null));
      const dn = await p.evaluate(async () => {
        const R = window.RS, d = R.director && R.director.date, t0 = performance.now();
        while (!(d && d.ron && d.ron.rag.modelLoaded) && performance.now() - t0 < 60000) { R.sim(1 / 30); await new Promise(r => setTimeout(r, 100)); }
        R.sim(8); R.renderer.render(R.scene, R.camera || new R.THREE.PerspectiveCamera());
        return { date: !!d, ron: !!(d && d.ron), loaded: !!(d && d.ron && d.ron.rag.modelLoaded), tris: d && d.ron && d.ron.rag.mesh ? d.ron.rag.mesh.geometry.index.count / 3 : 0 };
      });
      C.ok(dn.date && dn.ron && dn.loaded, `Date Night: Ronnie isn't there with his model (${JSON.stringify(dn)})`);
      C.ok(!problems(p).length, 'Date Night page errors: ' + problems(p).slice(0, 3).join(' | '));
      await p.context().close();
    }

    await fresh();
    // 3. the title screen on an upright phone (his close-up head), then a computer's game with him in it
    {
      const p = await newPage(b, { width: 390, height: 844, mobile: true });
      await p.goto('http://game.local/index.html'); await sleep(5000);
      C.ok(await p.evaluate(() => !!window.ronnieHero), 'the title screen\'s Ronnie never started');
      C.ok(!problems(p).length, 'title screen page errors: ' + problems(p).slice(0, 3).join(' | '));
      await p.context().close();
    }
    await fresh();
    {
      const p = await newPage(b, { width: 1280, height: 720 });
      await startGame(p, { place: 'grid', mode: 'roam', dev: true });
      await p.evaluate(() => RS.renderer.setAnimationLoop(null));
      const r = await p.evaluate(async () => { const { SquadMember } = await import('./js/squad.js'), R = window.RS; const c = new SquadMember(R.scene, R.room, R.physics, 'ronnie', [0, -6, 0], R);
        const t0 = performance.now(); while (!c.rag.modelLoaded && performance.now() - t0 < 60000) await new Promise(r => setTimeout(r, 200));
        for (let i = 0; i < 60; i++) { c.rag.fat = i / 59; R.sim(1 / 30); } R.renderer.render(R.scene, R.camera || new R.THREE.PerspectiveCamera());
        const m = c.rag.mesh, out = { loaded: c.rag.modelLoaded, map: m && m.material.map && m.material.map.image ? m.material.map.image.width : 0 }; c.dispose(); return out; });
      C.ok(r.loaded && r.map >= 2048, `computer: Ronnie's model or his full-size picture didn't load (${JSON.stringify(r)})`);
      C.ok(!problems(p).length, 'computer page errors: ' + problems(p).slice(0, 3).join(' | '));
      await p.context().close();
    }
  } finally { await b.close(); }
  return C.fails;
}
