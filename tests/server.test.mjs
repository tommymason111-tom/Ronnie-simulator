// The room server (server/worker.js), run in Node:
//   - crash reports: taken in, grouped, counted per session; bad ones refused; spam slowed; the page locked without the key
//   - hostile messages: garbage, huge, wrong types, forged senders, every message type with nonsense in it. The server
//     must never throw, and the other players in the room must carry on getting each other's messages
import path from 'path';
import { pathToFileURL } from 'url';
import { ROOT, checker } from './lib/game.mjs';
import { installGlobals, makeEnv } from './lib/durable.mjs';

export default async function () {
  const C = checker('server');
  installGlobals();
  const mod = await import(pathToFileURL(path.join(ROOT, 'server/worker.js')).href + '?t=' + Date.now());
  const worker = mod.default, { env, roomFor } = makeEnv(mod.Room);
  const post = (body, ip = '1.2.3.4') => worker.fetch(new Request('https://x/crash', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'cf-connecting-ip': ip } }), env, {});
  const get = (q) => worker.fetch(new Request('https://x/crashes' + q), env, {});

  // ---- crash reports
  let r = await post({ k: 'start', v: '2.23.0', d: 'quest' }); C.ok(r.status === 200, 'start not accepted: ' + r.status);
  r = await post({ k: 'error', m: 'boom', s: 'main.js:10 < main.js:20', v: '2.23.0', d: 'quest', b: 'quest-browser', p: 'pub', md: 'roam', vr: true, f: 1 }); C.ok(r.status === 200, 'error report not accepted');
  r = await post({ k: 'error', m: 'boom', s: 'main.js:10 < other.js:5', v: '2.23.0', d: 'iphone', f: 1 }, '5.6.7.8'); C.ok(r.status === 200, 'second report not accepted');
  r = await post('not json'); C.ok(r.status === 400, 'garbage report not refused: ' + r.status);
  r = await post({ k: 'evil', m: 'x' }); C.ok(r.status === 400, 'unknown kind not refused');
  r = await post('{"k":"error","m":"' + 'x'.repeat(5000) + '"}'); C.ok(r.status === 400, 'oversized report not refused');
  r = await get(''); C.ok(r.status === 403, 'crash page not locked without the key');
  r = await get('?k=wrong'); C.ok(r.status === 403, 'crash page opened with the wrong key');
  r = await get('?k=testkey&json=1'); const J = await r.json();
  C.ok(J.groups.length === 1 && J.groups[0].n === 2, 'reports not grouped (same error, same top frame): ' + JSON.stringify(J.groups.map(g => [g.m, g.n])));
  C.ok(J.groups[0].d.quest === 1 && J.groups[0].d.iphone === 1, 'devices not counted');
  C.ok(J.sessions['2.23.0'].quest === 1 && J.crashedSessions['2.23.0'].quest === 1, 'sessions not counted');
  r = await get('?k=testkey'); const html = await r.text(); C.ok(/problem-free/.test(html) && /boom/.test(html), 'crash page missing its tables');
  C.ok(!/<script/i.test(html.replace(/&lt;script/gi, '')), 'crash page lets html through');
  await post({ k: 'error', m: '<script>alert(1)</script>', v: '2.23.0', d: 'x', f: 1 }, '9.9.9.9'); const html2 = await (await get('?k=testkey')).text(); C.ok(!/<script>alert/.test(html2), 'crash page not escaping report text');
  let slowed = false; for (let i = 0; i < 40; i++) { const x = await post({ k: 'start', v: '1', d: 'spam' }, '7.7.7.7'); if (x.status === 429) { slowed = true; break; } } C.ok(slowed, 'one address can send unlimited reports');

  // ---- a room with three players, then hostile messages from one of them
  const join = async (name, pid) => { const res = await worker.fetch(new Request(`https://x/room/TEST?name=${name}&pid=${pid}`, { headers: { Upgrade: 'websocket' } }), env, {}); C.ok(res.status === 101, name + ' could not join: ' + res.status); };
  await join('A', 'aaaaaaaa'); await join('B', 'bbbbbbbb'); await join('C', 'cccccccc');
  const R = roomFor('TEST'), [sa, sb, sc] = R.socks;
  const say = async (sock, m) => { try { await R.room.webSocketMessage(sock, typeof m === 'string' ? m : JSON.stringify(m)); return null; } catch (e) { return e; } };
  const types = ['p', 'hi', 'chat', 'emote', 'punch', 'hit', 'hitc', 'grab', 'rel', 'save', 'giveHost', 'endGame', 'setup', 'ping', 'char', 'end', 'host', 'welcome', 'join', 'leave', 'kick', 'vote', 'kill', 'imp', 'say', 'music', 'tv'];
  const junk = [null, undefined, 0, -1, 1e308, NaN, '', 'x'.repeat(10000), [], {}, [1, 2, 3], { a: { b: { c: 1 } } }, true, '__proto__', 'constructor', 'ZZZZZZZZ', 'aaaaaaaa'];
  const bad = ['', ' ', 'null', '[]', '"x"', '{', '{"t":', '{"t":null}', '{"t":{}}', '{"t":[]}', '{"t":"' + 'q'.repeat(70000) + '"}', '{"__proto__":{"polluted":1},"t":"p"}', '\u0000\u0001'];
  let thrown = [];
  for (const m of bad) { const e = await say(sa, m); if (e) thrown.push('raw ' + JSON.stringify(m.slice(0, 30)) + ': ' + e.message); }
  for (const t of types) for (const j of junk) for (const field of ['to', 'id', 'f', 'k', 'c', 'h', 'name', 'v', 'e', 'target', 'it', 'ts']) {
    const e = await say(sa, { t, [field]: j }); if (e) thrown.push(`${t}.${field}=${String(j).slice(0, 20)}: ${e.message}`);
  }
  C.ok(!thrown.length, `server threw on ${thrown.length} hostile messages: ` + thrown.slice(0, 6).join(' | '));
  C.ok(!({}).polluted, 'prototype pollution through a message');
  // after all that, B and C still hear each other, and nobody got kicked
  const before = sc.got.length; await say(sb, { t: 'p', h: [1, 2, 3] });
  C.ok(sc.got.length > before && /"t":"p"/.test(sc.got[sc.got.length - 1]), 'room stopped passing messages on after the attack');
  C.ok(!sb.closed && !sc.closed, 'a well-behaved player was disconnected by the attack');
  // the host can't be stolen by a forged message
  const hostBefore = R.room.meta.host; await say(sc, { t: 'giveHost', to: 'cccccccc' }); await say(sc, { t: 'host', id: 'cccccccc' });
  C.ok(R.room.meta.host === hostBefore, 'a non-host took the host role with a forged message');
  // a closing socket and an error don't throw either
  for (const f of ['webSocketClose', 'webSocketError']) { try { await R.room[f](sb, 1006, 'gone', false); } catch (e) { C.ok(false, f + ' threw: ' + e.message); } }
  return C.fails;
}
