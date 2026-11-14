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
import { DartGame, dartboardTex, chalkCanvas } from '../darts.js';
import { PingPong } from '../pingpong.js';
import { Sky } from 'three/addons/objects/Sky.js';
const _skyV = new THREE.Vector3();
import { part, sph, cyl } from '../geo.js';

export const BBQ_SPOT = { x: -4.8, z: 0.35 };        // the grill (Ian stands behind it, his back to the house)
export const IAN_SPOT = { x: -4.8, z: 1.2 };
export const IAN_YAW = Math.PI;                      // facing the garden

export function buildGarden(scene) {
  const B = { x0: -6.5, x1: 6.5, z0: -16.5, z1: 12 };
  const k = new Kit(scene, { ...B, y1: 8 });
  const sceneStart = scene.children.length, smooth = [];        // (see stretchGarden below)
  const mark = () => k.parts.length;
  const R = (x0, z0, x1, z1, h, y, color, opts) => k.box(Math.abs(x1 - x0), h, Math.abs(z1 - z0), (x0 + x1) / 2, y ?? h / 2, (z0 + z1) / 2, color, opts);
  const WOOD = 0x8a5a32, DARKWOOD = 0x5a3a20, WHITE = 0xf4f4f0, PAINT = 0xefe8dc, RENDER = 0xe4ddd0;
  const BRICK = brickTex(), CLAD = woodTex('#86482a'), PINE = woodTex('#d8b07a');
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
  // a real atmosphere (Rayleigh/Mie scattering, sun at the same place as the light) with soft
  // cumulus on a dome above it; the whole sky moves with your head so it's always "at infinity"
  // (and inside the camera's far plane)
  const SUN_DIR = new THREE.Vector3(8, 16, -5).normalize();
  const skyRig = new THREE.Group(); scene.add(skyRig);
  const sky = new Sky(); sky.scale.setScalar(30); sky.renderOrder = -100; sky.frustumCulled = false;
  sky.material.uniforms.turbidity.value = 2.2; sky.material.uniforms.rayleigh.value = 2.4;
  sky.material.uniforms.mieCoefficient.value = 0.003; sky.material.uniforms.mieDirectionalG.value = 0.82; sky.material.uniforms.sunPosition.value.copy(SUN_DIR);
  // (the scattering model is in real-world brightness; tone it down to sit under the game's exposure)
  sky.material.fragmentShader = sky.material.fragmentShader.replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb *= 0.42;\n#include <tonemapping_fragment>');
  skyRig.add(sky);
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(34, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.52), new THREE.MeshBasicMaterial({ map: cloudTex(), side: THREE.BackSide, transparent: true, depthWrite: false, fog: false }));
  clouds.renderOrder = -98; clouds.frustumCulled = false; skyRig.add(clouds);
  sky.onBeforeRender = (r, sc, cam) => { _skyV.setFromMatrixPosition(cam.matrixWorld); if (skyRig.position.distanceToSquared(_skyV) > 1e-6) { skyRig.position.copy(_skyV); skyRig.updateMatrixWorld(true); } };
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
  let sm = mark();
  for (const [x, z, r] of [[0.45, -3.45, 0.24], [0.05, -4.4, 0.22], [-0.85, -4.5, 0.2], [-0.6, -5.4, 0.23], [-1.2, -6.0, 0.2], [-0.3, -7.55, 0.24], [0.75, -8.3, 0.22], [1.0, -9.3, 0.23], [1.9, -9.8, 0.21], [1.6, -10.5, 0.22]]) {
    k.cyl(r, r + 0.02, 0.05, x, 0.025, z, [0xb8b4aa, 0xa8a49a, 0xc4c0b6][Math.floor(rnd() * 3)], 12);
  }  smooth.push([sm, mark()]);

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

  // the stretch: F moves a point (two 1.5m cuts in the lawn), Gs spreads the lawn evenly
  const CUT1 = -5.8, CUT2 = -10.0, GAP = 1.5;
  function F(z) { return z >= CUT1 ? z : z >= CUT2 ? z - GAP : z - 2 * GAP; }
  function Gs(z) { return z >= -0.5 ? z : z >= -11 ? -0.5 + (z + 0.5) * (10.5 + 2 * GAP) / 10.5 : z - 2 * GAP; }
  function stretchGarden() {
    const box = new THREE.Box3(), crosses = (a, b) => (a < CUT1 && b > CUT1) || (a < CUT2 && b > CUT2);
    const stretchy = (bb) => { const zx = bb.max.z - bb.min.z, xx = bb.max.x - bb.min.x, yy = bb.max.y - bb.min.y; return crosses(bb.min.z, bb.max.z) && (zx > 1.6 * xx || yy < 0.08 || xx < 0.35); };
    const warpGeo = (g) => { const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) pa.setZ(i, F(pa.getZ(i))); pa.needsUpdate = true; g.computeBoundingBox(); g.computeBoundingSphere(); };
    const shiftGeo = (g, dz) => { if (dz) g.translate(0, 0, dz); };
    const inSmooth = (i) => smooth.some(([a, b]) => i >= a && i < b);
    k.parts.forEach((g, i) => {
      g.computeBoundingBox(); const bb = g.boundingBox, cz = (bb.min.z + bb.max.z) / 2;
      if (inSmooth(i)) shiftGeo(g, Gs(cz) - cz); else if (stretchy(bb)) warpGeo(g); else shiftGeo(g, F(cz) - cz);
    });
    for (const o of scene.children.slice(sceneStart)) {
      if (!o.isMesh && !o.isSprite) continue;
      if (o === ground) continue;
      o.updateMatrixWorld(true); box.setFromObject(o);
      const cz = (box.min.z + box.max.z) / 2;
      if (o.isMesh && stretchy(box)) { o.geometry = o.geometry.clone().applyMatrix4(o.matrixWorld); warpGeo(o.geometry); o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); }
      else o.position.z += F(cz) - cz;
    }
    for (const list of [k.colliders]) for (const c of list) { const cz = (c.min.z + c.max.z) / 2; if (crosses(c.min.z, c.max.z) && c.max.z - c.min.z > 1) { c.min.z = F(c.min.z); c.max.z = F(c.max.z); } else { const d = F(cz) - cz; c.min.z += d; c.max.z += d; } }
    for (const b of k.blockers) { const cz = (b.z0 + b.z1) / 2; if (crosses(b.z0, b.z1) && b.z1 - b.z0 > 1) { b.z0 = F(b.z0); b.z1 = F(b.z1); } else { const d = F(cz) - cz; b.z0 += d; b.z1 += d; } }
    for (const p of k.spawns) p.z = F(p.z);
    for (const L of k.lights || []) L.l.position.z = F(L.l.position.z);
    for (const [col, list] of k.lamps || []) for (const l of list) l[2] = col === 0xfff8e0 ? Gs(l[2]) : F(l[2]);    // (the solar lights follow the stones)
    for (const gb of [k.halos, k.pools]) if (gb) for (const l of gb.list) l[2] = F(l[2]);
    for (const b of flutter) b.userData.cz = F(b.userData.cz);
    k.bounds.z0 = F(B.z0);
  }

  // ---- real-looking plants: leafy cards (painted leaves with see-through gaps), two-sided, lit from above ----
  function plantsAndWillow() {
    const mats = {}, quads = {};
    const mat = (key, tex) => { if (!mats[key]) { const m = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.45, side: THREE.FrontSide });
      m.userData.depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.45 }); mats[key] = m; quads[key] = []; } return key; };
    const LEAFY = mat('leafy', foliageTex(0)), BLOOM = mat('bloom', foliageTex(1)), CLEM = mat('clem', foliageTex(2)), ROSE = mat('rose', foliageTex(3)), WIL = mat('willow', foliageTex(4)), STR = mat('strand', strandTex());
    // a card: centre, width, height, yaw (which way it faces), pitch, roll
    const card = (key, x, y, z, w, h, yaw = 0, pitch = 0, roll = 0) => quads[key].push({ x, y, z, w, h, yaw, pitch, roll });
    // --- the left fence: climbers flat up the fence, shrubs at the foot, never more than a foot out ---
    const FX = B.x0 + 0.05;
    for (const [z0, z1] of [[F(-16.35), -2.95], [-1.85, 1.3]]) {
      for (let z = z0 + 0.15; z < z1 - 0.1; z += 0.22) {
        const h = 0.6 + rnd() * 0.8, y = 0.25 + rnd() * (1.75 - h / 2);
        card(rnd() < 0.3 ? BLOOM : LEAFY, FX + 0.02 + rnd() * 0.05, Math.min(1.85 - h / 2, y + h / 2), z, 0.55 + rnd() * 0.4, h, Math.PI / 2 + (rnd() - 0.5) * 0.4, 0, (rnd() - 0.5) * 0.5);
        if (rnd() < 0.55) card(LEAFY, FX + 0.08 + rnd() * 0.06, 0.6 + rnd() * 1.1, z + 0.1, 0.45 + rnd() * 0.3, 0.5 + rnd() * 0.3, Math.PI / 2 + (rnd() - 0.5) * 0.7, 0, rnd() * 3);
      }
      for (let z = z0 + 0.3; z < z1 - 0.2; z += 0.55 + rnd() * 0.3) {          // low shrubs: three crossed cards each
        const h = 0.45 + rnd() * 0.4, key = rnd() < 0.35 ? BLOOM : LEAFY;
        for (let c = 0; c < 3; c++) card(key, FX + 0.18, h / 2, z, 0.5 + rnd() * 0.15, h, Math.PI / 2 + c * 1.05 + rnd() * 0.3, 0, 0);
      }
    }
    // --- the trellis at the halfway line: clematis and roses all over it ---
    const TZ0f = F(-8.5), PZf = F(-6.6);
    for (let i = 0; i < 26; i++) { const z = TZ0f + rnd() * (PZf - TZ0f), y = 0.6 + rnd() * 1.7; card(i % 3 === 0 ? ROSE : CLEM, B.x0 + 0.2 + rnd() * 0.04, y, z, 0.5 + rnd() * 0.3, 0.5 + rnd() * 0.3, Math.PI / 2, 0, rnd() * 3); }
    // --- the willow: one tree, trunk just over the fence, limbs arching into a crown that weeps over the corner ---
    const T = { x: B.x0 - 0.7, z: F(-12.0) }, C = { x: B.x0 + 0.25, y: 4.5, z: F(-12.0) }, RX = 2.1, RY = 1.0, RZ = 2.5;
    const BARK = 0x5e4a38;
    const limb = (a, b, r0, r1) => { const d = new THREE.Vector3().subVectors(b, a), L = d.length(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), e = new THREE.Euler().setFromQuaternion(q);
      k.parts.push(part(cyl(r1, r0, L, 8), BARK, [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2], [e.x, e.y, e.z])); };
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    limb(V(T.x, 0, T.z), V(T.x + 0.15, 2.6, T.z), 0.34, 0.26);                       // trunk (with a little lean toward the garden)
    k.cyl(0.42, 0.5, 0.25, T.x, 0.12, T.z, BARK, 10);                               // root flare
    const fork = V(T.x + 0.15, 2.6, T.z);
    const tips = [];
    for (let i = 0; i < 6; i++) {
      const a = -0.9 + i * 0.36 + (rnd() - 0.5) * 0.2, reach = 1.6 + rnd() * 0.9;
      const mid = V(fork.x + Math.cos(a) * reach * 0.5 + 0.3, 3.6 + rnd() * 0.4, fork.z + Math.sin(a) * reach * 0.8);
      const tip = V(fork.x + Math.cos(a) * reach + 0.6, 4.3 + rnd() * 0.6, fork.z + Math.sin(a) * reach * 1.4);
      limb(fork, mid, 0.17, 0.11); limb(mid, tip, 0.11, 0.05); tips.push(tip, mid);
      for (let j = 0; j < 3; j++) { const tw = V(tip.x + (rnd() - 0.3) * 0.9, tip.y + 0.2 + rnd() * 0.5, tip.z + (rnd() - 0.5) * 0.9); limb(tip, tw, 0.05, 0.02); tips.push(tw); }
    }
    // crown: leafy cards on the dome, thickest round the branch tips
    for (let i = 0; i < 170; i++) {
      const th = rnd() * Math.PI * 2, ph = Math.acos(1 - rnd() * 1.15), r = 0.85 + rnd() * 0.2;
      const x = C.x + Math.sin(ph) * Math.cos(th) * RX * r, y = C.y + Math.cos(ph) * RY * r, z = C.z + Math.sin(ph) * Math.sin(th) * RZ * r;
      card(WIL, x, y, z, 0.9 + rnd() * 0.5, 0.8 + rnd() * 0.4, rnd() * 6.28, (rnd() - 0.5) * 1.2, rnd() * 6.28);
    }
    for (const t of tips) for (let j = 0; j < 3; j++) card(WIL, t.x + (rnd() - 0.5) * 0.5, t.y + (rnd() - 0.5) * 0.4, t.z + (rnd() - 0.5) * 0.5, 0.8, 0.7, rnd() * 6.28, (rnd() - 0.5), rnd() * 6.28);
    // the weeping strands: long thin curtains hanging from the underside of the crown
    const cabinZ0 = F(-16.2), cabinZ1 = F(-11), cabinX0 = -4.6;
    for (let i = 0; i < 330; i++) {
      const th = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 1.02;
      const x = C.x + Math.cos(th) * RX * rr, z = C.z + Math.sin(th) * RZ * rr;
      const top = C.y - RY * Math.sqrt(Math.max(0, 1 - rr * rr)) * 0.7 + 0.15;
      const floor = x > cabinX0 && z > cabinZ0 && z < cabinZ1 ? 2.75 : 2.1;
      const len = Math.min(top - floor, 1.3 + rnd() * 2.0); if (len < 0.4) continue;
      card(STR, x, top - len / 2, z, 0.16 + rnd() * 0.08, len, rnd() * 6.28, 0, (rnd() - 0.5) * 0.08);
    }
    // build one mesh per leaf texture: each card two-sided (front and back triangles), normals lean up so the leaves catch the sky
    const pos = [], nrm = [], uvs = [], m4 = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion(), vs = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    for (const key in quads) {
      if (!quads[key].length) continue;
      pos.length = nrm.length = uvs.length = 0;
      for (const c of quads[key]) {
        m4.compose(vs.set(c.x, c.y, c.z), q.setFromEuler(e.set(c.pitch, c.yaw, c.roll, 'YXZ')), one);
        const P = [[-c.w / 2, -c.h / 2], [c.w / 2, -c.h / 2], [c.w / 2, c.h / 2], [-c.w / 2, c.h / 2]].map(([a, b]) => new THREE.Vector3(a, b, 0).applyMatrix4(m4));
        const fn = new THREE.Vector3(0, 0, 1).applyQuaternion(q), up = new THREE.Vector3(0, 1, 0);
        const UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
        for (const [tri, flip] of [[[0, 1, 2, 0, 2, 3], 1], [[0, 2, 1, 0, 3, 2], -1]]) {
          const n = fn.clone().multiplyScalar(0.35 * flip).add(up).normalize();
          for (const vi of tri) { pos.push(P[vi].x, P[vi].y, P[vi].z); nrm.push(n.x, n.y, n.z); uvs.push(UV[vi][0], UV[vi][1]); }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      const mesh = new THREE.Mesh(g, mats[key]); mesh.customDepthMaterial = mats[key].userData.depth; mesh.userData.foliage = true; scene.add(mesh);
    }
  }

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
  wallRun('x', 6.4, -0.6, 3.4, CEIL, [], { color: PAINT, t: 0.12 });
  wallRun('z', 1.15, 6.4, HZ1, CEIL, [[6.6, 7.5, 0, 2.05]], { color: PAINT, t: 0.12 });              // living room | hallway (behind the L sofa), doorway at the far end
  k.lamp(2.3, 2.45, 9.0, 0xfff4e0, 0.1);                                                              // hall light                                // kitchen | living room: solid (into the kitchen via the dining room)
  // --- kitchen: worktops round the side and back, sink, fridge, island bar with stools
  const TOP_C = 0x2a2a2e, UNIT = 0xf2f2ee;
  R(3.9, 2.15, 4.4, 6.3, 0.9, 0.45, UNIT, { block: true }); R(3.86, 2.12, 4.42, 6.32, 0.04, 0.92, TOP_C, { collide: true });
  R(1.35, 5.75, 3.86, 6.33, 0.9, 0.45, UNIT, { block: true }); R(1.33, 5.72, 3.86, 6.35, 0.04, 0.92, TOP_C, { collide: true });
  R(3.95, 4.7, 4.35, 5.4, 0.03, 0.935, 0x9aa0a8); k.cyl(0.02, 0.02, 0.3, 4.35, 1.08, 5.05, 0xc8c8c8, 6);   // sink + tap
  R(-0.5, 5.7, 0.4, 6.33, 1.9, 0.95, 0xe8e8ea, { collide: true, block: true }); R(0.3, 5.68, 0.32, 5.7, 0.8, 1.2, 0x888888);   // big fridge (leaves the way through to the living room clear)
  k.label('LEWY\'S PROTEIN SHAKES. HANDS OFF.', 0.5, 0.22, [-0.05, 1.5, 5.68], [0, Math.PI, 0], { bg: '#fffbe8', fg: '#c62828', border: null, size: 34 });
  R(1.0, 2.5, 3.3, 4.1, 0.9, 0.45, 0x3a3a40, { block: true }); R(0.98, 2.52, 3.32, 4.15, 0.05, 0.945, 0xf0f0f0, { collide: true });   // the island runs straight off the counter under the window (a peninsula), no stools
  R(1.0, 2.15, 3.8, 2.5, 0.9, 0.45, UNIT, { block: true }); R(0.98, 2.13, 3.82, 2.52, 0.04, 0.92, TOP_C, { collide: true });     // under the window
  k.cyl(0.13, 0.11, 0.25, 3.0, 1.06, 2.32, 0x8a8a8a, 12);                                                                         // kettle
  for (const [x, z] of [[1.6, 3.7], [2.5, 3.2], [3.0, 3.8]]) k.spawns.push(new THREE.Vector3(x, 1.06, z));
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
  // a short wall off the end of the dining/kitchen wall into the room, with the armchair backed against it, facing the TV
  wallRun('z', -0.6, 6.4, 8.7, CEIL, [], { color: PAINT, t: 0.12 });
  { const ax = -1.12, az = 8.15, ry = Math.atan2(-(-5.9 - ax), -(11.4 - az)), c = Math.cos(ry), s = Math.sin(ry), COL = 0x6a3a2a, CUSH = 0x8a5a3a;
    const at = (lx, lz) => [ax + lx * c + lz * s, az - lx * s + lz * c];
    const rb = (w, h, d, lx, y, lz, col) => { const [px, pz] = at(lx, lz); k.box(w, h, d, px, y, pz, col, { rot: [0, ry, 0] }); };
    rb(0.8, 0.4, 0.8, 0, 0.2, 0, COL); rb(0.62, 0.12, 0.6, 0, 0.46, -0.05, CUSH);                 // base + seat cushion
    rb(0.8, 0.55, 0.18, 0, 0.67, 0.31, COL); rb(0.6, 0.4, 0.08, 0, 0.66, 0.2, CUSH);              // back
    for (const sx of [-1, 1]) rb(0.13, 0.25, 0.8, sx * 0.335, 0.52, 0, COL);                     // arms
    k.blockers.push({ x0: ax - 0.45, x1: ax + 0.45, z0: az - 0.45, z1: az + 0.45, y1: 0.8 });
    k.spawns.push(new THREE.Vector3(ax, 0.6, az));
  }
  R(-6.4, 8.2, -5.8, 9.0, 0.6, 0.3, 0x5a3a22, { block: true, collide: true }); k.spawns.push(new THREE.Vector3(-6.1, 0.66, 8.6));   // side table
  k.box(1.3, 0.75, 0.06, -5.9, 1.3, 11.4, 0x111111, { rot: [0, Math.PI * 0.75, 0] });         // corner TV
  k.box(1.22, 0.68, 0.02, -5.88, 1.3, 11.38, 0x2a5aa8, { rot: [0, Math.PI * 0.75, 0] });
  R(-6.4, 11.1, -5.6, 11.9, 0.5, 0.25, 0x3a2a1a, { block: true });
  for (let i = 0; i < 13; i++) R(3.4, 10.8 - (i + 1) * 0.34, 4.45, 10.8 - i * 0.34, 0.2 * (i + 1), 0.1 * (i + 1), i % 2 ? 0xd8d0c0 : 0xc8bfae, { collide: true });   // stairs up
  k.blockers.push({ x0: 3.4, x1: HX1, z0: 6.4, z1: 10.8, y1: 2.6 });
  // the banister follows the stairs up: newel post at the bottom, a sloped handrail, spindles off every step
  { const bx = 3.37, rise = (z) => 0.2 * (10.8 - z) / 0.34, zTop = 10.8 - 2.6 * 0.34 / 0.2 * (1.55 / 2.6);
    const y1 = rise(10.8) + 0.92, y2 = rise(zTop) + 0.92, dz = 10.8 - zTop, dy = y2 - y1;
    k.box(0.07, 0.06, Math.hypot(dz, dy), bx, (y1 + y2) / 2, (10.8 + zTop) / 2, DARKWOOD, { rot: [Math.atan2(dy, dz), 0, 0] });   // handrail
    k.box(0.1, 1.15, 0.1, bx, 0.575, 10.85, DARKWOOD, { block: true }); k.box(0.13, 0.06, 0.13, bx, 1.18, 10.85, DARKWOOD);
    for (let z = 10.7; z > zTop + 0.05; z -= 0.17) { const yb = rise(z - 0.17) + 0.2, yt = rise(z) + 0.9; k.box(0.03, yt - yb, 0.03, bx, (yb + yt) / 2, z, 0xf0ece4); }
  }
  R(1.7, 11.3, 2.5, 11.9, 0.01, 0.006, 0x3a2a1a);                                                // doormat
  k.light(-3.2, 2.35, 5.2, 0xfff0d8, 3, 8); k.light(-1.9, 2.35, 9.4, 0xfff0d8, 3, 8);
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
  // a tiny round bistro table against the house wall, one rusty black garden chair
  { const tx = 3.05, tz = 1.5, IRON = 0x1c1c1c, RUST = [0x6a3a1c, 0x7a4a24, 0x5a2e14];
    k.cyl(0.3, 0.3, 0.02, tx, 0.72, tz, IRON, 20, { collide: true }); k.cyl(0.31, 0.31, 0.015, tx, 0.705, tz, 0x2a2a2a, 20);
    k.cyl(0.02, 0.025, 0.7, tx, 0.36, tz, IRON, 8);
    for (let i = 0; i < 3; i++) { const a = i * 2.094; k.box(0.025, 0.02, 0.32, tx + Math.sin(a) * 0.14, 0.03, tz + Math.cos(a) * 0.14, IRON, { rot: [0, a, 0] }); }
    for (let i = 0; i < 7; i++) { const a = rnd() * 6.28, r = rnd() * 0.27; k.cyl(0.02 + rnd() * 0.03, 0.02 + rnd() * 0.03, 0.003, tx + Math.cos(a) * r, 0.731, tz + Math.sin(a) * r, RUST[i % 3], 7); }
    k.blockers.push({ x0: tx - 0.3, x1: tx + 0.3, z0: tz - 0.3, z1: tz + 0.3, y1: 0.73 });
    k.spawns.push(new THREE.Vector3(tx, 0.8, tz));
    // the chair, turned in to the table
    const cx = tx - 0.62, cz = tz - 0.12, ry = -Math.PI / 2 - 0.25, c = Math.cos(ry), s = Math.sin(ry);
    const at = (lx, lz) => [cx + lx * c + lz * s, cz - lx * s + lz * c];
    const rb = (w, h, d, lx, y, lz, col) => { const [px, pz] = at(lx, lz); k.box(w, h, d, px, y, pz, col, { rot: [0, ry, 0] }); };
    k.cyl(0.2, 0.2, 0.02, cx, 0.45, cz, IRON, 16);
    for (let i = -3; i <= 3; i++) rb(0.012, 0.004, 0.36, i * 0.05, 0.462, 0, 0x2a2a2a);              // seat slats
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) rb(0.02, 0.45, 0.02, a * 0.15, 0.225, b * 0.15, IRON);
    for (const lx of [-0.16, 0.16]) rb(0.02, 0.5, 0.02, lx, 0.7, 0.17, IRON);                        // back uprights
    rb(0.34, 0.03, 0.02, 0, 0.94, 0.17, IRON); rb(0.34, 0.02, 0.02, 0, 0.6, 0.17, IRON);
    for (let i = -2; i <= 2; i++) rb(0.012, 0.32, 0.012, i * 0.06, 0.77, 0.17, IRON);               // back bars
    for (let i = 0; i < 12; i++) rb(0.014 + rnd() * 0.012, 0.012 + rnd() * 0.03, 0.014, [-0.16, 0.16, -0.06, 0, 0.06, 0.12][i % 6], 0.35 + rnd() * 0.58, 0.17, RUST[i % 3]);   // rust creeping up the bars
    k.blockers.push({ x0: cx - 0.22, x1: cx + 0.22, z0: cz - 0.22, z1: cz + 0.22, y1: 0.95 });
  }
  R(5.4, 1.2, 6.1, 1.7, 0.45, 0.225, 0x1e5aa8, { collide: true, block: true }); R(5.38, 1.18, 6.12, 1.72, 0.06, 0.48, WHITE);
  k.spawns.push(new THREE.Vector3(5.6, 0.6, 1.45), new THREE.Vector3(5.9, 0.6, 1.45));
  for (const x of [-6.1, -2.3, -0.4, 1.5]) { k.cyl(0.22, 0.16, 0.42, x, 0.21, 1.72, 0xb05a32, 12); k.cyl(0.05, 0.36, 0.55, x, 0.7, 1.72, 0x3f8a2e, 10); }

  // ======================================================== THE GARAGE + OUTDOOR TOILET (x 2.1..6.5, z -5.6..-0.3), the little green shed behind
  const GX0 = 2.1, GX1 = B.x1, GZ0 = -5.6, GZ1 = -0.3, GH = 2.5;
  k.floor(GX0, GZ0, GX1, -2.4, tileTex('#8a8a86', '#84847f', '#6a6a66', 128), 0.007, 2);
  k.floor(GX0, -2.4, GX1, GZ1, tileTex('#5e5a54', '#57534d', '#3e3b37', 128), 0.007, 1.6);         // the outside loo: old stained concrete
  wallRun('z', GX0, GZ0, GZ1, GH, [[-4.2, -3.2, 0, 2.0]], { color: RENDER, inColor: 0xd8d4cc, inSign: 1 });
  wallRun('x', GZ0, GX0, GX1, GH, [[4.4, 5.6, 1.1, 1.9]], { color: RENDER, inColor: 0xd8d4cc, inSign: 1 });
  wallRun('x', GZ1, GX0, GX1, GH, [[5.45, 6.15, 1.3, 1.85]], { color: RENDER, inColor: 0xd8d4cc, inSign: -1 });
  wallRun('z', GX1 - 0.1, GZ0, GZ1, GH, [], { color: RENDER, inColor: 0xd8d4cc, inSign: -1 });
  wallRun('x', -2.4, GX0, GX1, GH, [[2.6, 3.4, 0, 2.0]], { color: RENDER, t: 0.12 });                // garage | toilet (the loo's only door is in here)
  glaze('x', GZ0, 4.4, 5.6, 1.1, 1.9);
  R(GX0 - 0.15, GZ0 - 0.15, GX1 + 0.05, GZ1 + 0.15, 0.12, GH + 0.06, 0x3a3a3a);                         // flat felt roof
  { const gc = new THREE.Mesh(new THREE.PlaneGeometry(GX1 - GX0, GZ1 - GZ0), new THREE.MeshBasicMaterial({ color: 0xcfcac0 })); gc.rotation.x = Math.PI / 2; gc.position.set((GX0 + GX1) / 2, GH - 0.005, (GZ0 + GZ1) / 2); scene.add(gc); }
  leaf('z', GX0, -4.2, -3.2, 1, 0x2e5a3a); leaf('x', -2.4, 2.6, 3.4, 1, 0x5a4a3a);
  k.label('GARAGE', 0.6, 0.16, [GX0 - 0.11, 2.2, -3.7], [0, -Math.PI / 2, 0], { bg: '#2e5a3a', fg: '#fff', border: null, size: 44 });
  k.label('BOG', 0.4, 0.16, [3.0, 2.2, -2.47], [0, Math.PI, 0], { bg: '#fff', fg: '#111', border: '#111', size: 44 });
  // the mess: workbench, boxes, tyres, a bike, paint tins, crates, an old telly
  R(5.8, -5.4, 6.35, -3.4, 0.9, 0.45, 0x7a5a3a, { block: true, collide: true });
  for (let i = 0; i < 6; i++) k.box(0.05 + rnd() * 0.1, 0.04, 0.2 + rnd() * 0.2, 6.0 + rnd() * 0.2, 0.93, -5.2 + i * 0.3, [0xd32f2f, 0x555555, 0xffd400, 0x1e5aa8][i % 4], { rot: [0, rnd() * 3, 0] });
  k.box(0.04, 0.9, 1.8, 6.36, 1.6, -4.4, 0x9a7a5a);                                                   // pegboard
  k.spawns.push(new THREE.Vector3(6.0, 1.0, -3.8), new THREE.Vector3(6.05, 1.0, -4.9));
  for (const [x, z, n] of [[2.65, -5.2, 3], [4.15, -5.25, 1]]) for (let i = 0; i < n; i++) k.box(0.55 + rnd() * 0.2, 0.42, 0.5 + rnd() * 0.15, x + (rnd() - 0.5) * 0.08, 0.21 + i * 0.42, z, [0xb8925a, 0xa8844e, 0xc8a26a][i % 3], { block: i === 0, collide: i === n - 1, rot: [0, (rnd() - 0.5) * 0.3, 0] });
  for (let i = 0; i < 3; i++) { k.cyl(0.32, 0.32, 0.2, 5.25, 0.1 + i * 0.2, -2.95, 0x1a1a1a, 14, { block: i === 0 }); k.cyl(0.18, 0.18, 0.21, 5.25, 0.1 + i * 0.2, -2.95, 0x3a3a3a, 10); }
  k.box(0.04, 0.66, 0.66, 2.55, 0.36, -4.85, 0x111111, { rot: [0, 0, 0.1] }); k.box(0.05, 0.05, 0.6, 2.58, 0.68, -4.55, 0xd32f2f);   // a bike wheel and frame by the door
  for (let i = 0; i < 6; i++) k.cyl(0.11, 0.11, 0.22, 3.3 + (i % 3) * 0.25, 0.11 + Math.floor(i / 3) * 0.22, -5.25 + (i % 2) * 0.05, [0xffffff, 0x2a8ae0, 0xd32f2f][i % 3], 10);   // paint tins
  for (let i = 0; i < 3; i++) R(4.0 + i * 0.05, -3.1, 4.5 + i * 0.05, -2.7, 0.28, 0.14 + i * 0.28, [0xffd400, 0x1e5aa8, 0xd32f2f][i]);   // beer crates
  R(4.7, -5.5, 5.5, -4.95, 0.55, 0.275, 0x2a2a2a, { block: true }); k.box(0.7, 0.42, 0.02, 5.1, 0.3, -4.94, 0x3a4a5a);   // an old telly on the floor
  k.light(4.2, 2.3, -4.0, 0xfff0d0, 2.5, 6); k.lamp(4.2, 2.42, -4.0, 0xffffff, 0.1);
  // the little green shed behind the garage: sage clapboard, apex felt roof, a dusty window
  { const SX0 = 4.25, SX1 = 6.4, SZ0 = -8.25, SZ1 = -5.95, EAVE = 1.95, RIDGE = 2.45;
    const SHED = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#8fb3a0'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, y + 28, w, 4); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, y, w, 3); }
      for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},0.04)`; g.fillRect(Math.random() * w, Math.random() * h, 6, 2); }
    });
    k.texBox(SX1 - SX0, EAVE, SZ1 - SZ0, (SX0 + SX1) / 2, EAVE / 2, (SZ0 + SZ1) / 2, SHED, { tile: 1.6, collide: true, block: true });
    k.box(SX1 - SX0 + 0.04, 0.12, SZ1 - SZ0 + 0.04, (SX0 + SX1) / 2, 0.06, (SZ0 + SZ1) / 2, 0x6a7a6a);   // weathered bottom board
    // gable ends
    const gs = new THREE.Shape([new THREE.Vector2(-(SX1 - SX0) / 2, 0), new THREE.Vector2((SX1 - SX0) / 2, 0), new THREE.Vector2(0, RIDGE - EAVE)]);
    for (const z of [SZ0, SZ1]) { const m = new THREE.Mesh(new THREE.ShapeGeometry(gs), new THREE.MeshLambertMaterial({ color: 0x8fb3a0, side: THREE.DoubleSide })); m.position.set((SX0 + SX1) / 2, EAVE, z); scene.add(m); m.castShadow = m.receiveShadow = true; }
    // the roof: grey-green felt, overhanging, with a fascia board
    const half = (SX1 - SX0) / 2 + 0.15, ang = Math.atan2(RIDGE - EAVE, (SX1 - SX0) / 2), sl = Math.hypot(half, (RIDGE - EAVE) * half / ((SX1 - SX0) / 2));
    for (const s of [-1, 1]) k.box(sl, 0.06, SZ1 - SZ0 + 0.3, (SX0 + SX1) / 2 + s * sl / 2 * Math.cos(ang), (EAVE + RIDGE) / 2 + 0.02, (SZ0 + SZ1) / 2, 0x55605a, { rot: [0, 0, -s * ang] });
    for (const z of [SZ0 - 0.15, SZ1 + 0.15]) for (const s of [-1, 1]) k.box(sl, 0.12, 0.03, (SX0 + SX1) / 2 + s * sl / 2 * Math.cos(ang), (EAVE + RIDGE) / 2 - 0.04, z, 0x7fa390, { rot: [0, 0, -s * ang] });
    // window on the garden side (brown frame, dark dusty glass) and a door on the back gable
    k.box(0.02, 0.72, 1.22, SX0 - 0.01, 1.45, (SZ0 + SZ1) / 2 + 0.25, 0x8a5a32);
    k.box(0.02, 0.62, 1.1, SX0 - 0.02, 1.45, (SZ0 + SZ1) / 2 + 0.25, 0x2a2420);
    k.box(0.04, 0.03, 1.25, SX0 - 0.03, 1.08, (SZ0 + SZ1) / 2 + 0.25, 0x8fb3a0);
    k.box(0.75, 1.75, 0.02, SX0 + 0.75, 0.9, SZ0 - 0.01, 0x84a894); k.cyl(0.02, 0.02, 0.06, SX0 + 1.0, 0.95, SZ0 - 0.04, 0x222222, 6);
    for (const y of [0.35, 1.45]) k.box(0.7, 0.04, 0.02, SX0 + 0.75, y, SZ0 - 0.025, 0x333333);     // hinges
  }
  // the outside toilet: grubby walls, a bare bulb, an old high-level cistern with a pull chain,
  // a ladder stood behind the loo, and a frosted window opposite
  { const GRIME = 0x77716a, DIRT = 0x5c5750;
    k.box(GX1 - 0.1 - GX0 - 0.1, GH, 0.01, (GX0 + GX1 - 0.1 + 0.1) / 2, GH / 2, -2.4 + 0.067, GRIME);      // inner faces, dark
    k.box(0.01, GH, 2.1, GX0 + 0.113, GH / 2, -1.35, GRIME); k.box(0.01, GH, 2.1, GX1 - 0.213, GH / 2, -1.35, GRIME);
    for (const [a, b] of [[GX0 + 0.1, 5.45], [6.15, GX1 - 0.2]]) k.box(b - a, GH, 0.01, (a + b) / 2, GH / 2, GZ1 - 0.113, GRIME);
    k.box(0.7, 1.3, 0.01, 5.8, 0.65, GZ1 - 0.113, GRIME); k.box(0.7, GH - 1.85, 0.01, 5.8, (GH + 1.85) / 2, GZ1 - 0.113, GRIME);
    for (let i = 0; i < 26; i++) k.box(0.1 + rnd() * 0.4, 0.05 + rnd() * 0.3, 0.005, GX0 + 0.3 + rnd() * 3.8, 0.1 + rnd() * 2.2, -2.4 + 0.073, [DIRT, 0x6a5e48, 0x4e4a44][i % 3]);   // damp patches
    const lc = new THREE.Mesh(new THREE.PlaneGeometry(GX1 - GX0 - 0.2, 2.1), new THREE.MeshBasicMaterial({ color: 0x4a4740 }));
    lc.rotation.x = Math.PI / 2; lc.position.set((GX0 + GX1 - 0.1) / 2, GH - 0.012, -1.35); scene.add(lc);
    // frosted window (you can't see through it), opposite the loo
    const fw = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.55), new THREE.MeshBasicMaterial({ map: frostedTex(), color: 0xc8d0c8 })); fw.position.set(5.8, 1.575, GZ1 - 0.02); fw.rotation.y = Math.PI; scene.add(fw);
    const fw2 = fw.clone(); fw2.rotation.y = 0; fw2.position.z = GZ1 + 0.02; scene.add(fw2);
    for (const [w, h, x, y] of [[0.76, 0.05, 5.8, 1.85], [0.76, 0.05, 5.8, 1.3], [0.05, 0.6, 5.45, 1.575], [0.05, 0.6, 6.15, 1.575]]) for (const z of [GZ1 - 0.09, GZ1 + 0.09]) k.box(w, h, 0.04, x, y, z, 0xd8d0b8);
    // the loo itself: yellowed bowl, wooden seat
    k.cyl(0.2, 0.16, 0.42, 5.95, 0.21, -1.65, 0xd8d0b4, 14, { block: true }); k.cyl(0.22, 0.22, 0.035, 5.95, 0.445, -1.65, 0x6a4a2a, 14); k.cyl(0.13, 0.13, 0.04, 5.95, 0.45, -1.65, 0x2a2420, 12);
    k.box(0.36, 0.5, 0.03, 5.95, 0.72, -1.88, 0x6a4a2a, { rot: [-0.18, 0, 0] });                               // seat lid, up
    // high-level cistern on brackets with the long flush pipe and the pull chain
    k.box(0.46, 0.24, 0.2, 5.95, 2.22, -2.21, 0x2a3a2e); k.box(0.48, 0.03, 0.22, 5.95, 2.35, -2.21, 0x1e2a22);
    for (const x of [5.78, 6.12]) k.box(0.03, 0.03, 0.2, x, 2.08, -2.24, 0x222222);
    k.cyl(0.022, 0.022, 1.7, 5.95, 1.23, -2.28, 0x3a3a36, 8); k.box(0.04, 0.04, 0.42, 5.95, 0.42, -2.07, 0x3a3a36);
    k.box(0.22, 0.02, 0.02, 6.13, 2.13, -2.13, 0x222222);
    for (let i = 0; i < 14; i++) k.box(0.008, 0.045, 0.008, 6.24, 2.1 - i * 0.05, -2.13, 0x8a8a80);         // chain
    k.box(0.04, 0.1, 0.04, 6.24, 1.37, -2.13, 0xe8e0c8);                                                   // pull handle
    // ladder stood up behind the loo, against the wall
    for (const x of [5.62, 6.0]) k.box(0.05, 2.45, 0.04, x, 1.2, -2.18, 0x8a8a8a, { rot: [-0.12, 0, 0] });
    for (let i = 0; i < 7; i++) k.box(0.38, 0.025, 0.03, 5.81, 0.25 + i * 0.3, -2.06 - i * 0.036, 0x7a7a7a);
    // bits and bobs: loo rolls, a bucket, a broom, a cobweb
    for (let i = 0; i < 2; i++) k.cyl(0.055, 0.055, 0.1, 6.25, 0.05 + i * 0.1, -0.6, 0xe8e4d8, 10);
    k.cyl(0.055, 0.055, 0.1, 5.3, 0.055, -0.75, 0xe8e4d8, 10);
    k.cyl(0.14, 0.11, 0.3, 2.5, 0.15, -0.7, 0x2a5a8a, 12); k.box(0.03, 1.3, 0.03, 2.3, 0.65, -0.55, 0x6a4a2a, { rot: [0.15, 0, 0.12] }); k.box(0.28, 0.08, 0.1, 2.31, 0.05, -0.47, 0x3a2a1a);
    for (let i = 0; i < 6; i++) k.box(0.002, 0.002, 0.45, GX1 - 0.35, GH - 0.08 - i * 0.03, -2.15 + i * 0.03, 0xdddddd, { rot: [0, 0.8, 0] });
    k.label('PLEASE DON\'T, RONNIE', 0.5, 0.18, [GX0 + 0.12, 1.6, -1.35], [0, Math.PI / 2, 0], { bg: '#e8e0c8', fg: '#8a1a1a', border: '#8a1a1a', size: 40 });
    k.cyl(0.003, 0.003, 0.3, 4.2, GH - 0.16, -1.35, 0x111111, 4); k.lamp(4.2, GH - 0.34, -1.35, 0xffd890, 0.035);   // bare bulb
  }
  // the wheelbarrow behind the garage
  { const wx = 4.7, wz = -9.3;
    k.box(0.75, 0.32, 1.0, wx, 0.55, wz, 0x2e7d32, { block: true }); k.box(0.65, 0.04, 0.9, wx, 0.7, wz, 0x5a3a20);
    k.cyl(0.2, 0.2, 0.08, wx, 0.2, wz - 0.65, 0x1a1a1a, 12);
    for (const s of [-1, 1]) { k.box(0.04, 0.04, 1.2, wx + s * 0.3, 0.55, wz + 0.5, 0x3a3a3a, { rot: [-0.25, 0, 0] }); k.box(0.04, 0.4, 0.04, wx + s * 0.28, 0.2, wz + 0.25, 0x3a3a3a); } }

  // ======================================================== THE CABIN (x -4.5..5, z -16.2..-11)
  const CX0 = -4.5, CX1 = 5.0, CZ0 = -16.2, CZ1 = -11, CH = 2.4, PART = -0.7;
  k.floor(CX0, CZ0, CX1, CZ1, woodTex('#b08a5a'), 0.008, 1.2);
  // a grey concrete plinth all round the bottom, sticking out a touch
  R(CX0 - 0.12, CZ0 - 0.12, CX1 + 0.12, CZ1 + 0.12, 0.2, 0.1, 0xb4b0a6, { collide: true }); R(CX0 - 0.13, CZ1 + 0.1, CX1 + 0.13, CZ1 + 0.13, 0.02, 0.2, 0xc8c4ba);
  wallRun('x', CZ1, CX0, CX1, CH, [[-3.05, -2.0, 1.05, 1.9], [1.9, 3.5, 0, 2.05]], { tex: CLAD, inColor: 0xb87a50, inSign: -1, t: 0.14 });   // small window (spare room), double doors (lounge)
  wallRun('x', CZ0, CX0, CX1, CH, [], { tex: CLAD, inColor: 0xb87a50, inSign: 1, t: 0.14 });
  wallRun('z', CX0, CZ0, CZ1, CH, [[-14.6, -13.2, 0.9, 1.9]], { tex: CLAD, inColor: 0xb87a50, inSign: 1, t: 0.14 });
  wallRun('z', CX1, CZ0, CZ1, CH, [], { tex: CLAD, inColor: 0xb87a50, inSign: -1, t: 0.14 });
  wallRun('z', PART, CZ0, CZ1, CH, [[-13.0, -12.1, 0, 2.0]], { color: 0xe8d4b0, t: 0.1 });         // spare room | lounge
  glaze('z', CX0, -14.6, -13.2, 0.9, 1.9, 0x3a2a1a);
  // --- the front, as in the photo ---
  const FZ = CZ1 + 0.075, HONEY = 0xb8682a, DKFR = 0x4a2614;
  // the small window: dark-stained frame, two panes (top and bottom), white lace nets behind, a sill
  glaze('x', CZ1, -3.05, -2.0, 1.05, 1.9, DKFR);
  k.box(1.05, 0.04, 0.05, -2.525, 1.475, FZ, DKFR);
  { const lace = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.82), new THREE.MeshLambertMaterial({ map: laceTex(), transparent: true, side: THREE.DoubleSide }));
    lace.position.set(-2.525, 1.47, CZ1 - 0.03); scene.add(lace); }
  // the double doors, flung open flat against the front: honey-varnished, four panes up top, a panel below
  for (const [hx, dir] of [[1.9, -1], [3.5, 1]]) {
    const cx = hx + dir * 0.4, z = FZ + 0.05;
    k.box(0.8, 2.0, 0.04, cx, 1.17, z, HONEY);                                                          // the leaf
    k.box(0.66, 0.8, 0.01, cx, 0.62, z + 0.022, 0xa85a20);                                             // bottom panel
    for (const [w, h, x, y] of [[0.8, 0.06, cx, 1.24], [0.8, 0.06, cx, 2.14], [0.06, 0.9, cx - 0.37, 1.69], [0.06, 0.9, cx + 0.37, 1.69], [0.04, 0.9, cx, 1.69], [0.74, 0.04, cx, 1.69]]) k.box(w, h, 0.03, x, y, z + 0.03, HONEY);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.84), glassMat); gl.position.set(cx, 1.69, z + 0.025); scene.add(gl);
    for (const y of [0.45, 1.85]) k.box(0.12, 0.03, 0.02, hx + dir * 0.06, y, z + 0.03, 0x222222);   // hinges
  }
  k.box(1.7, 0.08, 0.16, 2.7, 2.09, FZ, HONEY); for (const x of [1.87, 3.53]) k.box(0.06, 2.0, 0.16, x, 1.05, FZ, HONEY);   // door frame
  k.box(1.6, 0.04, 0.3, 2.7, 0.21, CZ1 + 0.02, 0x8a6a4a);                                              // threshold
  // white curtains tied back inside the doorway, a doormat
  for (const x of [2.05, 3.35]) { k.box(0.26, 1.95, 0.08, x, 1.05, CZ1 - 0.2, 0xf4f0e6); k.box(0.18, 0.04, 0.1, x, 1.0, CZ1 - 0.2, 0xe8e0d0); }
  k.box(1.1, 0.012, 0.6, 2.7, 0.015, CZ1 - 0.6, 0x9a8a70);
  // paving slabs on the grass just outside the doors
  for (const [x, z] of [[2.25, 0.5], [3.15, 0.5], [2.25, 1.15], [3.15, 1.15], [4.05, 0.5]]) k.box(0.62, 0.04, 0.6, x, 0.02, CZ1 + z, [0xc4bfb4, 0xb8b3a8, 0xcac5ba][Math.floor(rnd() * 3)], { collide: true });
  // black security light up under the eaves, right of the doors
  k.box(0.3, 0.16, 0.12, 4.15, 2.15, FZ + 0.06, 0x2a2a2a); k.box(0.24, 0.1, 0.02, 4.15, 2.13, FZ + 0.125, 0xd8d8c8);
  // a trellis panel and a terracotta pot at the left corner
  for (let i = 0; i < 6; i++) { k.box(0.02, 1.1, 0.02, CX0 - 0.25 - i * 0.1, 0.75, CZ1 + 0.25, 0xd8c8a8, { rot: [0, 0, 0.5] }); k.box(0.02, 1.1, 0.02, CX0 - 0.25 - i * 0.1, 0.75, CZ1 + 0.25, 0xd8c8a8, { rot: [0, 0, -0.5] }); }
  k.cyl(0.18, 0.13, 0.28, CX0 - 0.3, 0.14, CZ1 + 0.55, 0xb05a32, 12); k.cyl(0.04, 0.16, 0.25, CX0 - 0.3, 0.38, CZ1 + 0.55, 0x4a8a34, 8);
  const cr = new THREE.Mesh(new THREE.PlaneGeometry(CX1 - CX0, CZ1 - CZ0), new THREE.MeshBasicMaterial({ color: 0xc8a878 }));
  cr.rotation.x = Math.PI / 2; cr.position.set((CX0 + CX1) / 2, CH, (CZ0 + CZ1) / 2); scene.add(cr);
  // the roof: a low triangle, ridge running front to back, gable end on the front with scalloped
  // bargeboards, a pointed finial at the top and a trim board down the middle
  { const mid = (CX0 + CX1) / 2, half = (CX1 - CX0) / 2 + 0.3, RISE = 0.85, ang = Math.atan2(RISE, (CX1 - CX0) / 2), sl = half / Math.cos(ang), L = CZ1 - CZ0 + 0.5;
    for (const s of [-1, 1]) k.box(sl, 0.07, L, mid + s * half / 2, CH + RISE / 2 + 0.05, (CZ0 + CZ1) / 2, 0x3a3634, { rot: [0, 0, -s * ang] });
    const gab = new THREE.Shape([new THREE.Vector2(-(CX1 - CX0) / 2, 0), new THREE.Vector2((CX1 - CX0) / 2, 0), new THREE.Vector2(0, RISE)]);
    for (const z of [CZ1 + 0.07, CZ0 - 0.07]) { const t = CLAD.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set((CX1 - CX0) / 0.9, RISE / 0.9);
      const gm = new THREE.Mesh(new THREE.ShapeGeometry(gab), new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }));
      const uv = gm.geometry.attributes.uv, pa = gm.geometry.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (pa.getX(i) + (CX1 - CX0) / 2) / (CX1 - CX0), pa.getY(i) / RISE);
      gm.position.set(mid, CH, z); scene.add(gm); }
    // scalloped bargeboards along both slopes
    for (const s of [-1, 1]) {
      k.box(sl, 0.12, 0.05, mid + s * half / 2, CH + RISE / 2 + 0.0, CZ1 + 0.24, 0x5a3020, { rot: [0, 0, -s * ang] });
      for (let d = 0.2; d < sl - 0.1; d += 0.34) { const x = mid + s * d * Math.cos(ang), y = CH + RISE - d * Math.sin(ang) - 0.07; k.parts.push(part(cyl(0.085, 0.085, 0.04, 10), 0x5a3020, [x, y, CZ1 + 0.24], [Math.PI / 2, 0, 0], [1, 1, 0.6])); }
    }
    k.box(0.1, 0.32, 0.06, mid, CH + RISE + 0.1, CZ1 + 0.26, 0x5a3020); k.parts.push(part(cyl(0.0, 0.07, 0.16, 4), 0x5a3020, [mid, CH + RISE + 0.33, CZ1 + 0.26], [0, Math.PI / 4, 0]));   // finial
    k.box(0.12, RISE + 0.1, 0.04, mid, CH + RISE / 2 - 0.05, CZ1 + 0.1, 0x5a3020);                     // trim board up the middle
    k.box(CX1 - CX0, 0.08, 0.06, mid, CH - 0.02, CZ1 + 0.1, 0x5a3020);                                  // fascia along the eaves line
  }
  k.light(-2.6, 2.2, -13.6, 0xffe0b0, 2.5, 6); k.light(2.2, 2.2, -13.6, 0xffe0b0, 3, 7);
  k.lamp(-2.6, 2.3, -13.6, 0xfff0d0, 0.1); k.lamp(2.2, 2.3, -13.6, 0xfff0d0, 0.1);
  // spare room: the table, the big cupboard along the back
  k.table(-2.6, -12.9, 1.4, 0.8, { chairs: 1, top: 0x8a6a42, legs: 0x4a3420, chairColor: 0x4a3420, spots: 2 });
  R(-3.9, CZ0 + 0.08, -1.1, CZ0 + 0.7, 2.1, 1.05, 0xc8a878, { block: true, collide: true });
  for (const x of [-3.2, -1.8]) { k.box(1.3, 1.95, 0.02, x, 1.05, CZ0 + 0.71, 0xb89868); k.box(0.03, 0.2, 0.03, x + (x < -2.5 ? 0.55 : -0.55), 1.05, CZ0 + 0.73, 0x2a2a2a); }
  // the dartboard cabinet on the partition (lounge side): red cabinet, doors open flat either side
  // with chalkboards inside for the scores; the oche is the yellow line on the floor
  const DB = { x: PART + 0.11, y: 1.73, z: -14.0 }, CAB = 0x8a1a1a, wx = PART + 0.05;
  k.box(0.02, 0.64, 0.64, wx + 0.01, DB.y, DB.z, 0x2a1a10);                                         // cabinet back
  for (const s of [-1, 1]) { k.box(0.1, 0.035, 0.66, wx + 0.05, DB.y + s * 0.31, DB.z, CAB); k.box(0.1, 0.62, 0.035, wx + 0.05, DB.y, DB.z + s * 0.31, CAB); }
  const chalkL = chalkCanvas(), chalkR = chalkCanvas();
  for (const [s, ch] of [[1, chalkL], [-1, chalkR]]) {                                               // doors: +z is the thrower's left
    const dz = DB.z + s * (0.33 + 0.16);
    k.box(0.025, 0.64, 0.32, wx + 0.0125, DB.y, dz, CAB);
    k.box(0.006, 0.6, 0.3, wx + 0.027, DB.y, dz, 0x5a1010);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.54), new THREE.MeshBasicMaterial({ map: ch.tex, color: 0xdddddd }));
    m.rotation.y = Math.PI / 2; m.position.set(wx + 0.032, DB.y, dz); scene.add(m);
    k.box(0.02, 0.012, 0.012, wx + 0.04, DB.y - 0.29, dz, 0xf4f4f0);                                // a stub of chalk
  }
  { const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.229, 0.229, 0.04, 48), new THREE.MeshLambertMaterial({ color: 0x151515 }));
    ring.rotation.z = Math.PI / 2; ring.position.set(DB.x - 0.021, DB.y, DB.z); scene.add(ring);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.225, 64), new THREE.MeshLambertMaterial({ map: dartboardTex() }));
    face.rotation.y = Math.PI / 2; face.position.set(DB.x, DB.y, DB.z); scene.add(face); }
  k.lamp(DB.x + 0.25, 2.2, DB.z, 0xfff2d0, 0.05); k.pool(DB.x + 0.02, 0, DB.z, 0.9, 0xffe0a0);
  k.label('THE CABIN OPEN — 501', 0.6, 0.1, [wx + 0.11, DB.y + 0.4, DB.z], [0, Math.PI / 2, 0], { bg: '#8a1a1a', fg: '#ffd400', border: null, size: 40 });
  R(DB.x + 2.37 - 0.03, -14.5, DB.x + 2.37 + 0.03, -13.5, 0.006, 0.011, 0xffd400);                   // the oche
  k.table(DB.x + 2.75, -14.85, 0.5, 0.5, { round: true, h: 1.0, chairs: 0, spots: 0, top: 0x2a2a2a, legs: 0x9a9a9a });   // where the darts wait
  const DART_STAND = [-0.1, 0, 0.1].map(dz => new THREE.Vector3(DB.x + 2.75 + dz * 0.5, 1.06, -14.85 + dz));
  // lounge: sofa along the back, round table, armchair, seats
  R(0.2, CZ0 + 0.1, 3.2, CZ0 + 0.95, 0.45, 0.225, 0x3a3a4a, { block: true }); R(0.2, CZ0 + 0.1, 3.2, CZ0 + 0.35, 0.9, 0.45, 0x3a3a4a);
  for (const s of [0.2, 3.0]) R(s, CZ0 + 0.1, s + 0.2, CZ0 + 0.95, 0.65, 0.325, 0x3a3a4a);
  for (const x of [0.9, 1.7, 2.5]) R(x - 0.38, CZ0 + 0.38, x + 0.38, CZ0 + 0.9, 0.12, 0.5, 0x4a4a5a);
  k.spawns.push(new THREE.Vector3(1.7, 0.62, CZ0 + 0.65));
  k.table(4.3, -15.2, 0.9, 0.9, { round: true, chairs: 0, top: 0x6a4a2a, legs: 0x3a2a1a, spots: 1 });
  R(3.75, -12.85, 4.65, -11.95, 0.45, 0.225, 0x7a2a2a, { block: true }); R(4.45, -12.85, 4.75, -11.95, 0.9, 0.45, 0x7a2a2a); for (const z of [-12.85, -11.95]) R(3.75, z - 0.08, 4.75, z + 0.08, 0.65, 0.325, 0x7a2a2a);   // armchair, facing the sofa
  // the seats all turn in to face the room (a chair faces -z at ry 0, so face (tx, tz) with atan2(-dx, -dz))
  { const face = (x, z, tx, tz) => Math.atan2(-(tx - x), -(tz - z)); for (const [x, z] of [[0.05, -12.6], [0.6, -11.7], [4.3, -14.1]]) k.chair(x, z, face(x, z, 2.2, -13.4), 0x2a2a2a, 0x4a4a4a); }
  R(1.6, -12.95, 3.0, -12.35, 0.42, 0.21, 0x5a3a22, { collide: true, block: true }); k.spawns.push(new THREE.Vector3(2.3, 0.5, -12.65));   // coffee table
  // the mess: cans, bottles, pizza boxes, crisp packets everywhere
  const CANS = [0xd32f2f, 0x1e5aa8, 0xffd400, 0x2e7d32, 0x111111, 0xe0e0e0, 0x8a1a8a];
  const can = (x, y, z) => k.cyl(0.033, 0.033, 0.12, x, y + 0.06, z, CANS[Math.floor(rnd() * CANS.length)], 8);
  const lyingCan = (x, y, z) => k.box(0.12, 0.066, 0.066, x, y + 0.033, z, CANS[Math.floor(rnd() * CANS.length)], { rot: [0, rnd() * 3, 0] });
  const bottle = (x, y, z) => { k.cyl(0.035, 0.035, 0.2, x, y + 0.1, z, 0x2a6a2a, 8); k.cyl(0.012, 0.02, 0.07, x, y + 0.23, z, 0x2a6a2a, 6); };
  const pizza = (x, y, z, r) => { k.box(0.4, 0.04, 0.4, x, y + 0.02, z, 0xe8d8b8, { rot: [0, r, 0] }); k.box(0.36, 0.005, 0.36, x, y + 0.042, z, 0xc82a1a, { rot: [0, r, 0] }); };
  const crisps = (x, y, z) => k.box(0.16, 0.03, 0.22, x, y + 0.015, z, [0xd32f2f, 0x1e5aa8, 0x2e7d32, 0xffd400][Math.floor(rnd() * 4)], { rot: [0, rnd() * 3, 0] });
  const strewn = (x0, z0, x1, z1, n, y = 0.01) => { for (let i = 0; i < n; i++) { const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0), t = rnd(); if (t < 0.45) lyingCan(x, y, z); else if (t < 0.65) can(x, y, z); else if (t < 0.8) crisps(x, y, z); else if (t < 0.9) bottle(x, y, z); else pizza(x, y, z, rnd() * 3); } };
  strewn(-0.5, -15.2, 4.8, -11.3, 80);                               // lounge floor: a proper mess
  strewn(1.65, -12.9, 2.95, -12.4, 6, 0.42);                         // coffee table
  strewn(3.95, -15.55, 4.65, -14.85, 4, 0.76);                       // round table
  strewn(-3.25, -13.2, -1.95, -12.6, 5, 0.76);                       // spare room table
  strewn(-4.3, -14.8, -0.9, -11.3, 34);                              // spare room floor
  for (const [x, z] of [[0.6, -15.4], [2.9, -15.3]]) pizza(x, 0.45, z, rnd());
  for (let i = 0; i < 6; i++) bottle(-1.0 + i * 0.12, 0, -15.95);    // a row of empties along the back wall
  R(-0.9, -15.8, -0.5, -15.4, 0.55, 0.275, 0x2a2a2a); for (let i = 0; i < 4; i++) lyingCan(-0.7, 0.55 + i * 0.066, -15.6);   // the bin, overflowing
  // even more: cans on the sofa and the armchair, a can pyramid on the coffee table, crates, bin bags, empties on the window sills
  strewn(0.45, -15.9, 2.95, -15.3, 7, 0.45); strewn(3.85, -12.75, 4.4, -12.05, 3, 0.45);
  for (let row = 0, y = 0.42; row < 4; row++, y += 0.12) for (let i = 0; i < 4 - row; i++) can(2.0 + (i + row * 0.5) * 0.07, y, -12.65);
  for (let i = 0; i < 3; i++) { R(4.0, -11.65 + i * 0.0, 4.55, -11.25, 0.26, 0.13 + i * 0.26, [0xd32f2f, 0x2e7d32, 0x1e5aa8][i]); }   // beer crates stacked by the door
  for (let i = 0; i < 6; i++) bottle(4.05 + (i % 3) * 0.17, 0.78, -11.55 + Math.floor(i / 3) * 0.17);
  for (const [x, z] of [[-0.35, -11.4], [-0.25, -11.75], [-4.2, -15.6]]) { k.parts.push(part(sph(0.26, 8, 6), 0x151515, [x, 0.24, z], [0, 0, 0], [1, 1.15, 1])); k.box(0.06, 0.08, 0.06, x, 0.53, z, 0x151515); }   // bin bags
  for (let i = 0; i < 9; i++) can(-3.5 + i * 0.2, 0.92, -11.08);                    // a row of empties along the spare room sill
  for (let i = 0; i < 6; i++) can(3.3 + i * 0.19, 0.92, -11.08);
  for (let i = 0; i < 5; i++) pizza(-3.9 + (i % 2) * 0.05, 0.02 + i * 0.045, -14.3 + (i % 2) * 0.04, i * 0.3);   // a tower of pizza boxes
  // mess in the garage too
  strewn(2.4, -7.6, 5.6, -3.0, 10); strewn(5.85, -7.8, 6.3, -5.3, 4, 0.9);

  // ======================================================== SUMMER DETAILS
  const FLOWERS = [0xff4f7b, 0xffd400, 0xffffff, 0x9a4aff, 0xff7a1a, 0xff2a2a, 0x4a8aff, 0xffa0d0];
  const LEAF = [0x3f8a2e, 0x4a9a34, 0x356a26, 0x5aa83a];
  const bloom = (x, z, h) => { k.cyl(0.006, 0.006, h, x, h / 2, z, 0x3f7a2e, 4); const c = FLOWERS[Math.floor(rnd() * FLOWERS.length)]; k.parts.push(part(sph(0.035 + rnd() * 0.02, 6, 4), c, [x, h + 0.01, z], [0, 0, 0], [1, 0.55, 1])); k.parts.push(part(sph(0.012, 4, 3), 0xffe066, [x, h + 0.03, z])); };
  const bush = (x, z, r) => { for (let i = 0; i < 3; i++) k.parts.push(part(sph(r * (0.7 + rnd() * 0.4), 7, 5), LEAF[Math.floor(rnd() * 4)], [x + (rnd() - 0.5) * r, r * 0.7 + rnd() * r * 0.3, z + (rnd() - 0.5) * r])); };
  const bed = (x0, z0, x1, z1, n) => {
    R(x0, z0, x1, z1, 0.06, 0.03, 0x4a3020);                                          // dark soil
    for (let i = 0; i < n; i++) { const x = x0 + 0.08 + rnd() * (x1 - x0 - 0.16), z = z0 + 0.08 + rnd() * (z1 - z0 - 0.16); if (i % 4 === 0) bush(x, z, 0.16 + rnd() * 0.12); else bloom(x, z, 0.25 + rnd() * 0.4); }
  };
  // the left fence: shrubs, climbers and flowers growing up it the whole way along, never more than a foot out
  for (const [z0, z1] of [[-16.35, -2.95], [-1.85, 1.3]]) R(B.x0 + 0.04, z0, B.x0 + 0.3, z1, 0.06, 0.03, 0x4a3020);   // narrow strip of soil (the plants are leaf foliage, added at the end)
  // halfway down, where the line crosses the lawn: a trellis on the fence, a grey post, a scroll bracket
  // with a solar lantern and a hanging basket, clematis and roses climbing all over it
  { const PZ = -6.6, TZ0 = -8.5, GREY = 0x8c8c82, IRON = 0x1a1a1a, px = B.x0 + 0.1;
    k.box(0.1, 2.35, 0.1, px, 1.175, PZ, GREY, { block: true, collide: true }); k.box(0.12, 0.04, 0.12, px, 2.37, PZ, GREY);
    k.box(0.1, 2.35, 0.1, px, 1.175, TZ0, GREY, { block: true }); k.box(0.12, 0.04, 0.12, px, 2.37, TZ0, GREY);
    for (const y of [0.6, 2.28]) k.box(0.05, 0.05, PZ - TZ0, px, y, (PZ + TZ0) / 2, GREY);
    for (let z = TZ0 + 0.15; z < PZ - 0.05; z += 0.15) k.box(0.02, 1.68, 0.025, px + 0.02, 1.44, z, 0x9a9a8e);                     // trellis uprights
    for (let y = 0.75; y < 2.25; y += 0.15) k.box(0.025, 0.025, PZ - TZ0 - 0.1, px + 0.035, y, (PZ + TZ0) / 2, 0x9a9a8e);       // and rails
    // the scroll bracket off the post, toward the house
    k.box(0.02, 0.025, 0.5, px + 0.06, 2.12, PZ + 0.25, IRON);
    k.parts.push(part(new THREE.TorusGeometry(0.1, 0.008, 4, 14, Math.PI * 1.4), IRON, [px + 0.06, 2.0, PZ + 0.2], [0, Math.PI / 2, 0]));
    k.parts.push(part(new THREE.TorusGeometry(0.05, 0.007, 4, 10, Math.PI * 1.6), IRON, [px + 0.06, 2.14, PZ + 0.46], [0, Math.PI / 2, 2.5]));
    // solar lantern hanging off the bracket
    k.box(0.006, 0.12, 0.006, px + 0.06, 2.04, PZ + 0.22, IRON);
    k.cyl(0.0, 0.07, 0.05, px + 0.06, 1.96, PZ + 0.22, 0x2a2a2a, 10); k.cyl(0.045, 0.04, 0.09, px + 0.06, 1.89, PZ + 0.22, 0xe8eef0, 10); k.lamp(px + 0.06, 1.88, PZ + 0.22, 0xfff6e0, 0.03, false);
    // the hanging basket on the end of the bracket: chains, wicker, a spill of flowers
    const bz = PZ + 0.45, bx = px + 0.12;
    for (const [dx, dz] of [[-0.09, 0], [0.06, -0.07], [0.06, 0.07]]) k.box(0.005, 0.45, 0.005, bx + dx * 0.6, 1.88, bz + dz * 0.6, 0x333333, { rot: [dz * 1.5, 0, -dx * 1.5] });
    k.parts.push(part(new THREE.SphereGeometry(0.16, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0x8a7a5a, [bx, 1.66, bz]));
    for (let i = 0; i < 40; i++) { const a = rnd() * 6.28, r = rnd() * 0.17, y = 1.66 + rnd() * 0.12 - (r > 0.12 ? rnd() * 0.25 : 0);
      k.parts.push(part(sph(0.028 + rnd() * 0.02, 5, 4), i % 3 === 0 ? LEAF[i % 4] : [0xe86a90, 0xfff6b0, 0xffffff, 0x4a6aff, 0xffd400][i % 5], [bx + Math.cos(a) * r * 0.8, y, bz + Math.sin(a) * r])); }
    for (let i = 0; i < 18; i++) k.box(0.01, 0.01, 0.3 + rnd() * 0.3, px + 0.05, 2.3 + rnd() * 0.35, TZ0 + rnd() * 2, 0x6a5a3a, { rot: [0.6 + rnd(), 0, 0] });   // bare twiggy bits poking over the top
  }
  bed(6.0, -10.9, B.x1 - 0.05, -8.6, 18);                                              // behind the garage
  // the blue outdoor table tennis table on the lawn (Ronnie's end is the house... no: the left, -x)
  const TT = { x: -2.2, z: -7.4, y: 0.76 }, TL = 2.74, TW = 1.525;
  { const BLUE = 0x1f5fb8, top = TT.y;
    k.box(TL, 0.03, TW, TT.x, top - 0.015, TT.z, BLUE, { collide: true, block: true });
    for (const s of [-1, 1]) { k.box(TL, 0.004, 0.02, TT.x, top + 0.002, TT.z + s * (TW / 2 - 0.01), 0xffffff); k.box(0.02, 0.004, TW, TT.x + s * (TL / 2 - 0.01), top + 0.002, TT.z, 0xffffff); }
    k.box(TL, 0.0035, 0.003, TT.x, top + 0.0018, TT.z, 0xffffff);                                    // centre line
    k.box(TL + 0.02, 0.05, 0.03, TT.x, top - 0.045, TT.z + TW / 2, 0x1a1a1a); k.box(TL + 0.02, 0.05, 0.03, TT.x, top - 0.045, TT.z - TW / 2, 0x1a1a1a);   // frame
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { k.box(0.04, top - 0.07, 0.04, TT.x + sx * (TL / 2 - 0.3), (top - 0.07) / 2, TT.z + sz * (TW / 2 - 0.15), 0x2a2a2a); k.cyl(0.05, 0.05, 0.03, TT.x + sx * (TL / 2 - 0.3), 0.04, TT.z + sz * (TW / 2 - 0.15), 0x111111, 10); }
    for (const sx of [-1, 1]) k.box(0.03, 0.03, TW - 0.3, TT.x + sx * (TL / 2 - 0.3), 0.25, TT.z, 0x2a2a2a);
    // the net
    k.box(0.006, 0.1525, TW + 0.3, TT.x, top + 0.076, TT.z, 0xf4f4f4); k.box(0.012, 0.015, TW + 0.3, TT.x, top + 0.152, TT.z, 0xffffff);
    for (const s of [-1, 1]) k.box(0.03, 0.17, 0.03, TT.x, top + 0.085, TT.z + s * (TW / 2 + 0.15), 0x111111);
    // a little score flip on a stand, beside the net
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.37), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    sc.position.set(TT.x, 1.25, TT.z - TW / 2 - 0.55); scene.add(sc); sc.userData.scoreboard = true;
    k.box(0.74, 0.41, 0.03, TT.x, 1.25, TT.z - TW / 2 - 0.567, 0x222222); k.box(0.04, 1.05, 0.04, TT.x, 0.525, TT.z - TW / 2 - 0.58, 0x222222, { block: true });
    var ppScore = sc;
  }
  // sun loungers with towels, on the lawn
  for (const [x, col] of [[-4.6, 0x1e88e5], [-3.5, 0xff7043]]) {
    const z = -4.7;
    R(x - 0.33, z - 0.95, x + 0.33, z + 0.95, 0.06, 0.32, WHITE, { block: true, collide: true });
    k.box(0.62, 0.06, 0.7, x, 0.58, z - 0.82, WHITE, { rot: [0.9, 0, 0] });
    for (const dz of [-0.85, 0.85]) for (const dx of [-0.28, 0.28]) k.box(0.04, 0.3, 0.04, x + dx, 0.15, z + dz, 0xdddddd);
    for (let i = 0; i < 6; i++) R(x - 0.3, z - 0.6 + i * 0.25, x + 0.3, z - 0.48 + i * 0.25, 0.02, 0.36, i % 2 ? col : 0xffffff);
    k.spawns.push(new THREE.Vector3(x, 0.45, z + 0.3));
  }
  k.cyl(0.033, 0.033, 0.12, -4.05, 0.06, -4.2, 0xd32f2f, 8);                                                 // a can between them
  k.box(0.28, 0.02, 0.4, -4.05, 0.01, -5.4, 0xfff176, { rot: [0, 0.3, 0] });                                // a magazine
  // bird bath + a gnome + a football
  k.cyl(0.08, 0.12, 0.75, -2.3, 0.375, -9.0, 0xc8c2b4, 10, { block: true }); k.cyl(0.32, 0.22, 0.1, -2.3, 0.8, -9.0, 0xc8c2b4, 14); k.cyl(0.28, 0.28, 0.02, -2.3, 0.84, -9.0, 0x7ac8f0, 14);
  k.parts.push(part(sph(0.04, 6, 4), 0x6a4a3a, [-2.12, 0.9, -9.0]), part(sph(0.025, 5, 4), 0x6a4a3a, [-2.08, 0.94, -9.0]));      // a little bird
  k.cyl(0.07, 0.09, 0.2, -5.95, 0.1, -7.7, 0x1e5aa8, 8); k.parts.push(part(sph(0.07, 6, 5), 0xf0c8a0, [-5.95, 0.26, -7.7]), part(sph(0.05, 6, 4), 0xffffff, [-5.95, 0.21, -7.64], [0, 0, 0], [1, 1.3, 0.7]));
  k.cyl(0.0, 0.08, 0.22, -5.95, 0.4, -7.7, 0xd32f2f, 8);                                                     // gnome
  k.parts.push(part(sph(0.11, 10, 8), 0xffffff, [-3.9, 0.11, -9.9]));
  for (let i = 0; i < 5; i++) k.parts.push(part(sph(0.035, 4, 3), 0x111111, [-3.9 + Math.cos(i * 1.26) * 0.09, 0.11 + Math.sin(i * 2.1) * 0.06, -9.9 + Math.sin(i * 1.26) * 0.09]));
  // daisies and clover all over the lawn
  sm = mark();
  for (let i = 0; i < 260; i++) {
    const x = B.x0 + 0.9 + rnd() * 8.0, z = -10.6 + rnd() * 9.6;
    if ((x > 1.9 && z > -5.75) || (x > 4.0 && z > -8.45 && z < -5.8)) continue;
    k.box(0.03, 0.006, 0.03, x, 0.012, z, rnd() < 0.75 ? 0xffffff : 0xd8c8ff); k.box(0.012, 0.008, 0.012, x, 0.016, z, 0xffd400);
  }
  for (let i = 0; i < 70; i++) { const x = B.x0 + 0.9 + rnd() * 8.0, z = -10.6 + rnd() * 9.6; if ((x > 1.9 && z > -5.75) || (x > 4.0 && z > -8.45 && z < -5.8)) continue; k.cyl(0.0, 0.05, 0.1, x, 0.05, z, LEAF[i % 4], 5); }   // tufts
  // solar lights along the stepping stones
  for (const [x, z] of [[1.0, -3.9], [-0.3, -5.0], [-1.6, -6.3], [0.3, -7.9], [1.5, -9.0], [2.3, -10.2]]) { k.cyl(0.012, 0.012, 0.32, x, 0.16, z, 0x222222, 6); k.cyl(0.04, 0.05, 0.05, x, 0.34, z, 0x111111, 8); k.lamp(x, 0.39, z, 0xfff8e0, 0.03, false); }
  smooth.push([sm, mark()]);
  // the back of the house: hanging baskets, outside light, drainpipe, chimney, step, hose reel
  for (const x of [-0.6, 1.6]) {
    k.box(0.03, 0.03, 0.3, x, 2.3, 1.75, 0x111111); k.cyl(0.005, 0.005, 0.25, x, 2.15, 1.62, 0x111111, 4);
    k.parts.push(part(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0x5a3a20, [x, 2.02, 1.62]));
    for (let i = 0; i < 24; i++) { const a = rnd() * 6.28, r = rnd() * 0.22; k.parts.push(part(sph(0.03, 4, 3), i % 3 ? FLOWERS[i % FLOWERS.length] : LEAF[i % 4], [x + Math.cos(a) * r, 2.02 - rnd() * 0.25 + 0.03, 1.62 + Math.sin(a) * r])); }
  }
  k.box(0.18, 0.22, 0.1, 0.5, 2.3, 1.85, 0x222222); k.lamp(0.5, 2.28, 1.79, 0xfff4d0, 0.05, false);
  k.cyl(0.04, 0.04, 5.3, -6.35, 2.65, 1.85, 0x2a2a2a, 8);
  k.box(1.2, 0.12, 0.4, 0.5, 0.06, 1.7, 0xbab4a8, { collide: true });                                     // back step
  k.box(0.7, 1.4, 0.7, -2.6, TOP + 2.0, 6.6, 0xa4583a); k.cyl(0.1, 0.1, 0.3, -2.75, TOP + 2.85, 6.6, 0xb0603a, 8); k.cyl(0.1, 0.1, 0.3, -2.45, TOP + 2.85, 6.6, 0xb0603a, 8);   // chimney
  k.cyl(0.22, 0.22, 0.1, 3.95, 0.6, 1.8, 0x2e7d32, 14); k.cyl(0.06, 0.06, 0.12, 3.95, 0.6, 1.72, 0x1b5e20, 8);   // hose reel on the wall
  // bunting along the back of the house, swagged between brackets
  { const y0 = 2.62, zb = 1.72, cols = [0xd32f2f, 0xffffff, 0x1e5aa8, 0xffd400, 0x2e7d32, 0xff7a1a];
    let ci = 0;
    for (let x0 = -6.2; x0 < 4.2; x0 += 2.1) {
      const x1 = x0 + 2.1;
      for (let i = 0; i <= 10; i++) { const t = i / 10, x = x0 + (x1 - x0) * t, y = y0 - 0.35 * 4 * t * (1 - t);
        if (i < 10) { const t2 = (i + 1) / 10, xb = x0 + (x1 - x0) * t2, yb = y0 - 0.35 * 4 * t2 * (1 - t2); k.box(Math.hypot(xb - x, yb - y), 0.006, 0.006, (x + xb) / 2, (y + yb) / 2, zb, 0xeeeeee, { rot: [0, 0, Math.atan2(yb - y, xb - x)] }); }
        if (i > 0 && i < 10) k.parts.push(part(cyl(0.075, 0.075, 0.004, 3), cols[ci++ % cols.length], [x, y - 0.075, zb], [Math.PI / 2, 0, 0])); }
      k.box(0.04, 0.04, 0.12, x0, y0, zb + 0.06, 0x333333);
    }
  }
  // the cabin: festoon lights swagged along the front under the roof, down the left corner, and across the lounge ceiling inside
  { const fz = -10.86, bulb = (x, y, z) => { k.lamp(x, y, z, 0xfff2c8, 0.02, false); k.box(0.004, 0.03, 0.004, x, y + 0.025, z, 0x222222); };
    const mid = 0.25, top = (x) => 2.4 + 0.85 * (1 - Math.abs(x - mid) / 4.75) - 0.18;
    for (const [a, b] of [[-4.5, mid], [mid, 5.0]]) for (let sw = 0; sw < 4; sw++) { const x0 = a + (b - a) * sw / 4, x1 = a + (b - a) * (sw + 1) / 4;
      for (let i = 0; i <= 6; i++) { const t = i / 6, x = x0 + (x1 - x0) * t; bulb(x, top(x) - 0.22 * 4 * t * (1 - t) - 0.05, fz); } }
    for (let i = 0; i < 9; i++) bulb(-4.47, 2.2 - i * 0.2, -10.95 + Math.sin(i) * 0.02);                       // down the left corner
    for (let i = 0; i <= 14; i++) { const t = i / 14; k.lamp(0.0 + 4.7 * t, 2.32 - 0.12 * Math.sin(t * Math.PI), -12.0 - 1.6 * t, 0xd8f0ff, 0.016, false); }   // inside, across the lounge
  }
  // the rusty garden incinerator by the front-right corner of the cabin, straw poking out under the lid
  { const ix = 5.6, iz = -11.45, RUST = [0x8a4a22, 0x9a5a2a, 0x7a3e1c, 0xa8622e];
    k.cyl(0.26, 0.27, 0.62, ix, 0.31, iz, 0x8a4a22, 18, { block: true, collide: true });
    for (let i = 0; i < 30; i++) { const a = rnd() * 6.28, y = 0.05 + rnd() * 0.55; k.box(0.06 + rnd() * 0.08, 0.04 + rnd() * 0.08, 0.006, ix + Math.sin(a) * 0.268, y, iz + Math.cos(a) * 0.268, RUST[i % 4], { rot: [0, a, 0] }); }   // rust patches
    for (let row = 0; row < 3; row++) for (let j = 0; j < 9; j++) { const a = j / 9 * 6.28 + row * 0.35; k.cyl(0.018, 0.018, 0.01, ix + Math.sin(a) * 0.271, 0.15 + row * 0.15, iz + Math.cos(a) * 0.271, 0x1a0e08, 8); }   // air holes
    for (let j = 0; j < 9; j++) { const a = j / 9 * 6.28 + 0.2; R(ix + Math.sin(a) * 0.27 - 0.02, iz + Math.cos(a) * 0.27 - 0.02, ix + Math.sin(a) * 0.27 + 0.02, iz + Math.cos(a) * 0.27 + 0.02, 0.012, 0.0, 0x1a0e08); }
    k.cyl(0.29, 0.29, 0.03, ix, 0.66, iz, 0x7a3e1c, 18);                                            // rim
    k.cyl(0.08, 0.32, 0.14, ix + 0.02, 0.76, iz, 0x8f4e26, 18);                                     // lid, sat a bit crooked
    k.cyl(0.07, 0.08, 0.12, ix + 0.02, 0.88, iz, 0x7a3e1c, 12); k.cyl(0.09, 0.09, 0.015, ix + 0.02, 0.945, iz, 0x6a3418, 12);   // chimney + cap
    for (let i = 0; i < 70; i++) {                                                                  // dry straw and twigs sticking out everywhere
      const a = rnd() * 6.28, len = 0.15 + rnd() * 0.3, out = 0.22 + rnd() * 0.12;
      k.box(0.008, 0.008, len, ix + Math.sin(a) * out, 0.66 + (rnd() - 0.4) * 0.08, iz + Math.cos(a) * out, [0xd8c07a, 0xc8aa5a, 0xb89a4a, 0xe0cc8a][i % 4], { rot: [(rnd() - 0.5) * 0.9, a + (rnd() - 0.5) * 1.2, 0] });
    }
    for (let i = 0; i < 14; i++) { const a = rnd() * 6.28, r = 0.3 + rnd() * 0.25; k.cyl(0.0, 0.04, 0.12 + rnd() * 0.18, ix + Math.sin(a) * r, 0.08, iz + Math.cos(a) * r, LEAF[i % 4], 5); }   // long grass round its feet
  }
  // a lawnmower and a watering can by the garage
  k.box(0.5, 0.25, 0.6, 2.6, 0.2, -9.0, 0xd32f2f, { block: true }); for (const [dx, dz] of [[-0.24, -0.25], [0.24, -0.25], [-0.24, 0.25], [0.24, 0.25]]) k.cyl(0.08, 0.08, 0.04, 2.6 + dx, 0.08, -9.0 + dz, 0x111111, 10);
  k.box(0.04, 0.04, 0.9, 2.6, 0.55, -8.6, 0x333333, { rot: [0.7, 0, 0] });
  k.cyl(0.11, 0.12, 0.25, 1.85, 0.125, -8.0, 0x2e7d32, 10); k.box(0.03, 0.03, 0.3, 1.85, 0.22, -8.2, 0x2e7d32, { rot: [0.6, 0, 0] });
  // a few butterflies (animated in room.update)
  const flutter = [];
  { const wingG = new THREE.PlaneGeometry(0.05, 0.04); wingG.translate(0.025, 0, 0);
    for (let i = 0; i < 7; i++) {
      const col = [0xffffff, 0xffd400, 0xff7a1a, 0x7ab0ff][i % 4], m = new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide });
      const b = new THREE.Group(), w1 = new THREE.Mesh(wingG, m), w2 = new THREE.Mesh(wingG, m); w2.scale.x = -1; b.add(w1, w2);
      b.userData = { w1, w2, cx: [-5.9, -5.9, -2.3, 6.2, -3.5, -5.9, 0.3][i], cz: [-8, -4.5, -9.0, -9.7, -10.9, -6.2, -10.9][i], ph: i * 1.7, sp: 0.5 + rnd() * 0.4 };
      scene.add(b); flutter.push(b);
    } }

  // ---------------- sunshine ----------------
  // ---------------- a longer garden ----------------
  // Everything above was laid out on the short plan; here the lawn gets 1.5m more on each side of the
  // middle line. Things beyond each cut slide back; long things that cross a cut (fences, floors,
  // borders) stretch; the stepping stones, solar lights and daisies spread out evenly along the lawn.
  stretchGarden();
  plantsAndWillow();
  const room = k.finish({
    name: "Lewis's House",
    sky: 0xcfe8ff, ground: 0x6f8f45, hemiI: 1.5, sun: 0xffeccc, sunI: 3.0, sunPos: [8, 16, -5], ambient: 0.32,
    start: { x: 0.5, z: 1.1, yaw: 0.55 },
    board: { x: GX0 - 0.12, y: 1.38, z: -4.95, ry: -Math.PI / 2 },
    startFood: ['can', 'burger', 'hotdog', 'can', 'chicken', 'sausageroll', 'can', 'burger', 'crisps', 'cookie', 'pizza', 'can'],
    spotCount: 30,
  });
  // a lovely summer's day: warm low-ish sun with real soft shadows, a light haze in the distance
  room.shadows = true;
  const sun = room.sun; sun.castShadow = true;
  sun.target.position.set(0, 0, -4); scene.add(sun.target); sun.position.set(8, 16, -9);
  Object.assign(sun.shadow.camera, { left: -19, right: 19, top: 19, bottom: -19, near: 2, far: 55 }); sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  scene.traverse(o => { if (o.isMesh && o !== sky && o !== ground) { o.castShadow = !o.material.transparent; o.receiveShadow = true; } });
  ground.receiveShadow = true;
  scene.fog = new THREE.Fog(0xcfe0ee, 22, 40);                                   // summer haze, fading the far edge into the sky
  // the sun itself, glowing in the sky
  { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunGlowTex(), color: 0xfff6e0, transparent: true, depthWrite: false, fog: false }));
    sp.position.copy(SUN_DIR).multiplyScalar(28); sp.scale.setScalar(9); sp.renderOrder = -97; sp.frustumCulled = false; skyRig.add(sp); }
  // butterflies flutter round the flowers; the squad cast shadows too
  const baseUpdate = room.update.bind(room); let shT = 0;
  room.update = (dt) => {
    baseUpdate(dt);
    const t = room.t;
    for (const b of flutter) { const u = b.userData, a = t * u.sp + u.ph;
      b.position.set(u.cx + Math.sin(a) * 0.7 + Math.sin(a * 2.3) * 0.2, 0.55 + Math.sin(a * 1.7) * 0.25 + Math.sin(a * 5) * 0.05, u.cz + Math.cos(a * 0.8) * 0.6);
      b.rotation.y = -a * 0.8; const f = Math.sin(t * 22 + u.ph) * 0.9; u.w1.rotation.y = f; u.w2.rotation.y = -f; }
    if ((shT -= dt) <= 0) { shT = 1; scene.traverse(o => { if ((o.isSkinnedMesh || (o.isMesh && o.parent && o.parent.isBone)) && !o.userData.shad) { o.castShadow = true; o.userData.shad = true; } }); }
  };
  room.dartboard = new DartGame({ center: new THREE.Vector3(DB.x, DB.y, F(DB.z)), normal: new THREE.Vector3(1, 0, 0), stand: DART_STAND.map(v => v.setZ(F(v.z))), chalkL, chalkR });
  room.pingpong = new PingPong(scene, { c: new THREE.Vector3(TT.x, TT.y, F(TT.z)) });
  ppScore.material.map = room.pingpong.board.tex; ppScore.material.needsUpdate = true;
  room.games = [room.dartboard, room.pingpong];
  return room;
}

// white lace net curtains: a lattice of loops and a scalloped hem
// painted foliage with a transparent background: 0 leafy shrub, 1 shrub in flower, 2 clematis (purple),
// 3 climbing rose (pink), 4 willow (long narrow leaves)
function foliageTex(kind) {
  return canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    let seed = 1000 + kind * 77; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const greens = kind === 4 ? ['#6f9a3a', '#86ad48', '#5d8a30', '#9bbd5a'] : ['#2f6a24', '#3f7f2c', '#4f9236', '#295c20', '#5fa040'];
    const leaf = (x, y, len, wid, ang, col) => { g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = col; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(wid, len * 0.45, 0, len); g.quadraticCurveTo(-wid, len * 0.45, 0, 0); g.fill();
      g.strokeStyle = 'rgba(20,50,10,0.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 2); g.lineTo(0, len - 2); g.stroke(); g.restore(); };
    const n = kind === 4 ? 220 : 170;
    for (let i = 0; i < n; i++) {
      const cx = w / 2 + (r() - 0.5) * w * 0.85, cy = h / 2 + (r() - 0.5) * h * 0.85;
      if (Math.hypot((cx - w / 2) / w, (cy - h / 2) / h) > 0.46) continue;                 // keep a soft round outline
      const len = kind === 4 ? 26 + r() * 18 : 16 + r() * 14, wid = kind === 4 ? 3 + r() * 2 : 7 + r() * 6;
      leaf(cx, cy, len, wid, r() * 6.28, greens[Math.floor(r() * greens.length)]);
    }
    if (kind >= 1 && kind <= 3) {
      const cols = kind === 1 ? ['#ffffff', '#ffd400', '#ff6fa0', '#b08aff'] : kind === 2 ? ['#5a2a8a', '#6a3aa0', '#4a2a7a'] : ['#e86a90', '#f08aa8', '#d8507a'];
      for (let i = 0; i < (kind === 1 ? 26 : 14); i++) {
        const cx = w / 2 + (r() - 0.5) * w * 0.7, cy = h / 2 + (r() - 0.5) * h * 0.7, col = cols[Math.floor(r() * cols.length)], pr = kind === 1 ? 6 : 13;
        const petals = kind === 2 ? 6 : 5;
        for (let p = 0; p < petals; p++) { const a = p / petals * 6.28 + r(); g.fillStyle = col; g.beginPath(); g.ellipse(cx + Math.cos(a) * pr * 0.55, cy + Math.sin(a) * pr * 0.55, pr * 0.6, pr * 0.35, a, 0, 7); g.fill(); }
        g.fillStyle = kind === 3 ? '#c03a60' : '#ffe680'; g.beginPath(); g.arc(cx, cy, pr * 0.28, 0, 7); g.fill();
      }
    }
  });
}
// one weeping willow strand: a thin stem with long narrow leaves hanging off it all the way down
function strandTex() {
  return canvasTex(64, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    let seed = 4242; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.strokeStyle = '#6a7a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, 0); g.bezierCurveTo(w / 2 + 6, h * 0.3, w / 2 - 6, h * 0.7, w / 2, h); g.stroke();
    for (let y = 4; y < h - 6; y += 7) {
      const side = (y / 7) % 2 ? 1 : -1, len = 18 + r() * 12, col = ['#7fa840', '#8fb850', '#6e9a34', '#a0c460'][Math.floor(r() * 4)];
      g.save(); g.translate(w / 2 + Math.sin(y / 60) * 4, y); g.rotate(side * (0.35 + r() * 0.3)); g.fillStyle = col;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(side * 4, len * 0.5, 0, len); g.quadraticCurveTo(-side * 1, len * 0.5, 0, 0); g.fill(); g.restore();
    }
  });
}
function laceTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(248,246,240,0.55)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2;
    for (let y = 8; y < h; y += 24) for (let x = (y / 24 % 2) * 12; x < w; x += 24) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.stroke(); g.beginPath(); g.arc(x, y, 2, 0, 7); g.stroke(); }
    for (let x = 0; x < w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 8, h); g.stroke(); }
    for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(w / 2, h * 0.45, 30 + i * 14, 50 + i * 16, 0, 0, 7); g.stroke(); }
  });
}
function frostedTex() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#dfe6df'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '150,165,150'},0.25)`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 0, 7); g.fill(); }
  });
}
function sunGlowTex() {
  return canvasTex(256, 256, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,245,1)'); gr.addColorStop(0.12, 'rgba(255,250,220,1)'); gr.addColorStop(0.3, 'rgba(255,240,190,0.45)'); gr.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
}
// soft fair-weather cumulus: fractal noise, thresholded, lit from above, thinning toward the zenith
// and the horizon (equirectangular, wraps round)
function cloudTex() {
  const W = 1024, H = 256, N = 64, M = 16;
  const grid = (n, m, seed) => { const a = new Float32Array(n * m); let x = seed; for (let i = 0; i < a.length; i++) { x = (x * 16807) % 2147483647; a[i] = x / 2147483647; } return a; };
  const oct = [[N, M, 11, 1], [N * 2, M * 2, 23, 0.5], [N * 4, M * 4, 37, 0.25], [N * 8, M * 8, 51, 0.125]].map(([n, m, s, a]) => ({ n, m, a, g: grid(n, m + 1, s) }));
  const val = (o, u, v) => { const x = u * o.n, y = v * o.m, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const g = o.g, n = o.n, at = (i, j) => g[(j % (o.m + 1)) * n + ((i % n) + n) % n];
    return (at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx) * (1 - sy) + (at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx) * sy; };
  return canvasTex(W, H, (g) => {
    const img = g.createImageData(W, H), d = img.data;
    for (let j = 0; j < H; j++) {
      const v = j / H;                                                  // 0 = zenith, 1 = just above the horizon
      const band = Math.min(1, v / 0.35) * Math.min(1, (1 - v) / 0.25);
      for (let i = 0; i < W; i++) {
        const u = i / W; let n = 0; for (const o of oct) n += val(o, u, v * 0.9) * o.a; n /= 1.875;
        const c = Math.max(0, Math.min(1, (n - 0.6) / 0.14)) * band;
        const shade = 0.82 + 0.18 * Math.min(1, (n - 0.5) * 4);         // thicker = brighter tops
        const k = (j * W + i) * 4; d[k] = 255 * shade; d[k + 1] = 255 * shade; d[k + 2] = 255 * Math.min(1, shade + 0.03); d[k + 3] = 255 * Math.pow(c, 0.8) * 0.92;
      }
    }
    g.putImageData(img, 0, 0);
  }, { mips: true });
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
