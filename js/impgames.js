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
    s.up = () => { if (!s.pouring) return; s.pouring = false; if (s.fill >= 0.84 && s.fill <= 0.95) { s.settle = 0.001; sfx('guinness', null, 0.6); } else if (s.fill > 0.1) { s.fail = 1.2; sfx('spill', null, 0.6); } };
    s.update = (dt) => { if (s.pouring) { s.fill += dt * 0.32; if ((s.pourT = (s.pourT || 0) - dt) <= 0) { s.pourT = 0.18; sfx('pour', null, 0.15); } if (s.fill > 1.02) { s.pouring = false; s.fail = 1.2; sfx('spill', null, 0.7); } }
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
    s.move = (x, y) => { if (s.last === null) return; const a = Math.atan2(y - 280, x - 256); let d = a - s.last; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; if (d > 0) s.turned += d; s.last = a; if ((s.clk = (s.clk || 0) + Math.abs(d)) > 0.8) { s.clk = 0; sfx('ratchet', null, 0.3); } if (s.turned >= s.need && !s.done) { s.done = true; sfx('gas_hiss', null, 0.7); } };
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
      if (s.x < 320) s.msg = 'SWIPE ALL THE WAY'; else if (dt < 0.55) s.msg = 'TOO FAST. TRY AGAIN.'; else if (dt > 1.15) s.msg = 'TOO SLOW. TRY AGAIN.'; else if (++s.good < s.need) { s.msg = 'READ OK. SWIPE AGAIN TO CONFIRM'; s.msgT = 1.4; s.x = 60; sfx('card_beep', null, 0.5); return; } else { s.msg = 'ACCEPTED ✓'; s.ok = 0.6; sfx('receipt', null, 0.7); }
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
    s.up = (x, y) => { if (s.drag === null) return; const i = s.drag, p = Rt(i); if (Math.hypot(x - p.x, y - p.y) < (n > 4 ? 32 : 45)) { s.joined[i] = true; sfx('plug_in', null, 0.5); if (s.joined.every(Boolean)) { s.done = true; sfx('decks_on', null, 0.7); } } s.drag = null; };
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
    s.down = (x, y) => { for (const b of s.bits) if (!b.got && Math.hypot(x - b.x, y - b.y) < 40) { b.got = 0.001; sfx('coins', null, 0.4); return; } };
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
    s.down = () => { s.p += 0.045; s.bob = 1; sfx('plunger', null, 0.35); if (s.p >= 1 && !s.done) { s.done = true; sfx('flush', null, 0.8); } };
    s.move = () => {}; s.up = () => {};
    s.update = (dt) => { s.p = Math.max(0, s.p - dt * (0.1 + s.p * 0.08)); s.bob = Math.max(0, s.bob - dt * 6); };
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
    s.down = (x, y) => { cells.forEach((c, j) => { if (!inside(x, y, box(j)) || c.i < s.next) return; if (c.i === s.next) { s.next++; sfx('page_flip', null, 0.5); if (s.next >= list.length) { s.done = true; sfx('stamp', null, 0.8); } } else { s.next = 0; s.bad = 0.8; sfx('error', null, 0.5); } }); };
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
    s.move = (x, y) => { s.cx = x; s.cy = y; if (!s.drag) return; for (const p of s.spots) if (p.a > 0 && Math.hypot(x - p.x, y - p.y) < p.r + 26) { p.a -= 0.018 * (p.k || 1); if ((s.sq = (s.sq || 0) + 1) % 9 === 0) sfx('wipe', null, 0.25); } if (s.spots.every(p => p.a <= 0)) s.done = true; };
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
    const code = String(Math.floor(10000000 + Math.random() * 89999999)), s = { title: o.title || 'RESET THE SLOT MACHINE', typed: '', bad: 0, done: false, show: 4, _code: code };
    const key = (k) => ({ x: 146 + (k === 'C' ? 0 : k === '0' ? 1 : k === 'OK' ? 2 : (Number(k) - 1) % 3) * 76, y: 200 + (k === 'C' || k === '0' || k === 'OK' ? 3 : Math.floor((Number(k) - 1) / 3)) * 70, w: 68, h: 62 });
    const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'];
    s.down = (x, y) => { for (const k of KEYS) if (inside(x, y, key(k))) { sfx('keypad', null, 0.4);
      if (k === 'C') s.typed = ''; else if (k === 'OK') { if (s.typed === code) { s.done = true; sfx('unlock', null, 0.7); } else { s.bad = 0.9; s.typed = ''; s.show = 3.5; sfx('error', null, 0.5); } } else if (s.typed.length < 8) s.typed += k; } };
    s.move = () => {}; s.up = () => {}; s.update = (dt) => { if (s.bad > 0) s.bad -= dt; if (s.show > 0) s.show -= dt; };
    s.draw = (g) => { frame(g, s.title);
      if (s.show <= 0) { g.fillStyle = '#c9b48a'; g.save(); g.translate(40, 70); g.rotate(-0.06); rr(g, 0, 0, 150, 90, 6); g.fill(); txt(g, 'REMEMBER IT?', 75, 45, 15, '#5a3a1a'); g.restore(); } else {
      g.fillStyle = '#fffbe6'; g.save(); g.translate(40, 70); g.rotate(-0.06); rr(g, 0, 0, 150, 90, 6); g.fill(); txt(g, 'MEMORISE IT', 75, 24, 16, '#c62828'); txt(g, code, 75, 60, 28, '#222'); g.restore(); } if (s.show > 0) { g.fillStyle = '#ffd400'; g.fillRect(40, 166, 150 * Math.min(1, s.show / 4), 6); }
      g.fillStyle = '#000'; rr(g, 220, 100, 250, 70, 10); g.fill(); txt(g, s.bad > 0 ? 'ERROR' : (s.typed || '______'), 345, 136, 36, s.bad > 0 ? '#ff4d4d' : '#39ff14');
      for (const k of KEYS) btn(g, key(k), k, k === 'OK' ? '#2e7d32' : k === 'C' ? '#c62828' : '#3a4a8a', 26);
    };
    return s;
  },
  // DIAL: stop the needle in the green (the keg pressure / the fuse box)
  dial(o = {}) {
    const s = { title: o.title || 'CHECK THE KEG PRESSURE', a: 0, v: 1.6, hits: 0, need: o.need || 3, flash: 0, zone: [0.15, 0.45], done: false };
    const B = { x: 156, y: 400, w: 200, h: 70 };
    s.down = (x, y) => { if (!inside(x, y, B)) return; const k = (Math.sin(s.a) + 1) / 2; if (k >= s.zone[0] && k <= s.zone[1]) { s.hits++; s.flash = 0.4; sfx('gas_hiss', null, 0.4); s.v *= 1.32; const c = 0.15 + Math.random() * 0.55; s.zone = [c, c + 0.28 - s.hits * 0.04]; if (s.hits >= s.need) s.done = true; } else { s.flash = -0.4; s.hits = Math.max(0, s.hits - 1); sfx('error', null, 0.5); } };
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
    s.down = (x, y) => { for (let i = 0; i < n; i++) if (inside(x, y, box(i))) { flip(i); sfx('breaker', null, 0.6); if (on.every(Boolean)) s.done = true; } };
    s.move = () => {}; s.up = () => {}; s.update = () => {};
    s.draw = (g) => { frame(g, s.title); txt(g, 'ALL UP · EACH ONE FLIPS ITS NEIGHBOURS TOO', S / 2, 90, 18);
      for (let i = 0; i < n; i++) { const b = box(i); g.fillStyle = '#2a2a2a'; rr(g, b.x, b.y, b.w, b.h, 10); g.fill(); g.fillStyle = on[i] ? '#39ff14' : '#ff3b3b'; g.beginPath(); g.arc(b.x + b.w / 2, b.y - 22, 12, 0, 7); g.fill();
        g.fillStyle = '#ddd'; rr(g, b.x + 14, on[i] ? b.y + 14 : b.y + b.h - 84, b.w - 28, 70, 8); g.fill(); }
      if (on.every(Boolean)) txt(g, '💡 LIGHTS ON', S / 2, 440, 30, '#ffd400');
    };
    return s;
  },

  // COUPLER: change the barrel properly: gas off, lift the coupler's handle, move it from the empty keg to the new one,
  // push the handle down, gas back on. In that order
  coupler(o = {}) {
    const GAS = { x: 70, y: 186 }, OLD = { x: 140, y: 292 }, NEW = { x: 372, y: 292 };
    const s = { title: o.title || 'CHANGE THE BARREL', step: 0, gasOn: true, lifted: false, at: OLD, carry: null, grab: null, msg: '', msgT: 0, done: false, _G: GAS, _O: OLD, _N: NEW };
    // the handle's grip: sticking out sideways when it's down, straight up when it's lifted
    s._tip = () => { const c = s.carry || s.at; return { x: c.x + (s.lifted ? 0 : 70), y: c.y - (s.lifted ? 70 : 0) }; };
    const nope = (m) => { s.msg = m; s.msgT = 1.2; sfx('error', null, 0.4); };
    s.down = (x, y) => { s.grab = null;
      if (Math.hypot(x - GAS.x, y - GAS.y) < 46) { if (s.step === 0) { s.gasOn = false; s.step = 1; sfx('gas_tap', null, 0.6); } else if (s.step === 4) { s.gasOn = true; s.step = 5; s.done = true; sfx('gas_hiss', null, 0.6); } else nope(s.step < 4 ? 'THE GAS IS OFF: CHANGE THE BARREL' : 'NOT YET'); return; }
      const t2 = s._tip(); if (Math.hypot(x - t2.x, y - t2.y) < 44) { if (s.step === 1 || s.step === 3) s.grab = { k: 'handle', y }; else nope(s.step === 0 ? 'TURN THE GAS OFF FIRST' : 'MOVE THE COUPLER ACROSS'); return; }
      if (Math.hypot(x - s.at.x, y - s.at.y) < 46) { if (s.step === 2) { s.grab = { k: 'coupler' }; s.carry = { x, y }; } else nope(s.step < 2 ? 'LIFT THE HANDLE FIRST' : 'PUSH THE HANDLE DOWN'); } };
    s.move = (x, y) => { const gb = s.grab; if (!gb) return;
      if (gb.k === 'handle') { if (s.step === 1 && gb.y - y > 50) { s.lifted = true; s.step = 2; s.grab = null; sfx('coupler', null, 0.6); } else if (s.step === 3 && y - gb.y > 50) { s.lifted = false; s.step = 4; s.grab = null; sfx('coupler', null, 0.6); } }
      else s.carry = { x, y }; };
    s.up = () => { const gb = s.grab; s.grab = null; if (!gb || gb.k !== 'coupler') return; const c = s.carry; s.carry = null;
      if (c && Math.hypot(c.x - NEW.x, c.y - NEW.y) < 70) { s.at = NEW; s.step = 3; sfx('keg_roll', null, 0.6); } else if (c && Math.hypot(c.x - OLD.x, c.y - OLD.y) > 70) nope('PUT IT ON THE NEW BARREL'); };
    s.update = (dt) => { if (s.msgT > 0) s.msgT -= dt; };
    return s;
  },
  // RAISE: push the parasol's runner up the pole with long upward strokes: it slides back down if you stop, until it clicks open
  raise(o = {}) {
    const s = { title: o.title || 'PUT THE PARASOL UP', k: 0, last: null, done: false, click: 0 };
    s.down = (x, y) => { if (Math.abs(x - 256) < 90) s.last = y; };
    s.move = (x, y) => { if (s.last === null || s.done) return; const d = s.last - y; if (d > 0) { s.k = Math.min(1, s.k + d / 1100); if ((s.cr = (s.cr || 0) + d) > 60) { s.cr = 0; sfx('pulley', null, 0.3); } } s.last = y; if (s.k >= 1) { s.done = true; sfx('parasol', null, 0.8); } };
    s.up = () => { s.last = null; };
    s.update = (dt) => { if (!s.done && s.last === null && s.k > 0) s.k = Math.max(0, s.k - dt * 0.09); };
    return s;
  },
  // ================================================================ the new ones (one game per job)
  // REELS: stop each reel on a cherry (the fruit machine). A reel that lands on anything else: they all spin again
  reels(o = {}) {
    // two cherries on every reel; stop the lit reel on one (tap anywhere). A miss: just that reel spins again
    const SY = ['🍒', '🍋', '🔔', '🍒', '🍇', '💎'], N = SY.length, CH = (p) => { const i = ((p % N) + N) % N; return i === 0 || i === 3; };
    const s = { title: o.title || 'EMPTY THE FRUIT MACHINE', SY, reels: [1.7, 2.1, 2.5].map(v => ({ p: Math.random() * N, v, stop: false })), cur: 0, msg: '', msgT: 0, win: 0, done: false };
    s.down = (x, y) => { if (s.msgT > 0 || s.win || s.cur > 2) return; if (x > 20 && x < 120 && y > 410) return;      // (NUDGE / HOLD are just for show)
      const r = s.reels[s.cur]; r.p = Math.round(r.p); r.stop = true; sfx('reel_stop', null, 0.6);
      if (!CH(r.p)) { s.msg = `NO CHERRY ON REEL ${s.cur + 1}! IT SPINS AGAIN`; s.msgT = 0.9; s.missed = s.cur; sfx('error', null, 0.5); return; }
      sfx('cherry', null, 0.5); if (++s.cur >= 3) { s.win = 0.001; sfx('jackpot', null, 0.7); } };
    s.move = () => {}; s.up = () => {};
    s.update = (dt) => { for (const r of s.reels) if (!r.stop) r.p += r.v * dt;
      if (s.msgT > 0 && (s.msgT -= dt) <= 0 && s.missed !== undefined) { s.reels[s.missed].stop = false; s.reels[s.missed].p += 0.5; s.missed = undefined; }
      if (s.win) { s.win += dt; if (s.win > 1.2) s.done = true; } };
    return s;
  },
  // CATCH: the loo rolls drop from the shelf: catch them in the basket. Drop three and you start again
  catch(o = {}) {
    // harder: more of them, faster, a narrower basket, two drops and you start again, and soggy ones you must NOT catch
    const need = o.n || 10, s = { need, title: o.title || 'RESTOCK THE LOO ROLL', bx: 256, bw: 54, rolls: [], got: 0, miss: 0, maxMiss: 2, next: 0.6, msg: '', msgT: 0, done: false };
    s.down = (x) => { s.bx = Math.max(60, Math.min(452, x)); }; s.move = (x) => { s.bx = Math.max(60, Math.min(452, x)); }; s.up = () => {};
    s.update = (dt) => { if (s.done) return; if (s.msgT > 0) s.msgT -= dt;
      if ((s.next -= dt) <= 0) { s.next = Math.max(0.42, 0.95 - s.got * 0.05) * (0.75 + Math.random() * 0.4); const wet = s.got > 1 && Math.random() < 0.22;
        s.rolls.push({ x: 60 + Math.random() * 392, y: 110, v: 210 + s.got * 22 + Math.random() * 40, r: Math.random() * 6, wet }); }
      for (const r of s.rolls) { r.y += r.v * dt; r.r += dt * 3;
        if (!r.gone && r.y > 410 && r.y < 450 && Math.abs(r.x - s.bx) < s.bw + 10) { r.gone = true;
          if (r.wet) { s.got = Math.max(0, s.got - 2); s.msg = 'SOGGY ONE! -2'; s.msgT = 1; sfx('soggy', null, 0.5); } else { s.got++; sfx('loo_catch', null, 0.5); if (s.got >= need) s.done = true; } }
        if (!r.gone && r.y > 480) { r.gone = true; if (r.wet) continue; if (++s.miss >= s.maxMiss) { s.got = 0; s.miss = 0; s.msg = 'DROPPED TWO! START AGAIN'; s.msgT = 1.2; sfx('error', null, 0.5); } else sfx('hit_cardboard', null, 0.4); } }
      s.rolls = s.rolls.filter(r => !r.gone); };
    return s;
  },
  // TEMP: hold to heat the fryer, let go to cool: keep it in the green (which moves) until the chips are done. Too hot: fire
  temp(o = {}) {
    const s = { title: o.title || 'CLEAN THE FRYER', T: 0.3, heat: false, cooked: 0, need: 5, fire: 0, band: 0.62, done: false };
    s.down = () => { s.heat = true; }; s.up = () => { s.heat = false; }; s.move = () => {};
    s.update = (dt) => { if (s.done) return; s.t = (s.t || 0) + dt; s.band = 0.6 + Math.sin(s.t * 0.7) * 0.14;
      if (s.fire > 0) { s.fire -= dt; s.T = Math.max(0.2, s.T - dt * 0.4); return; }
      s.T += (s.heat ? 0.42 : -0.3) * dt + Math.sin(s.t * 3.1) * 0.02 * dt; s.T = Math.max(0, Math.min(1, s.T));
      if (Math.abs(s.T - s.band) < 0.09) { s.cooked += dt; if ((s.ss = (s.ss || 0) - dt) <= 0) { s.ss = 0.5; sfx('fry', null, 0.25); } if (s.cooked >= s.need) { s.done = true; } }
      if (s.T >= 0.98) { s.fire = 1.6; s.cooked = 0; sfx('flare', null, 0.6); } };
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
    const s = { need, title: o.title || 'WASH THE POTS', item: 0, ix: 256, iy: 170, drag: false, got: 0, time: 22, bad: 0, done: false };
    const bin = (i) => ({ x: 30 + i * 158, y: 360, w: 140, h: 110 }), next = () => { s.item = Math.floor(Math.random() * 3); s.ix = 256; s.iy = 170; };
    next();
    s.down = (x, y) => { if (Math.hypot(x - s.ix, y - s.iy) < 60) s.drag = true; }; s.move = (x, y) => { if (s.drag) { s.ix = x; s.iy = y; } };
    s.up = (x, y) => { if (!s.drag) return; s.drag = false; for (let i = 0; i < 3; i++) if (inside(x, y, bin(i))) { if (i === s.item) { s.got++; sfx('dish_splash', null, 0.4); if (s.got >= need) s.done = true; next(); } else { s.got = Math.max(0, s.got - 2); s.bad = 0.8; sfx('error', null, 0.5); next(); } return; } s.ix = 256; s.iy = 170; };
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
    const need = 12, s = { need, title: o.title || 'COLLECT THE EMPTIES', ups: [], got: 0, miss: 0, next: 0.5, msg: '', msgT: 0, done: false };
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
      if (s.seq[s.pos] === i) { sfx('clock_beep', null, 0.5); if (++s.pos >= s.seq.length) { if (s.len >= 5) { s.done = true; sfx('punch_clock', null, 0.8); } else { s.len++; s.st = 'wait'; s.t = 0.7; } } }
      else { s.bad = 1.2; s.len = 3; s.st = 'wait'; s.t = 1.2; sfx('error', null, 0.6); } } };
    s.move = () => {}; s.up = () => {};
    s.update = (dt) => { if (s.done) return; if (s.litT > 0 && (s.litT -= dt) <= 0) s.lit = -1; if (s.bad > 0) s.bad -= dt;
      if (s.st === 'wait' && (s.t -= dt) <= 0) { s.seq = Array.from({ length: s.len }, () => Math.floor(Math.random() * 4)); s.pos = 0; s.st = 'show'; s.t = 0; }
      else if (s.st === 'show') { s.t += dt; const i = Math.floor(s.t / 0.6); if (i >= s.seq.length) { s.st = 'input'; s.lit = -1; } else if (s.t % 0.6 < 0.4) { if (s.lit !== s.seq[i] || s.litT <= 0) { if (s.lit !== s.seq[i]) sfx('clock_beep', null, 0.4); s.lit = s.seq[i]; s.litT = 0.4 - (s.t % 0.6); } } else s.lit = -1; } };
    s.draw = (g) => { frame(g, s.title, s.bad > 0 ? '#ff4d4d' : '#ffd400');
      txt(g, s.bad > 0 ? 'WRONG! WATCH AGAIN' : s.st === 'input' ? `NOW COPY IT · ROUND ${s.len - 2} OF 3` : 'WATCH THE PATTERN...', S / 2, 84, 22, s.bad > 0 ? '#ff6b6b' : '#fff');
      for (let i = 0; i < 4; i++) { const b = pad(i); g.globalAlpha = s.lit === i ? 1 : 0.3; g.fillStyle = C[i]; rr(g, b.x, b.y, b.w, b.h, 20); g.fill(); g.globalAlpha = 1; g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,0.5)'; rr(g, b.x, b.y, b.w, b.h, 20); g.stroke(); }
      txt(g, `${s.st === 'input' ? s.pos : 0} / ${s.len}`, S / 2, 482, 22, '#ffd400'); };
    return s;
  },
  // PLACE: lay each place setting: the fork on the left of the plate, the knife on the right
  place(o = {}) {
    const P = [106, 256, 406], slots = [], s = { title: o.title || 'LAY THE TABLES', items: [], drag: null, ox: 0, oy: 0, msg: '', msgT: 0, done: false, _slots: slots };
    for (const x of P) { slots.push({ x: x - 52, y: 220, k: 'fork', f: null }); slots.push({ x: x + 52, y: 220, k: 'knife', f: null }); }
    shuffle(['fork', 'fork', 'fork', 'knife', 'knife', 'knife']).forEach((k, i) => s.items.push({ k, x: 70 + i * 74, y: 420, hx: 70 + i * 74, hy: 420, on: null }));
    s.down = (x, y) => { for (const it of s.items) if (!it.on && Math.abs(x - it.x) < 30 && Math.abs(y - it.y) < 60) { s.drag = it; s.ox = x - it.x; s.oy = y - it.y; return; } };
    s.move = (x, y) => { if (s.drag) { s.drag.x = x - s.ox; s.drag.y = y - s.oy; } };
    s.up = () => { const it = s.drag; if (!it) return; s.drag = null; const sl = slots.find(q => !q.f && Math.hypot(q.x - it.x, q.y - it.y) < 44);
      if (sl && sl.k === it.k) { sl.f = it; it.on = sl; it.x = sl.x; it.y = sl.y; sfx('cutlery', null, 0.5); if (slots.every(q => q.f)) s.done = true; }
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
    const C = [[96, 300], [176, 260], [256, 300], [336, 260], [416, 300]], s = { _C: C, title: o.title || 'LIGHT THE CANDLES', lit: C.map(() => false), heat: C.map(() => 0), mx: -99, my: -99, hold: false, gust: 3.2, blow: 0, done: false };
    s.down = (x, y) => { s.hold = true; s.mx = x; s.my = y; }; s.move = (x, y) => { s.mx = x; s.my = y; }; s.up = () => { s.hold = false; };
    s.update = (dt) => { if (s.done) return; if (s.blow > 0) s.blow -= dt;
      C.forEach(([x, y], i) => { if (!s.lit[i] && s.hold && Math.hypot(s.mx - x, s.my - (y - 70)) < 34) { s.heat[i] += dt; if (s.heat[i] > 0.55) { s.lit[i] = true; s.heat[i] = 0; sfx('match', null, 0.4); } } else if (!s.lit[i]) s.heat[i] = Math.max(0, s.heat[i] - dt); });
      if (s.lit.every(Boolean)) { s.done = true; return; }
      if ((s.gust -= dt) <= 0) { s.gust = 2.2 + Math.random() * 1.6; const on = s.lit.map((v, i) => v ? i : -1).filter(i => i >= 0); if (on.length) { s.lit[on[Math.floor(Math.random() * on.length)]] = false; s.blow = 0.8; sfx('gust', null, 0.5); } } };
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
    const need = 7, s = { need, title: o.title || 'CLEAR THE GARDEN GLASSES', rows: [{ x: 156, w: 200 }], cur: null, dir: 1, msg: '', msgT: 0, done: false };
    const newRow = () => { const top = s.rows[s.rows.length - 1]; s.cur = { x: 40, w: top.w, v: 170 + s.rows.length * 34 }; s.dir = 1; };
    newRow(); const H = 40, base = 450;
    s.down = () => { if (s.msgT > 0 || s.done) return; const top = s.rows[s.rows.length - 1], c = s.cur, l = Math.max(c.x, top.x), r = Math.min(c.x + c.w, top.x + top.w);
      if (r - l < 14) { s.msg = 'CRASH! START AGAIN'; s.msgT = 1.2; sfx('shatter', null, 0.6); return; }
      s.rows.push({ x: l, w: r - l }); sfx('glass_stack', null, 0.5); if (s.rows.length - 1 >= need) { s.done = true; s.cur = null; return; } newRow(); };
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
    const PAN = { x: 196, y: 420, w: 120, h: 56 }, s = { title: o.title || 'SWEEP UP THE GLASS', bits: [], px: null, py: null, done: false, _pan: PAN };
    for (let i = 0; i < 12; i++) s.bits.push({ x: 70 + Math.random() * 372, y: 120 + Math.random() * 220, r: Math.random() * 6, n: 3 + Math.floor(Math.random() * 3), got: false });
    s.down = (x, y) => { s.px = x; s.py = y; }; s.up = () => { s.px = null; };
    s.move = (x, y) => { if (s.px === null) return; const dx = x - s.px, dy = y - s.py; for (const b of s.bits) if (!b.got && Math.hypot(b.x - x, b.y - y) < 46) { b.x = Math.max(30, Math.min(482, b.x + dx * 0.9)); b.y = Math.max(110, Math.min(476, b.y + dy * 0.9)); b.r += dx * 0.02;
        if (inside(b.x, b.y, PAN)) { b.got = true; sfx('shard', null, 0.4); } }
      s.px = x; s.py = y; if (s.bits.every(b => b.got)) s.done = true; if ((s.sw = (s.sw || 0) + Math.hypot(dx, dy)) > 120) { s.sw = 0; sfx('broom', null, 0.25); } };
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
    s.down = (x, y) => { if (s.win) return; const cx = Math.floor((x - X0) / T), cy = Math.floor((y - Y0) / T); if (cx < 0 || cy < 0 || cx >= NN || cy >= NN) return; g2[cy][cx] = rot(g2[cy][cx]); sfx('pipe_turn', null, 0.4); if (flow()) { s.win = 0.001; sfx('barrier', null, 0.7); } };
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

// ================================================================== THE PICTURES
// Every job is drawn as the real thing it's named after (the rules above are untouched: only what you see changes).
// The turning-wheel jobs each get their own scene: the barrel coupler, the parasol (you watch it go up), the keg valve.
const P = {
  // a scene: background painted inside the rounded frame, then the border and a title band on top
  scene(g, title, paint, col = '#ffd400') {
    g.save(); rr(g, 4, 4, S - 8, S - 8, 30); g.clip(); paint(); g.fillStyle = 'rgba(8,10,24,0.72)'; g.fillRect(0, 0, S, 62); g.restore();
    g.lineWidth = 8; g.strokeStyle = col; rr(g, 4, 4, S - 8, S - 8, 30); g.stroke(); txt(g, title, S / 2, 34, 28, col);
  },
  hint(g, s, y = 82, col = '#fff', size = 19) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.font = `900 ${size}px ${FONT}`; const w = Math.min(470, g.measureText(s).width + 26); rr(g, S / 2 - w / 2, y - 15, w, 30, 15); g.fill(); txt(g, s, S / 2, y, size, col); },
  grad(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; },
  wood(g, x, y, w, h, c1 = '#8a5a2b', c2 = 'rgba(60,30,10,0.35)') { g.fillStyle = c1; g.fillRect(x, y, w, h); g.strokeStyle = c2; g.lineWidth = 2; for (let i = 6; i < h; i += 13) { g.beginPath(); g.moveTo(x, y + i); g.bezierCurveTo(x + w * 0.3, y + i + 5, x + w * 0.6, y + i - 4, x + w, y + i + 2); g.stroke(); } },
  tiles(g, x, y, w, h, sz = 42, c = '#e9eef2', l = '#c3ccd4') { g.fillStyle = c; g.fillRect(x, y, w, h); g.strokeStyle = l; g.lineWidth = 2; for (let i = x; i <= x + w; i += sz) { g.beginPath(); g.moveTo(i, y); g.lineTo(i, y + h); g.stroke(); } for (let j = y; j <= y + h; j += sz) { g.beginPath(); g.moveTo(x, j); g.lineTo(x + w, j); g.stroke(); } },
  brick(g, x, y, w, h) { g.fillStyle = '#5a3326'; g.fillRect(x, y, w, h); for (let r = 0, j = y; j < y + h; j += 22, r++) for (let i = x - (r % 2) * 24; i < x + w; i += 48) { g.fillStyle = ['#8a4a36', '#7c4030', '#94533c'][(r + Math.floor(i / 48)) % 3]; g.fillRect(i + 2, j + 2, 44, 18); } },
  steel(g, x, y, w, h, r = 10) { g.fillStyle = P.grad(g, x, y, x + w, y, ['#8d939a', '#e3e7ea', '#a9afb5', '#d4d8dc', '#80868c']); rr(g, x, y, w, h, r); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; rr(g, x, y, w, h, r); g.stroke(); },
  pint(g, x, y, h, fill = 0, col = '#c98a1a', head = true) {      // a straight pint glass, base at (x, y)
    const w0 = h * 0.28, w1 = h * 0.36; g.beginPath(); g.moveTo(x - w1, y - h); g.lineTo(x + w1, y - h); g.lineTo(x + w0, y); g.lineTo(x - w0, y); g.closePath();
    g.fillStyle = 'rgba(220,240,255,0.18)'; g.fill(); if (fill > 0) { g.save(); g.clip(); g.fillStyle = col; g.fillRect(x - w1, y - h * fill, w1 * 2, h * fill); if (head) { g.fillStyle = '#fff6df'; g.fillRect(x - w1, y - h * fill - 2, w1 * 2, h * 0.12); } g.restore(); }
    g.strokeStyle = 'rgba(235,248,255,0.9)'; g.lineWidth = 2.5; g.stroke(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x - w1 * 0.7, y - h * 0.92, 3, h * 0.75); },
  plate(g, x, y, r) { g.fillStyle = '#fbfbf8'; g.beginPath(); g.ellipse(x, y, r, r * 0.92, 0, 0, 7); g.fill(); g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, r * 0.86, r * 0.79, 0, 0, 7); g.stroke(); g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, r * 0.6, r * 0.55, 0, 0, 7); g.stroke(); },
  roll(g, x, y, r = 22, a = 0) { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#fbfbfb'; rr(g, -r, -r * 0.8, r * 2, r * 1.6, 8); g.fill(); g.strokeStyle = '#d8dde2'; g.lineWidth = 2; rr(g, -r, -r * 0.8, r * 2, r * 1.6, 8); g.stroke();
    g.fillStyle = '#f0f0f0'; g.beginPath(); g.ellipse(r, 0, r * 0.35, r * 0.8, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#b58a5a'; g.beginPath(); g.ellipse(r, 0, r * 0.14, r * 0.32, 0, 0, 7); g.fill(); g.restore(); },
  flame(g, x, y, k = 1, t = 0) { const f = 1 + Math.sin(t * 22 + x) * 0.12; g.fillStyle = 'rgba(255,170,40,0.25)'; g.beginPath(); g.arc(x, y, 28 * k, 0, 7); g.fill(); g.fillStyle = '#ff9d1a'; g.beginPath(); g.ellipse(x, y, 9 * k * f, 19 * k * f, 0, 0, 7); g.fill(); g.fillStyle = '#fff2a8'; g.beginPath(); g.ellipse(x, y + 4 * k, 4 * k, 9 * k, 0, 0, 7); g.fill(); },
};
const ART = {
  // ---- POUR A PERFECT GUINNESS: the back bar, the font with its harp, the drip tray, the tulip glass
  hold(g, s, t) {
    P.scene(g, s.title, () => { g.fillStyle = P.grad(g, 0, 0, 0, S, ['#2a1a12', '#140c08']); g.fillRect(0, 0, S, S);
      for (let i = 0; i < 3; i++) { g.fillStyle = '#3a2416'; g.fillRect(0, 110 + i * 70, S, 6); for (let k = 0; k < 9; k++) { const x = 20 + k * 56 + (i % 2) * 24; g.fillStyle = ['#2e6a1a', '#6a3a12', '#c87a1a', '#1a4a2a', '#e8e0c8'][(k + i) % 5]; g.globalAlpha = 0.35; rr(g, x, 70 + i * 70, 14, 40, 4); g.fill(); g.globalAlpha = 1; } }
      P.wood(g, 0, 444, S, 70, '#4a2a16'); g.fillStyle = '#1a1a1a'; rr(g, 150, 436, 212, 14, 4); g.fill(); g.fillStyle = '#333'; for (let x = 156; x < 356; x += 10) g.fillRect(x, 438, 5, 10); });
    // the font: black column, gold harp plate, the long tap handle
    g.fillStyle = '#111'; rr(g, 222, 46, 68, 44, 10); g.fill(); g.fillStyle = '#d4af37'; g.beginPath(); g.arc(256, 66, 13, 0, 7); g.fill(); txt(g, '♪', 256, 67, 15, '#111');
    g.save(); g.translate(290, 76); g.rotate(s.pouring ? 1.1 : 0.35); g.fillStyle = '#111'; rr(g, -5, -10, 10, 40, 4); g.fill(); g.fillStyle = '#d4af37'; g.fillRect(-5, 22, 10, 8); g.restore();
    g.fillStyle = '#c0c4c8'; rr(g, 248, 88, 16, 14, 4); g.fill();
    const x0 = 176, x1 = 336, top = 110, bot = 440, fy = bot - (bot - top) * Math.min(1, s.fill);
    g.save(); g.beginPath(); g.moveTo(x0 - 10, top); g.lineTo(x1 + 10, top); g.quadraticCurveTo(x1 + 18, top + 160, x1 - 14, bot); g.lineTo(x0 + 14, bot); g.quadraticCurveTo(x0 - 18, top + 160, x0 - 10, top); g.closePath(); g.clip();
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(0, 0, S, S);
    const k = s.settle > 0 ? s.settle : 0, br = Math.round(110 - 95 * k); g.fillStyle = `rgb(${br},${Math.round(br * 0.6)},${Math.round(br * 0.35)})`; g.fillRect(0, fy, S, bot - fy);
    if (s.fill > 0.02) { g.fillStyle = '#f3e6c8'; g.fillRect(0, fy - 4, S, 18 + (s.settle > 0 ? 8 : 0)); }
    if (!s.settle) for (let i = 0; i < 26; i++) { g.fillStyle = 'rgba(240,220,190,0.28)'; g.beginPath(); g.arc(x0 + ((i * 53 + t * 140) % 160), bot - ((i * 37 + t * 90) % Math.max(1, bot - fy)), 2.5, 0, 7); g.fill(); }
    g.restore();
    g.lineWidth = 5; g.strokeStyle = '#d8e4ff'; g.beginPath(); g.moveTo(x0 - 10, top); g.quadraticCurveTo(x0 - 18, top + 160, x0 + 14, bot); g.lineTo(x1 - 14, bot); g.quadraticCurveTo(x1 + 18, top + 160, x1 + 10, top); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x0 + 4, top + 20, 6, 260); txt(g, 'GUINNESS', 256, 300, 20, s.fill > 0.5 ? '#d4af37' : 'rgba(212,175,55,0.6)');
    const ly = (f) => bot - (bot - top) * f; g.setLineDash([10, 8]); g.strokeStyle = '#39ff14'; g.lineWidth = 4; for (const f of [0.84, 0.95]) { g.beginPath(); g.moveTo(x0 - 40, ly(f)); g.lineTo(x1 + 40, ly(f)); g.stroke(); } g.setLineDash([]);
    if (s.pouring) { g.fillStyle = 'rgba(110,66,38,0.9)'; g.fillRect(251, 100, 10, fy - 100); }
    P.hint(g, s.fail > 0 ? 'SPILT IT! AGAIN...' : s.settle > 0 ? 'LET IT SETTLE...' : s.hint, 480, s.fail > 0 ? '#ff6b6b' : '#fff');
  },
  // ---- the turning-wheel jobs: three different scenes
  crank(g, s, t, o) {
    const k = Math.min(1, s.turned / s.need), art = o.art || (/PARASOL/.test(s.title) ? 'parasol' : /VALVE/.test(s.title) ? 'valve' : 'barrel');
    const ring = () => { g.setLineDash([8, 10]); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; g.beginPath(); g.arc(256, 280, 110, 0, 7); g.stroke(); g.setLineDash([]); };
    const bar = (lbl) => { g.fillStyle = 'rgba(0,0,0,0.55)'; rr(g, 52, 470, 408, 24, 12); g.fill(); g.fillStyle = '#39ff14'; rr(g, 54, 472, 404 * k, 20, 10); g.fill(); txt(g, lbl, 256, 482, 13, '#fff'); };
    if (art === 'parasol') {
      // the beer garden: sky, the fence, the table, and the parasol opening as you wind
      P.scene(g, s.title, () => { g.fillStyle = P.grad(g, 0, 0, 0, 340, ['#5fb4ff', '#bfe4ff']); g.fillRect(0, 0, S, 340); g.fillStyle = '#ffe680'; g.beginPath(); g.arc(430, 110, 30, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.8)'; for (const [cx, cy] of [[90, 120], [150, 105]]) { g.beginPath(); g.arc(cx, cy, 20, 0, 7); g.arc(cx + 22, cy - 6, 24, 0, 7); g.arc(cx + 46, cy, 18, 0, 7); g.fill(); }
        g.fillStyle = '#7a5230'; for (let x = 0; x < S; x += 26) g.fillRect(x, 300, 22, 60); g.fillStyle = '#4caf50'; g.fillRect(0, 350, S, 170); g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.ellipse(256, 446, 60 + 140 * k, 16 + 20 * k, 0, 0, 7); g.fill(); });
      g.fillStyle = '#7a5230'; g.fillRect(150, 418, 212, 12); for (const x of [170, 342]) g.fillRect(x - 5, 428, 10, 40); g.fillStyle = '#c9c9c9'; g.fillRect(252, 120, 8, 300);
      const w = 26 + 196 * k, drop = 92 - 52 * k, topY = 120, cols = ['#2e7d32', '#f5f0e0'];
      for (let i = -4; i < 4; i++) { const a = i / 4, b = (i + 1) / 4; g.fillStyle = cols[(i + 4) % 2]; g.beginPath(); g.moveTo(256, topY); g.lineTo(256 + a * w, topY + drop - Math.abs(a) * (8 - 8 * k) + (1 - k) * 20 * (1 - Math.abs(a)));
        g.quadraticCurveTo(256 + (a + b) / 2 * w, topY + drop + 12 * k, 256 + b * w, topY + drop - Math.abs(b) * (8 - 8 * k) + (1 - k) * 20 * (1 - Math.abs(b))); g.closePath(); g.fill(); }
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(256, topY); g.lineTo(256 + i / 4 * w, topY + drop); g.stroke(); }
      g.fillStyle = '#2e7d32'; for (let i = -4; i < 4; i++) { g.beginPath(); g.moveTo(256 + i / 4 * w, topY + drop); g.quadraticCurveTo(256 + (i + 0.5) / 4 * w, topY + drop + 14, 256 + (i + 1) / 4 * w, topY + drop); g.fill(); }
      g.fillStyle = '#ddd'; g.beginPath(); g.arc(256, topY - 4, 7, 0, 7); g.fill();
      // the winding handle on the pole
      g.save(); g.translate(256, 280); g.fillStyle = '#9aa0a6'; g.beginPath(); g.arc(0, 0, 34, 0, 7); g.fill(); g.rotate(s.turned); g.fillStyle = '#5a5f66'; rr(g, -6, -6, 96, 12, 6); g.fill(); g.fillStyle = '#d32f2f'; g.beginPath(); g.arc(90, 0, 15, 0, 7); g.fill(); g.restore(); ring();
      P.hint(g, k >= 1 ? '☀️ PARASOL UP!' : '↻ WIND IT ROUND · DON\'T STOP OR IT DROPS', 82); bar(Math.round(k * 100) + '% UP'); return;
    }
    if (art === 'valve') {
      // the cellar: a pipe across with a red valve wheel, a pressure gauge, steam hissing out (less as you turn)
      P.scene(g, s.title, () => { P.brick(g, 0, 0, S, S); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, S, S); });
      P.steel(g, 0, 262, S, 36, 6); for (const x of [120, 392]) P.steel(g, x - 14, 252, 28, 56, 6);
      for (let i = 0; i < 8 * (1 - k); i++) { const a = (t * 2 + i * 0.37) % 1; g.fillStyle = `rgba(240,240,240,${0.5 * (1 - a)})`; g.beginPath(); g.arc(120 + Math.sin(i * 3) * 10, 250 - a * 140, 10 + a * 30, 0, 7); g.fill(); }
      const gx = 400, gy = 150; g.fillStyle = '#ddd'; g.beginPath(); g.arc(gx, gy, 52, 0, 7); g.fill(); g.strokeStyle = '#555'; g.lineWidth = 6; g.stroke(); g.fillStyle = '#c62828'; g.beginPath(); g.moveTo(gx, gy); g.arc(gx, gy, 46, -0.5, 0.5); g.fill();
      const na = Math.PI * 0.8 + (1 - k) * Math.PI * 1.15; g.strokeStyle = '#111'; g.lineWidth = 4; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + Math.cos(na) * 42, gy + Math.sin(na) * 42); g.stroke(); txt(g, 'PSI', gx, gy + 26, 12, '#111'); P.steel(g, gx - 6, gy + 50, 12, 62, 3);
      g.save(); g.translate(256, 280); g.rotate(s.turned); g.lineWidth = 20; g.strokeStyle = '#c62828'; g.beginPath(); g.arc(0, 0, 100, 0, 7); g.stroke(); for (let i = 0; i < 5; i++) { g.rotate(Math.PI * 2 / 5); g.lineWidth = 12; g.strokeStyle = '#9e1c1c'; g.beginPath(); g.moveTo(0, 0); g.lineTo(100, 0); g.stroke(); }
      g.fillStyle = '#888'; g.beginPath(); g.arc(0, 0, 22, 0, 7); g.fill(); g.restore();
      P.hint(g, k >= 1 ? 'PRESSURE RELEASED ✓' : '↻ TURN THE VALVE · LET THE PRESSURE OUT', 82); bar('PRESSURE ' + Math.round((1 - k) * 100) + '%'); return;
    }
    // the barrel: in the cellar, a steel keg; the coupler on top turned on with its handle, the beer line filling
    P.scene(g, s.title, () => { P.brick(g, 0, 0, S, S); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, S, S); g.fillStyle = '#3a3a3a'; g.fillRect(0, 470, S, 50); });
    const kx = 256; g.fillStyle = P.grad(g, kx - 120, 0, kx + 120, 0, ['#7d838a', '#dfe3e6', '#9ba1a7', '#cfd3d7', '#737a80']); g.fillRect(kx - 120, 310, 240, 162);
    for (const y of [318, 464]) { g.fillStyle = '#9ba1a7'; g.beginPath(); g.ellipse(kx, y, 122, 14, 0, 0, 7); g.fill(); } g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(kx - 120, 380, 240, 10);
    txt(g, 'OYSTER STOUT · 11G', kx, 420, 16, '#2a2a2a');
    g.strokeStyle = '#111'; g.lineWidth = 10; g.beginPath(); g.moveTo(kx + 30, 250); g.bezierCurveTo(kx + 150, 200, 470, 160, 500, 120); g.stroke();
    g.strokeStyle = k >= 1 ? '#3a1a0a' : 'rgba(255,255,255,0.12)'; g.lineWidth = 5; g.beginPath(); g.moveTo(kx + 30, 250); g.bezierCurveTo(kx + 150, 200, 470, 160, 500, 120); g.stroke();
    g.strokeStyle = '#2e7d32'; g.lineWidth = 7; g.beginPath(); g.moveTo(kx - 30, 255); g.bezierCurveTo(kx - 140, 210, 60, 170, 10, 140); g.stroke();
    g.save(); g.translate(256, 280); g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(0, 0, 44, 0, 7); g.fill(); g.rotate(s.turned); g.fillStyle = '#c62828'; rr(g, -8, -100, 16, 200, 8); g.fill(); g.fillStyle = '#ddd'; g.beginPath(); g.arc(0, 0, 18, 0, 7); g.fill(); g.restore(); ring();
    P.hint(g, k >= 1 ? 'COUPLED ON ✓ BEER\'S FLOWING' : '↻ TURN THE COUPLER ONTO THE NEW BARREL', 82); bar(k >= 1 ? 'ON' : Math.round(k * 100) + '%');
  },
  // ---- CHANGE THE BARREL: the cellar: the gas bottle with its tap, the empty keg and the new one, the coupler with its
  // beer and gas lines, moved across by hand
  coupler(g, s, t) {
    const keg = (x, label, col) => { g.fillStyle = P.grad(g, x - 80, 0, x + 80, 0, ['#7d838a', '#dfe3e6', '#9ba1a7', '#cfd3d7', '#737a80']); g.fillRect(x - 80, 300, 160, 172);
      for (const y of [306, 466]) { g.fillStyle = '#9ba1a7'; g.beginPath(); g.ellipse(x, y, 82, 11, 0, 0, 7); g.fill(); } g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x - 80, 380, 160, 8);
      g.fillStyle = '#3a3a3a'; g.beginPath(); g.ellipse(x, 300, 22, 6, 0, 0, 7); g.fill(); txt(g, label, x, 420, 15, col); };
    P.scene(g, s.title, () => { P.brick(g, 0, 0, S, S); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, S, S); g.fillStyle = '#3a3a3a'; g.fillRect(0, 470, S, 50); });
    keg(s._O.x, 'EMPTY', '#c62828'); keg(s._N.x, 'OYSTER STOUT', '#1a2a1a'); g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = '700 16px "Comic Sans MS", cursive'; g.textAlign = 'center'; g.fillText('✗ EMPTY', s._O.x, 350);
    // the gas bottle and its tap
    g.fillStyle = '#2e7d32'; rr(g, 30, 220, 66, 250, 28); g.fill(); txt(g, 'CO₂', 63, 400, 16, '#fff'); P.steel(g, 52, 196, 22, 28, 4);
    g.save(); g.translate(s._G.x, s._G.y); g.rotate(s.gasOn ? 0 : Math.PI / 2); g.fillStyle = s.gasOn ? '#2f7bff' : '#c62828'; rr(g, -30, -8, 60, 16, 8); g.fill(); g.restore(); g.fillStyle = '#ddd'; g.beginPath(); g.arc(s._G.x, s._G.y, 8, 0, 7); g.fill();
    txt(g, s.gasOn ? 'GAS ON' : 'GAS OFF', s._G.x, s._G.y - 30, 12, s.gasOn ? '#7fb2ff' : '#ff6b6b');
    // the coupler (on a keg, or in your hand), its lines up to the wall, its handle
    const c = s.carry || s.at, tp = s._tip();
    g.strokeStyle = '#2e7d32'; g.lineWidth = 6; g.beginPath(); g.moveTo(c.x - 14, c.y); g.bezierCurveTo(c.x - 60, c.y - 120, 110, 130, s._G.x, s._G.y + 10); g.stroke();
    g.strokeStyle = '#111'; g.lineWidth = 9; g.beginPath(); g.moveTo(c.x + 10, c.y - 8); g.bezierCurveTo(c.x + 40, c.y - 160, 470, 120, 500, 110); g.stroke();
    g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(c.x, c.y, 26, 0, 7); g.fill(); g.fillStyle = '#555'; g.beginPath(); g.arc(c.x, c.y, 14, 0, 7); g.fill();
    g.strokeStyle = '#c62828'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(tp.x, tp.y); g.stroke(); g.lineCap = 'butt'; g.fillStyle = '#9e1c1c'; g.beginPath(); g.arc(tp.x, tp.y, 13, 0, 7); g.fill();
    // what to do next: a pulsing ring on it
    const nxt = s.step === 0 || s.step === 4 ? s._G : s.step === 2 ? (s.carry ? s._N : s.at) : tp; if (!s.done) { g.strokeStyle = `rgba(255,212,0,${0.5 + 0.5 * Math.sin(t * 6)})`; g.lineWidth = 4; g.beginPath(); g.arc(nxt.x, nxt.y, 40, 0, 7); g.stroke(); }
    const STEPS = ['TURN THE GAS OFF', 'LIFT THE COUPLER HANDLE (DRAG IT UP)', 'DRAG THE COUPLER ONTO THE NEW BARREL', 'PUSH THE HANDLE DOWN (DRAG IT DOWN)', 'TURN THE GAS BACK ON', 'BARREL CHANGED ✓'];
    for (let i = 0; i < 5; i++) { g.fillStyle = i < s.step ? '#39ff14' : i === s.step ? '#ffd400' : 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(196 + i * 30, 484, 8, 0, 7); g.fill(); }
    P.hint(g, s.msgT > 0 ? s.msg : `${Math.min(5, s.step + 1)}/5 · ${STEPS[s.step]}`, 82, s.msgT > 0 ? '#ff6b6b' : s.done ? '#39ff14' : '#fff', 16);
  },
  // ---- PUT THE PARASOL UP: the beer garden; push the runner up the pole and watch the canopy open out over the table
  raise(g, s, t) {
    const k = s.k;
    P.scene(g, s.title, () => { g.fillStyle = P.grad(g, 0, 0, 0, 340, ['#5fb4ff', '#bfe4ff']); g.fillRect(0, 0, S, 340); g.fillStyle = '#ffe680'; g.beginPath(); g.arc(440, 100, 30, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)'; for (const [cx, cy] of [[70, 120], [140, 100]]) { g.beginPath(); g.arc(cx, cy, 20, 0, 7); g.arc(cx + 22, cy - 6, 24, 0, 7); g.arc(cx + 46, cy, 18, 0, 7); g.fill(); }
      g.fillStyle = '#7a5230'; for (let x = 0; x < S; x += 26) g.fillRect(x, 300, 22, 60); g.fillStyle = '#4caf50'; g.fillRect(0, 350, S, 170);
      g.fillStyle = 'rgba(0,0,0,0.14)'; g.beginPath(); g.ellipse(256, 452, 40 + 170 * k, 10 + 24 * k, 0, 0, 7); g.fill(); });
    // the table and benches
    g.fillStyle = '#7a5230'; g.fillRect(140, 404, 232, 14); for (const x of [160, 352]) g.fillRect(x - 5, 414, 10, 50); g.fillStyle = '#6a4626'; g.fillRect(100, 440, 60, 10); g.fillRect(352, 440, 60, 10);
    // the pole, the canopy (its ribs fold down when it's closed, spread right out when it's up), the runner you push
    const topY = 112, ry = 400 - 220 * k; g.fillStyle = '#d0d0d0'; g.fillRect(252, topY, 8, 300);
    const w = 22 + 210 * k, drop = 150 - 108 * k, cols = ['#2e7d32', '#f5f0e0'];
    for (let i = -4; i < 4; i++) { const a = i / 4, b = (i + 1) / 4, ya = topY + drop * (0.35 + 0.65 * Math.abs(a)) * (1 - k) + (drop * 0.55) * k * (0.6 + 0.4 * Math.abs(a)), yb = topY + drop * (0.35 + 0.65 * Math.abs(b)) * (1 - k) + (drop * 0.55) * k * (0.6 + 0.4 * Math.abs(b));
      g.fillStyle = cols[(i + 4) % 2]; g.beginPath(); g.moveTo(256, topY); g.lineTo(256 + a * w, ya); g.quadraticCurveTo(256 + (a + b) / 2 * w, (ya + yb) / 2 + 10 * k, 256 + b * w, yb); g.closePath(); g.fill(); }
    g.fillStyle = '#2e7d32'; for (let i = -4; i < 4; i++) { const a = i / 4, ya = topY + drop * (0.35 + 0.65 * Math.abs(a)) * (1 - k) + (drop * 0.55) * k * (0.6 + 0.4 * Math.abs(a)); g.beginPath(); g.arc(256 + a * w, ya, 4, 0, 7); g.fill(); }
    g.strokeStyle = '#9aa0a6'; g.lineWidth = 3; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(256, ry); g.lineTo(256 + d * w * 0.45, topY + drop * 0.5); g.stroke(); }
    if (k < 0.35) { const f = 1 - k / 0.35; g.globalAlpha = f; g.fillStyle = '#2e7d32'; g.beginPath(); g.moveTo(256, topY); g.quadraticCurveTo(256 + 26, topY + 70, 256 + 9, topY + 150); g.lineTo(256 - 9, topY + 150); g.quadraticCurveTo(256 - 26, topY + 70, 256, topY); g.fill();
      g.strokeStyle = '#f5f0e0'; g.lineWidth = 3; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(256 - 14 + i * 2, topY + 30 + i * 30); g.lineTo(256 + 14 - i * 2, topY + 42 + i * 30); g.stroke(); } g.fillStyle = '#c9a24a'; g.fillRect(250, topY + 92, 12, 8); g.globalAlpha = 1; }      // (furled up, with its strap)
    g.fillStyle = '#ddd'; g.beginPath(); g.arc(256, topY - 4, 7, 0, 7); g.fill();
    g.fillStyle = s.done ? '#39ff14' : '#333'; rr(g, 240, ry - 12, 32, 24, 6); g.fill(); g.fillStyle = '#ffd400'; g.fillRect(244, 392 - 220, 24, 4);
    if (!s.done) { for (let i = 0; i < 3; i++) { const y = ry + 70 - ((t * 120 + i * 40) % 120); g.fillStyle = `rgba(255,255,255,${0.6 - i * 0.15})`; g.beginPath(); g.moveTo(256, y - 14); g.lineTo(272, y + 4); g.lineTo(240, y + 4); g.fill(); } }
    g.fillStyle = 'rgba(0,0,0,0.55)'; rr(g, 52, 470, 408, 24, 12); g.fill(); g.fillStyle = '#39ff14'; rr(g, 54, 472, 404 * k, 20, 10); g.fill(); txt(g, s.done ? 'UP ✓' : Math.round(k * 100) + '% UP', 256, 482, 13, '#fff');
    P.hint(g, s.done ? '☀️ PARASOL UP! CLICK!' : 'SWIPE UP THE POLE · IT SLIDES BACK IF YOU STOP', 82, s.done ? '#39ff14' : '#fff', 16);
  },
  // ---- TAKE A CARD PAYMENT: the bar top, the card machine with its screen, the card through the slot
  swipe(g, s) {
    P.scene(g, s.title, () => { P.wood(g, 0, 0, S, S, '#5a3a22'); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, S, S); });
    g.fillStyle = '#1d1d1f'; rr(g, 316, 96, 170, 196, 18); g.fill(); g.fillStyle = s.ok > 0 ? '#1f5e2a' : '#c8d8b0'; rr(g, 330, 110, 142, 64, 8); g.fill();
    txt(g, s.ok > 0 ? 'APPROVED' : s.msgT > 0 && !s.good ? 'DECLINED' : '£23.40', 401, 132, 20, s.ok > 0 ? '#9cff9c' : '#1a2a1a'); txt(g, s.ok > 0 ? 'THANK YOU' : 'SWIPE CARD', 401, 158, 12, s.ok > 0 ? '#9cff9c' : '#1a2a1a');
    for (let i = 0; i < 12; i++) { g.fillStyle = i === 11 ? '#2e7d32' : i === 9 ? '#c62828' : '#3a3a3e'; rr(g, 336 + (i % 3) * 46, 186 + Math.floor(i / 3) * 24, 40, 18, 4); g.fill(); }
    g.fillStyle = s.ok > 0 ? '#39ff14' : s.msgT > 0 ? '#ff4d4d' : '#ffb300'; g.beginPath(); g.arc(470, 104, 6, 0, 7); g.fill();
    g.fillStyle = '#2b2b2b'; rr(g, 30, 300, 452, 64, 12); g.fill(); g.fillStyle = '#0d0d0d'; g.fillRect(30, 322, 452, 16); txt(g, '▸ SWIPE SLOT ▸', 256, 352, 12, '#888');
    g.fillStyle = P.grad(g, s.x, 236, s.x + 160, 336, ['#1f6fd6', '#0d3c8a']); rr(g, s.x, 236, 160, 100, 12); g.fill(); g.fillStyle = '#d4af37'; rr(g, s.x + 18, 262, 34, 26, 5); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(s.x + 22, 266 + i * 7); g.lineTo(s.x + 48, 266 + i * 7); g.stroke(); }
    txt(g, '4921  ••••  ••••  0042', s.x + 80, 304, 11, '#e8eefc'); txt(g, 'R. ONNIE', s.x + 50, 322, 10, '#e8eefc');
    P.hint(g, s.msgT > 0 ? s.msg : 'DRAG THE CARD THROUGH · NOT TOO FAST, NOT TOO SLOW', 410, s.msgT > 0 ? (s.ok > 0 || s.good ? '#39ff14' : '#ff6b6b') : '#fff', 16);
    if (s.need > 1) txt(g, `${s.good} / ${s.need} SWIPES`, 130, 110, 18, '#ffd400');
  },
  // ---- FIX THE DJ DECKS WIRING: the back of the DJ desk: mixer outputs on the left, amp inputs on the right
  wires(g, s) {
    const n = s.joined.length, cols = ['#ff3b3b', '#2f7bff', '#ffd400', '#e040fb', '#39ff14', '#ff8a00'], L = ['DECK 1', 'DECK 2', 'MIC', 'LIGHTS', 'SUB', 'BOOTH'];
    P.scene(g, s.title, () => { g.fillStyle = '#121218'; g.fillRect(0, 0, S, S); for (let i = 0; i < 6; i++) { g.fillStyle = ['#ff2a6a', '#2a8aff', '#39ff14'][i % 3]; g.globalAlpha = 0.18; g.beginPath(); g.arc(40 + i * 90, 470, 60, 0, 7); g.fill(); } g.globalAlpha = 1;
      g.fillStyle = '#222'; rr(g, 14, 96, 104, 384, 12); g.fill(); rr(g, 394, 96, 104, 384, 12); g.fill(); txt(g, 'MIXER', 66, 106, 12, '#aaa'); txt(g, 'AMP', 446, 106, 12, '#aaa'); });
    for (let i = 0; i < n; i++) { const a = s._L(i), b = s._R(i);
      for (const [p, side] of [[a, -1], [b, 1]]) { g.fillStyle = cols[i]; g.beginPath(); g.arc(p.x + side * 26, p.y, 15, 0, 7); g.fill(); g.fillStyle = '#c0c4c8'; g.beginPath(); g.arc(p.x + side * 26, p.y, 10, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(p.x + side * 26, p.y, 4, 0, 7); g.fill(); }
      txt(g, L[i], a.x - 4, a.y + 24, 10, '#ddd'); txt(g, L[i], b.x + 4, b.y + 24, 10, '#ddd');
      if (s.joined[i]) { g.strokeStyle = '#111'; g.lineWidth = 16; g.beginPath(); g.moveTo(a.x - 26, a.y); g.bezierCurveTo(256, a.y + 30, 256, b.y + 30, b.x + 26, b.y); g.stroke(); g.strokeStyle = cols[i]; g.lineWidth = 10; g.stroke(); } }
    if (s.drag !== null) { const a = s._L(s.drag); g.strokeStyle = cols[s.drag]; g.lineWidth = 10; g.beginPath(); g.moveTo(a.x - 26, a.y); g.quadraticCurveTo((a.x + s.px) / 2, Math.max(a.y, s.py) + 40, s.px, s.py); g.stroke(); g.fillStyle = '#d4af37'; rr(g, s.px - 9, s.py - 9, 18, 18, 4); g.fill(); }
    P.hint(g, 'PLUG EACH LEAD INTO ITS COLOUR', 82);
  },
  // ---- EMPTY THE FRUIT MACHINE: the cabinet, chasing bulbs, the reels, NUDGE/HOLD, coins into the tray
  reels(g, s, t) {
    P.scene(g, s.title, () => { g.fillStyle = P.grad(g, 0, 0, 0, S, ['#2c1450', '#12081f']); g.fillRect(0, 0, S, S); });
    g.fillStyle = '#ffd400'; rr(g, 24, 100, 464, 302, 26); g.fill(); g.fillStyle = '#5a1a7a'; rr(g, 36, 120, 440, 270, 20); g.fill();
    for (let i = 0; i < 24; i++) { const per = i < 12, x = per ? 40 + i * 39 : 40 + (i - 12) * 39, y = per ? 110 : 394; g.fillStyle = (Math.floor(t * 8) + i) % 3 === 0 ? '#fff6a0' : '#b3261e'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
    txt(g, 'THE CHIP MACHINE', 256, 136, 16, '#ffd400');
    s.reels.forEach((r, i) => { const x = 106 + i * 150; g.save(); g.fillStyle = P.grad(g, 0, 150, 0, 360, ['#d8d0b8', '#fffbe6', '#d8d0b8']); rr(g, x - 62, 150, 124, 210, 14); g.fill(); g.beginPath(); rr(g, x - 62, 150, 124, 210, 14); g.clip();
      const N = 6, SY = s.SY, f = r.p - Math.floor(r.p); for (let k = -2; k <= 2; k++) { const idx = ((Math.floor(r.p) + k) % N + N) % N, y = 255 + (k - f) * 80; g.font = '58px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(SY[idx], x, y); }
      g.fillStyle = P.grad(g, 0, 150, 0, 360, ['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']); g.fillRect(x - 62, 150, 124, 210); g.restore();
      g.strokeStyle = r.stop ? '#39ff14' : i === s.cur ? '#ffd400' : '#2a0a3a'; g.lineWidth = 6; rr(g, x - 62, 150, 124, 210, 14); g.stroke(); });
    g.strokeStyle = 'rgba(255,40,40,0.85)'; g.lineWidth = 4; g.beginPath(); g.moveTo(40, 255); g.lineTo(472, 255); g.stroke();
    if (s.win) for (let i = 0; i < 18; i++) { g.font = '30px serif'; g.fillText('🪙', 60 + (i * 37) % 400, 130 + ((t * 320 + i * 70) % 300)); }
    btn(g, { x: 136, y: 410, w: 240, h: 66 }, s.win ? '£££ PAID OUT £££' : `STOP REEL ${Math.min(3, s.cur + 1)}`, s.win ? '#2e7d32' : '#c62828', 24);
    for (const [x, l] of [[60, 'NUDGE'], [452, 'HOLD']]) { g.fillStyle = '#ffd400'; rr(g, x - 44, 420, 88, 44, 10); g.fill(); txt(g, l, x, 442, 14, '#5a1a7a'); }
    P.hint(g, s.msgT > 0 ? s.msg : 'TAP TO STOP THE LIT REEL ON A 🍒', 82, s.msgT > 0 ? '#ff6b6b' : '#fff');
  },
  // ---- UNBLOCK THE TOILET: the cubicle, the cistern, the bowl brimming with brown water that drains as you plunge
  plunge(g, s, t) {
    P.scene(g, s.title, () => { P.tiles(g, 0, 0, S, S, 46, '#dfe9ee', '#b9c7cf'); g.fillStyle = '#8fa3ad'; g.fillRect(0, 430, S, 90); P.tiles(g, 0, 430, S, 90, 30, '#6f8590', '#5a6e78'); });
    P.steel(g, 470, 140, 10, 200, 3);
    g.fillStyle = '#fafafa'; rr(g, 176, 120, 160, 90, 10); g.fill(); g.strokeStyle = '#ccc'; g.lineWidth = 3; rr(g, 176, 120, 160, 90, 10); g.stroke(); g.fillStyle = '#c0c4c8'; rr(g, 300, 136, 26, 10, 4); g.fill();
    g.fillStyle = '#f4f4f4'; g.beginPath(); g.moveTo(186, 300); g.quadraticCurveTo(186, 440, 256, 440); g.quadraticCurveTo(326, 440, 326, 300); g.fill(); g.fillStyle = '#fafafa'; g.beginPath(); g.ellipse(256, 300, 132, 50, 0, 0, 7); g.fill(); g.strokeStyle = '#ddd'; g.lineWidth = 3; g.stroke();
    const k = s.p, lvl = 1 - k; g.fillStyle = `rgb(${Math.round(120 + 60 * k)},${Math.round(90 + 110 * k)},${Math.round(40 + 190 * k)})`; g.beginPath(); g.ellipse(256, 300 + (1 - lvl) * 10, 108 - (1 - lvl) * 22, 38 - (1 - lvl) * 10, 0, 0, 7); g.fill();
    for (let i = 0; i < 6 * lvl; i++) { g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.arc(200 + ((i * 41 + t * 30) % 110), 296 + Math.sin(t * 3 + i) * 10, 4 + (i % 3), 0, 7); g.fill(); }
    const y = 150 + s.bob * 50; g.fillStyle = '#a0662a'; rr(g, 248, y - 40, 16, 190, 6); g.fill(); g.fillStyle = '#d32f2f'; g.beginPath(); g.ellipse(256, y + 156, 54, 26 - s.bob * 8, 0, Math.PI, 0, true); g.fill(); g.fillStyle = '#9e1c1c'; g.fillRect(202, y + 154, 108, 6);
    g.fillStyle = 'rgba(0,0,0,0.55)'; rr(g, 34, 112, 38, 356, 19); g.fill(); g.fillStyle = '#39ff14'; rr(g, 39, 463 - 346 * s.p, 28, 346 * s.p, 14); g.fill(); txt(g, '💧', 53, 96, 18);
    P.hint(g, k > 0.85 ? 'NEARLY... KEEP GOING!' : 'PLUNGE! TAP AS FAST AS YOU CAN', 82);
  },
  // ---- RESTOCK THE LOO ROLL: the ladies' wall, the roll holder, rolls dropping out of the cupboard into your basket
  catch(g, s) {
    P.scene(g, s.title, () => { P.tiles(g, 0, 0, S, S, 40, '#f3d9e4', '#e0b9ca'); g.fillStyle = '#7a4a5a'; g.fillRect(0, 96, S, 26); for (let x = 20; x < S; x += 60) { g.fillStyle = '#5a3040'; g.fillRect(x, 100, 40, 18); } txt(g, 'STOCK CUPBOARD', 256, 109, 12, '#f3d9e4'); });
    g.fillStyle = '#c0c4c8'; rr(g, 420, 200, 70, 14, 6); g.fill(); g.fillRect(450, 200, 8, 30); if (s.got > 0) P.roll(g, 455, 236, 20);
    for (const r of s.rolls) { P.roll(g, r.x, r.y, 22, r.r); if (r.wet) { g.save(); g.globalAlpha = 0.55; g.fillStyle = '#7a8fa0'; g.beginPath(); g.arc(r.x, r.y, 24, 0, 7); g.fill(); g.globalAlpha = 1; g.fillStyle = '#5ab4ff'; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(r.x - 10 + i * 10, r.y + 26 + ((r.y + i * 13) % 14), 3, 5, 0, 0, 7); g.fill(); } g.restore(); } }
    g.fillStyle = '#d8d8d8'; g.strokeStyle = '#8a8a8a'; g.lineWidth = 3; const bw = s.bw + 6; g.beginPath(); g.moveTo(s.bx - bw, 416); g.lineTo(s.bx + bw, 416); g.lineTo(s.bx + bw - 10, 474); g.lineTo(s.bx - bw + 10, 474); g.closePath(); g.stroke();
    for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(s.bx - bw + i * bw / 3, 416); g.lineTo(s.bx - bw + 10 + i * (bw - 10) / 3, 474); g.stroke(); } for (const y of [436, 456]) { g.beginPath(); g.moveTo(s.bx - bw + 4, y); g.lineTo(s.bx + bw - 4, y); g.stroke(); }
    for (let i = 0; i < Math.min(s.got, 4); i++) P.roll(g, s.bx - 24 + (i % 2) * 48, 456 - Math.floor(i / 2) * 22, 14);
    txt(g, `${s.got} / ${s.need}`, 60, 150, 24, '#7a1a3a'); txt(g, '✖'.repeat(s.miss) + '·'.repeat(s.maxMiss - s.miss), 60, 180, 22, '#c62828');
    P.hint(g, s.msgT > 0 ? s.msg : 'CATCH THE ROLLS · NOT THE SOGGY ONES!', 82, s.msgT > 0 ? '#ff6b6b' : '#fff');
  },
  // ---- SORT THE BOOKINGS: the open bookings diary on the reception desk, handwritten, ticked off in red
  order(g, s) {
    const cells = s._cells, box = (j) => ({ x: 36 + (j % 2) * 226, y: 96 + Math.floor(j / 2) * 94, w: 214, h: 82 });
    P.scene(g, s.title, () => { P.wood(g, 0, 0, S, S, '#9a5e28'); g.fillStyle = '#5a1214'; rr(g, 16, 70, 480, 430, 16); g.fill();
      g.fillStyle = '#fbf6e6'; rr(g, 26, 80, 228, 410, 8); g.fill(); rr(g, 258, 80, 228, 410, 8); g.fill(); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(250, 80, 12, 410);
      g.strokeStyle = 'rgba(80,120,200,0.35)'; g.lineWidth = 1; for (let y = 104; y < 486; y += 18) { g.beginPath(); g.moveTo(30, y); g.lineTo(250, y); g.moveTo(262, y); g.lineTo(482, y); g.stroke(); }
      g.strokeStyle = 'rgba(200,60,60,0.5)'; g.beginPath(); g.moveTo(96, 80); g.lineTo(96, 490); g.moveTo(326, 80); g.lineTo(326, 490); g.stroke(); });
    cells.forEach((c, j) => { const b = box(j), on = c.i < s.next; g.font = `700 30px "Comic Sans MS", "Bradley Hand", cursive`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = on ? 'rgba(30,30,30,0.35)' : '#1a2a6a'; g.fillText(c.tm, b.x + 50, b.y + b.h / 2);
      g.font = `700 24px "Comic Sans MS", "Bradley Hand", cursive`; g.fillStyle = on ? 'rgba(30,30,30,0.35)' : '#222'; g.fillText(c.who.charAt(0) + c.who.slice(1).toLowerCase(), b.x + 148, b.y + b.h / 2); txt(g, `(${2 + (c.i * 3) % 5})`, b.x + 196, b.y + b.h / 2 + 18, 11, '#666');
      if (on) { g.strokeStyle = '#d32f2f'; g.lineWidth = 5; g.beginPath(); g.moveTo(b.x + 14, b.y + b.h / 2); g.lineTo(b.x + 26, b.y + b.h / 2 + 14); g.lineTo(b.x + 46, b.y + b.h / 2 - 18); g.stroke(); txt(g, String(c.i + 1), b.x + 196, b.y + 16, 14, '#d32f2f'); } });
    P.hint(g, s.bad > 0 ? 'WRONG ORDER! START AGAIN' : 'TICK THEM OFF · EARLIEST TABLE FIRST', 62 + 20, s.bad > 0 ? '#ff6b6b' : '#fff', 17);
  },
  // ---- CLEAN THE FRYER: the kitchen, a stainless twin fryer, bubbling oil, a basket of chips, the thermostat
  temp(g, s, t) {
    P.scene(g, s.title, () => { P.tiles(g, 0, 0, S, S, 34, '#f2f2f2', '#d6d6d6'); g.fillStyle = '#c0c4c8'; g.fillRect(0, 440, S, 80); });
    if (s.T > 0.75 || s.fire > 0) for (let i = 0; i < 6; i++) { const a = (t * 0.6 + i * 0.17) % 1; g.fillStyle = `rgba(90,90,90,${0.35 * (1 - a) * (s.fire > 0 ? 1.6 : (s.T - 0.75) * 4)})`; g.beginPath(); g.arc(300 + Math.sin(i * 2 + t) * 30, 200 - a * 120, 20 + a * 30, 0, 7); g.fill(); }
    P.steel(g, 160, 200, 300, 250, 12); g.fillStyle = '#2a2a2a'; rr(g, 176, 212, 268, 120, 10); g.fill(); g.fillStyle = s.fire > 0 ? '#ff5a1a' : P.grad(g, 0, 224, 0, 320, ['#e8b84a', '#b57a1a']); rr(g, 182, 222, 256, 104, 8); g.fill();
    for (let i = 0; i < Math.round(30 * s.T); i++) { g.fillStyle = 'rgba(255,240,180,0.6)'; g.beginPath(); g.arc(190 + ((i * 47 + t * 60) % 240), 232 + ((i * 29) % 80) + Math.sin(t * 12 + i) * 3, 2 + (i % 3), 0, 7); g.fill(); }
    const k = Math.min(1, s.cooked / s.need); g.strokeStyle = '#9aa0a6'; g.lineWidth = 3; for (let x = 230; x <= 390; x += 16) { g.beginPath(); g.moveTo(x, 240); g.lineTo(x, 316); g.stroke(); } g.strokeRect(222, 240, 176, 76); g.fillStyle = '#222'; rr(g, 398, 230, 70, 12, 6); g.fill();
    for (let i = 0; i < 22; i++) { g.fillStyle = `rgb(${245 - k * 30},${220 - k * 80},${130 - k * 90})`; g.save(); g.translate(236 + (i % 8) * 20, 262 + Math.floor(i / 8) * 18 + Math.sin(t * 7 + i) * 2); g.rotate(i * 0.9); g.fillRect(-12, -3.5, 24, 7); g.restore(); }
    for (const x of [210, 410]) { g.fillStyle = '#222'; g.beginPath(); g.arc(x, 380, 24, 0, 7); g.fill(); g.strokeStyle = '#ddd'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 380); g.lineTo(x + Math.cos(-2 + s.T * 4) * 18, 380 + Math.sin(-2 + s.T * 4) * 18); g.stroke(); }
    g.fillStyle = s.heat ? '#ff3b3b' : '#550'; g.beginPath(); g.arc(310, 380, 8, 0, 7); g.fill(); txt(g, s.heat ? 'HEATING' : '', 310, 410, 12, '#ff3b3b');
    if (s.fire > 0) { for (let i = 0; i < 5; i++) P.flame(g, 200 + i * 55, 210 - Math.sin(t * 9 + i) * 12, 2.2, t); }
    const x = 64, y0 = 120, h = 320; g.fillStyle = '#fff'; rr(g, x - 6, y0 - 6, 52, h + 40, 26); g.fill(); g.fillStyle = '#eee'; rr(g, x, y0, 40, h, 20); g.fill();
    g.fillStyle = 'rgba(57,255,20,0.55)'; g.fillRect(x, y0 + h * (1 - s.band - 0.09), 40, h * 0.18); g.fillStyle = s.T > 0.9 ? '#ff3b3b' : '#ff8a00'; rr(g, x + 12, y0 + h * (1 - s.T), 16, h * s.T, 8); g.fill(); g.beginPath(); g.arc(x + 20, y0 + h + 14, 18, 0, 7); g.fill();
    txt(g, '°C', x + 20, y0 - 18, 14, '#333');
    g.fillStyle = 'rgba(0,0,0,0.5)'; rr(g, 160, 466, 300, 22, 11); g.fill(); g.fillStyle = '#ffd400'; rr(g, 162, 468, 296 * k, 18, 9); g.fill(); txt(g, 'CHIPS ' + Math.round(k * 100) + '%', 310, 477, 12, '#fff');
    P.hint(g, s.fire > 0 ? '🔥 FIRE! START AGAIN 🔥' : 'HOLD TO HEAT · KEEP THE OIL IN THE GREEN', 82, s.fire > 0 ? '#ff6b6b' : '#fff');
  },
  // ---- WASH THE POTS: the pot wash sink full of suds, and the three racks: plates, glasses, cutlery
  sort(g, s, t) {
    const bin = (i) => ({ x: 30 + i * 158, y: 360, w: 140, h: 110 });
    const draw1 = (k, x, y, sc = 1) => { g.save(); g.translate(x, y); g.scale(sc, sc);
      if (k === 0) P.plate(g, 0, 0, 44); else if (k === 1) P.pint(g, 0, 40, 80, 0); else { g.fillStyle = '#d8dce0'; g.save(); g.rotate(-0.4); g.fillRect(-4, -40, 8, 80); for (let i = 0; i < 4; i++) g.fillRect(-10 + i * 6, -58, 3, 20); g.restore(); g.save(); g.rotate(0.4); g.fillRect(-4, -10, 8, 50); g.beginPath(); g.moveTo(-6, -10); g.lineTo(-6, -58); g.quadraticCurveTo(8, -50, 6, -10); g.fill(); g.restore(); } g.restore(); };
    P.scene(g, s.title, () => { P.tiles(g, 0, 0, S, S, 38, '#e6eef0', '#c6d2d6'); P.steel(g, 0, 330, S, 190, 0); });
    P.steel(g, 136, 118, 240, 128, 14); g.fillStyle = '#9fc8d8'; rr(g, 148, 128, 216, 108, 10); g.fill();
    for (let i = 0; i < 16; i++) { g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(156 + (i * 37) % 200, 132 + Math.sin(t * 2 + i) * 4 + (i % 3) * 8, 9 + (i % 4) * 3, 0, 7); g.fill(); }
    P.steel(g, 246, 90, 20, 30, 4);
    const L = ['PLATES', 'GLASSES', 'CUTLERY']; for (let i = 0; i < 3; i++) { const b = bin(i); g.fillStyle = '#5f6b70'; rr(g, b.x, b.y, b.w, b.h, 12); g.fill(); g.strokeStyle = '#c0c8cc'; g.lineWidth = 3;
      if (i === 0) for (let x = b.x + 14; x < b.x + b.w - 8; x += 14) { g.beginPath(); g.moveTo(x, b.y + 20); g.lineTo(x, b.y + 80); g.stroke(); } else if (i === 1) { for (let x = b.x + 10; x < b.x + b.w; x += 30) for (let y = b.y + 14; y < b.y + 84; y += 30) g.strokeRect(x, y, 26, 26); } else for (let j = 0; j < 3; j++) { g.fillStyle = '#c0c8cc'; rr(g, b.x + 16 + j * 40, b.y + 30, 30, 52, 6); g.fill(); }
      txt(g, L[i], b.x + b.w / 2, b.y + 98, 14, '#fff'); }
    if (s.drag || Math.hypot(s.ix - 256, s.iy - 170) > 2) draw1(s.item, s.ix, s.iy); else draw1(s.item, 256, 180 + Math.sin(t * 2) * 3);
    g.fillStyle = 'rgba(0,0,0,0.5)'; rr(g, 40, 98, 432, 14, 7); g.fill(); g.fillStyle = s.time < 6 ? '#ff3b3b' : '#ffd400'; rr(g, 40, 98, 432 * s.time / 22, 14, 7); g.fill();
    txt(g, `${s.got} / ${s.need}`, 440, 150, 24, '#ffd400'); P.hint(g, s.bad > 0 ? 'WRONG RACK!' : 'DRAG EACH ONE OUT OF THE SINK TO ITS RACK', 290, s.bad > 0 ? '#ff6b6b' : '#fff', 16);
  },
  // ---- COLLECT THE EMPTIES: the raised booths' tables, pub carpet, beer mats; empties (with foam lacing) and full pints
  whack(g, s) {
    const spot = (i) => ({ x: 106 + (i % 3) * 150, y: 170 + Math.floor(i / 3) * 150 });
    P.scene(g, s.title, () => { g.fillStyle = '#5a1420'; g.fillRect(0, 0, S, S); for (let y = 0; y < S; y += 40) for (let x = (y / 40 % 2) * 20; x < S; x += 40) { g.fillStyle = '#c9a24a'; g.beginPath(); g.moveTo(x, y + 10); g.lineTo(x + 10, y); g.lineTo(x + 20, y + 10); g.lineTo(x + 10, y + 20); g.fill(); } });
    for (let i = 0; i < 6; i++) { const p = spot(i); g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(p.x, p.y + 54, 66, 18, 0, 0, 7); g.fill(); P.wood(g, p.x - 64, p.y + 26, 128, 34, '#6d4c33'); g.fillStyle = '#4a3020'; g.fillRect(p.x - 64, p.y + 56, 128, 6);
      g.fillStyle = ['#c8102e', '#1e5aa8', '#f5f0e0'][i % 3]; g.beginPath(); g.ellipse(p.x + 30, p.y + 40, 16, 6, 0, 0, 7); g.fill(); }
    for (const u of s.ups) { const p = spot(u.i), k = Math.min(1, (1.3 - u.life) * 6 + 0.3); g.save(); g.translate(p.x, p.y + 42); g.scale(k, k);
      if (u.full) P.pint(g, 0, 0, 92, 0.86, '#c98a1a'); else { P.pint(g, 0, 0, 92, 0); g.strokeStyle = 'rgba(255,250,235,0.7)'; g.lineWidth = 2; for (let j = 0; j < 4; j++) { g.beginPath(); g.moveTo(-24 + j, -70 + j * 16); g.quadraticCurveTo(0, -62 + j * 16, 24 - j, -70 + j * 16); g.stroke(); } g.fillStyle = 'rgba(200,140,40,0.5)'; g.fillRect(-18, -8, 36, 6); }
      g.restore(); }
    txt(g, `${s.got} / ${s.need}`, 70, 486, 22, '#ffd400'); txt(g, '✖'.repeat(s.miss) + '·'.repeat(4 - s.miss), 440, 486, 20, '#ff6b6b');
    P.hint(g, s.msgT > 0 ? s.msg : 'GRAB THE EMPTIES · LEAVE THE FULL PINTS', 82, s.msgT > 0 ? '#ff6b6b' : '#fff');
  },
  // ---- WIPE THE TABLES: a conservatory table: beer rings, ketchup, crumbs; a blue cloth
  scrub(g, s, t) {
    P.scene(g, s.title, () => { g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, S, S); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 6; for (let x = 0; x < S; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 100); g.stroke(); } });
    P.wood(g, 40, 110, 432, 360, '#a87a4a'); g.strokeStyle = '#6e4a28'; g.lineWidth = 6; rr(g, 40, 110, 432, 360, 20); g.stroke();
    P.pint(g, 440, 160, 40, 0.3, '#c98a1a'); g.fillStyle = '#c8102e'; rr(g, 60, 128, 22, 40, 6); g.fill(); g.fillStyle = '#fff'; g.fillRect(64, 136, 14, 6);
    s.spots.forEach((p, i) => { if (p.a <= 0) return; g.globalAlpha = Math.max(0, p.a); const kind = i % 3;
      if (kind === 0) { g.strokeStyle = '#5a3a1a'; g.lineWidth = 7; g.beginPath(); g.ellipse(p.x, p.y, p.r, p.r * 0.85, 0, 0, 7); g.stroke(); g.strokeStyle = 'rgba(90,58,26,0.5)'; g.lineWidth = 4; g.beginPath(); g.ellipse(p.x + 8, p.y + 5, p.r * 0.9, p.r * 0.75, 0, 0, 7); g.stroke(); }
      else if (kind === 1) { g.fillStyle = '#b3261e'; g.beginPath(); g.ellipse(p.x, p.y, p.r * 0.8, p.r * 0.55, 0.5, 0, 7); g.fill(); for (let j = 0; j < 5; j++) { g.beginPath(); g.arc(p.x + Math.cos(j * 1.3) * p.r, p.y + Math.sin(j * 1.3) * p.r * 0.8, 5, 0, 7); g.fill(); } }
      else { g.fillStyle = '#c8a050'; for (let j = 0; j < 14; j++) { g.beginPath(); g.arc(p.x + Math.cos(j * 2.4) * p.r * (j % 4) / 3, p.y + Math.sin(j * 2.4) * p.r * (j % 3) / 2.5, 3 + (j % 3), 0, 7); g.fill(); } }
      g.globalAlpha = 1; });
    if (s.drag) { g.save(); g.translate(s.cx, s.cy); g.rotate(Math.sin(t * 20) * 0.15); g.fillStyle = '#2f7bff'; rr(g, -40, -28, 80, 56, 10); g.fill(); g.strokeStyle = '#1a4ab0'; g.lineWidth = 2; for (let i = -30; i < 40; i += 10) { g.beginPath(); g.moveTo(i, -28); g.lineTo(i, 28); g.stroke(); } g.restore(); }
    const left = s.spots.filter(p => p.a > 0).length; P.hint(g, left ? `WIPE IT CLEAN · ${left} MESSES LEFT` : 'SPOTLESS ✓', 82);
  },
  // ---- RESET THE SLOT MACHINE: the machine's open service door, its keypad, the reset slip taped inside
  code(g, s, t) {
    const key = (k) => ({ x: 146 + (k === 'C' ? 0 : k === '0' ? 1 : k === 'OK' ? 2 : (Number(k) - 1) % 3) * 76, y: 200 + (k === 'C' || k === '0' || k === 'OK' ? 3 : Math.floor((Number(k) - 1) / 3)) * 70, w: 68, h: 62 });
    P.scene(g, s.title, () => { g.fillStyle = '#1c2a6a'; g.fillRect(0, 0, S, S); g.fillStyle = '#0e1538'; rr(g, 20, 60, 472, 440, 18); g.fill();
      g.strokeStyle = '#3a3a3a'; g.lineWidth = 4; for (let i = 0; i < 5; i++) { g.strokeStyle = ['#c62828', '#2e7d32', '#ffd400', '#1e88e5', '#111'][i]; g.beginPath(); g.moveTo(30, 200 + i * 40); g.bezierCurveTo(90, 220 + i * 40, 60, 300 + i * 30, 120, 330 + i * 28); g.stroke(); } });
    g.fillStyle = Math.floor(t * 3) % 2 ? '#ff3b3b' : '#5a0a0a'; g.beginPath(); g.arc(450, 210, 14, 0, 7); g.fill(); txt(g, 'TILT', 450, 238, 12, '#ff6b6b');
    g.fillStyle = '#4a4a4a'; rr(g, 404, 280, 76, 160, 10); g.fill(); for (let i = 0; i < 8; i++) { g.fillStyle = '#d4af37'; g.beginPath(); g.ellipse(442, 420 - i * 16, 26, 7, 0, 0, 7); g.fill(); } txt(g, 'HOPPER', 442, 296, 11, '#ddd');
    if (s.show <= 0) { g.fillStyle = '#c9b48a'; g.save(); g.translate(40, 70); g.rotate(-0.06); rr(g, 0, 0, 150, 90, 6); g.fill(); txt(g, 'REMEMBER IT?', 75, 45, 14, '#5a3a1a'); g.restore(); }
    else { g.fillStyle = '#fffbe6'; g.save(); g.translate(40, 70); g.rotate(-0.06); rr(g, 0, 0, 150, 90, 6); g.fill(); g.fillStyle = 'rgba(255,255,200,0.7)'; g.fillRect(55, -6, 40, 14); txt(g, 'RESET CODE', 75, 24, 14, '#c62828'); txt(g, s._code, 75, 60, 24, '#222', 'center', 140); g.restore(); g.fillStyle = '#ffd400'; g.fillRect(40, 166, 150 * Math.min(1, s.show / 3), 6); }
    g.fillStyle = '#000'; rr(g, 220, 100, 250, 70, 10); g.fill(); g.strokeStyle = '#555'; g.lineWidth = 4; rr(g, 220, 100, 250, 70, 10); g.stroke(); txt(g, 'SERVICE MODE', 345, 114, 11, '#2a7a2a');
    txt(g, s.bad > 0 ? 'ERROR' : (s.typed || '________'), 345, 142, 28, s.bad > 0 ? '#ff4d4d' : '#39ff14');
    g.fillStyle = '#2a2a30'; rr(g, 136, 190, 238, 290, 14); g.fill();
    for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK']) { const b = key(k); g.fillStyle = k === 'OK' ? '#2e7d32' : k === 'C' ? '#c62828' : P.grad(g, 0, b.y, 0, b.y + b.h, ['#5a6aa8', '#3a4a8a']); rr(g, b.x, b.y, b.w, b.h, 12); g.fill(); g.fillStyle = 'rgba(255,255,255,0.15)'; rr(g, b.x + 4, b.y + 3, b.w - 8, 12, 6); g.fill(); txt(g, k, b.x + b.w / 2, b.y + b.h / 2 + 1, 24, '#fff'); }
  },
  // ---- CHECK THE KEG PRESSURE: the gas bottle, the regulator with its big pressure gauge, the line to the kegs
  dial(g, s) {
    P.scene(g, s.title, () => { g.fillStyle = '#8a9aa8'; g.fillRect(0, 0, S, S); P.tiles(g, 0, 0, S, S, 64, '#8a9aa8', '#7a8a98'); g.fillStyle = '#5a6670'; g.fillRect(0, 460, S, 60); });
    g.fillStyle = '#2e7d32'; rr(g, 26, 300, 70, 180, 30); g.fill(); g.fillStyle = '#1b5e20'; g.fillRect(26, 360, 70, 20); txt(g, 'CO₂', 61, 420, 18, '#fff'); P.steel(g, 50, 270, 22, 34, 4);
    for (const x of [430, 478]) { g.fillStyle = P.grad(g, x - 22, 0, x + 22, 0, ['#8d939a', '#e3e7ea', '#80868c']); g.fillRect(x - 22, 380, 44, 92); g.fillStyle = '#333'; g.fillRect(x - 6, 372, 12, 10); }
    g.strokeStyle = '#111'; g.lineWidth = 6; g.beginPath(); g.moveTo(61, 270); g.bezierCurveTo(61, 230, 120, 300, 150, 300); g.moveTo(362, 300); g.bezierCurveTo(400, 300, 430, 340, 430, 372); g.stroke();
    const cx = 256, cy = 300, r = 170, ang = (k) => Math.PI + k * Math.PI;
    g.fillStyle = '#bfc4c9'; g.beginPath(); g.arc(cx, cy, r + 26, Math.PI, 0); g.closePath(); g.fill(); g.fillStyle = '#fbfbf6'; g.beginPath(); g.arc(cx, cy, r + 12, Math.PI, 0); g.closePath(); g.fill();
    g.lineWidth = 26; g.strokeStyle = 'rgba(57,255,20,0.75)'; g.beginPath(); g.arc(cx, cy, r - 10, ang(s.zone[0]), ang(s.zone[1])); g.stroke(); g.strokeStyle = 'rgba(220,40,40,0.7)'; g.beginPath(); g.arc(cx, cy, r - 10, ang(0.88), ang(1)); g.stroke();
    for (let i = 0; i <= 30; i++) { const a = ang(i / 30), L = i % 5 ? 10 : 20; g.strokeStyle = '#222'; g.lineWidth = i % 5 ? 2 : 4; g.beginPath(); g.moveTo(cx + Math.cos(a) * (r + 8), cy + Math.sin(a) * (r + 8)); g.lineTo(cx + Math.cos(a) * (r + 8 - L), cy + Math.sin(a) * (r + 8 - L)); g.stroke(); if (!(i % 5)) txt(g, String(i * 2), cx + Math.cos(a) * (r - 30), cy + Math.sin(a) * (r - 30), 14, '#222'); }
    txt(g, 'PSI', cx, cy - 60, 16, '#555');
    const k = (Math.sin(s.a) + 1) / 2; g.strokeStyle = '#c62828'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang(k)) * (r + 4), cy + Math.sin(ang(k)) * (r + 4)); g.stroke(); g.fillStyle = '#333'; g.beginPath(); g.arc(cx, cy, 16, 0, 7); g.fill();
    btn(g, { x: 156, y: 400, w: 200, h: 70 }, 'SET!', '#c62828', 30);
    P.hint(g, `STOP THE NEEDLE IN THE GREEN · ${s.hits}/${s.need}`, 82, s.flash < 0 ? '#ff6b6b' : s.flash > 0 ? '#39ff14' : '#fff');
  },
  // ---- CLOCK IN FOR YOUR SHIFT: the staff room clock-in terminal on the wall, the rota pinned beside it
  simon(g, s) {
    const C = ['#ff3b3b', '#2f7bff', '#39ff14', '#ffd400'], I = ['☕', '🍺', '🧾', '🔑'];
    P.scene(g, s.title, () => { g.fillStyle = '#a8b0bd'; g.fillRect(0, 0, S, S); g.fillStyle = '#7a1f24'; g.fillRect(0, 420, S, 100); });
    g.fillStyle = '#fffbe6'; g.save(); g.translate(14, 130); g.rotate(-0.04); g.fillRect(0, 0, 74, 120); txt(g, 'ROTA', 37, 14, 12, '#c62828'); for (let i = 0; i < 7; i++) { g.fillStyle = '#999'; g.fillRect(8, 30 + i * 12, 58, 3); } g.fillStyle = '#d32f2f'; g.beginPath(); g.arc(37, 2, 5, 0, 7); g.fill(); g.restore();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(462, 140, 34, 0, 7); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 4; g.stroke(); g.beginPath(); g.moveTo(462, 140); g.lineTo(462, 116); g.moveTo(462, 140); g.lineTo(480, 146); g.stroke();
    g.fillStyle = '#2a2d36'; rr(g, 84, 104, 344, 376, 22); g.fill(); g.fillStyle = '#3a3f4a'; rr(g, 90, 110, 332, 14, 7); g.fill();
    for (let i = 0; i < 4; i++) { const b = { x: 96 + (i % 2) * 168, y: 130 + Math.floor(i / 2) * 168, w: 152, h: 152 }, on = s.lit === i;
      g.fillStyle = C[i]; g.globalAlpha = on ? 1 : 0.32; rr(g, b.x, b.y, b.w, b.h, 22); g.fill(); g.globalAlpha = 1; if (on) { g.shadowColor = C[i]; g.shadowBlur = 30; rr(g, b.x, b.y, b.w, b.h, 22); g.fill(); g.shadowBlur = 0; }
      g.fillStyle = 'rgba(255,255,255,0.2)'; rr(g, b.x + 8, b.y + 6, b.w - 16, 26, 12); g.fill(); g.font = '54px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = on ? 1 : 0.6; g.fillText(I[i], b.x + b.w / 2, b.y + b.h / 2 + 4); g.globalAlpha = 1; }
    txt(g, `${s.st === 'input' ? s.pos : 0} / ${s.len}`, S / 2, 494, 18, '#ffd400');
    P.hint(g, s.bad > 0 ? 'WRONG! WATCH AGAIN' : s.st === 'input' ? `NOW COPY IT · ROUND ${s.len - 2} OF 3` : 'WATCH THE PATTERN...', 82, s.bad > 0 ? '#ff6b6b' : '#fff');
  },
  // ---- LAY THE TABLES: the restaurant table: white cloth, gold-rimmed plates, napkins, wine glasses, a candle
  place(g, s, t) {
    const P3 = [106, 256, 406];
    P.scene(g, s.title, () => { g.fillStyle = '#3a1a14'; g.fillRect(0, 0, S, S); for (let x = 0; x < S; x += 24) { g.fillStyle = x % 48 ? '#4a2218' : '#3e1c14'; g.fillRect(x, 0, 24, S); } });
    g.fillStyle = '#fbfbf6'; rr(g, 22, 110, 468, 222, 14); g.fill(); g.fillStyle = '#efefe6'; for (let y = 120; y < 330; y += 24) g.fillRect(22, y, 468, 2); g.fillStyle = '#e6e6dc'; g.fillRect(22, 318, 468, 14);
    for (const x of P3) { g.fillStyle = '#7a1a2a'; g.beginPath(); g.moveTo(x - 18, 132); g.lineTo(x + 18, 132); g.lineTo(x + 8, 150); g.lineTo(x - 8, 150); g.fill(); P.plate(g, x, 220, 40); g.fillStyle = 'rgba(220,240,255,0.5)'; g.beginPath(); g.ellipse(x + 46, 144, 12, 14, 0, 0, 7); g.fill(); g.strokeStyle = '#dfefff'; g.lineWidth = 2; g.stroke(); g.beginPath(); g.moveTo(x + 46, 158); g.lineTo(x + 46, 172); g.stroke(); }
    g.fillStyle = '#d4af37'; g.fillRect(250, 120, 12, 8); g.fillStyle = '#f5eedc'; g.fillRect(252, 96, 8, 26); P.flame(g, 256, 90, 0.7, t);
    for (const q of s._slots) if (!q.f) { g.strokeStyle = q.k === 'fork' ? 'rgba(40,90,200,0.35)' : 'rgba(200,60,40,0.35)'; g.setLineDash([6, 6]); g.lineWidth = 2; g.strokeRect(q.x - 14, q.y - 62, 28, 124); g.setLineDash([]); }
    P.wood(g, 22, 352, 468, 130, '#5a3a22'); g.strokeStyle = '#3a2416'; g.lineWidth = 4; g.strokeRect(22, 352, 468, 130); txt(g, 'CUTLERY TRAY', 256, 366, 11, '#e8d0b0');
    const draw1 = (k, x, y) => { g.save(); g.translate(x, y); g.fillStyle = P.grad(g, -10, 0, 10, 0, ['#9aa0a6', '#eef1f3', '#9aa0a6']); g.strokeStyle = '#6a7077'; g.lineWidth = 1.5;
      if (k === 'fork') { rr(g, -4, -12, 8, 64, 3); g.fill(); g.fillRect(-14, -50, 28, 12); for (let i = 0; i < 4; i++) g.fillRect(-14 + i * 8, -80, 4, 32); }
      else { rr(g, -5, 0, 10, 54, 4); g.fill(); g.beginPath(); g.moveTo(-6, 0); g.lineTo(-6, -72); g.quadraticCurveTo(10, -62, 8, 0); g.closePath(); g.fill(); g.stroke(); } g.restore(); };
    for (const it of s.items) draw1(it.k, it.x, it.y);
    P.hint(g, s.msgT > 0 ? s.msg : 'FORK ON THE LEFT · KNIFE ON THE RIGHT', 82, s.msgT > 0 ? '#ff6b6b' : '#fff');
  },
  // ---- LIGHT THE CANDLES: a dark restaurant, a window with curtains (they blow when the wind gets in), brass candlesticks
  light(g, s, t) {
    const n = s.lit.filter(Boolean).length, glow = 0.15 + n * 0.12;
    P.scene(g, s.title, () => { g.fillStyle = `rgb(${Math.round(30 + glow * 90)},${Math.round(16 + glow * 50)},${Math.round(12 + glow * 25)})`; g.fillRect(0, 0, S, S);
      g.fillStyle = '#0d1a3a'; rr(g, 176, 96, 160, 110, 6); g.fill(); g.fillStyle = '#fff8c0'; g.beginPath(); g.arc(300, 124, 10, 0, 7); g.fill(); g.strokeStyle = '#6a4a2a'; g.lineWidth = 6; rr(g, 176, 96, 160, 110, 6); g.stroke(); g.beginPath(); g.moveTo(256, 96); g.lineTo(256, 206); g.stroke();
      const sw = s.blow > 0 ? Math.sin(t * 18) * 14 * s.blow : 0; g.fillStyle = '#7a1a2a'; for (const [x, d] of [[176, -1], [336, 1]]) { g.beginPath(); g.moveTo(x, 90); g.quadraticCurveTo(x + d * 20 + sw, 160, x + d * 10 + sw * 1.5, 220); g.lineTo(x - d * 34, 220); g.lineTo(x - d * 34, 90); g.fill(); } });
    if (s.blow > 0) { g.strokeStyle = 'rgba(200,230,255,0.6)'; g.lineWidth = 3; for (let i = 0; i < 4; i++) { const y = 160 + i * 34, x = ((t * 400 + i * 120) % 600) - 60; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 40, y - 14, x + 80, y + 14, x + 120, y); g.stroke(); } }
    P.wood(g, 20, 336, 472, 40, '#4a2a16'); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(20, 376, 472, 110);
    s._C.forEach(([x, y], i) => { g.fillStyle = '#c9a24a'; g.beginPath(); g.ellipse(x, y + 36, 26, 7, 0, 0, 7); g.fill(); g.fillRect(x - 5, y + 24, 10, 14); g.beginPath(); g.ellipse(x, y + 24, 18, 5, 0, 0, 7); g.fill();
      g.fillStyle = P.grad(g, x - 14, 0, x + 14, 0, ['#e8e0c8', '#fffbee', '#e0d8c0']); g.fillRect(x - 13, y - 60, 26, 86); g.fillStyle = '#fffbee'; g.beginPath(); g.ellipse(x, y - 60, 13, 4, 0, 0, 7); g.fill();
      g.fillStyle = '#f5eedc'; g.beginPath(); g.ellipse(x + 8, y - 50, 3, 9, 0, 0, 7); g.fill(); g.fillStyle = '#222'; g.fillRect(x - 1.5, y - 72, 3, 12);
      if (s.lit[i]) P.flame(g, x, y - 86, 1, t); else if (s.heat[i] > 0) { g.fillStyle = '#ffd400'; g.fillRect(x - 20, y + 46, 40 * s.heat[i] / 0.55, 5); } });
    if (s.hold) { g.save(); g.translate(s.mx, s.my); g.rotate(0.5); g.fillStyle = '#e8c48a'; g.fillRect(-3, 0, 6, 80); g.fillStyle = '#c62828'; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill(); g.restore(); P.flame(g, s.mx, s.my - 10, 0.8, t); }
    txt(g, `${n} / 5 LIT`, S / 2, 440, 22, '#ffd400'); P.hint(g, s.blow > 0 ? '💨 A DRAUGHT! ONE BLEW OUT' : 'HOLD THE MATCH TO EACH WICK', 82, s.blow > 0 ? '#9fd8ff' : '#fff');
  },
  // ---- CLEAR THE GARDEN GLASSES: the beer garden bar: stack the trays of empties on the counter
  stacker(g, s) {
    const H = 40, base = 450;
    P.scene(g, s.title, () => { g.fillStyle = P.grad(g, 0, 0, 0, 300, ['#5fb4ff', '#d4ecff']); g.fillRect(0, 0, S, 300); g.fillStyle = '#7a5230'; for (let x = 0; x < S; x += 26) g.fillRect(x, 220, 22, 90); g.fillStyle = '#4caf50'; g.fillRect(0, 300, S, 220);
      g.fillStyle = '#3a2a22'; g.beginPath(); g.moveTo(80, 110); g.lineTo(432, 110); g.lineTo(470, 160); g.lineTo(42, 160); g.fill(); g.fillStyle = '#5a3a22'; g.fillRect(70, 160, 372, 60); txt(g, 'GARDEN BAR', 256, 190, 18, '#ffd400'); });
    P.wood(g, 30, base + H - 6, 452, 50, '#5a3a22');
    const tray = (x, y, w) => { g.fillStyle = '#2a2a2a'; rr(g, x, y + H - 9, w, 8, 3); g.fill(); for (let gx = x + 6; gx + 18 < x + w; gx += 22) { const wine = (gx / 22) % 3 < 1; if (wine) { g.strokeStyle = '#e8f4ff'; g.lineWidth = 2; g.fillStyle = 'rgba(220,240,255,0.25)'; g.beginPath(); g.ellipse(gx + 9, y + 10, 8, 9, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(gx + 9, y + 19); g.lineTo(gx + 9, y + H - 10); g.stroke(); } else P.pint(g, gx + 9, y + H - 9, 30, 0); } };
    s.rows.forEach((r, i) => i && tray(r.x, base - i * H + 4, r.w)); g.fillStyle = '#6d4c33'; g.fillRect(s.rows[0].x, base + 4, s.rows[0].w, H - 10);
    if (s.cur && s.msgT <= 0) tray(s.cur.x, base - s.rows.length * H + 4, s.cur.w);
    P.hint(g, s.msgT > 0 ? s.msg : `TAP TO DROP THE TRAY · ${s.rows.length - 1}/${s.need}`, 82, s.msgT > 0 ? '#ff6b6b' : '#fff');
  },
  // ---- SWEEP UP THE GLASS: the car park by Lewis's car: its smashed window, the shards, a dustpan and brush
  sweep(g, s) {
    const PAN = s._pan;
    P.scene(g, s.title, () => { g.fillStyle = '#3d3f43'; g.fillRect(0, 0, S, S); for (let i = 0; i < 500; i++) { g.fillStyle = i % 2 ? '#4a4c50' : '#33353a'; g.fillRect((i * 97) % S, (i * 61) % S, 3, 3); }
      g.fillStyle = '#f5f5f5'; g.fillRect(470, 100, 8, 420); g.fillStyle = '#c8102e'; rr(g, 30, 62, 452, 70, 16); g.fill(); g.fillStyle = '#9a0c22'; g.fillRect(30, 120, 452, 12); g.fillStyle = '#111'; g.beginPath(); g.arc(120, 136, 26, Math.PI, 0); g.arc(392, 136, 26, Math.PI, 0); g.fill();
      g.fillStyle = '#1a1a1a'; g.beginPath(); g.moveTo(170, 70); g.lineTo(330, 70); g.lineTo(312, 110); g.lineTo(184, 110); g.fill(); g.strokeStyle = 'rgba(200,235,255,0.8)'; g.lineWidth = 2; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(250, 90); g.lineTo(250 + Math.cos(i * 0.8) * 70, 90 + Math.sin(i * 0.8) * 22); g.stroke(); } });
    g.fillStyle = '#d32f2f'; g.beginPath(); g.moveTo(PAN.x, PAN.y + 6); g.lineTo(PAN.x + PAN.w, PAN.y + 6); g.lineTo(PAN.x + PAN.w - 8, PAN.y + PAN.h); g.lineTo(PAN.x + 8, PAN.y + PAN.h); g.fill(); g.fillStyle = '#9a1f1f'; g.fillRect(PAN.x, PAN.y, PAN.w, 8); g.fillRect(PAN.x + PAN.w / 2 - 7, PAN.y + PAN.h, 14, 20);
    const got = s.bits.filter(b => b.got).length; for (let i = 0; i < got; i++) { g.fillStyle = 'rgba(200,235,255,0.8)'; g.beginPath(); g.arc(PAN.x + 20 + (i * 23) % 80, PAN.y + 30 + (i % 2) * 8, 4, 0, 7); g.fill(); }
    for (const b of s.bits) if (!b.got) { g.save(); g.translate(b.x, b.y); g.rotate(b.r); g.fillStyle = 'rgba(200,235,255,0.85)'; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); for (let k = 0; k < b.n; k++) { const a = k / b.n * 6.28, r2 = 8 + (k % 2) * 7; g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); } g.closePath(); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(-2, -5, 3, 3); g.restore(); }
    if (s.px !== null) { g.save(); g.translate(s.px, s.py); g.fillStyle = '#c8a040'; rr(g, -44, -6, 88, 20, 4); g.fill(); g.strokeStyle = '#8a6a20'; g.lineWidth = 2; for (let x = -40; x < 44; x += 6) { g.beginPath(); g.moveTo(x, 14); g.lineTo(x, 24); g.stroke(); } g.fillStyle = '#5a3a22'; g.fillRect(-5, -100, 10, 96); g.restore(); }
    txt(g, `${got} / ${s.bits.length}`, 440, 480, 20, '#ffd400'); P.hint(g, 'SWEEP EVERY BIT INTO THE DUSTPAN', 160);
  },
  // ---- FIX THE CAR PARK BARRIER: the control box, the cables under the tarmac, the barrier arm (it lifts when the power gets there)
  pipes(g, s, t) {
    const NN = 4, T = 88, X0 = 80, Y0 = 112, D = [[1, 0, -1], [2, 1, 0], [4, 0, 1], [8, -1, 0]], up = Math.min(1, (s.win || 0) * 2);
    P.scene(g, s.title, () => { g.fillStyle = '#3d3f43'; g.fillRect(0, 0, S, S); for (let i = 0; i < 400; i++) { g.fillStyle = i % 2 ? '#47494d' : '#35373b'; g.fillRect((i * 89) % S, (i * 53) % S, 3, 3); } });
    for (let y = 0; y < NN; y++) for (let x = 0; x < NN; x++) { const px = X0 + x * T, py = Y0 + y * T, m = s._g[y][x], live = s.on.has(y * NN + x);
      g.fillStyle = '#6b5440'; rr(g, px + 3, py + 3, T - 6, T - 6, 8); g.fill(); g.fillStyle = 'rgba(0,0,0,0.25)'; rr(g, px + 8, py + 8, T - 16, T - 16, 6); g.fill();
      const c = [px + T / 2, py + T / 2]; g.lineCap = 'round'; for (const [col, w] of [['#111', 18], [live ? '#ffd400' : '#555', 8]]) { g.strokeStyle = col; g.lineWidth = w; for (const [d, dx, dy] of D) if (m & d) { g.beginPath(); g.moveTo(...c); g.lineTo(c[0] + dx * T / 2, c[1] + dy * T / 2); g.stroke(); } }
      g.lineCap = 'butt'; g.fillStyle = live ? '#ffd400' : '#333'; g.beginPath(); g.arc(c[0], c[1], 7, 0, 7); g.fill(); if (live && Math.floor(t * 6 + x + y) % 2) { g.fillStyle = 'rgba(255,240,120,0.35)'; g.beginPath(); g.arc(c[0], c[1], 22, 0, 7); g.fill(); } }
    g.fillStyle = '#4a5560'; rr(g, 14, Y0 + s._r0 * T + 8, 58, T - 16, 8); g.fill(); g.fillStyle = '#ffd400'; g.beginPath(); g.moveTo(43, Y0 + s._r0 * T + 22); g.lineTo(33, Y0 + s._r0 * T + 46); g.lineTo(45, Y0 + s._r0 * T + 46); g.lineTo(38, Y0 + s._r0 * T + 66); g.lineTo(54, Y0 + s._r0 * T + 38); g.lineTo(42, Y0 + s._r0 * T + 38); g.fill();
    const bx = X0 + NN * T + 22, by = Y0 + s._r1 * T + T / 2; g.fillStyle = '#ffd400'; rr(g, bx - 12, by - 28, 30, 56, 6); g.fill(); g.fillStyle = '#111'; g.fillRect(bx - 12, by - 6, 30, 6);
    g.save(); g.translate(bx + 3, by - 20); g.rotate(-Math.PI / 2 * up); for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#c62828' : '#fff'; g.fillRect(i * 14, -5, 14, 10); } g.restore();
    g.fillStyle = s.win ? '#39ff14' : '#c62828'; g.beginPath(); g.arc(bx + 3, by + 18, 5, 0, 7); g.fill();
    P.hint(g, s.win ? '⚡ BARRIER UP!' : 'TURN THE TILES · GET THE POWER TO THE BARRIER', 82, s.win ? '#39ff14' : '#fff', 16);
  },
  // ---- FIX THE LIGHTS: the pub's fuse box (consumer unit) with labelled breakers; the room lights up when they're all on
  switches(g, s, t) {
    const on = s._on, all = on.every(Boolean), L = ['BAR', 'KITCHEN', 'LIGHTS', 'CELLAR', 'GARDEN'];
    P.scene(g, s.title, () => { g.fillStyle = all ? '#a8b0bd' : '#14161c'; g.fillRect(0, 0, S, S); if (all) { g.fillStyle = 'rgba(255,240,180,0.3)'; g.beginPath(); g.arc(256, 0, 300, 0, 7); g.fill(); } });
    g.fillStyle = all ? '#fff6c0' : '#333'; g.beginPath(); g.arc(256, 100, 16, 0, 7); g.fill(); if (all) { g.fillStyle = 'rgba(255,240,150,0.35)'; g.beginPath(); g.arc(256, 100, 40, 0, 7); g.fill(); } g.strokeStyle = '#222'; g.lineWidth = 3; g.beginPath(); g.moveTo(256, 62); g.lineTo(256, 84); g.stroke();
    g.fillStyle = '#e6e8ea'; rr(g, 26, 132, 460, 330, 16); g.fill(); g.strokeStyle = '#9aa0a6'; g.lineWidth = 4; rr(g, 26, 132, 460, 330, 16); g.stroke(); g.fillStyle = '#c6cacd'; g.fillRect(36, 150, 440, 6); g.fillRect(36, 420, 440, 6);
    for (let i = 0; i < 5; i++) { const b = { x: 46 + i * 86, y: 170, w: 72, h: 200 }; g.fillStyle = '#2a2a2a'; rr(g, b.x, b.y, b.w, b.h, 10); g.fill(); g.fillStyle = on[i] ? '#39ff14' : '#ff3b3b'; g.beginPath(); g.arc(b.x + b.w / 2, b.y + 14, 7, 0, 7); g.fill();
      g.fillStyle = P.grad(g, 0, 0, 0, 1, ['#f2f2f2', '#cfcfcf']); g.fillStyle = '#f0f0f0'; rr(g, b.x + 14, on[i] ? b.y + 28 : b.y + b.h - 84, b.w - 28, 70, 8); g.fill(); g.fillStyle = '#bbb'; g.fillRect(b.x + 18, on[i] ? b.y + 36 : b.y + b.h - 28, b.w - 36, 6);
      txt(g, on[i] ? 'ON' : 'OFF', b.x + b.w / 2, b.y + b.h - (on[i] ? 22 : 170), 12, '#ddd'); g.fillStyle = '#fffbe6'; rr(g, b.x, b.y + b.h + 12, b.w, 24, 4); g.fill(); txt(g, L[i], b.x + b.w / 2, b.y + b.h + 24, 11, '#222'); }
    P.hint(g, all ? '💡 LIGHTS ON!' : 'ALL ON · EACH SWITCH FLIPS ITS NEIGHBOURS TOO', 478, all ? '#ffd400' : '#fff', 16);
  },
};

// ================================================================ the restaurant and garden jobs (each its own game, drawn in full)
const NEW_GAMES = {
  // WINE: screw the waiter's friend in (twist it back and forth), push its wings down to draw the cork, then tip the bottle to
  // pour three glasses to the line. Tip it too far, too long, and it overflows: wipe up and pour that one again
  wine(o = {}) {
    const s = { title: o.title || 'OPEN THE WINE', ph: 0, screw: 0, need: 9, lastX: null, acc: 0, dir: 0, wing: 0, wy: null, pop: 0, tilt: 0, ty: null, gi: 0, fill: [0, 0, 0], ok: [false, false, false], spill: 0, msg: '', msgT: 0, done: false, LINE: [0.56, 0.7] };
    s.down = (x, y) => { if (s.done || s.spill > 0) return;
      if (s.ph === 0 && Math.abs(x - 256) < 170 && y < 300) { s.lastX = x; s.acc = 0; }
      else if (s.ph === 1 && y < 330) s.wy = y;
      else if (s.ph === 2) s.ty = y; };
    s.move = (x, y) => {
      if (s.ph === 0 && s.lastX !== null) { const dx = x - s.lastX; s.lastX = x; if (!dx) return; const d = Math.sign(dx); if (d !== s.dir && Math.abs(s.acc) > 36) { s.screw++; s.acc = 0; sfx('corkscrew', null, 0.35); if (s.screw >= s.need) { s.ph = 1; s.lastX = null; sfx('corkscrew', null, 0.7); } } if (d !== s.dir) s.acc = 0; s.dir = d; s.acc += dx; }
      else if (s.ph === 1 && s.wy !== null) { const d = y - s.wy; s.wy = y; if (d > 0) s.wing = Math.min(1, s.wing + d / 230); if (s.wing >= 1) { s.ph = 2; s.pop = 1; s.wy = null; sfx('cork', null, 0.9); } }
      else if (s.ph === 2 && s.ty !== null) s.tilt = Math.max(0, Math.min(1, (y - s.ty) / 170)); };
    s.up = () => { s.lastX = null; s.wy = null;
      if (s.ph === 2 && s.ty !== null) { s.ty = null; s.tilt = 0; const f = s.fill[s.gi];
        if (f >= s.LINE[0] && f <= s.LINE[1]) { s.ok[s.gi] = true; sfx('wine_glass', null, 0.6); s.gi++; if (s.gi >= 3) s.done = true; }
        else if (f > 0.05) { s.msg = 'NOT ENOUGH — TOP IT UP TO THE LINE'; s.msgT = 1.4; } } };
    s.update = (dt) => { if (s.pop > 0) s.pop -= dt * 1.5; if (s.msgT > 0) s.msgT -= dt;
      if (s.spill > 0) { s.spill -= dt; if (s.spill <= 0) s.fill[s.gi] = 0; return; }
      if (s.ph === 1 && s.wy === null && s.wing > 0 && s.wing < 1) s.wing = Math.max(0, s.wing - dt * 0.6);
      if (s.ph === 2 && s.gi < 3) { const flow = Math.max(0, s.tilt - 0.3) / 0.7; if (flow > 0) { s.fill[s.gi] += flow * dt * 0.42; if ((s.pt = (s.pt || 0) - dt) <= 0) { s.pt = 0.2; sfx('wine_pour', null, 0.15); } }
        if (s.fill[s.gi] > 0.86) { s.spill = 1.3; s.tilt = 0; s.ty = null; s.msg = 'OVERFLOWED! WIPE IT UP · POUR THAT ONE AGAIN'; s.msgT = 1.6; sfx('spill', null, 0.6); } } };
    const glass = (g, x, y, f, ok, cur) => { const w = 44, h = 70;
      if (cur) { g.fillStyle = 'rgba(255,212,0,0.18)'; g.beginPath(); g.ellipse(x, y + 4, 54, 12, 0, 0, 7); g.fill(); }
      g.save(); g.beginPath(); g.moveTo(x - w, y - 130); g.quadraticCurveTo(x - w - 6, y - 70, x, y - 60); g.quadraticCurveTo(x + w + 6, y - 70, x + w, y - 130); g.closePath(); g.clip();
      g.fillStyle = 'rgba(220,240,255,0.12)'; g.fillRect(x - 60, y - 140, 120, 90); const fy = y - 60 - h * Math.min(1, f); g.fillStyle = '#6a0f22'; g.fillRect(x - 60, fy, 120, 200); g.fillStyle = 'rgba(160,30,60,0.6)'; g.fillRect(x - 60, fy, 120, 5); g.restore();
      g.strokeStyle = 'rgba(235,248,255,0.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - w, y - 130); g.quadraticCurveTo(x - w - 6, y - 70, x, y - 60); g.quadraticCurveTo(x + w + 6, y - 70, x + w, y - 130); g.stroke();
      g.beginPath(); g.moveTo(x, y - 60); g.lineTo(x, y - 6); g.stroke(); g.beginPath(); g.ellipse(x, y - 3, 30, 6, 0, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(x - w + 10, y - 124, 3, 40);
      if (cur || !ok) { g.setLineDash([6, 5]); g.strokeStyle = '#39ff14'; g.lineWidth = 2; for (const L of s.LINE) { const ly = y - 60 - h * L; g.beginPath(); g.moveTo(x - 50, ly); g.lineTo(x + 50, ly); g.stroke(); } g.setLineDash([]); }
      if (ok) txt(g, '✓', x, y - 150, 28, '#39ff14'); };
    s.draw = (g, t) => {
      P.scene(g, s.title, () => { g.fillStyle = P.grad(g, 0, 0, 0, S, ['#2e1408', '#140804']); g.fillRect(0, 0, S, S);
        for (let r = 0; r < 4; r++) for (let i = 0; i < 12; i++) { g.fillStyle = ['#2a5a22', '#6a1020', '#d8c890', '#5a0a18'][(i + r) % 4]; g.globalAlpha = 0.28; rr(g, 8 + i * 42, 70 + r * 46, 14, 38, 4); g.fill(); g.globalAlpha = 1; g.fillStyle = 'rgba(255,216,144,0.2)'; g.fillRect(0, 108 + r * 46, S, 3); }
        P.wood(g, 0, 440, S, 80, '#4a2010'); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, 440, S, 4); });
      if (s.ph < 2) {      // the bottle stood on the bar, the corkscrew going in
        const bx = 256, top = 160 + s.wing * 0;
        g.fillStyle = '#16341a'; rr(g, bx - 46, 250, 92, 190, 22); g.fill(); g.beginPath(); g.moveTo(bx - 46, 270); g.quadraticCurveTo(bx - 46, 220, bx - 16, 200); g.lineTo(bx - 16, top + 20); g.lineTo(bx + 16, top + 20); g.lineTo(bx + 16, 200); g.quadraticCurveTo(bx + 46, 220, bx + 46, 270); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(bx - 32, 262, 8, 160);
        g.fillStyle = '#f4ecd8'; rr(g, bx - 40, 300, 80, 92, 6); g.fill(); g.strokeStyle = '#8a6a2a'; g.lineWidth = 2; rr(g, bx - 36, 304, 72, 84, 4); g.stroke();
        txt(g, 'CHÂTEAU', bx, 322, 12, '#5a0a18'); txt(g, 'RONNIE', bx, 342, 17, '#5a0a18'); txt(g, '2019', bx, 362, 12, '#8a6a2a'); g.fillStyle = '#8a1a2a'; g.beginPath(); g.arc(bx, 378, 6, 0, 7); g.fill();
        g.fillStyle = s.ph === 0 && s.screw === 0 ? '#7a1020' : '#c9a24a'; rr(g, bx - 18, top + 14, 36, 34, 4); g.fill();      // the foil (cut back once you've started)
        g.fillStyle = '#c8a070'; g.fillRect(bx - 13, top + 6, 26, 12);       // the cork top
        // the corkscrew: the worm (screws down into the cork), the body, the arms (wings) that rise as it goes in and you push down
        const sink = s.screw / s.need, wy = top - 40 + sink * 24, wa = s.ph === 1 ? (1 - s.wing) * 1.1 : sink * 1.1;
        g.strokeStyle = '#b8bcc0'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 40; i++) { const yy = wy + 40 + i * 1.3, xx = bx + Math.sin(i * 0.9 + t * (s.lastX !== null ? 8 : 0)) * 6; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke();
        P.steel(g, bx - 10, wy - 50, 20, 92, 6); g.fillStyle = '#5a2e18'; rr(g, bx - 70, wy - 70, 140, 22, 10); g.fill();          // the handle
        for (const sd of [-1, 1]) { g.save(); g.translate(bx + sd * 10, wy + 10); g.rotate(sd * (Math.PI / 2 - wa)); P.steel(g, -6, -70, 12, 72, 5); g.restore(); }
        txt(g, s.ph === 0 ? `TWIST IT IN: SWIPE LEFT ↔ RIGHT ON THE HANDLE · ${s.screw}/${s.need}` : 'NOW PUSH THE WINGS DOWN ↓', S / 2, 478, 19, '#fff');
        if (s.ph === 0) { g.fillStyle = '#ffd400'; g.fillRect(156, 455, 200 * sink, 8); g.strokeStyle = '#ffd400'; g.lineWidth = 2; g.strokeRect(156, 455, 200, 8); }
      } else {             // pouring: the open bottle tips over the glass
        const xs = [116, 256, 396]; xs.forEach((x, i) => glass(g, x, 440, s.fill[i], s.ok[i], i === s.gi));
        const gx = xs[Math.min(2, s.gi)], ang = -0.25 - s.tilt * 1.6; g.save(); g.translate(gx + 70, 150); g.rotate(ang);
        g.fillStyle = '#16341a'; rr(g, -26, -20, 52, 160, 14); g.fill(); g.fillRect(-10, -70, 20, 56); g.fillStyle = '#c9a24a'; g.fillRect(-11, -70, 22, 18); g.fillStyle = '#f4ecd8'; rr(g, -22, 40, 44, 56, 4); g.fill(); txt(g, 'RONNIE', 0, 68, 11, '#5a0a18'); g.restore();
        const flow = Math.max(0, s.tilt - 0.3) / 0.7; if (flow > 0 && s.spill <= 0) { const mx = gx + 70 + Math.sin(ang) * 70, my = 150 - Math.cos(ang) * 70; g.strokeStyle = '#7a1028'; g.lineWidth = 3 + flow * 5; g.beginPath(); g.moveTo(mx, my); g.quadraticCurveTo(gx + 10, my + 40, gx, 440 - 60 - 70 * Math.min(1, s.fill[s.gi])); g.stroke(); }
        if (s.spill > 0) { g.fillStyle = 'rgba(110,10,30,0.8)'; g.beginPath(); g.ellipse(gx, 446, 80, 14, 0, 0, 7); g.fill(); }
        if (s.pop > 0) { g.fillStyle = '#c8a070'; g.fillRect(380 + (1 - s.pop) * 60, 90 - (1 - s.pop) * 40, 22, 14); txt(g, 'POP!', 420, 70, 26 * (0.6 + s.pop), '#ffd400'); }
        txt(g, s.msgT > 0 ? s.msg : 'DRAG DOWN TO TIP · LET GO ON THE LINE', S / 2, 82, 19, s.msgT > 0 ? '#ff8a8a' : '#fff');
      } };
    return s;
  },
  // FOLD: the napkin folds are shown, then hidden: swipe them from memory (bishop's mitre, four folds each, three napkins)
  fold(o = {}) {
    const D = { U: [0, -1, '↑'], D: [0, 1, '↓'], L: [-1, 0, '←'], R: [1, 0, '→'] }, K = Object.keys(D);
    const s = { title: o.title || 'FOLD THE NAPKINS', n: 0, need: 3, seq: [], step: 0, st: 'show', T: 2.4, sx: null, sy: null, msg: '', msgT: 0, crumple: 0, done: false };
    const fresh = () => { s.seq = []; for (let i = 0; i < 4; i++) { let k; do k = K[Math.floor(Math.random() * 4)]; while (i && k === s.seq[i - 1]); s.seq.push(k); } s.step = 0; s.st = 'show'; s.T = 2.4; }; fresh();
    s.down = (x, y) => { if (s.st !== 'input') return; s.sx = x; s.sy = y; };
    s.move = () => {};
    s.up = (x, y) => { if (s.st !== 'input' || s.sx === null) return; const dx = x - s.sx, dy = y - s.sy; s.sx = null; if (Math.hypot(dx, dy) < 45) return;
      const k = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U');
      if (k === s.seq[s.step]) { s.step++; sfx('napkin', null, 0.5); if (s.step >= 4) { s.n++; sfx('fold_done', null, 0.5); if (s.n >= s.need) s.done = true; else { s.st = 'next'; s.T = 0.9; } } }
      else { s.crumple = 1; s.st = 'crumple'; s.T = 1.1; sfx('error', null, 0.5); s.msg = `WRONG FOLD (THAT WAS ${D[k][2]}) — NEW NAPKIN`; s.msgT = 1.6; } };
    s.update = (dt) => { if (s.msgT > 0) s.msgT -= dt; if (s.crumple > 0) s.crumple = Math.max(0, s.crumple - dt); if (s.st === 'input') return; if ((s.T -= dt) <= 0) { if (s.st === 'show') s.st = 'input'; else fresh(); } };
    s.draw = (g, t) => {
      P.scene(g, s.title, () => { g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, S, S); g.strokeStyle = 'rgba(0,0,0,0.04)'; g.lineWidth = 1; for (let i = 0; i < S; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke(); }
        // the place setting either side: a plate, the knife and fork, a wine glass
        P.plate(g, 256, 300, 150); g.fillStyle = '#c0c4c8'; rr(g, 60, 180, 10, 240, 4); g.fill(); for (let i = 0; i < 4; i++) g.fillRect(56 + i * 5, 168, 3, 30); rr(g, 442, 180, 12, 240, 5); g.fill(); });
      // the napkin, folded as far as you've got: a burgundy linen square, halved, quartered, a triangle, stood up as a mitre
      const f = s.st === 'next' ? 4 : s.step, cx = 256, cy = 300, cr = s.crumple;
      g.save(); g.translate(cx, cy); if (cr > 0) g.rotate(Math.sin(t * 40) * 0.08 * cr);
      const lin = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fillStyle = '#7a1424'; g.fill(); g.strokeStyle = '#4a0a14'; g.lineWidth = 3; g.stroke(); };
      if (cr > 0) { g.fillStyle = '#7a1424'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(Math.cos(i * 2.1) * 30, Math.sin(i * 1.7) * 26, 34, 0, 7); g.fill(); } g.strokeStyle = '#4a0a14'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(Math.cos(i) * 40, Math.sin(i * 2) * 30); g.lineTo(Math.cos(i + 2) * 30, Math.sin(i * 3) * 34); g.stroke(); } }
      else if (f === 0) { lin([[-110, -110], [110, -110], [110, 110], [-110, 110]]); }
      else if (f === 1) { lin([[-110, -55], [110, -55], [110, 55], [-110, 55]]); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(-110, 0); g.lineTo(110, 0); g.stroke(); }
      else if (f === 2) { lin([[-60, -55], [60, -55], [60, 55], [-60, 55]]); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(0, -55); g.lineTo(0, 55); g.stroke(); }
      else if (f === 3) { lin([[-70, 50], [70, 50], [0, -70]]); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(0, -70); g.lineTo(0, 50); g.stroke(); }
      else { lin([[-50, 70], [50, 70], [56, -30], [20, -10], [0, -90], [-20, -10], [-56, -30]]); g.strokeStyle = 'rgba(255,255,255,0.2)'; g.beginPath(); g.moveTo(0, -90); g.lineTo(0, 70); g.stroke(); }
      if (cr <= 0) { g.strokeStyle = '#d4af37'; g.lineWidth = 2; g.setLineDash([4, 4]); g.strokeRect(-100 + f * 6, -100 + f * 6, 200 - f * 12, 200 - f * 12); g.setLineDash([]); }
      g.restore();
      // the fold card: the four folds, shown, then hidden
      g.fillStyle = 'rgba(20,24,40,0.85)'; rr(g, 96, 72, 320, 64, 14); g.fill();
      for (let i = 0; i < 4; i++) { const x = 136 + i * 80, show = s.st === 'show' || i < s.step || s.st === 'next'; g.fillStyle = i < s.step ? '#2e7d32' : i === s.step && s.st === 'input' ? '#ffd400' : '#3a3f55'; rr(g, x - 28, 80, 56, 48, 10); g.fill(); txt(g, show ? D[s.seq[i]][2] : '?', x, 105, 32, i === s.step && s.st === 'input' ? '#111' : '#fff'); }
      txt(g, s.msgT > 0 ? s.msg : s.st === 'show' ? `REMEMBER THE FOLDS... ${Math.ceil(s.T)}` : s.st === 'next' ? 'LOVELY. NEXT ONE' : 'SWIPE EACH FOLD FROM MEMORY', S / 2, 160, 19, s.msgT > 0 ? '#c62828' : '#2a2a2a');
      for (let i = 0; i < s.need; i++) { g.fillStyle = i < s.n ? '#7a1424' : 'rgba(0,0,0,0.15)'; g.beginPath(); g.moveTo(218 + i * 38, 486); g.lineTo(238 + i * 38, 486); g.lineTo(228 + i * 38, 462); g.closePath(); g.fill(); }
    };
    return s;
  },
  // BULBS: power OFF at the wall first (or ZAP), hold on each blown bulb to unscrew it, drag a new one from the box into the
  // socket, then the power back on
  bulbs(o = {}) {
    const N = 6, arms = [...Array(N)].map((_, i) => { const a = -Math.PI / 2 + (i + 0.5) / N * Math.PI * 2; return { x: 256 + Math.cos(a) * 150, y: 250 + Math.sin(a) * 70 - 30 }; });
    const blown = shuffle([0, 1, 2, 3, 4, 5]).slice(0, 3);
    const s = { title: o.title || 'CHANGE THE BULBS', arms, st: arms.map((_, i) => blown.includes(i) ? 'blown' : 'ok'), power: true, hold: -1, ht: 0, drag: null, mx: 0, my: 0, zap: 0, msg: '', msgT: 0, win: 0, done: false, SW: { x: 418, y: 380, w: 70, h: 96 }, BOX: { x: 26, y: 392, w: 120, h: 86 } };
    const hit = (x, y) => arms.findIndex(a => Math.hypot(a.x - x, a.y + 26 - y) < 40);
    s.down = (x, y) => { if (s.win > 0 || s.zap > 0) return; s.mx = x; s.my = y;
      if (inside(x, y, s.SW)) { const all = s.st.every(v => v === 'ok'); if (!s.power && s.st.some(v => v === 'empty')) { s.msg = 'A SOCKET\'S STILL EMPTY'; s.msgT = 1.2; sfx('error', null, 0.4); return; }
        s.power = !s.power; sfx('lightswitch', null, 0.6); if (s.power && all) { s.win = 0.001; sfx('bulbs_on', null, 0.6); } return; }
      if (inside(x, y, s.BOX)) { s.drag = { x, y }; return; }
      const i = hit(x, y); if (i < 0) return; if (s.st[i] === 'blown') { if (s.power) { s.zap = 0.9; s.msg = 'ZZZT! TURN THE POWER OFF FIRST'; s.msgT = 1.4; sfx('shock', null, 0.9); return; } s.hold = i; s.ht = 0; } };
    s.move = (x, y) => { s.mx = x; s.my = y; if (s.hold >= 0 && hit(x, y) !== s.hold) { s.hold = -1; s.ht = 0; } };
    s.up = (x, y) => { s.hold = -1; s.ht = 0; if (!s.drag) return; s.drag = null; const i = hit(x ?? s.mx, y ?? s.my); if (i >= 0 && s.st[i] === 'empty') { s.st[i] = 'new'; sfx('bulb_in', null, 0.5); } };
    s.update = (dt) => { if (s.zap > 0) s.zap -= dt; if (s.msgT > 0) s.msgT -= dt; if (s.win > 0) { s.win += dt; if (s.win > 0.8) s.done = true; return; }
      for (let i = 0; i < N; i++) if (s.st[i] === 'new') s.st[i] = 'ok';
      if (s.hold >= 0) { s.ht += dt; if ((s.tk = (s.tk || 0) - dt) <= 0) { s.tk = 0.15; sfx('bulb_twist', null, 0.25); } if (s.ht >= 0.7) { s.st[s.hold] = 'empty'; s.hold = -1; s.ht = 0; sfx('bulb_out', null, 0.4); } } };
    const bulb = (g, x, y, lit, dead, t) => { if (lit) { const gr = g.createRadialGradient(x, y + 28, 2, x, y + 28, 50); gr.addColorStop(0, 'rgba(255,230,150,0.9)'); gr.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y + 28, 50, 0, 7); g.fill(); }
      g.fillStyle = lit ? '#fff4c0' : dead ? '#5a5a5a' : '#e8e4d8'; g.beginPath(); g.moveTo(x - 9, y + 10); g.quadraticCurveTo(x - 14, y + 30, x, y + 50); g.quadraticCurveTo(x + 14, y + 30, x + 9, y + 10); g.fill();          // a candle bulb
      if (dead) { g.strokeStyle = '#222'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 4, y + 22); g.lineTo(x - 1, y + 30); g.moveTo(x + 4, y + 22); g.lineTo(x + 2, y + 34); g.stroke(); g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(x, y + 34, 6, 0, 7); g.fill(); }
      g.fillStyle = '#b8a060'; g.fillRect(x - 7, y + 2, 14, 10); for (let i = 0; i < 3; i++) { g.fillStyle = '#8a7040'; g.fillRect(x - 7, y + 4 + i * 3, 14, 1); } };
    s.draw = (g, t) => {
      const lights = s.power && s.win >= 0 && !s.st.some(v => v === 'empty') ? 1 : 0;
      P.scene(g, s.title, () => { g.fillStyle = P.grad(g, 0, 0, 0, S, s.power ? ['#3a2a1a', '#1a120a'] : ['#141018', '#08060a']); g.fillRect(0, 0, S, S);
        g.fillStyle = s.power ? '#f2ead8' : '#4a4640'; g.fillRect(0, 60, S, 40); g.fillStyle = 'rgba(0,0,0,0.2)'; for (let x = 0; x < S; x += 64) g.fillRect(x, 60, 2, 40); });
      // the chandelier: the drop rod from the rose, the brass body, curling arms out to six candle-bulb sockets with drip pans
      g.strokeStyle = '#8a6a2a'; g.lineWidth = 6; g.beginPath(); g.moveTo(256, 96); g.lineTo(256, 210); g.stroke(); g.fillStyle = '#c9a24a'; g.beginPath(); g.ellipse(256, 100, 34, 8, 0, 0, 7); g.fill();
      for (let i = 0; i < 3; i++) { g.fillStyle = ['#d4af37', '#a8862a', '#c9a24a'][i]; g.beginPath(); g.ellipse(256, 180 + i * 22, 22 - i * 4, 14, 0, 0, 7); g.fill(); }
      arms.forEach((a, i) => { g.strokeStyle = '#b8902e'; g.lineWidth = 7; g.beginPath(); g.moveTo(256, 222); g.bezierCurveTo((256 + a.x) / 2, 290, a.x, a.y + 90, a.x, a.y + 50); g.stroke();
        g.fillStyle = '#d4af37'; g.beginPath(); g.ellipse(a.x, a.y + 52, 20, 6, 0, 0, 7); g.fill(); g.fillStyle = '#efe6d0'; g.fillRect(a.x - 8, a.y + 14, 16, 36);      // the drip pan and the candle sleeve
        const st = s.st[i]; if (st !== 'empty') bulb(g, a.x, a.y - 38, st === 'ok' && s.power, st === 'blown', t); else { g.fillStyle = '#222'; g.fillRect(a.x - 7, a.y + 4, 14, 12); }
        if (s.hold === i) { g.strokeStyle = '#ffd400'; g.lineWidth = 5; g.beginPath(); g.arc(a.x, a.y - 12, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.ht / 0.7); g.stroke(); }
        if (st === 'blown' && !s.power) { g.strokeStyle = 'rgba(255,90,90,0.8)'; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.arc(a.x, a.y - 12, 34, 0, 7); g.stroke(); g.setLineDash([]); }
        if (st === 'empty' && s.drag) { g.strokeStyle = '#39ff14'; g.lineWidth = 3; g.beginPath(); g.arc(a.x, a.y + 4, 26, 0, 7); g.stroke(); } });
      // the box of new bulbs, the wall switch
      g.fillStyle = '#d8c090'; rr(g, s.BOX.x, s.BOX.y, s.BOX.w, s.BOX.h, 8); g.fill(); g.fillStyle = '#b89a60'; g.fillRect(s.BOX.x, s.BOX.y, s.BOX.w, 16); txt(g, 'NEW BULBS', s.BOX.x + s.BOX.w / 2, s.BOX.y + 8, 11, '#3a2a10');
      for (let i = 0; i < 4; i++) bulb(g, s.BOX.x + 22 + i * 25, s.BOX.y + 16, false, false, t);
      const SW = s.SW; g.fillStyle = '#f4f0e6'; rr(g, SW.x, SW.y, SW.w, SW.h, 8); g.fill(); g.strokeStyle = '#a89a80'; g.lineWidth = 2; rr(g, SW.x, SW.y, SW.w, SW.h, 8); g.stroke();
      g.fillStyle = '#e0dccc'; rr(g, SW.x + 22, SW.y + 18, 26, 60, 6); g.fill(); g.fillStyle = s.power ? '#c62828' : '#555'; rr(g, SW.x + 24, s.power ? SW.y + 20 : SW.y + 48, 22, 28, 5); g.fill();
      txt(g, s.power ? 'ON' : 'OFF', SW.x + SW.w / 2, SW.y - 12, 16, s.power ? '#ffd400' : '#9fb0c0');
      if (s.drag) bulb(g, s.mx, s.my - 30, false, false, t);
      if (s.zap > 0) { g.strokeStyle = `rgba(160,220,255,${s.zap})`; g.lineWidth = 3; for (let k = 0; k < 4; k++) { g.beginPath(); let x = s.mx, y = s.my; g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += (Math.random() - 0.5) * 50; y += 18; g.lineTo(x, y); } g.stroke(); } g.fillStyle = `rgba(200,230,255,${s.zap * 0.25})`; g.fillRect(0, 0, S, S); }
      const left = s.st.filter(v => v !== 'ok').length;
      P.hint(g, s.msgT > 0 ? s.msg : s.win > 0 ? '✨ LET THERE BE LIGHT' : left ? (s.power ? 'POWER OFF AT THE SWITCH FIRST' : 'HOLD A BLOWN BULB · DRAG A NEW ONE IN') : 'POWER BACK ON', 82, s.msgT > 0 ? '#ff8a8a' : '#fff');
      void lights;
    };
    return s;
  },
  // GRILL: the BBQ: burgers go on, tap to flip each one when the underside's browned, tap again when the other side's done
  // to serve it in its bun. Leave one too long and it's charcoal (three in the bin and you start again). Flare-ups cook faster
  grill(o = {}) {
    const need = o.need || 6, SL = [...Array(6)].map((_, i) => ({ x: 104 + (i % 3) * 120, y: 230 + Math.floor(i / 3) * 110 }));
    const s = { title: o.title || 'FLIP THE BURGERS', need, served: 0, burnt: 0, slots: SL.map(() => null), spawnT: 0.3, flare: SL.map(() => 0), msg: '', msgT: 0, plate: [], done: false, _SL: SL };
    s.down = (x, y) => { if (s.done) return; const i = SL.findIndex(p => Math.hypot(p.x - x, p.y - y) < 52); if (i < 0) return; const b = s.slots[i]; if (!b) return;
      const c = b.side ? b.c1 : b.c0; if (c < 0.6) { s.msg = 'NOT BROWNED YET'; s.msgT = 0.8; sfx('tap', null, 0.3); return; }
      if (!b.side) { b.side = 1; b.flip = 1; sfx('flip', null, 0.6); } else { s.slots[i] = null; s.served++; s.plate.push(1); sfx('plate_down', null, 0.5); if (s.served >= need) s.done = true; } };
    s.move = () => {}; s.up = () => {};
    s.update = (dt) => { if (s.done) return; if (s.msgT > 0) s.msgT -= dt;
      if ((s.spawnT -= dt) <= 0) { const free = s.slots.map((b, i) => b ? -1 : i).filter(i => i >= 0); if (free.length && s.slots.filter(Boolean).length < 4) { const i = free[Math.floor(Math.random() * free.length)]; s.slots[i] = { c0: 0, c1: 0, side: 0, rate: 0.2 + Math.random() * 0.12, flip: 0 }; sfx('grill', null, 0.3); } s.spawnT = 1.4 + Math.random() * 0.8; }
      s.slots.forEach((b, i) => { if (s.flare[i] > 0) s.flare[i] -= dt; else if (b && Math.random() < dt * 0.05) s.flare[i] = 1.4;
        if (!b) return; if (b.flip > 0) b.flip -= dt * 3; const k = b.rate * dt * (s.flare[i] > 0 ? 2 : 1); if (b.side) b.c1 += k; else b.c0 += k;
        if ((b.side ? b.c1 : b.c0) > 1.15) { s.slots[i] = null; s.burnt++; sfx('bin', null, 0.5); s.msg = `BURNT! ${s.burnt}/3 IN THE BIN`; s.msgT = 1.2; if (s.burnt >= 3) { s.msg = 'THREE BURNT — START AGAIN'; s.msgT = 1.8; s.burnt = 0; s.served = 0; s.plate = []; s.slots = SL.map(() => null); } } }); };
    const col = (c) => { const k = Math.min(1.2, c); if (k < 0.6) { const u = k / 0.6; return `rgb(${Math.round(214 - 40 * u)},${Math.round(110 - 20 * u)},${Math.round(120 - 50 * u)})`; } if (k <= 1) { const u = (k - 0.6) / 0.4; return `rgb(${Math.round(150 - 50 * u)},${Math.round(84 - 34 * u)},${Math.round(40 - 16 * u)})`; } return '#1e1612'; };
    s.draw = (g, t) => {
      P.scene(g, s.title, () => { g.fillStyle = P.grad(g, 0, 0, 0, S, ['#8fd0ff', '#d8f0ff']); g.fillRect(0, 0, S, 200); g.fillStyle = '#5aa83a'; g.fillRect(0, 160, S, 360);
        for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(40,90,20,0.4)'; g.fillRect((i * 97) % S, 170 + (i * 53) % 330, 3, 8); } });
      // the BBQ: a black kettle-ish box on legs, the glowing coals under the grill bars, the lid propped open behind, the side shelf with the buns
      g.fillStyle = '#1a1a1a'; rr(g, 30, 120, 382, 46, 12); g.fill(); g.fillStyle = '#2a2a2a'; rr(g, 40, 126, 362, 30, 10); g.fill(); txt(g, 'RONNIE-Q', 221, 141, 15, '#c62828');
      g.fillStyle = '#222'; rr(g, 30, 170, 382, 270, 18); g.fill(); g.fillStyle = '#3a1a0a'; rr(g, 44, 180, 354, 248, 12); g.fill();
      for (let i = 0; i < 70; i++) { const x = 54 + (i * 37) % 334, y = 190 + (i * 53) % 228, gl = 0.5 + 0.5 * Math.sin(t * 3 + i); g.fillStyle = `rgba(${200 + 55 * gl},${60 + 60 * gl},20,0.9)`; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); g.fillStyle = 'rgba(40,40,40,0.6)'; g.beginPath(); g.arc(x + 3, y + 2, 5, 0, 7); g.fill(); }
      g.strokeStyle = '#555'; g.lineWidth = 4; for (let x = 54; x < 396; x += 16) { g.beginPath(); g.moveTo(x, 182); g.lineTo(x, 426); g.stroke(); }
      for (const x of [56, 386]) { g.fillStyle = '#1a1a1a'; g.fillRect(x - 6, 440, 12, 60); }
      g.fillStyle = '#6a4a2a'; rr(g, 418, 230, 82, 200, 8); g.fill(); g.fillStyle = '#fbfbf8'; g.beginPath(); g.ellipse(459, 300, 34, 26, 0, 0, 7); g.fill();
      s.plate.forEach((_, i) => { if (i > 5) return; const y = 330 - i * 14; g.fillStyle = '#e0a050'; rr(g, 432, y, 54, 10, 5); g.fill(); g.fillStyle = '#4a2a14'; g.fillRect(434, y - 4, 50, 5); g.fillStyle = '#e8b060'; g.beginPath(); g.ellipse(459, y - 6, 27, 9, 0, Math.PI, 0); g.fill(); });
      for (let i = 0; i < 3; i++) { g.fillStyle = '#e8b060'; g.beginPath(); g.ellipse(459, 400 - i * 16, 26, 9, 0, 0, 7); g.fill(); }
      // the burgers
      SL.forEach((p, i) => { const b = s.slots[i]; if (s.flare[i] > 0) { for (let k = 0; k < 5; k++) P.flame(g, p.x - 30 + k * 15, p.y + 26 - Math.random() * 6, 1.1, t + k); }
        if (!b) { g.strokeStyle = 'rgba(255,255,255,0.15)'; g.lineWidth = 2; g.setLineDash([5, 5]); g.beginPath(); g.ellipse(p.x, p.y, 42, 30, 0, 0, 7); g.stroke(); g.setLineDash([]); return; }
        const up = b.side ? b.c0 : 0, face = b.side ? b.c0 : 0; void face; const sq = b.flip > 0 ? Math.abs(Math.cos(b.flip * Math.PI)) : 1;
        g.save(); g.translate(p.x, p.y - (b.flip > 0 ? Math.sin(b.flip * Math.PI) * 40 : 0)); g.scale(1, sq);
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(4, 6, 44, 30, 0, 0, 7); g.fill();
        g.fillStyle = b.side ? col(b.c0) : '#d06e78'; g.beginPath(); g.ellipse(0, 0, 42, 30, 0, 0, 7); g.fill();       // the top you can see (raw pink, or the side you've cooked)
        g.fillStyle = col(b.side ? b.c1 : b.c0); g.fillRect(-42, 0, 84, 0); g.strokeStyle = col(b.side ? b.c1 : b.c0); g.lineWidth = 6; g.beginPath(); g.ellipse(0, 0, 42, 30, 0, 0.2, Math.PI - 0.2); g.stroke();      // the edge shows the underside cooking
        if (b.side && up >= 0.6) { g.strokeStyle = 'rgba(30,15,5,0.7)'; g.lineWidth = 4; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(-30, k * 9 - 8); g.lineTo(30, k * 9 + 8); g.stroke(); } }
        g.restore();
        const c = b.side ? b.c1 : b.c0; g.fillStyle = '#222'; g.fillRect(p.x - 34, p.y + 36, 68, 7); g.fillStyle = c < 0.6 ? '#ff8a8a' : c <= 1 ? '#39ff14' : '#111'; g.fillRect(p.x - 34, p.y + 36, 68 * Math.min(1, c / 1.15), 7); g.fillStyle = '#fff'; g.fillRect(p.x - 34 + 68 * 0.6 / 1.15, p.y + 34, 2, 11); g.fillRect(p.x - 34 + 68 / 1.15, p.y + 34, 2, 11);
        if (c > 0.85) { g.fillStyle = `rgba(80,80,80,${Math.min(0.6, (c - 0.85))})`; g.beginPath(); g.arc(p.x + Math.sin(t * 3) * 8, p.y - 50 - (t * 30 % 30), 16, 0, 7); g.fill(); } });
      P.hint(g, s.msgT > 0 ? s.msg : `TAP TO FLIP WHEN BROWNED · TAP AGAIN TO SERVE · ${s.served}/${need}`, 82, s.msgT > 0 ? '#ff8a8a' : '#fff', 17);
    };
    return s;
  },
  // WATER: four hanging baskets, swinging in the breeze: hold the can over each one and pour till its gauge is in the green, then
  // stop (overwater it and it pours out the bottom). The can runs dry: hold it under the outside tap to fill it
  water(o = {}) {
    const B = [...Array(4)].map((_, i) => ({ x0: 92 + i * 110, y: 200, ph: Math.random() * 6, w: 1.1 + Math.random() * 0.7, A: 22 + Math.random() * 18, m: 0.08 + Math.random() * 0.22, ok: false, still: 0, drip: 0 }));
    const s = { title: o.title || 'WATER THE HANGING BASKETS', B, tank: 1, hold: false, mx: 256, my: 320, t: 0, msg: '', msgT: 0, done: false, BAND: [0.6, 0.82], TAP: { x: 22, y: 370, w: 92, h: 110 } };
    s.bx = (b) => b.x0 + Math.sin(s.t * b.w + b.ph) * b.A;
    const spout = () => [s.mx - 46, s.my - 34];
    s.down = (x, y) => { s.hold = true; s.mx = x; s.my = y; }; s.move = (x, y) => { s.mx = x; s.my = y; }; s.up = () => { s.hold = false; };
    s.update = (dt) => { if (s.done) return; s.t += dt; if (s.msgT > 0) s.msgT -= dt; const [sx, sy] = spout();
      s.filling = s.hold && inside(s.mx, s.my, s.TAP); if (s.filling) { s.tank = Math.min(1, s.tank + dt * 0.7); if ((s.ft = (s.ft || 0) - dt) <= 0) { s.ft = 0.25; sfx('tap_fill', null, 0.15); } }
      s.pouring = s.hold && !s.filling && s.tank > 0 && s.my > 120; s.target = -1;
      if (s.pouring) { s.tank = Math.max(0, s.tank - dt * 0.16); if (s.tank <= 0) { s.msg = 'THE CAN\'S EMPTY — FILL IT AT THE TAP'; s.msgT = 1.5; }
        const i = B.findIndex(b => !b.ok && Math.abs(s.bx(b) - sx) < 30 && sy < b.y + 30); s.target = i; if (i >= 0) { const b = B[i]; b.m += dt * 0.3; b.still = 0; if ((s.pt = (s.pt || 0) - dt) <= 0) { s.pt = 0.22; sfx('watering', null, 0.15); } if (b.m > 1) { b.m = 0.35; b.drip = 1.6; s.msg = 'DROWNED IT! IT ALL POURED OUT'; s.msgT = 1.4; sfx('spill', null, 0.5); } } }
      B.forEach((b, i) => { if (b.drip > 0) b.drip -= dt; if (b.ok) return; if (i !== s.target) { b.m = Math.max(0, b.m - dt * 0.012); if (b.m >= s.BAND[0] && b.m <= s.BAND[1]) { b.still += dt; if (b.still > 0.8) { b.ok = true; sfx('bloom', null, 0.5); } } else b.still = 0; } });
      if (B.every(b => b.ok)) s.done = true; };
    s.draw = (g, t) => {
      P.scene(g, s.title, () => { g.fillStyle = '#1e2228'; g.fillRect(0, 0, S, S); for (let y = 60; y < 420; y += 18) { g.fillStyle = '#2a2e36'; g.fillRect(0, y, S, 4); g.fillStyle = '#121418'; g.fillRect(0, y + 16, S, 2); }   // black weatherboard
        P.brick(g, 0, 420, S, 100); g.fillStyle = '#7a7470'; g.fillRect(0, 414, S, 8); });
      // the outside tap on the wall (and a hose reel)
      const T = s.TAP; g.fillStyle = '#3a6a2a'; g.beginPath(); g.arc(T.x + 46, T.y + 70, 34, 0, 7); g.fill(); g.strokeStyle = '#2a5a1a'; g.lineWidth = 6; g.beginPath(); g.arc(T.x + 46, T.y + 70, 24, 0, 7); g.stroke();
      P.steel(g, T.x + 30, T.y + 4, 40, 18, 6); P.steel(g, T.x + 56, T.y + 18, 14, 26, 4); g.fillStyle = '#c62828'; g.fillRect(T.x + 38, T.y - 6, 24, 10); txt(g, 'TAP', T.x + 46, T.y - 18, 14, '#9fd8ff');
      if (s.filling) { g.fillStyle = 'rgba(160,210,255,0.85)'; g.fillRect(T.x + 60, T.y + 44, 6, s.my - T.y - 44); }
      // the baskets: a wall bracket, the chains, the wire basket full of trailing flowers that droop when dry and perk up watered
      B.forEach((b) => { const x = s.bx(b), y = b.y; g.fillStyle = '#111'; g.fillRect(b.x0 - 4, 80, 8, 24); g.fillRect(b.x0 - 4, 80, 40, 6);
        g.strokeStyle = '#555'; g.lineWidth = 2; for (const d of [-30, 0, 30]) { g.beginPath(); g.moveTo(b.x0, 104); g.lineTo(x + d, y); g.stroke(); }
        g.fillStyle = '#3a2a1a'; g.beginPath(); g.moveTo(x - 38, y); g.quadraticCurveTo(x, y + 70, x + 38, y); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 2; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(x + k * 11, y); g.lineTo(x + k * 5, y + 34); g.stroke(); }
        const perk = Math.min(1, b.m / 0.6), dry = b.m < 0.3;
        for (let k = 0; k < 9; k++) { const fx = x - 32 + k * 8, fy = y - 6 - perk * 14 + Math.sin(k * 2) * 4; g.fillStyle = dry ? '#8a7a3a' : '#3a8a2a'; g.beginPath(); g.ellipse(fx, fy, 7, 5, 0, 0, 7); g.fill();
          g.fillStyle = dry ? '#a08060' : ['#e8407a', '#ffffff', '#a040e8', '#ff8a20'][k % 4]; g.beginPath(); g.arc(fx + 2, fy - 4 * perk, 4 + perk * 2, 0, 7); g.fill(); }
        for (let k = 0; k < 4; k++) { g.strokeStyle = dry ? '#7a6a2a' : '#2e7a1e'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 30 + k * 20, y + 10); g.quadraticCurveTo(x - 36 + k * 20, y + 40, x - 30 + k * 22, y + 50 + (1 - perk) * 20); g.stroke(); }
        if (b.drip > 0) { g.fillStyle = 'rgba(160,210,255,0.8)'; for (let k = 0; k < 6; k++) g.fillRect(x - 20 + k * 8, y + 36 + ((t * 120 + k * 17) % 80), 3, 8); }
        // its gauge
        const gx = b.x0 - 9, gy = 256, gh = 92; g.fillStyle = '#111'; rr(g, gx, gy, 18, gh, 6); g.fill(); g.fillStyle = 'rgba(57,255,20,0.35)'; g.fillRect(gx, gy + gh * (1 - s.BAND[1]), 18, gh * (s.BAND[1] - s.BAND[0]));
        g.fillStyle = b.ok ? '#39ff14' : '#4aa8ff'; g.fillRect(gx + 3, gy + gh * (1 - Math.min(1, b.m)), 12, gh * Math.min(1, b.m)); if (b.ok) txt(g, '✓', b.x0, gy + gh + 16, 22, '#39ff14'); });
      // the watering can (in your hand), its water level, and the water coming out of the rose
      const [sx, sy] = spout(); g.save(); g.translate(s.mx, s.my); g.rotate(s.pouring ? -0.5 : 0);
      g.fillStyle = '#2e7d32'; rr(g, -26, -30, 60, 52, 8); g.fill(); g.fillStyle = 'rgba(160,210,255,0.6)'; g.fillRect(-22, 18 - 44 * s.tank, 6, 44 * s.tank); g.strokeStyle = '#1b5e20'; g.lineWidth = 6; g.beginPath(); g.arc(4, -32, 18, Math.PI, 0); g.stroke();
      g.strokeStyle = '#2e7d32'; g.lineWidth = 8; g.beginPath(); g.moveTo(-24, 0); g.lineTo(-46, -30); g.stroke(); g.fillStyle = '#1b5e20'; g.beginPath(); g.arc(-48, -33, 8, 0, 7); g.fill(); g.restore();
      if (s.pouring) { g.fillStyle = 'rgba(160,210,255,0.8)'; for (let k = 0; k < 8; k++) g.fillRect(sx - 14 + k * 4 + Math.sin(t * 30 + k) * 2, sy, 2, 60 + ((t * 200 + k * 23) % 40)); }
      g.fillStyle = '#111'; rr(g, 372, 452, 120, 14, 6); g.fill(); g.fillStyle = s.tank < 0.2 ? '#ff6b6b' : '#4aa8ff'; rr(g, 372, 452, 120 * s.tank, 14, 6); g.fill(); txt(g, 'CAN', 432, 438, 12, '#9fd8ff');
      P.hint(g, s.msgT > 0 ? s.msg : 'HOLD THE CAN OVER A BASKET · STOP IN THE GREEN', 82, s.msgT > 0 ? '#ff8a8a' : '#fff', 18);
    };
    return s;
  },
  // NET: litter floats down the stream: hold the net in the water to scoop it up (three at a time), then let go over the bin on
  // the bank. Don't net a duck (it flaps, quacks and you drop the lot)
  net(o = {}) {
    const need = o.need || 8, Y0 = 170, Y1 = 350, BIN = { x: 380, y: 384, w: 100, h: 110 };
    const s = { title: o.title || 'FISH OUT THE LITTER', need, got: 0, items: [], spawnT: 0, hold: false, mx: 256, my: 260, inNet: [], stun: 0, msg: '', msgT: 0, done: false, BIN, Y0, Y1 };
    const KIND = ['can', 'packet', 'bottle', 'cup', 'bag'];
    const spawn = () => { const duck = Math.random() < 0.18; s.items.push({ x: -40, y: Y0 + 26 + Math.random() * (Y1 - Y0 - 52), v: duck ? 45 + Math.random() * 20 : 55 + Math.random() * 50, k: duck ? 'duck' : KIND[Math.floor(Math.random() * KIND.length)], r: Math.random() * 6, b: Math.random() * 6 }); };
    for (let i = 0; i < 4; i++) { spawn(); s.items[i].x = 40 + i * 110; }
    s.down = (x, y) => { if (s.stun > 0) return; s.hold = true; s.mx = x; s.my = y; }; s.move = (x, y) => { s.mx = x; s.my = y; };
    s.up = (x, y) => { if (!s.hold) return; s.hold = false; if (x != null) { s.mx = x; s.my = y; } if (!s.inNet.length) return;
      if (inside(s.mx, s.my, BIN)) { s.got += s.inNet.length; sfx('litter_bin', null, 0.6); s.inNet = []; if (s.got >= need) s.done = true; }
      else { for (const it of s.inNet) { it.x = s.mx; it.y = Math.max(Y0 + 20, Math.min(Y1 - 20, s.my)); s.items.push(it); } s.inNet = []; sfx('plop', null, 0.4); s.msg = 'DROPPED IT BACK IN! EMPTY THE NET IN THE BIN'; s.msgT = 1.3; } };
    s.update = (dt) => { if (s.done) return; if (s.msgT > 0) s.msgT -= dt; if (s.stun > 0) s.stun -= dt;
      if ((s.spawnT -= dt) <= 0) { if (s.items.length < 7) spawn(); s.spawnT = 0.9 + Math.random() * 0.7; }
      const wet = s.hold && s.my > Y0 && s.my < Y1;
      for (let i = s.items.length - 1; i >= 0; i--) { const it = s.items[i]; it.x += it.v * dt; it.b += dt * 3; it.r += dt * (it.k === 'duck' ? 0 : 0.6);
        if (it.x > S + 50) { s.items.splice(i, 1); continue; }
        if (wet && Math.hypot(it.x - s.mx, it.y - s.my) < 40) { if (it.k === 'duck') { s.items.splice(i, 1); for (const q of s.inNet) { q.x = s.mx; s.items.push(q); } s.inNet = []; s.hold = false; s.stun = 0.9; s.msg = 'QUACK! YOU NETTED A DUCK — DROPPED THE LOT'; s.msgT = 1.6; sfx('quack', null, 0.5); s.flap = { x: it.x, y: it.y, t: 1 }; continue; }
          if (s.inNet.length < 3) { s.inNet.push(it); s.items.splice(i, 1); sfx('net_scoop', null, 0.3); } } }
      if (s.flap) { s.flap.t -= dt; s.flap.x += dt * 160; s.flap.y -= dt * 120; if (s.flap.t <= 0) s.flap = null; } };
    const litter = (g, it, x, y) => { g.save(); g.translate(x, y); g.rotate(it.k === 'duck' ? 0 : Math.sin(it.r) * 0.6);
      if (it.k === 'can') { g.fillStyle = '#c62828'; rr(g, -9, -16, 18, 32, 4); g.fill(); g.fillStyle = '#ddd'; g.fillRect(-9, -16, 18, 4); g.fillStyle = '#fff'; g.fillRect(-5, -4, 10, 6); }
      else if (it.k === 'packet') { g.fillStyle = '#1e88e5'; g.beginPath(); g.moveTo(-16, -12); g.lineTo(16, -14); g.lineTo(14, 12); g.lineTo(-14, 14); g.closePath(); g.fill(); g.fillStyle = '#ffd400'; g.fillRect(-8, -4, 16, 8); }
      else if (it.k === 'bottle') { g.fillStyle = 'rgba(160,220,200,0.85)'; rr(g, -22, -8, 34, 16, 6); g.fill(); g.fillRect(12, -4, 12, 8); g.fillStyle = '#2e7d32'; g.fillRect(-12, -8, 12, 16); }
      else if (it.k === 'cup') { g.fillStyle = '#fafafa'; g.beginPath(); g.moveTo(-10, -14); g.lineTo(10, -14); g.lineTo(7, 14); g.lineTo(-7, 14); g.closePath(); g.fill(); g.fillStyle = '#c62828'; g.fillRect(-9, -4, 18, 5); }
      else if (it.k === 'bag') { g.fillStyle = 'rgba(240,240,240,0.8)'; g.beginPath(); g.ellipse(0, 0, 20, 13, 0.3, 0, 7); g.fill(); g.strokeStyle = '#aaa'; g.lineWidth = 2; g.beginPath(); g.arc(-6, -12, 6, Math.PI, 0); g.stroke(); }
      else { g.fillStyle = '#8a6a3a'; g.beginPath(); g.ellipse(0, 4, 24, 13, 0, 0, 7); g.fill(); g.fillStyle = '#2e6a2a'; g.beginPath(); g.arc(18, -10, 10, 0, 7); g.fill(); g.fillStyle = '#ffb300'; g.beginPath(); g.moveTo(26, -10); g.lineTo(36, -7); g.lineTo(26, -5); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(20, -12, 2, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(14, -4, 8, 3); }
      g.restore(); };
    s.draw = (g, t) => {
      P.scene(g, s.title, () => { g.fillStyle = '#5aa83a'; g.fillRect(0, 0, S, Y0); g.fillStyle = '#8a8a8a'; g.fillRect(0, Y0 - 16, S, 16);      // the far bank, its edging
        const wg = P.grad(g, 0, Y0, 0, Y1, ['#3a7aa8', '#2a6090', '#3a7aa8']); g.fillStyle = wg; g.fillRect(0, Y0, S, Y1 - Y0);
        g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { const y = Y0 + 10 + (i * 37) % (Y1 - Y0 - 20), x = ((i * 113 + t * 70) % (S + 80)) - 40; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 18, y - 4, x + 36, y); g.stroke(); }
        g.fillStyle = '#8a8a8a'; g.fillRect(0, Y1, S, 14); g.fillStyle = '#5aa83a'; g.fillRect(0, Y1 + 14, S, S);
        for (let i = 0; i < 18; i++) { g.strokeStyle = '#3a7a2a'; g.lineWidth = 3; const x = (i * 61) % S; g.beginPath(); g.moveTo(x, Y0 - 16); g.quadraticCurveTo(x + 4, Y0 - 50, x + 10, Y0 - 66); g.stroke(); }
        g.fillStyle = '#6a4a2a'; for (let i = 0; i < 4; i++) g.fillRect(150 + i * 4, Y1 - 6 + i, 3, 3); });
      for (const it of s.items) litter(g, it, it.x, it.y + Math.sin(it.b) * 3);
      if (s.flap) { g.globalAlpha = Math.max(0, s.flap.t); litter(g, { k: 'duck', r: 0 }, s.flap.x, s.flap.y); txt(g, 'QUACK!', s.flap.x, s.flap.y - 34, 22, '#ffd400'); g.globalAlpha = 1; }
      // the bin on the bank: a green wheelie bin, lid up
      g.fillStyle = '#2e7d32'; rr(g, BIN.x + 8, BIN.y + 20, BIN.w - 16, BIN.h - 20, 8); g.fill(); g.fillStyle = '#1b5e20'; g.fillRect(BIN.x + 2, BIN.y + 10, BIN.w - 4, 14); g.save(); g.translate(BIN.x + 2, BIN.y + 10); g.rotate(-0.9); g.fillRect(0, -6, BIN.w - 4, 8); g.restore();
      txt(g, `${s.got}/${need}`, BIN.x + BIN.w / 2, BIN.y + 66, 22, '#fff'); for (const x of [BIN.x + 20, BIN.x + BIN.w - 20]) { g.fillStyle = '#111'; g.beginPath(); g.arc(x, BIN.y + BIN.h, 8, 0, 7); g.fill(); }
      // the net on its long pole: in the water when you hold it down
      const wet = s.hold && s.my > Y0 && s.my < Y1; g.strokeStyle = '#8a6a3a'; g.lineWidth = 7; g.beginPath(); g.moveTo(s.mx + 30, s.my + 30); g.lineTo(s.mx + 170, s.my + 240); g.stroke();
      g.strokeStyle = '#ddd'; g.lineWidth = 4; g.beginPath(); g.ellipse(s.mx, s.my, 38, wet ? 14 : 26, 0, 0, 7); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(s.mx + k * 10, s.my - 12); g.lineTo(s.mx + k * 5, s.my + 26); g.stroke(); }
      s.inNet.forEach((it, i) => litter(g, it, s.mx - 16 + i * 16, s.my + 4));
      if (wet) { g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 2; g.beginPath(); g.ellipse(s.mx, s.my + 6, 50 + Math.sin(t * 8) * 4, 18, 0, 0, 7); g.stroke(); }
      P.hint(g, s.msgT > 0 ? s.msg : s.inNet.length >= 3 ? 'NET\'S FULL — LET GO OVER THE BIN' : 'HOLD THE NET IN THE STREAM · LET GO OVER THE BIN', 82, s.msgT > 0 ? '#ff8a8a' : '#fff', 17);
    };
    return s;
  },
};
Object.assign(GAMES, NEW_GAMES);

export const makeGame = (kind, o) => { o = o || {}; const s = GAMES[kind](o), a = ART[kind]; if (a) s.draw = (g, t) => a(g, s, t || 0, o); return s; };

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
    // (a screen can ask for a big, labelled close button, e.g. the security cameras: '✕ STOP WATCHING')
    Object.assign(this.x.style, thing.bigClose ? { width: 'auto', height: '64px', padding: '0 22px', borderRadius: '32px', border: '4px solid #ffd400', font: '900 22px Arial', boxShadow: '0 0 0 4px rgba(0,0,0,0.5), 0 6px 18px rgba(0,0,0,0.6)' } : { width: '54px', height: '54px', padding: '0', borderRadius: '50%', border: '3px solid #fff', font: '900 24px Arial', boxShadow: 'none' });
    this.x.textContent = thing.bigClose || '✕';
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
    if (c.quit) { c.quit = false; this.close(); return; }          // (a screen's own close button)
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
