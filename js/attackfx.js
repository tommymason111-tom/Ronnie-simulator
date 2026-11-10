// Visual effects for the squad's attacks on Ronnie:
//  - the ATTACK CARD: a big animated card that slams in front of your face
//    (person's colour, icon, "AIDAN FORCES YOU TO HAVE ONE MORE BEER!", effect)
//  - camera props: things held right in front of your face (Aidan's pint being
//    tipped into you, Harry's dating app, Chloe's salad bowl)
//  - floating music notes, fizz spray, flash bursts
//  - Ben's cut scene: a trip to Turkey for a new hairline (7 seconds)
// Everything is attached to the camera, so it works in the headset and on a phone.
import * as THREE from 'three';
import { FONT, roundRect } from './textures.js';
import { drawTurkey, OVERLAYS } from './cutscenes.js';

const _v = new THREE.Vector3();

export class AttackFX {
  constructor(scene, camera, player) {
    this.scene = scene; this.camera = camera; this.player = player;
    this.items = [];          // { obj, t, dur, update(t, obj), parent }
    this.parts = [];          // particles { sprite, vel, life, max }
    // the card
    this.cardCanvas = document.createElement('canvas'); this.cardCanvas.width = 1024; this.cardCanvas.height = 420;
    this.cardTex = new THREE.CanvasTexture(this.cardCanvas); this.cardTex.colorSpace = THREE.SRGBColorSpace;
    this.card = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.254), new THREE.MeshBasicMaterial({ map: this.cardTex, transparent: true, depthTest: false, depthWrite: false }));
    this.card.renderOrder = 40; this.card.visible = false; this.card.frustumCulled = false;
    camera.add(this.card);
    this.cardT = -1;
    this.noteTex = glyphTex('♪', '#ffd400'); this.note2Tex = glyphTex('♫', '#7cff6a');
    this.dotTex = dotTex();
    this.starTex = glyphTex('★', '#ffd400'); this.birdTex = glyphTex('✦', '#ffffff');
  }

  // ---------------------------------------------------------------- the attack card
  showCard({ name, title, sub, icon, color = '#c62828', style = null }) {
    const g = this.cardCanvas.getContext('2d'), w = 1024, h = 420;
    g.clearRect(0, 0, w, h);
    // drop shadow + panel in the person's colour with a yellow comic border
    g.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(g, 22, 26, w - 36, h - 36, 46); g.fill();
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, shade(color, 1.25)); gr.addColorStop(1, shade(color, 0.7));
    g.fillStyle = gr; roundRect(g, 10, 10, w - 36, h - 36, 46); g.fill();
    if (style === 'portugal') {   // Portugal design: green and red flag halves, gold trim
      g.save(); roundRect(g, 10, 10, w - 36, h - 36, 46); g.clip();
      g.fillStyle = '#046a38'; g.fillRect(0, 0, 400, h); g.fillStyle = '#da291c'; g.fillRect(400, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, h - 120, w, 120); g.restore();
    }
    g.lineWidth = 14; g.strokeStyle = style === 'portugal' ? '#ffcc29' : '#ffd400'; roundRect(g, 10, 10, w - 36, h - 36, 46); g.stroke();
    // comic burst behind the icon
    g.save(); g.translate(170, 205); g.fillStyle = '#fff3b0';
    g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 105 : 150; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
    g.font = '150px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon || '!', 0, 8);
    g.restore();
    // name tag, title, effect
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = `900 44px ${FONT}`; g.fillStyle = '#ffd400'; g.fillText(`${name.toUpperCase()} ATTACKS!`, 330, 92);
    let size = 64; const words = title.split(' '), maxW = w - 380;
    let lines;
    for (; size > 30; size -= 4) {
      g.font = `900 ${size}px ${FONT}`; lines = []; let cur = '';
      for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = t; }
      lines.push(cur);
      if (lines.length * size * 1.05 <= 190) break;
    }
    g.lineJoin = 'round';
    lines.forEach((ln, i) => { const y = 160 + i * size * 1.05; g.lineWidth = 12; g.strokeStyle = '#111'; g.strokeText(ln, 330, y); g.fillStyle = '#fff'; g.fillText(ln, 330, y); });
    if (sub) { g.font = `900 46px ${FONT}`; g.lineWidth = 10; g.strokeStyle = '#111'; g.strokeText(sub, 330, h - 58); g.fillStyle = '#ffd400'; g.fillText(sub, 330, h - 58); }
    this.cardTex.needsUpdate = true;
    this.cardT = 0; this.card.visible = true;
  }
  updateCard(dt) {
    if (this.cardT < 0) return;
    this.cardT += dt;
    const t = this.cardT, c = this.card, s = this.player.scale || 1;
    let x = 0, y = 0.22, rot = 0, sc = 1, op = 1;
    if (t < 0.35) { const u = t / 0.35; x = 0.9 * (1 - easeOutBack(u)); rot = -0.5 * (1 - u); sc = 0.6 + 0.4 * u; }        // slams in from the right
    else if (t < 3.3) { const k = t - 0.35; rot = Math.sin(k * 18) * 0.08 * Math.exp(-k * 3); sc = 1 + Math.sin(k * 9) * 0.03 * Math.exp(-k * 1.2); }   // judders, settles, pulses
    else if (t < 3.7) { const u = (t - 3.3) / 0.4; y += u * 0.35; op = 1 - u; }                                              // flies off upwards
    else { c.visible = false; this.cardT = -1; return; }
    c.position.set(x, y * 0.9, -0.75); c.rotation.set(0, 0, rot); c.scale.setScalar(sc); c.material.opacity = op;
  }

  // ---------------------------------------------------------------- props in front of your face
  // offset: position relative to the camera; update(t, obj) animates it; removed after dur
  camProp(obj, dur, offset = [0, -0.08, -0.35], update = null) {
    obj.position.set(...offset); obj.renderOrder = 35;
    obj.traverse(o => { o.frustumCulled = false; if (o.material) { o.material = o.material.clone(); o.material.depthTest = false; o.renderOrder = 35; } });
    this.camera.add(obj);
    this.items.push({ obj, t: 0, dur, update, parent: this.camera, base: obj.position.clone() });
    return obj;
  }
  // a prop in the world (barbecue, football...), removed after dur
  worldProp(obj, dur, update = null) {
    this.scene.add(obj);
    this.items.push({ obj, t: 0, dur, update, parent: this.scene, base: obj.position.clone() });
    return obj;
  }
  removeAll() { for (const it of this.items) it.parent.remove(it.obj); this.items = []; for (const p of this.parts) this.scene.remove(p.sprite); this.parts = []; this.endCutscene(); }

  // ---------------------------------------------------------------- particles
  notes(pos, n = 1) {
    for (let i = 0; i < n; i++) this.particle(Math.random() < 0.5 ? this.noteTex : this.note2Tex, pos, new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.5 + Math.random() * 0.3, (Math.random() - 0.5) * 0.4), 1.8, 0.09);
  }
  spray(from, to, color, n = 6) {
    _v.subVectors(to, from).normalize();
    for (let i = 0; i < n; i++) {
      const v = _v.clone().multiplyScalar(3 + Math.random() * 1.5).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.2) * 0.6, (Math.random() - 0.5) * 0.6));
      this.particle(this.dotTex, from, v, 0.6, 0.03 + Math.random() * 0.03, color, -2);
    }
  }
  flash(pos) { this.particle(this.dotTex, pos, new THREE.Vector3(), 0.25, 0.5, 0xffffff, 0, true); }
  particle(tex, pos, vel, life, size, color = 0xffffff, grav = 0, grow = false) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false }));
    s.position.copy(pos); s.scale.setScalar(size); s.renderOrder = 12;
    this.scene.add(s); this.parts.push({ sprite: s, vel: vel.clone(), life, max: life, grav, grow, size });
  }

  // ---------------------------------------------------------------- Ben's trip to Turkey
  // kind: 'turkey' (full cut scene, black backdrop) or an overlay over the game
  // view: 'pepsi' (screen fills with Pepsi Max), 'siu' (Portugal SIUUU)
  cutscene(kind, dur = 7) {
    this.endCutscene();
    const overlay = kind !== 'turkey';
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 576;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 10), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, depthTest: false, depthWrite: false, transparent: true, opacity: 0 }));
    // the full scene sits like a big screen; overlays cover the whole view
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(overlay ? 2.6 : 0.96, overlay ? 1.95 : 0.54), new THREE.MeshBasicMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true, opacity: 0 }));
    back.renderOrder = 50; screen.renderOrder = 51; back.frustumCulled = screen.frustumCulled = false;
    screen.position.set(0, 0, overlay ? -0.6 : -0.66);
    if (!overlay) this.camera.add(back);
    this.camera.add(screen);
    this.cut = { kind, t: 0, dur, cv, tex, back, screen, overlay };
  }
  endCutscene() { if (!this.cut) return; this.camera.remove(this.cut.back); this.camera.remove(this.cut.screen); this.cut = null; }
  get inCutscene() { return !!(this.cut && !this.cut.overlay); }
  updateCutscene(dt) {
    const c = this.cut; if (!c) return;
    c.t += dt;
    const fade = c.overlay ? 1 : Math.min(1, c.t / 0.35, (c.dur - c.t) / 0.4);
    if (c.overlay) {     // overlays exactly fill the view (phone screen or headset)
      const xr = this.player.renderer && this.player.renderer.xr.isPresenting;
      const fov = THREE.MathUtils.degToRad(xr ? 100 : this.camera.fov), aspect = xr ? 1.1 : this.camera.aspect;
      const hh = 2 * 0.6 * Math.tan(fov / 2) * 1.04;
      c.screen.scale.set(hh * aspect / 2.6, hh / 1.95, 1);
    }
    c.back.material.opacity = Math.max(0, fade); c.screen.material.opacity = Math.max(0, fade);
    const g = c.cv.getContext('2d');
    if (c.kind === 'turkey') drawTurkey(g, c.t);
    else if (OVERLAYS[c.kind]) OVERLAYS[c.kind](g, c.t, c.dur);
    c.tex.needsUpdate = true;
    if (c.t >= c.dur) this.endCutscene();
  }
  // a ring of cartoon stars and birds spinning round your head (Alfie's dizzy)
  dizzyStars(dur) {
    const grp = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: i % 2 ? this.starTex : this.birdTex, transparent: true, depthTest: false }));
      s.scale.setScalar(0.05); s.userData.a = i / 7 * Math.PI * 2; grp.add(s);
    }
    this.camProp(grp, dur, [0, 0.12, -0.45], (t, o) => { o.children.forEach((s, i) => { const a = s.userData.a + t * 5; s.position.set(Math.cos(a) * 0.16, Math.sin(a * 2) * 0.02, Math.sin(a) * 0.05); }); });
  }

  update(dt) {
    this.updateCard(dt);
    this.updateCutscene(dt);
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i]; it.t += dt;
      if (it.update) it.update(it.t, it.obj, it.base);
      if (it.t >= it.dur) { it.parent.remove(it.obj); this.items.splice(i, 1); }
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.life -= dt;
      p.vel.y += p.grav * dt; p.sprite.position.addScaledVector(p.vel, dt);
      p.sprite.material.opacity = Math.min(1, p.life / p.max * 2);
      if (p.grow) p.sprite.scale.setScalar(p.size * (1 + (1 - p.life / p.max) * 3));
      if (p.life <= 0) { this.scene.remove(p.sprite); this.parts.splice(i, 1); }
    }
  }
}

function easeOutBack(t) { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
function shade(hex, k) { const c = new THREE.Color(hex); c.r = Math.min(1, c.r * k); c.g = Math.min(1, c.g * k); c.b = Math.min(1, c.b * k); return '#' + c.getHexString(); }
function glyphTex(ch, color) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 6; g.strokeStyle = '#111'; g.strokeText(ch, 32, 34); g.fillStyle = color; g.fillText(ch, 32, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function dotTex() {
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}
