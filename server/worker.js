// Ronnie Simulator multiplayer (a Cloudflare Worker, one Durable Object per room, WebSocket Hibernation API).
// Each game has a room code; everyone in the room connects a WebSocket to the same Durable Object. It:
//   - passes every message on to the others (or to one player, if the message names one with "to")
//   - holds up to 12 players
//   - knows each player by the ID their device keeps (so if you drop out and come back to the same room you're
//     the same player: your name, your score and progress are handed back; kept until the game ends)
//   - keeps track of the host: the first in. If the host leaves, hosting passes to whoever joined next after
//     them (and everyone's told). If the original host comes back they're a normal player; the current host can
//     hand it back
//   - referees grabs: whoever grabs a thing owns it (their game runs its physics and tells everyone); the next
//     person to grab takes it over; if two grab at the same moment, the first to reach the room gets it
//   - answers pings (for the ping display)
// An idle room costs nothing (hibernation); a room nobody's been in for a few hours forgets itself.

const MAX_PLAYERS = 12;
const SAME_TIME_MS = 150;                     // two grabs this close together: the first one wins
const FORGET_AFTER_MS = 4 * 60 * 60 * 1000;   // an empty room forgets its players after this
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
const clean = (s, n) => String(s || '').replace(/[^\w '!-]/g, '').slice(0, n);

export class Room {
  constructor(state, env) {
    this.state = state; this.owners = new Map();       // (who owns what: in memory; a room that's in use never hibernates)
    this.state.blockConcurrencyWhile(async () => { this.meta = (await this.state.storage.get('meta')) || { seq: 0, host: null, orig: null, saves: {} }; });
  }
  save() { return this.state.storage.put('meta', this.meta); }
  live() { return this.state.getWebSockets().map(w => [w, w.deserializeAttachment()]).filter(([, a]) => a && !a.gone); }
  send(w, m) { try { w.send(typeof m === 'string' ? m : JSON.stringify(m)); } catch (e) {} }
  all(m, except) { const s = JSON.stringify(m); for (const [w] of this.live()) if (w !== except) this.send(w, s); }

  async fetch(req) {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected a websocket', { status: 426, headers: cors });
    const url = new URL(req.url), name = clean(url.searchParams.get('name'), 16) || 'Ronnie';
    const pid = (url.searchParams.get('pid') || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || crypto.randomUUID().replace(/-/g, '').slice(0, 10);
    let peers = this.live();
    // the same player again (their phone dropped out and came back, or they reloaded): the old connection goes quietly
    for (const [w, a] of peers) if (a.id === pid) { a.gone = true; w.serializeAttachment(a); try { w.close(1000, 'replaced'); } catch (e) {} }
    peers = this.live();
    if (peers.length >= MAX_PLAYERS) return new Response('room full', { status: 403, headers: cors });
    const M = this.meta, back = M.saves[pid];
    // the host: the first one in, if nobody holds it (or whoever held it has gone)
    // (the host coming straight back on a new line, after a blip, stays the host)
    if (M.host !== pid && (!M.host || !peers.some(([, a]) => a.id === M.host))) { if (!peers.length) { M.host = pid; if (!M.orig) M.orig = pid; } else if (!peers.some(([, a]) => a.id === M.host)) M.host = this.successor(peers, null); }
    const joined = back && back.joined ? back.joined : ++M.seq;
    M.saves[pid] = { ...(back || {}), name, joined, seen: Date.now() };
    await this.state.storage.deleteAlarm();
    await this.save();
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ id: pid, name, joined });
    const hostName = (M.saves[M.host] || {}).name || '';
    this.send(server, { t: 'welcome', id: pid, host: M.host === pid, hostId: M.host, hostName, orig: M.orig, back: !!back, saved: back ? back.d || null : null, max: MAX_PLAYERS,
      players: peers.map(([, a]) => ({ id: a.id, name: a.name, host: a.id === M.host, char: (M.saves[a.id] || {}).char || null })) });
    for (const [w] of peers) this.send(w, { t: 'join', id: pid, name, back: !!back });
    return new Response(null, { status: 101, webSocket: client });
  }
  // whoever joined next after the one leaving (by when they first joined); if nobody did, the longest-standing
  successor(peers, leaving) {
    const list = peers.map(([, a]) => a).filter(a => !leaving || a.id !== leaving.id).sort((a, b) => a.joined - b.joined);
    if (!list.length) return null;
    if (leaving) { const after = list.find(a => a.joined > leaving.joined); if (after) return after.id; }
    return list[0].id;
  }

  async webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > 60000 || msg.charCodeAt(0) !== 123) return;   // JSON objects only
    const me = ws.deserializeAttachment(); if (!me || me.gone) return;
    // the room's own messages
    if (msg.startsWith('{"t":"ping"')) { this.send(ws, '{"t":"pong"' + msg.slice(11)); return; }
    if (msg.startsWith('{"t":"grab"') || msg.startsWith('{"t":"rel"') || msg.startsWith('{"t":"save"') || msg.startsWith('{"t":"giveHost"') || msg.startsWith('{"t":"endGame"')) {
      let m; try { m = JSON.parse(msg); } catch (e) { return; }
      const M = this.meta;
      if (m.t === 'grab') {          // the room decides who has it
        const nid = m.nid | 0, now = Date.now(), cur = this.owners.get(nid);
        const win = cur && cur.id !== me.id && now - cur.at < SAME_TIME_MS ? cur.id : me.id;
        if (win === me.id) this.owners.set(nid, { id: me.id, at: now });
        this.all({ t: 'own', nid, id: win, f: me.id });
        return;
      }
      if (m.t === 'rel') { const cur = this.owners.get(m.nid | 0); if (cur && cur.id === me.id) this.owners.delete(m.nid | 0); this.relay(ws, me, msg); return; }
      if (m.t === 'save') { const s = M.saves[me.id] || (M.saves[me.id] = { name: me.name, joined: me.joined }); s.d = m.d; if (m.c) s.char = clean(m.c, 20); s.seen = Date.now(); await this.save(); return; }
      if (m.t === 'giveHost') { if (M.host !== me.id) return; const to = this.live().find(([, a]) => a.id === m.to); if (!to) return;
        M.host = m.to; await this.save(); this.all({ t: 'host', id: m.to, name: to[1].name, why: 'given', from: me.id }); return; }
      if (m.t === 'endGame') { if (M.host !== me.id) return; for (const k in M.saves) delete M.saves[k].d; await this.save(); this.relay(ws, me, msg); return; }
    }
    this.relay(ws, me, msg);
  }
  relay(ws, me, msg) {
    let to = null; const k = msg.indexOf('"to":"'); if (k > 0 && k < 40) to = msg.slice(k + 6, msg.indexOf('"', k + 6));
    const out = '{"f":"' + me.id + '",' + msg.slice(1);
    for (const [w, a] of this.live()) { if (w === ws) continue; if (to && a.id !== to) continue; this.send(w, out); }
  }

  async webSocketClose(ws) { await this.left(ws); }
  async webSocketError(ws) { await this.left(ws); }
  async left(ws) {
    const me = ws.deserializeAttachment(); if (!me || me.gone) return;
    me.gone = true; ws.serializeAttachment(me);
    const rest = this.live().filter(([w]) => w !== ws), M = this.meta;
    for (const [nid, o] of this.owners) if (o.id === me.id) this.owners.delete(nid);
    for (const [w] of rest) this.send(w, { t: 'leave', id: me.id });
    if (M.host === me.id && rest.length) {           // the host's gone: whoever joined next after them takes over
      M.host = this.successor(rest, me); const nm = rest.find(([, a]) => a.id === M.host)[1].name;
      for (const [w] of rest) this.send(w, { t: 'host', id: M.host, name: nm, why: 'left', from: me.id });
    }
    if (M.saves[me.id]) M.saves[me.id].seen = Date.now();
    await this.save();
    if (!rest.length) await this.state.storage.setAlarm(Date.now() + FORGET_AFTER_MS);
    try { ws.close(1000, 'bye'); } catch (e) {}
  }
  async alarm() { if (!this.live().length) { await this.state.storage.deleteAll(); this.meta = { seq: 0, host: null, orig: null, saves: {} }; } }
}

// ---- real voices (ElevenLabs) for typed chat and any line without a pre-made clip: GET /tts?v=<character>&t=<text>
// The key is a Worker secret (ELEVENLABS_KEY), never in the game. Each line is made once and then served from the
// cache for everyone (a whole lobby hearing one message costs one request). Short lines only, a few a minute per person.
const VOICES = { tommy: '__TOMMY_VOICE_ID__' };
const TTS_MAX = 160, perIP = new Map();
async function tts(req, env, ctx, url) {
  const v = url.searchParams.get('v') || '', t = (url.searchParams.get('t') || '').replace(/\s+/g, ' ').trim().slice(0, TTS_MAX);
  const voice = VOICES[v]; if (!voice || voice.startsWith('__') || !t) return new Response('no such voice', { status: 404, headers: cors });
  if (!env.ELEVENLABS_KEY) return new Response('voices not set up', { status: 503, headers: cors });
  const dig = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v + '|' + t)))].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  const key = new Request('https://tts.ronnie-sim.cache/' + v + '/' + dig), cache = caches.default;
  const hit = await cache.match(key); if (hit) return new Response(hit.body, { headers: { ...cors, 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=86400' } });
  const ip = req.headers.get('CF-Connecting-IP') || '?', now = Date.now(), rec = (perIP.get(ip) || []).filter(x => now - x < 60000);
  if (rec.length >= 12) return new Response('slow down', { status: 429, headers: cors }); rec.push(now); perIP.set(ip, rec); if (perIP.size > 5000) perIP.clear();
  const up = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, { method: 'POST',
    headers: { 'xi-api-key': env.ELEVENLABS_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text: t, model_id: 'eleven_flash_v2_5', voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3 } }) });
  if (!up.ok) return new Response('voice failed', { status: 502, headers: cors });
  const audio = await up.arrayBuffer();
  ctx.waitUntil(cache.put(key, new Response(audio, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=2592000' } })));
  return new Response(audio, { headers: { ...cors, 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=86400' } });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (url.pathname === '/tts' && req.method === 'GET') return tts(req, env, ctx, url);
    const m = url.pathname.match(/^\/room\/([A-Z0-9]{4,8})$/i);
    if (m) return env.ROOMS.get(env.ROOMS.idFromName(m[1].toUpperCase())).fetch(req);
    return new Response('Ronnie Simulator multiplayer: OK (up to ' + MAX_PLAYERS + ' players a room)', { headers: { ...cors, 'content-type': 'text/plain' } });
  },
};
