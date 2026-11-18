// CHAOS: a bot plays every place like a toddler with a phone, from a seed (so anything it breaks can be replayed with
// the same seed): walks and spins, grabs, throws, eats and drops food, presses whatever button is on screen (pause,
// controls, game mode, every mode, restart, characters, emotes, the how-to pages...), changes the game, sets off
// power-ups. Each step is a tenth of a second of game. Any page error, any crash report, anything at an impossible
// position fails it, with the seed and the bot's last moves.
// env: SEEDS (how many per place, default 1), STEPS (default 500 = 50s of game), PLACES (comma list)
import { launch, newPage, startGame, checker } from './lib/game.mjs';

const PLACES = (process.env.PLACES || 'pub,bedroom,shop,garden,restaurant').split(',');
const MODES = { pub: 'everyone', bedroom: 'everyone', shop: 'sweep', garden: 'bbq', restaurant: 'date' };
const SEEDS = +(process.env.SEEDS || 1), STEPS = +(process.env.STEPS || 500), SEED0 = +(process.env.SEED0 || 1);

export default async function () {
  const C = checker('chaos'), b = await launch();
  try {
    for (const place of PLACES) for (let k = 0; k < SEEDS; k++) {
      const seed = SEED0 + k * 7919 + place.length * 101, p = await newPage(b, { width: 700, height: 460 });
      try {
        await startGame(p, { place, mode: MODES[place] });
        const r = await p.evaluate(async ({ seed, STEPS }) => {
          let s = seed >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
          const pick = (a) => a[Math.floor(rnd() * a.length)], log = [], P = RS.player;
          const NO = ['over-leave', 'pause-quit', 'end-leave', 'back-menu', 'ui-change', 'enter-vr', 'mus-add', 'tv-add', 'rejoin-btn', 'room-leave', 'title-vr', 'set-dev', 'cog'];
          RS.renderer.setAnimationLoop(null); const PU = Object.keys((await import('./js/powerups.js')).POWERUPS || {});
          const actions = [
            () => { P.flatMove = { x: rnd() * 2 - 1, z: rnd() * 2 - 1 }; return 'move'; },
            () => { P.flatYaw = (P.flatYaw || 0) + (rnd() - 0.5) * 3; return 'turn'; },
            () => { const it = RS.items.items.filter(x => !x.dead && !x.heldBy).sort((a, c) => a.pos.distanceTo(P.head) - c.pos.distanceTo(P.head))[0]; if (it && P.flatGrab) { P.flatGrab(it); return 'grab ' + it.type; } return 'grab none'; },
            () => { P.flatThrow && P.flatThrow(2 + rnd() * 10); return 'throw'; },
            () => { P.flatEat && P.flatEat(); return 'eat'; },
            () => { P.flatDrop && P.flatDrop(); return 'drop'; },
            () => { const bs = [...document.querySelectorAll('button, .mate, .flip, [data-em], [data-id]')].filter(e => e.getClientRects().length && !NO.includes(e.id) && !e.closest('#start') && getComputedStyle(e).visibility !== 'hidden'); const e = bs.length && pick(bs); if (!e) return 'no button';
              e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); e.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); e.click(); return 'press ' + (e.id || e.dataset.id || e.dataset.em || e.className || e.tagName).toString().slice(0, 30); },
            () => { const m = pick(['everyone', 'chonkoff', 'chonkoff2', 'roam', 'roam0', 'runpub', 'sweep', 'bbq', 'date']); try { RS.newGame(m); } catch (e) { throw new Error('newGame ' + m + ': ' + e.message); } return 'game ' + m; },
            () => { const pu = RS.powerups; if (pu && pu.give && PU.length) { const id = pick(PU); pu.give(id); return 'power-up ' + id; } return 'no power-ups'; },
            () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: pick(['Escape', 'Enter', ' ', 'e', 'q', 'w', 'a', 's', 'd', 'ArrowLeft', 'ArrowRight']), bubbles: true })); return 'key'; },
            () => { const t = 0.5 + rnd() * 3; RS.sim(t, 1 / 30); return 'wait ' + t.toFixed(1) + 's'; },
          ];
          const out = { thrown: null, log };
          for (let i = 0; i < STEPS; i++) {
            const a = pick(actions);
            try { const what = a(); log.push(what); if (log.length > 25) log.shift(); RS.sim(0.1, 1 / 30); }
            catch (e) { out.thrown = `step ${i} (${log[log.length - 1]}): ${e.message}\n${(e.stack || '').split('\n').slice(1, 4).join(' | ')}`; break; }
            if (i % 50 === 0) { try { RS.shot(); } catch (e) { out.thrown = 'drawing: ' + e.message; break; } await new Promise(r => setTimeout(r, 0)); }
          }
          const bad = []; RS.scene.traverse(o => { if (o.position && !(isFinite(o.position.x) && isFinite(o.position.y) && isFinite(o.position.z))) bad.push(o.name || o.type); });
          out.nan = bad.slice(0, 5); out.nanBodies = RS.physics.world.bodies.filter(bd => !(isFinite(bd.position.x) && isFinite(bd.position.y) && isFinite(bd.position.z))).length;
          return out;
        }, { seed, STEPS });
        const tag = `${place} seed ${seed}`, last = ' | last moves: ' + r.log.slice(-8).join(', ');
        C.ok(!r.thrown, `${tag}: threw: ${r.thrown}${last}`);
        C.ok(!r.nan.length && !r.nanBodies, `${tag}: impossible positions: ${r.nan.join(', ')} / ${r.nanBodies} bodies${last}`);
        C.ok(!p.errors.length, `${tag}: page errors: ${[...new Set(p.errors)].slice(0, 3).join(' | ')}${last}`);
        const cr = p.crashes.filter(c => c.k !== 'start' && c.k !== 'hang'); C.ok(!cr.length, `${tag}: crash reports: ${cr.slice(0, 3).map(c => c.k + ' ' + c.m + ' @' + c.s).join(' | ')}${last}`);
      } catch (e) { C.ok(false, `${place} seed ${seed}: ${e.message.slice(0, 300)}`); }
      await p.context().close();
    }
  } finally { await b.close(); }
  return C.fails;
}
