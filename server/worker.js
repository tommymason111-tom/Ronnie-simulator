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
    if (new URL(req.url).pathname.startsWith('/crash')) return crashLog(this, req);      // (one special "room" keeps the crash reports)
    if (/^\/(lb|rank)$/.test(new URL(req.url).pathname)) return leaderboard(this, req);      // (and another keeps the leaderboards)
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
const VOICES = { tommy: 'aAMpOb3QMsx7SxE7WkuG' };      // (ElevenLabs voice ids: not secret)
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
    if ((url.pathname === '/crash' && req.method === 'POST') || (url.pathname === '/crashes' && req.method === 'GET')) {
      const fwd = new Request(req, { headers: new Headers({ 'x-ip': req.headers.get('cf-connecting-ip') || '', 'x-key-ok': env.CRASH_KEY && url.searchParams.get('k') === env.CRASH_KEY ? '1' : '' }) });
      return env.ROOMS.get(env.ROOMS.idFromName('__crashlog__')).fetch(fwd);
    }
    if ((url.pathname === '/lb' || url.pathname === '/rank') && req.method === 'OPTIONS') return new Response('', { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } });
    if ((url.pathname === '/lb' && (req.method === 'GET' || req.method === 'POST')) || (url.pathname === '/rank' && req.method === 'POST')) {
      const fwd = new Request(req, { headers: new Headers({ 'x-ip': req.headers.get('cf-connecting-ip') || '', 'content-type': 'application/json' }) });
      return env.ROOMS.get(env.ROOMS.idFromName('__leaderboard__')).fetch(fwd);
    }
    const m = url.pathname.match(/^\/room\/([A-Z0-9]{4,8})$/i);
    if (m) return env.ROOMS.get(env.ROOMS.idFromName(m[1].toUpperCase())).fetch(req);
    return new Response('Ronnie Simulator multiplayer: OK (up to ' + MAX_PLAYERS + ' players a room)', { headers: { ...cors, 'content-type': 'text/plain' } });
  },
};

// ---- CRASH REPORTS (js/crash.js sends them). Kept in one special room: each different problem is a group (counted by
// version, device, browser, place and mode, with the last few times it happened); and every session says hello once, so
// the share of sessions with no problems can be worked out for each version and device. Nothing personal is sent.
// See them at /crashes?k=<CRASH_KEY> (a Worker secret the owner sets; without it the page is locked).
const CRASH_KINDS = ['start', 'error', 'promise', 'frame', 'caught', 'context', 'hang', 'killed'];
const fnv = (str) => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const word = (x, n = 24) => String(x == null ? '' : x).replace(/[^\w .:<>/()'#,-]/g, '').slice(0, n);
const bump = (o, k) => { k = word(k, 24) || '?'; o[k] = (o[k] || 0) + 1; return o; };
async function crashLog(room, req) {
  const st = room.state.storage, url = new URL(req.url);
  if (url.pathname === '/crashes') {
    if (req.headers.get('x-key-ok') !== '1') return new Response('locked: add ?k= with the CRASH_KEY secret (set it on the Worker first)', { status: 403, headers: cors });
    const sess = (await st.get('sess')) || {}, bad = (await st.get('bad')) || {}, groups = [...(await st.list({ prefix: 'g:' })).values()].sort((a, b) => b.n - a.n);
    if (url.searchParams.get('json')) return new Response(JSON.stringify({ sessions: sess, crashedSessions: bad, groups }, null, 1), { headers: { ...cors, 'content-type': 'application/json' } });
    const esc = (t) => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const top = (o) => Object.entries(o || {}).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${esc(k)} ${n}`).join(', ');
    let rate = '';
    for (const v of Object.keys(sess).sort().reverse().slice(0, 6)) for (const d of Object.keys(sess[v])) { const n = sess[v][d], b = (bad[v] && bad[v][d]) || 0; rate += `<tr><td>${esc(v)}</td><td>${esc(d)}</td><td>${n}</td><td>${b}</td><td>${n ? Math.round(100 * (1 - Math.min(n, b) / n)) : '-'}%</td></tr>`; }
    const rows = groups.slice(0, 150).map(g => `<tr><td>${g.n}</td><td>${esc(g.k)}</td><td><b>${esc(g.m)}</b><br><small>${esc(g.s)}</small></td><td>${top(g.v)}</td><td>${top(g.d)}<br><small>${top(g.b)}</small></td><td>${top(g.p)}<br><small>${top(g.md)}</small></td><td>${g.vr || 0}</td><td><small>${new Date(g.last).toISOString().slice(0, 16)}</small></td></tr>`).join('');
    return new Response(`<!doctype html><meta name=viewport content="width=device-width"><title>Ronnie Simulator crashes</title><style>body{font:14px system-ui;margin:12px}table{border-collapse:collapse;margin-bottom:24px}td,th{border:1px solid #ccc;padding:4px 6px;vertical-align:top;text-align:left}</style>
<h2>Sessions with no problems</h2><table><tr><th>version</th><th>device</th><th>sessions</th><th>with a problem</th><th>problem-free</th></tr>${rate}</table>
<h2>Problems (most common first)</h2><table><tr><th>times</th><th>kind</th><th>error / where</th><th>versions</th><th>devices / browsers</th><th>places / modes</th><th>in VR</th><th>last</th></tr>${rows}</table>`, { headers: { ...cors, 'content-type': 'text/html; charset=utf-8' } });
  }
  // a report: limited to 30 a minute from one address, a few KB, known kinds only
  const ip = req.headers.get('x-ip') || '?', now = Date.now(), rl = room.rl || (room.rl = new Map()), r = rl.get(ip) || { t: now, n: 0 };
  if (now - r.t > 60000) { r.t = now; r.n = 0; } r.n++; rl.set(ip, r); if (rl.size > 5000) rl.clear();
  if (r.n > 30) return new Response('slow down', { status: 429, headers: cors });
  let b; try { const txt = await req.text(); if (txt.length > 4000) throw 0; b = JSON.parse(txt); } catch (e) { return new Response('bad', { status: 400, headers: cors }); }
  if (!b || !CRASH_KINDS.includes(b.k)) return new Response('bad', { status: 400, headers: cors });
  const v = word(b.v, 16) || '?', d = word(b.d, 16) || '?';
  if (b.k === 'start') { const sess = (await st.get('sess')) || {}; (sess[v] || (sess[v] = {}))[d] = (sess[v][d] || 0) + 1; await st.put('sess', sess); return new Response('ok', { headers: cors }); }
  if (b.f) { const bad = (await st.get('bad')) || {}; (bad[v] || (bad[v] = {}))[d] = (bad[v][d] || 0) + 1; await st.put('bad', bad); }      // (the first problem in that session)
  const m = word(b.m, 220), s = word(b.s, 300), key = 'g:' + fnv(b.k + '|' + m + '|' + s.split(' < ')[0]);
  const g = (await st.get(key)) || { k: b.k, m, s, n: 0, first: now, v: {}, d: {}, b: {}, p: {}, md: {}, vr: 0, ex: [] };
  if (!g.n) { const count = (await st.get('ngroups')) || 0; if (count >= 400) return new Response('full', { status: 507, headers: cors }); await st.put('ngroups', count + 1); }
  g.n++; g.last = now; bump(g.v, v); bump(g.d, d); bump(g.b, b.b); bump(g.p, b.p || '-'); bump(g.md, b.md || '-'); if (b.vr) g.vr++;
  g.ex.unshift({ at: now, v, d, p: word(b.p, 16), md: word(b.md, 16), vr: !!b.vr, mp: +b.mp || 0, t: +b.t || 0, mem: +b.mem || null, where: word(b.where, 24) }); g.ex.length = Math.min(g.ex.length, 5);
  await st.put(key, g);
  return new Response('ok', { headers: cors });
}

// ---- LEADERBOARDS (js/leaderboard.js). Kept in one special room. Personal bests per board (each device's best, with the
// name and character it played as), and RANKED eat-off ratings (Elo, every player against every other in a match).
// Nothing personal: a device id the game made up, a nickname, a character. Scores are sanity-checked, sends limited.
const BOARDS = { eatoff: 6000, sweep: 200000, runpub1: 5000, runpub: 5000, runpub3: 5000 };
const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { ...cors, 'content-type': 'application/json' } });
const pidOk = (p) => typeof p === 'string' && /^[a-z0-9]{6,12}$/.test(p);
async function leaderboard(room, req) {
  const st = room.state.storage, url = new URL(req.url), now = Date.now();
  if (req.method === 'GET') {
    const b = url.searchParams.get('b') || 'eatoff', me = url.searchParams.get('pid') || '';
    let rows;
    if (b === 'ranked') { const r = (await st.get('r')) || {}; rows = Object.entries(r).filter(([, v]) => v.g >= 1).map(([pid, v]) => ({ pid, n: v.n, c: v.c, s: Math.round(v.r), g: v.g, w: v.w })); }
    else if (BOARDS[b]) { const o = (await st.get('b:' + b)) || {}; rows = Object.entries(o).map(([pid, v]) => ({ pid, n: v.n, c: v.c, s: v.s, t: v.t })); }
    else return json({ error: 'no such board' }, 404);
    rows.sort((x, y) => y.s - x.s); const i = rows.findIndex(x => x.pid === me);
    return json({ b, top: rows.slice(0, 25).map((x, k) => ({ ...x, pid: undefined, me: x.pid === me || undefined, rank: k + 1 })), me: i >= 0 ? { rank: i + 1, s: rows[i].s } : null, n: rows.length });
  }
  const ip = req.headers.get('x-ip') || '?', rl = room.rl || (room.rl = new Map()), r = rl.get(ip) || { t: now, n: 0 };
  if (now - r.t > 60000) { r.t = now; r.n = 0; } r.n++; rl.set(ip, r); if (rl.size > 5000) rl.clear();
  if (r.n > 20) return json({ error: 'slow down' }, 429);
  let b; try { const txt = await req.text(); if (txt.length > 4000) throw 0; b = JSON.parse(txt); } catch (e) { return json({ error: 'bad' }, 400); }
  if (url.pathname === '/lb') {
    const max = BOARDS[b && b.b], s2 = Math.round(+(b && b.s)); if (!max || !pidOk(b.pid) || !Number.isFinite(s2) || s2 < 0 || s2 > max) return json({ error: 'bad' }, 400);
    const key = 'b:' + b.b, o = (await st.get(key)) || {}, old = o[b.pid], best = !old || s2 > old.s;
    if (best) { o[b.pid] = { n: clean(b.n, 16) || 'Ronnie', c: clean(b.c, 12) || 'ronnie', s: s2, t: now };
      const ks = Object.keys(o); if (ks.length > 3000) { ks.sort((x, y) => o[x].s - o[y].s); for (const k of ks.slice(0, ks.length - 3000)) delete o[k]; } await st.put(key, o); }
    const rank = 1 + Object.values(o).filter(v => v.s > (best ? s2 : old.s)).length;
    return json({ ok: 1, best, rank, s: best ? s2 : old.s });
  }
  // a ranked match: 2-12 different players, each with their score; the same match sent twice (everyone's game sends it)
  // counts once
  const rows = Array.isArray(b && b.rows) ? b.rows.filter(x => x && pidOk(x.pid) && Number.isFinite(+x.s) && +x.s >= 0 && +x.s <= BOARDS.eatoff) : [];
  if (rows.length < 2 || rows.length > 12 || new Set(rows.map(x => x.pid)).size !== rows.length) return json({ error: 'bad' }, 400);
  const mid = 'm:' + clean(String(b.match || ''), 40); const seen = mid.length > 3 ? await st.get(mid) : null; if (seen) return json(seen);
  const R = (await st.get('r')) || {}, K = 32 / (rows.length - 1);
  const cur = rows.map(x => ({ pid: x.pid, s: +x.s, n: clean(x.n, 16) || 'Ronnie', c: clean(x.c, 12) || 'ronnie', r0: R[x.pid] ? R[x.pid].r : 1000 }));
  for (const a of cur) { a.d = 0; for (const o of cur) { if (o === a) continue; const exp = 1 / (1 + Math.pow(10, (o.r0 - a.r0) / 400)), res = a.s > o.s ? 1 : a.s === o.s ? 0.5 : 0; a.d += K * (res - exp); } }
  const top = Math.max(...cur.map(x => x.s));
  for (const a of cur) { const v = R[a.pid] || { r: 1000, g: 0, w: 0 }; v.r = a.r0 + a.d; v.g++; if (a.s === top) v.w++; v.n = a.n; v.c = a.c; R[a.pid] = v; }
  await st.put('r', R);
  const out = { ok: 1, rows: cur.sort((x, y) => y.s - x.s).map((a, i) => ({ pid: a.pid, n: a.n, c: a.c, s: a.s, place: i + 1, r: Math.round(a.r0 + a.d), d: Math.round(a.d) })) };
  if (mid.length > 3) await st.put(mid, out);
  return json(out);
}
