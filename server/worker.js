// Ronnie Simulator multiplayer relay (a Cloudflare Worker).
// Each game has a room code; everyone in the room connects a WebSocket to the same Durable Object, which passes
// every message on to the others (or to one player, if the message names one with "to"). The first player in is
// the host (their browser runs the squad, the punters and the food); if they leave, the next oldest takes over.
// Uses the WebSocket Hibernation API, so an idle room costs nothing.

const MAX_PLAYERS = 6;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };

export class Room {
  constructor(state, env) { this.state = state; }

  async fetch(req) {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected a websocket', { status: 426, headers: cors });
    const url = new URL(req.url), name = (url.searchParams.get('name') || 'Ronnie').replace(/[^\w '!-]/g, '').slice(0, 16) || 'Ronnie';
    const peers = this.state.getWebSockets();
    if (peers.length >= MAX_PLAYERS) return new Response('room full', { status: 403, headers: cors });
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    const id = crypto.randomUUID().slice(0, 8), host = peers.length === 0, joined = Date.now();
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ id, name, host, joined });
    server.send(JSON.stringify({ t: 'welcome', id, host, players: peers.map(w => w.deserializeAttachment()) }));
    for (const w of peers) try { w.send(JSON.stringify({ t: 'join', id, name })); } catch (e) {}
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > 60000 || msg.charCodeAt(0) !== 123) return;   // JSON objects only
    const me = ws.deserializeAttachment();
    if (msg === '{"t":"ping"}') { ws.send('{"t":"pong"}'); return; }
    let to = null; const k = msg.indexOf('"to":"'); if (k > 0 && k < 40) to = msg.slice(k + 6, msg.indexOf('"', k + 6));
    const out = '{"f":"' + me.id + '",' + msg.slice(1);
    for (const w of this.state.getWebSockets()) { if (w === ws) continue; if (to && w.deserializeAttachment().id !== to) continue; try { w.send(out); } catch (e) {} }
  }

  async webSocketClose(ws) { this.left(ws); }
  async webSocketError(ws) { this.left(ws); }
  left(ws) {
    const me = ws.deserializeAttachment(); if (!me) return;
    const rest = this.state.getWebSockets().filter(w => w !== ws);
    for (const w of rest) try { w.send(JSON.stringify({ t: 'leave', id: me.id })); } catch (e) {}
    if (me.host && rest.length) {                 // the host's gone: the longest-standing player takes over
      const next = rest.map(w => [w, w.deserializeAttachment()]).sort((a, b) => a[1].joined - b[1].joined)[0];
      next[1].host = true; next[0].serializeAttachment(next[1]);
      for (const w of rest) try { w.send(JSON.stringify({ t: 'host', id: next[1].id })); } catch (e) {}
    }
    try { ws.close(1000, 'bye'); } catch (e) {}
  }
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
    return new Response('Ronnie Simulator multiplayer relay: OK', { headers: { ...cors, 'content-type': 'text/plain' } });
  },
};
