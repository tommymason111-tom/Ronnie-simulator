// SEARCH AND DESTROY: the kit. The guns (stats, their 3D models, their pictures for the pick screen), the pick-ups
// (ammo, food that heals, armour, the perks), the bomb (THE VINDALOO), the A and B site markers and where everything
// is on each of the three big maps. The game itself is in snd.js.
// Every model is the game's own coloured pieces merged into one mesh with vertex colours (the same material as the
// furniture), so nothing here needs a new shader and each thing is one draw.
import * as THREE from 'three';
import { part, merge, vcLambert, box, cyl, sph } from './geo.js';
import { itemParts } from './foods.js';

// ------------------------------------------------------------------ the guns
// dmg: a hit's damage (a shotgun's per pellet), rate: seconds between shots, mag/reserve: rounds, reload: seconds,
// spread: radians of wobble, range: metres (damage tails off past half of it), move: walking speed with it out,
// hs: headshot multiplier. Lower down the list = a bigger, sillier gun.
export const GUNS = [
  { id: 'ketchup', name: 'KETCHUP BLASTER', icon: '🍅', kind: 'PISTOL', col: '#e53935', tr: 0xff3030, dmg: 27, pellets: 1, rate: 0.24, auto: false, mag: 12, reserve: 48, reload: 1.1, spread: 0.012, range: 32, move: 1.08, hs: 2, sfx: 'sd_pistol', line: 'Squirty. Reliable. Gets everywhere.' },
  { id: 'beans', name: 'BAKED BEAN SHOTGUN', icon: '🫘', kind: 'SHOTGUN', col: '#ff7a1a', tr: 0xff8a2a, dmg: 12, pellets: 9, rate: 0.9, auto: false, mag: 6, reserve: 24, reload: 2.3, spread: 0.085, range: 14, move: 0.98, hs: 1.5, sfx: 'sd_shotgun', line: 'Nine beans a pop. In your face, literally.' },
  { id: 'sausage', name: 'SAUSAGE SNIPER', icon: '🌭', kind: 'SNIPER', col: '#b5651d', tr: 0xffe070, dmg: 92, pellets: 1, rate: 1.45, auto: false, mag: 4, reserve: 16, reload: 2.7, spread: 0.06, scoped: 0.0015, range: 75, move: 0.88, hs: 2, scope: true, sfx: 'sd_sniper', line: 'One banger, one kill. Scope it in.' },
  { id: 'cheese', name: 'SQUIRTY CHEESE SMG', icon: '🧀', kind: 'SMG', col: '#ffc107', tr: 0xffd84a, dmg: 15, pellets: 1, rate: 0.075, auto: true, mag: 32, reserve: 96, reload: 1.7, spread: 0.034, range: 24, move: 1.12, hs: 1.8, sfx: 'sd_smg', line: 'Sprays processed cheese at 800 rounds a minute.' },
  { id: 'monstor', name: 'MONSTOR AR', icon: '🥫', kind: 'RIFLE', col: '#7cff3a', tr: 0x9cff6a, dmg: 24, pellets: 1, rate: 0.115, auto: true, mag: 25, reserve: 75, reload: 2.1, spread: 0.017, range: 42, move: 1.0, hs: 2, sfx: 'sd_rifle', line: 'Loaded with Mango Loco. Does everything well.' },
  { id: 'gravy', name: 'GRAVY GATLING', icon: '🍗', kind: 'LMG', col: '#8d5a32', tr: 0xc88040, dmg: 17, pellets: 1, rate: 0.068, auto: true, mag: 70, reserve: 140, reload: 3.6, spread: 0.05, range: 30, move: 0.82, hs: 1.6, spin: 0.35, sfx: 'sd_lmg', line: 'Sunday dinner at 900 rounds a minute. Heavy.' },
];
// (no prototype: a name off the network like 'constructor' is never mistaken for a gun)
export const GUN = Object.assign(Object.create(null), Object.fromEntries(GUNS.map((g, i) => [g.id, { ...g, i }])));
// how a gun rates on the pick screen (0..1 bars)
export function gunBars(g) {
  const dps = g.dmg * g.pellets / g.rate;
  return [['DAMAGE', Math.min(1, g.dmg * g.pellets / 100)], ['FIRE RATE', Math.min(1, 0.07 / g.rate * 1.05)], ['RANGE', Math.min(1, g.range / 75)], ['MAGAZINE', Math.min(1, g.mag / 70)], ['RELOAD', Math.max(0.08, 1 - (g.reload - 1) / 3)], ['DPS', Math.min(1, dps / 260)]];
}

// ------------------------------------------------------------------ the pick-ups
// heal: health back (food: eating heals), ar: armour, perk: a timed (t seconds) or whole-round (t: 0) boost
export const PICKS = Object.assign(Object.create(null), {
  ammo:    { name: 'AMMO BOX', icon: '📦', col: 0xffd400, hex: '#ffd400', line: 'Full reserve', respawn: 30 },
  burger:  { name: 'BURGER', icon: '🍔', col: 0x39ff14, hex: '#39ff14', heal: 35, line: '+35 ❤ (eating heals)', respawn: 30 },
  kebab:   { name: 'DONER KEBAB', icon: '🥙', col: 0x39ff14, hex: '#39ff14', heal: 70, line: '+70 ❤ (the big heal)', respawn: 45 },
  armour:  { name: 'XXL STAB VEST', icon: '🦺', col: 0x4fc3ff, hex: '#4fc3ff', ar: 50, line: '+50 🛡 armour', respawn: 40 },
  p_reload:{ name: 'FAST HANDS', icon: '⏱️', col: 0xff4fd8, hex: '#ff4fd8', perk: 'reload', t: 30, line: 'Reload twice as fast · 30s' },
  p_speed: { name: 'MONSTOR RUSH', icon: '⚡', col: 0xff4fd8, hex: '#ff4fd8', perk: 'speed', t: 25, line: 'Run 30% faster · 25s' },
  p_dmg:   { name: 'EXTRA HOT SAUCE', icon: '🌶️', col: 0xff4fd8, hex: '#ff4fd8', perk: 'dmg', t: 20, line: '1.5x damage · 20s' },
  p_defuse:{ name: 'BOMB SQUAD PLIERS', icon: '🔧', col: 0xff4fd8, hex: '#ff4fd8', perk: 'defuse', t: 0, line: 'Plant and defuse twice as fast · this round' },
  p_ammo:  { name: 'BOTTOMLESS BAG', icon: '🎒', col: 0xff4fd8, hex: '#ff4fd8', perk: 'ammo', t: 0, line: 'Double magazine and a refill · this round' },
});
export const PICK_KINDS = Object.keys(PICKS);
export const PERKS = Object.assign(Object.create(null), { reload: ['⏱️', 'FAST HANDS'], speed: ['⚡', 'RUSH'], dmg: ['🌶️', 'HOT SAUCE'], defuse: ['🔧', 'PLIERS'], ammo: ['🎒', 'BOTTOMLESS'] });

// ------------------------------------------------------------------ the maps
// each map: where each team starts (att: the attackers, def: the defenders) and the two bomb sites (x, z, radius),
// all checked to be on the walkable floor and joined up (tests/snd.test.mjs walks every route)
export const MAPS = {
  pub:    { att: [4.55, -12.95], def: [-0.85, 11.95], A: [-13.15, -3.95, 2.3], B: [-18.25, 5.65, 2.6], names: { A: 'THE PUB FLOOR', B: 'THE CONSERVATORY' } },
  shop:   { att: [12.78, 10.35], def: [-4.92, -12.45], A: [-12.12, 5.55, 2.6], B: [5.88, -4.35, 2.6], names: { A: 'THE FRONT AISLE', B: 'THE BACK CORNER' } },
  garden: { att: [-0.35, 9.15], def: [-3.65, -16.35], A: [3.55, -6.15, 2.2], B: [-3.05, -11.55, 2.6], names: { A: 'THE PATIO', B: 'THE LAWN' } },
};

// ------------------------------------------------------------------ building bits
const B = (ps, w, h, d, c, x, y, z, r) => ps.push(part(box(w, h, d), c, [x, y, z], r || [0, 0, 0]));
const C = (ps, rt, rb, h, c, x, y, z, r, seg = 14) => ps.push(part(cyl(rt, rb, h, seg), c, [x, y, z], r || [0, 0, 0]));
const S = (ps, rad, c, x, y, z, scl, r) => ps.push(part(sph(rad, 12, 8), c, [x, y, z], r || [0, 0, 0], scl || [1, 1, 1]));
const T = (ps, R, tube, c, x, y, z, r, arc = Math.PI * 2) => ps.push(part(new THREE.TorusGeometry(R, tube, 6, 20, arc), c, [x, y, z], r || [0, 0, 0]));
const X = [Math.PI / 2, 0, 0];      // (a cylinder turned to lie along the barrel: z)
const YZ = [0, Math.PI / 2, 0];

// ---- the guns. Each is held at its grip (the origin), barrel pointing down -z, top up +y. muzzle: where the shot leaves
const GUN_BUILD = {
  ketchup() { const p = [], RD = 0xd32f2f, DK = 0x2b2c30, BK = 0x151517, WH = 0xf4f4f0, ST = 0x8a9098;
    B(p, 0.034, 0.034, 0.2, DK, 0, 0.056, -0.07); for (let i = 0; i < 6; i++) B(p, 0.036, 0.026, 0.003, BK, 0, 0.058, 0.012 - i * 0.008);      // the slide, its grip serrations
    B(p, 0.012, 0.006, 0.05, ST, 0.016, 0.06, -0.06); B(p, 0.03, 0.026, 0.17, RD, 0, 0.026, -0.065); B(p, 0.026, 0.006, 0.16, 0xa02020, 0, 0.01, -0.07);      // ejection port; the red frame and its rail
    B(p, 0.012, 0.012, 0.008, BK, 0, 0.078, 0.02); B(p, 0.006, 0.012, 0.006, BK, 0, 0.078, -0.16); S(p, 0.003, 0xffffff, 0, 0.085, -0.16);      // sights
    C(p, 0.009, 0.009, 0.03, BK, 0, 0.056, -0.18, X, 12);
    // the nozzle: a ketchup bottle's flip cap on the end of the barrel, a red drip off it
    C(p, 0.012, 0.016, 0.022, WH, 0, 0.056, -0.196, X, 14); C(p, 0.004, 0.008, 0.012, WH, 0, 0.056, -0.212, X, 10); S(p, 0.005, RD, 0, 0.05, -0.215, [1, 1.6, 1]);
    // the grip: a squeezy bottle, its label (a tomato on it), its cap at the bottom
    const tilt = [0.28, 0, 0]; C(p, 0.022, 0.026, 0.11, 0xe53935, 0, -0.035, 0.008, tilt, 16); C(p, 0.0265, 0.0265, 0.04, WH, 0, -0.03, 0.006, tilt, 16);
    S(p, 0.012, 0xe53935, 0, -0.03, -0.019, [1, 0.9, 0.5]); B(p, 0.008, 0.004, 0.004, 0x2e7d32, 0, -0.019, -0.022); C(p, 0.025, 0.027, 0.016, WH, 0, -0.095, 0.026, tilt, 16);
    T(p, 0.02, 0.004, BK, 0, 0.004, -0.04, YZ, Math.PI); B(p, 0.005, 0.02, 0.006, ST, 0, 0.002, -0.036, [0.3, 0, 0]);      // the trigger guard and trigger
    return { parts: p, muzzle: [0, 0.056, -0.22], view: [0.15, -0.15, -0.33], len: 0.26 }; },
  beans() { const p = [], DK = 0x34363a, BK = 0x18191b, WD = 0x8a5a2e, WD2 = 0x6a4020, OR = 0xff7a1a, BL = 0x1e4ea8, SV = 0xc0c4c8;
    B(p, 0.05, 0.062, 0.18, DK, 0, 0.03, -0.02); B(p, 0.052, 0.012, 0.07, BK, 0, 0.03, -0.01);      // receiver, ejection port
    C(p, 0.016, 0.016, 0.5, BK, 0, 0.056, -0.35, X, 14); S(p, 0.007, 0xffd400, 0, 0.076, -0.59);      // barrel, bead sight
    // the tube magazine: a tin of beans (orange label, a blue band, silver rims), beans spilling out the end of the barrel
    C(p, 0.026, 0.026, 0.27, OR, 0, 0.008, -0.27, X, 18); C(p, 0.0265, 0.0265, 0.04, BL, 0, 0.008, -0.27, X, 18); for (const z of [-0.135, -0.405]) C(p, 0.028, 0.028, 0.012, SV, 0, 0.008, z, X, 18);
    for (let i = 0; i < 5; i++) S(p, 0.008, 0xd9541e, Math.sin(i * 2.1) * 0.01, 0.056 + Math.cos(i * 1.7) * 0.01, -0.6 - i * 0.006, [1, 0.8, 1.4]);
    // the wooden pump with its grooves; stock and grip in wood with a rubber butt pad
    B(p, 0.056, 0.05, 0.13, WD, 0, 0.008, -0.26); for (let i = 0; i < 5; i++) B(p, 0.058, 0.004, 0.006, WD2, 0, 0.02 - i * 0.006, -0.22 - i * 0.02);
    B(p, 0.042, 0.075, 0.24, WD, 0, -0.012, 0.17, [0.12, 0, 0]); B(p, 0.046, 0.085, 0.02, BK, 0, -0.026, 0.29, [0.12, 0, 0]); B(p, 0.036, 0.09, 0.045, WD, 0, -0.04, 0.05, [0.35, 0, 0]);
    T(p, 0.02, 0.004, BK, 0, -0.006, -0.03, YZ, Math.PI); B(p, 0.005, 0.02, 0.006, SV, 0, -0.01, -0.028, [0.3, 0, 0]);
    return { parts: p, muzzle: [0, 0.056, -0.61], view: [0.14, -0.15, -0.3], len: 0.9 }; },
  sausage() { const p = [], WD = 0x7a4a26, WD2 = 0x5a3418, GR = 0x2e4a2e, BK = 0x111214, SS = 0x9a5a3a, SS2 = 0x7a3f22, MU = 0xffd21a;
    B(p, 0.046, 0.06, 0.22, GR, 0, 0.04, -0.06); B(p, 0.04, 0.09, 0.3, WD, 0, -0.005, 0.2, [0.06, 0, 0]); B(p, 0.042, 0.03, 0.18, WD2, 0, 0.045, 0.17);      // receiver, stock, cheek riser
    B(p, 0.046, 0.1, 0.022, BK, 0, -0.01, 0.35, [0.06, 0, 0]); B(p, 0.034, 0.08, 0.04, WD, 0, -0.04, 0.03, [0.35, 0, 0]);      // butt pad, grip
    // the barrel: a long sausage with its grill marks and the twists of the links, a squiggle of mustard down the top
    C(p, 0.021, 0.021, 0.62, SS, 0, 0.05, -0.47, X, 16); S(p, 0.021, SS, 0, 0.05, -0.78); for (const z of [-0.3, -0.55]) T(p, 0.02, 0.006, SS2, 0, 0.05, z, null);
    for (let i = 0; i < 8; i++) B(p, 0.044, 0.004, 0.006, SS2, 0, 0.05, -0.2 - i * 0.07, [0, 0, 0]);
    for (let i = 0; i < 14; i++) B(p, 0.008, 0.005, 0.05, MU, (i % 2 ? 1 : -1) * 0.006, 0.071, -0.2 - i * 0.04, [0, (i % 2 ? 1 : -1) * 0.6, 0]);
    // the scope: tube, bells, lenses, the turrets, the rings that hold it
    C(p, 0.017, 0.017, 0.24, BK, 0, 0.115, -0.08, X, 16); C(p, 0.026, 0.017, 0.06, BK, 0, 0.115, -0.22, X, 16); C(p, 0.022, 0.017, 0.05, BK, 0, 0.115, 0.06, X, 16);
    C(p, 0.023, 0.023, 0.003, 0x3a7aa8, 0, 0.115, -0.251, X, 16); C(p, 0.019, 0.019, 0.003, 0x3a7aa8, 0, 0.115, 0.086, X, 16);
    C(p, 0.008, 0.008, 0.02, 0x333, 0, 0.14, -0.08, null, 10); C(p, 0.008, 0.008, 0.02, 0x333, 0.024, 0.115, -0.08, [0, 0, Math.PI / 2], 10);
    for (const z of [-0.14, -0.02]) { T(p, 0.019, 0.004, BK, 0, 0.115, z, null); B(p, 0.014, 0.03, 0.012, BK, 0, 0.088, z); }
    C(p, 0.005, 0.005, 0.05, 0x8a9098, 0.035, 0.06, 0.0, [0, 0, Math.PI / 2], 8); S(p, 0.01, BK, 0.062, 0.06, 0.0);      // the bolt handle
    for (const s of [-1, 1]) C(p, 0.005, 0.005, 0.2, BK, s * 0.012, 0.03, -0.6, [Math.PI / 2 - 0.15, 0, s * 0.12], 6);      // folded bipod
    B(p, 0.03, 0.05, 0.05, BK, 0, -0.005, -0.1); T(p, 0.02, 0.004, BK, 0, 0.0, -0.02, YZ, Math.PI);
    return { parts: p, muzzle: [0, 0.05, -0.8], view: [0.14, -0.15, -0.3], len: 1.15 }; },
  cheese() { const p = [], YL = 0xffc107, Y2 = 0xe0a000, BK = 0x1a1a1c, OR = 0xff9800, WH = 0xf4f4f0, BL = 0x1565c0;
    B(p, 0.05, 0.068, 0.24, YL, 0, 0.034, -0.05); B(p, 0.052, 0.01, 0.2, Y2, 0, 0.0, -0.05); B(p, 0.02, 0.008, 0.22, BK, 0, 0.072, -0.05);      // body, rail
    for (let i = 0; i < 12; i++) B(p, 0.022, 0.006, 0.006, BK, 0, 0.078, 0.05 - i * 0.017);
    C(p, 0.022, 0.022, 0.13, 0x333, 0, 0.05, -0.23, X, 14); for (let i = 0; i < 4; i++) for (const s of [-1, 1]) B(p, 0.004, 0.012, 0.016, BK, s * 0.021, 0.05, -0.19 - i * 0.026);      // vented shroud
    C(p, 0.008, 0.012, 0.03, WH, 0, 0.05, -0.31, X, 10); B(p, 0.004, 0.01, 0.012, 0xff3b3b, 0, 0.062, -0.31);      // the aerosol nozzle on the end
    // the magazine: a can of squirty cheese (cap, blue band, a squiggle of cheese on its side)
    C(p, 0.02, 0.02, 0.15, OR, 0, -0.07, -0.08, [-0.15, 0, 0], 16); C(p, 0.0205, 0.0205, 0.03, BL, 0, -0.08, -0.078, [-0.15, 0, 0], 16); C(p, 0.016, 0.02, 0.02, WH, 0, -0.152, -0.067, [-0.15, 0, 0], 14);
    for (let i = 0; i < 4; i++) S(p, 0.007, YL, 0.02, -0.03 - i * 0.02, -0.084 + i * 0.003, [0.6, 1, 1]);
    B(p, 0.032, 0.085, 0.04, BK, 0, -0.04, 0.05, [0.32, 0, 0]); B(p, 0.026, 0.06, 0.03, BK, 0, -0.025, -0.17);      // grip, foregrip
    for (const s of [-1, 1]) C(p, 0.004, 0.004, 0.16, 0x8a9098, s * 0.018, 0.03, 0.15, X, 6); B(p, 0.046, 0.06, 0.012, BK, 0, 0.02, 0.23);      // the wire stock
    T(p, 0.018, 0.004, BK, 0, -0.006, -0.0, YZ, Math.PI);
    return { parts: p, muzzle: [0, 0.05, -0.33], view: [0.15, -0.16, -0.32], len: 0.5 }; },
  monstor() { const p = [], BK = 0x141416, DK = 0x26282c, GN = 0x7cff3a, SV = 0xbfc4ca;
    B(p, 0.05, 0.05, 0.22, DK, 0, 0.032, -0.05); B(p, 0.046, 0.04, 0.16, BK, 0, -0.004, -0.04);      // upper, lower
    B(p, 0.012, 0.04, 0.012, BK, 0, 0.076, 0.02); B(p, 0.012, 0.04, 0.012, BK, 0, 0.076, -0.1); B(p, 0.014, 0.012, 0.16, BK, 0, 0.098, -0.04);      // the carry handle
    C(p, 0.028, 0.028, 0.22, BK, 0, 0.034, -0.27, [Math.PI / 2, 0, Math.PI / 8], 8); for (let i = 0; i < 3; i++) B(p, 0.058, 0.006, 0.02, GN, 0, 0.034, -0.2 - i * 0.06);      // handguard, green bands
    C(p, 0.01, 0.01, 0.12, BK, 0, 0.034, -0.44, X, 12); C(p, 0.016, 0.016, 0.04, DK, 0, 0.034, -0.51, X, 10); B(p, 0.006, 0.04, 0.01, BK, 0, 0.07, -0.38);      // barrel, flash hider, front post
    // the magazine: a can of MONSTOR (black, three green claw marks, silver rims)
    C(p, 0.028, 0.028, 0.13, BK, 0, -0.075, -0.09, [-0.12, 0, 0], 18); for (const y of [-0.012, -0.138]) C(p, 0.026, 0.026, 0.008, SV, 0, y, -0.09 + (y + 0.075) * 0.12, [-0.12, 0, 0], 18);
    for (let i = 0; i < 3; i++) B(p, 0.006, 0.09, 0.006, GN, 0.028, -0.075, -0.1 + i * 0.012, [-0.12, 0, 0.18 * (i - 1)]);
    B(p, 0.034, 0.09, 0.044, BK, 0, -0.045, 0.05, [0.3, 0, 0]); B(p, 0.042, 0.06, 0.2, BK, 0, 0.01, 0.18); B(p, 0.044, 0.008, 0.18, GN, 0, 0.042, 0.18);      // grip, stock, stripe
    T(p, 0.018, 0.004, BK, 0, -0.01, -0.01, YZ, Math.PI);
    return { parts: p, muzzle: [0, 0.034, -0.54], view: [0.15, -0.16, -0.3], len: 0.82 }; },
  gravy() { const p = [], MT = 0x5a5e66, DK = 0x2a2c30, WH = 0xf4f2ea, GV = 0x6d3b1f, BR = 0xb08d57;
    C(p, 0.06, 0.06, 0.24, MT, 0, 0.03, -0.02, X, 18); C(p, 0.064, 0.064, 0.02, DK, 0, 0.03, 0.1, X, 18); C(p, 0.03, 0.03, 0.04, DK, 0, 0.03, -0.15, X, 14);      // the body
    for (const z of [-0.3, -0.48]) T(p, 0.038, 0.007, DK, 0, 0.03, z, null);      // barrel clamps (the barrels spin: their own piece)
    // the gravy boat drum on the side: the boat, a lip, the spout, its handle, gravy inside, a drip
    S(p, 0.07, WH, -0.1, 0.03, 0.0, [0.75, 0.6, 1.4]); B(p, 0.11, 0.008, 0.19, WH, -0.1, 0.07, 0); S(p, 0.06, GV, -0.1, 0.066, 0, [0.7, 0.08, 1.35]);
    C(p, 0.01, 0.022, 0.06, WH, -0.1, 0.07, -0.12, [-1.1, 0, 0], 10); T(p, 0.03, 0.007, WH, -0.1, 0.05, 0.1, [0, Math.PI / 2, 0], Math.PI); S(p, 0.008, GV, -0.1, 0.0, -0.08, [1, 1.8, 1]);
    B(p, 0.06, 0.02, 0.05, DK, -0.04, 0.05, -0.02);      // the feed into the body
    T(p, 0.06, 0.009, BR, 0, 0.09, -0.02, [0, Math.PI / 2, 0], Math.PI); for (const z of [0.06, 0.13]) B(p, 0.03, 0.09, 0.03, DK, 0, -0.04, z, [0.2, 0, 0]);      // carry handle, two grips
    return { parts: p, muzzle: [0, 0.03, -0.62], view: [0.17, -0.17, -0.3], len: 0.72, spin: true }; },
};
// the gravy gatling's barrels: six round a ring, spun as it fires (their own piece so they can turn)
function gatlingBarrels() { const p = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; C(p, 0.009, 0.009, 0.5, 0x232428, Math.cos(a) * 0.026, Math.sin(a) * 0.026, -0.36, X, 8); }
  C(p, 0.008, 0.008, 0.5, 0x5a5e66, 0, 0, -0.36, X, 8); return merge(p); }
const gunCache = {};
// one gun's model: { geo, spinGeo?, muzzle, view, len } (built once each)
export function gunModel(id) {
  if (gunCache[id]) return gunCache[id]; const f = GUN_BUILD[id] || GUN_BUILD.ketchup, d = f();
  const geo = merge(d.parts); geo.computeBoundingBox();
  return (gunCache[id] = { geo, spinGeo: d.spin ? gatlingBarrels() : null, muzzle: new THREE.Vector3(...d.muzzle), view: d.view, len: d.len, rear: geo.boundingBox.max.z, front: geo.boundingBox.min.z });
}
// a gun as a thing in the world (a Group: the body, and the spinning barrels if it has them)
export function newGun(id) {
  const m = gunModel(id), g = new THREE.Group(); g.add(new THREE.Mesh(m.geo, vcLambert));
  if (m.spinGeo) { const s = new THREE.Mesh(m.spinGeo, vcLambert); s.position.set(0, 0.03, 0); s.name = 'spin'; g.add(s); }
  g.userData.gun = id; g.userData.muzzle = m.muzzle; return g;
}

// ---- the pick-ups. Each one model, about the size of a shoebox, sat over a glowing ring
const PICK_BUILD = {
  ammo() { const p = [], OL = 0x4e5d2a, OD = 0x3a4620, YL = 0xffd400, GD = 0xd4a017, SV = 0x9aa0a6;
    B(p, 0.38, 0.2, 0.24, OL, 0, 0.1, 0); B(p, 0.4, 0.04, 0.26, OD, 0, 0.215, 0); B(p, 0.3, 0.035, 0.004, YL, 0, 0.12, 0.121); B(p, 0.3, 0.035, 0.004, YL, 0, 0.12, -0.121);
    for (const s of [-1, 1]) { B(p, 0.03, 0.03, 0.1, SV, s * 0.2, 0.15, 0); for (const z of [-1, 1]) B(p, 0.03, 0.21, 0.03, OD, s * 0.18, 0.105, z * 0.11); }
    for (let i = 0; i < 5; i++) { const x = -0.12 + i * 0.06; C(p, 0.014, 0.014, 0.09, GD, x, 0.28, 0, null, 10); C(p, 0.003, 0.014, 0.03, 0xb87333, x, 0.34, 0, null, 10); } return p; },
  burger() { return null; }, kebab() { return null; },
  armour() { const p = [], NV = 0x26324a, N2 = 0x1b2438, YL = 0xd8ff3a, SV = 0xbfc4ca;
    B(p, 0.32, 0.38, 0.09, NV, 0, 0.26, 0); for (const s of [-1, 1]) B(p, 0.07, 0.12, 0.08, NV, s * 0.11, 0.5, 0);      // the vest, shoulders
    B(p, 0.34, 0.05, 0.1, YL, 0, 0.32, 0); for (const s of [-1, 1]) for (const y of [0.13, 0.21]) B(p, 0.09, 0.07, 0.03, N2, s * 0.08, y, 0.055);      // a hi-vis band, pouches
    B(p, 0.03, 0.03, 0.02, SV, 0, 0.42, 0.05); B(p, 0.12, 0.05, 0.1, N2, 0, 0.47, -0.01); return p; },
  p_reload() { const p = [], GD = 0xffc83a, WH = 0xfffdf4, BK = 0x111;
    C(p, 0.11, 0.11, 0.04, GD, 0, 0.2, 0, X, 24); C(p, 0.095, 0.095, 0.042, WH, 0, 0.2, 0, X, 24); C(p, 0.02, 0.02, 0.05, GD, 0, 0.33, 0, null, 10); C(p, 0.03, 0.03, 0.02, GD, 0, 0.36, 0, null, 12);
    B(p, 0.008, 0.07, 0.006, BK, 0, 0.23, 0.024); B(p, 0.05, 0.008, 0.006, 0xff3b3b, 0.02, 0.2, 0.024); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; B(p, 0.006, 0.016, 0.004, BK, Math.sin(a) * 0.08, 0.2 + Math.cos(a) * 0.08, 0.023, [0, 0, -a]); } return p; },
  p_speed() { const p = [], BK = 0x111214, GN = 0x7cff3a, SV = 0xc0c4c8;
    C(p, 0.065, 0.065, 0.24, BK, 0, 0.16, 0, null, 20); for (const y of [0.04, 0.28]) C(p, 0.06, 0.065, 0.012, SV, 0, y, 0, null, 20); C(p, 0.012, 0.012, 0.01, SV, 0.02, 0.29, 0, null, 8);
    for (let i = 0; i < 3; i++) B(p, 0.012, 0.16, 0.012, GN, -0.02 + i * 0.022, 0.16, 0.062, [0, 0, 0.2]);
    B(p, 0.05, 0.11, 0.02, 0xffd400, 0.12, 0.2, 0, [0, 0, 0.4]); B(p, 0.05, 0.11, 0.02, 0xffd400, 0.14, 0.12, 0, [0, 0, 0.4]); return p; },
  p_dmg() { const p = [], RD = 0xc62828, GN = 0x2e7d32, WH = 0xfff8e1;
    C(p, 0.05, 0.055, 0.2, RD, 0, 0.12, 0, null, 18); S(p, 0.05, RD, 0, 0.22, 0, [1, 0.6, 1]); C(p, 0.018, 0.024, 0.08, RD, 0, 0.27, 0, null, 12); C(p, 0.02, 0.02, 0.04, GN, 0, 0.33, 0, null, 12);
    C(p, 0.0505, 0.0555, 0.09, WH, 0, 0.12, 0, null, 18); S(p, 0.022, 0xff6d00, 0, 0.13, 0.045, [1, 1.4, 0.4]); S(p, 0.013, 0xffd400, 0, 0.12, 0.052, [1, 1.3, 0.4]); return p; },
  p_defuse() { const p = [], RD = 0xd32f2f, MT = 0x9aa0a6, BK = 0x222;
    for (const s of [-1, 1]) { B(p, 0.03, 0.2, 0.025, RD, s * 0.04, 0.12, 0, [0, 0, s * 0.25]); B(p, 0.022, 0.1, 0.02, MT, -s * 0.012, 0.28, 0, [0, 0, -s * 0.2]); }
    C(p, 0.018, 0.018, 0.035, BK, 0, 0.23, 0, X, 12); B(p, 0.02, 0.03, 0.005, 0xffd400, 0.06, 0.06, 0.014); return p; },
  p_ammo() { const p = [], BR = 0x8a5a2e, B2 = 0x6a4020, GD = 0xd4a017;
    B(p, 0.26, 0.3, 0.14, BR, 0, 0.17, 0); S(p, 0.13, BR, 0, 0.3, 0, [1, 0.4, 0.55]); B(p, 0.2, 0.12, 0.03, B2, 0, 0.27, 0.075); B(p, 0.16, 0.08, 0.03, B2, 0, 0.1, 0.08);
    for (const s of [-1, 1]) B(p, 0.03, 0.3, 0.02, B2, s * 0.08, 0.18, -0.08);
    for (let i = 0; i < 6; i++) { const x = -0.08 + i * 0.032; C(p, 0.012, 0.012, 0.1, GD, x, 0.38 + (i % 2) * 0.02, 0, null, 8); C(p, 0.002, 0.012, 0.025, 0xb87333, x, 0.445 + (i % 2) * 0.02, 0, null, 8); } return p; },
};
const FOOD_PICK = { burger: ['burger', 2.4], kebab: ['kebab', 2.2] };
// a pick-up's model: [geometry, material] pairs and how big to draw it
export function pickModel(kind) {
  if (FOOD_PICK[kind]) { const [type, s] = FOOD_PICK[kind]; let parts = null; try { parts = itemParts(type); } catch (e) { parts = null; } if (parts && parts.length) return { parts, s, lift: 0.18 }; }
  const ps = (PICK_BUILD[kind] || PICK_BUILD.ammo)() || PICK_BUILD.ammo(); return { parts: [[merge(ps), vcLambert]], s: 1, lift: 0.05 };
}

// ---- THE VINDALOO: a curry pot, sausages for dynamite, a clock, wires. The light that blinks is its own piece
export function bombGeo() {
  const p = [], SV = 0xb0b4ba, S2 = 0x8a8e94, CU = 0xc1440e, SS = 0x8a3a22, BK = 0x141414, GY = 0x6a6e74;
  C(p, 0.17, 0.15, 0.2, SV, 0, 0.1, 0, null, 24); T(p, 0.17, 0.012, S2, 0, 0.2, 0, X); C(p, 0.16, 0.16, 0.01, CU, 0, 0.19, 0, null, 24);      // the pot, its rim, the curry
  for (let i = 0; i < 4; i++) { const a = i * 1.7; S(p, 0.03, i % 2 ? 0x2e7d32 : 0xd32f2f, Math.cos(a) * 0.08, 0.2, Math.sin(a) * 0.08, [1, 0.4, 2.2], [0, a, 0]); }      // chillies in the curry
  for (const s of [-1, 1]) T(p, 0.04, 0.01, S2, s * 0.19, 0.15, 0, [0, Math.PI / 2, 0], Math.PI);      // handles
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; C(p, 0.026, 0.026, 0.24, SS, Math.cos(a) * 0.19, 0.12, Math.sin(a) * 0.19, null, 12); S(p, 0.026, SS, Math.cos(a) * 0.19, 0.24, Math.sin(a) * 0.19); C(p, 0.003, 0.003, 0.05, 0xdddddd, Math.cos(a) * 0.19, 0.28, Math.sin(a) * 0.19, null, 5); }
  for (const y of [0.06, 0.18]) T(p, 0.205, 0.008, GY, 0, y, 0, X);      // the tape round them
  B(p, 0.16, 0.08, 0.04, BK, 0, 0.12, 0.2); B(p, 0.12, 0.04, 0.005, 0x3a0000, 0, 0.125, 0.222);      // the clock
  for (let i = 0; i < 3; i++) C(p, 0.004, 0.004, 0.14, [0xff3b3b, 0x2a6df4, 0xffd400][i], -0.05 + i * 0.05, 0.19, 0.17, [0.6, 0, 0], 5);
  return merge(p);
}
// the clock's red digits and the blinking light (drawn bright: their own little basic-material bits)
export function bombLightGeo() { const p = []; B(p, 0.1, 0.03, 0.004, 0xff2020, 0, 0.125, 0.224); S(p, 0.014, 0xff2020, 0.07, 0.17, 0.2); return merge(p); }

// ---- the bomb site markers: a big letter painted on the floor in a hazard ring (one picture each)
export function siteTexture(letter, name) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d'), c = 256;
  g.clearRect(0, 0, 512, 512);
  // the hazard ring: yellow and black stripes round the edge
  for (let i = 0; i < 36; i++) { g.beginPath(); g.moveTo(c, c); g.arc(c, c, 250, i / 36 * Math.PI * 2, (i + 1) / 36 * Math.PI * 2); g.closePath(); g.fillStyle = i % 2 ? '#111' : '#ffd400'; g.fill(); }
  g.beginPath(); g.arc(c, c, 222, 0, Math.PI * 2); g.fillStyle = 'rgba(200,20,20,0.55)'; g.fill();
  g.beginPath(); g.arc(c, c, 222, 0, Math.PI * 2); g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke();
  g.fillStyle = '#fff'; g.font = '900 300px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 14; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.strokeText(letter, c, c + 14); g.fillText(letter, c, c + 14);
  g.font = '900 30px "Arial Black", Arial, sans-serif'; g.fillStyle = '#ffd400'; g.fillText('BOMB SITE', c, 96); g.fillText(String(name || '').slice(0, 18), c, 428);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export function signTexture(letter, col) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = 'rgba(10,12,24,0.82)'; g.beginPath(); g.roundRect ? g.roundRect(8, 8, 240, 112, 28) : g.rect(8, 8, 240, 112); g.fill(); g.lineWidth = 8; g.strokeStyle = col; g.stroke();
  g.fillStyle = '#fff'; g.font = '900 54px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💣 ' + letter, 128, 68);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ------------------------------------------------------------------ the guns' pictures (pick screen, VR panel)
// a side view of each gun drawn in its own colours, fitted into the box (x, y, w, h)
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
export function drawGunArt(g, id, x, y, w, h) {
  g.save(); g.translate(x, y); const k = Math.min(w / 300, h / 110); g.translate((w - 300 * k) / 2, (h - 110 * k) / 2); g.scale(k, k);
  const R = (c, X0, Y0, W, H, r = 4) => { g.fillStyle = c; rr(g, X0, Y0, W, H, Math.min(r, W / 2, H / 2)); g.fill(); };
  const O = (c, cx, cy, rx, ry, a = 0) => { g.fillStyle = c; g.beginPath(); g.ellipse(cx, cy, rx, ry, a, 0, Math.PI * 2); g.fill(); };
  g.lineJoin = 'round';
  if (id === 'ketchup') { R('#2b2c30', 70, 30, 150, 26, 6); for (let i = 0; i < 6; i++) R('#151517', 192 + i * 5, 32, 2, 22, 1); R('#d32f2f', 76, 54, 136, 18, 5); R('#f4f4f0', 46, 34, 26, 18, 6); R('#f4f4f0', 34, 38, 14, 10, 4); O('#d32f2f', 36, 52, 4, 7);
    g.save(); g.translate(185, 70); g.rotate(0.28); R('#e53935', -20, 0, 40, 78, 14); R('#f4f4f0', -21, 18, 42, 28, 4); O('#e53935', 0, 32, 9, 8); R('#2e7d32', -3, 22, 6, 4, 2); R('#f4f4f0', -18, 72, 36, 12, 5); g.restore();
    g.strokeStyle = '#151517'; g.lineWidth = 5; g.beginPath(); g.arc(160, 74, 14, 0, Math.PI); g.stroke(); }
  else if (id === 'beans') { R('#18191b', 20, 36, 190, 10, 4); O('#ffd400', 26, 34, 4, 4); R('#ff7a1a', 70, 50, 110, 20, 6); R('#1e4ea8', 112, 50, 24, 20, 2); R('#c0c4c8', 68, 49, 5, 22, 2); R('#c0c4c8', 177, 49, 5, 22, 2);
    R('#8a5a2e', 92, 46, 56, 30, 6); for (let i = 0; i < 5; i++) R('#6a4020', 98 + i * 10, 48, 3, 26, 1); R('#34363a', 182, 32, 66, 34, 6);
    g.save(); g.translate(246, 40); g.rotate(0.12); R('#8a5a2e', 0, 0, 54, 32, 8); R('#18191b', 50, -2, 8, 38, 3); g.restore(); g.save(); g.translate(222, 62); g.rotate(0.35); R('#8a5a2e', -8, 0, 18, 38, 6); g.restore();
    for (let i = 0; i < 5; i++) O('#d9541e', 14 - i * 3, 40 + Math.sin(i * 2) * 5, 5, 4); }
  else if (id === 'sausage') { R('#9a5a3a', 8, 44, 170, 16, 8); for (let i = 0; i < 8; i++) R('#7a3f22', 40 + i * 17, 44, 3, 16, 1); for (let i = 0; i < 12; i++) R('#ffd21a', 30 + i * 12, 40 + (i % 2) * 2, 9, 3, 1);
    R('#2e4a2e', 172, 38, 66, 28, 5); R('#111214', 150, 18, 92, 14, 6); R('#111214', 140, 14, 18, 22, 5); R('#111214', 236, 15, 16, 20, 5); R('#3a7aa8', 138, 17, 3, 16, 1);
    g.save(); g.translate(236, 44); g.rotate(0.06); R('#7a4a26', 0, 0, 62, 36, 8); R('#5a3418', 6, -6, 46, 10, 4); R('#111214', 58, -2, 8, 42, 3); g.restore(); g.save(); g.translate(206, 64); g.rotate(0.35); R('#7a4a26', -8, 0, 16, 32, 6); g.restore(); }
  else if (id === 'cheese') { R('#ffc107', 84, 34, 120, 36, 8); R('#e0a000', 86, 62, 116, 8, 3); R('#1a1a1c', 90, 28, 110, 6, 2); R('#333333', 30, 38, 60, 18, 6); for (let i = 0; i < 4; i++) R('#1a1a1c', 40 + i * 12, 40, 4, 14, 1);
    R('#f4f4f0', 16, 40, 16, 14, 4); R('#ff3b3b', 18, 34, 6, 6, 1);
    g.save(); g.translate(130, 70); g.rotate(-0.15); R('#ff9800', -10, 0, 22, 70, 8); R('#1565c0', -11, 16, 24, 12, 2); R('#f4f4f0', -8, 66, 18, 10, 4); g.restore();
    g.save(); g.translate(196, 70); g.rotate(0.32); R('#1a1a1c', -8, 0, 18, 40, 6); g.restore(); R('#8a9098', 204, 42, 56, 4, 2); R('#8a9098', 204, 54, 56, 4, 2); R('#1a1a1c', 258, 36, 10, 30, 3); }
  else if (id === 'monstor') { R('#141416', 16, 44, 70, 8, 3); R('#26282c', 6, 42, 16, 12, 3); R('#141416', 74, 36, 70, 22, 8); for (let i = 0; i < 3; i++) R('#7cff3a', 84 + i * 18, 36, 6, 22, 1); R('#141416', 82, 22, 4, 16, 1);
    R('#26282c', 140, 32, 74, 26, 5); R('#141416', 150, 18, 56, 6, 2); R('#141416', 152, 18, 5, 16, 1); R('#141416', 198, 18, 5, 16, 1);
    g.save(); g.translate(160, 58); g.rotate(-0.12); R('#141416', -12, 0, 26, 50, 6); for (let i = 0; i < 3; i++) R('#7cff3a', -6 + i * 7, 10, 3, 32, 1); R('#bfc4ca', -12, 0, 26, 4, 1); R('#bfc4ca', -12, 46, 26, 4, 1); g.restore();
    g.save(); g.translate(214, 58); g.rotate(0.3); R('#141416', -8, 0, 18, 36, 6); g.restore(); R('#141416', 212, 34, 76, 24, 6); R('#7cff3a', 214, 34, 72, 4, 2); }
  else if (id === 'gravy') { for (let i = 0; i < 3; i++) R('#232428', 10, 34 + i * 9, 120, 6, 3); R('#2a2c30', 50, 30, 8, 30, 3); R('#2a2c30', 96, 30, 8, 30, 3); R('#5a5e66', 126, 26, 90, 40, 14); R('#2a2c30', 212, 24, 12, 44, 4);
    O('#f4f2ea', 170, 78, 54, 20); O('#6d3b1f', 170, 70, 46, 7); R('#f4f2ea', 108, 66, 20, 8, 3); O('#6d3b1f', 126, 92, 4, 7);
    g.strokeStyle = '#b08d57'; g.lineWidth = 7; g.beginPath(); g.arc(170, 26, 26, Math.PI, 0); g.stroke(); R('#2a2c30', 228, 50, 14, 40, 5); R('#2a2c30', 254, 50, 14, 40, 5); }
  g.restore();
}
