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
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const BEN = V(-12.75, 0, -7.4), HATCH = V(4.5, 0, -8.15);
const DISHES = ['scampi and chips', 'pie and mash', 'the Ronnie Platter', 'a gammon steak', 'fish and chips', 'a jacket potato', 'a mixed grill', 'the Sunday roast'];
const ORDER_LINES = [['2x Scampi & chips', '1x Pie & mash', '1x Kids nuggets', 'NO SALAD (thanks Ron)'], ['1x Mixed grill', '1x Gammon, egg AND pineapple', '2x Garlic bread', 'Extra gravy. EXTRA.'], ['3x Fish & chips', '1x Sausage & mash', 'Mushy peas x4', 'Can Ronnie NOT touch it'], ['1x Sunday roast', '1x Veggie lasagne', '2x Chips (cheesy)', 'Ketchup on the side']];

export class PubJobs {
  constructor(rp) {
    this.rp = rp; this.g = rp.g; this.job = null; this.nextT = 18; this.done = 0; this.missed = 0;
    this.grp = new THREE.Group(); this.g.scene.add(this.grp);
    this.arrow = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 14), new THREE.MeshBasicMaterial({ color: 0x29b6ff, depthTest: false, transparent: true, opacity: 0.95 }));
    this.arrow.rotation.x = Math.PI; this.arrow.renderOrder = 30; this.arrow.visible = false; this.grp.add(this.arrow);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 32), new THREE.MeshBasicMaterial({ color: 0x29b6ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })); this.ring.rotation.x = -Math.PI / 2; this.ring.visible = false; this.grp.add(this.ring);
    this.buildUI();
  }
  dispose() { this.g.scene.remove(this.grp); for (const el of [this.panel, this.pop, this.note, this.stamp]) el && el.remove(); if (this.plate) this.plate.removeFromParent(); if (this.vr) this.g.scene.remove(this.vr); }

  // ------------------------------------------------------------------ the jobs
  staff(id) { return this.rp.cast.find(c => c.id === id && !c.disposed); }
  seated(pred) { return this.rp.punters.filter(c => !c.disposed && !c.down && c.rp.home && c.rp.home.seat && ['settled', 'served'].includes(c.rp.phase) && pred(c)); }
  start() {
    const kinds = []; if (this.staff('ben') && this.seated(c => c.rp.home.x > -9.6).length) kinds.push('foodup');
    if (this.staff('lewis') && this.staff('ben')) kinds.push('order');
    const bar = ['aidan', 'connor', 'chloe'].map(id => this.staff(id)).filter(Boolean); if (bar.length) kinds.push('empties', 'barrel');
    if (!kinds.length) return; const kind = R(kinds); let j;
    if (kind === 'foodup') { const who = R(this.seated(c => c.rp.home.x > -9.6)), dish = R(DISHES);
      j = { kind, from: this.staff('ben'), icon: '🍽️', title: 'FOOD\'S UP!', said: R([`SERVICE! ${dish.toUpperCase()} for ${who.name}!`, `Ron! Plate's up, ${dish}, ${who.name}'s table. HOT!`, `Ronnie, take ${dish} out to ${who.name} before it goes cold!`]),
        steps: [{ text: 'Grab the plate from Ben at the kitchen pass', at: () => this.staff('ben') ? this.staff('ben').pos : BEN, r: 1.8, then: () => this.showPlate(true) },
          { text: `Take ${dish} to ${who.name}`, at: () => who.pos, r: 1.5, gone: () => who.disposed, then: () => { this.showPlate(false); who.say(R(['Ooh lovely, ta!', 'Cheers Ron! ...did you lick this?', 'About time! Smells great.']), 3); } }] };
    } else if (kind === 'order') {
      const chairs = (this.g.room.chairsAt || []).filter(s => s[0] < -14.5); if (!chairs.length) return; const [x, z] = R(chairs), tbl = 'table ' + (2 + Math.floor(Math.random() * 12));
      j = { kind, from: this.staff('lewis'), icon: '📝', title: 'TAKE AN ORDER', said: R([`Bro! ${tbl.toUpperCase()} wants to order and I've got my hands full!`, `Ron, can you take ${tbl}'s order? I'm drowning here, bro.`, `${tbl[0].toUpperCase() + tbl.slice(1)} in the restaurant, bro. Take their order. Don't eat it.`]),
        steps: [{ text: `Take ${tbl}'s order in the restaurant`, at: () => V(x, 0, z), r: 1.6, then: () => this.showNote(R(ORDER_LINES), tbl) },
          { text: 'Take the ticket to Ben in the kitchen', at: () => this.staff('ben') ? this.staff('ben').pos : BEN, r: 1.8, then: () => { const b = this.staff('ben'); b && b.say(R(['Got it. Who wants EXTRA gravy?! ...right.', 'Ticket in! Two minutes!', 'NO SALAD? Course not.']), 3); } }] };
    } else if (kind === 'empties') {
      const from = R(bar), spots = this.emptySpots(3); if (spots.length < 2) return;
      j = { kind, from, icon: '🍺', title: 'EMPTIES!', said: R(['Ron! We\'re out of glasses! Grab the empties off the tables!', 'Empties, Ronnie! The tables are covered in them!', 'Can you do a glass collection? I\'m stuck on the tap.']),
        glasses: spots.map(p => this.emptyGlass(p)), got: 0,
        steps: [{ text: `Collect the empties (0/${spots.length})`, multi: true },
          { text: 'Put them in the glass washer', at: () => this.rp.bar.st.glasses.at.clone().setY(0), r: 1.3, then: () => sfx('clink', this.rp.bar.st.glasses.at, 0.8) }] };
    } else {
      const from = R(bar), hatch = this.hatch();
      j = { kind, from, icon: '🛢️', title: 'CHANGE THE BARREL', said: R(['The lager\'s gone! Change the barrel, Ron, the hatch is behind the bar!', 'Barrel\'s empty! Down the hatch, Ronnie, quick!', 'It\'s all FROTH, Ron. Barrel needs changing!']),
        steps: [{ text: 'Go to the hatch behind the bar', at: () => HATCH, r: 1.0 }, { text: 'Change the barrel: stay put', at: () => HATCH, r: 1.1, hold: 3, then: () => { hatch.visible = false; sfx('ting', HATCH, 0.8); } }] };
      j.cleanup = () => { hatch.visible = false; };
    }
    j.step = 0; j.t = 0; j.limit = 90; this.job = j;
    j.from.say(j.said, 5); sfx('ting', j.from.pos, 0.8); this.popCard(j);
  }
  emptySpots(n) {
    const seats = (this.g.room.chairsAt || []).filter(([x, z]) => x > -9.6 && z < 7.8 && z > -8.8), out = [];
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
    const P = this.g.player, here = new THREE.Vector3(P.head.x, 0, P.head.z);
    if (!this.job) { if ((this.nextT -= dt) <= 0) { this.nextT = 30 + Math.random() * 25; this.start(); } }
    const j = this.job;
    if (j) {
      j.t += dt; const s = j.steps[j.step];
      if (s.multi) {           // the empties: walk up to each
        for (const gl of j.glasses) if (gl.visible && Math.hypot(gl.position.x - here.x, gl.position.z - here.z) < 1.3) { gl.visible = false; j.got++; sfx('clink', gl.position, 0.7); this.g.words.show(`EMPTIES ${j.got}/${j.glasses.length}`, gl.position.clone().add(V(0, 0.3, 0)), '#29b6ff', 0.08, 0.9); }
        s.text = `Collect the empties (${j.got}/${j.glasses.length})`;
        if (j.got >= j.glasses.length) this.nextStep();
      } else if (s.gone && s.gone()) { this.finish(false, 'They left!'); return; }
      else { const at = s.at(), d = Math.hypot(at.x - here.x, at.z - here.z);
        if (d < s.r) { if (s.hold) { s.held = (s.held || 0) + dt; if (Math.floor(s.held * 2) !== Math.floor((s.held - dt) * 2)) sfx('thud', HATCH, 0.4); const b = this.hatchMesh && this.hatchMesh.getObjectByName('barrel'); if (b) b.rotation.y += dt * 3; if (s.held >= s.hold) this.nextStep(); } else this.nextStep(); }
        else if (s.hold) s.held = 0; }
      if (this.job && j.t > j.limit) this.finish(false);
    }
    // the blue arrow over where the job needs you
    const tgt = this.target();
    this.arrow.visible = this.ring.visible = !!tgt;
    if (tgt) { this.arrow.position.copy(tgt).add(V(0, 2.1 + Math.sin(performance.now() / 200) * 0.06, 0)); this.ring.position.set(tgt.x, 0.02, tgt.z); this.ring.scale.setScalar(1 + Math.sin(performance.now() / 250) * 0.08); }
    this.draw(dt);
  }
  target() { const j = this.job; if (!j) return null; const s = j.steps[j.step]; if (s.multi) { const gl = j.glasses.find(g => g.visible); return gl ? gl.position.clone().setY(0) : null; } return s.at().clone().setY(0); }
  nextStep() { const j = this.job, s = j.steps[j.step]; s.then && s.then(); s.done = true; j.step++; sfx('pop', null, 0.5); if (j.step >= j.steps.length) this.finish(true); }
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
    this.note.classList.add('on'); sfx('shutter', null, 0.4); clearTimeout(this.noteT); this.noteT = setTimeout(() => this.note.classList.remove('on'), 3200);
    if (!this.g.player.flatMode) this.g.showBanner('ORDER TAKEN!', lines.slice(0, 2).join(' · ').toUpperCase());
  }
  stampIt(txt, col) { this.stamp.textContent = txt; this.stamp.style.color = col; this.stamp.style.borderColor = col; this.stamp.classList.add('on'); clearTimeout(this.stT); this.stT = setTimeout(() => this.stamp.classList.remove('on'), 1400); }
  // everything that needs sorting: the pub's current trouble, fuming punters, and the job
  items() {
    const out = [], e = this.rp.event, LIM = { fight: 50, singer: 40, kid: 45 };
    if (e) { const who = e.who && e.who[0] && e.who[0].name; const k = 1 - Math.min(1, e.t / (LIM[e.kind] || 45));
      out.push(e.kind === 'fight' ? { icon: '🥊', title: 'FIGHT IN THE PUB', how: 'Slap them apart before they smash the place up', k }
        : e.kind === 'singer' ? { icon: '🎤', title: `${(who || 'SOMEONE').toUpperCase()} IS SINGING`, how: 'Shut him up: a slap, or a drink', k }
        : { icon: '🧒', title: `${(who || 'A KID').toUpperCase()} RUNNING RIOT`, how: 'Catch them: get right up close', k }); }
    const fuming = this.rp.punters.filter(c => c.rp.phase === 'waiting' && c.rp.fuming).length;
    if (fuming) out.push({ icon: '🤬', title: `${fuming} FUMING AT THE BAR`, how: 'Serve them! They won\'t leave till you do', k: 0 });
    return out;
  }
  draw(dt) {
    if ((this.drawT = (this.drawT || 0) - dt) > 0) return; this.drawT = 0.25;
    const P = this.g.player, vr = !P.flatMode, evs = this.items(), j = this.job, esc = (t) => String(t).replace(/</g, '&lt;');
    const col = (k) => k > 0.5 ? '#39ff14' : k > 0.25 ? '#ffd400' : '#ff3a3a';
    let html = '<h4>⚠ TO DO</h4>';
    if (!evs.length && !j) html += '<div class="ev" style="opacity:.7">All quiet. For now.</div>';
    for (const e of evs) html += `<div class="ev"><b>${e.icon} ${esc(e.title)}</b>${esc(e.how)}<div class="bar"><i style="width:${Math.max(4, e.k * 100)}%;background:${col(e.k)}"></i></div></div>`;
    if (j) { const k = 1 - j.t / j.limit; html += `<div class="ev job"><img src="${this.portrait(j.from)}" onerror="this.style.display='none'"><div><b>${j.icon} ${esc(j.title)} <span style="color:#9fe8ff;font-weight:700">(${esc(j.from.name)})</span></b>${j.steps.map((s, i) => `<div class="step ${s.done ? 'done' : i === j.step ? 'now' : ''}">${i === j.step ? '➜ ' : ''}${esc(s.text)}${s.hold && i === j.step && s.held ? ` ${Math.round(s.held / s.hold * 100)}%` : ''}</div>`).join('')}<div class="bar"><i style="width:${Math.max(4, k * 100)}%;background:${col(k)}"></i></div></div></div>`; }
    this.panel.style.display = vr ? 'none' : 'block'; this.panel.innerHTML = html;
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
