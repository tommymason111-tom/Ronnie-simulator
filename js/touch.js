// On-screen controls for phones and tablets (and keyboard + mouse on desktop).
//   Left thumb:  virtual joystick to walk.
//   Right thumb: drag anywhere to look around.
//   Tap:         grab food / swat broccoli / slap Tommy.
//   Buttons:     EAT (or DRINK) and THROW.
export function setupTouch(cb) {
  const root = document.createElement('div');
  root.id = 'touch';
  root.innerHTML = `
    <div id="stick"><div id="knob"></div></div>
    <button id="btn-eat" class="tbtn">EAT</button>
    <button id="btn-throw" class="tbtn">THROW</button>
    <button id="btn-sprint" class="tbtn">🏃 SPRINT</button>
    <div id="hint"></div>`;
  document.body.appendChild(root);
  const stick = root.querySelector('#stick'), knob = root.querySelector('#knob');
  const eat = root.querySelector('#btn-eat'), thr = root.querySelector('#btn-throw'), hint = root.querySelector('#hint'), spr = root.querySelector('#btn-sprint');
  const showSprint = (on) => { spr.classList.toggle('on', on); spr.textContent = on ? '🏃 SPRINTING' : '🏃 SPRINT'; };

  // ---- joystick ----
  let stickId = null, sx = 0, sy = 0;
  const R = 55;
  const setKnob = (x, y) => { knob.style.transform = `translate(${x}px, ${y}px)`; cb.onMove(x / R, y / R); };
  stick.addEventListener('pointerdown', (e) => {
    e.preventDefault(); cb.onUserGesture?.();
    stickId = e.pointerId; try { stick.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
    const r = stick.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2;
    moveStick(e);
  });
  const moveStick = (e) => {
    if (e.pointerId !== stickId) return;
    let x = e.clientX - sx, y = e.clientY - sy;
    const d = Math.hypot(x, y); if (d > R) { x *= R / d; y *= R / d; }
    setKnob(x, y);
  };
  stick.addEventListener('pointermove', moveStick);
  const endStick = (e) => { if (e.pointerId === stickId) { stickId = null; setKnob(0, 0); } };
  stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);

  // ---- buttons ----
  const press = (el, fn) => el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); cb.onUserGesture?.(); fn(); el.classList.add('down'); setTimeout(() => el.classList.remove('down'), 150); });
  press(eat, () => cb.onEat());
  press(thr, () => cb.onThrow());
  press(spr, () => showSprint(cb.onSprint()));          // tap to switch sprinting on / off (no cooldown)

  // ---- look + tap on the 3D view ----
  const canvas = cb.canvas;
  const looks = new Map();
  canvas.addEventListener('pointerdown', (e) => {
    cb.onUserGesture?.();
    looks.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: 0, t: performance.now() });
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    const l = looks.get(e.pointerId); if (!l) return;
    const dx = e.clientX - l.x, dy = e.clientY - l.y; l.x = e.clientX; l.y = e.clientY;
    l.moved += Math.abs(dx) + Math.abs(dy);
    const k = e.pointerType === 'mouse' ? 0.004 : 0.006;
    cb.onLook(dx * k, dy * k);
  });
  const endLook = (e) => {
    const l = looks.get(e.pointerId); if (!l) return;
    looks.delete(e.pointerId);
    if (l.moved < 12 && performance.now() - l.t < 500) cb.onTap(e.clientX, e.clientY);
  };
  canvas.addEventListener('pointerup', endLook); canvas.addEventListener('pointercancel', (e) => looks.delete(e.pointerId));

  // ---- keyboard (desktop) ----
  const keys = new Set();
  const updKeys = () => {
    const x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const z = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    if (stickId === null) cb.onMove(x, z);
  };
  window.addEventListener('keydown', (e) => {
    if (!root.classList.contains('on')) return;
    if (e.code === 'KeyE') cb.onEat();
    else if (e.code === 'Space' || e.code === 'KeyF') { e.preventDefault(); cb.onThrow(); }
    else if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyR') && !e.repeat) showSprint(cb.onSprint());
    keys.add(e.code); updKeys();
  });
  window.addEventListener('keyup', (e) => { keys.delete(e.code); updKeys(); });

  return {
    show(on) { root.classList.toggle('on', on); },
    setSprint: showSprint,
    setEatLabel(txt, enabled) { eat.textContent = txt; eat.classList.toggle('off', !enabled); },
    setThrowEnabled(on) { thr.classList.toggle('off', !on); },
    hint(txt) { hint.textContent = txt; hint.classList.add('on'); clearTimeout(hint._t); hint._t = setTimeout(() => hint.classList.remove('on'), 2200); },
  };
}
