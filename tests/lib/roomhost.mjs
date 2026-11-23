// The real room server (server/worker.js) running locally over real WebSockets, for games in the test browser to play
// through: startRoomHost() -> { url (ws://localhost:PORT), stats, close() }
import http from 'http';
import path from 'path';
import { pathToFileURL } from 'url';
import { WebSocketServer } from 'ws';
import { ROOT } from './game.mjs';
import { installGlobals, makeEnv } from './durable.mjs';

export async function startRoomHost() {
  installGlobals();
  const mod = await import(pathToFileURL(path.join(ROOT, 'server/worker.js')).href + '?t=' + Date.now());
  const { env, roomFor } = makeEnv(mod.Room), stats = { in: 0, out: 0, rooms: new Set() };
  // plain web requests (the leaderboards) go to the worker too
  const server = http.createServer(async (q, s) => { try { let body = ''; for await (const c of q) body += c;
      const res = await mod.default.fetch(new Request('http://local' + q.url, { method: q.method, headers: { ...q.headers, 'cf-connecting-ip': '127.0.0.1' }, body: q.method === 'GET' || q.method === 'HEAD' || q.method === 'OPTIONS' ? undefined : body }), env, { waitUntil() {} });
      const h = {}; res.headers.forEach((v, k) => { h[k] = v; }); s.writeHead(res.status, h); s.end(await res.text()); } catch (e) { s.statusCode = 500; s.end(String(e)); } });
  const wss = new WebSocketServer({ server });
  wss.on('connection', async (ws, req) => {
    // a pretend network for this player: ws://localhost:PORT/net/<delay ms>/<jitter ms>/... adds that much delay each
    // way, varying by up to the jitter, in order (like a real connection: late messages hold up the ones behind them)
    // A third number (/net/60/40/s700/...) adds a phone network's hiccups: every few seconds nothing gets through for up to
    // that long (a 4G handover, a lift), then everything held up arrives at once
    let lat = 0, jit = 0, stall = 0; const nm = req.url.match(/^\/net\/(\d+)\/(\d+)(?:\/s(\d+))?/); if (nm) { lat = +nm[1]; jit = +nm[2]; stall = +(nm[3] || 0); req.url = req.url.slice(nm[0].length) || '/'; }
    const lane = () => { let last = 0, until = 0, next = Date.now() + 2000 + Math.random() * 3000; return (f) => { if (!lat && !jit && !stall) return f(); const now = Date.now();
      if (stall && now > next) { until = now + stall * (0.4 + 0.6 * Math.random()); next = until + 2500 + Math.random() * 4000; }
      const at = Math.max(last, now + lat + Math.random() * jit, until); last = at; setTimeout(f, at - now); }; };
    const toClient = lane(), toRoom = lane();
    const res = await mod.default.fetch(new Request('http://local' + req.url, { headers: { Upgrade: 'websocket' } }), env, {});
    if (res.status !== 101) { ws.close(4003, String(res.status)); return; }
    const code = (req.url.match(/room\/([A-Z0-9]+)/i) || [])[1].toUpperCase(), R = roomFor(code), sock = R.socks[R.socks.length - 1]; stats.rooms.add(code);
    for (const m of sock.got.splice(0)) toClient(() => { if (ws.readyState === 1) ws.send(m); });      // (the welcome went out before the socket was wired up; over the pretend network like the rest)
    sock.send = (s) => { if (sock.closed) throw new Error('closed'); stats.out++; toClient(() => { if (ws.readyState === 1) ws.send(s); }); };
    sock.close = () => { sock.closed = true; try { ws.close(); } catch (e) {} };
    ws.on('message', (d) => { stats.in++; const m = d.toString(); toRoom(() => { if (!sock.closed) R.room.webSocketMessage(sock, m); }); });
    ws.on('close', () => { if (!sock.closed) { sock.closed = true; R.room.webSocketClose(sock, 1000, '', true); } });
  });
  await new Promise(r => server.listen(0, r));
  return { url: 'ws://localhost:' + server.address().port, stats, close: () => new Promise(r => { for (const c of wss.clients) c.terminate(); wss.close(); server.close(r); }) };
}
