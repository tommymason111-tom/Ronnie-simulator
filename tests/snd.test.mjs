// SEARCH AND DESTROY (js/snd.js, sndui.js, sndkit.js), on a fake clock (RS.sim) wherever it can be:
//   - maps: on the pub, Lidl and Lewis's, both spawns and both bomb sites are on the floor and joined up by real paths,
//     every pick-up is laid somewhere reachable, the bots play a round on their own (they shoot, someone gets hurt), no
//     NaN anywhere and no new shader built by anything it draws (pick-ups, guns, tracers, the bomb, the bang)
//   - solo (a phone held upright, Lewis's): the GUN PICK opens every round with six guns, a tap picks one (its own
//     magazine and reserve), GUNS opens it again; FIRE shoots (ammo down, the bot hit, hit marker, a kill in the feed,
//     headshots do more); health and armour (armour soaks up part of a hit), where a hit came from, the low health red
//     edge; RELOAD (the button, the empty *click* reloading by itself, nothing in reserve), the ammo HUD; every pick-up
//     (ammo, food heals, armour, every perk with its timer on the HUD, then wearing off); PLANT (held, at a site) with the
//     beeping getting faster, a dropped bomb picked up, DEFUSE, the bomb going off (everyone near it out), a team wiped
//     out, time running out, the sides swapping at half time, the match ending with the receipt; the phone's text never
//     on other text and every button on screen and pressable (pick screen, HUD, watching), and on its side too
//   - pc: the keys (R reload, F fire, E plant held, 1-6 on the pick screen), the mouse firing, the pick and HUD fit
//   - quest (an emulated headset): the pick on a panel (pointer and trigger), the gun on the right controller, the
//     trigger fires, A reloads, the wrist box has the health and ammo
//   - mp: two real games in a room: the same teams on both, a guest's gun and shots and hits reach the host and come
//     back, the host's hit on the guest, a guest's pick-up, the attacker plants and the defender defuses (both games see
//     it and the score), the next round's pick, the bots drawn on the guest, the match end and the guest's own receipt
//   - fakes: the developer test room's fake players play along: pick guns, walk, shoot, the carrier plants
// SND_ONLY=maps,solo,phone2,pc,quest,mp,fakes (default all), PLACES=pub,shop,garden (for maps)
import fs from 'fs';
import { launch, newPage, startGame, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';

const TXT = fs.readFileSync(new URL('./lib/textcheck.js', import.meta.url), 'utf8'), BTN = fs.readFileSync(new URL('./lib/btncheck.js', import.meta.url), 'utf8');
const ONLY = (process.env.SND_ONLY || 'maps,solo,phone2,pc,quest,mp,fakes').split(','), PLACES = (process.env.PLACES || 'pub,shop,garden').split(',');
const on = (k) => ONLY.includes(k);

// (in the page) little helpers on window.T: step the clock, aim, stand somewhere, press a button
const HELP = () => {
  window.T = {
    s: () => RS.director.snd,
    step: (secs, dt = 1 / 30) => { for (let t = 0; t < secs; t += dt) RS.sim(dt); },
    stand: (x, z) => { const s = RS.director.snd; s.pinAt = null; s.respawnAt(x, z); RS.sim(1 / 30); s.pinAt = null; s.respawnAt(x, z); },
    aim: (x, y, z) => { const P = RS.player, h = P.head; P.flatYaw = Math.atan2(-(x - h.x), -(z - h.z)) - P.rig.rotation.y; P.flatPitch = Math.atan2(y - h.y, Math.hypot(x - h.x, z - h.z)); RS.sim(1 / 60); P.flatYaw = Math.atan2(-(x - h.x), -(z - h.z)) - P.rig.rotation.y; P.flatPitch = Math.atan2(y - RS.player.head.y, Math.hypot(x - h.x, z - h.z)); RS.player.camera.updateMatrixWorld(true); },
    press: (sel, up = true) => { const e = document.querySelector(sel); if (!e) return false; e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, isPrimary: true })); if (up) e.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 })); return true; },
    release: (sel) => { const e = document.querySelector(sel); e && e.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 })); },
    // a free spot on the floor n metres in front of me (in the direction I'm looking, flat)
    // a free spot n metres away that I can see (no wall between): the way I'm looking if it's clear, otherwise round about
    clear: (n) => { const s = RS.director.snd, P = RS.player, nav = RS.room.nav, Th = RS.THREE, yaw0 = Math.atan2(-P.fwd.x, -P.fwd.z);
      for (let k = 0; k < 24; k++) { const a = yaw0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.26, x = P.head.x - Math.sin(a) * n, z = P.head.z - Math.cos(a) * n, q = nav.nearestFree(x, z); if (q < 0) continue; const c = nav.center(q);
        if (Math.hypot(c.x - P.head.x, c.y - P.head.z) < n * 0.7) continue; if (s.canSee(new Th.Vector3(P.head.x, P.head.y, P.head.z), new Th.Vector3(c.x, s.floor(c.x, c.y) + 1.1, c.y))) return [c.x, c.y]; } return T.ahead(n); },
    ahead: (n) => { const s = RS.director.snd, P = RS.player, nav = RS.room.nav, f = P.fwd; const x = P.head.x + f.x / Math.hypot(f.x, f.z) * n, z = P.head.z + f.z / Math.hypot(f.x, f.z) * n; const k = nav.nearestFree(x, z), c = nav.center(k); return [c.x, c.y]; },
    enemies: () => { const s = RS.director.snd, me = s.mine(); return [...s.F.values()].filter(f => f.team !== me.team && f.alive); },
    clearPops: () => { for (const id of ['sd-splash', 'sd-pop']) { const e = document.getElementById(id); if (e) e.className = ''; } for (const e of document.querySelectorAll('.banner, #banner')) e.style.display = 'none'; },
  };
};
const ev = (p, f, a) => p.evaluate(f, a);
const textProblems = async (p, scope) => { await p.evaluate(TXT); return (await p.evaluate((s) => window.__textCheck(s ? document.querySelector(s) : null), scope)).filter(o => o.kind === 'text on text' || o.kind === 'off the side of the screen' || o.kind === 'cut off'); };
const btnProblems = async (p, scope) => { await p.evaluate(BTN); return p.evaluate((s) => window.__btnCheck(s), scope); };
// into a solo game of Search & Destroy, the clock in the test's hands, at the first round's pick
async function soloGame(b, { place = 'garden', width = 390, height = 844, mobile = true } = {}) {
  const p = await newPage(b, { width, height, mobile });
  await startGame(p, { place, mode: 'snd' }); await ev(p, HELP);
  await ev(p, () => { RS.renderer.setAnimationLoop(null); const s = T.s(); s.startT = 0; for (let i = 0; i < 60 && s.phase !== 'buy'; i++) RS.sim(1 / 30); });
  return p;
}

export default async function () {
  const C = checker('snd'), b = await launch();
  try {
    if (on('maps')) for (const place of PLACES) await maps(b, place, C);
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
      out.teams = [...s.F.values()].map(f => f.team).join('');
      return out; });
    C.ok(!r.bad.length, `${place}: ${r.bad.join(', ')}`);
    C.ok(Object.values(r.paths).every(Boolean), `${place}: no path between a spawn and a site: ${JSON.stringify(r.paths)}`);
    C.ok(r.pk >= 10 && r.pkBad === 0 && r.kinds >= 6, `${place}: pick-ups: ${r.pk} laid, ${r.pkBad} off the floor or out of reach, ${r.kinds} kinds`);
    C.ok(!r.spawnsBad.length, `${place}: spawns off the floor: ${r.spawnsBad.join(', ')}`);
    C.ok(/^[RB]{6}$/.test(r.teams) && (r.teams.match(/R/g) || []).length === 3, `${place}: solo teams aren't three a side: ${r.teams}`);
    // the bots play: 40 seconds of a round with me stood out of the way
    const play = await ev(p, () => { const s = T.s(); s.closePicker(); s.H.ends = s.clock; RS.sim(1 / 30); const me = s.mine(); me.alive = false;      // (I'm sat out: the bots fight it out)
      let shots = 0, hurt = 0, moved = 0; const rs = s.remoteShot.bind(s), dm = s.damaged.bind(s); s.remoteShot = (id, m) => { shots++; rs(id, m); }; s.damaged = (m) => { hurt++; dm(m); };
      for (let k = 0; k < 20; k++) { T.step(2, 1 / 20); if (s.phase === 'live') moved = Math.max(moved, [...s.bots.values()].filter(b => { const sp = s.roundMsg.sp[b.id]; return sp && Math.hypot(b.x - sp[0], b.z - sp[1]) > 2; }).length); if (s.phase === 'buy') { s.closePicker(); s.H.ends = s.clock; s.mine().alive = false; } }
      const nan = []; RS.scene.traverse(o => { if (o.position && !(isFinite(o.position.x) && isFinite(o.position.y) && isFinite(o.position.z))) nan.push(o.name || o.type); });
      return { shots, hurt, moved, nan: nan.slice(0, 4), phase: s.phase, round: s.round, sc: s.sc, bomb: s.bomb.st }; });
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
      for (const G of ['ketchup', 'beans', 'sausage', 'cheese', 'monstor', 'gravy']) { s.loadGun(G); s.my.mag = 5; s.my.nextShot = 0; s.my.spin = 1; s.fire(); RS.sim(1 / 30); R.render(RS.scene, RS.player.camera); }
      s.bomb.st = 'planted'; s.explode(); RS.sim(0.1, 1 / 30); look(s.M.A[0] + 4, 2, s.M.A[1] + 4, s.M.A[0], 0.5, s.M.A[1]);
      for (const [id] of s.puppets) { const q = s.headOf(id, new Th.Vector3()); if (q) look(q.x + 2, 1.6, q.z + 2, q.x, 1.2, q.z); }
      return { built: R.info.programs.length - n0, warm: !!window.__shaderWarm }; });
    C.ok(sh.built === 0, `${place}: ${sh.built} shaders built during play (each a stutter)`);
    C.ok(!p.errors.length, `${place}: page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
    const cr = p.crashes.filter(c => !['start', 'hang'].includes(c.k)); C.ok(!cr.length, `${place}: crash reports: ` + cr.slice(0, 2).map(c => JSON.stringify(c).slice(0, 200)).join(' | '));
    console.log(`  maps ${place}: ${r.pk} pick-ups (${r.kinds} kinds), bots: ${JSON.stringify(play)}, ${sh.built} shaders built in play`);
  } catch (e) { C.ok(false, `maps ${place}: ${e.message.slice(0, 300)}`); }
  await p.context().close();
}

// ------------------------------------------------------------------ solo, on a phone held upright
async function solo(b, C) {
  const p = await soloGame(b, { place: 'garden' });
  const L = (s) => process.env.VERBOSE && console.log('   ', s);
  try {
    // ---- the pick, round 1
    const pick = await ev(p, () => { const s = T.s(), el = document.getElementById('sd-pick'); return { open: el.classList.contains('on'), cards: el.querySelectorAll('.card').length, names: [...el.querySelectorAll('.card .nm')].map(e => e.textContent), phase: s.phase }; });
    C.ok(pick.open && pick.cards === 6, `solo: the gun pick isn't open at the start of round 1 with six guns: ${JSON.stringify(pick)}`);
    await sleep(600);
    { const t = await textProblems(p, '#sd-pick'), bt = await btnProblems(p, '#sd-pick');
      C.ok(!t.length, `phone: the pick screen's text: ${JSON.stringify(t.slice(0, 3))}`); C.ok(!bt.length, `phone: the pick screen's buttons: ${JSON.stringify(bt.slice(0, 3))}`); }
    if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + '/snd-pick-phone.png' });
    const picked = await ev(p, () => { const s = T.s(); document.querySelector('#sd-pick .card[data-g="sausage"]').click(); T.step(0.4); return { gun: s.my.gun, mag: s.my.mag, reserve: s.my.reserve, me: s.mine().gun, open: document.getElementById('sd-pick').classList.contains('on') }; });
    await sleep(500); await ev(p, () => T.step(0.1));
    const afterPick = await ev(p, () => ({ open: document.getElementById('sd-pick').classList.contains('on'), guns: !document.querySelector('#sd-ui .guns').hidden, phase: T.s().phase, pickOpen: T.s().pickOpen, alive: T.s().mine().alive, flat: RS.player.flatMode }));
    C.ok(picked.gun === 'sausage' && picked.me === 'sausage' && picked.mag === 4 && picked.reserve === 16, `solo: tapping the sausage sniper didn't give it (4 in the mag, 16 spare): ${JSON.stringify(picked)}`);
    C.ok(!afterPick.open && afterPick.guns, `solo: after picking, the pick didn't close or there's no GUNS button to change it: ${JSON.stringify(afterPick)}`);
    const re = await ev(p, () => { T.press('#sd-ui .guns'); const open = document.getElementById('sd-pick').classList.contains('on'); document.querySelector('#sd-pick .card[data-g="monstor"]').click(); return { open, gun: T.s().my.gun, mag: T.s().my.mag }; });
    C.ok(re.open && re.gun === 'monstor' && re.mag === 25, `solo: GUNS didn't open the pick again, or the MONSTOR AR (25 a mag) didn't come: ${JSON.stringify(re)}`);
    await sleep(400);
    // ---- live: shooting a bot stood in front of me
    const shoot = await ev(p, () => { const s = T.s(); s.closePicker(); s.botsFrozen = true; s.H.ends = s.clock; T.step(0.2); const me = s.mine();
      const e = T.enemies()[0], b = s.bots.get(e.id), at = T.clear(6); b.x = at[0]; b.z = at[1]; RS.sim(1 / 30);
      const head = s.headOf(e.id, new RS.THREE.Vector3()); T.aim(head.x, head.y - 0.55, head.z);
      const mag0 = s.my.mag, hp0 = e.hp; T.press('#sd-ui .fire'); T.step(0.05);
      const one = { mag: s.my.mag, hp: e.hp, hm: document.getElementById('sd-hm').className };
      // a headshot does more than a body shot
      T.aim(head.x, head.y - 0.05, head.z); s.my.nextShot = 0; const hpA = e.hp; s.fire(); T.step(0.05); const hsD = hpA - e.hp;
      // keep shooting till it's down
      let n = 0; while (e.alive && n++ < 40) { T.aim(head.x, head.y - 0.5, head.z); s.my.nextShot = 0; if (s.my.mag <= 0) { s.my.mag = 25; s.my.reloadEnd = 0; } s.fire(); T.step(0.05); }
      return { phase: s.phase, mag0, ...one, hp0, bodyD: hp0 - one.hp, hsD, dead: !e.alive, k: me.k, feed: document.getElementById('sd-feed').textContent, name: e.name }; });
    C.ok(shoot.phase === 'live', `solo: the round didn't go live: ${shoot.phase}`);
    C.ok(shoot.mag === shoot.mag0 - 1, `solo: FIRE didn't use a round: ${shoot.mag0} -> ${shoot.mag}`);
    C.ok(shoot.bodyD > 15 && shoot.bodyD < 30, `solo: a body shot with the MONSTOR AR did ${shoot.bodyD} damage`);
    C.ok(/on/.test(shoot.hm), `solo: no hit marker: "${shoot.hm}"`);
    C.ok(shoot.hsD > shoot.bodyD * 1.5, `solo: a headshot (${shoot.hsD}) isn't much more than a body shot (${shoot.bodyD})`);
    C.ok(shoot.dead && shoot.k >= 1 && shoot.feed.includes(shoot.name.replace(/^🤖 /, '🤖')), `solo: shooting the bot down didn't count as a kill in the feed: ${JSON.stringify({ dead: shoot.dead, k: shoot.k, feed: shoot.feed })}`);
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
    C.ok(/"box"/.test(hurt.box) && hurt.box.includes(`"big":"${Math.ceil(hurt.hp2)}"`) && /🦺/.test(hurt.box), `solo: the top-left box doesn't show health and armour: ${hurt.box}`);
    // ---- reload: the button, an empty gun (click, reloads itself), nothing spare
    const rl = await ev(p, () => { const s = T.s(), G = 25; s.my.mag = 7; s.my.reserve = 40; s.my.reloadEnd = 0; T.press('#sd-ui .reload'); const started = !!s.my.reloadEnd; const len = s.my.reloadLen; T.step(len + 0.1);
      const a = { started, len: +len.toFixed(2), mag: s.my.mag, reserve: s.my.reserve, hud: document.querySelector('#sd-ammo .num').textContent };
      s.my.mag = 0; s.my.nextShot = 0; s.fire(); T.step(0.3); const auto = !!s.my.reloadEnd; T.step(2.5);
      s.my.mag = 0; s.my.reserve = 0; s.my.reloadEnd = 0; s.my.nextShot = 0; s.fire(); T.step(0.1); const none = { reloading: !!s.my.reloadEnd, need: document.querySelector('#sd-ui .reload').className, pop: document.getElementById('sd-pop').textContent };
      return { ...a, auto, magAfterAuto: 0, none }; });
    C.ok(rl.started && rl.len > 1.9 && rl.len < 2.3 && rl.mag === 25 && rl.reserve === 22, `solo: RELOAD (2.1s) didn't refill 7 -> 25 from 40 spare: ${JSON.stringify(rl)}`);
    C.ok(/25\s*\/\s*22/.test(rl.hud), `solo: the ammo HUD says "${rl.hud}" not 25 / 22`);
    C.ok(rl.auto, 'solo: firing an empty gun didn\'t start a reload');
    C.ok(!rl.none.reloading && /CLICK|AMMO/.test(rl.none.pop), `solo: an empty gun with nothing spare: ${JSON.stringify(rl.none)}`);
    // ---- every pick-up, laid in front of me
    const pk = await ev(p, () => { const s = T.s(), me = s.mine(), out = {}, nav = RS.room.nav, P = RS.player;
      const lay = (k) => { const at = T.ahead(2.5), q = { k, x: at[0], z: at[1], y: s.floor(at[0], at[1]), on: true, back: 0 }; s.pk.push(q); return s.pk.length - 1; };
      const grab = (k) => { const i = lay(k), q = s.pk[i]; T.stand(q.x, q.z); T.step(0.3); const got = !q.on; T.stand(q.x + 0.01, q.z + 2.2 > 0 ? q.z : q.z); return got; };
      s.loadGun('monstor'); s.my.reserve = 0; out.ammo = [grab('ammo'), s.my.reserve];
      me.hp = 40; out.burger = [grab('burger'), me.hp]; me.hp = 20; out.kebab = [grab('kebab'), me.hp]; me.hp = 100; out.fullFood = (() => { const i = lay('burger'), q = s.pk[i]; T.stand(q.x, q.z); T.step(0.3); const left = q.on; q.on = false; return left; })();
      me.ar = 0; out.armour = [grab('armour'), me.ar];
      out.reload = [grab('p_reload'), (() => { s.my.mag = 3; s.my.reserve = 50; s.my.reloadEnd = 0; s.doReload(); const l = s.my.reloadLen; T.step(l + 0.1); return +l.toFixed(2); })()];
      const sp0 = P.speedMul; out.speed = [grab('p_speed'), +(P.speedMul / sp0).toFixed(2)];
      out.dmg = grab('p_dmg'); out.defuse = grab('p_defuse'); out.ammoPerk = [grab('p_ammo'), s.my.mag, s.my.reserve];
      out.chips = JSON.stringify(RS.hudExtras().box.chips.map(c => c.t)); out.pop = document.getElementById('sd-pop').textContent;
      T.step(31, 1 / 10); out.after = Object.keys(s.my.perks).sort().join(','); out.speedAfter = +(P.speedMul / sp0).toFixed(2);
      return out; });
    C.ok(pk.ammo[0] && pk.ammo[1] === 75, `solo: the ammo box: ${JSON.stringify(pk.ammo)}`);
    C.ok(pk.burger[0] && pk.burger[1] === 75 && pk.kebab[0] && pk.kebab[1] === 90, `solo: food didn't heal (40+35, 20+70): ${JSON.stringify([pk.burger, pk.kebab])}`);
    C.ok(pk.fullFood, 'solo: food was eaten at full health');
    C.ok(pk.armour[0] && pk.armour[1] === 50, `solo: the stab vest: ${JSON.stringify(pk.armour)}`);
    C.ok(pk.reload[0] && pk.reload[1] > 0.9 && pk.reload[1] < 1.2, `solo: FAST HANDS didn't halve the reload: ${JSON.stringify(pk.reload)}`);
    C.ok(pk.speed[0] && pk.speed[1] === 1.3, `solo: MONSTOR RUSH didn't speed me up 30%: ${JSON.stringify(pk.speed)}`);
    C.ok(pk.dmg && pk.defuse && pk.ammoPerk[0] && pk.ammoPerk[1] === 50 && pk.ammoPerk[2] === 150, `solo: the other perks: ${JSON.stringify({ dmg: pk.dmg, defuse: pk.defuse, ammo: pk.ammoPerk })}`);
    C.ok(/⏱️ \d+s/.test(pk.chips) && /⚡ \d+s/.test(pk.chips) && /🌶️ \d+s/.test(pk.chips) && /PLIERS/.test(pk.chips), `solo: the perk timers aren't on the HUD: ${pk.chips}`);
    C.ok(pk.after === 'ammo,defuse' && pk.speedAfter === 1, `solo: the timed perks didn't wear off (left: ${pk.after}, speed x${pk.speedAfter})`);
    L('pick-ups ' + JSON.stringify(pk));
    // ---- the bomb: carried by me (attacking), planted at A with the beeping speeding up
    const plant = await ev(p, () => { const s = T.s(), me = s.mine(); s.att = me.team; s.H.att = me.team; s.hostBomb({ st: 'carried', id: 'me' }); T.stand(s.M.A[0], s.M.A[1]); T.step(0.2);
      const shown = !document.querySelector('#sd-ui .act').hidden, label = document.querySelector('#sd-ui .act').textContent; T.press('#sd-ui .act', false); T.step(1.5); const mid = s.bomb.st, prog = document.getElementById('sd-prog').classList.contains('on'); T.step(2.0); T.release('#sd-ui .act');
      return { shown, label, mid, prog, st: s.bomb.st, site: s.bomb.s, left: +(s.bombAt - s.clock).toFixed(1), gaps: [40, 20, 5, 1].map(l => +s.beepGap(l).toFixed(2)), top: document.getElementById('sd-top').textContent }; });
    C.ok(plant.shown && /PLANT/.test(plant.label) && plant.mid === 'carried' && plant.prog, `solo: PLANT wasn't offered at the site, or it planted too soon: ${JSON.stringify(plant)}`);
    C.ok(plant.st === 'planted' && plant.site === 'A' && plant.left > 35 && plant.left <= 40, `solo: holding PLANT for 3.2s didn't plant at A: ${JSON.stringify(plant)}`);
    C.ok(plant.gaps.every((g, i) => i === 0 || g < plant.gaps[i - 1]) && plant.gaps[0] > 0.9 && plant.gaps[3] < 0.2, `solo: the beeping doesn't speed up: ${plant.gaps}`);
    // ...it goes off: attackers win, everyone near it is out
    const boom = await ev(p, () => { const s = T.s(), me = s.mine(), sc0 = { ...s.sc }; s.H.bombEnds = s.clock; T.step(0.2); return { st: s.bomb.st, phase: s.phase, win: s.lastEnd && s.lastEnd.win, why: s.lastEnd && s.lastEnd.why, mine: me.team, dead: !me.alive, sc0, sc: { ...s.sc } }; });
    C.ok(boom.st === 'boom' && boom.phase === 'post' && boom.win === boom.mine && boom.why === 'boom' && boom.dead, `solo: the bomb going off: ${JSON.stringify(boom)}`);
    // ---- round 2: the pick again; this time I defend: a bot carries, it's dropped, a bot plants, I defuse
    const r2 = await ev(p, () => { const s = T.s(); T.step(7, 1 / 10); return { phase: s.phase, round: s.round, pick: document.getElementById('sd-pick').classList.contains('on'), alive: s.mine().alive, hp: s.mine().hp }; });
    C.ok(r2.round === 2 && r2.phase === 'buy' && r2.pick && r2.alive && r2.hp === 100, `solo: round 2 didn't start with everyone back and the pick open: ${JSON.stringify(r2)}`);
    if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + '/snd-pick2-phone.png' });
    const def = await ev(p, () => { const s = T.s(), me = s.mine(); s.closePicker(); s.H.ends = s.clock; T.step(0.1); s.att = me.team === 'R' ? 'B' : 'R'; s.H.att = s.att;
      // a bot's carrying it: shot down, the bomb drops where it fell
      const car = T.enemies()[0]; s.hostBomb({ st: 'carried', id: car.id }); s.hostKill(car.id, 'me', false); T.step(0.05); const dropped = s.bomb.st;
      s.hostBomb({ st: 'planted', id: car.id, p: [s.M.B[0], s.M.B[1]], s: 'B', left: 40 }); s.H.bombEnds = s.clock + 40; T.stand(s.M.B[0] + 0.3, s.M.B[1]); T.step(0.2);
      const label = document.querySelector('#sd-ui .act').textContent, shown = !document.querySelector('#sd-ui .act').hidden; T.press('#sd-ui .act', false); T.step(3); const mid = s.bomb.st; T.step(3.8); T.release('#sd-ui .act');
      return { dropped, shown, label, mid, st: s.bomb.st, phase: s.phase, win: s.lastEnd && s.lastEnd.win, why: s.lastEnd && s.lastEnd.why, mine: me.team }; });
    C.ok(def.dropped === 'dropped', `solo: the carrier going down didn't drop the bomb: ${def.dropped}`);
    C.ok(def.shown && /DEFUSE/.test(def.label) && def.mid === 'planted' && def.st === 'defused' && def.win === def.mine && def.why === 'defused', `solo: defusing: ${JSON.stringify(def)}`);
    // ---- round 3: a dropped bomb picked up by walking over it (attacking); then the defenders wiped out
    const r3 = await ev(p, () => { const s = T.s(), me = s.mine(); T.step(7, 1 / 10); s.closePicker(); s.att = me.team; s.H.att = me.team; s.H.ends = s.clock; T.step(0.1);
      const at = T.ahead(3); s.hostBomb({ st: 'dropped', p: [at[0], at[1]] }); T.step(0.1); T.stand(at[0], at[1]); T.step(0.8); const carry = s.bomb.st === 'carried' && s.bomb.id === 'me';
      for (const e of T.enemies()) s.hostKill(e.id, 'me', false); T.step(0.1); return { round: s.round, carry, phase: s.phase, why: s.lastEnd && s.lastEnd.why, win: s.lastEnd && s.lastEnd.win, mine: me.team, att: s.att }; });
    C.ok(r3.round === 3 && r3.carry, `solo: walking over the dropped bomb didn't pick it up: ${JSON.stringify(r3)}`);
    C.ok(r3.phase === 'post' && r3.why === 'wiped' && r3.win === r3.mine, `solo: wiping out the defenders didn't win the round: ${JSON.stringify(r3)}`);
    // ---- round 4: half time (the sides swap), time runs out with no plant: the defenders win
    const r4 = await ev(p, () => { const s = T.s(), att3 = s.att; T.step(7, 1 / 10); s.closePicker(); const att4 = s.H.att; s.H.ends = s.clock; T.step(0.1); s.H.ends = s.clock; T.step(0.1);
      return { round: s.round, att3, att4, why: s.lastEnd && s.lastEnd.why, win: s.lastEnd && s.lastEnd.win, sc: { ...s.sc } }; });
    C.ok(r4.round === 4 && r4.att4 !== r4.att3, `solo: the sides didn't swap at half time: ${JSON.stringify(r4)}`);
    C.ok(r4.why === 'time' && r4.win !== r4.att4, `solo: running the clock out didn't win it for the defenders: ${JSON.stringify(r4)}`);
    // ---- on to the end: the match, the receipt
    const end = await ev(p, async () => { const s = T.s(), me = s.mine(); for (let r = 0; r < 6 && s.phase !== 'over'; r++) { T.step(7, 1 / 10); if (s.phase === 'over') break; s.closePicker(); s.H.ends = s.clock; T.step(0.1); for (const e of T.enemies()) s.hostKill(e.id, 'me', false); T.step(0.1); }
      const over = s.phase; T.step(6, 1 / 10); return { over, sc: s.sc, win: s.win, receipt: document.body.classList.contains('gameover'), lines: s.summary().map(l => l.join(' ')).join(' | '), running: RS.director.running }; });
    C.ok(end.over === 'over' && Math.max(end.sc.R, end.sc.B) === end.win, `solo: the match didn't end at ${end.win} rounds: ${JSON.stringify(end)}`);
    C.ok(end.receipt && /SEARCH & DESTROY/.test(end.lines) && /KILLS \/ DEATHS/.test(end.lines), `solo: no receipt at the end: ${JSON.stringify(end)}`);
    L('end ' + JSON.stringify(end));
    C.ok(!p.errors.length, 'solo: page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } catch (e) { C.ok(false, `solo: ${e.message.slice(0, 400)}`); }
  await p.context().close();
  // ---- the phone's HUD (a fresh game): live, then out and watching
  const q = await soloGame(b, { place: 'pub' });
  try {
    await ev(q, () => { const s = T.s(); s.closePicker(); s.botsFrozen = true; s.H.ends = s.clock; T.step(0.5); });
    await sleep(3500); await ev(q, () => { T.clearPops(); T.step(0.3); });
    const t = await textProblems(q), bt = await btnProblems(q, '#sd-ui');
    C.ok(!t.length, `phone: text on text in the game: ${JSON.stringify(t.slice(0, 3))}`); C.ok(!bt.length, `phone: the game's buttons: ${JSON.stringify(bt.slice(0, 3))}`);
    const big = await ev(q, () => { const r = (s) => document.querySelector(s).getBoundingClientRect(); return { fire: r('#sd-ui .fire').width, reload: r('#sd-ui .reload').width, stick: r('#stick').right, rl: r('#sd-ui .reload').left }; });
    C.ok(big.fire >= 96 && big.reload >= 66 && big.rl > big.stick, `phone: FIRE and RELOAD too small or over the joystick: ${JSON.stringify(big)}`);
    if (process.env.SHOTS) { await ev(q, () => RS.shot && RS.shot()); await q.screenshot({ path: process.env.SHOTS + '/snd-hud-phone.png' }); }
    await ev(q, () => { const s = T.s(); s.hostKill('me', T.enemies()[0].id, true); T.step(0.5); }); await sleep(3500); await ev(q, () => { T.clearPops(); T.step(0.3); });
    const dead = await ev(q, () => ({ watch: !document.querySelector('#sd-ui .watch').hidden, fire: !document.querySelector('#sd-ui .fire').hidden, spect: T.s().spect, cam: !!T.s().viewCam() }));
    C.ok(dead.watch && !dead.fire && dead.spect && dead.cam, `phone: out of the round, not watching a team-mate: ${JSON.stringify(dead)}`);
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
    C.ok(!t.length, `phone on its side: the pick screen's text: ${JSON.stringify(t.slice(0, 3))}`); C.ok(!bt.length, `phone on its side: the pick screen's buttons: ${JSON.stringify(bt.slice(0, 3))}`);
    if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + '/snd-pick-side.png' });
    await ev(p, () => { const s = T.s(); s.closePicker(); s.botsFrozen = true; s.H.ends = s.clock; T.step(0.5); }); await sleep(3500); await ev(p, () => { T.clearPops(); T.step(0.3); });
    const t2 = await textProblems(p), bt2 = await btnProblems(p, '#sd-ui');
    C.ok(!t2.length, `phone on its side: text on text: ${JSON.stringify(t2.slice(0, 3))}`); C.ok(!bt2.length, `phone on its side: buttons: ${JSON.stringify(bt2.slice(0, 3))}`);
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
    C.ok(!t.length, `pc: the pick screen's text: ${JSON.stringify(t.slice(0, 3))}`); C.ok(!bt.length, `pc: the pick screen's buttons: ${JSON.stringify(bt.slice(0, 3))}`);
    await p.keyboard.press('Digit2'); await ev(p, () => T.step(0.1));
    const k = await ev(p, () => ({ gun: T.s().my.gun, open: T.s().pickOpen }));
    C.ok(k.gun === 'beans' && !k.open, `pc: 2 on the pick screen didn't pick the bean shotgun: ${JSON.stringify(k)}`);
    await ev(p, () => { const s = T.s(); s.botsFrozen = true; s.H.ends = s.clock; T.step(0.3); s.loadGun('monstor'); });
    // R reloads, F fires, a held mouse button fires, E held plants
    await ev(p, () => { T.s().my.mag = 5; }); await p.keyboard.press('KeyR'); const r1 = await ev(p, () => !!T.s().my.reloadEnd); await ev(p, () => T.step(2.3));
    const m0 = await ev(p, () => T.s().my.mag); await p.keyboard.down('KeyF'); await ev(p, () => T.step(0.6)); await p.keyboard.up('KeyF'); const m1 = await ev(p, () => T.s().my.mag);
    const box = await ev(p, () => { const r = RS.renderer.domElement.getBoundingClientRect(); return [r.left + r.width * 0.3, r.top + r.height * 0.4]; });
    await p.mouse.move(box[0], box[1]); await p.mouse.down(); await ev(p, () => T.step(0.5)); await p.mouse.up(); const m2 = await ev(p, () => T.s().my.mag);
    C.ok(r1 && m0 === 25, `pc: R didn't reload (${r1}, ${m0})`); C.ok(m1 < m0 - 2, `pc: holding F didn't fire the automatic: ${m0} -> ${m1}`); C.ok(m2 < m1 - 2, `pc: holding the mouse button didn't fire: ${m1} -> ${m2}`);
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
      s.panel.input('move', 380, 150); s.panel.input('down', 380, 150); await frames(2); out.gun = s.my.gun; out.closed = !s.panel.open;
      s.botsFrozen = true; s.H.ends = s.clock; await frames(3); out.phase = s.phase;
      const c = window.xrd && window.xrd.controllers && window.xrd.controllers.right; out.hasCtl = !!(c && c.updateButtonValue);
      out.vrGun = !!(s.vrGun && s.vrGun.parent && s.vrGun.visible); out.gunOnCtl = !!(s.vrGun && s.vrGun.parent && s.vrGun.parent.type !== 'Scene');
      s.loadGun('monstor'); const m0 = s.my.mag;
      if (out.hasCtl) { c.updateButtonValue('trigger', 1); await frames(8); c.updateButtonValue('trigger', 0); await frames(2); }
      out.fired = m0 - s.my.mag;
      if (out.hasCtl) { c.updateButtonValue('a-button', 1); await frames(2); c.updateButtonValue('a-button', 0); await frames(2); }
      out.reloading = !!s.my.reloadEnd || s.my.mag === m0; out.box = JSON.stringify(RS.hudExtras()); out.laser = s.laser.visible;
      return out; });
    C.ok(r.panel && !r.dom, `quest: the gun pick isn't on a panel in the headset: ${JSON.stringify(r)}`);
    C.ok(r.gun === 'beans' && r.closed, `quest: pointing at the shotgun and pulling the trigger didn't pick it: ${JSON.stringify(r)}`);
    C.ok(r.vrGun && r.gunOnCtl, `quest: no gun on the right controller: ${JSON.stringify(r)}`);
    if (r.hasCtl) { C.ok(r.fired >= 1, `quest: the trigger didn't fire: ${JSON.stringify(r)}`); C.ok(r.reloading, `quest: A didn't reload: ${JSON.stringify(r)}`); }
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
    for (const p of pages) await p.waitForFunction(() => T.s().phase === 'buy', null, { timeout: 90000 }).catch(() => C.ok(false, `mp: ${p.pname} never got to the pick`));
    await sleep(1500);
    // ---- the same teams on both
    const team = (p) => ev(p, () => [...T.s().F.values()].map(f => f.id + ':' + f.team).sort().join(','));
    const tH = await team(H), tG = await team(G); C.ok(tH && tH === tG, `mp: the teams differ: ${tH} / ${tG}`);
    const ids = await ev(H, () => ({ me: T.s().me, guest: [...RS.net.players.keys()][0], teams: Object.fromEntries([...T.s().F.values()].map(f => [f.id, f.team])), att: T.s().att }));
    C.ok(ids.teams[ids.me] !== ids.teams[ids.guest], `mp: the two players are on the same side (humans should be split): ${JSON.stringify(ids.teams)}`);
    // ---- the guest's pick reaches the host
    const gp = await ev(G, () => { const o = document.getElementById('sd-pick').classList.contains('on'); document.querySelector('#sd-pick .card[data-g="cheese"]').click(); return o; });
    C.ok(gp, 'mp: the guest has no gun pick');
    const hg = await H.waitForFunction((id) => T.s().F.get(id).gun === 'cheese', ids.guest, { timeout: 30000 }).then(() => true, () => false); C.ok(hg, 'mp: the host never heard the guest picked the cheese SMG');
    // ---- live; a bot of the other side stood in front of the guest, held still
    await ev(H, () => { const s = T.s(); s.botsFrozen = true; s.H.ends = s.clock; });
    for (const p of pages) await p.waitForFunction(() => T.s().phase === 'live', null, { timeout: 60000 }).catch(() => C.ok(false, `mp: ${p.pname} never went live`));
    await ev(G, () => { const s = T.s(); s.closePicker(); });
    const target = await ev(H, (gid) => { const s = T.s(), gt = s.F.get(gid).team, e = [...s.F.values()].find(f => f.bot && f.team !== gt && f.alive), q = s.posOf(gid, new RS.THREE.Vector3()), nav = RS.room.nav;
      let c = null; for (let a = 0; a < 6.3 && !c; a += 0.3) { const k = nav.nearestFree(q.x + Math.cos(a) * 3.5, q.z + Math.sin(a) * 3.5), cc = nav.center(k); if (Math.hypot(cc.x - q.x, cc.y - q.z) > 2 && s.canSee(new RS.THREE.Vector3(q.x, 1.5, q.z), new RS.THREE.Vector3(cc.x, s.floor(cc.x, cc.y) + 1.1, cc.y))) c = cc; }
      if (!c) c = nav.center(nav.nearestFree(q.x + 3, q.z)); const b = s.bots.get(e.id); b.x = c.x; b.z = c.y; return { id: e.id, x: c.x, z: c.y }; }, ids.guest);
    await G.waitForFunction((t) => { const bp = T.s().botPose.get(t.id); return bp && Math.hypot(bp.x - t.x, bp.z - t.z) < 0.3; }, target, { timeout: 30000 }).catch(() => C.ok(false, 'mp: the bot\'s move never reached the guest'));
    const shotsH0 = await ev(H, () => { const s = T.s(); s._shots = 0; const rs = s.remoteShot.bind(s); s.remoteShot = (id, m) => { if (id !== s.me && !s.F.get(id).bot) s._shots++; rs(id, m); }; return s.F.get([...s.F.keys()].find(k => k !== s.me && !s.F.get(k).bot)).hp; });
    await ev(G, (t) => { const s = T.s(); for (let i = 0; i < 6; i++) { const h = s.headOf(t.id, new RS.THREE.Vector3()); T.aim(h.x, h.y - 0.5, h.z); s.my.nextShot = 0; s.fire(); } }, target);
    const hit = await H.waitForFunction((id) => T.s().F.get(id).hp < 100, target.id, { timeout: 30000 }).then(() => true, () => false);
    const hpH = await ev(H, (id) => T.s().F.get(id).hp, target.id); await sleep(1500); const hpG = await ev(G, (id) => T.s().F.get(id).hp, target.id);
    C.ok(hit && hpH === hpG, `mp: the guest's shots on the bot: host sees ${hpH}, guest sees ${hpG}`);
    C.ok((await ev(H, () => T.s()._shots)) >= 1, 'mp: the host never saw the guest\'s shots');
    // ---- the host's referee hurts the guest: the guest's own health and its red flash
    await ev(H, ([gid, bid]) => { T.s().hostDamage(gid, bid, 25, false, new RS.THREE.Vector3(0, 1.5, 0)); }, [ids.guest, target.id]);
    const gh = await G.waitForFunction(() => T.s().mine().hp === 75, null, { timeout: 30000 }).then(() => true, () => false); C.ok(gh, 'mp: the guest\'s health didn\'t drop to 75');
    // ---- the guest walks onto a pick-up: the host gives it them
    const pki = await ev(G, () => { const s = T.s(), i = s.pk.findIndex(q => q.on && q.k === 'armour'); const j = i >= 0 ? i : s.pk.findIndex(q => q.on); const q = s.pk[j]; T.stand(q.x, q.z); return { i: j, k: q.k }; });
    const took = await H.waitForFunction((i) => !T.s().pk[i].on, pki.i, { timeout: 30000 }).then(() => true, () => false);
    await sleep(1000); const gOff = await ev(G, (i) => !T.s().pk[i].on, pki.i);
    C.ok(took && gOff, `mp: the guest's pick-up (${pki.k}) wasn't taken on both games (host ${took}, guest ${gOff})`);
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
    // ---- round 2: the pick on both; the bots drawn on the guest
    await ev(H, () => { T.s().H.nextAt = T.s().clock; });
    for (const p of pages) await p.waitForFunction(() => T.s().round === 2 && T.s().phase === 'buy', null, { timeout: 60000 }).catch(() => C.ok(false, `mp: ${p.pname} never got to round 2`));
    for (const p of pages) C.ok(await ev(p, () => document.getElementById('sd-pick').classList.contains('on') || !RS.player.flatMode), `mp: ${p.pname} has no pick in round 2`);
    const pup = await ev(G, () => { const s = T.s(); return { bots: [...s.F.values()].filter(f => f.bot).length, puppets: s.puppets.size }; });
    C.ok(pup.bots >= 4 && pup.puppets === pup.bots, `mp: the guest doesn't draw the bots: ${JSON.stringify(pup)}`);
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
  const host = await startRoomHost(), b = await launch(), N = 3;
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
    // they pick guns
    const guns = await p.waitForFunction(() => { const s = T.s(); return [...RS.net.players.keys()].every(id => s.F.get(id) && s.F.get(id).picked) && [...RS.net.players.keys()].map(id => s.F.get(id).gun); }, null, { timeout: 30000 }).then(h => h.jsonValue(), () => null);
    // one of them carries the bomb (if they attack), then they're let loose: they walk, shoot, plant
    const plan = await ev(p, () => { const s = T.s(), fk = [...RS.net.players.keys()], att = fk.filter(id => s.F.get(id).team === s.att); s.closePicker(); s.mine().alive = false;
      const car = att[0] || null; if (car) { s.hostBomb({ st: 'carried', id: car }); s.F.get(car).hp = 1e6; }      /* (the carrier can't be shot down: this is about the plant) */ s._fs = 0; const rs = s.remoteShot.bind(s); s.remoteShot = (id, m) => { if (fk.includes(id)) s._fs++; rs(id, m); };
      s.H.ends = s.clock; s.botsFrozen = true; s._p0 = Object.fromEntries(fk.map(id => { const q = s.posOf(id, new RS.THREE.Vector3()); return [id, q ? [q.x, q.z] : null]; })); return { car, fk }; });
    await sleep(8000);
    await ev(p, () => { const s = T.s(), nav = RS.room.nav, Th = RS.THREE; for (const id of [...RS.net.players.keys()]) { const q = s.posOf(id, new Th.Vector3()), f = s.F.get(id); if (!q || !f) continue; const e = [...s.F.values()].find(o => o.bot && o.team !== f.team && o.alive && !o.near); if (!e) continue; e.near = 1;
      for (let a = 0; a < 6.3; a += 0.4) { const k = nav.nearestFree(q.x + Math.cos(a) * 4, q.z + Math.sin(a) * 4), c = nav.center(k); if (s.canSee(new Th.Vector3(q.x, 1.5, q.z), new Th.Vector3(c.x, 1.4, c.y))) { const b = s.bots.get(e.id); b.x = c.x; b.z = c.y; break; } } } });
    await sleep(17000);
    const r = await ev(p, () => { const s = T.s(); const moved = Object.entries(s._p0).filter(([id, a]) => { const q = s.posOf(id, new RS.THREE.Vector3()); return a && q && Math.hypot(q.x - a[0], q.z - a[1]) > 1.5; }).length; return { moved, shots: s._fs, bomb: s.bomb.st, phase: s.phase }; });
    C.ok(Array.isArray(guns), 'fakes: the fake players never picked guns');
    C.ok(r.moved >= 2, `fakes: the fake players didn't go anywhere: ${JSON.stringify(r)}`);
    if (plan.car) { const pl = await p.waitForFunction(() => ['planted', 'boom', 'defused'].includes(T.s().bomb.st) || (T.s().lastEnd && T.s().lastEnd.why === 'boom'), null, { timeout: 60000 }).then(() => true, () => false); C.ok(pl, `fakes: the fake carrying the bomb never planted it: ${JSON.stringify(r)}`); }
    const r2 = await ev(p, () => ({ shots: T.s()._fs }));
    C.ok(r2.shots >= 1, `fakes: the fake players never shot (at the bots in their way): ${JSON.stringify(r2)}`);
    C.ok(!p.errors.length, 'fakes: page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
    console.log(`  fakes: guns ${JSON.stringify(guns)}, ${JSON.stringify({ ...r, shots: r2.shots, carrier: !!plan.car })}`);
  } catch (e) { C.ok(false, `fakes: ${e.message.slice(0, 300)}`); }
  finally { await b.close(); await host.close(); }
}
