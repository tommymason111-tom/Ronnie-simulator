// PROP HUNT: a multiplayer game of hide and seek where the hiders turn into things. Played at the Oysterfleet (place
// 'pub'), in Lidl ('shop') and round Lewis's house ('garden'), 2 to 12 players.
//   - Each round the host's game deals the teams: a few SEEKERS (one for 2-4 players, two for 5-8, three for 9-12), the
//     rest are HIDERS. Teams swap round: whoever's sought least seeks next. Four rounds (two each with two players).
//   - THE HIDE (40s): the seekers are blindfolded and held at the start. The hiders run off and turn into one of the
//     map's own things (a keg, a bar stool, a wheelie bin, a gnome...): look at one and BECOME it, or pick from the PROPS
//     list. There are plenty of the real ones dotted about, so a keg in the corner might be a keg, or might be Lewis.
//     LOCK yourself in place so you don't turn with the camera (a keg that turns round when you walk past is a giveaway).
//   - THE SEEK (2½-4 minutes): seekers have a GUN (a big toy blaster). Shoot anything that looks off (tap it, click
//     it, or pull the trigger at it), from right across the room. A hider takes three hits: FOUND! They're out (a ghost:
//     watch the rest). Shoot the real thing: it costs the seeker 10 health. No health left and they're knackered for 10
//     seconds. Finding someone gives health back. Everyone sees (and hears) every shot.
//   - TAUNTS: hiders can taunt (a quack, a kazoo, an airhorn...) from wherever they are. Every taunt scores points (more if
//     a seeker's close by: BRAVE TAUNT), and going 45 seconds without one taunts for you anyway, and costs you.
//   - The round's over when every hider's found (seekers win) or the clock runs out (the hiders left win). Points add
//     up over the rounds; the end shows the leaderboard, the podium and the awards.
// The HOST's game is the referee (teams, the clock, checks, points); hiders tell everyone which prop they are, where
// they've locked and when they taunt; everyone's game draws it.
import * as THREE from 'three';
import { sfx } from './audio.js';
import { Panel, rr, txt } from './impgames.js';
import { part, merge, vcLambert, box, cyl, sph } from './geo.js';
import { itemParts } from './foods.js';
import { wheelieBin } from './levels/furniture.js';
import { pottedPlant } from './levels/outdoor.js';
import { FONT } from './textures.js';

export const PH = {
  MIN: 2, HIDE_T: 40, SEEK_BASE: 150, SEEK_PER: 15, SEEK_MAX: 240, END_T: 10, HP: 100, MISS: 10, HEAL: 20, SHOOT_R: 22, SHOOT_CD: 0.4, HIDER_HITS: 3,
  OUT_T: 10, OUT_HP: 60, TAUNT_CD: 8, QUIET_T: 45, PICK_R: 3.2, SWAP_CD: 2, BRAVE_R: 6,
  PTS: { find: 100, survive: 100, perSec: 1, taunt: 10, brave: 25, quiet: -15, out: -25, sweep: 50 },
};
// the taunts: a sound everyone hears from where you are, and a word over you
export const TAUNTS = [
  { s: 'ph_quack', w: '🦆 QUACK QUACK!' }, { s: 'ph_kazoo', w: '🎺 PARP PARRRP!' }, { s: 'ph_airhorn', w: '📯 BWAAAAP!' }, { s: 'ph_raspberry', w: '💨 PFFFFT!' },
  { s: 'ph_honk', w: '🤡 HONK HONK!' }, { s: 'ph_cuckoo', w: '🐦 CUCKOO!' }, { s: 'ph_oi', w: '🗣️ OI OI!' }, { s: 'burp', w: '🍺 BUUUURP!' },
];

// ------------------------------------------------------------------ the props
// Every prop is drawn from the game's own coloured pieces (the same as the furniture), so it costs no new shader. A
// prop's build() returns [geometry, material] pairs; how tall it is and how wide is worked out from its shape.
const B = (ps, w, h, d, c, x, y, z, r) => ps.push(part(box(w, h, d), c, [x, y, z], r || [0, 0, 0]));
const C = (ps, rt, rb, h, c, x, y, z, r, seg = 14) => ps.push(part(cyl(rt, rb, h, seg), c, [x, y, z], r || [0, 0, 0]));
const S = (ps, rad, c, x, y, z, scl) => ps.push(part(sph(rad, 12, 8), c, [x, y, z], [0, 0, 0], scl || [1, 1, 1]));
const T = (ps, R, tube, c, x, y, z, r, arc = Math.PI * 2) => ps.push(part(new THREE.TorusGeometry(R, tube, 6, 22, arc), c, [x, y, z], r || [0, 0, 0]));
const one = (ps) => [[merge(ps), vcLambert]];
const kitParts = (f) => { const k = { parts: [], blockers: [], colliders: [] }; f(k); return one(k.parts); };      // (the level's own builders, e.g. the wheelie bin)
const BUILD = {
  stool() { const p = []; C(p, 0.19, 0.18, 0.07, 0x7a1f24, 0, 0.77, 0, null, 20); T(p, 0.18, 0.02, 0x5a1218, 0, 0.75, 0, [Math.PI / 2, 0, 0]); C(p, 0.05, 0.05, 0.05, 0xc0c4c8, 0, 0.71, 0);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; C(p, 0.014, 0.018, 0.74, 0xc0c4c8, Math.cos(a) * 0.14, 0.37, Math.sin(a) * 0.14, [Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12], 8); }
    T(p, 0.155, 0.012, 0xc0c4c8, 0, 0.27, 0, [Math.PI / 2, 0, 0]); return one(p); },
  keg() { const p = []; C(p, 0.2, 0.2, 0.56, 0xb8bcc2, 0, 0.3, 0, null, 22); for (const y of [0.03, 0.57]) T(p, 0.2, 0.02, 0x9aa0a6, 0, y, 0, [Math.PI / 2, 0, 0]);
    T(p, 0.204, 0.008, 0x9aa0a6, 0, 0.3, 0, [Math.PI / 2, 0, 0]); C(p, 0.05, 0.05, 0.05, 0x333333, 0, 0.6, 0); B(p, 0.12, 0.02, 0.03, 0x2a6df4, 0.03, 0.64, 0); return one(p); },
  barrel() { const p = [], pts = []; for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector2(0.24 + 0.05 * Math.sin(Math.PI * i / 8), i / 8 * 0.8));
    p.push(part(new THREE.LatheGeometry(pts, 18), 0x8a5a2e, [0, 0, 0])); C(p, 0.235, 0.235, 0.02, 0x6a4020, 0, 0.795, 0, null, 18);
    for (const [y, r] of [[0.1, 0.255], [0.7, 0.255], [0.3, 0.283], [0.5, 0.283]]) T(p, r, 0.012, 0x2a2a2a, 0, y, 0, [Math.PI / 2, 0, 0]); return one(p); },
  crate() { const p = [], red = 0xc8202a; B(p, 0.42, 0.02, 0.3, red, 0, 0.01, 0); for (const s of [-1, 1]) { B(p, 0.42, 0.26, 0.02, red, 0, 0.13, s * 0.14); B(p, 0.02, 0.26, 0.3, red, s * 0.2, 0.13, 0); }
    B(p, 0.08, 0.03, 0.022, 0x111111, -0.2, 0.2, 0, [0, Math.PI / 2, 0]); B(p, 0.08, 0.03, 0.022, 0x111111, 0.2, 0.2, 0, [0, Math.PI / 2, 0]);
    for (let i = 0; i < 12; i++) { const x = -0.15 + (i % 4) * 0.1, z = -0.09 + Math.floor(i / 4) * 0.09; C(p, 0.03, 0.03, 0.2, 0x5a3a14, x, 0.12, z, null, 8); C(p, 0.012, 0.022, 0.06, 0x5a3a14, x, 0.25, z, null, 8); C(p, 0.013, 0.013, 0.012, 0xd4af37, x, 0.285, z, null, 8); }
    return one(p); },
  bin(col = 0x1a1a1a) { return kitParts(k => wheelieBin(k, { x: 0, z: 0, col })); },
  greenbin() { return BUILD.bin(0x2e6b30); },
  greybin() { return BUILD.bin(0x5a6068); },
  plant() { return kitParts(k => pottedPlant(k, 0, 0, { s: 1, fronds: 12 })); },
  aboard() { const p = [], wood = 0x5a3a20; for (const s of [-1, 1]) { const r = [s * 0.22, 0, 0], z = s * 0.11;
      B(p, 0.6, 0.92, 0.03, wood, 0, 0.47, z, r); B(p, 0.5, 0.78, 0.01, 0x1c211d, 0, 0.49, z + s * 0.02, r);
      for (let i = 0; i < 6; i++) B(p, 0.22 + (i * 37 % 5) * 0.04, 0.025, 0.006, i === 0 ? 0xffd400 : i === 3 ? 0xff7aa8 : 0xf4f4f0, 0, 0.78 - i * 0.1, z + s * 0.032, r); }
    B(p, 0.56, 0.02, 0.2, wood, 0, 0.88, 0); return one(p); },
  bucket() { const p = []; C(p, 0.2, 0.17, 0.3, 0xffd400, 0, 0.2, 0, null, 18); B(p, 0.3, 0.12, 0.12, 0x6a6e74, 0.05, 0.4, 0); for (const [x, z] of [[-0.14, -0.1], [0.14, -0.1], [-0.14, 0.1], [0.14, 0.1]]) S(p, 0.03, 0x222222, x, 0.03, z);
    C(p, 0.014, 0.014, 1.25, 0xc8a070, -0.04, 0.68, 0.02, [0, 0, 0.18], 8); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; C(p, 0.012, 0.01, 0.2, 0xf2efe6, 0.02 + Math.cos(a) * 0.05, 0.16, 0.02 + Math.sin(a) * 0.05, [Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4], 6); }
    return one(p); },
  cone() { const p = []; B(p, 0.36, 0.03, 0.36, 0xff5a1a, 0, 0.015, 0); C(p, 0.025, 0.15, 0.6, 0xff5a1a, 0, 0.33, 0, null, 16); C(p, 0.105, 0.12, 0.07, 0xf4f4f4, 0, 0.24, 0, null, 16); C(p, 0.07, 0.085, 0.06, 0xf4f4f4, 0, 0.42, 0, null, 16); return one(p); },
  wetfloor() { const p = []; for (const s of [-1, 1]) { const r = [s * 0.2, 0, 0], z = s * 0.07; B(p, 0.3, 0.62, 0.012, 0xffd400, 0, 0.31, z, r);
      B(p, 0.22, 0.05, 0.004, 0x111111, 0, 0.53, z + s * 0.01, r); S(p, 0.025, 0x111111, 0, 0.42, z + s * 0.012, [1, 1, 0.2]); B(p, 0.02, 0.1, 0.004, 0x111111, 0, 0.35, z + s * 0.012, r); B(p, 0.09, 0.015, 0.004, 0x111111, 0.02, 0.3, z + s * 0.012, [r[0], 0, 0.5]); }
    B(p, 0.3, 0.03, 0.06, 0xffd400, 0, 0.62, 0); return one(p); },
  pint() { return itemParts('pint').map(([g, m]) => [g, m]); },
  trolley() { const p = [], st = 0xb8bec6, bl = 0x1e4ea8; B(p, 0.6, 0.02, 0.8, st, 0, 0.55, 0); for (const s of [-1, 1]) { B(p, 0.6, 0.35, 0.02, st, 0, 0.72, s * 0.4); B(p, 0.02, 0.35, 0.8, st, s * 0.3, 0.72, 0); }
    for (let i = -3; i <= 3; i++) B(p, 0.012, 0.35, 0.79, st, i * 0.08, 0.72, 0); B(p, 0.64, 0.05, 0.05, bl, 0, 0.98, -0.46);
    for (const [x, z] of [[0.28, -0.38], [-0.28, -0.38], [0.25, 0.38], [-0.25, 0.38]]) { B(p, 0.03, 0.55, 0.03, st, x, 0.28, z); C(p, 0.05, 0.05, 0.03, bl, x, 0.05, z, [0, 0, Math.PI / 2], 10); }
    B(p, 0.5, 0.02, 0.6, st, 0, 0.18, 0); return one(p); },
  basket() { const p = [], bl = 0x1e4ea8; B(p, 0.44, 0.02, 0.3, bl, 0, 0.01, 0); for (const s of [-1, 1]) { B(p, 0.46, 0.22, 0.016, bl, 0, 0.12, s * 0.15); B(p, 0.016, 0.22, 0.3, bl, s * 0.22, 0.12, 0); }
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) B(p, 0.44, 0.012, 0.004, 0xffffff, 0, 0.05 + i * 0.05, s * 0.16);
    for (const s of [-1, 1]) T(p, 0.15, 0.012, 0xffd400, 0, 0.23, s * 0.06, [0, 0, 0], Math.PI); return one(p); },
  lidlbag() { return itemParts('lidlbag'); },
  box() { const p = [], c = 0xc49a6c; B(p, 0.5, 0.38, 0.4, c, 0, 0.19, 0); B(p, 0.08, 0.005, 0.41, 0xd8c08a, 0, 0.383, 0); B(p, 0.08, 0.38, 0.005, 0xd8c08a, 0, 0.19, 0.201);
    for (const x of [-0.17, 0.17]) { B(p, 0.012, 0.08, 0.004, 0x3a2a1a, x, 0.22, -0.202); B(p, 0.04, 0.012, 0.004, 0x3a2a1a, x, 0.26, -0.202); } return one(p); },
  produce() { const p = [], g = 0x2e8b3a; B(p, 0.5, 0.02, 0.36, g, 0, 0.01, 0); for (const s of [-1, 1]) { B(p, 0.5, 0.2, 0.02, g, 0, 0.1, s * 0.17); B(p, 0.02, 0.2, 0.36, g, s * 0.24, 0.1, 0); }
    for (let i = 0; i < 15; i++) { const x = -0.18 + (i % 5) * 0.09, z = -0.11 + Math.floor(i / 5) * 0.11; S(p, 0.045, [0xc8202a, 0xd83a2a, 0x9a1a1a][i % 3], x, 0.2 + (i % 2) * 0.02, z); } return one(p); },
  cans() { const p = []; B(p, 0.42, 0.02, 0.28, 0xc49a6c, 0, 0.01, 0); for (let i = 0; i < 12; i++) { const x = -0.15 + (i % 4) * 0.1, z = -0.09 + Math.floor(i / 4) * 0.09;
      C(p, 0.034, 0.034, 0.13, 0x111111, x, 0.085, z, null, 12); B(p, 0.006, 0.07, 0.07, 0x7cff3a, x, 0.09, z, [0, i, 0]); C(p, 0.03, 0.03, 0.006, 0xc0c4c8, x, 0.153, z, null, 12); } return one(p); },
  gnome() { const p = []; C(p, 0.07, 0.09, 0.2, 0x1e5aa8, 0, 0.1, 0, null, 10); S(p, 0.07, 0xf0c8a0, 0, 0.26, 0); S(p, 0.05, 0xffffff, 0, 0.21, 0.06, [1, 1.3, 0.7]); C(p, 0, 0.08, 0.22, 0xd32f2f, 0, 0.4, 0, null, 10);
    S(p, 0.015, 0xe08a7a, 0, 0.26, 0.068); C(p, 0.02, 0.02, 0.04, 0x3a2a1a, -0.04, 0.02, 0.03); C(p, 0.02, 0.02, 0.04, 0x3a2a1a, 0.04, 0.02, 0.03); return one(p); },
  football() { const p = []; S(p, 0.11, 0xffffff, 0, 0.11, 0); for (let i = 0; i < 5; i++) S(p, 0.035, 0x111111, Math.cos(i * 1.26) * 0.09, 0.11 + Math.sin(i * 2.1) * 0.06, Math.sin(i * 1.26) * 0.09, [1, 1, 0.5]); return one(p); },
  flamingo() { const p = [], pink = 0xff7ab0; C(p, 0.006, 0.006, 0.55, 0x222222, 0, 0.27, 0, null, 6); S(p, 0.13, pink, 0, 0.62, 0, [1.4, 0.8, 0.8]); S(p, 0.06, pink, -0.14, 0.66, 0, [1.4, 0.7, 0.7]);
    for (let i = 0; i < 6; i++) S(p, 0.03, pink, 0.13 + Math.sin(i * 0.55) * 0.05, 0.68 + i * 0.05, 0); S(p, 0.045, pink, 0.17, 0.98, 0); C(p, 0.008, 0.02, 0.07, 0x111111, 0.22, 0.96, 0, [0, 0, Math.PI / 2 + 0.4], 6); return one(p); },
  gardenchair() { const p = [], g = 0x2e7d32; B(p, 0.46, 0.035, 0.44, g, 0, 0.44, 0); B(p, 0.46, 0.42, 0.03, g, 0, 0.67, 0.21, [-0.15, 0, 0]);
    for (const [x, z] of [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]]) C(p, 0.02, 0.026, 0.44, g, x, 0.22, z, null, 8);
    for (const s of [-1, 1]) B(p, 0.04, 0.03, 0.4, g, s * 0.23, 0.62, 0); return one(p); },
  coolbox() { const p = []; B(p, 0.5, 0.3, 0.32, 0x1e6ab8, 0, 0.15, 0); B(p, 0.52, 0.06, 0.34, 0xf4f4f4, 0, 0.33, 0); B(p, 0.3, 0.03, 0.04, 0xf4f4f4, 0, 0.38, 0); for (const s of [-1, 1]) B(p, 0.03, 0.06, 0.04, 0xf4f4f4, s * 0.15, 0.36, 0); return one(p); },
  wateringcan() { const p = [], g = 0x3a8a4a; C(p, 0.12, 0.13, 0.26, g, 0, 0.13, 0, null, 16); C(p, 0.015, 0.025, 0.36, g, 0.22, 0.25, 0, [0, 0, -0.9], 8); C(p, 0.035, 0.02, 0.04, g, 0.36, 0.37, 0, [0, 0, -0.9], 10);
    T(p, 0.1, 0.014, g, -0.02, 0.27, 0, [0, 0, 0], Math.PI); C(p, 0.12, 0.12, 0.02, 0x2a6a3a, 0, 0.265, 0, null, 16); return one(p); },
  gas() { const p = [], o = 0xff7a10; C(p, 0.15, 0.15, 0.44, o, 0, 0.24, 0, null, 18); S(p, 0.15, o, 0, 0.46, 0, [1, 0.5, 1]); C(p, 0.155, 0.155, 0.03, 0x333333, 0, 0.015, 0, null, 18);
    T(p, 0.08, 0.015, o, 0, 0.58, 0, [Math.PI / 2, 0, 0]); C(p, 0.02, 0.02, 0.06, 0x2a2a2a, 0, 0.55, 0, null, 8); B(p, 0.16, 0.08, 0.004, 0xffffff, 0, 0.3, 0.151); return one(p); },
  burger() { return itemParts('burger'); },
  chair() { return itemParts('chair', 0); },
};
// what each prop's called, its picture, and which maps have it
const KIND = {
  chair: { name: 'A PUB CHAIR', icon: '🪑' }, stool: { name: 'A BAR STOOL', icon: '🍸' }, keg: { name: 'A KEG', icon: '🛢️' }, barrel: { name: 'A BARREL', icon: '🛢️' },
  crate: { name: 'A CRATE OF BEER', icon: '🍾' }, bin: { name: 'A WHEELIE BIN', icon: '🗑️' }, greenbin: { name: 'A WHEELIE BIN', icon: '🗑️' }, greybin: { name: 'A BIN', icon: '🗑️' },
  plant: { name: 'A POT PLANT', icon: '🪴' }, aboard: { name: 'THE SPECIALS BOARD', icon: '📋' }, bucket: { name: 'A MOP BUCKET', icon: '🪣' }, cone: { name: 'A TRAFFIC CONE', icon: '🚧' },
  wetfloor: { name: 'A WET FLOOR SIGN', icon: '⚠️' }, pint: { name: 'A PINT', icon: '🍺' }, trolley: { name: 'A TROLLEY', icon: '🛒' }, basket: { name: 'A BASKET', icon: '🧺' },
  lidlbag: { name: 'A BAG FOR LIFE', icon: '🛍️' }, box: { name: 'A CARDBOARD BOX', icon: '📦' }, produce: { name: 'A CRATE OF APPLES', icon: '🍎' }, cans: { name: 'A TRAY OF MONSTOR', icon: '🥫' },
  gnome: { name: 'A GARDEN GNOME', icon: '🧙' }, football: { name: 'A FOOTBALL', icon: '⚽' }, flamingo: { name: 'A FLAMINGO', icon: '🦩' }, gardenchair: { name: 'A GARDEN CHAIR', icon: '🪑' },
  coolbox: { name: 'A COOL BOX', icon: '🧊' }, wateringcan: { name: 'A WATERING CAN', icon: '🚿' }, gas: { name: 'A GAS BOTTLE', icon: '🧯' }, burger: { name: 'A BURGER', icon: '🍔' },
};
export const MAP_KINDS = {
  pub: ['chair', 'stool', 'keg', 'barrel', 'crate', 'bin', 'plant', 'aboard', 'bucket', 'cone', 'wetfloor', 'pint'],
  shop: ['trolley', 'basket', 'lidlbag', 'box', 'produce', 'cans', 'wetfloor', 'greybin', 'plant', 'cone'],
  garden: ['gnome', 'football', 'flamingo', 'gardenchair', 'greenbin', 'plant', 'cone', 'box', 'coolbox', 'wateringcan', 'gas', 'burger'],
};
// the map's own loose things that are the same as a prop (the pub's chairs, Lidl's bags lying about): they're decoys too
const DORMANT_KIND = { pub: { chair: 'chair' }, shop: { lidlbag: 'lidlbag' }, garden: {} };
const SCALE = { burger: 1.6 };
const SIZE_NAME = (h) => h < 0.35 ? 'SMALL · HARD TO SPOT' : h < 0.85 ? 'MEDIUM' : 'BIG · EASY TO SPOT';
const CAP = 14;      // (the most of any one prop dotted about a map)

const now = () => performance.now() / 1000;
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = (t) => String(t).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const fmt = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const portraits = {};
const portrait = (c) => { const id = c || 'ronnie'; if (!portraits[id]) { const im = new Image(); im.src = `./assets/portraits/${id}.webp`; portraits[id] = im; } return portraits[id]; };
const yawOfQ = (q) => { const f = new THREE.Vector3(0, 0, -1).applyQuaternion(q); return Math.atan2(-f.x, -f.z); };
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s1 = new THREE.Vector3(1, 1, 1), _box = new THREE.Box3(), _hit = new THREE.Vector3();

export class PropHunt {
  // g: { scene, room, player, net, mp, words, renderer, camera, items, selfBody(), showBanner, leave() }
  constructor(g) {
    this.g = g; this.net = g.net; this.me = g.net.id; this.host = !!g.net.host; this.place = MAP_KINDS[g.room.placeId] ? g.room.placeId : 'pub';
    this.phase = 'waiting'; this.players = new Map(); this.tot = {}; this.stats = {}; this.round = 0; this.of = 0; this.endsAt = 0; this.btnWas = {}; this.H = null;
    this.grp = new THREE.Group(); this.grp.name = 'prop hunt'; g.scene.add(this.grp);
    this.panel = new Panel({ scene: g.scene, player: g.player, renderer: g.renderer });
    this.buildKinds(); this.buildDecoyMeshes(); this.buildUI(); this.buildWorldBits(); this.walled(new THREE.Ray(), 0);
    this.props = new Map(); this.fx = []; this.puffs = []; this.shots = []; this.gunKick = {}; this.rGuns = new Map();
    this.clearFood();
    // nobody hits, grabs or throws anything; hiders can't chat or emote mid-round (a chat bubble over a keg...);
    // found hiders only talk to each other
    const mp = g.mp; mp.noPunch = true; g.player.noGrab = true; g.player.flatDrop && g.player.flatDrop(); for (const h of g.player.hands || []) if (h.held) { h.held.heldBy = null; h.held = null; }
    mp.chatGate = () => { const me = this.mine(); if (!me || !this.playing()) return { ok: true }; if (me.found) return { ok: true, ghost: true }; if (me.role === 'hider') return { ok: false, why: 'SHH! PROPS DON\'T TALK' }; return { ok: true }; };
    mp.chatRecvGate = (m) => { const me = this.mine(); return !m.g || !me || me.found || me.role === 'spec' || !this.playing(); };
    mp.emoteGate = () => { const me = this.mine(); if (me && this.playing() && me.role === 'hider' && !me.found) { this.toast('NO EMOTES: YOU\'RE ' + (me.kind ? KIND[me.kind].name : 'HIDING')); return false; } return true; };
    // the messages
    this.handlers = {};
    const on = (k, f) => { this.handlers[k] = f; this.net.on[k] = (m, p) => { try { f(m, p); } catch (e) { console.error('prophunt', k, e); } }; };
    on('phChk', (m, p) => { if (this.host && p) this.hostIn('phChk', m, p.id); });
    for (const k of ['phLobby', 'phRound', 'phGo', 'phClock', 'phFound', 'phHit', 'phMiss', 'phOut', 'phBack', 'phPts', 'phAuto', 'phEnd', 'phOver', 'phState']) on(k, (m, p) => { if (!this.host && (!m.to || m.to === this.me) && (!p || p.id === this.net.hostId)) this.apply(k, m); });
    // (a hider's own news: which prop, locked or not, a taunt. Straight from them to everyone)
    on('phProp', (m, p) => { if (!p) return; const id = m.id != null && p.id === this.net.hostId ? m.id : p.id; this.setKind(id, m.k); });
    on('phLock', (m, p) => { if (p) this.setLock(p.id, m); });
    // (a seeker's shot: everyone sees the tracer and hears the bang, from where they fired)
    on('phShot', (m, p) => { if (!p) return; const S = this.players.get(p.id), ok = (v) => Array.isArray(v) && v.length === 3 && v.every(n => typeof n === 'number' && isFinite(n));
      if (!S || S.role !== 'seeker' || this.phase !== 'seek' || !ok(m.a) || !ok(m.b)) return; const a = new THREE.Vector3(...m.a), b = new THREE.Vector3(...m.b); if (a.distanceTo(b) > PH.SHOOT_R + 3) return;
      this.shotFx(a, b, !!m.h, false); this.gunKick[p.id] = 1; sfx('ph_shot', a, 0.75); });
    on('phTaunt', (m, p) => { if (!p) return; if (this.taunted(p.id, m.i, false) && this.host) this.hostTaunt(p.id); });
    on('phHello', (m, p) => { if (this.host && p) this.hostHello(p.id); });
    this.leaveWas = this.net.on.leave; this.net.on.leave = (m) => { this.leaveWas && this.leaveWas(m); if (this.host) this.hostLeft(m.id); };
    this.lobbyT = 0; this.respawn();
    if (!this.host) this.net.send({ t: 'phHello' });
  }
  // ------------------------------------------------------------------ who's who
  mine() { return this.players.get(this.me); }
  playing() { return this.phase === 'hide' || this.phase === 'seek'; }
  inRound() { return this.phase === 'hide' || this.phase === 'seek' || this.phase === 'roundend'; }
  nameOf(id) { const p = this.players.get(id) || this.net.players.get(id); return (p && p.name) || (id === this.me ? this.net.name || 'YOU' : 'SOMEONE'); }
  roster() { const list = [{ id: this.net.id, name: this.net.name || 'You', char: this.net.char }]; for (const p of this.net.players.values()) list.push({ id: p.id, name: p.name || 'Player', char: p.char }); return list.sort((a, b) => String(a.id).localeCompare(String(b.id))); }
  hiders() { return [...this.players.values()].filter(p => p.role === 'hider'); }
  seekers() { return [...this.players.values()].filter(p => p.role === 'seeker'); }
  left() { return this.hiders().filter(p => !p.found && !p.gone); }
  avatar(id) { if (id === this.me) return this.g.selfBody(); const p = this.net.players.get(id); return p && p.avatar; }
  floor(x, z) { const r = this.g.room; return r.floorAt ? r.floorAt(x, z) || 0 : 0; }
  // where someone is (feet, on the floor): me from my own head; anyone else from their latest move
  posOf(id, out = new THREE.Vector3()) {
    if (id === this.me) { const h = this.g.player.head; return out.set(h.x, this.floor(h.x, h.z), h.z); }
    const p = this.net.players.get(id); if (!p || !p.pose || !Array.isArray(p.pose.h)) return null; const [x, , z] = p.pose.h; if (!isFinite(x) || !isFinite(z)) return null;
    return out.set(x, this.floor(x, z), z);
  }
  hd(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

  // ------------------------------------------------------------------ the props: shapes, the decoys dotted about
  buildKinds() {
    this.kinds = MAP_KINDS[this.place]; this.K = {};
    for (const id of this.kinds) { let parts; try { parts = BUILD[id](); } catch (e) { console.warn('prop', id, e); continue; }
      const s = SCALE[id] || 1, bb = new THREE.Box3(); for (const [geo] of parts) { if (!geo.boundingBox) { if (geo.attributes.position.array) geo.computeBoundingBox(); else if (geo.boundingSphere) geo.boundingBox = geo.boundingSphere.getBoundingBox(new THREE.Box3()); } if (geo.boundingBox) bb.union(geo.boundingBox); }      // (the level's own shapes keep their box: their points may only be on the graphics chip now)
      const h = (bb.max.y - bb.min.y) * s, r = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * s / 2;
      this.K[id] = { id, ...KIND[id], parts, s, y0: -bb.min.y * s, h, r, hitR: Math.max(0.24, Math.min(0.75, Math.max(r, h / 2) * 1.05)) }; }
    this.kinds = this.kinds.filter(id => this.K[id]);
    this.dormKind = DORMANT_KIND[this.place] || {};
  }
  // one instanced mesh per prop (per piece) holds every decoy of that prop: a handful of draws for the lot
  buildDecoyMeshes() {
    this.dmesh = {}; const shadows = !!this.g.room.shadows;
    for (const id of this.kinds) { if (this.dormKind[id]) continue; const K = this.K[id];
      this.dmesh[id] = K.parts.map(([geo, mat]) => { const im = new THREE.InstancedMesh(geo, mat, CAP); im.count = 0; im.castShadow = shadows; im.receiveShadow = shadows; im.name = 'ph decoys ' + id; im.frustumCulled = false; this.grp.add(im); return im; }); }
    this.decoys = []; this.dorm = [];
    const D = this.g.room.dormant; if (D) for (const e of D.entries) { const k = this.dormKind[e.type]; if (k && this.K[k]) this.dorm.push({ k, x: e.pos.x, y: e.pos.y - 0, z: e.pos.z, yaw: e.rot[1], e }); }
  }
  // the host's game lays the decoys out (fresh each round): spots by a wall or a counter, spread about, none at the start
  hostLayout() {
    const room = this.g.room, nav = room.nav, out = []; if (!nav) return out;
    const cells = [], st = room.start || { x: 0, z: 0 };
    for (let k = 0; k < nav.free.length; k++) { if (!nav.free[k]) continue; const i = k % nav.nx, j = Math.floor(k / nav.nx); let edge = false;
      for (let dj = -1; dj <= 1 && !edge; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nav.nx || jj >= nav.nz || !nav.free[jj * nav.nx + ii]) { edge = true; break; } }
      if (!edge) continue; const c = nav.center(k); if (Math.hypot(c.x - st.x, c.y - st.z) < 2.5) continue; cells.push(c); }
    const area = nav.free.reduce((a, b) => a + b, 0) * nav.cell * nav.cell, per = Math.max(3, Math.min(CAP - 2, Math.round(area / 110))), taken = [];
    for (const id of this.kinds) { if (this.dormKind[id]) continue; let n = 0;      // (the pub's own chairs, Lidl's own bags: those are already about)
      for (let tries = 0; tries < 400 && n < per && cells.length; tries++) { const c = cells[Math.floor(Math.random() * cells.length)];
        if (taken.some(t => Math.hypot(t.x - c.x, t.y - c.y) < 1.1)) continue; taken.push(c); n++;
        out.push(this.kinds.indexOf(id), Math.round(c.x * 100) / 100, Math.round(c.y * 100) / 100, Math.round(Math.random() * 628) / 100); } }
    return out;
  }
  // everyone: put the decoys where the host's game said (a flat list: prop, x, z, turn; four numbers each)
  layDecoys(lay) {
    this.decoys = []; const n = {};
    for (const id in this.dmesh) { n[id] = 0; for (const im of this.dmesh[id]) im.count = 0; }
    if (Array.isArray(lay)) for (let i = 0; i + 3 < lay.length; i += 4) { const id = this.kinds[lay[i]], x = +lay[i + 1], z = +lay[i + 2], yaw = +lay[i + 3];
      if (!id || !this.dmesh[id] || !isFinite(x) || !isFinite(z) || !isFinite(yaw) || n[id] >= CAP) continue;
      const d = { k: id, x, y: this.floor(x, z), z, yaw, ii: n[id]++ }; this.decoys.push(d); this.decoyMatrix(d, 0); }
    for (const id in this.dmesh) for (const im of this.dmesh[id]) { im.count = n[id]; im.instanceMatrix.needsUpdate = true; }
    for (const d of this.dorm) this.decoys.push(d);
  }
  decoyMatrix(d, tilt) {
    const K = this.K[d.k]; _e.set(tilt * 0.5, d.yaw, tilt); _q.setFromEuler(_e);
    if (d.e) { const e = d.e, g = e.group; if (!g || !g.meshes || e.woken) return; _e.set(e.rot[0] + tilt * 0.5, e.rot[1], e.rot[2] + tilt); _q.setFromEuler(_e); _m4.compose(e.pos, _q, _s1); for (const im of g.meshes) { im.setMatrixAt(e.index, _m4); im.instanceMatrix.needsUpdate = true; } return; }
    _m4.compose(_v.set(d.x, d.y + K.y0 + Math.abs(tilt) * 0.05, d.z), _q, _w.setScalar(K.s)); for (const im of this.dmesh[d.k]) { im.setMatrixAt(d.ii, _m4); im.instanceMatrix.needsUpdate = true; }
  }

  // ------------------------------------------------------------------ what's being aimed at
  // the nearest decoy or hider's prop along a ray (not through a wall): { kind: 'd', i } or { kind: 'h', id }
  pick(ray, { maxD = 40, near = null, nearR = 0, hiders = true } = {}) {
    let best = null; const c = _v;
    const test = (x, y, z, k, r, what) => { c.set(x, y, z); const along = c.clone().sub(ray.origin).dot(ray.direction); if (along < 0.05 || along > maxD) return;
      if (near && Math.hypot(x - near.x, z - near.z) > nearR) return; if (ray.distanceSqToPoint(c) > r * r) return; if (!best || along < best.t) best = { ...what, t: along, x, y, z }; };
    this.decoys.forEach((d, i) => { const K = this.K[d.k]; test(d.x, (d.e ? d.e.pos.y - K.y0 : d.y) + K.h / 2, d.z, d.k, K.hitR, { kind: 'd', i, k: d.k }); });
    if (hiders) for (const [id, pr] of this.props) { if (id === this.me || pr.gone || !pr.kind) continue; const K = this.K[pr.kind]; test(pr.pos.x, pr.pos.y + K.h / 2, pr.pos.z, pr.kind, K.hitR, { kind: 'h', id, k: pr.kind }); }
    if (best && this.walled(ray, best.t - 0.15)) return null;
    return best;
  }
  // a wall (or a tall shelf) between here and there
  walled(ray, t) {
    if (!this.walls) this.walls = (this.g.room.colliders || []).filter(b => b.max.y - b.min.y > 1.5 && b.min.y < 0.6).map(b => new THREE.Box3(b.min.clone(), b.max.clone()));
    for (const b of this.walls) { if (b.containsPoint(ray.origin)) continue; const p = ray.intersectBox(b, _hit); if (p && p.distanceTo(ray.origin) < t) return true; }
    return false;
  }
  // the ray out from the middle of what you're looking at (or a tap on the screen); in VR, the right controller
  aimRay(sx, sy) {
    const P = this.g.player, ray = new THREE.Ray();
    if (this.g.renderer.xr.isPresenting) { const h = (P.hands || []).find(h => h.source && h.handedness === 'right' && h.ctrl) || (P.hands || []).find(h => h.ctrl); if (!h) return null;
      h.ctrl.getWorldPosition(ray.origin); h.ctrl.getWorldQuaternion(_q); ray.direction.set(0, 0, -1).applyQuaternion(_q); return ray; }
    const cam = this.viewCamNow || this.g.camera, rc = new THREE.Raycaster(), cvr = this.g.renderer.domElement.getBoundingClientRect();
    const nx = sx == null ? 0 : ((sx - cvr.left) / cvr.width) * 2 - 1, ny = sy == null ? 0 : -((sy - cvr.top) / cvr.height) * 2 + 1;
    cam.updateMatrixWorld(); rc.setFromCamera({ x: nx, y: ny }, cam); return rc.ray;
  }
  // a tap on the picture (main.js, from touch.js): a seeker checks what they tapped; a hider becomes what they tapped
  tap(x, y) {
    if (this.panel.open || !this.playing()) return; const me = this.mine(); if (!me || me.found) return;
    if (me.role === 'seeker' && this.phase === 'seek') this.doCheck(this.aimRay(x, y));
    else if (me.role === 'hider') { const r = this.aimRay(x, y); if (!r) return; const hit = this.pick(r, { near: this.g.player.head, nearR: PH.PICK_R }); if (hit) this.become(hit.k); }
  }

  // ------------------------------------------------------------------ the host: dealing, the clock, the checks, points
  send(k, m) { m.t = k; this.net.send(m); this.apply(k, m); }
  ask(k, m) { if (this.host) this.hostIn(k, m, this.me); else { m.t = k; this.net.send(m); } }
  hostStart() {
    const list = this.roster(); if (list.length < PH.MIN) { this.toast(`NEED ${PH.MIN}+ PLAYERS`); return; }
    const of = list.length === 2 ? 4 : Math.min(4, list.length);
    this.H = { r: 0, of, tot: Object.fromEntries(list.map(p => [p.id, 0])), stats: {}, sought: {}, lastSought: {}, hp: {}, chkAt: {}, outUntil: {}, lastTaunt: {}, rp: {} };
    this.hostRound();
  }
  stat(id) { const H = this.H; return H.stats[id] || (H.stats[id] = { finds: 0, wrong: 0, taunts: 0, hidden: 0, survived: 0 }); }
  hostRound() {
    const H = this.H, list = this.roster(); if (list.length < PH.MIN) { this.phase = 'waiting'; this.send('phLobby', { n: list.length }); return; }
    H.r++; for (const p of list) if (H.tot[p.id] == null) H.tot[p.id] = 0;
    const nS = list.length <= 4 ? 1 : list.length <= 8 ? 2 : 3;
    const order = shuffle(list).sort((a, b) => (H.sought[a.id] || 0) - (H.sought[b.id] || 0) || (H.lastSought[a.id] || 0) - (H.lastSought[b.id] || 0));
    const seek = order.slice(0, nS).map(p => p.id), hide = list.map(p => p.id).filter(id => !seek.includes(id));
    for (const id of seek) { H.sought[id] = (H.sought[id] || 0) + 1; H.lastSought[id] = H.r; H.hp[id] = PH.HP; }
    H.rp = {}; H.hits = {}; H.found = new Set(); H.lastTaunt = {}; H.outUntil = {}; H.seekStart = 0; H.foundAt = {};
    const st = Math.min(PH.SEEK_MAX, PH.SEEK_BASE + PH.SEEK_PER * hide.length);
    this.roundMsg = { r: H.r, of: H.of, seek, hide, list, ht: PH.HIDE_T, st, lay: this.hostLayout(), tot: H.tot };
    H.ends = now() + PH.HIDE_T; H.seekT = st; H.clockT = 2;
    this.send('phRound', { ...this.roundMsg });
  }
  // a game that's just come in (pressed PLAY late, or came back): everything as it is now
  hostHello(id) {
    if (!this.H || this.phase === 'waiting') { this.net.send({ t: 'phLobby', n: this.roster().length }); return; }
    const kinds = {}, locks = {}, found = [], hp = {};
    for (const p of this.players.values()) { if (p.kind) kinds[p.id] = p.kind; if (p.locked && p.lp) locks[p.id] = [p.lp[0], p.lp[1], p.ly || 0]; if (p.found) found.push(p.id); if (p.role === 'seeker') hp[p.id] = this.H.hp[p.id] ?? PH.HP; }
    this.net.send({ t: 'phState', to: id, round: this.roundMsg, ph: this.phase, left: Math.max(0, (this.phase === 'roundend' ? this.H.nextAt : this.H.ends) - now()), kinds, locks, found, hp, tot: this.H.tot, last: this.lastEnd || null, over: this.overMsg || null });
  }
  hostIn(k, m, from) {
    const H = this.H; if (!H || k !== 'phChk') return; const P = this.players.get(from);
    if (this.phase !== 'seek' || !P || P.role !== 'seeker' || P.gone || (H.outUntil[from] || 0) > now() || now() - (H.chkAt[from] || 0) < PH.SHOOT_CD * 0.7) return;
    H.chkAt[from] = now(); const sp = this.posOf(from, new THREE.Vector3()); if (!sp) return;
    const v = typeof m.v === 'string' ? m.v : '', at = Array.isArray(m.p) && m.p.length === 3 && m.p.every(n => typeof n === 'number' && isFinite(n)) ? new THREE.Vector3(...m.p) : null;
    if (v.startsWith('h:')) { const id = v.slice(2), T = this.players.get(id), tp = T && this.posOf(id, new THREE.Vector3());
      const lp = T && T.locked && T.lp ? new THREE.Vector3(T.lp[0], 0, T.lp[1]) : null, q = lp || tp;
      if (T && T.role === 'hider' && !T.found && !T.gone && q && this.hd(sp, q) < PH.SHOOT_R + 1.6 && (!at || this.hd(at, q) < 1.8)) {
        const hits = H.hits || (H.hits = {}); hits[id] = (hits[id] || 0) + 1;
        if (hits[id] < PH.HIDER_HITS) { this.send('phHit', { v: id, by: from, n: PH.HIDER_HITS - hits[id], p: [q.x, (at ? at.y : 0.5), q.z] }); return; }
        H.found.add(id); const secs = Math.max(0, now() - H.seekStart); this.stat(id).hidden += secs; this.stat(from).finds++;
        H.hp[from] = Math.min(PH.HP, (H.hp[from] || PH.HP) + PH.HEAL);
        this.send('phFound', { v: id, by: from, p: [q.x, (at ? at.y : 0.5), q.z], k: T.kind || '', hp: H.hp[from] });
        this.addPts(from, PH.PTS.find, 'FOUND ' + this.nameOf(id).toUpperCase()); this.addPts(id, Math.floor(secs * PH.PTS.perSec), 'HID FOR ' + Math.floor(secs) + 's');
        this.hostCheckEnd(); return; }
      this.send('phMiss', { by: from, hp: H.hp[from] ?? PH.HP, d: -1 }); return; }      // (a hider that wasn't there by the time it got here: no penalty)
    if (v.startsWith('d:')) { const i = Number(v.slice(2)), d = this.decoys[i]; if (!Number.isInteger(i) || !d || this.hd(sp, d) > PH.SHOOT_R + 1.6) return;
      this.stat(from).wrong++; H.hp[from] = Math.max(0, (H.hp[from] ?? PH.HP) - PH.MISS); this.send('phMiss', { by: from, hp: H.hp[from], d: i });
      if (H.hp[from] <= 0) { H.outUntil[from] = now() + PH.OUT_T; this.send('phOut', { id: from, secs: PH.OUT_T }); this.addPts(from, PH.PTS.out, 'KNACKERED'); } }
  }
  addPts(id, d, why) { const H = this.H; if (!H || !d) return; H.tot[id] = (H.tot[id] || 0) + d; H.rp[id] = (H.rp[id] || 0) + d; this.send('phPts', { id, d, why: String(why).slice(0, 40) }); }
  // a taunt reached the host: points (more if a seeker's close: BRAVE), and the quiet clock starts again
  hostTaunt(from) {
    const H = this.H, P = this.players.get(from); if (!H || !P || P.role !== 'hider' || P.found || !this.playing()) return;
    if (now() - (H.lastTaunt[from] || -99) < PH.TAUNT_CD - 1.5 && H.lastTaunt[from] !== H.seekStart) return; H.lastTaunt[from] = now(); this.stat(from).taunts++;
    if (this.phase !== 'seek') return; const at = this.posOf(from, new THREE.Vector3()); let brave = false;
    if (at) for (const s of this.seekers()) { const q = this.posOf(s.id, new THREE.Vector3()); if (q && this.hd(q, at) < PH.BRAVE_R) brave = true; }
    this.addPts(from, brave ? PH.PTS.brave : PH.PTS.taunt, brave ? 'BRAVE TAUNT!' : 'TAUNT');
  }
  hostCheckEnd() {
    if (this.phase !== 'seek') return;
    if (!this.left().length) return this.hostEnd('seekers', 'EVERY HIDER WAS FOUND');
    if (!this.seekers().filter(s => !s.gone).length) return this.hostEnd('hiders', 'THE SEEKERS GAVE UP AND WENT HOME');
  }
  hostEnd(win, why) {
    const H = this.H; if (!H) return; const alive = this.left().map(p => p.id);
    for (const id of alive) { this.stat(id).hidden += H.seekT; this.stat(id).survived++; this.addPts(id, PH.PTS.survive + Math.floor(H.seekT * PH.PTS.perSec), 'SURVIVED!'); }
    if (win === 'seekers') for (const s of this.seekers()) this.addPts(s.id, PH.PTS.sweep, 'FOUND THEM ALL');
    const last = H.r >= H.of; H.nextAt = now() + PH.END_T;
    this.lastEnd = { win, why, r: H.r, of: H.of, rp: H.rp, tot: H.tot, alive, last, stats: H.stats };
    this.send('phEnd', { ...this.lastEnd });
  }
  hostOver() {
    const H = this.H, list = this.roster().map(p => p.id), aw = [];
    const top = (f, min = 1) => { let best = null, bv = min - 1e-9; for (const id of list) { const v = f(this.stat(id)); if (v > bv) { bv = v; best = id; } } return best ? [best, Math.round(bv)] : null; };
    const a = (ico, name, r, unit) => { if (r) aw.push([ico, name, r[0], r[1] + unit]); };
    a('👁️', 'EAGLE EYE', top(s => s.finds), ' FOUND'); a('🫥', 'MASTER OF DISGUISE', top(s => s.hidden, 10), 's HIDDEN'); a('📯', 'GOBBY', top(s => s.taunts), ' TAUNTS'); a('🤦', 'SHOT A BIN', top(s => s.wrong), ' WRONG');
    this.overMsg = { tot: H.tot, aw, stats: H.stats }; this.send('phOver', { ...this.overMsg });
  }
  // someone's dropped out: 20 seconds to come back, then they're out of the round
  hostLeft(id) { const p = this.players.get(id); if (!p || p.gone) return; clearTimeout(p.awayT); p.awayT = setTimeout(() => { if (!this.net.players.has(id) && this.host) { p.gone = true; this.hostCheckEnd(); } }, 20000); }
  becomeHost() {
    if (this.host) return; this.host = true; const list = this.roster(), H = this.H = { r: this.round, of: this.of, tot: { ...this.tot }, stats: this.stats || {}, sought: {}, lastSought: {}, hp: {}, chkAt: {}, outUntil: {}, lastTaunt: {}, rp: {}, found: new Set(), foundAt: {} };
    for (const p of this.players.values()) { if (p.role === 'seeker') { H.sought[p.id] = 1; H.hp[p.id] = p.hp ?? PH.HP; } if (p.found) H.found.add(p.id); }
    H.ends = this.endsAt; H.nextAt = this.endsAt; H.seekT = this.seekT || PH.SEEK_BASE; H.seekStart = this.phase === 'seek' ? this.endsAt - H.seekT : 0; H.clockT = 0;
    if (this.lastRound) this.roundMsg = this.lastRound;
    for (const p of this.players.values()) if (p.id !== this.me && !this.net.players.has(p.id)) this.hostLeft(p.id);
    this.lobbyT = 0; if (!list.length) this.H = null;
  }
  becomeGuest() { this.host = false; this.H = null; }
  hostUpdate(dt) {
    if (this.phase === 'waiting') { if ((this.lobbyT -= dt) <= 0) { this.lobbyT = 2; this.send('phLobby', { n: this.roster().length }); } return; }
    const H = this.H; if (!H) return; const t = now();
    if (this.phase === 'hide' && t >= H.ends) {
      // anyone who didn't pick a prop is given one
      for (const p of this.hiders()) if (!p.kind && !p.found) { const k = this.kinds[Math.floor(Math.random() * this.kinds.length)]; this.net.send({ t: 'phProp', id: p.id, k }); this.setKind(p.id, k); }
      H.ends = t + H.seekT; H.seekStart = t; for (const p of this.hiders()) H.lastTaunt[p.id] = t; this.send('phGo', { st: H.seekT }); return; }
    if (this.phase === 'seek') {
      if (t >= H.ends) { this.hostEnd('hiders', 'TIME! THE HIDERS LEFT WIN'); return; }
      for (const id in H.outUntil) if (H.outUntil[id] && t >= H.outUntil[id]) { H.outUntil[id] = 0; H.hp[id] = PH.OUT_HP; this.send('phBack', { id, hp: PH.OUT_HP }); }
      for (const p of this.left()) if (t - (H.lastTaunt[p.id] || t) > PH.QUIET_T) { H.lastTaunt[p.id] = t; const i = Math.floor(Math.random() * TAUNTS.length); this.send('phAuto', { id: p.id, i }); this.addPts(p.id, PH.PTS.quiet, 'TOO QUIET!'); }
      this.hostCheckEnd(); }
    if (this.phase === 'roundend' && t >= H.nextAt) { if (this.lastEnd && this.lastEnd.last) this.hostOver(); else this.hostRound(); return; }
    if ((H.clockT -= dt) <= 0 && this.playing()) { H.clockT = 2; this.send('phClock', { ph: this.phase, left: Math.max(0, H.ends - t) }); }
  }

  // ------------------------------------------------------------------ everyone: what the referee says happened
  apply(k, m) {
    if (k === 'phLobby') { this.lobbyN = Number(m.n) || 0; if (this.phase !== 'over' && this.phase !== 'waiting' && !this.H) this.phase = 'waiting'; return; }
    if (k === 'phRound') return this.startRound(m);
    if (k === 'phGo') { this.phase = 'seek'; this.seekT = Number(m.st) || PH.SEEK_BASE; this.endsAt = now() + this.seekT; this.released(); return; }
    if (k === 'phClock') { const l = Number(m.left); if (isFinite(l) && (m.ph === this.phase)) this.endsAt = now() + l; return; }
    if (k === 'phFound') return this.found(m);
    if (k === 'phMiss') return this.missed(m);
    if (k === 'phHit') return this.shotHit(m);
    if (k === 'phOut') { const p = this.players.get(m.id); if (p) { p.out = now() + (Number(m.secs) || PH.OUT_T); p.hp = 0; } if (m.id === this.me) this.knackered(); else this.feed(`😵 ${esc(this.nameOf(m.id))} IS KNACKERED`); return; }
    if (k === 'phBack') { const p = this.players.get(m.id); if (p) { p.out = 0; p.hp = Number(m.hp) || PH.OUT_HP; } if (m.id === this.me) { this.toast('BACK ON YOUR FEET!'); this.flashEl.className = ''; } return; }
    if (k === 'phPts') { const id = m.id, d = Number(m.d) || 0; this.tot[id] = (this.tot[id] || 0) + d; if (id === this.me) this.pop((d > 0 ? '+' : '') + d + ' ' + (m.why || ''), d > 0 ? '#39ff14' : '#ff5252'); return; }
    if (k === 'phAuto') { const p = this.players.get(m.id); if (!p) return; this.taunted(m.id, m.i, true); if (m.id === this.me) { this.toast('TOO QUIET! AUTO-TAUNT −15'); this.lastTaunt = now(); } return; }
    if (k === 'phEnd') return this.roundOver(m);
    if (k === 'phOver') return this.gameOver(m);
    if (k === 'phState') { if (m.round) this.startRound(m.round, true); const P = (id) => this.players.get(id);
      if (m.kinds && typeof m.kinds === 'object') for (const id in m.kinds) this.setKind(id, m.kinds[id], true);
      if (m.locks && typeof m.locks === 'object') for (const id in m.locks) { const l = m.locks[id]; if (Array.isArray(l)) this.setLock(id, { on: 1, p: [l[0], l[1]], y: l[2] }, true); }
      if (Array.isArray(m.found)) for (const id of m.found) { const p = P(id); if (p) { p.found = true; this.dropProp(id); } }
      if (m.hp && typeof m.hp === 'object') for (const id in m.hp) { const p = P(id); if (p) p.hp = Number(m.hp[id]); }
      if (m.tot && typeof m.tot === 'object') this.tot = { ...m.tot };
      const l = Number(m.left) || 0; if (m.ph === 'seek') { this.phase = 'seek'; this.endsAt = now() + l; this.released(true); } else if (m.ph === 'hide') this.endsAt = now() + l;
      if (m.ph === 'roundend' && m.last) this.roundOver(m.last); if (m.ph === 'over' && m.over) this.gameOver(m.over);
      this.syncPuppets(); return; }
  }
  startRound(m, late) {
    if (!m || !Array.isArray(m.list) || !Array.isArray(m.seek)) return;
    this.lastRound = m; this.panel.close(true); this.lockOff(true); this.closePicker();
    for (const id of [...this.props.keys()]) this.dropProp(id);
    this.players.clear(); const seek = new Set(m.seek.map(String));
    for (const p of m.list) { if (!p || p.id == null) continue; const id = String(p.id); this.players.set(id, { id, name: String(p.name || 'PLAYER').slice(0, 20), char: String(p.char || 'ronnie').slice(0, 20), role: seek.has(id) ? 'seeker' : 'hider', found: false, kind: null, locked: false, hp: PH.HP, out: 0 }); }
    if (!this.players.has(this.me)) this.players.set(this.me, { id: this.me, name: this.net.name || 'YOU', char: this.net.char, role: 'spec', found: false, kind: null, hp: 0 });
    this.round = Number(m.r) || 1; this.of = Number(m.of) || 4; this.seekT = Number(m.st) || PH.SEEK_BASE; if (m.tot && typeof m.tot === 'object') this.tot = { ...m.tot };
    this.layDecoys(m.lay); this.phase = 'hide'; this.endsAt = now() + (Number(m.ht) || PH.HIDE_T); this.lastTaunt = now(); this.tauntCD = 0; this.swapAt = 0; this.spect = null; this.countBeep = -1;
    this.g.player.ghost = false;
    if (!late) { this.respawn(); this.showRole(); }
    this.syncPuppets(); this.feed(`🔔 ROUND ${this.round} OF ${this.of}`);
  }
  // the seekers are let loose
  released(quiet) {
    const me = this.mine(); this.blind(false);
    if (me && me.role === 'hider' && !me.kind && !quiet) this.toast('YOU DIDN\'T PICK! YOU\'RE A RANDOM THING NOW');
    if (quiet) return; sfx('whistle_ref', null, 1); setTimeout(() => sfx('whistle_ref', null, 0.8), 380);
    this.splash(me && me.role === 'seeker' ? '#ff9f1c' : '#39ff14', me && me.role === 'seeker' ? '<p>READY OR NOT...</p><h1>GO GET \'EM!</h1><p>🔫 Shoot anything that looks off. Three hits finds a hider. Shooting the real thing costs you ❤</p>' : '<p>READY OR NOT...</p><h1>HERE THEY COME!</h1><p>Stay still. Lock in. Taunt for points.</p>', 2200);
    if (this.g.renderer.xr.isPresenting) this.g.showBanner('READY OR NOT', me && me.role === 'seeker' ? 'GO GET \'EM!' : 'HERE THEY COME!');
  }
  found(m) {
    const vic = this.players.get(m.v); if (!vic) return; vic.found = true; const S = this.players.get(m.by); if (S && m.hp != null) S.hp = Number(m.hp);
    const pr = this.props.get(m.v), at = pr ? pr.pos.clone() : (Array.isArray(m.p) ? new THREE.Vector3(m.p[0], this.floor(m.p[0], m.p[2]), m.p[2]) : null);
    if (pr) { pr.foundT = 0.001; pr.gone = true; } if (at) { this.burst(at.clone().add({ x: 0, y: 0.6, z: 0 }), [0xffd400, 0xff3b3b, 0x39ff14, 0x4fc3ff, 0xffffff], 40, 3.2); this.puff(at, 10); }
    sfx('ph_found', at, 1.2); if (at) this.g.words && this.g.words.show('FOUND!', at.clone().add({ x: 0, y: 1.6, z: 0 }), '#ff3b3b', 0.4, 1.8);
    const kn = m.k && this.K[m.k] ? this.K[m.k].name : 'SOMETHING';
    this.feed(`🔍 <b>${esc(this.nameOf(m.by))}</b> FOUND <b>${esc(this.nameOf(m.v))}</b> (${esc(kn)})`);
    this.foundToast(vic, S, kn);
    if (m.v === this.me) { this.lockOff(true); this.closePicker(); this.g.player.ghost = true; this.splash('#ff5252', `<p>🔍 BUSTED!</p><h1>YOU'VE BEEN FOUND</h1><div class="imgs"><img src="./assets/portraits/${esc(S ? S.char : 'ronnie')}.webp"></div><p>by <b>${esc(this.nameOf(m.by).toUpperCase())}</b>. You were ${esc(kn.toLowerCase())}.</p><p class="sm">You're a ghost now 👻 Float about and WATCH the others.</p>`, 4200); sfx('sadviolin', null, 0.8);
      if (this.g.renderer.xr.isPresenting) this.g.showBanner('FOUND BY ' + this.nameOf(m.by).toUpperCase(), 'YOU\'RE A GHOST'); }
    if (m.by === this.me) { this.pop('FOUND ' + this.nameOf(m.v).toUpperCase() + '! +❤', '#39ff14'); if (this.g.renderer.xr.isPresenting) this.g.showBanner('FOUND!', this.nameOf(m.v).toUpperCase()); }
    this.syncPuppets();
  }
  // a hider shot but not out yet: their prop jumps, everyone sees the sparks; they get told to MOVE
  shotHit(m) {
    const vic = this.players.get(m.v); if (!vic) return; const n = Math.max(1, Number(m.n) || 1), pr = this.props.get(m.v);
    const at = pr ? pr.pos.clone().add({ x: 0, y: this.K[pr.kind] ? this.K[pr.kind].h * 0.6 : 0.5, z: 0 }) : (Array.isArray(m.p) ? new THREE.Vector3(m.p[0], m.p[1], m.p[2]) : null);
    if (pr) pr.jig = 0.001; if (at) { this.burst(at, [0xff3b3b, 0xffd400, 0xffffff], 14, 1.6); sfx('ph_hit', at, 1); }
    if (m.v === this.me) { this.pop(`🔫 YOU'VE BEEN SHOT! ${n} MORE AND YOU'RE OUT. MOVE!`, '#ff5252'); this.flashEl.className = 'hurt'; void this.flashEl.offsetWidth; this.flashEl.className = 'hurt on'; for (const h of this.g.player.hands || []) h.pulse && h.pulse(0.8, 160);
      if (this.g.renderer.xr.isPresenting) this.g.showBanner('YOU\'VE BEEN SHOT!', `${n} MORE AND YOU'RE OUT`); }
    if (m.by === this.me) this.pop(`🎯 HIT! ${n} MORE TO FIND THEM`, '#39ff14');
  }
  missed(m) {
    const S = this.players.get(m.by); if (S && m.hp != null) S.hp = Number(m.hp); const i = Number(m.d), d = Number.isInteger(i) && i >= 0 ? this.decoys[i] : null;
    if (d) { d.wob = 0.001; this.burst(new THREE.Vector3(d.x, (d.e ? d.e.pos.y : d.y) + this.K[d.k].h, d.z), [0xff3b3b, 0xffffff], 10, 1.4); }
    if (m.by !== this.me) return;
    if (!d) { this.pop('MISSED! (THEY MOVED)', '#ffd400'); return; }
    sfx('ph_wrong', null, 0.9); this.pop(`✗ JUST ${this.K[d.k].name}. −${PH.MISS} ❤`, '#ff5252');
    this.flashEl.className = 'hurt'; void this.flashEl.offsetWidth; this.flashEl.className = 'hurt on'; this.topEl.classList.remove('shake'); void this.topEl.offsetWidth; this.topEl.classList.add('shake');
    const P = this.g.player; for (const h of P.hands || []) h.pulse && h.pulse(0.6, 120);
  }
  knackered() { this.flashEl.className = 'out'; this.splash('#ff9f1c', '<p>😵 YOU SHOT ONE BIN TOO MANY</p><h1>KNACKERED!</h1><p>Have a sit down for 10 seconds</p>', 3000); sfx('sadviolin', null, 0.7); if (this.g.renderer.xr.isPresenting) this.g.showBanner('KNACKERED!', 'BACK IN 10s'); }
  roundOver(m) {
    if (!m || typeof m !== 'object') return; const obj = (o) => o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    m = { ...m, tot: obj(m.tot), rp: obj(m.rp), stats: obj(m.stats), alive: Array.isArray(m.alive) ? m.alive.map(String) : [], r: Number(m.r) || this.round, of: Number(m.of) || this.of }; this.phase = 'roundend'; this.lastEndMsg = m; this.endsAt = now() + PH.END_T; this.blind(false); this.lockOff(true); this.closePicker();
    if (m.tot && typeof m.tot === 'object') this.tot = { ...m.tot }; if (m.stats && typeof m.stats === 'object') this.stats = m.stats;
    const me = this.mine(), mine = me && ((m.win === 'seekers') === (me.role === 'seeker')); sfx(mine ? 'fanfare' : 'sadviolin', null, 0.9);
    // the hiders that made it: their props bounce, a name over each
    if (Array.isArray(m.alive)) for (const id of m.alive) { const pr = this.props.get(id); if (pr) pr.reveal = 0.001; }
    this.feed(m.win === 'seekers' ? '🏆 THE SEEKERS WIN THE ROUND' : '🏆 THE HIDERS WIN THE ROUND');
    if (this.g.renderer.xr.isPresenting) this.g.showBanner(m.win === 'seekers' ? 'THE SEEKERS WIN' : 'THE HIDERS WIN', `ROUND ${m.r} OF ${m.of}`);
    setTimeout(() => { if (this.phase === 'roundend' && this.lastEndMsg === m) this.panel.show(this.summaryScreen(m), { canClose: true }); }, 1800);
  }
  gameOver(m) {
    if (!m || typeof m !== 'object') return; this.phase = 'over'; this.overM = m; if (m.tot && typeof m.tot === 'object') this.tot = { ...m.tot }; if (m.stats && typeof m.stats === 'object') this.stats = m.stats;
    for (const id of [...this.props.keys()]) this.dropProp(id); this.g.player.ghost = false; this.blind(false); this.syncPuppets();
    const ranked = this.ranked(), me = ranked.findIndex(r => r.id === this.me); sfx(me === 0 ? 'fanfare' : 'cheer', null, 1);
    this.panel.show(this.resultsScreen(m), { canClose: false });
    if (this.g.renderer.xr.isPresenting) this.g.showBanner('GAME OVER', ranked[0] ? ranked[0].name.toUpperCase() + ' WINS' : '');
  }
  ranked() { const ids = new Set([...Object.keys(this.tot), ...this.players.keys()]); return [...ids].map(id => ({ id, name: this.nameOf(id), char: (this.players.get(id) || this.net.players.get(id) || {}).char || (id === this.me ? this.net.char : 'ronnie'), pts: this.tot[id] || 0 })).sort((a, b) => b.pts - a.pts); }

  // ------------------------------------------------------------------ hiders: become a prop, lock, taunt
  become(k) {
    const me = this.mine(); if (!me || me.role !== 'hider' || me.found || !this.playing() || !this.K[k]) return;
    if (me.kind === k) { this.toast('YOU\'RE ALREADY ' + this.K[k].name); return; }
    if (now() < (this.swapAt || 0)) { this.toast('HOLD ON A SEC...'); return; } this.swapAt = now() + PH.SWAP_CD;
    this.net.send({ t: 'phProp', k }); this.setKind(this.me, k);
    if (this.g.renderer.xr.isPresenting) this.g.showBanner('YOU ARE NOW', this.K[k].name);
  }
  setKind(id, k, quiet) {
    const p = this.players.get(String(id)); if (!p || p.role !== 'hider' || p.found || !this.K[k] || !this.inRound()) return;
    const was = p.kind; p.kind = k; const pr = this.ensureProp(p.id); if (!pr) return;
    if (!quiet) { pr.pop = 0.001; this.puff(pr.pos, 8); this.burst(pr.pos.clone().add({ x: 0, y: this.K[k].h * 0.6, z: 0 }), [0xffffff, 0xffd400, 0xff9ff3], 18, 1.8); sfx('ph_poof', pr.pos, 1); }
    if (id === this.me && !quiet) this.pop((was ? 'NOW ' : 'YOU\'RE ') + this.K[k].name + '!', '#ffd400');
    this.syncPuppets();
  }
  toggleLock() {
    const me = this.mine(); if (!me || me.role !== 'hider' || me.found || !me.kind || !this.playing()) { if (me && me.role === 'hider' && !me.kind) this.toast('PICK A PROP FIRST'); return; }
    if (me.locked) { this.lockOff(); return; }
    const pr = this.props.get(this.me); const x = pr ? pr.pos.x : this.g.player.head.x, z = pr ? pr.pos.z : this.g.player.head.z, y = pr ? pr.yaw : 0;
    const m = { on: 1, p: [Math.round(x * 100) / 100, Math.round(z * 100) / 100], y: Math.round(y * 100) / 100 }; this.net.send({ t: 'phLock', ...m }); this.setLock(this.me, m);
    sfx('ph_lock', null, 0.8); this.lockFx(true);
  }
  lockOff(quiet) { const me = this.mine(); if (!me || !me.locked) return; me.locked = false; me.lp = null; this.net.send({ t: 'phLock', on: 0 }); if (!quiet) { sfx('ph_unlock', null, 0.7); this.lockFx(false); } }
  setLock(id, m, quiet) {
    const p = this.players.get(String(id)); if (!p || p.role !== 'hider' || p.found) return;
    p.locked = !!m.on; const ok = Array.isArray(m.p) && m.p.length === 2 && m.p.every(n => typeof n === 'number' && isFinite(n) && Math.abs(n) < 1e4);
    p.lp = p.locked && ok ? [m.p[0], m.p[1]] : null; p.ly = typeof m.y === 'number' && isFinite(m.y) ? m.y : 0; if (p.locked && !p.lp) p.locked = false;
    if (quiet) return;
  }
  doTaunt() {
    const me = this.mine(); if (!me || me.role !== 'hider' || me.found || !this.playing()) return;
    if (!me.kind) { this.toast('PICK A PROP FIRST'); return; } const t = now(); if (t < (this.tauntCD || 0)) { this.toast(`TAUNT READY IN ${Math.ceil(this.tauntCD - t)}s`); return; }
    const i = Math.floor(Math.random() * TAUNTS.length); this.tauntCD = t + PH.TAUNT_CD; this.lastTaunt = t;
    this.net.send({ t: 'phTaunt', i }); this.taunted(this.me, i, false); if (this.host) this.hostTaunt(this.me);
  }
  // a taunt: the sound from where they are, a word over them, a burst of notes
  taunted(id, i, auto) {
    const p = this.players.get(String(id)); if (!p || p.role !== 'hider' || p.found || !this.playing()) return false; const tt = TAUNTS[Number(i)] || TAUNTS[0];
    if (now() - (p.tauntAt || -99) < 1) return false; p.tauntAt = now();
    const pr = this.props.get(p.id), at = pr ? pr.pos : this.posOf(p.id, new THREE.Vector3()); if (!at) return true;
    sfx(tt.s, at.clone().add({ x: 0, y: 0.5, z: 0 }), 1.5); const h = pr && pr.kind ? this.K[pr.kind].h : 1;
    this.g.words && this.g.words.show(tt.w, at.clone().add({ x: 0, y: h + 0.45, z: 0 }), auto ? '#ff9f1c' : '#ffd400', 0.22, 1.6);
    this.burst(at.clone().add({ x: 0, y: h + 0.1, z: 0 }), [0xffd400, 0xff4fa3, 0x4fc3ff], 14, 1.5); if (pr) pr.jig = 0.001;
    return true;
  }
  // a hider's prop, drawn on everyone's game (and your own, seen from behind)
  ensureProp(id) {
    const p = this.players.get(id); if (!p || !p.kind) return null; let pr = this.props.get(id);
    if (pr && pr.kind === p.kind) return pr; const K = this.K[p.kind];
    const at = pr ? pr.pos.clone() : (this.posOf(id, new THREE.Vector3()) || new THREE.Vector3());
    if (pr) this.grp.remove(pr.grp);
    const grp = new THREE.Group(), body = new THREE.Group(); grp.add(body); for (const [geo, mat] of K.parts) { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = !!this.g.room.shadows; body.add(m); }
    body.scale.setScalar(K.s); body.position.y = K.y0; this.grp.add(grp);
    pr = { id, kind: p.kind, grp, body, pos: at, yaw: pr ? pr.yaw : 0, pop: 0, tag: null, tagKey: '' }; grp.position.copy(at); this.props.set(id, pr); return pr;
  }
  dropProp(id) { const pr = this.props.get(id); if (!pr) return; this.grp.remove(pr.grp); if (pr.tag) pr.tag.material.map.dispose(); this.props.delete(id); }
  // a name over a hider's prop: for the other hiders and the found (never a seeker); "YOU" over your own
  propTag(pr, want, text, col) {
    if (!want) { if (pr.tag) pr.tag.visible = false; return; } const key = text + col;
    if (!pr.tag || pr.tagKey !== key) { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = 'rgba(0,0,0,0.55)'; rr(x, 4, 6, 248, 52, 26); x.fill(); txt(x, text, 128, 33, 30, col, 'center', 236);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; if (pr.tag) { pr.tag.material.map.dispose(); pr.tag.material.map = t; pr.tag.material.needsUpdate = true; }
      else { pr.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); pr.tag.renderOrder = 22; pr.tag.scale.set(0.56, 0.14, 1); pr.grp.add(pr.tag); } pr.tagKey = key; }
    pr.tag.visible = true; pr.tag.position.y = this.K[pr.kind].h + 0.28 + Math.sin(performance.now() / 300) * 0.02;
  }
  // every character drawn right: a hider who's a prop (or found) isn't there as a person; nor is someone sat out
  syncPuppets() {
    const round = this.inRound();
    for (const r of this.roster()) { const av = this.avatar(r.id); if (!av) continue; const p = this.players.get(r.id);
      av.impHidden = !!(round && (!p || p.role === 'spec' || (p.role === 'hider' && (p.kind || p.found)))); av.impBody = false; av.impRed = false; }
  }
  respawn() {
    const room = this.g.room, s = room.start || { x: 0, z: 0, yaw: 0 }, list = this.roster(), i = Math.max(0, list.findIndex(p => p.id === this.me)), a = (i / Math.max(1, list.length)) * Math.PI * 2;
    let x = s.x + Math.cos(a) * (i ? 0.9 : 0), z = s.z + Math.sin(a) * (i ? 0.9 : 0); const nav = room.nav;
    if (nav) { const k = nav.nearestFree(x, z); if (k >= 0) { const c = nav.center(k); x = c.x; z = c.y; } }
    this.teleport(x, z, s.yaw);
  }
  teleport(x, z, yaw) { this.pinAt = null; const P = this.g.player, cam = P.camera.getWorldPosition(new THREE.Vector3()); P.rig.position.x += x - cam.x; P.rig.position.z += z - cam.z; P.head.x = x; P.head.z = z; if (yaw !== undefined && P.flatMode) P.flatYaw = yaw - P.rig.rotation.y; }
  // pinned where you are (a seeker with the blindfold on, a hider locked in, a knackered seeker): walking does nothing
  pin(on) {
    const P = this.g.player; if (!on) { this.pinAt = null; return; } if (!this.pinAt) this.pinAt = { x: P.head.x, z: P.head.z };
    P.fx.frozen = Math.max(P.fx.frozen || 0, 0.12); const dx = P.head.x - this.pinAt.x, dz = P.head.z - this.pinAt.z; if (Math.hypot(dx, dz) > 0.05) { P.rig.position.x -= dx; P.rig.position.z -= dz; P.head.x -= dx; P.head.z -= dz; }
  }
  clearFood() { const it = this.g.items; if (!it) return; it.minFood = 0; it.respawnQueue.length = 0; for (const f of it.items.slice()) if (!f.def.prop) it.remove(f); }

  // ------------------------------------------------------------------ seekers: check
  doCheck(ray) {
    const me = this.mine(); if (!me || me.role !== 'seeker' || this.phase !== 'seek' || this.panel.open) return;
    if (me.out > now()) { this.toast('YOU\'RE KNACKERED. HAVE A SIT DOWN'); return; } if (now() < (this.chkCD || 0)) return; this.chkCD = now() + PH.SHOOT_CD;
    if (!ray) ray = this.aimRay(); if (!ray) return;
    const hit = this.pick(ray, { maxD: PH.SHOOT_R }), P = this.g.player;
    const end = hit ? new THREE.Vector3(hit.x, hit.y, hit.z) : ray.origin.clone().addScaledVector(ray.direction, this.wallT(ray, PH.SHOOT_R));
    const from = this.muzzle(ray), r2 = (v) => [Math.round(v.x * 100) / 100, Math.round(v.y * 100) / 100, Math.round(v.z * 100) / 100];
    this.shotFx(from, end, !!hit, true); this.gunKick[this.me] = 1; sfx('ph_shot', null, 0.85); for (const h of P.hands || []) if (h.handedness === 'right') h.pulse && h.pulse(0.7, 70);
    this.net.send({ t: 'phShot', a: r2(from), b: r2(end), h: hit ? 1 : 0 });
    if (!hit) return;      // (a wall or the floor: no harm done)
    this.ask('phChk', { v: hit.kind === 'h' ? 'h:' + hit.id : 'd:' + hit.i, p: r2(end) });
  }
  // how far a shot goes before a wall, a tall shelf or the floor stops it
  wallT(ray, max) {
    let t = max; if (!this.walls) this.walled(ray, 0);
    for (const b of this.walls) { if (b.containsPoint(ray.origin)) continue; const p = ray.intersectBox(b, _hit); if (p) t = Math.min(t, p.distanceTo(ray.origin)); }
    if (ray.direction.y < -0.02) t = Math.min(t, (ray.origin.y - this.floor(ray.origin.x, ray.origin.z)) / -ray.direction.y);
    return Math.max(0.3, t);
  }
  // the end of the gun's barrel (where the tracer starts)
  muzzle(ray) {
    const g = this.vGun && this.vGun.visible ? this.vGun : this.vrGun && this.vrGun.parent && this.vrGun.visible ? this.vrGun : null;
    if (g) { g.updateMatrixWorld(true); return g.localToWorld(new THREE.Vector3(0, 0.035, -0.36)); }
    return ray.origin.clone().addScaledVector(ray.direction, 0.3).add({ x: 0, y: -0.12, z: 0 });
  }
  // ------------------------------------------------------------------ the gun: a chunky toy blaster
  gunGeo() {
    if (this._gunGeo) return this._gunGeo; const p = [], X = [Math.PI / 2, 0, 0], SX = [0, 0, Math.PI / 2], YZ = [0, Math.PI / 2, 0];
    const OR = 0xff7a1a, OR2 = 0xd85a10, BK = 0x1c1c1e, GY = 0x3a3f47, SL = 0xc8ccd2, YL = 0xffd400, GR = 0x39ff14, GR2 = 0x1d8a0a, WH = 0xf4f4f4;
    // the body: a boxy receiver with a rounded top and a darker belly, a white racing stripe down each side
    B(p, 0.06, 0.062, 0.22, OR, 0, 0.018, -0.085); C(p, 0.03, 0.03, 0.22, OR, 0, 0.049, -0.085, X, 18);
    B(p, 0.054, 0.022, 0.19, OR2, 0, -0.022, -0.09); B(p, 0.05, 0.02, 0.05, OR2, 0, 0.03, 0.035, [-0.35, 0, 0]);      // the belly, the sloped back
    for (const sx of [-1, 1]) { const x = sx * 0.0305;
      B(p, 0.003, 0.012, 0.2, WH, x, 0.0, -0.09); B(p, 0.003, 0.004, 0.2, 0xff3b3b, x, -0.009, -0.09);      // stripe, a thin red pinstripe
      B(p, 0.004, 0.034, 0.085, GY, x, 0.03, -0.06);      // the side panel...
      for (let i = 0; i < 4; i++) B(p, 0.005, 0.004, 0.06, BK, x + sx * 0.0008, 0.019 + i * 0.008, -0.06);      // ...with its cooling slots
      for (const [y, z] of [[0.044, -0.1], [0.044, -0.02], [0.016, -0.1], [0.016, -0.02]]) C(p, 0.004, 0.004, 0.004, SL, x + sx * 0.002, y, z, SX, 8);      // screws
      B(p, 0.012, 0.01, 0.018, BK, x + sx * 0.007, 0.042, 0.005);      // the charging handle sticking out
    }
    // the front: a shroud with vent holes and yellow bands, the barrel, a chunky muzzle with three prongs
    C(p, 0.027, 0.027, 0.075, GY, 0, 0.035, -0.225, X, 18); for (const z of [-0.192, -0.258]) T(p, 0.027, 0.0045, YL, 0, 0.035, z, null);
    for (let i = 0; i < 3; i++) B(p, 0.008, 0.004, 0.012, BK, 0, 0.062, -0.205 - i * 0.02); for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) C(p, 0.0045, 0.0045, 0.004, BK, sx * 0.026, 0.035, -0.205 - i * 0.02, SX, 8);
    C(p, 0.016, 0.016, 0.07, BK, 0, 0.035, -0.29, X, 14); C(p, 0.024, 0.022, 0.03, YL, 0, 0.035, -0.33, X, 18); T(p, 0.024, 0.004, BK, 0, 0.035, -0.345, null);
    C(p, 0.011, 0.011, 0.012, 0x050505, 0, 0.035, -0.345, X, 12);
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3 + Math.PI / 2; B(p, 0.007, 0.007, 0.02, YL, Math.cos(a) * 0.026, 0.035 + Math.sin(a) * 0.026, -0.352, [0, 0, a]); }
    // the pump under the barrel: grippy ridges
    C(p, 0.017, 0.017, 0.085, BK, 0, -0.012, -0.215, X, 14); for (let i = 0; i < 5; i++) T(p, 0.018, 0.0035, GY, 0, -0.012, -0.185 - i * 0.015, null);
    B(p, 0.012, 0.03, 0.012, BK, 0, 0.008, -0.178);
    // the grip: angled, ridged at the front for your fingers, a cap on the bottom
    B(p, 0.044, 0.12, 0.05, BK, 0, -0.06, 0.005, [0.28, 0, 0]); for (let i = 0; i < 4; i++) B(p, 0.046, 0.007, 0.006, GY, 0, -0.03 - i * 0.022, -0.016 + i * 0.006, [0.28, 0, 0]);
    for (const sx of [-1, 1]) B(p, 0.003, 0.07, 0.034, GY, sx * 0.023, -0.06, 0.008, [0.28, 0, 0]);      // rubber panels
    B(p, 0.05, 0.018, 0.058, OR2, 0, -0.118, 0.022, [0.28, 0, 0]);
    // the trigger, its guard, the hammer at the back
    B(p, 0.01, 0.034, 0.01, YL, 0, -0.032, -0.058, [0.35, 0, 0]); T(p, 0.03, 0.005, BK, 0, -0.028, -0.055, YZ, Math.PI);
    B(p, 0.014, 0.02, 0.012, SL, 0, 0.068, 0.04, [-0.5, 0, 0]);
    // the tank on top: green, rounded ends, a red filler cap, a pressure gauge, and a hose round the back into the body
    C(p, 0.027, 0.027, 0.12, GR, 0, 0.09, -0.08, X, 18); S(p, 0.027, GR, 0, 0.09, -0.14, [1, 1, 0.55]); S(p, 0.027, GR, 0, 0.09, -0.02, [1, 1, 0.55]);
    for (const z of [-0.125, -0.035]) T(p, 0.0285, 0.0035, GR2, 0, 0.09, z, null); B(p, 0.01, 0.014, 0.1, GR2, 0, 0.068, -0.08);      // bands, the bracket
    C(p, 0.009, 0.009, 0.012, 0xe0202a, 0, 0.12, -0.11, null, 12); C(p, 0.011, 0.011, 0.004, 0xb01018, 0, 0.127, -0.11, null, 12);      // the cap
    C(p, 0.013, 0.013, 0.006, WH, 0.027, 0.095, -0.06, SX, 16); T(p, 0.013, 0.002, BK, 0.03, 0.095, -0.06, [0, Math.PI / 2, 0]); B(p, 0.002, 0.002, 0.01, 0xe0202a, 0.0315, 0.098, -0.062, [0.6, 0, 0]);      // the gauge
    T(p, 0.032, 0.006, GR2, 0, 0.06, -0.012, YZ, Math.PI * 0.6);
    // sights: a rear notch, a front post with a red dot
    for (const sx of [-1, 1]) B(p, 0.005, 0.016, 0.008, BK, sx * 0.007, 0.088, 0.008); B(p, 0.022, 0.006, 0.012, BK, 0, 0.081, 0.008);
    B(p, 0.005, 0.02, 0.006, BK, 0, 0.07, -0.25); S(p, 0.0045, 0xff2020, 0, 0.081, -0.25);
    // a little light on the back: it's armed
    B(p, 0.016, 0.008, 0.004, GR, 0, 0.05, 0.061, [-0.35, 0, 0]);
    return (this._gunGeo = merge(p));
  }
  newGun() { return new THREE.Mesh(this.gunGeo(), vcLambert); }
  // the shot: a streak of light from the barrel to where it landed, a flash at the gun, sparks where it hit
  shotFx(a, b, hit, mine) {
    if (!this.tracerGeo) { this.tracerGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true); this.tracerGeo.rotateX(Math.PI / 2); this.tracerGeo.translate(0, 0, 0.5); this.flashGeo = new THREE.OctahedronGeometry(0.06); }
    const d = a.distanceTo(b); if (d < 0.05) return; this.shotN = (this.shotN || 0) + 1;
    const tr = new THREE.Mesh(this.tracerGeo, new THREE.MeshBasicMaterial({ color: hit ? 0xffe066 : 0xfff3c4, transparent: true, opacity: 0.95, depthWrite: false }));
    tr.position.copy(a); tr.lookAt(b); tr.scale.set(mine ? 0.007 : 0.012, mine ? 0.007 : 0.012, d); tr.frustumCulled = false; tr.userData.t = 0; tr.userData.life = 0.16; this.grp.add(tr); this.shots.push(tr);
    const fl = new THREE.Mesh(this.flashGeo, new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 1, depthWrite: false }));
    fl.position.copy(a); fl.rotation.set(Math.random() * 3, Math.random() * 3, 0); fl.userData.t = 0; fl.userData.life = 0.09; fl.userData.grow = 1; this.grp.add(fl); this.shots.push(fl);
    this.burst(b, hit ? [0xffd400, 0xffffff, 0xff9f1c] : [0xbfbfbf, 0x8a8a8a, 0xffe066], hit ? 8 : 5, 0.7);
  }
  // seekers hold their gun: yours in front of you (phone/computer) or on your right controller (VR); everyone else's
  // in their right hand, the arm up, pointing where they look
  guns(dt, me, seeker, xr) {
    const P = this.g.player, show = this.inRound() && this.phase !== 'roundend', t = now();
    for (const id in this.gunKick) this.gunKick[id] = Math.max(0, this.gunKick[id] - dt * 7);
    const mineOn = !!(show && seeker && !(me.out > t) && !this.blindOn);
    // phone / computer: in front of the camera, bottom right, kicking back when it fires
    const flatOn = mineOn && !xr && P.flatMode && !!P.camera;
    if (flatOn && !this.vGun) { this.vGun = this.newGun(); this.vGun.scale.setScalar(0.85); P.camera.add(this.vGun); }
    if (this.vGun) { this.vGun.visible = flatOn; if (flatOn) { const k = this.gunKick[this.me] || 0, bob = Math.sin(t * 7) * 0.004 * Math.min(1, (P.flatMove ? Math.hypot(P.flatMove.x, P.flatMove.z) : 0));
      this.vGun.position.set(0.17, -0.17 + bob + k * 0.012, -0.37 + k * 0.05); this.vGun.rotation.set(k * 0.35, 0.06, 0); } }
    const grip = P.flatGrip; if (grip) { if (flatOn && grip.visible) { grip.visible = false; this.gunHidGrip = true; } else if (!flatOn && this.gunHidGrip) { grip.visible = true; this.gunHidGrip = false; } }
    // VR: on the right controller, along the pointer
    const h = xr ? (P.hands || []).find(h => h.source && h.handedness === 'right' && h.ctrl) : null, vrOn = mineOn && !!h;
    if (vrOn && !this.vrGun) this.vrGun = this.newGun();
    if (this.vrGun) { if (vrOn && this.vrGun.parent !== h.ctrl) h.ctrl.add(this.vrGun); if (!vrOn && this.vrGun.parent) this.vrGun.parent.remove(this.vrGun); this.vrGun.visible = vrOn;
      if (vrOn) { const k = this.gunKick[this.me] || 0; this.vrGun.position.set(0, -0.03, 0.09 + k * 0.04); this.vrGun.rotation.set(k * 0.3, 0, 0); } }
    // everyone else's
    const live = new Set();
    if (show) for (const p of this.players.values()) { if (p.role !== 'seeker' || p.id === this.me || p.gone) continue; const np = this.net.players.get(p.id), av = np && np.avatar; if (!av || !np.pose || !Array.isArray(np.pose.q)) continue;
      live.add(p.id); let gm = this.rGuns.get(p.id); if (!gm) { gm = this.newGun(); gm.scale.setScalar(1.15); this.grp.add(gm); this.rGuns.set(p.id, gm); }
      const out = p.out > t; av.gunArm = !out; gm.visible = !out && !(av.emote && av.emote.active); if (!gm.visible) continue;
      const hp = av.handPos ? av.handPos() : null; if (!hp || !isFinite(hp.x)) { gm.visible = false; continue; }
      gm.quaternion.set(...np.pose.q); const k = this.gunKick[p.id] || 0; gm.position.copy(hp); gm.rotateX(k * 0.35); }
    for (const [id, gm] of this.rGuns) if (!live.has(id)) { this.grp.remove(gm); this.rGuns.delete(id); const np = this.net.players.get(id); if (np && np.avatar) np.avatar.gunArm = false; }
  }
  // spectating (found, or sat out): whose eyes next
  doWatch() { const live = [...this.players.values()].filter(p => p.id !== this.me && !p.found && p.role !== 'spec'); if (!live.length) { this.spect = null; return; }
    const i = live.findIndex(p => p.id === this.spect); this.spect = i + 1 >= live.length ? null : live[i + 1].id; this.toast(this.spect ? `WATCHING ${this.nameOf(this.spect).toUpperCase()}` : 'FREE GHOST'); }

  // ------------------------------------------------------------------ the camera: a hider sees their prop from behind
  viewCam() {
    const g = this.g, P = g.player; if (!P.flatMode || g.renderer.xr.isPresenting) { this.viewCamNow = null; return null; }
    const me = this.mine(); let tgt = null, h = 1;
    if (me && me.role === 'hider' && !me.found && me.kind && this.inRound()) { const pr = this.props.get(this.me); if (pr) { tgt = pr.pos; h = this.K[pr.kind].h; } }
    else if (me && (me.found || me.role === 'spec') && this.spect && this.inRound()) { const pr = this.props.get(this.spect); tgt = pr && !pr.gone ? pr.pos : this.posOf(this.spect, new THREE.Vector3()); h = pr && !pr.gone ? this.K[pr.kind].h : 1.6; }
    const grip = P.flatGrip; if (!tgt) { if (grip && this.gripHid) { grip.visible = true; this.gripHid = false; } this.viewCamNow = null; return null; }
    if (grip && grip.visible) { grip.visible = false; this.gripHid = true; }
    const cam = this.tcam || (this.tcam = new THREE.PerspectiveCamera(60, 1, 0.05, 200)), dir = g.camera.getWorldDirection(new THREE.Vector3());
    const look = new THREE.Vector3(tgt.x, tgt.y + Math.max(0.35, h * 0.75), tgt.z), dist = 1.5 + h * 1.3, want = look.clone().addScaledVector(dir, -dist).add({ x: 0, y: 0.35, z: 0 });
    // (not behind a wall or inside the furniture: come in along the line until it's clear, like the emote camera)
    const r = new THREE.Ray(look, want.clone().sub(look).normalize()); let d = look.distanceTo(want);
    if ((this.camT = (this.camT || 0) - 1) <= 0 || !this.camD || Math.abs(this.camD.dir.dot(r.direction)) < 0.995) { this.camT = 4; d = this.camClear(look, r, d); this.camD = { d, dir: r.direction.clone() }; } else d = Math.min(d, this.camD.d);
    want.copy(look).addScaledVector(r.direction, d);
    if (!this.camWas || this.camWas.distanceTo(want) > 4) this.camWas = want.clone(); else this.camWas.lerp(want, 0.35);
    cam.position.copy(this.camWas); cam.quaternion.copy(g.camera.getWorldQuaternion(_q)); cam.aspect = g.camera.aspect; cam.fov = g.camera.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    this.viewCamNow = cam; return cam;
  }

  camClear(look, r, d) {
    const room = this.g.room; if (!this.solids) this.solids = (room.colliders || []).filter(b => b.max.y - b.min.y > 0.2).map(b => new THREE.Box3(b.min.clone(), b.max.clone()));
    for (const b of this.solids) { if (b.containsPoint(look)) continue; const p = r.intersectBox(b, _hit); if (p) { const t = p.distanceTo(look) - 0.2; if (t < d) d = t; } }
    const near = (x, z) => (room.blockers || []).some(b => (b.y1 ?? 2) > 0.3 && x > b.x0 - 0.3 && x < b.x1 + 0.3 && z > b.z0 - 0.3 && z < b.z1 + 0.3)
      || (room.dormant ? room.dormant.entries : []).some(e => !e.woken && e.type === 'chair' && Math.hypot(e.pos.x - x, e.pos.z - z) < 0.6);
    while (d > 0.7 && near(look.x + r.direction.x * d, look.z + r.direction.z * d)) d -= 0.1;
    return Math.max(0.7, d);
  }
  // ------------------------------------------------------------------ the HUD (phone / computer)
  buildUI() {
    const st = document.createElement('style'); st.id = 'ph-style';
    st.textContent = `body.prophunt #btn-eat, body.prophunt #btn-throw, body.prophunt #pu-hud { display: none !important; } body.prophunt.ph-hider #btn-emote { display: none !important; }
#ph-ui { position: fixed; right: max(12px, env(safe-area-inset-right)); bottom: max(14px, env(safe-area-inset-bottom)); display: none; flex-direction: column; align-items: flex-end; gap: 10px; z-index: 45; pointer-events: none; }
body.prophunt.flat #ph-ui { display: flex; } #ph-ui .row { display: flex; gap: 10px; align-items: flex-end; }
#ph-ui button { pointer-events: auto; position: relative; width: 78px; height: 78px; border-radius: 50%; border: 4px solid #fff; color: #fff; font: 900 12px "Arial Black", Arial; text-shadow: 0 2px 3px #000; box-shadow: 0 4px 0 rgba(0,0,0,0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.05; padding: 0; cursor: pointer; transition: transform .12s; }
#ph-ui button:active { transform: scale(0.92); } #ph-ui button b { font-size: 28px; display: block; } #ph-ui button[hidden] { display: none; } #ph-ui button.off { filter: grayscale(1) brightness(0.55); }
#ph-ui button i { position: absolute; top: -6px; right: -4px; font: 900 10px Arial; font-style: normal; background: #111; border: 2px solid #fff; border-radius: 8px; padding: 1px 5px; }
#ph-ui .props { background: #7b2ff7; } #ph-ui .lock { background: #2a6df4; } #ph-ui .lock.on { background: #ff9f1c; animation: phlock 1.2s infinite; } #ph-ui .taunt { background: #e91e63; overflow: hidden; } #ph-ui .become { background: #00b16a; width: 92px; height: 92px; animation: phpulse 0.9s infinite alternate; }
#ph-ui .check { background: #ff5722; width: 104px; height: 104px; } #ph-ui .watch { background: #37474f; } #ph-ui .start { background: #2e7d32; width: 120px; height: 120px; font-size: 15px; animation: phpulse 0.9s infinite alternate; }
#ph-ui .taunt .cdv { position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(rgba(0,0,0,0.62) var(--k, 0%), transparent 0); pointer-events: none; } #ph-ui .taunt .num { position: absolute; font: 900 26px "Arial Black"; }
#ph-quiet { width: 78px; height: 8px; border-radius: 4px; background: rgba(0,0,0,0.5); border: 2px solid #fff; overflow: hidden; } #ph-quiet u { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #39ff14, #ffd400, #ff3b3b); }
@keyframes phpulse { from { box-shadow: 0 4px 0 rgba(0,0,0,0.4), 0 0 0 0 rgba(255,255,255,0.6); } to { box-shadow: 0 4px 0 rgba(0,0,0,0.4), 0 0 0 10px rgba(255,255,255,0); } }
@keyframes phlock { 50% { transform: rotate(-6deg) scale(1.05); } }
#ph-top { position: fixed; left: 50%; top: max(46px, calc(env(safe-area-inset-top) + 42px)); transform: translateX(-50%); z-index: 44; display: none; flex-direction: column; align-items: center; gap: 4px; pointer-events: none; font-family: "Arial Black", Arial; color: #fff; max-width: calc(100vw - 150px); }
body.prophunt.flat #ph-top { display: flex; }
#ph-top .clock { display: flex; align-items: center; gap: 8px; background: rgba(10,12,30,0.85); border: 3px solid #ffd400; border-radius: 16px; padding: 3px 12px; box-shadow: 0 3px 0 rgba(0,0,0,0.4); white-space: nowrap; }
#ph-top .clock small { font-size: 11px; color: #ffd400; letter-spacing: 1px; } #ph-top .clock b { font-size: 24px; min-width: 64px; text-align: center; } #ph-top .clock.hurry { border-color: #ff3b3b; animation: phhurry .5s infinite alternate; } #ph-top .clock.hurry b { color: #ff6b6b; }
@keyframes phhurry { to { transform: scale(1.06); } }
#ph-top .left { display: flex; gap: 3px; align-items: center; background: rgba(10,12,30,0.7); border-radius: 14px; padding: 2px 8px; font-size: 11px; white-space: nowrap; } #ph-top .left span { margin-right: 4px; }
#ph-top .left img { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #39ff14; object-fit: cover; } #ph-top .left img.gone { border-color: #555; filter: grayscale(1) brightness(0.5); }
#ph-top .hp { width: 180px; max-width: 46vw; height: 18px; border-radius: 9px; background: rgba(0,0,0,0.6); border: 2px solid #fff; position: relative; overflow: hidden; } #ph-top .hp u { position: absolute; inset: 0 auto 0 0; background: linear-gradient(90deg, #ff3b3b, #ff7a59); transition: width .3s; } #ph-top .hp span { position: absolute; inset: 0; text-align: center; font: 900 11px Arial; line-height: 15px; text-shadow: 0 1px 2px #000; }
#ph-top .role { font-size: 11px; padding: 2px 10px; border-radius: 10px; } #ph-top .role.hider { background: #00b16a; } #ph-top .role.seeker { background: #ff5722; } #ph-top .role.ghost { background: #6a7fa8; }
#ph-top.shake { animation: phshake .35s; } @keyframes phshake { 20% { transform: translateX(calc(-50% - 8px)); } 40% { transform: translateX(calc(-50% + 8px)); } 60% { transform: translateX(calc(-50% - 5px)); } 80% { transform: translateX(calc(-50% + 4px)); } }
#ph-cross { position: fixed; left: 50%; top: 50%; width: 34px; height: 34px; margin: -17px 0 0 -17px; z-index: 43; display: none; pointer-events: none; border-radius: 50%; border: 3px solid rgba(255,255,255,0.85); box-shadow: 0 0 0 2px rgba(0,0,0,0.4); transition: transform .15s, border-color .15s; }
#ph-cross::after { content: ''; position: absolute; left: 50%; top: 50%; width: 6px; height: 6px; margin: -3px; border-radius: 50%; background: #fff; } #ph-cross.on { display: block; } #ph-cross.hot { border-color: #ffd400; transform: scale(1.25); } #ph-cross.hot::after { background: #ffd400; }
#ph-card { position: fixed; left: 50%; bottom: max(16px, env(safe-area-inset-bottom)); transform: translateX(-50%) translateY(30px); opacity: 0; z-index: 44; display: flex; align-items: center; gap: 10px; background: rgba(10,12,30,0.9); border: 3px solid #00e08a; border-radius: 18px; padding: 8px 14px 8px 8px; color: #fff; font-family: "Arial Black", Arial; pointer-events: none; transition: transform .2s cubic-bezier(.3,1.6,.6,1), opacity .15s; max-width: calc(100vw - 230px); }
#ph-card.on { transform: translateX(-50%) translateY(0); opacity: 1; } #ph-card .pic { font-size: 34px; width: 52px; height: 52px; border-radius: 12px; background: radial-gradient(circle, #2d3a66, #141a33); display: flex; align-items: center; justify-content: center; animation: phspin 2.4s infinite linear; }
@keyframes phspin { 0% { transform: rotateY(0); } 100% { transform: rotateY(360deg); } } #ph-card b { font-size: 15px; display: block; } #ph-card small { font: 700 11px Arial; color: #9fffd0; display: block; } #ph-card em { font: 900 11px Arial; color: #ffd400; font-style: normal; }
#ph-splash { position: fixed; inset: 0; z-index: 66; display: none; align-items: center; justify-content: center; flex-direction: column; background: radial-gradient(circle, rgba(0,0,0,0.45), rgba(0,0,0,0.9)); color: #fff; text-align: center; pointer-events: none; font-family: "Arial Black", Arial; overflow: hidden; }
#ph-splash.on { display: flex; } #ph-splash .rays { position: absolute; left: 50%; top: 50%; width: 220vmax; height: 220vmax; margin: -110vmax; background: repeating-conic-gradient(currentColor 0 6deg, transparent 6deg 18deg); opacity: 0.12; animation: phrays 12s linear infinite; }
@keyframes phrays { to { transform: rotate(360deg); } } #ph-splash > div { position: relative; animation: phin .5s cubic-bezier(.2,1.6,.5,1); max-width: 92vw; }
@keyframes phin { from { transform: scale(0.5); opacity: 0.3; } } #ph-splash h1 { font-size: clamp(32px, 9vw, 78px); margin: 0; letter-spacing: 2px; text-shadow: 0 5px 0 rgba(0,0,0,0.5); } #ph-splash p { font-size: clamp(14px, 3.6vw, 24px); margin: 10px 14px; } #ph-splash p.sm { font-size: clamp(12px, 3vw, 18px); color: #cfe0ff; }
#ph-splash .imgs { display: flex; gap: 10px; margin-top: 10px; justify-content: center; flex-wrap: wrap; } #ph-splash img { width: 78px; height: 78px; border-radius: 50%; border: 4px solid currentColor; object-fit: cover; }
#ph-blind { position: fixed; inset: 0; z-index: 64; display: none; align-items: center; justify-content: center; flex-direction: column; background: #050505; color: #fff; text-align: center; font-family: "Arial Black", Arial; pointer-events: none; }
#ph-blind.on { display: flex; } #ph-blind .eyes { font-size: 70px; animation: phpeek 2s infinite; } @keyframes phpeek { 0%, 80%, 100% { transform: none; } 88% { transform: translateY(-6px) rotate(-8deg); } }
#ph-blind b { font-size: clamp(70px, 22vw, 160px); color: #ffd400; line-height: 1; } #ph-blind p { font-size: clamp(14px, 3.6vw, 22px); margin: 8px 18px; } #ph-blind small { font: 700 13px Arial; color: #aaa; }
#ph-count { position: fixed; left: 50%; top: 40%; transform: translate(-50%, -50%); z-index: 65; font: 900 clamp(90px, 28vw, 200px) "Arial Black"; color: #ffd400; text-shadow: 0 8px 0 rgba(0,0,0,0.5); pointer-events: none; display: none; }
#ph-count.on { display: block; animation: phcount 1s ease-out forwards; } @keyframes phcount { from { transform: translate(-50%, -50%) scale(1.8); opacity: 0; } 30% { opacity: 1; } 75% { opacity: 0.9; } to { transform: translate(-50%, -50%) scale(0.9); opacity: 0; } }
#ph-feed { position: fixed; left: max(10px, env(safe-area-inset-left)); top: max(64px, calc(env(safe-area-inset-top) + 58px)); z-index: 44; display: none; flex-direction: column; gap: 4px; pointer-events: none; width: min(300px, 42vw); }
body.prophunt.flat #ph-feed { display: flex; } #ph-feed div { background: rgba(10,12,30,0.82); border-left: 4px solid #ffd400; border-radius: 8px; padding: 4px 8px; color: #fff; font: 700 12px Arial; animation: phfeed .35s ease-out; } #ph-feed div.old { opacity: 0; transition: opacity 1s; }
@keyframes phfeed { from { transform: translateX(-30px); opacity: 0; } }
#ph-pop { position: fixed; left: 50%; top: 58%; transform: translateX(-50%); z-index: 46; pointer-events: none; font: 900 clamp(16px, 4.6vw, 26px) "Arial Black"; text-shadow: 0 3px 0 #000, 0 0 12px #000; white-space: nowrap; display: none; } #ph-pop.on { display: block; animation: phpop 1.5s ease-out forwards; }
@keyframes phpop { 0% { transform: translateX(-50%) scale(0.4); opacity: 0; } 15% { transform: translateX(-50%) scale(1.15); opacity: 1; } 25% { transform: translateX(-50%) scale(1); } 80% { opacity: 1; } 100% { transform: translateX(-50%) translateY(-40px); opacity: 0; } }
#ph-found { position: fixed; left: 50%; top: 22%; transform: translateX(-50%); z-index: 46; display: none; align-items: center; gap: 10px; background: linear-gradient(90deg, #b71c1c, #ff3b3b); border: 4px solid #fff; border-radius: 40px; padding: 6px 18px 6px 6px; color: #fff; font-family: "Arial Black", Arial; pointer-events: none; box-shadow: 0 8px 24px rgba(0,0,0,0.5); max-width: 94vw; }
#ph-found.on { display: flex; animation: phfound 2.6s ease-out forwards; } #ph-found img { width: 54px; height: 54px; border-radius: 50%; border: 3px solid #fff; object-fit: cover; filter: grayscale(0.2); } #ph-found b { font-size: clamp(18px, 5vw, 30px); display: block; line-height: 1; } #ph-found small { font: 700 12px Arial; display: block; }
@keyframes phfound { 0% { transform: translateX(-50%) scale(0.2) rotate(-12deg); opacity: 0; } 12% { transform: translateX(-50%) scale(1.15) rotate(3deg); opacity: 1; } 20% { transform: translateX(-50%) scale(1) rotate(0); } 85% { opacity: 1; } 100% { transform: translateX(-50%) translateY(-30px); opacity: 0; } }
#ph-flash { position: fixed; inset: 0; z-index: 42; pointer-events: none; opacity: 0; } #ph-flash.hurt.on { animation: phhurt .5s ease-out; background: radial-gradient(ellipse, rgba(255,0,0,0) 40%, rgba(255,0,0,0.55)); }
#ph-flash.out { opacity: 1; background: radial-gradient(ellipse, rgba(60,0,0,0.3) 30%, rgba(30,0,0,0.85)); } @keyframes phhurt { from { opacity: 1; } to { opacity: 0; } }
#ph-ghost { position: fixed; inset: 0; pointer-events: none; z-index: 5; opacity: 0; transition: opacity .8s; background: radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(120,170,255,0.38) 100%); } #ph-ghost.on { opacity: 1; }
#ph-lockfx { position: fixed; left: 50%; top: 45%; transform: translate(-50%, -50%); z-index: 46; font-size: 90px; pointer-events: none; display: none; } #ph-lockfx.on { display: block; animation: phlockfx .8s ease-out forwards; }
@keyframes phlockfx { 0% { transform: translate(-50%, -50%) scale(2); opacity: 0; } 25% { transform: translate(-50%, -50%) scale(0.9); opacity: 1; } 40% { transform: translate(-50%, -50%) scale(1.05); } 100% { transform: translate(-50%, -80%) scale(0.7); opacity: 0; } }
@media (max-width: 520px) { #ph-ui button { width: 66px; height: 66px; font-size: 10px; } #ph-ui button b { font-size: 23px; } #ph-ui .become { width: 78px; height: 78px; } #ph-ui .check { width: 92px; height: 92px; } #ph-ui .start { width: 104px; height: 104px; } #ph-quiet { width: 66px; } #ph-card { max-width: calc(100vw - 24px); bottom: max(150px, calc(env(safe-area-inset-bottom) + 140px)); } #ph-top { top: max(88px, calc(env(safe-area-inset-top) + 84px)); max-width: calc(100vw - 20px); } #ph-feed { top: max(176px, calc(env(safe-area-inset-top) + 170px)); } }`;
    document.head.appendChild(st); this.style = st;
    const ui = document.createElement('div'); ui.id = 'ph-ui';
    ui.innerHTML = `<div class="row"><button class="watch" hidden><b>👀</b>WATCH<i>V</i></button><button class="props" hidden><b>🎭</b>PROPS<i>Q</i></button></div>
<div class="row"><button class="lock" hidden><b>🔓</b>LOCK<i>L</i></button><div style="display:flex;flex-direction:column;gap:4px;align-items:center"><div id="ph-quiet" hidden><u></u></div><button class="taunt" hidden><span class="cdv"></span><b>📯</b>TAUNT<span class="num"></span><i>T</i></button></div></div>
<div class="row"><button class="become" hidden><b>✨</b>BECOME<i>E</i></button><button class="check" hidden><b>🔫</b>SHOOT<i>F</i></button><button class="start" hidden><b>▶</b>START<i>E</i></button></div>`;
    document.body.appendChild(ui); this.ui = ui; document.body.classList.add('prophunt');
    const Q = (c) => ui.querySelector('.' + c); this.B = { watch: Q('watch'), props: Q('props'), lock: Q('lock'), taunt: Q('taunt'), become: Q('become'), check: Q('check'), start: Q('start') }; this.quietEl = ui.querySelector('#ph-quiet');
    const tap = (el, f) => el.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); f(); });
    tap(this.B.watch, () => this.doWatch()); tap(this.B.props, () => this.openPicker()); tap(this.B.lock, () => this.toggleLock()); tap(this.B.taunt, () => this.doTaunt());
    tap(this.B.become, () => { if (this.aimed) this.become(this.aimed.k); }); tap(this.B.check, () => this.doCheck()); tap(this.B.start, () => this.doStart());
    const el = (id, tag = 'div') => { const d = document.createElement(tag); d.id = id; document.body.appendChild(d); return d; };
    this.topEl = el('ph-top'); this.crossEl = el('ph-cross'); this.cardEl = el('ph-card'); this.splashEl = el('ph-splash'); this.blindEl = el('ph-blind'); this.countEl = el('ph-count');
    this.feedEl = el('ph-feed'); this.popEl = el('ph-pop'); this.foundEl = el('ph-found'); this.flashEl = el('ph-flash'); this.ghostEl = el('ph-ghost'); this.lockEl = el('ph-lockfx');
    // keys on a computer: E become / start, Q props, L lock, T taunt, F check, V watch
    this.onKey = (e) => { if (e.repeat || /input|textarea/i.test(e.target.tagName) || this.panel.open) return; const k = e.key.toLowerCase(), me = this.mine();
      if (k === 'e') { if (this.phase === 'waiting' || this.phase === 'over') this.doStart(); else if (this.aimed) this.become(this.aimed.k); else if (me && me.role === 'seeker') this.doCheck(); }
      else if (k === 'q') this.openPicker(); else if (k === 'l') this.toggleLock(); else if (k === 't') this.doTaunt(); else if (k === 'f') this.doCheck(); else if (k === 'v') this.doWatch(); else return; e.stopPropagation(); e.preventDefault(); };
    window.addEventListener('keydown', this.onKey, true);
  }
  buildWorldBits() {
    // the highlight over the prop a hider's looking at (a glowing copy, a touch bigger)
    this.hlMat = new THREE.MeshBasicMaterial({ color: 0xfff27a, transparent: true, opacity: 0.35, depthWrite: false }); this.hl = new THREE.Group(); this.hl.visible = false; this.grp.add(this.hl); this.hlKind = null;
    // a seeker's check: a flash of light out to what they checked
    this.zapLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0 })); this.zapLine.frustumCulled = false; this.grp.add(this.zapLine);
    // VR: a seeker's pointer, and the blindfold (a black ball round your head)
    this.laser = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -6)]), new THREE.LineBasicMaterial({ color: 0xff7043, transparent: true, opacity: 0.7 })); this.laser.visible = false; this.laser.frustumCulled = false; this.grp.add(this.laser);
    this.blindBall = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 10), new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.BackSide, transparent: true, opacity: 0.985, depthTest: false, depthWrite: false })); this.blindBall.renderOrder = 60; this.blindBall.visible = false; this.grp.add(this.blindBall);
  }
  doStart() { if (this.phase !== 'waiting' && this.phase !== 'over') return; if (!this.host) { this.toast('THE HOST STARTS THE GAME'); return; } if (this.roster().length < PH.MIN) { this.toast(`NEED ${PH.MIN}+ PLAYERS TO START`); return; } this.panel.close(true); sfx('ph_airhorn', null, 0.8); this.hostStart(); }
  toast(s) { this.g.words && this.g.words.show(s, this.g.player.head.clone().addScaledVector(this.g.player.fwd, 0.8).add({ x: 0, y: 0.1, z: 0 }), '#ffd400', 0.07, 1.4); this.pop(s, '#ffd400'); }
  pop(s, col) { const e = this.popEl; e.textContent = s; e.style.color = col || '#fff'; e.className = ''; void e.offsetWidth; e.className = 'on'; }
  feed(html) { const d = document.createElement('div'); d.innerHTML = html; this.feedEl.prepend(d); while (this.feedEl.children.length > 4) this.feedEl.lastChild.remove(); setTimeout(() => d.classList.add('old'), 6000); setTimeout(() => d.remove(), 7200); }
  splash(col, html, ms) { const sp = this.splashEl; sp.style.color = col; sp.innerHTML = `<i class="rays"></i><div>${html}</div>`; sp.classList.add('on'); clearTimeout(this.splashT); this.splashT = setTimeout(() => sp.classList.remove('on'), ms || 3000); }
  foundToast(T, S, kn) { const e = this.foundEl; e.innerHTML = `<img src="./assets/portraits/${esc(T.char || 'ronnie')}.webp"><div><b>FOUND! ${esc(T.name.toUpperCase())}</b><small>was ${esc(kn.toLowerCase())} · spotted by ${esc(S ? S.name : 'a seeker')}</small></div>`; e.className = ''; void e.offsetWidth; e.className = 'on'; }
  lockFx(on) { const e = this.lockEl; e.textContent = on ? '🔒' : '🔓'; e.className = ''; void e.offsetWidth; e.className = 'on'; }
  showRole() {
    const me = this.mine(); if (!me) return; const hiders = this.hiders(), seekers = this.seekers(), imgs = (l) => l.map(p => `<img src="./assets/portraits/${esc(p.char || 'ronnie')}.webp" title="${esc(p.name)}">`).join('');
    if (me.role === 'seeker') { this.splash('#ff9f1c', `<p>ROUND ${this.round} OF ${this.of} · YOU'RE</p><h1>SEEKING 🔫</h1><p>${hiders.length} hider${hiders.length === 1 ? '' : 's'} turning into stuff. Count to ${PH.HIDE_T}, no peeking.</p><div class="imgs">${imgs(seekers)}</div>`, 3600); sfx('ph_seekrole', null, 0.8); }
    else if (me.role === 'hider') { this.splash('#39ff14', `<p>ROUND ${this.round} OF ${this.of} · YOU'RE</p><h1>HIDING 🙈</h1><p>Find a thing. BECOME it. LOCK in. Taunt for points. The seekers have guns: three shots and you're out.</p><p class="sm">${seekers.map(p => esc(p.name)).join(' & ')} ${seekers.length > 1 ? 'are' : 'is'} counting to ${PH.HIDE_T}...</p><div class="imgs">${imgs(seekers)}</div>`, 3600); sfx('ph_hiderole', null, 0.8); }
    else this.splash('#9fb3d9', '<h1>SIT THIS ONE OUT</h1><p>You\'ll be in next round. Watch the fun.</p>', 3000);
    if (this.g.renderer.xr.isPresenting) this.g.showBanner(`ROUND ${this.round} · YOU'RE`, me.role === 'seeker' ? 'SEEKING' : me.role === 'hider' ? 'HIDING' : 'WATCHING');
  }
  blind(on) { this.blindOn = on; this.blindEl.classList.toggle('on', !!on && !this.g.renderer.xr.isPresenting); this.blindBall.visible = !!on && this.g.renderer.xr.isPresenting; }
  // ------------------------------------------------------------------ the prop picker (a panel: phone, computer and VR)
  openPicker() {
    const me = this.mine(); if (!me || me.role !== 'hider' || me.found || !this.playing()) return; if (this.panel.open) return;
    this.panel.show(this.pickerScreen(), { canClose: true });
  }
  closePicker() { if (this.panel.open && this.panel.cur && this.panel.cur.picker) this.panel.close(true); }
  pickerScreen() {
    const ks = this.kinds, cols = 4, cw = 112, ch = 100, x0 = (512 - cols * cw) / 2, y0 = 96, cell = (i) => ({ x: x0 + (i % cols) * cw + 4, y: y0 + Math.floor(i / cols) * ch + 4, w: cw - 8, h: ch - 8 });
    const s = { picker: true, title: '🎭 PICK A PROP', hover: -1 };
    s.draw = (g, t) => { const me = this.mine(); const bg = g.createLinearGradient(0, 0, 0, 512); bg.addColorStop(0, '#2a1458'); bg.addColorStop(1, '#120a2a'); g.fillStyle = bg; rr(g, 4, 4, 504, 504, 30); g.fill(); g.lineWidth = 8; g.strokeStyle = '#b388ff'; rr(g, 4, 4, 504, 504, 30); g.stroke();
      txt(g, '🎭 PICK A PROP', 256, 38, 32, '#fff'); txt(g, 'The real ones are all over the place. Be one of them.', 256, 72, 15, '#d1c4e9');
      ks.forEach((id, i) => { const K = this.K[id], b = cell(i), cur = me && me.kind === id, hov = s.hover === i; g.fillStyle = cur ? '#00b16a' : hov ? '#5e35b1' : '#3a2470'; rr(g, b.x, b.y, b.w, b.h, 14); g.fill();
        if (cur || hov) { g.lineWidth = 4; g.strokeStyle = cur ? '#b9ffd9' : '#ffd400'; rr(g, b.x, b.y, b.w, b.h, 14); g.stroke(); }
        g.font = `${hov ? 44 : 40}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(K.icon, b.x + b.w / 2, b.y + 36 + (hov ? Math.sin(t * 8) * 3 : 0));
        txt(g, K.name.replace(/^(A|AN|THE) /, ''), b.x + b.w / 2, b.y + 72, 12, '#fff', 'center', b.w - 8); g.fillStyle = K.h < 0.35 ? '#ffd400' : K.h < 0.85 ? '#9fffd0' : '#ff9f9f'; g.fillRect(b.x + 14, b.y + b.h - 10, (b.w - 28) * Math.min(1, K.h / 1.3), 4); });
      txt(g, 'BAR = HOW EASY TO SPOT', 256, 480, 13, '#9e8fc9'); };
    s.down = (x, y) => { ks.forEach((id, i) => { const b = cell(i); if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) { this.panel.close(true); this.become(id); } }); };
    s.move = (x, y) => { s.hover = -1; ks.forEach((id, i) => { const b = cell(i); if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) s.hover = i; }); }; s.up = () => {};
    s.update = () => { if (!this.playing()) s.quit = true; };
    return s;
  }
  // the end of a round: who won, everyone's points this round and in all
  summaryScreen(m) {
    const ids = [...new Set([...Object.keys(m.tot || {}), ...this.players.keys()])].sort((a, b) => (m.tot[b] || 0) - (m.tot[a] || 0)).slice(0, 12), alive = new Set(m.alive || []);
    const t0 = performance.now();      // (the rows come in on the clock, not the frame count: a slow phone still gets them all)
    return { draw: (g) => { const t = (performance.now() - t0) / 1000, sk = m.win === 'seekers'; g.fillStyle = sk ? '#2a1206' : '#06240f'; rr(g, 4, 4, 504, 504, 30); g.fill(); g.lineWidth = 8; g.strokeStyle = sk ? '#ff9f1c' : '#39ff14'; rr(g, 4, 4, 504, 504, 30); g.stroke();
        txt(g, `ROUND ${m.r} OF ${m.of}`, 256, 34, 18, '#ccc'); txt(g, sk ? '🔍 THE SEEKERS WIN' : '🙈 THE HIDERS WIN', 256, 66, 32 + Math.sin(t * 5) * 1.5, sk ? '#ffb74d' : '#69f0ae'); txt(g, String(m.why || ''), 256, 98, 15, '#fff');
        txt(g, 'PLAYER', 40, 128, 13, '#999', 'left'); txt(g, 'ROUND', 380, 128, 13, '#999', 'center'); txt(g, 'TOTAL', 460, 128, 13, '#999', 'center');
        const rowH = Math.min(30, 300 / Math.max(1, ids.length)); ids.forEach((id, i) => { const y = 150 + i * rowH, p = this.players.get(id), role = p ? p.role : 'spec', k = Math.min(1, t * 2 - i * 0.1); if (k <= 0) return; g.globalAlpha = k;
          if (id === this.me) { g.fillStyle = 'rgba(255,212,0,0.18)'; rr(g, 24, y - rowH / 2 + 1, 464, rowH - 2, 8); g.fill(); }
          const im = portrait(p ? p.char : 'ronnie'), r = rowH / 2 - 3; g.save(); g.beginPath(); g.arc(46, y, r, 0, 7); g.clip(); if (im.complete && im.naturalWidth) g.drawImage(im, 46 - r, y - r, r * 2, r * 2); else { g.fillStyle = '#555'; g.fill(); } g.restore();
          txt(g, `${role === 'seeker' ? '🔍' : alive.has(id) ? '🙈' : role === 'hider' ? '👻' : '·'} ${this.nameOf(id).toUpperCase()}`, 70, y, Math.min(17, rowH * 0.6), '#fff', 'left', 260);
          const rp = (m.rp && m.rp[id]) || 0; txt(g, (rp > 0 ? '+' : '') + rp, 380, y, Math.min(18, rowH * 0.62), rp > 0 ? '#39ff14' : rp < 0 ? '#ff5252' : '#aaa'); txt(g, String(m.tot[id] || 0), 460, y, Math.min(18, rowH * 0.62), '#ffd400'); g.globalAlpha = 1; });
        const left = Math.max(0, Math.ceil(this.endsAt - now())); txt(g, m.last ? `FINAL SCORES IN ${left}s...` : `TEAMS SWAP · NEXT ROUND IN ${left}s`, 256, 476, 17, '#fff'); },
      down: () => {}, update: () => {} };
  }
  // the end of the game: the podium, everyone's points, the awards
  resultsScreen(m) {
    const ranked = this.ranked(), playB = { x: 40, y: 438, w: 200, h: 54 }, lobbyB = { x: 272, y: 438, w: 200, h: 54 };
    const t0 = performance.now();
    return { draw: (g) => { const t = (performance.now() - t0) / 1000;
        const bg = g.createLinearGradient(0, 0, 0, 512); bg.addColorStop(0, '#1a1f4a'); bg.addColorStop(1, '#0a0d22'); g.fillStyle = bg; rr(g, 4, 4, 504, 504, 30); g.fill(); g.lineWidth = 8; g.strokeStyle = '#ffd400'; rr(g, 4, 4, 504, 504, 30); g.stroke();
        txt(g, '🏆 PROP HUNT: FINAL SCORES', 256, 34, 26, '#ffd400');
        // the podium: 2nd, 1st, 3rd
        const pod = [[1, 136, 70, '#c0c0c0'], [0, 256, 96, '#ffd400'], [2, 376, 52, '#cd7f32']];
        for (const [i, x, hgt, col] of pod) { const r = ranked[i]; if (!r) continue; const k = Math.min(1, Math.max(0, t * 1.6 - (2 - i) * 0.3)), base = 262, hh = hgt * k;
          g.fillStyle = col; rr(g, x - 52, base - hh, 104, hh, 8); g.fill(); txt(g, String(i + 1), x, base - hh / 2, 30, '#222');
          if (k > 0.5) { const im = portrait(r.char), cy = base - hh - 52 + (i === 0 ? Math.sin(t * 4) * 3 : 0); g.save(); g.beginPath(); g.arc(x, cy, 30, 0, 7); g.clip(); if (im.complete && im.naturalWidth) g.drawImage(im, x - 30, cy - 30, 60, 60); else { g.fillStyle = '#555'; g.fill(); } g.restore();
            g.lineWidth = 4; g.strokeStyle = col; g.beginPath(); g.arc(x, cy, 30, 0, 7); g.stroke(); if (i === 0) txt(g, '👑', x, cy - 40, 26, '#ffd400'); txt(g, r.name.toUpperCase(), x, base - hh - 11, 13, '#fff', 'center', 110); txt(g, r.pts + ' PTS', x, base + 14, 14, col); } }
        // everyone else, and the awards
        const rest = ranked.slice(3, 9); rest.forEach((r, i) => txt(g, `${i + 4}. ${r.name.toUpperCase()}  ${r.pts}`, i % 2 ? 380 : 136, 292 + Math.floor(i / 2) * 17, 13, r.id === this.me ? '#ffd400' : '#ccc', 'center', 220));
        // (the awards: two lines each, the award over who won it)
        const aw = Array.isArray(m.aw) ? m.aw.slice(0, 4) : []; aw.forEach((a, i) => { const y = 360 + Math.floor(i / 2) * 44, x = i % 2 ? 380 : 136; if (!Array.isArray(a)) return;
          g.fillStyle = 'rgba(255,255,255,0.08)'; rr(g, x - 116, y - 20, 232, 40, 10); g.fill(); txt(g, `${a[0]} ${a[1]}`, x, y - 8, 13, '#ffd400', 'center', 220); txt(g, `${this.nameOf(a[2]).toUpperCase()} · ${a[3]}`, x, y + 9, 12, '#fff', 'center', 220); });
        if (this.host) { g.fillStyle = '#2e7d32'; rr(g, playB.x, playB.y, playB.w, playB.h, 14); g.fill(); txt(g, '▶ PLAY AGAIN', playB.x + playB.w / 2, playB.y + 28, 22); }
        else txt(g, 'THE HOST CAN PLAY AGAIN', 140, 465, 14, '#aaa', 'center', 220);
        g.fillStyle = '#37474f'; rr(g, lobbyB.x, lobbyB.y, lobbyB.w, lobbyB.h, 14); g.fill(); txt(g, '↩ LOBBY', lobbyB.x + lobbyB.w / 2, lobbyB.y + 28, 22); },
      down: (x, y) => { const In = (b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h; if (this.host && In(playB)) { this.panel.close(true); this.doStart(); } else if (In(lobbyB)) this.g.leave && this.g.leave(); }, update: () => {} };
  }

  // ------------------------------------------------------------------ every frame
  update(dt) {
    const g = this.g, P = g.player, xr = g.renderer.xr.isPresenting, t = now(), me = this.mine();
    if (this.host) this.hostUpdate(dt);
    if ((this.foodT = (this.foodT || 0) - dt) <= 0) { this.foodT = 1; this.clearFood(); }
    this.panel.update(dt);
    const hider = !!(me && me.role === 'hider' && !me.found), seeker = !!(me && me.role === 'seeker'), ghost = !!(me && (me.found || me.role === 'spec') && this.inRound());
    document.body.classList.toggle('ph-hider', hider && this.inRound());
    // the seekers: blindfolded and held at the start while the hiders hide; knackered: sat down
    const blindNow = seeker && this.phase === 'hide'; if (blindNow !== !!this.blindOn) this.blind(blindNow);
    if (this.blindOn && xr) this.blindBall.position.copy(P.head);
    const locked = hider && me.locked && this.playing(), out = seeker && me.out > t;
    this.pin(blindNow || locked || out || this.phase === 'roundend');
    if (seeker && me.out && me.out <= t && this.flashEl.className === 'out') this.flashEl.className = '';
    P.ghost = !!(me && me.found && this.inRound()); this.ghostEl.classList.toggle('on', ghost);
    // the countdown: the last five seconds of the hide, big numbers for everyone
    if (this.phase === 'hide') { const left = Math.ceil(this.endsAt - t); if (left <= 5 && left >= 1 && left !== this.countBeep) { this.countBeep = left; sfx('ph_count', null, 0.8); if (!this.blindOn) { this.countEl.textContent = left; this.countEl.className = ''; void this.countEl.offsetWidth; this.countEl.className = 'on'; } } }
    if (this.blindOn) { const left = Math.max(0, Math.ceil(this.endsAt - t)); if (this.blindN !== left) { this.blindN = left; const jokes = ['NO PEEKING', 'EYES SHUT', 'HANDS OVER YOUR EYES', 'WE CAN SEE YOU PEEKING', 'COUNT PROPERLY', 'ONE ELEPHANT, TWO ELEPHANT...'];
      this.blindEl.innerHTML = `<div class="eyes">🙈</div><b>${left}</b><p>${jokes[Math.floor(left / 7) % jokes.length]}</p><small>${esc((this.net.name || 'YOU').toUpperCase())}, YOU'RE SEEKING · ${this.hiders().length === 1 ? '1 HIDER IS TURNING INTO SOMETHING' : this.hiders().length + ' HIDERS ARE TURNING INTO THINGS'}...</small>`; } }
    // props: everyone's where they are
    for (const p of this.players.values()) { if (p.role !== 'hider' || !p.kind || p.found) continue; const pr = this.ensureProp(p.id); if (pr) this.placeProp(pr, p, dt); }
    for (const [id, pr] of this.props) this.animProp(pr, dt, id);
    // a hider looking at a prop: it glows and its card comes up; a seeker's crosshair warms up over something checkable
    if ((this.aimT = (this.aimT || 0) - dt) <= 0) { this.aimT = 0.08; this.aimed = null; this.hot = null;
      if (hider && this.playing() && !this.panel.open) { const r = this.aimRay(); if (r) this.aimed = this.pick(r, { near: P.head, nearR: PH.PICK_R }); if (this.aimed && me.kind === this.aimed.k) this.aimed = null; }
      if (seeker && this.phase === 'seek' && !this.panel.open && !out) { const r = this.aimRay(); if (r) { const h = this.pick(r, { maxD: PH.SHOOT_R + 1 }); this.hot = h || null; } } }
    this.highlight(this.aimed);
    this.animFx(dt);
    if (this.syncT === undefined || (this.syncT -= dt) <= 0) { this.syncT = 0.3; this.syncPuppets(); }
    // decoys being checked wobble
    for (const d of this.decoys) if (d.wob > 0) { d.wob += dt; const k = d.wob > 0.6 ? 0 : Math.sin(d.wob * 40) * 0.12 * (1 - d.wob / 0.6); this.decoyMatrix(d, k); if (d.wob > 0.6) d.wob = 0; }
    this.guns(dt, me, seeker, xr);
    if (xr) this.vrInput(P, me); else { this.drawHud(me, hider, seeker, ghost); if (P.wrist && P.flatMode) P.wrist.visible = false; }
    this.laser.visible = xr && seeker && this.phase === 'seek';
    if (this.laser.visible) { const h = (P.hands || []).find(h => h.source && h.handedness === 'right' && h.ctrl); if (h) { h.ctrl.getWorldPosition(this.laser.position); h.ctrl.getWorldQuaternion(this.laser.quaternion); this.laser.material.color.setHex(this.hot ? 0xffd400 : 0xff7043); } else this.laser.visible = false; }
    // spectating: stand by whoever you're watching (VR has no camera of its own: you're moved)
    if (ghost && this.spect && xr) { const q = this.posOf(this.spect, new THREE.Vector3()); if (q && this.hd(q, P.head) > 3) this.teleport(q.x - 1.5, q.z); }
  }
  // where a hider's prop goes: on the floor under them, turned the way they look (locked: where they locked it)
  placeProp(pr, p, dt) {
    const P = this.g.player; let x, z, yaw;
    if (p.locked && p.lp) { x = p.lp[0]; z = p.lp[1]; yaw = p.ly || 0; }
    else if (p.id === this.me) { x = P.head.x; z = P.head.z; yaw = Math.atan2(-P.fwd.x, -P.fwd.z); }
    else { const np = this.net.players.get(p.id); if (!np || !np.pose || !Array.isArray(np.pose.h)) return; x = np.pose.h[0]; z = np.pose.h[2]; yaw = Array.isArray(np.pose.q) ? yawOfQ(_q.set(...np.pose.q)) : pr.yaw; }
    if (!isFinite(x) || !isFinite(z) || !isFinite(yaw)) return;
    const k = 1 - Math.exp(-dt * (p.id === this.me ? 30 : 12)), was = pr.pos.clone(); if (Math.hypot(pr.pos.x - x, pr.pos.z - z) > 3) pr.pos.set(x, 0, z); else { pr.pos.x += (x - pr.pos.x) * k; pr.pos.z += (z - pr.pos.z) * k; }
    pr.pos.y = this.floor(pr.pos.x, pr.pos.z); let dy = yaw - pr.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; pr.yaw += dy * Math.min(1, k * 1.3);
    pr.speed = pr.speed === undefined ? 0 : pr.speed + (Math.hypot(pr.pos.x - was.x, pr.pos.z - was.z) / Math.max(dt, 1e-3) - pr.speed) * Math.min(1, dt * 8);
  }
  animProp(pr, dt, id) {
    const K = this.K[pr.kind], t = performance.now() / 1000; let s = 1, hop = 0, tilt = 0, spin = 0;
    if (pr.pop > 0) { pr.pop += dt; const k = Math.min(1, pr.pop / 0.55); s = k < 1 ? Math.max(0.05, 1 + Math.sin(k * Math.PI * 2.5) * 0.35 * (1 - k)) * Math.min(1, k * 4) : 1; if (k >= 1) pr.pop = 0; }
    if ((pr.speed || 0) > 0.4 && !pr.gone) { hop = Math.abs(Math.sin(t * 13)) * 0.05; tilt = Math.sin(t * 13) * 0.06; }
    if (pr.jig > 0) { pr.jig += dt; const k = pr.jig / 0.8; hop += Math.abs(Math.sin(pr.jig * 22)) * 0.08 * (1 - k); tilt += Math.sin(pr.jig * 30) * 0.1 * (1 - k); if (k >= 1) pr.jig = 0; }
    if (pr.reveal > 0) { pr.reveal += dt; hop += Math.abs(Math.sin(pr.reveal * 6)) * 0.25; spin = pr.reveal * 3; }
    if (pr.foundT > 0) { pr.foundT += dt; const k = Math.min(1, pr.foundT / 0.9); hop = k * 1.4; spin = k * 12; s = Math.max(0.01, 1 - k * k); if (k >= 1) { this.dropProp(id); return; } }
    pr.grp.position.set(pr.pos.x, pr.pos.y + hop, pr.pos.z); pr.grp.rotation.set(0, pr.yaw + spin, tilt); pr.body.scale.setScalar(K.s * s);
    // (names: hiders and the found see the other hiders' names; your own says YOU; a seeker sees nothing)
    const me = this.mine(), mine = id === this.me, seeTags = !!(me && (me.role !== 'seeker' || this.phase === 'roundend'));
    const p = this.players.get(id); this.propTag(pr, !pr.gone && seeTags && (!mine || this.g.player.flatMode) && !this.blindOn, mine ? (p && p.locked ? '🔒 YOU' : '▼ YOU') : (pr.reveal > 0 ? '🙈 ' : '') + this.nameOf(id).toUpperCase(), mine ? '#ffd400' : pr.reveal > 0 ? '#69f0ae' : '#b9ffd9');
  }
  highlight(a) {
    if (!a) { this.hl.visible = false; this.cardEl.classList.remove('on'); return; }
    if (this.hlKind !== a.k) { this.hl.clear(); const K = this.K[a.k], body = new THREE.Group(); for (const [geo] of K.parts) body.add(new THREE.Mesh(geo, this.hlMat)); body.position.y = K.y0; body.scale.setScalar(K.s * 1.06); this.hl.add(body); this.hlKind = a.k;
      this.cardEl.innerHTML = `<div class="pic">${K.icon}</div><div><b>${esc(K.name)}</b><small>${SIZE_NAME(K.h)}</small><em>${this.g.player.flatMode ? (('ontouchstart' in window) ? 'TAP IT OR ✨ BECOME' : 'CLICK IT OR PRESS E') : 'A: BECOME'}</em></div>`; }
    const d = a.kind === 'd' ? this.decoys[a.i] : null, pr = a.kind === 'h' ? this.props.get(a.id) : null;
    if (d) { this.hl.position.set(d.x, d.e ? d.e.pos.y - this.K[a.k].y0 : d.y, d.z); this.hl.rotation.set(0, d.e ? d.e.rot[1] : d.yaw, 0); }
    else if (pr) { this.hl.position.copy(pr.grp.position); this.hl.rotation.copy(pr.grp.rotation); }
    this.hl.visible = true; this.hlMat.opacity = 0.22 + Math.sin(performance.now() / 160) * 0.12; this.cardEl.classList.add('on');
  }
  // phone / computer: the top bar, the buttons, the crosshair
  drawHud(me, hider, seeker, ghost) {
    const B = this.B, t = now(), play = this.playing(), lobby = this.phase === 'waiting' || this.phase === 'over';
    B.start.hidden = !(lobby && this.host && this.phase === 'waiting'); B.start.classList.toggle('off', this.roster().length < PH.MIN);
    B.props.hidden = !(hider && play); B.lock.hidden = !(hider && play); B.taunt.hidden = !(hider && play); this.quietEl.hidden = !(hider && this.phase === 'seek');
    B.become.hidden = !(hider && play && this.aimed); B.check.hidden = !(seeker && this.phase === 'seek'); B.watch.hidden = !(ghost && this.phase === 'seek');
    if (hider && play) { B.lock.classList.toggle('on', !!me.locked); B.lock.classList.toggle('off', !me.kind); B.lock.querySelector('b').textContent = me.locked ? '🔒' : '🔓'; B.lock.childNodes[1].textContent = me.locked ? 'LOCKED' : 'LOCK';
      const cd = Math.max(0, (this.tauntCD || 0) - t); B.taunt.style.setProperty('--k', Math.round(cd / PH.TAUNT_CD * 100) + '%'); B.taunt.querySelector('.num').textContent = cd > 0 ? Math.ceil(cd) : ''; B.taunt.classList.toggle('off', !me.kind);
      const q = Math.min(1, (t - (this.lastTaunt || t)) / PH.QUIET_T); this.quietEl.firstChild.style.width = (q * 100) + '%'; }
    if (seeker) B.check.classList.toggle('off', me.out > t);
    this.crossEl.classList.toggle('on', (seeker && this.phase === 'seek') || (hider && play && !this.panel.open)); this.crossEl.classList.toggle('hot', !!(this.hot || this.aimed));
    if ((this.hudT = (this.hudT || 0) - 1) > 0) return; this.hudT = 6;
    let h = '';
    if (this.phase === 'waiting') { const n = this.roster().length; h = `<div class="clock"><small>PROP HUNT</small><b style="font-size:15px;min-width:0">${n < PH.MIN ? `WAITING FOR PLAYERS (${n}/${PH.MIN})` : this.host ? `${n} PLAYERS · PRESS START` : `${n} PLAYERS · HOST STARTS`}</b></div>`; }
    else if (this.phase === 'over') h = '<div class="clock"><small>PROP HUNT</small><b style="font-size:16px">GAME OVER</b></div>';
    else { const left = Math.max(0, this.endsAt - t), lab = this.phase === 'hide' ? 'HIDING' : this.phase === 'seek' ? 'SEEKING' : 'ROUND OVER';
      h = `<div class="clock${this.phase === 'seek' && left < 30 ? ' hurry' : ''}"><small>R${this.round}/${this.of} · ${lab}</small><b>${fmt(left)}</b></div>`;
      if (me) h += `<span class="role ${me.found ? 'ghost' : me.role}">${me.found ? '👻 FOUND · SPECTATING' : me.role === 'seeker' ? '🔍 SEEKER' : me.role === 'hider' ? (me.kind ? `🙈 ${esc(this.K[me.kind].name)}${me.locked ? ' 🔒' : ''}` : '🙈 HIDER · PICK A PROP!') : '👀 WATCHING'}</span>`;
      const hs = this.hiders(); h += `<div class="left"><span>🙈 ${this.left().length}/${hs.length} LEFT</span>${hs.map(p => `<img class="${p.found || p.gone ? 'gone' : ''}" src="./assets/portraits/${esc(p.char || 'ronnie')}.webp">`).join('')}</div>`;
      if (seeker) { const hp = Math.max(0, me.hp ?? PH.HP); h += `<div class="hp"><u style="width:${hp}%"></u><span>${me.out > t ? '😵 KNACKERED ' + Math.ceil(me.out - t) + 's' : '❤ ' + hp}</span></div>`; } }
    if (h !== this.topHtml) { this.topHtml = h; this.topEl.innerHTML = h; }
  }
  // VR: right A = become what you point at (or the list), B = lock; left X = taunt, Y = the props list. Seekers: the
  // trigger (or A) checks what you point at. The host's A starts the game
  vrInput(P, me) {
    const pad = (hand) => { const h = (P.hands || []).find(h => h.source && h.handedness === hand); return h && h.source.gamepad; }, R = pad('right'), L = pad('left');
    const press = (key, gp, i) => { const on = !!(gp && gp.buttons[i] && gp.buttons[i].pressed), was = this.btnWas[key]; this.btnWas[key] = on; return on && !was; };
    const a = press('a', R, 4), b = press('b', R, 5), x = press('x', L, 4), y = press('y', L, 5), trig = press('trig', R, 0);
    if (this.panel.open) return;
    if (this.phase === 'waiting' && a) return this.doStart();
    if (!me || !this.playing()) return;
    if (me.role === 'seeker') { if (trig || a) this.doCheck(); return; }
    if (me.found || me.role === 'spec') { if (a) this.doWatch(); return; }
    if (a) { if (this.aimed) this.become(this.aimed.k); else this.openPicker(); } if (b) this.toggleLock(); if (x) this.doTaunt(); if (y) this.openPicker();
  }
  // VR: your wrist shows the round (main.js passes the wrist's picture here)
  drawWrist(g, w, h) {
    const me = this.mine(), t = now(), col = !me ? '#ffd400' : me.found ? '#9fb3d9' : me.role === 'seeker' ? '#ff9f1c' : '#39ff14';
    g.fillStyle = '#0d1020'; rr(g, 4, 4, w - 8, h - 8, 40); g.fill(); g.lineWidth = 8; g.strokeStyle = col; rr(g, 4, 4, w - 8, h - 8, 40); g.stroke(); g.textBaseline = 'middle';
    const W = (s, x, y, size, c, al = 'left') => { g.textAlign = al; g.fillStyle = c; let f = size; do { g.font = `900 ${f}px ${FONT}`; f -= 2; } while (g.measureText(s).width > w - 60 && f > 12); g.fillText(s, x, y); };
    if (this.phase === 'waiting' || this.phase === 'over' || !me) { W('🎭 PROP HUNT', 30, 50, 34, '#ffd400'); const n = this.roster().length; W(this.phase === 'over' ? 'GAME OVER' : n < PH.MIN ? `WAITING FOR PLAYERS (${n})` : this.host ? `${n} PLAYERS · PRESS A TO START` : `${n} PLAYERS · THE HOST STARTS`, 30, 120, 26, '#fff'); return; }
    W(me.found ? '👻 FOUND' : me.role === 'seeker' ? '🔍 SEEKER' : me.role === 'hider' ? '🙈 HIDER' : '👀 WATCHING', 30, 42, 32, col);
    W(`R${this.round}/${this.of} ${this.phase === 'hide' ? 'HIDE' : this.phase === 'seek' ? 'SEEK' : 'END'} ${fmt(this.endsAt - t)}`, w - 28, 42, 30, this.phase === 'seek' && this.endsAt - t < 30 ? '#ff6b6b' : '#fff', 'right');
    W(`🙈 ${this.left().length}/${this.hiders().length} HIDERS LEFT`, 30, 96, 28, '#c9d3ff');
    if (me.role === 'seeker') { const hp = Math.max(0, me.hp ?? PH.HP); g.fillStyle = '#333'; rr(g, 30, 130, w - 60, 40, 20); g.fill(); g.fillStyle = '#ff3b3b'; if (hp > 0) { rr(g, 30, 130, (w - 60) * hp / 100, 40, 20); g.fill(); } W(me.out > t ? `😵 KNACKERED ${Math.ceil(me.out - t)}s` : `❤ ${hp}`, w / 2, 151, 26, '#fff', 'center'); W('🔫 TRIGGER: SHOOT', 30, 200, 22, '#ffd400'); }
    else if (me.role === 'hider' && !me.found) { W(me.kind ? `${this.K[me.kind].icon} ${this.K[me.kind].name}${me.locked ? ' 🔒' : ''}` : 'PICK A PROP! (A or Y)', 30, 146, 28, '#fff');
      const cd = Math.max(0, (this.tauntCD || 0) - t); W(cd > 0 ? `📯 TAUNT IN ${Math.ceil(cd)}s` : '📯 TAUNT READY (X)', 30, 192, 24, cd > 0 ? '#999' : '#ff4fa3'); W('A BECOME · B LOCK · Y LIST', 30, 232, 22, '#9fb3d9'); }
    W(`⭐ ${this.tot[this.me] || 0} POINTS`, 30, h - 40, 26, '#ffd400');
  }
  // ------------------------------------------------------------------ bits of fun: bursts, puffs of smoke, the zap
  burst(at, cols, n = 20, speed = 2.2) {
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(i % 3 ? new THREE.OctahedronGeometry(0.03) : new THREE.TetrahedronGeometry(0.035), new THREE.MeshBasicMaterial({ color: cols[i % cols.length], transparent: true }));
      m.position.copy(at); const a = Math.random() * Math.PI * 2, u = Math.random(); m.userData.v = new THREE.Vector3(Math.cos(a) * speed * (0.4 + u), 1.5 + Math.random() * 2.2, Math.sin(a) * speed * (0.4 + u)); m.userData.t = 0; this.grp.add(m); this.fx.push(m); }
  }
  puff(at, n = 8) {
    if (!this.puffGeo) this.puffGeo = new THREE.IcosahedronGeometry(0.16, 3);
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(this.puffGeo, new THREE.MeshBasicMaterial({ color: i % 2 ? 0xf2f2f2 : 0xd8d8e8, transparent: true, opacity: 0.6, depthWrite: false })); const a = i / n * Math.PI * 2;
      m.position.set(at.x + Math.cos(a) * 0.15, at.y + 0.2 + Math.random() * 0.4, at.z + Math.sin(a) * 0.15); m.userData.v = new THREE.Vector3(Math.cos(a) * 0.9, 0.5 + Math.random() * 0.6, Math.sin(a) * 0.9); m.userData.t = 0; this.grp.add(m); this.puffs.push(m); }
  }
  zap(a, b, hit) { const pa = this.zapLine.geometry.attributes.position; pa.setXYZ(0, a.x, a.y - 0.15, a.z); pa.setXYZ(1, b.x, b.y, b.z); pa.needsUpdate = true; this.zapLine.geometry.computeBoundingSphere(); this.zapLine.material.color.setHex(hit ? 0xffe066 : 0xaaaaaa); this.zapT = 0.25; }
  animFx(dt) {
    this.shots = this.shots.filter(m => { const u = m.userData; u.t += dt; const k = u.t / u.life; if (k >= 1) { this.grp.remove(m); m.material.dispose(); return false; } m.material.opacity = 1 - k; if (u.grow) m.scale.setScalar(1 + k * 1.5); return true; });
    this.fx = this.fx.filter(m => { const u = m.userData; u.t += dt; u.v.y -= 6 * dt; m.position.addScaledVector(u.v, dt); m.rotation.x += dt * 8; m.rotation.y += dt * 6; m.material.opacity = Math.max(0, 1 - u.t / 1.1); if (u.t > 1.1) { this.grp.remove(m); m.geometry.dispose(); m.material.dispose(); return false; } return true; });
    this.puffs = this.puffs.filter(m => { const u = m.userData; u.t += dt; u.v.multiplyScalar(Math.exp(-dt * 3)); m.position.addScaledVector(u.v, dt); m.scale.setScalar(1 + u.t * 2.2); m.material.opacity = Math.max(0, 0.6 * (1 - u.t / 0.9) * (1 - u.t / 0.9)); if (u.t > 0.9) { this.grp.remove(m); m.material.dispose(); return false; } return true; });
    if (this.zapT > 0) { this.zapT -= dt; this.zapLine.material.opacity = Math.max(0, this.zapT / 0.25); } else this.zapLine.material.opacity = 0;
  }
  // what the tests and the wrist ask: the state of play
  hudState() { const me = this.mine(); return { phase: this.phase, role: me ? (me.found ? 'found' : me.role) : null, kind: me && me.kind, locked: !!(me && me.locked), hp: me && me.hp, left: this.left().length, round: this.round, of: this.of, time: Math.max(0, this.endsAt - now()) }; }
  dispose() {
    const g = this.g; this.blind(false); this.panel.close(true); this.panel.wrap.remove(); g.scene.remove(this.panel.mesh, this.panel.dot); g.scene.remove(this.grp);
    for (const id of [...this.props.keys()]) this.dropProp(id);
    if (this.vGun) this.vGun.parent && this.vGun.parent.remove(this.vGun); if (this.vrGun && this.vrGun.parent) this.vrGun.parent.remove(this.vrGun); if (g.player.flatGrip && this.gunHidGrip) g.player.flatGrip.visible = true;
    for (const [id] of this.rGuns) { const np = this.net.players.get(id); if (np && np.avatar) np.avatar.gunArm = false; } this.rGuns.clear();
    for (const el of [this.ui, this.style, this.topEl, this.crossEl, this.cardEl, this.splashEl, this.blindEl, this.countEl, this.feedEl, this.popEl, this.foundEl, this.flashEl, this.ghostEl, this.lockEl]) el && el.remove();
    document.body.classList.remove('prophunt', 'ph-hider'); window.removeEventListener('keydown', this.onKey, true);
    for (const k in this.handlers) delete this.net.on[k]; this.net.on.leave = this.leaveWas;
    const mp = g.mp; mp.noPunch = false; mp.chatGate = null; mp.chatRecvGate = null; mp.emoteGate = null; g.player.noGrab = false; g.player.ghost = false;
    if (g.player.flatGrip && this.gripHid) g.player.flatGrip.visible = true; if (g.player.wrist && g.player.flatMode) g.player.wrist.visible = true;
    for (const r of this.roster()) { const av = this.avatar(r.id); if (av) av.impHidden = false; }
    for (const d of this.dorm) this.decoyMatrix(d, 0);
  }
}
