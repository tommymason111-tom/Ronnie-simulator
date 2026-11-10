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
import { canvasTex, fitText, roundRect, FONT } from './textures.js';
import { sfx } from './audio.js';

export const MODES = {
  classic:      { name: 'CLASSIC', desc: 'Eat, grow, dodge Tommy\'s broccoli.', time: 0 },
  intervention: { name: 'SQUAD INTERVENTION', desc: 'Everyone tries to stop you. Nobody can.', time: 240 },
  veggie:       { name: 'VEGGIE WAR', desc: 'The squad attacks with veg. Survive 2½ minutes.', time: 150 },
  catch:        { name: 'CATCH & CHONK', desc: 'Catch Harry\'s throws in your mouth.', time: 70 },
  chonkoff:     { name: 'CHONK-OFF', desc: '60 seconds. Eat everything.', time: 60 },
  chonkoff2:    { name: 'CHONK-OFF 2P', desc: 'Pass-and-play: who eats more in 60s?', time: 60 },
};
const BOARD_ORDER = ['classic', 'intervention', 'veggie', 'catch', 'chonkoff', 'chonkoff2'];
const VEG_OF = { tommy: 'broccoli', chloe: 'broccoli', lewis: 'broccoli', harry: 'sprout', noah: 'carrot', dylan: 'celery', oliver: 'sprout', aidan: 'carrot', };
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
    this.buildBoard();
    this.buildReceipt();
  }

  get cast() { return this.g.cast; }

  // ------------------------------------------------------------------ starting / ending
  start(id) {
    const g = this.g, m = MODES[id];
    if (!m) return;
    this.mode = id; this.running = true;
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
    if (id === 'intervention') squad = shuffle(Object.keys(SQUAD)).slice(0, 4);
    else if (id === 'veggie') squad = shuffle(['chloe', 'lewis', 'harry', 'noah', 'dylan', 'oliver']).slice(0, 3);
    else if (id === 'catch') squad = ['harry'];
    else if (id === 'classic') squad = [];
    else squad = [];
    this.roster = squad;
    const spots = g.room.tommySpots;
    squad.forEach((sid, i) => {
      const s = spots[(i + 1) % spots.length];
      const c = new SquadMember(g.scene, g.room, g.physics, sid, [s.x, s.y, Math.atan2(-s.x, -s.y)], this);
      this.hook(c);
      g.cast.push(c);
    });
    g.showBanner(m.name, id === 'classic' ? 'EAT EVERYTHING' : m.desc.toUpperCase().replace(/\.$/, ''));
    if (id === 'chonkoff2') { this.player2 = this.player2 && this.player2.stage === 1 ? { stage: 2, p1: this.player2.p1 } : { stage: 1 }; }
    else this.player2 = null;
    tommy.say({
      intervention: 'Right, Ron. The whole squad\'s here. It\'s an intervention. I\'m just trying to help.',
      veggie: 'VEGGIE WAR. Everyone, positions. Aim for the mouth.',
      catch: 'Harry\'s going to throw the food AWAY from you. In theory.',
      chonkoff: 'Sixty seconds, Ron. Show me what you\'ve got. Actually, don\'t.',
      chonkoff2: this.player2 && this.player2.stage === 2 ? 'Player two! Beat that. Please don\'t.' : 'Chonk-Off! Player one, sixty seconds. Go.',
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
    lines.push(['CHONK EATEN', Math.round(st.chonk)]);
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
    } else if (this.mode === 'catch') {
      lines.push(['CATCHES', `${st.caught} / ${st.thrown}`]);
      lines.push(['Harry: "Terrible decision."', '']);
    } else if (this.mode.startsWith('chonkoff')) {
      const best = +(safeGet('rs_best_chonkoff') || 0);
      const score = Math.round(st.chonk);
      if (score > best) { safeSet('rs_best_chonkoff', score); lines.push(['NEW RECORD!', score]); }
      else lines.push(['BEST EVER', best]);
      if (this.mode === 'chonkoff2') {
        if (this.player2.stage === 1) { this.player2.p1 = score; lines.push(['PLAYER 1', score]); lines.push(['Pass to PLAYER 2, then press', '']); lines.push(['CHONK-OFF 2P on the mode board', '']); }
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
      case 'intervention': {
        // the meter fills as Ronnie eats; when full, the next squad member has a go
        if (this.meter >= 1 && !this.current) {
          const c = this.cast.slice(1)[this.nextIntervener % (this.cast.length - 1)];
          if (c && idle(c) && c.intervene()) {
            this.nextIntervener++;
            this.meter = 0; this.current = c; this.currentT = 0;
            this.stats.attempts++;
            this.stats.fails.push(`${c.name}: ${c.failLine}`);
            g.showBanner('INTERVENTION', `${c.name.toUpperCase()} — ${c.title}`);
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
            c.startThrow({ item: VEG_OF[c.id] || 'broccoli', speed: c.id === 'harry' ? 3.8 : 3.0, windup: 0.75, line: Math.random() < 0.4 ? 'vegThrow' : null, spread: 0.05 });
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
          harry.startThrow({ item: ['doughnut', 'burger', 'pizza'][this.stats.thrown % 3], speed: 3.0, windup: 0.6, food: true, line: this.stats.thrown === 1 ? 'intervene' : null });
        }
        break;
      }
    }
  }

  // ------------------------------------------------------------------ events from the game
  onAte(item, chonk) {
    if (!this.running) return;
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
  tackled(noah) {
    const g = this.g;
    const big = g.G.stage >= 2;
    if (big) { g.words.show('BOING!', noah.pos.clone().add({ x: 0, y: 1.2, z: 0 }), '#ffd400', 0.25); sfx('boing', noah.pos, 1); }
    else {
      g.words.show('TACKLED!', g.player.head.clone().addScaledVector(g.player.fwd, 0.7), '#C62828', 0.2);
      sfx('thud', null, 1);
      g.player.dropAll();
      setTimeout(() => noah.say('tackled', 4), 600);
    }
  }
  clinging(dylan, on) {
    if (on) { this.g.words.show('SHAKE HIM OFF!', this.g.player.head.clone().addScaledVector(this.g.player.fwd, 0.8), '#FF6D00', 0.16, 2); }
    else this.g.words.show('SHAKEN OFF!', dylan.pos.clone().add({ x: 0, y: 1, z: 0 }), '#FF6D00', 0.18);
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
    const W = 0.95, H = 1.15;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshLambertMaterial({ map: canvasTex(512, 620, (c, w, h) => {
      c.fillStyle = '#1b2a1b'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#8a6a3a'; c.lineWidth = 22; c.strokeRect(11, 11, w - 22, h - 22);
      fitText(c, 'GAME MODES', 30, 26, w - 60, 60, 52, { color: '#ffd400' });
      fitText(c, 'touch a button to play', 30, 78, w - 60, 30, 22, { color: '#cfe8cf' });
    }) }));
    grp.add(back);
    this.buttons = BOARD_ORDER.map((id, i) => {
      const tex = canvasTex(512, 96, () => {});
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.105, 0.03), [0, 0, 0, 0, new THREE.MeshBasicMaterial({ map: tex }), 0].map(m => m || new THREE.MeshLambertMaterial({ color: 0x333333 })));
      mesh.position.set(0, H / 2 - 0.25 - i * 0.125, 0.02);
      grp.add(mesh);
      const btn = { id, mesh, tex, pressedT: 0 };
      this.drawButton(btn, false);
      return btn;
    });
    // front wall, behind where you start, between the posters
    grp.position.set(0.17, 1.38, g.room.bounds.z1 - 0.012);
    grp.rotation.y = Math.PI;
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
    else extra = `Chonk ${Math.round(this.stats.chonk)}`;
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
