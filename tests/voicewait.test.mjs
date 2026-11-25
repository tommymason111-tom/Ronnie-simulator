// A LINE'S FIRST CLIP STILL PLAYS: the first time a line is said its clip has to download and decode. With a 1.2s
// wait the first Ronnie line in Date Night was dropped (shown silently). Clips here are slowed by 2s.
import fs from 'node:fs';
import { launch, newPage, startGame, checker } from './lib/game.mjs';
export default async function () {
  const C = checker('voicewait'), b = await launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const all = JSON.parse(fs.readFileSync(new URL('../tools/voice_lines/ronnie.json', import.meta.url), 'utf8')), { t: line, h } = all[all.length - 1];      /* (the last: the preload gets to it late) */
  try {
    const p = await newPage(b, { width: 390, height: 844, mobile: true });
    await p.addInitScript((h) => { const f0 = window.fetch; let n = 0; window.fetch = (u, o) => String(u).includes('/ronnie/' + h) ? new Promise(r => setTimeout(r, n++ ? 2000 : 30000)).then(() => f0(u, o)) : f0(u, o); }, h);      /* (the preload's copy still on its way, the line's own download 2s: a phone still loading) */
    await startGame(p, { place: 'restaurant', mode: 'date' });
    const who = await p.evaluate(async (line) => { const A = await import('./js/audio.js'); A.initAudio(); try { await A.audioCtx().resume(); } catch (e) {}
      const V = await import('./js/voices.js'), n0 = V.PLAYED.length; V.voiceLine('ronnie', line, null, { key: 'vw_test' });
      for (let i = 0; i < 60 && !V.PLAYED.slice(n0).length; i++) await new Promise(res => setTimeout(res, 100));
      return V.PLAYED.slice(n0).map(x => x.who); }, line);
    C.ok(who.includes('ronnie'), `Ronnie's first line (its clip slowed by 2s) wasn't played: ${JSON.stringify(who)}`);
    C.ok(!p.errors.length, 'page errors: ' + p.errors.slice(0, 3).join(' | '));
    await p.context().close();
  } finally { await b.close(); }
  return C.fails;
}
