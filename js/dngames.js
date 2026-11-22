// DATE NIGHT's games (datenight.js plays them in the middle of its films). Each one is a little game with rounds that
// get harder, its own drawing on a canvas (the "stage" above its buttons on a screen, and on the headset's panel),
// juice (pop-up scores, bits flying, a shake) and a score that goes on the Eat Meter as you play:
//   { id, buttons: [{icon, label, sub, col, off, hot}], update(dt), press(i), release?(i), draw(g, w, h),
//     danger (0..1: how close she is to seeing you), status (a line for the headset), result: null | { win, soft, reason, score, stars } }
// A game is handed S (the DateNight) before it starts: S.reward(n), S.live(who, line), S.tell(c), S.chloe, S.ron...
import { sfx } from './audio.js';
import { FONT } from './textures.js';

const R = (a) => a[Math.floor(Math.random() * a.length)];
const rr = (a, b) => a + Math.random() * (b - a);
const ease = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const lerp = (a, b, k) => a + (b - a) * k;
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------------------------------------------------------------- drawing helpers
// an emoji on a canvas at any size (an iPhone draws nothing for one much over 64px: drawn once at 64, then scaled)
const EMO = new Map();
export function emo(g, e, x, y, s, a = 1) {
  let c = EMO.get(e); if (!c) { c = document.createElement('canvas'); c.width = c.height = 96; const q = c.getContext('2d'); q.font = '64px sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(e, 48, 52); EMO.set(e, c); }
  const w = 96 * s / 64; if (a < 1) { g.save(); g.globalAlpha *= a; } g.drawImage(c, x - w / 2, y - w / 2, w, w); if (a < 1) g.restore();
}
export function rr2(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
export function txt(g, s, x, y, size, color, { align = 'center', maxW = 0, stroke = 0, weight = 900 } = {}) {
  let sz = size; g.textAlign = align; g.textBaseline = 'middle';
  do { g.font = `${weight} ${sz}px ${FONT}`; sz -= 1; } while (maxW && g.measureText(s).width > maxW && sz > 8);
  if (stroke) { g.lineJoin = 'round'; g.lineWidth = stroke; g.strokeStyle = '#111'; g.strokeText(s, x, y); }
  g.fillStyle = color; g.fillText(s, x, y);
}
export function meter(g, x, y, w, h, k, col, label, icon) {
  g.fillStyle = 'rgba(0,0,0,0.55)'; rr2(g, x, y, w, h, h / 2); g.fill();
  if (k > 0.002) { g.fillStyle = col; rr2(g, x + 2, y + 2, Math.max(h - 4, (w - 4) * Math.min(1, k)), h - 4, (h - 4) / 2); g.fill(); }
  g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.7)'; rr2(g, x, y, w, h, h / 2); g.stroke();
  if (icon) emo(g, icon, x + h * 0.55, y + h / 2, h * 0.95);
  if (label) txt(g, label, x + w / 2 + (icon ? h * 0.3 : 0), y + h / 2 + 1, h * 0.55, '#fff', { stroke: 3, maxW: w - h * 1.4 });
}
const eyeCol = (k) => k > 0.75 ? '#ff3a3a' : k > 0.45 ? '#ffb020' : '#39ff14';
// Chloe's face: look 0 = right at you, ±1 = turned away; mood 'happy' | 'sus' | 'angry' | 'busy'
export function drawChloe(g, x, y, r, look = 0, mood = 'happy') {
  const L = Math.max(-1, Math.min(1, look)), fx = x + L * r * 0.38, sq = 1 - Math.abs(L) * 0.22;
  g.fillStyle = '#140d0b'; g.beginPath(); g.ellipse(x - L * r * 0.12, y + r * 0.2, r * 1.12, r * 1.3, 0, 0, 7); g.fill();          // long dark hair behind
  g.fillStyle = '#f3cdb4'; g.beginPath(); g.ellipse(fx, y, r * 0.8 * sq, r * 0.98, 0, 0, 7); g.fill();                            // face
  g.fillStyle = '#140d0b'; g.beginPath(); g.ellipse(fx - L * r * 0.1, y - r * 0.72, r * 0.86 * sq, r * 0.42, 0, Math.PI, 0); g.fill();   // fringe
  if (Math.abs(L) > 0.85) {      // (side on: her profile, an eye looking off, the nose, an ear)
    const d = Math.sign(L);
    g.fillStyle = '#f3cdb4'; g.beginPath(); g.moveTo(fx + d * r * 0.55, y - r * 0.1); g.lineTo(fx + d * r * 0.78, y + r * 0.12); g.lineTo(fx + d * r * 0.52, y + r * 0.18); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(fx + d * r * 0.36, y - r * 0.1, r * 0.1, r * 0.1, 0, 0, 7); g.fill();
    g.fillStyle = '#3a2416'; g.beginPath(); g.arc(fx + d * r * 0.41, y - r * 0.1 + (mood === 'busy' ? r * 0.04 : 0), r * 0.055, 0, 7); g.fill();
    g.strokeStyle = '#c0636b'; g.lineWidth = Math.max(2, r * 0.07); g.beginPath(); g.moveTo(fx + d * r * 0.3, y + r * 0.45); g.lineTo(fx + d * r * 0.5, y + r * 0.42); g.stroke();
    g.fillStyle = '#e2b79c'; g.beginPath(); g.ellipse(fx - d * r * 0.25, y, r * 0.12, r * 0.2, 0, 0, 7); g.fill(); return; }
  const ey = y - r * 0.08, ex = r * 0.3 * sq, px = L * r * 0.13;
  for (const s of [-1, 1]) { const cx = fx + s * ex;
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx, ey, r * 0.16 * sq, r * 0.12, 0, 0, 7); g.fill();
    g.fillStyle = '#3a2416'; g.beginPath(); g.arc(cx + px, ey + (mood === 'busy' ? r * 0.05 : 0), r * 0.07, 0, 7); g.fill();
    g.strokeStyle = '#140d0b'; g.lineWidth = Math.max(1.5, r * 0.06); g.beginPath();
    const tilt = mood === 'angry' ? s * 0.25 : mood === 'sus' ? (s > 0 ? -0.25 : 0.1) : -0.05;
    g.moveTo(cx - r * 0.15, ey - r * 0.2 - tilt * r * 0.3); g.lineTo(cx + r * 0.15, ey - r * 0.2 + tilt * r * 0.3); g.stroke(); }
  g.strokeStyle = '#c0636b'; g.fillStyle = '#c0636b'; g.lineWidth = Math.max(2, r * 0.08); g.beginPath();
  const my = y + r * 0.45;
  if (mood === 'happy') g.arc(fx, my - r * 0.12, r * 0.2, 0.25, Math.PI - 0.25);
  else if (mood === 'angry') g.arc(fx, my + r * 0.12, r * 0.18, Math.PI + 0.35, -0.35);
  else { g.moveTo(fx - r * 0.15, my); g.lineTo(fx + r * 0.15, my + (mood === 'sus' ? -r * 0.04 : 0)); }
  g.stroke();
}
// Ronnie's face: cheeks 0..1 (puffed out with food), mood 'eat' | 'innocent' | 'shock' | 'smug'
export function drawRon(g, x, y, r, cheeks = 0, mood = 'innocent') {
  const c = Math.max(0, Math.min(1, cheeks));
  g.fillStyle = '#f3cdb4'; g.beginPath(); g.ellipse(x, y, r * (0.95 + c * 0.25), r, 0, 0, 7); g.fill();
  if (c > 0.05) { g.fillStyle = '#f0b9a0'; for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * r * (0.62 + c * 0.2), y + r * 0.2, r * (0.25 + c * 0.25), 0, 7); g.fill(); } }
  g.fillStyle = '#1a1410'; g.beginPath(); g.ellipse(x, y - r * 0.78, r * 0.8, r * 0.3, 0, Math.PI, 0); g.fill();
  g.fillStyle = 'rgba(40,30,20,0.25)'; for (let i = 0; i < 14; i++) { const a = 0.4 + i / 13 * 2.3; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62 + r * 0.1, r * 0.035, 0, 7); g.fill(); }
  const ey = y - r * 0.15;
  for (const s of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x + s * r * 0.3, ey, r * (mood === 'shock' ? 0.17 : 0.13), r * (mood === 'shock' ? 0.17 : 0.1), 0, 0, 7); g.fill();
    g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(x + s * r * 0.3 + (mood === 'innocent' ? r * 0.06 : 0), ey - (mood === 'innocent' ? r * 0.04 : 0), r * 0.06, 0, 7); g.fill(); }
  g.strokeStyle = '#7a3a2a'; g.lineWidth = Math.max(2, r * 0.08); g.beginPath();
  const my = y + r * 0.42;
  if (c > 0.25) { g.fillStyle = '#7a3a2a'; g.ellipse(x, my, r * 0.14, r * 0.06, 0, 0, 7); g.fill(); }
  else if (mood === 'eat') { g.fillStyle = '#5a1a12'; g.ellipse(x, my, r * 0.24, r * 0.18, 0, 0, 7); g.fill(); }
  else if (mood === 'shock') { g.fillStyle = '#5a1a12'; g.arc(x, my, r * 0.13, 0, 7); g.fill(); }
  else if (mood === 'smug') { g.arc(x + r * 0.05, my - r * 0.15, r * 0.24, 0.3, Math.PI - 0.6); g.stroke(); }
  else { g.arc(x, my - r * 0.18, r * 0.2, 0.4, Math.PI - 0.4); g.stroke(); }
}

// ---------------------------------------------------------------- juice: pop-ups, bits flying, shake, combos
function base(id, o, extra) {
  // (copied with their getters intact: a plain Object.assign would freeze a getter at its first value)
  return Object.defineProperties({ id, t: 0, lvl: Math.max(0, Math.min(1, (o && o.lvl) || 0)), result: null, danger: 0.15, status: '', score: 0, combo: 0, comboT: 0, best: 0,
    pops: [], parts: [], shk: 0, round: 1, rounds: 1, buttons: [], hits: 0 }, Object.getOwnPropertyDescriptors(extra));
}
function pop(G, s, col = '#ffd400', x = 0.5, y = 0.5, big = 1) { G.pops.push({ s, col, x, y, t: 0, big }); if (G.pops.length > 8) G.pops.shift(); }
function burst(G, x, y, e, n = 8) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, sp = rr(0.25, 0.7); G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.4, t: 0, life: rr(0.5, 0.9), e: Array.isArray(e) ? R(e) : e, s: rr(0.6, 1.1) }); } if (G.parts.length > 60) G.parts.splice(0, G.parts.length - 60); }
function shake(G, k = 1) { G.shk = Math.max(G.shk, 0.3 * k); }
function juice(G, dt) {
  G.t += dt; if (G.comboT > 0 && (G.comboT -= dt) <= 0) G.combo = 0; if (G.shk > 0) G.shk = Math.max(0, G.shk - dt);
  for (const p of G.pops) p.t += dt; G.pops = G.pops.filter(p => p.t < 1.0);
  for (const p of G.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 1.6 * dt; } G.parts = G.parts.filter(p => p.t < p.life);
}
// a mouthful: quick ones in a row build a combo (each one worth a bit more), all of it on the Eat Meter
function bite(G, n, x = 0.5, y = 0.55, e = null) {
  G.combo = G.comboT > 0 ? G.combo + 1 : 1; G.comboT = 0.9; G.best = Math.max(G.best, G.combo); G.hits++;
  const k = 1 + Math.min(4, G.combo - 1) * 0.25, v = Math.round(n * k);
  G.score += v; if (G.S) G.S.reward(v);
  pop(G, G.combo >= 3 ? `+${v} x${G.combo}!` : `+${v}`, G.combo >= 3 ? '#ff9e3d' : '#ffd400', x + rr(-0.04, 0.04), y);
  burst(G, x, y, e ? [e, '·', '✦'] : ['✦', '·', '•'], G.combo >= 3 ? 10 : 6);
  return v;
}
function begin(G, g, w, h, col = 'rgba(20,6,12,0.86)') {
  g.clearRect(0, 0, w, h); g.save();
  if (G.shk > 0) g.translate((Math.random() - 0.5) * G.shk * 18, (Math.random() - 0.5) * G.shk * 12);
  g.fillStyle = col; rr2(g, 0, 0, w, h, Math.min(16, h / 5)); g.fill();
  g.lineWidth = 3; g.strokeStyle = G.danger > 0.8 ? '#ff3a3a' : 'rgba(232,121,249,0.85)'; rr2(g, 1.5, 1.5, w - 3, h - 3, Math.min(15, h / 5)); g.stroke();
}
function end(G, g, w, h) {
  for (const p of G.parts) { const a = 1 - p.t / p.life; if (p.e === '·' || p.e === '•' || p.e === '✦') { g.globalAlpha = a; txt(g, p.e, p.x * w, p.y * h, 12 * p.s, '#ffd400'); g.globalAlpha = 1; } else emo(g, p.e, p.x * w, p.y * h, 16 * p.s, a); }
  for (const p of G.pops) { const k = p.t / 1.0, s = (p.t < 0.12 ? 0.6 + p.t / 0.12 * 0.6 : 1.2 - Math.min(0.2, (p.t - 0.12))) * p.big; g.globalAlpha = Math.max(0, 1 - Math.max(0, k - 0.6) / 0.4);
    txt(g, p.s, p.x * w, p.y * h - k * h * 0.18, Math.min(22, h * 0.17) * s, p.col, { stroke: 4 }); g.globalAlpha = 1; }
  // the round and the score, bottom right
  const fs = Math.max(9, Math.min(11, h * 0.08)), lab = (G.rounds > 1 ? `${Math.min(G.round, G.rounds)}/${G.rounds} · ` : '') + `★ ${G.score}`;
  g.font = `900 ${fs}px ${FONT}`; const tw = g.measureText(lab).width + 12;
  g.fillStyle = 'rgba(0,0,0,0.6)'; rr2(g, w - tw - 6, h - fs - 10, tw, fs + 6, (fs + 6) / 2); g.fill(); txt(g, lab, w - 6 - tw / 2, h - fs / 2 - 7, fs, '#ffd400');
  g.restore();
}
const stars = (G, a, b) => (G.score >= b ? 3 : G.score >= a ? 2 : G.score > 0 ? 1 : 0);
const say = (G, who, line, gap) => { if (G.S && who) G.S.live(who, line, gap); };

// ================================================================ SHE LOOKS AWAY: CRAM
export const SRC = {
  bread: { icon: '🥖', label: 'BREAD BASKET', chonk: 4, cheek: 0.13, noise: 0, n: 6 },
  pasta: { icon: '🍝', label: 'HER PASTA', chonk: 7, cheek: 0.22, noise: 0.12, n: 4 },
  next: { icon: '🍰', label: 'NEXT TABLE', chonk: 9, cheek: 0.26, noise: 0.1, n: 3 },
  wine: { icon: '🍷', label: 'HER WINE', chonk: 3, cheek: -0.45, noise: 0.05, n: 2, gulp: true },
  chips: { icon: '🍟', label: 'SIDE OF CHIPS', chonk: 5, cheek: 0.15, noise: 0.04, n: 5 },
  butter: { icon: '🧈', label: 'THE BUTTER', chonk: 6, cheek: 0.1, noise: 0, n: 3 },
};
// o: { pool: [source keys], rounds, lvl, away (angle she looks off at), pose, fakeText, again: [her lines between rounds], mutter: [lines while busy] }
export function cramGame(o) {
  const lvl = Math.max(0, Math.min(1, o.lvl || 0));
  const G = base('cram', o, { howto: ['😋 EAT while she\'s looking away', '😇 ACT NATURAL the moment she turns back'],
    rounds: o.rounds || 2, phase: 'away', cheeks: 0, n: 0, last: -9, natural: false, smooth: 0, left: {}, cur: [], msg: '', msgT: 0, look: 1,
    newRound() {
      const p = o.pool, k = (this.round - 1) * 2; this.cur = [p[k % p.length], p[(k + 1) % p.length]];
      for (const s of this.cur) if (this.left[s] == null) this.left[s] = SRC[s].n;
      this.phase = 'away'; this.natural = false; this.faked = false; this.fakeAt = Math.random() < 0.55 ? rr(1.2, 2.0) : -1; this.rt = 0;
      this.awayT = rr(3.2, 5.2) * (1 - 0.3 * lvl) * (this.round > 1 ? 0.85 : 1); this.window = rr(0.7, 1.0) * (1 - 0.3 * lvl) * (this.round > 1 ? 0.9 : 1);
      this.mutT = 1.6;
      this.makeButtons();
    },
    // what EAT grabs next: the wine if your cheeks are getting full (a gulp empties them), otherwise whatever's left
    next() { const has = this.cur.filter(k => this.left[k] > 0); if (!has.length) return null; const wine = has.find(k => SRC[k].gulp); if (wine && this.cheeks > 0.45) return wine; return has.find(k => !SRC[k].gulp) || has[0]; },
    makeButtons() { const k = this.next(); this.buttons = [{ icon: k ? SRC[k].icon : '🍽️', label: 'EAT', sub: k ? SRC[k].label.toLowerCase() : 'all gone', col: '#ffd400', off: this.natural || !k }, { icon: '😇', label: 'ACT NATURAL', sub: 'as she turns back', col: '#9fe8ff', off: this.natural }]; },
    update(dt) {
      juice(this, dt); const S = this.S, c = S.chloe; this.rt += dt; this.cheeks = Math.max(0, this.cheeks - dt * 0.18); if (this.msgT > 0) this.msgT -= dt;
      const away = o.away || 0;
      const setLook = (k) => { this.look = k; if (c) { c.lookOverride = away ? away * k : (k > 0.5 ? null : 0); if (o.pose && k > 0.5) c.dnPose = o.pose; else if (k < 0.3) c.dnPose = null; } };
      if (this.phase === 'away') {
        this.awayT -= dt; this.danger = 0.12; setLook(1);
        if ((this.mutT -= dt) <= 0 && o.mutter) { this.mutT = rr(2.2, 3.2); say(this, c, R(o.mutter), 0); }
        if (this.fakeAt > 0 && this.rt > this.fakeAt && !this.faked) { this.faked = true; this.phase = 'fake'; this.fakeT = 0.8; S.tell(c); }
        if (this.awayT <= 0) { this.phase = 'turn'; this.turnT = this.window; if (c) S.tell(c); }
      } else if (this.phase === 'fake') {
        this.fakeT -= dt; setLook(this.fakeT > 0.4 ? 1 - (0.8 - this.fakeT) / 0.4 * 0.55 : 0.45 + (0.4 - this.fakeT) / 0.4 * 0.55); this.danger = 0.78;
        if (this.fakeT <= 0) { this.phase = 'away'; this.msg = 'FALSE ALARM! KEEP GOING'; this.msgT = 1.6; if (o.fakeText) say(this, c, o.fakeText, 0); }
      } else if (this.phase === 'turn') {
        this.turnT -= dt; const k = Math.max(0, this.turnT / this.window); setLook(0.15 + 0.85 * k); this.danger = 0.65 + 0.35 * (1 - k);
        if (this.turnT <= 0) { this.phase = 'look'; this.lookT = 0; setLook(0);
          if (this.cheeks > 0.72) { shake(this, 1.4); this.result = { win: false, reason: 'hamster', score: this.score }; return; }
          if (this.t - this.last < 0.22) { shake(this, 1.4); this.result = { win: false, reason: 'mid', score: this.score }; return; } }
      } else if (this.phase === 'look') {
        this.lookT += dt; this.danger = 1; setLook(0);
        if (this.lookT > 1.2) {
          if (this.round >= this.rounds) { this.result = { win: true, score: this.score, smooth: this.smooth, n: this.n, stars: Math.min(3, (this.smooth ? 1 : 0) + (this.n >= 6 ? 1 : 0) + (this.n >= 10 || this.best >= 4 ? 1 : 0)) }; return; }
          this.phase = 'calm'; this.calmT = 1.6; if (c && o.again) say(this, c, o.again[(this.round - 1) % o.again.length], 0);
        }
      } else if (this.phase === 'calm') {
        this.calmT -= dt; this.danger = 0.9; setLook(0);
        if (this.calmT <= 0) { this.round++; this.newRound(); pop(this, `ROUND ${this.round}!`, '#e879f9', 0.5, 0.5, 1.3); sfx('ding', null, 0.5); }
      }
      this.status = { away: this.msgT > 0 ? this.msg : 'SHE\'S BUSY: CRAM IT IN!', fake: '!! SHE\'S TURNING !!', turn: '!! SHE\'S TURNING !!', look: 'SHE\'S LOOKING. DON\'T MOVE.', calm: 'SHE\'S LOOKING. SMILE. WAIT.' }[this.phase];
      this.makeButtons(); this.buttons[1].hot = this.phase === 'turn' && !this.natural;
    },
    press(i) {
      const S = this.S, r = S.ron;
      if (i === 1) { if (this.natural) return; this.natural = true; if (r) r.dnPose = 'innocent';
        if (this.phase === 'turn') { this.smooth++; this.score += 6; S.reward(6); pop(this, 'SMOOTH! +6', '#9fe8ff', 0.5, 0.45, 1.3); burst(this, 0.5, 0.5, ['😇', '✦'], 10); sfx('dn_smooth', null, 0.7); }
        else if (this.phase === 'away' || this.phase === 'fake') { this.awayT = Math.min(this.awayT, 0.6); this.phase = 'away'; pop(this, 'PLAYING IT SAFE', '#9fe8ff'); }
        return; }
      if (this.phase === 'look' || this.phase === 'calm') { shake(this, 1.5); this.result = { win: false, reason: 'red', score: this.score }; return; }
      if (this.natural) return;
      const k = this.next(), s = SRC[k]; if (!s || this.left[k] <= 0) return;
      this.left[k]--; this.n++; this.last = this.t;
      this.cheeks = Math.max(0, Math.min(1, this.cheeks + s.cheek));
      bite(this, s.chonk, 0.5, 0.6, s.icon); sfx(s.gulp ? 'gulp' : 'chomp', null, 0.7);
      if (s.gulp) pop(this, 'GULP! CHEEKS EMPTIED', '#ff9ec7', 0.5, 0.35);
      if (r) { r.dnPose = 'cram'; r.lookOverride = k === 'next' ? -0.6 : 0; }
      if (s.noise && (this.phase === 'away') && Math.random() < s.noise) { this.awayT = Math.min(this.awayT, 0.05); this.msg = 'CLATTER! "...what was that?"'; this.msgT = 1.5; shake(this, 0.8); }
    },
    draw(g, w, h) {
      begin(this, g, w, h);
      const pad = Math.max(6, h * 0.06), fr = Math.min(h * 0.3, w * 0.12);
      // Chloe's head (turning), Ronnie's face (cheeks), between them the danger bar
      const lk = this.phase === 'look' || this.phase === 'calm' ? 0 : this.look;
      drawChloe(g, pad + fr * 1.25, pad + fr * 1.15, fr, lk, this.phase === 'turn' || this.phase === 'fake' ? 'sus' : this.phase === 'look' || this.phase === 'calm' ? 'happy' : 'busy');
      drawRon(g, w - pad - fr * 1.1, pad + fr * 1.15, fr, this.cheeks, this.natural ? 'innocent' : this.t - this.last < 0.3 ? 'eat' : 'innocent');
      const mx = pad * 2 + fr * 2.2, mw = w - mx * 2, mh = Math.max(16, Math.min(26, h * 0.18));
      meter(g, mx, pad, mw, mh, this.danger, eyeCol(this.danger), this.phase === 'look' || this.phase === 'calm' ? 'LOOKING!' : this.phase === 'turn' || this.phase === 'fake' ? 'TURNING!' : 'BUSY', '👀');
      const ly = pad * 2 + mh, rest = h - ly - pad - 16, line = this.cheeks > 0.6 && this.phase === 'away' ? 'CHEEKS FULL! SWALLOW!' : this.status;
      if (rest > 14) txt(g, line, mx + mw / 2, ly + rest * 0.5, Math.min(19, rest * 0.5), this.danger > 0.6 || this.cheeks > 0.6 ? '#ff6b6b' : '#fff', { maxW: mw, stroke: 3 });
      end(this, g, w, h);
    },
  });
  G.newRound();
  return G;
}

// ================================================================ THE WAITER: SECRET ORDER
export const GESTURES = [{ icon: '😉', label: 'WINK' }, { icon: '🤫', label: 'SHH' }, { icon: '👉', label: 'POINT' }];
const DISHES = [{ icon: '🍔', name: 'BURGER', spawn: 'burger' }, { icon: '🍟', name: 'CHIPS', spawn: 'fries' }, { icon: '🍩', name: 'DOUGHNUT', spawn: 'doughnut' }];
export function signalGame(o) {
  const G = base('signals', o, { howto: ['📝 Copy Ben\'s code, one sign at a time', '👀 Only while her head\'s in the menu'],
    rounds: 3, idx: 0, wrong: 0, sus: 0, ordered: [], st: 'menu', stT: 2,
    buttons: GESTURES.map(gs => ({ icon: gs.icon, label: gs.label, col: '#ffd400' })),
    newRound() { const n = 2 + this.round + (this.lvl > 0.5 ? 1 : 0); this.code = Array.from({ length: n }, () => Math.floor(Math.random() * 3)); this.idx = 0; this.time = 9 + n; this.st = 'menu'; this.stT = rr(1.4, 2.2); },
    nextRound(got) {
      if (got) { const d = DISHES[this.round - 1]; this.ordered.push(d); bite(this, 10, 0.5, 0.6, d.icon); pop(this, `${d.name} ORDERED!`, '#39ff14', 0.5, 0.4, 1.2); sfx('ding', null, 0.7); this.sus = Math.min(1, this.sus + 0.35); say(this, this.S.visitor, R(['One "side salad". Got it. *wink*', 'Very good, sir. A... "salad".', 'Lovely. I\'ll tell chef it\'s for the lady.']), 0); }
      else { pop(this, 'TOO SLOW: BEN GAVE UP', '#ff9e9e', 0.5, 0.4); say(this, this.S.visitor, 'I\'ll come back to you, sir. Or not.', 0); }
      if (this.round >= this.rounds) { this.result = this.ordered.length ? { win: true, score: this.score, dishes: this.ordered.map(d => d.spawn), stars: this.ordered.length } : { win: false, soft: true, score: this.score }; return; }
      this.round++; this.newRound();
    },
    update(dt) {
      juice(this, dt); const S = this.S, c = S.chloe; this.time -= dt; this.stT -= dt; this.sus = Math.max(0, this.sus - dt * 0.05);
      const fast = 1 - 0.12 * (this.round - 1) - 0.15 * this.lvl;
      if (this.st === 'menu') { this.danger = 0.15; if (c) { c.dnPose = 'menu'; c.lookOverride = null; } if (this.stT <= 0) { this.st = 'tell'; this.stT = 0.6; S.tell(c); } }
      else if (this.st === 'tell') { this.danger = 0.7; if (this.stT <= 0) { this.st = 'up'; this.stT = rr(1.0, 1.5); if (this.sus > 0.6) { say(this, c, R(['What are you two whispering about?', 'Why is the waiter smiling at you, babe?', 'Ronnie, is something going on with your face?']), 0); } } }
      else { this.danger = 1; if (c) { c.dnPose = null; c.lookOverride = null; } if (this.stT <= 0) { this.st = 'menu'; this.stT = rr(1.2, 2.2) * fast; } }
      if (this.time <= 0) this.nextRound(false);
      for (const b of this.buttons) b.hot = this.st === 'menu';
      this.status = this.st === 'up' ? 'SHE\'S LOOKING. STAY STILL.' : this.st === 'tell' ? '!! SHE\'S LOOKING UP !!' : `DO BEN\'S CODE: ${DISHES[this.round - 1].name}`;
    },
    press(i) {
      const S = this.S, r = S.ron;
      if (this.st === 'up') { shake(this, 1.5); this.result = { win: false, reason: 'gesture', score: this.score }; return; }
      if (r) { r.dnPose = 'wink'; setTimeout(() => { if (r.dnPose === 'wink') r.dnPose = null; }, 450); }
      if (i === this.code[this.idx]) { this.idx++; pop(this, '✓', '#39ff14', 0.3 + this.idx * 0.08, 0.7); sfx('tap', null, 0.6); if (this.idx >= this.code.length) this.nextRound(true); return; }
      this.wrong++; this.idx = 0; shake(this, 0.8); sfx('error', null, 0.7); pop(this, 'WRONG! START AGAIN', '#ff6b6b');
      say(this, S.visitor, R(['Sorry? A wink? Sir, I\'m working.', 'Is that... chips? Or a nosebleed?', 'Start again, Ron. Slowly.', 'Are you having a stroke or ordering?']), 0);
      if (this.wrong >= 3) this.result = { win: false, reason: 'gesture', score: this.score };
    },
    draw(g, w, h) {
      begin(this, g, w, h, 'rgba(250,244,226,0.96)');
      const pad = Math.max(6, h * 0.06), fr = Math.min(h * 0.24, w * 0.09);
      drawChloe(g, pad + fr * 1.1, pad + fr * 1.15, fr, this.st === 'menu' ? 0.2 : 0, this.st === 'menu' ? 'busy' : this.sus > 0.6 ? 'sus' : 'happy');
      const mx = pad * 2 + fr * 2.3, mh = Math.max(14, Math.min(22, h * 0.15));
      meter(g, mx, pad, w - mx - pad, mh, this.danger, eyeCol(this.danger), this.st === 'up' ? 'LOOKING!' : 'IN THE MENU', '📖');
      txt(g, `${this.status}  ⏱${Math.max(0, Math.ceil(this.time))}`, mx + (w - mx - pad) / 2, pad * 2 + mh * 1.5, Math.min(14, mh * 0.75), this.st === 'menu' ? '#0a5a0a' : '#c0392b', { maxW: w - mx - pad });
      // Ben's pad: the code, written in biro
      const py = pad * 3 + mh * 2, ph = h - py - pad; if (ph < 18) { end(this, g, w, h); return; }
      g.fillStyle = '#fffbe8'; rr2(g, pad, py, w - pad * 2, ph, 8); g.fill(); g.strokeStyle = '#9fc3e8'; g.lineWidth = 1; for (let y = py + 10; y < py + ph; y += 10) { g.beginPath(); g.moveTo(pad + 4, y); g.lineTo(w - pad - 4, y); g.stroke(); }
      const n = this.code.length, bs = Math.min(ph * 0.8, (w - pad * 2 - 70) / n - 6), x0 = pad + 66;
      txt(g, DISHES[this.round - 1].icon, pad + 24, py + ph / 2, Math.min(22, ph * 0.5), '#111');
      for (let k = 0; k < n; k++) { const x = x0 + k * (bs + 6) + bs / 2, y = py + ph / 2;
        g.fillStyle = k < this.idx ? '#c8f7c0' : k === this.idx ? '#ffe680' : 'rgba(0,0,0,0.05)'; rr2(g, x - bs / 2, y - bs / 2, bs, bs, 6); g.fill();
        emo(g, GESTURES[this.code[k]].icon, x, y, bs * 0.7, k < this.idx ? 0.5 : 1); }
      end(this, g, w, h);
    },
  });
  G.newRound();
  return G;
}

// ================================================================ THE WAITER: THE DESSERT TROLLEY
const DESSERTS = [['🍰', 12], ['🍮', 10], ['🧁', 9], ['🍩', 10], ['🍨', 11], ['🥧', 13], ['🍫', 9]];
export function conveyorGame(o) {
  const G = base('trolley', o, { howto: ['🫳 GRAB a pudding when it\'s in the green box', '🍧 Not her sorbet. Still when she glances over'],
    rounds: 3, time: 16, lane: [], spawnT: 0.4, chewT: 0, st: 'busy', stT: rr(2.0, 2.8), stash: 0, stashV: 0, mutT: 2.5,
    buttons: [{ icon: '🫳', label: 'GRAB & EAT', sub: 'full points', col: '#ffd400' }, { icon: '🧻', label: 'STASH IT', sub: 'safer', col: '#9fe8ff' }],
    update(dt) {
      juice(this, dt); const S = this.S, c = S.chloe; this.time -= dt; this.stT -= dt; if (this.chewT > 0) this.chewT -= dt;
      const wave = this.time > 11 ? 1 : this.time > 5.5 ? 2 : 3; if (wave !== this.round) { this.round = wave; pop(this, wave === 3 ? 'LAST CALL: THE SPECIAL!' : 'WAVE 2: FASTER!', '#e879f9', 0.5, 0.45, 1.2); sfx('ding', null, 0.5); if (wave === 3) this.special = true; }
      const speed = 0.3 + wave * 0.06 + this.lvl * 0.06;
      if ((this.spawnT -= dt) <= 0) { this.spawnT = rr(0.55, 0.85) / (1 + (wave - 1) * 0.25); const r = Math.random();
        if (this.special) { this.special = false; this.lane.push({ x: -0.08, e: '⭐', d: ['🎂', 30], gold: true }); }
        else this.lane.push({ x: -0.08, e: r < 0.12 + wave * 0.03 ? (o.trap || '🍧') : r < 0.26 ? (o.veg || '🥗') : null, d: o.food ? R(o.food) : R(DESSERTS) }); }
      for (const it of this.lane) it.x += dt * speed;
      this.lane = this.lane.filter(it => it.x < 1.1 && !it.gone);
      if ((this.mutT -= dt) <= 0) { this.mutT = rr(2.6, 3.6); say(this, o.mutterWho || c, R(o.mutter || ['Is there dairy in the sorbet? What about nuts? Nut DUST?', 'Do you have anything that\'s just... air? With a mint?', 'Can I see the ingredients? All of them. Alphabetically.', 'Ben, does lemon count as a fruit or a feeling?']), 0); }
      if (this.st === 'busy') { this.danger = 0.15; if (c) c.lookOverride = 1.0; if (this.stT <= 0) { this.st = 'tell'; this.stT = 0.6 - wave * 0.05; S.tell(c); } }
      else if (this.st === 'tell') { this.danger = 0.7; if (c) c.lookOverride = 0.5; if (this.stT <= 0) { this.st = 'glance'; this.stT = 0.9; } }
      else { this.danger = 1; if (c) c.lookOverride = null; if (this.chewT > 0) { shake(this, 1.4); this.result = { win: false, reason: 'chewing', score: this.score }; return; } if (this.stT <= 0) { this.st = 'busy'; this.stT = rr(1.5, 2.6) * (1 - wave * 0.08); } }
      this.status = this.st === 'glance' ? 'SHE\'S GLANCING OVER!' : this.st === 'tell' ? '!! SHE\'S TURNING !!' : this.chewT > 0 ? 'CHEWING...' : o.goText || 'GRAB IN THE GREEN. NOT HER SORBET';
      const z = this.inZone(); for (const b of this.buttons) b.hot = !!z && !z.e && this.st === 'busy';
      if (this.time <= 0) { const v = Math.round(this.stashV * 0.7); if (v) { this.score += v; S.reward(v); pop(this, `NAPKIN FEAST +${v}`, '#9fe8ff', 0.5, 0.45, 1.3); } this.result = { win: true, score: this.score, stash: this.stash, stars: stars(this, 30, 60) }; }
    },
    inZone() { return this.lane.find(it => it.x > 0.4 && it.x < 0.6 && !it.gone) || null; },
    press(i) {
      const S = this.S, z = this.inZone(), r = S.ron;
      if (this.st === 'glance') { shake(this, 1.5); this.result = { win: false, reason: 'chewing', score: this.score }; return; }
      if (!z) { pop(this, 'MISSED', '#ccc', 0.5, 0.6); return; }
      z.gone = true;
      if (z.e === (o.trap || '🍧')) { shake(this, 1.5); this.result = { win: false, reason: o.trapReason || 'sorbet', score: this.score }; return; }
      if (z.e === (o.veg || '🥗')) { S.g.addChonk(-6); shake(this, 0.6); pop(this, 'FRUIT SALAD. BLEURGH -6', '#7cff6a'); sfx('error', null, 0.7); burst(this, 0.5, 0.6, ['🍓', '🍇', '🥝'], 8); return; }
      const v = z.gold ? z.d[1] : z.d[1];
      if (i === 0) { this.chewT = z.gold ? 0.9 : 0.65; bite(this, v, 0.5, 0.65, z.d[0]); sfx('chomp', null, 0.7); if (r) { r.dnPose = 'cram'; setTimeout(() => { if (r.dnPose === 'cram') r.dnPose = null; }, 600); } }
      else { this.stash++; this.stashV += v; pop(this, `STASHED ${z.d[0]}`, '#9fe8ff', 0.5, 0.6); sfx('tap', null, 0.6); burst(this, 0.5, 0.65, ['🧻'], 4); }
      if (z.gold) { shake(this, 0.6); pop(this, 'THE SPECIAL!', '#ffd400', 0.5, 0.35, 1.4); burst(this, 0.5, 0.6, ['⭐', '✦'], 14); }
    },
    draw(g, w, h) {
      begin(this, g, w, h);
      const pad = Math.max(6, h * 0.06), fr = Math.min(h * 0.22, w * 0.08), mh = Math.max(14, Math.min(22, h * 0.15));
      drawChloe(g, pad + fr * 1.1, pad + fr * 1.1, fr, this.st === 'busy' ? 0.9 : this.st === 'tell' ? 0.45 : 0, this.st === 'busy' ? 'busy' : 'sus');
      const mx = pad * 2 + fr * 2.3;
      meter(g, mx, pad, (w - mx - pad) * 0.62, mh, this.danger, eyeCol(this.danger), this.st === 'glance' ? 'GLANCING!' : o.busyText || 'ASKING BEN', '👀');
      txt(g, `🧻 ${this.stash}  ⏱ ${Math.max(0, Math.ceil(this.time))}`, mx + (w - mx - pad) * 0.82, pad + mh / 2, mh * 0.7, '#fff', { maxW: (w - mx - pad) * 0.36 });
      const ly = Math.max(pad * 2 + mh, pad + fr * 2.2), lh = h - ly - pad - 4; if (lh < 12) { end(this, g, w, h); return; }
      g.fillStyle = '#3a0a10'; rr2(g, pad, ly, w - pad * 2, lh, 8); g.fill();
      g.fillStyle = '#d4af37'; g.fillRect(pad, ly + lh - 4, w - pad * 2, 4);      // (the trolley's brass rail)
      const zx = pad + (w - pad * 2) * 0.4, zw = (w - pad * 2) * 0.2;
      g.fillStyle = 'rgba(57,255,20,0.25)'; g.fillRect(zx, ly, zw, lh); g.lineWidth = 3; g.strokeStyle = '#39ff14'; g.strokeRect(zx, ly + 1.5, zw, lh - 3);
      for (const it of this.lane) { const x = pad + (w - pad * 2) * it.x; if (x < pad - 10) continue; const s = Math.min(lh * 0.75, 44) * (it.gold ? 1.25 : 1);
        if (it.gold) { g.fillStyle = 'rgba(255,212,0,0.35)'; g.beginPath(); g.arc(x, ly + lh / 2, s * 0.6 + Math.sin(this.t * 10) * 3, 0, 7); g.fill(); }
        emo(g, it.e === '⭐' ? it.d[0] : it.e || it.d[0], x, ly + lh / 2, s); }
      end(this, g, w, h);
    },
  });
  return G;
}

// ================================================================ THE WAITER: THE NAPKIN TRICK
export function napkinGame(o) {
  const FOODS = [['🍔', 15, 1.4], ['🌭', 14, 1.1], ['🍩', 10, 0.8]];
  const G = base('napkin', o, { howto: ['✋ HOLD the button to hide (then eat) it', '👀 LET GO when she looks over'],
    rounds: 2, time: 24, k: 0, hidden: 0, bites: 0, eaten: 0, holding: false, st: 'busy', stT: rr(1.6, 2.4), lumpSaid: false,
    buttons: [{ icon: '🧻', label: 'HOLD TO HIDE', sub: 'let go when she looks', col: '#ffd400' }],
    update(dt) {
      juice(this, dt); const S = this.S, c = S.chloe; this.time -= dt; this.stT -= dt;
      const lump = (this.hidden - this.eaten) / 3;
      if (this.st === 'busy') { this.danger = 0.15; if (c) { c.dnPose = 'menu'; c.lookOverride = 0.6; } if (this.stT <= 0) { this.st = 'tell'; this.stT = 0.55 - lump * 0.15; S.tell(c); } }
      else if (this.st === 'tell') { this.danger = 0.7; if (c) c.lookOverride = 0.3; if (this.stT <= 0) { this.st = 'look'; this.stT = rr(0.9, 1.4); if (lump > 0.6 && !this.lumpSaid) { this.lumpSaid = true; say(this, c, 'Why has your napkin got a lump in it, babe?', 0); } } }
      else { this.danger = 1; if (c) { c.dnPose = null; c.lookOverride = null; } if (this.holding) { shake(this, 1.5); this.result = { win: false, reason: 'napkin', score: this.score }; return; } if (this.stT <= 0) { this.st = 'busy'; this.stT = rr(1.3, 2.4) * (1 - lump * 0.3); } }
      if (this.holding) {
        if (this.round === 1 && this.hidden < 3) { this.k += dt / FOODS[this.hidden][2]; if (this.k >= 1) { this.k = 0; this.hidden++; pop(this, 'HIDDEN!', '#9fe8ff', 0.2 + this.hidden * 0.2, 0.55); sfx('tap', null, 0.6); if (this.hidden >= 3) { this.round = 2; this.holding = false; pop(this, 'NOW EAT THEM. UNDER THE NAPKIN', '#e879f9', 0.5, 0.4, 1.2); sfx('ding', null, 0.5); } } }
        else if (this.round === 2 && this.eaten < 3) { this.k += dt / 0.75; if (this.k >= 1) { this.k = 0; this.bites++; const f = FOODS[this.eaten]; bite(this, Math.round(f[1] / 2), 0.2 + (this.eaten + 1) * 0.2, 0.55, f[0]); sfx('chomp', null, 0.6); if (this.bites % 2 === 0) this.eaten++; } }
      }
      this.buttons[0] = { icon: this.round === 1 ? '🧻' : '😋', label: this.round === 1 ? 'HOLD TO HIDE' : 'HOLD TO EAT', sub: 'let go when she looks', col: '#ffd400', hot: this.st === 'busy' };
      this.status = this.st === 'look' ? 'SHE\'S LOOKING! LET GO!' : this.st === 'tell' ? '!! SHE\'S TURNING !!' : this.round === 1 ? 'HOLD TO SLIDE IT UNDER' : 'HOLD TO EAT IT UNDER THE NAPKIN';
      if (this.eaten >= 3 || this.time <= 0) this.result = { win: true, score: this.score, n: this.eaten, stars: this.eaten >= 3 ? 3 : this.eaten >= 1 ? 2 : 1 };
    },
    press() { this.holding = true; const r = this.S.ron; if (r) r.dnPose = this.round === 1 ? 'reach' : 'cram'; },
    release() { this.holding = false; const r = this.S.ron; if (r) r.dnPose = 'innocent'; },
    draw(g, w, h) {
      begin(this, g, w, h);
      const pad = Math.max(6, h * 0.06), fr = Math.min(h * 0.22, w * 0.08), mh = Math.max(14, Math.min(22, h * 0.15));
      drawChloe(g, pad + fr * 1.1, pad + fr * 1.1, fr, this.st === 'busy' ? 0.6 : this.st === 'tell' ? 0.3 : 0, this.st === 'busy' ? 'busy' : this.lumpSaid ? 'sus' : 'happy');
      const mx = pad * 2 + fr * 2.3;
      meter(g, mx, pad, (w - mx - pad) * 0.7, mh, this.danger, eyeCol(this.danger), this.st === 'look' ? 'LOOKING!' : 'WINE LIST', '🍷');
      txt(g, `⏱ ${Math.max(0, Math.ceil(this.time))}`, mx + (w - mx - pad) * 0.86, pad + mh / 2, mh * 0.75, '#fff');
      const ty = Math.max(pad * 2 + mh, pad + fr * 2.2), th = h - ty - pad - 4; if (th < 14) { end(this, g, w, h); return; }
      // the tablecloth, the napkin and what's under it
      g.fillStyle = '#f5f0e8'; rr2(g, pad, ty, w - pad * 2, th, 8); g.fill();
      const s = Math.min(th * 0.8, w / 6);
      FOODS.forEach((f, i) => { const x = w * (0.22 + i * 0.25), y = ty + th / 2;
        const under = i < this.hidden, gone = i < this.eaten, k = this.round === 1 && i === this.hidden ? this.k : 0;
        if (!gone) emo(g, f[0], x, y, s * 0.7, under ? 0.35 : 1);
        if (under || k > 0) { g.fillStyle = 'rgba(255,255,255,0.95)'; g.strokeStyle = '#c9c0b0'; g.lineWidth = 2; const nw = s * (under ? 1 : k); g.beginPath(); g.moveTo(x - s * 0.55, y - s * 0.45); g.lineTo(x - s * 0.55 + nw * 1.1, y - s * 0.5); g.lineTo(x - s * 0.55 + nw * 1.1, y + s * 0.45); g.lineTo(x - s * 0.55, y + s * 0.42); g.closePath(); g.fill(); g.stroke(); }
        if (gone) txt(g, '✓', x, y, s * 0.4, '#0a7a0a');
        if (this.round === 2 && i === this.eaten && this.k > 0) meter(g, x - s * 0.5, y + s * 0.5 - 6, s, 8, this.k, '#ffd400');
      });
      end(this, g, w, h);
    },
  });
  return G;
}

// ================================================================ THE LOO RAID
// pick a target: the game puts you there (S.travel), GRAB what's there while nobody's watching it (a diner, the chef,
// Lewis on the bar), and back to your seat before she's back. Grab while they're looking: "OI!", and the noise brings
// her back sooner. You don't know exactly when she's done: listen for the flush, then the hand dryer.
export const SPOTS = [
  { id: 'next', icon: '🍽️', label: 'NEXT TABLE', n: 3, chonk: 9, guard: 'the diners', gIcon: '👀', at: [-0.55, -0.1, -2.4], pos: [-0.4, 1.55, 0.2], look: [-1.5, 0.8, -1.0], food: [-1.5, -1.0], oi: ['Oi! That\'s my risotto!', 'Ronnie! That was my starter!', 'He\'s eaten my garnish. Who eats a GARNISH?'] },
  { id: 'trolley', icon: '🍰', label: 'THE TROLLEY', n: 4, chonk: 11, guard: 'Ben', gIcon: '🧑‍🍳', at: [3.2, -0.6, -2.4], pos: [2.6, 1.5, -0.5], look: [4.0, 0.9, -1.8], food: [4.0, -1.8], oi: ['Ronnie! The trolley is for PAYING customers!', 'Put the trifle DOWN, Ron.'] },
  { id: 'pass', icon: '🔥', label: 'THE PASS', n: 5, chonk: 13, guard: 'the chef', gIcon: '👨‍🍳', at: [0.6, -4.9, 3.0], pos: [1.2, 1.6, -4.0], look: [0, 1.0, -6.2], food: [0, -6.2], oi: ['SERVICE! ...WHO took table four\'s steak?!', 'Get OUT of my kitchen, you absolute walrus!'] },
  { id: 'bar', icon: '🍸', label: 'THE BAR', n: 4, chonk: 12, guard: 'the barman', gIcon: '🍺', at: [9.6, -1.6, -1.6], pos: [8.6, 1.7, -0.8], look: [11.0, 1.15, -2.6], food: [11.1, -2.5], oi: ['Those olives are for the MARTINIS, sir.', 'Sir, that\'s a garnish tray. Sir. SIR.'] },
  { id: 'cake', icon: '🎂', label: 'BIRTHDAY CAKE', n: 6, chonk: 15, guard: null, gIcon: '🎂', at: [-8.2, -1.0, 1.9], pos: [-7.5, 1.6, -0.8], look: [-9.1, 0.95, -1.9], food: [-9.1, -1.7], oi: [] },
];
export function raidGame(o) {
  const spots = [SPOTS[0], ...shuffle(SPOTS.slice(1)).slice(0, 2)].map(s => ({ ...s, left: s.n, oiN: 0, gLook: false, gT: rr(1, 2), closed: false, guard: o.noGuards ? null : s.guard }));
  const M = Object.assign({ flush: '🔊 *FLUSH*', dryer: '🔊 The hand dryer. She\'s nearly out!', f: '🔊 FLUSH!', d: '🔊 HAND DRYER!', h: '👠 HEELS! SHE\'S COMING', away: '🚽 IN THE LOO' }, o.msgs || {});
  const G = base('raid', o, { howto: ['🍽️ Pick a table. GRAB what\'s there', '🪑 BACK TO SEAT before she\'s back (listen!)'],
    total: o.total, where: null, st: 'seat', runT: 0, n: 0, flushed: false, dried: false, heels: false, early: !!o.early, earlyAt: rr(4.5, 6.5), spots,
    update(dt) {
      juice(this, dt); const S = this.S, left = this.total - this.t;
      if (this.early && !this.earlyDone && this.t > this.earlyAt) { this.earlyDone = true; this.total = Math.min(this.total, this.t + 3.4); S.live(null, '"Babe? I forgot my lipstick!" She\'s coming back!', 0); sfx('warn', null, 1); shake(this, 1); }
      if (!this.flushed && left < 5.2) { this.flushed = true; sfx(o.msgs ? 'warn' : 'flush', null, 1); S.live(null, M.flush, 0); pop(this, M.f, '#9fe8ff', 0.5, 0.4, 1.3); }
      if (!this.dried && left < 2.6) { this.dried = true; sfx(o.msgs ? 'warn' : 'dn_dryer', null, 1); S.live(null, M.dryer, 0); pop(this, M.d, '#ff9e9e', 0.5, 0.4, 1.3); shake(this, 0.6); }
      if (!this.heels && left < 1.0) { this.heels = true; sfx('warn', null, 0.8); }
      this.danger = left < 2.6 ? 1 : left < 5.2 ? 0.7 : 0.15;
      // the people watching each spot
      for (const s of this.spots) if (s.guard) { s.gT -= dt; if (s.gT <= 0) { s.gLook = !s.gLook; s.gT = s.gLook ? rr(0.8, 1.4) : rr(1.2, 2.2) * (1 - this.lvl * 0.25); } }
      if (this.st === 'going' || this.st === 'back') { this.runT -= dt; if (this.runT <= 0) { if (this.st === 'going') { this.st = 'at'; } else { this.st = 'seat'; this.where = null; } } }
      if (left <= 0) { this.result = this.st === 'seat' ? { win: true, score: this.score, n: this.n, stars: stars(this, 25, 55) } : { win: false, reason: 'seat', score: this.score }; return; }
      if (this.st === 'seat') { this.buttons = this.spots.map(s => ({ icon: s.icon, label: s.label, sub: s.closed ? 'CLOSED' : s.left ? `${s.left} left` : 'EMPTY', col: '#ffd400', off: !s.left || s.closed })); this.status = this.flushed ? 'STAY SAT. LOOK INNOCENT' : 'PICK A TARGET'; }
      else if (this.st === 'at') { const w = this.where; this.buttons = [{ icon: '🫳', label: 'GRAB', sub: w.guard ? (w.gLook ? `${w.guard} LOOKING!` : 'nobody looking') : `${w.left} left`, col: w.gLook ? '#ff9e9e' : '#ffd400', off: !w.left || w.closed, hot: !w.gLook && w.left > 0 }, { icon: '🪑', label: 'BACK TO SEAT', sub: '', col: '#9fe8ff', hot: this.flushed }]; this.status = w.gLook ? `${w.guard.toUpperCase()} IS WATCHING!` : 'GRAB IT. THEN GET BACK!'; }
      else { this.buttons = [{ icon: '💨', label: 'ON THE WAY...', sub: '', col: '#aaa', off: true }]; this.status = 'ON THE WAY...'; }
    },
    press(i) {
      const S = this.S;
      if (this.st === 'seat') { const s = this.spots[i]; if (!s || !s.left || s.closed) return; this.where = s; this.st = 'going'; this.runT = 0.9; S.travel(s); return; }
      if (this.st !== 'at') return;
      const w = this.where;
      if (i === 1) { this.st = 'back'; this.runT = 0.9; S.travel(null); return; }
      if (w.left <= 0 || w.closed) return;
      if (w.guard && w.gLook) { w.oiN++; shake(this, 1.2); sfx('error', null, 0.8); pop(this, 'OI!', '#ff3a3a', 0.5, 0.45, 1.5); this.total -= 1.5; S.live(null, `${w.guard[0].toUpperCase() + w.guard.slice(1)}: "${R(w.oi)}"`, 0); if (w.oiN >= 2) { w.closed = true; pop(this, 'SPOT CLOSED', '#ff3a3a', 0.5, 0.6); } return; }
      w.left--; this.n++; const p = S.eatNear(w.food[0], w.food[1], 1.6);
      bite(this, w.chonk, 0.5, 0.6, w.icon); sfx('chomp', null, 0.7); if (p) S.crumbsAt(p);
      if (w.id === 'next' && Math.random() < 0.5) S.diner(w.food, R(w.oi));
      if (w.id === 'cake' && w.left === 0) { pop(this, 'THE WHOLE CAKE!', '#ffd400', 0.5, 0.35, 1.4); burst(this, 0.5, 0.5, ['🎂', '🕯️', '✦'], 14); }
    },
    draw(g, w, h) {
      begin(this, g, w, h);
      const pad = Math.max(6, h * 0.06), mh = Math.max(14, Math.min(22, h * 0.15)), left = this.total - this.t;
      const lab = this.heels ? M.h : this.dried ? M.d : this.flushed ? M.f : M.away;
      meter(g, pad, pad, w - pad * 2, mh, this.flushed ? Math.min(1, 1 - left / 5.2) : 0.08, this.dried ? '#ff3a3a' : this.flushed ? '#ffb020' : '#39ff14', lab, '💄');
      // a little map of the room: your seat, the spots, where you are
      const my = pad * 2 + mh, mhh = h - my - pad - 14; if (mhh < 18) { end(this, g, w, h); return; }
      g.fillStyle = '#2a0a10'; rr2(g, pad, my, w - pad * 2, mhh, 8); g.fill();
      const X = (x) => pad + 10 + (x + 11) / 22 * (w - pad * 2 - 20), Y = (z) => my + 8 + (z + 7) / 10 * (mhh - 16);
      const seat = [X(0), Y(1.4)], here = this.where && (this.st === 'at') ? [X(this.where.at[0]), Y(this.where.at[1])] : seat;
      emo(g, '🪑', seat[0], seat[1], Math.min(20, mhh * 0.35));
      for (const s of this.spots) { const x = X(s.at[0]), y = Y(s.at[1]); emo(g, s.icon, x, y, Math.min(22, mhh * 0.38), s.closed || !s.left ? 0.35 : 1); if (s.guard && this.where === s && this.st === 'at') emo(g, s.gLook ? '👀' : '🙈', x + 14, y - 12, Math.min(16, mhh * 0.3)); }
      g.strokeStyle = '#ffd400'; g.lineWidth = 3; g.beginPath(); g.arc(here[0], here[1], Math.min(14, mhh * 0.25) + Math.sin(this.t * 8) * 2, 0, 7); g.stroke();
      txt(g, `RAIDED ${this.n}`, pad + 8, h - pad - 6, Math.min(12, h * 0.09), '#ffd400', { align: 'left' });
      end(this, g, w, h);
    },
  });
  G.update(0);
  return G;
}

// ================================================================ HARRY'S DATING DISASTERS
// each story: the setup, the punchline, then she turns to you for a reaction. LAUGH at the funny ones, AWW at the sad
// ones, and not with your mouth full. Cram while she's listening.
const TALES = [
  ['So there was this girl from Basildon. Three dates. Lovely.', 'Turned out she was my cousin\'s ex. AND my other cousin\'s ex.', 'lol', '👪'],
  ['Took a girl to Nando\'s. She ordered extra hot.', 'I ordered lemon and herb. She left. Fair, honestly.', 'lol', '🌶️'],
  ['One date, she brought her mum.', 'Her MUM, Chloe. Her mum liked me more. We still text.', 'lol', '👵'],
  ['I got ghosted once.', 'By someone I hadn\'t even messaged yet.', 'sad', '👻'],
  ['Went to the cinema. Fell asleep in the trailers.', 'Woke up, she\'d gone. And so had my popcorn.', 'sad', '🍿'],
  ['Matched with someone, typed "hey"...', '...she unmatched me MID-"hey".', 'sad', '📱'],
  ['My longest relationship was eleven days.', 'Twelve if you count the day she was telling everyone.', 'sad', '📅'],
  ['Speed dating in Southend. Twenty girls.', 'Every single one asked if I knew Ronnie.', 'lol', '⏱️'],
  ['She said she was 5\'8".', 'She was 5\'8" in heels. On a step. In a photo.', 'lol', '👠'],
  ['I wrote her a poem.', 'She said it was "a lot". It was one line. It was "hey".', 'sad', '📝'],
];
export function reactGame(o) {
  const tales = shuffle((o.tales || TALES).slice()).slice(0, o.n || 4);
  const G = base('react', o, { howto: ['🍗 CRAM while she\'s listening', '😂 LAUGH or 🥺 AWW when she turns to you'],
    rounds: tales.length, i: -1, st: 'setup', stT: 0, sus: 0, last: -9, want: null, icon: '💘', reactMax: 1.6,
    buttons: [{ icon: '🍗', label: 'CRAM', sub: 'while she listens', col: '#ffd400' }, { icon: '😂', label: 'LAUGH', sub: 'funny ones', col: '#9fe8ff' }, { icon: '🥺', label: 'AWW', sub: 'sad ones', col: '#ffb3d9' }],
    next() { this.i++; this.round = this.i + 1; if (this.i >= tales.length) { this.result = { win: true, score: this.score, stars: this.sus === 0 ? 3 : 2 }; return; }
      const [a, , tone, icon] = tales[this.i]; this.want = tone; this.icon = icon; this.st = 'setup'; this.stT = Math.min(3.6, 1.6 + a.length * 0.04); this.reactMax = Math.max(1.0, 1.7 - this.i * 0.18 - this.lvl * 0.2); this.S.live(o.h, a, 0); },
    update(dt) {
      juice(this, dt); const S = this.S, c = S.chloe; this.stT -= dt;
      if (this.i < 0) { this.next(); return; }
      if (this.st === 'setup') { this.danger = 0.2; if (c) c.lookOverride = 1.0; if (this.stT <= 0) { this.st = 'punch'; const p = tales[this.i][1]; this.stT = Math.min(3.4, 1.4 + p.length * 0.04); S.live(o.h, p, 0); } }
      else if (this.st === 'punch') { this.danger = 0.25; if (c) c.lookOverride = 1.0; if (this.stT <= 0) { this.st = 'turn'; this.stT = 0.5; S.tell(c); } }
      else if (this.st === 'turn') { this.danger = 0.75; if (c) c.lookOverride = 0.45; if (this.stT <= 0) { this.st = 'react'; this.stT = this.reactMax; if (this.t - this.last < 0.3) { shake(this, 1.5); this.result = { win: false, reason: 'react', score: this.score }; return; } S.live(c, this.want === 'lol' ? R(['Isn\'t that FUNNY, babe?', 'Babe. BABE. Did you hear that?']) : R(['Aww. Isn\'t that sad, babe?', 'Oh Harry. Babe, isn\'t that awful?']), 0); } }
      else if (this.st === 'react') { this.danger = 1; if (c) c.lookOverride = null; if (this.stT <= 0) this.miss('...Ronnie? Are you even LISTENING?'); }
      else if (this.st === 'after') { this.danger = 0.3; if (this.stT <= 0) this.next(); }
      this.status = this.st === 'react' ? 'REACT! FUNNY OR SAD?' : this.st === 'turn' ? '!! SHE\'S TURNING TO YOU !!' : 'CRAM WHILE SHE LISTENS';
      this.buttons[0].hot = this.st === 'setup' || this.st === 'punch'; this.buttons[1].hot = this.buttons[2].hot = this.st === 'react';
    },
    miss(line) { this.sus++; shake(this, 0.9); sfx('error', null, 0.7); pop(this, this.sus >= 2 ? 'SHE\'S ONTO YOU' : 'WRONG REACTION', '#ff6b6b'); this.S.live(this.S.chloe, line, 0); if (this.sus >= 2) { this.result = { win: false, reason: 'react', score: this.score }; return; } this.st = 'after'; this.stT = 1.4; },
    press(i) {
      const S = this.S, r = S.ron;
      if (i === 0) { if (this.st === 'react' || this.st === 'after') { shake(this, 1.5); this.result = { win: false, reason: 'react', score: this.score }; return; } if (this.st === 'turn') { this.last = this.t; return; } this.last = this.t; bite(this, 6, 0.2, 0.62, '🍗'); sfx('chomp', null, 0.6); if (r) { r.dnPose = 'cram'; setTimeout(() => { if (r.dnPose === 'cram') r.dnPose = null; }, 450); } return; }
      if (this.st !== 'react') return;
      const ok = (i === 1 && this.want === 'lol') || (i === 2 && this.want === 'sad');
      if (r) { r.dnPose = i === 1 ? 'laugh' : 'innocent'; setTimeout(() => { if (r.dnPose !== 'cram') r.dnPose = null; }, 1100); }
      if (ok) { const fast = this.stT / this.reactMax; const v = fast > 0.6 ? 8 : 5; this.score += v; S.reward(v); pop(this, fast > 0.6 ? `PERFECT ${i === 1 ? '😂' : '🥺'} +${v}` : `NICE +${v}`, '#39ff14', 0.5, 0.45, 1.2); sfx('ding', null, 0.7);
        S.live(o.h, i === 1 ? R(o.thanksLol || ['See? Ronnie gets it!', 'Thank you, Ron. THANK you.']) : R(o.thanksSad || ['Cheers Ron. It still hurts.', 'Exactly, Ron. Exactly.']), 0); this.st = 'after'; this.stT = 1.4; }
      else this.miss(this.want === 'sad' ? 'Why are you LAUGHING? That\'s so sad.' : 'Aww? It was a JOKE, babe.');
    },
    draw(g, w, h) {
      begin(this, g, w, h);
      const pad = Math.max(6, h * 0.06), fr = Math.min(h * 0.22, w * 0.08), mh = Math.max(14, Math.min(22, h * 0.15));
      const lk = this.st === 'react' || this.st === 'after' ? 0 : this.st === 'turn' ? 0.45 : 1;
      drawChloe(g, pad + fr * 1.1, pad + fr * 1.1, fr, lk, this.st === 'react' ? 'happy' : this.sus ? 'sus' : 'busy');
      const mx = pad * 2 + fr * 2.3;
      meter(g, mx, pad, (w - mx - pad) * 0.66, mh, this.danger, eyeCol(this.danger), this.st === 'react' ? 'REACT!' : o.listen || 'LISTENING TO HARRY', o.icon || '💘');
      txt(g, '💔'.repeat(this.sus) + '🤍'.repeat(Math.max(0, 2 - this.sus)), mx + (w - mx - pad) * 0.85, pad + mh / 2, mh * 0.8, '#fff');
      const by = Math.max(pad * 2 + mh, pad + fr * 2.2), bh = h - by - pad - 16; if (bh < 14) { end(this, g, w, h); return; }
      // Harry's story, as a picture, and the reaction clock
      g.fillStyle = '#fff'; rr2(g, mx, by, w - mx - pad, bh, 10); g.fill();
      emo(g, this.icon, mx + bh * 0.55, by + bh / 2, Math.min(bh * 0.75, 40));
      txt(g, this.st === 'react' ? (this.want === 'lol' ? 'THAT ONE WAS FUNNY 😂' : 'THAT ONE WAS SAD 🥺') : `STORY ${Math.max(1, this.i + 1)} OF ${tales.length}`, mx + bh + (w - mx - pad - bh) / 2, by + bh / 2, Math.min(16, bh * 0.4), o.ink || '#7A1F3D', { maxW: w - mx - pad - bh - 10 });
      if (this.st === 'react') { const k = Math.max(0, this.stT / this.reactMax); g.strokeStyle = k > 0.4 ? '#39ff14' : '#ff3a3a'; g.lineWidth = 4; g.beginPath(); g.arc(pad + fr * 1.1, by + bh / 2, Math.min(fr, bh / 2 - 2), -Math.PI / 2, -Math.PI / 2 + k * 6.283); g.stroke(); }
      end(this, g, w, h);
    },
  });
  return G;
}

// ================================================================ OLIVER'S SHAME CAM
// three bits of his video: the intro (a slow pan), the Q&A (the shot jumps about: watch where it's going), the zoom
// (the shot gets wider and tighter). EAT out of shot; PHOTOBOMB in it for followers. Eat in shot: it's evidence.
export function viewfinderGame(o) {
  const SEG = ['INTRO', 'Q&A', 'THE ZOOM'];
  const G = base('viewfinder', o, { howto: ['🍔 EAT only when you\'re OUT of his shot', '📸 PHOTOBOMB when you\'re in it'],
    rounds: 3, x: 0.15, v: 0.42, half: 0.17, turnT: 1.2, bombs: 0, followers: 1200, lastBomb: -9, segT: 4.5, jumpT: 1.4, target: null, reframe: 0,
    buttons: [{ icon: '🍔', label: 'EAT', sub: 'out of shot', col: '#ffd400' }, { icon: '📸', label: 'PHOTOBOMB', sub: 'in shot', col: '#9fe8ff' }],
    inShot() { return Math.abs(this.x - 0.5) < this.half; },
    update(dt) {
      juice(this, dt); const S = this.S; this.segT -= dt;
      if (this.segT <= 0) { if (this.round >= 3) { this.result = { win: true, score: this.score, bombs: this.bombs, followers: this.followers, stars: stars(this, 25, 50) }; return; } this.round++; this.segT = 4.5; pop(this, SEG[this.round - 1] + '!', '#e879f9', 0.5, 0.45, 1.3); sfx('ding', null, 0.5);
        say(this, S.visitor, this.round === 2 ? 'Q&A time! Chloe, what\'s Ronnie\'s worst habit? Apart from that.' : 'And ZOOM in for the romance. Smash that like button!', 0); }
      if (this.round === 1) { this.x += this.v * dt; if (this.x < 0.08 || this.x > 0.92) { this.v = -this.v; this.x = Math.max(0.08, Math.min(0.92, this.x)); } }
      else if (this.round === 2) {
        if (this.target == null) { this.jumpT -= dt; this.x += Math.sin(this.t * 2) * 0.05 * dt; if (this.jumpT <= 0) { this.target = Math.random() < 0.45 ? 0.5 + rr(-0.05, 0.05) : R([rr(0.08, 0.25), rr(0.75, 0.92)]); this.reframe = 0.5; } }
        else if (this.reframe > 0) { this.reframe -= dt; }
        else { this.x = lerp(this.x, this.target, Math.min(1, dt * 9)); if (Math.abs(this.x - this.target) < 0.01) { this.target = null; this.jumpT = rr(0.9, 1.5) * (1 - this.lvl * 0.3); } }
      } else { this.half = 0.16 + (Math.sin(this.t * 2.4) + 1) * 0.12; this.x += this.v * 0.6 * dt; if (this.x < 0.2 || this.x > 0.8) { this.v = -this.v; this.x = Math.max(0.2, Math.min(0.8, this.x)); } }
      const near = Math.abs(this.x - 0.5) - this.half; this.danger = near < 0 ? 1 : near < 0.1 || this.reframe > 0 ? 0.7 : 0.2;
      this.status = this.inShot() ? '📹 YOU\'RE IN SHOT!' : this.reframe > 0 ? 'HE\'S REFRAMING...' : 'EAT WHEN YOU\'RE OUT OF SHOT';
      this.buttons[0].hot = !this.inShot() && this.reframe <= 0; this.buttons[1].hot = this.inShot();
    },
    press(i) {
      const S = this.S, r = S.ron;
      if (i === 0) { if (this.inShot()) { shake(this, 1.5); this.result = { win: false, reason: 'filmed', score: this.score }; return; } bite(this, 7, 0.2, 0.6, '🍔'); sfx('chomp', null, 0.6); if (r) { r.dnPose = 'cram'; setTimeout(() => { if (r.dnPose === 'cram') r.dnPose = null; }, 450); } return; }
      if (this.inShot() && this.t - this.lastBomb > 0.7) { this.lastBomb = this.t; this.bombs++; const k = 1000 * this.bombs * this.round; this.followers += k; this.score += 4; S.reward(4); pop(this, `+${(k / 1000).toFixed(0)}K FOLLOWERS`, '#9fe8ff', 0.5, 0.45, 1.2); burst(this, 0.5, 0.5, ['❤️', '👍', '🔥'], 10); sfx('shutter', null, 0.7);
        if (r) { r.dnPose = 'cheer'; setTimeout(() => { if (r.dnPose === 'cheer') r.dnPose = null; }, 700); }
        if (this.bombs === 2) say(this, S.visitor, 'The comments LOVE you, Ronnie! "Who is this king?"', 0); }
    },
    draw(g, w, h) {
      begin(this, g, w, h, 'rgba(8,10,16,0.92)');
      const pad = Math.max(6, h * 0.06), ly = pad, lh = h - pad * 2 - 14, lw = w - pad * 2;
      g.fillStyle = '#1d2230'; rr2(g, pad, ly, lw, lh, 8); g.fill();
      // the scene he's filming: Chloe posing, Ronnie in the middle, the table
      g.fillStyle = '#f5f0e8'; g.fillRect(pad + lw * 0.25, ly + lh * 0.72, lw * 0.5, lh * 0.2);
      drawChloe(g, pad + lw * 0.2, ly + lh * 0.45, Math.min(lh * 0.26, lw * 0.07), 0.6, 'happy');
      drawRon(g, pad + lw * 0.5, ly + lh * 0.45, Math.min(lh * 0.3, lw * 0.08), 0, this.inShot() ? 'innocent' : 'smug');
      if (this.target != null && this.reframe > 0) { const tx = pad + lw * (this.target - this.half); g.setLineDash([6, 5]); g.strokeStyle = '#ffd400'; g.lineWidth = 2; rr2(g, tx, ly + 5, lw * this.half * 2, lh - 10, 6); g.stroke(); g.setLineDash([]); }
      const fx = pad + lw * (this.x - this.half), fw = lw * this.half * 2;
      g.lineWidth = 3; g.strokeStyle = this.inShot() ? '#ff3a3a' : '#fff'; rr2(g, fx, ly + 3, fw, lh - 6, 6); g.stroke();
      g.fillStyle = this.inShot() ? 'rgba(255,58,58,0.16)' : 'rgba(255,255,255,0.06)'; rr2(g, fx, ly + 3, fw, lh - 6, 6); g.fill();
      if (Math.sin(this.t * 8) > -0.3) { g.fillStyle = '#ff2a2a'; g.beginPath(); g.arc(fx + 12, ly + 14, 5, 0, 7); g.fill(); } txt(g, 'REC', fx + 32, ly + 14, 11, '#fff');
      txt(g, `${SEG[this.round - 1]} · 👥 ${(this.followers / 1000).toFixed(1)}K`, pad + 8, h - 10, Math.min(12, h * 0.09), '#9fe8ff', { align: 'left' });
      end(this, g, w, h);
    },
  });
  return G;
}

// ================================================================ AIDAN AND CONNOR'S PINTS (find the Guinness)
export function shellGame(o) {
  const G = base('shell', o, { howto: ['👀 Watch the Guinness (the dark one)', '👆 Pick its glass when they stop'],
    rounds: 3, phase: 'show', pos: [0, 1, 2], kinds: ['G', 'W', 'V'], swaps: [], si: 0, swT: 0, phT: 0, pints: 0, bluff: -1, bluffT: 0, pickT: 4, lastPick: null,
    buttons: [{ icon: '⬅️', label: 'LEFT', col: '#ffd400', off: true }, { icon: '⬆️', label: 'MIDDLE', col: '#ffd400', off: true }, { icon: '➡️', label: 'RIGHT', col: '#ffd400', off: true }],
    newRound() { const n = 3 + this.round * 2 + Math.round(this.lvl * 2); this.swaps = []; for (let i = 0; i < n; i++) { const a = Math.floor(Math.random() * 3); this.swaps.push([a, (a + 1 + Math.floor(Math.random() * 2)) % 3]); }
      this.si = 0; this.swT = 0; this.phase = 'show'; this.phT = 0; this.pickT = 4 - this.round * 0.5; this.bluffAt = this.round === 3 ? Math.floor(n / 2) : -1; this.lastPick = null; },
    update(dt) {
      juice(this, dt); const S = this.S; this.phT += dt; if (this.bluffT > 0) this.bluffT -= dt;
      if (this.phase === 'show') { this.status = 'WATCH THE GUINNESS'; if (this.phT > 1.6) { this.phase = 'shuffle'; this.status = 'KEEP YOUR EYE ON IT...'; } }
      else if (this.phase === 'shuffle') {
        const dur = Math.max(0.22, 0.62 - this.si * 0.03 - this.round * 0.08 - this.lvl * 0.08); this.swT += dt / dur;
        if (this.swT >= 1) { const [a, b] = this.swaps[this.si]; const ia = this.pos.indexOf(a), ib = this.pos.indexOf(b); this.pos[ia] = b; this.pos[ib] = a; this.si++; this.swT = 0; sfx('glass', null, 0.4);
          if (this.si === this.bluffAt) { this.bluff = 1; this.bluffT = 0.5; say(this, S.extraVisitor || S.visitor, 'Ooh, is it THIS one, Ron? *lifts the water*', 0); }
          if (this.si >= this.swaps.length) { this.phase = 'pick'; this.phT = 0; this.status = 'WHICH ONE\'S THE GUINNESS?'; } }
      } else if (this.phase === 'pick') { if (this.phT > this.pickT) this.done(null); }
      else if (this.phase === 'reveal') { if (this.phT > 1.5) { if (this.round >= this.rounds) { this.result = this.pints ? { win: true, score: this.score, pints: this.pints, stars: this.pints } : { win: false, soft: true, water: true, score: this.score }; return; } this.round++; this.newRound(); pop(this, `ROUND ${this.round}: FASTER`, '#e879f9', 0.5, 0.3, 1.2); } }
      this.danger = this.phase === 'pick' ? 0.6 : 0.3;
      for (const b of this.buttons) { b.off = this.phase !== 'pick'; b.hot = this.phase === 'pick'; }
    },
    done(k) {
      const S = this.S; this.lastPick = k; this.phase = 'reveal'; this.phT = 0;
      if (k === 'G') { this.pints++; bite(this, 15, 0.5, 0.45, '🍺'); sfx('gulp', null, 0.8); pop(this, 'SPLIT THE G!', '#39ff14', 0.5, 0.3, 1.4); say(this, S.visitor, R(['He didn\'t even let it SETTLE!', 'That\'s a lovely pint. That WAS a lovely pint.', 'Our grandad would weep, Ron.']), 0); }
      else if (k === 'W') { pop(this, 'IT\'S WATER. LEWIS\'S WATER', '#9fe8ff', 0.5, 0.3); sfx('error', null, 0.6); say(this, S.visitor, 'Hydration, Ron! Lewis would be proud.', 0); }
      else if (k === 'V') { shake(this, 1.5); this.result = { win: false, reason: 'wine', score: this.score }; }
      else { pop(this, 'TOO SLOW', '#ccc', 0.5, 0.3); }
    },
    press(i) { if (this.phase !== 'pick') return; this.done(this.kinds[this.pos[i]]); },
    slot(j) { const p = this.pos.indexOf(j); if (this.phase === 'shuffle' && this.si < this.swaps.length) { const [a, b] = this.swaps[this.si], k = ease(this.swT); if (p === this.pos.indexOf(a)) return [lerp(p, this.pos.indexOf(b), k), Math.sin(k * Math.PI)]; if (p === this.pos.indexOf(b)) return [lerp(p, this.pos.indexOf(a), k), -Math.sin(k * Math.PI)]; } return [p, 0]; },
    draw(g, w, h) {
      begin(this, g, w, h, 'rgba(40,24,12,0.94)');
      const pad = Math.max(6, h * 0.06), gs = Math.min(h * 0.55, w / 4.4);
      txt(g, this.status + (this.phase === 'pick' ? `  ⏱ ${Math.max(0, Math.ceil(this.pickT - this.phT))}` : ''), w / 2, pad + 9, Math.min(15, h * 0.12), '#ffd400', { maxW: w - 20 });
      txt(g, '🍺'.repeat(this.pints) || '·', pad + 8, pad + 9, Math.min(14, h * 0.11), '#fff', { align: 'left' });
      g.fillStyle = '#5a3a22'; g.fillRect(pad, h * 0.62 + gs * 0.42, w - pad * 2, 6);      // (the bar top)
      for (let j = 0; j < 3; j++) {
        const [s, lift] = this.slot(j), x = w / 2 + (s - 1) * (w / 3.4), y = h * 0.62 - lift * h * 0.1 - (this.bluff === j && this.bluffT > 0 ? h * 0.12 : 0);
        const show = this.phase === 'show' || this.phase === 'reveal' || this.result, kind = this.kinds[j], fake = this.bluffT > 0 && j === 1;
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(x - gs * 0.32, y - gs * 0.45); g.lineTo(x + gs * 0.32, y - gs * 0.45); g.lineTo(x + gs * 0.24, y + gs * 0.42); g.lineTo(x - gs * 0.24, y + gs * 0.42); g.closePath(); g.fill();
        g.fillStyle = show || fake ? (kind === 'G' || fake ? '#1a0d05' : kind === 'V' ? '#f4a0b0' : '#bfe3f0') : '#7a6a5a';
        g.beginPath(); g.moveTo(x - gs * 0.3, y - gs * 0.32); g.lineTo(x + gs * 0.3, y - gs * 0.32); g.lineTo(x + gs * 0.23, y + gs * 0.4); g.lineTo(x - gs * 0.23, y + gs * 0.4); g.closePath(); g.fill();
        if ((show || fake) && (kind === 'G' || fake)) { g.fillStyle = '#f4ead0'; g.fillRect(x - gs * 0.3, y - gs * 0.4, gs * 0.6, gs * 0.1); }
        if (!show && !fake) txt(g, '?', x, y, gs * 0.4, '#fff', { stroke: 4 });
        g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.moveTo(x - gs * 0.32, y - gs * 0.45); g.lineTo(x - gs * 0.24, y + gs * 0.42); g.lineTo(x + gs * 0.24, y + gs * 0.42); g.lineTo(x + gs * 0.32, y - gs * 0.45); g.stroke();
      }
      end(this, g, w, h);
    },
  });
  G.newRound();
  return G;
}

// ================================================================ DYLAN'S WONDERWALL
// the verse (slow), the chorus (fast, golden chicken), THIS ONE'S FOR RONNIE (the whole room turns to you: freeze), the
// big finish (everything at once). Grab food at the three nearest tables; two broccoli and you gag. Loudly.
export function whackGame(o) {
  const PARTS = o.parts || [['THE VERSE', 4.0], ['THE CHORUS', 4.5], ['FOR RONNIE!', 1.8, true], ['THE BIG FINISH', 3.5]];
  const FOOD = o.food || ['🍕', '🍔', '🌭', '🍟', '🥐', '🧆'], BAD = o.bad || '🥦', ICON = o.icon || '🎸';
  const G = base('whack', o, { howto: [o.goHow || '👆 Tap the food when it pops up', o.freezeHow || '😳 FREEZE when he points at you'],
    rounds: PARTS.length, part: 0, partT: PARTS[0][1], slots: [null, null, null], spawnT: 0.4, veg: 0, dark: !!o.dark,
    buttons: [0, 1, 2].map(() => ({ icon: '·', label: 'EMPTY', col: '#777', off: true })),
    get spot() { return !!(PARTS[Math.min(this.part, PARTS.length - 1)] || [])[2]; },
    update(dt) {
      juice(this, dt); const S = this.S; this.partT -= dt;
      if (this.partT <= 0) { const was = this.spot; this.part++; this.round = Math.min(PARTS.length, this.part + 1);
        if (this.part >= PARTS.length) { S.spotlight(false); this.result = { win: true, score: this.score, stars: stars(this, 40, 80) }; return; }
        this.partT = PARTS[this.part][1]; pop(this, PARTS[this.part][0], '#e879f9', 0.5, 0.4, 1.3);
        const line = (o.lines || {})[this.part];
        if (this.spot) { this.slots = [null, null, null]; S.tell(S.chloe); sfx(o.freezeSfx || 'crowd_ooh', null, 0.8); say(this, o.who || S.visitor, line || 'THIS ONE\'S FOR RONNIE! Everybody look at RONNIE!', 0); S.spotlight(true); }
        else { if (was) S.spotlight(false); if (line) say(this, o.who || S.visitor, line, 0); if (was && !o.dark) sfx('cheer', null, 0.7); } }
      for (let i = 0; i < 3; i++) { const s = this.slots[i]; if (s && (s.t -= dt) <= 0) this.slots[i] = null; }
      if (!this.spot && (this.spawnT -= dt) <= 0) {
        const fast = (PARTS[this.part][3] || [1, 0.65, 1, 0.45][this.part] || 0.6) * (1 - this.lvl * 0.2); this.spawnT = rr(0.45, 0.75) * fast;
        const free = [0, 1, 2].filter(i => !this.slots[i]);
        if (free.length) { const i = R(free), r = Math.random(), bad = r < 0.22 + this.part * 0.03, gold = !bad && this.part >= 1 && r > 0.85;
          this.slots[i] = { e: bad ? BAD : gold ? (o.gold || '🍗') : R(FOOD), bad, gold, t: rr(0.7, 1.05) * (this.part === PARTS.length - 1 ? 0.8 : 1), c: gold ? 18 : R([7, 8, 9, 10]) }; } }
      this.buttons = this.slots.map((s, i) => this.spot ? { icon: '😳', label: 'FREEZE!', sub: ['LEFT', 'MIDDLE', 'RIGHT'][i], col: '#ff9e9e', off: false } : s ? { icon: s.e, label: s.bad ? (o.badLabel || 'BROCCOLI!') : s.gold ? 'GOLDEN!' : 'GRAB!', sub: ['LEFT', 'MIDDLE', 'RIGHT'][i], col: s.bad ? '#7cff6a' : s.gold ? '#ffb020' : '#ffd400', hot: !s.bad } : { icon: '·', label: 'EMPTY', sub: ['LEFT', 'MIDDLE', 'RIGHT'][i], col: '#777', off: true });
      this.danger = this.spot ? 1 : 0.2; this.status = this.spot ? (o.freezeText || 'EVERYONE\'S LOOKING AT YOU! FREEZE!') : (o.goText || 'GRAB THE FOOD. NOT THE BROCCOLI');
    },
    press(i) {
      const S = this.S;
      if (this.spot) { shake(this, 1.5); this.result = { win: false, reason: o.freezeReason || 'spotlight', score: this.score }; return; }
      const s = this.slots[i]; if (!s) return; this.slots[i] = null;
      if (s.bad) { this.veg++; S.g.addChonk(-5); shake(this, 1); sfx('error', null, 0.8); pop(this, 'BLEURGH!', '#7cff6a', 0.2 + i * 0.3, 0.55, 1.3); burst(this, 0.2 + i * 0.3, 0.6, [BAD, '💚'], 8); if (this.veg >= 2) this.result = { win: false, reason: o.badReason || 'gag', score: this.score }; return; }
      bite(this, s.c, 0.2 + i * 0.3, 0.6, s.e); sfx('chomp', null, 0.6); if (s.gold) { pop(this, 'GOLDEN!', '#ffb020', 0.5, 0.35, 1.3); shake(this, 0.4); }
      const r = S.ron; if (r) { r.dnPose = 'cram'; setTimeout(() => { if (r.dnPose === 'cram') r.dnPose = null; }, 400); }
    },
    draw(g, w, h) {
      const pi = Math.min(this.part, PARTS.length - 1);
      begin(this, g, w, h, this.spot ? 'rgba(60,40,0,0.92)' : this.dark ? 'rgba(4,4,8,0.96)' : 'rgba(20,6,12,0.86)');
      const pad = Math.max(6, h * 0.06), mh = Math.max(14, Math.min(22, h * 0.15)), k = Math.max(0, this.partT / PARTS[pi][1]);
      meter(g, pad, pad, w - pad * 2, mh, k, this.spot ? '#ffd400' : '#e879f9', o.dark ? PARTS[pi][0] : `♪ ${PARTS[pi][0]} ♪`, ICON);
      const sy = pad * 2 + mh, sh = h - sy - pad - 16; if (sh < 14) { end(this, g, w, h); return; }
      // the three tables (what's up on each)
      for (let i = 0; i < 3; i++) { const x = w * (0.2 + i * 0.3), y = sy + sh / 2, s = this.slots[i], rad = Math.min(sh * 0.45, w * 0.12);
        g.fillStyle = '#f5f0e8'; g.beginPath(); g.ellipse(x, y + rad * 0.3, rad, rad * 0.45, 0, 0, 7); g.fill();
        if (s && !this.spot) { const up = Math.min(1, (1.05 - s.t) * 6); emo(g, s.e, x, y + rad * 0.2 - up * rad * 0.35, rad * 0.9, this.dark ? 0.55 : 1); } }
      if (this.dark && !this.spot) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, sy, w, sh); }
      if (this.spot) { g.fillStyle = 'rgba(255,240,150,0.25)'; g.beginPath(); g.moveTo(w / 2 - 20, 0); g.lineTo(w / 2 + 20, 0); g.lineTo(w / 2 + w * 0.3, h); g.lineTo(w / 2 - w * 0.3, h); g.closePath(); g.fill(); drawRon(g, w / 2, sy + sh / 2, Math.min(sh * 0.4, 30), 0, 'shock'); }
      txt(g, `${BAD} ${this.veg}/2`, pad + 8, h - 10, Math.min(12, h * 0.09), this.veg ? '#7cff6a' : '#fff', { align: 'left' });
      end(this, g, w, h);
    },
  });
  return G;
}

// ================================================================ ETHAN'S FREE KICK (a bread roll into your mouth)
// kick 1: a straight shot. Kick 2: Noah's the wall (it moves; don't kick into it). Kick 3: the Panenka (tiny green, fast).
// The wind wobbles the needle. Miss twice and the second one hits Chloe.
export function kickGame(o) {
  const G = base('kick', o, { howto: ['⚽ KICK when the needle\'s in the green', '🧍 Three kicks. Mind the wall'],
    rounds: 3, a: -0.8, v: 1.6, kicks: 0, n: 0, miss: 0, zone: 0.24, cool: 0.6, wallA: 0, wallV: 0.7, flash: '', flashT: 0, ball: null,
    buttons: [{ icon: '⚽', label: 'KICK!', sub: 'in the green', col: '#ffd400' }],
    get wall() { return this.kicks === 1; },
    blocked() { return this.wall && Math.abs(this.a - this.wallA) < 0.16; },
    update(dt) {
      juice(this, dt); this.cool -= dt; this.flashT -= dt; this.round = Math.min(3, this.kicks + 1);
      const wob = 1 + Math.sin(this.t * 3.1) * 0.35 * (this.kicks + this.lvl);
      this.a += this.v * wob * dt; if (this.a > 1) { this.a = 1; this.v = -this.v; } if (this.a < -1) { this.a = -1; this.v = -this.v; }
      if (this.wall) { this.wallA += this.wallV * dt; if (Math.abs(this.wallA) > 0.5) { this.wallV = -this.wallV; this.wallA = Math.sign(this.wallA) * 0.5; } }
      if (this.ball) { this.ball.t += dt; if (this.ball.t > 0.6) this.ball = null; }
      this.buttons[0].hot = Math.abs(this.a) < this.zone && !this.blocked(); this.buttons[0].off = this.cool > 0 || this.kicks >= 3;
      this.buttons[0].label = ['KICK!', 'OVER THE WALL!', 'PANENKA!'][Math.min(2, this.kicks)];
      this.danger = this.miss ? 0.7 : 0.2; this.status = this.wall ? 'NOAH\'S THE WALL. MIND HIM' : this.kicks === 2 ? 'THE PANENKA. TINY GREEN' : 'KICK IN THE GREEN';
      if (this.kicks >= 3 && this.cool <= 0) this.result = this.n ? { win: true, n: this.n, score: this.score, stars: this.n } : { win: false, reason: 'roll', score: this.score };
    },
    press() {
      if (this.cool > 0 || this.kicks >= 3) return; const S = this.S; this.kicks++; this.cool = 1.1; sfx('thwack', null, 0.6);
      const blocked = this.kicks === 2 && Math.abs(this.a - this.wallA) < 0.16;
      if (!blocked && Math.abs(this.a) < this.zone) { this.n++; const perfect = Math.abs(this.a) < this.zone * 0.4, c = perfect ? 16 : 10; this.ball = { a: this.a, t: 0, ok: true };
        bite(this, c, 0.5, 0.35, '🥖'); this.flash = perfect ? 'TOP BINS!' : 'IN!'; sfx('ding', null, 0.8); burst(this, 0.5, 0.3, ['🥖', '✦', '⚽'], 10);
        say(this, S.visitor, perfect ? R(['ROBERTO CARLOS! IN THE MOUTH!', 'TOP BINS! HALA MADRID!']) : R(['In! Ugly, but in.', 'He\'s caught it! With his FACE!']), 0);
        const r = S.ron; if (r) { r.dnPose = 'chew'; setTimeout(() => { if (r.dnPose === 'chew') r.dnPose = null; }, 800); } }
      else { this.miss++; this.ball = { a: this.a, t: 0, ok: false }; shake(this, 1); this.flash = blocked ? 'OFF NOAH\'S HEAD!' : this.miss >= 2 ? 'IT HIT CHLOE!' : 'WIDE!'; sfx('error', null, 0.7);
        if (blocked) say(this, S.g.cast.find(c => c.id === 'noah') || S.visitor, 'Good hit! I\'m just trying to help!', 0);
        if (this.miss >= 2) { this.result = { win: false, reason: 'roll', score: this.score }; return; } }
      this.flashT = 0.9; this.zone *= 0.75; this.v = Math.sign(this.v) * (1.6 + this.kicks * 0.55);
    },
    draw(g, w, h) {
      begin(this, g, w, h, 'rgba(10,40,20,0.9)');
      const cx = w / 2, cy = h * 0.95, R0 = Math.min(h * 0.75, w * 0.4);
      g.lineWidth = Math.max(10, R0 * 0.16); g.lineCap = 'butt';
      g.strokeStyle = '#ff5a5a'; g.beginPath(); g.arc(cx, cy, R0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
      g.strokeStyle = '#39ff14'; const z = this.zone * Math.PI * 0.42; g.beginPath(); g.arc(cx, cy, R0, Math.PI * 1.5 - z, Math.PI * 1.5 + z); g.stroke();
      if (this.wall) { const wa = Math.PI * 1.5 + this.wallA * Math.PI * 0.42; g.strokeStyle = '#c62828'; g.lineWidth = Math.max(14, R0 * 0.22); g.beginPath(); g.arc(cx, cy, R0, wa - 0.16 * Math.PI * 0.42, wa + 0.16 * Math.PI * 0.42); g.stroke(); emo(g, '🧍', cx + Math.cos(wa) * R0, cy + Math.sin(wa) * R0, Math.min(26, h * 0.2)); }
      const an = Math.PI * 1.5 + this.a * Math.PI * 0.42; g.lineWidth = 4; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(an) * R0 * 1.1, cy + Math.sin(an) * R0 * 1.1); g.stroke();
      if (this.ball) { const k = this.ball.t / 0.6, ba = Math.PI * 1.5 + this.ball.a * Math.PI * 0.42, d = R0 * (1.1 - k * 0.8); emo(g, '🥖', cx + Math.cos(ba) * d, cy + Math.sin(ba) * d - Math.sin(k * Math.PI) * h * 0.2, Math.min(28, h * 0.22)); }
      else emo(g, '🥖', cx + Math.cos(an) * R0 * 1.1, cy + Math.sin(an) * R0 * 1.1, Math.min(26, h * 0.2));
      txt(g, `⚽ ${this.kicks}/3   ✓ ${this.n}   ✗ ${this.miss}/2`, 10, 16, Math.min(13, h * 0.11), '#fff', { align: 'left' });
      if (this.flashT > 0) txt(g, this.flash, cx, h * 0.42, Math.min(26, h * 0.2), /IN|TOP/.test(this.flash) ? '#39ff14' : '#ff6b6b', { stroke: 4 });
      end(this, g, w, h);
    },
  });
  return G;
}

// ================================================================ LEWIS'S ARM WRESTLE (new)
// "Arm wrestle, bro! Loser pays!" Chloe's refereeing, watching the hands. WRESTLE to push his arm over (he gets
// stronger, it's the protein); SNEAK a bite with your other hand (you stop pushing while you do). She looks up at your
// face now and then: not with food in it. Win the wrestle for a big bonus; lose it and you're paying.
export function wrestleGame(o) {
  const G = base('wrestle', o, { howto: ['💪 Mash to push his arm over', '🍗 SNEAK a bite, but not when she looks up'],
    rounds: 3, bar: 0, time: 15, st: 'hands', stT: rr(1.8, 2.6), sneakT: 0, won: false, lost: false, pushT: 0,
    buttons: [{ icon: o.pushIcon || '💪', label: o.pushLabel || 'WRESTLE', sub: 'mash it', col: '#ffd400' }, { icon: '🍗', label: 'SNEAK A BITE', sub: 'other hand', col: '#9fe8ff' }],
    update(dt) {
      juice(this, dt); const S = this.S, c = S.chloe; this.time -= dt; this.stT -= dt; if (this.sneakT > 0) this.sneakT -= dt; if (this.pushT > 0) this.pushT -= dt;
      this.round = this.time > 10 ? 1 : this.time > 5 ? 2 : 3;
      const lewis = (0.12 + this.round * 0.06 + this.lvl * 0.06) * (this.sneakT > 0 ? 2 : 1);
      this.bar -= lewis * dt;
      if (this.st === 'hands') { this.danger = 0.2; if (c) { c.lookOverride = 0.6; c.dnPose = 'point'; } if (this.stT <= 0) { this.st = 'tell'; this.stT = 0.55; S.tell(c); } }
      else if (this.st === 'tell') { this.danger = 0.7; if (this.stT <= 0) { this.st = 'face'; this.stT = rr(0.8, 1.2); if (c) { c.lookOverride = null; c.dnPose = null; } } }
      else { this.danger = 1; if (this.sneakT > 0) { shake(this, 1.5); this.result = { win: false, reason: 'wrestle', score: this.score }; return; } if (this.stT <= 0) { this.st = 'hands'; this.stT = rr(1.5, 2.5); } }
      if (this.bar >= 1 && !this.won) { this.won = true; this.score += 20; S.reward(20); pop(this, (o.winText || 'YOU WIN THE WRESTLE!') + ' +20', '#39ff14', 0.5, 0.4, 1.4); burst(this, 0.5, 0.5, ['💪', '✦'], 14); shake(this, 1); sfx('cheer', null, 0.7); say(this, S.visitor, o.foeLoses || 'Bro... BRO. How? I had a shake for breakfast. And lunch.', 0); }
      if (this.bar <= -1 && !this.lost) { this.lost = true; pop(this, o.loseText || 'LEWIS WINS. YOU\'RE PAYING', '#ff9e9e', 0.5, 0.4, 1.2); sfx('error', null, 0.7); say(this, S.visitor, o.foeWins || 'PROTEIN, bro. Gains. Look at that. LOOK at it.', 0); }
      if (this.won || this.lost || this.time <= 0) { this.result = { win: true, score: this.score, wrestle: this.won ? 'won' : this.lost ? 'lost' : 'draw', stars: (this.won ? 2 : 0) + (this.hits >= 3 ? 1 : 0) }; return; }
      this.bar = Math.max(-1, Math.min(1, this.bar));
      this.buttons[0].hot = this.bar < 0; this.buttons[1].hot = this.st === 'hands' && this.bar > -0.4; this.buttons[1].off = this.sneakT > 0;
      this.status = this.st === 'face' ? 'SHE\'S LOOKING AT YOUR FACE!' : this.st === 'tell' ? '!! SHE\'S LOOKING UP !!' : 'PUSH! AND SNEAK A BITE';
    },
    press(i) {
      const S = this.S;
      if (i === 0) { this.bar += 0.085; this.pushT = 0.15; if (Math.random() < 0.3) sfx('grunt', null, 0.4); if (this.bar > 0.5 && Math.random() < 0.08) say(this, S.visitor, R(o.strain || ['Bro, your forearm\'s like a gammon!', 'This is my GOOD arm, bro!', 'Chloe, he\'s using his belly for leverage!']), 2.5); return; }
      if (this.sneakT > 0) return;
      if (this.st === 'face') { shake(this, 1.5); this.result = { win: false, reason: 'wrestle', score: this.score }; return; }
      this.sneakT = 0.55; bite(this, 7, 0.75, 0.6, '🍗'); sfx('chomp', null, 0.6); const r = S.ron; if (r) { r.dnPose = 'cram'; setTimeout(() => { if (r.dnPose === 'cram') r.dnPose = null; }, 500); }
    },
    draw(g, w, h) {
      begin(this, g, w, h);
      const pad = Math.max(6, h * 0.06), mh = Math.max(14, Math.min(22, h * 0.15)), fr = Math.min(h * 0.22, w * 0.08);
      drawChloe(g, pad + fr * 1.1, pad + fr * 1.1, fr, this.st === 'hands' ? 0.6 : this.st === 'tell' ? 0.3 : 0, this.st === 'face' ? 'sus' : 'busy');
      const mx = pad * 2 + fr * 2.3;
      meter(g, mx, pad, (w - mx - pad) * 0.66, mh, this.danger, eyeCol(this.danger), this.st === 'face' ? 'AT YOUR FACE!' : 'WATCHING HANDS', '👀');
      txt(g, `⏱ ${Math.max(0, Math.ceil(this.time))}`, mx + (w - mx - pad) * 0.85, pad + mh / 2, mh * 0.75, '#fff');
      const by = Math.max(pad * 2 + mh, pad + fr * 2.2) + 4, bh = Math.min(26, h - by - pad - 18); if (bh < 8) { end(this, g, w, h); return; }
      // the tug: you on the left, Lewis on the right; the arms meet at the marker
      const bx = pad + 30, bw = w - pad * 2 - 60, mid = bx + bw / 2 + this.bar * bw / 2;
      g.fillStyle = '#E8303A'; rr2(g, bx, by, bw, bh, bh / 2); g.fill(); g.fillStyle = '#ffd400'; rr2(g, bx, by, mid - bx, bh, bh / 2); g.fill();
      emo(g, '🧔', bx - 16, by + bh / 2, 24); emo(g, o.foeIcon || '💪', bx + bw + 16, by + bh / 2, 24);
      emo(g, o.midIcon || '✊', mid, by + bh / 2 + (this.pushT > 0 ? -3 : 0), bh * 1.4);
      end(this, g, w, h);
    },
  });
  return G;
}

// ================================================================ THE BIRTHDAY SONG (new restaurant event)
// the lights go down for someone's birthday cake. Everyone sings. In the dark, eat ON THE BEAT (🍰), SING when she's
// singing at you (🎤), and FREEZE when the candles light up the room (🕯). Wrong thing on the beat: she notices.
export function birthdayGame(o) {
  // four lines of six beats: eat, sing, rest, candle
  const L = [['e', 's', 'e', 's', 'e', '-'], ['e', 'e', 's', 'e', 's', '-'], ['c', 'c', 's', 'c', 'c', 's'], ['e', 's', 'e', 'e', 's', 'e']];
  const BEAT = 0.62 - (o.lvl || 0) * 0.08, beats = []; L.forEach((line, li) => line.forEach((k, bi) => beats.push({ k, t: 1.2 + (li * 6 + bi) * BEAT, done: false, li })));
  const G = base('birthday', o, { howto: ['🍰 EAT on a cake beat, 🎤 SING on a mic beat', '🕯️ FREEZE when the candles light up'],
    rounds: 4, beats, beat: BEAT, sus: 0, lastBeat: -1,
    buttons: [{ icon: '🍰', label: 'EAT', sub: 'on a 🍰 beat', col: '#ffd400' }, { icon: '🎤', label: 'SING', sub: 'on a 🎤 beat', col: '#9fe8ff' }],
    near() { let b = null, d = 0.2; for (const x of this.beats) { if (x.done || x.k === '-') continue; const dd = Math.abs(x.t - this.t); if (dd < d) { d = dd; b = x; } } return b; },
    update(dt) {
      juice(this, dt); const S = this.S, c = S.chloe;
      const cur = this.beats.find(b => Math.abs(b.t - this.t) < this.beat / 2); this.round = cur ? cur.li + 1 : this.round;
      if (cur && cur.k === 'c') { this.danger = 1; if (c) c.lookOverride = null; } else { this.danger = 0.3; if (c) c.lookOverride = 0.8; }
      // missed sing beats: she noticed you didn't sing
      for (const b of this.beats) if (!b.done && this.t - b.t > 0.22) { b.done = true; if (b.k === 's') { this.sus++; pop(this, 'SHE SAW YOU NOT SINGING', '#ff9e9e', 0.5, 0.35); shake(this, 0.6); if (this.sus >= 3) { this.result = { win: false, reason: 'sing', score: this.score }; return; } } }
      if (this.lastBeat < 0 || Math.floor((this.t - 1.2) / this.beat) !== this.lastBeat) { this.lastBeat = Math.floor((this.t - 1.2) / this.beat); if (this.t > 1.2 && this.t < this.beats[this.beats.length - 1].t + 0.1) sfx('tick', null, 0.25); }
      if (this.t > this.beats[this.beats.length - 1].t + 0.6) { this.result = { win: true, score: this.score, stars: this.sus === 0 ? 3 : this.sus === 1 ? 2 : 1 }; return; }
      const nb = this.near(); this.buttons[0].hot = !!nb && nb.k === 'e'; this.buttons[1].hot = !!nb && nb.k === 's';
      this.status = cur && cur.k === 'c' ? '🕯 CANDLES! FREEZE!' : ['HAPPY BIRTHDAY TO YOU', 'HAPPY BIRTHDAY TO YOU', 'HAPPY BIRTHDAY DEAR...', 'HAPPY BIRTHDAY TO YOU'][this.round - 1];
    },
    press(i) {
      const S = this.S, b = this.near(), r = S.ron;
      const cur = this.beats.find(x => Math.abs(x.t - this.t) < this.beat / 2);
      if (i === 0 && cur && cur.k === 'c') { shake(this, 1.5); this.result = { win: false, reason: 'candle', score: this.score }; return; }
      if (!b) { if (i === 0) { this.sus++; pop(this, 'OFF THE BEAT!', '#ff9e9e'); sfx('error', null, 0.5); if (this.sus >= 3) this.result = { win: false, reason: 'sing', score: this.score }; } return; }
      b.done = true;
      if (b.k === 'e' && i === 0) { bite(this, 7, 0.3, 0.55, '🍰'); sfx('chomp', null, 0.5); if (r) { r.dnPose = 'cram'; setTimeout(() => { if (r.dnPose === 'cram') r.dnPose = null; }, 300); } return; }
      if (b.k === 's' && i === 1) { this.score += 3; S.reward(3); pop(this, '♪ +3', '#9fe8ff', 0.7, 0.55); if (r) { r.dnPose = 'cheer'; setTimeout(() => { if (r.dnPose === 'cheer') r.dnPose = null; }, 300); } return; }
      if (b.k === 's' && i === 0) { shake(this, 1.5); this.result = { win: false, reason: 'sing', score: this.score }; return; }
      if (b.k === 'c') { if (i === 1) { this.sus++; pop(this, 'SINGING IN THE QUIET BIT', '#ff9e9e'); } return; }
      this.sus++; pop(this, 'WRONG BEAT', '#ff9e9e'); if (this.sus >= 3) this.result = { win: false, reason: 'sing', score: this.score };
    },
    draw(g, w, h) {
      begin(this, g, w, h, 'rgba(6,4,14,0.94)');
      const pad = Math.max(6, h * 0.06), cur = this.beats.find(b => Math.abs(b.t - this.t) < this.beat / 2), candle = cur && cur.k === 'c';
      if (candle) { g.fillStyle = 'rgba(255,190,80,0.28)'; rr2(g, 0, 0, w, h, 14); g.fill(); }
      txt(g, '♪ ' + this.status + ' ♪', w / 2, pad + 10, Math.min(15, h * 0.12), candle ? '#ffd400' : '#e879f9', { maxW: w - 20 });
      // the beats coming in from the right to the line
      const ly = pad + 24, lh = h - ly - pad - 16, hx = w * 0.22; if (lh < 14) { end(this, g, w, h); return; }
      g.fillStyle = 'rgba(255,255,255,0.08)'; rr2(g, pad, ly, w - pad * 2, lh, 8); g.fill();
      g.strokeStyle = '#ffd400'; g.lineWidth = 3; g.beginPath(); g.moveTo(hx, ly + 2); g.lineTo(hx, ly + lh - 2); g.stroke();
      for (const b of this.beats) { if (b.k === '-') continue; const x = hx + (b.t - this.t) * w * 0.42; if (x < pad - 10 || x > w - pad + 10) continue; emo(g, b.k === 'e' ? '🍰' : b.k === 's' ? '🎤' : '🕯️', x, ly + lh / 2, Math.min(lh * 0.7, 34), b.done ? 0.25 : 1); }
      txt(g, '💔'.repeat(this.sus) + '🤍'.repeat(Math.max(0, 3 - this.sus)), pad + 8, h - 10, Math.min(12, h * 0.09), '#fff', { align: 'left' });
      end(this, g, w, h);
    },
  });
  return G;
}

// ================================================================ BUSTED: PICK YOUR EXCUSE
// three excuses; the right one for how she caught you softens the penalty, a terrible one makes it worse
export const EXCUSES = [
  { id: 'sweet', icon: '🍬', label: 'COUGH SWEET', line: 'It\'s a cough sweet, babe. A big one. Medicated.', fits: ['hamster', 'mid', 'chewing', 'chilli'] },
  { id: 'waiter', icon: '🧑‍🍳', label: 'THE WAITER DID IT', line: 'The waiter dropped it. In my mouth. I couldn\'t be rude.', fits: ['gesture', 'sorbet', 'napkin', 'garnish'] },
  { id: 'mate', icon: '🤝', label: 'HOLDING IT FOR A MATE', line: 'I was holding it for Harry. In my mouth. For safety.', fits: ['react', 'wine', 'seat', 'fire'] },
  { id: 'gravy', icon: '🥄', label: 'IT\'S OLD GRAVY', line: 'That\'s gravy. On my chin. From Tuesday.', fits: ['table', 'red'] },
  { id: 'chester', icon: '🐶', label: 'IT WAS FOR CHESTER', line: 'I was saving it for Chester. In a doggy bag. My face is the bag.', fits: ['napkin', 'table', 'roll'] },
  { id: 'vlog', icon: '📹', label: 'IT\'S FOR THE VLOG', line: 'It\'s content, babe! Oliver says it\'s for the algorithm!', fits: ['filmed', 'spotlight'] },
  { id: 'rugby', icon: '🏉', label: 'CARB LOADING', line: 'Carb loading. Noah\'s got me on a rugby programme.', fits: ['wrestle', 'gag', 'candle', 'sing'] },
  { id: 'smell', icon: '👃', label: 'JUST SMELLING IT', line: 'I wasn\'t eating it, I was just smelling it. Very closely.', fits: ['red', 'mid', 'roll', 'flicker'] },
];
export function excuseGame(o) {
  const best = EXCUSES.filter(e => e.fits.includes(o.reason)), pickBest = best.length ? R(best) : R(EXCUSES);
  const others = shuffle(EXCUSES.filter(e => e !== pickBest)).slice(0, 2), list = shuffle([pickBest, ...others]);
  const G = base('excuse', o, { ready: 0.01,
    list, time: 5, buttons: list.map(e => ({ icon: e.icon, label: e.label, col: '#ffd400' })), danger: 0.8, status: 'QUICK! AN EXCUSE!',
    update(dt) { juice(this, dt); this.time -= dt; if (this.time <= 0) this.result = { win: false, soft: true, pick: null, fit: 'bad' }; for (const b of this.buttons) b.hot = true; },
    press(i) { const e = this.list[i]; this.result = { win: false, soft: true, pick: e, fit: e.fits.includes(o.reason) ? 'best' : Math.random() < 0.35 ? 'ok' : 'bad' }; },
    draw(g, w, h) {
      begin(this, g, w, h, 'rgba(60,8,14,0.94)');
      const pad = Math.max(6, h * 0.06), fr = Math.min(h * 0.3, w * 0.1);
      drawChloe(g, w * 0.25, h * 0.5, fr, 0, 'angry'); drawRon(g, w * 0.75, h * 0.5, fr, 0.4, 'shock');
      txt(g, 'QUICK! AN EXCUSE!', w / 2, pad + 10, Math.min(18, h * 0.14), '#ffd400', { stroke: 4, maxW: w - 20 });
      meter(g, w * 0.3, h - pad - 18, w * 0.4, 14, this.time / 5, '#ff3a3a', `${Math.max(0, Math.ceil(this.time))}`, null);
      end(this, g, w, h);
    },
  });
  return G;
}

// ================================================================ A CHOICE (what to order, how to pay)
// o: { title, options: [{ icon, label, sub, good }], time }: pick one before the clock runs out (the first one if you don't)
export function choiceGame(o) {
  const G = base('choice', o, { ready: 0.01,
    time: o.time || 7, buttons: o.options.map(x => ({ icon: x.icon, label: x.label, sub: x.sub, col: x.col || '#ffd400' })), danger: 0.3, status: o.title,
    update(dt) { juice(this, dt); this.time -= dt; for (const b of this.buttons) b.hot = true; if (this.time <= 0) this.result = { win: true, soft: false, pick: o.options[o.def || 0], i: o.def || 0, score: 0 }; },
    press(i) { const x = o.options[i]; pop(this, x.label + '!', '#ffd400', 0.5, 0.5, 1.2); burst(this, 0.5, 0.55, [x.icon, '✦'], 10); sfx('ding', null, 0.6); this.result = { win: true, pick: x, i, score: 0 }; },
    draw(g, w, h) {
      begin(this, g, w, h, 'rgba(26,5,8,0.94)');
      const pad = Math.max(6, h * 0.06), fr = Math.min(h * 0.26, w * 0.09);
      drawChloe(g, pad + fr * 1.1, h * 0.55, fr, 0, o.mood || 'sus'); drawRon(g, w - pad - fr * 1.1, h * 0.55, fr, 0, 'innocent');
      txt(g, o.title, w / 2, pad + 12, Math.min(18, h * 0.14), '#ffd400', { stroke: 4, maxW: w - fr * 4.6 });
      g.fillStyle = '#f5f0e6'; rr2(g, w * 0.3, pad + 28, w * 0.4, h - pad * 2 - 46, 8); g.fill();
      txt(g, o.card || 'MENU', w / 2, pad + 42, Math.min(13, h * 0.1), '#5a0f18');
      o.options.forEach((x, i) => emo(g, x.icon, w * 0.36 + i * w * 0.14, pad + 28 + (h - pad * 2 - 46) * 0.6, Math.min(26, h * 0.18)));
      meter(g, w * 0.3, h - pad - 14, w * 0.4, 12, this.time / (o.time || 7), '#e879f9', null, null);
      end(this, g, w, h);
    },
  });
  return G;
}

export const DN_GAMES = { choice: choiceGame, cram: cramGame, signals: signalGame, trolley: conveyorGame, napkin: napkinGame, raid: raidGame, react: reactGame, viewfinder: viewfinderGame, shell: shellGame, whack: whackGame, kick: kickGame, wrestle: wrestleGame, birthday: birthdayGame, excuse: excuseGame };
