// DATE NIGHT (datenight.js), on a phone held upright first (most players), then a Quest headset, then a computer and a
// phone on its side. Upright phone: every film plays, its game can be won and lost (a little bot on a fake clock; losing
// is BUSTED: Chloe's reaction and a penalty), the camera comes back to your own eyes, nothing builds a shader mid-film,
// no page errors; each kind of film is looked at mid-game and mid-line: big buttons on the screen, no text on other
// text, a real finger tap plays. Quest: no film camera (your own eyes), the small panel in the middle, the trigger plays.
// Computer and phone on its side: the same screen checks. (SIZES=portrait,quest,desk,landscape picks)
// FILMS=look:phone,visit:harry runs just those; SHOTS=dir saves a picture of each one on the phone.
import fs from 'fs';
import { launch, newPage, startGame, checker } from './lib/game.mjs';

const ALL = ['look:phone', 'look:waiter', 'look:board', 'look:propose', 'look:lobster', 'waiter:order', 'waiter:trolley', 'waiter:napkin', 'toilet:loo', 'toilet:lipstick', 'toilet:queue',
  'visit:harry', 'visit:oliver', 'visit:pints', 'visit:dylan', 'visit:ethan'];
const FILMS = process.env.FILMS ? process.env.FILMS.split(',') : ALL;
const SIZES = (process.env.SIZES || 'portrait,quest,desk,landscape').split(',');
const SIZE = { portrait: [390, 844, true], desk: [900, 560, false], landscape: [844, 390, true] };
const CHECK = fs.readFileSync(new URL('./lib/textcheck.js', import.meta.url), 'utf8'), SHOTS = process.env.SHOTS || '';
// (runs in the page) a bot for each game: 'win' plays it properly, 'lose' gets caught
const BOT = `window.__dnBot = function (D, how) {
  const g = D.game; if (!g || g.result) return;
  const win = how === 'win', t = performance.now() / 1000, P = (i) => { if (g.buttons[i] && !g.buttons[i].off) D.press(i); };
  g.botT = g.botT || 0; const every = (s) => { if (g.t - g.botT >= s) { g.botT = g.t; return true; } return false; };
  switch (g.id) {
    case 'cram': if (win) { if (g.phase === 'turn' && !g.natural) P(g.buttons.length - 1); else if (g.phase === 'away' && g.cheeks < 0.4 && g.awayT > 0.8 && every(0.35)) P(0); } else if (every(0.15)) P(0); break;
    case 'signals': if (win) { if (g.st === 'menu' && g.stT > 0.3 && every(0.25)) P(g.code[g.idx]); } else if (g.st === 'up') P(0); break;
    case 'trolley': if (win) { const z = g.inZone(); if (z && !z.e && g.st === 'busy' && g.stT > 0.4) P(1); } else if (g.st === 'glance') P(0); break;
    case 'napkin': if (win) { const ok = g.st === 'busy' && g.stT > 0.25; if (ok && !g.holding) D.press(0); else if (!ok && g.holding) D.release(0); } else if (!g.holding) D.press(0); break;
    case 'raid': if (!g.buttons.length) break; if (win) { if (g.st === 'seat' && !g.didGo) { g.didGo = true; P(0); } else if (g.st === 'at') { if ((g.where.left > g.where.n - 2) && every(0.3)) P(0); else if (g.where.left <= g.where.n - 2) P(1); } } else if (g.st === 'seat' && !g.didGo) { g.didGo = true; P(0); } break;
    case 'react': if (win) { if (g.st === 'react') P(g.want === 'lol' ? 1 : 2); else if (g.st === 'tell' && g.stT > 0.8 && every(0.5)) P(0); } else if (g.st === 'react') P(0); break;
    case 'viewfinder': if (win) { if (Math.abs(g.x - 0.5) > 0.32 && every(0.5)) P(0); } else if (g.inShot()) P(0); break;
    case 'shell': if (g.phase === 'pick') P(g.pos.indexOf(win ? 0 : 2)); break;
    case 'whack': for (let i = 0; i < 3; i++) { const s = g.slots[i]; if (s && (win ? !s.bad : s.bad)) P(i); } break;
    case 'kick': if (g.cool <= 0) { if (win ? Math.abs(g.a) < g.zone * 0.6 : Math.abs(g.a) > 0.85) P(0); } break;
  }
};`;

// play one film right through: what happened
async function playFilm(p, film, how) {
  return p.evaluate(async ([film, how]) => {
    const D = RS.director, N = D.date, R = RS.renderer, [kind, variant] = film.split(':');
    D.timeLeft = 999; N.catches = 0; N.cool = 0; N.probation = 0;
    const catches0 = N.catches, n0 = R.info.programs.length;
    const ok = N.trigger(kind, variant);
    const started = N.state === 'scene' && N.debug().film === kind;
    const games = new Set(), shots = new Set(), results = []; let t = 0, frames = 0, lastG = null;
    while (N.state === 'scene' && t < 120) {
      window.__dnBot(N, how);
      RS.sim(1 / 20, 1 / 20); t += 1 / 20;
      const d = N.debug(); if (d.game) games.add(d.game); if (d.shot) shots.add(d.shot);
      if (N.game) lastG = N.game; if (lastG && lastG.result && !results.includes(lastG.result)) results.push(lastG.result);
      if (++frames % 20 === 0) { const cam = N.cineCam(); R.render(RS.scene, cam || RS.player.camera); }      // (the film's shots really drawn: nothing new to build)
    }
    for (let i = 0; i < 30; i++) { RS.sim(1 / 20, 1 / 20); N.cineCam(); }      // (and back to your own eyes)
    const after = { cam: N.cam ? N.cam.name : null, cine: document.body.classList.contains('dn-cine'), lock: !!RS.player.menuLock, ui: document.getElementById('dn').classList.contains('on'), state: N.state, chloeHidden: !!(N.chloe && N.chloe.dnHidden), visitor: !!N.visitor, standIn: !!(N.ron && N.ron.rag.group && N.ron.rag.group.visible) };
    return { ok, started, games: [...games], shots: [...shots], results, catches: N.catches - catches0, t, after, built: R.info.programs.length - n0, running: D.running };
  }, [film, how]);
}

export default async function () {
  const C = checker('datenight'), b = await launch();
  try {
    // ---- every film, won and lost, on a phone held upright
    if (SIZES.includes('portrait')) {
      const p = await newPage(b, { width: 390, height: 844, mobile: true });
      await startGame(p, { place: 'restaurant', mode: 'date' });
      await p.waitForFunction(() => RS.cast.every(c => !c.rag || c.rag.ready) && RS.director.date && (!RS.director.date.ron || RS.director.date.ron.rag.ready), null, { timeout: 120000 }).catch(() => {});
      await p.waitForFunction(() => window.__shaderWarm, null, { timeout: 240000 }).catch(() => {});
      await p.evaluate(BOT);
      const st = await p.evaluate(() => { RS.renderer.setAnimationLoop(null); RS.sim(1, 1 / 30); const N = RS.director.date; return { has: !!N, chloe: !!(N && N.chloe), ron: !!(N && N.ron), mode: RS.director.mode }; });
      C.ok(st.has && st.chloe, `date night didn't start properly: ${JSON.stringify(st)}`);
      // (every film to win; to lose, one of each kind of game: the same game in another film loses the same way)
      const loseToo = new Set(); for (const f of FILMS) { const k = f.startsWith('look:') ? 'look' : f.startsWith('toilet:') ? 'toilet' : f; if (!loseToo.has(k)) { loseToo.add(k); loseToo.add('#' + f); } }
      for (const film of FILMS) for (const how of loseToo.has('#' + film) ? ['win', 'lose'] : ['win']) {
        const r = await playFilm(p, film, how);
        const tag = `${film} (${how})`;
        console.log(`  ${tag}: ${r.t.toFixed(1)}s, games ${r.games.join(',') || '-'}, shots ${r.shots.join(',')}, results ${r.results.map(x => x.win ? 'WIN' : x.soft ? 'soft' : 'lost:' + x.reason).join(',')}, busted ${r.catches}, built ${r.built}`);
        C.ok(r.ok && r.started, `${tag}: the film didn't start (${JSON.stringify(r)})`);
        C.ok(r.games.length >= 1, `${tag}: no game in the film`);
        C.ok(r.shots.length >= 3, `${tag}: only ${r.shots.length} camera shots (${r.shots})`);
        C.ok(r.t < 119, `${tag}: the film never finished`);
        if (how === 'win') { C.ok(r.results.some(x => x.win), `${tag}: the bot couldn't win it (${JSON.stringify(r.results)})`); C.ok(r.catches === 0, `${tag}: won, but busted ${r.catches} times`); }
        else { C.ok(r.results.some(x => !x.win && !x.soft), `${tag}: the bot couldn't lose it (${JSON.stringify(r.results)})`); C.ok(r.catches === 1, `${tag}: lost, but busted ${r.catches} times`); C.ok(r.shots.includes('dutch'), `${tag}: no BUSTED shot`); }
        C.ok(!r.after.cam && !r.after.cine && !r.after.lock && !r.after.ui, `${tag}: the camera / screen didn't come back afterwards: ${JSON.stringify(r.after)}`);
        C.ok(!r.after.chloeHidden && !r.after.visitor, `${tag}: someone wasn't put back afterwards: ${JSON.stringify(r.after)}`);
        C.ok(!r.after.standIn, `${tag}: Ronnie's stand-in body still showing in first person`);
        C.ok(r.built === 0, `${tag}: ${r.built} shaders built during the film (a stutter)`);
        C.ok(r.running && r.after.state === 'play', `${tag}: the game didn't carry on afterwards (${r.after.state})`);
      }
      // caught in normal play (eating while she watches), three times: the date's over and the receipt comes up
      const end = await p.evaluate(() => { const D = RS.director, N = D.date; N.catches = 0; let busts = 0;
        for (let k = 0; k < 3; k++) { N.cool = 0; N.look = true; N.grace = 0; N.state = 'play'; N.onEat(); if (N.state === 'scene' && N.scene.id === 'busted') busts++; let t = 0; while (N.state === 'scene' && t < 40) { RS.sim(1 / 20, 1 / 20); t += 1 / 20; } }
        RS.sim(1, 1 / 20);
        return { busts, running: D.running, catches: N.catches, receipt: !!(D.lastLines || []).find(l => /BUSTED/.test(l[0])), cine: document.body.classList.contains('dn-cine'), hud: JSON.stringify(RS.hudExtras()) }; });
      C.ok(end.busts === 3, `eating while she watched didn't bust you each time (${end.busts}/3)`);
      C.ok(!end.running && end.catches === 3, `three busts didn't end the date (${JSON.stringify(end)})`);
      C.ok(end.receipt, 'the receipt has no TIMES BUSTED line');
      C.ok(!end.cine, 'the film look stayed on after the game ended');
      // a new game straight after: everything starts again, nothing left over
      const again = await p.evaluate(() => { RS.newGame('date'); RS.sim(2, 1 / 30); const N = RS.director.date; return { n: document.querySelectorAll('#dn').length, catches: N.catches, state: N.state, chloe: !!N.chloe }; });
      C.ok(again.n === 1 && again.catches === 0 && again.state === 'play' && again.chloe, `a new date after the last one: ${JSON.stringify(again)}`);
      await p.evaluate(() => { RS.newGame('roam'); RS.sim(1, 1 / 30); });
      const gone = await p.evaluate(() => ({ date: !!RS.director.date, dn: document.querySelectorAll('#dn').length }));
      C.ok(!gone.date && gone.dn === 0, `free roam after date night left it behind: ${JSON.stringify(gone)}`);
      C.ok(!p.errors.length, 'page errors: ' + [...new Set(p.errors)].slice(0, 4).join(' | '));
      await p.context().close();
    }
    // ---- on a phone, upright and on its side: each kind of film mid-game, and a line being said
    // ---- a Quest headset: your own eyes, the small panel, the trigger plays
    if (SIZES.includes('quest')) {
      const p = await newPage(b, { width: 700, height: 500, xr: true });
      await p.goto('http://game.local/index.html?go=1&place=restaurant&mode=date');
      await p.waitForFunction(() => window.RS && document.body.classList.contains('ready'), null, { timeout: 180000 });
      await p.waitForFunction(() => !document.querySelector('#loadscreen.on'), null, { timeout: 120000 }).catch(() => {});
      await p.evaluate(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); RS.renderer.xr.setFramebufferScaleFactor(0.2); });
      await p.click('#enter-vr').catch(() => {});
      const inVR = await p.waitForFunction(() => RS.renderer.xr.isPresenting, null, { timeout: 40000 }).then(() => true).catch(() => false);
      C.ok(inVR, 'Quest: never got into VR');
      if (inVR) {
        await p.waitForTimeout(2000);
        const r = await p.evaluate(async () => { const D = RS.director, N = D.date; if (!N) return { noDate: D.mode };
          D.timeLeft = 999; N.trigger('look', 'phone'); const out = { vr: N.vr, cam: !!N.cineCam(), bars: document.getElementById('dn').classList.contains('bars') };
          let t = 0; while (!N.game && t < 60000) { await new Promise(r => setTimeout(r, 200)); t += 200; }
          out.game = N.game && N.game.id; out.panel = N.ui.vmesh.visible; const n0 = N.game ? N.game.n : 0;
          xrd.controllers.right.updateButtonValue('trigger', 1); await new Promise(r => setTimeout(r, 300)); xrd.controllers.right.updateButtonValue('trigger', 0); await new Promise(r => setTimeout(r, 300));
          out.crammed = N.game ? N.game.n - n0 : -1; return out; });
        C.ok(r.vr && !r.cam && !r.bars, `Quest: a film camera or bars in the headset: ${JSON.stringify(r)}`);
        C.ok(r.game === 'cram' && r.panel, `Quest: no game panel in the middle of the view: ${JSON.stringify(r)}`);
        C.ok(r.crammed === 1, `Quest: the trigger didn't cram anything in: ${JSON.stringify(r)}`);
      }
      C.ok(!p.errors.length, 'Quest: page errors: ' + [...new Set(p.errors)].slice(0, 4).join(' | '));
      await p.context().close();
    }
    // ---- the screen checks: phone upright first, then a computer, then a phone on its side
    for (const tag of ['portrait', 'desk', 'landscape'].filter(t => SIZES.includes(t))) {
      const [w, h, mobile] = SIZE[tag];
      const p = await newPage(b, { width: w, height: h, mobile });
      await startGame(p, { place: 'restaurant', mode: 'date' });
      await p.waitForFunction(() => RS.cast.every(c => !c.rag || c.rag.ready), null, { timeout: 120000 }).catch(() => {});
      await p.evaluate(CHECK); await p.evaluate(BOT);
      await p.evaluate(() => { RS.renderer.setAnimationLoop(null); RS.sim(1, 1 / 30); });
      for (const film of ['look:phone', 'waiter:order', 'waiter:trolley', 'waiter:napkin', 'toilet:loo', 'visit:harry', 'visit:oliver', 'visit:pints', 'visit:dylan', 'visit:ethan']) {
        for (const moment of ['line', 'game']) {
          const r = await p.evaluate(([film, moment]) => { const D = RS.director, N = D.date, [kind, variant] = film.split(':'); D.timeLeft = 999; N.catches = 0;
            N.trigger(kind, variant); let t = 0; RS.sim(0.5, 1 / 20);
            if (moment === 'game') { while (N.state === 'scene' && !N.game && t < 30) { RS.sim(0.1, 1 / 20); t += 0.1; } RS.sim(0.6, 1 / 20); }
            const cam = N.cineCam(); RS.renderer.render(RS.scene, cam || RS.player.camera);
            const btns = [...document.querySelectorAll('#dn .dn-btn')].map(e => { const q = e.getBoundingClientRect(); return [q.left, q.top, q.width, q.height]; });
            const stage = document.querySelector('#dn .dn-stage').getBoundingClientRect();
            return { game: N.game && N.game.id, cam: !!cam, btns, stage: [stage.left, stage.top, stage.width, stage.height], cap: (document.querySelector('#dn .dn-cap') || {}).textContent || '', W: innerWidth, H: innerHeight }; }, [film, moment]);
          await p.evaluate(() => new Promise(r => requestAnimationFrame(() => r())));
          if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: `${SHOTS}/dn-${tag}-${film.replace(':', '-')}-${moment}.png` }); }
          const probs = (await p.evaluate(() => window.__textCheck())).filter(o => o.kind === 'text on text' || o.kind === 'off the side of the screen' || o.kind === 'cut off by its box');
          C.ok(!probs.length, `${tag} ${film} (${moment}): ${probs.slice(0, 3).map(o => `${o.kind}: "${o.text}"${o.by ? ' / "' + o.by + '"' : ''} (${o.where})`).join('; ')}`);
          C.ok(r.cam, `${tag} ${film} (${moment}): no film camera on a phone`);
          if (moment === 'game') {
            C.ok(!!r.game, `${tag} ${film}: never got to its game`);
            C.ok(r.btns.length >= 1, `${tag} ${film}: no buttons`);
            for (const [x, y, bw, bh] of r.btns) C.ok(x >= 0 && y >= 0 && x + bw <= r.W + 1 && y + bh <= r.H + 1 && bw >= 60 && bh >= 56, `${tag} ${film}: a button is off the screen or too small to tap (${[x, y, bw, bh].map(Math.round)})`);
            C.ok(r.stage[2] > 100 && r.stage[3] > 40, `${tag} ${film}: the game's picture is too small (${r.stage.map(Math.round)})`);
          } else C.ok(r.cap.length > 3, `${tag} ${film}: no caption while a line is said`);
          // finish the film off (won) before the next one
          await p.evaluate(() => { const N = RS.director.date; let t = 0; while (N.state === 'scene' && t < 120) { window.__dnBot(N, 'win'); RS.sim(1 / 20, 1 / 20); t += 1 / 20; } RS.sim(1.2, 1 / 20); N.cineCam(); });
        }
      }
      // a tap / click on a game's button really plays it (the finger, not the code)
      const tapped = await p.evaluate(() => { const N = RS.director.date; RS.director.timeLeft = 999; N.trigger('look', 'phone'); let t = 0; while (!N.game && t < 30) { RS.sim(0.1, 1 / 20); t += 0.1; } RS.sim(0.3, 1 / 20); N.drawUI(0.016); const b = document.querySelector('#dn .dn-btn'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, n0: N.game ? N.game.n : -1 }; });
      if (mobile) await p.touchscreen.tap(tapped.x, tapped.y); else await p.mouse.click(tapped.x, tapped.y);
      const n1 = await p.evaluate(() => RS.director.date.game ? RS.director.date.game.n : -1);
      C.ok(n1 === tapped.n0 + 1, `${tag}: tapping the first button didn't cram anything in (${tapped.n0} -> ${n1})`);
      C.ok(!p.errors.length, `${tag}: page errors: ` + [...new Set(p.errors)].slice(0, 4).join(' | '));
      await p.context().close();
    }
  } finally { await b.close(); }
  return C.fails;
}
