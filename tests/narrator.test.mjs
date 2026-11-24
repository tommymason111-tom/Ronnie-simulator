// THE NARRATOR AND THE CLIPS (narrator.js, narration.js, voices.js): every voice line is a pre-made clip, nothing live.
//   - every narrator line (tools/narrator_lines.mjs) has a clip; no clip's text (Ronnie, Tommy, the narrator) has a
//     *stage direction*, [tag] or (aside) in it: the character's clip is their words, the narrator says the direction
//   - Date Night on an upright phone: the narration is said from its clip; a line with a direction ("The salad.
//     Please. *a single tear*") plays Ronnie's clip, then the narrator's ("A single tear fell."), not on top of each
//     other; the film's caption shows both (the direction in italics) on the screen
//   - an attack card is read out by the narrator (from its clip)
//   - not one request for a voice made live (/tts), anywhere, including typing chat in a room (and hearing someone else's)
//   - the Quest: the attack card's narration plays in the headset
import { launch, newPage, startGame, sleep, checker, ROOT } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';
import WebSocket from 'ws';
import fs from 'fs'; import path from 'path';
import { narratorLines } from '../tools/narrator_lines.mjs';
import { gameHashers } from '../tools/ronnie_lines.mjs';
const TTS = (u) => /\/tts(\?|$)/.test(u);
const watchTTS = (p) => { p.tts = []; p.on('request', (r) => { if (TTS(r.url())) p.tts.push(r.url()); }); };

export default async function () {
  const C = checker('narrator');
  // ---- the clips
  const { lineHash, cleanLine } = gameHashers(), man = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/voices/manifest.json'), 'utf8'));
  const nar = new Set((man.narrator && man.narrator.lines) || []), lines = narratorLines(), miss = lines.filter(([l]) => { const c = cleanLine(l); return c && !nar.has(lineHash(c)); });
  C.ok(lines.length > 80, `only ${lines.length} narrator lines`);
  C.ok(!miss.length, `${miss.length} narrator lines have no clip: ${miss.slice(0, 4).map(x => x[0]).join(' | ')}`);
  for (const who of ['ronnie', 'tommy', 'narrator']) { const f = path.join(ROOT, 'tools/voice_lines', who + '.json'); if (!fs.existsSync(f)) { C.ok(false, 'no ' + f); continue; }
    const bad = JSON.parse(fs.readFileSync(f, 'utf8')).filter(l => /\*[^*]+\*|\[[^\]]+\]|\([^)]+\)/.test(l.t)); C.ok(!bad.length, `${who}: clip text with a stage direction in it: ${bad.slice(0, 3).map(l => l.t).join(' | ')}`);
    for (const l of JSON.parse(fs.readFileSync(f, 'utf8'))) if (!fs.existsSync(path.join(ROOT, 'assets/voices', who, l.h + '.mp3'))) { C.ok(false, `${who}: no clip for "${l.t}"`); break; } }
  console.log(`  ${lines.length} narrator lines, ${nar.size} clips`);

  const b = await launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    // ---- Date Night, an upright phone
    { const p = await newPage(b, { width: 390, height: 844, mobile: true }); watchTTS(p);
      await startGame(p, { place: 'restaurant', mode: 'date' });
      await p.waitForFunction(() => RS.director.date && RS.director.date.state === 'play', null, { timeout: 60000 }).catch(() => {});
      await p.evaluate(async () => { const A = await import('./js/audio.js'); A.initAudio(); try { await A.audioCtx().resume(); } catch (e) {} });
      const r = await p.evaluate(async () => { const V = await import('./js/voices.js'), dn = RS.director.date, w = (t) => new Promise(res => setTimeout(res, t)), out = {};
        const n0 = V.PLAYED.length; dn.narrate('The bread basket is unguarded.'); for (let i = 0; i < 60 && !V.PLAYED.slice(n0).length; i++) await w(100);
        out.narr = V.PLAYED.slice(n0).map(x => x.who);
        // a line with a direction: Ronnie's words, then the narrator's
        const n1 = V.PLAYED.length; dn.speaking = true; dn.line(dn.ron, 'The salad. Please. *a single tear*'); dn.speaking = false;
        for (let i = 0; i < 80 && V.PLAYED.length < n1 + 2; i++) await w(100);
        const pl = V.PLAYED.slice(n1); out.seq = pl.map(x => x.who); out.gap = pl.length >= 2 ? pl[1].t - (pl[0].t + pl[0].dur * 1000) : null;
        out.ronH = pl[0] && pl[0].h; out.want = V.lineHash(V.cleanLine('The salad. Please.'));
        dn.ui.caption('Ronnie', '#ffd400', 'The salad. Please. *a single tear*');      // (the film's caption, as a film shows it)
        const cap = document.querySelector('.dn-cap'), i = cap && cap.querySelector('i'), rc = cap && cap.getBoundingClientRect();
        out.cap = cap ? cap.textContent : null; out.italic = i ? i.textContent : null; out.capOn = !!(rc && rc.width > 0 && rc.left >= 0 && rc.right <= innerWidth && rc.top >= 0 && rc.bottom <= innerHeight);
        return out; });
      await sleep(200); if (process.env.SHOTS) { fs.mkdirSync(process.env.SHOTS, { recursive: true }); await p.screenshot({ path: path.join(process.env.SHOTS, 'narrator-datenight.png'), timeout: 180000 }).catch(() => {}); }
      console.log('  date night: ' + JSON.stringify(r));
      C.ok(r.narr.includes('narrator'), `Date Night's narration wasn't said: ${r.narr}`);
      C.ok(r.seq[0] === 'ronnie' && r.seq[1] === 'narrator' && r.gap != null && r.gap >= -50, `a line with a direction: ${JSON.stringify(r)}`);
      C.ok(r.ronH === r.want, 'Ronnie\'s clip should be his words alone');
      C.ok(r.italic === 'A single tear fell.' && r.capOn && !/\*/.test(r.cap), `the caption: ${JSON.stringify(r)}`);
      // an attack card
      const a = await p.evaluate(async () => { const V = await import('./js/voices.js'), n0 = V.PLAYED.length; RS.director.showAnnounce({ id: 'noah', name: 'Noah' }, 'tackle');
        for (let i = 0; i < 60 && !V.PLAYED.slice(n0).some(x => x.who === 'narrator'); i++) await new Promise(r => setTimeout(r, 100)); return V.PLAYED.slice(n0).map(x => x.who); });
      C.ok(a.includes('narrator'), `the attack card wasn't read out: ${a}`);
      C.ok(!p.tts.length, `asked for a live voice: ${p.tts.slice(0, 2)}`);
      C.ok(!p.errors.length, 'date night page errors: ' + p.errors.slice(0, 3).join(' | '));
      await p.context().close(); }

    // ---- typing chat in a room: never spoken, never sent for a voice
    { const host = await startRoomHost(); try {
      const code = 'CHAT', ws = new WebSocket(`${host.url}/room/${code}?name=TOMMYBOT&pid=bot1234567`); let myId = null;
      await new Promise((res) => { ws.on('message', (d) => { const m = JSON.parse(d.toString()); if (m.t === 'welcome') { myId = m.id; res(); } if (m.t === 'join' && m.id !== myId) { ws.send(JSON.stringify({ t: 'hi', to: m.id, name: 'TOMMYBOT', char: 'tommy' })); ws.send(JSON.stringify({ t: 'setup', to: m.id, place: 'pub', mode: 'roam' })); } }); setTimeout(res, 10000); });
      const p = await newPage(b, { width: 390, height: 844, mobile: true }); watchTTS(p);
      await p.goto(`http://game.local/index.html?lobby=${code}&relay=${encodeURIComponent(host.url)}`, { timeout: 120000, waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on', null, { timeout: 60000 });
      await p.waitForFunction(() => document.querySelector('.screen[data-s="intro"].on') || document.body.classList.contains('ready'), null, { timeout: 180000 }); await p.evaluate(() => { const r = document.querySelector('#intro-ready'); if (r && r.offsetParent) r.click(); });
      await p.waitForFunction(() => window.RS && document.body.classList.contains('ready'), null, { timeout: 180000 }); await p.evaluate(() => document.getElementById('play-flat').click()); await sleep(1500);
      const pose = { t: 'p', c: 'tommy', h: [1, 1.62, -2], q: [0, 0, 0, 1], l: [1, 1.62, -2], rh: [1.2, 1.4, -2.3], s: 1, st: 0, flat: 1 };
      for (let i = 0; i < 10; i++) { ws.send(JSON.stringify({ ...pose, ts: 1e6 + i * 100 })); await sleep(100); }
      ws.send(JSON.stringify({ t: 'chat', s: 'You\'re only older by a day, mate' })); await sleep(500);
      await p.evaluate(() => { RS.mp.chat('I am typing a message'); RS.mp.chat('Oi!'); }); await sleep(4000);
      const got = await p.evaluate(async () => { const V = await import('./js/voices.js'); return { played: V.PLAYED.filter(x => x.who === 'tommy' || x.who === 'ronnie').length, log: document.body.textContent.includes('older by a day') }; });
      console.log('  chat in a room: ' + JSON.stringify(got) + ' tts ' + p.tts.length);
      C.ok(!p.tts.length, `typing chat asked the server for a voice: ${p.tts.slice(0, 2)}`);
      C.ok(got.log, 'the chat message never arrived');
      C.ok(!p.errors.length, 'room page errors: ' + p.errors.slice(0, 3).join(' | '));
      ws.close(); await p.context().close(); } finally { await host.close(); } }

    // ---- the Quest
    { const p = await newPage(b, { width: 700, height: 500, xr: true }); watchTTS(p);
      await p.goto('http://game.local/index.html?go=1&place=pub&mode=roam');
      await p.waitForFunction(() => window.RS && document.body.classList.contains('ready'), null, { timeout: 180000 });
      await p.waitForFunction(() => !document.querySelector('#loadscreen.on'), null, { timeout: 120000 }).catch(() => {});
      await p.evaluate(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); RS.renderer.xr.setFramebufferScaleFactor(0.12); document.getElementById('enter-vr').click(); });
      await p.waitForFunction(() => RS.renderer.xr.isPresenting, null, { timeout: 180000 }); await sleep(1500);
      const a = await p.evaluate(async () => { const A = await import('./js/audio.js'); A.initAudio(); try { await A.audioCtx().resume(); } catch (e) {} const V = await import('./js/voices.js'), n0 = V.PLAYED.length; RS.director.showAnnounce({ id: 'aidan', name: 'Aidan' }, 'beer');
        for (let i = 0; i < 150 && !V.PLAYED.slice(n0).some(x => x.who === 'narrator'); i++) await new Promise(r => setTimeout(r, 100)); return V.PLAYED.slice(n0).map(x => x.who); });
      console.log('  quest: ' + a);
      C.ok(a.includes('narrator'), `the headset's attack card wasn't read out: ${a}`);
      C.ok(!p.tts.length && !p.errors.length, 'quest: ' + p.tts.concat(p.errors).slice(0, 3).join(' | '));
      await p.context().close(); }
  } finally { await b.close(); }
  return C.fails;
}
