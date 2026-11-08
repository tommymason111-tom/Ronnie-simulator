// Canvas-drawn textures: posters, labels, signs, wallpaper, the can label...
// Drawing them at load time means no image files and very little memory.
import * as THREE from 'three';

export function canvasTex(w, h, draw, { repeat = null, mips = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (!mips) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

export const FONT = '"Arial Black", "Impact", "Helvetica Neue", Arial, sans-serif';

// Word-wrap text inside a box, shrinking the font until it fits.
export function fitText(g, text, x, y, maxW, maxH, startSize, { color = '#111', font = FONT, lineGap = 1.12, align = 'center' } = {}) {
  let size = startSize, lines;
  for (; size > 10; size -= 2) {
    g.font = `900 ${size}px ${font}`;
    lines = wrap(g, text, maxW);
    if (lines.length * size * lineGap <= maxH && lines.every(l => g.measureText(l).width <= maxW)) break;
  }
  g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle';
  const total = lines.length * size * lineGap;
  const ax = align === 'center' ? x + maxW / 2 : x;
  lines.forEach((l, i) => g.fillText(l, ax, y + (maxH - total) / 2 + size * lineGap * (i + 0.5)));
}

function wrap(g, text, maxW) {
  const out = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (g.measureText(test).width > maxW && line) { out.push(line); line = word; }
      else line = test;
    }
    out.push(line);
  }
  return out;
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}

// A simple sign/poster: background, optional border, wrapped text.
export function signTex(text, { w = 512, h = 512, bg = '#fff8e7', fg = '#1a1a1a', border = '#c0392b', size = 72, title = null, titleColor = '#c0392b' } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (border) { g.strokeStyle = border; g.lineWidth = Math.max(8, w * 0.03); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth); }
    const pad = w * 0.08;
    if (title) {
      fitText(g, title, pad, pad, w - pad * 2, h * 0.28, size * 1.4, { color: titleColor });
      fitText(g, text, pad, h * 0.32, w - pad * 2, h * 0.6, size, { color: fg });
    } else fitText(g, text, pad, pad, w - pad * 2, h - pad * 2, size, { color: fg });
  });
}

// MONSTOR Mango Loco can label (parody brand): orange/yellow sun pattern + green claw.
export function canLabelTex() {
  return canvasTex(512, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#ffb300'); grad.addColorStop(0.5, '#ff7a00'); grad.addColorStop(1, '#ff4f00');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    // sun rays
    g.save(); g.translate(w * 0.75, h * 0.55);
    for (let i = 0; i < 16; i++) {
      g.rotate(Math.PI / 8);
      g.fillStyle = i % 2 ? 'rgba(255,240,120,0.55)' : 'rgba(255,200,40,0.35)';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(200, -22); g.lineTo(200, 22); g.fill();
    }
    g.fillStyle = '#ffe94d'; g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.fill();
    g.restore();
    // flowers
    for (let i = 0; i < 9; i++) {
      const x = 30 + i * 55, y = i % 2 ? 30 : h - 30;
      g.fillStyle = i % 3 ? '#ff2d7a' : '#22c3ff';
      for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.26) * 9, y + Math.sin(k * 1.26) * 9, 7, 0, 7); g.fill(); }
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill();
    }
    // green claw marks
    g.strokeStyle = '#39ff14'; g.lineWidth = 14; g.lineCap = 'round';
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(60 + i * 34, 60); g.quadraticCurveTo(80 + i * 34, 130, 66 + i * 34, 200); g.stroke(); }
    g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = '#111'; g.strokeText('MONSTOR', w * 0.5, h * 0.36);
    g.fillStyle = '#fff'; g.fillText('MONSTOR', w * 0.5, h * 0.36);
    g.font = `900 40px ${FONT}`; g.lineWidth = 8; g.strokeText('MANGO LOCO', w * 0.5, h * 0.66);
    g.fillStyle = '#ffe94d'; g.fillText('MANGO LOCO', w * 0.5, h * 0.66);
  });
}

// Wallpaper with a soft fake ambient-occlusion gradient at floor and ceiling.
export function wallTex() {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#e9dcc6'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(160,130,95,0.12)';
    for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 12, h);
    const ao = g.createLinearGradient(0, 0, 0, h);
    ao.addColorStop(0, 'rgba(60,40,20,0.35)'); ao.addColorStop(0.12, 'rgba(60,40,20,0)');
    ao.addColorStop(0.85, 'rgba(60,40,20,0)'); ao.addColorStop(1, 'rgba(60,40,20,0.45)');
    g.fillStyle = ao; g.fillRect(0, 0, w, h);
  });
}

export function floorTex() {
  return canvasTex(512, 512, (g, w, h) => {
    const plank = 64;
    for (let y = 0; y < h; y += plank) {
      for (let x = -((y / plank) % 2) * 128; x < w; x += 256) {
        const v = 150 + Math.floor(Math.random() * 30);
        g.fillStyle = `rgb(${v},${Math.floor(v * 0.68)},${Math.floor(v * 0.42)})`;
        g.fillRect(x, y, 256, plank);
        g.strokeStyle = 'rgba(60,35,15,0.6)'; g.lineWidth = 3; g.strokeRect(x, y, 256, plank);
        g.strokeStyle = 'rgba(90,55,25,0.18)'; g.lineWidth = 1;
        for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(x, y + 10 + k * 10); g.bezierCurveTo(x + 80, y + 5 + k * 11, x + 160, y + 15 + k * 9, x + 256, y + 10 + k * 10); g.stroke(); }
      }
    }
  }, { repeat: [3, 3] });
}

// Soft round shadow blob (used under Tommy).
export function blobTex() {
  return canvasTex(128, 128, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, 'rgba(0,0,0,0.55)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
}

// Blinds light stripes on the floor (fake projected "cookie" from section 39.1).
export function stripesTex() {
  return canvasTex(256, 256, (g, w, h) => {
    for (let y = 0; y < h; y += 32) {
      const grad = g.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, 'rgba(255,217,160,0)'); grad.addColorStop(0.2, 'rgba(255,217,160,0.55)');
      grad.addColorStop(0.8, 'rgba(255,217,160,0.55)'); grad.addColorStop(1, 'rgba(255,217,160,0)');
      g.fillStyle = grad; g.fillRect(0, y + 4, w, 18);
    }
  }, { mips: true });
}

// Vertical fade used for the sunbeam volumes and Tommy's spotlight cone.
export function beamTex() {
  return canvasTex(64, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    const side = g.createLinearGradient(0, 0, w, 0);
    side.addColorStop(0, 'rgba(0,0,0,1)'); side.addColorStop(0.3, 'rgba(0,0,0,0)');
    side.addColorStop(0.7, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = side; g.fillRect(0, 0, w, h);
  });
}
