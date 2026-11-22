// IAN'S BARBECUE (bbqmode.js): Ian cooks at the grill (smoke, food on it, the countdown), then comes round with a healthy
// burger: asks, insists, chases and catches you; the cut scene (Ian in your face) is fought off by spamming taps, and
// losing it force-feeds you (the eat meter drops, BLEURGH, a short stun). Small, a slap only tickles him; at STAGE 3
// pushing him off knocks him flat, at STAGE 5 walking into him does, and three knock-downs and he gives up for good.
// On an upright phone (first), then the Quest (a small centred panel, the triggers), then a phone on its side; nothing on
// screen covers any other text while he's chasing or in the cut scene.
// SHOTS=dir saves pictures of the chase and the cut scene.
import fs from 'fs';
import { launch, newPage, startGame, sleep, checker } from './lib/game.mjs';
const CHECK = fs.readFileSync(new URL('./lib/textcheck.js', import.meta.url), 'utf8'), SHOTS = process.env.SHOTS || '';

// THE QUEST (IWER): in the headset the cut scene's panel is small and in the middle of your view, the controllers'
// triggers fight him off, and Ian's state is on the wrist box (no red bar at the top in a headset)
async function quest(b, C) {
  const p = await newPage(b, { width: 700, height: 500, xr: true });
  try {
    await p.goto('http://game.local/index.html?go=1&place=garden&mode=bbq');
    await p.waitForFunction(() => window.RS && document.body.classList.contains('ready'), null, { timeout: 180000 });
    await p.waitForFunction(() => !document.querySelector('#loadscreen.on'), null, { timeout: 120000 }).catch(() => {});
    await p.evaluate(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); RS.renderer.xr.setFramebufferScaleFactor(0.12); window.__f = 0; RS.onFrame.push(() => { window.__f++; }); document.getElementById('enter-vr').click(); });
    await p.waitForFunction(() => RS.renderer.xr.isPresenting && RS.director.bbqm, null, { timeout: 60000 });
    await sleep(2500);
    const r = await p.evaluate(async () => { const m = RS.director.bbqm, out = {}, wait = (t) => new Promise(res => setTimeout(res, t)), frames = async (n) => { const f0 = window.__f; for (let i = 0; i < 400 && window.__f < f0 + n; i++) await wait(25); };      // (software-drawn VR frames are slow: wait for real ones)
      RS.renderer.render = () => {}; out.box = JSON.stringify(RS.hudExtras());
      m.setPhase('feed'); m.feedYaw = 0; m.beginFeed('burger'); await frames(3); m.feed.t = 0; m.feed.p = 0.45;
      const pn = m.panel; out.panel = pn ? { s: +pn.scale.x.toFixed(2), x: pn.position.x, y: +pn.position.y.toFixed(2), z: pn.position.z } : null;
      // the controllers: each press of a trigger is a tap
      const c = window.xrd && window.xrd.controllers && window.xrd.controllers.right, t0 = m.feed ? m.feed.taps : 0;
      out.hasCtl = !!(c && c.updateButtonValue);
      if (out.hasCtl) for (let i = 0; i < 6 && m.feed; i++) { m.feed.p = 0.3; m.feed.t = 0; c.updateButtonValue('trigger', 1); await frames(2); c.updateButtonValue('trigger', 0); await frames(2); }
      out.trig = m.feed ? m.feed.taps - t0 : (m.stats.fought ? 99 : -1);
      for (let i = 0; i < 40 && m.feed && !m.feed.done; i++) { m.tap(); await frames(1); }
      out.fought = m.stats.fought; return out; });
    C.ok(/IAN/.test(r.box), `quest: the wrist box doesn't say what Ian's up to: ${r.box}`);
    C.ok(r.panel && r.panel.s <= 0.4 && Math.abs(r.panel.x) < 0.01 && Math.abs(r.panel.y) < 0.3 && r.panel.z < -0.5, `quest: the cut scene panel isn't small and centred: ${JSON.stringify(r.panel)}`);
    if (r.hasCtl) C.ok(r.trig >= 3, `quest: pulling the trigger didn't count as taps: ${JSON.stringify(r)}`);
    C.ok(r.fought === 1, `quest: couldn't fight him off in the headset: ${JSON.stringify(r)}`);
    console.log(`  quest: ${JSON.stringify(r)}`);
    C.ok(!p.errors.length, 'quest: page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } catch (e) { C.ok(false, `quest: ${e.message.slice(0, 300)}`); }
  await p.context().close();
}

export default async function () {
  const C = checker('bbqmode'), b = await launch();
  try {
    // (the owner's order: a phone held upright first, then the Quest, then a phone on its side)
    for (const [w, h, tag] of [[390, 844, 'portrait'], [0, 0, 'quest'], [844, 390, 'landscape']]) {
      if (tag === 'quest') { await quest(b, C); continue; }
      const p = await newPage(b, { width: w, height: h, mobile: true });
      try {
        await startGame(p, { place: 'garden', mode: 'bbq' }); await sleep(500);
        const shot = async (name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await p.evaluate(() => RS.renderer.render(RS.scene, RS.player.camera)); await p.screenshot({ path: `${SHOTS}/bbq-${tag}-${name}.png` }); };
        const overlaps = async (when) => { await p.evaluate(CHECK); const probs = (await p.evaluate(() => window.__textCheck())).filter(o => o.kind === 'text on text' || o.kind === 'off the side of the screen'); C.ok(!probs.length, `${tag} ${when}: ${JSON.stringify(probs.slice(0, 3))}`); };
        // 1) Ian at the grill, cooking: smoke, food on the grill, his spatula, the countdown to his next go
        const cook = await p.evaluate(() => { RS.renderer.setAnimationLoop(null); RS.sim(4); const m = RS.director.bbqm, ian = RS.cast.find(c => c.id === 'ian');
          return { m: !!m, phase: m && m.phase, grill: m && m.grill.length, spat: m && m.spat.visible, smoke: RS.attackFx.parts.length, nearGrill: ian ? Math.hypot(ian.pos.x + 4.8, ian.pos.z - 1.2) : 99, pill: (document.getElementById('nextAttack') || {}).textContent || '', box: JSON.stringify(RS.hudExtras()) }; });
        C.ok(cook.m && cook.phase === 'cook' && cook.nearGrill < 0.6, `${tag}: Ian isn't cooking at the grill: ${JSON.stringify(cook)}`);
        C.ok(cook.grill > 0 && cook.spat && cook.smoke > 0, `${tag}: no food / spatula / smoke at the grill: ${JSON.stringify(cook)}`);
        C.ok(/IAN'S COMING IN \d+/.test(cook.pill), `${tag}: no countdown to Ian's next go: "${cook.pill}"`);
        C.ok(/KO IAN 0\/5 · HITS 0\/1[0-5]/.test(cook.box), `${tag}: the top-left box doesn't say what to do: ${cook.box}`);
        // a slap while you're small only tickles him
        const tickle = await p.evaluate(() => { const ian = RS.cast.find(c => c.id === 'ian'), part = ian.rag.parts.chest || ian.rag.list[0]; const at = ian.headPos(new RS.THREE.Vector3()); const r = ian.slap(part, at, new RS.THREE.Vector3(4.2, 0, 0)); RS.sim(0.5); return { r, down: ian.down }; });
        C.ok(tickle.r !== 'ko' && !tickle.down, `${tag}: a small Ronnie's slap knocked Ian over: ${JSON.stringify(tickle)}`);
        // 2) off he goes: asks, insists, then forces it and catches you (the cut scene starts)
        const chase = await p.evaluate(() => { const m = RS.director.bbqm, ian = RS.cast.find(c => c.id === 'ian'), P = RS.player; m.nextT = 0.05; RS.sim(0.3);
          const d0 = Math.hypot(ian.pos.x - P.head.x, ian.pos.z - P.head.z), phases = new Set([m.phase]); let t = 0, d3 = null, spoke = 0;
          while (!m.feed && t < 30) { RS.sim(0.1); t += 0.1; phases.add(m.phase); if (ian.speakT > 0 || ian.voicePending) spoke++; if (d3 === null && t > 3) d3 = Math.hypot(ian.pos.x - P.head.x, ian.pos.z - P.head.z); if (t > 2 && t < 2.15) window.__chasePill = (document.getElementById('nextAttack') || {}).textContent; }
          return { d0, d3, phases: [...phases], feed: !!m.feed, t, pill: window.__chasePill, spoke }; });
        C.ok(chase.phases.includes('ask') && chase.phases.includes('insist') && chase.phases.includes('force'), `${tag}: Ian didn't ask, insist then force: ${JSON.stringify(chase)}`);
        C.ok(chase.d3 !== null && chase.d3 < chase.d0, `${tag}: Ian didn't come towards you: ${JSON.stringify(chase)}`);
        C.ok(chase.spoke > 10, `${tag}: Ian didn't say anything while he came for you: ${JSON.stringify(chase)}`);
        C.ok(chase.feed, `${tag}: Ian never caught you (no cut scene): ${JSON.stringify(chase)}`);
        C.ok(/IAN/.test(chase.pill || ''), `${tag}: the red bar didn't say he's coming: ${chase.pill}`);
        // 3) the cut scene: Ian in front of you, the panel up; spam taps and he's pushed off
        const inCut = await p.evaluate(() => { RS.sim(0.4); const m = RS.director.bbqm, ian = RS.cast.find(c => c.id === 'ian'), P = RS.player, cam = P.camera;
          const v = ian.headPos(new RS.THREE.Vector3()).project(cam); const d = Math.hypot(ian.pos.x - P.head.x, ian.pos.z - P.head.z);
          return { panel: !!(m.panel && m.panel.parent && m.panel.visible), onScreen: Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1, d, frozen: P.fx.frozen > 0, food: m.burger.visible || m.hotdog.visible }; });
        C.ok(inCut.panel && inCut.onScreen && inCut.d < 1.4 && inCut.frozen && inCut.food, `${tag}: the cut scene isn't Ian in your face with the food: ${JSON.stringify(inCut)}`);
        await shot('feed'); await overlaps('cut scene');
        const fight = await p.evaluate(() => { const m = RS.director.bbqm, cv = RS.renderer.domElement, ian = RS.cast.find(c => c.id === 'ian'); const p0 = m.feed.p; let i = 0;
          for (; i < 120 && m.feed && !m.feed.done; i++) { cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 })); RS.sim(1 / 10); }
          const res = m.feed && m.feed.done; RS.sim(2); return { p0, res, taps: i, fought: m.stats.fought, phase: m.phase, feedGone: !m.feed, ianDown: ian.down }; });
        C.ok(fight.res === 'won' && fight.fought === 1, `${tag}: spamming taps didn't fight him off: ${JSON.stringify(fight)}`);
        C.ok(fight.feedGone && !fight.ianDown && fight.phase === 'return', `${tag}: a small Ronnie pushing him off should send him back to the grill (not floor him): ${JSON.stringify(fight)}`);
        // 4) no taps: force-fed. The eat meter drops, BLEURGH, a short stun
        const fail = await p.evaluate(() => { const m = RS.director.bbqm, G = RS.G, P = RS.player; RS.addChonk(20); const before = G.chonk; m.setPhase('feed'); m.feedYaw = 0; m.beginFeed('hotdog'); let t = 0;
          while (m.feed && !m.feed.done && t < 10) { RS.sim(0.1); t += 0.1; }
          const res = m.feed && m.feed.done; return { res, before, after: G.chonk, noEat: P.fx.noEat, slow: P.fx.slow, fed: m.stats.fed, t }; });
        C.ok(fail.res === 'lost' && fail.after < fail.before && fail.noEat > 0 && fail.fed === 1, `${tag}: not tapping didn't force-feed you (with a penalty): ${JSON.stringify(fail)}`);
        await p.evaluate(() => RS.sim(3));
        // 5) bigger: pushing him off counts 3 hits, 10-15 slaps floor him, STAGE 5 barges count 3; five times and he gives up
        const big = await p.evaluate(() => { const m = RS.director.bbqm, ian = RS.cast.find(c => c.id === 'ian'), P = RS.player, G = RS.G, out = {};
          const upAgain = () => { let t = 0; while ((ian.down || ian.state !== 'act') && t < 15) { RS.sim(0.1); t += 0.1; } RS.sim(0.5); };
          RS.addChonk(100 - G.chonk); out.stage = G.stage;
          upAgain(); m.hits = 0; m.setPhase('force'); m.t = 20; m.feedYaw = 0; m.setPhase('feed'); m.beginFeed('burger'); const cv = RS.renderer.domElement;
          for (let i = 0; i < 60 && m.feed && !m.feed.done; i++) { cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); RS.sim(1 / 6); }
          RS.sim(0.3); out.pushKO = ian.down; out.pushHits = m.hits; out.need = m.need; out.ko1 = m.stats.ko; RS.sim(1.5);
          const st = RS.room.start, open = () => { const dx0 = P.rig.position.x - P.head.x, dz0 = P.rig.position.z - P.head.z; P.rig.position.x = st.x + dx0; P.rig.position.z = st.z + dz0; ian.rag.placeAt(st.x, st.z - 1.6, 0); RS.sim(1 / 30); };      // (out in the open: the start spot, Ian beside it)
          upAgain(); open(); const part = ian.rag.parts.chest || ian.rag.list[0];
          out.slap = ian.slap(part, ian.headPos(new RS.THREE.Vector3()), new RS.THREE.Vector3(-4.2, 0, 0)); RS.sim(0.1); out.downAfterOne = ian.down;
          let n = 1; for (; n < 30 && !ian.down; n++) { ian.slapCool = 0; m.hitAt = 0; ian.slap(part, ian.headPos(new RS.THREE.Vector3()), new RS.THREE.Vector3(-4.2, 0, 0)); RS.sim(1 / 30); }
          out.slaps = n; RS.sim(0.3); out.ko2 = m.stats.ko; RS.sim(1.5);
          upAgain(); RS.addChonk(140 - G.chonk); out.stage2 = G.stage;
          // walk straight into him (the last of the five: he gives up, and that's the game)
          m.stats.ko = 4; m.hits = m.need - 3; const end0 = RS.director.end; window.__ended = 0; RS.director.end = () => { window.__ended++; };
          open();
          for (let i = 0; i < 40 && !ian.down; i++) { const ex = ian.pos.x - P.head.x, ez = ian.pos.z - P.head.z, l = Math.hypot(ex, ez) || 1; P.rig.position.x += ex / l * 0.1; P.rig.position.z += ez / l * 0.1; RS.sim(1 / 30); }
          out.barge = ian.down; out.ko3 = m.stats.ko; RS.sim(3); out.gaveUp = m.gaveUp; out.box = JSON.stringify(RS.hudExtras()); out.pill = (document.getElementById('nextAttack') || {}).textContent;
          out.receipt = m.summary().map(l => l.join(' ')).join(' | ');
          window.__end0 = end0; return out; });
        await sleep(7000); const endWin = await p.evaluate(() => { const n = window.__ended, m = RS.director.bbqm; m.over = false; m.won = undefined; if (m.fedBy) m.fedBy.clear(); m.fedOne('me'); m.fedOne('me'); m.fedOne('me'); return { n, won: true }; });
        await sleep(7000); const endLose = await p.evaluate(() => { const n = window.__ended, m = RS.director.bbqm; const r = { n, won: m.won }; RS.director.end = window.__end0; m.over = false; m.won = undefined; return r; });
        C.ok(endWin.n === 1, `${tag}: five knock-downs and the game didn't end: ${JSON.stringify(endWin)}`);
        C.ok(endLose.n === 2 && endLose.won === false, `${tag}: force-fed three times and the game didn't end: ${JSON.stringify(endLose)}`);
        C.ok(!big.pushKO && big.pushHits === 3 && big.ko1 === 0 && big.need >= 10 && big.need <= 15, `${tag}: pushing Ian off should count 3 hits, not floor him: ${JSON.stringify(big)}`);
        C.ok(!big.downAfterOne && big.ko2 === 1 && big.slaps + 3 >= 10 && big.slaps + 3 <= 15, `${tag}: Ian should go down after 10 to 15 hits, not one: ${JSON.stringify(big)}`);
        C.ok(big.stage2 >= 4 && big.barge && big.ko3 === 5 && big.gaveUp, `${tag}: at STAGE 5 walking into him didn't floor him / five KOs and he didn't give up: ${JSON.stringify(big)}`);
        C.ok(/GAVE UP/.test(big.box) && /GAVE UP/.test(big.pill || ''), `${tag}: the HUD doesn't say he gave up: ${big.box} / ${big.pill}`);
        // 6) the chase on screen (a fresh one, from the start): nothing covering anything
        await p.evaluate(() => { const m = RS.director.bbqm; m.gaveUp = false; m.stats.ko = 0; RS.sim(3); const ian = RS.cast.find(c => c.id === 'ian'), P = RS.player, st = RS.room.start; ian.rag.placeAt(st.x, st.z - 4.5, 0); m.setPhase('force'); m.chaseT = 15; RS.sim(0.3); P.faceToward(ian.pos.x, ian.pos.z, 0.2); RS.sim(0.4); });
        await shot('chase'); await overlaps('chase');
        console.log(`  ${tag}: taps to win ${fight.taps}, fed -${Math.round(fail.before - fail.after)}, ${big.receipt}`);
        C.ok(!p.errors.length, `${tag}: page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
      } catch (e) { C.ok(false, `${tag}: ${e.message.slice(0, 300)}`); }
      await p.context().close();
    }
    // a joining player's game: the host says Ian's caught them; the cut scene runs here and the answer goes back
    const q = await newPage(b, { width: 390, height: 844, mobile: true });
    try {
      await startGame(q, { place: 'garden', mode: 'bbq' }); await sleep(300);
      const j = await q.evaluate(() => { RS.renderer.setAnimationLoop(null); const m = RS.director.bbqm, sent = []; m.host = false;
        const net = RS.net, send0 = net.send.bind(net); net.send = (x) => { sent.push(x); send0(x); };
        Object.defineProperty(m, 'mpOn', { get: () => true });
        m.onState({ ph: 'force', n: 0, ko: 1, gu: 0, tg: 'x', tn: 'BETH' }); RS.sim(0.2); const pill = (document.getElementById('nextAttack') || {}).textContent;
        m.onFeedMsg({ f: 'hotdog' }); const began = !!m.feed; const cv = RS.renderer.domElement;
        for (let i = 0; i < 80 && m.feed && !m.feed.done; i++) { cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); RS.sim(1 / 10); }
        m.onState({ ph: 'cook', n: 'bad', ko: 99, gu: 0, tg: 5, tn: {} });      // (rubbish from the room: ignored, nothing breaks)
        RS.sim(2); net.send = send0; return { pill, began, sent: sent.filter(x => x.t === 'bbqR'), ko: m.stats.ko }; });
      C.ok(/BETH/.test(j.pill || ''), `guest: the red bar should say who Ian's after: ${j.pill}`);
      C.ok(j.began && j.sent.length === 1 && j.sent[0].w === 1, `guest: the cut scene didn't run here and answer the host: ${JSON.stringify(j)}`);
      C.ok(!q.errors.length, 'guest: page errors: ' + [...new Set(q.errors)].slice(0, 3).join(' | '));
    } catch (e) { C.ok(false, `guest: ${e.message.slice(0, 300)}`); }
  } finally { await b.close(); }
  return C.fails;
}
