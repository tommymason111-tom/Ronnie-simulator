// THE OYSTERFLEET: Ronnie's local and workplace (design doc section 84).
// 27m x 22m, every room fully walled in, with wide clear walkways:
//   main pub floor (tables in a grid with 1.5m+ aisles, booths along the back
//   wall, fireplace), the bar down the east side with a tiled walkway and stools,
//   behind-the-bar staff area, gambling room (poker + pool + fruit machines),
//   kitchen, Gents and Ladies toilets, and the entrance lobby.
// Look (from a photo of the real pub): bright cream ceiling and tongue-and-groove
// bulkheads, red-brick pillars with up/down wall lights, dark wood posts and beams,
// brick and "library" walls, burgundy patterned carpet, grey-brown tiles along the
// bar, honey-oak bar with brass rails and burgundy leather stools, tall poseur
// tables with cream stools, light-wood and dark wheelback chairs, iron chandeliers
// and amber glass pendants.
//
// Plan (x east, z south, metres):
//   kitchen  x -13.5..-7  z -11..-2      gents  x -7..-3  z -11..-6.5
//   ladies   x -3..1      z -11..-6.5    lobby  x 1..5    z -11..-6.5
//   pub floor x -13.5..5 (z -2..11) + x -7..5 (z -6.5..-2)
//   bar walkway x 5..7.5 z -11..3 · bar counter x 7.5..8.2 z -9.5..1
//   staff area x 8.2..13.5 z -11..1 · corridor z 1..3 · gambling x 6..13.5 z 3..11
import * as THREE from 'three';
import { part } from '../geo.js';
import { streetViewTex } from './kit.js';
import { Kit, carpetTex, tileTex, canvasTex, FONT, brickTex, booksWallTex, tngTex, oakPanelTex } from './kit.js';

const H = 3.0;
const B = { x0: -13.5, x1: 13.5, z0: -11, z1: 11 };

export function buildPub(scene) {
  const k = new Kit(scene, { ...B, y1: H });
  const WALL = 0xeee6d6, PLASTER = 0xf2ecdf, DARKWOOD = 0x3a2416, WOOD = 0x4a2c18, REDLEATHER = 0x7a1f2a, BRASS = 0xc9a24a, CREAM = 0xe8dcc0, LIGHTWOOD = 0xc89a5a;
  const STEEL = 0xb8bcc2, DSTEEL = 0x8a9098, WHITE = 0xf8f8f6, PORCELAIN = 0xfbfbfb;
  const BRICK = brickTex(), BOOKS = booksWallTex(), TNG = tngTex(), OAK = oakPanelTex();
  const WTILE = tileTex('#f6f6f3', '#efefec', '#c9c9c4', 32), GTILE = tileTex('#dfe9ee', '#d4e0e6', '#a9b6bc', 32), KTILE = tileTex('#ffffff', '#f2f2f2', '#c0c0c0', 32);
  // axis-aligned box from corner to corner (x0,z0)-(x1,z1)
  const R = (x0, z0, x1, z1, h, y, color, opts) => k.box(Math.abs(x1 - x0), h, Math.abs(z1 - z0), (x0 + x1) / 2, y ?? h / 2, (z0 + z1) / 2, color, opts);
  // walls: thickness 0.16, run a little past their ends so every corner closes
  const T2 = 0.08;
  const wallX = (x, z0, z1, color = PLASTER) => R(x - T2, z0 - T2, x + T2, z1 + T2, H, H / 2, color, { collide: true, block: true });
  const wallZ = (z, x0, x1, color = PLASTER) => R(x0 - T2, z - T2, x1 + T2, z + T2, H, H / 2, color, { collide: true, block: true });
  // a wall with door gaps: gaps = [[a, b], ...] along the wall
  const wallXd = (x, z0, z1, gaps, color) => { let a = z0; for (const [g0, g1] of gaps) { if (g0 > a) wallX(x, a, g0, color); a = g1; lintelX(x, g0, g1); } if (z1 > a) wallX(x, a, z1, color); };
  const wallZd = (z, x0, x1, gaps, color) => { let a = x0; for (const [g0, g1] of gaps) { if (g0 > a) wallZ(z, a, g0, color); a = g1; lintelZ(z, g0, g1); } if (x1 > a) wallZ(z, a, x1, color); };
  const lintelX = (x, z0, z1) => { R(x - T2, z0, x + T2, z1, H - 2.2, 2.2 + (H - 2.2) / 2, PLASTER); for (const z of [z0, z1]) R(x - 0.1, z - 0.04, x + 0.1, z + 0.04, 2.2, 1.1, DARKWOOD); R(x - 0.1, z0, x + 0.1, z1, 0.08, 2.24, DARKWOOD); };
  const lintelZ = (z, x0, x1) => { R(x0, z - T2, x1, z + T2, H - 2.2, 2.2 + (H - 2.2) / 2, PLASTER); for (const x of [x0, x1]) R(x - 0.04, z - 0.1, x + 0.04, z + 0.1, 2.2, 1.1, DARKWOOD); R(x0, z - 0.1, x1, z + 0.1, 0.08, 2.24, DARKWOOD); };
  // wall cladding (tiles / brick / books) on one face of a wall
  const clad = (x0, z0, x1, z1, tex, h = H, tile = 1, y0 = 0) => k.texBox(Math.max(Math.abs(x1 - x0), 0.02), h, Math.max(Math.abs(z1 - z0), 0.02), (x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2, tex, { tile });

  // ================================================================ floors + shell
  const carpet = carpetTex('#6a2430', '#4a1620', '#93404a'), tiles = tileTex('#8f8574', '#837a69', '#5e574b', 85);
  k.floor(-13.5, -2, 5, 11, carpet, 0.002, 1.2);
  k.floor(-7, -6.5, 5, -2, carpet, 0.002, 1.2);
  k.floor(5, -11, 13.5, 3, tiles, 0.002, 1.0);
  k.floor(6, 3, 13.5, 11, carpetTex('#2a3a5a', '#1a2440', '#c9a24a'), 0.003, 1.2);
  k.floor(4.9, 2.9, 6.05, 11, carpet, 0.0025, 1.2);
  k.floor(-13.5, -11, -7, -2, tileTex('#c9c9c4', '#bdbdb7', '#8f8f8a', 48), 0.003, 0.8);
  k.floor(-7, -11, 1, -6.5, tileTex('#d8d8d8', '#cfcfcf', '#9a9a9a', 40), 0.003, 0.6);
  k.floor(1, -11, 5, -6.5, tiles, 0.003, 1.0);
  k.ceiling(0xf7f3ea, 0xbdb5a2);
  // outer walls: solid, all the way round (no gaps to the outside anywhere)
  wallZ(B.z0, B.x0, B.x1, WALL); wallZ(B.z1, B.x0, B.x1, WALL); wallX(B.x0, B.z0, B.z1, WALL); wallX(B.x1, B.z0, B.z1, WALL);
  // skirting along the pub's outer walls
  R(-13.42, -2, -13.34, 11, 0.14, 0.07, DARKWOOD); R(-13.5, 10.84, 5, 10.92, 0.14, 0.07, DARKWOOD);

  // ================================================================ interior walls
  wallXd(-7, -11, -2, [[-4.5, -3.0]]);                       // kitchen | gents & pub (kitchen door)
  wallZ(-2, -13.5, -7);                                        // kitchen | pub (south)
  wallZd(-6.5, -7, 1, [[-5.8, -4.4], [-1.6, -0.2]]);           // toilets | pub (Gents door, Ladies door)
  wallX(-3, -11, -6.5);                                        // Gents | Ladies
  wallX(1, -11, -6.5);                                         // Ladies | lobby
  wallZd(-6.5, 1, 5, [[1.6, 4.6]]);                            // lobby | pub (wide opening)
  wallZd(3, 6, 13.5, [[6.4, 8.0]]);                            // corridor | gambling room
  wallXd(6, 3, 11, [[8.8, 10.3]]);                             // pub | gambling room (second door)
  // pub-side finishes: library wallpaper and exposed brick, dark dado rail
  clad(-13.4, -1.9, -13.38, 3.5, BOOKS, H, 1.2); clad(-13.4, 5.3, -13.38, 10.9, BOOKS, H, 1.2);
  R(-13.42, -1.9, -13.36, 10.9, 0.06, 0.95, DARKWOOD);
  clad(-13.4, 10.88, 5, 10.9, BRICK, H, 0.9);
  clad(-12.9, -1.9, -7.1, -1.9, BRICK, H, 0.9);                 // kitchen wall, pub side
  // cream tongue-and-groove bulkheads with a dark beam under them (as in the photo)
  const fascia = (x0, z0, x1, z1) => { const w = Math.max(x1 - x0, 0.3), d = Math.max(z1 - z0, 0.3); k.texBox(w, 0.45, d, (x0 + x1) / 2, H - 0.225, (z0 + z1) / 2, TNG, { tile: 0.6 }); k.box(w + 0.02, 0.1, d + 0.02, (x0 + x1) / 2, H - 0.5, (z0 + z1) / 2, DARKWOOD); };
  fascia(-7, -2.15, 5, -1.85);      // over the step from the front bit to the main room
  fascia(4.85, -11, 5.15, 3);       // along the bar walkway
  fascia(-13.5, 4.15, -7.5, 4.45);  // beam across the room by the fire
  for (const [x, z] of [[-7, -2], [5, -2], [5, 3]]) k.box(0.16, H - 0.5, 0.16, x, (H - 0.5) / 2, z, DARKWOOD, { block: true });
  // red-brick pillars with up/down wall lights, standing where aisles cross
  const pillar = (x, z) => {
    k.texBox(0.46, H - 0.05, 0.46, x, (H - 0.05) / 2, z, BRICK, { tile: 0.9, collide: true, block: true });
    for (const [dx, dz] of [[0.24, 0], [-0.24, 0], [0, 0.24], [0, -0.24]]) {
      k.box(Math.abs(dx) ? 0.04 : 0.14, 0.12, Math.abs(dz) ? 0.04 : 0.14, x + dx * 1.15, 1.95, z + dz * 1.15, 0xf2f2f2);
      sconceGlow(k, x + dx * 1.25, 1.95, z + dz * 1.25, x, z);
    }
  };
  pillar(-5.5, 4.3); pillar(-2.1, 0.85);

  // ================================================================ the bar
  const barX0 = 7.5, barX1 = 8.2, barZ0 = -9.5, barZ1 = 1.0;
  k.texBox(barX1 - barX0, 1.08, barZ1 - barZ0, (barX0 + barX1) / 2, 0.54, (barZ0 + barZ1) / 2, OAK, { tile: 0.7, collide: true, block: true });
  R(barX0 - 0.06, barZ0 - 0.05, barX1 + 0.05, barZ1 + 0.05, 0.06, 1.11, 0x4a2a14, { collide: true });   // polished dark top
  R(barX0 - 0.12, barZ0, barX0 - 0.07, barZ1, 0.05, 1.17, BRASS);                                       // brass top rail
  R(barX0 - 0.19, barZ0, barX0 - 0.15, barZ1, 0.04, 0.22, BRASS);                                       // brass foot rail
  for (let z = barZ0 + 0.3; z < barZ1; z += 0.9) R(barX0 - 0.17, z - 0.015, barX0, z + 0.015, 0.04, 0.22, BRASS);
  // beer taps, drip trays, glasses
  for (let z = -6; z <= -1; z += 0.55) { k.cyl(0.015, 0.015, 0.32, 7.95, 1.3, z, 0xd4af37, 8); k.box(0.05, 0.12, 0.03, 7.95, 1.5, z, [0xc8102e, 0x111111, 0x1f4fbf, 0xffd400][Math.round(z / 0.55 + 20) % 4]); }
  R(7.85, -6.2, 8.05, -0.8, 0.02, 1.15, 0x888888);
  // stools along the bar, a clear 1.7m walkway behind them
  for (let z = -8.9; z <= 0.5; z += 1.05) k.stool(6.95, z, 0x8a1f2a, BRASS);
  // food on the bar (the "snack station": first spots)
  for (const z of [-5.5, -4.2, -2.9, -1.6, -0.3]) k.spawns.push(new THREE.Vector3(7.75, 1.22, z));
  for (const z of [-9.0, -7.9, -6.8]) k.spawns.push(new THREE.Vector3(7.85, 1.22, z));
  // amber pendants over the bar
  for (const z of [-8.5, -6.5, -4.5, -2.5, -0.5]) { k.cyl(0.006, 0.006, 0.9, 7.85, H - 0.45, z, 0x222222, 4); k.lamp(7.85, H - 1.0, z, 0xffb050, 0.14); }
  // behind the bar: back bar with lit bottle shelves, glass-washer counter, MONSTOR fridge
  R(13.0, -10.8, 13.42, 0.8, 2.2, 1.1, 0x2a1a10, { collide: true, block: true });
  k.label('bottles', 11.4, 1.2, [12.99, 1.6, -5.0], [0, -Math.PI / 2, 0], { tex: bottleTex(), glow: true });
  for (let z = -10.2; z < 0.6; z += 1.0) k.lamp(12.95, 2.35, z, 0xffc070, 0.05);
  R(12.4, -10.8, 13.0, 0.8, 0.9, 0.45, 0x3a2a1e, { collide: true, block: true });
  R(12.38, -10.8, 13.0, 0.8, 0.04, 0.92, 0x1a1a1a);
  for (const z of [-9.5, -7.5, -3.5, -1.5]) k.spawns.push(new THREE.Vector3(12.7, 1.0, z));
  R(12.4, -6.4, 13.0, -4.8, 1.9, 0.95, 0x111111, { block: true });                                      // the MONSTOR fridge
  k.label('fridge', 1.5, 1.7, [12.39, 0.98, -5.6], [0, -Math.PI / 2, 0], { tex: monstorFridgeTex(), glow: true });
  k.label('PORK SCRATCHINGS · CRISPS · NUTS', 1.4, 0.5, [12.99, 2.55, -1.5], [0, -Math.PI / 2, 0], { tex: crispsTex() });
  k.label('THE OYSTERFLEET', 3.6, 0.8, [12.99, 2.62, -6.0], [0, -Math.PI / 2, 0], { tex: pubSignTex(), glow: true });
  // the till
  R(8.3, -3.4, 8.7, -3.0, 0.25, 1.26, 0x222222); R(8.35, -3.3, 8.45, -3.1, 0.2, 1.48, 0x4caf50);

  // ================================================================ pub floor
  let alt = 0;
  const table = (x, z, w = 1.2, d = 0.8, chairs = 1, opts = {}) => { const light = (alt++ % 2) === 0; k.table(x, z, w, d, { chairs, top: WOOD, legs: DARKWOOD, chairColor: light ? LIGHTWOOD : DARKWOOD, seat: light ? null : 0x8a2a2a, spots: 1, ...opts }); };
  // 4-seater tables on a grid: 2m between columns, 1.5m between rows
  for (const z of [2.6, 6.0]) for (const x of [-10.6, -7.2, -3.8, -0.4]) table(x, z, 1.2, 0.8, 2);
  for (const x of [-3.8, -0.4]) table(x, -0.8, 1.2, 0.8, 2);
  // booths along the back wall: leather bench against the brick, a chair opposite each table
  R(-12.9, 10.45, 1.9, 10.9, 0.95, 0.475, REDLEATHER, { block: true });
  R(-12.9, 9.95, 1.9, 10.5, 0.45, 0.225, DARKWOOD, { block: true }); R(-12.9, 9.95, 1.9, 10.5, 0.1, 0.5, REDLEATHER);
  for (const x of [-11.5, -8.5, -5.5, -2.5, 0.5]) { table(x, 9.4, 1.3, 0.7, 0); k.chair(x - 0.3, 8.73, Math.PI, LIGHTWOOD); k.chair(x + 0.3, 8.73, Math.PI, LIGHTWOOD); }
  // tall poseur tables with cream leather stools, between the tables and the bar walkway
  const poseur = (x, z) => { k.box(0.7, 0.05, 0.7, x, 1.05, z, WOOD, { collide: true, block: true }); k.box(0.08, 1.03, 0.08, x, 0.52, z, DARKWOOD); k.box(0.5, 0.04, 0.5, x, 0.02, z, DARKWOOD); for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) k.stool(x + dx, z + dz, CREAM, DARKWOOD, 0.72); k.spawns.push(new THREE.Vector3(x, 1.13, z)); };
  poseur(2.6, 0.8); poseur(2.6, 4.3); poseur(2.6, 7.8); poseur(-3.2, -4.3); poseur(1.6, -4.3);
  // fireplace on the west wall: brick chimney breast, mantel, fire, two armchairs facing it
  k.texBox(0.7, H - 0.05, 1.6, -13.15, (H - 0.05) / 2, 4.3, BRICK, { tile: 0.9, collide: true, block: true });
  R(-12.85, 3.45, -12.7, 5.15, 0.08, 1.05, DARKWOOD);
  R(-12.82, 3.9, -12.78, 4.7, 0.6, 0.35, 0x221410);
  const fire = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.45), new THREE.MeshBasicMaterial({ map: fireTex(), transparent: true }));
  fire.position.set(-12.77, 0.3, 4.3); fire.rotation.y = Math.PI / 2; scene.add(fire);
  k.lamp(-12.6, 0.25, 4.3, 0xff7a1a, 0.18);
  // dartboard + jukebox in the front bit, fruit-bowl joke on the kitchen wall
  k.label('DARTS', 0.7, 0.7, [-9.5, 1.7, -1.9], [0, 0, 0], { tex: dartTex() });
  R(-6.85, -6.35, -6.2, -5.6, 1.5, 0.75, 0x5a2a6a, { block: true });
  k.label('JUKEBOX', 0.6, 0.6, [-6.18, 1.05, -5.97], [0, Math.PI / 2, 0], { bg: '#ff4fa3', fg: '#fff', border: '#ffd400', size: 80, glow: true });
  // ceiling spotlights everywhere, iron chandeliers over the tables, red wall lights
  for (let x = -12.5; x < 13; x += 2) for (let z = -10; z < 10.6; z += 2) k.lamp(x, H - 0.01, z, 0xfffbe8, 0.035);
  const chandelier = (x, z) => {
    const y = H - 0.75;
    k.cyl(0.008, 0.008, 0.7, x, H - 0.35, z, 0x1a1a1a, 4); k.cyl(0.05, 0.03, 0.12, x, y, z, 0x1a1a1a, 8);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, ax = x + Math.cos(a) * 0.32, az = z + Math.sin(a) * 0.32;
      k.box(0.32, 0.015, 0.015, (x + ax) / 2, y, (z + az) / 2, 0x1a1a1a, { rot: [0, -a, 0] }); k.cyl(0.05, 0.07, 0.08, ax, y + 0.06, az, 0xf3ead6, 8); k.lamp(ax, y + 0.03, az, 0xfff1d0, 0.035); }
  };
  [[-8.9, 2.6], [-2.1, 2.6], [-8.9, 6.0], [-2.1, 6.0], [-2.1, -0.8], [9.8, 6.2]].forEach(([x, z]) => chandelier(x, z));
  for (const [x, z, ry] of [[-13.38, 0.5, 1], [-13.38, 8.0, 1], [-10, 10.85, 0], [-4, 10.85, 0], [2, 10.85, 0]]) { k.lamp(ry ? x + 0.08 : x, 2.05, ry ? z : z - 0.08, 0xff5040, 0.07); k.box(0.12, 0.14, 0.12, ry ? x + 0.06 : x, 2.05, ry ? z : z - 0.06, 0x8a1a1a); }
  // big screens: the football is on
  const tv = (x, y, z, ry) => { k.box(2.0, 1.15, 0.08, x, y, z, 0x111111, { rot: [0, ry, 0] }); k.label('tv', 1.9, 1.05, [x + Math.sin(ry) * 0.05, y, z + Math.cos(ry) * 0.05], [0, ry, 0], { tex: tvTex(), glow: true }); };
  tv(-12.75, 2.25, 4.3, Math.PI / 2);         // over the fireplace
  tv(-3.0, 2.15, -6.38, 0);                   // front bit, between the toilet doors
  tv(9.8, 2.1, 10.86, Math.PI);               // gambling room

  // ================================================================ gambling room
  // the poker table: padded leather rail, green baize, a chunky pedestal, chips and cards
  k.cyl(0.62, 0.62, 0.04, 9.8, 0.79, 6.2, 0x1e7a3a, 32, { collide: true });                      // baize
  k.parts.push(part(new THREE.TorusGeometry(0.66, 0.06, 8, 32), 0x2a1208, [9.8, 0.81, 6.2], [Math.PI / 2, 0, 0]));   // leather rail
  k.cyl(0.7, 0.68, 0.06, 9.8, 0.75, 6.2, 0x4a2a14, 32);                                           // wooden apron
  k.cyl(0.12, 0.16, 0.66, 9.8, 0.4, 6.2, 0x2a1a10, 12); k.cyl(0.42, 0.46, 0.06, 9.8, 0.03, 6.2, 0x2a1a10, 16);
  k.blockers.push({ x0: 9.0, x1: 10.6, z0: 5.4, z1: 7.0, y1: 0.85 });
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; k.chair(9.8 + Math.sin(a) * 1.1, 6.2 + Math.cos(a) * 1.1, a, 0x5a1a1a, 0x7a1f2a); }   // all facing the table
  for (let i = 0; i < 6; i++) {                                                                    // chip stacks and cards at each seat
    const a = i / 6 * Math.PI * 2, cx = 9.8 + Math.sin(a) * 0.45, cz = 6.2 + Math.cos(a) * 0.45;
    for (let j = 0; j < 3; j++) k.cyl(0.02, 0.02, 0.012 * (2 + j), cx + (j - 1) * 0.045, 0.81 + 0.006 * (2 + j), cz, [0xd32f2f, 0x1565c0, 0x111111][j], 10);
    k.box(0.06, 0.004, 0.085, 9.8 + Math.sin(a) * 0.3, 0.812, 6.2 + Math.cos(a) * 0.3, 0xffffff, { rot: [0, a, 0] });
  }
  for (let i = 0; i < 5; i++) k.box(0.06, 0.004, 0.085, 9.62 + i * 0.09, 0.812, 6.2, i < 3 ? 0xffffff : 0xd32f2f);   // the flop
  k.spawns.push(new THREE.Vector3(9.8, 0.9, 6.2));
  // pool table: mahogany frame, green cloth, cushions, pockets, turned legs, balls and a cue
  R(8.85, 8.95, 11.15, 10.05, 0.16, 0.74, 0x4a1a0a, { collide: true, block: true });
  R(9.0, 9.1, 11.0, 9.9, 0.02, 0.83, 0x1e6a3a, { collide: true });
  for (const [x0, z0, x1, z1] of [[9.0, 9.05, 11.0, 9.12], [9.0, 9.88, 11.0, 9.95], [8.95, 9.1, 9.02, 9.9], [10.98, 9.1, 11.05, 9.9]]) R(x0, z0, x1, z1, 0.04, 0.85, 0x175a30);
  for (const [x, z] of [[9.0, 9.1], [10.0, 9.08], [11.0, 9.1], [9.0, 9.9], [10.0, 9.92], [11.0, 9.9]]) k.cyl(0.045, 0.045, 0.02, x, 0.84, z, 0x111111, 10);
  for (const [x, z] of [[9.05, 9.15], [10.95, 9.15], [9.05, 9.85], [10.95, 9.85]]) { k.cyl(0.07, 0.05, 0.6, x, 0.36, z, 0x3a1206, 10); k.cyl(0.09, 0.09, 0.06, x, 0.03, z, 0x3a1206, 10); }
  const BALLS = [0xffd400, 0x1565c0, 0xd32f2f, 0x6a1b9a, 0xff7a1a, 0x2e7d32, 0x8a1a1a, 0x111111, 0xffd400, 0x1565c0];
  let bi = 0; for (let r = 0; r < 4; r++) for (let c = 0; c <= r; c++) if (bi < 10) k.parts.push(part(new THREE.SphereGeometry(0.028, 10, 8), BALLS[bi++], [10.35 + r * 0.05, 0.868, 9.5 + (c - r / 2) * 0.058]));
  k.parts.push(part(new THREE.SphereGeometry(0.028, 10, 8), 0xffffff, [9.45, 0.868, 9.5]));
  k.box(1.45, 0.02, 0.02, 9.0, 0.87, 9.62, 0xc8a070, { rot: [0, 0.15, 0.02] });
  for (const x of [9.3, 9.5]) k.box(0.02, 1.45, 0.02, x, 0.73, 10.88, 0xc8a070);      // cues on the wall
  R(9.15, 10.85, 9.65, 10.92, 0.5, 1.6, 0x3a1206);
  k.spawns.push(new THREE.Vector3(10.6, 0.92, 9.5));
  // the fruit machines (they WORK: touch or tap one, the reels spin, it pays out in food)
  const machines = [];
  for (const z of [4.4, 5.5, 6.6, 7.7]) {
    R(12.95, z - 0.45, 13.42, z + 0.45, 1.7, 0.85, 0x222244, { block: true });
    R(12.85, z - 0.3, 12.96, z + 0.3, 0.06, 0.62, 0xc9a24a);                       // the payout tray
    R(12.9, z + 0.33, 12.96, z + 0.38, 0.3, 1.25, 0xd32f2f);                       // the lever
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 320;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = k.label('THE CHIP MACHINE', 0.75, 0.9, [12.93, 1.1, z], [0, -Math.PI / 2, 0], { tex, glow: true });
    const m = { z, front: new THREE.Vector3(12.55, 1.0, z), tray: new THREE.Vector3(12.75, 0.75, z), cv, tex, mesh, t: -1, reels: [0, 1, 2], win: null, cool: 0 };
    m.spin = () => { if (m.t >= 0 || m.cool > 0) return false; m.t = 0; m.win = MACHINE_SYMS[Math.floor(Math.random() * MACHINE_SYMS.length)]; return true; };
    drawMachine(m, 0); machines.push(m);
    k.halo(12.85, 1.1, z, 1.0, 0xffd400);
  }
  k.label('NO RONNIES BEYOND THIS POINT (HE WILL EAT THE CHIPS)', 2.2, 0.4, [7.2, 2.4, 3.09], [0, 0, 0], { bg: '#111', fg: '#ffd400', border: '#ffd400', size: 40 });

  // ================================================================ kitchen
  clad(-13.4, -10.9, -7.1, -10.88, KTILE, 1.8, 0.6); clad(-13.4, -10.9, -13.38, -2.1, KTILE, 1.8, 0.6);
  clad(-12.9, -2.1, -7.1, -2.12, KTILE, 1.8, 0.6); clad(-7.12, -10.9, -7.1, -4.6, KTILE, 1.8, 0.6);
  // steel worktops along the back wall: range with hobs + extractor hood, sink, deep fryer
  R(-13.4, -10.9, -7.3, -10.2, 0.92, 0.46, STEEL, { collide: true, block: true });
  R(-13.4, -10.9, -7.3, -10.2, 0.03, 0.935, 0xd0d4da);
  for (const x of [-12.3, -11.6]) for (const z of [-10.7, -10.4]) k.cyl(0.12, 0.12, 0.02, x, 0.95, z, 0x222222, 12);        // hob rings
  R(-12.9, -10.9, -11.0, -10.3, 0.5, 2.2, DSTEEL); R(-12.8, -10.9, -11.1, -10.6, 0.6, 2.75, DSTEEL);                     // extractor hood
  R(-10.3, -10.85, -9.5, -10.3, 0.05, 0.94, 0x9aa0a8); R(-10.1, -10.8, -9.7, -10.35, 0.15, 0.86, 0x707880);              // sink
  k.cyl(0.015, 0.015, 0.3, -9.9, 1.08, -10.8, 0xd0d0d0, 6); R(-9.92, -10.8, -9.88, -10.6, 0.03, 1.22, 0xd0d0d0);           // tap
  R(-8.8, -10.9, -7.9, -10.2, 1.0, 0.5, DSTEEL, { block: true }); R(-8.7, -10.8, -8.0, -10.3, 0.04, 1.0, 0xe0b040);        // deep fryer + oil
  // west wall: more worktop, shelves of pots above, two tall fridges at the end
  R(-13.4, -10.2, -12.7, -5.0, 0.92, 0.46, STEEL, { collide: true, block: true });
  for (const y of [1.5, 2.0]) R(-13.4, -10.0, -13.05, -5.2, 0.03, y, DSTEEL);
  for (let z = -9.6; z < -5.4; z += 0.6) { k.cyl(0.12, 0.1, 0.2, -13.2, 1.62, z, 0x9aa0a8, 10); k.cyl(0.09, 0.09, 0.14, -13.2, 2.1, z + 0.3, 0xb0402a, 10); }
  for (const z of [-4.6, -3.2]) { R(-13.4, z - 0.65, -12.6, z + 0.65, 2.1, 1.05, 0xd8dce2, { collide: true, block: true }); R(-12.62, z - 0.6, -12.58, z + 0.6, 0.04, 1.6, 0x888888); }
  k.label('RONNIE\'S SHELF (EMPTY)', 0.9, 0.3, [-12.57, 1.95, -3.9], [0, Math.PI / 2, 0], { bg: '#fff', fg: '#c0392b', border: null, size: 40 });
  // prep island in the middle with heat lamps over the pass
  R(-11.3, -7.4, -9.1, -5.9, 0.92, 0.46, STEEL, { collide: true, block: true });
  R(-11.3, -7.4, -9.1, -5.9, 0.03, 0.935, 0xd0d4da);
  for (const x of [-10.8, -10.2, -9.6]) { k.cyl(0.006, 0.006, 0.8, x, H - 0.4, -6.65, 0x222222, 4); R(x - 0.2, -6.8, x + 0.2, -6.5, 0.08, H - 0.85, 0x333333); k.lamp(x, H - 0.9, -6.65, 0xff6a20, 0.06); }
  for (const x of [-11.0, -10.2, -9.4]) k.spawns.push(new THREE.Vector3(x, 1.02, -6.65));
  for (const x of [-12.6, -10.6, -7.8]) k.spawns.push(new THREE.Vector3(x, 1.02, -10.55));
  k.spawns.push(new THREE.Vector3(-13.05, 1.02, -8.5), new THREE.Vector3(-13.05, 1.02, -6.2));
  // the clutter that makes it a working kitchen
  R(-10.9, -7.2, -10.3, -6.8, 0.03, 0.95, 0xc89a5a); R(-9.8, -6.5, -9.3, -6.1, 0.03, 0.95, 0xc89a5a);               // chopping boards
  R(-9.5, -7.3, -9.35, -7.15, 0.18, 1.02, 0x2a1a10); for (const dx of [0, 0.04, 0.08]) R(-9.49 + dx, -7.26, -9.47 + dx, -7.2, 0.12, 1.16, 0x222222);   // knife block
  for (const [x, z] of [[-11.1, -6.1], [-10.95, -6.1]]) for (let i = 0; i < 6; i++) k.cyl(0.11, 0.1, 0.012, x, 0.96 + i * 0.014, z, 0xffffff, 14);          // plate stacks
  for (const [x, z, c] of [[-12.3, -10.55, 0x9aa0a8], [-11.6, -10.55, 0x9aa0a8]]) { k.cyl(0.13, 0.13, 0.2, x, 1.06, z, c, 14); R(x + 0.12, z - 0.02, x + 0.3, z + 0.02, 0.025, 1.1, 0xc62828); }   // pots on the hob
  R(-13.35, -9.2, -12.85, -8.6, 0.32, 1.1, 0x37474f); R(-12.86, -9.15, -12.84, -8.75, 0.24, 1.1, 0x111111); R(-12.86, -8.72, -12.84, -8.64, 0.2, 1.1, 0x4caf50);   // microwave
  R(-13.35, -7.4, -12.95, -7.0, 0.35, 1.1, 0xc62828); k.cyl(0.08, 0.06, 0.16, -13.15, 1.36, -7.2, 0xd0d0d0, 10);   // mixer
  R(-9.3, -10.9, -8.9, -10.2, 0.85, 0.43, 0x5a6470); R(-9.25, -10.2, -8.95, -10.18, 0.04, 0.8, 0x4caf50);          // dishwasher with its light
  for (const [x0, z0, x1, z1] of [[-12.6, -10.1, -7.6, -9.4], [-12.6, -9.8, -11.9, -5.2], [-11.3, -5.7, -9.1, -5.1]]) R(x0, z0, x1, z1, 0.01, 0.008, 0x1a1a1a);   // rubber mats
  R(-7.45, -6.0, -7.25, -5.8, 0.5, 0.25, 0xd32f2f); k.label('FIRE', 0.15, 0.08, [-7.24, 0.38, -5.9], [0, Math.PI / 2, 0], { bg: '#d32f2f', fg: '#fff', border: null, size: 60 });   // extinguisher
  k.label('clock', 0.35, 0.35, [-10.2, 2.65, -10.87], [0, 0, 0], { tex: clockTex() });
  k.box(0.32, 0.6, 0.02, -8.2, 0.3, -5.0, 0xffd400, { rot: [0.25, 0.6, 0] }); k.label('WET FLOOR (GRAVY)', 0.28, 0.2, [-8.17, 0.34, -4.96], [0, 0.6, 0], { bg: '#ffd400', fg: '#111', border: null, size: 40 });
  // hanging pan rack, order rail, bin
  R(-11.3, -6.7, -9.1, -6.6, 0.04, 2.35, 0x222222);
  R(-7.3, -9.8, -7.12, -7.0, 0.04, 1.6, DSTEEL);
  for (let z = -9.6; z < -7.1; z += 0.35) R(-7.16, z - 0.07, -7.13, z + 0.07, 0.18, 1.48, 0xffffff);
  k.cyl(0.22, 0.2, 0.7, -7.6, 0.35, -2.5, 0x2e7d32, 12, { block: true });
  k.label('PIE OF THE DAY: GONE (RONNIE)', 1.2, 0.6, [-10.2, 2.2, -10.87], [0, 0, 0], { bg: '#222', fg: '#fff', border: '#ffd400', size: 50 });
  k.label('KITCHEN — STAFF ONLY (ESPECIALLY NOT RONNIE)', 1.1, 0.3, [-6.9, 2.45, -3.75], [0, Math.PI / 2, 0], { bg: '#fff', fg: '#c0392b', border: '#c0392b', size: 40 });

  // ================================================================ toilets
  // white wall tiles to 2m, cubicles with doors, sinks with a mirror, hand dryers
  const cubicles = (x0, n, w, zBack, zFront, flip) => {
    for (let i = 0; i <= n; i++) R(x0 + i * w - 0.02, zBack, x0 + i * w + 0.02, zFront, 1.9, 1.1, 0xcfd8dc);           // partitions, gap at the bottom
    for (let i = 0; i < n; i++) {
      const cx = x0 + (i + 0.5) * w;
      R(x0 + i * w + 0.02, zFront - 0.02, x0 + i * w + 0.12, zFront + 0.02, 1.9, 1.1, 0xcfd8dc);
      R(x0 + (i + 1) * w - 0.12, zFront - 0.02, x0 + (i + 1) * w - 0.02, zFront + 0.02, 1.9, 1.1, 0xcfd8dc);
      // the door, swung open into the cubicle
      const dw = w - 0.24, hx = x0 + i * w + 0.12, ang = flip ? -1.1 : 1.1;
      k.box(dw, 1.7, 0.03, hx + Math.cos(ang) * dw / 2, 1.05, zFront - Math.sin(Math.abs(ang)) * dw / 2, 0xb0bec5, { rot: [0, ang, 0] });
      toilet(cx, zBack, 1);
    }
    R(x0, zBack, x0 + n * w, zFront, 0.05, 2.05, 0xcfd8dc);   // top rail
  };
  const toilet = (x, zWall, dir) => {
    R(x - 0.2, zWall + 0.02, x + 0.2, zWall + 0.2, 0.42, 0.72, PORCELAIN);                       // cistern
    const zb = zWall + 0.47 * dir;
    k.parts.push(part(new THREE.CylinderGeometry(0.17, 0.13, 0.38, 14), PORCELAIN, [x, 0.19, zb], [0, 0, 0], [1, 1, 1.25]));       // bowl
    k.blockers.push({ x0: x - 0.2, x1: x + 0.2, z0: Math.min(zWall, zb + 0.25 * dir), z1: Math.max(zWall, zb + 0.25 * dir), y1: 0.45 });
    k.parts.push(part(new THREE.CircleGeometry(0.13, 14), 0x8fd3f0, [x, 0.33, zb], [-Math.PI / 2, 0, 0], [1, 1.25, 1]));           // water
    k.parts.push(part(new THREE.TorusGeometry(0.15, 0.025, 6, 16), 0xffffff, [x, 0.4, zb], [Math.PI / 2, 0, 0], [1, 1.25, 1]));    // seat
    R(x - 0.17, zWall + 0.2 * dir - 0.015, x + 0.17, zWall + 0.2 * dir + 0.015, 0.42, 0.62, 0xf0f0f0);                              // lid, up
    R(x - 0.03, zWall + 0.05, x + 0.03, zWall + 0.1, 0.03, 0.96, 0xc0c0c0);                       // flush
  };
  const sinks = (xWall, z0, z1, dir) => {
    const x = xWall + dir * 0.28;
    R(xWall, z0, xWall + dir * 0.55, z1, 0.08, 0.86, 0x37474f, { collide: true });
    R(xWall, z0, xWall + dir * 0.55, z1, 0.82, 0.41, 0x455a64, { block: true });
    for (let z = z0 + 0.35; z < z1 - 0.2; z += 0.7) { k.cyl(0.2, 0.15, 0.1, x, 0.86, z, PORCELAIN, 14); k.cyl(0.012, 0.012, 0.2, xWall + dir * 0.08, 0.98, z, 0xd0d0d0, 6); }
    k.label('mirror', z1 - z0 - 0.1, 0.9, [xWall + dir * 0.03, 1.55, (z0 + z1) / 2], [0, dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0], { tex: mirrorTex(), glow: true });
  };
  const dryer = (x, z, ry) => { k.box(0.28, 0.32, 0.18, x, 1.25, z, 0xeceff1, { rot: [0, ry, 0] }); };
  // ...and someone didn't flush (first cubicle in the Gents). Don't eat it, Ronnie.
  const poopAt = new THREE.Vector3(-6.42, 0.4, -10.92 + 0.47);
  k.colliders.push({ min: new THREE.Vector3(poopAt.x - 0.12, 0, poopAt.z - 0.14), max: new THREE.Vector3(poopAt.x + 0.12, 0.31, poopAt.z + 0.14) });
  k.label("SOMEONE DIDN'T FLUSH", 0.5, 0.15, [-6.42, 1.4, -10.9], [0, 0, 0], { bg: '#fff', fg: '#5a3418', border: '#5a3418', size: 40 });
  // Gents (x -7..-3)
  clad(-6.9, -10.9, -3.1, -10.88, WTILE, 2.0, 0.5); clad(-6.92, -10.9, -6.9, -6.6, WTILE, 2.0, 0.5); clad(-3.1, -10.9, -3.08, -6.6, WTILE, 2.0, 0.5); clad(-6.9, -6.6, -5.8, -6.58, WTILE, 2.0, 0.5); clad(-4.4, -6.6, -3.1, -6.58, WTILE, 2.0, 0.5);
  cubicles(-6.92, 2, 1.0, -10.92, -9.4, false);
  for (const x of [-4.4, -3.65]) { R(x - 0.2, -10.92, x + 0.2, -10.6, 0.7, 0.85, PORCELAIN, { block: true }); R(x - 0.15, -10.62, x + 0.15, -10.55, 0.05, 0.55, 0xd0e8ff); }   // urinals
  R(-4.04, -10.92, -4.0, -10.4, 0.8, 1.0, 0xcfd8dc);
  sinks(-6.92, -8.9, -7.2, 1);
  dryer(-3.17, -7.6, -Math.PI / 2);
  k.label('GENTS', 0.7, 0.25, [-5.1, 2.4, -6.41], [0, 0, 0], { bg: '#1f4fbf', fg: '#fff', border: null, size: 90 });
  k.label('NOW WASH YOUR HANDS (RONNIE: THAT INCLUDES THE GRAVY)', 0.8, 0.4, [-3.1, 1.6, -8.4], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', border: '#1f4fbf', size: 36 });
  // Ladies (x -3..1)
  clad(-2.9, -10.9, 0.9, -10.88, GTILE, 2.0, 0.5); clad(-2.92, -10.9, -2.9, -6.6, GTILE, 2.0, 0.5); clad(0.9, -10.9, 0.92, -6.6, GTILE, 2.0, 0.5); clad(-2.9, -6.6, -1.6, -6.58, GTILE, 2.0, 0.5); clad(-0.2, -6.6, 0.9, -6.58, GTILE, 2.0, 0.5);
  cubicles(-2.92, 3, 1.0, -10.92, -9.4, true);
  sinks(0.92, -9.0, -7.2, -1);
  dryer(-2.85, -7.6, Math.PI / 2);
  k.label('LADIES', 0.7, 0.25, [-0.9, 2.4, -6.41], [0, 0, 0], { bg: '#c2185b', fg: '#fff', border: null, size: 90 });
  k.label("CHLOE'S MIRROR SELFIE SPOT", 0.9, 0.25, [0.88, 2.15, -8.1], [0, -Math.PI / 2, 0], { bg: '#fce4ec', fg: '#c2185b', border: null, size: 40 });
  k.lamp(-5, H - 0.01, -8.7, 0xffffff, 0.12); k.lamp(-1, H - 0.01, -8.7, 0xffffff, 0.12);

  // ================================================================ lobby
  R(1.9, -10.95, 4.1, -10.88, 2.3, 1.15, 0x3a2416);               // front doors
  R(2.98, -10.9, 3.02, -10.85, 2.3, 1.15, 0x1a1a1a);
  R(2.1, -10.88, 2.9, -10.84, 1.4, 1.35, 0x9ec9e0); R(3.1, -10.88, 3.9, -10.84, 1.4, 1.35, 0x9ec9e0);
  R(2.0, -10.8, 4.0, -9.8, 0.01, 0.006, 0x3a3a3a);                // doormat
  k.label('EXIT', 0.4, 0.18, [3, 2.55, -10.86], [0, 0, 0], { bg: '#1b8a3a', fg: '#fff', border: null, size: 90, glow: true });
  for (let x = 1.4; x < 4.8; x += 0.5) { k.box(0.04, 0.04, 0.1, x, 1.7, -6.68, 0x3a2416); }   // coat hooks
  k.label('WELCOME TO THE OYSTERFLEET — PLEASE KEEP RONNIE AWAY FROM THE BAR SNACKS', 2.2, 0.5, [1.12, 1.8, -8.8], [0, Math.PI / 2, 0], { bg: '#1b3a2a', fg: '#d4af37', border: '#d4af37', size: 40 });

  // ================================================================ the jokes (design doc 84.5)
  const signs = [
    ['STAFF OF THE MONTH: RONNIE (ATE THE CERTIFICATE)', 0.9, 0.7, [-13.36, 1.6, 0.5], [0, Math.PI / 2, 0], {}],
    ['PLEASE DO NOT FEED THE BARMAN', 1.2, 0.45, [12.99, 0.75, -8.0], [0, -Math.PI / 2, 0], { bg: '#fff8e7', fg: '#111' }],
    ["TODAY'S SPECIALS: WHATEVER RONNIE HASN'T EATEN", 1.0, 1.2, [-13.36, 1.5, 7.5], [0, Math.PI / 2, 0], { bg: '#1b2a1b', fg: '#f5f0e6', border: '#8a6a3a', size: 56 }],
    ['MAX OCCUPANCY: 120 (OR 3 RONNIES)', 1.1, 0.45, [4.0, 1.9, -6.4], [0, 0, 0], {}],
    ["STAFF FOOD ALLOWANCE: ONE (1) BAG OF CRISPS. RONNIE THIS MEANS YOU. — THE GAFFER", 1.3, 0.7, [12.99, 0.75, -2.5], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111' }],
    ['QUIZ NIGHT — Q1: How many pies did Ronnie eat last night? A: Yes.', 1.2, 0.8, [-13.36, 1.5, 10.0], [0, Math.PI / 2, 0], { bg: '#1b2a1b', fg: '#fff', border: '#8a6a3a', size: 48 }],
    ['CAUTION: RONNIE SWEAT', 0.5, 0.6, [5.5, 0.33, 2.2], [0, -Math.PI / 4, 0], { bg: '#ffd400', fg: '#111', border: '#111', size: 60 }],
    ["TIP JAR: RONNIE'S PASTY FUND", 0.4, 0.2, [7.44, 1.25, -3.3], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', size: 40 }],
    ['WE DO NOT SERVE SALAD ("YES YOU DO" — Chloe)', 1.0, 0.5, [-10.2, 1.9, 10.86], [0, Math.PI, 0], { bg: '#fff', fg: '#c0392b' }],
    ['Times Ronnie got stuck behind the bar: IIII IIII II', 1.0, 0.5, [12.99, 0.75, 0.0], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', border: '#111' }],
    ['OYSTERFLEET PIE-EATING CHAMPION — RONNIE (UNDEFEATED, UNCHALLENGED, UNWELL)', 1.2, 0.6, [-12.79, 1.55, 4.3], [0, Math.PI / 2, 0], { bg: '#d4af37', fg: '#111', border: '#7a5a10', size: 48 }],
    ['LAST ORDERS — Ronnie: last orders means for the CUSTOMERS', 0.8, 0.4, [-1.0, 1.9, 10.86], [0, Math.PI, 0], { bg: '#fff06a', fg: '#111', border: null, size: 40 }],
  ];
  // ...and plenty more
  signs.push(
    ['EMPLOYEE OF THE YEAR: RONNIE (HE ATE THE OTHER CANDIDATES\' LUNCHES)', 1.2, 0.6, [-13.36, 1.6, 2.6], [0, Math.PI / 2, 0], { bg: '#fffdf2', fg: '#111', border: '#d4af37', size: 40 }],
    ['BARRED: RONNIE (FROM THE KITCHEN) (FROM THE CELLAR) (FROM THE CRISP CLIP)', 1.3, 0.6, [-6.9, 1.6, -5.0], [0, Math.PI / 2, 0], { bg: '#fff', fg: '#c62828', border: '#c62828', size: 38 }],
    ['PUB QUIZ TEAM NAMES: "RONNIE\'S CHINS", "QUIZ IN MY POCKET", "RONNIE ATE THE ANSWERS"', 1.3, 0.7, [-13.36, 1.5, 8.6], [0, Math.PI / 2, 0], { bg: '#1b2a1b', fg: '#fff', border: '#8a6a3a', size: 36 }],
    ['HAPPY HOUR 5–7PM. RONNIE\'S HAPPY HOUR: 11AM–CLOSING', 1.2, 0.4, [12.99, 0.75, -5.6], [0, -Math.PI / 2, 0], { bg: '#ffd400', fg: '#111', border: null, size: 40 }],
    ['FAMILY SIZE BAG OF CRISPS: SERVES 6 / SERVES RONNIE ONCE', 1.0, 0.4, [12.99, 2.1, -9.2], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', border: '#c0392b', size: 36 }],
    ['THIS TABLE IS RESERVED FOR RONNIE\'S PLATE OVERFLOW', 0.8, 0.25, [-11.5, 0.93, 9.06], [-Math.PI / 2, 0, 0], { bg: '#fffdf2', fg: '#7a1f2a', border: null, size: 36 }],
    ['CHELSEA ON THE BIG SCREEN SUNDAY. RONNIE ON THE BIG SCREEN EVERY DAY (CCTV).', 1.4, 0.4, [-12.75, 3.0 - 0.25, 2.8], [0, Math.PI / 2, 0], { bg: '#034694', fg: '#fff', border: '#fff', size: 36 }],
    ['CARVERY SUNDAYS — RONNIE SIZE PORTION: THE WHOLE CARVERY', 1.3, 0.45, [-4.0, 1.9, 10.86], [0, Math.PI, 0], { bg: '#5a2a14', fg: '#ffd400', border: '#ffd400', size: 40 }],
    ['IN CASE OF EMERGENCY: BREAK GLASS. IN CASE OF RONNIE: HIDE THE PIES.', 0.8, 0.4, [6.07, 1.7, 5.8], [0, Math.PI / 2, 0], { bg: '#c62828', fg: '#fff', border: '#fff', size: 34 }],
    ['DOG WATER BOWL — NOT FOR RONNIE. WE CHECKED. TWICE.', 0.7, 0.2, [5.6, 0.12, -1.6], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', border: '#1f4fbf', size: 34 }],
    ['LAST PERSON TO TRY RONNIE\'S PIE CHALLENGE: RONNIE. HE WON. HE ALSO LOST.', 1.2, 0.45, [9.8, 1.5, 3.09], [0, Math.PI, 0], { bg: '#fffdf2', fg: '#111', border: '#c0392b', size: 36 }],
    ['FRUIT MACHINE PAYOUT: CHIPS. RONNIE HAS WON 900 TIMES. THE MACHINE IS EMPTY.', 1.0, 0.45, [12.93, 1.9, 8.8], [0, -Math.PI / 2, 0], { bg: '#1a1a3a', fg: '#ffd400', border: '#ffd400', size: 34 }],
    ['TOILET ATTENDANT: NONE. RONNIE, PLEASE STOP OFFERING.', 0.9, 0.3, [-3.16, 2.2, -9.6], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', border: '#1f4fbf', size: 34 }],
    ['CHEF\'S SPECIAL: WHATEVER RONNIE DROPPED ON THE WAY OUT', 1.2, 0.4, [-12.57, 2.45, -7.0], [0, Math.PI / 2, 0], { bg: '#222', fg: '#fff', border: '#ffd400', size: 38 }],
  );
  for (const [t, w, h, pos, rot, o] of signs) k.label(t, w, h, pos, rot, o);

  // ================================================================ lighting & finishing touches
  // real warm lights: over the bar, the fire (flickering), the middle of the room, the poker table
  k.light(7.6, 2.3, -4.5, 0xffb060, 7, 9);
  k.light(-12.3, 0.8, 4.3, 0xff7a2a, 6, 6, 1);
  k.light(-4.5, 2.4, 4.3, 0xffc884, 5, 10);
  k.light(9.8, 2.2, 6.2, 0xffe0a0, 4, 6);
  // pools of light: under the chandeliers, on every table, along the bar top, by the fire
  for (const [x, z] of [[-8.9, 2.6], [-2.1, 2.6], [-8.9, 6.0], [-2.1, 6.0], [-2.1, -0.8]]) k.pool(x, 0, z, 3.2, 0xffc070);
  for (const z of [2.6, 6.0]) for (const x of [-10.6, -7.2, -3.8, -0.4]) k.pool(x, 0.76, z, 1.3, 0xffd090);
  for (const x of [-3.8, -0.4]) k.pool(x, 0.76, -0.8, 1.3, 0xffd090);
  for (const x of [-11.5, -8.5, -5.5, -2.5, 0.5]) k.pool(x, 0.76, 9.4, 1.2, 0xffd090);
  for (const [x, z] of [[2.6, 0.8], [2.6, 4.3], [2.6, 7.8], [-3.2, -4.3], [1.6, -4.3]]) k.pool(x, 1.08, z, 0.9, 0xffd090);
  for (const z of [-8.5, -6.5, -4.5, -2.5, -0.5]) { k.pool(7.85, 1.14, z, 1.0, 0xffb050); k.pool(6.6, 0, z, 1.6, 0xffa040); }
  k.pool(-12.2, 0, 4.3, 3.0, 0xff6a20); k.pool(9.8, 0.81, 6.2, 1.8, 0xfff0c0); k.pool(9.8, 0, 6.2, 3.4, 0xffd090);
  for (const [x, z] of [[-5.5, 4.3], [-2.1, 0.85]]) k.pool(x, 0, z, 2.2, 0xffe0b0);
  // glowing fire and candles on the tables
  k.halo(-12.7, 0.45, 4.3, 1.2, 0xff6a10);
  for (const z of [2.6, 6.0]) for (const x of [-10.6, -7.2, -3.8, -0.4]) { k.cyl(0.025, 0.025, 0.1, x + 0.3, 0.83, z, 0xf5f0dc, 8); k.lamp(x + 0.3, 0.9, z, 0xffb050, 0.018); }
  // street-view windows above the booths, with burgundy curtains
  for (const [i, x] of [-11.5, -8.5, -5.5, -2.5, 0.5].entries()) k.window(x, 1.78, 10.86, 1.25, 0.95, Math.PI, streetViewTex(i), { frame: 0x3a2416, bars: 2, curtains: 0x7a1f2a });
  // dark oak beams across the main room ceiling
  for (let x = -12.5; x <= 4.5; x += 2.5) k.box(0.18, 0.2, 13.0, x, H - 0.1, 4.5, 0x3a2416);
  for (const z of [-0.5, 4.3, 9.0]) k.box(18.0, 0.16, 0.16, -4.25, H - 0.12, z, 0x3a2416);
  // skirting and a dado rail on the plain walls of the front bit and the gambling room
  for (const [x0, x1] of [[-7, -5.8], [-4.4, -1.6], [-0.2, 1]]) k.box(x1 - x0, 0.14, 0.04, (x0 + x1) / 2, 0.07, -6.4, 0x3a2416);
  for (const [z0, z1] of [[3, 8.8], [10.3, 11]]) { k.box(0.04, 0.14, z1 - z0, 5.9, 0.07, (z0 + z1) / 2, 0x3a2416); k.box(0.04, 0.14, z1 - z0, 6.1, 0.07, (z0 + z1) / 2, 0x1a1a3a); }

  const room = k.finish({
    name: 'The Oysterfleet',
    sky: 0xffe2c0, ground: 0x6a4a3a, hemiI: 1.55, sun: 0xfff0d8, sunI: 0.45, sunPos: [-6, 10, 5], ambient: 0.32,
    start: { x: 4.2, z: 2.0, yaw: Math.PI * 0.75 },
    board: { x: 3.6, y: 1.38, z: 10.86, ry: Math.PI },
    startFood: ['can', 'burger', 'pizza', 'doughnut', 'can', 'burger', 'pizza', 'doughnut', 'burger', 'pizza', 'can', 'doughnut', 'burger', 'pizza', 'doughnut', 'can', 'burger', 'pizza'],
    spotCount: 36,
  });
  room.extraItems = [{ type: 'poop', pos: poopAt }];
  // fruit machines: spin for 1.8s, line up three of the same, and pay out
  room.machines = machines;
  const baseUpdate = room.update.bind(room);
  room.update = (dt) => {
    baseUpdate(dt);
    for (const m of machines) {
      if (m.cool > 0) m.cool -= dt;
      if (m.t < 0) continue;
      m.t += dt; drawMachine(m, m.t);
      if (m.t >= 2.0) { m.t = -1; m.cool = 1.5; drawMachine(m, 9, true); room.onPayout && room.onPayout(m); }
    }
  };
  return room;
}

// soft cones of light above and below a pillar wall light
const GLOW = { mat: null, geo: null };
function sconceGlow(kit, x, y, z, cx, cz) {
  GLOW.kit = kit; GLOW.cx = cx; GLOW.cz = cz;
  if (!GLOW.mat) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,240,210,0.9)'); gr.addColorStop(1, 'rgba(255,240,210,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(26, 0); g.lineTo(38, 0); g.lineTo(64, 128); g.lineTo(0, 128); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    GLOW.mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55, side: THREE.DoubleSide });
    GLOW.geo = new THREE.PlaneGeometry(0.4, 0.55);
  }
  // a pair of soft cones (up and down) facing out from the pillar, batched by the kit
  const out = Math.atan2(x - GLOW.cx, z - GLOW.cz);
  for (const dir of [1, -1]) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y + dir * 0.3, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, out, dir > 0 ? Math.PI : 0, 'YXZ')), new THREE.Vector3(1, 1, 1));
    GLOW.kit.instance(GLOW.geo, GLOW.mat, m);
  }
}

// ---- textures ----
function bottleTex() {
  return canvasTex(1024, 256, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#5a3010'); bg.addColorStop(1, '#2a1408');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    for (const sy of [118, 248]) { g.fillStyle = '#c8a060'; g.fillRect(0, sy, w, 6); }
    const cols = ['#2e7d32', '#c0392b', '#d4a017', '#6d4c41', '#1565c0', '#eeeeee', '#8e24aa', '#ff8f00'];
    for (const base of [118, 248]) for (let x = 8; x < w - 20; x += 24 + (x * 7) % 9) {
      const c = cols[(x / 24 | 0) % cols.length], bh = 60 + (x * 13) % 40;
      g.fillStyle = c; g.globalAlpha = 0.85; g.fillRect(x, base - bh, 18, bh); g.fillRect(x + 6, base - bh - 18, 6, 18); g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 3, base - bh + 4, 3, bh - 8);
    }
  });
}
function crispsTex() {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#3a2414'; g.fillRect(0, 0, w, h);
    const cols = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa'];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) { g.fillStyle = cols[(i + r) % 5]; g.fillRect(14 + i * 55, 20 + r * 120, 44, 95); g.fillStyle = '#fff'; g.font = 'bold 12px Arial'; g.fillText('CRISPS', 18 + i * 55, 70 + r * 120); }
    g.fillStyle = '#ffd400'; g.font = `900 22px ${FONT}`; g.fillText("ONE CLIP LEFT: RONNIE'S", 120, 248);
  });
}
function tvTex() {
  return canvasTex(512, 288, (g, w, h) => {
    g.fillStyle = '#2e8b3a'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) { g.fillStyle = (x / 64) % 2 ? '#2a7f35' : '#319541'; g.fillRect(x, 0, 64, h); }
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(20, 30, w - 40, h - 50); g.beginPath(); g.moveTo(w / 2, 30); g.lineTo(w / 2, h - 20); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2 + 5, 36, 0, 7); g.stroke();
    for (let i = 0; i < 10; i++) { g.fillStyle = i < 5 ? '#1f4fbf' : '#c0392b'; g.beginPath(); g.arc(60 + (i * 47) % 400, 80 + (i * 61) % 160, 7, 0, 7); g.fill(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(300, 150, 5, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(0, 0, w, 30);
    g.fillStyle = '#fff'; g.font = 'bold 18px Arial'; g.fillText("KINGS ROAD FC 2 – 1 SELHURST EAGLES   67'", 12, 21);
    g.fillStyle = 'rgba(200,16,46,0.9)'; g.fillRect(0, h - 26, w, 26); g.fillStyle = '#fff'; g.font = 'bold 15px Arial'; g.fillText('BREAKING: LOCAL BARMAN EATS ENTIRE PUB', 10, h - 8);
  });
}
const MACHINE_SYMS = [{ s: '🍔', food: 'burger' }, { s: '🍕', food: 'pizza' }, { s: '🍩', food: 'doughnut' }, { s: '🌭', food: 'hotdog' }, { s: '🍟', food: 'fries' }];
const ALL_SYMS = ['🍔', '🍕', '🍩', '🌭', '🍟', '🥦', '🍒'];
// redraw a machine's screen: reels scroll while spinning and stop one by one on the winning symbol
function drawMachine(m, t, won = false) {
  const g = m.cv.getContext('2d'), w = 256, h = 320;
  g.fillStyle = '#1a1a3a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 10; i++) { g.fillStyle = (Math.floor(t * 8) + i) % 2 && t > 0 ? '#ffd400' : '#ff1744'; g.beginPath(); g.arc(14 + i * 25, 8, 5, 0, 7); g.fill(); }
  g.fillStyle = '#ffd400'; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; g.fillText('THE CHIP', w / 2, 44); g.fillText('MACHINE', w / 2, 76);
  for (let i = 0; i < 3; i++) {
    const x = 18 + i * 76; g.fillStyle = '#fff'; g.fillRect(x, 100, 68, 100);
    g.save(); g.beginPath(); g.rect(x, 100, 68, 100); g.clip();
    const stopAt = 0.9 + i * 0.45, spinning = t > 0 && t < stopAt;
    g.font = '46px sans-serif'; g.textBaseline = 'middle';
    if (spinning) { const off = (t * 900) % 60; for (let k = -1; k < 3; k++) g.fillText(ALL_SYMS[(Math.floor(t * 15) + k + i * 2) % ALL_SYMS.length], x + 34, 120 + k * 60 + off); }
    else g.fillText(t > 0 && m.win ? m.win.s : ['🍟', '🍔', '🍕'][i], x + 34, 152);
    g.restore();
  }
  g.textBaseline = 'alphabetic';
  g.fillStyle = won ? '#00c853' : '#ff1744'; g.fillRect(30, 222, w - 60, 44);
  g.fillStyle = '#fff'; g.font = `900 22px ${FONT}`; g.fillText(won ? 'JACKPOT! FOOD!' : t > 0 ? 'SPINNING...' : 'TOUCH TO PLAY', w / 2, 252);
  g.font = `700 16px ${FONT}`; g.fillStyle = '#9aa'; g.fillText('PAYS OUT IN FOOD ONLY', w / 2, 296);
  m.tex.needsUpdate = true;
}
function pubSignTex() {
  return canvasTex(1024, 224, (g, w, h) => {
    g.fillStyle = '#1b3a2a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d4af37'; g.lineWidth = 12; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#d4af37'; g.font = `900 110px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('THE OYSTERFLEET', w / 2, h / 2 + 6);
  });
}
function fireTex() {
  return canvasTex(256, 128, (g, w, h) => {
    for (let i = 0; i < 30; i++) { const x = 20 + Math.random() * (w - 40), r = 10 + Math.random() * 26; const gr = g.createRadialGradient(x, h, 0, x, h - r, r * 1.6); gr.addColorStop(0, 'rgba(255,240,150,0.9)'); gr.addColorStop(0.5, 'rgba(255,120,20,0.7)'); gr.addColorStop(1, 'rgba(200,30,0,0)'); g.fillStyle = gr; g.fillRect(x - r * 2, 0, r * 4, h); }
  });
}
function dartTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#222'; g.fillRect(0, 0, w, h);
    const rings = ['#111', '#e8d8b0', '#c0392b', '#e8d8b0', '#2e7d32', '#c0392b'];
    rings.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(w / 2, h / 2 - 10, 100 - i * 17, 0, 7); g.fill(); });
    g.fillStyle = '#fff'; g.font = 'bold 22px Arial'; g.textAlign = 'center'; g.fillText('RONNIE 180 (pies)', w / 2, h - 10);
  });
}

function mirrorTex() {
  return canvasTex(256, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#cfe3ea'); gr.addColorStop(0.5, '#eef7fa'); gr.addColorStop(1, '#b7cfd8');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 6; for (const x of [40, 70, 170]) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 50, 0); g.stroke(); }
    g.strokeStyle = '#90a4ae'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
  });
}
function monstorFridgeTex() {
  return canvasTex(256, 288, (g, w, h) => {
    g.fillStyle = '#0b1a10'; g.fillRect(0, 0, w, h);
    for (const y of [70, 140, 210]) { g.fillStyle = '#9aa'; g.fillRect(0, y + 44, w, 4); for (let x = 10; x < w - 16; x += 20) { g.fillStyle = (x / 20 | 0) % 4 === 0 ? '#ff9a1f' : '#111'; g.fillRect(x, y, 14, 44); g.fillStyle = '#39ff14'; g.fillRect(x + 3, y + 6, 8, 4); } }
    g.fillStyle = '#39ff14'; g.font = '900 34px ' + FONT; g.textAlign = 'center'; g.fillText('MONSTOR', w / 2, 46);
    g.fillStyle = 'rgba(57,255,20,0.15)'; g.fillRect(0, 0, w, h);
  });
}
function clockTex() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#111'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fill();
    g.strokeStyle = '#111'; g.lineWidth = 6; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 24); g.stroke(); g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(96, 70); g.stroke();
    g.fillStyle = '#c62828'; g.font = 'bold 16px Arial'; g.textAlign = 'center'; g.fillText('PIE O\'CLOCK', 64, 104);
  });
}
