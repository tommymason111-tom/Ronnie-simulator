// IMPOSTER REPLAY: recording everyone at ten times a second and picking the best moment (a double kill beats a single,
// a kill beats nothing, a crowd beats an empty room), then playing it: stand-ins for everyone, moving where they were,
// the kill happening on time (the victim drops out), its own camera circling, the caption naming who got who and where;
// SKIP and the end put everything back (no stand-ins left, the real players visible again); nothing recorded = no replay.
import { launch, newPage, startGame, checker } from './lib/game.mjs';
import fs from 'fs';

export default async function () {
  const C = checker('replay'), b = await launch(), dir = process.env.SHOT_DIR || '/tmp';
  try {
    const p = await newPage(b, { width: 900, height: 560 });
    await startGame(p, { place: 'pub', mode: 'roam0' }); await p.click('#play-flat').catch(() => {});
    const r = await p.evaluate(async () => {
      RS.renderer.setAnimationLoop(null); const { ImpReplay } = await import('./js/impreplay.js'); const out = {};
      const names = { a: 'ALFIE', b: 'BEN', c: 'CHLOE', d: 'DYLAN' }, chars = { a: 'alfie', b: 'ben', c: 'chloe', d: 'dylan' };
      // a pretend room: four players walking about, and you
      const players = new Map(); for (const id of 'abcd') players.set(id, { id, name: names[id], char: chars[id], buf: [] });
      const net = { id: 'me', name: 'ME', char: 'ronnie', players, lastSent: null, makeAvatar: (fp) => RS.net.makeAvatar(fp) };
      const imp = { g: { renderer: RS.renderer, camera: RS.player.camera, player: RS.player, words: { show() {} }, selfBody: () => null }, net, nameOf: (id) => names[id] || 'ME', roomNear: () => 'THE KITCHEN' };
      const R = new ImpReplay(imp);
      const at = (id, t) => { const k = 'abcd'.indexOf(id), x = -12 + Math.sin(t * 0.5 + k) * 2 + k * 0.7, z = -4 + Math.cos(t * 0.4 + k) * 2; return [x, z]; };
      let T = 0; const step = (secs) => { for (let i = 0; i < secs * 30; i++) { T += 1 / 30;
        for (const [id, pl] of players) { const [x, z] = at(id, T); pl.pose = { t: 'p', c: pl.char, h: [x, 1.62, z], q: [0, 0, 0, 1], l: [x, 1.62, z], rh: [x + 0.2, 1.4, z - 0.3], s: 1, st: 1, flat: 1 }; }
        net.lastSent = JSON.stringify({ t: 'p', c: 'ronnie', h: [-11, 1.62, -3], q: [0, 0, 0, 1], l: [-11, 1.62, -3], rh: [-10.8, 1.4, -3.3], s: 1, st: 0, flat: 1 });
        R.t0 -= 1000 / 30; R.record(1 / 30); } };      // (its clock runs with the pretend one)
      out.none = R.best() === null;
      step(20); R.event('kill', { v: 'b', k: 'a', p: at('b', T) }); step(15);
      R.event('kill', { v: 'c', k: 'd', p: at('c', T) }); step(0.8); R.event('kill', { v: 'a', k: 'd', p: at('a', T) }); step(10);
      out.frames = R.frames.length; out.perFrame = R.frames[R.frames.length - 1].ps.length;
      const best = R.best(); out.best = { kills: best.kills.length, caption: best.caption, len: +(best.e - best.s).toFixed(1) };
      // play it
      const progs0 = RS.renderer.info.programs.length, sceneN0 = RS.scene.children.length, before = new Set(RS.scene.children);
      let done = false; out.started = R.play(() => { done = true; });
      let maxStand = 0, camSet = false, deadAt = null, shot = null;
      for (let i = 0; i < 30 * 30 && !done; i++) { const dt = 1 / 30; R.update(dt); RS.sim(dt, dt); const P = R.playing; if (P) { maxStand = Math.max(maxStand, [...P.who.values()].filter(f => f.avatar).length); camSet = camSet || !!R.cam; if (P.dead.size && deadAt === null) deadAt = +(P.t - P.b.s).toFixed(2);
          if (!shot && P.dead.size) { RS.renderer.render(RS.scene, R.cam); shot = RS.renderer.domElement.toDataURL('image/png'); } } }
      out.done = done; out.maxStand = maxStand; out.camSet = camSet; out.deadAt = deadAt; out.cap = document.querySelector('#imp-replay') ? 'still showing' : 'gone';
      const extra = RS.scene.children.filter(o => !before.has(o) && o.name !== 'food batch'); out.leftover = extra.length; out.what = extra.map(o => (o.name || o.type) + (o.isSprite ? ':sprite' : '') + ':' + (o.visible ? 'v' : 'h')).slice(0, 14); out.built = RS.renderer.info.programs.length - progs0; out.shot = shot;
      // SKIP straight away
      let done2 = false; R.play(() => { done2 = true; }); R.update(1 / 30); document.querySelector('#imp-replay .skip').click(); out.skipped = done2 && !R.playing && !document.querySelector('#imp-replay');
      return out; });
    if (r.shot) fs.writeFileSync(`${dir}/replay.png`, Buffer.from(r.shot.split(',')[1], 'base64')); delete r.shot;
    console.log('  ' + JSON.stringify(r));
    C.ok(r.none, 'a replay with nothing recorded');
    C.ok(r.perFrame === 5, `everyone (4 players and you) should be in each frame: ${r.perFrame}`);
    C.ok(r.best.kills === 2 && /DOUBLE KILL/.test(r.best.caption), `the double kill should be the best moment: ${JSON.stringify(r.best)}`);
    C.ok(r.started && r.done && r.camSet && r.maxStand === 5, `the replay didn't play properly: ${JSON.stringify(r)}`);
    C.ok(r.deadAt !== null && r.deadAt > 4 && r.deadAt < 7, `the kill should happen about 6s in: ${r.deadAt}`);
    C.ok(r.cap === 'gone' && r.leftover <= 0, `the replay left things behind: overlay ${r.cap}, ${r.leftover} scene objects`);
    C.ok(r.skipped, 'SKIP didn\'t end the replay');
    C.ok(!p.errors.length, 'page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
