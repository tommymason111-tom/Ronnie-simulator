// DATE NIGHT (mode 'date', La Grande Portion: levels/restaurant.js). Ronnie's out for dinner with Chloe, who has him on
// a diet, and the whole night is a run of little films, each with its own game:
//   SHE LOOKS AWAY     her phone (Chester's photos), the hot waiter, the specials board, a proposal, the lobster tank:
//                      cram in as much as you can, watch for her turning back, ACT NATURAL in time
//   THE WAITER         Ben's covering a shift: order a burger in secret code, raid the dessert trolley as it goes past,
//                      or slide the extras under your napkin while she's busy with the wine list
//   THE TOILET         Chloe goes to the loo: a raid on the whole restaurant (the next table, the trolley, the pass, the
//                      bar, the birthday cake) and back in your seat before she's back (listen for the flush)
//   THE LADS           whoever's out tonight comes over: Harry's dating disasters (react right when she looks), Oliver's
//                      shame cam (stay out of shot), Aidan and Connor's pints (find the Guinness), Dylan's Wonderwall
//                      (grab what pops up), Ethan's free kick (a bread roll into your mouth)
//   BUSTED             any time she catches you: her reaction, and a penalty. Three and the date's over
// Between the films it's the normal game: sit at the table, she glances away now and then, don't eat while she's
// watching. Phones and computers get film shots (their own camera, letterbox bars, captions, big buttons at the bottom);
// a headset keeps your own eyes and gets a small panel in the middle (trigger / grip / A for the buttons).
// The director (modes.js) makes one of these for mode 'date' and keeps it as director.date.
import * as THREE from 'three';
import { SquadMember } from './squad.js';
import { DATE_TABLE, DINER_TABLES } from './levels/restaurant.js';
import { sfx } from './audio.js';
import { track } from './awards.js';
import { STAGES } from './config.js';
import { FONT } from './textures.js';

const T = DATE_TABLE, RON = { x: T.x, z: T.z + 0.78 }, CHL = { x: T.x, z: T.z - 0.75 }, SEAT = { x: T.x, z: T.z + 1.05 };
const SIDE = { x: T.x + 0.95, z: T.z + 0.1, yaw: -Math.PI / 2 };      // (where someone stands when they come over to the table)
const R = (a) => a[Math.floor(Math.random() * a.length)];
const rr = (a, b) => a + Math.random() * (b - a);
const ease = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const lerp = (a, b, k) => a + (b - a) * k;
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const CHLOE_COL = '#B57BFF';

// ---------------------------------------------------------------- the lines
const LOOKS = {
  phone: { icon: '📱', title: 'SHE\'S ON HER PHONE', sub: 'Chester\'s been to the groomer\'s',
    lead: ['Oh my God, babe. Mum\'s sent me Chester\'s new haircut. Hang on.', 'Ooh, Chester\'s photos! Two seconds, babe.', 'Hold on, babe. Chester\'s on the vet\'s Instagram.'],
    pose: 'phone', look: 0, fake: 'She laughs at a photo of Chester... and keeps scrolling', srcs: ['bread', 'plate'] },
  waiter: { icon: '😍', title: 'THE HOT WAITER', sub: 'She\'s pretending she isn\'t looking',
    lead: ['Babe, don\'t look now, but is that waiter... is he a model?', 'Who IS that? No, I\'m not looking. You\'re looking.', 'That waiter\'s got arms like Lewis. Don\'t tell Lewis.'],
    pose: 'chin', look: 1.15, fake: 'He flicks his hair. She\'s gone again', srcs: ['bread', 'next'] },
  board: { icon: '📋', title: 'THE SPECIALS BOARD', sub: 'She\'s reading every single one out loud',
    lead: ['Ooh, specials. Let me read them to you, babe. Slowly. Like you need to hear them.', 'Hold on, I want to see the specials. Not for you. You\'re having the soup.'],
    pose: 'menu', look: -1.2, fake: '"Wait, is quinoa a grain?" ...she reads on', srcs: ['plate', 'bread'] },
  propose: { icon: '💍', title: 'A PROPOSAL', sub: 'Someone\'s down on one knee at table six',
    lead: ['Oh my God. Babe. BABE. He\'s proposing. Look! No, don\'t look, film it!', 'Is that a ring?! At La Grande Portion?! Babe, that could be us. One day. If you lose a stone.'],
    pose: 'phoneup', look: -1.25, fake: 'She said yes! ...Chloe\'s crying. Keep going', srcs: ['next', 'plate'] },
  lobster: { icon: '🦞', title: 'THE LOBSTER TANK', sub: 'Gary the lobster is making a break for it',
    lead: ['Babe. The lobster. The lobster\'s climbing OUT. Gary, NO.', 'Is that lobster waving at me? It\'s waving at me. Hi Gary!'],
    pose: 'chin', look: 1.3, fake: 'Gary slips back in. She\'s still watching', srcs: ['next', 'bread'] },
};
const SRC = {
  bread: { icon: '🥖', label: 'BREAD BASKET', chonk: 4, cheek: 0.13, noise: 0 },
  plate: { icon: '🍝', label: 'HER PASTA', chonk: 7, cheek: 0.22, noise: 0.12 },
  next: { icon: '🍰', label: 'NEXT TABLE', chonk: 9, cheek: 0.26, noise: 0.08 },
};
const BACK = ['...What? What are you smiling at?', 'Sorry babe, where was I? Oh yeah. Your diet.', 'You\'ve been so good tonight, babe. So good.', 'Why have you got a crumb on your... never mind.', 'Anyway. I was thinking we could do a 10K together.'];
// Harry's dating disasters: 'lol' wants a laugh, 'sad' wants an aww
const TALES = [
  ['So there was this girl from Basildon. Three dates. Turned out she was my cousin\'s ex. AND my other cousin\'s ex.', 'lol'],
  ['Took a girl to Nando\'s. She ordered extra hot. I ordered lemon and herb. She left.', 'lol'],
  ['One date, she brought her mum. Her MUM, Chloe. Her mum liked me more, to be honest.', 'lol'],
  ['I got ghosted by someone I hadn\'t even messaged yet.', 'sad'],
  ['Went to the cinema. Fell asleep. Woke up, she\'d gone. And so had my popcorn.', 'sad'],
  ['She unmatched me while I was typing "hey". Mid-"hey", Chloe.', 'sad'],
  ['My longest relationship was eleven days. Twelve if you count the day she was telling everyone.', 'sad'],
  ['Speed dating in Southend. Every single one of them asked if I knew Ronnie.', 'lol'],
  ['She said she was 5\'8". She was 5\'8" in heels. On a step. In a photo.', 'lol'],
  ['I wrote her a poem. She said it was "a lot". It was one line. It was "hey".', 'sad'],
];
// what Chloe says when she catches him, and what he says back
const BUSTED = {
  table: ['RONNIE. I can SEE you.', 'Babe. Put. It. Down.', 'Are you eating? While I\'m LOOKING at you?'],
  hamster: ['Why are your cheeks like that? ...Ronnie. Swallow. SWALLOW.', 'You look like a hamster that\'s robbed a Greggs.'],
  red: ['RONNIE. Hand. Out. Of. The. Bread basket.', 'I turned round for ONE second!'],
  mid: ['Did you just... is that MY pasta in your mouth?', 'I literally saw that go in, babe.'],
  wander: ['Ronnie? Where are you going? Sit DOWN.', 'Why are you by the dessert trolley, babe? Come back. Now.'],
  gesture: ['Why are you winking at the waiter, Ronnie?', 'Was that sign language? For "chips"?'],
  sorbet: ['That\'s MY sorbet, Ronnie. That\'s the only thing I ordered.', 'Babe. That was my lemon sorbet. It was LEMON.'],
  chewing: ['What are you chewing? We haven\'t had our food yet.', 'Ronnie. You\'re chewing. Why are you chewing?'],
  napkin: ['Why is your napkin moving?', 'Is there a burger under your napkin, Ronnie? IS THERE?'],
  seat: ['Where\'s he gone... RONNIE?! Get back here!', 'I was gone TWO minutes. Why are you at the bar?!'],
  react: ['Why are you laughing? That\'s really sad, babe.', 'Are you even listening to Harry? What\'s in your mouth?'],
  filmed: ['Ronnie, you\'re on Oliver\'s story. EATING. Twelve thousand people have seen it.', 'Oliver\'s posted you eating. My MUM liked it.'],
  wine: ['That\'s MY wine, Ronnie. You hate wine.', 'Ronnie! That\'s my glass! You just downed my rosé!'],
  gag: ['Did you just eat broccoli? And GAG? In a restaurant?', 'Everyone\'s staring, babe. You\'ve gagged on a vegetable.'],
  roll: ['Did Ethan just throw a bread roll at my head?', 'Ronnie. Why did a bread roll just hit me in the face?'],
};
const SORRY = ['Mmmf? Nothing in here, babe.', 'It\'s a cough sweet. A big one.', 'The waiter dropped it. In my mouth.', 'I was just smelling it, babe.', 'It\'s gravy. On my chin. From before.', 'I was holding it for a mate.'];
// the penalties for getting caught
const PENALTIES = [
  { id: 'salad', icon: '🥗', title: 'SIDE SALAD', sub: 'She\'s ordered you a side salad. It\'s on your plate. She\'s watching.', line: 'Waiter! A side salad for him. No dressing. Dressing is a treat.' },
  { id: 'plate', icon: '🍽️', title: 'PLATE CONFISCATED', sub: 'She takes your plate and some of your Eat Meter with it', line: 'I\'m having this. You\'ve had enough. You\'ve had MY enough.' },
  { id: 'mum', icon: '☎️', title: 'SHE\'S RINGING YOUR MUM', sub: 'On a diet for 8 seconds: no eating at all', line: 'Hi Mrs... yeah. He\'s done it again. Yeah. In front of me.' },
  { id: 'lecture', icon: '🗣️', title: 'THE LECTURE', sub: 'She talks about your cholesterol. The clock keeps running', line: 'Do you know what your cholesterol is, babe? Neither does your doctor. He\'s scared to look.' },
  { id: 'bread', icon: '🥖', title: 'BREAD BASKET MOVED', sub: 'Her side of the table. Her next look-away is shorter', line: 'I\'m moving this. And I\'m keeping my eye on you. Both eyes.' },
];

// ---------------------------------------------------------------- the on-screen bits (phone / computer)
const CSS = `
#dn { position: fixed; inset: 0; z-index: 19; display: none; pointer-events: none; font-family: "Arial Black", Arial, sans-serif; color: #fff; --bt: clamp(40px, 9vh, 84px); --bb: clamp(70px, 14vh, 120px); --sh: 118px; --bh: 92px; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
#dn.on { display: block; } #dn.on.block { pointer-events: auto; touch-action: none; }
#dn .dn-bar { position: absolute; left: 0; right: 0; background: #000; transition: transform .45s ease-out; }
#dn .dn-bar.t { top: 0; height: var(--bt); transform: translateY(-100%); } #dn .dn-bar.b { bottom: 0; height: var(--bb); transform: translateY(100%); }
#dn.bars .dn-bar { transform: none; }
#dn .dn-slate { position: absolute; left: max(12px, env(safe-area-inset-left)); right: 96px; bottom: 6px; font-size: clamp(10px, 2.9vw, 13px); letter-spacing: 2px; color: #e879f9; white-space: nowrap; overflow: hidden; }
#dn .dn-cap { position: absolute; left: max(14px, env(safe-area-inset-left)); right: max(14px, env(safe-area-inset-right)); top: 8px; bottom: 6px; font: italic 700 clamp(13px, 3.7vw, 17px)/1.25 Arial, sans-serif; display: flex; flex-direction: column; justify-content: flex-start; gap: 2px; }
#dn .dn-cap b { font: 900 clamp(11px, 3vw, 13px) "Arial Black", Arial, sans-serif; letter-spacing: 1px; font-style: normal; }
#dn .dn-cap .tap { position: absolute; right: 0; bottom: 0; font: 900 10px Arial, sans-serif; color: rgba(255,255,255,0.45); letter-spacing: 1px; font-style: normal; }
#dn .dn-title { position: absolute; left: 0; right: 0; top: calc(var(--bt) + 6vh); display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 0 16px; opacity: 0; transform: scale(.7); transition: opacity .3s, transform .35s cubic-bezier(.2,1.4,.4,1); text-align: center; }
#dn .dn-title.on { opacity: 1; transform: none; }
#dn .dn-title i { font-style: normal; font-size: clamp(40px, 12vw, 64px); line-height: 1; }
#dn .dn-title b { font-size: clamp(24px, 7.4vw, 44px); line-height: 1.05; -webkit-text-stroke: 1.5px #111; text-shadow: 0 4px 0 #111; color: #ffd400; }
#dn .dn-title span { font: italic 700 clamp(13px, 3.8vw, 18px) Arial, sans-serif; text-shadow: 0 2px 0 #111; background: rgba(0,0,0,0.55); padding: 3px 10px; border-radius: 8px; }
#dn .dn-stamp { position: absolute; left: 0; right: 0; top: 34%; text-align: center; font-size: clamp(34px, 11vw, 70px); -webkit-text-stroke: 2px #111; text-shadow: 0 5px 0 #111; opacity: 0; transform: scale(2) rotate(-8deg); transition: opacity .2s, transform .3s cubic-bezier(.2,1.5,.4,1); }
#dn .dn-stamp.on { opacity: 1; transform: scale(1) rotate(-6deg); }
#dn .dn-flash { position: absolute; inset: 0; box-shadow: inset 0 0 0 6px #ff2a2a, inset 0 0 70px rgba(255,30,30,0.85); opacity: 0; }
#dn .dn-game { position: absolute; left: 0; right: 0; bottom: var(--bb); padding: 0 max(10px, env(safe-area-inset-right)) 8px max(10px, env(safe-area-inset-left)); display: none; flex-direction: column; gap: 8px; }
#dn .dn-game.on { display: flex; }
#dn .dn-stage { width: 100%; height: var(--sh); border-radius: 14px; display: block; }
#dn .dn-btns { display: flex; gap: 8px; }
#dn .dn-btn { flex: 1 1 0; min-width: 0; height: var(--bh); border-radius: 18px; border: 4px solid #111; box-shadow: 0 5px 0 #111; background: var(--c, #ffd400); color: #111; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-family: "Arial Black", Arial, sans-serif; padding: 2px 4px; position: relative; touch-action: none; transition: transform .06s, opacity .15s; }
#dn .dn-btn i { font-style: normal; font-size: clamp(24px, 7vw, 34px); line-height: 1; }
#dn .dn-btn span { font-size: clamp(10px, 3vw, 13px); line-height: 1.05; text-align: center; }
#dn .dn-btn small { font: 700 clamp(9px, 2.5vw, 11px) Arial, sans-serif; opacity: .75; line-height: 1; }
#dn .dn-btn.down { transform: translateY(4px); box-shadow: 0 1px 0 #111; }
#dn .dn-btn.off { opacity: .32; } #dn .dn-btn.hot { animation: dnHot .5s ease-in-out infinite alternate; }
#dn .dn-btn em { position: absolute; top: 4px; left: 7px; font: 900 11px Arial, sans-serif; opacity: .55; font-style: normal; }
@keyframes dnHot { from { box-shadow: 0 5px 0 #111, 0 0 0 0 #fff; } to { box-shadow: 0 5px 0 #111, 0 0 0 5px #fff; } }
body.dn-cine #touch, body.dn-cine #chat-log, body.dn-cine #warm-bar, body.dn-cine #banner, body.dn-cine .hint { visibility: hidden !important; }
@media (orientation: landscape) and (max-height: 520px) {
  #dn { --bt: 32px; --bb: 54px; --sh: 74px; --bh: 74px; }
  #dn .dn-game { flex-direction: row; align-items: flex-end; }
  #dn .dn-stage { width: 42%; flex: none; height: var(--bh); }
  #dn .dn-btns { flex: 1 1 0; }
  #dn .dn-cap { top: 5px; font-size: 13px; }
  #dn .dn-title { top: calc(var(--bt) + 10px); }
  #dn .dn-title i { font-size: 36px; } #dn .dn-title b { font-size: 26px; }
  #dn .dn-stamp { top: 24%; font-size: 46px; }
}
`;
// an emoji on a canvas at any size (an iPhone draws nothing for one much over 64px: drawn once at 64, then scaled)
const EMO = new Map();
function emo(g, e, x, y, s) {
  let c = EMO.get(e); if (!c) { c = document.createElement('canvas'); c.width = c.height = 96; const q = c.getContext('2d'); q.font = '64px sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(e, 48, 52); EMO.set(e, c); }
  const w = 96 * s / 64; g.drawImage(c, x - w / 2, y - w / 2, w, w);
}
function rr2(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function txt(g, s, x, y, size, color, { align = 'center', maxW = 0, stroke = 0, weight = 900 } = {}) {
  let sz = size; g.textAlign = align; g.textBaseline = 'middle';
  do { g.font = `${weight} ${sz}px ${FONT}`; sz -= 1; } while (maxW && g.measureText(s).width > maxW && sz > 8);
  if (stroke) { g.lineJoin = 'round'; g.lineWidth = stroke; g.strokeStyle = '#111'; g.strokeText(s, x, y); }
  g.fillStyle = color; g.fillText(s, x, y);
}
// a meter: label, fill 0..1, colour
function meter(g, x, y, w, h, k, col, label, icon) {
  g.fillStyle = 'rgba(0,0,0,0.55)'; rr2(g, x, y, w, h, h / 2); g.fill();
  if (k > 0.002) { g.fillStyle = col; rr2(g, x + 2, y + 2, Math.max(h - 4, (w - 4) * Math.min(1, k)), h - 4, (h - 4) / 2); g.fill(); }
  g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.7)'; rr2(g, x, y, w, h, h / 2); g.stroke();
  if (icon) emo(g, icon, x + h * 0.55, y + h / 2, h * 0.95);
  if (label) txt(g, label, x + w / 2 + (icon ? h * 0.3 : 0), y + h / 2 + 1, h * 0.55, '#fff', { stroke: 3, maxW: w - h * 1.4 });
}
// the panel behind a game's stage: dark glass
function panel(g, w, h, col = 'rgba(20,6,12,0.82)') { g.clearRect(0, 0, w, h); g.fillStyle = col; rr2(g, 0, 0, w, h, Math.min(16, h / 5)); g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(232,121,249,0.8)'; rr2(g, 1.5, 1.5, w - 3, h - 3, Math.min(15, h / 5)); g.stroke(); }
// Chloe's eyes: how close she is to looking at you (0 = miles away, 1 = right at you)
function eyeMeter(g, x, y, w, h, k, label) {
  const col = k > 0.75 ? '#ff3a3a' : k > 0.45 ? '#ffb020' : '#39ff14';
  meter(g, x, y, w, h, k, col, label, k > 0.75 ? '👀' : '🙈');
}

class DateUI {
  constructor(player) {
    this.P = player;
    if (!document.getElementById('dn-css')) { const st = document.createElement('style'); st.id = 'dn-css'; st.textContent = CSS; document.head.appendChild(st); }
    let el = document.getElementById('dn'); if (el) el.remove();
    el = this.el = document.createElement('div'); el.id = 'dn';
    el.innerHTML = '<div class="dn-flash"></div><div class="dn-bar t"><div class="dn-slate"></div></div><div class="dn-title"><i></i><b></b><span></span></div><div class="dn-stamp"></div><div class="dn-game"><canvas class="dn-stage"></canvas><div class="dn-btns"></div></div><div class="dn-bar b"><div class="dn-cap"></div></div>';
    document.body.appendChild(el);
    const q = (s) => el.querySelector(s);
    this.q = { flash: q('.dn-flash'), slate: q('.dn-slate'), title: q('.dn-title'), stamp: q('.dn-stamp'), game: q('.dn-game'), stage: q('.dn-stage'), btns: q('.dn-btns'), cap: q('.dn-cap') };
    this.onPress = null; this.onRelease = null; this.onSkip = null; this.btnKey = ''; this.btnEls = [];
    // a tap anywhere that isn't a button: skip the line that's being said
    const stop = (e) => { e.stopPropagation(); };
    el.addEventListener('pointerdown', (e) => { stop(e); if (!e.target.closest('.dn-btn') && this.onSkip) this.onSkip(); });
    for (const k of ['touchstart', 'mousedown', 'wheel', 'click']) el.addEventListener(k, stop);
    this.keyDown = (e) => { if (!this.keys) return; const i = { Digit1: 0, Numpad1: 0, Space: 0, Digit2: 1, Numpad2: 1, Digit3: 2, Numpad3: 2, Enter: -1 }[e.code]; if (i === undefined) return;
      e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat) return; if (i < 0 || !this.btnEls.length) { this.onSkip && this.onSkip(); return; } if (i < this.btnEls.length) { this.flashBtn(i, true); this.onPress && this.onPress(i); } };
    this.keyUp = (e) => { if (!this.keys) return; const i = { Digit1: 0, Numpad1: 0, Space: 0, Digit2: 1, Numpad2: 1, Digit3: 2, Numpad3: 2 }[e.code]; if (i === undefined) return; e.preventDefault(); e.stopImmediatePropagation(); this.flashBtn(i, false); this.onRelease && this.onRelease(i); };
    addEventListener('keydown', this.keyDown, true); addEventListener('keyup', this.keyUp, true);
    // the headset: one panel in the middle of your view (the film's own camera would make you sick)
    this.vcv = document.createElement('canvas'); this.vcv.width = 1024; this.vcv.height = 640;
    this.vtex = new THREE.CanvasTexture(this.vcv); this.vtex.colorSpace = THREE.SRGBColorSpace;
    this.vmesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3125), new THREE.MeshBasicMaterial({ map: this.vtex, transparent: true, depthTest: false, depthWrite: false }));
    this.vmesh.renderOrder = 60; this.vmesh.frustumCulled = false; this.vmesh.visible = false; this.vmesh.position.set(0, -0.21, -0.78);
    player.camera.add(this.vmesh);
    this.scv = document.createElement('canvas'); this.scv.width = 1000; this.scv.height = 230;      // (the stage, drawn for the headset)
    this.vT = 0; this.vBtnWas = [false, false, false];
  }
  get touchy() { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } }
  show(on, block) { this.el.classList.toggle('on', on); this.el.classList.toggle('block', !!block); this.keys = on && !!block; }
  bars(on) { this.el.classList.toggle('bars', on); }
  slate(s) { if (this.q.slate.textContent !== s) this.q.slate.textContent = s; }
  caption(name, color, text, canSkip) {
    const k = name + '|' + text + '|' + canSkip; if (this.capK === k) return; this.capK = k; const c = this.q.cap; c.innerHTML = '';
    if (!text) return;
    if (name) { const b = document.createElement('b'); b.textContent = name.toUpperCase(); b.style.color = color || '#ffd400'; c.appendChild(b); }
    const s = document.createElement('div'); s.textContent = text; c.appendChild(s);
    if (canSkip && this.touchy) { const t = document.createElement('span'); t.className = 'tap'; t.textContent = 'TAP ▸'; c.appendChild(t); }
  }
  title(icon, big, small) {
    const t = this.q.title; if (!big) { t.classList.remove('on'); return; }
    t.children[0].textContent = icon || ''; t.children[1].textContent = big; t.children[2].textContent = small || ''; t.children[2].style.display = small ? '' : 'none';
    t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
  }
  stamp(s, col) { const st = this.q.stamp; if (!s) { st.classList.remove('on'); return; } st.textContent = s; st.style.color = col || '#ffd400'; st.classList.remove('on'); void st.offsetWidth; st.classList.add('on'); }
  flash(k) { this.q.flash.style.opacity = Math.max(0, Math.min(1, k)).toFixed(2); }
  // the game's buttons (made again only when what they say changes)
  buttons(list) {
    const key = list ? list.map(b => [b.icon, b.label, b.sub, b.col].join('/')).join('|') : '';
    this.q.game.classList.toggle('on', !!list);
    if (key !== this.btnKey) {
      this.btnKey = key; this.q.btns.innerHTML = ''; this.btnEls = [];
      (list || []).forEach((b, i) => {
        const el = document.createElement('button'); el.className = 'dn-btn'; el.style.setProperty('--c', b.col || '#ffd400');
        el.innerHTML = `<i></i><span></span>${b.sub ? '<small></small>' : ''}${this.touchy ? '' : `<em>${i + 1}</em>`}`;
        el.children[0].textContent = b.icon; el.children[1].textContent = b.label; if (b.sub) el.querySelector('small').textContent = b.sub;
        const down = (e) => { e.preventDefault(); e.stopPropagation(); try { el.setPointerCapture(e.pointerId); } catch (er) {} el.classList.add('down'); this.onPress && this.onPress(i); };
        const up = (e) => { e.stopPropagation(); if (!el.classList.contains('down')) return; el.classList.remove('down'); this.onRelease && this.onRelease(i); };
        el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
        el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
        this.q.btns.appendChild(el); this.btnEls.push(el);
      });
    }
    (list || []).forEach((b, i) => { const el = this.btnEls[i]; if (!el) return; el.classList.toggle('off', !!b.off); el.classList.toggle('hot', !!b.hot); });
  }
  flashBtn(i, on) { const el = this.btnEls[i]; if (el) el.classList.toggle('down', on); }
  // the game's stage (a canvas the game draws on), every frame
  stage(game) {
    const cv = this.q.stage; if (!game || !this.q.game.classList.contains('on')) return;
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    if (W < 4 || H < 4) return;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); game.draw(g, r.width, r.height);
  }
  // the headset's panel: the title, the line being said, the game and its buttons (trigger / grip / A)
  vr(on, st, dt) {
    this.vmesh.visible = on; if (!on) return;
    if ((this.vT -= dt) > 0) return; this.vT = 1 / 20;
    const g = this.vcv.getContext('2d'), W = 1024, H = 640; g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(16,4,10,0.86)'; rr2(g, 4, 4, W - 8, H - 8, 34); g.fill(); g.lineWidth = 6; g.strokeStyle = '#e879f9'; rr2(g, 4, 4, W - 8, H - 8, 34); g.stroke();
    txt(g, st.title || 'DATE NIGHT', W / 2, 46, 40, '#ffd400', { maxW: W - 60, stroke: 6 });
    const game = st.game;
    if (game) {
      const s = this.scv, sg = s.getContext('2d'); sg.setTransform(1, 0, 0, 1, 0, 0); game.draw(sg, s.width, s.height); g.drawImage(s, 12, 84, W - 24, (W - 24) * s.height / s.width);
      const bs = game.buttons || [], bw = (W - 40 - (bs.length - 1) * 16) / Math.max(1, bs.length), CTRL = ['TRIGGER', 'GRIP', 'A / X'];
      bs.forEach((b, i) => { const x = 20 + i * (bw + 16), y = 340, h = 200;
        g.globalAlpha = b.off ? 0.35 : 1; g.fillStyle = b.col || '#ffd400'; rr2(g, x, y, bw, h, 26); g.fill(); g.lineWidth = 6; g.strokeStyle = b.hot ? '#fff' : '#111'; rr2(g, x, y, bw, h, 26); g.stroke();
        emo(g, b.icon, x + bw / 2, y + 58, 62); txt(g, b.label, x + bw / 2, y + 120, 30, '#111', { maxW: bw - 16 });
        g.fillStyle = '#111'; rr2(g, x + bw / 2 - 80, y + 148, 160, 38, 19); g.fill(); txt(g, CTRL[i], x + bw / 2, y + 168, 22, '#fff');
        g.globalAlpha = 1; });
      if (st.cap) txt(g, st.cap, W / 2, 584, 26, '#fff', { maxW: W - 60, weight: 700 });
    } else if (st.cap) {
      const words = st.cap.split(' '), lines = []; let ln = ''; g.font = `700 36px ${FONT}`;
      for (const w of words) { const t = ln ? ln + ' ' + w : w; if (g.measureText(t).width > W - 100 && ln) { lines.push(ln); ln = w; } else ln = t; } if (ln) lines.push(ln);
      if (st.who) txt(g, st.who.toUpperCase(), W / 2, 150, 32, st.whoCol || '#ffd400', { stroke: 5 });
      lines.slice(0, 6).forEach((l, i) => txt(g, l, W / 2, 220 + i * 52, 36, '#fff', { weight: 700, maxW: W - 80 }));
      txt(g, 'TRIGGER: SKIP', W / 2, 598, 22, 'rgba(255,255,255,0.5)');
    }
    if (st.stamp) txt(g, st.stamp, W / 2, 300, 96, st.stampCol || '#ffd400', { stroke: 12 });
    this.vtex.needsUpdate = true;
  }
  // the headset's buttons: trigger, grip, A/X on either controller
  pollVR() {
    const out = []; const now = [false, false, false];
    for (const h of this.P.hands || []) { const gp = h.source && h.source.gamepad; if (!gp) continue; const b = gp.buttons || [];
      if (b[0] && b[0].pressed) now[0] = true; if (b[1] && b[1].pressed) now[1] = true; if (b[4] && b[4].pressed) now[2] = true; }
    for (let i = 0; i < 3; i++) { if (now[i] && !this.vBtnWas[i]) out.push(['down', i]); else if (!now[i] && this.vBtnWas[i]) out.push(['up', i]); this.vBtnWas[i] = now[i]; }
    return out;
  }
  dispose() {
    this.el.remove(); removeEventListener('keydown', this.keyDown, true); removeEventListener('keyup', this.keyUp, true);
    if (this.vmesh.parent) this.vmesh.parent.remove(this.vmesh); this.vmesh.geometry.dispose(); this.vmesh.material.dispose(); this.vtex.dispose();
    document.body.classList.remove('dn-cine');
  }
}

// ---------------------------------------------------------------- the night itself
export class DateNight {
  constructor(director) {
    this.d = director; this.g = director.g;
    this.catches = 0; this.look = true; this.state = 'play';
    this.sneaks = 0; this.haul = 0; this.films = 0; this.raided = 0; this.wins = 0; this.log = [];
    this.t = 4; this.warned = false; this.grace = 1.5; this.cool = 0; this.probation = 0; this.awayT = 0; this.shorter = 0;
    this.nextT = 8; this.used = new Set(); this.lastKind = null; this.penUsed = [];
    this.cam = null; this.camObj = new THREE.PerspectiveCamera(50, 1, 0.05, 200); this.hidNear = [];
    this.scene = null; this.game = null; this.cap = null; this.stampS = null;
  }
  get vr() { const P = this.g.player; return !!(P.renderer && P.renderer.xr.isPresenting); }
  get flat() { return !this.vr; }
  get chloe() { return this.c && !this.c.disposed ? this.c : null; }

  start() {
    const g = this.g, d = this.d;
    this.c = g.cast.find(c => c.id === 'chloe') || null;
    this.ui = new DateUI(g.player);
    this.ui.onPress = (i) => this.press(i); this.ui.onRelease = (i) => this.release(i); this.ui.onSkip = () => this.skip();
    const c = this.chloe;
    if (c) {
      c.active = false; c.seated = true; c.state = 'idle'; c.rag.placeAt(CHL.x, CHL.z, 0); c.faceYaw = 0;
      const base = c.personalityPose.bind(c); c.personalityPose = (t) => { base(t); this.chloePose(c, t); };
      setTimeout(() => { if (this.d.date === this && this.state === 'play') c.say('Isn\'t this nice, babe? Just us. And no snacking. Promise?', 5); }, 1500);
    }
    d.seatDiners();
    // Ronnie himself, sat in his chair: only seen in the film shots (you're inside his head the rest of the time)
    try {
      const r = this.ron = new SquadMember(g.scene, g.room, g.physics, 'ronnie', [RON.x, RON.z, Math.PI], d);
      r.active = false; r.seated = true; r.state = 'idle'; r.faceYaw = Math.PI; r.ronnieStandIn = true; r.rag.placeAt(RON.x, RON.z, Math.PI);
      for (const pt of r.rag.list) pt.body.collisionResponse = false;
      r.rag.constrain = null;
      const base = r.personalityPose.bind(r); r.personalityPose = (t) => { base(t); this.ronPose(r, t); };
      this.showRon(false);
    } catch (e) { this.ron = null; }
    // a little something on the table to be getting on with
    this.tableFood = [];
    for (const [type, dx, dz] of [['pizza', -0.22, 0.2], ['doughnut', 0.2, 0.22], ['cupcake', 0.02, 0.05]]) { try { this.tableFood.push(g.items.spawn(type, V(T.x + dx, 0.9, T.z + dz))); } catch (e) {} }
    this.buildProps();
    this.deck = this.makeDeck();
  }
  // which films tonight, in what order: one of each kind before any kind comes round again, never the same kind twice
  // running, the toilet once (it's the long one)
  makeDeck() {
    const kinds = shuffle(['look', 'waiter', 'visit', 'look', 'visit', 'waiter', 'look', 'visit']); kinds.splice(2 + Math.floor(Math.random() * 3), 0, 'toilet');
    if (kinds[0] !== 'look') { const i = kinds.indexOf('look'); [kinds[0], kinds[i]] = [kinds[i], kinds[0]]; }
    for (let i = 1; i < kinds.length; i++) if (kinds[i] === kinds[i - 1]) { const j = kinds.findIndex((k, n) => n > i && k !== kinds[i] && k !== kinds[n - 1]); if (j > 0) [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
    return kinds;
  }
  buildProps() {
    const s = this.g.scene;
    // Chloe's phone
    const ph = this.phone = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.009), new THREE.MeshLambertMaterial({ color: 0x1b1b22 }));
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128; const q = cv.getContext('2d');
    const gr = q.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#f8bbd0'); gr.addColorStop(1, '#7e57c2'); q.fillStyle = gr; q.fillRect(0, 0, 64, 128);
    q.font = '34px sans-serif'; q.textAlign = 'center'; q.fillText('🐶', 32, 70); q.fillStyle = '#fff'; q.fillRect(8, 98, 48, 6); q.fillRect(8, 110, 30, 6);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.138), new THREE.MeshBasicMaterial({ map: tex })); scr.position.z = 0.0052;
    ph.add(body, scr); ph.visible = false; s.add(ph);
    // the specials menu she reads (the front faces her; the back says what it is)
    const mc = document.createElement('canvas'); mc.width = 256; mc.height = 160; const m = mc.getContext('2d');
    m.fillStyle = '#1a0508'; m.fillRect(0, 0, 256, 160); m.strokeStyle = '#d4af37'; m.lineWidth = 6; m.strokeRect(6, 6, 244, 148);
    m.fillStyle = '#d4af37'; m.font = 'italic 30px Georgia, serif'; m.textAlign = 'center'; m.fillText('Specials', 128, 56); m.font = 'italic 18px Georgia, serif'; m.fillText('La Grande Portion', 128, 92); m.fillText('(not for Ronnie)', 128, 122);
    const mt = new THREE.CanvasTexture(mc); mt.colorSpace = THREE.SRGBColorSpace;
    this.menu = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), new THREE.MeshLambertMaterial({ map: mt, side: THREE.DoubleSide })); this.menu.visible = false; s.add(this.menu);
    this.propList = [ph, this.menu];
  }
  dispose() {
    this.stop();
    for (const o of this.propList || []) { this.g.scene.remove(o); o.traverse(n => { if (n.geometry) n.geometry.dispose(); if (n.material) { if (n.material.map) n.material.map.dispose(); n.material.dispose(); } }); }
    this.propList = [];
    if (this.ron) { this.ron.dispose(); this.ron = null; }
    if (this.ui) { this.ui.dispose(); this.ui = null; }
  }
  // the game's over (time, or three strikes): any film stops where it is, the camera's back in your head
  stop() {
    if (this.visitor) this.sendHome(this.visitor, true);
    if (this.chloe && this.chloe.dnHidden) this.chloeBack(true);
    this.scene = null; this.game = null; this.state = 'over'; this.cam = null; this.cineOn(false);
    if (this.ui) { this.ui.show(false); this.ui.bars(false); this.ui.buttons(null); this.ui.vr(false); this.ui.title(null); this.ui.stamp(null); }
    if (this.chloe) { this.chloe.lookOverride = null; this.chloe.dnPose = null; }
  }
  summary() {
    const L = [['TIMES BUSTED BY CHLOE', `${this.catches} / 3`], ['FILMS SURVIVED', `${this.wins} / ${this.films}`], ['SNUCK PAST CHLOE', `${this.sneaks} mouthfuls`]];
    if (this.raided) L.push(['RAIDED WHILE SHE WAS IN THE LOO', this.raided]);
    L.push([this.catches >= 3 ? 'Chloe ordered you a salad.' : this.catches === 0 ? 'Chloe: "You were SO good tonight, babe." (He wasn\'t.)' : 'Relationship status: still together, somehow.', '']);
    L.push(['The bill is a scroll. It is still unrolling.', '']);
    return L;
  }
  // for the tests and developer mode: what's going on
  debug() { const s = this.scene, gm = this.game; return { state: this.state, film: s && s.id, variant: s && s.variant, game: gm && gm.id, gameResult: gm && gm.result, shot: this.cam && this.cam.name, catches: this.catches, look: this.look, cap: this.cap && this.cap.text, sneaks: this.sneaks }; }

  // ------------------------------------------------------------ every frame (from the director)
  update(dt, ctx) {
    const g = this.g, P = g.player;
    if (this.ron) { this.ron.update(dt, ctx); this.ron.rag.fat = Math.min(1, (g.G.stage || 0) / (STAGES.length - 1) * 1.3); }
    for (const o of this.propList) o.visible = false;
    const c = this.chloe; if (c) this.placeProps(c);
    if (this.cam) { this.cam.t += dt; if (this.cam.name === 'return' && this.cam.t >= 0.7) { this.cam = null; if (this.state !== 'scene') this.cineOn(false); } }
    if (this.state === 'scene') {
      if (!this.d.running) { this.stop(); return; }
      if (this.inBeat) this.d.timeLeft += dt;      // (the clock waits while the film talks; it runs while you play)
      P.effect('noEat', 0.3); P.effect('frozen', 0.3);
      if (P.flatMode && !this.vr && P.flatMove) P.flatMove = { x: 0, z: 0 };
      if (this.titleT > 0 && (this.titleT -= dt) <= 0) this.ui.title(null);
      if (this.stampT > 0 && (this.stampT -= dt) <= 0) { this.ui.stamp(null); this.stampS = null; }
      if (this.game && !this.game.result) { this.game.update(dt); }
      if (this.vr) for (const [k, i] of this.ui.pollVR()) { if (k === 'down') { if (this.game && !this.game.result) this.press(i); else if (i === 0) this.skip(); } else this.release(i); }
      this.stepScene(dt);
      this.drawUI(dt);
      return;
    }
    if (this.state !== 'play' || !c || c.down) { this.ui && this.ui.vr(false); return; }
    this.normal(dt, ctx);
  }

  // between the films: she's across the table, watching you, glancing away now and then
  normal(dt, ctx) {
    const c = this.chloe, g = this.g, P = g.player;
    this.t -= dt; this.grace -= dt; this.cool -= dt; this.probation -= dt;
    if (c.dnPose !== 'salad' || this.probation <= 0) c.dnPose = null;
    const head = P.head, away = Math.hypot(head.x - SEAT.x, head.z - SEAT.z);
    if (this.look) {
      c.lookOverride = null;
      // flailing about while she's watching gives you away (VR), and so does wandering off
      if (this.grace <= 0 && P.hands.some(h => h.tracked && h.speed > 1.6)) this.busted('table');
      this.awayT = away > 2.2 && this.grace <= 0 ? this.awayT + dt : 0;
      if (this.awayT > 0.6 && !this.wanderWarned) { this.wanderWarned = true; c.say(R(['Ronnie? Where are you going?', 'Babe? The toilets are the OTHER way.', 'Ronnie. Sit. Down.']), 5); }
      if (this.awayT > 3) { this.awayT = 0; this.busted('wander'); }
      if (this.t <= 0 && this.probation <= 0) {
        this.look = false; this.warned = false; this.t = rr(2.6, 4.6); this.wanderWarned = false;
        c.lookOverride = Math.random() < 0.5 ? 1.25 : -1.25;
        c.say(R(['Ooh, is that the waiter?', 'Just checking my phone, babe.', '...anyway.', 'Is that a pigeon? Inside?', 'That painting looks like a sausage roll.', 'Is that Harry? Why is Harry here?']), 2);
      }
    } else {
      if (!this.warned && this.t < 0.6) { this.warned = true; this.tell(c); }
      if (this.t <= 0) { this.look = true; this.t = rr(3, 5.5); this.grace = 0.5; c.lookOverride = null; }
    }
    // the next film
    if ((this.nextT -= dt) <= 0 && !P.knock && !(g.fx && g.fx.inCutscene) && this.cool <= 0) this.nextFilm();
    this.g.G.wristDirty = true;
  }
  // she's about to turn round: a "!" over her head and a warning sound
  tell(c) { sfx('warn', c.headPos(_v), 1); this.g.words.show('!', c.headPos(_v).add({ x: 0, y: 0.35, z: 0 }), CHLOE_COL, 0.25, 0.6); }
  onEat() { if (this.state === 'play' && this.look && this.grace <= 0) this.busted('table'); }
  // caught in normal play: straight into her reaction
  busted(reason) {
    if (this.cool > 0 || this.state !== 'play') return;
    this.cool = 2.5;
    this.run('busted', null, this.caughtFilm(reason, true));
  }

  // ------------------------------------------------------------ the films
  nextFilm() {
    const g = this.g;
    let kind = this.deck.shift(); if (!kind) { this.deck = this.makeDeck(); kind = this.deck.shift(); }
    const present = (id) => { const c = g.cast.find(o => o.id === id); return c && !c.down && c.rag && c.rag.mesh && this.inGroup(c) ? c : null; };
    let film = null, variant = null;
    if (kind === 'visit') {
      const opts = [['harry', () => this.harryFilm(present('harry'))], ['oliver', () => this.oliverFilm(present('oliver'))], ['pints', () => this.pintsFilm(present('aidan') || present('connor'), present('aidan') && present('connor'))], ['dylan', () => this.dylanFilm(present('dylan'))], ['ethan', () => this.ethanFilm(present('ethan'))]]
        .filter(([id]) => id === 'pints' ? present('aidan') || present('connor') : present(id));
      const fresh = opts.filter(([id]) => !this.used.has('visit:' + id)), pick = R(fresh.length ? fresh : opts);
      if (pick) { variant = pick[0]; film = pick[1](); } else kind = 'look';
    }
    if (kind === 'waiter') { const opts = ['order', 'trolley', 'napkin'], fresh = opts.filter(o => !this.used.has('waiter:' + o)); variant = R(fresh.length ? fresh : opts); film = this.waiterFilm(variant); }
    if (kind === 'toilet') { variant = R(['loo', 'lipstick', 'queue']); film = this.toiletFilm(variant); }
    if (kind === 'look' || !film) { kind = 'look'; const opts = Object.keys(LOOKS), fresh = opts.filter(o => !this.used.has('look:' + o)); variant = R(fresh.length ? fresh : opts); film = this.lookFilm(variant); }
    this.used.add(kind + ':' + variant);
    this.run(kind, variant, film);
  }
  // for the tests and developer mode: a particular film, now
  trigger(kind, variant) {
    if (!this.d.running || this.d.mode !== 'date') return false;
    if (this.state === 'scene') this.endScene(true);
    const g = this.g, P = (id) => g.cast.find(o => o.id === id && o.rag) || null;
    let film = null;
    if (kind === 'look') film = this.lookFilm(variant = LOOKS[variant] ? variant : 'phone');
    else if (kind === 'waiter') film = this.waiterFilm(variant = ['order', 'trolley', 'napkin'].includes(variant) ? variant : 'order');
    else if (kind === 'toilet') film = this.toiletFilm(variant = variant || 'loo');
    else if (kind === 'visit') {
      variant = variant || 'harry';
      film = variant === 'harry' ? this.harryFilm(P('harry')) : variant === 'oliver' ? this.oliverFilm(P('oliver')) : variant === 'pints' ? this.pintsFilm(P('aidan') || P('connor'), P('aidan') && P('connor')) : variant === 'dylan' ? this.dylanFilm(P('dylan')) : this.ethanFilm(P('ethan'));
    } else if (kind === 'busted') film = this.caughtFilm(variant || 'table', true);
    if (!film) return false;
    this.cool = 0; this.run(kind, variant, film); return true;
  }
  run(id, variant, gen) {
    this.state = 'scene'; this.scene = { id, variant, it: gen, wait: 0, until: null, ret: undefined }; this.game = null; this.inBeat = true;
    if (id !== 'busted') this.films++;
    this.cineOn(true);
    this.stepScene(0);
  }
  stepScene(dt) {
    const s = this.scene; if (!s) return;
    if (s.until) { if (!s.until()) return; s.until = null; }
    else if (s.wait > 0) { s.wait -= dt; if (s.wait > 0) return; }
    for (let n = 0; n < 60 && this.scene === s; n++) {
      let r; try { r = s.it.next(s.ret); } catch (e) { console.warn('date night film', e); this.endScene(); return; }
      s.ret = undefined;
      if (r.done) { if (this.scene === s) this.endScene(); return; }
      const v = r.value;
      if (typeof v === 'number') { s.wait = v; return; }
      if (typeof v === 'function') { if (!v()) { s.until = v; return; } }
    }
  }
  skip() { const s = this.scene; if (s && !this.game && s.wait > 0.15 && this.inBeat) s.wait = 0.05; }
  endScene(quiet) {
    const s = this.scene; this.scene = null; this.game = null; this.state = this.d.running ? 'play' : 'over';
    if (this.visitor) this.sendHome(this.visitor, true);
    if (this.chloe && this.chloe.dnHidden) this.chloeBack(true);
    const c = this.chloe; if (c) { c.dnPose = c.dnPose === 'salad' ? 'salad' : null; c.lookOverride = null; }
    if (this.ron) this.ron.dnPose = null;
    this.look = true; this.t = rr(3, 5); this.grace = 1.2; this.warned = false; this.awayT = 0;
    this.nextT = rr(13, 19); this.cap = null;
    // back to your own eyes, looking at her (a quick glide on a screen)
    const P = this.g.player;
    if (this.cam && this.cam.name !== 'pov' && !this.vr && !quiet) { this.cam = { name: 'return', t: 0, from: this.camObj.position.clone(), fromQ: this.camObj.quaternion.clone() }; }
    else this.cam = null;
    P.faceToward && P.faceToward(CHL.x, CHL.z, 0.01);
    if (P.flatMode) P.flatPitch = -0.22;
    this.ui.buttons(null); this.ui.caption('', '', ''); this.ui.title(null); this.ui.stamp(null); this.ui.flash(0); this.ui.vr(false);
    if (!this.cam) this.cineOn(false); else this.ui.show(true, false);
    return s;
  }
  // the film's look: bars, captions, the on-screen controls out of the way, the first-person bits hidden in shots from outside
  cineOn(on) {
    const P = this.g.player;
    if (on && !this.cineState) {
      this.cineState = { menuLock: P.menuLock, hideBelly: P.hideBelly };
      P.menuLock = true; if (P.flatMode && P.flatDrop) P.flatDrop();
      document.body.classList.add('dn-cine');
      this.ui.show(true, true); this.ui.bars(!this.vr);
    } else if (on) { this.ui.show(true, true); this.ui.bars(!this.vr); document.body.classList.add('dn-cine');
    } else if (!on && this.cineState) {
      P.menuLock = this.cineState.menuLock; P.hideBelly = this.cineState.hideBelly; this.cineState = null;
      document.body.classList.remove('dn-cine'); this.ui.show(false); this.ui.bars(false); this.showRon(false); this.thirdPerson(false);
      this.restoreNear();
    }
  }
  thirdPerson(on) {
    const P = this.g.player;
    if (on === this.third) return; this.third = on;
    if (on) { this.hid = { grip: P.flatGrip ? P.flatGrip.visible : null, wrist: P.wrist ? P.wrist.visible : null }; if (P.flatGrip) P.flatGrip.visible = false; if (P.wrist) P.wrist.visible = false; P.hideBelly = true; if (P.belly) P.belly.visible = false; }
    else if (this.hid) { if (P.flatGrip && this.hid.grip != null) P.flatGrip.visible = this.hid.grip; if (P.wrist && this.hid.wrist != null && !document.body.classList.contains('gameover')) P.wrist.visible = this.hid.wrist; P.hideBelly = this.cineState ? this.cineState.hideBelly : false; this.hid = null; }
  }
  showRon(on) { const r = this.ron; if (!r) return; if (r.rag.group) r.rag.group.visible = on; if (r.fx) r.fx.visible = on; if (r.bubble && !on) r.bubble.visible = false; }

  // ------------------------------------------------------------ the camera (phone / computer): main.js draws through it
  cineCam() {
    const cam = this.cam, P = this.g.player;
    if (!cam || this.vr || !P.flatMode) { this.restoreNear(); if (this.third) { this.thirdPerson(false); this.showRon(false); } return null; }
    const main = P.camera, C = this.camObj;
    C.aspect = main.aspect; C.near = 0.05; C.far = main.far;
    C.fov = main.aspect >= 1 ? 44 : Math.min(80, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(24)) / main.aspect)));
    C.updateProjectionMatrix();
    if (cam.name === 'pov') { this.restoreNear(); this.thirdPerson(false); this.showRon(false); return null; }
    if (cam.name === 'return') {      // gliding back into your own head
      const k = ease(cam.t / 0.7), eye = main.getWorldPosition(_v), q = main.getWorldQuaternion(new THREE.Quaternion());
      C.position.copy(cam.from).lerp(eye, k); C.quaternion.copy(cam.fromQ).slerp(q, k);
      this.thirdPerson(k < 0.9); this.showRon(k < 0.9); return C;
    }
    const f = SHOTS[cam.name] || SHOTS.wide, [pos, look, roll] = f(this, cam.t, cam.o || {});
    if (main.aspect < 1 && FAR[cam.name]) pos.sub(look).multiplyScalar(FAR[cam.name]).add(look);      // (a phone held upright sees less side to side: wider shots step back)
    this.frameView(C);
    C.position.copy(pos); C.up.set(0, 1, 0); C.lookAt(look); if (roll) C.rotateZ(roll);
    if (this.g.player.shakeA > 0.05) { C.position.x += (Math.random() - 0.5) * 0.02; C.position.y += (Math.random() - 0.5) * 0.02; }
    this.thirdPerson(true); this.showRon(true);
    this.hideNear(C.position);
    return C;
  }
  // the middle of the shot goes in the middle of what's left of the screen (between the bars and the game's buttons)
  frameView(C) {
    const now = performance.now();
    if (!this.viewK || now - this.viewK.at > 250) { const W = innerWidth, H = innerHeight, ui = this.ui && this.ui.q; let top = 0, bot = H;
      if (ui && this.ui.el.classList.contains('bars')) { top = ui.slate.parentElement.getBoundingClientRect().bottom; bot = ui.cap.parentElement.getBoundingClientRect().top; }
      if (ui && ui.game.classList.contains('on')) { const r = ui.game.getBoundingClientRect(); if (r.height < H * 0.6 && r.width > W * 0.6) bot = Math.min(bot, r.top); }
      this.viewK = { at: now, W, H, dy: Math.max(0, H / 2 - (top + bot) / 2) }; }
    const v = this.viewK; if (v.dy > 1) C.setViewOffset(v.W, v.H, 0, v.dy, v.W, v.H); else C.clearViewOffset();
  }
  // anyone right on top of the camera (a diner behind it) is left out of the shot
  hideNear(p) {
    this.restoreNear();
    for (const c of this.g.cast) { const gr = c.rag && c.rag.group; if (!gr || !gr.visible || c === this.chloe) continue; const q = c.headPos(_v2); if (Math.hypot(q.x - p.x, q.z - p.z) < 0.55 && Math.abs(q.y - p.y) < 1.2) { gr.visible = false; this.hidNear.push(gr); } }
  }
  restoreNear() { for (const gr of this.hidNear) gr.visible = true; this.hidNear.length = 0; }
  shot(name, o) { this.cam = { name, t: 0, o }; }
  chloeHead() { const c = this.chloe; return c && !c.dnHidden ? c.headPos(new THREE.Vector3()) : V(CHL.x, 1.23, CHL.z); }
  ronHead() { const r = this.ron; return r && r.rag.mesh ? r.headPos(new THREE.Vector3()) : V(RON.x, 1.3, RON.z); }

  // ------------------------------------------------------------ the people: poses and props
  chloePose(c, t) {
    const r = c.rag, p = c.dnPose; if (!p) return;
    if (p === 'phone' || p === 'phoneup') { r.aim('uArmR', -0.2, -0.85, 0.45); r.aim('lArmR', -0.15, p === 'phoneup' ? 0.75 : 0.35, 1); r.aim('uArmL', 0.25, -0.9, 0.4); r.aim('lArmL', -0.3, 0.3, 1); c.headExtra = { yaw: 0, pitch: p === 'phoneup' ? 0.05 : 0.42 }; return; }
    if (p === 'menu') { r.aim('uArmL', 0.25, -0.7, 0.6); r.aim('lArmL', -0.2, 0.75, 0.6); r.aim('uArmR', -0.25, -0.7, 0.6); r.aim('lArmR', 0.2, 0.75, 0.6); c.headExtra = { yaw: 0, pitch: 0.15 }; return; }
    if (p === 'chin') { r.aim('uArmR', -0.15, -0.75, 0.6); r.aim('lArmR', -0.1, 0.9, 0.35); return; }
    if (p === 'cross' || p === 'salad') { r.aim('uArmL', 0.2, -1, 0.35); r.aim('lArmL', -1, 0.15, 0.3); r.aim('uArmR', -0.2, -1, 0.35); r.aim('lArmR', 1, 0.2, 0.3); return; }
    if (p === 'point') { r.aim('uArmR', -0.05, -0.1, 1); r.aim('lArmR', 0, 0.05, 1); r.aim('uArmL', 0.2, -1, 0.35); r.aim('lArmL', -1, 0.15, 0.3); return; }
    if (p === 'cry') { const s = Math.sin(t * 9) * 0.05; r.aim('uArmL', 0.2, -0.5, 0.6); r.aim('lArmL', -0.4, 0.85 + s, 0.3); r.aim('uArmR', -0.2, -0.5, 0.6); r.aim('lArmR', 0.4, 0.85 - s, 0.3); return; }
    if (p === 'wave') { const s = Math.sin(t * 10); r.aim('uArmR', -0.6, 0.7, 0.2); r.aim('lArmR', -0.2 + s * 0.4, 1, 0.1); return; }
  }
  ronPose(r, t) {
    const R2 = r.rag, p = r.dnPose; if (!p) return;
    if (p === 'cram') { const k = (Math.sin(t * 14) + 1) / 2, k2 = (Math.sin(t * 14 + Math.PI) + 1) / 2;
      R2.aim('uArmR', -0.25, -0.6 + k * 0.5, 0.6); R2.aim('lArmR', 0.3 * k, -0.1 + k * 1.0, 1 - k * 0.6); R2.aim('uArmL', 0.25, -0.6 + k2 * 0.5, 0.6); R2.aim('lArmL', -0.3 * k2, -0.1 + k2 * 1.0, 1 - k2 * 0.6);
      r.headExtra = { yaw: Math.sin(t * 7) * 0.1, pitch: 0.2 }; return; }
    if (p === 'innocent') { R2.aim('uArmL', 0.15, -0.8, 0.5); R2.aim('lArmL', -0.6, -0.05, 0.8); R2.aim('uArmR', -0.15, -0.8, 0.5); R2.aim('lArmR', 0.6, -0.05, 0.8); r.headExtra = { yaw: Math.sin(t * 2) * 0.15, pitch: -0.15 }; return; }
    if (p === 'shrug') { R2.aim('uArmL', 0.8, -0.45, 0.3); R2.aim('lArmL', 0.3, 0.6, 0.7); R2.aim('uArmR', -0.8, -0.45, 0.3); R2.aim('lArmR', -0.3, 0.6, 0.7); r.headExtra = { yaw: 0, pitch: -0.1 }; return; }
    if (p === 'wink') { R2.aim('uArmR', -0.35, -0.4, 0.8); R2.aim('lArmR', -0.1, 0.95, 0.3); r.headExtra = { yaw: 0.35, pitch: 0 }; return; }
    if (p === 'reach') { R2.aim('uArmR', -1, -0.15, 0.4); R2.aim('lArmR', -1, 0, 0.25); r.headExtra = { yaw: -0.5, pitch: 0.1 }; return; }
    if (p === 'chew') { r.headExtra = { yaw: 0, pitch: Math.sin(t * 12) * 0.08 }; return; }
    if (p === 'cheer') { const s = Math.sin(t * 8); R2.aim('uArmL', 0.5, 0.8, 0.2); R2.aim('lArmL', 0.1, 1, 0.1 * s); R2.aim('uArmR', -0.5, 0.8, 0.2); R2.aim('lArmR', -0.1, 1, -0.1 * s); return; }
    if (p === 'laugh') { const s = Math.sin(t * 16) * 0.08; R2.aim('uArmL', 0.2, -1, 0.3); R2.aim('lArmL', -0.6, 0.3, 0.7); r.headExtra = { yaw: 0, pitch: -0.25 + s }; return; }
    if (p === 'gape') { r.headExtra = { yaw: 0, pitch: -0.3 }; return; }
  }
  placeProps(c) {
    if (c.dnHidden) return;
    if (c.dnPose === 'phone' || c.dnPose === 'phoneup') {
      const ph = this.phone; c.rag.grip('lArmR', ph.position); ph.visible = true;
      const head = c.headPos(_v); ph.lookAt(head); if (c.dnPose === 'phoneup') ph.rotateY(Math.PI);
    } else if (c.dnPose === 'menu') {
      const m = this.menu, a = c.rag.grip('lArmL', _v), b = c.rag.grip('lArmR', _v2); m.position.copy(a).add(b).multiplyScalar(0.5); m.position.y += 0.08; m.visible = true;
      m.lookAt(c.headPos(_v)); m.rotateY(Math.PI);
    }
  }
  chloeSay(text, pri = 5) { const c = this.chloe; return this.line(c, text, pri); }
  // someone says a line: their bubble, the caption, and the time it takes to read
  line(who, text, pri = 5) {
    const name = who ? (who === this.ron ? 'Ronnie' : who.name) : '', col = who ? (who === this.ron ? '#ffd400' : who.color) : '#fff';
    if (who && !who.disposed && !who.dnHidden) { try { who.say(text, pri); } catch (e) {} if (this.flat && who.bubble) this.bubbleOff = who; }
    this.cap = { name, col, text };
    return Math.min(5.5, Math.max(1.7, 1.0 + text.length * 0.05));
  }
  narrate(text) { this.cap = { name: '', col: '#fff', text }; return Math.min(5, Math.max(1.6, 0.8 + text.length * 0.045)); }
  titleCard(icon, big, small, dur = 2.2) { this.ui.title(icon, big, small); this.titleT = dur; this.titleS = big; this.ui.slate(`🎬 FILM ${this.films} · ${big}`); }
  stamp(s, col, dur = 1.6) { this.ui.stamp(s, col); this.stampS = s; this.stampCol = col; this.stampT = dur; }
  // a mouthful: on the Eat Meter, counted, and seen
  reward(n, at) {
    const g = this.g, d = this.d;
    g.addChonk(n); d.stats.chonk += n; g.G.eaten = (g.G.eaten || 0) + 1; g.G.wristDirty = true;
    this.sneaks++; this.haul += n; track('bites'); track('dnSneak');
    const p = at || (this.third ? this.ronHead().add({ x: 0, y: -0.12, z: -0.12 }) : g.player.mouth.clone().addScaledVector(g.player.fwd, 0.15));
    try { g.crumbs.burst(p, [0xd9933f, 0x5a2e14, 0xffc21a, 0xfff3d0], 14, 1.2, null); } catch (e) {}
    g.words.show('+' + Math.round(n), p.clone().add({ x: 0, y: 0.18, z: 0 }), '#ffd400', 0.09, 0.7);
    sfx('chomp', p, 0.9);
  }
  // the game in the middle of a film: wait for it to finish, then its result
  *play(game) {
    this.game = game; this.inBeat = false; game.S = this; this.cap = null;
    yield () => !!game.result || !this.d.running;
    this.inBeat = true; const r = game.result || { win: false, soft: true };
    this.game = null; return r;
  }
  drawUI(dt) {
    const ui = this.ui, gm = this.game;
    if (this.bubbleOff && this.flat && this.third && this.bubbleOff.bubble) this.bubbleOff.bubble.visible = false;      // (on a screen the caption says it: no bubble over it in the shot)
    for (const c of this.g.cast) if (c.bubble && this.flat && this.third && c.speakT > 0) c.bubble.visible = false;
    if (this.flat) for (const c of [...this.g.cast, this.ron]) if (c && c.bubble) c.bubble.visible = false;      // (and none at all over the film: the caption says it)
    const cap = this.cap;
    ui.caption(cap ? cap.name : '', cap ? cap.col : '', cap ? cap.text : '', !gm);
    ui.buttons(gm ? gm.buttons : null); if (gm) ui.stage(gm);
    ui.flash(gm && gm.danger != null ? Math.max(0, (gm.danger - 0.55) / 0.45) * (0.6 + 0.4 * Math.sin(performance.now() / 80)) : 0);
    ui.vr(this.vr, { title: this.titleS, game: gm, cap: cap ? (cap.name ? cap.name + ': ' : '') + cap.text : (gm ? gm.status : ''), who: cap && cap.name, whoCol: cap && cap.col, stamp: this.stampS, stampCol: this.stampCol }, dt);
  }
  press(i) { const gm = this.game; if (!gm || gm.result) { if (!gm) this.skip(); return; } if (gm.buttons && gm.buttons[i] && !gm.buttons[i].off) gm.press(i); }
  release(i) { const gm = this.game; if (gm && !gm.result && gm.release) gm.release(i); }

  // ------------------------------------------------------------ helpers for the films
  inGroup(c) { return (this.d.dinerGroups || []).some(g => g.includes(c)); }
  // someone gets up from their table and comes over (the walk starts in shot, then a cut: they're there)
  *fetch(c, line) {
    const grps = this.d.dinerGroups || [], grp = grps.find(g => g.includes(c));
    if (grp) { grp.splice(grp.indexOf(c), 1); c.dnGroup = grp; }
    this.visitor = c;
    c.seated = false; c.lookOverride = null; c.state = 'idle';
    this.shot('char', { c, d: 1.5, side: 0.5 });
    c.goTo(SIDE.x, SIDE.z, 1.15);
    if (line) yield this.line(c, line); else yield 1.3;
    c.state = 'idle'; c.path = null; c.glide = null; c.rag.placeAt(SIDE.x, SIDE.z, SIDE.yaw); c.faceYaw = SIDE.yaw; c.seated = false;
    const ch = this.chloe; if (ch) ch.lookOverride = 1.0;
  }
  sendHome(c, now) {
    if (!c || c.disposed) { this.visitor = null; return; }
    const seat = c.seat;
    if (c.dnGroup && !c.dnGroup.includes(c)) c.dnGroup.push(c);
    c.dnGroup = null; c.lookOverride = null; c.dnPose = null;
    if (seat) { if (now) { c.state = 'idle'; c.path = null; c.glide = null; c.rag.placeAt(seat.x, seat.z, seat.yaw); c.seated = true; c.faceYaw = seat.yaw; } else c.goTo(seat.x, seat.z, 1.1); }
    if (this.visitor === c) this.visitor = null;
  }
  // Chloe off to the loo (out of the room) and back again
  chloeAway() { const c = this.chloe; if (!c) return; c.seated = false; c.dnPose = null; c.lookOverride = null; c.goTo(8.2, 4.4, 1.25); }
  chloeHide() { const c = this.chloe; if (!c) return; c.dnHidden = true; c.state = 'idle'; c.path = null; c.rag.placeAt(9.5, 8.6, Math.PI); if (c.rag.group) c.rag.group.visible = false; if (c.fx) c.fx.visible = false; c.bubble.visible = false; }
  chloeBack(now) { const c = this.chloe; if (!c) return; c.dnHidden = false; if (c.rag.group) c.rag.group.visible = true; if (c.fx) c.fx.visible = true;
    c.state = 'idle'; c.path = null; c.glide = null; c.rag.placeAt(now ? CHL.x : 7.6, now ? CHL.z : 3.9, now ? 0 : -2.2); c.seated = !!now; c.faceYaw = 0;
    if (!now) c.goTo(CHL.x + 0.6, CHL.z - 0.4, 1.3); }
  chloeSit() { const c = this.chloe; if (!c) return; c.state = 'idle'; c.path = null; c.glide = null; c.rag.placeAt(CHL.x, CHL.z, 0); c.seated = true; c.faceYaw = 0; c.lookOverride = null; }
  placePlayer() {
    const P = this.g.player; if (this.vr) return;
    const head = P.head; if (Math.hypot(head.x - SEAT.x, head.z - SEAT.z) < 0.4) return;
    P.rig.position.x += SEAT.x - head.x; P.rig.position.z += SEAT.z - head.z; P.rig.updateMatrixWorld(true); P.resetHandHistory && P.resetHandHistory();
  }
  // a bit of real food near a spot: eaten (it comes back somewhere else later)
  eatNear(x, z, r = 1.4) {
    const items = this.g.items; let best = null, bd = r;
    for (const it of items.items) { if (it.dead || it.heldBy || it.def.veg || it.def.prop || it.def.drink) continue; const d = Math.hypot(it.pos.x - x, it.pos.z - z); if (d < bd) { bd = d; best = it; } }
    if (!best) return null;
    const p = best.pos.clone(); try { items.remove(best); items.queueRespawn && items.queueRespawn(best.type); } catch (e) {}
    return p;
  }

  // ============================================================ SHE LOOKS AWAY
  *lookFilm(v) {
    const L = LOOKS[v], c = this.chloe, r = this.ron;
    this.placePlayer();
    this.titleCard(L.icon, L.title, L.sub);
    this.shot(R(['overR', 'chloe'])); yield this.chloeSay(R(L.lead));
    if (c) { c.dnPose = L.pose; c.lookOverride = L.look || null; }
    this.shot(v === 'phone' || v === 'board' ? 'chloe' : 'overR'); yield 1.1;
    if (r) r.lookOverride = 0;
    this.shot('ronnie'); if (r) r.dnPose = 'gape'; yield this.narrate(R(['Ronnie sees his chance.', 'The bread basket is unguarded.', 'Somewhere, a violin plays.', 'He has never moved this fast in his life.']));
    this.shot('side');
    const pen = this.shorter > 0 ? 0.75 : 1; if (this.shorter > 0) this.shorter--;
    const res = yield* this.play(cramGame({ srcs: L.srcs.map(k => SRC[k]), dur: [3.2 * pen, 5.8 * pen], window: rr(0.65, 1.0) * (pen < 1 ? 0.85 : 1), fakes: Math.random() < 0.6 ? 1 : 0, fakeText: L.fake, away: L.look || 0, pose: L.pose }));
    if (r) r.dnPose = null;
    if (!res.win) { yield* this.caughtFilm(res.reason); return; }
    yield* this.winFilm(res, res.smooth ? 'SMOOTH!' : 'GOT AWAY WITH IT');
    if (c) { c.dnPose = null; c.lookOverride = null; }
    this.shot('overR'); yield this.chloeSay(R(BACK));
  }
  *winFilm(res, word) {
    this.wins++; const r = this.ron;
    this.shot('ronnie'); if (r) r.dnPose = 'innocent';
    this.stamp(word, '#39ff14'); sfx('dn_smooth', null, 0.9);
    if (res.haul) this.g.words.show(`+${Math.round(res.haul)} SNUCK IN`, this.ronHead().add({ x: 0, y: 0.35, z: 0 }), '#39ff14', 0.1, 1.4);
    yield 1.4;
    if (r) r.dnPose = null;
  }

  // ============================================================ THE WAITER (Ben's covering a shift)
  waiterChar() { const g = this.g; for (const id of ['ben', 'lewis', 'connor', 'noah', 'alfie']) { const c = g.cast.find(o => o.id === id && o.rag && o.rag.mesh && !o.down && this.inGroup(o)); if (c) return c; } return null; }
  *waiterFilm(v) {
    const w = this.waiterChar(), c = this.chloe;
    this.placePlayer();
    if (v === 'order') {
      this.titleCard('🧑‍🍳', 'THE WAITER', 'Ben\'s covering a shift. Order in secret code');
      if (w) yield* this.fetch(w, w.id === 'ben' ? 'Evening both. I\'m your waiter tonight. Ronnie. I KNOW.' : 'Evening! I\'m covering for Ben. Don\'t ask. Right: orders.');
      this.shot('overR'); yield this.chloeSay('Two salads, please. No dressing. He\'s on a diet. Aren\'t you, babe?');
      if (c) c.dnPose = 'menu';
      this.shot('char', { c: w, d: 1.1, side: -0.3 }); if (w) yield this.line(w, 'Two salads. Lovely. *taps nose* Anything... EXTRA, sir?'); else yield 1;
      this.shot('wide');
      const res = yield* this.play(signalGame({}));
      if (c) c.dnPose = null;
      if (!res.win && !res.soft) { yield* this.caughtFilm('gesture'); return; }
      if (res.soft) { this.shot('char', { c: w, d: 1.2, side: 0.3 }); if (w) yield this.line(w, 'Two salads it is. I tried, Ron. I tried.'); return; }
      this.shot('table'); this.stamp('ORDER IN!', '#39ff14');
      for (const [type, dx] of [['burger', -0.15], ['fries', 0.15]]) { try { this.g.items.spawn(type, V(T.x + dx, 0.92, T.z + 0.22)); } catch (e) {} }
      sfx('plate_down', null, 0.8); this.wins++;
      if (w) yield this.line(w, 'Two "salads". One is a burger. The other one is also not a salad.'); else yield 1.4;
      this.shot('overR'); yield this.chloeSay('Is that... a burger? Under the lettuce?');
      this.shot('ronnie'); yield this.line(this.ron, 'It\'s a salad, babe. A HOT salad.');
      if (w) this.sendHome(w);
      return;
    }
    if (v === 'trolley') {
      this.titleCard('🍰', 'THE DESSERT TROLLEY', 'It\'s coming past. She\'s asking about allergens');
      if (w) yield* this.fetch(w, 'Desserts! Who\'s for the trolley?');
      this.shot('overR'); yield this.chloeSay('Ooh. Is the sorbet dairy free? And gluten free? And what\'s it made of? Exactly?');
      if (c) c.lookOverride = 1.0;
      this.shot('char', { c: w, d: 1.2, side: -0.3 }); if (w) yield this.line(w, 'It\'s... lemon? Let me check. Ronnie, DON\'T.'); else yield 1;
      this.shot('trio');
      const res = yield* this.play(conveyorGame({}));
      if (!res.win) { yield* this.caughtFilm(res.reason); return; }
      yield* this.winFilm(res, res.stash ? 'STASHED!' : 'SWEET!');
      if (res.stash) { this.shot('table'); yield this.narrate(`Later, under the napkin: ${res.stash} dessert${res.stash > 1 ? 's' : ''}. Gone in one go.`); }
      if (w) this.sendHome(w);
      return;
    }
    // napkin
    this.titleCard('🧻', 'THE NAPKIN TRICK', 'Slide the extras under your napkin while she does the wine');
    if (w) yield* this.fetch(w, 'Here\'s your bread, and here\'s... *wink* ...the bread.');
    this.shot('table'); yield this.narrate('Under the bread: a burger, a hot dog and a doughnut. Ben\'s a legend.');
    if (c) { c.dnPose = 'menu'; c.lookOverride = 0.6; }
    this.shot('overR'); yield this.chloeSay('Can we see the wine list? I want something that goes with salad.');
    this.shot('trio');
    const res = yield* this.play(napkinGame({}));
    if (c) c.dnPose = null;
    if (!res.win) { yield* this.caughtFilm('napkin'); return; }
    yield* this.winFilm(res, res.n >= 3 ? 'ALL HIDDEN!' : `${res.n} HIDDEN`);
    if (w) this.sendHome(w);
  }

  // ============================================================ SHE NEEDS THE LOO
  *toiletFilm(v) {
    const c = this.chloe;
    this.placePlayer();
    this.titleCard('🚽', 'CHLOE NEEDS THE LOO', v === 'queue' ? 'And there\'s a queue. Raid the restaurant!' : 'Raid the restaurant. Be back in your seat before she is');
    this.shot('overR'); yield this.chloeSay(R(['I\'m just popping to the loo, babe. Don\'t. Move.', 'Toilet. Back in two minutes. I\'ve counted the bread rolls.', 'I need the loo. If ANYTHING is missing when I get back...']));
    this.shot('wide'); this.chloeAway(); yield 1.6;
    this.shot('ronnie'); if (this.ron) { this.ron.dnPose = 'gape'; this.ron.lookOverride = -0.5; } yield this.narrate('The door swings shut. Ronnie is alone. With everything.');
    this.chloeHide(); if (this.ron) this.ron.lookOverride = 0;
    this.shot('crane');
    const res = yield* this.play(raidGame({ total: v === 'queue' ? rr(17, 21) : rr(13, 16), early: v === 'lipstick' }));
    if (this.ron) this.ron.dnPose = null;
    this.chloeBack(false); this.shot('wide');
    if (!res.win) { yield 1.0; this.chloeSit(); yield* this.caughtFilm('seat'); return; }
    yield 1.2; this.chloeSit();
    this.raided += res.n || 0; track('dnRaid', res.n || 0);
    yield* this.winFilm(res, res.n ? `RAIDED ${res.n}!` : 'NOTHING? REALLY?');
    this.shot('overR'); yield this.chloeSay(R(['That\'s weird. Everyone in here looks hungrier than when I left.', 'Why is the birthday cake in the other room half gone?', 'Why is there a queue at the bar for food?']));
  }

  // ============================================================ THE LADS COME OVER
  *harryFilm(h) {
    if (!h) return;
    this.placePlayer();
    this.titleCard('💘', 'HARRY NEEDS ADVICE', 'Laugh or aww when she checks on you. Cram the rest');
    yield* this.fetch(h, 'Chloe! Can I ask you something? As a woman? Why won\'t anyone reply to me?');
    this.shot('overR'); yield this.chloeSay('Oh Harry. Sit... no, stand there. Tell me everything.');
    this.shot('trio');
    const res = yield* this.play(reactGame({ h }));
    if (!res.win) { yield* this.caughtFilm('react'); this.sendHome(h); return; }
    this.shot('char', { c: h, d: 1.2, side: 0.3 }); yield this.line(h, 'Thanks Chloe. Thanks Ron. You\'re a great listener, mate. And eater.');
    yield* this.winFilm(res, 'GREAT LISTENER');
    this.sendHome(h);
  }
  *oliverFilm(o) {
    if (!o) return;
    this.placePlayer();
    this.titleCard('📹', 'OLIVER\'S SHAME CAM', 'He\'s filming. Only eat when you\'re out of shot');
    yield* this.fetch(o, 'Hey guys, welcome back to the channel! It\'s DATE NIGHT with Ronnie and Chloe!');
    const c = this.chloe; if (c) { c.dnPose = 'wave'; c.lookOverride = 0.9; }
    this.shot('overR'); yield this.chloeSay('Oh my God, Oliver, are we live? Hi everyone! Hi Mum!');
    this.shot('trio');
    const res = yield* this.play(viewfinderGame({}));
    if (c) c.dnPose = null;
    if (!res.win) { this.shot('char', { c: o, d: 1.2, side: 0.3 }); yield this.line(o, 'Got it! In 4K! Ronnie eating ON A DATE. That\'s going on my story.'); yield* this.caughtFilm('filmed'); this.sendHome(o); return; }
    this.shot('char', { c: o, d: 1.2, side: 0.3 }); yield this.line(o, res.bombs ? `That\'s a wrap. ${res.bombs} photobomb${res.bombs > 1 ? 's' : ''}. The algorithm LOVES you, Ronnie.` : 'That\'s a wrap. Weird. I never got him eating once.');
    yield* this.winFilm(res, 'NOT IN SHOT');
    this.sendHome(o);
  }
  *pintsFilm(a, both) {
    if (!a) return;
    this.placePlayer();
    const other = both ? this.g.cast.find(o => o.id === (a.id === 'aidan' ? 'connor' : 'aidan')) : null;
    this.titleCard('🍺', 'JUST THE ONE', 'Keep your eye on the Guinness');
    yield* this.fetch(a, both ? 'Quiet one for the lovebirds! Our Connor\'s round.' : 'Quiet one for the lovebirds. Just the one.');
    if (other && other.rag) { other.seated = false; other.state = 'idle'; other.rag.placeAt(SIDE.x + 0.15, SIDE.z + 0.6, SIDE.yaw - 0.4); other.faceYaw = SIDE.yaw - 0.4; this.extraVisitor = other; const g0 = (this.d.dinerGroups || []).find(gp => gp.includes(other)); if (g0) { g0.splice(g0.indexOf(other), 1); other.dnGroup = g0; } }
    this.shot('overR'); yield this.chloeSay('He\'s not drinking tonight. Are you, babe? It\'s water for him.');
    this.shot('char', { c: a, d: 1.1, side: -0.3 }); yield this.line(a, 'Course. Water. *slides three glasses about* One of these is water. One\'s a Guinness. One\'s Chloe\'s wine.');
    this.shot('table');
    const res = yield* this.play(shellGame({}));
    if (other) { this.sendHome(other, true); this.extraVisitor = null; }
    if (!res.win && !res.soft) { this.shot('char', { c: a, d: 1.2, side: 0.3 }); yield this.line(a, 'Wrong one, Ron. That\'s her rosé. Night night.'); yield* this.caughtFilm('wine'); this.sendHome(a); return; }
    if (res.soft) { this.shot('ronnie'); yield this.line(this.ron, res.water ? 'It\'s... water. Actual water. Why would you DO that?' : 'Which one was it? I wasn\'t watching. I was watching the bread.'); this.shot('char', { c: a, d: 1.2, side: 0.3 }); yield this.line(a, 'Ah well. More for me.'); this.sendHome(a); return; }
    this.reward(20); this.shot('char', { c: a, d: 1.2, side: 0.3 }); yield this.line(a, R(['He didn\'t even let it SETTLE! Our grandad would weep!', 'That\'s a lovely pint. That WAS a lovely pint.']));
    yield* this.winFilm({ haul: 20 }, 'SPLIT THE G!');
    this.sendHome(a);
  }
  *dylanFilm(dy) {
    if (!dy) return;
    this.placePlayer();
    this.titleCard('🎸', 'DYLAN\'S WONDERWALL', 'Everyone\'s watching him. Grab what pops up. Not the broccoli');
    this.visitor = dy; const grp = (this.d.dinerGroups || []).find(gp => gp.includes(dy)); if (grp) { grp.splice(grp.indexOf(dy), 1); dy.dnGroup = grp; }
    dy.seated = false; dy.state = 'idle'; dy.rag.placeAt(SIDE.x + 0.5, SIDE.z - 0.9, SIDE.yaw + 0.5); dy.faceYaw = SIDE.yaw + 0.5;
    this.shot('char', { c: dy, d: 1.6, side: 0.4 }); sfx('boing', null, 1); yield this.line(dy, 'RONNIEEEEEE! This one\'s for the lovebirds! TODAY IS GONNA BE THE DAY...');
    const c = this.chloe; if (c) { c.dnPose = 'cry'; c.lookOverride = 0.9; }
    dy.dancing = true;
    this.shot('overR'); yield this.chloeSay('Dylan, NO. Everyone\'s looking. Oh my God. Everyone\'s singing.');
    this.shot('wide');
    const res = yield* this.play(whackGame({}));
    dy.dancing = false; if (c) c.dnPose = null;
    if (!res.win) { yield* this.caughtFilm('gag'); this.sendHome(dy); return; }
    this.shot('char', { c: dy, d: 1.3, side: 0.3 }); yield this.line(dy, '...and after aaaaall... you\'re my wonderwaaaall. Cheers Ron. You owe me a pint.');
    yield* this.winFilm(res, 'ENCORE!');
    this.sendHome(dy);
  }
  *ethanFilm(e) {
    if (!e) return;
    this.placePlayer();
    this.titleCard('⚽', 'ETHAN\'S FREE KICK', 'A bread roll, curled into your mouth. Time it right');
    const c = this.chloe;
    this.shot('char', { c: e, d: 1.4, side: 0.4 }); yield this.line(e, 'Ronnie! Set piece! Open wide! Like Roberto Carlos, but bread!');
    if (c) { c.dnPose = 'phone'; c.lookOverride = 0; }
    this.shot('overR'); yield this.chloeSay('Hang on babe, I\'m checking the bill. Nine starters?! NINE?');
    this.shot('side');
    const res = yield* this.play(kickGame({}));
    if (c) c.dnPose = null;
    if (!res.win) { yield* this.caughtFilm('roll'); return; }
    this.shot('char', { c: e, d: 1.2, side: 0.3 }); yield this.line(e, res.n >= 3 ? 'HAT-TRICK! Hala Madrid! And bread!' : 'Top bins, Ronnie! Well. Top Ronnie.');
    yield* this.winFilm(res, res.n >= 3 ? 'HAT-TRICK!' : 'TOP BINS!');
  }

  // ============================================================ BUSTED: her reaction, and the penalty
  *caughtFilm(reason, fromPlay) {
    const c = this.chloe, r = this.ron, g = this.g, P = g.player;
    this.catches++; track('dnBusted'); this.look = true;
    if (this.game) this.game = null;
    this.placePlayer();
    sfx('record_scratch', null, 0.9); P.shake && P.shake(0.6);
    if (c && c.dnHidden) this.chloeBack(true);
    if (c) { c.dnPose = 'point'; c.lookOverride = null; }
    this.titleS = 'BUSTED!'; this.ui.slate(`🎬 BUSTED · ${this.catches} / 3`);
    this.shot('dutch'); this.stamp('BUSTED!', '#ff3a3a', 1.4);
    g.words.show('BUSTED!', this.chloeHead().add({ x: 0, y: 0.4, z: 0 }), CHLOE_COL, 0.2, 1.4);
    yield this.chloeSay(R(BUSTED[reason] || BUSTED.table));
    this.shot('ronnie'); if (r) r.dnPose = 'shrug';
    yield this.line(r, R(SORRY));
    if (r) r.dnPose = null;
    if (this.catches >= 3) {
      if (c) c.dnPose = 'cross';
      this.shot('wide'); sfx('sadviolin', null, 0.9); this.stamp('💔 3 / 3', '#ff3a3a', 3);
      yield this.chloeSay('That\'s it. I\'ve ordered you a salad. And I\'m telling Chester.');
      this.cam = null; this.d.end(); return;
    }
    // the penalty: a different one each time
    const fresh = PENALTIES.filter(p => !this.penUsed.includes(p.id)); const pen = R(fresh.length ? fresh : PENALTIES); this.penUsed.push(pen.id);
    this.titleCard(pen.icon, pen.title, pen.sub, 2.6);
    if (c) c.dnPose = pen.id === 'mum' ? 'phoneup' : 'cross';
    this.shot(pen.id === 'salad' || pen.id === 'plate' ? 'table' : 'chloe');
    if (pen.id === 'salad') { for (const [type, dx] of [['broccoli', -0.12], ['carrot', 0.1], ['cucumber', 0.0]]) { try { g.items.spawn(type, V(T.x + dx, 0.92, T.z + 0.25)); } catch (e) {} } this.probation = 10; }
    if (pen.id === 'plate') { for (const it of g.items.items.slice()) { if (!it.dead && !it.heldBy && Math.hypot(it.pos.x - T.x, it.pos.z - T.z) < 0.55 && !it.def.veg) { try { g.items.remove(it); g.items.queueRespawn(it.type); } catch (e) {} } } g.addChonk(-15); this.d.stats.chonk = Math.max(0, this.d.stats.chonk - 15); }
    if (pen.id === 'mum') P.effect('noEat', 8);
    if (pen.id === 'lecture') this.lecture = true;
    if (pen.id === 'bread') this.shorter = 2;
    yield this.chloeSay(pen.line);
    if (pen.id === 'lecture') { this.inBeat = false; this.shot('chloe'); yield this.chloeSay('And another thing. Chester eats better than you. CHESTER. He eats a salmon pâté.'); this.inBeat = true; }
    if (pen.id === 'mum') { this.shot('ronnie'); yield this.line(r, 'Hi Mum. Yes. No. It was ONE bread roll. Fine. Three.'); }
    if (c) c.dnPose = pen.id === 'salad' ? 'salad' : null;
    this.cool = 2; this.probation = Math.max(this.probation, 5);
    if (fromPlay) this.nextT = Math.max(this.nextT, 9);
  }
}

// ---------------------------------------------------------------- the shots: [camera position, where it looks, roll]
const SHOTS = {
  wide: (S, t) => [V(2.35 + Math.sin(t * 0.25) * 0.1, 1.75, 2.7), V(0, 0.95, T.z - 0.1)],
  side: (S, t) => { const k = ease(t / 6); return [V(1.95 - 0.22 * k, 1.2, T.z + 0.05), V(0, 1.02, T.z)]; },
  overR: (S, t) => { const k = ease(t / 4), h = S.chloeHead(); return [V(0.62 - 0.05 * k, 1.68, RON.z + 1.05 - 0.15 * k), h.add({ x: 0, y: -0.1, z: 0 })]; },
  trio: (S, t) => [V(-1.75 + Math.min(0.2, t * 0.03), 1.5, T.z + 1.55), V(0.4, 1.05, T.z - 0.15)],
  chloe: (S, t) => { const h = S.chloeHead(); return [V(h.x + 0.24 + Math.sin(t * 0.3) * 0.03, h.y + 0.03, h.z + 0.9 - Math.min(0.15, t * 0.03)), h]; },
  ronnie: (S, t) => { const h = S.ronHead(); return [V(h.x - 0.22, h.y + 0.04, h.z - 0.9 + Math.min(0.15, t * 0.03)), h]; },
  table: (S, t) => [V(0.05, 2.15 - Math.min(0.2, t * 0.04), T.z + 0.6), V(0, 0.78, T.z + 0.05)],
  dutch: (S, t) => { const h = S.chloeHead(), k = ease(t / 0.5); return [V(h.x - 0.15, h.y + 0.05, h.z + 1.2 - 0.45 * k), h, 0.22]; },
  char: (S, t, o) => {
    const c = o.c; if (!c || c.disposed || !c.rag) return SHOTS.wide(S, t);
    const h = c.headPos(new THREE.Vector3()), to = V(T.x - h.x, 0, T.z - h.z); if (to.lengthSq() < 0.01) to.set(0, 0, 1); to.normalize();
    const side = V(to.z, 0, -to.x), d = o.d || 1.3;
    return [h.clone().addScaledVector(to, d).addScaledVector(side, (o.side || 0.3)).add({ x: 0, y: 0.05, z: 0 }), h.clone().add({ x: 0, y: -0.05, z: 0 })];
  },
  at: (S, t, o) => [o.pos.clone().add({ x: Math.sin(t * 0.4) * 0.06, y: 0, z: 0 }), o.look],
  crane: (S, t) => [V(-1.6 + Math.min(1.2, t * 0.1), 3.0, 4.6), V(0.5, 0.6, -1.5)],
};
export const DN_SHOTS = Object.keys(SHOTS);
const FAR = { side: 1.45, wide: 1.15, overR: 1.15, trio: 1.2, char: 1.15 };

// ---------------------------------------------------------------- the games
// each: { id, buttons: [{icon, label, sub, col, off, hot}], update(dt), press(i), release?(i), draw(g, w, h),
// danger (0..1: how close she is to seeing you), status (a line for the headset), result: null | { win, reason, ... } }

// CRAM: she's looking away. Tap the food in; it fills your cheeks (they empty as you swallow). Watch her: when she starts
// turning back (a "!", a sound, the screen edge goes red), stop, or tap ACT NATURAL for a bonus. Food going in while
// she's looking, or cheeks like a hamster's when she turns round: busted. Sometimes she half-turns and doesn't.
function cramGame(o) {
  const G = {
    id: 'cram', t: 0, phase: 'away', awayT: rr(o.dur[0], o.dur[1]), turnT: 0, lookT: 0, cheeks: 0, haul: 0, n: 0, last: -9, natural: false, smooth: false, result: null, danger: 0.1, status: 'SHE\'S BUSY: CRAM IT IN!', fakeAt: o.fakes ? rr(1.4, 2.2) : -1, fakeT: 0, msg: '', msgT: 0,
    buttons: [...o.srcs.map(s => ({ icon: s.icon, label: s.label, sub: '+' + s.chonk, col: '#ffd400' })), { icon: '😇', label: 'ACT NATURAL', sub: 'when she turns', col: '#9fe8ff' }],
    update(dt) {
      const S = this.S, c = S.chloe; this.t += dt; this.cheeks = Math.max(0, this.cheeks - dt * 0.2); if (this.msgT > 0) this.msgT -= dt;
      const away = o.away || 0, setLook = (k) => { if (c) c.lookOverride = away ? away * k : (k > 0.5 ? null : 0); if (c && o.pose && k > 0.5) c.dnPose = o.pose; else if (c && k < 0.3) c.dnPose = null; };
      if (this.phase === 'away') {
        this.awayT -= dt; this.danger = 0.12;
        if (this.fakeAt > 0 && this.t > this.fakeAt && !this.faked) { this.faked = true; this.phase = 'fake'; this.fakeT = 0.75; S.tell(c); this.status = '!! SHE\'S TURNING !!'; }
        if (this.awayT <= 0) { this.phase = 'turn'; this.turnT = o.window; this.turnMax = o.window; if (c) S.tell(c); this.status = '!! SHE\'S TURNING !!'; }
        setLook(1);
      } else if (this.phase === 'fake') {
        this.fakeT -= dt; const k = this.fakeT > 0.35 ? 1 - (0.75 - this.fakeT) / 0.4 * 0.5 : 0.5 + (0.35 - this.fakeT) / 0.35 * 0.5; setLook(Math.max(0.5, k)); this.danger = 0.75;
        if (this.fakeT <= 0) { this.phase = 'away'; this.msg = o.fakeText || 'FALSE ALARM!'; this.msgT = 2; this.status = 'FALSE ALARM: KEEP GOING!'; if (c && o.pose) c.dnPose = o.pose; }
      } else if (this.phase === 'turn') {
        this.turnT -= dt; const k = this.turnT / this.turnMax; setLook(0.2 + 0.8 * k); if (c) c.dnPose = null; this.danger = 0.65 + 0.35 * (1 - k);
        if (this.turnT <= 0) { this.phase = 'look'; this.lookT = 0; setLook(0); this.status = 'SHE\'S LOOKING. DON\'T MOVE.';
          if (this.cheeks > 0.72) { this.result = { win: false, reason: 'hamster', haul: this.haul }; return; }
          if (this.t - this.last < 0.22) { this.result = { win: false, reason: 'mid', haul: this.haul }; return; } }
      } else if (this.phase === 'look') {
        this.lookT += dt; this.danger = 1; setLook(0);
        if (this.lookT > 0.9) this.result = { win: true, haul: this.haul, n: this.n, smooth: this.smooth };
      }
      const nat = this.buttons[this.buttons.length - 1]; nat.hot = this.phase === 'turn' && !this.natural; nat.off = this.natural;
      for (const b of this.buttons.slice(0, -1)) b.off = this.natural;
    },
    press(i) {
      const S = this.S, r = S.ron;
      if (i === this.buttons.length - 1) { this.natural = true; if (r) r.dnPose = 'innocent';
        if (this.phase === 'turn') { this.smooth = true; S.reward(5); S.g.words.show('SMOOTH +5', S.ronHead().add({ x: 0, y: 0.3, z: 0 }), '#9fe8ff', 0.09, 1); }
        else if (this.phase === 'away' || this.phase === 'fake') { this.awayT = Math.min(this.awayT, 0.6); this.phase = 'away'; }
        return; }
      if (this.natural) return;
      if (this.phase === 'look') { this.result = { win: false, reason: 'red', haul: this.haul }; return; }
      const s = o.srcs[i]; this.haul += s.chonk; this.n++; this.cheeks = Math.min(1, this.cheeks + s.cheek); this.last = this.t; S.reward(s.chonk);
      if (r) { r.dnPose = 'cram'; r.lookOverride = i === 1 && s === SRC.next ? -0.6 : 0; }
      if (s.noise && this.phase === 'away' && Math.random() < s.noise) { this.awayT = Math.min(this.awayT, 0.01); this.msg = 'CLATTER! "...what was that?"'; this.msgT = 1.5; }
    },
    draw(g, w, h) {
      panel(g, w, h);
      const pad = Math.max(6, h * 0.06), mh = Math.max(16, Math.min(28, h * 0.2));
      const lookK = this.phase === 'look' ? 1 : this.phase === 'turn' ? 0.6 + 0.4 * (1 - this.turnT / this.turnMax) : this.phase === 'fake' ? 0.7 : 0.12;
      eyeMeter(g, pad, pad, w - pad * 2, mh, lookK, this.phase === 'look' ? 'SHE\'S LOOKING!' : this.phase === 'turn' ? 'SHE\'S TURNING!' : 'CHLOE');
      meter(g, pad, pad * 2 + mh, (w - pad * 3) * 0.6, mh, this.cheeks, this.cheeks > 0.72 ? '#ff3a3a' : '#ffb3d9', this.cheeks > 0.72 ? 'CHEEKS FULL!' : 'CHEEKS', '🐹');
      txt(g, `+${Math.round(this.haul)}`, pad * 2 + (w - pad * 3) * 0.6 + (w - pad * 3) * 0.2, pad * 2 + mh * 1.5, mh * 0.9, '#ffd400', { stroke: 4 });
      const line = this.msgT > 0 ? this.msg : this.status, y = pad * 3 + mh * 2 + (h - (pad * 3 + mh * 2)) / 2;
      if (h - (pad * 3 + mh * 2) > 14) txt(g, line, w / 2, y, Math.min(18, (h - (pad * 3 + mh * 2)) * 0.6), this.phase === 'turn' || this.phase === 'look' ? '#ff6b6b' : '#fff', { maxW: w - pad * 2, stroke: 3 });
    },
  };
  return G;
}

// SECRET ORDER: Ben's code is on his pad (three gestures). Do them in order while she's got her head in the menu; not
// while she looks up (she glances: watch for her starting to). A wrong one confuses Ben; two and he gives the game away.
const GESTURES = [{ icon: '😉', label: 'WINK', means: 'BURGER' }, { icon: '🤫', label: 'SHH', means: 'CHIPS' }, { icon: '👉', label: 'POINT', means: 'EXTRA' }];
function signalGame() {
  const code = shuffle([0, 1, 2]).concat([Math.floor(Math.random() * 3)]).slice(0, 3);
  return {
    id: 'signals', t: 0, code, idx: 0, wrong: 0, st: 'menu', stT: rr(1.4, 2.4), result: null, danger: 0.15, status: 'DO BEN\'S CODE WHILE SHE READS', time: 13,
    buttons: GESTURES.map(gs => ({ icon: gs.icon, label: gs.label, sub: gs.means, col: '#ffd400' })),
    update(dt) {
      const S = this.S, c = S.chloe; this.t += dt; this.time -= dt; this.stT -= dt;
      if (this.st === 'menu') { this.danger = 0.15; if (c) { c.dnPose = 'menu'; c.lookOverride = null; } if (this.stT <= 0) { this.st = 'tell'; this.stT = 0.55; S.tell(c); this.status = '!! SHE\'S LOOKING UP !!'; } }
      else if (this.st === 'tell') { this.danger = 0.7; if (c) c.dnPose = 'menu'; if (this.stT <= 0) { this.st = 'up'; this.stT = rr(1.0, 1.5); this.status = 'SHE\'S LOOKING. STAY STILL.'; } }
      else if (this.st === 'up') { this.danger = 1; if (c) { c.dnPose = null; c.lookOverride = null; } if (this.stT <= 0) { this.st = 'menu'; this.stT = rr(1.3, 2.3); this.status = 'SHE\'S READING: GO!'; } }
      if (this.time <= 0 && !this.result) this.result = { win: false, soft: true };
      for (const b of this.buttons) b.hot = this.st === 'menu';
    },
    press(i) {
      const S = this.S, w = S.visitor, r = S.ron;
      if (this.st === 'up') { this.result = { win: false, reason: 'gesture' }; return; }
      if (r) r.dnPose = 'wink'; setTimeout(() => { if (r && r.dnPose === 'wink') r.dnPose = null; }, 500);
      if (i === this.code[this.idx]) { this.idx++; sfx('ding', null, 0.7); if (this.idx >= 3) { this.result = { win: true }; } return; }
      this.wrong++; this.idx = 0; sfx('error', null, 0.7);
      if (w) w.say(R(['Sorry? A wink? Sir, I\'m working.', 'Is that... chips? Or a nosebleed?', 'Start again, Ron. Slowly.']), 5);
      if (this.wrong >= 2) this.result = { win: false, reason: 'gesture' };
    },
    draw(g, w, h) {
      panel(g, w, h, 'rgba(250,244,226,0.95)');
      const pad = Math.max(6, h * 0.06), mh = Math.max(16, Math.min(26, h * 0.2));
      eyeMeter(g, pad, pad, w * 0.5 - pad, mh, this.st === 'up' ? 1 : this.st === 'tell' ? 0.7 : 0.12, this.st === 'up' ? 'LOOKING!' : 'IN THE MENU');
      txt(g, `⏱ ${Math.max(0, Math.ceil(this.time))}s`, w * 0.75, pad + mh / 2, mh * 0.75, '#5a0f18');
      txt(g, 'BEN\'S PAD: DO THESE IN ORDER', w / 2, pad * 2 + mh * 1.3, Math.min(14, h * 0.11), '#5a0f18', { maxW: w - 20 });
      const n = 3, bw = Math.min(h * 0.42, (w - pad * 2) / n - 10), y = h - pad - bw / 2 - 2;
      for (let k = 0; k < n; k++) { const x = w / 2 + (k - 1) * (bw + 14);
        g.fillStyle = k < this.idx ? '#39ff14' : k === this.idx ? '#ffd400' : '#e9dfc4'; rr2(g, x - bw / 2, y - bw / 2, bw, bw, 10); g.fill(); g.lineWidth = 3; g.strokeStyle = '#5a0f18'; rr2(g, x - bw / 2, y - bw / 2, bw, bw, 10); g.stroke();
        emo(g, GESTURES[this.code[k]].icon, x, y, bw * 0.62); if (k < this.idx) txt(g, '✓', x + bw * 0.32, y - bw * 0.3, bw * 0.3, '#0a5a0a'); }
    },
  };
}

// THE DESSERT TROLLEY: desserts slide past; GRAB one in the green zone (it takes a moment to chew: she mustn't glance
// then) or STASH it under the napkin (no chewing, eaten later, worth less). Not her sorbet. Not the fruit salad.
const DESSERTS = [['🍰', 12], ['🍮', 10], ['🧁', 9], ['🍩', 10], ['🍨', 11], ['🥧', 13], ['🍫', 9]];
function conveyorGame() {
  return {
    id: 'trolley', t: 0, time: 11, lane: [], spawnT: 0.3, chewT: 0, st: 'busy', stT: rr(2.0, 3.0), stash: 0, stashV: 0, haul: 0, result: null, danger: 0.15, status: 'GRAB IN THE GREEN. NOT HER SORBET',
    buttons: [{ icon: '🫳', label: 'GRAB & EAT', sub: 'full points', col: '#ffd400' }, { icon: '🧻', label: 'STASH IT', sub: 'safer', col: '#9fe8ff' }],
    update(dt) {
      const S = this.S, c = S.chloe; this.t += dt; this.time -= dt; this.stT -= dt; if (this.chewT > 0) this.chewT -= dt;
      if ((this.spawnT -= dt) <= 0) { this.spawnT = rr(0.55, 0.9); const r = Math.random(); this.lane.push({ x: -0.08, e: r < 0.14 ? '🍧' : r < 0.24 ? '🥗' : null, d: R(DESSERTS) }); }
      for (const it of this.lane) it.x += dt * 0.34;
      this.lane = this.lane.filter(it => it.x < 1.1 && !it.gone);
      if (this.st === 'busy') { this.danger = 0.15; if (c) c.lookOverride = 1.0; if (this.stT <= 0) { this.st = 'tell'; this.stT = 0.6; S.tell(c); } }
      else if (this.st === 'tell') { this.danger = 0.7; if (c) c.lookOverride = 0.5; if (this.stT <= 0) { this.st = 'glance'; this.stT = 0.9; } }
      else { this.danger = 1; if (c) c.lookOverride = null; if (this.chewT > 0) { this.result = { win: false, reason: 'chewing' }; return; } if (this.stT <= 0) { this.st = 'busy'; this.stT = rr(1.6, 2.8); } }
      this.status = this.st === 'glance' ? 'SHE\'S GLANCING OVER!' : this.st === 'tell' ? '!! SHE\'S TURNING !!' : this.chewT > 0 ? 'CHEWING...' : 'GRAB IN THE GREEN. NOT HER SORBET';
      const z = this.inZone(); for (const b of this.buttons) b.hot = !!z && !z.e && this.st === 'busy';
      if (this.time <= 0) { const v = Math.round(this.stashV * 0.7); if (v) S.reward(v); this.result = { win: true, haul: this.haul + v, stash: this.stash }; }
    },
    inZone() { return this.lane.find(it => it.x > 0.4 && it.x < 0.6 && !it.gone) || null; },
    press(i) {
      const S = this.S, z = this.inZone(), r = S.ron;
      if (this.st === 'glance') { this.result = { win: false, reason: 'chewing' }; return; }
      if (!z) { S.g.words.show('MISSED', S.ronHead().add({ x: 0.2, y: 0.25, z: 0 }), '#fff', 0.07, 0.5); return; }
      z.gone = true;
      if (z.e === '🍧') { this.result = { win: false, reason: 'sorbet' }; return; }
      if (z.e === '🥗') { S.g.addChonk(-6); S.g.words.show('FRUIT SALAD. BLEURGH', S.ronHead().add({ x: 0, y: 0.3, z: 0 }), '#7cff6a', 0.08, 1); sfx('error', null, 0.7); return; }
      if (i === 0) { this.chewT = 0.65; this.haul += z.d[1]; S.reward(z.d[1]); if (r) { r.dnPose = 'cram'; setTimeout(() => { if (r.dnPose === 'cram') r.dnPose = null; }, 600); } }
      else { this.stash++; this.stashV += z.d[1]; sfx('ding', null, 0.6); }
    },
    draw(g, w, h) {
      panel(g, w, h);
      const pad = Math.max(6, h * 0.06), mh = Math.max(16, Math.min(24, h * 0.18));
      eyeMeter(g, pad, pad, w * 0.55, mh, this.st === 'glance' ? 1 : this.st === 'tell' ? 0.7 : 0.12, this.st === 'glance' ? 'GLANCING!' : 'ASKING BEN');
      txt(g, `🧻 ${this.stash}  ⏱ ${Math.max(0, Math.ceil(this.time))}`, w * 0.8, pad + mh / 2, mh * 0.7, '#fff', { maxW: w * 0.38 });
      const ly = pad * 2 + mh, lh = h - ly - pad; if (lh < 12) return;
      g.fillStyle = '#3a0a10'; rr2(g, pad, ly, w - pad * 2, lh, 8); g.fill();
      g.fillStyle = 'rgba(57,255,20,0.28)'; g.fillRect(pad + (w - pad * 2) * 0.4, ly, (w - pad * 2) * 0.2, lh); g.lineWidth = 3; g.strokeStyle = '#39ff14'; g.strokeRect(pad + (w - pad * 2) * 0.4, ly + 1.5, (w - pad * 2) * 0.2, lh - 3);
      for (const it of this.lane) { const x = pad + (w - pad * 2) * it.x; if (x < pad - 10) continue; emo(g, it.e || it.d[0], x, ly + lh / 2, Math.min(lh * 0.8, 48)); }
    },
  };
}

// THE NAPKIN TRICK: hold to slide the extras under your napkin, a bit at a time. Let go when she looks over.
function napkinGame() {
  const FOODS = [['🍔', 15], ['🌭', 14], ['🍩', 10]];
  return {
    id: 'napkin', t: 0, time: 12, k: 0, done: 0, holding: false, st: 'busy', stT: rr(1.6, 2.6), result: null, danger: 0.15, haul: 0, status: 'HOLD TO SLIDE. LET GO WHEN SHE LOOKS',
    buttons: [{ icon: '🧻', label: 'HOLD TO SLIDE', sub: 'let go when she looks', col: '#ffd400' }],
    update(dt) {
      const S = this.S, c = S.chloe; this.t += dt; this.time -= dt; this.stT -= dt;
      if (this.st === 'busy') { this.danger = 0.15; if (c) { c.dnPose = 'menu'; c.lookOverride = 0.6; } if (this.stT <= 0) { this.st = 'tell'; this.stT = 0.55; S.tell(c); } }
      else if (this.st === 'tell') { this.danger = 0.7; if (c) c.lookOverride = 0.3; if (this.stT <= 0) { this.st = 'look'; this.stT = rr(0.9, 1.4); } }
      else { this.danger = 1; if (c) { c.dnPose = null; c.lookOverride = null; } if (this.holding) { this.result = { win: false, reason: 'napkin' }; return; } if (this.stT <= 0) { this.st = 'busy'; this.stT = rr(1.4, 2.6); } }
      if (this.holding && this.done < 3) { this.k += dt / 1.3; if (this.k >= 1) { this.k = 0; const f = FOODS[this.done]; this.done++; this.haul += f[1]; S.reward(f[1]); } }
      this.buttons[0].hot = this.st === 'busy'; this.status = this.st === 'look' ? 'SHE\'S LOOKING! LET GO!' : this.st === 'tell' ? '!! SHE\'S TURNING !!' : 'HOLD TO SLIDE';
      if (this.done >= 3 || this.time <= 0) this.result = { win: true, n: this.done, haul: this.haul };
    },
    press() { this.holding = true; const r = this.S.ron; if (r) r.dnPose = 'reach'; },
    release() { this.holding = false; const r = this.S.ron; if (r) r.dnPose = 'innocent'; },
    draw(g, w, h) {
      panel(g, w, h);
      const pad = Math.max(6, h * 0.06), mh = Math.max(16, Math.min(24, h * 0.18));
      eyeMeter(g, pad, pad, w * 0.6, mh, this.st === 'look' ? 1 : this.st === 'tell' ? 0.7 : 0.12, this.st === 'look' ? 'LOOKING!' : 'WINE LIST');
      txt(g, `⏱ ${Math.max(0, Math.ceil(this.time))}`, w * 0.85, pad + mh / 2, mh * 0.75, '#fff');
      const y = pad * 2 + mh + (h - pad * 3 - mh) / 2, s = Math.min(h - pad * 3 - mh, w / 5);
      FOODS.forEach((f, i) => { const x = w * (0.25 + i * 0.25);
        if (i < this.done) { g.fillStyle = '#f5f0e8'; rr2(g, x - s * 0.5, y - s * 0.3, s, s * 0.6, 8); g.fill(); txt(g, '✓', x, y, s * 0.35, '#0a7a0a'); }
        else { const k = i === this.done ? this.k : 0; emo(g, f[0], x, y, s * 0.7); if (k > 0) { g.fillStyle = 'rgba(245,240,232,0.92)'; g.fillRect(x - s * 0.5, y - s * 0.45, s * k, s * 0.9); } } });
    },
  };
}

// THE LOO RAID: pick a target (each one's further away), GRAB what's there, and BACK TO YOUR SEAT before she's back. You
// don't know exactly when: listen for the flush, then the hand dryer. Sometimes she's back early for her lipstick.
const SPOTS = [
  { id: 'next', icon: '🍽️', label: 'NEXT TABLE', run: 0.9, n: 3, chonk: 9, pos: V(-0.4, 1.55, 0.2), look: V(-1.5, 0.8, -1.0), food: [-1.5, -1.0] },
  { id: 'trolley', icon: '🍰', label: 'THE TROLLEY', run: 1.2, n: 4, chonk: 11, pos: V(2.6, 1.5, -0.5), look: V(4.0, 0.9, -1.8), food: [4.0, -1.8] },
  { id: 'pass', icon: '🔥', label: 'THE PASS', run: 2.0, n: 5, chonk: 13, pos: V(1.2, 1.6, -4.0), look: V(0, 1.0, -6.2), food: [0, -6.2] },
  { id: 'bar', icon: '🍸', label: 'THE BAR', run: 2.0, n: 4, chonk: 12, pos: V(8.6, 1.7, -0.8), look: V(11.0, 1.15, -2.6), food: [11.1, -2.5] },
  { id: 'cake', icon: '🎂', label: 'BIRTHDAY CAKE', run: 2.6, n: 6, chonk: 15, pos: V(-7.5, 1.6, -0.8), look: V(-9.1, 0.95, -1.9), food: [-9.1, -1.7] },
];
function raidGame(o) {
  const spots = [SPOTS[0], ...shuffle(SPOTS.slice(1)).slice(0, 2)].map(s => ({ ...s, left: s.n }));
  return {
    id: 'raid', t: 0, total: o.total, where: null, st: 'seat', runT: 0, n: 0, haul: 0, flushed: false, dried: false, early: o.early && Math.random() < 0.9, earlyAt: rr(4.5, 6.5), result: null, danger: 0.1, status: 'PICK A TARGET',
    buttons: [],
    update(dt) {
      const S = this.S; this.t += dt; const left = this.total - this.t;
      if (this.early && !this.earlyDone && this.t > this.earlyAt) { this.earlyDone = true; this.total = Math.min(this.total, this.t + 3.2); S.cap = { name: '', col: '#fff', text: '"Babe? I forgot my lipstick!" She\'s coming back!' }; sfx('warn', null, 1); }
      if (!this.flushed && left < 5) { this.flushed = true; sfx('flush', null, 1); S.cap = { name: '', col: '#fff', text: '🔊 *FLUSH*' }; }
      if (!this.dried && left < 2.4) { this.dried = true; sfx('dn_dryer', null, 1); S.cap = { name: '', col: '#fff', text: '🔊 The hand dryer. She\'s nearly out!' }; }
      this.danger = left < 2.4 ? 1 : left < 5 ? 0.7 : 0.15;
      if (this.st === 'going' || this.st === 'back') { this.runT -= dt; if (this.runT <= 0) { if (this.st === 'going') { this.st = 'at'; S.shot('at', { pos: this.where.pos, look: this.where.look }); } else { this.st = 'seat'; this.where = null; S.shot('crane'); } } }
      if (left <= 0) { this.result = this.st === 'seat' ? { win: true, n: this.n, haul: this.haul } : { win: false, reason: 'seat' }; return; }
      // the buttons for where you are
      if (this.st === 'seat') { this.buttons = spots.map(s => ({ icon: s.icon, label: s.label, sub: s.left ? `${s.run.toFixed(1)}s away` : 'EMPTY', col: '#ffd400', off: !s.left })); this.status = this.flushed ? 'STAY SAT. LOOK INNOCENT' : 'PICK A TARGET'; }
      else if (this.st === 'at') { this.buttons = [{ icon: '🫳', label: 'GRAB', sub: `${this.where.left} left`, col: '#ffd400', off: !this.where.left }, { icon: '🏃', label: 'BACK TO SEAT', sub: `${this.where.run.toFixed(1)}s`, col: '#9fe8ff', hot: this.flushed }]; this.status = 'GRAB IT. THEN GET BACK!'; }
      else { this.buttons = [{ icon: '🏃', label: this.st === 'going' ? 'RUNNING...' : 'RUNNING BACK...', sub: '', col: '#aaa', off: true }]; this.status = 'RUNNING...'; }
    },
    press(i) {
      const S = this.S;
      if (this.st === 'seat') { const s = spots[i]; if (!s || !s.left) return; this.where = s; this.st = 'going'; this.runT = s.run; S.shot('crane'); sfx('sprint', null, 0.7); return; }
      if (this.st === 'at') {
        if (i === 0 && this.where.left > 0) { this.where.left--; this.n++; this.haul += this.where.chonk; const p = S.eatNear(this.where.food[0], this.where.food[1], 1.6); S.reward(this.where.chonk, p || this.where.look.clone().add({ x: 0, y: 0.2, z: 0 }));
          if (this.where.id === 'next' && Math.random() < 0.6) { const grp = (S.d.dinerGroups || []).find(gp => gp.some(c => c.seat && Math.hypot(c.seat.x - this.where.food[0], c.seat.z - this.where.food[1]) < 1.2)); const c = grp && R(grp); if (c) c.say(R(['Oi! That\'s my risotto!', 'Ronnie! That was my starter!', 'He\'s eaten my garnish. Who eats a GARNISH?']), 5); }
          if (this.where.id === 'pass' && Math.random() < 0.5) S.cap = { name: '', col: '#fff', text: 'Chef: "SERVICE! ...where\'s table four\'s steak?"' };
          return; }
        if (i === 1) { this.st = 'back'; this.runT = this.where.run; S.shot('crane'); sfx('sprint', null, 0.7); }
      }
    },
    draw(g, w, h) {
      panel(g, w, h);
      const pad = Math.max(6, h * 0.06), mh = Math.max(16, Math.min(24, h * 0.18)), left = this.total - this.t;
      const lab = this.flushed ? (this.dried ? '🔊 HAND DRYER!' : '🔊 FLUSH!') : '🚽 IN THE LOO';
      meter(g, pad, pad, w - pad * 2, mh, this.flushed ? Math.min(1, 1 - left / 5) : 0.08, this.dried ? '#ff3a3a' : this.flushed ? '#ffb020' : '#39ff14', lab, '💄');
      txt(g, `RAIDED ${this.n}  ·  +${Math.round(this.haul)}`, w / 2, pad * 2 + mh * 1.5, mh * 0.8, '#ffd400', { stroke: 3, maxW: w - pad * 2 });
      const y = pad * 3 + mh * 2, rest = h - y - pad; if (rest < 14) return;
      txt(g, this.st === 'seat' ? '🪑 YOU\'RE IN YOUR SEAT' : this.st === 'at' ? `📍 AT ${this.where.label}` : '🏃 RUNNING...', w / 2, y + rest / 2, Math.min(18, rest * 0.6), this.st === 'seat' ? '#39ff14' : '#ff9e9e', { maxW: w - pad * 2 });
    },
  };
}

// HARRY'S DATING DISASTERS: cram while she listens to him; when she turns to you for your reaction, react right
// (LAUGH at the funny ones, AWW at the sad ones) and not with your mouth full.
function reactGame(o) {
  const tales = shuffle(TALES.slice()).slice(0, 3);
  return {
    id: 'react', t: 0, i: -1, st: 'tell', stT: 0, sus: 0, last: -9, haul: 0, result: null, danger: 0.2, status: 'CRAM WHILE SHE LISTENS', want: null,
    buttons: [{ icon: '🍗', label: 'CRAM', sub: 'while she listens', col: '#ffd400' }, { icon: '😂', label: 'LAUGH', sub: 'funny ones', col: '#9fe8ff' }, { icon: '🥺', label: 'AWW', sub: 'sad ones', col: '#ffb3d9' }],
    next() { this.i++; if (this.i >= tales.length) { this.result = { win: true, haul: this.haul }; return; } const [line, tone] = tales[this.i]; this.want = tone; this.st = 'tell'; this.stT = Math.min(4.2, 1.6 + line.length * 0.035); this.S.line(o.h, line); },
    update(dt) {
      const S = this.S, c = S.chloe; this.t += dt; this.stT -= dt;
      if (this.i < 0) { this.next(); return; }
      if (this.st === 'tell') { this.danger = 0.2; if (c) c.lookOverride = 1.0; if (this.stT <= 0) { this.st = 'turn'; this.stT = 0.45; S.tell(c); } }
      else if (this.st === 'turn') { this.danger = 0.75; if (c) c.lookOverride = 0.45; if (this.stT <= 0) { this.st = 'react'; this.stT = 1.5; if (this.t - this.last < 0.3) { this.result = { win: false, reason: 'react' }; return; } S.chloeSay(this.want === 'lol' ? 'Isn\'t that funny, babe?' : 'Aww. Isn\'t that sad, babe?', 4); } }
      else if (this.st === 'react') { this.danger = 1; if (c) c.lookOverride = null; if (this.stT <= 0) { this.miss('...Ronnie? Are you even listening?'); } }
      this.status = this.st === 'react' ? (this.want === 'lol' ? 'SHE WANTS A REACTION!' : 'SHE WANTS A REACTION!') : this.st === 'turn' ? '!! SHE\'S TURNING TO YOU !!' : 'CRAM WHILE SHE LISTENS';
      this.buttons[0].hot = this.st === 'tell'; this.buttons[1].hot = this.buttons[2].hot = this.st === 'react';
    },
    miss(line) { this.sus++; sfx('error', null, 0.7); this.S.chloeSay(line, 5); if (this.sus >= 2) { this.result = { win: false, reason: 'react' }; return; } this.next(); },
    press(i) {
      const S = this.S, r = S.ron;
      if (i === 0) { if (this.st === 'react') { this.result = { win: false, reason: 'react' }; return; } this.last = this.t; this.haul += 6; S.reward(6); if (r) { r.dnPose = 'cram'; setTimeout(() => { if (r.dnPose === 'cram') r.dnPose = null; }, 450); } return; }
      if (this.st !== 'react') { if (r) r.dnPose = i === 1 ? 'laugh' : 'innocent'; return; }
      const ok = (i === 1 && this.want === 'lol') || (i === 2 && this.want === 'sad');
      if (r) { r.dnPose = i === 1 ? 'laugh' : 'innocent'; setTimeout(() => { if (r.dnPose !== 'cram') r.dnPose = null; }, 900); }
      if (ok) { sfx('ding', null, 0.7); this.next(); } else this.miss(this.want === 'sad' ? 'Why are you LAUGHING? That\'s so sad.' : 'Aww? It was a JOKE, babe.');
    },
    draw(g, w, h) {
      panel(g, w, h);
      const pad = Math.max(6, h * 0.06), mh = Math.max(16, Math.min(24, h * 0.18));
      eyeMeter(g, pad, pad, w * 0.62, mh, this.st === 'react' ? 1 : this.st === 'turn' ? 0.75 : 0.15, this.st === 'react' ? 'REACT!' : 'LISTENING TO HARRY');
      txt(g, `${'💔'.repeat(this.sus)}${'🤍'.repeat(Math.max(0, 2 - this.sus))}`, w * 0.84, pad + mh / 2, mh * 0.8, '#fff');
      const y = pad * 2 + mh + (h - pad * 3 - mh) / 2, rest = h - pad * 3 - mh; if (rest < 14) return;
      const s = this.st === 'react' ? (this.want === 'lol' ? '😂 THAT ONE WAS FUNNY' : '🥺 THAT ONE WAS SAD') : `STORY ${Math.max(1, this.i + 1)} OF ${tales.length}`;
      txt(g, s, w / 2, y, Math.min(20, rest * 0.55), this.st === 'react' ? '#ffd400' : '#fff', { maxW: w - pad * 2, stroke: 3 });
    },
  };
}

// OLIVER'S SHAME CAM: the shot swings about; EAT when you're out of it. PHOTOBOMB while you're in it: the followers
// love it (and Chloe's too busy waving to notice).
function viewfinderGame() {
  return {
    id: 'viewfinder', t: 0, time: 9, x: 0.15, v: 0.42, turnT: rr(0.8, 1.6), bombs: 0, haul: 0, result: null, danger: 0.2, status: 'EAT WHEN YOU\'RE OUT OF SHOT', lastBomb: -9,
    buttons: [{ icon: '🍔', label: 'EAT', sub: 'out of shot', col: '#ffd400' }, { icon: '📸', label: 'PHOTOBOMB', sub: 'in shot', col: '#9fe8ff' }],
    inShot() { return Math.abs(this.x - 0.5) < 0.17; },
    update(dt) {
      this.t += dt; this.time -= dt; this.turnT -= dt;
      this.x += this.v * dt; if (this.x < 0.05 || this.x > 0.95) { this.v = -this.v; this.x = Math.max(0.05, Math.min(0.95, this.x)); }
      if (this.turnT <= 0) { this.turnT = rr(0.7, 1.6); if (Math.random() < 0.45) this.v = -this.v; this.v = Math.sign(this.v) * rr(0.32, 0.62); }
      const near = Math.abs(this.x - 0.5); this.danger = near < 0.17 ? 1 : near < 0.27 ? 0.7 : 0.2;
      this.status = this.inShot() ? '📹 YOU\'RE IN SHOT!' : 'EAT WHEN YOU\'RE OUT OF SHOT';
      this.buttons[0].hot = !this.inShot(); this.buttons[1].hot = this.inShot();
      if (this.time <= 0) this.result = { win: true, haul: this.haul, bombs: this.bombs };
    },
    press(i) {
      const S = this.S, r = S.ron;
      if (i === 0) { if (this.inShot()) { this.result = { win: false, reason: 'filmed' }; return; } this.haul += 7; S.reward(7); if (r) { r.dnPose = 'cram'; setTimeout(() => { if (r.dnPose === 'cram') r.dnPose = null; }, 450); } return; }
      if (this.inShot() && this.t - this.lastBomb > 0.8) { this.lastBomb = this.t; this.bombs++; S.reward(4); if (r) { r.dnPose = 'cheer'; setTimeout(() => { if (r.dnPose === 'cheer') r.dnPose = null; }, 700); } S.g.words.show('+10K FOLLOWERS', S.ronHead().add({ x: 0, y: 0.35, z: 0 }), '#9fe8ff', 0.08, 1); sfx('ding', null, 0.7); }
    },
    draw(g, w, h) {
      panel(g, w, h, 'rgba(8,10,16,0.88)');
      const pad = Math.max(6, h * 0.06), ly = pad, lh = h - pad * 2, lw = w - pad * 2;
      g.fillStyle = '#1d2230'; rr2(g, pad, ly, lw, lh, 8); g.fill();
      emo(g, '🍔', pad + lw * 0.5, ly + lh * 0.55, Math.min(lh * 0.55, 46));
      txt(g, 'RONNIE', pad + lw * 0.5, ly + lh * 0.12, Math.min(12, lh * 0.12), '#ffd400');
      const fx = pad + lw * (this.x - 0.17), fw = lw * 0.34;
      g.lineWidth = 3; g.strokeStyle = this.inShot() ? '#ff3a3a' : '#fff'; rr2(g, fx, ly + 3, fw, lh - 6, 6); g.stroke();
      g.fillStyle = this.inShot() ? 'rgba(255,58,58,0.18)' : 'rgba(255,255,255,0.08)'; rr2(g, fx, ly + 3, fw, lh - 6, 6); g.fill();
      g.fillStyle = '#ff2a2a'; g.beginPath(); g.arc(fx + 12, ly + 14, 5, 0, 7); g.fill(); txt(g, 'REC', fx + 34, ly + 14, 11, '#fff');
      txt(g, `⏱ ${Math.max(0, Math.ceil(this.time))}  📸 ${this.bombs}`, pad + lw - 6, ly + lh - 12, 13, '#fff', { align: 'right' });
    },
  };
}

// AIDAN AND CONNOR'S PINTS: three glasses, one's the Guinness. They shuffle them about. Pick the Guinness.
function shellGame() {
  const swaps = []; const n = 5 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) { const a = Math.floor(Math.random() * 3); let b = (a + 1 + Math.floor(Math.random() * 2)) % 3; swaps.push([a, b]); }
  return {
    id: 'shell', t: 0, phase: 'show', pos: [0, 1, 2], kinds: ['G', 'W', 'V'], swaps, si: 0, swT: 0, result: null, danger: 0.3, status: 'WATCH THE GUINNESS', pickT: 4,
    buttons: [{ icon: '⬅️', label: 'LEFT', col: '#ffd400', off: true }, { icon: '⬆️', label: 'MIDDLE', col: '#ffd400', off: true }, { icon: '➡️', label: 'RIGHT', col: '#ffd400', off: true }],
    update(dt) {
      this.t += dt;
      if (this.phase === 'show') { if (this.t > 1.6) { this.phase = 'shuffle'; this.status = 'KEEP YOUR EYE ON IT...'; } }
      else if (this.phase === 'shuffle') {
        const dur = Math.max(0.28, 0.6 - this.si * 0.045); this.swT += dt / dur;
        if (this.swT >= 1) { const [a, b] = this.swaps[this.si]; const ia = this.pos.indexOf(a), ib = this.pos.indexOf(b); this.pos[ia] = b; this.pos[ib] = a; this.si++; this.swT = 0; sfx('glass', null, 0.5); if (this.si >= this.swaps.length) { this.phase = 'pick'; this.status = 'WHICH ONE\'S THE GUINNESS?'; } }
      } else if (this.phase === 'pick') { this.pickT -= dt; if (this.pickT <= 0) this.result = { win: false, soft: true }; }
      for (const b of this.buttons) { b.off = this.phase !== 'pick'; b.hot = this.phase === 'pick'; }
    },
    press(i) { if (this.phase !== 'pick') return; const k = this.kinds[this.pos[i]]; this.result = k === 'G' ? { win: true } : k === 'W' ? { win: false, soft: true, water: true } : { win: false, reason: 'wine' }; },
    // where glass j is drawn (0..2), part-way through a swap
    slot(j) { let p = this.pos.indexOf(j); if (this.phase === 'shuffle' && this.si < this.swaps.length) { const [a, b] = this.swaps[this.si], k = ease(this.swT); if (p === this.pos.indexOf(a)) return [lerp(p, this.pos.indexOf(b), k), Math.sin(k * Math.PI)]; if (p === this.pos.indexOf(b)) return [lerp(p, this.pos.indexOf(a), k), -Math.sin(k * Math.PI)]; } return [p, 0]; },
    draw(g, w, h) {
      panel(g, w, h, 'rgba(40,24,12,0.9)');
      const pad = Math.max(6, h * 0.06), gs = Math.min(h * 0.62, w / 4.2);
      txt(g, this.status + (this.phase === 'pick' ? `  ⏱ ${Math.max(0, Math.ceil(this.pickT))}` : ''), w / 2, pad + 9, Math.min(15, h * 0.12), '#ffd400', { maxW: w - 20 });
      for (let j = 0; j < 3; j++) {
        const [s, lift] = this.slot(j), x = w / 2 + (s - 1) * (w / 3.4), y = h * 0.6 - lift * h * 0.08;
        const show = this.phase === 'show' || this.result, kind = this.kinds[j];
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(x - gs * 0.32, y - gs * 0.45); g.lineTo(x + gs * 0.32, y - gs * 0.45); g.lineTo(x + gs * 0.24, y + gs * 0.42); g.lineTo(x - gs * 0.24, y + gs * 0.42); g.closePath(); g.fill();
        g.fillStyle = show ? (kind === 'G' ? '#1a0d05' : kind === 'V' ? '#f4a0b0' : '#bfe3f0') : '#7a6a5a';
        g.beginPath(); g.moveTo(x - gs * 0.3, y - gs * 0.32); g.lineTo(x + gs * 0.3, y - gs * 0.32); g.lineTo(x + gs * 0.23, y + gs * 0.4); g.lineTo(x - gs * 0.23, y + gs * 0.4); g.closePath(); g.fill();
        if (show && kind === 'G') { g.fillStyle = '#f4ead0'; g.fillRect(x - gs * 0.3, y - gs * 0.4, gs * 0.6, gs * 0.1); }
        if (!show) { txt(g, '?', x, y, gs * 0.4, '#fff', { stroke: 4 }); }
        g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.moveTo(x - gs * 0.32, y - gs * 0.45); g.lineTo(x - gs * 0.24, y + gs * 0.42); g.lineTo(x + gs * 0.24, y + gs * 0.42); g.lineTo(x + gs * 0.32, y - gs * 0.45); g.stroke();
      }
    },
  };
}

// DYLAN'S WONDERWALL: the whole restaurant's watching him. Food pops up at the three nearest tables: grab it (the
// button under it). Broccoli pops up too: grab two of those and you gag. Loudly.
function whackGame() {
  return {
    id: 'whack', t: 0, time: 8, slots: [null, null, null], spawnT: 0.3, veg: 0, haul: 0, result: null, danger: 0.2, status: 'GRAB THE FOOD. NOT THE BROCCOLI',
    buttons: [0, 1, 2].map(() => ({ icon: '·', label: 'EMPTY', col: '#777', off: true })),
    update(dt) {
      this.t += dt; this.time -= dt;
      for (let i = 0; i < 3; i++) { const s = this.slots[i]; if (s && (s.t -= dt) <= 0) this.slots[i] = null; }
      if ((this.spawnT -= dt) <= 0) { this.spawnT = rr(0.35, 0.65); const free = [0, 1, 2].filter(i => !this.slots[i]); if (free.length) { const i = R(free), bad = Math.random() < 0.28; this.slots[i] = { e: bad ? '🥦' : R(['🍕', '🍔', '🌭', '🍗', '🍟', '🥐']), bad, t: rr(0.75, 1.1), c: bad ? 0 : R([7, 8, 9, 10]) }; } }
      this.buttons = this.slots.map((s, i) => s ? { icon: s.e, label: s.bad ? 'BROCCOLI!' : 'GRAB!', sub: ['LEFT', 'MIDDLE', 'RIGHT'][i], col: s.bad ? '#7cff6a' : '#ffd400', hot: !s.bad } : { icon: '·', label: 'EMPTY', sub: ['LEFT', 'MIDDLE', 'RIGHT'][i], col: '#777', off: true });
      if (this.time <= 0) this.result = { win: true, haul: this.haul };
    },
    press(i) {
      const s = this.slots[i], S = this.S; if (!s) return; this.slots[i] = null;
      if (s.bad) { this.veg++; S.g.addChonk(-5); sfx('error', null, 0.8); S.g.words.show('BLEURGH!', S.ronHead().add({ x: 0, y: 0.3, z: 0 }), '#7cff6a', 0.1, 0.9); if (this.veg >= 2) this.result = { win: false, reason: 'gag' }; return; }
      this.haul += s.c; S.reward(s.c); const r = S.ron; if (r) { r.dnPose = 'cram'; setTimeout(() => { if (r.dnPose === 'cram') r.dnPose = null; }, 400); }
    },
    draw(g, w, h) {
      panel(g, w, h);
      const pad = Math.max(6, h * 0.06), mh = Math.max(16, Math.min(24, h * 0.2)), k = Math.max(0, this.time / 8);
      meter(g, pad, pad, w - pad * 2, mh, k, '#e879f9', '♪ WONDERWALL ♪', '🎸');
      const rest = h - pad * 3 - mh; if (rest < 14) return;
      txt(g, `🥦 ${this.veg} / 2   +${Math.round(this.haul)}`, w / 2, pad * 2 + mh + rest / 2, Math.min(20, rest * 0.6), this.veg ? '#7cff6a' : '#ffd400', { stroke: 3, maxW: w - pad * 2 });
    },
  };
}

// ETHAN'S FREE KICK: a needle swings; KICK when it's in the green. The green gets smaller each time. Miss twice and the
// second one hits Chloe.
function kickGame() {
  return {
    id: 'kick', t: 0, a: 0, v: 1.6, kicks: 0, n: 0, miss: 0, zone: 0.22, cool: 0, result: null, danger: 0.2, status: 'KICK IN THE GREEN', haul: 0, flash: '', flashT: 0,
    buttons: [{ icon: '⚽', label: 'KICK!', sub: 'in the green', col: '#ffd400' }],
    update(dt) {
      this.t += dt; this.cool -= dt; this.flashT -= dt;
      this.a += this.v * dt; if (this.a > 1) { this.a = 1; this.v = -this.v; } if (this.a < -1) { this.a = -1; this.v = -this.v; }
      this.buttons[0].hot = Math.abs(this.a) < this.zone; this.buttons[0].off = this.cool > 0;
      this.danger = this.miss ? 0.6 : 0.2;
      if (this.kicks >= 3 && this.cool <= 0) this.result = this.n ? { win: true, n: this.n, haul: this.haul } : { win: false, reason: 'roll' };
    },
    press() {
      if (this.cool > 0 || this.kicks >= 3) return; const S = this.S; this.kicks++; this.cool = 0.9;
      if (Math.abs(this.a) < this.zone) { this.n++; const c = Math.abs(this.a) < this.zone * 0.4 ? 14 : 10; this.haul += c; S.reward(c); this.flash = c > 10 ? 'TOP BINS!' : 'IN!'; sfx('ding', null, 0.8); const r = S.ron; if (r) { r.dnPose = 'chew'; setTimeout(() => { if (r.dnPose === 'chew') r.dnPose = null; }, 800); } }
      else { this.miss++; this.flash = this.miss >= 2 ? 'IT HIT CHLOE!' : 'WIDE!'; sfx('error', null, 0.7); if (this.miss >= 2) { this.result = { win: false, reason: 'roll' }; return; } }
      this.flashT = 0.8; this.zone *= 0.8; this.v = Math.sign(this.v) * (1.6 + this.kicks * 0.5);
    },
    draw(g, w, h) {
      panel(g, w, h);
      const cx = w / 2, cy = h * 0.92, R0 = Math.min(h * 0.78, w * 0.42);
      g.lineWidth = Math.max(10, R0 * 0.16); g.lineCap = 'butt';
      g.strokeStyle = '#ff5a5a'; g.beginPath(); g.arc(cx, cy, R0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
      g.strokeStyle = '#39ff14'; const z = this.zone * Math.PI * 0.42; g.beginPath(); g.arc(cx, cy, R0, Math.PI * 1.5 - z, Math.PI * 1.5 + z); g.stroke();
      const an = Math.PI * 1.5 + this.a * Math.PI * 0.42; g.lineWidth = 4; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(an) * R0 * 1.08, cy + Math.sin(an) * R0 * 1.08); g.stroke();
      emo(g, '🥖', cx + Math.cos(an) * R0 * 1.08, cy + Math.sin(an) * R0 * 1.08, Math.min(30, h * 0.24));
      txt(g, `⚽ ${this.kicks}/3   ✓ ${this.n}`, 10, 16, Math.min(14, h * 0.12), '#fff', { align: 'left' });
      if (this.flashT > 0) txt(g, this.flash, cx, h * 0.45, Math.min(26, h * 0.22), this.flash === 'IN!' || this.flash === 'TOP BINS!' ? '#39ff14' : '#ff6b6b', { stroke: 4 });
    },
  };
}
export const DN_GAMES = { cram: cramGame, signals: signalGame, trolley: conveyorGame, napkin: napkinGame, raid: raidGame, react: reactGame, viewfinder: viewfinderGame, shell: shellGame, whack: whackGame, kick: kickGame };
