// Tommy's line banks (from section 3 of the design doc, plus Phase 1 broccoli lines).
// Priority: higher interrupts lower. Lines never repeat within the last 8 played.

export const BANKS = {
  greet: { pri: 3, lines: [
    'Morning, little brother. Oh wait, you\'re the YOUNGER one.',
    'Alright, big man. And I do mean BIG.',
    'Ah, the youngest has arrived. Did you have a nice extra day in the womb?',
    'Hello, Ronnie. I came as soon as I felt the earthquake.',
  ] },
  chatter: { pri: 1, lines: [
    'Respect your elders, Ronnie. I\'ve been alive a WHOLE day longer than you.',
    'When I was your age — so, yesterday — I had a six-pack. Oh wait, I still do.',
    'I\'ve got 24 hours more wisdom than you, and all 24 of them are telling me to hide the biscuits.',
    'You\'re the youngest, Ron. You\'ll understand when you\'re older. Like tomorrow.',
    'Mate... you\'re getting PRETTY large.',
    'Is that a new chin, or are you just pleased to see me?',
    'Ronnie, you\'re blocking my sun. I need it for my abs.',
    'I tried to take a picture of you, but my phone asked if I wanted panorama mode.',
    'Your shadow just asked for its own room.',
    'I say all this because I care, Ronnie. Mainly about the furniture.',
    'You know I love you, mate. There\'s just a lot more of you to love now.',
    'Your shirt says 10, but your size says the whole team.',
    'Why have you got 400 empty cans and one sock?',
    'Your bed\'s got a Ronnie-shaped crater. NASA want to study it.',
  ] },
  idle: { pri: 1, lines: [
    'Ron? Are you buffering? Or digesting?',
    'You\'ve gone quiet. Is it a food coma? Blink twice.',
    'I\'ll just do some sit-ups while you decide which snack to eat.',
  ] },
  eat: { pri: 2, lines: [
    'Did you even chew that? Did you even SEE that?',
    'Slow down, mate, you\'re making the food nervous.',
    'That noise. That noise you just made. I\'ll hear that in my dreams.',
    'Ron, the fridge just filed a restraining order.',
    'That burger didn\'t stand a chance. It had a family.',
    'Was that a bite or did a bin lorry just reverse?',
  ] },
  drink: { pri: 3, lines: [
    'That\'s his favourite. You can tell because he\'s crying.',
    'Another MONSTOR? Your blood type is now "Mango".',
    'You drink so many of those, your burps are sponsored.',
    'LOCO MODE? Ron, you were already loco.',
  ] },
  hit: { pri: 4, lines: [
    'Ow! I\'m just trying to help!',
    'Ron! I\'m just trying to HELP you!',
    'That\'s assault on an older man, Ronnie. I\'m a whole day older!',
    'Ow, my abs! You could have hit anything but the abs!',
    'Did you just throw food at me? You never throw food. Something\'s wrong.',
    'You\'ve knocked my hair out of place. This is a crime.',
    'I\'m not angry. I\'m just disappointed. And slightly sticky.',
    'Okay, that one was fair. But you\'re still huge.',
  ] },
  vegHit: { pri: 4, lines: [
    'Return to sender? RUDE. That broccoli loved you.',
    'Ow! Hit by my own broccoli! The irony is delicious. Unlike the broccoli, apparently.',
    'I\'m just trying to get ONE vegetable inside you!',
  ] },
  vegThrow: { pri: 3, lines: [
    'Have some broccoli, Ron! I\'m just trying to help!',
    'Incoming vitamins! Open wide!',
    'Here comes the aeroplane! It\'s a broccoli aeroplane!',
    'One floret, Ron. For me. For your elder.',
    'Catch! It\'s green, it\'s good for you, you\'ve never seen one!',
  ] },
  vegSwat: { pri: 3, lines: [
    'You SWATTED it? That was organic!',
    'He moves fast for a big lad when there\'s a vegetable involved.',
    'Fastest you\'ve moved all year, that.',
    'Fine. The broccoli and I will remember this.',
  ] },
  vegEaten: { pri: 4, lines: [
    'We had him. We HAD him!',
    'A vegetable! Inside Ronnie! Somebody call the news!',
    'Look at his face. Like a cat that\'s been told about Mondays.',
    'That\'s one of your five a day. You\'ve only got four hundred to go.',
  ] },
};

export const STAGE_LINES = {
  2: 'Ooh, that\'s a little bulge, Ron. Cute. Like a baby. A younger baby than me.',
  3: 'Did your shirt just make a noise? I think it\'s crying.',
  4: 'Ronnie... I\'m not saying you\'re big, but your chins have started a group chat.',
  5: 'That\'s FIVE now, Ron. I\'m calling your mum.',
  6: 'Where\'s your neck gone? Has anyone seen Ronnie\'s neck? Reward offered.',
};

export class Dialogue {
  constructor() { this.recent = []; }
  pick(bank) {
    const lines = BANKS[bank].lines;
    const fresh = lines.filter(l => !this.recent.includes(l));
    const pool = fresh.length ? fresh : lines;
    const line = pool[Math.floor(Math.random() * pool.length)];
    this.recent.push(line);
    if (this.recent.length > 8) this.recent.shift();
    return line;
  }
}
