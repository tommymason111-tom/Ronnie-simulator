// VR PAGE PANEL: a real part of the page (the start menu, the pause menu, the dev menu) shown on a panel in VR, looking
// exactly as it does on a phone or a computer (it's a picture of the page itself, taken with html2canvas whenever the
// page changes), and used the same way:
//   - point at it: whatever you're pointing at lights up
//   - pull the trigger: a tap there (the page's own button, card, tab... gets the click)
//   - hold the trigger and move: a finger dragging (the swipeable carousels swipe)
//   - the stick up/down: scrolls whatever's under the pointer
//   - a box you type in (your name, a room code): a keyboard comes up under the panel
import * as THREE from 'three';

let H2C = null;
const loadH2C = () => H2C || (H2C = new Promise((res, rej) => {
  if (window.html2canvas) return res(window.html2canvas);
  const s = document.createElement('script'); s.src = new URL('./vendor/html2canvas.min.js', import.meta.url).href;
  s.onload = () => res(window.html2canvas); s.onerror = rej; document.head.appendChild(s);
}));
export const preloadPanelLib = () => loadH2C().catch(() => {});

const CLICKABLE = 'button, a, input, label, select, textarea, [role=button], .flip, .mate, .scene, .tab, [data-s], [data-id], [data-em], [data-job], [data-ch], [data-tab], [data-pu], [data-map], [data-k]';
const KEYS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export class DomPanel {
  // width: metres across; skip: a selector for things not to draw (a WebGL canvas comes out blank anyway)
  constructor(scene, { width = 1.1, renderOrder = 60, skip = null, maxPx = 1280 } = {}) {
    this.scene = scene; this.width = width; this.skip = skip; this.maxPx = maxPx;
    this.cv = document.createElement('canvas'); this.cv.width = 16; this.cv.height = 16; this.g = this.cv.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, depthWrite: false }));
    this.mesh.renderOrder = renderOrder; this.mesh.visible = false; scene.add(this.mesh);
    // the keyboard (a little panel of its own, under the page)
    this.kcv = document.createElement('canvas'); this.kcv.width = 1024; this.kcv.height = 420; this.kg = this.kcv.getContext('2d');
    this.ktex = new THREE.CanvasTexture(this.kcv); this.ktex.colorSpace = THREE.SRGBColorSpace;
    this.kmesh = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75 * 420 / 1024), new THREE.MeshBasicMaterial({ map: this.ktex, transparent: true, depthTest: false, depthWrite: false }));
    this.kmesh.renderOrder = renderOrder + 1; this.kmesh.visible = false; this.mesh.add(this.kmesh);
    this.ray = new THREE.Raycaster(); this.base = null; this.rect = null; this.dirty = true; this.busy = false; this.lastShot = 0;
    this.hoverEl = null; this.press = null; this.kb = null; this.kHover = -1; this.keys = [];
    this.obs = new MutationObserver(() => { this.dirty = true; this.lastMut = performance.now(); }); this.lastMut = 0;
    this.held = new WeakMap();      // (each controller's trigger last frame)
  }
  get open() { return this.mesh.visible; }
  // show the element getEl() returns (looked up every time, so it can be whichever page is showing)
  show(getEl) { this.getEl = getEl; this.mesh.visible = true; this.dirty = true; this.base = null; this.kb = null; this.kmesh.visible = false;
    try { this.obs.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); } catch (e) {}
    preloadPanelLib(); }
  hide() { this.mesh.visible = false; this.kmesh.visible = false; this.kb = null; this.press = null; this.obs.disconnect(); }
  // where it is: in front of `from` (a point), `dist` metres along `dir` (flat), facing back at it
  place(from, dir, dist = 1.1, dy = -0.1, side = 0) {
    const d = new THREE.Vector3(dir.x, 0, dir.z); if (d.lengthSq() < 1e-6) d.set(0, 0, -1); d.normalize();
    const right = new THREE.Vector3(-d.z, 0, d.x);
    this.mesh.position.copy(from).addScaledVector(d, dist).addScaledVector(right, side); this.mesh.position.y = from.y + dy;
    this.mesh.lookAt(from.x, this.mesh.position.y, from.z);
  }
  // ---- the picture of the page
  async shoot() {
    const el = this.getEl && this.getEl(); if (!el || !el.getClientRects().length) return;
    this.busy = true; this.dirty = false;
    try {
      const h2c = await loadH2C(), r = el.getBoundingClientRect(), scale = Math.min(2, this.maxPx / Math.max(1, r.width));
      const skip = this.skip;
      const shot = await h2c(el, { backgroundColor: null, scale, logging: false, useCORS: true, removeContainer: true,
        ignoreElements: (e) => !!(skip && e.matches && e.matches(skip)),
        // (the copy that's drawn has its animations switched off: a picture taken mid-pulse or mid-slide came out
        // doubled up or half way across)
        onclone: (doc, ce) => { const st = doc.createElement('style'); st.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }'; doc.head.appendChild(st);
          // (a menu centred with a CSS transform, like the dev menu, came out shifted half off the picture: the copy's put
          // exactly where the real one is, without the transform)
          if (ce && ce.style && getComputedStyle(el).transform !== 'none') Object.assign(ce.style, { transform: 'none', left: r.left + 'px', top: r.top + 'px', right: 'auto', bottom: 'auto', margin: '0' }); } });
      this.base = shot; this.rect = { left: r.left, top: r.top, width: r.width, height: r.height };
      // (a new size needs a new texture on the graphics card: the old one can't grow, the picture just didn't update)
      if (this.cv.width !== shot.width || this.cv.height !== shot.height) { this.cv.width = shot.width; this.cv.height = shot.height; this.tex.dispose(); }
      const h = this.width * shot.height / shot.width; this.mesh.scale.set(this.width, h, 1);
      this.kmesh.position.set(0, -0.5 - (0.75 * 420 / 1024) / 2 / h - 0.02, 0); this.kmesh.scale.set(1 / this.width, 1 / h, 1);
      this.compose();
    } catch (e) { console.warn('vr panel', e); }
    this.busy = false; this.lastShot = performance.now();
  }
  // the picture plus the outline round what you're pointing at
  compose() {
    if (!this.base) return; const g = this.g; g.clearRect(0, 0, this.cv.width, this.cv.height); g.drawImage(this.base, 0, 0);
    const el = this.hoverEl; if (el && this.rect && el.isConnected) { const b = el.getBoundingClientRect(), k = this.cv.width / this.rect.width;
      const x = (b.left - this.rect.left) * k, y = (b.top - this.rect.top) * k, w = b.width * k, h = b.height * k;
      g.save(); g.lineWidth = Math.max(4, 5 * k); g.strokeStyle = '#ffe866'; g.shadowColor = '#ffd400'; g.shadowBlur = 18 * k; g.fillStyle = 'rgba(255,232,102,0.16)';
      g.beginPath(); g.roundRect(x - 3 * k, y - 3 * k, w + 6 * k, h + 6 * k, 14 * k); g.fill(); g.stroke(); g.restore(); }
    this.tex.needsUpdate = true;
  }
  // a point on the panel (uv) -> where that is on the page
  client(uv) { const r = this.rect; return r ? { x: r.left + uv.x * r.width, y: r.top + (1 - uv.y) * r.height } : null; }
  // what's under a point on the page: the top thing that's actually drawn on the panel. Something left off the panel
  // (the 3D Ronnie's canvas over the title screen) mustn't take the tap: it did, and PLAY never got pressed
  target(p) { const skip = this.skip; for (const e of document.elementsFromPoint(p.x, p.y)) { if (skip && e.closest && e.closest(skip)) continue; return e; } return null; }
  fire(type, el, p, Cls = PointerEvent) {
    if (!el) return; const o = { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, pointerId: 31, pointerType: 'touch', isPrimary: true, button: 0, buttons: type === 'pointerup' || type === 'click' ? 0 : 1 };
    try { el.dispatchEvent(new Cls(type, o)); } catch (e) { el.dispatchEvent(new MouseEvent(type, o)); }
  }
  // ---- the keyboard
  drawKb() {
    const g = this.kg, W = 1024, H = 420; g.clearRect(0, 0, W, H); this.keys = [];
    g.fillStyle = 'rgba(20,24,60,0.96)'; g.beginPath(); g.roundRect(4, 4, W - 8, H - 8, 26); g.fill(); g.lineWidth = 5; g.strokeStyle = '#ffd400'; g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(30, 18, W - 60, 56, 14); g.fill(); g.fillStyle = '#111'; g.font = '900 34px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(this.kb.el.value || ' ', W / 2, 47);
    const kw = (W - 60) / 10; let y = 86;
    const key = (x0, y0, x1, y1, k, label, col) => { const i = this.keys.length; this.keys.push({ x0, y0, x1, y1, k }); g.fillStyle = this.kHover === i ? '#ffe866' : col; g.beginPath(); g.roundRect(x0, y0, x1 - x0, y1 - y0, 10); g.fill();
      g.fillStyle = this.kHover === i || col === '#39ff14' ? '#111' : '#fff'; g.font = '900 28px Arial'; g.fillText(label, (x0 + x1) / 2, (y0 + y1) / 2 + 1); };
    for (const line of KEYS) { const x0 = (W - line.length * kw) / 2; [...line].forEach((ch, i) => key(x0 + i * kw + 3, y, x0 + (i + 1) * kw - 3, y + 62, ch, ch, '#3b2f9a')); y += 68; }
    key(30, y, 330, y + 54, 'SPACE', 'SPACE', '#3b2f9a'); key(342, y, 600, y + 54, 'DEL', '⌫ DELETE', '#7a2a3a'); key(612, y, W - 30, y + 54, 'DONE', '✓ DONE', '#39ff14');
    this.ktex.needsUpdate = true;
  }
  kbPress(k) { const el = this.kb.el, max = el.maxLength > 0 ? el.maxLength : 24;
    if (k === 'DONE') { this.kb = null; this.kmesh.visible = false; el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); this.dirty = true; return; }
    if (k === 'DEL') el.value = el.value.slice(0, -1); else if (el.value.length < max) el.value += k === 'SPACE' ? ' ' : (el.dataset.lower ? k.toLowerCase() : k);
    el.dispatchEvent(new Event('input', { bubbles: true })); this.drawKb(); this.dirty = true; }
  // ---- every frame. pointers: [{ obj (its -z is the pointer), down (trigger held), stickY }]. Returns true if any
  // pointer is on the panel (so the game doesn't also use that trigger)
  update(dt, pointers) {
    if (!this.mesh.visible) return false;
    const now = performance.now(), dragging = !!(this.press && this.press.moved);
    if (!this.busy && (this.dirty || !this.base || now - this.lastShot > (dragging ? 160 : 1200)) && now - this.lastShot > (dragging ? 120 : 220) && (dragging || !this.base || now - this.lastMut > 260)) this.shoot();
    let on = false, hoverEl = null, kHover = -1;
    for (const ptr of pointers) {
      if (!ptr || !ptr.obj) continue; ptr.obj.updateMatrixWorld();
      const o = new THREE.Vector3().setFromMatrixPosition(ptr.obj.matrixWorld), d = new THREE.Vector3(0, 0, -1).transformDirection(ptr.obj.matrixWorld);
      this.ray.set(o, d);
      const hits = this.ray.intersectObjects(this.kb ? [this.kmesh, this.mesh] : [this.mesh], false), h = hits[0];
      ptr.hit = h || null;
      // the trigger: a tap, or a finger dragging, on the page / a key on the keyboard
      const was = !!this.held.get(ptr.obj); this.held.set(ptr.obj, !!ptr.down);
      if (h && h.object === this.kmesh) { on = true; const x = h.uv.x * 1024, y = (1 - h.uv.y) * 420, i = this.keys.findIndex(k => x >= k.x0 && x <= k.x1 && y >= k.y0 && y <= k.y1); kHover = i;
        if (ptr.down && !was && i >= 0) this.kbPress(this.keys[i].k); continue; }
      if (h && h.object === this.mesh && this.rect) { on = true;
        const p = this.client(h.uv), el = this.target(p); hoverEl = el && (el.closest(CLICKABLE) || null);
        if (ptr.down && !was) { this.press = { ptr: ptr.obj, el, start: p, last: p, moved: false }; this.fire('pointerdown', el, p); }
        else if (ptr.down && this.press && this.press.ptr === ptr.obj) { const m = Math.hypot(p.x - this.press.start.x, p.y - this.press.start.y); if (m > 10) this.press.moved = true;
          if (Math.hypot(p.x - this.press.last.x, p.y - this.press.last.y) > 1) { this.fire('pointermove', this.press.el, p); this.press.last = p; this.dirty = true; } }
        // the stick: scroll whatever's under the pointer
        if (Math.abs(ptr.stickY || 0) > 0.2) { let s = el; while (s && s !== document.body && !(s.scrollHeight > s.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(s).overflowY))) s = s.parentElement;
          if (s && s !== document.body) { s.scrollTop += ptr.stickY * dt * 900; this.dirty = true; } }
      }
      if (!ptr.down && was && this.press && this.press.ptr === ptr.obj) {      // let go
        const pr = this.press; this.press = null; const p = h && h.object === this.mesh ? this.client(h.uv) : pr.last;
        this.fire('pointerup', pr.el, p);
        if (!pr.moved) { const el = pr.el, inp = el && el.closest('input, textarea');
          if (inp && !/^(button|submit|checkbox|radio|range|file)$/i.test(inp.type || '')) { this.kb = { el: inp }; this.kmesh.visible = true; this.drawKb(); try { inp.focus({ preventScroll: true }); } catch (e) {} }
          else if (el) { const c = el.closest(CLICKABLE) || el; this.fire('click', el, p, MouseEvent); if (c.tagName === 'SELECT') c.focus(); } }
        this.dirty = true;
      }
    }
    if (kHover !== this.kHover && this.kb) { this.kHover = kHover; this.drawKb(); }
    // (redraw the outline if what you're pointing at changed, or moved: a screen sliding in)
    const hr = hoverEl && hoverEl.getBoundingClientRect(), hk = hr ? `${Math.round(hr.left)},${Math.round(hr.top)},${Math.round(hr.width)},${Math.round(hr.height)}` : '';
    if (hoverEl !== this.hoverEl || hk !== this.hoverKey) { this.hoverEl = hoverEl; this.hoverKey = hk; this.compose(); }
    return on;
  }
  dispose() { this.hide(); this.scene.remove(this.mesh); this.tex.dispose(); this.ktex.dispose(); }
}
