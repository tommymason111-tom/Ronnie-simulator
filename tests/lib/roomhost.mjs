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
  const server = http.createServer((q, s) => s.end('ok'));
  const wss = new WebSocketServer({ server });
  wss.on('connection', async (ws, req) => {
    const res = await mod.default.fetch(new Request('http://local' + req.url, { headers: { Upgrade: 'websocket' } }), env, {});
    if (res.status !== 101) { ws.close(4003, String(res.status)); return; }
    const code = (req.url.match(/room\/([A-Z0-9]+)/i) || [])[1].toUpperCase(), R = roomFor(code), sock = R.socks[R.socks.length - 1]; stats.rooms.add(code);
    for (const m of sock.got.splice(0)) ws.send(m);                                   // (the welcome went out before the socket was wired up)
    sock.send = (s) => { if (sock.closed) throw new Error('closed'); stats.out++; if (ws.readyState === 1) ws.send(s); };
    sock.close = () => { sock.closed = true; try { ws.close(); } catch (e) {} };
    ws.on('message', (d) => { stats.in++; R.room.webSocketMessage(sock, d.toString()); });
    ws.on('close', () => { if (!sock.closed) { sock.closed = true; R.room.webSocketClose(sock, 1000, '', true); } });
  });
  await new Promise(r => server.listen(0, r));
  return { url: 'ws://localhost:' + server.address().port, stats, close: () => new Promise(r => { for (const c of wss.clients) c.terminate(); wss.close(); server.close(r); }) };
}
