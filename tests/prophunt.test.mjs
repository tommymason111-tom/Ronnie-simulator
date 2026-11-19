// PROP HUNT with real games in one room through the real menus and room server, on each of its three maps (the pub,
// Lidl, Lewis's). The host changes the game to Prop Hunt and everyone follows; the host presses START. Then:
//   - the teams are dealt the same on every game (one seeker for up to four players, the rest hide), the seeker is
//     blindfolded and held while the hiders hide
//   - hiders become props (one by looking at a real one and pressing BECOME, the others from the list): every other
//     game draws the prop where they are, and the hider's character is gone from every other game
//   - a wrong guess (checking one of the real things) costs the seeker 10 health, on the host's game and the seeker's
//   - a taunt is heard by everyone and scores points; a lock is seen by everyone
//   - the seeker finds a hider: FOUND on every game, the hider's a ghost; find them all and the seekers win the round
//   - the next round the teams swap (someone else seeks); a round that runs out of time is won by the hiders left
//   - after the last round everyone has the results; no new shader is built by any of it; no errors anywhere
// PLACES=pub,shop,garden (default all three), PLAYERS=3 (2 to 5)
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';

const ALL = [['HOSTY', 'lewis'], ['BETH', 'chloe'], ['CARL', 'harry'], ['DAVE', 'ethan'], ['EDDY', 'aidan']];

export default async function () {
  const C = checker('prophunt'), places = (process.env.PLACES || 'pub,shop,garden').split(','), N = Math.max(2, Math.min(5, Number(process.env.PLAYERS) || 3));
  for (const place of places) { const fails = await onePlace(place, ALL.slice(0, N)); for (const f of fails) C.ok(false, `${place}: ${f}`); }
  return C.fails;
}

async function onePlace(place, WHO) {
  const C = checker('prophunt ' + place), host = await startRoomHost(), b = await launch(), t0 = Date.now(), log = (s) => process.env.VERBOSE && console.log(`  [${place} ${((Date.now() - t0) / 1000).toFixed(0)}s] ${s}`);
  try {
    const pages = [];
    for (const [name, ch] of WHO) { const p = await newPage(b, { width: 480, height: 360 }); p.pname = name; p.ch = ch; pages.push(p);
      await p.goto('http://game.local/index.html?relay=' + encodeURIComponent(host.url), { timeout: 240000 }); await p.waitForTimeout(1200); }
    const ev = (p, f, a) => p.evaluate(f, a), cl = (p, s) => ev(p, (s) => document.querySelector(s).click(), s);
    const join = async (p, code) => { await cl(p, '.playbtn'); await sleep(400); await cl(p, '#pick-multi'); await sleep(400);
      await ev(p, ([n, c]) => { document.querySelector('#mp-myname').value = n; document.querySelector(`#char-grid .mate[data-id="${c}"]`).click(); }, [p.pname, p.ch]); await cl(p, '#char-next'); await sleep(400);
      if (!code) { await cl(p, '#mp-host2'); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.code && ronnieMP.net.status === 'on', null, { timeout: 60000 }); return ev(p, () => ronnieMP.net.code); }
      await ev(p, (c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on', null, { timeout: 60000 }); };
    const H = pages[0], code = await join(H); for (const p of pages.slice(1)) await join(p, code);
    await cl(H, '#room-go'); await sleep(400); await ev(H, (pl) => document.querySelector(`.scene[data-id="${pl}"]`).click(), place); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="place"] .bigbtn').click()); await sleep(500);
    await ev(H, () => { const f = () => document.querySelector('.flip[data-id="roam"]'); f() && f().click(); }); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="mode"] .bigbtn').click()); await sleep(500); await cl(H, '#go');
    const tapIn = (p) => p.waitForFunction(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click();
      const st = document.getElementById('start'), inGame = window.RS && document.body.classList.contains('ready') && st && st.classList.contains('gone');
      if (inGame) { const bt = document.querySelector('#play-flat'); if (bt && bt.offsetParent) bt.click(); }
      return inGame && !RS.player.menuLock; }, null, { timeout: 300000, polling: 700 });
    for (const p of pages) await tapIn(p).catch(async () => { throw new Error(p.pname + ' never got into the game: ' + JSON.stringify(await ev(p, () => ({ screen: (document.querySelector('.screen.on') || {}).dataset?.s, mode: window.RS && RS.director.mode })))); });
    log('everyone in');
    // the host changes the game to Prop Hunt: everyone's game follows
    await ev(H, () => RS.newGame('prophunt'));
    for (const p of pages) await p.waitForFunction(() => { for (const id of ['#intro-ready', '#ui-intro-ready', '.howto-ready']) { const r = document.querySelector(id); if (r && r.offsetParent) r.click(); } return window.RS && document.body.classList.contains('ready') && RS.director.prophunt; }, null, { timeout: 240000, polling: 700 })
      .catch(async () => { throw new Error(p.pname + ' not in Prop Hunt: ' + JSON.stringify(await ev(p, () => ({ mode: RS.director.mode, ph: !!RS.director.prophunt }))) + ' errors: ' + p.errors.slice(0, 3).join(' | ')); });
    for (const p of pages) await ev(p, () => { RS.renderer.__render = RS.renderer.render; RS.renderer.render = () => {}; });
    await sleep(5000);
    log('in prop hunt');
    // a baseline picture on one game (after the warm-up): later pictures mustn't need a new shader
    const shot = (p) => ev(p, () => { const R = RS.renderer, T = RS.THREE, cam = new T.PerspectiveCamera(70, 1.33, 0.05, 80), h = RS.player.head; cam.position.set(h.x, 1.7, h.z); cam.lookAt(h.x + 1, 1.2, h.z + 1); cam.updateMatrixWorld();
      const n0 = R.info.programs.length, ph = RS.director.prophunt; for (const a of [0, 1.6, 3.2, 4.7]) { cam.lookAt(h.x + Math.cos(a), 1.0, h.z + Math.sin(a)); cam.updateMatrixWorld(); R.__render.call(R, RS.scene, cam); }
      // and each thing Prop Hunt can show: every decoy, every hider's prop (from right by it), the bursts
      for (const pr of ph.props.values()) { cam.position.set(pr.pos.x + 1.5, 1.4, pr.pos.z + 1.5); cam.lookAt(pr.pos.x, 0.4, pr.pos.z); cam.updateMatrixWorld(); R.__render.call(R, RS.scene, cam); }
      return { built: R.info.programs.length - n0, total: R.info.programs.length }; });
    await H.waitForFunction(() => window.__shaderWarm, null, { timeout: 60000 }).catch(() => {});
    const base = {}; for (const p of pages) base[p.pname] = (await shot(p)).total;
    // the host presses START (the button on the screen)
    C.ok(await ev(H, () => { const bt = document.querySelector('#ph-ui .start'); return bt && !bt.hidden; }), 'the host has no START button');
    await ev(H, () => document.querySelector('#ph-ui .start').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    for (const p of pages) await p.waitForFunction(() => RS.director.prophunt.phase === 'hide', null, { timeout: 30000 }).catch(() => C.ok(false, `${p.pname} never got to the hiding`));
    await sleep(1200);
    const I = (p) => ev(p, () => { const m = RS.director.prophunt, me = m.mine(); return { id: m.me, role: me && me.role, roles: [...m.players.values()].map(p => p.id + ':' + p.role).sort().join(','), blind: !!m.blindOn, decoys: m.decoys.length, round: m.round }; });
    let info = []; for (const p of pages) info.push(await I(p));
    C.ok(info.every(x => x.roles === info[0].roles), 'the teams aren\'t the same on every game: ' + JSON.stringify(info.map(x => x.roles)));
    const seekers = info.map((x, i) => x.role === 'seeker' ? i : -1).filter(i => i >= 0), hiders = info.map((x, i) => x.role === 'hider' ? i : -1).filter(i => i >= 0);
    C.ok(seekers.length === (WHO.length <= 4 ? 1 : 2) && hiders.length === WHO.length - seekers.length, `wrong teams: ${seekers.length} seekers, ${hiders.length} hiders`);
    C.ok(info.every(x => x.decoys >= 20) && info.every(x => x.decoys === info[0].decoys), 'the decoys aren\'t laid out the same on every game: ' + info.map(x => x.decoys).join(','));
    for (const i of seekers) C.ok(await pages[i].waitForFunction(() => RS.director.prophunt.blindOn, null, { timeout: 30000 }).then(() => true, () => false), `${pages[i].pname} (seeking) isn't blindfolded while the hiders hide`);
    if (!seekers.length || !hiders.length) return C.fails;
    const S = pages[seekers[0]], sId = info[seekers[0]].id, round1Seeker = sId;
    // the seeker can't walk while blindfolded
    const moved = await ev(S, async () => { const P = RS.player, x0 = P.head.x, z0 = P.head.z; P.flatMove = { x: 0, z: -1 }; await new Promise(r => setTimeout(r, 1200)); P.flatMove = { x: 0, z: 0 }; return Math.hypot(P.head.x - x0, P.head.z - z0); });
    C.ok(moved < 0.2, `the blindfolded seeker walked ${moved.toFixed(2)}m`);
    // a real prop (a decoy), far from the hiders, with a clear spot two metres from it to stand and look at it from
    const findDecoy = (p) => ev(p, () => { const m = RS.director.prophunt, T = RS.THREE, far = (d) => [...m.props.values()].every(pr => Math.hypot(pr.pos.x - d.x, pr.pos.z - d.z) > 3) && Math.hypot(RS.player.head.x - d.x, RS.player.head.z - d.z) < 40;
      for (const [i, d] of m.decoys.entries()) { if (d.e || !far(d)) continue; const K = m.K[d.k], c = new T.Vector3(d.x, d.y + K.h / 2, d.z);
        for (const a of [0, 1.57, 3.14, 4.71]) { const o = new T.Vector3(d.x + Math.cos(a) * 2, 1.6, d.z + Math.sin(a) * 2), ray = new T.Ray(o, c.clone().sub(o).normalize()); const k = RS.room.nav.idx(o.x, o.z);
          if (k < 0 || !RS.room.nav.free[k] || m.walled(ray, o.distanceTo(c))) continue; const h = m.pick(ray, { maxD: 5 }); if (h && h.kind === 'd' && h.i === i) return { i, k: d.k, x: c.x, y: c.y, z: c.z, ox: o.x, oz: o.z }; } } return null; });
    // stand there and look at it (a flat player's yaw and pitch)
    const lookAt = (p, d) => ev(p, (d) => { const m = RS.director.prophunt, P = RS.player; m.teleport(d.ox, d.oz); const dx = d.x - d.ox, dz = d.z - d.oz; P.flatYaw = Math.atan2(-dx, -dz) - P.rig.rotation.y; P.flatPitch = -Math.atan2(P.head.y - d.y, Math.hypot(dx, dz)); }, d);
    // hiders: the first looks at a real prop and becomes it; the rest pick from the list
    const kinds = {};
    for (const [n, i] of hiders.entries()) { const p = pages[i];
      let r; if (n === 0) { const d = await findDecoy(p); C.ok(d, `${p.pname}: no prop to look at`); if (!d) continue; await lookAt(p, d); r = { k: d.k, look: true }; }
      else r = await ev(p, () => { const m = RS.director.prophunt, k = m.kinds[m.kinds.length - 1]; m.become(k); return { k, look: false }; });
      if (r.look) { await p.waitForFunction((k) => { const m = RS.director.prophunt; return m.aimed && m.aimed.k === k && !document.querySelector('#ph-ui .become').hidden; }, r.k, { timeout: 20000, polling: 300 }).catch(() => {});
        const got = await ev(p, () => { const m = RS.director.prophunt; return { aimed: m.aimed && m.aimed.k, card: document.getElementById('ph-card').classList.contains('on'), hl: m.hl.visible, btn: !document.querySelector('#ph-ui .become').hidden }; });
        C.ok(got.aimed === r.k && got.card && got.hl && got.btn, `${p.pname} looking at a ${r.k}: not highlighted / no card / no BECOME (${JSON.stringify(got)})`);
        await ev(p, () => document.querySelector('#ph-ui .become').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); }
      kinds[info[i].id] = r.k; }
    // everyone draws each hider as their prop, and nobody draws the hider as a person
    const seesProps = (kinds) => { const m = RS.director.prophunt, out = {}; for (const id in kinds) { const pr = m.props.get(id), np = RS.net.players.get(id), av = np && np.avatar;
        out[id] = { kind: pr && pr.kind, at: pr ? +Math.hypot(pr.pos.x - (id === m.me ? RS.player.head.x : np.pose.h[0]), pr.pos.z - (id === m.me ? RS.player.head.z : np.pose.h[2])).toFixed(2) : null, hidden: id === m.me ? true : !!(av && av.impHidden && !(av.c.rag.group && av.c.rag.group.visible)) }; } return out; };
    for (const p of pages) await p.waitForFunction(([f, kinds]) => { const v = eval(f)(kinds); return Object.keys(kinds).every(id => v[id].kind === kinds[id] && v[id].at != null && v[id].at < 0.6 && v[id].hidden); }, [seesProps.toString(), kinds], { timeout: 30000, polling: 500 }).catch(() => {});
    for (const [j, p] of pages.entries()) { const v = await ev(p, (kinds) => { const m = RS.director.prophunt, out = {}; for (const id in kinds) { const pr = m.props.get(id), np = RS.net.players.get(id), av = np && np.avatar;
        out[id] = { kind: pr && pr.kind, at: pr ? +Math.hypot(pr.pos.x - (id === m.me ? RS.player.head.x : np.pose.h[0]), pr.pos.z - (id === m.me ? RS.player.head.z : np.pose.h[2])).toFixed(2) : null, hidden: id === m.me ? true : !!(av && av.impHidden && !(av.c.rag.group && av.c.rag.group.visible)) }; } return out; }, kinds);
      for (const id in kinds) C.ok(v[id].kind === kinds[id] && v[id].at != null && v[id].at < 0.6 && v[id].hidden, `${p.pname} doesn't see ${id} as a ${kinds[id]} where they are (or still sees the person): ${JSON.stringify(v[id])}`); }
    log('hiders are props: ' + JSON.stringify(kinds));
    // a lock, seen by everyone
    const H0 = pages[hiders[0]], h0 = info[hiders[0]].id;
    await ev(H0, () => RS.director.prophunt.toggleLock());
    for (const p of pages) await p.waitForFunction((id) => { const q = RS.director.prophunt.players.get(id); return q && q.locked; }, h0, { timeout: 15000 }).catch(() => {});
    for (const p of pages) { const l = await ev(p, (id) => { const q = RS.director.prophunt.players.get(id); return q && q.locked && Array.isArray(q.lp); }, h0); C.ok(l, `${p.pname} doesn't see ${H0.pname} locked`); }
    // the seekers are let go (the host's clock jumped on)
    await ev(H, () => { RS.director.prophunt.H.ends = performance.now() / 1000; });
    for (const p of pages) await p.waitForFunction(() => RS.director.prophunt.phase === 'seek', null, { timeout: 15000 }).catch(() => C.ok(false, `${p.pname} never got to the seeking`));
    C.ok(!(await ev(S, () => RS.director.prophunt.blindOn)), 'the seeker is still blindfolded after the hide');
    // a taunt: everyone hears it, and it scores
    const tot0 = await ev(H, (id) => RS.director.prophunt.H.tot[id] || 0, h0);
    await ev(H0, () => { const m = RS.director.prophunt; m.tauntCD = 0; m.doTaunt(); }); await sleep(1500);
    const tot1 = await ev(H, (id) => RS.director.prophunt.H.tot[id] || 0, h0); C.ok(tot1 - tot0 >= 10, `a taunt scored ${tot1 - tot0} points`);
    for (const p of pages) { const heard = await ev(p, (id) => { const q = RS.director.prophunt.players.get(id); return !!(q && q.tauntAt && performance.now() / 1000 - q.tauntAt < 5); }, h0); C.ok(heard, `${p.pname} didn't get ${H0.pname}'s taunt`); }
    // a wrong guess: the seeker checks one of the real things
    const aimAt = async (p, x, y, z) => { const at = await ev(p, ([x, y, z]) => { const m = RS.director.prophunt, P = RS.player, d = Math.hypot(x - P.head.x, z - P.head.z) || 1; m.teleport(x - (x - P.head.x) / d * 2, z - (z - P.head.z) / d * 2); return [P.head.x, P.head.z]; }, [x, y, z]);
      await H.waitForFunction(([id, x, z]) => { const q = RS.director.prophunt.posOf(id); return q && Math.hypot(q.x - x, q.z - z) < 0.8; }, [sId, at[0], at[1]], { timeout: 20000, polling: 300 }).catch(() => {});      // (the host's game sees the seeker there)
      await ev(p, ([x, y, z]) => { const m = RS.director.prophunt, P = RS.player, T = RS.THREE, o = new T.Vector3(P.head.x, P.head.y, P.head.z); m.chkCD = 0; m.doCheck(new T.Ray(o, new T.Vector3(x, y, z).sub(o).normalize())); }, [x, y, z]); };
    const decoy = await findDecoy(S);
    C.ok(decoy, 'no decoy the seeker could check');
    if (decoy) { await lookAt(S, decoy); await H.waitForFunction(([id, x, z]) => { const q = RS.director.prophunt.posOf(id); return q && Math.hypot(q.x - x, q.z - z) < 0.8; }, [sId, decoy.ox, decoy.oz], { timeout: 20000, polling: 300 }).catch(() => {});
      await ev(S, ([x, y, z]) => { const m = RS.director.prophunt, P = RS.player, T = RS.THREE, o = new T.Vector3(P.head.x, P.head.y, P.head.z); m.chkCD = 0; m.doCheck(new T.Ray(o, new T.Vector3(x, y, z).sub(o).normalize())); }, [decoy.x, decoy.y, decoy.z]);
      await S.waitForFunction(() => RS.director.prophunt.mine().hp < 100, null, { timeout: 15000 }).catch(() => {}); const hp = await ev(S, () => RS.director.prophunt.mine().hp), hph = await ev(H, (id) => RS.director.prophunt.H.hp[id], sId);
      C.ok(hp === 90 && hph === 90, `a wrong guess didn't cost 10 health (seeker sees ${hp}, host ${hph})`); }
    // the seeker finds every hider
    for (const i of hiders) { const id = info[i].id;
      for (let tries = 0; tries < 3; tries++) {
        const at = await ev(S, (id) => { const pr = RS.director.prophunt.props.get(id), m = RS.director.prophunt; return pr ? { x: pr.pos.x, y: pr.pos.y + m.K[pr.kind].h / 2, z: pr.pos.z } : null; }, id);
        if (!at) break; await aimAt(S, at.x, at.y, at.z); await sleep(1500);
        if (await ev(pages[i], () => { const me = RS.director.prophunt.mine(); return !!(me && me.found); })) break; }
      const f = await ev(pages[i], () => ({ found: !!RS.director.prophunt.mine().found, ghost: !!RS.player.ghost, phase: RS.director.prophunt.phase }));
      C.ok(f.found && (f.ghost || f.phase !== 'seek'), `${pages[i].pname} was never found (or isn't a ghost): ${JSON.stringify(f)}`);
      for (const p of pages) { const seen = await ev(p, (id) => { const q = RS.director.prophunt.players.get(id); return !!(q && q.found); }, id); C.ok(seen, `${p.pname} didn't see ${pages[i].pname} found`); } }
    for (const p of pages) await p.waitForFunction(() => RS.director.prophunt.phase === 'roundend', null, { timeout: 15000 }).catch(() => C.ok(false, `${p.pname}: the round didn't end when everyone was found`));
    const end1 = await ev(H, () => RS.director.prophunt.lastEnd); C.ok(end1 && end1.win === 'seekers', 'the seekers didn\'t win round 1: ' + JSON.stringify(end1 && end1.win));
    const sp = await ev(S, () => ({ panel: !!RS.director.prophunt.panel.cur })); await sleep(2200); const sp2 = await ev(S, () => !!RS.director.prophunt.panel.cur); C.ok(sp2, 'no round summary on the seeker\'s game');
    log('round 1 done: ' + JSON.stringify(end1.tot));
    // no new shader for any of it (props, the poof, bursts, the summary)
    for (const p of pages) { const r = await shot(p); C.ok(r.total === base[p.pname], `${p.pname}: Prop Hunt built ${r.total - base[p.pname]} new shader programs during play`); }
    // round 2: the teams swap; let the clock run out (the hiders left win)
    await ev(H, () => { RS.director.prophunt.H.nextAt = 0; });
    for (const p of pages) await p.waitForFunction(() => RS.director.prophunt.phase === 'hide' && RS.director.prophunt.round === 2, null, { timeout: 15000 }).catch(() => C.ok(false, `${p.pname} never got to round 2`));
    info = []; for (const p of pages) info.push(await I(p));
    const s2 = info.filter(x => x.role === 'seeker').map(x => x.id); C.ok(s2.length && !s2.includes(round1Seeker), `the teams didn't swap: round 1 seeker ${round1Seeker}, round 2 ${s2}`);
    await ev(H, () => { RS.director.prophunt.H.ends = 0; }); await sleep(1200);
    for (const p of pages) await p.waitForFunction(() => RS.director.prophunt.phase === 'seek', null, { timeout: 15000 }).catch(() => {});
    const auto = await ev(H, () => [...RS.director.prophunt.players.values()].filter(p => p.role === 'hider').every(p => !!p.kind)); C.ok(auto, 'a hider who didn\'t pick wasn\'t given a prop');
    await ev(H, () => { RS.director.prophunt.H.ends = 0; });
    for (const p of pages) await p.waitForFunction(() => RS.director.prophunt.phase === 'roundend', null, { timeout: 15000 }).catch(() => C.ok(false, `${p.pname}: round 2 didn't end on time`));
    const end2 = await ev(H, () => RS.director.prophunt.lastEnd); C.ok(end2 && end2.win === 'hiders' && end2.alive.length === WHO.length - s2.length, 'round 2 (out of time): the hiders didn\'t win: ' + JSON.stringify(end2 && { win: end2.win, alive: end2.alive }));
    for (const id of (end2 && end2.alive) || []) C.ok((end2.rp[id] || 0) >= 100, `${id} survived round 2 but scored ${end2.rp[id]}`);
    // the rest of the rounds, quickly, to the results
    for (let r = 0; r < 6; r++) { const ph = await ev(H, () => RS.director.prophunt.phase); if (ph === 'over') break;
      await ev(H, () => { const m = RS.director.prophunt; if (m.phase === 'roundend') m.H.nextAt = 0; else if (m.H) m.H.ends = 0; }); await sleep(1500);
      await ev(H, () => { const m = RS.director.prophunt; if (m.H && (m.phase === 'hide' || m.phase === 'seek')) m.H.ends = 0; }); await sleep(1500);
      await ev(H, () => { const m = RS.director.prophunt; if (m.H && m.phase === 'seek') m.H.ends = 0; }); await sleep(1500); }
    for (const p of pages) await p.waitForFunction(() => RS.director.prophunt.phase === 'over', null, { timeout: 20000 }).catch(() => C.ok(false, `${p.pname} never got the results`));
    for (const p of pages) { const r = await ev(p, () => { const m = RS.director.prophunt; return { panel: !!m.panel.cur, ranked: m.ranked().length, pts: m.ranked().map(r => r.pts) }; }); C.ok(r.panel && r.ranked === WHO.length, `${p.pname}: no results screen (${JSON.stringify(r)})`); }
    const sums = []; for (const p of pages) sums.push(JSON.stringify(await ev(p, () => RS.director.prophunt.ranked().map(r => r.id + ':' + r.pts))));
    C.ok(sums.every(s => s === sums[0]), 'the final scores differ between games: ' + sums.join(' / '));
    log('results ' + sums[0]);
    // nobody's hidden once it's over
    for (const p of pages) { const h = await ev(p, () => [...RS.net.players.values()].filter(q => q.avatar && q.avatar.impHidden).length); C.ok(h === 0, `${p.pname}: ${h} players still hidden after the game`); }
    for (const p of pages) C.ok(!p.errors.length, `${p.pname}: page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
    for (const p of pages) { const cr = p.crashes.filter(c => !['start', 'hang'].includes(c.k)); C.ok(!cr.length, `${p.pname}: crash reports: ` + cr.slice(0, 2).map(c => JSON.stringify(c).slice(0, 200)).join(' | ')); }
    console.log(`  ${place}: ${WHO.length} games; round 1 seeker ${pages[seekers[0]].pname}, props ${JSON.stringify(Object.values(kinds))}; final ${sums[0]}`);
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
