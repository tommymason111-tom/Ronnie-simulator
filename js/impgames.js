// IMPOSTER: the task minigames (and the panel they're played on). Every game is drawn on one 512 x 512 canvas:
//   on a phone / computer it's a box in the middle of the screen you touch or click,
//   in VR it's a panel in front of you: point at it with your right controller and pull the trigger.
// The same panel is used for the meeting (voting) screen, so it has plain "buttons" too.
import * as THREE from 'three';
import { sfx } from './audio.js';

const S = 512, FONT = '"Arial Black", Arial, sans-serif';
const R = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
export function txt(g, s, x, y, size = 28, col = '#fff', align = 'center', maxW = 470) {
  g.textAlign = align; g.textBaseline = 'middle'; let f = size; do { g.font = `900 ${f}px ${FONT}`; f -= 2; } while (g.measureText(s).width > maxW && f > 10);
  // (dark writing is on a light card: no black outline round it, it only smudges it)
  const m = /^#([0-9a-f]{6})$/i.exec(col), lum = m ? (() => { const v = parseInt(m[1], 16); return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255; })() : 1;
  if (lum > 0.4) { g.lineWidth = Math.max(3, f / 5); g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineJoin = 'round'; g.strokeText(s, x, y); } g.fillStyle = col; g.fillText(s, x, y);
}
const frame = (g, title, col = '#ffd400') => {
  const bg = g.createLinearGradient(0, 0, 0, S); bg.addColorStop(0, '#1d2340'); bg.addColorStop(1, '#0c0f1e'); g.fillStyle = bg; rr(g, 4, 4, S - 8, S - 8, 30); g.fill();
  g.lineWidth = 8; g.strokeStyle = col; rr(g, 4, 4, S - 8, S - 8, 30); g.stroke();
  txt(g, title, S / 2, 38, 30, col);
};
const inside = (x, y, b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
const btn = (g, b, label, col = '#2a6df4', size = 26, on = true) => { g.fillStyle = on ? col : '#3a3f55'; rr(g, b.x, b.y, b.w, b.h, 16); g.fill(); g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,0.6)'; rr(g, b.x, b.y, b.w, b.h, 16); g.stroke(); txt(g, label, b.x + b.w / 2, b.y + b.h / 2 + 1, size, '#fff', 'center', b.w - 12); };

// ------------------------------------------------------------------ the games
// each returns { title, hint, draw(g, t), down(x, y), move(x, y), up(x, y), update(dt), done }
const GAMES = {
  // GUINNESS: hold to pour, let go between the lines (two-part pour), then let it settle
  hold() {
    const s = { title: 'POUR A PERFECT GUINNESS', hint: 'HOLD TO POUR · LET GO BETWEEN THE LINES', fill: 0, pouring: false, settle: 0, fail: 0, done: false };
    s.down = () => { if (s.settle > 0 || s.done) return; s.pouring = true; };
    s.up = () => { if (!s.pouring) return; s.pouring = false; if (s.fill >= 0.84 && s.fill <= 0.95) { s.settle = 0.001; sfx('ding', null, 0.6); } else if (s.fill > 0.1) { s.fail = 1.2; sfx('splat', null, 0.6); } };
    s.update = (dt) => { if (s.pouring) { s.fill += dt * 0.32; if ((s.pourT = (s.pourT || 0) - dt) <= 0) { s.pourT = 0.18; sfx('pour', null, 0.15); } if (s.fill > 1.02) { s.pouring = false; s.fail = 1.2; sfx('splat', null, 0.7); } }
      if (s.fail > 0) { s.fail -= dt; if (s.fail <= 0) s.fill = 0; } if (s.settle > 0) { s.settle += dt / 2.2; if (s.settle >= 1) { s.done = true; } } };
    s.draw = (g, t) => { frame(g, s.title);
      const x0 = 176, x1 = 336, top = 110, bot = 440, fy = bot - (bot - top) * Math.min(1, s.fill);
      // the glass (tulip pint), the stout in it (surging brown, settling to black), the creamy head, the lines
      g.save(); g.beginPath(); g.moveTo(x0 - 10, top); g.lineTo(x1 + 10, top); g.quadraticCurveTo(x1 + 18, top + 160, x1 - 14, bot); g.lineTo(x0 + 14, bot); g.quadraticCurveTo(x0 - 18, top + 160, x0 - 10, top); g.closePath(); g.clip();
      g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, 0, S, S);
      const k = s.settle > 0 ? s.settle : 0, br = Math.round(110 - 95 * k), body = `rgb(${br},${Math.round(br * 0.6)},${Math.round(br * 0.35)})`;
      g.fillStyle = body; g.fillRect(0, fy, S, bot - fy);
      if (s.fill > 0.02) { g.fillStyle = '#f3e6c8'; g.fillRect(0, fy - 4, S, 18 + (s.settle > 0 ? 6 : 0)); }
      if (!s.settle) for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(240,220,190,0.25)'; g.beginPath(); g.arc(x0 + ((i * 53 + t * 140) % 160), bot - ((i * 37 + t * 90) % Math.max(1, bot - fy)), 3, 0, 7); g.fill(); }
      g.restore();
      g.lineWidth = 5; g.strokeStyle = '#d8e4ff'; g.beginPath(); g.moveTo(x0 - 10, top); g.quadraticCurveTo(x0 - 18, top + 160, x0 + 14, bot); g.lineTo(x1 - 14, bot); g.quadraticCurveTo(x1 + 18, top + 160, x1 + 10, top); g.stroke();
      const ly = (f) => bot - (bot - top) * f; g.setLineDash([10, 8]); g.strokeStyle = '#39ff14'; g.lineWidth = 4; for (const f of [0.84, 0.95]) { g.beginPath(); g.moveTo(x0 - 40, ly(f)); g.lineTo(x1 + 40, ly(f)); g.stroke(); } g.setLineDash([]);
      // the tap
      g.fillStyle = '#222'; rr(g, 228, 52, 56, 34, 8); g.fill(); txt(g, 'G', 256, 70, 22, '#d4af37');
      if (s.pouring) { g.fillStyle = 'rgba(110,66,38,0.9)'; g.fillRect(250, 86, 12, fy - 86); }
      txt(g, s.fail > 0 ? 'SPILT IT! AGAIN...' : s.settle > 0 ? 'LET IT SETTLE...' : s.hint, S / 2, 478, 22, s.fail > 0 ? '#ff6b6b' : '#fff');
    };
    return s;
  },
  // CRANK: turn the wheel round (the barrel coupler / the keg valve)
  crank(o = {}) {
    const s = { title: o.title || 'CHANGE THE BARREL', hint: o.hint || 'DRAG ROUND IN CIRCLES', turned: 0, need: Math.PI * 2 * (o.turns || 3), last: null, down: (x, y) => { s.last = Math.atan2(y - 280, x - 256); }, done: false };
    s.move = (x, y) => { if (s.last === null) return; const a = Math.atan2(y - 280, x - 256); let d = a - s.last; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; if (d > 0) s.turned += d; s.last = a; if ((s.clk = (s.clk || 0) + Math.abs(d)) > 0.8) { s.clk = 0; sfx('tick', null, 0.3); } if (s.turned >= s.need) s.done = true; };
    s.up = () => { s.last = null; }; s.update = (dt) => { if (o.slip && s.last === null && s.turned > 0 && !s.done) s.turned = Math.max(0, s.turned - dt * 2.2); };
    s.draw = (g) => { frame(g, s.title); const k = Math.min(1, s.turned / s.need);
      g.save(); g.translate(256, 280); g.rotate(s.turned);
      g.lineWidth = 22; g.strokeStyle = '#c62828'; g.beginPath(); g.arc(0, 0, 130, 0, 7); g.stroke();
      for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.lineWidth = 14; g.strokeStyle = '#8e1c1c'; g.beginPath(); g.moveTo(0, 0); g.lineTo(130, 0); g.stroke(); }
      g.fillStyle = '#ddd'; g.beginPath(); g.arc(0, 0, 26, 0, 7); g.fill(); g.fillStyle = '#ffd400'; g.beginPath(); g.arc(130, 0, 20, 0, 7); g.fill(); g.restore();
      g.fillStyle = '#333'; rr(g, 56, 448, 400, 22, 11); g.fill(); g.fillStyle = '#39ff14'; rr(g, 56, 448, 400 * k, 22, 11); g.fill();
      txt(g, '↻ ' + s.hint + (o.slip ? ' · DON\'T STOP!' : ''), S / 2, 92, 22);
    };
    return s;
  },
  // SWIPE: the card through the reader at the right speed (the card machine / the staff clock)
  swipe(o = {}) {
    const s = { title: o.title || 'TAKE A CARD PAYMENT', hint: 'DRAG THE CARD ALL THE WAY ACROSS', x: 60, drag: false, t0: 0, msg: '', msgT: 0, done: false, ok: 0, good: 0, need: o.need || 1 };
    s.down = (x, y) => { if (y > 230 && y < 380 && x < s.x + 170) { s.drag = true; s.t0 = performance.now(); s.dx = x - s.x; } };
    s.move = (x) => { if (s.drag) s.x = Math.max(60, Math.min(330, x - s.dx)); };
    s.up = () => { if (!s.drag) return; s.drag = false; const dt = (performance.now() - s.t0) / 1000;
      if (s.x < 320) s.msg = 'SWIPE ALL THE WAY'; else if (dt < 0.55) s.msg = 'TOO FAST. TRY AGAIN.'; else if (dt > 1.15) s.msg = 'TOO SLOW. TRY AGAIN.'; else if (++s.good < s.need) { s.msg = 'READ OK. SWIPE AGAIN TO CONFIRM'; s.msgT = 1.4; s.x = 60; sfx('beep', null, 0.5); return; } else { s.msg = 'ACCEPTED ✓'; s.ok = 0.6; sfx('beep', null, 0.7); }
      if (!s.ok) s.good = 0;
      if (!s.ok) sfx('error', null, 0.4); s.msgT = 1.2; s.x = 60; };
    s.update = (dt) => { if (s.msgT > 0) s.msgT -= dt; if (s.ok > 0) { s.ok -= dt; if (s.ok <= 0) s.done = true; } };
    s.draw = (g) => { frame(g, s.title);
      g.fillStyle = '#2b2b2b'; rr(g, 40, 300, 432, 60, 12); g.fill(); g.fillStyle = '#111'; g.fillRect(40, 322, 432, 14);
      g.fillStyle = s.ok > 0 ? '#39ff14' : s.msgT > 0 ? '#ff4d4d' : '#ffb300'; g.beginPath(); g.arc(440, 270, 12, 0, 7); g.fill();
      g.fillStyle = '#1f6fd6'; rr(g, s.x, 236, 160, 100, 12); g.fill(); g.fillStyle = '#d4af37'; rr(g, s.x + 18, 262, 34, 26, 5); g.fill(); txt(g, 'OYSTERFLEET', s.x + 80, 312, 15);
      txt(g, s.msgT > 0 ? s.msg : s.hint, S / 2, 150, 24, s.msgT > 0 ? (s.ok > 0 || s.good ? '#39ff14' : '#ff6b6b') : '#fff'); if (s.need > 1) txt(g, `${s.good} / ${s.need}`, 440, 110, 22, '#ffd400'); txt(g, '→  →  →', S / 2, 410, 30, '#8aa4ff');
    };
    return s;
  },
  // WIRES: join each colour to the same colour (the jukebox)
  wires(o = {}) {
    const n = o.n || 4, cols = ['#ff3b3b', '#2f7bff', '#ffd400', '#e040fb', '#39ff14', '#ff8a00'].slice(0, n), right = shuffle([...Array(n).keys()]), gap = n > 4 ? 60 : 90;
    const s = { title: o.title || 'FIX THE JUKEBOX WIRING', joined: Array(n).fill(false), drag: null, px: 0, py: 0, done: false, _L: (i) => L(i), _R: (i) => Rt(i) };
    const L = (i) => ({ x: 70, y: 130 + i * gap }), Rt = (i) => ({ x: 442, y: 130 + right.indexOf(i) * gap });
    s.down = (x, y) => { for (let i = 0; i < n; i++) { const p = L(i); if (!s.joined[i] && Math.hypot(x - p.x, y - p.y) < 40) { s.drag = i; s.px = x; s.py = y; } } };
    s.move = (x, y) => { s.px = x; s.py = y; };
    s.up = (x, y) => { if (s.drag === null) return; const i = s.drag, p = Rt(i); if (Math.hypot(x - p.x, y - p.y) < (n > 4 ? 32 : 45)) { s.joined[i] = true; sfx('zap', null, 0.5); if (s.joined.every(Boolean)) s.done = true; } s.drag = null; };
    s.update = () => {};
    s.draw = (g) => { frame(g, s.title); txt(g, 'DRAG EACH WIRE TO ITS COLOUR', S / 2, 82, 20);
      for (let i = 0; i < n; i++) { const a = L(i), b = Rt(i); g.fillStyle = cols[i]; rr(g, a.x - 50, a.y - 16, 46, 32, 6); g.fill(); rr(g, b.x + 4, b.y - 16, 46, 32, 6); g.fill();
        if (s.joined[i]) { g.strokeStyle = cols[i]; g.lineWidth = 14; g.beginPath(); g.moveTo(a.x, a.y); g.bezierCurveTo(256, a.y, 256, b.y, b.x, b.y); g.stroke(); } }
      if (s.drag !== null) { const a = L(s.drag); g.strokeStyle = cols[s.drag]; g.lineWidth = 14; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(s.px, s.py); g.stroke(); }
    };
    return s;
  },
  // COLLECT: tap every one of them (coins out of the fruit machine, empties off the tables, loo rolls on the holders)
  collect(o = {}) {
    const n = o.n || 8, s = { title: o.title || 'EMPTY THE FRUIT MACHINE', icon: o.icon || '🪙', into: o.into || '💰', bits: [], done: false };
    for (let i = 0; i < n; i++) s.bits.push({ x: 70 + Math.random() * 372, y: 110 + Math.random() * 250, got: 0, r: (Math.random() - 0.5) * 0.8 });
    s.down = (x, y) => { for (const b of s.bits) if (!b.got && Math.hypot(x - b.x, y - b.y) < 40) { b.got = 0.001; sfx('pickup', null, 0.4); return; } };
    s.move = () => {}; s.up = () => {};
    s.update = (dt) => { for (const b of s.bits) if (b.got > 0 && b.got < 1) b.got = Math.min(1, b.got + dt * 3); if (s.bits.every(b => b.got >= 1)) s.done = true; };
    s.draw = (g) => { frame(g, s.title); txt(g, o.hint || 'TAP EVERY ONE', S / 2, 82, 20);
      g.font = '90px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s.into, 256, 440);
      for (const b of s.bits) { if (b.got >= 1) continue; const k = b.got, x = b.x + (256 - b.x) * k * k, y = b.y + (440 - b.y) * k * k; g.save(); g.translate(x, y); g.rotate(b.r + k * 6); g.scale(1 - k * 0.6, 1 - k * 0.6); g.font = '60px serif'; g.fillText(s.icon, 0, 0); g.restore(); }
      txt(g, `${s.bits.filter(b => b.got >= 1).length} / ${n}`, 440, 440, 26, '#ffd400');
    };
    return s;
  },
  // PLUNGE: tap tap tap as fast as you can (the blocked toilet)
  plunge(o = {}) {
    const s = { title: o.title || 'UNBLOCK THE TOILET', p: 0, bob: 0, done: false };
    s.down = () => { s.p += 0.06; s.bob = 1; sfx(Math.random() < 0.5 ? 'squish' : 'splat', null, 0.35); if (s.p >= 1) { s.done = true; sfx('gulp', null, 0.8); } };
    s.move = () => {}; s.up = () => {};
    s.update = (dt) => { s.p = Math.max(0, s.p - dt * (0.14 + s.p * 0.1)); s.bob = Math.max(0, s.bob - dt * 6); };
    s.draw = (g) => { frame(g, s.title); txt(g, 'TAP AS FAST AS YOU CAN!', S / 2, 82, 22);
      g.fillStyle = '#f4f4f4'; g.beginPath(); g.ellipse(256, 360, 130, 60, 0, 0, 7); g.fill(); g.fillStyle = '#7a5a2a'; g.beginPath(); g.ellipse(256, 360, 100, 40, 0, 0, 7); g.fill();
      g.fillStyle = '#e0e0e0'; g.fillRect(150, 380, 212, 80);
      const y = 170 + s.bob * 40; g.fillStyle = '#b5651d'; g.fillRect(248, y, 16, 170); g.fillStyle = '#d32f2f'; g.beginPath(); g.ellipse(256, y + 170, 56, 30, 0, Math.PI, 0, true); g.fill();
      g.fillStyle = '#333'; rr(g, 40, 120, 30, 340, 15); g.fill(); g.fillStyle = '#39ff14'; rr(g, 40, 460 - 340 * s.p, 30, 340 * s.p, 15); g.fill();
    };
    return s;
  },
  // ORDER: tap them in order (the bookings, earliest first)
  order(o = {}) {
    const names = shuffle(['DAVE', 'SHARON', 'KEV', 'TRACY', 'GAZ', 'BEV', 'DEL', 'SANDRA', 'MO', 'JEAN']), times = ['5:45', '6:15', '6:50', '7:05', '7:30', '7:50', '8:05', '8:40'];
    const list = times.map((tm, i) => ({ tm, who: names[i], i })), cells = shuffle(list);
    const s = { title: o.title || 'SORT THE BOOKINGS', next: 0, bad: 0, done: false, _cells: cells };
    const box = (j) => ({ x: 36 + (j % 2) * 226, y: 96 + Math.floor(j / 2) * 94, w: 214, h: 82 });
    s.down = (x, y) => { cells.forEach((c, j) => { if (!inside(x, y, box(j)) || c.i < s.next) return; if (c.i === s.next) { s.next++; sfx('beep', null, 0.4); if (s.next >= list.length) s.done = true; } else { s.next = 0; s.bad = 0.8; sfx('thud', null, 0.5); } }); };
    s.move = () => {}; s.up = () => {}; s.update = (dt) => { if (s.bad > 0) s.bad -= dt; };
    s.draw = (g) => { frame(g, s.title, s.bad > 0 ? '#ff4d4d' : '#ffd400'); txt(g, s.bad > 0 ? 'WRONG ORDER! START AGAIN' : 'TAP THE BOOKINGS: EARLIEST FIRST', S / 2, 74, 18, s.bad > 0 ? '#ff6b6b' : '#fff');
      cells.forEach((c, j) => { const b = box(j), on = c.i < s.next; g.fillStyle = on ? '#1b5e20' : '#f5f0e0'; rr(g, b.x, b.y, b.w, b.h, 10); g.fill();
        txt(g, c.tm, b.x + 62, b.y + b.h / 2, 30, on ? '#9cff9c' : '#222'); txt(g, c.who, b.x + 156, b.y + b.h / 2, 22, on ? '#9cff9c' : '#c62828', 'center', 100); });
    };
    return s;
  },
  // SCRUB: rub the mess off (the fryer, the tables)
  scrub(o = {}) {
    const s = { title: o.title || 'WIPE THE TABLES', spots: [], drag: false, done: false, cx: 0, cy: 0 };
    for (let i = 0; i < (o.n || 7); i++) s.spots.push({ x: 100 + Math.random() * 312, y: 140 + Math.random() * 230, r: 28 + Math.random() * 26, a: 1, k: i % 3 === 0 && o.n ? 0.4 : 1, c: R(['#7a4a1a', '#a0522d', '#5a3a1a', '#c8a040']) });
    s.down = (x, y) => { s.drag = true; s.cx = x; s.cy = y; }; s.up = () => { s.drag = false; };
    s.move = (x, y) => { s.cx = x; s.cy = y; if (!s.drag) return; for (const p of s.spots) if (p.a > 0 && Math.hypot(x - p.x, y - p.y) < p.r + 26) { p.a -= 0.035 * (p.k || 1); if ((s.sq = (s.sq || 0) + 1) % 9 === 0) sfx('scrub', null, 0.25); } if (s.spots.every(p => p.a <= 0)) s.done = true; };
    s.update = () => {};
    s.draw = (g) => { frame(g, s.title); txt(g, 'RUB THE MESS OFF', S / 2, 82, 20);
      g.fillStyle = o.surface || '#8b5a2b'; rr(g, 40, 110, 432, 360, 20); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(40, 130 + i * 44); g.lineTo(472, 140 + i * 44); g.stroke(); }
      for (const p of s.spots) if (p.a > 0) { g.globalAlpha = Math.max(0, p.a); g.fillStyle = p.c; g.beginPath(); g.ellipse(p.x, p.y, p.r, p.r * 0.75, 0.4, 0, 7); g.fill(); } g.globalAlpha = 1;
      if (s.drag) { g.font = '70px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🧽', s.cx, s.cy); }
    };
    return s;
  },
  // CODE: type in the number on the slip (the slot machine)
  code(o = {}) {
    const code = String(Math.floor(100000 + Math.random() * 899999)), s = { title: o.title || 'RESET THE SLOT MACHINE', typed: '', bad: 0, done: false, show: 3, _code: code };
    const key = (k) => ({ x: 146 + (k === 'C' ? 0 : k === '0' ? 1 : k === 'OK' ? 2 : (Number(k) - 1) % 3) * 76, y: 200 + (k === 'C' || k === '0' || k === 'OK' ? 3 : Math.floor((Number(k) - 1) / 3)) * 70, w: 68, h: 62 });
    const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'];
    s.down = (x, y) => { for (const k of KEYS) if (inside(x, y, key(k))) { sfx('tap', null, 0.4);
      if (k === 'C') s.typed = ''; else if (k === 'OK') { if (s.typed === code) { s.done = true; sfx('fixed', null, 0.7); } else { s.bad = 0.9; s.typed = ''; s.show = 2.5; sfx('error', null, 0.5); } } else if (s.typed.length < 6) s.typed += k; } };
    s.move = () => {}; s.up = () => {}; s.update = (dt) => { if (s.bad > 0) s.bad -= dt; if (s.show > 0) s.show -= dt; };
    s.draw = (g) => { frame(g, s.title);
      if (s.show <= 0) { g.fillStyle = '#c9b48a'; g.save(); g.translate(40, 70); g.rotate(-0.06); rr(g, 0, 0, 150, 90, 6); g.fill(); txt(g, 'REMEMBER IT?', 75, 45, 15, '#5a3a1a'); g.restore(); } else {
      g.fillStyle = '#fffbe6'; g.save(); g.translate(40, 70); g.rotate(-0.06); rr(g, 0, 0, 150, 90, 6); g.fill(); txt(g, 'MEMORISE IT', 75, 24, 16, '#c62828'); txt(g, code, 75, 60, 28, '#222'); g.restore(); } if (s.show > 0) { g.fillStyle = '#ffd400'; g.fillRect(40, 166, 150 * Math.min(1, s.show / 3), 6); }
      g.fillStyle = '#000'; rr(g, 220, 100, 250, 70, 10); g.fill(); txt(g, s.bad > 0 ? 'ERROR' : (s.typed || '______'), 345, 136, 36, s.bad > 0 ? '#ff4d4d' : '#39ff14');
      for (const k of KEYS) btn(g, key(k), k, k === 'OK' ? '#2e7d32' : k === 'C' ? '#c62828' : '#3a4a8a', 26);
    };
    return s;
  },
  // DIAL: stop the needle in the green (the keg pressure / the fuse box)
  dial(o = {}) {
    const s = { title: o.title || 'CHECK THE KEG PRESSURE', a: 0, v: 1.6, hits: 0, need: o.need || 3, flash: 0, zone: [0.15, 0.45], done: false };
    const B = { x: 156, y: 400, w: 200, h: 70 };
    s.down = (x, y) => { if (!inside(x, y, B)) return; const k = (Math.sin(s.a) + 1) / 2; if (k >= s.zone[0] && k <= s.zone[1]) { s.hits++; s.flash = 0.4; sfx('beep', null, 0.6); s.v *= 1.32; const c = 0.15 + Math.random() * 0.55; s.zone = [c, c + 0.28 - s.hits * 0.04]; if (s.hits >= s.need) s.done = true; } else { s.flash = -0.4; s.hits = Math.max(0, s.hits - 1); sfx('thud', null, 0.5); } };
    s.move = () => {}; s.up = () => {}; s.update = (dt) => { s.a += dt * s.v; if (s.flash > 0) s.flash = Math.max(0, s.flash - dt); else if (s.flash < 0) s.flash = Math.min(0, s.flash + dt); };
    s.draw = (g) => { frame(g, s.title);
      const cx = 256, cy = 300, r = 170, ang = (k) => Math.PI + k * Math.PI;
      g.lineWidth = 34; g.strokeStyle = '#333'; g.beginPath(); g.arc(cx, cy, r, Math.PI, 0); g.stroke();
      g.strokeStyle = '#39ff14'; g.beginPath(); g.arc(cx, cy, r, ang(s.zone[0]), ang(s.zone[1])); g.stroke();
      const k = (Math.sin(s.a) + 1) / 2; g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang(k)) * (r + 10), cy + Math.sin(ang(k)) * (r + 10)); g.stroke();
      g.fillStyle = '#c62828'; g.beginPath(); g.arc(cx, cy, 16, 0, 7); g.fill();
      txt(g, `STOP IT IN THE GREEN · ${s.hits}/${s.need}`, S / 2, 84, 20, s.flash < 0 ? '#ff6b6b' : s.flash > 0 ? '#39ff14' : '#fff');
      btn(g, B, 'STOP!', '#c62828', 30);
    };
    return s;
  },
  // SWITCHES: flip every switch up (the fuse box, after the lights go)
  switches(o = {}) {
    const n = 5, on = Array(n).fill(true), s = { title: o.title || 'FIX THE LIGHTS', done: false, _on: on };
    const flip = (i) => { for (const j of [i - 1, i, i + 1]) if (j >= 0 && j < n) on[j] = !on[j]; };
    do { for (let k = 0; k < 3; k++) flip(Math.floor(Math.random() * n)); } while (on.every(Boolean));      // (scrambled from all-on, so it can always be solved)
    const box = (i) => ({ x: 46 + i * 86, y: 170, w: 72, h: 200 });
    s.down = (x, y) => { for (let i = 0; i < n; i++) if (inside(x, y, box(i))) { flip(i); sfx('toggle', null, 0.6); if (on.every(Boolean)) s.done = true; } };
    s.move = () => {}; s.up = () => {}; s.update = () => {};
    s.draw = (g) => { frame(g, s.title); txt(g, 'ALL UP · EACH ONE FLIPS ITS NEIGHBOURS TOO', S / 2, 90, 18);
      for (let i = 0; i < n; i++) { const b = box(i); g.fillStyle = '#2a2a2a'; rr(g, b.x, b.y, b.w, b.h, 10); g.fill(); g.fillStyle = on[i] ? '#39ff14' : '#ff3b3b'; g.beginPath(); g.arc(b.x + b.w / 2, b.y - 22, 12, 0, 7); g.fill();
        g.fillStyle = '#ddd'; rr(g, b.x + 14, on[i] ? b.y + 14 : b.y + b.h - 84, b.w - 28, 70, 8); g.fill(); }
      if (on.every(Boolean)) txt(g, '💡 LIGHTS ON', S / 2, 440, 30, '#ffd400');
    };
    return s;
  },

  // ================================================================ the new ones (one game per job)
  // REELS: stop each reel on a cherry (the fruit machine). A reel that lands on anything else: they all spin again
  reels(o = {}) {
    const SY = ['🍒', '🍋', '🔔', '⭐', '🍇', '💎'], N = SY.length;
    const s = { title: o.title || 'EMPTY THE FRUIT MACHINE', reels: [], cur: 0, msg: '', msgT: 0, win: 0, done: false };
    const spin = () => { s.reels = [2.4, 3.0, 3.6].map(v => ({ p: Math.random() * N, v, stop: false })); s.cur = 0; };
    spin(); const B = { x: 136, y: 410, w: 240, h: 66 };
    s.down = (x, y) => { if (s.msgT > 0 || s.win || !inside(x, y, B)) return; const r = s.reels[s.cur]; r.p = Math.round(r.p); r.stop = true; sfx('clack', null, 0.6);
      if (((r.p % N) + N) % N !== 0) { s.msg = 'NO CHERRY! SPIN AGAIN'; s.msgT = 1.1; sfx('error', null, 0.5); return; }
      if (++s.cur >= 3) { s.win = 0.001; sfx('jackpot', null, 0.7); } };
    s.move = () => {}; s.up = () => {};
    s.update = (dt) => { for (const r of s.reels) if (!r.stop) r.p += r.v * dt; if (s.msgT > 0 && (s.msgT -= dt) <= 0) spin(); if (s.win) { s.win += dt; if (s.win > 1.2) s.done = true; } };
    s.draw = (g, t) => { frame(g, s.title); txt(g, s.msgT > 0 ? s.msg : 'STOP EVERY REEL ON A 🍒', S / 2, 82, 22, s.msgT > 0 ? '#ff6b6b' : '#fff');
      g.fillStyle = '#5a1a7a'; rr(g, 36, 120, 440, 270, 24); g.fill();
      s.reels.forEach((r, i) => { const x = 106 + i * 150; g.save(); g.fillStyle = '#fffbe6'; rr(g, x - 62, 150, 124, 210, 14); g.fill(); g.beginPath(); rr(g, x - 62, 150, 124, 210, 14); g.clip();
        const f = r.p - Math.floor(r.p); for (let k = -2; k <= 2; k++) { const idx = ((Math.floor(r.p) + k) % N + N) % N, y = 255 + (k - f) * 80; g.font = '60px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(SY[idx], x, y); }
        g.restore(); if (r.stop) { g.strokeStyle = '#39ff14'; g.lineWidth = 6; rr(g, x - 62, 150, 124, 210, 14); g.stroke(); } else if (i === s.cur) { g.strokeStyle = '#ffd400'; g.lineWidth = 6; rr(g, x - 62, 150, 124, 210, 14); g.stroke(); } });
      g.strokeStyle = 'rgba(255,40,40,0.8)'; g.lineWidth = 4; g.beginPath(); g.moveTo(40, 255); g.lineTo(472, 255); g.stroke();
      if (s.win) { for (let i = 0; i < 14; i++) { g.font = '34px serif'; g.fillText('🪙', 60 + (i * 37) % 400, 130 + ((t * 300 + i * 70) % 300)); } }
      btn(g, B, s.win ? '£££ PAID OUT £££' : `STOP REEL ${Math.min(3, s.cur + 1)}`, s.win ? '#2e7d32' : '#c62828', 26); };
    return s;
  },
  // CATCH: the loo rolls drop from the shelf: catch them in the basket. Drop three and you start again
  catch(o = {}) {
    const need = o.n || 8, s = { title: o.title || 'RESTOCK THE LOO ROLL', bx: 256, rolls: [], got: 0, miss: 0, next: 0.6, msgT: 0, done: false };
    s.down = (x) => { s.bx = Math.max(70, Math.min(442, x)); }; s.move = (x) => { s.bx = Math.max(70, Math.min(442, x)); }; s.up = () => {};
    s.update = (dt) => { if (s.done) return; if (s.msgT > 0) s.msgT -= dt;
      if ((s.next -= dt) <= 0) { s.next = Math.max(0.55, 1.15 - s.got * 0.06) * (0.8 + Math.random() * 0.4); s.rolls.push({ x: 60 + Math.random() * 392, y: 110, v: 170 + s.got * 18, r: Math.random() * 6 }); }
      for (const r of s.rolls) { r.y += r.v * dt; r.r += dt * 3; if (!r.gone && r.y > 410 && r.y < 450 && Math.abs(r.x - s.bx) < 66) { r.gone = true; s.got++; sfx('pickup', null, 0.5); if (s.got >= need) s.done = true; }
        if (!r.gone && r.y > 480) { r.gone = true; if (++s.miss >= 3) { s.got = 0; s.miss = 0; s.msgT = 1.2; sfx('error', null, 0.5); } else sfx('land', null, 0.4); } }
      s.rolls = s.rolls.filter(r => !r.gone); };
    s.draw = (g) => { frame(g, s.title); txt(g, s.msgT > 0 ? 'DROPPED THREE! START AGAIN' : 'DRAG THE BASKET · CATCH THE ROLLS', S / 2, 80, 20, s.msgT > 0 ? '#ff6b6b' : '#fff');
      g.font = '50px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (const r of s.rolls) { g.save(); g.translate(r.x, r.y); g.rotate(r.r); g.fillText('🧻', 0, 0); g.restore(); }
      g.fillStyle = '#8d6e63'; rr(g, s.bx - 66, 420, 132, 52, 10); g.fill(); g.strokeStyle = '#5d4037'; g.lineWidth = 4; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(s.bx - 66 + i * 22, 420); g.lineTo(s.bx - 66 + i * 22, 472); g.stroke(); }
      txt(g, `${s.got} / ${need}`, 70, 120, 24, '#ffd400'); txt(g, '✖'.repeat(s.miss) + '·'.repeat(3 - s.miss), 442, 120, 24, '#ff6b6b'); };
    return s;
  },
  // TEMP: hold to heat the fryer, let go to cool: keep it in the green (which moves) until the chips are done. Too hot: fire
  temp(o = {}) {
    const s = { title: o.title || 'CLEAN THE FRYER', T: 0.3, heat: false, cooked: 0, need: 5, fire: 0, band: 0.62, done: false };
    s.down = () => { s.heat = true; }; s.up = () => { s.heat = false; }; s.move = () => {};
    s.update = (dt) => { if (s.done) return; s.t = (s.t || 0) + dt; s.band = 0.6 + Math.sin(s.t * 0.7) * 0.14;
      if (s.fire > 0) { s.fire -= dt; s.T = Math.max(0.2, s.T - dt * 0.4); return; }
      s.T += (s.heat ? 0.42 : -0.3) * dt + Math.sin(s.t * 3.1) * 0.02 * dt; s.T = Math.max(0, Math.min(1, s.T));
      if (Math.abs(s.T - s.band) < 0.09) { s.cooked += dt; if ((s.ss = (s.ss || 0) - dt) <= 0) { s.ss = 0.5; sfx('sizzle', null, 0.15); } if (s.cooked >= s.need) { s.done = true; } }
      if (s.T >= 0.98) { s.fire = 1.6; s.cooked = 0; sfx('smash', null, 0.5); } };
    s.draw = (g, t) => { frame(g, s.title); txt(g, s.fire > 0 ? '🔥 FIRE! START AGAIN 🔥' : 'HOLD TO HEAT · KEEP IT IN THE GREEN', S / 2, 80, 20, s.fire > 0 ? '#ff6b6b' : '#fff');
      const x = 70, y0 = 120, h = 330; g.fillStyle = '#222'; rr(g, x, y0, 50, h, 25); g.fill();
      g.fillStyle = 'rgba(57,255,20,0.45)'; g.fillRect(x, y0 + h * (1 - s.band - 0.09), 50, h * 0.18);
      g.fillStyle = s.T > 0.9 ? '#ff3b3b' : '#ff8a00'; rr(g, x + 10, y0 + h * (1 - s.T), 30, h * s.T, 15); g.fill();
      g.fillStyle = '#9aa0a6'; rr(g, 170, 200, 290, 200, 18); g.fill(); g.fillStyle = s.fire > 0 ? '#ff5a1a' : '#d9a441'; rr(g, 186, 230, 258, 150, 12); g.fill();
      const k = Math.min(1, s.cooked / s.need); for (let i = 0; i < 18; i++) { g.fillStyle = `rgb(${245 - k * 40},${215 - k * 90},${120 - k * 80})`; g.save(); g.translate(206 + (i % 6) * 42, 260 + Math.floor(i / 6) * 40 + Math.sin(t * 6 + i) * 3); g.rotate(i * 0.7); g.fillRect(-14, -4, 28, 8); g.restore(); }
      if (s.fire > 0) { g.font = '80px serif'; g.textAlign = 'center'; g.fillText('🔥', 315, 300); }
      g.fillStyle = '#333'; rr(g, 170, 430, 290, 20, 10); g.fill(); g.fillStyle = '#39ff14'; rr(g, 170, 430, 290 * k, 20, 10); g.fill(); txt(g, 'CHIPS', 315, 470, 18); };
    return s;
  },
  // SORT: the pots come in one at a time: drag each to the right rack, before the time runs out
  sort(o = {}) {
    const K = [['🍽️', 'PLATES'], ['🥛', 'GLASSES'], ['🍴', 'CUTLERY']], need = 10;
    const s = { title: o.title || 'WASH THE POTS', item: 0, ix: 256, iy: 170, drag: false, got: 0, time: 22, bad: 0, done: false };
    const bin = (i) => ({ x: 30 + i * 158, y: 360, w: 140, h: 110 }), next = () => { s.item = Math.floor(Math.random() * 3); s.ix = 256; s.iy = 170; };
    next();
    s.down = (x, y) => { if (Math.hypot(x - s.ix, y - s.iy) < 60) s.drag = true; }; s.move = (x, y) => { if (s.drag) { s.ix = x; s.iy = y; } };
    s.up = (x, y) => { if (!s.drag) return; s.drag = false; for (let i = 0; i < 3; i++) if (inside(x, y, bin(i))) { if (i === s.item) { s.got++; sfx('glass', null, 0.4); if (s.got >= need) s.done = true; next(); } else { s.got = Math.max(0, s.got - 2); s.bad = 0.8; sfx('error', null, 0.5); next(); } return; } s.ix = 256; s.iy = 170; };
    s.update = (dt) => { if (s.done) return; if (s.bad > 0) s.bad -= dt; if ((s.time -= dt) <= 0) { s.time = 22; s.got = 0; s.bad = 1.2; sfx('error', null, 0.5); } };
    s.draw = (g) => { frame(g, s.title, s.bad > 0 ? '#ff4d4d' : '#ffd400'); txt(g, s.bad > 0 ? 'WRONG RACK!' : 'DRAG EACH ONE TO ITS RACK', S / 2, 80, 20, s.bad > 0 ? '#ff6b6b' : '#fff');
      g.fillStyle = '#333'; rr(g, 40, 104, 432, 14, 7); g.fill(); g.fillStyle = s.time < 6 ? '#ff3b3b' : '#ffd400'; rr(g, 40, 104, 432 * s.time / 22, 14, 7); g.fill();
      for (let i = 0; i < 3; i++) { const b = bin(i); g.fillStyle = '#9aa0a6'; rr(g, b.x, b.y, b.w, b.h, 14); g.fill(); g.font = '40px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(K[i][0], b.x + b.w / 2, b.y + 42); txt(g, K[i][1], b.x + b.w / 2, b.y + 88, 18, '#111'); }
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.arc(256, 170, 60, 0, 7); g.fill(); g.font = '80px serif'; g.fillText(K[s.item][0], s.ix, s.iy);
      txt(g, `${s.got} / ${need}`, 440, 160, 26, '#ffd400'); };
    return s;
  },
  // WHACK: empties pop up on the tables: grab them before they go. Leave the full pints alone (they're someone's)
  whack(o = {}) {
    const need = 12, s = { title: o.title || 'COLLECT THE EMPTIES', ups: [], got: 0, miss: 0, next: 0.5, msg: '', msgT: 0, done: false };
    const spot = (i) => ({ x: 106 + (i % 3) * 150, y: 170 + Math.floor(i / 3) * 150 });
    s.down = (x, y) => { for (const u of s.ups) { const p = spot(u.i); if (!u.gone && Math.hypot(x - p.x, y - p.y) < 58) { u.gone = true;
      if (u.full) { s.got = Math.max(0, s.got - 2); s.msg = 'OI! THAT\'S MY PINT!'; s.msgT = 1; sfx('error', null, 0.5); } else { s.got++; sfx('glass', null, 0.4); if (s.got >= need) s.done = true; } return; } } };
    s.move = () => {}; s.up = () => {};
    s.update = (dt) => { if (s.done) return; if (s.msgT > 0) s.msgT -= dt;
      if ((s.next -= dt) <= 0) { s.next = 0.45 + Math.random() * 0.4; const free = [0, 1, 2, 3, 4, 5].filter(i => !s.ups.some(u => !u.gone && u.i === i)); if (free.length) s.ups.push({ i: free[Math.floor(Math.random() * free.length)], life: Math.max(0.65, 1.3 - s.got * 0.05), full: Math.random() < 0.25 }); }
      for (const u of s.ups) if (!u.gone && (u.life -= dt) <= 0) { u.gone = true; if (!u.full && ++s.miss >= 4) { s.got = 0; s.miss = 0; s.msg = 'TOO SLOW! START AGAIN'; s.msgT = 1.2; sfx('error', null, 0.5); } }
      s.ups = s.ups.filter(u => !u.gone); };
    s.draw = (g) => { frame(g, s.title); txt(g, s.msgT > 0 ? s.msg : 'GRAB THE EMPTIES · NOT THE FULL ONES', S / 2, 80, 20, s.msgT > 0 ? '#ff6b6b' : '#fff');
      for (let i = 0; i < 6; i++) { const p = spot(i); g.fillStyle = '#6d4c33'; g.beginPath(); g.ellipse(p.x, p.y + 44, 62, 18, 0, 0, 7); g.fill(); }
      for (const u of s.ups) { const p = spot(u.i), k = Math.min(1, (1.3 - u.life) * 6 + 0.3); g.save(); g.translate(p.x, p.y + 40); g.scale(k, k);
        g.beginPath(); g.moveTo(-26, -90); g.lineTo(26, -90); g.lineTo(20, 0); g.lineTo(-20, 0); g.closePath(); g.fillStyle = u.full ? '#c98a1a' : 'rgba(220,240,255,0.25)'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#e8f4ff'; g.stroke();
        if (u.full) { g.fillStyle = '#fff8e6'; g.fillRect(-26, -96, 52, 14); } else { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-20, -20, 40, 6); } g.restore(); }
      txt(g, `${s.got} / ${need}`, 70, 470, 24, '#ffd400'); txt(g, '✖'.repeat(s.miss) + '·'.repeat(4 - s.miss), 430, 470, 22, '#ff6b6b'); };
    return s;
  },
  // SIMON: the clock-in machine flashes a pattern: copy it. Three rounds, each one longer
  simon(o = {}) {
    const C = ['#ff3b3b', '#2f7bff', '#39ff14', '#ffd400'], s = { title: o.title || 'CLOCK IN FOR YOUR SHIFT', seq: [], len: 3, pos: 0, st: 'wait', t: 0.6, lit: -1, litT: 0, bad: 0, done: false };
    const pad = (i) => ({ x: 96 + (i % 2) * 168, y: 130 + Math.floor(i / 2) * 168, w: 152, h: 152 });
    s.down = (x, y) => { if (s.st !== 'input') return; for (let i = 0; i < 4; i++) if (inside(x, y, pad(i))) { s.lit = i; s.litT = 0.25;
      if (s.seq[s.pos] === i) { sfx('beep', null, 0.5); if (++s.pos >= s.seq.length) { if (s.len >= 5) s.done = true; else { s.len++; s.st = 'wait'; s.t = 0.7; } } }
      else { s.bad = 1.2; s.len = 3; s.st = 'wait'; s.t = 1.2; sfx('error', null, 0.6); } } };
    s.move = () => {}; s.up = () => {};
    s.update = (dt) => { if (s.done) return; if (s.litT > 0 && (s.litT -= dt) <= 0) s.lit = -1; if (s.bad > 0) s.bad -= dt;
      if (s.st === 'wait' && (s.t -= dt) <= 0) { s.seq = Array.from({ length: s.len }, () => Math.floor(Math.random() * 4)); s.pos = 0; s.st = 'show'; s.t = 0; }
      else if (s.st === 'show') { s.t += dt; const i = Math.floor(s.t / 0.6); if (i >= s.seq.length) { s.st = 'input'; s.lit = -1; } else if (s.t % 0.6 < 0.4) { if (s.lit !== s.seq[i] || s.litT <= 0) { if (s.lit !== s.seq[i]) sfx('tick', null, 0.4); s.lit = s.seq[i]; s.litT = 0.4 - (s.t % 0.6); } } else s.lit = -1; } };
    s.draw = (g) => { frame(g, s.title, s.bad > 0 ? '#ff4d4d' : '#ffd400');
      txt(g, s.bad > 0 ? 'WRONG! WATCH AGAIN' : s.st === 'input' ? `NOW COPY IT · ROUND ${s.len - 2} OF 3` : 'WATCH THE PATTERN...', S / 2, 84, 22, s.bad > 0 ? '#ff6b6b' : '#fff');
      for (let i = 0; i < 4; i++) { const b = pad(i); g.globalAlpha = s.lit === i ? 1 : 0.3; g.fillStyle = C[i]; rr(g, b.x, b.y, b.w, b.h, 20); g.fill(); g.globalAlpha = 1; g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,0.5)'; rr(g, b.x, b.y, b.w, b.h, 20); g.stroke(); }
      txt(g, `${s.st === 'input' ? s.pos : 0} / ${s.len}`, S / 2, 482, 22, '#ffd400'); };
    return s;
  },
  // PLACE: lay each place setting: the fork on the left of the plate, the knife on the right
  place(o = {}) {
    const P = [106, 256, 406], s = { title: o.title || 'LAY THE TABLES', items: [], drag: null, ox: 0, oy: 0, msg: '', msgT: 0, done: false };
    const slots = []; for (const x of P) { slots.push({ x: x - 52, y: 220, k: 'fork', f: null }); slots.push({ x: x + 52, y: 220, k: 'knife', f: null }); }
    shuffle(['fork', 'fork', 'fork', 'knife', 'knife', 'knife']).forEach((k, i) => s.items.push({ k, x: 70 + i * 74, y: 420, hx: 70 + i * 74, hy: 420, on: null }));
    s.down = (x, y) => { for (const it of s.items) if (!it.on && Math.abs(x - it.x) < 30 && Math.abs(y - it.y) < 60) { s.drag = it; s.ox = x - it.x; s.oy = y - it.y; return; } };
    s.move = (x, y) => { if (s.drag) { s.drag.x = x - s.ox; s.drag.y = y - s.oy; } };
    s.up = () => { const it = s.drag; if (!it) return; s.drag = null; const sl = slots.find(q => !q.f && Math.hypot(q.x - it.x, q.y - it.y) < 44);
      if (sl && sl.k === it.k) { sl.f = it; it.on = sl; it.x = sl.x; it.y = sl.y; sfx('clack', null, 0.5); if (slots.every(q => q.f)) s.done = true; }
      else { if (sl) { s.msg = it.k === 'fork' ? 'FORKS GO ON THE LEFT' : 'KNIVES GO ON THE RIGHT'; s.msgT = 1.2; sfx('error', null, 0.4); } it.x = it.hx; it.y = it.hy; } };
    s.update = (dt) => { if (s.msgT > 0) s.msgT -= dt; };
    const draw1 = (g, k, x, y) => { g.save(); g.translate(x, y); g.fillStyle = '#d8dce0'; g.strokeStyle = '#7a7f87'; g.lineWidth = 2;
      if (k === 'fork') { g.fillRect(-4, -10, 8, 60); g.fillRect(-14, -50, 28, 12); for (let i = 0; i < 4; i++) g.fillRect(-14 + i * 8, -78, 4, 30); }
      else { g.fillRect(-4, 0, 8, 52); g.beginPath(); g.moveTo(-6, 0); g.lineTo(-6, -70); g.quadraticCurveTo(8, -60, 8, 0); g.closePath(); g.fill(); g.stroke(); } g.restore(); };
    s.draw = (g) => { frame(g, s.title); txt(g, s.msgT > 0 ? s.msg : 'FORK ON THE LEFT · KNIFE ON THE RIGHT', S / 2, 80, 19, s.msgT > 0 ? '#ff6b6b' : '#fff');
      g.fillStyle = '#f2ece0'; rr(g, 30, 120, 452, 200, 18); g.fill();
      for (const x of P) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, 220, 38, 0, 7); g.fill(); g.strokeStyle = '#c9b48a'; g.lineWidth = 3; g.beginPath(); g.arc(x, 220, 28, 0, 7); g.stroke(); }
      for (const q of slots) if (!q.f) { g.strokeStyle = 'rgba(0,0,0,0.15)'; g.setLineDash([6, 6]); g.strokeRect(q.x - 14, q.y - 60, 28, 120); g.setLineDash([]); }
      g.fillStyle = '#5a3a22'; rr(g, 30, 350, 452, 130, 18); g.fill();
      for (const it of s.items) draw1(g, it.k, it.x, it.y); };
    return s;
  },
  // LIGHT: hold the match on each wick till it catches. The wind keeps blowing them out: get them all lit at once
  light(o = {}) {
    const C = [[96, 300], [176, 260], [256, 300], [336, 260], [416, 300]], s = { title: o.title || 'LIGHT THE CANDLES', lit: C.map(() => false), heat: C.map(() => 0), mx: -99, my: -99, hold: false, gust: 3.2, blow: 0, done: false };
    s.down = (x, y) => { s.hold = true; s.mx = x; s.my = y; }; s.move = (x, y) => { s.mx = x; s.my = y; }; s.up = () => { s.hold = false; };
    s.update = (dt) => { if (s.done) return; if (s.blow > 0) s.blow -= dt;
      C.forEach(([x, y], i) => { if (!s.lit[i] && s.hold && Math.hypot(s.mx - x, s.my - (y - 70)) < 34) { s.heat[i] += dt; if (s.heat[i] > 0.55) { s.lit[i] = true; s.heat[i] = 0; sfx('zap', null, 0.25); } } else if (!s.lit[i]) s.heat[i] = Math.max(0, s.heat[i] - dt); });
      if (s.lit.every(Boolean)) { s.done = true; return; }
      if ((s.gust -= dt) <= 0) { s.gust = 2.2 + Math.random() * 1.6; const on = s.lit.map((v, i) => v ? i : -1).filter(i => i >= 0); if (on.length) { s.lit[on[Math.floor(Math.random() * on.length)]] = false; s.blow = 0.8; sfx('throw', null, 0.5); } } };
    s.draw = (g, t) => { frame(g, s.title); txt(g, s.blow > 0 ? '💨 WHOOSH! ONE BLEW OUT' : 'HOLD THE MATCH ON EACH WICK', S / 2, 80, 20, s.blow > 0 ? '#9fd8ff' : '#fff');
      g.fillStyle = '#3a2416'; rr(g, 40, 330, 432, 30, 10); g.fill();
      C.forEach(([x, y], i) => { g.fillStyle = '#f5eedc'; g.fillRect(x - 16, y - 60, 32, 90); g.fillStyle = '#222'; g.fillRect(x - 2, y - 72, 4, 12);
        if (s.lit[i]) { const f = 1 + Math.sin(t * 20 + i) * 0.1; g.fillStyle = '#ffb300'; g.beginPath(); g.ellipse(x, y - 86, 9 * f, 18 * f, 0, 0, 7); g.fill(); g.fillStyle = '#fff3b0'; g.beginPath(); g.ellipse(x, y - 82, 4, 9, 0, 0, 7); g.fill(); }
        else if (s.heat[i] > 0) { g.fillStyle = '#ffd400'; g.fillRect(x - 20, y + 40, 40 * s.heat[i] / 0.55, 6); } });
      if (s.hold) { g.save(); g.translate(s.mx, s.my); g.rotate(0.5); g.fillStyle = '#e8c48a'; g.fillRect(-3, 0, 6, 70); g.fillStyle = '#c62828'; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill(); g.fillStyle = '#ffb300'; g.beginPath(); g.ellipse(0, -10, 7, 14, 0, 0, 7); g.fill(); g.restore(); }
      txt(g, `${s.lit.filter(Boolean).length} / 5 LIT`, S / 2, 420, 24, '#ffd400'); };
    return s;
  },
  // STACKER: a tray of glasses slides back and forth: drop it on the stack. Whatever overhangs falls off
  stacker(o = {}) {
    const need = 7, s = { title: o.title || 'CLEAR THE GARDEN GLASSES', rows: [{ x: 156, w: 200 }], cur: null, dir: 1, msg: '', msgT: 0, done: false };
    const newRow = () => { const top = s.rows[s.rows.length - 1]; s.cur = { x: 40, w: top.w, v: 170 + s.rows.length * 34 }; s.dir = 1; };
    newRow(); const H = 40, base = 450;
    s.down = () => { if (s.msgT > 0 || s.done) return; const top = s.rows[s.rows.length - 1], c = s.cur, l = Math.max(c.x, top.x), r = Math.min(c.x + c.w, top.x + top.w);
      if (r - l < 14) { s.msg = 'CRASH! START AGAIN'; s.msgT = 1.2; sfx('smash', null, 0.6); return; }
      s.rows.push({ x: l, w: r - l }); sfx('glass', null, 0.5); if (s.rows.length - 1 >= need) { s.done = true; s.cur = null; return; } newRow(); };
    s.move = () => {}; s.up = () => {};
    s.update = (dt) => { if (s.msgT > 0) { if ((s.msgT -= dt) <= 0) { s.rows = [{ x: 156, w: 200 }]; newRow(); } return; } const c = s.cur; if (!c) return; c.x += c.v * s.dir * dt; if (c.x + c.w > 472) { c.x = 472 - c.w; s.dir = -1; } if (c.x < 40) { c.x = 40; s.dir = 1; } };
    const tray = (g, x, y, w) => { g.fillStyle = '#8d6e63'; g.fillRect(x, y + H - 8, w, 8); for (let gx = x + 6; gx + 18 < x + w; gx += 24) { g.fillStyle = 'rgba(220,240,255,0.35)'; g.strokeStyle = '#e8f4ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(gx, y + 4); g.lineTo(gx + 18, y + 4); g.lineTo(gx + 15, y + H - 8); g.lineTo(gx + 3, y + H - 8); g.closePath(); g.fill(); g.stroke(); } };
    s.draw = (g) => { frame(g, s.title); txt(g, s.msgT > 0 ? s.msg : `TAP TO DROP THE TRAY · ${s.rows.length - 1}/${need}`, S / 2, 80, 20, s.msgT > 0 ? '#ff6b6b' : '#fff');
      g.fillStyle = '#5a3a22'; g.fillRect(40, base + H - 4, 432, 10);
      s.rows.forEach((r, i) => i && tray(g, r.x, base - i * H + 4, r.w)); g.fillStyle = '#6d4c33'; g.fillRect(s.rows[0].x, base + 4, s.rows[0].w, H - 8);
      if (s.cur && s.msgT <= 0) tray(g, s.cur.x, base - s.rows.length * H + 4, s.cur.w); };
    return s;
  },
  // SWEEP: push the broken glass into the dustpan with the broom
  sweep(o = {}) {
    const s = { title: o.title || 'SWEEP UP THE GLASS', bits: [], px: null, py: null, done: false }, PAN = { x: 196, y: 420, w: 120, h: 56 };
    for (let i = 0; i < 12; i++) s.bits.push({ x: 70 + Math.random() * 372, y: 120 + Math.random() * 220, r: Math.random() * 6, n: 3 + Math.floor(Math.random() * 3), got: false });
    s.down = (x, y) => { s.px = x; s.py = y; }; s.up = () => { s.px = null; };
    s.move = (x, y) => { if (s.px === null) return; const dx = x - s.px, dy = y - s.py; for (const b of s.bits) if (!b.got && Math.hypot(b.x - x, b.y - y) < 46) { b.x = Math.max(30, Math.min(482, b.x + dx * 0.9)); b.y = Math.max(110, Math.min(476, b.y + dy * 0.9)); b.r += dx * 0.02;
        if (inside(b.x, b.y, PAN)) { b.got = true; sfx('glass', null, 0.3); } }
      s.px = x; s.py = y; if (s.bits.every(b => b.got)) s.done = true; if ((s.sw = (s.sw || 0) + Math.hypot(dx, dy)) > 120) { s.sw = 0; sfx('scrub', null, 0.2); } };
    s.update = () => {};
    s.draw = (g) => { frame(g, s.title); txt(g, 'SWEEP EVERY BIT INTO THE DUSTPAN', S / 2, 80, 20);
      g.fillStyle = '#3d3f43'; rr(g, 26, 104, 460, 380, 18); g.fill();
      g.fillStyle = '#d32f2f'; rr(g, PAN.x, PAN.y, PAN.w, PAN.h, 8); g.fill(); g.fillStyle = '#9a1f1f'; g.fillRect(PAN.x + PAN.w / 2 - 6, PAN.y + PAN.h, 12, 10);
      for (const b of s.bits) if (!b.got) { g.save(); g.translate(b.x, b.y); g.rotate(b.r); g.fillStyle = 'rgba(200,235,255,0.85)'; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); for (let k = 0; k < b.n; k++) { const a = k / b.n * 6.28, rr2 = 8 + (k % 2) * 7; g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } g.closePath(); g.fill(); g.stroke(); g.restore(); }
      if (s.px !== null) { g.save(); g.translate(s.px, s.py); g.fillStyle = '#c8a040'; g.fillRect(-40, -8, 80, 22); g.fillStyle = '#6d4c33'; g.fillRect(-4, -90, 8, 84); g.restore(); }
      txt(g, `${s.bits.filter(b => b.got).length} / ${s.bits.length}`, 440, 450, 22, '#ffd400'); };
    return s;
  },
  // PIPES: turn the tiles so the power runs from the box on the left to the barrier on the right
  pipes(o = {}) {
    const NN = 4, T = 88, X0 = 80, Y0 = 112, rot = (m) => ((m << 1) | (m >> 3)) & 15, DIRS = [[1, 0, -1], [2, 1, 0], [4, 0, 1], [8, -1, 0]], OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };
    const g2 = Array.from({ length: NN }, () => Array(NN).fill(0)), path = new Set();
    let r = Math.floor(Math.random() * NN); const r0 = r;
    for (let x = 0; x < NN; x++) { const t = Math.floor(Math.random() * NN), st = t > r ? 1 : -1;
      for (let y = r; ; y += st) { let m = 0; m |= y === r ? 8 : (st > 0 ? 1 : 4); m |= y === t ? 2 : (st > 0 ? 4 : 1); g2[y][x] = m; path.add(y * NN + x); if (y === t) break; } r = t; }
    const r1 = r;
    for (let y = 0; y < NN; y++) for (let x = 0; x < NN; x++) if (!path.has(y * NN + x)) g2[y][x] = [5, 3, 7, 3][Math.floor(Math.random() * 4)];
    for (let y = 0; y < NN; y++) for (let x = 0; x < NN; x++) for (let k = 1 + Math.floor(Math.random() * 3); k > 0; k--) g2[y][x] = rot(g2[y][x]);
    const s = { title: o.title || 'FIX THE CAR PARK BARRIER', on: new Set(), done: false, win: 0, _g: g2, _r0: r0, _r1: r1 };
    const flow = () => { const seen = new Set(), q = []; if (g2[r0][0] & 8) { q.push([0, r0]); seen.add(r0 * NN); }
      while (q.length) { const [x, y] = q.shift(); for (const [d, dx, dy] of DIRS) if (g2[y][x] & d) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= NN || ny >= NN) continue; if (!(g2[ny][nx] & OPP[d]) || seen.has(ny * NN + nx)) continue; seen.add(ny * NN + nx); q.push([nx, ny]); } }
      s.on = seen; return seen.has(r1 * NN + NN - 1) && (g2[r1][NN - 1] & 2); };
    flow();
    s.down = (x, y) => { if (s.win) return; const cx = Math.floor((x - X0) / T), cy = Math.floor((y - Y0) / T); if (cx < 0 || cy < 0 || cx >= NN || cy >= NN) return; g2[cy][cx] = rot(g2[cy][cx]); sfx('tick', null, 0.4); if (flow()) { s.win = 0.001; sfx('zap', null, 0.6); } };
    s.move = () => {}; s.up = () => {}; s.update = (dt) => { if (s.win) { s.win += dt; if (s.win > 0.9) s.done = true; } };
    s.draw = (g) => { frame(g, s.title); txt(g, s.win ? '⚡ BARRIER UP!' : 'TAP TILES TO TURN THEM · POWER TO THE BARRIER', S / 2, 80, 17, s.win ? '#39ff14' : '#fff');
      for (let y = 0; y < NN; y++) for (let x = 0; x < NN; x++) { const px = X0 + x * T, py = Y0 + y * T, m = g2[y][x], live = s.on.has(y * NN + x);
        g.fillStyle = '#2a2f45'; rr(g, px + 3, py + 3, T - 6, T - 6, 10); g.fill(); g.strokeStyle = live ? '#ffd400' : '#8a93a8'; g.lineWidth = 16; g.lineCap = 'round';
        const c = [px + T / 2, py + T / 2]; for (const [d, dx, dy] of DIRS) if (m & d) { g.beginPath(); g.moveTo(...c); g.lineTo(c[0] + dx * T / 2, c[1] + dy * T / 2); g.stroke(); } g.lineCap = 'butt'; }
      g.fillStyle = '#ffd400'; rr(g, X0 - 60, Y0 + r0 * T + 20, 50, T - 40, 8); g.fill(); txt(g, '⚡', X0 - 35, Y0 + r0 * T + T / 2, 22, '#111');
      g.fillStyle = s.win ? '#39ff14' : '#c62828'; rr(g, X0 + NN * T + 8, Y0 + r1 * T + 20, 50, T - 40, 8); g.fill(); txt(g, s.win ? '⬆' : '🚧', X0 + NN * T + 33, Y0 + r1 * T + T / 2, 20, '#fff'); };
    return s;
  },
};
export const makeGame = (kind, o) => GAMES[kind](o || {});

// ------------------------------------------------------------------ the panel they're played on
export class Panel {
  constructor({ scene, player, renderer }) {
    this.scene = scene; this.player = player; this.renderer = renderer;
    this.cv = document.createElement('canvas'); this.cv.width = this.cv.height = S; this.g = this.cv.getContext('2d');
    // phone / computer: a box in the middle of the screen
    this.wrap = document.createElement('div'); this.wrap.id = 'imp-panel';
    Object.assign(this.wrap.style, { position: 'fixed', inset: '0', display: 'none', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', zIndex: 70, touchAction: 'none' });
    Object.assign(this.cv.style, { width: 'min(92vw, 78vh)', height: 'min(92vw, 78vh)', touchAction: 'none', borderRadius: '24px' });
    this.x = document.createElement('button'); this.x.textContent = '✕'; Object.assign(this.x.style, { position: 'absolute', top: 'max(12px, env(safe-area-inset-top))', right: '14px', width: '54px', height: '54px', borderRadius: '50%', border: '3px solid #fff', background: '#c62828', color: '#fff', font: '900 24px Arial', zIndex: 71 });
    this.wrap.append(this.cv, this.x); document.body.appendChild(this.wrap);
    const at = (e) => { const r = this.cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * S, (e.clientY - r.top) / r.height * S]; };
    this.cv.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); try { this.cv.setPointerCapture(e.pointerId); } catch (er) {} const [x, y] = at(e); this.input('down', x, y); });
    this.cv.addEventListener('pointermove', (e) => { const [x, y] = at(e); this.input('move', x, y); });
    this.cv.addEventListener('pointerup', (e) => { const [x, y] = at(e); this.input('up', x, y); });
    this.cv.addEventListener('pointercancel', () => this.input('up', -1, -1));
    this.x.addEventListener('click', (e) => { e.stopPropagation(); if (this.canClose) this.close(); });
    ['pointerdown', 'touchstart', 'mousedown', 'wheel'].forEach(k => this.wrap.addEventListener(k, (e) => e.stopPropagation()));
    // VR: the same picture on a panel in front of you, a dot where you're pointing
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, depthWrite: false })); this.mesh.renderOrder = 64; this.mesh.visible = false; scene.add(this.mesh);
    this.dot = new THREE.Mesh(new THREE.CircleGeometry(0.012, 16), new THREE.MeshBasicMaterial({ color: 0xffd400, depthTest: false })); this.dot.renderOrder = 65; this.dot.visible = false; scene.add(this.dot);
    this.ray = new THREE.Raycaster(); this.trigWas = false; this.cur = null; this.t = 0;
  }
  get open() { return !!this.cur; }
  // show something: a game (has draw/down/move/up/update/done) or a screen (draw + down only)
  show(thing, { onDone, onClose, canClose = true } = {}) {
    this.cur = thing; this.onDone = onDone; this.onClose = onClose; this.canClose = canClose; this.t = 0; this.doneT = 0;
    this.x.style.display = canClose ? '' : 'none';
    const vr = this.renderer.xr.isPresenting;
    this.wrap.style.display = vr ? 'none' : 'flex'; this.mesh.visible = vr; this.placed = false;
    this.player.menuLock = true; if (this.player.flatMove) this.player.flatMove = { x: 0, z: 0 };
    this.redraw();
  }
  close(silent) { const was = this.cur; this.cur = null; this.wrap.style.display = 'none'; this.mesh.visible = false; this.dot.visible = false; this.player.menuLock = false; if (was && !silent && this.onClose) this.onClose(); }
  input(kind, x, y) { const c = this.cur; if (!c || this.doneT > 0) return; c[kind] && c[kind](x, y); this.redraw(); }
  redraw() { const c = this.cur; if (!c) return; this.g.clearRect(0, 0, S, S); c.draw(this.g, this.t); if (this.doneT > 0) { this.g.fillStyle = 'rgba(0,40,0,0.55)'; rr(this.g, 4, 4, S - 8, S - 8, 30); this.g.fill(); txt(this.g, '✓ TASK DONE!', S / 2, S / 2, 52, '#39ff14'); } this.tex.needsUpdate = true; }
  update(dt) {
    const c = this.cur; if (!c) return; this.t += dt;
    const vr = this.renderer.xr.isPresenting;
    if (vr !== this.mesh.visible) { this.wrap.style.display = vr ? 'none' : 'flex'; this.mesh.visible = vr; this.placed = false; }
    if (vr) this.vrPoint();
    c.update && c.update(dt);
    if (c.done && this.doneT === 0) { this.doneT = 0.001; sfx('fixed', null, 0.6); }
    if (this.doneT > 0) { this.doneT += dt; if (this.doneT > 0.9) { const f = this.onDone; this.close(true); f && f(); return; } }
    this.redraw();
  }
  // VR: put the panel in front (once), then the right controller's ray is the pointer and its trigger is the "touch"
  vrPoint() {
    const P = this.player;
    if (!this.placed) { this.placed = true; const f = new THREE.Vector3(P.fwd.x, 0, P.fwd.z).normalize(); this.mesh.position.copy(P.head).addScaledVector(f, 0.62).add({ x: 0, y: -0.12, z: 0 }); this.mesh.lookAt(P.head); }
    const h = (P.hands || []).find(h => h.source && h.handedness === 'right' && h.ctrl) || (P.hands || []).find(h => h.source && h.ctrl); if (!h) return;
    const gp = h.source.gamepad, trig = !!(gp && gp.buttons[0] && gp.buttons[0].pressed), bBtn = !!(gp && gp.buttons[5] && gp.buttons[5].pressed);
    const o = new THREE.Vector3(), q = new THREE.Quaternion(); h.ctrl.getWorldPosition(o); h.ctrl.getWorldQuaternion(q);
    this.ray.set(o, new THREE.Vector3(0, 0, -1).applyQuaternion(q)); const hit = this.ray.intersectObject(this.mesh, false)[0];
    if (bBtn && !this.bWas && this.canClose) { this.bWas = bBtn; this.close(); return; } this.bWas = bBtn;
    if (hit && hit.uv) { const x = hit.uv.x * S, y = (1 - hit.uv.y) * S; this.dot.visible = true; this.dot.position.copy(hit.point); this.dot.quaternion.copy(this.mesh.quaternion);
      if (trig && !this.trigWas) { this.input('down', x, y); h.pulse && h.pulse(0.3, 20); } else if (trig) this.input('move', x, y); else if (this.trigWas) this.input('up', x, y); else this.input('move', x, y); }
    else { this.dot.visible = false; if (this.trigWas && !trig) this.input('up', -1, -1); }
    this.trigWas = trig;
  }
}
