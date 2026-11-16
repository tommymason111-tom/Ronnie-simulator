// Runs server/worker.js locally: a tiny stand-in for Cloudflare's Durable Objects (one Room per code, hibernation-style
// WebSockets with attachments, storage, alarms) on top of the 'ws' package, so the real worker code can be tested.
import { WebSocketServer } from 'ws';
import http from 'http';
const { default: worker, Room } = await import(process.argv[2]);
class Storage { constructor() { this.m = new Map(); } async get(k) { return this.m.get(k); } async put(k, v) { this.m.set(k, JSON.parse(JSON.stringify(v))); } async deleteAll() { this.m.clear(); } async setAlarm(t) { this.alarm = t; } async deleteAlarm() { this.alarm = null; } }
class Sock { constructor() { this.att = null; this.ws = null; this.closed = false; } serializeAttachment(a) { this.att = JSON.parse(JSON.stringify(a)); } deserializeAttachment() { return this.att; } send(s) { if (this.ws && this.ws.readyState === 1) this.ws.send(s); } close(c, r) { this.closed = true; try { this.ws && this.ws.close(c, r); } catch (e) {} } }
globalThis.WebSocketPair = class { constructor() { this[0] = { client: true }; this[1] = new Sock(); } };
const OrigResponse = globalThis.Response;
globalThis.Response = class { constructor(body, init = {}) { this.status = init.status || 200; this.webSocket = init.webSocket; this.body = body; } };
const rooms = new Map();
const roomFor = (code) => { let r = rooms.get(code); if (!r) { const socks = []; const state = { storage: new Storage(), socks, getWebSockets: () => socks.filter(s => !s.closed), acceptWebSocket: (s) => socks.push(s), blockConcurrencyWhile: (f) => { state.ready = f(); return state.ready; } }; r = { state, room: new Room(state, {}) }; rooms.set(code, r); } return r; };
const env = { ROOMS: { idFromName: (n) => n, get: (n) => ({ fetch: async (req) => { const R = roomFor(n); await R.state.ready; return R.room.fetch(req); } }) } };
const stats = { msgsIn: 0, msgsOut: 0, bytesOut: 0 };
const server = http.createServer((q, s) => { s.end(JSON.stringify(stats)); });
const wss = new WebSocketServer({ server });
wss.on('connection', async (ws, req) => {
  const url = 'http://local' + req.url, headers = new Map([['upgrade', 'websocket']]);
  const res = await worker.fetch({ url, method: 'GET', headers: { get: (k) => headers.get(k.toLowerCase()) } }, env);
  if (res.status !== 101) { ws.close(4003, String(res.status)); return; }
  const code = (req.url.match(/room\/([A-Z0-9]+)/i) || [])[1].toUpperCase(), R = roomFor(code), sock = R.state.socks[R.state.socks.length - 1];
  sock.ws = ws; const send0 = sock.send.bind(sock); sock.send = (s) => { stats.msgsOut++; stats.bytesOut += s.length; send0(s); };
  for (const m of sock._q || []) ws.send(m);
  ws.on('message', (d) => { stats.msgsIn++; R.room.webSocketMessage(sock, d.toString()); });
  ws.on('close', () => { if (!sock.closed) { sock.closed = true; R.room.webSocketClose(sock); } });
});
// (the welcome is sent before the socket's wired up: queue anything sent early)
const S0 = Sock.prototype.send; Sock.prototype.send = function (s) { if (!this.ws) { (this._q || (this._q = [])).push(s); return; } S0.call(this, s); };
server.listen(Number(process.argv[3] || 8788), () => console.log('DO host on', process.argv[3] || 8788));
