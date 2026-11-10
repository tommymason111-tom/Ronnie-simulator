// Hand-drawn (canvas) cut scenes and full-screen overlays for the squad's attacks.
//   drawTurkey(g, t)  — Ben takes Ronnie to Turkey for a new hairline (8 seconds, 8 scenes)
//   drawPepsi(g, t, dur) — the screen fills up with Pepsi Max, fizzes, then drains
//   drawSiu(g, t, dur)   — Lewis's Portugal "SIUUU" overlay
// Everything is drawn on a 1024x576 canvas each frame.
import { FONT } from './textures.js';

const W = 1024, H = 576;
export const TURKEY_LEN = 8.2;

// ------------------------------------------------------------------ helpers
const ease = (t) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // stable pseudo-random
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function grad(g, y0, y1, stops) { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
function text(g, s, x, y, size, color, { weight = 900, align = 'center', stroke = '#111', lw = 0, maxW = 0 } = {}) {
  let sz = size; g.textAlign = align; g.textBaseline = 'alphabetic';
  do { g.font = `${weight} ${sz}px ${FONT}`; sz -= 2; } while (maxW && g.measureText(s).width > maxW && sz > 12);
  if (lw) { g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(s, x, y); }
  g.fillStyle = color; g.fillText(s, x, y);
}
function caption(g, big, small, t0, t) {
  const a = ease((t - t0) / 0.25);
  g.save(); g.globalAlpha = a;
  g.fillStyle = 'rgba(0,0,0,0.62)'; g.fillRect(0, H - 104, W, 104);
  text(g, big, W / 2, H - 56, 46, '#ffd400', { lw: 8, maxW: W - 60 });
  if (small) text(g, small, W / 2, H - 18, 26, '#fff', { weight: 700, maxW: W - 60 });
  g.restore();
}
function bubble(g, x, y, s, { w = 300, tail = 'left' } = {}) {
  g.font = `900 26px ${FONT}`;
  const tw = Math.min(w, g.measureText(s).width + 40), h = 56;
  g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 4;
  rr(g, x, y, tw, h, 18); g.fill(); g.stroke();
  g.beginPath(); const tx = tail === 'left' ? x + 30 : x + tw - 30; g.moveTo(tx - 12, y + h - 2); g.lineTo(tx + (tail === 'left' ? -18 : 18), y + h + 26); g.lineTo(tx + 12, y + h - 2); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.fillRect(tx - 10, y + h - 6, 20, 6);
  text(g, s, x + tw / 2, y + 37, 26, '#111', { maxW: tw - 20 });
}
function cloud(g, x, y, s, a = 1) {
  g.save(); g.globalAlpha = a; g.fillStyle = '#fff';
  for (const [dx, dy, r] of [[0, 0, 30], [28, -14, 34], [60, 0, 28], [30, 10, 30], [-26, 8, 22], [86, 8, 20]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, 7); g.fill(); }
  g.restore();
}
function sparkle(g, x, y, s, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = '#fff6a8';
  g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = i % 2 ? s * 0.3 : s; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.restore();
}

// ------------------------------------------------------------------ the two stars
// Ronnie: big round face, a few chins, Chelsea-blue shirt. hair: 'bald' | 'marked' | 'bandage' | 'new'
function ronnie(g, x, y, s, { hair = 'bald', mouth = 0, eyes = 'open', shirt = true, food = null, newHair = 1, blush = false } = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  if (shirt) {               // body
    g.fillStyle = '#034694'; g.beginPath(); g.ellipse(0, 175, 165, 120, 0, Math.PI, 0); g.lineTo(165, 260); g.lineTo(-165, 260); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-30, 70); g.lineTo(0, 110); g.lineTo(30, 70); g.fill();
    g.fillStyle = '#d4af37'; g.beginPath(); g.arc(-80, 150, 14, 0, 7); g.fill();
  }
  g.fillStyle = '#f0c49a'; g.beginPath(); g.ellipse(0, 0, 112, 122, 0, 0, 7); g.fill();          // head
  g.fillStyle = '#e6b088'; for (const [yy, ww] of [[102, 92], [124, 78], [142, 60]]) { g.beginPath(); g.ellipse(0, yy, ww, 22, 0, 0, Math.PI); g.fill(); }   // chins
  g.fillStyle = '#e6b088'; g.beginPath(); g.ellipse(-112, 8, 16, 26, 0, 0, 7); g.ellipse(112, 8, 16, 26, 0, 0, 7); g.fill();   // ears
  if (blush) { g.fillStyle = 'rgba(255,90,90,0.35)'; g.beginPath(); g.ellipse(-60, 40, 22, 12, 0, 0, 7); g.ellipse(60, 40, 22, 12, 0, 0, 7); g.fill(); }
  // eyes
  g.fillStyle = '#111';
  if (eyes === 'closed') { g.lineWidth = 6; g.strokeStyle = '#111'; g.beginPath(); g.arc(-40, 8, 14, 0.2, Math.PI - 0.2); g.stroke(); g.beginPath(); g.arc(40, 8, 14, 0.2, Math.PI - 0.2); g.stroke(); }
  else if (eyes === 'wide') { g.fillStyle = '#fff'; g.beginPath(); g.arc(-40, 4, 20, 0, 7); g.arc(40, 4, 20, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(-40, 6, 9, 0, 7); g.arc(40, 6, 9, 0, 7); g.fill(); }
  else { g.beginPath(); g.arc(-40, 6, 10, 0, 7); g.arc(40, 6, 10, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-36, 2, 3, 0, 7); g.arc(44, 2, 3, 0, 7); g.fill(); }
  g.strokeStyle = '#5a3a22'; g.lineWidth = 6; g.beginPath(); g.moveTo(-58, -22); g.lineTo(-24, -26); g.moveTo(24, -26); g.lineTo(58, -22); g.stroke();   // brows
  g.fillStyle = '#d99a78'; g.beginPath(); g.ellipse(0, 32, 14, 10, 0, 0, 7); g.fill();                                   // nose
  // mouth: 0 smile, 1 open (eating)
  if (mouth > 0.1) { g.fillStyle = '#5a1a1a'; g.beginPath(); g.ellipse(0, 70, 34, 10 + mouth * 22, 0, 0, 7); g.fill(); g.fillStyle = '#ff7a7a'; g.beginPath(); g.ellipse(0, 78 + mouth * 10, 20, 8, 0, 0, 7); g.fill(); }
  else { g.strokeStyle = '#111'; g.lineWidth = 6; g.beginPath(); g.arc(0, 52, 34, 0.3, Math.PI - 0.3); g.stroke(); }
  // hair
  g.fillStyle = '#4a2a16';
  if (hair === 'bald' || hair === 'marked') {
    g.beginPath(); g.ellipse(-104, -40, 16, 46, 0.25, 0, 7); g.fill(); g.beginPath(); g.ellipse(104, -40, 16, 46, -0.25, 0, 7); g.fill();
    g.beginPath(); g.ellipse(0, -118, 34, 8, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.65)'; g.beginPath(); g.ellipse(-34, -76, 30, 11, -0.4, 0, 7); g.fill();               // shine
    if (hair === 'marked') {                                                                                              // surgeon's pen line
      g.strokeStyle = '#7a3aa8'; g.lineWidth = 5; g.setLineDash([10, 7]); g.beginPath(); g.moveTo(-96, -62); g.quadraticCurveTo(0, -84, 96, -62); g.stroke(); g.setLineDash([]);
    }
  } else if (hair === 'bandage') {
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, -66, 116, 62, 0, Math.PI, 0); g.lineTo(116, -50); g.lineTo(-116, -50); g.fill();
    g.strokeStyle = '#ddd'; g.lineWidth = 3; for (let i = -100; i < 110; i += 26) { g.beginPath(); g.moveTo(i, -60); g.lineTo(i + 10, -120); g.stroke(); }
    g.fillStyle = 'rgba(200,40,40,0.4)'; g.beginPath(); g.arc(-30, -84, 6, 0, 7); g.arc(20, -90, 5, 0, 7); g.fill();
  } else if (hair === 'new') {
    const line = lerp(-104, -64, newHair);                       // grows down to a perfect, dead-straight line
    g.beginPath(); g.ellipse(0, -84, 118, 64, 0, Math.PI, 0); g.lineTo(116, line); g.lineTo(-116, line); g.closePath(); g.fill();
    g.fillStyle = '#5a3420'; for (let i = 0; i < 16; i++) { g.beginPath(); g.ellipse(-100 + i * 13, line - 8, 5, 14, 0.2, 0, 7); g.fill(); }
    g.fillStyle = '#6a4028'; g.beginPath(); g.ellipse(-20, -140, 80, 18, -0.2, 0, 7); g.fill();                         // quiff
  }
  if (food) drawFood(g, food, 0, 74, 0.9);
  g.restore();
}
// Ben: slimmer face, side-parted quiff (the famous Turkish hairline), beige overshirt
function ben(g, x, y, s, { mouth = 0, wave = 0, passports = false, thumbs = false, eyes = 'open' } = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#a8957a'; g.beginPath(); g.ellipse(0, 165, 120, 100, 0, Math.PI, 0); g.lineTo(120, 260); g.lineTo(-120, 260); g.fill();
  g.fillStyle = '#f2f2f2'; g.beginPath(); g.moveTo(-34, 66); g.lineTo(0, 140); g.lineTo(34, 66); g.fill();
  g.fillStyle = '#8a7a62'; g.fillRect(-90, 120, 40, 34); g.fillRect(50, 120, 40, 34);       // chest pockets
  // waving arm
  g.save(); g.translate(110, 110); g.rotate(-0.9 + Math.sin(wave) * 0.35);
  g.fillStyle = '#a8957a'; g.fillRect(-18, -130, 36, 130); g.fillStyle = '#e8b896'; g.beginPath(); g.arc(0, -138, 24, 0, 7); g.fill();
  if (thumbs) { g.fillRect(-6, -176, 12, 34); }
  if (passports) { g.fillStyle = '#7a1f3d'; g.fillRect(-30, -190, 34, 46); g.fillRect(-4, -184, 34, 46); g.fillStyle = '#d4af37'; g.fillRect(-20, -176, 14, 4); g.fillRect(6, -170, 14, 4); }
  g.restore();
  g.fillStyle = '#e8b896'; g.beginPath(); g.ellipse(0, 0, 82, 100, 0, 0, 7); g.fill();
  g.fillStyle = '#e0a888'; g.beginPath(); g.ellipse(-82, 6, 12, 20, 0, 0, 7); g.ellipse(82, 6, 12, 20, 0, 0, 7); g.fill();
  g.fillStyle = '#111';
  if (eyes === 'closed') { g.lineWidth = 5; g.strokeStyle = '#111'; g.beginPath(); g.arc(-30, 6, 11, 0.2, Math.PI - 0.2); g.arc(30, 6, 11, 0.2, Math.PI - 0.2); g.stroke(); }
  else { g.beginPath(); g.arc(-30, 4, 8, 0, 7); g.arc(30, 4, 8, 0, 7); g.fill(); }
  g.strokeStyle = '#3a2416'; g.lineWidth = 6; g.beginPath(); g.moveTo(-46, -22); g.lineTo(-16, -20); g.moveTo(16, -20); g.lineTo(46, -22); g.stroke();
  g.fillStyle = '#d99a78'; g.beginPath(); g.moveTo(0, 6); g.lineTo(-10, 36); g.lineTo(8, 36); g.fill();
  g.fillStyle = 'rgba(60,40,30,0.25)'; g.beginPath(); g.ellipse(0, 62, 60, 34, 0, 0, Math.PI); g.fill();   // stubble
  if (mouth > 0.1) { g.fillStyle = '#5a1a1a'; g.beginPath(); g.ellipse(0, 56, 24, 6 + mouth * 14, 0, 0, 7); g.fill(); }
  else { g.strokeStyle = '#111'; g.lineWidth = 5; g.beginPath(); g.arc(0, 40, 26, 0.35, Math.PI - 0.35); g.stroke(); }
  // THE hairline: low, dead straight, very proud of it
  g.fillStyle = '#3a2416'; g.beginPath(); g.ellipse(0, -62, 86, 50, 0, Math.PI, 0); g.lineTo(84, -56); g.lineTo(-84, -56); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(18, -104, 70, 26, -0.25, 0, 7); g.fill();
  g.restore();
}
function drawFood(g, kind, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  if (kind === 'burger') { g.fillStyle = '#d9933f'; g.beginPath(); g.ellipse(0, -10, 34, 18, 0, Math.PI, 0); g.fill(); g.fillStyle = '#4caf3c'; g.fillRect(-36, -12, 72, 6); g.fillStyle = '#5a2e14'; g.fillRect(-34, -6, 68, 10); g.fillStyle = '#d9933f'; g.fillRect(-32, 4, 64, 10); }
  else if (kind === 'chicken') { g.fillStyle = '#c7782a'; g.beginPath(); g.ellipse(0, 0, 26, 18, 0.3, 0, 7); g.fill(); g.fillStyle = '#f3ead8'; g.fillRect(18, -4, 20, 7); g.beginPath(); g.arc(40, 0, 6, 0, 7); g.fill(); }
  else if (kind === 'can') { g.fillStyle = '#ff9a1f'; g.fillRect(-12, -26, 24, 46); g.fillStyle = '#ccc'; g.fillRect(-12, -30, 24, 5); }
  else if (kind === 'kebab') { g.fillStyle = '#f1d9a8'; g.beginPath(); g.moveTo(-20, -20); g.lineTo(20, -20); g.lineTo(6, 30); g.lineTo(-6, 30); g.fill(); g.fillStyle = '#8b4a2b'; g.beginPath(); g.ellipse(0, -22, 22, 10, 0, 0, 7); g.fill(); g.fillStyle = '#6fbf3f'; g.beginPath(); g.arc(-8, -28, 6, 0, 7); g.fill(); }
  g.restore();
}

// ------------------------------------------------------------------ the scenes
const SCENES = [
  [0.0, 1.15, sceneInvite],
  [1.15, 2.3, sceneAirport],
  [2.3, 3.45, sceneCabin],
  [3.45, 4.45, sceneIstanbul],
  [4.45, 5.65, sceneClinic],
  [5.65, 6.45, sceneRecovery],
  [6.45, 7.65, sceneReveal],
  [7.65, TURKEY_LEN, sceneHome],
];
export function drawTurkey(g, t) {
  for (const [a, b, fn] of SCENES) if (t < b || fn === sceneHome) {
    fn(g, t - a, b - a, t);
    // a quick white wipe between scenes
    const into = t - a; if (into < 0.12 && a > 0) { g.fillStyle = `rgba(255,255,255,${1 - into / 0.12})`; g.fillRect(0, 0, W, H); }
    // letterbox bars + progress dots
    g.fillStyle = '#000'; g.fillRect(0, 0, W, 18);
    for (let i = 0; i < SCENES.length; i++) { g.fillStyle = i <= SCENES.findIndex(s => s[2] === fn) ? '#ffd400' : '#555'; g.beginPath(); g.arc(W / 2 - 70 + i * 20, 9, 5, 0, 7); g.fill(); }
    return;
  }
}

// 1. In the Oysterfleet: Ronnie mid-burger, Ben bursts in waving two passports
function sceneInvite(g, t, d) {
  g.fillStyle = grad(g, 0, H, [[0, '#f3ead6'], [1, '#e8d8b8']]); g.fillRect(0, 0, W, H);
  // back bar with bottles and warm lamps
  g.fillStyle = '#3a2416'; g.fillRect(0, 60, W, 160);
  for (let i = 0; i < 40; i++) { g.fillStyle = ['#2e7d32', '#c0392b', '#d4a017', '#6d4c41', '#1565c0'][i % 5]; const bx = 14 + i * 25, bh = 40 + rnd(i) * 30; g.fillRect(bx, 140 - bh, 14, bh); g.fillRect(bx + 4, 140 - bh - 14, 6, 14); }
  g.fillStyle = '#c8a060'; g.fillRect(0, 140, W, 8); g.fillRect(0, 210, W, 8);
  for (let i = 0; i < 5; i++) { const lx = 100 + i * 200; g.fillStyle = 'rgba(255,190,90,0.35)'; g.beginPath(); g.arc(lx, 40, 60, 0, 7); g.fill(); g.fillStyle = '#ffb050'; g.beginPath(); g.arc(lx, 40, 16, 0, 7); g.fill(); }
  g.fillStyle = '#7a4e2a'; g.fillRect(0, 380, W, 200); g.fillStyle = '#4a2a14'; g.fillRect(0, 372, W, 14);                   // the bar
  text(g, 'THE OYSTERFLEET', 820, 250, 30, '#d4af37', { lw: 6 });
  const munch = Math.abs(Math.sin(t * 14));
  ronnie(g, 330, 270, 0.85, { mouth: munch, food: munch > 0.5 ? null : 'burger' });
  const bx = lerp(1150, 760, ease(t / 0.45));
  ben(g, bx, 290, 0.85, { wave: t * 12, passports: true, mouth: 0.6 });
  if (t > 0.35) bubble(g, 560, 70, 'RON. TURKEY. NOW.', { tail: 'right' });
  if (t > 0.7) bubble(g, 120, 90, '...after this burger?', { tail: 'left' });
  caption(g, 'BEN HAS A PLAN', 'Friday, 11pm. The Oysterfleet.', 0, t);
}
// 2. Southend Airport: terminal, control tower, the plane races down the runway and takes off
function sceneAirport(g, t, d) {
  g.fillStyle = grad(g, 0, H, [[0, '#ff9e6e'], [0.45, '#ffd3a0'], [1, '#ffe9c8']]); g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,240,180,0.9)'; g.beginPath(); g.arc(860, 120, 50, 0, 7); g.fill();
  cloud(g, 120 - t * 30, 90, 0.9, 0.8); cloud(g, 520 - t * 20, 60, 0.7, 0.7);
  // terminal + tower
  g.fillStyle = '#c9ced6'; g.fillRect(40, 250, 420, 120); g.fillStyle = '#8fb8d8'; for (let i = 0; i < 9; i++) g.fillRect(60 + i * 44, 280, 30, 40);
  g.fillStyle = '#1e5aa8'; g.fillRect(40, 240, 420, 24); text(g, 'SOUTHEND AIRPORT', 250, 259, 20, '#fff');
  g.fillStyle = '#b0b6c0'; g.fillRect(520, 170, 30, 200); g.fillStyle = '#5a6a7a'; g.fillRect(500, 140, 70, 40); g.fillStyle = '#8fd0ff'; g.fillRect(505, 146, 60, 22);
  g.fillStyle = (Math.floor(t * 4) % 2) ? '#ff2a2a' : '#661010'; g.beginPath(); g.arc(535, 134, 6, 0, 7); g.fill();
  // runway with lights rushing past
  g.fillStyle = '#5a5e66'; g.fillRect(0, 370, W, 80); g.fillStyle = '#fff'; for (let x = -100; x < W; x += 120) g.fillRect(x + (t * 900) % 120, 406, 70, 7);
  for (let x = 0; x < W; x += 60) { g.fillStyle = '#ffe680'; g.beginPath(); g.arc(x + (t * 900) % 60, 372, 3, 0, 7); g.arc(x + (t * 900) % 60, 448, 3, 0, 7); g.fill(); }
  g.fillStyle = '#5c9a3a'; g.fillRect(0, 450, W, 130);
  for (let i = 0; i < 30; i++) { g.fillStyle = '#4c8a2a'; g.fillRect((i * 97 + t * 900) % W, 470 + (i % 4) * 20, 26, 5); }
  // the plane
  const u = ease(t / d), px = lerp(260, 930, u), lift = Math.max(0, (u - 0.45) / 0.55);
  bigPlane(g, px, 360 - lift * lift * 260, -lift * 0.32, 1, true);
  caption(g, 'WHEELS UP', 'Southend → Istanbul. Ronnie has already asked when the food comes round.', 0, t);
}
function bigPlane(g, x, y, rot, s, faces = false) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.ellipse(0, 40, 170, 10, 0, 0, 7); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, 0, 180, 34, 0, 0, 7); g.fill();
  g.fillStyle = '#e53935'; g.beginPath(); g.moveTo(-140, -10); g.lineTo(-190, -95); g.lineTo(-120, -95); g.lineTo(-90, -14); g.fill();      // tail
  g.fillStyle = '#1e5aa8'; g.fillRect(-160, 6, 330, 8);
  g.fillStyle = '#cfd8dc'; g.beginPath(); g.moveTo(-20, 6); g.lineTo(-90, 80); g.lineTo(-50, 80); g.lineTo(40, 10); g.fill();                // wing
  g.fillStyle = '#9aa4ae'; g.beginPath(); g.ellipse(-40, 46, 26, 12, 0, 0, 7); g.fill();                                                    // engine
  g.fillStyle = '#26323a'; g.beginPath(); g.ellipse(160, -6, 18, 12, 0.3, 0, 7); g.fill();                                                  // cockpit
  for (let i = 0; i < 9; i++) { g.fillStyle = '#7ab8e8'; g.beginPath(); g.arc(-110 + i * 26, -8, 7, 0, 7); g.fill(); }
  if (faces) { g.fillStyle = '#f0c49a'; g.beginPath(); g.arc(24, -8, 7, 0, 7); g.fill(); g.fillStyle = '#e8b896'; g.beginPath(); g.arc(50, -8, 6, 0, 7); g.fill(); }
  text(g, 'BEN AIR', 60, 30, 18, '#1e5aa8');
  g.restore();
}
// 3. In the cabin: Ronnie empties the trolley, Ben's asleep, the flight map creeps across Europe
function sceneCabin(g, t, d) {
  g.fillStyle = '#e8e2d6'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#d0c8b8'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(W / 2, 90, W, 0); g.lineTo(W, 60); g.quadraticCurveTo(W / 2, 140, 0, 60); g.fill();   // curved ceiling
  // windows with clouds racing past
  for (let i = 0; i < 4; i++) {
    const wx = 70 + i * 250, wy = 110;
    g.save(); rr(g, wx, wy, 110, 140, 46); g.clip();
    g.fillStyle = grad(g, wy, wy + 140, [[0, '#4aa3ff'], [1, '#bfe3ff']]); g.fillRect(wx, wy, 110, 140);
    for (let k = 0; k < 3; k++) cloud(g, wx + 140 - ((t * 260 + k * 70 + i * 40) % 220), wy + 40 + k * 34, 0.45);
    g.restore(); g.strokeStyle = '#bdb4a2'; g.lineWidth = 10; rr(g, wx, wy, 110, 140, 46); g.stroke();
  }
  // seats
  g.fillStyle = '#1e3a6a'; for (let i = 0; i < 5; i++) { rr(g, 20 + i * 210, 300, 150, 230, 24); g.fill(); }
  g.fillStyle = '#2a4a80'; for (let i = 0; i < 5; i++) { rr(g, 30 + i * 210, 290, 130, 40, 14); g.fill(); }
  // Ben asleep, zzz
  ben(g, 240, 330, 0.62, { eyes: 'closed' });
  for (let i = 0; i < 3; i++) { const k = (t * 1.2 + i * 0.33) % 1; text(g, 'z', 300 + k * 60, 210 - k * 80, 24 + i * 6, `rgba(30,60,120,${1 - k})`); }
  // Ronnie eating everything off the trolley
  const munch = Math.abs(Math.sin(t * 16));
  ronnie(g, 560, 340, 0.62, { mouth: munch, eyes: 'wide' });
  const tx = 800, items = ['burger', 'chicken', 'can', 'kebab', 'burger', 'chicken'], gone = Math.floor(t / d * 7);
  g.fillStyle = '#b0b6c0'; g.fillRect(tx - 70, 330, 160, 190); g.fillStyle = '#e53935'; g.fillRect(tx - 70, 330, 160, 18);
  g.fillStyle = '#90969f'; g.fillRect(tx - 70, 420, 160, 6);
  items.forEach((it, i) => { if (i >= gone) drawFood(g, it, tx - 40 + (i % 3) * 50, 395 + Math.floor(i / 3) * 70, 0.7); });
  for (let i = 0; i < Math.min(gone, 6); i++) { const k = ((t * 3 + i * 0.3) % 1); drawFood(g, items[i], lerp(tx, 600, k), 360 - Math.sin(k * Math.PI) * 60, 0.5 * (1 - k)); }
  // the flight map screen
  g.fillStyle = '#111'; rr(g, 380, 80, 260, 150, 10); g.fill();
  g.fillStyle = '#0d2a4a'; g.fillRect(390, 90, 240, 130); g.fillStyle = '#3a7a3a'; g.beginPath(); g.ellipse(450, 150, 40, 30, 0, 0, 7); g.ellipse(560, 175, 60, 22, 0, 0, 7); g.fill();
  const m = t / d; g.setLineDash([6, 5]); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(430, 130); g.lineTo(lerp(430, 590, m), lerp(130, 175, m)); g.stroke(); g.setLineDash([]);
  text(g, '✈', lerp(430, 590, m), lerp(136, 181, m), 20, '#ffd400');
  text(g, `${Math.round(lerp(2650, 0, m))} km to go`, 510, 214, 14, '#fff', { weight: 700 });
  caption(g, 'THE IN-FLIGHT MEAL', `Ronnie has eaten: ${Math.min(gone, 6)} meals, both packets of pretzels, and Ben's.`, 0, t);
}
// 4. Istanbul at sunset: domes, minarets, the Bosphorus, boats and gulls; the plane comes in to land
function sceneIstanbul(g, t, d) {
  g.fillStyle = grad(g, 0, 380, [[0, '#2a1a4a'], [0.45, '#d8507a'], [1, '#ffb070']]); g.fillRect(0, 0, W, 380);
  g.fillStyle = 'rgba(255,220,140,0.95)'; g.beginPath(); g.arc(760, 330 + t * 20, 70, 0, 7); g.fill();
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + rnd(i) * 0.6})`; g.fillRect(rnd(i + 3) * W, rnd(i + 7) * 120, 2, 2); }
  // skyline: big mosque with cascading domes, four minarets, a tower on the hill
  g.fillStyle = '#3a1e3a';
  const dome = (x, y, r) => { g.beginPath(); g.arc(x, y, r, Math.PI, 0); g.fill(); g.fillRect(x - 2, y - r - 22, 4, 22); g.beginPath(); g.arc(x, y - r - 24, 4, 0, 7); g.fill(); };
  g.fillRect(170, 300, 340, 80); dome(340, 300, 90); dome(230, 312, 46); dome(450, 312, 46); dome(190, 330, 26); dome(490, 330, 26); dome(300, 230, 18); dome(380, 230, 18);
  for (const x of [130, 200, 480, 550]) { g.fillRect(x - 7, 150, 14, 230); g.beginPath(); g.moveTo(x - 10, 150); g.lineTo(x, 100); g.lineTo(x + 10, 150); g.fill(); g.fillRect(x - 12, 200, 24, 6); g.fillRect(x - 12, 250, 24, 6); }
  g.fillRect(640, 330, 380, 50); g.fillRect(860, 190, 50, 150); g.beginPath(); g.moveTo(850, 190); g.lineTo(885, 130); g.lineTo(920, 190); g.fill();       // Galata-ish tower
  for (let i = 0; i < 14; i++) { g.fillStyle = (rnd(i) > 0.4) ? '#ffd27a' : '#3a1e3a'; g.fillRect(660 + i * 26, 345, 8, 10); }
  // the Bosphorus with shimmering reflections and ferries
  g.fillStyle = grad(g, 380, H, [[0, '#a83a6a'], [1, '#1a2a4a']]); g.fillRect(0, 380, W, H - 380);
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(255,210,150,${0.25 + 0.25 * Math.sin(t * 6 + i)})`; g.fillRect(700 + Math.sin(i * 3.1) * 90, 390 + i * 6, 40 + rnd(i) * 40, 2); }
  for (const [x0, sp, y] of [[100, 60, 430], [600, -40, 455]]) { const fx = x0 + t * sp; g.fillStyle = '#f2f2f2'; g.fillRect(fx, y, 90, 18); g.fillStyle = '#d32f2f'; g.fillRect(fx + 20, y - 14, 46, 14); g.fillStyle = '#111'; g.fillRect(fx + 34, y - 30, 8, 16); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(fx - 30, y + 18, 40, 3); }
  // gulls
  g.strokeStyle = '#fff'; g.lineWidth = 3;
  for (let i = 0; i < 6; i++) { const gx = (100 + i * 150 + t * 80) % W, gy = 80 + rnd(i) * 120, f = Math.sin(t * 10 + i) * 8; g.beginPath(); g.moveTo(gx - 14, gy - f); g.quadraticCurveTo(gx - 6, gy - 8, gx, gy); g.quadraticCurveTo(gx + 6, gy - 8, gx + 14, gy - f); g.stroke(); }
  bigPlane(g, lerp(-120, 640, ease(t / d)), lerp(90, 250, ease(t / d)), 0.12, 0.45, false);
  text(g, 'İSTANBUL', W / 2, 70, 70, '#ffd400', { lw: 10 });
  caption(g, 'WELCOME TO TURKEY', 'Ben: "Lovely, isn\'t it Ron?"  Ronnie: "Where\'s the kebab shop?"', 0, t);
}
// 5. The clinic: the surgeon marks the hairline and plants the grafts, the counter flies up
function sceneClinic(g, t, d) {
  g.fillStyle = grad(g, 0, H, [[0, '#eaf6fb'], [1, '#cfe6ef']]); g.fillRect(0, 0, W, H);
  g.fillStyle = '#ffffff'; rr(g, 40, 30, 330, 70, 12); g.fill(); g.strokeStyle = '#1e5aa8'; g.lineWidth = 4; rr(g, 40, 30, 330, 70, 12); g.stroke();
  text(g, 'HAIR CLINIC', 205, 70, 34, '#1e5aa8'); text(g, "(BEN'S MATE · CASH ONLY)", 205, 92, 15, '#1e5aa8', { weight: 700 });
  // certificates on the wall, a plant
  for (let i = 0; i < 3; i++) { g.fillStyle = '#d4af37'; g.fillRect(450 + i * 120, 40, 90, 64); g.fillStyle = '#fffdf2'; g.fillRect(456 + i * 120, 46, 78, 52); g.fillStyle = '#999'; for (let k = 0; k < 4; k++) g.fillRect(464 + i * 120, 56 + k * 10, 60, 3); }
  g.fillStyle = '#2e7d32'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(960 + Math.cos(i) * 20, 320 - i * 14, 30, 10, i, 0, 7); g.fill(); } g.fillStyle = '#b07a45'; g.fillRect(935, 330, 50, 60);
  // the chair
  g.fillStyle = '#4a5a6a'; rr(g, 260, 260, 340, 250, 30); g.fill(); g.fillStyle = '#5a6a7a'; rr(g, 280, 200, 300, 90, 30); g.fill();
  // Ronnie in the chair, eyes wide, hairline marked
  ronnie(g, 430, 250, 0.7, { hair: t / d < 0.25 ? 'marked' : 'marked', eyes: 'wide' });
  // grafts appearing along the line, one by one
  const n = Math.floor(ease(t / d) * 60);
  for (let i = 0; i < n; i++) { const k = i / 60, x = 430 + lerp(-67, 67, k), y = 250 - 0.7 * (62 + Math.sin(k * Math.PI) * 15) - (i % 3) * 5; g.fillStyle = '#4a2a16'; g.fillRect(x - 1.5, y - 6, 3, 8); }
  // the surgeon (mask, cap, gloves) with the implanter pen moving along the line
  const sx = 430 + Math.sin(t * 9) * 50;
  g.save(); g.translate(720, 230);
  g.fillStyle = '#2a8a8a'; g.beginPath(); g.ellipse(0, 150, 110, 100, 0, Math.PI, 0); g.lineTo(110, 300); g.lineTo(-110, 300); g.fill();
  g.fillStyle = '#e8b896'; g.beginPath(); g.ellipse(0, 0, 72, 86, 0, 0, 7); g.fill();
  g.fillStyle = '#2a8a8a'; g.beginPath(); g.ellipse(0, -50, 78, 44, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#e0f4f4'; rr(g, -56, 10, 112, 60, 18); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.arc(-26, -10, 7, 0, 7); g.arc(26, -10, 7, 0, 7); g.fill();
  g.restore();
  g.strokeStyle = '#2a8a8a'; g.lineWidth = 22; g.lineCap = 'round'; g.beginPath(); g.moveTo(680, 330); g.lineTo(sx + 40, 200); g.stroke(); g.lineCap = 'butt';
  g.fillStyle = '#7ad0ff'; g.beginPath(); g.arc(sx + 40, 200, 14, 0, 7); g.fill(); g.fillStyle = '#ccc'; g.fillRect(sx + 6, 192, 40, 6);
  // the graft counter
  g.fillStyle = '#111'; rr(g, 40, 140, 200, 90, 14); g.fill();
  text(g, 'GRAFTS', 140, 172, 20, '#7cff6a', { weight: 700 }); text(g, `${Math.round(ease(t / d) * 4000).toLocaleString()}`, 140, 214, 40, '#7cff6a');
  caption(g, '4,000 GRAFTS', 'Surgeon: "Never seen a forehead this big." Ben: "Do the full line, Mehmet."', 0, t);
}
// 6. Recovery: bandaged head on the flight home, a calendar flipping through the days
function sceneRecovery(g, t, d) {
  g.fillStyle = grad(g, 0, H, [[0, '#2a3a5a'], [1, '#4a5a7a']]); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 50; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + rnd(i) * 0.6})`; g.fillRect(rnd(i + 1) * W, rnd(i + 2) * 300, 2, 2); }
  g.fillStyle = '#e8e0ff'; g.beginPath(); g.arc(860, 110, 46, 0, 7); g.fill(); g.fillStyle = '#2a3a5a'; g.beginPath(); g.arc(880, 100, 40, 0, 7); g.fill();
  // neck pillow + bandage
  g.fillStyle = '#ff7043'; g.beginPath(); g.ellipse(330, 380, 150, 46, 0, 0, 7); g.fill();
  ronnie(g, 330, 270, 0.8, { hair: 'bandage', eyes: 'closed' });
  // calendar flipping
  const days = ['DAY 1', 'DAY 3', 'DAY 10', 'DAY 30', 'DAY 90', 'DAY 365'], i = Math.min(days.length - 1, Math.floor(t / d * days.length));
  g.fillStyle = '#fff'; rr(g, 640, 180, 260, 240, 16); g.fill(); g.fillStyle = '#c62828'; g.fillRect(640, 180, 260, 60);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(700, 186, 8, 0, 7); g.arc(840, 186, 8, 0, 7); g.fill();
  text(g, 'RECOVERY', 770, 222, 26, '#fff'); text(g, days[i], 770, 350, 58, '#111');
  const flip = (t / d * days.length) % 1; if (flip < 0.3) { g.fillStyle = `rgba(255,255,255,${1 - flip / 0.3})`; g.fillRect(640, 240, 260, 180); }
  caption(g, 'NO TOUCHING, NO HATS, NO PIES', 'Ronnie managed one out of three.', 0, t);
}
// 7. The reveal: before / after, the new hair grows in, sparkles everywhere, Ben's thumbs up
function sceneReveal(g, t, d) {
  g.fillStyle = grad(g, 0, H, [[0, '#fff3c4'], [1, '#ffd36a']]); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 16; i++) { g.save(); g.translate(W / 2, H / 2); g.rotate(i / 16 * Math.PI * 2 + t * 0.6); g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(700, -40); g.lineTo(700, 40); g.fill(); g.restore(); }
  // the mirror
  g.fillStyle = '#d4af37'; rr(g, 520, 40, 420, 420, 40); g.fill(); g.fillStyle = '#cfe8f0'; rr(g, 540, 60, 380, 380, 30); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(560, 420); g.lineTo(660, 70); g.lineTo(700, 70); g.lineTo(600, 420); g.fill();
  const grow = ease((t - 0.15) / 0.6);
  g.save(); rr(g, 540, 60, 380, 380, 30); g.clip(); ronnie(g, 730, 250, 0.95, { hair: 'new', newHair: grow, blush: true }); g.restore();
  // the old photo, pinned to the wall
  g.save(); g.translate(240, 190); g.rotate(-0.12); g.fillStyle = '#fff'; g.fillRect(-120, -130, 240, 270); g.save(); g.beginPath(); g.rect(-105, -115, 210, 210); g.clip(); g.fillStyle = '#bcd'; g.fillRect(-105, -115, 210, 210); ronnie(g, 0, 10, 0.55, { hair: 'bald' }); g.restore();
  text(g, 'BEFORE', 0, 128, 30, '#c62828'); g.restore();
  text(g, 'AFTER', 730, 448, 40, '#2e7d32', { lw: 8, stroke: '#fff' });
  for (let i = 0; i < 12; i++) { const a = t * 2.5 + i * 0.52; sparkle(g, 730 + Math.cos(a) * (200 + (i % 3) * 20), 250 + Math.sin(a * 1.2) * 190, 14 + (i % 3) * 6, a); }
  ben(g, 110, 420, 0.5, { thumbs: true, wave: 0.6, mouth: 0.5 });
  if (t > 0.5) bubble(g, 150, 270, 'WE\'RE TWINS NOW, RON', { tail: 'left' });
  caption(g, 'NEW HAIRLINE!', 'A Premier League hairline. A Sunday League body.', 0, t);
}
// 8. Back to the pub
function sceneHome(g, t, d) {
  g.fillStyle = '#111'; g.fillRect(0, 0, W, H);
  g.save(); g.globalAlpha = Math.min(1, t / 0.2);
  text(g, '...AND BACK TO THE PUB', W / 2, H / 2 - 20, 64, '#ffd400', { lw: 10 });
  text(g, 'Ben: "You\'re welcome, Ron. That\'ll be four grand."', W / 2, H / 2 + 40, 30, '#fff', { weight: 700, maxW: W - 80 });
  g.restore();
}

// ------------------------------------------------------------------ Pepsi Max fills the screen
// the cola rises from the bottom, fizzes with bubbles and a foamy top, then drains
export function drawPepsi(g, t, dur) {
  g.clearRect(0, 0, W, H);
  const rise = ease(t / 0.9), drain = ease((t - (dur - 1.0)) / 1.0);
  const level = H - (H + 40) * rise + (H + 40) * drain;          // y of the surface
  if (level >= H) return;
  // the drink
  g.fillStyle = grad(g, level, H, [[0, 'rgba(60,22,8,0.92)'], [1, 'rgba(18,6,2,0.97)']]); g.fillRect(0, level, W, H - level);
  // wobbly foam on top
  g.fillStyle = 'rgba(210,185,150,0.95)'; g.beginPath(); g.moveTo(0, level + 10);
  for (let x = 0; x <= W; x += 16) g.lineTo(x, level - 6 + Math.sin(x * 0.04 + t * 8) * 7 + Math.sin(x * 0.11 - t * 5) * 4);
  g.lineTo(W, level + 18); g.lineTo(0, level + 18); g.fill();
  // bubbles streaming up
  for (let i = 0; i < 140; i++) {
    const bx = rnd(i) * W + Math.sin(t * 3 + i) * 6, sp = 120 + rnd(i + 9) * 260, by = H - ((t * sp + rnd(i + 3) * H) % (H + 40));
    if (by < level + 8) continue;
    const r = 2 + rnd(i + 5) * 7; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; g.beginPath(); g.arc(bx, by, r, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(bx - r * 0.3, by - r * 0.3, r * 0.3, 0, 7); g.fill();
  }
  // floating ice cubes
  for (let i = 0; i < 5; i++) { const ix = 120 + i * 190 + Math.sin(t * 2 + i) * 20, iy = level + 30 + Math.sin(t * 3 + i * 2) * 6; if (iy > H) continue; g.save(); g.translate(ix, iy); g.rotate(Math.sin(t + i) * 0.4); g.fillStyle = 'rgba(220,240,255,0.55)'; rr(g, -26, -26, 52, 52, 8); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3; rr(g, -26, -26, 52, 52, 8); g.stroke(); g.restore(); }
  // the label floating in it
  if (rise > 0.8 && drain < 0.6) {
    g.save(); g.globalAlpha = Math.min(1, (rise - 0.8) * 5) * (1 - drain); g.translate(W / 2, H / 2 + Math.sin(t * 2) * 10); g.rotate(Math.sin(t * 1.3) * 0.05);
    g.fillStyle = '#0b2fa8'; rr(g, -260, -70, 520, 140, 30); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 6; rr(g, -260, -70, 520, 140, 30); g.stroke();
    text(g, 'PEPSI MAX', 0, 18, 76, '#fff', { lw: 6, stroke: '#0b1a6a' }); text(g, 'NO SUGAR. NO MERCY.', 0, 56, 22, '#9ad4ff', { weight: 700 });
    g.restore();
  }
}

// ------------------------------------------------------------------ Lewis's Portugal SIUUU
// red and green flag sweeps in from the sides, gold shield in the middle, "SIUUUUU!"
export function drawSiu(g, t, dur) {
  g.clearRect(0, 0, W, H);
  const inn = ease(t / 0.3), out = ease((t - (dur - 0.5)) / 0.5), a = inn * (1 - out);
  if (a <= 0) return;
  g.save(); g.globalAlpha = a * 0.92;
  // flag borders: green down the left, red down the right, swept in
  const gw = 260 * inn, rw = 360 * inn;
  g.fillStyle = '#046a38'; g.fillRect(0, 0, gw, H); g.fillStyle = '#da291c'; g.fillRect(W - rw, 0, rw, H);
  g.fillStyle = 'rgba(4,106,56,0.35)'; g.fillRect(0, 0, W, 60); g.fillStyle = 'rgba(218,41,28,0.35)'; g.fillRect(0, H - 60, W, 60);
  g.restore();
  // gold armillary-style emblem spinning in, behind the word
  g.save(); g.globalAlpha = a; g.translate(W / 2, H / 2 - 10); g.rotate((1 - inn) * 3);
  g.strokeStyle = '#ffcc29'; g.lineWidth = 10; g.beginPath(); g.arc(0, 0, 110, 0, 7); g.stroke();
  g.lineWidth = 6; g.beginPath(); g.ellipse(0, 0, 110, 40, 0.5, 0, 7); g.stroke(); g.beginPath(); g.ellipse(0, 0, 110, 40, -0.5, 0, 7); g.stroke();
  g.fillStyle = '#da291c'; rr(g, -40, -50, 80, 100, 16); g.fill(); g.fillStyle = '#fff'; rr(g, -28, -38, 56, 76, 10); g.fill();
  g.fillStyle = '#0b2fa8'; for (const [x, y] of [[0, -18], [-14, 0], [14, 0], [0, 18], [0, 0]]) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
  g.restore();
  // SIUUUUU!
  const s = 1 + Math.max(0, 0.6 - t) * 1.2 + Math.sin(t * 20) * 0.02, u = 'SIU' + 'U'.repeat(Math.min(8, 2 + Math.floor(t * 6))) + '!';
  g.save(); g.globalAlpha = a; g.translate(W / 2, H / 2 + 40); g.scale(s, s);
  text(g, u, 0, 0, 120, '#ffcc29', { lw: 16, stroke: '#7a0e0e', maxW: W - 120 });
  g.restore();
  g.save(); g.globalAlpha = a; text(g, 'LEWIS IS RONALDO. YOU ARE RONALDO. EVERYONE IS RONALDO.', W / 2, H - 22, 26, '#fff', { lw: 6, maxW: W - 60 }); g.restore();
}

// ------------------------------------------------------------------ overlays for the rest of the squad
// Each is drawn over the game view (transparent where it should be), t = seconds in, dur = length.
const fadeIO = (t, dur, a = 0.25, b = 0.4) => Math.max(0, Math.min(1, t / a, (dur - t) / b));
function vignette(g, color, strength) {
  const gr = g.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, W * 0.62);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, color.replace('ALPHA', strength)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
function bigWord(g, s, x, y, size, fill, stroke, rot = 0, scale = 1) { g.save(); g.translate(x, y); g.rotate(rot); g.scale(scale, scale); text(g, s, 0, 0, size, fill, { lw: Math.max(8, size / 7), stroke, maxW: W - 80 }); g.restore(); }

// Aidan: one more beer. Double vision, swaying amber haze, rising bubbles, HIC!
export function drawBeer(g, t, dur) {
  g.clearRect(0, 0, W, H); const a = fadeIO(t, dur, 0.4, 0.8);
  g.save(); g.globalAlpha = a;
  vignette(g, 'rgba(120,70,10,ALPHA)', 0.75);
  // ghost "double vision" rings drifting apart and together
  const off = Math.sin(t * 2.2) * 26;
  for (const s of [-1, 1]) { g.strokeStyle = 'rgba(255,220,140,0.25)'; g.lineWidth = 30; g.beginPath(); g.ellipse(W / 2 + s * off, H / 2, W * 0.42, H * 0.46, 0, 0, 7); g.stroke(); }
  for (let i = 0; i < 40; i++) { const bx = rnd(i) * W, by = H - ((t * (60 + rnd(i + 2) * 80) + rnd(i + 5) * H) % H), r = 3 + rnd(i + 7) * 8; g.fillStyle = 'rgba(255,230,160,0.35)'; g.beginPath(); g.arc(bx + Math.sin(t * 3 + i) * 10, by, r, 0, 7); g.fill(); }
  const hic = Math.floor(t / 1.1);
  for (let i = 0; i <= hic; i++) { const k = t - i * 1.1; if (k > 1) continue; bigWord(g, 'HIC!', 200 + (i * 331) % 620, 180 + (i * 97) % 200, 60, '#ffd400', '#5a3a10', -0.2 + (i % 3) * 0.2, 0.8 + k * 0.5); }
  text(g, 'ONE MORE. JUST THE ONE. (IT\'S NEVER JUST THE ONE)', W / 2, H - 26, 28, '#fff', { lw: 6, maxW: W - 60 });
  g.restore();
}
// Harry: his dating app takes over your whole screen, swiping through the disasters
export function drawDating(g, t, dur) {
  g.clearRect(0, 0, W, H); const a = fadeIO(t, dur);
  g.save(); g.globalAlpha = a;
  g.fillStyle = 'rgba(40,0,20,0.55)'; g.fillRect(0, 0, W, H);
  // the phone
  const px = W / 2 - 150, py = 30 + (1 - ease(t / 0.35)) * 400;
  g.fillStyle = '#111'; rr(g, px, py, 300, 520, 36); g.fill();
  g.fillStyle = grad(g, py, py + 520, [[0, '#ff5f8a'], [1, '#ff3b6b']]); rr(g, px + 12, py + 14, 276, 492, 28); g.fill();
  text(g, 'MATCHR', W / 2, py + 52, 30, '#fff');
  const names = ['STACEY, 27', 'JADE, 25', 'KELLY, 29', 'AMBER, 26', 'CHANTELLE, 28'], bios = ['"No time-wasters"', '"6ft only (Harry: 5\'11 and a half)"', '"Must love dogs"', '"Here for a good time"', '"If you know Harry, swipe left"'];
  const i = Math.floor(t / 1.05) % names.length, k = (t % 1.05) / 1.05, sw = k > 0.7 ? (k - 0.7) / 0.3 : 0;
  g.save(); g.translate(W / 2 - sw * 320, py + 250); g.rotate(-sw * 0.5);
  g.fillStyle = '#fff'; rr(g, -120, -170, 240, 330, 20); g.fill();
  g.fillStyle = ['#e8b48a', '#f2c9a0', '#c98a5a', '#ffd9b8', '#e0a070'][i]; g.beginPath(); g.arc(0, -70, 62, 0, 7); g.fill();
  g.fillStyle = ['#5a3a22', '#e8c070', '#1a1210', '#a0522d', '#3a2416'][i]; g.beginPath(); g.arc(0, -90, 64, Math.PI, 0); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.arc(-22, -70, 6, 0, 7); g.arc(22, -70, 6, 0, 7); g.fill();
  g.strokeStyle = '#c0392b'; g.lineWidth = 4; g.beginPath(); g.arc(0, -50, 18, 0.3, Math.PI - 0.3); g.stroke();
  text(g, names[i], 0, 40, 26, '#111'); text(g, bios[i], 0, 72, 16, '#555', { weight: 700, maxW: 220 });
  if (sw > 0) { g.save(); g.rotate(0.3); g.strokeStyle = '#c0392b'; g.lineWidth = 6; rr(g, -90, 90, 180, 50, 8); g.stroke(); text(g, 'NOPE', 0, 128, 34, '#c0392b'); g.restore(); }
  g.restore();
  // a chat bubble from Harry
  const chats = ['hey', 'hey', 'u there?', 'hellooo', 'ok then'];
  g.fillStyle = '#fff'; rr(g, px + 30, py + 430, 200, 46, 18); g.fill(); text(g, `Harry: "${chats[i]}"`, px + 130, py + 461, 18, '#333', { weight: 700 });
  // broken hearts floating up the sides
  for (let n = 0; n < 10; n++) { const hx = n % 2 ? 80 + rnd(n) * 180 : W - 260 + rnd(n) * 180, hy = H - ((t * 90 + n * 70) % (H + 60)); text(g, n % 3 ? '💔' : '❤', hx, hy, 38, '#ff6b8b'); }
  text(g, 'HARRY\'S DATING HISTORY: 47 MATCHES · 0 REPLIES', W / 2, H - 20, 26, '#fff', { lw: 6, maxW: W - 60 });
  g.restore();
}
// Chloe: the diet plan clipboard slides in, junk food gets crossed off, lettuce rains down
export function drawDiet(g, t, dur) {
  g.clearRect(0, 0, W, H); const a = fadeIO(t, dur);
  g.save(); g.globalAlpha = a;
  vignette(g, 'rgba(40,120,40,ALPHA)', 0.6);
  for (let i = 0; i < 26; i++) { const lx = rnd(i) * W, ly = ((t * (120 + rnd(i + 1) * 120) + rnd(i + 2) * H) % (H + 80)) - 40; g.save(); g.translate(lx, ly); g.rotate(t * 2 + i); g.fillStyle = i % 4 ? '#6abf3a' : '#e53935'; g.beginPath(); g.ellipse(0, 0, 18, 9, 0, 0, 7); g.fill(); g.restore(); }
  const cx = W - 300 + (1 - ease(t / 0.4)) * 400;
  g.save(); g.translate(cx, 70); g.rotate(0.06);
  g.fillStyle = '#8a5a2a'; rr(g, 0, 0, 260, 380, 14); g.fill(); g.fillStyle = '#fffdf2'; rr(g, 14, 30, 232, 336, 6); g.fill();
  g.fillStyle = '#9aa0a8'; rr(g, 90, -12, 80, 34, 8); g.fill();
  text(g, "RONNIE'S NEW DIET", 130, 70, 22, '#c2185b'); text(g, 'by Chloe x', 130, 94, 16, '#555', { weight: 700 });
  const foods = ['Burgers', 'Pizza', 'Doughnuts', 'Kebabs', 'MONSTOR', 'Salad ✓'];
  foods.forEach((f, i) => { const y = 140 + i * 40; text(g, f, 40, y, 24, i === 5 ? '#2e7d32' : '#111', { align: 'left', weight: 700 }); if (i < 5 && t > 0.4 + i * 0.25) { g.strokeStyle = '#c62828'; g.lineWidth = 5; g.beginPath(); g.moveTo(34, y - 8); g.lineTo(40 + g.measureText(f).width + 8, y - 8); g.stroke(); } });
  g.restore();
  bigWord(g, 'NO EATING!', 300, H / 2, 72, '#7cff6a', '#1b4a1b', -0.08, 1 + Math.sin(t * 6) * 0.03);
  g.restore();
}
// Oliver: you're in his viewfinder, LIVE, the views shoot up, then the FLASH
export function drawFlash(g, t, dur) {
  g.clearRect(0, 0, W, H); const a = fadeIO(t, dur, 0.15, 0.5);
  g.save(); g.globalAlpha = a;
  // viewfinder corners and grid
  g.strokeStyle = '#fff'; g.lineWidth = 6;
  for (const [x, y, sx, sy] of [[40, 40, 1, 1], [W - 40, 40, -1, 1], [40, H - 40, 1, -1], [W - 40, H - 40, -1, -1]]) { g.beginPath(); g.moveTo(x, y + sy * 60); g.lineTo(x, y); g.lineTo(x + sx * 60, y); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 2; for (const k of [1, 2]) { g.beginPath(); g.moveTo(W * k / 3, 40); g.lineTo(W * k / 3, H - 40); g.moveTo(40, H * k / 3); g.lineTo(W - 40, H * k / 3); g.stroke(); }
  g.fillStyle = Math.floor(t * 3) % 2 ? '#ff1744' : '#7a0010'; g.beginPath(); g.arc(80, 82, 12, 0, 7); g.fill(); text(g, 'LIVE', 100, 92, 28, '#fff', { align: 'left' });
  const views = Math.floor(Math.pow(10, 2 + Math.min(1, t / (dur * 0.8)) * 4.5));
  text(g, `👁 ${views.toLocaleString()}`, W - 80, 92, 28, '#fff', { align: 'right', lw: 5 });
  for (let i = 0; i < 16; i++) { const hx = W - 120 + Math.sin(t * 3 + i) * 30, hy = H - 60 - ((t * 160 + i * 40) % 380); text(g, ['❤', '😂', '🔥', '😱'][i % 4], hx, hy, 34, '#ff4f7b'); }
  text(g, '"guys he\'s eating AGAIN"  "LMAO"  "is that a whole cake"  "RONNIE 4 PM"', W / 2, H - 60, 22, '#fff', { weight: 700, lw: 5, maxW: W - 120 });
  // the flash itself
  const f = t > 0.5 && t < 1.2 ? 1 - (t - 0.5) / 0.7 : 0;
  if (f > 0) { g.fillStyle = `rgba(255,255,255,${f})`; g.fillRect(0, 0, W, H); }
  if (t > 1.0) bigWord(g, 'GONE VIRAL!', W / 2, H / 2, 96, '#fff', '#ff1744', -0.05, 1 + Math.max(0, 1.4 - t) * 0.6);
  g.restore();
}
// Dylan: a gig in your face. Stage lights, notes, and karaoke lyrics with a bouncing ball
export function drawOasis(g, t, dur) {
  g.clearRect(0, 0, W, H); const a = fadeIO(t, dur);
  g.save(); g.globalAlpha = a;
  g.fillStyle = 'rgba(10,0,30,0.45)'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 5; i++) {     // sweeping stage lights
    const x = 100 + i * 200, ang = Math.sin(t * 1.5 + i) * 0.4;
    g.save(); g.translate(x, 0); g.rotate(ang); g.globalCompositeOperation = 'lighter';
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, ['rgba(255,80,80,0.5)', 'rgba(80,160,255,0.5)', 'rgba(255,220,80,0.5)', 'rgba(160,80,255,0.5)', 'rgba(80,255,160,0.5)'][i]); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-10, 0); g.lineTo(10, 0); g.lineTo(120, H); g.lineTo(-120, H); g.fill(); g.restore();
  }
  for (let i = 0; i < 14; i++) { const nx = (rnd(i) * W + t * 40 * (i % 2 ? 1 : -1)) % W, ny = H - ((t * 110 + i * 60) % H); text(g, i % 2 ? '♪' : '♫', nx, ny, 40 + (i % 3) * 10, ['#ffd400', '#7cff6a', '#ff6bd5'][i % 3], { lw: 5 }); }
  text(g, 'DYLAN — LIVE AT THE OYSTERFLEET', W / 2, 60, 34, '#fff', { lw: 7, maxW: W - 80 });
  const LY = ['Today is gonna be the day', 'that you put down the pie', 'and all the roads we have to walk', 'are leading to the chippy', 'don\'t look back in anger, Ron', 'look back at the buffet'];
  const li = Math.floor(t / (dur / LY.length)) % LY.length, k = (t % (dur / LY.length)) / (dur / LY.length);
  g.fillStyle = 'rgba(0,0,0,0.6)'; rr(g, 80, H - 120, W - 160, 86, 20); g.fill();
  g.font = `900 34px ${FONT}`; const lw = g.measureText(LY[li]).width, lx = W / 2 - lw / 2;
  text(g, LY[li], W / 2, H - 64, 34, '#fff', { maxW: W - 200 });
  g.save(); g.beginPath(); g.rect(lx, H - 110, lw * k, 70); g.clip(); text(g, LY[li], W / 2, H - 64, 34, '#ffd400', { maxW: W - 200 }); g.restore();
  g.fillStyle = '#ff4f7b'; g.beginPath(); g.arc(lx + lw * k, H - 108 - Math.abs(Math.sin(k * Math.PI * 6)) * 24, 10, 0, 7); g.fill();
  text(g, 'YOU CAN\'T LEAVE UNTIL THE B-SIDES ARE DONE', W / 2, H - 14, 20, '#ccc', { weight: 700 });
  g.restore();
}
// Ian: hooked! Water ripples, the line, and a "catch of the day" weigh-in
export function drawRod(g, t, dur) {
  g.clearRect(0, 0, W, H); const a = fadeIO(t, dur);
  g.save(); g.globalAlpha = a;
  vignette(g, 'rgba(10,60,90,ALPHA)', 0.7);
  g.fillStyle = 'rgba(30,120,160,0.45)'; g.fillRect(0, H - 120, W, 120);
  for (let i = 0; i < 6; i++) { const r = ((t * 120 + i * 60) % 360); g.strokeStyle = `rgba(255,255,255,${0.5 * (1 - r / 360)})`; g.lineWidth = 4; g.beginPath(); g.ellipse(W / 2, H - 60, r, r * 0.18, 0, 0, 7); g.stroke(); }
  g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(W / 2 + Math.sin(t * 8) * 20, 0); g.quadraticCurveTo(W / 2 + 60, H * 0.4, W / 2, H * 0.62); g.stroke();
  g.save(); g.translate(W / 2, H * 0.62); g.rotate(Math.sin(t * 10) * 0.2); g.strokeStyle = '#ccc'; g.lineWidth = 6; g.beginPath(); g.arc(0, 18, 18, -Math.PI, Math.PI * 0.6); g.stroke(); g.restore();
  // the weigh-in card
  const cx = 60 + (1 - ease((t - 0.3) / 0.4)) * -420;
  g.save(); g.translate(cx, 90); g.rotate(-0.05);
  g.fillStyle = '#f5f0dc'; rr(g, 0, 0, 340, 230, 16); g.fill(); g.strokeStyle = '#5a3a1a'; g.lineWidth = 6; rr(g, 0, 0, 340, 230, 16); g.stroke();
  text(g, 'CATCH OF THE DAY', 170, 44, 28, '#1e5a7a'); text(g, 'SPECIES: RONNIE', 24, 92, 22, '#111', { align: 'left', weight: 700 });
  text(g, `WEIGHT: ${Math.round(lerp(40, 140, ease(t / 2)))} KG`, 24, 128, 22, '#111', { align: 'left', weight: 700 }); text(g, 'LOCATION: CANVEY LAKE', 24, 164, 22, '#111', { align: 'left', weight: 700 }); text(g, '(the lake is a disgrace)', 24, 196, 18, '#777', { align: 'left', weight: 700 });
  g.restore();
  bigWord(g, 'HOOKED!', W - 260, 160, 84, '#ffd400', '#0d3a5a', 0.1, 1 + Math.sin(t * 8) * 0.04);
  g.restore();
}
// Noah: the tackle. Impact burst, grass rushing up, rugby scoreboard
export function drawTackle(g, t, dur) {
  g.clearRect(0, 0, W, H); const a = fadeIO(t, dur, 0.05, 0.5);
  g.save(); g.globalAlpha = a;
  if (t < 0.25) { g.fillStyle = `rgba(255,255,255,${1 - t / 0.25})`; g.fillRect(0, 0, W, H); }
  g.save(); g.translate(W / 2, H / 2); const s = 0.6 + ease(t / 0.3) * 0.6; g.scale(s, s); g.rotate(t * 0.4);
  g.fillStyle = '#ffd400'; g.beginPath(); for (let i = 0; i < 28; i++) { const ang = i / 28 * Math.PI * 2, r = i % 2 ? 140 : 260; g.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); } g.closePath(); g.fill();
  g.fillStyle = '#e53935'; g.beginPath(); for (let i = 0; i < 28; i++) { const ang = i / 28 * Math.PI * 2 + 0.1, r = i % 2 ? 100 : 190; g.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); } g.closePath(); g.fill();
  g.restore();
  bigWord(g, 'THWACK!', W / 2, H / 2 + 26, 110, '#fff', '#7a0e0e', -0.1, 1);
  g.fillStyle = 'rgba(0,0,0,0.7)'; rr(g, W / 2 - 230, 26, 460, 70, 12); g.fill();
  text(g, 'NOAH 7 — 0 RONNIE', W / 2, 74, 40, '#fff');
  text(g, 'TRY! (Ronnie is the ball)', W / 2, H - 24, 28, '#ffd400', { lw: 6 });
  g.restore();
}
// Tommy: tripped. The world tips, stars spin, Tommy's grinning face pops up
export function drawTrip(g, t, dur) {
  g.clearRect(0, 0, W, H); const a = fadeIO(t, dur, 0.1, 0.6);
  g.save(); g.globalAlpha = a;
  vignette(g, 'rgba(0,0,0,ALPHA)', 0.6);
  for (let i = 0; i < 8; i++) { const ang = t * 3 + i / 8 * Math.PI * 2; sparkle(g, W / 2 + Math.cos(ang) * 260, 200 + Math.sin(ang) * 70, 22, ang); }
  bigWord(g, 'TIMBERRRR!', W / 2, 140, 90, '#ffd400', '#5a2a0a', -0.15 + Math.sin(t * 4) * 0.05, 1);
  // Tommy popping up from the corner, laughing
  const py = H - ease(t / 0.4) * 200;
  g.save(); g.translate(W - 170, py + 120);
  g.fillStyle = '#e8b896'; g.beginPath(); g.ellipse(0, 0, 90, 110, 0, 0, 7); g.fill();
  g.fillStyle = '#3a2416'; g.beginPath(); g.ellipse(0, -70, 94, 56, 0, Math.PI, 0); g.fill();
  g.lineWidth = 6; g.strokeStyle = '#111'; g.beginPath(); g.arc(-32, -6, 12, Math.PI + 0.3, -0.3); g.arc(32, -6, 12, Math.PI + 0.3, -0.3); g.stroke();
  g.fillStyle = '#5a1a1a'; g.beginPath(); g.ellipse(0, 46, 40, 20 + Math.abs(Math.sin(t * 14)) * 10, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(-30, 30, 60, 10);
  g.restore();
  if (t > 0.4) bubble(g, W - 520, H - 250, 'HAHAHA! Have a lie down, Ron!', { tail: 'right', w: 360 });
  text(g, 'DOWN FOR 5 SECONDS', 240, H - 30, 34, '#fff', { lw: 7 });
  g.restore();
}
// Connor: the jig. Shamrocks rain, green-white-orange bands, RIVERDANCE lights
export function drawJig(g, t, dur) {
  g.clearRect(0, 0, W, H); const a = fadeIO(t, dur);
  g.save(); g.globalAlpha = a * 0.9;
  g.fillStyle = '#169b62'; g.fillRect(0, 0, 70, H); g.fillStyle = '#ffffff'; g.fillRect(70, 0, 20, H); g.fillStyle = '#ff883e'; g.fillRect(W - 70, 0, 70, H); g.fillStyle = '#ffffff'; g.fillRect(W - 90, 0, 20, H);
  for (let i = 0; i < 24; i++) { const sx = rnd(i) * W, sy = ((t * (140 + rnd(i + 3) * 80) + rnd(i + 1) * H) % (H + 60)) - 30; text(g, '☘', sx, sy, 34 + (i % 3) * 12, '#2ecc40', { lw: 4, stroke: '#0a4a1a' }); }
  bigWord(g, 'JIG, RONNIE, JIG!', W / 2, 110 + Math.abs(Math.sin(t * 11)) * -20, 80, '#ffd400', '#0a4a1a', Math.sin(t * 5.5) * 0.06, 1);
  text(g, '♪ THE IRISH WASHERWOMAN ♪  (Connor insists you know the steps)', W / 2, H - 24, 26, '#fff', { lw: 6, maxW: W - 200 });
  g.restore();
}
// Alfie: nutmegged. A spinning spiral and the ball rolling away
export function drawNutmeg(g, t, dur) {
  g.clearRect(0, 0, W, H); const a = fadeIO(t, dur, 0.1, 1.2);
  g.save(); g.globalAlpha = a * 0.55;
  g.translate(W / 2, H / 2); g.rotate(t * 6);
  for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? 'rgba(3,70,148,0.6)' : 'rgba(255,255,255,0.4)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, W, i / 12 * Math.PI * 2, (i + 1) / 12 * Math.PI * 2); g.closePath(); g.fill(); }
  g.restore();
  g.save(); g.globalAlpha = a;
  bigWord(g, 'NUTMEGGED!', W / 2, H / 2, 100, '#ffd400', '#034694', Math.sin(t * 9) * 0.15, 1 + Math.sin(t * 7) * 0.05);
  text(g, '"Olé!" — Alfie (Sunday League legend, 1 tattoo short of a back piece)', W / 2, H - 26, 24, '#fff', { lw: 6, maxW: W - 80 });
  g.restore();
}
export const OVERLAYS = { beer: drawBeer, dating: drawDating, diet: drawDiet, flash: drawFlash, oasis: drawOasis, rod: drawRod, tackle: drawTackle, trip: drawTrip, jig: drawJig, nutmeg: drawNutmeg, pepsi: drawPepsi, siu: drawSiu };
