// Juice: crumb bursts (one instanced draw call), comic impact words, and a
// full-view colour tint (Mango Loco orange / veg-gag green).
import * as THREE from 'three';
import { canvasTex, FONT } from './textures.js';

const MAX_CRUMBS = 160;

export class Crumbs {
  constructor(scene) {
    const geo = new THREE.BoxGeometry(0.012, 0.012, 0.012);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), MAX_CRUMBS);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.p = new Float32Array(MAX_CRUMBS * 3);
    this.v = new Float32Array(MAX_CRUMBS * 3);
    this.life = new Float32Array(MAX_CRUMBS);
    this.size = new Float32Array(MAX_CRUMBS);
    this.next = 0;
    this.active = 0;
    this._m = new THREE.Matrix4(); this._c = new THREE.Color();
    for (let i = 0; i < MAX_CRUMBS; i++) { this.mesh.setColorAt(i, this._c.set(0xffffff)); }
    this._m.makeScale(0, 0, 0);
    for (let i = 0; i < MAX_CRUMBS; i++) this.mesh.setMatrixAt(i, this._m);
    scene.add(this.mesh);
  }

  burst(pos, colors, count = 22, speed = 1.6, dir = null) {
    for (let k = 0; k < count; k++) {
      const i = this.next; this.next = (this.next + 1) % MAX_CRUMBS;
      this.p[i * 3] = pos.x; this.p[i * 3 + 1] = pos.y; this.p[i * 3 + 2] = pos.z;
      let vx = (Math.random() - 0.5) * 2, vy = Math.random() * 1.2, vz = (Math.random() - 0.5) * 2;
      if (dir) { vx += dir.x * 1.5; vy += dir.y * 1.5; vz += dir.z * 1.5; }
      const s = speed * (0.4 + Math.random() * 0.8);
      this.v[i * 3] = vx * s; this.v[i * 3 + 1] = vy * s; this.v[i * 3 + 2] = vz * s;
      this.life[i] = 0.9 + Math.random() * 0.8;
      this.size[i] = 0.5 + Math.random() * 1.2;
      this.mesh.setColorAt(i, this._c.set(colors[k % colors.length]));
    }
    this.mesh.instanceColor.needsUpdate = true;
    this.active = 2.0;
  }

  update(dt) {
    if (this.active <= 0) return;
    this.active -= dt;
    const m = this._m;
    for (let i = 0; i < MAX_CRUMBS; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const j = i * 3;
      this.v[j + 1] -= 9.8 * dt;
      this.p[j] += this.v[j] * dt; this.p[j + 1] += this.v[j + 1] * dt; this.p[j + 2] += this.v[j + 2] * dt;
      if (this.p[j + 1] < 0.006) { this.p[j + 1] = 0.006; this.v[j + 1] *= -0.25; this.v[j] *= 0.5; this.v[j + 2] *= 0.5; }
      const s = this.life[i] > 0 ? this.size[i] * Math.min(1, this.life[i] * 3) : 0;
      m.makeScale(s, s, s); m.setPosition(this.p[j], this.p[j + 1], this.p[j + 2]);
      this.mesh.setMatrixAt(i, m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// Comic-book words that pop up and float away: CHOMP! THWACK! SPLAT!
const wordTexCache = new Map();
function wordTex(word, color) {
  const key = word + color;
  if (wordTexCache.has(key)) return wordTexCache.get(key);
  const t = canvasTex(512, 192, (g, w, h) => {
    g.font = `900 120px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 26; g.strokeStyle = '#111'; g.strokeText(word, w / 2, h / 2 + 6);
    g.lineWidth = 12; g.strokeStyle = '#fff'; g.strokeText(word, w / 2, h / 2);
    g.fillStyle = color; g.fillText(word, w / 2, h / 2);
  }, { mips: false });
  wordTexCache.set(key, t);
  return t;
}

export class Words {
  constructor(scene) {
    this.pool = [];
    this.live = [];
    this.scene = scene;
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false }));
      s.renderOrder = 10; s.visible = false; scene.add(s); this.pool.push(s);
    }
  }
  show(word, pos, color = '#ffd400', size = 0.35, life = 1.0) {
    const s = this.pool.pop() || this.live.shift()?.s;
    if (!s) return;
    s.material.map = wordTex(word, color); s.material.needsUpdate = true;
    s.material.opacity = 1;
    s.position.copy(pos);
    s.visible = true;
    this.live.push({ s, t: 0, life, size, vy: 0.35 });
  }
  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const w = this.live[i];
      w.t += dt;
      const k = w.t / w.life;
      const pop = k < 0.15 ? k / 0.15 * 1.25 : 1.25 - Math.min(0.25, (k - 0.15) * 2);
      w.s.scale.set(w.size * 2.67 * pop, w.size * pop, 1);
      w.s.position.y += w.vy * dt;
      w.s.material.opacity = k > 0.7 ? Math.max(0, 1 - (k - 0.7) / 0.3) : 1;
      if (k >= 1) { w.s.visible = false; this.live.splice(i, 1); this.pool.push(w.s); }
    }
  }
}

// A small sphere around the head, drawn last, tinting the whole view.
export class Tint {
  constructor(camera) {
    this.mat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false, depthWrite: false });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), this.mat);
    this.mesh.renderOrder = 20;
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    camera.add(this.mesh);
    this.target = 0; this.color = new THREE.Color(0xff8800);
  }
  set(colorHex, opacity) { this.color.set(colorHex); this.target = opacity; }
  update(dt) {
    const o = this.mat.opacity + (this.target - this.mat.opacity) * Math.min(1, dt * 6);
    this.mat.opacity = o < 0.003 && this.target === 0 ? 0 : o;
    this.mat.color.lerp(this.color, Math.min(1, dt * 8));
    this.mesh.visible = this.mat.opacity > 0;
  }
}
