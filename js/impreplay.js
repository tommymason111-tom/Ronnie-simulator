// IMPOSTER REPLAY: the best moment of the game, played back at the end before the result. Every game in the room
// records where everyone was (ten times a second: the same poses the room passes round, and your own) and what happened
// (kills, reports, meetings, sabotage, trapdoors). At the end the busiest stretch is picked: a kill counts most, more for
// a double, more again with people about; no kills, the moment the most people were bunched together. It's played
// back in 3D with stand-ins for everyone (moving exactly as they did, through the same smoothing as live play), filmed by
// a camera circling the spot, slowing right down for the kill, with a caption, a REC light and SKIP. Not in VR (the
// result shows straight away there).
import * as THREE from 'three';
import { pushPose } from './net.js';
import { sfx } from './audio.js';

const HZ = 10, KEEP = 300, BEFORE = 6, AFTER = 3.5;
export class ImpReplay {
  constructor(imp) { this.imp = imp; this.g = imp.g; this.net = imp.net; this.frames = []; this.events = []; this.t0 = performance.now(); this.recT = 0; this.playing = null; }
  now() { return (performance.now() - this.t0) / 1000; }
  reset() { this.frames.length = 0; this.events.length = 0; this.t0 = performance.now(); }
  // ---- recording (every frame while the game's on)
  record(dt) {
    if ((this.recT -= dt) > 0) return; this.recT += 1 / HZ; if (this.recT < 0) this.recT = 1 / HZ;
    const t = this.now(), ps = [], pick = (m) => m && Array.isArray(m.h) ? { c: m.c, h: m.h, q: m.q, l: m.l, rh: m.rh, s: m.s, st: m.st, flat: m.flat, fc: m.fc } : null;
    for (const p of this.net.players.values()) { const m = pick(p.pose); if (m) ps.push([p.id, m, p.name || 'Player', p.char || m.c]); }
    let mine = null; try { mine = this.net.lastSent ? pick(JSON.parse(this.net.lastSent)) : null; } catch (e) {}
    if (mine) ps.push([this.net.id, mine, this.net.name || 'You', this.net.char || mine.c]);
    this.frames.push({ t, ps }); while (this.frames.length && t - this.frames[0].t > KEEP) this.frames.shift();
  }
  event(kind, o = {}) { this.events.push({ t: this.now(), kind, ...o }); while (this.events.length > 400) this.events.shift(); }
  // ---- the best moment
  best() {
    const kills = this.events.filter(e => e.kind === 'kill'); if (!this.frames.length) return null;
    const near = (t, at, r) => { const f = this.frameAt(t); return f ? f.ps.filter(([, m]) => Math.hypot(m.h[0] - at[0], m.h[2] - at[1]) < r).length : 0; };
    let best = null;
    for (const k of kills) {
      const s = k.t - BEFORE, e = k.t + AFTER, inWin = this.events.filter(x => x.t >= s && x.t <= e);
      const score = inWin.reduce((a, x) => a + (x.kind === 'kill' ? 10 : x.kind === 'vent' ? 3 : x.kind === 'sab' ? 2 : x.kind === 'report' ? 3 : 1), 0) + near(k.t, k.p, 7) * 1.5;
      if (!best || score > best.score) best = { score, s, e, focus: k.p, kills: inWin.filter(x => x.kind === 'kill'), caption: this.caption(inWin.filter(x => x.kind === 'kill')) };
    }
    if (!best) {      // (nobody died: the moment the most people were together)
      let top = null; for (let i = 0; i < this.frames.length; i += HZ) { const f = this.frames[i]; for (const [, m] of f.ps) { const n = near(f.t, [m.h[0], m.h[2]], 4); if (!top || n > top.n) top = { n, t: f.t, at: [m.h[0], m.h[2]] }; } }
      if (!top) return null; best = { score: top.n, s: top.t - 5, e: top.t + 4, focus: top.at, kills: [], caption: `${top.n} OF YOU, ALL IN ONE PLACE. NOBODY DIED. SOMEHOW.` };
    }
    best.s = Math.max(this.frames[0].t, best.s); best.e = Math.min(this.frames[this.frames.length - 1].t, best.e);
    return best.e - best.s > 1.5 ? best : null;
  }
  caption(kills) {
    if (!kills.length) return ''; const nm = (id) => (this.imp.nameOf(id) || 'Someone').toUpperCase(), where = this.imp.roomNear ? this.imp.roomNear(kills[0].p) : '';
    if (kills.length > 1) return `DOUBLE KILL! ${kills.map(k => nm(k.v)).join(' AND ')} DOWN${where ? ' IN ' + where : ''}`;
    return `${nm(kills[0].k)} GOT ${nm(kills[0].v)}${where ? ' · ' + where : ''}`;
  }
  frameAt(t) { let lo = 0, hi = this.frames.length - 1; if (hi < 0) return null; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (this.frames[mid].t <= t) lo = mid; else hi = mid - 1; } return this.frames[lo]; }
  // ---- playing it
  play(onDone) {
    const b = this.best(), g = this.g;
    if (!b || g.renderer.xr.isPresenting) { onDone && onDone(); return false; }
    // stand-ins for everyone in it (the real ones hidden meanwhile)
    const who = new Map(); for (const f of this.frames) if (f.t >= b.s && f.t <= b.e) for (const [id, m, name, ch] of f.ps) if (!who.has(id)) who.set(id, { id: 'replay-' + id, name, char: ch || m.c || 'ronnie', buf: [] });
    const hidden = []; const hide = (o) => { if (o && o.visible) { o.visible = false; hidden.push(o); } };
    for (const p of this.net.players.values()) if (p.avatar) { hide(p.avatar.c && p.avatar.c.rag && p.avatar.c.rag.group); hide(p.avatar.tag); }
    const sb = g.selfBody && g.selfBody(); if (sb) { hide(sb.c && sb.c.rag && sb.c.rag.group); }
    for (const fp of who.values()) { try { fp.avatar = this.net.makeAvatar(fp); } catch (e) {} }
    const cam = this.cam = new THREE.PerspectiveCamera(55, g.camera.aspect || 1.6, 0.05, 80); const F = new THREE.Vector3(b.focus[0], 1.0, b.focus[1]);
    const ui = this.ui(b); sfx('whoosh', null, 0.6);
    const kills = b.kills.map(k => ({ ...k, done: false }));
    this.playing = { b, who, t: b.s, a0: Math.atan2(g.player.head.x - F.x, g.player.head.z - F.z) + 0.6, F, kills, hidden, ui, onDone, fi: 0, dead: new Set() };
    return true;
  }
  // every frame while it plays (imposter.js update): the clock (slow round a kill), poses in, the camera round
  update(dt) {
    const R = this.playing; if (!R) return false;
    const slow = R.kills.some(k => Math.abs(k.t - R.t) < 1.1) ? 0.35 : 1; R.t += dt * slow;
    for (; R.fi < this.frames.length && this.frames[R.fi].t <= R.t; R.fi++) { const f = this.frames[R.fi]; if (f.t < R.b.s - 0.5) continue;
      for (const [id, m] of f.ps) { const fp = R.who.get(id); if (!fp || R.dead.has(id)) continue; pushPose(fp, { t: 'p', ...m, ts: Math.round(f.t * 1000) }, performance.now()); } }
    for (const [id, fp] of R.who) if (fp.avatar && fp.pose && !R.dead.has(id)) fp.avatar.update(dt * slow, fp.pose);
    for (const k of R.kills) if (!k.done && R.t >= k.t) { k.done = true; const at = new THREE.Vector3(k.p[0], 1.1, k.p[1]); sfx('kill', at, 1); this.g.words.show('💀 KILLED!', at.clone().add({ x: 0, y: 0.6, z: 0 }), '#ff2a2a', 0.3, 1.6);
      const fp = R.who.get(k.v); if (fp && fp.avatar) { const gr = fp.avatar.c && fp.avatar.c.rag && fp.avatar.c.rag.group; if (gr) gr.visible = false; if (fp.avatar.tag) fp.avatar.tag.visible = false; } R.dead.add(k.v); R.ui.flash(); }
    // the camera circles the spot, a bit closer and lower for the kill
    const k = R.kills.length ? Math.max(0, 1 - Math.min(...R.kills.map(x => Math.abs(x.t - R.t))) / 2) : 0, a = R.a0 + (R.t - R.b.s) * 0.32, rad = 5.2 - 1.8 * k, hgt = 2.6 - 0.9 * k;
    this.cam.position.set(R.F.x + Math.sin(a) * rad, hgt, R.F.z + Math.cos(a) * rad); this.cam.lookAt(R.F);
    if (this.cam.aspect !== this.g.camera.aspect) { this.cam.aspect = this.g.camera.aspect; this.cam.updateProjectionMatrix(); }
    R.ui.progress((R.t - R.b.s) / (R.b.e - R.b.s));
    if (R.t >= R.b.e) this.stop();
    return true;
  }
  stop() {
    const R = this.playing; if (!R) return; this.playing = null; this.cam = null;
    for (const fp of R.who.values()) { try { fp.avatar && fp.avatar.dispose(); } catch (e) {} }
    for (const o of R.hidden) o.visible = true;
    R.ui.remove(); const f = R.onDone; f && f();
  }
  // the overlay: letterbox, title, caption, REC, a progress line, SKIP
  ui(b) {
    const el = document.createElement('div'); el.id = 'imp-replay';
    el.innerHTML = `<style>
#imp-replay { position: fixed; inset: 0; z-index: 44; pointer-events: none; font-family: "Arial Black", Arial, sans-serif; }
#imp-replay .bar { position: absolute; left: 0; right: 0; height: 11vh; background: #000; animation: irbar .5s ease-out both; } #imp-replay .bar.t { top: 0; } #imp-replay .bar.b { bottom: 0; transform-origin: bottom; }
@keyframes irbar { from { transform: scaleY(0); } to { transform: scaleY(1); } } #imp-replay .bar.t { transform-origin: top; }
#imp-replay .ttl { position: absolute; top: 2.5vh; left: 50%; transform: translateX(-50%); color: #ffd400; font-size: clamp(18px, 4.5vw, 30px); letter-spacing: 2px; white-space: nowrap; text-shadow: 0 2px 0 #000; animation: irpop .5s cubic-bezier(.3,1.6,.5,1) both .2s; }
#imp-replay .rec { position: absolute; top: 3vh; left: 4vw; color: #fff; font-size: 14px; } #imp-replay .rec i { display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #ff2a2a; margin-right: 6px; vertical-align: -1px; animation: irblink 1s steps(2) infinite; }
@keyframes irblink { 50% { opacity: 0; } } @keyframes irpop { from { transform: translateX(-50%) scale(0.4); opacity: 0; } to { transform: translateX(-50%) scale(1); opacity: 1; } }
#imp-replay .cap { position: absolute; bottom: 3vh; left: 50%; transform: translateX(-50%); max-width: 86vw; text-align: center; color: #fff; font-size: clamp(14px, 3.6vw, 22px); text-shadow: 0 2px 0 #000; }
#imp-replay .prog { position: absolute; bottom: 11vh; left: 0; height: 4px; background: #ff2a2a; width: 0; }
#imp-replay .skip { position: absolute; top: 2.2vh; right: 4vw; pointer-events: auto; font: 900 14px Arial, sans-serif; padding: 8px 14px; border-radius: 10px; border: 2px solid #fff; background: rgba(0,0,0,0.5); color: #fff; cursor: pointer; }
#imp-replay .flash { position: absolute; inset: 0; background: #ff1010; opacity: 0; transition: opacity .5s; }
</style><div class="flash"></div><div class="bar t"></div><div class="bar b"></div><div class="rec"><i></i>REPLAY</div><div class="ttl">🎬 BEST MOMENT</div><button class="skip" type="button">SKIP ▶</button><div class="prog"></div><div class="cap"></div>`;
    el.querySelector('.cap').textContent = b.caption || ''; document.body.appendChild(el);
    el.querySelector('.skip').addEventListener('click', () => this.stop());
    const fl = el.querySelector('.flash'), pr = el.querySelector('.prog');
    return { remove: () => el.remove(), flash: () => { fl.style.transition = 'none'; fl.style.opacity = '0.45'; requestAnimationFrame(() => { fl.style.transition = 'opacity .6s'; fl.style.opacity = '0'; }); }, progress: (k) => { pr.style.width = Math.max(0, Math.min(100, k * 100)) + '%'; } };
  }
}
