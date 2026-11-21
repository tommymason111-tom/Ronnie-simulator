// YOUR OWN EMOTE'S CAMERA (phone / computer, in a room): it swings round to IN FRONT of your character, whichever way you
// were looking: straight down at food, up at the ceiling, level, in four directions. (Your facing used to come from
// your look direction, which went wild looking down or up, so the camera ended up round the side or behind you.)
// Also: you keep facing the same way while the emote plays, and the camera goes back to your eyes after.
import { launch, newPage, sleep, checker } from './lib/game.mjs';
import { startRoomHost } from './lib/roomhost.mjs';

export default async function () {
  const C = checker('emotecam'), host = await startRoomHost(), b = await launch();
  try {
    const H = await newPage(b, { width: 390, height: 844, mobile: true });
    const ev = (f, a) => H.evaluate(f, a), cl = (s) => ev((s) => document.querySelector(s).click(), s);
    await H.goto('http://game.local/index.html?x=1&relay=' + encodeURIComponent(host.url), { timeout: 120000, waitUntil: 'domcontentloaded' }); await sleep(2000);
    await cl('.playbtn'); await sleep(300); await cl('#pick-multi'); await sleep(300);
    await ev(() => { document.querySelector('#mp-myname').value = 'EMOTY'; document.querySelector('#char-grid .mate[data-id="lewis"]').click(); }); await cl('#char-next'); await sleep(300);
    await cl('#mp-host2'); await H.waitForFunction(() => window.ronnieMP && ronnieMP.net && ronnieMP.net.status === 'on', null, { timeout: 30000 });
    await cl('#room-go'); await sleep(400); await ev(() => document.querySelector('.scene[data-id="garden"]').click()); await sleep(300);
    await ev(() => document.querySelector('.screen[data-s="place"] .bigbtn').click()); await sleep(500);
    await ev(() => { const f = document.querySelector('.flip[data-id="roam"]'); f && f.click(); const solo = [...document.querySelectorAll('.flip[data-id="roam"] [data-pp]')].find(b => /NOBODY|JUST|ALONE|EMPTY/i.test(b.textContent)); solo && solo.click(); document.querySelector('.screen[data-s="mode"] .bigbtn').click(); }); await sleep(500); await cl('#go');
    await H.waitForFunction(() => window.RS && document.body.classList.contains('ready'), null, { timeout: 180000 });
    await ev(() => document.getElementById('play-flat').click()); await sleep(2000);
    await H.waitForFunction(() => !!RS.selfBody(), null, { timeout: 20000 }).catch(() => {});
    await ev(() => RS.renderer.setAnimationLoop(null));
    const res = [];
    for (const pitch of [-1.45, -0.2, 1.2]) for (const yaw of [0, 1.6, 3.1, -1.6]) {
      const r = await ev(([pitch, yaw]) => { const P = RS.player; P.flatYaw = yaw; P.flatPitch = pitch; RS.sim(1.2, 1 / 30);
        const sb = RS.selfBody(); if (!sb) return { none: true };
        RS.mp.emoteCool = 0; RS.mp.emote('griddy'); let c = null; for (let i = 0; i < 45; i++) { RS.sim(1 / 30, 1 / 30); c = RS.emoteCamAt(); }      // (frame by frame, drawn each time, as the game does)
        const yaw0 = sb.yaw; for (let i = 0; i < 24; i++) { RS.sim(1 / 30, 1 / 30); RS.emoteCamAt(); } const yaw1 = sb.yaw;
        const r0 = sb.c.rag.root, e = new RS.THREE.Euler().setFromQuaternion(P.camera.getWorldQuaternion(new RS.THREE.Quaternion()), 'YXZ'), fx = -Math.sin(e.y), fz = -Math.cos(e.y);      // (the way you were facing: the camera's real heading in the world)
        if (!c) return { noCam: true };
        const dx = c[0] - r0.x, dz = c[2] - r0.z, d = Math.hypot(dx, dz) || 1, ang = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / d))) * 180 / Math.PI;
        for (let i = 0; i < 400 && sb.emote && sb.emote.active; i++) { RS.sim(1 / 30, 1 / 30); RS.emoteCamAt(); } RS.sim(0.5, 1 / 30); const after = RS.emoteCamAt();
        const bf = sb.fwd(), angBody = Math.round(Math.acos(Math.max(-1, Math.min(1, (dx * bf.x + dz * bf.z) / d))) * 180 / Math.PI), bodyVsCam = Math.round(Math.acos(Math.max(-1, Math.min(1, bf.x * fx + bf.z * fz))) * 180 / Math.PI);
        return { pitch, yaw, ang: Math.round(ang), angBody, bodyVsCam, turned: Math.round(Math.abs(yaw1 - yaw0) * 180 / Math.PI), back: after === null, dist: +d.toFixed(2) }; }, [pitch, yaw]);
      res.push(r);
    }
    console.log('  ' + res.map(r => JSON.stringify(r)).join('\n  '));
    for (const r of res) {
      C.ok(!r.none && !r.noCam, `no emote camera: ${JSON.stringify(r)}`);
      C.ok(r.angBody <= 75, `looking ${r.pitch < -1 ? 'down' : r.pitch > 1 ? 'up' : 'level'} (yaw ${r.yaw}): the emote camera is ${r.angBody}° round from in front of your character (want straight in front; something in the way can push it a little round)`);
      C.ok(r.turned <= 3, `you turned ${r.turned}° during the emote (you should stay facing where you were)`);
      C.ok(r.back, 'the camera didn\'t come back to your eyes after the emote');
    }
    C.ok(!H.errors.length, 'page errors: ' + [...new Set(H.errors)].slice(0, 3).join(' | '));
  } finally { await b.close(); await host.close(); }
  return C.fails;
}
