// TWELVE PLAYERS STARTING A GAME: where each one is put (respawnPlayer in main.js, a new game or the warm-up) in every
// place with a room's games. Each must be on its own walkable spot (not in the furniture, not overlapping anyone else),
// reached from the start on foot: a line either side of the door put the fifth player onwards inside the walls or out
// in the car park. PLACES= narrows it.
import { launch, newPage, startGame, checker } from './lib/game.mjs';
const PLACES = (process.env.PLACES || 'pub,shop,garden').split(',');

export default async function () {
  const C = checker('spawn12'), b = await launch();
  try {
    for (const place of PLACES) {
      const p = await newPage(b, { width: 390, height: 844, mobile: true });
      await startGame(p, { place, mode: 'roam', dev: true });
      const r = await p.evaluate(() => {
        const room = RS.room, net = RS.net, s = room.start, out = [];
        // a pretend room of twelve (a line that's always open and sends nowhere), each of us in turn at each place in it
        net.ws = { readyState: 1, send() {}, close() {} }; net.host = true;
        const ids = Array.from({ length: 12 }, (_, i) => 'p' + String(i).padStart(2, '0'));
        const walls = (room.blockers || []).filter(b => (b.y1 ?? 1) > 1.6);
        const across = (x0, z0, x1, z1) => walls.some(b => { for (let k = 1; k < 40; k++) { const x = x0 + (x1 - x0) * k / 40, z = z0 + (z1 - z0) * k / 40; if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return true; } return false; });
        const inside = (x, z) => (room.blockers || []).filter(b => x > b.x0 - 0.2 && x < b.x1 + 0.2 && z > b.z0 - 0.2 && z < b.z1 + 0.2).length;
        for (let i = 0; i < 12; i++) {
          net.id = ids[i]; net.players.clear(); for (const id of ids) if (id !== net.id) net.players.set(id, { id, name: id });
          RS.newGame('roam'); const q = RS.player.rig.position, x = q.x, z = q.z, B = room.bounds;
          out.push({ i, x: +x.toFixed(2), z: +z.toFixed(2), out: !(x > B.x0 && x < B.x1 && z > B.z0 && z < B.z1), walls: across(s.x, s.z, x, z), furniture: inside(x, z), outdoors: !!(room.indoors && room.indoors(s.x, s.z) && !room.indoors(x, z)) });
        }
        net.players.clear(); net.ws = null; net.host = false;
        return out;
      });
      for (const o of r) C.ok(!o.out && !o.walls && !o.furniture && !o.outdoors, `${place}: player ${o.i + 1} of 12 starts somewhere they can't be: ${JSON.stringify(o)}`);
      for (let i = 0; i < r.length; i++) for (let j = 0; j < i; j++) { const d = Math.hypot(r[i].x - r[j].x, r[i].z - r[j].z); C.ok(d > 0.6, `${place}: players ${j + 1} and ${i + 1} start ${d.toFixed(2)}m apart (inside each other)`); }
      C.ok(!p.errors.length, `${place}: ` + p.errors.slice(0, 3).join(' | '));
      await p.context().close();
    }
  } finally { await b.close(); }
  return C.fails;
}
