// QUALITY TIERS (js/quality.js): the tier detected from the device (Quest / iPhone / iPad-as-Mac / Android / computer)
// and from ?q=; every tier loads with no errors and builds no shader in play (a tier change mid-game included); ULTRA's
// characters have more triangles than HIGH's, MEDIUM's fewer, with levels of detail switched by distance; each tier's
// shadow map, casters, contact shadows and picture resolution; the settings' QUALITY saved and applied (title screen and
// pause menu, on an upright phone); AUTO steps down once when frames are slow (a fake frame clock), waits 10s before
// another step, never on a manual choice, never while busy; the 60Hz screen target.
// PLACES=garden,pub (each tier in each), TIERS=ultra,high,medium,low
import { launch, newPage, startGame, checker } from './lib/game.mjs';
import fs from 'fs';
const BTN = fs.readFileSync(new URL('./lib/btncheck.js', import.meta.url), 'utf8'), TXT = fs.readFileSync(new URL('./lib/textcheck.js', import.meta.url), 'utf8');

const PLACES = (process.env.PLACES || 'garden').split(',');
const TIER_LIST = (process.env.TIERS || 'ultra,high,medium,low').split(',');
const PHONE = { width: 390, height: 844, mobile: true };

export default async function () {
  const c = checker('quality'), b = await launch();
  try {
    // ---- detection (the pure function, on a title page) and the 60Hz target
    { const p = await newPage(b, PHONE); await p.goto('http://game.local/index.html');
      const r = await p.evaluate(async () => { const Q = await import('/js/quality.js');
        const d = (ua, touch = 0, mem = 0) => Q.detectTier({ ua, touch, mem, cores: 8 });
        return {
          quest3: d('Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/35.2 Chrome/128.0 VR Safari/537.36'),
          quest2: d('Mozilla/5.0 (Linux; Android 12; Quest 2) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/30.0 Chrome/118.0 Mobile VR Safari/537.36'),
          iphone: d('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1', 5),
          ipadMac: d('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15', 5),
          mac: d('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15', 0),
          android: d('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36', 5, 8),
          weakAndroid: d('Mozilla/5.0 (Linux; Android 9; SM-J400F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36', 5, 2),
          windows: d('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'),
          hz60: Q.estimateHz(Array(60).fill(16.67)), hz72: Q.estimateHz(Array(60).fill(13.9)), hz120: Q.estimateHz(Array(60).fill(8.33)), hzNoisy: Q.estimateHz([...Array(50).fill(16.6), 40, 90, 33, 16.9, 16.4]),
          drop60: Q.dropBelow(60), drop72: Q.dropBelow(72), drop120: Q.dropBelow(120),
          testTier: Q.quality.tier,
        }; });
      c.ok(r.quest3 === 'medium' && r.quest2 === 'medium', `a Quest is MEDIUM (${r.quest3}, ${r.quest2})`);
      c.ok(r.iphone === 'high' && r.ipadMac === 'high', `an iPhone and an iPad (saying it's a Mac, with touch) are HIGH (${r.iphone}, ${r.ipadMac})`);
      c.ok(r.android === 'high' && r.weakAndroid === 'medium', `an Android phone is HIGH, a weak one MEDIUM (${r.android}, ${r.weakAndroid})`);
      c.ok(r.mac === 'ultra' && r.windows === 'ultra', `computers are ULTRA (${r.mac}, ${r.windows})`);
      c.ok(r.hz60 === 60 && r.hz72 === 72 && r.hz120 === 120 && r.hzNoisy === 60, `refresh rate from frame timing: ${r.hz60}/${r.hz72}/${r.hz120}/${r.hzNoisy}`);
      c.ok(r.drop60 > 50 && r.drop60 < 58, `a 60Hz screen only steps down clearly under 60 (${r.drop60})`);
      c.ok(r.drop72 > 65 && r.drop72 < 72 && r.drop120 === r.drop72, `72Hz and faster screens step down under the owner's 72 (${r.drop72}, ${r.drop120})`);
      c.ok(r.testTier === 'high', `an automated browser plays at HIGH unless ?q= says (${r.testTier})`);
      // the title screen's SETTINGS: QUALITY cycles, is saved, and fits an upright phone
      await p.evaluate(() => { document.getElementById('settings').hidden = false; });
      const before = await p.evaluate(() => document.getElementById('set-quality').textContent);
      await p.click('#set-quality');
      const after = await p.evaluate(() => ({ t: document.getElementById('set-quality').textContent, ls: localStorage.getItem('rs_quality'), note: document.getElementById('set-quality-note').textContent }));
      c.ok(/QUALITY/.test(before) && after.t !== before && after.ls === 'ultra', `title QUALITY cycles and is saved (${before} -> ${after.t}, saved ${after.ls})`);
      c.ok(after.note.length > 5, 'the QUALITY note says what it does');
      await p.addScriptTag({ content: BTN }); await p.addScriptTag({ content: TXT });
      for (const x of await p.evaluate(() => window.__btnCheck('#settings'))) c.ok(false, `title settings: ${x.what} ${x.why}`);
      for (const x of (await p.evaluate(() => window.__textCheck(document.querySelector('#settings')))).filter(t => /quality/i.test((t.where || '') + (t.what || '') + (t.text || '')))) c.ok(false, 'title settings text: ' + JSON.stringify(x).slice(0, 160));
      await p.screenshot({ path: (process.env.QDIR || '/tmp') + '/settings-title-390x844.png' }).catch(() => {});
      await p.evaluate(() => localStorage.setItem('rs_quality', 'auto'));
      c.ok(!p.errors.length, 'title page errors: ' + p.errors.slice(0, 3).join(' | '));
      await p.context().close(); }

    // ---- every tier in each place: no errors, no shader in play, triangles, levels, shadows, resolution
    const tris = {};
    for (const place of PLACES) for (const q of TIER_LIST) {
      const p = await newPage(b, PHONE);
      await startGame(p, { place, mode: 'roam', dev: true, extra: '&q=' + q });
      await p.waitForFunction(() => window.__shaderWarm && (window.__shaderWarm.programs || window.__shaderWarm.skipped), null, { timeout: 90000 }).catch(() => {});
      await p.waitForFunction(() => window.__quality.chars().length >= 3, null, { timeout: 60000 }).catch(() => {});
      await p.waitForTimeout(1500);
      await p.waitForFunction(() => window.__shaderWarm && (window.__shaderWarm.programs || window.__shaderWarm.skipped), null, { timeout: 90000 }).catch(() => {});
      const r = await p.evaluate(async ({ q }) => {
        const Q = window.__quality, R = RS.renderer; R.setAnimationLoop(null);
        const cam = RS.player.camera || RS.scene.getObjectByProperty('isPerspectiveCamera', true);
        const render = () => R.render(RS.scene, cam);
        render(); const p0 = R.info.programs.length;
        for (let i = 0; i < 40; i++) { RS.sim(1 / 30); Q.frame(1 / 30, false, cam); render(); }
        const ch = Q.chars(), sun = RS.room.shadows && RS.room.sun;
        // levels of detail by distance: one character walked away from the camera and back
        let lod = null; const multi = ch.length && ch[0].levels.length > 1;
        if (multi) { const rag = [...RS.cast].map(x => x.rag).find(rg => rg && rg.qlod && rg.qlod.levels.length > 1);
          if (rag) { const pb = rag.parts.pelvis.body, was = pb.position.clone(), cp = cam.getWorldPosition(new RS.THREE.Vector3());
            const at = (d) => { pb.position.set(cp.x + d, cp.y - 0.6, cp.z); Q.frame(1 / 30, false, cam); render(); return rag.mesh.geometry.index.count / 3; };
            lod = { near: at(0.8), far: at(30), back: at(0.8) }; pb.position.copy(was); } }
        // a tier change mid-game (one step down and back up): still no shader
        const others = { ultra: 'high', high: 'medium', medium: 'low', low: 'medium' };
        Q.setChoice(others[q]); for (let i = 0; i < 30; i++) { RS.sim(1 / 30); Q.frame(1 / 30, false, cam); render(); }
        const liveTris = Q.chars().map(x => x.tris);
        Q.setChoice(q); for (let i = 0; i < 30; i++) { RS.sim(1 / 30); Q.frame(1 / 30, false, cam); render(); }
        localStorage.setItem('rs_quality', 'auto');
        return { built: R.info.programs.length - p0, n: ch.length, tris: ch.map(x => x.levels[0].tris), base: ch.map(x => x.base), lod, shadowMap: sun ? sun.shadow.mapSize.x : 0, casters: sun ? !!R.shadowMap.enabled : null,
          pr: R.getPixelRatio(), dpr: devicePixelRatio, detail: Q.detail(), blobs: Q.blobs(), state: Q.state, liveTris, draws: R.info.render.calls };
      }, { q });
      const tag = `${place}/${q}`;
      c.ok(!p.errors.length && !p.crashes.length, `${tag}: errors ${p.errors.slice(0, 3).join(' | ')}`);
      c.ok(r.state.tier === q && r.state.build === q, `${tag}: ?q= picks the tier (${r.state.tier}/${r.state.build})`);
      c.ok(r.built === 0, `${tag}: ${r.built} shader(s) built in play (tier change mid-game included)`);
      c.ok(r.n >= 3, `${tag}: characters registered (${r.n})`);
      tris[tag] = r.tris.reduce((a, x) => a + x, 0) / Math.max(1, r.n);
      const baseAvg = r.base.reduce((a, x) => a + x, 0) / Math.max(1, r.n);
      if (q === 'high') c.ok(Math.abs(tris[tag] - baseAvg) < 1, `${tag}: HIGH shows the models exactly as they are (${tris[tag]} vs ${baseAvg})`);
      if (q === 'ultra') c.ok(tris[tag] > baseAvg * 3, `${tag}: ULTRA's characters are smoothed (${tris[tag]} triangles vs ${baseAvg})`);
      if (q === 'medium' || q === 'low') c.ok(tris[tag] < baseAvg * 0.75, `${tag}: ${q.toUpperCase()}'s characters are lighter (${tris[tag]} vs ${baseAvg})`);
      if (q !== 'high') c.ok(r.lod && r.lod.far < r.lod.near && r.lod.back === r.lod.near, `${tag}: the level of detail switches by distance and back (${JSON.stringify(r.lod)})`);
      const PR = { ultra: [1.25, 2], high: [0, 1.75], medium: [0, 1.25], low: [0, 1] }[q];
      c.ok(Math.abs(r.pr - Math.min(PR[1], Math.max(PR[0], r.dpr))) < 1e-3, `${tag}: picture resolution ${r.pr} (screen ${r.dpr})`);
      if (place === 'garden') c.ok(r.shadowMap === { ultra: 4096, high: 2048, medium: 1024, low: 512 }[q], `${tag}: sun shadow map ${r.shadowMap}`);
      c.ok((r.detail > 0) === (q === 'ultra'), `${tag}: the skin & cloth detail atlas only on ULTRA (${r.detail})`);
      if (q === 'ultra') c.ok(r.detail === 2048 || r.detail === 4096, `${tag}: detail atlas ${r.detail}`);
      c.ok(r.blobs === (q === 'ultra' && place !== 'garden'), `${tag}: contact shadows only on ULTRA where there's no sun (${r.blobs})`);
      console.log(`  quality ${tag}: ${Math.round(tris[tag])} tris/char (base ${Math.round(baseAvg)}), lod ${JSON.stringify(r.lod)}, shadow ${r.shadowMap}, pr ${r.pr}, detail ${r.detail}, draws ${r.draws}`);
      await p.context().close();
    }
    for (const place of PLACES) { const t = (q) => tris[`${place}/${q}`];
      if (t('ultra') && t('high')) c.ok(t('ultra') > t('high'), `${place}: ULTRA has more character triangles than HIGH`);
      if (t('medium') && t('high')) c.ok(t('medium') < t('high'), `${place}: MEDIUM has fewer than HIGH`);
      if (t('low') && t('medium')) c.ok(t('low') < t('medium'), `${place}: LOW has fewer than MEDIUM`); }

    // ---- the pause menu's QUALITY (upright phone), applied at once; AUTO's frame-rate watch on a fake clock
    { const p = await newPage(b, PHONE);
      await startGame(p, { place: 'pub', mode: 'roam', dev: true });
      await p.evaluate(() => { const b = document.getElementById('menu-btn'); if (b) b.click(); });
      await p.waitForTimeout(400);
      await p.evaluate(() => document.getElementById('pause-settings').click());
      await p.waitForTimeout(400);
      const r1 = await p.evaluate(() => document.getElementById('pause-quality').textContent);
      await p.addScriptTag({ content: BTN }); await p.addScriptTag({ content: TXT });
      for (const x of await p.evaluate(() => window.__btnCheck('#pause-setbox'))) c.ok(false, `pause settings: ${x.what} ${x.why}`);
      for (const x of (await p.evaluate(() => window.__textCheck(document.querySelector('#pause-setbox'))))) c.ok(false, 'pause settings text: ' + JSON.stringify(x).slice(0, 160));
      await p.screenshot({ path: (process.env.QDIR || '/tmp') + '/settings-pause-390x844.png' }).catch(() => {});
      const r2 = await p.evaluate(() => { const b = document.getElementById('pause-quality'); b.click(); b.click(); b.click();      // AUTO -> ULTRA -> HIGH -> MEDIUM
        return { t: b.textContent, st: window.__quality.state, ls: localStorage.getItem('rs_quality'), pr: RS.renderer.getPixelRatio(), toast: (document.getElementById('q-toast') || {}).textContent }; });
      c.ok(/QUALITY/.test(r1) && /MEDIUM/.test(r2.t) && r2.st.tier === 'medium' && r2.ls === 'medium', `pause QUALITY applies and saves (${r1} -> ${r2.t}, ${r2.st.tier}, ${r2.ls})`);
      c.ok(r2.pr <= 1.25 + 1e-6 && /MEDIUM/.test(r2.toast || ''), `MEDIUM's resolution at once and a toast (${r2.pr}, ${r2.toast})`);
      const w = await p.evaluate(() => {
        const Q = window.__quality; RS.renderer.setAnimationLoop(null); let t = 0; Q.setClock(() => t);
        const run = (secs, ms, busy = false) => { for (let s = 0; s < secs * 1000; s += ms) { t += ms; Q.frame(undefined, busy); } return Q.state; };
        const out = {};
        // AUTO (this browser's detected tier), a 60Hz screen: 58fps is fine, 40fps steps down once, then waits 10s
        Q.setChoice('auto'); Q.setHz(60); Q.resetWatch();
        const t0 = Q.state.tier; out.start = t0;
        out.ok58 = run(8, 17.2).tier; out.slow = run(4, 25).tier; out.drops1 = Q.state.drops; out.toast = Q.state.toast;
        out.cooling = run(6, 25).tier; out.drops2 = Q.state.drops; out.after = run(10, 25).tier; out.drops3 = Q.state.drops;
        // busy (paused, a cut scene, the receipt): never
        Q.setChoice('auto'); Q.resetWatch(); const d0 = Q.state.drops; run(20, 30, true); out.busyDrops = Q.state.drops - d0;
        // a 72Hz screen / the Quest: 60fps is too slow there
        Q.setChoice('auto'); Q.setHz(72); Q.resetWatch(); const d1 = Q.state.drops; run(4, 16.7); out.q72 = Q.state.drops - d1;
        // a manual choice is never changed
        Q.setChoice('high'); Q.setHz(60); Q.resetWatch(); const d2 = Q.state.drops; run(30, 50); out.manual = Q.state.tier; out.manualDrops = Q.state.drops - d2;
        Q.setClock(null); localStorage.setItem('rs_quality', 'auto');
        return out; });
      const order = ['ultra', 'high', 'medium', 'low'], i0 = order.indexOf(w.start);
      c.ok(w.ok58 === w.start, `a 60Hz screen at 58fps doesn't step down (${w.start} -> ${w.ok58})`);
      c.ok(w.slow === order[i0 + 1] && w.drops1 === 1 && /lowered to/i.test(w.toast), `slow frames on AUTO step down one (${w.start} -> ${w.slow}, ${w.drops1}, "${w.toast}")`);
      c.ok(w.cooling === w.slow && w.drops2 === 1, `no second step within 10s (${w.cooling}, ${w.drops2})`);
      c.ok(w.drops3 === 2 && w.after === order[i0 + 2], `still slow after 10s: one more step (${w.after}, ${w.drops3})`);
      c.ok(w.busyDrops === 0, `never while busy (${w.busyDrops})`);
      c.ok(w.q72 === 1, `on a 72Hz screen 60fps steps down (${w.q72})`);
      c.ok(w.manual === 'high' && w.manualDrops === 0, `a manual choice is never changed (${w.manual}, ${w.manualDrops})`);
      c.ok(!p.errors.length, 'pause/auto page errors: ' + p.errors.slice(0, 3).join(' | '));
      await p.context().close(); }
  } finally { await b.close(); }
  return c.fails;
}
