// RUN THE PUB (the Oysterfleet): you're behind the bar with Aidan, Connor and Chloe; Lewis works the restaurant and
// Ben's in the kitchen. The rest of the squad drop in now and then. The place fills up with locals: mostly old
// boys propping up the bar (and making a nuisance of themselves), families in for a meal, pairs of lads. They come
// up to the bar and order; you take the right drink off the back bar or the pumps and hand it over (or chuck it to
// them). Quick service gets tips, slow service gets walk-outs. Now and then it kicks off: a fight, an old boy
// singing on the bar, a kid running riot. Sort it out. Takings, a star rating and a shift report at the end.
import * as THREE from 'three';
import { PubJobs } from './pubjobs.js';
import { SquadMember, SQUAD, makeProp } from './squad.js';
import { sfx } from './audio.js';
import { Bar } from './barstations.js';
import { TipJar, RP_DIFF } from './tipjar.js';
import { track } from './awards.js';
import { PunterLife } from './punterlife.js';
import { giveStyle, setClip, clearClip } from './punteranims.js';

const DOOR = { x: 4.45, z: -12.95 };
const STAFF_SPOTS = { aidan: [3.45, -8.0, -Math.PI / 2], connor: [3.45, -4.9, -Math.PI / 2], chloe: [4.1, -2.7, -Math.PI / 2], ben: [-13.2, -7.4, -Math.PI / 2] };
const RONNIE_SPOT = { x: 3.6, z: -6.45 };
// what people order: where it comes from (the station), what counts, and what it costs
const ORDERS = {
  guinness: { name: 'GUINNESS', icon: '🍺', guin: true, price: 5.8, booze: true, lines: ['Pint of the black stuff.', 'A GUINNESS, please. Let it settle.', 'Stout, landlord. Proper pour.'], ok: (it) => it.type === 'pint', from: 'glasses', make: 'tap', vessel: 'glass', how: 'pint glass → hold it under the GUINNESS tap' },
  lager: { name: 'LAGER', icon: '🍺', price: 4.8, booze: true, lines: ['Bottle of lager please, son.', 'Lager. A cold one.', 'Lager, landlord.'], ok: (it) => it.type === 'beer', from: 'lager', how: 'a bottle from the LAGER ice bucket on the back counter' },
  cider: { name: 'CIDER', icon: '🍏', price: 5.0, booze: true, lines: ['Cider please. Over ice if you\'ve got it.', 'Bottle of cider, mate.', 'Cider. It\'s basically fruit.'], ok: (it) => it.type === 'cider', from: 'cider', how: 'a bottle from the CIDER ice bucket on the back counter' },
  wine: { name: 'WINE', icon: '🍷', price: 6.5, booze: true, lines: ['Large glass of wine please, love.', 'Glass of red, please.', 'White wine. Large. It\'s been a week.'], ok: (it) => it.type === 'wine', from: 'wine', how: 'grab a glass off the back counter' },
  coffee: { name: 'COFFEE', icon: '☕', price: 3.2, lines: ['A coffee, please. Driving.', 'Flat white? Just coffee then.', 'Coffee, strong as you like.'], ok: (it) => it.type === 'coffee', from: 'mugs', make: 'coffee', vessel: 'mug', how: 'a mug → hold it under the COFFEE MACHINE' },
  cola: { name: 'COKE', icon: '🥤', price: 2.8, soft: true, lines: ['A Coke, please!', 'Can I have a Coke?', 'Coke. With ice!'], ok: (it) => it.type === 'soft' && it.variant === 0, from: 'cups', make: 'gun', vessel: 'cup', how: 'hold a cup, tap the soft-drink gun, pick up your Coke' },
  fanta: { name: 'FANTA', icon: '🍊', price: 2.8, soft: true, lines: ['Fanta please!', 'Orange Fanta!', 'Can I have a Fanta? Please?'], ok: (it) => it.type === 'soft' && it.variant === 1, from: 'cups', make: 'gun', vessel: 'cup', how: 'hold a cup, tap the soft-drink gun, pick up your Fanta' },
  monstor: { name: 'MONSTOR', icon: '⚡', price: 3.5, lines: ['MONSTOR. The green one.', 'Got any MONSTOR?', 'A MONSTOR, I\'ve got work tomorrow.'], ok: (it) => it.type === 'can', from: 'monstor', how: 'take a can from the MONSTOR fridge' },
};
const MENU = { old: ['guinness', 'guinness', 'lager', 'lager', 'cider', 'coffee'], dad: ['lager', 'guinness', 'cider', 'coffee'], mum: ['wine', 'wine', 'coffee', 'cider'], lad: ['lager', 'cider', 'monstor', 'guinness'], kid: ['cola', 'fanta'], hool: ['lager'] };
const isDrink = (it) => it && !it.dead && it.def.drink;
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
// everyone's different: build, age, hair, face, clothes, the odd accessory. Each kind of punter has its own wardrobe
const HAIR_C = [0x2a1a10, 0x5a3a22, 0x111111, 0x8a6a3a, 0x3a2a1a, 0xa0522d, 0xd8b060, 0x6a4a2a];
const GREYS = [0xb8b8b0, 0xd8d8d0, 0x8a8a84, 0xe8e8e0, 0x9a9690];
const BRIGHT = [0x2a6ad8, 0xe53935, 0x43a047, 0xffd400, 0xf4f4f4, 0x7e57c2, 0xff8a00, 0x00897b, 0x1d2b5a, 0x222222, 0xc2185b, 0x5d4037];
const DULL = [0x5a4a3a, 0x6a2a2a, 0x3a4a3a, 0x4a4a5a, 0x7a6a4a, 0x2a3a5a, 0x8a7a6a, 0x4a3a4a, 0x6a6a5a];
const JEANS = [0x2a4a7a, 0x1a2a4a, 0x3a5a8a, 0x2a2a2a, 0x4a6a9a];
const SHIRTS = [[0xc8102e, 0xffffff], [0x1d2b5a, 0xffffff], [0x7a1f3d, 0x7ec8e3], [0xf4f4f4, 0x1d2b5a], [0x1e6a32, 0xffffff], [0xffd400, 0x1d2b5a], [0x6cabdd, 0xffffff], [0x111111, 0xffd400]];
const chance = (p) => Math.random() < p;
export function makePunter(kind, extra = {}) {      // (also developer mode's MODELS page)
  const id = 'p' + (++pid), rnd = Math.random, skin = R(SKINS), hen = !!extra.hen;
  delete extra.hen;
  let def;
  if (kind === 'old') {
    const grey = R(GREYS), girth = 1.1 + rnd() * 0.55, boozer = chance(0.55);
    def = { name: R(OLD_NAMES), color: '#8a5a2a', voicePitch: 0.7 + rnd() * 0.2, body: { h: 1.6 + rnd() * 0.18, sw: 0.95 + rnd() * 0.2, girth, limb: 1.0 },
      look: { skin, hair: { style: R(['horseshoe', 'horseshoe', 'combover', 'short', 'shortcurls', 'bald']), color: grey },
        beard: chance(0.45) ? { style: R(['tash', 'tash', 'full', 'stubble', 'short']), color: grey } : null,
        top: R(DULL), top2: R([0xe8e0d0, 0xf4f4f4, 0xd8c8a8]), pattern: R(['polo', 'check', null, null]), sleeves: 'long', bottom: R([0x3a3a3a, 0x4a3a2a, 0x2a2a3a, 0x5a5040, 0x6a6050]), legs: 'trousers', shoes: R([0x1a1a1a, 0x4a2a1a, 0x5a3a2a]),
        jacket: chance(0.4) ? R([0x5a4a3a, 0x7a2a2a, 0x3a4a3a, 0x8a7a5a, 0x2a2a3a]) : null, tie: chance(0.15) ? R([0x7a1f24, 0x1d2b5a, 0x2a4a2a]) : null,
        flatcap: chance(0.45) ? R([0x5a4a3a, 0x3a3a3a, 0x6a5a40, 0x4a3a2a, 0x5a5a6a]) : null, glasses: chance(0.4),
        nose: boozer ? R([0xd86a5a, 0xc85a4a, 0xe07a6a]) : null, bigNose: chance(0.4), cheeks: boozer ? 0xe08a7a : null, bushy: chance(0.55), wrinkles: true,
        gut: girth > 1.35 ? 0.9 + rnd() * 0.5 : 0, belt: chance(0.5) ? R([0x2a1a10, 0x4a2a1a]) : null, watch: chance(0.5) ? R([0xc8a848, 0xb8bcc2]) : null }, banks: OLD_BANKS };
  } else {
    const kid = kind === 'kid', fem = hen || kind === 'mum' || (kid && rnd() < 0.5), hool = kind === 'hool', lad = kind === 'lad';
    const h = kid ? 1.02 + rnd() * 0.36 : fem ? 1.56 + rnd() * 0.16 : 1.7 + rnd() * 0.2;
    const girth = kid ? 0.8 + rnd() * 0.15 : fem ? 0.85 + rnd() * 0.3 : 0.95 + rnd() * (kind === 'dad' ? 0.5 : 0.4);
    const hc = R(HAIR_C), shirt = R(SHIRTS);
    const look = { skin, top: R(BRIGHT), top2: 0xffffff, sleeves: chance(0.5) ? 'short' : 'long', bottom: R(JEANS), legs: 'trousers', shoes: R([0xf4f4f4, 0x1a1a1a, 0x2a4a8a, 0x8a1a1a]) };
    if (kid) Object.assign(look, { hair: { style: fem ? R(['ponytail', 'long', 'bob', 'bun']) : R(['short', 'spiky', 'shortcurls', 'curtains']), color: hc }, cheeks: 0xf2a0a0, pattern: R(['hoops', null, null, 'jersey']), top2: R([0xffffff, 0xffd400, 0x2a6ad8]), legs: chance(0.6) ? 'shorts' : 'trousers', sole: chance(0.6) ? R([0xffffff, 0xff5fa2, 0x39ff14]) : null, sleeves: 'short' });
    else if (fem) Object.assign(look, { hair: { style: R(['long', 'long', 'bob', 'bun', 'ponytail']), color: hc }, lips: R([0xc8102e, 0xd8506a, 0xa83a4a, 0x8a4a40]), earrings: chance(0.6) ? R([0xc8a848, 0xd8d8e0]) : null,
      jacket: chance(0.3) ? R([0x1a1a1a, 0xd8c8b0, 0x7a1f3d, 0x2a3a5a]) : null, chain: chance(0.35) ? 0xc8a848 : null, skirt: chance(0.45) ? R([0x1a1a1a, 0x7a1f3d, 0x1d2b5a, 0x5a3a6a]) : null, sleeves: R(['short', 'long', 'none']) });
    else if (hool) Object.assign(look, { hair: chance(0.5) ? { style: 'buzz', color: hc } : { style: 'bald', color: hc }, top: shirt[0], top2: shirt[1], pattern: 'jersey', logo: shirt[1], tattoo: R(['both', 'R', 'L', null]), bushy: true, cap: chance(0.3) ? 0x1a1a1a : null,
      jacket: chance(0.3) ? R([0x2a2a2a, 0x4a5a3a, 0x1d2b5a]) : null, zip: true, chain: chance(0.5) ? 0xc8a848 : null, gut: chance(0.35) ? 0.8 : 0, sole: 0xf4f4f4, beard: chance(0.4) ? { style: R(['stubble', 'goatee', 'short']), color: hc } : null });
    else if (lad) Object.assign(look, { hair: { style: R(['spiky', 'quiff', 'buzz', 'curtains', 'short', 'shortcurls']), color: hc }, cap: chance(0.2) ? R([0x1a1a1a, 0xf4f4f4, 0x1d2b5a]) : null, bucket: chance(0.12) ? R([0xd8c8a0, 0x1a1a1a, 0x7ec8e3]) : null, beanie: chance(0.1) ? R([0x1a1a1a, 0x7a1f24, 0x1d2b5a]) : null,
      ...(chance(0.35) ? { top: shirt[0], top2: shirt[1], pattern: 'jersey', logo: shirt[1] } : { pattern: R(['polo', null, null, 'hoops', 'check']) }), jacket: chance(0.25) ? R([0x1a1a1a, 0x1d2b5a, 0x7a1f24, 0x2a6a3a]) : null, zip: true,
      chain: chance(0.3) ? R([0xc8a848, 0xd8d8e0]) : null, tattoo: chance(0.25) ? R(['R', 'L', 'both']) : null, sole: 0xf4f4f4, legs: chance(0.2) ? 'shorts' : 'trousers', beard: chance(0.35) ? { style: R(['stubble', 'short', 'goatee']), color: hc } : null });
    else Object.assign(look, { hair: { style: R(['short', 'buzz', 'quiff', 'combover', 'curtains', 'shortcurls']), color: chance(0.25) ? R(GREYS) : hc }, pattern: R(['polo', 'check', 'hawaii', null, 'vstripes']), top2: R([0xffffff, 0x1d2b5a, 0xf2e8d0, 0xffd400]),      // a dad
      beard: chance(0.4) ? { style: R(['stubble', 'short', 'tash']), color: hc } : null, belt: 0x2a1a10, watch: chance(0.6) ? R([0xc8a848, 0xb8bcc2, 0x1a1a1a]) : null, gut: girth > 1.25 ? 0.7 + rnd() * 0.4 : 0, glasses: chance(0.2), sole: chance(0.5) ? 0xf4f4f4 : null, legs: chance(0.25) ? 'shorts' : 'trousers' });
    if (hen) Object.assign(look, { sash: R([0xff5fa2, 0xffffff, 0xffd400]), tiara: true, top: R([0xff5fa2, 0x111111, 0xf4f4f4, 0xc2185b]), skirt: R([0x111111, 0xff5fa2, 0xc8102e]), dress: true, lips: 0xc8102e, earrings: 0xd8d8e0 });
    def = { name: kid ? R(['Tyler', 'Mia', 'Alfie Jr', 'Poppy', 'Harley', 'Ruby', 'Jayden', 'Kai', 'Lily-Mae', 'Mason', 'Freya']) : fem ? R(['Sharon', 'Kerry', 'Donna', 'Leanne', 'Michelle', 'Tracey', 'Jade', 'Stacey', 'Bev', 'Nicola', 'Gemma']) : hool ? R(['Gaz', 'Wayne', 'Dean', 'Stevo', 'Lee', 'Big Mark', 'Kenny', 'Shaun']) : R(['Darren', 'Craig', 'Lee', 'Steve', 'Paul', 'Jason', 'Ricky', 'Danny', 'Gav', 'Rob', 'Tony Jr']),
      color: kid ? '#2aa8ff' : fem ? '#e05aa0' : hool ? '#c8102e' : '#2e7d32', voicePitch: kid ? 1.5 + rnd() * 0.25 : fem ? 1.2 + rnd() * 0.2 : 0.82 + rnd() * 0.18,
      body: { h, sw: kid ? 0.85 : fem ? 0.88 + rnd() * 0.08 : 1.0 + rnd() * 0.2, girth, limb: kid ? 0.8 : fem ? 0.9 : 0.95 + rnd() * 0.1 },
      look, banks: kid ? KID_BANKS : hool ? HOOL_BANKS : lad ? LAD_BANKS : FAM_BANKS };
  }
  Object.assign(def, { title: '', fail: '' }, extra);
  SQUAD[id] = def;
  return id;
}

// a floating "what I want" tag over someone waiting at the bar, with how patient they still are
// the Guinness logo: a black pint with its creamy head (so it's never mistaken for a lager)
const GUIN_HTML = '<span style="display:inline-block;width:11px;height:15px;vertical-align:-2px;margin-right:2px;background:linear-gradient(#f4ead0 0 26%,#120a06 26%);border:1.5px solid #d8d8d8;border-radius:2px 2px 4px 4px"></span>';
function drawGuin(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s / 64, s / 64);
  g.fillStyle = '#120a06'; g.beginPath(); g.moveTo(10, 8); g.lineTo(54, 8); g.lineTo(48, 62); g.lineTo(16, 62); g.closePath(); g.fill();
  g.fillStyle = '#f4ead0'; g.beginPath(); g.moveTo(9, 2); g.lineTo(55, 2); g.lineTo(54, 18); g.lineTo(10, 18); g.closePath(); g.fill();
  g.strokeStyle = '#e0e0e0'; g.lineWidth = 3; g.beginPath(); g.moveTo(9, 2); g.lineTo(16, 62); g.lineTo(48, 62); g.lineTo(55, 2); g.stroke();
  g.fillStyle = '#d4af37'; g.beginPath(); g.arc(32, 38, 6, 0, 7); g.fill(); g.restore();
}
function orderTag() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false })); s.renderOrder = 13; s.scale.set(0.5, 0.25, 1);
  s.draw = (o, k, kid) => { s.kid = kid; const g = c.getContext('2d'); g.clearRect(0, 0, 256, 128);
    g.fillStyle = 'rgba(10,14,30,0.85)'; g.beginPath(); g.roundRect(4, 4, 248, 120, 22); g.fill(); g.lineWidth = 6; g.strokeStyle = k > 0.5 ? '#39ff14' : k > 0.25 ? '#ffd400' : '#ff3a3a'; g.stroke();
    g.font = '64px serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; if (o.guin) drawGuin(g, 14, 22, 64); else g.fillText(o.icon, 14, 54);
    if (s.kid) { g.fillStyle = '#ff3a3a'; g.font = '900 18px Arial'; g.fillText('🧒 UNDER 18!', 150, 112); }
    g.fillStyle = '#fff'; g.font = '900 26px Arial'; g.fillText(o.name, 88, 40); g.fillStyle = '#ffd400'; g.font = '900 24px Arial'; g.fillText('£' + o.price.toFixed(2), 88, 76);
    // the patience meter: green to red as they wait; empty = FUMING (they stay, but they're furious)
    g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(14, 100, 190, 12); g.fillStyle = k > 0.5 ? '#39ff14' : k > 0.25 ? '#ffd400' : '#ff3a3a'; g.fillRect(14, 100, 190 * Math.max(0, k), 12);
    g.font = '30px serif'; g.textAlign = 'center'; g.fillText(k > 0.5 ? '🙂' : k > 0.25 ? '😠' : k > 0 ? '😡' : '🤬', 228, 106); g.textAlign = 'left';
    if (k <= 0) { g.fillStyle = '#ff3a3a'; g.font = '900 18px Arial'; g.fillText('FUMING!', 150, 76); }
    t.needsUpdate = true; };
  return s;
}

export class RunPub {
  constructor(director) { this.d = director; this.g = director.g; }
  get cast() { return this.g.cast; }

  start() {
    const g = this.g, room = g.room;
    this.diff = RP_DIFF[this.d.rpDiff] || RP_DIFF[2]; this.tips = 0;      // (a quiet night, a Friday, the cup final)
    this.money = 0; this.served = 0; this.walkouts = 0; this.wrong = 0; this.fights = 0; this.rating = 3.5; this.events = 0; this.staffServed = 0;
    this.punters = []; this.tags = new Map(); this.barTaken = new Map(); this.seatTaken = new Set(); this.life = new PunterLife(this);
    this.spawnT = 2; this.dropT = 25 + Math.random() * 20; this.eventT = (55 + Math.random() * 20) * this.diff.events; this.event = null; this.stockT = 0; this.staffT = 6;
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
    // it's a shift, not a feed: no food about, only the drinks, glasses, mugs and cups for the punters
    const its = g.items; its.drinksOnly = true; its.minFood = 0; its.respawnQueue.length = 0;
    for (const it of its.items.slice()) if (!it.dead && !it.def.drink && !it.def.prop) its.remove(it);
    this.bar = new Bar(this);
    this.tipJar = new TipJar(this);
    this.buildOrdersUI();
    this.jobs = new PubJobs(this);
    g.showBanner('RUN THE PUB', this.diff.name + ' · SERVE THE PUNTERS');
  }

  // how many of you are running the pub (multiplayer: busier, less patient punters, more going on)
  np() { const n = window.ronnieMP && window.ronnieMP.net; return n && n.connected ? 1 + n.players.size : 1; }
  // phone / computer: holding a drink, tap the person to hand it over
  tapGive(ray) { const P = this.g.player, it = P.flatHolder && P.flatHolder.held; if (!it || !isDrink(it)) return false;
    let best = null, bd = 0.45; for (const c of this.waiting()) { for (const p of [c.rag.pos('chest', new THREE.Vector3()), c.headPos(new THREE.Vector3())]) { const along = p.clone().sub(ray.origin).dot(ray.direction); if (along < 0 || along > 5) continue; const d = Math.sqrt(ray.distanceSqToPoint(p)); if (d < bd) { bd = d; best = c; } } }
    if (!best) return false; this.giveTo = best; this.giveIt = it; setTimeout(() => { this.giveTo = null; }, 300); return true; }
  // ------------------------------------------------------------------ helpers
  plate() { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.015, 18), new THREE.MeshLambertMaterial({ color: 0xffffff })));
    const food = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 6), new THREE.MeshLambertMaterial({ color: 0xc8863a })); food.scale.set(1.2, 0.5, 1); food.position.y = 0.03; g.add(food);
    const peas = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshLambertMaterial({ color: 0x5aaa2a })); peas.position.set(0.06, 0.02, 0.04); g.add(peas);
    this.g.scene.add(g); (this.added || (this.added = [])).push(g); return g; }
  freeBarSpot(near) { const spots = (this.g.room.barSpots || []).filter(s => !this.barTaken.has(s) && s.x > -14); if (!spots.length) return null; spots.sort((a, b) => Math.hypot(a.x - near.x, a.z - near.z) - Math.hypot(b.x - near.x, b.z - near.z)); return spots[Math.floor(Math.random() * Math.min(3, spots.length))]; }
  freeSeat(pred) { const all = (this.g.room.chairsAt || []).filter(s => !this.seatTaken.has(s) && pred(s)); return all.length ? R(all) : null; }
  add(kind, extra) {
    const g = this.g, id = makePunter(kind, extra), c = new SquadMember(g.scene, g.room, g.physics, id, [DOOR.x + (Math.random() - 0.5) * 0.6, DOOR.z + 0.3, Math.PI * 0.85], this.d);
    this.d.hook(c); const prev = c.onEvent; c.onEvent = (n, w) => { prev && prev(n, w); this.onPunterEvent(c, n); };
    c.active = false; c.rp = { kind, phase: 'enter', t: 0, drinks: 0, maxDrinks: kind === 'old' ? 3 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 3), stay: 150 + Math.random() * 120 };
    if (kind === 'old') c.drunk = 0.35 + Math.random() * 0.5; if (kind === 'hool' || kind === 'lad') c.drunk = 0.25 + Math.random() * 0.3;
    giveStyle(c, kind);      // (their own pace, and which hand: punteranims.js)
    g.cast.push(c); this.punters.push(c); return c;
  }
  remove(c) {
    this.release(c);
    const tag = this.tags.get(c); if (tag) { this.g.scene.remove(tag); this.tags.delete(c); }
    const i = this.g.cast.indexOf(c); if (i >= 0) this.g.cast.splice(i, 1);
    const j = this.punters.indexOf(c); if (j >= 0) this.punters.splice(j, 1);
    if (c.punterProp) { this.g.scene.remove(c.punterProp); c.punterProp = null; }      // (the phone or tenner they were holding)
    c.dispose(); delete SQUAD[c.id];
  }
  release(c) { for (const [s, w] of this.barTaken) if (w === c) this.barTaken.delete(s); if (c.rp && c.rp.seat) { this.seatTaken.delete(c.rp.seat); } }
  goHome(c) { const h = c.rp.home; c.seated = false; c.activity = null; c.faceYaw = null; c.goTo(h.x, h.z, c.drunk ? 0.95 : 1.2); c.rp.phase = 'return'; }
  settleHome(c) { const h = c.rp.home; c.state = 'idle'; if (h.seat) { c.rag.placeAt(h.x, h.z, h.yaw); c.seated = true; } c.faceYaw = h.yaw; c.activity = null; c.rp.phase = 'settled'; c.rp.clipT = 0.2; }     // (what they get up to there: punterlife.js)
  // off home: a wave goodbye first (not if they're storming out or thrown out)
  leave(c, line, wave = !!line) { this.release(c); c.seated = false; c.activity = null; c.faceYaw = null; if (line) c.say(line, 4); c.rp.phase = 'leaving'; c.rp.ctl = null; const tag = this.tags.get(c); if (tag) tag.visible = false;
    if (wave && !c.down) { setClip(c, 's_wave_bye', { restart: true }); c.rp.leaveT = 1.3; } else { c.rp.leaveT = 0; clearClip(c); c.goTo(DOOR.x, DOOR.z + 0.4, 0.95); } }
  pay(amount, where, label) { this.money += amount; this.g.words.show(label || ('+£' + amount.toFixed(2)), where, '#39ff14', 0.11, 1.2); sfx('coin', where, 0.6); }

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
    if (this.tipJar) this.tipJar.update(dt);
    this.life.update(dt);
    // staff at their posts (knocked about? back to them)
    for (const c of this.cast) {
      if (!c.rpJob || c.down) continue;
      if (c.rpJob === 'restaurant') { this.lewis(c, dt); continue; }
      if (c.state === 'idle' && c.rag.mode === 'anim' && Math.hypot(c.pos.x - c.rpSpot[0], c.pos.z - c.rpSpot[1]) > 0.5) c.backTo(c.rpSpot[0], c.rpSpot[1], c.rpSpot[2]);
      c.faceYaw = c.rpSpot[2]; c.active = false; c.stayPut = true;
      if (c.id === 'ben' && Math.random() < dt / 25) { c.say(R(['SERVICE!', 'Two scampi, one pie, table nine!', 'Who ordered the Ronnie Platter? ...Ronnie did.', 'CHIPS ARE UP!', 'Ronnie, get your hands OFF the pass!']), 3); sfx('bell', c.pos, 0.6); }
    }
    this.bar.update(dt); this.guide(); this.drawOrders(dt);
    // new punters: fill up to 6 early on, then keep it busy (up to 10)
    const np = this.np(), elapsed = 360 - (this.d.timeLeft || 0), cap = Math.min(10 + 4 * (np - 1), 4 + Math.floor(elapsed / 30) + 2 * (np - 1));
    if ((this.spawnT -= dt) <= 0) {
      this.spawnT = (5 + Math.random() * 7) / Math.pow(np, 0.7) * this.diff.spawn;
      const n = this.punters.filter(p => p.rp.kind !== 'hool').length;
      if (n < cap) { const r = Math.random(); if (r < 0.55) this.arrive('old'); else if (r < 0.78 && n < cap - 2) this.arriveFamily(); else this.arriveLads(); }
    }
    // the rest of the squad drop in for a bit
    if ((this.dropT -= dt) <= 0) { this.dropT = 40 + Math.random() * 40; this.dropIn(); }
    for (const c of this.cast) if (c.dropIn) this.dropInTick(c, dt);
    // the punters
    for (const c of this.punters.slice()) this.punterTick(c, dt, P);
    // the other staff don't serve for you (it's your shift): they just give you jobs (see pubjobs.js) and nag
    if ((this.staffT -= dt) <= 0) { this.staffT = 14 + Math.random() * 10;
      const wait = this.punters.filter(c => c.rp.phase === 'waiting' && c.rp.wait > 20)[0], st = wait && R(this.cast.filter(s => s.rpJob === 'bar' && !s.down));
      if (st) st.say(R([`Ron! ${wait.name}'s been waiting AGES!`, 'Ronnie, customers! CUSTOMERS!', 'Don\'t look at me, Ron, I\'m on my break.', 'Chop chop, Ronnie!']), 3); }
    if (this.jobs) this.jobs.update(dt);
    // events
    if (!this.event && (this.eventT -= dt) <= 0) { this.eventT = (45 + Math.random() * 30) / Math.sqrt(this.np()) * this.diff.events; this.startEvent(); }
    if (this.event) this.eventTick(dt);
    this.rating = THREE.MathUtils.clamp(this.rating, 0, 5);
  }

  arrive(kind, extra) {
    const c = this.add(kind, extra), home = this.pickHome(c, kind);
    c.rp.home = home; c.rp.thirst = 4 + Math.random() * 14;
    c.rp.enterT = 1.2 + Math.random() * 0.8; setClip(c, Math.random() < 0.3 ? 's_wave_hi' : 's_enter');      // (in through the door: a look round the place first, or a wave to someone they know)
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
    this.life.tick(c, dt);      // (what they're doing with themselves: punterlife.js)
    if (c.down) return;
    if (rp.ctl && rp.phase === 'settled') return;      // (arguing, or singing along: not off to the bar or home just now)
    switch (rp.phase) {
      case 'enter': case 'return':
        if (rp.enterT > 0) { if ((rp.enterT -= dt) <= 0) { clearClip(c); c.goTo(rp.home.x, rp.home.z, c.drunk ? 0.95 : 1.2); } break; }
        if (c.state === 'idle' && c.backTo(c.rp.home.x, c.rp.home.z, c.rp.home.yaw, !!c.rp.home.seat)) this.settleHome(c);
        break;
      case 'settled':
        if (rp.kind !== 'hool' && (rp.t > rp.stay || rp.drinks >= rp.maxDrinks) && rp.kind !== 'kid') { if (rp.family) { if (rp.family[0] === c) for (const f of rp.family) this.leave(f, f === c ? 'Right, come on, kids. Home.' : null); } else this.leave(c, R(['Night all.', 'Same time tomorrow.', 'Right. One for the road. No. Home.'])); break; }
        if ((rp.thirst -= dt) <= 0) {
          const spot = rp.home.bar || this.freeBarSpot(c.pos); if (!spot) { rp.thirst = 4; break; }
          this.barTaken.set(spot, c); rp.spot = spot; c.seated = false; c.activity = null; c.faceYaw = null; clearClip(c);
          if (rp.home.bar) this.order(c); else { c.goTo(spot.x, spot.z, c.drunk ? 1.0 : 1.25); rp.phase = 'toBar'; }
        }
        break;
      case 'toBar':
        if (c.state === 'idle' && c.backTo(rp.spot.x, rp.spot.z, rp.spot.yaw)) this.order(c);
        break;
      case 'waiting': {
        rp.wait += dt; const k = 1 - rp.wait / rp.patience;
        const tag = this.tags.get(c); if (tag) { const h = c.headPos(new THREE.Vector3()); tag.position.set(h.x, h.y + 0.42, h.z); if ((rp.tagT = (rp.tagT || 0) - dt) <= 0) { rp.tagT = 0.25; tag.draw(rp.order, k, rp.kidBooze); } }
        c.faceYaw = rp.spot.yaw; c.activity = null;      // (their impatience shows in how they wait: punterlife.js queueClip)
        if (k < 0.35 && !rp.moaned) { rp.moaned = true; c.say(R(['Any chance of a drink?!', 'HELLO? Anyone serving?', 'I\'ll die of thirst here.', 'Ronnie, stop eating and SERVE.']), 4); }
        // handed over (held near them) or thrown to them
        const held = [...(P.hands || []).map(h => h.held), P.flatHolder && P.flatHolder.held].filter(isDrink);
        const chest = c.rag.pos('chest', new THREE.Vector3());
        for (const it of held) {
          let ok;
          if (P.flatMode) ok = this.giveTo === c && it === this.giveIt;                                                  // (phone: you tapped them)
          else ok = it.pos.distanceTo(chest) < 0.6;                                                                     // VR: hold it out to them
          if (ok) { this.deliver(c, it, null, false); return; } }
        { const head = c.headPos(new THREE.Vector3()); for (const it of this.g.items.items) if (isDrink(it) && !it.heldBy && !it.shelf && (it.pos.distanceTo(chest) < 0.8 || it.pos.distanceTo(head) < 0.6)) { this.deliver(c, it, null, true); return; } }      // (thrown at them)
        // out of patience: they don't leave, they just get angrier and angrier (and louder), right there at the bar
        if (rp.wait >= rp.patience) { if (!rp.fuming) { rp.fuming = true; this.walkouts++; this.rating -= 0.25; sfx('aww', c.pos, 0.5); c.say('angry', 4); }
          this.rating -= dt * 0.006; if ((rp.moanT = (rp.moanT || 6) - dt) <= 0) { rp.moanT = 7 + Math.random() * 5; c.say(R(['STILL WAITING, RONNIE!', 'Any time TONIGHT, mate!', 'I\'ve grown a beard waiting here!', 'Is anyone actually WORKING?', 'I could\'ve brewed it myself by now!']), 3); } }
        break;
      }
      case 'served':
        if ((rp.servedT -= dt) <= 0) { if (rp.home.bar) { rp.phase = 'settled'; c.activity = 'drink'; c.faceYaw = rp.home.yaw; } else { this.release(c); if (rp.home.bar) this.barTaken.set(rp.home.bar, c); this.goHome(c); } rp.thirst = 30 + Math.random() * 35; }
        break;
      case 'leaving':
        if (rp.leaveT > 0) { if ((rp.leaveT -= dt) <= 0) { clearClip(c); c.goTo(DOOR.x, DOOR.z + 0.4, 0.95); } break; }
        if (c.state === 'idle' || Math.hypot(c.pos.x - DOOR.x, c.pos.z - DOOR.z) < 0.9) this.remove(c);
        break;
      case 'brawl': case 'riot': case 'sing': break;      // (run by the event)
    }
  }
  order(c) {
    const rp = c.rp, kid = rp.kind === 'kid';
    let key = R(MENU[rp.kind] || MENU.old); rp.kidBooze = false;
    if (kid && Math.random() < 0.3) { key = R(['lager', 'cider', 'guinness']); rp.kidBooze = true; }       // a kid trying their luck
    const o = ORDERS[key];
    rp.clipT = 0; rp.gotWallet = false;
    rp.order = o; rp.orderKey = key; rp.wait = 0; rp.patience = (rp.kind === 'old' ? 46 : 56) / (1 + 0.12 * (this.np() - 1)) * this.diff.patience; rp.moaned = false; rp.phase = 'waiting';
    c.state = 'idle'; c.faceYaw = rp.spot.yaw; c.say(rp.kidBooze ? R(['Pint of lager please. I\'m eighteen. Honest.', 'A cider. For my... dad.', 'Can I get a GUINNESS? I\'ve got ID. At home.']) : R(o.lines), 4);
    let tag = this.tags.get(c); if (!tag) { tag = orderTag(); this.tags.set(c, tag); this.g.scene.add(tag); } tag.visible = true; rp.tagT = 0;
  }
  dropTag(c) { const tag = this.tags.get(c); if (tag) tag.visible = false; }
  deliver(c, it, byStaff = null, thrown = false) {
    const rp = c.rp, o = rp.order, P = this.g.player, where = c.headPos(new THREE.Vector3()).add({ x: 0, y: 0.3, z: 0 });
    if (it) { for (const h of P.hands || []) if (h.held === it) h.held = null; if (P.flatHolder && P.flatHolder.held === it) P.flatHolder.held = null; it.heldBy = null; this.g.items.remove(it); }
    const quick = 1 - rp.wait / rp.patience;
    if (byStaff) { this.staffServed++; this.pay(o.price, where, '+£' + o.price.toFixed(2) + ' (' + byStaff.name + ')'); this.rating += 0.03; }
    else if (rp.kidBooze && it && it.def.booze) {                       // you served a kid alcohol
      this.kidBooze = (this.kidBooze || 0) + 1; track('kidbooze'); this.money -= 10; this.rating -= 0.45; this.g.words.show('SERVED A KID BOOZE! -£10', where, '#ff3a3a', 0.11, 1.8); sfx('sadviolin', where, 0.6);
      c.say(R(['YESSS! Wait till I tell Tyler!', 'Cheers, mate! Hic.', 'Don\'t tell my mum.']), 4); this.g.showBanner('YOU SERVED A KID!', 'CHECK THEIR AGE: SOFT DRINKS ONLY');
      if (rp.family) { const mum = rp.family.find(f => f.rp.kind === 'mum' || f.rp.kind === 'dad'); mum && setTimeout(() => !mum.disposed && mum.say('Did you just give my CHILD a drink?! I want the manager!', 5), 1500); }
    } else if (rp.kidBooze && it && it.def.drink && !it.def.booze) {    // a kid after booze, given a soft drink instead: well done
      this.served++; this.carded = (this.carded || 0) + 1; track('carded'); track('served'); this.pay(2.8 + 2, where, '+£4.80 GOOD CALL!'); this.rating += 0.15; c.say(R(['Awww. Fine. Thanks.', 'Worth a try.', 'Is there sugar in it at least?']), 3);
    } else if (!it || o.ok(it)) {
      const tip = thrown ? 0 : Math.round(Math.max(0, quick) * 3 * this.diff.tip * 10) / 10, pay = thrown ? o.price * 0.5 : o.price + tip;
      if (tip > 0) { this.tips += tip; this.tipJar && this.tipJar.add(tip); track('tips', tip); } track('served');      // (into the tip jar on the bar)
      this.served++; this.pay(pay, where, thrown ? `+£${pay.toFixed(2)} (THROWN AT THEM)` : tip > 0.4 ? `+£${o.price.toFixed(2)} +£${tip.toFixed(2)} TIP` : null);
      if (thrown) { this.thrown = (this.thrown || 0) + 1; this.rating -= 0.08; c.say(R(['Did you just THROW that at me?!', 'Is this how you serve everyone?!', 'Half of it\'s on my shirt now!', 'I\'m leaving a review about this.', 'Charming. Absolutely charming.']), 4); }
      else { this.rating += 0.05 + quick * 0.12; c.say('thanks', 3); }
    } else { this.wrong++; this.served++; const pay = o.price * (thrown ? 0.25 : 0.5); this.pay(pay, where, '+£' + pay.toFixed(2) + ' (WRONG DRINK)'); this.rating -= 0.1; c.say(R(['That\'s not what I asked for!', 'I said ' + o.name.toLowerCase() + '! ...go on then.', 'Are you even listening, Ronnie?']), 4); }
    rp.drinks++; rp.phase = 'served'; rp.servedT = 1.8; this.dropTag(c); rp.fuming = false;
    if (!c.prop) { c.prop = makeProp('pint', c.rag.height / 1.68); this.g.scene.add(c.prop); (this.added || (this.added = [])).push(c.prop); }
    c.activity = null;
    // how they take it: a big swig, a shrug at the wrong one, outrage at being pelted, a kid's fist pump
    const how = thrown ? 'a_wide' : rp.kidBooze ? (it && it.def.booze ? 's_goal' : 'a_shrug') : it && !byStaff && !o.ok(it) ? 'a_shrug' : quick > 0.5 ? 's_cheers' : 's_sip';
    this.life.react(c, how); rp.servedT = Math.max(rp.servedT, 2.2);
  }

  // ------------------------------------------------------------------ what to do next: the arrow and the orders list
  waiting() { return this.punters.filter(c => c.rp.phase === 'waiting').sort((a, b) => (b.rp.wait / b.rp.patience) - (a.rp.wait / a.rp.patience)); }
  guide() {
    const bar = this.bar, held = bar.held(), want = {}, LOGO = { guinness: '🍺', lager: '🍻', cider: '🍏', wine: '🍷', coffee: '☕', cola: '🥤', fanta: '🍊', monstor: '⚡' };
    for (const c of this.waiting()) { const key = c.rp.kidBooze ? 'cola' : c.rp.orderKey, o = ORDERS[key]; if (!o) continue;
      if (held.some(i => o.ok(i))) continue; let st = o.from; if (o.make && held.some(i => i.type === o.vessel)) st = o.make === 'gun' ? 'gun' : o.make; want[st] = want[st] || LOGO[key]; }
    bar.setMarks(want);
    const next = this.waiting().find(c => held.some(i => (c.rp.kidBooze ? ORDERS.cola : c.rp.order).ok(i) || (c.rp.kidBooze && i.def.drink && !i.def.booze))) || this.waiting()[0]; if (!next) { bar.arrowAt = null; return; }
    const o = next.rp.kidBooze ? ORDERS.cola : next.rp.order;
    if (held.some(i => o.ok(i) || (next.rp.kidBooze && i.def.drink && !i.def.booze))) { bar.arrowAt = next.headPos(new THREE.Vector3()).add({ x: 0, y: 0.25, z: 0 }); return; }   // got it: take it to them
    bar.arrowAt = null;                 // (the stations have their own markers: make them in any order you like)
  }
  buildOrdersUI() {
    // phone / PC: a little table of orders under the HUD
    const el = this.ordersEl = document.createElement('div'); el.id = 'rp-orders';
    el.style.cssText = 'position:fixed;right:max(10px,env(safe-area-inset-right));top:62px;z-index:12;width:min(230px,52vw);background:rgba(10,14,40,0.82);border:3px solid #ffd400;border-radius:14px;padding:6px 8px;font:700 12px Arial,sans-serif;color:#fff;pointer-events:none';
    document.body.appendChild(el);
    // (its header folds the list away, and back: remembered on this device)
    try { this.minOrders = localStorage.getItem('rs_rp_min_orders') === '1'; } catch (e) { this.minOrders = false; }
    el.addEventListener('pointerdown', (e) => { if (!e.target.closest('[data-min]')) return; e.preventDefault(); e.stopPropagation();
      this.minOrders = !this.minOrders; try { localStorage.setItem('rs_rp_min_orders', this.minOrders ? '1' : ''); } catch (er) {} this.ordersT = 0; this.drawOrders(0); window.__layoutHud && window.__layoutHud(); });
    // VR: the same list on your left wrist
    const cv = this.wristCv = document.createElement('canvas'); cv.width = 256; cv.height = 320; this.wristTex = new THREE.CanvasTexture(cv); this.wristTex.colorSpace = THREE.SRGBColorSpace;
    this.wrist = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.1375), new THREE.MeshBasicMaterial({ map: this.wristTex, transparent: true, depthTest: false })); this.wrist.renderOrder = 20; this.wrist.visible = false; this.g.scene.add(this.wrist);
  }
  drawOrders(dt) {
    if ((this.ordersT = (this.ordersT || 0) - dt) > 0) return; this.ordersT = 0.25;
    const tight = document.body.classList.contains('rp-tight'), all = this.waiting(), list = all.slice(0, tight ? 3 : 6), vr = !this.g.player.flatMode;
    const rows = list.map((c, i) => { const rp = c.rp, o = rp.order, k = 1 - rp.wait / rp.patience; return { icon: o.icon, guin: o.guin, name: o.name, who: c.name, k, kid: rp.kidBooze, how: i === 0 ? (rp.kidBooze ? (tight ? 'a KID: soft drink' : 'they\'re a KID: give them a soft drink') : (tight ? '' : o.how)) : '' }; });
    this.ordersEl.style.display = vr ? 'none' : 'block';
    const head = `<div data-min="1" style="display:flex;justify-content:space-between;align-items:center;gap:6px;min-height:22px;pointer-events:auto;cursor:pointer;font:900 13px Arial Black,Arial;color:#ffd400;margin-bottom:${this.minOrders ? 0 : 3}px"><span>🧾 ORDERS${this.minOrders ? ` (${all.length})` : ''}</span><b style="font:900 13px Arial;color:#fff;background:rgba(255,255,255,0.14);border-radius:7px;padding:1px 7px">${this.minOrders ? '▸' : '▾'}</b></div>`;
    // (rebuilt only when what it says changes: rebuilt four times a second, its pictures redrew and it flickered)
    let html; if (this.minOrders) { html = head; } else html = head + (rows.length ? rows.map(r => `<div style="margin:3px 0"><div style="display:flex;justify-content:space-between"><span>${r.guin ? GUIN_HTML : r.icon} ${r.name}${r.kid ? ' <b style="color:#ff5a5a">🧒</b>' : ''}</span><span style="color:#c9d3ff">${r.who}</span></div><div style="height:4px;background:rgba(255,255,255,0.2);border-radius:2px"><div style="height:4px;width:${Math.max(0, r.k) * 100}%;background:${r.k > 0.5 ? '#39ff14' : r.k > 0.25 ? '#ffd400' : '#ff3a3a'};border-radius:2px"></div></div>${r.how ? `<div style="color:#9fe;font-size:11px">➜ ${r.how}</div>` : ''}</div>`).join('') : '<div style="color:#c9d3ff">Nobody waiting. Wipe the bar.</div>');
    if (!this.minOrders && tight && all.length > list.length) html += (`<div style="color:#c9d3ff;font-size:11px;margin-top:2px">+${all.length - list.length} more waiting</div>`);
    if (this.ordersEl.__html !== html) { this.ordersEl.__html = html; this.ordersEl.innerHTML = html; }
    // VR wrist
    const P = this.g.player, h = (P.hands || []).find(h => h.handedness === 'left' && h.tracked);
    this.wrist.visible = vr && !!h; if (!this.wrist.visible) return;
    const g = this.wristCv.getContext('2d'); g.clearRect(0, 0, 256, 320); g.fillStyle = 'rgba(10,14,40,0.9)'; g.beginPath(); g.roundRect(4, 4, 248, 312, 18); g.fill(); g.lineWidth = 5; g.strokeStyle = '#ffd400'; g.stroke();
    g.fillStyle = '#ffd400'; g.font = '900 24px Arial'; g.textAlign = 'center'; g.fillText('🧾 ORDERS', 128, 34); g.textAlign = 'left';
    rows.forEach((r, i) => { const y = 64 + i * 42; g.fillStyle = r.kid ? '#ff8a8a' : '#fff'; g.font = '700 20px Arial'; if (r.guin) { drawGuin(g, 12, y - 14, 22); g.fillText(r.name, 40, y); } else g.fillText(`${r.icon} ${r.name}`, 14, y); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(14, y + 8, 228, 6); g.fillStyle = r.k > 0.5 ? '#39ff14' : r.k > 0.25 ? '#ffd400' : '#ff3a3a'; g.fillRect(14, y + 8, 228 * Math.max(0, r.k), 6); });
    if (rows[0]) { g.fillStyle = '#9fe'; const t = '➜ ' + rows[0].how; let f = 15; do { g.font = `700 ${f}px Arial`; f--; } while (g.measureText(t).width > 228 && f > 9); g.fillText(t, 14, 300); }
    this.wristTex.needsUpdate = true;
    h.grip.updateMatrixWorld(true); this.wrist.position.set(0, 0.03, 0.09).applyMatrix4(h.grip.matrixWorld); this.wrist.quaternion.setFromRotationMatrix(h.grip.matrixWorld).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)));
  }

  // ------------------------------------------------------------------ the squad drop in
  dropIn() {
    const g = this.g, pool = Object.keys(SQUAD).filter(id => !id.startsWith('p') && !SQUAD[id].playerOnly && !['lewis', 'ben', 'aidan', 'connor', 'chloe', 'tommy'].includes(id) && !this.cast.some(c => c.id === id));
    if (!pool.length || this.cast.filter(c => c.dropIn).length >= 2) return;
    const id = R(pool), c = new SquadMember(g.scene, g.room, g.physics, id, [DOOR.x, DOOR.z + 0.3, Math.PI], this.d);
    this.d.hook(c); g.cast.push(c); c.dropIn = { t: 60 + Math.random() * 60, phase: 'in' }; c.active = false;
    const b = this.freeBarSpot(c.pos); if (b) { this.barTaken.set(b, c); c.dropIn.spot = b; c.goTo(b.x, b.z, 1.0); }
    setTimeout(() => c.say(R(['Alright Ronnie! Didn\'t know you worked here!', 'RONNIE! Pint please, mate. On the house?', 'Ron! Look at you, behind a bar. Brave.', 'Heard you were working. Had to see it.']), 4), 1200);
  }
  dropInTick(c, dt) {
    const d = c.dropIn; d.t -= dt; if (c.down) return;
    if (d.phase === 'in' && c.state === 'idle' && (!d.spot || c.backTo(d.spot.x, d.spot.z, d.spot.yaw))) { d.phase = 'here'; if (d.spot) c.faceYaw = d.spot.yaw; c.activity = 'drink'; }
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
    const g = this.g, r0 = Math.random(); this.events++;
    // the newer trouble: a spilt pint, blocked loos, the fuse going, a hen party
    if (r0 < 0.45) { const k = R(['spill', 'loo', 'power', 'hen']); if (this.startEvent2(k)) return; }
    const r = Math.random();
    if (r >= 0.38 && r < 0.6 && this.life.startArgue()) return;      // an argument at the tables (punterlife.js)
    if (r < 0.45) {                                   // a fight: three lads squaring up in the middle of the pub
      const spot = { x: -1.8 + Math.random() * 2.5, z: -1.5 + Math.random() * 3 }, hs = [this.add('hool'), this.add('hool'), this.add('hool')];
      hs.forEach((c, i) => { c.rp.phase = 'brawl'; c.rp.ctl = 'fight'; const a = i / 3 * Math.PI * 2; c.rp.brawlAt = { x: spot.x + Math.sin(a) * 0.75, z: spot.z + Math.cos(a) * 0.75 }; c.goTo(c.rp.brawlAt.x, c.rp.brawlAt.z, 1.6); });
      this.event = { kind: 'fight', t: 0, who: hs, center: spot, knocked: new Set() };
      g.showBanner('IT\'S KICKING OFF!', 'BREAK UP THE FIGHT');
      sfx('brawl', null, 0.8);
    } else if (r < 0.75) {                            // an old boy singing at the bar
      const c = this.punters.find(p => p.rp.kind === 'old' && !p.down && (p.rp.phase === 'settled' || p.rp.phase === 'waiting'));
      if (!c) { this.event = null; return this.startEvent(); }
      this.dropTag(c); this.release(c); c.rp.phase = 'sing'; c.rp.ctl = 'sing'; c.activity = null; c.seated = false; c.faceYaw = Math.random() * 6.28; c.drunk = 1;
      this.event = { kind: 'singer', t: 0, who: [c], lineT: 0 };
      g.showBanner(c.name.toUpperCase() + ' IS SINGING', 'SHUT HIM UP');
    } else {                                          // a kid running riot
      const kid = this.punters.find(p => p.rp.kind === 'kid' && !p.down);
      if (!kid) { const c = this.arriveFamilyKid(); if (!c) { this.event = null; return; } }
      const k2 = this.punters.find(p => p.rp.kind === 'kid' && !p.down);
      k2.rp.phase = 'riot'; k2.rp.ctl = 'riot'; k2.seated = false; setClip(k2, 'k_tantrum'); this.event = { kind: 'kid', t: 0, who: [k2], hopT: 0 };
      g.showBanner(k2.name.toUpperCase() + ' IS RUNNING RIOT', 'CATCH THE KID');
    }
  }
  startEvent2(kind) {
    const g = this.g, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    if (kind === 'spill') { const sp = R(this.g.room.tommySpots.filter(s => s.x > -9.5 && s.x < 2 && s.y < 7.8 && s.y > -8.8)); if (!sp) return false;
      const grp = new THREE.Group(); const pud = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshLambertMaterial({ color: 0x8a5a1a, transparent: true, opacity: 0.8, depthWrite: false })); pud.rotation.x = -Math.PI / 2; pud.position.y = 0.02; pud.scale.set(1, 0.7, 1); grp.add(pud);
      const sign = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 4, 1, true), new THREE.MeshLambertMaterial({ color: 0xffd400, side: THREE.DoubleSide })); sign.position.set(0.5, 0.28, 0); sign.rotation.y = Math.PI / 4; grp.add(sign);
      const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.15, 12), new THREE.MeshLambertMaterial({ color: 0xdfe8ee, transparent: true, opacity: 0.6 })); gl.rotation.z = Math.PI / 2; gl.position.set(-0.2, 0.05, 0.1); grp.add(gl);
      grp.position.set(sp.x, 0, sp.y); g.scene.add(grp);
      this.event = { kind, t: 0, at: V3(sp.x, 0, sp.y), need: 2.5, hold: 0, limit: 45, grp, who: [] }; g.showBanner('A PINT\'S GONE OVER!', 'MOP IT UP BEFORE SOMEONE SLIPS'); sfx('shatter', this.event.at, 0.7); return true; }
    if (kind === 'loo') { this.event = { kind, t: 0, at: V3(-7.97, 0, -11.8), need: 3, hold: 0, limit: 50, who: [] }; g.showBanner('THE TOILETS ARE BLOCKED!', 'GET IN THERE WITH THE PLUNGER'); sfx('clog', null, 0.6); return true; }
    if (kind === 'power') { const hemi = g.room.hemi; this.event = { kind, t: 0, at: V3(6.8, 0, -2.0), need: 2, hold: 0, limit: 40, who: [], hemi0: hemi ? hemi.intensity : null };
      if (hemi) hemi.intensity *= 0.3; const fb = new THREE.Group(); const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.12), new THREE.MeshLambertMaterial({ color: 0x7a7f87 })); box.position.y = 1.45; fb.add(box);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 0.06), new THREE.MeshLambertMaterial({ color: 0x222222 })); post.position.y = 0.65; fb.add(post); const front = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.42), new THREE.MeshBasicMaterial({ color: 0xffd400 })); front.position.set(0, 1.45, 0.061); fb.add(front);
      fb.position.set(6.8 + 0.6, 0, -2.0); g.scene.add(fb); this.event.grp = fb; g.showBanner('THE FUSE HAS GONE!', 'RESET IT IN THE STAFF ROOM'); sfx('lightsout', null, 1); return true; }
    if (kind === 'hen') { const who = []; for (let i = 0; i < 4; i++) setTimeout(() => { const c = this.arrive('mum', { hen: true }); c.rp.thirst = 1 + i * 0.6; c.hen = true; who.push(c); if (i === 0) c.say('WOOOO! HEN DO! FOUR PROSECCOS!', 4); }, i * 500);
      this.event = { kind, t: 0, who, limit: 80 }; g.showBanner('HEN PARTY!', 'FOUR OF THEM. ALL WANT SERVING NOW.'); sfx('cheer', null, 0.7); return true; }
    return false;
  }
  // the ones you sort out by going there and staying put for a moment (mop / plunger / reset the fuse)
  holdEvent(dt) { const e = this.event, g = this.g, P = g.player, d = Math.hypot(P.head.x - e.at.x, P.head.z - e.at.z);
    if (d < 1.3) { e.hold += dt; if (Math.floor(e.hold * 3) !== Math.floor((e.hold - dt) * 3)) { sfx(e.kind === 'power' ? 'breaker' : e.kind === 'loo' ? 'plunger' : 'mop', e.at, 0.5); g.words.show(e.kind === 'spill' ? '*MOP MOP*' : e.kind === 'loo' ? '*PLUNGE*' : '*CLICK*', e.at.clone().setY(1.4), '#29b6ff', 0.07, 0.5); } }
    else e.hold = Math.max(0, e.hold - dt);
    if (e.hold >= e.need) { const at = P.head.clone().addScaledVector(P.fwd, 1).add({ x: 0, y: 0.3, z: 0 });
      this.pay(e.kind === 'spill' ? 4 : 6, at, e.kind === 'spill' ? 'MOPPED! +£4' : e.kind === 'loo' ? 'UNBLOCKED! +£6' : 'LIGHTS BACK ON! +£6'); this.rating += 0.25; this.endEvent2(); return; }
    this.rating -= dt * (e.kind === 'power' ? 0.03 : 0.015);
    if (e.t > e.limit) { this.rating -= 0.4; g.showBanner(e.kind === 'spill' ? 'SOMEONE SLIPPED IN IT' : e.kind === 'loo' ? 'THE TOILETS FLOODED' : 'THEY DRANK IN THE DARK', 'THE PUNTERS ARE NOT HAPPY'); this.endEvent2(); } }
  endEvent2() { const e = this.event; if (e.grp) this.g.scene.remove(e.grp); if (e.hemi0 !== null && e.hemi0 !== undefined && this.g.room.hemi) this.g.room.hemi.intensity = e.hemi0; this.event = null; }
  arriveFamilyKid() { this.arriveFamily(); return this.punters.find(p => p.rp.kind === 'kid'); }
  eventTick(dt) {
    const e = this.event, g = this.g, P = g.player; e.t += dt;
    if (e.kind === 'spill' || e.kind === 'loo' || e.kind === 'power') return this.holdEvent(dt);
    if (e.kind === 'argue') return this.life.argueTick(e, dt);
    if (e.kind === 'hen') { const live = e.who.filter(c => !c.disposed); if (e.who.length === 4 && live.every(c => c.rp.drinks > 0)) { this.pay(12, P.head.clone().addScaledVector(P.fwd, 1).add({ x: 0, y: 0.3, z: 0 }), 'HEN PARTY SORTED! +£12'); this.rating += 0.4; this.event = null; }
      else if (e.t > e.limit) { this.rating -= 0.3; this.event = null; } return; }
    if (e.kind === 'fight') {
      const live = e.who.filter(c => !c.disposed && !e.knocked.has(c));
      this.life.fightTick(e, dt);      // (the proper exchanges: punterlife.js)
      this.rating -= dt * 0.035;
      if (!live.length) { this.life.endFight(e); this.fights++; track('fights'); this.pay(20, P.head.clone().addScaledVector(P.fwd, 1).add({ x: 0, y: 0.3, z: 0 }), 'FIGHT BROKEN UP! +£20'); this.rating += 0.6; g.showBanner('FIGHT BROKEN UP!', 'THE LANDLORD IS PROUD'); this.event = null; return; }
      if (e.t > 50) { this.life.endFight(e); this.rating -= 0.8; this.money = Math.max(0, this.money - 40); g.showBanner('THEY SMASHED THE PLACE UP', '-£40 IN BROKEN GLASSES'); for (const c of live) this.leave(c, R(['This pub\'s a DUMP!', 'We\'re going!'])); this.event = null; }
    } else if (e.kind === 'singer') {
      const c = e.who[0]; if (c.disposed) { this.event = null; return; }
      if (!c.down) { this.life.singTick(e, dt); if ((e.lineT -= dt) <= 0) { e.lineT = 3.2; c.say(R(['♪ SWEET CAROLINE! BUM BUM BUM! ♪', '♪ Sooo here it is, merry Christmas! ♪ (it\'s July)', '♪ I\'M FOREVER BLOWING BUBBLES! ♪', '♪ Come on Eileen! ♪ ...Eileen? EILEEN?', '♪ We are the champions! ♪ ...of the pub quiz, 1991!']), 5); sfx('anthem', c.pos, 0.25); } }
      this.rating -= dt * 0.025;
      if (e.t > 40 && !c.down) { this.life.endSing(e, false); c.knockOut('hit'); c.say('zzz', 1); this.leaveLater(c, 5); this.event = null; g.showBanner(c.name.toUpperCase() + ' PASSED OUT', 'HE\'LL BE BACK TOMORROW'); }
    } else if (e.kind === 'kid') {
      const c = e.who[0]; if (c.disposed) { this.event = null; return; }
      if (!c.down && c.state !== 'walk') { const s = R(this.g.room.tommySpots.filter(s => s.x > -9.5 && s.y < 7.8 && s.y > -8.8)); if (s) c.goTo(s.x, s.y, 2.4); c.activity = 'tantrum'; if (Math.random() < 0.5) c.say(R(['WHEEEE!', 'CAN\'T CATCH ME!', 'I WANT CHIPS!', 'NYEEEEOWWW!']), 2); }
      this.rating -= dt * 0.015;
      const caught = Math.hypot(c.pos.x - P.head.x, c.pos.z - P.head.z) < 1.0 || c.down;
      if (caught || e.t > 45) { c.say(caught ? 'Awww. Fine.' : 'MUUUM! I\'m tired!', 3); c.rp.phase = 'enter'; c.rp.ctl = null; clearClip(c); c.goTo(c.rp.home.x, c.rp.home.z, 1.0); if (caught) { this.rating += 0.3; this.pay(5, P.head.clone().addScaledVector(P.fwd, 1).add({ x: 0, y: 0.3, z: 0 }), 'KID CAUGHT! +£5'); } this.event = null; }
    }
  }
  leaveLater(c, t) { setTimeout(() => { if (!c.disposed && this.punters.includes(c)) this.leave(c, null, false); }, t * 1000); }
  onPunterEvent(c, name) {
    if (name !== 'ko' || !c.rp) return;
    const e = this.event;
    if (e && e.kind === 'fight' && e.who.includes(c) && !e.knocked.has(c)) { e.knocked.add(c); this.leaveLater(c, 3.5); setTimeout(() => !c.disposed && c.say(R(['Alright! ALRIGHT! I\'m going!', 'I\'m BARRED? From THIS dump?', 'You\'ll be hearing from my mum!']), 4), 2600); }
    else if (e && e.kind === 'singer' && e.who[0] === c) { this.life.endSing(e, true); this.leaveLater(c, 4); setTimeout(() => !c.disposed && c.say('Alright! I\'ll go home! ♪ ...Sweet Carol— ♪', 4), 2600); this.pay(5, c.headPos(new THREE.Vector3()), 'PEACE AND QUIET! +£5'); this.rating += 0.3; this.event = null; }
    else if (c.rp.kind !== 'hool') { this.rating -= 0.15; }              // knocking out your customers is bad for business
  }

  // ------------------------------------------------------------------ the report
  hudState(time) { const stars = '★'.repeat(Math.floor(this.rating)) + (this.rating % 1 >= 0.5 ? '½' : ''); return { time, money: this.money, served: this.served, stars: stars || '0★', waiting: this.punters.filter(c => c.rp.phase === 'waiting').length }; }
  hud() {
    const stars = '★'.repeat(Math.floor(this.rating)) + (this.rating % 1 >= 0.5 ? '½' : '');
    const waiting = this.punters.filter(c => c.rp.phase === 'waiting').length;
    return `£${this.money.toFixed(2)} · ${stars || '0★'} · ${waiting} waiting`;
  }
  summary() {
    const stars = Math.round(this.rating * 2) / 2;
    return [
      ['NIGHT', this.diff.name],
      ['TAKINGS', '£' + this.money.toFixed(2)],
      ['TIPS IN THE JAR', '£' + (this.tipJar ? this.tipJar.total : this.tips).toFixed(2)],
      ...(this.tipJar && this.tipJar.nicked ? [['NICKED BY LEWIS (FOR THE CAR)', '£' + this.tipJar.nicked.toFixed(2)]] : []),
      ['DRINKS SERVED BY RONNIE', this.served],
      ['JOBS DONE FOR THE STAFF', this.jobs ? this.jobs.done : 0],
      ['WRONG DRINKS', this.wrong],
      ['THROWN AT PEOPLE', this.thrown || 0],
      ['KIDS SERVED BOOZE (!!)', this.kidBooze || 0],
      ['KIDS SPOTTED', this.carded || 0],
      ['LEFT FUMING', this.walkouts],
      ['FIGHTS BROKEN UP', this.fights],
      ['TVS SMASHED', this.g.G.tvsSmashed || 0],
      ['PUB RATING', '★'.repeat(Math.floor(stars)) + (stars % 1 ? '½' : '') + ` (${stars}/5)`],
      [stars >= 4 ? 'Lewis: "Bro. Landlord of the year, bro."' : stars >= 2.5 ? 'Aidan: "Not bad. Let it settle next time."' : 'Chloe: "Babe. You ate the profits."', ''],
    ];
  }
  cleanup() { if (this.tipJar) { this.tipJar.dispose(); this.tipJar = null; } if (this.event && this.endEvent2 && this.event.hemi0 !== undefined) this.endEvent2(); if (this.jobs) { this.jobs.dispose(); this.jobs = null; } const its = this.g.items; if (its) { its.drinksOnly = false; its.minFood = this.g.room.big ? 150 : 0; }
    if (this.bar) this.bar.dispose(); if (this.ordersEl) this.ordersEl.remove(); if (this.wrist) this.g.scene.remove(this.wrist); for (const id of Object.keys(SQUAD)) if (/^p\d+$/.test(id)) delete SQUAD[id]; for (const t of this.tags.values()) this.g.scene.remove(t); this.tags.clear(); for (const c of this.cast) if (c.plate) { this.g.scene.remove(c.plate); c.plate = null; }
    for (const o of this.added || []) this.g.scene.remove(o); this.added = [];      // (Lewis's plate, punters' pints: the people they belonged to are already gone by now, so they were left floating in the pub, one more every game)
  }
}
