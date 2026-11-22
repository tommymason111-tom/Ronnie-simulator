// DATE NIGHT (datenight.js, dngames.js), on a phone held upright first (most players), then a Quest headset, then a
// computer and a phone on its side. Upright phone: every film plays, its game can be won and lost through all its rounds
// (a little bot on a fake clock; losing is BUSTED: Chloe's reaction, your excuse, a penalty), the camera comes back to
// your own eyes, nothing builds a shader mid-film, no page errors. No skipping: a tap or Enter during a line doesn't move
// it on. No walking: the joystick's gone, and pushing it (or W) moves nobody; the loo raid puts you at the spot and back
// in your seat. Each kind of film is looked at mid-game and mid-line: big buttons on the screen, no text on other text, a
// real finger tap plays. Quest: no film camera (your own eyes), the small panel in the middle, the trigger plays.
// Computer and phone on its side: the same screen checks. (SIZES=portrait,quest,desk,landscape picks)
// FILMS=look:phone,visit:harry runs just those; SHOTS=dir saves a picture of each one on the phone.
import fs from 'fs';
import { launch, newPage, startGame, checker } from './lib/game.mjs';

const ALL = ['look:phone', 'look:waiter', 'look:board', 'look:propose', 'look:lobster', 'waiter:order', 'waiter:trolley', 'waiter:napkin', 'toilet:loo', 'toilet:lipstick', 'toilet:queue',
  'look:foodpic', 'look:ex', 'look:mum', 'waiter:wine', 'waiter:chef',
  'visit:harry', 'visit:oliver', 'visit:pints', 'visit:dylan', 'visit:ethan', 'visit:lewis', 'visit:aidanw', 'visit:noah', 'visit:alfie', 'visit:ian',
  'event:birthday', 'event:fire', 'event:power', 'event:noproposal', 'open:arrive'];
const FILMS = process.env.FILMS ? process.env.FILMS.split(',') : ALL;
const SIZES = (process.env.SIZES || 'portrait,quest,desk,landscape').split(',');
const SIZE = { portrait: [390, 844, true], desk: [900, 560, false], landscape: [844, 390, true] };
const CHECK = fs.readFileSync(new URL('./lib/textcheck.js', import.meta.url), 'utf8'), SHOTS = process.env.SHOTS || '';
// (runs in the page) a bot for each game: 'win' plays it properly, 'lose' gets caught
const BOT = `window.__dnBot = function (D, how) {
  const g = D.game; if (!g || g.result) return;
  const win = how === 'win', P = (i) => { if (g.buttons[i] && !g.buttons[i].off) D.press(i); };
  g.botT = g.botT || 0; const every = (s) => { if (g.t - g.botT >= s) { g.botT = g.t; return true; } return false; };
  switch (g.id) {
    case 'cram': if (win) { if (g.phase === 'turn' && !g.natural) P(1); else if (g.phase === 'away' && g.cheeks < 0.4 && g.awayT > 0.8 && every(0.35)) P(0); }
      else if (g.phase === 'turn' || g.phase === 'look') P(g.buttons.findIndex(b => !b.off)); break;
    case 'signals': if (win) { if (g.st === 'menu' && g.stT > 0.3 && every(0.25)) P(g.code[g.idx]); } else if (g.st === 'up') P(0); break;
    case 'trolley': if (win) { const z = g.inZone(); if (z && !z.e && g.st === 'busy' && g.stT > 0.4) P(1); } else if (g.st === 'glance') P(0); break;
    case 'napkin': if (win) { const ok = g.st === 'busy' && g.stT > 0.25; if (ok && !g.holding) D.press(0); else if (!ok && g.holding) D.release(0); } else if (!g.holding) D.press(0); break;
    case 'raid': if (win) { if (g.st === 'seat' && !g.didGo && g.t > 0.6) { g.didGo = true; P(0); } else if (g.st === 'at') { if (g.n < 2) { if (!g.where.gLook && g.where.gT > 0.25 && every(0.3)) P(0); } else P(1); } }
      else if (g.st === 'seat' && !g.didGo && g.t > 0.6) { g.didGo = true; P(0); } break;
    case 'react': if (win) { if (g.st === 'react') P(g.want === 'lol' ? 1 : 2); else if (g.st === 'setup' && g.stT > 0.8 && every(0.6)) P(0); } else if (g.st === 'react') P(0); break;
    case 'viewfinder': if (win) { if (!g.inShot() && Math.abs(g.x - 0.5) - g.half > 0.16 && g.reframe <= 0 && g.target == null && every(0.5)) P(0); } else if (g.inShot()) P(0); break;
    case 'shell': if (g.phase === 'pick') P(g.pos.indexOf(win ? 0 : 2)); break;
    case 'whack': if (win) { if (!g.spot) for (let i = 0; i < 3; i++) { const s = g.slots[i]; if (s && !s.bad) P(i); } } else if (g.spot) P(0); break;
    case 'kick': if (g.cool <= 0) { if (win ? Math.abs(g.a) < g.zone * 0.5 && !g.blocked() : Math.abs(g.a) > 0.85) P(0); } break;
    case 'wrestle': if (win) { if (g.bar < 0.25) { if (every(0.1)) P(0); } else if (g.st === 'hands' && g.stT > 0.8 && g.sneakT <= 0 && g.bar > 0.1 && every(0.6)) P(1); } else if (g.st === 'face') P(1); break;
    case 'birthday': { const nb = g.near(); if (win) { if (nb && Math.abs(nb.t - g.t) < 0.05) { if (nb.k === 'e') P(0); else if (nb.k === 's') P(1); } }
      else { const cur = g.beats.find(x => Math.abs(x.t - g.t) < g.beat / 2); if (cur && cur.k === 'c') P(0); } break; }
    case 'excuse': case 'choice': if (g.t > 0.8) P(0); break;
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
    const games = new Set(), shots = new Set(), results = [], rounds = {}; let t = 0, frames = 0, lastG = null, atSpot = null;
    const seat = () => { const h = RS.player.head; return Math.hypot(h.x - 0, h.z - 1.65); };
    while (N.state === 'scene' && t < 160) {
      window.__dnBot(N, how);
      RS.sim(1 / 20, 1 / 20); t += 1 / 20;
      const d = N.debug(); if (d.game) { games.add(d.game); rounds[d.game] = Math.max(rounds[d.game] || 0, N.game.round || 1); } if (d.shot) shots.add(d.shot);
      if (N.game && N.game.id === 'raid' && N.game.st === 'at' && N.game.where && !atSpot) { const h = RS.player.head, a = N.game.where.at; atSpot = Math.hypot(h.x - a[0], h.z - a[1]); }
      if (N.game) lastG = N.game; if (lastG && lastG.result && !results.includes(lastG.result)) results.push(lastG.result);
      if (++frames % 20 === 0) { const cam = N.cineCam(); R.render(RS.scene, cam || RS.player.camera); }      // (the film's shots really drawn: nothing new to build)
    }
    for (let i = 0; i < 30; i++) { RS.sim(1 / 20, 1 / 20); N.cineCam(); }      // (and back to your own eyes)
    const seated = seat();
    const after = { cam: N.cam ? N.cam.name : null, cine: document.body.classList.contains('dn-cine'), lock: !!RS.player.menuLock, ui: document.getElementById('dn').classList.contains('on'), state: N.state, chloeHidden: !!(N.chloe && N.chloe.dnHidden), visitor: !!N.visitor, standIn: !!(N.ron && N.ron.rag.group && N.ron.rag.group.visible) };
    return { ok, started, games: [...games], shots: [...shots], results, rounds, catches: N.catches - catches0, t, after, built: R.info.programs.length - n0, running: D.running, atSpot, seated };
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
      // (the opener's a choice: nothing to lose)
      const loseToo = new Set(); for (const f of FILMS) { if (f.startsWith('open')) continue; const k = f.startsWith('look:') ? 'look' : f.startsWith('toilet:') ? 'toilet' : f; if (!loseToo.has(k)) { loseToo.add(k); loseToo.add('#' + f); } }
      // NO WALKING: no joystick on the phone, and pushing it (or holding W) moves nobody; NO SKIPPING: a tap on the film,
      // or Enter, doesn't move a line on
      const still = await p.evaluate(() => { const P = RS.player, h0 = P.head.clone(); for (let i = 0; i < 40; i++) { P.flatMove = { x: 0.6, z: -1 }; RS.sim(1 / 20, 1 / 20); }
        return { moved: Math.hypot(P.head.x - h0.x, P.head.z - h0.z), stick: getComputedStyle(document.getElementById('stick')).display, sprint: getComputedStyle(document.getElementById('btn-sprint')).display, throwBtn: getComputedStyle(document.getElementById('btn-throw')).display, seat: Math.hypot(P.head.x, P.head.z - 1.65) }; });
      const look = await p.evaluate(() => { const P = RS.player, h0 = P.head.clone(), f0 = P.fwd.clone(); P.flatYaw += 1.0; P.flatPitch = -0.1; for (let i = 0; i < 10; i++) RS.sim(1 / 20, 1 / 20); return { turned: f0.angleTo(P.fwd), moved: Math.hypot(P.head.x - h0.x, P.head.z - h0.z) }; });
      C.ok(look.turned > 0.5 && look.moved < 0.01, `looking round doesn't work while sat (turned ${look.turned.toFixed(2)} rad, moved ${look.moved.toFixed(2)}m)`);
      await p.evaluate(() => { RS.player.flatYaw = 0; RS.player.flatPitch = -0.22; RS.sim(0.2, 1 / 20); });
      C.ok(still.moved < 0.01, `the player walked ${still.moved.toFixed(2)}m on a date (pushing the joystick)`);
      C.ok(still.stick === 'none' && still.sprint === 'none' && still.throwBtn === 'none', `the joystick / SPRINT / THROW still show: ${JSON.stringify(still)}`);
      C.ok(still.seat < 0.3, `not sat at the table (${still.seat.toFixed(2)}m from the seat)`);
      // sat down: your eyes level with Chloe's (not looking down on her from standing height)
      const eye = await p.evaluate(() => { const N = RS.director.date, c = N.chloe; let t = 0; while (N.state === 'scene' && t < 160) { window.__dnBot(N, 'win'); RS.sim(1 / 20, 1 / 20); t += 1 / 20; } RS.sim(1, 1 / 20); return { me: RS.player.camera.getWorldPosition(new RS.THREE.Vector3()).y, her: c.headPos(new RS.THREE.Vector3()).y }; });
      C.ok(Math.abs(eye.me - eye.her) < 0.2, `not at eye level with Chloe: your eyes ${eye.me.toFixed(2)}m, hers ${eye.her.toFixed(2)}m`);
      // GET READY: a game doesn't start the moment it's on screen (the first taps do nothing; then it plays)
      const ready = await p.evaluate(() => { const D = RS.director, N = D.date; D.timeLeft = 999; N.trigger('look', 'phone'); let t = 0; while (!N.game && t < 40) { RS.sim(0.1, 1 / 20); t += 0.1; }
        const g = N.game, n0 = g.n; N.press(0); RS.sim(0.2, 1 / 20); const early = g.n - n0, card = document.querySelector('#dn .dn-ready').classList.contains('on'), text = document.querySelector('#dn .dn-ready').textContent;
        RS.sim(3, 1 / 20); N.press(0); RS.sim(0.1, 1 / 20); return { early, card, text, later: g.n - n0, readyT: N.readyT }; });
      C.ok(ready.early === 0 && ready.card && /GET READY/.test(ready.text), `no GET READY beat before a game: ${JSON.stringify(ready)}`);
      C.ok(ready.later >= 1, `the game didn't start after GET READY: ${JSON.stringify(ready)}`);
      await p.evaluate(() => { const N = RS.director.date; let t = 0; while (N.state === 'scene' && t < 160) { window.__dnBot(N, 'win'); RS.sim(1 / 20, 1 / 20); t += 1 / 20; } RS.sim(1.5, 1 / 20); });
      await p.keyboard.down('KeyW'); await p.evaluate(() => { for (let i = 0; i < 30; i++) RS.sim(1 / 20, 1 / 20); }); await p.keyboard.up('KeyW');
      const keyed = await p.evaluate(() => Math.hypot(RS.player.head.x, RS.player.head.z - 1.65));
      C.ok(keyed < 0.3, `W walked the player off (${keyed.toFixed(2)}m from the seat)`);
      const lines = await p.evaluate(() => { const N = RS.director.date; RS.director.timeLeft = 999; N.trigger('look', 'phone'); let t = 0; while (N.inBeat && !(N.cap && N.cap.text) && t < 10) { RS.sim(0.1, 1 / 20); t += 0.1; } RS.sim(0.3, 1 / 20);
        const r = document.querySelector('#dn .dn-cap').getBoundingClientRect(); return { cap: N.cap && N.cap.text, wait: N.scene.wait, x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      await p.touchscreen.tap(lines.x, lines.y); await p.touchscreen.tap(195, 300); await p.keyboard.press('Enter'); await p.keyboard.press('Space');
      const after = await p.evaluate(() => { const N = RS.director.date; RS.sim(0.1, 1 / 20); return { cap: N.cap && N.cap.text, wait: N.scene && N.scene.wait }; });
      C.ok(after.cap === lines.cap && after.wait > lines.wait - 0.5 && after.wait > 0.3, `a tap / Enter skipped the line: ${JSON.stringify({ lines, after })}`);
      C.ok(lines.wait >= 2.0, `a line was only up for ${lines.wait.toFixed(1)}s (too quick to read)`);
      await p.evaluate(() => { const N = RS.director.date; let t = 0; while (N.state === 'scene' && t < 160) { window.__dnBot(N, 'win'); RS.sim(1 / 20, 1 / 20); t += 1 / 20; } RS.sim(1.5, 1 / 20); });
      for (const film of FILMS) for (const how of loseToo.has('#' + film) ? ['win', 'lose'] : ['win']) {
        const r = await playFilm(p, film, how);
        const tag = `${film} (${how})`;
        console.log(`  ${tag}: ${r.t.toFixed(1)}s, games ${r.games.map(gm => gm + (r.rounds[gm] > 1 ? '×' + r.rounds[gm] : '')).join(',') || '-'}, shots ${r.shots.join(',')}, results ${r.results.map(x => x.win ? 'WIN ' + (x.score || 0) : x.soft ? 'soft' : 'lost:' + x.reason).join(',')}, busted ${r.catches}, built ${r.built}`);
        const main = r.games.find(gm => gm !== 'excuse');
        if (how === 'win' && main && !['raid', 'excuse', 'choice'].includes(main)) C.ok((r.rounds[main] || 1) >= 2, `${tag}: the game only had ${r.rounds[main] || 1} round (should have stages)`);
        if ((film.startsWith('toilet') || film === 'event:fire') && how === 'win') { C.ok(r.atSpot != null && r.atSpot < 0.5, `${tag}: the raid didn't put you at the spot (${r.atSpot})`); }
        C.ok(r.seated < 0.3, `${tag}: not back in your seat afterwards (${r.seated.toFixed(2)}m away)`);
        if (how === 'lose') C.ok(r.games.includes('excuse'), `${tag}: no excuse to pick when busted`);
        C.ok(r.ok && r.started, `${tag}: the film didn't start (${JSON.stringify(r)})`);
        C.ok(r.games.length >= 1, `${tag}: no game in the film`);
        C.ok(r.shots.length >= 3, `${tag}: only ${r.shots.length} camera shots (${r.shots})`);
        C.ok(r.t < 159, `${tag}: the film never finished`);
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
      const again = await p.evaluate(() => { RS.newGame('date'); RS.sim(2, 1 / 30); const N = RS.director.date; return { n: document.querySelectorAll('#dn').length, catches: N.catches, state: N.state, film: N.scene && N.scene.id, chloe: !!N.chloe }; });
      C.ok(again.n === 1 && again.catches === 0 && again.state === 'scene' && again.film === 'open' && again.chloe, `a new date after the last one: ${JSON.stringify(again)}`);
      // a whole night: it opens with arriving at the table by itself, and ends with the bill (then the receipt)
      const night = await p.evaluate(() => { const D = RS.director, N = D.date; let t = 0, opened = false;
        while (t < 1) { RS.sim(0.1, 1 / 20); t += 0.1; if (N.scene && N.scene.id === 'open') { opened = true; break; } }      // (straight away: the story starts when you press play)
        t = 0; while (N.state === 'scene' && t < 160) { window.__dnBot(N, 'win'); RS.sim(1 / 20, 1 / 20); t += 1 / 20; }
        RS.sim(1, 1 / 20); N.nextT = 99; D.timeLeft = 15.5; RS.sim(0.2, 1 / 20); const billed = !!(N.scene && N.scene.id === 'bill');
        t = 0; while (N.state === 'scene' && t < 160) { window.__dnBot(N, 'win'); RS.sim(1 / 20, 1 / 20); t += 1 / 20; }
        return { opened, billed, running: D.running, receipt: (D.lastLines || []).length }; });
      C.ok(night.opened, 'the night didn\'t open with arriving at the table');
      C.ok(night.billed && !night.running && night.receipt > 2, `the night didn't end with the bill and the receipt: ${JSON.stringify(night)}`);
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
      for (const film of ['look:phone', 'waiter:order', 'waiter:trolley', 'waiter:napkin', 'toilet:loo', 'visit:harry', 'visit:oliver', 'visit:pints', 'visit:dylan', 'visit:ethan', 'visit:lewis', 'event:birthday', 'busted:hamster', 'look:foodpic', 'waiter:wine', 'waiter:chef', 'visit:aidanw', 'visit:noah', 'visit:alfie', 'visit:ian', 'event:fire', 'event:power', 'event:noproposal', 'open:arrive']) {
        for (const moment of ['line', 'game']) {
          const r = await p.evaluate(([film, moment]) => { const D = RS.director, N = D.date, [kind, variant] = film.split(':'); D.timeLeft = 999; N.catches = 0;
            N.trigger(kind, variant); let t = 0; RS.sim(0.5, 1 / 20); while (moment === 'line' && N.state === 'scene' && !(N.cap && N.cap.text && N.cam) && t < 20) { RS.sim(0.1, 1 / 20); t += 0.1; }
            if (moment === 'game') { while (N.state === 'scene' && !N.game && t < 70) { RS.sim(0.1, 1 / 20); t += 0.1; } RS.sim(0.6, 1 / 20); }
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
          await p.evaluate(() => { const N = RS.director.date; let t = 0; while (N.state === 'scene' && t < 160) { window.__dnBot(N, 'win'); RS.sim(1 / 20, 1 / 20); t += 1 / 20; } RS.sim(1.2, 1 / 20); N.cineCam(); });
        }
      }
      // a tap / click on a game's button really plays it (the finger, not the code)
      const tapped = await p.evaluate(() => { const N = RS.director.date; RS.director.timeLeft = 999; N.trigger('look', 'phone'); let t = 0; while (!N.game && t < 40) { RS.sim(0.1, 1 / 20); t += 0.1; } RS.sim(2.8, 1 / 20); /* (just after GET READY) */ N.drawUI(0.016); const b = document.querySelector('#dn .dn-btn'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, n0: N.game ? N.game.n : -1 }; });
      if (mobile) await p.touchscreen.tap(tapped.x, tapped.y); else await p.mouse.click(tapped.x, tapped.y);
      const n1 = await p.evaluate(() => RS.director.date.game ? RS.director.date.game.n : -1);
      C.ok(n1 === tapped.n0 + 1, `${tag}: tapping the first button didn't cram anything in (${tapped.n0} -> ${n1})`);
      C.ok(!p.errors.length, `${tag}: page errors: ` + [...new Set(p.errors)].slice(0, 4).join(' | '));
      await p.context().close();
    }
  } finally { await b.close(); }
  return C.fails;
}
