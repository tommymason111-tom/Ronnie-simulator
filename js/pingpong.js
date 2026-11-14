// Table tennis at Lewis's: a blue outdoor table on the lawn, Ronnie v Lewy.
//
// How it plays (the things that make VR table tennis feel right):
//  - a real ball: 40mm, 2.7g, gravity + air drag + Magnus lift from its spin,
//    stepped at 240Hz so nothing tunnels through the bat or the net
//  - the bat is a real object in your hand: the ball comes off it from the
//    bat's actual speed and angle (relative velocity, restitution), and
//    brushing it (moving across the face) puts topspin / backspin / sidespin on
//  - the table grips the ball: spin turns into kick on the bounce (topspin
//    skids on, backspin checks up), and the bounce loses a bit of height
//  - the net stops low balls dead and lets a ball that clips the tape dribble on
//  - proper rules: serve two each (one each from 10-10), first to 11 by two,
//    the ball must bounce on the other side once, double bounce / missing the
//    table / hitting your own side / volleying it over the table lose the point
//  - Lewy plays back: he reads the ball's flight, moves his bat to meet it and
//    places his return with topspin; he gets better the longer the rally goes
//    and he can be beaten by pace and angles
// Phone/PC: walk up with the bat in your hand and Ronnie swings by himself when
// the ball's in reach, aiming where the middle of the screen points; THROW =
// smash (or serve).
import * as THREE from 'three';
import { sfx } from './audio.js';
import { canvasTex } from './textures.js';
import { ControllerHand } from './hands.js';
import { holdTransform } from './hold.js';

const R = 0.02, G = -9.81, KD = 0.13, KM = 0.0055;          // ball radius, gravity, drag, Magnus
const STEP = 1 / 240;
const T_E = 0.88, NET_H = 0.1525;                            // table restitution, net height
const BAT_R = 0.08, BAT_E = 0.86;

export class PingPong {
  // c: centre of the table top (y = surface height); the table's long axis is x;
  // Ronnie plays from the -x end, Lewy from +x
  constructor(scene, { c }) {
    this.scene = scene; this.c = c.clone();
    this.L = 2.74; this.W = 1.525; this.top = c.y;
    this.ball = { p: new THREE.Vector3(), v: new THREE.Vector3(), w: new THREE.Vector3(), live: false, held: true };
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(R, 16, 12), new THREE.MeshLambertMaterial({ color: 0xff8a1a, emissive: 0x401800 }));
    this.mesh.castShadow = true; scene.add(this.mesh);
    this.score = { P: 0, A: 0 }; this.games = { P: 0, A: 0 }; this.server = 'P'; this.serves = 0;
    this.state = 'serve'; this.wait = 0; this.rally = 0;
    this.hitter = null; this.bouncedOther = false; this.serveOwn = false; this.serving = true; this.lastHitT = -9; this.t = 0;
    this.board = scoreCanvas(); this.drawBoard();
    // Lewy's bat, in a hand of its own
    this.ai = { grip: new THREE.Group(), pos: new THREE.Vector3(c.x + this.L / 2 + 0.35, c.y + 0.25, c.z), plan: null, swing: 0 };
    const bat = batMesh(), ht = holdTransform('bat', 'right');
    bat.position.copy(ht.p); bat.quaternion.copy(ht.q); this.ai.grip.add(bat); this.ai.bat = bat;
    this.ai.hand = new ControllerHand('right'); this.ai.hand.load().then(() => { this.ai.hand.root.visible = true; for (const n in this.ai.hand.curl) this.ai.hand.curl[n] = ht.curl; this.ai.hand.update(); }).catch(() => {});
    this.ai.grip.add(this.ai.hand.root);
    scene.add(this.ai.grip);
    this.batPrev = null;
    this.resetServe();
  }
  attach(items, player) { this.items = items; this.player = player; this.spawnBat(); }
  spawnBat() { this.bat = this.items.spawn('bat', new THREE.Vector3(this.c.x - this.L / 2 + 0.25, this.top + 0.05, this.c.z + 0.45)); }

  // ------------------------------------------------------------ physics
  // one step of free flight + table + net; returns 'P'/'A' for a table bounce on that side, 'net', 'floor' or null
  step(b, dt) {
    const sp = b.v.length();
    // gravity, drag, Magnus (w x v)
    _a.set(0, G, 0).addScaledVector(b.v, -KD * sp).add(_t.crossVectors(b.w, b.v).multiplyScalar(KM));
    b.v.addScaledVector(_a, dt); b.p.addScaledVector(b.v, dt);
    b.w.multiplyScalar(1 - 0.15 * dt);
    const c = this.c, hx = this.L / 2, hz = this.W / 2;
    let ev = null;
    // the net (a thin wall across the middle)
    const nx = b.p.x - c.x, prevX = nx - b.v.x * dt;
    if (Math.sign(nx) !== Math.sign(prevX) && Math.abs(b.p.z - c.z) < hz + 0.15 && b.p.y < this.top + NET_H + R && b.p.y > this.top) {
      if (b.p.y > this.top + NET_H - R * 0.5) { b.v.multiplyScalar(0.45); b.v.y = Math.abs(b.v.y) * 0.5 + 0.3; ev = 'net'; }      // clipped the tape: dribbles on
      else { b.p.x = c.x - Math.sign(b.v.x) * R; b.v.x *= -0.15; b.v.z *= 0.5; ev = 'net'; }                                         // into the net
    }
    // the table
    if (b.v.y < 0 && b.p.y < this.top + R && b.p.y > this.top - 0.05 && Math.abs(b.p.x - c.x) < hx + R * 0.5 && Math.abs(b.p.z - c.z) < hz + R * 0.5) {
      b.p.y = this.top + R; b.v.y = -b.v.y * T_E;
      // grip: the contact point slides; friction trades speed for spin and back (hollow ball, I = 2/3 m r^2)
      _t.set(0, -R, 0); _s.crossVectors(b.w, _t).add(b.v); _s.y = 0;                     // slip velocity at the contact
      _d.copy(_s).multiplyScalar(-0.4);
      b.v.add(_d); b.w.add(_t.set(0, -1, 0).cross(_d).multiplyScalar(1.5 / R));
      ev = b.p.x < c.x ? 'P' : 'A';
    }
    // the lawn
    if (b.p.y < R) { b.p.y = R; b.v.y = Math.abs(b.v.y) * 0.45; b.v.x *= 0.6; b.v.z *= 0.6; b.w.multiplyScalar(0.5); ev = ev || 'floor'; }
    return ev;
  }
  // fly a copy forward and say where it lands (first bounce on side `side`), or null
  predictLanding(p, v, w, side, maxT = 2.5) {
    const b = { p: p.clone(), v: v.clone(), w: w.clone() };
    for (let t = 0; t < maxT; t += STEP) { const e = this.step(b, STEP); if (e === 'net') return { net: true, p: b.p.clone() }; if (e === side) return { p: b.p.clone(), t }; if (e === 'floor' || e === (side === 'P' ? 'A' : 'P')) return { p: b.p.clone(), t, wrong: e }; }
    return null;
  }
  // work out a shot from p that lands on `target` (on side `side`) with some topspin
  solveShot(p, target, side, pace = 7.5, top = 90) {
    const d = _d.subVectors(target, p); d.y = 0; const dist = d.length(); const T = Math.max(0.28, dist / pace);
    const v = new THREE.Vector3((target.x - p.x) / T, (target.y - p.y - 0.5 * G * T * T) / T, (target.z - p.z) / T);
    const dir = _t.set(v.x, 0, v.z).normalize();
    const w = new THREE.Vector3(0, 1, 0).cross(dir).multiplyScalar(top);
    for (let it = 0; it < 5; it++) {
      const land = this.predictLanding(p, v, w, side);
      if (!land) { v.y -= 0.4; continue; }
      if (land.net) { v.y += 0.35; continue; }
      v.x += (target.x - land.p.x) / Math.max(0.25, land.t || T) * 0.9; v.z += (target.z - land.p.z) / Math.max(0.25, land.t || T) * 0.9;
    }
    return { v, w };
  }

  // ------------------------------------------------------------ rules
  resetServe() {
    const b = this.ball, c = this.c, P = this.server === 'P';
    b.live = false; b.held = true; b.v.set(0, 0, 0); b.w.set(0, 0, 0);
    b.p.set(c.x + (P ? -1 : 1) * (this.L / 2 + 0.12), this.top + 0.32, c.z + (P ? 0.2 : -0.2));
    this.hitter = null; this.bouncedOther = false; this.serveOwn = false; this.serving = true; this.rally = 0; this.ai.plan = null;
    this.state = 'serve'; this.wait = P ? 0 : 1.6;
  }
  point(to, why) {
    if (this.state === 'over') return;
    this.state = 'over'; this.wait = 1.8; this.ball.live = false;
    this.score[to]++;
    const s = this.score, win = (s.P >= 11 || s.A >= 11) && Math.abs(s.P - s.A) >= 2;
    let msg = (to === 'P' ? 'POINT RONNIE' : 'POINT LEWY') + (why ? ' — ' + why : '');
    if (win) { this.games[to]++; msg = to === 'P' ? 'GAME RONNIE! ' + s.P + '–' + s.A : 'GAME LEWY. ' + s.A + '–' + s.P; sfx(to === 'P' ? 'fanfare' : 'sadviolin', this.c, 0.8); }
    else sfx(to === 'P' ? 'ting' : 'boing', this.c, 0.6);
    this.say(msg, to === 'P' ? '#7cff6a' : '#ff8a8a', win ? 0.13 : 0.08);
    // serve changes every 2 points (every point from 10-10)
    this.serves++;
    const deuce = s.P >= 10 && s.A >= 10;
    if (this.serves >= (deuce ? 1 : 2)) { this.serves = 0; this.server = this.server === 'P' ? 'A' : 'P'; }
    if (win) { this.lastGame = { ...s }; s.P = 0; s.A = 0; this.serves = 0; this.server = to === 'P' ? 'A' : 'P'; }
    this.drawBoard();
  }
  say(txt, col = '#fff', size = 0.08) { if (this.words) this.words.show(txt, _a.copy(this.c).add(_t.set(0, 0.75, 0)), col, size, 1.6); }
  onBounce(side) {
    if (!this.hitter || this.state !== 'play') return;
    const other = this.hitter === 'P' ? 'A' : 'P';
    sfx('thud', this.ball.p, 0.35);
    if (this.serving) {
      if (side === this.hitter) { if (this.serveOwn) return this.point(other, 'DOUBLE BOUNCE'); this.serveOwn = true; return; }   // a proper serve bounces on your side first (casual: optional)
      this.serving = false; this.bouncedOther = true; return;
    }
    if (side === this.hitter) return this.point(other, 'OWN SIDE');
    if (this.bouncedOther) return this.point(this.hitter, 'DOUBLE BOUNCE');
    this.bouncedOther = true;
  }
  onHit(who) {
    const b = this.ball;
    if (this.t - this.lastHitT < 0.12 && this.hitter === who) return true;       // same swing
    if (this.state === 'serve') { if (who !== this.server) return false; this.state = 'play'; b.held = false; b.live = true; this.hitter = who; this.lastHitT = this.t; sfx('clink', b.p, 0.5); return true; }
    if (this.state !== 'play') return false;
    if (this.hitter === who) { this.point(who === 'P' ? 'A' : 'P', 'DOUBLE HIT'); return false; }
    if (!this.bouncedOther) { this.point(this.hitter, 'VOLLEY'); return false; }
    this.hitter = who; this.bouncedOther = false; this.serving = false; this.lastHitT = this.t; this.rally++;
    sfx('clink', b.p, 0.6);
    if (this.rally === 8) this.say('WHAT A RALLY', '#ffd400');
    return true;
  }

  // ------------------------------------------------------------ the frame
  update(dt) {
    if (!this.items) return;
    this.t += dt;
    const b = this.ball, c = this.c;
    if (!this.bat || this.bat.dead) this.spawnBat();
    // your bat: where its face is now and was last frame (for its speed and swept hits)
    const bat = this.bat, held = bat && bat.heldBy;
    let bp = null;
    if (held) {
      bat.obj.updateMatrixWorld(true);
      const cen = new THREE.Vector3(0, 0.025, 0).applyMatrix4(bat.obj.matrixWorld), nrm = new THREE.Vector3(0, 0, 1).transformDirection(bat.obj.matrixWorld);
      bp = { c: cen, n: nrm, pc: this.batPrev ? this.batPrev.c : cen.clone(), pn: this.batPrev ? this.batPrev.n : nrm.clone(), v: this.batPrev ? cen.clone().sub(this.batPrev.c).multiplyScalar(1 / Math.max(dt, 1e-3)) : new THREE.Vector3() };
      this.batPrev = { c: cen.clone(), n: nrm.clone() };
    } else this.batPrev = null;
    const flat = held && bat.heldBy.isFlat;

    if (this.state === 'over') { if ((this.wait -= dt) <= 0) this.resetServe(); }
    if (this.state === 'serve') {
      // the ball sits up ready to be served (it bobs a little); Lewy serves after a moment
      const P = this.server === 'P';
      b.p.y = this.top + 0.32 + Math.sin(this.t * 3) * 0.03;
      if (!P && (this.wait -= dt) <= 0) this.aiHit(true);
      if (P && flat) { const near = this.player.head.distanceTo(b.p) < 1.6; this.serveT = near ? (this.serveT || 0) + dt : 0; if (this.serveT > 1.5 || this.wantSmash) { this.wantSmash = false; this.serveT = 0; this.flatHit(true); } }
    }
    // step the ball
    if (b.live) {
      const n = Math.min(24, Math.ceil(dt / STEP)), h = dt / n;
      for (let i = 0; i < n && b.live; i++) {
        const prevP = _p.copy(b.p);
        const ev = this.step(b, h);
        if (ev === 'P' || ev === 'A') this.onBounce(ev);
        else if (ev === 'net') sfx('thud', b.p, 0.15);
        if (bp && !flat) this.batContact(bp, i / n, (i + 1) / n, prevP);
        // Lewy: hit it when it gets to him
        const ai = this.ai.plan;
        if (ai && this.state === 'play' && this.hitter === 'P' && this.bouncedOther && b.p.x >= ai.x - 0.02) this.aiHit(false);
        // dead ball
        if (this.state === 'play' && (b.p.y < 0.35 || Math.abs(b.p.x - c.x) > 4.5 || Math.abs(b.p.z - c.z) > 3.5)) {
          const other = this.hitter === 'P' ? 'A' : 'P';
          if (this.bouncedOther) this.point(this.hitter, this.hitter === 'P' ? 'LEWY MISSED IT' : 'TOO GOOD');
          else this.point(other, 'MISSED THE TABLE');
        }
      }
    } else if (this.state === 'serve' && bp && !flat) this.batContact(bp, 0, 1, _p.copy(b.p));
    if (this.state === 'over' && b.p.y > R) { this.step(b, Math.min(dt, 0.03)); }     // let a dead ball roll about
    // phone/PC: swing by yourself when it's in reach
    if (flat && this.state === 'play' && this.hitter === 'A' && b.v.x < 0 && this.bouncedOther && b.p.x < c.x - this.L / 2 + 0.6) {
      const reach = _a.copy(bat.obj.position).distanceTo(b.p);
      if (reach < 0.6 || (b.p.x < c.x - this.L / 2 - 0.1 && this.player.head.distanceTo(b.p) < 1.0)) this.flatHit(false);
    }
    // Lewy reads the ball once you've hit it
    if (this.state === 'play' && this.hitter === 'P' && b.v.x > 0 && !this.ai.plan) this.aiPlan();
    this.moveAi(dt);
    this.mesh.position.copy(b.p);
    if (this.state === 'play' || this.state === 'serve') this.mesh.rotation.x += b.w.x * dt * 0.1;
  }
  // swept ball v bat (VR): the face is a disc; hit from either side
  batContact(bp, f0, f1, prevP) {
    const b = this.ball;
    const cen = _a.copy(bp.pc).lerp(bp.c, f1), n = _s.copy(bp.pn).lerp(bp.n, f1).normalize();
    const d1 = _t.subVectors(b.p, cen).dot(n), d0 = _d.subVectors(prevP, _p2.copy(bp.pc).lerp(bp.c, f0)).dot(n);
    const inPlane = _t.subVectors(b.p, cen).addScaledVector(n, -d1).length();
    if (inPlane > BAT_R + R * 0.5) return;
    if (!(Math.abs(d1) < R + 0.006 || Math.sign(d1) !== Math.sign(d0))) return;
    const side = Math.sign(d0 || d1) || 1, nn = _p2.copy(n).multiplyScalar(side);
    const rel = _t.subVectors(b.v, bp.v), vn = rel.dot(nn);
    if (vn >= 0) return;
    if (!this.onHit('P')) return;
    // bounce off the rubber: restitution along the face normal, grip across it (spin)
    const vt = rel.clone().addScaledVector(nn, -vn);
    rel.addScaledVector(nn, -(1 + BAT_E) * Math.min(vn, 0));
    rel.addScaledVector(vt, -0.35);
    b.w.add(_d.crossVectors(nn, vt).multiplyScalar(-0.55 / R).clampLength(0, 220));
    b.v.copy(rel).add(bp.v); b.v.clampLength(0, 30);
    b.p.copy(cen).addScaledVector(nn, R + 0.008);
    b.live = true; b.held = false;
    const sp = bp.v.length(); bat_pulse(this.bat);
    if (sp > 6) this.say(sp > 9 ? 'SMASH!' : 'NICE', '#ffd400', 0.06);
  }
  // phone/PC: aim where the screen's middle points (on Lewy's half), Ronnie does the rest
  flatHit(serve) {
    const b = this.ball, c = this.c;
    const cam = this.player.camera, o = cam.getWorldPosition(new THREE.Vector3()), dir = cam.getWorldDirection(new THREE.Vector3());
    let target;
    const t = (this.top - o.y) / (dir.y || -1e-3);
    if (t > 0 && t < 12) target = o.addScaledVector(dir, t); else target = new THREE.Vector3(c.x + this.L / 4, this.top, c.z);
    target.x = Math.max(target.x, c.x + 0.25); target.y = this.top + R;
    target.z += (Math.random() - 0.5) * 0.12; target.x += (Math.random() - 0.5) * 0.12;
    if (!this.onHit('P')) return;
    const smash = this.wantSmash; this.wantSmash = false;
    const shot = this.solveShot(b.p, target, 'A', serve ? 6 : smash ? 11 : 7.5, smash ? 140 : 80);
    b.v.copy(shot.v); b.w.copy(shot.w); b.live = true; b.held = false;
    if (smash) this.say('SMASH!', '#ffd400', 0.06);
    if (this.bat && this.bat.heldBy && this.bat.heldBy.pulse) this.bat.heldBy.pulse(0.8, 60);
  }
  smash() { this.wantSmash = true; }
  // Lewy: where will the ball be when it comes to him?
  aiPlan() {
    const b = this.ball, c = this.c;
    const s = { p: b.p.clone(), v: b.v.clone(), w: b.w.clone() };
    let bounced = !!this.bouncedOther, best = null, peak = -9;
    for (let t = 0; t < 2.5; t += STEP) {
      const e = this.step(s, STEP);
      if (e === 'A') bounced = true;
      if (e === 'floor' || e === 'P' || e === 'net') break;
      if (bounced) {
        if (s.p.y > peak && s.v.y > 0) peak = s.p.y;
        if (s.p.x >= c.x + this.L / 2 + 0.15 || (s.v.y < 0 && s.p.y < peak - 0.05 && s.p.x > c.x + 0.3)) { best = { x: s.p.x, p: s.p.clone(), t }; break; }
      }
    }
    if (!best) { this.ai.plan = { x: 99, miss: true }; return; }
    const pace = b.v.length(), reachable = Math.abs(best.p.z - c.z) < 1.3 && best.p.y > this.top - 0.05 && best.p.y < this.top + 1.0;
    const pMiss = 0.05 + Math.max(0, pace - 8) * 0.07 + Math.max(0, Math.abs(best.p.z - c.z) - 0.6) * 0.5 - Math.min(0.04, this.rally * 0.005);
    best.miss = !reachable || Math.random() < pMiss;
    if (best.miss) best.p.z += (Math.random() < 0.5 ? -1 : 1) * 0.25;
    this.ai.plan = best;
  }
  aiHit(serve) {
    const b = this.ball, c = this.c, plan = this.ai.plan;
    if (!serve && (!plan || plan.miss)) { this.ai.plan = { x: 99, miss: true }; return; }
    if (!this.onHit('A')) return;
    if (serve) b.p.set(c.x + this.L / 2 + 0.12, this.top + 0.25, c.z - 0.2);
    const deep = 0.25 + Math.random() * 0.85, wide = (Math.random() - 0.5) * (this.W - 0.35);
    const target = new THREE.Vector3(c.x - deep, this.top + R, c.z + wide);
    const pace = serve ? 5.5 : Math.min(10, 6.5 + this.rally * 0.25 + Math.random() * 1.5);
    const shot = this.solveShot(b.p, target, 'P', pace, 60 + Math.random() * 70);
    b.v.copy(shot.v); b.w.copy(shot.w); b.live = true; b.held = false;
    this.ai.plan = null; this.ai.swing = 0.25;
  }
  moveAi(dt) {
    const ai = this.ai, c = this.c, b = this.ball;
    let want;
    if (ai.plan && ai.plan.p) want = _a.copy(ai.plan.p).add(_t.set(0.05, 0, 0));
    else if (this.state === 'serve' && this.server === 'A') want = _a.copy(b.p).add(_t.set(0.06, -0.02, 0));
    else want = _a.set(c.x + this.L / 2 + 0.45, this.top + 0.2, c.z + (b.p.z - c.z) * 0.4);
    const d = _t.subVectors(want, ai.pos), max = 3.8 * dt; if (d.length() > max) d.setLength(max);
    ai.pos.add(d);
    ai.swing = Math.max(0, ai.swing - dt);
    // the grip sits so the bat face is where Lewy's aiming, face toward Ronnie
    // (grip: forearm out to the side, bat face to Ronnie, blade up; a flick forward on the hit)
    ai.grip.position.copy(ai.pos).add(_t.set(0.04, -0.12, 0.02));
    ai.grip.rotation.set(Math.PI / 2, 0, (ai.swing > 0 ? 0.7 * ai.swing / 0.25 : 0) - 0.15, 'YXZ');
  }
  drawBoard() {
    const { g, tex } = this.board, w = g.canvas.width, h = g.canvas.height, s = this.score;
    g.fillStyle = '#123a7a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 34px Arial, sans-serif'; g.fillText('RONNIE', w * 0.27, 46); g.fillText('LEWY', w * 0.73, 46);
    g.font = '900 120px Arial, sans-serif'; g.fillText(String(s.P), w * 0.27, 140); g.fillText(String(s.A), w * 0.73, 140);
    g.fillStyle = '#ffd400'; g.beginPath(); g.arc(this.server === 'P' ? w * 0.09 : w * 0.91, 140, 12, 0, 7); g.fill();
    g.fillStyle = '#9fc4ff'; g.font = '700 26px Arial, sans-serif'; g.fillText(`GAMES  ${this.games.P} – ${this.games.A}`, w / 2, 222);
    g.font = '700 18px Arial, sans-serif'; g.fillText('first to 11 · two serves each · ● = serving', w / 2, 252);
    tex.needsUpdate = true;
  }
}
function bat_pulse(bat) { if (bat && bat.heldBy && bat.heldBy.pulse) bat.heldBy.pulse(0.9, 50); return true; }

// a bat: handle along -y, blade above it, red rubber on +z, black on -z
export function batMesh() {
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: 0xc89a5a });
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.077, 0.077, 0.006, 28), wood); blade.rotation.x = Math.PI / 2; blade.position.y = 0.025; blade.scale.set(1, 1, 1.06); g.add(blade);
  const red = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.003, 28), new THREE.MeshLambertMaterial({ color: 0xc8102e })); red.rotation.x = Math.PI / 2; red.position.set(0, 0.025, 0.0045); red.scale.set(1, 1, 1.06); g.add(red);
  const blk = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.003, 28), new THREE.MeshLambertMaterial({ color: 0x151515 })); blk.rotation.x = Math.PI / 2; blk.position.set(0, 0.025, -0.0045); blk.scale.set(1, 1, 1.06); g.add(blk);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.1, 0.022), wood); handle.position.y = -0.1; g.add(handle);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function scoreCanvas() { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 270; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return { g: cv.getContext('2d'), tex }; }
const _a = new THREE.Vector3(), _t = new THREE.Vector3(), _s = new THREE.Vector3(), _d = new THREE.Vector3(), _p = new THREE.Vector3(), _p2 = new THREE.Vector3();
