// RONNIE SIMULATOR — Phase 1 tuning.
// Names, rig scales and food Chonk values come from the design doc
// (sections 18.1, 18.3 and 19). The Chonk thresholds are scaled down for
// Phase 1 so you can reach Ronnie XL in a few minutes of eating —
// change CHONK_THRESHOLDS to the doc's 0/100/250/450/700/1000 for the full grind.

export const STAGES = [
  { name: 'Little Ronnie',   chonk: 0,   scale: 1.00, belly: 1.00 },
  { name: 'Snacky Ronnie',   chonk: 40,  scale: 1.05, belly: 1.25 },
  { name: 'Chunky Ronnie',   chonk: 100, scale: 1.10, belly: 1.55 },
  { name: 'Big Ronnie',      chonk: 180, scale: 1.18, belly: 1.90 },
  { name: 'Very Big Ronnie', chonk: 280, scale: 1.28, belly: 2.30 },
  { name: 'Ronnie XL',       chonk: 400, scale: 1.40, belly: 2.80 },
];

export const FOODS = {
  burger:   { label: 'Burger',      chonk: 15, bites: 3, radius: 0.06, mass: 0.5 },
  pizza:    { label: 'Pizza slice', chonk: 12, bites: 2, radius: 0.07, mass: 0.3 },
  doughnut: { label: 'Doughnut',    chonk: 10, bites: 2, radius: 0.055, mass: 0.2 },
  can:      { label: 'MONSTOR Mango Loco', chonk: 20, bites: 1, radius: 0.04, mass: 0.5, drink: true },
  broccoli: { label: 'Broccoli',    chonk: -15, bites: 1, radius: 0.05, mass: 0.2, veg: true },
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
  moveSpeed: 1.6,          // smooth locomotion m/s
};

// Room: 5m x 4.5m, ceiling 2.6m (section 39.1). Origin at room centre on the floor.
export const ROOM = { w: 5, d: 4.5, h: 2.6 };
