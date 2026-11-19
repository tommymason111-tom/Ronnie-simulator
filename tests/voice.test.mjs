// VOICE CHAT through the real room server (run locally), with Chromium's pretend microphone (it beeps).
//   Three light players (just the voice chat and a room connection) and one real game:
//   - off by default: nobody's connected and nothing's sent until someone presses the button
//   - one turns it on: no connections yet (nobody to talk to), and everyone's squad goes quiet
//   - the others turn it on: everyone connects to everyone, sound arrives (the talking light comes on), the line is
//     quick (round trip, and how long the receiving end holds the sound back)
//   - your own voice is never played back to you (no feedback loop)
//   - mute: the others see you muted and your light stays off; leaving: their connection to you closes
//   - on and off five times: no connections or players left behind
//   - the real game: the 🎙️ button joins, a light player beeping lights up their name tag and their row down the side,
//     and the squad's voices are silenced (and come back when voice chat's over)
import { launch, newPage as newPage0, sleep, checker, ROOT } from './lib/game.mjs';
import fs from 'fs'; import path from 'path';
// (the microphone needs a secure page: the same game, served as https://game.local, everything else as usual)
const MT = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
async function newPage(b, o) { const p = await newPage0(b, o);
  await p.route('https://game.local/**', async (r) => { const u = r.request().url(); const f = path.join(ROOT, decodeURIComponent(u.slice(19).split('?')[0].split('#')[0]) || 'index.html');
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return r.fulfill({ body: fs.readFileSync(f), contentType: MT[path.extname(f)] || 'application/octet-stream' }); return r.abort(); });
  return p; }
import { startRoomHost } from './lib/roomhost.mjs';

const LIGHT = async (p, url, code, name) => {
  await p.goto('https://game.local/version.json', { timeout: 120000 });
  await p.evaluate(async ({ url, code, name }) => {
    const { VoiceChat } = await import('/js/voicechat.js'); const A = await import('/js/audio.js'); A.initAudio(); try { await A.audioCtx().resume(); } catch (e) {}
    const pid = Math.random().toString(36).slice(2, 12), ws = new WebSocket(`${url}/room/${code}?name=${name}&pid=${pid}`);
    const net = window.__net = { id: null, players: new Map(), send: (m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); }, sent: [] };
    const s0 = net.send; net.send = (m) => { net.sent.push(m.t); s0(m); };
    const vc = window.__vc = new VoiceChat(net); window.__A = A;
    let t = 0;
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.t === 'welcome') { net.id = m.id; return; }
      if (m.t === 'join') { net.players.set(m.id, { id: m.id }); return; } if (m.t === 'leave') { vc.left(m.id); return; }
      if (m.f && !net.players.has(m.f)) net.players.set(m.f, { id: m.f });
      if (m.t === 'vc' || m.t === 'rtc') vc.onMsg(m, { id: m.f }); };
    window.__pose = (at) => { if (window.__poseT) return; window.__poseT = setInterval(() => { t += 0.05; net.send({ t: 'p', c: 'chloe', h: [at[0], 1.62, at[2]], q: [0, 0, 0, 1], l: [at[0], 1.62, at[2]], rh: [at[0] + 0.2, 1.4, at[2] - 0.3], s: 1, st: 2, ts: Math.round(t * 1000), flat: 1 }); }, 50); };
    await new Promise(r => { const k = setInterval(() => { if (net.id) { clearInterval(k); r(); } }, 50); setTimeout(r, 15000); });
  }, { url, code, name });
};
const snap = (p) => p.evaluate(() => ({ on: __vc.on, peers: [...__vc.peers.values()].map(P => P.pc.connectionState), remote: __vc.remoteOn.size, npc: __A.npcMuted(), audios: document.querySelectorAll('audio[data-voice]').length, sent: __net.sent.length }));

export default async function () {
  const C = checker('voice'), host = await startRoomHost();
  const b = await launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--unsafely-treat-insecure-origin-as-secure=http://game.local', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const code = 'VOIC', [A, B, X] = [await newPage(b), await newPage(b), await newPage(b)];
    await LIGHT(A, host.url, code, 'ALFIE'); await LIGHT(B, host.url, code, 'BEN'); await LIGHT(X, host.url, code, 'XAV'); await sleep(800);
    // off by default
    const s0 = await snap(A); C.ok(!s0.on && !s0.peers.length && !s0.sent && !s0.npc, `voice chat should be off and silent by default: ${JSON.stringify(s0)}`);
    // one on: nobody to talk to yet, but everyone's squad goes quiet
    await A.evaluate(() => __vc.start()); await sleep(1500);
    const a1 = await snap(A), b1 = await snap(B);
    C.ok(a1.on && !a1.peers.length && a1.npc, `one player on: ${JSON.stringify(a1)}`);
    C.ok(!b1.on && b1.remote === 1 && b1.npc && !b1.peers.length, `the others should know, go quiet, and not connect until they turn it on: ${JSON.stringify(b1)}`);
    // everyone on: a full mesh, quickly
    const t0 = Date.now(); await B.evaluate(() => __vc.start()); await X.evaluate(() => __vc.start());
    let all = false; for (let i = 0; i < 60 && !all; i++) { await sleep(250); const ss = await Promise.all([A, B, X].map(snap)); all = ss.every(s => s.peers.length === 2 && s.peers.every(x => x === 'connected')); }
    const connectMs = Date.now() - t0; console.log(`  everyone connected in ${connectMs} ms`);
    C.ok(all, 'three players never all connected to each other');
    // sound arrives: the beeps light up the others' talking lights
    const heard = await B.evaluate(async () => { let max = 0; for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 100)); for (const v of __vc.levels().values()) max = Math.max(max, v); } return max; });
    C.ok(heard > 0, `no sound arrived from the others (talking level ${heard})`);
    // how quick: round trip and the receiving end's hold-back
    await B.evaluate(() => __vc.stats()); await sleep(3000);      // (the hold-back over a steady 3 seconds, not the start-up)
    const st = await B.evaluate(() => __vc.stats()); const vals = Object.values(st); console.log('  line: ' + JSON.stringify(vals));
    const rtt = Math.max(...vals.map(v => v.rtt || 0)), jb = Math.max(...vals.map(v => v.jb || 0));
    // (how starved of CPU this machine is: a 10 ms timer's lateness. On the same machine the sound only goes across the
    // room; a busy test machine delays the browser itself, which says nothing about the game's voice chat)
    const lag = await B.evaluate(async () => { let tot = 0; for (let i = 0; i < 40; i++) { const t = performance.now(); await new Promise(r => setTimeout(r, 10)); tot += performance.now() - t - 10; } return tot / 40; });
    const calm = lag < 6; console.log(`  round trip ${rtt.toFixed(0)} ms, held back ${jb.toFixed(0)} ms (timer lateness ${lag.toFixed(1)} ms: ${calm ? 'a calm machine, delays checked' : 'a busy machine, delays only reported'})`);
    C.ok(vals.length === 2 && vals.every(v => v.rtt != null && (!calm || v.rtt < 50)), `round trip too slow: ${rtt} ms`);
    // (the hold-back can't go below what the device's sound output needs: headless Chromium's pretend output needs ~130 ms,
    // a phone or headset far less. What's checked: nothing held back beyond that, i.e. no delay voice chat could avoid)
    C.ok(!calm || vals.every(v => v.jb == null || v.jbMin == null || v.jb - v.jbMin < 40), `voice chat holds the sound back more than it has to: ${JSON.stringify(vals)}`);
    // never your own voice back
    const echo = await A.evaluate(() => { const mine = new Set(__vc.stream.getTracks().map(t => t.id)); return [...document.querySelectorAll('audio')].some(a => a.srcObject && a.srcObject.getTracks().some(t => mine.has(t.id))); });
    C.ok(!echo, 'your own microphone is being played back to you');
    // mute
    await A.evaluate(() => __vc.setMuted(true)); await sleep(1500);
    const muted = await B.evaluate(async () => { const id = [...__vc.remoteOn.keys()].find(k => __vc.remoteOn.get(k).muted); let lit = 0; for (let i = 0; i < 15; i++) { await new Promise(r => setTimeout(r, 100)); lit = Math.max(lit, __vc.levels().get(id) || 0); } return { id: !!id, lit }; });
    C.ok(muted.id && muted.lit === 0, `muting didn't show (or still lit up): ${JSON.stringify(muted)}`);
    await A.evaluate(() => __vc.setMuted(false));
    // on and off, five times
    for (let i = 0; i < 5; i++) { await A.evaluate(() => __vc.stop()); await sleep(600); await A.evaluate(() => __vc.start()); await sleep(1800); }
    let ok5 = false; for (let i = 0; i < 40 && !ok5; i++) { await sleep(250); const ss = await Promise.all([A, B, X].map(snap)); ok5 = ss.every(s => s.peers.length === 2 && s.audios === 2 && s.peers.every(x => x === 'connected')); }
    const after5 = await Promise.all([A, B, X].map(snap)); console.log('  after on/off x5: ' + JSON.stringify(after5));
    C.ok(ok5, `after turning it on and off five times the connections aren't right: ${JSON.stringify(after5)}`);
    // the real game
    const H = await newPage(b, { width: 900, height: 600 });
    await H.goto(`https://game.local/index.html?lobby=${code}&relay=${encodeURIComponent(host.url)}`, { timeout: 120000, waitUntil: 'domcontentloaded' });
    await H.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on', null, { timeout: 60000 });
    const hid = await H.evaluate(() => ronnieMP.net.id);
    await A.evaluate((to) => { __net.send({ t: 'hi', to, name: 'ALFIE', char: 'chloe' }); __net.send({ t: 'setup', to, place: 'pub', mode: 'roam' }); }, hid);
    await H.waitForFunction(() => document.querySelector('.screen[data-s="intro"].on') || document.body.classList.contains('ready'), null, { timeout: 180000 }); await H.evaluate(() => { const r = document.querySelector('#intro-ready'); if (r && r.offsetParent) r.click(); });
    await H.waitForFunction(() => window.RS && document.body.classList.contains('ready'), null, { timeout: 180000 }); await H.evaluate(() => document.getElementById('play-flat').click());
    await A.evaluate(() => __pose([2, 0, -6])); await sleep(4000);
    const g0 = await H.evaluate(() => ({ bar: getComputedStyle(document.getElementById('vc-bar')).display, on: __voice.on, voicesGain: null }));
    C.ok(g0.bar !== 'none' && !g0.on, `the game's voice button: ${JSON.stringify(g0)}`);
    await H.evaluate(() => document.getElementById('vc-btn').click());
    let lit = null; for (let i = 0; i < 40; i++) { await sleep(300); lit = await H.evaluate(() => { const p = [...RS.net.players.values()].find(q => q.avatar); return { on: __voice.on, peers: __voice.peers.size, tag: p && p.avatar ? p.avatar.speaking : null, row: !!document.querySelector('#vc-list div.talk:not([data-v="me"])'), npc: (window.__A2 || null) }; }); if (lit.tag > 0 && lit.row) break; }
    const npc = await H.evaluate(async () => (await import('./js/audio.js')).npcMuted());
    console.log('  in the game: ' + JSON.stringify(lit) + ' squad muted ' + npc);
    C.ok(lit.on && lit.peers >= 1, `the game didn't join voice chat: ${JSON.stringify(lit)}`);
    C.ok(lit.tag > 0 && lit.row, `a player talking didn't light up their name tag and row: ${JSON.stringify(lit)}`);
    C.ok(npc, "the squad weren't silenced with voice chat on");
    await H.evaluate(() => document.getElementById('vc-btn').click()); for (const p of [A, B, X]) await p.evaluate(() => __vc.stop()); await sleep(1500);
    const npc2 = await H.evaluate(async () => (await import('./js/audio.js')).npcMuted());
    C.ok(!npc2, 'the squad stayed silent after everyone left voice chat');
    for (const [n, p] of [['A', A], ['B', B], ['X', X], ['game', H]]) C.ok(!p.errors.length, `${n} page errors: ` + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
