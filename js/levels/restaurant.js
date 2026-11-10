// LA GRANDE PORTION: the fancy restaurant for Date Night with Chloe (design doc
// F-C2). Same 24m x 18m, now split into rooms and corners so it feels like a
// real restaurant rather than one big hall:
//   the foyer (maître d' podium, velvet ropes, cloakroom, waiting bench)
//   the main dining room (candlelit round tables, low planter screens, the
//     date table in the middle, a grand piano and a lobster tank)
//   the wine bar and lounge (bar counter, stools, wine wall, armchairs)
//   the private dining room behind glass (one long table: "RONNIE'S BIRTHDAY")
//   red velvet booths along the back
//   the open kitchen pass (heat lamps, plates waiting to go out) and the
//     dessert trolley, which Chloe must not see you near.
import * as THREE from 'three';
import { Kit, woodTex, carpetTex, canvasTex, FONT } from './kit.js';

export const DATE_TABLE = { x: 0, z: 0.6 };      // Ronnie sits at z + 0.8, Chloe at z - 0.75

const H = 3.4;

export function buildRestaurant(scene) {
  const k = new Kit(scene, { x0: -12, x1: 12, z0: -9, z1: 9, y1: H });
  const RED = 0x5a0f18, GOLD = 0xd4af37, CLOTH = 0xf5f0e8, CHAIR = 0x3a0a10, VELVET = 0x7a1020, DARK = 0x2a1208, GLASS = 0xbfe3f0, CREAM = 0xf3ead6;
  const R = (x0, z0, x1, z1, h, y, color, opts) => k.box(Math.abs(x1 - x0), h, Math.abs(z1 - z0), (x0 + x1) / 2, y ?? h / 2, (z0 + z1) / 2, color, opts);
  const T2 = 0.08;
  const wallX = (x, z0, z1, h = H, c = RED) => R(x - T2, z0 - T2, x + T2, z1 + T2, h, h / 2, c, { collide: true, block: true });
  const wallZ = (z, x0, x1, h = H, c = RED) => R(x0 - T2, z - T2, x1 + T2, z + T2, h, h / 2, c, { collide: true, block: true });
  const sign = (t, w, h, pos, rot, o = {}) => k.label(t, w, h, pos, rot, o);

  // ================================================================ shell
  k.floor(-12, -9, 12, 9, woodTex('#4a2a16'), 0.002, 1.5);
  k.floor(-6, -5.2, 6, 5.0, carpetTex('#4a0a14', '#3a0810', '#b8862e'), 0.003, 1.4);        // dining room carpet
  k.floor(6.5, 5.2, 12, 9, carpetTex('#1a1a1a', '#2a2a2a', '#d4af37'), 0.004, 1.0);          // foyer
  k.ceiling(0x3a1a1a, 0x1a0a0a);
  wallZ(-9, -12, 12); wallZ(9, -12, 12); wallX(-12, -9, 9); wallX(12, -9, 9);
  for (const z of [-8.9, 8.9]) R(-11.9, z - 0.01, 11.9, z + 0.01, 0.08, 1.0, GOLD);
  for (const x of [-11.9, 11.9]) R(x - 0.01, -8.9, x + 0.01, 8.9, 0.08, 1.0, GOLD);
  // gold-framed paintings round the walls (the big one is of food)
  const painting = (x, z, ry, w, h, tex) => { k.box(w + 0.12, h + 0.12, 0.04, x, 1.9, z, GOLD, { rot: [0, ry, 0] }); k.label('art', w, h, [x + Math.sin(ry) * 0.025, 1.9, z + Math.cos(ry) * 0.025], [0, ry, 0], { tex }); };
  painting(-11.92 + 0.02, 6.5, Math.PI / 2, 1.4, 1.0, paintTex(0)); painting(-11.92 + 0.02, -3.0, Math.PI / 2, 1.2, 0.9, paintTex(1)); painting(0, 8.92 - 0.02, Math.PI, 1.8, 1.1, paintTex(2));

  // ================================================================ kitchen + the pass (north)
  wallZ(-6.2, -12, -2.0); wallZ(-6.2, 2.0, 4.3); R(4.3, -6.3, 6.2, -6.1, H - 2.2, 2.2 + (H - 2.2) / 2, RED);   // pass opening at x -2..2, kitchen door at 4.3..6.2
  R(-2.0, -6.4, 2.0, -6.0, 1.0, 0.5, 0xc0c4ca, { collide: true, block: true });          // the pass counter
  R(-2.0, -6.42, 2.0, -5.98, 0.03, 1.01, 0xe0e4ea);
  R(-2.0, -6.3, 2.0, -6.1, H - 2.3, 2.3 + (H - 2.3) / 2, RED);                           // bulkhead over it
  for (const x of [-1.4, -0.5, 0.4, 1.3]) { k.cyl(0.006, 0.006, 0.5, x, 2.05, -6.2, 0x222222, 4); R(x - 0.18, -6.35, x + 0.18, -6.05, 0.06, 1.78, 0x333333); k.lamp(x, 1.72, -6.2, 0xff6a20, 0.07); }
  for (let x = -1.6; x <= 1.6; x += 0.8) { k.cyl(0.13, 0.12, 0.02, x, 1.02, -6.2, 0xffffff, 16); k.spawns.push(new THREE.Vector3(x, 1.1, -6.2)); }
  sign('SERVICE! (RONNIE: THAT DOES NOT MEAN YOU)', 1.8, 0.3, [0, 2.1, -6.08], [0, 0, 0], { bg: '#111', fg: '#ffd400', border: null, size: 44, glow: true });
  // the kitchen behind: ranges, steel counters, a chef's hat on a hook, steam glow
  R(-11.9, -8.9, 6.1, -8.2, 0.92, 0.46, 0xb8bcc2, { collide: true, block: true });
  for (let x = -10.5; x < 5; x += 2.2) { k.cyl(0.13, 0.13, 0.02, x, 0.94, -8.55, 0x222222, 12); k.cyl(0.13, 0.13, 0.02, x + 0.5, 0.94, -8.55, 0x222222, 12); k.cyl(0.12, 0.12, 0.18, x, 1.03, -8.55, 0x9aa0a8, 12); k.lamp(x + 0.25, 1.2, -8.5, 0xffffff, 0.12); }
  R(-11.9, -8.9, 6.1, -8.7, 0.4, 2.4, 0x8a9098);
  R(-4.0, -7.6, 0.0, -6.9, 0.92, 0.46, 0xb8bcc2, { collide: true, block: true });
  for (let x = -3.6; x < 0; x += 0.8) k.spawns.push(new THREE.Vector3(x, 1.0, -7.25));
  for (let x = -10.5; x < 5; x += 3) k.spawns.push(new THREE.Vector3(x + 1.1, 1.0, -8.5));
  sign('KITCHEN: STAFF AND SMOKE ALARMS ONLY', 1.6, 0.3, [-6.0, 2.3, -6.11], [0, 0, 0], { bg: '#fff', fg: '#5a0f18', border: GOLD_HEX, size: 40 });
  // swing doors into the kitchen
  wallX(6.2, -9, -6.2);
  // swing doors, propped open
  k.box(0.9, 2.0, 0.05, 4.55, 1.0, -6.6, 0x8a6a4a, { rot: [0, 1.2, 0] }); k.box(0.9, 2.0, 0.05, 5.95, 1.0, -6.6, 0x8a6a4a, { rot: [0, -1.2, 0] });
  sign('KITCHEN', 0.8, 0.2, [5.25, 2.35, -6.08], [0, 0, 0], { bg: '#1a0508', fg: '#d4af37', border: null, size: 60 });

  // ================================================================ private dining room (west, behind glass)
  wallZ(-0.2, -12, -6.2, H, RED);                                                        // its south wall
  R(-6.2, -6.2, -6.0, -1.5, 0.9, 0.45, RED, { collide: true, block: true });               // low wall...
  R(-6.15, -6.2, -6.05, -1.5, H - 0.9, 0.9 + (H - 0.9) / 2, GLASS);                       // ...with glass above
  R(-6.2, -1.6, -6.0, -1.45, H, H / 2, GOLD, { block: true });                             // gold door post
  R(-6.15, -1.45, -6.05, -0.2, H - 2.3, 2.3 + (H - 2.3) / 2, RED);                        // over the doorway
  k.table(-9.1, -3.2, 1.0, 4.4, { cloth: CLOTH, chairs: 4, chairColor: CHAIR, seat: VELVET, spots: 3 });
  k.chair(-9.1, -5.75, Math.PI, CHAIR, VELVET);
  k.cyl(0.01, 0.01, 0.8, -9.1, H - 0.4, -3.2, GOLD, 6); k.lamp(-9.1, H - 0.95, -3.2, 0xffe6a8, 0.32);
  R(-11.9, -5.6, -11.5, -0.8, 0.9, 0.45, DARK, { collide: true, block: true });           // sideboard
  k.spawns.push(new THREE.Vector3(-11.7, 1.0, -4.5), new THREE.Vector3(-11.7, 1.0, -2.0));
  // a three-tier birthday cake on the private table
  for (const [r, y] of [[0.22, 0.86], [0.16, 0.98], [0.1, 1.09]]) k.cyl(r, r, 0.12, -9.1, y, -1.7, 0xfff0f5, 18);
  sign("PRIVATE FUNCTION: RONNIE'S BIRTHDAY. GUESTS: RONNIE. CAKE PORTIONS: RONNIE.", 2.4, 0.5, [-9.0, 2.4, -0.3], [0, Math.PI, 0], { bg: '#1a0508', fg: '#d4af37', border: GOLD_HEX, size: 40 });
  sign("PRIVATE DINING ROOM", 1.6, 0.3, [-6.25, 2.7, -3.2], [0, -Math.PI / 2, 0], { bg: '#1a0508', fg: '#d4af37', border: null, size: 50 });

  // ================================================================ wine bar + lounge (east)
  R(10.8, -5.6, 11.6, 1.6, 1.08, 0.54, DARK, { collide: true, block: true });            // bar counter
  R(10.7, -5.7, 11.7, 1.7, 0.05, 1.1, 0x1a0a04, { collide: true });
  R(10.68, -5.6, 10.72, 1.6, 0.04, 1.16, GOLD);
  for (let z = -5.0; z <= 1.2; z += 1.0) k.stool(10.2, z, VELVET, GOLD);
  for (let z = -5.2; z <= 1.2; z += 1.6) k.spawns.push(new THREE.Vector3(11.1, 1.2, z));
  k.label('wine', 7.0, 2.0, [11.9 - 0.02, 1.9, -2.0], [0, -Math.PI / 2, 0], { tex: wineTex(), glow: true });
  for (let z = -5; z <= 1; z += 2) { k.cyl(0.006, 0.006, 0.9, 10.6, H - 0.45, z, 0x222222, 4); k.lamp(10.6, H - 1.0, z, 0xffb050, 0.14); }
  sign("WINE LIST: RED, WHITE, AND WHATEVER RONNIE HASN'T FINISHED", 2.4, 0.4, [11.88, 3.05, -2.0], [0, -Math.PI / 2, 0], { bg: '#1a0508', fg: '#d4af37', border: GOLD_HEX, size: 40 });
  // lounge: armchairs round low tables, half-screened by a planter
  const armchair = (x, z, ry) => { k.box(0.75, 0.42, 0.75, x, 0.21, z, VELVET, { rot: [0, ry, 0], block: true }); k.box(0.75, 0.55, 0.16, x + Math.sin(ry) * 0.3, 0.6, z + Math.cos(ry) * 0.3, VELVET, { rot: [0, ry, 0] }); };
  for (const [x, z] of [[8.0, 2.6], [8.0, -4.2]]) {
    k.cyl(0.4, 0.4, 0.05, x, 0.45, z, DARK, 16, { collide: true, block: true }); k.cyl(0.06, 0.1, 0.42, x, 0.21, z, DARK, 8);
    armchair(x - 0.9, z, -Math.PI / 2); armchair(x + 0.9, z, Math.PI / 2);
    k.spawns.push(new THREE.Vector3(x, 0.55, z));
  }

  // ================================================================ foyer (south-east), walled off from the dining room
  wallX(6.5, 5.2, 9, H, RED); wallZ(5.2, 6.5, 8.4, H, RED); wallZ(5.2, 10.6, 12, H, RED);   // archway at x 8.4..10.6
  R(8.4, 5.1, 10.6, 5.3, H - 2.4, 2.4 + (H - 2.4) / 2, RED); R(8.4, 5.08, 10.6, 5.32, 0.08, 2.42, GOLD);
  // maître d' podium with the booking book, velvet ropes, waiting bench, coats
  R(9.2, 6.4, 9.8, 6.9, 1.1, 0.55, DARK, { block: true }); R(9.25, 6.45, 9.75, 6.85, 0.02, 1.12, 0xf5f0e6);
  sign('THE BOOK: TABLE 1: RONNIE (x4 SEATS). TABLE 2: RONNIE (OVERFLOW).', 0.6, 0.4, [9.5, 1.15, 6.92], [-0.6, 0, 0], { bg: '#f5f0e6', fg: '#111', border: null, size: 30 });
  for (const x of [8.0, 8.8, 10.2, 11.0]) { k.cyl(0.03, 0.06, 0.95, x, 0.48, 6.0, GOLD, 8); k.cyl(0.05, 0.05, 0.05, x, 0.97, 6.0, GOLD, 8); }
  R(8.0, 5.97, 8.8, 6.03, 0.05, 0.85, VELVET); R(10.2, 5.97, 11.0, 6.03, 0.05, 0.85, VELVET);
  R(11.3, 6.0, 11.9, 8.6, 0.45, 0.225, VELVET, { block: true }); R(11.75, 6.0, 11.92, 8.6, 0.6, 0.75, VELVET);
  R(6.6, 7.6, 7.2, 8.8, 2.0, 1.0, 0x3a2416, { block: true });                              // cloakroom cupboard
  for (let z = 7.7; z < 8.7; z += 0.25) R(7.2, z, 7.4, z + 0.18, 0.7, 1.4, [0x222222, 0x5a3a22, 0x1d2b5a, 0x7a1f3d][Math.round(z * 4) % 4]);
  sign('PLEASE WAIT TO BE SEATED. RONNIE: PLEASE WAIT OUTSIDE.', 1.8, 0.4, [9.5, 2.3, 5.35], [0, 0, 0], { bg: '#1a0508', fg: '#d4af37', border: GOLD_HEX, size: 40 });
  sign('DRESS CODE: SMART. RONNIE\'S TROUSERS: STRAINED.', 1.4, 0.35, [11.88, 1.9, 7.2], [0, -Math.PI / 2, 0], { bg: '#f5f0e6', fg: '#5a0f18', border: GOLD_HEX, size: 36 });

  // ================================================================ booths along the back (south)
  R(-11.9, 8.3, 6.4, 8.92, 1.15, 0.575, VELVET, { block: true });
  R(-11.9, 7.75, 6.4, 8.35, 0.45, 0.225, DARK, { block: true }); R(-11.9, 7.75, 6.4, 8.35, 0.12, 0.5, VELVET);
  for (let x = -10.5; x < 6; x += 3.0) {
    R(x - 0.06, 7.2, x + 0.06, 8.9, 1.5, 0.75, DARK, { block: true });                        // booth dividers
    k.table(x + 1.5, 7.15, 1.4, 0.75, { cloth: CLOTH, chairs: 0, spots: 1 });
    k.chair(x + 1.2, 6.42, Math.PI, CHAIR, VELVET); k.chair(x + 1.8, 6.42, Math.PI, CHAIR, VELVET);
    k.cyl(0.02, 0.02, 0.18, x + 1.7, 0.86, 7.0, 0xfff3d0, 8); k.lamp(x + 1.7, 0.97, 7.0, 0xffb84d, 0.03);
  }

  // ================================================================ main dining room
  // low planter screens break the room into smaller areas (gaps to walk through)
  const planter = (x0, z0, x1, z1) => { R(x0, z0, x1, z1, 0.6, 0.3, DARK, { collide: true, block: true }); R(x0 + 0.04, z0 + 0.04, x1 - 0.04, z1 - 0.04, 0.45, 0.82, 0x2e6b2e); };
  planter(-6.0, -1.9, -4.2, -1.5); planter(-2.6, -2.9, -1.2, -2.5); planter(1.2, -2.9, 2.6, -2.5); planter(4.2, -1.9, 6.0, -1.5);
  planter(-6.0, 3.3, -4.4, 3.7); planter(4.4, 3.3, 6.0, 3.7);
  // the date table (round, for two) with a rose and two candles
  k.table(DATE_TABLE.x, DATE_TABLE.z, 1.0, 1.0, { round: true, cloth: CLOTH, chairs: 0, spots: 1 });
  k.chair(DATE_TABLE.x, DATE_TABLE.z - 0.75, Math.PI, CHAIR, VELVET);
  k.chair(DATE_TABLE.x, DATE_TABLE.z + 0.78, 0, CHAIR, VELVET);
  k.cyl(0.03, 0.04, 0.12, DATE_TABLE.x - 0.2, 0.84, DATE_TABLE.z, 0xbfe3f0, 8); k.cyl(0.035, 0.035, 0.04, DATE_TABLE.x - 0.2, 0.93, DATE_TABLE.z, 0xc8102e, 8);
  // the other diners' tables, in little groups between the planters
  const tables = [[-3.5, -4.3], [3.5, -4.3], [-8.5, 1.6], [-4.0, 1.0], [4.0, 1.0], [-8.5, 4.2], [-3.0, 4.4], [3.0, 4.4], [-1.5, -1.0]];
  for (const [x, z] of tables) {
    k.table(x, z, 1.1, 1.1, { round: true, cloth: CLOTH, chairs: 0, spots: 1 });
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; k.chair(x + Math.sin(a) * 0.85, z + Math.cos(a) * 0.85, a, CHAIR); }
  }
  for (const [x, z] of [[DATE_TABLE.x, DATE_TABLE.z], ...tables]) { k.cyl(0.02, 0.02, 0.18, x + 0.18, 0.86, z - 0.15, 0xfff3d0, 8); k.lamp(x + 0.18, 0.97, z - 0.15, 0xffb84d, 0.03); }
  // dessert trolley (Date Night: grab from it while Chloe isn't looking)
  R(3.3, -2.15, 4.7, -1.45, 0.85, 0.425, GOLD, { collide: true, block: true });
  for (const dx of [-0.45, 0, 0.45]) k.spawns.push(new THREE.Vector3(4.0 + dx, 0.95, -1.8));
  for (const dx of [-0.5, 0.5]) k.cyl(0.08, 0.08, 0.04, 4.0 + dx, 0.05, -1.8, 0x111111, 10);
  sign('DESSERT TROLLEY (NOT FOR RONNIE)', 1.2, 0.25, [4.0, 0.55, -1.44], [0, 0, 0], { bg: '#3a0a10', fg: '#d4af37', border: null, size: 40 });
  // grand piano in the corner (with a pianist's empty stool)
  k.cyl(0.85, 0.85, 0.3, -9.6, 0.85, 2.9, 0x0a0a0a, 20, { collide: true, block: true });
  for (const [dx, dz] of [[-0.5, -0.4], [0.5, -0.4], [0, 0.6]]) k.cyl(0.05, 0.05, 0.7, -9.6 + dx, 0.35, 2.9 + dz, 0x0a0a0a, 6);
  R(-9.7, 1.8, -8.6, 2.1, 0.06, 0.75, 0xffffff); k.stool(-9.1, 1.4, 0x111111, 0x333333, 0.5);
  sign('THE PIANIST QUIT AFTER RONNIE REQUESTED "THE CHEESEBURGER SONG" 40 TIMES', 1.6, 0.4, [-11.88, 2.3, 2.9], [0, Math.PI / 2, 0], { bg: '#1a0508', fg: '#d4af37', border: GOLD_HEX, size: 36 });
  // lobster tank (glowing)
  R(4.6, 6.1, 6.2, 6.3, 0.75, 0.375, DARK, { block: true });
  k.label('lobsters', 1.5, 0.7, [5.4, 1.15, 6.08], [0, Math.PI, 0], { tex: tankTex(), glow: true });
  sign('LOBSTERS: RONNIE HAS NAMED ALL OF THEM. AND EATEN TWO.', 1.5, 0.3, [5.4, 1.7, 6.08], [0, Math.PI, 0], { bg: '#0d47a1', fg: '#fff', border: null, size: 36 });

  // ================================================================ lighting: chandeliers, wall sconces
  const chandelier = (x, z, r = 0.45) => {
    const y = H - 0.8;
    k.cyl(0.01, 0.01, 0.8, x, H - 0.4, z, GOLD, 6); k.cyl(0.08, 0.05, 0.15, x, y, z, GOLD, 10);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; k.lamp(x + Math.cos(a) * r, y + 0.05, z + Math.sin(a) * r, 0xffe6a8, 0.05); }
    k.lamp(x, y - 0.15, z, 0xffe6a8, 0.22);
  };
  [[-3.5, -3.5], [3.5, -3.5], [0, 0.6], [-6.5, 2.6], [6.5, 2.6], [-3, 4.0], [3, 4.0]].forEach(([x, z]) => chandelier(x, z));
  for (let x = -10; x < 6; x += 3) k.lamp(x, 2.2, 8.85, 0xffc070, 0.08);

  // ================================================================ more jokes
  const jokes = [
    ['LA GRANDE PORTION', 6, 1.0, [0, 2.75, -6.33], [0, 0, 0], { tex: nameTex(), glow: true }],
    ["TONIGHT'S SPECIAL: EVERYTHING (RONNIE'S TABLE)", 2.4, 0.9, [-11.88, 1.8, 0.0], [0, Math.PI / 2, 0], { bg: '#1b1b1b', fg: '#f5f0e6', border: GOLD_HEX, size: 54 }],
    ['PLEASE DO NOT EAT FROM OTHER TABLES (RONNIE)', 2.4, 0.6, [11.88, 1.8, 4.0], [0, -Math.PI / 2, 0], { bg: '#f5f0e6', fg: '#5a0f18', border: GOLD_HEX, size: 50 }],
    ['ALL YOU CAN EAT: SUSPENDED (SEE RONNIE)', 1.8, 0.4, [-3.0, 2.1, 8.88], [0, Math.PI, 0], { bg: '#5a0f18', fg: '#fff', border: GOLD_HEX, size: 44 }],
    ['TASTING MENU: 12 COURSES. RONNIE\'S TASTING MENU: 12 TASTES OF EACH COURSE.', 2.2, 0.5, [3.0, 2.1, 8.88], [0, Math.PI, 0], { bg: '#f5f0e6', fg: '#111', border: GOLD_HEX, size: 36 }],
    ['TIPS: 12.5% SERVICE. RONNIE: 12.5% OF THE KITCHEN.', 1.6, 0.4, [11.88, 2.3, -6.5], [0, -Math.PI / 2, 0], { bg: '#f5f0e6', fg: '#5a0f18', border: GOLD_HEX, size: 36 }],
    ['CHEF\'S RECOMMENDATION: DON\'T LET RONNIE NEAR THE PASS', 1.4, 0.4, [2.4, 1.6, -6.11], [0, 0, 0], { bg: '#fff', fg: '#c0392b', border: '#c0392b', size: 36 }],
    ['ROMANTIC CANDLELIT DINNER. RONNIE ATE ONE OF THE CANDLES. IT WAS VANILLA.', 1.4, 0.5, [-11.88, 1.8, -6.0 + 0.5], [0, Math.PI / 2, 0], { bg: '#f5f0e6', fg: '#5a0f18', border: GOLD_HEX, size: 34 }],
  ];
  for (const [t, w, h, pos, rot, o] of jokes) sign(t, w, h, pos, rot, o);

  return k.finish({
    name: 'La Grande Portion',
    sky: 0xffd9b0, ground: 0x3a1010, hemiI: 1.6, sun: 0xffc890, sunI: 0.8, sunPos: [2, 10, 4],
    start: { x: DATE_TABLE.x, z: DATE_TABLE.z + 1.05, yaw: 0 },
    board: { x: -6.5, y: 1.38, z: 8.86, ry: Math.PI },
    startFood: ['burger', 'pizza', 'doughnut', 'burger', 'pizza', 'doughnut', 'burger', 'pizza', 'doughnut', 'burger', 'pizza', 'doughnut', 'doughnut', 'doughnut', 'can', 'burger'],
    spotCount: 24,
  });
}

const GOLD_HEX = '#d4af37';

function nameTex() {
  return canvasTex(1024, 170, (g, w, h) => {
    g.fillStyle = '#1a0508'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d4af37'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#d4af37'; g.font = 'italic 96px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('La Grande Portion', w / 2, h / 2 + 4);
  });
}
function wineTex() {
  return canvasTex(1024, 300, (g, w, h) => {
    g.fillStyle = '#2a1208'; g.fillRect(0, 0, w, h);
    for (let y = 10; y < h; y += 48) for (let x = 8; x < w; x += 30) {
      g.fillStyle = '#4a2a16'; g.fillRect(x - 2, y - 2, 28, 44);
      g.fillStyle = ['#5a0f18', '#2e4a1a', '#7a1f2a', '#d8c070'][(x * 7 + y) % 4]; g.beginPath(); g.arc(x + 12, y + 20, 11, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.arc(x + 9, y + 16, 3, 0, 7); g.fill();
    }
    g.fillStyle = 'rgba(255,190,90,0.12)'; g.fillRect(0, 0, w, h);
  });
}
function tankTex() {
  return canvasTex(512, 240, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4fc3f7'); gr.addColorStop(1, '#01579b'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c2b280'; g.fillRect(0, h - 30, w, 30);
    const names = ['GARY', 'SHELLDON', 'PINCHY', 'BRIAN'];
    for (let i = 0; i < 4; i++) { const x = 60 + i * 120, y = h - 50; g.fillStyle = '#d84315'; g.beginPath(); g.ellipse(x, y, 30, 12, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x - 34, y - 10, 12, 7, -0.5, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + 34, y - 10, 12, 7, 0.5, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 16px Arial'; g.textAlign = 'center'; g.fillText(names[i], x, y - 26); }
    for (let i = 0; i < 25; i++) { g.strokeStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc((i * 97) % w, (i * 53) % (h - 60), 3 + (i % 3), 0, 7); g.stroke(); }
  });
}
function paintTex(i) {
  return canvasTex(256, 192, (g, w, h) => {
    const bgs = [['#3a5a2a', '#c9a24a'], ['#1a2a4a', '#d8c070'], ['#5a2a1a', '#e0b060']][i];
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, bgs[0]); gr.addColorStop(1, bgs[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (i === 0) { g.fillStyle = '#d9933f'; g.beginPath(); g.ellipse(w / 2, h / 2, 70, 40, 0, Math.PI, 0); g.fill(); g.fillStyle = '#5a2e14'; g.fillRect(w / 2 - 72, h / 2, 144, 18); g.fillStyle = '#d9933f'; g.fillRect(w / 2 - 66, h / 2 + 18, 132, 18); g.fillStyle = '#fff'; g.font = 'italic 16px Georgia'; g.textAlign = 'center'; g.fillText('"Still Life With Burger" (Ronnie, 2024)', w / 2, h - 12); }
    else if (i === 1) { g.fillStyle = '#ff6fae'; g.beginPath(); g.arc(w / 2, h / 2, 50, 0, 7); g.fill(); g.fillStyle = bgs[0]; g.beginPath(); g.arc(w / 2, h / 2, 18, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = 'italic 15px Georgia'; g.textAlign = 'center'; g.fillText('"The Doughnut Hole Of Despair"', w / 2, h - 12); }
    else { g.fillStyle = '#f0d9b5'; g.beginPath(); g.arc(w / 2, h / 2 - 5, 45, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(w / 2 - 15, h / 2 - 15, 5, 0, 7); g.arc(w / 2 + 15, h / 2 - 15, 5, 0, 7); g.fill(); g.strokeStyle = '#111'; g.lineWidth = 4; g.beginPath(); g.arc(w / 2, h / 2, 22, 0.2, Math.PI - 0.2); g.stroke(); g.fillStyle = '#fff'; g.font = 'italic 15px Georgia'; g.textAlign = 'center'; g.fillText('"The Mona Ronnie" (smiling: food nearby)', w / 2, h - 12); }
  });
}
