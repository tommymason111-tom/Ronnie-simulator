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
  WX(605, 695, 855); WZ(855, 605, 925, [[765, 830]]); WX(925, 835, 855); WZ(835, 925, 1245, [[1160, 1240]]);      // (a doorway from the corridor in behind the bar)      // (a door from behind the bar into the staff room)
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
  let chairN = 0;
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
    const c = Math.cos(ry), s2 = Math.sin(ry); k.blockers.push({ x0: x - 0.24, x1: x + 0.24, z0: z - 0.24, z1: z + 0.24, y1: 0.5 });
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
    bench(true, X(195) + 0.08, Z(690), Z(945), 1);                                       // "Table with booth" along the wall
    for (const py of [745, 845, 930]) boothTable(X(195) + 0.95, Z(py), true, 1);
    freeTable(X(300), Z(660));
    freeTable(X(340), Z(752), true);
    freeTable(X(405), Z(818)); freeTable(X(405), Z(905));
  });
  // ================================================================ the main pub floor
  freeTable(X(515), Z(925), true); freeTable(X(605), Z(908));
  smallTable(X(370), Z(1065) - 0.5, true); smallTable(X(445), Z(1065) - 0.5, true); freeTable(X(348), Z(1120), true); freeTable(X(573), Z(1090)); freeTable(X(636), Z(1190));
  freeTable(X(370), Z(1250));
  bench(true, X(455) + 0.08, Z(1165) + 0.05, Z(1305) - 0.1, 1);                          // "Table booth" against the partition
  boothTable(X(455) + 0.95, Z(1195), true, 1); boothTable(X(455) + 0.95, Z(1265), true, 1);
  bench(false, Z(1305) - 0.08, X(530), X(700), -1);                                      // "Table booth" along the conservatory wall
  boothTable(X(565), Z(1305) - 0.95, false, -1); boothTable(X(655), Z(1305) - 0.95, false, -1);
  // the pillar in the middle, opposite the bar, with a fruit machine on its right
  const pillar = (x, z) => {
    k.texBox(0.56, H - 0.42, 0.56, x, (H - 0.42) / 2, z, BRICK, { tile: 0.75, collide: true, block: true });       // old red brick, floor to the capital
    for (const [w, h, y] of [[0.62, 0.06, H - 0.39], [0.68, 0.05, H - 0.335], [0.74, 0.12, H - 0.25], [0.8, 0.07, H - 0.155], [0.84, 0.05, H - 0.095], [0.78, 0.07, H - 0.035]]) k.box(w, h, w, x, y, z, 0xf0ebdf);   // cream moulded capital
    k.box(0.6, 0.08, 0.6, x, 0.04, z, 0x8a3a28);
    for (const [dx, dz] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) { k.box(Math.abs(dx) ? 0.03 : 0.1, 0.12, Math.abs(dz) ? 0.03 : 0.1, x + dx * 1.05, 2.1, z + dz * 1.05, 0x1a1a1a); k.cyl(0.035, 0.05, 0.08, x + dx * 1.22, 2.18, z + dz * 1.22, 0x1a1a1a, 8); sconceGlow(k, x + dx * 1.3, 2.1, z + dz * 1.3, x, z); }
  };
  const PX = X(540), PZ = Z(830);
  pillar(PX, PZ);
  pillar(X(455), Z(1165) - 0.35); pillar(X(290) + 0.05, Z(1305) - 0.35);                  // the two along the walkway on the left (photo)
  // dark wood posts where the plan's walls end in the open room
  for (const [x, z] of [[X(355), Z(605)], [X(615), Z(710)], [X(735), Z(1305)], [X(790), Z(1305)]]) k.box(0.16, H - 0.5, 0.16, x, (H - 0.5) / 2, z, DARKWOOD, { block: true });
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
  // the lifting flap at the right-hand end: the way in behind the bar
  { const x0 = X(795) + 0.02, x1 = X(835) - 0.1, z = Z(1235);
    k.box(0.04, 0.6, 0.36, x1 - 0.02, 1.37, z - 0.02, TOPC); k.cyl(0.02, 0.02, 0.06, x1 - 0.02, 1.08, z - 0.15, 0x999999, 8); }
  k.label('BAR — STAFF ONLY ←', 0.7, 0.2, [X(835) + 0.095, 2.4, Z(1200)], [0, Math.PI / 2, 0], { bg: '#1b3a2a', fg: '#d4af37', border: null, size: 50 });
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
  // slate tiles on the floor in front of the bar
  { const slate = tileTex('#3a3c3e', '#34363a', '#24262a', 72);
    k.floor(X(695) - 1.4, Z(605), X(695), Z(845), slate, 0.006, 0.9); k.floor(X(695) - 1.3, Z(845), X(795), Z(1000), slate, 0.0065, 0.9); k.floor(X(795) - 1.4, Z(985), X(795), Z(1245), slate, 0.006, 0.9);
    k.floor(X(795) - 0.4, Z(1245), X(895), Z(1305), slate, 0.006, 0.9); }
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
  const backBar = (W, za, zb, deep) => {      // along z against a wall at x = W, facing -x
    const zc = (za + zb) / 2, len = zb - za;
    if (deep) {
      R(W - 0.55, za, W, zb, 0.88, 0.44, 0x4a2c18, { collide: true, block: true });
      for (let z = za + 0.05; z < zb - 0.6; z += 0.66) k.label('fridge', 0.6, 0.72, [W - 0.555, 0.44, z + 0.32], [0, -Math.PI / 2, 0], { tex: fridgeDoor, glow: true });
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
  backBar(X(855) - 0.08, Z(612), Z(765) - 0.05, true); backBar(X(855) - 0.08, Z(830) + 0.05, Z(920), true);
  backBar(X(835) - 0.08, Z(935), Z(1150), false);
  // along the top wall: the MONSTOR fridge and the coffee machine, a chalkboard
  R(X(760), Z(605) + 0.08, X(830), Z(605) + 0.62, 1.9, 0.95, 0x111111, { block: true });
  k.label('fridge', 1.4, 1.7, [(X(760) + X(830)) / 2, 0.98, Z(605) + 0.63], [0, 0, 0], { tex: monstorFridgeTex(), glow: true });
  R(X(700) + 0.65, Z(605) + 0.08, X(745), Z(605) + 0.62, 0.9, 0.45, 0x4a2c18, { collide: true, block: true });
  R(X(700) + 0.8, Z(605) + 0.15, X(700) + 1.25, Z(605) + 0.5, 0.45, 1.13, 0x2a2a2a); k.cyl(0.02, 0.02, 0.1, X(700) + 0.95, 0.98, Z(605) + 0.5, CHROMEC, 6); k.cyl(0.02, 0.02, 0.1, X(700) + 1.1, 0.98, Z(605) + 0.5, CHROMEC, 6);   // coffee machine
  k.label('COFFEES — CAPPUCCINO · LATTE · AMERICANO (RONNIE: ONE OF EACH)', 0.7, 0.45, [X(700) + 1.0, 1.75, Z(605) + 0.1], [0, 0, 0], { bg: '#1f3f8a', fg: '#fff', border: '#fff', size: 34 });
  k.label("THE OYSTERFLEET", 1.75, 0.36, [X(695) - 0.155, 2.81, (Z(605) + Z(845)) / 2], [0, -Math.PI / 2, 0], { tex: pubSignTex(), glow: true });   // on the canopy front, over the bar
  { const [x, z] = bar1.at(5.0, -0.3); k.box(0.05, 1.6, 0.05, x, 0.8, z, 0x2a1a10); k.box(0.55, 0.95, 0.04, x, 1.55, z, 0x5a3a20, { rot: [0, bar1.ry, 0] });
    k.label("TODAY'S ALES: OYSTER STOUT · RONNIE'S RUIN · PIE & PINT £9.99", 0.44, 0.62, [x - bar1.nx * 0.025, 1.55, z - bar1.nz * 0.025], [0, bar1.ry, 0], { bg: '#1a1a1a', fg: '#f5f0e6', border: null, size: 34 }); }
  // the canopy over the bar: cream tongue-and-groove with a grey trim, ribbed glass globe lights hanging off it
  const CY = 2.62;
  for (const [x0, z0, x1, z1] of [[X(695) - 0.25, Z(605), X(855), Z(925)], [X(695) - 0.25, Z(845), X(835), Z(985) + 0.3], [X(795) - 0.25, Z(985), X(835), Z(1245)]]) R(x0, z0, x1, z1, 0.05, CY, 0xf4efe2);
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
    R(x1 - 0.7, z0 + 0.2, x1 - 0.2, z0 + 0.5, 1.6, 0.8, DARKWOOD, { block: true }); k.label('TODAY\'S MENU: PIE. PIE AND CHIPS. CHIPS. (RONNIE: ALL OF IT)', 0.45, 0.6, [x1 - 0.45, 1.05, z0 + 0.51], [0, 0, 0], { bg: '#1b2a1b', fg: '#fff', border: '#8a6a3a', size: 30 });
  }
  // the entrance booking area: front doors on the corner, the booking podium, coat hooks
  { const mx = (door.x0 + door.x1) / 2 - door.uz * 0.07, mz = (door.z0 + door.z1) / 2 + door.ux * 0.07;
    const g = new THREE.Mesh(new THREE.PlaneGeometry(door.L - 0.3, 2.2), new THREE.MeshBasicMaterial({ map: streetViewTex(1), color: 0xdddddd })); g.position.set(mx, 1.1, mz); g.rotation.y = door.ry; scene.add(g);
    k.box(0.04, 2.2, 0.06, mx, 1.1, mz, DARKWOOD, { rot: [0, door.ry, 0] });
    k.label('EXIT', 0.4, 0.18, [mx, 2.5, mz], [0, door.ry, 0], { bg: '#1b8a3a', fg: '#fff', border: null, size: 90, glow: true });
    R(X(700), Z(440), X(760), Z(470), 1.15, 0.575, DARKWOOD, { block: true, collide: true }); R(X(700) - 0.05, Z(440) - 0.05, X(760) + 0.05, Z(470) + 0.05, 0.05, 1.18, 0x2a1a10);
    k.label('PLEASE WAIT TO BE SEATED', 0.9, 0.3, [X(730), 0.8, Z(470) + 0.006], [0, 0, 0], { bg: '#1b3a2a', fg: '#d4af37', border: '#d4af37', size: 44 });
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
    k.label('THE CONSERVATORY — PLEASE DO NOT TAP ON THE GLASS (RONNIE: OR LICK IT)', 2.2, 0.4, [x0 + 0.12, 2.35, z1 - 1.8], [0, Math.PI / 2, 0], { bg: '#fff', fg: '#2e7d32', border: '#2e7d32', size: 36 });
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
  for (const [x, z] of [[X(370), Z(1065) - 0.5], [X(445), Z(1065) - 0.5], [X(348), Z(1120)]]) greenPendant(x, z);
  [[X(300), Z(760)], [X(400), Z(870)], [X(580), Z(1000)], [X(400), Z(1150)], [X(600), Z(1180)], [X(820), Z(780)]].forEach(([x, z], i) => i < 5 && chandelier(x, z));
  for (const [x, z, ry] of [[X(195) + 0.1, Z(1100) + 0.5, 1], [X(195) + 0.1, Z(1250), 1], [X(195) + 0.1, Z(700), 1]]) { k.lamp(x + 0.08, 2.05, z, 0xff5040, 0.07); k.box(0.12, 0.14, 0.12, x + 0.06, 2.05, z, 0x8a1a1a); }
  // warm candles and pools of light on every table
  for (const [x, z] of candles) { const y = pubFloorAt(x, z); k.cyl(0.025, 0.025, 0.1, x + 0.2, 0.83 + y, z, 0xf5f0dc, 8); k.lamp(x + 0.2, 0.9 + y, z, 0xffb050, 0.018); k.pool(x, 0.76 + y, z, 1.3, 0xffd090); }
  // dark oak beams across the main room
  // cream tongue-and-groove bulkheads on dark beams round the room (instead of a grid of beams; the photo's ceiling is plain cream)
  for (const [x0, z0, x1, z1] of [[X(195), Z(1305) - 0.12, X(735), Z(1305) + 0.1], [X(455) - 0.1, Z(965), X(455) + 0.1, Z(1165)], [X(615) - 0.1, Z(710), X(615) + 0.1, Z(1000)]]) {
    k.texBox(x1 - x0, 0.42, z1 - z0, (x0 + x1) / 2, H - 0.21, (z0 + z1) / 2, TNG, { tile: 0.5 }); k.box(x1 - x0 + 0.02, 0.08, z1 - z0 + 0.02, (x0 + x1) / 2, H - 0.45, (z0 + z1) / 2, 0x2a1a10); }
  k.box(0.08, 0.06, Z(1305) - Z(605), X(195) + 0.04, H - 0.05, (Z(605) + Z(1305)) / 2, 0xeeeae0);                          // cornice
  // big screens: the football is on
  const tv = (x, y, z, ry) => { k.box(2.0, 1.15, 0.08, x, y, z, 0x111111, { rot: [0, ry, 0] }); k.label('tv', 1.9, 1.05, [x + Math.sin(ry) * 0.05, y, z + Math.cos(ry) * 0.05], [0, ry, 0], { tex: tvTex(), glow: true }); };
  tv(X(250), 2.25, Z(605) + 0.12, 0);
  tv(X(885), 2.2, Z(1305) + 0.12, 0);
  // street-view windows with burgundy curtains on the raised area's outside wall... (none: it's an inside wall) -> on the restaurant side
  k.label('DARTS', 0.7, 0.7, [X(690) - 0.02, 1.7, Z(1305) - 0.112], [0, Math.PI, 0], { tex: dartTex() });
  const signs = [
    ['STAFF OF THE MONTH: RONNIE (ATE THE CERTIFICATE)', 0.9, 0.7, [X(195) + 0.12, 1.8, Z(650)], [0, Math.PI / 2, 0], {}],
    ["TODAY'S SPECIALS: WHATEVER RONNIE HASN'T EATEN", 0.8, 1.0, [X(195) + 0.12, 1.55, Z(1160)], [0, Math.PI / 2, 0], { bg: '#1b2a1b', fg: '#f5f0e6', border: '#8a6a3a', size: 56 }],
    ['MAX OCCUPANCY: 120 (OR 3 RONNIES)', 1.1, 0.45, [X(615) + 0.09, 1.9, Z(660)], [0, Math.PI / 2, 0], {}],
    ['QUIZ NIGHT — Q1: How many pies did Ronnie eat last night? A: Yes.', 1.0, 0.7, [X(560), 2.15, Z(1305) - 0.12], [0, Math.PI, 0], { bg: '#1b2a1b', fg: '#fff', border: '#8a6a3a', size: 48 }],
    ['WE DO NOT SERVE SALAD ("YES YOU DO" — Chloe)', 1.0, 0.5, [X(600), 2.4, Z(1305) - 0.12], [0, Math.PI, 0], { bg: '#fff', fg: '#c0392b' }],
    ['OYSTERFLEET PIE-EATING CHAMPION — RONNIE (UNDEFEATED, UNCHALLENGED, UNWELL)', 1.0, 0.5, [X(195) + 0.12, 2.62, Z(1252)], [0, Math.PI / 2, 0], { bg: '#d4af37', fg: '#111', border: '#7a5a10', size: 48 }],
    ['PLEASE DO NOT FEED THE BARMAN', 1.6, 0.3, [X(795) - 0.155, 2.81, (Z(985) + Z(1230)) / 2], [0, -Math.PI / 2, 0], { bg: '#fff8e7', fg: '#111' }],
    ['LAST ORDERS — Ronnie: last orders means for the CUSTOMERS', 2.4, 0.3, [bar2.at(bar2.L / 2, -0.155)[0], 2.81, bar2.at(bar2.L / 2, -0.155)[1]], [0, bar2.ry, 0], { bg: '#fff06a', fg: '#111', border: null, size: 40 }],
    ['BARRED: RONNIE (FROM THE KITCHEN) (FROM THE CELLAR) (FROM THE CRISP CLIP)', 1.3, 0.6, [X(195) + 0.12, 1.6, Z(1065)], [0, Math.PI / 2, 0], { bg: '#fff', fg: '#c62828', border: '#c62828', size: 38 }],
    ['HAPPY HOUR 5–7PM. RONNIE\'S HAPPY HOUR: 11AM–CLOSING', 1.2, 0.4, [X(810), 2.3, Z(605) + 0.1], [0, 0, 0], { bg: '#ffd400', fg: '#111', border: null, size: 40 }],
    ['CARVERY SUNDAYS — RONNIE SIZE PORTION: THE WHOLE CARVERY', 1.3, 0.45, [X(195) + 0.115, 2.45, Z(1178)], [0, Math.PI / 2, 0], { bg: '#5a2a14', fg: '#ffd400', border: '#ffd400', size: 40 }],
    ['IN CASE OF EMERGENCY: BREAK GLASS. IN CASE OF RONNIE: HIDE THE PIES.', 0.8, 0.4, [X(795) + 0.1, 2.3, Z(1500)], [0, Math.PI / 2, 0], { bg: '#c62828', fg: '#fff', border: '#fff', size: 34 }],
    ['CAUTION: RONNIE SWEAT', 0.42, 0.5, [X(620) - Math.sin(Math.PI / 4) * 0.022, 0.38, Z(1270) - 0.6 + Math.cos(Math.PI / 4) * 0.022], [0, -Math.PI / 4, 0], { bg: '#ffd400', fg: '#111', border: '#111', size: 60 }],
    ['TOILET ATTENDANT: NONE. RONNIE, PLEASE STOP OFFERING.', 0.9, 0.3, [X(415) - 0.1, 2.2, Z(560)], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', border: '#1f4fbf', size: 34 }],
  ];
  for (const [t, w, h, pos, rot, o] of signs) k.label(t, w, h, pos, rot, o);
  { const cx = X(620), cz = Z(1270) - 0.6; { const g = new THREE.BoxGeometry(0.46, 0.7, 0.03); g.translate(0, 0.35, 0); g.rotateY(-Math.PI / 4); g.translate(cx, 0, cz); k.parts.push(part(g, 0xffd400)); for (const sx of [-1, 1]) { const f = new THREE.BoxGeometry(0.03, 0.03, 0.4); f.translate(sx * 0.2, 0.015, 0); f.rotateY(-Math.PI / 4); f.translate(cx, 0, cz); k.parts.push(part(f, 0x222222)); } } }   // its A-frame stand
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

  const room = k.finish({
    name: 'The Oysterfleet',
    sky: 0xffe2c0, ground: 0x6a4a3a, hemiI: 1.55, sun: 0xfff0d8, sunI: 0.45, sunPos: [-6, 10, 5], ambient: 0.32,
    start: { x: X(655), z: Z(560), yaw: Math.PI },
    board: { x: X(420), y: 1.75, z: Z(1305) - 0.11, ry: Math.PI },
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
