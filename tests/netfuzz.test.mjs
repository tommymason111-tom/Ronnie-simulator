// Hostile multiplayer messages, received by a game in a room: every message type the game understands, with nonsense in
// every field (NaN, huge numbers, strings where numbers go, missing arrays, enormous arrays, unknown players), from a
// player who's really in the room and from strangers. The game must not throw, must keep running, and nobody may end
// up at a NaN position (a NaN spreads: one bad pose broke the whole physics world). Everything goes through JSON first,
// as it does over the network (so NaN and Infinity arrive as null)
import { launch, newPage, startGame, checker } from './lib/game.mjs';

export default async function () {
  const C = checker('netfuzz'), b = await launch();
  try {
    // (and the BOSS FIGHT's own messages, in a boss fight, as its host and as a guest following someone else's boss)
    for (const [asHost, boss] of [[true, false], [false, false], [true, true], [false, true]]) {
      const p = await newPage(b, { width: 640, height: 400 });
      if (process.env.VERBOSE) console.log('  loading', asHost ? 'host' : 'guest'); await startGame(p, { place: 'pub', mode: 'roam' }); if (process.env.VERBOSE) console.log('  loaded');
      const r = await p.evaluate(async ([asHost, boss]) => {
        const n = RS.net, mp = RS.mp, out = { thrown: [], nan: [] };
        // pretend we're in a room with one real mate (FRIEND), as host or guest
        n.ws = { readyState: 1, send() {}, close() {} }; n.status = 'on'; n.id = 'meeeeeee'; n.code = 'TEST'; n.host = asHost; n.hostId = asHost ? n.id : 'frienddd'; n.char = 'lewis';
        n.handle({ t: 'join', id: 'frienddd', name: 'FRIEND' });
        if (boss) { if (!asHost) RS.director.remote = true; RS.newGame('boss'); RS.sim(0.5, 0.05); }
        const pose = (o) => Object.assign({ t: 'p', f: 'frienddd', c: 'chloe', h: [1, 1.6, -3], q: [0, 0, 0, 1], l: [1.2, 1.2, -3], rh: [0.8, 1.2, -3], s: 1, st: 0, flat: 0, ts: performance.now() }, o);
        for (let i = 0; i < 20; i++) { n.handle(pose({ ts: performance.now() + i * 50 })); RS.sim(0.05, 0.05); }
        const J = [null, undefined, NaN, Infinity, -Infinity, 1e308, -1, 0, '', 'x', 'x'.repeat(5000), [], [NaN, NaN, NaN], [1, 2], [1, 2, 3, 4, 5, 6, 7, 8], {}, { x: 1 }, true];
        const BOSS_T = ['bossS', 'bossA', 'bossHit', 'bossP', 'bossHi', 'end', 'hitc', 'snap'];
        const types = boss ? BOSS_T : [...new Set(Object.getOwnPropertyNames(Object.getPrototypeOf(mp)).filter(k => k.startsWith('on_')).map(k => k.slice(3))
          .concat(['p', 'hi', 'chat', 'emote', 'char', 'setup', 'host', 'join', 'leave', 'welcome', 'pong', 'ver', 'pu', 'pug', 'restart', 'end', 'endGame', 'giveHost', 'grab', 'rel', 'save', 'imp', 'vote', 'kill', 'say', 'music', 'tv', 'wx', 'rcheck', 'rready', 'rstat', 'rdone', 'whatgame', 'rsay'].concat(BOSS_T)))];
        const fields = ['h', 'q', 'l', 'rh', 's', 'st', 'flat', 'c', 'e', 'id', 'it', 'k', 'v', 'p', 'm', 'at', 'to', 'name', 'text', 'side', 'target', 'ts', 'fc', 'pos', 'vel', 'place', 'mode', 'players', 'lines', 'who', 'n', 'x', 'y', 'z'];
        const send = (m) => { try { n.handle(JSON.parse(JSON.stringify(m))); } catch (e) { out.thrown.push(`${m.t}.${Object.keys(m).filter(k => k !== 't' && k !== 'f').join(',')}: ${e.message}`); } };
        let steps = 0;
        for (const t of types) for (const f of fields) for (const j of J) {
          send({ t, f: 'frienddd', [f]: j }); send({ t, f: 'strangerX', [f]: j });
          if (t === 'p') send(pose({ [f]: j }));
          if (++steps % 60 === 0) { try { RS.sim(0.05, 0.05); } catch (e) { out.thrown.push('sim after ' + t + '.' + f + ': ' + e.message); } }
        }
        // the boss fight's messages, whole and sensible, then with nonsense in one field at a time (every kind of move)
        if (boss) {
          const BASE = [{ t: 'bossS', b: 'noah', hp: 700, mx: 900, ph: 2, st: 'idle', a: '', at: 0.5, x: 9.6, z: -18, y: 0.4, s: 2.3, dy: 0, mi: ['harry'], tm: 30, o: 0 },
            ...['say', 'land', 'tele', 'slam', 'drop', 'charge', 'thud', 'tired', 'summon', 'hit', 'blocked', 'stagger', 'dead', 'phase', 'win', 'lose', 'nonsense'].map(k => ({ t: 'bossA', k, a: 'slam', s: 'Hello', x: 9.6, y: 2, z: -18, x0: 9.6, y0: 3, z0: -18, x1: 9.6, z1: -14, r: 4, r0: 2, d: 1.2, w: 1.5, f: 1.2, ph: 2, it: 'orange', ids: ['harry'], b: 'frienddd' })),
            { t: 'bossHit', d: 30, w: 1, p: [9.6, 3, -18] }, { t: 'bossP', hp: 3, kd: 2, out: 0, mk: 'harry' }];
          for (const base of BASE) { send({ ...base, f: 'frienddd' }); for (const k of Object.keys(base)) if (k !== 't') for (const j of J) { send({ ...base, f: 'frienddd', [k]: j }); if (++steps % 60 === 0) { try { RS.sim(0.05, 0.05); } catch (e) { out.thrown.push('sim after ' + base.t + '.' + k + ': ' + e.message); } } } }
          for (let i = 0; i < 40; i++) { try { RS.sim(0.1, 0.05); } catch (e) { out.thrown.push('sim after the boss messages: ' + e.message); break; } }
          out.boss = RS.director.boss ? { st: RS.director.boss.st, hp: RS.director.boss.hp, x: RS.director.boss.x } : null;
          if (out.boss && !(isFinite(out.boss.hp) && isFinite(out.boss.x))) out.nan.push('the boss: ' + JSON.stringify(out.boss));
        }
        // and the whole thing at once, and nothing at all
        for (const m of [{}, { t: null }, { t: 123 }, { t: {} }, { t: 'p' }, { t: 'p', f: 'frienddd' }, { t: 'leave' }, { t: 'leave', id: 'frienddd' }, { t: 'join' }, { t: 'host' }, { t: 'welcome' }, { t: 'welcome', players: 'x' }]) send(m);
        n.handle({ t: 'join', id: 'frienddd', name: 'FRIEND' });
        for (let i = 0; i < 60; i++) { send(pose({ ts: performance.now() + i * 50 })); try { RS.sim(0.05, 0.05); } catch (e) { out.thrown.push('sim at the end: ' + e.message); break; } }
        RS.scene.traverse(o => { if (o.position && !(isFinite(o.position.x) && isFinite(o.position.y) && isFinite(o.position.z))) out.nan.push(o.name || o.type); });
        const ph = RS.physics.world.bodies.filter(bd => !(isFinite(bd.position.x) && isFinite(bd.position.y) && isFinite(bd.position.z))).length;
        out.nanBodies = ph; out.player = [RS.player.head.x, RS.player.head.y, RS.player.head.z].every(isFinite); out.types = types.length; out.sent = steps;
        return out;
      }, [asHost, boss]);
      if (!boss) {
      // PROP HUNT: the same again with the game in Prop Hunt (its own messages), and a game dealt from nonsense
      const ph = await p.evaluate(async () => {
        const n = RS.net, out = { thrown: [], nan: [], on: false };
        RS.newGame('prophunt'); for (let i = 0; i < 10; i++) RS.sim(0.05, 0.05); out.on = !!RS.director.prophunt;
        const J = [null, NaN, Infinity, -1, 0, 1e9, '', 'x', 'x'.repeat(3000), [], [NaN, NaN, NaN], [1, 2], [1, 2, 3], ['frienddd', 'meeeeeee'], [{ id: 'frienddd' }, { id: null }, 5], {}, { frienddd: 'keg', meeeeeee: 9 }, { x: [1, 2, 3] }, true];
        const types = ['warm', 'phChk', 'phProp', 'phLock', 'phTaunt', 'phHello', 'phLobby', 'phRound', 'phGo', 'phClock', 'phFound', 'phHit', 'phHp', 'phShot', 'phMiss', 'phOut', 'phBack', 'phPts', 'phAuto', 'phEnd', 'phOver', 'phState'];
        const fields = ['v', 'p', 'k', 'id', 'y', 'on', 'i', 'n', 'list', 'seek', 'hide', 'lay', 'r', 'of', 'ht', 'st', 'tot', 'ph', 'left', 'by', 'hp', 'd', 't', 'why', 'rp', 'alive', 'stats', 'win', 'last', 'aw', 'round', 'kinds', 'locks', 'found', 'to'];
        const send = (m) => { try { n.handle(JSON.parse(JSON.stringify(m))); } catch (e) { out.thrown.push(`${m.t}.${Object.keys(m).filter(k => k !== 't' && k !== 'f').join(',')}: ${e.message}`); } };
        // (a round dealt by the friend, as if they were the host, so the hider and seeker messages have someone to be about)
        const deal = () => n.host ? (() => { try { RS.director.prophunt.hostStart(); } catch (e) { out.thrown.push('hostStart: ' + e.message); } })() : send({ t: 'phRound', f: n.hostId, r: 1, of: 4, seek: ['frienddd'], hide: ['meeeeeee'], list: [{ id: 'meeeeeee', name: 'ME', char: 'lewis' }, { id: 'frienddd', name: 'FRIEND', char: 'chloe' }], ht: 40, st: 150, lay: [0, 1, 1, 0.5, 1, NaN, 2, 0, 99, 3, 3, 3] });
        let steps = 0; deal(); RS.sim(0.05, 0.05);
        for (const t of types) for (const f of fields) for (const j of J) {
          send({ t, f: 'frienddd', [f]: j }); send({ t, f: 'strangerX', [f]: j }); if ((t === 'phRound' || t === 'phEnd' || t === 'phOver') && j === true) deal();
          if (++steps % 50 === 0) { try { RS.sim(0.05, 0.05); } catch (e) { out.thrown.push('sim after ' + t + '.' + f + ': ' + e.message); } }
        }
        for (const t of types) { send({ t }); send({ t, f: 'frienddd' }); }
        for (let i = 0; i < 40; i++) { try { RS.sim(0.05, 0.05); } catch (e) { out.thrown.push('sim at the end: ' + e.message); break; } }
        RS.scene.traverse(o => { if (o.position && !(isFinite(o.position.x) && isFinite(o.position.y) && isFinite(o.position.z))) out.nan.push(o.name || o.type); });
        out.player = [RS.player.head.x, RS.player.head.y, RS.player.head.z].every(isFinite); out.sent = steps;
        RS.newGame('roam'); for (let i = 0; i < 5; i++) RS.sim(0.05, 0.05); out.after = !RS.director.prophunt && !document.querySelector('#ph-ui');
        return out;
      });
      { const label = (asHost ? 'as host' : 'as guest') + ' in Prop Hunt';
        C.ok(ph.on, `${label}: Prop Hunt didn't start`); C.ok(!ph.thrown.length, `${label}: ${ph.thrown.length} hostile messages threw: ` + [...new Set(ph.thrown.map(x => x.slice(0, 120)))].slice(0, 8).join(' | '));
        C.ok(!ph.nan.length, `${label}: NaN positions: ${ph.nan.slice(0, 5).join(', ')}`); C.ok(ph.player, `${label}: the player's own position went NaN`); C.ok(ph.after, `${label}: Prop Hunt left things behind when the game changed`); }
      }
      if (!boss) {
      // SEARCH AND DESTROY: its own messages, with a round dealt by the host (us, or the friend)
      const sd = await p.evaluate(async () => {
        const n = RS.net, out = { thrown: [], nan: [], on: false };
        RS.newGame('snd'); for (let i = 0; i < 10; i++) RS.sim(0.05, 0.05); out.on = !!RS.director.snd;
        const J = [null, NaN, Infinity, -1, 0, 1e9, '', 'x', 'constructor', '__proto__', 'x'.repeat(3000), [], [NaN, NaN, NaN], [1, 2], [1, 2, 3], ['frienddd', 'meeeeeee'], [['frienddd', 'F', 'chloe', 'B', 0], ['meeeeeee', 'ME', 'lewis', 'R', 0], 5, [null]], {}, { frienddd: [1, 2], meeeeeee: 9 }, { x: [1, 2, 3] }, true];
        const types = ['sdHello', 'sdGun', 'sdShot', 'sdHit', 'sdTake', 'sdPlant', 'sdDefuse', 'sdAct', 'sdWait', 'sdBuy', 'sdGrab', 'sdRound', 'sdGo', 'sdClock', 'sdDmg', 'sdKill', 'sdGot', 'sdPk', 'sdBomb', 'sdEnd', 'sdOver', 'sdState', 'sdBots', 'sdHp', 'sdLoad', 'sdCash', 'sdDrop', 'sdSmash', 'sdGlass', 'sdProj', 'end'];
        const fields = ['g', 'a', 'b', 'n', 'id', 'v', 'd', 'hs', 'z', 'wb', 'p', 'i', 's', 'k', 'on', 'list', 'r', 'win', 'half', 'sc', 'att', 'car', 'pk', 'sp', 'gn', 'ld', 'cash', 'hist', 'mv', 'bt', 'rt', 'sw', 'ph', 'left', 'bl', 'by', 'hp', 'ar', 'w', 'as', 'ds', 'st', 'why', 'mvp', 'mw', 'last', 'aw', 'round', 'fs', 'bomb', 'pkOn', 'over', 'drops', 'c', 'no', 'lines', 'to', 'gl'];
        const send = (m) => { try { n.handle(JSON.parse(JSON.stringify(m))); } catch (e) { out.thrown.push(`${m.t}.${Object.keys(m).filter(k => k !== 't' && k !== 'f').join(',')}: ${e.message}`); } };
        const deal = () => n.host ? (() => { try { const s = RS.director.snd; if (!s.H) s.hostStart(); } catch (e) { out.thrown.push('hostStart: ' + e.message); } })()
          : send({ t: 'sdRound', f: n.hostId, r: 1, win: 4, half: 3, att: 'R', car: 'frienddd', list: [['meeeeeee', 'ME', 'lewis', 'R', 0], ['frienddd', 'FRIEND', 'chloe', 'B', 0], ['bot0', 'BOT', 'noah', 'B', 1]], pk: [['ammo', 1, 1], ['kebab', NaN, 2], ['constructor', 1, 1]], sp: { meeeeeee: [1, 1, 0] }, gn: { bot0: 'gravy' }, ld: { meeeeeee: ['monstor', 'ketchup'], bot0: ['gravy', 'constructor'], frienddd: 5 }, cash: { meeeeeee: 3000, frienddd: 'x' }, hist: [['R', 'boom'], 5, null], bt: 12, rt: 115 });
        let steps = 0; deal(); RS.sim(0.05, 0.05);
        for (const t of types) for (const f of fields) for (const j of J) {
          send({ t, f: 'frienddd', [f]: j }); send({ t, f: 'strangerX', [f]: j }); if ((t === 'sdRound' || t === 'sdEnd' || t === 'sdOver') && j === true) deal();
          if (++steps % 50 === 0) { try { RS.sim(0.05, 0.05); } catch (e) { out.thrown.push('sim after ' + t + '.' + f + ': ' + e.message); } }
        }
        for (const t of types) { send({ t }); send({ t, f: 'frienddd' }); }
        for (let i = 0; i < 40; i++) { try { RS.sim(0.05, 0.05); } catch (e) { out.thrown.push('sim at the end: ' + e.message); break; } }
        RS.scene.traverse(o => { if (o.position && !(isFinite(o.position.x) && isFinite(o.position.y) && isFinite(o.position.z))) out.nan.push(o.name || o.type); });
        out.player = [RS.player.head.x, RS.player.head.y, RS.player.head.z].every(isFinite); out.sent = steps;
        RS.newGame('roam'); for (let i = 0; i < 5; i++) RS.sim(0.05, 0.05); out.after = !RS.director.snd && !document.querySelector('#sd-ui') && !document.body.classList.contains('snd');
        return out;
      });
      { const label = (asHost ? 'as host' : 'as guest') + ' in Search & Destroy';
        C.ok(sd.on, `${label}: Search & Destroy didn't start`); C.ok(!sd.thrown.length, `${label}: ${sd.thrown.length} hostile messages threw: ` + [...new Set(sd.thrown.map(x => x.slice(0, 120)))].slice(0, 8).join(' | '));
        C.ok(!sd.nan.length, `${label}: NaN positions: ${sd.nan.slice(0, 5).join(', ')}`); C.ok(sd.player, `${label}: the player's own position went NaN`); C.ok(sd.after, `${label}: Search & Destroy left things behind when the game changed`); }
      }
      const label = (asHost ? 'as host' : 'as guest') + (boss ? ' (boss fight)' : '');
      C.ok(!r.thrown.length, `${label}: ${r.thrown.length} hostile messages threw: ` + [...new Set(r.thrown.map(x => x.replace(/: .*/, m => m.slice(0, 90))))].slice(0, 8).join(' | '));
      C.ok(!r.nan.length && !r.nanBodies, `${label}: NaN positions after the attack: ${r.nan.slice(0, 5).join(', ')} / ${r.nanBodies} physics bodies`);
      C.ok(r.player, `${label}: the player's own position went NaN`);
      C.ok(!p.errors.length, `${label}: page errors: ` + [...new Set(p.errors)].slice(0, 4).join(' | '));
      await p.context().close();
    }
  } finally { await b.close(); }
  return C.fails;
}
