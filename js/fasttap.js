// FAST TAPS on phones: a button works the moment your finger lifts off it.
// A phone's own "click" comes a moment after the finger lifts, and iOS drops it altogether when the page was still
// gliding from a scroll, or something on the page was busy: LET'S EAT, RESTART ROUND and the rest then did nothing at
// all. Here, a touch that goes down and comes up on the same button (without dragging) clicks it straight away, and the
// phone's own late click that follows is ignored, so nothing happens twice. Mouse, pen and keyboard are left alone.
(function () {
  const SEL = 'button, [role="button"], .mate, .scene, .flip, .rp, [data-tap]';
  const SKIP = 'input, textarea, select, label, #touch, #touch *, [data-notap]';
  let down = null, quiet = null;
  const target = (el) => { const b = el && el.closest ? el.closest(SEL) : null; return b && !b.closest(SKIP) && !b.disabled ? b : null; };
  addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || !e.isPrimary) { down = null; return; }
    const b = target(e.target); down = b ? { b, x: e.clientX, y: e.clientY, id: e.pointerId, t: e.timeStamp } : null;
  }, true);
  addEventListener('pointerup', (e) => {
    const d = down; down = null;
    if (!d || e.pointerId !== d.id || e.pointerType !== 'touch') return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12) return;      // (a drag or a scroll: not a tap. However long the finger stayed down, it's a press: a busy page can make even a quick tap look long)
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (!under || !d.b.contains(under) || !d.b.isConnected || d.b.disabled) return;
    quiet = { b: d.b, x: e.clientX, y: e.clientY, until: performance.now() + 700 };
    try { d.b.click(); } catch (err) { console.warn('tap', err); }
  }, true);
  addEventListener('pointercancel', () => { down = null; }, true);
  // the phone's own click, arriving after: already done, so it's swallowed (a click made by the code above, or by the
  // game itself, isn't "trusted", so it always goes through)
  addEventListener('click', (e) => {
    if (!quiet || !e.isTrusted) return;
    if (performance.now() > quiet.until) { quiet = null; return; }
    // (the same spot as the tap: even if the screen's been redrawn under the finger and it's a new button there now,
    // that's the same tap, not a second one)
    if (Math.hypot(e.clientX - quiet.x, e.clientY - quiet.y) < 24 || target(e.target) === quiet.b) { e.stopImmediatePropagation(); e.preventDefault(); quiet = null; }
  }, true);
})();
