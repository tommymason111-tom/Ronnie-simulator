// RONNIE SIMULATOR — the start screen: a few animated screens you tap through.
//   TITLE   bouncing logo, tap Ronnie (he chomps and talks), catch the falling food
//   PLACE   swipe through the places, each with its own little animated scene
//   MODE    mode cards that flip over for the details (locked ones say why)
//   READY   your picks, then a 3-2-1 chomp countdown and LET'S EAT
//   SQUAD   meet everyone: their colour, their attack, tap for a line
//   HOW     how to play, headset or phone
// Hands the choice to the game as window.ronnieMenu (a Promise of { place, mode }),
// exactly like before; ?place=&mode=&go=1 still skips straight in.
(function () {
  const PLACES = [
    { id: 'pub', ico: '🍺', name: 'THE OYSTERFLEET', desc: "Ronnie's local and his work. The whole squad fits in.", bg: 'linear-gradient(160deg,#5a1a24,#2a1208)', props: ['🍺', '🎯', '📺', '🍟', '🎰'] },
    { id: 'garden', ico: '🏡', name: "LEWIS'S HOUSE", desc: 'A sunny back garden. Ian is on the barbecue. Lewy is fetching plates.', bg: 'linear-gradient(160deg,#4aa8f0,#5a9a36)', props: ['🍔', '🌭', '🍗', '⚽', '🌻'] },
    { id: 'shop', ico: '🛒', name: 'LIDL', desc: 'Aisles, the middle aisle, the bakery and a wall of MONSTOR.', bg: 'linear-gradient(160deg,#1e4ea8,#ffd400)', props: ['🛒', '🥐', '🥫', '🍩', '🧺'] },
    { id: 'restaurant', ico: '🕯️', name: 'LA GRANDE PORTION', desc: 'Fancy dinner. Date night with Chloe (and the lads at the other tables).', bg: 'linear-gradient(160deg,#5a0f18,#1a0508)', props: ['🕯️', '🍷', '🦞', '🍰', '🎹'] },
    { id: 'bedroom', ico: '🛏️', name: "RONNIE'S BEDROOM", desc: 'Where it all begins. Small, cosy, full of cans.', bg: 'linear-gradient(160deg,#3a2a6a,#1f4fbf)', props: ['🛏️', '🥫', '🎮', '🍕', '🥫'] },
  ];
  const MODES = [
    { id: 'everyone', ico: '👥', name: 'THE WHOLE SQUAD', desc: 'The main game. Everyone is here, taking turns to attack you while you eat. A countdown shows the next one.', stars: 3, who: 'Everyone' },
    { id: 'sweep', ico: '🛒', name: 'SUPERMARKET SWEEP', desc: '90 seconds and a trolley in Lidl. Grab everything you can. Oliver is on security.', stars: 2, who: 'Oliver', place: 'shop' },
    { id: 'bbq', ico: '🍖', name: "IAN'S BARBECUE", desc: "Round Lewis's house. Grab the food off the grill before Ian makes it healthy and throws it at you.", stars: 2, who: 'Ian, Lewis + the lads', place: 'garden' },
    { id: 'date', ico: '💜', name: 'DATE NIGHT', desc: "Eat when Chloe looks away. Three catches and it's salad.", stars: 2, who: 'Chloe + the lads', place: 'restaurant' },
    { id: 'eatoff', ico: '⏱️', name: 'EAT-OFF', desc: '60 seconds. Eat everything. On your own, or pass-and-play: who eats more?', stars: 1, who: '1 or 2 players' },
    { id: 'roam', ico: '🚶', name: 'FREE ROAM', desc: 'Have a look round and explore. Everyone is here, but nobody attacks you. No timer.', stars: 0, who: 'Everyone (no attacks)' },
  ];
  // each place has its own games: Lidl is Supermarket Sweep, Lewis's is Ian's barbecue,
  // La Grande Portion is date night; the pub and the bedroom have the squad and the eat-off
  const PLACE_MODES = { pub: ['everyone', 'eatoff', 'roam'], bedroom: ['everyone', 'eatoff', 'roam'], shop: ['sweep', 'roam'], garden: ['bbq', 'roam'], restaurant: ['date', 'roam'] };
  const GAME_IDS = ['everyone', 'sweep', 'bbq', 'date', 'chonkoff', 'chonkoff2', 'roam'];
  const cardOf = (id) => id === 'chonkoff' || id === 'chonkoff2' ? 'eatoff' : id;      // the eat-off card covers 1P and 2P
  const modeInfo = (id) => { const m = MODES.find(x => x.id === cardOf(id)); return id === 'chonkoff' ? { ...m, ico: '⏱️', name: 'EAT-OFF · 1 PLAYER' } : id === 'chonkoff2' ? { ...m, ico: '🆚', name: 'EAT-OFF · 2 PLAYERS' } : m; };
  const gameChoices = (p) => PLACE_MODES[p].flatMap(c => c === 'eatoff' ? ['chonkoff', 'chonkoff2'] : [c]);
  const SQUAD = [
    { n: 'Tommy', c: '#f0c040', a: '🦶', t: 'Trips you up', l: "I've been alive a WHOLE day longer than you, Ronnie." },
    { n: 'Chloe', c: '#c2185b', a: '🥗', t: 'Puts you on a diet', l: 'I made you a salad. You looked at it like it owed you money.' },
    { n: 'Lewis', c: '#d32f2f', a: '⚽', t: 'SIUUU like Ronaldo', l: 'Leg day, Ron? Every day\'s leg day for you, bro.' },
    { n: 'Harry', c: '#7a1f3d', a: '💘', t: 'His dating history', l: 'My longest relationship was eleven days. Twelve if you count the day she was telling everyone.' },
    { n: 'Aidan', c: '#2e7d32', a: '🍺', t: 'One more beer', l: 'Just the one, Ronnie. That\'s what I said in 2016 and I\'m still out.' },
    { n: 'Noah', c: '#1565c0', a: '🏉', t: 'The tackle', l: "I've tackled props, I've tackled locks, I've never tackled a man with his own moon." },
    { n: 'Oliver', c: '#ff9800', a: '📸', t: 'Camera flash', l: 'Like, comment and subscribe, and pray for the bakery section.' },
    { n: 'Dylan', c: '#6a1b9a', a: '🎸', t: 'Plays you Oasis', l: 'Second album\'s the best, Ronnie, don\'t even start. DON\'T. START.' },
    { n: 'Connor', c: '#c8102e', a: '☘️', t: 'Irish jig attack', l: "You'll never walk alone, Ronnie. Mostly because you can't fit through doors on your own." },
    { n: 'Ethan', c: '#febe10', a: '🥤', t: 'Pepsi Max attack', l: 'My nose can smell a pasty from three postcodes away, Ron.' },
    { n: 'Ian', c: '#6b8e23', a: '🎣', t: 'Healthy BBQ / fishing rod', l: 'Canvey Lake, Ronnie. Disgrace. I pulled out a whole sofa once. Nice sofa, actually.' },
    { n: 'Alfie', c: '#034694', a: '🌀', t: 'The nutmeg', l: 'I started a back piece once. It\'s just a dragon\'s tail now. On its own.' },
    { n: 'Aidan W', img: 'aidanw', c: '#132257', a: '🦵', t: 'Tells you about his knee', l: 'Spurs, Miles Morales and trading cards. And the knee. Mostly the knee.' },
    { n: 'Ben', c: '#2f6fd6', a: '✈️', t: 'Takes you to Turkey', l: 'Got my hairline done in Turkey, Ron. Let me take you.' },
  ];
  const RONNIE_LINES = ['Pass us that burger.', 'Mmm. MMMM.', 'Is there any more?', 'Go on then. One more.', 'Is that a burger?', 'One more. Just one.', "I'm not hungry. I'm BORED.", 'UNLEASH THE MONSTOR!', 'Who ate my pie? ...oh. Me.', 'Five a day? FIVE A DAY.', 'Chelsea, pies and MONSTOR.'];
  const ok = (m, p) => PLACE_MODES[p].includes(m.id);
  const PLACE_NAME = { restaurant: 'La Grande Portion', shop: 'Lidl', garden: "Lewis's House", pub: 'the Oysterfleet', bedroom: "Ronnie's bedroom" };

  const q = new URLSearchParams(location.search);
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('rs_menu') || '{}'); } catch (e) {}
  // always start at the Oysterfleet; only ?go=1 quick-starts use the address's place/mode
  const quick = !!q.get('go');
  let place = (quick && q.get('place')) || 'pub', mode = (quick && q.get('mode')) || 'everyone';
  if (!PLACES.some(p => p.id === place)) place = 'pub';
  if (!GAME_IDS.includes(mode)) mode = 'everyone';      // old links to Classic / Squad Intervention / Catch
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const start = $('#start');

  // ---------------------------------------------------------------- little sounds + buzz
  let ac = null;
  function blip(f = 660, d = 0.08, type = 'square', vol = 0.06) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, ac.currentTime); o.frequency.exponentialRampToValueAtTime(f * 1.5, ac.currentTime + d);
      g.gain.setValueAtTime(vol, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d + 0.05);
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d + 0.06);
    } catch (e) {}
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }
  const chompSfx = () => { blip(180, 0.07, 'sawtooth', 0.08); setTimeout(() => blip(140, 0.06, 'sawtooth', 0.07), 90); };

  // ---------------------------------------------------------------- screens
  let current = 'title';
  function show(id, dir = 1) {
    if (id === 'mode' && PLACE_MODES[place].length === 1) { mode = gameChoices(place)[0]; id = dir > 0 ? 'ready' : 'place'; }   // only one game here
    const from = $(`.screen[data-s="${current}"]`), to = $(`.screen[data-s="${id}"]`);
    if (!to || id === current) return;
    from.classList.remove('on'); from.classList.add(dir > 0 ? 'out-left' : 'out-right');
    to.classList.remove('out-left', 'out-right'); to.classList.add(dir > 0 ? 'in-right' : 'in-left');
    void to.offsetWidth; to.classList.add('on'); to.classList.remove('in-right', 'in-left');
    setTimeout(() => from.classList.remove('out-left', 'out-right'), 450);
    current = id; start.scrollTop = 0;
    if (window.ronnieHero) { if (id === 'title') window.ronnieHero.resume(); else window.ronnieHero.pause(); }   // only draw him when he's on screen
    $$('.dots i').forEach((d, i) => d.classList.toggle('on', ['place', 'mode', 'ready'].indexOf(id) === i));
    $('.dots').classList.toggle('hide', !['place', 'mode', 'ready'].includes(id));
    if (id === 'mode') drawModes();
    if (id === 'ready') drawReady();
    blip(520, 0.06);
  }
  start.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    show(b.dataset.go, b.dataset.back ? -1 : 1);
  });

  // ---------------------------------------------------------------- TITLE: bouncing letters, Ronnie, catch-the-food
  $$('.bounce').forEach(el => { el.innerHTML = [...el.textContent].map((ch, i) => ch === ' ' ? ' ' : `<span style="animation-delay:${i * 0.07}s">${ch}</span>`).join(''); });
  const hero = $('#hero'), say = $('#ronnie-says');
  let sayT = 0;
  const ronnieSay = () => {
    say.textContent = RONNIE_LINES[Math.floor(Math.random() * RONNIE_LINES.length)]; say.classList.add('on');
    clearTimeout(sayT); sayT = setTimeout(() => say.classList.remove('on'), 2200);
    blip(300 + Math.random() * 120, 0.08, 'triangle', 0.07);
    if (window.ronnieHero) window.ronnieHero.talk(1.6);
    return say.textContent;
  };
  window.ronnieSay = ronnieSay;
  // the loading screen goes once 3D Ronnie is ready (or after 12s, or straight away when skipping the menu)
  const boot = $('#boot');
  window.bootDone = () => { if (boot && !boot.classList.contains('done')) { boot.classList.add('done'); setTimeout(() => boot.remove(), 400); } };
  setTimeout(window.bootDone, 12000);
  // the 3D Ronnie never turned up (no WebGL, three.js didn't load)? show the drawing instead
  setTimeout(() => { const hb = $('.herobox'); if (hb && !hb.classList.contains('three')) hb.classList.add('nothree'); }, 15000);
  window.menuSfx = (n) => { if (n === 'chomp') chompSfx(); else if (n === 'gulp') blip(160, 0.18, 'sine', 0.09); else if (n === 'pop') blip(620, 0.06); };
  window.menuNom = () => { const r = $('.herobox').getBoundingClientRect(); pop(r.left + r.width / 2, r.top + r.height * 0.55, ['NOM!', 'MUNCH!', 'GULP!', 'YUM!'][Math.floor(Math.random() * 4)], '#ffd400'); };
  hero.addEventListener('click', () => {          // the drawing (fallback)
    hero.classList.remove('gobble'); void hero.getBoundingClientRect(); hero.classList.add('gobble');
    chompSfx(); crumbs(hero); ronnieSay();
  });
  function crumbs(el) {
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
      const c = document.createElement('i'); c.className = 'crumb';
      c.style.left = (r.left + r.width * 0.55) + 'px'; c.style.top = (r.top + r.height * 0.62) + 'px';
      c.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px'); c.style.setProperty('--dy', (Math.random() * -120 - 20) + 'px');
      c.style.background = ['#e0a04a', '#5a2e14', '#4caf3c', '#ffc21a'][i % 4];
      document.body.appendChild(c); setTimeout(() => c.remove(), 700);
    }
  }
  // raining food you can catch (tap it): a little score in the corner
  const rain = $('#rain'), FOOD = ['🍔', '🍕', '🍩', '🌭', '🍟', '🥤', '🍗', '🌮', '🍰', '🥦'];
  let caught = 0, best = 0; try { best = +localStorage.getItem('rs_snackbest') || 0; } catch (e) {}
  const drawScore = () => {};
  function drop() {
    if (start.classList.contains('gone')) return;
    const s = document.createElement('span'), f = FOOD[Math.floor(Math.random() * FOOD.length)];
    s.textContent = f; s.style.left = (4 + Math.random() * 88) + '%';
    const dur = 5 + Math.random() * 5; s.style.animationDuration = dur + 's';
    s.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (f === '🥦') { caught = Math.max(0, caught - 3); pop(e.clientX, e.clientY, 'BLEURGH -3', '#7cff6a'); blip(110, 0.2, 'sawtooth', 0.06); }
      else { caught++; pop(e.clientX, e.clientY, '+1 NOM', '#ffd400'); chompSfx(); if (caught > best) { best = caught; try { localStorage.setItem('rs_snackbest', best); } catch (er) {} } }
      drawScore();
      s.remove();
    });
    rain.appendChild(s); setTimeout(() => s.remove(), dur * 1000);
  }
  for (let i = 0; i < 6; i++) setTimeout(drop, i * 400);
  setInterval(drop, 900);
  function pop(x, y, txt, color) { const p = document.createElement('b'); p.className = 'popword'; p.textContent = txt; p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.color = color; document.body.appendChild(p); setTimeout(() => p.remove(), 900); }

  // ---------------------------------------------------------------- PLACE: a swipeable carousel of little scenes
  const track = $('#place-track');
  track.innerHTML = PLACES.map(p => `
    <div class="scene" data-id="${p.id}" style="background:${p.bg}">
      <div class="props">${p.props.map((e, i) => `<span style="--i:${i}">${e}</span>`).join('')}</div>
      <div class="big">${p.ico}</div>
      <h3>${p.name}</h3><p>${p.desc}</p>
      <div class="tick">✓ PICKED</div>
    </div>`).join('');
  let pi = Math.max(0, PLACES.findIndex(p => p.id === place));
  function drawPlace() {
    place = PLACES[pi].id;
    $$('.scene', track).forEach((el, i) => { el.classList.toggle('cur', i === pi); el.style.transform = `translateX(${(i - pi) * 104}%) scale(${i === pi ? 1 : 0.86}) rotate(${(i - pi) * 3}deg)`; el.style.opacity = Math.abs(i - pi) > 1 ? 0 : i === pi ? 1 : 0.5; });
    $$('#place-dots i').forEach((d, i) => d.classList.toggle('on', i === pi));
    if (!gameChoices(place).includes(mode)) mode = gameChoices(place)[0];
  }
  const stepPlace = (d) => { pi = (pi + d + PLACES.length) % PLACES.length; drawPlace(); blip(440 + pi * 60, 0.05); };
  $('#place-prev').addEventListener('click', () => stepPlace(-1));
  $('#place-next').addEventListener('click', () => stepPlace(1));
  $('#place-dots').innerHTML = PLACES.map(() => '<i></i>').join('');
  $$('#place-dots i').forEach((d, i) => d.addEventListener('click', () => { pi = i; drawPlace(); blip(500, 0.05); }));
  track.addEventListener('click', (e) => { const s = e.target.closest('.scene'); if (!s) return; const i = PLACES.findIndex(p => p.id === s.dataset.id); if (i !== pi) { pi = i; drawPlace(); blip(500, 0.05); } else { s.classList.remove('wiggle'); void s.offsetWidth; s.classList.add('wiggle'); blip(700, 0.06); } });
  // swipe
  let sx = null;
  track.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  track.addEventListener('pointerup', (e) => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) stepPlace(dx < 0 ? 1 : -1); });
  // a gentle 3D tilt that follows your finger / mouse
  track.addEventListener('pointermove', (e) => {
    const cur = $('.scene.cur', track); if (!cur) return; const r = cur.getBoundingClientRect();
    const tx = ((e.clientY - r.top) / r.height - 0.5) * -10, ty = ((e.clientX - r.left) / r.width - 0.5) * 12;
    cur.style.transform = `perspective(700px) rotateX(${tx}deg) rotateY(${ty}deg) scale(1.02)`;
  });
  track.addEventListener('pointerleave', drawPlace);
  drawPlace();

  // ---------------------------------------------------------------- MODE: flip cards
  const grid = $('#mode-grid');
  function drawModes() {
    const pp = (m) => m.id !== 'eatoff' ? '' : `<div class="pp">${[1, 2].map(n => `<button data-pp="${n}" class="${cardOf(mode) === 'eatoff' && (mode === 'chonkoff2') === (n === 2) ? 'on' : ''}">${n === 1 ? '👤 1 PLAYER' : '👥 2 PLAYERS'}</button>`).join('')}</div>`;
    grid.innerHTML = MODES.filter(m => ok(m, place)).map((m, i) => {
      const sel = m.id === cardOf(mode);
      return `<div class="flip${sel ? ' sel' : ''}" data-id="${m.id}" style="animation-delay:${i * 0.05}s">
        <div class="face front"><span class="ico">${m.ico}</span><b>${m.name}</b>${pp(m) || '<small>tap for details</small>'}</div>
        <div class="face back"><b>${m.name}</b><p>${m.desc}</p><div class="meta"><span>${'🌶️'.repeat(m.stars)}</span><span>👤 ${m.who}</span></div>${pp(m)}<div class="pickit">${sel ? '✓ PICKED' : 'TAP TO PICK'}</div></div>
      </div>`;
    }).join('');
  }
  grid.addEventListener('click', (e) => {
    const c = e.target.closest('.flip'); if (!c) return;
    const m = MODES.find(m => m.id === c.dataset.id);
    const ppb = e.target.closest('[data-pp]');
    if (ppb) {                 // 1 or 2 players: picks the eat-off straight away
      const was = c.classList.contains('flipped');
      mode = ppb.dataset.pp === '2' ? 'chonkoff2' : 'chonkoff'; blip(ppb.dataset.pp === '2' ? 990 : 880, 0.08); drawModes();
      const nc = $(`.flip[data-id="eatoff"]`, grid); nc.classList.add('chosen'); if (was) nc.classList.add('flipped');
      return;
    }
    if (!c.classList.contains('flipped')) { $$('.flip.flipped', grid).forEach(f => f !== c && f.classList.remove('flipped')); c.classList.add('flipped'); blip(600, 0.05); return; }
    mode = m.id === 'eatoff' ? (mode === 'chonkoff2' ? 'chonkoff2' : 'chonkoff') : m.id; blip(880, 0.08); drawModes(); $(`.flip[data-id="${m.id}"]`, grid).classList.add('flipped', 'chosen');
  });

  // ---------------------------------------------------------------- READY: summary and the countdown
  function drawReady() {
    const p = PLACES.find(x => x.id === place), m = modeInfo(mode);
    $('#ready-place').innerHTML = `<span class="lbl">📍 PLACE</span><span>${p.ico}</span><b>${p.name}</b>`;
    $('#ready-mode').innerHTML = `<span class="lbl">🎮 GAME MODE</span><span>${m.ico}</span><b>${m.name}</b>`;
    $('#ready-desc').textContent = m.desc;
  }

  // ---------------------------------------------------------------- SQUAD: meet everyone
  const roster = $('#roster');
  roster.innerHTML = SQUAD.map((s, i) => `
    <div class="mate" data-i="${i}" style="--c:${s.c};animation-delay:${i * 0.04}s">
      <div class="face-badge"><img src="./assets/portraits/${s.img || s.n.toLowerCase()}.webp" alt="${s.n}" loading="lazy" draggable="false"></div><b>${s.n}</b>
      <div class="atk">${s.a} ${s.t}</div>
    </div>`).join('');
  const quote = $('#mate-quote');
  roster.addEventListener('click', (e) => {
    const c = e.target.closest('.mate'); if (!c) return;
    const s = SQUAD[+c.dataset.i];
    $$('.mate', roster).forEach(m => m.classList.toggle('talk', m === c));
    quote.innerHTML = `<b style="color:${s.c}">${s.n}:</b> "${s.l}"<br><span>${s.a} Attack: ${s.t}</span>`;
    quote.classList.remove('on'); void quote.offsetWidth; quote.classList.add('on');
    blip(300 + (+c.dataset.i) * 40, 0.07, 'triangle', 0.08);
  });

  // ---------------------------------------------------------------- HOW: tabs (opens on your device's tab)
  const pickTab = (id) => {
    $$('.tabs button').forEach(x => x.classList.toggle('on', x.dataset.p === id));
    $$('.howpane').forEach(p => p.classList.toggle('on', p.dataset.p === id));
  };
  $$('.tabs button').forEach(b => b.addEventListener('click', () => { pickTab(b.dataset.p); blip(560, 0.05); }));
  const touchy = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
  pickTab(touchy ? 'flat' : 'pc');
  try { if (navigator.xr && navigator.xr.isSessionSupported) navigator.xr.isSessionSupported('immersive-vr').then(v => { if (v) pickTab('vr'); }).catch(() => {}); } catch (e) {}

  // ---------------------------------------------------------------- start the game
  window.ronnieMenu = new Promise((resolve) => {
    let going = false;
    const go = (instant) => {
      if (going) return; going = true;
      try { localStorage.setItem('rs_menu', JSON.stringify({ place, mode })); } catch (e) {}
      const finish = () => {
        start.classList.add('gone');
        if (window.ronnieHero) window.ronnieHero.stop();
        document.body.classList.add('ready');
        const p = PLACES.find(p => p.id === place), m = modeInfo(mode);
        const tag = document.getElementById('ready-tag'); if (tag) tag.textContent = `${p.name} · ${m.name}`;
        resolve({ place, mode });
      };
      if (instant !== true) chompSfx();
      finish();
    };
    $('#go').addEventListener('click', () => go());
    // the floating menu in VR (see ronnieHero.js) picks with these
    window.menuVR = {
      info: () => ({ place: PLACES.find(p => p.id === place).name, mode: modeInfo(mode).name }),
      step(kind, d) {
        if (kind === 'place') { stepPlace(d); drawModes(); return; }
        const list = gameChoices(place); const i = list.indexOf(mode);
        mode = list[(i + d + list.length) % list.length]; blip(880, 0.08); drawModes();
      },
      play: () => go(),
    };
    // see him in VR before you play
    const tvr = $('#title-vr');
    if (tvr) {
      tvr.addEventListener('click', () => {
        const h = window.ronnieHero;
        if (!h || !h.enterVR) { tvr.textContent = 'LOADING RONNIE…'; return; }
        h.enterVR().catch(err => { tvr.textContent = 'VR FAILED: ' + err.message; });
      });
    }
    if (q.get('go')) { window.bootDone(); go(true); }
    // coming back from a level ("Change place or mode"): jump straight to picking
    // otherwise always open on the title screen, and tidy the address bar
    else if (location.search) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
  });
  const back = () => { location.href = location.pathname; };   // back to the title screen
  document.getElementById('back-menu').addEventListener('click', back);
  // keyboard: arrows on the place screen, Enter to go on
  document.addEventListener('keydown', (e) => {
    if (start.classList.contains('gone')) return;
    if (current === 'place' && e.key === 'ArrowRight') stepPlace(1);
    if (current === 'place' && e.key === 'ArrowLeft') stepPlace(-1);
    if (e.key === 'Enter') { const nxt = { title: 'place', place: 'mode', mode: 'ready' }[current]; if (nxt) show(nxt); else if (current === 'ready') $('#go').click(); }
  });
})();
