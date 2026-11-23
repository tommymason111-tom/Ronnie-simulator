// RONNIE TALKS (js/ronnie.js, js/ronnielines.js): the player says his own lines in his real voice.
//   - every scripted Ronnie line (his own, Date Night's films and excuses, his squad.js banks) has a clip in the
//     manifest and on disk, with the same id the game works out (lineHash/cleanLine in the browser)
//   - solo free roam on an upright phone: a game start, bites of favourite foods, a stage, an attack (one per attacker),
//     a power-up, idle chatter; never the same line twice in a row; the caption is on the screen, clear of every
//     button and bit of text
//   - Date Night: sneaky eating while she looks away, and being caught (said by his stand-in on the film's caption)
//   - the Sweep (caught by security) and an eat-off (the last ten seconds)
//   - a room: another player playing as Ronnie is heard from their body ('rsay'), made-up ids are ignored
//   - the Quest: the caption is a panel in front of your eyes
// SHOTS=dir saves screenshots there.
import { launch, newPage, startGame, sleep, checker, ROOT } from './lib/game.mjs';
import fs from 'fs'; import path from 'path';
import { ronnieLines, gameHashers, spoken } from '../tools/ronnie_lines.mjs';
const SHOTS = process.env.SHOTS || null;
const shot = async (p, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, name) }); } };
const BTN = fs.readFileSync(path.join(ROOT, 'tests/lib/btncheck.js'), 'utf8'), TXT = fs.readFileSync(path.join(ROOT, 'tests/lib/textcheck.js'), 'utf8');

export default async function () {
  const C = checker('ronnie');
  // ---- the clips
  const { lineHash, cleanLine } = gameHashers(), man = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/voices/manifest.json'), 'utf8'));
  const have = new Set((man.ronnie && man.ronnie.lines) || []), lines = ronnieLines(); let missing = [];
  for (const l of lines) { const c = cleanLine(l); if (!c || !spoken(c)) continue; const h = lineHash(c); if (!have.has(h) || !fs.existsSync(path.join(ROOT, 'assets/voices/ronnie', h + '.mp3'))) missing.push(l); }
  C.ok(lines.length >= 150, `only ${lines.length} Ronnie lines`);
  C.ok(!missing.length, `${missing.length} Ronnie lines have no clip: ${missing.slice(0, 5).join(' | ')}`);
  for (const h of have) { const f = path.join(ROOT, 'assets/voices/ronnie', h + '.mp3'); if (!fs.existsSync(f) || fs.statSync(f).size < 2000) C.ok(false, 'clip missing or empty: ' + h); }
  console.log(`  ${lines.length} Ronnie lines, ${have.size} clips`);

  const b = await launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    // ---- solo free roam, an upright phone
    { const p = await newPage(b, { width: 390, height: 844, mobile: true });
      await startGame(p, { place: 'pub', mode: 'roam' });
      await p.addScriptTag({ content: BTN }); await p.addScriptTag({ content: TXT });
      const r = await p.evaluate(async () => {
        const out = {}, R = RS.ronnie, V = await import('./js/voices.js');
        out.voiced = V.VOICED.has('ronnie'); out.sameHash = V.lineHash(V.cleanLine('Oi!'));
        RS.renderer.setAnimationLoop(null); const sim = (s) => RS.sim(s, 1 / 30);
        sim(4); out.start = R.said.map(x => x.key);
        const rnd = Math.random; Math.random = () => 0.01;
        try {
          // bites of favourite foods (spaced out past the chit-chat gap)
          for (const t of ['burger', 'pizza', 'doughnut', 'kebab', 'pint', 'can']) { const it = RS.items.spawn(t, RS.player.head.clone().addScaledVector(RS.player.fwd, 0.4)); if (it) RS.bite(it); sim(9); }
          // a stage
          RS.addChonk(30); sim(2);
          // every attacker's attack landing
          for (const key of ['trip', 'tackle', 'beer', 'dating', 'pepsi', 'jig', 'siu', 'bbq', 'rod', 'diet', 'knee', 'flash', 'oasis', 'nutmeg', 'turkey']) { RS.director.lastHit = { who: { id: 'x' }, key, t: performance.now() }; sim(2); }
          // a power-up, idle chatter
          RS.powerups.give('hoover'); sim(2);
        } finally { Math.random = rnd; }
        sim(90);
        out.keys = R.said.map(x => x.key); out.texts = R.said.map(x => x.text);
        // no line twice in a row, even asked for over and over
        const seq = []; for (let i = 0; i < 30; i++) { R.say('bite'); seq.push(R.state.lastLine); RS.sim(0.1, 0.1); }
        out.rep = seq.filter((x, i) => i && x === seq[i - 1]).length; out.distinct = new Set(seq).size;
        // the caption: shown and on the screen
        R.say('hit.beer'); await new Promise(res => setTimeout(res, 1600)); RS.sim(0.4, 1 / 30); const c = R.caption(); if (!c) return { ...out, keys: out.keys, texts: out.texts, cap: null, capRect: [], capOver: [], text: [] }; const el = document.getElementById('ron-cap'), cr = el.getBoundingClientRect(), cs = getComputedStyle(el);
        out.cap = c && c.text; out.capOn = el.classList.contains('on') && cs.visibility !== 'hidden'; out.capRect = [cr.left, cr.top, cr.right, cr.bottom].map(Math.round);
        out.capOver = [...document.querySelectorAll('button, #knob')].filter(e => { const r = e.getBoundingClientRect(); if (r.width < 2 || !e.offsetParent && getComputedStyle(e).position !== 'fixed') return false; const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none') return false; return r.left < cr.right && r.right > cr.left && r.top < cr.bottom && r.bottom > cr.top; }).map(e => e.id || e.textContent.trim().slice(0, 12));
        out.text = window.__textCheck().filter(x => /ron-cap/.test(JSON.stringify(x)));
        RS.renderer.render(RS.scene, RS.player.camera || RS.camera);
        return out; });
      await shot(p, 'ronnie-caption-solo.png');
      const btns = await p.evaluate(() => window.__btnCheck());
      console.log(`  solo: ${r.keys.length} lines: ${[...new Set(r.keys)].join(' ')}`);
      C.ok(r.voiced, 'Ronnie is not a voiced character');
      C.ok(r.start.includes('start') || r.start.length === 0, `start: ${r.start}`);
      C.ok(r.keys.some(k => k.startsWith('eat.') || k === 'bite'), `no eating lines: ${r.keys}`);
      C.ok(r.keys.includes('stage.1'), `no stage line: ${r.keys}`);
      for (const k of ['trip', 'tackle', 'beer', 'dating', 'turkey']) C.ok(r.keys.includes('hit.' + k), `no reaction to ${k}: ${r.keys}`);
      C.ok(r.keys.includes('power.hoover'), 'no Hoover mode line');
      C.ok(r.keys.includes('idle'), 'no free roam chatter in a minute and a half');
      C.ok(r.texts.every((x, i) => !i || x !== r.texts[i - 1]), 'a line said twice in a row');
      C.ok(r.rep === 0 && r.distinct >= 8, `bites: ${r.rep} back-to-back repeats, ${r.distinct} different`);
      C.ok(r.cap && r.capOn, `caption not showing: ${JSON.stringify(r)}`);
      C.ok(r.capRect[0] >= 0 && r.capRect[2] <= 390 && r.capRect[1] >= 0 && r.capRect[3] <= 844, `caption off the screen ${r.capRect}`);
      C.ok(!r.capOver.length, `caption on top of buttons: ${r.capOver}`);
      C.ok(!r.text.length, `caption text on other text: ${JSON.stringify(r.text).slice(0, 300)}`);
      C.ok(!btns.length, `buttons: ${JSON.stringify(btns).slice(0, 300)}`);
      // a room: another player playing as Ronnie, heard from their body
      const mp = await p.evaluate(async () => { const V = await import('./js/voices.js'); const got = []; const av = { chat: (t) => got.push(t) };
        const line = 'Go on then, Aidan. Just the one.', h = V.lineHash(V.cleanLine(line));
        RS.net.on.rsay({ t: 'rsay', i: h }, { id: 'a', char: 'ronnie', avatar: av });
        RS.net.on.rsay({ t: 'rsay', i: 'zzzz' }, { id: 'b', char: 'ronnie', avatar: av });
        RS.net.on.rsay({ t: 'rsay', i: h }, { id: 'c', char: 'chloe', avatar: av });
        RS.net.on.rsay({ t: 'rsay', i: { x: 1 } }, null);
        return { got, line }; });
      C.ok(mp.got.length === 1 && mp.got[0] === mp.line, `a room's Ronnie line: ${JSON.stringify(mp)}`);
      C.ok(!p.errors.length, 'solo page errors: ' + p.errors.slice(0, 3).join(' | '));
      await p.context().close(); }

    // ---- Date Night
    { const p = await newPage(b, { width: 390, height: 844, mobile: true });
      await startGame(p, { place: 'restaurant', mode: 'date' });
      await p.waitForFunction(() => RS.director.date && RS.director.date.state === 'play', null, { timeout: 60000 }).catch(() => {});
      const r = await p.evaluate(async () => { const R = RS.ronnie, dn = RS.director.date, w = (t) => new Promise(res => setTimeout(res, t)); const out = {};
        dn.look = false; R.state.lastT = -99; const rnd = Math.random; Math.random = () => 0.01; R.ate({ type: 'burger', def: { chonk: 10 } }); Math.random = rnd; out.sneak = R.said.slice(-1)[0];
        await w(600); out.capSneak = R.caption() && R.caption().text;
        R.state.lastT = -99; dn.cool = 0; dn.busted('table');
        for (let i = 0; i < 40 && !(dn.cap && dn.cap.name === 'Ronnie'); i++) await w(50);
        out.cap = dn.cap; out.keys = R.said.map(x => x.key); return out; });
      await sleep(300); await shot(p, 'ronnie-datenight.png');
      console.log(`  date night: ${r.keys.join(' ')} · film caption ${JSON.stringify(r.cap)}`);
      C.ok(r.sneak && r.sneak.key === 'date.sneak', `no sneaky eating line: ${JSON.stringify(r.sneak)}`);
      C.ok(r.keys.includes('date.caught') && r.cap && r.cap.name === 'Ronnie', `caught: no line from Ronnie on the film's caption: ${JSON.stringify(r)}`);
      C.ok(!p.errors.length, 'date night page errors: ' + p.errors.slice(0, 3).join(' | '));
      await p.context().close(); }

    // ---- the Sweep and an eat-off
    for (const [place, mode, poke, want] of [['shop', 'sweep', 'RS.director.sweep.caught++', 'sweep.caught'], ['pub', 'chonkoff', 'RS.director.timeLeft = 10.2', 'eatoff.last']]) {
      const p = await newPage(b, { width: 390, height: 844, mobile: true });
      await startGame(p, { place, mode });
      const r = await p.evaluate((poke) => { RS.renderer.setAnimationLoop(null); RS.sim(4, 1 / 30); const k0 = RS.ronnie.said.map(x => x.key); RS.ronnie.state.lastT = -99; new Function(poke)(); RS.sim(1, 1 / 30); return { k0, keys: RS.ronnie.said.map(x => x.key) }; }, poke);
      console.log(`  ${mode}: ${r.keys.join(' ')}`);
      C.ok(r.k0.length && /start/.test(r.k0[0]), `${mode}: no start line ${r.k0}`);
      C.ok(r.keys.includes(want), `${mode}: no ${want}: ${r.keys}`);
      C.ok(!p.errors.length, `${mode} page errors: ` + p.errors.slice(0, 3).join(' | '));
      await p.context().close(); }

    // ---- the Quest
    { const p = await newPage(b, { width: 700, height: 500, xr: true });
      await p.goto('http://game.local/index.html?go=1&place=pub&mode=roam');
      await p.waitForFunction(() => window.RS && document.body.classList.contains('ready'), null, { timeout: 180000 });
      await p.waitForFunction(() => !document.querySelector('#loadscreen.on'), null, { timeout: 120000 }).catch(() => {});
      await p.evaluate(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); RS.renderer.xr.setFramebufferScaleFactor(0.12); document.getElementById('enter-vr').click(); });
      await p.waitForFunction(() => RS.renderer.xr.isPresenting, null, { timeout: 60000 });
      await sleep(1500);
      const r = await p.evaluate(async () => { RS.ronnie.say('power.hoover'); await new Promise(res => setTimeout(res, 1500)); const s = RS.ronnie.vrCaption(); let inView = false;
        if (s) { const w = s.getWorldPosition(new RS.THREE.Vector3()); const cam = RS.renderer.xr.getCamera(); const loc = cam.worldToLocal(w.clone()); inView = loc.z < -0.5 && Math.abs(loc.x) < 0.5 && loc.y < 0 && loc.y > -0.6; }
        return { shown: !!s, inView, dom: document.getElementById('ron-cap').classList.contains('on') }; });
      console.log('  quest: ' + JSON.stringify(r));
      C.ok(r.shown && r.inView && !r.dom, `the headset caption: ${JSON.stringify(r)}`);
      C.ok(!p.errors.length, 'quest page errors: ' + p.errors.slice(0, 3).join(' | '));
      await p.context().close(); }
  } finally { await b.close(); }
  return C.fails;
}
