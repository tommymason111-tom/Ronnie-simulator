// THE SQUAD (design doc Part 5, plus Connor and Ethan): Chloe, Lewis, Harry H, Aidan, Noah,
// Oliver and Dylan. Everyone is trying to stop Ronnie. Nobody can.
//
// Each member is a physics ragdoll (same rig as Tommy) with a stylised body
// built from shapes — heights, builds, hair, outfits, colours and props from
// the doc — their own line banks, and their signature "intervention".
// To swap in a real 3D model later, give them a GLB like Tommy's.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Character, ballistic } from './character.js';
import { Item } from './foods.js';
import { sfx } from './audio.js';
import { canvasTex, FONT } from './textures.js';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------------------
// Who's who
// ---------------------------------------------------------------------------
const SKIN = { light: 0xf1c3a5, fair: 0xf3cdb4, warm: 0xe5b08e, tan: 0xd9a07a };

export const SQUAD = {
  chloe: {
    name: 'Chloe', color: '#B57BFF', voicePitch: 1.35,
    model: './assets/squad/chloe.glb', modelBody: { h: 1.70, bind: { sh: [0.20, 1.38, 0], el: [0.44, 1.37, -0.03], ha: [0.85, 1.37, -0.04], hipX: 0.10, hipY: 0.86, kneeY: 0.47, neckY: 1.45, topY: 1.70, headZ: 0, chestW: 0.15, chestD: 0.10, pelvisW: 0.16, arm: 0.04, leg: 0.075 } },
    body: { h: 1.70, sw: 0.9, girth: 0.88, limb: 0.85 },
    look: { skin: SKIN.fair, hair: { style: 'long', color: 0x0d0b0b }, top: 0xb57bff, sleeves: 'long', hood: true, bottom: 0x15151a, legs: 'trousers', shoes: 0xf5f5f5, lips: 0xc0636b },
    title: 'NAME THE FOOD', fail: 'named every snack. Ronnie ate every snack.',
    banks: {
      greet: ['Ronnie. Babe. We need to talk about the fridge.', 'Hi babe! I brought celery. Don\'t make that face.'],
      chatter: ['That\'s Gerald. Gerald had a family.', 'I\'m not talking to you. I\'m talking to your belly. Hello, belly.', 'Did you know a group of chins is called a Ronnie? I made that up. It\'s still true.', '...anyway.', 'I had a dream you were a moon. I\'m starting to think it was a prophecy.', 'You\'re still my Ronnie. There\'s just... SO much more Ronnie.', 'I love every one of your chins. I\'ve named them. That one\'s Barry.'],
      intervene: ['Ronnie. Put. It. Down.', 'We said one doughnut! ONE!', 'Salad ambush! It\'s for your own good, babe!'],
      name: ['That\'s Gerald. Gerald had dreams, Ronnie.', 'This one\'s called Susan. Susan is a mother.', 'Meet Kevin. Kevin wanted to see the world.'],
      guilt: ['He ate Gerald. He ATE GERALD.', 'Susan had KIDS, Ronnie!', 'Fine. FINE. Eat it. I\'ll just watch. Like a nature documentary.'],
      hit: ['Ronnie! I\'m trying to SAVE you!', 'Did you just throw a doughnut at your GIRLFRIEND?', 'I\'m not angry. I\'m just... worried about the sofa.'],
      slap: ['Ronnie! Babe! No!', 'That\'s it, you\'re sleeping on the sofa. If it survives.'],
      grabbed: ['Ronnie, put me DOWN! I\'m your GIRLFRIEND, not a snack!'],
      launched: ['RONNIIIIIIE!'],
      vegThrow: ['Salad ambush! It\'s for your own good, babe!'],
    },
  },
  lewis: {
    name: 'Lewis', color: '#E8303A', voicePitch: 0.85,
    model: './assets/squad/lewis.glb', modelBody: { h: 1.91, bind: { zOff: -0.15, sh: [0.24, 1.50, -0.15], el: [0.42, 1.31, -0.15], ha: [0.29, 1.27, 0.35], hipX: 0.12, hipY: 0.97, kneeY: 0.53, neckY: 1.60, topY: 1.91, headZ: -0.12, chestW: 0.22, chestD: 0.13, pelvisW: 0.17, arm: 0.06, leg: 0.085 } },
    body: { h: 1.91, sw: 1.4, girth: 1.1, limb: 1.35 },
    look: { skin: SKIN.warm, hair: { style: 'mullet', color: 0x5a3a22 }, beard: { style: 'patchy', color: 0x4a3020 }, top: 0xd32f2f, top2: 0x1565c0, pattern: 'vstripes', sleeves: 'none', bottom: 0x111111, legs: 'shorts', shoes: 0x222222, prop: 'jug' },
    title: 'PROTEIN SWAP', fail: 'swapped the MONSTOR for protein. Ronnie bulked. Not like that.',
    banks: {
      greet: ['BRO. Bro. Put the pastry down, bro.', 'Ronnie! Leg day, bro! Not leg OF LAMB day!'],
      chatter: ['Look at these arms, Ron. These could be YOUR arms. Not like that though.', 'I benched 140 this morning. You benched a family-size lasagne.', 'My beard? It\'s growing, bro. It\'s a slow grower. Like your self-control.', 'Palace are going up, bro. Like your cholesterol.', 'Ronnie, you\'re not bulking. You\'re just bulk.', 'Tommy, mate, your abs are cute. Mine are just... bigger. Under here. Somewhere.'],
      intervene: ['Protein swap, bro! Proper fuel! No more MONSTOR!', 'Shakes on the table, bro. Gains only.'],
      shake: ['Bro, my protein shakes are for GAINS, not for... oh. Oh, you\'ve gained.', 'Bro... you\'re bulking. Not like that, bro.'],
      hit: ['Is that it, bro?', 'Didn\'t even hurt. I\'m just trying to help, bro.'],
      slap: ['Bro! Not the face, bro! The face is for the gram!'],
      grabbed: ['Bro! Bro! Put me down, bro, I\'m 110 kilos of pure muscle, bro!'],
      launched: ['BROOOOOOOO—'],
      vegThrow: ['Greens, bro! Eat your greens!'],
    },
  },
  harry: {
    name: 'Harry H', color: '#7A1F3D', voicePitch: 1.15,
    model: './assets/squad/harry.glb', modelBody: { h: 1.83, bind: { sh: [0.20, 1.44, 0], el: [0.26, 1.19, 0], ha: [0.27, 0.76, 0.05], hipX: 0.11, hipY: 0.92, kneeY: 0.50, neckY: 1.53, topY: 1.82, headZ: 0.05, chestW: 0.17, chestD: 0.13, pelvisW: 0.15, arm: 0.05, leg: 0.07 } },
    body: { h: 1.83, sw: 0.95, girth: 0.82, limb: 0.78 },
    look: { skin: SKIN.light, hair: { style: 'shortcurls', color: 0x1a1210 }, beard: { style: 'stubble', color: 0x1a1210 }, top: 0x1d2b5a, top2: 0xffffff, pattern: 'jersey', sleeves: 'short', bottom: 0x2b3a55, legs: 'trousers', shoes: 0xf5f5f5, cap: 0x7a1f3d, scarf: true, prop: 'phone' },
    title: 'CATCH & CHONK', fail: 'threw the food away. Ronnie caught it in his mouth. Every time.',
    banks: {
      greet: ['Ronnie, my guy, I\'ve matched with SIX girls this week. Six! None of them have replied, but SIX.'],
      chatter: ['She said she likes tall guys. I\'m tall! She said she likes guys with abs... I\'m tall!', 'Her bio said "no time-wasters". So I\'ve wasted no time messaging her forty times.', 'West Ham till I die, Ron. Which, with your cooking, could be soon.', 'Ronnie, if you were on a dating app, your profile pic would need to be a panorama.', 'Ronnie, you\'d make an amazing offensive lineman. You\'re already offensive. And a line. A wide line.'],
      intervene: ['HAIL MARY! I\'m throwing this as FAR away from you as possible!', 'Hut! Hut! HUT! Get it away from him!'],
      caught: ['TOUCHDOWN! Wait, no, that\'s a doughnut. And it\'s gone.', 'INTERCEPTION! ...and he\'s handed it straight back to Ronnie. Terrible decision.', 'He caught it IN HIS MOUTH. The crowd goes wild. I go home.'],
      hit: ['Still got the phone! I\'m just trying to help!'],
      slap: ['Ow! My dating face!'],
      grabbed: ['Ronnie, mate, I\'m six foot! You can\'t just pick up six foot!'],
      launched: ['HAIL MAAAARY—'],
      vegThrow: ['Long pass! Sprouts incoming!'],
    },
  },
  aidan: {
    name: 'Aidan', color: '#2E7D32', voicePitch: 0.8,
    model: './assets/squad/aidan.glb', modelBody: { h: 1.78, bind: { sh: [0.21, 1.44, 0], el: [0.28, 1.17, 0], ha: [0.28, 0.69, 0.08], hipX: 0.10, hipY: 0.89, kneeY: 0.49, neckY: 1.50, topY: 1.78, headZ: 0.04, chestW: 0.19, chestD: 0.13, pelvisW: 0.16, arm: 0.06, leg: 0.08 } },
    body: { h: 1.78, sw: 1.0, girth: 1.0, limb: 1.0 },
    look: { skin: SKIN.fair, hair: { style: 'tucked', color: 0x111111 }, beard: { style: 'full', color: 0x111111 }, top: 0x7a1f3d, top2: 0x7ec8e3, pattern: 'sleeves2', sleeves: 'long', bottom: 0x2a3b5c, legs: 'trousers', shoes: 0x4a3020, prop: 'pint' },
    title: 'JUST THE ONE', fail: 'suggested a quiet one. Lost his pint.',
    banks: {
      greet: ['Ronnie. Lad. Sit down. Let\'s have a quiet one and talk about this.'],
      chatter: ['I\'ve seen a lot of things in my life, Ronnie. I\'ve never seen a man eat a bar stool.', 'The beard\'s got crisps in it, hasn\'t it. You\'re looking at the beard. Don\'t look at the beard.', 'Come on you Irons. Come on, Ronnie, slow down.', 'You\'re the only man I know who orders a pint and a pie and then eats the pub.', 'My nan was from Cork. She\'d have fed you. She\'d have regretted it.', 'My little brother Connor supports Liverpool. We don\'t talk about it at Christmas.', 'Connor says he\'s the better-looking brother. Connor says a lot of things.'],
      intervene: ['Just the one, Ronnie. Here. Let it settle first. Patience.', 'Right. Intervention time. Let\'s be grown-ups about this.'],
      settle: ['You have to let it settle, Ronnie. Patience.', 'Let it settle...', 'Nearly...'],
      drank: ['That\'s a lovely pint. That WAS a lovely pint.', 'You have to let it settle, Ronnie. ...and he\'s drunk it. Mine. That was mine.', 'Ah, now you\'re getting it.'],
      snap: ['RONNIE! PUT! THE! BAR! DOWN! ...sorry. Anyway.'],
      hit: ['Didn\'t spill a drop. I\'m just trying to help.'],
      slap: ['...was that necessary, Ronnie.'],
      grabbed: ['Mind the pint. Mind the PINT, Ronnie.'],
      launched: ['Not a drop spilt— whoaaaa—'],
    },
  },
  noah: {
    name: 'Noah', color: '#C62828', voicePitch: 0.75,
    model: './assets/squad/noah.glb', modelBody: { h: 1.73, girth: 1.5, bind: { zOff: -0.03, sh: [0.25, 1.42, -0.03], el: [0.34, 1.17, -0.03], ha: [0.37, 0.80, 0], hipX: 0.13, hipY: 0.86, kneeY: 0.47, neckY: 1.48, topY: 1.72, headZ: -0.01, chestW: 0.25, chestD: 0.18, pelvisW: 0.20, arm: 0.07, leg: 0.10 } },
    body: { h: 1.73, sw: 1.35, girth: 1.7, limb: 1.25 },
    koMul: 1.8,
    look: { skin: SKIN.warm, hair: { style: 'short', color: 0x5a3a22 }, beard: { style: 'stubble', color: 0x5a3a22 }, top: 0xc62828, top2: 0xffffff, pattern: 'hoops', sleeves: 'short', bottom: 0x1b1b1b, legs: 'shorts', shoes: 0x111111 },
    title: 'THE TACKLE', fail: 'tackled Ronnie. Bounced off.',
    banks: {
      greet: ['Right, Ronnie, I\'ve brought half-time oranges. HEALTHY.', 'Alright Ron! Fancy some exercise? Rugby? Rugby. Rugby?'],
      chatter: ['I\'ve tackled props, I\'ve tackled locks, I\'ve never tackled a man with his own moon.', 'United would never let a player get this big. Well. Except the wages.', 'Chelsea fan, eating like this? Typical.', 'Crouch... bind... SET! ...he\'s eaten the ball.'],
      intervene: ['Right, Ronnie, I\'m coming in. Brace!', 'TACKLE! It\'s for your own good, mate!'],
      bounced: ['I bounced off you, mate. I BOUNCED. Like a bouncy castle full of gravy.', 'Good hit! I\'m just trying to help!'],
      tackled: ['Got him! Food\'s down! ...he\'s picked it back up.', 'TRY! ...no. No, that\'s him eating.'],
      hit: ['Good hit! I\'m just trying to help!', 'Barely felt it, Ron!'],
      slap: ['That\'s a yellow card, Ronnie!'],
      grabbed: ['How are you LIFTING me?! I\'m a prop! PROPS DON\'T FLY!'],
      launched: ['SCRUUUUUM—'],
      vegThrow: ['Half-time oranges! Well, carrots! Catch!'],
    },
  },
  oliver: {
    name: 'Oliver', color: '#00B8D4', voicePitch: 1.1,
    model: './assets/squad/oliver.glb', modelBody: { h: 1.75, girth: 1.15, bind: { sh: [0.21, 1.43, 0], el: [0.30, 1.17, 0], ha: [0.30, 0.70, 0.05], hipX: 0.11, hipY: 0.88, kneeY: 0.48, neckY: 1.50, topY: 1.75, headZ: 0.04, chestW: 0.20, chestD: 0.13, pelvisW: 0.17, arm: 0.06, leg: 0.08 } },
    body: { h: 1.75, sw: 1.0, girth: 1.0, limb: 0.95 },
    look: { skin: SKIN.light, hair: { style: 'curtains', color: 0x6b4423 }, beard: { style: 'full', color: 0x5a3a22 }, glasses: true, top: 0xffd600, top2: 0x0d47a1, pattern: 'polo', sleeves: 'short', bottom: 0x111111, legs: 'trousers', shoes: 0x111111, prop: 'phone' },
    title: 'SHAME CAM', fail: 'filmed Ronnie to shame him. It went viral.',
    banks: {
      greet: ['Hey guys, welcome back to the channel. Today: can my mate Ronnie NOT eat something? Spoiler: no.'],
      chatter: ['Like, comment and subscribe, and pray for the bakery section.', 'Spurs are rebuilding, Ronnie. Like your sofa.', 'This is content. This is GOLD. This is also a crime.', 'Guys, he\'s eaten the self-checkout. He IS the unexpected item.', 'I\'ve got an idea. What if we put you on a diet... live? Ten million views. Easy.'],
      intervene: ['Shame cam is LIVE. Ronnie, everyone can see you. Put it down.', 'Guys, I\'m filming my mate to shame him into stopping. Let\'s go.'],
      viral: ['Ronnie, you\'ve just gained ten thousand followers. And ten pounds.', 'It\'s trending. RONNIE FOR PM is trending.', 'The followers LOVE you. Why do they love you?!'],
      hit: ['Got it! In 4K! I\'m just trying to help... the algorithm.'],
      slap: ['Not the phone! NOT THE PHONE!'],
      grabbed: ['Guys, I\'m being held hostage by the content. Like and subscribe.'],
      launched: ['This is going on the chaaaannel—'],
    },
  },
  dylan: {
    name: 'Dylan', color: '#FF6D00', voicePitch: 1.25,
    model: './assets/squad/dylan.glb', modelBody: { h: 1.65, bind: { sh: [0.17, 1.35, 0], el: [0.26, 1.08, 0], ha: [0.32, 0.72, 0.04], hipX: 0.10, hipY: 0.83, kneeY: 0.46, neckY: 1.40, topY: 1.66, headZ: 0.01, chestW: 0.16, chestD: 0.11, pelvisW: 0.15, arm: 0.045, leg: 0.07 } },
    body: { h: 1.65, sw: 0.9, girth: 0.82, limb: 0.82 },
    look: { skin: SKIN.light, hair: { style: 'short', color: 0x111111 }, beard: { style: 'goatee', color: 0x1a1210 }, top: 0x5b5a3a, top2: 0x7a1f3d, pattern: 'parka', sleeves: 'long', bottom: 0x2a3b5c, legs: 'trousers', shoes: 0xf5f5f5, shades: true },
    title: 'THE AMBUSH', fail: 'ambushed Ronnie from a bin. Was found in a bin.',
    banks: {
      greet: ['RONNIEEEEEEE!', 'West Ham, Oasis and attacking Ronnie. The three loves of my life.'],
      chatter: ['You know what\'s better than that kebab, Ronnie? OASIS. Everything is worse than Oasis.', 'Second album\'s the best, Ronnie, don\'t even start. DON\'T. START.', 'Ronnie, if you were an Oasis album, you\'d be a double album. Triple. Box set.', 'Listen. LISTEN. This one\'s my own song. It\'s called "Don\'t Eat The Fridge, Ron".'],
      intervene: ['...not yet... not yet... NOW!', 'RONNIEEEEEEE! I\'VE GOT HIM! I\'VE GOT HIM!'],
      cling: ['I\'m on you now! I live here now!', 'I\'ll bite you. I\'ll actually bite you. I\'m just trying to help!'],
      shaken: ['AGAIN! DO IT AGAIN! ...I mean, I\'m just trying to help.'],
      hit: ['AGAIN! DO IT AGAIN!'],
      slap: ['Ha! HA! Is that all you\'ve got?!'],
      grabbed: ['Put me DOWN! I\'ll bite! I WILL BITE!'],
      launched: ['WONDERWAAAA— I mean, AAAAARGH—'],
      vegThrow: ['CELERY GRENADE!'],
    },
  },
  connor: {
    name: 'Connor', color: '#C8102E', voicePitch: 0.82,
    model: './assets/squad/connor.glb', modelBody: { h: 1.80, girth: 1.25, bind: { sh: [0.22, 1.40, 0], el: [0.52, 1.39, 0], ha: [0.88, 1.38, 0], hipX: 0.12, hipY: 0.90, kneeY: 0.50, neckY: 1.50, topY: 1.80, headZ: 0.03, chestW: 0.23, chestD: 0.15, pelvisW: 0.19, arm: 0.055, leg: 0.085 } },
    body: { h: 1.80, sw: 1.1, girth: 1.2, limb: 1.05 },
    look: { skin: SKIN.fair, hair: { style: 'short', color: 0x3a2618 }, beard: { style: 'short', color: 0x3a2618 }, glasses: true, top: 0x14182a, sleeves: 'short', bottom: 0x8a8f98, legs: 'trousers', shoes: 0xf5f5f5, prop: 'pint' },
    title: 'THE ROUND', fail: 'bought a round to slow Ronnie down. Ronnie drank the round.',
    banks: {
      greet: ['Ronnie! Get in here, lad. Aidan\'s brother, at your service. The better-looking one.', 'Alright Ron. Pint? Course you will.'],
      chatter: ['Liverpool are the greatest club on Earth, Ronnie. You\'re the greatest club sandwich.', 'Our mammy says Aidan was the quiet one. I was the one who could finish a pint. You\'re the one who finishes the pub.', 'You\'ll never walk alone, Ronnie. Mostly because you can\'t fit through doors on your own.', 'A proper pint of stout is a meal in a glass, Ron. That\'s not a challenge.', 'Me and Aidan have been arguing about who\'s the older brother for thirty years. He is. He just looks it.', 'Anfield on a European night, Ronnie. The noise. Nearly as loud as your stomach.'],
      intervene: ['Right, Ronnie, my round! Two of the black stuff. Sip it slow, like a gentleman.', 'Lads, I\'ll handle this. Nothing slows a man down like a proper Irish stout.'],
      settle: ['Let it settle now. Patience, Ronnie. Patience.', 'One for you, one for me. Not one for Aidan.'],
      drank: ['He drank MY one as well. Aidan, your mate is a menace.', 'Ah, that was a lovely pint. Lovely. For you.', 'You\'ve drunk it faster than Salah runs, Ron.'],
      snap: ['You didn\'t even let it SETTLE! There are rules, Ronnie! Our grandad would weep!'],
      hit: ['Ah, come here! I\'m just trying to help, ya big eejit!', 'Not the glasses, Ronnie! Not the glasses!'],
      slap: ['That\'s a red card, Ronnie. Straight red.'],
      grabbed: ['Put me down! I\'m Irish, we don\'t fly, we drink!'],
      launched: ['YOU\'LL NEVER WALK ALOOOOONE—'],
      vegThrow: ['Have a sprout, Ron! It\'s like a tiny cabbage. You love cabbage. You love everything.'],
    },
  },
  ethan: {
    name: 'Ethan', color: '#FEBE10', voicePitch: 1.0,
    model: './assets/squad/ethan.glb', modelBody: { h: 1.78, girth: 1.2, bind: { sh: [0.20, 1.40, 0], el: [0.50, 1.40, 0], ha: [0.88, 1.39, 0], hipX: 0.12, hipY: 0.88, kneeY: 0.48, neckY: 1.45, topY: 1.78, headZ: 0.03, chestW: 0.20, chestD: 0.14, pelvisW: 0.18, arm: 0.055, leg: 0.09 } },
    body: { h: 1.78, sw: 1.05, girth: 1.15, limb: 1.1 },
    look: { skin: SKIN.warm, hair: { style: 'short', color: 0x1a1210 }, top: 0x111111, sleeves: 'short', bottom: 0xd8d8d8, legs: 'shorts', shoes: 0xf5f5f5, shades: true },
    title: 'GALÁCTICO FREE KICK', fail: 'curled three free kicks at Ronnie. Ronnie ate the wall.',
    banks: {
      greet: ['¡Hola, Ronnie! Yes, I\'m from Essex. Yes, I support Real Madrid. Yes, it\'s a big nose. Next question.', 'Ronnie! I smelt you coming. I smelt the kebab before you, actually.'],
      chatter: ['Hala Madrid, Ronnie. Fifteen Champions Leagues. You\'ve had fifteen breakfasts.', 'Everyone jokes about my nose. Fine. At least you can see my nose. Nobody\'s seen your neck since 2019.', 'My nose can smell a pasty from three postcodes away, Ron. Right now it\'s smelling YOU.', 'People say "why Real Madrid, you\'re from England?" Because I like winning, Ronnie. You should try it. Against a sandwich.', 'I don\'t need a snorkel on holiday. I\'ve got a nose. You don\'t need a lilo. You\'ve got a belly.', 'The Bernabéu holds eighty-odd thousand, Ron. Or about forty of you.'],
      intervene: ['Galáctico free kick! Stand still, Ronnie, you\'re the wall!', 'Set piece, Ron! Curling one in. It\'s broccoli. It\'s for your health.'],
      hit: ['Not the nose! Anything but the nose! There\'s a LOT of it to hurt!', 'Ow! I\'m just trying to help, Ronnie!'],
      slap: ['You\'ve just slapped a Real Madrid fan. That\'s a diplomatic incident.'],
      grabbed: ['Put me down! My nose is the heaviest part, I\'ll tip over!'],
      launched: ['HALA MADRIIIIID—'],
      vegThrow: ['Free kick! Top bins!', 'Curled it! Like Roberto Carlos!'],
    },
  },
};

// ---------------------------------------------------------------------------
// Building a stylised body (rigid-skinned to the ragdoll bones: one draw call)
// ---------------------------------------------------------------------------
function prep(geo, color, boneIndex, matrix, colorFn = null) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  if (matrix) g.applyMatrix4(matrix);
  const n = g.attributes.position.count, pos = g.attributes.position;
  const cols = new Float32Array(n * 3), c = new THREE.Color(color), c2 = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const cc = colorFn ? colorFn(pos.getX(i), pos.getY(i), pos.getZ(i), c2) || c : c;
    cols[i * 3] = cc.r; cols[i * 3 + 1] = cc.g; cols[i * 3 + 2] = cc.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { si[i * 4] = boneIndex; sw[i * 4] = 1; }
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  return g;
}
// matrix that places a Y-axis primitive between points a and b
function between(a, b, scaleXZ = [1, 1]) {
  const d = _v2.subVectors(b, a), len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
  return { len, m: new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(scaleXZ[0], 1, scaleXZ[1])) };
}
const at = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

function buildBody(rag, look) {
  const defs = rag.defs, idx = (n) => defs.findIndex(d => d.name === n), D = (n) => defs[idx(n)];
  const parts = [];
  const add = (geo, color, bone, m, fn) => parts.push(prep(geo, color, idx(bone), m, fn));
  const k = rag.height / 1.68;
  const skin = look.skin, hairC = look.hair?.color ?? 0x222222;
  const c1 = new THREE.Color(look.top), c2 = new THREE.Color(look.top2 ?? look.top);

  // ---- torso (chest bone) ----
  const ch = D('chest'), pel = D('pelvis');
  const tw = ch.half[0], td = ch.half[2];
  const torsoFn = {
    vstripes: (x) => (Math.floor((x + 1) / (0.035 * k)) % 2 ? c1 : c2),
    hoops: (x, y) => (Math.floor(y / (0.06 * k)) % 2 ? c1 : c2),
    jersey: (x, y) => (y > ch.b.y - 0.07 * k || Math.abs(x) > tw * 0.82 ? c2 : c1),
    polo: (x, y) => (y > ch.b.y - 0.05 * k ? c2 : c1),
    sleeves2: null, parka: null,
  }[look.pattern] || null;
  {
    // torso: a capsule exactly as tall as the chest bone, squashed to the right width/depth
    const H = (ch.b.y - ch.a.y) + 0.04 * k, r = Math.min(tw, H * 0.32), len = H - 2 * r;
    const torso = (rr, col, fn, extra = 1) => add(new THREE.CapsuleGeometry(rr, len, 8, 32), col, 'chest', at(0, (ch.a.y + ch.b.y) / 2 - 0.03 * k, 0, tw / rr * 0.95 * extra, 1, td / rr * 1.15 * extra), fn);
    torso(r, look.top, torsoFn);
    if (look.hood) add(new THREE.SphereGeometry(0.11 * k, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), look.top, 'chest', at(0, ch.b.y - 0.04 * k, -td * 0.9, 1, 0.6, 0.7, -0.4));
    if (look.pattern === 'parka') {   // big parka with a fur-trimmed hood
      torso(r, look.top, null, 1.1);
      add(new THREE.TorusGeometry(0.1 * k, 0.03 * k, 8, 16), 0xb59a6a, 'chest', at(0, ch.b.y - 0.02 * k, -td * 0.7, 1, 1, 1, Math.PI / 2.3));
      add(new THREE.BoxGeometry(0.06 * k, len * 0.9, 0.01), look.top2, 'chest', at(0, (ch.a.y + ch.b.y) / 2, td * 1.27));
    }
    if (look.scarf) add(new THREE.TorusGeometry(0.075 * k, 0.025 * k, 8, 16), 0x7a1f3d, 'chest', at(0, ch.b.y - 0.01 * k, 0, 1, 1, 1, Math.PI / 2), (x) => (Math.floor((x + 1) / (0.03 * k)) % 2 ? new THREE.Color(0x7a1f3d) : new THREE.Color(0x7ec8e3)));
    // neck
    add(new THREE.CylinderGeometry(0.045 * k, 0.05 * k, 0.08 * k, 10), skin, 'chest', at(0, ch.b.y + 0.01 * k, 0.005));
  }
  // ---- pelvis / skirt ----
  {
    const ph = pel.half;
    const col = look.legs === 'bare' ? look.bottom : look.bottom;
    const pr = Math.min(ph[0], ph[1] * 1.1);
    add(new THREE.CapsuleGeometry(pr, Math.max(0.01, ph[1] * 2.2 - 2 * pr), 6, 20), col, 'pelvis', at(0, (pel.a.y + pel.b.y) / 2, 0, ph[0] / pr * 0.95, 1, ph[2] / pr * 1.1));
    if (look.skirt) add(new THREE.CylinderGeometry(ph[0] * 0.95, ph[0] * 1.5, 0.3 * k, 16, 1, true), look.skirt, 'pelvis', at(0, pel.a.y - 0.08 * k, 0), null);
  }
  // ---- arms ----
  for (const s of ['L', 'R']) {
    const ua = D('uArm' + s), la = D('lArm' + s);
    const sleeveCol = look.sleeves === 'none' ? skin : look.pattern === 'sleeves2' ? look.top2 : look.top;
    const ur = ua.t * 0.95 / 1.04, lr = la.t * 0.95 / 0.95;
    { const { len, m } = between(ua.a, ua.b); add(new THREE.CylinderGeometry(ur, ur * 0.95, len, 10), skin, 'uArm' + s, m); }
    if (look.sleeves !== 'none') {
      const end = ua.a.clone().lerp(ua.b, look.sleeves === 'long' ? 1 : 0.55);
      const { len, m } = between(ua.a.clone().lerp(ua.b, -0.08), end); add(new THREE.CylinderGeometry(ur * 1.18, ur * 1.12, len, 10), sleeveCol, 'uArm' + s, m);
    }
    // shoulder ball
    add(new THREE.SphereGeometry(ur * 1.25, 10, 8), look.sleeves === 'none' ? skin : sleeveCol, 'uArm' + s, at(ua.a.x, ua.a.y, ua.a.z));
    { const { len, m } = between(la.a, la.b.clone().lerp(la.a, 0.22)); add(new THREE.CylinderGeometry(lr * 0.85, lr, len, 10), look.sleeves === 'long' ? sleeveCol : skin, 'lArm' + s, m); }
    // hand
    const hp = la.b.clone().lerp(la.a, 0.12);
    add(new THREE.SphereGeometry(0.045 * k, 10, 8), skin, 'lArm' + s, at(hp.x, hp.y, hp.z, 1.3, 0.75, 1));
  }
  // ---- legs ----
  for (const s of ['L', 'R']) {
    const ul = D('uLeg' + s), ll = D('lLeg' + s);
    const ur = ul.t * 1.1, lr = ll.t * 1.15;
    const upperCol = look.legs === 'bare' ? skin : look.bottom;
    const lowerCol = look.legs === 'trousers' ? look.bottom : skin;
    { const { len, m } = between(ul.a.clone().add(_v.set(0, 0.04 * k, 0)), ul.b); add(new THREE.CylinderGeometry(ur, ur * 0.85, len, 10), upperCol, 'uLeg' + s, m); }
    if (look.legs === 'shorts') { const { len, m } = between(ul.a.clone().add(_v.set(0, 0.05 * k, 0)), ul.a.clone().lerp(ul.b, 0.6)); add(new THREE.CylinderGeometry(ur * 1.2, ur * 1.15, len, 10), look.bottom, 'uLeg' + s, m); }
    { const { len, m } = between(ll.a, ll.b.clone().add(_v.set(0, 0.05 * k, -0.03 * k))); add(new THREE.CylinderGeometry(lr * 0.9, lr * 0.7, len, 10), lowerCol, 'lLeg' + s, m); }
    add(new THREE.SphereGeometry(lr * 0.95, 8, 6), lowerCol, 'lLeg' + s, at(ll.a.x, ll.a.y, ll.a.z));
    // shoe
    add(new THREE.BoxGeometry(0.1 * k, 0.07 * k, 0.24 * k), look.shoes, 'lLeg' + s, at(ll.b.x, 0.035 * k, 0.04 * k));
  }
  // ---- head ----
  {
    const hd = D('head'), c = hd.center, R = hd.sphere * 0.82;
    add(new THREE.SphereGeometry(R, 20, 16), skin, 'head', at(c.x, c.y, c.z, 0.88, 1.05, 0.95));
    const fz = c.z + R * 0.86;
    // ears, nose, eyes, brows, mouth
    for (const s of [-1, 1]) {
      add(new THREE.SphereGeometry(R * 0.2, 8, 6), skin, 'head', at(c.x + s * R * 0.88, c.y, c.z, 0.5, 1, 0.8));
      add(new THREE.SphereGeometry(R * 0.15, 12, 8), 0xffffff, 'head', at(c.x + s * R * 0.33, c.y + R * 0.12, fz - R * 0.04, 1, 0.8, 0.5));
      add(new THREE.SphereGeometry(R * 0.075, 8, 6), 0x2a1d14, 'head', at(c.x + s * R * 0.33, c.y + R * 0.12, fz + R * 0.03, 1, 1, 0.5));
      add(new THREE.BoxGeometry(R * 0.36, R * 0.07, R * 0.08), hairC, 'head', at(c.x + s * R * 0.34, c.y + R * 0.33, fz - R * 0.01, 1, 1, 1, 0, 0, -s * 0.12));
    }
    add(new THREE.SphereGeometry(R * 0.16, 8, 6), new THREE.Color(skin).multiplyScalar(0.92).getHex(), 'head', at(c.x, c.y - R * 0.08, fz + R * 0.06, 0.8, 1.1, 1));
    const bearded = look.beard && (look.beard.style === 'full' || look.beard.style === 'short');
    add(new THREE.BoxGeometry(R * 0.4, R * 0.07, R * 0.06), bearded ? 0xb5655a : look.lips ?? 0x8a4a40, 'head', at(c.x, c.y - R * 0.42, fz + (bearded ? R * 0.16 : -R * 0.06)));
    hair(add, look.hair, c, R, k);
    if (look.beard) beard(add, look.beard, c, R);
    if (look.glasses) for (const s of [-1, 1]) add(new THREE.TorusGeometry(R * 0.2, R * 0.03, 6, 16), 0x111111, 'head', at(c.x + s * R * 0.33, c.y + R * 0.12, fz + R * 0.05));
    if (look.glasses) add(new THREE.BoxGeometry(R * 0.26, R * 0.04, R * 0.04), 0x111111, 'head', at(c.x, c.y + R * 0.14, fz + R * 0.08));
    if (look.cap) {   // backwards cap
      add(new THREE.SphereGeometry(R * 1.04, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), look.cap, 'head', at(c.x, c.y + R * 0.06, c.z));
      add(new THREE.BoxGeometry(R * 0.9, R * 0.06, R * 0.6), look.cap, 'head', at(c.x, c.y + R * 0.33, c.z - R * 1.05, 1, 1, 1, -0.25));
    }
    if (look.shades) for (const s of [-1, 1]) add(new THREE.CylinderGeometry(R * 0.2, R * 0.2, R * 0.04, 12), 0x111111, 'head', at(c.x + s * R * 0.3, c.y + R * 0.78, c.z + R * 0.45, 1, 1, 1, 1.1));
    if (look.flower) for (let i = 0; i < 5; i++) { const a = i * 1.256; add(new THREE.SphereGeometry(R * 0.09, 6, 4), 0xff5fa2, 'head', at(c.x + R * 0.8 + Math.cos(a) * R * 0.1, c.y + R * 0.55 + Math.sin(a) * R * 0.1, c.z + R * 0.3)); }
  }
  const geo = mergeGeometries(parts, false);
  parts.forEach(p => p.dispose());
  return geo;
}

function hair(add, h, c, R, k) {
  const col = h.color;
  // a hair cap tilted back so its front edge sits above the eyebrows
  const cap = (scale = 1.06, theta = 0.46) => add(new THREE.SphereGeometry(R * scale, 18, 10, 0, Math.PI * 2, 0, Math.PI * theta), col, 'head', at(c.x, c.y + R * 0.04, c.z - R * 0.04, 1, 1, 1, -0.5));
  switch (h.style) {
    case 'short': cap(1.05, 0.44); break;
    case 'curtains':
      cap(1.06, 0.45);
      for (const s of [-1, 1]) add(new THREE.SphereGeometry(R * 0.55, 10, 8), col, 'head', at(c.x + s * R * 0.4, c.y + R * 0.55, c.z + R * 0.55, 1, 0.45, 0.75, 0.3, 0, -s * 0.6));
      break;
    case 'long':
      cap(1.07, 0.55);
      add(new THREE.BoxGeometry(R * 1.9, R * 3.2, R * 0.5), col, 'head', at(c.x, c.y - R * 1.0, c.z - R * 0.75));
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(R * 0.35, R * 1.9, R * 0.55), col, 'head', at(c.x + s * R * 0.95, c.y - R * 0.45, c.z + R * 0.05));
      break;
    case 'bigcurls':
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2, ring = i % 3;
        const rr = R * (1.05 + ring * 0.25), y = c.y + R * (0.55 - ring * 0.55);
        if (Math.cos(a) < (ring === 0 ? -0.75 : -0.25)) continue;   // keep the face clear (front is -cos)
        add(new THREE.IcosahedronGeometry(R * (0.42 + (i % 4) * 0.05), 1), col, 'head', at(c.x + Math.sin(a) * rr, y, c.z - Math.cos(a) * rr * 0.9 + (ring === 0 ? 0 : -R * 0.15)));
      }
      cap(1.12, 0.5);
      break;
    case 'shortcurls':
      cap(1.03, 0.42);
      for (let i = 0; i < 16; i++) { const a = i * 2.4, r = R * (0.3 + (i % 3) * 0.25); add(new THREE.IcosahedronGeometry(R * 0.2, 0), col, 'head', at(c.x + Math.cos(a) * r, c.y + R * (0.85 - (i % 3) * 0.12), c.z + Math.sin(a) * r * 0.9)); }
      break;
    case 'mullet':
      cap(1.06, 0.45);
      for (let i = 0; i < 10; i++) { const a = i * 2.4, r = R * (0.3 + (i % 3) * 0.3); add(new THREE.IcosahedronGeometry(R * 0.24, 0), col, 'head', at(c.x + Math.cos(a) * r, c.y + R * 0.8, c.z + Math.sin(a) * r * 0.8)); }
      for (let i = 0; i < 6; i++) add(new THREE.IcosahedronGeometry(R * 0.3, 0), col, 'head', at(c.x + (i % 3 - 1) * R * 0.4, c.y - R * (0.2 + Math.floor(i / 3) * 0.45), c.z - R * 0.85));
      break;
    case 'tucked':
      cap(1.07, 0.52);
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(R * 0.3, R * 1.3, R * 0.8), col, 'head', at(c.x + s * R * 0.9, c.y - R * 0.15, c.z - R * 0.35));
      add(new THREE.BoxGeometry(R * 1.6, R * 1.3, R * 0.4), col, 'head', at(c.x, c.y - R * 0.3, c.z - R * 0.8));
      break;
  }
}

function beard(add, b, c, R) {
  const col = b.color;
  switch (b.style) {
    case 'full': add(new THREE.SphereGeometry(R * 1.0, 16, 10, 0, Math.PI, Math.PI * 0.5, Math.PI * 0.42), col, 'head', at(c.x, c.y - R * 0.05, c.z + R * 0.06, 0.92, 1.15, 1.02)); break;
    case 'short': add(new THREE.SphereGeometry(R * 0.97, 16, 10, 0, Math.PI, Math.PI * 0.55, Math.PI * 0.36), col, 'head', at(c.x, c.y, c.z + R * 0.04, 0.9, 1.05, 1)); break;
    case 'stubble': add(new THREE.SphereGeometry(R * 0.955, 16, 10, 0, Math.PI, Math.PI * 0.56, Math.PI * 0.34), new THREE.Color(col).lerp(new THREE.Color(0xe0b090), 0.5).getHex(), 'head', at(c.x, c.y, c.z + R * 0.03, 0.9, 1.05, 1)); break;
    case 'goatee':
      add(new THREE.SphereGeometry(R * 0.25, 8, 6), col, 'head', at(c.x, c.y - R * 0.7, c.z + R * 0.72, 1, 1.1, 0.6));
      add(new THREE.BoxGeometry(R * 0.45, R * 0.07, R * 0.08), col, 'head', at(c.x, c.y - R * 0.3, c.z + R * 0.86));
      break;
    case 'patchy':
      for (let i = 0; i < 7; i++) add(new THREE.SphereGeometry(R * 0.08, 6, 4), col, 'head', at(c.x + (i - 3) * R * 0.18, c.y - R * (0.55 + (i % 2) * 0.15), c.z + R * 0.78));
      break;
  }
}

// ---------------------------------------------------------------------------
// Props held in a hand (kept upright, like Aidan's never-spilt pint)
// ---------------------------------------------------------------------------
function makeProp(type, k) {
  let mesh;
  if (type === 'pint') { mesh = new Item('pint').obj; mesh.scale.setScalar(1); }
  else if (type === 'phone') {
    mesh = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.01), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.135), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
    screen.position.z = -0.006; screen.rotation.y = Math.PI;
    const live = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff1744 }));
    live.position.set(0.025, 0.065, 0.007);
    mesh.add(body, screen, live);
  } else if (type === 'jug') {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.28, 14), new THREE.MeshPhongMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.6, shininess: 80 }));
  }
  return mesh;
}

// ---------------------------------------------------------------------------
// A squad member
// ---------------------------------------------------------------------------
export class SquadMember extends Character {
  constructor(scene, room, physics, id, spawn, game) {
    const def = SQUAD[id];
    super(scene, room, physics, { id, name: def.name, color: def.color, body: def.model ? def.modelBody : def.body, banks: def.banks, spawn, voicePitch: def.voicePitch, koMul: def.koMul || 1, chatterEvery: 20 + Math.random() * 10, enterDelay: Math.random() * 1.5 });
    this.def = def;
    this.game = game;
    this.title = def.title;
    this.failLine = def.fail;
    if (def.model) {          // their real 3D model, skinned onto the ragdoll at load time
      this.rag.loadModel(def.model).catch((e) => {
        console.warn(def.name + ' model failed, using stylised body', e);
        this.rag.setMesh(buildBody(this.rag, def.look), new THREE.MeshLambertMaterial({ vertexColors: true }));
      });
    } else this.rag.setMesh(buildBody(this.rag, def.look), new THREE.MeshLambertMaterial({ vertexColors: true }));
    if (def.look.prop) { this.prop = makeProp(def.look.prop, this.rag.height / 1.68); scene.add(this.prop); }
    this.ready = true;
  }

  dispose() {
    this.rag.dispose();
    for (const o of [this.fx, this.bubble, this.prop, this.heldItem, ...this.stars]) if (o) this.scene.remove(o);
    if (this.extra) this.extra.forEach(o => this.scene.remove(o));
    if (this.clingJoint) { this.physics.world.removeConstraint(this.clingJoint); this.clingJoint = null; }
  }

  // ---- personality idles ----
  // sitting on a chair (Date Night): thighs forward, forearms on the table
  sitPose() {
    const r = this.rag;
    r.aim('uLegL', 0.05, -0.1, 1); r.aim('lLegL', 0, -1, 0.06);
    r.aim('uLegR', -0.05, -0.1, 1); r.aim('lLegR', 0, -1, 0.06);
    r.aim('uArmL', 0.22, -0.8, 0.5); r.aim('lArmL', -0.25, -0.05, 1);
    r.aim('uArmR', -0.22, -0.8, 0.5); r.aim('lArmR', 0.25, -0.05, 1);
    r.bob = 0.5 - this.rag.parts.uLegL.def.a.y;
  }
  dancePose(t) {     // Chloe's strange little victory dance
    const r = this.rag, s = Math.sin(t * 7), c2 = Math.cos(t * 7);
    r.aim('uArmL', 0.6, 0.8 * s, 0.3); r.aim('lArmL', 0.3, 1, 0.2 * c2);
    r.aim('uArmR', -0.6, -0.8 * s, 0.3); r.aim('lArmR', -0.3, 1, -0.2 * c2);
    r.aim('uLegL', 0.1, -1, 0.3 * s); r.aim('uLegR', -0.1, -1, -0.3 * s);
    r.pose.chest.setFromAxisAngle(_v.set(0, 0, 1), s * 0.18);
    r.yaw += 0.04;
    r.bob = Math.abs(s) * 0.04;
  }

  personalityPose(t) {
    const r = this.rag;
    if (this.seated) { this.sitPose(); return; }
    if (this.dancing) { this.dancePose(t); return; }
    switch (this.id) {
      case 'lewis':   // double-bicep flex every so often
        if ((t % 16) > 14) { r.aim('uArmL', 1, 0.15, 0); r.aim('lArmL', 0.1, 1, 0.1); r.aim('uArmR', -1, 0.15, 0); r.aim('lArmR', -0.1, 1, 0.1); }   // a quick double-bicep flex now and then
        break;
      case 'oliver':  // always filming
        r.aim('uArmR', -0.3, -0.4, 1); r.aim('lArmR', -0.1, 0.35, 1);
        break;
      case 'connor':
      case 'aidan':   // pint at the ready
        r.aim('uArmR', -0.15, -1, 0.3); r.aim('lArmR', -0.05, 0.1, 1);
        break;
      case 'harry':   // swiping on the dating app
        r.aim('uArmR', -0.2, -1, 0.3); r.aim('lArmR', -0.1, 0.2, 1);
        r.aim('uArmL', 0.25, -1, 0.35 + Math.sin(t * 4) * 0.15); r.aim('lArmL', -0.2, 0.25, 1);
        break;
      case 'chloe':   // arms crossed: disappointed
        r.aim('uArmL', 0.2, -1, 0.35); r.aim('lArmL', -1, 0.15, 0.3); r.aim('uArmR', -0.2, -1, 0.35); r.aim('lArmR', 1, 0.2, 0.3);
        break;
      case 'dylan':   // can't keep still
        r.pose.chest.setFromAxisAngle(_v.set(0, 1, 0), Math.sin(t * 6) * 0.15);
        break;
      case 'noah':    // rugby stance
        r.aim('uLegL', 0.2, -1, 0.05); r.aim('uLegR', -0.2, -1, 0.05); r.aim('uArmL', 0.3, -1, 0.2); r.aim('uArmR', -0.3, -1, 0.2);
        break;
    }
  }

  afterUpdate(dt, ctx) {
    if (this.prop) {
      const hand = this.rag.tip(this.id === 'lewis' ? 'lArmL' : 'lArmR', _v);
      this.prop.visible = this.state !== 'act' || (this.id !== 'aidan' && this.id !== 'connor') || !this.pintGiven;
      this.prop.position.copy(hand);
      if (this.def.look.prop === 'phone') {      // screen faces Ronnie
        this.prop.lookAt(ctx.head); this.prop.rotateY(Math.PI);
        if (this.id === 'oliver') this.prop.position.y += 0.05;
      } else this.prop.quaternion.identity();     // pint / jug stay upright
    }
    this.actAfter && this.actAfter(dt, ctx);
  }

  // ---------------------------------------------------------------------------
  // Interventions — each one fails, by design.
  // ---------------------------------------------------------------------------
  intervene() {
    if (this.down || this.state === 'act') return false;
    this.state = 'act'; this.stateT = 0; this.phase = 0;
    this.say('intervene', 4);
    this.actStart && this.actStart();
    ({
      chloe: () => { this.salads = 3; },
      lewis: () => { this.goToStation(); },
      harry: () => { this.passes = 3; },
      aidan: () => { this.goToStation(); this.pintGiven = false; },
      noah: () => {},
      oliver: () => { this.filming = 20; this.followers = 1000; },
      dylan: () => { this.hideInBin(); },
      connor: () => { this.goToStation(); this.pintGiven = false; },
      ethan: () => { this.passes = 3; },
    })[this.id]();
    return true;
  }

  cancelAction() {
    if (this.clingJoint) this.letGo(false);
    this.filming = 0;
    if (this.followerSprite) this.followerSprite.visible = false;
  }

  goToStation() {
    const st = this.room.spawns[0];
    this.stationX = st.x + 0.55; this.stationZ = st.z - 0.1;
  }

  actUpdate(dt, ctx) {
    const r = this.rag, g = this.game;
    this.setIdlePose(this.t);
    const done = () => { this.state = 'idle'; this.stateT = 0; this.nextMove = 3; this.onEvent && this.onEvent('acted', this); };
    switch (this.id) {
      case 'chloe':     // salad ambush, then names the next food you eat
        this.turnTo(Math.atan2(ctx.head.x - this.pos.x, ctx.head.z - this.pos.z), dt, 5);
        if (this.stateT > 1.2 && this.salads > 0) { this.salads--; this.stateT = 0.2; this.throwNow(ctx, { item: this.salads % 2 ? 'sprout' : 'broccoli', speed: 3.2, spread: 0.1 }); }
        if (this.salads <= 0 && this.stateT > 1.2) { g.nameNextFood(this); this.say('name', 4); done(); }
        break;
      case 'lewis':     // walks to the snack station and swaps the cans for protein shakes
      case 'connor':    // ...or buys a round of stout
      case 'aidan': {   // ...or puts a pint down to settle
        _v2.set(this.stationX - this.pos.x, 0, this.stationZ - this.pos.z);
        const d = _v2.length();
        if (this.phase === 0) {
          if (d > 0.2 && this.stateT < 6) { this.turnTo(Math.atan2(_v2.x, _v2.z), dt, 6); r.moveVel.copy(_v2.normalize()).multiplyScalar(0.8); this.walkPose(dt, 0.8); }
          else { this.phase = 1; this.stateT = 0; }
        } else if (this.phase === 1) {
          this.turnTo(Math.atan2(this.room.spawns[0].x - this.pos.x, this.room.spawns[0].z - this.pos.z), dt, 6);
          r.aim('uArmR', -0.2, -0.3, 1); r.aim('lArmR', 0, -0.4, 1);
          if (this.stateT > 0.7) {
            if (this.id === 'lewis') { g.placeOnStation('shake', this); g.placeOnStation('shake', this); this.say('Shakes on the table, bro. Gains only.', 4); }
            else if (this.id === 'connor') { this.pintGiven = true; g.placeOnStation('pint', this); g.placeOnStation('pint', this); this.say('settle', 4); }
            else { this.pintGiven = true; g.placeOnStation('pint', this); this.say('settle', 4); }
            this.phase = 2; this.stateT = 0;
          }
        } else {
          if (this.id === 'lewis') { r.aim('uArmL', 1, 0.15, 0); r.aim('lArmL', 0.1, 1, 0.1); r.aim('uArmR', -1, 0.15, 0); r.aim('lArmR', -0.1, 1, 0.1); }
          if (this.stateT > 2) { this.pintGiven = false; done(); }
        }
        break;
      }
      case 'ethan':     // Galáctico free kicks: curling veg at Ronnie's face
        this.turnTo(Math.atan2(ctx.head.x - this.pos.x, ctx.head.z - this.pos.z), dt, 5);
        if (this.stateT > 1.4 && this.passes > 0) { this.passes--; this.stateT = 0.2; this.throwNow(ctx, { item: ['broccoli', 'sprout', 'carrot'][this.passes % 3], speed: 4.2, spread: 0.12 }); }
        if (this.passes <= 0 && this.stateT > 1.4) done();
        break;
      case 'harry':     // "throws it away" — straight at Ronnie's mouth
        this.turnTo(Math.atan2(ctx.head.x - this.pos.x, ctx.head.z - this.pos.z), dt, 5);
        if (this.stateT > 1.6 && this.passes > 0) { this.passes--; this.stateT = 0.3; this.throwNow(ctx, { item: ['doughnut', 'burger', 'pizza'][this.passes % 3], speed: 3.2, food: true }); }
        if (this.passes <= 0 && this.stateT > 1.6) done();
        break;
      case 'noah': {    // the tackle
        _v2.set(ctx.head.x - this.pos.x, 0, ctx.head.z - this.pos.z);
        const d = _v2.length();
        this.turnTo(Math.atan2(_v2.x, _v2.z), dt, 8);
        if (this.stateT < 0.8) { r.aim('uArmL', 0.3, -0.3, 1); r.aim('uArmR', -0.3, -0.3, 1); r.pose.chest.setFromAxisAngle(_v.set(1, 0, 0), 0.5); break; }   // crouch, bind...
        r.moveVel.copy(_v2.normalize()).multiplyScalar(3.0);
        this.walkPose(dt, 3.0);
        r.pose.chest.setFromAxisAngle(_v.set(1, 0, 0), 0.45);
        if (d < 0.55) {
          g.tackled(this);
          this.knockOut('bounced');
          this.rag.shove(-_v2.x * 3.5, 2.2, -_v2.z * 3.5);
          this.onEvent && this.onEvent('acted', this);
        } else if (this.stateT > 5) done();
        break;
      }
      case 'oliver':    // shame cam: films, follower count goes up with every bite
        this.turnTo(Math.atan2(ctx.head.x - this.pos.x, ctx.head.z - this.pos.z), dt, 4);
        r.aim('uArmR', -0.2, 0.2, 1); r.aim('lArmR', -0.1, 0.6, 1);
        this.filming -= dt;
        if (this.filming <= 0) { this.say(`${fmt(this.followers)} views. It's gone viral.`, 4); if (this.followerSprite) this.followerSprite.visible = false; done(); }
        break;
      case 'dylan':     // hidden in the bin... then LEAPS
        if (this.phase === 0) {
          r.aim('uLegL', 0, 0.2, 1); r.aim('uLegR', 0, 0.2, 1);
          if (this.stateT > 2.5) {
            this.phase = 1; this.stateT = 0;
            sfx('boing', this.pos, 1);
            this.say('RONNIEEEEEEE!', 5);
            const target = ctx.handPos ? ctx.handPos() : ctx.head;
            const vel = ballistic(this.pos.clone(), target, 4, this.room.bounds.y1);
            this.rag.setMode('ragdoll', 0.2);
            for (const p of this.rag.list) { p.body.velocity.set(vel.x, vel.y, vel.z); }
          }
        } else {
          this.flailPose(this.t);
          const near = ctx.attachPoint && ctx.attachPoint(this);
          if (near) { this.cling(near); }
          else if (this.stateT > 2) this.knockOut('hit');
        }
        break;
    }
  }

  actAfter(dt, ctx) {
    if (this.id === 'oliver') {
      if (!this.followerSprite) {
        this.fc = document.createElement('canvas'); this.fc.width = 512; this.fc.height = 128;
        this.ft = new THREE.CanvasTexture(this.fc); this.ft.colorSpace = THREE.SRGBColorSpace;
        this.followerSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.ft, transparent: true, depthTest: false }));
        this.followerSprite.scale.set(0.7, 0.175, 1); this.followerSprite.renderOrder = 11; this.followerSprite.visible = false;
        this.scene.add(this.followerSprite); this.extra = [this.followerSprite];
      }
      const on = this.filming > 0 && this.state === 'act';
      this.followerSprite.visible = on;
      if (on) {
        this.headPos(this.followerSprite.position).y += 0.42;
        if (this.drawnFollowers !== this.followers) {
          this.drawnFollowers = this.followers;
          const g = this.fc.getContext('2d');
          g.clearRect(0, 0, 512, 128); g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(0, 0, 512, 128);
          g.fillStyle = '#ff1744'; g.beginPath(); g.arc(50, 64, 20, 0, 7); g.fill();
          g.font = `900 34px ${FONT}`; g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText('LIVE · CLIKCLOK', 85, 40);
          g.fillStyle = '#00e5ff'; g.font = `900 46px ${FONT}`; g.fillText(`${fmt(this.followers)} followers`, 85, 92);
          this.ft.needsUpdate = true;
        }
      }
    }
  }

  // events from the game while acting
  onRonnieAte() {
    if (this.id === 'oliver' && this.filming > 0 && this.state === 'act') {
      this.followers = Math.round(this.followers * (1.25 + Math.random() * 0.2) + 20000 + Math.random() * 60000);
      if (Math.random() < 0.5) this.say('viral', 3);
    }
  }

  // quick throw without the long wind-up (used inside interventions)
  throwNow(ctx, spec) { this.throwSpec = spec; this.release(ctx); this.state = 'act'; }

  hideInBin() {
    const b = this.room.blockers.find(b => b.y1 && b.y1 < 0.5 && b.x1 - b.x0 < 0.5) || { x0: -0.25, x1: 0.15, z0: -2.25, z1: -1.8 };
    const x = (b.x0 + b.x1) / 2, z = Math.max(b.z0, b.z1) + 0.25;
    this.rag.placeAt(x, z, 0);
  }

  // Dylan hangs off Ronnie's hand until shaken off
  cling(anchor) {
    const part = this.rag.parts.lArmR, b = part.body;
    this.clingJoint = new CANNON.PointToPointConstraint(anchor.body, new CANNON.Vec3(0, 0, 0), b, new CANNON.Vec3((this.rag.parts.lArmR.def.b.x - this.rag.parts.lArmR.def.center.x), 0, 0), 2500);
    this.physics.world.addConstraint(this.clingJoint);
    this.clingAnchor = anchor;
    this.shake = 0;
    this.state = 'clinging'; this.stateT = 0;
    this.say('cling', 5);
    this.game.clinging(this, true);
  }
  clingUpdate(dt, ctx) {
    const a = this.clingAnchor;
    if (a && a.speed > 2.4) this.shake += dt * (a.speed - 2);
    if (this.shake > 0.7) { this.letGo(true); return; }
    if (this.stateT > 9) this.letGo(false);
  }
  letGo(flung) {
    if (this.clingJoint) { this.physics.world.removeConstraint(this.clingJoint); this.clingJoint = null; }
    this.game.clinging(this, false);
    if (flung) { this.rag.shove(0, 2, 0); this.knockOut('shaken'); this.onEvent && this.onEvent('acted', this); }
    else { this.state = 'ko'; this.stateT = 1.5; this.rag.setMode('ragdoll', 0); this.onEvent && this.onEvent('acted', this); }
  }
}

function fmt(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n); }
