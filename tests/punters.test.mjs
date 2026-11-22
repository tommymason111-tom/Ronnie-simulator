// RUN THE PUB'S PUNTERS: their looks and their library of moves (js/punteranims.js, js/punterlife.js).
// - there are lots of moves (at least 70), every one plays on a punter (stood, and the sat ones sat in a real chair) with
//   no error, nothing undefined, and SMOOTHLY: no part of the body turns further in one frame than a real body could
//   (sampled at 30fps right through each clip, and through the cross-fade from one clip to the next)
// - every kind of punter is made differently (no two the same) and builds with no new shader
// - a FIGHT plays out as proper exchanges (several different moves, punches landing on the other one's flinch, the
//   third one holding someone back); an ARGUMENT takes turns and calms down when Ronnie stands by them; a SING-SONG
//   spreads round the pub; the queue gets impatient (waving, tapping) and then fumes
// SHOTS=dir saves a contact sheet of every move, and a line-up of punters (upright phone)
import fs from 'fs';
import { launch, newPage, startGame, sleep, checker } from './lib/game.mjs';
const SHOTS = process.env.SHOTS || '';

export default async function () {
  const C = checker('punters'), b = await launch();
  try {
    const p = await newPage(b, { width: 390, height: 844, mobile: true });
    await startGame(p, { place: 'pub', mode: 'runpub1' }); await sleep(800);
    const r = await p.evaluate(async (shots) => {
      RS.renderer.setAnimationLoop(null);
      const T = RS.THREE, rp = RS.director.runpub, out = { bad: [], shots: {} };
      const A = await import('./js/punteranims.js'), names = A.CLIP_NAMES;
      out.n = names.length;
      RS.director.timeLeft = 1e5;      // (the night doesn't end while this runs)
      RS.player.rig.position.set(-2, 0, -4); RS.sim(1 / 30); RS.renderer.render(RS.scene, RS.player.camera);      // (stood where the line-up's looked at from, the lights near there on)
      const progs0 = RS.renderer.info.programs.length, keys0 = new Set(RS.renderer.info.programs.map(p => p.cacheKey));
      // a line-up: every kind, twice
      const kinds = ['old', 'old', 'dad', 'mum', 'kid', 'kid', 'lad', 'lad', 'hool', 'mum'];
      rp.update = () => {}; for (const c of rp.punters.slice()) rp.remove(c);      // (just the ones made here)
      const who = kinds.map((k, i) => { const c = i === 9 ? rp.add('mum', { hen: true }) : rp.add(k); c.rp.ctl = 'test'; c.state = 'idle'; c.path = null; c.rag.placeAt(-2.2 + (i % 5) * 0.9 + Math.floor(i / 5) * 0.45, 0.2 + Math.floor(i / 5) * 1.3, Math.PI); c.faceYaw = Math.PI; c.lookOverride = 0; return c; });
      RS.player.rig.position.set(-2, 0, -4);
      const looks = new Set(who.map(c => JSON.stringify(c.def.look) + JSON.stringify(c.def.body)));
      if (looks.size < who.length) out.bad.push(`only ${looks.size} different looks for ${who.length} punters`);
      for (let f = 0; f < 10; f++) RS.sim(1 / 30);
      RS.renderer.render(RS.scene, RS.player.camera);
      if (shots) { const cam = new T.PerspectiveCamera(40, 2, 0.05, 60); cam.position.set(-0.4, 1.5, -3.4); cam.lookAt(-0.4, 0.85, 1.7); RS.renderer.setSize(1200, 600, false); RS.renderer.render(RS.scene, cam); out.shots.lineup = RS.renderer.domElement.toDataURL('image/jpeg', 0.9); RS.renderer.setSize(innerWidth, innerHeight, false); }
      const progs1 = RS.renderer.info.programs.length;
      if (progs1 > progs0) out.bad.push(`punters built ${progs1 - progs0} new shader(s): ${RS.renderer.info.programs.filter(p => !keys0.has(p.cacheKey)).map(p => p.name + ' ' + p.cacheKey).join(' ;; ')}`);
      // every clip, on a stood punter and (the sat ones) a sat one; how far any part turns in a frame
      const stand = who[2], sit = who[3], seat = RS.room.seats.filter(s => s.h > 0.4 && s.h < 0.55).sort((a, b) => Math.hypot(a.x + 3, a.z - 1) - Math.hypot(b.x + 3, b.z - 1))[0];      /* (one out in the middle of the pub, for the pictures) */
      sit.seated = true; sit.rag.placeAt(seat.x, seat.z, seat.yaw); sit.faceYaw = seat.yaw;
      const PARTS = ['chest', 'pelvis', 'uArmL', 'lArmL', 'uArmR', 'lArmR', 'uLegL', 'lLegL', 'uLegR', 'lLegR', 'head'];
      const q = (c) => PARTS.map(n => { const b = c.rag.parts[n].body.quaternion; return new T.Quaternion(b.x, b.y, b.z, b.w); });
      let worst = { a: 0 }; const tiles = [];
      const cam = new T.PerspectiveCamera(40, 1, 0.05, 30);
      for (const name of names) {
        const clip = A.CLIPS[name], c = clip.sit ? sit : stand;
        A.setClip(c, name, { restart: true }); c.clip.rate = 1;
        let last = q(c); const steps = Math.ceil((clip.dur + 0.6) * 30);
        for (let f = 0; f < steps; f++) {
          RS.sim(1 / 30); const now = q(c);
          for (let i = 0; i < PARTS.length; i++) { const a = last[i].angleTo(now[i]); if (!isFinite(a)) out.bad.push(`${name}: ${PARTS[i]} is NaN`); else if (a / (/^f_(hit|shoved|stagger|block)$/.test(name) ? 1.4 : 1) > worst.a / (worst.k || 1)) worst = { a, name, part: PARTS[i], f, k: /^f_(hit|shoved|stagger|block)$/.test(name) ? 1.4 : 1 }; }      /* (taking a punch or a shove is allowed a sharper jolt) */
          last = now;
          if (shots && f === Math.floor(steps * 0.45)) { const pp = c.rag.pos('pelvis', new T.Vector3()), fy = c.rag.yaw + 0.5; cam.position.set(pp.x + Math.sin(fy) * 3.1, 1.45, pp.z + Math.cos(fy) * 3.1); cam.lookAt(pp.x, c.seated ? 0.7 : 0.9, pp.z); RS.renderer.setSize(240, 240, false); RS.renderer.render(RS.scene, cam); tiles.push([name, RS.renderer.domElement.toDataURL('image/jpeg', 0.8)]); }
        }
      }
      if (shots) RS.renderer.setSize(innerWidth, innerHeight, false);
      out.worst = worst; out.tiles = tiles;
      // more than 0.5 rad in a 1/30s frame is a jerk no body makes (0.7 for the jolt of taking a punch)
      if (worst.a / (worst.k || 1) > 0.5) out.bad.push(`twitchy: ${worst.name}'s ${worst.part} turns ${worst.a.toFixed(2)} rad in one frame`);
      // ---- the set pieces, on the real game logic
      rp.update = Object.getPrototypeOf(rp).update.bind(rp);
      for (const c of who) rp.remove(c);
      rp.spawnT = 1e9; rp.eventT = 1e9; rp.dropT = 1e9;
      // a fight
      rp.event = null; const used = new Set(), hitsLanded = { n: 0 };
      { const spot = { x: -0.5, z: 0.5 }, hs = [rp.add('hool'), rp.add('hool'), rp.add('hool')];
        hs.forEach((c, i) => { c.rp.phase = 'brawl'; c.rp.ctl = 'fight'; const a = i / 3 * 6.28; c.rag.placeAt(spot.x + Math.sin(a) * 0.75, spot.z + Math.cos(a) * 0.75, 0); c.state = 'idle'; });
        rp.event = { kind: 'fight', t: 0, who: hs, center: spot, knocked: new Set() };
        for (let f = 0; f < 30 * 25 && rp.event; f++) { RS.sim(1 / 30); for (const c of hs) { if (c.clip) used.add(c.clip.name); if (c.clip && /^f_(hit|stagger|shoved|block)$/.test(c.clip.name)) hitsLanded.n++; } }
        out.fightMoves = [...used].sort(); out.hits = hitsLanded.n;
        if (!['f_jab', 'f_haymaker', 'f_upper', 'f_shove', 'f_grapple', 'f_headlock'].filter(n => used.has(n)).length || used.size < 7) out.bad.push(`fight: only these moves in 25s: ${[...used].join(', ')}`);
        if (!hitsLanded.n) out.bad.push('fight: no punch ever landed on anyone');
        if (!used.has('f_holder') || !used.has('f_held')) out.bad.push('fight: nobody held anyone back');
        for (const c of hs) rp.remove(c); rp.event = null; }
      // an argument: two sat near each other; it calms down when you stand by them
      for (const c of rp.punters.slice()) rp.remove(c);
      { const seats = RS.room.seats.filter(s => s.h > 0.4 && s.h < 0.55 && s.x > -9.6 && s.z < 7.8 && s.z > -8.8);
        let pair = null; for (const s of seats) { const o = seats.find(t => t !== s && Math.hypot(t.x - s.x, t.z - s.z) < 1.6); if (o) { pair = [s, o]; break; } }
        const ab = pair.map(s => { const c = rp.add('lad'); c.rp.home = { x: s.x, z: s.z, yaw: s.yaw, seat: true }; c.rp.thirst = 1e9; c.rp.stay = 1e9; rp.settleHome(c); return c; });
        for (let f = 0; f < 10; f++) RS.sim(1 / 30);
        if (!RS.director.runpub.life.startArgue()) out.bad.push('argument: never started');
        const e = rp.event, aused = new Set(); out.argueDbg = [];
        for (let f = 0; f < 30 * 20 && rp.event === e; f++) { RS.sim(1 / 30); for (const c of ab) if (c.clip) aused.add(c.clip.name); if (f % 60 === 0) out.argueDbg.push(ab.map(c => [c.state, c.rp.ctl, c.rp.phase, c.clip && c.clip.name, c.pos.x.toFixed(2), c.pos.z.toFixed(2)].join('/')).join(' & ') + ' ev=' + (rp.event && rp.event.kind)); }
        out.argueMoves = [...aused].sort();
        if ([...aused].filter(n => n.startsWith('a_')).length < 4) out.bad.push(`argument: only ${[...aused].join(', ')}`);
        RS.player.rig.position.set(e.at.x + 0.6, 0, e.at.z + 0.6); RS.sim(1 / 30);
        let calmed = false; for (let f = 0; f < 30 * 6; f++) { RS.player.rig.position.set(e.at.x + 0.6, 0, e.at.z + 0.6); RS.sim(1 / 30); if (rp.event !== e) { calmed = true; break; } }
        if (!calmed) out.bad.push('argument: never calmed down with Ronnie stood by them');
        for (let f = 0; f < 30 * 6; f++) RS.sim(1 / 30);
        if (ab.some(c => c.rp.ctl)) out.bad.push('argument: still arguing after it was sorted');
        for (const c of ab) rp.remove(c); rp.event = null; RS.player.rig.position.set(-2, 0, -4); }
      // a sing-song: it spreads
      { const crowd = []; for (const s of RS.room.seats.filter(s => s.x > -9.6 && s.x < 2 && s.z < 7.8 && s.z > -8.8).slice(0, 8)) { const c = rp.add(Math.random() < 0.5 ? 'old' : 'lad'); c.rp.home = { x: s.x, z: s.z, yaw: s.yaw, seat: true }; c.rp.thirst = 1e9; c.rp.stay = 1e9; rp.settleHome(c); crowd.push(c); }
        const singer = crowd[0]; singer.rp.phase = 'sing'; singer.rp.ctl = 'sing'; singer.seated = false;
        rp.event = { kind: 'singer', t: 0, who: [singer], lineT: 0 }; const e = rp.event;
        for (let f = 0; f < 30 * 20 && rp.event === e; f++) RS.sim(1 / 30);
        const joined = (e.joined || []).length, singing = crowd.filter(c => c.clip && /^(t_sing|g_)/.test(c.clip.name)).length;
        out.sing = { joined, singing };
        if (joined < 3 || singing < 3) out.bad.push(`sing-song: only ${joined} joined in (${singing} singing)`);
        for (const c of crowd) rp.remove(c); rp.event = null; }
      // the queue: waiting gets impatient, then fumes
      { const c = rp.add('old'), spot = RS.room.barSpots[1]; rp.barTaken.set(spot, c); c.rp.spot = spot; c.rp.home = { x: spot.x, z: spot.z, yaw: spot.yaw, bar: spot }; c.rag.placeAt(spot.x, spot.z, spot.yaw); c.state = 'idle'; rp.order(c); c.rp.patience = 24;
        const qused = new Set(); for (let f = 0; f < 30 * 70; f++) { RS.sim(1 / 30); if (c.clip) qused.add(c.clip.name); }
        out.queue = [...qused].sort();
        if (!qused.has('q_wallet') || ![...qused].some(n => /q_(wave|tap|drum|lean_over|sigh|point_watch)/.test(n)) || ![...qused].some(n => /q_(fume|bang)|a_wide/.test(n))) out.bad.push(`queue: ${[...qused].join(', ')}`);
        rp.remove(c); }
      return out;
    }, !!SHOTS);
    console.log((r.argueDbg || []).join('\n')); console.log(`  ${r.n} moves; worst turn in a frame ${r.worst.a.toFixed(2)} rad (${r.worst.name} ${r.worst.part}); fight: ${r.fightMoves.length} moves, ${r.hits} frames of reactions; argument: ${r.argueMoves.join(' ')}; sing-song: ${JSON.stringify(r.sing)}; queue: ${r.queue.join(' ')}`);
    C.ok(r.n >= 70, `only ${r.n} moves`);
    C.ok(!r.bad.length, r.bad.slice(0, 8).join(' | '));
    C.ok(!p.errors.length, `page errors ${p.errors.slice(0, 3).join(' | ')}`);
    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      if (r.shots.lineup) fs.writeFileSync(`${SHOTS}/punters-lineup.jpg`, Buffer.from(r.shots.lineup.split(',')[1], 'base64'));
      // the contact sheet: every move at about half way
      const html = `<body style="margin:0;background:#111;display:flex;flex-wrap:wrap;width:1600px">${r.tiles.map(([n, d]) => `<div style="width:200px;font:12px Arial;color:#fff;text-align:center"><img src="${d}" width=200 height=200><br>${n}</div>`).join('')}</body>`;
      const q = await b.newPage({ viewport: { width: 1600, height: 400 } }); await q.setContent(html); await q.waitForTimeout(300);
      await q.screenshot({ path: `${SHOTS}/punters-moves.png`, fullPage: true }); await q.close();
    }
    await p.close();
  } finally { await b.close(); }
  return C.fails;
}
