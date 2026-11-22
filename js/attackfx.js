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
import { drawTurkey, OVERLAYS, setCanvas } from './cutscenes.js';

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
  // Every attack has its own card: its own look (a gig ticket for Dylan, a boarding pass for Ben, a Polaroid for Oliver,
  // an X-ray for Aidan W's knee...), its own way in (dropped and bouncing, spun in, stamped down, flashed up...) and its
  // own bits flying off it (bubbles, hearts, shamrocks, music notes, embers...). In multiplayer, everyone who isn't the
  // target is told who's getting it: "OLIVER ➜ BETH" and the line itself says BETH, not YOU.
  showCard({ name, title, sub, icon, color = '#c62828', style = null, vs = null, top: topLine = null, key = null }) {      // (top: the card's own top line instead of "NAME ATTACKS!": the boss fight's cards)
    const g = this.cardCanvas.getContext('2d'), w = 1024, h = 420, th = THEMES[key] || (style === 'portugal' ? THEMES.siu : null) || { enter: 'slam', parts: 'star' };
    if (vs && vs !== 'YOU') { title = aimAt(title, vs); sub = sub && aimAt(sub, vs); }
    const c0 = th.bg ? th.bg[0] : shade(color, 1.25), c1 = th.bg ? th.bg[1] : shade(color, 0.7), edge = th.edge || '#ffd400';
    g.clearRect(0, 0, w, h); g.save();
    // the card's shape: a ticket (notches and a tear line), or the usual rounded one
    const shape = () => { roundRect(g, 10, 10, w - 36, h - 36, th.ticket ? 22 : 46); if (th.ticket) { g.moveTo(10 + 270 + 26, 10); g.arc(10 + 270, 10, 26, 0, Math.PI, false); g.moveTo(10 + 270 + 26, h - 26); g.arc(10 + 270, h - 26, 26, 0, Math.PI, true); } };
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.translate(12, 16); g.beginPath(); shape(); g.fill('evenodd'); g.setTransform(1, 0, 0, 1, 0, 0);
    const gr = g.createLinearGradient(0, 0, w * 0.3, h); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
    g.beginPath(); shape(); g.fillStyle = gr; g.fill('evenodd');
    g.save(); g.beginPath(); shape(); g.clip('evenodd'); pattern(g, th.pat, w, h); g.restore();
    g.beginPath(); shape(); g.lineWidth = 14; g.strokeStyle = edge; g.stroke();
    if (th.ticket) { g.setLineDash([14, 12]); g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.moveTo(280, 44); g.lineTo(280, h - 60); g.stroke(); g.setLineDash([]); }
    // the badge behind the icon: each theme's own (a burst, a round mat, a film frame...)
    g.save(); g.translate(158, 200); badge(g, th.badge || 'burst', th.badgeCol || '#fff3b0');
    g.font = '138px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000'; g.fillText(icon || '!', 0, 8); g.restore();
    // the top line: who's attacking (and who they're attacking), on a tab
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    const top = topLine || (vs ? `${name.toUpperCase()}  ➜  ${vs.toUpperCase()}` : `${name.toUpperCase()} ATTACKS!`);
    { let f = 42; do { g.font = `900 ${f}px ${FONT}`; f -= 2; } while (g.measureText(top).width > w - 400 && f > 20); const tw = g.measureText(top).width;
      g.fillStyle = vs ? '#ff1744' : 'rgba(0,0,0,0.55)'; roundRect(g, 312, 40, tw + 36, 64, 18); g.fill(); g.fillStyle = vs ? '#fff' : (th.topCol || '#ffd400'); g.fillText(top, 330, 88); }
    let size = 64; const words = title.split(' '), maxW = w - 380; let lines;
    for (; size > 30; size -= 4) { g.font = `900 ${size}px ${FONT}`; lines = []; let cur = '';
      for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = t; }
      lines.push(cur); if (lines.length * size * 1.05 <= 190) break; }
    g.lineJoin = 'round';
    lines.forEach((ln, i) => { const y = 170 + i * size * 1.05; g.lineWidth = 13; g.strokeStyle = '#111'; g.strokeText(ln, 330, y); g.fillStyle = th.ink || '#fff'; g.fillText(ln, 330, y); });
    if (sub) { let f = 46; do { g.font = `900 ${f}px ${FONT}`; f -= 2; } while (g.measureText(sub).width > maxW && f > 24); g.lineWidth = 10; g.strokeStyle = '#111'; g.strokeText(sub, 330, h - 56); g.fillStyle = th.subCol || '#ffd400'; g.fillText(sub, 330, h - 56); }
    g.restore();
    this.cardTex.needsUpdate = true;
    this.cardTh = th; this.cardT = 0; this.cardOut = -1; this.card.visible = true; this.cardPartT = 0; this.cardFlash = th.enter === 'flash' ? 1 : 0;
  }
  // bits flying off the card (in front of your eyes, so in the camera's space)
  cardBit(kind) {
    const T = BIT[kind]; if (!T) return; if (!this.bitTex) this.bitTex = {}; const tex = this.bitTex[kind] || (this.bitTex[kind] = T.glyph ? glyphTex(T.glyph, T.col) : this.dotTex);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, color: T.glyph ? 0xffffff : new THREE.Color(T.col) })); s.renderOrder = 41; s.frustumCulled = false;
    const c = this.card, side = Math.random() < 0.5 ? -1 : 1, x = c.position.x + (T.from === 'edge' ? side * 0.3 * c.scale.x : (Math.random() - 0.5) * 0.55 * c.scale.x), y = c.position.y + (T.from === 'top' ? 0.13 * c.scale.y : T.from === 'bottom' ? -0.12 * c.scale.y : (Math.random() - 0.5) * 0.2 * c.scale.y);
    s.position.set(x, y, -0.72); const sz = (T.size || 0.035) * (0.7 + Math.random() * 0.6); s.scale.setScalar(sz);
    const v = new THREE.Vector3((T.vx || 0) * (T.from === 'edge' ? side : Math.random() - 0.5) * 2, (T.vy || 0.1) * (0.6 + Math.random() * 0.8), 0);
    this.camera.add(s); (this.cardParts || (this.cardParts = [])).push({ s, v, life: T.life || 1, max: T.life || 1, sz, spin: (Math.random() - 0.5) * (T.spin || 0), grav: T.grav || 0 });
  }
  updateCard(dt) {
    // (the bits already flying carry on, even after the card's gone)
    if (this.cardParts) for (let i = this.cardParts.length - 1; i >= 0; i--) { const p = this.cardParts[i]; p.life -= dt; p.v.y -= p.grav * dt; p.s.position.addScaledVector(p.v, dt); p.s.material.rotation += p.spin * dt; p.s.material.opacity = Math.min(1, p.life / p.max * 2); if (p.life <= 0) { this.camera.remove(p.s); p.s.material.dispose(); this.cardParts.splice(i, 1); } }
    if (this.cardT < 0) return;
    this.cardT += dt;
    const t = this.cardT, c = this.card, th = this.cardTh || {};
    // stays up (centred, big) until the attack actually starts, then goes
    if (this.cardOut < 0 && t > 8) this.hideCard();
    let x = 0, y = 0.05, rot = 0, sc = 1.15, op = 1, sx = 1;
    const E = 0.45, u = Math.min(1, t / E), k = Math.max(0, t - E);
    if (this.vr) {                     // headset: smaller, in the middle of your view, a smooth pop (nothing flying in from the side)
      const v = Math.min(1, t / 0.3); y = 0.02; sc = 0.6 * (0.85 + 0.15 * easeOutBack(v)); op = v; }
    else {
      switch (th.enter) {
        case 'drop': y = 0.05 + (u < 1 ? 0.6 * (1 - u) * (1 - u) : 0) + (t < 1.1 ? Math.abs(Math.sin(Math.max(0, t - E) * 9)) * 0.05 * Math.exp(-Math.max(0, t - E) * 5) : 0); sc = 1.15 * (u < 1 ? 1 : 1 + 0.06 * Math.exp(-k * 8) * Math.sin(k * 30)); break;      // falls in and bounces
        case 'left': x = -0.95 * (1 - easeOutBack(u)); rot = 0.4 * (1 - u); sc = 0.8 + 0.35 * u; break;      // charges in from the left
        case 'spin': rot = (1 - easeOutBack(u)) * Math.PI * 2; sc = 1.15 * easeOutBack(u); break;      // spins in
        case 'zoom': sc = 1.15 * (u < 1 ? 0.1 + 1.1 * easeOutBack(u) : 1); op = u; break;      // from far away, right up to your face
        case 'stamp': sc = 1.15 * (u < 1 ? 2.6 - 1.6 * u * u : 1); op = Math.min(1, u * 2); break;      // stamped down onto the screen
        case 'flash': sc = 1.15 * (0.9 + 0.1 * easeOutBack(u)); op = u; break;      // a white flash, then there it is
        case 'flicker': op = u < 1 ? (Math.sin(t * 70) > -0.3 ? 1 : 0.15) : 1; sc = 1.15; break;      // flickers on like an X-ray light box
        case 'swing': { const a = 0.9 * Math.exp(-t * 2.6) * Math.cos(t * 7); rot = a; y = 0.05 + (u < 1 ? 0.5 * (1 - u) : 0); x = Math.sin(a) * 0.05; break; }      // swings on a line, like it's been reeled in
        case 'fly': x = 1.0 * (1 - u) * (1 - u); y = 0.05 + 0.25 * (1 - u) * (1 - u) - 0.04 * Math.sin(u * Math.PI); rot = -0.35 * (1 - u); sc = 0.7 + 0.45 * u; break;      // flies in like a plane coming in to land
        case 'rise': y = 0.05 - 0.6 * (1 - easeOutBack(u)); sc = 1.15; break;      // comes up from the bottom, like heat
        case 'pop': sc = 1.15 * easeOutBack(u); sx = u < 1 ? 1 + 0.25 * Math.sin(u * Math.PI) : 1; break;      // pops up like a phone notification
        default: if (t < 0.35) { const v = t / 0.35; x = 0.9 * (1 - easeOutBack(v)); rot = -0.5 * (1 - v); sc = 0.7 + 0.45 * v; }      // slams in from the right
      }
      // once it's in: its own way of sitting there
      if (u >= 1) switch (th.idle) {
        case 'wobble': rot += Math.sin(k * 3.2) * 0.07; x += Math.sin(k * 1.6) * 0.02; break;      // (dizzy: a pint too many)
        case 'shake': x += (Math.random() - 0.5) * 0.012; y += (Math.random() - 0.5) * 0.012; break;      // (fizzing)
        case 'bob': y += Math.sin(k * 4) * 0.012; rot += Math.sin(k * 2) * 0.03; break;
        case 'beat': sc *= 1 + 0.05 * Math.max(0, Math.sin(k * 9)); break;      // (to the music)
        case 'jig': rot += Math.sin(k * 10) * 0.06; y += Math.abs(Math.sin(k * 10)) * 0.015; break;
        default: if (th.enter !== 'swing') { rot += Math.sin(k * 18) * 0.06 * Math.exp(-k * 3); sc *= 1 + Math.sin(k * 5) * 0.03; }
      }
      // its bits
      if (th.parts && this.cardOut < 0 && (this.cardPartT -= dt) <= 0) { this.cardPartT = BIT[th.parts] ? BIT[th.parts].every || 0.12 : 0.12; this.cardBit(th.parts); if (t < 0.6) this.cardBit(th.parts); }
    }
    if (this.cardOut >= 0) {
      this.cardOut += dt; const v = Math.min(1, this.cardOut / 0.35);
      if (this.vr) y += v * 0.08;      // (a phone/PC: shrinks and fades where it is: flying off took it through the eat meter in the corner)
      op = Math.min(op, 1 - v); sc *= 1 - v * (this.vr ? 0.15 : 0.4); rot += v * (th.enter === 'spin' ? 1.2 : 0);
      if (v >= 1) { c.visible = false; this.cardT = -1; this.cardOut = -1; this.flashEl && (this.flashEl.style.opacity = 0); return; }
    }
    c.position.set(x, y * 0.9, -0.75); c.rotation.set(0, 0, rot); c.scale.set(sc * sx, sc, sc); c.material.opacity = op;
    // Oliver's: the camera flash going off first (a white screen fading)
    if (this.cardFlash > 0 && !this.vr) { this.cardFlash = Math.max(0, this.cardFlash - dt * 2.2); if (!this.flashEl) { const f = document.createElement('div'); f.style.cssText = 'position:fixed;inset:0;background:#fff;pointer-events:none;z-index:19;opacity:0;transition:none'; document.body.appendChild(f); this.flashEl = f; } this.flashEl.style.opacity = this.cardFlash; }
  }
  // a marker over the player being attacked (multiplayer, on everyone else's screen): a red target and "OLIVER ➜"
  markTarget(getPos, name, color = '#ff1744', dur = 7) {
    if (!this.tgt) { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 300; this.tgtCv = cv; this.tgtTex = new THREE.CanvasTexture(cv); this.tgtTex.colorSpace = THREE.SRGBColorSpace;
      this.tgt = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tgtTex, transparent: true, depthTest: false, depthWrite: false })); this.tgt.renderOrder = 13; this.tgt.visible = false; this.scene.add(this.tgt); }
    const g = this.tgtCv.getContext('2d'); g.clearRect(0, 0, 256, 300);
    g.font = `900 34px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; let f = 34; while (g.measureText(name.toUpperCase() + ' ➜').width > 236 && f > 16) { f -= 2; g.font = `900 ${f}px ${FONT}`; }
    const tw = g.measureText(name.toUpperCase() + ' ➜').width; g.fillStyle = color; roundRect(g, 128 - tw / 2 - 12, 4, tw + 24, 48, 14); g.fill(); g.lineWidth = 4; g.strokeStyle = '#111'; g.stroke(); g.fillStyle = '#fff'; g.fillText(name.toUpperCase() + ' ➜', 128, 30);
    g.translate(128, 170); for (const [r, lw] of [[84, 12], [52, 10]]) { g.beginPath(); g.arc(0, 0, r, 0, 7); g.lineWidth = lw + 6; g.strokeStyle = '#111'; g.stroke(); g.lineWidth = lw; g.strokeStyle = '#ff1744'; g.stroke(); }
    for (let i = 0; i < 4; i++) { g.save(); g.rotate(i * Math.PI / 2); g.fillStyle = '#111'; g.fillRect(-7, -112, 14, 46); g.fillStyle = '#ff1744'; g.fillRect(-4, -110, 8, 42); g.restore(); }
    g.beginPath(); g.arc(0, 0, 14, 0, 7); g.fillStyle = '#ff1744'; g.fill(); g.setTransform(1, 0, 0, 1, 0, 0);
    this.tgtTex.needsUpdate = true; this.tgtPos = getPos; this.tgtT = 0; this.tgtDur = dur; this.tgt.visible = true;
  }
  updateTarget(dt) {
    if (!this.tgt || !this.tgt.visible) return;
    this.tgtT += dt; let p = null; try { p = this.tgtPos && this.tgtPos(); } catch (e) { p = null; }
    if (!p || this.tgtT > this.tgtDur) { this.tgt.visible = false; return; }
    const t = this.tgtT, pop = Math.min(1, t / 0.3), pulse = 1 + 0.08 * Math.sin(t * 9), fade = Math.min(1, (this.tgtDur - t) / 0.5), d = this.camera.getWorldPosition(_v).distanceTo(p), big = Math.max(1, d / 4);
    this.tgt.position.set(p.x, p.y + 0.55 + 0.05 * Math.sin(t * 4), p.z); this.tgt.scale.set(0.42 * easeOutBack(pop) * pulse * big, 0.49 * easeOutBack(pop) * pulse * big, 1); this.tgt.material.opacity = fade; this.tgt.material.rotation = 0;
  }

  // the "NEXT ATTACK IN 12" counter at the top of the view (null hides it).
  // Phone: a little bar at the top of the screen. Headset: it's on your wrist (see director.hud()).
  setCountdown(textStr) {
    if (textStr === this.cdText) return;
    this.cdText = textStr;
    if (!this.cdEl) {
      const el = document.createElement('div'); el.id = 'nextAttack';
      el.style.cssText = 'position:fixed;left:50%;top:calc(max(12px, env(safe-area-inset-top)) + 34px);transform:translateX(-50%);padding:6px 14px;border-radius:12px;background:rgba(160,20,20,0.85);color:#fff;font:900 15px "Arial Black",Arial,sans-serif;letter-spacing:0.5px;pointer-events:none;z-index:20;display:none;white-space:nowrap;box-shadow:0 3px 0 rgba(0,0,0,0.35)';
      document.body.appendChild(el); this.cdEl = el;
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64; this.cdCv = cv;
      this.cdTex = new THREE.CanvasTexture(cv); this.cdTex.colorSpace = THREE.SRGBColorSpace;
      this.cdMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.05), new THREE.MeshBasicMaterial({ map: this.cdTex, transparent: true, depthTest: false, depthWrite: false }));
      this.cdMesh.renderOrder = 39; this.cdMesh.position.set(0, 0.3, -0.9); this.cdMesh.visible = false; this.camera.add(this.cdMesh);
    }
    const xr = this.player.renderer && this.player.renderer.xr.isPresenting;
    this.cdEl.style.display = textStr && !xr ? 'block' : 'none';
    this.cdEl.textContent = textStr || '';
    this.cdMesh.visible = false;      // in the headset the countdown lives on your wrist instead
    if (textStr) {
      const g = this.cdCv.getContext('2d'); g.clearRect(0, 0, 512, 64);
      g.fillStyle = 'rgba(160,20,20,0.85)'; roundRect(g, 4, 4, 504, 56, 18); g.fill();
      g.fillStyle = '#fff'; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(textStr, 256, 34);
      this.cdTex.needsUpdate = true;
    }
  }
  // the counter's place on screen: on a phone held upright the Eat Meter box takes over half the width at the top, so the
  // counter goes just under the box instead of on top of it; and it gives way to a cut scene (it was printed over them)
  placeCountdown() {
    const el = this.cdEl; if (!el || !this.cdText) return;
    const xr = this.player.renderer && this.player.renderer.xr.isPresenting;
    el.style.visibility = this.cut ? 'hidden' : 'visible';
    const cam = this.camera, asp = cam.aspect, key = asp.toFixed(3) + ':' + cam.fov.toFixed(1) + ':' + innerHeight;
    if (xr || key === this.cdKey) return; this.cdKey = key;
    if (asp >= 1) { el.style.top = 'calc(max(12px, env(safe-area-inset-top)) + 34px)'; return; }
    // (the same sums player.js uses to pin the box to the corner: box bottom, as a fraction of the screen's height)
    const hh = 0.3 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), hw = hh * asp, sc = Math.min(1.25, hw * 1.12 / 0.1);
    const below = (0.075 * sc + 0.024) / (2 * hh) * innerHeight;
    el.style.top = Math.round(below + 8) + 'px';
  }
  hideCard() { if (this.cardT >= 0 && this.cardOut < 0) this.cardOut = 0; }
  get cardShowing() { return this.cardT >= 0 && this.cardOut < 0; }

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
  removeAll() { if (this.cardParts) { for (const p of this.cardParts) { this.camera.remove(p.s); p.s.material.dispose(); } this.cardParts = []; } if (this.tgt) this.tgt.visible = false; if (this.flashEl) this.flashEl.style.opacity = 0; for (const it of this.items) it.parent.remove(it.obj); this.items = []; for (const p of this.parts) this.scene.remove(p.sprite); this.parts = []; this.endCutscene(); }

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
    // a phone held upright: the film stays upright, full width, framed top and bottom (not turned on its side)
    const tall = !overlay && !this.vr && this.camera.aspect < 1; let film = null;
    if (tall) { cv.width = 576; cv.height = 1024; film = document.createElement('canvas'); film.width = 1024; film.height = 576; }
    if (overlay) {      // the overlay's canvas has the same shape as the screen
      const asp = this.viewAspect();
      if (asp >= 1) { cv.width = 1024; cv.height = Math.round(1024 / asp); } else { cv.height = 1024; cv.width = Math.round(1024 * asp); }
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 10), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, depthTest: false, depthWrite: false, transparent: true, opacity: 0 }));
    // the full scene sits like a big screen; overlays cover the whole view
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(overlay ? 2.6 : tall ? 0.54 : 0.96, overlay ? 1.95 : tall ? 0.96 : 0.54), new THREE.MeshBasicMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true, opacity: 0 }));
    back.renderOrder = 50; screen.renderOrder = 51; back.frustumCulled = screen.frustumCulled = false;
    screen.position.set(0, 0, overlay ? -0.6 : -0.66);
    if (!overlay) this.camera.add(back);
    this.camera.add(screen);
    this.cut = { kind, t: 0, dur, cv, tex, back, screen, overlay, film };
  }
  viewAspect() { return this.player.renderer && this.player.renderer.xr.isPresenting ? 1.1 : this.camera.aspect; }
  get vr() { return !!(this.player.renderer && this.player.renderer.xr.isPresenting); }
  // "LEWIS IS COMING FOR YOU!": the moment the countdown runs out, a tag says who it is, and an arrow points to
  // where they are when they're not in front of you. Goes when their attack card comes up.
  coming(who, targetName = null) {
    if (!this.comeMesh) {
      const cv = document.createElement('canvas'); cv.width = 768; cv.height = 128; this.comeCv = cv;
      this.comeTex = new THREE.CanvasTexture(cv); this.comeTex.colorSpace = THREE.SRGBColorSpace;
      this.comeMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.08), new THREE.MeshBasicMaterial({ map: this.comeTex, transparent: true, depthTest: false, depthWrite: false }));
      this.comeMesh.renderOrder = 41; this.comeMesh.frustumCulled = false; this.camera.add(this.comeMesh);
      const ac = document.createElement('canvas'); ac.width = ac.height = 128; const ag = ac.getContext('2d');
      ag.fillStyle = '#ffd400'; ag.strokeStyle = '#111'; ag.lineWidth = 10; ag.beginPath(); ag.moveTo(64, 8); ag.lineTo(118, 100); ag.lineTo(64, 78); ag.lineTo(10, 100); ag.closePath(); ag.stroke(); ag.fill();
      const at = new THREE.CanvasTexture(ac); at.colorSpace = THREE.SRGBColorSpace;
      this.comeArrow = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), new THREE.MeshBasicMaterial({ map: at, transparent: true, depthTest: false, depthWrite: false }));
      this.comeArrow.renderOrder = 41; this.comeArrow.frustumCulled = false; this.camera.add(this.comeArrow);
    }
    const g = this.comeCv.getContext('2d'); g.clearRect(0, 0, 768, 128);
    g.fillStyle = 'rgba(160,20,20,0.9)'; roundRect(g, 6, 6, 756, 116, 40); g.fill(); g.lineWidth = 8; g.strokeStyle = '#ffd400'; roundRect(g, 6, 6, 756, 116, 40); g.stroke();
    const msg = targetName ? `⚠ ${who.name.toUpperCase()} IS GOING FOR ${targetName.toUpperCase()}!` : `⚠ ${who.name.toUpperCase()} IS COMING FOR YOU!`;
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; let f = 60; do { g.font = `900 ${f}px ${FONT}`; f -= 2; } while (g.measureText(msg).width > 720);
    g.fillText(msg, 384, 68); this.comeTex.needsUpdate = true;
    this.comeWho = who; this.comeT = 0;
  }
  updateComing(dt) {
    if (!this.comeWho) { if (this.comeMesh) this.comeMesh.visible = this.comeArrow.visible = false; return; }
    const w = this.comeWho; this.comeT += dt;
    const coming = w.id === 'tommy' ? (w.tripping > 0 || w.balling) : (w.state === 'act' && w.approach);
    if (w.down || w.disposed || this.comeT > 12 || (!w.netDriven && !coming)) { this.comeWho = null; return; }
    const u = Math.min(1, this.comeT / 0.25);
    // the tag: who's coming (a small note low in your view in the headset; it gives way to the attack card), and the
    // arrow keeps pointing at them the whole time they're on their way
    this.comeMesh.visible = !this.cardShowing; this.comeMesh.material.opacity = u;
    if (this.vr) { this.comeMesh.position.set(0, -0.17, -0.8); this.comeMesh.scale.setScalar(0.5 * (0.9 + 0.1 * u)); }
    else { this.comeMesh.position.set(0, 0.16, -0.8); this.comeMesh.scale.setScalar(0.9 + 0.1 * u); }
    // the arrow: towards them, round the edge of a small circle in the middle of your view (hidden when they're in front)
    _v.copy(w.pos); _v.y += 1.2; this.camera.worldToLocal(_v);
    const ang = Math.atan2(_v.x, -_v.z), inFront = _v.z < 0 && Math.abs(ang) < 0.35 && Math.abs(Math.atan2(_v.y, -_v.z)) < 0.3;
    this.comeArrow.visible = !inFront;
    if (!inFront) { const a = Math.atan2(_v.y, _v.x), R = this.vr ? 0.2 : 0.14; this.comeArrow.position.set(Math.cos(a) * R, Math.sin(a) * R * 0.75 + 0.02, -0.8); this.comeArrow.rotation.set(0, 0, a - Math.PI / 2); this.comeArrow.scale.setScalar(1 + Math.sin(this.comeT * 10) * 0.12); }
  }
  endCutscene() { if (!this.cut) return; this.camera.remove(this.cut.back); this.camera.remove(this.cut.screen); this.cut = null;
    const w = this.player.wrist; if (w && this.hidWrist) { this.hidWrist = false; if (!document.body.classList.contains('gameover')) w.visible = true; } }
  get inCutscene() { return !!(this.cut && !this.cut.overlay); }
  updateCutscene(dt) {
    const c = this.cut; if (!c) return;
    c.t += dt;
    // on a screen, the Eat Meter box in the corner steps aside while a cut scene plays (it was drawn over their headlines)
    { const w = this.player.wrist; if (w && !this.vr && w.visible && w.parent === this.camera) { w.visible = false; this.hidWrist = true; } }
    const fade = c.overlay ? 1 : Math.min(1, c.t / 0.35, (c.dur - c.t) / 0.4);
    if (c.overlay) {     // overlays exactly fill the view (phone screen or headset)
      const xr = this.player.renderer && this.player.renderer.xr.isPresenting;
      const fov = THREE.MathUtils.degToRad(xr ? 46 : this.camera.fov), aspect = this.viewAspect();     // (headset: a window in the middle of your view, not right out to the edges)
      const hh = 2 * 0.6 * Math.tan(fov / 2) * (xr ? 1 : 1.04);
      c.screen.scale.set(hh * aspect / 2.6, hh / 1.95, 1);
    } else if (this.vr) { c.screen.scale.setScalar(0.62); c.screen.rotation.z = 0;   // the film: a screen in the middle of your view
    } else if (!(this.player.renderer && this.player.renderer.xr.isPresenting)) {   // the film fills the whole phone screen
      const vh = 2 * 0.66 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2), vw = vh * this.camera.aspect;
      c.screen.rotation.z = 0;
      c.screen.scale.setScalar(c.film ? Math.max(vw / 0.54, vh / 0.96) * 1.01 : Math.max(vw / 0.96, vh / 0.54) * 1.01);
    }
    c.back.material.opacity = Math.max(0, fade); c.screen.material.opacity = Math.max(0, fade);
    const g = c.cv.getContext('2d');
    setCanvas(c.cv.width, c.cv.height);
    if (c.kind === 'turkey' && c.film) { setCanvas(1024, 576); drawTurkey(c.film.getContext('2d'), c.t); tallFrame(g, c.film, c.t); }
    else if (c.kind === 'turkey') drawTurkey(g, c.t);
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
    this.updateTarget(dt);
    this.updateCard(dt);
    this.updateCutscene(dt);
    this.updateComing(dt);
    this.placeCountdown();
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

// the Turkey film on a phone held upright: Turkish red top and bottom, the film across the middle at full width,
// "BEN'S TAKING YOU TO TURKEY" above it, a plane flying along underneath
function tallFrame(g, film, t) {
  const W = g.canvas.width, H = g.canvas.height, fh = W * 576 / 1024, fy = (H - fh) / 2;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#7a0010'); gr.addColorStop(0.5, '#e30a17'); gr.addColorStop(1, '#7a0010'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(W / 2 - 40, fy / 2 + 20, 70, 0, 7); g.fill(); g.fillStyle = '#c00814'; g.beginPath(); g.arc(W / 2 - 18, fy / 2 + 20, 57, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 13 : 32; g.lineTo(W / 2 + 70 + Math.cos(a) * r, fy / 2 + 20 + Math.sin(a) * r); } g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  for (const [s, y, sz] of [['BEN\'S TAKING YOU', 115, 40], ['TO TURKEY ✈️', fy - 40, 50]]) { g.font = `900 ${sz}px Arial Black, Arial`; g.lineWidth = 10; g.strokeStyle = '#111'; g.strokeText(s, W / 2, y); g.fillStyle = '#ffd400'; g.fillText(s, W / 2, y); }
  g.fillStyle = '#000'; g.fillRect(0, fy - 6, W, fh + 12); g.drawImage(film, 0, fy, W, fh);
  const px = ((t * 120) % (W + 200)) - 100, py = fy + fh + (H - fy - fh) / 2; g.font = '80px serif'; g.fillText('✈️', px, py);
  g.font = '900 30px Arial Black, Arial'; g.lineWidth = 8; g.strokeStyle = '#111'; g.strokeText('NEW HAIRLINE INCOMING', W / 2, H - 50); g.fillStyle = '#fff'; g.fillText('NEW HAIRLINE INCOMING', W / 2, H - 50);
}

// ---------------------------------------------------------------- each attack's card: look, way in, way of sitting, bits
const THEMES = {
  trip:    { bg: ['#8d5a2b', '#3e2410'], pat: 'dots', enter: 'drop', idle: 'bob', parts: 'ball', badge: 'round', badgeCol: '#f5d7a1' },            // Tommy's final ball: dropped in, bouncing
  tackle:  { bg: ['#2e8b3a', '#124d1c'], pat: 'pitch', enter: 'left', parts: 'dust', badge: 'shield', badgeCol: '#ffffff', edge: '#ffffff' },     // Noah: charges in across a rugby pitch
  beer:    { bg: ['#f6b21b', '#9a5b06'], pat: 'bubbles', enter: 'zoom', idle: 'wobble', parts: 'bubble', badge: 'round', badgeCol: '#fff8e1', foam: true, edge: '#fffbe6' },      // Aidan: a pint glass, foam on top, dizzy
  dating:  { bg: ['#ff5c8a', '#b0124a'], pat: 'hearts', enter: 'pop', idle: 'bob', parts: 'heart', badge: 'round', badgeCol: '#ffffff', edge: '#ffffff' },     // Harry: a dating app notification
  pepsi:   { bg: ['#0b2a7a', '#020a24'], pat: 'fizz', enter: 'slam', idle: 'shake', parts: 'fizz', badge: 'round', badgeCol: '#e3f2fd', edge: '#e53935' },     // Ethan: a Pepsi Max can, fizzing
  jig:     { bg: ['#169b62', '#0b5a38'], pat: 'tricolour', enter: 'spin', idle: 'jig', parts: 'shamrock', badge: 'burst', badgeCol: '#fff3d6', edge: '#ff883e' },      // Connor: green, white and orange, jigging
  siu:     { bg: ['#046a38', '#da291c'], pat: 'portugal', enter: 'zoom', parts: 'gold', badge: 'burst', badgeCol: '#ffe082', edge: '#ffcc29' },      // Lewis: Portugal, gold
  bbq:     { bg: ['#e8501c', '#4e1206'], pat: 'flames', enter: 'rise', idle: 'shake', parts: 'ember', badge: 'burst', badgeCol: '#ffe0b2', edge: '#ffb300' },      // Ian's barbecue: up in flames
  rod:     { bg: ['#0288d1', '#01325a'], pat: 'waves', enter: 'swing', parts: 'drop', badge: 'round', badgeCol: '#e1f5fe', edge: '#ffffff' },      // Ian's rod: reeled in on a line
  diet:    { bg: ['#8bc34a', '#33691e'], pat: 'notepad', enter: 'stamp', parts: 'leaf', badge: 'round', badgeCol: '#f1f8e9', edge: '#ffffff' },      // Chloe: a diet plan, stamped
  knee:    { bg: ['#263845', '#05090c'], pat: 'xray', enter: 'flicker', parts: 'ouch', badge: 'cross', badgeCol: '#ffffff', edge: '#90caf9', subCol: '#90caf9' },      // Aidan W: an X-ray on a light box
  flash:   { bg: ['#fafafa', '#cfd8dc'], pat: 'polaroid', enter: 'flash', parts: 'sparkle', badge: 'film', badgeCol: '#212121', edge: '#212121', topCol: '#212121' },     // Oliver: a Polaroid, after the flash
  oasis:   { bg: ['#262626', '#3d2a0c'], pat: 'gig', enter: 'left', idle: 'beat', parts: 'note', badge: 'round', badgeCol: '#ffd54f', ticket: true, edge: '#ffd54f' },      // Dylan: a gig ticket, to the beat
  nutmeg:  { bg: ['#00a37a', '#004d38'], pat: 'pitch', enter: 'spin', parts: 'ball2', badge: 'round', badgeCol: '#ffffff', edge: '#ffffff' },      // Alfie: spun round on the pitch
  turkey:  { bg: ['#e30a17', '#7a0710'], pat: 'pass', enter: 'fly', idle: 'bob', parts: 'cloud', badge: 'crescent', badgeCol: '#ffffff', ticket: true, edge: '#ffffff' },      // Ben: a boarding pass to Turkey, flown in
};
// the bits: glyph, colour, where from, speed, how long, how often
const BIT = {
  ball: { glyph: '🟤', col: '#8d5a2b', from: 'bottom', vy: 0.25, grav: 0.9, vx: 0.15, life: 1.0, every: 0.25, size: 0.04, spin: 4 },
  dust: { glyph: '💨', col: '#fff', from: 'edge', vx: 0.25, vy: 0.04, life: 0.8, every: 0.15 },
  bubble: { col: '#fff8e1', from: 'bottom', vy: 0.18, vx: 0.03, life: 1.2, every: 0.07, size: 0.02 },
  heart: { glyph: '💖', col: '#ff4f7b', from: 'top', vy: 0.12, vx: 0.06, life: 1.3, every: 0.18, spin: 1 },
  fizz: { col: '#bbdefb', from: 'top', vy: 0.3, vx: 0.14, grav: 0.5, life: 0.9, every: 0.04, size: 0.014 },
  shamrock: { glyph: '☘️', col: '#2e7d32', from: 'top', vy: 0.15, vx: 0.12, life: 1.2, every: 0.16, spin: 3 },
  gold: { glyph: '★', col: '#ffd400', from: 'edge', vy: 0.12, vx: 0.2, life: 1.0, every: 0.08, spin: 4 },
  ember: { col: '#ffab40', from: 'bottom', vy: 0.22, vx: 0.05, life: 1.0, every: 0.05, size: 0.016 },
  drop: { glyph: '💧', col: '#4fc3f7', from: 'bottom', vy: 0.1, vx: 0.08, grav: 0.6, life: 0.9, every: 0.14 },
  leaf: { glyph: '🥬', col: '#7cb342', from: 'top', vy: -0.04, vx: 0.1, grav: 0.2, life: 1.3, every: 0.2, spin: 2 },
  ouch: { glyph: '⚡', col: '#ffeb3b', from: 'edge', vy: 0.06, vx: 0.12, life: 0.6, every: 0.22 },
  sparkle: { glyph: '✦', col: '#ffffff', from: 'edge', vy: 0.05, vx: 0.2, life: 0.7, every: 0.07, spin: 6 },
  note: { glyph: '♫', col: '#ffd54f', from: 'top', vy: 0.14, vx: 0.08, life: 1.2, every: 0.16, spin: 1 },
  ball2: { glyph: '⚽', col: '#fff', from: 'edge', vy: 0.1, vx: 0.3, life: 0.8, every: 0.3, spin: 9 },
  cloud: { glyph: '☁️', col: '#fff', from: 'edge', vy: 0.0, vx: 0.18, life: 1.4, every: 0.28, size: 0.05 },
  star: { glyph: '★', col: '#ffd400', from: 'edge', vy: 0.1, vx: 0.18, life: 0.9, every: 0.15, spin: 4 },
};
// "...YOU..." to everyone else: their name. ("ETHAN HITS YOU WITH A PEPSI MAX ATTACK!" -> "ETHAN HITS BETH WITH...")
export function aimAt(s, who) {
  const N = String(who).toUpperCase();
  return String(s).replace(/\bYOU HAVE\b/g, N + ' HAS').replace(/\bYOU'RE\b/g, N + "'S").replace(/\bYOUR\b/g, N + "'S").replace(/\bYOU\b/g, N).replace(/\bRONNIE\b/g, N);
}
// the background patterns
function pattern(g, k, w, h) {
  g.save();
  const rnd = mulberry(k ? k.length * 97 : 1);
  if (k === 'dots') { g.fillStyle = 'rgba(255,255,255,0.09)'; for (let y = 20; y < h; y += 40) for (let x = (y / 40 % 2) * 20; x < w; x += 40) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); } }
  else if (k === 'pitch') { for (let x = 0; x < w; x += 110) { g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x, 0, 55, h); } g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 5; g.beginPath(); g.moveTo(w * 0.62, 0); g.lineTo(w * 0.62, h); g.stroke(); g.beginPath(); g.arc(w * 0.62, h / 2, 70, 0, 7); g.stroke(); }
  else if (k === 'bubbles') { for (let i = 0; i < 46; i++) { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.beginPath(); g.arc(rnd() * w, rnd() * h, 3 + rnd() * 9, 0, 7); g.stroke(); } g.fillStyle = '#fffbe6'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, 34); for (let x = w; x >= 0; x -= 44) g.quadraticCurveTo(x - 22, 62 + rnd() * 10, x - 44, 34); g.closePath(); g.fill(); }
  else if (k === 'hearts') { g.font = '40px sans-serif'; g.fillStyle = 'rgba(255,255,255,0.14)'; for (let i = 0; i < 26; i++) g.fillText('♥', rnd() * w, rnd() * h); }
  else if (k === 'fizz') { g.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < 120; i++) { g.beginPath(); g.arc(rnd() * w, rnd() * h, 1 + rnd() * 3, 0, 7); g.fill(); } g.fillStyle = 'rgba(229,57,53,0.85)'; g.beginPath(); g.moveTo(0, h * 0.78); g.bezierCurveTo(w * 0.3, h * 0.6, w * 0.6, h * 0.98, w, h * 0.72); g.lineTo(w, h * 0.8); g.bezierCurveTo(w * 0.6, h * 1.06, w * 0.3, h * 0.68, 0, h * 0.86); g.fill(); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(0, h * 0.86, w, 4); }
  else if (k === 'tricolour') { g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(w * 0.6, 0, w * 0.14, h); g.fillStyle = 'rgba(255,136,62,0.5)'; g.fillRect(w * 0.74, 0, w * 0.3, h); g.font = '46px sans-serif'; g.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < 12; i++) g.fillText('☘', rnd() * w * 0.6, rnd() * h); }
  else if (k === 'portugal') { g.fillStyle = '#046a38'; g.fillRect(0, 0, 400, h); g.fillStyle = '#da291c'; g.fillRect(400, 0, w, h); g.fillStyle = 'rgba(255,204,41,0.9)'; g.beginPath(); g.arc(400, h / 2, 44, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, h - 120, w, 120); }
  else if (k === 'flames') { for (let i = 0; i < 18; i++) { const x = rnd() * w, hh = 80 + rnd() * 150; const gr = g.createLinearGradient(0, h, 0, h - hh); gr.addColorStop(0, 'rgba(255,214,0,0.5)'); gr.addColorStop(1, 'rgba(255,82,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 40, h); g.quadraticCurveTo(x - 30, h - hh * 0.5, x, h - hh); g.quadraticCurveTo(x + 30, h - hh * 0.5, x + 40, h); g.fill(); } g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 8; for (let x = 20; x < w; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x - 80, h); g.stroke(); } }
  else if (k === 'waves') { g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 6; for (let y = 30; y < h; y += 42) { g.beginPath(); for (let x = 0; x <= w; x += 20) g.lineTo(x, y + Math.sin(x / 40 + y) * 8); g.stroke(); } g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.9, 0); g.lineTo(w * 0.9, h * 0.3); g.stroke(); }
  else if (k === 'notepad') { g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(300, 0, w, h); g.strokeStyle = 'rgba(66,133,244,0.35)'; g.lineWidth = 2; for (let y = 60; y < h; y += 44) { g.beginPath(); g.moveTo(300, y); g.lineTo(w, y); g.stroke(); } g.strokeStyle = 'rgba(229,57,53,0.6)'; g.beginPath(); g.moveTo(316, 0); g.lineTo(316, h); g.stroke();
    g.save(); g.translate(w - 150, h - 120); g.rotate(-0.25); g.strokeStyle = 'rgba(211,47,47,0.75)'; g.lineWidth = 7; g.strokeRect(-110, -36, 220, 72); g.font = `900 40px ${FONT}`; g.fillStyle = 'rgba(211,47,47,0.75)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NO CARBS', 0, 2); g.restore(); }
  else if (k === 'xray') { g.strokeStyle = 'rgba(144,202,249,0.1)'; g.lineWidth = 1; for (let x = 0; x < w; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.save(); g.translate(w - 62, h / 2 + 10); g.scale(0.7, 0.7); g.fillStyle = 'rgba(227,242,253,0.22)'; g.beginPath(); g.ellipse(0, -110, 30, 80, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(0, 100, 26, 90, 0, 0, 7); g.fill(); g.beginPath(); g.arc(0, 0, 34, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,82,82,0.9)'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 48, 0, 7); g.stroke(); g.restore(); }
  else if (k === 'polaroid') { g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(300, 112, w - 360, h - 190); g.fillStyle = 'rgba(255,235,59,0.18)'; g.beginPath(); g.arc(w - 140, 70, 46, 0, 7); g.fill(); }
  else if (k === 'gig') { g.fillStyle = 'rgba(255,213,79,0.08)'; g.font = `900 120px ${FONT}`; g.fillText('LIVE', 420, h - 40); g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = `900 20px ${FONT}`; g.fillText('ADMIT ONE · ROW D · SEAT 7 · NO RE-ENTRY', 330, h - 18); for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(w - 80 + (i % 3) * 3, 40 + i * 10, 2 + (i % 4), 6); } }
  else if (k === 'pass') { g.fillStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.arc(w - 160, h / 2, 110, 0, 7); g.fill(); g.fillStyle = 'rgba(227,10,23,1)'; g.beginPath(); g.arc(w - 135, h / 2, 92, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = `900 20px ${FONT}`; g.fillText('LGW ✈ IST · GATE 9 · BOARDING NOW', 330, h - 18); for (let i = 0; i < 30; i++) { g.fillRect(w - 60 + (i % 3) * 3, 40 + i * 10, 2 + (i % 4), 6); } }
  g.restore();
}
// the badge behind the icon
function badge(g, k, col) {
  g.fillStyle = col; g.strokeStyle = '#111'; g.lineWidth = 8; g.beginPath();
  if (k === 'round') g.arc(0, 0, 122, 0, 7);
  else if (k === 'shield') { g.moveTo(-110, -110); g.lineTo(110, -110); g.lineTo(110, 10); g.quadraticCurveTo(100, 100, 0, 135); g.quadraticCurveTo(-100, 100, -110, 10); g.closePath(); }
  else if (k === 'cross') { for (const [x, y, ww, hh] of [[-40, -120, 80, 240], [-120, -40, 240, 80]]) g.rect(x, y, ww, hh); }
  else if (k === 'film') { g.rect(-118, -118, 236, 236); }
  else if (k === 'crescent') { g.arc(0, 0, 122, 0, 7); }
  else for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 100 : 145; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath(); g.stroke(); g.fill();
  if (k === 'film') { g.fillStyle = '#eee'; for (let i = 0; i < 6; i++) { g.fillRect(-108 + i * 38, -112, 18, 14); g.fillRect(-108 + i * 38, 98, 18, 14); } }
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
