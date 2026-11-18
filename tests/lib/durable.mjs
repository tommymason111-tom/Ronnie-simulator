// A small stand-in for Cloudflare's Durable Objects, so server/worker.js can be tested in Node: rooms with storage,
// alarms and hibernation-style WebSockets (each socket records what it was sent).
export class Storage {
  constructor() { this.m = new Map(); this.alarm = null; }
  async get(k) { const v = this.m.get(k); return v === undefined ? undefined : JSON.parse(v); }
  async put(k, v) { this.m.set(k, JSON.stringify(v)); }
  async delete(k) { return this.m.delete(k); }
  async list({ prefix = '' } = {}) { const out = new Map(); for (const [k, v] of this.m) if (k.startsWith(prefix)) out.set(k, JSON.parse(v)); return out; }
  async deleteAll() { this.m.clear(); }
  async setAlarm(t) { this.alarm = t; } async deleteAlarm() { this.alarm = null; }
}
export class Sock {
  constructor() { this.att = null; this.got = []; this.closed = false; }
  serializeAttachment(a) { this.att = JSON.parse(JSON.stringify(a)); }
  deserializeAttachment() { return this.att; }
  send(s) { if (this.closed) throw new Error('closed'); this.got.push(s); }
  close() { this.closed = true; }
}
// the worker builds a pair and returns one end in a 101 response: Node's own Response won't do 101, so this one does
export function installGlobals() {
  globalThis.WebSocketPair = class { constructor() { this[0] = { client: true }; this[1] = new Sock(); } };
  const Real = globalThis.__RealResponse || (globalThis.__RealResponse = globalThis.Response);
  globalThis.Response = class {
    constructor(body, init = {}) { this.status = init.status || 200; this.webSocket = init.webSocket; this._body = body == null ? '' : String(body); this.headers = new Headers(init.headers || {}); }
    async text() { return this._body; } async json() { return JSON.parse(this._body); }
  };
  void Real;
}
export function makeEnv(Room) {
  const rooms = new Map();
  const roomFor = (name) => {
    let r = rooms.get(name);
    if (!r) { const socks = []; const state = { storage: new Storage(), getWebSockets: () => socks.filter(s => !s.closed), acceptWebSocket: (s) => socks.push(s), blockConcurrencyWhile: (f) => (state.ready = f()) };
      r = { state, room: new Room(state, {}), socks }; rooms.set(name, r); }
    return r;
  };
  const env = { CRASH_KEY: 'testkey', ROOMS: { idFromName: (n) => n, get: (n) => ({ fetch: async (req) => { const R = roomFor(n); await R.state.ready; R.room.env = env; return R.room.fetch(req); } }) } };
  return { env, roomFor, rooms };
}
