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
  }

  // ---------------------------------------------------------------- the attack card
  showCard({ name, title, sub, icon, color = '#c62828' }) {
    const g = this.cardCanvas.getContext('2d'), w = 1024, h = 420;
    g.clearRect(0, 0, w, h);
    // drop shadow + panel in the person's colour with a yellow comic border
    g.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(g, 22, 26, w - 36, h - 36, 46); g.fill();
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, shade(color, 1.25)); gr.addColorStop(1, shade(color, 0.7));
    g.fillStyle = gr; roundRect(g, 10, 10, w - 36, h - 36, 46); g.fill();
    g.lineWidth = 14; g.strokeStyle = '#ffd400'; roundRect(g, 10, 10, w - 36, h - 36, 46); g.stroke();
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
  cutscene(kind, dur = 7) {
    this.endCutscene();
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 576;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 10), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, depthTest: false, depthWrite: false, transparent: true, opacity: 0 }));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.54), new THREE.MeshBasicMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true, opacity: 0 }));
    back.renderOrder = 50; screen.renderOrder = 51; back.frustumCulled = screen.frustumCulled = false;
    screen.position.set(0, 0, -0.66);
    this.camera.add(back); this.camera.add(screen);
    this.cut = { kind, t: 0, dur, cv, tex, back, screen };
  }
  endCutscene() { if (!this.cut) return; this.camera.remove(this.cut.back); this.camera.remove(this.cut.screen); this.cut = null; }
  get inCutscene() { return !!this.cut; }
  updateCutscene(dt) {
    const c = this.cut; if (!c) return;
    c.t += dt;
    const fade = Math.min(1, c.t / 0.35, (c.dur - c.t) / 0.4);
    c.back.material.opacity = Math.max(0, fade); c.screen.material.opacity = Math.max(0, fade);
    drawTurkey(c.cv.getContext('2d'), c.t);
    c.tex.needsUpdate = true;
    if (c.t >= c.dur) this.endCutscene();
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

// ---------------------------------------------------------------- the Turkey cut scene, drawn frame by frame
function drawTurkey(g, t) {
  const w = 1024, h = 576;
  const caption = (txt, sub) => {
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, h - 120, w, 120);
    g.textAlign = 'center';
    const fit = (text, size, weight) => { do { g.font = `${weight} ${size}px ${FONT}`; size -= 2; } while (g.measureText(text).width > w - 60 && size > 14); };
    fit(txt, 52, 900); g.fillStyle = '#ffd400'; g.fillText(txt, w / 2, h - 62);
    if (sub) { fit(sub, 30, 700); g.fillStyle = '#fff'; g.fillText(sub, w / 2, h - 22); }
  };
  if (t < 1.6) {                 // 1. Southend airport: Ben and Ronnie board, the plane takes off
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#7ec8ff'); sky.addColorStop(1, '#d8f0ff'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#6a6a6a'; g.fillRect(0, h - 170, w, 60); g.fillStyle = '#fff'; for (let x = 0; x < w; x += 90) g.fillRect(x + ((t * 400) % 90), h - 143, 50, 6);
    g.fillStyle = '#4caf50'; g.fillRect(0, h - 110, w, 110);
    const u = Math.max(0, (t - 0.4) / 1.2), px = 120 + u * 900, py = h - 200 - u * u * 300;
    plane(g, px, py, -u * 0.35);
    caption('BEN: "RIGHT RON. WE\'RE GOING TO TURKEY."', 'Southend Airport, 6am');
  } else if (t < 3.2) {          // 2. the flight: dotted line across a little map
    g.fillStyle = '#1e5aa8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7cb342';
    blob(g, 250, 170, 70, 110); blob(g, 470, 300, 260, 120); blob(g, 790, 330, 150, 70); blob(g, 600, 470, 300, 60);
    g.fillStyle = '#fff'; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; g.fillText('UK', 250, 175); g.fillText('TURKEY', 800, 335);
    const u = (t - 1.6) / 1.6, x0 = 260, y0 = 190, x1 = 790, y1 = 320;
    g.setLineDash([14, 12]); g.lineWidth = 6; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(x0, y0);
    for (let i = 0; i <= 30 * u; i++) { const k = i / 30; g.lineTo(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * 120); }
    g.stroke(); g.setLineDash([]);
    plane(g, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * 120, 0.15, 0.6);
    caption('3 HOURS 40 MINUTES', 'Ronnie ate the in-flight meal. And Ben\'s. And the trolley.');
  } else if (t < 4.6) {          // 3. Istanbul: skyline and the clinic
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#ff9a5a'); sky.addColorStop(1, '#ffd9a0'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffcf40'; g.beginPath(); g.arc(820, 150, 60, 0, 7); g.fill();
    g.fillStyle = '#5a3a5a';
    for (const [x, r] of [[200, 90], [420, 120], [650, 80]]) { g.beginPath(); g.arc(x, h - 190, r, Math.PI, 0); g.fill(); g.fillRect(x - r, h - 190, r * 2, 80); }
    for (const x of [90, 310, 540, 760]) { g.fillRect(x - 9, h - 400, 18, 290); g.beginPath(); g.moveTo(x - 12, h - 400); g.lineTo(x, h - 440); g.lineTo(x + 12, h - 400); g.fill(); }
    g.fillStyle = '#2a2a3a'; g.fillRect(0, h - 120, w, 120);
    g.fillStyle = '#fff'; roundRect(g, 600, 180, 360, 120, 16); g.fill(); g.fillStyle = '#1e5aa8'; g.font = `900 40px ${FONT}`; g.textAlign = 'center'; g.fillText('HAIR CLINIC', 780, 232); g.font = `700 24px ${FONT}`; g.fillText("(BEN'S MATE, CASH ONLY)", 780, 272);
    caption('WELCOME TO TURKEY', 'Ben: "Trust me Ron, it\'s the best money I ever spent."');
  } else if (t < 6.4) {          // 4. before / after: the hairline
    g.fillStyle = '#f5f0e6'; g.fillRect(0, 0, w, h);
    const u = Math.min(1, (t - 4.6) / 0.9);
    for (const [cx, after] of [[290, false], [734, true]]) {
      const cy = 250;
      // Ronnie's big round face
      g.fillStyle = '#f0c8a0'; g.beginPath(); g.ellipse(cx, cy, 150, 165, 0, 0, 7); g.fill();
      g.fillStyle = '#e8b890'; g.beginPath(); g.ellipse(cx, cy + 130, 120, 40, 0, 0, 7); g.fill();     // chins
      g.fillStyle = '#111'; g.beginPath(); g.arc(cx - 50, cy + 10, 11, 0, 7); g.arc(cx + 50, cy + 10, 11, 0, 7); g.fill();
      g.strokeStyle = '#111'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy + 55, 50, 0.25, Math.PI - 0.25); g.stroke();
      g.fillStyle = '#4a2a16';
      if (!after) {          // BEFORE: hair only round the sides, a big shiny forehead
        g.beginPath(); g.ellipse(cx - 140, cy - 60, 22, 70, 0.2, 0, 7); g.fill(); g.beginPath(); g.ellipse(cx + 140, cy - 60, 22, 70, -0.2, 0, 7); g.fill();
        g.beginPath(); g.ellipse(cx, cy - 158, 60, 12, 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(cx - 40, cy - 100, 30, 12, -0.3, 0, 7); g.fill();     // shine
      } else {               // AFTER: a thick, dead-straight Turkish hairline, about an inch above the eyebrows
        const line = cy - 150 + u * 90;
        g.beginPath(); g.ellipse(cx, cy - 120, 158, 75, 0, Math.PI, 0); g.lineTo(cx + 152, line); g.lineTo(cx - 152, line); g.closePath(); g.fill();
        g.fillRect(cx - 152, cy - 125, 304, Math.max(0, line - cy + 125));
      }
      g.fillStyle = after ? '#2e7d32' : '#c62828'; g.font = `900 40px ${FONT}`; g.textAlign = 'center'; g.fillText(after ? 'AFTER' : 'BEFORE', cx, 52);
    }
    g.fillStyle = '#111'; g.font = `900 70px ${FONT}`; g.textAlign = 'center'; g.fillText('→', w / 2, 270);
    if (u >= 1) for (let i = 0; i < 8; i++) { const a = t * 3 + i; g.font = '40px sans-serif'; g.fillText('✨', 734 + Math.cos(a) * 190, 230 + Math.sin(a * 1.3) * 140); }
    caption('NEW HAIRLINE!', 'Footballer\'s hairline. From the forehead up.');
  } else {                       // 5. back home
    g.fillStyle = '#111'; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.font = `900 64px ${FONT}`; g.fillStyle = '#ffd400'; g.fillText('...AND BACK TO THE PUB', w / 2, h / 2);
    g.font = `700 30px ${FONT}`; g.fillStyle = '#fff'; g.fillText('Ben: "You\'re welcome, Ron. That\'ll be four grand."', w / 2, h / 2 + 60);
  }
}
function plane(g, x, y, rot, s = 1) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 0, 110, 22, 0, 0, 7); g.fill();
  g.fillStyle = '#e53935'; g.beginPath(); g.moveTo(-90, -5); g.lineTo(-120, -55); g.lineTo(-70, -10); g.fill();
  g.fillStyle = '#cfd8dc'; g.beginPath(); g.moveTo(-10, 0); g.lineTo(-50, 60); g.lineTo(20, 5); g.fill();
  g.fillStyle = '#1e5aa8'; for (let i = 0; i < 6; i++) g.fillRect(-50 + i * 22, -8, 10, 8);
  g.restore();
}
function blob(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0.2, 0, 7); g.fill(); }
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
