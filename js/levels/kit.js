// Level-building kit: furniture made of coloured boxes merged into one mesh,
// walls, textured floors, signs, food spots and lights. Every level returns the
// same "room" object the game uses (bounds, colliders, blockers, spawns...).
import * as THREE from 'three';
import { part, merge, vcLambert, box, cyl } from '../geo.js';
import { canvasTex, signTex, fitText, FONT } from '../textures.js';
import { NavGrid } from '../nav.js';

export class Kit {
  constructor(scene, bounds) {
    this.scene = scene;
    this.bounds = bounds;            // { x0, x1, z0, z1, y1 }
    this.parts = [];
    this.colliders = [];             // surfaces food can land on / bounce off
    this.blockers = [];              // solid footprints (people walk round them)
    this.spawns = [];                // where food appears
    this.geoCache = new Map();
  }
  // a coloured box; collide = food can sit on it, block = people/Ronnie can't walk through
  box(w, h, d, x, y, z, color, { collide = false, block = false, rot = null } = {}) {
    this.parts.push(part(box(w, h, d), color, [x, y, z], rot || [0, 0, 0]));
    if (collide) this.colliders.push({ min: new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2), max: new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2) });
    if (block) this.blockers.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y1: y + h / 2 });
  }
  cyl(rt, rb, h, x, y, z, color, seg = 16, { block = false, collide = false } = {}) {
    this.parts.push(part(cyl(rt, rb, h, seg), color, [x, y, z]));
    const r = Math.max(rt, rb);
    if (block) this.blockers.push({ x0: x - r, x1: x + r, z0: z - r, z1: z + r, y1: y + h / 2 });
    if (collide) this.colliders.push({ min: new THREE.Vector3(x - r * 0.7, y - h / 2, z - r * 0.7), max: new THREE.Vector3(x + r * 0.7, y + h / 2, z + r * 0.7) });
  }
  // an axis-aligned wall from (x0,z0) to (x1,z1); one of the two must match
  wall(x0, z0, x1, z1, h, color = 0xe9dcc6, thick = 0.2) {
    const w = Math.max(Math.abs(x1 - x0), thick), d = Math.max(Math.abs(z1 - z0), thick);
    this.box(w, h, d, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, color, { collide: true, block: true });
  }
  floor(x0, z0, x1, z1, tex, y = 0.002, repeat = 1) {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    const t = tex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set((x1 - x0) / repeat, (z1 - z0) / repeat);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: t }));
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    this.scene.add(m);
    return m;
  }
  ceiling(color = 0xf2ece2, emissive = 0x6a5e4c) {
    const b = this.bounds;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(b.x1 - b.x0, b.z1 - b.z0), new THREE.MeshLambertMaterial({ color, emissive }));
    m.rotation.x = Math.PI / 2; m.position.set((b.x0 + b.x1) / 2, b.y1, (b.z0 + b.z1) / 2);
    this.scene.add(m);
  }
  // a sign / poster (text, or a ready-made texture)
  label(text, w, h, pos, rot, opts = {}) {
    const tex = opts.tex || signTex(text, { w: 512, h: Math.max(64, Math.min(1024, Math.round(512 * h / w / 32) * 32)), bg: opts.bg, fg: opts.fg, border: opts.border === undefined ? '#c0392b' : opts.border, size: opts.size || 64, title: opts.title });
    const key = w + 'x' + h;
    if (!this.geoCache.has(key)) this.geoCache.set(key, new THREE.PlaneGeometry(w, h));
    const mat = opts.glow ? new THREE.MeshBasicMaterial({ map: tex }) : new THREE.MeshLambertMaterial({ map: tex });
    const m = new THREE.Mesh(this.geoCache.get(key), mat);
    m.position.set(...pos); m.rotation.set(...rot);
    this.scene.add(m);
    return m;
  }
  // a table with chairs; its top is a food spot. seats: chairs per long side
  table(x, z, w, d, { h = 0.76, top = 0x8a5a2b, legs = 0x4a3020, chairs = 2, chairColor = 0x5a3a22, cloth = null, round = false, spots = 2 } = {}) {
    if (round) {
      this.cyl(w / 2, w / 2, 0.04, x, h - 0.02, z, cloth || top, 24, { collide: true });
      this.cyl(0.05, 0.08, h - 0.04, x, (h - 0.04) / 2, z, legs, 10);
      if (cloth) this.cyl(w / 2 + 0.01, w / 2 + 0.06, 0.3, x, h - 0.17, z, cloth, 24);
      this.blockers.push({ x0: x - w / 2, x1: x + w / 2, z0: z - w / 2, z1: z + w / 2, y1: h });
    } else {
      this.box(w, 0.05, d, x, h - 0.025, z, cloth || top, { collide: true, block: true });
      if (cloth) this.box(w + 0.04, 0.25, d + 0.04, x, h - 0.15, z, cloth);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box(0.06, h - 0.05, 0.06, x + sx * (w / 2 - 0.08), (h - 0.05) / 2, z + sz * (d / 2 - 0.08), legs);
    }
    // chairs along the long sides
    const alongX = w >= d, n = chairs, len = alongX ? w : d;
    for (let i = 0; i < n; i++) for (const side of [-1, 1]) {
      const t = (i + 0.5) / n - 0.5;
      const cx = alongX ? x + t * len : x + side * (w / 2 + 0.32), cz = alongX ? z + side * (d / 2 + 0.32) : z + t * len;
      this.chair(cx, cz, alongX ? (side > 0 ? 0 : Math.PI) : (side > 0 ? -Math.PI / 2 : Math.PI / 2), chairColor);
    }
    for (let i = 0; i < spots; i++) {
      const t = spots === 1 ? 0 : (i / (spots - 1) - 0.5) * 0.6;
      this.spawns.push(new THREE.Vector3(alongX ? x + t * w : x, h + 0.08, alongX ? z : z + t * d));
    }
  }
  // ry = direction the chair faces (0 = toward -z)
  chair(x, z, ry, color = 0x5a3a22) {
    const c = Math.cos(ry), s = Math.sin(ry);
    this.box(0.42, 0.05, 0.42, x, 0.45, z, color);
    const bx = x + s * 0.2, bz = z + c * 0.2;   // backrest behind the seat
    this.box(Math.abs(c) * 0.42 + 0.04, 0.45, Math.abs(s) * 0.42 + 0.04, bx, 0.7, bz, color);
    for (const a of [-1, 1]) for (const b of [-1, 1]) this.box(0.04, 0.44, 0.04, x + a * 0.17, 0.22, z + b * 0.17, 0x2a1a10);
  }
  stool(x, z, color = 0x7a1f24) {
    this.cyl(0.18, 0.18, 0.06, x, 0.75, z, color, 14);
    this.cyl(0.03, 0.05, 0.72, x, 0.36, z, 0x222222, 8);
    this.blockers.push({ x0: x - 0.18, x1: x + 0.18, z0: z - 0.18, z1: z + 0.18, y1: 0.78 });
  }
  // a warm glowing lamp (no real light: just an emissive shade)
  lamp(x, y, z, color = 0xffd9a0, size = 0.18) {
    this.lampGeo = this.lampGeo || new THREE.SphereGeometry(1, 12, 8);
    this.lampMat = this.lampMat || new Map();
    if (!this.lampMat.has(color)) this.lampMat.set(color, new THREE.MeshBasicMaterial({ color }));
    const m = new THREE.Mesh(this.lampGeo, this.lampMat.get(color));
    m.scale.setScalar(size); m.position.set(x, y, z); this.scene.add(m);
  }
  finish({ sky = 0xffe6c4, ground = 0x5a3a22, hemiI = 1.6, sun = 0xffe0b0, sunI = 1.6, sunPos = [5, 9, 4], start, board, startFood, spotCount = 30, name } = {}) {
    const mesh = new THREE.Mesh(merge(this.parts), vcLambert);
    this.scene.add(mesh);
    const hemi = new THREE.HemisphereLight(sky, ground, hemiI);
    this.scene.add(hemi);
    this.scene.add(new THREE.AmbientLight(0xfff0dc, 0.55));     // big rooms need a little fill everywhere
    const dl = new THREE.DirectionalLight(sun, sunI); dl.position.set(...sunPos); this.scene.add(dl);
    const room = {
      name, big: true,
      colliders: this.colliders, blockers: this.blockers, spawns: this.spawns, bounds: this.bounds,
      hemi, sun: dl, start, board, startFood,
      update() {},
    };
    room.nav = new NavGrid(room);
    room.tommySpots = room.nav.sampleSpots(spotCount);
    return room;
  }
}

// ---- shared textures ----
export function carpetTex(base = '#5a1e14', fleck = '#8a3a22', gold = '#b8862e') {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { g.fillStyle = Math.random() < 0.5 ? fleck : 'rgba(0,0,0,0.18)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.strokeStyle = gold; g.lineWidth = 3;
    for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) {
      g.beginPath(); g.moveTo(x + 32, y + 8); g.lineTo(x + 56, y + 32); g.lineTo(x + 32, y + 56); g.lineTo(x + 8, y + 32); g.closePath(); g.stroke();
      g.fillStyle = gold; g.beginPath(); g.arc(x + 32, y + 32, 4, 0, 7); g.fill();
    }
  });
}
export function tileTex(a = '#9a9183', b = '#8a8173', line = '#6d665a', size = 64) {
  return canvasTex(256, 256, (g, w, h) => {
    for (let y = 0; y < h; y += size) for (let x = 0; x < w; x += size) {
      g.fillStyle = ((x + y) / size) % 2 ? a : b; g.fillRect(x, y, size, size);
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(x + Math.random() * size, y + Math.random() * size, 3, 3); }
    }
    g.strokeStyle = line; g.lineWidth = 2;
    for (let p = 0; p <= w; p += size) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); }
  });
}
export function woodTex(c = '#7a4e2a') {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = c; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y, w, 2); for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(40,20,5,0.15)'; g.beginPath(); g.moveTo(0, y + 5 + i * 4); g.bezierCurveTo(80, y + 2 + i * 5, 170, y + 9 + i * 3, w, y + 5 + i * 4); g.stroke(); } }
  });
}
export { canvasTex, signTex, fitText, FONT };
