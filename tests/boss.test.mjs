// BOSS FIGHT (boss.js), on a fake clock (RS.sim):
//   - on your own, in each arena (Lewis's garden, the pub's car park, the pub's beer garden with its patio cleared): a little bot grabs food, throws it at
//     the boss's head (and the weak spot when it's out of puff), eats when it's hurt, dodges what it can, and keeps going
//     until the boss is beaten. Every phase must happen, the attacks must hit and knock you down, the boss's health
//     only ever goes down when food hits it, the victory screen and the receipt come up, and no page errors
//   - the defeat path: a bot that just stands there gets battered, and the receipt says so
//   - every boss can be fought (each one's body builds and moves)
//   - the pub's arena is the car park or the beer garden at random (both come up), the patio comes back after; the host's
//     pick reaches the joiner
//   - two real games in a room (the real room server): both see the same boss health, and the joiner's throws count
import { launch, newPage, startGame, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';
const readyUp = async (ps) => { for (const q of ps) await q.evaluate(() => { const m = window.ronnieMP; if (m && m.net && m.role === 'join' && !m.ready) document.querySelector('#room-ready').click(); }).catch(() => {}); await new Promise(r => setTimeout(r, 1500)); };      // (guests ready up: the host's START waits for everyone)

// the bot, in the page: one frame's decision (runs between RS.sim steps)
const BOT = () => {
  window.__bot = (o = {}) => {
    const B = RS.director.boss, P = RS.player, T = RS.THREE, A = B.A, items = RS.items.items;
    const s = window.__bs || (window.__bs = { cool: 0, seen: {}, phases: new Set(), hpDropsUnhit: 0, lastHp: null, dmgCalls: 0, knocks: 0, wasKnock: false, ate: 0, throws: 0, frames: 0, maxProgs: 0, tele: {} });
    if (!s.wrapped) { s.wrapped = true; const d0 = B.damage.bind(B); B.damage = (...a) => { s.dmgCalls++; s.hitFrame = s.frames; return d0(...a); }; }
    if (s.lastHp !== null && B.hp < s.lastHp && s.hitFrame !== s.frames) s.hpDropsUnhit++;      // (health only ever goes down through a hit: damage() since the last look)
    s.frames++; s.phases.add(B.ph); s.seen[B.st] = (s.seen[B.st] || 0) + 1; if (B.st === 'tele' && B.act) s.tele[B.act] = (s.tele[B.act] || 0) + 1;
    s.lastHp = B.hp;
    if (P.knock && !s.wasKnock) s.knocks++; s.wasKnock = !!P.knock;
    if (B.over || o.idle) return;
    const dt = 1 / 30, me = P.head, F = P.flatHolder, held = F && F.held;
    s.cool -= dt;
    // dodge: get out of whatever's coming
    let mx = 0, mz = 0;
    for (const h of B.hazards) {
      if (h.kind !== 'tele') continue;
      if (h.__skip === undefined) h.__skip = [3, 7, 11].includes(s.nTele = (s.nTele || 0) + 1);      // (a human misses one now and then: three warnings early on isn't dodged, so the boss's hits always get tested)
      if (h.__skip) continue; const dx = me.x - B.x, dz = me.z - B.z, d = Math.hypot(dx, dz) || 1;
      if (h.a === 'slam' && d < h.r + 0.8) { mx += dx / d; mz += dz / d; }
      if (h.a === 'wave' && d > h.r0 - 0.7) { mx -= dx / d; mz -= dz / d; }
      if (h.a === 'charge' && B.lane) { const L = B.lane, lx = L.x1 - L.x0, lz = L.z1 - L.z0, ll = Math.hypot(lx, lz) || 1, ux = lx / ll, uz = lz / ll, px = me.x - L.x0, pz = me.z - L.z0, along = px * ux + pz * uz, side = px * -uz + pz * ux;
        if (along > -1 && along < ll + 1.5 && Math.abs(side) < L.w + 0.9) { const sg = side >= 0 ? 1 : -1; mx += -uz * sg * 1.5; mz += ux * sg * 1.5; } }
    }
    if (B.st === 'charge' && B.lane) { const L = B.lane, lx = L.x1 - L.x0, lz = L.z1 - L.z0, ll = Math.hypot(lx, lz) || 1, side = ((me.x - L.x0) * -lz + (me.z - L.z0) * lx) / ll; if (Math.abs(side) < L.w + 0.9) { const sg = side >= 0 ? 1 : -1; mx += -lz / ll * sg * 1.5; mz += lx / ll * sg * 1.5; } }
    for (const p of B.projs) { if (p.landed) continue; const dx = me.x - p.to.x, dz = me.z - p.to.z, d = Math.hypot(dx, dz) || 0.01; if (d < p.r + 0.7) { mx += dx / d * 1.3; mz += dz / d * 1.3; } }
    const dodging = Math.hypot(mx, mz) > 0.01;
    // food: go and get some (or eat what you've got when you're hurt)
    let goal = null;
    if (!dodging && !held && !P.knock) {
      let best = null, bd = 1e9; for (const it of items) { if (it.dead || it.heldBy || it.def.veg || it.def.prop || it.netMirror && it.ownerId) continue; const d = Math.hypot(it.pos.x - me.x, it.pos.z - me.z); if (d < bd && it.pos.y < 1.6) { bd = d; best = it; } }
      if (best && bd < 1.4) { P.flatGrab(best); s.grabs = (s.grabs || 0) + 1; } else if (best) goal = best.pos;
    }
    if (held && !o.noEat && B.hearts <= 3 && P.canEat && !held.def.drink) { P.flatEat(); }
    else if (held && !o.noThrow && s.cool <= 0 && !P.knock && !B.shielded && P.flatEatT < 0) {
      // the lads first if they're close, otherwise the boss (the weak spot when it's out of puff)
      const mn = RS.cast.find(c => c.bossMinion && !c.down && !c.disposed && Math.hypot(c.pos.x - me.x, c.pos.z - me.z) < 5);
      if (mn) { const it = held; P.flatThrow(7); B.aimAt(it, mn.rag.pos('chest', new T.Vector3()), 7); }
      else B.throwHeldAt(B.st === 'tired' ? 'chest' : Math.random() < 0.6 ? 'head' : 'chest');
      s.throws++; s.cool = 0.35;
    }
    if (!dodging && !goal) { const dx = me.x - B.x, dz = me.z - B.z, d = Math.hypot(dx, dz) || 1; if (d < 4) { mx += dx / d * 0.6; mz += dz / d * 0.6; } }
    if (!dodging && goal) { const dx = goal.x - me.x, dz = goal.z - me.z, d = Math.hypot(dx, dz) || 1; mx = dx / d; mz = dz / d; }
    const l = Math.hypot(mx, mz); if (l > 0.01 && !P.knock && !(P.fx.frozen > 0)) {
      const sp = (dodging ? 5.2 : 3.2) * dt, R = A.play, nav = RS.room.nav, ok = (x, z) => x > R[0] && x < R[1] && z > R[2] && z < R[3] && (!nav || (nav.idx(x, z) >= 0 && nav.free[nav.idx(x, z)]));
      let nx = me.x + mx / l * sp, nz = me.z + mz / l * sp;
      if (!ok(nx, nz)) { const a = Math.atan2(mz, mx); for (const da of [0.8, -0.8, 1.6, -1.6, 2.4, -2.4]) { const x = me.x + Math.cos(a + da) * sp, z = me.z + Math.sin(a + da) * sp; if (ok(x, z)) { nx = x; nz = z; break; } } }
      if (ok(nx, nz)) { P.rig.position.x += nx - me.x; P.rig.position.z += nz - me.z; }
    }
  };
};
// runs the fight in chunks (each a few seconds of game) until it's over or the clock runs out
async function fight(p, opts, maxSecs) {
  for (let t = 0; t < maxSecs; t += 2) {
    const r = await p.evaluate((o) => { for (let i = 0; i < 60; i++) { RS.sim(1 / 30, 1 / 30); window.__bot(o); if (i % 30 === 0) RS.renderer.render(RS.scene, RS.player.camera); if (RS.director.boss && RS.director.boss.ended) break; }
      const B = RS.director.boss; return { over: B && B.over, ended: B && B.ended, hp: B && B.hp, ph: B && B.ph, hearts: B && B.hearts }; }, opts);
    if (r.ended) return r;
  }
  return null;
}
const summary = (p) => p.evaluate(() => { const B = RS.director.boss, s = window.__bs, lines = RS.director.lastLines || [];
  return { id: B && B.id, over: B && B.over, hp: B && B.hp, mx: B && B.mx, phases: [...s.phases], seen: s.seen, tele: s.tele, unhit: s.hpDropsUnhit, dmgCalls: s.dmgCalls, knocks: s.knocks, kd: B && B.stats.kd, throws: s.throws, hits: B && B.stats.hits, crits: B && B.stats.crits, minions: B && B.stats.minions, healed: B && B.stats.healed,
    running: RS.director.running, receipt: !!(RS.director.receipt && RS.director.receipt.visible), lines: lines.map(l => l.join(': ')), gameover: document.body.classList.contains('gameover'), progs: RS.renderer.info.programs.length, t: Math.round(B ? B.t : 0) }; });

const ONLY = process.env.BOSS_ONLY ? process.env.BOSS_ONLY.split(',') : null, part = (k) => !ONLY || ONLY.includes(k);      // (BOSS_ONLY=solo,defeat,arenas,phone,mp: just those)
export default async function () {
  const C = checker('boss'), b = await launch();
  try {
    // ---- on your own, to the end, in each place
    for (const [place, boss, arena] of part('solo') ? [['garden', 'noah', 'garden'], ['pub', 'chloe', 'carpark'], ['pub', 'lewis', 'beergarden']] : []) {
      const p = await newPage(b, { width: 640, height: 400 });
      try {
        await startGame(p, { place, mode: 'boss', extra: '&boss=' + boss + '&arena=' + arena });
        { const a = await p.evaluate(() => ({ arena: RS.director.boss.arena, patio: RS.room.patio ? RS.room.patio.cleared : null }));
          C.ok(a.arena === arena, `${place}: asked for the ${arena} arena, got ${a.arena}`);
          if (arena === 'beergarden') C.ok(a.patio === true, `beer garden: the patio's benches weren't cleared for the fight (${a.patio})`); }
        await p.evaluate(BOT); await p.evaluate(() => RS.renderer.setAnimationLoop(null));
        const r0 = await p.evaluate(() => ({ mode: RS.director.mode, id: RS.director.boss && RS.director.boss.id }));
        C.ok(r0.mode === 'boss' && r0.id === boss, `${place}: didn't start the boss fight (${JSON.stringify(r0)})`);
        const end = await fight(p, {}, 600);
        const s = await summary(p);
        console.log(`  ${place}/${arena}/${boss}: ${s.over} in ${s.t}s, phases ${s.phases}, attacks ${JSON.stringify(s.tele)}, ${s.hits} hits (${s.crits} crits) from ${s.throws} throws, knocked down ${s.kd}x, healed ${s.healed}, lads KO'd ${s.minions}`);
        C.ok(end && s.over === 'win', `${place}/${boss}: the bot didn't win (${JSON.stringify({ over: s.over, hp: s.hp, phases: s.phases, kd: s.kd, t: s.t })})`);
        C.ok([1, 2, 3].every(n => s.phases.includes(n)), `${place}/${boss}: not every phase happened: ${s.phases}`);
        for (const a of ['slam', 'throw', 'charge']) C.ok(s.tele[a] > 0, `${place}/${boss}: never did a ${a}`);
        C.ok(s.tele.wave > 0 || s.tele.summon > 0, `${place}/${boss}: no phase 2 moves (wave / summon) seen`);
        C.ok(s.seen.tired > 0 && s.seen.phase > 0 && s.seen.dead > 0, `${place}/${boss}: missing states: ${JSON.stringify(s.seen)}`);
        C.ok(s.unhit === 0, `${place}/${boss}: the boss's health went down ${s.unhit} times without being hit`);
        C.ok(s.hits > 5 && s.dmgCalls >= s.hits, `${place}/${boss}: hardly any hits counted (${s.hits} hits, ${s.dmgCalls} damage calls)`);
        C.ok(s.kd > 0 && s.knocks > 0, `${place}/${boss}: the boss's attacks never knocked you down (${s.kd} / ${s.knocks})`);
        C.ok(!s.running && s.gameover && s.receipt, `${place}/${boss}: no end screen and receipt (running ${s.running}, gameover ${s.gameover}, receipt ${s.receipt})`);
        C.ok(s.lines.some(l => /RESULT: VICTORY/.test(l)) && s.lines.some(l => /DAMAGE DEALT/.test(l)), `${place}/${boss}: the receipt's wrong: ${s.lines.slice(0, 6).join(' | ')}`);
        C.ok(!p.errors.length, `${place}/${boss}: page errors: ` + [...new Set(p.errors)].slice(0, 4).join(' | '));
        { const cr = p.crashes.filter(c => c.k !== 'start' && c.k !== 'hang'); C.ok(!cr.length, `${place}/${boss}: crash reports: ` + cr.slice(0, 3).map(c => c.k + ' ' + c.m).join(' | ')); }      // (hang: the test itself holds the page while it steps the game)
      } catch (e) { C.ok(false, `${place}/${boss}: ${e.message.slice(0, 300)}`); }
      await p.context().close();
    }
    // ---- defeat: a bot that just stands there; then every boss builds and gets going; then a second fight in the same game
    if (part('defeat')) { const p = await newPage(b, { width: 640, height: 400 });
      try {
        await startGame(p, { place: 'garden', mode: 'boss', extra: '&boss=lewis' });
        await p.evaluate(BOT);
        // (no first-time stutters: once the shaders are warmed, the whole fight builds no new ones)
        await p.waitForFunction(() => window.__shaderWarm && RS.director.boss.c && RS.director.boss.c.rag.mesh, null, { timeout: 240000 }).catch(() => {});
        await p.waitForTimeout(1500); await p.waitForFunction(() => window.__shaderWarm, null, { timeout: 240000 }).catch(() => {});
        const n0 = await p.evaluate(() => { RS.renderer.setAnimationLoop(null); RS.renderer.render(RS.scene, RS.player.camera); return RS.renderer.info.programs.length; });
        await fight(p, { idle: true }, 400);
        const s = await summary(p);
        C.ok(s.progs === n0, `defeat: ${s.progs - n0} shaders built during the fight (a stutter each): add them to shaderwarm.js SIGS`);
        console.log(`  defeat: ${s.over} after ${s.t}s, knocked down ${s.kd}x, boss at ${s.hp}/${s.mx}`);
        C.ok(s.over === 'lose', `defeat: standing still didn't lose (${JSON.stringify({ over: s.over, kd: s.kd, t: s.t })})`);
        C.ok(s.hp === s.mx, `defeat: the boss lost health with nobody throwing anything (${s.hp}/${s.mx})`);
        C.ok(s.kd >= 5, `defeat: lost with only ${s.kd} hits taken`);
        C.ok(s.lines.some(l => /RESULT: DEFEAT/.test(l)) && s.receipt && !s.running, `defeat: receipt: ${s.lines.slice(0, 5).join(' | ')}`);
        // every boss: build, drop in, move about, attack (a fresh fight each)
        for (const id of ['noah', 'lewis', 'chloe', 'tommy']) {
          await p.evaluate((id) => { window.__bossPick = id; RS.newGame('boss'); window.__bs = null; }, id);
          await p.waitForFunction(() => RS.director.boss.c && RS.director.boss.c.rag.mesh, null, { timeout: 30000 }).catch(() => {});      // (the model's put together once it's loaded)
          for (let k = 0; k < 7; k++) await p.evaluate(() => RS.sim(2, 1 / 30));
          const r = await p.evaluate(() => { const B = RS.director.boss;
            return { id: B.id, st: B.st, mesh: !!(B.c && B.c.rag.mesh), drawn: B.c && B.c.rag.group.scale.y, over: B.over, moved: Math.hypot(B.x - B.A.home[0], B.z - B.A.home[1]), cast: RS.cast.length, hz: B.hazards.length + B.projs.length }; });
          C.ok(r.id === id && r.mesh && r.drawn > 1.8 && !r.over && r.st !== 'drop', `${id}: didn't build or get going: ${JSON.stringify(r)}`);
        }
        // the lads it calls in: one throw of food knocks one out (and it goes)
        const mn = await p.evaluate(async () => { const B = RS.director.boss, P = RS.player, T = RS.THREE; B.setSt('idle'); B.ph = 2; B.summon(); RS.sim(0.3, 1 / 30);
          const c = RS.cast.find(x => x.bossMinion); if (!c) return { none: true };
          await new Promise(r => setTimeout(r, 1500)); RS.sim(0.1, 1 / 30);
          const cp = c.pos.clone(); P.rig.position.x += cp.x + 2.5 - P.head.x; P.rig.position.z += cp.z - P.head.z; RS.sim(0.1, 1 / 30);
          for (let k = 0; k < 3 && !(B.stats.minions > 0); k++) {      // (up to three goes: a lad running at you is a moving target)
            const cp2 = c.pos.clone(); P.rig.position.x += cp2.x + 2.2 - P.head.x; P.rig.position.z += cp2.z - P.head.z; RS.sim(0.05, 1 / 30);
            const it = RS.items.items.find(i => !i.dead && !i.heldBy && !i.def.veg && !i.def.prop && !i.def.drink); P.flatGrab(it); RS.sim(0.4, 1 / 30);      // (in the hand first)
            P.flatThrow(7); B.aimAt(it, c.rag.pos('chest', new T.Vector3()), 7); RS.sim(1, 1 / 30); }
          return { down: c.down || c.bossGone, ko: B.stats.minions, n: B.minions.length }; });
        C.ok(mn.ko > 0, `a lad the boss called in wasn't knocked out by a throw: ${JSON.stringify(mn)}`);
        // nothing from the old fights left lying about
        const left = await p.evaluate(() => { RS.newGame('roam0'); RS.sim(2, 1 / 30); return { hud: document.querySelector('#boss-hud').className, ammo: RS.items.items.filter(i => i.bossAmmo && !i.dead).length, boss: !!RS.director.boss, cast: RS.cast.length }; });
        C.ok(!left.boss && !/on/.test(left.hud) && left.ammo === 0 && left.cast === 1, `after the boss fight: things left behind ${JSON.stringify(left)}`);
        C.ok(!p.errors.length, `defeat/bosses: page errors: ` + [...new Set(p.errors)].slice(0, 4).join(' | '));
      } catch (e) { C.ok(false, `defeat/bosses: ${e.message.slice(0, 300)}`); }
      await p.context().close(); }
    // ---- where it's fought: the pub picks its car park or its beer garden at random (both come up, nothing else does); the
    // beer garden's patio furniture is stacked away for the fight and back after, with its blocks; Lewis's is always his lawn
    if (part('arenas')) { const p = await newPage(b, { width: 390, height: 844, mobile: true });
      try {
        await startGame(p, { place: 'pub', mode: 'roam0' });
        const r = await p.evaluate(async () => { RS.renderer.setAnimationLoop(null); const M = await import('/js/boss.js'); let seed = 1;
          const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }, seen = {};
          for (let i = 0; i < 200; i++) { const a = M.pickArena('pub', rnd); seen[a] = (seen[a] || 0) + 1; }
          const lewis = new Set(); for (let i = 0; i < 20; i++) lewis.add(M.pickArena('garden', rnd));
          const room = RS.room, nb0 = room.blockers.length, games = {}, patio = [];
          for (let i = 0; i < 8; i++) { RS.newGame('boss'); RS.sim(0.5, 1 / 30); const B = RS.director.boss; games[B.arena] = (games[B.arena] || 0) + 1;
            const st = B.A.start, k = room.nav.idx(st[0], st[1]); patio.push([B.arena, room.patio.cleared, !!(k >= 0 && room.nav.free[k])]); }
          RS.newGame('roam0'); RS.sim(0.5, 1 / 30);
          return { seen, lewis: [...lewis], games, patio, back: room.patio && !room.patio.cleared && room.blockers.length === nb0, mesh: RS.scene.getObjectByName('patio furniture').visible }; });
        console.log(`  arenas: 200 picks ${JSON.stringify(r.seen)}, 8 real fights ${JSON.stringify(r.games)}`);
        C.ok(r.seen.carpark > 60 && r.seen.beergarden > 60 && Object.keys(r.seen).length === 2, `the pub's arena isn't a random pick of the car park and the beer garden: ${JSON.stringify(r.seen)}`);
        C.ok(r.lewis.length === 1 && r.lewis[0] === 'garden', `Lewis's garden picked somewhere else: ${r.lewis}`);
        C.ok(Object.keys(r.games).every(a => a === 'carpark' || a === 'beergarden'), `a fight at the pub went somewhere else: ${JSON.stringify(r.games)}`);
        for (const [a, cleared, free] of r.patio) { C.ok(cleared === (a === 'beergarden'), `${a}: the patio ${cleared ? 'was' : 'wasn\'t'} cleared`); C.ok(free, `${a}: you start somewhere you can't stand`); }
        C.ok(r.back && r.mesh, `after the beer garden fight the patio's benches didn't come back (${JSON.stringify({ back: r.back, mesh: r.mesh })})`);
        C.ok(!p.errors.length, `arenas: page errors: ` + [...new Set(p.errors)].slice(0, 4).join(' | '));
      } catch (e) { C.ok(false, `arenas: ${e.message.slice(0, 300)}`); }
      await p.context().close(); }
    // ---- a phone (portrait) in the headset's absence: the tap-to-throw path counts as a hit
    if (part('phone')) { const p = await newPage(b, { width: 390, height: 844, mobile: true });
      try {
        await startGame(p, { place: 'garden', mode: 'boss', extra: '&boss=chloe' });
        const r = await p.evaluate(() => { RS.renderer.setAnimationLoop(null); RS.sim(8, 1 / 30); const B = RS.director.boss, P = RS.player;
          for (let i = 0; i < 300 && (B.shielded || B.st === 'charge'); i++) RS.sim(1 / 30, 1 / 30);      // (not mid-roar or mid-charge: a hit then is BLOCKED or misses, which isn't what's being checked)
          const it = RS.items.items.find(i => !i.dead && !i.heldBy && !i.def.veg && !i.def.prop); P.flatGrab(it); RS.sim(0.3, 1 / 30);      // (in the hand first)
          const hd = B.drawn(B.c.rag.pos('chest', new RS.THREE.Vector3())), cam = P.camera; cam.updateMatrixWorld(); const v = hd.clone().project(cam);
          const ray = new RS.THREE.Raycaster(); ray.setFromCamera(new RS.THREE.Vector2(v.x, v.y), cam);
          const hp0 = B.hp, tapped = B.tap(ray.ray); RS.sim(1.5, 1 / 30);
          const hud = document.querySelector('#boss-hud').getBoundingClientRect(), wr = innerWidth;
          return { tapped, hp0, hp: B.hp, hudOk: hud.left >= 0 && hud.right <= wr + 1 && hud.top >= 0, onScreen: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 }; });
        C.ok(r.tapped && r.hp < r.hp0, `phone: tapping the boss with food in hand didn't hit it (${JSON.stringify(r)})`);
        C.ok(r.hudOk, `phone: the health bar doesn't fit on the screen`);
        C.ok(!p.errors.length, `phone: page errors: ` + [...new Set(p.errors)].slice(0, 4).join(' | '));
      } catch (e) { C.ok(false, `phone: ${e.message.slice(0, 300)}`); }
      await p.context().close(); }
    // ---- two real games in a room
    if (part('mp')) await multiplayer(C, b);
  } finally { await b.close(); }
  return C.fails;
}

async function multiplayer(C, b) {
  const host = await startRoomHost(), pages = [];
  try {
    for (const [name, ch] of [['HOSTY', 'lewis'], ['JOINY', 'harry']]) { const p = await newPage(b, { width: 480, height: 360 }); p.pname = name; p.ch = ch; pages.push(p);
      await p.goto('http://game.local/index.html?relay=' + encodeURIComponent(host.url), { timeout: 120000, waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1200); }
    const ev = (p, f, a) => p.evaluate(f, a), cl = (p, s) => ev(p, (s) => document.querySelector(s).click(), s);
    const join = async (p, code) => { await cl(p, '.playbtn'); await sleep(400); await cl(p, '#pick-multi'); await sleep(400);
      await ev(p, ([n, c]) => { document.querySelector('#mp-myname').value = n; const m = document.querySelector(`#char-grid .mate[data-id="${c}"]`); if (m) m.click(); }, [p.pname, p.ch]); await cl(p, '#char-next'); await sleep(400);
      if (!code) { await cl(p, '#mp-host2'); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.code && ronnieMP.net.status === 'on', null, { timeout: 60000 }); return ev(p, () => ronnieMP.net.code); }
      await ev(p, (c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on', null, { timeout: 60000 }); };
    const [H, J] = pages, code = await join(H); await join(J, code);
    await cl(H, '#room-go'); await sleep(400); await ev(H, () => document.querySelector('.scene[data-id="pub"]').click()); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="place"] .bigbtn').click()); await sleep(500);
    await ev(H, () => { const f = () => document.querySelector('.flip[data-id="roam"]'); f() && f().click(); }); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="mode"] .bigbtn').click()); await sleep(500); await readyUp(pages); await cl(H, '#go');
    const tapIn = (p) => p.waitForFunction(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click();
      const st = document.getElementById('start'), inGame = window.RS && document.body.classList.contains('ready') && st && st.classList.contains('gone');
      if (inGame) { const bb = document.querySelector('#play-flat'); if (bb && bb.offsetParent) bb.click(); }
      return inGame && !RS.player.menuLock; }, null, { timeout: 300000, polling: 700 });
    for (const p of pages) await tapIn(p);
    for (const p of pages) await ev(p, () => { RS.renderer.__render = RS.renderer.render; RS.renderer.render = () => {}; });
    await sleep(3000);
    // the host starts the boss fight: the joiner's game follows
    await ev(H, () => { window.__bossPick = 'noah'; window.__bossArena = 'beergarden'; RS.newGame('boss'); });
    for (const p of pages) await p.waitForFunction(() => window.RS && RS.director.boss && RS.director.boss.id === 'noah', null, { timeout: 60000 }).catch(() => C.ok(false, `mp: ${p.pname} never got the boss fight`));
    await sleep(8000);      // (the entrance)
    const both = async () => Promise.all(pages.map(p => ev(p, () => { const B = RS.director.boss; return { hp: B.hp, mx: B.mx, st: B.st, x: B.x, z: B.z, host: B.host, players: B.players.size, mine: B.stats.dmg }; })));
    { const ar = await Promise.all(pages.map(p => ev(p, () => [RS.director.boss.arena, RS.room.patio ? RS.room.patio.cleared : null, Math.round(RS.player.head.z)])));
      C.ok(ar[0][0] === 'beergarden' && ar[1][0] === 'beergarden', `mp: the host's arena didn't reach the joiner: ${JSON.stringify(ar)}`);
      C.ok(ar.every(a => a[1] === true && a[2] > 22), `mp: someone isn't in the beer garden or its patio isn't clear: ${JSON.stringify(ar)}`); }
    const [h0, j0] = await both();
    C.ok(h0.host && !j0.host, `mp: who's running the boss is wrong (host ${h0.host}, joiner ${j0.host})`);
    C.ok(h0.mx === j0.mx && Math.abs(h0.hp - j0.hp) < 1, `mp: the two games see different boss health: host ${h0.hp}/${h0.mx}, joiner ${j0.hp}/${j0.mx}`);
    C.ok(h0.mx > 900, `mp: the boss's health isn't scaled up for two (${h0.mx})`);
    C.ok(Math.hypot(h0.x - j0.x, h0.z - j0.z) < 2, `mp: the boss is in different places (${h0.x.toFixed(1)},${h0.z.toFixed(1)} vs ${j0.x.toFixed(1)},${j0.z.toFixed(1)})`);
    // the joiner throws food at it, a few times
    let thrown = 0;
    for (let k = 0; k < 14 && thrown < 4; k++) {
      const r = await ev(J, () => { const B = RS.director.boss, P = RS.player; if (B.shielded) return 'shielded ' + B.st; const me = P.head;
        let it = P.flatHolder.held; if (!it) { it = RS.items.items.filter(i => !i.dead && !i.heldBy && !i.def.veg && !i.def.prop).sort((a, b) => a.pos.distanceTo(me) - b.pos.distanceTo(me))[0]; if (!it) return 'no food'; P.rig.position.x += it.pos.x - me.x; P.rig.position.z += it.pos.z - me.z + 0.5; P.flatGrab(it); return 'grabbed'; }
        return B.throwHeldAt('head') ? 'threw' : 'no throw'; });
      if (r === 'threw') thrown++;
      await sleep(900);
    }
    let h1, j1; for (let k = 0; k < 16; k++) { await sleep(500); [h1, j1] = await both(); if (k >= 4 && Math.abs(h1.hp - j1.hp) < 1) break; }      // (the host's word reaches the joiner ten times a second)
    if (Math.abs(h1.hp - j1.hp) >= 1) console.log('  mp: joiner state', JSON.stringify(await ev(J, () => ({ heard: Math.round(performance.now() - (RS.director.boss.stateAt || 0)), hostId: RS.net.hostId, host: RS.net.host, players: [...RS.net.players.keys()] }))), 'host', JSON.stringify(await ev(H, () => ({ id: RS.net.id, mpOn: RS.director.boss.mpOn, players: RS.net.players.size }))));
    const hostSees = await ev(H, () => { const B = RS.director.boss; return [...B.players.values()].map(p => ({ name: p.name, dmg: p.dmg, hits: p.hits })); });
    console.log(`  mp: joiner threw ${thrown}, joiner counted ${j1.mine} damage, host credits ${JSON.stringify(hostSees)}; boss ${h1.hp}/${h1.mx} (host) vs ${j1.hp} (joiner)`);
    C.ok(thrown >= 2, `mp: the joiner couldn't throw anything (${thrown})`);
    C.ok(hostSees.some(p => p.dmg > 0) && h1.hp < h0.hp, `mp: the joiner's hits didn't count on the host (${JSON.stringify(hostSees)}, hp ${h0.hp} -> ${h1.hp})`);
    C.ok(Math.abs(h1.hp - j1.hp) < 1, `mp: the two games disagree on the boss's health after the joiner's hits: ${h1.hp} vs ${j1.hp}`);
    for (const p of pages) C.ok(!p.errors.length, `mp: ${p.pname} page errors: ` + [...new Set(p.errors)].slice(0, 4).join(' | '));
  } catch (e) { C.ok(false, 'mp: ' + e.message.slice(0, 400)); }
  finally { for (const p of pages) await p.context().close().catch(() => {}); await host.close(); }
}
