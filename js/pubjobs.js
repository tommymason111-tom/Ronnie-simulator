// RUN THE PUB: the other staff don't serve for you (they're behind the bar for the look of it), but every so often
// one of them asks you to do something:
//   BEN (kitchen)      "FOOD'S UP!": collect the plate at the pass, take it out to whoever ordered it
//   LEWIS (restaurant) "TAKE AN ORDER": go to a table in the restaurant, take their order, take the ticket to Ben
//   AIDAN / CONNOR / CHLOE (bar)  "EMPTIES!": collect the empty glasses off the tables, put them in the glass washer
//                                 "CHANGE THE BARREL": down the hatch behind the bar, stay there till it's done
// Each job pops up as a card (who's asking, what they said), then sits in the TO DO list next to the orders with its
// steps ticked off, along with anything that's kicking off in the pub (fights, singers, kids, fuming punters).
// A blue arrow points at where the job needs you next.
import * as THREE from 'three';
import { sfx } from './audio.js';

const R = (a) => a[Math.floor(Math.random() * a.length)];
const COL = { job: '#29b6ff', event: '#ff9a1f', fume: '#ff3b3b' };
const EV_ICON = { fight: '🥊', singer: '🎤', kid: '🧒', spill: '🧽', loo: '🚽', power: '💡', hen: '👰' };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const BEN = V(-13.2, 0, -7.4), HATCH = V(4.5, 0, -8.15);
const DISHES = ['scampi and chips', 'pie and mash', 'the Ronnie Platter', 'a gammon steak', 'fish and chips', 'a jacket potato', 'a mixed grill', 'the Sunday roast'];
const ORDER_LINES = [['2x Scampi & chips', '1x Pie & mash', '1x Kids nuggets', 'NO SALAD (thanks Ron)'], ['1x Mixed grill', '1x Gammon, egg AND pineapple', '2x Garlic bread', 'Extra gravy. EXTRA.'], ['3x Fish & chips', '1x Sausage & mash', 'Mushy peas x4', 'Can Ronnie NOT touch it'], ['1x Sunday roast', '1x Veggie lasagne', '2x Chips (cheesy)', 'Ketchup on the side']];

export class PubJobs {
  constructor(rp) {
    this.rp = rp; this.g = rp.g; this.job = null; this.nextT = 18; this.done = 0; this.missed = 0;
    this.grp = new THREE.Group(); this.g.scene.add(this.grp);
    this.arrow = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 14), new THREE.MeshBasicMaterial({ color: 0x29b6ff, depthTest: false, transparent: true, opacity: 0.95 }));
    this.arrow.rotation.x = Math.PI; this.arrow.renderOrder = 30; this.arrow.visible = false; this.grp.add(this.arrow);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 32), new THREE.MeshBasicMaterial({ color: 0x29b6ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })); this.ring.rotation.x = -Math.PI / 2; this.ring.visible = false; this.grp.add(this.ring);
    this.buildUI(); this.buildPlaces(); this.marks = new Map();
  }
  // ---- the places jobs happen: numbered restaurant tables, the hot pass by Ben, the ice machine, the crisps
  buildPlaces() {
    const chairs = (this.g.room.chairsAt || []).filter(s => s[0] < -14.5), cl = [];
    for (const [x, z] of chairs) { let c = cl.find(c => Math.hypot(c.x - x, c.z - z) < 1.5); if (!c) { c = { x, z, n: 0, seats: [] }; cl.push(c); } c.seats.push([x, z]); c.n++; c.x = c.seats.reduce((a, s) => a + s[0], 0) / c.n; c.z = c.seats.reduce((a, s) => a + s[1], 0) / c.n; }
    cl.sort((a, b) => (a.z - b.z) || (a.x - b.x)); this.tables = cl.map((c, i) => ({ n: i + 1, at: V(c.x, 0, c.z), seats: c.seats }));
    for (const t of this.tables) { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const x = cv.getContext('2d'); x.fillStyle = '#1a0f0a'; x.beginPath(); x.roundRect(4, 4, 248, 88, 20); x.fill(); x.lineWidth = 6; x.strokeStyle = '#d4af37'; x.stroke();
      x.font = '900 52px Arial Black, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffd400'; x.fillText('TABLE ' + t.n, 128, 52); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
      t.sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true })); t.sign.scale.set(0.5, 0.19, 1); t.sign.position.copy(t.at).setY(1.55); this.grp.add(t.sign); }
    const M = (c, e) => new THREE.MeshLambertMaterial({ color: c, emissive: e || 0 }), box = (w, h, d, x, y, z, c, e) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c, e)); m.position.set(x, y, z); this.grp.add(m); return m; };
    // the hot pass by Ben: a steel shelf on legs, heat lamps glowing over it
    { const x = -11.55, z = -7.75; box(0.5, 0.03, 0.8, x, 1.25, z, 0xc8ccd2); for (const dz of [-0.36, 0.36]) box(0.03, 1.25, 0.03, x, 0.625, z + dz, 0x9aa0a6);
      box(0.4, 0.06, 0.7, x, 1.75, z, 0x2a2a2a); for (const dz of [-0.2, 0.2]) box(0.08, 0.03, 0.08, x, 1.71, z + dz, 0xff7a1a, 0xff5a00); for (const dz of [-0.36, 0.36]) box(0.03, 0.5, 0.03, x, 1.5, z + dz, 0x9aa0a6);
      this.passAt = V(x, 0, z); this.passPlate = this.plateMesh(); this.passPlate.position.set(x, 1.28, z); this.passPlate.visible = false; this.grp.add(this.passPlate); this.passStand = V(-11.0, 0, -7.8); }
    // the ice machine in the back room
    { const x = 9.95, z = 6.6; box(0.6, 1.1, 0.6, x, 0.55, z, 0xd0d4da); box(0.5, 0.3, 0.02, x - 0.31, 0.75, z, 0x1c2a36); box(0.12, 0.05, 0.02, x - 0.32, 1.0, z, 0x39ff14, 0x116611); this.iceAt = V(9.2, 0, 6.6); }
    // boxes of crisps in the staff room
    { const x = 9.5, z = -3.9; for (let i = 0; i < 6; i++) box(0.4, 0.28, 0.3, x + (i % 2) * 0.42 - 0.2, 0.14 + Math.floor(i / 2) * 0.29, z, [0xc8102e, 0x1e5aa8, 0xd4a017][i % 3]); this.crispsAt = V(8.77, 0, -3.89); }
  }
  plateMesh() { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.015, 20), new THREE.MeshLambertMaterial({ color: 0xffffff })));
    const food = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshLambertMaterial({ color: 0xd99a3a })); food.scale.set(1.3, 0.45, 1); food.position.y = 0.03; g.add(food);
    for (let i = 0; i < 6; i++) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.07), new THREE.MeshLambertMaterial({ color: 0xf2c14e })); ch.position.set(0.05 + (i % 3) * 0.016, 0.02, -0.04 + Math.floor(i / 3) * 0.03); g.add(ch); }
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); flag.position.set(-0.08, 0.12, 0); flag.name = 'flag'; g.add(flag);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.1, 4), new THREE.MeshLambertMaterial({ color: 0x8a5a2a })); stick.position.set(-0.11, 0.08, 0); g.add(stick); return g; }
  // the people at a table (a family already sat there, or a couple shown to it now)
  diners(t) { const at = this.rp.punters.filter(c => !c.disposed && c.rp.home && c.rp.home.seat && Math.hypot(c.rp.home.x - t.at.x, c.rp.home.z - t.at.z) < 1.6);
    if (at.length) return at;
    const out = []; for (const [i, k] of ['dad', 'mum'].entries()) { const seat = t.seats[i % t.seats.length], c = this.rp.add(k), chair = (this.g.room.chairsAt || []).find(s => s[0] === seat[0] && s[1] === seat[1]);
      c.rp.home = { x: seat[0], z: seat[1], yaw: (chair ? chair[2] : 0) + Math.PI, seat: true }; c.rp.thirst = 1e9; c.rp.stay = 1e9; this.rp.settleHome(c); c.diner = true; out.push(c); }
    return out; }
  dispose() { this.g.scene.remove(this.grp); for (const el of [this.panel, this.pop, this.note, this.stamp, this.actEl]) el && el.remove(); if (this.plate) this.plate.removeFromParent(); if (this.vr) this.g.scene.remove(this.vr); }

  // ------------------------------------------------------------------ the jobs
  staff(id) { return this.rp.cast.find(c => c.id === id && !c.disposed); }
  seated(pred) { return this.rp.punters.filter(c => !c.disposed && !c.down && c.rp.home && c.rp.home.seat && ['settled', 'served'].includes(c.rp.phase) && pred(c)); }
  start() {
    const bar = ['aidan', 'connor', 'chloe'].map(id => this.staff(id)).filter(Boolean), ben = this.staff('ben'), lewis = this.staff('lewis'), kinds = [];
    if (ben && this.tables.length) kinds.push('foodup', 'foodup'); if (lewis && ben && this.tables.length) kinds.push('order', 'order'); if (bar.length) kinds.push('empties', 'empties', 'barrel', 'ice', 'crisps', 'football');
    if (!kinds.length) return; const kind = R(kinds), benPos = () => this.staff('ben') ? this.staff('ben').pos : BEN; let j;
    if (kind === 'foodup') { const t = R(this.tables), dish = R(DISHES), who = this.diners(t);
      j = { kind, from: ben, icon: '🍽️', title: `FOOD'S UP: TABLE ${t.n}`, said: R([`SERVICE! ${dish.toUpperCase()}, TABLE ${t.n}!`, `Ron! Plate's up! Table ${t.n}, ${dish}. HOT!`, `Ronnie, table ${t.n}'s ${dish} is on the pass. GO!`]), table: t,
        steps: [{ text: `Pick up table ${t.n}'s ${dish} from the hot pass (by Ben)`, at: () => this.passStand, r: 1.7, act: `🍽️ PICK UP TABLE ${t.n}'S FOOD`, then: () => { this.passPlate.visible = false; this.showPlate(true); } },
          { text: `Serve it to table ${t.n} in the restaurant`, at: () => t.at, r: 2.1, act: `🍽️ SERVE TABLE ${t.n}`, then: () => { this.showPlate(false); const pl = this.plateMesh(); pl.position.copy(t.at).setY(0.8); this.grp.add(pl); setTimeout(() => this.grp.remove(pl), 40000); who[0] && who[0].say(R(['Ooh lovely, ta!', 'Cheers Ron! ...did you lick this?', 'About time! Smells great.']), 3); } }] };
      this.passPlate.visible = true; this.passPlate.getObjectByName('flag').material.map = this.flagTex(t.n); this.passPlate.getObjectByName('flag').material.needsUpdate = true;
      j.cleanup = () => { this.passPlate.visible = false; };
    } else if (kind === 'order') { const t = R(this.tables), who = this.diners(t), lines = R(ORDER_LINES);
      j = { kind, from: lewis, icon: '📝', title: `TAKE AN ORDER: TABLE ${t.n}`, said: R([`Bro! Table ${t.n} wants to order and I've got my hands full!`, `Ron, can you take table ${t.n}'s order? I'm drowning here, bro.`, `Table ${t.n} in the restaurant, bro. Take their order. Don't eat it.`]), table: t,
        steps: [{ text: `Go to table ${t.n} in the restaurant and take their order`, at: () => t.at, r: 2.1, act: `📝 TAKE TABLE ${t.n}'S ORDER`, then: () => { this.showNote(lines, 'table ' + t.n); who[0] && who[0].say(R(['Ooh, I\'ll have...', 'Can we get some bread too?', 'NO SALAD, mate.']), 3); } },
          { text: 'Take the ticket to Ben in the kitchen', at: () => benPos(), r: 2.2, act: '🧾 GIVE BEN THE TICKET', then: () => { const b = this.staff('ben'); b && b.say(R(['Got it. Who wants EXTRA gravy?! ...right.', 'Ticket in! Two minutes!', 'NO SALAD? Course not.']), 3); } }] };
    } else if (kind === 'empties') {
      const from = R(bar), spots = this.emptySpots(3); if (spots.length < 2) return;
      j = { kind, from, icon: '🍺', title: 'EMPTIES!', said: R(['Ron! We\'re out of glasses! Grab the empties off the tables!', 'Empties, Ronnie! The tables are covered in them!', 'Can you do a glass collection? I\'m stuck on the tap.']),
        glasses: spots.map(p => this.emptyGlass(p)), got: 0,
        steps: [{ text: `Collect the empties off the tables (0/${spots.length})`, multi: true },
          { text: 'Put them in the GLASS WASHER (back room)', at: () => this.g.room.glassWasher || this.rp.bar.st.glasses.at.clone().setY(0), r: 1.6, act: '🫧 LOAD THE GLASS WASHER', then: () => sfx('glasswasher', null, 0.8) }] };
    } else if (kind === 'ice') { const from = R(bar);
      j = { kind, from, icon: '🧊', title: 'ICE!', said: R(['Ron, the ice well\'s empty! Ice machine\'s in the back room!', 'No ice, Ronnie! Fill the bucket!']),
        steps: [{ text: 'Fill the ice bucket at the ice machine (back room)', at: () => this.iceAt, r: 1.5, act: '🧊 FILL THE ICE BUCKET' }, { text: 'Tip it into the ice well behind the bar', at: () => V(3.6, 0, -4.4), r: 1.5, act: '🧊 TIP IT IN' }] };
    } else if (kind === 'crisps') { const from = R(bar);
      j = { kind, from, icon: '🥔', title: 'CRISPS!', said: R(['We\'re out of crisps, Ron! Boxes are in the staff room.', 'Ronnie, restock the crisps. And don\'t eat them.']),
        steps: [{ text: 'Grab a box of crisps from the staff room', at: () => this.crispsAt, r: 1.5, act: '📦 GRAB A BOX OF CRISPS' }, { text: 'Stack them behind the bar', at: () => V(5.0, 0, -8.0), r: 1.5, act: '📦 STACK THEM UP' }] };
    } else if (kind === 'football') { const from = R(bar), tv = (this.g.room.tvs || [])[0], at = tv ? tv.c.clone().addScaledVector(tv.n, 1.5).setY(0) : V(0, 0, 0);
      j = { kind, from, icon: '📺', title: 'THE FOOTBALL!', said: R(['Ron! Kick-off\'s in a minute! Stick the football on!', 'Ronnie, the lads want the football on. NOW.']),
        steps: [{ text: 'Put the football on the telly', at: () => at, r: 2.2, act: '📺 PUT THE FOOTBALL ON', then: () => { this.rp.pay(2, at.clone().setY(1.8), 'THE LADS ARE HAPPY +£2'); } }] };
    } else {
      const from = R(bar), hatch = this.hatch();
      j = { kind, from, icon: '🛢️', title: 'CHANGE THE BARREL', said: R(['The lager\'s gone! Change the barrel, Ron, the hatch is behind the bar!', 'Barrel\'s empty! Down the hatch, Ronnie, quick!', 'It\'s all FROTH, Ron. Barrel needs changing!']),
        steps: [{ text: 'Go to the hatch behind the bar', at: () => HATCH, r: 1.0 }, { text: 'Change the barrel: stay put', at: () => HATCH, r: 1.1, hold: 3, then: () => { hatch.visible = false; sfx('hatch', HATCH, 0.8); } }] };
      j.cleanup = () => { hatch.visible = false; };
    }
    j.step = 0; j.t = 0; j.limit = 100; this.job = j;
    j.from.say(j.said, 5); sfx('notify', j.from.pos, 0.8); this.popCard(j);
  }
  flagTex(n) { const c = document.createElement('canvas'); c.width = 128; c.height = 80; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 80); x.font = '900 52px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#c62828'; x.fillText(String(n), 64, 44); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  emptySpots(n) {
    const seats = (this.g.room.chairsAt || []).filter(([x, z]) => x > -9.6 && z < 7.8 && z > -8.8), out = []; if (!seats.length) return out;
    for (let k = 0; k < 40 && out.length < n; k++) { const [x, z, ry] = R(seats); const p = V(x - Math.sin(ry) * 0.42, 0.8, z - Math.cos(ry) * 0.42); if (out.every(q => q.distanceTo(p) > 2)) out.push(p); }
    return out;
  }
  emptyGlass(p) {
    const g = new THREE.Group(); const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.15, 14, 1, true), new THREE.MeshLambertMaterial({ color: 0xdfe8ee, transparent: true, opacity: 0.6, side: THREE.DoubleSide })); glass.position.y = 0.075; g.add(glass);
    const dregs = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.02, 12), new THREE.MeshLambertMaterial({ color: 0xc9a040 })); dregs.position.y = 0.012; g.add(dregs);
    const foam = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.004, 4, 16), new THREE.MeshLambertMaterial({ color: 0xf4ead0 })); foam.rotation.x = Math.PI / 2; foam.position.y = 0.1; g.add(foam);
    g.position.copy(p); this.grp.add(g); return g;
  }
  hatch() {
    if (!this.hatchMesh) { const g = new THREE.Group(); const lid = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.7), new THREE.MeshLambertMaterial({ color: 0x4a2a14 })); lid.position.y = 0.012; g.add(lid);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 14), new THREE.MeshLambertMaterial({ color: 0xc9a24a })); ring.rotation.x = Math.PI / 2; ring.position.set(0.25, 0.03, 0); g.add(ring);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16), new THREE.MeshLambertMaterial({ color: 0x9aa0a6 })); barrel.position.set(0, 0.25, 0.5); barrel.name = 'barrel'; g.add(barrel);
      g.position.copy(HATCH); this.grp.add(g); this.hatchMesh = g; }
    this.hatchMesh.visible = true; return this.hatchMesh;
  }
  update(dt) {
    const P = this.g.player, here = new THREE.Vector3(P.head.x, 0, P.head.z); this.actReady = null;
    if (!this.job) { if ((this.nextT -= dt) <= 0) { this.nextT = 30 + Math.random() * 25; this.start(); } }
    const j = this.job;
    if (j) {
      j.t += dt; const s = j.steps[j.step];
      if (s.multi) {           // the empties: walk up to each
        for (const gl of j.glasses) if (gl.visible && Math.hypot(gl.position.x - here.x, gl.position.z - here.z) < 1.3) { gl.visible = false; j.got++; sfx('glass', gl.position, 0.7); this.g.words.show(`EMPTIES ${j.got}/${j.glasses.length}`, gl.position.clone().add(V(0, 0.3, 0)), '#29b6ff', 0.08, 0.9); }
        s.text = `Collect the empties (${j.got}/${j.glasses.length})`;
        if (j.got >= j.glasses.length) this.nextStep();
      } else if (s.gone && s.gone()) { this.finish(false, 'They left!'); return; }
      else { const at = s.at(), d = Math.hypot(at.x - here.x, at.z - here.z);
        if (d < s.r && s.act) { this.actReady = s; }
        else if (d < s.r) { if (s.hold) { s.held = (s.held || 0) + dt; if (Math.floor(s.held * 2) !== Math.floor((s.held - dt) * 2)) sfx('tick', HATCH, 0.4); const b = this.hatchMesh && this.hatchMesh.getObjectByName('barrel'); if (b) b.rotation.y += dt * 3; if (s.held >= s.hold) this.nextStep(); } else this.nextStep(); }
        else if (s.hold) s.held = 0; }
      if (this.job && j.t > j.limit) this.finish(false);
    }
    this.arrow.visible = this.ring.visible = false;
    this.markAll(); this.actButton();
    this.draw(dt);
  }
  // ---- markers in the pub, the same colour as their line on the TO DO list: the job (blue), trouble (orange),
  // fuming punters (red); every empty glass gets its own
  // (the marker's picture, shapes and materials are made once for each icon and colour and shared: a new glass to
  // collect made all of them again, a stutter each time a job started)
  markParts(icon, col) { const k = icon + col, M = this.markCache || (this.markCache = new Map()); let p = M.get(k); if (p) return p;
      const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = col; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.fillStyle = '#0a0e1e'; g.beginPath(); g.arc(64, 64, 49, 0, 7); g.fill(); g.font = '64px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon, 64, 70);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      p = { sprite: new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }), coneGeo: this.coneGeo || (this.coneGeo = new THREE.ConeGeometry(0.06, 0.16, 14)), cone: new THREE.MeshBasicMaterial({ color: col, depthTest: false }),
        ringGeo: this.ringGeo || (this.ringGeo = new THREE.RingGeometry(0.34, 0.44, 32)), ring: new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }) };
      M.set(k, p); return p; }
  mark(key, at, icon, col, h = 2.1) { let m = this.marks.get(key);
    if (!m || m.userData.icon !== icon) { if (m) this.grp.remove(m); m = new THREE.Group(); m.userData.icon = icon; const P = this.markParts(icon, col);
      const sp = new THREE.Sprite(P.sprite); sp.scale.setScalar(0.34); sp.renderOrder = 24; m.add(sp);
      const cone = new THREE.Mesh(P.coneGeo, P.cone); cone.rotation.x = Math.PI; cone.position.y = -0.27; cone.renderOrder = 24; m.add(cone);
      const ring = new THREE.Mesh(P.ringGeo, P.ring); ring.rotation.x = -Math.PI / 2; ring.name = 'ring'; m.add(ring);
      this.grp.add(m); this.marks.set(key, m); }
    m.userData.seen = true; m.visible = true; const tt = performance.now() / 220; m.position.set(at.x, 0, at.z); m.children[0].position.y = h + Math.sin(tt) * 0.06; m.children[1].position.y = h - 0.27 + Math.sin(tt) * 0.06;
    const ring = m.getObjectByName('ring'); ring.position.y = 0.025; ring.scale.setScalar(1 + Math.sin(tt * 1.2) * 0.08); }
  markAll() {
    for (const m of this.marks.values()) m.userData.seen = false;
    const j = this.job, e = this.rp.event;
    if (j) { const s = j.steps[j.step]; if (s.multi) j.glasses.forEach((gl, i) => { if (gl.visible) this.mark('glass' + i, gl.position, '🍺', COL.job, 1.5); }); else if (s.at) this.mark('job', s.at(), j.icon, COL.job); }
    if (e) { const who = e.who && e.who.find(c => c && !c.disposed), at = e.at || e.center && V(e.center.x, 0, e.center.z) || (who && who.pos); const icon = EV_ICON[e.kind] || '⚠';
      if (at) this.mark('event', at, icon, COL.event); }
    this.rp.punters.filter(c => c.rp.phase === 'waiting' && c.rp.fuming).forEach((c, i) => this.mark('fume' + i, c.pos, '🤬', COL.fume, 2.35));
    for (const m of this.marks.values()) if (!m.userData.seen) m.visible = false;
  }
  // ---- the big button to do the thing, once you're there (phone / computer: tap it; VR: A on the right controller)
  actButton() { const s = this.actReady, P = this.g.player;
    if (!this.actEl) { const b = this.actEl = document.createElement('button'); b.id = 'rp-act'; b.style.cssText = 'position:fixed;left:50%;bottom:max(150px,calc(env(safe-area-inset-bottom) + 140px));transform:translateX(-50%);z-index:35;padding:16px 26px;border-radius:20px;border:4px solid #fff;background:#29b6ff;color:#fff;font:900 20px "Arial Black",Arial;text-shadow:0 2px 3px #000;box-shadow:0 6px 0 rgba(0,0,0,0.35);display:none;max-width:86vw';
      b.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); if (this.actReady) this.nextStep(); }); document.body.appendChild(b); }
    const show = !!s && P.flatMode; this.actEl.style.display = show ? 'block' : 'none'; if (s) this.actEl.textContent = s.act;
    if (s && !P.flatMode) { const h = (P.hands || []).find(h => h.source && h.handedness === 'right'), gp = h && h.source.gamepad, a = !!(gp && gp.buttons[4] && gp.buttons[4].pressed);
      if ((this.actWait = (this.actWait || 0) + 1 / 72) > 1.2 || (a && !this.aWas)) { this.actWait = 0; this.nextStep(); } this.aWas = a;
      if (Math.floor(performance.now() / 1500) !== this.vrHintT) { this.vrHintT = Math.floor(performance.now() / 1500); this.g.words.show(s.act + ' (A)', P.head.clone().addScaledVector(P.fwd, 0.9), '#29b6ff', 0.06, 1.2); } }
    else this.actWait = 0; }
  target() { const j = this.job; if (!j) return null; const s = j.steps[j.step]; if (s.multi) { const gl = j.glasses.find(g => g.visible); return gl ? gl.position.clone().setY(0) : null; } return s.at().clone().setY(0); }
  nextStep() { const j = this.job, s = j.steps[j.step]; s.then && s.then(); s.done = true; j.step++; sfx('fixed', null, 0.5); if (j.step >= j.steps.length) this.finish(true); }
  finish(ok, why) {
    const j = this.job; this.job = null; this.nextT = 25 + Math.random() * 25; j.cleanup && j.cleanup(); if (j.glasses) for (const gl of j.glasses) this.grp.remove(gl); this.showPlate(false);
    const P = this.g.player, at = P.head.clone().addScaledVector(P.fwd, 1).add(V(0, 0.25, 0));
    if (ok) { this.done++; this.rp.pay(3, at, 'JOB DONE! +£3 TIP'); this.rp.rating += 0.12; this.stampIt('JOB DONE!', '#39ff14'); j.from && j.from.say(R(['Legend, Ron!', 'Cheers, mate!', 'Knew I could count on you!', 'Nice one, bro!']), 3); }
    else { this.missed++; this.rp.rating -= 0.15; this.stampIt(why || 'TOO SLOW!', '#ff4a4a'); j.from && j.from.say(R(['Forget it, I\'ll do it myself.', 'RONNIE! Where were you?!', 'Too late, mate.']), 3); }
  }

  // ------------------------------------------------------------------ the bits you see
  showPlate(on) {
    const P = this.g.player;
    if (!this.plate) { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.015, 20), new THREE.MeshLambertMaterial({ color: 0xffffff })));
      const food = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshLambertMaterial({ color: 0xd99a3a })); food.scale.set(1.3, 0.45, 1); food.position.y = 0.03; g.add(food);
      for (let i = 0; i < 6; i++) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.07), new THREE.MeshLambertMaterial({ color: 0xf2c14e })); ch.position.set(0.05 + (i % 3) * 0.016, 0.02, -0.04 + Math.floor(i / 3) * 0.03); ch.rotation.y = i; g.add(ch); }
      const peas = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshLambertMaterial({ color: 0x5aaa2a })); peas.scale.y = 0.5; peas.position.set(-0.06, 0.02, 0.04); g.add(peas); this.plate = g; }
    if (!on) { this.plate.removeFromParent(); return; }
    const h = !P.flatMode && (P.hands || []).find(h => h.handedness === 'left' && h.tracked);
    if (h) { h.grip.add(this.plate); this.plate.position.set(0, 0.02, 0.06); this.plate.rotation.set(0, 0, 0); }
    else { P.camera.add(this.plate); this.plate.position.set(-0.17, -0.2, -0.42); this.plate.rotation.set(0.5, 0, 0); }
  }
  buildUI() {
    const st = document.createElement('style'); st.id = 'rp-jobs-css'; st.textContent = `
#rp-events { position: fixed; z-index: 12; top: 62px; right: calc(max(10px, env(safe-area-inset-right)) + min(230px, 52vw) + 8px); width: min(220px, 40vw); background: rgba(10,14,40,0.84); border: 3px solid #29b6ff; border-radius: 14px; padding: 6px 8px; font: 700 12px Arial, sans-serif; color: #fff; pointer-events: none; }
#rp-events h4 { margin: 0 0 3px; font: 900 13px "Arial Black", Arial; color: #29b6ff; } #rp-events .ev { margin: 4px 0; } #rp-events .ev b { display: block; }
#rp-events .bar { height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; margin-top: 2px; } #rp-events .bar i { display: block; height: 4px; border-radius: 2px; }
#rp-events .job { display: flex; gap: 6px; align-items: flex-start; } #rp-events .job img { width: 30px; height: 30px; border-radius: 50%; border: 2px solid #29b6ff; object-fit: cover; flex: none; }
body.rp-tight #rp-events .job img, body.rp-tight #rp-events .step:not(.now) { display: none; } body.rp-tight #rp-events, body.rp-tight #rp-orders { font-size: 11px !important; padding: 5px 7px !important; } body.rp-tight #rp-events h4 { font-size: 12px; }
#rp-events .step { opacity: 0.6; } #rp-events .step.now { opacity: 1; color: #9fe8ff; } #rp-events .step.done { opacity: 0.5; text-decoration: line-through; }
#rp-jobpop { position: fixed; z-index: 30; left: 50%; top: 18%; transform: translate(-50%, 0) scale(0.6); opacity: 0; width: min(340px, 86vw); background: linear-gradient(160deg,#fff8e0,#ffe9a8); color: #2a1a08; border-radius: 18px; border: 4px solid #2a1a08; box-shadow: 0 10px 0 rgba(0,0,0,0.35); padding: 12px 14px; font: 700 14px Arial; pointer-events: none; transition: transform .35s cubic-bezier(.3,1.6,.5,1), opacity .25s; }
#rp-jobpop.on { transform: translate(-50%, 0) scale(1); opacity: 1; } #rp-jobpop .top { display: flex; gap: 10px; align-items: center; }
#rp-jobpop img { width: 58px; height: 58px; border-radius: 50%; border: 3px solid #2a1a08; object-fit: cover; } #rp-jobpop h3 { margin: 0; font: 900 22px "Arial Black", Arial; } #rp-jobpop .who { font: 900 12px Arial; color: #8a5a1a; }
#rp-jobpop .said { margin: 8px 0 6px; font: italic 700 15px Georgia, serif; } #rp-jobpop ol { margin: 0; padding-left: 20px; font: 700 13px Arial; }
#rp-note { position: fixed; z-index: 31; left: 50%; top: 50%; transform: translate(-50%,-50%) rotate(-3deg) scale(0.6); opacity: 0; width: min(270px, 80vw); background: repeating-linear-gradient(#fffef4 0 27px, #9ec8ee 27px 28px); border-left: 3px solid #e57373; padding: 30px 14px 14px 22px; box-shadow: 0 10px 20px rgba(0,0,0,0.45); font: 700 17px "Comic Sans MS","Marker Felt",cursive; color: #1a2a6a; line-height: 28px; pointer-events: none; transition: transform .3s, opacity .25s; }
#rp-note.on { transform: translate(-50%,-50%) rotate(-3deg) scale(1); opacity: 1; } #rp-note b { position: absolute; top: 6px; left: 22px; font: 900 13px Arial; color: #c62828; }
#rp-stamp { position: fixed; z-index: 32; left: 50%; top: 40%; transform: translate(-50%,-50%) rotate(-12deg) scale(2.4); opacity: 0; font: 900 44px "Arial Black", Arial; border: 6px solid; border-radius: 14px; padding: 4px 16px; pointer-events: none; transition: transform .25s cubic-bezier(.3,1.6,.5,1), opacity .2s; }
@media (max-height: 520px) { #rp-jobpop { top: 6%; width: min(290px, 56vw); padding: 8px 10px; font-size: 12px; } #rp-jobpop img { width: 42px; height: 42px; } #rp-jobpop h3 { font-size: 17px; } #rp-jobpop .said { font-size: 13px; margin: 5px 0 4px; } #rp-jobpop ol { font-size: 11px; }
  #rp-note { width: min(230px, 50vw); font-size: 14px; line-height: 22px; background: repeating-linear-gradient(#fffef4 0 21px, #9ec8ee 21px 22px); } #rp-events { font-size: 11px; } }
#rp-stamp.on { transform: translate(-50%,-50%) rotate(-12deg) scale(1); opacity: 0.95; }`;
    document.head.appendChild(st); this.css = st;
    const mk = (id) => { const d = document.createElement('div'); d.id = id; document.body.appendChild(d); return d; };
    this.panel = mk('rp-events'); this.pop = mk('rp-jobpop'); this.note = mk('rp-note'); this.stamp = mk('rp-stamp');
    // VR: a little TO DO board on the left wrist, next to the orders
    const cv = this.vrCv = document.createElement('canvas'); cv.width = 256; cv.height = 256; this.vrTex = new THREE.CanvasTexture(cv); this.vrTex.colorSpace = THREE.SRGBColorSpace;
    this.vr = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshBasicMaterial({ map: this.vrTex, transparent: true, depthTest: false })); this.vr.renderOrder = 20; this.vr.visible = false; this.g.scene.add(this.vr);
  }
  portrait(c) { const id = c && (c.def && c.def.portrait || c.id); return `./assets/portraits/${id}.webp`; }
  popCard(j) {
    const esc = (t) => String(t).replace(/</g, '&lt;');
    this.pop.innerHTML = `<div class="top"><img src="${this.portrait(j.from)}" onerror="this.style.display='none'"><div><div class="who">${esc(j.from.name.toUpperCase())} NEEDS YOU</div><h3>${j.icon} ${j.title}</h3></div></div><div class="said">"${esc(j.said)}"</div><ol>${j.steps.map(s => `<li>${esc(s.text)}</li>`).join('')}</ol>`;
    this.pop.classList.add('on'); clearTimeout(this.popT); this.popT = setTimeout(() => this.pop.classList.remove('on'), 4200);
    if (!this.g.player.flatMode) this.g.showBanner(`${j.from.name.toUpperCase()}: ${j.title}`, j.steps[0].text.toUpperCase());
  }
  showNote(lines, tbl) {
    this.note.innerHTML = `<b>ORDER · ${tbl.toUpperCase()}</b>` + lines.map(l => `<div>${l.replace(/</g, '&lt;')}</div>`).join('');
    this.note.classList.add('on'); sfx('notify', null, 0.4); clearTimeout(this.noteT); this.noteT = setTimeout(() => this.note.classList.remove('on'), 3200);
    if (!this.g.player.flatMode) this.g.showBanner('ORDER TAKEN!', lines.slice(0, 2).join(' · ').toUpperCase());
  }
  stampIt(txt, col) { this.stamp.textContent = txt; this.stamp.style.color = col; this.stamp.style.borderColor = col; this.stamp.classList.add('on'); clearTimeout(this.stT); this.stT = setTimeout(() => this.stamp.classList.remove('on'), 1400); }
  // everything that needs sorting: the pub's current trouble, fuming punters, and the job
  items() {
    const out = [], e = this.rp.event, LIM = { fight: 50, singer: 40, kid: 45 };
    if (e) { const who = e.who && e.who[0] && e.who[0].name; const k = 1 - Math.min(1, e.t / (LIM[e.kind] || 45));
      const T = { fight: ['🥊', 'FIGHT IN THE PUB', 'Slap them apart before they smash the place up'], singer: ['🎤', `${(who || 'SOMEONE').toUpperCase()} IS SINGING`, 'Shut him up: a slap, or a drink'],
        kid: ['🧒', `${(who || 'A KID').toUpperCase()} RUNNING RIOT`, 'Catch them: get right up close'], spill: ['🧽', 'A PINT\'S GONE OVER', 'Go to the orange marker and mop it up (stand there)'],
        loo: ['🚽', 'TOILETS BLOCKED', 'Men\'s toilets: stand in there with the plunger'], power: ['💡', 'THE FUSE HAS GONE', 'Fuse box in the staff room: go and reset it'], hen: ['👰', 'HEN PARTY', 'Four of them at the bar: serve them all'] }[e.kind] || ['⚠', 'TROUBLE', ''];
      const lim = e.limit || LIM[e.kind] || 45; out.push({ icon: T[0], title: T[1], how: T[2], k: 1 - Math.min(1, e.t / lim), col: COL.event }); }
    const fuming = this.rp.punters.filter(c => c.rp.phase === 'waiting' && c.rp.fuming).length;
    if (fuming) out.push({ icon: '🤬', title: `${fuming} FUMING AT THE BAR`, how: 'Serve them! They won\'t leave till you do', k: 0, col: COL.fume });
    return out;
  }
  draw(dt) {
    if ((this.drawT = (this.drawT || 0) - dt) > 0) return; this.drawT = 0.25;
    const P = this.g.player, vr = !P.flatMode, evs = this.items(), j = this.job, esc = (t) => String(t).replace(/</g, '&lt;');
    const col = (k) => k > 0.5 ? '#39ff14' : k > 0.25 ? '#ffd400' : '#ff3a3a';
    let html = '<h4>⚠ TO DO</h4>';
    if (!evs.length && !j) html += '<div class="ev" style="opacity:.7">All quiet. For now.</div>';
    const tight = document.body.classList.contains('rp-tight');
    for (const e of evs) html += `<div class="ev" style="border-left:5px solid ${e.col || '#29b6ff'};padding-left:6px"><b>${e.icon} ${esc(e.title)}</b>${tight ? '' : esc(e.how)}<div class="bar"><i style="width:${Math.max(4, e.k * 100)}%;background:${col(e.k)}"></i></div></div>`;
    if (j) { const k = 1 - j.t / j.limit; html += `<div class="ev job" style="border-left:5px solid ${COL.job};padding-left:6px"><img src="${this.portrait(j.from)}" onerror="this.style.display='none'"><div><b>${j.icon} ${esc(j.title)} <span style="color:#9fe8ff;font-weight:700">(${esc(j.from.name)})</span></b>${j.steps.map((s, i) => `<div class="step ${s.done ? 'done' : i === j.step ? 'now' : ''}">${i === j.step ? '➜ ' : ''}${esc(s.text)}${s.hold && i === j.step && s.held ? ` ${Math.round(s.held / s.hold * 100)}%` : ''}</div>`).join('')}<div class="bar"><i style="width:${Math.max(4, k * 100)}%;background:${col(k)}"></i></div></div></div>`; }
    this.panel.style.display = vr ? 'none' : 'block'; this.panel.innerHTML = html;
    // (straight under the ORDERS list, the same width: never on top of it. An upright phone: beside it (main.js layout))
    const oe = this.rp.ordersEl; if (oe && oe.style.display !== 'none' && !tight) { const r = oe.getBoundingClientRect(); this.panel.style.top = Math.round(r.bottom + 8) + 'px'; this.panel.style.right = Math.round(window.innerWidth - r.right) + 'px'; this.panel.style.width = Math.round(r.width) + 'px'; }
    // VR wrist board
    const h = vr && (P.hands || []).find(h => h.handedness === 'left' && h.tracked); this.vr.visible = !!h; if (!h) return;
    const g = this.vrCv.getContext('2d'); g.clearRect(0, 0, 256, 256); g.fillStyle = 'rgba(10,14,40,0.9)'; g.beginPath(); g.roundRect(4, 4, 248, 248, 18); g.fill(); g.lineWidth = 5; g.strokeStyle = '#29b6ff'; g.stroke();
    g.fillStyle = '#29b6ff'; g.font = '900 22px Arial'; g.textAlign = 'center'; g.fillText('⚠ TO DO', 128, 30); g.textAlign = 'left'; let y = 58;
    const line = (t, f, c) => { g.fillStyle = c; let s = f; do { g.font = `700 ${s}px Arial`; s--; } while (g.measureText(t).width > 230 && s > 11); g.fillText(t, 14, y); y += f + 6; };
    for (const e of evs) { line(`${e.icon} ${e.title}`, 17, '#fff'); line(e.how, 13, '#c9d3ff'); }
    if (j) { line(`${j.icon} ${j.title} (${j.from.name})`, 17, '#fff'); line('➜ ' + j.steps[j.step].text, 14, '#9fe8ff'); }
    if (!evs.length && !j) line('All quiet. For now.', 16, '#c9d3ff');
    this.vrTex.needsUpdate = true;
    h.grip.updateMatrixWorld(true); this.vr.position.set(0.11, 0.03, 0.09).applyMatrix4(h.grip.matrixWorld); this.vr.quaternion.setFromRotationMatrix(h.grip.matrixWorld).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + 0.55, 0, 0)));
  }
}
