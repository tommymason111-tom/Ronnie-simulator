// RUN THE PUB (the Oysterfleet): you're behind the bar with Aidan, Connor and Chloe; Lewis works the restaurant and
// Ben's in the kitchen. The rest of the squad drop in now and then. The place fills up with locals: mostly old
// boys propping up the bar (and making a nuisance of themselves), families in for a meal, pairs of lads. They come
// up to the bar and order; you take the right drink off the back bar or the pumps and hand it over (or chuck it to
// them). Quick service gets tips, slow service gets walk-outs. Now and then it kicks off: a fight, an old boy
// singing on the bar, a kid running riot. Sort it out. Takings, a star rating and a shift report at the end.
import * as THREE from 'three';
import { SquadMember, SQUAD, makeProp } from './squad.js';
import { sfx } from './audio.js';

const DOOR = { x: 4.45, z: -12.95 };
const STAFF_SPOTS = { aidan: [3.45, -8.0, -Math.PI / 2], connor: [3.45, -4.9, -Math.PI / 2], chloe: [4.1, -2.7, -Math.PI / 2], ben: [-12.75, -7.4, -Math.PI / 2] };
const RONNIE_SPOT = { x: 3.6, z: -6.45 };
const ORDERS = [
  { kind: 'lager', name: 'PINT OF LAGER', icon: '🍺', price: 5.2, lines: ['Pint of lager please, son.', 'Lager. A cold one.', 'Pint of the usual, landlord.', 'Lager top. Hold the top.'], ok: (it) => it.type === 'beer' || it.type === 'pint' },
  { kind: 'stout', name: 'BLACK LIFFEY', icon: '🍺', price: 5.8, lines: ['Pint of the black stuff.', 'A BLACK LIFFEY, please. Let it settle.', 'Stout, landlord. Proper pour.'], ok: (it) => it.type === 'pint' },
  { kind: 'wine', name: 'WINE', icon: '🍷', price: 7.5, lines: ['Large glass of wine please, love.', 'Bottle of red for the table.', 'White wine. Large. It\'s been a week.'], ok: (it) => it.type === 'spirit' && it.variant >= 4 },
  { kind: 'spirit', name: 'A SHORT', icon: '🥃', price: 4.8, lines: ['Whisky. Neat.', 'Double vodka, sharpish.', 'Gin, if you\'ve got any.', 'Rum. Don\'t ask why.'], ok: (it) => it.type === 'spirit' && it.variant < 4 },
];
const isDrink = (it) => it && !it.dead && (it.type === 'pint' || it.type === 'beer' || it.type === 'spirit');
const R = (a) => a[Math.floor(Math.random() * a.length)];
const SKINS = [0xf1c3a5, 0xf3cdb4, 0xe5b08e, 0xd9a07a, 0xc08060, 0x8a5a3a];

// ---- the people who come in (stylised bodies, made up on the spot)
const OLD_NAMES = ['Old Ted', 'Big Barry', 'Dennis', 'Ray', 'Terry', 'Mick', 'Kev', 'Old Dave', 'Graham', 'Clive', 'Brian', 'Tony', 'Les', 'Norman', 'Ron (the other one)'];
const OLD_BANKS = {
  greet: ['Evening.', 'Usual table free?', 'Pint, son. Then another.', 'Alright, Ronnie. Behave yourself.'],
  chatter: ['I used to be a boxer, you know. Southend Amateur, 1974.', 'This pub\'s gone downhill since 1987.', 'Oi! Is it happy hour yet?', 'RONNIE! RONNIE! ...what was I saying.', 'My round? No. Not my round.', 'Forty years I\'ve been coming here. FORTY.', 'Who moved the dartboard?', 'In my day a pint was a shilling and you got change.', 'Don\'t tell the wife I\'m here.', 'Is that a new telly? Turn it up!'],
  hit: ['OI!', 'Watch it, sunshine!', 'I\'ll have you know I fought in... somewhere.', 'My pint! You nearly hit my PINT!'],
  slap: ['I\'m BARRING YOU. From MY pub.', 'Ow! I\'m 74!', 'You\'ve not heard the last of this!'],
  grabbed: ['Put me down! I\'ve got a bad hip!', 'This ain\'t the waltzer, son!'],
  launched: ['WHEEEEEE—', 'MY HIIIIP—'],
  angry: ['Forty minutes I\'ve waited! FORTY!', 'Service in here is a disgrace!', 'I\'m going to the Red Cow. They know how to pour.'],
  thanks: ['Lovely. Cheers, son.', 'That\'s the stuff.', 'You\'re a good lad, Ronnie. Don\'t eat the crisps.'],
};
const FAM_BANKS = {
  greet: ['Table for four, please.', 'Kids, stay where I can see you.', 'Ooh, it\'s nice in here now.'],
  chatter: ['Sit DOWN, Tyler.', 'Who wants chips? Everyone wants chips.', 'We said ONE fizzy drink.', 'Is that man eating off the other tables?', 'Lovely Sunday roast, this.', 'Put your phone away at the table.'],
  hit: ['Excuse me! There are CHILDREN here!', 'Right, I\'m leaving a review.'],
  slap: ['How DARE you!', 'I want to speak to the manager!'],
  grabbed: ['Put me down this instant!'], launched: ['AAAAAH!'],
  angry: ['We\'ve been waiting ages! Come on, kids, we\'re going.', 'One star. ONE.'],
  thanks: ['Thank you, that\'s lovely.', 'Cheers, love.'],
};
const KID_BANKS = { greet: ['Can I have chips?', 'I want a Fruit Shoot!'], chatter: ['I\'m bored.', 'Can we go to the park?', 'Mum, that man is FAT.', 'Are we there yet?'], hit: ['WAAAAH!', 'MUUUUM!'], slap: ['I\'m telling!'], grabbed: ['WHEEEE!'], launched: ['WHEEEEE!'], angry: ['I\'M BORED!'], thanks: ['Yay!'] };
const LAD_BANKS = {
  greet: ['Two pints, mate.', 'Alright Ron! Big lad!', 'Is the football on?'],
  chatter: ['Ingerland!', 'Who\'s round is it?', 'Get the darts out.', 'Is that Ronnie? He\'s HUGE.', 'Another one, lads?'],
  hit: ['Oi! What was that for?', 'Do you want some?'], slap: ['You\'re barred, mate. Wait. You work here.'], grabbed: ['Put me down, big man!'], launched: ['LADS! LAAADS!'],
  angry: ['We\'re going to Wetherspoons.', 'Two hours for a pint! Joke.'], thanks: ['Cheers, big man.', 'Legend.'],
};
const HOOL_BANKS = { greet: ['COME ON THEN!'], chatter: ['You looking at my pint?!', 'INGERLAND!', 'OUTSIDE! NOW!', 'Say that again! SAY IT!', 'He spilt my drink!'], hit: ['RIGHT! THAT\'S IT!'], slap: ['Alright! ALRIGHT! I\'m going!'], grabbed: ['Get off me!'], launched: ['NOOOOO—'], angry: ['This pub\'s a joke!'], thanks: ['Cheers.'] };

let pid = 0;
function makePunter(kind, extra = {}) {
  const id = 'p' + (++pid), rnd = Math.random, skin = R(SKINS);
  let def;
  if (kind === 'old') {
    const grey = R([0xb8b8b0, 0xd8d8d0, 0x8a8a84, 0xe8e8e0]);
    def = { name: R(OLD_NAMES), color: '#8a5a2a', voicePitch: 0.7 + rnd() * 0.2, body: { h: 1.66 + rnd() * 0.12, sw: 1.0 + rnd() * 0.15, girth: 1.15 + rnd() * 0.45, limb: 1.0 },
      look: { skin, hair: rnd() < 0.4 ? null : { style: rnd() < 0.5 ? 'short' : 'shortcurls', color: grey }, beard: rnd() < 0.45 ? { style: rnd() < 0.5 ? 'full' : 'stubble', color: grey } : null,
        top: R([0x5a4a3a, 0x6a2a2a, 0x3a4a3a, 0x4a4a5a, 0x7a6a4a, 0x2a3a5a, 0x8a7a6a]), top2: 0xe8e0d0, pattern: rnd() < 0.3 ? 'polo' : null, sleeves: 'long', bottom: R([0x3a3a3a, 0x4a3a2a, 0x2a2a3a, 0x5a5040]), legs: 'trousers', shoes: 0x1a1a1a,
        flatcap: rnd() < 0.45 ? R([0x5a4a3a, 0x3a3a3a, 0x6a5a40, 0x4a3a2a]) : null, glasses: rnd() < 0.35 }, banks: OLD_BANKS };
  } else if (kind === 'dad' || kind === 'mum' || kind === 'kid' || kind === 'lad' || kind === 'hool') {
    const kid = kind === 'kid', fem = kind === 'mum' || (kid && rnd() < 0.5);
    const h = kid ? 1.05 + rnd() * 0.3 : fem ? 1.6 + rnd() * 0.1 : 1.74 + rnd() * 0.12;
    const hool = kind === 'hool';
    def = { name: kid ? R(['Tyler', 'Mia', 'Alfie Jr', 'Poppy', 'Harley', 'Ruby', 'Jayden']) : fem ? R(['Sharon', 'Kerry', 'Donna', 'Leanne', 'Michelle', 'Tracey']) : hool ? R(['Gaz', 'Wayne', 'Dean', 'Stevo', 'Lee']) : R(['Darren', 'Craig', 'Lee', 'Steve', 'Paul', 'Jason', 'Ricky']),
      color: kid ? '#2aa8ff' : fem ? '#e05aa0' : hool ? '#c8102e' : '#2e7d32', voicePitch: kid ? 1.6 : fem ? 1.3 : 0.9,
      body: { h, sw: kid ? 0.85 : fem ? 0.9 : 1.05 + rnd() * 0.15, girth: kid ? 0.85 : fem ? 0.9 + rnd() * 0.2 : 1.0 + rnd() * 0.3, limb: kid ? 0.8 : 0.95 },
      look: { skin, hair: fem ? { style: 'long', color: R([0x2a1a10, 0xc8a050, 0x5a3a22, 0x111111]) } : { style: hool ? 'short' : R(['short', 'shortcurls', 'curtains']), color: R([0x2a1a10, 0x5a3a22, 0x111111, 0x8a6a3a]) },
        beard: !fem && !kid && rnd() < 0.4 ? { style: 'stubble', color: 0x2a1a10 } : null,
        top: hool ? R([0xf4f4f4, 0x7a1f3d, 0x1d2b5a, 0xc8102e]) : R([0x2a6ad8, 0xe53935, 0x43a047, 0xffd400, 0xf4f4f4, 0x7e57c2, 0xff8a00, 0x00897b]), top2: hool ? R([0xc8102e, 0x7ec8e3, 0xffffff]) : 0xffffff,
        pattern: hool ? 'jersey' : rnd() < 0.3 ? 'polo' : rnd() < 0.15 ? 'hoops' : null, sleeves: rnd() < 0.5 ? 'short' : 'long', bottom: R([0x1a2a4a, 0x2a2a2a, 0x3a5a8a, 0x5a4a3a]), legs: kid || rnd() < 0.3 ? 'shorts' : 'trousers', shoes: R([0xf4f4f4, 0x1a1a1a, 0x2a4a8a]), cap: hool && rnd() < 0.4 ? 0x1a1a1a : null },
      banks: kid ? KID_BANKS : hool ? HOOL_BANKS : kind === 'lad' ? LAD_BANKS : FAM_BANKS };
  }
  Object.assign(def, { title: '', fail: '' }, extra);
  SQUAD[id] = def;
  return id;
}

// a floating "what I want" tag over someone waiting at the bar, with how patient they still are
function orderTag() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false })); s.renderOrder = 13; s.scale.set(0.5, 0.25, 1);
  s.draw = (o, k) => { const g = c.getContext('2d'); g.clearRect(0, 0, 256, 128);
    g.fillStyle = 'rgba(10,14,30,0.85)'; g.beginPath(); g.roundRect(4, 4, 248, 120, 22); g.fill(); g.lineWidth = 6; g.strokeStyle = k > 0.5 ? '#39ff14' : k > 0.25 ? '#ffd400' : '#ff3a3a'; g.stroke();
    g.font = '64px serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(o.icon, 14, 54);
    g.fillStyle = '#fff'; g.font = '900 26px Arial'; g.fillText(o.name, 88, 40); g.fillStyle = '#ffd400'; g.font = '900 24px Arial'; g.fillText('£' + o.price.toFixed(2), 88, 76);
    g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(14, 100, 228, 12); g.fillStyle = k > 0.5 ? '#39ff14' : k > 0.25 ? '#ffd400' : '#ff3a3a'; g.fillRect(14, 100, 228 * Math.max(0, k), 12);
    t.needsUpdate = true; };
  return s;
}

export class RunPub {
  constructor(director) { this.d = director; this.g = director.g; }
  get cast() { return this.g.cast; }

  start() {
    const g = this.g, room = g.room;
    this.money = 0; this.served = 0; this.walkouts = 0; this.wrong = 0; this.fights = 0; this.rating = 3.5; this.events = 0; this.staffServed = 0;
    this.punters = []; this.tags = new Map(); this.barTaken = new Map(); this.seatTaken = new Set();
    this.spawnT = 2; this.dropT = 25 + Math.random() * 20; this.eventT = 55 + Math.random() * 20; this.event = null; this.stockT = 0; this.staffT = 6;
    // the staff to their posts
    for (const c of this.cast) {
      if (c === g.tommy) continue;
      c.active = false; c.stayPut = true; c.roamAct = null; c.lookOverride = null;
      if (c.id === 'lewis') { c.rpJob = 'restaurant'; c.stayPut = false; c.rag.placeAt(-20.5, -9, 0); c.waitT = 1; c.plate = this.plate(); continue; }
      const sp = STAFF_SPOTS[c.id]; if (!sp) continue;
      c.rpJob = c.id === 'ben' ? 'kitchen' : 'bar'; c.rpSpot = sp; c.rag.placeAt(sp[0], sp[1], sp[2]); c.faceYaw = sp[2]; c.activity = c.id === 'ben' ? 'cook' : 'pour'; c.state = 'idle';
    }
    // Tommy's a regular, at the bar
    const tb = (room.barSpots || [])[3]; if (tb && g.tommy) { g.tommy.rag.placeAt(tb.x, tb.z, tb.yaw); g.tommy.faceYaw = tb.yaw; g.tommy.attacks = false; g.tommy.directed = false; this.barTaken.set(tb, g.tommy); }
    // Ronnie behind the bar, facing the punters
    const P = g.player; P.rig.position.set(RONNIE_SPOT.x, 0, RONNIE_SPOT.z); P.rig.rotation.y = Math.PI / 2; if (P.flatMode) { P.flatYaw = 0; P.flatPitch = -0.18; }
    this.stock(true);
    g.showBanner('RUN THE PUB', 'SERVE THE PUNTERS');
  }

  // ------------------------------------------------------------------ helpers
  plate() { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.015, 18), new THREE.MeshLambertMaterial({ color: 0xffffff })));
    const food = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 6), new THREE.MeshLambertMaterial({ color: 0xc8863a })); food.scale.set(1.2, 0.5, 1); food.position.y = 0.03; g.add(food);
    const peas = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshLambertMaterial({ color: 0x5aaa2a })); peas.position.set(0.06, 0.02, 0.04); g.add(peas);
    this.g.scene.add(g); return g; }
  freeBarSpot(near) { const spots = (this.g.room.barSpots || []).filter(s => !this.barTaken.has(s) && s.x > -14); if (!spots.length) return null; spots.sort((a, b) => Math.hypot(a.x - near.x, a.z - near.z) - Math.hypot(b.x - near.x, b.z - near.z)); return spots[Math.floor(Math.random() * Math.min(3, spots.length))]; }
  freeSeat(pred) { const all = (this.g.room.chairsAt || []).filter(s => !this.seatTaken.has(s) && pred(s)); return all.length ? R(all) : null; }
  add(kind, extra) {
    const g = this.g, id = makePunter(kind, extra), c = new SquadMember(g.scene, g.room, g.physics, id, [DOOR.x + (Math.random() - 0.5) * 0.6, DOOR.z + 0.3, Math.PI * 0.85], this.d);
    this.d.hook(c); const prev = c.onEvent; c.onEvent = (n, w) => { prev && prev(n, w); this.onPunterEvent(c, n); };
    c.active = false; c.rp = { kind, phase: 'enter', t: 0, drinks: 0, maxDrinks: kind === 'old' ? 3 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 3), stay: 150 + Math.random() * 120 };
    if (kind === 'old') c.drunk = 0.35 + Math.random() * 0.5; if (kind === 'hool' || kind === 'lad') c.drunk = 0.25 + Math.random() * 0.3;
    g.cast.push(c); this.punters.push(c); return c;
  }
  remove(c) {
    this.release(c);
    const tag = this.tags.get(c); if (tag) { this.g.scene.remove(tag); this.tags.delete(c); }
    const i = this.g.cast.indexOf(c); if (i >= 0) this.g.cast.splice(i, 1);
    const j = this.punters.indexOf(c); if (j >= 0) this.punters.splice(j, 1);
    c.dispose(); delete SQUAD[c.id];
  }
  release(c) { for (const [s, w] of this.barTaken) if (w === c) this.barTaken.delete(s); if (c.rp && c.rp.seat) { this.seatTaken.delete(c.rp.seat); } }
  goHome(c) { const h = c.rp.home; c.seated = false; c.activity = null; c.faceYaw = null; c.goTo(h.x, h.z, c.drunk ? 0.95 : 1.2); c.rp.phase = 'return'; }
  settleHome(c) { const h = c.rp.home; c.state = 'idle'; if (h.seat) { c.rag.placeAt(h.x, h.z, h.yaw); c.seated = true; } c.faceYaw = h.yaw; c.activity = c.prop ? 'drink' : (c.rp.kind === 'kid' ? null : R(['chat', 'phone', null, 'chat'])); c.rp.phase = 'settled'; }
  leave(c, line) { this.release(c); c.seated = false; c.activity = null; c.faceYaw = null; if (line) c.say(line, 4); c.goTo(DOOR.x, DOOR.z + 0.4, 0.95); c.rp.phase = 'leaving'; const tag = this.tags.get(c); if (tag) tag.visible = false; }
  pay(amount, where, label) { this.money += amount; this.g.words.show(label || ('+£' + amount.toFixed(2)), where, '#39ff14', 0.11, 1.2); sfx('ting', where, 0.6); }

  // keep the back bar topped up with pints and bottles of lager for you to hand out
  stock(all) {
    const items = this.g.items, spots = [];
    for (let z = -8.4; z <= -1.9; z += 0.42) spots.push(new THREE.Vector3(5.72, 0.92 + 0.05, z));
    const near = (p) => items.items.some(it => !it.dead && it.pos.distanceToSquared(p) < 0.1 * 0.1);
    let n = items.items.filter(it => (it.type === 'pint' || it.type === 'beer') && !it.heldBy && it.pos.x > 5.4 && it.pos.x < 6.1 && it.pos.z > -8.8 && it.pos.z < -1.6).length;
    for (const p of spots) { if (n >= 9 && !all) break; if (near(p)) continue; const it = items.spawn(Math.random() < 0.55 ? 'beer' : 'pint', p); it.spawnScale = all ? 1 : 0.2; it.resting = true; it.shelf = true; n++; }
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.g, P = g.player;
    // staff at their posts (knocked about? back to them)
    for (const c of this.cast) {
      if (!c.rpJob || c.down) continue;
      if (c.rpJob === 'restaurant') { this.lewis(c, dt); continue; }
      if (c.state === 'idle' && c.rag.mode === 'anim' && Math.hypot(c.pos.x - c.rpSpot[0], c.pos.z - c.rpSpot[1]) > 0.5) { c.rag.placeAt(c.rpSpot[0], c.rpSpot[1], c.rpSpot[2]); }
      c.faceYaw = c.rpSpot[2]; c.active = false; c.stayPut = true;
      if (c.id === 'ben' && Math.random() < dt / 25) { c.say(R(['SERVICE!', 'Two scampi, one pie, table nine!', 'Who ordered the Ronnie Platter? ...Ronnie did.', 'CHIPS ARE UP!', 'Ronnie, get your hands OFF the pass!']), 3); sfx('ting', c.pos, 0.6); }
    }
    if ((this.stockT -= dt) <= 0) { this.stockT = 4; this.stock(false); }
    // new punters: fill up to 6 early on, then keep it busy (up to 10)
    const elapsed = 360 - (this.d.timeLeft || 0), cap = Math.min(10, 4 + Math.floor(elapsed / 30));
    if ((this.spawnT -= dt) <= 0) {
      this.spawnT = 5 + Math.random() * 7;
      const n = this.punters.filter(p => p.rp.kind !== 'hool').length;
      if (n < cap) { const r = Math.random(); if (r < 0.55) this.arrive('old'); else if (r < 0.78 && n < cap - 2) this.arriveFamily(); else this.arriveLads(); }
    }
    // the rest of the squad drop in for a bit
    if ((this.dropT -= dt) <= 0) { this.dropT = 40 + Math.random() * 40; this.dropIn(); }
    for (const c of this.cast) if (c.dropIn) this.dropInTick(c, dt);
    // the punters
    for (const c of this.punters.slice()) this.punterTick(c, dt, P);
    // staff help out with anyone who's been waiting too long
    if ((this.staffT -= dt) <= 0) { this.staffT = 3;
      const wait = this.punters.filter(c => c.rp.phase === 'waiting' && c.rp.wait > 16).sort((a, b) => b.rp.wait - a.rp.wait)[0];
      const st = wait && this.cast.find(s => s.rpJob === 'bar' && !s.down && (s.serveCool || 0) <= 0);
      if (st) { st.serveCool = 18; st.say(R(['I\'ve got this one, Ron!', 'Here you go, mate.', 'Ronnie, you\'re SLOW.', 'Served. Again. By me.']), 3); this.deliver(wait, null, st); } }
    for (const s of this.cast) if (s.serveCool > 0) s.serveCool -= dt;
    // events
    if (!this.event && (this.eventT -= dt) <= 0) { this.eventT = 55 + Math.random() * 35; this.startEvent(); }
    if (this.event) this.eventTick(dt);
    this.rating = THREE.MathUtils.clamp(this.rating, 0, 5);
  }

  arrive(kind) {
    const c = this.add(kind), home = this.pickHome(c, kind);
    c.rp.home = home; c.goTo(home.x, home.z, c.drunk ? 0.95 : 1.2); c.rp.thirst = 4 + Math.random() * 14;
    if (Math.random() < 0.5) setTimeout(() => c.say('greet', 2), 800);
    return c;
  }
  pickHome(c, kind) {
    if (kind === 'old' && Math.random() < 0.45) { const b = this.freeBarSpot(DOOR); if (b) { this.barTaken.set(b, c); return { x: b.x, z: b.z, yaw: b.yaw, bar: b }; } }
    const seat = this.freeSeat(([x, z]) => x > -9.6 && z < 7.8 && z > -8.8);          // a table in the pub
    if (seat) { this.seatTaken.add(seat); c.rp.seat = seat; return { x: seat[0], z: seat[1], yaw: seat[2] + Math.PI, seat: true }; }
    const s = this.g.room.tommySpots[Math.floor(Math.random() * this.g.room.tommySpots.length)]; return { x: s.x, z: s.y, yaw: Math.random() * 6.28 };
  }
  arriveFamily() {
    // a table in the restaurant with enough chairs round it
    const chairs = (this.g.room.chairsAt || []).filter(s => s[0] < -14.5 && !this.seatTaken.has(s));
    if (!chairs.length) return this.arrive('old');
    const a = R(chairs), group = chairs.filter(s => Math.hypot(s[0] - a[0], s[1] - a[1]) < 2.0).slice(0, 4);
    const kinds = ['dad', 'mum', 'kid', 'kid'].slice(0, Math.max(2, group.length));
    const fam = [];
    kinds.forEach((k, i) => { const seat = group[i % group.length]; const c = this.add(k); c.rp.phase = 'queue'; this.seatTaken.add(seat); c.rp.seat = seat; c.rp.home = { x: seat[0], z: seat[1], yaw: seat[2] + Math.PI, seat: true }; c.rp.thirst = k === 'kid' ? 1e9 : 12 + Math.random() * 20; c.rp.family = fam; fam.push(c);
      setTimeout(() => { if (!c.disposed) { c.rp.phase = 'enter'; c.goTo(c.rp.home.x, c.rp.home.z, k === 'kid' ? 1.5 : 1.2); } }, 300 + i * 700); });
    fam[0] && setTimeout(() => fam[0].say('greet', 3), 500);
  }
  arriveLads() { const a = this.arrive('lad'); setTimeout(() => this.arrive('lad'), 900); return a; }

  punterTick(c, dt, P) {
    const rp = c.rp; rp.t += dt;
    if (c.down) return;
    switch (rp.phase) {
      case 'enter': case 'return':
        if (c.state === 'idle') this.settleHome(c);
        break;
      case 'settled':
        if (rp.kind !== 'hool' && (rp.t > rp.stay || rp.drinks >= rp.maxDrinks) && rp.kind !== 'kid') { if (rp.family) { if (rp.family[0] === c) for (const f of rp.family) this.leave(f, f === c ? 'Right, come on, kids. Home.' : null); } else this.leave(c, R(['Night all.', 'Same time tomorrow.', 'Right. One for the road. No. Home.'])); break; }
        if ((rp.thirst -= dt) <= 0) {
          const spot = rp.home.bar || this.freeBarSpot(c.pos); if (!spot) { rp.thirst = 4; break; }
          this.barTaken.set(spot, c); rp.spot = spot; c.seated = false; c.activity = null; c.faceYaw = null;
          if (rp.home.bar) this.order(c); else { c.goTo(spot.x, spot.z, c.drunk ? 1.0 : 1.25); rp.phase = 'toBar'; }
        }
        break;
      case 'toBar':
        if (c.state === 'idle') { c.rag.placeAt(rp.spot.x, rp.spot.z, rp.spot.yaw); this.order(c); }
        break;
      case 'waiting': {
        rp.wait += dt; const k = 1 - rp.wait / rp.patience;
        const tag = this.tags.get(c); if (tag) { const h = c.headPos(new THREE.Vector3()); tag.position.set(h.x, h.y + 0.42, h.z); if ((rp.tagT = (rp.tagT || 0) - dt) <= 0) { rp.tagT = 0.25; tag.draw(rp.order, k); } }
        c.faceYaw = rp.spot.yaw; c.activity = k < 0.35 ? 'tantrum' : null;
        if (k < 0.35 && !rp.moaned) { rp.moaned = true; c.say(R(['Any chance of a drink?!', 'HELLO? Anyone serving?', 'I\'ll die of thirst here.', 'Ronnie, stop eating and SERVE.']), 4); }
        // handed over (held near them) or thrown to them
        const held = [...(P.hands || []).map(h => h.held), P.flatHolder && P.flatHolder.held].filter(isDrink);
        const chest = c.rag.pos('chest', new THREE.Vector3());
        for (const it of held) {
          let ok;
          if (P.flatMode) { const dx = chest.x - P.head.x, dz = chest.z - P.head.z, d = Math.hypot(dx, dz); ok = d < 2.5 && (dx * P.fwd.x + dz * P.fwd.z) / (d * Math.hypot(P.fwd.x, P.fwd.z) || 1) > 0.55; }   // across the bar, looking at them
          else ok = it.pos.distanceTo(chest) < 0.6;                                                                     // VR: hold it out to them
          if (ok) { this.deliver(c, it); return; } }
        for (const it of this.g.items.items) if (isDrink(it) && !it.heldBy && !it.shelf && it.pos.distanceTo(chest) < 0.55) { this.deliver(c, it); return; }
        if (rp.wait >= rp.patience) { this.walkouts++; this.rating -= 0.35; sfx('sadviolin', c.pos, 0.5); if (Math.random() < 0.45) this.leave(c, 'angry'); else { c.say('angry', 4); this.release(c); this.dropTag(c); rp.thirst = 25 + Math.random() * 20; this.goHome(c); } }
        break;
      }
      case 'served':
        if ((rp.servedT -= dt) <= 0) { if (rp.home.bar) { rp.phase = 'settled'; c.activity = 'drink'; c.faceYaw = rp.home.yaw; } else { this.release(c); if (rp.home.bar) this.barTaken.set(rp.home.bar, c); this.goHome(c); } rp.thirst = 30 + Math.random() * 35; }
        break;
      case 'leaving':
        if (c.state === 'idle' || Math.hypot(c.pos.x - DOOR.x, c.pos.z - DOOR.z) < 0.9) this.remove(c);
        break;
      case 'brawl': case 'riot': case 'sing': break;      // (run by the event)
    }
  }
  order(c) {
    const rp = c.rp, o = rp.kind === 'old' ? R([ORDERS[0], ORDERS[0], ORDERS[1], ORDERS[1], ORDERS[3]]) : rp.kind === 'mum' ? R([ORDERS[2], ORDERS[2], ORDERS[0]]) : R(ORDERS);
    rp.order = o; rp.wait = 0; rp.patience = rp.kind === 'old' ? 42 : 52; rp.moaned = false; rp.phase = 'waiting';
    c.state = 'idle'; c.faceYaw = rp.spot.yaw; c.say(R(o.lines), 4);
    let tag = this.tags.get(c); if (!tag) { tag = orderTag(); this.tags.set(c, tag); this.g.scene.add(tag); } tag.visible = true; rp.tagT = 0;
  }
  dropTag(c) { const tag = this.tags.get(c); if (tag) tag.visible = false; }
  deliver(c, it, byStaff = null) {
    const rp = c.rp, o = rp.order, P = this.g.player, where = c.headPos(new THREE.Vector3()).add({ x: 0, y: 0.3, z: 0 });
    if (it) { for (const h of P.hands || []) if (h.held === it) h.held = null; if (P.flatHolder && P.flatHolder.held === it) P.flatHolder.held = null; it.heldBy = null; this.g.items.remove(it); }
    const right = !it || o.ok(it), quick = 1 - rp.wait / rp.patience;
    if (byStaff) { this.staffServed++; this.pay(o.price, where, '+£' + o.price.toFixed(2) + ' (' + byStaff.name + ')'); this.rating += 0.03; }
    else if (right) { const tip = Math.round(Math.max(0, quick) * 3 * 10) / 10; this.served++; this.pay(o.price + tip, where, tip > 0.4 ? `+£${o.price.toFixed(2)} +£${tip.toFixed(2)} TIP` : null); this.rating += 0.05 + quick * 0.12; c.say('thanks', 3); }
    else { this.wrong++; this.served++; this.pay(o.price * 0.5, where, '+£' + (o.price * 0.5).toFixed(2) + ' (WRONG DRINK)'); this.rating -= 0.1; c.say(R(['That\'s not what I asked for!', 'I said ' + o.name.toLowerCase() + '! ...go on then.', 'Are you even listening, Ronnie?']), 4); }
    rp.drinks++; rp.phase = 'served'; rp.servedT = 1.8; this.dropTag(c);
    if (!c.prop) { c.prop = makeProp('pint', c.rag.height / 1.68); this.g.scene.add(c.prop); }
    c.activity = 'drink';
  }

  // ------------------------------------------------------------------ the squad drop in
  dropIn() {
    const g = this.g, pool = Object.keys(SQUAD).filter(id => !id.startsWith('p') && !['lewis', 'ben', 'aidan', 'connor', 'chloe', 'tommy'].includes(id) && !this.cast.some(c => c.id === id));
    if (!pool.length || this.cast.filter(c => c.dropIn).length >= 2) return;
    const id = R(pool), c = new SquadMember(g.scene, g.room, g.physics, id, [DOOR.x, DOOR.z + 0.3, Math.PI], this.d);
    this.d.hook(c); g.cast.push(c); c.dropIn = { t: 60 + Math.random() * 60, phase: 'in' }; c.active = false;
    const b = this.freeBarSpot(c.pos); if (b) { this.barTaken.set(b, c); c.dropIn.spot = b; c.goTo(b.x, b.z, 1.0); }
    setTimeout(() => c.say(R(['Alright Ronnie! Didn\'t know you worked here!', 'RONNIE! Pint please, mate. On the house?', 'Ron! Look at you, behind a bar. Brave.', 'Heard you were working. Had to see it.']), 4), 1200);
    g.showBanner(c.name.toUpperCase() + ' HAS POPPED IN', 'SERVE HIM FIRST?');
  }
  dropInTick(c, dt) {
    const d = c.dropIn; d.t -= dt; if (c.down) return;
    if (d.phase === 'in' && c.state === 'idle') { d.phase = 'here'; if (d.spot) { c.rag.placeAt(d.spot.x, d.spot.z, d.spot.yaw); c.faceYaw = d.spot.yaw; } c.activity = 'drink'; }
    if (d.phase === 'here' && d.t <= 0) { d.phase = 'out'; for (const [s, w] of this.barTaken) if (w === c) this.barTaken.delete(s); c.activity = null; c.faceYaw = null; c.say(R(['Right, I\'m off. Don\'t eat the stock, Ron.', 'See you later, landlord!', 'Laters, Ron.']), 3); c.goTo(DOOR.x, DOOR.z + 0.4, 1.0); }
    if (d.phase === 'out' && (c.state === 'idle' || Math.hypot(c.pos.x - DOOR.x, c.pos.z - DOOR.z) < 0.9)) { const i = this.g.cast.indexOf(c); if (i >= 0) this.g.cast.splice(i, 1); c.dispose(); }
  }

  // ------------------------------------------------------------------ Lewis waits tables in the restaurant
  lewis(c, dt) {
    c.active = false;
    if (c.plate) { c.plate.visible = c.activity === 'waiter' || c.state === 'walk'; const h = c.rag.grip('lArmR', new THREE.Vector3()); c.plate.position.set(h.x, h.y + 0.04, h.z); }
    if (c.state === 'walk') { c.activity = null; return; }
    if ((c.waitT -= dt) > 0) return;
    c.waitT = 6 + Math.random() * 6;
    const chairs = (this.g.room.chairsAt || []).filter(s => s[0] < -14.5); if (!chairs.length) return;
    const [x, z, ry] = R(chairs), sx = x + Math.sin(ry) * 0.7, sz = z + Math.cos(ry) * 0.7;
    c.goTo(sx, sz, 1.1, 'idle'); c.faceYaw = ry + Math.PI; setTimeout(() => { if (c.state === 'idle') c.activity = 'waiter'; }, 0);
    if (Math.random() < 0.3) c.say(R(['Table six, bro! Your scampi!', 'Mind your backs, bro, HOT PLATES!', 'Bro, who had the gammon?', 'Ronnie! Bro! Stop staring at the plates!']), 3);
    setTimeout(() => { c.activity = 'waiter'; }, 4000);
  }

  // ------------------------------------------------------------------ it's kicking off
  startEvent() {
    const g = this.g, r = Math.random(); this.events++;
    if (r < 0.45) {                                   // a fight: three lads squaring up in the middle of the pub
      const spot = { x: -1.8 + Math.random() * 2.5, z: -1.5 + Math.random() * 3 }, hs = [this.add('hool'), this.add('hool'), this.add('hool')];
      hs.forEach((c, i) => { c.rp.phase = 'brawl'; const a = i / 3 * Math.PI * 2; c.rp.brawlAt = { x: spot.x + Math.sin(a) * 0.75, z: spot.z + Math.cos(a) * 0.75 }; c.goTo(c.rp.brawlAt.x, c.rp.brawlAt.z, 1.6); });
      this.event = { kind: 'fight', t: 0, who: hs, center: spot, knocked: new Set() };
      g.showBanner('IT\'S KICKING OFF!', 'BREAK UP THE FIGHT');
      sfx('whistle', null, 0.8);
    } else if (r < 0.75) {                            // an old boy singing at the bar
      const c = this.punters.find(p => p.rp.kind === 'old' && !p.down && (p.rp.phase === 'settled' || p.rp.phase === 'waiting'));
      if (!c) { this.event = null; return this.startEvent(); }
      this.dropTag(c); this.release(c); c.rp.phase = 'sing'; c.activity = 'sing'; c.seated = false; c.faceYaw = Math.random() * 6.28; c.drunk = 1;
      this.event = { kind: 'singer', t: 0, who: [c], lineT: 0 };
      g.showBanner(c.name.toUpperCase() + ' IS SINGING', 'SHUT HIM UP');
    } else {                                          // a kid running riot
      const kid = this.punters.find(p => p.rp.kind === 'kid' && !p.down);
      if (!kid) { const c = this.arriveFamilyKid(); if (!c) { this.event = null; return; } }
      const k2 = this.punters.find(p => p.rp.kind === 'kid' && !p.down);
      k2.rp.phase = 'riot'; k2.seated = false; this.event = { kind: 'kid', t: 0, who: [k2], hopT: 0 };
      g.showBanner(k2.name.toUpperCase() + ' IS RUNNING RIOT', 'CATCH THE KID');
    }
  }
  arriveFamilyKid() { this.arriveFamily(); return this.punters.find(p => p.rp.kind === 'kid'); }
  eventTick(dt) {
    const e = this.event, g = this.g, P = g.player; e.t += dt;
    if (e.kind === 'fight') {
      const live = e.who.filter(c => !c.disposed && !e.knocked.has(c));
      for (const c of live) { if (c.down) continue;
        if (c.state === 'idle') { const o = live.filter(x => x !== c)[0] || P; const op = o.pos || o.head; c.faceYaw = Math.atan2(op.x - c.pos.x, op.z - c.pos.z); c.activity = 'fight';
          if (Math.random() < dt * 0.9 && o.flinch) { o.flinch(new THREE.Vector3(op.x - c.pos.x, 0, op.z - c.pos.z), 0.9); sfx('thwack', op, 0.6); }
          if (Math.random() < dt * 0.3) c.say('chatter', 3); } }
      this.rating -= dt * 0.035;
      if (!live.length) { this.fights++; this.pay(20, P.head.clone().addScaledVector(P.fwd, 1).add({ x: 0, y: 0.3, z: 0 }), 'FIGHT BROKEN UP! +£20'); this.rating += 0.6; g.showBanner('FIGHT BROKEN UP!', 'THE LANDLORD IS PROUD'); this.event = null; return; }
      if (e.t > 50) { this.rating -= 0.8; this.money = Math.max(0, this.money - 40); g.showBanner('THEY SMASHED THE PLACE UP', '-£40 IN BROKEN GLASSES'); for (const c of live) this.leave(c, R(['This pub\'s a DUMP!', 'We\'re going!'])); this.event = null; }
    } else if (e.kind === 'singer') {
      const c = e.who[0]; if (c.disposed) { this.event = null; return; }
      if (!c.down) { c.activity = 'sing'; if ((e.lineT -= dt) <= 0) { e.lineT = 3.2; c.say(R(['♪ SWEET CAROLINE! BUM BUM BUM! ♪', '♪ Sooo here it is, merry Christmas! ♪ (it\'s July)', '♪ I\'M FOREVER BLOWING BUBBLES! ♪', '♪ Come on Eileen! ♪ ...Eileen? EILEEN?', '♪ We are the champions! ♪ ...of the pub quiz, 1991!']), 5); sfx('trumpet', c.pos, 0.25); } }
      this.rating -= dt * 0.025;
      if (e.t > 40 && !c.down) { c.knockOut('hit'); c.say('zzz', 1); this.leaveLater(c, 5); this.event = null; g.showBanner(c.name.toUpperCase() + ' PASSED OUT', 'HE\'LL BE BACK TOMORROW'); }
    } else if (e.kind === 'kid') {
      const c = e.who[0]; if (c.disposed) { this.event = null; return; }
      if (!c.down && c.state !== 'walk') { const s = R(this.g.room.tommySpots.filter(s => s.x > -9.5 && s.y < 7.8 && s.y > -8.8)); if (s) c.goTo(s.x, s.y, 2.4); c.activity = 'tantrum'; if (Math.random() < 0.5) c.say(R(['WHEEEE!', 'CAN\'T CATCH ME!', 'I WANT CHIPS!', 'NYEEEEOWWW!']), 2); }
      this.rating -= dt * 0.015;
      const caught = Math.hypot(c.pos.x - P.head.x, c.pos.z - P.head.z) < 1.0 || c.down;
      if (caught || e.t > 45) { c.say(caught ? 'Awww. Fine.' : 'MUUUM! I\'m tired!', 3); c.rp.phase = 'enter'; c.goTo(c.rp.home.x, c.rp.home.z, 1.0); if (caught) { this.rating += 0.3; this.pay(5, P.head.clone().addScaledVector(P.fwd, 1).add({ x: 0, y: 0.3, z: 0 }), 'KID CAUGHT! +£5'); } this.event = null; }
    }
  }
  leaveLater(c, t) { setTimeout(() => { if (!c.disposed && this.punters.includes(c)) this.leave(c, null); }, t * 1000); }
  onPunterEvent(c, name) {
    if (name !== 'ko' || !c.rp) return;
    const e = this.event;
    if (e && e.kind === 'fight' && e.who.includes(c) && !e.knocked.has(c)) { e.knocked.add(c); this.leaveLater(c, 3.5); setTimeout(() => !c.disposed && c.say(R(['Alright! ALRIGHT! I\'m going!', 'I\'m BARRED? From THIS dump?', 'You\'ll be hearing from my mum!']), 4), 2600); }
    else if (e && e.kind === 'singer' && e.who[0] === c) { this.leaveLater(c, 4); setTimeout(() => !c.disposed && c.say('Alright! I\'ll go home! ♪ ...Sweet Carol— ♪', 4), 2600); this.pay(5, c.headPos(new THREE.Vector3()), 'PEACE AND QUIET! +£5'); this.rating += 0.3; this.event = null; }
    else if (c.rp.kind !== 'hool') { this.rating -= 0.15; }              // knocking out your customers is bad for business
  }

  // ------------------------------------------------------------------ the report
  hud() {
    const stars = '★'.repeat(Math.floor(this.rating)) + (this.rating % 1 >= 0.5 ? '½' : '');
    const waiting = this.punters.filter(c => c.rp.phase === 'waiting').length;
    return `£${this.money.toFixed(2)} · ${stars || '0★'} · ${waiting} waiting`;
  }
  summary() {
    const stars = Math.round(this.rating * 2) / 2;
    return [
      ['TAKINGS', '£' + this.money.toFixed(2)],
      ['DRINKS SERVED BY RONNIE', this.served],
      ['SERVED BY THE STAFF (SHAME)', this.staffServed],
      ['WRONG DRINKS', this.wrong],
      ['WALK-OUTS', this.walkouts],
      ['FIGHTS BROKEN UP', this.fights],
      ['TVS SMASHED', this.g.G.tvsSmashed || 0],
      ['PUB RATING', '★'.repeat(Math.floor(stars)) + (stars % 1 ? '½' : '') + ` (${stars}/5)`],
      [stars >= 4 ? 'Lewis: "Bro. Landlord of the year, bro."' : stars >= 2.5 ? 'Aidan: "Not bad. Let it settle next time."' : 'Chloe: "Babe. You ate the profits."', ''],
    ];
  }
  cleanup() { for (const id of Object.keys(SQUAD)) if (/^p\d+$/.test(id)) delete SQUAD[id]; for (const t of this.tags.values()) this.g.scene.remove(t); this.tags.clear(); for (const c of this.cast) if (c.plate) { this.g.scene.remove(c.plate); c.plate = null; } }
}
