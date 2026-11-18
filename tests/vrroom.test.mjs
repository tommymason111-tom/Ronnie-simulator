// HEADSETS AND PHONES TOGETHER: two Quest headsets (emulated: one on controllers, one on hand tracking with its fingers
// moving) and two phones join one room through the real menus, each on its own pretend network (wired, wifi, 4G, a
// weak 4G), through the real room server. The headsets wave, circle, punch and walk; the phones walk about.
// Every game records, every frame, exactly where it DRAWS everyone else's hands, wrists and fingers. Checked:
//   - no flailing: a hand is never further from its shoulder than an arm reaches, and never jumps across the room
//   - no jitter: frame to frame, a moving hand follows a smooth path (its wobble off a smooth path is tiny)
//   - it really follows them: the arm moves about as much as the player's real arm does (not frozen, not exaggerated;
//     a full-length punch is as long as the character's arm allows: that, and exact smoothness, are in arms.test.mjs)
//   - fingers: a hand-tracked player's finger curl reaches everyone and moves smoothly
//   - everyone sees everyone, no errors, no message thrown away
// env: SECS (seconds of each motion, default 6), MOTIONS (just these, e.g. "waving,punching"), NETS (four 'delay/jitter' pairs, e.g. "5/2,25/15,60/40,120/90")
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';

const SECS = +(process.env.SECS || 6);
const NETS = (process.env.NETS || '5/2,25/15,60/40,120/90').split(',');
const WHO = [['HEADSET1', 'lewis', 'quest'], ['HEADSET2', 'chloe', 'quest'], ['PHONEONE', 'ethan', 'phone'], ['PHONETWO', 'harry', 'phone']];

export default async function () {
  const C = checker('vrroom'), host = await startRoomHost(), b = await launch();
  try {
    const pages = [];
    for (const [i, [name, ch, kind]] of WHO.entries()) {
      const p = kind === 'quest' ? await newPage(b, { width: 700, height: 500, xr: true }) : await newPage(b, { width: 390, height: 844, mobile: true });
      p.pname = name; p.ch = ch; p.kind = kind; p.net = NETS[i % NETS.length]; pages.push(p);
      await p.goto('http://game.local/index.html?relay=' + encodeURIComponent(host.url + '/net/' + p.net)); await p.waitForTimeout(1500);
    }
    const ev = (p, f, a) => p.evaluate(f, a), cl = (p, s) => ev(p, (s) => document.querySelector(s).click(), s);
    const join = async (p, code) => { await cl(p, '.playbtn'); await sleep(400); await cl(p, '#pick-multi'); await sleep(400);
      await ev(p, ([n, c]) => { document.querySelector('#mp-myname').value = n; document.querySelector(`#char-grid .mate[data-id="${c}"]`).click(); }, [p.pname, p.ch]); await cl(p, '#char-next'); await sleep(400);
      if (!code) { await cl(p, '#mp-host2'); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.code && ronnieMP.net.status === 'on', null, { timeout: 60000 }); return ev(p, () => ronnieMP.net.code); }
      await ev(p, (c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on', null, { timeout: 60000 }); };
    const H = pages[0], code = await join(H); for (const p of pages.slice(1)) await join(p, code);
    // the host starts free roam (just the players) in the pub
    await cl(H, '#room-go'); await sleep(400); await ev(H, () => document.querySelector('.scene[data-id="pub"]').click()); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="place"] .bigbtn').click()); await sleep(500);
    await ev(H, () => { const f = () => document.querySelector('.flip[data-id="roam"]'); f() && f().click(); }); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="mode"] .bigbtn').click()); await sleep(500); await cl(H, '#go');
    for (const p of pages) { await p.waitForFunction(() => document.querySelector('.screen[data-s="intro"].on') || document.body.classList.contains('ready'), null, { timeout: 150000 }); await ev(p, () => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); }); }
    for (const p of pages) await p.waitForFunction(() => window.RS && document.body.classList.contains('ready'), null, { timeout: 200000 });
    if (await ev(H, () => RS.director.mode !== 'roam')) await ev(H, () => RS.newGame('roam0'));
    // into the game: headsets into VR (the second on hand tracking), phones play flat. Nothing is drawn (four software-
    // drawn games on a few cores): everything else runs as it would, VR frames included
    for (const p of pages) {
      await ev(p, () => { RS.renderer.render = () => {}; window.__f = 0; RS.onFrame.push(() => { window.__f++; }); });
      if (p.kind === 'quest') { if (p === pages[1]) await ev(p, () => { xrd.primaryInputMode = 'hand'; });
        await ev(p, () => RS.renderer.xr.setFramebufferScaleFactor(0.12)); await cl(p, '#enter-vr');
        await p.waitForFunction(() => RS.renderer.xr.isPresenting, null, { timeout: 40000 }).catch(() => C.ok(false, p.pname + ' never got into VR')); }
      else await cl(p, '#play-flat');
    }
    await sleep(6000);      // (everyone's models load, everyone's poses arrive)
    // everyone records exactly what they draw of everyone else, every frame: the moment each one's been posed (that's
    // what goes on screen; the physics step after it carries the bodies a little further, and that isn't drawn), timed
    // by the clock that pose was worked out for (the frame's start isn't it: on this busy machine a long frame made a
    // normal step look like it took 6ms)
    for (const p of pages) await ev(p, () => { window.__rec = {}; const V = RS.THREE.Vector3;
      const one = [...RS.net.players.values()].find(q => q.avatar); const proto = Object.getPrototypeOf(one.avatar), up0 = proto.update;
      proto.update = function (dt, pose) { const out = up0.call(this, dt, pose); const av = this, r = av.c && av.c.rag;
        if (window.__recOn && !av.p.self && r && r.parts && r.parts.lArmR) { const rec = __rec[av.p.name] || (__rec[av.p.name] = []);
          const g = (n) => { const v = r.grip ? r.grip(n, new V()) : r.pos(n, new V()); return [v.x, v.y, v.z]; }, sh = (n) => { const v = r.pos(n, new V()); return [v.x, v.y, v.z]; };
          rec.push({ t: av.jit && av.jit.pn ? av.jit.pn : performance.now(), R: g('lArmR'), L: g('lArmL'), sR: sh('uArmR'), sL: sh('uArmL'), ch: sh('chest'), h: r.height || 1.7, s: (r.group && r.group.scale.y) || 1,
            cR: r.handPose && r.handPose.lArmR ? r.handPose.lArmR.curl : null, mode: r.mode, dn: av.down > 0 || r.mode !== 'anim' || !av.jit }); }
        return out; }; });
    // each headset's own real hands, for the truth (how far they really move)
    for (const p of pages.filter(q => q.kind === 'quest')) await ev(p, () => { window.__mine = []; RS.onFrame.push(() => { if (!window.__recOn) return; const P = RS.player, R = P.hands.find(h => h.handedness === 'right') || P.hands[0]; window.__mine.push([R.palm.x, R.palm.y, R.palm.z]); }); });

    // ---- the motions (the headsets move their real hands; the phones walk about)
    const motion = async (label, setup) => {
      for (const p of pages.filter(q => q.kind === 'quest')) await ev(p, setup, p === pages[1]);
      for (const p of pages.filter(q => q.kind === 'phone')) await ev(p, () => { let t = 0; clearInterval(window.__walk); window.__walk = setInterval(() => { t += 0.05; RS.player.flatMove = { x: Math.sin(t * 0.6) * 0.4, z: Math.cos(t * 0.45) * 0.4 }; }, 50); });
      await sleep(1200);
      for (const p of pages) await ev(p, () => { for (const k in __rec) __rec[k].length = 0; if (window.__mine) __mine.length = 0; window.__recOn = true; });
      await sleep(SECS * 1000);
      for (const p of pages) await ev(p, () => { window.__recOn = false; });
      const got = [];
      for (const p of pages) got.push(await ev(p, () => ({ rec: __rec, mine: window.__mine || null, f: __f, bad: RS.net.badMsgs || 0 })));
      check(label, got);
      for (const p of pages.filter(q => q.kind === 'quest')) await ev(p, () => { clearInterval(window.__mv); });
    };
    // a hand on a controller (or a tracked hand) moving round a path in front of the headset, 72 times a second
    for (const p of pages.filter(q => q.kind === 'quest')) await ev(p, () => { const H = {}; window.__home = (R, L) => { for (const [k, x] of [['R', R], ['L', L]]) if (x && !H[k]) H[k] = x.position.clone(); return [H.R.clone(), H.L ? H.L.clone() : null]; }; });      // (each motion starts from the same resting spot, not wherever the last one left the hand)
    const SETUPS = {
      'waving': (hand) => { const D = xrd, src = hand ? D.hands : D.controllers, R = src.right, L = src.left, [r0, l0] = __home(R, L); let t = 0;
        clearInterval(window.__mv); window.__mv = setInterval(() => { t += 1 / 72; R.position.set(r0.x + 0.14 * Math.sin(t * 9), r0.y + 0.25 + 0.05 * Math.sin(t * 18), r0.z - 0.1); L.position.set(l0.x, l0.y + 0.05 * Math.sin(t * 3), l0.z);
          if (hand) { const w = 0.5 + 0.5 * Math.sin(t * 4); for (const f of ['middle', 'ring', 'pinky', 'index']) { try { R.setFingerPose(f, 'fist', w); } catch (e) {} } } }, 1000 / 72); },
      'circles': (hand) => { const D = xrd, src = hand ? D.hands : D.controllers, R = src.right, L = src.left, [r0, l0] = __home(R, L); let t = 0;
        clearInterval(window.__mv); window.__mv = setInterval(() => { t += 1 / 72; R.position.set(r0.x + 0.22 * Math.cos(t * 6), r0.y + 0.2 + 0.22 * Math.sin(t * 6), r0.z - 0.15); L.position.set(l0.x - 0.15 * Math.cos(t * 4), l0.y + 0.15 * Math.sin(t * 4), l0.z - 0.1); }, 1000 / 72); },
      'punching': (hand) => { const D = xrd, src = hand ? D.hands : D.controllers, R = src.right, [r0] = __home(R, src.left); let t = 0;
        clearInterval(window.__mv); window.__mv = setInterval(() => { t += 1 / 72; const ph = (t % 0.9) / 0.9, k = ph < 0.15 ? ph / 0.15 : ph < 0.5 ? 1 - (ph - 0.15) / 0.35 : 0, e = k * k * (3 - 2 * k); R.position.set(r0.x - 0.05 * e, r0.y + 0.1 * e, r0.z - 0.45 * e); }, 1000 / 72); },
      'walking and waving': (hand) => { const D = xrd, src = hand ? D.hands : D.controllers, R = src.right, [r0] = __home(R, src.left); let t = 0;
        if (!hand) D.controllers.left.updateAxes('thumbstick', 0, -0.7);
        clearInterval(window.__mv); window.__mv = setInterval(() => { t += 1 / 72; R.position.set(r0.x + 0.1 * Math.sin(t * 7), r0.y + 0.2, r0.z - 0.12); }, 1000 / 72); },
    };
    const results = [];
    const check = (label, got) => {
      for (const [wi, w] of pages.entries()) {
        const g = got[wi];
        C.ok(!g.bad, `${label}: ${w.pname} threw away ${g.bad} real messages`);
        for (const [si, s] of pages.entries()) {
          if (si === wi) continue;
          const rec = g.rec[s.pname]; if (!rec || rec.length < 5) { C.ok(false, `${label}: ${w.pname} hardly drew ${s.pname} (${rec ? rec.length : 0} frames)`); continue; }
          // no flailing: the drawn hand stays within an arm's reach of its shoulder, and never leaps between frames
          // (someone punched hard enough is knocked flat: a ragdoll, flung on purpose, then getting back up. Those moments,
          // and a second either side, aren't checked here: it's meant to fly)
          let lastDn = -1e9; const calm = rec.map(e => { if (e.dn) lastDn = e.t; return e.t - lastDn > 1500; });
          for (let i = rec.length - 1, nx = 1e12; i >= 0; i--) { if (rec[i].dn) nx = rec[i].t; if (nx - rec[i].t < 1000) calm[i] = false; }
          let reach = 0, leap = 0, leapAt = null, bodyLeap = 0, bodyAt = null; const a0 = (i) => rec[i - 1].t; const lim = (e) => 0.82 * (e.h / 1.7) * Math.max(1, e.s);
          for (let i = 0; i < rec.length; i++) { const e = rec[i];
            if (calm[i]) for (const [hd, sh] of [[e.R, e.sR], [e.L, e.sL]]) reach = Math.max(reach, Math.hypot(hd[0] - sh[0], hd[1] - sh[1], hd[2] - sh[2]) / lim(e));
            // (the arm measured from the chest: the whole body catching up after this busy test machine froze for a moment
            // isn't a flailing arm; the body is checked on its own, looser, below)
            if (i && calm[i] && calm[i - 1] && e.t - a0(i) <= 150) { const a = rec[i - 1], dt = Math.max((e.t - a.t) / 1000, 1 / 90); const bl = Math.hypot(e.ch[0] - a.ch[0], e.ch[2] - a.ch[2]) / dt; if (bl > bodyLeap) { bodyLeap = bl; bodyAt = { i, n: rec.length, dtMs: Math.round(e.t - a.t), cm: +(bl * dt * 100).toFixed(1) }; }
              for (const k of ['R', 'L']) { const v = Math.hypot(...[0, 1, 2].map(j => (e[k][j] - e.ch[j]) - (a[k][j] - a.ch[j]))) / dt;
              if (v > leap) { leap = v; leapAt = { k, i, dtMs: Math.round(e.t - a.t), body: +(Math.hypot(e.ch[0] - a.ch[0], e.ch[1] - a.ch[1], e.ch[2] - a.ch[2]) / dt).toFixed(1), arm: +(Math.hypot(...[0, 1, 2].map(j => (e[k][j] - e.ch[j]) - (a[k][j] - a.ch[j]))) / dt).toFixed(1), mode: e.mode }; } } } }
          // jitter: how far each frame's hand is off the smooth line through its neighbours (a wobble), after taking
          // away how the whole body moved (walking), in millimetres: typical and worst
          // (only where this game drew quickly enough to tell: a software-emulated headset can manage just a few frames a
          // second here, and between frames that far apart a real wave curves a long way. tests/arms.test.mjs measures
          // this exactly, on a fake clock, at 72 and 30 frames a second)
          const wob = []; const W5 = [-3, 12, 17, 12, -3];
          for (let i = 2; i < rec.length - 2; i++) { if (rec[i + 2].t - rec[i - 2].t > 4 * 25 || !calm[i - 2] || !calm[i + 2]) continue;
            for (const k of ['R', 'L']) { const rel = (x) => [x[k][0] - x.ch[0], x[k][1] - x.ch[1], x[k][2] - x.ch[2]]; const P = [-2, -1, 0, 1, 2].map(o => rel(rec[i + o]));
              const m = [0, 1, 2].map(j => P.reduce((acc, x, n) => acc + x[j] * W5[n], 0) / 35); wob.push(Math.hypot(...[0, 1, 2].map(j => P[2][j] - m[j])) * 1000); } }
          wob.sort((x, y) => x - y); const med = wob[Math.floor(wob.length / 2)] || 0, p99 = wob[Math.floor(wob.length * 0.99)] || 0;
          // follows: how far the drawn right hand moves about (relative to the shoulder) vs how far theirs really did
          let range = 0; if (s.kind === 'quest') { const xs = rec.map(e => e.R.map((v, j) => v - e.ch[j])); for (let j = 0; j < 3; j++) { const v = xs.map(x => x[j]).sort((a, b) => a - b); range = Math.max(range, v[Math.floor(v.length * 0.95)] - v[Math.floor(v.length * 0.05)]); } }
          let realRange = 0; const mine = got[si].mine; if (mine && mine.length > 20) for (let j = 0; j < 3; j++) { const v = mine.map(x => x[j]).sort((a, b) => a - b); realRange = Math.max(realRange, v[Math.floor(v.length * 0.95)] - v[Math.floor(v.length * 0.05)]); }
          const curls = rec.map(e => e.cR).filter(v => v != null), curlRange = curls.length ? Math.max(...curls) - Math.min(...curls) : 0;
          let curlJump = 0; for (let i = 1; i < rec.length; i++) { const a = rec[i - 1], e = rec[i]; if (a.cR != null && e.cR != null) curlJump = Math.max(curlJump, Math.abs(e.cR - a.cR) / Math.max((e.t - a.t) / 1000, 1 / 90)); }      // (how fast the curl changes: per second)
          results.push({ label, watcher: w.pname, net: w.net, sees: s.pname, theirNet: s.net, frames: rec.length, reach: +reach.toFixed(2), leap: +leap.toFixed(1), wobble: +med.toFixed(1), wobble99: +p99.toFixed(1), range: +range.toFixed(2), realRange: +realRange.toFixed(2), curlRange: +curlRange.toFixed(2), curlJump: +curlJump.toFixed(2) });
          const tag = `${label}: ${w.pname} (${w.net}) watching ${s.pname} (${s.net})`;
          C.ok(reach <= 1.05, `${tag}: a hand was drawn ${(reach * 100).toFixed(0)}% of an arm's reach from its shoulder (flailing)`);
          C.ok(leap < 8, `${tag}: a hand leapt at ${leap.toFixed(1)} m/s between two frames (from the chest) ${JSON.stringify(leapAt)}`);
          C.ok(bodyLeap < 15, `${tag}: their whole body leapt at ${bodyLeap.toFixed(1)} m/s ${JSON.stringify(bodyAt)}`);
          if (wob.length > 60) C.ok(med < 6 && p99 < 32, `${tag}: hands wobble ${med.toFixed(1)}mm typically, ${p99.toFixed(1)}mm at worst, off a smooth path (jitter)`);
          if (s.kind === 'quest' && realRange > 0.15 && label !== 'walking and waving' && label !== 'punching') C.ok(range > realRange * 0.45 && range < realRange * 1.6, `${tag}: their arm moves ${range.toFixed(2)}m drawn vs ${realRange.toFixed(2)}m for real (not following)`);
          if (s === pages[1] && label === 'waving') C.ok(curlRange > 0.25 && curlJump < 15, `${tag}: fingers: curl range ${curlRange.toFixed(2)}, fastest change ${curlJump.toFixed(1)}/s (a snap)`);
        }
      }
    };
    for (const [label, setup] of Object.entries(SETUPS)) if (!process.env.MOTIONS || process.env.MOTIONS.split(',').includes(label)) await motion(label, setup);
    // a summary table (the worst of each, for each watcher's view of a headset)
    const heads = results.filter(r => r.sees.startsWith('HEADSET'));
    console.log('  worst over all views of the headsets:', JSON.stringify({ reach: Math.max(...heads.map(r => r.reach)), leap: Math.max(...heads.map(r => r.leap)), wobble: Math.max(...heads.map(r => r.wobble)), wobble99: Math.max(...heads.map(r => r.wobble99)) }));
    for (const r of results.filter(r => r.sees.startsWith('HEADSET'))) console.log(`   ${r.label.padEnd(18)} ${r.watcher.padEnd(9)} sees ${r.sees.padEnd(9)} frames ${String(r.frames).padStart(4)} reach ${r.reach} leap ${r.leap}m/s wobble ${r.wobble}/${r.wobble99}mm range ${r.range}/${r.realRange}m${r.curlRange ? ' fingers ' + r.curlRange : ''}`);
    for (const p of pages) { C.ok(!p.errors.length, `${p.pname}: page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
      const cr = p.crashes.filter(c => c.k !== 'start' && c.k !== 'hang'); C.ok(!cr.length, `${p.pname}: crash reports: ` + cr.slice(0, 3).map(c => c.k + ' ' + c.m).join(' | ')); }
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
