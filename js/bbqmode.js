// IAN'S BARBECUE (mode 'bbq', Lewis's garden). Ian's on the grill, cooking proper burgers and hot dogs "for the lads":
// pinch them off the barbecue and eat them. Every now and then (the red bar counts down) he comes round with a HEALTHY
// one (a tofu burger, a carrot in a bun) for you: first he asks, then he insists, then he chases you and FORCES it.
// Caught: a cut scene, Ian in your face shoving it at your mouth, and you hammer the screen (taps, clicks, any key, the
// triggers in a headset) to push him off. Lose and you're force-fed: BLEURGH, the eat meter drops, a short stun.
// The way to stop him is to get BIGGER: the bigger you are the easier he is to push off; from STAGE 3 a slap (or
// pushing him off) knocks him flat and sends him back to the grill; from STAGE 5 just walking into him does it.
// Knock him over 3 times and he gives up for good (and cooks you proper food for the rest of it).
// Multiplayer: the host's game runs Ian and he chases one player at a time (mp.pickTarget); catching someone else
// sends them 'bbqF' and the cut scene runs on their game, which answers 'bbqR' (pushed off or force-fed). Everyone's
// countdown and top-left box come from the host's 'bbqS'.
import * as THREE from 'three';
import { sfx } from './audio.js';
import { BBQ_SPOT, IAN_SPOT, IAN_YAW } from './levels/garden.js';
import { STAGES } from './config.js';
import { roomNum } from './roomopts.js';
import { track } from './awards.js';
import { Item } from './foods.js';
import { FONT, roundRect } from './textures.js';

export const SLAP_STAGE = 2, BARGE_STAGE = 4, KOS_TO_WIN = 5, FEEDS_TO_LOSE = 3;      // (five knock-downs and he gives up: you win; force-fed three times: you lose)      // (stage numbers count from 0: STAGE 3 and STAGE 5 on screen)
const FEED_MAX = 7;           // seconds of shoving before you've lost
const ASK_T = 3, INSIST_T = 6, GIVE_UP_T = 30;      // (he doesn't hang about: a quick ask, then he means it)      // chase phases (seconds since he set off)
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const LINES = {
  ask: ['Another healthy burger, Ron? It\'s tofu!', 'Hot dog, Ronnie? It\'s a carrot in a bun. HEALTHY hot dog.', 'Ronnie! Burger\'s ready. It\'s beetroot. You\'ll love it.', 'Just the one, boy. It\'s got lettuce in it. TWO lettuces.', 'Lewy\'s had three of these. Look at him, Ronnie. LOOK at him.', 'Fancy a quinoa burger, Ron? I made it myself. With quinoa.'],
  insist: ['Ronnie, don\'t walk away from me when I\'m holding a tofu burger.', 'I\'ve been stood over that grill since ten o\'clock. You\'re HAVING one.', 'It\'s a CARROT DOG, Ronnie. It\'s got MUSTARD on it!', 'Don\'t make me chase you round Lewy\'s mum\'s garden. I\'ve got a bad back.', 'Lewy! LEWY! Your mate\'s being rude about my lentils!'],
  force: ['Right. You\'re having it. Open wide, boy!', 'Here comes the aeroplane, Ronnie! NYEOWWW!', 'I\'m not asking any more, Ron. Healthy burger. NOW.', 'I\'ve caught bigger than you up the lake! Get over here!', 'Hold still! It\'s for your own good!'],
  feed: ['OPEN UP, RONNIE! It\'s TOFU!', 'One bite! ONE BITE! Lewy, hold his arms!', 'It\'s got SEEDS on it, Ron! SEEDS!', 'Chew! CHEW! It\'s good for your bowels!'],
  fed: ['There. Was that so bad? ...he\'s gone green, Lewy.', 'HEALTHY! See? Same again in a bit.', 'Lovely. That\'s one of your five a day. Four to go.'],
  pushed: ['Fine! FINE! I\'ll give it to the dog. We haven\'t got a dog.', 'You\'re lucky my back\'s gone, Ronnie.', 'Ungrateful! That was organic, that was!'],
  down: ['My BACK! Lewy! Your mate\'s assaulted me with his belly!', 'LEEEWY! He\'s bodied me into the begonias!', 'That\'s assault, that is! With a STOMACH!', 'I\'m reporting you to the council, Ronnie!'],
  tickle: ['Ha! Was that a slap? Get some food down you first, boy.', 'That tickled, Ron. You want to get bigger before you try that.', 'Is that it? I\'ve been hit harder by a swan.'],
  giveUp: ['Alright! ALRIGHT! Proper burgers. Proper meat. Don\'t tell Lewy\'s mum.', 'I give up! You win, Ronnie! Have a sausage. Have ALL the sausages.'],
  cook: ['Burger\'s up! For the LADS, Ronnie. Not you.', 'Proper meat, that. From the butcher. Hands off.', 'Lovely bit of tofu on there. Smell that, Lewy. SMELL it.', 'Courgette\'s nearly done. Who\'s having courgette? RONNIE\'S having courgette.', 'Who wants a hot dog? Not you, Ronnie. You\'re on the healthy ones.'],
  cookFree: ['Burger\'s up, Ronnie. A PROPER one. Go on.', 'Sausages! Real ones! Don\'t tell Lewy\'s mum.', 'Have another, boy. I\'ve stopped fighting it.'],
};

// ---------------------------------------------------------------- the props (plain Lambert, like the rest of the food)
const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
function healthyBurger() {
  const g = new THREE.Group(), add = (geo, c, y) => { const m = new THREE.Mesh(geo, lam(c)); m.position.y = y; g.add(m); return m; };
  add(new THREE.CylinderGeometry(0.115, 0.115, 0.01, 20), 0xf4f4ee, 0);                       // paper plate
  add(new THREE.CylinderGeometry(0.06, 0.055, 0.022, 16), 0xc98a4a, 0.016);                   // bottom bun (wholemeal)
  add(new THREE.CylinderGeometry(0.068, 0.068, 0.006, 16), 0x5cbf3a, 0.03);                   // lettuce
  add(new THREE.CylinderGeometry(0.056, 0.056, 0.02, 16), 0xe8dfc0, 0.043);                   // the tofu patty
  add(new THREE.CylinderGeometry(0.05, 0.05, 0.006, 14), 0xd8342a, 0.056);                    // tomato
  add(new THREE.CylinderGeometry(0.062, 0.062, 0.005, 16), 0x7ccf4a, 0.062);                  // more lettuce
  const top = add(new THREE.SphereGeometry(0.06, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xc98a4a, 0.064); top.scale.y = 0.6;
  for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.005, 4, 3), lam(0x3a2a14)); const a = i * 2.4, r = 0.018 + (i % 3) * 0.012; s.position.set(Math.cos(a) * r, 0.098 - r * 0.25, Math.sin(a) * r); g.add(s); }   // seeds. SEEDS.
  return g;
}
function healthyHotdog() {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.01, 20), lam(0xf4f4ee)); g.add(plate);
  const bun = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.12, 4, 10), lam(0xc98a4a)); bun.rotation.z = Math.PI / 2; bun.position.y = 0.032; bun.scale.set(1, 1, 1.15); g.add(bun);
  const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.19, 10), lam(0xff7a1a)); carrot.rotation.z = Math.PI / 2; carrot.position.set(0.01, 0.06, 0); g.add(carrot);
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 6), lam(0x3f9a2e)); leaf.rotation.z = -Math.PI / 2; leaf.position.set(-0.11, 0.06, 0); g.add(leaf);
  for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.008, 5, 4), lam(0xffd21a)); m.position.set(-0.06 + i * 0.03, 0.081, Math.sin(i * 2) * 0.008); g.add(m); }   // mustard
  return g;
}
function spatula() {
  const g = new THREE.Group();
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.2), lam(0x2a1a10)); h.position.z = 0.06; g.add(h);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.005, 0.1), lam(0xa8aeb6)); b.position.z = 0.2; g.add(b);
  return g;
}

export class BbqMode {
  constructor(director) {
    this.d = director; this.g = director.g;
    this.host = !director.remote;
    this.stats = { ate: 0, fed: 0, fought: 0, ko: 0, runs: 0 };
    this.phase = 'cook'; this.t = 0; this.nextT = 15; this.gaveUp = false; this.food = 'burger';
    this.feed = null; this.ian = null; this.grill = []; this.cookT = 2; this.smokeT = 0; this.sizzleT = 0; this.lineT = 0; this.bcastT = 0;
    this.remote = null;       // (a joining player's game: the host's last word on Ian)
    this.prevHead = new THREE.Vector3().copy(this.g.player.head); this.speed = 0; this.prevAv = new Map();
    // the props: a healthy burger or hot dog on a plate (in his hand, then in your face), his spatula, the veg on the grill
    const sc = this.g.scene;
    this.burger = healthyBurger(); this.hotdog = healthyHotdog(); this.spat = spatula();
    for (const o of [this.burger, this.hotdog, this.spat]) { o.visible = false; o.traverse(m => { m.castShadow = false; }); sc.add(o); }
    this.veg = new THREE.Group();
    [['pepper', -0.42, -0.13], ['tomato', -0.18, -0.15], ['cauliflower', 0.12, -0.14], ['broccoli', 0.36, -0.13]].forEach(([t, dx, dz]) => { try { const o = new Item(t).obj; o.position.set(BBQ_SPOT.x + dx, 0.86, BBQ_SPOT.z + dz); this.veg.add(o); } catch (e) { /* no model: no veg */ } });
    sc.add(this.veg);
    // input while you're fighting him off: taps / clicks, any key, a headset's buttons
    this.onDown = (e) => {
      if (!this.feed || this.feed.done || document.body.classList.contains('paused')) return;
      const t = e.target, el = t && t.closest ? t : null;
      if (el && el.closest('#pause, input, textarea, select, a, #menu-btn') ) return;
      if (el && el.closest('button') && !el.closest('.tbtn')) return;      // (the HUD's own buttons still work; EAT and THROW count as taps)
      this.tap(); e.stopPropagation(); if (e.cancelable && el && (el.tagName === 'CANVAS' || el.closest('.tbtn'))) e.preventDefault();
    };
    this.onKey = (e) => { if (!this.feed || this.feed.done || e.repeat || e.key === 'Escape' || e.key === 'Tab' || document.body.classList.contains('paused')) return;
      const t = e.target; if (t && t.matches && t.matches('input, textarea')) return; this.tap(); e.stopPropagation(); };
    addEventListener('pointerdown', this.onDown, true); addEventListener('keydown', this.onKey, true);
    this.padPrev = new Map();
    // multiplayer messages
    this.handlers = {}; const net = this.net;
    if (net) { const on = (k, f) => { this.handlers[k] = net.on[k]; net.on[k] = (m, p) => { try { f(m || {}, p); } catch (e) { console.warn('bbq', k, e); } }; };
      on('bbqF', (m) => this.onFeedMsg(m)); on('bbqR', (m, p) => this.onResult(m, p)); on('bbqS', (m) => this.onState(m)); }
    if (this.host) this.start();
  }
  get net() { const mp = this.d.mp; return mp && mp.net ? mp.net : null; }
  get mpOn() { const mp = this.d.mp; return !!(mp && mp.on); }
  get P() { return this.g.player; }
  get fx() { return this.g.fx; }

  // ---------------------------------------------------------------- the host / solo game: Ian
  start() {
    const g = this.g, ian = g.cast.find(c => c.id === 'ian');
    g.items.minFood = 12;      // (a bit lying about the garden as well as off the grill)
    this.nextT = 15 * (roomNum('attacks') || 1);
    if (!ian || ian.benched) return;      // (a player's being Ian: it's just the grill)
    this.ian = ian;
    ian.active = false; ian.koMul = 1e3; ian.rag.placeAt(IAN_SPOT.x, IAN_SPOT.z, IAN_YAW); ian.faceYaw = IAN_YAW;
    ian.state = 'act'; ian.stateT = 0; ian.attack = null; ian.approach = 0;
    ian.actUpdate = (dt, ctx) => this.ianAct(dt, ctx);
    ian.actAfter = () => this.placeProps();
    const proto = Object.getPrototypeOf(ian);
    ian.slap = (part, point, vel) => { const r = proto.slap.call(ian, part, point, vel); if (r && r !== 'ko' && !this.strong() && vel.length() > 1.5) this.tickle(); return r; };
    const ev0 = ian.onEvent; ian.onEvent = (name, who) => { ev0 && ev0(name, who); if (name === 'ko' || name === 'flung') this.ianDown(); };
    setTimeout(() => { if (this.ian && !this.disposed) ian.say('Right, Lewy, get the plates! Ronnie, you\'re on the HEALTHY ones. Tofu. Lovely.', 5); }, 1500);
  }
  // the biggest player near Ian (who just hit him, near enough): a STAGE 3+ player can knock him down
  nearStage() {
    const ian = this.ian, G = this.g.G; if (!ian) return 0; const p = ian.pos; let st = Math.hypot(this.P.head.x - p.x, this.P.head.z - p.z) < 2.5 ? G.stage : 0;
    const net = this.net; if (net && this.mpOn) for (const pl of net.players.values()) { const av = pl.avatar; if (!av || !av.headPos) continue; const h = av.headPos(); if (Math.hypot(h.x - p.x, h.z - p.z) < 2.5) st = Math.max(st, (pl.pose && pl.pose.st) || 0); }
    return st;
  }
  strong() { return this.nearStage() >= SLAP_STAGE; }
  targetStage() { const t = this.ian && this.ian.mpTarget; if (!t || !t.id || !this.net) return this.g.G.stage; const pl = this.net.players.get(t.id); return (pl && pl.pose && pl.pose.st) || 0; }
  tickle() { const now = performance.now(); if (now - (this.tickleAt || 0) < 3500) return; this.tickleAt = now;
    this.ian.say(pick(LINES.tickle), 4); this.g.words.show('TOO SMALL! GET TO STAGE 3', this.ian.headPos(_v).clone().add({ x: 0, y: 0.35, z: 0 }), '#ffd400', 0.11, 1.4); }

  // Ian's whole day, called from his update (ctx: whoever he's after)
  ianAct(dt, ctx) {
    const ian = this.ian, r = ian.rag; ian.setIdlePose(ian.t);
    this.t += dt; this.lastCtx = ctx;
    switch (this.phase) {
      case 'cook': {
        if (Math.hypot(ian.pos.x - IAN_SPOT.x, ian.pos.z - IAN_SPOT.z) > 0.5) { this.setPhase('return'); break; }
        ian.turnTo(IAN_YAW, dt, 4);
        const s = Math.sin(ian.t * 7);      // flipping: the spatula goes under, up, over
        r.aim('uArmR', -0.25, -0.35, 1); r.aim('lArmR', -0.05, -0.15 + s * 0.45, 1); r.aim('uArmL', 0.3, -0.6, 0.5); r.aim('lArmL', 0.1, -0.2, 1);
        r.pose.chest.setFromAxisAngle(_v.set(1, 0, 0), 0.12);
        if (Math.sign(s) !== this.lastS && s > 0) sfx('flip', BBQ_SPOT_V, 0.35); this.lastS = Math.sign(s);
        break;
      }
      case 'ask': case 'insist': case 'force': {
        const head = ctx.head, scale = this.targetScale(), stopAt = this.phase === 'ask' ? 1.25 + 0.3 * scale : this.phase === 'insist' ? 0.95 + 0.3 * scale : 0;
        const speed = this.phase === 'ask' ? 2.2 : this.phase === 'insist' ? 2.9 : 3.3;      // (marching over, then a run: still slower than you sprinting)
        const d = ian.chaseTo(head.x, head.z, dt, speed, stopAt);
        if (d <= stopAt + 0.05) { ian.turnTo(Math.atan2(head.x - ian.pos.x, head.z - ian.pos.z), dt, 6); }
        // holding it out to you on its plate
        r.aim('uArmR', -0.12, -0.15, 1); r.aim('lArmR', -0.02, 0.15, 1);
        if (this.phase === 'force') { r.aim('uArmL', 0.15, -0.1, 1); r.aim('lArmL', 0.05, 0.3, 1); }      // both arms out: grabbing
        this.chaseT = (this.chaseT || 0) + dt;      // (since he set off: the phases go by this)
        if (this.chaseT > INSIST_T && this.phase === 'insist') this.setPhase('force');
        else if (this.chaseT > ASK_T && this.phase === 'ask') this.setPhase('insist');
        if ((this.lineT -= dt) <= 0) { this.lineT = this.phase === 'force' ? 2.6 : 3.4; ian.say(pick(LINES[this.phase]), 4); }
        if (this.phase === 'force') {
          const catchR = 0.45 * scale + 0.4;
          if (d < catchR && this.t > 0.6) this.caught(ctx);
          else if (this.chaseT > GIVE_UP_T) { ian.say('Fine! FINE! I\'ll give it to Lewy. LEWY!', 4); this.backToGrill(10); }
        }
        break;
      }
      case 'feed': case 'feedR': {
        // right in front of them, shoving it at their face
        const f = this.phase === 'feed' ? this.feed : null, head = ctx.head, scale = this.targetScale();
        const yaw = this.feedYaw, p = f ? f.p : 0.5 + 0.1 * Math.sin(this.t * 3), dist = 0.45 * scale + 0.32 + (p - 0.5) * 0.28;
        r.root.x = head.x + Math.sin(yaw) * dist; r.root.z = head.z + Math.cos(yaw) * dist; r.yaw = yaw + Math.PI; r.moveVel.set(0, 0, 0);
        this.shovePose(p, head, dist);
        if (this.phase === 'feedR' && this.t > 12) { this.backToGrill(12); break; }      // (they never answered: gone, or dropped out)
        if (!f && this.phase === 'feed') this.backToGrill(12);
        break;
      }
      case 'return': {
        const d = ian.chaseTo(IAN_SPOT.x, IAN_SPOT.z, dt, 1.5, 0.12);
        r.aim('uArmR', -0.1, -0.8, 0.3);
        if (d <= 0.15 || this.t > 16) { ian.chase = null; if (this.t > 16) ian.rag.placeAt(IAN_SPOT.x, IAN_SPOT.z, IAN_YAW); else { r.root.x = IAN_SPOT.x; r.root.z = IAN_SPOT.z; } this.setPhase('cook'); }
        break;
      }
    }
  }
  shovePose(p, head, dist) {
    const r = this.ian.rag, j = Math.sin(this.t * 31) * 0.05, up = Math.max(-0.2, Math.min(1.2, (head.y - 0.12 - 1.42) / Math.max(0.3, dist)));
    r.aim('uArmR', -0.12, up + 0.1 + j, 1); r.aim('lArmR', -0.04, up + 0.15 - j, 1);       // the hand with the food: at your mouth
    r.aim('uArmL', 0.2, up - 0.05 - j, 1); r.aim('lArmL', 0.1, up + 0.1 + j, 1);           // the other: pushing
    r.aim('uLegL', 0.12, -1, 0.3); r.aim('lLegL', 0.05, -1, 0.1); r.aim('uLegR', -0.12, -1, -0.35); r.aim('lLegR', -0.03, -1, -0.25);   // braced
    r.pose.chest.setFromAxisAngle(_v.set(1, 0, 0), 0.32 - p * 0.5 + j * 0.5); r.bob = -0.03;
  }
  targetScale() { return (STAGES[Math.max(0, Math.min(STAGES.length - 1, this.targetStage()))] || STAGES[0]).scale; }
  setPhase(ph) {
    this.phase = ph; this.t = 0; this.lineT = 0.2;
    const ian = this.ian; if (!ian) return;
    ian.approach = ph === 'ask' || ph === 'insist' || ph === 'force' ? 1 : 0;      // (the "IAN IS COMING FOR YOU" tag and its arrow, attackfx.js)
    if (ph === 'cook') { ian.chase = null; ian.mpTarget = null; }
    if (ph === 'force') { sfx('warn', null, 0.8); const me = !(ian.mpTarget && ian.mpTarget.id); if (me && this.P.flatMode) this.g.words.show('RUN!', this.P.head.clone().addScaledVector(this.P.fwd, 1.0 * this.P.scale), '#ff5252', 0.14 * this.P.scale, 1.2); }
    this.broadcast(true);
  }
  // off he goes with a healthy one
  startChase() {
    const ian = this.ian; if (!ian || ian.down || this.gaveUp) return false;
    this.food = Math.random() < 0.5 ? 'burger' : 'hotdog'; this.stats.runs++;
    if (this.mpOn && this.d.mp.host) this.d.mp.pickTarget(ian); else { ian.mpTarget = null; this.fx && this.fx.coming && this.fx.coming(ian); }
    this.setPhase('ask'); this.chaseT = 0; ian.chase = null; sfx('notify', null, 0.6);
    ian.say(this.food === 'burger' ? 'Another healthy burger, Ron? It\'s tofu!' : 'Fancy a hot dog, Ronnie? It\'s a carrot. In a bun. HEALTHY hot dog!', 5);
    this.lineT = 3.4;
    return true;
  }
  backToGrill(wait) { this.nextT = Math.max(this.nextT, (wait + 6 + Math.random() * 6) * (roomNum('attacks') || 1)); this.setPhase('return'); }
  caught(ctx) {
    const ian = this.ian, P = this.P, fx = this.fx, t = ian.mpTarget;
    this.feedYaw = Math.atan2(ian.pos.x - ctx.head.x, ian.pos.z - ctx.head.z);
    if (t && t.id) {      // someone else: the cut scene's on their game
      if (!this.net) return; this.net.send({ t: 'bbqF', to: t.id, f: this.food }); this.feedR = t.id; this.setPhase('feedR'); ian.say(pick(LINES.feed), 4); return;
    }
    if (P.knock || P.throwAnim || (fx && fx.inCutscene) || this.feed) return;      // (busy: he waits his moment)
    this.setPhase('feed'); this.beginFeed(this.food); ian.say(pick(LINES.feed), 4);
  }
  // Ian hit the deck (a slap, a barge, being pushed off, thrown in a headset...)
  ianDown() {
    const big = this.nearStage() >= SLAP_STAGE || this.bigWin;
    this.bigWin = false;
    if (this.feed && this.phase === 'feed') this.endFeed(true, true);
    if (this.phase !== 'cook') { this.phase = 'down'; this.t = 0; } else this.phase = 'downCook';
    this.ian.approach = 0;
    this.nextT = Math.max(this.nextT, (18 + this.stats.ko * 4) * (roomNum('attacks') || 1));
    setTimeout(() => { if (this.ian && !this.disposed) this.ian.say(pick(LINES.down), 5); }, 600);
    if (!big || this.gaveUp) return;
    this.stats.ko++; track('ko'); sfx('cheer', null, 0.7);
    this.g.words.show(`IAN DOWN! ${this.stats.ko}/${KOS_TO_WIN}`, this.ian.pos.clone().add({ x: 0, y: 1.6, z: 0 }), '#39ff14', 0.2, 1.8);
    if (this.stats.ko >= KOS_TO_WIN) { this.gaveUp = true; setTimeout(() => { if (this.disposed) return; this.g.showBanner('IAN GIVES UP!', 'PROPER BURGERS FOR EVERYONE'); sfx('victory', null, 0.9); this.ian && this.ian.say(pick(LINES.giveUp), 6); this.finish(true); }, 2600); }
    else if (!this.mpOn || !(this.ian.mpTarget && this.ian.mpTarget.id)) this.g.showBanner(`IAN DOWN! ${this.stats.ko}/${KOS_TO_WIN}`, this.stats.ko === KOS_TO_WIN - 1 ? 'ONE MORE AND HE GIVES UP' : 'BACK TO THE GRILL WITH HIM');
    this.broadcast(true);
  }
  knockIan(dir, power) {
    const ian = this.ian; if (!ian || ian.down) return;
    this.bigWin = true; ian.knockOut('hit'); const l = Math.hypot(dir.x, dir.z) || 1; ian.rag.shove(dir.x / l * power, 2.2, dir.z / l * power);
    sfx('punch', ian.pos, 1); this.g.words.show(pick(['WALLOP!', 'BELLY BARGE!', 'KAPOW!', 'DOOF!']), ian.pos.clone().add({ x: 0, y: 1.3, z: 0 }), '#ff5a36', 0.22, 1);
  }

  // the host's (or solo) game, every frame
  hostUpdate(dt) {
    const ian = this.ian, g = this.g, P = this.P;
    if (!ian || ian.disposed) { this.cookFood(dt, null); return; }
    ian.koMul = this.strong() ? 0.6 : 1e3;      // (small: slaps and food bounce off him)
    if (ian.prop) ian.prop.visible = false;      // (no fishing rod today)
    if (ian.down) { this.cookFood(dt, null); return; }
    if (ian.state !== 'act') { ian.state = 'act'; ian.stateT = 0; if (this.phase === 'down' || this.phase === 'downCook') this.setPhase(this.phase === 'downCook' && Math.hypot(ian.pos.x - IAN_SPOT.x, ian.pos.z - IAN_SPOT.z) < 0.5 ? 'cook' : 'return'); }
    // barging him over (STAGE 5+): walk into him
    if (!this.feed && g.G.stage >= BARGE_STAGE && this.speed > 0.8) {
      const d = Math.hypot(ian.pos.x - P.head.x, ian.pos.z - P.head.z);
      if (d < 0.45 * P.scale + 0.25) this.knockIan({ x: ian.pos.x - P.head.x, z: ian.pos.z - P.head.z }, 5.5);
    }
    if (this.mpOn && this.net && !this.feed) for (const pl of this.net.players.values()) {      // (other players barging him)
      const av = pl.avatar; if (!av || !av.headPos) continue; const h = av.headPos(), prev = this.prevAv.get(pl.id), sp = prev ? Math.hypot(h.x - prev.x, h.z - prev.z) / Math.max(dt, 1e-3) : 0;
      this.prevAv.set(pl.id, { x: h.x, z: h.z });
      if (((pl.pose && pl.pose.st) || 0) >= BARGE_STAGE && sp > 0.8 && !ian.down && Math.hypot(ian.pos.x - h.x, ian.pos.z - h.z) < 0.5 + 0.45 * STAGES[Math.min(STAGES.length - 1, pl.pose.st)].scale) this.knockIan({ x: ian.pos.x - h.x, z: ian.pos.z - h.z }, 5.5);
    }
    if (this.phase === 'cook') {
      this.cookFood(dt, ian);
      if (!this.gaveUp && roomNum('attacks')) { this.nextT -= dt; if (this.nextT <= 0 && !(P.knock && !this.mpOn)) this.startChase(); }
    } else this.cookFood(dt, null);
  }
  // food on the grill (proper food "for the lads"), smoke and sizzle while he's at it
  cookFood(dt, ian) {
    const g = this.g;
    this.grill = this.grill.filter(it => !it.dead && !it.heldBy);
    if ((this.cookT -= dt) > 0 || this.grill.length >= 4) return;
    this.cookT = (this.gaveUp ? 2.2 : ian ? 3.6 : 7) + Math.random() * 2;
    const spots = [[-0.3, 0], [0, 0], [0.3, 0], [0.67, 0]].map(([dx, dz]) => new THREE.Vector3(BBQ_SPOT.x + dx, 1.05, BBQ_SPOT.z + dz));
    const free = spots.find(p => this.grill.every(it => it.pos.distanceTo(p) > 0.15)); if (!free) return;
    const it = g.items.spawn(pick(['burger', 'hotdog', 'chicken', 'sausageroll', 'burger', 'kebab', 'hotdog']), free); it.temp = true; it.bbqGrill = true; this.grill.push(it);
    sfx('sizzle', free, 0.6);
    if (ian && Math.random() < 0.35) ian.say(pick(this.gaveUp ? LINES.cookFree : LINES.cook), 3);
  }

  // ---------------------------------------------------------------- every game: the look of it, the cut scene, the HUD
  update(dt, ctx) {
    if (this.disposed) return;
    const d = this.d, P = this.P;
    this.speed = Math.hypot(P.head.x - this.prevHead.x, P.head.z - this.prevHead.z) / Math.max(dt, 1e-3); this.prevHead.copy(P.head);
    if (!d.running || d.mode !== 'bbq') { if (this.feed) this.endFeed(null); this.hideProps(); return; }
    if (this.host) this.hostUpdate(dt);
    // the barbecue: smoke while he's cooking, a sizzle now and then
    const cooking = this.host ? this.phase === 'cook' : this.remote ? this.remote.ph === 'cook' : true;
    if ((this.smokeT -= dt) <= 0 && this.fx && this.fx.particle) { this.smokeT = cooking ? 0.12 : 0.4;
      this.fx.particle(this.fx.dotTex, _v.set(BBQ_SPOT.x + (Math.random() - 0.5) * 0.8, 1.0, BBQ_SPOT.z + (Math.random() - 0.5) * 0.35), _v2.set((Math.random() - 0.5) * 0.12, 0.45 + Math.random() * 0.2, (Math.random() - 0.5) * 0.12), 1.8, 0.16, 0xa8a8a8, -0.05, true); }
    if (cooking && (this.sizzleT -= dt) <= 0) { this.sizzleT = 2 + Math.random() * 2; sfx('sizzle', BBQ_SPOT_V, 0.35); }
    if (!this.host) this.placeProps();
    if (this.feed) this.updateFeed(dt);
    this.pollPads();
    this.countdown();
    if (this.host && this.mpOn && (this.bcastT -= dt) <= 0) this.broadcast(false);
  }
  // the red bar at the top: when he's coming, and what he's up to
  countdown() {
    const fx = this.fx; if (!fx || !fx.setCountdown) return;
    if (this.feed) { fx.setCountdown(null); return; }
    fx.setCountdown(this.pill(this.state()));
  }
  // what Ian's up to (the host's own, or the host's last word): me = he's after this player
  state() {
    if (!this.host) { const s = this.remote; if (!s) return null; return { ...s, me: !!(s.tg && this.net && s.tg === this.net.id) }; }
    if (!this.ian) return null; const t = this.ian.mpTarget;
    return { ph: this.phase, n: this.nextT, gu: this.gaveUp, me: !(t && t.id), tn: t && t.id ? t.name : '', at: roomNum('attacks') };
  }
  pill(s) {
    if (!s) return null;
    if (s.gu) return '🏆 IAN GAVE UP: EAT EVERYTHING!';
    const me = s.me, who = (s.tn || 'SOMEONE').toUpperCase();
    switch (s.ph) {
      case 'cook': return s.at === 0 ? '🔥 IAN\'S COOKING' : `🔥 IAN'S COMING IN ${Math.max(0, Math.ceil(s.n || 0))}`;
      case 'ask': return me ? '🍔 IAN WANTS YOU TO HAVE ONE...' : `🍔 IAN'S AFTER ${who}`;
      case 'insist': return me ? '😠 IAN INSISTS! KEEP AWAY!' : `😠 IAN'S AFTER ${who}`;
      case 'force': return me ? '⚠ IAN IS FORCING IT! RUN!' : `⚠ IAN'S FORCING ${who}!`;
      case 'feed': case 'feedR': return me ? null : `🥗 ${who} IS BEING FORCE-FED!`;
      case 'down': case 'downCook': return '💥 IAN\'S DOWN!';
      default: return '🔥 IAN\'S HEADING BACK TO THE GRILL';
    }
  }
  broadcast(now) {
    if (!this.host || !this.mpOn || !this.net) return; this.bcastT = 0.5; void now;
    const t = this.ian && this.ian.mpTarget, net = this.net;      // (tg: who he's after; the host's own id when it's the host)
    net.send({ t: 'bbqS', ph: this.phase, n: Math.round(this.nextT * 10) / 10, ko: this.stats.ko, gu: this.gaveUp ? 1 : 0, tg: t && t.id ? t.id : (net.id || ''), tn: String((t && t.id ? t.name : net.name) || '').slice(0, 24), f: this.food, at: roomNum('attacks') });
  }
  onState(m) { if (this.host) return; const s = {}; s.ph = typeof m.ph === 'string' ? m.ph.slice(0, 10) : 'cook'; s.n = typeof m.n === 'number' && isFinite(m.n) ? m.n : 0; s.ko = Math.max(0, Math.min(KOS_TO_WIN, +m.ko || 0)); s.gu = !!m.gu; s.tg = typeof m.tg === 'string' ? m.tg : ''; s.tn = typeof m.tn === 'string' ? m.tn.slice(0, 24) : ''; s.f = m.f === 'hotdog' ? 'hotdog' : 'burger'; s.at = typeof m.at === 'number' ? m.at : 1; this.remote = s; this.stats.ko = s.ko; this.gaveUp = s.gu; this.food = s.f; }
  // (a joining player's game) the host says Ian's caught you
  onFeedMsg(m) { if (this.host || this.feed || !this.d.running) return; this.beginFeed(m.f === 'hotdog' ? 'hotdog' : 'burger'); }
  // (the host) how it went on their game
  onResult(m, p) {
    if (!this.host || this.phase !== 'feedR' || !p || p.id !== this.feedR) return; this.feedR = null;
    const st = Math.max(0, Math.min(STAGES.length - 1, +m.st || 0));
    if (m.w) { this.stats.fought++; if (st >= SLAP_STAGE && this.ian) { const h = this.lastCtx ? this.lastCtx.head : this.ian.pos; this.knockIan({ x: this.ian.pos.x - h.x, z: this.ian.pos.z - h.z }, 4.5); } else { this.ian && this.ian.say(pick(LINES.pushed), 4); this.backToGrill(12); } }
    else { this.stats.fed++; this.ian && this.ian.say(pick(LINES.fed), 4); this.backToGrill(12); this.fedOne(p.id); }
  }

  // ---------------------------------------------------------------- the cut scene: fight him off
  beginFeed(food) {
    const P = this.P, fx = this.fx;
    P.dropAll && P.dropAll(); this.food = food;
    this.feed = { t: 0, p: 0.45, taps: 0, food, st: this.g.G.stage, done: null, doneT: 0, drawT: 0, tapFx: 0 };
    P.effect('frozen', 0.5); P.effect('noEat', 0.5);
    if (fx && fx.comeWho) fx.comeWho = null;
    { const ian = this.g.cast.find(c => c.id === 'ian'); if (ian && P.faceToward) P.faceToward(ian.pos.x, ian.pos.z, 0.35); }      // (he's in front of you: you turn round to him)
    if (fx && fx.hideCard) fx.hideCard();
    // the panel, in front of your eyes
    if (!this.panel) {
      const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 400; this.panelCv = cv;
      this.panelTex = new THREE.CanvasTexture(cv); this.panelTex.colorSpace = THREE.SRGBColorSpace;
      this.panel = new THREE.Mesh(new THREE.PlaneGeometry(1, 400 / 1024), new THREE.MeshBasicMaterial({ map: this.panelTex, transparent: true, depthTest: false, depthWrite: false }));
      this.panel.renderOrder = 45; this.panel.frustumCulled = false;
    }
    (fx ? fx.camera : P.camera).add(this.panel); this.panel.visible = true;
    // the box in the corner steps aside (like a cut scene)
    const w = P.wrist; if (w && P.flatMode && w.visible && w.parent === (fx ? fx.camera : P.camera)) { w.visible = false; this.hidWrist = true; }
    sfx('attack_in', null, 0.8); sfx('grunt', null, 0.6);
    try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch (e) {}
    this.drawPanel();
  }
  tap() {
    const f = this.feed; if (!f || f.done) return;
    f.taps++; f.p = Math.min(1, f.p + 0.075 * (1 + 0.14 * f.st)); f.tapFx = 1;
    if (f.p >= 1) { this.endFeed(true); return; }      // (pushed him right off)
    if (f.taps % 2 === 0) sfx(f.taps % 4 ? 'slap' : 'thwack', null, 0.35);
    try { navigator.vibrate && navigator.vibrate(12); } catch (e) {}
  }
  vr() { const r = this.P.renderer; return !!(r && r.xr && r.xr.isPresenting); }
  // headset: every trigger, grip and face button pressed counts as a tap
  pollPads() {
    if (!this.feed || !this.vr()) return; let s; try { s = this.P.renderer.xr.getSession(); } catch (e) { return; } if (!s) return;
    let i = 0; for (const src of s.inputSources || []) { const gp = src.gamepad; if (!gp) continue;
      gp.buttons.forEach((b, k) => { if (k === 2 || k === 3) return; const key = i + ':' + k, was = this.padPrev.get(key); if (b.pressed && !was) this.tap(); this.padPrev.set(key, b.pressed); }); i++; }
  }
  updateFeed(dt) {
    const f = this.feed, P = this.P, G = this.g.G;
    f.t += dt; f.tapFx = Math.max(0, f.tapFx - dt * 6);
    if (!f.done) {
      P.fx.frozen = Math.max(P.fx.frozen || 0, 0.3); P.fx.noEat = Math.max(P.fx.noEat || 0, 0.3);
      f.st = G.stage;
      const rate = 0.34 / (1 + 0.22 * f.st) * (1 + 0.22 * f.t);
      f.p = Math.max(0, f.p - rate * dt);
      if (f.p >= 1) this.endFeed(true);
      else if (f.p <= 0 || f.t >= FEED_MAX) this.endFeed(false);
      if (Math.random() < dt * 1.2) sfx('grunt', null, 0.4);
    } else if ((f.doneT += dt) > 1.3) { this.closeFeed(); return; }
    // look at him (a phone / computer: the view tips so his face is just above the middle)
    const ian = this.g.cast.find(c => c.id === 'ian'), o = f.food === 'hotdog' ? this.hotdog : this.burger, cam = P.camera;
    if (ian && P.flatMode && !f.done) { const h = ian.headPos(_v), dist = Math.hypot(h.x - P.head.x, h.z - P.head.z) || 0.5;
      const want = Math.atan2(h.y - 0.12 - P.head.y, dist); P.flatPitch += (Math.max(-1.2, Math.min(0.6, want)) - P.flatPitch) * Math.min(1, dt * 8); }
    if (ian) ian.bubble.visible = false;      // (his lines are in the panel's top line: a bubble right in your face covered it all)
    // the food: held out in front of your face, closer and closer as he wins (right in your mouth if he does)
    if (o && !(f.done && f.won)) { const k = f.done ? Math.min(1, 0.6 + f.doneT * 3) : 1 - f.p, D = 0.75 - 0.5 * k;
      cam.updateMatrixWorld(); o.position.set(0, -0.3 * D - 0.02, -D); cam.localToWorld(o.position); o.visible = !(f.done && f.doneT > 0.3);
      cam.getWorldPosition(_v2); o.lookAt(_v2); o.rotateX(Math.PI / 2 - 0.35); o.scale.setScalar(1.25 * (P.scale || 1)); }
    else if (o) o.visible = false;
    this.placePanel();
    if ((f.drawT -= dt) <= 0) { f.drawT = 1 / 20; this.drawPanel(); }
  }
  // the end of it. win: pushed him off; false: force-fed; null: the game ended under it (nothing happens)
  endFeed(win, already = false) {
    const f = this.feed; if (!f || f.done) return;
    if (win === null) { this.closeFeed(); return; }
    f.done = win ? 'won' : 'lost'; f.won = !!win; f.doneT = 0;
    const g = this.g, P = this.P, G = g.G, ian = g.cast.find(c => c.id === 'ian');
    P.fx.frozen = 0;
    if (win) {
      this.stats.fought++; sfx('punch', null, 1); sfx('cheer', null, 0.5);
      g.words.show('GET OFF, IAN!', P.head.clone().addScaledVector(P.fwd, 0.8 * P.scale).add({ x: 0, y: 0.15, z: 0 }), '#39ff14', 0.13 * P.scale, 1.2);
      if (this.host && !already && ian) {
        if (G.stage >= SLAP_STAGE) this.knockIan({ x: ian.pos.x - P.head.x, z: ian.pos.z - P.head.z }, 4.5);
        else { ian.say(pick(LINES.pushed), 4); const a = this.feedYaw; ian.rag.root.x += Math.sin(a) * 0.5; ian.rag.root.z += Math.cos(a) * 0.5; this.backToGrill(12); }
      }
      if (!this.host && this.net) this.net.send({ t: 'bbqR', w: 1, st: G.stage });
    } else {
      this.stats.fed++; track('veg');
      const before = G.chonk; g.addChonk(-(16 + G.stage * 2)); const lost = Math.round(before - G.chonk);
      sfx('bleurgh', null, 1); sfx('gulp', null, 0.7);
      const at = P.head.clone().addScaledVector(P.fwd, 0.8 * P.scale);
      g.words.show('BLEURGH!', at, '#7cff6a', 0.16 * P.scale, 1.5);
      if (lost > 0) g.words.show(`-${lost} EAT METER`, at.clone().add({ x: 0, y: -0.18 * P.scale, z: 0 }), '#ff5252', 0.09 * P.scale, 1.6);
      g.crumbs && g.crumbs.burst(P.mouth.clone().addScaledVector(P.fwd, 0.1), f.food === 'hotdog' ? [0xff7a1a, 0xc98a4a, 0xffd21a] : [0x5cbf3a, 0xe8dfc0, 0xc98a4a, 0xd8342a], 34, 1.8, P.fwd);
      P.effect('noEat', 3); P.effect('dizzy', 3, { amp: 1.4 }); P.effect('slow', 4); P.effect('frozen', 1.2);
      G.fxTint = 0x6aaa3a; G.fxTintT = 3; G.fxTintOp = 0.2;
      try { navigator.vibrate && navigator.vibrate([120, 60, 200]); } catch (e) {}
      if (this.host && ian) { ian.say(pick(LINES.fed), 4); this.backToGrill(12); this.fedOne(this.g.net && this.g.net.id || 'me'); }
      if (!this.host && this.net) this.net.send({ t: 'bbqR', w: 0, st: G.stage });
    }
    G.wristDirty = true; this.drawPanel();
  }
  closeFeed() {
    const P = this.P;
    if (this.panel && this.panel.parent) this.panel.parent.remove(this.panel);
    if (this.hidWrist) { this.hidWrist = false; if (P.wrist && !document.body.classList.contains('gameover')) P.wrist.visible = true; }
    if (this.feed && !this.feed.done) P.fx.frozen = 0;
    this.burger.visible = this.hotdog.visible = false;
    this.feed = null;
  }
  // the panel's size and place: the top half of a phone or computer screen (his face stays in the middle); smaller and
  // in the middle of your view in a headset
  placePanel() {
    const pn = this.panel; if (!pn) return; const cam = this.fx ? this.fx.camera : this.P.camera;
    if (this.vr()) { pn.position.set(0, -0.16, -0.8); pn.scale.setScalar(0.34); return; }
    const D = 0.6, hh = D * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), hw = hh * cam.aspect;
    const w = Math.min(hw * 2 * 0.94, hh * 2 * 0.78), h = w * 400 / 1024;
    pn.scale.setScalar(w); pn.position.set(0, hh * (cam.aspect < 1 ? 0.62 : 0.5), -D);
    if (pn.position.y + h / 2 > hh * 0.86) pn.position.y = hh * 0.86 - h / 2;
  }
  drawPanel() {
    const f = this.feed, cv = this.panelCv; if (!f || !cv) return; const g = cv.getContext('2d'), W = 1024, H = 400;
    const vr = this.vr(), pc = !vr && !('ontouchstart' in window) && !(navigator.maxTouchPoints > 0);
    g.clearRect(0, 0, W, H);
    const col = f.done === 'won' ? '#39ff14' : f.done === 'lost' ? '#7cff6a' : '#ff8a1a';
    g.fillStyle = 'rgba(0,0,0,0.4)'; roundRect(g, 18, 22, W - 30, H - 34, 40); g.fill();
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3a1406'); gr.addColorStop(1, '#14060a'); g.fillStyle = gr; roundRect(g, 10, 10, W - 30, H - 34, 40); g.fill();
    g.lineWidth = 12; g.strokeStyle = col; roundRect(g, 10, 10, W - 30, H - 34, 40); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const txt = (s, x, y, size, fill, stroke = '#111', max = W - 90) => { let sz = size; do { g.font = `900 ${sz}px ${FONT}`; sz -= 2; } while (g.measureText(s).width > max && sz > 16); g.lineWidth = Math.max(4, sz * 0.16); g.strokeStyle = stroke; g.strokeText(s, x, y); g.fillStyle = fill; g.fillText(s, x, y); };
    const what = f.food === 'hotdog' ? 'A HEALTHY HOT DOG' : 'A HEALTHY BURGER';
    if (f.done === 'won') { txt('GET OFF, IAN!', W / 2 - 10, 120, 110, '#39ff14'); txt(f.st >= SLAP_STAGE ? 'PUSHED HIM OFF! AND OVER HE GOES!' : 'PUSHED HIM OFF! GET BIGGER TO FLOOR HIM', W / 2 - 10, 250, 46, '#fff'); }
    else if (f.done === 'lost') { txt('BLEURGH!', W / 2 - 10, 120, 120, '#7cff6a'); txt(`FORCE-FED ${what}. EAT METER DOWN`, W / 2 - 10, 250, 44, '#fff'); }
    else {
      txt(`IAN'S SHOVING ${what} IN YOUR FACE!`, W / 2 - 10, 62, 40, '#ffd400');
      const pulse = 1 + 0.08 * Math.sin(f.t * 22) + f.tapFx * 0.06;
      g.save(); g.translate(W / 2 - 10, 146); g.scale(pulse, pulse); txt(vr ? 'PULL THE TRIGGERS!' : pc ? 'CLICK! CLICK! CLICK!' : 'TAP! TAP! TAP!', 0, 0, 92, '#fff', '#c2410c'); g.restore();
      // the tug of war: your bit (gold) pushing his bit (green) back
      const bx = 60, by = 214, bw = W - 150, bh = 62, k = Math.max(0, Math.min(1, f.p));
      g.fillStyle = '#2f7d1f'; roundRect(g, bx, by, bw, bh, 31); g.fill();
      if (k > 0.02) { const yg = g.createLinearGradient(bx, 0, bx + bw, 0); yg.addColorStop(0, '#ffd400'); yg.addColorStop(1, '#ff8a1a'); g.fillStyle = yg; roundRect(g, bx, by, Math.max(62, bw * k), bh, 31); g.fill(); }
      g.lineWidth = 6; g.strokeStyle = '#fff'; roundRect(g, bx, by, bw, bh, 31); g.stroke();
      g.font = `900 30px ${FONT}`; g.textAlign = 'left'; g.fillStyle = '#111'; g.fillText('😤 YOU', bx + 20, by + bh / 2 + 2); g.textAlign = 'right'; g.fillStyle = '#fff'; g.fillText('IAN 🥗', bx + bw - 20, by + bh / 2 + 2); g.textAlign = 'center';
      g.fillStyle = 'rgba(255,255,255,0.25)'; roundRect(g, bx, by + bh + 12, bw, 10, 5); g.fill(); g.fillStyle = '#ff5252'; roundRect(g, bx, by + bh + 12, bw * Math.max(0, 1 - f.t / FEED_MAX), 10, 5); g.fill();
      txt(f.st >= BARGE_STAGE ? 'YOU\'RE MASSIVE. HE\'S GOT NO CHANCE' : f.st >= SLAP_STAGE ? 'PUSH HIM OFF AND HE GOES FLYING' : 'TOO SMALL TO FLOOR HIM. BIGGER = STRONGER', W / 2 - 10, 336, 32, '#ffd9a0');
    }
    this.panelTex.needsUpdate = true;
  }

  // props follow Ian's hands (host: after his update; a joining player's game: each frame, from the host's word)
  placeProps() {
    const ian = this.ian || this.g.cast.find(c => c.id === 'ian'); if (!ian || ian.disposed || !ian.rag.mesh) { this.hideProps(); return; }
    const ph = this.host ? this.phase : this.remote ? this.remote.ph : 'cook', down = this.host ? ian.down : ian.netRag === 1;
    const cook = ph === 'cook' && !down, holding = !down && (ph === 'ask' || ph === 'insist' || ph === 'force' || ph === 'feedR' || (ph === 'feed' && !this.feed));
    this.spat.visible = cook; if (cook) { ian.rag.grip('lArmR', this.spat.position); this.spat.rotation.set(0.3, ian.rag.yaw, 0, 'YXZ'); }
    if (this.feed) return;      // (in the cut scene the food's placed by updateFeed)
    const o = this.food === 'hotdog' ? this.hotdog : this.burger, other = o === this.burger ? this.hotdog : this.burger; other.visible = false;
    o.visible = holding; if (holding) { ian.rag.grip('lArmR', o.position); o.position.y += 0.03; o.rotation.set(0, ian.rag.yaw, 0); o.scale.setScalar(1.15); }
  }
  hideProps() { for (const o of [this.burger, this.hotdog, this.spat]) if (o) o.visible = false; }
  onAte(item) { if (item && item.bbqGrill) this.stats.ate++; }

  // ---------------------------------------------------------------- the HUD and the receipt
  hudExtras(T) {
    const ko = this.stats.ko, st = this.g.G.stage, P = this.P;
    const goal = this.gaveUp ? { t: '🏆 IAN GAVE UP!', c: '#39ff14' } : st < SLAP_STAGE ? { t: '💪 STAGE 3 TO FIGHT IAN', c: '#ffb37a', pulse: this.phase === 'force' } : { t: `🥊 KO IAN ${ko}/${KOS_TO_WIN}`, c: '#39ff14' };
    const chips = [T(), goal];
    if (!P.flatMode) { const pl = this.pill(this.state()); if (pl) chips.splice(1, 0, { t: pl.replace(/^\S+ /, ''), c: '#ff6b6b', pulse: /FORC|RUN/.test(pl) }); }      // (a headset has no red bar at the top: it's on the wrist)
    return { chips };
  }
  hudLine() { return `Ian KO ${this.stats.ko}/${KOS_TO_WIN} · ${(this.pill(this.state()) || '').replace(/^\S+ /, '')}`; }
  // (host) someone's been force-fed: three times and that's the game. Five knock-downs and Ian gives up: that's the game too
  fedOne(id) { if (!this.host) return; const m = this.fedBy || (this.fedBy = new Map()), n = (m.get(id) || 0) + 1; m.set(id, n);
    if (n >= FEEDS_TO_LOSE && !this.over) { const who = id === 'me' || id === (this.g.net && this.g.net.id) ? null : ((this.g.net && this.g.net.players.get(id)) || {}).name;
      setTimeout(() => { if (this.disposed) return; this.g.showBanner('FORCE-FED THREE TIMES!', who ? `${String(who).toUpperCase()}'S HAD THEIR FIVE A DAY. GAME OVER` : 'IAN WINS. GAME OVER'); this.ian && this.ian.say('Three healthy meals! You\'re a NEW MAN, Ronnie!', 5); this.finish(false); }, 1600); } }
  finish(won) { if (this.over || !this.host) return; this.over = true; this.won = won; setTimeout(() => { if (!this.disposed && this.d.running) this.d.end(); }, 3200); }
  summary() {
    const s = this.stats;
    return [['RESULT', this.won ? 'IAN GAVE UP! YOU WIN' : this.won === false ? 'FORCE-FED. IAN WINS' : 'TIME UP'], ['IAN KNOCKED OVER', `${s.ko} / ${KOS_TO_WIN}`], ['FORCE-FED', s.fed], ['FOUGHT HIM OFF', s.fought], ['OFF THE GRILL', s.ate],
      [this.gaveUp ? 'Ian: "Proper burgers next year. PROPER ones."' : s.fed === 0 ? 'Ian: "You didn\'t touch my tofu. Not once."' : 'Ian: "See? HEALTHY. Lewy, he loved it."', '']];
  }
  end() { if (this.feed) this.endFeed(null); if (this.ian) { this.ian.approach = 0; } this.hideProps(); if (this.fx && this.fx.setCountdown) this.fx.setCountdown(null); }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    if (this.feed) this.closeFeed();
    removeEventListener('pointerdown', this.onDown, true); removeEventListener('keydown', this.onKey, true);
    const net = this.net; if (net) for (const k in this.handlers) { if (this.handlers[k]) net.on[k] = this.handlers[k]; else delete net.on[k]; }
    for (const o of [this.burger, this.hotdog, this.spat, this.veg]) if (o) this.g.scene.remove(o);
    if (this.panel) { if (this.panel.parent) this.panel.parent.remove(this.panel); this.panel.geometry.dispose(); this.panel.material.dispose(); this.panelTex.dispose(); }
    const ian = this.ian; if (ian && !ian.disposed) { delete ian.actUpdate; delete ian.actAfter; delete ian.slap; ian.approach = 0; ian.koMul = 1; }
    if (this.fx && this.fx.setCountdown) this.fx.setCountdown(null);
  }
}
const BBQ_SPOT_V = new THREE.Vector3(BBQ_SPOT.x, 1.0, BBQ_SPOT.z);
