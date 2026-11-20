// IMPOSTER GHOSTS (like Among Us): five real games in one room through the real menus and room server, the host starts
// Imposter, the imposter kills two of the faithful. Then:
//   - the dead are ghosts: they float straight through a wall (the living are still stopped by it), a little quicker
//   - each ghost sees the other ghost: a see-through, pale blue copy of their character, walking where they really are
//     (and their body is still where it fell)
//   - the living see no ghost at all: no copy is made on their games, the ghosts' own characters stay hidden
//   - dying builds no new program for the graphics chip (no stutter: the ghost look is built while the game starts)
//   - no errors anywhere
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';
const readyUp = async (ps) => { for (const q of ps) await q.evaluate(() => { const m = window.ronnieMP; if (m && m.net && m.role === 'join' && !m.ready) document.querySelector('#room-ready').click(); }).catch(() => {}); await new Promise(r => setTimeout(r, 1500)); };      // (guests ready up: the host's START waits for everyone)

const WHO = [['HOSTY', 'lewis'], ['BETH', 'chloe'], ['CARL', 'harry'], ['DAVE', 'ethan'], ['EDDY', 'aidan']];

export default async function () {
  const C = checker('ghosts'), host = await startRoomHost(), b = await launch();
  try {
    const pages = [];
    for (const [name, ch] of WHO) { const p = await newPage(b, { width: 480, height: 360 }); p.pname = name; p.ch = ch; pages.push(p);
      await p.goto('http://game.local/index.html?relay=' + encodeURIComponent(host.url)); await p.waitForTimeout(1200); }
    const ev = (p, f, a) => p.evaluate(f, a), cl = (p, s) => ev(p, (s) => document.querySelector(s).click(), s);
    const join = async (p, code) => { await cl(p, '.playbtn'); await sleep(400); await cl(p, '#pick-multi'); await sleep(400);
      await ev(p, ([n, c]) => { document.querySelector('#mp-myname').value = n; document.querySelector(`#char-grid .mate[data-id="${c}"]`).click(); }, [p.pname, p.ch]); await cl(p, '#char-next'); await sleep(400);
      if (!code) { await cl(p, '#mp-host2'); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.code && ronnieMP.net.status === 'on', null, { timeout: 60000 }); return ev(p, () => ronnieMP.net.code); }
      await ev(p, (c) => { document.querySelector('#mp-code2').value = c; document.querySelector('#mp-join2').click(); }, code); await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on', null, { timeout: 60000 }); };
    const H = pages[0], code = await join(H); for (const p of pages.slice(1)) await join(p, code);
    // the host picks the pub
    await cl(H, '#room-go'); await sleep(400); await ev(H, () => document.querySelector('.scene[data-id="pub"]').click()); await sleep(300);
    await ev(H, () => document.querySelector('.screen[data-s="place"] .bigbtn').click()); await sleep(500);
    await ev(H, () => { const f = () => document.querySelector('.flip[data-id="roam"]'); f() && f().click(); }); await sleep(300);      // (everyone in first, then the host changes the game to Imposter below)
    await ev(H, () => document.querySelector('.screen[data-s="mode"] .bigbtn').click()); await sleep(500); await readyUp(pages); await cl(H, '#go');
    // (each game, host first: through the how-to-play page, PLAY, and into the pub; the others follow the host in)
    const tapIn = (p) => p.waitForFunction(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click();
      const st = document.getElementById('start'), inGame = window.RS && document.body.classList.contains('ready') && st && st.classList.contains('gone');
      if (inGame) { const b = document.querySelector('#play-flat'); if (b && b.offsetParent) b.click(); }
      return inGame && !RS.player.menuLock; }, null, { timeout: 300000, polling: 700 });
    for (const p of pages) await tapIn(p).catch(async () => { throw new Error(p.pname + ' never got into the game: ' + JSON.stringify(await ev(p, () => ({ screen: (document.querySelector('.screen.on') || {}).dataset?.s, mode: window.RS && RS.director.mode })))); });
    // (the host changes the game to Imposter: everyone's game follows, as when a real host changes mode)
    if (!(await ev(H, () => !!RS.director.imposter))) await ev(H, () => RS.newGame('imposter'));
    for (const p of pages) await p.waitForFunction(() => { for (const id of ['#intro-ready', '#ui-intro-ready', '.howto-ready']) { const r = document.querySelector(id); if (r && r.offsetParent) r.click(); } return window.RS && document.body.classList.contains('ready') && RS.director.imposter; }, null, { timeout: 240000, polling: 700 }).catch(async () => { throw new Error(p.pname + ' not in Imposter: ' + JSON.stringify(await ev(p, () => ({ mode: RS.director.mode, full: RS.director.fullMode, imp: !!RS.director.imposter, running: RS.director.running }))) + ' errors: ' + p.errors.slice(0, 3).join(' | ')); });
    for (const p of pages) await ev(p, () => { RS.renderer.__render = RS.renderer.render; RS.renderer.render = () => {}; });
    await sleep(6000);      // (everyone's in the pub, models loading)
    // the host rings the bell: roles dealt; the intro; play
    for (const p of pages) await ev(p, () => { const m = RS.director.imposter, a0 = m.apply.bind(m); window.__ilog = []; m.apply = (k, msg) => { __ilog.push(Math.round(performance.now() / 100) / 10 + ' ' + k + (msg && msg.v ? ':' + msg.v : '')); return a0(k, msg); }; window.__imp0 = m; });
    await ev(H, () => RS.director.imposter.hostDeal());
    for (const p of pages) await p.waitForFunction(() => RS.director.imposter.phase === 'play', null, { timeout: 60000 });
    await sleep(1500);
    const I = async (p) => ev(p, () => { const m = RS.director.imposter, me = m.mine(); return { id: m.me, imp: !!(me && me.imp), alive: !!(me && me.alive) }; });
    const info = []; for (const p of pages) info.push(await I(p));
    const impI = info.findIndex(x => x.imp); C.ok(impI >= 0, 'nobody was dealt the imposter');
    if (impI < 0) return C.fails;
    const imp = pages[impI], victims = pages.map((p, i) => i).filter(i => i !== impI).slice(0, 2),      // (the host first when it can be: being the referee mustn't stop you being killed)
      living = pages.map((p, i) => i).filter(i => i !== impI && !victims.includes(i));
    const progs0 = {}; for (const i of victims) progs0[i] = await ev(pages[i], () => RS.renderer.info.programs.length);
    // the imposter walks up to each victim and kills them
    for (const v of victims) {
      await ev(imp, (id) => { const m = RS.director.imposter, q = m.posOf(id); m.killCD = 0; m.teleport(q.x + 0.6, q.z); }, info[v].id); await sleep(1500);
      await ev(H, () => { const m = RS.director.imposter; if (m.H && m.H.killCD) m.H.killCD.clear(); });      // (the host's kill cooldown: 15s at the start, 30s between: skipped for the test)
      await ev(imp, () => { const m = RS.director.imposter; m.killCD = 0; m.doKill(); });
      await pages[v].waitForFunction(() => { const me = RS.director.imposter.mine(); return me && !me.alive; }, null, { timeout: 20000 }).catch(async () => C.ok(false, `${pages[v].pname} was never killed: host sees ` + JSON.stringify(await ev(H, ([iid, vid]) => { const m = RS.director.imposter, a = m.posOf(iid), b = m.posOf(vid); return { d: a && b ? +m.hd(a, b).toFixed(2) : null, a: a && [+a.x.toFixed(2), +a.z.toFixed(2)], b: b && [+b.x.toFixed(2), +b.z.toFixed(2)], vAlive: m.alive(vid), cd: m.H ? [...m.H.killCD.values()] : null, phase: m.phase }; }, [info[impI].id, info[v].id])) + ' host log ' + JSON.stringify(await ev(H, () => ({ log: __ilog.slice(-12), same: RS.director.imposter === __imp0, mode: RS.director.mode }))) + ' victim log ' + JSON.stringify(await ev(pages[v], () => ({ log: (window.__ilog || []).slice(-8), same: RS.director.imposter === window.__imp0 }))) + ' imposter sees ' + JSON.stringify(await ev(imp, (vid) => { const m = RS.director.imposter, n = m.near(); return { victim: n.victim && n.victim.id === vid, d: +m.hd(RS.player.head, m.posOf(vid)).toFixed(2), killCD: m.killCD }; }, info[v].id))));
      await sleep(1000); }
    await sleep(4000);      // (the ghosts' copies made and dressed)
    const [A, B] = victims.map(i => pages[i]), idA = info[victims[0]].id, idB = info[victims[1]].id;
    // a ghost sees the other ghost: a see-through copy, where they are; and their body's still on the floor
    const seen = await ev(A, (idB) => { const m = RS.director.imposter, gp = m.ghostPups && m.ghostPups.get(idB), main = RS.net.players.get(idB), av = main && main.avatar;
      let mats = 0, ghostMats = 0; if (gp && gp.c.rag.group) gp.c.rag.group.traverse(o => { if (o.isMesh && o.material) for (const mt of [].concat(o.material)) { mats++; if (mt.userData.ghost && mt.transparent && mt.opacity < 0.6) ghostMats++; } });
      const gpos = gp ? gp.c.rag.pos('chest', new RS.THREE.Vector3()) : null, real = m.posOf(idB);
      return { ghost: RS.player.ghost, copy: !!gp, visible: !!(gp && gp.c.rag.group && gp.c.rag.group.visible), mats, ghostMats, near: gpos && real ? Math.hypot(gpos.x - real.x, gpos.z - real.z) : null,
        body: m.bodies.some(b => b.id === idB && !b.cleared), mainHidden: !!(av && av.impBody) || !!(av && av.impHidden) }; }, idB);
    C.ok(seen.ghost, `${A.pname} is dead but not a ghost`);
    C.ok(seen.copy && seen.visible, `${A.pname} (a ghost) can't see ${B.pname}'s ghost`);
    C.ok(seen.mats > 0 && seen.ghostMats === seen.mats, `${B.pname}'s ghost isn't see-through (${seen.ghostMats} of ${seen.mats} materials)`);
    C.ok(seen.near != null && seen.near < 1.2, `${B.pname}'s ghost isn't where they are (${seen.near && seen.near.toFixed(2)}m off)`);
    C.ok(seen.body && seen.mainHidden, `${B.pname}'s body isn't on the floor any more (body ${seen.body})`);
    // the living see no ghost at all
    for (const i of living) { const lv = await ev(pages[i], (ids) => { const m = RS.director.imposter; return { copies: m.ghostPups ? m.ghostPups.size : 0, ghost: !!RS.player.ghost,
        shown: ids.filter(id => { const pl = RS.net.players.get(id), av = pl && pl.avatar; return av && !av.impHidden && !av.impBody; }) }; }, [idA, idB]);
      C.ok(lv.copies === 0 && !lv.ghost && !lv.shown.length, `${pages[i].pname} (alive) can see ghosts: ${JSON.stringify(lv)}`); }
    // a ghost walks straight through a wall; someone alive is stopped by it
    const wall = async (p) => ev(p, async () => { const P = RS.player, room = RS.room, h = P.head; let best = null;
      for (const k of room.blockers) { if (!((k.y1 ?? 1) > 1.6)) continue; const w = k.x1 - k.x0, d = k.z1 - k.z0; if (Math.min(w, d) > 0.5 || Math.max(w, d) < 2) continue; const cx = (k.x0 + k.x1) / 2, cz = (k.z0 + k.z1) / 2, dist = Math.hypot(cx - h.x, cz - h.z); if (!best || dist < best.dist) best = { k, cx, cz, dist, alongX: w > d }; }
      if (!best) return null; const { k, cx, cz, alongX } = best, side = alongX ? [cx, k.z0 - 0.6] : [k.x0 - 0.6, cz], dir = alongX ? [0, 1] : [1, 0];
      RS.director.imposter.teleport(side[0], side[1], Math.atan2(-dir[0], -dir[1])); P.flatYaw = 0; P.rig.rotation.y = Math.atan2(-dir[0], -dir[1]); P.rig.updateMatrixWorld(true);
      const before = alongX ? P.head.z : P.head.x; P.flatMove = { x: 0, z: -1 }; await new Promise(r => setTimeout(r, 1500)); P.flatMove = { x: 0, z: 0 };
      const after = alongX ? P.head.z : P.head.x, line = alongX ? (k.z0 + k.z1) / 2 : (k.x0 + k.x1) / 2; return { crossed: (before - line) * (after - line) < 0, moved: +(after - before).toFixed(2) }; });
    const ga = await wall(A); C.ok(ga && ga.crossed, `${A.pname} (a ghost) couldn't walk through a wall: ${JSON.stringify(ga)}`);
    const la = await wall(pages[living[0]]); C.ok(la && !la.crossed, `${pages[living[0]].pname} (alive) walked through a wall: ${JSON.stringify(la)}`);
    // no stutter from dying: no new programs built on the ghosts' games
    for (const i of victims) { const n = await ev(pages[i], () => RS.renderer.info.programs.length); C.ok(n === progs0[i], `${pages[i].pname}: dying built ${n - progs0[i]} new shader programs (a stutter)`); }
    // GHOST_SHOT=path: a picture from a ghost's eyes, looking at the other ghost
    if (process.env.GHOST_SHOT) { const why = await ev(A, (idB) => { const m = RS.director.imposter; return { phase: m.phase, copies: m.ghostPups ? [...m.ghostPups.keys()] : null, idB }; }, idB); console.log('  shot:', JSON.stringify(why));
      if (why.copies && why.copies.includes(idB)) { const url = await ev(A, (idB) => { const T = RS.THREE, m = RS.director.imposter, gp = m.ghostPups.get(idB), c = gp.c.rag.pos('chest', new T.Vector3()), R = RS.renderer;
          R.render = R.__render; const cam = new T.PerspectiveCamera(60, R.domElement.width / R.domElement.height, 0.05, 40); cam.position.set(c.x + 1.4, c.y + 0.4, c.z + 1.4); cam.lookAt(c.x, c.y - 0.2, c.z); cam.updateMatrixWorld(); R.render(RS.scene, cam); return R.domElement.toDataURL('image/png'); }, idB);
        (await import('fs')).writeFileSync(process.env.GHOST_SHOT, Buffer.from(url.split(',')[1], 'base64'));
        console.log('  ghost copy:', JSON.stringify(await ev(A, (idB) => { const m = RS.director.imposter, gp = m.ghostPups.get(idB), r = gp.c.rag, out = { char: gp.p.char, groupVis: r.group.visible, inScene: !!r.group.parent, meshes: [] };
          r.group.traverse(o => { if (o.isMesh) out.meshes.push({ skinned: !!o.isSkinnedMesh, vis: o.visible, op: [].concat(o.material).map(x => x.opacity), tr: [].concat(o.material).map(x => x.transparent), culled: o.frustumCulled, bs: o.boundingSphere ? [o.boundingSphere.center.toArray().map(v => +v.toFixed(2)), +o.boundingSphere.radius.toFixed(2)] : null }); });
          out.chest = r.pos('chest', new RS.THREE.Vector3()).toArray().map(v => +v.toFixed(2)); out.mode = r.mode; out.impHidden = gp.impHidden; return out; }, idB))); } }
    console.log(`  imposter ${pages[impI].pname}; ghosts ${A.pname}, ${B.pname} see each other (${seen.ghostMats} see-through materials); living ${living.map(i => pages[i].pname).join(', ')} see none; ghost through a wall ${JSON.stringify(ga)}, alive ${JSON.stringify(la)}`);
    for (const p of pages) C.ok(!p.errors.length, `${p.pname}: page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
