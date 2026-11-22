// WHAT THE PUNTERS GET UP TO (Run the Pub): picks their moves from the library in punteranims.js, by where they are
// and how they're feeling: sat at a table (chatting, listening to someone, laughing when someone laughs, a toast the
// whole table joins, a story with the arms going, a kid swinging their legs and drawing on the menu), stood at the bar
// with a pint, queueing (wallet out, drumming fingers, waving a tenner, a foot tapping, leaning over the bar, then
// FUMING and banging on it), dancing when they've had a few, the hen party. And it runs the big set pieces:
//   a FIGHT: two lads trading proper exchanges (jabs, haymakers, uppercuts, shoves, a grapple, a headlock), each punch
//     landing on the other one's flinch, the third one holding a fighter back or piling in;
//   an ARGUMENT: two of them stood up face to face, taking turns (pointing, the finger in the chest, arms wide, counting
//     the points off, leaning in) while the other folds their arms or waves it off. Go over to calm it down, or it
//     ends with one storming out, or turns into a fight;
//   a SING-SONG: whoever's singing gets the pub going, it spreads round the tables (swaying, pints up, an arm round
//     the next one along, chanting, stamping)
import * as THREE from 'three';
import { setClip, clearClip, clipDone, clipTime, CLIPS } from './punteranims.js';
import { sfx } from './audio.js';

const R = (a) => a[Math.floor(Math.random() * a.length)];
const wpick = (list) => { let tot = 0; for (const [, w] of list) tot += Math.max(0, w); let x = Math.random() * tot; for (const [n, w] of list) { if (w <= 0) continue; x -= w; if (x <= 0) return n; } return null; };
const dist = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);
const yawTo = (a, b) => Math.atan2(b.pos.x - a.pos.x, b.pos.z - a.pos.z);

const ARGUE = {
  open: ['That was MY seat!', 'You owe me a pint. From 2019.', 'It was NEVER offside!', 'Your round. YOUR round. I got the last THREE.', 'The capital of Australia is SYDNEY.', 'Darts IS a sport!', 'Oasis were better than Blur and I will die on this hill.', 'Who ate my scampi fries?', 'You said you\'d be home by NINE!', 'That\'s my pint you\'re drinking!', 'Ronnie ate the pork scratchings. I SAW him!', 'You cheated at the quiz. On your PHONE.'],
  push: ['Don\'t you point at me!', 'Say that again. SAY IT.', 'Oh here we go...', 'Prove it!', 'Says WHO?', 'Calm DOWN.', 'You\'re unbelievable, you are.', 'Every. Single. Time.', 'Number one: no. Number two: NO.', 'I\'m not having this.', 'Don\'t "mate" me!', 'Is that right? IS IT?'],
  calm: ['Sorry Ron. Sorry. We\'re fine.', 'Alright, alright. Shake on it.', 'He started it! ...fine.', 'Yeah, yeah. Pint?'],
  storm: ['RIGHT. I\'m going!', 'I\'m not sitting with HIM.', 'Enjoy your scampi fries, Kevin!', 'We are DONE.'],
};
const SONGS = ['♪ SWEET CAROLINE! BUM BUM BUM! ♪', '♪ Sooo here it is, merry Christmas! ♪ (it\'s July)', '♪ I\'M FOREVER BLOWING BUBBLES! ♪', '♪ Come on Eileen! ♪ ...Eileen? EILEEN?', '♪ We are the champions! ♪ ...of the pub quiz, 1991!', '♪ Hey Jude! Na na na na-na-na-naaa ♪', '♪ Don\'t look back in anger! ♪', '♪ It\'s coming home! It\'s coming— ♪'];
const JOIN = ['♪ BUM BUM BUM! ♪', '♪ SO GOOD! SO GOOD! ♪', '♪ Na na na na! ♪', '♪ ...pretty bubbles in the air! ♪', '♪ WOAAAH! ♪', '(swaying)', '♪ EILEEEEN! ♪'];

// the little things they hold: a phone to look at, a tenner to wave
let PHONE_G = null, NOTE_G = null, PROP_M = null;
function handProp(kind) {
  if (!PROP_M) { PROP_M = [new THREE.MeshLambertMaterial({ color: 0x15151a }), new THREE.MeshLambertMaterial({ color: 0x6ac8ff, emissive: 0x2a6a9a }), new THREE.MeshLambertMaterial({ color: 0xd2782e })];
    PHONE_G = new THREE.BoxGeometry(0.068, 0.14, 0.009); NOTE_G = new THREE.BoxGeometry(0.13, 0.065, 0.002); }
  const g = new THREE.Group();
  if (kind === 'phone') { g.add(new THREE.Mesh(PHONE_G, PROP_M[0])); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.125), PROP_M[1]); s.position.z = 0.0048; g.add(s); }
  else g.add(new THREE.Mesh(NOTE_G, PROP_M[2]));
  return g;
}
const PROPS = { s_phone: 'phone', s_phone_show: 'phone', t_phone: 'phone', q_wallet: 'note', q_wave: 'note' };

export class PunterLife {
  constructor(rp) { this.rp = rp; this.g = rp.g; this.timers = []; this.now = 0; }
  // later, on the game's own clock (so it pauses with the game, and runs in step with it)
  after(fn, secs) { this.timers.push([this.now + secs, fn]); }
  update(dt) { this.now += dt; if (!this.timers.length) return; const due = this.timers.filter(x => x[0] <= this.now); this.timers = this.timers.filter(x => x[0] > this.now); for (const [, fn] of due) try { fn(); } catch (e) { console.warn('punter', e); } }
  get punters() { return this.rp.punters; }
  free(c) { return c && !c.disposed && !c.down && c.rp && !c.rp.ctl; }
  near(c, r, pred = null) { return this.punters.filter(o => o !== c && this.free(o) && o.state === 'idle' && dist(o, c) < r && (!pred || pred(o))); }

  // ------------------------------------------------------------------ everyday life (each frame, each punter)
  tick(c, dt) {
    this.props(c);
    const rp = c.rp; if (c.down || c.disposed || rp.ctl) return;
    if (c.state !== 'idle') return;
    rp.clipT = (rp.clipT ?? 0.3) - dt;
    const cur = c.clip && CLIPS[c.clip.name];
    if (rp.clipT > 0 && !(cur && !cur.loop && clipDone(c))) return;
    this.next(c);
  }
  next(c) {
    const rp = c.rp, name = this.choose(c);
    if (!name) { clearClip(c); rp.clipT = 1.5 + Math.random() * 3; return; }
    setClip(c, name, { mate: this.near(c, 2.2)[0] || null });
    const clip = CLIPS[name]; rp.clipT = clip.loop ? (rp.phase === 'waiting' ? 2.5 + Math.random() * 3 : 4 + Math.random() * 7) : clip.dur / c.clip.rate + 0.15;
    // it's catching: a laugh goes round the table, a toast is everyone's, and when someone talks the others listen
    if (/_laugh$/.test(name)) this.spread(c, 'laugh', 0.65);
    if (name === 't_toast' || name === 's_cheers') this.spread(c, 'toast', 0.9);
    if (name === 't_chat' || name === 's_chat' || name === 't_story') for (const o of this.near(c, 2.2, o => o.rp.phase === 'settled')) if (Math.random() < 0.6) { setClip(o, o.seated ? 't_listen' : 's_listen', { mate: c }); o.rp.clipT = 3 + Math.random() * 3; }
  }
  spread(c, what, p) {
    for (const o of this.near(c, 2.3, o => o.rp.phase === 'settled')) {
      if (Math.random() > p) continue;
      const n = what === 'laugh' ? (o.seated ? 't_laugh' : 's_laugh') : (o.prop ? (o.seated ? 't_toast' : 's_cheers') : null); if (!n) continue;
      this.after(() => { if (this.free(o) && o.state === 'idle') { setClip(o, n, { restart: true, mate: c }); o.rp.clipT = CLIPS[n].dur / (o.clip ? o.clip.rate : 1) + 0.2; } }, (120 + Math.random() * 520) / 1000);
    }
  }
  choose(c) {
    const rp = c.rp, k = rp.kind, drunk = c.drunk || 0, pint = !!c.prop;
    if (rp.phase === 'waiting') return this.queueClip(c);
    if (rp.phase !== 'settled' && rp.phase !== 'served') return null;
    if (c.seated) {
      if (k === 'kid') return wpick([['t_kid_swing', 2], ['t_kid_draw', 2], ['t_kid_whinge', 1], ['t_eat', rp.family ? 1 : 0], ['t_phone', 0.8], [null, 0.8]]);
      return wpick([['t_chat', 3], ['t_listen', 2.2], ['t_laugh', 1.3], ['t_sip', pint ? 3 : 0], ['t_toast', pint ? 0.6 : 0], ['t_phone', 1.3], ['t_lean_back', 0.9], ['t_story', k === 'old' ? 1.6 : 0.8], ['t_point_tv', 0.5], ['t_facepalm', 0.35],
        ['t_grumpy', k === 'old' ? 0.8 : 0.2], ['t_clap', 0.3], ['t_eat', rp.family ? 1.6 : 0], [null, 1.4]]);
    }
    if (c.hen) return wpick([['d_woo', 3], ['d_sway', 1.5], ['s_laugh', 1.5], ['s_cheers', pint ? 1.2 : 0], ['s_phone_show', 1], ['s_chat', 1]]);
    if (k === 'kid') return wpick([['s_lookround', 1], ['k_tantrum', 0.3], ['s_pockets', 1], [null, 1]]);
    const bar = !!(rp.home && rp.home.bar);
    return wpick([['s_lean_bar', bar ? 3 : 0], ['s_pint', pint ? 3 : 0], ['s_sip', pint ? 2.6 : 0], ['s_gulp', pint && drunk > 0.4 ? 0.6 : 0], ['s_chat', 2], ['s_listen', 1.4], ['s_laugh', 1], ['s_pockets', pint ? 0.3 : 2],
      ['s_phone', 1.1], ['s_phone_show', 0.4], ['s_tv', 1], ['s_goal', 0.15], ['s_groan', 0.15], ['s_darts', bar ? 0 : 0.8], ['s_watch', 0.4], ['s_scratch', 0.4], ['s_yawn', 0.3],
      ['s_drunk', drunk > 0.6 ? 1.5 : 0], ['d_shuffle', drunk > 0.7 ? 0.4 : 0], ['d_dad', drunk > 0.6 && k !== 'old' ? 0.3 : 0], ['d_sway', drunk > 0.5 ? 0.5 : 0], ['s_lookround', 0.5], [null, 1]]);
  }
  // queueing at the bar: patience running out shows
  queueClip(c) {
    const rp = c.rp, k = 1 - rp.wait / rp.patience;
    if (rp.fuming) return wpick([['q_fume', 2], ['q_bang', 1.5], ['q_point_watch', 1], ['a_wide', 1], ['q_sigh', 0.6]]);
    if (!rp.gotWallet && c.rp.kind !== 'kid') { rp.gotWallet = true; return 'q_wallet'; }
    if (k > 0.7) return wpick([['q_wait', 3], ['s_lookround', 1], ['q_drum', 1.5], ['s_watch', 0.5], ['s_pockets', 1]]);
    if (k > 0.4) return wpick([['q_drum', 2], ['q_wave', 2], ['q_tap', 2], ['q_lean_over', 1.2], ['s_watch', 0.8], ['q_wait', 1]]);
    return wpick([['q_wave', 2.5], ['q_tap', 1.5], ['q_sigh', 1.3], ['q_point_watch', 1.2], ['q_lean_over', 1.5], ['q_bang', 0.6]]);
  }
  // a phone or a tenner in the hand for the clips that have one
  props(c) {
    const want = c.clip && !c.down && c.state === 'idle' ? PROPS[c.clip.name] : null;
    if (!want) { if (c.punterProp) c.punterProp.visible = false; return; }
    if (!c.punterProp || c.punterProp.kind !== want) { if (c.punterProp) this.g.scene.remove(c.punterProp); c.punterProp = handProp(want); c.punterProp.kind = want; this.g.scene.add(c.punterProp); (this.rp.added || (this.rp.added = [])).push(c.punterProp); }
    const p = c.punterProp, arm = c.clip.mirror ? 'lArmL' : 'lArmR'; p.visible = true; c.rag.grip(arm, p.position);
    if (want === 'phone') { const h = c.headPos(new THREE.Vector3()); p.lookAt(h); p.position.add(new THREE.Vector3(0, 0.03, 0).applyQuaternion(p.quaternion)); if (c.clip.name === 's_phone_show') p.rotateY(Math.PI); }
    else { p.rotation.set(0, c.rag.yaw, 0.3); }
  }
  // a reaction (a one-off) on someone, then back to whatever they were doing
  react(c, name, line) { if (!this.free(c)) return; setClip(c, name, { restart: true }); c.rp.clipT = CLIPS[name].dur / c.clip.rate + 0.1; if (line) c.say(line, 3); }

  // ------------------------------------------------------------------ a FIGHT
  // e: { who: [a, b, c], knocked }. Two of them go at it in exchanges, the third holds one back or piles in
  fightTick(e, dt) {
    const P = this.g.player, live = e.who.filter(c => !c.disposed && !e.knocked.has(c));
    for (const c of live) c.rp.ctl = 'fight';
    const up = live.filter(c => !c.down && c.state === 'idle');
    const [a, b] = up;
    // only one left standing: he squares up to Ronnie (and swings at him if he's close)
    if (up.length === 1) {
      const c = up[0], d = Math.hypot(P.head.x - c.pos.x, P.head.z - c.pos.z); c.faceYaw = Math.atan2(P.head.x - c.pos.x, P.head.z - c.pos.z);
      if (!e.solo || e.t > e.solo.end) { const close = d < 1.3, mv = close ? R(['f_haymaker', 'f_jab', 'f_upper']) : R(['f_taunt', 'f_square', 'f_guard']); setClip(c, mv, { restart: true }); e.solo = { end: e.t + CLIPS[mv].dur / c.clip.rate + 0.4, hitAt: CLIPS[mv].hit != null ? e.t + CLIPS[mv].hit / c.clip.rate : null };
        if (Math.random() < 0.4) c.say(R(['You want some, landlord?!', 'COME ON THEN, RONNIE!', 'Big man behind the bar, eh?!']), 2.5); }
      if (e.solo.hitAt && e.t >= e.solo.hitAt) { e.solo.hitAt = null; if (d < 1.3 && P.flinch) { P.flinch(new THREE.Vector3(P.head.x - c.pos.x, 0, P.head.z - c.pos.z), 0.9); sfx('punch', P.head, 0.6); } }
      return;
    }
    if (up.length < 2) return;
    // the two fighters face each other and keep their distance (closer for a grapple)
    const ex = e.ex, close = ex && (ex.move === 'f_grapple' || ex.move === 'f_headlock') && e.t > ex.t0 + 0.2 ? 0.5 : 0.85;
    a.faceYaw = yawTo(a, b); b.faceYaw = yawTo(b, a);
    const d = dist(a, b), gap = d - close;
    if (Math.abs(gap) > 0.04) { const k = Math.max(-0.5, Math.min(0.5, gap)) * dt * 1.4, ux = (b.pos.x - a.pos.x) / d, uz = (b.pos.z - a.pos.z) / d; a.rag.root.x += ux * k; a.rag.root.z += uz * k; b.rag.root.x -= ux * k; b.rag.root.z -= uz * k; }
    // the third: holding one of them back from behind (who strains to get at the other), or piling in, or squaring up
    const third = up[2];
    if (third) {
      if (!e.third || e.t > e.third.end) { const r = Math.random(); e.third = { mode: r < 0.5 ? 'hold' : r < 0.75 ? 'taunt' : 'square', who: Math.random() < 0.5 ? a : b, end: e.t + 3 + Math.random() * 3 };
        if (e.third.mode === 'hold') { third.say(R(['LEAVE IT! He\'s not worth it!', 'LEAVE IT, GAZ!', 'Come on, come on, LEAVE IT!']), 3); e.third.who.say(R(['GET OFF ME!', 'Let me at him! LET ME AT HIM!', 'HOLD ME BACK!']), 2.5); } }
      const t3 = e.third, held = t3.who;
      if (t3.mode === 'hold' && !held.down) {
        const by = held.faceYaw, bx = held.pos.x - Math.sin(by) * 0.42, bz = held.pos.z - Math.cos(by) * 0.42;
        third.rag.root.x += (bx - third.pos.x) * Math.min(1, dt * 5); third.rag.root.z += (bz - third.pos.z) * Math.min(1, dt * 5); third.faceYaw = by;
        setClip(third, 'f_holder'); if (!ex || ex.att !== held) setClip(held, 'f_held');
      } else { third.faceYaw = yawTo(third, R([a, b]) === a ? a : b); setClip(third, t3.mode === 'taunt' ? 'f_taunt' : 'f_square');
        if (dist(third, a) < 0.7) { third.rag.root.x += (third.pos.x - a.pos.x) * dt; third.rag.root.z += (third.pos.z - a.pos.z) * dt; } }
    }
    // the exchanges: one throws, the other takes it (or blocks it, or is shoved back)
    if (!ex || e.t > ex.end) {
      const held = e.third && e.third.mode === 'hold' && third ? e.third.who : null;
      let att = Math.random() < 0.55 ? (e.lastDef || a) : (e.lastDef === a ? b : a); if (att === held) att = att === a ? b : a; const def = att === a ? b : a;
      const move = wpick([['f_jab', 3], ['f_haymaker', 2.2], ['f_upper', 1.2], ['f_shove', 1.6], ['f_grapple', 0.9], ['f_headlock', 0.5], ['f_taunt', 0.8], [null, 1]]);
      if (!move) { for (const c of [a, b]) if (c !== held) setClip(c, Math.random() < 0.5 ? 'f_guard' : 'f_square'); e.ex = { end: e.t + 0.8 + Math.random() * 0.8, t0: e.t }; return; }
      const dur = CLIPS[move].dur;
      setClip(att, move, { restart: true }); const rate = att.clip.rate;
      e.ex = { move, att, def, t0: e.t, hitAt: CLIPS[move].hit != null ? e.t + CLIPS[move].hit / rate : null, end: e.t + dur / rate + 0.25 + Math.random() * 0.5 };
      e.lastDef = def;
      if (move === 'f_grapple') { setClip(def, 'f_grapple', { restart: true }); e.ex.end = e.t + 3 + Math.random() * 1.5; }
      else if (move === 'f_headlock') { setClip(def, 'f_in_lock', { restart: true }); e.ex.end = e.t + 3 + Math.random(); def.say(R(['GET OFF!', 'MY HAIR! MIND MY HAIR!', 'Alright! ALRIGHT!']), 2.5); }
      else if (move === 'f_taunt') { setClip(def, 'f_square'); att.say(R(['COME ON THEN!', 'You WANT some?!', 'Outside! NOW!']), 2.5); }
      else if (def !== held) setClip(def, Math.random() < 0.5 ? 'f_guard' : 'f_square');
      if (Math.random() < 0.35) att.say('chatter', 2.5);
    }
    // the punch lands (or is blocked), the shove sends him back
    if (ex && ex.hitAt && e.t >= ex.hitAt) {
      ex.hitAt = null; const def = ex.def;
      if (!def.down && def.state === 'idle') {
        if (ex.move === 'f_shove') { setClip(def, 'f_shoved', { restart: true }); ex.push = { by: ex.att, t: 0.45 }; sfx('punch', def.pos, 0.35); }
        else if (Math.random() < 0.3 && ex.move !== 'f_haymaker') setClip(def, 'f_block', { restart: true });
        else { setClip(def, Math.random() < 0.25 ? 'f_stagger' : 'f_hit', { restart: true }); sfx('punch', def.headPos(new THREE.Vector3()), 0.6); const h = def.headPos(new THREE.Vector3()); this.g.words.show(R(['*THUD*', '*WHACK*', '*SMACK*', '*OOF*']), h.add({ x: 0, y: 0.35, z: 0 }), '#ff3a3a', 0.07, 0.6);
          if (Math.random() < 0.3) this.after(() => { if (!def.down && !def.disposed) def.say(R(['My NOSE!', 'Is that all you\'ve got?!', 'Right. RIGHT.', 'Ow! OW!']), 2); }, 0.5); }
        ex.end = Math.max(ex.end, e.t + 1.2);
      }
    }
    if (ex && ex.push && ex.push.t > 0) { const by = ex.push.by, def = ex.def, d2 = dist(by, def) || 1, k = dt * 1.2; ex.push.t -= dt; def.rag.root.x += (def.pos.x - by.pos.x) / d2 * k; def.rag.root.z += (def.pos.z - by.pos.z) / d2 * k; }
  }
  endFight(e) { for (const c of e.who) if (c.rp) { c.rp.ctl = null; if (!c.disposed) clearClip(c); } }

  // ------------------------------------------------------------------ an ARGUMENT
  startArgue() {
    // two of them sat or stood near each other (not kids, not queueing); or a couple of lads come in having it out
    const ok = (c) => this.free(c) && c.rp.kind !== 'kid' && c.rp.phase === 'settled' && c.state === 'idle';
    const pool = this.punters.filter(ok); let pair = null;
    for (const a of pool) { const b = pool.find(o => o !== a && dist(o, a) < 2.6); if (b) { pair = [a, b]; break; } }
    if (!pair) return false;
    const [a, b] = pair, mx = (a.pos.x + b.pos.x) / 2, mz = (a.pos.z + b.pos.z) / 2, nav = this.g.room.nav;
    // a clear bit of floor beside them to have it out on
    let spot = null; for (let i = 0; i < 16 && !spot; i++) { const ang = i * 0.785 + Math.random() * 0.3, r = 0.6 + (i >> 3) * 0.6, x = mx + Math.sin(ang) * r, z = mz + Math.cos(ang) * r; if (!nav || (nav.free[nav.idx(x, z)] && nav.free[nav.idx(x + 0.5, z)] && nav.free[nav.idx(x - 0.5, z)])) spot = { x, z }; }
    if (!spot) spot = { x: mx, z: mz };
    for (const [c, s] of [[a, -1], [b, 1]]) { c.rp.ctl = 'argue'; this.rp.dropTag(c); c.seated = false; c.activity = null; clearClip(c); c.goTo(spot.x + s * 0.45, spot.z, 1.1); }
    a.say(R(ARGUE.open), 4);
    this.rp.event = { kind: 'argue', t: 0, who: [a, b], at: new THREE.Vector3(spot.x, 0, spot.z), calm: 0, turnT: 1.5, speaker: a };
    this.g.showBanner('THEY\'RE ARGUING!', 'GO OVER AND CALM THEM DOWN');
    return true;
  }
  argueTick(e, dt) {
    const g = this.g, P = g.player, [a, b] = e.who;
    const gone = (c) => c.disposed || c.down || !c.rp;
    if (gone(a) || gone(b)) { this.endArgue(e, null); return; }
    if (a.state !== 'idle' || b.state !== 'idle') return;      // (still getting up and over there)
    a.faceYaw = yawTo(a, b); b.faceYaw = yawTo(b, a);
    const d = dist(a, b); if (Math.abs(d - 0.9) > 0.05) { const k = (d - 0.9) * Math.min(1, dt * 2) * 0.5, ux = (b.pos.x - a.pos.x) / d, uz = (b.pos.z - a.pos.z) / d; a.rag.root.x += ux * k; a.rag.root.z += uz * k; b.rag.root.x -= ux * k; b.rag.root.z -= uz * k; }
    // taking turns: the speaker goes off on one, the other reacts
    if ((e.turnT -= dt) <= 0) {
      const sp = e.speaker = Math.random() < 0.7 ? (e.speaker === a ? b : a) : e.speaker, li = sp === a ? b : a;
      const heat = Math.min(1, e.t / 25);
      const mv = wpick([['a_point', 2], ['a_jab', 1 + heat * 2], ['a_wide', 1.6], ['a_count', 1.2 - heat * 0.6], ['a_lean_in', heat * 2], ['a_head', 0.8], ['a_slam', heat * 0.8], ['a_shrug', 0.6]]);
      setClip(sp, mv, { restart: true, mate: li }); setClip(li, wpick([['a_listen_cross', 2.5], ['a_shrug', 1], ['a_dismiss', 1], ['a_head', 0.6], ['a_wide', 0.8]]), { restart: true, mate: sp });
      sp.say(R(e.t < 3 ? ARGUE.open : ARGUE.push), 3);
      e.turnT = CLIPS[mv].dur / sp.clip.rate + 0.3 + Math.random() * 0.8;
      if (mv === 'a_slam') sfx('punch', sp.pos, 0.25);
    }
    // Ronnie stood by them: they calm down, shake on it, back to their drinks
    const near = Math.hypot(P.head.x - e.at.x, P.head.z - e.at.z) < 1.8;
    e.calm = near ? e.calm + dt : Math.max(0, e.calm - dt * 0.5);
    if (near && !e.told) { e.told = true; g.words.show('CALM DOWN, LADS!', e.at.clone().setY(2), '#29b6ff', 0.09, 1.2); }
    if (e.calm >= 2.5) { this.rp.pay(8, e.at.clone().setY(1.9), 'ARGUMENT SORTED! +£8'); this.rp.rating += 0.3; this.endArgue(e, 'calm'); return; }
    this.rp.rating -= dt * 0.012;
    // left to it: one storms out, or it kicks off
    if (e.t > 34) {
      if (Math.random() < 0.5) { const s = Math.random() < 0.5 ? a : b; this.endArgue(e, 'storm', s); }
      else this.endArgue(e, 'fight');
    }
  }
  endArgue(e, how, who) {
    const rp = this.rp, [a, b] = e.who; rp.event = null;
    if (how === 'fight' && !a.disposed && !b.disposed) {       // it's gone off: a proper fight between these two
      for (const c of [a, b]) { c.rp.ctl = 'fight'; c.rp.phase = 'brawl'; rp.release(c); }
      rp.event = { kind: 'fight', t: 0, who: [a, b], center: e.at, knocked: new Set(), fromArgue: true };
      this.g.showBanner('IT\'S GONE OFF!', 'BREAK UP THE FIGHT'); sfx('brawl', null, 0.8); return;
    }
    for (const c of [a, b]) { if (!c.rp) continue; c.rp.ctl = null; if (!c.disposed) clearClip(c); }
    if (how === 'calm') { for (const [c, o] of [[a, b], [b, a]]) if (!c.disposed && !c.down) { setClip(c, 's_handshake', { restart: true, mate: o }); c.rp.ctl = 'argue'; } a.say(R(ARGUE.calm), 3);
      this.after(() => { for (const c of [a, b]) if (c.rp && !c.disposed) { c.rp.ctl = null; clearClip(c); if (c.rp.home) rp.goHome(c); } }, 3.2); return; }
    if (how === 'storm' && who && !who.disposed) { const o = who === a ? b : a; setClip(who, 'a_storm', { restart: true }); who.say(R(ARGUE.storm), 3); rp.walkouts++; rp.rating -= 0.2;
      this.after(() => { if (!who.disposed && who.rp) rp.leave(who, null, false); if (!o.disposed && o.rp) { rp.goHome(o); o.say(R(['Good riddance!', 'And DON\'T come back!', '...he\'ll be back tomorrow.']), 3); } }, 1.3); return; }
    for (const c of [a, b]) if (c.rp && !c.disposed && c.rp.home) rp.goHome(c);
  }

  // ------------------------------------------------------------------ a SING-SONG (round the singer: it spreads)
  singTick(e, dt) {
    const s = e.who[0]; if (!s || s.disposed) return;
    s.rp.ctl = 'sing';
    if (!s.down && s.state === 'idle' && (!s.clip || (e.moveT = (e.moveT ?? 0) - dt) <= 0)) { e.moveT = 3 + Math.random() * 3; setClip(s, wpick([['g_belt', 3], ['g_conduct', 2], ['g_heart', 1], ['g_pint', s.prop ? 2 : 0], ['g_chant', 1.5]]), { restart: true }); }
    // others join in, a few at a time: the nearest first, right round the table
    e.joined = e.joined || [];
    if ((e.joinT = (e.joinT ?? 3) - dt) <= 0 && e.t > 2) {
      e.joinT = 1.8 + Math.random() * 2.5;
      const c = this.near(s, 6, o => o.rp.phase === 'settled' && !e.joined.includes(o)).sort((p, q) => dist(p, s) - dist(q, s))[0];
      if (c) { e.joined.push(c); c.rp.ctl = 'sing'; c.say(R(JOIN), 2.5); }
    }
    for (const c of e.joined) {
      if (c.disposed || c.down || c.state !== 'idle' || !c.rp) continue;
      if (c.clip && /^(t_sing|g_)/.test(c.clip.name) && !(c.singT && e.t > c.singT)) continue;
      c.singT = e.t + 5 + Math.random() * 4;
      const mate = e.joined.concat([s]).find(o => o !== c && !o.disposed && !o.down && dist(o, c) < 1.1 && o.seated === c.seated);
      if (c.seated) setClip(c, mate && Math.random() < 0.6 ? 't_sing_hug' : 't_sing', { mate });
      else setClip(c, wpick([['g_hug', mate ? 2 : 0], ['g_pint', c.prop ? 2 : 0], ['g_chant', 1.5], ['g_stamp', 1], ['g_belt', 0.6]]), { mate });
    }
  }
  endSing(e, cheer) {
    for (const c of [...(e.joined || []), ...e.who]) { if (!c.rp) continue; c.rp.ctl = null; if (c.disposed || c.down) continue; clearClip(c); c.singT = null;
      if (cheer && e.who[0] !== c && Math.random() < 0.6) this.after(() => this.free(c) && this.react(c, c.seated ? 't_clap' : (Math.random() < 0.5 ? 's_groan' : 'a_shrug')), Math.random() * 0.6); }
  }
}
export { setClip, clearClip, clipTime };
