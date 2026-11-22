// (a plain script, not a module: it's loaded straight in with the menu, so the pictures are always there)
(function () {
// Pictures for the HOW TO PLAY pages before each game: drawn on a canvas (so the headset's menu panel can show
// them too). Maps show where things really are (the bar's stations are drawn from their real positions).
// (older iPhones' browsers have no roundRect on a canvas: without it every picture came out blank)
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
  r = Math.min(typeof r === 'number' ? r : (r && r[0]) || 0, w / 2, h / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); };
const PORTRAITS = {};
const portrait = (id, redraw) => { if (PORTRAITS[id]) return PORTRAITS[id].complete ? PORTRAITS[id] : null; const im = new Image(); im.onload = redraw; im.src = `./assets/portraits/${id}.webp`; PORTRAITS[id] = im; return null; };
const FONT = '"Arial Black", Arial, sans-serif';

function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function label(g, txt, x, y, { size = 15, col = '#fff', bg = 'rgba(10,14,40,0.88)', border = '#ffd400', align = 'center' } = {}) {
  g.font = `900 ${size}px ${FONT}`; const w = g.measureText(txt).width + 14, h = size + 10, x0 = align === 'center' ? x - w / 2 : align === 'left' ? x : x - w;
  g.fillStyle = bg; rr(g, x0, y - h / 2, w, h, 8); g.fill(); g.lineWidth = 2.5; g.strokeStyle = border; g.stroke();
  g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x0 + w / 2, y + 1);
}
const EMO = {};
function emoji(g, e, x, y, s) {
  if (s <= 64) { g.fillStyle = '#000'; g.font = `${s}px sans-serif`;      /* (solid: a see-through colour left from before faded the emoji) */ g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, x, y); return; }
  // (an iPhone leaves an emoji much bigger than this out of a canvas altogether: drawn at 64 and scaled up instead)
  let c = EMO[e]; if (!c) { c = EMO[e] = document.createElement('canvas'); c.width = c.height = 96; const q = c.getContext('2d'); q.font = '64px sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(e, 48, 50); }
  const k = s / 64, w = 96 * k; g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(c, x - w / 2, y - w / 2 - 2 * k, w, w); g.restore();
}
function arrow(g, x0, y0, x1, y1, col = '#ffd400', dash = [8, 6]) {
  g.save(); g.strokeStyle = col; g.lineWidth = 4; g.setLineDash(dash); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]);
  const a = Math.atan2(y1 - y0, x1 - x0); g.fillStyle = col; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - Math.cos(a - 0.45) * 14, y1 - Math.sin(a - 0.45) * 14); g.lineTo(x1 - Math.cos(a + 0.45) * 14, y1 - Math.sin(a + 0.45) * 14); g.fill(); g.restore();
}
function bg(g, W, H, c1 = '#24318f', c2 = '#121a52') { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; rr(g, 0, 0, W, H, 22); g.fill(); }

// ---------------------------------------------------------------- RUN THE PUB: the bar, from above
// (positions in metres from barstations.js / runpub.js: the bar front runs along x≈2.6, the back counter x≈5.6)
function pubMap(g, W, H, focus) {
  bg(g, W, H, '#3a1e14', '#1e0e08');
  const X = (x) => 30 + (x - 1.4) * (W - 60) / 4.7, Y = (z) => 26 + (z + 8.4) * (H - 52) / 5.6;
  // floor behind the bar, the customers' side
  g.fillStyle = '#5a3a26'; rr(g, X(2.85), Y(-8.3), X(5.95) - X(2.85), Y(-2.9) - Y(-8.3), 10); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.06)'; for (let i = 0; i < 12; i++) g.fillRect(X(2.85) + i * 26, Y(-8.3), 2, Y(-2.9) - Y(-8.3));
  // the bar counter and the back counter
  g.fillStyle = '#8a4a1e'; rr(g, X(2.35), Y(-8.4), X(2.85) - X(2.35), Y(-2.8) - Y(-8.4), 6); g.fill(); g.strokeStyle = '#d4af37'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#3a3a3a'; rr(g, X(5.45), Y(-8.0), X(5.95) - X(5.45), Y(-3.0) - Y(-8.0), 6); g.fill();
  // punters waiting at the bar
  for (const z of [-7.6, -6.6, -5.2, -4.2, -3.3]) { g.fillStyle = '#c8a07a'; g.beginPath(); g.arc(X(1.85), Y(z), 11, 0, 7); g.fill(); emoji(g, '🙋', X(1.85), Y(z), 18); }
  label(g, 'PUNTERS', X(1.85), Y(-8.15), { size: 15, border: '#fff' });
  // the stations
  const st = [
    ['tap', 2.62, -5.9, '🍺', 'GUINNESS TAP', '#111'], ['gun', 2.78, -3.6, '🔫', 'SODA GUN', '#c8102e'], ['cups', 2.78, -3.25, '🥤', 'CUPS', '#fff'],
    ['lager', 5.66, -7.65, '🍺', 'LAGER', '#6ad06a'], ['cider', 5.66, -7.05, '🍏', 'CIDER', '#ffb050'], ['monstor', 5.66, -6.45, '⚡', 'MONSTOR', '#39ff14'],
    ['glasses', 5.66, -5.55, '🥛', 'PINT GLASSES', '#cfe8ff'], ['wine', 5.66, -4.75, '🍷', 'WINE', '#c2185b'], ['coffee', 5.66, -3.75, '☕', 'COFFEE', '#b8bcc2'], ['mugs', 5.66, -3.25, '🫖', 'MUGS', '#fff'],
  ];
  // how drinks are made: glass → tap, mug → coffee machine, cup → gun
  if (!focus || focus === 'make') { arrow(g, X(5.4), Y(-5.55), X(2.95), Y(-5.85)); arrow(g, X(5.4), Y(-3.25), X(5.4), Y(-3.62), '#7cff6a', [5, 4]); arrow(g, X(2.95), Y(-3.3), X(2.95), Y(-3.5), '#7cff6a', [5, 4]); }
  for (const [k, x, z, e, name, col] of st) {
    const cx = X(x), cy = Y(z), hot = !focus || focus === 'make' || focus === k;
    g.globalAlpha = hot ? 1 : 0.45; g.fillStyle = col; g.beginPath(); g.arc(cx, cy, 17, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); emoji(g, e, cx, cy + 1, 21);
    const left = x > 4; if (k === 'tap') label(g, name, cx + 6, cy - 34, { size: 17, border: hot ? '#ffd400' : '#888' }); else label(g, name, left ? cx - 20 : cx + 20, cy + (k === 'cups' ? 6 : k === 'gun' ? -6 : 0), { size: 17, align: left ? 'right' : 'left', border: hot ? '#ffd400' : '#888' }); g.globalAlpha = 1;
  }
  // you
  g.fillStyle = '#ffd400'; g.beginPath(); g.arc(X(3.6), Y(-6.45), 16, 0, 7); g.fill(); emoji(g, '😋', X(3.6), Y(-6.45), 22); label(g, 'YOU', X(3.6) + 36, Y(-6.45), { size: 16, col: '#111', bg: '#ffd400', border: '#111' });
  // the order list corner
  label(g, '🧾 ORDERS LIST + ➜ ARROW = WHAT\'S NEXT', W / 2, H - 16, { size: 15, border: '#7cff6a' });
}

// ---------------------------------------------------------------- the squad, their faces, and what they do
function squadFaces(g, W, H, list, redraw) {
  bg(g, W, H);
  const n = list.length, cols = Math.min(5, n), rows = Math.ceil(n / cols), cw = (W - 20) / cols, ch = (H - 16) / rows;
  list.forEach((s, i) => {
    const cx = 10 + (i % cols) * cw + cw / 2, cy = 8 + Math.floor(i / cols) * ch + ch / 2 - 10, r = Math.min(cw, ch) * 0.3;
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fillStyle = s.c || '#444'; g.fill(); g.clip();
    const im = portrait(s.img || s.n.toLowerCase().replace(/ .*/, ''), redraw); if (im) g.drawImage(im, cx - r, cy - r, r * 2, r * 2);
    g.restore(); g.lineWidth = 3; g.strokeStyle = '#ffd400'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
    emoji(g, s.a, cx + r * 0.75, cy + r * 0.7, r * 0.7);
    g.fillStyle = '#fff'; g.font = `900 ${Math.max(10, Math.min(14, cw / 7))}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s.n.toUpperCase(), cx, cy + r + 12);
    g.fillStyle = '#c9d3ff'; g.font = `700 ${Math.max(9, Math.min(11, cw / 9))}px Arial`; g.fillText(s.t, cx, cy + r + 26, cw - 6);
  });
}

// ---------------------------------------------------------------- the controls
function controls(g, W, H, kind) {
  bg(g, W, H, '#1c2c8c', '#0e1650');
  if (kind === 'vr') {
    for (const [sx, side] of [[W * 0.27, 'L'], [W * 0.73, 'R']]) {
      g.fillStyle = '#e8e8ee'; g.beginPath(); g.ellipse(sx, H * 0.42, 62, 52, 0, 0, 7); g.fill(); g.fillStyle = '#2a2a33'; g.beginPath(); g.ellipse(sx, H * 0.42, 50, 40, 0, 0, 7); g.fill();
      g.fillStyle = '#e8e8ee'; rr(g, sx - 22, H * 0.5, 44, 90, 20); g.fill();
      g.fillStyle = '#555'; g.beginPath(); g.arc(sx + (side === 'L' ? 12 : -12), H * 0.38, 15, 0, 7); g.fill();            // stick
      for (const [dx, dy, t] of side === 'L' ? [[-16, 10, 'X'], [-26, -10, 'Y']] : [[16, 10, 'A'], [26, -10, 'B']]) { g.fillStyle = '#ddd'; g.beginPath(); g.arc(sx + dx, H * 0.42 + dy, 9, 0, 7); g.fill(); g.fillStyle = '#111'; g.font = `900 10px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, sx + dx, H * 0.42 + dy + 1); }
    }
    label(g, '🕹️ LEFT STICK: WALK (CLICK = SPRINT)', W * 0.27, H * 0.12, { size: 14 }); label(g, '🕹️ RIGHT STICK: TURN', W * 0.73, H * 0.12, { size: 14 });
    label(g, '✊ TRIGGER / GRIP: GRAB (EITHER HAND)', W / 2, H * 0.24, { size: 14, border: '#7cff6a' });
    label(g, '☰ / Y: PAUSE', W * 0.27, H * 0.88, { size: 14 }); label(g, 'B: EMOTE WHEEL', W * 0.73, H * 0.88, { size: 14 });
    label(g, '👉 POINT AT FOOD + TRIGGER = IT FLIES TO YOU', W / 2, H * 0.72, { size: 14, border: '#ff4fa3' });
    label(g, '😋 FOOD TO YOUR MOUTH = BITE', W / 2, H * 0.97 - 10, { size: 14, border: '#ffd400' });
    return;
  }
  if (kind === 'pc') {
    const key = (x, y, t, w = 34) => { g.fillStyle = '#eef'; rr(g, x - w / 2, y - 17, w, 34, 6); g.fill(); g.fillStyle = '#111'; g.font = `900 14px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y + 1); };
    key(W * 0.18, H * 0.32, 'W'); key(W * 0.18 - 38, H * 0.32 + 38, 'A'); key(W * 0.18, H * 0.32 + 38, 'S'); key(W * 0.18 + 38, H * 0.32 + 38, 'D');
    label(g, 'WALK', W * 0.18, H * 0.75, { size: 17 });
    key(W * 0.45, H * 0.42, 'E'); label(g, 'EAT', W * 0.45, H * 0.62, { size: 17, border: '#7cff6a' });
    key(W * 0.6, H * 0.42, 'SPACE', 90); label(g, 'THROW', W * 0.6, H * 0.62, { size: 17 });
    g.fillStyle = '#eef'; rr(g, W * 0.8, H * 0.22, 60, 92, 28); g.fill(); g.strokeStyle = '#111'; g.lineWidth = 2; g.beginPath(); g.moveTo(W * 0.8 + 30, H * 0.22); g.lineTo(W * 0.8 + 30, H * 0.22 + 40); g.stroke();
    label(g, 'CLICK FOOD · DRAG TO LOOK', W * 0.8 + 30, H * 0.75, { size: 14 }); label(g, 'ESC = PAUSE · SHIFT = SPRINT', W / 2, H * 0.92, { size: 14 });
    return;
  }
  // phone
  g.fillStyle = '#0a0a12'; rr(g, 20, 20, W - 40, H - 40, 26); g.fill(); g.fillStyle = '#3a5a8a'; rr(g, 30, 30, W - 60, H - 60, 18); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(95, H - 85, 40, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(95, H - 85, 18, 0, 7); g.fill();
  label(g, 'WALK', 95, H - 140, { size: 15 });
  g.fillStyle = '#5ad65a'; g.beginPath(); g.arc(W - 80, H - 85, 32, 0, 7); g.fill(); g.fillStyle = '#111'; g.font = `900 13px ${FONT}`; g.textAlign = 'center'; g.fillText('EAT', W - 80, H - 84);
  g.fillStyle = '#e6c03a'; g.beginPath(); g.arc(W - 150, H - 65, 26, 0, 7); g.fill(); g.fillStyle = '#111'; g.font = `900 11px ${FONT}`; g.fillText('THROW', W - 150, H - 64);
  label(g, '👆 TAP FOOD TO PICK IT UP', W / 2, H * 0.4, { size: 17, border: '#7cff6a' }); label(g, '👉 DRAG TO LOOK ROUND', W / 2, H * 0.4 + 30, { size: 15 });
  label(g, '⏸ PAUSE', W - 80, 52, { size: 14 }); label(g, '🏃 SPRINT', 95, 52, { size: 14 });
}

// ---------------------------------------------------------------- the eat meter
function meter(g, W, H) {
  bg(g, W, H, '#1d5a2a', '#0c2a12');
  const names = ['LITTLE', 'CHUNKY', 'BIG', 'MASSIVE', 'ENORMOUS', 'BIGGEST EVER'];
  names.forEach((n, i) => { const x = 30 + i * (W - 60) / 6, w = (W - 60) / 6 - 8, h = 30 + i * 18;
    g.fillStyle = `hsl(${60 - i * 12},90%,${55 - i * 3}%)`; rr(g, x, H - 50 - h, w, h, 8); g.fill();
    emoji(g, '🍔', x + w / 2, H - 62 - h, 18 + i * 3); g.fillStyle = '#fff'; g.font = `900 ${Math.max(9, w / 8)}px ${FONT}`; g.textAlign = 'center'; g.fillText(n, x + w / 2, H - 30); });
  label(g, 'EVERY BITE FILLS THE EAT METER · 10 STAGES', W / 2, 24, { size: 17 });
}

// ---------------------------------------------------------------- the places, from above
function lidl(g, W, H) {
  bg(g, W, H, '#1e4ea8', '#0e2a6a');
  for (let i = 0; i < 6; i++) { const x = 40 + i * (W - 80) / 6; g.fillStyle = '#e8e8f0'; rr(g, x, 50, 30, H - 120, 6); g.fill();
    for (let k = 0; k < 6; k++) { const glow = (i * 7 + k * 3) % 5 === 0; g.fillStyle = glow ? '#39ff14' : '#ffb050'; g.beginPath(); g.arc(x + 15, 66 + k * (H - 150) / 6, glow ? 7 : 5, 0, 7); g.fill(); } }
  emoji(g, '🛒', W * 0.15, H - 40, 34); label(g, 'YOU + TROLLEY', W * 0.15, H - 12, { size: 14 });
  emoji(g, '👮', W * 0.55, H - 45, 30); label(g, 'OLIVER', W * 0.55, H - 14, { size: 14, border: '#ff4040' }); emoji(g, '🦵', W * 0.85, H - 45, 28); label(g, 'AIDAN W (SLOW)', W * 0.85, H - 14, { size: 14, border: '#ff4040' });
  label(g, '🟢 GREEN GLOW = GRAB IT', W / 2, 24, { size: 17, border: '#39ff14' });
}
// IAN'S BARBECUE: the grill ('bbq'), Ian coming round with a healthy one ('bbq:chase'), the shoving match ('bbq:feed'),
// getting big enough to floor him ('bbq:big')
function bbq(g, W, H, arg, device) {
  if (arg === 'chase') {
    bg(g, W, H, '#4aa8f0', '#5a9a36'); g.fillStyle = '#5a9a36'; g.fillRect(0, H * 0.45, W, H * 0.55);
    g.fillStyle = 'rgba(160,20,20,0.9)'; rr(g, W / 2 - 150, 14, 300, 34, 12); g.fill(); g.fillStyle = '#fff'; g.font = `900 17px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⚠ IAN IS FORCING IT! RUN!', W / 2, 32);
    emoji(g, '🏃', W * 0.2, H * 0.62, 70); label(g, 'YOU', W * 0.2, H * 0.62 + 50, { size: 15 });
    emoji(g, '👨‍🍳', W * 0.68, H * 0.62, 70); emoji(g, '🍔', W * 0.68 - 52, H * 0.6, 34); label(g, 'IAN', W * 0.68, H * 0.62 + 50, { size: 15, border: '#ff4040' });
    arrow(g, W * 0.6, H * 0.8, W * 0.3, H * 0.8, '#ff5252');
    const said = [['"Another healthy burger, Ron? It\'s tofu!"', '#ffffff', '#39ff14'], ['"You\'re HAVING one."', '#ffffff', '#ffd400'], ['"Open wide, boy!"', '#ffffff', '#ff4040']];
    said.forEach(([t, c, b], i) => label(g, t, W * 0.62 - i * 30, 82 + i * 34, { size: 15, col: c, border: b }));
    return;
  }
  if (arg === 'feed') {
    bg(g, W, H, '#3a1406', '#14060a');
    emoji(g, '👨‍🍳', W / 2, H * 0.36, 120); emoji(g, '🍔', W / 2 - 10, H * 0.62, 64); emoji(g, '😖', W / 2 + 120, H * 0.66, 50);
    for (const [x, y, a] of [[W * 0.16, H * 0.28, -0.3], [W * 0.84, H * 0.3, 0.3], [W * 0.14, H * 0.62, 0.2], [W * 0.86, H * 0.64, -0.2]]) { g.save(); g.translate(x, y); g.rotate(a); label(g, device === 'vr' ? 'TRIGGER!' : device === 'pc' ? 'CLICK!' : 'TAP!', 0, 0, { size: 22, col: '#fff', bg: '#c2410c', border: '#ffd400' }); g.restore(); }
    const bx = 70, by = H - 58, bw = W - 140, bh = 30; g.fillStyle = '#2f7d1f'; rr(g, bx, by, bw, bh, 15); g.fill(); g.fillStyle = '#ffd400'; rr(g, bx, by, bw * 0.62, bh, 15); g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; rr(g, bx, by, bw, bh, 15); g.stroke();
    g.fillStyle = '#111'; g.font = `900 15px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('😤 YOU', bx + 12, by + bh / 2 + 1); g.textAlign = 'right'; g.fillStyle = '#fff'; g.fillText('IAN 🥗', bx + bw - 12, by + bh / 2 + 1);
    return;
  }
  if (arg === 'big') {
    bg(g, W, H, '#1f4f1a', '#0c2a0a');
    const steps = [['HIT HIM', device === 'vr' ? 'SLAP / THROW FOOD' : device === 'pc' ? 'CLICK / THROW FOOD' : 'TAP / THROW FOOD', '👋', 34, '#ffd400'], ['10-15 HITS', 'AND OVER HE GOES', '💥', 50, '#ff8a3a'], ['5 KNOCK-DOWNS', 'IAN GIVES UP!', '🏆', 66, '#39ff14']];
    steps.forEach(([st, what, e, s, c], i) => { const x = W * (0.2 + i * 0.3); emoji(g, '😋', x, H * 0.5 - (s - 34) * 0.3, s); emoji(g, e, x + s * 0.55, H * 0.5 - s * 0.45, 26); label(g, st, x, H * 0.5 + 56, { size: 15, border: c }); label(g, what, x, H * 0.5 + 86, { size: 13, col: c, border: c }); });
    label(g, '💥 💥 💥  KNOCK IAN OVER 3 TIMES: HE GIVES UP', W / 2, 32, { size: 16, border: '#39ff14' });
    return;
  }
  bg(g, W, H, '#4aa8f0', '#5a9a36');
  g.fillStyle = '#5a9a36'; g.fillRect(0, H * 0.45, W, H * 0.55);
  g.fillStyle = '#222'; rr(g, W / 2 - 90, H * 0.42, 180, 60, 8); g.fill(); g.fillStyle = '#ff6a1a'; for (let i = 0; i < 9; i++) g.fillRect(W / 2 - 80 + i * 20, H * 0.42 + 8, 4, 44);
  for (const [i, e] of ['🍔', '🌭', '🍗', '🍔', '🌭'].entries()) emoji(g, e, W / 2 - 64 + i * 32, H * 0.42 + 30, 24);
  emoji(g, '👨‍🍳', W / 2 + 140, H * 0.45, 46); label(g, 'IAN', W / 2 + 140, H * 0.45 + 40, { size: 15, border: '#ff4040' });
  arrow(g, W / 2 - 60, H * 0.4, W * 0.18, H * 0.25, '#7cff6a'); emoji(g, '🍔', W * 0.3, H * 0.3, 26); emoji(g, '😋', W * 0.14, H * 0.24, 38);
  label(g, '"FOR THE LADS, RONNIE. NOT YOU."', W / 2 + 120, H * 0.2, { size: 14, border: '#ff4040' });
  label(g, 'PINCH IT OFF THE GRILL. EAT. GET BIG.', W / 2, H - 22, { size: 17 });
}
function dateTable(g, W, H) {
  bg(g, W, H, '#5a0f18', '#1a0508');
  g.fillStyle = '#f4ead0'; g.beginPath(); g.ellipse(W / 2, H / 2 + 10, 120, 60, 0, 0, 7); g.fill();
  emoji(g, '🍝', W / 2 - 40, H / 2 + 10, 30); emoji(g, '🍰', W / 2 + 40, H / 2 + 10, 28); emoji(g, '🕯️', W / 2, H / 2 - 10, 22);
  emoji(g, '👩', W / 2, H / 2 - 70, 44); label(g, 'CHLOE', W / 2, H / 2 - 112 + 10, { size: 14, border: '#c2185b' });
  g.fillStyle = 'rgba(255,80,120,0.25)'; g.beginPath(); g.moveTo(W / 2, H / 2 - 60); g.lineTo(W / 2 + 230, H / 2 - 120); g.lineTo(W / 2 + 230, H / 2 - 10); g.fill();
  label(g, '👀 SHE\'S LOOKING THAT WAY: EAT!', W - 140, H - 30, { size: 15, border: '#7cff6a' });
  emoji(g, '😋', W / 2, H / 2 + 92, 40);
}
// DATE NIGHT's films: a strip of them, and a film's big buttons
function dateFilms(g, W, H) {
  bg(g, W, H, '#3a0a24', '#14040c');
  const fw = Math.min(110, (W - 50) / 4), fh = fw * 0.75, y0 = 26;
  g.fillStyle = '#111'; rr(g, 14, y0 - 10, W - 28, fh + 20, 6); g.fill();
  for (let i = 0; i < 4; i++) { const x = W / 2 + (i - 2) * (fw + 8) + 4; g.fillStyle = ['#5a2a6a', '#6a3a1a', '#1a3a5a', '#6a1a3a'][i]; rr(g, x, y0, fw, fh, 5); g.fill(); emoji(g, ['📱', '🧑‍🍳', '🚽', '💘'][i], x + fw / 2, y0 + fh / 2, fh * 0.55); }
  g.fillStyle = '#ddd'; for (let x = 20; x < W - 20; x += 16) { g.fillRect(x, y0 - 7, 8, 4); g.fillRect(x, y0 + fh + 3, 8, 4); }
  const bw = (W - 60) / 3, by = H - 96;
  [['🥖', 'BREAD', '#ffd400'], ['🍝', 'HER PASTA', '#ffd400'], ['😇', 'ACT NATURAL', '#9fe8ff']].forEach(([e, t, c], i) => { const x = 20 + i * (bw + 10);
    g.fillStyle = c; rr(g, x, by, bw, 74, 14); g.fill(); g.lineWidth = 3; g.strokeStyle = '#111'; g.stroke(); emoji(g, e, x + bw / 2, by + 26, 28);
    g.fillStyle = '#111'; g.font = `900 ${Math.min(14, bw / 8)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x + bw / 2, by + 56); });
  label(g, 'EACH FILM HAS ITS OWN GAME', W / 2, by - 22, { size: 15, border: '#e879f9' });
}
// BUSTED: her face when she catches you, and what it costs
function dateBusted(g, W, H) {
  bg(g, W, H, '#5a0f18', '#1a0508');
  emoji(g, '😠', W * 0.3, H * 0.4, 70); label(g, 'CHLOE', W * 0.3, H * 0.4 + 52, { size: 14, border: '#B57BFF' });
  emoji(g, '👉', W * 0.48, H * 0.4, 40); emoji(g, '😳', W * 0.7, H * 0.4, 64); emoji(g, '🍝', W * 0.76, H * 0.48, 26);
  g.save(); g.translate(W / 2, H * 0.16); g.rotate(-0.08); g.fillStyle = '#ff3a3a'; g.font = `900 40px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 7; g.strokeStyle = '#111'; g.strokeText('BUSTED!', 0, 0); g.fillText('BUSTED!', 0, 0); g.restore();
  [['🥗', 'SALAD'], ['🍽️', 'NO PLATE'], ['☎️', 'YOUR MUM']].forEach(([e, t], i) => { const x = W / 2 + (i - 1) * (W / 3.4); emoji(g, e, x, H - 58, 30); label(g, t, x, H - 26, { size: 13, border: '#ff6b6b' }); });
}
function clock(g, W, H, two) {
  bg(g, W, H, '#6a1b9a', '#2a0a4a');
  g.fillStyle = '#fff'; g.beginPath(); g.arc(W / 2, H / 2, 70, 0, 7); g.fill(); g.strokeStyle = '#ffd400'; g.lineWidth = 8; g.stroke();
  g.fillStyle = '#c62828'; g.beginPath(); g.moveTo(W / 2, H / 2); g.arc(W / 2, H / 2, 62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 1.4); g.fill();
  g.fillStyle = '#111'; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('60', W / 2, H / 2);
  for (const [i, e] of ['🍔', '🍕', '🍩', '🌭'].entries()) emoji(g, e, 60 + i * 40, H - 40, 30);
  if (two) { emoji(g, '📱', W - 120, H / 2, 40); arrow(g, W - 160, H / 2 + 40, W - 80, H / 2 + 40); label(g, 'PASS IT ON', W - 120, H / 2 + 70, { size: 15 }); }
}

// ---------------------------------------------------------------- PROP HUNT and BOSS FIGHT
function floorScene(g, W, H, c1, c2) {      // a room seen from the side: wall, skirting, floorboards
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, c1); gr.addColorStop(0.62, c2); gr.addColorStop(0.62, '#6b4a2e'); gr.addColorStop(1, '#3e2a18');
  g.save(); rr(g, 0, 0, W, H, 22); g.clip(); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, H * 0.62 - 6, W, 6);
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 2; for (let i = -6; i < 14; i++) { g.beginPath(); g.moveTo(W / 2 + i * 34, H * 0.62); g.lineTo(W / 2 + i * 90, H); g.stroke(); }
  g.restore();
}
function shadow(g, x, y, w) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x, y, w, w * 0.22, 0, 0, 7); g.fill(); }
function bubble(g, txt, x, y, col = '#fff') {
  g.font = `900 16px ${FONT}`; const w = g.measureText(txt).width + 22, h = 32;
  g.fillStyle = col; rr(g, x - w / 2, y - h / 2, w, h, 14); g.fill(); g.beginPath(); g.moveTo(x - 8, y + h / 2 - 1); g.lineTo(x, y + h / 2 + 12); g.lineTo(x + 8, y + h / 2 - 1); g.fill();
  g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, y + 1);
}
function hpBar(g, x, y, w, k, col = '#39ff14', txt) {
  g.fillStyle = 'rgba(0,0,0,0.65)'; rr(g, x - w / 2 - 3, y - 9, w + 6, 18, 9); g.fill();
  g.fillStyle = col; rr(g, x - w / 2, y - 6, Math.max(6, w * k), 12, 6); g.fill();
  if (txt) { g.fillStyle = '#fff'; g.font = `900 12px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, y + 1); }
}
function toyGun(g, x, y, s = 1) {      // the seekers' toy blaster, side on
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#2b2f3a'; rr(g, -70, -18, 120, 30, 10); g.fill();                   // body
  g.fillStyle = '#ff7a00'; rr(g, 40, -12, 38, 18, 6); g.fill();                      // orange muzzle
  g.fillStyle = '#3a404f'; rr(g, -64, -30, 70, 14, 6); g.fill();                     // top rail
  g.fillStyle = '#2b2f3a'; g.beginPath(); g.moveTo(-50, 10); g.lineTo(-20, 10); g.lineTo(-30, 52); g.lineTo(-62, 52); g.closePath(); g.fill();      // grip
  g.strokeStyle = '#2b2f3a'; g.lineWidth = 5; g.beginPath(); g.arc(-12, 18, 12, 0, Math.PI); g.stroke();    // trigger guard
  g.fillStyle = '#9fd8ff'; rr(g, -40, -27, 22, 8, 3); g.fill();                      // sight
  g.restore();
}
function crosshair(g, x, y, r = 26, col = '#ff3b3b') {
  g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.beginPath(); g.moveTo(x + a * (r - 10), y + b * (r - 10)); g.lineTo(x + a * (r + 10), y + b * (r + 10)); g.stroke(); }
}
function eyes(g, x, y) { for (const dx of [-9, 9]) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x + dx, y, 7, 9, 0, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(x + dx + 2, y + 1, 3.5, 0, 7); g.fill(); } }

function propHunt(g, W, H, page) {
  const fy = H * 0.74;
  if (page === 'intro') {
    floorScene(g, W, H, '#3b4f8f', '#2a3a72');
    const props = [['🛢️', 90], ['🗑️', 200], ['🪴', 330], ['📦', 450], ['🛢️', 560]];
    for (const [e, x] of props) { shadow(g, x, fy + 26, 30); emoji(g, e, x, fy, 58); }
    eyes(g, 330, fy - 8); label(g, '👀 A HIDER!', 330, fy - 62, { size: 15, border: '#39ff14' });
    label(g, '🔫 SEEKERS', W * 0.2, 34, { size: 17, border: '#ff3b3b' }); label(g, '🎭 HIDERS', W * 0.5, 34, { size: 17, border: '#39ff14' }); label(g, '🔁 4 ROUNDS', W * 0.8, 34, { size: 17 });
    label(g, 'ONE OF THESE IS A MATE', W / 2, H * 0.36, { size: 16, border: '#fff' });
    return;
  }
  if (page === 'hide') {
    floorScene(g, W, H, '#3b6f5a', '#28503f');
    shadow(g, 140, fy + 30, 30); emoji(g, '🧍', 140, fy - 6, 64);
    arrow(g, 190, fy - 10, 380, fy - 10, '#39ff14', [10, 6]);
    label(g, '🎰 DEALT A RANDOM PROP', 285, fy - 52, { size: 15, border: '#39ff14' });
    shadow(g, 440, fy + 30, 32); emoji(g, '🛢️', 440, fy - 2, 62); eyes(g, 440, fy - 8);
    shadow(g, 545, fy + 30, 26); emoji(g, '🛢️', 545, fy, 54);
    g.fillStyle = 'rgba(10,14,40,0.88)'; rr(g, W / 2 - 70, 18, 140, 54, 14); g.fill(); g.strokeStyle = '#ffd400'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#ffd400'; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('0:40', W / 2, 46);
    label(g, '🙈 SEEKERS HAVE THEIR EYES SHUT', W / 2, 96, { size: 14, border: '#fff' });
    label(g, '🎰 SWAP ×2', W - 78, 46, { size: 15, border: '#c792ff' });
    return;
  }
  if (page === 'lock') {
    floorScene(g, W, H, '#5a3b7a', '#3f2858');
    shadow(g, W / 2, fy + 30, 36); emoji(g, '🗑️', W / 2, fy - 2, 64); eyes(g, W / 2, fy - 12);
    emoji(g, '🔒', W / 2 + 46, fy - 40, 34); label(g, 'LOCKED IN', W / 2, fy - 86, { size: 15, border: '#ffd400' });
    bubble(g, 'QUACK! 🦆', 130, 70, '#fff3a6'); bubble(g, '📯 AIRHORN', W - 130, 70, '#a6e3ff'); bubble(g, '🎺 KAZOO', 150, 150, '#ffc2e0');
    label(g, '+ POINTS FOR EVERY TAUNT', W - 150, 150, { size: 14, border: '#39ff14' });
    return;
  }
  if (page === 'seek') {
    floorScene(g, W, H, '#7a3b3b', '#562828');
    shadow(g, 400, fy + 28, 30); emoji(g, '🛢️', 400, fy - 2, 58); eyes(g, 400, fy - 8);
    crosshair(g, 400, fy - 6, 30); emoji(g, '💥', 372, fy - 36, 30);
    hpBar(g, 400, fy - 74, 90, 0.75, '#ffd400', '75'); label(g, '-25!', 470, fy - 74, { size: 14, border: '#ff3b3b' });
    shadow(g, 545, fy + 28, 26); emoji(g, '🛢️', 545, fy, 52);
    toyGun(g, 150, H * 0.5, 1.1);
    g.strokeStyle = 'rgba(255,240,120,0.9)'; g.lineWidth = 4; g.setLineDash([12, 10]); g.beginPath(); g.moveTo(240, H * 0.5 - 10); g.lineTo(370, fy - 10); g.stroke(); g.setLineDash([]);
    label(g, '4 HITS AND THEY\'RE FOUND', W / 2, 30, { size: 15, border: '#ff3b3b' });
    label(g, '💨 HIT: THEY GET A BURST OF SPEED', W / 2, 64, { size: 13, border: '#9fd8ff' });
    return;
  }
  if (page === 'found') {
    floorScene(g, W, H, '#2f3f6a', '#1f2b4c');
    emoji(g, '👻', 180, H * 0.42, 64); label(g, 'FOUND: A GHOST', 180, H * 0.42 - 58, { size: 14, border: '#fff' });
    arrow(g, 220, H * 0.46, 320, H * 0.56, '#c9d3ff', [6, 6]); emoji(g, '👀', 345, H * 0.58, 30);
    g.fillStyle = 'rgba(10,14,40,0.9)'; rr(g, W - 230, 30, 200, 150, 16); g.fill(); g.strokeStyle = '#ffd400'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#ffd400'; g.font = `900 16px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🏆 POINTS', W - 130, 54);
    g.font = `800 14px ${FONT}`; g.fillStyle = '#fff'; g.textAlign = 'left';
    [['🔫 A FIND', '+'], ['⏱ HIDDEN', '+'], ['🛡 SURVIVED', '+']].forEach(([t], i) => { g.fillText(t, W - 214, 86 + i * 30); g.fillStyle = '#39ff14'; g.fillText('+++', W - 84, 86 + i * 30); g.fillStyle = '#fff'; });
    shadow(g, 470, fy + 28, 26); emoji(g, '📦', 470, fy, 52);
    return;
  }
}
function bossPic(g, W, H, page) {
  const fy = H * 0.8;
  const sky = (c1, c2) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, c1); gr.addColorStop(0.7, c2); gr.addColorStop(0.7, '#3d4048'); gr.addColorStop(1, '#25272d'); g.save(); rr(g, 0, 0, W, H, 22); g.clip(); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3; g.setLineDash([22, 16]); g.beginPath(); g.moveTo(0, H * 0.86); g.lineTo(W, H * 0.86); g.stroke(); g.setLineDash([]); g.restore(); };
  const bar = (k) => { g.fillStyle = 'rgba(0,0,0,0.7)'; rr(g, 60, 16, W - 120, 26, 13); g.fill(); g.fillStyle = '#ff3b3b'; rr(g, 64, 20, (W - 128) * k, 18, 9); g.fill(); g.fillStyle = '#fff'; g.font = `900 13px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('👹 BOSS HEALTH', W / 2, 30); };
  if (page === 'intro') {
    sky('#ff8a3d', '#7a2a5a'); bar(1);
    shadow(g, W / 2, fy + 10, 90); emoji(g, '👹', W / 2, H * 0.5, 150);
    for (const x of [90, W - 90]) { shadow(g, x, fy + 12, 22); emoji(g, '🧍', x, fy - 18, 50); }
    label(g, 'A GIANT ONE OF THE LADS', W / 2, H * 0.86, { size: 15, border: '#ffd400' });
    for (const [x, y] of [[150, 90], [W - 150, 110], [120, 170]]) emoji(g, '💨', x, y, 28);
    return;
  }
  if (page === 'food') {
    sky('#3d8bff', '#28407a'); bar(0.62);
    shadow(g, 470, fy + 8, 70); emoji(g, '👹', 470, H * 0.52, 120);
    shadow(g, 110, fy + 12, 22); emoji(g, '🧍', 110, fy - 18, 54);
    g.strokeStyle = 'rgba(255,240,120,0.9)'; g.lineWidth = 4; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(140, fy - 50); g.quadraticCurveTo(280, 40, 420, H * 0.45); g.stroke(); g.setLineDash([]);
    emoji(g, '🍔', 280, 110, 40); emoji(g, '💥', 425, H * 0.42, 40);
    label(g, '-DAMAGE!', 520, H * 0.3, { size: 15, border: '#ff3b3b' }); label(g, '🎯 THROW FOOD AT THEM', 190, H * 0.62, { size: 14, border: '#39ff14' });
    return;
  }
  if (page === 'floor') {
    sky('#5a5f6a', '#3a3e48');
    const ring = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, r, r * 0.32, 0, 0, 7); g.fill(); };
    ring(150, fy, 95, 'rgba(255,40,40,0.55)'); label(g, '🔴 SLAM: GET OUT', 150, fy - 52, { size: 13, border: '#ff3b3b' });
    ring(W / 2 + 40, fy, 90, 'rgba(255,40,40,0.55)'); ring(W / 2 + 40, fy, 34, 'rgba(57,255,20,0.75)'); label(g, '🟢 GET IN CLOSE', W / 2 + 40, fy - 52, { size: 13, border: '#39ff14' });
    g.fillStyle = 'rgba(255,40,40,0.45)'; g.beginPath(); g.moveTo(W - 120, H * 0.62); g.lineTo(W - 60, H * 0.62); g.lineTo(W - 30, H); g.lineTo(W - 150, H); g.closePath(); g.fill();
    label(g, '🔴 CHARGE: SIDE-STEP', W - 95, H * 0.55, { size: 13, border: '#ff3b3b' });
    emoji(g, '👹', W / 2, H * 0.3, 70); emoji(g, '⚠️', 70, 40, 34); emoji(g, '⚠️', W - 70, 40, 34);
    return;
  }
  if (page === 'hearts') {
    sky('#7a3bd6', '#3d2470');
    for (let i = 0; i < 5; i++) emoji(g, i < 3 ? '❤️' : '🖤', W / 2 - 120 + i * 60, 70, 44);
    label(g, 'FIVE HEARTS', W / 2, 120, { size: 15, border: '#ff4fa3' });
    shadow(g, 170, fy + 12, 24); emoji(g, '🧍', 170, fy - 18, 54); emoji(g, '🍕', 215, fy - 40, 34); label(g, '😋 FINISH FOOD: +❤️', 190, fy - 90, { size: 13, border: '#39ff14' });
    g.fillStyle = 'rgba(10,14,40,0.9)'; rr(g, W - 250, H * 0.5, 210, 110, 14); g.fill(); g.strokeStyle = '#ffd400'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#ffd400'; g.font = `900 16px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('3 PHASES', W - 145, H * 0.5 + 24);
    for (let i = 0; i < 3; i++) { g.fillStyle = ['#39ff14', '#ffd400', '#ff3b3b'][i]; rr(g, W - 230 + i * 64, H * 0.5 + 50, 56, 40, 10); g.fill(); g.fillStyle = '#111'; g.font = `900 18px ${FONT}`; g.fillText(String(i + 1), W - 202 + i * 64, H * 0.5 + 71); }
    return;
  }
}

// draw page picture `kind` into the canvas (redrawn when portraits load)
function drawHowPic(cv, pic, ctx = {}) {
  try { drawPic(cv, pic, ctx); } catch (e) { console.warn('howto pic', e); const g = cv.getContext('2d'); g.fillStyle = '#1c2c8c'; g.fillRect(0, 0, cv.width, cv.height); g.font = '110px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🍔', cv.width / 2, cv.height / 2); }
}
function drawPic(cv, pic, ctx) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height; g.clearRect(0, 0, W, H);
  const redraw = () => { if (cv.dataset.pic === pic) drawHowPic(cv, pic, ctx); };      // (only if that page is still showing)
  cv.dataset.pic = pic;
  const [kind, arg] = pic.split(':');
  if (kind === 'pub') pubMap(g, W, H, arg);
  else if (kind === 'squad') squadFaces(g, W, H, ctx.squad || [], redraw);
  else if (kind === 'controls') controls(g, W, H, ctx.device);
  else if (kind === 'meter') meter(g, W, H);
  else if (kind === 'lidl') lidl(g, W, H);
  else if (kind === 'bbq') bbq(g, W, H, arg, ctx.device);
  else if (kind === 'date') { if (arg === 'films') dateFilms(g, W, H); else if (arg === 'busted') dateBusted(g, W, H); else dateTable(g, W, H); }
  else if (kind === 'clock') clock(g, W, H, arg === '2');
  else if (kind === 'ph') propHunt(g, W, H, arg);
  else if (kind === 'boss') bossPic(g, W, H, arg);
  else { bg(g, W, H); const gl = g.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, H * 0.6); gl.addColorStop(0, 'rgba(255,212,0,0.35)'); gl.addColorStop(1, 'rgba(255,212,0,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H); emoji(g, arg || kind, W / 2, H / 2, 120); }
  cv.dataset.v = (+cv.dataset.v || 0) + 1;      // (tells the headset panel it changed)
}

window.__howto = { drawHowPic };
})();
