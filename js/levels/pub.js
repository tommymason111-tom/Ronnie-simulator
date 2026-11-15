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
import { part, cyl as CYL } from '../geo.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { streetViewTex } from './kit.js';
import { skyDome, waterMaterial, updateOutdoor, leafyHedge, leafyBall, pottedPlant, terrace, HAZE } from './outdoor.js';
import { REST, REST_BOUNDS, REST_H, inRestaurant, inNewArea, buildRestaurant } from './oysterRestaurant.js';
import { Kit, carpetTex, tileTex, canvasTex, FONT, brickTex, booksWallTex, tngTex, oakPanelTex, woodTex } from './kit.js';

const H = 3.0;
const S = 0.024;
const X = (px) => (px - 600) * S, Z = (py) => (py - 975) * S;
const GZ = Z(1645), GZ1 = GZ + 26, GX0 = -10, GX1 = X(1045);          // the beer garden behind the pub (metres)
const CONS_WIN = [-8.22, -5.42, -2.62, 0.18], WIN_Y0 = 0.75, WIN_Y1 = 2.45;   // the conservatory's windows (centres, sill, head)
const DW = 1.0;                                                         // the deck outside the back door was widened by this much (everything beyond moved back)
const B = { x0: REST_BOUNDS.x0, x1: X(1045) + 7, z0: REST_BOUNDS.z0, z1: GZ1 + DW };          // (out to the left for the restaurant)
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
INSIDE.push([[GX0, GZ], [GX1, GZ], [GX1, GZ1 + DW], [GX0, GZ1 + DW]]);                   // the beer garden
for (const poly of Object.values(REST)) INSIDE.push(poly);                          // the restaurant, its side room, toilets, the kitchen extension
const inPoly = (poly, x, z) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const inside = (x, z) => INSIDE.some(p => inPoly(p, x, z));
// the raised seating area (top left of the pub floor), and the two steps up into it
const RAISE = 0.2;
const RAISED = [[195, 605], [355, 605], [355, 685], [455, 785], [455, 965], [195, 965]].map(([x, y]) => [X(x), Z(y)]);
export function pubFloorAt(x, z) {
  if (inPoly(RAISED, x, z)) return RAISE;
  if (x > X(300) && x < X(370) && z > Z(965) && z < Z(965) + 0.32) return RAISE / 2;    // the step
  const mx = GX0 + GX1 - x;                                                              // (the garden is built mirrored)
  if (mx > 5.4 && mx < 7.0 && z > 19.4 + DW && z < 22.9 + DW) return 0.2 * Math.sin(Math.PI * (z - 19.4 - DW) / 3.5);   // the bridge over the stream
  if (mx > 7.6 && mx < GX1 && z > 22.6 + DW && z < GZ1 - 2 + DW) return 0.3;                      // the raised deck along the river
  if (mx > 7.3 && mx < 7.6 && z > 22.6 + DW && z < GZ1 - 2 + DW) return 0.15;                    // its step
  return 0;
}

export function buildPub(scene) {
  const sceneStart = scene.children.length;
  const k = new Kit(scene, { ...B, y1: REST_H });                      // (the restaurant's dining room is the tallest room)
  const WALL = 0xeee6d6, PLASTER = 0xf2ecdf, DARKWOOD = 0x3a2416, WOOD = 0x4a2c18, REDLEATHER = 0x7a1f2a, BRASS = 0xc9a24a, CREAM = 0xe8dcc0, LIGHTWOOD = 0xc89a5a;
  const STEEL = 0xb8bcc2, DSTEEL = 0x8a9098, WHITE = 0xf8f8f6, PORCELAIN = 0xfbfbfb;
  const BRICK = oldBrickTex(), BOOKS = booksWallTex(), TNG = tngTex(), OAK = oakPanelTex();
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
  const carpet = weaveCarpetTex(), tiles = tileTex('#8f8574', '#837a69', '#5e574b', 85);
  k.floor(X(195), Z(605), X(855), Z(1305), carpet, 0.002, 1.2);                          // the pub floor
  k.floor(X(615), Z(385), X(835), Z(605), tiles, 0.003, 1.0);                            // entrance (tiled)
  k.floor(X(855), Z(690), X(1045), Z(975), tileTex('#b8b4aa', '#aca89e', '#8a867c', 48), 0.004, 0.9);   // staff room
  k.floor(X(835), Z(925), X(1045), Z(1305), tileTex('#9a9a96', '#8e8e8a', '#6e6e6a', 64), 0.005, 1.5);  // corridor + back room (concrete)
  k.floor(X(195), Z(1305), X(795), Z(1645), tileTex('#d8c8a8', '#ccbc9c', '#a89878', 72), 0.003, 1.0);  // conservatory (stone tiles)
  k.floor(X(795), Z(1305), X(975), Z(1620), carpetTex('#2a3a5a', '#1a2440', '#c9a24a'), 0.003, 1.2);   // gambling room
  k.floor(X(25), Z(605), X(195), Z(1060), tileTex('#c9c9c4', '#bdbdb7', '#8f8f8a', 48), 0.003, 0.8);   // kitchen
  k.floor(X(15), Z(1060), X(195), Z(1190), tiles, 0.003, 1.0);                          // restaurant entrance
  k.floor(X(175), Z(305), X(415), Z(605), tileTex('#d8d8d8', '#cfcfcf', '#9a9a9a', 40), 0.003, 0.6);   // men's, disabled, corridor
  k.floor(X(415), Z(345), X(615), Z(605), tileTex('#e8dfe4', '#ddd3d8', '#b0a4aa', 40), 0.003, 0.6);   // women's
  { const sh = new THREE.Shape([[B.x0, B.z0], [X(1045), B.z0], [X(1045), GZ], [B.x0, GZ]].map(([x, z]) => new THREE.Vector2(x, z)));   // ceiling (the building only: sky over the garden;
    sh.holes.push(new THREE.Path(REST.main.map(([x, z]) => new THREE.Vector2(x, z))));
    const g = new THREE.ShapeGeometry(sh); g.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0xf7f3ea, emissive: 0xbdb5a2 })); m.position.y = H; scene.add(m);
    // and a solid ceiling at 3m everywhere but the dining room, so thrown food bounces off it
    const inMain = (x, z) => { let c = false; const P = REST.main; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
    for (let z = B.z0; z < GZ; z += 1) { let a0 = null; for (let x = B.x0; x <= X(1045) + 1; x += 1) { const solid = x < X(1045) && !inMain(x + 0.5, z + 0.5) && !inMain(x, z) && !inMain(x + 1, z + 1) && !inMain(x + 1, z) && !inMain(x, z + 1);
      if (solid && a0 === null) a0 = x; if (!solid && a0 !== null) { k.colliders.push({ min: new THREE.Vector3(a0, H, z), max: new THREE.Vector3(Math.min(x, X(1045)), H + 0.3, Math.min(z + 1, GZ)) }); a0 = null; } } }
  }
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
  WX(345, 415, 615, [], WALL); WZ(615, 345, 605); WZ(615, 605, 710, [], DARKWOOD, 1.1);   // (low beside the DJ booth, full height from the entrance)
  // entrance booking area (the front doors are on the angled top-right corner)
  WD(615, 465, 695, 385, WALL); WX(385, 695, 775, [], WALL);
  const door = WD(775, 385, 835, 425, 0x3a2416, H, 0.1);
  WZ(835, 425, 505, [], WALL); WD(835, 505, 755, 605, WALL);
  // the bar: top wall, back wall of the back bar, the corridor behind
  WX(605, 695, 855); WZ(855, 605, 925); WX(925, 835, 855);      // (a doorway from the corridor in behind the bar)      // (a door from behind the bar into the staff room)
  // staff room, back room, gambling room
  WX(690, 855, 1045, [], WALL); WZ(1045, 690, 1305, [], WALL); WX(975, 895, 1045); WX(975, 855, 895); WZ(855, 925, 975, [[928, 972]]);      // (the staff room's door is on its side now, off the end of the bar)
  WZ(895, 975, 1305, [[1235, 1300]]);
  WX(1305, 790, 1045);
  WZ(795, 1305, 1645, [[1335, 1400]]);   // (right down to the back wall: no gap beside the garden door) WZ(975, 1305, 1620, [], WALL); WX(1620, 795, 975, [], WALL);
  // the pub's left wall: kitchen door, restaurant entrance
  WZ(195, 605, 1645, [[990, 1035], [1090, 1145]], WALL);
  // kitchen + restaurant entrance
  WX(605, 25, 195, [[95, 143]], WALL); WZ(25, 605, 1060, [], WALL); WX(1060, 15, 195); WX(1190, 15, 195, [], WALL);   // (a door up into the kitchen extension; the corridor opens into the restaurant)
  R(X(15) - T2, Z(1060), X(15) + T2, Z(1190), H - 2.35, 2.35 + (H - 2.35) / 2, PLASTER); R(X(15) - 0.1, Z(1060), X(15) + 0.1, Z(1190), 0.08, 2.39, DARKWOOD);   // the header over the way into the restaurant
  // conservatory + the passage to the beer garden
  WX(1305, 290, 330); WZ(715, 1305, 1645); WX(1645, 715, 795, [[722, 793]], WALL);
  // the conservatory's back wall, with four real window openings looking out on to the beer garden
  { const z = Z(1645), ops = CONS_WIN.map(c => [c - 1.1, c + 1.1]); let a = X(195) - T2;
    for (const [o0, o1] of ops) { R(a, z - T2, o0, z + T2, H, H / 2, WALL, { collide: true, block: true }); R(o0, z - T2, o1, z + T2, WIN_Y0, WIN_Y0 / 2, WALL, { collide: true, block: true }); R(o0, z - T2, o1, z + T2, H - WIN_Y1, (H + WIN_Y1) / 2, WALL); a = o1; }
    R(a, z - T2, X(715) + T2, z + T2, H, H / 2, WALL, { collide: true, block: true }); }   // (the rest of the conservatory wall: windows and the brick cubby, further down)
  // DJ booth (half walls) and the raised area's edge (half walls with a brass rail on top)
  const HALF = 1.1;
  WZ(475, 605, 665, [], DARKWOOD, HALF); WD(475, 665, 515, 705, DARKWOOD, HALF); WX(705, 515, 535, [], DARKWOOD, HALF);
  WD(355, 685, 455, 785, 0x5a3420, HALF);
  WZ(355, 605, 685, [], 0x5a3420, HALF); WZ(455, 785, 965, [], 0x5a3420, HALF); WX(965, 195, 300, [], 0x5a3420, HALF); WX(965, 370, 455, [], 0x5a3420, HALF);
  for (const [a, b, c, d] of [[355, 605, 355, 685], [355, 685, 455, 785], [455, 785, 455, 965], [195, 965, 300, 965], [370, 965, 455, 965]]) { const x0 = X(a), z0 = Z(b), x1 = X(c), z1 = Z(d), L = Math.hypot(x1 - x0, z1 - z0); k.box(L + 0.1, 0.05, 0.12, (x0 + x1) / 2, HALF + 0.03, (z0 + z1) / 2, BRASS, { rot: [0, Math.atan2(-(z1 - z0), x1 - x0), 0] }); }
  // booth partitions in the main room
  // the low grey-cream tongue-and-groove panelled walls (as in the photo): capping rail, skirting, a dark post at the end
  // carrying a cream bulkhead; the one behind is lower still, with a glazed screen (a window) above it
  const panelWall = (x0, z0, x1, z1, h, windowAbove = false) => {
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), L = alongX ? x1 - x0 : z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    k.texBox(alongX ? L : 0.12, h, alongX ? 0.12 : L, cx, h / 2, cz, TNG, { tile: 0.6, collide: true, block: true, color: 0xe2ded2 });
    k.box(alongX ? L + 0.06 : 0.18, 0.05, alongX ? 0.18 : L + 0.06, cx, h + 0.025, cz, 0xeeeae0);                               // capping
    k.box(alongX ? L + 0.06 : 0.14, 0.035, alongX ? 0.14 : L + 0.06, cx, h - 0.04, cz, 0xd6d2c6);                             // moulding under it
    k.box(alongX ? L : 0.15, 0.1, alongX ? 0.15 : L, cx, 0.05, cz, 0xcfcabd);                                                  // skirting
    for (const [px, pz] of [[x0, z0], [x1, z1]]) k.box(0.14, H - 0.45, 0.14, px, (H - 0.45) / 2, pz, 0x2a1a10, { block: true });   // dark posts up to the bulkhead
    k.texBox(alongX ? L + 0.14 : 0.2, 0.42, alongX ? 0.2 : L + 0.14, cx, H - 0.21, cz, TNG, { tile: 0.5 }); k.box(alongX ? L + 0.16 : 0.24, 0.08, alongX ? 0.24 : L + 0.16, cx, H - 0.45, cz, 0x2a1a10);
    if (windowAbove) {                                                                                                          // the glazed screen above
      const top = H - 0.49, gh = top - h - 0.05, gy = h + 0.05 + gh / 2;
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.1, gh), new THREE.MeshLambertMaterial({ color: 0xdff0f4, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
      gl.position.set(cx, gy, cz); gl.rotation.y = alongX ? 0 : Math.PI / 2; scene.add(gl);
      const n = Math.max(2, Math.round(L / 0.55));
      for (let i = 0; i <= n; i++) { const t = -L / 2 + 0.05 + (L - 0.1) * i / n; k.box(alongX ? 0.05 : 0.06, gh, alongX ? 0.06 : 0.05, alongX ? cx + t : cx, gy, alongX ? cz : cz + t, 0xf4f2ec); }
      for (const y of [h + 0.07, h + 0.05 + gh * 0.62, top - 0.02]) k.box(alongX ? L : 0.07, 0.05, alongX ? 0.07 : L, cx, y, cz, 0xf4f2ec);
      const lead = leadedTex(); for (let i = 0; i < n; i++) { const t = -L / 2 + 0.05 + (L - 0.1) * (i + 0.5) / n, w = (L - 0.1) / n - 0.06, hh = gh * 0.38 - 0.06;   // leaded lights in the top row
        for (const sd of [-1, 1]) k.label('lead', w, hh, [alongX ? cx + t : cx + sd * 0.012, h + 0.05 + gh * 0.62 + gh * 0.19, alongX ? cz + sd * 0.012 : cz + t], [0, (alongX ? 0 : Math.PI / 2) + (sd < 0 ? Math.PI : 0), 0], { tex: lead }); }
      blk(Math.min(x0, x1) - 0.08, Math.min(z0, z1) - 0.08, Math.max(x0, x1) + 0.08, Math.max(z0, z1) + 0.08, H);
    }
  };
  panelWall(X(330), Z(1065), X(480), Z(1065), 1.05);
  panelWall(X(455), Z(1165), X(455), Z(1305) - 0.1, 0.95, true);

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
    k.label('MIND THE STEP (RONNIE: THE STEP MINDS YOU)', 0.9, 0.2, [X(250), 0.72, Z(965) + 0.095], [0, 0, 0], { bg: '#ffd400', fg: '#111', border: null, size: 40 });   // on the half wall by the step
  }
  // ---- furniture, from the photo: honey-pine farmhouse chairs (turned legs, H stretchers, spindles or a carved
  // splat, a wide curved top rail) round dark oak tables with red beer mats, salt & pepper and a cutlery pot
  const PINE = [0xd49a52, 0xcc9048, 0xd8a25c], PINE_D = 0xb07a38, OAKTOP = 0x4a2412, OAKEDGE = 0x3a1a0c;
  const put = (geo, color, x, z, ry, lx, y, lz, rx = 0, rz = 0, ry0 = 0) => { geo.rotateZ(rz); geo.rotateX(rx); geo.rotateY(ry0); geo.translate(lx, y, lz); geo.rotateY(ry); geo.translate(x, 0, z); k.parts.push(part(geo, color)); };
  const turned = (h, r) => new THREE.LatheGeometry([[0, 0], [r * 0.8, 0], [r * 0.9, h * 0.06], [r * 0.8, h * 0.14], [r * 1.1, h * 0.2], [r * 0.85, h * 0.27], [r * 0.95, h * 0.45], [r * 1.12, h * 0.52], [r * 0.9, h * 0.58], [r * 0.95, h * 0.9], [r * 1.0, h], [0, h]].map(([a, b]) => new THREE.Vector2(a, b)), 7);
  const bent = (w, h, d, bend) => { const g = new THREE.BoxGeometry(w, h, d, 6, 1, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2); p.setZ(i, p.getZ(i) + bend * x * x); } g.computeVertexNormals(); return g; };
  let chairN = 0; const chairsAt = [];
  const pubChair = (x, z, ry) => {
    const C = PINE[chairN % 3], splat = chairN % 3 === 1; chairN++;
    put(new RoundedBoxGeometry(0.44, 0.045, 0.42, 2, 0.015), C, x, z, ry, 0, 0.455, -0.01);                                 // the seat (dished a little)
    put(new RoundedBoxGeometry(0.36, 0.01, 0.3, 1, 0.004), PINE_D, x, z, ry, 0, 0.476, 0.0);
    for (const sx of [-1, 1]) put(turned(0.44, 0.02), C, x, z, ry, sx * 0.18, 0, -0.17, -0.06);                          // front legs, splayed
    for (const sx of [-1, 1]) put(turned(0.98, 0.021), C, x, z, ry, sx * 0.18, 0, 0.17, 0.1);                            // back legs up into the back posts
    for (const sx of [-1, 1]) put(CYL(0.011, 0.011, 0.34, 6), C, x, z, ry, sx * 0.18, 0.16, 0.0, Math.PI / 2);          // side stretchers
    put(CYL(0.011, 0.011, 0.36, 6), C, x, z, ry, 0, 0.16, 0.0, 0, Math.PI / 2);                                          // middle stretcher (the H)
    put(CYL(0.01, 0.01, 0.36, 6), C, x, z, ry, 0, 0.26, -0.17, 0, Math.PI / 2);                                          // front rung
    put(bent(0.44, 0.1, 0.03, 0.035), C, x, z, ry, 0, 0.93, 0.255, 0.1);                                                // wide curved top rail
    put(bent(0.4, 0.035, 0.022, 0.03), C, x, z, ry, 0, 0.66, 0.22, 0.1);                                                 // lower back rail
    if (splat) { const sh = new THREE.Shape(); sh.moveTo(-0.03, 0); sh.bezierCurveTo(-0.07, 0.08, -0.02, 0.12, -0.05, 0.2); sh.bezierCurveTo(-0.07, 0.3, -0.03, 0.36, -0.06, 0.42); sh.lineTo(0.06, 0.42); sh.bezierCurveTo(0.03, 0.36, 0.07, 0.3, 0.05, 0.2); sh.bezierCurveTo(0.02, 0.12, 0.07, 0.08, 0.03, 0); sh.closePath();
      const hole = new THREE.Path(); hole.absellipse(0, 0.27, 0.018, 0.04, 0, Math.PI * 2); sh.holes.push(hole);
      put(new THREE.ExtrudeGeometry(sh, { depth: 0.016, bevelEnabled: false, curveSegments: 6 }), C, x, z, ry, 0, 0.48, 0.2, 0.1); }
    for (const t of splat ? [-0.15, -0.09, 0.09, 0.15] : [-0.15, -0.075, 0, 0.075, 0.15]) { const sp = new THREE.CylinderGeometry(0.007, 0.0105, 0.4, 6); sp.translate(0, 0.2, 0); put(sp, C, x, z, ry, t, 0.475, 0.2 + 0.01, 0.1); }   // spindles
    k.blockers.push({ x0: x - 0.24, x1: x + 0.24, z0: z - 0.24, z1: z + 0.24, y1: 0.5 }); chairsAt.push([x, z, ry]);
  };
  const tableTop = (x, z, w, d, y = 0.76) => {
    put(new RoundedBoxGeometry(w, 0.045, d, 2, 0.012), OAKTOP, x, z, 0, 0, y - 0.022, 0);
    put(new THREE.BoxGeometry(w - 0.1, 0.07, d - 0.1), OAKEDGE, x, z, 0, 0, y - 0.08, 0);                                // apron
    k.colliders.push({ min: new THREE.Vector3(x - w / 2, y - 0.05, z - d / 2), max: new THREE.Vector3(x + w / 2, y, z + d / 2) });
    k.blockers.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y1: y });
    // a red beer mat or two, salt & pepper, a little cutlery pot
    // beer mats scattered about (2 to 5 of them, all different, some square, some round, a few hanging over the edge)
    const MATS = [[0xc8202a, 0xffffff], [0x1e6a32, 0xffffff], [0x1f4fbf, 0xffd400], [0x111111, 0xd4af37], [0xf2e8d0, 0x7a1f24], [0xffd400, 0xc8202a]];
    const nm = 2 + Math.floor(Math.random() * 4), used = [];
    for (let i = 0; i < nm; i++) {
      let mx, mz, tries = 0;
      do { mx = x + (Math.random() - 0.5) * (w - 0.06); mz = z + (Math.random() - 0.5) * (d - 0.06); tries++; } while (tries < 20 && (Math.hypot(mx - x, mz - z) < 0.16 || used.some(([ux, uz]) => Math.hypot(mx - ux, mz - uz) < 0.08)));
      used.push([mx, mz]);
      const [c1, c2] = MATS[Math.floor(Math.random() * MATS.length)], a = Math.random() * Math.PI * 2, yy = y + 0.002 + i * 0.0012;
      if (Math.random() < 0.3) { put(CYL(0.05, 0.05, 0.003, 16), c1, mx, mz, 0, 0, yy, 0); put(CYL(0.038, 0.038, 0.002, 16), c2, mx, mz, 0, 0, yy + 0.0015, 0); put(CYL(0.03, 0.03, 0.0025, 16), c1, mx, mz, 0, 0, yy + 0.002, 0); }
      else { put(new THREE.BoxGeometry(0.095, 0.003, 0.095), c1, mx, mz, a, 0, yy, 0); put(new THREE.BoxGeometry(0.075, 0.002, 0.075), c2, mx, mz, a, 0, yy + 0.0015, 0); put(new THREE.BoxGeometry(0.06, 0.0025, 0.06), c1, mx, mz, a, 0, yy + 0.002, 0); put(new THREE.BoxGeometry(0.04, 0.003, 0.012), c2, mx, mz, a, 0, yy + 0.0025, 0); }
    }
    for (const [dx, col] of [[-0.03, 0xf4f4f4], [0.03, 0x3a3a3a]]) { put(CYL(0.016, 0.018, 0.075, 8), 0xdfeff2, x + dx, z, 0, 0, y + 0.038, 0); put(CYL(0.017, 0.017, 0.02, 8), 0xc0c4c8, x + dx, z, 0, 0, y + 0.085, 0); put(CYL(0.012, 0.012, 0.04, 6), col, x + dx, z, 0, 0, y + 0.03, 0); }
    tentCard(x - 0.12, y, z - 0.06, 0.3 + (x * 7) % 1);
    put(new RoundedBoxGeometry(0.1, 0.07, 0.06, 1, 0.006), 0x8a5a2a, x, z + 0.08, 0, 0, y + 0.035, 0); for (let i = 0; i < 4; i++) put(CYL(0.003, 0.003, 0.12, 4), 0xc8ccd0, x - 0.03 + i * 0.02, z + 0.08, 0, 0, y + 0.1, 0);
    k.spawns.push(new THREE.Vector3(x + w * 0.22, y + 0.08, z));
  };
  const table = (x, z, w = 1.2, d = 0.8, chairs = 1) => {
    tableTop(x, z, w, d);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(new THREE.BoxGeometry(0.065, 0.69, 0.065), OAKEDGE, x, z, 0, sx * (w / 2 - 0.09), 0.345, sz * (d / 2 - 0.09));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(CYL(0.034, 0.03, 0.02, 8), 0x2a1408, x, z, 0, sx * (w / 2 - 0.09), 0.01, sz * (d / 2 - 0.09));
    const alongX = w >= d, len = alongX ? w : d;
    for (let i = 0; i < chairs; i++) for (const side of [-1, 1]) { const t = (i + 0.5) / chairs - 0.5;
      pubChair(alongX ? x + t * len : x + side * (w / 2 + 0.3), alongX ? z + side * (d / 2 + 0.3) : z + t * len, alongX ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2)); }
  };
  // tall poseur tables (dark round top on a black turned pedestal) with cream leather button-back bar chairs (photo)
  const LEATHER = 0xd8b07a, LEATHER_D = 0xb88e5a, BLACKW = 0x1a1410;
  const barChair = (x, z, ry) => {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const g = new THREE.CylinderGeometry(0.018, 0.024, 0.74, 8); g.translate(0, 0.37, 0); put(g, BLACKW, x, z, ry, sx * 0.19, 0, sz * 0.19, sz * 0.05, -sx * 0.05); }
    for (const [w, d, lx, lz] of [[0.42, 0.025, 0, -0.2], [0.42, 0.025, 0, 0.2], [0.025, 0.42, -0.2, 0], [0.025, 0.42, 0.2, 0]]) put(new THREE.BoxGeometry(w, 0.025, d), 0x2a2420, x, z, ry, lx, 0.3, lz);   // the footrest
    put(new RoundedBoxGeometry(0.5, 0.11, 0.48, 3, 0.04), LEATHER, x, z, ry, 0, 0.79, -0.01);                                     // padded seat
    put(new THREE.BoxGeometry(0.46, 0.03, 0.44), BLACKW, x, z, ry, 0, 0.73, 0);
    const back = new RoundedBoxGeometry(0.5, 0.48, 0.09, 3, 0.035), bp = back.attributes.position;                              // curved, button-tufted back
    for (let i = 0; i < bp.count; i++) { const xx = bp.getX(i) / 0.25; bp.setZ(i, bp.getZ(i) + 0.05 * xx * xx); } back.computeVertexNormals();
    put(back, LEATHER, x, z, ry, 0, 1.12, 0.22, -0.12);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const bx = -0.165 + c * 0.11 + (r % 2) * 0.055; if (Math.abs(bx) > 0.2) continue; put(new THREE.SphereGeometry(0.009, 6, 4), LEATHER_D, x, z, ry, bx, 1.0 + r * 0.12, 0.17 + 0.05 * (bx / 0.25) ** 2 - (1.0 + r * 0.12 - 1.12) * 0.12); }
    k.blockers.push({ x0: x - 0.27, x1: x + 0.27, z0: z - 0.27, z1: z + 0.27, y1: 0.85 });
  };
  const menuCard = (() => { const t = canvasTex(128, 192, (g, w, h) => { g.fillStyle = '#141414'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#e8d8b0'; g.font = '700 30px Georgia, serif'; g.textAlign = 'center'; g.fillText('BAR', w / 2, 70); g.fillText('FOOD', w / 2, 104); g.font = '400 14px Georgia, serif'; g.fillText('MENU', w / 2, 130); g.font = '400 11px Georgia, serif'; g.fillText('ask about pies', w / 2, 168); }); return t; })();
  const tentCard = (x, y, z, ry) => { const c = Math.cos(ry), s3 = Math.sin(ry);
    put(new THREE.BoxGeometry(0.12, 0.17, 0.004), 0x141414, x, z, ry, 0, y + 0.085, 0);
    for (const sd of [1, -1]) k.label('menu', 0.11, 0.16, [x + s3 * sd * 0.003, y + 0.085, z + c * sd * 0.003], [0, ry + (sd < 0 ? Math.PI : 0), 0], { tex: menuCard }); };
  const tallTable = (x, z) => {
    put(CYL(0.32, 0.32, 0.04, 24), 0x2a1810, x, z, 0, 0, 1.04, 0); put(CYL(0.325, 0.31, 0.03, 24), 0x1a0e08, x, z, 0, 0, 1.005, 0);
    const col = new THREE.LatheGeometry([[0, 0.06], [0.05, 0.06], [0.045, 0.12], [0.06, 0.18], [0.04, 0.26], [0.045, 0.6], [0.06, 0.66], [0.04, 0.72], [0.045, 0.94], [0.07, 0.97], [0.07, 0.99], [0, 0.99]].map(([a, b]) => new THREE.Vector2(a, b)), 12);
    put(col, 0x161616, x, z, 0, 0, 0, 0); put(CYL(0.26, 0.28, 0.06, 20), 0x161616, x, z, 0, 0, 0.03, 0);
    k.colliders.push({ min: new THREE.Vector3(x - 0.3, 1.0, z - 0.3), max: new THREE.Vector3(x + 0.3, 1.06, z + 0.3) });
    k.blockers.push({ x0: x - 0.3, x1: x + 0.3, z0: z - 0.3, z1: z + 0.3, y1: 1.06 });
    put(new THREE.BoxGeometry(0.095, 0.003, 0.095), 0xc8202a, x, z, 0.4, 0.12, 1.062, -0.08); put(new THREE.BoxGeometry(0.07, 0.003, 0.07), 0xffffff, x, z, 0.4, 0.12, 1.064, -0.08);
    tentCard(x - 0.08, 1.06, z + 0.06, 0.5);
    k.spawns.push(new THREE.Vector3(x + 0.1, 1.14, z));
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.4; barChair(x + Math.sin(a) * 0.62, z + Math.cos(a) * 0.62, a); }      // (facing in)
    k.pool(x, 1.05, z, 1.0, 0xffd090);
  };
  // a small two-seater on a black pedestal (cross foot), as along the panelled wall in the photo
  const smallTable = (x, z, alongX) => {
    tableTop(x, z, 0.7, 0.7);
    put(CYL(0.035, 0.035, 0.68, 8), 0x161616, x, z, 0, 0, 0.36, 0); put(CYL(0.08, 0.08, 0.04, 10), 0x161616, x, z, 0, 0, 0.7, 0);
    for (const a of [0, Math.PI / 2]) put(new THREE.BoxGeometry(0.62, 0.035, 0.06), 0x161616, x, z, a, 0, 0.02, 0);
    for (const side of [-1, 1]) pubChair(alongX ? x + side * 0.62 : x, alongX ? z : z + side * 0.62, alongX ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? 0 : Math.PI));
    candles.push([x, z]);
  };
  const candles = [];
  // a leather booth bench against a wall: along z at x (dir = which way it faces), or along x at z
  const bench = (alongZ, c, a0, a1, dir) => {
    if (alongZ) { R(c, a0, c + dir * 0.48, a1, 0.45, 0.225, DARKWOOD, { block: true }); R(c, a0, c + dir * 0.48, a1, 0.1, 0.5, REDLEATHER); R(c, a0, c + dir * 0.12, a1, 0.95, 0.475, REDLEATHER, { block: true }); for (let a = a0 + 0.5; a < a1; a += 0.5) R(c + dir * 0.12 - 0.01, a - 0.01, c + dir * 0.12 + 0.01, a + 0.01, 0.5, 0.75, 0x5a1520); }
    else { R(a0, c, a1, c + dir * 0.48, 0.45, 0.225, DARKWOOD, { block: true }); R(a0, c, a1, c + dir * 0.48, 0.1, 0.5, REDLEATHER); R(a0, c, a1, c + dir * 0.12, 0.95, 0.475, REDLEATHER, { block: true }); for (let a = a0 + 0.5; a < a1; a += 0.5) R(a - 0.01, c + dir * 0.12 - 0.01, a + 0.01, c + dir * 0.12 + 0.01, 0.5, 0.75, 0x5a1520); }
  };
  // a booth table: table against the bench, chairs on the open side facing in
  const boothTable = (x, z, alongZ, dir) => {
    if (alongZ) { table(x, z, 0.75, 1.1, 0); for (const dz of [-0.26, 0.26]) pubChair(x + dir * 0.68, z + dz, dir > 0 ? Math.PI / 2 : -Math.PI / 2); }
    else { table(x, z, 1.1, 0.75, 0); for (const dx of [-0.26, 0.26]) pubChair(x + dx, z + dir * 0.68, dir > 0 ? 0 : Math.PI); }
    candles.push([x, z]);
  };
  const freeTable = (x, z, alongZ = false) => { if (alongZ) table(x, z, 0.8, 1.2, 2); else table(x, z, 1.2, 0.8, 2); candles.push([x, z]); };
  raise(() => {
    bench(true, X(195) + 0.08, Z(605) + 0.1, Z(945), 1);                                 // "Table with booth" along the wall, right up to the end wall
    for (const py of [658, 745, 845, 930]) boothTable(X(195) + 0.95, Z(py), true, 1);
    smallTable(X(355) - 0.45, Z(655), false);                                          // a two-seater against the half wall
    smallTable(X(400) - 0.5, Z(760), false);                                         // a two-seater against the angled half wall
    freeTable(X(405), Z(818)); freeTable(X(405), Z(905));
  });
  // ================================================================ the main pub floor
  freeTable(X(515), Z(925), true); tallTable(X(605), Z(908));
  tallTable(X(596), Z(1053)); tallTable(X(596), Z(1150));                                 // two tall tables in the open floor between the pillars and the bar
  smallTable(X(370), Z(1065) - 0.5, true); smallTable(X(430), Z(1065) - 0.5, true); { const tx = X(370), tz = Z(1065) + 0.07 + 0.42; table(tx, tz, 1.2, 0.8, 0); for (const dx of [-0.3, 0.3]) pubChair(tx + dx, tz + 0.7, 0); candles.push([tx, tz]); }   // against the panelled wall tallTable(X(573), Z(1090)); freeTable(X(612), Z(1162));
  freeTable(X(370), Z(1250));
  bench(true, X(455) + 0.08, Z(1165) + 0.05, Z(1305) - 0.1, 1);                          // "Table booth" against the partition
  boothTable(X(455) + 0.95, Z(1200), true, 1);
  bench(false, Z(1305) - 0.1, X(575), X(712), -1);                                      // "Table booth" under the windows into the conservatory
  boothTable(X(612), Z(1305) - 0.95, false, -1); boothTable(X(680), Z(1305) - 0.95, false, -1);
  // the pillar in the middle, opposite the bar, with a fruit machine on its right
  const pillar = (x, z) => {
    k.texBox(0.56, H - 0.42, 0.56, x, (H - 0.42) / 2, z, BRICK, { tile: 0.75, collide: true, block: true });       // old red brick, floor to the capital
    for (const [w, h, y] of [[0.62, 0.06, H - 0.39], [0.68, 0.05, H - 0.335], [0.74, 0.12, H - 0.25], [0.8, 0.07, H - 0.155], [0.84, 0.05, H - 0.095], [0.78, 0.07, H - 0.035]]) k.box(w, h, w, x, y, z, 0xf0ebdf);   // cream moulded capital
    k.box(0.6, 0.08, 0.6, x, 0.04, z, 0x8a3a28);
    for (const [dx, dz] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) { k.box(Math.abs(dx) ? 0.03 : 0.1, 0.12, Math.abs(dz) ? 0.03 : 0.1, x + dx * 1.05, 2.1, z + dz * 1.05, 0x1a1a1a); k.cyl(0.035, 0.05, 0.08, x + dx * 1.22, 2.18, z + dz * 1.22, 0x1a1a1a, 8); sconceGlow(k, x + dx * 1.3, 2.1, z + dz * 1.3, x, z); }
  };
  const PX = X(540), PZ = Z(830);
  pillar(PX, PZ);
  pillar(X(480), Z(1065));                                                                // a matching pillar at the end of the panelled half wall
  pillar(X(455), Z(1165) - 0.35); pillar(X(290) + 0.05, Z(1305) - 0.35);                  // the two along the walkway on the left (photo)
  // dark wood posts where the plan's walls end in the open room
  for (const [x, z] of [[X(355), Z(605)], [X(715), Z(1305)], [X(790), Z(1305)]]) k.box(0.16, H - 0.5, 0.16, x, (H - 0.5) / 2, z, DARKWOOD, { block: true });
  // dark posts at every corner of the DJ booth's half walls, floor to ceiling
  for (const [x, z] of [[X(615), Z(710)], [X(475), Z(605)], [X(475), Z(665)], [X(515), Z(705)], [X(535), Z(705)]]) { k.box(0.16, H, 0.16, x, H / 2, z, DARKWOOD, { block: true }); k.box(0.2, 0.06, 0.2, x, 1.13, z, 0x2a1a10); }
  // DJ booth: decks, mixer, speakers, a light bar
  { const x0 = X(475), x1 = X(615), z0 = Z(605), z1 = Z(705);
    R(X(495), z0 + 0.1, X(600), z0 + 0.75, 0.95, 0.475, 0x1a1a1a, { collide: true, block: true });
    for (const dx of [-0.45, 0.45]) { k.cyl(0.16, 0.16, 0.03, (X(495) + X(600)) / 2 + dx, 0.97, z0 + 0.42, 0x333333, 16); k.cyl(0.02, 0.02, 0.04, (X(495) + X(600)) / 2 + dx, 0.99, z0 + 0.42, 0xd0d0d0, 6); }
    R((X(495) + X(600)) / 2 - 0.15, z0 + 0.25, (X(495) + X(600)) / 2 + 0.15, z0 + 0.6, 0.05, 0.98, 0x222222);
    for (const x of [X(482), x1 - 0.25]) { R(x - 0.2, z0 + 0.05, x + 0.2, z0 + 0.45, 1.3, 0.65, 0x111111, { block: true }); for (const y of [0.4, 0.95]) k.cyl(0.13, 0.13, 0.02, x, y, z0 + 0.46, 0x333333, 14); }
    for (let i = 0; i < 6; i++) k.lamp(x0 + 0.4 + i * 0.5, H - 0.25, z0 + 0.4, [0xff2a6a, 0x2a8aff, 0x39ff14, 0xffd400, 0xff2a6a, 0x2a8aff][i], 0.06);
    R(x0, z0 + 0.3, x1, z0 + 0.34, 0.06, H - 0.2, 0x111111);
    k.label('DJ BOOTH — NO REQUESTS FOR "THE PIE SONG"', 1.4, 0.3, [(X(495) + X(600)) / 2, 0.55, z0 + 0.756], [0, 0, 0], { bg: '#111', fg: '#ff4fa3', border: '#ff4fa3', size: 40, glow: true });   // on the front of the DJ desk
    k.spawns.push(new THREE.Vector3((X(495) + X(600)) / 2, 1.05, z0 + 0.65));
  }

  // ================================================================ the bar, from the photo of the real one
  // oak counter with raised and fielded panels, a polished top with a rounded nosing, green drip mats, chrome
  // fonts and hand pumps, a foot rail on little posts; one open space behind it (in at the right-hand end,
  // through the flap), a tiled back bar with optics under cream arched panelling, globe lights on the canopy
  const OAK1 = 0x8a5a30, OAK2 = 0x9a6a3a, OAKD = 0x5a3418, TOPC = 0x5a3216, CHROMEC = 0xd8dce0, RAILC = 0x6a5a3a;
  const counter = (ax, ay, bx, by, depth = 0.55, side = 1) => {
    const x0 = X(ax), z0 = Z(ay), x1 = X(bx), z1 = Z(by), dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, ry = Math.atan2(-dz, dx);
    const nx = -uz * side, nz = ux * side;      // into the bar
    const at = (s2, o) => [x0 + ux * s2 + nx * o, z0 + uz * s2 + nz * o];
    const bx2 = (w, h, d, s2, y, o, col) => { const [px, pz] = at(s2, o); k.box(w, h, d, px, y, pz, col, { rot: [0, ry, 0] }); };
    bx2(L, 1.02, depth, L / 2, 0.51, depth / 2, OAK1);                                                         // the carcass
    bx2(L, 0.1, 0.03, L / 2, 0.06, -0.005, OAKD);                                                              // plinth
    // raised & fielded panels: stiles, rails, a bevelled field in each
    const n = Math.max(1, Math.round(L / 0.62)), pw = L / n;
    for (let i = 0; i <= n; i++) bx2(0.07, 0.86, 0.035, i * pw, 0.55, -0.012, OAK2);
    for (const y of [0.15, 0.95]) bx2(L, 0.08, 0.035, L / 2, y, -0.012, OAK2);
    for (let i = 0; i < n; i++) { bx2(pw - 0.16, 0.64, 0.02, (i + 0.5) * pw, 0.55, -0.02, OAK1); bx2(pw - 0.24, 0.54, 0.015, (i + 0.5) * pw, 0.55, -0.03, 0x93623a); }
    // the top: polished, a rounded nosing along the front, a lip on the staff side
    bx2(L + 0.02, 0.05, depth + 0.08, L / 2, 1.055, depth / 2 - 0.04, TOPC);
    { const [px, pz] = at(L / 2, -0.07); const nose = new THREE.CylinderGeometry(0.03, 0.03, L + 0.02, 10); nose.rotateZ(Math.PI / 2); nose.rotateY(ry); k.parts.push(part(nose, TOPC, [px, 1.055, pz])); }
    // green rubber drip mats along it
    for (let s2 = 0.3; s2 < L - 0.5; s2 += 1.0) bx2(0.6, 0.008, 0.2, s2 + 0.3, 1.084, depth * 0.55, 0x1e5a32);
    // foot rail on short posts with brackets
    { const [px, pz] = at(L / 2, -0.2); const rail = new THREE.CylinderGeometry(0.022, 0.022, L, 10); rail.rotateZ(Math.PI / 2); rail.rotateY(ry); k.parts.push(part(rail, RAILC, [px, 0.14, pz])); }
    for (let s2 = 0.3; s2 < L; s2 += 0.9) { const [px, pz] = at(s2, -0.2); k.cyl(0.012, 0.016, 0.13, px, 0.065, pz, RAILC, 8); bx2(0.025, 0.025, 0.2, s2, 0.14, -0.1, RAILC); }
    for (let s2 = 0; s2 <= L; s2 += 0.18) { const [x, z] = at(s2, depth / 2); blk(x - depth / 2, z - depth / 2, x + depth / 2, z + depth / 2, 1.1); k.colliders.push({ min: new THREE.Vector3(x - 0.15, 1.0, z - 0.15), max: new THREE.Vector3(x + 0.15, 1.12, z + 0.15) }); }
    for (let s2 = 0.6; s2 < L - 0.3; s2 += 1.3) { const [x, z] = at(s2, 0.25); k.spawns.push(new THREE.Vector3(x, 1.2, z)); }
    // glass shelf, glasses and the glass washer under the bar on the staff side
    bx2(L - 0.1, 0.03, 0.25, L / 2, 0.55, depth + 0.12, 0x6a4a2a);
    for (let s2 = 0.15; s2 < L - 0.1; s2 += 0.09) { const [px, pz] = at(s2, depth + 0.12); k.cyl(0.032, 0.026, 0.14, px, 0.64, pz, 0xd8eef2, 8); }
    return { x0, z0, ux, uz, nx, nz, L, ry, at };
  };
  const bar1 = counter(695, 605, 695, 845, 0.55, -1);
  const bar2 = counter(695, 845, 735, 965, 0.55, -1);
  counter(735, 965, 795, 985, 0.55, -1);
  const bar4 = counter(795, 985, 795, 1230, 0.36, -1);
  // the fonts: chrome T-bars with round blue and white badges, and a few hand pumps with clips
  const font = (b, s2) => { const [x, z] = b.at(s2, 0.3);
    k.cyl(0.04, 0.045, 0.04, x, 1.1, z, CHROMEC, 12); k.cyl(0.022, 0.022, 0.32, x, 1.28, z, CHROMEC, 10);
    const bar = new THREE.CylinderGeometry(0.02, 0.02, 0.26, 10); bar.rotateZ(Math.PI / 2); bar.rotateY(b.ry); k.parts.push(part(bar, CHROMEC, [x, 1.44, z]));
    for (const o of [-0.1, 0, 0.1]) { const tx = x + b.ux * o - b.nx * 0.03, tz = z + b.uz * o - b.nz * 0.03; k.cyl(0.008, 0.008, 0.07, tx, 1.39, tz, CHROMEC, 6);
      const badge = new THREE.CylinderGeometry(0.035, 0.035, 0.012, 16); badge.rotateX(Math.PI / 2); badge.rotateY(b.ry); k.parts.push(part(badge, [0x1f6fd0, 0xf2f2f2, 0x1f4fbf][Math.round(o * 10 + 1)], [x + b.ux * o - b.nx * 0.025, 1.5, z + b.uz * o - b.nz * 0.025])); } };
  const pump = (b, s2, clip) => { const [x, z] = b.at(s2, 0.3);
    k.cyl(0.035, 0.04, 0.04, x, 1.1, z, 0x2a1a10, 10); k.cyl(0.015, 0.02, 0.36, x, 1.3, z, 0x111111, 8); k.parts.push(part(new THREE.SphereGeometry(0.022, 8, 6), 0x111111, [x, 1.49, z]));
    const c = new THREE.BoxGeometry(0.07, 0.09, 0.008); c.rotateY(b.ry); k.parts.push(part(c, clip, [x - b.nx * 0.025, 1.36, z - b.nz * 0.025])); k.cyl(0.006, 0.006, 0.06, x - b.nx * 0.04, 1.14, z - b.nz * 0.04, CHROMEC, 6); };
  for (const s2 of [0.9, 2.1, 3.6, 4.8]) font(bar1, s2); for (const [s2, c] of [[1.5, 0xd4af37], [2.7, 0x2e7d32], [3.0, 0xc8102e]]) pump(bar1, s2, c);
  for (const s2 of [0.8, 2.6, 4.4]) font(bar4, s2); pump(bar4, 1.7, 0xd4af37);
  { const [x, z] = bar1.at(5.4, 0.3); R(x - 0.15, z - 0.12, x + 0.15, z + 0.12, 0.22, 1.19, 0x222222); R(x - 0.12, z - 0.1, x + 0.12, z + 0.1, 0.16, 1.4, 0x2a6ad8); }      // the till
  // the floor at the bar: one smooth sweep of diagonal slate along the front (following the counter round its
  // bends, curving out to meet the walkway), and terracotta quarry tiles all through the space behind the bar
  { const flr = (pts, tex, scale, rot, order) => {
      const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z))), 24); g.rotateX(Math.PI / 2);
      const uv = g.attributes.uv, pa = g.attributes.position, c = Math.cos(rot), s2 = Math.sin(rot);
      for (let i = 0; i < uv.count; i++) { const x = pa.getX(i), z = pa.getZ(i); uv.setXY(i, (x * c - z * s2) / scale, (x * s2 + z * c) / scale); }
      const t = tex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping;
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
      m.position.y = order === 30 ? 0.006 : 0.005; scene.add(m); };
    // the counter's customer face, as a smooth curve
    const path = new THREE.CatmullRomCurve3([[695, 605], [695, 800], [705, 880], [735, 955], [775, 982], [795, 1010], [795, 1245]].map(([x, z]) => new THREE.Vector3(X(x), 0, Z(z))), false, 'centripetal').getPoints(60);
    // the outer edge: 1.5m out from the counter, with a gentle wave, sweeping round at the ends
    const outer = path.map((p, i) => { const q = path[Math.min(path.length - 1, i + 1)], r = path[Math.max(0, i - 1)], dx = q.x - r.x, dz = q.z - r.z, L = Math.hypot(dx, dz) || 1;
      const w = 1.5 + 0.18 * Math.sin(i * 0.35); return [p.x - (dz / L) * w, p.z + (dx / L) * w]; });
    const front = path.map(p => [p.x, p.z]);
    // (the walkway at the end of the bar is slate too)
    flr([...front.slice().reverse(), ...outer.map(([x, z]) => [x, z])], tileTex('#3e3c3a', '#383634', '#262422', 72), 0.9, Math.PI / 4, 30);
    flr([[X(795) - 1.6, Z(1245)], [X(895), Z(1245)], [X(895), Z(1305)], [X(735), Z(1305)], [X(735), Z(1290)]], tileTex('#3e3c3a', '#383634', '#262422', 72), 0.9, Math.PI / 4, 30);
    flr([...front, [X(895), Z(1245)], [X(895), Z(925)], [X(855), Z(925)], [X(855), Z(605)]], tileTex('#a8583a', '#9c5034', '#6e3422', 56), 0.45, 0, 31);
  }
  // the back bar: along the back wall (with the staff-room door in it) and the shallow run behind the long bit
  const OPT = [0x6a1a1a, 0xd4a017, 0xe8e8e8, 0x2e5a2a, 0x8a4a1a, 0x1f3f8a, 0xc0c0c0, 0x7a2a5a, 0xf0d8a0];
  const metro = canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#c8ccc8'; g.fillRect(0, 0, w, h); for (let r = 0; r < 4; r++) for (let c = -1; c < 4; c++) { const x = c * 32 + (r % 2) * 16, y = r * 16; g.fillStyle = '#f6f7f4'; g.fillRect(x + 1, y + 1, 30, 14); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x + 2, y + 2, 26, 3); } });
  const fridgeDoor = canvasTex(128, 160, (g, w, h) => { g.fillStyle = '#0c0e10'; g.fillRect(0, 0, w, h); for (const y of [40, 95, 150]) { g.fillStyle = '#d8e8f0'; g.fillRect(4, y, w - 8, 3); for (let x = 8; x < w - 8; x += 11) { g.fillStyle = ['#3a7a2a', '#d4a017', '#8a2a1a', '#e8e8e8', '#2a4a8a'][(x / 11 | 0) % 5]; g.fillRect(x, y - 30, 8, 30); g.fillRect(x + 2, y - 38, 4, 8); } } g.fillStyle = 'rgba(200,230,255,0.12)'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9aa0a6'; g.lineWidth = 6; g.strokeRect(0, 0, w, h); });
  const bottle = (x, y, z, col, up = true) => {
    const s2 = up ? 1 : -1;
    k.cyl(0.035, 0.035, 0.2, x, y + s2 * 0.1, z, col, 8); k.cyl(0.012, 0.033, 0.06, x, y + s2 * 0.23, z, col, 8); k.cyl(0.012, 0.012, 0.06, x, y + s2 * 0.29, z, col, 6);
    k.cyl(0.036, 0.036, 0.07, x, y + s2 * 0.1, z, 0xf0e8d0, 8);                                          // label
    if (!up) { k.cyl(0.02, 0.02, 0.07, x, y + 0.36 * s2 - 0.0, z, 0xe8f4f8, 8); k.cyl(0.024, 0.024, 0.02, x, y + 0.405 * s2, z, CHROMEC, 8); }    // the optic
  };
  const backBar = (W, za, zb, deep, skip = []) => {      // along z against a wall at x = W, facing -x (skip: spans with no fridge door)
    const zc = (za + zb) / 2, len = zb - za;
    if (deep) {
      R(W - 0.55, za, W, zb, 0.88, 0.44, 0x4a2c18, { collide: true, block: true });
      for (let z = za + 0.05; z < zb - 0.6; z += 0.66) if (!skip.some(([a, b]) => z + 0.62 > a && z < b)) k.label('fridge', 0.6, 0.72, [W - 0.555, 0.44, z + 0.32], [0, -Math.PI / 2, 0], { tex: fridgeDoor, glow: true });
      R(W - 0.6, za, W, zb, 0.04, 0.9, 0x6a4a2a, { collide: true });
      for (let z = za + 0.2; z < zb - 0.1; z += 0.5) k.spawns.push(new THREE.Vector3(W - 0.3, 0.98, z));
    }
    k.texBox(0.02, 0.58, len, W - 0.01, 1.21, zc, metro, { tile: 0.3 });                                    // white metro tiles
    R(W - 0.14, za, W, zb, 0.03, 1.52, 0x2a1a10);                                                            // the optics rail
    for (let z = za + 0.08, i = 0; z < zb - 0.05; z += 0.13, i++) bottle(W - 0.08, 1.92, z, OPT[i % OPT.length], false);
    // cream arched panelling above, a shelf of bottles in each arch, brick piers between
    const bays = Math.max(1, Math.round(len / 1.3)), bw = len / bays;
    for (let b = 0; b < bays; b++) {
      const z0 = za + b * bw, z1 = z0 + bw, mz = (z0 + z1) / 2;
      k.texBox(0.03, 0.6, bw - 0.3, W - 0.015, 2.25, mz, TNG, { tile: 0.4 });
      const arch = new THREE.TorusGeometry((bw - 0.3) / 2, 0.025, 6, 16, Math.PI); arch.rotateY(Math.PI / 2); k.parts.push(part(arch, 0xf4efe2, [W - 0.04, 2.38, mz], [0, 0, 0], [1, 0.4, 1]));
      R(W - 0.2, z0 + 0.15, W, z1 - 0.15, 0.03, 2.0, 0xf4efe2, { collide: true });
      for (let z = z0 + 0.25, i = b; z < z1 - 0.2; z += 0.11, i++) bottle(W - 0.1, 2.015, z, OPT[(i * 3) % OPT.length]);
      k.lamp(W - 0.1, 2.5, mz, 0xffe0b0, 0.05);
      if (b > 0) k.texBox(0.06, 1.25, 0.3, W - 0.03, 2.12, z0, BRICK, { tile: 0.6 });
    }
  };
  backBar(X(855) - 0.08, Z(612), Z(920), true, [[Z(600), Z(640)]]);                                    // one long back bar (the staff room's way in is from the far end)
  backBar(X(895) - 0.08, Z(1012), Z(1228), true, [[Z(1015) + 0.7, Z(1015) + 1.35]]);
  // ...and fitted out like a real bar: a double sink with a mixer tap, the glass washer, an ice well, a bottle bin,
  // mixers and cordials, racks of clean glasses, bar towels, the drip trays and the cash register
  { const W = X(895) - 0.08, z0 = Z(1015);
    R(W - 0.56, z0 + 0.1, W - 0.06, z0 + 0.62, 0.02, 0.905, 0xc8ccd2); for (const dz of [0.24, 0.48]) R(W - 0.5, z0 + dz - 0.1, W - 0.12, z0 + dz + 0.08, 0.012, 0.89, 0x8a9098);   // double sink
    k.cyl(0.015, 0.015, 0.28, W - 0.08, 1.05, z0 + 0.36, 0xd8dce0, 8); { const sp = new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8); sp.rotateZ(Math.PI / 2); k.parts.push(part(sp, 0xd8dce0, [W - 0.16, 1.18, z0 + 0.36])); }
    R(W - 0.575, z0 + 0.75, W - 0.55, z0 + 1.3, 0.62, 0.36, 0xb8bcc2); R(W - 0.585, z0 + 0.78, W - 0.575, z0 + 1.27, 0.12, 0.6, 0x2a2a2a); k.box(0.02, 0.03, 0.03, W - 0.59, 0.6, z0 + 1.02, 0x4caf50);   // glass washer (built in)
    R(W - 0.56, z0 + 1.4, W - 0.06, z0 + 1.85, 0.03, 0.905, 0xc8ccd2); for (let i = 0; i < 40; i++) k.parts.push(part(new THREE.BoxGeometry(0.03, 0.03, 0.03), 0xe8f6fa, [W - 0.5 + (i % 8) * 0.055, 0.93, z0 + 1.45 + Math.floor(i / 8) * 0.075], [i, i * 2, 0]));   // ice well
    k.cyl(0.16, 0.14, 0.48, W - 0.8, 0.24, z0 + 4.9, 0x1a4a8a, 10, { block: true }); for (let i = 0; i < 7; i++) k.cyl(0.025, 0.025, 0.22, W - 0.86 + (i % 3) * 0.06, 0.53, z0 + 4.85 + Math.floor(i / 3) * 0.05, 0x1e5a24, 8);   // bottle bin
    for (let i = 0; i < 6; i++) { k.cyl(0.03, 0.03, 0.2, W - 0.3, 1.0, z0 + 2.6 + i * 0.09, [0xd32f2f, 0xffffff, 0x2e7d32, 0xff9800, 0x5d4037, 0xffeb3b][i], 8); k.cyl(0.012, 0.012, 0.05, W - 0.3, 1.12, z0 + 2.6 + i * 0.09, 0x222222, 6); }   // mixers & cordials
    for (let r2 = 0; r2 < 3; r2++) for (let i = 0; i < 8; i++) k.cyl(0.03, 0.025, 0.12, W - 0.48 + r2 * 0.07, 0.98, z0 + 3.3 + i * 0.07, 0xd8eef2, 8);   // a rack of clean glasses
    R(W - 0.06, z0 + 0.62, W - 0.04, z0 + 0.72, 0.3, 0.75, 0x2e6a9a); R(W - 0.06, z0 + 3.0, W - 0.04, z0 + 3.1, 0.3, 0.75, 0xffffff);   // bar towels
    R(W - 0.38, z0 + 4.2, W - 0.06, z0 + 4.55, 0.2, 1.0, 0x222222); R(W - 0.35, z0 + 4.22, W - 0.09, z0 + 4.53, 0.12, 1.16, 0x2a6ad8);   // cash register
    k.spawns.push(new THREE.Vector3(W - 0.3, 0.98, z0 + 2.9));
  }
  // the working side of the counter: a speed rail of spirits, shakers, a garnish tray (lemons, limes), a stack of trays,
  // boxes of crisps and nuts, a glass-washer basket, bar blades, a radio, a pint glass tower, under-counter fridges
  for (const b of [bar1, bar4]) {
    for (let s2 = 0.4; s2 < b.L - 0.3; s2 += 0.07) { const [x, z] = b.at(s2, 0.68); k.cyl(0.03, 0.03, 0.22, x, 0.82, z, [0x6a1a1a, 0xd4a017, 0xe8e8e8, 0x2e5a2a, 0x8a4a1a, 0x1f3f8a][Math.round(s2 * 14) % 6], 8); k.cyl(0.011, 0.011, 0.05, x, 0.955, z, 0x333333, 6); }
    { const [x, z] = b.at(b.L * 0.6, 0.66); R(x - 0.06, z - 0.06, x + 0.06, z + 0.06, 0.4, 0.5, 0x3a3e44); }
    for (let s2 = 0.9; s2 < b.L - 0.6; s2 += 1.6) { const [x, z] = b.at(s2, 0.43);
      R(x - 0.15, z - 0.08, x + 0.15, z + 0.08, 0.03, 1.1, 0x1a1a1a); for (let i = 0; i < 6; i++) k.cyl(0.025, 0.025, 0.006, x - 0.12 + i * 0.045, 1.12, z + (i % 2 ? 0.03 : -0.03), i % 3 ? 0xf2e050 : 0x7ac83a, 10);   // garnish tray
      k.cyl(0.045, 0.04, 0.2, x + 0.25, 1.18, z, 0xc8ccd0, 10); k.cyl(0.03, 0.045, 0.08, x + 0.25, 1.32, z, 0xc8ccd0, 10); }                                                                                   // shaker
    { const [x, z] = b.at(0.5, 0.42); for (let i = 0; i < 5; i++) k.cyl(0.045, 0.035, 0.15, x, 1.18 + i * 0.12, z, 0xe8f4f8, 10); }       // a tower of pint glasses
  }
  { const W2 = X(855) - 0.62;
    for (const [z, col, lbl] of [[Z(640), 0xc8102e, 'CRISPS'], [Z(660), 0x1e5aa8, 'S&V'], [Z(680), 0xd4a017, 'NUTS']]) { R(W2 - 0.3, z - 0.18, W2, z + 0.18, 0.3, 1.05, col); }
    for (let i = 0; i < 8; i++) R(W2 - 0.3, Z(700) - 0.18, W2, Z(700) + 0.18, 0.012, 0.92 + i * 0.014, i % 2 ? 0x2a2a2a : 0x3a3a3a);   // a stack of round trays
    R(W2 - 0.25, Z(720) - 0.1, W2 - 0.05, Z(720) + 0.1, 0.12, 0.98, 0x8a1a1a); k.cyl(0.03, 0.03, 0.01, W2 - 0.15, 1.04, Z(720) - 0.1, 0xc8c8c8, 8);   // a radio
  }
  // under the counter on the staff side: drip trays, a second sink, a bin, more glasses
  for (const b of [bar1, bar4]) { const [x, z] = b.at(b.L * 0.35, 0.62); k.cyl(0.16, 0.14, 0.5, x + b.nx * 0.2, 0.25, z + b.nz * 0.2, 0x2e2e2e, 10); }
  // along the top wall: the MONSTOR fridge and the coffee machine, a chalkboard
  // the MONSTOR fridge behind the bar: black cabinet glowing green inside, four shelves packed with cans behind two
  // glass doors (chrome handles), a lit MONSTOR header, a drip tray of empties and a promo sticker
  { const fx0 = X(760), fx1 = X(830), fz0 = Z(605) + 0.08, fz1 = Z(605) + 0.62, FH = 1.95, fxc = (fx0 + fx1) / 2;
    R(fx0, fz0, fx1, fz1, 0.12, 0.06, 0x111111); R(fx0, fz0, fx1, fz1, 0.1, FH - 0.05, 0x111111); R(fx0, fz0, fx1, fz0 + 0.05, FH, FH / 2, 0x0e2a12);
    for (const x of [fx0 + 0.03, fx1 - 0.03]) R(x - 0.03, fz0, x + 0.03, fz1, FH, FH / 2, 0x111111);
    const CANS = [[0x111111, 0x7cff3a], [0x111111, 0xff9a1f], [0x111111, 0x3ac8ff], [0xc8102e, 0xffffff]];
    [0.16, 0.58, 1.0, 1.42].forEach((y, li) => { R(fx0 + 0.06, fz0 + 0.06, fx1 - 0.06, fz1 - 0.04, 0.02, y, 0x9aa0a6, { collide: true });
      for (let x = fx0 + 0.12, i = 0; x < fx1 - 0.1; x += 0.075, i++) for (const dz of [0.15, 0.3]) { const [bod, band] = CANS[(i + li * 2 + (dz > 0.2 ? 1 : 0)) % 4], z = fz0 + dz + 0.06;
        k.cyl(0.033, 0.033, 0.12, x, y + 0.072, z, bod, 10); k.cyl(0.0335, 0.0335, 0.035, x, y + 0.08, z, band, 10); k.cyl(0.027, 0.033, 0.012, x, y + 0.138, z, 0xc0c4c8, 10); }
      k.spawns.push(new THREE.Vector3(fxc, y + 0.1, fz1 - 0.15)); });
    for (const y of [0.45, 0.87, 1.29, 1.71]) k.lamp(fxc, y, fz0 + 0.1, 0x6aff4a, 0.05, false);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(fx1 - fx0 - 0.1, FH - 0.25), new THREE.MeshLambertMaterial({ color: 0xdff0f4, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
    gl.position.set(fxc, 0.12 + (FH - 0.25) / 2, fz1 + 0.005); gl.renderOrder = 3; scene.add(gl);
    for (const x of [fx0 + 0.03, fxc, fx1 - 0.03]) R(x - 0.025, fz1, x + 0.025, fz1 + 0.03, FH - 0.15, FH / 2, 0x111111);
    for (const y of [0.13, FH - 0.12]) R(fx0, fz1, fx1, fz1 + 0.03, 0.05, y, 0x111111);
    for (const x of [fxc - 0.07, fxc + 0.07]) k.box(0.025, 0.6, 0.03, x, 1.05, fz1 + 0.05, 0xc8ccd0);
    R(fx0, fz1, fx1, fz1 + 0.04, 0.28, FH + 0.1, 0x111111);
    const hdr = canvasTex(512, 96, (g, w, h) => { g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, w, h); g.fillStyle = '#39ff14'; g.font = '900 64px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MONSTOR', w / 2, h / 2 + 2); g.strokeStyle = '#39ff14'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12); });
    k.label('MONSTOR', fx1 - fx0 - 0.1, 0.24, [fxc, FH + 0.1, fz1 + 0.042], [0, 0, 0], { tex: hdr, glow: true });
    k.pool(fxc, 0, fz1 + 0.6, 1.8, 0x9fffb0); blk(fx0, fz0, fx1, fz1 + 0.06, FH + 0.2);
  }
  R(X(700) + 0.65, Z(605) + 0.08, X(745), Z(605) + 0.62, 0.9, 0.45, 0x4a2c18, { collide: true, block: true });
  R(X(700) + 0.8, Z(605) + 0.15, X(700) + 1.25, Z(605) + 0.5, 0.45, 1.13, 0x2a2a2a); k.cyl(0.02, 0.02, 0.1, X(700) + 0.95, 0.98, Z(605) + 0.5, CHROMEC, 6); k.cyl(0.02, 0.02, 0.1, X(700) + 1.1, 0.98, Z(605) + 0.5, CHROMEC, 6);   // coffee machine
  k.label('COFFEES — CAPPUCCINO · LATTE · AMERICANO (RONNIE: ONE OF EACH)', 0.7, 0.45, [X(700) + 1.0, 1.75, Z(605) + 0.1], [0, 0, 0], { bg: '#1f3f8a', fg: '#fff', border: '#fff', size: 34 });
  k.label("THE OYSTERFLEET", 1.75, 0.36, [X(695) - 0.155, 2.81, (Z(605) + Z(845)) / 2], [0, -Math.PI / 2, 0], { tex: pubSignTex(), glow: true });   // on the canopy front, over the bar
  { const [x, z] = bar1.at(5.0, -0.3); k.box(0.05, 1.6, 0.05, x, 0.8, z, 0x2a1a10); k.box(0.55, 0.95, 0.04, x, 1.55, z, 0x5a3a20, { rot: [0, bar1.ry, 0] });
    k.label("TODAY'S ALES: OYSTER STOUT · RONNIE'S RUIN · PIE & PINT £9.99", 0.44, 0.62, [x - bar1.nx * 0.025, 1.55, z - bar1.nz * 0.025], [0, bar1.ry, 0], { bg: '#1a1a1a', fg: '#f5f0e6', border: null, size: 34 }); }
  // the canopy over the bar: cream tongue-and-groove with a grey trim, ribbed glass globe lights hanging off it
  const CY = 2.62;
  for (const [x0, z0, x1, z1] of [[X(695) - 0.25, Z(605), X(855), Z(925)], [X(695) - 0.25, Z(845), X(835), Z(985) + 0.3], [X(795) - 0.25, Z(985), X(895), Z(1245)], [X(835), Z(925), X(895), Z(985)]]) R(x0, z0, x1, z1, 0.05, CY, 0xf4efe2);
  for (const b of [bar1, bar2, bar4]) { const [px, pz] = b.at(b.L / 2, -0.12);
    if (Math.abs(b.uz) > 0.95) k.texBox(0.06, H - CY, b.L + 0.1, px, CY + (H - CY) / 2, pz, TNG, { tile: 0.5 }); else k.box(b.L + 0.1, H - CY, 0.06, px, CY + (H - CY) / 2, pz, 0xf1e9d6, { rot: [0, b.ry, 0] });
    k.box(b.L + 0.12, 0.06, 0.1, px, CY - 0.01, pz, 0x7a7e80, { rot: [0, b.ry, 0] }); }
  { const [px, pz] = [X(765) - 0.12 * 0.32, Z(975) + 0.12]; const b3 = Math.hypot(X(795) - X(735), Z(985) - Z(965)); k.box(b3, H - CY, 0.06, (X(735) + X(795)) / 2 - 0.04, CY + (H - CY) / 2, (Z(965) + Z(985)) / 2 + 0.11, 0xf1e9d6, { rot: [0, Math.atan2(-(Z(985) - Z(965)), X(795) - X(735)), 0] }); }
  const globe = (x, z) => {
    k.cyl(0.004, 0.004, 0.42, x, CY - 0.21, z, 0x222222, 4); k.cyl(0.03, 0.045, 0.06, x, CY - 0.44, z, 0xb87333, 10);          // copper cap
    for (let i = 0; i < 6; i++) { const r = new THREE.TorusGeometry(0.11, 0.004, 4, 16); r.rotateY(i / 6 * Math.PI); k.parts.push(part(r, 0xf0e6c8, [x, CY - 0.58, z])); }   // the ribs
    k.lamp(x, CY - 0.58, z, 0xffe2a8, 0.1); k.pool(x, 1.1, z, 0.9, 0xffc070); k.pool(x, 0, z, 1.4, 0xffb060);
  };
  for (const b of [bar1, bar4]) for (let s2 = 0.6; s2 < b.L; s2 += 1.3) { const [x, z] = b.at(s2, 0.2); globe(x, z); }
  { const [x, z] = bar2.at(bar2.L / 2, 0.2); globe(x, z); }
  for (let z = Z(640); z < Z(920); z += 1.1) k.lamp(X(800), CY - 0.02, z, 0xfffbe8, 0.035);
  // the cream bulkhead over the raised area's edge
  k.texBox(X(455) - X(195), 0.45, 0.3, (X(195) + X(455)) / 2, H - 0.225, Z(965), TNG, { tile: 0.6 }); k.box(X(455) - X(195) + 0.02, 0.1, 0.32, (X(195) + X(455)) / 2, H - 0.5, Z(965), DARKWOOD);
  k.label("TIP JAR: RONNIE'S PASTY FUND", 0.4, 0.2, [X(695) - 0.05, 0.85, Z(770)], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', size: 40 });

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
  barChair(PX + 0.81 + 0.72, PZ, Math.PI / 2);                                            // a tall chair to sit at it
  // a tall leafy fig in a pot on the machine's right
  { const fx = PX + 0.62, fz = PZ - 0.8;
    k.cyl(0.22, 0.17, 0.42, fx, 0.21, fz, 0x2a2420, 14, { block: true }); k.cyl(0.215, 0.215, 0.02, fx, 0.4, fz, 0x3a2a1a, 14);
    for (let i = 0; i < 3; i++) { const g = new THREE.CylinderGeometry(0.012, 0.02, 1.3, 6); g.rotateZ((i - 1) * 0.12); g.rotateY(i * 2.1); g.translate(fx + (i - 1) * 0.03, 1.05, fz); k.parts.push(part(g, 0x6a4a2a)); }
    let sd = 7; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 260; i++) { const a = r() * 6.28, h = 0.75 + r() * 1.2, rad = (0.12 + r() * 0.3) * (1 - Math.abs(h - 1.35) * 0.45);
      const leaf = new THREE.SphereGeometry(0.045, 6, 4); leaf.scale(1, 0.25, 0.55); leaf.rotateZ(r() - 0.5); leaf.rotateY(a);
      k.parts.push(part(leaf, [0x2e6a2a, 0x3a7a32, 0x24561f, 0x4a8a3a][i % 4], [fx + Math.cos(a) * rad, h, fz + Math.sin(a) * rad])); }
  }
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
    k.label("STAFF FOOD ALLOWANCE: ONE (1) BAG OF CRISPS. RONNIE THIS MEANS YOU. — THE GAFFER", 1.3, 0.7, [x0 + 1.0, 1.6, z0 + 0.09], [0, 0, 0], { bg: '#fff', fg: '#111' });
    k.label('STAFF ROOM', 0.9, 0.2, [X(855) - 0.09, 2.45, Z(950)], [0, -Math.PI / 2, 0], { bg: '#1b3a2a', fg: '#d4af37', border: null, size: 60 });
    k.lamp((x0 + x1) / 2, H - 0.02, (z0 + z1) / 2, 0xffffff, 0.12);
  }
  { const x0 = X(895), x1 = X(1045), z0 = Z(975), z1 = Z(1305);
    for (let i = 0; i < 12; i++) { const x = x1 - 0.4 - (i % 3) * 0.55, z = z0 + 0.6 + Math.floor(i / 3) * 0.7; k.cyl(0.22, 0.22, 0.6, x, 0.3, z, 0xb8bcc2, 14, { block: true, collide: true }); k.cyl(0.05, 0.05, 0.08, x, 0.64, z, 0x333333, 8); for (const y of [0.08, 0.52]) k.cyl(0.225, 0.225, 0.04, x, y, z, 0x8a9098, 14); }   // beer kegs
    // the cellar: racking of cases and crates down the side, gas lines from every keg up to a panel of regulators, the
    // cellar cooler on the wall, stacks of empty kegs, a pallet truck, cases of crisps and wine, a mop sink, the log sheet
    for (const y of [0.1, 0.75, 1.4, 2.05]) R(x0 + 0.1, z0 + 1.6, x0 + 0.6, z0 + 5.4, 0.04, y, 0x2e6ab8, { collide: true });
    for (const z of [z0 + 1.6, z0 + 3.5, z0 + 5.4]) for (const x of [x0 + 0.1, x0 + 0.6]) R(x - 0.025, z - 0.025, x + 0.025, z + 0.025, 2.2, 1.1, 0xff8a1f);
    blk(x0 + 0.08, z0 + 1.58, x0 + 0.62, z0 + 5.42, 2.2);
    let ci = 0; for (const y of [0.12, 0.77, 1.42]) for (let z = z0 + 1.7; z < z0 + 5.2; z += 0.42, ci++) { const t = ci % 4;
      if (t === 0) { R(x0 + 0.14, z, x0 + 0.56, z + 0.36, 0.26, y + 0.15, 0x1e6a32); for (let i = 0; i < 6; i++) k.cyl(0.028, 0.028, 0.08, x0 + 0.2 + (i % 3) * 0.12, y + 0.32, z + 0.1 + Math.floor(i / 3) * 0.16, 0x1e4a1e, 6); }   // crates of bottles
      else if (t === 1) R(x0 + 0.14, z, x0 + 0.56, z + 0.36, 0.3, y + 0.17, 0xc8a070);                                   // cases
      else if (t === 2) { R(x0 + 0.14, z, x0 + 0.56, z + 0.36, 0.28, y + 0.16, 0xd8202a); R(x0 + 0.13, z + 0.08, x0 + 0.14, z + 0.28, 0.1, y + 0.16, 0xffd400); }   // crisps
      else R(x0 + 0.14, z, x0 + 0.56, z + 0.36, 0.32, y + 0.18, 0x7a1a2a); }                                                // wine
    // the gas lines and regulator panel (CO2 and mixed gas) on the end wall, a line to each keg
    R(x1 - 0.14, z0 + 0.1, x1 - 0.1, z0 + 1.4, 0.8, 1.7, 0xe8e8e8);
    for (let i = 0; i < 6; i++) { k.cyl(0.04, 0.04, 0.05, x1 - 0.16, 1.85, z0 + 0.25 + i * 0.2, 0xc8ccd0, 10); k.cyl(0.03, 0.03, 0.01, x1 - 0.185, 1.85, z0 + 0.25 + i * 0.2, 0xffffff, 10); }
    for (let i = 0; i < 12; i++) { const kx = x1 - 0.4 - (i % 3) * 0.55, kz = z0 + 0.6 + Math.floor(i / 3) * 0.7, col = [0x1e88e5, 0xd32f2f, 0xffd400, 0x2e7d32][i % 4];
      k.cyl(0.008, 0.008, H - 0.72, kx + 0.04, (0.68 + H) / 2 - 0.05, kz, col, 4); k.box(Math.abs(kx + 0.04 - (x1 - 0.15)) + 0.01, 0.012, 0.012, (kx + 0.04 + x1 - 0.15) / 2, H - 0.12, kz, col); }
    // the cellar cooler, a thermometer, the log sheet on a clipboard
    R(x1 - 0.5, z1 - 1.6, x1 - 0.08, z1 - 0.6, 0.6, H - 0.4, 0xd8dce0); for (let i = 0; i < 8; i++) R(x1 - 0.51, z1 - 1.55 + i * 0.12, x1 - 0.5, z1 - 1.5 + i * 0.12, 0.45, H - 0.4, 0x8a9098);
    k.box(0.02, 0.2, 0.06, x1 - 0.09, 1.5, z1 - 2.0, 0xffffff); k.box(0.005, 0.15, 0.01, x1 - 0.102, 1.5, z1 - 2.0, 0xd32f2f);
    k.box(0.02, 0.32, 0.24, x1 - 0.09, 1.3, z1 - 2.5, 0x8a5a2a); k.label('CELLAR LOG: 11°C. LINES CLEANED. RONNIE FOUND ASLEEP ON KEG 4.', 0.2, 0.26, [x1 - 0.1015, 1.28, z1 - 2.5], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', border: null, size: 26 });
    // empty kegs stacked on their sides by the door out, a pallet truck, a mop sink, a hose reel, a bin of empties
    for (let i = 0; i < 4; i++) { const g = new THREE.CylinderGeometry(0.22, 0.22, 0.6, 14); g.rotateZ(Math.PI / 2); k.parts.push(part(g, 0x9aa0a6, [x1 - 0.7 - (i % 2) * 0.0, 0.22 + Math.floor(i / 2) * 0.44, z1 - 0.3 - (i % 2) * 0.46])); }
    blk(x1 - 1.02, z1 - 0.8, x1 - 0.38, z1 - 0.05, 0.9);
    R(x0 + 1.2, z1 - 0.8, x0 + 1.6, z1 - 0.2, 0.1, 0.06, 0xd32f2f); R(x0 + 1.2, z1 - 0.8, x0 + 1.26, z1 - 0.2, 1.1, 0.55, 0xd32f2f);   // pallet truck
    R(x0 + 0.1, z0 + 0.9, x0 + 0.6, z0 + 1.4, 0.45, 0.225, 0xc8ccd0, { block: true }); k.cyl(0.012, 0.012, 0.3, x0 + 0.15, 0.6, z0 + 1.15, 0xd0d0d0, 6);   // mop sink
    { const hr = new THREE.TorusGeometry(0.16, 0.03, 6, 16); hr.rotateY(Math.PI / 2); k.parts.push(part(hr, 0x2e7d32, [x0 + 0.04, 1.3, z0 + 1.15])); }
    k.cyl(0.2, 0.18, 0.6, x1 - 1.6, 0.3, z0 + 0.35, 0x37474f, 12, { block: true }); for (let i = 0; i < 6; i++) k.cyl(0.025, 0.025, 0.2, x1 - 1.66 + (i % 3) * 0.06, 0.66, z0 + 0.3 + Math.floor(i / 3) * 0.08, 0x1e5a24, 6);
    k.light((x0 + x1) / 2, 2.6, (z0 + z1) / 2, 0xf4f8ff, 2.5, 7);
    for (let i = 0; i < 3; i++) k.cyl(0.12, 0.12, 0.9, x0 + 0.35 + i * 0.3, 0.45, z0 + 0.4, 0x1565c0, 10, { block: true });   // gas cylinders
    k.label('BEER KEGS — RONNIE IS NOT A KEG. STOP LYING DOWN IN HERE.', 1.4, 0.4, [x1 - 0.1, 1.8, (z0 + z1) / 2], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', border: '#c0392b', size: 36 });
    k.label('BACK ROOM', 0.9, 0.25, [x0 - 0.1, 2.4, Z(1268)], [0, -Math.PI / 2, 0], { bg: '#1b3a2a', fg: '#d4af37', border: null, size: 60 });
    k.lamp((x0 + x1) / 2, H - 0.02, (z0 + z1) / 2, 0xffffff, 0.1);
  }

  // ================================================================ kitchen: a proper working pub kitchen
  { const x0 = X(25) + 0.08, x1 = X(195) - 0.08, z0 = Z(605) + 0.08, z1 = Z(1060) - 0.08, SS = 0xc8ccd2, SSD = 0x9aa0a8, SSL = 0xdfe2e6;
    const doorZ0 = Z(990), doorZ1 = Z(1035);
    // red quarry tiles with a coved skirting, white tiles to 1.8m on every wall, steel kick strips, the strip lights
    k.floor(x0 - 0.08, z0 - 0.08, x1 + 0.08, z1 + 0.08, tileTex('#a04a32', '#94442e', '#6a2e1e', 48), 0.004, 0.5);
    clad(x0, z0, X(95), z0 + 0.02, KTILE, 1.8, 0.3); clad(X(143), z0, x1, z0 + 0.02, KTILE, 1.8, 0.3); clad(x0, z0, x0 + 0.02, z1, KTILE, 1.8, 0.3); clad(x0, z1 - 0.02, x1, z1, KTILE, 1.8, 0.3);
    clad(x1 - 0.02, z0, x1, doorZ0 - 0.1, KTILE, 1.8, 0.3); clad(x1 - 0.02, doorZ1 + 0.1, x1, z1, KTILE, 1.8, 0.3);
    for (const [a0, b0, a1, b1] of [[x0, z0, x1, z0 + 0.04], [x0, z0, x0 + 0.04, z1], [x0, z1 - 0.04, x1, z1]]) R(a0, b0, a1, b1, 0.1, 0.05, SSD);
    for (let z = z0 + 1.2; z < z1; z += 2.4) { k.box(0.14, 0.06, 1.3, (x0 + x1) / 2, H - 0.04, z, 0xffffff); k.lamp((x0 + x1) / 2, H - 0.08, z, 0xf4fbff, 0.09, false); }
    k.pool((x0 + x1) / 2, 0, (z0 + z1) / 2, 5, 0xf4fbff); k.light((x0 + x1) / 2, 2.6, (z0 + z1) / 2, 0xf8fbff, 3, 9);
    // ---- the cook line down the outside wall, under a big steel canopy
    const run = (za, zb, h = 0.9, d = 0.72, col = SS) => { R(x0, za, x0 + d, zb, h, h / 2, col, { collide: true, block: true }); R(x0, za, x0 + d + 0.02, zb, 0.03, h + 0.015, SSL, { collide: true }); R(x0 + d - 0.01, za, x0 + d + 0.01, zb, 0.1, 0.05, 0x333333); };
    // 6-burner range with an oven under it: grates, burner caps, knobs, the oven door and its window
    run(z0, z0 + 1.0); for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { const bx = x0 + 0.2 + c * 0.32, bz = z0 + 0.18 + r * 0.32; k.cyl(0.1, 0.1, 0.02, bx, 0.93, bz, 0x1a1a1a, 14); k.cyl(0.04, 0.04, 0.025, bx, 0.94, bz, 0x333333, 10); for (let g = 0; g < 4; g++) k.box(0.22, 0.012, 0.012, bx, 0.955, bz, 0x111111, { rot: [0, g * Math.PI / 4, 0] }); }
    for (let i = 0; i < 6; i++) k.cyl(0.018, 0.018, 0.03, x0 + 0.74, 0.8, z0 + 0.12 + i * 0.15, 0x111111, 8);
    R(x0 + 0.725, z0 + 0.1, x0 + 0.735, z0 + 0.9, 0.5, 0.35, SSD); R(x0 + 0.73, z0 + 0.3, x0 + 0.74, z0 + 0.7, 0.2, 0.4, 0x222222); R(x0 + 0.74, z0 + 0.2, x0 + 0.76, z0 + 0.8, 0.03, 0.63, 0x111111);
    // pots and pans on the hobs (gravy, chips water, beans)
    for (const [c, r, col, hh] of [[0, 0, 0x9aa0a8, 0.22], [1, 1, 0x9aa0a8, 0.16], [0, 2, 0x2a2a2a, 0.06]]) { const bx = x0 + 0.2 + c * 0.32, bz = z0 + 0.18 + r * 0.32; k.cyl(0.13, 0.12, hh, bx, 0.97 + hh / 2, bz, col, 16); k.cyl(0.115, 0.115, 0.01, bx, 0.97 + hh - 0.02, bz, [0x6a3a1a, 0xe8e0c8, 0xd06a20][r], 14); }
    { const g = new THREE.CylinderGeometry(0.015, 0.015, 0.25, 6); g.rotateZ(Math.PI / 2); k.parts.push(part(g, 0x222222, [x0 + 0.47, 1.0, z0 + 0.82])); }
    // flat-top griddle and a chargrill, burgers sizzling
    run(z0 + 1.0, z0 + 1.9); R(x0 + 0.08, z0 + 1.05, x0 + 0.66, z0 + 1.45, 0.02, 0.93, 0x2a2a2a); for (let i = 0; i < 6; i++) k.cyl(0.05, 0.05, 0.015, x0 + 0.2 + (i % 3) * 0.17, 0.95, z0 + 1.15 + Math.floor(i / 3) * 0.17, 0x5a2e14, 12);
    for (let i = 0; i < 9; i++) R(x0 + 0.08, z0 + 1.5 + i * 0.04, x0 + 0.66, z0 + 1.52 + i * 0.04, 0.012, 0.935, 0x111111);
    k.box(0.02, 0.04, 0.25, x0 + 0.5, 0.97, z0 + 1.6, 0x666666); k.box(0.12, 0.004, 0.09, x0 + 0.38, 0.95, z0 + 1.6, 0xb0b4b8);   // spatula
    // twin deep fat fryers: oil, baskets (one up, one down), the fryer lids
    run(z0 + 1.9, z0 + 2.75, 0.95); for (const dz of [0.2, 0.62]) { R(x0 + 0.12, z0 + 1.9 + dz - 0.15, x0 + 0.6, z0 + 1.9 + dz + 0.15, 0.02, 0.95, 0xd09a30); }
    for (const [dz, up] of [[0.2, true], [0.62, false]]) { const bz = z0 + 1.9 + dz, by = up ? 1.12 : 0.98; R(x0 + 0.16, bz - 0.12, x0 + 0.5, bz + 0.12, 0.12, by, 0x777777); k.box(0.3, 0.015, 0.015, x0 + 0.66, by + 0.07, bz, 0x111111); if (up) for (let i = 0; i < 12; i++) k.box(0.012, 0.012, 0.08, x0 + 0.2 + (i % 4) * 0.08, by + 0.07, bz - 0.06 + Math.floor(i / 4) * 0.05, 0xffcf40, { rot: [0, i, 0] }); }
    // bain-marie with sauces, then the canopy over the whole line with its filters and lights
    run(z0 + 2.75, z0 + 3.6); for (let i = 0; i < 4; i++) { R(x0 + 0.12 + (i % 2) * 0.28, z0 + 2.82 + Math.floor(i / 2) * 0.36, x0 + 0.36 + (i % 2) * 0.28, z0 + 3.12 + Math.floor(i / 2) * 0.36, 0.01, 0.935, [0x6a3a1a, 0xd06a20, 0xf2e0b0, 0x3a7a2a][i]); k.box(0.012, 0.2, 0.012, x0 + 0.24 + (i % 2) * 0.28, 1.0, z0 + 2.97 + Math.floor(i / 2) * 0.36, 0x888888, { rot: [0.3, 0, 0] }); }
    R(x0, z0, x0 + 1.0, z0 + 3.6, 0.5, 2.25, SS); R(x0 + 0.95, z0, x0 + 1.0, z0 + 3.6, 0.12, 2.0, SSD);
    for (let z = z0 + 0.15; z < z0 + 3.5; z += 0.45) R(x0 + 0.1, z, x0 + 0.85, z + 0.4, 0.02, 1.995, 0x8a8e94);
    for (let z = z0 + 0.6; z < z0 + 3.6; z += 1.0) { k.lamp(x0 + 0.5, 1.98, z, 0xfff4d8, 0.05, false); k.pool(x0 + 0.4, 0.94, z, 1.2, 0xfff0d0); }
    R(x0 + 0.95, z0 + 0.1, x0 + 1.0, z0 + 0.35, 0.18, 1.6, 0xd32f2f); k.label('KITCHEN FIRE SUPPRESSION — PULL', 0.22, 0.14, [x0 + 1.005, 1.6, z0 + 0.225], [0, Math.PI / 2, 0], { bg: '#d32f2f', fg: '#fff', border: null, size: 40 });
    // ---- the wash-up end: double sink with a pre-rinse spray arm, hand basin, a pass-through dishwasher with racks, tabling
    run(z0 + 3.9, z0 + 6.0); for (const dz of [0.3, 0.85]) R(x0 + 0.12, z0 + 3.9 + dz - 0.22, x0 + 0.6, z0 + 3.9 + dz + 0.22, 0.012, 0.9, 0x8a9098);
    k.cyl(0.015, 0.015, 0.75, x0 + 0.1, 1.3, z0 + 4.45, 0xd0d4d8, 8); { const sp = new THREE.TorusGeometry(0.18, 0.012, 6, 14, Math.PI); sp.rotateY(Math.PI / 2); k.parts.push(part(sp, 0xd0d4d8, [x0 + 0.1, 1.65, z0 + 4.28])); } k.cyl(0.03, 0.02, 0.12, x0 + 0.1, 1.42, z0 + 4.1, 0x333333, 8);
    for (let i = 0; i < 5; i++) k.cyl(0.11, 0.1, 0.012, x0 + 0.38, 0.92 + i * 0.014, z0 + 5.5, 0xffffff, 14);                    // dirty plates waiting
    R(x0, z0 + 6.0, x0 + 0.72, z0 + 6.8, 1.5, 0.75, SS, { block: true }); R(x0 + 0.05, z0 + 6.05, x0 + 0.67, z0 + 6.75, 0.02, 0.92, 0x666a70);   // dishwasher hood
    R(x0 + 0.68, z0 + 6.05, x0 + 0.73, z0 + 6.75, 0.04, 1.35, 0x222222); k.box(0.02, 0.03, 0.03, x0 + 0.735, 1.2, z0 + 6.4, 0x4caf50);
    for (let r = 0; r < 3; r++) { R(x0 + 0.05, z0 + 6.85 + r * 0.02, x0 + 0.55, z0 + 7.35, 0.06, 0.95 + r * 0.07, 0x3a6aa8); for (let i = 0; i < 6; i++) k.cyl(0.03, 0.025, 0.1, x0 + 0.1 + (i % 3) * 0.16, 1.03 + r * 0.07, z0 + 6.95 + Math.floor(i / 3) * 0.2, 0xd8eef2, 8); }
    run(z0 + 6.8, z0 + 7.4);
    // hand-wash basin with soap, paper towels, the sign
    R(x0, z0 + 7.55, x0 + 0.4, z0 + 7.95, 0.1, 0.85, 0xf4f4f2); k.cyl(0.012, 0.012, 0.18, x0 + 0.06, 1.0, z0 + 7.75, 0xd0d0d0, 6);
    R(x0, z0 + 7.6, x0 + 0.12, z0 + 7.72, 0.2, 1.25, 0xffffff); R(x0, z0 + 7.8, x0 + 0.15, z0 + 8.05, 0.32, 1.3, 0xe8e8e8);
    k.label('NOW WASH YOUR HANDS (RONNIE: BEFORE, NOT AFTER)', 0.4, 0.22, [x0 + 0.03, 1.62, z0 + 7.85], [0, Math.PI / 2, 0], { bg: '#fff', fg: '#1f4fbf', border: '#1f4fbf', size: 36 });
    // two tall upright fridges and a chest freezer at the far end
    for (const [z, lbl] of [[z1 - 1.9, 'MEAT'], [z1 - 1.15, 'DAIRY & VEG']]) { R(x0, z - 0.35, x0 + 0.72, z + 0.35, 2.0, 1.0, SSL, { collide: true, block: true }); R(x0 + 0.72, z - 0.33, x0 + 0.74, z + 0.33, 1.94, 1.0, SS); k.box(0.03, 0.7, 0.03, x0 + 0.77, 1.05, z + 0.25, 0x888888); k.box(0.02, 0.08, 0.3, x0 + 0.75, 1.75, z, 0x1a2a3a); k.label(lbl, 0.28, 0.07, [x0 + 0.745, 1.62, z], [0, Math.PI / 2, 0], { bg: '#fff', fg: '#111', border: null, size: 50 }); }
    R(x0, z1 - 0.72, x0 + 1.2, z1, 0.85, 0.425, 0xf4f4f4, { collide: true, block: true }); R(x0 - 0.01, z1 - 0.72, x0 + 1.21, z1, 0.04, 0.87, 0xd8d8d8);
    k.label("RONNIE'S SHELF (EMPTY)", 0.9, 0.3, [x0 + 0.6, 1.3, z1 - 0.025], [0, Math.PI, 0], { bg: '#fff', fg: '#c0392b', border: null, size: 40 });
    // ---- the far wall (by the pub): the pass, heat lamps, the ticket rail, plates, the bell
    const px0 = x1 - 0.7;
    R(px0, z0 + 0.6, x1, z0 + 3.8, 0.92, 0.46, SS, { collide: true, block: true }); R(px0 - 0.02, z0 + 0.6, x1, z0 + 3.8, 0.03, 0.935, SSL, { collide: true });
    for (const z of [z0 + 1.0, z0 + 1.8, z0 + 2.6, z0 + 3.4]) { k.cyl(0.006, 0.006, 0.8, x1 - 0.35, H - 0.4, z, 0x222222, 4); R(x1 - 0.55, z - 0.18, x1 - 0.15, z + 0.18, 0.08, H - 0.85, 0x333333); k.lamp(x1 - 0.35, H - 0.9, z, 0xff6a20, 0.07); k.pool(x1 - 0.35, 0.94, z, 0.9, 0xff8a40); k.spawns.push(new THREE.Vector3(x1 - 0.35, 1.02, z)); }
    R(x1 - 0.04, z0 + 0.7, x1, z0 + 3.7, 0.04, 1.6, SSD);                                                       // ticket rail
    for (let z = z0 + 0.8; z < z0 + 3.6; z += 0.22) { R(x1 - 0.045, z - 0.06, x1 - 0.04, z + 0.06, 0.2, 1.48, 0xffffff); for (let l = 0; l < 4; l++) R(x1 - 0.046, z - 0.045, x1 - 0.045, z + 0.03, 0.006, 1.55 - l * 0.035, 0x555555); }
    for (const z of [z0 + 0.8, z0 + 3.6]) for (let i = 0; i < 8; i++) k.cyl(0.13, 0.12, 0.014, px0 + 0.2, 0.95 + i * 0.016, z, 0xffffff, 16);   // stacks of plates
    k.cyl(0.05, 0.06, 0.04, x1 - 0.15, 0.96, z0 + 2.2, 0xd4af37, 12); k.cyl(0.006, 0.006, 0.04, x1 - 0.15, 1.0, z0 + 2.2, 0x333333, 6);   // the bell
    k.label('SERVICE! (RONNIE: THAT DOES NOT MEAN YOU)', 0.9, 0.22, [x1 - 0.025, 2.1, z0 + 2.2], [0, -Math.PI / 2, 0], { bg: '#222', fg: '#ffd400', border: null, size: 40 });
    // shelving racks of dry stores: flour, tins, sauces, gastronorm tubs
    { const rz0 = z0 + 4.2, rz1 = z0 + 6.4; for (const y of [0.25, 0.75, 1.25, 1.75]) R(x1 - 0.5, rz0, x1, rz1, 0.025, y, 0xb8bcc2, { collide: true });
      for (const z of [rz0, rz1]) for (const x of [x1 - 0.48, x1 - 0.02]) k.box(0.025, 1.85, 0.025, x, 0.925, z, 0x9aa0a8);
      blk(x1 - 0.52, rz0, x1, rz1, 1.9);
      let i = 0; for (const y of [0.25, 0.75, 1.25, 1.75]) for (let z = rz0 + 0.15; z < rz1 - 0.1; z += 0.22, i++) {
        const t = (i * 7) % 5;
        if (t === 0) k.cyl(0.08, 0.08, 0.16, x1 - 0.25, y + 0.09, z, [0xc62828, 0x2e7d32, 0xf9a825][i % 3], 12);                 // catering tins
        else if (t === 1) { R(x1 - 0.42, z - 0.1, x1 - 0.08, z + 0.1, 0.12, y + 0.07, 0xf0f0f0); R(x1 - 0.42, z - 0.1, x1 - 0.08, z + 0.1, 0.015, y + 0.14, [0x1e88e5, 0xd32f2f, 0xffd400][i % 3]); }   // tubs with lids
        else if (t === 2) R(x1 - 0.42, z - 0.1, x1 - 0.1, z + 0.1, 0.35, y + 0.18, 0xe8dcc0);                               // sacks of flour
        else if (t === 3) for (let b = 0; b < 3; b++) k.cyl(0.03, 0.03, 0.2, x1 - 0.35 + b * 0.09, y + 0.11, z, [0xd32f2f, 0x5d4037, 0xffd400][b], 8);   // ketchup, brown sauce, mustard
        else { R(x1 - 0.42, z - 0.09, x1 - 0.12, z + 0.09, 0.18, y + 0.1, 0xb8905a); }                                      // boxes
      } }
    // microwave, spice rack, knife magnet, hanging utensils, a clock, chef whites on hooks, the rota board
    R(x1 - 0.4, z0 + 4.25, x1 - 0.05, z0 + 4.75, 0.3, 2.07, 0x37474f); R(x1 - 0.41, z0 + 4.3, x1 - 0.4, z0 + 4.6, 0.22, 2.07, 0x111111);
    R(x0 + 0.01, z0 + 4.0, x0 + 0.04, z0 + 4.6, 0.04, 1.55, 0x222222); for (let i = 0; i < 5; i++) k.box(0.01, 0.2, 0.03, x0 + 0.05, 1.45, z0 + 4.05 + i * 0.12, 0xd0d4d8);
    for (let i = 0; i < 4; i++) { k.cyl(0.004, 0.004, 0.3, (x0 + x1) / 2 - 0.45 + i * 0.3, H - 0.5, z0 + 5.0, 0x222222, 4); }
    k.label('clock', 0.35, 0.35, [x1 - 0.55, 2.65, z0 + 0.025], [0, 0, 0], { tex: clockTex() });
    k.label('PIE OF THE DAY: GONE (RONNIE)', 0.85, 0.45, [x1 - 0.55, 2.0, z0 + 0.03], [0, 0, 0], { bg: '#222', fg: '#fff', border: '#ffd400', size: 50 });
    k.label('FOOD HYGIENE RATING: 5 (BEFORE RONNIE STARTED WORKING HERE)', 0.5, 0.3, [x1 - 0.025, 2.3, z0 + 5.3], [0, -Math.PI / 2, 0], { bg: '#2e7d32', fg: '#fff', border: '#fff', size: 34 });
    k.label('ALLERGENS: ASK STAFF. RONNIE IS ALLERGIC TO SALAD.', 0.5, 0.3, [x1 - 0.025, 1.9, z0 + 7.2], [0, -Math.PI / 2, 0], { bg: '#fff8e1', fg: '#c62828', border: '#c62828', size: 34 });
    // ---- the island: steel prep table with an under-shelf of pans, boards, a knife block, food prepped, a pan rack over it
    const ix0 = x0 + 1.75, ix1 = x1 - 1.1, iz0 = z0 + 1.6, iz1 = z0 + 5.4;
    R(ix0, iz0, ix1, iz1, 0.04, 0.9, SSL, { collide: true }); R(ix0 + 0.05, iz0 + 0.05, ix1 - 0.05, iz1 - 0.05, 0.025, 0.3, SS);
    for (const [x, z] of [[ix0 + 0.04, iz0 + 0.04], [ix1 - 0.04, iz0 + 0.04], [ix0 + 0.04, iz1 - 0.04], [ix1 - 0.04, iz1 - 0.04], [ix0 + 0.04, (iz0 + iz1) / 2], [ix1 - 0.04, (iz0 + iz1) / 2]]) k.box(0.04, 0.88, 0.04, x, 0.44, z, SSD);
    blk(ix0, iz0, ix1, iz1, 0.92);
    for (let i = 0; i < 4; i++) k.cyl(0.14, 0.13, 0.12, ix0 + 0.25 + (i % 2) * 0.35, 0.38, iz0 + 0.4 + Math.floor(i / 2) * 0.8, 0x9aa0a8, 14);   // pans under it
    R(ix0 + 0.1, iz0 + 0.2, ix0 + 0.5, iz0 + 0.5, 0.025, 0.935, 0xc89a5a); R(ix0 + 0.1, iz0 + 0.7, ix0 + 0.5, iz0 + 1.0, 0.025, 0.935, 0x2e7d32); R(ix0 + 0.1, iz0 + 1.2, ix0 + 0.5, iz0 + 1.5, 0.025, 0.935, 0xd32f2f);   // colour-coded boards
    R(ix1 - 0.2, iz0 + 0.2, ix1 - 0.05, iz0 + 0.35, 0.2, 1.02, 0x2a1a10); for (let i = 0; i < 4; i++) R(ix1 - 0.18 + i * 0.03, iz0 + 0.25, ix1 - 0.17 + i * 0.03, iz0 + 0.3, 0.12, 1.17, 0x222222);
    for (let i = 0; i < 6; i++) k.cyl(0.05, 0.05, 0.02, ix0 + 0.3, 0.95, iz0 + 1.8 + i * 0.13, 0xb0303a, 12);                             // burgers ready to cook
    for (let i = 0; i < 3; i++) R(ix0 + 0.6, iz0 + 2.6 + i * 0.35, ix1 - 0.1, iz0 + 2.9 + i * 0.35, 0.1, 0.97, 0xd8dce0);                 // gastronorm trays
    for (let i = 0; i < 3; i++) R(ix0 + 0.62, iz0 + 2.62 + i * 0.35, ix1 - 0.12, iz0 + 2.88 + i * 0.35, 0.01, 1.02, [0xffcf40, 0xe8e0c8, 0x6a3a1a][i]);
    for (const z of [iz0 + 1.8, iz0 + 3.2]) k.spawns.push(new THREE.Vector3((ix0 + ix1) / 2, 1.0, z));
    R(ix0, (iz0 + iz1) / 2 - 1.2, ix1, (iz0 + iz1) / 2 + 1.2, 0.03, H - 0.75, 0x2a2a2a);                                                  // pan rack overhead
    for (const z of [(iz0 + iz1) / 2 - 1.15, (iz0 + iz1) / 2 + 1.15]) for (const x of [ix0 + 0.05, ix1 - 0.05]) k.cyl(0.006, 0.006, 0.72, x, H - 0.37, z, 0x222222, 4);
    for (let i = 0; i < 6; i++) { const z = (iz0 + iz1) / 2 - 1.0 + i * 0.4, x = i % 2 ? ix0 + 0.3 : ix1 - 0.3; k.cyl(0.004, 0.004, 0.15, x, H - 0.84, z, 0x222222, 4); k.cyl(0.13, 0.11, 0.08, x, H - 0.96, z, [0x9aa0a8, 0x2a2a2a, 0xb87333][i % 3], 14); }
    // bins (food waste, general, recycling), a mop and bucket, fire extinguisher and blanket, first aid
    for (const [x, col] of [[x1 - 0.3, 0x2e7d32], [x1 - 0.75, 0x37474f], [x1 - 1.2, 0x1565c0]]) { k.cyl(0.2, 0.18, 0.75, x, 0.375, z1 - 0.3, col, 12, { block: true }); k.cyl(0.21, 0.21, 0.04, x, 0.77, z1 - 0.3, col, 12); }
    k.cyl(0.16, 0.14, 0.28, x1 - 0.35, 0.14, doorZ1 + 0.45, 0xffd400, 12); k.box(0.02, 1.2, 0.02, x1 - 0.3, 0.75, doorZ1 + 0.45, 0x8a5a2a, { rot: [0, 0, 0.15] });
    k.cyl(0.07, 0.07, 0.5, x1 - 0.12, 0.45, doorZ0 - 0.35, 0xd32f2f, 10); k.label('FIRE', 0.12, 0.07, [x1 - 0.12, 0.45, doorZ0 - 0.279], [0, 0, 0], { bg: '#d32f2f', fg: '#fff', border: null, size: 60 });
    R(x1 - 0.06, doorZ0 - 0.75, x1, doorZ0 - 0.5, 0.3, 1.5, 0xd32f2f);
    k.label('KITCHEN — STAFF ONLY (ESPECIALLY NOT RONNIE)', 1.1, 0.3, [X(195) + 0.1, 2.45, Z(1012)], [0, Math.PI / 2, 0], { bg: '#fff', fg: '#c0392b', border: '#c0392b', size: 40 });
    k.box(0.32, 0.6, 0.02, (x0 + x1) / 2 + 0.6, 0.3, z1 - 1.6, 0xffd400, { rot: [0.25, 0.6, 0] });                                          // wet floor sign
  }
  // the restaurant entrance: outside door, mat, a menu board
  { const x0 = X(15), x1 = X(195), z0 = Z(1060), z1 = Z(1190), zc = (z0 + z1) / 2;
    R(x0 + 0.2, zc - 0.8, x0 + 1.4, zc + 0.8, 0.01, 0.006, 0x3a3a3a);
    k.label('THE RESTAURANT — WAIT TO BE SEATED (RONNIE: WAIT TO BE STOPPED)', 1.9, 0.4, [x0 + 0.105, 2.68, zc], [0, Math.PI / 2, 0], { bg: '#1b3a2a', fg: '#d4af37', border: '#d4af37', size: 34 });
    R(x1 - 0.7, z0 + 0.2, x1 - 0.2, z0 + 0.5, 1.6, 0.8, DARKWOOD, { block: true }); k.label('TODAY\'S MENU: PIE. PIE AND CHIPS. CHIPS. (RONNIE: ALL OF IT)', 0.45, 0.6, [x1 - 0.45, 1.05, z0 + 0.51], [0, 0, 0], { bg: '#1b2a1b', fg: '#fff', border: '#8a6a3a', size: 30 });
  }
  // the entrance booking area: front doors on the corner, the booking podium, coat hooks
  { const mx = (door.x0 + door.x1) / 2 - door.uz * 0.07, mz = (door.z0 + door.z1) / 2 + door.ux * 0.07;
    // the front doors: a pair of glazed oak doors in a heavy frame, a gilt-lettered fanlight over them, brass push
    // plates and pull handles, kick plates, door closers, the opening hours, EXIT over the top
    { const dx0 = door.x0, dz0 = door.z0, ux = door.ux, uz = door.uz, nx = -uz, nz = ux, ry = door.ry, LL = door.L;
      const at = (s, d) => [dx0 + ux * s + nx * d, dz0 + uz * s + nz * d];
      const piece = (s0, s1, y0, y1, d0, d1, color) => { const [x, z] = at((s0 + s1) / 2, (d0 + d1) / 2); k.box(s1 - s0, y1 - y0, d1 - d0, x, (y0 + y1) / 2, z, color, { rot: [0, ry, 0] }); };
      const OAKDR = 0x5a3418, OAKDL = 0x7a4a24, BR = 0xc9a24a;
      const st = new THREE.Mesh(new THREE.PlaneGeometry(LL - 0.2, 2.2), new THREE.MeshBasicMaterial({ map: streetViewTex(1), color: 0xd8d8d8 }));
      { const [x, z] = at(LL / 2, 0.055); st.position.set(x, 1.15, z); st.rotation.y = ry; scene.add(st); }
      piece(0, 0.12, 0, H, 0.05, 0.16, OAKDR); piece(LL - 0.12, LL, 0, H, 0.05, 0.16, OAKDR);                 // the frame
      piece(0.12, LL - 0.12, 2.28, 2.4, 0.05, 0.16, OAKDR); piece(0.12, LL - 0.12, H - 0.1, H, 0.05, 0.16, OAKDR);
      piece(0, LL, 0, 0.03, 0.05, 0.3, 0x8a8a8a);                                                           // the stone threshold
      { const ft = canvasTex(512, 96, (g, w, h) => { g.fillStyle = '#10180f'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(160,190,210,0.25)'; g.fillRect(0, 0, w, h);
          g.font = 'italic 700 46px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e8c45a'; g.strokeStyle = '#6a4a12'; g.lineWidth = 2; g.strokeText('The Oysterfleet', w / 2, h / 2); g.fillText('The Oysterfleet', w / 2, h / 2); });
        const [x, z] = at(LL / 2, 0.165); k.label('fanlight', LL - 0.26, H - 2.5, [x, (2.4 + H - 0.1) / 2, z], [0, ry, 0], { tex: ft }); }
      // two leaves: stiles and rails, a fielded panel at the bottom, glass above with a bar, brass furniture
      const lw = (LL - 0.24) / 2;
      for (const [i, s0] of [0.12, 0.12 + lw].entries()) { const s1 = s0 + lw, D0 = 0.06, D1 = 0.11;
        piece(s0, s0 + 0.09, 0.03, 2.27, D0, D1, OAKDL); piece(s1 - 0.09, s1, 0.03, 2.27, D0, D1, OAKDL);
        piece(s0 + 0.09, s1 - 0.09, 0.03, 0.2, D0, D1, OAKDL); piece(s0 + 0.09, s1 - 0.09, 0.8, 0.92, D0, D1, OAKDL); piece(s0 + 0.09, s1 - 0.09, 2.17, 2.27, D0, D1, OAKDL);
        piece(s0 + 0.09, s1 - 0.09, 0.2, 0.8, D0 + 0.01, D1 - 0.01, OAKDR); piece(s0 + 0.15, s1 - 0.15, 0.27, 0.73, D1 - 0.01, D1 + 0.005, OAKDL);   // fielded panel
        piece(s0 + 0.09, s1 - 0.09, 1.55, 1.58, D0 + 0.02, D1 - 0.02, OAKDL);                                     // glazing bar
        piece(s0 + 0.02, s1 - 0.02, 0.03, 0.2, D1, D1 + 0.004, BR);                                                // kick plate
        const hs = i === 0 ? s1 - 0.16 : s0 + 0.16;
        piece(hs - 0.05, hs + 0.05, 1.05, 1.45, D1, D1 + 0.004, BR);                                              // push plate
        { const [x, z] = at(hs, D1 + 0.07); k.cyl(0.013, 0.013, 0.5, x, 1.1, z, BR, 10); } piece(hs - 0.015, hs + 0.015, 0.88, 0.9, D1, D1 + 0.07, BR); piece(hs - 0.015, hs + 0.015, 1.32, 1.34, D1, D1 + 0.07, BR);
        { const [x, z] = at(s0 + lw / 2, D1 + 0.002); k.label('PUSH', 0.12, 0.04, [x, 1.5, z], [0, ry, 0], { bg: '#c9a24a', fg: '#2a1a0a', border: null, size: 60 }); }
        const hx = i === 0 ? s0 + 0.05 : s1 - 0.05; piece(hx - 0.02, hx + 0.02, 0.4, 0.5, D1, D1 + 0.01, BR); piece(hx - 0.02, hx + 0.02, 1.8, 1.9, D1, D1 + 0.01, BR);   // hinges
        const cs = i === 0 ? s0 + 0.12 : s1 - 0.42; piece(cs, cs + 0.3, 2.3, 2.36, 0.16, 0.22, 0x2a2a2a);         // door closer
      }
      piece(LL / 2 - 0.01, LL / 2 + 0.01, 0.03, 2.27, 0.11, 0.125, OAKDR);                                         // the meeting stile
      { const [x, z] = at(LL / 2, 0.112); k.box(0.02, 0.18, 0.02, x, 2.12, z, BR, { rot: [0, ry, 0] }); }        // the drop bolt
      { const [x, z] = at(0.12 + lw / 2, 0.115); k.label('OPEN DAILY 11–11 · FOOD 12–9', 0.42, 0.1, [x, 1.95, z], [0, ry, 0], { bg: '#10180f', fg: '#e8c45a', border: null, size: 40 }); }   // gilt lettering on the glass
      { const [x, z] = at(LL / 2, 0.17); k.label('EXIT', 0.36, 0.14, [x, H - 0.05 - 0.09, z + 0.0], [0, ry, 0], { bg: '#1b8a3a', fg: '#fff', border: null, size: 90, glow: true }); }
      { const [x, z] = at(LL + 0.25, 0.12); k.box(0.08, 0.12, 0.04, x, 1.25, z, 0xe8e8e8, { rot: [0, ry, 0] }); k.box(0.03, 0.03, 0.02, x, 1.25, z + 0.02, 0xd32f2f, { rot: [0, ry, 0] }); }   // the light switch / alarm panel
    }
    // reception (copied from the real one, set where the plan shows it): an L-shaped honey-oak raised-panel desk down
    // the left side, its front to the room and the front doors; staff stand behind it, in front of the red angled wall
    // with the glazed office door under the "Reception" plaque
    const TOP = 1.06, fX = 2.86, bX = 2.42, zT = Z(385) + T2, zB = -11.3;
    const OAKF = woodTex('#9a5e28'), OAKP = woodTex('#b2763a'), OAKD = woodTex('#7e4a1e');
    const TB = (x0, z0, x1, z1, h, y, tex) => k.texBox(Math.abs(x1 - x0), h, Math.abs(z1 - z0), (x0 + x1) / 2, y, (z0 + z1) / 2, tex);
    TB(bX, zT, fX, zB, TOP - 0.04, (TOP - 0.04) / 2, OAKF);
    k.colliders.push(new THREE.Box3(new THREE.Vector3(bX, 0, zT), new THREE.Vector3(fX, TOP, zB)));
    // raised-and-fielded panels on a front: along z (facing +x) or along x (facing +z)
    const panels = (alongZ, c, a0, a1) => {
      const L = a1 - a0, np = Math.max(1, Math.round(L / 0.55)), pw = L / np;
      const BX = (p0, p1, d0, d1, y0, y1, tex, color) => { if (alongZ) { if (tex) TB(c + d0, p0, c + d1, p1, y1 - y0, (y0 + y1) / 2, tex); else R(c + d0, p0, c + d1, p1, y1 - y0, (y0 + y1) / 2, color); } else { if (tex) TB(p0, c + d0, p1, c + d1, y1 - y0, (y0 + y1) / 2, tex); else R(p0, c + d0, p1, c + d1, y1 - y0, (y0 + y1) / 2, color); } };
      BX(a0, a1, 0, 0.025, 0, 0.1, null, 0x5a3416);                                                   // kick plinth
      for (let i = 0; i <= np; i++) BX(a0 + i * pw - 0.045, a0 + i * pw + 0.045, 0, 0.03, 0.1, TOP - 0.06, OAKF);      // stiles
      BX(a0, a1, 0, 0.03, 0.1, 0.21, OAKF); BX(a0, a1, 0, 0.03, TOP - 0.15, TOP - 0.06, OAKF); BX(a0 - 0.01, a1 + 0.01, 0.02, 0.045, TOP - 0.08, TOP - 0.05, null, 0x6e4018);
      for (let i = 0; i < np; i++) { const p0 = a0 + i * pw + 0.045, p1 = a0 + (i + 1) * pw - 0.045, y0 = 0.21, y1 = TOP - 0.15;
        BX(p0, p1, 0.005, 0.012, y0, y1, OAKD); BX(p0 + 0.035, p1 - 0.035, 0.012, 0.03, y0 + 0.035, y1 - 0.035, OAKP);
        BX(p0 + 0.035, p0 + 0.047, 0.03, 0.034, y0 + 0.035, y1 - 0.035, null, 0xc48a4a); BX(p1 - 0.047, p1 - 0.035, 0.03, 0.034, y0 + 0.035, y1 - 0.035, null, 0xc48a4a);
        BX(p0 + 0.035, p1 - 0.035, 0.03, 0.034, y1 - 0.047, y1 - 0.035, null, 0xc48a4a); BX(p0 + 0.035, p1 - 0.035, 0.03, 0.034, y0 + 0.035, y0 + 0.047, null, 0x6e4018); }
    };
    panels(true, fX, zT + 0.02, zB);                     // the long front, facing the room and the doors
    panels(false, zB, bX, fX);                           // the end, facing down the room
    // the cream solid-surface top, overhanging the fronts, with rounded front edges
    R(bX - 0.02, zT, fX + 0.07, zB + 0.07, 0.035, TOP + 0.0175, 0xf1e9d4, { collide: true });
    k.parts.push(part(new THREE.CylinderGeometry(0.0175, 0.0175, zB + 0.07 - zT, 10), 0xf1e9d4, [fX + 0.07, TOP + 0.0175, (zT + zB + 0.07) / 2], [Math.PI / 2, 0, 0]));
    k.parts.push(part(new THREE.CylinderGeometry(0.0175, 0.0175, fX + 0.09 - bX, 10), 0xf1e9d4, [(bX - 0.02 + fX + 0.07) / 2, TOP + 0.0175, zB + 0.07], [0, 0, Math.PI / 2]));
    R(bX - 0.02, zT, fX + 0.07, zB + 0.07, 0.006, TOP - 0.003, 0xc9bfa6);
    blk(bX - 0.02, zT, fX + 0.09, zB + 0.09, TOP + 0.05);
    // on top: tulips in a glass vase, the bell, the signing-in book and pen, the leaflet rack, a pot of yellow flowers, the card machine
    { const vx = fX - 0.2, vz = zT + 0.45; k.cyl(0.05, 0.04, 0.24, vx, TOP + 0.155, vz, 0xd8eef0, 12); k.cyl(0.046, 0.036, 0.1, vx, TOP + 0.085, vz, 0x9ac0a0, 12);
      for (let i = 0; i < 9; i++) { const a = i * 0.7, r = 0.02 + (i % 3) * 0.025, hgt = 0.3 + (i % 4) * 0.05, tx = vx + Math.cos(a) * r, tz = vz + Math.sin(a) * r;
        const stm = new THREE.CylinderGeometry(0.004, 0.004, hgt, 4); stm.rotateZ(Math.cos(a) * r * 2.5); stm.rotateX(-Math.sin(a) * r * 2.5); k.parts.push(part(stm, 0x4a8a2a, [(vx + tx) / 2, TOP + 0.04 + hgt / 2, (vz + tz) / 2]));
        k.parts.push(part(new THREE.SphereGeometry(0.026, 8, 6).scale(1, 1.4, 1), i % 3 ? 0xffd21a : 0xf5c000, [tx, TOP + 0.05 + hgt, tz]));
        const lf = new THREE.SphereGeometry(0.03, 6, 4); lf.scale(0.35, 1.6, 0.12); lf.rotateY(a); k.parts.push(part(lf, 0x3a7a24, [vx + Math.cos(a) * 0.03, TOP + 0.3, vz + Math.sin(a) * 0.03])); } }
    k.cyl(0.04, 0.05, 0.035, fX - 0.1, TOP + 0.053, -12.85, 0xd4af37, 12); k.cyl(0.006, 0.006, 0.03, fX - 0.1, TOP + 0.083, -12.85, 0x333333, 6);
    R(fX - 0.32, -12.6, fX - 0.06, -12.1, 0.025, TOP + 0.048, 0x7a1f24); R(fX - 0.3, -12.58, fX - 0.08, -12.12, 0.012, TOP + 0.066, 0xfaf6ea);
    k.label('SIGN IN: "RONNIE — TABLE FOR ONE, FOOD FOR TWELVE"', 0.42, 0.2, [fX - 0.19, TOP + 0.073, -12.35], [-Math.PI / 2, 0, Math.PI / 2], { bg: '#faf6ea', fg: '#111', border: null, size: 28 });
    k.parts.push(part(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 6), 0x1a1a1a, [fX - 0.12, TOP + 0.078, -12.2], [0, 1.2, Math.PI / 2]));
    { const lx = fX - 0.2, lz = -13.35; R(lx - 0.08, lz - 0.16, lx + 0.08, lz + 0.16, 0.02, TOP + 0.045, 0x3a2416);
      for (let i = 0; i < 3; i++) { const z = lz - 0.1 + i * 0.1; R(lx - 0.03, z - 0.045, lx - 0.02, z + 0.045, 0.2, TOP + 0.15, 0x2a1a10, { rot: [0, 0, 0.25] });
        k.label(['TONIGHT: QUIZ', 'SUNDAY ROAST', 'DARTS LEAGUE'][i], 0.08, 0.17, [lx - 0.01, TOP + 0.17, z], [0, Math.PI / 2, -0.25], { bg: ['#1b3a2a', '#7a1f24', '#d4af37'][i], fg: '#fff', border: null, size: 22 }); } }
    { const px = bX + 0.1, pz = zB - 0.17; k.cyl(0.065, 0.05, 0.11, px, TOP + 0.09, pz, 0xf6f2e8, 14);
      for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 0.02 + (i % 4) * 0.018; k.parts.push(part(new THREE.SphereGeometry(0.022, 6, 4), i % 2 ? 0xffd21a : 0xffe56a, [px + Math.cos(a) * r, TOP + 0.19 + (i % 3) * 0.025, pz + Math.sin(a) * r])); }
      for (let i = 0; i < 8; i++) { const lf = new THREE.SphereGeometry(0.03, 6, 4); lf.scale(0.4, 1.4, 0.12); lf.rotateY(i * 0.8); k.parts.push(part(lf, 0x3a7a24, [px + Math.cos(i * 0.8) * 0.03, TOP + 0.17, pz + Math.sin(i * 0.8) * 0.03])); } }
    R(fX - 0.25, -11.55, fX - 0.1, -11.4, 0.05, TOP + 0.06, 0x222222); k.box(0.1, 0.02, 0.06, fX - 0.17, TOP + 0.09, -11.47, 0x111111, { rot: [0, 0, 0.3] });   // card machine
    R(bX + 0.02, -12.02, bX + 0.3, -11.72, 0.01, TOP + 0.04, 0x1b2a1b); for (let i = 0; i < 5; i++) R(bX + 0.03, -12.01, bX + 0.29, -11.73, 0.008, TOP + 0.05 + i * 0.009, i % 2 ? 0x1b2a1b : 0x162216);   // menus
    k.spawns.push(new THREE.Vector3(fX - 0.25, TOP + 0.15, -12.9));
    // behind the desk: a lower work top on cupboards (the booking screen, the phone, the till drawer), a swivel chair
    { R(bX - 0.3, zT + 0.1, bX, zB, 0.03, 0.78, 0xe8dfc8); R(bX - 0.28, zT + 0.1, bX, zB, 0.76, 0.38, 0xd8cdb4);
      for (let z = zT + 0.15; z < zB - 0.4; z += 0.5) { R(bX - 0.29, z, bX - 0.28, z + 0.46, 0.66, 0.4, 0xe2d8c0); k.box(0.012, 0.012, 0.1, bX - 0.3, 0.66, z + 0.23, 0xb8bcc2); }
      k.box(0.03, 0.28, 0.44, bX - 0.12, 1.0, -12.9, 0x111111, { rot: [0, 0, -0.15] }); k.box(0.005, 0.24, 0.4, bX - 0.136, 1.0, -12.9, 0x2a6ad8, { rot: [0, 0, -0.15] }); k.box(0.04, 0.16, 0.04, bX - 0.06, 0.86, -12.9, 0x222222);
      R(bX - 0.27, -13.1, bX - 0.15, -12.75, 0.02, 0.805, 0x222222); R(bX - 0.25, -12.3, bX - 0.05, -12.1, 0.05, 0.82, 0x222222); R(bX - 0.22, -11.95, bX - 0.05, -11.85, 0.06, 0.825, 0x111111);
      const sx = bX - 0.45, sz = -12.45; k.cyl(0.25, 0.25, 0.06, sx, 0.47, sz, 0x1a1a1a, 14); k.box(0.06, 0.45, 0.42, sx - 0.24, 0.75, sz, 0x1a1a1a); k.cyl(0.025, 0.025, 0.4, sx, 0.25, sz, 0x555555, 8);
      for (let i = 0; i < 5; i++) { const a = i * 1.2566; k.box(0.26, 0.025, 0.03, sx + Math.cos(a) * 0.13, 0.04, sz + Math.sin(a) * 0.13, 0x333333, { rot: [0, -a, 0] }); }
      blk(sx - 0.28, sz - 0.22, sx + 0.2, sz + 0.22, 0.9); blk(bX - 0.3, zT, bX, zB, 0.8); }
    // the angled wall behind: painted deep red with a dado, the office door with frosted glass, the "Reception" plaque,
    // a key cabinet, a round clock, a framed licence
    { const ax = X(615), az = Z(465), bxW = X(695), bzW = Z(385), LW = Math.hypot(bxW - ax, bzW - az), ux = (bxW - ax) / LW, uz = (bzW - az) / LW, nx = -uz, nz = ux, ry = Math.atan2(-uz, ux), lry = Math.atan2(nx, nz);
      const at = (s, d) => [ax + ux * s + nx * d, az + uz * s + nz * d];
      const piece = (s0, s1, y0, y1, d0, d1, color) => { const [x, z] = at((s0 + s1) / 2, (d0 + d1) / 2); k.box(s1 - s0, y1 - y0, d1 - d0, x, (y0 + y1) / 2, z, color, { rot: [0, ry, 0] }); };
      const RED = 0x9e1f26, d0 = 0.08;
      piece(0.08, LW - 0.08, 0, H, d0, d0 + 0.006, RED);                                                   // red paint
      piece(0.08, LW - 0.08, 0, 0.15, d0, d0 + 0.025, 0x3a1a10); piece(0.08, LW - 0.08, 0.92, 0.96, d0, d0 + 0.03, 0x6a1a1a); piece(0.08, LW - 0.08, 2.42, 2.46, d0, d0 + 0.025, 0x6a1a1a);   // skirting, dado, picture rail
      piece(0.08, LW - 0.08, H - 0.12, H, d0, d0 + 0.07, 0xf4f0e6);                                       // cornice
      const ds = LW / 2 + 0.15;                                                                           // the office door
      piece(ds - 0.55, ds + 0.55, 0, 2.22, d0, d0 + 0.06, 0x8a5a2a); piece(ds - 0.47, ds + 0.47, 0, 2.14, d0 + 0.06, d0 + 0.08, 0xa06a32);
      piece(ds - 0.4, ds + 0.4, 0.08, 0.92, d0 + 0.08, d0 + 0.09, 0x8a5a26); piece(ds - 0.34, ds + 0.34, 0.14, 0.86, d0 + 0.09, d0 + 0.1, 0xb07a3e);
      piece(ds - 0.4, ds + 0.4, 1.06, 2.1, d0 + 0.08, d0 + 0.095, 0xe8eef0); piece(ds - 0.36, ds + 0.36, 1.1, 2.06, d0 + 0.095, d0 + 0.1, 0xd6dde0);
      piece(ds - 0.01, ds + 0.01, 1.1, 2.06, d0 + 0.1, d0 + 0.105, 0x8a5a26); piece(ds - 0.36, ds + 0.36, 1.57, 1.59, d0 + 0.1, d0 + 0.105, 0x8a5a26);
      { const [x, z] = at(ds + 0.38, d0 + 0.13); k.parts.push(part(new THREE.SphereGeometry(0.03, 10, 8), 0xd4af37, [x, 1.0, z])); }
      { const [x, z] = at(ds, d0 + 0.106); k.label('PRIVATE', 0.22, 0.07, [x, 1.38, z], [0, lry, 0], { bg: '#f5f0e6', fg: '#7a1f24', border: '#7a1f24', size: 40 }); }
      piece(ds - 0.62, ds + 0.62, 2.34, 2.66, d0, d0 + 0.03, 0x5a1214); { const [x, z] = at(ds, d0 + 0.031); k.label('Reception', 1.1, 0.26, [x, 2.5, z], [0, lry, 0], { bg: '#7a1a1e', fg: '#f3e2c0', border: '#c9a24a', size: 70 }); }
      piece(0.25, 0.68, 1.3, 1.85, d0, d0 + 0.12, 0x6a3a1a); piece(0.28, 0.65, 1.33, 1.82, d0 + 0.12, d0 + 0.13, 0x7a4a26); { const [x, z] = at(0.6, d0 + 0.14); k.box(0.02, 0.06, 0.02, x, 1.58, z, 0xd4af37); }   // key cabinet
      const clk = canvasTex(128, 128, (g) => { g.fillStyle = '#f5f0e6'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = '#2a1a10'; g.stroke(); g.fillStyle = '#111'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(62 + Math.sin(a) * 50, 62 - Math.cos(a) * 50, 4, 4); } g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 28); g.moveTo(64, 64); g.lineTo(92, 70); g.stroke(); });
      { const [x, z] = at(0.46, d0 + 0.012); k.label('clock', 0.3, 0.3, [x, 2.15, z], [0, lry, 0], { tex: clk }); }
      { const [x, z] = at(LW - 0.35, d0 + 0.02); piece(LW - 0.55, LW - 0.15, 1.45, 1.95, d0, d0 + 0.025, 0xb8923a); k.label('PREMISES LICENCE — THE OYSTERFLEET, CANVEY ISLAND', 0.34, 0.44, [x + nx * 0.008, 1.7, z + nz * 0.008], [0, lry, 0], { bg: '#faf6ea', fg: '#2a1a0a', border: null, size: 22 }); }
    }
    // the red leather chesterfield tub chair in front, on the right, angled towards the desk
    { const ax = 3.47, az = -13.58, ry = Math.atan2(-0.45, -0.9), c = Math.cos(ry), s = Math.sin(ry), LEA = 0x8e1a22, LEAD = 0x6e1018;
      const rb = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, r);
      const P = (geo, col, lx, y, lz, rot = [0, 0, 0]) => k.parts.push(part(geo, col, [ax + lx * c + lz * s, y, az - lx * s + lz * c], [rot[0], ry + rot[1], rot[2]]));
      P(rb(0.74, 0.3, 0.7, 0.06), LEAD, 0, 0.22, 0); P(rb(0.56, 0.12, 0.54, 0.05), LEA, 0, 0.42, -0.04);
      for (let i = 0; i < 4; i++) k.parts.push(part(new THREE.CylinderGeometry(0.025, 0.02, 0.08, 8), 0x2a1a10, [ax + (i % 2 ? 0.3 : -0.3) * c + (i < 2 ? 0.28 : -0.28) * s, 0.04, az - (i % 2 ? 0.3 : -0.3) * s + (i < 2 ? 0.28 : -0.28) * c]));
      for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 - 1.25 + i * 2.5 / 8, lx = Math.cos(a) * 0.3, lz = -Math.sin(a) * 0.3 + 0.0;   // the curved buttoned back and arms
        P(rb(0.2, 0.42, 0.12, 0.05), i % 2 ? LEA : 0x961d26, lx, 0.58, lz, [0, a + Math.PI / 2, 0]);
        P(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 10), LEA, lx * 1.03, 0.8, lz * 1.03, [0, a + Math.PI / 2, Math.PI / 2]);
        for (const y of [0.5, 0.64]) P(new THREE.SphereGeometry(0.012, 6, 4), 0x4a0a10, lx * 0.82, y + (i % 2) * 0.05, lz * 0.82); }
      k.blockers.push({ x0: ax - 0.42, x1: ax + 0.42, z0: az - 0.42, z1: az + 0.42, y1: 0.75 });
      k.colliders.push(new THREE.Box3(new THREE.Vector3(ax - 0.36, 0, az - 0.36), new THREE.Vector3(ax + 0.36, 0.45, az + 0.36))); }
    // on the wall between the desk and the doors: framed awards and an "Est. 1931" brass plaque; a brass lantern overhead
    { const wz2 = Z(385) + T2;
      [[3.35, 1.75, 'CAMRA PUB OF THE YEAR 2019 — ESSEX'], [3.85, 1.75, 'GOOD BEER GUIDE — LISTED'], [3.6, 1.32, 'FOOD HYGIENE RATING 5 — VERY GOOD']].forEach(([x, y, t]) => {
        R(x - 0.2, wz2, x + 0.2, wz2 + 0.025, 0.28, y, 0xb8923a); k.label(t, 0.34, 0.22, [x, y, wz2 + 0.027], [0, 0, 0], { bg: '#faf6ea', fg: '#2a1a0a', border: '#7a1f24', size: 26 }); });
      R(3.42, wz2, 3.78, wz2 + 0.02, 0.14, 2.15, 0xc9a24a); k.label('EST. 1931', 0.32, 0.1, [3.6, 2.15, wz2 + 0.022], [0, 0, 0], { bg: '#c9a24a', fg: '#2a1a0a', border: null, size: 60 });
      const lx = 3.9, lz = -12.0; k.cyl(0.006, 0.006, 0.5, lx, H - 0.25, lz, 0x222222, 4); k.cyl(0.12, 0.14, 0.04, lx, H - 0.52, lz, 0x2a2a2a, 4);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; k.box(0.015, 0.34, 0.015, lx + Math.cos(a) * 0.12, H - 0.71, lz + Math.sin(a) * 0.12, 0xb8923a); }
      k.parts.push(part(new THREE.CylinderGeometry(0.11, 0.11, 0.32, 4, 1, true), 0xf4ecd0, [lx, H - 0.71, lz], [0, Math.PI / 4, 0])); k.cyl(0.13, 0.1, 0.05, lx, H - 0.9, lz, 0x2a2a2a, 4); k.lamp(lx, H - 0.72, lz, 0xffd8a0, 0.06); k.pool(lx, 0, lz, 2.4, 0xffd8a0); }
    // a "please wait to be seated" stand on the way into the pub
    { const sx = 1.85, sz = -9.45; k.cyl(0.18, 0.2, 0.03, sx, 0.015, sz, 0x222222, 14); k.cyl(0.015, 0.015, 1.3, sx, 0.65, sz, 0xc9a24a, 8); R(sx - 0.24, sz - 0.015, sx + 0.24, sz + 0.015, 0.34, 1.3, 0x1b3a2a);
      k.label('PLEASE WAIT TO BE SEATED', 0.44, 0.3, [sx, 1.3, sz - 0.017], [0, Math.PI, 0], { bg: '#1b3a2a', fg: '#d4af37', border: '#d4af37', size: 44 }); blk(sx - 0.22, sz - 0.22, sx + 0.22, sz + 0.22, 1.5); }
    // a big coir mat inside the front doors
    { const mx = (door.x0 + door.x1) / 2 - door.uz * 0.75, mz = (door.z0 + door.z1) / 2 + door.ux * 0.75; k.box(door.L - 0.3, 0.012, 1.1, mx, 0.006, mz, 0x8a6a3a, { rot: [0, door.ry, 0] });
      const mt = canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#8a6a3a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '60,40,20' : '170,140,90'},0.4)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 1); } g.fillStyle = '#2a1a0a'; g.font = '700 30px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('THE OYSTERFLEET', w / 2, h / 2); });
      k.label('mat', door.L - 0.5, 0.75, [mx, 0.014, mz], [-Math.PI / 2, 0, door.ry], { tex: mt }); }
    // the waiting bench (button-back leather) along the left wall, framed old photos over it, the welcome sign above
    { const bx = X(615) + 0.08, bz0 = Z(470), bz1 = Z(585);
      R(bx, bz0, bx + 0.5, bz1, 0.42, 0.21, 0x3a2416, { block: true }); R(bx, bz0, bx + 0.5, bz1, 0.12, 0.48, 0x5a1a1a, { collide: true }); R(bx, bz0, bx + 0.14, bz1, 0.95, 0.475, 0x5a1a1a);
      for (let z = bz0 + 0.15; z < bz1 - 0.1; z += 0.18) for (const y of [0.7, 0.85]) k.parts.push(part(new THREE.SphereGeometry(0.012, 6, 4), 0x3a0e0e, [bx + 0.145, y, z]));
      for (const z of [bz0, bz1]) R(bx, z - 0.04, bx + 0.52, z + 0.04, 0.65, 0.325, 0x5a1a1a);
      const photo = (seed) => canvasTex(160, 120, (g, w, h) => { g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, w, h); g.fillStyle = '#5a4a3a'; g.fillRect(12, 12, w - 24, h - 24); g.fillStyle = '#b8a888'; g.fillRect(12, 60 + seed * 5, w - 24, 48 - seed * 5); for (let i = 0; i < 4 + seed; i++) { g.fillStyle = '#2a1e14'; g.fillRect(20 + i * 25, 40 + (i % 2) * 8, 10, 30); g.beginPath(); g.arc(25 + i * 25, 36 + (i % 2) * 8, 6, 0, 7); g.fill(); } g.fillStyle = '#3a2a1a'; g.font = 'italic 10px Georgia'; g.fillText(['The Oysterfleet, 1952', 'Darts team, 1978', 'Opening night, 1931'][seed % 3], 18, h - 4); });
      [[bz0 + 0.5, 1.6, 0], [bz0 + 1.25, 1.75, 1], [bz0 + 2.0, 1.6, 2]].forEach(([z, y, sd]) => { R(bx, z - 0.3, bx + 0.04, z + 0.3, 0.46, y, 0x2a1a10); k.label('photo', 0.52, 0.38, [bx + 0.042, y, z], [0, Math.PI / 2, 0], { tex: photo(sd) }); });
      k.label('WELCOME TO THE OYSTERFLEET — PLEASE KEEP RONNIE AWAY FROM THE BAR SNACKS', 2.2, 0.45, [bx + 0.004, 2.35, (bz0 + bz1) / 2], [0, Math.PI / 2, 0], { bg: '#1b3a2a', fg: '#d4af37', border: '#d4af37', size: 38 });
      blk(bx, bz0 - 0.05, bx + 0.52, bz1 + 0.05, 0.95); }
    // coat hooks with coats on the back wall, an umbrella stand by the door, two big plants
    { const hx = X(835) - 0.09; for (let i = 0; i < 5; i++) { const z = Z(430) + 0.1 + i * 0.3; k.box(0.08, 0.03, 0.03, hx - 0.02, 1.75, z, 0xc9a24a);
        if (i % 2 === 0) { R(hx - 0.18, z - 0.2, hx - 0.02, z + 0.2, 0.85, 1.28, [0x2a3a5a, 0x5a3a2a, 0x2a2a2a][i / 2]); R(hx - 0.16, z - 0.12, hx - 0.03, z + 0.12, 0.1, 1.72, [0x2a3a5a, 0x5a3a2a, 0x2a2a2a][i / 2]); } }
      R(hx - 0.01, Z(430), hx + 0.01, Z(430) + 1.45, 0.12, 1.75, 0x3a2416); blk(hx - 0.2, Z(430), hx + 0.1, Z(430) + 1.4, 1.5);
      const ux = X(835) - 0.24, uz = Z(497); k.cyl(0.13, 0.12, 0.5, ux, 0.25, uz, 0x2a2a2a, 12, { block: true }); for (let i = 0; i < 3; i++) { k.cyl(0.01, 0.01, 0.85, ux - 0.04 + i * 0.04, 0.6, uz + (i - 1) * 0.03, 0x111111, 6); k.cyl(0.03, 0.045, 0.3, ux - 0.04 + i * 0.04, 0.85, uz + (i - 1) * 0.03, [0x1e4ea8, 0xc62828, 0x111111][i], 8); }
      for (const [px, pz] of [[0.72, -9.05], [4.05, -9.95]]) pottedPlant(k, px, pz, { s: 1.15, pot: 0x2a2420, rim: 0xc9a24a });
    }
    // lights: two glass globes over the counter, downlights, a wall lamp by the door
    for (const z of [-13.3, -12.0]) { const x = 2.75; k.cyl(0.004, 0.004, 0.6, x, H - 0.3, z, 0x222222, 4); k.cyl(0.03, 0.045, 0.06, x, H - 0.63, z, 0xb87333, 10); for (let i = 0; i < 6; i++) { const r = new THREE.TorusGeometry(0.11, 0.004, 4, 16); r.rotateY(i / 6 * Math.PI); k.parts.push(part(r, 0xf0e6c8, [x, H - 0.77, z])); } k.lamp(x, H - 0.77, z, 0xffe2a8, 0.1); k.pool(x, 1.15, z, 0.9, 0xffc070); }
    for (const [x, z] of [[X(660), Z(520)], [X(740), Z(560)], [X(760), Z(420)]]) { k.lamp(x, H - 0.01, z, 0xfffbe8, 0.04); k.pool(x, 0, z, 1.8, 0xfff0d0); }
  }
  // the beer garden door at the end of the passage
  { const xc = (X(722) + X(793)) / 2;
    for (const sd of [-1, 1]) { const hx = xc + sd * (X(793) - X(722)) / 2 - sd * 0.06; k.box(0.75, 2.15, 0.05, hx + sd * 0.44, 1.08, GZ + 0.15, 0xf4f2ec); k.box(0.6, 1.9, 0.02, hx + sd * 0.44, 1.08, GZ + 0.18, 0xbfdce8); k.box(0.04, 0.04, 0.12, hx + sd * 0.78, 1.0, GZ + 0.12, 0x222222); }   // doors folded right back flat against the wall, hooked open
    k.label('BEER GARDEN →', 1.2, 0.3, [xc, 2.55, Z(1645) - 0.115], [0, Math.PI, 0], { bg: '#2e7d32', fg: '#fff', border: null, size: 60 }); }

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
  // a wall urinal: porcelain bowl, chrome flush pipe, a blue cake; (px, pz) on the wall face, (nx, nz) into the room
  const urinal = (px, pz, nx, nz) => {
    const ry = Math.atan2(nx, nz), at = (t, d) => [px + nz * t + nx * d, pz - nx * t + nz * d];
    const P = (geo, col, t, y, d, rot = [0, 0, 0]) => { const [x, z] = at(t, d); k.parts.push(part(geo, col, [x, y, z], [rot[0], ry + rot[1], rot[2]])); };
    P(new RoundedBoxGeometry(0.4, 0.66, 0.32, 3, 0.07), PORCELAIN, 0, 0.84, 0.16);                                   // the bowl
    P(new THREE.BoxGeometry(0.29, 0.44, 0.02), 0xe2e8ec, 0, 0.82, 0.315);                                              // the opening
    P(new THREE.BoxGeometry(0.27, 0.05, 0.12), 0xd8e2e8, 0, 0.6, 0.26);                                                // the trough
    P(new THREE.BoxGeometry(0.06, 0.03, 0.04), 0x3a7bd5, 0.05, 0.635, 0.25);                                           // urinal cake
    P(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8), 0xd0d4d8, 0, 1.36, 0.05);                                      // flush pipe
    P(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 10), 0xd0d4d8, 0, 1.58, 0.05); P(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 6), 0xd0d4d8, 0, 1.58, 0.1, [Math.PI / 2, 0, 0]);
    P(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), 0xd0d4d8, 0, 0.47, 0.1);                                          // waste
    const [bx, bz] = at(0, 0.18); k.blockers.push({ x0: bx - 0.22, x1: bx + 0.22, z0: bz - 0.22, z1: bz + 0.22, y1: 1.1 });
  };
  const divider = (px, pz, nx, nz) => { const ry = Math.atan2(nx, nz); k.box(0.03, 0.8, 0.45, px + nx * 0.25, 1.05, pz + nz * 0.25, 0xb0bec5, { rot: [0, ry, 0] }); };
  // a row of urinals along a wall, with privacy screens between them
  const urinalRow = (ax, az, bx, bz, nx, nz, gap = 0.72) => {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.floor(L / gap)), step = L / n, ux = (bx - ax) / L, uz = (bz - az) / L;
    for (let i = 0; i < n; i++) urinal(ax + ux * step * (i + 0.5), az + uz * step * (i + 0.5), nx, nz);
    for (let i = 1; i < n; i++) divider(ax + ux * step * i, az + uz * step * i, nx, nz);
  };
  // Men's: urinals on three walls (no cubicles), the sinks and a hand dryer on the right-hand wall, a frosted window up high
  { const x0 = X(175), x1 = X(415), z0 = Z(305), z1 = Z(465), wi = 0.08, dz0 = Z(465) - 0.08, doorX = X(365);
    clad(x0 + wi, z0 + wi, x1 - wi, z0 + 0.1, WTILE, 2.0, 0.5); clad(x0 + wi, z0 + wi, x0 + 0.1, z1 - wi, WTILE, 2.0, 0.5);
    clad(x0 + wi, z1 - 0.1, doorX - 0.1, z1 - wi, WTILE, 2.0, 0.5); clad(x1 - 0.1, z0 + wi, x1 - wi, z1 - wi, WTILE, 2.0, 0.5);
    urinalRow(x0 + 0.55, z0 + 0.1, x1 - 0.5, z0 + 0.1, 0, 1);                       // the back wall
    urinalRow(x0 + 0.1, z0 + 0.65, x0 + 0.1, z1 - 0.5, 1, 0);                      // the left wall
    urinalRow(x0 + 0.65, dz0 - 0.02, doorX - 0.35, dz0 - 0.02, 0, -1);             // the wall with the door
    sinks(x1 - 0.1, z1 - 2.85, z1 - 1.1, -1); dryer(x1 - 0.19, z1 - 0.55, -Math.PI / 2);
    k.box(0.2, 0.06, 0.06, x1 - 0.2, 1.06, z1 - 0.55, 0xb0b8c0); k.box(0.12, 0.04, 0.02, x1 - 0.105, 1.3, z1 - 0.55, 0x37474f, { rot: [0, -Math.PI / 2, 0] });   // its nozzle and badge
    k.box(0.12, 0.2, 0.1, x1 - 0.15, 1.2, z1 - 2.98, 0xeceff1);                                                   // soap dispenser
    k.cyl(0.17, 0.14, 0.55, x1 - 0.28, 0.275, z1 - 0.5, 0x9aa4ac, 12, { block: true });                           // paper towel bin
    { const wx = x0 + 1.6, wy = 2.45, wz = z0 + wi;                                                               // the frosted window, high on the back wall
      R(wx - 0.5, wz, wx + 0.5, wz + 0.06, 0.5, wy, 0xf4f4f2); R(wx - 0.44, wz + 0.06, wx + 0.44, wz + 0.07, 0.4, wy, 0xdfe7ea);
      const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.38), new THREE.MeshBasicMaterial({ color: 0xe9f0f2 })); fr.position.set(wx, wy, wz + 0.072); scene.add(fr);
      R(wx - 0.44, wz + 0.07, wx + 0.44, wz + 0.09, 0.03, wy + 0.02, 0xf4f4f2); R(wx - 0.5, wz, wx + 0.5, wz + 0.12, 0.03, wy - 0.27, 0xf4f4f2);
      k.box(0.1, 0.02, 0.03, wx, wy + 0.1, wz + 0.1, 0xc0c0c0); }
    k.label('MEN', 0.7, 0.25, [(X(365) + X(410)) / 2, 2.4, z1 + 0.09], [0, 0, 0], { bg: '#1f4fbf', fg: '#fff', border: null, size: 90 });
    k.label('NOW WASH YOUR HANDS (RONNIE: THAT INCLUDES THE GRAVY)', 0.6, 0.4, [x1 - 0.105, 1.6, z1 - 3.35], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', border: '#1f4fbf', size: 36 });
    k.lamp((x0 + x1) / 2, H - 0.01, (z0 + z1) / 2, 0xffffff, 0.12);
  }
  // ...and someone didn't flush (in the accessible toilet). Don't eat it, Ronnie.
  const poopAt = new THREE.Vector3(X(215) + 0.7, 0.4, Z(465) + 0.08 + 0.47);
  k.colliders.push({ min: new THREE.Vector3(poopAt.x - 0.12, 0, poopAt.z - 0.14), max: new THREE.Vector3(poopAt.x + 0.12, 0.31, poopAt.z + 0.14) });
  k.label("SOMEONE DIDN'T FLUSH", 0.5, 0.15, [poopAt.x, 1.4, Z(465) + 0.1], [0, 0, 0], { bg: '#fff', fg: '#5a3418', border: '#5a3418', size: 40 });
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
  bench(false, Z(1305) + 0.1, X(300), X(700), 1);                                                     // "Tables with booth" along the partition
  boothTable(X(390), Z(1305) + 0.95, false, 1); boothTable(X(510), Z(1305) + 0.95, false, 1); boothTable(X(635), Z(1305) + 0.95, false, 1);
  bench(true, X(195) + 0.08, Z(1390), Z(1530), 1);                                       // "Table booth" on the left wall
  boothTable(X(195) + 0.95, Z(1420), true, 1); boothTable(X(195) + 0.95, Z(1500), true, 1);
  freeTable(X(655), Z(1465), true);
  for (const px of [325, 430, 540]) freeTable(X(px), Z(1590), true);
  { const x0 = X(195), x1 = X(715), z0 = Z(1305), z1 = Z(1645);
    const glassM = new THREE.MeshLambertMaterial({ color: 0xdfeef4, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });
    for (const x of CONS_WIN) { const w = 2.2, h = WIN_Y1 - WIN_Y0, yc = (WIN_Y0 + WIN_Y1) / 2;
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassM); gl.position.set(x, yc, z1); gl.renderOrder = 4; scene.add(gl);
      k.colliders.push({ min: new THREE.Vector3(x - w / 2, WIN_Y0, z1 - 0.02), max: new THREE.Vector3(x + w / 2, WIN_Y1, z1 + 0.02) });
      for (const sd of [-1, 1]) { R(x - w / 2 - 0.06, z1 + sd * 0.03, x - w / 2, z1 + sd * 0.11, h + 0.12, yc, WHITE); R(x + w / 2, z1 + sd * 0.03, x + w / 2 + 0.06, z1 + sd * 0.11, h + 0.12, yc, WHITE);   // frames, inside and out
        R(x - w / 2, z1 + sd * 0.03, x + w / 2, z1 + sd * 0.11, 0.06, WIN_Y1 + 0.03, WHITE); R(x - w / 2, z1 + sd * 0.03, x + w / 2, z1 + sd * 0.11, 0.06, WIN_Y0 - 0.03, WHITE);
        for (const t of [-1 / 3, 1 / 3]) R(x + t * w - 0.02, z1 + sd * 0.005, x + t * w + 0.02, z1 + sd * 0.06, h, yc, WHITE);                                         // mullions
        R(x - w / 2, z1 + sd * 0.005, x + w / 2, z1 + sd * 0.05, 0.035, WIN_Y0 + h * 0.72, WHITE); }                                                                  // transom
      R(x - w / 2 - 0.15, z1 - 0.3, x + w / 2 + 0.15, z1 - 0.08, 0.05, WIN_Y0 - 0.02, WHITE, { collide: true });                                                       // inside sill
      R(x - w / 2 - 0.1, z1 + 0.08, x + w / 2 + 0.1, z1 + 0.22, 0.05, WIN_Y0 - 0.06, 0xd8d4cc); }                                                                    // outside sill
    for (const [i, z] of [z0 + 2.2, z0 + 4.6].entries()) k.window(x1 - 0.1, 1.6, z, 1.8, 1.7, -Math.PI / 2, streetViewTex(i + 2, true), { frame: WHITE, bars: 2 });
    k.light((x0 + x1) / 2, 2.5, (z0 + z1) / 2, 0xfff4e0, 4, 10);
    k.pool((x0 + x1) / 2, 0, (z0 + z1) / 2, 7, 0xfff8e8);
    k.label('THE CONSERVATORY — PLEASE DO NOT TAP ON THE GLASS (RONNIE: OR LICK IT)', 2.2, 0.4, [x0 + 0.12, 2.35, z1 - 1.8], [0, Math.PI / 2, 0], { bg: '#fff', fg: '#2e7d32', border: '#2e7d32', size: 36 });
    // plants in the corners
    for (const [x, z] of [[x1 - 0.4, z1 - 0.4], [x0 + 0.4, z1 - 0.4]]) pottedPlant(k, x, z, { s: 1.0, pot: 0xb05a32 });
  }

  // ================================================================ lights, beams, cladding, telly, signs
  // library wallpaper and exposed brick on the pub's walls, dark dado rail
  clad(X(195) + 0.08, Z(1035) + 0.1, X(195) + 0.1, Z(1090) - 0.1, BOOKS, H, 1.2); clad(X(195) + 0.08, Z(1145) + 0.1, X(195) + 0.1, Z(1300), BOOKS, H, 1.2);
  clad(X(195) + 0.08, Z(610), X(195) + 0.1, Z(960), BRICK, H - RAISE, 0.9, RAISE);
  for (const [za, zb] of [[Z(1035), Z(1090)], [Z(1145), Z(1305)]]) R(X(195) + 0.06, za, X(195) + 0.12, zb, 0.06, 0.95, DARKWOOD);   // dado rail (not across the restaurant doorway)
  // ceiling spotlights everywhere (in the rooms), iron chandeliers, red wall lights
  for (let x = B.x0 + 1; x < B.x1; x += 2) for (let z = B.z0 + 1; z < GZ; z += 2) if (inside(x, z) && !inRestaurant(x, z) && z < GZ) k.lamp(x, H - 0.01, z, 0xfffbe8, 0.035);
  // antler chandeliers (black antlers, little black drum shades), as in the photo
  const antler = (x, z, y0 = 0) => {
    const y = H - 0.62 + y0, BLK = 0x1c1612;
    k.cyl(0.006, 0.006, 0.5, x, H - 0.25, z, 0x111111, 4); k.parts.push(part(new THREE.SphereGeometry(0.07, 10, 8), BLK, [x, y, z], [0, 0, 0], [1, 0.8, 1]));
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + 0.3, ca = Math.cos(a), sa = Math.sin(a);
      const arc = new THREE.TorusGeometry(0.2, 0.016, 5, 10, Math.PI * 0.75); arc.rotateY(-a); k.parts.push(part(arc, BLK, [x + ca * 0.02, y - 0.02, z + sa * 0.02], [0, 0, 0], [1, 0.9, 1]));
      // tines branching up off each antler
      for (const [t, l] of [[0.35, 0.12], [0.6, 0.1], [0.85, 0.08]]) { const tx = x + ca * (0.2 + Math.cos(Math.PI * 0.75 * t) * 0.2) * 0.6, tz = z + sa * (0.2 + Math.cos(Math.PI * 0.75 * t) * 0.2) * 0.6; k.parts.push(part(new THREE.ConeGeometry(0.008, l, 5), BLK, [tx, y + Math.sin(Math.PI * 0.75 * t) * 0.18 + l / 2, tz], [ca * 0.4, 0, -sa * 0.4])); }
      const ex = x + ca * 0.4, ez = z + sa * 0.4;
      k.cyl(0.02, 0.02, 0.05, ex, y + 0.08, ez, BLK, 8); k.cyl(0.006, 0.006, 0.05, ex, y + 0.13, ez, 0xf5f0dc, 4);
      k.parts.push(part(new THREE.CylinderGeometry(0.055, 0.075, 0.1, 12, 1, true), 0x141414, [ex, y + 0.17, ez]));               // black drum shade
      k.lamp(ex, y + 0.14, ez, 0xffd8a0, 0.03);
    }
    k.pool(x, 0, z, 3.0, 0xffc070);
  };
  const chandelier = (x, z) => antler(x, z);
  const greenPendant = (x, z) => { k.cyl(0.004, 0.004, 0.9, x, H - 0.45, z, 0x111111, 4); k.parts.push(part(new THREE.CylinderGeometry(0.03, 0.17, 0.13, 16, 1, true), 0x1f7a3a, [x, H - 0.95, z])); k.cyl(0.03, 0.03, 0.04, x, H - 0.88, z, 0xc9a24a, 8); k.lamp(x, H - 1.0, z, 0xfff0c0, 0.05); k.pool(x, 0.76, z, 1.4, 0xffe0a0); };
  for (const [x, z] of [[X(370), Z(1065) - 0.5], [X(430), Z(1065) - 0.5], [X(370), Z(1065) + 0.49]]) greenPendant(x, z);
  [[X(300), Z(760)], [X(400), Z(870)], [X(580), Z(1000)], [X(400), Z(1150)], [X(600), Z(1180)], [X(820), Z(780)]].forEach(([x, z], i) => i < 5 && chandelier(x, z));
  for (const [x, z, ry] of [[X(195) + 0.1, Z(1100) + 0.5, 1], [X(195) + 0.1, Z(1250), 1], [X(195) + 0.1, Z(700), 1]]) { k.lamp(x + 0.08, 2.05, z, 0xff5040, 0.07); k.box(0.12, 0.14, 0.12, x + 0.06, 2.05, z, 0x8a1a1a); }
  // warm candles and pools of light on every table
  for (const [x, z] of candles) { const y = pubFloorAt(x, z); k.cyl(0.025, 0.025, 0.1, x + 0.2, 0.83 + y, z, 0xf5f0dc, 8); k.lamp(x + 0.2, 0.9 + y, z, 0xffb050, 0.018); k.pool(x, 0.76 + y, z, 1.3, 0xffd090); }
  // dark oak beams across the main room
  // cream tongue-and-groove bulkheads on dark beams round the room (instead of a grid of beams; the photo's ceiling is plain cream)
  for (const [x0, z0, x1, z1] of [[X(195), Z(1305) - 0.12, X(715) + 0.08, Z(1305) + 0.1], [X(455) - 0.1, Z(965), X(455) + 0.1, Z(1165)]]) {
    k.texBox(x1 - x0, 0.42, z1 - z0, (x0 + x1) / 2, H - 0.21, (z0 + z1) / 2, TNG, { tile: 0.5 }); k.box(x1 - x0 + 0.02, 0.08, z1 - z0 + 0.02, (x0 + x1) / 2, H - 0.45, (z0 + z1) / 2, 0x2a1a10); }
  k.box(0.08, 0.06, Z(1305) - Z(605), X(195) + 0.04, H - 0.05, (Z(605) + Z(1305)) / 2, 0xeeeae0);                          // cornice
  // big screens: the football is on
  const tv = (x, y, z, ry) => { k.box(2.0, 1.15, 0.08, x, y, z, 0x111111, { rot: [0, ry, 0] }); k.label('tv', 1.9, 1.05, [x + Math.sin(ry) * 0.05, y, z + Math.cos(ry) * 0.05], [0, ry, 0], { tex: tvTex(), glow: true }); };
  tv(X(250), 2.25, Z(605) + 0.12, 0);
  tv(X(885), 2.2, Z(1305) + 0.12, 0);
  // street-view windows with burgundy curtains on the raised area's outside wall... (none: it's an inside wall) -> on the restaurant side
  const signs = [
    ['STAFF OF THE MONTH: RONNIE (ATE THE CERTIFICATE)', 0.9, 0.7, [X(195) + 0.12, 1.8, Z(650)], [0, Math.PI / 2, 0], {}],
    ["TODAY'S SPECIALS: WHATEVER RONNIE HASN'T EATEN", 0.8, 1.0, [X(195) + 0.12, 1.55, Z(1160)], [0, Math.PI / 2, 0], { bg: '#1b2a1b', fg: '#f5f0e6', border: '#8a6a3a', size: 56 }],
    ['QUIZ NIGHT — Q1: How many pies did Ronnie eat last night? A: Yes.', 1.0, 0.7, [X(480), 1.9, Z(1305) + 0.105], [0, 0, 0], { bg: '#1b2a1b', fg: '#fff', border: '#8a6a3a', size: 48 }],
    ['WE DO NOT SERVE SALAD ("YES YOU DO" — Chloe)', 1.0, 0.5, [X(540), 1.9, Z(1305) + 0.105], [0, 0, 0], { bg: '#fff', fg: '#c0392b' }],
    ['OYSTERFLEET PIE-EATING CHAMPION — RONNIE (UNDEFEATED, UNCHALLENGED, UNWELL)', 1.0, 0.5, [X(195) + 0.12, 2.62, Z(1252)], [0, Math.PI / 2, 0], { bg: '#d4af37', fg: '#111', border: '#7a5a10', size: 48 }],
    ['PLEASE DO NOT FEED THE BARMAN', 1.6, 0.3, [X(795) - 0.155, 2.81, (Z(985) + Z(1230)) / 2], [0, -Math.PI / 2, 0], { bg: '#fff8e7', fg: '#111' }],
    ['LAST ORDERS — Ronnie: last orders means for the CUSTOMERS', 2.4, 0.3, [bar2.at(bar2.L / 2, -0.155)[0], 2.81, bar2.at(bar2.L / 2, -0.155)[1]], [0, bar2.ry, 0], { bg: '#fff06a', fg: '#111', border: null, size: 40 }],
    ['BARRED: RONNIE (FROM THE KITCHEN) (FROM THE CELLAR) (FROM THE CRISP CLIP)', 1.3, 0.6, [X(195) + 0.12, 2.45, Z(1062)], [0, Math.PI / 2, 0], { bg: '#fff', fg: '#c62828', border: '#c62828', size: 38 }],
    ['HAPPY HOUR 5–7PM. RONNIE\'S HAPPY HOUR: 11AM–CLOSING', 1.2, 0.4, [X(810), 2.3, Z(605) + 0.1], [0, 0, 0], { bg: '#ffd400', fg: '#111', border: null, size: 40 }],
    ['CARVERY SUNDAYS — RONNIE SIZE PORTION: THE WHOLE CARVERY', 1.3, 0.45, [X(195) + 0.115, 2.45, Z(1178)], [0, Math.PI / 2, 0], { bg: '#5a2a14', fg: '#ffd400', border: '#ffd400', size: 40 }],
    ['IN CASE OF EMERGENCY: BREAK GLASS. IN CASE OF RONNIE: HIDE THE PIES.', 0.8, 0.4, [X(795) + 0.1, 2.3, Z(1500)], [0, Math.PI / 2, 0], { bg: '#c62828', fg: '#fff', border: '#fff', size: 34 }],
    ['CAUTION: RONNIE SWEAT', 0.42, 0.5, [X(620) - Math.sin(Math.PI / 4) * 0.022, 0.38, Z(1270) - 0.6 + Math.cos(Math.PI / 4) * 0.022], [0, -Math.PI / 4, 0], { bg: '#ffd400', fg: '#111', border: '#111', size: 60 }],
    ['TOILET ATTENDANT: NONE. RONNIE, PLEASE STOP OFFERING.', 0.9, 0.3, [X(415) - 0.1, 2.2, Z(560)], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', border: '#1f4fbf', size: 34 }],
  ];
  for (const [t, w, h, pos, rot, o] of signs) k.label(t, w, h, pos, rot, o);
  { const cx = X(620), cz = Z(1270) - 0.6; { const g = new THREE.BoxGeometry(0.46, 0.7, 0.03); g.translate(0, 0.35, 0); g.rotateY(-Math.PI / 4); g.translate(cx, 0, cz); k.parts.push(part(g, 0xffd400)); for (const sx of [-1, 1]) { const f = new THREE.BoxGeometry(0.03, 0.03, 0.4); f.translate(sx * 0.2, 0.015, 0); f.rotateY(-Math.PI / 4); f.translate(cx, 0, cz); k.parts.push(part(f, 0x222222)); } } }   // its A-frame stand
  // ---- the wall between the main room and the conservatory, from the photo
  { const zc = Z(1305), PANEL = 0x4a2e1a, FRAME = 0xf4f2ec, glassM = new THREE.MeshLambertMaterial({ color: 0xdff0f4, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    const winWall = (x0, x1) => {
      const L = x1 - x0, cx = (x0 + x1) / 2, top = 2.55, sill = 0.98;
      R(x0, zc - 0.08, x1, zc + 0.08, sill, sill / 2, PANEL, { collide: true });                                                       // dark panelled half wall
      for (let x = x0 + 0.3; x < x1 - 0.1; x += 0.6) for (const sd of [-1, 1]) R(x - 0.24, zc + sd * 0.08, x + 0.24, zc + sd * 0.095, 0.62, 0.52, 0x5a3a22);   // raised panels both faces
      R(x0 - 0.02, zc - 0.13, x1 + 0.02, zc + 0.13, 0.05, sill + 0.025, FRAME);                                                       // sill
      R(x0, zc - 0.08, x1, zc + 0.08, H - top, top + (H - top) / 2, PLASTER);                                                          // wall over the window
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(L, top - sill - 0.05), glassM); gl.position.set(cx, (sill + 0.05 + top) / 2, zc); gl.renderOrder = 3; scene.add(gl);
      const n = Math.max(1, Math.round(L / 1.1)), bw = L / n;
      for (let i = 0; i <= n; i++) R(x0 + i * bw - 0.04, zc - 0.05, x0 + i * bw + 0.04, zc + 0.05, top - sill, (top + sill) / 2, FRAME);         // mullions
      for (const y of [top - 0.02, 2.0]) R(x0, zc - 0.05, x1, zc + 0.05, 0.05, y, FRAME);                                              // transom and head
      for (let i = 0; i < n; i++) { const mx = x0 + (i + 0.5) * bw;
        R(mx - 0.012, zc - 0.03, mx + 0.012, zc + 0.03, 2.0 - sill - 0.05, (2.0 + sill) / 2, FRAME);                                    // a glazing bar down the middle
        for (const r of [bw * 0.42, bw * 0.3]) { const a = new THREE.TorusGeometry(r, 0.01, 4, 18, Math.PI); k.parts.push(part(a, FRAME, [mx, 2.02, zc], [0, 0, 0], [1, (top - 2.05) / r * 0.95, 1])); }   // leaded arches in the top lights
        for (const s4 of [-1, 1]) R(mx + s4 * bw * 0.21 - 0.008, zc - 0.03, mx + s4 * bw * 0.21 + 0.008, zc + 0.03, top - 2.05, (top + 2.05) / 2, FRAME); }
      blk(x0, zc - 0.1, x1, zc + 0.1, H);
    };
    winWall(X(330), X(452)); winWall(X(565), X(715));
    // the cubby: brick on three sides, set back into the conservatory side
    // the brick corner (from the photo): a brick wall in line with the windows, its booth meeting the partition's
    // booth in an L, the old beer mirror under a brick arch and the telly above, lights either side, a brick pier
    const cx0 = X(452), cx1 = X(565), cz = zc;
    R(cx0, zc - 0.08, cx1, zc + 0.08, H, H / 2, PLASTER, { collide: true, block: true });
    clad(cx0 + 0.08, zc - 0.1, cx1, zc - 0.08, BRICK, H, 0.75); clad(cx0, zc + 0.08, cx1, zc + 0.1, BRICK, H, 0.75);
    clad(X(290), zc - 0.1, X(330), zc - 0.08, BRICK, H, 0.75);
    k.texBox(0.34, H, 0.3, cx1, H / 2, zc - 0.07, BRICK, { tile: 0.75, collide: true, block: true });                         // brick pier where it meets the windows
    bench(false, cz - 0.08, cx0 + 0.56, cx1 - 0.2, -1);                                                                             // the booth along the brick
    for (const x of [X(500), X(540)]) { const tz = zc - 0.9; put(CYL(0.28, 0.28, 0.035, 20), 0x2a1810, x, tz, 0, 0, 0.74, 0); put(CYL(0.035, 0.035, 0.7, 8), 0x161616, x, tz, 0, 0, 0.36, 0); put(CYL(0.22, 0.24, 0.04, 16), 0x161616, x, tz, 0, 0, 0.02, 0);
      k.colliders.push({ min: new THREE.Vector3(x - 0.26, 0.72, tz - 0.26), max: new THREE.Vector3(x + 0.26, 0.76, tz + 0.26) }); k.blockers.push({ x0: x - 0.28, x1: x + 0.28, z0: tz - 0.28, z1: tz + 0.28, y1: 0.76 }); tentCard(x - 0.1, 0.757, tz, 0);
      k.spawns.push(new THREE.Vector3(x + 0.12, 0.84, tz)); }
    const mir = canvasTex(256, 160, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#9aa4a8'); gr.addColorStop(0.5, '#d8e0e2'); gr.addColorStop(1, '#8a9498'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#c9a24a'; g.font = '700 25px Georgia, serif'; g.textAlign = 'center'; g.fillText('OYSTER STOUT', w / 2, 62, w - 40); g.font = 'italic 17px Georgia, serif'; g.fillText('is good for Ronnie', w / 2, 96, w - 40); g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.strokeRect(14, 14, w - 28, h - 28); });
    const mc = (cx0 + 0.56 + cx1) / 2, fz = zc - 0.1;
    R(mc - 0.55, fz - 0.02, mc + 0.55, fz, 0.7, 1.45, 0x2a1a10); k.label('mirror', 1.0, 0.6, [mc, 1.45, fz - 0.026], [0, Math.PI, 0], { tex: mir });
    const arch = new THREE.TorusGeometry(0.6, 0.05, 6, 18, Math.PI); arch.rotateY(Math.PI); k.parts.push(part(arch, 0x7a3020, [mc, 1.8, fz - 0.02], [0, 0, 0], [1, 0.35, 1]));
    k.box(1.3, 0.76, 0.06, mc, 2.4, fz - 0.03, 0x111111); k.label('tv', 1.22, 0.69, [mc, 2.4, fz - 0.065], [0, Math.PI, 0], { tex: tvTex(), glow: true }); k.box(0.3, 0.1, 0.05, mc, 2.0, fz - 0.025, 0x111111);
    for (const x of [mc - 0.95, mc + 0.95]) { k.box(0.1, 0.16, 0.05, x, 2.0, fz - 0.03, 0x1a1a1a); k.lamp(x, 2.08, fz - 0.07, 0xffd8a0, 0.05); sconceGlow(k, x, 2.0, fz - 0.09, x, fz + 1); }
    k.lamp(mc, H - 0.01, zc - 0.6, 0xfffbe8, 0.04); k.light(mc, 2.2, zc - 1.0, 0xffc884, 2.5, 4);
    // a fern in a pot by the window and the pillar, like the photo
    pottedPlant(k, X(345), zc - 0.45, { s: 0.95, pot: 0x5a3a22, fronds: 22 });
    // posters on the pillar and brick
    k.label('MATCH NIGHT — ALL GAMES SHOWN (RONNIE: ALL PIES EATEN)', 0.42, 0.6, [X(290) + 0.05 + 0.29, 1.6, zc - 0.35], [0, Math.PI / 2, 0], { bg: '#1a1a3a', fg: '#ffd400', border: '#c9a24a', size: 36 });
  }
  // the white painted dresser and the console table (menus, hand gel) by the books wall, the telly above, a red glow
  { const x = X(195) + 0.08, z0 = Z(1200), z1 = Z(1290), zc = (z0 + z1) / 2, D = 0.45;
    R(x, z0, x + D, z1, 0.85, 0.425, 0xeeece6, { collide: true, block: true }); R(x - 0.01, z0 - 0.02, x + D + 0.03, z1 + 0.02, 0.04, 0.87, 0xd8d4ca);
    for (let i = 0; i < 3; i++) { const za = z0 + 0.1 + i * (z1 - z0 - 0.2) / 3, zb = za + (z1 - z0 - 0.2) / 3 - 0.04; R(x + D, za, x + D + 0.01, zb, 0.22, 0.7, 0xe4e2dc); k.cyl(0.015, 0.015, 0.02, x + D + 0.02, 0.7, (za + zb) / 2, 0xb8a070, 8); R(x + D, za, x + D + 0.01, zb, 0.4, 0.3, 0xe4e2dc); }
    R(x, z0, x + 0.3, z0 + 0.04, 1.2, 1.5, 0xeeece6); R(x, z1 - 0.04, x + 0.3, z1, 1.2, 1.5, 0xeeece6); R(x, z0, x + 0.3, z1, 0.05, 2.12, 0xeeece6);
    for (const y of [1.25, 1.6, 1.95]) { R(x, z0, x + 0.28, z1, 0.03, y, 0xeeece6); for (let zz = z0 + 0.15; zz < z1 - 0.1; zz += 0.24) k.parts.push(part(new THREE.CylinderGeometry(0.09, 0.09, 0.012, 16), [0xf8f8f8, 0x2a5aa8, 0xf0e8d0][Math.round(zz * 7) % 3], [x + 0.07, y + 0.1, zz], [0, 0, Math.PI / 2 - 0.15])); }
    k.label('BOOKINGS: RONNIE, TABLE FOR ONE, FOOD FOR TWELVE', 0.3, 0.2, [x + 0.2, 0.89, zc - 0.3], [-Math.PI / 2, 0, Math.PI / 2], { bg: '#fffdf2', fg: '#111', border: null, size: 30 });
    R(x + 0.12, zc + 0.05, x + 0.32, zc + 0.3, 0.16, 0.95, 0x8a5a2a); k.cyl(0.03, 0.03, 0.14, x + 0.25, 0.94, zc - 0.05, 0x2a7ac8, 8); k.cyl(0.012, 0.012, 0.04, x + 0.25, 1.03, zc - 0.05, 0xf4f4f4, 6);
    k.spawns.push(new THREE.Vector3(x + 0.3, 0.95, zc - 0.25));
    k.box(1.3, 0.76, 0.06, x + 0.05, 2.35, Z(1120), 0x111111, { rot: [0, Math.PI / 2, 0] }); k.label('tv', 1.22, 0.69, [x + 0.09, 2.35, Z(1120)], [0, Math.PI / 2, 0], { tex: tvTex(), glow: true });
    k.light(x + 0.6, 2.5, zc, 0xff3a3a, 2.2, 4); k.lamp(x + 0.08, 2.92, Z(1215), 0xff4040, 0.06);
  }
  // real warm lights over the bar and the middle of the room
  k.light(X(720), 2.3, Z(900), 0xffb060, 7, 9);
  k.light(X(420), 2.4, Z(1050), 0xffc884, 5, 10);
  k.light(X(320), 2.4, Z(780), 0xffc884, 4, 7);
  k.pool(PX, 0, PZ, 2.2, 0xffe0b0);

  // ================================================================ the beer garden (from the photos)
  // out of the back door: a dark timber deck along the back of the pub, a railing, the green stream with sleeper
  // edges and slate chippings, the little arched footbridge over it, lattice and hedges, then the block-paved
  // garden with the octagonal shingle-roofed outdoor bar in the middle, picnic benches and yellow Bulmers
  // parasols everywhere, barrels, planters, lamp posts; a raised deck with round tables along the river on the
  // right (reeds and water beyond), a smoking shelter on the left, hedges and the houses beyond.
  { const DECK = woodTex('#4a3a30'), PAVE = tileTex('#9a948c', '#8e8880', '#6e6a64', 48), SLATE = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#7a7c86'; g.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { g.fillStyle = ['#5a5c66', '#9a9ca8', '#6e6a78', '#8a8494'][i % 4]; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 1.5 + Math.random() * 2, Math.random() * 3, 0, 7); g.fill(); } });
    const LEAFT = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#4a7a2a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = ['#3a6a22', '#6a9a3a', '#2e5a1e', '#8ab04a', '#c8d050'][i % 5]; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 3, 1.6, Math.random() * 3, 0, 7); g.fill(); } });
    const DKW = 0x2e2420, FENCE = 0x3a2e28, GREENW = 0x6ab84a;
    const flr = (x0, z0, x1, z1, tex, rep2, y = 0.004) => { const m = k.floor(x0, z0, x1, z1, tex, y, rep2); return m; };
    // ---- the back of the pub from outside: black weatherboard with white windows, a brick wing, a tiled roof
    const weather = canvasTex(256, 128, (g, w, h) => { for (let y = 0; y < h; y += 16) { g.fillStyle = '#1e2228'; g.fillRect(0, y, w, 16); g.fillStyle = '#2a2e36'; g.fillRect(0, y, w, 4); g.fillStyle = '#121418'; g.fillRect(0, y + 14, w, 2); } });
    const brickO = oldBrickTex();
    // upstairs: weatherboard right along the back of the building
    const CX0 = X(195), CX1 = X(715);
    k.texBox(CX0 - B.x0, 3.9, 0.2, (B.x0 + CX0) / 2, H + 1.95, GZ, weather, { tile: 1.2 }); k.texBox(GX1 - CX1, 3.9, 0.2, (CX1 + GX1) / 2, H + 1.95, GZ, weather, { tile: 1.2 });
    k.texBox(CX1 - CX0, 3.9, 0.2, (CX0 + CX1) / 2, H + 1.95, GZ, weather, { tile: 1.2 });   // (the conservatory is part of the building: the upstairs runs straight over it)
    // cladding with the conservatory's window openings left clear
    const cladHoles = (x0, x1, y0, y1, d, z, tex, tile) => { let a = x0;
      for (const c of CONS_WIN) { const o0 = Math.max(c - 1.1, x0), o1 = Math.min(c + 1.1, x1); if (o1 <= o0) continue;
        if (o0 > a) k.texBox(o0 - a, y1 - y0, d, (a + o0) / 2, (y0 + y1) / 2, z, tex, { tile });
        k.texBox(o1 - o0, WIN_Y0 - y0, d, (o0 + o1) / 2, (y0 + WIN_Y0) / 2, z, tex, { tile }); k.texBox(o1 - o0, y1 - WIN_Y1, d, (o0 + o1) / 2, (WIN_Y1 + y1) / 2, z, tex, { tile }); a = o1; }
      if (x1 > a) k.texBox(x1 - a, y1 - y0, d, (a + x1) / 2, (y0 + y1) / 2, z, tex, { tile }); };
    cladHoles(-6, 2.93, 0, H, 0.03, GZ + 0.095, weather, 1.2); k.texBox(GX1 - 4.63, H, 0.03, (GX1 + 4.63) / 2, H / 2, GZ + 0.095, weather, { tile: 1.2 });
    cladHoles(B.x0, -6, 0, H, 0.06, GZ + 0.11, brickO, 0.9); k.texBox(CX0 - B.x0, 3.9, 0.06, (B.x0 + CX0) / 2, H + 1.95, GZ + 0.11, brickO, { tile: 0.9 });   // the brick wing on the left
    for (const x of [-12, -8.5, -3.5, 0, 6, 9.2]) { const wz = 0; k.box(0.9, 1.0, 0.06, x, H + 1.7, GZ + wz + 0.13, 0xf4f4f0); k.box(0.78, 0.88, 0.02, x, H + 1.7, GZ + wz + 0.165, 0x5a6a78); k.box(0.04, 0.88, 0.03, x, H + 1.7, GZ + wz + 0.17, 0xf4f4f0); k.box(0.78, 0.04, 0.03, x, H + 1.95, GZ + wz + 0.17, 0xf4f4f0); }   // upstairs sash windows
    const goth = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3a4a56'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f4f4f0'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); g.lineWidth = 6; for (const x of [w / 3, 2 * w / 3]) { g.beginPath(); g.moveTo(x, h); g.lineTo(x, h * 0.42); g.stroke(); } g.beginPath(); g.moveTo(0, h * 0.42); g.lineTo(w, h * 0.42); g.stroke(); for (const cx of [w / 6, w / 2, 5 * w / 6]) { g.beginPath(); g.moveTo(cx - w / 6, h * 0.42); g.quadraticCurveTo(cx - w / 6, h * 0.1, cx, h * 0.04); g.quadraticCurveTo(cx + w / 6, h * 0.1, cx + w / 6, h * 0.42); g.stroke(); } });
    k.box(GX1 - B.x0, 0.1, 0.3, (B.x0 + GX1) / 2, H + 0.05, GZ + 0.2, 0xf4f4f0);                                   // white fascia between the floors
    { const rf = new THREE.PlaneGeometry(GX1 - B.x0 + 0.6, 4.2), tiles = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7a3a2a'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) for (let x = (y / 16 % 2) * 12; x < w; x += 24) { g.fillStyle = ['#8a4a32', '#6a3222', '#9a5238'][(x + y) % 3]; g.fillRect(x + 1, y + 1, 22, 14); } }); tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(16, 4);
      const m = new THREE.Mesh(rf, new THREE.MeshLambertMaterial({ map: tiles, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2 + 0.6;
      for (const [x0, x1, z] of [[B.x0 - 0.3, CX0, GZ], [CX1, GX1 + 0.3, GZ], [CX0 - 0.1, CX1 + 0.1, GZ]]) { const r = m.clone(); r.geometry = new THREE.PlaneGeometry(x1 - x0, 4.2); r.position.set((x0 + x1) / 2, H + 3.9 + 1.2, z - 1.6); scene.add(r); } }
    k.box(1.9, 0.08, 1.0, (2.93 + 4.63) / 2, 2.55, GZ + 0.55, 0x1a1a1a); for (const sd of [-1, 1]) k.box(0.05, 0.05, 1.0, (2.93 + 4.63) / 2 + sd * 0.9, 2.45, GZ + 0.55, 0x1a1a1a, { rot: [0.5, 0, 0] });   // a canopy over the door
    k.lamp(2.6, 2.3, GZ + 0.2, 0xfff0d0, 0.06); k.lamp(5.0, 2.3, GZ + 0.2, 0xfff0d0, 0.06);
    // (everything from here on is laid out the other way round, then mirrored so the river is on the right as you walk out)
    const mark = { p: k.parts.length, c: k.colliders.length, b: k.blockers.length, s: k.spawns.length, l: (k.lights || []).length, o: scene.children.length, r: (k.boxRec || []).length,
      lamps: new Map([...(k.lamps || new Map())].map(([c, l]) => [c, l.length])), halos: k.halos ? k.halos.list.length : 0, pools: k.pools ? k.pools.list.length : 0, inst: new Map([...(k.inst || new Map())].map(([key, v]) => [key, v.list.length])) };
    // ---- the deck along the back of the pub, its railing, picnic benches and the colourful cube seats
    flr(GX0, GZ, GX1, 19.4 + DW, DECK, 0.6);
    const railX = (x0, x1, z, h = 1.0) => { R(x0, z - 0.04, x1, z + 0.04, 0.07, h, FENCE); R(x0, z - 0.03, x1, z + 0.03, 0.06, 0.15, FENCE); for (let x = x0; x <= x1 + 1e-3; x += 0.12) k.box(0.05, h - 0.12, 0.025, x, (h + 0.12) / 2, z, FENCE); for (let x = x0; x <= x1 + 1e-3; x += 1.8) k.box(0.1, h + 0.08, 0.1, x, (h + 0.08) / 2, z, DKW); blk(x0, z - 0.06, x1, z + 0.06, h); };
    const railZ = (x, z0, z1, h = 1.0, y0 = 0) => { R(x - 0.04, z0, x + 0.04, z1, 0.07, h + y0, FENCE); for (let z = z0; z <= z1 + 1e-3; z += 0.12) k.box(0.025, h - 0.12, 0.05, x, (h + 0.12) / 2 + y0, z, FENCE); for (let z = z0; z <= z1 + 1e-3; z += 1.8) k.box(0.1, h + 0.08 + y0, 0.1, x, (h + 0.08 + y0) / 2, z, DKW); blk(x - 0.06, z0, x + 0.06, z1, h + y0); };
    railX(GX0, 5.4, 19.4); railX(7.0, GX1, 19.4); railZ(GX0, GZ, 19.28);
    // picnic bench: top of five planks, two seats, A-frame legs, cross braces (local x along the table)
    const UMB = canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#f2c81a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.18)'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 4, h); g.fillStyle = '#7a1a2a'; g.font = '900 54px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('B', w / 2, h * 0.38); g.font = '900 20px Georgia, serif'; g.save(); g.translate(w / 2, h * 0.68); g.rotate(-Math.PI / 2); g.fillText('BULMERS', 0, 0); g.restore(); });
    const umbM = new THREE.MeshLambertMaterial({ map: UMB }), poleM = new THREE.MeshLambertMaterial({ color: 0xd8d8d8 });
    const closedG = new THREE.LatheGeometry([[0.002, 0], [0.05, 0.05], [0.13, 0.35], [0.11, 0.9], [0.05, 1.15], [0.02, 1.25], [0, 1.25]].map(([a, b]) => new THREE.Vector2(a, b)), 10);
    const openG = new THREE.ConeGeometry(1.25, 0.42, 8, 1, true); openG.translate(0, 0.21, 0);
    const poleG = new THREE.CylinderGeometry(0.02, 0.02, 2.3, 6); poleG.translate(0, 1.15, 0);
    const MM = new THREE.Matrix4(), QQ = new THREE.Quaternion(), V3 = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1);
    const parasol = (x, z, y0, open) => { MM.compose(V3.set(x, y0, z), QQ.identity(), S1); k.instance(poleG, poleM, MM.clone());
      if (open) { MM.compose(V3.set(x, y0 + 2.05, z), QQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 8), S1); k.instance(openG, umbM, MM.clone()); k.halo(x, y0 + 1.9, z, 0.01, 0xffffff); }
      else { MM.compose(V3.set(x, y0 + 1.05, z), QQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (x * 7 + z * 3) % 6), S1); k.instance(closedG, umbM, MM.clone()); } };
    const WOODP = 0x5a3e2e, WOODL = 0x6e4a34;
    // weathered, stained timber: every plank a slightly different shade, rounded edges, gaps between the boards,
    // galvanised coach bolts at the joints, a little cracking/greying at the plank ends
    const TIMBER = [0x7a5638, 0x6e4c30, 0x83603e, 0x705034, 0x664628, 0x7e5a3a, 0x5e422a];
    let tn = 0; const tcol = () => TIMBER[(tn++ * 5 + 3) % TIMBER.length];
    const plank = (len, wd, th) => new RoundedBoxGeometry(len, th, wd, 1, Math.min(0.009, th / 2 - 0.001));
    const BOLT = 0x9aa0a4;
    const bench = (x, z, ry, y0 = 0, umb = null) => {
      // the top: five boards with gaps, two cleats underneath
      for (let i = -2; i <= 2; i++) { const L = 1.8 + ((i * 7 + 9) % 3) * 0.008, c = tcol(); put(plank(L, 0.132, 0.044), c, x, z, ry, 0, 0.748 + y0, i * 0.145);
        for (const e of [-1, 1]) put(new THREE.BoxGeometry(0.012, 0.045, 0.13), 0x4a3424, x, z, ry, e * (L / 2 - 0.004), 0.748 + y0, i * 0.145); }   // end grain
      for (const lx of [-0.62, 0.62]) put(new THREE.BoxGeometry(0.045, 0.06, 0.74), 0x5a3e28, x, z, ry, lx, 0.697 + y0, 0);
      // the seats: two boards each side, on long bearers
      for (const s2 of [-1, 1]) for (const o of [-0.072, 0.072]) { const c = tcol(); put(plank(1.8, 0.132, 0.042), c, x, z, ry, 0, 0.452 + y0, s2 * 0.6 + o);
        for (const e of [-1, 1]) put(new THREE.BoxGeometry(0.012, 0.043, 0.128), 0x4a3424, x, z, ry, e * 0.896, 0.452 + y0, s2 * 0.6 + o); }
      // the A-frames: a seat bearer right across, two splayed legs crossing it, bolted through
      for (const lx of [-0.62, 0.62]) {
        put(new THREE.BoxGeometry(0.048, 0.085, 1.5), 0x5a3e28, x, z, ry, lx, 0.39 + y0, 0);
        for (const s2 of [-1, 1]) { put(new THREE.BoxGeometry(0.05, 0.86, 0.095), tcol(), x, z, ry, lx + (lx > 0 ? 0.05 : -0.05), 0.37 + y0, s2 * 0.25, s2 * 0.47);
          for (const [yy, zz] of [[0.39, s2 * 0.25], [0.7, s2 * 0.1]]) put(CYL(0.014, 0.014, 0.012, 8), BOLT, x, z, ry, lx + (lx > 0 ? 0.081 : -0.081), yy + y0, zz, 0, Math.PI / 2); }
        put(CYL(0.014, 0.014, 0.012, 8), BOLT, x, z, ry, lx + (lx > 0 ? 0.031 : -0.031), 0.39 + y0, 0.62, 0, Math.PI / 2); put(CYL(0.014, 0.014, 0.012, 8), BOLT, x, z, ry, lx + (lx > 0 ? 0.031 : -0.031), 0.39 + y0, -0.62, 0, Math.PI / 2);
      }
      // a stretcher between the frames and two diagonal braces up to the top
      put(new THREE.BoxGeometry(1.24, 0.07, 0.05), 0x5a3e28, x, z, ry, 0, 0.27 + y0, 0);
      for (const sx of [-1, 1]) put(new THREE.BoxGeometry(0.62, 0.05, 0.045), 0x5a3e28, x, z, ry, sx * 0.3, 0.5 + y0, 0, 0, sx * 0.62);
      // what's on it: sometimes a tin ashtray, a half-drunk pint, a condiment caddy
      const r = ((x * 13 + z * 7) % 1 + 1) % 1;
      if (r < 0.35) { put(CYL(0.055, 0.045, 0.03, 12), 0x9aa0a6, x, z, ry, 0.35, 0.785 + y0, 0.1); put(CYL(0.006, 0.006, 0.05, 6), 0xf0e8d8, x, z, ry, 0.36, 0.8 + y0, 0.12, 0, 1.4); }
      if (r > 0.25 && r < 0.7) { put(CYL(0.04, 0.032, 0.15, 12), 0xd8eef2, x, z, ry, -0.3, 0.845 + y0, -0.12); put(CYL(0.037, 0.031, 0.08, 12), 0xc87a1a, x, z, ry, -0.3, 0.812 + y0, -0.12); put(CYL(0.038, 0.038, 0.02, 12), 0xf4ecd8, x, z, ry, -0.3, 0.86 + y0, -0.12); }
      if (r > 0.6) { put(new THREE.BoxGeometry(0.16, 0.07, 0.1), 0x2a2a2a, x, z, ry, 0.0, 0.805 + y0, 0.0); for (const [dx, c] of [[-0.05, 0xc8202a], [0, 0xf4c020], [0.05, 0x6a3a1a]]) put(CYL(0.018, 0.02, 0.13, 8), c, x, z, ry, dx, 0.875 + y0, 0.0); }
      const c = Math.abs(Math.cos(ry)), sx = c > 0.5 ? 0.95 : 0.8, sz = c > 0.5 ? 0.8 : 0.95;
      k.colliders.push({ min: new THREE.Vector3(x - (c > 0.5 ? 0.9 : 0.36), 0.72 + y0, z - (c > 0.5 ? 0.36 : 0.9)), max: new THREE.Vector3(x + (c > 0.5 ? 0.9 : 0.36), 0.77 + y0, z + (c > 0.5 ? 0.9 : 0.36)) });
      blk(x - sx, z - sz, x + sx, z + sz, 0.77 + y0); k.spawns.push(new THREE.Vector3(x + (c > 0.5 ? 0.3 : 0.05), 0.85 + y0, z + (c > 0.5 ? 0.05 : 0.3)));
      if (umb !== null) parasol(x, z, y0, umb);
    };
    // a round picnic table: a planked top cut to a circle, a ring of four curved two-board seats, a cross frame
    const arcSeat = (r0, r1, a0, a1, th) => { const sh = new THREE.Shape(); sh.absarc(0, 0, r1, a0, a1, false); sh.absarc(0, 0, r0, a1, a0, true); const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: 10 }); g.rotateX(Math.PI / 2); return g; };
    const roundT = (x, z, y0 = 0, umb = null) => {
      const RT = 0.62;
      for (let i = -4; i <= 4; i++) { const zz = i * 0.138; if (Math.abs(zz) > RT - 0.04) continue; const L = 2 * Math.sqrt(RT * RT - zz * zz); put(plank(L, 0.128, 0.042), tcol(), x, z, 0.3, 0, 0.75 + y0, zz); }
      for (const a of [0.3, 0.3 + Math.PI / 2]) put(new THREE.BoxGeometry(1.1, 0.05, 0.05), 0x5a3e28, x, z, a, 0, 0.705 + y0, 0);
      for (let i = 0; i < 4; i++) { const a0 = i * Math.PI / 2 + 0.25, a1 = a0 + Math.PI / 2 - 0.5;
        for (const [r0, r1] of [[0.86, 0.99], [1.005, 1.135]]) put(arcSeat(r0, r1, a0, a1, 0.038), tcol(), x, z, 0, 0, 0.47 + y0, 0);
        const am = (a0 + a1) / 2; put(new THREE.BoxGeometry(1.2, 0.07, 0.05), 0x5a3e28, x, z, -am, 0.55, 0.4 + y0, 0);              // the arm out to each seat
        put(new THREE.BoxGeometry(0.06, 0.42, 0.06), 0x4a3020, x, z, -am, 1.0, 0.21 + y0, 0); put(CYL(0.014, 0.014, 0.012, 8), BOLT, x, z, -am, 1.0, 0.4 + y0, 0.035, Math.PI / 2); }
      put(CYL(0.06, 0.06, 0.72, 10), 0x4a3020, x, z, 0, 0, 0.36 + y0, 0); for (const a of [0.3, 0.3 + Math.PI / 2]) put(new THREE.BoxGeometry(1.4, 0.06, 0.08), 0x4a3020, x, z, a, 0, 0.03 + y0, 0);
      for (let i = 0; i < 4; i++) put(new THREE.BoxGeometry(0.5, 0.05, 0.045), 0x5a3e28, x, z, i * Math.PI / 2 + 0.3, 0.2, 0.5 + y0, 0, 0, 0.75);
      k.colliders.push({ min: new THREE.Vector3(x - 0.55, 0.72 + y0, z - 0.55), max: new THREE.Vector3(x + 0.55, 0.77 + y0, z + 0.55) }); blk(x - 1.0, z - 1.0, x + 1.0, z + 1.0, 0.77 + y0); k.spawns.push(new THREE.Vector3(x + 0.25, 0.85 + y0, z));
      if (umb !== null) parasol(x, z, y0, umb);
    };
    const barrel = (x, z) => { const g = new THREE.LatheGeometry([[0, 0], [0.26, 0], [0.31, 0.25], [0.32, 0.45], [0.31, 0.65], [0.26, 0.9], [0, 0.9]].map(([a, b]) => new THREE.Vector2(a, b)), 14); k.parts.push(part(g, 0x6a4024, [x, 0, z])); for (const y of [0.1, 0.32, 0.58, 0.8]) put(CYL(0.315, 0.315, 0.035, 14), 0x2a2a2a, x, z, 0, 0, y, 0); put(CYL(0.36, 0.36, 0.04, 14), 0x5a3a20, x, z, 0, 0, 0.92, 0); k.colliders.push({ min: new THREE.Vector3(x - 0.3, 0.88, z - 0.3), max: new THREE.Vector3(x + 0.3, 0.94, z + 0.3) }); blk(x - 0.33, z - 0.33, x + 0.33, z + 0.33, 0.94); k.spawns.push(new THREE.Vector3(x, 1.0, z)); };
    const hedge = (x0, z0, x1, z1, h = 1.3) => leafyHedge(k, x0, z0, x1, z1, h);
    const lattice = (x0, x1, z) => { R(x0, z - 0.03, x1, z + 0.03, 0.45, 0.225, FENCE); for (let x = x0; x < x1; x += 0.15) for (const sd of [1, -1]) k.box(0.02, 0.62, 0.012, x + 0.075, 0.27, z + sd * 0.02, 0x4a3a30, { rot: [0, 0, sd * 0.78] }); };
    const lampPost = (x, z, y0 = 0) => { k.cyl(0.04, 0.06, 2.6, x, 1.3 + y0, z, 0x111111, 8); k.cyl(0.12, 0.12, 0.1, x, 0.05 + y0, z, 0x111111, 10); for (const sd of [-1, 1]) { k.box(0.4, 0.03, 0.03, x + sd * 0.2, 2.55 + y0, z, 0x111111); k.cyl(0.07, 0.1, 0.18, x + sd * 0.38, 2.42 + y0, z, 0x1a1a1a, 8); k.lamp(x + sd * 0.38, 2.36 + y0, z, 0xfff0d0, 0.05); } blk(x - 0.08, z - 0.08, x + 0.08, z + 0.08, 2.7); };
    for (const x of [-8.6, -6.6, -1.6, 0.4, 2.4, 4.4]) bench(x, 18.95, Math.PI / 2, 0, x === 0.4 ? true : false);   // longways, out from the building: a clear walkway in front of them (none in front of the door)
    for (const [x, c] of [[7.9, 0x7e57c2], [8.6, 0x43a047], [9.3, 0x43a047]]) { R(x - 0.3, 19.68, x + 0.3, 20.28, 0.42, 0.21, c, { collide: true, block: true }); R(x - 0.3, 19.68, x + 0.3, 20.28, 0.05, 0.445, 0xffffff); }
    { const px = 8.7, pz = 18.45; roundT(px, pz); const pm = new THREE.MeshLambertMaterial({ color: 0xc8189a }); MM.compose(V3.set(px, 2.05, pz), QQ.identity(), S1); k.instance(openG, pm, MM.clone()); MM.compose(V3.set(px, 0, pz), QQ.identity(), S1); k.instance(poleG, poleM, MM.clone()); }
    lampPost(7.4, 19.0);
    // ---- the stream: slate chippings, sleeper edges, bright green water, mooring posts, reeds; the bridge over it
    flr(GX0, 19.4, GX1, 20.02, SLATE, 0.6, 0.003); flr(GX0, 21.98, GX1, 22.9, SLATE, 0.6, 0.003);   // slate chippings either side of the water
    for (const z of [19.95, 22.05]) R(GX0, z - 0.06, GX1 + 7, z + 0.06, 0.25, -0.12, 0x3a3a34);   // the stream's sides
    { const wt = canvasTex(256, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5ab83a'); gr.addColorStop(1, '#3a9a2a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '200,240,140' : '30,90,20'},0.25)`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 1 + Math.random() * 2, 0, 0, 7); g.fill(); } }); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(10, 1);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(GX1 - GX0 + 7, 1.7), waterMaterial({ deep: 0x1e3a12, shallow: 0x5a8a28, flow: 0.18, scale: 0.9 })); m.rotation.x = -Math.PI / 2; m.position.set((GX0 + GX1 + 7) / 2, -0.12, 21.0); scene.add(m); }
    for (const z of [20.12, 21.88]) { R(GX0, z - 0.1, GX1 + 7, z + 0.1, 0.22, -0.02, 0x3a2a20); for (let x = GX0 + 0.5; x < GX1 + 7; x += 1.6) k.cyl(0.07, 0.08, 0.5, x, 0.1, z + (z < 21 ? -0.05 : 0.05), 0x1a1a1a, 8); }
    blk(GX0, 19.5, 5.4, 22.8, 1.0); blk(7.0, 19.5, GX1, 22.8, 1.0);
    for (let i = 0; i < 18; i++) { const x = GX0 + 0.6 + i * 1.15 + ((i * 7) % 3) * 0.2, z = i % 2 ? 20.25 : 21.75; if (x > 5.0 && x < 7.4) continue; for (let j = 0; j < 7; j++) k.box(0.02, 0.6 + ((i + j) % 3) * 0.2, 0.05, x + (j - 3) * 0.04, 0.3, z, 0x6a9a3a, { rot: [((j * 3) % 5 - 2) * 0.1, j, ((j * 7) % 5 - 2) * 0.12] }); }
    // the bridge: a timber deck arching over the water, railings either side, a low lattice gate post at each end
    { const bx0 = 5.4, bx1 = 7.0, bz0 = 19.4, bz1 = 22.9, N = 14;
      for (let i = 0; i < N; i++) { const z = bz0 + (i + 0.5) * (bz1 - bz0) / N, y = 0.2 * Math.sin(Math.PI * (z - bz0) / (bz1 - bz0)); k.box(bx1 - bx0, 0.06, (bz1 - bz0) / N - 0.02, (bx0 + bx1) / 2, y + 0.0, z, i % 2 ? 0x5a4636 : 0x4e3e30); }
      for (let i = 0; i < 6; i++) k.box(0.1, 0.4, 0.1, i % 2 ? bx1 - 0.1 : bx0 + 0.1, -0.15, 20.1 + Math.floor(i / 2) * 0.9, DKW);
      for (const x of [bx0 + 0.05, bx1 - 0.05]) { for (let i = 0; i <= N; i++) { const z = bz0 + i * (bz1 - bz0) / N, y = 0.2 * Math.sin(Math.PI * (z - bz0) / (bz1 - bz0)); k.box(0.04, 0.95, 0.04, x, y + 0.48, z, i % 4 ? FENCE : DKW); }
        for (let i = 0; i < N; i++) { const za = bz0 + i * (bz1 - bz0) / N, zb = za + (bz1 - bz0) / N, ya = 0.2 * Math.sin(Math.PI * (za - bz0) / (bz1 - bz0)), yb = 0.2 * Math.sin(Math.PI * (zb - bz0) / (bz1 - bz0)); for (const h of [0.5, 1.0]) k.box(0.07, 0.06, Math.hypot(zb - za, yb - ya) + 0.01, x, (ya + yb) / 2 + h, (za + zb) / 2, DKW, { rot: [-Math.atan2(yb - ya, zb - za), 0, 0] }); }
        blk(x - 0.05, bz0, x + 0.05, bz1, 1.1); }
      k.colliders.push({ min: new THREE.Vector3(bx0, -0.2, bz0), max: new THREE.Vector3(bx1, 0.2, bz1) });
    }
    // ---- the garden's near side: lattice under hedges, a gap for the bridge
    lattice(GX0, 5.3, 23.0); lattice(7.1, 7.6, 23.0); hedge(GX0, 23.0, 5.3, 23.7, 1.25); hedge(7.1, 23.0, 7.6, 23.7, 1.25);
    // ---- the patio: block paving, rows of picnic benches, the outdoor bar in the middle
    flr(GX0, 22.9, 7.6, GZ1, PAVE, 0.9, 0.005);
    railZ(GX0, 22.9, GZ1); hedge(GX0 + 0.08, 27.0, GX0 + 0.8, GZ1 - 0.1, 1.6);
    // the smoking shelter on the left
    { const sx0 = GX0 + 0.1, sx1 = GX0 + 2.6, sz0 = 23.9, sz1 = 26.8;
      R(sx0, sz0, sx0 + 0.1, sz1, 2.3, 1.15, 0x2a2420, { block: true, collide: true }); R(sx0, sz0, sx1, sz0 + 0.1, 2.3, 1.15, 0x2a2420, { block: true, collide: true }); R(sx0, sz1 - 0.1, sx1, sz1, 2.3, 1.15, 0x2a2420, { block: true, collide: true });
      k.box(sx1 - sx0 + 0.4, 0.06, sz1 - sz0 + 0.4, (sx0 + sx1) / 2, 2.45, (sz0 + sz1) / 2, 0x1a1a1a, { rot: [0, 0, -0.08] });
      for (const z of [24.6, 25.4, 26.1]) { k.cyl(0.2, 0.2, 0.03, sx0 + 0.9, 0.46, z, 0x9aa0a6, 12); for (const [dx, dz] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) k.box(0.02, 0.45, 0.02, sx0 + 0.9 + dx, 0.23, z + dz, 0x9aa0a6); k.box(0.04, 0.4, 0.38, sx0 + 0.72, 0.7, z, 0x9aa0a6); blk(sx0 + 0.65, z - 0.22, sx0 + 1.15, z + 0.22, 0.6); }
      k.cyl(0.18, 0.18, 0.02, sx0 + 1.8, 0.74, 25.3, 0x9aa0a6, 14); k.cyl(0.02, 0.02, 0.72, sx0 + 1.8, 0.37, 25.3, 0x9aa0a6, 6); k.cyl(0.05, 0.05, 0.04, sx0 + 1.8, 0.77, 25.3, 0xdddddd, 10);
      k.box(0.3, 0.4, 0.15, sx0 + 0.2, 1.3, sz0 + 0.18, 0xd8d8d8); }
    // benches in rows like the photo (umbrellas furled, a few open), barrels for standing
    for (const x of [-6.2, -3.4, -0.6, 2.2]) bench(x, 24.8, 0, 0, x === -3.4 ? true : false);
    for (const x of [-6.6, -3.6]) bench(x, 27.4, 0, 0, false);
    for (const z of [29.6, 32.4, 35.2]) bench(-7.6, z, Math.PI / 2, 0, z === 32.4 ? false : null);
    for (const [x, z, u] of [[4.6, 27.0, false], [4.6, 29.8, true], [4.6, 32.6, false], [4.6, 35.4, false]]) bench(x, z, 0, 0, u);
    for (const x of [-6.0, -3.0, 0.0, 3.0]) roundT(x, 38.6, 0, x === 0 ? true : false);
    barrel(-5.4, 30.9); barrel(2.6, 26.9); barrel(2.8, 37.0); barrel(-5.6, 35.6);
    for (const [x, z] of [[1.6, 26.9], [-4.6, 37.0]]) { R(x - 0.45, z - 0.3, x + 0.45, z + 0.3, 0.5, 0.25, 0x5a3a20, { block: true }); for (const dx of [-0.25, 0.0, 0.25]) leafyBall(k, x + dx, 0.68, z, 0.24, { n: 26, r: 0.07 }); for (let i = 0; i < 14; i++) k.parts.push(part(new THREE.SphereGeometry(0.035, 6, 4), [0xc8202a, 0xffd400, 0xf4f4f4, 0xe0508a][i % 4], [x - 0.38 + (i % 7) * 0.12, 0.82 + (i % 3) * 0.05, z - 0.18 + Math.floor(i / 7) * 0.3])); }   // planters, full of flowers
    // ---- the outdoor bar: an octagon on a low platform, posts, a panelled counter with taps, a shingle roof
    { const gx = -1.2, gz = 31.4, RR = 3.2, top = 2.65, ang = (i) => i / 8 * Math.PI * 2 + Math.PI / 8;
      const plat = new THREE.CylinderGeometry(RR + 0.25, RR + 0.3, 0.15, 8); plat.rotateY(Math.PI / 8); k.parts.push(part(plat, 0x4a3a30, [gx, 0.075, gz]));
      for (let i = 0; i < 8; i++) { const a = ang(i), px = gx + Math.cos(a) * RR, pz = gz + Math.sin(a) * RR; k.box(0.18, top, 0.18, px, top / 2, pz, 0x2a1e18, { block: true }); }
      for (let i = 0; i < 8; i++) {
        const a0 = ang(i), a1 = ang(i + 1), x0 = gx + Math.cos(a0) * RR, z0 = gz + Math.sin(a0) * RR, x1 = gx + Math.cos(a1) * RR, z1 = gz + Math.sin(a1) * RR, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, L = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0);
        if (i === 0) {   // the open side, facing the river: a balustrade either side of the gap, steps
          for (const t of [0.15, 0.85]) { const px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t; k.box(0.1, 1.0, 0.1, px, 0.5, pz, 0x2a1e18); }
          continue; }
        if (i === 7 || i === 1) {   // balustrade sides
          k.box(L, 0.07, 0.1, mx, 1.05, mz, 0xb8885a, { rot: [0, ry, 0] }); for (let t = 0.1; t < 0.95; t += 0.08) k.box(0.04, 0.9, 0.04, x0 + (x1 - x0) * t, 0.6, z0 + (z1 - z0) * t, 0xb8885a);
          for (let t = 0; t <= 1; t += 0.1) { const px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t; blk(px - 0.1, pz - 0.1, px + 0.1, pz + 0.1, 1.1); } continue; }
        // counter: panelled front, a dark top, shutters rolled up overhead
        k.box(L, 1.05, 0.12, mx, 0.6, mz, 0x3a2a20, { rot: [0, ry, 0] }); for (let t = 0.17; t < 0.95; t += 0.33) k.box(L * 0.26, 0.7, 0.02, x0 + (x1 - x0) * t + Math.cos(a0 + Math.PI / 8) * 0.07, 0.6, z0 + (z1 - z0) * t + Math.sin(a0 + Math.PI / 8) * 0.07, 0x4a3628, { rot: [0, ry, 0] });
        const ix = mx - Math.cos((a0 + a1) / 2) * 0.25, iz = mz - Math.sin((a0 + a1) / 2) * 0.25;
        k.box(L, 0.05, 0.55, ix + Math.cos((a0 + a1) / 2) * 0.05, 1.15, iz + Math.sin((a0 + a1) / 2) * 0.05, 0x2a1a10, { rot: [0, ry, 0] });
        k.box(L - 0.1, 0.25, 0.08, mx, top - 0.18, mz, 0x2a1e18, { rot: [0, ry, 0] });
        k.colliders.push({ min: new THREE.Vector3(ix - 0.35, 1.12, iz - 0.35), max: new THREE.Vector3(ix + 0.35, 1.18, iz + 0.35) }); k.spawns.push(new THREE.Vector3(ix, 1.24, iz));
        for (let t = 0; t <= 1; t += 0.1) { const px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t; blk(px - 0.15, pz - 0.15, px + 0.15, pz + 0.15, 1.2); }
        if (i % 2 === 0) for (let j = 0; j < 3; j++) { const tx = ix + (x1 - x0) * (j - 1) * 0.25, tz = iz + (z1 - z0) * (j - 1) * 0.25; k.cyl(0.015, 0.015, 0.3, tx, 1.33, tz, 0xd4af37, 8); k.box(0.05, 0.12, 0.03, tx, 1.52, tz, [0xc8102e, 0xffd400, 0x1f4fbf][j]); }
      }
      // inside: the back fridges and a till in the middle, bottles, lights under the roof
      { const cg = new THREE.CylinderGeometry(0.9, 0.9, 1.0, 8); cg.rotateY(Math.PI / 8); k.parts.push(part(cg, 0x2a2420, [gx, 0.6, gz])); const tg = new THREE.CylinderGeometry(0.95, 0.95, 0.05, 8); tg.rotateY(Math.PI / 8); k.parts.push(part(tg, 0x1a1a1a, [gx, 1.13, gz]));
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; k.cyl(0.03, 0.03, 0.24, gx + Math.cos(a) * 0.75, 1.27, gz + Math.sin(a) * 0.75, [0x2e5a2a, 0x8a4a1a, 0xd4a017, 0xe8e8e8][i % 4], 8); }
        blk(gx - 0.95, gz - 0.95, gx + 0.95, gz + 0.95, 1.2); for (let i = 0; i < 8; i++) { const a = ang(i) + Math.PI / 8; k.lamp(gx + Math.cos(a) * (RR - 0.4), top - 0.05, gz + Math.sin(a) * (RR - 0.4), 0xffe2a8, 0.05); } }
      // the roof: an octagonal cone of dark shingles, a ring beam, a finial
      const sh = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#4a4440'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 14) for (let x = (y / 14 % 2) * 10; x < w; x += 20) { g.fillStyle = ['#3e3834', '#56504a', '#4a443e', '#3a3632'][(x * 3 + y) % 4]; g.fillRect(x + 1, y + 1, 18, 12); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y + 12, 20, 2); } }); sh.wrapS = sh.wrapT = THREE.RepeatWrapping; sh.repeat.set(6, 3);
      const roof = new THREE.ConeGeometry(RR + 0.75, 2.3, 8, 1, false); roof.rotateY(Math.PI / 8);
      const rm = new THREE.Mesh(roof, new THREE.MeshLambertMaterial({ map: sh, side: THREE.DoubleSide })); rm.position.set(gx, top + 1.15, gz); scene.add(rm);
      const ring = new THREE.CylinderGeometry(RR + 0.1, RR + 0.1, 0.18, 8, 1, true); ring.rotateY(Math.PI / 8); k.parts.push(part(ring, 0x2a1e18, [gx, top - 0.05, gz]));
      k.cyl(0.05, 0.12, 0.4, gx, top + 2.45, gz, 0x5a5048, 8);
      k.light(gx, 2.3, gz, 0xffd8a0, 2.5, 6);
    }
    // ---- the raised deck along the river: a step up, round tables with open parasols, planters, lamps, the railing
    flr(7.6, 22.6, GX1, GZ1 - 2, DECK, 0.6, 0.304); R(7.6, 22.6, GX1, GZ1 - 2, 0.3, 0.15, 0x3a2e28, { collide: true });
    R(7.3, 22.6, 7.6, GZ1 - 2, 0.15, 0.075, 0x4a3a30, { collide: true });
    railZ(GX1 - 0.05, 19.4, GZ1 - 2, 1.0, 0.3); railX(7.6, GX1, GZ1 - 2, 1.0);
    for (const z of [24.4, 27.4, 30.4, 33.4, 36.4]) roundT(9.2, z, 0.3, true);
    for (const z of [25.9, 31.9]) { R(10.05, z - 0.5, 10.6, z + 0.5, 0.55, 0.575, 0x5a3a20, { block: true }); for (const dz of [-0.3, 0.05, 0.38]) leafyBall(k, 10.32, 0.98, z + dz, 0.26, { n: 28, r: 0.075 }); }
    for (const z of [23.0, 29.0, 35.0]) lampPost(10.55, z, 0.3);
    // ---- the river beyond the railing: reeds on the bank, the water, the far bank
    { const wt = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#5a8a8a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '220,240,240' : '30,60,60'},0.18)`; g.fillRect(Math.random() * w, Math.random() * h, 8 + Math.random() * 20, 1.5); } }); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(3, 10);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(18, 70), waterMaterial({ deep: 0x16302e, shallow: 0x4a706a, flow: 0.04, scale: 0.4 })); m.rotation.x = -Math.PI / 2; m.position.set(GX1 + 10.5, -0.25, 30); scene.add(m);
      const bank = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 40), new THREE.MeshLambertMaterial({ map: LEAFT })); bank.rotation.x = -Math.PI / 2; bank.position.set(GX1 + 1.1, 0.0, 28); scene.add(bank);
      for (let i = 0; i < 160; i++) { const x = GX1 + 0.2 + Math.random() * 1.9, z = 14 + Math.random() * 30, h = 0.8 + Math.random() * 0.9; k.box(0.025, h, 0.06, x, h / 2, z, [0x6a9a3a, 0x8aa84a, 0x5a8a2a, 0xa8b860][i % 4], { rot: [(Math.random() - 0.5) * 0.4, Math.random() * 3, (Math.random() - 0.5) * 0.4] }); }
      const far = new THREE.Mesh(new THREE.PlaneGeometry(10, 70), new THREE.MeshLambertMaterial({ map: LEAFT })); far.rotation.x = -Math.PI / 2; far.position.set(GX1 + 24.5, 0.15, 30); scene.add(far);
      R(GX1 + 19.4, -5, GX1 + 19.6, 65, 0.5, -0.05, 0x5a5040);                                             // the far bank's edge
      for (let z = 0; z < 62; z += 2.6) { const x = GX1 + 20.5 + ((z * 7) % 3); leafyBall(k, x, 0.5, z, 0.9 + ((z * 3) % 5) * 0.12); }   // bushes along the far bank
      for (const [x, z, r] of [[GX1 + 23, 8, 2.2], [GX1 + 25, 20, 2.8], [GX1 + 23.5, 33, 2.4], [GX1 + 26, 45, 3.0], [GX1 + 24, 56, 2.2]]) { k.cyl(0.2, 0.3, 3.6, x, 1.8, z, 0x5a4030, 8); leafyBall(k, x, 4.2, z, r); } }
    // ---- the far end: hedges and a fence, the houses beyond, trees
    hedge(GX0 + 0.1, GZ1 - 0.9, 7.6, GZ1 - 0.1, 1.7); railX(GX0, GX1, GZ1 - 0.05, 1.8);
    // the houses round the garden: a terrace across the end (their back gardens run up to the pub's fence), another down the left
    terrace(k, scene, { ox: -18.4, oz: GZ1 + 8.5, ry: 0, n: 6, w: 4.9, D: 7.6, garden: 8.3, brick: brickO, seed: 2 });
    terrace(k, scene, { ox: -19.0, oz: 16.4, ry: -Math.PI / 2, n: 6, w: 4.6, D: 7.4, garden: 8.8, brick: brickO, seed: 5 });
    for (const [x, z, r] of [[-11.5, 30, 2.4], [-12, 40, 2.8], [6, GZ1 + 2.0, 1.8], [12, GZ1 + 4, 2.6], [-6, GZ1 + 2.5, 1.6]]) { k.cyl(0.18, 0.25, 3.4, x, 1.7, z, 0x5a4030, 8); for (let i = 0; i < 3; i++) k.cyl(0.06, 0.1, 1.4, x + Math.cos(i * 2.1) * 0.5, 3.3, z + Math.sin(i * 2.1) * 0.5, 0x5a4030, 6); leafyBall(k, x, 3.9, z, r); leafyBall(k, x + r * 0.45, 3.5, z - r * 0.3, r * 0.65); leafyBall(k, x - r * 0.4, 3.7, z + r * 0.35, r * 0.6); }
    // ---- sunshine
    k.light(-2, 9, 28, 0xfff4e0, 3.2, 26); k.light(6, 8, 21, 0xfff4e0, 2.4, 16); k.light(9, 7, 34, 0xfff4e0, 2.2, 16);
    for (const [x, z] of [[-2, 28], [6, 22], [9, 33], [-6, 36]]) k.pool(x, 0, z, 8, 0xfff8e0);
    shiftGarden(k, scene, mark, 19.3, DW); railZ(GX0, 19.28, 19.4 + DW);
    mirrorGarden(k, scene, mark, GX0 + GX1);
  }
  // ---------------- the walls: dark wood skirting, embossed burgundy anaglypta to the dado, a dark dado rail,
  // cream damask paper above, a moulded cornice, and old framed pictures here and there (never on top of a sign)
  { const lower = anaglyptaTex(), upper = damaskTex(), signs = scene.children.filter(o => o.isMesh && o.userData.sign).map(o => o.position.clone());
    const art = [0, 1, 2, 3, 4, 5].map(paintingTex);
    const faces = k.wallFaces({ colors: new Set([WALL, PLASTER]), minH: H - 0.05, inside, skip: (f) => inNewArea(f.axis === 'x' ? f.c + f.dir * 0.25 : (f.a0 + f.a1) / 2, f.axis === 'x' ? (f.a0 + f.a1) / 2 : f.c + f.dir * 0.25) || (f.c > GZ - 0.2 && f.dir > 0 && f.axis === 'z') || f.axis === 'z' && f.c < Z(470) && f.c > Z(300) && f.dir > 0 && f.a0 > X(160) && f.a1 < X(420) });
    let n = 0;
    for (const f of faces) {
      const box = (a, b, y0, h, depth, color, tex, tile) => { const cx = (a + b) / 2, L = b - a, o = f.c + f.dir * depth / 2;
        if (tex) { if (f.axis === 'x') k.texBox(depth, h, L, o, y0 + h / 2, cx, tex, { tile }); else k.texBox(L, h, depth, cx, y0 + h / 2, o, tex, { tile }); }
        else if (f.axis === 'x') k.box(depth, h, L, o, y0 + h / 2, cx, color); else k.box(L, h, depth, cx, y0 + h / 2, o, color); };
      const inPub = f.a1 - f.a0 > 0.6;
      box(f.a0, f.a1, 0, 0.15, 0.03, 0x2a1a10);                                                  // skirting
      box(f.a0, f.a1, 0.15, 0.75, 0.004, 0, lower, 0.5);                                          // anaglypta
      box(f.a0, f.a1, 0.88, 0.05, 0.035, 0x3a2416); box(f.a0, f.a1, 0.93, 0.02, 0.02, 0x5a3a22);   // dado rail
      box(f.a0, f.a1, 0.95, H - 1.1, 0.003, 0, upper, 0.6);                                       // damask paper
      box(f.a0, f.a1, H - 0.15, 0.07, 0.05, 0xeee8da); box(f.a0, f.a1, H - 0.08, 0.08, 0.08, 0xf4f0e6);   // cornice
      if (!inPub) continue;
      for (let a = f.a0 + 1.1; a < f.a1 - 0.6; a += 2.4) {
        const x = f.axis === 'x' ? f.c : a, z = f.axis === 'x' ? a : f.c;
        const w = 0.42 + (n % 3) * 0.1, h2 = 0.34 + ((n + 1) % 3) * 0.08, y = 1.7;
        if (signs.some(p => Math.hypot(p.x - x, p.z - z) < 0.9 && p.y > 0.8) || !k.clearInFront(f, a - w / 2 - 0.1, a + w / 2 + 0.1, 1.2, 2.3)) continue;
        const ry = f.axis === 'x' ? (f.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (f.dir > 0 ? 0 : Math.PI);
        box(a - w / 2 - 0.05, a + w / 2 + 0.05, y - h2 / 2 - 0.05, h2 + 0.1, 0.035, 0xb8923a);                                   // gilt frame
        const off = f.c + f.dir * 0.0365, pos = f.axis === 'x' ? [off, y, a] : [a, y, off];
        k.label('painting', w, h2, pos, [0, ry, 0], { tex: art[n % art.length] });
        k.lamp(f.axis === 'x' ? f.c + f.dir * 0.12 : a, y + h2 / 2 + 0.14, f.axis === 'x' ? a : f.c + f.dir * 0.12, 0xffe0a8, 0.025, false);   // a little picture light
        box(a - 0.12, a + 0.12, y + h2 / 2 + 0.1, 0.025, 0.13, 0xc9a24a);
        n++;
      }
    }
  }
  buildRestaurant(k, scene, { chairsAt });
  k.splitX = -14.0;                                   // (the restaurant's furniture merges separately from the pub's, so it can be skipped)
  const sky = skyDome(scene);
  scene.fog = new THREE.Fog(HAZE.clone(), 1e4, 2e4);                 // haze outdoors only (set as you go out: see onBeforeRender)
  { const gt = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#5e8a3a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2200; i++) { g.fillStyle = ['#4e7a30', '#6e9a44', '#557f34', '#7aa04c', '#486e2c'][i % 5]; g.fillRect(Math.random() * w, Math.random() * h, 2, 3 + Math.random() * 3); } });
    gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(80, 80);
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshLambertMaterial({ map: gt })); gm.rotation.x = -Math.PI / 2; gm.position.set(0, -0.33, 30); scene.add(gm); }   // the land all round
  const room = k.finish({
    name: 'The Oysterfleet',
    sky: 0xffe2c0, ground: 0x6a4a3a, hemiI: 1.55, sun: 0xfff0d8, sunI: 0.45, sunPos: [-6, 10, 5], ambient: 0.32,
    start: { x: 3.6, z: -10.0, yaw: 0.4 },          // in reception, facing the desk
    board: { x: X(195) + 0.11, y: 1.45, z: Z(1062), ry: Math.PI / 2 },
    startFood: ['can', 'burger', 'pizza', 'doughnut', 'can', 'burger', 'pizza', 'doughnut', 'burger', 'pizza', 'can', 'doughnut', 'burger', 'pizza', 'doughnut', 'can', 'burger', 'pizza'],
    spotCount: 40,
  });
  room.floorAt = pubFloorAt;
  for (const o of scene.children.slice(sceneStart)) if (o.isMesh || o.isInstancedMesh) { o.updateMatrix(); o.updateMatrixWorld(true); o.matrixAutoUpdate = false; }   // (static: no per-frame matrix work)
  room.chairsAt = chairsAt;
  // From the pub you can only see the restaurant down the corridor, through its doorway in the pub's left wall:
  // anything of the restaurant's outside that line of sight is behind walls, so it isn't drawn.
  { const west = [], bx = new THREE.Box3(), DX = X(195), DZ0 = Z(1090), DZ1 = Z(1145), cam = new THREE.Vector3();
    for (const o of scene.children.slice(sceneStart)) if (o.isMesh && !o.isInstancedMesh && o.geometry) { o.geometry.computeBoundingBox(); bx.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); if (bx.max.x < -13.6) west.push({ o, x0: bx.min.x, x1: bx.max.x, z0: bx.min.z, z1: bx.max.z }); }
    scene.onBeforeRender = (r, sc, camera) => {
      cam.setFromMatrixPosition(camera.matrixWorld);
      const outside = cam.z > Z(1305); scene.fog.near = outside ? 27 : 1e4; scene.fog.far = outside ? 39.5 : 2e4;
      const inPub = cam.x > DX + 0.05 && cam.z < Z(1305);          // (only from inside the pub itself is the restaurant hidden behind walls)
      for (const w of west) {
        if (!inPub) { w.o.visible = !(cam.z > GZ && w.z1 < GZ - 0.3); continue; }      // (out in the garden the restaurant is behind the pub's solid back wall)
        // the wedge from the eye through the doorway, at the near and far x of this piece
        let lo = Infinity, hi = -Infinity;
        for (const x of [w.x0, w.x1]) { const t = (x - cam.x) / (DX - cam.x); for (const dz of [DZ0, DZ1]) { const z = cam.z + (dz - cam.z) * t; lo = Math.min(lo, z); hi = Math.max(hi, z); } }
        w.o.visible = hi > w.z0 - 0.5 && lo < w.z1 + 0.5;
      }
    };
  }
  room.extraItems = [{ type: 'poop', pos: poopAt }];
  room.machines = machines;
  const baseUpdate = room.update.bind(room);
  let outT = 0;
  room.update = (dt) => {
    baseUpdate(dt); outT += dt; sky.update(outT); updateOutdoor(outT);
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
    // shrink the lettering until it fits inside the gold border (it used to run off both ends)
    let size = 110; g.textAlign = 'center'; g.textBaseline = 'middle';
    do { g.font = `900 ${size}px Georgia, serif`; size -= 4; } while (g.measureText('THE OYSTERFLEET').width > w - 90 && size > 30);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillText('THE OYSTERFLEET', w / 2 + 4, h / 2 + 10);
    g.fillStyle = '#d4af37'; g.fillText('THE OYSTERFLEET', w / 2, h / 2 + 6);
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

// the pub's carpet in the photo: brown-grey with a woven cross-hatch
function weaveCarpetTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4e4240'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = Math.random(); g.fillStyle = v < 0.4 ? 'rgba(120,100,95,0.35)' : v < 0.7 ? 'rgba(30,22,22,0.35)' : 'rgba(150,120,110,0.25)'; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 1.5); }
    for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) {
      g.strokeStyle = 'rgba(160,135,125,0.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 2, y + 8); g.lineTo(x + 14, y + 8); g.stroke();
      g.strokeStyle = 'rgba(25,18,18,0.45)'; g.beginPath(); g.moveTo(x + 8, y + 2); g.lineTo(x + 8, y + 14); g.stroke();
      if ((x + y) % 64 === 0) { g.strokeStyle = 'rgba(110,40,40,0.35)'; g.strokeRect(x + 1, y + 1, 14, 14); }
    }
  });
}
// weathered old red brick: reds, browns, near-black headers, chipped edges, paint marks, soft lime mortar
function oldBrickTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#cfc4b0'; g.fillRect(0, 0, w, h);
    const bh = 32, bw = 72;
    for (let r = 0; r < h / bh; r++) for (let c = -1; c < w / bw + 1; c++) {
      const x = c * bw + (r % 2) * bw / 2, y = r * bh, t = Math.random();
      const col = t < 0.3 ? [148, 58, 40] : t < 0.55 ? [166, 80, 52] : t < 0.7 ? [120, 48, 36] : t < 0.82 ? [92, 60, 54] : t < 0.92 ? [180, 110, 78] : [60, 44, 42];
      const j = () => (Math.random() * 18 - 9) | 0;
      g.fillStyle = `rgb(${col[0] + j()},${col[1] + j()},${col[2] + j()})`; g.fillRect(x + 3, y + 3, bw - 6, bh - 6);
      const sh = g.createLinearGradient(0, y, 0, y + bh); sh.addColorStop(0, 'rgba(255,255,255,0.08)'); sh.addColorStop(1, 'rgba(0,0,0,0.18)'); g.fillStyle = sh; g.fillRect(x + 3, y + 3, bw - 6, bh - 6);
      for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,230,200'},${Math.random() * 0.15})`; g.fillRect(x + 4 + Math.random() * (bw - 10), y + 4 + Math.random() * (bh - 10), 1 + Math.random() * 4, 1 + Math.random() * 2); }
      if (Math.random() < 0.18) { g.fillStyle = 'rgba(235,225,205,0.85)'; g.beginPath(); g.ellipse(x + 6 + Math.random() * (bw - 12), y + 6 + Math.random() * (bh - 12), 3 + Math.random() * 6, 2 + Math.random() * 3, Math.random(), 0, 7); g.fill(); }   // old paint flecks
      if (Math.random() < 0.25) { g.fillStyle = '#cfc4b0'; g.fillRect(x + (Math.random() < 0.5 ? 3 : bw - 9), y + 3, 6, 5); }                                                           // a chipped corner
    }
  });
}
// leaded lights (small coloured diamonds) for the top row of the glazed screen
function leadedTex() {
  if (leadedTex.t) return leadedTex.t;
  return (leadedTex.t = canvasTex(128, 96, (g, w, h) => {
    g.fillStyle = 'rgba(230,240,235,1)'; g.fillRect(0, 0, w, h);
    const cols = ['#f4f0d8', '#e8dcb0', '#c8d8c0', '#d8b8a0'];
    for (let y = -12; y < h + 12; y += 16) for (let x = -12; x < w + 12; x += 16) { g.fillStyle = cols[((x + y) / 16 & 3)]; g.beginPath(); g.moveTo(x + 8, y); g.lineTo(x + 16, y + 8); g.lineTo(x + 8, y + 16); g.lineTo(x, y + 8); g.closePath(); g.fill(); g.strokeStyle = '#3a3a3a'; g.lineWidth = 1.5; g.stroke(); }
    g.fillStyle = '#7a2a3a'; g.beginPath(); g.arc(w / 2, h / 2, 12, 0, 7); g.fill(); g.strokeStyle = '#3a3a3a'; g.lineWidth = 2; g.stroke();
    g.strokeStyle = '#f4f2ec'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
  }));
}

// embossed anaglypta below the dado, painted deep burgundy
function anaglyptaTex() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#5a1a22'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) {
      const ox = x + 16, oy = y + 16;
      g.strokeStyle = 'rgba(255,200,190,0.18)'; g.lineWidth = 3; g.beginPath(); g.arc(ox - 1, oy - 1, 10, 0, 7); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(ox + 1, oy + 1, 10, 0, 7); g.stroke();
      g.fillStyle = 'rgba(255,200,190,0.15)'; g.beginPath(); g.moveTo(ox, oy - 5); g.lineTo(ox + 5, oy); g.lineTo(ox, oy + 5); g.lineTo(ox - 5, oy); g.fill();
    }
  });
}
// cream damask wallpaper
function damaskTex() {
  return canvasTex(128, 192, (g, w, h) => {
    g.fillStyle = '#efe4cc'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(150,120,80,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    const motif = (cx, cy) => { g.fillStyle = 'rgba(180,150,100,0.32)'; g.beginPath(); g.ellipse(cx, cy, 14, 26, 0, 0, 7); g.fill();
      g.fillStyle = '#efe4cc'; g.beginPath(); g.ellipse(cx, cy, 7, 16, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(180,150,100,0.32)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 16, cy - 10, 6, 12, s * 0.6, 0, 7); g.fill(); g.beginPath(); g.ellipse(cx + s * 14, cy + 16, 5, 9, -s * 0.5, 0, 7); g.fill(); }
      g.beginPath(); g.arc(cx, cy - 32, 4, 0, 7); g.fill(); g.beginPath(); g.arc(cx, cy + 32, 4, 0, 7); g.fill(); };
    motif(32, 48); motif(96, 48); motif(0, 144); motif(64, 144); motif(128, 144);
  });
}
// old oil paintings and prints for the walls
function paintingTex(i) {
  return canvasTex(160, 128, (g, w, h) => {
    const scenes = [
      () => { const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#8aa0b0'); sky.addColorStop(1, '#d8c8a0'); g.fillStyle = sky; g.fillRect(0, 0, w, h); g.fillStyle = '#2a4a5a'; g.fillRect(0, h * 0.65, w, h); g.fillStyle = '#5a3a20'; g.beginPath(); g.moveTo(40, 80); g.lineTo(120, 80); g.lineTo(110, 92); g.lineTo(50, 92); g.fill(); g.fillStyle = '#f0e8d0'; g.beginPath(); g.moveTo(80, 30); g.lineTo(80, 78); g.lineTo(110, 78); g.fill(); g.beginPath(); g.moveTo(76, 36); g.lineTo(76, 78); g.lineTo(52, 78); g.fill(); },   // a sailing boat
      () => { g.fillStyle = '#4a5a3a'; g.fillRect(0, 0, w, h); g.fillStyle = '#7a8a5a'; g.fillRect(0, h * 0.6, w, h); g.fillStyle = '#6a3a1a'; g.beginPath(); g.ellipse(70, 80, 28, 12, 0, 0, 7); g.fill(); g.fillRect(50, 85, 4, 18); g.fillRect(86, 85, 4, 18); g.beginPath(); g.ellipse(100, 70, 9, 8, 0, 0, 7); g.fill(); g.fillStyle = '#c84a2a'; g.fillRect(60, 56, 10, 18); g.beginPath(); g.arc(65, 52, 5, 0, 7); g.fill(); },   // a hunting scene
      () => { g.fillStyle = '#d8c8a0'; g.fillRect(0, 0, w, h); g.fillStyle = '#7a3020'; g.fillRect(30, 40, 100, 70); g.fillStyle = '#3a2416'; g.beginPath(); g.moveTo(25, 40); g.lineTo(80, 14); g.lineTo(135, 40); g.fill(); g.fillStyle = '#f2d880'; for (const x of [42, 70, 98]) g.fillRect(x, 58, 16, 18); g.fillStyle = '#1b3a2a'; g.fillRect(60, 88, 40, 10); g.fillStyle = '#d4af37'; g.font = 'bold 8px Georgia'; g.textAlign = 'center'; g.fillText('OYSTERFLEET', 80, 96); },   // the pub, long ago
      () => { const gr = g.createRadialGradient(80, 64, 10, 80, 64, 90); gr.addColorStop(0, '#6a4a3a'); gr.addColorStop(1, '#1a120c'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#e0b890'; g.beginPath(); g.ellipse(80, 56, 24, 30, 0, 0, 7); g.fill(); g.fillStyle = '#3a2416'; g.beginPath(); g.ellipse(80, 34, 24, 12, 0, 0, 7); g.fill(); g.fillStyle = '#2a2a3a'; g.beginPath(); g.ellipse(80, 128, 50, 40, 0, 0, 7); g.fill(); g.fillStyle = '#c9a24a'; g.font = 'italic 9px Georgia'; g.textAlign = 'center'; g.fillText('The Landlord, 1893', 80, 122); },   // a portrait
      () => { g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a1a10'; g.font = 'bold 16px Georgia'; g.textAlign = 'center'; g.fillText('OYSTER STOUT', 80, 40); g.font = 'italic 11px Georgia'; g.fillText('a meal in itself', 80, 60); g.fillStyle = '#1a1a1a'; g.fillRect(64, 70, 32, 46); g.fillStyle = '#f4ecd8'; g.fillRect(64, 70, 32, 8); },   // an old advert
      () => { g.fillStyle = '#9ab0c0'; g.fillRect(0, 0, w, h); g.fillStyle = '#5a7a4a'; g.beginPath(); g.moveTo(0, 90); g.quadraticCurveTo(50, 60, 100, 85); g.quadraticCurveTo(130, 95, w, 80); g.lineTo(w, h); g.lineTo(0, h); g.fill(); g.fillStyle = '#e8e4d8'; g.fillRect(100, 60, 18, 26); g.fillStyle = '#5a2a1a'; g.beginPath(); g.moveTo(96, 60); g.lineTo(109, 50); g.lineTo(122, 60); g.fill(); },   // a cottage
    ];
    scenes[i % scenes.length]();
    for (let k = 0; k < 300; k++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,240,200'},0.05)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }   // old varnish
  });
}

// mirror everything added since `mark` across x = c2 / 2 (geometry, meshes, instances, colliders, blockers, spawns, lights)
// move everything of the garden beyond z = zc back by dz (to widen the deck without re-laying the whole garden)
function shiftGarden(k, scene, mark, zc, dz) {
  const T = new THREE.Matrix4().makeTranslation(0, 0, dz), c = new THREE.Vector3();
  for (let i = mark.p; i < k.parts.length; i++) { const g = k.parts[i]; g.computeBoundingBox(); g.boundingBox.getCenter(c); if (c.z > zc) { g.applyMatrix4(T); g.computeBoundingBox(); g.computeBoundingSphere(); } }
  for (const o of scene.children.slice(mark.o)) if (o.position.z > zc) o.position.z += dz;
  for (let i = mark.c; i < k.colliders.length; i++) { const cc = k.colliders[i]; if ((cc.min.z + cc.max.z) / 2 > zc) { cc.min.z += dz; cc.max.z += dz; } }
  for (let i = mark.b; i < k.blockers.length; i++) { const b = k.blockers[i]; if ((b.z0 + b.z1) / 2 > zc) { b.z0 += dz; b.z1 += dz; } }
  for (let i = mark.r; i < (k.boxRec || []).length; i++) { const r = k.boxRec[i]; if ((r.min[2] + r.max[2]) / 2 > zc) { r.min[2] += dz; r.max[2] += dz; } }
  for (let i = mark.s; i < k.spawns.length; i++) if (k.spawns[i].z > zc) k.spawns[i].z += dz;
  for (let i = mark.l; i < (k.lights || []).length; i++) { const p = k.lights[i].l.position; if (p.z > zc) p.z += dz; }
  for (const [col, l] of k.lamps || []) for (let i = mark.lamps.get(col) || 0; i < l.length; i++) if (l[i][2] > zc) l[i][2] += dz;
  if (k.halos) for (let i = mark.halos; i < k.halos.list.length; i++) if (k.halos.list[i][2] > zc) k.halos.list[i][2] += dz;
  if (k.pools) for (let i = mark.pools; i < k.pools.list.length; i++) if (k.pools.list[i][2] > zc) k.pools.list[i][2] += dz;
  for (const [key, v] of k.inst || []) for (let i = mark.inst.get(key) || 0; i < v.list.length; i++) if (v.list[i].elements[14] > zc) v.list[i] = new THREE.Matrix4().multiplyMatrices(T, v.list[i]);
}
function mirrorGarden(k, scene, mark, c2) {
  const S = new THREE.Matrix4().makeScale(-1, 1, 1), T = new THREE.Matrix4().makeTranslation(c2, 0, 0), M = new THREE.Matrix4().multiplyMatrices(T, S);
  for (let i = mark.p; i < k.parts.length; i++) { const g = k.parts[i]; g.applyMatrix4(M);
    for (const name in g.attributes) { const a = g.attributes[name], n = a.itemSize; for (let t = 0; t + 2 < a.count; t += 3) for (let c = 0; c < n; c++) { const v1 = a.array[(t + 1) * n + c]; a.array[(t + 1) * n + c] = a.array[(t + 2) * n + c]; a.array[(t + 2) * n + c] = v1; } a.needsUpdate = true; }
    g.computeBoundingBox(); g.computeBoundingSphere(); }
  for (const o of scene.children.slice(mark.o)) { o.position.x = c2 - o.position.x; o.rotation.y = -o.rotation.y; o.rotation.z = -o.rotation.z; o.scale.x *= -1; }
  for (let i = mark.c; i < k.colliders.length; i++) { const c = k.colliders[i], a = c.min.x; c.min.x = c2 - c.max.x; c.max.x = c2 - a; }
  for (let i = mark.b; i < k.blockers.length; i++) { const b = k.blockers[i], a = b.x0; b.x0 = c2 - b.x1; b.x1 = c2 - a; }
  for (let i = mark.r; i < (k.boxRec || []).length; i++) { const r = k.boxRec[i], a = r.min[0]; r.min[0] = c2 - r.max[0]; r.max[0] = c2 - a; }
  for (let i = mark.s; i < k.spawns.length; i++) k.spawns[i].x = c2 - k.spawns[i].x;
  for (let i = mark.l; i < (k.lights || []).length; i++) k.lights[i].l.position.x = c2 - k.lights[i].l.position.x;
  for (const [c, l] of k.lamps || []) for (let i = mark.lamps.get(c) || 0; i < l.length; i++) l[i][0] = c2 - l[i][0];
  if (k.halos) for (let i = mark.halos; i < k.halos.list.length; i++) k.halos.list[i][0] = c2 - k.halos.list[i][0];
  if (k.pools) for (let i = mark.pools; i < k.pools.list.length; i++) k.pools.list[i][0] = c2 - k.pools.list[i][0];
  for (const [key, v] of k.inst || []) for (let i = mark.inst.get(key) || 0; i < v.list.length; i++) v.list[i] = new THREE.Matrix4().multiplyMatrices(M, v.list[i]).multiply(S);
}
