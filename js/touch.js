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
    <button id="btn-zoom" class="tbtn">🔍 ZOOM</button>
    <button id="btn-emote" class="tbtn">😎 EMOTE</button>
    <div id="emote-wheel"><div class="ew-ring"></div><button class="ew-x">✕</button></div>
    <div id="hint"></div>`;
  document.body.appendChild(root);
  // (the emote button's and wheel's look lives here with them, so a page cached from before can't leave them unstyled)
  const st = document.createElement('style'); st.textContent = `#btn-emote { display: none; left: max(36px, calc(env(safe-area-inset-left) + 20px)); bottom: max(256px, calc(env(safe-area-inset-bottom) + 236px)); width: 92px; height: 44px; border-radius: 22px; background: #ff4fa3; color: #fff; font-size: 13px; }
#btn-emote.show { display: block; }
#emote-wheel { display: none; position: absolute; inset: 0; pointer-events: auto; background: radial-gradient(circle at 50% 50%, rgba(10,14,40,0.55) 0, rgba(10,14,40,0.35) 160px, rgba(0,0,0,0) 260px); }
#emote-wheel.open { display: block; animation: ewin .18s ease-out; } @keyframes ewin { from { opacity: 0; transform: scale(0.85); } }
#emote-wheel .ew-ring { position: absolute; left: 50%; top: 50%; width: 0; height: 0; }
#emote-wheel .ew-ring::before { content: ''; position: absolute; left: -150px; top: -150px; width: 300px; height: 300px; border-radius: 50%; border: 4px solid rgba(255,255,255,0.35); background: rgba(20,28,90,0.6); box-shadow: 0 0 30px rgba(255,79,163,0.5); }
#emote-wheel .ew-item { position: absolute; left: 0; top: 0; width: 104px; height: 104px; border-radius: 50%; border: 4px solid #ffd400; background: #1c2c8c; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; cursor: pointer; box-shadow: 0 5px 0 rgba(0,0,0,0.4); }
#emote-wheel .ew-item span { font-size: 40px; line-height: 44px; } #emote-wheel .ew-item b { font: 900 11px "Arial Black", Arial, sans-serif; text-align: center; padding: 0 6px; }
#emote-wheel .ew-item:active { background: #ff4fa3; }
#emote-wheel .ew-tabs { position: fixed; left: 50%; top: max(10px, env(safe-area-inset-top)); transform: translateX(-50%); z-index: 2; display: flex; gap: 8px; white-space: nowrap; }
#emote-wheel .ew-tab { font: 900 13px "Arial Black", Arial, sans-serif; padding: 9px 12px; border-radius: 14px; border: 3px solid #fff; background: rgba(20,28,90,0.85); color: #fff; }
#emote-wheel .ew-tab.on { background: #ffd400; color: #111; }
#emote-wheel .ew-x { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 64px; height: 64px; border-radius: 50%; border: 3px solid #fff; background: rgba(0,0,0,0.6); color: #fff; font: 900 26px Arial; }`; document.head.appendChild(st);
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
  stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick); stick.addEventListener('lostpointercapture', endStick);

  // ---- buttons ----
  const press = (el, fn) => el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); cb.onUserGesture?.(); fn(); el.classList.add('down'); setTimeout(() => el.classList.remove('down'), 150); });
  press(eat, () => cb.onEat());
  press(thr, () => cb.onThrow());
  press(spr, () => showSprint(cb.onSprint()));
  const zm = root.querySelector('#btn-zoom'), showZoom = (on) => { zm.classList.toggle('on', on); zm.textContent = on ? '🔍 ZOOMED' : '🔍 ZOOM'; };
  press(zm, () => showZoom(cb.onZoom()));
  // mouse wheel zooms too (while it's allowed)
  window.addEventListener('wheel', (e) => { if (!root.classList.contains('on') || !zm.classList.contains('show')) return; showZoom(cb.onZoom(e.deltaY < 0)); }, { passive: true });          // tap to switch sprinting on / off (no cooldown)

  // ---- emotes (multiplayer): the button opens a wheel, tap one ----
  const emb = root.querySelector('#btn-emote'), wheel = root.querySelector('#emote-wheel');
  let lists = { def: [], own: () => [], title: () => '' }, page = 'def';
  const openWheel = (on) => { if (on) { page = 'def'; drawWheel(); } wheel.classList.toggle('open', on); };
  press(emb, () => openWheel(!wheel.classList.contains('open')));
  wheel.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation();
    const tab = e.target.closest('.ew-tab'); if (tab) { page = tab.dataset.p; drawWheel(); return; }
    const b = e.target.closest('.ew-item'); if (b) cb.onEmote && cb.onEmote(b.dataset.id); openWheel(false); });
  // two pages: DEFAULT EMOTES and the character's own ("CHLOE'S EMOTES"), picked with the tabs above the wheel
  function drawWheel() {
    let own = []; try { own = lists.own() || []; } catch (e) {} const list = page === 'own' && own.length ? own : lists.def, n = list.length, ring = wheel.querySelector('.ew-ring');
    const R = n > 5 ? 112 : 100;
    ring.innerHTML = (own.length ? `<div class="ew-tabs"><button class="ew-tab${page === 'def' ? ' on' : ''}" data-p="def">DEFAULT EMOTES</button><button class="ew-tab${page === 'own' ? ' on' : ''}" data-p="own">${lists.title()}</button></div>` : '') +
      list.map((em, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n, x = Math.cos(a) * R, y = Math.sin(a) * R;
      return `<button class="ew-item" data-id="${em.id}" style="transform:translate(calc(-50% + ${x.toFixed(0)}px), calc(-50% + ${y.toFixed(0)}px))"><span>${em.icon}</span><b>${em.name}</b></button>`; }).join('');
  }
  const setEmotes = (list, own = () => [], title = () => '') => { lists = { def: list, own, title }; };      // (drawn when the wheel opens)

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
    else if (e.code === 'KeyZ' && zm.classList.contains('show')) showZoom(cb.onZoom());
    else if (e.code === 'KeyG' && emb.classList.contains('show')) openWheel(!wheel.classList.contains('open'));
    else if (/^Digit[1-9]$/.test(e.code) && wheel.classList.contains('open')) { const b = wheel.querySelectorAll('.ew-item')[+e.code.slice(5) - 1]; if (b) { cb.onEmote && cb.onEmote(b.dataset.id); openWheel(false); } }
    else if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyR') && !e.repeat) showSprint(cb.onSprint());
    keys.add(e.code); updKeys();
  });
  window.addEventListener('keyup', (e) => { keys.delete(e.code); updKeys(); });

  return {
    show(on) { root.classList.toggle('on', on); },
    busy(on) { if (root.classList.contains('busy') !== on) { root.classList.toggle('busy', on); if (stickId !== null) { stickId = null; setKnob(0, 0); } } },      // (let go of the stick when they hide or come back)
    setSprint: showSprint,
    setZoomAvailable(on, zoomed) { zm.classList.toggle('show', on); showZoom(on && zoomed); },
    setEatLabel(txt, enabled) { eat.textContent = txt; eat.classList.toggle('off', !enabled); },
    setEmotes, setEmoteAvailable(on) { if (emb.classList.contains('show') !== on) emb.classList.toggle('show', on); if (!on) openWheel(false); },
    setThrowEnabled(on) { thr.classList.toggle('off', !on); },
    hint(txt) { hint.textContent = txt; hint.classList.add('on'); clearTimeout(hint._t); hint._t = setTimeout(() => hint.classList.remove('on'), 2200); },
  };
}
