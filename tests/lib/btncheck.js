// (runs in the page) every button showing inside `scope`: brought into view the way a finger would scroll to it, is it
// all on the screen and is it what a tap on its middle would press (not under something else)? -> [{ what, why }]
window.__btnCheck = async function (scope) {
  const out = [], W = innerWidth, H = innerHeight, root = typeof scope === 'string' ? document.querySelector(scope) : (scope || document.body);
  if (!root) return [{ what: String(scope), why: 'not there' }];
  const shown = (el) => { for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false;
      if (e.classList && e.classList.contains('face')) { const fl = e.closest('.flip'); if (e.classList.contains('back') !== !!(fl && fl.classList.contains('flipped'))) return false; } }
    const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
  const name = (el) => (el.id ? '#' + el.id + ' ' : '') + '"' + (el.textContent || el.getAttribute('aria-label') || el.className || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 30) + '"';
  const els = [...root.querySelectorAll('button, a[href], [role="button"], select, input:not([type="hidden"]), .scene, .flip')].filter(shown);
  const frame = () => new Promise(r => requestAnimationFrame(() => r()));
  for (const el of els) {
    if (el.closest('[aria-hidden="true"]') || el.disabled && el.dataset.allowDisabled) continue;
    try { el.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (e) {} await frame();
    if (!shown(el)) continue;      // (scrolling a carousel hid it: it isn't on this page)
    const r = el.getBoundingClientRect(); const big = r.height > H * 0.8 || r.width > W;      // (a whole card: its middle is what counts)
    if (!big && (r.top < -1 || r.bottom > H + 1 || r.left < -1 || r.right > W + 1)) { out.push({ what: name(el), why: `off the screen [${[r.left, r.top, r.right, r.bottom].map(Math.round)}] of ${W}x${H}` }); continue; }
    const pts = [[r.left + r.width / 2, r.top + r.height / 2]]; if (el.tagName === 'BUTTON') pts.push([r.left + Math.min(10, r.width / 4), r.top + r.height / 2], [r.right - Math.min(10, r.width / 4), r.top + r.height / 2]);      // (a big card: a tap on its middle; a button: its ends too)
    for (const [x, y] of pts) { if (x < 0 || y < 0 || x >= W || y >= H) continue; const u = document.elementFromPoint(x, y);
      if (!u || (u !== el && !el.contains(u) && !(u.closest('label') && u.closest('label').contains(el)))) { out.push({ what: name(el), why: 'covered by ' + (u ? (u.id ? '#' + u.id : u.tagName.toLowerCase() + '.' + String(u.className).split(' ')[0]) + ' "' + (u.textContent || '').trim().slice(0, 20) + '"' : 'nothing') }); break; } }
  }
  // every panel (fixed on the screen, or with a border of its own) inside the screen's sides, unless it's in something that scrolls sideways
  const boxes = [root, ...root.querySelectorAll('*')].filter(e => { if (e.id === 'rain' || e.closest('#rain')) return false; const c = getComputedStyle(e); return (c.position === 'fixed' || parseFloat(c.borderLeftWidth) > 0) && shown(e); });
  for (const e of boxes) { let sx = false; for (let a = e.parentElement; a; a = a.parentElement) { const c = getComputedStyle(a); if (/(auto|scroll|hidden)/.test(c.overflowX) && a.scrollWidth > a.clientWidth + 2) { sx = true; break; } } if (sx) continue;
    const r = e.getBoundingClientRect(); if (r.width >= W - 1 && r.left <= 0) continue;      // (a full-screen layer)
    if (r.bottom <= 0 || r.top >= H) continue;
    if (r.left < -1 || r.right > W + 1) out.push({ what: name(e), why: `a panel over the side of the screen [${Math.round(r.left)}..${Math.round(r.right)}] of ${W}` }); }
  return out;
};
