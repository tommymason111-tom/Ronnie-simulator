// THE OYSTERFLEET: Ronnie's local and workplace, laid out from the floor plan (every room where it's
// labelled, every doorway where the plan has one). The plan is drawn in pixels; P(x, y) turns a point
// on it into metres (x east, z south, 0.024 m per pixel):
//   top:    Men's toilets, Disabled toilet, the little corridor to them, Women's toilets, the Entrance
//           booking area (front doors on its angled corner), the bar's back room
//   middle: the main pub floor: a RAISED seating area top-left (booths along the wall), the DJ booth,
//           a brick pillar with a fruit machine, tables everywhere, booth partitions; the long angled
//           BAR down the right with stools all along it; staff room, a corridor and the back room
//           (beer kegs) behind it
//   left:   the Kitchen and the restaurant's own entrance
//   bottom: the Conservatory (booths and tables, glass roof), a passage out to the beer garden, and
//           the Gambling room full of fruit machines
// Look kept from the old pub: cream tongue-and-groove bulkheads, red-brick pillar with up/down lights,
// dark wood posts and beams, burgundy carpet, honey-oak bar with brass rails and burgundy stools,
// wheelback chairs, iron chandeliers, amber pendants, street-view windows with curtains.
import * as THREE from 'three';
import { part } from '../geo.js';
import { streetViewTex } from './kit.js';
import { Kit, carpetTex, tileTex, canvasTex, FONT, brickTex, booksWallTex, tngTex, oakPanelTex, woodTex } from './kit.js';

const H = 3.0;
const S = 0.024;
const X = (px) => (px - 600) * S, Z = (py) => (py - 975) * S;
const B = { x0: X(15), x1: X(1045), z0: Z(305), z1: Z(1645) };
// the walkable rooms on the plan (pixels); everything else inside the bounds is solid
const INSIDE = [
  [[175, 305], [415, 305], [415, 465], [175, 465]],                                    // men's
  [[215, 465], [355, 465], [355, 605], [215, 605]],                                    // disabled
  [[355, 465], [415, 465], [415, 605], [355, 605]],                                    // corridor to the toilets
  [[415, 345], [615, 345], [615, 605], [415, 605]],                                    // women's
  [[615, 465], [695, 385], [775, 385], [835, 425], [835, 505], [755, 605], [615, 605]], // entrance booking area
  [[195, 605], [855, 605], [855, 1305], [195, 1305]],                                  // pub floor + the bar
  [[835, 925], [895, 925], [895, 1305], [835, 1305]],                                  // corridor behind the bar
  [[855, 690], [1045, 690], [1045, 975], [855, 975]],                                  // staff room
  [[895, 975], [1045, 975], [1045, 1305], [895, 1305]],                                // back room
  [[195, 1305], [795, 1305], [795, 1645], [195, 1645]],                                // conservatory + passage to the garden
  [[795, 1305], [975, 1305], [975, 1620], [795, 1620]],                                // gambling room
  [[25, 605], [195, 605], [195, 1060], [25, 1060]],                                    // kitchen
  [[15, 1060], [195, 1060], [195, 1190], [15, 1190]],                                  // restaurant entrance
].map(poly => poly.map(([x, y]) => [X(x), Z(y)]));
const inPoly = (poly, x, z) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const inside = (x, z) => INSIDE.some(p => inPoly(p, x, z));
// the raised seating area (top left of the pub floor), and the two steps up into it
const RAISE = 0.2;
const RAISED = [[195, 605], [355, 605], [355, 685], [455, 785], [455, 965], [195, 965]].map(([x, y]) => [X(x), Z(y)]);
export function pubFloorAt(x, z) {
  if (inPoly(RAISED, x, z)) return RAISE;
  if (x > X(300) && x < X(370) && z > Z(965) && z < Z(965) + 0.32) return RAISE / 2;    // the step
  return 0;
}

export function buildPub(scene) {
  const k = new Kit(scene, { ...B, y1: H });
  const WALL = 0xeee6d6, PLASTER = 0xf2ecdf, DARKWOOD = 0x3a2416, WOOD = 0x4a2c18, REDLEATHER = 0x7a1f2a, BRASS = 0xc9a24a, CREAM = 0xe8dcc0, LIGHTWOOD = 0xc89a5a;
  const STEEL = 0xb8bcc2, DSTEEL = 0x8a9098, WHITE = 0xf8f8f6, PORCELAIN = 0xfbfbfb;
  const BRICK = brickTex(), BOOKS = booksWallTex(), TNG = tngTex(), OAK = oakPanelTex();
  const WTILE = tileTex('#f6f6f3', '#efefec', '#c9c9c4', 32), GTILE = tileTex('#dfe9ee', '#d4e0e6', '#a9b6bc', 32), KTILE = tileTex('#ffffff', '#f2f2f2', '#c0c0c0', 32);
  const R = (x0, z0, x1, z1, h, y, color, opts) => k.box(Math.abs(x1 - x0), h, Math.abs(z1 - z0), (x0 + x1) / 2, y ?? h / 2, (z0 + z1) / 2, color, opts);
  const T2 = 0.08;
  const blk = (x0, z0, x1, z1, y1 = H) => k.blockers.push({ x0, x1, z0, z1, y1 });
  // straight walls, in plan pixels: along x at y, or along y at x, with door gaps (also pixels) and dark wood door frames
  const lintel = (alongX, c, a0, a1) => {
    if (alongX) { R(a0, c - T2, a1, c + T2, H - 2.2, 2.2 + (H - 2.2) / 2, PLASTER); for (const a of [a0, a1]) R(a - 0.04, c - 0.1, a + 0.04, c + 0.1, 2.2, 1.1, DARKWOOD); R(a0, c - 0.1, a1, c + 0.1, 0.08, 2.24, DARKWOOD); }
    else { R(c - T2, a0, c + T2, a1, H - 2.2, 2.2 + (H - 2.2) / 2, PLASTER); for (const a of [a0, a1]) R(c - 0.1, a - 0.04, c + 0.1, a + 0.04, 2.2, 1.1, DARKWOOD); R(c - 0.1, a0, c + 0.1, a1, 0.08, 2.24, DARKWOOD); }
  };
  const WX = (py, px0, px1, gaps = [], color = PLASTER, h = H) => {      // wall along x
    const z = Z(py); let a = X(px0);
    for (const [g0, g1] of gaps) { if (X(g0) > a) R(a - T2, z - T2, X(g0), z + T2, h, h / 2, color, { collide: true, block: true }); if (h >= H) lintel(true, z, X(g0), X(g1)); a = X(g1); }
    if (X(px1) > a) R(a, z - T2, X(px1) + T2, z + T2, h, h / 2, color, { collide: true, block: true });
  };
  const WZ = (px, py0, py1, gaps = [], color = PLASTER, h = H) => {      // wall along z
    const x = X(px); let a = Z(py0);
    for (const [g0, g1] of gaps) { if (Z(g0) > a) R(x - T2, a - T2, x + T2, Z(g0), h, h / 2, color, { collide: true, block: true }); if (h >= H) lintel(false, x, Z(g0), Z(g1)); a = Z(g1); }
    if (Z(py1) > a) R(x - T2, a, x + T2, Z(py1) + T2, h, h / 2, color, { collide: true, block: true });
  };
  // an angled wall (or half wall), pixels
  const WD = (ax, ay, bx, by, color = PLASTER, h = H, t = 0.16) => {
    const x0 = X(ax), z0 = Z(ay), x1 = X(bx), z1 = Z(by), dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx);
    k.box(L + t, h, t, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, color, { rot: [0, ry, 0] });
    for (let s = 0; s <= L; s += 0.18) { const x = x0 + dx * s / L, z = z0 + dz * s / L; blk(x - 0.1, z - 0.1, x + 0.1, z + 0.1, h); }
    return { x0, z0, x1, z1, L, ry, ux: dx / L, uz: dz / L };
  };
  const clad = (x0, z0, x1, z1, tex, h = H, tile = 1, y0 = 0) => k.texBox(Math.max(Math.abs(x1 - x0), 0.02), h, Math.max(Math.abs(z1 - z0), 0.02), (x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2, tex, { tile });
  // anything built inside raise() sits on the raised floor
  const raise = (fn) => {
    const p0 = k.parts.length, c0 = k.colliders.length, s0 = k.spawns.length, o0 = scene.children.length;
    fn();
    for (let i = p0; i < k.parts.length; i++) k.parts[i].translate(0, RAISE, 0);
    for (let i = c0; i < k.colliders.length; i++) { k.colliders[i].min.y += RAISE; k.colliders[i].max.y += RAISE; }
    for (let i = s0; i < k.spawns.length; i++) k.spawns[i].y += RAISE;
    for (let i = o0; i < scene.children.length; i++) scene.children[i].position.y += RAISE;
  };

  // ================================================================ floors + ceiling
  const carpet = carpetTex('#6a2430', '#4a1620', '#93404a'), tiles = tileTex('#8f8574', '#837a69', '#5e574b', 85);
  k.floor(X(195), Z(605), X(855), Z(1305), carpet, 0.002, 1.2);                          // the pub floor
  k.floor(X(615), Z(385), X(835), Z(605), tiles, 0.003, 1.0);                            // entrance (tiled)
  k.floor(X(695), Z(605), X(855), Z(1245), tiles, 0.004, 1.0);                           // behind the bar
  k.floor(X(855), Z(690), X(1045), Z(975), tileTex('#b8b4aa', '#aca89e', '#8a867c', 48), 0.004, 0.9);   // staff room
  k.floor(X(835), Z(925), X(1045), Z(1305), tileTex('#9a9a96', '#8e8e8a', '#6e6e6a', 64), 0.005, 1.5);  // corridor + back room (concrete)
  k.floor(X(195), Z(1305), X(795), Z(1645), tileTex('#d8c8a8', '#ccbc9c', '#a89878', 72), 0.003, 1.0);  // conservatory (stone tiles)
  k.floor(X(795), Z(1305), X(975), Z(1620), carpetTex('#2a3a5a', '#1a2440', '#c9a24a'), 0.003, 1.2);   // gambling room
  k.floor(X(25), Z(605), X(195), Z(1060), tileTex('#c9c9c4', '#bdbdb7', '#8f8f8a', 48), 0.003, 0.8);   // kitchen
  k.floor(X(15), Z(1060), X(195), Z(1190), tiles, 0.003, 1.0);                          // restaurant entrance
  k.floor(X(175), Z(305), X(415), Z(605), tileTex('#d8d8d8', '#cfcfcf', '#9a9a9a', 40), 0.003, 0.6);   // men's, disabled, corridor
  k.floor(X(415), Z(345), X(615), Z(605), tileTex('#e8dfe4', '#ddd3d8', '#b0a4aa', 40), 0.003, 0.6);   // women's
  k.ceiling(0xf7f3ea, 0xbdb5a2);
  // everything outside the rooms is solid (merged into strips so it stays cheap)
  { const C = 0.3; let prev = null;
    for (let z = B.z0; z < B.z1 - 1e-6; z += C) {
      const runs = []; let s = null;
      for (let x = B.x0; x < B.x1 + C; x += C) { const solid = x < B.x1 && !inside(x + C / 2, z + C / 2); if (solid && s === null) s = x; if (!solid && s !== null) { runs.push([s, x]); s = null; } }
      for (const [a, b] of runs) blk(a, z, Math.min(b, B.x1), Math.min(z + C, B.z1));
    }
  }

  // ================================================================ walls (straight from the plan)
  // men's toilets
  WX(305, 175, 415, [], WALL); WZ(175, 305, 465, [], WALL); WZ(415, 305, 605);
  WX(465, 175, 415, [[365, 410]]);                                   // men's door (into the corridor)
  // disabled toilet
  WZ(215, 465, 605); WZ(355, 465, 605, [[475, 525]]);                // its door off the corridor
  // the top wall of the pub floor: the corridor opening, the women's door
  WX(605, 195, 615, [[362, 410], [430, 472]]);
  // women's
  WX(345, 415, 615, [], WALL); WZ(615, 345, 710);
  // entrance booking area (the front doors are on the angled top-right corner)
  WD(615, 465, 695, 385, WALL); WX(385, 695, 775, [], WALL);
  const door = WD(775, 385, 835, 425, 0x3a2416, H, 0.1);
  WZ(835, 425, 505, [], WALL); WD(835, 505, 755, 605, WALL);
  // the bar: top wall, back wall of the back bar, the corridor behind
  WX(605, 695, 855); WZ(855, 605, 925); WX(925, 835, 855); WZ(835, 925, 1245);
  WD(775, 905, 835, 925, PLASTER);
  // staff room, back room, gambling room
  WX(690, 855, 1045, [], WALL); WZ(1045, 690, 1305, [], WALL); WX(975, 895, 1045); WX(975, 855, 895, [[858, 892]]);
  WZ(895, 975, 1305, [[1235, 1300]]);
  WX(1305, 790, 1045);
  WZ(795, 1305, 1620, [[1335, 1400]]); WZ(975, 1305, 1620, [], WALL); WX(1620, 795, 975, [], WALL);
  // the pub's left wall: kitchen door, restaurant entrance
  WZ(195, 605, 1645, [[990, 1035], [1090, 1145]], WALL);
  // kitchen + restaurant entrance
  WX(605, 25, 195, [], WALL); WZ(25, 605, 1060, [], WALL); WX(1060, 15, 195); WZ(15, 1060, 1190, [], WALL); WX(1190, 15, 195, [], WALL);
  // conservatory + the passage to the beer garden
  WX(1305, 290, 735); WZ(715, 1305, 1645); WX(1645, 195, 715, [], WALL); WX(1645, 715, 795, [[722, 793]], WALL);
  // DJ booth (half walls) and the raised area's edge (half walls with a brass rail on top)
  const HALF = 1.1;
  WZ(475, 605, 665, [], DARKWOOD, HALF); WD(475, 665, 515, 705, DARKWOOD, HALF); WX(705, 515, 535, [], DARKWOOD, HALF);
  WD(355, 685, 455, 785, 0x5a3420, HALF);
  WZ(355, 605, 685, [], 0x5a3420, HALF); WZ(455, 785, 965, [], 0x5a3420, HALF); WX(965, 195, 300, [], 0x5a3420, HALF); WX(965, 370, 455, [], 0x5a3420, HALF);
  for (const [a, b, c, d] of [[355, 605, 355, 685], [355, 685, 455, 785], [455, 785, 455, 965], [195, 965, 300, 965], [370, 965, 455, 965]]) { const x0 = X(a), z0 = Z(b), x1 = X(c), z1 = Z(d), L = Math.hypot(x1 - x0, z1 - z0); k.box(L + 0.1, 0.05, 0.12, (x0 + x1) / 2, HALF + 0.03, (z0 + z1) / 2, BRASS, { rot: [0, Math.atan2(-(z1 - z0), x1 - x0), 0] }); }
  // booth partitions in the main room
  WX(1065, 330, 480, [], 0x5a3420, 1.4); WZ(455, 1165, 1305, [], 0x5a3420, 1.4);
  for (const [x0, z0, x1, z1] of [[X(330), Z(1065), X(480), Z(1065)], [X(455), Z(1165), X(455), Z(1305)]]) k.box(Math.max(x1 - x0, 0.2), 0.06, Math.max(z1 - z0, 0.2), (x0 + x1) / 2, 1.43, (z0 + z1) / 2, DARKWOOD);

  // ================================================================ the raised seating area
  { const sh = new THREE.Shape(RAISED.map(([x, z]) => new THREE.Vector2(x, z)));
    const g = new THREE.ShapeGeometry(sh); g.rotateX(Math.PI / 2);
    const uv = g.attributes.uv, pa = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pa.getX(i) / 1.2, pa.getZ(i) / 1.2);
    const t = woodTex('#6a3c1e'); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide })); m.position.y = RAISE + 0.004; scene.add(m);
    // solid underneath (for food landing on it), the riser along the open front, and the two steps
    for (let x = X(195); x < X(455); x += 0.3) for (let z = Z(605); z < Z(965); z += 0.3) if (inPoly(RAISED, x + 0.15, z + 0.15)) k.colliders.push({ min: new THREE.Vector3(x, 0, z), max: new THREE.Vector3(x + 0.3, RAISE, z + 0.3) });
    R(X(195), Z(965) - 0.04, X(455), Z(965), RAISE, RAISE / 2, DARKWOOD);
    R(X(300), Z(965), X(370), Z(965) + 0.32, RAISE / 2, RAISE / 4, 0x5a3420, { collide: true }); R(X(300), Z(965), X(370), Z(965) + 0.03, 0.02, RAISE / 2, BRASS);
    k.label('MIND THE STEP (RONNIE: THE STEP MINDS YOU)', 0.9, 0.2, [X(335), 1.3, Z(965) + 0.05], [0, 0, 0], { bg: '#ffd400', fg: '#111', border: null, size: 40 });
  }
  let alt = 0;
  const table = (x, z, w = 1.2, d = 0.8, chairs = 1, opts = {}) => { const light = (alt++ % 2) === 0; k.table(x, z, w, d, { chairs, top: WOOD, legs: DARKWOOD, chairColor: light ? LIGHTWOOD : DARKWOOD, seat: light ? null : 0x8a2a2a, spots: 1, ...opts }); };
  const candles = [];
  // a leather booth bench against a wall: along z at x (dir = which way it faces), or along x at z
  const bench = (alongZ, c, a0, a1, dir) => {
    if (alongZ) { R(c, a0, c + dir * 0.48, a1, 0.45, 0.225, DARKWOOD, { block: true }); R(c, a0, c + dir * 0.48, a1, 0.1, 0.5, REDLEATHER); R(c, a0, c + dir * 0.12, a1, 0.95, 0.475, REDLEATHER, { block: true }); for (let a = a0 + 0.5; a < a1; a += 0.5) R(c + dir * 0.12 - 0.01, a - 0.01, c + dir * 0.12 + 0.01, a + 0.01, 0.5, 0.75, 0x5a1520); }
    else { R(a0, c, a1, c + dir * 0.48, 0.45, 0.225, DARKWOOD, { block: true }); R(a0, c, a1, c + dir * 0.48, 0.1, 0.5, REDLEATHER); R(a0, c, a1, c + dir * 0.12, 0.95, 0.475, REDLEATHER, { block: true }); for (let a = a0 + 0.5; a < a1; a += 0.5) R(a - 0.01, c + dir * 0.12 - 0.01, a + 0.01, c + dir * 0.12 + 0.01, 0.5, 0.75, 0x5a1520); }
  };
  // a booth table: table against the bench, chairs on the open side facing in
  const boothTable = (x, z, alongZ, dir) => {
    if (alongZ) { table(x, z, 0.75, 1.1, 0); for (const dz of [-0.28, 0.28]) k.chair(x + dir * 0.7, z + dz, dir > 0 ? Math.PI / 2 : -Math.PI / 2, LIGHTWOOD); }
    else { table(x, z, 1.1, 0.75, 0); for (const dx of [-0.28, 0.28]) k.chair(x + dx, z + dir * 0.7, dir > 0 ? 0 : Math.PI, LIGHTWOOD); }
    candles.push([x, z]);
  };
  const freeTable = (x, z, alongZ = false) => { if (alongZ) table(x, z, 0.8, 1.2, 2); else table(x, z, 1.2, 0.8, 2); candles.push([x, z]); };
  raise(() => {
    bench(true, X(195) + 0.08, Z(690), Z(945), 1);                                       // "Table with booth" along the wall
    for (const py of [745, 845, 930]) boothTable(X(195) + 0.95, Z(py), true, 1);
    freeTable(X(300), Z(660));
    freeTable(X(340), Z(752), true);
    freeTable(X(405), Z(818)); freeTable(X(405), Z(905));
  });
  // ================================================================ the main pub floor
  freeTable(X(515), Z(925), true); freeTable(X(605), Z(908));
  freeTable(X(420), Z(1028)); freeTable(X(348), Z(1120), true); freeTable(X(573), Z(1090)); freeTable(X(636), Z(1190));
  freeTable(X(370), Z(1250));
  bench(true, X(455) + 0.08, Z(1165) + 0.05, Z(1305) - 0.1, 1);                          // "Table booth" against the partition
  boothTable(X(455) + 0.95, Z(1195), true, 1); boothTable(X(455) + 0.95, Z(1265), true, 1);
  bench(false, Z(1305) - 0.08, X(530), X(700), -1);                                      // "Table booth" along the conservatory wall
  boothTable(X(565), Z(1305) - 0.95, false, -1); boothTable(X(655), Z(1305) - 0.95, false, -1);
  // the pillar in the middle, opposite the bar, with a fruit machine on its right
  const pillar = (x, z) => {
    k.texBox(0.62, H, 0.62, x, H / 2, z, BRICK, { tile: 0.9, collide: true, block: true });                         // solid brick, floor to ceiling, like the walls
    for (const [dx, dz] of [[0.32, 0], [-0.32, 0], [0, 0.32], [0, -0.32]]) k.box(Math.abs(dx) ? 0.04 : 0.12, 0.1, Math.abs(dz) ? 0.04 : 0.12, x + dx * 1.06, 2.3, z + dz * 1.06, 0x2a2a2a);   // small black wall lights
  };
  const PX = X(540), PZ = Z(830);
  pillar(PX, PZ);
  // dark wood posts where the plan's walls end in the open room
  for (const [x, z] of [[X(355), Z(605)], [X(615), Z(710)], [X(290), Z(1305)], [X(735), Z(1305)], [X(790), Z(1305)]]) k.box(0.16, H - 0.5, 0.16, x, (H - 0.5) / 2, z, DARKWOOD, { block: true });
  // DJ booth: decks, mixer, speakers, a light bar
  { const x0 = X(475), x1 = X(615), z0 = Z(605), z1 = Z(705);
    R(X(495), z0 + 0.1, X(600), z0 + 0.75, 0.95, 0.475, 0x1a1a1a, { collide: true, block: true });
    for (const dx of [-0.45, 0.45]) { k.cyl(0.16, 0.16, 0.03, (X(495) + X(600)) / 2 + dx, 0.97, z0 + 0.42, 0x333333, 16); k.cyl(0.02, 0.02, 0.04, (X(495) + X(600)) / 2 + dx, 0.99, z0 + 0.42, 0xd0d0d0, 6); }
    R((X(495) + X(600)) / 2 - 0.15, z0 + 0.25, (X(495) + X(600)) / 2 + 0.15, z0 + 0.6, 0.05, 0.98, 0x222222);
    for (const x of [X(482), x1 - 0.25]) { R(x - 0.2, z0 + 0.05, x + 0.2, z0 + 0.45, 1.3, 0.65, 0x111111, { block: true }); for (const y of [0.4, 0.95]) k.cyl(0.13, 0.13, 0.02, x, y, z0 + 0.46, 0x333333, 14); }
    for (let i = 0; i < 6; i++) k.lamp(x0 + 0.4 + i * 0.5, H - 0.25, z0 + 0.4, [0xff2a6a, 0x2a8aff, 0x39ff14, 0xffd400, 0xff2a6a, 0x2a8aff][i], 0.06);
    R(x0, z0 + 0.3, x1, z0 + 0.34, 0.06, H - 0.2, 0x111111);
    k.label('DJ BOOTH — NO REQUESTS FOR "THE PIE SONG"', 1.4, 0.3, [(x0 + x1) / 2, 1.5, z0 + 0.03], [0, 0, 0], { bg: '#111', fg: '#ff4fa3', border: '#ff4fa3', size: 40, glow: true });
    k.spawns.push(new THREE.Vector3((X(495) + X(600)) / 2, 1.05, z0 + 0.65));
  }

  // ================================================================ the bar (angled, stools all along it)
  // counter along the customer side of the plan's bar line; back-bar shelving behind; brass rails
  const counter = (ax, ay, bx, by, depth = 0.55, side = 1) => {
    const x0 = X(ax), z0 = Z(ay), x1 = X(bx), z1 = Z(by), dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, ry = Math.atan2(-dz, dx);
    const nx = -uz * side, nz = ux * side;      // into the bar
    const cx = (x0 + x1) / 2 + nx * depth / 2, cz = (z0 + z1) / 2 + nz * depth / 2;
    k.box(L, 1.06, depth, cx, 0.53, cz, 0x7a4a24, { rot: [0, ry, 0] });
    k.box(L + 0.02, 0.06, depth + 0.1, cx - nx * 0.05, 1.09, cz - nz * 0.05, 0x4a2a14, { rot: [0, ry, 0] });              // polished top
    k.box(L, 0.05, 0.05, (x0 + x1) / 2 - nx * 0.1, 1.15, (z0 + z1) / 2 - nz * 0.1, BRASS, { rot: [0, ry, 0] });           // brass top rail
    k.box(L, 0.04, 0.04, (x0 + x1) / 2 - nx * 0.17, 0.22, (z0 + z1) / 2 - nz * 0.17, BRASS, { rot: [0, ry, 0] });         // foot rail
    for (let s = 0.4; s < L; s += 0.9) k.box(0.03, 0.03, 0.18, x0 + ux * s - nx * 0.09, 0.22, z0 + uz * s - nz * 0.09, BRASS, { rot: [0, ry, 0] });
    for (let s = 0.4; s < L - 0.3; s += 0.8) for (const p of [0.25, 0.75]) k.box(0.36, 0.7, 0.02, x0 + ux * s - nx * 0.005, 0.55, z0 + uz * s - nz * 0.005, 0x6a3e1c, { rot: [0, ry, 0] });   // panels
    for (let s = 0; s <= L; s += 0.18) { const x = x0 + ux * s + nx * depth / 2, z = z0 + uz * s + nz * depth / 2; blk(x - depth / 2, z - depth / 2, x + depth / 2, z + depth / 2, 1.1); k.colliders.push({ min: new THREE.Vector3(x - 0.15, 1.0, z - 0.15), max: new THREE.Vector3(x + 0.15, 1.12, z + 0.15) }); }
    // food along the bar top, stools along the customer side (facing the bar)
    for (let s = 0.6; s < L - 0.3; s += 1.3) k.spawns.push(new THREE.Vector3(x0 + ux * s + nx * 0.25, 1.2, z0 + uz * s + nz * 0.25));
    for (let s = 0.45; s < L - 0.25; s += 0.85) k.stool(x0 + ux * s - nx * 0.45, z0 + uz * s - nz * 0.45, 0x8a1f2a, BRASS);
    return { x0, z0, ux, uz, nx, nz, L, ry };
  };
  const bar1 = counter(695, 605, 695, 845, 0.55, -1);
  counter(695, 845, 735, 965, 0.55, -1);
  counter(735, 965, 795, 985, 0.55, -1);
  const bar4 = counter(795, 985, 795, 1245, 0.42, -1);
  counter(795, 1245, 835, 1245, 0.42, -1);
  // beer taps along the straight runs
  for (const b of [bar1, bar4]) for (let s = 0.8; s < b.L - 0.6; s += 0.5) { const x = b.x0 + b.ux * s + b.nx * 0.32, z = b.z0 + b.uz * s + b.nz * 0.32; k.cyl(0.015, 0.015, 0.32, x, 1.3, z, 0xd4af37, 8); k.box(0.05, 0.12, 0.03, x, 1.5, z, [0xc8102e, 0x111111, 0x1f4fbf, 0xffd400][Math.round(s * 2) % 4], { rot: [0, b.ry, 0] }); }
  // back-bar shelving along the inner line, bottles lit from behind
  { const bt = bottleTex();
    for (const [ax, ay, bx, by] of [[755, 650, 755, 830], [755, 830, 775, 905]]) { const s = WD(ax, ay, bx, by, 0x2a1a10, 1.35, 0.3); const mx = (s.x0 + s.x1) / 2 - s.uz * 0.16, mz = (s.z0 + s.z1) / 2 + s.ux * 0.16; k.label('bottles', s.L, 0.9, [mx, 0.85, mz], [0, s.ry, 0], { tex: bt, glow: true }); }
    // the back room behind the bar: bottles along the wall, the MONSTOR fridge, glass washer
    R(X(855) - 0.42, Z(615), X(855) - 0.08, Z(890), 2.2, 1.1, 0x2a1a10, { collide: true, block: true });
    k.label('bottles', Z(890) - Z(615), 1.2, [X(855) - 0.43, 1.6, (Z(615) + Z(890)) / 2], [0, -Math.PI / 2, 0], { tex: bt, glow: true });
    R(X(780), Z(610), X(850), Z(640), 1.9, 0.95, 0x111111, { block: true });
    k.label('fridge', 1.4, 1.7, [X(815), 0.98, Z(640) + 0.01], [0, 0, 0], { tex: monstorFridgeTex(), glow: true });
    for (let z = Z(660); z < Z(880); z += 0.8) k.lamp(X(855) - 0.5, 2.35, z, 0xffc070, 0.05);
    k.label('THE OYSTERFLEET', 3.2, 0.7, [X(855) - 0.43, 2.62, (Z(615) + Z(890)) / 2], [0, -Math.PI / 2, 0], { tex: pubSignTex(), glow: true });
    for (const z of [Z(700), Z(800)]) k.spawns.push(new THREE.Vector3(X(855) - 0.25, 2.25, z));
  }
  R(X(700) + 0.1, Z(770), X(700) + 0.4, Z(770) + 0.3, 0.25, 1.26, 0x222222); R(X(700) + 0.15, Z(770) + 0.05, X(700) + 0.3, Z(770) + 0.25, 0.2, 1.48, 0x4caf50);   // the till
  // amber pendants over the bar, cream tongue-and-groove bulkhead along it
  for (let py = 640; py < 1240; py += 75) { const px = py < 845 ? 710 : py < 965 ? 710 + (py - 845) / 3 : 812; k.cyl(0.006, 0.006, 0.9, X(px), H - 0.45, Z(py), 0x222222, 4); k.lamp(X(px), H - 1.0, Z(py), 0xffb050, 0.14); k.pool(X(px), 1.14, Z(py), 1.0, 0xffb050); k.pool(X(px) - 0.8, 0, Z(py), 1.6, 0xffa040); }
  const fascia = (x0, z0, x1, z1) => { const w = Math.max(x1 - x0, 0.3), d = Math.max(z1 - z0, 0.3); k.texBox(w, 0.45, d, (x0 + x1) / 2, H - 0.225, (z0 + z1) / 2, TNG, { tile: 0.6 }); k.box(w + 0.02, 0.1, d + 0.02, (x0 + x1) / 2, H - 0.5, (z0 + z1) / 2, DARKWOOD); };
  fascia(X(695) - 0.15, Z(605), X(695) + 0.15, Z(845)); fascia(X(795) - 0.15, Z(985), X(795) + 0.15, Z(1245));
  fascia(X(195), Z(965) - 0.15, X(455), Z(965) + 0.15);
  k.label("TIP JAR: RONNIE'S PASTY FUND", 0.4, 0.2, [X(695) - 0.02, 1.25, Z(770)], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', size: 40 });

  // ================================================================ fruit machines (they WORK: tap one, it pays out in food)
  const machines = [];
  const machine = (x, z, ry) => {
    const nx = Math.sin(ry), nz = Math.cos(ry), cx = x - nx * 0.25, cz = z - nz * 0.25;
    k.box(0.75, 1.7, 0.5, cx, 0.85, cz, 0x222244, { rot: [0, ry, 0] });
    k.box(0.6, 0.06, 0.12, x + nx * 0.05, 0.62, z + nz * 0.05, 0xc9a24a, { rot: [0, ry, 0] });                       // payout tray
    k.box(0.05, 0.3, 0.05, x - nz * 0.4, 1.25, z + nx * 0.4, 0xd32f2f);                                               // lever
    k.box(0.78, 0.2, 0.52, cx, 1.78, cz, 0xffd400, { rot: [0, ry, 0] });
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 320;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = k.label('THE CHIP MACHINE', 0.66, 0.82, [x + nx * 0.01, 1.12, z + nz * 0.01], [0, ry, 0], { tex, glow: true });
    const m = { z, screen: new THREE.Vector3(x, 1.12, z), front: new THREE.Vector3(x + nx * 0.4, 1.0, z + nz * 0.4), tray: new THREE.Vector3(x + nx * 0.2, 0.75, z + nz * 0.2), cv, tex, mesh, t: -1, reels: [0, 1, 2], win: null, cool: 0 };
    m.spin = () => { if (m.t >= 0 || m.cool > 0) return false; m.t = 0; m.win = MACHINE_SYMS[Math.floor(Math.random() * MACHINE_SYMS.length)]; return true; };
    drawMachine(m, 0); machines.push(m);
    k.halo(x + nx * 0.1, 1.1, z + nz * 0.1, 1.0, 0xffd400);
    blk(cx - 0.4, cz - 0.4, cx + 0.4, cz + 0.4, 1.8);
  };
  machine(PX + 0.31 + 0.5, PZ, Math.PI / 2);                                              // by the pillar, facing the bar
  // the gambling room: machines down both walls and along the end, stools in front
  for (let z = Z(1430); z < Z(1600); z += 0.9) machine(X(795) + 0.08 + 0.5, z, Math.PI / 2);
  for (let z = Z(1330); z < Z(1600); z += 0.9) machine(X(975) - 0.08 - 0.5, z, -Math.PI / 2);
  for (const x of [X(850), X(920)]) machine(x, Z(1620) - 0.58, Math.PI);
  for (let z = Z(1430); z < Z(1600); z += 0.9) k.stool(X(795) + 1.25, z, 0x7a1f2a, BRASS);
  k.label('THE GAMBLING ROOM — NO RONNIES BEYOND THIS POINT (HE WILL EAT THE CHIPS)', 2.2, 0.4, [X(795) - 0.1, 2.45, Z(1368)], [0, -Math.PI / 2, 0], { bg: '#111', fg: '#ffd400', border: '#ffd400', size: 36 });
  k.label('FRUIT MACHINE PAYOUT: CHIPS. RONNIE HAS WON 900 TIMES. THE MACHINE IS EMPTY.', 1.0, 0.45, [X(885), 2.1, Z(1620) - 0.1], [0, Math.PI, 0], { bg: '#1a1a3a', fg: '#ffd400', border: '#ffd400', size: 34 });
  k.light(X(885), 2.3, Z(1460), 0xffe0a0, 4, 6);

  // ================================================================ staff room + back room (beer kegs)
  { const x0 = X(855), x1 = X(1045), z0 = Z(690), z1 = Z(975);
    R(x0 + 1.4, z0 + 1.6, x0 + 2.8, z0 + 2.6, 0.04, 0.74, 0xe0e0e0, { collide: true }); R(x0 + 2.05, z0 + 2.05, x0 + 2.15, z0 + 2.15, 0.72, 0.36, 0x333333); blk(x0 + 1.4, z0 + 1.6, x0 + 2.8, z0 + 2.6, 0.76);
    k.chair(x0 + 1.75, z0 + 1.25, Math.PI, 0x1e4ea8); k.chair(x0 + 2.45, z0 + 1.25, Math.PI, 0x1e4ea8); k.chair(x0 + 1.75, z0 + 2.95, 0, 0x1e4ea8); k.chair(x0 + 2.45, z0 + 2.95, 0, 0x1e4ea8);
    k.spawns.push(new THREE.Vector3(x0 + 1.8, 0.84, z0 + 2.1), new THREE.Vector3(x0 + 2.4, 0.84, z0 + 2.1));
    for (let z = z0 + 0.2; z < z0 + 2.2; z += 0.45) R(x1 - 0.45, z, x1 - 0.08, z + 0.43, 1.9, 0.95, 0x607d8b, { block: true });   // lockers
    R(x0 + 0.1, z0 + 0.08, x0 + 1.9, z0 + 0.6, 0.92, 0.46, 0xd8d8d8, { collide: true, block: true }); k.cyl(0.07, 0.08, 0.22, x0 + 0.5, 1.03, z0 + 0.3, 0xeeeeee, 10);   // kettle counter
    k.spawns.push(new THREE.Vector3(x0 + 1.2, 1.0, z0 + 0.35));
    R(x1 - 2.4, z1 - 0.9, x1 - 0.6, z1 - 0.1, 0.45, 0.225, 0x37474f, { block: true }); R(x1 - 2.4, z1 - 0.3, x1 - 0.6, z1 - 0.1, 0.9, 0.45, 0x37474f);   // battered sofa
    k.label("STAFF FOOD ALLOWANCE: ONE (1) BAG OF CRISPS. RONNIE THIS MEANS YOU. — THE GAFFER", 1.3, 0.7, [x0 + 1.0, 1.6, z0 + 0.03], [0, 0, 0], { bg: '#fff', fg: '#111' });
    k.label('STAFF ROOM', 1.0, 0.25, [X(875), 2.4, z1 + 0.09], [0, 0, 0], { bg: '#1b3a2a', fg: '#d4af37', border: null, size: 60 });
    k.lamp((x0 + x1) / 2, H - 0.02, (z0 + z1) / 2, 0xffffff, 0.12);
  }
  { const x0 = X(895), x1 = X(1045), z0 = Z(975), z1 = Z(1305);
    for (let i = 0; i < 12; i++) { const x = x1 - 0.4 - (i % 3) * 0.55, z = z0 + 0.6 + Math.floor(i / 3) * 0.7; k.cyl(0.22, 0.22, 0.6, x, 0.3, z, 0xb8bcc2, 14, { block: true, collide: true }); k.cyl(0.05, 0.05, 0.08, x, 0.64, z, 0x333333, 8); for (const y of [0.08, 0.52]) k.cyl(0.225, 0.225, 0.04, x, y, z, 0x8a9098, 14); }   // beer kegs
    for (let i = 0; i < 6; i++) R(x0 + 0.2, z1 - 0.7 - i * 0.0, x0 + 0.75, z1 - 0.25, 0.3, 0.15 + i * 0.3, [0xc8a050, 0x2e7d32, 0x5a3a22][i % 3], { block: true });   // crates
    for (let i = 0; i < 3; i++) k.cyl(0.12, 0.12, 0.9, x0 + 0.35 + i * 0.3, 0.45, z0 + 0.4, 0x1565c0, 10, { block: true });   // gas cylinders
    k.label('BEER KEGS — RONNIE IS NOT A KEG. STOP LYING DOWN IN HERE.', 1.4, 0.4, [x1 - 0.1, 1.8, (z0 + z1) / 2], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', border: '#c0392b', size: 36 });
    k.label('BACK ROOM', 0.9, 0.25, [x0 - 0.1, 2.4, Z(1268)], [0, -Math.PI / 2, 0], { bg: '#1b3a2a', fg: '#d4af37', border: null, size: 60 });
    k.lamp((x0 + x1) / 2, H - 0.02, (z0 + z1) / 2, 0xffffff, 0.1);
  }

  // ================================================================ kitchen
  { const x0 = X(25), x1 = X(195), z0 = Z(605), z1 = Z(1060);
    clad(x0 + 0.08, z0 + 0.08, x1 - 0.08, z0 + 0.1, KTILE, 1.8, 0.6); clad(x0 + 0.08, z0 + 0.08, x0 + 0.1, z1 - 0.08, KTILE, 1.8, 0.6);
    // worktops down the outside wall: range with hobs and a hood, sink, deep fryer; fridges at the end
    R(x0 + 0.08, z0 + 0.1, x0 + 0.75, z0 + 6.2, 0.92, 0.46, STEEL, { collide: true, block: true }); R(x0 + 0.08, z0 + 0.1, x0 + 0.75, z0 + 6.2, 0.03, 0.935, 0xd0d4da);
    for (const z of [z0 + 0.6, z0 + 1.2]) for (const dx of [0.25, 0.55]) k.cyl(0.12, 0.12, 0.02, x0 + dx, 0.95, z, 0x222222, 12);
    R(x0 + 0.08, z0 + 0.2, x0 + 0.8, z0 + 1.6, 0.5, 2.2, DSTEEL);
    for (const [z, c] of [[z0 + 0.6, 0x9aa0a8], [z0 + 1.2, 0x9aa0a8]]) k.cyl(0.13, 0.13, 0.2, x0 + 0.4, 1.06, z, c, 14);
    R(x0 + 0.15, z0 + 2.4, x0 + 0.65, z0 + 3.2, 0.05, 0.94, 0x9aa0a8); k.cyl(0.015, 0.015, 0.3, x0 + 0.12, 1.08, z0 + 2.8, 0xd0d0d0, 6);   // sink
    R(x0 + 0.1, z0 + 3.8, x0 + 0.75, z0 + 4.7, 1.0, 0.5, DSTEEL, { block: true }); R(x0 + 0.18, z0 + 3.9, x0 + 0.68, z0 + 4.6, 0.04, 1.0, 0xe0b040);   // deep fryer
    for (const z of [z1 - 1.9, z1 - 0.65]) { R(x0 + 0.08, z - 0.6, x0 + 0.85, z + 0.6, 2.1, 1.05, 0xd8dce2, { collide: true, block: true }); R(x0 + 0.85, z - 0.55, x0 + 0.88, z + 0.55, 0.04, 1.6, 0x888888); }
    k.label('RONNIE\'S SHELF (EMPTY)', 0.9, 0.3, [x0 + 0.9, 1.95, z1 - 1.3], [0, Math.PI / 2, 0], { bg: '#fff', fg: '#c0392b', border: null, size: 40 });
    // the pass in the middle with heat lamps, plates, boards
    R(x0 + 1.9, z0 + 2.0, x1 - 0.55, z0 + 5.0, 0.92, 0.46, STEEL, { collide: true, block: true }); R(x0 + 1.9, z0 + 2.0, x1 - 0.55, z0 + 5.0, 0.03, 0.935, 0xd0d4da);
    for (const z of [z0 + 2.5, z0 + 3.5, z0 + 4.5]) { k.cyl(0.006, 0.006, 0.8, (x0 + 1.9 + x1 - 0.55) / 2, H - 0.4, z, 0x222222, 4); k.lamp((x0 + 1.9 + x1 - 0.55) / 2, H - 0.9, z, 0xff6a20, 0.06); k.spawns.push(new THREE.Vector3((x0 + 1.9 + x1 - 0.55) / 2, 1.02, z)); }
    for (let i = 0; i < 6; i++) k.cyl(0.11, 0.1, 0.012, x0 + 2.2, 0.96 + i * 0.014, z0 + 2.3, 0xffffff, 14);
    R(x0 + 2.3, z0 + 3.0, x0 + 2.8, z0 + 3.4, 0.03, 0.95, 0xc89a5a);
    for (const z of [z0 + 0.8, z0 + 2.0, z0 + 5.5]) k.spawns.push(new THREE.Vector3(x0 + 0.45, 1.02, z));
    k.cyl(0.22, 0.2, 0.7, x1 - 0.4, 0.35, z0 + 0.5, 0x2e7d32, 12, { block: true });
    k.label('clock', 0.35, 0.35, [(x0 + x1) / 2, 2.65, z0 + 0.1], [0, 0, 0], { tex: clockTex() });
    k.label('PIE OF THE DAY: GONE (RONNIE)', 1.2, 0.6, [(x0 + x1) / 2, 2.0, z0 + 0.11], [0, 0, 0], { bg: '#222', fg: '#fff', border: '#ffd400', size: 50 });
    k.box(0.32, 0.6, 0.02, x1 - 0.8, 0.3, z1 - 1.5, 0xffd400, { rot: [0.25, 0.6, 0] });
    k.label('KITCHEN — STAFF ONLY (ESPECIALLY NOT RONNIE)', 1.1, 0.3, [x1 + 0.1, 2.45, Z(1012)], [0, Math.PI / 2, 0], { bg: '#fff', fg: '#c0392b', border: '#c0392b', size: 40 });
    for (let z = z0 + 1; z < z1; z += 2.5) k.lamp((x0 + x1) / 2, H - 0.02, z, 0xffffff, 0.12);
  }
  // the restaurant entrance: outside door, mat, a menu board
  { const x0 = X(15), x1 = X(195), z0 = Z(1060), z1 = Z(1190), zc = (z0 + z1) / 2;
    k.window(x0 + 0.1, 1.15, zc, 1.3, 2.2, Math.PI / 2, streetViewTex(2), { frame: DARKWOOD, bars: 1 });
    R(x0 + 0.2, zc - 0.8, x0 + 1.4, zc + 0.8, 0.01, 0.006, 0x3a3a3a);
    k.label('ENTRANCE TO THE RESTAURANT — WAIT TO BE SEATED (RONNIE: WAIT TO BE STOPPED)', 1.6, 0.4, [x0 + 0.1, 2.55, zc], [0, Math.PI / 2, 0], { bg: '#1b3a2a', fg: '#d4af37', border: '#d4af37', size: 34 });
    R(x1 - 0.7, z0 + 0.2, x1 - 0.2, z0 + 0.5, 1.4, 0.7, DARKWOOD, { block: true }); k.label('TODAY\'S MENU: PIE. PIE AND CHIPS. CHIPS. (RONNIE: ALL OF IT)', 0.45, 0.6, [x1 - 0.45, 1.05, z0 + 0.51], [0, 0, 0], { bg: '#1b2a1b', fg: '#fff', border: '#8a6a3a', size: 30 });
  }
  // the entrance booking area: front doors on the corner, the booking podium, coat hooks
  { const mx = (door.x0 + door.x1) / 2 - door.uz * 0.07, mz = (door.z0 + door.z1) / 2 + door.ux * 0.07;
    const g = new THREE.Mesh(new THREE.PlaneGeometry(door.L - 0.3, 2.2), new THREE.MeshBasicMaterial({ map: streetViewTex(1), color: 0xdddddd })); g.position.set(mx, 1.1, mz); g.rotation.y = door.ry; scene.add(g);
    k.box(0.04, 2.2, 0.06, mx, 1.1, mz, DARKWOOD, { rot: [0, door.ry, 0] });
    k.label('EXIT', 0.4, 0.18, [mx, 2.5, mz], [0, door.ry, 0], { bg: '#1b8a3a', fg: '#fff', border: null, size: 90, glow: true });
    R(X(700), Z(440), X(760), Z(470), 1.15, 0.575, DARKWOOD, { block: true, collide: true }); R(X(700) - 0.05, Z(440) - 0.05, X(760) + 0.05, Z(470) + 0.05, 0.05, 1.18, 0x2a1a10);
    k.label('PLEASE WAIT TO BE SEATED', 0.9, 0.3, [X(730), 1.45, Z(470) + 0.02], [0, 0, 0], { bg: '#1b3a2a', fg: '#d4af37', border: '#d4af37', size: 44 });
    k.label('BOOKINGS: "RONNIE, TABLE FOR ONE, FOOD FOR TWELVE"', 0.5, 0.35, [X(730), 1.21, Z(455)], [-Math.PI / 2, 0, 0], { bg: '#fffdf2', fg: '#111', border: null, size: 30 });
    for (let x = X(625); x < X(670); x += 0.4) k.box(0.1, 0.04, 0.04, x, 1.7, Z(560), 0x3a2416);
    k.label('WELCOME TO THE OYSTERFLEET — PLEASE KEEP RONNIE AWAY FROM THE BAR SNACKS', 2.0, 0.5, [X(835) - 0.1, 1.8, Z(465)], [0, -Math.PI / 2, 0], { bg: '#1b3a2a', fg: '#d4af37', border: '#d4af37', size: 38 });
    k.lamp(X(725), H - 0.02, Z(480), 0xfff1d0, 0.1);
  }
  // the beer garden door at the end of the passage
  { const xc = (X(722) + X(793)) / 2; k.window(xc, 1.15, Z(1645) - 0.1, X(793) - X(722) - 0.2, 2.2, Math.PI, streetViewTex(5, true), { frame: DARKWOOD, bars: 1 });
    k.label('BEER GARDEN →', 1.2, 0.3, [xc, 2.55, Z(1645) - 0.1], [0, Math.PI, 0], { bg: '#2e7d32', fg: '#fff', border: null, size: 60 }); }

  // ================================================================ toilets
  const cubicles = (x0, n, w, zBack, zFront, flip) => {
    for (let i = 0; i <= n; i++) R(x0 + i * w - 0.02, zBack, x0 + i * w + 0.02, zFront, 1.9, 1.1, 0xcfd8dc);
    for (let i = 0; i < n; i++) {
      const cx = x0 + (i + 0.5) * w;
      R(x0 + i * w + 0.02, zFront - 0.02, x0 + i * w + 0.12, zFront + 0.02, 1.9, 1.1, 0xcfd8dc);
      R(x0 + (i + 1) * w - 0.12, zFront - 0.02, x0 + (i + 1) * w - 0.02, zFront + 0.02, 1.9, 1.1, 0xcfd8dc);
      const dw = w - 0.24, hx = x0 + i * w + 0.12, ang = flip ? -1.1 : 1.1;
      k.box(dw, 1.7, 0.03, hx + Math.cos(ang) * dw / 2, 1.05, zFront - Math.sin(Math.abs(ang)) * dw / 2, 0xb0bec5, { rot: [0, ang, 0] });
      toilet(cx, zBack, 1);
    }
    R(x0, zBack, x0 + n * w, zFront, 0.05, 2.05, 0xcfd8dc);
  };
  const toilet = (x, zWall, dir) => {
    R(x - 0.2, zWall + 0.02, x + 0.2, zWall + 0.2, 0.42, 0.72, PORCELAIN);
    const zb = zWall + 0.47 * dir;
    k.parts.push(part(new THREE.CylinderGeometry(0.17, 0.13, 0.38, 14), PORCELAIN, [x, 0.19, zb], [0, 0, 0], [1, 1, 1.25]));
    k.blockers.push({ x0: x - 0.2, x1: x + 0.2, z0: Math.min(zWall, zb + 0.25 * dir), z1: Math.max(zWall, zb + 0.25 * dir), y1: 0.45 });
    k.parts.push(part(new THREE.CircleGeometry(0.13, 14), 0x8fd3f0, [x, 0.33, zb], [-Math.PI / 2, 0, 0], [1, 1.25, 1]));
    k.parts.push(part(new THREE.TorusGeometry(0.15, 0.025, 6, 16), 0xffffff, [x, 0.4, zb], [Math.PI / 2, 0, 0], [1, 1.25, 1]));
    R(x - 0.17, zWall + 0.2 * dir - 0.015, x + 0.17, zWall + 0.2 * dir + 0.015, 0.42, 0.62, 0xf0f0f0);
    R(x - 0.03, zWall + 0.05, x + 0.03, zWall + 0.1, 0.03, 0.96, 0xc0c0c0);
  };
  const sinks = (xWall, z0, z1, dir) => {
    const x = xWall + dir * 0.28;
    R(xWall, z0, xWall + dir * 0.55, z1, 0.08, 0.86, 0x37474f, { collide: true });
    R(xWall, z0, xWall + dir * 0.55, z1, 0.82, 0.41, 0x455a64, { block: true });
    for (let z = z0 + 0.35; z < z1 - 0.2; z += 0.7) { k.cyl(0.2, 0.15, 0.1, x, 0.86, z, PORCELAIN, 14); k.cyl(0.012, 0.012, 0.2, xWall + dir * 0.08, 0.98, z, 0xd0d0d0, 6); }
    k.label('mirror', z1 - z0 - 0.1, 0.9, [xWall + dir * 0.03, 1.55, (z0 + z1) / 2], [0, dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0], { tex: mirrorTex(), glow: true });
  };
  const dryer = (x, z, ry) => { k.box(0.28, 0.32, 0.18, x, 1.25, z, 0xeceff1, { rot: [0, ry, 0] }); };
  // Men's
  { const x0 = X(175), x1 = X(415), z0 = Z(305), z1 = Z(465);
    clad(x0 + 0.08, z0 + 0.08, x1 - 0.08, z0 + 0.1, WTILE, 2.0, 0.5); clad(x0 + 0.08, z0 + 0.08, x0 + 0.1, z1 - 0.08, WTILE, 2.0, 0.5);
    cubicles(x0 + 0.08, 2, 1.0, z0 + 0.08, z0 + 1.6, false);
    for (const x of [x0 + 2.6, x0 + 3.3, x0 + 4.0]) { R(x - 0.2, z0 + 0.08, x + 0.2, z0 + 0.4, 0.7, 0.85, PORCELAIN, { block: true }); R(x - 0.15, z0 + 0.38, x + 0.15, z0 + 0.45, 0.05, 0.55, 0xd0e8ff); }
    sinks(x0 + 0.08, z1 - 1.9, z1 - 0.4, 1); dryer(x1 - 0.17, z1 - 1.0, -Math.PI / 2);
    k.label('MEN', 0.7, 0.25, [(X(365) + X(410)) / 2, 2.4, z1 + 0.09], [0, 0, 0], { bg: '#1f4fbf', fg: '#fff', border: null, size: 90 });
    k.label('NOW WASH YOUR HANDS (RONNIE: THAT INCLUDES THE GRAVY)', 0.8, 0.4, [x1 - 0.1, 1.6, z1 - 2.2], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', border: '#1f4fbf', size: 36 });
    k.lamp((x0 + x1) / 2, H - 0.01, (z0 + z1) / 2, 0xffffff, 0.12);
  }
  // ...and someone didn't flush (first cubicle in the Men's). Don't eat it, Ronnie.
  const poopAt = new THREE.Vector3(X(175) + 0.58, 0.4, Z(305) + 0.08 + 0.47);
  k.colliders.push({ min: new THREE.Vector3(poopAt.x - 0.12, 0, poopAt.z - 0.14), max: new THREE.Vector3(poopAt.x + 0.12, 0.31, poopAt.z + 0.14) });
  k.label("SOMEONE DIDN'T FLUSH", 0.5, 0.15, [poopAt.x, 1.4, Z(305) + 0.1], [0, 0, 0], { bg: '#fff', fg: '#5a3418', border: '#5a3418', size: 40 });
  // Disabled toilet: toilet with grab rails, a low sink, the red pull cord
  { const x0 = X(215), x1 = X(355), z0 = Z(465), z1 = Z(605);
    clad(x0 + 0.08, z0 + 0.08, x1 - 0.08, z0 + 0.1, WTILE, 2.0, 0.5);
    toilet(x0 + 0.7, z0 + 0.08, 1);
    for (const dx of [0.3, 1.1]) R(x0 + dx - 0.02, z0 + 0.25, x0 + dx + 0.02, z0 + 0.95, 0.04, 0.75, 0xd0d0d0);
    R(x0 + 0.08, z0 + 0.3, x0 + 0.12, z0 + 1.0, 0.04, 0.85, 0xd0d0d0);
    sinks(x0 + 0.08, z1 - 1.3, z1 - 0.4, 1); k.box(0.01, 1.4, 0.01, x0 + 1.5, 1.6, z0 + 0.12, 0xd32f2f);
    k.label('♿ ACCESSIBLE TOILET', 0.7, 0.25, [x1 + 0.1, 2.4, Z(500)], [0, Math.PI / 2, 0], { bg: '#1f4fbf', fg: '#fff', border: null, size: 60 });
    k.lamp((x0 + x1) / 2, H - 0.01, (z0 + z1) / 2, 0xffffff, 0.1);
  }
  // Women's
  { const x0 = X(415), x1 = X(615), z0 = Z(345), z1 = Z(605);
    clad(x0 + 0.08, z0 + 0.08, x1 - 0.08, z0 + 0.1, GTILE, 2.0, 0.5); clad(x1 - 0.1, z0 + 0.08, x1 - 0.08, z1 - 0.08, GTILE, 2.0, 0.5);
    cubicles(x0 + 0.1, 4, 1.0, z0 + 0.08, z0 + 1.6, true);
    sinks(x1 - 0.08, z1 - 2.4, z1 - 0.6, -1); dryer(x0 + 0.17, z1 - 1.6, Math.PI / 2);
    k.label('WOMEN', 0.8, 0.25, [(X(430) + X(472)) / 2, 2.4, z1 + 0.09], [0, 0, 0], { bg: '#c2185b', fg: '#fff', border: null, size: 90 });
    k.label("CHLOE'S MIRROR SELFIE SPOT", 0.9, 0.25, [x1 - 0.1, 2.15, z1 - 1.5], [0, -Math.PI / 2, 0], { bg: '#fce4ec', fg: '#c2185b', border: null, size: 40 });
    k.lamp((x0 + x1) / 2, H - 0.01, (z0 + z1) / 2, 0xffffff, 0.12);
  }
  k.label('TOILETS →', 0.7, 0.22, [X(385), 2.5, Z(605) + 0.09], [0, 0, 0], { bg: '#1b3a2a', fg: '#d4af37', border: null, size: 60 });

  // ================================================================ the conservatory: booths, tables, a glass roof
  bench(false, Z(1305) + 0.08, X(300), X(690), 1);                                       // "Tables with booth" along the partition
  boothTable(X(390), Z(1305) + 0.95, false, 1); boothTable(X(590), Z(1305) + 0.95, false, 1);
  bench(true, X(195) + 0.08, Z(1390), Z(1530), 1);                                       // "Table booth" on the left wall
  boothTable(X(195) + 0.95, Z(1420), true, 1); boothTable(X(195) + 0.95, Z(1500), true, 1);
  freeTable(X(685), Z(1465), true);
  for (const px of [325, 430, 540]) freeTable(X(px), Z(1590), true);
  { const x0 = X(195), x1 = X(715), z0 = Z(1305), z1 = Z(1645);
    const sky = canvasTex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9ccff2'); gr.addColorStop(1, '#e8f4fc'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(40 + i * 40, 60 + (i % 3) * 50, 40, 14, 0, 0, 7); g.fill(); } });
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 0.2, z1 - z0 - 0.2), new THREE.MeshBasicMaterial({ map: sky })); roof.rotation.x = Math.PI / 2; roof.position.set((x0 + x1) / 2, H - 0.012, (z0 + z1) / 2); scene.add(roof);
    for (let x = x0 + 1.0; x < x1; x += 1.0) k.box(0.06, 0.08, z1 - z0, x, H - 0.05, (z0 + z1) / 2, WHITE);   // glazing bars
    for (let z = z0 + 1.6; z < z1; z += 1.6) k.box(x1 - x0, 0.08, 0.06, (x0 + x1) / 2, H - 0.05, z, WHITE);
    for (const [i, x] of [x0 + 1.5, x0 + 4.3, x0 + 7.1, x0 + 9.9].entries()) k.window(x, 1.6, z1 - 0.1, 2.2, 1.7, Math.PI, streetViewTex(i + 5, true), { frame: WHITE, bars: 2 });
    for (const [i, z] of [z0 + 2.2, z0 + 4.6].entries()) k.window(x1 - 0.1, 1.6, z, 1.8, 1.7, -Math.PI / 2, streetViewTex(i + 2, true), { frame: WHITE, bars: 2 });
    k.light((x0 + x1) / 2, 2.5, (z0 + z1) / 2, 0xfff4e0, 4, 10);
    k.pool((x0 + x1) / 2, 0, (z0 + z1) / 2, 7, 0xfff8e8);
    k.label('THE CONSERVATORY — PLEASE DO NOT TAP ON THE GLASS (RONNIE: OR LICK IT)', 2.2, 0.4, [x0 + 0.1, 2.3, z1 - 1.0], [0, Math.PI / 2, 0], { bg: '#fff', fg: '#2e7d32', border: '#2e7d32', size: 36 });
    // plants in the corners
    for (const [x, z] of [[x1 - 0.4, z1 - 0.4], [x0 + 0.4, z1 - 0.4]]) { k.cyl(0.22, 0.16, 0.45, x, 0.225, z, 0xb05a32, 12, { block: true }); for (let i = 0; i < 8; i++) k.box(0.03, 0.6, 0.12, x + Math.cos(i) * 0.08, 0.75, z + Math.sin(i) * 0.08, 0x3a7a2a, { rot: [Math.sin(i) * 0.4, i, Math.cos(i) * 0.4] }); }
  }

  // ================================================================ lights, beams, cladding, telly, signs
  // library wallpaper and exposed brick on the pub's walls, dark dado rail
  clad(X(195) + 0.08, Z(1035) + 0.1, X(195) + 0.1, Z(1090) - 0.1, BOOKS, H, 1.2); clad(X(195) + 0.08, Z(1145) + 0.1, X(195) + 0.1, Z(1300), BOOKS, H, 1.2);
  clad(X(195) + 0.08, Z(610), X(195) + 0.1, Z(960), BRICK, H - RAISE, 0.9, RAISE);
  R(X(195) + 0.06, Z(1035), X(195) + 0.12, Z(1305), 0.06, 0.95, DARKWOOD);
  clad(X(290), Z(1305) - 0.1, X(735), Z(1305) - 0.08, BRICK, H, 0.9);
  // ceiling spotlights everywhere (in the rooms), iron chandeliers, red wall lights
  for (let x = B.x0 + 1; x < B.x1; x += 2) for (let z = B.z0 + 1; z < B.z1; z += 2) if (inside(x, z) && !(x > X(195) && x < X(715) && z > Z(1305))) k.lamp(x, H - 0.01, z, 0xfffbe8, 0.035);
  const chandelier = (x, z) => {
    const y = H - 0.75;
    k.cyl(0.008, 0.008, 0.7, x, H - 0.35, z, 0x1a1a1a, 4); k.cyl(0.05, 0.03, 0.12, x, y, z, 0x1a1a1a, 8);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, ax = x + Math.cos(a) * 0.32, az = z + Math.sin(a) * 0.32;
      k.box(0.32, 0.015, 0.015, (x + ax) / 2, y, (z + az) / 2, 0x1a1a1a, { rot: [0, -a, 0] }); k.cyl(0.05, 0.07, 0.08, ax, y + 0.06, az, 0xf3ead6, 8); k.lamp(ax, y + 0.03, az, 0xfff1d0, 0.035); }
    k.pool(x, 0, z, 3.0, 0xffc070);
  };
  [[X(300), Z(760)], [X(400), Z(870)], [X(580), Z(1000)], [X(400), Z(1150)], [X(600), Z(1180)], [X(820), Z(780)]].forEach(([x, z], i) => i < 5 && chandelier(x, z));
  for (const [x, z, ry] of [[X(195) + 0.1, Z(1100) + 0.5, 1], [X(195) + 0.1, Z(1250), 1], [X(195) + 0.1, Z(700), 1]]) { k.lamp(x + 0.08, 2.05, z, 0xff5040, 0.07); k.box(0.12, 0.14, 0.12, x + 0.06, 2.05, z, 0x8a1a1a); }
  // warm candles and pools of light on every table
  for (const [x, z] of candles) { const y = pubFloorAt(x, z); k.cyl(0.025, 0.025, 0.1, x + 0.2, 0.83 + y, z, 0xf5f0dc, 8); k.lamp(x + 0.2, 0.9 + y, z, 0xffb050, 0.018); k.pool(x, 0.76 + y, z, 1.3, 0xffd090); }
  // dark oak beams across the main room
  for (let x = X(240); x <= X(680); x += 2.5) k.box(0.18, 0.2, Z(1305) - Z(605), x, H - 0.1, (Z(605) + Z(1305)) / 2, DARKWOOD);
  for (const py of [800, 1000, 1180]) k.box(X(695) - X(195), 0.16, 0.16, (X(195) + X(695)) / 2, H - 0.12, Z(py), DARKWOOD);
  // big screens: the football is on
  const tv = (x, y, z, ry) => { k.box(2.0, 1.15, 0.08, x, y, z, 0x111111, { rot: [0, ry, 0] }); k.label('tv', 1.9, 1.05, [x + Math.sin(ry) * 0.05, y, z + Math.cos(ry) * 0.05], [0, ry, 0], { tex: tvTex(), glow: true }); };
  tv(X(250), 2.25, Z(605) + 0.12, 0);
  tv(X(885), 2.2, Z(1305) + 0.12, 0);
  // street-view windows with burgundy curtains on the raised area's outside wall... (none: it's an inside wall) -> on the restaurant side
  k.label('DARTS', 0.7, 0.7, [X(690) - 0.02, 1.7, Z(1300) - 0.1], [0, Math.PI, 0], { tex: dartTex() });
  const signs = [
    ['STAFF OF THE MONTH: RONNIE (ATE THE CERTIFICATE)', 0.9, 0.7, [X(195) + 0.12, 1.8, Z(650)], [0, Math.PI / 2, 0], {}],
    ["TODAY'S SPECIALS: WHATEVER RONNIE HASN'T EATEN", 1.0, 1.2, [X(195) + 0.12, 1.5, Z(1180)], [0, Math.PI / 2, 0], { bg: '#1b2a1b', fg: '#f5f0e6', border: '#8a6a3a', size: 56 }],
    ['MAX OCCUPANCY: 120 (OR 3 RONNIES)', 1.1, 0.45, [X(650), 1.9, Z(605) + 0.1], [0, 0, 0], {}],
    ['QUIZ NIGHT — Q1: How many pies did Ronnie eat last night? A: Yes.', 1.2, 0.8, [X(290), 1.6, Z(1305) - 0.12], [0, Math.PI, 0], { bg: '#1b2a1b', fg: '#fff', border: '#8a6a3a', size: 48 }],
    ['WE DO NOT SERVE SALAD ("YES YOU DO" — Chloe)', 1.0, 0.5, [X(600), 2.4, Z(1305) - 0.12], [0, Math.PI, 0], { bg: '#fff', fg: '#c0392b' }],
    ['OYSTERFLEET PIE-EATING CHAMPION — RONNIE (UNDEFEATED, UNCHALLENGED, UNWELL)', 1.2, 0.6, [X(195) + 0.12, 1.6, Z(1240)], [0, Math.PI / 2, 0], { bg: '#d4af37', fg: '#111', border: '#7a5a10', size: 48 }],
    ['PLEASE DO NOT FEED THE BARMAN', 1.2, 0.45, [X(855) - 0.43, 0.75, Z(820)], [0, -Math.PI / 2, 0], { bg: '#fff8e7', fg: '#111' }],
    ['LAST ORDERS — Ronnie: last orders means for the CUSTOMERS', 0.8, 0.4, [X(835) - 0.1, 1.9, Z(1100)], [0, -Math.PI / 2, 0], { bg: '#fff06a', fg: '#111', border: null, size: 40 }],
    ['BARRED: RONNIE (FROM THE KITCHEN) (FROM THE CELLAR) (FROM THE CRISP CLIP)', 1.3, 0.6, [X(195) + 0.12, 1.6, Z(1065)], [0, Math.PI / 2, 0], { bg: '#fff', fg: '#c62828', border: '#c62828', size: 38 }],
    ['HAPPY HOUR 5–7PM. RONNIE\'S HAPPY HOUR: 11AM–CLOSING', 1.2, 0.4, [X(855) - 0.43, 2.1, Z(700)], [0, -Math.PI / 2, 0], { bg: '#ffd400', fg: '#111', border: null, size: 40 }],
    ['CARVERY SUNDAYS — RONNIE SIZE PORTION: THE WHOLE CARVERY', 1.3, 0.45, [X(400), 2.3, Z(1065) + 0.1], [0, 0, 0], { bg: '#5a2a14', fg: '#ffd400', border: '#ffd400', size: 40 }],
    ['IN CASE OF EMERGENCY: BREAK GLASS. IN CASE OF RONNIE: HIDE THE PIES.', 0.8, 0.4, [X(795) + 0.1, 1.7, Z(1500)], [0, Math.PI / 2, 0], { bg: '#c62828', fg: '#fff', border: '#fff', size: 34 }],
    ['CAUTION: RONNIE SWEAT', 0.5, 0.6, [X(620), 0.33, Z(1270) - 0.6], [0, -Math.PI / 4, 0], { bg: '#ffd400', fg: '#111', border: '#111', size: 60 }],
    ['TOILET ATTENDANT: NONE. RONNIE, PLEASE STOP OFFERING.', 0.9, 0.3, [X(415) - 0.1, 2.2, Z(560)], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', border: '#1f4fbf', size: 34 }],
  ];
  for (const [t, w, h, pos, rot, o] of signs) k.label(t, w, h, pos, rot, o);
  // real warm lights over the bar and the middle of the room
  k.light(X(720), 2.3, Z(900), 0xffb060, 7, 9);
  k.light(X(420), 2.4, Z(1050), 0xffc884, 5, 10);
  k.light(X(320), 2.4, Z(780), 0xffc884, 4, 7);
  k.pool(PX, 0, PZ, 2.2, 0xffe0b0);

  const room = k.finish({
    name: 'The Oysterfleet',
    sky: 0xffe2c0, ground: 0x6a4a3a, hemiI: 1.55, sun: 0xfff0d8, sunI: 0.45, sunPos: [-6, 10, 5], ambient: 0.32,
    start: { x: X(655), z: Z(560), yaw: Math.PI },
    board: { x: X(195) + 0.11, y: 1.5, z: Z(1270), ry: Math.PI / 2 },
    startFood: ['can', 'burger', 'pizza', 'doughnut', 'can', 'burger', 'pizza', 'doughnut', 'burger', 'pizza', 'can', 'doughnut', 'burger', 'pizza', 'doughnut', 'can', 'burger', 'pizza'],
    spotCount: 40,
  });
  room.floorAt = pubFloorAt;
  room.extraItems = [{ type: 'poop', pos: poopAt }];
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
