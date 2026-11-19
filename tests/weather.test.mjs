// WEATHER AND THE TIME OF DAY (js/weather.js): every kind of weather at dawn, midday, sunset and night in every place:
//   - no errors, nothing NaN
//   - no shader is built while it changes (once the place has warmed up): every one was built while it loaded
//   - the draw calls stay within each place's budget (perf.test.mjs) in the busiest weather
//   - outdoors: the rain / snow follows the camera, falls where it's open (not indoors), the sky and the light go dark
//     at night; the sound is muffled inside (the pub, all of Lidl) and open outside (the car park, the beer garden)
//   - Imposter's fog and lights-out stay in charge while they're on
//   - in a room the host's weather and time are everyone's (two real games through the real room server)
import { launch, newPage, startGame, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';

const BUDGET = { pub: 560, shop: 800, restaurant: 220, garden: 400, bedroom: 120 };
const MODES = { pub: 'roam', shop: 'roam0', restaurant: 'roam0', garden: 'roam0', bedroom: 'roam0' };
const PLACES = (process.env.PLACES || 'pub,shop,restaurant,garden,bedroom').split(',');

export default async function () {
  const C = checker('weather'), b = await launch();
  try {
    for (const place of PLACES) {
      const p = await newPage(b, { width: 900, height: 560 });
      try {
        await startGame(p, { place, mode: MODES[place] });
        await p.waitForFunction(() => RS.cast.every(c => !c.rag || c.rag.ready), null, { timeout: 120000 }).catch(() => {}); await p.waitForTimeout(1500);
        await p.waitForFunction(() => window.__shaderWarm, null, { timeout: 240000 });
        const r = await p.evaluate(async (place) => {
          RS.renderer.setAnimationLoop(null);
          const W = window.__weather, T = RS.THREE, R = RS.renderer, st = RS.room.start, out = { place, bad: [] };
          const cam = new T.PerspectiveCamera(70, 900 / 560, 0.05, 40); const look = (x, y, z, yaw, pitch = -0.05) => { cam.position.set(x, y, z); cam.rotation.set(pitch, yaw, 0, 'YXZ'); cam.updateMatrixWorld(); R.info.reset(); R.render(RS.scene, cam); return R.info.render.calls; };
          for (let i = 0; i < 3; i++) { RS.sim(0.2, 1 / 30); look(st.x, 1.6, st.z, st.yaw || 0); }
          const n0 = R.info.programs.length, kinds = Object.keys(W.WEATHERS);
          out.kinds = kinds.length;
          // every weather at dawn, midday, sunset and night, seen four ways (and a lightning strike in the storm)
          for (const w of kinds) for (const tod of [0.245, 0.5, 0.757, 0.9]) {
            W.set(w, tod); RS.sim(0.4, 1 / 30); if (w === 'storm') { W.acc.boltT = 0; RS.sim(0.1, 1 / 30); }
            for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) look(st.x, 1.6, st.z, yaw);
            const U = W.U; for (const k in U) for (const c of ['x', 'y', 'z', 'w']) if (!Number.isFinite(U[k][c])) out.bad.push(`${w}@${tod}: ${k}.${c} = ${U[k][c]}`);
          }
          // and gradually: a whole day going by while it changes from one to the next on its own
          W.setWeather('auto'); W.setTime('cycle'); W.state.autoT = 0.5; for (let i = 0; i < 40; i++) { RS.sim(1, 1 / 10); W.state.tod = (W.state.tod + 0.025) % 1; if (i % 4 === 0) look(st.x, 1.6, st.z, st.yaw || 0); }
          out.built = R.info.programs.length - n0;
          // the busiest weather, at night: draw calls from the start spot, all four ways
          out.calls = 0; for (const w of ['storm', 'snow', 'hail', 'windy']) { W.set(w, 0.9); RS.sim(0.5, 1 / 30); for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) out.calls = Math.max(out.calls, look(st.x, 1.6, st.z, yaw)); }
          W.set('clear', 0.5); RS.sim(0.3, 1 / 30); out.callsClear = 0; for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) out.callsClear = Math.max(out.callsClear, look(st.x, 1.6, st.z, yaw));
          out.outdoor = W.parts.length > 0;
          // the light: outdoors dark at night and full by day (indoors stays lit)
          W.set('clear', 0.5); W.update(0.1, cam); out.dayOut = W.U.wxOut.x; out.dayIn = W.U.wxIn.x;
          W.set('clear', 0.0); W.update(0.1, cam); out.nightOut = W.U.wxOut.x; out.nightIn = W.U.wxIn.x;
          if (out.outdoor) {
            // the rain follows whoever's looking, and falls (and splashes) while it's raining
            W.set('heavy', 0.5); RS.sim(0.3, 1 / 30); const u = W.parts[0].material.uniforms.uCam.value;
            look(st.x + 3, 1.6, st.z - 2, 0); out.follow1 = u.distanceTo(cam.position); look(st.x - 4, 1.7, st.z + 1, 1); out.follow2 = u.distanceTo(cam.position);
            out.drawing = W.parts.slice(0, 2).map(m => m.geometry.drawRange.count);
            W.set('clear', 0.5); RS.sim(0.3, 1 / 30); out.drawingClear = W.parts.map(m => m.geometry.drawRange.count);
          }
          // indoors / outdoors (for the sound): somewhere inside and somewhere out in it
          const SPOT = { pub: [[0, -2], [10, -19]], garden: [[-2, 6], [0, -8]], shop: [[0, 0], null], restaurant: [[0, 0], null], bedroom: [[0, 0], null] }[place];
          const where = (s) => { const c2 = new T.PerspectiveCamera(); c2.position.set(s[0], 1.6, s[1]); c2.updateMatrixWorld(); for (let i = 0; i < 30; i++) W.update(0.1, c2); return W.acc.inside; };
          out.inside = where(SPOT[0]); if (SPOT[1]) out.outside = where(SPOT[1]);
          // Imposter's fog: left alone while it's locked; its lights-out dims the sun too
          const fog = RS.scene.fog; RS.scene.userData.fogLock = true; fog.near = 5; fog.far = 13; W.set('fog', 0.5); W.update(0.1, cam); R.render(RS.scene, cam); out.fogKept = fog.near === 5 && fog.far === 13; out.fogEverywhere = W.U.wxA.y === 0;
          RS.scene.userData.fogLock = false; W.update(0.1, cam); R.render(RS.scene, cam);
          if (RS.room.sun) { W.set('clear', 0.5); W.update(0.1, cam); const i0 = RS.room.sun.intensity; RS.scene.userData.wxDim = true; W.update(0.1, cam); out.dimmed = RS.room.sun.intensity < i0 * 0.2; RS.scene.userData.wxDim = false; W.update(0.1, cam); }
          // the pause menu has it
          out.menu = !!document.getElementById('pause-wx') && document.querySelectorAll('#wx-w button').length === kinds.length + 1;
          RS.scene.traverse(o => { if (o.position && !(isFinite(o.position.x) && isFinite(o.position.y) && isFinite(o.position.z))) out.bad.push('NaN position: ' + (o.name || o.type)); });
          return out;
        }, place);
        console.log(`  ${place}: ${r.kinds} weathers x 4 times, ${r.built} shaders built, ${r.calls} draws at worst (${r.callsClear} clear, budget ${BUDGET[place]}), light out ${r.dayOut.toFixed(2)} by day / ${r.nightOut.toFixed(2)} at night, inside ${r.inside.toFixed(2)}${r.outside != null ? ' / outside ' + r.outside.toFixed(2) : ''}${r.outdoor ? `, rain follows (${r.follow1.toFixed(3)}, ${r.follow2.toFixed(3)}), drawing ${r.drawing}` : ''}`);
        C.ok(!r.bad.length, `${place}: ` + r.bad.slice(0, 5).join(' | '));
        C.ok(r.built === 0, `${place}: ${r.built} shaders built while the weather and time changed (each one a stutter)`);
        C.ok(r.calls <= BUDGET[place], `${place}: ${r.calls} draw calls in the worst weather (budget ${BUDGET[place]})`);
        C.ok(r.dayOut > 0.9 && r.dayIn > 0.9, `${place}: a clear midday isn't full daylight (out ${r.dayOut}, in ${r.dayIn})`);
        C.ok(r.nightOut < 0.35, `${place}: outdoors isn't dark at midnight (${r.nightOut})`);
        C.ok(r.nightIn > 0.45, `${place}: indoors went too dark at night (${r.nightIn}): the lamps are on`);
        C.ok(r.inside > 0.9, `${place}: inside isn't heard as inside (${r.inside})`);
        if (r.outside != null) C.ok(r.outside < 0.1, `${place}: outside is heard as inside (${r.outside})`);
        C.ok(r.fogKept && r.fogEverywhere, `${place}: Imposter's fog was changed by the weather (kept ${r.fogKept}, everywhere ${r.fogEverywhere})`);
        if (r.dimmed !== undefined) C.ok(r.dimmed, `${place}: Imposter's lights-out didn't dim the sun`);
        C.ok(r.menu, `${place}: no WEATHER & TIME in the pause menu`);
        C.ok(r.outdoor === ['pub', 'garden'].includes(place), `${place}: rain ${r.outdoor ? 'falls' : "doesn't fall"} here`);
        if (r.outdoor) {
          C.ok(r.follow1 < 1e-3 && r.follow2 < 1e-3, `${place}: the rain doesn't follow the camera (${r.follow1}, ${r.follow2})`);
          C.ok(r.drawing.every(n => n > 0), `${place}: no rain or splashes drawn in a downpour (${r.drawing})`);
          C.ok(r.drawingClear.every(n => n === 0), `${place}: rain drawn on a sunny day (${r.drawingClear})`);
        }
        C.ok(!p.errors.length, `${place}: page errors: ` + [...new Set(p.errors)].slice(0, 4).join(' | '));
        const cr = p.crashes.filter(c => c.k !== 'start' && c.k !== 'hang'); C.ok(!cr.length, `${place}: crash reports: ` + cr.slice(0, 3).map(c => c.k + ' ' + c.m).join(' | '));
      } finally { await p.context().close(); }
    }
    if (!process.env.NOMP) await multiplayer(b, C);
  } finally { await b.close(); }
  return C.fails;
}

// two real games in a room: the host picks the weather and the time, the guest gets the same (and can't change it)
async function multiplayer(b, C) {
  const host = await startRoomHost();
  try {
    const H = await newPage(b, { width: 900, height: 560 }), G = await newPage(b, { width: 390, height: 844, mobile: true });
    const ev = (p, f, a) => p.evaluate(f, a), cl = (p, s) => ev(p, (s) => document.querySelector(s).click(), s);
    for (const p of [H, G]) { await p.goto('http://game.local/index.html?relay=' + encodeURIComponent(host.url)); await p.waitForTimeout(2000); }
    const join = async (p, n, ch, code) => { await cl(p, '.playbtn'); await sleep(400); await cl(p, '#pick-multi'); await sleep(400);
      await ev(p, ([n, c]) => { document.querySelector('#mp-myname').value = n; document.querySelector(`#char-grid .mate[data-id="${c}"]`).click(); }, [n, ch]); await cl(p, '#char-next'); await sleep(400);
      if (!code) { await cl(p, '#mp-host2'); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.code && ronnieMP.net.status === 'on', null, { timeout: 30000 }); return ev(p, () => ronnieMP.net.code); }
      await ev(p, (c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on', null, { timeout: 30000 }); };
    const code = await join(H, 'HOSTY', 'lewis'); await join(G, 'GUESTY', 'chloe', code);
    await cl(H, '#room-go'); await sleep(400); await ev(H, () => document.querySelector('.scene[data-id="pub"]').click()); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="place"] .bigbtn').click()); await sleep(500);
    await ev(H, () => { const f = () => document.querySelector('.flip[data-id="roam"]') || document.querySelector('.flip[data-id="everyone"]'); f().click(); f().click(); }); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="mode"] .bigbtn').click()); await sleep(500); await cl(H, '#go');
    for (const p of [H, G]) { await p.waitForFunction(() => document.querySelector('.screen[data-s="intro"].on') || document.body.classList.contains('ready'), null, { timeout: 180000 }); await ev(p, () => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); }); }
    for (const p of [H, G]) { await p.waitForFunction(() => window.RS && window.__weather && document.body.classList.contains('ready'), null, { timeout: 240000 }); await ev(p, () => document.getElementById('play-flat').click()); }
    for (const p of [H, G]) await ev(p, () => { RS.renderer.setAnimationLoop(null); window.__run = setInterval(() => { try { RS.sim(0.1, 0.05); } catch (e) {} }, 100); });
    await sleep(3000);
    // the host picks snow at night, through the pause menu's buttons
    await ev(H, () => { document.getElementById('menu-btn').click(); document.getElementById('pause-wx').click(); window.__menuOpenAt = 0; document.querySelector('#wx-w button[data-w="snow"]').click(); document.querySelector('#wx-t button[data-t="night"]').click(); });
    await sleep(6000);
    const look = (p) => ev(p, () => { const W = window.__weather; return { type: W.type, want: W.state.want, time: W.state.time, tod: W.tod, snow: W.params.snow, locked: [...document.querySelectorAll('#wx-w button')].every(x => x.disabled), host: RS.net.host }; });
    let h = await look(H), g = await look(G);
    C.ok(h.type === 'snow' && h.time === 'night', `mp: the host's pick didn't take: ${JSON.stringify(h)}`);
    C.ok(g.type === 'snow' && g.time === 'night', `mp: the guest didn't get the host's snow at night: ${JSON.stringify(g)}`);
    C.ok(Math.abs(h.tod - g.tod) < 0.02, `mp: the guest's time of day is off the host's: ${h.tod} / ${g.tod}`);
    C.ok(g.snow > 0.3, `mp: the guest's snow never started (${g.snow})`);
    C.ok(g.locked && !h.locked, `mp: the weather buttons: guest locked ${g.locked}, host locked ${h.locked}`);
    // the guest can't change it for everyone (its own pick isn't sent, and the host's carries on)
    await ev(G, () => window.__weather.setWeather('heatwave')); await sleep(6500);
    h = await look(H); g = await look(G);
    C.ok(h.type === 'snow', `mp: a guest changed the host's weather: ${h.type}`);
    C.ok(g.type === 'snow', `mp: the guest's own pick stuck: ${g.type} (the host says snow)`);
    // the host changes it again: a storm, the day cycle
    await ev(H, () => { window.__weather.setWeather('storm'); window.__weather.setTime('cycle'); }); await sleep(5000);
    g = await look(G);
    C.ok(g.type === 'storm' && g.time === 'cycle', `mp: the host's second change didn't reach the guest: ${JSON.stringify(g)}`);
    const bad = await ev(G, () => RS.net.badMsgs || 0), badH = await ev(H, () => RS.net.badMsgs || 0);
    C.ok(!bad && !badH, `mp: weather messages thrown away by the message checks: host ${badH}, guest ${bad}`);
    for (const [n, p] of [['host', H], ['guest', G]]) C.ok(!p.errors.length, `mp ${n}: page errors: ` + [...new Set(p.errors)].slice(0, 4).join(' | '));
    console.log(`  multiplayer: guest follows the host (${g.type}, ${g.time}), guest's buttons locked`);
  } finally { await host.close(); }
}
