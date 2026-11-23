// CRASH REPORTS. Loaded before anything else, so it sees everything that goes wrong on players' devices:
//   error     an uncaught error              promise   a failed promise nobody caught
//   frame     an error the game caught to keep running (one bad frame mustn't stop the game, but it's still a bug)
//   context   the 3D graphics were lost      hang      the game stopped for 6s+ while on screen
//   killed    the last session ended without the page closing: the phone or headset killed it (out of memory: an
//             iPhone's "A problem repeatedly occurred"), found on the next load
// Each different problem is sent once per session, to the game's server (/crash), grouped there by error. A report is
// the error and where in the code, the game's version, the kind of device, the place and mode, VR or not, how many
// players, and memory. Never names, chat or anything typed.
(function () {
  'use strict';
  var Q = (function () { try { return new URLSearchParams(location.search); } catch (e) { return null; } })();
  var API = (Q && Q.get('crash')) || 'https://ronnie-mp12.ronnie-sim.workers.dev/crash';
  var started = Date.now(), sent = {}, nSent = 0, crashed = false, MAX = 20, seen = typeof WeakSet === 'function' ? new WeakSet() : null;
  var ua = navigator.userAgent || '';
  var device = /OculusBrowser|Quest/i.test(ua) ? 'quest' : /iPhone/.test(ua) ? 'iphone' : /iPad|Macintosh.*Mobile/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'ipad'
    : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'android' : 'android-tablet') : /Windows/.test(ua) ? 'windows' : /Macintosh/.test(ua) ? 'mac' : /Linux/.test(ua) ? 'linux' : 'other';
  var browser = /OculusBrowser/.test(ua) ? 'quest-browser' : /CriOS|Chrome\//.test(ua) && !/Edg\//.test(ua) ? 'chrome' : /Edg\//.test(ua) ? 'edge' : /Firefox|FxiOS/.test(ua) ? 'firefox' : /Safari/.test(ua) ? 'safari' : 'other';
  function where() {
    var R = window.RS, o = { p: null, md: null, vr: false, mp: 0 };
    try { if (R) { o.p = R.room && R.room.placeId || null; o.md = R.director && (R.director.fullMode || R.director.mode) || null; o.vr = !!(R.renderer && R.renderer.xr && R.renderer.xr.isPresenting); o.mp = R.net && R.net.connected ? R.net.players.size + 1 : 0; } } catch (e) {}
    try { if (!R && window.ronnieHero && window.ronnieHero.inVR) o.vr = true; } catch (e) {}
    return o;
  }
  function mem() { try { return performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null; } catch (e) { return null; } }
  // the stack, trimmed to the game's own files (file:line), no web addresses or query strings
  function stack(err) {
    var s = (err && err.stack) ? String(err.stack) : ''; var out = [];
    s.split('\n').forEach(function (l) { var m = l.match(/([\w.-]+\.m?js)(?:\?[^:]*)?:(\d+)(?::\d+)?/); if (m && out.length < 6) out.push(m[1] + ':' + m[2]); });
    return out.join(' < ');
  }
  function send(k, msg, st, extra) {
    msg = String(msg || '').slice(0, 220); var key = k + '|' + msg + '|' + (st || '').split(' < ')[0];
    if (sent[key] || nSent >= MAX) return; sent[key] = 1; nSent++;
    var w = where(), body = { k: k, m: msg, s: st || '', v: window.GAME_BUILD || '?', d: device, b: browser, p: w.p, md: w.md, vr: w.vr, mp: w.mp, t: Math.round((Date.now() - started) / 1000), mem: mem(), f: crashed ? 0 : 1 };
    if (k !== 'start') crashed = true;
    /* (the last real problem, kept on this device: the title screen shows it after the game closed on you) */
    if (k !== 'start' && k !== 'hang') { try { localStorage.setItem('rs_lasterr', JSON.stringify({ at: Date.now(), k: k, m: msg, s: (st || '').split(' < ').slice(0, 3).join(' < '), p: w.p, md: w.md, v: window.GAME_BUILD })); } catch (e) {} }
    if (extra) for (var x in extra) body[x] = extra[x];
    var json = JSON.stringify(body);
    try { if (navigator.sendBeacon && navigator.sendBeacon(API, json)) return; } catch (e) {}
    try { fetch(API, { method: 'POST', body: json, mode: 'no-cors', keepalive: true }).catch(function () {}); } catch (e) {}
  }
  window.__crash = function (k, err, extra) { try { if (seen && err && typeof err === 'object') { if (seen.has(err)) return; seen.add(err); } send(k, err && err.message ? err.message : String(err), stack(err), extra); } catch (e) {} };
  // errors the game caught and logged so it could carry on (console.error / console.warn with an Error in it)
  ['error', 'warn'].forEach(function (lvl) { var o = console[lvl]; if (!o) return; console[lvl] = function () {
    try { for (var i = 0; i < arguments.length; i++) { var a = arguments[i]; if (a instanceof Error) { if (seen) { if (seen.has(a)) break; seen.add(a); } var label = typeof arguments[0] === 'string' ? arguments[0] + ': ' : ''; send('caught', label + a.message, stack(a)); break; } } } catch (e) {}
    return o.apply(console, arguments); }; });
  window.addEventListener('error', function (e) {
    if (e && e.target && e.target !== window && (e.target.src || e.target.href)) return;      // (a file that didn't load: not a crash of ours)
    var err = e && e.error; send('error', (err && err.message) || (e && e.message) || 'error', stack(err) || ((e && e.filename ? String(e.filename).split('/').pop().split('?')[0] : '') + ':' + (e && e.lineno || 0)));
  });
  window.addEventListener('unhandledrejection', function (e) { var r = e && e.reason; send('promise', (r && r.message) || String(r), stack(r)); });
  window.addEventListener('webglcontextlost', function (e) { var c = e.target; send('context', 'WebGL context lost', '', { cw: c && c.width, ch: c && c.height }); }, true);
  // a session that was killed: this page sets a marker while it runs, and takes it away when it closes properly (or
  // goes into the background, where the system's allowed to drop it). Still there on the next load: it was killed
  var RUN = 'rs_run';
  try {
    var prev = JSON.parse(localStorage.getItem(RUN) || 'null');
    if (prev && !prev.bg && Date.now() - prev.last < 30 * 60 * 1000) { try { localStorage.setItem('rs_lastkill', JSON.stringify({ at: prev.last, st: prev.st || '', p: prev.p, md: prev.md, mp: prev.mp, fk: prev.fk || 0, mem: prev.mem, v: prev.v })); } catch (e) {} }
    if (prev && !prev.bg && Date.now() - prev.last < 30 * 60 * 1000) setTimeout(function () { send('killed', 'session ended without closing (killed by the device?)' + (prev.st ? ' during: ' + prev.st : '') + (prev.fk ? ' (' + prev.fk + ' fake players)' : ''), '', { v: prev.v, p: prev.p, md: prev.md, vr: prev.vr, mp: prev.mp, mem: prev.mem, t: Math.round((prev.last - prev.t0) / 1000) }); }, 3000);
  } catch (e) {}
  var t0 = Date.now(), lastTick = Date.now(), readyAt = 0;
  function beat(bg) { try { var w = where(), f = window.__fakes && window.__fakes.bots ? window.__fakes.bots.length : 0; localStorage.setItem(RUN, JSON.stringify({ v: window.GAME_BUILD, t0: t0, last: Date.now(), p: w.p, md: w.md, vr: w.vr, mp: w.mp, mem: mem(), bg: !!bg, st: String(window.__crashStep || '').slice(0, 40), fk: f })); } catch (e) {} }
  // (what the game was doing: window.__crashStep, set as it goes (the menu screen, each loading step, playing). A killed
  // session's report says it, and so does the test room's bar on the next load (rs_lastkill), for whoever's testing)
  window.__crashBeat = function () { if (document.visibilityState === 'visible') beat(false); };
  beat(false);
  setInterval(function () {
    var now = Date.now(), gap = now - lastTick; lastTick = now;
    // (stopped for 6s+ while on screen: a freeze. Not in the background: that's the browser pausing us, as it should)
    // (and not while it's loading, or in the first 15s of a game, while the graphics card gets its shaders ready)
    var ready = document.body && document.body.classList.contains('ready'); if (ready && !readyAt) readyAt = now; if (!ready) readyAt = 0;
    if (gap > 6000 && document.visibilityState === 'visible' && !document.hidden && readyAt && now - readyAt > 15000) send('hang', 'game stopped for ' + Math.round(gap / 1000) + 's', '');
    if (document.visibilityState === 'visible') beat(false);
  }, 1000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') beat(true); else { lastTick = Date.now(); beat(false); } });
  window.addEventListener('pagehide', function () { try { localStorage.removeItem(RUN); } catch (e) {} });
  // one "start" a session, so the server can work out how many sessions had no problems at all
  setTimeout(function () { send('start', 'session', ''); }, 4000);
})();
