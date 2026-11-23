// SEARCH AND DESTROY: the kit. The guns (stats, their 3D models in working parts, the hands that hold them, their
// pictures for the shop), the pick-ups (ammo, food that heals, armour, the perks), the bomb (THE VINDALOO), the A and B
// site markers and their props, the effects' little pictures, and where everything is on each of the three big maps.
// The game itself is in snd.js (the gun handling in sndguns.js, the effects in sndfx.js, the screens in sndui.js).
// Every model is the game's own coloured pieces merged into meshes with vertex colours (the furniture's materials), so
// nothing here needs a new shader. A gun is a few meshes (its body, the magazine, the moving part, spinning barrels) so
// the reloads can take it apart.
import * as THREE from 'three';
import { part, merge, vcLambert, vcPhong, box, cyl, sph } from './geo.js';
import { itemParts } from './foods.js';

// ------------------------------------------------------------------ the guns
// everyone's health: 150 (a fight's several hits: a rifle takes six to the body, or three to the head; a sniper two
// to the body, one to the head)
export const HP = 150;
// slot: P (primary) or S (sidearm). cost: £ in the shop, kill: £ for a kill with it.
// dmg: a hit's damage (a shotgun's per pellet) at close range; fall: [from m, to m, what's left]: it tails off between.
// rate: seconds between shots; modes: fire modes (the first is the one it starts on); burst: shots in a burst.
// mag/reserve: rounds; reload: seconds; rtype: how it reloads (mag: out and in, shell: one at a time, bolt: mag and the
// bolt, cyl: the revolver's cylinder and a speedloader, box: the gatling's drum); cycle: a pump or bolt between shots.
// spread: radians of wobble from the hip, ads: aimed; bloom: added per shot (up to bloomMax), settling as it rests.
// kick: how far each shot throws the aim up (radians), kickY: sideways; pat: the spray's shape, shot by shot.
// hs / limb: headshot and leg multipliers. pen: through walls (0 never, 1 thin ones, 2 most). move / adsMove: walking
// speed with it out / aimed. zoom: the view when aimed (scope: the sniper's scope). draw: seconds to get it out.
const PAT_AR = [[0, 1], [0.1, 1], [-0.1, 1.1], [0.2, 1], [0.35, 0.9], [0.2, 0.8], [-0.2, 0.7], [-0.45, 0.6], [-0.6, 0.5], [-0.3, 0.4], [0.2, 0.4], [0.5, 0.4]];
const PAT_SMG = [[0, 1], [0.15, 0.9], [-0.15, 0.9], [0.3, 0.7], [-0.3, 0.6], [0.4, 0.5], [-0.4, 0.5], [0.2, 0.4]];
const PAT_LMG = [[0, 1.2], [0.1, 1], [0.2, 0.8], [0.3, 0.6], [0.15, 0.4], [-0.15, 0.4], [-0.3, 0.4], [-0.15, 0.3], [0.15, 0.3]];
export const GUNS = [
  { id: 'ketchup', type: 'PISTOL', name: 'KETCHUP BLASTER', icon: '🍅', kind: 'PISTOL', slot: 'S', cost: 0, kill: 300, col: '#e53935', tr: 0xff3030, splat: 0xc62828,
    dmg: 26, pellets: 1, fall: [12, 36, 0.6], rate: 0.16, modes: ['semi'], mag: 12, reserve: 48, reload: 1.4, rtype: 'mag',
    spread: 0.014, ads: 0.0045, bloom: 0.012, bloomMax: 0.04, kick: 0.014, kickY: 0.006, range: 45, hs: 2.8, limb: 0.75, pen: 1, move: 1.08, adsMove: 0.8, zoom: 0.85, draw: 0.35, sfx: 'sd_pistol', line: 'Squirty. Reliable. Free. Gets everywhere.' },
  { id: 'brown', type: 'PISTOL', name: 'BROWN SAUCE BURST', icon: '🟫', kind: 'MACHINE PISTOL', slot: 'S', cost: 400, kill: 300, col: '#8d4b26', tr: 0xb5652e, splat: 0x5a2a14,
    dmg: 19, pellets: 1, fall: [10, 30, 0.55], rate: 0.065, burst: 3, burstGap: 0.3, modes: ['burst', 'semi'], mag: 18, reserve: 54, reload: 1.6, rtype: 'mag',
    spread: 0.02, ads: 0.008, bloom: 0.008, bloomMax: 0.05, kick: 0.011, kickY: 0.008, range: 38, hs: 2.4, limb: 0.75, pen: 0, move: 1.08, adsMove: 0.8, zoom: 0.85, draw: 0.35, sfx: 'sd_mpistol', line: 'Three squirts a pull. Goes on everything.' },
  { id: 'mustard', type: 'PISTOL', name: 'MUSTARD MAGNUM', icon: '🌭', kind: 'REVOLVER', slot: 'S', cost: 700, kill: 300, col: '#ffc400', tr: 0xffd21a, splat: 0xe0a800,
    dmg: 52, pellets: 1, fall: [16, 48, 0.65], rate: 0.48, modes: ['semi'], mag: 6, reserve: 24, reload: 2.4, rtype: 'cyl',
    spread: 0.02, ads: 0.003, bloom: 0.05, bloomMax: 0.07, kick: 0.07, kickY: 0.012, range: 55, hs: 2.8, limb: 0.8, pen: 2, move: 1.07, adsMove: 0.75, zoom: 0.8, draw: 0.45, sfx: 'sd_magnum', line: 'English mustard. Clears your sinuses and the room.' },
  { id: 'cheese', type: 'SMG', name: 'SQUIRTY CHEESE SMG', icon: '🧀', kind: 'SMG', slot: 'P', cost: 1200, kill: 600, col: '#ffc107', tr: 0xffd84a, splat: 0xffb300,
    dmg: 17, pellets: 1, fall: [8, 26, 0.55], rate: 0.068, modes: ['auto', 'semi'], mag: 30, reserve: 120, reload: 1.9, rtype: 'mag', pat: PAT_SMG,
    spread: 0.03, ads: 0.014, bloom: 0.005, bloomMax: 0.045, kick: 0.008, kickY: 0.006, range: 30, hs: 2.1, limb: 0.8, pen: 0, move: 1.04, adsMove: 0.85, zoom: 0.8, draw: 0.4, sfx: 'sd_smg', line: 'Processed cheese at 900 rounds a minute.' },
  { id: 'beans', type: 'SHOTGUN', name: 'BAKED BEAN SHOTGUN', icon: '🫘', kind: 'SHOTGUN', slot: 'P', cost: 1100, kill: 600, col: '#ff7a1a', tr: 0xff8a2a, splat: 0xd9541e,
    dmg: 14, pellets: 9, fall: [4, 15, 0.25], rate: 0.85, cycle: 0.55, modes: ['pump'], mag: 6, reserve: 24, reload: 0.45, rtype: 'shell',
    spread: 0.085, ads: 0.065, bloom: 0, bloomMax: 0, kick: 0.06, kickY: 0.015, range: 18, hs: 1.6, limb: 0.8, pen: 0, move: 0.92, adsMove: 0.8, zoom: 0.85, draw: 0.5, sfx: 'sd_shotgun', line: 'Nine beans a pop, loaded one tin at a time.' },
  { id: 'monstor', type: 'RIFLE', name: 'MONSTOR AR', icon: '🥫', kind: 'RIFLE', slot: 'P', cost: 2500, kill: 300, col: '#7cff3a', tr: 0x9cff6a, splat: 0x5fd12a,
    dmg: 26, pellets: 1, fall: [22, 60, 0.7], rate: 0.1, burst: 3, burstGap: 0.28, modes: ['auto', 'burst', 'semi'], mag: 30, reserve: 90, reload: 2.3, rtype: 'mag', pat: PAT_AR,
    spread: 0.024, ads: 0.0035, bloom: 0.006, bloomMax: 0.05, kick: 0.011, kickY: 0.008, range: 70, hs: 2.9, limb: 0.8, pen: 1, move: 0.96, adsMove: 0.7, zoom: 0.72, draw: 0.55, sfx: 'sd_rifle', line: 'Loaded with Mango Loco. Does everything well.' },
  { id: 'baguette', type: 'RIFLE', name: 'BAGUETTE BATTLE RIFLE', icon: '🥖', kind: 'MARKSMAN', slot: 'P', cost: 2300, kill: 300, col: '#d9a35b', tr: 0xffe0a0, splat: 0xc8913a,
    dmg: 47, pellets: 1, fall: [30, 75, 0.75], rate: 0.27, modes: ['semi'], mag: 15, reserve: 45, reload: 2.6, rtype: 'mag',
    spread: 0.035, ads: 0.0015, bloom: 0.03, bloomMax: 0.06, kick: 0.035, kickY: 0.01, range: 85, hs: 2.7, limb: 0.85, pen: 2, move: 0.93, adsMove: 0.65, zoom: 0.55, draw: 0.6, sfx: 'sd_dmr', line: 'Stale, so it\'s rock hard. Gets through walls.' },
  { id: 'sausage', type: 'SNIPER', name: 'SAUSAGE SNIPER', icon: '🌭', kind: 'SNIPER', slot: 'P', cost: 4000, kill: 150, col: '#b5651d', tr: 0xffe070, splat: 0x9a5a3a,
    dmg: 105, pellets: 1, fall: [60, 130, 0.85], rate: 1.3, cycle: 1.0, modes: ['bolt'], mag: 5, reserve: 20, reload: 3.0, rtype: 'bolt',
    spread: 0.085, ads: 0.0006, bloom: 0, bloomMax: 0, kick: 0.09, kickY: 0.01, range: 130, hs: 2, limb: 0.8, pen: 2, move: 0.85, adsMove: 0.5, zoom: 0.28, scope: true, draw: 0.75, sfx: 'sd_sniper', line: 'One banger, one kill. Aim it and scope it in.' },
  { id: 'gravy', type: 'HEAVY', name: 'GRAVY GATLING', icon: '🍗', kind: 'LMG', slot: 'P', cost: 4500, kill: 300, col: '#8d5a32', tr: 0xc88040, splat: 0x6d3b1f,
    dmg: 19, pellets: 1, fall: [15, 40, 0.6], rate: 0.065, spin: 0.45, modes: ['auto'], mag: 100, reserve: 100, reload: 4.2, rtype: 'box', pat: PAT_LMG,
    spread: 0.045, ads: 0.022, bloom: 0.003, bloomMax: 0.04, kick: 0.006, kickY: 0.006, range: 45, hs: 1.9, limb: 0.8, pen: 2, move: 0.74, adsMove: 0.5, zoom: 0.8, draw: 0.9, sfx: 'sd_lmg', line: 'Sunday dinner at 900 rounds a minute. Heavy.' },
  // the three odd ones: a scotch egg launcher (it lobs them; they go off where they land, round corners no), a hot sauce
  // flamer (a short spray that keeps hurting), a chip fork crossbow (a slow chip on an arc that sticks in things)
  { id: 'scotch', type: 'LAUNCHER', name: 'SCOTCH EGG LAUNCHER', icon: '🥚', kind: 'LAUNCHER', slot: 'P', cost: 3800, kill: 300, col: '#c87a2a', tr: 0xffb060, splat: 0x8a5a2e,
    dmg: 60, pellets: 1, fall: [60, 61, 1], rate: 0.85, modes: ['semi'], mag: 4, reserve: 8, reload: 3.0, rtype: 'cyl',
    proj: { speed: 20, grav: 9.8, splash: 3.8, sdmg: 95, size: 0.055 },
    spread: 0.03, ads: 0.01, bloom: 0, bloomMax: 0, kick: 0.07, kickY: 0.01, range: 60, hs: 1, limb: 1, pen: 0, move: 0.82, adsMove: 0.6, zoom: 0.8, draw: 0.8, sfx: 'sd_egg', line: 'Lobs a scotch egg. It goes off where it lands.' },
  { id: 'flamer', type: 'HEAVY', name: 'HOT SAUCE FLAMER', icon: '🌶️', kind: 'FLAMER', slot: 'P', cost: 2800, kill: 300, col: '#e53935', tr: 0xff6a1a, splat: 0xb71c1c,
    dmg: 8, pellets: 1, fall: [3, 9, 0.4], rate: 0.08, modes: ['auto'], mag: 60, reserve: 120, reload: 2.8, rtype: 'mag', flame: true,
    spread: 0.11, ads: 0.08, bloom: 0, bloomMax: 0, kick: 0.002, kickY: 0.002, range: 9, hs: 1.3, limb: 1, pen: 0, move: 0.85, adsMove: 0.7, zoom: 0.9, draw: 0.7, sfx: 'sd_flame', line: 'Extra extra hot. Very close range only.' },
  { id: 'xbow', type: 'CROSSBOW', name: 'CHIP FORK CROSSBOW', icon: '🍟', kind: 'CROSSBOW', slot: 'P', cost: 3000, kill: 300, col: '#ffd54f', tr: 0xffe082, splat: 0xd4a017,
    dmg: 80, pellets: 1, fall: [80, 81, 1], rate: 1.0, modes: ['semi'], mag: 1, reserve: 14, reload: 1.3, rtype: 'shell',
    proj: { speed: 60, grav: 4, size: 0.02, bolt: true },
    spread: 0.04, ads: 0.0015, bloom: 0, bloomMax: 0, kick: 0.03, kickY: 0.005, range: 90, hs: 2.2, limb: 0.8, pen: 0, move: 0.9, adsMove: 0.6, zoom: 0.5, draw: 0.6, sfx: 'sd_xbow', line: 'Fires a chip on a fork. Silent, slow, deadly.' },
];
// (no prototype: a name off the network like 'constructor' is never mistaken for a gun)
export const GUN = Object.assign(Object.create(null), Object.fromEntries(GUNS.map((g, i) => [g.id, Object.assign(g, { i })])));
export const PRIMARIES = GUNS.filter(g => g.slot === 'P'), SIDEARMS = GUNS.filter(g => g.slot === 'S');
export const FREE_GUN = 'ketchup';
// damage left at a distance (1 close up, tailing off to fall[2])
export const falloff = (G, d) => { const [a, b, k] = G.fall || [G.range * 0.5, G.range, 0.5]; return d <= a ? 1 : d >= b ? k : 1 - (1 - k) * (d - a) / (b - a); };
// the most a hit can do (the host's sanity check): every pellet in the head with the hot sauce perk
export const maxHit = (G) => Math.max(G.dmg * G.pellets * Math.max(G.hs, 1), G.proj && G.proj.sdmg ? G.dmg + G.proj.sdmg : 0) * 1.5 + 1;
export const money = (n) => '£' + Math.round(n).toLocaleString('en-GB');
// how a gun rates in the shop (0..1 bars)
export function gunBars(g) {
  const dps = g.dmg * g.pellets / g.rate;
  return [['DAMAGE', Math.min(1, g.dmg * g.pellets / 110)], ['FIRE RATE', Math.min(1, 0.065 / g.rate)], ['RANGE', Math.min(1, (g.fall ? g.fall[1] : g.range) / 120)], ['CONTROL', Math.max(0.08, Math.min(1, 1 - g.kick * 9 - g.spread * 4))], ['MOBILITY', Math.min(1, (g.move - 0.7) / 0.45)], ['DPS', Math.min(1, dps / 320)]];
}

// ------------------------------------------------------------------ the pick-ups
// heal: health back (food: eating heals), ar: armour, perk: a timed (t seconds) or whole-round (t: 0) boost
export const PICKS = Object.assign(Object.create(null), {
  ammo:    { name: 'AMMO BOX', icon: '📦', col: 0xffd400, hex: '#ffd400', line: 'Full reserve for both guns', respawn: 30 },
  burger:  { name: 'BURGER', icon: '🍔', col: 0x39ff14, hex: '#39ff14', heal: 50, line: '+50 ❤ (eating heals)', respawn: 30 },
  kebab:   { name: 'DONER KEBAB', icon: '🥙', col: 0x39ff14, hex: '#39ff14', heal: 100, line: '+100 ❤ (the big heal)', respawn: 45 },
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
// each map: where each team starts (att: the attackers, def: the defenders), the two bomb sites (x, z, radius) and how
// many a side it's made for (bots fill the teams up to that), all checked to be on the walkable floor and joined up
// (tests/snd.test.mjs walks every route)
export const MAPS = {
  // the pub: the attackers come from the car park out the front, the defenders from the far end of the beer garden;
  // the sites are where the pub meets the garden (everything funnels through the passage)
  pub:    { att: [4.55, -12.95], def: [0.05, 38.05], A: [3.95, 14.05, 2.0], B: [-5.95, 19.15, 2.4], team: 5, names: { A: 'THE PASSAGE', B: 'THE BEER GARDEN' }, spawnNames: { att: 'THE CAR PARK', def: 'THE BOTTOM OF THE GARDEN' } },
  // Lidl: the attackers come in the entrance, the defenders from the back of the stock room
  shop:   { att: [12.78, 10.35], def: [4.68, -12.75], A: [-4.02, 0.15, 2.4], B: [-6.12, -10.05, 2.4], team: 5, names: { A: 'THE MIDDLE AISLES', B: 'THE BACK AISLE' }, spawnNames: { att: 'THE ENTRANCE', def: 'THE STOCK ROOM' } },
  // Lewis's: the attackers come out of the living room, the defenders from the summer house at the bottom of the garden
  garden: { att: [-0.35, 9.15], def: [-3.65, -16.35], A: [3.55, -6.15, 2.2], B: [-3.05, -11.55, 2.6], team: 4, names: { A: 'THE PATIO', B: 'THE LAWN' }, spawnNames: { att: 'THE LIVING ROOM', def: 'THE SUMMER HOUSE' } },
};

// ------------------------------------------------------------------ building bits
const B = (ps, w, h, d, c, x, y, z, r, s) => ps.push(part(box(w, h, d), c, [x, y, z], r || [0, 0, 0], s || [1, 1, 1]));
const C = (ps, rt, rb, h, c, x, y, z, r, seg = 14) => ps.push(part(cyl(rt, rb, h, seg), c, [x, y, z], r || [0, 0, 0]));
const S = (ps, rad, c, x, y, z, scl, r) => ps.push(part(sph(rad, 12, 8), c, [x, y, z], r || [0, 0, 0], scl || [1, 1, 1]));
const T = (ps, R, tube, c, x, y, z, r, arc = Math.PI * 2) => ps.push(part(new THREE.TorusGeometry(R, tube, 6, 20, arc), c, [x, y, z], r || [0, 0, 0]));
const X = [Math.PI / 2, 0, 0];      // (a cylinder turned to lie along the barrel: z)
const YZ = [0, Math.PI / 2, 0];
const ZX = [0, 0, Math.PI / 2];      // (a cylinder lying across: x)
const kit = () => ({ body: [], mag: [], act: [], spin: [] });

// ---- the guns. Each is held at its grip (the origin), barrel pointing down -z, top up +y. Besides its pieces:
// muzzle (where the shot leaves), eject (where the empties fly out), sight (the point lined up with your eye when you
// aim), fore (where the other hand holds it), magAt / magDir (where the magazine is and which way it comes out), act
// (what the moving part does: slide, pump, bolt, charge, cyl), actLen (how far it goes)
const GUN_BUILD = {
  ketchup() { const g = kit(), b = g.body, a = g.act, m = g.mag, RD = 0xd32f2f, R2 = 0xa02020, DK = 0x2b2c30, BK = 0x151517, WH = 0xf4f4f0, ST = 0x8a9098;
    // the red frame, its rail and the trigger
    B(b, 0.03, 0.026, 0.17, RD, 0, 0.026, -0.065); B(b, 0.026, 0.006, 0.16, R2, 0, 0.01, -0.07); B(b, 0.02, 0.008, 0.06, BK, 0, 0.007, -0.115); for (let i = 0; i < 3; i++) B(b, 0.022, 0.003, 0.005, ST, 0, 0.003, -0.095 - i * 0.015);
    T(b, 0.02, 0.004, BK, 0, 0.004, -0.04, YZ, Math.PI); B(b, 0.005, 0.02, 0.006, ST, 0, 0.002, -0.036, [0.3, 0, 0]); B(b, 0.008, 0.012, 0.012, ST, 0.017, 0.035, -0.02);      // (the slide stop)
    // the grip: a squeezy bottle, its label with a tomato on, grip ridges down the back
    const tilt = [0.28, 0, 0]; C(b, 0.022, 0.026, 0.11, 0xe53935, 0, -0.035, 0.008, tilt, 16); C(b, 0.0265, 0.0265, 0.04, WH, 0, -0.03, 0.006, tilt, 16);
    S(b, 0.012, 0xe53935, 0, -0.03, -0.019, [1, 0.9, 0.5]); B(b, 0.008, 0.004, 0.004, 0x2e7d32, 0, -0.019, -0.022); for (let i = 0; i < 4; i++) B(b, 0.03, 0.004, 0.006, R2, 0, -0.07 + i * 0.016, 0.036 - i * 0.005, tilt);
    // the slide (it moves): serrations, ejection port, sights, the barrel and the bottle's flip cap on the end
    B(a, 0.034, 0.034, 0.2, DK, 0, 0.056, -0.07); for (let i = 0; i < 7; i++) B(a, 0.036, 0.026, 0.003, BK, 0, 0.058, 0.016 - i * 0.007);
    B(a, 0.004, 0.016, 0.05, ST, 0.0165, 0.062, -0.055); for (const s of [-1, 1]) B(a, 0.004, 0.012, 0.008, BK, s * 0.006, 0.078, 0.02); B(a, 0.006, 0.012, 0.006, BK, 0, 0.078, -0.16); S(a, 0.003, 0xffffff, 0, 0.085, -0.16); for (const s of [-1, 1]) S(a, 0.0022, 0xffffff, s * 0.006, 0.083, 0.024);
    C(a, 0.009, 0.009, 0.03, BK, 0, 0.056, -0.18, X, 12); C(a, 0.012, 0.016, 0.022, WH, 0, 0.056, -0.196, X, 14); C(a, 0.004, 0.008, 0.012, WH, 0, 0.056, -0.212, X, 10); S(a, 0.005, RD, 0, 0.05, -0.215, [1, 1.6, 1]);
    // the magazine: up the grip, the bottle's cap the base plate
    B(m, 0.02, 0.09, 0.026, R2, 0, -0.045, 0.01, tilt); C(m, 0.025, 0.027, 0.016, WH, 0, -0.095, 0.026, tilt, 16); for (let i = 0; i < 3; i++) S(m, 0.004, 0xffe9a8, 0, -0.012 - i * 0.009, 0.0, [1, 0.7, 1.4]);
    return { ...g, muzzle: [0, 0.056, -0.222], eject: [0.02, 0.064, -0.055], sight: [0, 0.083, 0.02], fore: [-0.02, -0.045, 0.012], magAt: [0, -0.06, 0.02], magDir: [0, -1, 0.25], actK: 'slide', actLen: 0.035, len: 0.27 }; },
  brown() { const g = kit(), b = g.body, a = g.act, m = g.mag, BR = 0x5a2a14, B2 = 0x3e1c0c, DK = 0x24252a, BK = 0x141416, CR = 0xe8d9a8, RD = 0xb3261e, ST = 0x8a9098;
    // the frame, a compensator, the grip and a stubby folding stock
    B(b, 0.034, 0.03, 0.19, DK, 0, 0.024, -0.07); C(b, 0.016, 0.016, 0.05, BK, 0, 0.056, -0.205, X, 12); for (let i = 0; i < 3; i++) B(b, 0.036, 0.006, 0.006, ST, 0, 0.068, -0.19 - i * 0.012);
    B(b, 0.03, 0.1, 0.044, DK, 0, -0.04, 0.012, [0.22, 0, 0]); for (let i = 0; i < 4; i++) B(b, 0.032, 0.004, 0.034, BK, 0, -0.07 + i * 0.018, 0.018, [0.22, 0, 0]);
    T(b, 0.02, 0.004, BK, 0, 0.003, -0.045, YZ, Math.PI); B(b, 0.005, 0.02, 0.006, ST, 0, 0.0, -0.04, [0.3, 0, 0]); B(b, 0.024, 0.026, 0.04, DK, 0, -0.008, -0.13);      // (a little front grip)
    for (const s of [-1, 1]) C(b, 0.003, 0.003, 0.12, ST, s * 0.014, 0.02, 0.09, X, 6); B(b, 0.034, 0.05, 0.01, BK, 0, 0.012, 0.15);
    // the slide: brown, cream stripes like the label, sights
    B(a, 0.036, 0.034, 0.2, BR, 0, 0.056, -0.075); B(a, 0.037, 0.012, 0.09, CR, 0, 0.058, -0.09); for (let i = 0; i < 6; i++) B(a, 0.038, 0.026, 0.003, B2, 0, 0.058, 0.015 - i * 0.007);
    B(a, 0.006, 0.012, 0.006, BK, 0, 0.078, -0.165); for (const s of [-1, 1]) B(a, 0.004, 0.012, 0.008, BK, s * 0.007, 0.078, 0.018);
    // the magazine: a long bottle of brown sauce down out of the grip, its label, its red cap at the bottom
    const tilt = [0.22, 0, 0]; C(m, 0.017, 0.019, 0.2, BR, 0, -0.1, 0.03, tilt, 14); C(m, 0.0195, 0.0195, 0.06, CR, 0, -0.12, 0.034, tilt, 14); C(m, 0.012, 0.016, 0.02, RD, 0, -0.205, 0.054, tilt, 12); S(m, 0.008, RD, 0, -0.12, 0.016, [1, 1, 0.4]);
    return { ...g, muzzle: [0, 0.056, -0.232], eject: [0.02, 0.064, -0.05], sight: [0, 0.082, 0.018], fore: [0, -0.012, -0.13], magAt: [0, -0.1, 0.03], magDir: [0, -1, 0.22], actK: 'slide', actLen: 0.03, len: 0.3 }; },
  mustard() { const g = kit(), b = g.body, a = g.act, m = g.mag, YL = 0xffc400, Y2 = 0xd9a000, RD = 0xd32f2f, WD = 0x8a5a2e, W2 = 0x6a4020, BK = 0x18191b, ST = 0xb0b4ba;
    // the frame, the top strap, the hammer, the trigger, a wooden grip with grooves
    B(b, 0.032, 0.05, 0.08, YL, 0, 0.04, -0.03); B(b, 0.026, 0.014, 0.12, Y2, 0, 0.083, -0.06); B(b, 0.01, 0.02, 0.02, BK, 0, 0.088, 0.016, [-0.5, 0, 0]); B(b, 0.008, 0.01, 0.01, BK, 0, 0.096, 0.004);
    T(b, 0.02, 0.004, BK, 0, 0.004, -0.02, YZ, Math.PI); B(b, 0.005, 0.02, 0.006, ST, 0, 0.004, -0.016, [0.3, 0, 0]);
    B(b, 0.034, 0.1, 0.042, WD, 0, -0.035, 0.015, [0.3, 0, 0]); for (let i = 0; i < 5; i++) B(b, 0.036, 0.004, 0.036, W2, 0, -0.07 + i * 0.016, 0.02, [0.3, 0, 0]); S(b, 0.022, WD, 0, -0.085, 0.034, [0.8, 0.6, 1]);
    // the barrel: a squeezy mustard bottle's nozzle, a red tip, a sight on the end
    C(b, 0.018, 0.022, 0.2, YL, 0, 0.058, -0.17, X, 14); C(b, 0.008, 0.018, 0.06, Y2, 0, 0.058, -0.3, X, 12); C(b, 0.005, 0.008, 0.02, RD, 0, 0.058, -0.338, X, 10); B(b, 0.006, 0.016, 0.01, BK, 0, 0.082, -0.25);
    B(b, 0.012, 0.004, 0.18, Y2, 0, 0.079, -0.17); B(b, 0.024, 0.008, 0.04, Y2, 0, 0.03, -0.1);
    // the cylinder (it swings out): six chambers, little pots of mustard in them
    C(a, 0.032, 0.032, 0.062, ST, 0, 0.05, -0.03, X, 18); for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2; C(a, 0.008, 0.008, 0.064, BK, Math.cos(ang) * 0.019, 0.05 + Math.sin(ang) * 0.019, -0.03, X, 8); B(a, 0.004, 0.006, 0.05, 0x8a8e94, Math.cos(ang + 0.52) * 0.031, 0.05 + Math.sin(ang + 0.52) * 0.031, -0.03); }
    // the speedloader (only seen in a reload): six mustard pots round a knob
    C(m, 0.012, 0.012, 0.03, BK, 0, 0, 0.022, X, 10); for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2; C(m, 0.0075, 0.0075, 0.03, YL, Math.cos(ang) * 0.019, Math.sin(ang) * 0.019, 0, X, 8); C(m, 0.008, 0.008, 0.006, RD, Math.cos(ang) * 0.019, Math.sin(ang) * 0.019, -0.017, X, 8); }
    return { ...g, muzzle: [0, 0.058, -0.35], eject: [-0.03, 0.05, -0.03], sight: [0, 0.092, 0.01], fore: [-0.02, -0.045, 0.012], magAt: [0, 0.05, 0.02], magDir: [-0.4, -1, 0.3], actK: 'cyl', actLen: 0.045, cylAt: [0, 0.05, -0.03], hideMag: true, len: 0.38 }; },
  cheese() { const g = kit(), b = g.body, a = g.act, m = g.mag, YL = 0xffc107, Y2 = 0xe0a000, BK = 0x1a1a1c, OR = 0xff9800, WH = 0xf4f4f0, BL = 0x1565c0, ST = 0x8a9098;
    B(b, 0.05, 0.068, 0.24, YL, 0, 0.034, -0.05); B(b, 0.052, 0.01, 0.2, Y2, 0, 0.0, -0.05); B(b, 0.02, 0.008, 0.22, BK, 0, 0.072, -0.05);      // body, top rail
    for (let i = 0; i < 12; i++) B(b, 0.022, 0.006, 0.006, BK, 0, 0.078, 0.05 - i * 0.017);
    for (let i = 0; i < 5; i++) S(b, 0.006 + (i % 2) * 0.003, 0xfff3b0, 0.026, 0.02 + (i % 3) * 0.012, -0.12 + i * 0.035, [0.3, 1, 1]);      // (holes in the cheese)
    C(b, 0.022, 0.022, 0.13, 0x333333, 0, 0.05, -0.23, X, 14); for (let i = 0; i < 4; i++) for (const s of [-1, 1]) B(b, 0.004, 0.012, 0.016, BK, s * 0.021, 0.05, -0.19 - i * 0.026);      // vented shroud
    C(b, 0.008, 0.012, 0.03, WH, 0, 0.05, -0.31, X, 10); B(b, 0.004, 0.01, 0.012, 0xff3b3b, 0, 0.062, -0.31);      // the aerosol nozzle on the end
    B(b, 0.016, 0.02, 0.03, BK, 0, 0.09, -0.02); B(b, 0.012, 0.012, 0.004, 0xff2020, 0, 0.096, -0.035);      // a little red dot
    B(b, 0.032, 0.085, 0.04, BK, 0, -0.04, 0.05, [0.32, 0, 0]); B(b, 0.026, 0.06, 0.03, BK, 0, -0.025, -0.17);      // grip, foregrip
    for (const s of [-1, 1]) C(b, 0.004, 0.004, 0.16, ST, s * 0.018, 0.03, 0.15, X, 6); B(b, 0.046, 0.06, 0.012, BK, 0, 0.02, 0.23);      // the wire stock
    T(b, 0.018, 0.004, BK, 0, -0.006, -0.0, YZ, Math.PI); B(b, 0.02, 0.02, 0.05, Y2, 0, -0.02, -0.08);      // (the magazine well)
    B(a, 0.012, 0.012, 0.03, BK, -0.03, 0.05, 0.02); B(a, 0.02, 0.008, 0.008, BK, -0.04, 0.05, 0.03);      // the cocking handle (left side)
    // the magazine: a can of squirty cheese (cap, blue band, a squiggle of cheese down its side)
    C(m, 0.02, 0.02, 0.15, OR, 0, -0.07, -0.08, [-0.15, 0, 0], 16); C(m, 0.0205, 0.0205, 0.03, BL, 0, -0.08, -0.078, [-0.15, 0, 0], 16); C(m, 0.016, 0.02, 0.02, WH, 0, -0.152, -0.067, [-0.15, 0, 0], 14);
    for (let i = 0; i < 4; i++) S(m, 0.007, YL, 0.02, -0.03 - i * 0.02, -0.084 + i * 0.003, [0.6, 1, 1]);
    return { ...g, muzzle: [0, 0.05, -0.33], eject: [0.03, 0.06, -0.03], sight: [0, 0.097, -0.03], fore: [0, -0.03, -0.17], magAt: [0, -0.08, -0.08], magDir: [0, -1, -0.15], actK: 'charge', actLen: 0.05, len: 0.5 }; },
  beans() { const g = kit(), b = g.body, a = g.act, m = g.mag, DK = 0x34363a, BK = 0x18191b, WD = 0x8a5a2e, WD2 = 0x6a4020, OR = 0xff7a1a, BL = 0x1e4ea8, SV = 0xc0c4c8;
    B(b, 0.05, 0.062, 0.18, DK, 0, 0.03, -0.02); B(b, 0.052, 0.012, 0.07, BK, 0, 0.03, -0.01); B(b, 0.022, 0.012, 0.05, 0x5a5e66, 0.02, 0.0, -0.02);      // receiver, ejection port, loading port
    C(b, 0.016, 0.016, 0.5, BK, 0, 0.056, -0.35, X, 14); S(b, 0.007, 0xffd400, 0, 0.076, -0.59); B(b, 0.008, 0.006, 0.44, 0x2a2c30, 0, 0.074, -0.36);      // barrel, bead sight, rib
    // the tube magazine: a tin of beans (orange label, a blue band, silver rims), beans spilling out the end of the barrel
    C(b, 0.026, 0.026, 0.27, OR, 0, 0.008, -0.27, X, 18); C(b, 0.0265, 0.0265, 0.04, BL, 0, 0.008, -0.27, X, 18); for (const z of [-0.135, -0.405]) C(b, 0.028, 0.028, 0.012, SV, 0, 0.008, z, X, 18);
    for (let i = 0; i < 6; i++) S(b, 0.006, 0xd9541e, 0.027, 0.012 + Math.sin(i * 2.1) * 0.008, -0.2 - i * 0.025, [0.4, 0.7, 1.2]);
    for (let i = 0; i < 5; i++) S(b, 0.008, 0xd9541e, Math.sin(i * 2.1) * 0.01, 0.056 + Math.cos(i * 1.7) * 0.01, -0.6 - i * 0.006, [1, 0.8, 1.4]);
    // stock and grip in wood with a rubber butt pad, a shell holder on the stock (tins of beans)
    B(b, 0.042, 0.075, 0.24, WD, 0, -0.012, 0.17, [0.12, 0, 0]); B(b, 0.046, 0.085, 0.02, BK, 0, -0.026, 0.29, [0.12, 0, 0]); B(b, 0.036, 0.09, 0.045, WD, 0, -0.04, 0.05, [0.35, 0, 0]);
    for (let i = 0; i < 4; i++) C(b, 0.008, 0.008, 0.02, OR, 0.026, -0.01, 0.12 + i * 0.024, ZX, 8);
    T(b, 0.02, 0.004, BK, 0, -0.006, -0.03, YZ, Math.PI); B(b, 0.005, 0.02, 0.006, SV, 0, -0.01, -0.028, [0.3, 0, 0]);
    // the pump (it moves): wood with its grooves
    B(a, 0.056, 0.05, 0.13, WD, 0, 0.008, -0.26); for (let i = 0; i < 5; i++) B(a, 0.058, 0.004, 0.006, WD2, 0, 0.02 - i * 0.006, -0.22 - i * 0.02); C(a, 0.004, 0.004, 0.2, SV, 0.02, 0.03, -0.14, X, 6);
    return { ...g, muzzle: [0, 0.056, -0.61], eject: [0.03, 0.04, -0.02], sight: [0, 0.08, 0.06], fore: [0, -0.01, -0.26], magAt: [0.02, 0.0, -0.02], magDir: [0, -1, 0], actK: 'pump', actLen: 0.08, shell: true, len: 0.9 }; },
  monstor() { const g = kit(), b = g.body, a = g.act, m = g.mag, BK = 0x141416, DK = 0x26282c, GN = 0x7cff3a, SV = 0xbfc4ca;
    B(b, 0.05, 0.05, 0.22, DK, 0, 0.032, -0.05); B(b, 0.046, 0.04, 0.16, BK, 0, -0.004, -0.04); B(b, 0.04, 0.04, 0.05, DK, 0, -0.03, -0.09);      // upper, lower, mag well
    B(b, 0.018, 0.01, 0.34, BK, 0, 0.062, -0.14); for (let i = 0; i < 16; i++) B(b, 0.022, 0.005, 0.008, DK, 0, 0.068, 0.02 - i * 0.02);      // the top rail
    C(b, 0.028, 0.028, 0.22, BK, 0, 0.034, -0.27, [Math.PI / 2, 0, Math.PI / 8], 8); for (let i = 0; i < 3; i++) B(b, 0.058, 0.006, 0.02, GN, 0, 0.034, -0.2 - i * 0.06);      // handguard, green bands
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) B(b, 0.004, 0.01, 0.022, DK, s * 0.029, 0.034, -0.19 - i * 0.04);
    C(b, 0.01, 0.01, 0.12, BK, 0, 0.034, -0.44, X, 12); C(b, 0.016, 0.016, 0.04, DK, 0, 0.034, -0.51, X, 10); for (let i = 0; i < 4; i++) B(b, 0.034, 0.004, 0.006, BK, 0, 0.034, -0.5 + i * 0.008, [0, 0, i * 0.8]); B(b, 0.006, 0.04, 0.01, BK, 0, 0.07, -0.38);      // barrel, flash hider, front post
    // a red dot sight on the rail: the body, a green lens, its dot
    B(b, 0.036, 0.008, 0.07, BK, 0, 0.072, -0.02); for (const s of [-1, 1]) B(b, 0.006, 0.04, 0.05, BK, s * 0.017, 0.092, -0.02); B(b, 0.036, 0.006, 0.05, BK, 0, 0.114, -0.02); S(b, 0.0022, 0xff2020, 0, 0.096, -0.043);
    B(b, 0.034, 0.09, 0.044, BK, 0, -0.045, 0.05, [0.3, 0, 0]); B(b, 0.042, 0.06, 0.2, BK, 0, 0.01, 0.18); for (const sd of [-1, 1]) B(b, 0.004, 0.012, 0.16, GN, sd * 0.022, 0.015, 0.18); B(b, 0.046, 0.075, 0.02, DK, 0, 0.008, 0.285);      // grip, stock, stripe, butt
    B(b, 0.028, 0.04, 0.03, BK, 0, -0.03, -0.24, [-0.3, 0, 0]); T(b, 0.018, 0.004, BK, 0, -0.01, -0.01, YZ, Math.PI); B(b, 0.008, 0.016, 0.04, SV, 0.026, 0.035, -0.05);      // angled foregrip, guard, ejection port
    B(a, 0.016, 0.01, 0.04, BK, 0, 0.06, 0.07); B(a, 0.05, 0.01, 0.012, BK, 0, 0.06, 0.088);      // the charging handle (it's pulled)
    // the magazine: a can of MONSTOR (black, three green claw marks, silver rims)
    C(m, 0.028, 0.028, 0.13, BK, 0, -0.075, -0.09, [-0.12, 0, 0], 18); for (const y of [-0.012, -0.138]) C(m, 0.026, 0.026, 0.008, SV, 0, y, -0.09 + (y + 0.075) * 0.12, [-0.12, 0, 0], 18);
    for (let i = 0; i < 3; i++) B(m, 0.006, 0.09, 0.006, GN, 0.028, -0.075, -0.1 + i * 0.012, [-0.12, 0, 0.18 * (i - 1)]); C(m, 0.008, 0.008, 0.006, SV, 0.012, -0.006, -0.1, null, 8);
    return { ...g, muzzle: [0, 0.034, -0.54], eject: [0.03, 0.035, -0.05], sight: [0, 0.096, -0.02], fore: [0, -0.04, -0.24], magAt: [0, -0.08, -0.09], magDir: [0, -1, -0.12], actK: 'charge', actLen: 0.06, len: 0.82 }; },
  baguette() { const g = kit(), b = g.body, a = g.act, m = g.mag, BG = 0xd9a35b, B2 = 0xb07a3a, CR = 0xf3dfb2, BK = 0x141416, DK = 0x26282c, FL = 0xc9ced4, YL = 0xffe27a;
    // a long stale baguette for the barrel and handguard (its slashes, a crusty end), a black receiver in the middle
    C(b, 0.03, 0.03, 0.5, BG, 0, 0.04, -0.34, X, 14); S(b, 0.03, B2, 0, 0.04, -0.59, [1, 1, 1.3]); for (let i = 0; i < 6; i++) B(b, 0.02, 0.006, 0.05, CR, 0, 0.068, -0.16 - i * 0.07, [0, 0.5, 0]);
    C(b, 0.01, 0.01, 0.08, BK, 0, 0.04, -0.62, X, 10); B(b, 0.03, 0.022, 0.03, DK, 0, 0.04, -0.67); for (const s of [-1, 1]) B(b, 0.004, 0.014, 0.02, BK, s * 0.016, 0.04, -0.67);      // the barrel's tip, a muzzle brake
    B(b, 0.05, 0.06, 0.2, BK, 0, 0.03, -0.02); B(b, 0.044, 0.04, 0.05, DK, 0, -0.01, -0.07); B(b, 0.016, 0.01, 0.2, DK, 0, 0.065, -0.05);
    // a holographic sight: its window and a red ring
    B(b, 0.04, 0.008, 0.06, BK, 0, 0.074, -0.04); for (const s of [-1, 1]) B(b, 0.006, 0.042, 0.04, BK, s * 0.019, 0.098, -0.04); B(b, 0.04, 0.006, 0.04, BK, 0, 0.12, -0.04); T(b, 0.006, 0.0012, 0xff3030, 0, 0.1, -0.057, null); S(b, 0.0012, 0xff3030, 0, 0.1, -0.057);
    // the stock: the other end of the loaf, a grip, the trigger
    B(b, 0.034, 0.09, 0.044, BK, 0, -0.045, 0.05, [0.3, 0, 0]); C(b, 0.032, 0.036, 0.22, BG, 0, 0.015, 0.18, X, 12); S(b, 0.036, B2, 0, 0.015, 0.29, [1, 1.1, 0.6]); B(b, 0.04, 0.012, 0.1, CR, 0, 0.044, 0.18, [0, 0.3, 0]);
    T(b, 0.018, 0.004, BK, 0, -0.012, -0.012, YZ, Math.PI); B(b, 0.026, 0.05, 0.03, DK, 0, -0.03, -0.22);
    B(a, 0.012, 0.012, 0.03, BK, 0.034, 0.04, -0.05); C(a, 0.008, 0.008, 0.012, DK, 0.044, 0.04, -0.05, ZX, 8);      // the cocking handle (right side)
    // the magazine: a block of butter in its foil
    B(m, 0.03, 0.1, 0.05, FL, 0, -0.07, -0.08, [-0.1, 0, 0]); B(m, 0.031, 0.03, 0.051, YL, 0, -0.11, -0.084, [-0.1, 0, 0]); B(m, 0.032, 0.012, 0.04, 0x2a5fb5, 0, -0.06, -0.079, [-0.1, 0, 0]);
    return { ...g, muzzle: [0, 0.04, -0.69], eject: [0.03, 0.04, -0.03], sight: [0, 0.1, -0.04], fore: [0, -0.03, -0.22], magAt: [0, -0.08, -0.08], magDir: [0, -1, -0.1], actK: 'charge', actLen: 0.05, len: 0.96 }; },
  sausage() { const g = kit(), b = g.body, a = g.act, m = g.mag, WD = 0x7a4a26, WD2 = 0x5a3418, GR = 0x2e4a2e, BK = 0x111214, SS = 0x9a5a3a, SS2 = 0x7a3f22, MU = 0xffd21a;
    B(b, 0.046, 0.06, 0.22, GR, 0, 0.04, -0.06); B(b, 0.04, 0.09, 0.3, WD, 0, -0.005, 0.2, [0.06, 0, 0]); B(b, 0.042, 0.03, 0.18, WD2, 0, 0.045, 0.17);      // receiver, stock, cheek riser
    B(b, 0.046, 0.1, 0.022, BK, 0, -0.01, 0.35, [0.06, 0, 0]); B(b, 0.034, 0.08, 0.04, WD, 0, -0.04, 0.03, [0.35, 0, 0]); for (let i = 0; i < 4; i++) B(b, 0.036, 0.004, 0.03, WD2, 0, -0.07 + i * 0.016, 0.04, [0.35, 0, 0]);      // butt pad, grip
    // the barrel: a long sausage with its grill marks and the twists of the links, a squiggle of mustard down the top
    C(b, 0.021, 0.021, 0.62, SS, 0, 0.05, -0.47, X, 16); S(b, 0.021, SS, 0, 0.05, -0.78); for (const z of [-0.3, -0.55]) T(b, 0.02, 0.006, SS2, 0, 0.05, z, null);
    for (let i = 0; i < 8; i++) B(b, 0.044, 0.004, 0.006, SS2, 0, 0.05, -0.2 - i * 0.07, [0, 0, 0]);
    for (let i = 0; i < 14; i++) B(b, 0.008, 0.005, 0.05, MU, (i % 2 ? 1 : -1) * 0.006, 0.071, -0.2 - i * 0.04, [0, (i % 2 ? 1 : -1) * 0.6, 0]);
    // the scope: tube, bells, lenses, the turrets, the rings that hold it
    C(b, 0.017, 0.017, 0.24, BK, 0, 0.115, -0.08, X, 16); C(b, 0.026, 0.017, 0.06, BK, 0, 0.115, -0.22, X, 16); C(b, 0.022, 0.017, 0.05, BK, 0, 0.115, 0.06, X, 16);
    C(b, 0.023, 0.023, 0.003, 0x3a7aa8, 0, 0.115, -0.251, X, 16); C(b, 0.019, 0.019, 0.003, 0x3a7aa8, 0, 0.115, 0.086, X, 16);
    C(b, 0.008, 0.008, 0.02, 0x333333, 0, 0.14, -0.08, null, 10); C(b, 0.008, 0.008, 0.02, 0x333333, 0.024, 0.115, -0.08, ZX, 10);
    for (const z of [-0.14, -0.02]) { T(b, 0.019, 0.004, BK, 0, 0.115, z, null); B(b, 0.014, 0.03, 0.012, BK, 0, 0.088, z); }
    for (const s of [-1, 1]) C(b, 0.005, 0.005, 0.2, BK, s * 0.012, 0.03, -0.6, [Math.PI / 2 - 0.15, 0, s * 0.12], 6);      // folded bipod
    B(b, 0.03, 0.05, 0.05, BK, 0, -0.005, -0.1); T(b, 0.02, 0.004, BK, 0, 0.0, -0.02, YZ, Math.PI);
    // the bolt (it's worked between shots): its handle, a knob on the end
    C(a, 0.012, 0.012, 0.08, 0x8a9098, 0, 0.06, 0.0, X, 10); C(a, 0.005, 0.005, 0.05, 0x8a9098, 0.035, 0.06, 0.02, ZX, 8); S(a, 0.01, BK, 0.062, 0.06, 0.02);
    // the magazine: a little tin of hot dogs
    B(m, 0.036, 0.05, 0.07, 0xb3261e, 0, -0.045, -0.1); B(m, 0.037, 0.016, 0.06, 0xffd21a, 0, -0.045, -0.1); B(m, 0.038, 0.006, 0.072, 0xc0c4c8, 0, -0.07, -0.1);
    return { ...g, muzzle: [0, 0.05, -0.8], eject: [0.03, 0.06, -0.01], sight: [0, 0.115, 0.06], fore: [0, -0.01, -0.3], magAt: [0, -0.05, -0.1], magDir: [0, -1, 0], actK: 'bolt', actLen: 0.06, actAt: [0, 0.06, 0.0], len: 1.15 }; },
  gravy() { const g = kit(), b = g.body, a = g.act, m = g.mag, MT = 0x5a5e66, DK = 0x2a2c30, WH = 0xf4f2ea, GV = 0x6d3b1f, BR = 0xb08d57;
    C(b, 0.06, 0.06, 0.24, MT, 0, 0.03, -0.02, X, 18); C(b, 0.064, 0.064, 0.02, DK, 0, 0.03, 0.1, X, 18); C(b, 0.03, 0.03, 0.04, DK, 0, 0.03, -0.15, X, 14);      // the body
    for (let i = 0; i < 8; i++) B(b, 0.004, 0.124, 0.01, DK, 0, 0.03, -0.12 + i * 0.03, [0, 0, 0]);      // (cooling ribs)
    for (const z of [-0.3, -0.48]) T(b, 0.038, 0.007, DK, 0, 0.03, z, null);      // barrel clamps (the barrels spin: their own piece)
    B(b, 0.06, 0.02, 0.05, DK, -0.04, 0.05, -0.02);      // the feed into the body
    T(b, 0.06, 0.009, BR, 0, 0.09, -0.02, [0, Math.PI / 2, 0], Math.PI); for (const z of [0.06, 0.13]) B(b, 0.03, 0.09, 0.03, DK, 0, -0.04, z, [0.2, 0, 0]);      // carry handle, two grips
    B(a, 0.03, 0.016, 0.05, DK, 0, 0.1, 0.06);      // (a feed cover on top)
    // the magazine: the gravy boat drum on the side: the boat, a lip, the spout, its handle, gravy inside, a drip
    S(m, 0.07, WH, -0.1, 0.03, 0.0, [0.75, 0.6, 1.4]); B(m, 0.11, 0.008, 0.19, WH, -0.1, 0.07, 0); S(m, 0.06, GV, -0.1, 0.066, 0, [0.7, 0.08, 1.35]);
    C(m, 0.01, 0.022, 0.06, WH, -0.1, 0.07, -0.12, [-1.1, 0, 0], 10); T(m, 0.03, 0.007, WH, -0.1, 0.05, 0.1, [0, Math.PI / 2, 0], Math.PI); S(m, 0.008, GV, -0.1, 0.0, -0.08, [1, 1.8, 1]); B(m, 0.06, 0.004, 0.12, 0x2e7d32, -0.1, 0.073, 0.0);
    // the barrels: six round a ring, spun as it fires
    for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2; C(g.spin, 0.009, 0.009, 0.5, 0x232428, Math.cos(ang) * 0.026, Math.sin(ang) * 0.026, -0.36, X, 8); } C(g.spin, 0.008, 0.008, 0.5, MT, 0, 0, -0.36, X, 8);
    return { ...g, muzzle: [0, 0.03, -0.62], eject: [0.06, 0.0, 0.0], sight: [0, 0.11, 0.03], fore: [0, -0.04, 0.13], magAt: [-0.1, 0.03, 0], magDir: [-1, -0.5, 0], actK: 'none', actLen: 0, spinAt: [0, 0.03, 0], len: 0.72 }; },
  scotch() { const g = kit(), b = g.body, a = g.act, m = g.mag, OL = 0x5d5a2a, O2 = 0x46441e, BK = 0x18191b, ST = 0x8a9098, BR = 0x8a5a2e, YL = 0xffcf3a;
    // a fat short barrel (a cardboard egg box tube), a sight with a range ladder, a grip, a folding stock
    C(b, 0.048, 0.048, 0.36, OL, 0, 0.07, -0.25, X, 18); C(b, 0.052, 0.052, 0.03, O2, 0, 0.07, -0.43, X, 18); C(b, 0.04, 0.04, 0.012, BK, 0, 0.07, -0.445, X, 18);
    for (let i = 0; i < 4; i++) C(b, 0.0495, 0.0495, 0.012, O2, 0, 0.07, -0.13 - i * 0.07, X, 18);
    B(b, 0.05, 0.05, 0.16, O2, 0, 0.03, 0.03); B(b, 0.008, 0.06, 0.03, BK, 0, 0.13, -0.1); for (let i = 0; i < 4; i++) B(b, 0.03, 0.004, 0.004, YL, 0, 0.11 + i * 0.012, -0.1);
    B(b, 0.034, 0.09, 0.044, BK, 0, -0.045, 0.05, [0.3, 0, 0]); T(b, 0.018, 0.004, BK, 0, -0.01, -0.01, YZ, Math.PI); B(b, 0.026, 0.06, 0.03, BK, 0, -0.01, -0.22);
    for (const sd of [-1, 1]) C(b, 0.005, 0.005, 0.18, ST, sd * 0.018, 0.03, 0.18, X, 6); B(b, 0.05, 0.07, 0.014, BK, 0, 0.02, 0.27);
    S(b, 0.03, BR, 0, 0.07, -0.42, [1, 1, 0.5]);      // (an egg peeking out the end)
    // the drum (it swings out to reload): six scotch eggs in a revolving tin
    C(a, 0.065, 0.065, 0.1, O2, 0, 0, 0, X, 20); for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2; S(a, 0.022, BR, Math.cos(ang) * 0.04, Math.sin(ang) * 0.04, -0.045, [1, 1, 0.7]); S(a, 0.012, YL, Math.cos(ang) * 0.04, Math.sin(ang) * 0.04, -0.06, [1, 1, 0.3]); }
    for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2 + 0.52; B(a, 0.006, 0.006, 0.1, BK, Math.cos(ang) * 0.064, Math.sin(ang) * 0.064, 0); }
    // a single egg to load (seen in a reload)
    S(m, 0.024, BR, 0, 0, 0, [1, 1, 1.3]); S(m, 0.013, YL, 0, 0.0, -0.022, [1, 1, 0.4]);
    return { ...g, muzzle: [0, 0.07, -0.45], eject: [0.05, 0.05, -0.05], sight: [0, 0.16, -0.1], fore: [0, -0.03, -0.22], magAt: [0, 0.07, -0.06], magDir: [-0.4, -1, 0.3], actK: 'cyl', actLen: 0.05, cylAt: [0, 0.07, -0.06], hideMag: true, len: 0.75 }; },
  flamer() { const g = kit(), b = g.body, a = g.act, m = g.mag, RD = 0xd32f2f, R2 = 0x9a1f1f, BK = 0x18191b, ST = 0xa0a4aa, CU = 0xb87333, WH = 0xf4f4f0, GN = 0x2e7d32, BL = 0x4fc3ff;
    // a copper pipe and a flared nozzle, a heat shield, the pilot light, a front handle and a grip
    C(b, 0.016, 0.016, 0.42, CU, 0, 0.05, -0.27, X, 12); C(b, 0.034, 0.02, 0.07, ST, 0, 0.05, -0.5, X, 14); C(b, 0.036, 0.036, 0.008, BK, 0, 0.05, -0.535, X, 14);
    for (let i = 0; i < 9; i++) C(b, 0.028, 0.028, 0.008, BK, 0, 0.05, -0.18 - i * 0.03, X, 12);      // (the heat shield's fins)
    S(b, 0.008, BL, 0, 0.022, -0.52); S(b, 0.005, 0xff9f1c, 0, 0.026, -0.535);
    B(b, 0.05, 0.06, 0.18, BK, 0, 0.03, -0.02); B(b, 0.034, 0.09, 0.044, BK, 0, -0.045, 0.05, [0.3, 0, 0]); T(b, 0.018, 0.004, BK, 0, -0.01, -0.01, YZ, Math.PI);
    B(b, 0.026, 0.07, 0.03, BK, 0, 0.11, -0.18); B(b, 0.026, 0.01, 0.1, BK, 0, 0.145, -0.13);      // (the carry handle on top)
    C(b, 0.006, 0.006, 0.2, 0x333333, 0.03, 0.0, -0.06, [Math.PI / 2, 0, 0.2], 6);      // (the fuel line)
    B(b, 0.04, 0.06, 0.16, BK, 0, 0.0, 0.17);
    // the tank: a huge bottle of hot sauce slung under it (it comes off to reload): its label, its green cap
    C(m, 0.045, 0.05, 0.22, RD, 0, -0.09, -0.1, X, 18); C(m, 0.0455, 0.0455, 0.1, WH, 0, -0.09, -0.1, X, 18); S(m, 0.02, RD, 0.0, -0.09, -0.1, [1.2, 1.2, 0.2]);
    C(m, 0.02, 0.03, 0.05, R2, 0, -0.09, -0.235, X, 12); C(m, 0.02, 0.02, 0.03, GN, 0, -0.09, -0.27, X, 12); for (let i = 0; i < 3; i++) S(m, 0.008, 0xff9f1c, 0.045, -0.09 + (i - 1) * 0.014, -0.1, [0.3, 1, 1]);
    B(a, 0.03, 0.012, 0.02, BK, 0.03, 0.06, 0.03);
    return { ...g, muzzle: [0, 0.05, -0.54], eject: [0.03, 0.05, 0], sight: [0, 0.16, -0.13], fore: [0, 0.07, -0.18], magAt: [0, -0.09, -0.1], magDir: [0, -1, 0], actK: 'charge', actLen: 0.03, len: 0.75 }; },
  xbow() { const g = kit(), b = g.body, a = g.act, m = g.mag, WD = 0x8a5a2e, W2 = 0x6a4020, BK = 0x18191b, ST = 0xa0a4aa, YL = 0xffd54f, Y2 = 0xd4a017, WH = 0xf4f4f0;
    // the stock and rail in wood, a little scope, the trigger
    B(b, 0.04, 0.05, 0.5, WD, 0, 0.03, -0.12); B(b, 0.042, 0.08, 0.2, WD, 0, 0.0, 0.2, [0.08, 0, 0]); B(b, 0.044, 0.09, 0.02, BK, 0, -0.005, 0.3); B(b, 0.012, 0.006, 0.44, W2, 0, 0.058, -0.14);
    B(b, 0.034, 0.08, 0.04, WD, 0, -0.04, 0.03, [0.35, 0, 0]); T(b, 0.018, 0.004, BK, 0, -0.005, -0.01, YZ, Math.PI);
    C(b, 0.014, 0.014, 0.16, BK, 0, 0.1, -0.02, X, 12); for (const z of [-0.07, 0.03]) B(b, 0.01, 0.04, 0.01, BK, 0, 0.075, z); C(b, 0.015, 0.015, 0.003, 0x3a7aa8, 0, 0.1, -0.1, X, 12);
    // the bow: two arms (a giant wooden fork, both prongs), a steel string
    for (const sd of [-1, 1]) { B(b, 0.26, 0.022, 0.03, Y2, sd * 0.13, 0.04, -0.36, [0, sd * 0.35, 0]); S(b, 0.012, ST, sd * 0.25, 0.04, -0.27); }
    B(b, 0.06, 0.04, 0.05, ST, 0, 0.04, -0.37);
    for (const sd of [-1, 1]) C(a, 0.002, 0.002, 0.29, 0xdddddd, sd * 0.125, 0.045, -0.2, [0, 0, Math.PI / 2 + sd * 0.95], 4);      // (the string: drawn back)
    // the chip on the rail: a fat chip on a little fork
    C(m, 0.008, 0.008, 0.18, YL, 0, 0.068, -0.2, X, 6); for (const sd of [-1, 0, 1]) C(m, 0.0015, 0.0015, 0.04, ST, sd * 0.004, 0.068, -0.31, X, 4); B(m, 0.008, 0.008, 0.02, WH, 0, 0.068, -0.12);
    return { ...g, muzzle: [0, 0.068, -0.3], eject: [0.02, 0.05, -0.1], sight: [0, 0.1, 0.03], fore: [0, -0.01, -0.25], magAt: [0, 0.068, -0.2], magDir: [0.3, 1, 0], actK: 'none', actLen: 0, shell: true, len: 0.8 }; },
};
const gunCache = {};
const mg = (ps) => ps.length ? merge(ps) : null;
// one gun's model: geometries for its parts and where things are on it (built once each)
export function gunModel(id) {
  if (gunCache[id]) return gunCache[id]; const f = GUN_BUILD[id] || GUN_BUILD.ketchup, d = f();
  const geos = { body: mg(d.body), mag: mg(d.mag), act: mg(d.act), spin: mg(d.spin) }; geos.body.computeBoundingBox();
  const V = (a) => a ? new THREE.Vector3(...a) : null, bb = geos.body.boundingBox;
  return (gunCache[id] = { geos, muzzle: V(d.muzzle), eject: V(d.eject), sight: V(d.sight), fore: V(d.fore), magAt: V(d.magAt), magDir: V(d.magDir).normalize(), act: d.actK, actLen: d.actLen, actAt: V(d.actAt), cylAt: V(d.cylAt), spinAt: V(d.spinAt),
    hideMag: !!d.hideMag, shell: !!d.shell, len: d.len, rear: bb.max.z, front: bb.min.z });
}
// a gun as a thing in the world: a Group of its parts (named body, mag, act, spin) so it can be taken apart.
// Shiny (the Phong vertex-colour material the game already has)
export function newGun(id) {
  const m = gunModel(id), g = new THREE.Group(); g.name = 'gun ' + id;
  const add = (k, geo) => { if (!geo) return null; const ms = new THREE.Mesh(geo, vcPhong); ms.name = k; g.add(ms); return ms; };
  add('body', m.geos.body);
  // (the parts that turn are built round their own middle so they turn on the spot)
  const mag = add('mag', m.geos.mag), act = add('act', m.geos.act), spin = add('spin', m.geos.spin);
  if (spin && m.spinAt) spin.position.copy(m.spinAt);
  const piv = act && (m.act === 'cyl' ? m.cylAt : m.act === 'bolt' ? m.actAt : null); if (piv) { act.geometry = m.pivGeo || (m.pivGeo = act.geometry.clone().translate(-piv.x, -piv.y, -piv.z)); act.position.copy(piv); }
  if (mag && m.hideMag) mag.visible = false;
  g.userData = { gun: id, muzzle: m.muzzle, eject: m.eject, sight: m.sight, fore: m.fore, model: m, parts: { body: g.getObjectByName('body'), mag, act, spin }, rest: { mag: mag ? mag.position.clone() : null, act: act ? act.position.clone() : null } };
  return g;
}
// a shotgun shell for the one-at-a-time reload (a little tin of beans)
let shellGeo = null;
export function beanShellGeo() { if (shellGeo) return shellGeo; const p = []; C(p, 0.011, 0.011, 0.03, 0xff7a1a, 0, 0, 0, X, 10); C(p, 0.0112, 0.0112, 0.008, 0x1e4ea8, 0, 0, 0, X, 10); for (const z of [-0.015, 0.015]) C(p, 0.012, 0.012, 0.003, 0xc0c4c8, 0, 0, z, X, 10); return (shellGeo = merge(p)); }
// the things the launcher and the crossbow fire: a scotch egg (breadcrumbs outside), a chip on a fork
let projG = {};
export function projGeo(kind) { if (projG[kind]) return projG[kind]; const p = [];
  if (kind === 'bolt') { C(p, 0.009, 0.009, 0.2, 0xffd54f, 0, 0, 0, X, 6); for (const sd of [-1, 0, 1]) C(p, 0.0015, 0.0015, 0.04, 0xa0a4aa, sd * 0.004, 0, -0.11, X, 4); }
  else { S(p, 0.055, 0x9a5a2a, 0, 0, 0, [1, 1, 1.25]); for (let i = 0; i < 10; i++) S(p, 0.01, 0xc8823a, Math.cos(i * 2.4) * 0.048, Math.sin(i * 1.7) * 0.04, Math.sin(i * 2.9) * 0.05); }
  return (projG[kind] = merge(p)); }
// an empty: a little brass tube (tinted per gun: instanced)
export function casingGeo() { return cyl(0.006, 0.006, 0.022, 7).rotateX(Math.PI / 2); }

// ---- the hands that hold your gun on a phone or computer: a sleeve in your team's colour, a white cuff, your skin.
// Real sizes (the gun's drawn at real size too), the arm going back and down out of the bottom of the screen
const _qa = new THREE.Quaternion(), _ea = new THREE.Euler(), _ya = new THREE.Vector3(0, 1, 0);
function seg(p, a, b, r0, r1, c, n = 12) { const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length(); _qa.setFromUnitVectors(_ya, d.normalize()); _ea.setFromQuaternion(_qa);
  p.push(part(cyl(r1, r0, L, n), c, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [_ea.x, _ea.y, _ea.z])); }
const handCache = {};
export function handGeos(skin, sleeve) {
  const key = skin + '|' + sleeve; if (handCache[key]) return handCache[key]; const CF = 0xf4f4f0, NL = 0xf6dccb;
  // the right hand round the grip: the back of the hand on the outside, four fingers wrapped round the front, the thumb
  // over the top on the far side; the left hand cupped under the front of the gun
  const right = () => { const p = [];
    B(p, 0.024, 0.08, 0.075, skin, 0.03, -0.035, 0.02, [0.25, 0, 0]); B(p, 0.03, 0.075, 0.03, skin, 0.0, -0.035, 0.05, [0.25, 0, 0]);
    for (let i = 0; i < 4; i++) { const y = -0.008 - i * 0.019; seg(p, [0.034, y, -0.012], [-0.022, y + 0.004, -0.024], 0.0095, 0.009, skin, 8); S(p, 0.0092, skin, -0.024, y + 0.004, -0.02); B(p, 0.004, 0.012, 0.01, NL, -0.03, y + 0.004, -0.024); }
    seg(p, [0.02, -0.01, 0.04], [-0.022, 0.008, -0.004], 0.011, 0.0095, skin, 8); S(p, 0.0098, skin, -0.024, 0.008, -0.006);      // the thumb
    seg(p, [0.022, -0.06, 0.05], [0.07, -0.17, 0.26], 0.03, 0.036, skin); seg(p, [0.06, -0.15, 0.22], [0.075, -0.18, 0.28], 0.04, 0.04, CF);
    seg(p, [0.07, -0.17, 0.26], [0.13, -0.3, 0.56], 0.045, 0.052, sleeve); S(p, 0.05, sleeve, 0.13, -0.3, 0.56);
    return merge(p); };
  const left = () => { const p = [];
    B(p, 0.075, 0.024, 0.08, skin, -0.004, -0.012, 0.0, [0, 0.15, 0.25]); for (let i = 0; i < 4; i++) { const z = -0.028 + i * 0.019; seg(p, [-0.03, -0.012, z], [0.034, 0.02, z], 0.009, 0.0085, skin, 8); S(p, 0.0088, skin, 0.036, 0.022, z); }
    seg(p, [-0.03, -0.005, 0.03], [-0.034, 0.03, -0.02], 0.011, 0.0095, skin, 8);
    seg(p, [-0.01, -0.025, 0.02], [-0.12, -0.15, 0.24], 0.03, 0.036, skin); seg(p, [-0.11, -0.14, 0.22], [-0.13, -0.16, 0.27], 0.04, 0.04, CF);
    seg(p, [-0.12, -0.15, 0.25], [-0.24, -0.29, 0.52], 0.045, 0.052, sleeve); S(p, 0.05, sleeve, -0.24, -0.29, 0.52);
    return merge(p); };
  return (handCache[key] = { r: right(), l: left() });
}

// ---- the pick-ups. Each one model, about the size of a shoebox, sat on a little plinth over a glowing ring
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
  p_reload() { const p = [], GD = 0xffc83a, WH = 0xfffdf4, BK = 0x111111;
    C(p, 0.11, 0.11, 0.04, GD, 0, 0.2, 0, X, 24); C(p, 0.095, 0.095, 0.042, WH, 0, 0.2, 0, X, 24); C(p, 0.02, 0.02, 0.05, GD, 0, 0.33, 0, null, 10); C(p, 0.03, 0.03, 0.02, GD, 0, 0.36, 0, null, 12);
    B(p, 0.008, 0.07, 0.006, BK, 0, 0.23, 0.024); B(p, 0.05, 0.008, 0.006, 0xff3b3b, 0.02, 0.2, 0.024); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; B(p, 0.006, 0.016, 0.004, BK, Math.sin(a) * 0.08, 0.2 + Math.cos(a) * 0.08, 0.023, [0, 0, -a]); } return p; },
  p_speed() { const p = [], BK = 0x111214, GN = 0x7cff3a, SV = 0xc0c4c8;
    C(p, 0.065, 0.065, 0.24, BK, 0, 0.16, 0, null, 20); for (const y of [0.04, 0.28]) C(p, 0.06, 0.065, 0.012, SV, 0, y, 0, null, 20); C(p, 0.012, 0.012, 0.01, SV, 0.02, 0.29, 0, null, 8);
    for (let i = 0; i < 3; i++) B(p, 0.012, 0.16, 0.012, GN, -0.02 + i * 0.022, 0.16, 0.062, [0, 0, 0.2]);
    B(p, 0.05, 0.11, 0.02, 0xffd400, 0.12, 0.2, 0, [0, 0, 0.4]); B(p, 0.05, 0.11, 0.02, 0xffd400, 0.14, 0.12, 0, [0, 0, 0.4]); return p; },
  p_dmg() { const p = [], RD = 0xc62828, GN = 0x2e7d32, WH = 0xfff8e1;
    C(p, 0.05, 0.055, 0.2, RD, 0, 0.12, 0, null, 18); S(p, 0.05, RD, 0, 0.22, 0, [1, 0.6, 1]); C(p, 0.018, 0.024, 0.08, RD, 0, 0.27, 0, null, 12); C(p, 0.02, 0.02, 0.04, GN, 0, 0.33, 0, null, 12);
    C(p, 0.0505, 0.0555, 0.09, WH, 0, 0.12, 0, null, 18); S(p, 0.022, 0xff6d00, 0, 0.13, 0.045, [1, 1.4, 0.4]); S(p, 0.013, 0xffd400, 0, 0.12, 0.052, [1, 1.3, 0.4]); return p; },
  p_defuse() { const p = [], RD = 0xd32f2f, MT = 0x9aa0a6, BK = 0x222222;
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
// the little plinth every pick-up sits on: a crate lid on a short stack of pallet boards, hazard stripes round it
export function plinthGeo() {
  const p = [], WD = 0x9a6a3a, W2 = 0x7a4e26, YL = 0xffd400, BK = 0x1a1a1a;
  C(p, 0.3, 0.33, 0.05, W2, 0, 0.025, 0, null, 8); C(p, 0.27, 0.3, 0.04, WD, 0, 0.07, 0, null, 8);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; B(p, 0.11, 0.022, 0.012, i % 2 ? BK : YL, Math.cos(a) * 0.31, 0.03, Math.sin(a) * 0.31, [0, -a + Math.PI / 2, 0]); }
  return merge(p);
}

// ---- THE VINDALOO: a proper bomb. A bundle of red dynamite sticks taped together (black tape, the fuses), a timer box
// strapped on top with its screen (the seconds left: a little picture of its own), a keypad, wires everywhere and two
// lights that blink (their own bright bit). The curry's only in the name: an orange sticker, "VINDALOO", on the box
export const BOMB_FACE = [0, 0.19, 0.072];
export function bombGeo() {
  const p = [], RD = 0xc62828, R2 = 0x8e1b1b, BK = 0x141414, TP = 0x262626, GY = 0x5a5e66, CR = 0xf0e0b0, OR = 0xff8f00;
  for (let row = 0; row < 2; row++) for (let i = 0; i < 4 - row; i++) { const x = (i - (3 - row) / 2) * 0.062, y = 0.031 + row * 0.054; C(p, 0.03, 0.03, 0.3, RD, x, y, 0, X, 14); for (const z of [-0.15, 0.15]) C(p, 0.031, 0.031, 0.012, R2, x, y, z, X, 14); C(p, 0.003, 0.003, 0.04, CR, x, y, -0.172, X, 5); }      // the sticks, their ends, fuses
  for (const z of [-0.09, 0.09]) T(p, 0.135, 0.012, TP, 0, 0.06, z, null);      // the tape round them
  for (let i = 0; i < 4; i++) B(p, 0.01, 0.02, 0.05, CR, (i - 1.5) * 0.062, 0.031, 0.03);      // (the "DANGER" stripes on the sticks)
  // the timer box strapped on top, its screen frame, a keypad, a sticker
  B(p, 0.17, 0.07, 0.12, BK, 0, 0.155, 0.01); B(p, 0.13, 0.05, 0.004, GY, 0, 0.19, 0.071); B(p, 0.08, 0.03, 0.04, GY, 0.0, 0.192, -0.02);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) B(p, 0.016, 0.006, 0.014, 0xd0d4da, -0.03 + c * 0.02, 0.193, -0.04 + r * 0.018);
  B(p, 0.07, 0.03, 0.004, OR, 0, 0.145, 0.071); B(p, 0.004, 0.08, 0.12, GY, 0.087, 0.12, 0.01);
  // the wires: red, blue and yellow from the box down to the sticks
  for (const [i, c] of [[0, 0xff3b3b], [1, 0x2a6df4], [2, 0xffd400]]) { const x = -0.07 + i * 0.07; C(p, 0.004, 0.004, 0.09, c, x, 0.12, 0.08, [0.5, 0, 0], 5); T(p, 0.025, 0.004, c, x, 0.09, 0.095, [0, Math.PI / 2, 0], Math.PI); }
  return merge(p);
}
// the box's two lights (drawn bright: their own little basic-material bits)
export function bombLightGeo() { const p = []; S(p, 0.012, 0xff2020, 0.06, 0.195, 0.05); S(p, 0.012, 0xff2020, -0.06, 0.195, 0.05); return merge(p); }
// the timer's screen: the seconds left (redrawn each second), with VINDALOO above it
export function bombFace() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.userData.live = true;
  const draw = (s) => { const g = cv.getContext('2d'); g.fillStyle = '#1a0000'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#ff8f00'; g.font = '900 11px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('VINDALOO', 64, 8);
    g.fillStyle = 'rgba(255,40,40,0.18)'; g.font = '900 40px monospace'; g.fillText('88:88', 64, 38);
    g.fillStyle = '#ff3030'; g.shadowColor = '#ff0000'; g.shadowBlur = 8; g.fillText(s, 64, 38); g.shadowBlur = 0; t.needsUpdate = true; };
  draw('--:--'); return { tex: t, draw };
}
// pliers for defusing it (in your hand, or by the bomb on someone else's game)
export function pliersGeo() {
  const p = [], RD = 0xd32f2f, MT = 0x9aa0a6;
  for (const s of [-1, 1]) { B(p, 0.016, 0.1, 0.014, RD, s * 0.012, -0.06, 0, [0, 0, s * 0.18]); B(p, 0.01, 0.06, 0.01, MT, -s * 0.004, 0.02, 0, [0, 0, -s * 0.12]); }
  C(p, 0.01, 0.01, 0.018, 0x333333, 0, -0.01, 0, X, 10); return merge(p);
}

// ---- the bomb sites: a big letter painted on the floor in a hazard ring (one picture each), with props round it
export function siteTexture(letter, name) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d'), c = 256;
  g.clearRect(0, 0, 512, 512);
  // the hazard ring: yellow and black stripes round the edge, then a worn red floor with a grid of tread plates
  for (let i = 0; i < 36; i++) { g.beginPath(); g.moveTo(c, c); g.arc(c, c, 250, i / 36 * Math.PI * 2, (i + 1) / 36 * Math.PI * 2); g.closePath(); g.fillStyle = i % 2 ? '#111' : '#ffd400'; g.fill(); }
  g.beginPath(); g.arc(c, c, 222, 0, Math.PI * 2); g.fillStyle = 'rgba(200,20,20,0.55)'; g.fill();
  g.save(); g.beginPath(); g.arc(c, c, 222, 0, Math.PI * 2); g.clip(); g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 3; for (let x = -240; x <= 240; x += 40) { g.beginPath(); g.moveTo(c + x, 0); g.lineTo(c + x, 512); g.stroke(); g.beginPath(); g.moveTo(0, c + x); g.lineTo(512, c + x); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${i % 3 ? '120,40,10' : '255,200,120'},${0.08 + (i % 5) * 0.02})`; g.beginPath(); g.ellipse(c + Math.sin(i * 7.3) * 200, c + Math.cos(i * 5.1) * 200, 6 + (i % 7) * 4, 3 + (i % 4) * 3, i, 0, 7); g.fill(); } g.restore();      // (curry stains)
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
// round a site: traffic cones, hazard tape between posts, a stack of crates of curry tins and a sandwich board, all
// in one merged mesh. at: [[x, y, z, yaw, kind]...] (kind: cone, post, crate, board), tape: [[x0, z0, x1, z1, y]...]
export function siteProps(at, tape) {
  const p = [], OR = 0xff6d00, WH = 0xf4f4f0, YL = 0xffd400, BK = 0x151515, WD = 0x9a6a3a, W2 = 0x7a4e26, CU = 0xc1440e, SV = 0xb0b4ba;
  for (const [x, y, z, yaw, k] of at) {
    const r = [0, yaw, 0];
    if (k === 'cone') { C(p, 0.13, 0.14, 0.03, BK, x, y + 0.015, z, r, 4); C(p, 0.02, 0.1, 0.4, OR, x, y + 0.22, z, r, 12); C(p, 0.05, 0.068, 0.06, WH, x, y + 0.24, z, r, 12); }
    else if (k === 'post') { C(p, 0.12, 0.13, 0.05, BK, x, y + 0.025, z, r, 10); C(p, 0.022, 0.022, 0.9, YL, x, y + 0.5, z, r, 8); for (let i = 0; i < 3; i++) C(p, 0.023, 0.023, 0.08, BK, x, y + 0.25 + i * 0.25, z, r, 8); S(p, 0.03, YL, x, y + 0.96, z); }
    else if (k === 'crate') { const cy = Math.cos(yaw), sy = Math.sin(yaw), at2 = (dx, dz) => [x + dx * cy + dz * sy, z - dx * sy + dz * cy];
      for (const [dx, dy, dz] of [[0, 0, 0], [0.48, 0, 0.05], [0.22, 0.4, 0.02]]) { const [px, pz] = at2(dx, dz), yy = y + dy;
        B(p, 0.44, 0.38, 0.4, WD, px, yy + 0.19, pz, r); for (const h of [0.06, 0.32]) B(p, 0.45, 0.04, 0.41, W2, px, yy + h, pz, r);
        B(p, 0.3, 0.12, 0.005, YL, px + sy * 0.203, yy + 0.2, pz + cy * 0.203, r); for (let i = 0; i < 3; i++) { const ox = (i - 1) * 0.09; C(p, 0.03, 0.03, 0.06, i % 2 ? CU : SV, px + cy * ox + sy * 0.18, yy + 0.42, pz - sy * ox + cy * 0.18, null, 10); } } }
    else if (k === 'board') { const cy = Math.cos(yaw), sy = Math.sin(yaw);
      for (const s of [-1, 1]) { B(p, 0.62, 0.9, 0.025, BK, x + sy * s * 0.12, y + 0.46, z + cy * s * 0.12, [s * 0.22, yaw, 0]); B(p, 0.56, 0.8, 0.028, YL, x + sy * s * 0.125, y + 0.47, z + cy * s * 0.125, [s * 0.22, yaw, 0]); } }
  }
  for (const [x0, z0, x1, z1, y] of tape || []) { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 0.2)), yaw = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i < n; i++) { const k0 = (i + 0.5) / n; B(p, 0.004, 0.06, L / n, i % 2 ? BK : YL, x0 + (x1 - x0) * k0, y - Math.sin(k0 * Math.PI) * 0.06, z0 + (z1 - z0) * k0, [0, yaw, 0]); } }
  return p.length ? merge(p) : null;
}
// the sandwich board's poster: the site's letter and a warning
export function boardTexture(letter, name) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 384; const g = cv.getContext('2d');
  g.fillStyle = '#ffd400'; g.fillRect(0, 0, 256, 384); g.fillStyle = '#111'; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(i * 44 - 40, 0); g.lineTo(i * 44 - 18, 0); g.lineTo(i * 44 - 40, 22); g.lineTo(i * 44 - 62, 22); g.fill(); g.beginPath(); g.moveTo(i * 44 - 40, 362); g.lineTo(i * 44 - 18, 362); g.lineTo(i * 44 - 40, 384); g.lineTo(i * 44 - 62, 384); g.fill(); }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#c62828'; g.font = '900 150px "Arial Black", Arial, sans-serif'; g.fillText(letter, 128, 150);
  g.fillStyle = '#111'; g.font = '900 28px "Arial Black", Arial, sans-serif'; g.fillText('BOMB SITE', 128, 46); g.font = '900 19px "Arial Black", Arial, sans-serif'; g.fillText(String(name || '').slice(0, 18), 128, 252);
  g.font = '900 15px "Arial Black", Arial, sans-serif'; g.fillText('⚠ NO CURRY', 128, 296); g.fillText('BEYOND THIS POINT ⚠', 128, 320);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---- the effects' pictures: a splat (sauce on the walls, tinted per gun) and a muzzle flash
let splatTex = null, flashTex = null;
export function splatTexture() {
  if (splatTex) return splatTex; const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), c = 64;
  g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, r = 30 + Math.sin(i * 3.7) * 8 + Math.cos(i * 5.3) * 5; g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); } g.fill();
  for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3, r = 40 + (i % 3) * 9; g.beginPath(); g.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 3 + (i % 4) * 2, 0, 7); g.fill(); g.fillRect(c + Math.cos(a) * 26 - 2, c + Math.sin(a) * 26 - 2, Math.cos(a) * 14 + 4, Math.sin(a) * 14 + 4); }
  const rg = g.createRadialGradient(c, c, 2, c, c, 16); rg.addColorStop(0, 'rgba(40,40,40,1)'); rg.addColorStop(0.6, 'rgba(110,110,110,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.beginPath(); g.arc(c, c, 16, 0, 7); g.fill();      // (the hole in the middle)
  splatTex = new THREE.CanvasTexture(cv); splatTex.colorSpace = THREE.SRGBColorSpace; return splatTex;
}
export function flashTexture() {
  if (flashTex) return flashTex; const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), c = 64;
  const rg = g.createRadialGradient(c, c, 0, c, c, 60); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.25, 'rgba(255,240,180,0.9)'); rg.addColorStop(1, 'rgba(255,160,40,0)'); g.fillStyle = rg; g.beginPath(); g.arc(c, c, 60, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,250,220,0.95)'; for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, r = 58 - (i % 2) * 18; g.beginPath(); g.moveTo(c + Math.cos(a - 0.12) * 10, c + Math.sin(a - 0.12) * 10); g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); g.lineTo(c + Math.cos(a + 0.12) * 10, c + Math.sin(a + 0.12) * 10); g.fill(); }
  flashTex = new THREE.CanvasTexture(cv); flashTex.colorSpace = THREE.SRGBColorSpace; return flashTex;
}
// three crossed quads: a flash that looks right from any side
export function flashGeo() { const g = [new THREE.PlaneGeometry(1, 1), new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 2), new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2)]; g[1].scale(1, 1, 2.2).translate(0, 0, -0.9); g[2].scale(1, 1, 2.2).translate(0, 0, -0.9); return mergeGeos(g); }
function mergeGeos(gs) { const pos = [], uv = [], idx = []; let o = 0; for (const g of gs) { const P = g.attributes.position, U = g.attributes.uv; for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); uv.push(U.getX(i), U.getY(i)); } for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + o); o += P.count; g.dispose(); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); out.setIndex(idx); out.computeBoundingSphere(); return out; }

// ------------------------------------------------------------------ the guns' pictures (the shop, the VR panel)
// a side view of each gun drawn in its own colours, fitted into the box (x, y, w, h)
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
export function drawGunArt(g, id, x, y, w, h) {
  g.save(); g.translate(x, y); const k = Math.min(w / 300, h / 110); g.translate((w - 300 * k) / 2, (h - 110 * k) / 2); g.scale(k, k);
  const R = (c, X0, Y0, W, H, r = 4) => { g.fillStyle = c; rr(g, X0, Y0, W, H, Math.min(r, W / 2, H / 2)); g.fill(); };
  const O = (c, cx, cy, rx, ry, a = 0) => { g.fillStyle = c; g.beginPath(); g.ellipse(cx, cy, rx, ry, a, 0, Math.PI * 2); g.fill(); };
  const Rt = (c, tx, ty, a, X0, Y0, W, H, r) => { g.save(); g.translate(tx, ty); g.rotate(a); R(c, X0, Y0, W, H, r); g.restore(); };
  g.lineJoin = 'round';
  if (id === 'ketchup') { R('#2b2c30', 70, 30, 150, 26, 6); for (let i = 0; i < 6; i++) R('#151517', 192 + i * 5, 32, 2, 22, 1); R('#d32f2f', 76, 54, 136, 18, 5); R('#f4f4f0', 46, 34, 26, 18, 6); R('#f4f4f0', 34, 38, 14, 10, 4); O('#d32f2f', 36, 52, 4, 7);
    g.save(); g.translate(185, 70); g.rotate(0.28); R('#e53935', -20, 0, 40, 78, 14); R('#f4f4f0', -21, 18, 42, 28, 4); O('#e53935', 0, 32, 9, 8); R('#2e7d32', -3, 22, 6, 4, 2); R('#f4f4f0', -18, 72, 36, 12, 5); g.restore();
    g.strokeStyle = '#151517'; g.lineWidth = 5; g.beginPath(); g.arc(160, 74, 14, 0, Math.PI); g.stroke(); }
  else if (id === 'brown') { R('#24252a', 40, 52, 170, 20, 5); R('#141416', 22, 36, 26, 18, 4); R('#5a2a14', 48, 30, 168, 26, 6); R('#e8d9a8', 92, 34, 74, 14, 3); for (let i = 0; i < 6; i++) R('#3e1c0c', 186 + i * 5, 32, 2, 22, 1);
    Rt('#5a2a14', 178, 72, 0.22, -14, 0, 30, 100, 10); Rt('#e8d9a8', 178, 72, 0.22, -15, 36, 32, 26, 3); Rt('#b3261e', 178, 72, 0.22, -10, 98, 22, 10, 4); Rt('#24252a', 96, 70, 0, -10, 0, 22, 24, 5);
    R('#8a9098', 214, 40, 54, 4, 2); R('#8a9098', 214, 52, 54, 4, 2); R('#141416', 264, 34, 8, 28, 3); g.strokeStyle = '#141416'; g.lineWidth = 5; g.beginPath(); g.arc(150, 76, 13, 0, Math.PI); g.stroke(); }
  else if (id === 'mustard') { O('#ffc400', 70, 42, 64, 10); R('#d9a000', 20, 34, 30, 14, 6); O('#d32f2f', 12, 41, 6, 5); R('#d9a000', 70, 28, 110, 8, 3); R('#18191b', 40, 24, 6, 10, 2);
    R('#b0b4ba', 140, 28, 46, 34, 10); for (let i = 0; i < 3; i++) R('#8a8e94', 144 + i * 14, 30, 4, 30, 2); R('#ffc400', 180, 26, 26, 40, 6); R('#18191b', 200, 18, 10, 12, 3);
    Rt('#8a5a2e', 196, 60, 0.3, -14, 0, 32, 58, 10); for (let i = 0; i < 4; i++) Rt('#6a4020', 196, 60, 0.3, -14, 10 + i * 11, 32, 3, 1); g.strokeStyle = '#18191b'; g.lineWidth = 5; g.beginPath(); g.arc(176, 72, 12, 0, Math.PI); g.stroke(); }
  else if (id === 'beans') { R('#18191b', 20, 36, 190, 10, 4); O('#ffd400', 26, 34, 4, 4); R('#ff7a1a', 70, 50, 110, 20, 6); R('#1e4ea8', 112, 50, 24, 20, 2); R('#c0c4c8', 68, 49, 5, 22, 2); R('#c0c4c8', 177, 49, 5, 22, 2);
    R('#8a5a2e', 92, 46, 56, 30, 6); for (let i = 0; i < 5; i++) R('#6a4020', 98 + i * 10, 48, 3, 26, 1); R('#34363a', 182, 32, 66, 34, 6);
    g.save(); g.translate(246, 40); g.rotate(0.12); R('#8a5a2e', 0, 0, 54, 32, 8); R('#18191b', 50, -2, 8, 38, 3); for (let i = 0; i < 3; i++) R('#ff7a1a', 10 + i * 12, 8, 8, 14, 3); g.restore(); g.save(); g.translate(222, 62); g.rotate(0.35); R('#8a5a2e', -8, 0, 18, 38, 6); g.restore();
    for (let i = 0; i < 5; i++) O('#d9541e', 14 - i * 3, 40 + Math.sin(i * 2) * 5, 5, 4); }
  else if (id === 'sausage') { R('#9a5a3a', 8, 44, 170, 16, 8); for (let i = 0; i < 8; i++) R('#7a3f22', 40 + i * 17, 44, 3, 16, 1); for (let i = 0; i < 12; i++) R('#ffd21a', 30 + i * 12, 40 + (i % 2) * 2, 9, 3, 1);
    R('#2e4a2e', 172, 38, 66, 28, 5); R('#111214', 150, 18, 92, 14, 6); R('#111214', 140, 14, 18, 22, 5); R('#111214', 236, 15, 16, 20, 5); R('#3a7aa8', 138, 17, 3, 16, 1); R('#b3261e', 188, 64, 22, 14, 3);
    g.save(); g.translate(236, 44); g.rotate(0.06); R('#7a4a26', 0, 0, 62, 36, 8); R('#5a3418', 6, -6, 46, 10, 4); R('#111214', 58, -2, 8, 42, 3); g.restore(); g.save(); g.translate(206, 64); g.rotate(0.35); R('#7a4a26', -8, 0, 16, 32, 6); g.restore(); O('#111214', 232, 48, 6, 6); }
  else if (id === 'cheese') { R('#ffc107', 84, 34, 120, 36, 8); R('#e0a000', 86, 62, 116, 8, 3); R('#1a1a1c', 90, 28, 110, 6, 2); R('#333333', 30, 38, 60, 18, 6); for (let i = 0; i < 4; i++) R('#1a1a1c', 40 + i * 12, 40, 4, 14, 1);
    R('#f4f4f0', 16, 40, 16, 14, 4); R('#ff3b3b', 18, 34, 6, 6, 1); for (let i = 0; i < 4; i++) O('#fff3b0', 110 + i * 22, 46 + (i % 2) * 8, 4 + (i % 2) * 2, 4);
    g.save(); g.translate(130, 70); g.rotate(-0.15); R('#ff9800', -10, 0, 22, 70, 8); R('#1565c0', -11, 16, 24, 12, 2); R('#f4f4f0', -8, 66, 18, 10, 4); g.restore();
    g.save(); g.translate(196, 70); g.rotate(0.32); R('#1a1a1c', -8, 0, 18, 40, 6); g.restore(); R('#8a9098', 204, 42, 56, 4, 2); R('#8a9098', 204, 54, 56, 4, 2); R('#1a1a1c', 258, 36, 10, 30, 3); }
  else if (id === 'monstor') { R('#141416', 16, 44, 70, 8, 3); R('#26282c', 6, 42, 16, 12, 3); R('#141416', 74, 36, 70, 22, 8); for (let i = 0; i < 3; i++) R('#7cff3a', 84 + i * 18, 36, 6, 22, 1); R('#141416', 82, 22, 4, 16, 1);
    R('#26282c', 140, 32, 74, 26, 5); R('#141416', 150, 26, 64, 6, 2); R('#141416', 158, 8, 34, 18, 3); R('#2d7a3a', 162, 11, 26, 12, 2); O('#ff2020', 175, 17, 2, 2);
    g.save(); g.translate(160, 58); g.rotate(-0.12); R('#141416', -12, 0, 26, 50, 6); for (let i = 0; i < 3; i++) R('#7cff3a', -6 + i * 7, 10, 3, 32, 1); R('#bfc4ca', -12, 0, 26, 4, 1); R('#bfc4ca', -12, 46, 26, 4, 1); g.restore();
    g.save(); g.translate(214, 58); g.rotate(0.3); R('#141416', -8, 0, 18, 36, 6); g.restore(); R('#141416', 212, 34, 76, 24, 6); R('#7cff3a', 214, 34, 72, 4, 2); }
  else if (id === 'baguette') { O('#d9a35b', 76, 46, 72, 13); for (let i = 0; i < 6; i++) Rt('#f3dfb2', 30 + i * 22, 38, 0.5, 0, 0, 14, 4, 2); R('#26282c', 2, 40, 14, 12, 3); R('#141416', 148, 30, 70, 30, 6);
    R('#141416', 160, 10, 40, 22, 4); R('#4a7a9a', 166, 14, 28, 14, 2); g.strokeStyle = '#ff3030'; g.lineWidth = 2; g.beginPath(); g.arc(180, 21, 4, 0, 7); g.stroke();
    Rt('#c9ced4', 168, 58, -0.1, -10, 0, 22, 44, 3); Rt('#ffe27a', 168, 58, -0.1, -10, 32, 22, 12, 2); Rt('#141416', 222, 58, 0.3, -8, 0, 18, 36, 6); O('#d9a35b', 256, 44, 40, 14); O('#b07a3a', 292, 44, 7, 13); }
  else if (id === 'scotch') { R('#5d5a2a', 10, 30, 140, 32, 14); for (let i = 0; i < 4; i++) R('#46441e', 30 + i * 26, 28, 6, 36, 2); O('#9a5a2a', 14, 46, 10, 12); R('#46441e', 140, 24, 70, 44, 20); for (let i = 0; i < 3; i++) O('#9a5a2a', 160 + i * 20, 46, 8, 8);
    R('#18191b', 210, 36, 40, 22, 5); Rt('#18191b', 218, 58, 0.3, -8, 0, 18, 40, 6); R('#8a9098', 248, 40, 40, 4, 2); R('#8a9098', 248, 50, 40, 4, 2); R('#18191b', 286, 34, 10, 30, 3); R('#18191b', 110, 10, 6, 20, 2); }
  else if (id === 'flamer') { R('#b87333', 10, 40, 140, 8, 3); R('#a0a4aa', 4, 34, 22, 20, 6); for (let i = 0; i < 8; i++) R('#18191b', 40 + i * 12, 34, 4, 20, 1); O('#4fc3ff', 10, 58, 4, 4);
    R('#18191b', 150, 30, 80, 30, 6); R('#18191b', 110, 10, 30, 24, 4); O('#d32f2f', 160, 80, 60, 16); R('#f4f4f0', 140, 70, 40, 20, 3); R('#2e7d32', 96, 74, 14, 12, 3); Rt('#18191b', 230, 58, 0.3, -8, 0, 18, 40, 6); R('#18191b', 240, 34, 50, 24, 6); }
  else if (id === 'xbow') { R('#8a5a2e', 40, 44, 200, 18, 5); R('#6a4020', 230, 40, 60, 30, 8); Rt('#8a5a2e', 200, 62, 0.35, -8, 0, 16, 34, 6); R('#d4a017', 30, 20, 16, 66, 4); R('#a0a4aa', 34, 50, 10, 6, 2);
    g.strokeStyle = '#dddddd'; g.lineWidth = 2; g.beginPath(); g.moveTo(38, 22); g.lineTo(150, 52); g.lineTo(38, 84); g.stroke(); R('#ffd54f', 60, 48, 110, 7, 3); R('#18191b', 150, 26, 60, 10, 4); }
  else if (id === 'gravy') { for (let i = 0; i < 3; i++) R('#232428', 10, 34 + i * 9, 120, 6, 3); R('#2a2c30', 50, 30, 8, 30, 3); R('#2a2c30', 96, 30, 8, 30, 3); R('#5a5e66', 126, 26, 90, 40, 14); R('#2a2c30', 212, 24, 12, 44, 4);
    O('#f4f2ea', 170, 78, 54, 20); O('#6d3b1f', 170, 70, 46, 7); R('#f4f2ea', 108, 66, 20, 8, 3); O('#6d3b1f', 126, 92, 4, 7);
    g.strokeStyle = '#b08d57'; g.lineWidth = 7; g.beginPath(); g.arc(170, 26, 26, Math.PI, 0); g.stroke(); R('#2a2c30', 228, 50, 14, 40, 5); R('#2a2c30', 254, 50, 14, 40, 5); }
  g.restore();
}
