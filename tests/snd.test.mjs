// SEARCH AND DESTROY (js/snd.js, sndguns.js, sndfx.js, sndui.js, sndkit.js), on a fake clock (RS.sim) wherever it can be:
//   - maps: on the pub, Lidl and Lewis's, both spawns and both bomb sites are on the floor and joined up by real paths,
//     every pick-up is laid somewhere reachable, the teams are full (the map's size a side), the bots play a round on
//     their own (they shoot, someone gets hurt), no NaN anywhere and no new shader built by anything it draws (pick-ups,
//     every gun firing, the view model, the marks, the empties, guns on the floor, the bomb, the bang)
//   - fill: bots fill both teams to the map's size whatever the number of people (1, 2, 5, 11), teams kept even, bots
//     making way as people join and coming back as they leave, every bot's name tag saying 🤖
//   - guns: every gun fires (and hits), reloads (its own way: one tin at a time for the shotgun, the bolt for the
//     sniper), aims (zoomed, tighter), swaps with the sidearm, is dropped when its owner goes down and can be picked up;
//     fire modes (a burst is three), recoil kicks and comes back, damage tails off with range, heads and legs, walls
//     only the right guns get through, the reload taking the magazine out, the inspect, empties and marks left behind
//   - solo (a phone held upright, Lewis's): the SHOP opens every round (nine guns, your dinner money, what you can't
//     afford refused, a refund when you swap), FIRE shoots (ammo down, the bot hit, hit marker, a kill in the feed,
//     headshots do more); health and armour, where a hit came from, the low health red edge; RELOAD (the button, the
//     empty *click* reloading by itself, nothing in reserve), the ammo HUD; every pick-up and perk; PLANT (held, at a
//     site) with the beeping getting faster, a dropped bomb picked up, DEFUSE, the bomb going off (everyone near it out),
//     a wipe, time running out, half time, the money each round, the match ending with the receipt; the scoreboard (held)
//     with kills, deaths and an assist; the phone's text never on other text and every button on screen and pressable
//     (the shop, HUD, the scoreboard, watching), and on its side too
//   - pc: the keys (the shop's numbers, R reload, F fire, Q swap, X fire mode, T inspect, TAB the scoreboard, E plant
//     held), the mouse firing and aiming (right button), the shop and HUD fit
//   - quest (an emulated headset): the shop on a panel (pointer and trigger), the gun on the right controller, the
//     trigger fires, A reloads, X swaps, the left hand on the front holds it with both, the wrist box has health and ammo
//   - mp: two real games in a room: the same full teams on both, a guest's buy and shots and hits reach the host and come
//     back, the host's hit on the guest, a guest's pick-up, a guest taking a gun off the floor, the attacker plants and
//     the defender defuses (both games see it and the score), the next round's shop, the bots drawn on the guest, the
//     match end and the guest's own receipt
//   - fakes: the developer test room's fake players fill seats (bots make up the rest), buy guns, walk, shoot, plant
// SND_ONLY=maps,fill,guns,solo,phone2,pc,quest,mp,fakes (default all), PLACES=pub,shop,garden (for maps)
import fs from 'fs';
import { launch, newPage, startGame, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';

const TXT = fs.readFileSync(new URL('./lib/textcheck.js', import.meta.url), 'utf8'), BTN = fs.readFileSync(new URL('./lib/btncheck.js', import.meta.url), 'utf8');
const ONLY = (process.env.SND_ONLY || 'maps,fill,guns,solo,phone2,pc,quest,mp,fakes').split(','), PLACES = (process.env.PLACES || 'pub,shop,garden').split(',');
const on = (k) => ONLY.includes(k);
const GUN_IDS = ['ketchup', 'brown', 'mustard', 'cheese', 'beans', 'monstor', 'baguette', 'sausage', 'gravy'];

// (in the page) little helpers on window.T: step the clock, aim, stand somewhere, press a button
const HELP = () => {
  window.T = {
    s: () => RS.director.snd,
    step: (secs, dt = 1 / 30) => { for (let t = 0; t < secs; t += dt) RS.sim(dt); },
    stand: (x, z) => { const s = RS.director.snd; s.pinAt = null; s.respawnAt(x, z); RS.sim(1 / 30); s.pinAt = null; s.respawnAt(x, z); },
    aim: (x, y, z) => { const P = RS.player, h = P.head; P.flatYaw = Math.atan2(-(x - h.x), -(z - h.z)) - P.rig.rotation.y; P.flatPitch = Math.atan2(y - h.y, Math.hypot(x - h.x, z - h.z)); RS.sim(1 / 60); P.flatYaw = Math.atan2(-(x - h.x), -(z - h.z)) - P.rig.rotation.y; P.flatPitch = Math.atan2(y - RS.player.head.y, Math.hypot(x - h.x, z - h.z)); RS.player.camera.updateMatrixWorld(true); },
    press: (sel, up = true) => { const e = document.querySelector(sel); if (!e) return false; e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, isPrimary: true })); if (up) e.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 })); return true; },
    release: (sel) => { const e = document.querySelector(sel); e && e.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 })); },
    // a free spot n metres away that I can see (no wall between): the way I'm looking if it's clear, otherwise round about
    clear: (n) => { const s = RS.director.snd, P = RS.player, nav = RS.room.nav, Th = RS.THREE, yaw0 = Math.atan2(-P.fwd.x, -P.fwd.z);
      for (let k = 0; k < 24; k++) { const a = yaw0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.26, x = P.head.x - Math.sin(a) * n, z = P.head.z - Math.cos(a) * n, q = nav.nearestFree(x, z); if (q < 0) continue; const c = nav.center(q);
        if (Math.hypot(c.x - P.head.x, c.y - P.head.z) < n * 0.7) continue; if (s.canSee(new Th.Vector3(P.head.x, P.head.y, P.head.z), new Th.Vector3(c.x, s.floor(c.x, c.y) + 1.1, c.y))) return [c.x, c.y]; } return T.ahead(n); },
    ahead: (n) => { const P = RS.player, nav = RS.room.nav, f = P.fwd; const x = P.head.x + f.x / Math.hypot(f.x, f.z) * n, z = P.head.z + f.z / Math.hypot(f.x, f.z) * n; const k = nav.nearestFree(x, z), c = nav.center(k); return [c.x, c.y]; },
    enemies: () => { const s = RS.director.snd, me = s.mine(); return [...s.F.values()].filter(f => f.team !== me.team && f.alive); },
    mates: () => { const s = RS.director.snd, me = s.mine(); return [...s.F.values()].filter(f => f.team === me.team && f.alive && f.id !== s.me); },
    // an enemy bot stood still n metres in front of me, my aim on it (at y below its head)
    target: (n = 6, dy = 0.5) => { const s = RS.director.snd, e = T.enemies().find(f => f.bot); if (!e) return null; const b = s.bots.get(e.id), at = T.clear(n); b.x = at[0]; b.z = at[1]; e.hp = 100; e.ar = 0; RS.sim(1 / 30); const h = s.headOf(e.id, new RS.THREE.Vector3()); T.aim(h.x, h.y - dy, h.z); return e; },
    clearPops: () => { for (const id of ['sd-splash', 'sd-pop', 'sd-multi', 'sd-count']) { const e = document.getElementById(id); if (e) e.className = ''; } for (const e of document.querySelectorAll('.banner, #banner')) e.style.display = 'none'; },
    rich: () => { const s = RS.director.snd; s.cash[s.me] = 9000; if (s.H) s.H.cash[s.me] = 9000; },
  };
};
const ev = (p, f, a) => p.evaluate(f, a);
const textProblems = async (p, scope) => { await p.evaluate(TXT); return (await p.evaluate((s) => window.__textCheck(s ? document.querySelector(s) : null), scope)).filter(o => o.kind === 'text on text' || o.kind === 'off the side of the screen' || o.kind === 'cut off'); };
const btnProblems = async (p, scope) => { await p.evaluate(BTN); return p.evaluate((s) => window.__btnCheck(s), scope); };
// into a solo game of Search & Destroy, the clock in the test's hands, at the first round's shop
async function soloGame(b, { place = 'garden', width = 390, height = 844, mobile = true } = {}) {
  const p = await newPage(b, { width, height, mobile });
  await startGame(p, { place, mode: 'snd' }); await ev(p, HELP);
  await ev(p, () => { RS.renderer.setAnimationLoop(null); const s = T.s(); s.startT = 0; for (let i = 0; i < 60 && s.phase !== 'buy'; i++) RS.sim(1 / 30); });
  return p;
}
// (a poll that does something each time round: re-standing on a spot while the network catches up, say)
async function until(p, f, arg, { timeout = 60000, every = 600 } = {}) { const t0 = Date.now(); for (;;) { const v = await p.evaluate(f, arg).catch(() => null); if (v) return v; if (Date.now() - t0 > timeout) return null; await sleep(every); } }

export default async function () {
  const C = checker('snd'), b = await launch();
  try {
    if (on('maps')) for (const place of PLACES) await maps(b, place, C);
    if (on('fill')) await fill(b, C);
    if (on('guns')) await guns(b, C);
    if (on('solo')) await solo(b, C);
    if (on('phone2')) await phoneSide(b, C);
    if (on('pc')) await pc(b, C);
    if (on('quest')) await quest(b, C);
  } finally { await b.close(); }
  if (on('mp')) await mp(C);
  if (on('fakes')) await fakes(C);
  return C.fails;
}

// ------------------------------------------------------------------ the maps
async function maps(b, place, C) {
  const p = await soloGame(b, { place, width: 640, height: 400, mobile: false });
  try {
    const r = await ev(p, () => {
      const s = T.s(), nav = RS.room.nav, M = s.M, out = { bad: [], paths: {} };
      const free = (x, z) => { const k = nav.nearestFree(x, z), c = nav.center(k); return Math.hypot(c.x - x, c.y - z) < 0.5; };
      for (const k of ['att', 'def', 'A', 'B']) if (!free(M[k][0], M[k][1])) out.bad.push(k + ' is off the floor');
      for (const a of ['att', 'def']) for (const L of ['A', 'B']) { const pa = nav.path(M[a][0], M[a][1], M[L][0], M[L][1]); out.paths[a + L] = !!pa; }
      out.pk = s.pk.length; out.pkBad = s.pk.filter(q => !free(q.x, q.z) || !nav.path(M.att[0], M.att[1], q.x, q.z)).length; out.kinds = [...new Set(s.pk.map(q => q.k))].length;
      out.spawnsBad = Object.entries(s.roundMsg.sp).filter(([, v]) => !free(v[0], v[1])).map(([k]) => k);
      out.teams = [...s.F.values()].map(f => f.team).join(''); out.size = M.team; out.props = s.grp.children.filter(o => /site props/.test(o.name)).length;
      return out; });
    C.ok(!r.bad.length, `${place}: ${r.bad.join(', ')}`);
    C.ok(Object.values(r.paths).every(Boolean), `${place}: no path between a spawn and a site: ${JSON.stringify(r.paths)}`);
    C.ok(r.pk >= 10 && r.pkBad === 0 && r.kinds >= 6, `${place}: pick-ups: ${r.pk} laid, ${r.pkBad} off the floor or out of reach, ${r.kinds} kinds`);
    C.ok(!r.spawnsBad.length, `${place}: spawns off the floor: ${r.spawnsBad.join(', ')}`);
    C.ok(r.teams.length === r.size * 2 && (r.teams.match(/R/g) || []).length === r.size, `${place}: solo teams aren't full (${r.size} a side): ${r.teams}`);
    C.ok(r.props === 2, `${place}: the bomb sites haven't both got their props: ${r.props}`);
    // the bots play: 40 seconds of a round with me stood out of the way
    const play = await ev(p, () => { const s = T.s(); s.closePicker(); s.H.ends = s.clock; RS.sim(1 / 30); const me = s.mine(); me.alive = false;      // (I'm sat out: the bots fight it out)
      let shots = 0, hurt = 0, moved = 0; const rs = s.remoteShot.bind(s), dm = s.damaged.bind(s); s.remoteShot = (id, m) => { shots++; rs(id, m); }; s.damaged = (m) => { hurt++; dm(m); };
      for (let k = 0; k < 20; k++) { T.step(2, 1 / 20); if (s.phase === 'live') moved = Math.max(moved, [...s.bots.values()].filter(b => { const sp = s.roundMsg.sp[b.id]; return sp && Math.hypot(b.x - sp[0], b.z - sp[1]) > 2; }).length); if (s.phase === 'buy') { s.closePicker(); s.H.ends = s.clock; s.mine().alive = false; } }
      const nan = []; RS.scene.traverse(o => { if (o.position && !(isFinite(o.position.x) && isFinite(o.position.y) && isFinite(o.position.z))) nan.push(o.name || o.type); });
      return { shots, hurt, moved, nan: nan.slice(0, 4), phase: s.phase, round: s.round, sc: s.sc, bomb: s.bomb.st, drops: s.drops.size, marks: s.markM.count }; });
    C.ok(play.moved >= 3, `${place}: the bots didn't go anywhere: ${JSON.stringify(play)}`);
    C.ok(play.shots > 0 && play.hurt > 0, `${place}: the bots never fought: ${JSON.stringify(play)}`);
    C.ok(!play.nan.length, `${place}: NaN positions: ${play.nan.join(', ')}`);
    // nothing it draws builds a shader mid-game
    await p.waitForFunction(() => window.__shaderWarm, null, { timeout: 240000 }).catch(() => {});
    const sh = await ev(p, () => { const s = T.s(), R = RS.renderer, Th = RS.THREE, cam = new Th.PerspectiveCamera(70, 1.6, 0.05, 80);
      const look = (x, y, z, tx, ty, tz) => { cam.position.set(x, y, z); cam.lookAt(tx, ty, tz); cam.updateMatrixWorld(); R.render(RS.scene, cam); };
      const h = RS.player.head; look(h.x, 1.6, h.z, h.x + 1, 1.2, h.z + 1); R.render(RS.scene, RS.player.camera); const n0 = R.info.programs.length;
      // every pick-up, the bomb carried, dropped, planted and going off, the site markers, tracers, guns in hands
      const me = s.mine(); me.alive = true; s.H.ends = s.clock + 100; if (s.phase !== 'live') { s.phase = 'live'; }
      for (const q of s.pk) { q.on = true; look(q.x + 1.5, 1.3, q.z + 1.5, q.x, 0.4, q.z); }
      for (const L of ['A', 'B']) look(s.M[L][0] + 3, 2, s.M[L][1] + 3, s.M[L][0], 0, s.M[L][1]);
      s.hostBomb({ st: 'dropped', p: [s.M.A[0], s.M.A[1]] }); RS.sim(1 / 30); look(s.M.A[0] + 2, 1.5, s.M.A[1] + 2, s.M.A[0], 0, s.M.A[1]);
      s.hostBomb({ st: 'planted', id: 'bot0', p: [s.M.A[0], s.M.A[1]], s: 'A', left: 40 }); RS.sim(1 / 30); look(s.M.A[0] + 2, 1.5, s.M.A[1] + 2, s.M.A[0], 0, s.M.A[1]);
      for (const G of ['ketchup', 'brown', 'mustard', 'cheese', 'beans', 'monstor', 'baguette', 'sausage', 'gravy']) { s.loadGun(G); s.my.mag = 5; s.my.nextShot = 0; s.my.spin = 1; s.my.cyc = null; s.fire(); RS.sim(1 / 30); R.render(RS.scene, RS.player.camera); s.my.ads = true; T.step(0.4); R.render(RS.scene, RS.player.camera); s.my.ads = false; s.doReload(); T.step(0.6); R.render(RS.scene, RS.player.camera); s.my.rl = null; s.my.reloadEnd = 0;
        s.hostDrop(G, h.x + 1, h.z + 1); RS.sim(1 / 30); look(h.x + 2, 1.4, h.z + 2, h.x + 1, 0.1, h.z + 1); }
      s.bomb.st = 'planted'; s.explode(); T.step(0.1); look(s.M.A[0] + 4, 2, s.M.A[1] + 4, s.M.A[0], 0.5, s.M.A[1]);
      for (const [id] of s.puppets) { const q = s.headOf(id, new Th.Vector3()); if (q) look(q.x + 2, 1.6, q.z + 2, q.x, 1.2, q.z); }
      s.showBoard(true); R.render(RS.scene, RS.player.camera); s.showBoard(false);
      return { built: R.info.programs.length - n0, warm: !!window.__shaderWarm }; });
    C.ok(sh.built === 0, `${place}: ${sh.built} shaders built during play (each a stutter)`);
    C.ok(!p.errors.length, `${place}: page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
    const cr = p.crashes.filter(c => !['start', 'hang'].includes(c.k)); C.ok(!cr.length, `${place}: crash reports: ` + cr.slice(0, 2).map(c => JSON.stringify(c).slice(0, 200)).join(' | '));
    console.log(`  maps ${place}: ${r.pk} pick-ups (${r.kinds} kinds), teams ${r.teams}, bots: ${JSON.stringify(play)}, ${sh.built} shaders built in play`);
  } catch (e) { C.ok(false, `maps ${place}: ${e.message.slice(0, 300)}`); }
  await p.context().close();
}

// ------------------------------------------------------------------ full teams: bots fill the rest
async function fill(b, C) {
  const p = await soloGame(b, { place: 'pub', width: 640, height: 400, mobile: false });
  try {
    const r = await ev(p, () => { const s = T.s(), out = {}, CH = ['lewis', 'noah', 'chloe', 'harry', 'oliver', 'dylan', 'connor', 'ethan', 'ian', 'alfie', 'ben'];
      const people = (ids) => ids.map((id, i) => ({ id, name: 'P' + id, char: CH[i % CH.length] }));
      const count = () => { const F = [...s.F.values()], t = (x) => F.filter(f => f.team === x), hum = F.filter(f => !f.bot), bots = F.filter(f => f.bot);
        return { R: t('R').length, B: t('B').length, hR: t('R').filter(f => !f.bot).length, hB: t('B').filter(f => !f.bot).length, bots: bots.length, people: hum.length, tags: bots.every(f => /^🤖 /.test(f.name)), chars: new Set(F.map(f => f.char)).size === F.length, puppets: s.puppets.size }; };
      for (const n of [1, 2, 5, 11]) { const ids = ['me', ...Array.from({ length: n - 1 }, (_, i) => 'p' + (i + 1))]; s.roster = () => people(ids); s.H = null; s.phase = 'wait'; s.hostStart(); out[n] = count(); }
      // between rounds: two of us, then five more join, then four leave (all from one side: the teams are evened up)
      let ids = ['me', 'p1']; s.roster = () => people(ids); s.H = null; s.phase = 'wait'; s.hostStart(); out.two = count();
      ids = ['me', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']; s.hostRound(); out.seven = count();
      const red = ids.filter(id => s.H.team[id] === s.H.team.me && id !== 'me'), blue = ids.filter(id => s.H.team[id] !== s.H.team.me);
      ids = ['me', ...red.slice(0, 0), ...blue.slice(0, 1), ...red.slice(red.length)]; ids = ['me', ...blue.slice(0, 2)]; s.hostRound(); out.three = count();
      // someone leaving mid-round is out of it; the next round a bot's back in their place
      ids = ['me', ...blue.slice(0, 2)]; s.H.ends = s.clock; RS.sim(1 / 30); const gone = blue[1]; s.hostLeft(gone); out.leftOut = !s.F.get(gone).alive; ids = ['me', blue[0]]; s.hostRound(); out.two2 = count();
      return out; });
    for (const n of [1, 2, 5, 11]) { const c = r[n], size = Math.max(5, Math.ceil(n / 2)); C.ok(c.R === size && c.B === size && c.people === n && Math.abs(c.hR - c.hB) <= 1, `fill: ${n} ${n > 1 ? 'people' : 'person'}: teams aren't ${size} a side with the people split evenly: ${JSON.stringify(c)}`);
      C.ok(c.bots === size * 2 - n && c.tags && c.chars, `fill: ${n}: ${c.bots} bots (wanted ${size * 2 - n}), all tagged 🤖 ${c.tags}, nobody the same character ${c.chars}`); }
    C.ok(r.seven.R === 5 && r.seven.B === 5 && r.seven.people === 7 && r.seven.bots === 3 && Math.abs(r.seven.hR - r.seven.hB) <= 1, `fill: five more joining didn't make way (bots out): ${JSON.stringify(r.seven)}`);
    C.ok(r.three.R === 5 && r.three.B === 5 && r.three.people === 3 && r.three.bots === 7 && Math.abs(r.three.hR - r.three.hB) <= 1, `fill: four leaving didn't bring bots back with the teams even: ${JSON.stringify(r.three)}`);
    C.ok(r.leftOut && r.two2.R === 5 && r.two2.B === 5 && r.two2.bots === 8, `fill: someone leaving mid-round: ${JSON.stringify({ out: r.leftOut, next: r.two2 })}`);
    C.ok(r[11].puppets === r[11].bots, `fill: the bots aren't all drawn: ${JSON.stringify(r[11])}`);
    C.ok(!p.errors.length, 'fill: page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
    console.log(`  fill: ${[1, 2, 5, 11].map(n => `${n}: ${r[n].R}v${r[n].B} (${r[n].bots} bots)`).join(', ')}; join ${r.seven.bots} bots, leave ${r.three.bots}`);
  } catch (e) { C.ok(false, `fill: ${e.message.slice(0, 300)}`); }
  await p.context().close();
}

// ------------------------------------------------------------------ the guns, one by one (a phone held upright)
async function guns(b, C) {
  const p = await soloGame(b, { place: 'garden' });
  try {
    await ev(p, () => { const s = T.s(); s.closePicker(); s.botsFrozen = true; s.H.ends = s.clock; T.step(0.3); s.noCheck = true; });
    for (const g of GUN_IDS) {
      const r = await ev(p, (g) => { const s = T.s(), G = s.curG.call({ my: { gun: g } }), out = { g };
        s.mine().alive = true; s.mine().hp = 100; s.loadGun(g); s.my.drawEnd = 0; const e = T.target(6); if (!e) return { g, err: 'no bot' };
        // aimed (zoomed in, tighter), then fired at the bot
        const fov0 = RS.player.camera.fov, hip = s.spreadNow(); s.toggleAds(true); T.step(0.45); out.ads = +s.my.adsK.toFixed(2); out.zoom = +(RS.player.camera.fov / fov0).toFixed(2); out.tighter = s.spreadNow() < hip;
        const h = s.headOf(e.id, new RS.THREE.Vector3()); T.aim(h.x, h.y - 0.5, h.z);
        const mag0 = s.my.mag, hp0 = e.hp; if (G.spin) { s.my.firing = true; T.step(0.6); s.my.firing = false; } else { s.my.nextShot = 0; s.fire(); T.step(0.45); }
        out.fired = mag0 - s.my.mag; out.hit = hp0 - e.hp; out.marks = s.markM.count; s.toggleAds(false); T.step(0.3);
        // reloaded (its own way)
        s.my.mag = 1; s.my.cyc = null; s.doReload(); out.rlType = s.my.rl && s.my.rl.k; out.len = +s.my.reloadLen.toFixed(2);
        if (G.rtype === 'shell') { T.step(0.35 + G.reload * 0.8); out.shell1 = s.my.mag; T.step(G.reload); out.shell2 = s.my.mag; }
        else { T.step(s.my.reloadLen * 0.48); const P = s.vGun && s.vGun.userData.parts; out.magOut = !!P && !!P.mag && (!P.mag.visible || P.mag.position.length() > 0.05 || P.mag.position.distanceTo(P.mag.userData.rest || new RS.THREE.Vector3()) > 0.05); }
        T.step(s.my.reloadLen + 0.2); out.full = s.my.mag === G.mag; out.reserve = s.my.reserve;
        // swapped with the other slot and back
        if (G.slot === 'P') { s.swapGun(); T.step(0.1); out.swap1 = s.my.gun; s.swapGun(); T.step(1); out.swap2 = s.my.gun; } else { out.swap1 = 'sidearm'; out.swap2 = g; }
        // the bot carrying this gun goes down: it's left on the floor; I take it (my own one of that slot left in its place)
        if (g !== 'ketchup') { s.F.get(e.id).alive = true; s.bots.get(e.id).alive = true; e.hp = 100; const L = s.load(e.id); L[G.slot] = g; if (G.slot === 'S') L.P = null; const mine = G.slot === 'P' ? (g === 'cheese' ? 'beans' : 'cheese') : (g === 'brown' ? 'mustard' : 'brown'); s.load(s.me)[G.slot] = mine; s.loadGun(mine);
          const n0 = s.drops.size; s.hostKill(e.id, s.me, false); out.dropped = [...s.drops.values()].some(d => d.g === g) && s.drops.size > n0; const D = [...s.drops.values()].reverse().find(d => d.g === g);
          if (D) { T.stand(D.x, D.z); T.step(0.2); const w = s.actWhat(); out.offer = w && w.k; T.press('#sd-ui .act'); T.step(0.3); out.took = s.my.slots[G.slot] && s.my.slots[G.slot].g; out.gunIn = s.my.gun; out.left = [...s.drops.values()].some(d => d.g === mine); }
          s.F.get(e.id).alive = true; s.bots.get(e.id).alive = true; e.hp = 100; }
        return out; }, g);
      const G = r.g;
      C.ok(!r.err, `guns ${G}: ${r.err}`);
      C.ok(r.ads === 1 && r.zoom < 1 && r.tighter, `guns ${G}: aiming didn't zoom in and tighten it: ${JSON.stringify(r)}`);
      C.ok(r.fired >= 1 && r.hit > 0, `guns ${G}: firing at a bot 6m away didn't use a round and hit it: ${JSON.stringify(r)}`);
      C.ok(r.full && (r.rlType === 'shell' ? r.shell2 === r.shell1 + 1 && r.shell1 >= 2 : r.magOut), `guns ${G}: the reload (${r.rlType}) didn't fill it up its own way: ${JSON.stringify(r)}`);
      C.ok(r.swap1 !== G && r.swap2 === G, `guns ${G}: swapping to the sidearm and back: ${JSON.stringify(r)}`);
      if (G !== 'ketchup') C.ok(r.dropped && r.offer === 'grab' && r.took === G && r.gunIn === G && r.left, `guns ${G}: dropped when the bot went down and picked up (mine left in its place): ${JSON.stringify(r)}`);
      if (process.env.VERBOSE) console.log('   ', JSON.stringify(r));
    }
    // fire modes (the MONSTOR: auto, burst of three, semi), recoil kicking and coming back, the sniper's bolt, the inspect
    const fm = await ev(p, () => { const s = T.s(), P = RS.player, out = {}; s.loadGun('monstor'); s.my.drawEnd = 0; out.modes = [s.fireMode()];
      s.cycleMode(); out.modes.push(s.fireMode()); s.my.mag = 30; s.my.nextShot = 0; s.fire(); T.step(0.5); out.burst = 30 - s.my.mag;
      s.cycleMode(); out.modes.push(s.fireMode()); s.my.mag = 30; s.my.firing = true; s.fire(); T.step(0.6); s.my.firing = false; out.semi = 30 - s.my.mag;
      s.cycleMode(); out.modes.push(s.fireMode()); s.my.mag = 30; const p0 = P.flatPitch; s.my.firing = true; s.fire(); T.step(0.7); s.my.firing = false; out.auto = 30 - s.my.mag; out.kick = +(P.flatPitch - p0).toFixed(3); out.cases = s.cases.length; T.step(1.5); out.back = +(P.flatPitch - p0).toFixed(3);
      s.loadGun('sausage'); s.my.drawEnd = 0; s.my.nextShot = 0; s.fire(); const m1 = s.my.mag; T.step(0.3); out.cyc = !!s.my.cyc; const act = s.vGun.userData.parts.act; out.bolt = +act.rotation.z.toFixed(2); s.my.nextShot = 0; s.fire(); out.noShot = s.my.mag === m1; T.step(1.2); out.cycDone = !s.my.cyc;
      s.loadGun('monstor'); s.my.drawEnd = 0; T.step(0.1); const ry0 = s.vGun.rotation.y; s.inspect(); T.step(1.2); out.inspect = +(s.vGun.rotation.y - ry0).toFixed(2);
      return out; });
    C.ok(fm.modes.join() === 'auto,burst,semi,auto' && fm.burst === 3 && fm.semi === 1 && fm.auto >= 5, `guns: fire modes (auto, burst of 3, semi): ${JSON.stringify(fm)}`);
    C.ok(fm.kick > 0.03 && fm.back < fm.kick * 0.4, `guns: recoil didn't kick the aim up and bring it mostly back: ${JSON.stringify(fm)}`);
    C.ok(fm.cyc && fm.bolt > 0.3 && fm.noShot && fm.cycDone, `guns: the sniper's bolt between shots: ${JSON.stringify(fm)}`);
    C.ok(Math.abs(fm.inspect) > 0.3, `guns: T (inspect) didn't turn the gun to look at: ${JSON.stringify(fm)}`);
    C.ok(fm.cases >= 3, `guns: no empties out of the gun: ${JSON.stringify(fm)}`);
    // damage: tails off with range, heads more, legs less; walls only the right guns get through
    const dm = await ev(p, () => { const s = T.s(), Th = RS.THREE, out = {}, G = (id) => ({ ...s.curG.call({ my: { gun: id } }) });
      const fo = (id, d) => +s.dmgAt(id, d).toFixed(2); out.fall = [fo('monstor', 5), fo('monstor', 40), fo('monstor', 90), fo('beans', 3), fo('beans', 20)];
      s.loadGun('monstor'); const e = T.target(5), h = s.headOf(e.id, new Th.Vector3()), o = RS.player.head.clone();
      const zone = (dy) => { const d = new Th.Vector3(h.x, h.y - dy, h.z).sub(o).normalize(); const t = s.trace(o, d, 60, G('monstor')); return t.hit ? t.hit.z : -1; }; out.zones = [zone(0.05), zone(0.6), zone(1.3)];
      // a thin wall (a board) and a thick one between me and the bot
      const mid = o.clone().lerp(new Th.Vector3(h.x, o.y, h.z), 0.5), dir = new Th.Vector3(h.x, h.y - 0.5, h.z).sub(o).normalize(), thin = new Th.Box3().setFromCenterAndSize(mid, new Th.Vector3(0.2, 3, 0.2)), thick = new Th.Box3().setFromCenterAndSize(mid, new Th.Vector3(1.2, 3, 1.2));
      const thru = (box, id) => { s.walls.push(box); const t = s.trace(o, dir, 60, G(id)); s.walls.pop(); return t.hit ? (t.hit.wb ? 'wb' : 'clear') : 'blocked'; };
      out.thin = ['cheese', 'ketchup', 'sausage'].map(id => thru(thin, id)); out.thick = ['ketchup', 'sausage'].map(id => thru(thick, id)); out.holes = (() => { s.walls.push(thin); const t = s.trace(o, dir, 60, G('sausage')); s.walls.pop(); return t.holes.length; })();
      // the host's damage from a wallbang hit, and a leg hit
      const hp0 = e.hp; s.hostHit(s.me, { v: e.id, d: 20, z: 2, wb: 1, g: 'monstor' }); out.legHit = hp0 - e.hp; return out; });
    C.ok(dm.fall[0] === 1 && dm.fall[1] < 1 && dm.fall[2] <= dm.fall[1] && dm.fall[3] === 1 && dm.fall[4] < 0.5, `guns: damage falloff: ${JSON.stringify(dm.fall)}`);
    C.ok(dm.zones.join() === '1,0,2', `guns: head, body, legs (aiming at each): ${JSON.stringify(dm.zones)}`);
    C.ok(dm.thin.join() === 'blocked,wb,wb' && dm.thick.join() === 'blocked,blocked' && dm.holes >= 2, `guns: walls (a board: the SMG stopped, the pistol and sniper through; a thick wall stops both): ${JSON.stringify(dm)}`);
    C.ok(dm.legHit === 20, `guns: the host didn't take a wallbang leg hit: ${JSON.stringify(dm)}`);
    C.ok(!p.errors.length, 'guns: page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
    console.log(`  guns: modes ${JSON.stringify(fm)}; damage ${JSON.stringify(dm)}`);
  } catch (e) { C.ok(false, `guns: ${e.message.slice(0, 400)}`); }
  await p.context().close();
}

// ------------------------------------------------------------------ solo, on a phone held upright
async function solo(b, C) {
  const p = await soloGame(b, { place: 'garden' });
  const L = (s) => process.env.VERBOSE && console.log('   ', s);
  try {
    // ---- the shop, round 1
    const pick = await ev(p, () => { const s = T.s(), el = document.getElementById('sd-pick'); return { open: el.classList.contains('on'), cards: el.querySelectorAll('.card').length, cash: el.querySelector('.hd .cash').textContent, money: s.cash[s.me], phase: s.phase, gun: s.my.gun }; });
    C.ok(pick.open && pick.cards === 9 && /£2,000/.test(pick.cash) && pick.gun === 'ketchup', `solo: the shop isn't open at the start of round 1 with nine guns and £2,000 (just the ketchup pistol to start): ${JSON.stringify(pick)}`);
    await sleep(600);
    { const t = await textProblems(p, '#sd-pick'), bt = await btnProblems(p, '#sd-pick');
      C.ok(!t.length, `phone: the shop's text: ${JSON.stringify(t.slice(0, 3))}`); C.ok(!bt.length, `phone: the shop's buttons: ${JSON.stringify(bt.slice(0, 3))}`); }
    if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + '/snd-shop-phone.png' });
    const buy = await ev(p, () => { const s = T.s(), card = (g) => document.querySelector(`#sd-pick .card[data-g="${g}"]`), out = {};
      card('sausage').click(); T.step(0.1); out.dear = { gun: s.my.gun, cash: s.cash[s.me], no: card('sausage').classList.contains('no'), pop: document.getElementById('sd-pop').textContent };
      card('cheese').click(); T.step(0.1); out.cheese = { gun: s.my.gun, mag: s.my.mag, reserve: s.my.reserve, cash: s.cash[s.me], cur: card('cheese').classList.contains('cur') };
      card('beans').click(); T.step(0.1); out.beans = { gun: s.my.gun, cash: s.cash[s.me] };
      card('brown').click(); T.step(0.1); out.brown = { S: s.my.slots.S.g, cash: s.cash[s.me], hud: document.querySelector('#sd-pick .hd .cash').textContent };
      document.querySelector('#sd-pick .go').click(); T.step(0.1); out.closed = !document.getElementById('sd-pick').classList.contains('on'); out.shopBtn = !document.querySelector('#sd-ui .guns').hidden;
      T.press('#sd-ui .guns'); out.reopen = document.getElementById('sd-pick').classList.contains('on'); T.rich(); card('monstor').click(); T.step(0.1); out.monstor = { gun: s.my.gun, mag: s.my.mag, cash: s.cash[s.me] }; s.closePicker(); return out; });
    C.ok(buy.dear.gun === 'ketchup' && buy.dear.cash === 2000 && buy.dear.no && /NEED/.test(buy.dear.pop), `solo: the £4,000 sniper wasn't refused with £2,000: ${JSON.stringify(buy.dear)}`);
    C.ok(buy.cheese.gun === 'cheese' && buy.cheese.mag === 30 && buy.cheese.reserve === 120 && buy.cheese.cash === 800 && buy.cheese.cur, `solo: buying the cheese SMG (£1,200): ${JSON.stringify(buy.cheese)}`);
    C.ok(buy.beans.gun === 'beans' && buy.beans.cash === 900, `solo: swapping it for the shotgun didn't refund the SMG (800 + 1,200 - 1,100): ${JSON.stringify(buy.beans)}`);
    C.ok(buy.brown.S === 'brown' && buy.brown.cash === 500 && /£500/.test(buy.brown.hud), `solo: a sidearm as well: ${JSON.stringify(buy.brown)}`);
    C.ok(buy.closed && buy.shopBtn && buy.reopen, `solo: DONE didn't close the shop, or SHOP didn't open it again: ${JSON.stringify(buy)}`);
    C.ok(buy.monstor.gun === 'monstor' && buy.monstor.mag === 30 && buy.monstor.cash === 9000 + 1100 - 2500, `solo: the MONSTOR (with the shotgun refunded): ${JSON.stringify(buy.monstor)}`);
    // ---- live: shooting a bot stood in front of me
    const shoot = await ev(p, () => { const s = T.s(); s.closePicker(); s.botsFrozen = true; s.H.ends = s.clock; T.step(0.8); const me = s.mine();
      const e = T.target(6), head = s.headOf(e.id, new RS.THREE.Vector3());
      const mag0 = s.my.mag, hp0 = e.hp; T.press('#sd-ui .fire'); T.step(0.05);
      const one = { mag: s.my.mag, hp: e.hp, hm: document.getElementById('sd-hm').className };
      // a headshot does more than a body shot
      T.aim(head.x, head.y - 0.05, head.z); s.my.nextShot = 0; const hpA = e.hp; s.fire(); T.step(0.05); const hsD = hpA - e.hp;
      // keep shooting till it's down
      let n = 0; while (e.alive && n++ < 40) { T.aim(head.x, head.y - 0.5, head.z); s.my.nextShot = 0; if (s.my.mag <= 0) { s.my.mag = 30; s.my.reloadEnd = 0; s.my.rl = null; } s.fire(); T.step(0.05); }
      return { phase: s.phase, mag0, ...one, hp0, bodyD: hp0 - one.hp, hsD, dead: !e.alive, k: me.k, feed: document.getElementById('sd-feed').textContent, name: e.name, cash: s.cash[s.me] }; });
    C.ok(shoot.phase === 'live', `solo: the round didn't go live: ${shoot.phase}`);
    C.ok(shoot.mag === shoot.mag0 - 1, `solo: FIRE didn't use a round: ${shoot.mag0} -> ${shoot.mag}`);
    C.ok(shoot.bodyD > 15 && shoot.bodyD < 30, `solo: a body shot with the MONSTOR AR did ${shoot.bodyD} damage`);
    C.ok(/on/.test(shoot.hm), `solo: no hit marker: "${shoot.hm}"`);
    C.ok(shoot.hsD > shoot.bodyD * 1.5, `solo: a headshot (${shoot.hsD}) isn't much more than a body shot (${shoot.bodyD})`);
    C.ok(shoot.dead && shoot.k >= 1 && shoot.feed.includes(shoot.name.replace(/^🤖 /, '🤖')), `solo: shooting the bot down didn't count as a kill in the feed: ${JSON.stringify({ dead: shoot.dead, k: shoot.k, feed: shoot.feed })}`);
    C.ok(shoot.cash === 7600 + 300, `solo: the kill wasn't worth £300: ${shoot.cash}`);
    L('shoot ' + JSON.stringify(shoot));
    // ---- getting hurt: health, armour, the arc, the red edge
    const hurt = await ev(p, () => { const s = T.s(), me = s.mine(), e = T.enemies()[0], P = RS.player, from = new RS.THREE.Vector3(P.head.x + 4, 1.5, P.head.z);
      s.hostDamage('me', e.id, 30, false, from); T.step(0.05); const a = { hp: me.hp, arcs: document.querySelectorAll('#sd-dir .arc').length, flash: document.getElementById('sd-flash').className };
      me.ar = 50; s.hostDamage('me', e.id, 40, false, from); T.step(0.05); const b = { hp: me.hp, ar: me.ar };
      me.ar = 40; s.hostDamage('me', e.id, 50, false, from); T.step(0.1); const box = JSON.stringify(RS.hudExtras());
      return { ...a, b, low: document.getElementById('sd-vig').classList.contains('on'), hp2: me.hp, box }; });
    C.ok(hurt.hp === 70 && hurt.arcs >= 1 && /on/.test(hurt.flash), `solo: a 30 hit didn't leave 70 health with the red flash and a direction arc: ${JSON.stringify(hurt)}`);
    C.ok(hurt.b.hp === 54 && hurt.b.ar === 26, `solo: armour (50) didn't soak up 60% of a 40 hit: ${JSON.stringify(hurt.b)}`);
    C.ok(hurt.low, `solo: no low health red edge at ${hurt.hp2} health`);
    C.ok(/"box"/.test(hurt.box) && hurt.box.includes(`"big":"${Math.ceil(hurt.hp2)}"`) && /🦺/.test(hurt.box) && /💷/.test(hurt.box), `solo: the top-left box doesn't show health, armour and money: ${hurt.box}`);
    // ---- reload: the button, an empty gun (click, reloads itself), nothing spare
    const rl = await ev(p, () => { const s = T.s(); s.loadGun('monstor'); s.my.drawEnd = 0; s.my.mag = 7; s.my.reserve = 40; s.my.reloadEnd = 0; T.press('#sd-ui .reload'); const started = !!s.my.reloadEnd; const len = s.my.reloadLen; T.step(len + 0.1);
      const a = { started, len: +len.toFixed(2), mag: s.my.mag, reserve: s.my.reserve, hud: document.querySelector('#sd-ammo .num').textContent, mode: document.querySelector('#sd-ammo small').textContent };
      s.my.mag = 0; s.my.nextShot = 0; s.fire(); T.step(0.3); const auto = !!s.my.reloadEnd; T.step(2.5);
      s.my.mag = 0; s.my.reserve = 0; s.my.reloadEnd = 0; s.my.rl = null; s.my.nextShot = 0; s.fire(); T.step(0.1); const none = { reloading: !!s.my.reloadEnd, need: document.querySelector('#sd-ui .reload').className, pop: document.getElementById('sd-pop').textContent };
      // the ammo box: a tap flicks the fire mode
      s.my.reserve = 50; s.my.mag = 30; T.press('#sd-ammo'); T.step(0.1); const mode2 = s.fireMode();
      return { ...a, auto, none, mode2 }; });
    C.ok(rl.started && rl.len > 2.1 && rl.len < 2.5 && rl.mag === 30 && rl.reserve === 17, `solo: RELOAD (2.3s) didn't refill 7 -> 30 from 40 spare: ${JSON.stringify(rl)}`);
    C.ok(/30\s*\/\s*17/.test(rl.hud) && /AUTO/.test(rl.mode), `solo: the ammo HUD says "${rl.hud}" (${rl.mode}) not 30 / 17, AUTO`);
    C.ok(rl.auto, 'solo: firing an empty gun didn\'t start a reload');
    C.ok(!rl.none.reloading && /CLICK|AMMO/.test(rl.none.pop), `solo: an empty gun with nothing spare: ${JSON.stringify(rl.none)}`);
    C.ok(rl.mode2 === 'burst', `solo: tapping the ammo box didn't flick to burst: ${rl.mode2}`);
    // ---- every pick-up, laid in front of me
    const pk = await ev(p, () => { const s = T.s(), me = s.mine(), out = {}, P = RS.player; for (const q of s.pk) { q.on = false; q.back = 0; }      // (the map's own pick-ups out of the way: one by the spot I'm testing on was taken too)
      const lay = (k) => { const at = T.ahead(2.5), q = { k, x: at[0], z: at[1], y: s.floor(at[0], at[1]), on: true, back: 0 }; s.pk.push(q); return s.pk.length - 1; };
      const grab = (k) => { const i = lay(k), q = s.pk[i]; T.stand(q.x, q.z); T.step(0.3); const got = !q.on; T.stand(q.x + 0.01, q.z); return got; };
      s.loadGun('monstor'); s.my.reserve = 0; out.ammo = [grab('ammo'), s.my.reserve];
      me.hp = 40; out.burger = [grab('burger'), me.hp]; me.hp = 20; out.kebab = [grab('kebab'), me.hp]; me.hp = 100; out.fullFood = (() => { const i = lay('burger'), q = s.pk[i]; T.stand(q.x, q.z); T.step(0.3); const left = q.on; q.on = false; return left; })();
      me.ar = 0; out.armour = [grab('armour'), me.ar];
      out.reload = [grab('p_reload'), (() => { s.my.mag = 3; s.my.reserve = 50; s.my.reloadEnd = 0; s.doReload(); const l = s.my.reloadLen; T.step(l + 0.1); return +l.toFixed(2); })()];
      const sp0 = P.speedMul; out.speed = [grab('p_speed'), +(P.speedMul / sp0).toFixed(2)];
      out.dmg = grab('p_dmg'); out.defuse = grab('p_defuse'); out.ammoPerk = [grab('p_ammo'), s.my.mag, s.my.reserve];
      out.chips = JSON.stringify(RS.hudExtras().box.chips.map(c => c.t)); out.pop = document.getElementById('sd-pop').textContent;
      T.step(31, 1 / 10); out.after = Object.keys(s.my.perks).sort().join(','); out.speedAfter = +(P.speedMul / sp0).toFixed(2);
      return out; });
    C.ok(pk.ammo[0] && pk.ammo[1] === 90, `solo: the ammo box: ${JSON.stringify(pk.ammo)}`);
    C.ok(pk.burger[0] && pk.burger[1] === 75 && pk.kebab[0] && pk.kebab[1] === 90, `solo: food didn't heal (40+35, 20+70): ${JSON.stringify([pk.burger, pk.kebab])}`);
    C.ok(pk.fullFood, 'solo: food was eaten at full health');
    C.ok(pk.armour[0] && pk.armour[1] === 50, `solo: the stab vest: ${JSON.stringify(pk.armour)}`);
    C.ok(pk.reload[0] && pk.reload[1] > 1.0 && pk.reload[1] < 1.3, `solo: FAST HANDS didn't halve the reload: ${JSON.stringify(pk.reload)}`);
    C.ok(pk.speed[0] && pk.speed[1] === 1.3, `solo: MONSTOR RUSH didn't speed me up 30%: ${JSON.stringify(pk.speed)}`);
    C.ok(pk.dmg && pk.defuse && pk.ammoPerk[0] && pk.ammoPerk[1] === 60 && pk.ammoPerk[2] === 180, `solo: the other perks: ${JSON.stringify({ dmg: pk.dmg, defuse: pk.defuse, ammo: pk.ammoPerk })}`);
    C.ok(/⏱️ \d+s/.test(pk.chips) && /⚡ \d+s/.test(pk.chips) && /🌶️ \d+s/.test(pk.chips) && /PLIERS/.test(pk.chips), `solo: the perk timers aren't on the HUD: ${pk.chips}`);
    C.ok(pk.after === 'ammo,defuse' && pk.speedAfter === 1, `solo: the timed perks didn't wear off (left: ${pk.after}, speed x${pk.speedAfter})`);
    L('pick-ups ' + JSON.stringify(pk));
    // ---- the scoreboard (held on the score bar): everyone, my kill, an assist
    const sb = await ev(p, () => { const s = T.s(), me = s.mine(), e = T.enemies()[0], mate = T.mates()[0];
      s.hostDamage(e.id, s.me, 40, 0); s.hostKill(e.id, mate.id, false); T.step(0.1);
      const bar = document.querySelector('#sd-top .bar'); bar.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 9, isPrimary: true })); T.step(0.1);
      const el = document.getElementById('sd-board'), rows = el.querySelectorAll('tr.R, tr.B').length, mine = el.querySelector('tr.me'); return { on: el.classList.contains('on'), rows, F: s.F.size, a: me.a, cells: mine ? [...mine.querySelectorAll('td')].map(td => td.textContent) : [], feed: document.getElementById('sd-feed').textContent, bots: el.querySelectorAll('.bt').length }; });
    C.ok(sb.on && sb.rows === sb.F && sb.bots === sb.F - 1, `solo: holding the score bar didn't show everyone on the scoreboard (bots tagged): ${JSON.stringify(sb)}`);
    C.ok(sb.a === 1 && sb.cells[1] === '1' && sb.cells[3] === '1' && /£/.test(sb.cells[6]) && /\+ /.test(sb.feed), `solo: the scoreboard's kills / assists / money, or the assist in the feed: ${JSON.stringify(sb)}`);
    { const t = await textProblems(p, '#sd-board'); C.ok(!t.length, `phone: the scoreboard's text: ${JSON.stringify(t.slice(0, 3))}`); }
    if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + '/snd-board-phone.png' });
    const sbOff = await ev(p, () => { document.querySelector('#sd-top').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 9 })); return document.getElementById('sd-board').classList.contains('on'); });
    C.ok(!sbOff, 'solo: letting go of the score bar didn\'t hide the scoreboard');
    // ---- the bomb: carried by me (attacking), planted at A with the beeping speeding up
    const plant = await ev(p, () => { const s = T.s(), me = s.mine(); s.att = me.team; s.H.att = me.team; s.hostBomb({ st: 'carried', id: 'me' }); T.stand(s.M.A[0], s.M.A[1]); T.step(0.2);
      const shown = !document.querySelector('#sd-ui .act').hidden, label = document.querySelector('#sd-ui .act').textContent; T.press('#sd-ui .act', false); T.step(1.5); const mid = s.bomb.st, prog = document.getElementById('sd-prog').classList.contains('on'), inHands = !!(s.vm && s.vm.userData.actG.visible); T.step(2.0); T.release('#sd-ui .act'); T.step(0.1);
      return { shown, label, mid, prog, inHands, st: s.bomb.st, site: s.bomb.s, left: +(s.bombAt - s.clock).toFixed(1), gaps: [40, 20, 5, 1].map(l => +s.beepGap(l).toFixed(2)), top: document.getElementById('sd-top').textContent, face: s.faceWas }; });
    C.ok(plant.shown && /PLANT/.test(plant.label) && plant.mid === 'carried' && plant.prog && plant.inHands, `solo: PLANT wasn't offered at the site (the bomb in my hands), or it planted too soon: ${JSON.stringify(plant)}`);
    C.ok(plant.st === 'planted' && plant.site === 'A' && plant.left > 35 && plant.left <= 40 && /^00:\d\d$/.test(plant.face), `solo: holding PLANT for 3.2s didn't plant at A (with the seconds on its clock): ${JSON.stringify(plant)}`);
    C.ok(plant.gaps.every((g, i) => i === 0 || g < plant.gaps[i - 1]) && plant.gaps[0] > 0.9 && plant.gaps[3] < 0.2, `solo: the beeping doesn't speed up: ${plant.gaps}`);
    // ...it goes off: attackers win, everyone near it is out
    const boom = await ev(p, () => { const s = T.s(), me = s.mine(), sc0 = { ...s.sc }; s.cash[s.me] = s.H.cash[s.me] = 2000; const c0 = 2000; s.H.bombEnds = s.clock; T.step(0.2); return { st: s.bomb.st, phase: s.phase, win: s.lastEnd && s.lastEnd.win, why: s.lastEnd && s.lastEnd.why, mine: me.team, dead: !me.alive, sc0, sc: { ...s.sc }, earned: s.cash[s.me] - c0, splash: document.getElementById('sd-splash').textContent }; });
    C.ok(boom.st === 'boom' && boom.phase === 'post' && boom.win === boom.mine && boom.why === 'boom' && boom.dead, `solo: the bomb going off: ${JSON.stringify(boom)}`);
    C.ok(boom.earned >= 2500 && /MVP/.test(boom.splash) && /\+£/.test(boom.splash), `solo: the round win's money and MVP: ${JSON.stringify(boom)}`);
    // ---- round 2: the shop again (I went down: my guns are gone); this time I defend: a bot carries, it's dropped, a bot plants, I defuse
    const r2 = await ev(p, () => { const s = T.s(); T.step(8, 1 / 10); return { phase: s.phase, round: s.round, pick: document.getElementById('sd-pick').classList.contains('on'), alive: s.mine().alive, hp: s.mine().hp, P: s.my.slots.P && s.my.slots.P.g, gun: s.my.gun, cash: s.cash[s.me] }; });
    C.ok(r2.round === 2 && r2.phase === 'buy' && r2.pick && r2.alive && r2.hp === 100, `solo: round 2 didn't start with everyone back and the shop open: ${JSON.stringify(r2)}`);
    C.ok(!r2.P && r2.gun === 'ketchup', `solo: going down didn't lose me my guns: ${JSON.stringify(r2)}`);
    if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + '/snd-shop2-phone.png' });
    const def = await ev(p, () => { const s = T.s(), me = s.mine(); s.closePicker(); s.H.ends = s.clock; T.step(0.1); s.att = me.team === 'R' ? 'B' : 'R'; s.H.att = s.att;
      // a bot's carrying it: shot down, the bomb drops where it fell
      const car = T.enemies()[0]; s.hostBomb({ st: 'carried', id: car.id }); s.hostKill(car.id, 'me', false); T.step(0.05); const dropped = s.bomb.st;
      s.hostBomb({ st: 'planted', id: car.id, p: [s.M.B[0], s.M.B[1]], s: 'B', left: 40 }); s.H.bombEnds = s.clock + 40; T.stand(s.M.B[0] + 0.3, s.M.B[1]); T.step(0.2);
      const label = document.querySelector('#sd-ui .act').textContent, shown = !document.querySelector('#sd-ui .act').hidden; T.press('#sd-ui .act', false); T.step(3); const mid = s.bomb.st; T.step(3.8); T.release('#sd-ui .act');
      return { dropped, shown, label, mid, st: s.bomb.st, phase: s.phase, win: s.lastEnd && s.lastEnd.win, why: s.lastEnd && s.lastEnd.why, mine: me.team }; });
    C.ok(def.dropped === 'dropped', `solo: the carrier going down didn't drop the bomb: ${def.dropped}`);
    C.ok(def.shown && /DEFUSE/.test(def.label) && def.mid === 'planted' && def.st === 'defused' && def.win === def.mine && def.why === 'defused', `solo: defusing: ${JSON.stringify(def)}`);
    // ---- round 3: a dropped bomb picked up by walking over it (attacking); then the defenders wiped out
    const r3 = await ev(p, () => { const s = T.s(), me = s.mine(); T.step(8, 1 / 10); s.closePicker(); s.att = me.team; s.H.att = me.team; s.H.ends = s.clock; T.step(0.1);
      const at = T.ahead(3); s.hostBomb({ st: 'dropped', p: [at[0], at[1]] }); T.step(0.1); T.stand(at[0], at[1]); T.step(0.8); const carry = s.bomb.st === 'carried' && s.bomb.id === 'me';
      for (const e of T.enemies()) s.hostKill(e.id, 'me', false); T.step(0.1); return { round: s.round, carry, phase: s.phase, why: s.lastEnd && s.lastEnd.why, win: s.lastEnd && s.lastEnd.win, mine: me.team, att: s.att, multi: document.getElementById('sd-multi').textContent }; });
    C.ok(r3.round === 3 && r3.carry, `solo: walking over the dropped bomb didn't pick it up: ${JSON.stringify(r3)}`);
    C.ok(r3.phase === 'post' && r3.why === 'wiped' && r3.win === r3.mine, `solo: wiping out the defenders didn't win the round: ${JSON.stringify(r3)}`);
    C.ok(/ALL YOU CAN EAT|QUAD|TRIPLE/.test(r3.multi), `solo: no multi-kill for the wipe: ${JSON.stringify(r3)}`);
    // ---- round 4: half time (the sides swap, the money's back to the start), time runs out with no plant: the defenders win
    const r4 = await ev(p, () => { const s = T.s(), att3 = s.att; T.step(8, 1 / 10); s.closePicker(); const att4 = s.H.att, cash = s.cash[s.me]; s.H.ends = s.clock; T.step(0.1); s.H.ends = s.clock; T.step(0.1);
      return { round: s.round, att3, att4, cash, why: s.lastEnd && s.lastEnd.why, win: s.lastEnd && s.lastEnd.win, sc: { ...s.sc } }; });
    C.ok(r4.round === 4 && r4.att4 !== r4.att3 && r4.cash === 2000, `solo: the sides didn't swap (and the money reset) at half time: ${JSON.stringify(r4)}`);
    C.ok(r4.why === 'time' && r4.win !== r4.att4, `solo: running the clock out didn't win it for the defenders: ${JSON.stringify(r4)}`);
    // ---- on to the end: the match, the scoreboard, the receipt
    const end = await ev(p, async () => { const s = T.s(); for (let r = 0; r < 6 && s.phase !== 'over'; r++) { T.step(8, 1 / 10); if (s.phase === 'over') break; s.closePicker(); s.H.ends = s.clock; T.step(0.1); for (const e of T.enemies()) s.hostKill(e.id, 'me', false); T.step(0.1); }
      const over = s.phase, board = document.getElementById('sd-board').classList.contains('on'); T.step(7, 1 / 10); return { over, board, sc: s.sc, win: s.win, receipt: document.body.classList.contains('gameover'), lines: s.summary().map(l => l.join(' ')).join(' | '), running: RS.director.running }; });
    C.ok(end.over === 'over' && Math.max(end.sc.R, end.sc.B) === end.win && end.board, `solo: the match didn't end at ${end.win} rounds with the scoreboard up: ${JSON.stringify(end)}`);
    C.ok(end.receipt && /SEARCH & DESTROY/.test(end.lines) && /KILLS \/ DEATHS \/ ASSISTS/.test(end.lines) && /ROUND MVPS/.test(end.lines), `solo: no receipt at the end: ${JSON.stringify(end)}`);
    L('end ' + JSON.stringify(end));
    C.ok(!p.errors.length, 'solo: page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } catch (e) { C.ok(false, `solo: ${e.message.slice(0, 400)}`); }
  await p.context().close();
  // ---- the phone's HUD (a fresh game): live with a primary, a gun to take, then out (the recap, the look at who got you) and watching
  const q = await soloGame(b, { place: 'pub' });
  try {
    await ev(q, () => { const s = T.s(); T.rich(); s.pickGun('monstor'); s.closePicker(); s.botsFrozen = true; s.H.ends = s.clock; T.step(0.5); const h = RS.player.head; s.hostDrop('baguette', h.x + 0.4, h.z); T.step(0.2); });
    await sleep(3500); await ev(q, () => { T.clearPops(); T.step(0.3); });
    const t = await textProblems(q), bt = await btnProblems(q, '#sd-ui');
    C.ok(!t.length, `phone: text on text in the game: ${JSON.stringify(t.slice(0, 3))}`); C.ok(!bt.length, `phone: the game's buttons: ${JSON.stringify(bt.slice(0, 3))}`);
    const big = await ev(q, () => { const r = (s) => document.querySelector(s).getBoundingClientRect(); return { fire: r('#sd-ui .fire').width, reload: r('#sd-ui .reload').width, stick: r('#stick').right, rl: r('#sd-ui .reload').left, swap: !document.querySelector('#sd-ui .swap').hidden, aim: !document.querySelector('#sd-ui .aim').hidden, take: document.querySelector('#sd-ui .act').textContent }; });
    C.ok(big.fire >= 96 && big.reload >= 66 && big.rl > big.stick, `phone: FIRE and RELOAD too small or over the joystick: ${JSON.stringify(big)}`);
    C.ok(big.swap && big.aim && /TAKE/.test(big.take), `phone: SWAP, AIM and TAKE (a gun on the floor) aren't all there: ${JSON.stringify(big)}`);
    if (process.env.SHOTS) { await q.screenshot({ path: process.env.SHOTS + '/snd-hud-phone.png' }); }
    const dd = await ev(q, () => { const s = T.s(), e = T.enemies()[0]; s.hostDamage('me', e.id, 30, 0); s.hostKill('me', e.id, true); T.step(0.5); return { cam: !!s.deathCam && !!s.viewCam(), rec: document.getElementById('sd-splash').textContent }; });
    C.ok(dd.cam && /THEY DID/.test(dd.rec) && /THEY'RE ON/.test(dd.rec), `phone: going down didn't show who got me (the recap and a look at them): ${JSON.stringify(dd)}`);
    await sleep(3500); await ev(q, () => { T.clearPops(); T.step(3); });
    const dead = await ev(q, () => ({ watch: !document.querySelector('#sd-ui .watch').hidden, fire: !document.querySelector('#sd-ui .fire').hidden, spect: T.s().spect, cam: !!T.s().viewCam(), deathCam: !!T.s().deathCam }));
    C.ok(dead.watch && !dead.fire && dead.spect && dead.cam && !dead.deathCam, `phone: out of the round, not watching a team-mate: ${JSON.stringify(dead)}`);
    const t2 = await textProblems(q), bt2 = await btnProblems(q, '#sd-ui');
    C.ok(!t2.length, `phone (watching): text on text: ${JSON.stringify(t2.slice(0, 3))}`); C.ok(!bt2.length, `phone (watching): buttons: ${JSON.stringify(bt2.slice(0, 3))}`);
    C.ok(!q.errors.length, 'phone: page errors: ' + [...new Set(q.errors)].slice(0, 3).join(' | '));
  } catch (e) { C.ok(false, `phone: ${e.message.slice(0, 300)}`); }
  await q.context().close();
}

// ------------------------------------------------------------------ a phone on its side
async function phoneSide(b, C) {
  const p = await soloGame(b, { place: 'shop', width: 844, height: 390 });
  try {
    await sleep(600); const t = await textProblems(p, '#sd-pick'), bt = await btnProblems(p, '#sd-pick');
    C.ok(!t.length, `phone on its side: the shop's text: ${JSON.stringify(t.slice(0, 3))}`); C.ok(!bt.length, `phone on its side: the shop's buttons: ${JSON.stringify(bt.slice(0, 3))}`);
    if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + '/snd-shop-side.png' });
    await ev(p, () => { const s = T.s(); s.pickGun('cheese'); s.closePicker(); s.botsFrozen = true; s.H.ends = s.clock; T.step(0.5); }); await sleep(3500); await ev(p, () => { T.clearPops(); T.step(0.3); });
    const t2 = await textProblems(p), bt2 = await btnProblems(p, '#sd-ui');
    C.ok(!t2.length, `phone on its side: text on text: ${JSON.stringify(t2.slice(0, 3))}`); C.ok(!bt2.length, `phone on its side: buttons: ${JSON.stringify(bt2.slice(0, 3))}`);
    await ev(p, () => T.s().showBoard(true)); const t3 = await textProblems(p, '#sd-board'); C.ok(!t3.length, `phone on its side: the scoreboard's text: ${JSON.stringify(t3.slice(0, 3))}`); await ev(p, () => T.s().showBoard(false));
    if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + '/snd-hud-side.png' });
    C.ok(!p.errors.length, 'phone on its side: page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } catch (e) { C.ok(false, `phone on its side: ${e.message.slice(0, 300)}`); }
  await p.context().close();
}

// ------------------------------------------------------------------ a computer: keys and the mouse
async function pc(b, C) {
  const p = await soloGame(b, { place: 'pub', width: 1280, height: 720, mobile: false });
  try {
    await sleep(600); const t = await textProblems(p, '#sd-pick'), bt = await btnProblems(p, '#sd-pick');
    C.ok(!t.length, `pc: the shop's text: ${JSON.stringify(t.slice(0, 3))}`); C.ok(!bt.length, `pc: the shop's buttons: ${JSON.stringify(bt.slice(0, 3))}`);
    await p.keyboard.press('Digit2'); await ev(p, () => T.step(0.1));
    const k = await ev(p, () => ({ gun: T.s().my.gun, open: T.s().pickOpen }));
    C.ok(k.gun === 'beans' && k.open, `pc: 2 in the shop didn't buy the bean shotgun: ${JSON.stringify(k)}`);
    await p.keyboard.press('KeyB'); await ev(p, () => { const s = T.s(); s.botsFrozen = true; s.H.ends = s.clock; T.step(0.3); T.rich(); s.loadGun('monstor'); s.my.drawEnd = 0; });
    // R reloads, F fires, a held mouse button fires, Q swaps, X flicks the fire mode, T inspects, TAB the scoreboard, the right button aims, E held plants
    await ev(p, () => { T.s().my.mag = 5; }); await p.keyboard.press('KeyR'); const r1 = await ev(p, () => !!T.s().my.reloadEnd); await ev(p, () => T.step(2.5));
    const m0 = await ev(p, () => T.s().my.mag); await p.keyboard.down('KeyF'); await ev(p, () => T.step(0.6)); await p.keyboard.up('KeyF'); const m1 = await ev(p, () => T.s().my.mag);
    const box = await ev(p, () => { const r = RS.renderer.domElement.getBoundingClientRect(); return [r.left + r.width * 0.3, r.top + r.height * 0.4]; });
    await p.mouse.move(box[0], box[1]); await p.mouse.down(); await ev(p, () => T.step(0.5)); await p.mouse.up(); const m2 = await ev(p, () => T.s().my.mag);
    C.ok(r1 && m0 === 30, `pc: R didn't reload (${r1}, ${m0})`); C.ok(m1 < m0 - 2, `pc: holding F didn't fire the automatic: ${m0} -> ${m1}`); C.ok(m2 < m1 - 2, `pc: holding the mouse button didn't fire: ${m1} -> ${m2}`);
    await p.keyboard.press('KeyQ'); await ev(p, () => T.step(0.6)); const q1 = await ev(p, () => T.s().my.gun); await p.keyboard.press('KeyQ'); await ev(p, () => T.step(0.8)); const q2 = await ev(p, () => T.s().my.gun);
    await p.keyboard.press('KeyX'); const md = await ev(p, () => T.s().fireMode());
    await p.keyboard.press('KeyT'); await ev(p, () => T.step(0.2)); const insp = await ev(p, () => !!T.s().my.insp);
    await p.keyboard.down('Tab'); const tab = await ev(p, () => document.getElementById('sd-board').classList.contains('on')); { const tt = await textProblems(p, '#sd-board'); C.ok(!tt.length, `pc: the scoreboard's text: ${JSON.stringify(tt.slice(0, 3))}`); } await p.keyboard.up('Tab'); const tabOff = await ev(p, () => !document.getElementById('sd-board').classList.contains('on'));
    await p.mouse.down({ button: 'right' }); await ev(p, () => T.step(0.4)); const ads = await ev(p, () => T.s().my.adsK); await p.mouse.up({ button: 'right' }); await ev(p, () => T.step(0.4)); const ads2 = await ev(p, () => T.s().my.adsK);
    C.ok(q1 !== 'monstor' && q2 === 'monstor', `pc: Q didn't swap to the sidearm and back: ${q1} ${q2}`); C.ok(md === 'burst', `pc: X didn't flick to burst: ${md}`); C.ok(insp, 'pc: T didn\'t inspect');
    C.ok(tab && tabOff, `pc: TAB (held) didn't show the scoreboard: ${tab} ${tabOff}`); C.ok(ads === 1 && ads2 === 0, `pc: the right mouse button (held) didn't aim: ${ads} ${ads2}`);
    await ev(p, () => { const s = T.s(), me = s.mine(); s.att = me.team; s.H.att = me.team; s.hostBomb({ st: 'carried', id: 'me' }); T.stand(s.M.B[0], s.M.B[1]); T.step(0.1); });
    await p.keyboard.down('KeyE'); await ev(p, () => T.step(3.6)); await p.keyboard.up('KeyE'); const st = await ev(p, () => T.s().bomb.st);
    C.ok(st === 'planted', `pc: holding E at the site didn't plant: ${st}`);
    await sleep(3500); await ev(p, () => { T.clearPops(); T.step(0.3); });
    const t2 = await textProblems(p), bt2 = await btnProblems(p, '#sd-ui');
    C.ok(!t2.length, `pc: text on text: ${JSON.stringify(t2.slice(0, 3))}`); C.ok(!bt2.length, `pc: buttons: ${JSON.stringify(bt2.slice(0, 3))}`);
    if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + '/snd-pc.png' });
    C.ok(!p.errors.length, 'pc: page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } catch (e) { C.ok(false, `pc: ${e.message.slice(0, 300)}`); }
  await p.context().close();
}

// ------------------------------------------------------------------ the Quest
async function quest(b, C) {
  const p = await newPage(b, { width: 700, height: 500, xr: true });
  try {
    await p.goto('http://game.local/index.html?go=1&place=garden&mode=snd');
    await p.waitForFunction(() => window.RS && document.body.classList.contains('ready'), null, { timeout: 180000 });
    await p.waitForFunction(() => !document.querySelector('#loadscreen.on'), null, { timeout: 120000 }).catch(() => {});
    await ev(p, () => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); RS.renderer.xr.setFramebufferScaleFactor(0.12); window.__f = 0; RS.onFrame.push(() => { window.__f++; }); document.getElementById('enter-vr').click(); });
    await p.waitForFunction(() => RS.renderer.xr.isPresenting && RS.director.snd, null, { timeout: 60000 });
    await ev(p, HELP); await ev(p, () => { T.s().startT = 0; });
    const r = await ev(p, async () => { const s = T.s(), out = {}, wait = (t) => new Promise(res => setTimeout(res, t)), frames = async (n) => { const f0 = window.__f; for (let i = 0; i < 400 && window.__f < f0 + n; i++) await wait(25); };
      RS.renderer.render = () => {}; for (let i = 0; i < 200 && s.phase !== 'buy'; i++) await frames(1);
      await frames(2); out.panel = !!(s.panel.open && s.panel.cur && s.panel.cur.sdPick); out.dom = document.getElementById('sd-pick').classList.contains('on');
      // the controller points at the bean shotgun's card (second on the top row) and pulls the trigger
      s.panel.input('move', 250, 150); s.panel.input('down', 250, 150); await frames(3); out.gun = s.my.gun; out.closed = !s.panel.open;
      s.botsFrozen = true; s.H.ends = s.clock; await frames(3); out.phase = s.phase;
      const c = window.xrd && window.xrd.controllers && window.xrd.controllers.right, lc = window.xrd && window.xrd.controllers && window.xrd.controllers.left; out.hasCtl = !!(c && c.updateButtonValue);
      out.vrGun = !!(s.vrGun && s.vrGun.parent && s.vrGun.visible); out.gunOnCtl = !!(s.vrGun && s.vrGun.parent && s.vrGun.parent.type !== 'Scene');
      s.loadGun('monstor'); s.my.drawEnd = 0; await frames(3); const m0 = s.my.mag;
      if (out.hasCtl) { c.updateButtonValue('trigger', 1); await frames(8); c.updateButtonValue('trigger', 0); await frames(2); }
      out.fired = m0 - s.my.mag;
      if (out.hasCtl) { c.updateButtonValue('a-button', 1); await frames(2); c.updateButtonValue('a-button', 0); await frames(2); }
      out.reloading = !!s.my.reloadEnd || s.my.mag === m0; s.my.rl = null; s.my.reloadEnd = 0;
      if (lc && lc.updateButtonValue) { lc.updateButtonValue('x-button', 1); await frames(2); lc.updateButtonValue('x-button', 0); await frames(3); out.swapped = s.my.gun; lc.updateButtonValue('x-button', 1); await frames(2); lc.updateButtonValue('x-button', 0); await frames(12); out.back = s.my.gun;
        // the left hand on the front of the gun, holding grip: aimed with both hands
        s.my.drawEnd = 0; await frames(2); const L = (RS.player.hands || []).find(h => h.handedness === 'left' && h.ctrl); if (L && s.vrGun) { s.vrGun.updateMatrixWorld(true); const fore = s.vrGun.localToWorld(s.vrGun.userData.model.fore.clone()), lp = L.ctrl.parent.worldToLocal(fore); lc.position.set(lp.x, lp.y, lp.z); lc.updateButtonValue('squeeze', 1); await frames(6); out.twoHand = !!s.twoHand; lc.updateButtonValue('squeeze', 0); await frames(3); out.oneHand = !s.twoHand; } }
      out.box = JSON.stringify(RS.hudExtras()); out.laser = s.laser.visible;
      return out; });
    C.ok(r.panel && !r.dom, `quest: the shop isn't on a panel in the headset: ${JSON.stringify(r)}`);
    C.ok(r.gun === 'beans' && r.closed, `quest: pointing at the shotgun and pulling the trigger didn't buy it: ${JSON.stringify(r)}`);
    C.ok(r.vrGun && r.gunOnCtl, `quest: no gun on the right controller: ${JSON.stringify(r)}`);
    if (r.hasCtl) { C.ok(r.fired >= 1, `quest: the trigger didn't fire: ${JSON.stringify(r)}`); C.ok(r.reloading, `quest: A didn't reload: ${JSON.stringify(r)}`);
      C.ok(r.swapped && r.swapped !== 'monstor' && r.back === 'monstor', `quest: X didn't swap guns: ${JSON.stringify(r)}`); C.ok(r.twoHand && r.oneHand, `quest: the left hand on the front (holding grip) didn't hold it with both hands: ${JSON.stringify(r)}`); }
    C.ok(/"box"/.test(r.box) && /❤/.test(r.box) && /🥫/.test(r.box), `quest: the wrist box hasn't got health and ammo: ${r.box}`);
    console.log(`  quest: ${JSON.stringify({ ...r, box: undefined })}`);
    C.ok(!p.errors.length, 'quest: page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } catch (e) { C.ok(false, `quest: ${e.message.slice(0, 300)}`); }
  await p.context().close();
}

// ------------------------------------------------------------------ two real games in a room
async function mp(C) {
  const host = await startRoomHost(), b = await launch();
  try {
    const WHO = [['HOSTY', 'lewis'], ['GUESTY', 'chloe']], pages = [];
    for (const [name, ch] of WHO) { const p = await newPage(b, { width: 480, height: 360 }); p.pname = name; p.ch = ch; pages.push(p); await p.goto('http://game.local/index.html?relay=' + encodeURIComponent(host.url), { timeout: 240000 }); await p.waitForTimeout(1200); }
    const cl = (p, s) => ev(p, (s) => document.querySelector(s).click(), s);
    const join = async (p, code) => { await cl(p, '.playbtn'); await sleep(400); await cl(p, '#pick-multi'); await sleep(400);
      await ev(p, ([n, c]) => { document.querySelector('#mp-myname').value = n; document.querySelector(`#char-grid .mate[data-id="${c}"]`).click(); }, [p.pname, p.ch]); await cl(p, '#char-next'); await sleep(400);
      if (!code) { await cl(p, '#mp-host2'); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.code && ronnieMP.net.status === 'on', null, { timeout: 60000 }); return ev(p, () => ronnieMP.net.code); }
      await ev(p, (c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on', null, { timeout: 60000 }); };
    const [H, G] = pages, code = await join(H); await join(G, code);
    await cl(H, '#room-go'); await sleep(400); await ev(H, () => document.querySelector('.scene[data-id="garden"]').click()); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="place"] .bigbtn').click()); await sleep(500);
    await ev(H, () => { const f = () => document.querySelector('.flip[data-id="roam"]'); f() && f().click(); }); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="mode"] .bigbtn').click()); await sleep(500);
    await ev(G, () => { const m = window.ronnieMP; if (m && m.role === 'join' && !m.ready) document.querySelector('#room-ready').click(); }); await sleep(1500); await cl(H, '#go');
    for (const p of pages) await p.waitForFunction(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); const st = document.getElementById('start'), inGame = window.RS && document.body.classList.contains('ready') && st && st.classList.contains('gone');
      if (inGame) { const bt = document.querySelector('#play-flat'); if (bt && bt.offsetParent) bt.click(); } return inGame && !RS.player.menuLock; }, null, { timeout: 300000, polling: 700 });
    await ev(H, () => RS.newGame('snd'));
    for (const p of pages) await p.waitForFunction(() => { for (const id of ['#intro-ready', '#ui-intro-ready', '.howto-ready']) { const r = document.querySelector(id); if (r && r.offsetParent) r.click(); } return window.RS && RS.director.snd; }, null, { timeout: 240000, polling: 700 });
    for (const p of pages) { await ev(p, HELP); await ev(p, () => { RS.renderer.__render = RS.renderer.render; RS.renderer.render = () => {}; }); }
    await ev(H, () => { T.s().startT = 0; });
    for (const p of pages) await p.waitForFunction(() => T.s().phase === 'buy', null, { timeout: 90000 }).catch(() => C.ok(false, `mp: ${p.pname} never got to the shop`));
    await sleep(1500);
    // ---- the same full teams on both
    const team = (p) => ev(p, () => [...T.s().F.values()].map(f => f.id + ':' + f.team).sort().join(','));
    const tH = await team(H), tG = await team(G); C.ok(tH && tH === tG, `mp: the teams differ: ${tH} / ${tG}`);
    const ids = await ev(H, () => ({ me: T.s().me, guest: [...RS.net.players.keys()][0], teams: Object.fromEntries([...T.s().F.values()].map(f => [f.id, f.team])), att: T.s().att, n: T.s().F.size, bots: [...T.s().F.values()].filter(f => f.bot).length }));
    C.ok(ids.teams[ids.me] !== ids.teams[ids.guest], `mp: the two players are on the same side (humans should be split): ${JSON.stringify(ids.teams)}`);
    C.ok(ids.n === 8 && ids.bots === 6, `mp: two people in Lewis's garden aren't filled up to 4 a side with bots: ${JSON.stringify(ids)}`);
    // ---- the guest's buy reaches the host (and comes back with their money)
    const gp = await ev(G, () => { const o = document.getElementById('sd-pick').classList.contains('on'); document.querySelector('#sd-pick .card[data-g="cheese"]').click(); return o; });
    C.ok(gp, 'mp: the guest has no shop');
    const hg = await H.waitForFunction((id) => T.s().F.get(id).load.P === 'cheese' && T.s().F.get(id).gun === 'cheese', ids.guest, { timeout: 30000 }).then(() => true, () => false); C.ok(hg, 'mp: the host never heard the guest bought the cheese SMG');
    const gc = await G.waitForFunction(() => T.s().my.gun === 'cheese' && T.s().cash[T.s().me] === 800, null, { timeout: 30000 }).then(() => true, () => false); C.ok(gc, 'mp: the guest never got the cheese SMG (and £800 back)');
    // ---- live; a bot of the other side stood in front of the guest, held still
    await ev(H, () => { const s = T.s(); s.botsFrozen = true; s.H.ends = s.clock; });
    for (const p of pages) await p.waitForFunction(() => T.s().phase === 'live', null, { timeout: 60000 }).catch(() => C.ok(false, `mp: ${p.pname} never went live`));
    await ev(G, () => { const s = T.s(); s.closePicker(); });
    const target = await ev(H, (gid) => { const s = T.s(), gt = s.F.get(gid).team, e = [...s.F.values()].find(f => f.bot && f.team !== gt && f.alive), q = s.posOf(gid, new RS.THREE.Vector3()), nav = RS.room.nav;
      let c = null; for (let a = 0; a < 6.3 && !c; a += 0.3) { const k = nav.nearestFree(q.x + Math.cos(a) * 3.5, q.z + Math.sin(a) * 3.5), cc = nav.center(k); if (Math.hypot(cc.x - q.x, cc.y - q.z) > 2 && s.canSee(new RS.THREE.Vector3(q.x, 1.5, q.z), new RS.THREE.Vector3(cc.x, s.floor(cc.x, cc.y) + 1.1, cc.y))) c = cc; }
      if (!c) c = nav.center(nav.nearestFree(q.x + 3, q.z)); const b = s.bots.get(e.id); b.x = c.x; b.z = c.y; return { id: e.id, x: c.x, z: c.y }; }, ids.guest);
    await G.waitForFunction((t) => { const bp = T.s().botPose.get(t.id); return bp && Math.hypot(bp.x - t.x, bp.z - t.z) < 0.3; }, target, { timeout: 30000 }).catch(() => C.ok(false, 'mp: the bot\'s move never reached the guest'));
    await ev(H, () => { const s = T.s(); s._shots = 0; const rs = s.remoteShot.bind(s); s.remoteShot = (id, m) => { if (id !== s.me && !s.F.get(id).bot) s._shots++; rs(id, m); }; });
    const hit = await until(G, (t) => { const s = T.s(); if (T.s().F.get(t.id).hp < 100) return true; for (let i = 0; i < 3; i++) { const h = s.headOf(t.id, new RS.THREE.Vector3()); T.aim(h.x, h.y - 0.5, h.z); s.my.nextShot = 0; s.my.drawEnd = 0; s.fire(); } return false; }, target, { timeout: 30000, every: 800 });
    const hitH = await H.waitForFunction((id) => T.s().F.get(id).hp < 100, target.id, { timeout: 30000 }).then(() => true, () => false);
    const hpH = await ev(H, (id) => T.s().F.get(id).hp, target.id); await sleep(1500); const hpG = await ev(G, (id) => T.s().F.get(id).hp, target.id);
    C.ok(hit && hitH && hpH === hpG, `mp: the guest's shots on the bot: host sees ${hpH}, guest sees ${hpG}`);
    C.ok((await ev(H, () => T.s()._shots)) >= 1, 'mp: the host never saw the guest\'s shots');
    // ---- the host's referee hurts the guest: the guest's own health and its red flash
    await ev(H, ([gid, bid]) => { T.s().hostDamage(gid, bid, 25, false, new RS.THREE.Vector3(0, 1.5, 0)); }, [ids.guest, target.id]);
    const gh = await G.waitForFunction(() => T.s().mine().hp === 75, null, { timeout: 30000 }).then(() => true, () => false); C.ok(gh, 'mp: the guest\'s health didn\'t drop to 75');
    // ---- the guest walks onto a pick-up: the host gives it them (stood on it till the host's heard where they are)
    const pki = await ev(G, () => { const s = T.s(), i = s.pk.findIndex(q => q.on && q.k === 'armour'); const j = i >= 0 ? i : s.pk.findIndex(q => q.on); return { i: j, k: s.pk[j].k }; });
    const took = await until(G, (i) => { const s = T.s(), q = s.pk[i]; if (!q.on) return true; T.stand(q.x, q.z); return false; }, pki.i, { timeout: 40000, every: 700 });
    const tookH = await H.waitForFunction((i) => !T.s().pk[i].on, pki.i, { timeout: 30000 }).then(() => true, () => false);
    C.ok(took && tookH, `mp: the guest's pick-up (${pki.k}) wasn't taken on both games (host ${tookH}, guest ${!!took})`);
    // ---- a gun on the floor by the guest: they take it (the host gives it them)
    const dropAt = await ev(G, () => { const h = RS.player.head; return [h.x, h.z]; });
    await ev(H, (at) => T.s().hostDrop('baguette', at[0] + 0.3, at[1]), dropAt);
    const grabbed = await until(G, (at) => { const s = T.s(); if (s.my.slots.P && s.my.slots.P.g === 'baguette') return true; T.stand(at[0] + 0.3, at[1]); s.grabT = 0; s.startAct(); s.endAct(); return false; }, dropAt, { timeout: 40000, every: 700 });
    const grabH = await H.waitForFunction((id) => T.s().F.get(id).load.P === 'baguette', ids.guest, { timeout: 30000 }).then(() => true, () => false);
    C.ok(grabbed && grabH, `mp: the guest taking the baguette off the floor (guest ${!!grabbed}, host ${grabH})`);
    // ---- the attacker plants, the defender defuses, both games see it
    const attP = ids.teams[ids.me] === ids.att ? H : G, defP = attP === H ? G : H, attId = attP === H ? ids.me : ids.guest;
    await ev(H, (id) => T.s().hostBomb({ st: 'carried', id }), attId);
    await attP.waitForFunction(() => T.s().bomb.st === 'carried' && T.s().bomb.id === T.s().me, null, { timeout: 30000 }).catch(() => C.ok(false, 'mp: the attacker never got the bomb'));
    await ev(attP, () => { const s = T.s(); T.stand(s.M.A[0], s.M.A[1]); });
    await sleep(1200); await ev(attP, () => { T.s().actHeld = true; T.s().startAct(); });
    const planted = await defP.waitForFunction(() => T.s().bomb.st === 'planted', null, { timeout: 60000 }).then(() => true, () => false);
    C.ok(planted, `mp: ${attP.pname} held PLANT at A but ${defP.pname} never saw it planted`);
    if (planted) { await ev(defP, () => { const s = T.s(); T.stand(s.bomb.p[0], s.bomb.p[1]); }); await sleep(1200); await ev(defP, () => { T.s().actHeld = true; T.s().startAct(); });
      const defused = await attP.waitForFunction(() => T.s().phase === 'post' && T.s().lastEnd && T.s().lastEnd.why === 'defused', null, { timeout: 60000 }).then(() => true, () => false);
      const sc = []; for (const p of pages) sc.push(await ev(p, () => JSON.stringify(T.s().sc)));
      C.ok(defused && sc[0] === sc[1], `mp: the defuse didn't end the round the same on both: ${defused} ${sc.join(' / ')}`); }
    // ---- round 2: the shop on both; the bots drawn on the guest
    await ev(H, () => { T.s().H.nextAt = T.s().clock; });
    for (const p of pages) await p.waitForFunction(() => T.s().round === 2 && T.s().phase === 'buy', null, { timeout: 60000 }).catch(() => C.ok(false, `mp: ${p.pname} never got to round 2`));
    for (const p of pages) C.ok(await ev(p, () => document.getElementById('sd-pick').classList.contains('on') || !RS.player.flatMode), `mp: ${p.pname} has no shop in round 2`);
    const pup = await ev(G, () => { const s = T.s(); return { bots: [...s.F.values()].filter(f => f.bot).length, puppets: s.puppets.size }; });
    C.ok(pup.bots >= 6 && pup.puppets === pup.bots, `mp: the guest doesn't draw the bots: ${JSON.stringify(pup)}`);
    // ---- to the end: both have the result, the guest its own receipt
    await ev(H, async () => { const s = T.s(); for (let r = 0; r < 30 && s.phase !== 'over'; r++) { if (s.phase === 'buy') s.H.ends = s.clock; else if (s.phase === 'live') s.hostEnd(s.att, 'wiped'); else if (s.phase === 'post') s.H.nextAt = s.clock; RS.sim(1 / 30); await new Promise(r => setTimeout(r, 300)); } });
    for (const p of pages) await p.waitForFunction(() => T.s().phase === 'over', null, { timeout: 60000 }).catch(() => C.ok(false, `mp: ${p.pname} never got the result`));
    await ev(H, () => { T.s().overAt = T.s().clock - 10; });
    const rec = await G.waitForFunction(() => document.body.classList.contains('gameover'), null, { timeout: 60000 }).then(() => true, () => false);
    const gl = await ev(G, () => T.s().summary().map(l => l.join(' ')).join(' | '));
    C.ok(rec && /SEARCH & DESTROY/.test(gl) && /YOUR TEAM/.test(gl), `mp: the guest has no receipt of their own: ${rec} ${gl.slice(0, 200)}`);
    for (const p of pages) C.ok(!p.errors.length, `mp: ${p.pname}: page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
    for (const p of pages) { const cr = p.crashes.filter(c => !['start', 'hang'].includes(c.k)); C.ok(!cr.length, `mp: ${p.pname}: crash reports: ` + cr.slice(0, 2).map(c => JSON.stringify(c).slice(0, 200)).join(' | ')); }
    console.log(`  mp: teams ${tH}; guest's hit left the bot on ${hpH}; ${pki.k} picked up; final ${await ev(H, () => JSON.stringify(T.s().sc))}`);
  } catch (e) { C.ok(false, `mp: ${e.message.slice(0, 400)}`); }
  finally { await b.close(); await host.close(); }
}

// ------------------------------------------------------------------ the developer test room's fake players
async function fakes(C) {
  const host = await startRoomHost(), b = await launch(), N = +(process.env.FAKES || 3);
  try {
    const p = await newPage(b, { width: 640, height: 400 });
    await p.addInitScript(() => { try { sessionStorage.setItem('rs_devmp_ok', '1'); } catch (e) {} });
    await p.goto(`http://game.local/index.html?devmp=${N}&relay=${encodeURIComponent(host.url)}`, { timeout: 240000 });
    await p.waitForFunction((n) => { const m = window.ronnieMP; return m && m.net && m.net.status === 'on' && m.net.players.size === n && [...m.net.players.values()].every(q => q.ready && q.char); }, N, { timeout: 90000, polling: 500 });
    await ev(p, () => document.getElementById('room-go').click()); await sleep(400);
    await ev(p, () => { document.querySelector('.scene[data-id="garden"]').click(); document.querySelector('.screen[data-s="place"] .bigbtn').click(); }); await sleep(500);
    await ev(p, () => { const f = document.querySelector('.flip[data-id="roam"]'); f && f.click(); document.querySelector('.screen[data-s="mode"] .bigbtn').click(); }); await sleep(500);
    await ev(p, () => document.getElementById('go').click());
    await p.waitForFunction(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); const st = document.getElementById('start'), inGame = window.RS && document.body.classList.contains('ready') && st && st.classList.contains('gone');
      if (inGame) { const bt = document.querySelector('#play-flat'); if (bt && bt.offsetParent) bt.click(); } return inGame && !RS.player.menuLock; }, null, { timeout: 240000, polling: 700 });
    await ev(p, () => { RS.renderer.__render = RS.renderer.render; RS.renderer.render = () => {}; });
    await ev(p, () => RS.newGame('snd')); await p.waitForFunction(() => RS.director.snd, null, { timeout: 60000 }); await ev(p, HELP);
    await ev(p, () => { T.s().startT = 0; }); await p.waitForFunction(() => T.s().phase === 'buy', null, { timeout: 60000 });
    // the seats: everyone in the room has one, bots fill the rest (Lewis's garden: four a side)
    const seats = await ev(p, () => { const s = T.s(), F = [...s.F.values()]; return { R: F.filter(f => f.team === 'R').length, B: F.filter(f => f.team === 'B').length, bots: F.filter(f => f.bot).length, people: F.filter(f => !f.bot).length }; });
    C.ok(seats.R === 4 && seats.B === 4 && seats.people === N + 1 && seats.bots === 8 - N - 1, `fakes: ${N} fake players and me aren't topped up to four a side with bots: ${JSON.stringify(seats)}`);
    // they shop
    const guns = await p.waitForFunction(() => { const s = T.s(); return [...RS.net.players.keys()].every(id => s.F.get(id) && s.F.get(id).picked) && [...RS.net.players.keys()].map(id => s.F.get(id).gun); }, null, { timeout: 30000 }).then(h => h.jsonValue(), () => null);
    const bought = await ev(p, () => [...RS.net.players.keys()].filter(id => T.s().F.get(id).load.P).length);
    // one of them carries the bomb (if they attack), then they're let loose: they walk, shoot, plant
    const plan = await ev(p, () => { const s = T.s(), fk = [...RS.net.players.keys()], att = fk.filter(id => s.F.get(id).team === s.att); s.closePicker(); s.mine().alive = false;
      const car = att[0] || null; if (car) { s.hostBomb({ st: 'carried', id: car }); s.F.get(car).hp = 1e6; }      /* (the carrier can't be shot down: this is about the plant) */ s._fs = 0; const rs = s.remoteShot.bind(s); s.remoteShot = (id, m) => { if (fk.includes(id)) s._fs++; rs(id, m); };
      s.H.ends = s.clock; s.botsFrozen = true; s._p0 = Object.fromEntries(fk.map(id => { const q = s.posOf(id, new RS.THREE.Vector3()); return [id, q ? [q.x, q.z] : null]; })); return { car, fk }; });
    // (each fake gets an enemy bot stood where it can see it, again every few seconds till it's shot at: a busy machine runs them slowly)
    const placeBots = () => ev(p, () => { const s = T.s(), nav = RS.room.nav, Th = RS.THREE, used = new Set(); for (const id of [...RS.net.players.keys()]) { const q = s.posOf(id, new Th.Vector3()), f = s.F.get(id); if (!q || !f) continue; const e = [...s.F.values()].find(o => o.bot && o.team !== f.team && o.alive && !used.has(o.id)); if (!e) continue; used.add(e.id);
      for (let a = 0; a < 6.3; a += 0.4) { const k = nav.nearestFree(q.x + Math.cos(a) * 4, q.z + Math.sin(a) * 4), c = nav.center(k); if (s.canSee(new Th.Vector3(q.x, 1.5, q.z), new Th.Vector3(c.x, 1.4, c.y))) { const b = s.bots.get(e.id); b.x = c.x; b.z = c.y; break; } } } });
    const moved = await until(p, () => { const s = T.s(); return Object.entries(s._p0).filter(([id, a]) => { const q = s.posOf(id, new RS.THREE.Vector3()); return a && q && Math.hypot(q.x - a[0], q.z - a[1]) > 1.5; }).length >= 2; }, null, { timeout: 60000, every: 1000 });
    let shot = false; for (let i = 0; i < 15 && !shot; i++) { await placeBots(); await sleep(4000); shot = await ev(p, () => T.s()._fs >= 1); }
    const r = await ev(p, () => { const s = T.s(); const moved = Object.entries(s._p0).filter(([id, a]) => { const q = s.posOf(id, new RS.THREE.Vector3()); return a && q && Math.hypot(q.x - a[0], q.z - a[1]) > 1.5; }).length; return { moved, shots: s._fs, bomb: s.bomb.st, phase: s.phase }; });
    C.ok(Array.isArray(guns) && bought >= 1, `fakes: the fake players never shopped: ${JSON.stringify({ guns, bought })}`);
    C.ok(moved, `fakes: the fake players didn't go anywhere: ${JSON.stringify(r)}`);
    if (plan.car) { const pl = await p.waitForFunction(() => ['planted', 'boom', 'defused'].includes(T.s().bomb.st) || (T.s().lastEnd && T.s().lastEnd.why === 'boom'), null, { timeout: 90000 }).then(() => true, () => false); C.ok(pl, `fakes: the fake carrying the bomb never planted it: ${JSON.stringify(r)}`); }
    C.ok(shot, `fakes: the fake players never shot (at the bots in their way): ${JSON.stringify(r)}`);
    C.ok(!p.errors.length, 'fakes: page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
    console.log(`  fakes: seats ${JSON.stringify(seats)}, guns ${JSON.stringify(guns)} (${bought} bought a primary), ${JSON.stringify({ ...r, carrier: !!plan.car })}`);
  } catch (e) { C.ok(false, `fakes: ${e.message.slice(0, 300)}`); }
  finally { await b.close(); await host.close(); }
}
