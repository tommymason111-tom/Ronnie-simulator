// RONNIE SIMULATOR — Phase 1 tuning.
// Names, rig scales and food Chonk values come from the design doc
// (sections 18.1, 18.3 and 19). The Chonk thresholds are scaled down for
// Phase 1 so you can reach Ronnie XL in a few minutes of eating —
// change CHONK_THRESHOLDS to the doc's 0/100/250/450/700/1000 for the full grind.

export const STAGES = [            // ten stages: the top one takes the food the old sixth stage did, and is MUCH bigger
  { name: 'Little Ronnie',    chonk: 0,   scale: 1.00, belly: 1.00 },
  { name: 'Snacky Ronnie',    chonk: 25,  scale: 1.06, belly: 1.20 },
  { name: 'Chunky Ronnie',    chonk: 55,  scale: 1.12, belly: 1.45 },
  { name: 'Big Ronnie',       chonk: 90,  scale: 1.19, belly: 1.70 },
  { name: 'Very Big Ronnie',  chonk: 130, scale: 1.27, belly: 1.95 },
  { name: 'Huge Ronnie',      chonk: 175, scale: 1.35, belly: 2.20 },
  { name: 'Massive Ronnie',   chonk: 225, scale: 1.44, belly: 2.45 },
  { name: 'Colossal Ronnie',  chonk: 280, scale: 1.53, belly: 2.65 },
  { name: 'Mega Ronnie',      chonk: 340, scale: 1.63, belly: 2.85 },
  { name: 'Ronnie XXXL',      chonk: 400, scale: 1.75, belly: 3.00 },
];

export const FOODS = {
  burger:   { label: 'Burger',      chonk: 15, bites: 3, radius: 0.06, mass: 0.5 },
  pizza:    { label: 'Pizza slice', chonk: 12, bites: 2, radius: 0.07, mass: 0.3 },
  doughnut: { label: 'Doughnut',    chonk: 10, bites: 2, radius: 0.055, mass: 0.2 },
  can:      { label: 'MONSTOR Mango Loco', chonk: 20, bites: 1, radius: 0.04, mass: 0.5, drink: true },
  broccoli: { label: 'Broccoli',    chonk: -15, bites: 1, radius: 0.05, mass: 0.2, veg: true },
  carrot:   { label: 'Carrot',      chonk: -8,  bites: 1, radius: 0.045, mass: 0.15, veg: true },
  celery:   { label: 'Celery',      chonk: -10, bites: 1, radius: 0.05, mass: 0.1, veg: true },
  sprout:   { label: 'Brussels sprout', chonk: -5, bites: 1, radius: 0.03, mass: 0.05, veg: true },
  hotdog:   { label: 'Hot dog',     chonk: 14, bites: 3, radius: 0.06, mass: 0.3 },
  fries:    { label: 'Chips',       chonk: 12, bites: 3, radius: 0.05, mass: 0.2 },
  kebab:    { label: 'Doner kebab', chonk: 18, bites: 3, radius: 0.06, mass: 0.4 },
  chicken:  { label: 'Fried chicken', chonk: 13, bites: 2, radius: 0.05, mass: 0.2 },
  taco:     { label: 'Taco',        chonk: 11, bites: 2, radius: 0.06, mass: 0.2 },
  crisps:   { label: 'Crisps',      chonk: 8,  bites: 2, radius: 0.06, mass: 0.1 },
  choc:     { label: 'Chocolate bar', chonk: 9, bites: 2, radius: 0.06, mass: 0.1 },
  cookie:   { label: 'Cookie',      chonk: 6,  bites: 1, radius: 0.045, mass: 0.05 },
  icecream: { label: 'Ice cream',   chonk: 10, bites: 2, radius: 0.045, mass: 0.15 },
  sausageroll: { label: 'Sausage roll', chonk: 11, bites: 2, radius: 0.05, mass: 0.15 },
  nuggets:  { label: 'Chicken nuggets', chonk: 14, bites: 3, radius: 0.055, mass: 0.25 },
  pasty:    { label: 'Cornish pasty', chonk: 16, bites: 3, radius: 0.06, mass: 0.3 },
  onionrings: { label: 'Onion rings', chonk: 11, bites: 2, radius: 0.06, mass: 0.15 },
  burrito:  { label: 'Burrito', chonk: 17, bites: 3, radius: 0.06, mass: 0.35 },
  waffle:   { label: 'Waffle', chonk: 13, bites: 2, radius: 0.06, mass: 0.15 },
  pancakes: { label: 'Pancake stack', chonk: 15, bites: 3, radius: 0.055, mass: 0.25 },
  churros:  { label: 'Churros', chonk: 12, bites: 2, radius: 0.05, mass: 0.15 },
  cupcake:  { label: 'Cupcake', chonk: 10, bites: 2, radius: 0.04, mass: 0.1 },
  baconbap: { label: 'Bacon bap', chonk: 15, bites: 3, radius: 0.06, mass: 0.25 },
  apple:    { label: 'Apple',       chonk: -6, bites: 1, radius: 0.038, mass: 0.15, veg: true },
  pear:     { label: 'Pear',        chonk: -6, bites: 1, radius: 0.04, mass: 0.15, veg: true },
  orange:   { label: 'Orange',      chonk: -6, bites: 1, radius: 0.038, mass: 0.15, veg: true },
  banana:   { label: 'Banana',      chonk: -7, bites: 1, radius: 0.05, mass: 0.12, veg: true },
  tomato:   { label: 'Tomato',      chonk: -5, bites: 1, radius: 0.034, mass: 0.1, veg: true },
  cucumber: { label: 'Cucumber',    chonk: -8, bites: 1, radius: 0.05, mass: 0.2, veg: true },
  pepper:   { label: 'Pepper',      chonk: -6, bites: 1, radius: 0.04, mass: 0.12, veg: true },
  cauliflower: { label: 'Cauliflower', chonk: -12, bites: 1, radius: 0.045, mass: 0.2, veg: true },
  poop:     { label: 'Poop', chonk: 0, bites: 1, radius: 0.045, mass: 0.2, poop: true },
  beer:     { label: 'Bottle of lager', chonk: 15, bites: 1, radius: 0.035, mass: 0.4, drink: true, beer: true, booze: true },
  dart:     { label: 'Dart', chonk: 0, bites: 1, radius: 0.025, mass: 0.02, dart: true, prop: true },
  bat:      { label: 'Table tennis bat', chonk: 0, bites: 1, radius: 0.02, mass: 0.1, bat: true, prop: true },
  pint:     { label: 'GUINNESS STOUT', chonk: 20, bites: 1, radius: 0.045, mass: 0.6, drink: true, stout: true, booze: true },
  shake:    { label: 'Protein shake', chonk: 25, bites: 1, radius: 0.04, mass: 0.5, drink: true, shake: true },
  // the Lidl bakery
  croissant: { label: 'Croissant', chonk: 11, bites: 2, radius: 0.05, mass: 0.1, bake: true },
  baguette:  { label: 'Baguette', chonk: 16, bites: 4, radius: 0.06, mass: 0.25, bake: true },
  muffin:    { label: 'Chocolate muffin', chonk: 13, bites: 2, radius: 0.045, mass: 0.12, bake: true },
  painchoc:  { label: 'Pain au chocolat', chonk: 12, bites: 2, radius: 0.045, mass: 0.1, bake: true },
  swirl:     { label: 'Cinnamon swirl', chonk: 12, bites: 2, radius: 0.05, mass: 0.1, bake: true },
  icedbun:   { label: 'Iced finger bun', chonk: 12, bites: 2, radius: 0.045, mass: 0.12, bake: true },
  pretzel:   { label: 'Pretzel', chonk: 10, bites: 2, radius: 0.05, mass: 0.1, bake: true },
  // things to throw
  magazine:  { label: 'Magazine', chonk: 0, bites: 1, radius: 0.06, mass: 0.2, prop: true, mag: true },
  lidlbag:   { label: 'Lidl bag', chonk: 0, bites: 1, radius: 0.09, mass: 0.4, prop: true, bag: true },
  // the pub: bottles off the back bar, condiments and beer mats off the tables, the chairs themselves
  spirit:    { label: 'Bottle off the back bar', chonk: 18, bites: 1, radius: 0.04, mass: 0.8, drink: true, spirit: true },
  condiment: { label: 'Condiment', chonk: 0, bites: 1, radius: 0.035, mass: 0.3, prop: true, condiment: true },
  beermat:   { label: 'Beer mat', chonk: 0, bites: 1, radius: 0.03, mass: 0.01, prop: true, mat: true, flat: true },
  chair:     { label: 'Pub chair', chonk: 0, bites: 1, radius: 0.3, mass: 5.0, prop: true, chair: true, big: true },
  // behind the bar (Run the Pub): glasses and cups to fill, and what goes in them
  glass:     { label: 'Empty pint glass', chonk: 0, bites: 1, radius: 0.042, mass: 0.3, prop: true, vessel: 'glass' },
  mug:       { label: 'Empty mug', chonk: 0, bites: 1, radius: 0.04, mass: 0.3, prop: true, vessel: 'mug' },
  cup:       { label: 'Empty cup', chonk: 0, bites: 1, radius: 0.038, mass: 0.1, prop: true, vessel: 'cup' },
  cider:     { label: 'Bottle of cider', chonk: 14, bites: 1, radius: 0.035, mass: 0.4, drink: true, booze: true },
  wine:      { label: 'Glass of wine', chonk: 10, bites: 1, radius: 0.04, mass: 0.25, drink: true, booze: true },
  coffee:    { label: 'Coffee', chonk: 4, bites: 1, radius: 0.04, mass: 0.3, drink: true },
  soft:      { label: 'Soft drink', chonk: 8, bites: 1, radius: 0.038, mass: 0.3, drink: true },
  sodagun:   { label: 'Soft-drink gun', chonk: 0, bites: 1, radius: 0.04, mass: 0.4, prop: true, gun: true },
};

export const TUNING = {
  gravity: -9.81,
  biteCooldown: 0.45,      // seconds between bites
  mouthRadius: 0.11,       // metres (multiplied by Ronnie's scale)
  grabRadius: 0.13,        // metres (multiplied by Ronnie's scale)
  chugTime: 1.2,           // seconds of tilted can at mouth to finish it
  chugTiltDeg: 60,         // can must tilt more than this to chug
  locoDuration: 10,        // MANGO LOCO MODE seconds
  locoMultiplier: 3,       // x3 Chonk during LOCO MODE
  throwBoost: 1.35,        // thrown objects fly a bit further than real life
  swatSpeed: 1.6,          // hand speed (m/s) needed to swat veg
  gagTime: 2.0,            // green screen tint after veg gets in
  respawnDelay: 3.5,
  firstAttackDelay: 25,    // seconds before Tommy's first broccoli
  attackInterval: [16, 26],// seconds between broccoli attacks
  broccoliSpeed: 3.0,      // m/s horizontal — slow enough to react, fast enough to sting
  snapTurnDeg: 30,
  moveSpeed: 2.6,          // smooth locomotion m/s
};

// Room: 5m x 4.5m, ceiling 2.6m (section 39.1). Origin at room centre on the floor.
export const ROOM = { w: 5, d: 4.5, h: 2.6 };

// Everything healthy the squad can lob at Ronnie, and the junk food that lies around.
export const VEG_TYPES = ['broccoli', 'carrot', 'celery', 'sprout', 'apple', 'pear', 'orange', 'banana', 'tomato', 'cucumber', 'pepper', 'cauliflower'];
export const BAKERY_TYPES = ['croissant', 'baguette', 'muffin', 'painchoc', 'swirl', 'icedbun', 'pretzel', 'doughnut', 'cookie', 'sausageroll'];
export const JUNK_TYPES = ['burger', 'pizza', 'doughnut', 'hotdog', 'fries', 'kebab', 'chicken', 'taco', 'crisps', 'choc', 'cookie', 'icecream', 'sausageroll', 'nuggets', 'pasty', 'onionrings', 'burrito', 'waffle', 'pancakes', 'churros', 'cupcake', 'baconbap'];
// a thrower's favourite about a third of the time, otherwise anything healthy
export function pickVeg(fav) { return fav && Math.random() < 0.35 ? fav : VEG_TYPES[Math.floor(Math.random() * VEG_TYPES.length)]; }
export function pickJunk() { return JUNK_TYPES[Math.floor(Math.random() * JUNK_TYPES.length)]; }
