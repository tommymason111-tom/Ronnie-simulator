// LEWIS'S HOUSE, laid out from Lewis's own floor plan (looking down: x to the
// right, +z toward the house / the front of the plot):
//
//   z -16 .. -11   the CABIN at the back: spare room (table, cupboard) on the left,
//                  the lads' lounge (sofa, round table, armchair, seats) on the
//                  right, both full of empty cans and bottles
//   z -11 .. -0.5  the lawn, stepping stones from the patio up to the cabin,
//                  a wheelbarrow behind the garage
//   x 2.1 .. 6.5   the GARAGE (full of junk) with the outdoor toilet on its end,
//                  doors onto a strip of patio
//   z -0.5 .. 2    grey concrete patio across the back of the house, the barbecue
//                  under the big umbrella on the left, side gate on the right
//   z 2 .. 12      the HOUSE: dining room (left) and kitchen with island (right)
//                  at the back, living room (L sofa, armchair, corner TV), stairs
//                  and the front door at the front
import * as THREE from 'three';
import { Kit, tileTex, canvasTex, brickTex, woodTex, carpetTex } from './kit.js';

export const BBQ_SPOT = { x: -4.8, z: 0.35 };        // the grill (Ian stands behind it, his back to the house)
export const IAN_SPOT = { x: -4.8, z: 1.2 };
export const IAN_YAW = Math.PI;                      // facing the garden

export function buildGarden(scene) {
  const B = { x0: -6.5, x1: 6.5, z0: -16.5, z1: 12 };
  const k = new Kit(scene, { ...B, y1: 8 });
  const R = (x0, z0, x1, z1, h, y, color, opts) => k.box(Math.abs(x1 - x0), h, Math.abs(z1 - z0), (x0 + x1) / 2, y ?? h / 2, (z0 + z1) / 2, color, opts);
  const WOOD = 0x8a5a32, DARKWOOD = 0x5a3a20, WHITE = 0xf4f4f0, PAINT = 0xefe8dc, RENDER = 0xe4ddd0;
  const BRICK = brickTex(), CLAD = woodTex('#9a6a3a'), PINE = woodTex('#d8b07a');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const glassMat = new THREE.MeshBasicMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });

  // ---------------- walls with holes (doors, windows) ----------------
  // a wall along x (at z) or along z (at x); holes: [a, b, y0, y1] along its length.
  // tex = brick/cladding outside; inside = a painted inner skin on side `inSign`
  function wallRun(axis, c, a0, a1, h, holes = [], { tex = null, color = PAINT, inColor = null, inSign = 0, t = 0.2 } = {}) {
    const seg = (s0, s1, y0, y1) => {
      if (s1 - s0 < 0.01 || y1 - y0 < 0.01) return;
      const len = s1 - s0, mid = (s0 + s1) / 2, hh = y1 - y0, my = (y0 + y1) / 2;
      const w = axis === 'x' ? len : t, d = axis === 'x' ? t : len, x = axis === 'x' ? mid : c, z = axis === 'x' ? c : mid;
      if (tex) k.texBox(w, hh, d, x, my, z, tex, { tile: 0.9, collide: true, block: y0 < 0.5 });
      else k.box(w, hh, d, x, my, z, color, { collide: true, block: y0 < 0.5 });
      if (inColor != null) {             // painted inside face
        const o = inSign * (t / 2 + 0.006);
        k.box(axis === 'x' ? len : 0.01, hh, axis === 'x' ? 0.01 : len, axis === 'x' ? mid : c + o, my, axis === 'x' ? c + o : mid, inColor);
      }
    };
    // holes sharing a span (a window above a window) cut the same column
    const spans = new Map();
    for (const [s0, s1, y0, y1] of holes) { const key = s0 + '|' + s1; if (!spans.has(key)) spans.set(key, { s0, s1, g: [] }); spans.get(key).g.push([y0, y1]); }
    let a = a0;
    for (const { s0, s1, g } of [...spans.values()].sort((p, q) => p.s0 - q.s0)) {
      seg(a, s0, 0, h); let y = 0;
      for (const [y0, y1] of g.sort((p, q) => p[0] - q[0])) { seg(s0, s1, y, y0); y = y1; }
      seg(s0, s1, y, h); a = s1;
    }
    seg(a, a1, 0, h);
  }
  // window glazing + frame in a hole
  function glaze(axis, c, s0, s1, y0, y1, frame = WHITE) {
    const w = s1 - s0, hh = y1 - y0, mid = (s0 + s1) / 2, my = (y0 + y1) / 2;
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), glassMat);
    g.position.set(axis === 'x' ? mid : c, my, axis === 'x' ? c : mid); if (axis === 'z') g.rotation.y = Math.PI / 2; scene.add(g);
    const fb = (len, h, a, y) => axis === 'x' ? k.box(len, h, 0.08, a, y, c, frame) : k.box(0.08, h, len, c, y, a, frame);
    fb(w + 0.1, 0.06, mid, y1); fb(w + 0.1, 0.06, mid, y0); fb(0.06, hh, s0, my); fb(0.06, hh, s1, my); fb(0.04, hh, mid, my);
    axis === 'x' ? k.box(w + 0.2, 0.04, 0.3, mid, y0 - 0.02, c, frame) : k.box(0.3, 0.04, w + 0.2, c, y0 - 0.02, mid, frame);   // sill
  }
  // a door leaf swung open into the room (hinged at s0)
  function leaf(axis, c, s0, s1, dir, color = WHITE, h = 2.0) {
    const w = s1 - s0;
    if (axis === 'x') k.box(0.05, h, w, s0 + 0.05, h / 2, c + dir * w / 2, color);
    else k.box(w, h, 0.05, c + dir * w / 2, h / 2, s0 + 0.05, color);
  }

  // ---------------- sky + the world beyond the fences ----------------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(70, 24, 14), new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide, depthWrite: false }));
  sky.position.set(0, -5, 0); sky.renderOrder = -10; scene.add(sky);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshLambertMaterial({ color: 0x5f8f3a }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; scene.add(ground);
  for (const [x, z, w, h, c] of [[-6, -23, 10, 6.5, 0x9a5a3a], [6, -23, 9, 6, 0xa86a48], [-12.5, -9, 6, 6, 0x8a4a32], [12.5, -6, 6, 6.2, 0xb07a52], [-12.5, 6, 6, 6, 0x9a6a4a], [12.5, 7, 6, 5.8, 0xa45c3c]]) {
    R(x - w / 2, z - 2.5, x + w / 2, z + 2.5, h, h / 2, c);
    k.box(w + 0.4, 0.25, 5.6, x, h + 0.9, z, 0x4a3a3a);
    for (let i = 0; i < Math.floor(w / 2.2); i++) for (const yy of [1.5, 3.6]) k.box(0.9, 1.0, 0.05, x - w / 2 + 1.2 + i * 2.2, yy, z + 2.52, 0xbfe0f0);
  }
  for (const [x, z, s] of [[-9.5, -19, 1.2], [3, -20, 1.5], [10, -15, 1.1], [-10, -3, 1.3], [10, 1, 1.2]]) {
    k.cyl(0.2 * s, 0.28 * s, 3 * s, x, 1.5 * s, z, 0x5a3a20, 8);
    for (const [dy, r] of [[3.2, 1.8], [4.4, 1.4], [5.3, 0.9]]) k.cyl(0.05, r * s, 1.6 * s, x, dy * s, z, [0x3f7a2e, 0x4a8a34, 0x356a26][Math.round(dy) % 3], 10);
  }

  // ---------------- ground: lawn, grey concrete patio, stepping stones ----------------
  const CONCRETE = tileTex('#a7a7a3', '#a1a19d', '#84847f', 128);
  k.floor(B.x0, B.z0, B.x1, 2, grassTex(), 0.002, 2.5);
  k.floor(B.x0, -0.5, B.x1, 2, CONCRETE, 0.006, 2.4);              // across the back of the house
  k.floor(1.0, -4.3, 2.1, -0.5, CONCRETE, 0.0062, 2.4);             // the strip up to the garage door
  k.floor(B.x0, -2.7, -3.5, -0.5, CONCRETE, 0.0064, 2.4);           // under the umbrella, by the barbecue
  // stepping stones from the patio to the cabin door
  for (const [x, z, r] of [[0.45, -3.45, 0.24], [0.05, -4.4, 0.22], [-0.85, -4.5, 0.2], [-0.6, -5.4, 0.23], [-1.2, -6.0, 0.2], [-0.3, -7.55, 0.24], [0.75, -8.3, 0.22], [1.0, -9.3, 0.23], [1.9, -9.8, 0.21], [1.6, -10.5, 0.22]]) {
    k.cyl(r, r + 0.02, 0.05, x, 0.025, z, [0xb8b4aa, 0xa8a49a, 0xc4c0b6][Math.floor(rnd() * 3)], 12);
  }
  // timber edging across the lawn (the line on the plan)
  R(B.x0, -6.66, 2.1, -6.54, 0.08, 0.04, 0x6a4a2a);
  // the planted border between the lawn and the patio
  R(-3.5, -0.75, 1.0, -0.5, 0.25, 0.125, 0x5a3a20, { block: true });
  for (let i = 0; i < 16; i++) { const x = -3.35 + i * 0.28; k.cyl(0.04, 0.17 + rnd() * 0.05, 0.3 + rnd() * 0.2, x, 0.4, -0.63, [0x3f8a2e, 0x4a9a34, 0x356a26][i % 3], 8); if (i % 3 === 0) k.box(0.07, 0.06, 0.07, x, 0.62, -0.63, [0xff4f7b, 0xffd400, 0xffffff, 0x9a4aff][i % 4]); }

  // ---------------- fences + the side gate ----------------
  const fence = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), along = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    R(Math.min(x0, x1), Math.min(z0, z1) - (along ? 0.04 : 0), Math.max(x0, x1) + (along ? 0 : 0.04), Math.max(z0, z1) + (along ? 0.04 : 0), 1.8, 0.9, WOOD, { collide: true, block: true });
    for (let t = 0; t <= len; t += 1.8) { const px = x0 + (x1 - x0) * t / len, pz = z0 + (z1 - z0) * t / len; k.box(0.1, 1.95, 0.1, px, 0.975, pz, DARKWOOD); }
  };
  fence(B.x0, B.z0, B.x1, B.z0); fence(B.x0, B.z0, B.x0, 2); fence(B.x1, B.z0, B.x1, B.z1);
  R(4.6, 1.97, 6.45, 2.03, 1.75, 0.95, 0x7a4e2a, { collide: true, block: true });                   // side gate
  for (const y of [0.4, 1.5]) R(4.65, 1.94, 6.4, 1.96, 0.1, y, DARKWOOD);
  k.box(0.18, 0.03, 0.03, 4.75, 1.0, 1.93, 0x111111);                                            // latch
  k.label('SIDE GATE', 0.5, 0.14, [5.5, 1.62, 1.935], [0, Math.PI, 0], { bg: '#fff', fg: '#111', border: null, size: 40 });
  k.blockers.push({ x0: 4.6, x1: B.x1, z0: 2.05, z1: B.z1, y1: 3 });                          // the side passage (out of the garden)

  // ======================================================== THE HOUSE (x -6.5..4.5, z 2..12)
  const HX0 = -6.5, HX1 = 4.5, HZ0 = 2, HZ1 = 12, CEIL = 2.6, TOP = 5.4;
  // floors: wood in the dining room, tiles in the kitchen, carpet in the living room / hall
  k.floor(HX0, HZ0, -0.6, 7.2, woodTex('#8a5a32'), 0.004, 1.4);
  k.floor(-0.6, HZ0, HX1, 6.4, tileTex('#e8e4dc', '#dcd8d0', '#b0aaa0', 64), 0.004, 0.8);
  k.floor(HX0, 7.2, -0.6, HZ1, carpetTex('#8a8070', '#9a9080', '#7a7060'), 0.004, 1.2);
  k.floor(-0.6, 6.4, HX1, HZ1, carpetTex('#8a8070', '#9a9080', '#7a7060'), 0.0041, 1.2);
  // outer walls: brick outside, painted inside, two storeys tall
  wallRun('x', HZ0, HX0 - 0.1, HX1 + 0.1, TOP, [[-4.9, -2.7, 0.9, 2.15], [0.0, 1.0, 0, 2.1], [1.9, 3.6, 1.0, 2.15], [-4.9, -2.7, 3.3, 4.5], [1.9, 3.6, 3.3, 4.5]], { tex: BRICK, inColor: PAINT, inSign: 1 });
  wallRun('x', HZ1, HX0 - 0.1, HX1 + 0.1, TOP, [[-5.6, -3.4, 0.9, 2.15], [1.6, 2.6, 0, 2.1]], { tex: BRICK, inColor: PAINT, inSign: -1 });
  wallRun('z', HX0, HZ0, HZ1, TOP, [[8.5, 10, 1.0, 2.1]], { tex: BRICK, inColor: PAINT, inSign: 1 });
  wallRun('z', HX1, HZ0, HZ1, TOP, [], { tex: BRICK, inColor: PAINT, inSign: -1 });
  glaze('x', HZ0, -4.9, -2.7, 0.9, 2.15); glaze('x', HZ0, 1.9, 3.6, 1.0, 2.15);
  glaze('x', HZ1, -5.6, -3.4, 0.9, 2.15); glaze('z', HX0, 8.5, 10, 1.0, 2.1);
  for (const [a, b] of [[-4.9, -2.7], [1.9, 3.6]]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(b - a, 1.2), new THREE.MeshLambertMaterial({ color: 0x3a4a5a })); g.position.set((a + b) / 2, 3.9, HZ0 + 0.06); g.rotation.y = Math.PI; scene.add(g); glaze('x', HZ0 - 0.02, a, b, 3.3, 4.5); }   // upstairs windows (dark rooms)
  leaf('x', HZ0, 0.0, 1.0, 1, WHITE, 2.05);                                                    // back door, open
  R(1.6, HZ1 - 0.06, 2.6, HZ1 + 0.06, 2.05, 1.025, 0x1e3a6a); k.cyl(0.03, 0.03, 0.06, 2.45, 1.0, HZ1 - 0.09, 0xd4af37, 8);   // front door (shut)
  k.label('47', 0.2, 0.12, [2.1, 1.8, HZ1 - 0.065], [0, Math.PI, 0], { bg: '#1e3a6a', fg: '#d4af37', border: null, size: 60 });
  // ceiling + roof
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HX1 - HX0, HZ1 - HZ0), new THREE.MeshBasicMaterial({ color: 0xe6e2da }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set((HX0 + HX1) / 2, CEIL, (HZ0 + HZ1) / 2); scene.add(ceil);
  const half = (HZ1 - HZ0) / 2 + 0.4, rise = 2.2, ang = Math.atan2(rise, half), slope = Math.hypot(half, rise);
  for (const s of [-1, 1]) k.box(HX1 - HX0 + 0.6, 0.2, slope, (HX0 + HX1) / 2, TOP + rise / 2, (HZ0 + HZ1) / 2 + s * half / 2, 0x5a3a3a, { rot: [s * ang, 0, 0] });
  const gable = new THREE.Shape([new THREE.Vector2(-half + 0.4, 0), new THREE.Vector2(half - 0.4, 0), new THREE.Vector2(0, rise - 0.1)]);
  for (const x of [HX0, HX1]) { const m = new THREE.Mesh(new THREE.ShapeGeometry(gable), new THREE.MeshLambertMaterial({ color: 0xa4583a, side: THREE.DoubleSide })); m.rotation.y = Math.PI / 2; m.position.set(x, TOP, (HZ0 + HZ1) / 2); scene.add(m); }
  R(HX0 - 0.1, HZ0 - 0.25, HX1 + 0.1, HZ0 - 0.05, 0.14, TOP - 0.05, 0x333333);                // gutter
  // inside walls: dining | kitchen (door near the window), kitchen | living room
  wallRun('z', -0.6, HZ0, 6.4, CEIL, [[2.4, 3.4, 0, 2.05]], { color: PAINT, t: 0.12 });
  wallRun('x', 6.4, -0.6, 3.4, CEIL, [[0.4, 1.3, 0, 2.05]], { color: PAINT, t: 0.12 });
  // --- kitchen: worktops round the side and back, sink, fridge, island bar with stools
  const TOP_C = 0x2a2a2e, UNIT = 0xf2f2ee;
  R(3.9, 2.15, 4.4, 6.3, 0.9, 0.45, UNIT, { block: true }); R(3.86, 2.12, 4.42, 6.32, 0.04, 0.92, TOP_C, { collide: true });
  R(1.0, 5.75, 3.86, 6.33, 0.9, 0.45, UNIT, { block: true }); R(0.98, 5.72, 3.86, 6.35, 0.04, 0.92, TOP_C, { collide: true });
  R(3.95, 4.7, 4.35, 5.4, 0.03, 0.935, 0x9aa0a8); k.cyl(0.02, 0.02, 0.3, 4.35, 1.08, 5.05, 0xc8c8c8, 6);   // sink + tap
  R(-0.5, 5.7, 0.95, 6.33, 1.9, 0.95, 0xe8e8ea, { collide: true, block: true }); R(0.35, 5.68, 0.37, 5.7, 0.8, 1.2, 0x888888);   // big fridge
  k.label('LEWY\'S PROTEIN SHAKES. HANDS OFF.', 0.5, 0.22, [0.2, 1.5, 5.68], [0, Math.PI, 0], { bg: '#fffbe8', fg: '#c62828', border: null, size: 34 });
  R(1.2, 3.35, 3.3, 4.1, 0.95, 0.475, 0x3a3a40, { block: true }); R(1.15, 3.3, 3.35, 4.15, 0.05, 0.975, 0xf0f0f0, { collide: true });   // island / bar
  for (const x of [1.6, 2.3, 3.0]) k.stool(x, 4.55, 0x2a2a2a, 0x9a9a9a, 0.68);
  R(1.0, 2.15, 3.8, 2.5, 0.9, 0.45, UNIT, { block: true }); R(0.98, 2.13, 3.82, 2.52, 0.04, 0.92, TOP_C, { collide: true });     // under the window
  k.cyl(0.13, 0.11, 0.25, 3.0, 1.06, 2.32, 0x8a8a8a, 12);                                                                         // kettle
  for (const x of [1.6, 2.5, 3.1]) k.spawns.push(new THREE.Vector3(x, 1.08, 3.72));
  k.spawns.push(new THREE.Vector3(4.15, 1.0, 3.0), new THREE.Vector3(2.4, 1.0, 6.05));
  // --- dining room: long table with chairs all round
  const dx = -3.6, dz = 4.6;
  k.table(dx, dz, 1.0, 2.3, { chairs: 3, top: 0x6a4428, legs: 0x3a2416, chairColor: 0x3a2416, seat: 0xd8d0c0, spots: 3 });
  k.chair(dx, dz - 1.5, Math.PI, 0x3a2416, 0xd8d0c0); k.chair(dx, dz + 1.5, 0, 0x3a2416, 0xd8d0c0);
  R(-6.4, 3.0, -6.0, 5.6, 0.85, 0.425, 0x5a3a22, { block: true, collide: true });                // sideboard
  // --- living room: L sofa, armchair, corner TV, little table, stairs, hall
  const SOFA = 0x5a6a7a, CUSH = 0x6a7a8a;
  R(-3.2, 11.15, 0.9, 11.9, 0.45, 0.225, SOFA, { block: true }); R(-3.2, 11.65, 0.9, 11.9, 0.85, 0.425, SOFA);   // along the front wall
  R(0.2, 9.2, 0.9, 11.15, 0.45, 0.225, SOFA, { block: true }); R(0.65, 9.2, 0.9, 11.15, 0.85, 0.425, SOFA);     // the L, up the side
  for (const x of [-2.6, -1.6, -0.6]) R(x - 0.45, 11.2, x + 0.45, 11.62, 0.12, 0.5, CUSH);
  for (const z of [9.7, 10.6]) R(0.25, z - 0.42, 0.62, z + 0.42, 0.12, 0.5, CUSH);
  k.spawns.push(new THREE.Vector3(-1.6, 0.62, 11.4));
  k.chair(-2.4, 8.6, -Math.PI * 0.75, 0x6a3a2a, 0x8a5a3a); R(-2.75, 8.25, -2.05, 8.95, 0.3, 0.5, 0x6a3a2a, { rot: [0, Math.PI / 4, 0] });   // armchair
  R(-6.4, 8.2, -5.8, 9.0, 0.6, 0.3, 0x5a3a22, { block: true, collide: true }); k.spawns.push(new THREE.Vector3(-6.1, 0.66, 8.6));   // side table
  k.box(1.3, 0.75, 0.06, -5.9, 1.3, 11.4, 0x111111, { rot: [0, Math.PI * 0.75, 0] });         // corner TV
  k.box(1.22, 0.68, 0.02, -5.88, 1.3, 11.38, 0x2a5aa8, { rot: [0, Math.PI * 0.75, 0] });
  R(-6.4, 11.1, -5.6, 11.9, 0.5, 0.25, 0x3a2a1a, { block: true });
  for (let i = 0; i < 13; i++) R(3.4, 10.8 - (i + 1) * 0.34, 4.45, 10.8 - i * 0.34, 0.2 * (i + 1), 0.1 * (i + 1), i % 2 ? 0xd8d0c0 : 0xc8bfae, { collide: true });   // stairs up
  k.blockers.push({ x0: 3.4, x1: HX1, z0: 6.4, z1: 10.8, y1: 2.6 });
  R(3.35, 6.4, 3.4, 10.8, 0.9, 1.4, DARKWOOD);                                                   // banister
  R(1.7, 11.3, 2.5, 11.9, 0.01, 0.006, 0x3a2a1a);                                                // doormat
  k.light(-3.2, 2.35, 5.2, 0xfff0d8, 3, 8); k.light(1.2, 2.35, 8.5, 0xfff0d8, 3, 8);
  k.lamp(-3.6, 2.4, 4.6, 0xfff4e0, 0.14); k.lamp(2.2, 2.4, 3.7, 0xfff4e0, 0.12); k.lamp(-2, 2.4, 9.8, 0xfff4e0, 0.14);

  // ======================================================== THE PATIO
  // the barbecue, under the big umbrella
  const bx = BBQ_SPOT.x, bz = BBQ_SPOT.z;
  R(bx - 0.75, bz - 0.35, bx + 0.75, bz + 0.35, 0.82, 0.41, 0x2a2a2e, { collide: true, block: true });
  R(bx - 0.62, bz - 0.3, bx + 0.62, bz + 0.3, 0.12, 0.88, 0x111111);
  for (let i = 0; i < 9; i++) R(bx - 0.6, bz - 0.28 + i * 0.07, bx + 0.6, bz - 0.27 + i * 0.07, 0.015, 0.95, 0x8a8a8a, i === 0 ? { collide: true } : undefined);
  k.box(1.24, 0.5, 0.03, bx, 1.12, bz + 0.42, 0x8a8a92, { rot: [0.5, 0, 0] });                       // the lid, flipped open (Ian's side)
  R(bx - 1.15, bz - 0.3, bx - 0.75, bz + 0.3, 0.04, 0.84, 0x9a9aa0, { collide: true }); R(bx + 0.75, bz - 0.3, bx + 1.15, bz + 0.3, 0.04, 0.84, 0x9a9aa0, { collide: true });
  k.lamp(bx, 0.9, bz, 0xff5a10, 0.0, false); k.halo(bx, 1.05, bz, 1.4, 0xff7a30); k.pool(bx, 0.955, bz, 1.2, 0xff6a20);
  k.cyl(0.2, 0.2, 0.9, bx + 1.45, 0.45, bz + 0.1, 0x8a9aa8, 12);                                       // gas bottle
  k.label('IAN\'S GRILL — HEALTHY OPTIONS ONLY (LIES)', 1.2, 0.25, [bx, 0.62, bz - 0.36], [0, Math.PI, 0], { bg: '#111', fg: '#ffd400', border: null, size: 40 });
  for (const ddx of [-0.4, 0, 0.4]) k.spawns.push(new THREE.Vector3(bx + ddx, 1.02, bz));
  k.spawns.push(new THREE.Vector3(bx - 0.95, 0.92, bz), new THREE.Vector3(bx + 0.95, 0.92, bz));
  // the umbrella cover: a big cantilever parasol, pole in the corner
  const ux = -4.4, uz = -1.0, px = -6.1, pz = -2.4;
  k.cyl(0.05, 0.05, 2.9, px, 1.45, pz, 0x3a3a3a, 8); R(px - 0.4, pz - 0.4, px + 0.4, pz + 0.4, 0.12, 0.06, 0x555555, { block: true });
  k.box(0.06, 0.06, Math.hypot(ux - px, uz - pz), (ux + px) / 2, 2.85, (uz + pz) / 2, 0x3a3a3a, { rot: [0, Math.atan2(ux - px, uz - pz), 0] });
  k.cyl(0.06, 2.1, 0.55, ux, 2.75, uz, 0xd8cdb8, 16); k.cyl(2.1, 2.12, 0.08, ux, 2.47, uz, 0xb8ab94, 16);
  // patio table + chairs on the right, cool box
  k.table(3.4, 0.9, 1.4, 0.8, { chairs: 1, top: 0xe8e8e8, legs: 0x9a9a9a, chairColor: 0x4a4a4a, spots: 2 });
  R(5.4, 1.2, 6.1, 1.7, 0.45, 0.225, 0x1e5aa8, { collide: true, block: true }); R(5.38, 1.18, 6.12, 1.72, 0.06, 0.48, WHITE);
  k.spawns.push(new THREE.Vector3(5.6, 0.6, 1.45), new THREE.Vector3(5.9, 0.6, 1.45));
  for (const x of [-6.1, -2.3, -0.4, 1.5]) { k.cyl(0.22, 0.16, 0.42, x, 0.21, 1.72, 0xb05a32, 12); k.cyl(0.05, 0.36, 0.55, x, 0.7, 1.72, 0x3f8a2e, 10); }

  // ======================================================== THE GARAGE + OUTDOOR TOILET (x 2.1..6.5, z -8.3..-0.3)
  const GX0 = 2.1, GX1 = B.x1, GZ0 = -8.3, GZ1 = -0.3, GH = 2.5;
  k.floor(GX0, GZ0, GX1, -2.4, tileTex('#8a8a86', '#84847f', '#6a6a66', 128), 0.007, 2);
  k.floor(GX0, -2.4, GX1, GZ1, tileTex('#e0e4e8', '#d4d8dc', '#a0a4a8', 48), 0.007, 0.6);
  wallRun('z', GX0, GZ0, GZ1, GH, [[-4.2, -3.2, 0, 2.0], [-1.85, -0.95, 0, 2.0]], { color: RENDER, inColor: 0xd8d4cc, inSign: 1 });
  wallRun('x', GZ0, GX0, GX1, GH, [[4.4, 5.6, 1.1, 1.9]], { color: RENDER, inColor: 0xd8d4cc, inSign: 1 });
  wallRun('x', GZ1, GX0, GX1, GH, [], { color: RENDER, inColor: 0xd8d4cc, inSign: -1 });
  wallRun('z', GX1 - 0.1, GZ0, GZ1, GH, [], { color: RENDER, inColor: 0xd8d4cc, inSign: -1 });
  wallRun('x', -2.4, GX0, GX1, GH, [], { color: RENDER, t: 0.12 });                                   // garage | toilet
  glaze('x', GZ0, 4.4, 5.6, 1.1, 1.9);
  R(GX0 - 0.15, GZ0 - 0.15, GX1 + 0.05, GZ1 + 0.15, 0.12, GH + 0.06, 0x3a3a3a);                         // flat felt roof
  { const gc = new THREE.Mesh(new THREE.PlaneGeometry(GX1 - GX0, GZ1 - GZ0), new THREE.MeshBasicMaterial({ color: 0xcfcac0 })); gc.rotation.x = Math.PI / 2; gc.position.set((GX0 + GX1) / 2, GH - 0.005, (GZ0 + GZ1) / 2); scene.add(gc); }
  leaf('z', GX0, -4.2, -3.2, 1, 0x2e5a3a); leaf('z', GX0, -1.85, -0.95, 1, 0xf4f4f0);
  k.label('GARAGE', 0.6, 0.16, [GX0 - 0.11, 2.2, -3.7], [0, -Math.PI / 2, 0], { bg: '#2e5a3a', fg: '#fff', border: null, size: 44 });
  k.label('BOG', 0.4, 0.16, [GX0 - 0.11, 2.2, -1.4], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#111', border: '#111', size: 44 });
  // the mess: workbench, boxes, tyres, a bike, paint tins, crates, an old telly
  R(5.8, -7.9, 6.35, -5.2, 0.9, 0.45, 0x7a5a3a, { block: true, collide: true });
  for (let i = 0; i < 8; i++) k.box(0.05 + rnd() * 0.1, 0.04, 0.2 + rnd() * 0.2, 6.0 + rnd() * 0.2, 0.93, -7.7 + i * 0.3, [0xd32f2f, 0x555555, 0xffd400, 0x1e5aa8][i % 4], { rot: [0, rnd() * 3, 0] });
  k.box(0.04, 0.9, 2.4, 6.36, 1.6, -6.6, 0x9a7a5a);                                                   // pegboard
  k.spawns.push(new THREE.Vector3(6.0, 1.0, -6.0), new THREE.Vector3(6.05, 1.0, -7.3));
  for (const [x, z, n] of [[2.7, -7.7, 3], [3.4, -7.8, 2], [2.6, -6.9, 2], [4.2, -7.9, 1]]) for (let i = 0; i < n; i++) k.box(0.55 + rnd() * 0.2, 0.42, 0.5 + rnd() * 0.15, x + (rnd() - 0.5) * 0.08, 0.21 + i * 0.42, z, [0xb8925a, 0xa8844e, 0xc8a26a][i % 3], { block: i === 0, collide: i === n - 1, rot: [0, (rnd() - 0.5) * 0.3, 0] });
  for (let i = 0; i < 4; i++) { k.cyl(0.32, 0.32, 0.2, 5.3, 0.1 + i * 0.2, -4.6, 0x1a1a1a, 14, { block: i === 0 }); k.cyl(0.18, 0.18, 0.21, 5.3, 0.1 + i * 0.2, -4.6, 0x3a3a3a, 10); }
  for (const z of [-5.9, -4.9]) k.box(0.04, 0.66, 0.66, 2.55, 0.36, z, 0x111111, { rot: [0, 0, 0.1] });   // bike wheels against the wall
  k.box(0.04, 0.05, 1.0, 2.58, 0.68, -5.4, 0xd32f2f); k.box(0.04, 0.4, 0.05, 2.58, 0.86, -5.75, 0xd32f2f);
  for (let i = 0; i < 6; i++) k.cyl(0.11, 0.11, 0.22, 3.0 + (i % 3) * 0.25, 0.11 + Math.floor(i / 3) * 0.22, -5.2 + (i % 2) * 0.05, [0xffffff, 0x2a8ae0, 0xd32f2f][i % 3], 10);   // paint tins
  for (let i = 0; i < 3; i++) R(4.0 + i * 0.05, -3.1, 4.5 + i * 0.05, -2.7, 0.28, 0.14 + i * 0.28, [0xffd400, 0x1e5aa8, 0xd32f2f][i]);   // beer crates
  R(3.6, -6.4, 4.4, -5.8, 0.55, 0.275, 0x2a2a2a, { block: true }); k.box(0.7, 0.42, 0.02, 4.0, 0.3, -5.79, 0x3a4a5a);   // an old telly on the floor
  k.box(0.9, 0.12, 1.9, 4.6, 0.06, -3.6, 0x8a9aa8, { rot: [0, 0.4, 0] });                            // a deflated airbed
  k.light(4.2, 2.3, -5.3, 0xfff0d0, 2.5, 6); k.lamp(4.2, 2.42, -5.3, 0xffffff, 0.1);
  // the toilet
  R(5.6, -2.3, 6.35, -1.9, 0.75, 0.375, WHITE, { block: true }); k.cyl(0.2, 0.17, 0.42, 5.95, 0.21, -1.6, WHITE, 14, { block: true }); k.cyl(0.21, 0.21, 0.03, 5.95, 0.44, -1.6, 0xeeeeee, 14);
  R(3.0, -2.3, 3.6, -1.95, 0.12, 0.85, WHITE); k.cyl(0.04, 0.05, 0.85, 3.3, 0.42, -2.12, WHITE, 8);   // little sink
  for (let i = 0; i < 5; i++) k.cyl(0.055, 0.055, 0.1, 6.25, 0.05 + i * 0.1, -0.6, 0xffffff, 10);     // a tower of loo rolls
  k.label('PLEASE DON\'T, RONNIE', 0.5, 0.18, [5.95, 1.6, -2.32], [0, 0, 0], { bg: '#fff', fg: '#c62828', border: '#c62828', size: 40 });
  k.lamp(4.3, 2.42, -1.35, 0xffffff, 0.08);
  // the wheelbarrow behind the garage
  { const wx = 4.7, wz = -9.3;
    k.box(0.75, 0.32, 1.0, wx, 0.55, wz, 0x2e7d32, { block: true }); k.box(0.65, 0.04, 0.9, wx, 0.7, wz, 0x5a3a20);
    k.cyl(0.2, 0.2, 0.08, wx, 0.2, wz - 0.65, 0x1a1a1a, 12);
    for (const s of [-1, 1]) { k.box(0.04, 0.04, 1.2, wx + s * 0.3, 0.55, wz + 0.5, 0x3a3a3a, { rot: [-0.25, 0, 0] }); k.box(0.04, 0.4, 0.04, wx + s * 0.28, 0.2, wz + 0.25, 0x3a3a3a); } }

  // ======================================================== THE CABIN (x -4.5..5, z -16.2..-11)
  const CX0 = -4.5, CX1 = 5.0, CZ0 = -16.2, CZ1 = -11, CH = 2.4, PART = -0.7;
  k.floor(CX0, CZ0, CX1, CZ1, woodTex('#b08a5a'), 0.008, 1.2);
  R(CX0 - 0.1, CZ0 - 0.1, CX1 + 0.1, CZ1 + 0.1, 0.12, 0.06, 0x5a4a3a);                                    // decking base
  wallRun('x', CZ1, CX0, CX1, CH, [[-3.6, -1.6, 0.9, 1.9], [1.6, 2.6, 0, 2.05], [3.2, 4.5, 0.9, 1.9]], { tex: CLAD, inColor: 0xe8d4b0, inSign: -1, t: 0.14 });
  wallRun('x', CZ0, CX0, CX1, CH, [], { tex: CLAD, inColor: 0xe8d4b0, inSign: 1, t: 0.14 });
  wallRun('z', CX0, CZ0, CZ1, CH, [[-14.6, -13.2, 0.9, 1.9]], { tex: CLAD, inColor: 0xe8d4b0, inSign: 1, t: 0.14 });
  wallRun('z', CX1, CZ0, CZ1, CH, [], { tex: CLAD, inColor: 0xe8d4b0, inSign: -1, t: 0.14 });
  wallRun('z', PART, CZ0, CZ1, CH, [[-13.0, -12.1, 0, 2.0]], { color: 0xe8d4b0, t: 0.1 });         // spare room | lounge
  glaze('x', CZ1, -3.6, -1.6, 0.9, 1.9, 0x3a2a1a); glaze('x', CZ1, 3.2, 4.5, 0.9, 1.9, 0x3a2a1a); glaze('z', CX0, -14.6, -13.2, 0.9, 1.9, 0x3a2a1a);
  leaf('x', CZ1, 1.6, 2.6, -1, 0x6a4a2a);
  const cr = new THREE.Mesh(new THREE.PlaneGeometry(CX1 - CX0, CZ1 - CZ0), new THREE.MeshBasicMaterial({ color: 0xc8a878 }));
  cr.rotation.x = Math.PI / 2; cr.position.set((CX0 + CX1) / 2, CH, (CZ0 + CZ1) / 2); scene.add(cr);
  k.box(CX1 - CX0 + 0.5, 0.12, CZ1 - CZ0 + 0.6, (CX0 + CX1) / 2, CH + 0.18, (CZ0 + CZ1) / 2, 0x2a2a2a, { rot: [-0.06, 0, 0] });   // felt roof
  k.label('THE CABIN — LADS ONLY (AND RONNIE)', 1.4, 0.26, [2.1, 2.22, CZ1 + 0.08], [0, 0, 0], { bg: '#3a2a1a', fg: '#ffd400', border: null, size: 40 });
  k.light(-2.6, 2.2, -13.6, 0xffe0b0, 2.5, 6); k.light(2.2, 2.2, -13.6, 0xffe0b0, 3, 7);
  k.lamp(-2.6, 2.3, -13.6, 0xfff0d0, 0.1); k.lamp(2.2, 2.3, -13.6, 0xfff0d0, 0.1);
  // spare room: the table, the big cupboard along the back
  k.table(-2.6, -12.9, 1.4, 0.8, { chairs: 1, top: 0x8a6a42, legs: 0x4a3420, chairColor: 0x4a3420, spots: 2 });
  R(-3.9, CZ0 + 0.08, -1.1, CZ0 + 0.7, 2.1, 1.05, 0xc8a878, { block: true, collide: true });
  for (const x of [-3.2, -1.8]) { k.box(1.3, 1.95, 0.02, x, 1.05, CZ0 + 0.71, 0xb89868); k.box(0.03, 0.2, 0.03, x + (x < -2.5 ? 0.55 : -0.55), 1.05, CZ0 + 0.73, 0x2a2a2a); }
  R(PART - 0.12, -14.4, PART - 0.06, -13.6, 0.55, 0.45, 0xc62828); for (let i = 0; i < 5; i++) R(PART - 0.13, -14.35 + i * 0.16, PART - 0.12, -14.3 + i * 0.16, 0.45, 0.45, 0x8a1a1a);   // the red heater
  // lounge: sofa along the back, round table, armchair, seats
  R(0.2, CZ0 + 0.1, 3.2, CZ0 + 0.95, 0.45, 0.225, 0x3a3a4a, { block: true }); R(0.2, CZ0 + 0.1, 3.2, CZ0 + 0.35, 0.9, 0.45, 0x3a3a4a);
  for (const s of [0.2, 3.0]) R(s, CZ0 + 0.1, s + 0.2, CZ0 + 0.95, 0.65, 0.325, 0x3a3a4a);
  for (const x of [0.9, 1.7, 2.5]) R(x - 0.38, CZ0 + 0.38, x + 0.38, CZ0 + 0.9, 0.12, 0.5, 0x4a4a5a);
  k.spawns.push(new THREE.Vector3(1.7, 0.62, CZ0 + 0.65));
  k.table(4.3, -15.2, 0.9, 0.9, { round: true, chairs: 0, top: 0x6a4a2a, legs: 0x3a2a1a, spots: 1 });
  R(3.75, -12.85, 4.65, -11.95, 0.45, 0.225, 0x7a2a2a, { block: true }); R(4.45, -12.85, 4.75, -11.95, 0.9, 0.45, 0x7a2a2a); for (const z of [-12.85, -11.95]) R(3.75, z - 0.08, 4.75, z + 0.08, 0.65, 0.325, 0x7a2a2a);   // armchair, facing the sofa
  k.chair(-0.15, -13.7, Math.PI / 2 + 0.3, 0x2a2a2a, 0x4a4a4a); k.chair(0.05, -12.6, Math.PI / 2, 0x2a2a2a, 0x4a4a4a); k.chair(0.6, -11.7, Math.PI * 0.85, 0x2a2a2a, 0x4a4a4a); k.chair(4.3, -14.1, Math.PI, 0x2a2a2a, 0x4a4a4a);
  R(1.0, -14.1, 2.4, -13.4, 0.42, 0.21, 0x5a3a22, { collide: true, block: true }); k.spawns.push(new THREE.Vector3(1.7, 0.5, -13.75));   // coffee table
  // the mess: cans, bottles, pizza boxes, crisp packets everywhere
  const CANS = [0xd32f2f, 0x1e5aa8, 0xffd400, 0x2e7d32, 0x111111, 0xe0e0e0, 0x8a1a8a];
  const can = (x, y, z) => k.cyl(0.033, 0.033, 0.12, x, y + 0.06, z, CANS[Math.floor(rnd() * CANS.length)], 8);
  const lyingCan = (x, y, z) => k.box(0.12, 0.066, 0.066, x, y + 0.033, z, CANS[Math.floor(rnd() * CANS.length)], { rot: [0, rnd() * 3, 0] });
  const bottle = (x, y, z) => { k.cyl(0.035, 0.035, 0.2, x, y + 0.1, z, 0x2a6a2a, 8); k.cyl(0.012, 0.02, 0.07, x, y + 0.23, z, 0x2a6a2a, 6); };
  const pizza = (x, y, z, r) => { k.box(0.4, 0.04, 0.4, x, y + 0.02, z, 0xe8d8b8, { rot: [0, r, 0] }); k.box(0.36, 0.005, 0.36, x, y + 0.042, z, 0xc82a1a, { rot: [0, r, 0] }); };
  const crisps = (x, y, z) => k.box(0.16, 0.03, 0.22, x, y + 0.015, z, [0xd32f2f, 0x1e5aa8, 0x2e7d32, 0xffd400][Math.floor(rnd() * 4)], { rot: [0, rnd() * 3, 0] });
  const strewn = (x0, z0, x1, z1, n, y = 0.01) => { for (let i = 0; i < n; i++) { const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0), t = rnd(); if (t < 0.45) lyingCan(x, y, z); else if (t < 0.65) can(x, y, z); else if (t < 0.8) crisps(x, y, z); else if (t < 0.9) bottle(x, y, z); else pizza(x, y, z, rnd() * 3); } };
  strewn(-0.5, -15.2, 4.8, -11.3, 34);                               // lounge floor
  strewn(1.05, -14.05, 2.35, -13.45, 6, 0.42);                       // coffee table
  strewn(3.95, -15.55, 4.65, -14.85, 4, 0.76);                       // round table
  strewn(-3.25, -13.2, -1.95, -12.6, 5, 0.76);                       // spare room table
  strewn(-4.3, -14.8, -0.9, -11.3, 12);                              // spare room floor
  for (const [x, z] of [[0.6, -15.4], [2.9, -15.3]]) pizza(x, 0.45, z, rnd());
  for (let i = 0; i < 6; i++) bottle(-1.0 + i * 0.12, 0, -15.95);    // a row of empties along the back wall
  R(-0.9, -15.8, -0.5, -15.4, 0.55, 0.275, 0x2a2a2a); for (let i = 0; i < 4; i++) lyingCan(-0.7, 0.55 + i * 0.066, -15.6);   // the bin, overflowing
  // mess in the garage too
  strewn(2.4, -7.6, 5.6, -3.0, 10); strewn(5.85, -7.8, 6.3, -5.3, 4, 0.9);

  // ---------------- sunshine ----------------
  return k.finish({
    name: "Lewis's House",
    sky: 0xbfe0ff, ground: 0x5f8f3a, hemiI: 2.4, sun: 0xfff2d6, sunI: 2.0, sunPos: [6, 12, -8], ambient: 0.45,
    start: { x: 0.5, z: 1.1, yaw: 0.55 },
    board: { x: GX0 - 0.12, y: 1.38, z: -6.6, ry: -Math.PI / 2 },
    startFood: ['can', 'burger', 'hotdog', 'can', 'chicken', 'sausageroll', 'can', 'burger', 'crisps', 'cookie', 'pizza', 'can'],
    spotCount: 30,
  });
}

function skyTex() {
  return canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2f7ad8'); gr.addColorStop(0.5, '#7ec0f0'); gr.addColorStop(0.62, '#d8eefc'); gr.addColorStop(1, '#bfe0f0');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const sun = g.createRadialGradient(380, 70, 4, 380, 70, 50); sun.addColorStop(0, 'rgba(255,255,230,1)'); sun.addColorStop(0.3, 'rgba(255,250,200,0.8)'); sun.addColorStop(1, 'rgba(255,250,200,0)'); g.fillStyle = sun; g.fillRect(320, 10, 120, 120);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [x, y, s] of [[60, 60, 1], [180, 90, 0.8], [270, 50, 1.1], [450, 110, 0.7], [120, 120, 0.6]]) for (const [dx, dy, r] of [[0, 0, 16], [16, -6, 18], [34, 0, 14], [18, 6, 15]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, 7); g.fill(); }
  });
}
function grassTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5a9a36'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { g.fillStyle = ['#4e8a2e', '#66a83e', '#5a9a36', '#72b048'][i % 4]; g.fillRect(Math.random() * w, Math.random() * h, 2, 4); }
    for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x, 0, 32, h); }   // mowing stripes
  });
}
