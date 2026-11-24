// DATE NIGHT's film camera (datenight.js cineCam / SHOTS), on a phone held upright first, then a computer, then a Quest.
// Every film is played through (a bot wins it) and every shot is checked as it's drawn:
//   - the camera isn't inside a wall or the furniture (the room's colliders and footprints) or inside anyone;
//   - the heads the shot is about are on screen, between the film's bars (and above a game), with a margin;
//   - nobody's shot from below: the camera's above a sat person's waist and never looks steeply up at a head;
//   - a shot of someone's face is at their eye level, from in front of them, with nobody stood across the line
//     (the foyer shot of Ronnie used to be from knee height, looking up past Chloe's backside).
// Quest: no film camera (your own eyes), and the loo raid's move is a blink to black and back.
// Also: Date Night is the STORY MODE on the menu (and fits a phone), and no power-ups turn up in it.
// (FILMS=open:arrive,toilet:loo picks films; SIZES=portrait,desk,quest; SHOTS=dir saves a picture of every shot)
import fs from 'fs';
import { launch, newPage, startGame, checker, sleep } from './lib/game.mjs';

const ALL = ['open:arrive', 'look:phone', 'look:waiter', 'look:board', 'look:propose', 'look:lobster', 'look:foodpic', 'look:ex', 'look:mum',
  'waiter:order', 'waiter:trolley', 'waiter:napkin', 'waiter:wine', 'waiter:chef', 'toilet:loo', 'toilet:lipstick', 'toilet:queue',
  'visit:harry', 'visit:oliver', 'visit:pints', 'visit:dylan', 'visit:ethan', 'visit:lewis', 'visit:aidanw', 'visit:noah', 'visit:alfie', 'visit:ian',
  'event:birthday', 'event:fire', 'event:power', 'event:noproposal', 'busted:table', 'busted:hamster', 'bill:'];
const FILMS = process.env.FILMS ? process.env.FILMS.split(',') : ALL;
const SIZES = (process.env.SIZES || 'portrait,desk,quest,menu').split(',');
const SIZE = { portrait: [390, 844, true], desk: [1280, 720, false] };
const SHOTS = process.env.SHOTS || '';
const BOT = fs.readFileSync(new URL('./datenight.test.mjs', import.meta.url), 'utf8').match(/const BOT = `([\s\S]*?)`;/)[1];

// (runs in the page) the checks on the shot being drawn right now: a list of what's wrong
const LOOK = `window.__camCheck = function () {
  const N = RS.director.date, T = RS.THREE, C = N.cineCam(); if (!C) return null;
  C.updateMatrixWorld(true); const p = C.position, info = N.camInfo || {}, out = [], v = N.viewK, room = RS.room;
  for (const c of room.colliders || []) if (p.x > c.min.x && p.x < c.max.x && p.y > c.min.y && p.y < c.max.y && p.z > c.min.z && p.z < c.max.z) out.push('inside a wall / furniture ' + [c.min.x, c.max.x, c.min.z, c.max.z].map(x => x.toFixed(1)));
  for (const b of room.blockers || []) if (p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1 && p.y < (b.y1 ?? 2)) out.push('inside furniture ' + [b.x0, b.x1, b.z0, b.z1].map(x => (+x).toFixed(1)));
  const people = [...RS.cast, N.ron].filter(c => c && c.rag && c.rag.mesh && c.rag.group && c.rag.group.visible && !c.dnHidden);
  for (const c of people) { const h = c.headPos(new T.Vector3()); if (Math.hypot(h.x - p.x, h.z - p.z) < 0.22 && p.y < h.y + 0.2) out.push('inside ' + c.id); }
  if (p.y < 0.9) out.push('below waist height (' + p.y.toFixed(2) + 'm)');
  const W = innerWidth, H = innerHeight, top = v ? v.top : 0, bot = v ? v.bot : H;
  for (const h of info.keep || []) {
    for (const dy of [0.13, -0.1]) { const q = h.clone(); q.y += dy; q.project(C); const x = (q.x + 1) / 2 * W, y = (1 - q.y) / 2 * H;
      if (q.z > 1 || x < W * 0.02 || x > W * 0.98 || y < top - 2 || y > bot + 2) out.push('a head out of frame (' + Math.round(x) + ',' + Math.round(y) + ' of ' + W + 'x' + H + ', shown ' + Math.round(top) + '-' + Math.round(bot) + ')'); }
    const up = (h.y - p.y) / Math.max(0.05, Math.hypot(h.x - p.x, h.z - p.z)); if (up > 0.27) out.push('looking up at a head (' + (Math.atan(up) * 57.3).toFixed(0) + ' deg)');
  }
  const f = info.face;
  if (f && f.rag && f.rag.mesh) {
    const h = f.headPos(new T.Vector3()), fw = new T.Vector3(Math.sin(f.rag.yaw), 0, Math.cos(f.rag.yaw)), to = p.clone().sub(h).setY(0), d = to.length();
    if (p.y < h.y - 0.3 || p.y > h.y + 0.4) out.push('not at ' + f.id + "'s eye level (camera " + p.y.toFixed(2) + ', eyes ' + h.y.toFixed(2) + ')');
    if (to.dot(fw) < 0.3 * d) out.push('behind ' + f.id + ' (a face shot)');
    for (const c of people) { if (c === f || (info.name === 'overR' && c === N.ron)) continue; const q = c.headPos(new T.Vector3()), dx = h.x - p.x, dz = h.z - p.z, L2 = dx * dx + dz * dz, s = ((q.x - p.x) * dx + (q.z - p.z) * dz) / L2;
      if (s > 0.05 && s < 0.9 && Math.abs((q.x - p.x) * dz - (q.z - p.z) * dx) / Math.sqrt(L2) < 0.22) out.push(c.id + ' stood in the way of ' + f.id + "'s face"); }
  }
  return { name: info.name, pos: [p.x, p.y, p.z].map(x => +x.toFixed(2)), probs: out };
};`;

async function playAll(C, p, tag, films, seen) {
  const bad = new Map();
  for (const film of films) {
    await p.evaluate((film) => { const D = RS.director, N = D.date, [k, v] = film.split(':'); D.timeLeft = 999; N.catches = 0; N.cool = 0; N.probation = 0; window.__t = 0; window.__last = null;
      if (k === 'bill') { N.nextT = 99; D.timeLeft = 15.5; RS.sim(0.2, 1 / 20); } else N.trigger(k, v || undefined); }, film);
    let i = 0;
    for (;;) {
      // (on to the next moment worth a look: each shot 0.6s in, then every 1.2s while it runs)
      const r = await p.evaluate(() => { const N = RS.director.date; if (!N) return { done: true };
        while (N.state === 'scene' && window.__t < 160) { window.__dnBot(N, 'win'); RS.sim(1 / 20, 1 / 20); window.__t += 1 / 20; const c = N.cam;
          if (c && c.name !== 'return' && c.name !== 'pov' && c.t >= 0.6 && (c !== window.__last || c.t - window.__lastT >= 1.2)) { window.__last = c; window.__lastT = c.t; return { shot: c.name, t: c.t, chk: window.__camCheck() }; } }
        return { done: true }; });
      if (r.done) break;
      seen.add(r.shot);
      if (r.chk) for (const pr of r.chk.probs) { const k = `${film} ${r.shot}: ${pr.replace(/\(.*\)/, '')}`; if (!bad.has(k)) { bad.set(k, `${tag} ${film} ${r.shot} @${r.t.toFixed(1)}s cam ${r.chk.pos}: ${pr}`); console.log('  ' + bad.get(k)); } }
      if (SHOTS) { await p.evaluate(() => { const N = RS.director.date, cam = N.cineCam(); RS.renderer.render(RS.scene, cam || RS.player.camera); }); await p.screenshot({ path: `${SHOTS}/${tag}-${film.replace(':', '-')}-${String(i++).padStart(2, '0')}-${r.shot}.png` }); }
    }
    await p.evaluate(() => { RS.sim(1.5, 1 / 20); RS.director.date.cineCam(); });
  }
  for (const m of bad.values()) C.ok(false, m);
  return seen;
}

export default async function () {
  const C = checker('datenightcam'), b = await launch();
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  try {
    for (const tag of ['portrait', 'desk'].filter(t => SIZES.includes(t))) {
      const [w, h, mobile] = SIZE[tag], seen = new Set();
      // (a fresh page every few films: one page for the whole night ran out of memory on a busy machine)
      const open = async () => { const p = await newPage(b, { width: w, height: h, mobile });
        await startGame(p, { place: 'restaurant', mode: 'date' });
        await p.waitForFunction(() => RS.cast.every(c => !c.rag || c.rag.ready) && RS.director.date && (!RS.director.date.ron || RS.director.date.ron.rag.ready), null, { timeout: 120000 }).catch(() => {});
        await p.evaluate(BOT); await p.evaluate(LOOK);
        await p.evaluate(() => { RS.renderer.setAnimationLoop(null); RS.sim(0.3, 1 / 30); });
        return p; };
      let p;
      for (let i = 0; i < FILMS.length; i += 6) {
        if (p) { C.ok(!p.errors.length, `${tag}: page errors: ` + [...new Set(p.errors)].slice(0, 4).join(' | ')); await p.context().close(); }
        p = await open(); await playAll(C, p, tag, FILMS.slice(i, i + 6), seen); console.log(`  ${tag}: ${Math.min(FILMS.length, i + 6)}/${FILMS.length} films`);
      }
      // every kind of shot the films use got looked at
      for (const s of ['wide', 'side', 'overR', 'trio', 'chloe', 'ronnie', 'table', 'char', 'crane', 'orbit', 'push', 'dolly', 'low', 'foyer', 'walk', 'dutch'])
        if (FILMS === ALL) C.ok(seen.has(s), `${tag}: the "${s}" shot never came up`);
      // power-ups: none ever turns up or goes on over a long night (between the films too)
      const pu = await p.evaluate(() => { const PU = RS.powerups; let orbs = 0, on = 0; for (let i = 0; i < 2400; i++) { RS.director.timeLeft = 999; RS.sim(1 / 10, 1 / 10); orbs = Math.max(orbs, PU.orbs.length); on = Math.max(on, Object.keys(PU.active).length); } return { orbs, on, mode: RS.director.mode }; });
      C.ok(pu.mode === 'date' && pu.orbs === 0 && pu.on === 0, `${tag}: power-ups in Date Night over 4 minutes: ${JSON.stringify(pu)}`);
      C.ok(!p.errors.length, `${tag}: page errors: ` + [...new Set(p.errors)].slice(0, 4).join(' | '));
      await p.context().close();
    }
    // ---- power-ups: one still going from the last game is gone when Date Night starts; developer mode's still work
    if (SIZES.includes('portrait')) {
      const p = await newPage(b, { width: 390, height: 844, mobile: true });
      await startGame(p, { place: 'restaurant', mode: 'roam' });
      const r = await p.evaluate(() => { RS.renderer.setAnimationLoop(null); const PU = RS.powerups; RS.sim(1, 1 / 20); PU.give('speed'); PU.place('double', RS.player.head.clone().add({ x: 3, y: 0, z: 0 }), 'x1'); RS.sim(0.2, 1 / 20);
        const before = { on: Object.keys(PU.active).length, orbs: PU.orbs.length };
        RS.newGame('date'); RS.sim(1, 1 / 20); const after = { on: Object.keys(PU.active).length, orbs: PU.orbs.length, speed: RS.player.puSpeed };
        PU.give('double'); RS.sim(0.5, 1 / 20); const dev = PU.active.double > 0;
        return { before, after, dev, mode: RS.director.mode }; });
      C.ok(r.before.on === 1 && r.before.orbs === 1, `free roam: the test's power-up didn't go on: ${JSON.stringify(r)}`);
      C.ok(r.mode === 'date' && r.after.on === 0 && r.after.orbs === 0 && r.after.speed === 1, `a power-up from the last game carried into Date Night: ${JSON.stringify(r)}`);
      C.ok(r.dev, `developer mode's power-up button doesn't work in Date Night: ${JSON.stringify(r)}`);
      await p.context().close();
    }
    // ---- the menu: Date Night is the STORY MODE, and its card fits an upright phone
    if (SIZES.includes('menu')) {
      const p = await newPage(b, { width: 390, height: 844, mobile: true });
      await p.goto('http://game.local/index.html?x=1', { timeout: 120000, waitUntil: 'domcontentloaded' }); await sleep(2500);
      await p.evaluate(() => { document.querySelector('.playbtn').click(); }); await sleep(500);
      await p.evaluate(() => document.querySelector('#pick-solo').click()); await sleep(500);
      await p.evaluate(() => { document.querySelector('.scene[data-id="restaurant"]').click(); document.querySelector('.screen[data-s="place"] .bigbtn').click(); }); await sleep(800);
      await p.evaluate(fs.readFileSync(new URL('./lib/textcheck.js', import.meta.url), 'utf8'));
      const front = await p.evaluate(() => { const f = document.querySelector('.flip[data-id="date"]'); return f && f.querySelector('.front').textContent; });
      C.ok(/STORY MODE/.test(front || ''), `the Date Night card doesn't say STORY MODE: ${front}`);
      const probs = async (when) => { const pr = (await p.evaluate(() => window.__textCheck())).filter(o => /flip|mode/.test(o.where || '') || /STORY|Ronnie's on a diet|DATE NIGHT/.test(o.text || ''));
        C.ok(!pr.length, `menu (${when}): ${pr.slice(0, 3).map(o => `${o.kind}: "${o.text}" (${o.where})`).join('; ')}`); };
      await probs('the card');
      await p.evaluate(() => document.querySelector('.flip[data-id="date"]').click()); await sleep(900);
      const back = await p.evaluate(() => { const f = document.querySelector('.flip[data-id="date"]'), r = f.getBoundingClientRect(), bk = f.querySelector('.back'), q = bk.getBoundingClientRect(); return { text: bk.textContent, flipped: f.classList.contains('flipped'), r: [r.left, r.right], over: bk.scrollHeight > bk.clientHeight + 2, W: innerWidth }; });
      C.ok(/STORY MODE/.test(back.text) && /film by film/.test(back.text), `the Date Night card's back doesn't read as a story: ${back.text}`);
      C.ok(back.r[0] >= 0 && back.r[1] <= back.W + 1 && !back.over, `the Date Night card doesn't fit the phone: ${JSON.stringify(back)}`);
      await probs('flipped');
      C.ok(!p.errors.length, 'menu: page errors: ' + [...new Set(p.errors)].slice(0, 4).join(' | '));
      await p.context().close();
    }
    // ---- a Quest headset: your own eyes, never the film camera; the loo raid's move is a blink to black and back
    if (SIZES.includes('quest')) {
      const p = await newPage(b, { width: 700, height: 500, xr: true });
      await p.goto('http://game.local/index.html?go=1&place=restaurant&mode=date');
      await p.waitForFunction(() => window.RS && document.body.classList.contains('ready'), null, { timeout: 180000 });
      await p.waitForFunction(() => !document.querySelector('#loadscreen.on'), null, { timeout: 120000 }).catch(() => {});
      await p.evaluate(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); RS.renderer.xr.setFramebufferScaleFactor(0.2); });
      await p.click('#enter-vr').catch(() => {});
      const inVR = await p.waitForFunction(() => RS.renderer.xr.isPresenting, null, { timeout: 40000 }).then(() => true).catch(() => false);
      C.ok(inVR, 'Quest: never got into VR');
      if (inVR) {
        await p.evaluate(BOT);
        const r = await p.evaluate(async () => { const D = RS.director, N = D.date, wait = (ms) => new Promise(r => setTimeout(r, ms));
          // (straight in during the opening film: the raid's move to a table and back, as the loo films do it)
          let t = 0; while (N.state !== 'scene' && t < 20000) { await wait(200); t += 200; }
          const spot = { at: [-0.55, -0.1, -2.4], food: [-1.5, -1.0], pos: [-0.4, 1.55, 0.2], look: [-1.5, 0.8, -1.0] };
          let cam = 0, maxFade = 0, moved = false, frames = 0; const h0 = RS.player.head.clone();
          const settled = () => !N.travelGo && !(N.vrFadeT > 0);
          const watch = async () => { await wait(30); for (let k = 0; k < 40000 && !settled(); k += 30) { if (N.cineCam()) cam++; const m = N.ui && N.ui.vfade; if (m && m.visible) maxFade = Math.max(maxFade, m.material.opacity); if (RS.player.head.distanceTo(h0) > 1) moved = true; frames++; await wait(30); } await wait(300); };
          N.travel(spot); await watch(); const there = moved; N.travel(null); await watch();
          const m = N.ui && N.ui.vfade, back = RS.player.head.distanceTo(h0);
          return { cam, maxFade, moved: there, back, frames, left: m ? m.visible : null, state: N.state }; });
        C.ok(r.cam === 0, `Quest: the film camera took over the headset's view (${r.cam} frames)`);
        C.ok(r.moved && r.back < 0.5 && r.maxFade > 0.8 && r.left === false, `Quest: the loo raid's move wasn't a blink to black and back: ${JSON.stringify(r)}`);
      }
      C.ok(!p.errors.length, 'Quest: page errors: ' + [...new Set(p.errors)].slice(0, 4).join(' | '));
      await p.context().close();
    }
  } finally { await b.close(); }
  return C.fails;
}
