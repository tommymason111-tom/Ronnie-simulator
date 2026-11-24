// NOTHING LEFT ON THE FLOOR: a player's or bot's body (Search & Destroy's squad bots, other players in a room) never
// placed its character's own prop in its hand, so Aidan's, Connor's and Harry's pints stood in the middle of the pub
// floor. Looks for any visible pint (its stout colour) that isn't up in someone's hand or on a table.
import { launch, newPage, startGame, checker } from './lib/game.mjs';
export default async function () {
  const C = checker('strayprops'), b = await launch();
  try {
    for (const [place, mode] of [['pub', 'snd'], ['pub', 'roam'], ['shop', 'snd'], ['garden', 'snd']]) {
      const p = await newPage(b, { width: 390, height: 844, mobile: true });
      await startGame(p, { place, mode });
      const r = await p.evaluate(() => {
        RS.renderer.setAnimationLoop(null); RS.sim(3);
        const T = RS.THREE, stout = new T.Color(0x140c08), out = [];
        RS.scene.traverse(o => {
          if (!o.isMesh || o.isInstancedMesh || !o.geometry || !o.geometry.attributes.color) return;
          if (o.geometry.userData.pint) { for (let q = o; q; q = q.parent) if (!q.visible) return; const v = new T.Vector3(); o.getWorldPosition(v); const fl = RS.floorAt ? RS.floorAt(v.x, v.z) || 0 : 0; if (v.y - fl < 0.3) out.push([v.x, v.y, v.z].map(x => +x.toFixed(2))); return; }      // (the pint: pint.js tags its shapes)
          const c = o.geometry.attributes.color; if (!c.array || c.count > 4000) return; if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); if (o.geometry.boundingSphere.radius > 0.25) return;   /* (pint-sized things only, not a merged sign that shares the colour) */
          let hit = 0; for (let i = 0; i < c.count; i += 3) if (Math.abs(c.getX(i) - stout.r) < 0.01 && Math.abs(c.getY(i) - stout.g) < 0.01 && Math.abs(c.getZ(i) - stout.b) < 0.01) hit++;
          if (hit < 10) return;
          for (let q = o; q; q = q.parent) if (!q.visible) return;
          const v = new T.Vector3(); o.getWorldPosition(v); const fl = RS.floorAt ? RS.floorAt(v.x, v.z) || 0 : 0;
          if (v.y - fl < 0.3) out.push([v.x, v.y, v.z].map(x => +x.toFixed(2)));
        });
        return out;
      });
      C.ok(r.length === 0, `${place}/${mode}: a pint is standing on the floor at ${JSON.stringify(r)}`);
      C.ok(p.errors.length === 0, `${place}/${mode} page errors: ` + p.errors.slice(0, 3).join(' | '));
      await p.context().close();
    }
  } finally { await b.close(); }
  return C.fails;
}
