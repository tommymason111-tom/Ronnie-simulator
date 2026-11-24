// DEVELOPER MODE'S 👤 MODELS page (devmode.js): every character at the game's 10 sizes, on the test grid.
//   - an upright phone, by finger: the page opens, every character (Ronnie, Tommy, the squad, the punters) at sizes 1,
//     5 and 10, each body bigger than the last (wider and taller), ALL SIZES (ten in a row, growing left to right),
//     ALL CHARACTERS (everyone at one size), IDLE / WALK / RUN / an EMOTE, the camera and back, CLEAR (nothing left in
//     the scene, the punters' made-up people gone); every button on the screen and nothing covered; no page errors
//   - the Quest: the same page in the headset's dev menu, a line-up, the camera turns you to face them
// SHOTS=dir saves screenshots there. CHARS=ronnie,tommy just those.
import { launch, newPage, startGame, sleep, checker, ROOT } from './lib/game.mjs';
import fs from 'fs'; import path from 'path';
const SHOTS = process.env.SHOTS || null, ONLY = process.env.CHARS ? process.env.CHARS.split(',') : null;
const shot = async (p, name) => { if (SHOTS) { await p.evaluate(() => RS.renderer.render(RS.scene, (window.__devCam && window.__devCam()) || RS.player.camera)); fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, name), timeout: 180000 }).catch(e => console.log('  (no screenshot: ' + e.message.split('\n')[0] + ')')); } };
const BTN = fs.readFileSync(path.join(ROOT, 'tests/lib/btncheck.js'), 'utf8');
// (in the page) the bodies on show: their sizes
const SIZES = () => window.__devModels.M.figs.map(f => { const g = f.av.c.rag.group, b = new RS.THREE.Box3(), t = new RS.THREE.Box3(); g.updateMatrixWorld(true); g.traverseVisible(o => { if ((o.isMesh || o.isSkinnedMesh) && !o.isSprite) { t.makeEmpty(); t.expandByObject(o, true); b.union(t); } }); const s = b.getSize(new RS.THREE.Vector3());      /* (what you see: the visible body, skinned as it stands) */ return { ch: f.ch, n: f.n, w: Math.max(s.x, s.z), h: s.y, x: (b.min.x + b.max.x) / 2, z: (b.min.z + b.max.z) / 2, ready: !!f.av.c.rag.mesh }; });

export default async function () {
  const C = checker('devmodels'), b = await launch();
  try {
    { const p = await newPage(b, { width: 390, height: 844, mobile: true });
      await startGame(p, { place: 'grid', mode: 'roam', dev: true });
      await p.waitForFunction(() => document.getElementById('dev-panel'), null, { timeout: 30000 });
      await p.addScriptTag({ content: BTN });
      await p.evaluate(() => { const pn = document.getElementById('dev-panel'); if (!pn.classList.contains('on')) document.getElementById('dev-btn').click(); pn.querySelector('[data-tab="models"]').click(); RS.renderer.setAnimationLoop(null); });      // (time stepped by hand: RS.sim)
      const tap = (sel) => p.evaluate((sel) => { const e = document.querySelector('#dev-panel ' + sel); if (!e) return false; e.click(); return true; }, sel);
      const settle = () => p.evaluate(async () => { for (let i = 0; i < 200; i++) { if (window.__devModels.M.figs.every(f => f.av.c.rag.mesh)) break; await new Promise(r => setTimeout(r, 50)); } RS.sim(0.4, 1 / 30); });
      C.ok(await tap('[data-mview="one"]'), 'no JUST THEM button');
      const chars = await p.evaluate(() => window.__devModels.chars); console.log(`  ${chars.length} characters: ${chars.join(' ')}`);
      C.ok(chars.includes('ronnie') && chars.includes('tommy') && chars.includes('chloe') && chars.some(c => c.startsWith('punter:')), 'characters missing');
      const btn0 = await p.evaluate(() => window.__btnCheck('#dev-panel')); C.ok(!btn0.length, 'MODELS page buttons: ' + JSON.stringify(btn0).slice(0, 400));
      // every character at 1, 5 and 10: a bigger body each time
      const bad = [];
      for (let i = 0; i < chars.length; i++) {
        const ch = await p.evaluate(() => window.__devModels.M.ch);
        if (!ONLY || ONLY.includes(ch)) { const m = [];
          for (const n of [1, 5, 10]) { await tap(`[data-msn="${n}"]`); await settle(); const s = await p.evaluate(SIZES); if (s.length !== 1 || !s[0].ready || s[0].n !== n) bad.push(`${ch} size ${n}: ${JSON.stringify(s)}`); else m.push(s[0]); }
          if (m.length === 3 && !(m[1].w > m[0].w * 1.05 && m[2].w > m[1].w * 1.05 && m[2].h > m[0].h * 1.2)) bad.push(`${ch} doesn't grow: ${m.map(x => `${x.w.toFixed(2)}x${x.h.toFixed(2)}`).join(' -> ')}`);
          if (ch === 'ronnie' && m.length === 3) console.log(`  ronnie: ${m.map(x => `${x.w.toFixed(2)} wide x ${x.h.toFixed(2)} tall`).join(' -> ')}`); }
        await tap('[data-mstep="1"]');
      }
      C.ok(!bad.length, 'sizes: ' + bad.slice(0, 6).join(' | '));
      C.ok(await p.evaluate(() => window.__devModels.M.ch === 'ronnie'), 'stepping all the way round should come back to Ronnie');
      // ALL SIZES: ten of them, growing from one end to the other
      await tap('[data-mview="sizes"]'); await settle();
      const row = await p.evaluate(SIZES);
      C.ok(row.length === 10 && row.every((s, i) => s.n === i + 1 && s.ready), `ALL SIZES: ${row.length} bodies`);
      C.ok(row.every((s, i) => !i || s.w > row[i - 1].w), `ALL SIZES don't grow along the row: ${row.map(s => s.w.toFixed(2)).join(' ')}`);
      C.ok(row.every((s, i) => !i || Math.hypot(s.x - row[i - 1].x, s.z - row[i - 1].z) > (s.w + row[i - 1].w) * 0.4), 'ALL SIZES overlap each other');
      for (const a of ['walk', 'run', 'emote', 'idle']) { await tap(`[data-manim="${a}"]`); await p.evaluate(() => RS.sim(1, 1 / 30)); }
      await tap('[data-mcam="1"]'); await p.evaluate(() => RS.sim(0.2, 1 / 30));
      const cam = await p.evaluate(() => !!(window.__devCam && window.__devCam()));
      C.ok(cam, 'LOOK AT THEM: no camera');
      await p.evaluate(() => { document.getElementById('dev-btn').click(); }); await sleep(600); await shot(p, 'devmodels-allsizes.png');
      await p.evaluate(() => { document.getElementById('dev-btn').click(); });
      // ALL CHARACTERS at size 10
      await tap('[data-msn="10"]'); await tap('[data-mview="all"]'); await settle();
      const all = await p.evaluate(SIZES);
      C.ok(all.length === chars.length && all.every(s => s.n === 10 && s.ready), `ALL CHARACTERS: ${all.length} of ${chars.length}, ready ${all.filter(s => s.ready).length}`);
      await p.evaluate(() => RS.sim(0.3, 1 / 30));
      await p.evaluate(() => { document.getElementById('dev-btn').click(); }); await sleep(600); await shot(p, 'devmodels-everyone-size10.png');
      await p.evaluate(() => { document.getElementById('dev-btn').click(); });
      const btn1 = await p.evaluate(() => window.__btnCheck('#dev-panel')); C.ok(!btn1.length, 'MODELS page buttons (camera on): ' + JSON.stringify(btn1).slice(0, 400));
      await tap('[data-mcam="1"]'); C.ok(await p.evaluate(() => !window.__devCam), 'BACK TO YOUR EYES left the camera on');
      // CLEAR: nothing left behind
      const before = await p.evaluate(() => ({ kids: RS.scene.children.length, figs: window.__devModels.M.figs.length }));
      await tap('[data-mclear="1"]'); await p.evaluate(() => RS.sim(0.2, 1 / 30));
      const after = await p.evaluate(async () => { const { SQUAD } = await import('./js/squad.js'); return { kids: RS.scene.children.length, figs: window.__devModels.M.figs.length, punters: Object.keys(SQUAD).filter(k => /^p\d+$/.test(k)).length, chars: [...(await import('./js/character.js')).Character.ALL].filter(c => !c.disposed && String(c.id).startsWith('p') && /^p\d+$/.test(c.id)).length }; });
      console.log(`  clear: scene ${before.kids} -> ${after.kids} things, ${before.figs} bodies -> ${after.figs}`);
      C.ok(after.figs === 0 && after.punters === 0 && after.kids < before.kids - chars.length, `CLEAR left things behind: ${JSON.stringify({ before, after })}`);
      C.ok(!p.errors.length, 'phone page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
      await p.context().close(); }

    // ---- the Quest
    { const p = await newPage(b, { width: 700, height: 500, xr: true });
      await p.addInitScript(() => { try { sessionStorage.setItem('rs_dev', '1'); } catch (e) {} });
      await p.goto('http://game.local/index.html?go=1&place=grid&mode=roam');
      await p.waitForFunction(() => window.RS && document.body.classList.contains('ready'), null, { timeout: 180000 });
      await p.waitForFunction(() => !document.querySelector('#loadscreen.on'), null, { timeout: 120000 }).catch(() => {});
      await p.evaluate(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); RS.renderer.xr.setFramebufferScaleFactor(0.12); document.getElementById('enter-vr').click(); });
      await p.waitForFunction(() => RS.renderer.xr.isPresenting && document.getElementById('dev-panel'), null, { timeout: 60000 });
      await sleep(1500);
      const r = await p.evaluate(async () => { const w = (t) => new Promise(res => setTimeout(res, t));
        document.getElementById('dev-btn').click(); await w(800);
        const open = !!(RS.vrPanels().dev && RS.vrPanels().dev.open);
        const pn = document.getElementById('dev-panel'); pn.querySelector('[data-tab="models"]').click(); pn.querySelector('[data-mview="sizes"]').click();
        for (let i = 0; i < 100 && !window.__devModels.M.figs.every(f => f.av.c.rag.mesh); i++) await w(50);
        const yaw0 = RS.player.rig.rotation.y; pn.querySelector('[data-mcam="1"]').click(); await w(1200);
        const M = window.__devModels.M, P = RS.player, to = Math.atan2(M.center.x - P.head.x, M.center.z - P.head.z), f = Math.atan2(P.fwd.x, P.fwd.z); let d = Math.abs(to - f) % (2 * Math.PI); if (d > Math.PI) d = 2 * Math.PI - d;
        const out = { open, figs: M.figs.length, cam: M.cam, facing: d < 0.5, tab: !!pn.querySelector('[data-tab="models"].on') };
        pn.querySelector('[data-mcam="1"]').click(); out.back = Math.abs(RS.player.rig.rotation.y - yaw0) < 0.01; pn.querySelector('[data-mclear="1"]').click(); out.after = M.figs.length; return out; });
      console.log('  quest: ' + JSON.stringify(r));
      C.ok(r.open && r.tab && r.figs === 10 && r.cam === 'vr' && r.facing && r.back && r.after === 0, `the headset's MODELS page: ${JSON.stringify(r)}`);
      C.ok(!p.errors.length, 'quest page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
      await p.context().close(); }
  } finally { await b.close(); }
  return C.fails;
}
