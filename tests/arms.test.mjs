// SMOOTH ARMS ON OTHER PLAYERS: a pretend remote player (a headset, or a phone) whose poses come through a pretend
// network (from a near-perfect line to a bad one: 120ms late, 90ms of jitter), drawn by the real SquadPuppet on a fake
// clock, at a headset's 72 frames a second and a struggling phone's 30. What's DRAWN is measured every frame:
//   - reach: the hand never further from the shoulder than an arm can go (flailing: an arm flung out after a stray point)
//   - leap: the hand never jumps faster than a real hand moves (a phone player's arm came up to eat in a frame: 28 m/s)
//   - wobble: how far the hand strays from a smooth path frame to frame (jitter), relative to the chest
//   - range: a VR wave or circle comes through at most of its real size (not smoothed away to nothing)
//   - a late pose after a hitch: the newest two poses sent 3ms apart (a stalled frame, then a quick one), and the next
//     one late: carrying on from just those two turned a 1cm wobble into metres a second, the whole body thrown across
//     the room for a frame. It carries on at the speed they were really going
import { launch, newPage, startGame, checker } from './lib/game.mjs';
const CASES = ['vr:wave', 'vr:circle', 'vr:punch', 'vr:still', 'vr:walkwave', 'phone:walk', 'phone:walkturn', 'phone:eat'];
const NETS = ['5/2', '120/90'], FPS = [72, 30];

export default async function () {
  const C = checker('arms'), b = await launch();
  try {
    const p = await newPage(b, { width: 640, height: 400 }); await startGame(p, { place: 'grid', mode: 'roam', dev: true });
    const out = await p.evaluate(async ({ CASES, NETS, FPS }) => {
      RS.renderer.setAnimationLoop(null); const T = RS.THREE, V = T.Vector3, real = performance.now.bind(performance); let fake = 1e6; performance.now = () => fake;
      const res = []; let seed = 1; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647; const gauss = () => { let u = rnd() || 1e-9, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * v); };
      for (const cs of CASES) for (const net of NETS) for (const fps of FPS) {
        const [kind, motion] = cs.split(':'), [lat, jit] = net.split('/').map(Number);
        const pl = { char: 'lewis', name: 'T', buf: [] }; const av = RS.net.makeAvatar(pl); await new Promise(r => setTimeout(r, 1500));
        const P0 = RS.player.head, ox = P0.x + 2.2, oz = P0.z;
        // the remote player's true pose at time t (s): head, facing, hands (world)
        const truth = (t) => { let hx = ox, hz = oz, yaw = Math.PI / 2, R = [0.25, -0.45, 0.25], L = [-0.25, -0.45, 0.25]; const s = Math.sin, c = Math.cos;
          if (motion === 'wave') R = [0.25 + 0.14 * s(t * 9), 0.0 + 0.05 * s(t * 18), 0.3];
          if (motion === 'circle') { R = [0.25 + 0.22 * c(t * 6), -0.2 + 0.22 * s(t * 6), 0.35]; L = [-0.25 - 0.15 * c(t * 4), -0.25 + 0.15 * s(t * 4), 0.3]; }
          if (motion === 'punch') { const ph = (t % 0.9) / 0.9, k = ph < 0.15 ? ph / 0.15 : ph < 0.5 ? 1 - (ph - 0.15) / 0.35 : 0, e = k * k * (3 - 2 * k); R = [0.2 - 0.05 * e, -0.35 + 0.1 * e, 0.2 + 0.4 * e]; }
          if (motion === 'walkwave' || motion === 'walk' || motion === 'walkturn' ) { hx += 1.2 * s(t * 0.5); hz += 0.8 * s(t * 0.35); yaw = Math.PI / 2 + (motion === 'walkturn' ? 1.5 * s(t * 0.7) : 0.3 * s(t * 0.5)); if (motion === 'walkwave') R = [0.25 + 0.1 * s(t * 7), -0.1, 0.3]; }
          const F = [Math.sin(yaw), Math.cos(yaw)], Rt = [Math.cos(yaw), -Math.sin(yaw)], W = (o) => [hx + Rt[0] * o[0] + F[0] * o[2], 1.62 + o[1], hz + Rt[1] * o[0] + F[1] * o[2]];
          return { h: [hx, 1.62, hz], yaw, rh: W(R), l: W(L) }; };
        const sendHz = 20, dur = 6, frames = Math.round(dur * fps); let nextSend = 0, lastArr = 0; const inflight = []; const rec = [];
        const noise = kind === 'vr' ? 0.0015 : 0;      // (a Quest controller's tracking noise: ~1.5mm)
        for (let i = 0; i < frames; i++) {
          const t = i / fps; fake += 1000 / fps;
          // the sender: poses on its own frames (72/s for a headset, 60 for a phone), sent at most 20 times a second
          const sfps = kind === 'vr' ? 72 : 60; while (nextSend <= t) { const st = nextSend; const tr = truth(st); const j = () => kind === 'vr' ? gauss() * noise : 0;
            const q = new T.Quaternion().setFromAxisAngle(new V(0, 1, 0), tr.yaw + Math.PI); const r3 = (a) => a.map(v => Math.round(v * 1000) / 1000);
            let rh = tr.rh, l = tr.l; if (kind === 'phone') { const fw = [Math.sin(tr.yaw), Math.cos(tr.yaw)], rt = [Math.cos(tr.yaw), -Math.sin(tr.yaw)]; rh = [tr.h[0] + fw[0] * 0.4 + rt[0] * 0.18, tr.h[1] - 0.21, tr.h[2] + fw[1] * 0.4 + rt[1] * 0.18]; l = tr.h;
              if (motion === 'eat') { const ph = st % 3, k0 = ph < 0.25 ? ph / 0.25 : ph < 1 ? 1 : ph < 1.25 ? 1 - (ph - 1) / 0.25 : 0, k = k0 * k0 * (3 - 2 * k0), m = [tr.h[0] + fw[0] * 0.15, tr.h[1] - 0.08, tr.h[2] + fw[1] * 0.15]; rh = rh.map((v, j) => v + (m[j] - v) * k); } }
            const m = { t: 'p', c: 'lewis', h: r3(tr.h), q: [q.x, q.y, q.z, q.w].map(v => Math.round(v * 100) / 100), rh: r3(rh.map(v => v + j())), l: r3(l.map(v => v + j())), s: 1, st: 0, ts: Math.round(1e6 + st * 1000), flat: kind === 'phone' ? 1 : 0 };
            const arr = Math.max(lastArr, st * 1000 + lat + rnd() * jit); lastArr = arr; inflight.push({ arr, m }); nextSend += 1 / sendHz; }
          while (inflight.length && inflight[0].arr <= t * 1000) { const x = inflight.shift(); pl.pose = x.m; pl.at = fake; pl.buf.push({ t: fake, ts: x.m.ts, m: x.m }); if (pl.buf.length > 40) pl.buf.shift(); }
          // (measured as drawn: straight after the avatar's posed, before the physics step carries its bodies on)
          if (pl.pose) av.update(1 / fps, pl.pose);
          const step = () => RS.physics.step(1 / fps);
          const r = av.c.rag; if (!r.parts || !pl.pose) { step(); continue; }
          const g = (n) => { const v = r.grip(n, new V()); return [v.x, v.y, v.z]; }, sh = (n) => { const v = r.pos(n, new V()); return [v.x, v.y, v.z]; };
          const ht = av.hT && av.hT.R ? [av.hT.R.x, av.hT.R.y, av.hT.R.z] : null, raw = [av.rh.x, av.rh.y, av.rh.z];
          rec.push({ ht, raw, t: t * 1000, R: g('lArmR'), L: g('lArmL'), sR: sh('chest'), sL: sh('chest'), shR: sh('uArmR'), shL: sh('uArmL'), h: r.height, tr: truth(Math.max(0, t - 0.15)) });
          step();
        }
        av.dispose();
        // the measurements (after the first second)
        const R2 = rec.filter(e => e.t > 2000); let reach = 0, leap = 0; const wob = [];
        for (let i = 0; i < R2.length; i++) { const e = R2[i]; for (const [hd, s] of [[e.R, e.shR], [e.L, e.shL]]) reach = Math.max(reach, Math.hypot(hd[0] - s[0], hd[1] - s[1], hd[2] - s[2]) / (0.82 * e.h / 1.7));
          if (i) { const a = R2[i - 1], dt = (e.t - a.t) / 1000; for (const k of ['R', 'L']) { const lv = Math.hypot(e[k][0] - a[k][0], e[k][1] - a[k][1], e[k][2] - a[k][2]) / dt; if (lv > leap) { leap = lv; window.__lw = { k, t: e.t, body: (Math.hypot(e.sR[0] - a.sR[0], e.sR[2] - a.sR[2]) / dt).toFixed(2), rel: (Math.hypot(...[0,1,2].map(j => (e[k][j] - e.sR[j]) - (a[k][j] - a.sR[j]))) / dt).toFixed(2) }; } } }
          if (i > 1 && i < R2.length - 2) { for (const k of ['R', 'L']) { const sk = 's' + k, rel = (x) => [0, 1, 2].map(j => x[k][j] - x[sk][j]); const w5 = [-3, 12, 17, 12, -3], P = [-2, -1, 0, 1, 2].map(o => rel(R2[i + o])); const E = P[2], m = [0, 1, 2].map(j => P.reduce((acc, x, n) => acc + x[j] * w5[n], 0) / 35); wob.push(Math.hypot(...[0, 1, 2].map(j => E[j] - m[j])) * 1000); } } }
        wob.sort((x, y) => x - y); const rng = (arr) => { let m = 0; for (let j = 0; j < 3; j++) { const v = arr.map(x => x[j]).sort((a, b) => a - b); m = Math.max(m, v[Math.floor(v.length * 0.95)] - v[Math.floor(v.length * 0.05)]); } return m; };
        const drawn = rng(R2.map(e => e.R.map((v, j) => v - e.sR[j]))), realR = rng(R2.map(e => e.tr.rh.map((v, j) => v - e.tr.h[j])));
        const tgt = R2.filter(e => e.ht); const rngT = tgt.length ? rng(tgt.map(e => e.ht.map((v, j) => v - e.sR[j]))) : 0, rngRaw = rng(R2.map(e => e.raw.map((v, j) => v - e.sR[j]))); const err = tgt.length ? tgt.map(e => Math.hypot(...[0,1,2].map(j => e.R[j] - e.ht[j]))).sort((a,b)=>a-b) : [0];
        res.push({ c: kind + ':' + motion, net, fps, reach, leap, wobMed: wob[wob.length >> 1] || 0, wob99: wob[Math.floor(wob.length * 0.99)] || 0, drawn, realR, leapAt: window.__lw });
      }
      performance.now = real; return res; }, { CASES, NETS, FPS });
    const late = await p.evaluate(() => { const real = performance.now.bind(performance); let now = 0; performance.now = () => now;
      try { const pl = { char: 'lewis', name: 'L', buf: [] }, av = RS.net.makeAvatar(pl), m = (ts, x) => ({ t: 'p', c: 'lewis', h: [x, 1.62, 0], q: [0, 1, 0, 0], rh: [x + 0.2, 1.2, 0.3], l: [x - 0.2, 1.2, 0.3], s: 1, st: 0, ts, flat: 1 });
        for (let ts = 0; ts <= 500; ts += 50) pl.buf.push({ t: ts + 50, ts, m: m(ts, ts * 0.0015) });      // (walking at 1.5 m/s, a pose every 50ms)
        pl.buf.push({ t: 553, ts: 503, m: m(503, 503 * 0.0015 + 0.01) });                                   // (then one 3ms later, 1cm out)
        now = 553 + 110 + 80; const out = av.smoothPose(pl.buf[pl.buf.length - 1].m);                        // (and nothing more for a while)
        av.dispose(); return { x: out.h[0], truth: (now - 110 - 50) * 0.0015 };
      } finally { performance.now = real; } });
    C.ok(Math.abs(late.x - late.truth) < 0.1, `a late pose after a hitch: drawn ${(100 * Math.abs(late.x - late.truth)).toFixed(0)}cm from where they really are (thrown across the room)`);
    console.log(`  late pose after a hitch: drawn ${(100 * Math.abs(late.x - late.truth)).toFixed(1)}cm from the truth`);
    for (const r of out) {
      const k = `${r.c} (net ${r.net}, ${r.fps}fps)`;
      console.log(`  ${r.c.padEnd(15)} net ${r.net.padEnd(7)} ${String(r.fps).padStart(2)}fps  reach ${r.reach.toFixed(2)}  leap ${r.leap.toFixed(1)}m/s  wobble ${r.wobMed.toFixed(1)}/${r.wob99.toFixed(1)}mm  range ${r.drawn.toFixed(2)}/${r.realR.toFixed(2)}m`);
      C.ok(r.reach <= 1.05, `${k}: arm stretched to ${r.reach.toFixed(2)} of its length (flailing)`);
      C.ok(r.leap < 8, `${k}: hand leapt at ${r.leap.toFixed(1)} m/s ${JSON.stringify(r.leapAt)}`);
      // (at 30 frames a second a fast circle or a sharp punch really does bend a lot between frames: allowed more there)
      const [wm, w99] = r.fps >= 60 ? [3, 20] : [6, 32];
      C.ok(r.wobMed < wm && r.wob99 < w99, `${k}: jittery hand: wobble ${r.wobMed.toFixed(1)}mm typical, ${r.wob99.toFixed(1)}mm worst`);
      if (r.c === 'vr:still') C.ok(r.wob99 < 1.5, `${k}: a hand held still wobbles ${r.wob99.toFixed(1)}mm`);
      if (r.c === 'vr:wave' || r.c === 'vr:circle') C.ok(r.drawn >= 0.6 * r.realR, `${k}: the motion came through at ${(100 * r.drawn / r.realR).toFixed(0)}% of its size`);
    }
    C.ok(!p.errors.length, 'page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
