// PROP HUNT'S BOTS (js/phbots.js): a room of fewer than six gets the squad to make it six; six or more, none. With 1, 2,
// 4 and 6 people (real games on upright phones, the rest light players from lib/bots.mjs, who count as people):
//   - the deal: six (or everyone) in the round, the bots marked 🤖, each a different one of the squad, nobody's character
//   - bot hiders get a prop, go and hide by one of the same things in the map, and lock in
//   - bot seekers wait at the start for the hide, then go round on real paths and shoot (hits, finds or wrong guesses)
//   - a bot hider that's shot runs for it (unlocked, off somewhere else); one that's found is out
//   - a guest's game has the bots where the host's has them, with a body for each seeker
//   - the next round deals someone else to seek; the game runs to the end and the bots are on the results
//   - (2 people) the host leaves: the new host carries on running the bots
// PEOPLE=1,2,4,6  PLACES=pub
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';
import { startBot } from './lib/bots.mjs';
import { ev, openMenu, hostRoom, joinRoom, readyUp, pickGame, tapIn, freeRun } from './lib/room.mjs';
const PEOPLE = (process.env.PEOPLE || '1,2,4,6').split(',').map(Number), PLACES = (process.env.PLACES || 'pub').split(',');

const st = (p) => ev(p, () => { const ph = RS.director.prophunt, v = new RS.THREE.Vector3(); if (!ph) return null;
  return { phase: ph.phase, round: ph.round, host: ph.host, players: [...ph.players.values()].map(q => { const at = ph.posOf(q.id, v); return { id: q.id, bot: !!q.bot, name: q.name, char: q.char, role: q.role, kind: q.kind, locked: !!q.locked, lp: q.lp, found: !!q.found, hp: q.hp, at: at ? [+at.x.toFixed(2), +at.z.toFixed(2)] : null }; }),
    puppets: ph.bots.puppets.size, decoys: ph.decoys.map(d => [d.k, d.x, d.z]), stats: ph.H ? ph.H.stats : null, tot: ph.tot }; });

export default async function () {
  const C = checker('phbots'), host = await startRoomHost(), b = await launch();
  try {
    for (const place of PLACES) for (const N of PEOPLE) { const ctxs0 = b.contexts().length; try {
      const tag = `${place}, ${N} ${N === 1 ? 'person' : 'people'}`, nReal = Math.min(2, N), pages = [], light = [];
      for (let i = 0; i < nReal; i++) { const p = await newPage(b, { width: 390, height: 844, mobile: true }); p.pname = i ? 'GUEST' : 'HOST'; pages.push(p); await openMenu(p, host.url); }
      const [H, G] = pages, code = await hostRoom(H, 'HOSTY', 'lewis'); if (G) await joinRoom(G, code, 'GUESTY', 'chloe');
      for (let i = 0; i < N - nReal; i++) light.push(startBot(host.url, code, { name: 'MATE' + (i + 1), char: ['harry', 'ethan', 'aidan', 'connor'][i] }));
      await sleep(1500); if (G) await readyUp(G); for (const x of light) x.send({ t: 'ready', r: 1 }); await sleep(800);
      await pickGame(H, place, 'prophunt'); for (const p of pages) await tapIn(p); for (const p of pages) await freeRun(p); await sleep(3000);
      await ev(H, () => RS.director.prophunt.doStart()); await sleep(2500);
      let s = await st(H); const bots = s.players.filter(q => q.bot), want = Math.max(0, 6 - N);
      C.ok(s.phase === 'hide' && s.players.length === Math.max(6, N) && bots.length === want, `${tag}: the deal should have ${Math.max(6, N)} with ${want} bots: ${JSON.stringify({ phase: s.phase, n: s.players.length, bots: bots.length })}`);
      C.ok(bots.every(q => /🤖/.test(q.name)) && new Set(s.players.map(q => q.char)).size === s.players.length, `${tag}: bots not marked, or two of the same character: ${s.players.map(q => q.name + '/' + q.char).join(', ')}`);
      if (G) { const g = await st(G); C.ok(g.players.filter(q => q.bot).length === want, `${tag}: the guest's game doesn't have the bots: ${g.players.length}`); }
      if (!want) { for (const x of light) x.stop(); for (const p of pages) await p.context().close(); continue; }
      // the hide: bot hiders find somewhere by one of the same things and lock in; bot seekers stay put
      const seek0 = s.players.filter(q => q.role === 'seeker').map(q => q.id), bseek0 = bots.filter(q => q.role === 'seeker').map(q => [q.id, q.at]);
      await H.waitForFunction(() => [...RS.director.prophunt.players.values()].filter(q => q.bot && q.role === 'hider').every(q => q.kind && q.locked), null, { timeout: 45000, polling: 1000 }).catch(() => {});
      s = await st(H);
      for (const q of s.players.filter(q => q.bot && q.role === 'hider')) { const near = q.lp ? Math.min(99, ...s.decoys.filter(d => d[0] === q.kind).map(d => Math.hypot(d[1] - q.lp[0], d[2] - q.lp[1]))) : 99;
        C.ok(q.kind && q.locked && near < 1.6, `${tag}: bot hider ${q.name} didn't hide by a real ${q.kind}: ${JSON.stringify({ kind: q.kind, locked: q.locked, lp: q.lp, nearest: near })}`); }
      for (const [id, at] of bseek0) { const q = s.players.find(x => x.id === id); C.ok(q && at && q.at && Math.hypot(q.at[0] - at[0], q.at[1] - at[1]) < 0.3, `${tag}: a bot seeker moved during the hide`); }
      if (G) { const g = await st(G); const hb = s.players.filter(q => q.bot && q.at), far = hb.filter(q => { const o = g.players.find(x => x.id === q.id); const at = o && o.lp ? o.lp : o && o.at; return !at || Math.hypot(at[0] - q.at[0], at[1] - q.at[1]) > 1.5; });
        C.ok(!far.length && g.puppets === want, `${tag}: the guest doesn't see the bots where the host has them (${far.map(q => q.name)}), puppets ${g.puppets}/${want}`); }
      // the seek: bots go round and shoot; a bot hider shot runs, one found is out
      await ev(H, () => { RS.director.prophunt.H.ends = performance.now() / 1000; }); await sleep(2500);
      const shot = await ev(H, () => { const ph = RS.director.prophunt, me = ph.mine(), t = [...ph.players.values()].find(q => q.bot && q.role === 'hider' && !q.found);
        if (!t) return null; const at = ph.posOf(t.id, new RS.THREE.Vector3()), from = me && me.role === 'seeker' ? ph.me : [...ph.players.values()].find(q => q.role === 'seeker').id;
        ph.H.chkAt[from] = 0; ph.hostIn('phChk', { v: 'h:' + t.id, p: [at.x, at.y + 0.3, at.z] }, from); return { id: t.id, at: [at.x, at.z], locked: t.locked }; });
      if (shot) { await sleep(3000); const q = (await st(H)).players.find(x => x.id === shot.id);
        C.ok(q && !q.locked && (q.found || Math.hypot(q.at[0] - shot.at[0], q.at[1] - shot.at[1]) > 1.5), `${tag}: a bot hider that was shot didn't run for it: ${JSON.stringify({ before: shot, after: q && { at: q.at, locked: q.locked, hp: q.hp } })}`); }
      const bs = (await st(H)).players.filter(q => q.bot && q.role === 'seeker');
      if (bs.length) { await sleep(8000); await H.waitForFunction(() => { const ph = RS.director.prophunt; return [...ph.players.values()].some(q => q.bot && q.role === 'seeker' && ph.H.stats[q.id] && (ph.H.stats[q.id].finds || ph.H.stats[q.id].wrong)) || (ph.H.hhp && Object.keys(ph.H.hhp).length > 1) || ph.phase !== 'seek'; }, null, { timeout: 90000, polling: 1000 }).catch(() => {});
        const s2 = await st(H), moved = bs.some(q => { const n = s2.players.find(x => x.id === q.id); return n && q.at && n.at && Math.hypot(n.at[0] - q.at[0], n.at[1] - q.at[1]) > 1; });
        const acted = bs.some(q => s2.stats && s2.stats[q.id] && (s2.stats[q.id].finds || s2.stats[q.id].wrong)) || await ev(H, () => Object.keys(RS.director.prophunt.H.hhp || {}).length > 1);
        C.ok(moved, `${tag}: the bot seekers didn't go anywhere`); C.ok(acted, `${tag}: the bot seekers never shot anything: ${JSON.stringify(s2.stats)}`); }
      // a bot found: out
      const fb = await ev(H, () => { const ph = RS.director.prophunt; if (ph.phase !== 'seek') return 'no seek'; const t = [...ph.players.values()].find(q => q.bot && q.role === 'hider' && !q.found); if (!t) return 'none left';
        const from = [...ph.players.values()].find(q => q.role === 'seeker').id; for (let k = 0; k < 4; k++) { ph.H.chkAt[from] = 0; const at = ph.posOf(t.id, new RS.THREE.Vector3()); ph.hostIn('phChk', { v: 'h:' + t.id, p: [at.x, at.y + 0.3, at.z] }, from); } return t.found ? 'found' : 'not found ' + t.hp; });
      C.ok(fb === 'found' || fb === 'none left' || fb === 'no seek', `${tag}: four hits didn't find a bot hider: ${fb}`);
      // round 2: someone else seeks; then the last round to the end
      await ev(H, () => { const ph = RS.director.prophunt; if (ph.phase === 'seek') ph.H.ends = performance.now() / 1000; }); await sleep(2000);
      await ev(H, () => { RS.director.prophunt.H.nextAt = performance.now() / 1000; }); await sleep(2500);
      s = await st(H); const seek1 = s.players.filter(q => q.role === 'seeker').map(q => q.id);
      C.ok(s.round === 2 && seek1.join() !== seek0.join() && s.players.length === Math.max(6, N), `${tag}: round 2 should deal someone else to seek: ${JSON.stringify({ round: s.round, seek0, seek1 })}`);
      await ev(H, () => { const ph = RS.director.prophunt; ph.H.of = ph.H.r; ph.H.ends = performance.now() / 1000; }); await sleep(2500);
      await ev(H, () => { const ph = RS.director.prophunt; if (ph.phase === 'seek') ph.H.ends = performance.now() / 1000; }); await sleep(2000);
      await ev(H, () => { RS.director.prophunt.H.nextAt = performance.now() / 1000; }); await sleep(3000);
      for (const p of pages) { const r = await ev(p, () => { const ph = RS.director.prophunt; return { phase: ph.phase, ranked: ph.ranked().map(x => x.name) }; });
        C.ok(r.phase === 'over' && r.ranked.filter(n => /🤖/.test(n)).length === want, `${tag} ${p.pname}: the game didn't end with the bots on the results: ${JSON.stringify(r)}`); }
      // two people: the host leaves mid-round, the guest carries on running the bots
      if (N === 2) {
        await ev(H, () => RS.director.prophunt.doStart()); await sleep(4000);
        await H.context().close(); await sleep(6000);
        const a = await st(G); await sleep(6000); const z = await st(G);
        const mv = a.players.filter(q => q.bot).some(q => { const n = z.players.find(x => x.id === q.id); return n && q.at && n.at && (Math.hypot(n.at[0] - q.at[0], n.at[1] - q.at[1]) > 0.5 || n.locked !== q.locked); });
        C.ok(z.host && z.players.filter(q => q.bot).length === want && mv, `${tag}: after the host left the bots stopped: ${JSON.stringify({ host: z.host, bots: z.players.filter(q => q.bot).length, moved: mv, phase: z.phase })}`);
      }
      for (const p of pages) { if (p.isClosed()) continue; C.ok(!p.errors.length, `${tag} ${p.pname}: ` + [...new Set(p.errors)].slice(0, 3).join(' | ')); }
      for (const x of light) x.stop(); for (const p of pages) await p.context().close().catch(() => {});
    } catch (e) { C.ok(false, `${place}, ${N} people: CRASHED ${String(e.message || e).split('\n')[0]}`); for (const c of b.contexts().slice(ctxs0)) await c.close().catch(() => {}); } }
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
