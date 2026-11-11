// Game modes (design doc Parts 4–6), all playable in Ronnie's bedroom:
//   CLASSIC            — eat, grow, Tommy roasts you and lobs broccoli
//   SQUAD INTERVENTION — an Intervention Meter fills as you eat; when it's full
//                        a squad member tries their move. Every one fails.
//                        Ends with the receipt: "INTERVENTIONS SUCCESSFUL: 0"
//   VEGGIE WAR         — the squad attacks in waves of veg; swat, block, eat
//   CATCH & CHONK      — Harry "throws the food away" — catch it in your mouth
//   CHONK-OFF          — 60 seconds, eat as much as you can (1 player or 2 player pass-and-play)
// Modes are picked on the start screen or on the MODE BOARD on the bedroom wall
// (press a button with your hand, or tap it on a phone).
import * as THREE from 'three';
import { SquadMember, SQUAD } from './squad.js';
import { DATE_TABLE, DINER_TABLES } from './levels/restaurant.js';
import { canvasTex, fitText, roundRect, FONT } from './textures.js';
import { sfx, playTune, shout } from './audio.js';
import { Item } from './foods.js';
import { TURKEY_LEN } from './cutscenes.js';
import { pickVeg, pickJunk } from './config.js';

export const MODES = {
  classic:      { name: 'CLASSIC', desc: 'Eat, grow, dodge Tommy\'s broccoli.', time: 0 },
  intervention: { name: 'SQUAD INTERVENTION', desc: 'Everyone tries to stop you. Nobody can.', time: 240 },
  veggie:       { name: 'VEGGIE WAR', desc: 'The squad attacks with veg. Survive 2½ minutes.', time: 150 },
  catch:        { name: 'CATCH & EAT', desc: 'Catch Harry\'s throws in your mouth.', time: 70 },
  chonkoff:     { name: 'EAT-OFF', desc: '60 seconds. Eat everything.', time: 60 },
  chonkoff2:    { name: 'EAT-OFF 2P', desc: 'Pass-and-play: who eats more in 60s?', time: 60 },
  everyone:     { name: 'THE WHOLE SQUAD', desc: 'Everyone\'s here. Eat while they try to stop you.', time: 0, big: true },
  date:         { name: 'DATE NIGHT', desc: 'Eat when Chloe looks away. 3 catches and it\'s salad.', time: 180, place: 'restaurant' },
};
// which modes each place offers (also used by the start screen)
export function modesFor(place) {
  return Object.keys(MODES).filter(id => {
    const m = MODES[id];
    if (m.place && m.place !== place) return false;
    if (m.big && place === 'bedroom') return false;
    return true;
  });
}
const ATTACKS = {
  tommy:  [{ key: 'trip', icon: '🦶', title: 'TOMMY TRIPS YOU UP!', sub: 'DOWN FOR 5 SECONDS' }],
  noah:   [{ key: 'tackle', icon: '🏉', title: 'TACKLED BY NOAH!', sub: 'FLOORED!' }],
  aidan:  [{ key: 'beer', icon: '🍺', title: 'AIDAN FORCES YOU TO HAVE ONE MORE BEER!', sub: 'DIZZY!', sfx: 'clink' }],
  harry:  [{ key: 'dating', icon: '💘', title: 'HARRY DISTRACTS YOU WITH HIS DATING HISTORY', sub: 'STUCK LISTENING!', sfx: 'ting' }],
  ethan:  [{ key: 'pepsi', icon: '🥤', title: 'ETHAN HITS YOU WITH A PEPSI MAX ATTACK!', sub: 'FIZZED! NO EATING!', sfx: 'psst' }],
  connor: [{ key: 'jig', icon: '☘️', title: 'CONNOR GIVES YOU AN IRISH JIG ATTACK!', sub: 'DANCE, RONNIE!', sfx: 'boing' }],
  lewis:  [{ key: 'siu', icon: '⚽', title: 'LEWIS IS RONALDO! YOU SIUUU WITH HIM!', sub: 'SIUUUUUUU!', sfx: 'siu', style: 'portugal' }],
  ian:    [{ key: 'bbq', icon: '🌽', title: 'IAN FIRES UP THE HEALTHY BARBECUE!', sub: 'INCOMING GRILLED VEG!', sfx: 'sizzle' },
           { key: 'rod', icon: '🎣', title: 'IAN CATCHES YOU ON HIS FISHING ROD!', sub: 'HOOKED FOR 5 SECONDS' }],
  chloe:  [{ key: 'diet', icon: '🥗', title: 'CHLOE PUTS YOU ON A DIET!', sub: 'NO EATING!', sfx: 'ting' }],
  oliver: [{ key: 'flash', icon: '📸', title: 'OLIVER BLINDS YOU WITH HIS CAMERA FLASH!', sub: 'GONE VIRAL!' }],
  dylan:  [{ key: 'oasis', icon: '🎸', title: 'DYLAN PLAYS YOU OASIS SONGS', sub: 'STUCK LISTENING!', sfx: 'ting' }],
  alfie:  [{ key: 'nutmeg', icon: '⚽', title: 'ALFIE NUTMEGS YOU!', sub: 'SPUN ROUND!' }],
  ben:    [{ key: 'turkey', icon: '✈️', title: 'BEN TAKES YOU TO TURKEY!', sub: 'TO GET YOUR HAIRLINE DONE' }],
};
const LEGACY_KEY = { tommy: 'trip', noah: 'tackle' };
// props held in front of Ronnie's face
function datingPhone() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 480;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.19, 0.01), new THREE.MeshBasicMaterial({ color: 0x111111 })));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.17), new THREE.MeshBasicMaterial({ map: tex })); scr.position.z = 0.006; grp.add(scr);
  const names = ['STACEY, 27', 'JADE, 25', 'KELLY, 29', 'AMBER, 26', 'CHANTELLE, 28'], bios = ['"No time-wasters"', '"6ft only"', '"Must love dogs"', '"Here for a good time"', '"Swipe left if you know Harry"'];
  let last = -1;
  grp.userData.redraw = (t) => {
    const i = Math.floor(t / 1.1) % names.length, k = (t % 1.1) / 1.1; if (i === last && k < 0.75) return; last = i;
    const g = cv.getContext('2d');
    g.fillStyle = '#ff4f7b'; g.fillRect(0, 0, 256, 480);
    g.fillStyle = '#fff'; g.font = 'bold 26px Arial'; g.textAlign = 'center'; g.fillText('MATCHR', 128, 40);
    const x = k > 0.75 ? (k - 0.75) * 4 * -300 : 0;
    g.fillStyle = '#fff'; g.fillRect(24 + x, 60, 208, 300);
    g.fillStyle = ['#e8b48a', '#f2c9a0', '#c98a5a', '#ffd9b8', '#e0a070'][i]; g.beginPath(); g.arc(128 + x, 170, 60, 0, 7); g.fill();
    g.fillStyle = '#5a3a22'; g.beginPath(); g.arc(128 + x, 150, 62, Math.PI, 0); g.fill();
    g.fillStyle = '#111'; g.font = 'bold 24px Arial'; g.fillText(names[i], 128 + x, 280); g.font = 'italic 17px Arial'; g.fillText(bios[i], 128 + x, 310);
    g.fillStyle = '#fff'; g.font = 'bold 40px Arial'; g.fillText('✗', 70, 430); g.fillText('♥', 186, 430);
    g.font = 'bold 18px Arial'; g.fillText(k > 0.75 ? 'UNMATCHED' : 'IT\'S A MATCH?', 128, 470);
    tex.needsUpdate = true;
  };
  grp.userData.redraw(0);
  return grp;
}
function saladBowl() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide })));
  for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.025, 0), new THREE.MeshLambertMaterial({ color: [0x4caf3c, 0x7cb342, 0xe53935, 0x2e7d32][i % 4] })); m.position.set(Math.cos(i * 2.4) * 0.05 * (i % 3) / 2, -0.01, Math.sin(i * 2.4) * 0.05 * (i % 3) / 2); g.add(m); }
  return g;
}
function football() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const x = cv.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#111'; for (let i = 0; i < 8; i++) { x.beginPath(); x.arc((i * 37) % 128, (i * 23) % 64, 7, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(cv);
  return new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), new THREE.MeshLambertMaterial({ map: t }));
}
const TABLE_TALK = [
  'Don\'t look now, but Ronnie\'s on a DATE.',
  'Is that Chloe with him? Fair play. Brave girl.',
  'Ten quid says he eats off our table before the mains.',
  'He\'s looking at the dessert trolley again. He\'s looking at it like it\'s the love of his life.',
  'Should we say hello? No. No, let him have this.',
  'What\'s everyone having? I\'m having whatever Ronnie doesn\'t get to first.',
  'Did you see the bill last time he came here? They had to staple two receipts together.',
  'He\'s smiling at Chloe. He\'s smiling at the bread. He\'s smiling at the bread more.',
  'Shh! Chloe\'s looking over!',
  'I give it four minutes before he\'s on our side of the room.',
  'Pass the bread. Quick. Before you-know-who sees it.',
  'This place is lovely. Shame about who they let in. Joking, Ron! JOKING.',
  'Who\'s paying tonight? Not Ronnie. Ronnie\'s paying in instalments.',
  'Look at him trying to use the small fork. Bless him.',
  'Starters are tiny here. Ronnie\'s had nine.',
  'If Chloe goes to the toilet, he\'s going for the trolley. Guaranteed.',
];
const DATING = [
  'So there was this girl from Basildon. Three dates. Turned out she was my cousin\'s ex. And my other cousin\'s ex.',
  'Matched with someone, she said "you look different in person". I said "so do you". We never spoke again.',
  'Took a girl to Nando\'s. She ordered extra hot. I ordered lemon and herb. She left. Fair.',
  'One date, she brought her mum. Her MUM, Ronnie. Her mum liked me more, to be honest.',
  'I got ghosted by someone I hadn\'t even messaged yet. That\'s a skill, that is.',
  'Went on a date to the cinema. Fell asleep. Woke up, she\'d gone, and so had my popcorn.',
  'She said she was 5\'8". She was 5\'8" in heels. On a step. In a photo.',
  'Last one swiped right, then unmatched me while I was typing "hey". Mid-"hey", Ronnie.',
  'My longest relationship was eleven days. Twelve if you count the day she was telling everyone.',
  'Speed dating in Southend. Every single one of them asked if I knew you. Every single one.',
];
const VEG_OF = { connor: 'sprout', ethan: 'broccoli', ian: 'pepper', alfie: 'apple', ben: 'carrot', tommy: 'broccoli', chloe: 'broccoli', lewis: 'broccoli', harry: 'sprout', noah: 'carrot', dylan: 'celery', oliver: 'sprout', aidan: 'carrot', };
const _v = new THREE.Vector3();

export class Director {
  // g: { scene, room, physics, player, items, words, G, tommy, cast, showBanner, resetRonnie, onBite }
  constructor(g) {
    this.g = g;
    this.mode = 'classic';
    this.timeLeft = 0;
    this.running = false;
    this.bubbles = [];
    this.log = [];
    this.used = new Map();
    this.buildBoard();
    this.buildReceipt();
  }

  get cast() { return this.g.cast; }

  // ------------------------------------------------------------------ starting / ending
  start(id) {
    const g = this.g, m = MODES[id];
    if (!m) return;
    this.mode = id; this.running = true; this.used.clear();
    this.timeLeft = m.time;
    this.stats = { chonk: 0, veg: 0, swats: 0, popped: 0, roasted: 0, caught: 0, thrown: 0, attempts: 0, fails: [] };
    this.meter = 0; this.nextIntervener = 0; this.waveT = 2.5; this.spawned = 0;
    this.guilt = null;
    this.receipt.visible = false;
    this.bubbles.forEach(b => this.removeBubble(b)); this.bubbles = [];
    g.resetRonnie();
    // cast: Tommy always, plus the squad this mode needs
    for (const c of g.cast.slice(1)) c.dispose();
    g.cast.length = 1;
    const tommy = g.tommy;
    tommy.attacks = id === 'classic';
    tommy.active = true;
    let squad = [];
    const big = !!g.room.big, everyone = Object.keys(SQUAD);
    if (id === 'intervention') squad = big ? shuffle(everyone) : shuffle(everyone).slice(0, 4);
    else if (id === 'everyone') squad = shuffle(everyone);
    else if (id === 'date') squad = ['chloe', ...shuffle(everyone.filter(s => s !== 'chloe')).slice(0, 6 + Math.floor(Math.random() * 4))];   // the mates are out for dinner too
    else if (id === 'veggie') squad = shuffle(['chloe', 'lewis', 'harry', 'noah', 'dylan', 'oliver', 'connor', 'ethan', 'ian', 'alfie', 'ben']).slice(0, big ? 6 : 3);
    else if (id === 'catch') squad = ['harry'];
    else if (id === 'classic') squad = [];
    else squad = [];
    this.roster = squad;
    // spawn spots: the nearest free hang-out spots around Ronnie (not on top of him)
    const head = g.player.head;
    const spots = g.room.tommySpots.filter(s => Math.hypot(s.x - head.x, s.y - head.z) > 1.6)
      .sort((a, b) => Math.hypot(a.x - head.x, a.y - head.z) - Math.hypot(b.x - head.x, b.y - head.z));
    squad.forEach((sid, i) => {
      const s = spots[(i + 1) % spots.length];
      const c = new SquadMember(g.scene, g.room, g.physics, sid, [s.x, s.y, Math.atan2(head.x - s.x, head.z - s.y)], this);
      this.hook(c);
      g.cast.push(c);
    });
    const SHORT = { classic: 'EAT EVERYTHING', everyone: 'EVERYONE IS HERE', intervention: 'NOBODY CAN STOP YOU', veggie: 'SWAT THE VEG', catch: 'CATCH IT IN YOUR MOUTH', chonkoff: '60 SECONDS', chonkoff2: 'PLAYER ' + (this.player2 && this.player2.stage === 1 ? 2 : 1), date: 'DON\'T GET CAUGHT' };
    g.showBanner(m.name, SHORT[id] || 'EAT EVERYTHING');
    if (id === 'chonkoff2') { this.player2 = this.player2 && this.player2.stage === 1 ? { stage: 2, p1: this.player2.p1 } : { stage: 1 }; }
    else this.player2 = null;
    if (id === 'date') this.startDate();
    if (id === 'everyone') { this.nextChaos = 18; tommy.attacks = true; }
    tommy.say({
      everyone: 'The whole squad\'s out tonight, Ron. Everyone\'s watching what you eat. I\'m just trying to help.',
      date: 'Date night! I\'m over here on my own table. Behave, Ron. She\'s watching. Mostly.',
      intervention: 'Right, Ron. The whole squad\'s here. It\'s an intervention. I\'m just trying to help.',
      veggie: 'VEGGIE WAR. Everyone, positions. Aim for the mouth.',
      catch: 'Harry\'s going to throw the food AWAY from you. In theory.',
      chonkoff: 'Sixty seconds, Ron. Show me what you\'ve got. Actually, don\'t.',
      chonkoff2: this.player2 && this.player2.stage === 2 ? 'Player two! Beat that. Please don\'t.' : 'Eat-Off! Player one, sixty seconds. Go.',
      classic: 'Back to normal then. Normal for you.',
    }[id], 5);
    sfx('fanfare', null, 1);
  }

  hook(c) {
    c.onThrow = this.g.onThrow;
    c.onEvent = (name, who) => {
      if (name === 'acted' && this.mode === 'intervention' && this.current === who) this.current = null;
    };
    c.othersNear = (s) => this.cast.some(o => o !== c && Math.hypot(o.pos.x - s.x, o.pos.z - s.y) < 0.6);
  }

  end() {
    if (!this.running || this.mode === 'classic') return;
    this.running = false;
    const g = this.g, st = this.stats, m = MODES[this.mode];
    const lines = [];
    lines.push(['MODE', m.name]);
    lines.push(['EAT SCORE', Math.round(st.chonk)]);
    lines.push(['FINAL SIZE', g.stageName()]);
    if (this.mode === 'intervention') {
      lines.push(['INTERVENTIONS ATTEMPTED', st.attempts]);
      lines.push(['INTERVENTIONS SUCCESSFUL', 0]);
      for (const f of st.fails) lines.push([f, '']);
      lines.push(['Tommy: just tried to help.', '']);
    } else if (this.mode === 'veggie') {
      lines.push(['VEG SWATTED', st.swats]);
      lines.push(['VEG EATEN (VEG-O-METER)', st.veg]);
      lines.push([st.veg === 0 ? 'CLEAN SHEET! NOT ONE VEG.' : st.veg < 3 ? 'Barely touched a vegetable.' : 'Tommy: "We had him."', '']);
    } else if (this.mode === 'date') {
      lines.push(['TIMES BUSTED BY CHLOE', `${this.date.catches} / 3`]);
      lines.push([this.date.catches >= 3 ? 'Chloe ordered you a salad.' : 'Relationship status: still together, somehow.', '']);
      lines.push(['The bill is a scroll. It is still unrolling.', '']);
    } else if (this.mode === 'catch') {
      lines.push(['CATCHES', `${st.caught} / ${st.thrown}`]);
      lines.push(['Harry: "Terrible decision."', '']);
    } else if (this.mode.startsWith('chonkoff')) {
      const best = +(safeGet('rs_best_chonkoff') || 0);
      const score = Math.round(st.chonk);
      if (score > best) { safeSet('rs_best_chonkoff', score); lines.push(['NEW RECORD!', score]); }
      else lines.push(['BEST EVER', best]);
      if (this.mode === 'chonkoff2') {
        if (this.player2.stage === 1) { this.player2.p1 = score; lines.push(['PLAYER 1', score]); lines.push(['Pass to PLAYER 2, then press', '']); lines.push(['EAT-OFF 2P on the mode board', '']); }
        else {
          const p1 = this.player2.p1, p2 = score;
          lines.push(['PLAYER 1', p1]); lines.push(['PLAYER 2', p2]);
          lines.push([p1 === p2 ? 'IT\'S A DRAW. BOTH HUGE.' : (p1 > p2 ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!'), '']);
          this.player2 = null;
        }
      }
    }
    this.showReceipt(lines);
    g.tommy.say({
      intervention: 'Another intervention, another failure. I\'ll tell your mum you were good. I\'ll lie.',
      veggie: 'Well done, Ron. You ate the level. The WHOLE level.',
      catch: 'Harry\'s retiring. From throwing. And dating, hopefully.',
      date: 'Romance isn\'t dead, Ron. You ate it.',
      chonkoff: 'Time! ...the scales have left the building.',
      chonkoff2: 'Time! ...both of you are a disgrace. I\'m very proud.',
    }[this.mode], 5);
    sfx('fanfare', null, 1);
    // squad goes quiet
    for (const c of this.cast.slice(1)) c.active = false;
  }

  // ------------------------------------------------------------------ per frame
  update(dt, ctx) {
    const g = this.g;
    this.updateBoard(dt, ctx);
    this.updateBubbles(dt, ctx);
    if (this.receipt.visible) { this.receiptT -= dt; if (this.receiptT <= 0) this.receipt.visible = false; }
    if (!this.running) return;
    if (this.timeLeft > 0) {
      const before = Math.ceil(this.timeLeft);
      this.timeLeft -= dt;
      if (Math.ceil(this.timeLeft) !== before && this.timeLeft <= 5 && this.timeLeft > 0) sfx('pop', null, 0.6);
      if (this.timeLeft <= 0) { this.timeLeft = 0; this.end(); return; }
    }
    const idle = (c) => c.state === 'idle' && !c.down;
    switch (this.mode) {
      case 'date': this.updateDate(dt, ctx); break;
      case 'everyone': {
        this.nextChaos -= dt;
        if (this.nextChaos <= 0) {
          this.nextChaos = 16 + Math.random() * 12;
          const pick = this.pickAttacker(this.cast.slice(1).filter(c => idle(c) && c.distToPlayer < 9));
          if (pick && pick.c.intervene(pick.attack.key)) { this.markUsed(pick.c, pick.attack.key); sfx('trumpet', null, 0.6); }
        }
        break;
      }
      case 'intervention': {
        // the meter fills as Ronnie eats; when full, the next squad member has a go
        if (this.meter >= 1 && !this.current) {
          const pick = this.pickAttacker(this.cast.slice(1).filter(idle)), c = pick && pick.c;
          if (c && c.intervene(pick.attack.key)) {
            this.markUsed(c, pick.attack.key);
            this.nextIntervener++;
            this.meter = 0; this.current = c; this.currentT = 0;
            this.stats.attempts++;
            this.stats.fails.push(`${c.name}: ${c.failLine}`);
            sfx('trumpet', null, 0.6);
          }
        }
        if (this.current) { this.currentT += dt; if (this.currentT > 25) this.current = null; }
        break;
      }
      case 'veggie': {
        // waves: 1 attacker → 2 at once → everyone
        const elapsed = MODES.veggie.time - this.timeLeft;
        const wave = elapsed < 45 ? 1 : elapsed < 100 ? 2 : 3;
        this.waveT -= dt;
        if (this.waveT <= 0) {
          this.waveT = wave === 1 ? 3.6 : wave === 2 ? 3.2 : 2.6;
          const ready = shuffle(this.cast.filter(idle));
          const n = wave === 3 ? ready.length : wave;
          ready.slice(0, n).forEach((c, i) => setTimeout(() => {
            if (!idle(c) || !this.running) return;
            c.startThrow({ item: pickVeg(VEG_OF[c.id] || 'broccoli'), speed: c.id === 'harry' ? 3.8 : 3.0, windup: 0.75, line: Math.random() < 0.4 ? 'vegThrow' : null, spread: 0.05 });
          }, i * 350));
          if (elapsed > 44 && elapsed < 46.7 && !this.waveTwo) { this.waveTwo = true; g.showBanner('WAVE 2', 'TWO AT ONCE'); }
          if (elapsed > 99 && elapsed < 101.7 && !this.waveThree) { this.waveThree = true; g.showBanner('FINAL WAVE', 'EVERYONE!'); }
        }
        break;
      }
      case 'catch': {
        const harry = this.cast.find(c => c.id === 'harry');
        this.waveT -= dt;
        if (harry && idle(harry) && this.waveT <= 0 && this.stats.thrown < 20) {
          this.waveT = 2.6;
          this.stats.thrown++;
          harry.startThrow({ item: pickJunk(), speed: 3.0, windup: 0.6, food: true, line: this.stats.thrown === 1 ? 'intervene' : null });
        }
        break;
      }
    }
  }

  // ------------------------------------------------------------------ events from the game
  onAte(item, chonk) {
    if (!this.running) return;
    if (this.mode === 'date') this.dateEat();
    this.stats.chonk += Math.max(0, chonk);
    if (this.mode === 'intervention') this.meter = Math.min(1, this.meter + Math.max(0, chonk) / 30);
    for (const c of this.cast) c.onRonnieAte && c.onRonnieAte(item);
  }
  // the whole item has gone (last bite / drink finished)
  onFinished(item) {
    if (this.guilt && !item.def.veg) {
      const who = this.guilt; this.guilt = null;
      this.g.addChonk((item.def.chonk || 10) * 0.5);
      this.stats.chonk += (item.def.chonk || 10) * 0.5;
      this.g.words.show('GUILT BONUS x1.5', this.g.player.head.clone().addScaledVector(this.g.player.fwd, 0.8).add({ x: 0, y: 0.15, z: 0 }), '#B57BFF', 0.13);
      sfx('sadviolin', null, 0.8);
      setTimeout(() => who.say('guilt', 4), 500);
    }
  }
  onVegEaten() { if (this.running) this.stats.veg++; }
  onSwat() { if (this.running) this.stats.swats++; }
  onCaught() { if (this.running) this.stats.caught++; }
  get intervening() { return this.mode === 'intervention' && this.running; }

  // ------------------------------------------------------------------ squad API
  nameNextFood(who) { this.guilt = who; }
  placeOnStation(type, who) {
    const st = this.g.room.spawns, free = st.slice(0, 5).find(p => this.g.items.items.every(it => it.pos.distanceToSquared(p) > 0.12 * 0.12)) || st[0];
    const it = this.g.items.spawn(type, free);
    it.temp = false; it.placedAt = performance.now(); it.placedBy = who;
    sfx('pop', free, 0.5);
  }
  // Each person's signature move on Ronnie: a banner saying exactly what happened,
  // and a short stun (dizzy, frozen, thrown, hooked...).
  // Each person's signature attack on Ronnie: an animated card saying exactly what
  // happened, props and effects, and a short stun (dizzy, frozen, thrown, hooked...).
  // 1) the pop-up: says what's about to happen (shown ~3.5s before the attack lands)
  announce(who, key) {
    const g = this.g, fx = g.fx;
    key = LEGACY_KEY[key] || key || (ATTACKS[who.id] || [])[0]?.key;
    const A = Object.values(ATTACKS).flat().find(a => a.key === key); if (!A) return;
    if (fx) fx.showCard({ name: who.name || who.id, title: A.title, sub: A.sub, icon: A.icon, style: A.style, color: A.style === 'portugal' ? '#da291c' : (SQUAD[who.id] && SQUAD[who.id].color) || '#1f4fbf' });
    else g.showBanner(A.title, A.sub);
    sfx('trumpet', null, 0.7);
  }
  // 2) the attack itself: the pop-up goes, and the effects and animation play
  stun(who, key) {
    const g = this.g, P = g.player, G = g.G, fx = g.fx;
    key = LEGACY_KEY[key] || key || (ATTACKS[who.id] || [])[0]?.key;
    const A = Object.values(ATTACKS).flat().find(a => a.key === key); if (!A) return;
    if (fx) fx.hideCard();
    if (P.knock || P.throwAnim || (fx && fx.inCutscene)) return;
    sfx(A.sfx || 'thud', null, 1);
    const tint = (color, t, op = 0.3) => { G.fxTint = color; G.fxTintT = t; G.fxTintOp = op; };
    const away = { x: P.head.x - who.pos.x, z: P.head.z - who.pos.z };
    const P3 = (x, y, z) => new THREE.Vector3(x, y, z);
    switch (key) {
      case 'trip': P.dropAll(); P.knockDown(away, 5); fx.cutscene('trip', 2.6); break;
      case 'tackle': P.dropAll(); P.knockDown(away, 2); fx.cutscene('tackle', 1.9); break;
      case 'beer': {          // a pint appears at your lips and gets tipped down your throat
        P.dropAll();
        const pint = new Item('pint').obj; pint.scale.setScalar(1.0);
        fx.camProp(pint, 1.8, [0, -0.12, -0.3], (t, o) => { o.rotation.x = Math.min(1.9, t * 2.2); o.position.y = -0.1 + Math.min(0.06, t * 0.08); });
        setTimeout(() => { sfx('gulp', null, 1); P.effect('dizzy', 7); tint(0x8a5a1a, 7, 0.12); fx.cutscene('beer', 6.5); g.words.show('HIC!', P.head.clone().addScaledVector(P.fwd, 0.6).add(P3(0.15, 0.1, 0)), '#ffd400', 0.09, 1.2); }, 1700);
        break;
      }
      case 'dating': {        // Harry's phone shoved in your face, swiping through his matches
        P.effect('frozen', 5.5); this.storyTime(who);
        fx.cutscene('dating', 5.5);
        break;
      }
      case 'pepsi': {         // shake, shake, FSSSHHH: a fizz spray right in the face
        P.effect('noEat', 5); P.effect('slow', 5);
        setTimeout(() => {
          sfx('fizz', null, 1); for (let i = 0; i < 10; i++) setTimeout(() => fx.spray(who.rag.grip('lArmR', P3(0, 0, 0)), P.head, i % 2 ? 0x2a1608 : 0x9ad4ff, 8), i * 90);
          setTimeout(() => { fx.cutscene('pepsi', 4.2); sfx('fizz', null, 0.8); }, 450);      // ...and then the whole screen fills up with it
        }, 300);
        break;
      }
      case 'jig': P.effect('jig', 6.5); who.jig = 6.5; playTune('jig', 6.5); fx.cutscene('jig', 6.5); shout('Come on Ronnie, give us a jig!', { rate: 1.1, pitch: 1.1, volume: 0.5 }); break;
      case 'siu': {           // Lewis does the Ronaldo celebration and you do it with him
        P.dropAll();
        setTimeout(() => { P.effect('siu', 3.2); }, 250);
        setTimeout(() => { fx.cutscene('siu', 2.6); shout('Siuuuuuuu!', { rate: 0.55, pitch: 1.3, volume: 0.9 }); }, 900);
        break;
      }
      case 'rod': P.effect('tether', 5, { r: 0.45 }); who.reeling = 5; sfx('whoosh', null, 0.8); fx.cutscene('rod', 5); break;
      case 'bbq': break;      // Ian sets up the barbecue and throws the food himself (squad.js)
      case 'diet': {          // a sad salad held up in front of you
        P.effect('noEat', 6); tint(0x6aaa3a, 6, 0.1);
        fx.cutscene('diet', 4.5);
        break;
      }
      case 'flash': {         // FLASH: blinding white, and a shutter noise
        sfx('shutter', null, 1);
        const at = who.rag.grip('lArmR', P3(0, 0, 0)); fx.flash(at);
        fx.cutscene('flash', 3.2); setTimeout(() => { P.effect('slow', 3); }, 120);
        break;
      }
      case 'oasis': P.effect('frozen', 6.5); who.strumming = 6.5; playTune('oasis', 6.5); fx.cutscene('oasis', 6.5); break;
      case 'nutmeg': {        // the ball rolls through your legs; you spin round to look
        sfx('whistle', null, 0.8);
        const ball = football(), from = who.rag.grip('lArmR', P3(0, 0, 0)), end = P3(P.head.x + away.x * 0.6, 0.11, P.head.z + away.z * 0.6);
        from.y = 0.11; ball.position.copy(from);
        fx.worldProp(ball, 1.2, (t, o) => { const u = Math.min(1, t / 0.9); o.position.lerpVectors(from, end, u); o.rotation.x += 0.4; });
        setTimeout(() => { P.effect('spin', 1.4, { turns: 3, speed: 16 }); P.effect('dizzy', 6, { amp: 2.8 }); fx.dizzyStars(6); tint(0xffd400, 6, 0.08); fx.cutscene('nutmeg', 3.5); g.words.show('WHOA-OA-OA!', P.head.clone().addScaledVector(P.fwd, 0.7), '#ffd400', 0.1, 1.5); }, 450);
        break;
      }
      case 'turkey': P.effect('frozen', TURKEY_LEN + 0.4); P.dropAll(); sfx('jet', null, 1); fx.cutscene('turkey', TURKEY_LEN); break;
    }
  }
  // which attack does this person do next? (not one they've done, until everyone's had a go)
  nextAttack(c) {
    const list = ATTACKS[c.id] || [];
    const used = this.used.get(c.id) || new Set();
    return list.find(a => !used.has(a.key)) || null;
  }
  markUsed(c, key) { if (!this.used.has(c.id)) this.used.set(c.id, new Set()); this.used.get(c.id).add(key); }
  // pick someone who still has an attack left; once nobody has, everyone's available again
  pickAttacker(pool) {
    let ready = pool.filter(c => this.nextAttack(c));
    if (!ready.length && pool.length) { this.used.clear(); ready = pool.filter(c => this.nextAttack(c)); }
    if (!ready.length) return null;
    const c = ready[Math.floor(Math.random() * ready.length)];
    return { c, attack: this.nextAttack(c) };
  }
  // Harry's dating history, one disaster at a time, while Ronnie stands there
  storyTime(harry) {
    const s = shuffle(DATING.slice()).slice(0, 3);
    s.forEach((line, i) => setTimeout(() => harry.say(line, 5), i * 1700));
  }

  tackled(noah) {
    const g = this.g;
    const big = g.G.stage >= 2;
    // Ronnie goes down every time (even Big Ronnie: Noah's a prop forward)
    this.stun(noah, 'tackle');
    if (big) { g.words.show('BOING!', noah.pos.clone().add({ x: 0, y: 1.2, z: 0 }), '#ffd400', 0.25); sfx('boing', noah.pos, 1); }
    setTimeout(() => noah.say('tackled', 4), 600);
  }
  clinging(dylan, on) {
    if (on) { this.g.words.show('SHAKE HIM OFF!', this.g.player.head.clone().addScaledVector(this.g.player.fwd, 0.8), '#FF6D00', 0.16, 2); }
    else this.g.words.show('SHAKEN OFF!', dylan.pos.clone().add({ x: 0, y: 1, z: 0 }), '#FF6D00', 0.18);
  }

  // ------------------------------------------------------------------ DATE NIGHT
  // Chloe sits opposite. When she looks at you, sit still and smile; when she
  // looks away (phone, waiter, a weird moment) grab food from other tables and
  // the dessert trolley. Eat (or flail about) while she's looking: BUSTED.
  startDate() {
    const chloe = this.cast.find(c => c.id === 'chloe');
    this.date = { chloe, look: true, t: 4, warned: false, catches: 0, danced: false, grace: 1.5, cool: 0 };
    if (!chloe) return;
    chloe.active = false; chloe.seated = true;
    chloe.rag.placeAt(DATE_TABLE.x, DATE_TABLE.z - 0.75, 0);
    setTimeout(() => chloe.say('Isn\'t this nice, babe? Just us. And no snacking. Promise?', 5), 1500);
    this.seatDiners();
  }
  // Everyone else is out for dinner as well: random groups of 2-4 at random tables,
  // sat down, chatting to each other (mostly about Ronnie being on a date).
  seatDiners() {
    const diners = shuffle(this.cast.filter(c => c.id !== 'chloe' && c !== this.g.tommy));
    const tables = shuffle(DINER_TABLES.map((t, i) => i));
    this.dinerGroups = [];
    let ti = 0;
    while (diners.length && ti < tables.length) {
      const n = Math.min(diners.length, diners.length <= 4 ? diners.length : 2 + Math.floor(Math.random() * 2));
      const [tx, tz] = DINER_TABLES[tables[ti++]];
      const seats = shuffle([0, 1, 2, 3]).slice(0, n), group = [];
      for (const si of seats) {
        const c = diners.shift(), a = si / 4 * Math.PI * 2 + 0.4, yaw = a + Math.PI;
        c.seat = { x: tx + Math.sin(a) * 0.85, z: tz + Math.cos(a) * 0.85, yaw };
        c.active = false; c.seated = true; c.faceYaw = yaw; c.lookOverride = 0; c.state = 'idle'; c.quietT = 0;
        c.rag.placeAt(c.seat.x, c.seat.z, yaw);
        group.push(c);
      }
      this.dinerGroups.push(group);
    }
    this.chatT = 2;
  }
  updateDiners(dt) {
    if (!this.dinerGroups) return;
    for (const grp of this.dinerGroups) for (const c of grp) {
      if (c.lookT > 0 && (c.lookT -= dt) <= 0) c.lookOverride = 0;
      // knocked off their chair? back in it once they're up
      if (c.state === 'idle' && c.rag.mode === 'anim' && Math.hypot(c.pos.x - c.seat.x, c.pos.z - c.seat.z) > 0.25) { c.seated = true; c.faceYaw = c.seat.yaw; c.rag.placeAt(c.seat.x, c.seat.z, c.seat.yaw); }
    }
    if ((this.chatT -= dt) > 0) return;
    this.chatT = 2.5 + Math.random() * 3;
    const grp = this.dinerGroups[Math.floor(Math.random() * this.dinerGroups.length)].filter(c => !c.down && c.speakT <= 0);
    if (grp.length < 2) return;
    const who = grp[Math.floor(Math.random() * grp.length)];
    const own = who.def.banks.chatter || [];
    const line = Math.random() < 0.55 ? TABLE_TALK[Math.floor(Math.random() * TABLE_TALK.length)] : own[Math.floor(Math.random() * own.length)];
    if (!line) return;
    who.say(line.replace(/Ronnie, |, Ronnie|, Ron\b/g, ''), 1);
    // the others at the table turn their heads to the one talking
    for (const o of grp) if (o !== who) {
      const to = Math.atan2(who.pos.x - o.pos.x, who.pos.z - o.pos.z);
      let rel = to - o.rag.yaw; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      o.lookOverride = Math.max(-0.8, Math.min(0.8, rel)); o.lookT = 4;
    }
  }
  updateDate(dt, ctx) {
    this.updateDiners(dt);
    const d = this.date, c = d.chloe, g = this.g;
    if (!c || c.down) return;
    d.t -= dt; d.grace -= dt; d.cool -= dt;
    if (d.dancing) {
      c.dancing = true;
      if (d.t <= 0) { d.dancing = false; c.dancing = false; c.seated = true; c.rag.placeAt(DATE_TABLE.x, DATE_TABLE.z - 0.75, 0); d.look = true; d.t = 4; d.grace = 1; c.lookOverride = null; }
      return;
    }
    if (d.look) {
      c.lookOverride = null;
      if (!d.danced && this.timeLeft < 100) {     // the weird moment: a victory dance, for no reason
        d.danced = true; d.dancing = true; d.look = false; d.t = 6; c.seated = false;
        c.rag.placeAt(DATE_TABLE.x + 1.1, DATE_TABLE.z - 0.75, -Math.PI / 2);
        c.say('Victory dance! For no reason! Don\'t look at me, babe!', 5);
        g.showBanner('CHLOE IS DANCING', '6 SECONDS: EAT EVERYTHING');
        return;
      }
      // flailing about while she's watching gives you away (VR)
      if (d.grace <= 0 && g.player.hands.some(h => h.tracked && h.speed > 1.6)) this.busted();
      if (d.t <= 0) {
        d.look = false; d.warned = false; d.t = 2.8 + Math.random() * 2.7;
        c.lookOverride = Math.random() < 0.5 ? 1.25 : -1.25;
        c.say(['Ooh, is that the waiter?', 'Just checking my phone, babe.', '...anyway.', 'Is that a pigeon? Inside?', 'That painting looks like a sausage roll.'][Math.floor(Math.random() * 5)], 2);
      }
    } else {
      if (!d.warned && d.t < 0.6) { d.warned = true; sfx('ting', c.headPos(_v), 1); g.words.show('!', c.headPos(_v).add({ x: 0, y: 0.35, z: 0 }), '#B57BFF', 0.25, 0.6); }
      if (d.t <= 0) { d.look = true; d.t = 2.5 + Math.random() * 3; d.grace = 0.5; c.lookOverride = null; }
    }
    this.g.G.wristDirty = true;
  }
  dateEat() { const d = this.date; if (d && d.look && !d.dancing && d.grace <= 0) this.busted(); }
  busted() {
    const d = this.date, g = this.g;
    if (d.cool > 0) return;
    d.cool = 2.5; d.catches++;
    sfx('boing', null, 0.8);
    g.words.show('BUSTED!', g.player.head.clone().addScaledVector(g.player.fwd, 0.8), '#B57BFF', 0.2, 1.4);
    d.chloe.say(['RONNIE.', 'Ronnie. Put. It. Down.', 'I SAW that, babe.'][Math.min(2, d.catches - 1)], 5);
    if (d.catches >= 3) { d.chloe.say('That\'s it. I\'ve ordered you a salad.', 6); setTimeout(() => this.end(), 1800); }
  }

  // ------------------------------------------------------------------ roast bubbles (unused for now)
  spawnBubble(pos, word, who) {
    const grp = new THREE.Group();
    const ball = new THREE.Mesh(BUBBLE_GEO, BUBBLE_MAT);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleWord(word), transparent: true, depthWrite: false }));
    label.scale.set(0.2, 0.07, 1);
    grp.add(ball, label);
    grp.position.copy(pos);
    this.g.scene.add(grp);
    this.bubbles.push({ grp, word, who, t: 0, phase: Math.random() * 6, vel: new THREE.Vector3() });
    sfx('pop', pos, 0.25);
  }
  removeBubble(b) { this.g.scene.remove(b.grp); b.grp.children[1].material.dispose(); }
  updateBubbles(dt, ctx) {
    const g = this.g, p = g.player;
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.t += dt;
      // drift toward Ronnie's face, wobbling
      _v.copy(p.head).sub(b.grp.position); const d = _v.length(); _v.normalize();
      b.vel.lerp(_v.multiplyScalar(0.55), Math.min(1, dt * 1.5));
      b.grp.position.addScaledVector(b.vel, dt);
      b.grp.position.y += Math.sin(b.t * 3 + b.phase) * 0.004;
      const s = 1 + Math.sin(b.t * 5 + b.phase) * 0.04; b.grp.children[0].scale.set(s, 1 / s, s);
      let popped = false;
      for (const pt of g.popPoints()) if (pt.distanceTo(b.grp.position) < 0.13 * Math.max(1, p.scale)) { popped = true; break; }
      if (!popped) for (const it of g.items.items) if (!it.heldBy && it.vel.lengthSq() > 1 && it.pos.distanceTo(b.grp.position) < 0.14) { popped = true; break; }
      if (popped || b.tapped) {
        this.stats && this.running && this.stats.popped++;
        g.words.show('POP!', b.grp.position.clone(), '#FF8FC7', 0.13, 0.7);
        sfx('pop', b.grp.position, 0.9);
        this.removeBubble(b); this.bubbles.splice(i, 1); continue;
      }
      if (d < 0.2 * p.scale || b.t > 20) {    // it got you: the roast lands
        if (d < 0.2 * p.scale) {
          this.stats && this.running && this.stats.roasted++;
          g.words.show(b.word, p.head.clone().addScaledVector(p.fwd, 0.6), '#FF8FC7', 0.14, 1.2);
          sfx('ting', null, 0.6);
          if (b.who && Math.random() < 0.4) b.who.say('chatter', 2);
        }
        this.removeBubble(b); this.bubbles.splice(i, 1);
      }
    }
  }
  tapBubble(ray) {
    for (const b of this.bubbles) if (ray.distanceSqToPoint(b.grp.position) < 0.12 * 0.12) { b.tapped = true; return true; }
    return false;
  }

  // ------------------------------------------------------------------ the mode board (on the front wall)
  buildBoard() {
    const g = this.g, grp = new THREE.Group();
    const nBtn = modesFor(g.room.placeId || 'bedroom').length, W = 0.95, H = 0.45 + nBtn * 0.125;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshLambertMaterial({ map: canvasTex(512, 620, (c, w, h) => {
      c.fillStyle = '#1b2a1b'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#8a6a3a'; c.lineWidth = 22; c.strokeRect(11, 11, w - 22, h - 22);
      fitText(c, 'GAME MODES', 30, 26, w - 60, 60, 52, { color: '#ffd400' });
      fitText(c, 'touch a button to play', 30, 78, w - 60, 30, 22, { color: '#cfe8cf' });
    }) }));
    grp.add(back);
    this.buttons = modesFor(g.room.placeId || 'bedroom').map((id, i) => {
      const tex = canvasTex(512, 96, () => {});
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.105, 0.03), [0, 0, 0, 0, new THREE.MeshBasicMaterial({ map: tex }), 0].map(m => m || new THREE.MeshLambertMaterial({ color: 0x333333 })));
      mesh.position.set(0, H / 2 - 0.25 - i * 0.125, 0.02);
      grp.add(mesh);
      const btn = { id, mesh, tex, pressedT: 0 };
      this.drawButton(btn, false);
      return btn;
    });
    // front wall, behind where you start, between the posters
    const bp = g.room.board || { x: 0.17, y: 1.38, z: g.room.bounds.z1 - 0.012, ry: Math.PI };
    grp.position.set(bp.x, bp.y, bp.z);
    grp.rotation.y = bp.ry ?? Math.PI;
    g.scene.add(grp);
    this.board = grp;
    this.boardCool = 0;
  }
  drawButton(btn, active) {
    const c = btn.tex.image.getContext('2d'), w = 512, h = 96;
    c.clearRect(0, 0, w, h);
    c.fillStyle = active ? '#39ff14' : btn.id === this.mode && this.running ? '#ffd400' : '#f5f0e6';
    roundRect(c, 4, 4, w - 8, h - 8, 18); c.fill();
    fitText(c, MODES[btn.id].name, 18, 6, w - 36, 52, 40, { color: '#111' });
    fitText(c, MODES[btn.id].desc, 18, 56, w - 36, 34, 20, { color: '#444', font: 'Arial' });
    btn.tex.needsUpdate = true;
  }
  updateBoard(dt, ctx) {
    this.boardCool -= dt;
    for (const b of this.buttons) if (b.pressedT > 0) { b.pressedT -= dt; if (b.pressedT <= 0) this.drawButton(b, false); }
    if (this.boardCool > 0) return;
    // VR: press a button with your hand / finger
    for (const pt of this.g.popPoints(true)) {
      for (const b of this.buttons) {
        b.mesh.getWorldPosition(_v);
        const dz = Math.abs(pt.z - _v.z), dx = Math.abs(pt.x - _v.x), dy = Math.abs(pt.y - _v.y);
        if (dz < 0.07 && dx < 0.4 && dy < 0.05) { this.pressButton(b); return; }
      }
    }
  }
  pressButton(b) {
    this.boardCool = 1.5;
    b.pressedT = 0.6; this.drawButton(b, true);
    sfx('pop', null, 1);
    this.start(b.id);
    for (const o of this.buttons) if (o !== b) this.drawButton(o, false);
  }
  tapBoard(ray) {
    for (const b of this.buttons) {
      const hit = ray.intersectBox(new THREE.Box3().setFromObject(b.mesh), _v);
      if (hit) { this.pressButton(b); return true; }
    }
    return false;
  }

  // ------------------------------------------------------------------ receipt
  buildReceipt() {
    this.rc = document.createElement('canvas'); this.rc.width = 512; this.rc.height = 900;
    this.rtex = new THREE.CanvasTexture(this.rc); this.rtex.colorSpace = THREE.SRGBColorSpace;
    this.receipt = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.88), new THREE.MeshBasicMaterial({ map: this.rtex, transparent: true }));
    this.receipt.visible = false;
    this.g.scene.add(this.receipt);
  }
  showReceipt(lines) {
    const c = this.rc.getContext('2d'), w = 512, h = 900;
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#fbfaf5'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ddd'; for (let x = 0; x < w; x += 24) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 12, h - 14); c.lineTo(x + 24, h); c.fill(); }
    c.fillStyle = '#111'; c.textAlign = 'center';
    c.font = `900 40px ${FONT}`; c.fillText('RONNIE SIMULATOR', w / 2, 60);
    c.font = '20px monospace'; c.fillText('*** OFFICIAL RECEIPT ***', w / 2, 92);
    c.fillText('------------------------------------', w / 2, 118);
    let y = 150;
    c.textAlign = 'left';
    for (const [k, v] of lines) {
      if (y > h - 120) break;
      if (v === '') { fitText(c, k, 24, y - 18, w - 48, 44, 20, { color: '#333', font: 'monospace', align: 'left' }); y += 44; continue; }
      c.font = 'bold 21px monospace'; c.fillStyle = '#111'; c.fillText(String(k).slice(0, 30), 24, y);
      c.textAlign = 'right'; c.fillText(String(v), w - 24, y); c.textAlign = 'left';
      y += 34;
    }
    c.textAlign = 'center'; c.font = '20px monospace'; c.fillStyle = '#111';
    c.fillText('------------------------------------', w / 2, h - 96);
    c.fillText('Thank you for eating with us.', w / 2, h - 66);
    c.fillText('Play again on the MODE BOARD.', w / 2, h - 40);
    this.rtex.needsUpdate = true;
    // hold it up in front of Ronnie
    const p = this.g.player;
    this.receipt.position.copy(p.head).addScaledVector(_v.set(p.fwd.x, 0, p.fwd.z).normalize(), 1.1 * p.scale);
    this.receipt.position.y = p.head.y - 0.12 * p.scale;
    this.receipt.scale.setScalar(0.8 * p.scale);
    this.receipt.lookAt(p.head.x, this.receipt.position.y, p.head.z);
    this.receipt.visible = true;
    this.receiptT = 25;
  }

  hud() {
    if (!this.running || this.mode === 'classic') return null;
    const t = this.timeLeft, mm = Math.floor(t / 60), ss = String(Math.floor(t % 60)).padStart(2, '0');
    const name = MODES[this.mode].name;
    let extra = '';
    if (this.mode === 'intervention') extra = `Meter ${Math.round(this.meter * 100)}%`;
    else if (this.mode === 'veggie') extra = `Swats ${this.stats.swats} · Veg ${this.stats.veg}`;
    else if (this.mode === 'catch') extra = `Caught ${this.stats.caught}/${this.stats.thrown}`;
    else if (this.mode === 'date') extra = `Busted ${this.date.catches}/3 · ${this.date.look ? 'SHE\'S LOOKING!' : 'EAT NOW!'}`;
    else if (this.mode === 'everyone') return `THE WHOLE SQUAD · Eat ${Math.round(this.stats.chonk)}`;
    else extra = `Eat ${Math.round(this.stats.chonk)}`;
    return `${name} ${mm}:${ss} · ${extra}`;
  }
}

const BUBBLE_GEO = new THREE.SphereGeometry(0.1, 20, 14);
const BUBBLE_MAT = new THREE.MeshPhongMaterial({ color: 0xffc8f0, transparent: true, opacity: 0.35, shininess: 120, specular: 0xffffff, depthWrite: false });
const wordTexCache = new Map();
function bubbleWord(word) {
  if (!wordTexCache.has(word)) wordTexCache.set(word, canvasTex(256, 96, (c, w, h) => {
    c.font = `900 56px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 10; c.strokeStyle = '#7a1f5a'; c.strokeText(word, w / 2, h / 2); c.fillStyle = '#fff'; c.fillText(word, w / 2, h / 2);
  }, { mips: false }));
  const t = wordTexCache.get(word);
  return t;
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
