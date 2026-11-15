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
function emoji(g, e, x, y, s) { g.font = `${s}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, x, y); }
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
function bbq(g, W, H) {
  bg(g, W, H, '#4aa8f0', '#5a9a36');
  g.fillStyle = '#5a9a36'; g.fillRect(0, H * 0.45, W, H * 0.55);
  g.fillStyle = '#222'; rr(g, W / 2 - 90, H * 0.42, 180, 60, 8); g.fill(); g.fillStyle = '#ff6a1a'; for (let i = 0; i < 9; i++) g.fillRect(W / 2 - 80 + i * 20, H * 0.42 + 8, 4, 44);
  for (const [i, e] of ['🍔', '🌭', '🍗', '🍔', '🌭'].entries()) emoji(g, e, W / 2 - 64 + i * 32, H * 0.42 + 30, 24);
  emoji(g, '👨‍🍳', W / 2 + 140, H * 0.45, 46); label(g, 'IAN', W / 2 + 140, H * 0.45 + 40, { size: 15, border: '#ff4040' });
  arrow(g, W / 2 + 110, H * 0.4, W * 0.18, H * 0.25, '#7cff6a'); emoji(g, '🥦', W * 0.3, H * 0.3, 26); emoji(g, '😋', W * 0.14, H * 0.24, 38);
  label(g, 'GRAB IT OFF THE GRILL FIRST', W / 2, H - 22, { size: 17 });
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
function clock(g, W, H, two) {
  bg(g, W, H, '#6a1b9a', '#2a0a4a');
  g.fillStyle = '#fff'; g.beginPath(); g.arc(W / 2, H / 2, 70, 0, 7); g.fill(); g.strokeStyle = '#ffd400'; g.lineWidth = 8; g.stroke();
  g.fillStyle = '#c62828'; g.beginPath(); g.moveTo(W / 2, H / 2); g.arc(W / 2, H / 2, 62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 1.4); g.fill();
  g.fillStyle = '#111'; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('60', W / 2, H / 2);
  for (const [i, e] of ['🍔', '🍕', '🍩', '🌭'].entries()) emoji(g, e, 60 + i * 40, H - 40, 30);
  if (two) { emoji(g, '📱', W - 120, H / 2, 40); arrow(g, W - 160, H / 2 + 40, W - 80, H / 2 + 40); label(g, 'PASS IT ON', W - 120, H / 2 + 70, { size: 15 }); }
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
  else if (kind === 'bbq') bbq(g, W, H);
  else if (kind === 'date') dateTable(g, W, H);
  else if (kind === 'clock') clock(g, W, H, arg === '2');
  else { bg(g, W, H); emoji(g, arg || kind, W / 2, H / 2, 110); }
  cv.dataset.v = (+cv.dataset.v || 0) + 1;      // (tells the headset panel it changed)
}

window.__howto = { drawHowPic };
})();
