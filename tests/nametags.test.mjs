// NAME TAGS: another player's tag shows their character's face, their name, who they're playing as, 👑 for the host,
// pips for how big they've got, connection bars that drop when their poses stop coming, a green glow and mic when they
// talk; far away it's drawn bigger (so it's still readable) and it fades out a long way off. Redrawn only on change.
import { launch, newPage, startGame, checker } from './lib/game.mjs';
import fs from 'fs';

export default async function () {
  const C = checker('nametags'), b = await launch(), dir = process.env.SHOT_DIR || '/tmp';
  try {
    const p = await newPage(b, { width: 900, height: 560 });
    await startGame(p, { place: 'pub', mode: 'roam0' }); await p.click('#play-flat').catch(() => {});
    const r = await p.evaluate(async () => {
      RS.renderer.setAnimationLoop(null); const { pushPose } = await import('./js/net.js'); const T = RS.THREE, P = RS.player, out = {};
      const pl = { id: 'x1', char: 'chloe', name: 'Big Dave The Destroyer', host: true, buf: [] }; pl.avatar = RS.net.makeAvatar(pl); const av = pl.avatar;
      const at = P.head.clone().addScaledVector(P.fwd, 2.5); let t = 0;
      const step = (secs, send = true, st = 3, where = at) => { for (let i = 0; i < secs * 30; i++) { t += 1 / 30; if (send && i % 2 === 0) pushPose(pl, { t: 'p', c: 'chloe', h: [where.x, 1.62, where.z], q: [0, 0, 0, 1], l: [where.x, 1.62, where.z], rh: [where.x + 0.2, 1.4, where.z - 0.3], s: 1, st, ts: Math.round(t * 1000), flat: 1 }, performance.now()); av.update(1 / 30, pl.pose); RS.sim(1 / 30, 1 / 30); } };
      await new Promise(r => setTimeout(r, 4000)); step(1.5);      // (the model and the face load)
      let draws = 0; const d0 = av.drawTag.bind(av); av.drawTag = () => { draws++; d0(); };
      step(2); out.redrawsWhileSteady = draws; out.net0 = av.tagNet;
      out.png = av.tagC.toDataURL('image/png');
      const px = (x, y) => Array.from(av.tagC.getContext('2d').getImageData(x, y, 1, 1).data); out.face = px(62, 60); out.edge = px(8, 60);
      // they talk
      av.setSpeaking(0.8); out.edgeTalk = px(8, 60); out.pngTalk = av.tagC.toDataURL('image/png'); av.setSpeaking(0);
      // their poses stop: the bars drop
      step(0.2, false); await new Promise(r => setTimeout(r, 1700)); step(0.1, false); out.netStale = av.tagNet;
      step(0.6, true); await new Promise(r => setTimeout(r, 450)); step(0.1, true); out.netBack = av.tagNet;      // (the tag looks every 0.4 s of real time)
      // further away: bigger; a long way: faded
      const near = av.tag.scale.x; const far = P.head.clone().addScaledVector(P.fwd, 12); step(1, true, 3, far); out.scaleNear = +near.toFixed(3); out.scaleFar = +av.tag.scale.x.toFixed(3);
      const vfar = P.head.clone().addScaledVector(P.fwd, 45); step(1, true, 3, vfar); out.opacityVeryFar = av.tag.material.opacity;
      // bigger size: more pips (redrawn)
      const before = draws; step(0.5, true, 7, far); await new Promise(r => setTimeout(r, 450)); step(0.1, true, 7, far); out.redrawOnGrow = draws > before;
      av.dispose && av.dispose();
      return out; });
    fs.writeFileSync(`${dir}/nametag.png`, Buffer.from(r.png.split(',')[1], 'base64')); fs.writeFileSync(`${dir}/nametag-talk.png`, Buffer.from(r.pngTalk.split(',')[1], 'base64'));
    delete r.png; delete r.pngTalk; console.log('  ' + JSON.stringify(r));
    C.ok(r.redrawsWhileSteady === 0, `the tag was redrawn ${r.redrawsWhileSteady} times with nothing changing`);
    C.ok(r.net0 === 3 && r.netStale <= 1 && r.netBack === 3, `connection bars: steady ${r.net0}, stopped ${r.netStale}, back ${r.netBack}`);
    C.ok(r.face[3] > 200 && !(r.face[0] === r.face[1] && r.face[1] === r.face[2]), `no face drawn on the tag: ${r.face}`);
    C.ok(r.edgeTalk[1] > 200 && r.edgeTalk[0] < 120, `the tag doesn't glow green while they talk: ${r.edgeTalk} (was ${r.edge})`);
    C.ok(r.scaleFar > r.scaleNear * 1.5, `far away the tag should be bigger: ${r.scaleNear} -> ${r.scaleFar}`);
    C.ok(r.opacityVeryFar < 0.5, `a long way off the tag should fade: ${r.opacityVeryFar}`);
    C.ok(r.redrawOnGrow, 'growing a size didn\'t update the pips');
    C.ok(!p.errors.length, 'page errors: ' + [...new Set(p.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
