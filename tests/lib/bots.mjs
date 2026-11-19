// LIGHT PLAYERS for a full room: a real player as far as the room and everyone else's game can tell (joins over a
// WebSocket through the same pretend networks, sends where it is like the game does: up to 20 times a second, only when
// it's moved, once more when it stops, once a second regardless), walking about, stopping and setting off, turning,
// lifting food to its mouth, like someone on a phone. No game of its own, so a dozen can share a test machine with
// real games: startBot(url, code, { name, char, net }) -> { stop(), sent }.
import WebSocket from 'ws';

export function startBot(url, code, { name, char = 'ethan', net = '' } = {}) {
  const pid = Array.from({ length: 10 }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join('');
  const ws = new WebSocket(`${url}${net ? '/net/' + net : ''}/room/${code}?name=${encodeURIComponent(name)}&pid=${pid}`);
  const st = { sent: 0, got: 0, anchor: null, id: null };
  let t0 = Date.now(), last = '', lastAt = 0, moved = false, timer = null, ang = null, prevT = 0, look = 0;
  const seed = [...name].reduce((a, c) => a + c.charCodeAt(0), 0), R = (k) => Math.sin(seed * 12.9898 + k * 78.233) * 0.5 + 0.5;
  ws.on('message', (d) => { st.got++; let m; try { m = JSON.parse(d.toString()); } catch (e) { return; }
    if (m.t === 'welcome') st.id = m.id;
    if (m.t === 'p' && !st.anchor && Array.isArray(m.h)) st.anchor = { x: m.h[0], z: m.h[2] }; });      // (it walks about near the first player it sees)
  ws.on('open', () => {
    timer = setInterval(() => {
      if (!st.anchor || ws.readyState !== 1) return;
      const t = (Date.now() - t0) / 1000, cyc = (t + R(1) * 5) % 5;      // (walks for 3s, stands for 2s, again and again)
      // (round a circle while walking; standing still, it looks about a little: everything continuous, nothing jumps)
      const walking = cyc < 3, dt = Math.min(0.2, t - prevT); prevT = t; if (ang == null) ang = R(2) * 6.28; if (walking) ang += 0.5 * dt;
      look += ((walking ? 0 : 0.6 * Math.sin(t)) - look) * Math.min(1, dt * 3);
      const a = ang, rad = 1.5 + R(3) * 2.5, hx = st.anchor.x + Math.cos(a) * rad, hz = st.anchor.z + Math.sin(a) * rad, yaw = -a + look;
      const qy = Math.sin(yaw / 2), qw = Math.cos(yaw / 2), fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const eat = !walking && cyc > 3.6 && cyc < 4.4, k = eat ? Math.sin((cyc - 3.6) / 0.8 * Math.PI) : 0;
      const r3 = (v) => Math.round(v * 1000) / 1000, r2 = (v) => Math.round(v * 100) / 100;
      const hand = [hx + fx * (0.4 - 0.25 * k) + rx * (0.18 - 0.1 * k), 1.62 - 0.21 + 0.13 * k, hz + fz * (0.4 - 0.25 * k) + rz * (0.18 - 0.1 * k)];
      const m = { t: 'p', c: char, h: [r3(hx), 1.62, r3(hz)], q: [0, r2(qy), 0, r2(qw)], l: [r3(hx), 1.62, r3(hz)], rh: hand.map(r3), s: 1, st: 0, flat: 1 };
      const key = JSON.stringify(m), now = Date.now(), changed = key !== last;
      if (changed || moved || now - lastAt > 1000) { moved = changed; last = key; lastAt = now; m.ts = Math.round(now - t0 + 1e6); ws.send(JSON.stringify(m)); st.sent++; }
    }, 50);
  });
  ws.on('error', () => {});
  return { st, stop: () => { clearInterval(timer); try { ws.close(); } catch (e) {} } };
}
