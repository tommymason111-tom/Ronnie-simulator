// VR regressions:
//   - a VR player's arm stays on their body at every headset frame rate (the physics fed back on itself once and swung
//     arms metres either side of the body: ragdoll.js animate / reachArm)
//   - a VR menu tap only ever lands on something drawn on that menu (the 3D Ronnie canvas, and developer mode's DEV
//     button, took taps meant for PLAY and the pause menu: vrdom.js target)
//   - a page that's briefly 0x0 doesn't break the menu picture (vrdom.js shoot)
import { launch, newPage, startGame, checker } from './lib/game.mjs';

export default async function () {
  const C = checker('vr'), b = await launch();
  try {
    const p = await newPage(b, { width: 640, height: 400 });
    await startGame(p, { place: 'grid', mode: 'roam', dev: true });
    const arms = await p.evaluate(async () => { RS.renderer.setAnimationLoop(null); const out = {};
      for (const [hz, flat] of [[60, 0], [72, 0], [90, 0], [120, 0], [72, 1]]) {
        const av = RS.net.makeAvatar({ char: 'lewis', name: 'T' }); await new Promise(r => setTimeout(r, 1200));
        const r = av.c.rag, P = RS.player, x = P.head.x + 2, z = P.head.z; let worst = 0;
        for (let i = 0; i < hz * 2; i++) { const t = i / hz; av.update(1 / hz, { h: [x, 1.62, z], q: [0, 0, 0, 1], flat, rh: [x + 0.22 + 0.1 * Math.sin(t * 4), 1.17, z - 0.25], l: [x - 0.22, 1.17, z - 0.25], s: 1, st: 0 }); RS.physics.step(1 / hz);
          const a = r.parts.lArmR.body.position, hd = r.parts.head.body.position; if (i > hz / 2) worst = Math.max(worst, Math.hypot(a.x - hd.x, a.y - hd.y, a.z - hd.z)); }
        out[(flat ? 'phone ' : 'vr ') + hz] = +worst.toFixed(2); av.dispose(); }
      return out; });
    for (const [k, d] of Object.entries(arms)) C.ok(d < 0.9, `${k}fps: forearm got ${d}m from the head (arm flying off the body)`);
    // the menu panel: a tap goes only to things inside the menu it shows
    const taps = await p.evaluate(async () => {
      const { DomPanel } = await import('./js/vrdom.js');
      const box = document.createElement('div'); box.id = 'tbox'; box.style.cssText = 'position:fixed;left:100px;top:100px;width:300px;height:200px;background:#123;z-index:50';
      const btn = document.createElement('button'); btn.id = 'tbtn'; btn.textContent = 'PRESS'; btn.style.cssText = 'position:absolute;left:20px;top:20px;width:120px;height:60px'; box.appendChild(btn);
      const over = document.createElement('button'); over.id = 'tover'; over.style.cssText = 'position:fixed;left:110px;top:110px;width:60px;height:40px;z-index:99'; document.body.append(box, over);
      const cv = document.createElement('canvas'); cv.dataset.hero = '1'; cv.style.cssText = 'position:absolute;left:30px;top:30px;width:40px;height:40px;z-index:5'; btn.appendChild(cv);
      const P = new DomPanel(RS.scene, { skip: 'canvas[data-hero]' }); P.show(() => box);
      const r = { overButton: P.target({ x: 120, y: 120 }), heroCanvas: P.target({ x: 145, y: 145 }), outside: P.target({ x: 50, y: 50 }) };
      const res = { overButton: r.overButton && (r.overButton.id || r.overButton.tagName), heroCanvas: r.heroCanvas && (r.heroCanvas.id || r.heroCanvas.tagName), outside: r.outside && (r.outside.id || r.outside.tagName) };
      // an empty 0x0 page mustn't break the picture
      box.style.width = '0px'; box.style.height = '0px'; let threw = null; try { await P.shoot(); P.compose(); } catch (e) { threw = e.message; }
      res.zeroThrew = threw; res.cvOk = P.cv.width > 0 && P.cv.height > 0;
      P.dispose(); box.remove(); over.remove(); return res; });
    C.ok(taps.overButton === 'tbtn', `a button floating over the menu took the tap (got ${taps.overButton})`);
    C.ok(taps.heroCanvas === 'tbtn', `a skipped canvas took the tap (got ${taps.heroCanvas})`);
    C.ok(!taps.outside, `a tap outside the menu landed on ${taps.outside}`);
    C.ok(!taps.zeroThrew && taps.cvOk, `a 0x0 menu page broke the panel: ${taps.zeroThrew}`);
    C.ok(!p.errors.length, 'page errors: ' + p.errors.slice(0, 3).join(' | '));
  } finally { await b.close(); }
  return C.fails;
}
