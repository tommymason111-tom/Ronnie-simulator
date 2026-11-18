// TALKING NEAR YOU: the squad only chats when a player is close enough to hear them (character.js canChat, TALK_RANGE),
// no more than a couple at once around you, a line sent by the host from somewhere far from you isn't shown or played
// on your game (mpsync.js on_say), and voices fade out with distance to nothing (audio.js out(), HEAR_RANGE).
import { launch, newPage, startGame, checker } from './lib/game.mjs';

export default async function () {
  const C = checker('talk'), b = await launch();
  try {
    const p = await newPage(b, { width: 640, height: 400 });
    await startGame(p, { place: 'pub', mode: 'roam' });
    const r = await p.evaluate(async () => {
      RS.renderer.setAnimationLoop(null);
      const { Character, TALK_RANGE } = await import('./js/character.js');
      const P = RS.player, out = { TALK_RANGE, lines: [], cast: RS.cast.length };
      // every line that comes up, how far from you it was said and how many were talking near you at that moment
      const show0 = Character.prototype.showLine;
      Character.prototype.showLine = function (text, pri, dur) { show0.call(this, text, pri, dur);
        const near = [...Character.ALL].filter(c => c.speakT > 0 && c.rag.mesh && c.headPos(new RS.THREE.Vector3()).distanceTo(P.head) <= TALK_RANGE).length;
        out.lines.push({ who: this.id, pri, d: +this.headPos(new RS.THREE.Vector3()).distanceTo(P.head).toFixed(1), near }); };
      // stand right by the biggest group of the squad, so there's always someone in earshot (people mostly stand still)
      RS.sim(4, 1 / 30);
      const ppl = RS.cast.filter(c => c.rag && c.rag.mesh), score = (c) => ppl.filter(o => o.pos.distanceTo(c.pos) < 6).length, best = ppl.sort((a, c) => score(c) - score(a))[0];
      if (best) { P.rig.position.set(best.pos.x + 1.2, P.rig.position.y, best.pos.z); P.rig.updateMatrixWorld(true); }
      RS.sim(90, 1 / 30);
      // put one person right next to you and everyone else far away: the far ones can't chat, the near one can
      const live = RS.cast.filter(c => c.rag && c.rag.mesh && !c.disposed && !c.down);
      for (const c of live) { c.speakT = 0; c.voicePending = false; }
      const head = P.head.clone(), far = live.slice(1);
      const near1 = live[0];
      const hasCC = near1 && typeof near1.canChat === 'function', canNear = hasCC ? near1.canChat(head.clone().add(new RS.THREE.Vector3(1.5, 0, 0))) : null;
      const canFar = hasCC && far.length ? far[0].canChat(head.clone().add(new RS.THREE.Vector3(TALK_RANGE + 8, 0, 0))) : null;
      // two already talking next to you: a third can't join in (but a priority line still can)
      let third = null;
      if (hasCC && live.length >= 3) { live[1].speakT = 3; live[2].speakT = 3; const pos = (c) => c.headPos(new RS.THREE.Vector3());
        // (move the two talkers' heads' reference: canChat measures them where they are, so only count them if they're near you)
        const n = [live[1], live[2]].filter(c => pos(c).distanceTo(head) <= TALK_RANGE).length;
        third = { near: n, can: live[0].canChat(head.clone().add(new RS.THREE.Vector3(1, 0, 0))) };
        live[1].speakT = 0; live[2].speakT = 0; }
      // a guest getting a 'say' from the host for someone far away: nothing shows. Someone near: it shows
      const farC = live.slice().sort((a, c) => c.headPos(new RS.THREE.Vector3()).distanceTo(head) - a.headPos(new RS.THREE.Vector3()).distanceTo(head))[0];
      const farD = farC.headPos(new RS.THREE.Vector3()).distanceTo(head);
      farC.bubble.visible = false; RS.mp.on_say({ id: farC.id, text: 'can you hear me' });
      out.guestFar = { d: +farD.toFixed(1), shown: farC.bubble.visible };
      // the voices: a voice's sound fades to nothing by HEAR_RANGE; other sounds keep their long fall-off
      const A = await import('./js/audio.js'), made = [], cp = BaseAudioContext.prototype.createPanner;
      BaseAudioContext.prototype.createPanner = function () { const n = cp.call(this); made.push(n); return n; };
      if (!A.audioCtx()) A.initAudio(); const ctx = A.audioCtx(); if (ctx && ctx.state !== 'running') { try { await ctx.resume(); } catch (e) {} }
      out.audio = ctx ? ctx.state : 'none';
      if (ctx && ctx.state === 'running') {
        A.babble(new RS.THREE.Vector3(3, 1.6, 3), 3, 1); const v = made[made.length - 1];
        A.sfx('chomp', new RS.THREE.Vector3(3, 1, 3)); const s = made[made.length - 1];
        out.voicePanner = v && { model: v.distanceModel, max: v.maxDistance, roll: v.rolloffFactor, ref: v.refDistance };
        out.sfxPanner = s && s !== v && { model: s.distanceModel };
        out.HEAR_RANGE = A.HEAR_RANGE;
      }
      BaseAudioContext.prototype.createPanner = cp; Character.prototype.showLine = show0;
      return { ...out, canNear, canFar, third };
    });
    const chat = r.lines.filter(l => l.pri < 4);
    C.ok(r.cast > 2, `not enough squad in the pub to test with (${r.cast})`);
    C.ok(chat.length > 0, 'nobody said anything in 90 seconds near you (chat switched off by mistake?)');
    const farLines = chat.filter(l => l.d > r.TALK_RANGE + 1.5);
    C.ok(!farLines.length, `people chatted from too far away to hear: ${JSON.stringify(farLines.slice(0, 4))}`);
    const crowd = chat.filter(l => l.near > 2);
    C.ok(!crowd.length, `more than two people talking near you at once: ${JSON.stringify(crowd.slice(0, 4))}`);
    C.ok(r.canNear === true, 'someone right next to you was not allowed to talk');
    C.ok(r.canFar === false, 'someone far away was allowed to chat');
    if (r.third && r.third.near === 2) C.ok(r.third.can === false, 'a third person joined in with two already talking next to you');
    C.ok(r.guestFar.d <= r.TALK_RANGE || r.guestFar.shown === false, `a far-away line from the host showed on your game (${r.guestFar.d}m)`);
    C.ok(r.audio === 'running', 'sound never started in the test browser: ' + r.audio);
    if (r.audio === 'running') {
      C.ok(r.voicePanner && r.voicePanner.model === 'linear' && r.voicePanner.max === r.HEAR_RANGE && r.voicePanner.roll === 1, 'voices do not fade to silence with distance: ' + JSON.stringify(r.voicePanner));
      C.ok(r.sfxPanner && r.sfxPanner.model === 'inverse', 'ordinary sounds lost their long fall-off: ' + JSON.stringify(r.sfxPanner));
    }
    console.log(`  ${chat.length} chat lines, furthest ${Math.max(...chat.map(l => l.d))}m, far line test at ${r.guestFar.d}m`);
    C.ok(!p.errors.length, 'page errors: ' + p.errors.slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
