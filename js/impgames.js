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
  g.lineWidth = Math.max(3, f / 5); g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineJoin = 'round'; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y);
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
    s.up = () => { if (!s.pouring) return; s.pouring = false; if (s.fill >= 0.84 && s.fill <= 0.95) { s.settle = 0.001; sfx('pop', null, 0.6); } else if (s.fill > 0.1) { s.fail = 1.2; sfx('splat', null, 0.6); } };
    s.update = (dt) => { if (s.pouring) { s.fill += dt * 0.32; if ((s.pourT = (s.pourT || 0) - dt) <= 0) { s.pourT = 0.18; sfx('fizz', null, 0.15); } if (s.fill > 1.02) { s.pouring = false; s.fail = 1.2; sfx('splat', null, 0.7); } }
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
    s.move = (x, y) => { if (s.last === null) return; const a = Math.atan2(y - 280, x - 256); let d = a - s.last; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; if (d > 0) s.turned += d; s.last = a; if ((s.clk = (s.clk || 0) + Math.abs(d)) > 0.8) { s.clk = 0; sfx('clink', null, 0.3); } if (s.turned >= s.need) s.done = true; };
    s.up = () => { s.last = null; }; s.update = () => {};
    s.draw = (g) => { frame(g, s.title); const k = Math.min(1, s.turned / s.need);
      g.save(); g.translate(256, 280); g.rotate(s.turned);
      g.lineWidth = 22; g.strokeStyle = '#c62828'; g.beginPath(); g.arc(0, 0, 130, 0, 7); g.stroke();
      for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.lineWidth = 14; g.strokeStyle = '#8e1c1c'; g.beginPath(); g.moveTo(0, 0); g.lineTo(130, 0); g.stroke(); }
      g.fillStyle = '#ddd'; g.beginPath(); g.arc(0, 0, 26, 0, 7); g.fill(); g.fillStyle = '#ffd400'; g.beginPath(); g.arc(130, 0, 20, 0, 7); g.fill(); g.restore();
      g.fillStyle = '#333'; rr(g, 56, 448, 400, 22, 11); g.fill(); g.fillStyle = '#39ff14'; rr(g, 56, 448, 400 * k, 22, 11); g.fill();
      txt(g, '↻ ' + s.hint, S / 2, 92, 22);
    };
    return s;
  },
  // SWIPE: the card through the reader at the right speed (the card machine / the staff clock)
  swipe(o = {}) {
    const s = { title: o.title || 'TAKE A CARD PAYMENT', hint: 'DRAG THE CARD ALL THE WAY ACROSS', x: 60, drag: false, t0: 0, msg: '', msgT: 0, done: false, ok: 0 };
    s.down = (x, y) => { if (y > 230 && y < 380 && x < s.x + 170) { s.drag = true; s.t0 = performance.now(); s.dx = x - s.x; } };
    s.move = (x) => { if (s.drag) s.x = Math.max(60, Math.min(330, x - s.dx)); };
    s.up = () => { if (!s.drag) return; s.drag = false; const dt = (performance.now() - s.t0) / 1000;
      if (s.x < 320) s.msg = 'SWIPE ALL THE WAY'; else if (dt < 0.45) s.msg = 'TOO FAST. TRY AGAIN.'; else if (dt > 1.4) s.msg = 'TOO SLOW. TRY AGAIN.'; else { s.msg = 'ACCEPTED ✓'; s.ok = 0.6; sfx('ting', null, 0.7); }
      if (!s.ok) sfx('thud', null, 0.4); s.msgT = 1.2; s.x = 60; };
    s.update = (dt) => { if (s.msgT > 0) s.msgT -= dt; if (s.ok > 0) { s.ok -= dt; if (s.ok <= 0) s.done = true; } };
    s.draw = (g) => { frame(g, s.title);
      g.fillStyle = '#2b2b2b'; rr(g, 40, 300, 432, 60, 12); g.fill(); g.fillStyle = '#111'; g.fillRect(40, 322, 432, 14);
      g.fillStyle = s.ok > 0 ? '#39ff14' : s.msgT > 0 ? '#ff4d4d' : '#ffb300'; g.beginPath(); g.arc(440, 270, 12, 0, 7); g.fill();
      g.fillStyle = '#1f6fd6'; rr(g, s.x, 236, 160, 100, 12); g.fill(); g.fillStyle = '#d4af37'; rr(g, s.x + 18, 262, 34, 26, 5); g.fill(); txt(g, 'OYSTERFLEET', s.x + 80, 312, 15);
      txt(g, s.msgT > 0 ? s.msg : s.hint, S / 2, 150, 24, s.msgT > 0 ? (s.ok > 0 ? '#39ff14' : '#ff6b6b') : '#fff'); txt(g, '→  →  →', S / 2, 410, 30, '#8aa4ff');
    };
    return s;
  },
  // WIRES: join each colour to the same colour (the jukebox)
  wires(o = {}) {
    const cols = ['#ff3b3b', '#2f7bff', '#ffd400', '#e040fb'], right = shuffle([0, 1, 2, 3]);
    const s = { title: o.title || 'FIX THE JUKEBOX WIRING', joined: [false, false, false, false], drag: null, px: 0, py: 0, done: false };
    const L = (i) => ({ x: 70, y: 130 + i * 90 }), Rt = (i) => ({ x: 442, y: 130 + right.indexOf(i) * 90 });
    s.down = (x, y) => { for (let i = 0; i < 4; i++) { const p = L(i); if (!s.joined[i] && Math.hypot(x - p.x, y - p.y) < 40) { s.drag = i; s.px = x; s.py = y; } } };
    s.move = (x, y) => { s.px = x; s.py = y; };
    s.up = (x, y) => { if (s.drag === null) return; const i = s.drag, p = Rt(i); if (Math.hypot(x - p.x, y - p.y) < 45) { s.joined[i] = true; sfx('ting', null, 0.5); if (s.joined.every(Boolean)) s.done = true; } s.drag = null; };
    s.update = () => {};
    s.draw = (g) => { frame(g, s.title); txt(g, 'DRAG EACH WIRE TO ITS COLOUR', S / 2, 82, 20);
      for (let i = 0; i < 4; i++) { const a = L(i), b = Rt(i); g.fillStyle = cols[i]; rr(g, a.x - 50, a.y - 16, 46, 32, 6); g.fill(); rr(g, b.x + 4, b.y - 16, 46, 32, 6); g.fill();
        if (s.joined[i]) { g.strokeStyle = cols[i]; g.lineWidth = 14; g.beginPath(); g.moveTo(a.x, a.y); g.bezierCurveTo(256, a.y, 256, b.y, b.x, b.y); g.stroke(); } }
      if (s.drag !== null) { const a = L(s.drag); g.strokeStyle = cols[s.drag]; g.lineWidth = 14; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(s.px, s.py); g.stroke(); }
    };
    return s;
  },
  // COLLECT: tap every one of them (coins out of the fruit machine, empties off the tables, loo rolls on the holders)
  collect(o = {}) {
    const n = o.n || 8, s = { title: o.title || 'EMPTY THE FRUIT MACHINE', icon: o.icon || '🪙', into: o.into || '💰', bits: [], done: false };
    for (let i = 0; i < n; i++) s.bits.push({ x: 70 + Math.random() * 372, y: 110 + Math.random() * 250, got: 0, r: (Math.random() - 0.5) * 0.8 });
    s.down = (x, y) => { for (const b of s.bits) if (!b.got && Math.hypot(x - b.x, y - b.y) < 40) { b.got = 0.001; sfx('pop', null, 0.4); return; } };
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
    s.down = () => { s.p += 0.075; s.bob = 1; sfx(Math.random() < 0.5 ? 'squish' : 'splat', null, 0.35); if (s.p >= 1) { s.done = true; sfx('gulp', null, 0.8); } };
    s.move = () => {}; s.up = () => {};
    s.update = (dt) => { s.p = Math.max(0, s.p - dt * 0.09); s.bob = Math.max(0, s.bob - dt * 6); };
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
    const names = shuffle(['DAVE', 'SHARON', 'KEV', 'TRACY', 'GAZ', 'BEV', 'DEL', 'SANDRA', 'MO', 'JEAN']), times = ['5:30', '6:00', '6:30', '7:00', '7:15', '7:45', '8:00', '8:30'];
    const list = times.map((tm, i) => ({ tm, who: names[i], i })), cells = shuffle(list);
    const s = { title: o.title || 'SORT THE BOOKINGS', next: 0, bad: 0, done: false };
    const box = (j) => ({ x: 36 + (j % 2) * 226, y: 96 + Math.floor(j / 2) * 94, w: 214, h: 82 });
    s.down = (x, y) => { cells.forEach((c, j) => { if (!inside(x, y, box(j)) || c.i < s.next) return; if (c.i === s.next) { s.next++; sfx('ting', null, 0.4); if (s.next >= list.length) s.done = true; } else { s.next = 0; s.bad = 0.8; sfx('thud', null, 0.5); } }); };
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
    for (let i = 0; i < 7; i++) s.spots.push({ x: 100 + Math.random() * 312, y: 140 + Math.random() * 230, r: 28 + Math.random() * 26, a: 1, c: R(['#7a4a1a', '#a0522d', '#5a3a1a', '#c8a040']) });
    s.down = (x, y) => { s.drag = true; s.cx = x; s.cy = y; }; s.up = () => { s.drag = false; };
    s.move = (x, y) => { s.cx = x; s.cy = y; if (!s.drag) return; for (const p of s.spots) if (p.a > 0 && Math.hypot(x - p.x, y - p.y) < p.r + 26) { p.a -= 0.035; if ((s.sq = (s.sq || 0) + 1) % 9 === 0) sfx('squish', null, 0.25); } if (s.spots.every(p => p.a <= 0)) s.done = true; };
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
    const code = String(Math.floor(10000 + Math.random() * 89999)), s = { title: o.title || 'RESET THE SLOT MACHINE', typed: '', bad: 0, done: false };
    const key = (k) => ({ x: 146 + (k === 'C' ? 0 : k === '0' ? 1 : k === 'OK' ? 2 : (Number(k) - 1) % 3) * 76, y: 200 + (k === 'C' || k === '0' || k === 'OK' ? 3 : Math.floor((Number(k) - 1) / 3)) * 70, w: 68, h: 62 });
    const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'];
    s.down = (x, y) => { for (const k of KEYS) if (inside(x, y, key(k))) { sfx('clink', null, 0.4);
      if (k === 'C') s.typed = ''; else if (k === 'OK') { if (s.typed === code) { s.done = true; sfx('ting', null, 0.7); } else { s.bad = 0.9; s.typed = ''; sfx('thud', null, 0.5); } } else if (s.typed.length < 5) s.typed += k; } };
    s.move = () => {}; s.up = () => {}; s.update = (dt) => { if (s.bad > 0) s.bad -= dt; };
    s.draw = (g) => { frame(g, s.title);
      g.fillStyle = '#fffbe6'; g.save(); g.translate(40, 70); g.rotate(-0.06); rr(g, 0, 0, 150, 90, 6); g.fill(); txt(g, 'RESET CODE', 75, 24, 16, '#c62828'); txt(g, code, 75, 60, 32, '#222'); g.restore();
      g.fillStyle = '#000'; rr(g, 220, 100, 250, 70, 10); g.fill(); txt(g, s.bad > 0 ? 'ERROR' : (s.typed || '_____'), 345, 136, 40, s.bad > 0 ? '#ff4d4d' : '#39ff14');
      for (const k of KEYS) btn(g, key(k), k, k === 'OK' ? '#2e7d32' : k === 'C' ? '#c62828' : '#3a4a8a', 26);
    };
    return s;
  },
  // DIAL: stop the needle in the green (the keg pressure / the fuse box)
  dial(o = {}) {
    const s = { title: o.title || 'CHECK THE KEG PRESSURE', a: 0, v: 1.6, hits: 0, need: o.need || 3, flash: 0, zone: [0.15, 0.45], done: false };
    const B = { x: 156, y: 400, w: 200, h: 70 };
    s.down = (x, y) => { if (!inside(x, y, B)) return; const k = (Math.sin(s.a) + 1) / 2; if (k >= s.zone[0] && k <= s.zone[1]) { s.hits++; s.flash = 0.4; sfx('ting', null, 0.6); s.v *= 1.25; const c = 0.15 + Math.random() * 0.55; s.zone = [c, c + 0.28 - s.hits * 0.04]; if (s.hits >= s.need) s.done = true; } else { s.flash = -0.4; s.hits = Math.max(0, s.hits - 1); sfx('thud', null, 0.5); } };
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
    const n = 5, on = Array.from({ length: n }, () => Math.random() < 0.3), s = { title: o.title || 'FIX THE LIGHTS', done: false };
    const box = (i) => ({ x: 46 + i * 86, y: 170, w: 72, h: 200 });
    s.down = (x, y) => { for (let i = 0; i < n; i++) if (inside(x, y, box(i))) { on[i] = !on[i]; sfx('clink', null, 0.6); if (on.every(Boolean)) s.done = true; } };
    s.move = () => {}; s.up = () => {}; s.update = () => {};
    s.draw = (g) => { frame(g, s.title); txt(g, 'FLIP THEM ALL UP', S / 2, 90, 22);
      for (let i = 0; i < n; i++) { const b = box(i); g.fillStyle = '#2a2a2a'; rr(g, b.x, b.y, b.w, b.h, 10); g.fill(); g.fillStyle = on[i] ? '#39ff14' : '#ff3b3b'; g.beginPath(); g.arc(b.x + b.w / 2, b.y - 22, 12, 0, 7); g.fill();
        g.fillStyle = '#ddd'; rr(g, b.x + 14, on[i] ? b.y + 14 : b.y + b.h - 84, b.w - 28, 70, 8); g.fill(); }
      if (on.every(Boolean)) txt(g, '💡 LIGHTS ON', S / 2, 440, 30, '#ffd400');
    };
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
    if (c.done && this.doneT === 0) { this.doneT = 0.001; sfx('fanfare', null, 0.6); }
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
