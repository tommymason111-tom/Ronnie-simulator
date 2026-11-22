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
//                      and Lewis's arm wrestle (push, and sneak bites with the other hand)
//   THE BIRTHDAY SONG  the lights go down for table six's cake: eat on the beat, sing when she sings, freeze for candles
//   BUSTED             any time she catches you: her reaction, your excuse (pick a good one), and a penalty. Three and
//                      the date's over
// No walking: you're sat at the table all night (the joystick and SPRINT go, keys and thumbsticks move nothing); the
// loo raid puts you at each spot with a quick fade, and back. No skipping: every line stays up long enough to read.
// The games themselves (rounds, art, scores) are in dngames.js.
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
import { cramGame, signalGame, conveyorGame, napkinGame, raidGame, reactGame, viewfinderGame, shellGame, whackGame, kickGame, wrestleGame, birthdayGame, excuseGame, choiceGame, emo, rr2, txt } from './dngames.js';      // (the games themselves)

const T = DATE_TABLE, RON = { x: T.x, z: T.z + 0.78 }, CHL = { x: T.x, z: T.z - 0.75 }, SEAT = { x: T.x, z: T.z + 1.05 };
const SIT_DROP = -0.36;      // (how far your eyes drop when you sit down at the table: level with Chloe's)
const SIDE = { x: T.x + 0.95, z: T.z + 0.1, yaw: -Math.PI / 2 };      // (where someone stands when they come over to the table)
const R = (a) => a[Math.floor(Math.random() * a.length)];
// how long a line stays up: comfortably readable on a phone (no skipping), never rushed
const readTime = (s) => Math.min(8, Math.max(2.8, 1.4 + String(s).length * 0.062));
const rr = (a, b) => a + Math.random() * (b - a);
const ease = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const lerp = (a, b, k) => a + (b - a) * k;
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _x = new THREE.Vector3(1, 0, 0);
const CHLOE_COL = '#B57BFF';

// ---------------------------------------------------------------- the lines
const LOOKS = {
  phone: { icon: '📱', title: 'SHE\'S ON HER PHONE', sub: 'Chester\'s been to the groomer\'s',
    lead: ['Oh my God, babe. Mum\'s sent me Chester\'s new haircut. Hang on.', 'Ooh, Chester\'s photos! Two seconds, babe.', 'Hold on, babe. Chester\'s on the vet\'s Instagram.'],
    pose: 'phone', look: 0, fake: 'She laughs at a photo of Chester... and keeps scrolling', pool: ['bread', 'pasta', 'chips', 'wine', 'butter', 'next'],
    again: ['Oh wait, he\'s had his teeth done! Look at his little teeth!', 'Mum\'s sent another one. Chester in a jumper. Hang on.'], mutter: ['Aww, his little face.', 'Who\'s a good boy? CHESTER is.', 'Look at his little paws, babe. Don\'t look.'] },
  waiter: { icon: '😍', title: 'THE HOT WAITER', sub: 'She\'s pretending she isn\'t looking',
    lead: ['Babe, don\'t look now, but is that waiter... is he a model?', 'Who IS that? No, I\'m not looking. You\'re looking.', 'That waiter\'s got arms like Lewis. Don\'t tell Lewis.'],
    pose: 'chin', look: 1.15, fake: 'He flicks his hair. She\'s gone again', pool: ['bread', 'next', 'wine', 'chips', 'pasta', 'butter'],
    again: ['Oh my God, he\'s doing the pepper grinder thing again.', 'He\'s taking an order at the next table. Look at his FOREARMS.'], mutter: ['Is he single? For Harry. Asking for Harry.', 'He\'s got a tattoo of a fork. Who gets a fork?'] },
  board: { icon: '📋', title: 'THE SPECIALS BOARD', sub: 'She\'s reading every single one out loud',
    lead: ['Ooh, specials. Let me read them to you, babe. Slowly. Like you need to hear them.', 'Hold on, I want to see the specials. Not for you. You\'re having the soup.'],
    pose: 'menu', look: -1.2, fake: '"Wait, is quinoa a grain?" ...she reads on', pool: ['pasta', 'bread', 'butter', 'wine', 'chips', 'next'],
    again: ['Oh, they\'ve rubbed one off and written another. "Deconstructed salad". Babe!', 'Wait, there\'s a back to the board. Hold on.'], mutter: ['"Pan-seared kale." Lovely. For you.', '"Foam of leek." Babe. FOAM.', 'Twenty-two pounds for a radish. Iconic.'] },
  propose: { icon: '💍', title: 'A PROPOSAL', sub: 'Someone\'s down on one knee at table six',
    lead: ['Oh my God. Babe. BABE. He\'s proposing. Look! No, don\'t look, film it!', 'Is that a ring?! At La Grande Portion?! Babe, that could be us. One day. If you lose a stone.'],
    pose: 'phoneup', look: -1.25, fake: 'She said yes! ...Chloe\'s crying. Keep going', pool: ['next', 'pasta', 'wine', 'bread', 'chips', 'butter'],
    again: ['Now they\'re doing a first dance. In a RESTAURANT. I\'m crying.', 'Her mum\'s come out of the kitchen! She was in on it!'], mutter: ['She\'s saying yes! She\'s... still saying it.', 'Ronnie, would YOU ever? Don\'t answer with your mouth full.'] },
  lobster: { icon: '🦞', title: 'THE LOBSTER TANK', sub: 'Gary the lobster is making a break for it',
    lead: ['Babe. The lobster. The lobster\'s climbing OUT. Gary, NO.', 'Is that lobster waving at me? It\'s waving at me. Hi Gary!'],
    pose: 'chin', look: 1.3, fake: 'Gary slips back in. She\'s still watching', pool: ['next', 'bread', 'chips', 'wine', 'pasta', 'butter'],
    again: ['He\'s out again! Gary! GARY! He\'s heading for the kitchen!', 'Now Shelldon\'s going for it too. It\'s a jailbreak.'], mutter: ['Go on, Gary. Be free.', 'He\'s faster than you, babe. A LOBSTER is faster than you.'] },
  foodpic: { icon: '📸', title: 'THE FOOD PHOTO', sub: 'Her salad needs forty-five photos. And the right light', look: 0.2,
    lead: ['Hold on, babe. The light\'s perfect. Nobody touch the salad. NOBODY.', 'This is going on my story. Move your arm. Move your... move YOU, babe.'],
    pose: 'photo', fake: 'Wait, that one\'s blurry. She takes forty more.', pool: ['bread', 'chips', 'butter', 'pasta', 'wine', 'next'],
    again: ['Now one from ABOVE. Babe, hold my chair. Don\'t eat while you hold it.', 'Boomerang! Do the boomerang! Don\'t be in it.'], mutter: ['Hmm. Filter. Which filter. "Clarendon"? Too orange.', 'Ten likes already. Mum\'s liked it twice.', 'Can you breathe quieter? It\'s a video.'] },
  ex: { icon: '😱', title: 'HER EX WALKS IN', sub: 'Darren. With a new girlfriend. She\'s hiding behind the menu',
    lead: ['Oh my God. It\'s Darren. DON\'T LOOK. Babe, is he looking? Don\'t look!', 'Babe. My ex just walked in. With HER. I\'m hiding. Act normal. Like, NORMAL normal.'],
    pose: 'menu', look: -1.25, fake: 'Darren waves. She ducks behind the menu again.', pool: ['next', 'bread', 'wine', 'pasta', 'chips', 'butter'],
    again: ['Now he\'s ordering the SAME thing we had on our first date. The audacity.', 'She\'s wearing my JUMPER. That\'s my jumper, Ronnie!'], mutter: ['Is he still looking? Don\'t look!', 'He\'s put on weight. Not as much as... never mind, babe.', 'Is that a man bun? Darren. DARREN.'] },
  mum: { icon: '☎️', title: 'HER MUM\'S ON THE PHONE', sub: 'It\'s about Chester\'s birthday party. It\'ll be a while',
    lead: ['It\'s Mum. I HAVE to get this. Hi Mum! ...no, he\'s being good. Mostly.', 'Mum\'s ringing. It\'s about Chester\'s party. Two minutes, babe.'],
    pose: 'call', look: -0.9, fake: '"Hang on Mum, let me check on him"... she doesn\'t. Keep going.', pool: ['bread', 'pasta', 'chips', 'next', 'wine', 'butter'],
    again: ['No, Mum. NO. Chester does NOT need a bouncy castle. ...How big?', 'Mum, put Dad on. DAD. Stop putting Chester on the phone.'], mutter: ['Yes, Mum. Yes. No. He\'s on a diet. Yes. A REAL one.', 'A cake shaped like Chester? For Chester? Mum...', 'Mum says hi, babe. She says put the bread down.'] },
};
// AIDAN W's knee: the setup, the punchline, whether it wants a laugh or an aww
const KNEE = [
  ['It started in 2019. Five-a-side. I went for a header.', 'The ball was on the floor, Chloe. On the FLOOR.', 'lol', '⚽'],
  ['The physio said rest it for six weeks.', 'That was four years ago. I\'m still resting it. Professionally.', 'sad', '🛋️'],
  ['I got a knee brace. Lovely brace.', 'Ollie sat on it. Now it\'s a flat brace.', 'lol', '🦵'],
  ['I can tell when it\'s going to rain.', 'It\'s always going to rain, Chloe. It\'s Essex.', 'lol', '🌧️'],
  ['Spurs signed a new physio. I thought: maybe he\'ll look at it.', 'He\'s been sacked. Spurs, Chloe.', 'sad', '🏟️'],
  ['I tried yoga for the knee.', 'The instructor asked me to leave. For the knee\'s sake.', 'sad', '🧘'],
  ['Last week it clicked so loud a dog came over.', 'It wanted to play. I couldn\'t. The knee.', 'sad', '🐕'],
];
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
  spotlight: ['The WHOLE restaurant just watched you eat a chicken leg, Ronnie.', 'Dylan pointed at you and you were EATING. Everyone saw. Dylan saw.'],
  wrestle: ['You\'re eating DURING an arm wrestle? With the other hand?!', 'I\'m refereeing, Ronnie. I can see your mouth. It\'s FULL.'],
  sing: ['You didn\'t sing ONE word, Ronnie. Not one. What\'s in your mouth?', 'Everyone sang. Except you. Because you were CHEWING.'],
  chilli: ['You just ate IAN\'S CHILLI, Ronnie. Your face is purple. And full.', 'Water! Get him WATER! ...why is there burger in his mouth?'],
  flicker: ['The lights came on and you were holding THREE bread rolls.', 'I SAW you. In the flicker. Mid-bite. Like a nature documentary.'],
  fire: ['The firemen found you in the kitchen, Ronnie. Eating. During a FIRE.', 'You were meant to be getting your coat! You\'re WEARING your coat!'],
  garnish: ['You ate the GARNISH. Twice. Chef saw. CHEF SAW, Ronnie.', 'Even the chef looked disappointed, babe.'],
  candle: ['The candles lit up the whole room, babe. And your face. And the cake in it.', 'In the candlelight. Romantic. You were eating a stranger\'s cake.'],
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
#dn .dn-fade { position: absolute; inset: 0; background: #000; opacity: 0; pointer-events: none; }
#dn .dn-fade.on { animation: dnFade .8s ease-in-out; } @keyframes dnFade { 0% { opacity: 0; } 40%, 55% { opacity: 1; } 100% { opacity: 0; } }
#dn .dn-dim { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 40%, rgba(40,20,0,0.25), rgba(0,0,0,0.78)); opacity: 0; transition: opacity .8s; pointer-events: none; }
#dn .dn-dim.on { opacity: 1; }
#dn .dn-res { position: absolute; left: 0; right: 0; top: 48%; display: flex; flex-direction: column; align-items: center; gap: 2px; opacity: 0; transform: scale(.6); transition: opacity .25s, transform .35s cubic-bezier(.2,1.5,.4,1); }
#dn .dn-res.on { opacity: 1; transform: none; }
#dn .dn-res b { font-size: clamp(34px, 10vw, 58px); color: #ffd400; -webkit-text-stroke: 2px #111; text-shadow: 0 4px 0 #111; letter-spacing: 4px; }
#dn .dn-res span { font-size: clamp(16px, 5vw, 26px); color: #fff; text-shadow: 0 3px 0 #111; -webkit-text-stroke: 1px #111; }
#dn .dn-ready { position: absolute; left: 12px; right: 12px; top: calc(var(--bt) + 12px); display: none; flex-direction: column; align-items: center; gap: 6px; padding: 14px 12px; border-radius: 18px; background: rgba(20,6,12,0.9); border: 3px solid #e879f9; text-align: center; }
#dn .dn-ready.on { display: flex; animation: dnReady .35s cubic-bezier(.2,1.4,.4,1); } @keyframes dnReady { from { transform: scale(.7); opacity: 0; } to { transform: none; opacity: 1; } }
#dn .dn-ready b { font-size: clamp(24px, 7vw, 36px); color: #ffd400; -webkit-text-stroke: 1px #111; text-shadow: 0 3px 0 #111; }
#dn .dn-ready span { font: 700 clamp(15px, 4.4vw, 20px)/1.25 Arial, sans-serif; color: #fff; }
body.dn-seated #stick, body.dn-seated #btn-sprint { display: none !important; }
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
  #dn .dn-stamp { top: 22%; font-size: 46px; }
  #dn .dn-res { top: 50%; } #dn .dn-res b { font-size: 36px; } #dn .dn-res span { font-size: 16px; }
}
`;
class DateUI {
  constructor(player) {
    this.P = player;
    if (!document.getElementById('dn-css')) { const st = document.createElement('style'); st.id = 'dn-css'; st.textContent = CSS; document.head.appendChild(st); }
    let el = document.getElementById('dn'); if (el) el.remove();
    el = this.el = document.createElement('div'); el.id = 'dn';
    el.innerHTML = '<div class="dn-dim"></div><div class="dn-flash"></div><div class="dn-res"><b></b><span></span></div><div class="dn-fade"></div><div class="dn-ready"></div><div class="dn-bar t"><div class="dn-slate"></div></div><div class="dn-title"><i></i><b></b><span></span></div><div class="dn-stamp"></div><div class="dn-game"><canvas class="dn-stage"></canvas><div class="dn-btns"></div></div><div class="dn-bar b"><div class="dn-cap"></div></div>';
    document.body.appendChild(el);
    const q = (s) => el.querySelector(s);
    this.q = { ready: q('.dn-ready'), fade: q('.dn-fade'), dim: q('.dn-dim'), res: q('.dn-res'), flash: q('.dn-flash'), slate: q('.dn-slate'), title: q('.dn-title'), stamp: q('.dn-stamp'), game: q('.dn-game'), stage: q('.dn-stage'), btns: q('.dn-btns'), cap: q('.dn-cap') };
    this.onPress = null; this.onRelease = null; this.btnKey = ''; this.btnEls = [];
    // (taps on the film itself do nothing: no skipping, it plays at its own pace. They don't reach the game behind it either)
    const stop = (e) => { e.stopPropagation(); };
    el.addEventListener('pointerdown', stop);
    for (const k of ['touchstart', 'mousedown', 'wheel', 'click']) el.addEventListener(k, stop);
    this.keyDown = (e) => { if (!this.keys) return; const i = { Digit1: 0, Numpad1: 0, Space: 0, Digit2: 1, Numpad2: 1, Digit3: 2, Numpad3: 2, Enter: -1 }[e.code]; if (i === undefined) return;
      e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat || i < 0) return; if (i < this.btnEls.length) { this.flashBtn(i, true); this.onPress && this.onPress(i); } };
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
  caption(name, color, text) {
    const k = name + '|' + text; if (this.capK === k) return; this.capK = k; const c = this.q.cap; c.innerHTML = '';
    if (!text) return;
    if (name) { const b = document.createElement('b'); b.textContent = name.toUpperCase(); b.style.color = color || '#ffd400'; c.appendChild(b); }
    const s = document.createElement('div'); s.textContent = text; c.appendChild(s);
  }
  title(icon, big, small) {
    const t = this.q.title; if (!big) { t.classList.remove('on'); return; }
    t.children[0].textContent = icon || ''; t.children[1].textContent = big; t.children[2].textContent = small || ''; t.children[2].style.display = small ? '' : 'none';
    t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
  }
  stamp(s, col) { const st = this.q.stamp; if (!s) { st.classList.remove('on'); return; } st.textContent = s; st.style.color = col || '#ffd400'; st.classList.remove('on'); void st.offsetWidth; st.classList.add('on'); }
  // GET READY: the game's instructions, big, before it starts
  ready(lines) {
    const r = this.q.ready; if (!lines) { r.classList.remove('on'); this.readyL = null; return; }
    r.innerHTML = '<b>GET READY!</b>'; for (const l of lines) { const d = document.createElement('span'); d.textContent = l; r.appendChild(d); }
    r.classList.remove('on'); void r.offsetWidth; r.classList.add('on'); this.readyL = lines;
  }
  // a quick fade to black and back (the game putting you somewhere else: no walking in Date Night)
  fade() { const f = this.q.fade; f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
  dim(on) { this.q.dim.classList.toggle('on', !!on); this.dimOn = !!on; }
  // a won film's stars and score, big in the middle
  result(st, sub) { const r = this.q.res; if (!st) { r.classList.remove('on'); this.resS = null; return; } r.children[0].textContent = st; r.children[1].textContent = sub || ''; r.classList.remove('on'); void r.offsetWidth; r.classList.add('on'); this.resS = st + '  ' + (sub || ''); }
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
    }
    if (st.stamp) txt(g, st.stamp, W / 2, 300, 96, st.stampCol || '#ffd400', { stroke: 12 });
    if (this.resS) txt(g, this.resS, W / 2, 420, 54, '#ffd400', { stroke: 8, maxW: W - 60 });
    if (st.ready) { g.fillStyle = 'rgba(20,6,12,0.94)'; rr2(g, 40, 90, W - 80, 230, 26); g.fill(); txt(g, 'GET READY!', W / 2, 140, 56, '#ffd400', { stroke: 8 }); st.ready.forEach((l, i) => txt(g, l, W / 2, 210 + i * 56, 36, '#fff', { weight: 700, maxW: W - 120 })); }
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
    this.nextT = 0.2; this.used = new Set(); this.lastKind = null; this.penUsed = [];
    this.cam = null; this.camObj = new THREE.PerspectiveCamera(50, 1, 0.05, 200); this.hidNear = [];
    this.scene = null; this.game = null; this.cap = null; this.stampS = null; this.liveT = 0; this.topT = 6;
  }
  // how hard the films are by now (the night gets harder as it goes on)
  get lvl() { return Math.max(0, Math.min(1, (this.films - 1) / 7)); }
  get vr() { const P = this.g.player; return !!(P.renderer && P.renderer.xr.isPresenting); }
  get flat() { return !this.vr; }
  get chloe() { return this.c && !this.c.disposed ? this.c : null; }

  start() {
    const g = this.g, d = this.d;
    this.c = g.cast.find(c => c.id === 'chloe') || null;
    this.ui = new DateUI(g.player);
    this.ui.onPress = (i) => this.press(i); this.ui.onRelease = (i) => this.release(i);
    // NO WALKING on a date: you're sat at the table (the joystick and SPRINT go; the films put you anywhere else)
    document.body.classList.add('dn-seated'); this.seatPlayer();
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
    const kinds = shuffle(['look', 'waiter', 'visit', 'look', 'visit', 'waiter', 'event', 'look', 'visit', 'event']); kinds.splice(2 + Math.floor(Math.random() * 3), 0, 'toilet');
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
    document.body.classList.remove('dn-seated');
  }
  // the game's over (time, or three strikes): any film stops where it is, the camera's back in your head
  stop() {
    this.travelGo = null; if (this.away) { this.away = null; this.seatPlayer(); }
    { const P = this.g.player; if (P.rig.position.y === SIT_DROP) { P.rig.position.y = 0; P.rig.updateMatrixWorld(true); } }
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
    this.pinPlayer();
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
      if (this.readyT > 0) { this.readyT -= dt; if (this.readyT <= 0) { this.ui.ready(null); if (this.game) sfx('ding', null, 0.5); } }
      else if (this.game && !this.game.result) { this.game.update(dt); }
      if (this.vr) for (const [k, i] of this.ui.pollVR()) { if (k === 'down') { if (this.game && !this.game.result) this.press(i); } else this.release(i); }
      if (this.liveT > 0) this.liveT -= dt;
      if (this.travelGo && (this.travelGo.t -= dt) <= 0) { const tg = this.travelGo; this.travelGo = null; tg.go(); }
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
    // the waiter keeps the table topped up (there's always something to be tempted by)
    if ((this.topT -= dt) <= 0) { this.topT = rr(9, 14); this.topUp(); }
    if (this.look) {
      c.lookOverride = null;
      // flailing about while she's watching gives you away (VR)
      if (this.grace <= 0 && P.hands.some(h => h.tracked && h.speed > 1.6)) this.busted('table');
      if (this.t <= 0 && this.probation <= 0) {
        this.look = false; this.warned = false; this.t = rr(2.6, 4.6);
        c.lookOverride = Math.random() < 0.5 ? 1.25 : -1.25;
        c.say(R(['Ooh, is that the waiter?', 'Just checking my phone, babe.', '...anyway.', 'Is that a pigeon? Inside?', 'That painting looks like a sausage roll.', 'Is that Harry? Why is Harry here?']), 2);
      }
    } else {
      if (!this.warned && this.t < 0.6) { this.warned = true; this.tell(c); }
      if (this.t <= 0) { this.look = true; this.t = rr(3, 5.5); this.grace = 0.5; c.lookOverride = null; }
    }
    // the end of the night: the bill (the clock waits for it)
    if (this.opened && !this.billed && this.d.timeLeft > 0 && this.d.timeLeft < 16 && !P.knock) { this.billed = true; this.d.timeLeft = Math.max(this.d.timeLeft, 14); this.run('bill', 'bill', this.billFilm()); return; }
    // the next film
    if (this.d.timeLeft > 0 && this.d.timeLeft < 34 && this.opened) this.nextT = Math.max(this.nextT, 1);
    else if ((this.nextT -= dt) <= 0 && !P.knock && !(g.fx && g.fx.inCutscene) && this.cool <= 0) this.nextFilm();
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
    if (!this.opened) { this.opened = true; this.run('open', 'arrive', this.openFilm()); return; }
    let kind = this.deck.shift(); if (!kind) { this.deck = this.makeDeck(); kind = this.deck.shift(); }
    const present = (id) => { const c = g.cast.find(o => o.id === id); return c && !c.down && c.rag && c.rag.mesh && this.inGroup(c) ? c : null; };
    let film = null, variant = null;
    if (kind === 'visit') {
      const opts = [['harry', () => this.harryFilm(present('harry'))], ['oliver', () => this.oliverFilm(present('oliver'))], ['pints', () => this.pintsFilm(present('aidan') || present('connor'), present('aidan') && present('connor'))], ['dylan', () => this.dylanFilm(present('dylan'))], ['ethan', () => this.ethanFilm(present('ethan'))], ['lewis', () => this.lewisFilm(present('lewis'))]]
        .concat([['aidanw', () => this.kneeFilm(present('aidanw'))], ['noah', () => this.noahFilm(present('noah'))], ['alfie', () => this.alfieFilm(present('alfie'))], ['ian', () => this.ianFilm(present('ian'))]])
        .filter(([id]) => id === 'pints' ? present('aidan') || present('connor') : present(id));
      const fresh = opts.filter(([id]) => !this.used.has('visit:' + id)), pick = R(fresh.length ? fresh : opts);
      if (pick) { variant = pick[0]; film = pick[1](); } else kind = 'look';
    }
    if (kind === 'waiter') { const opts = ['order', 'trolley', 'napkin', 'wine', 'chef'], fresh = opts.filter(o => !this.used.has('waiter:' + o)); variant = R(fresh.length ? fresh : opts); film = this.waiterFilm(variant); }
    if (kind === 'toilet') { variant = R(['loo', 'lipstick', 'queue']); film = this.toiletFilm(variant); }
    if (kind === 'event') { const opts = ['birthday', 'fire', 'power', 'noproposal'], fresh = opts.filter(o => !this.used.has('event:' + o)); variant = R(fresh.length ? fresh : opts); film = this.eventFilm(variant); }
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
    else if (kind === 'waiter') film = this.waiterFilm(variant = ['order', 'trolley', 'napkin', 'wine', 'chef'].includes(variant) ? variant : 'order');
    else if (kind === 'toilet') film = this.toiletFilm(variant = variant || 'loo');
    else if (kind === 'visit') {
      variant = variant || 'harry';
      film = variant === 'harry' ? this.harryFilm(P('harry')) : variant === 'oliver' ? this.oliverFilm(P('oliver')) : variant === 'pints' ? this.pintsFilm(P('aidan') || P('connor'), P('aidan') && P('connor')) : variant === 'dylan' ? this.dylanFilm(P('dylan')) : variant === 'lewis' ? this.lewisFilm(P('lewis')) : variant === 'aidanw' ? this.kneeFilm(P('aidanw')) : variant === 'noah' ? this.noahFilm(P('noah')) : variant === 'alfie' ? this.alfieFilm(P('alfie')) : variant === 'ian' ? this.ianFilm(P('ian')) : this.ethanFilm(P('ethan'));
    } else if (kind === 'event') { variant = variant || 'birthday'; film = this.eventFilm(variant);
    } else if (kind === 'open') { this.opened = true; film = this.openFilm();
    } else if (kind === 'bill') { this.billed = true; film = this.billFilm();
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
  endScene(quiet) {
    const s = this.scene; this.scene = null; this.game = null; this.state = this.d.running ? 'play' : 'over';
    if (this.visitor) this.sendHome(this.visitor, true);
    if (this.chloe && this.chloe.dnHidden) this.chloeBack(true);
    const c = this.chloe; if (c) { c.dnPose = c.dnPose === 'salad' ? 'salad' : null; c.lookOverride = null; if (!c.seated || Math.hypot(c.rag.root.x - CHL.x, c.rag.root.z - CHL.z) > 0.2) this.chloeSit(); }
    const r = this.ron; if (r) { r.dnPose = null; r.lookOverride = null; if (!r.seated || Math.hypot(r.rag.root.x - RON.x, r.rag.root.z - RON.z) > 0.2) { r.state = 'idle'; r.path = null; r.glide = null; r.rag.placeAt(RON.x, RON.z, Math.PI); r.seated = true; r.faceYaw = Math.PI; } }
    this.look = true; this.t = rr(3, 5); this.grace = 1.2; this.warned = false; this.awayT = 0;
    this.nextT = rr(13, 19); this.cap = null;
    // back to your own eyes, looking at her (a quick glide on a screen)
    const P = this.g.player;
    if (this.cam && this.cam.name !== 'pov' && !this.vr && !quiet) { this.cam = { name: 'return', t: 0, from: this.camObj.position.clone(), fromQ: this.camObj.quaternion.clone() }; }
    else this.cam = null;
    P.faceToward && P.faceToward(CHL.x, CHL.z, 0.01);
    if (P.flatMode) P.flatPitch = -0.22;
    this.travelGo = null; if (this.away) this.travel(null, true);
    this.ui.buttons(null); this.ui.caption('', '', ''); this.ui.title(null); this.ui.stamp(null); this.ui.result(null); this.ui.dim(false); this.spotlight(false); this.ui.flash(0); this.ui.vr(false);
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
    this.actPose(c, t);
  }
  // the shared acting poses (anyone who comes over, the diners in a scene, and Chloe's / Ronnie's extra ones)
  wrapPose(c) { if (!c || c.dnWrapped) return; c.dnWrapped = true; const base = c.personalityPose.bind(c); c.dnBase = c.personalityPose; c.personalityPose = (t) => { base(t); if (c.dnPose) this.actPose(c, t); }; }
  actPose(c, t) {
    const r = c.rag, p = c.dnPose, s = Math.sin(t * 6), lean = (a) => { _q.setFromAxisAngle(_x, a); if (r.pose.chest) r.pose.chest.premultiply(_q); };
    switch (p) {
      case 'talk': r.aim('uArmR', -0.3, -0.7, 0.6); r.aim('lArmR', -0.3 + s * 0.4, 0.4, 1); r.aim('uArmL', 0.25, -0.9, 0.3); r.aim('lArmL', 0.2, 0.1 + Math.sin(t * 4) * 0.25, 1); c.headExtra = { yaw: Math.sin(t * 1.7) * 0.15, pitch: 0 }; return;
      case 'point': r.aim('uArmR', -0.05, -0.1, 1); r.aim('lArmR', 0, 0.05, 1); return;
      case 'wave': r.aim('uArmR', -0.6, 0.7, 0.2); r.aim('lArmR', -0.2 + Math.sin(t * 10) * 0.4, 1, 0.1); return;
      case 'flex': r.aim('uArmL', 1, 0.15, 0); r.aim('lArmL', 0.1, 1, 0.1); r.aim('uArmR', -1, 0.15, 0); r.aim('lArmR', -0.1, 1, 0.1); return;
      case 'cheer': r.aim('uArmL', 0.5, 0.8, 0.2); r.aim('lArmL', 0.1, 1, 0.1 * s); r.aim('uArmR', -0.5, 0.8, 0.2); r.aim('lArmR', -0.1, 1, -0.1 * s); return;
      case 'facepalm': r.aim('uArmR', -0.25, -0.35, 0.9); r.aim('lArmR', 0.2, 0.95, 0.25); c.headExtra = { yaw: 0, pitch: 0.35 }; return;
      case 'phone': r.aim('uArmR', -0.2, -0.85, 0.45); r.aim('lArmR', -0.15, 0.35, 1); r.aim('uArmL', 0.25, -0.9, 0.4); r.aim('lArmL', -0.3, 0.3, 1); c.headExtra = { yaw: 0, pitch: 0.4 }; return;
      case 'photo': r.aim('uArmL', 0.2, -0.15, 1); r.aim('lArmL', -0.25, 0.45, 1); r.aim('uArmR', -0.2, -0.15, 1); r.aim('lArmR', 0.25, 0.45, 1); c.headExtra = { yaw: Math.sin(t * 1.3) * 0.2, pitch: 0.2 }; return;
      case 'call': r.aim('uArmR', -0.55, -0.4, 0.35); r.aim('lArmR', 0.35, 1, -0.15); r.aim('uArmL', 0.2, -1, 0.35); r.aim('lArmL', -1, 0.15, 0.3); c.headExtra = { yaw: -0.3 + Math.sin(t * 0.9) * 0.2, pitch: 0.05 }; return;
      case 'sing': r.aim('uArmL', 1, 0.35 + s * 0.2, 0.2); r.aim('lArmL', 1, 0.5, 0.1); r.aim('uArmR', -1, 0.35 - s * 0.2, 0.2); r.aim('lArmR', -1, 0.5, 0.1); return;
      case 'knee': r.aim('uArmR', -0.1, -1, 0.35); r.aim('lArmR', 0, -1, 0.45); r.aim('uArmL', 0.1, -1, 0.35); r.aim('lArmL', 0, -1, 0.45); lean(0.35); return;
      case 'show': r.aim('uArmL', 1, 0.05, 0.25); r.aim('lArmL', 1, 0.15, 0.1); r.aim('uArmR', -0.3, -0.6, 0.6); r.aim('lArmR', 0.4, 0.2, 0.8); return;
      case 'shrug': r.aim('uArmL', 0.8, -0.45, 0.3); r.aim('lArmL', 0.3, 0.6, 0.7); r.aim('uArmR', -0.8, -0.45, 0.3); r.aim('lArmR', -0.3, 0.6, 0.7); return;
      case 'bow': lean(0.45 + Math.sin(t * 2) * 0.05); r.aim('uArmR', -0.1, -0.6, 0.7); r.aim('lArmR', 0.6, 0, 0.6); return;
      case 'pour': r.aim('uArmR', -0.15, -0.3, 1); r.aim('lArmR', -0.05, -0.45, 1); r.aim('uArmL', 0.2, -0.9, 0.3); r.aim('lArmL', -0.4, -0.1, 1); lean(0.15); return;
      case 'clap': { const k = Math.sin(t * 12); r.aim('uArmL', 0.15, -0.5, 0.8); r.aim('lArmL', -0.4 - k * 0.15, 0.2, 1); r.aim('uArmR', -0.15, -0.5, 0.8); r.aim('lArmR', 0.4 + k * 0.15, 0.2, 1); return; }
      case 'laugh': r.aim('uArmL', 0.2, -1, 0.3); r.aim('lArmL', -0.6, 0.3, 0.7); lean(-0.15 + Math.abs(Math.sin(t * 14)) * 0.05); c.headExtra = { yaw: 0, pitch: -0.3 }; return;
      case 'innocent': r.aim('uArmL', 0.15, -0.8, 0.5); r.aim('lArmL', -0.6, -0.05, 0.8); r.aim('uArmR', -0.15, -0.8, 0.5); r.aim('lArmR', 0.6, -0.05, 0.8); return;
      case 'cross': r.aim('uArmL', 0.2, -1, 0.35); r.aim('lArmL', -1, 0.15, 0.3); r.aim('uArmR', -0.2, -1, 0.35); r.aim('lArmR', 1, 0.2, 0.3); return;
    }
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
    this.actPose(r, t);
  }
  placeProps(c) {
    if (c.dnHidden) return;
    if (c.dnPose === 'phone' || c.dnPose === 'phoneup' || c.dnPose === 'photo' || c.dnPose === 'call') {
      const ph = this.phone; c.rag.grip('lArmR', ph.position); ph.visible = true;
      const head = c.headPos(_v); ph.lookAt(head); if (c.dnPose === 'phoneup' || c.dnPose === 'photo') ph.rotateY(Math.PI); if (c.dnPose === 'call') ph.rotateX(-1.2);
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
    return readTime(text);
  }
  narrate(text) { this.cap = { name: '', col: '#fff', text }; return readTime(text); }
  // a line said while a game's being played (Chloe, the visitor, the room): on the caption, never more than one every
  // couple of seconds (unless it matters: gap 0)
  live(who, text, gap = 2.2) {
    if (gap && this.liveT > 0) return; this.liveT = gap || 1.2;
    const name = who ? (who === this.ron ? 'Ronnie' : who.name) : '', col = who ? (who === this.ron ? '#ffd400' : who.color) : '#fff';
    if (who && !who.disposed && !who.dnHidden) { try { who.say(text, 5); } catch (e) {} }
    this.cap = { name, col, text };
  }
  titleCard(icon, big, small, dur = 3.0) { this.ui.title(icon, big, small); this.titleT = dur; this.titleS = big; this.ui.slate(`🎬 FILM ${this.films} · ${big}`); }
  stamp(s, col, dur = 1.6) { this.ui.stamp(s, col); this.stampS = s; this.stampCol = col; this.stampT = dur; }
  // a mouthful: on the Eat Meter, counted, and seen
  reward(n, at) {
    const g = this.g, d = this.d;
    g.addChonk(n); d.stats.chonk += n; g.G.eaten = (g.G.eaten || 0) + 1; g.G.wristDirty = true;
    this.sneaks++; this.haul += n; track('bites'); track('dnSneak');
    const p = at || (this.third ? this.ronHead().add({ x: 0, y: -0.12, z: -0.12 }) : g.player.mouth.clone().addScaledVector(g.player.fwd, 0.15));
    try { g.crumbs.burst(p, [0xd9933f, 0x5a2e14, 0xffc21a, 0xfff3d0], 14, 1.2, null); } catch (e) {}
    g.words.show('+' + Math.round(n), p.clone().add({ x: 0, y: 0.18, z: 0 }), '#ffd400', 0.09, 0.7);
  }
  crumbsAt(p) { try { this.g.crumbs.burst(p, [0xd9933f, 0x5a2e14, 0xffc21a, 0xfff3d0], 18, 1.4, null); } catch (e) {} }
  // a diner at a table near a spot says something (the raid)
  diner(at, line) { const grp = (this.d.dinerGroups || []).find(gp => gp.some(c => c.seat && Math.hypot(c.seat.x - at[0], c.seat.z - at[1]) < 1.3)); const c = grp && R(grp); if (c) this.live(c, line, 0); }
  // Dylan points at Ronnie: the whole room looks (a spotlight on the screen)
  spotlight(on) { this.spot = !!on; if (this.ui) this.ui.dim(on || (this.scene && this.scene.id === 'event')); if (on && this.g.player.shake) this.g.player.shake(0.3); }
  // the game in the middle of a film: wait for it to finish, then its result
  *play(game) {
    this.game = game; this.inBeat = false; game.S = this; this.cap = null;
    this.readyT = game.ready != null ? game.ready : 2.6; this.ui.ready(this.readyT > 0.05 ? game.howto : null);
    yield () => !!game.result || !this.d.running;
    this.inBeat = true; const r = game.result || { win: false, soft: true };
    this.game = null; return r;
  }
  drawUI(dt) {
    const ui = this.ui, gm = this.game;
    if (this.bubbleOff && this.flat && this.third && this.bubbleOff.bubble) this.bubbleOff.bubble.visible = false;      // (on a screen the caption says it: no bubble over it in the shot)
    for (const c of this.g.cast) if (c.bubble && this.flat && this.third && c.speakT > 0) c.bubble.visible = false;
    for (const c of this.g.cast) if (c.dnHid && c.bubble) c.bubble.visible = false;
    if (this.flat) for (const c of [...this.g.cast, this.ron]) if (c && c.bubble) c.bubble.visible = false;      // (and none at all over the film: the caption says it)
    const cap = this.cap;
    ui.caption(cap ? cap.name : '', cap ? cap.col : '', cap ? cap.text : '');
    ui.buttons(gm ? (this.readyT > 0 ? gm.buttons.map(b => ({ ...b, off: true, hot: false })) : gm.buttons) : null); if (gm) ui.stage(gm);
    ui.flash(gm && gm.danger != null ? Math.max(0, (gm.danger - 0.55) / 0.45) * (0.6 + 0.4 * Math.sin(performance.now() / 80)) : 0);
    ui.vr(this.vr, { title: this.titleS, ready: this.readyT > 0 && gm ? gm.howto : null, game: gm, cap: cap ? (cap.name ? cap.name + ': ' : '') + cap.text : (gm ? gm.status : ''), who: cap && cap.name, whoCol: cap && cap.col, stamp: this.stampS, stampCol: this.stampCol }, dt);
  }
  press(i) { const gm = this.game; if (!gm || gm.result || this.readyT > 0) return; if (gm.buttons && gm.buttons[i] && !gm.buttons[i].off) gm.press(i); }
  release(i) { const gm = this.game; if (gm && !gm.result && gm.release && !(this.readyT > 0)) gm.release(i); }

  // ------------------------------------------------------------ helpers for the films
  inGroup(c) { return (this.d.dinerGroups || []).some(g => g.includes(c)); }
  // someone gets up from their table and comes over (the walk starts in shot, then a cut: they're there)
  *fetch(c, line) {
    const grps = this.d.dinerGroups || [], grp = grps.find(g => g.includes(c));
    if (grp) { grp.splice(grp.indexOf(c), 1); c.dnGroup = grp; }
    this.visitor = c; this.wrapPose(c); c.dnPose = null;
    c.seated = false; c.lookOverride = null; c.state = 'idle';
    this.shot('char', { c, d: 1.5, side: 0.5 });
    c.goTo(SIDE.x, SIDE.z, 1.15);
    if (line) yield this.line(c, line); else yield 1.3;
    c.state = 'idle'; c.path = null; c.glide = null; c.rag.placeAt(SIDE.x, SIDE.z, SIDE.yaw); c.faceYaw = SIDE.yaw; c.seated = false; c.dnPose = 'talk';
    const ch = this.chloe; if (ch) ch.lookOverride = 1.0;
  }
  sendHome(c, now) {
    if (!c || c.disposed) { this.visitor = null; return; }
    const seat = c.seat;
    if (c.dnGroup && !c.dnGroup.includes(c)) c.dnGroup.push(c);
    c.dnGroup = null; c.lookOverride = null; c.dnPose = null; if (c.dnBase) { c.personalityPose = c.dnBase; c.dnBase = null; c.dnWrapped = false; }
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
  // ---- where you are: sat at the table, always (no walking on a date). The films move you when they need to
  seatPlayer() { this.putAt(SEAT.x, SEAT.z, CHL.x, CHL.z); }
  putAt(x, z, lx, lz) {
    const P = this.g.player; P.rig.updateMatrixWorld(true); const head = P.camera.getWorldPosition(new THREE.Vector3());      // (where your eyes really are: P.head is last frame's)
    P.rig.position.x += x - head.x; P.rig.position.z += z - head.z; P.rig.updateMatrixWorld(true); P.resetHandHistory && P.resetHandHistory();
    if (P.flatMove) P.flatMove = { x: 0, z: 0 };
    if (lx != null) { P.faceToward && P.faceToward(lx, lz, 0.01); if (P.flatMode) P.flatPitch = -0.22; }
    this.pin = { x: P.rig.position.x, z: P.rig.position.z, ry: P.rig.rotation.y };
  }
  // the joystick, the keys and the thumbstick move nothing: the rig is held where the date put it (turning's fine)
  pinPlayer() {
    const P = this.g.player; if (!this.pin || this.state === 'over') return;
    if (P.flatMove && (P.flatMove.x || P.flatMove.z)) P.flatMove = { x: 0, z: 0 };
    if (Math.abs(P.rig.rotation.y - this.pin.ry) > 1e-6) { this.pin = { x: P.rig.position.x, z: P.rig.position.z, ry: P.rig.rotation.y }; return; }      // (a snap turn moves the rig round your head: that's yours)
    if (P.rig.position.x !== this.pin.x || P.rig.position.z !== this.pin.z) { P.rig.position.x = this.pin.x; P.rig.position.z = this.pin.z; P.rig.updateMatrixWorld(true); }
    const sitY = P.flatMode && !this.vr && !this.away ? SIT_DROP : 0;      // (sat down: your eyes level with hers. Stood at a raid spot: full height)
    if (Math.abs(P.rig.position.y - sitY) > 1e-4 && !P.knock && !P.jigY && !P.siuY) { P.rig.position.y = sitY; P.rig.updateMatrixWorld(true); }
  }
  // the loo raid: a quick fade and you're there (spot), or back in your seat (null)
  travel(spot, now) {
    const go = () => { if (spot) { this.away = spot; this.putAt(spot.at[0], spot.at[1], spot.food[0], spot.food[1]); this.shot('at', { pos: V(...spot.pos), look: V(...spot.look) }); } else { this.away = null; this.seatPlayer(); if (this.scene) this.shot('crane'); } };
    this.travelGo = null;
    if (now || this.vr) { go(); return; }
    this.ui.fade(); sfx('whoosh', null, 0.6); this.away = spot || this.away;
    this.travelGo = { go, t: 0.33 };      // (on the game's clock: the cut happens when the screen's black)
  }
  // the waiter tops the table up now and then (something to be tempted by between the films)
  topUp() {
    const items = this.g.items; let n = 0; for (const it of items.items) if (!it.dead && !it.def.veg && Math.hypot(it.pos.x - T.x, it.pos.z - T.z) < 0.55) n++;
    if (n >= 3) return; try { items.spawn(R(['pizza', 'doughnut', 'cupcake', 'burger', 'fries', 'cookie']), V(T.x + rr(-0.25, 0.25), 0.92, T.z + rr(0.1, 0.3))); } catch (e) {}
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
    this.titleCard(L.icon, L.title, L.sub); yield 1.6;
    this.shot(R(['overR', 'chloe'])); yield this.chloeSay(R(L.lead));
    if (c) { c.dnPose = L.pose; c.lookOverride = L.look || null; }
    this.shot(v === 'phone' || v === 'board' ? 'chloe' : 'overR'); yield 1.8;
    if (r) r.lookOverride = 0;
    this.shot('ronnie'); if (r) r.dnPose = 'gape'; yield this.narrate(R(['Ronnie sees his chance.', 'The bread basket is unguarded.', 'Somewhere, a violin plays.', 'He has never moved this fast in his life.', 'His stomach makes a noise like a ferry.']));
    this.shot('side');
    const pen = this.shorter > 0 ? 0.8 : 1; if (this.shorter > 0) this.shorter--;
    const res = yield* this.play(cramGame({ pool: L.pool, rounds: this.lvl > 0.45 ? 3 : 2, lvl: Math.min(1, this.lvl + (1 - pen)), away: L.look || 0, pose: L.pose, fakeText: L.fake, again: L.again, mutter: L.mutter }));
    if (r) r.dnPose = null;
    if (!res.win) { yield* this.caughtFilm(res.reason); return; }
    yield* this.winFilm(res, res.smooth ? 'SMOOTH!' : 'GOT AWAY WITH IT');
    if (c) { c.dnPose = null; c.lookOverride = null; }
    this.shot('overR'); yield this.chloeSay(R(BACK));
  }
  // the end of a film you won: Ronnie, smug; the stars; the score
  *winFilm(res, word) {
    this.wins++; const r = this.ron, st = Math.max(1, Math.min(3, res.stars || 1)), bonus = st * 4;
    this.shot('ronnie'); if (r) r.dnPose = 'innocent';
    this.reward(bonus); this.stamp(word, '#39ff14', 2.4); sfx('dn_smooth', null, 0.9);
    this.ui.result('★'.repeat(st) + '☆'.repeat(3 - st), `+${Math.round((res.score || 0) + bonus)} SNUCK IN`);
    yield 2.4;
    this.ui.result(null);
    if (r) r.dnPose = null;
  }

  // ============================================================ THE WAITER (Ben's covering a shift)
  waiterChar() { const g = this.g; for (const id of ['ben', 'lewis', 'connor', 'noah', 'alfie']) { const c = g.cast.find(o => o.id === id && o.rag && o.rag.mesh && !o.down && this.inGroup(o)); if (c) return c; } return null; }
  eventFilm(v) { return v === 'fire' ? this.fireFilm() : v === 'power' ? this.powerFilm() : v === 'noproposal' ? this.noProposeFilm() : this.birthdayFilm(); }
  *waiterFilm(v) {
    if (v === 'wine') { yield* this.wineFilm(); return; }
    if (v === 'chef') { yield* this.chefFilm(); return; }
    const w = this.waiterChar(), c = this.chloe;
    if (v === 'order') {
      this.titleCard('🧑‍🍳', 'THE SECRET ORDER', 'Ben\'s covering a shift. Order in code, three courses'); yield 1.6;
      if (w) yield* this.fetch(w, w.id === 'ben' ? 'Evening both. I\'m your waiter tonight. Ronnie. I KNOW.' : 'Evening! I\'m covering for Ben. Don\'t ask. Right: orders.');
      this.shot('overR'); yield this.chloeSay('Two salads, please. No dressing. He\'s on a diet. Aren\'t you, babe?');
      this.shot('ronnie'); yield this.line(this.ron, 'Yes, babe. Salad. I LOVE salad. *taps nose at the waiter*');
      if (c) c.dnPose = 'menu';
      this.shot('char', { c: w, d: 1.1, side: -0.3 }); if (w) yield this.line(w, 'Two salads. Lovely. *writes something on his pad and taps it* Anything... EXTRA, sir?'); else yield 1.5;
      this.shot('wide');
      const res = yield* this.play(signalGame({ lvl: this.lvl }));
      if (c) c.dnPose = null;
      if (!res.win && !res.soft) { yield* this.caughtFilm('gesture'); return; }
      if (res.soft) { this.shot('char', { c: w, d: 1.2, side: 0.3 }); if (w) yield this.line(w, 'Two salads it is. I tried, Ron. I tried.'); return; }
      this.shot('table'); this.stamp('ORDER IN!', '#39ff14');
      (res.dishes || []).forEach((type, i) => { try { this.g.items.spawn(type, V(T.x - 0.2 + i * 0.2, 0.92, T.z + 0.22)); } catch (e) {} });
      sfx('plate_down', null, 0.8);
      if (w) yield this.line(w, `${res.dishes.length === 3 ? 'Three' : res.dishes.length === 2 ? 'Two' : 'One'} "salad${res.dishes.length > 1 ? 's' : ''}". None of them are salads.`); else yield 1.8;
      this.shot('overR'); yield this.chloeSay('Is that... a burger? Under the lettuce?');
      this.shot('ronnie'); yield this.line(this.ron, 'It\'s a salad, babe. A HOT salad. Very continental.');
      yield* this.winFilm(res, 'ORDER IN!');
      if (w) this.sendHome(w);
      return;
    }
    if (v === 'trolley') {
      this.titleCard('🍰', 'THE DESSERT TROLLEY', 'Three waves of puddings. Not her sorbet'); yield 1.6;
      if (w) yield* this.fetch(w, 'Desserts! Who\'s for the trolley? Ronnie, don\'t answer that.');
      this.shot('overR'); yield this.chloeSay('Ooh. Is the sorbet dairy free? And gluten free? What\'s it made of? Exactly? In grams?');
      if (c) c.lookOverride = 1.0;
      this.shot('char', { c: w, d: 1.2, side: -0.3 }); if (w) yield this.line(w, 'It\'s... lemon? Let me check the folder. Ronnie, DON\'T.'); else yield 1.5;
      this.shot('trio');
      const res = yield* this.play(conveyorGame({ lvl: this.lvl }));
      if (!res.win) { yield* this.caughtFilm(res.reason); return; }
      if (res.stash) { this.shot('table'); yield this.narrate(`Later, under the napkin: ${res.stash} dessert${res.stash > 1 ? 's' : ''}. Gone in one go. Nobody saw. Probably.`); }
      yield* this.winFilm(res, res.stash ? 'STASHED!' : 'SWEET!');
      if (w) this.sendHome(w);
      return;
    }
    // napkin
    this.titleCard('🧻', 'THE NAPKIN TRICK', 'Hide the extras under your napkin. Then eat them under it'); yield 1.6;
    if (w) yield* this.fetch(w, 'Here\'s your bread, and here\'s... *wink* ...the bread.');
    this.shot('table'); yield this.narrate('Under the bread: a burger, a hot dog and a doughnut. Ben\'s a legend.');
    if (c) { c.dnPose = 'menu'; c.lookOverride = 0.6; }
    this.shot('overR'); yield this.chloeSay('Can we see the wine list? I want something that goes with salad. And disappointment.');
    this.shot('trio');
    const res = yield* this.play(napkinGame({ lvl: this.lvl }));
    if (c) c.dnPose = null;
    if (!res.win) { yield* this.caughtFilm('napkin'); return; }
    yield* this.winFilm(res, res.n >= 3 ? 'ALL GONE!' : `${res.n} EATEN`);
    if (w) this.sendHome(w);
  }

  // ============================================================ SHE NEEDS THE LOO
  *toiletFilm(v) {
    this.titleCard('🚽', 'CHLOE NEEDS THE LOO', v === 'queue' ? 'And there\'s a queue. Raid the whole restaurant' : 'Raid the restaurant. Be back in your seat before she is'); yield 1.6;
    this.shot('overR'); yield this.chloeSay(R(['I\'m just popping to the loo, babe. Don\'t. Move.', 'Toilet. Back in two minutes. I\'ve counted the bread rolls.', 'I need the loo. If ANYTHING is missing when I get back...']));
    this.shot('ronnie'); yield this.line(this.ron, R(['Course, babe. I\'ll just sit here. Being good.', 'Take your time, babe. No rush. Honestly. Any time.']));
    this.shot('wide'); this.chloeAway(); yield 2.0;
    this.shot('ronnie'); if (this.ron) { this.ron.dnPose = 'gape'; this.ron.lookOverride = -0.5; } yield this.narrate('The door swings shut. Ronnie is alone. With everything.');
    this.chloeHide(); if (this.ron) this.ron.lookOverride = 0;
    this.shot('crane');
    const res = yield* this.play(raidGame({ total: v === 'queue' ? rr(20, 24) : rr(16, 19), early: v === 'lipstick', lvl: this.lvl }));
    if (this.ron) this.ron.dnPose = null;
    if (this.away) this.travel(null, true);
    this.chloeBack(false); this.shot('wide');
    if (!res.win) { yield 1.4; this.chloeSit(); yield* this.caughtFilm('seat'); return; }
    yield 1.6; this.chloeSit();
    this.raided += res.n || 0; track('dnRaid', res.n || 0);
    this.shot('overR'); yield this.chloeSay(R(['That\'s weird. Everyone in here looks hungrier than when I left.', 'Why is the birthday cake in the other room half gone?', 'Why is the chef crying?']));
    yield* this.winFilm(res, res.n ? `RAIDED ${res.n}!` : 'NOTHING? REALLY?');
  }

  // ============================================================ THE LADS COME OVER
  *harryFilm(h) {
    if (!h) return;
    this.titleCard('💘', 'HARRY NEEDS ADVICE', 'Four dating disasters. React right when she checks on you'); yield 1.6;
    yield* this.fetch(h, 'Chloe! Can I ask you something? As a woman? Why won\'t anyone reply to me?');
    this.shot('overR'); yield this.chloeSay('Oh Harry. Sit... no, stand there. Tell me everything.');
    this.shot('char', { c: h, d: 1.2, side: 0.3 }); yield this.line(h, 'Right. Get comfy. I\'ve got four. Ronnie\'s heard them. Ronnie, act like you haven\'t.');
    this.shot('trio');
    const res = yield* this.play(reactGame({ h, lvl: this.lvl }));
    if (!res.win) { yield* this.caughtFilm('react'); this.sendHome(h); return; }
    this.shot('char', { c: h, d: 1.2, side: 0.3 }); yield this.line(h, 'Thanks Chloe. Thanks Ron. You\'re a great listener, mate. And eater.');
    this.shot('overR'); yield this.chloeSay('He\'ll find someone, babe. Someone with very low standards. Like me.');
    yield* this.winFilm(res, 'GREAT LISTENER');
    this.sendHome(h);
  }
  *oliverFilm(o) {
    if (!o) return;
    this.titleCard('📹', 'OLIVER\'S SHAME CAM', 'Three bits of video. Only eat when you\'re out of shot'); yield 1.6;
    yield* this.fetch(o, 'Hey guys, welcome back to the channel! It\'s DATE NIGHT with Ronnie and Chloe!');
    const c = this.chloe; if (c) { c.dnPose = 'wave'; c.lookOverride = 0.9; }
    this.shot('overR'); yield this.chloeSay('Oh my God, Oliver, are we live? Hi everyone! Hi Mum! Hi Chester!');
    this.shot('char', { c: o, d: 1.2, side: 0.3 }); yield this.line(o, 'We\'re LIVE. Two thousand watching. Ronnie, do NOT eat on camera. It\'s a wholesome channel.');
    this.shot('trio');
    const res = yield* this.play(viewfinderGame({ lvl: this.lvl }));
    if (c) c.dnPose = null;
    if (!res.win) { this.shot('char', { c: o, d: 1.2, side: 0.3 }); yield this.line(o, 'Got it! In 4K! Ronnie eating ON A DATE. That\'s going on my story.'); yield* this.caughtFilm('filmed'); this.sendHome(o); return; }
    this.shot('char', { c: o, d: 1.2, side: 0.3 }); yield this.line(o, res.bombs ? `That\'s a wrap. ${res.bombs} photobomb${res.bombs > 1 ? 's' : ''}. ${Math.round(res.followers / 1000)}K followers. The algorithm LOVES you, Ronnie.` : 'That\'s a wrap. Weird. I never got him eating once.');
    yield* this.winFilm(res, 'NOT IN SHOT');
    this.sendHome(o);
  }
  *pintsFilm(a, both) {
    if (!a) return;
    const other = both ? this.g.cast.find(o => o.id === (a.id === 'aidan' ? 'connor' : 'aidan')) : null;
    this.titleCard('🍺', 'JUST THE ONE', 'Three rounds. Keep your eye on the Guinness'); yield 1.6;
    yield* this.fetch(a, both ? 'Quiet one for the lovebirds! Our Connor\'s round.' : 'Quiet one for the lovebirds. Just the one.');
    if (other && other.rag) { other.seated = false; other.state = 'idle'; other.rag.placeAt(SIDE.x + 0.15, SIDE.z + 0.6, SIDE.yaw - 0.4); other.faceYaw = SIDE.yaw - 0.4; this.extraVisitor = other; const g0 = (this.d.dinerGroups || []).find(gp => gp.includes(other)); if (g0) { g0.splice(g0.indexOf(other), 1); other.dnGroup = g0; } }
    this.shot('overR'); yield this.chloeSay('He\'s not drinking tonight. Are you, babe? It\'s water for him.');
    this.shot('char', { c: a, d: 1.1, side: -0.3 }); yield this.line(a, 'Course. Water. *slides three glasses about* One of these is water. One\'s a Guinness. One\'s Chloe\'s wine.');
    if (other) { this.shot('char', { c: other, d: 1.1, side: 0.3 }); yield this.line(other, 'Three rounds, Ron. Pick the black stuff. Let it settle. You won\'t.'); }
    this.shot('table');
    const res = yield* this.play(shellGame({ lvl: this.lvl }));
    if (other) { this.sendHome(other, true); this.extraVisitor = null; }
    if (!res.win && !res.soft) { this.shot('char', { c: a, d: 1.2, side: 0.3 }); yield this.line(a, 'Wrong one, Ron. That\'s her rosé. Night night.'); yield* this.caughtFilm('wine'); this.sendHome(a); return; }
    if (res.soft) { this.shot('ronnie'); yield this.line(this.ron, 'It\'s... water. Three times. Actual water. Why would you DO that?'); this.shot('char', { c: a, d: 1.2, side: 0.3 }); yield this.line(a, 'Ah well. More for me.'); this.sendHome(a); return; }
    this.shot('char', { c: a, d: 1.2, side: 0.3 }); yield this.line(a, res.pints >= 3 ? 'Three for three. Ron. Ron. You\'ve split every G in this restaurant.' : R(['He didn\'t even let it SETTLE! Our grandad would weep!', 'That\'s a lovely pint. That WAS a lovely pint.']));
    yield* this.winFilm(res, res.pints >= 3 ? 'THREE PINTS!' : 'SPLIT THE G!');
    this.sendHome(a);
  }
  *dylanFilm(dy) {
    if (!dy) return;
    this.titleCard('🎸', 'DYLAN\'S WONDERWALL', 'The whole song. Grab what pops up. Freeze when he points at you'); yield 1.6;
    this.visitor = dy; const grp = (this.d.dinerGroups || []).find(gp => gp.includes(dy)); if (grp) { grp.splice(grp.indexOf(dy), 1); dy.dnGroup = grp; }
    dy.seated = false; dy.state = 'idle'; dy.rag.placeAt(SIDE.x + 0.5, SIDE.z - 0.9, SIDE.yaw + 0.5); dy.faceYaw = SIDE.yaw + 0.5;
    this.shot('char', { c: dy, d: 1.6, side: 0.4 }); sfx('boing', null, 1); yield this.line(dy, 'RONNIEEEEEE! This one\'s for the lovebirds! TODAY IS GONNA BE THE DAY...');
    const c = this.chloe; if (c) { c.dnPose = 'cry'; c.lookOverride = 0.9; }
    dy.dancing = true;
    this.shot('overR'); yield this.chloeSay('Dylan, NO. Everyone\'s looking. Oh my God. Everyone\'s SINGING.');
    this.shot('wide');
    const res = yield* this.play(whackGame({ lvl: this.lvl, lines: { 1: 'CHORUS! Everybody! AND ALL THE ROADS WE HAVE TO WALK ARE WINDING...', 2: 'THIS ONE\'S FOR RONNIE! Everybody look at RONNIE!', 3: '...because maaaaybe... YOU\'RE GONNA BE THE ONE THAT EATS MEEEE!' } }));
    this.spotlight(false); dy.dancing = false; if (c) c.dnPose = null;
    if (!res.win) { yield* this.caughtFilm(res.reason); this.sendHome(dy); return; }
    this.shot('char', { c: dy, d: 1.3, side: 0.3 }); yield this.line(dy, '...and after aaaaall... you\'re my wonderwaaaall. Cheers Ron. You owe me a pint. And a knee.');
    yield* this.winFilm(res, 'ENCORE!');
    this.sendHome(dy);
  }
  *ethanFilm(e) {
    if (!e) return;
    this.titleCard('⚽', 'ETHAN\'S FREE KICK', 'Three kicks: a bread roll into your mouth. Noah\'s the wall'); yield 1.6;
    const c = this.chloe;
    this.shot('char', { c: e, d: 1.4, side: 0.4 }); yield this.line(e, 'Ronnie! Set piece! Open wide! Like Roberto Carlos, but bread!');
    if (c) { c.dnPose = 'phone'; c.lookOverride = 0; }
    this.shot('overR'); yield this.chloeSay('Hang on babe, I\'m checking the bill. Nine starters?! NINE?');
    this.shot('side');
    const res = yield* this.play(kickGame({ lvl: this.lvl }));
    if (c) c.dnPose = null;
    if (!res.win) { yield* this.caughtFilm('roll'); return; }
    this.shot('char', { c: e, d: 1.2, side: 0.3 }); yield this.line(e, res.n >= 3 ? 'HAT-TRICK! Hala Madrid! And bread!' : 'Top bins, Ronnie! Well. Top Ronnie.');
    yield* this.winFilm(res, res.n >= 3 ? 'HAT-TRICK!' : 'TOP BINS!');
  }
  *lewisFilm(l) {
    if (!l) return;
    this.titleCard('💪', 'LEWIS\'S ARM WRESTLE', 'Push his arm over. Sneak bites with the other hand'); yield 1.6;
    yield* this.fetch(l, 'Bro. BRO. Arm wrestle. Loser pays the bill. Chloe, you\'re the ref.');
    const c = this.chloe;
    this.shot('overR'); yield this.chloeSay('Fine. But I\'m watching your hands, Ronnie. BOTH of them.');
    this.shot('ronnie'); yield this.line(this.ron, 'Course, babe. Both hands. *one hand drifts towards the bread*');
    this.shot('trio');
    const res = yield* this.play(wrestleGame({ lvl: this.lvl }));
    if (c) { c.dnPose = null; c.lookOverride = null; }
    if (!res.win) { yield* this.caughtFilm('wrestle'); this.sendHome(l); return; }
    this.shot('char', { c: l, d: 1.2, side: 0.3 }); yield this.line(l, res.wrestle === 'won' ? 'He... he beat me. Bro. Don\'t tell the gym.' : res.wrestle === 'lost' ? 'And THAT is what protein does. You\'re paying, bro.' : 'A draw. I\'ll take it. Rematch at leg day.');
    yield* this.winFilm(res, res.wrestle === 'won' ? 'ARM OF STEEL!' : 'SNUCK IT!');
    this.sendHome(l);
  }

  // ============================================================ THE BIRTHDAY SONG (the lights go down)
  *birthdayFilm() {
    this.titleCard('🎂', 'HAPPY BIRTHDAY', 'Lights down. Eat on the beat, sing when she sings, freeze for the candles'); yield 1.6;
    this.shot('wide'); yield this.narrate('The lights go down. The waiters bring out a cake for table six. Everyone starts singing.');
    this.ui.dim(true);
    this.shot('overR'); yield this.chloeSay('Ooh! A birthday! Sing, babe! SING with me!');
    this.shot('side');
    const res = yield* this.play(birthdayGame({ lvl: this.lvl }));
    this.ui.dim(false); sfx('cheer', null, 0.7);
    if (!res.win) { yield* this.caughtFilm(res.reason); return; }
    this.shot('overR'); yield this.chloeSay('Wasn\'t that lovely? Why do you smell like icing?');
    yield* this.winFilm(res, 'HIP HIP HOORAY!');
  }


  // ============================================================ THE NIGHT BEGINS: arriving, being seated, ordering
  *openFilm() {
    const c = this.chloe, r = this.ron, w = this.waiterChar(), g = this.g;
    this.titleCard('🌹', 'DATE NIGHT', 'La Grande Portion. Table for two. Ronnie\'s on a diet'); yield 2.0;
    // in at the door: the maître d' at his podium, the two of them in the foyer
    if (w) { const grp = (this.d.dinerGroups || []).find(gp => gp.includes(w)); if (grp) { grp.splice(grp.indexOf(w), 1); w.dnGroup = grp; } this.visitor = w; w.seated = false; w.state = 'idle'; w.rag.placeAt(9.5, 7.2, Math.PI); w.faceYaw = Math.PI; this.wrapPose(w); w.dnPose = 'bow'; }
    if (c) { c.seated = false; c.state = 'idle'; c.rag.placeAt(9.15, 5.75, 0); c.faceYaw = 0; c.dnPose = 'wave'; }
    if (r) { r.seated = false; r.state = 'idle'; r.rag.placeAt(9.85, 5.8, 0); r.faceYaw = 0; r.dnPose = 'shrug'; }
    this.shot('foyer'); yield 1.4;
    if (w) { w.dnPose = 'talk'; yield this.line(w, w.id === 'ben' ? 'Good evening. Table for two? ...Ronnie. I\'ll get the reinforced chair.' : 'Evening! Table for two. I\'ve put you near the kitchen, Ronnie. Saves time.'); }
    if (c) c.dnPose = 'point'; this.shot('push', { c }); yield this.chloeSay('He\'s on a DIET. Nothing near the dessert trolley, please. Or the bread. Or the kitchen.');
    if (r) r.dnPose = 'innocent'; this.shot('low', { c: r }); yield this.line(r, 'I\'m a changed man, babe. I had a carrot on the way here.');
    // through the restaurant to the table (the whole room clocks him)
    if (c) { c.dnPose = null; c.goTo(CHL.x + 0.5, CHL.z - 0.2, 1.0); } if (r) { r.dnPose = null; r.goTo(RON.x + 0.6, RON.z + 0.3, 1.0); }
    for (const gp of this.d.dinerGroups || []) for (const d of gp) { if (Math.random() < 0.5) { d.lookOverride = R([-0.6, 0.6]); d.lookT = 3; } }
    this.shot('dolly'); yield this.narrate(R(['The whole restaurant goes quiet. A waiter moves the bread basket. Just in case.', 'Table six stops eating. Table four hides their chips. The pianist would play, but he quit.']));
    if (c) { c.state = 'idle'; c.path = null; c.rag.placeAt(CHL.x, CHL.z, 0); c.seated = true; c.faceYaw = 0; c.dnPose = 'menu'; }
    if (r) { r.state = 'idle'; r.path = null; r.rag.placeAt(RON.x, RON.z, Math.PI); r.seated = true; r.faceYaw = Math.PI; }
    if (w) { w.state = 'idle'; w.rag.placeAt(SIDE.x, SIDE.z, SIDE.yaw); w.faceYaw = SIDE.yaw; w.dnPose = 'talk'; }
    this.shot('orbit'); yield 1.6;
    if (w) yield this.line(w, 'Can I start you off with anything?');
    this.shot('chloe'); yield this.chloeSay('I\'ll have the green salad. He\'ll have the green salad. Won\'t you, babe?');
    // what Ronnie orders
    this.shot('ronnie');
    const ch = yield* this.play(choiceGame({ title: 'WHAT ARE YOU ORDERING?', card: 'TONIGHT\'S MENU', time: 8, options: [
      { icon: '🥗', label: 'THE SALAD', sub: 'she\'ll be pleased', id: 'salad' }, { icon: '😉', label: '"THE SALAD"', sub: 'wink at the waiter', id: 'wink' }, { icon: '🍽️', label: 'TASTING MENU', sub: 'twelve courses', id: 'taste' }] }));
    const pick = (ch.pick || {}).id || 'salad';
    if (pick === 'salad') { yield this.line(r, 'The salad. Please. *a single tear*'); if (c) c.dnPose = 'cheer'; this.shot('chloe'); yield this.chloeSay('Babe! I\'m so PROUD of you! See, that wasn\'t hard!'); this.probation = 0; this.reward(5); }
    else if (pick === 'wink') { yield this.line(r, 'The salad. *wink* The SALAD. *winks so hard his face moves*'); if (w) { this.shot('char', { c: w, d: 1.1, side: 0.3 }); w.dnPose = 'point'; yield this.line(w, 'One "salad". Got it. *taps nose*'); }
      try { g.items.spawn('burger', V(T.x + 0.12, 0.92, T.z + 0.25)); } catch (e) {} this.shot('overR'); yield this.chloeSay('Why are you two winking at each other?'); this.probation = 6; }
    else { yield this.line(r, 'I\'ll have the tasting menu. Twelve courses. Four times.'); if (c) c.dnPose = 'point'; this.shot('dutch'); yield this.chloeSay('RONNIE. We have been here for ONE MINUTE.'); this.shorter = 1;
      for (const [type, dx] of [['pizza', -0.22], ['cupcake', 0.0], ['doughnut', 0.22]]) { try { g.items.spawn(type, V(T.x + dx, 0.92, T.z + 0.25)); } catch (e) {} } }
    if (c) c.dnPose = null; if (w) this.sendHome(w);
    this.shot('wide'); yield this.narrate('The night begins. She\'s watching. She\'s always watching.');
  }

  // ============================================================ THE NIGHT ENDS: the bill
  *billFilm() {
    const c = this.chloe, r = this.ron, w = this.waiterChar();
    this.titleCard('🧾', 'THE BILL', 'It\'s arrived. It\'s long. It\'s still arriving'); yield 2.0;
    if (w) yield* this.fetch(w, 'Your bill. I\'ll get the other half. It\'s on a trolley.');
    if (w) w.dnPose = 'pour';
    this.shot('table'); yield this.narrate('The bill unrolls off the table, across the floor and under table six.');
    if (c) c.dnPose = 'menu'; this.shot('push', { c }); yield this.chloeSay(`Nine starters. NINE. ${this.raided ? 'A "birthday cake, partially missing". ' : ''}Four "side salads". Ronnie, what is a side salad with a bun?`);
    if (r) r.dnPose = 'shrug'; this.shot('ronnie'); yield this.line(r, 'It\'s a... continental salad, babe. The bun is a crouton.');
    const ch = yield* this.play(choiceGame({ title: 'HOW ARE YOU PAYING?', card: 'THE BILL', time: 8, mood: 'angry', options: [
      { icon: '💳', label: 'PAY THE LOT', sub: 'be a gent', id: 'pay' }, { icon: '🤝', label: 'SPLIT IT', sub: 'fifty-fifty', id: 'split' }, { icon: '🍞', label: 'IN BREAD ROLLS', sub: 'you saved some', id: 'bread' }] }));
    const pick = (ch.pick || {}).id || 'pay';
    if (pick === 'pay') { yield this.line(r, 'I\'ve got this, babe. *card declined* ...I\'ve got this. *card declined*'); if (c) c.dnPose = 'facepalm'; yield this.chloeSay('I\'ll get it. Again. Third date running.'); }
    else if (pick === 'split') { if (c) c.dnPose = 'point'; this.shot('dutch'); yield this.chloeSay('SPLIT it? I had a SALAD. You had the restaurant!'); }
    else { if (r) r.dnPose = 'cheer'; yield this.line(r, '*empties his pockets: eleven bread rolls and a butter* Keep the change.'); if (w) yield this.line(w, 'That\'s... actually more than enough, sir.'); this.reward(10); }
    if (c) c.dnPose = 'cross'; this.shot('orbit'); yield this.chloeSay(this.catches === 0 ? 'You were SO good tonight, babe. Next week? Same place?' : this.catches === 1 ? 'You did ALRIGHT tonight. Alright. Don\'t push it.' : 'We\'re getting the bus home. Separately.');
    if (w) this.sendHome(w);
    if (c) c.dnPose = null; if (r) r.dnPose = null;
    this.shot('wide'); this.stamp('THE END', '#e879f9', 3); yield 2.0;
    this.cam = null; this.d.end();
  }

  // ============================================================ MORE OF THE LADS
  *noahFilm(n) {
    if (!n) return;
    this.titleCard('🏉', 'NOAH\'S SCRUM', 'Push back. Sneak bites while Chloe\'s watching the scrum'); yield 1.6;
    yield* this.fetch(n, 'Right, Ronnie! Rugby demonstration for Chloe! Bind on me! SCRUM!');
    n.dnPose = 'bow';
    this.shot('overR'); yield this.chloeSay('Noah, we\'re in a RESTAURANT. ...Fine. I\'ll watch. I\'m watching HANDS, Ronnie.');
    this.shot('low', { c: n }); n.dnPose = 'flex'; yield this.line(n, 'Crouch! Bind! SET! *knocks over a vase*');
    this.shot('trio');
    const res = yield* this.play(wrestleGame({ lvl: this.lvl, pushIcon: '🏉', pushLabel: 'SCRUM!', foeIcon: '🏉', midIcon: '🤜', winText: 'YOU WIN THE SCRUM!', loseText: 'NOAH WINS. TRY!', foeWins: 'TRY! ...Ron, that wasn\'t a scrum. That was a hug. A long one.', foeLoses: 'I bounced off you, mate. I BOUNCED. Like a bouncy castle full of gravy.', strain: ['Hold it, Ron! HOLD IT!', 'Engage! ENGAGE!', 'Your front row is all belly, mate!'] }));
    n.dnPose = null;
    if (!res.win) { yield* this.caughtFilm('wrestle'); this.sendHome(n); return; }
    this.shot('char', { c: n, d: 1.2, side: 0.3 }); n.dnPose = 'cheer'; yield this.line(n, res.wrestle === 'won' ? 'He\'s a PROP, Chloe! A natural! Glory glory!' : 'Good effort, Ron. Half-time oranges are on me.');
    yield* this.winFilm(res, res.wrestle === 'won' ? 'FRONT ROW!' : 'SNUCK IT!');
    this.sendHome(n);
  }
  *kneeFilm(a) {
    if (!a) return;
    this.titleCard('🦵', 'AIDAN W\'S KNEE', 'He\'s brought it over. He\'s going to talk about it. React right'); yield 1.6;
    yield* this.fetch(a, 'Alright Ron. Chloe. Don\'t get up. I can\'t either. It\'s the knee.');
    a.dnPose = 'knee';
    this.shot('overR'); yield this.chloeSay('Oh no, Aidan. Sit... oh. You can\'t. What happened?');
    this.shot('low', { c: a }); yield this.line(a, 'Where do I start. It started in 2019.');
    this.shot('trio');
    const res = yield* this.play(reactGame({ h: a, lvl: this.lvl, tales: KNEE, listen: 'LISTENING TO THE KNEE', icon: '🦵', ink: '#132257', thanksLol: ['Exactly, Ron. You laugh, but it hurts.', 'See, Ronnie gets the knee.'], thanksSad: ['Thanks Ron. The knee thanks you too.', 'You understand. You\'ve got knees. Under there.'] }));
    a.dnPose = null;
    if (!res.win) { yield* this.caughtFilm('react'); this.sendHome(a); return; }
    this.shot('char', { c: a, d: 1.2, side: 0.3 }); yield this.line(a, 'Anyway. Spurs lost again. Same as the knee. Cheers for listening.');
    yield* this.winFilm(res, 'GOOD LISTENER');
    this.sendHome(a);
  }
  *alfieFilm(a) {
    if (!a) return;
    const c = this.chloe;
    this.titleCard('🦁', 'ALFIE\'S NEW TATTOO', 'He\'s showing Chloe. In detail. Cram while she squints at it'); yield 1.6;
    yield* this.fetch(a, 'Chloe! Ron! Look at this. Fresh ink. Took nine hours. Well. Forty minutes and a pint.');
    a.dnPose = 'show';
    this.shot('push', { c: a }); yield this.line(a, 'It\'s the Champions League trophy. Shading\'s not done. Neither\'s the trophy, to be fair.');
    if (c) { c.lookOverride = 1.0; c.dnPose = 'chin'; } this.shot('overR'); yield this.chloeSay('Is that... is that a lion? Or a dog? It looks like Chester, Alfie.');
    this.shot('side');
    const res = yield* this.play(cramGame({ pool: ['bread', 'chips', 'next', 'wine', 'butter', 'pasta'], rounds: 2, lvl: this.lvl, away: 1.0, pose: 'chin', fakeText: 'She leans in closer. Alfie flexes. She\'s gone again.', again: ['Wait, there\'s more? On your BACK?', 'Show me the other arm. Is that Cole Palmer? Shivering?'], mutter: ['It\'s quite good, actually. For a dog.', 'Did it hurt? It looks like it hurt.', 'Why is the trophy wearing a Chelsea scarf?'] }));
    a.dnPose = null; if (c) c.dnPose = null;
    if (!res.win) { yield* this.caughtFilm(res.reason); this.sendHome(a); return; }
    this.shot('char', { c: a, d: 1.2, side: 0.3 }); a.dnPose = 'cheer'; yield this.line(a, 'Blues brothers, Ron! Come on Chelsea! Right, I\'m going to show table six.');
    yield* this.winFilm(res, 'INKED IN!');
    this.sendHome(a);
  }
  *ianFilm(i) {
    if (!i) return;
    const c = this.chloe;
    this.titleCard('🫑', 'IAN\'S HEALTHY SWAP', 'Lewis\'s dad is "helping". Grab the food. Not his chilli'); yield 1.6;
    yield* this.fetch(i, 'Alright Ronnie boy! Lewy says you\'re on a diet. LEWY says. I\'ve brought PEPPERS.');
    i.dnPose = 'talk';
    this.shot('overR'); yield this.chloeSay('Ian! Thank GOD. Someone who gets it. Tell me about the peppers.');
    this.shot('low', { c: i }); yield this.line(i, 'Grilled. Three days marinating. And the chilli, Ronnie. Proper hot. Don\'t touch the chilli.');
    if (c) c.lookOverride = 1.0;
    this.shot('trio');
    const res = yield* this.play(conveyorGame({ lvl: this.lvl, trap: '🌶️', trapReason: 'chilli', veg: '🫑', food: [['🍔', 13], ['🌭', 12], ['🍗', 12], ['🍕', 11], ['🥩', 14]], busyText: 'IAN\'S LECTURING HER', goText: 'GRAB THE GOOD STUFF. NOT THE CHILLI', mutterWho: i, mutter: ['Canvey Lake, Chloe. Disgrace. I pulled a sofa out once.', 'Lewy eats a pepper a day. Look at him. Well. Don\'t.', 'In my day we had a pint and a fry-up and we were FINE.', 'The council wants to "rewild" the lake. It\'s already wild!'] }));
    i.dnPose = null;
    if (!res.win) { yield* this.caughtFilm(res.reason); this.sendHome(i); return; }
    this.shot('char', { c: i, d: 1.2, side: 0.3 }); i.dnPose = 'point'; yield this.line(i, 'See? He ate everything except the peppers. Typical. You\'re not invited Sunday. You are. You\'re not.');
    yield* this.winFilm(res, 'NOT ONE PEPPER');
    this.sendHome(i);
  }

  // ============================================================ RESTAURANT EVENTS
  *fireFilm() {
    const c = this.chloe, r = this.ron;
    this.titleCard('🚨', 'FIRE ALARM!', 'Everyone out! Ronnie\'s "going back for his coat"'); yield 1.6;
    sfx('alarm', null, 0.8); this.shot('room'); yield this.narrate('The chef\'s flambé has set off the fire alarm. Everybody out!');
    const out = [];
    for (const gp of this.d.dinerGroups || []) for (const d of gp) { if (d.disposed) continue; this.wrapPose(d); d.seated = false; d.state = 'idle'; d.dnPose = R(['facepalm', 'cheer', 'phone']); out.push(d); }
    if (c) { c.seated = false; c.dnPose = 'point'; } this.shot('push', { c }); yield this.chloeSay('Ronnie! OUT! Now! Leave the bread!');
    if (r) r.dnPose = 'innocent'; this.shot('ronnie'); yield this.line(r, 'Right behind you, babe! Just getting... my coat. My coat is in the kitchen.');
    this.chloeAway(); this.shot('wide'); yield 1.4;
    this.chloeHide(); for (const d of out) { d.dnHid = true; if (d.rag.group) d.rag.group.visible = false; if (d.bubble) d.bubble.visible = false; }
    this.shot('crane'); yield this.narrate('The restaurant is empty. Alarms ringing. Every plate abandoned. Ronnie has never been happier.');
    const res = yield* this.play(raidGame({ total: rr(13, 15), lvl: this.lvl, noGuards: true, msgs: { flush: '📢 "RONNIE?!" She\'s calling you from outside!', dryer: '🚒 The fire brigade are coming in!', f: '📢 SHE\'S CALLING!', d: '🚒 FIREMEN!', h: '🚨 AT THE DOOR!', away: '🚨 EVERYONE\'S OUTSIDE' } }));
    for (const d of out) { d.dnHid = false; if (d.rag.group) d.rag.group.visible = true; d.dnPose = null; if (d.seat) { d.state = 'idle'; d.path = null; d.rag.placeAt(d.seat.x, d.seat.z, d.seat.yaw); d.seated = true; } }
    if (this.away) this.travel(null, true);
    this.chloeBack(false); this.shot('wide');
    if (!res.win) { yield 1.2; this.chloeSit(); yield* this.caughtFilm('fire'); return; }
    yield 1.4; this.chloeSit();
    this.raided += res.n || 0; track('dnRaid', res.n || 0);
    this.shot('overR'); yield this.chloeSay('False alarm. Why are you out of breath? You were sat there the whole time.');
    yield* this.winFilm(res, res.n ? `EVACUATED ${res.n}!` : 'SAFETY FIRST');
  }
  *powerFilm() {
    const c = this.chloe;
    this.titleCard('💡', 'POWER CUT', 'Pitch black. Grab what you can. Freeze when the lights flicker'); yield 1.6;
    this.shot('wide'); yield this.narrate('BANG. The lights go out. Somebody screams. It\'s Harry.');
    this.ui.dim(true);
    this.shot('overR'); if (c) c.dnPose = 'phoneup'; yield this.chloeSay('Babe? Babe, where are you? I\'m putting my phone torch on. Don\'t move.');
    this.shot('side');
    const res = yield* this.play(whackGame({ lvl: this.lvl, dark: true, icon: '💡', who: c, parts: [['IN THE DARK', 4.0, false, 0.7], ['FLICKER!', 1.5, true], ['IN THE DARK', 3.5, false, 0.5], ['HER PHONE TORCH!', 1.6, true], ['STILL DARK...', 3.0, false, 0.45]],
      lines: { 1: 'The lights flicker... Is that you, babe?', 2: 'Dark again. Ugh. Where IS everyone?', 3: '*torch* RONNIE? Is that you? What\'s that noise?', 4: 'Why does it sound like someone\'s eating in here?' }, freezeText: 'THE LIGHTS! FREEZE!', freezeReason: 'flicker', freezeSfx: 'warn', goText: 'GRAB IN THE DARK. NOT THE SALAD', bad: '🥗', badLabel: 'SALAD!', food: ['🍕', '🍔', '🍰', '🍟', '🧀', '🍩'] }));
    this.ui.dim(false); if (c) c.dnPose = null;
    if (!res.win) { yield* this.caughtFilm(res.reason); return; }
    this.shot('overR'); yield this.chloeSay('The lights are back! ...why is every table\'s bread basket empty?');
    yield* this.winFilm(res, 'LIGHTS OUT!');
  }
  *noProposeFilm() {
    const c = this.chloe;
    this.titleCard('💔', 'THE PROPOSAL GOES WRONG', 'She said no. The whole room is staring at table six. Cram'); yield 1.6;
    this.shot('room'); yield this.narrate('A man at table six gets down on one knee. The room holds its breath.');
    if (c) { c.dnPose = 'phoneup'; c.lookOverride = -1.25; } this.shot('push', { c }); yield this.chloeSay('Babe! BABE! He\'s doing it! I\'m filming!');
    this.shot('wide'); sfx('crowd_ooh', null, 0.8); yield this.narrate('"...No." The room gasps. He drops the ring in the tiramisu.');
    if (c) c.dnPose = 'cry'; this.shot('chloe'); yield this.chloeSay('Oh my GOD. She said NO. I can\'t look. I can\'t NOT look.');
    this.shot('side');
    const res = yield* this.play(cramGame({ pool: ['next', 'pasta', 'bread', 'wine', 'chips', 'butter'], rounds: 3, lvl: this.lvl, away: -1.25, pose: 'cry', fakeText: 'She almost looks back... the man starts crying. She\'s glued to it.', again: ['Now he\'s eating the tiramisu WITH the ring in it!', 'Her MUM is here. She\'s on his side. Oh my God.'], mutter: ['That poor man.', 'Why would you do it in a RESTAURANT?', 'You\'d never do that to me, would you babe? Don\'t answer.'] }));
    if (c) { c.dnPose = null; c.lookOverride = null; }
    if (!res.win) { yield* this.caughtFilm(res.reason); return; }
    this.shot('overR'); yield this.chloeSay('That was AWFUL. I need a dessert. Where\'s all the dessert gone?');
    yield* this.winFilm(res, 'NOBODY NOTICED');
  }
  // the waiter: a wine tasting (three stages of it) and the chef's tasting flight
  *wineFilm() {
    const w = this.waiterChar(), c = this.chloe;
    this.titleCard('🍷', 'THE WINE TASTING', 'Swirl, sniff, sip. Three stages. Cram through all of them'); yield 1.6;
    if (w) { yield* this.fetch(w, 'The wine, madam. Would madam like to taste?'); w.dnPose = 'pour'; }
    this.shot('push', { c }); if (c) c.dnPose = 'chin'; yield this.chloeSay('Ooh, yes. I\'ve watched a VIDEO about this. Nobody talk.');
    this.shot('side');
    const res = yield* this.play(cramGame({ pool: ['bread', 'butter', 'chips', 'next', 'pasta', 'wine'], rounds: 3, lvl: this.lvl, away: 0.9, pose: 'chin', fakeText: 'She swirls it the wrong way. Starts again.', again: ['Now the SNIFF. *closes her eyes* Notes of... blackberry? Leather? Is that LEATHER?', 'And the sip. Hold on. Hold ON. Let it sit on the palate.'], mutter: ['*swirl* *swirl* *swirl*', 'It\'s got legs, babe. The wine. Look at its legs.', 'Hints of oak. And... is that Lynx Africa?'] }));
    if (c) c.dnPose = null; if (w) w.dnPose = null;
    if (!res.win) { yield* this.caughtFilm(res.reason); if (w) this.sendHome(w); return; }
    this.shot('char', { c: w, d: 1.2, side: 0.3 }); if (w) yield this.line(w, 'Madam approves? Lovely. And sir? ...sir has crumbs on his eyebrows.');
    yield* this.winFilm(res, 'VINTAGE!');
    if (w) this.sendHome(w);
  }
  *chefFilm() {
    const w = this.waiterChar(), c = this.chloe;
    this.titleCard('👨‍🍳', 'THE CHEF COMES OUT', 'A tasting flight for Chloe. Spoons for everyone. Freeze when he asks you'); yield 1.6;
    sfx('plate_down', null, 0.6); if (w) yield* this.fetch(w, w.id === 'ben' ? 'Good evening. Chef Ben. Yes, it\'s me. Yes, the hair\'s real. Tonight: a tasting flight.' : 'Chef\'s off. I\'m Chef now. Tasting flight! Don\'t ask.');
    if (w) w.dnPose = 'talk';
    this.shot('push', { c: w }); if (w) yield this.line(w, 'First, the amuse-bouche. It amuses the mouth. Ronnie, your mouth is not invited.');
    if (c) c.lookOverride = 1.0; this.shot('trio');
    const res = yield* this.play(whackGame({ lvl: this.lvl, icon: '👨‍🍳', parts: [['THE AMUSE-BOUCHE', 4.0], ['THE FOAM', 4.0, false, 0.6], ['"AND SIR?"', 1.8, true], ['THE FINALE', 3.5, false, 0.45]], food: ['🥄', '🍤', '🧆', '🍡', '🥟', '🦪'], bad: '🌿', badLabel: 'GARNISH!', badReason: 'garnish', gold: '🥩',
      lines: { 1: 'Next: a foam of leek. Inhale it, Chloe. Don\'t eat it. INHALE.', 2: 'And sir? What did SIR think of the foam?', 3: 'And the finale: a single pea. Twelve pounds.' }, freezeText: 'THE CHEF\'S LOOKING AT YOU!', goText: 'GRAB THE SPOONS. NOT THE GARNISH' }));
    if (w) w.dnPose = null; if (c) c.lookOverride = null;
    if (!res.win) { yield* this.caughtFilm(res.reason); if (w) this.sendHome(w); return; }
    this.shot('char', { c: w, d: 1.2, side: 0.3 }); if (w) { w.dnPose = 'bow'; yield this.line(w, 'Thank you. Thank you. I\'ll be in the kitchen, crying, because there\'s nothing left.'); }
    yield* this.winFilm(res, 'COMPLIMENTS TO THE CHEF');
    if (w) this.sendHome(w);
  }

  // ============================================================ BUSTED: her reaction, your excuse, the penalty
  *caughtFilm(reason, fromPlay) {
    const c = this.chloe, r = this.ron, g = this.g, P = g.player;
    this.catches++; track('dnBusted'); this.look = true;
    if (this.game) this.game = null;
    if (this.away) this.travel(null, true);
    this.ui.dim(false); this.spotlight(false);
    sfx('record_scratch', null, 0.9); P.shake && P.shake(0.6);
    if (c && c.dnHidden) this.chloeBack(true);
    if (c) { c.dnPose = 'point'; c.lookOverride = null; }
    this.titleS = 'BUSTED!'; this.ui.slate(`🎬 BUSTED · ${this.catches} / 3`);
    this.shot('dutch'); this.stamp('BUSTED!', '#ff3a3a', 2);
    g.words.show('BUSTED!', this.chloeHead().add({ x: 0, y: 0.4, z: 0 }), CHLOE_COL, 0.2, 1.4);
    yield 1.2;
    yield this.chloeSay(R(BUSTED[reason] || BUSTED.table));
    if (this.catches === 2) { this.shot('chloe'); yield this.chloeSay(R(['That\'s TWICE, Ronnie. Twice. Chester\'s never done anything twice.', 'Two. TWO. One more and I\'m getting the bus.'])); }
    // his excuse: the right one softens it, a bad one makes it worse
    this.shot('ronnie'); if (r) r.dnPose = 'shrug';
    const ex = yield* this.play(excuseGame({ reason }));
    const pick = ex.pick || { line: 'Mmmf? Mmmmf. *swallows* ...nothing, babe.' };
    yield this.line(r, pick.line);
    if (r) r.dnPose = null;
    this.shot('chloe');
    if (ex.fit === 'best') { if (c) c.dnPose = 'cross'; yield this.chloeSay(R(['...that\'s actually quite a good one. I hate that it\'s a good one.', 'Fine. FINE. I almost believe you. Almost.'])); }
    else if (ex.fit === 'ok') yield this.chloeSay(R(['Ronnie. Babe. No.', 'Do you hear yourself?']));
    else { if (c) c.dnPose = 'point'; yield this.chloeSay(R(['That is the WORST excuse I have ever heard. And I\'ve met Harry.', 'Are you serious? ARE YOU SERIOUS?'])); }
    if (this.catches >= 3) {
      if (c) c.dnPose = 'cross';
      this.shot('wide'); sfx('sadviolin', null, 0.9); this.stamp('💔 3 / 3', '#ff3a3a', 3.5);
      yield this.chloeSay('That\'s it. I\'ve ordered you a salad. And I\'m telling Chester.');
      yield 1.2;
      this.cam = null; this.d.end(); return;
    }
    // the penalty: a different one each time, lighter for a good excuse, both barrels for a terrible one
    const fresh = PENALTIES.filter(p => !this.penUsed.includes(p.id)); const pen = R(fresh.length ? fresh : PENALTIES); this.penUsed.push(pen.id);
    const soft = ex.fit === 'best', hard = ex.fit === 'bad';
    this.titleCard(pen.icon, pen.title, soft ? 'Let off lightly: ' + pen.sub.toLowerCase() : hard ? 'DOUBLE: ' + pen.sub.toLowerCase() : pen.sub, 3.2);
    if (c) c.dnPose = pen.id === 'mum' ? 'phoneup' : 'cross';
    this.shot(pen.id === 'salad' || pen.id === 'plate' ? 'table' : 'chloe');
    if (pen.id === 'salad') { const veg = hard ? ['broccoli', 'carrot', 'cucumber', 'broccoli', 'sprout'] : soft ? ['carrot'] : ['broccoli', 'carrot', 'cucumber']; veg.forEach((type, i) => { try { g.items.spawn(type, V(T.x - 0.2 + i * 0.1, 0.92, T.z + 0.25)); } catch (e) {} }); this.probation = soft ? 5 : hard ? 14 : 10; }
    if (pen.id === 'plate') { for (const it of g.items.items.slice()) { if (!it.dead && !it.heldBy && Math.hypot(it.pos.x - T.x, it.pos.z - T.z) < 0.55 && !it.def.veg) { try { g.items.remove(it); g.items.queueRespawn(it.type); } catch (e) {} } } const k = soft ? 8 : hard ? 30 : 15; g.addChonk(-k); this.d.stats.chonk = Math.max(0, this.d.stats.chonk - k); g.words.show(`-${k}`, this.ronHead().add({ x: 0, y: 0.3, z: 0 }), '#ff6b6b', 0.12, 1.4); }
    if (pen.id === 'mum') P.effect('noEat', soft ? 4 : hard ? 14 : 8);
    if (pen.id === 'bread') this.shorter = soft ? 1 : hard ? 3 : 2;
    yield this.chloeSay(pen.line);
    if (pen.id === 'lecture') { this.inBeat = false; yield this.chloeSay('And another thing. Chester eats better than you. CHESTER. He eats a salmon pâté.'); if (!soft) yield this.chloeSay('Your mum says you had a Greggs on the way here. TWO Greggs. In one trip.'); if (hard) yield this.chloeSay('I\'ve made a spreadsheet, Ronnie. Of your snacks. It\'s got TABS.'); this.inBeat = true; }
    if (pen.id === 'mum') { this.shot('ronnie'); yield this.line(r, R(['Hi Mum. Yes. No. It was ONE bread roll. Fine. Three.', 'Mum. MUM. I\'m thirty. ...yes, I\'ll put her on.'])); }
    if (pen.id === 'salad') { this.shot('ronnie'); if (r) r.dnPose = 'gape'; yield this.narrate(hard ? 'Five vegetables. She\'s counting. She will KNOW.' : 'A salad. On your plate. Staring at you.'); if (r) r.dnPose = null; }
    if (c) c.dnPose = pen.id === 'salad' ? 'salad' : null;
    this.cool = 2; this.probation = Math.max(this.probation, soft ? 3 : 5);
    if (fromPlay) this.nextT = Math.max(this.nextT, 9);
  }
}

// ---------------------------------------------------------------- the shots: [camera position, where it looks, roll]
const SHOTS = {
  wide: (S, t) => [V(2.9 + Math.sin(t * 0.25) * 0.1, 1.3, 3.1), V(0, 1.0, T.z - 0.1)],
  side: (S, t) => { const k = ease(t / 6); return [V(1.95 - 0.22 * k, 1.2, T.z + 0.05), V(0, 1.02, T.z)]; },
  overR: (S, t) => { const k = ease(t / 4), h = S.chloeHead(); return [V(0.6 - 0.05 * k, 1.32, RON.z + 1.15 - 0.15 * k), h.add({ x: 0, y: -0.06, z: 0 })]; },
  trio: (S, t) => [V(-2.0 + Math.min(0.2, t * 0.03), 1.28, T.z + 1.8), V(0.4, 1.08, T.z - 0.15)],
  chloe: (S, t) => { const h = S.chloeHead(); return [V(h.x + 0.24 + Math.sin(t * 0.3) * 0.03, h.y + 0.03, h.z + 0.9 - Math.min(0.15, t * 0.03)), h]; },
  ronnie: (S, t) => { const h = S.ronHead(); return [V(h.x - 0.22, h.y + 0.04, h.z - 0.9 + Math.min(0.15, t * 0.03)), h]; },
  table: (S, t) => [V(0.05, 1.75 - Math.min(0.12, t * 0.03), T.z + 1.15), V(0, 0.82, T.z + 0.05)],
  dutch: (S, t) => { const h = S.chloeHead(), k = ease(t / 0.5); return [V(h.x - 0.15, h.y + 0.05, h.z + 1.2 - 0.45 * k), h, 0.22]; },
  char: (S, t, o) => {
    const c = o.c; if (!c || c.disposed || !c.rag) return SHOTS.wide(S, t);
    const h = c.headPos(new THREE.Vector3()), to = V(T.x - h.x, 0, T.z - h.z); if (to.lengthSq() < 0.01) to.set(0, 0, 1); to.normalize();
    const side = V(to.z, 0, -to.x), d = o.d || 1.3;
    return [h.clone().addScaledVector(to, d).addScaledVector(side, (o.side || 0.3)).add({ x: 0, y: 0.05, z: 0 }), h.clone().add({ x: 0, y: -0.05, z: 0 })];
  },
  at: (S, t, o) => [o.pos.clone().add({ x: Math.sin(t * 0.4) * 0.06, y: 0, z: 0 }), o.look],
  crane: (S, t) => [V(-2.4 + Math.min(1.2, t * 0.1), 1.9, 5.6), V(0.5, 0.8, -1.5)],
  // camera moves: round the table, a slow push in on someone, a track along the table, low on someone, the room
  orbit: (S, t) => { const a = 0.9 + t * 0.22, r = 2.4; return [V(T.x + Math.sin(a) * r, 1.28, T.z + Math.cos(a) * r), V(T.x, 1.02, T.z)]; },
  push: (S, t, o) => { const c = o.c || S.chloe, h = c && !c.disposed && c.rag ? c.headPos(new THREE.Vector3()) : S.chloeHead(), to = V(T.x - h.x, 0, T.z + 1.6 - h.z); if (to.lengthSq() < 0.01) to.set(0, 0, 1); to.normalize(); const d = lerp(1.7, 0.85, ease(t / 4.5)); return [h.clone().addScaledVector(to, d).add({ x: 0, y: 0.04, z: 0 }), h]; },
  dolly: (S, t) => { const k = ease(t / 5); return [V(lerp(4.2, -2.2, k), 1.3, T.z + 2.5), V(lerp(5.5, 0, ease(t / 3)), 1.02, T.z)]; },
  low: (S, t, o) => { const c = o.c; if (!c || c.disposed || !c.rag) return SHOTS.wide(S, t); const h = c.headPos(new THREE.Vector3()), to = V(T.x - h.x, 0, T.z + 1.2 - h.z); if (to.lengthSq() < 0.01) to.set(0, 0, 1); to.normalize(); const side = V(to.z, 0, -to.x); return [h.clone().addScaledVector(to, 1.25).addScaledVector(side, 0.35).setY(0.75), h.clone().add({ x: 0, y: -0.1, z: 0 })]; },
  foyer: (S, t) => [V(11.3 - Math.min(0.25, t * 0.05), 1.45, 5.55), V(9.4, 1.25, 6.4)],      // (inside the foyer, side on: the couple at the podium, the maître d' behind it)
  room: (S, t) => [V(-6.0 + t * 0.15, 1.95, 7.4), V(2, 0.8, -2)],
};
export const DN_SHOTS = Object.keys(SHOTS);
const FAR = { side: 1.45, wide: 1.15, overR: 1.15, trio: 1.2, char: 1.15, orbit: 1.15, dolly: 1.1, low: 1.1 };
