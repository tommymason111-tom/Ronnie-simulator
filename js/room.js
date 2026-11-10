// Ronnie's bedroom (design doc sections 17 / 21.1 / 39.1): 5m x 4.5m, ceiling 2.6m.
// Bed against the back wall, desk + gaming chair by the window, wardrobe on the
// right, mini fridge under the desk, bin in the corner, MONSTOR cans everywhere,
// and a fat joke everywhere you look.
import * as THREE from 'three';
import { ROOM } from './config.js';
import { part, merge, vcLambert, box, cyl } from './geo.js';
import { canvasTex, signTex, wallTex, floorTex, stripesTex, beamTex, fitText, FONT } from './textures.js';

const HW = ROOM.w / 2, HD = ROOM.d / 2, H = ROOM.h;

export function buildRoom(scene) {
  const colliders = [];   // axis-aligned boxes food can land on: {min, max}
  const blockers = [];    // solid furniture footprints (Tommy walks around them, his ragdoll collides with them)
  const parts = [];       // merged into one vertex-coloured mesh
  const addBox = (w, h, d, x, y, z, color, { collide = false, block = false, rot } = {}) => {
    parts.push(part(box(w, h, d), color, [x, y, z], rot || [0, 0, 0]));
    if (collide) colliders.push({ min: new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2), max: new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2) });
    if (block) blockers.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y1: y + h / 2 });
  };

  // ---------------- shell ----------------
  const floorMat = new THREE.MeshLambertMaterial({ map: floorTex() });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), floorMat);
  floor.rotation.x = -Math.PI / 2; scene.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), new THREE.MeshLambertMaterial({ color: 0xf4efe6, emissive: 0x6e6658 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = H; scene.add(ceil);

  const wallMat = new THREE.MeshLambertMaterial({ map: wallTex() });
  wallMat.map.wrapS = THREE.RepeatWrapping;
  // A wall piece whose UVs map world height to texture height, so the
  // fake-AO gradient lines up across pieces around the window.
  const wallPiece = (w, y0, y1, x, z, ry) => {
    const g = new THREE.PlaneGeometry(w, y1 - y0);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setX(i, uv.getX(i) * w / 1.2);
      uv.setY(i, (y0 + uv.getY(i) * (y1 - y0)) / H);
    }
    const m = new THREE.Mesh(g, wallMat);
    m.position.set(x, (y0 + y1) / 2, z); m.rotation.y = ry; scene.add(m);
  };
  wallPiece(ROOM.w, 0, H, 0, -HD, 0);               // back
  wallPiece(ROOM.w, 0, H, 0, HD, Math.PI);          // front
  wallPiece(ROOM.d, 0, H, -HW, 0, Math.PI / 2);     // left
  // right wall with a window hole: z in [-1.9, -0.5], y in [0.95, 2.05]
  const wz0 = -1.9, wz1 = -0.5, wy0 = 0.95, wy1 = 2.05;
  wallPiece(HD + wz0, 0, H, HW, (-HD + wz0) / 2, -Math.PI / 2);
  wallPiece(HD - wz1, 0, H, HW, (wz1 + HD) / 2, -Math.PI / 2);
  // below / above the window (UV-correct heights)
  { const w = wz1 - wz0, zc = (wz0 + wz1) / 2;
    wallPiece(w, 0, wy0, HW, zc, -Math.PI / 2);
    wallPiece(w, wy1, H, HW, zc, -Math.PI / 2); }

  // skirting boards
  const skirt = 0xf3ece0;
  addBox(ROOM.w, 0.1, 0.02, 0, 0.05, -HD + 0.01, skirt);
  addBox(ROOM.w, 0.1, 0.02, 0, 0.05, HD - 0.01, skirt);
  addBox(0.02, 0.1, ROOM.d, -HW + 0.01, 0.05, 0, skirt);
  addBox(0.02, 0.1, ROOM.d, HW - 0.01, 0.05, 0, skirt);

  // ---------------- window, blinds, the street outside ----------------
  const wzc = (wz0 + wz1) / 2, ww = wz1 - wz0;
  addBox(0.08, 0.06, ww + 0.12, HW - 0.04, wy0 - 0.03, wzc, 0xffffff);
  addBox(0.08, 0.06, ww + 0.12, HW - 0.04, wy1 + 0.03, wzc, 0xffffff);
  addBox(0.08, wy1 - wy0, 0.06, HW - 0.04, (wy0 + wy1) / 2, wz0 - 0.03, 0xffffff);
  addBox(0.08, wy1 - wy0, 0.06, HW - 0.04, (wy0 + wy1) / 2, wz1 + 0.03, 0xffffff);
  addBox(0.04, wy1 - wy0, 0.04, HW - 0.03, (wy0 + wy1) / 2, wzc, 0xffffff);
  for (let i = 0; i < 9; i++) // half-open blinds, tilted slats
    addBox(0.06, 0.008, ww, HW - 0.1, wy1 - 0.06 - i * 0.12, wzc, 0xfdf6e8, { rot: [Math.PI / 5, 0, 0] });

  const street = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3.2), new THREE.MeshBasicMaterial({ map: streetTex() }));
  street.position.set(HW + 1.2, 1.5, wzc); street.rotation.y = -Math.PI / 2; scene.add(street);

  // ---------------- bed (back wall) ----------------
  const bedX = -1.0, bedZ0 = -HD, bedZ1 = -0.25, bedW = 1.3, bedZc = (bedZ0 + bedZ1) / 2, bedL = bedZ1 - bedZ0;
  addBox(bedW, 0.3, bedL, bedX, 0.15, bedZc, 0x6b4a2f, { block: true });
  addBox(bedW + 0.06, 0.9, 0.08, bedX, 0.45, -HD + 0.04, 0x5a3d26);
  addBox(bedW - 0.04, 0.2, bedL - 0.1, bedX, 0.4, bedZc + 0.02, 0xf2f2f2);                 // mattress
  addBox(bedW, 0.07, bedL * 0.62, bedX, 0.535, bedZ1 - bedL * 0.31, 0x1f4fbf, { collide: true }); // Chelsea-blue duvet
  addBox(bedW - 0.04, 0.02, bedL - 0.1, bedX, 0.505, bedZc + 0.02, 0xf2f2f2, { collide: true });
  addBox(0.62, 0.12, 0.38, bedX - 0.3, 0.57, -HD + 0.3, 0xffffff);                         // pillows
  addBox(0.55, 0.11, 0.36, bedX + 0.33, 0.565, -HD + 0.3, 0xffffff);
  addBox(0.06, 0.07, bedL * 0.62, bedX - bedW / 2 + 0.03, 0.56, bedZ1 - bedL * 0.31, 0xffffff); // duvet stripe
  label(scene, 'RONNIE CRATER\nDO NOT FALL IN', 0.5, 0.25, [bedX, 0.572, -0.85], [-Math.PI / 2, 0, 0], { bg: '#1f4fbf', fg: '#ffffff', border: '#ffffff' });
  label(scene, 'Midnight Snack Storage', 0.5, 0.16, [bedX - 0.3, 0.632, -HD + 0.3], [-Math.PI / 2, 0, 0], { bg: '#ffffff', fg: '#c0392b', border: null });

  // bedside table + framed photo of Tommy
  addBox(0.45, 0.5, 0.42, -2.2, 0.25, -1.95, 0x7a5535, { collide: true, block: true });
  addBox(0.2, 0.25, 0.03, -2.2, 0.63, -2.0, 0x2a2a2a, { rot: [-0.2, 0.6, 0] });
  label(scene, 'TOMMY\n\nTo Ronnie, from your older, better mate x', 0.17, 0.22, [-2.188, 0.632, -1.983], [-0.2, 0.6, 0], { bg: '#f7e9d0', fg: '#333', border: '#c9a227', size: 40 });

  // ---------------- under-bed box + dead scales ----------------
  addBox(0.5, 0.12, 0.35, -0.6, 0.06, -0.15, 0x9c7b52);
  label(scene, 'EMERGENCY SNACKS (DAY 1 OF 1)', 0.46, 0.1, [-0.6, 0.06, 0.026], [0, 0, 0], { bg: '#e6cfa3', fg: '#222', border: null, size: 44 });

  // ---------------- snack station (right in front of you) ----------------
  addBox(0.06, 0.82, 0.06, 0, 0.41, -0.25, 0x333333);
  addBox(0.36, 0.03, 0.36, 0, 0.015, -0.25, 0x333333);
  addBox(0.62, 0.04, 0.5, 0, 0.84, -0.25, 0xd8d0c4, { collide: true, block: true });
  label(scene, "RONNIE'S SNACK STATION", 0.6, 0.1, [0, 0.79, 0.0], [0, 0, 0], { bg: '#ffcc00', fg: '#111', border: null, size: 56 });
  // plate on the station
  parts.push(part(cyl(0.16, 0.13, 0.015, 24), 0xffffff, [0, 0.868, -0.25]));

  // ---------------- desk, monitor, gaming chair, mini fridge (window side) ----------------
  const deskX = HW - 0.33;
  addBox(0.62, 0.04, 1.6, deskX, 0.73, -1.2, 0x3b3b44, { collide: true, block: true });
  for (const z of [-1.95, -0.45]) addBox(0.04, 0.71, 0.04, deskX - 0.27, 0.355, z, 0x222222);
  addBox(0.25, 0.02, 0.18, deskX + 0.05, 0.76, -0.62, 0x111111);       // monitor foot
  addBox(0.03, 0.3, 0.03, deskX + 0.08, 0.9, -0.62, 0x111111);
  addBox(0.03, 0.34, 0.58, deskX + 0.06, 1.12, -0.62, 0x111111);
  label(scene, 'BE MORE TOMMY', 0.53, 0.3, [deskX + 0.04, 1.12, -0.62], [0, -Math.PI / 2, 0], { tex: absTex() });
  // mini fridge under the desk
  addBox(0.48, 0.55, 0.5, deskX + 0.02, 0.275, -1.65, 0xf5f5f5, { block: true });
  label(scene, 'A moment on the lips, a lifetime on Ronnie', 0.2, 0.14, [deskX - 0.225, 0.4, -1.75], [0, -Math.PI / 2, 0], { bg: '#ff6b9a', fg: '#fff', border: null, size: 40 });
  label(scene, 'SHOPPING LIST\n1. MONSTOR\n2. MONSTOR\n3. Food for MONSTOR', 0.16, 0.2, [deskX - 0.225, 0.3, -1.52], [0, -Math.PI / 2, 0], { bg: '#fffbe0', fg: '#1a3a8a', border: null, size: 36 });
  // gaming chair, facing the desk
  const cx = 1.45, cz = -1.15;
  addBox(0.52, 0.1, 0.52, cx, 0.5, cz, 0xb81d1d, { collide: true, block: true });
  addBox(0.1, 0.8, 0.52, cx - 0.26, 0.95, cz, 0x151515, { rot: [0, 0, 0.12] });
  addBox(0.11, 0.6, 0.3, cx - 0.255, 1.0, cz, 0xb81d1d, { rot: [0, 0, 0.12] });
  addBox(0.06, 0.42, 0.06, cx, 0.24, cz, 0x222222);
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; addBox(0.32, 0.03, 0.05, cx + Math.cos(a) * 0.16, 0.04, cz + Math.sin(a) * 0.16, 0x222222, { rot: [0, -a, 0] }); }
  label(scene, 'MAX LOAD: NOT YOU', 0.42, 0.14, [cx - 0.346, 1.02, cz], [0, -Math.PI / 2, 0.12], { bg: '#ffeb3b', fg: '#111', border: '#111', size: 52 });

  // ---------------- wardrobe (right, front) ----------------
  addBox(0.6, 2.1, 1.3, HW - 0.3, 1.05, 1.35, 0x8b6a4a, { block: true });
  label(scene, 'drawers', 0.56, 1.0, [HW - 0.602, 0.6, 1.35], [0, -Math.PI / 2, 0], { tex: drawersTex() });
  // mirror on the wardrobe door
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.9), new THREE.MeshPhongMaterial({ color: 0xbfd4e6, emissive: 0x2a3540, shininess: 120, specular: 0xffffff }));
  mirror.position.set(HW - 0.602, 1.6, 1.35); mirror.rotation.y = -Math.PI / 2; scene.add(mirror);
  label(scene, 'Objects in mirror are LARGER than they appear', 0.14, 0.14, [HW - 0.605, 1.85, 1.2], [0, -Math.PI / 2, 0.1], { bg: '#fff06a', fg: '#222', border: null, size: 34 });
  // gym bag, dusty
  addBox(0.5, 0.25, 0.25, 1.6, 0.125, 1.9, 0x3a3a3a);
  label(scene, 'First used: NEVER', 0.18, 0.08, [1.6, 0.18, 1.776], [0, 0, 0], { bg: '#fff', fg: '#333', border: null, size: 40 });

  // ---------------- bookshelf (back wall, right of bed) ----------------
  const bsx = 0.85;
  addBox(1.0, 1.6, 0.03, bsx, 0.8, -HD + 0.015, 0x6e5034);
  for (const x of [-0.5, 0.5]) addBox(0.03, 1.6, 0.3, bsx + x, 0.8, -HD + 0.15, 0x6e5034, { block: true });
  for (const y of [0.02, 0.55, 1.08, 1.59]) addBox(1.0, 0.03, 0.3, bsx, y, -HD + 0.15, 0x6e5034, { collide: true });
  label(scene, 'books', 0.94, 0.48, [bsx, 0.81, -HD + 0.22], [0, 0, 0], { tex: booksTex(0) });
  label(scene, 'books2', 0.94, 0.48, [bsx, 1.34, -HD + 0.22], [0, 0, 0], { tex: booksTex(1) });
  // trophies on the top
  addBox(0.08, 0.16, 0.08, bsx - 0.25, 1.69, -HD + 0.15, 0xd4af37);
  addBox(0.08, 0.16, 0.08, bsx + 0.2, 1.69, -HD + 0.15, 0xc0c0c0);
  label(scene, "WORLD'S OKAYEST EATER", 0.24, 0.07, [bsx - 0.25, 1.82, -HD + 0.16], [0, 0, 0], { bg: '#d4af37', fg: '#111', border: null, size: 30 });
  label(scene, 'MOST CHINS 2026', 0.22, 0.07, [bsx + 0.2, 1.82, -HD + 0.16], [0, 0, 0], { bg: '#c0c0c0', fg: '#111', border: null, size: 30 });

  // ---------------- bin, overflowing ----------------
  parts.push(part(cyl(0.17, 0.14, 0.45, 14), 0x7d8a8f, [-0.05, 0.225, -2.0]));
  blockers.push({ x0: -0.25, x1: 0.15, z0: -2.25, z1: -1.8, y1: 0.45 });
  label(scene, 'THIS BIN IS FULL. SO IS RONNIE.', 0.28, 0.14, [-0.05, 0.25, -1.82], [0, 0, 0], { bg: '#ffffff', fg: '#111', border: '#111', size: 40 });

  // ---------------- main door (left wall) — Tommy leans in here ----------------
  const doorZ = 0.9;
  addBox(0.05, 2.05, 0.9, -HW + 0.025, 1.025, doorZ, 0xf0e8da);
  addBox(0.04, 1.98, 0.8, -HW + 0.05, 0.99, doorZ, 0xa47a52);
  parts.push(part(new THREE.SphereGeometry(0.035, 10, 8), 0xd4af37, [-HW + 0.09, 1.0, doorZ + 0.3]));
  label(scene, "RONNIE'S ROOM\nWIDE LOAD ENTRANCE", 0.42, 0.22, [-HW + 0.075, 1.65, doorZ], [0, Math.PI / 2, 0], { bg: '#fff', fg: '#c0392b', border: '#c0392b', size: 44 });
  label(scene, 'WIPE YOUR CHINS', 0.75, 0.42, [-HW + 0.55, 0.004, doorZ], [-Math.PI / 2, 0, Math.PI / 2], { bg: '#8a6a3a', fg: '#2a1a08', border: '#5a4020', size: 70 });
  label(scene, 'height', 0.14, 1.9, [-HW + 0.005, 0.95, doorZ - 0.53], [0, Math.PI / 2, 0], { tex: heightTex(), w: 128, h: 1024 });
  label(scene, 'ON / OFF / SNACK', 0.1, 0.14, [-HW + 0.005, 1.2, doorZ + 0.6], [0, Math.PI / 2, 0], { bg: '#ffffff', fg: '#111', border: '#bbb', size: 34 });

  // ---------------- posters & wall jokes ----------------
  label(scene, 'WANTED: RONNIE', 0.6, 0.8, [bedX, 1.55, -HD + 0.005], [0, 0, 0], { tex: wantedTex() });
  label(scene, 'BE MORE TOMMY', 0.7, 0.95, [-0.6, 1.5, HD - 0.005], [0, Math.PI, 0], { tex: tommyPosterTex() });
  label(scene, 'clock', 0.42, 0.42, [-0.1, 1.95, -HD + 0.005], [0, 0, 0], { tex: clockTex() });
  label(scene, 'calendar', 0.42, 0.5, [-HW + 0.005, 1.5, -1.0], [0, Math.PI / 2, 0], { tex: calendarTex() });
  label(scene, 'MISSING: RONNIE\'S NECK\nREWARD', 0.5, 0.6, [0.9, 1.55, HD - 0.005], [0, Math.PI, 0], { title: 'MISSING', bg: '#fffdf2', fg: '#111', border: '#111', size: 60 });
  label(scene, 'scarf', 1.6, 0.22, [-HW + 0.005, 2.15, -0.5], [0, Math.PI / 2, 0], { tex: scarfTex(), w: 1024, h: 128 });
  label(scene, 'SMOKE ALARM\nALSO DETECTS KEBABS', 0.2, 0.2, [0.6, H - 0.005, 0.2], [Math.PI / 2, 0, 0], { bg: '#ffffff', fg: '#c0392b', border: '#ddd', size: 34 });
  // more jokes
  label(scene, 'HOUSE RULES\n1. No food after 10pm (ignored)\n2. No food before 10pm (ignored)\n3. Rule 1 and 2 are a joke (Ronnie)', 0.42, 0.38, [1.7, 1.6, HD - 0.005], [0, Math.PI, 0], { bg: '#fff8e7', fg: '#111', border: '#1f4fbf', size: 34 });
  label(scene, "RONNIE'S 5 A DAY:\n5 MONSTORS", 0.3, 0.22, [-1.6, 1.75, HD - 0.005], [0, Math.PI, 0], { bg: '#111', fg: '#39ff14', border: '#39ff14', size: 44 });
  label(scene, 'CERTIFICATE OF ACHIEVEMENT\nRonnie completed a walk\n(to the fridge and back)', 0.4, 0.28, [-HW + 0.005, 1.55, 1.85], [0, Math.PI / 2, 0], { bg: '#fffdf2', fg: '#111', border: '#d4af37', size: 34 });
  label(scene, 'DREAM: A PIE AT STAMFORD BRIDGE\n(achieved 40 times)', 0.4, 0.2, [-HW + 0.005, 1.85, -1.75], [0, Math.PI / 2, 0], { bg: '#034694', fg: '#fff', border: '#fff', size: 34 });
  label(scene, 'GYM MEMBERSHIP\nVisits: 0\nVending machine visits: 212', 0.3, 0.24, [HW - 0.005, 1.6, 1.9], [0, -Math.PI / 2, 0], { bg: '#fff', fg: '#c0392b', border: '#c0392b', size: 34 });
  label(scene, 'OYSTERFLEET STAFF BADGE: RONNIE\nPosition: Barman\nSpecialist subject: the crisp clip', 0.26, 0.16, [1.35, 1.6, HD - 0.005], [0, Math.PI, 0], { bg: '#1b3a2a', fg: '#d4af37', border: '#d4af37', size: 30 });
  // pizza-shaped rug
  const rug = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40), new THREE.MeshLambertMaterial({ map: pizzaRugTex(), transparent: false }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0.35, 0.003, 0.75); scene.add(rug);

  // ceiling lamp
  addBox(0.4, 0.04, 0.4, 0, H - 0.02, 0.3, 0xffffff);
  const lampGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 20), new THREE.MeshBasicMaterial({ color: 0xfff1d6 }));
  lampGlow.position.set(0, H - 0.045, 0.3); scene.add(lampGlow);

  // ---------------- merged static mesh ----------------
  const staticMesh = new THREE.Mesh(merge(parts), vcLambert);
  scene.add(staticMesh);

  // ---------------- MONSTOR cans all over the floor (one instanced draw call) ----------------
  scatterCans(scene, blockers);

  // ---------------- lighting ----------------
  // Warm morning sun through the blinds #FFD9A0, soft blue sky fill #9DB7FF (section 33).
  const hemi = new THREE.HemisphereLight(0xc9d6ff, 0x9a7050, 1.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.6);
  sun.position.set(6, 4.5, -1.6); sun.target.position.set(0, 0, -0.7);
  scene.add(sun, sun.target);
  // (no ceiling point light — every extra light costs per-pixel work on Quest)

  // sunbeams + floor stripes + dust (all fake, all cheap)
  const beamMat = new THREE.MeshBasicMaterial({ map: beamTex(), color: 0xffd9a0, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beams = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 2.6), beamMat);
    b.position.set(0, -1.3, 0); // pivot at top
    const piv = new THREE.Group(); piv.add(b);
    piv.position.set(HW - 0.05, 1.85 - i * 0.28, wzc + (i - 1) * 0.35);
    piv.rotation.set(0, i * 0.4, 0.95);
    beams.add(piv);
  }
  scene.add(beams);
  const stripes = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.3), new THREE.MeshBasicMaterial({ map: stripesTex(), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  stripes.rotation.x = -Math.PI / 2; stripes.position.set(0.95, 0.006, wzc + 0.1); scene.add(stripes);

  const dustN = 70, dp = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) { dp[i * 3] = 1.2 + Math.random() * 1.2; dp[i * 3 + 1] = 0.4 + Math.random() * 1.6; dp[i * 3 + 2] = wzc - 0.8 + Math.random() * 1.6; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xfff0c8, size: 0.006, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(dust);

  // Food spawn spots and Tommy hang-out spots
  const spawns = [
    [-0.12, 0.92, -0.3], [0.12, 0.92, -0.2], [0.0, 0.92, -0.38], [0.2, 0.92, -0.4], [-0.2, 0.92, -0.12], // snack station
    [deskX - 0.1, 0.81, -1.75], [deskX - 0.1, 0.81, -1.3], [deskX - 0.12, 0.81, -0.95],                 // desk
    [bedX + 0.2, 0.64, -0.75], [bedX - 0.3, 0.64, -0.55],                                              // bed
    [-2.2, 0.58, -1.85], [cx, 0.6, cz], [bsx, 0.62, -HD + 0.15],
  ].map(a => new THREE.Vector3(...a));
  const tommySpots = [[-1.95, 0.9], [1.05, 0.15], [-1.4, 1.65], [0.95, 1.6], [-1.9, -0.2]].map(([x, z]) => new THREE.Vector2(x, z));

  let t = 0;
  return {
    colliders, blockers, spawns, tommySpots, hemi, sun,
    bounds: { x0: -HW, x1: HW, z0: -HD, z1: HD, y1: H },
    update(dt) {
      t += dt;
      dust.rotation.y = Math.sin(t * 0.05) * 0.03;
      dust.position.y = Math.sin(t * 0.3) * 0.03;
      beamMat.opacity = 0.14 + Math.sin(t * 0.7) * 0.02;
    },
  };
}

// ---------- helpers ----------
const labelGeoCache = new Map();
function label(scene, text, w, h, pos, rot, opts = {}) {
  const tex = opts.tex || signTex(text, {
    w: 512, h: Math.max(64, Math.round(512 * h / w / 32) * 32 || 64),
    bg: opts.bg, fg: opts.fg, border: opts.border === undefined ? '#c0392b' : opts.border, size: opts.size || 64, title: opts.title,
  });
  const key = w + 'x' + h;
  if (!labelGeoCache.has(key)) labelGeoCache.set(key, new THREE.PlaneGeometry(w, h));
  const m = new THREE.Mesh(labelGeoCache.get(key), new THREE.MeshLambertMaterial({ map: tex }));
  m.position.set(...pos); m.rotation.set(...rot);
  scene.add(m);
  return m;
}

function scatterCans(scene, blockers) {
  const parts = [
    part(cyl(0.033, 0.033, 0.15, 10), 0x111111),
    part(cyl(0.034, 0.034, 0.03, 10), 0x39ff14, [0, 0.04, 0]),
    part(cyl(0.03, 0.033, 0.01, 10), 0xc8c8c8, [0, 0.08, 0]),
  ];
  const geo = merge(parts);
  const count = 70;
  const im = new THREE.InstancedMesh(geo, vcLambert, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  let n = 0, tries = 0;
  while (n < count && tries++ < 3000) {
    const x = (Math.random() - 0.5) * 4.7, z = (Math.random() - 0.5) * 4.2;
    if (Math.hypot(x - 0.1, z - 0.4) < 1.0) continue;               // keep your standing spot clear
    if (Math.hypot(x + 2.0, z - 0.9) < 0.6) continue;               // keep the doorway clear for Tommy
    if (blockers.some(b => x > b.x0 - 0.04 && x < b.x1 + 0.04 && z > b.z0 - 0.04 && z < b.z1 + 0.04)) continue;
    const standing = Math.random() < 0.2;
    p.set(x, standing ? 0.075 : 0.033, z);
    e.set(standing ? 0 : Math.PI / 2, Math.random() * Math.PI * 2, 0, 'YXZ');
    q.setFromEuler(e); m.compose(p, q, s); im.setMatrixAt(n++, m);
  }
  // a pile in the bin
  for (let i = 0; i < 8 && n < count; i++) {
    p.set(-0.05 + (Math.random() - 0.5) * 0.18, 0.47 + Math.random() * 0.08, -2.0 + (Math.random() - 0.5) * 0.18);
    e.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); q.setFromEuler(e); m.compose(p, q, s); im.setMatrixAt(n++, m);
  }
  im.count = n;
  im.instanceMatrix.needsUpdate = true;
  scene.add(im);
}

function streetTex() {
  return canvasTex(1024, 768, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.7);
    sky.addColorStop(0, '#7fb2ff'); sky.addColorStop(1, '#ffe2b8');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff6d6'; g.beginPath(); g.arc(w * 0.78, h * 0.22, 60, 0, 7); g.fill();
    // terraced houses across the road
    const cols = ['#b5523b', '#c46a4a', '#a8473a', '#cf8a5c', '#9e5040'];
    for (let i = 0; i < 6; i++) {
      const x = i * 180 - 20;
      g.fillStyle = cols[i % cols.length]; g.fillRect(x, h * 0.3, 175, h * 0.45);
      g.fillStyle = '#333'; g.beginPath(); g.moveTo(x - 5, h * 0.3); g.lineTo(x + 87, h * 0.2); g.lineTo(x + 180, h * 0.3); g.fill();
      g.fillStyle = '#dfeeff';
      for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) g.fillRect(x + 25 + k * 80, h * 0.36 + j * 0.15 * h, 50, 60);
    }
    g.fillStyle = '#5a5a5a'; g.fillRect(0, h * 0.75, w, h * 0.25);
    g.fillStyle = '#9a9a9a'; g.fillRect(0, h * 0.73, w, h * 0.03);
    g.fillStyle = '#fff'; for (let x = 0; x < w; x += 120) g.fillRect(x, h * 0.88, 60, 8);
    // the sign
    g.fillStyle = '#666'; g.fillRect(w * 0.42, h * 0.45, 10, h * 0.32);
    g.fillStyle = '#fff'; g.fillRect(w * 0.3, h * 0.38, w * 0.26, h * 0.12);
    g.strokeStyle = '#c0392b'; g.lineWidth = 8; g.strokeRect(w * 0.3, h * 0.38, w * 0.26, h * 0.12);
    fitText(g, 'RONNIE EXCLUSION ZONE 50M', w * 0.31, h * 0.385, w * 0.24, h * 0.11, 40, { color: '#c0392b' });
  });
}

function wantedTex() {
  return canvasTex(384, 512, (g, w, h) => {
    g.fillStyle = '#e8d3a2'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(120,80,30,0.25)'; for (let i = 0; i < 30; i++) g.fillRect(Math.random() * w, Math.random() * h, 40, 3);
    fitText(g, 'WANTED', 20, 14, w - 40, 90, 90, { color: '#3a2410' });
    // a very round silhouette
    g.fillStyle = '#3a2410'; g.beginPath(); g.ellipse(w / 2, 250, 120, 110, 0, 0, 7); g.fill();
    g.beginPath(); g.arc(w / 2, 150, 48, 0, 7); g.fill();
    fitText(g, 'RONNIE', 20, 370, w - 40, 60, 60, { color: '#3a2410' });
    fitText(g, 'LAST SEEN EATING', 20, 430, w - 40, 60, 40, { color: '#7a1a10' });
  });
}

function tommyPosterTex() {
  return canvasTex(384, 512, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#1b1b2f'); bg.addColorStop(1, '#4a2a6a');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // spotlight
    g.fillStyle = 'rgba(255,240,200,0.18)'; g.beginPath(); g.moveTo(w / 2 - 30, 0); g.lineTo(w / 2 + 30, 0); g.lineTo(w - 20, h); g.lineTo(20, h); g.fill();
    // Tommy: head, curtains, abs
    g.fillStyle = '#e8b896'; g.fillRect(w / 2 - 80, 200, 160, 210); // torso
    g.strokeStyle = 'rgba(150,90,60,0.7)'; g.lineWidth = 4;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { g.strokeRect(w / 2 - 44 + c * 46, 255 + r * 45, 42, 40); }
    g.beginPath(); g.arc(w / 2, 150, 55, 0, 7); g.fillStyle = '#e8b896'; g.fill();
    g.fillStyle = '#7a4f2a'; g.beginPath(); g.ellipse(w / 2 - 28, 108, 34, 22, 0.4, 0, 7); g.ellipse(w / 2 + 28, 108, 34, 22, -0.4, 0, 7); g.fill();
    g.fillStyle = '#8b5e34'; g.beginPath(); g.ellipse(w / 2, 185, 42, 22, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#fff'; g.fillRect(w / 2 - 18, 172, 36, 8);
    g.fillStyle = '#fff'; g.font = `900 34px ${FONT}`; g.textAlign = 'center'; g.fillText('✦', w / 2 + 30, 172);
    fitText(g, 'BE MORE TOMMY', 10, 420, w - 20, 80, 56, { color: '#ffd84d' });
    fitText(g, 'older. better. one day.', 10, 10, w - 20, 50, 30, { color: '#ffffff' });
  });
}

function absTex() {
  return canvasTex(512, 288, (g, w, h) => {
    g.fillStyle = '#0d2244'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8b896'; g.fillRect(w / 2 - 120, 20, 240, h - 20);
    g.strokeStyle = 'rgba(140,80,50,0.8)'; g.lineWidth = 6;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) g.strokeRect(w / 2 - 80 + c * 84, 40 + r * 70, 76, 62);
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, h - 40, w, 40);
    fitText(g, "TOMMY'S ABS (WALLPAPER)", 10, h - 40, w - 20, 40, 26, { color: '#fff' });
  });
}

function drawersTex() {
  return canvasTex(256, 512, (g, w, h) => {
    const labels = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'PARACHUTE'];
    const dh = h / labels.length;
    labels.forEach((l, i) => {
      g.fillStyle = i % 2 ? '#94724f' : '#9c7a56'; g.fillRect(0, i * dh, w, dh);
      g.strokeStyle = '#5a4026'; g.lineWidth = 4; g.strokeRect(6, i * dh + 4, w - 12, dh - 8);
      g.fillStyle = '#f7f0dc'; g.fillRect(w / 2 - 70, i * dh + dh / 2 - 22, 140, 44);
      fitText(g, l, w / 2 - 66, i * dh + dh / 2 - 22, 132, 44, 34, { color: '#222' });
    });
  });
}

function booksTex(row) {
  const titles = row === 0
    ? ['War and Pies', '50 Shades of Gravy', 'Lord of the Onion Rings', 'The Very Hungry Ronnie', 'Harry Potter and the Chamber of Chips', 'Ronnie: A Big Life']
    : ['How to Lose Weight (unopened)', 'The Hungry Hungry Ronnie', 'Of Mice and Mayo', 'The Lord of the Fries', 'Pride and Pastry'];
  return canvasTex(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#4a3420'; g.fillRect(0, 0, w, h);
    const cols = ['#c0392b', '#27ae60', '#2c3e50', '#8e44ad', '#d35400', '#16a085', '#f1c40f'];
    let x = 6;
    titles.forEach((t, i) => {
      const bw = Math.floor((w - 12) / titles.length) - 4;
      const bh = h - 20 - (i % 3) * 14;
      g.fillStyle = (row === 1 && i === 0) ? '#e8f4ff' : cols[(i + row * 3) % cols.length];
      g.fillRect(x, h - bh, bw, bh);
      g.save(); g.translate(x + bw / 2, h - bh / 2); g.rotate(-Math.PI / 2);
      fitText(g, t, -bh / 2 + 8, -bw / 2 + 4, bh - 16, bw - 8, 26, { color: '#fff' });
      g.restore();
      if (row === 1 && i === 0) { g.strokeStyle = 'rgba(180,220,255,0.9)'; g.lineWidth = 3; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(x, h - bh + k * 50); g.lineTo(x + bw, h - bh + k * 50 + 30); g.stroke(); } }
      x += bw + 4;
    });
  });
}

function clockTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(w / 2, h / 2, 124, 0, 7); g.fill();
    g.strokeStyle = '#c0392b'; g.lineWidth = 10; g.stroke();
    const foods = ['🍔', '🍕', '🍩', '🌭', '🍟', '🍗', '🌮', '🍰', '🍪', '🥤', '🍫', '🧁'];
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '28px sans-serif';
    foods.forEach((f, i) => { const a = (i + 1) / 12 * Math.PI * 2 - Math.PI / 2; g.fillText(f, w / 2 + Math.cos(a) * 92, h / 2 + Math.sin(a) * 92); });
    g.fillStyle = '#555'; g.fillRect(w / 2 - 3, h / 2 - 70, 6, 70);   // fork
    g.fillRect(w / 2 - 12, h / 2 - 82, 4, 16); g.fillRect(w / 2 + 8, h / 2 - 82, 4, 16); g.fillRect(w / 2 - 2, h / 2 - 82, 4, 16);
    g.save(); g.translate(w / 2, h / 2); g.rotate(1.9); g.fillRect(-3, -50, 6, 50); g.beginPath(); g.ellipse(0, -58, 10, 14, 0, 0, 7); g.fill(); g.restore(); // spoon
    g.font = `900 16px ${FONT}`; g.fillStyle = '#c0392b'; g.fillText("SNACK O'CLOCK", w / 2, h / 2 + 40);
  });
}

function calendarTex() {
  return canvasTex(384, 448, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c0392b'; g.fillRect(0, 0, w, 70);
    fitText(g, 'NOVEMBER', 10, 5, w - 20, 60, 44, { color: '#fff' });
    const cw = w / 7, ch = (h - 80) / 5;
    for (let i = 0; i < 35; i++) {
      const x = (i % 7) * cw, y = 80 + Math.floor(i / 7) * ch;
      g.strokeStyle = '#ddd'; g.lineWidth = 2; g.strokeRect(x, y, cw, ch);
      g.fillStyle = '#999'; g.font = `700 12px Arial`; g.textAlign = 'left'; g.fillText(String((i % 30) + 1), x + 4, y + 14);
      if (i === 17) { g.fillStyle = '#ffe26a'; g.fillRect(x + 2, y + 18, cw - 4, ch - 20); fitText(g, "TOMMY'S BDAY (THE BETTER ONE)", x + 3, y + 18, cw - 6, ch - 20, 12, { color: '#111' }); }
      else if (i === 18) fitText(g, "Ronnie's (whatever)", x + 3, y + 18, cw - 6, ch - 20, 11, { color: '#888' });
      else { g.strokeStyle = 'rgba(220,40,40,0.8)'; g.lineWidth = 3; g.beginPath(); g.ellipse(x + cw / 2, y + ch / 2 + 6, cw / 2 - 5, ch / 2 - 12, 0, 0, 7); g.stroke(); fitText(g, 'CHEAT DAY', x + 4, y + 18, cw - 8, ch - 20, 11, { color: '#c0392b' }); }
    }
  });
}

function scarfTex() {
  return canvasTex(1024, 128, (g, w, h) => {
    for (let x = 0; x < w; x += 64) { g.fillStyle = (x / 64) % 2 ? '#ffffff' : '#1f4fbf'; g.fillRect(x, 0, 64, h); }
    g.fillStyle = '#1f4fbf'; g.fillRect(w * 0.25, 10, w * 0.5, h - 20);
    fitText(g, 'IT ONLY FITS LIKE THIS NOW', w * 0.26, 12, w * 0.48, h - 24, 64, { color: '#fff' });
  });
}

function heightTex() {
  return canvasTex(128, 1024, (g, w, h) => {
    g.fillStyle = '#fbf4e4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#999';
    for (let y = 0; y < h; y += 27) g.fillRect(0, y, y % 135 === 0 ? 40 : 20, 3);
    // Tommy 168cm (perfect), Ronnie marks by WIDTH
    const yFor = (cm) => h - (cm / 190) * h;
    g.fillStyle = '#1a7a3a'; g.fillRect(0, yFor(168), w, 6);
    fitText(g, 'Tommy (perfect)', 4, yFor(168) - 46, w - 8, 40, 22, { color: '#1a7a3a' });
    g.fillStyle = '#c0392b'; g.fillRect(0, yFor(178), w, 6);
    fitText(g, 'Ronnie: WIDE', 4, yFor(178) - 40, w - 8, 36, 22, { color: '#c0392b' });
    fitText(g, 'Ronnie (sideways): WIDER', 4, yFor(110), w - 8, 70, 20, { color: '#c0392b' });
  });
}

function pizzaRugTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#d99a3e'; g.beginPath(); g.arc(w / 2, h / 2, 256, 0, 7); g.fill();
    g.fillStyle = '#f6c548'; g.beginPath(); g.arc(w / 2, h / 2, 215, 0, 7); g.fill();
    g.fillStyle = '#e3542e';
    for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 40 + (i * 53) % 160; g.beginPath(); g.arc(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r, 26, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(160,100,30,0.6)'; g.lineWidth = 5;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a) * 250, h / 2 + Math.sin(a) * 250); g.stroke(); }
  });
}
