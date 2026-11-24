// Shared behaviour for every character (Tommy and the squad): a physics
// ragdoll body, a speech bubble in their colour, walking, poses, throwing
// things, getting hit / slapped / knocked out / grabbed, and getting back up.
// Tommy (tommy.js) and the squad (squad.js) build on this.
import * as THREE from 'three';
import { nearBlockers, NEAR_SAFE } from './perf.js';
import { Ragdoll } from './ragdoll.js';
import { Gait, netFeet } from './gait.js';
import { canvasTex, fitText, roundRect, blobTex } from './textures.js';
import { Dialogue, BANKS } from './dialogue.js';
import { sfx, babble } from './audio.js';
import { voiceLine, cancelLine } from './voices.js';
const MAX_TALKERS = 2;      // (how many people can be talking at once, around any one player)
export const TALK_RANGE = 12;      // (metres: further than this from every player, nobody chats. Voices fade out by audio.js HEAR_RANGE)
import { TUNING } from './config.js';
import { Item } from './foods.js';
import { MODE_LINES, modeGroup } from './modelines.js';
const PHONE_UI = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)));

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
export const KO_IMPULSE = 6;          // N·s — anything harder than this knocks someone out

let starTex = null;

export class Character {
  static ALL = new Set();          // everyone currently in the level (for steering round each other)
  // cfg: { id, name, color, body: {h, sw, girth, limb}, banks: { bank: [lines] }, spawn: [x, z, yaw] }
  constructor(scene, room, physics, cfg) {
    this.scene = scene;
    this.room = room;
    this.physics = physics;
    this.cfg = cfg;
    this.id = cfg.id;
    this.name = cfg.name;
    this.color = cfg.color || '#1f4fbf';
    this.dialogue = new Dialogue();
    this.banks = cfg.banks || {};
    this.rag = new Ragdoll(scene, physics, cfg.body || {});
    Character.ALL.add(this);
    this.koMul = cfg.koMul || 1;

    this.fx = new THREE.Group(); scene.add(this.fx);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.004; this.fx.add(blob);

    // speech bubble
    this.bubbleCanvas = document.createElement('canvas');
    this.bubbleK = PHONE_UI ? 0.75 : 1; this.bubbleCanvas.width = 1024 * this.bubbleK; this.bubbleCanvas.height = 512 * this.bubbleK;      // (a phone: 3/4 size, still sharp at phone size; ~1MB less each, with a whole squad that adds up)
    this.bubbleTex = new THREE.CanvasTexture(this.bubbleCanvas);
    this.bubbleTex.colorSpace = THREE.SRGBColorSpace;
    this.bubbleTex.generateMipmaps = false; this.bubbleTex.minFilter = THREE.LinearFilter;
    this.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.bubbleTex, transparent: true, depthTest: false, depthWrite: false }));
    this.bubble.renderOrder = 12;
    this.bubble.scale.set(1.2, 0.6, 1);
    // up close (someone in your face for their attack), a full-size bubble filled the screen and ran off both edges: it's
    // sized for the distance it's seen from as it's drawn (full size from ~2m out), and sits lower over their head
    { const bub = this.bubble, cp = new THREE.Vector3(); bub.userData.head = new THREE.Vector3();
      // (sized for how far away it is; lifted by main.js's notification referee if something's in the way: userData.lift)
      bub.userData.place = (camPos) => { const hd = bub.userData.head, k = Math.min(1, Math.max(0.35, hd.distanceTo(camPos) * 0.46));
        bub.scale.set(1.2 * k, 0.6 * k, 1); bub.position.set(hd.x, hd.y + 0.12 + 0.43 * k + (bub.userData.lift || 0), hd.z); if (bub.userData.side) bub.position.add(bub.userData.side); bub.updateMatrixWorld(); };
      bub.onBeforeRender = (r, sc, cam) => { cam.getWorldPosition(cp); bub.userData.place(cp); }; }
    this.bubble.visible = false;
    scene.add(this.bubble);

    // dizzy stars
    starTex = starTex || canvasTex(64, 64, (g) => { g.fillStyle = '#ffe14d'; g.font = '56px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', 32, 34); });
    this.stars = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false }));
      s.scale.setScalar(0.09); s.visible = false; scene.add(s); this.stars.push(s);
    }

    this.heldItem = null;      // mesh shown in the hand while winding up a throw
    this.state = 'enter';
    this.t = Math.random() * 10; this.stateT = 0;
    this.speakT = 0; this.speakPri = 0;
    this.moveTarget = null;
    this.nextMove = 8 + Math.random() * 6;
    this.quietT = Math.random() * 8;
    this.pendingLine = null;
    this.hits = 0;
    this.grabbedBy = 0;
    this.slapCool = 0;
    this.onThrow = null;        // (start, velocity, itemType, thrower) => item
    this.onEvent = null;        // (name, data) => void
    this.active = true;         // false = standing aside (doesn't wander or attack)
    this.setIdlePose(0);
    // keep animated characters inside the room and out of the furniture
    const prev = { x: 1e9, z: 1e9 };      // (where the root was last time: see below)
    this.rag.constrainForget = () => { prev.x = 1e9; prev.z = 1e9; };      // (after a jump to somewhere new: no 'side they came in from')
    this.rag.constrain = (root) => {
      const b = this.room.bounds, m = 0.3;
      root.x = THREE.MathUtils.clamp(root.x, b.x0 + m, b.x1 - m);
      root.z = THREE.MathUtils.clamp(root.z, b.z0 + m, b.z1 - m);
      if (this.seated || this.glide) return;          // sat down in a chair / on a sofa (or gliding the last bit into one, or into their place at the bar): it's meant to be "in" the furniture
      // (only the furniture near them: perf.js. If being pushed out takes them further than that covers, the whole lot)
      const x0 = root.x, z0 = root.z, out = (list) => { for (const k of list) {
        const p = 0.22;
        if (root.x > k.x0 - p && root.x < k.x1 + p && root.z > k.z0 - p && root.z < k.z1 + p) {
          // back out the side they came in from (where they were last frame): the nearest side, for something thin like a
          // bench, was the far side once they were half-way in, and they popped straight through it
          const pv = prev && Math.hypot(prev.x - x0, prev.z - z0) < 1 ? prev : null, pin = pv && pv.x > k.x0 - p && pv.x < k.x1 + p && pv.z > k.z0 - p && pv.z < k.z1 + p;
          if (pv && !pin) { if (pv.x <= k.x0 - p) root.x = k.x0 - p; else if (pv.x >= k.x1 + p) root.x = k.x1 + p; else if (pv.z <= k.z0 - p) root.z = k.z0 - p; else root.z = k.z1 + p; }
          else { const dl = root.x - (k.x0 - p), dr = (k.x1 + p) - root.x, dn = root.z - (k.z0 - p), df = (k.z1 + p) - root.z;
            const mn = Math.min(dl, dr, dn, df);
            if (mn === dl) root.x = k.x0 - p; else if (mn === dr) root.x = k.x1 + p; else if (mn === dn) root.z = k.z0 - p; else root.z = k.z1 + p; }
          if (Math.abs(root.x - x0) > NEAR_SAFE || Math.abs(root.z - z0) > NEAR_SAFE) far = true;
        }
      } };
      let far = false; out(nearBlockers(this.room, x0, z0));
      if (far) { root.x = x0; root.z = z0; out(this.room.blockers); }
      prev.x = root.x; prev.z = root.z;
    };
    const sp = cfg.spawn || [room.tommySpots[0].x, room.tommySpots[0].y, 0];
    this.rag.placeAt(sp[0], sp[1], sp[2] || 0);
  }

  // ---------------- convenience ----------------
  get pos() { return this.rag.pos('pelvis', this._pos || (this._pos = new THREE.Vector3())); }
  headPos(out) { return this.rag.pos('head', out); }
  get down() { return this.state === 'ko' || this.state === 'recover' || this.state === 'grabbed' || this.state === 'clinging'; }
  get busy() { return this.down || this.state === 'act' || this.state === 'windup' || this.state === 'throw'; }

  // ---------------- speech ----------------
  line(bank) {
    if (bank === 'chatter' && Math.random() < 0.5) {      // half the time: something about the game mode we're in
      const g = modeGroup(globalThis.RS_MODE), m = g && ((MODE_LINES[this.cfg.id] || {})[g] || (Math.random() < 0.3 && MODE_LINES._[g]));
      if (m && m.length) { const fresh = m.filter(l => !this.dialogue.recent.includes(l)); if (fresh.length) { const l = fresh[Math.floor(Math.random() * fresh.length)]; this.dialogue.recent.push(l); if (this.dialogue.recent.length > 8) this.dialogue.recent.shift(); return l; } }
    }
    const own = this.banks[bank];
    if (own && own.length) {
      const fresh = own.filter(l => !this.dialogue.recent.includes(l));
      const pool = fresh.length ? fresh : own;
      const l = pool[Math.floor(Math.random() * pool.length)];
      this.dialogue.recent.push(l); if (this.dialogue.recent.length > 8) this.dialogue.recent.shift();
      return l;
    }
    if (BANKS[bank] && this.cfg.globalBanks) return this.dialogue.pick(bank);
    return null;
  }

  say(bankOrText, priority = null) {
    const isBank = !!(this.banks[bankOrText] || (this.cfg.globalBanks && BANKS[bankOrText]));
    const pri = priority ?? (isBank && BANKS[bankOrText] ? BANKS[bankOrText].pri : 3);
    if (Character.sayGate && !Character.sayGate(this)) return false;      /* a mode can quiet the background (Date Night: only Chloe and whoever's in the film talk) */
    if (!this.rag.mesh) return false;          // not here yet (still loading): no floating speech bubbles
    if ((this.speakT > 0.6 || this.voicePending) && pri < this.speakPri) return false;
    // only a couple of people talk at once (no wall of bubbles and voices, e.g. everyone greeting you as you join);
    // the important lines (attacks, being hit, the game's own announcements: priority 4+) always get through
    // and only people NEAR someone talk: chatter from the far side of the map is just noise (and a wall of bubbles).
    // The important lines (attacks, being hit, the game's own announcements: priority 4+) always get through, and only a
    // couple of people talk at once around any one player (no wall of bubbles and voices, e.g. everyone greeting you
    // as you join). Players who could hear: Character.hearers() (you, plus everyone in the room when you're the host)
    if (pri < 4 && !this.mpPuppet && !this.canChat(this.headPos(_v))) return false;
    const text = isBank ? this.line(bankOrText) : (BANKS[bankOrText] || this.banks[bankOrText] ? null : bankOrText);
    if (!text) return false;
    this.speakPri = pri; this.quietT = 0;
    // a real voice (voices.js): the bubble comes up the moment the sound starts. Otherwise, the bubble and the babble now
    if (voiceLine(this.id, text, this.headPos(_v), { key: 'npc_' + this.id, onStart: (dur) => this.showLine(text, pri, dur) })) { this.voicePending = true; return true; }
    this.showLine(text, pri, 0);
    babble(this.headPos(_v), Math.min(14, 4 + Math.floor(text.length / 8)), this.cfg.voicePitch || 1);
    return true;
  }
  // is someone near enough to hear me, who hasn't already got MAX_TALKERS people talking near them?
  canChat(at) {
    const hs = Character.hearers ? Character.hearers() : []; if (!hs.length) return true;
    for (const h of hs) {
      if (!h || h.distanceTo(at) > TALK_RANGE) continue;
      let n = 0; for (const c of (Character.ALL || [])) if (c !== this && !c.disposed && !c.mpPuppet && (c.speakT > 0 || c.voicePending) && c.rag && c.rag.mesh && c.headPos(_v2).distanceTo(h) <= TALK_RANGE) n++;
      if (n < MAX_TALKERS) return true;
    }
    return false;
  }
  // the bubble up, for as long as the line takes to say (or read)
  showLine(text, pri, dur = 0) {
    this.voicePending = false;
    this.drawBubble(text);
    this.bubble.visible = true;
    this.speakT = Math.max(2.2 + text.length * 0.055, dur + 0.6);
    this.speakPri = pri;
    this.quietT = 0;
  }

  drawBubble(text) {
    const g = this.bubbleCanvas.getContext('2d'), w = 1024, h = 512; g.setTransform(this.bubbleK || 1, 0, 0, this.bubbleK || 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.25)'; roundRect(g, 26, 26, w - 40, h - 130, 60); g.fill();
    g.fillStyle = '#ffffff'; roundRect(g, 16, 16, w - 40, h - 130, 60); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 50, h - 116); g.lineTo(w / 2 + 30, h - 116); g.lineTo(w / 2 - 30, h - 20); g.closePath(); g.fill();
    g.lineWidth = 10; g.strokeStyle = this.color;
    roundRect(g, 16, 16, w - 40, h - 130, 60); g.stroke();
    g.beginPath(); g.moveTo(w / 2 - 50, h - 112); g.lineTo(w / 2 - 30, h - 20); g.lineTo(w / 2 + 30, h - 112); g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(w / 2 - 44, h - 125, 70, 14);
    g.font = '900 34px Arial'; g.fillStyle = this.color; g.textAlign = 'left'; g.fillText(this.name.toUpperCase(), 60, 66);
    fitText(g, text, 56, 84, w - 120, h - 230, 64, { color: '#111' });
    this.bubbleTex.needsUpdate = true;
  }

  // ---------------- getting hit ----------------
  partAt(pos, r) { return this.rag.nearestPart(pos, r); }

  hitBy(part, point, impulse, isVeg = false) {
    const mag = impulse.length();
    if (this.rag.mode === 'ragdoll') { this.rag.hit(part, point, impulse); return 'wobble'; }
    const ko = KO_IMPULSE * this.koMul;
    if (mag >= ko || part.name === 'head' && mag >= ko * 0.6) { this.knockOut(isVeg ? 'vegHit' : 'hit'); this.rag.hit(part, point, impulse); return 'ko'; }
    this.flinch(impulse, part.name === 'head' ? 1 : 0.6);
    if (!this.down && this.speakT <= 0.5 && Math.random() < 0.5) this.say(isVeg && this.banks.vegHit ? 'vegHit' : 'hit');
    return 'wobble';
  }

  slap(part, point, handVel) {
    if (this.slapCool > 0) return null;
    this.slapCool = 0.35;
    const speed = handVel.length();
    _v2.copy(handVel).multiplyScalar(2.2); _v2.y += speed * 0.4;
    if (this.state === 'clinging') { this.rag.hit(part, point, _v2); this.letGo(true); return 'ko'; }
    if (this.rag.mode === 'ragdoll') { this.rag.hit(part, point, _v2); return 'slap'; }
    if (speed > 3.2 * this.koMul && !this.down) { this.knockOut('slap'); this.rag.hit(part, point, _v2); return 'ko'; }
    this.flinch(_v2, part.name === 'head' ? 1 : 0.7);
    if (!this.down && speed > 1.5 && this.speakT <= 0.5) this.say(this.banks.slap ? 'slap' : 'hit', 4);
    return 'slap';
  }

  knockOut(line = 'hit') {
    if (!this.banks[line] && !(this.cfg.globalBanks && BANKS[line])) line = 'hit';
    this.hits++;
    this.dropHeld();
    this.cancelAction && this.cancelAction();
    this.state = 'ko'; this.stateT = 0;
    this.rag.setMode('ragdoll', 0);
    this.rag.moveVel.set(0, 0, 0);
    this.pendingLine = line;
    this.bubble.visible = false; this.speakT = 0; if (this.voicePending) { this.voicePending = false; cancelLine('npc_' + this.id); }      // (a line still getting ready isn't said now)
    sfx('ko', this.headPos(_v), 1);
    this.onEvent && this.onEvent('ko', this);
  }

  grabbed() {
    this.grabbedBy++;
    if (this.state !== 'grabbed') {
      if (this.state === 'clinging') this.letGo(false);
      this.dropHeld();
      this.cancelAction && this.cancelAction();
      this.state = 'grabbed'; this.stateT = 0;
      this.rag.setMode('ragdoll', 0.25);
      this.rag.moveVel.set(0, 0, 0);
      this.say('grabbed', 5);
    }
  }
  released() {
    this.grabbedBy = Math.max(0, this.grabbedBy - 1);
    if (this.grabbedBy > 0 || this.state !== 'grabbed') return;
    const sp = this.rag.speed();
    this.state = 'ko'; this.stateT = sp > 3 ? 0 : 1.2;
    this.rag.setMode('ragdoll', 0);
    this.pendingLine = 'hit';
    if (sp > 5) this.say(this.banks.launched ? 'launched' : 'WORTH IIIIIIT!', 6);
    this.hits++;
    this.onEvent && this.onEvent('flung', this);
  }

  dropHeld() { if (this.heldItem) this.heldItem.visible = false; }

  // A light hit: an animated recoil away from the hit (no ragdoll)
  flinch(dir, amount = 0.7) {
    _v.copy(dir); _v.y = 0;
    if (_v.lengthSq() < 1e-6) _v.set(0, 0, -1);
    _v.normalize().applyAxisAngle(_v2.set(0, 1, 0), -this.rag.yaw);     // into their own frame
    this.flinchDir = { x: _v.x, z: _v.z, amount, t: 0 };
  }
  applyFlinch(dt) {
    const f = this.flinchDir;
    if (!f) return;
    f.t += dt;
    const k = f.t < 0.12 ? f.t / 0.12 : Math.max(0, 1 - (f.t - 0.12) / 0.45);
    if (k <= 0 && f.t > 0.2) { this.flinchDir = null; return; }
    const a = 0.35 * f.amount * k;
    // lean away from the hit: rotate about the axis perpendicular to it
    _q.setFromAxisAngle(_v.set(f.z, 0, -f.x).normalize(), a);
    this.rag.pose.chest.premultiply(_q);
    this.rag.pose.head.premultiply(_q).premultiply(_q);
    this.rag.root.x += f.x * 0.25 * dt * k * 6; this.rag.root.z += f.z * 0.25 * dt * k * 6;   // step back a touch
  }

  // ---------------- poses (target directions in their own frame, +Z = forward) ----------------
  // Standing about: breathing, the weight slowly shifting from one leg to the other (hip drops, the other knee
  // softens), arms hanging and swaying with it, and every so often a little fidget of their own.
  setIdlePose(t) {
    const r = this.rag, ph = this.idPhase ?? (this.idPhase = ((this.id || 'x').charCodeAt(0) * 0.37) % 6.28);
    const breathe = Math.sin(t * 1.55 + ph) * 0.016, sway = Math.sin(t * 0.7 + ph) * 0.025;
    const w = Math.sin(t * 0.33 + ph) , shift = Math.sign(w) * Math.min(1, Math.abs(w) * 2.2);     // which leg the weight's on (-1..1), held, then swapped
    r.aim('uArmL', 0.1 + shift * 0.02, -1, 0.02 + sway); r.aim('lArmL', 0.05, -1, 0.16 + sway * 0.6);
    r.aim('uArmR', -0.1 + shift * 0.02, -1, 0.02 - sway); r.aim('lArmR', -0.05, -1, 0.16 - sway * 0.6);
    _q.setFromAxisAngle(_v.set(0, 0, 1), shift * 0.035); r.pose.chest.setFromAxisAngle(_v.set(1, 0, 0), breathe).premultiply(_q);
    // the legs and hips (gait.js): feet planted where they stand, the hip dropping on the relaxed side and the weight over
    // the other foot; still moving (slowing to a stop, being shoved, turning round) they step, and the arms and trunk ease
    // out of the walk
    const g = this.gait || (this.gait = new Gait(this)); g.shift = shift; g.update(null, false);
    if (this.drunk) { const sw = Math.sin(t * 1.3 + ph) * 0.09 * this.drunk, sw2 = Math.sin(t * 0.83 + ph) * 0.07 * this.drunk;   // swaying where they stand
      r.pose.chest.premultiply(_q.setFromAxisAngle(_v.set(0, 0, 1), sw)).premultiply(_q.setFromAxisAngle(_v.set(1, 0, 0), sw2 + 0.06 * this.drunk)); r.pose.pelvis.premultiply(_q.setFromAxisAngle(_v.set(0, 0, 1), -sw * 0.5)); }
    if (this.state === 'idle' && !(this.speakT > 0) && !this.clip) this.fidget(t);      // (someone playing a move from punteranims.js has their own)
  }
  // Little things people do while they wait: look round the room, scratch their head, check the time, stretch,
  // rub their hands, put their hands on their hips, fold their arms. One at a time, eased in and out.
  fidget(t) {
    const r = this.rag;
    if (this.fidgetT == null) { this.fidgetT = 3 + Math.random() * 6; this.fidgetK = null; }
    if (!this.fidgetK) { if (t > (this.fidgetAt ?? (this.fidgetAt = t + this.fidgetT))) { this.fidgetK = ['look', 'scratch', 'watch', 'stretch', 'rub', 'hips', 'fold', 'look', 'nod'][Math.floor(Math.random() * 9)]; this.fidgetS = t; this.fidgetD = 1.8 + Math.random() * 2.2; this.fidgetSide = Math.random() < 0.5 ? -1 : 1; } return; }
    const u = (t - this.fidgetS) / this.fidgetD;
    if (u >= 1) { this.fidgetK = null; this.fidgetAt = t + 4 + Math.random() * 8; this.headExtra = null; return; }
    const e = Math.min(1, u / 0.18, (1 - u) / 0.18), s = this.fidgetSide;
    const mixAim = (n, x, y, z) => { const p = r.target ? null : null; r.aim(n, x, y, z); };
    switch (this.fidgetK) {
      case 'look': this.headExtra = { yaw: s * 0.9 * e * Math.sin(Math.min(1, u * 1.4) * Math.PI), pitch: -0.05 * e }; break;
      case 'nod': this.headExtra = { yaw: 0, pitch: Math.sin(u * 18) * 0.12 * e }; break;
      case 'scratch': if (e > 0.3) { mixAim('uArmR', -0.55, 0.55, 0.3); mixAim('lArmR', 0.6, 0.5 + Math.sin(t * 22) * 0.12, -0.3); this.headExtra = { yaw: 0.1, pitch: 0.12 }; } break;
      case 'watch': if (e > 0.3) { mixAim('uArmL', 0.25, -0.75, 0.55); mixAim('lArmL', -0.75, 0.35, 0.5); this.headExtra = { yaw: 0.35, pitch: 0.42 }; } break;
      case 'stretch': if (e > 0.3) { mixAim('uArmL', 0.35, 1, -0.1); mixAim('lArmL', -0.1, 1, 0); mixAim('uArmR', -0.35, 1, -0.1); mixAim('lArmR', 0.1, 1, 0); r.pose.chest.premultiply(_q.setFromAxisAngle(_v.set(1, 0, 0), -0.18 * e)); this.headExtra = { yaw: 0, pitch: -0.3 * e }; } break;
      case 'rub': if (e > 0.3) { const k = Math.sin(t * 16) * 0.08; mixAim('uArmL', 0.15, -0.75, 0.55); mixAim('lArmL', -0.9, 0.05 + k, 0.45); mixAim('uArmR', -0.15, -0.75, 0.55); mixAim('lArmR', 0.9, 0.05 - k, 0.45); } break;
      case 'hips': if (e > 0.3) { mixAim('uArmL', 0.8, -0.6, -0.1); mixAim('lArmL', -0.7, -0.6, 0.1); mixAim('uArmR', -0.8, -0.6, -0.1); mixAim('lArmR', 0.7, -0.6, 0.1); } break;
      case 'fold': if (e > 0.3) { mixAim('uArmL', 0.2, -1, 0.35); mixAim('lArmL', -1, 0.15, 0.3); mixAim('uArmR', -0.2, -1, 0.35); mixAim('lArmR', 1, 0.2, 0.3); } break;
    }
  }
  // stepping round on the spot when they turn a long way (not sliding round on their heels): the feet stay planted and
  // step round on their own as the body turns (gait.js)
  turnSteps(dt, dyaw) {}
  // each character can override this for their own idle (flexing, filming, holding a pint...)
  personalityPose(t) {}
  // talking with their hands: both hands go, palms out on the big words, a nod or a head tilt now and then
  talkPose(t) {
    const g = Math.sin(t * 5), g2 = Math.sin(t * 3.7 + 1), beat = Math.max(0, Math.sin(t * 2.3));
    this.rag.aim('uArmL', 0.5 + g2 * 0.1, -0.55, 0.45); this.rag.aim('lArmL', 0.25 + beat * 0.3, 0.15 + g * 0.25, 1);
    if (Math.sin(t * 0.9) > -0.2) { this.rag.aim('uArmR', -0.45 - g * 0.08, -0.6, 0.4); this.rag.aim('lArmR', -0.3 - beat * 0.25, 0.1 + g2 * 0.25, 1); }
    this.rag.pose.chest.premultiply(_q.setFromAxisAngle(_v.set(0, 1, 0), g2 * 0.06));
    this.headExtra = { yaw: Math.sin(t * 1.3) * 0.12, pitch: Math.sin(t * 6.1) * 0.05 + beat * 0.05 };
  }
  // Walking, jogging or sprinting, whatever speed they're really going (gait.js): planted feet that never slide, the
  // swing leg on real hip and knee curves (a high knee and a kicked-up heel at a sprint), the hips bobbing, dropping and
  // twisting, the chest turning against them and leaning with speed, the arms pumping opposite to the legs with the
  // elbows bending to ~90 degrees at a sprint, leaning into speed-ups and corners, the head steady. `speed` is only a
  // hint: the stride is matched to how fast the feet really move over the floor.
  walkPose(dt, speed = 0.9, blend = 1) {
    const g = this.gait || (this.gait = new Gait(this)); g.hint = speed; g.update(dt, true, blend);
  }
  flailPose(t) {
    const r = this.rag;
    r.aim('uArmL', Math.cos(t * 9), Math.sin(t * 9), 0.3); r.aim('lArmL', Math.cos(t * 9 + 1), Math.sin(t * 9 + 1), 0.3);
    r.aim('uArmR', -Math.cos(t * 8), Math.sin(t * 8), 0.3); r.aim('lArmR', -Math.cos(t * 8 + 1), Math.sin(t * 8 + 1), 0.3);
    r.aim('uLegL', 0.1, -1, Math.sin(t * 12) * 0.9); r.aim('uLegR', -0.1, -1, -Math.sin(t * 12) * 0.9);
    r.aim('lLegL', 0, -1, Math.sin(t * 12 + 1) * 0.6); r.aim('lLegR', 0, -1, -Math.sin(t * 12 + 1) * 0.6);
  }
  // winding up: weight back on the rear leg, the chest turned away, the throwing arm cocked back, the other arm out front aiming
  windupPose() {
    const r = this.rag, k = Math.min(1, this.stateT / 0.35);
    r.aim('uArmR', -0.3, 0.7, -0.7 * k); r.aim('lArmR', -0.1, 0.75, -0.85 * k);
    r.aim('uArmL', 0.25, 0.05, 1); r.aim('lArmL', 0.1, 0.1, 1);
    r.aim('uLegL', 0.05, -1, 0.3 * k); r.aim('lLegL', 0, -1, 0.25 * k); r.aim('uLegR', -0.03, -1, -0.15 * k); r.aim('lLegR', 0, -1, -0.32 * k);
    r.pose.chest.setFromAxisAngle(_v.set(0, 1, 0), 0.45 * k).premultiply(_q.setFromAxisAngle(_v.set(1, 0, 0), -0.18 * k));
    r.pose.pelvis.setFromAxisAngle(_v.set(0, 1, 0), 0.2 * k); r.bob = -0.03 * k;
  }
  // the throw: stepping into it, hips and chest whipping round, the arm coming through and following through low
  throwPose() {
    const r = this.rag, k = Math.min(1, this.stateT / 0.18);
    r.aim('uArmR', -0.15 + 0.3 * k, 0.1 - 0.5 * k, 1); r.aim('lArmR', -0.1 + 0.35 * k, -0.2 - 0.5 * k, 1);
    r.aim('uArmL', 0.4, -0.8, -0.2); r.aim('lArmL', 0.2, -0.6, 0.3);
    r.aim('uLegL', 0.05, -1, 0.45); r.aim('lLegL', 0, -1, 0.3); r.aim('uLegR', -0.03, -1, -0.35); r.aim('lLegR', 0, -1, -0.55);
    r.pose.chest.setFromAxisAngle(_v.set(0, 1, 0), -0.4 * k).premultiply(_q.setFromAxisAngle(_v.set(1, 0, 0), 0.32 * k));
    r.pose.pelvis.setFromAxisAngle(_v.set(0, 1, 0), -0.22 * k); r.bob = -0.04;
  }

  // ---------------- behaviour ----------------
  // ctx: { head, fwd, mouth, player }
  update(dt, ctx) {
    const r = this.rag;
    this.t += dt; this.stateT += dt;
    if (this.benched) { this.rag.setMode('anim', 0); this.rag.root.set(0, -50, -60); this.rag.animate(dt); this.rag.sync(); return; }    // (a player is being him in multiplayer)
    if (this.netDriven) { this.netUpdate(dt); return; }
    if (this.slapCool > 0) this.slapCool -= dt;
    if (this.speakT > 0) { this.speakT -= dt; if (this.speakT <= 0) { this.bubble.visible = false; this.onSpeechEnd && this.onSpeechEnd(); } }
    else this.quietT += dt;

    const pos = this.pos, playerHead = ctx.head; Gait.eye = playerHead;
    _v.set(playerHead.x - pos.x, 0, playerHead.z - pos.z);
    const toPlayerYaw = Math.atan2(_v.x, _v.z);
    this.distToPlayer = _v.length();
    r.moveVel.set(0, 0, 0);
    // gliding the last bit back into their seat / spot (backTo): smooth, never a jump
    if (this.glide) { const g = this.glide; if (this.down || this.state !== 'idle') this.glide = null; else { g.t += dt; const k = Math.min(1, g.t / g.dur), e = k * k * (3 - 2 * k);
      r.root.x = g.x0 + (g.x - g.x0) * e; r.root.z = g.z0 + (g.z - g.z0) * e; r.yaw = g.y0 + wrapAngle(g.yaw - g.y0) * e; if (k >= 1) this.glide = null; } }

    switch (this.state) {
      case 'enter':
        this.setIdlePose(this.t); this.personalityPose(this.t);
        this.turnTo(this.faceYaw ?? toPlayerYaw, dt, 2);
        if (this.stateT > 1.0 + (this.cfg.enterDelay || 0)) { this.say('greet'); this.state = 'idle'; this.stateT = 0; }
        break;
      case 'idle':
        if (this.headExtra && !this.fidgetK && !(this.speakT > 0)) this.headExtra = null;
        this.setIdlePose(this.t);
        this.personalityPose(this.t);
        if (this.speakT > 0 && !this.cfg.noTalkPose && !this.busyHands) this.talkPose(this.t);
        { const want = this.faceYaw ?? toPlayerYaw, dy = wrapAngle(want - r.yaw); if (Math.abs(dy) > 0.35 && !this.seated && !this.activity) this.turnSteps(dt, dy); this.turnTo(want, dt, 3); }
        if (!this.active) break;
        this.nextMove -= dt;
        this.idleTick && this.idleTick(dt, ctx);
        if (this.state !== 'idle') break;
        this.closeT = this.distToPlayer < 0.8 ? (this.closeT || 0) + dt : 0;
        if ((this.nextMove <= 0 || this.closeT > 3) && !this.stayPut) { this.closeT = 0; this.pickSpot(playerHead, ctx.fwd); }
        if (this.quietT > (this.cfg.chatterEvery || 16) && this.speakT <= 0) this.say('chatter', 1);
        break;
      case 'walk': {
        if (this.pathLater && this.walkGoal && this.room.nav && !this.room.nav.busy) { const g = this.walkGoal; this.pathLater = false;
          this.path = this.room.nav.path(pos.x, pos.z, g.x, g.z); if (this.path && this.path.length) { this.moveTarget = this.path.shift(); this.walkLimit = this.stateT + 8 + Math.hypot(g.x - pos.x, g.z - pos.z) * 1.6; } }
        _v2.set(this.moveTarget.x - pos.x, 0, this.moveTarget.y - pos.z);
        const d = _v2.length();
        if (d < 0.15 && this.path && this.path.length) { this.moveTarget = this.path.shift(); break; }   // next waypoint
        if (d < 0.15 || this.stateT > (this.walkLimit || 8)) { this.state = this.afterWalk || 'idle'; this.afterWalk = null; this.stateT = 0; this.nextMove = 8 + Math.random() * 8; break; }
        // not getting anywhere (caught on a corner, a shelf, someone else)? find a new way round, and if that fails too, stop
        this.walkT = (this.walkT || 0) + dt;                                              // (keeps counting even when someone keeps re-aiming the walk)
        if (!this.walkProbe) this.walkProbe = { t: this.walkT, x: pos.x, z: pos.z, tries: 0 };
        if (this.walkT - this.walkProbe.t > 1.2) {
          const moved = Math.hypot(pos.x - this.walkProbe.x, pos.z - this.walkProbe.z);
          if (moved < 0.12) {
            if (this.walkGoal && this.walkProbe.tries < 2) { const g = this.walkGoal, tries = this.walkProbe.tries + 1, after = this.afterWalk, sp0 = this.walkSpeed;
              const a = Math.random() * 6.28; pos.x += Math.cos(a) * 0.04; pos.z += Math.sin(a) * 0.04;          // a little wiggle free
              this.goTo(g.x, g.z, sp0, after); this.walkProbe = { t: this.walkT, x: pos.x, z: pos.z, tries }; break; }
            this.state = this.afterWalk || 'idle'; this.afterWalk = null; this.stateT = 0; this.nextMove = 2 + Math.random() * 3; this.walkProbe = null; this.walkT = 0; this.stallT = 3; break;
          }
          this.walkProbe = { t: this.walkT, x: pos.x, z: pos.z, tries: 0 };
        }
        _v2.normalize(); this.steer(_v2, pos);                                           // edge round anyone in the way
        if (this.drunk) { const w = Math.sin(this.t * 1.7) * 0.45 * this.drunk; const c2 = Math.cos(w), s2 = Math.sin(w), x = _v2.x; _v2.x = x * c2 + _v2.z * s2; _v2.z = -x * s2 + _v2.z * c2; }   // a stagger
        this.turnTo(Math.atan2(_v2.x, _v2.z), dt, 6);
        const sp = (this.walkSpeed || 0.9) * 1.15;   // a touch brisker than a stroll
        r.moveVel.copy(_v2).multiplyScalar(Math.min(sp, d * 2.5));
        this.walkPose(dt, r.moveVel.length());
        break;
      }
      case 'windup':
        this.setIdlePose(this.t);
        this.turnTo(toPlayerYaw, dt, 6);
        this.windupPose();
        if (this.heldItem) this.heldItem.visible = true;
        if (this.stateT >= (this.throwSpec?.windup ?? 0.9)) this.release(ctx);
        break;
      case 'throw':
        this.setIdlePose(this.t);
        this.turnTo(toPlayerYaw, dt, 6);
        this.throwPose();
        if (this.stateT > 0.6) { this.state = 'idle'; this.stateT = 0; this.onEvent && this.onEvent('thrown', this); }
        break;
      case 'act':                    // character-specific move (see squad.js)
        this.actUpdate && this.actUpdate(dt, ctx);
        break;
      case 'clinging':               // hanging off Ronnie (Dylan)
        r.setMode('ragdoll', 0.25);
        this.flailPose(this.t);
        this.clingUpdate && this.clingUpdate(dt, ctx);
        break;
      case 'ko':                     // a proper limp ragdoll
        if (this.stateT > (this.cfg.koTime || 2.2)) { this.state = 'recover'; this.stateT = 0; this.setIdlePose(this.t); r.pose.head.identity(); r.getUp(0.9); }
        break;
      case 'recover':                // blend from where they landed back to standing
        this.setIdlePose(this.t);
        if (r.mode === 'anim') {
          this.state = 'idle'; this.stateT = 0; this.upAt = this.t;
          if (this.pendingLine) { this.say(this.pendingLine, 4); this.pendingLine = null; }
          this.onEvent && this.onEvent('up', this);
        }
        break;
      case 'grabbed':
        this.flailPose(this.t);
        break;
    }

    this.afterPose && this.afterPose(dt);      // (sitting down / getting up out of a seat, eased over whatever they're doing)
    // head turns smoothly to look at the player (within reason)
    if (!this.down) {
      const rel = this.lookOverride != null ? this.lookOverride : THREE.MathUtils.clamp(wrapAngle(toPlayerYaw - r.yaw), -0.8, 0.8);
      const hx = this.headExtra || { yaw: 0, pitch: 0 };
      this.headYaw = (this.headYaw || 0) + (rel + hx.yaw - (this.headYaw || 0)) * Math.min(1, dt * 5);
      this.headPitch = (this.headPitch || 0) + ((hx.pitch || 0) - (this.headPitch || 0)) * Math.min(1, dt * 6);
      r.pose.head.setFromAxisAngle(_v.set(0, 1, 0), this.headYaw).multiply(_q.setFromAxisAngle(_v.set(1, 0, 0), this.headPitch));
      this.headRoll = (this.headRoll || 0) + ((hx.roll || 0) - (this.headRoll || 0)) * Math.min(1, dt * 6);
      if (Math.abs(this.headRoll) > 1e-3) r.pose.head.multiply(_q.setFromAxisAngle(_v.set(0, 0, 1), this.headRoll));      // (a head tilt: singing, laughing, an argument)
      if (this.state !== 'idle' && this.state !== 'walk') this.headExtra = null;
      this.applyFlinch(dt);
    }
    // animated characters walk by moving their feet (root); ragdolls are left to physics
    if (r.mode !== 'ragdoll') {
      r.root.x += r.moveVel.x * dt; r.root.z += r.moveVel.z * dt;
      r.animate(dt);
    }
    r.sync();
    this.afterUpdate && this.afterUpdate(dt, ctx);

    this.fx.position.set(pos.x, 0, pos.z);
    const head = this.headPos(_v);
    this.bubble.position.set(head.x, Math.max(head.y, 0.7) + 0.55, head.z); this.bubble.userData.head.set(head.x, Math.max(head.y, 0.7), head.z);
    this.updateStars(this.state === 'ko' || (this.state === 'recover' && this.stateT < 0.6), head);
    if (this.heldItem && this.heldItem.visible) r.grip('lArmR', this.heldItem.position);
  }

  // Local avoidance: people (and Ronnie) just ahead push the walking direction sideways, so two people meeting in a
  // gap pass each other instead of walking into one another. dir is a unit vector, changed in place.
  steer(dir, pos, extra = null) {
    let sx = 0, sz = 0;
    const consider = (ox, oz, rad) => { const dx = ox - pos.x, dz = oz - pos.z, d = Math.hypot(dx, dz); if (d < 0.05 || d > rad) return;
      const ahead = (dx * dir.x + dz * dir.z) / d; if (ahead < 0.2) return;
      const side = Math.sign(dx * dir.z - dz * dir.x) || 1, w = (1 - d / rad) * ahead;          // step to whichever side they're not on
      sx += -dir.z * side * w; sz += dir.x * side * w; };
    for (const o of Character.ALL) { if (o === this || o.down || !o.rag.mesh) continue; const p = o.pos; consider(p.x, p.z, 1.1); }
    if (extra) consider(extra.x, extra.z, 1.0);
    if (sx || sz) { dir.x -= sx * 0.9; dir.z -= sz * 0.9; const l = Math.hypot(dir.x, dir.z) || 1; dir.x /= l; dir.z /= l; }
    return dir;
  }
  // Appear right in front of someone (an attack starting): no walking over, so no time wasted and no getting stuck on the
  // furniture on the way. The spot is the nearest clear one in front of them (then off to the sides, then behind),
  // in sight of them, `dist` away. Returns false if there isn't one (they walk over like before)
  blinkTo(head, fwd, dist) {
    const nav = this.room.nav, d = Math.max(0.9, dist || 1), fx = fwd && Math.hypot(fwd.x, fwd.z) > 0.01 ? fwd.x / Math.hypot(fwd.x, fwd.z) : 0, fz = fwd && Math.hypot(fwd.x, fwd.z) > 0.01 ? fwd.z / Math.hypot(fwd.x, fwd.z) : -1;
    const ok = (x, z) => { if (!nav) return true; const k = nav.idx(x, z); if (k < 0 || !nav.free[k]) return false; return nav.clear(new THREE.Vector2(head.x, head.z), new THREE.Vector2(x, z)); };
    for (const dd of [d, d * 0.8, d * 1.25]) for (const a of [0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4, 2.2, -2.2, Math.PI]) {
      const c = Math.cos(a), sn = Math.sin(a), x = head.x + (fx * c - fz * sn) * dd, z = head.z + (fx * sn + fz * c) * dd;
      if (!ok(x, z)) continue;
      const from = this.pos.clone(); this.rag.placeAt(x, z, Math.atan2(head.x - x, head.z - z)); this.chase = null; this.path = null;
      Character.onBlink && Character.onBlink(from, new THREE.Vector3(x, 0, z));
      return true; }
    return false;
  }
  // Follow a nav path toward a moving goal (Ronnie), re-planning a few times a second; returns the distance left.
  chaseTo(gx, gz, dt, speed, stopAt) {
    const pos = this.pos, nav = this.room.nav, r = this.rag;
    const c = this.chase || (this.chase = { t: 0, path: null, probeT: 0, px: pos.x, pz: pos.z, stuck: 0 });
    const dist = Math.hypot(gx - pos.x, gz - pos.z);
    if (dist <= stopAt) { this.chase = null; return dist; }
    c.t -= dt;
    if (c.t <= 0 || !c.path || !c.path.length) { if (nav && nav.busy && c.path && c.path.length) c.t = 0.03;      // (path finding's had its time this frame: keep to the route we've got, look again in a moment)
      else { c.t = 0.45; c.path = nav ? nav.path(pos.x, pos.z, gx, gz) : null; if (!c.path || !c.path.length) c.path = [new THREE.Vector2(gx, gz)]; } }
    let wp = c.path[0]; while (c.path.length > 1 && Math.hypot(wp.x - pos.x, wp.y - pos.z) < 0.25) { c.path.shift(); wp = c.path[0]; }
    _v2.set(wp.x - pos.x, 0, wp.y - pos.z); if (_v2.lengthSq() < 1e-6) _v2.set(gx - pos.x, 0, gz - pos.z);
    _v2.normalize(); this.steer(_v2, pos);
    this.turnTo(Math.atan2(_v2.x, _v2.z), dt, 9);
    const sp = Math.min(speed, Math.max(1.0, (dist - stopAt) * 3));                       // slow up as they arrive
    r.moveVel.copy(_v2).multiplyScalar(sp);
    this.walkPose(dt, sp);
    // stuck on something? a sidestep and a fresh plan
    c.probeT += dt; if (c.probeT > 0.8) { const moved = Math.hypot(pos.x - c.px, pos.z - c.pz); if (moved < 0.15) { c.stuck++; c.t = 0; const a = Math.random() * 6.28; r.root.x += Math.cos(a) * 0.12; r.root.z += Math.sin(a) * 0.12; } else c.stuck = 0; c.probeT = 0; c.px = pos.x; c.pz = pos.z; }
    return dist;
  }
  // multiplayer (someone else is the host): every body part follows where the host says it is
  netUpdate(dt) {
    const r = this.rag, tg = this.netTarget;
    if (this.speakT > 0) { this.speakT -= dt; if (this.speakT <= 0) this.bubble.visible = false; }
    if (tg && r.list) { const k = Math.min(1, dt * 14);
      if (r.mode !== 'anim') r.setMode('anim', 0);
      r.list.forEach((p, i) => { const a = tg[i]; if (!a) return; const b = p.body;
        if (!p.netInit) { b.position.set(a[0], a[1], a[2]); b.quaternion.set(a[3], a[4], a[5], a[6]); p.netInit = true; }
        b.position.x += (a[0] - b.position.x) * k; b.position.y += (a[1] - b.position.y) * k; b.position.z += (a[2] - b.position.z) * k;
        _q.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w).slerp(_q2.set(a[3], a[4], a[5], a[6]).normalize(), k);
        b.quaternion.set(_q.x, _q.y, _q.z, _q.w); b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0); });
      const pv = r.parts.pelvis.body.position; r.root.x = pv.x; r.root.z = pv.z; netFeet(r); }
    r.sync();
    const pos = this.pos; this.fx.position.set(pos.x, 0, pos.z);
    this.placeProp && this.placeProp(dt, null);
    const head = this.headPos(_v); this.bubble.position.set(head.x, Math.max(head.y, 0.7) + 0.55, head.z);
    this.updateStars(this.netRag === 1, head);
  }
  turnTo(yaw, dt, speed) { this.rag.yaw += wrapAngle(yaw - this.rag.yaw) * Math.min(1, dt * speed); }

  yawFromBody() {
    const q = this.rag.parts.pelvis.body.quaternion; _q.set(q.x, q.y, q.z, q.w);
    _v.set(0, 0, 1).applyQuaternion(_q);
    if (Math.abs(_v.y) < 0.9) this.rag.yaw = Math.atan2(_v.x, _v.z);
  }

  updateStars(on, head) {
    this.stars.forEach((s, i) => {
      s.visible = on;
      if (!on) return;
      const a = this.t * 5 + i * Math.PI * 2 / 3;
      s.position.set(head.x + Math.cos(a) * 0.16, head.y + 0.16, head.z + Math.sin(a) * 0.16);
    });
  }

  // Walk somewhere (x, z); state goes back to idle (or `after`) on arrival.
  // Back to their own spot (a chair, a till, a job) after being knocked away from it: they WALK back. Only the last few
  // centimetres go in one step; true once they're there. (Every mode used to put them straight back the moment they were
  // up: a knocked-over squad member got up and vanished back into their chair, metres away.) Only if three walks there in
  // a row get nowhere is it the instant way, so nobody's stuck for ever
  backTo(x, z, yaw, sit = false) {
    if (this.glide) return false;
    const rt = this.rag.root, d = Math.hypot(rt.x - x, rt.z - z);
    if (d <= 0.12) { this.backTries = 0; this.rag.placeAt(x, z, yaw); return true; }
    // close (a chair is inside the furniture, so walking stops short of it), or the walks keep failing: a smooth glide in
    if (d <= 1.5 || (this.backTries || 0) >= 3) { if (this.state === 'idle' && this.rag.mode === 'anim') { this.backTries = 0; this.seated = !!sit; this.glide = { x0: rt.x, z0: rt.z, x, z, y0: this.rag.yaw, yaw, t: 0, dur: Math.max(0.35, d * 0.45) }; } return false; }
    if (this.state === 'idle' && this.rag.mode === 'anim') { this.backTries = (this.backTries || 0) + 1; this.seated = false; this.activity = null; this.goTo(x, z, 1.0); }
    return false;
  }
  goTo(x, z, speed = 0.9, after = null) {
    // big levels: follow a path round the furniture
    const nav = this.room.nav, pos = this.pos;
    this.pathLater = !!(nav && nav.busy);      // (path finding's had its time this frame: straight at it for now, the route next frame)
    this.path = nav && !this.pathLater ? nav.path(pos.x, pos.z, x, z) : null;
    if (this.path && this.path.length) { this.moveTarget = this.path.shift(); this.walkLimit = 8 + Math.hypot(x - pos.x, z - pos.z) * 1.6; }
    else { this.moveTarget = new THREE.Vector2(x, z); this.walkLimit = 8; }
    this.walkSpeed = speed;
    this.afterWalk = after;
    this.walkGoal = { x, z };
    if (this.state !== 'walk') { this.walkProbe = null; this.walkT = 0; }
    this.state = 'walk'; this.stateT = 0;
  }

  pickSpot(playerHead, playerFwd) {
    const pos = this.pos;
    let best = null, bestScore = -Infinity, fallback = null, fd = Infinity;
    for (const s of this.room.tommySpots) {
      const dx = s.x - playerHead.x, dz = s.y - playerHead.z;
      const d = Math.hypot(dx, dz);
      const self = Math.hypot(s.x - pos.x, s.y - pos.z);
      if (self < fd && self > 0.3) { fd = self; fallback = s; }
      if (d < 1.4 || self < 0.3) continue;
      if (this.othersNear && this.othersNear(s)) continue;
      if (!this.room.nav && !this.pathClear(pos.x, pos.z, s.x, s.y)) continue;
      if (this.room.nav && d > 9) continue;   // big levels: hang around within sight of Ronnie
      const facing = (dx * playerFwd.x + dz * playerFwd.z) / d;
      const score = facing * 2 + Math.random();
      if (score > bestScore) { bestScore = score; best = s; }
    }
    this.nextMove = 6 + Math.random() * 6;
    best = best || (Math.hypot(pos.x - playerHead.x, pos.z - playerHead.z) < 0.8 ? fallback : null);
    if (!best) return;
    this.goTo(best.x, best.y, 0.9);
  }

  pathClear(x0, z0, x1, z1) {
    const pad = 0.25;
    for (let i = 1; i <= 20; i++) {
      const t = i / 20, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      for (const b of this.room.blockers) if (x > b.x0 - pad && x < b.x1 + pad && z > b.z0 - pad && z < b.z1 + pad) return false;
    }
    return true;
  }

  // ---------------- throwing things at Ronnie ----------------
  // spec: { item: 'broccoli', speed: 3, windup: 0.9, line: 'vegThrow', target: 'mouth' | 'chest' }
  startThrow(spec) {
    if (this.down) return false;
    this.throwSpec = spec;
    if (!this.heldItem || this.heldItemType !== spec.item) {
      if (this.heldItem) this.scene.remove(this.heldItem);
      this.heldItem = new Item(spec.item).obj; this.heldItem.scale.setScalar(1); this.scene.add(this.heldItem);
      this.heldItemType = spec.item;
    }
    this.heldItem.visible = false;
    if (spec.line) this.say(spec.line, 3);
    this.state = 'windup'; this.stateT = 0;
    return true;
  }

  release(ctx) {
    const spec = this.throwSpec || { item: 'broccoli', speed: TUNING.broccoliSpeed };
    if (this.heldItem) this.heldItem.visible = false;
    this.state = 'throw'; this.stateT = 0;
    const start = this.rag.tip('lArmR', new THREE.Vector3());
    start.y = Math.max(start.y, 1.2);
    const target = _v.copy(spec.target === 'chest' ? ctx.head : ctx.mouth);
    if (spec.target === 'chest') target.y -= 0.35;
    if (spec.spread) { target.x += (Math.random() - 0.5) * spec.spread; target.z += (Math.random() - 0.5) * spec.spread; }
    const vel = ballistic(start, target, spec.speed || TUNING.broccoliSpeed, this.room.bounds.y1);
    sfx('throw', start, 0.8);
    this.onThrow && this.onThrow(start, vel, spec.item, this, spec);
  }
}

// Velocity for a lob from start to target at roughly `speed` m/s horizontally, under the ceiling.
export function ballistic(start, target, speed, ceiling) {
  const dist = Math.hypot(target.x - start.x, target.z - start.z);
  let T = THREE.MathUtils.clamp(dist / speed, 0.45, 1.3);
  for (let i = 0; i < 20; i++) {
    const vy = (target.y - start.y) / T - 0.5 * TUNING.gravity * T;
    if (vy <= 0 || start.y + (vy * vy) / (-2 * TUNING.gravity) < ceiling - 0.2) break;
    T *= 0.92;
  }
  return new THREE.Vector3((target.x - start.x) / T, (target.y - start.y) / T - 0.5 * TUNING.gravity * T, (target.z - start.z) / T);
}

export function wrapAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
