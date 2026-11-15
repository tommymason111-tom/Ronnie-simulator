// RUN THE PUB: everything behind the bar for making drinks.
//   GUINNESS TAP   hold a pint glass under it (phone: tap it while you're holding one) and it pours a pint
//   LAGER / CIDER      open-fronted fridges: take a bottle
//   MONSTOR            its own glowing fridge: take a can
//   WINE               poured and waiting on the back counter (red and white)
//   COFFEE MACHINE     hold a mug under it
//   SOFT-DRINK GUN     hold the gun over a cup (phone: hold the gun and tap a cup); switch COKE / FANTA with the
//                      A / X button (phone: the button that's usually EAT)
//   PINT GLASSES, MUGS, CUPS   stacks to take from
// Everything restocks itself. Each station has a sign, and the game points at the one you need next.
import * as THREE from 'three';
import { sfx } from './audio.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function sign(text, sub, col = '#ffd400') {
  const c = document.createElement('canvas'); c.width = 320; c.height = sub ? 120 : 84; const g = c.getContext('2d');
  g.fillStyle = 'rgba(10,14,30,0.85)'; g.beginPath(); g.roundRect(4, 4, 312, c.height - 8, 20); g.fill(); g.lineWidth = 5; g.strokeStyle = col; g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; let f = 38; do { g.font = `900 ${f}px Arial`; f -= 2; } while (g.measureText(text).width > 290 && f > 14); g.fillText(text, 160, sub ? 40 : 42);
  if (sub) { g.fillStyle = '#fff'; f = 20; do { g.font = `700 ${f}px Arial`; f -= 1; } while (g.measureText(sub).width > 296 && f > 10); g.fillText(sub, 160, 86); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(0.34, 0.34 * c.height / 320, 1); s.renderOrder = 9; return s;
}

export class Bar {
  constructor(rp) {
    this.rp = rp; this.g = rp.g; this.grp = new THREE.Group(); this.g.scene.add(this.grp); this.fill = new Map(); this.gunFlavour = 0; this.stockT = 0;
    const M = (c, e = 0) => new THREE.MeshLambertMaterial({ color: c, emissive: e });
    const add = (geo, c, x, y, z, rot = [0, 0, 0], e = 0) => { const m = new THREE.Mesh(geo, M(c, e)); m.position.set(x, y, z); m.rotation.set(...rot); this.grp.add(m); return m; };
    const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (r1, r2, h, s = 16) => new THREE.CylinderGeometry(r1, r2, h, s);
    const S = this.st = {};
    const station = (key, o) => { S[key] = o; o.key = key; o.sign = sign(o.name, o.how); o.sign.position.copy(o.signAt || o.at.clone().add(V(0, 0.32, 0))); this.grp.add(o.sign); return o; };

    // ---- the GUINNESS tap, on the bar (staff side)
    { const x = 2.62, z = -5.9;
      add(C(0.045, 0.05, 0.04), 0x111111, x, 1.1, z); add(C(0.03, 0.03, 0.34), 0x111111, x, 1.27, z);
      add(C(0.045, 0.045, 0.012, 24), 0xd4af37, x + 0.035, 1.38, z, [0, 0, Math.PI / 2]);                 // the gold harp badge
      add(B(0.02, 0.012, 0.12), 0xd8dce0, x + 0.06, 1.3, z, [0, Math.PI / 2, 0]); add(C(0.008, 0.006, 0.05), 0xd8dce0, x + 0.12, 1.27, z);   // spout
      add(B(0.016, 0.07, 0.016), 0x111111, x + 0.04, 1.47, z, [0, 0, 0.3]);                               // the handle
      add(B(0.16, 0.012, 0.12), 0x2a2a2a, x + 0.12, 1.088, z);                                            // drip tray
      station('tap', { name: 'GUINNESS TAP', how: 'hold a pint glass under it', at: V(x + 0.12, 1.17, z), signAt: V(x + 0.05, 1.72, z), fill: { from: 'glass', to: 'pint', time: 2.4, word: 'POURING… LET IT SETTLE' } }); }
    // ---- open fridges in the back bar: lager, cider, MONSTOR
    const fridge = (key, name, z, glow, type, v) => {
      add(B(0.36, 0.7, 0.5), 0x0c0e10, 5.66, 0.4, z); add(B(0.02, 0.72, 0.52), 0x9aa0a6, 5.47, 0.4, z);
      add(B(0.3, 0.6, 0.02), glow, 5.84, 0.4, z, [0, Math.PI / 2, 0], glow);                             // lit back wall
      for (const y of [0.22, 0.52]) add(B(0.32, 0.012, 0.46), 0xd8e8f0, 5.64, y - 0.01, z);
      const spots = []; for (const y of [0.22, 0.52]) for (const dz of [-0.15, -0.05, 0.05, 0.15]) spots.push(V(5.52, y + 0.07, z + dz));
      return station(key, { name, how: 'take one', at: V(5.5, 0.5, z), signAt: V(5.42, 0.98, z), stock: { type, v, spots } });
    };
    void fridge;
    // lager and cider: up on the back counter in steel ice buckets, where you can see them
    const bucket = (key, name, z, type) => { const x = 5.62;
      add(C(0.17, 0.14, 0.2, 20), 0xc8ccd2, x, 1.02, z); add(new THREE.TorusGeometry(0.17, 0.012, 6, 20), 0xd8dce0, x, 1.12, z, [Math.PI / 2, 0, 0]);
      for (let i = 0; i < 16; i++) add(B(0.035, 0.035, 0.035), 0xe8f6fa, x + Math.cos(i * 2.4) * 0.1, 1.1, z + Math.sin(i * 2.4) * 0.1, [i, i * 2, 0]);
      const spots = []; for (let i = 0; i < 5; i++) spots.push(V(x + Math.cos(i * 1.256) * 0.08, 1.02, z + Math.sin(i * 1.256) * 0.08));
      return station(key, { name, how: 'take a bottle', at: V(x, 1.1, z), signAt: V(x - 0.05, 1.55, z), stock: { type, spots } }); };
    bucket('lager', 'LAGER', -7.65, 'beer');
    bucket('cider', 'CIDER', -7.05, 'cider');
    // MONSTOR: in its own glowing fridge at the end of the bar (the front of the middle shelf)
    { const spots = []; for (const x of [4.25, 4.5, 4.75, 5.0, 5.25]) spots.push(V(x, 1.08, -8.36));
      station('monstor', { name: 'MONSTOR', how: 'from the MONSTOR fridge', at: V(4.75, 1.1, -8.3), signAt: V(4.75, 2.12, -8.15), stock: { type: 'can', spots } }); }
    // ---- pint glasses, wine, mugs + coffee machine on the back counter
    { const z = -5.55; add(B(0.32, 0.02, 0.36), 0x3a3a3a, 5.66, 0.91, z);
      const spots = []; for (const dx of [-0.06, 0.06]) for (const dz of [-0.12, 0, 0.12]) spots.push(V(5.62 + dx, 0.99, z + dz));
      station('glasses', { name: 'PINT GLASSES', how: 'for the GUINNESS tap', at: V(5.6, 1.0, z), stock: { type: 'glass', spots } }); }
    { const z = -4.75, spots = []; for (const dz of [-0.16, -0.06, 0.04, 0.14]) spots.push(V(5.6, 0.995, z + dz));
      station('wine', { name: 'WINE', how: 'poured and ready: red or white', at: V(5.6, 1.0, z), stock: { type: 'wine', alt: true, spots } }); }
    { const z = -3.75;
      add(B(0.34, 0.38, 0.4), 0xb8bcc2, 5.78, 1.1, z); add(B(0.36, 0.06, 0.42), 0x222222, 5.78, 1.31, z);        // the machine
      add(C(0.03, 0.03, 0.04), 0x222222, 5.58, 1.12, z - 0.07); add(C(0.03, 0.03, 0.04), 0x222222, 5.58, 1.12, z + 0.07);   // group heads
      add(B(0.08, 0.01, 0.3), 0x444444, 5.56, 0.915, z);                                                         // drip tray
      add(C(0.004, 0.004, 0.14), 0xd8dce0, 5.6, 1.12, z + 0.17, [0.4, 0, 0]);                                    // steam wand
      station('coffee', { name: 'COFFEE MACHINE', how: 'hold a mug under it', at: V(5.56, 1.0, z), signAt: V(5.6, 1.5, z), fill: { from: 'mug', to: 'coffee', time: 1.8, word: 'BREWING…' } }); }
    { const z = -3.25, spots = []; for (const dz of [-0.06, 0.06]) for (const dx of [0, 0.09]) spots.push(V(5.58 + dx, 0.95, z + dz));
      station('mugs', { name: 'MUGS', how: 'for the coffee machine', at: V(5.6, 0.98, z), stock: { type: 'mug', spots } }); }
    // ---- the soft-drink gun on the bar, and the cups
    { const x = 2.78, z = -3.6;
      add(B(0.08, 0.1, 0.05), 0x1a1a1a, x + 0.04, 1.03, z);                                                      // holster
      this.gunHome = V(x, 1.15, z);
      station('gun', { name: 'SOFT-DRINK GUN', how: 'hold it over a cup · A/X (or EAT) = COKE/FANTA', at: V(x, 1.15, z), signAt: V(x, 1.52, z), stock: { type: 'sodagun', spots: [this.gunHome] } });
      const spots = []; for (const dz of [0.22, 0.32, 0.42]) spots.push(V(x - 0.02, 1.13, z + dz));
      station('cups', { name: 'CUPS', how: 'for the soft-drink gun', at: V(x, 1.15, z + 0.32), signAt: V(x, 1.42, z + 0.32), stock: { type: 'cup', spots } }); }
    // the arrow that shows you where to go
    this.arrow = new THREE.Group(); const cone = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 16), new THREE.MeshBasicMaterial({ color: 0x39ff14 })); cone.rotation.x = Math.PI; this.arrow.add(cone);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 8, 32), new THREE.MeshBasicMaterial({ color: 0x39ff14 })); ring.rotation.x = Math.PI / 2; ring.position.y = -0.2; this.arrow.add(ring);
    this.arrow.visible = false; this.grp.add(this.arrow);
    this.restock(true);
  }

  // ------------------------------------------------------------------ keep everything stocked
  restock(first) {
    const items = this.g.items;
    for (const s of Object.values(this.st)) { if (!s.stock) continue;
      s.stock.spots.forEach((p, i) => {
        if (s.stock.type === 'sodagun' && this.gun && !this.gun.dead) return;
        if (items.items.some(it => !it.dead && it.pos.distanceToSquared(p) < 0.06 * 0.06)) return;
        const it = items.spawn(s.stock.type, p.clone(), null, s.stock.alt ? i % 2 : null); it.resting = true; it.shelf = true; it.spawnScale = first ? 1 : 0.2; it.barStock = true;
        if (s.stock.type === 'sodagun') this.gun = it;
      }); }
  }
  // swap what's in your hand for something else (an empty glass becomes a pint...)
  swap(it, type, v) {
    const items = this.g.items, P = this.g.player, n = items.spawn(type, it.pos.clone(), null, v ?? null);
    n.spawnScale = 1; n.obj.scale.setScalar(1); n.obj.quaternion.copy(it.obj.quaternion); n.barStock = true;
    const h = it.heldBy;
    if (h) { if (h.isFlat) { P.flatHolder.held = n; n.heldBy = P.flatHolder; } else { h.held = n; n.heldBy = h; } } else { n.resting = true; n.shelf = true; }
    it.heldBy = null; items.remove(it); return n;
  }
  held() { const P = this.g.player; return [...(P.hands || []).filter(h => h.tracked).map(h => h.held), P.flatHolder && P.flatHolder.held].filter(it => it && !it.dead); }

  // ------------------------------------------------------------------ every frame
  update(dt) {
    if ((this.stockT -= dt) <= 0) { this.stockT = 1; this.restock(false); }
    const P = this.g.player, held = this.held();
    // filling at the tap / the coffee machine: hold the right glass there (VR), or it's being done for you (phone tap)
    for (const s of [this.st.tap, this.st.coffee]) {
      const af = this.autoFill && this.autoFill.st === s && !this.autoFill.it.dead ? this.autoFill.it : null;
      const it = af || held.find(i => i.type === s.fill.from && i.pos.distanceTo(s.at) < 0.13);
      let f = this.fill.get(s.key) || 0;
      // what's being filled stands right under the spout where you can see it, the drink rising in it
      const fx = s.fx || (s.fx = this.fillFx(s)); fx.visible = !!it;
      for (const o of held) if (o.filling === s && o !== it) o.filling = null;
      if (it) { f += dt; if (this.autoFill && this.autoFill.st === s) { it.filling = s; it.pos.copy(s.at).add(V(0, -0.06, 0)); it.obj.position.copy(it.pos); it.obj.quaternion.identity(); }
        const k = Math.min(1, f / s.fill.time); fx.position.copy(it.pos); fx.children[1].scale.y = Math.max(0.02, k); fx.children[1].position.y = -0.05 + 0.05 * k; fx.children[0].visible = k < 0.98;
        if (Math.floor((f - dt) * 2) !== Math.floor(f * 2)) { this.g.words.show(f >= s.fill.time ? 'DONE!' : s.fill.word, s.at.clone().add(V(0, 0.22, 0)), '#ffd400', 0.08, 0.5); sfx('fizz', s.at, 0.5); }
        if (f >= s.fill.time) { it.filling = null; fx.visible = false; const n = this.swap(it, s.fill.to); if (af) { n.pos.copy(s.at).add(V(0, -0.06, 0)); n.prev.copy(n.pos); n.obj.position.copy(n.pos); n.vel && n.vel.set(0, 0, 0); n.resting = true; n.shelf = true; this.g.words.show('READY! PICK IT UP', s.at.clone().add(V(0, 0.3, 0)), '#39ff14', 0.07, 1.2); } f = 0; this.autoFill = null; sfx('ting', s.at, 0.7); } }
      else f = 0;
      this.fill.set(s.key, f);
    }
    // the soft-drink gun: held over a cup pours into it
    const gun = this.gun && !this.gun.dead ? this.gun : null;
    if (gun && gun.heldBy) {
      const nozzle = gun.pos.clone().add(V(0, -0.06, 0)); let cup = this.autoCup && !this.autoCup.dead ? this.autoCup : null;
      if (!cup) cup = this.g.items.items.find(i => !i.dead && i.type === 'cup' && i.pos.distanceTo(nozzle) < 0.12);
      if (cup) { if (this.autoCup === cup) { gun.pos.lerp(cup.pos.clone().add(V(0, 0.09, 0)), 0.25); }
        this.gunT = (this.gunT || 0) + dt; if (Math.floor((this.gunT - dt) * 3) !== Math.floor(this.gunT * 3)) sfx('fizz', cup.pos, 0.4);
        if (this.gunT > 1.2) { this.swap(cup, 'soft', this.gunFlavour); this.gunT = 0; this.autoCup = null; this.g.words.show(this.gunFlavour ? 'FANTA!' : 'COKE!', cup.pos.clone().add(V(0, 0.15, 0)), this.gunFlavour ? '#ff8a00' : '#c8102e', 0.08, 0.8); } }
      else this.gunT = 0;
      // VR: A / X on the hand holding the gun switches COKE / FANTA
      for (const h of P.hands || []) { if (h.held !== gun) continue; const gp = h.source && h.source.gamepad, b = !!(gp && gp.buttons[4] && gp.buttons[4].pressed);
        if (b && !this.gunBtn) this.toggleFlavour(); this.gunBtn = b; }
    }
    if (this.sodaCup) { const sc = this.sodaCup; sc.t += dt; if (sc.it.dead || sc.it.heldBy) this.sodaCup = null; else if (sc.t > 1.2) { const n = this.swap(sc.it, 'soft', this.gunFlavour); n.resting = true; n.shelf = true; this.sodaCup = null; this.g.words.show(this.gunFlavour ? 'FANTA! PICK IT UP' : 'COKE! PICK IT UP', n.pos.clone().add(V(0, 0.15, 0)), this.gunFlavour ? '#ff8a00' : '#c8102e', 0.07, 1); sfx('ting', n.pos, 0.6); } else if (Math.floor(sc.t * 3) !== Math.floor((sc.t - dt) * 3)) sfx('fizz', sc.it.pos, 0.4); }
    for (const it of this.g.items.items) if (it.heldBy && it.shelf && it.barStock) it.shelf = false;
    if (gun && !gun.heldBy && gun.pos.distanceTo(this.gunHome) < 0.35 && gun.pos.distanceTo(this.gunHome) > 0.02) { gun.pos.copy(this.gunHome); gun.prev.copy(gun.pos); gun.vel.set(0, 0, 0); gun.resting = true; gun.shelf = true; }
    // the gun goes back in its holster if it's left lying about
    if (gun && !gun.heldBy) { if (gun.pos.distanceTo(this.gunHome) > 0.3) { this.gunAway = (this.gunAway || 0) + dt; if (this.gunAway > 3) { gun.pos.copy(this.gunHome); gun.prev.copy(gun.pos); gun.vel.set(0, 0, 0); gun.resting = true; gun.shelf = true; this.gunAway = 0; } } else this.gunAway = 0; }
    // the arrow: bobbing over wherever you need to go next
    if (this.arrowAt) { this.arrow.visible = true; this.arrow.position.copy(this.arrowAt).add(V(0, 0.42 + Math.sin(performance.now() / 180) * 0.04, 0)); this.arrow.rotation.y += dt * 2; } else this.arrow.visible = false;
  }
  // markers over the stations people are waiting on: { key: icon } (several at once, any order), drawn with the drink's logo
  setMarks(want) { this.markPool = this.markPool || new Map();
    for (const [k, m] of this.markPool) m.visible = !!want[k];
    for (const k in want) { let m = this.markPool.get(k); const s = this.st[k]; if (!s) continue;
      if (!m || m.userData.icon !== want[k]) { if (m) this.grp.remove(m); m = new THREE.Group(); m.userData.icon = want[k];
        const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#39ff14'; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.fillStyle = '#0a1a0a'; g.beginPath(); g.arc(64, 64, 48, 0, 7); g.fill();
        g.font = '62px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(want[k], 64, 70); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); sp.scale.setScalar(0.2); sp.renderOrder = 22; m.add(sp);
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 12), new THREE.MeshBasicMaterial({ color: 0x39ff14, depthTest: false })); cone.rotation.x = Math.PI; cone.position.y = -0.15; cone.renderOrder = 22; m.add(cone);
        this.grp.add(m); this.markPool.set(k, m); }
      m.visible = true; m.position.copy(s.signAt || s.at).add(V(0, 0.32 + Math.sin(performance.now() / 220 + k.length) * 0.03, 0)); } }
  // the pour: a stream from the spout and the drink rising in the glass / mug
  fillFx(s) {
    const g = new THREE.Group(), dark = s.key === 'tap', col = dark ? 0x140a06 : 0x5a3418;
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 6), new THREE.MeshLambertMaterial({ color: col })); stream.position.y = 0.09; g.add(stream);
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(dark ? 0.033 : 0.03, dark ? 0.028 : 0.03, 0.1, 14), new THREE.MeshLambertMaterial({ color: col })); liquid.position.y = -0.05; g.add(liquid);
    g.visible = false; this.grp.add(g); return g;
  }
  // the easy way with the soft-drink gun: holding a cup, tap the gun: the cup goes under it and it fills with whatever
  // somebody's waiting for (Coke, or Fanta), and it's left there for you to pick up
  quickSoda(cup) { const P = this.g.player; P.flatDrop(); cup.heldBy = null; const at = this.gunHome.clone().add(V(0.06, -0.1, 0)); cup.pos.copy(at); cup.prev.copy(at); cup.obj.position.copy(at); cup.vel && cup.vel.set(0, 0, 0); cup.resting = true; cup.shelf = true;
    const want = this.rp.waiting && this.rp.waiting().find(c => c.rp.order && c.rp.order.make === 'gun'); if (want) this.gunFlavour = want.rp.orderKey === 'fanta' ? 1 : 0;
    this.sodaCup = { it: cup, t: 0 }; sfx('fizz', at, 0.6); }
  holster() { const P = this.g.player, gun = this.gun; if (!gun) return; P.flatDrop(); gun.heldBy = null; gun.pos.copy(this.gunHome); gun.prev.copy(gun.pos); gun.obj.position.copy(gun.pos); gun.vel && gun.vel.set(0, 0, 0); gun.resting = true; gun.shelf = true; sfx('clink', this.gunHome, 0.6); this.g.words.show('GUN BACK IN ITS HOLDER', this.gunHome.clone().add(V(0, 0.25, 0)), '#ffd400', 0.06, 0.9); }
  toggleFlavour() { this.gunFlavour = 1 - this.gunFlavour; sfx('pop', this.gun ? this.gun.pos : null, 0.6); if (this.gun) this.g.words.show(this.gunFlavour ? 'FANTA' : 'COKE', this.gun.pos.clone().add(V(0, 0.12, 0)), this.gunFlavour ? '#ff8a00' : '#c8102e', 0.07, 0.7); }
  // phone / PC: a tap on the tap or the coffee machine (holding the right glass), or on a cup (holding the gun)
  tap(ray) {
    const P = this.g.player, held = P.flatHolder && P.flatHolder.held;
    const near = (p, r) => { const along = new THREE.Vector3().subVectors(p, ray.origin).dot(ray.direction); return along > 0 && along < 4 && ray.distanceSqToPoint(p) < r * r; };
    const gunSt = this.st.gun, atGun = near(gunSt.at, 0.24) || near(gunSt.at.clone().add(V(0, 0.2, 0)), 0.2);
    if (held && held.type === 'sodagun' && atGun) { this.holster(); return true; }                                     // put the gun back
    if (held && held.type === 'sodagun') { const cup = this.g.items.items.find(i => !i.dead && i.type === 'cup' && near(i.pos, 0.09)); if (cup) { this.autoCup = cup; return true; } }
    if (held && held.type === 'cup' && atGun) { this.quickSoda(held); return true; }                                   // a cup: the gun fills it
    for (const s of [this.st.tap, this.st.coffee]) if (near(s.at, 0.22) || near(s.at.clone().add(V(0, 0.15, 0)), 0.18)) {
      if (held && held.type === s.fill.from) { P.flatDrop(); held.heldBy = null; held.pos.copy(s.at).add(V(0, -0.06, 0)); held.prev.copy(held.pos); held.obj.position.copy(held.pos); held.vel && held.vel.set(0, 0, 0); held.resting = true; held.shelf = true; this.autoFill = { st: s, it: held }; return true; }
      this.g.hint(held ? `That needs ${s.fill.from === 'glass' ? 'a pint glass' : 'a mug'}` : `Grab ${s.fill.from === 'glass' ? 'a pint glass' : 'a mug'} first, then tap here`); return true; }
    return false;
  }
  dispose() { this.g.scene.remove(this.grp); for (const it of this.g.items.items.slice()) if (it.barStock && !it.heldBy) this.g.items.remove(it); }
}
