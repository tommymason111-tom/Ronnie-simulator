// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is eating your way to Absolute Unit while Tommy roasts you fun in VR?
// Date: 2026-11-16
// Game data for Ronnie Simulator (WebXR prototype).
// Numbers and lines come from "Ronnie simulator prompt.md" (sections 3, 9, 18, 21).
// Real club names are swapped for the prompt's parody names, since this build can go public.

// 18.1 growth stages (first 8 — the bedroom level ends at Absolute Unit).
export const STAGES = [
  { name: 'Little Ronnie',   chonk: 0,    scale: 1.00, chins: 1, speed: 1.00 },
  { name: 'Snacky Ronnie',   chonk: 100,  scale: 1.05, chins: 2, speed: 0.97 },
  { name: 'Chunky Ronnie',   chonk: 250,  scale: 1.10, chins: 2, speed: 0.94 },
  { name: 'Big Ronnie',      chonk: 450,  scale: 1.18, chins: 3, speed: 0.90 },
  { name: 'Very Big Ronnie', chonk: 700,  scale: 1.28, chins: 4, speed: 0.86 },
  { name: 'Ronnie XL',       chonk: 1000, scale: 1.40, chins: 5, speed: 0.82 },
  { name: 'Ronnie XXL',      chonk: 1400, scale: 1.60, chins: 6, speed: 0.78 },
  { name: 'Absolute Unit',   chonk: 1900, scale: 1.90, chins: 8, speed: 0.74 },
];

// 18.2 combo table.
// Combo window, MONSTOR timings and level length are tuning values in config.js.
export const COMBOS = [
  { hits: 20, mult: 10, shout: 'ABSOLUTE UNIT!!!', bank: 'combo10' },
  { hits: 10, mult: 5,  shout: 'BUFFET BREAKER!',  bank: 'combo5' },
  { hits: 6,  mult: 3,  shout: 'HAT-TRICK OF HUNGER!', bank: 'combo3' },
  { hits: 3,  mult: 2,  shout: 'DOUBLE DIP!',      bank: 'combo2' },
];

// Section 9 food (a bedroom-sized subset). kind = which mesh builder to use.
export const FOODS = [
  { id: 'crisps',   name: 'Crisps',          chonk: 5,   kind: 'crisps',  weight: 3,    r: 0.09, kcal: 130 },
  { id: 'choc',     name: 'Chocolate bar',   chonk: 8,   kind: 'choc',    weight: 3,    r: 0.08, kcal: 250 },
  { id: 'doughnut', name: 'Doughnut',        chonk: 10,  kind: 'doughnut',weight: 3,    r: 0.07, kcal: 300 },
  { id: 'pizza',    name: 'Pizza slice',     chonk: 12,  kind: 'pizza',   weight: 3,    r: 0.10, kcal: 285 },
  { id: 'burger',   name: 'Burger',          chonk: 15,  kind: 'burger',  weight: 2,    r: 0.08, kcal: 550 },
  { id: 'nuggets',  name: 'Nugget bucket',   chonk: 20,  kind: 'nuggets', weight: 2,    r: 0.09, kcal: 900 },
  { id: 'kebab',    name: 'Kebab',           chonk: 25,  kind: 'kebab',   weight: 1.5,  r: 0.10, kcal: 1100 },
  { id: 'can',      name: 'MONSTOR can',     chonk: 15,  kind: 'can',     weight: 3,    r: 0.06, kcal: 230, monstor: true },
  { id: 'cake',     name: 'Entire cake',     chonk: 60,  kind: 'cake',    weight: 0.6,  r: 0.14, kcal: 3500 },
  { id: 'golden',   name: 'GOLDEN BURGER',   chonk: 200, kind: 'golden',  weight: 0.08, r: 0.09, kcal: 9999 },
];

export const EXCUSES = [
  "IT'S JUST WATER WEIGHT",
  "I'M BIG BONED",
  "THE CAMERA ADDS TEN STONE",
  "THAT DIDN'T COUNT, IT WAS A SNACK",
  "I'M YOUNGER, I'M STILL GROWING",
  "IT'S A BULK",
  "THESE ARE MUSCLES, TOMMY",
];

// Tommy's line banks (section 3). Priority: higher interrupts lower.
export const LINES = {
  greet: [
    "Morning, little brother. Oh wait, you're the YOUNGER one.",
    "Morning, Ronnie. Or should I say... morning, Ronnies? There's more of you every day.",
    "Alright, big man. And I do mean BIG.",
    "Right, I've done my 500 sit-ups. What have you done? Oh. Breakfast. Twice.",
    "Hello, Ronnie. I came as soon as I felt the earthquake.",
  ],
  age: [
    "Respect your elders, Ronnie. I've been alive a WHOLE day longer than you.",
    "When I was your age — so, yesterday — I had a six-pack. Oh wait, I still do.",
    "I've got 24 hours more wisdom than you, and all 24 of them are telling me to hide the biscuits.",
    "Born one day apart, and look at us. Nature did me a favour, and did you... a portion.",
    "I was born first, so technically I'm your role model. Look at me. Now look at you. Now back at me.",
    "You're the youngest, Ron. You'll understand when you're older. Like tomorrow.",
  ],
  roast: [
    "Mate... you're getting PRETTY large.",
    "Is that a new chin, or are you just pleased to see me?",
    "Careful, Ron, you've got your own weather system. It's drizzling on your left side.",
    "I'd give you a hug, but my arms don't go that far. Nobody's do.",
    "Ronnie, you're blocking my sun. I need it for my abs.",
    "You don't need a seatbelt, Ron, you need a ring road.",
    "I tried to take a picture of you, but my phone asked if I wanted panorama mode.",
    "Your shadow just asked for its own room.",
    "Kings Road FC want you as their new stadium.",
    "Your shirt says 10, but your size says the whole team.",
    "I say all this because I care, Ronnie. Mainly about the furniture.",
    "You know I love you, mate. There's just a lot more of you to love now.",
  ],
  idle: [
    "Ron? Are you buffering? Or digesting?",
    "You've gone quiet. Is it a food coma? Blink twice.",
    "I'll just do some sit-ups while you decide which cake to eat.",
  ],
  eat: [
    "Did you even chew that? Did you even SEE that?",
    "Ron, the fridge just filed a restraining order.",
    "Slow down, mate, you're making the food nervous.",
    "That noise. That noise you just made. I'll hear that in my dreams.",
    "That kebab didn't stand a chance. It had a family.",
    "That was a family bucket, Ron. Where's the family?",
  ],
  drink: [
    "Another MONSTOR? Your blood type is now 'Green Apple'.",
    "You drink so many of those, your burps are sponsored.",
  ],
  unleash: [
    "Oh no. He's unleashed the MONSTOR. Hide the furniture!",
    "Five cans, Ron? FIVE? You're not a man, you're a hoover.",
  ],
  combo2: ["Ooh, double dipping."],
  combo3: ["Hat-trick! Kings Road would be proud. Well, someone would."],
  combo5: ["FIVE in a row? Ron, you're a buffet's worst nightmare."],
  combo10: ["I've seen black holes with more self-control."],
  stage: [
    null,
    "Ooh, that's a little bulge, Ron. Cute. Like a baby. A younger baby than me.",
    "Did your shirt just make a noise? I think it's crying.",
    "Ronnie... I'm not saying you're big, but your chins have started a group chat.",
    "That's FIVE now, Ron. I'm calling your mum.",
    "Where's your neck gone? Has anyone seen Ronnie's neck? Reward offered.",
    "Ron, you've just taken the ROOF off. I'm telling your landlord.",
    "Absolute unit. I'm putting that on your birthday cake. Tomorrow. After mine.",
  ],
  hit: [
    "Ow! I'm just trying to help!",
    "Ron! I'm just trying to HELP you!",
    "That's assault on an older man, Ronnie. I'm a whole day older!",
    "I'm on YOUR side, mate! I'm the only one who's honest with you!",
    "Ow, my abs! You could have hit anything but the abs!",
    "Fine, fine! I'll stop helping! ... You're still massive, by the way.",
    "I came here out of LOVE, Ronnie!",
    "Okay, that one was fair. But you're still huge.",
    "I'm not angry. I'm just disappointed. And slightly flattened.",
  ],
  belly: ["Like being hit by a bouncy castle full of kebabs!"],
  hitMany: ["You know what, Ron? I'm still not lying. You're still fat."],
  burp: [
    "My hair! My HAIR, Ronnie!",
    "That just set off car alarms in another county.",
    "I think that burp had a burp.",
    "Was that a burp or did a lorry just reverse?",
  ],
  excuse: [
    "Water weight? Ron, you'd need to have drunk a lake. Oh. You did.",
    "Big boned? Mate, the bones are fine. It's everything around them.",
    "There's no camera, Ron. This is just you.",
    "A snack is a crisp. That was a buffet.",
    "Still growing? Outwards, yeah.",
    "A bulk is when there's a cut afterwards, Ron. There's never a cut.",
    "Muscles? Which ones? Point to one. Go on.",
  ],
  end: [
    "Well done, Ron. You ate the level. The WHOLE level.",
    "Another place we can never go back to.",
    "I'll tell your mum you were good. I'll lie.",
  ],
};

// Environmental joke signs for the bedroom (section 21.1).
export const SIGN_TEXT = {
  wanted: ['WANTED', 'RONNIE', 'LAST SEEN EATING'],
  beMoreTommy: ['BE MORE', 'TOMMY', '(shirtless, obviously)'],
  calendar: ['NOVEMBER', 'CHEAT DAY x30', "TOMMY'S BIRTHDAY", '(THE BETTER ONE)'],
  clock: ["SNACK", "O'CLOCK"],
  window: ['RONNIE', 'EXCLUSION ZONE', '50M'],
  bed: ['RONNIE CRATER', 'DO NOT FALL IN'],
  chair: ['MAX LOAD:', 'NOT YOU'],
  fridge: ['1. MONSTOR', '2. MONSTOR', '3. Food for MONSTOR'],
  padlock: ['nice try', "(it's open)"],
  bin: ['THIS BIN IS FULL.', 'SO IS RONNIE.'],
  monitor: ["TOMMY'S ABS", 'wallpaper'],
  switch: ['ON / OFF / SNACK'],
  mirrorNote: ['Objects in mirror', 'are larger than', 'they appear'],
  doormat: ['WIPE YOUR CHINS'],
  scales: ['R.I.P.'],
  scarf: ['KINGS ROAD FC — it only fits like this now'],
  trophy: ["WORLD'S OKAYEST EATER", 'MOST CHINS 2026'],
  books: ['War and Pies', '50 Shades of Gravy', 'Lord of the Onion Rings', 'The Very Hungry Ronnie', 'How to Lose Weight (sealed)'],
  wardrobe: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'PARACHUTE'],
  door: ['PUSH', 'PUSH HARDER', 'SQUEEZE', 'SQUEEZE', 'GIVE UP', 'GIVE UP', 'NOT A CHANCE', 'USE THE WALL'],
};
