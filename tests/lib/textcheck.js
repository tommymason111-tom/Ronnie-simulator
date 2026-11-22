// (runs in the page) every bit of text on screen: is any of it cut off (by the screen's edge or a box that hides its
// overflow) or covered by another bit of text? -> [{ kind, text, by, rect }]
window.__textCheck = function (scope) {
  const out = [], W = innerWidth, H = innerHeight;
  const visible = (el) => { for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false;
      // (the far side of a card that flips: hidden by backface-visibility)
      if (e.classList && e.classList.contains('face')) { const fl = e.closest('.flip'), flipped = fl && fl.classList.contains('flipped'); if (e.classList.contains('back') !== !!flipped) return false; }
      if (e.id === 'rain' || (e.getAttribute && e.getAttribute('aria-hidden') === 'true')) return false; }      // (the falling food behind the title menus: decoration, drifting past on purpose)
    return true; };
  const label = (el) => (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') || el.tagName.toLowerCase();
  const path = (el) => { const l = []; for (let e = el; e && e !== document.body && l.length < 4; e = e.parentElement) l.unshift(label(e)); return l.join(' > '); };
  const texts = [];
  const tw = document.createTreeWalker(scope || document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.nodeValue.trim().length > 1 ? 1 : 3 });
  for (let n; (n = tw.nextNode());) { const el = n.parentElement; if (!el || /^(SCRIPT|STYLE|NOSCRIPT|OPTION|TEXTAREA)$/.test(el.tagName)) continue; if (!visible(el)) continue;
    const r = document.createRange(); r.selectNodeContents(n); let rects = [...r.getClientRects()].filter(q => q.width > 1 && q.height > 1);
    // (scrolled out of sight inside a box that scrolls: not on the screen at all)
    for (let e = el; e && e !== document.body && rects.length; e = e.parentElement) { const c = getComputedStyle(e); if (!/(auto|scroll|hidden|clip)/.test(c.overflowY + c.overflowX)) continue; const bx = e.getBoundingClientRect();
      rects = rects.filter(q => !(q.bottom <= bx.top + 1 || q.top >= bx.bottom - 1 || q.right <= bx.left + 1 || q.left >= bx.right - 1)); }
    if (!rects.length) continue;
    texts.push({ n, el, rects, text: n.nodeValue.trim().slice(0, 40) }); }
  for (const t of texts) {
    // cut by the screen's edge (not inside something that scrolls sideways)
    let scrollX = false; for (let e = t.el; e; e = e.parentElement) { const c = getComputedStyle(e); if (/(auto|scroll)/.test(c.overflowX) && e.scrollWidth > e.clientWidth + 2) { scrollX = true; break; } }
    for (const q of t.rects) {
      if (q.right <= 0 || q.left >= W || q.bottom <= 0 || q.top >= H) continue;      // (right off the screen: waiting to slide in, not cut)
      if (!scrollX && (q.left < -1 || q.right > W + 1)) out.push({ kind: 'off the side of the screen', text: t.text, where: path(t.el), r: [q.left, q.right].map(Math.round) });
      // cut by a box that hides what spills out of it
      for (let e = t.el.parentElement, self = t.el; e && e !== document.body; self = e, e = e.parentElement) {
        const c = getComputedStyle(e); if (!/(hidden|clip)/.test(c.overflowX + c.overflowY)) continue;
        const b = e.getBoundingClientRect(); if (b.width < 2) continue;
        if (q.right <= b.left || q.left >= b.right || q.bottom <= b.top || q.top >= b.bottom) break;      // (wholly outside it: scrolled away, not cut)
        const cutX = /(hidden|clip)/.test(c.overflowX) && (q.left < b.left - 1 || q.right > b.right + 1), cutY = /(hidden|clip)/.test(c.overflowY) && (q.top < b.top - 2 || q.bottom > b.bottom + 2);
        if (cutX || cutY) { out.push({ kind: 'cut off by its box', text: t.text, where: path(t.el), box: label(e) }); break; }
      }
    }
    // shortened with "..."
    const c = getComputedStyle(t.el); if (c.textOverflow === 'ellipsis' && t.el.scrollWidth > t.el.clientWidth + 1) out.push({ kind: 'shortened with ...', text: t.text, where: path(t.el) });
  }
  // text on top of other text (two different boxes on screen at once)
  const boxes = texts.map(t => ({ t, r: t.rects[0] }));
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j]; if (a.t.el.contains(b.t.el) || b.t.el.contains(a.t.el)) continue;
    const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    // (text scrolling under a solid sticky header or footer is hidden by it on purpose)
    const solidSticky = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.position === 'sticky') { const bg = c.backgroundColor.match(/[\d.]+/g); return (bg && (bg.length < 4 || +bg[3] > 0.85)) || c.backgroundImage !== 'none' ? e : null; } } return null; };
    if (ox > 4 && oy > 4) { const sa = solidSticky(a.t.el), sb = solidSticky(b.t.el); if (sa !== sb && (sa || sb)) continue;
      // which one's on top where they meet? (fine if a whole popup is on top of the game: only text-on-text at the same level counts)
      const za = (el) => { let z = 0; for (let e = el; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.position !== 'static' && c.zIndex !== 'auto') z = Math.max(z, +c.zIndex); } return z; };
      const zA = za(a.t.el), zB = za(b.t.el); if (Math.abs(zA - zB) >= 30) continue;      // (a popup well above the HUD covers it on purpose)
      out.push({ kind: 'text on text', text: a.t.text, by: b.t.text, where: path(a.t.el) + '  ×  ' + path(b.t.el) });
    }
  }
  const seen = new Set(); return out.filter(o => { const k = o.kind + o.text + (o.by || ''); if (seen.has(k)) return false; seen.add(k); return true; });
};
