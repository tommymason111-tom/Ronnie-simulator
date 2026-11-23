// READY CHECK (multiplayer): before any game mode starts in a room (the host picking GAME MODE, RESTART ROUND, PLAY
// AGAIN), everyone gets a card: what's next, who's ready and who isn't. Each player taps I'M READY; the host's START
// only works once everyone is. The game carries on behind the card until the host starts it.
// Messages: the host's 'rcheck' (open the card: k, the check's id, and the mode), a player's 'rready' (r: 1/0),
// the host's 'rstat' (who's ready), the host's 'rdone' (started or called off: the card goes).
export function createReadyCheck({ net, start, modeName, inVR, portrait }) {
  let cur = null;      // { k, mode, ready: Set (host only), list (everyone) }
  const css = document.createElement('style'); css.textContent = `
#rc-card { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 47; width: min(380px, calc(100vw - 24px)); max-height: calc(100vh - 24px); max-height: calc(100dvh - 24px); overflow-y: auto; display: none; box-sizing: border-box; background: #101a5c; border: 4px solid #ffd400; border-radius: 22px; padding: 14px 14px 12px; color: #fff; text-align: center; box-shadow: 0 14px 40px rgba(0,0,0,0.7); animation: rcin .16s ease-out; }
#rc-card.on { display: block; } @keyframes rcin { from { opacity: 0; transform: translate(-50%, -46%); } }
#rc-card .rc-k { font: 900 11px Arial, sans-serif; letter-spacing: 1px; color: #c9d3ff; }
#rc-card h3 { margin: 2px 0 2px; font: 900 22px "Arial Black", Arial, sans-serif; color: #ffd400; }
#rc-card .rc-sum { margin: 0 0 8px; font: 800 13px Arial, sans-serif; color: #ffb37a; } #rc-card .rc-sum.all { color: #39ff14; }
#rc-card .rc-list { display: flex; flex-direction: column; gap: 5px; text-align: left; margin-bottom: 10px; max-height: 40vh; overflow-y: auto; }
#rc-card .rc-p { display: flex; align-items: center; gap: 8px; padding: 6px 9px; border-radius: 11px; background: rgba(255,255,255,0.07); font: 800 13px Arial, sans-serif; }
#rc-card .rc-p img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; background: #222; }
#rc-card .rc-p .st { margin-left: auto; font: 900 11px Arial, sans-serif; padding: 3px 8px; border-radius: 8px; }
#rc-card .rc-p.ok .st { background: #39ff14; color: #111; } #rc-card .rc-p.no .st { background: #ff8a3d; color: #111; }
#rc-card button { display: block; width: 100%; margin: 6px 0 0; font: 900 18px "Arial Black", Arial, sans-serif; padding: 12px; border-radius: 14px; border: 0; cursor: pointer; }
#rc-card .rc-ready { background: #ffd400; color: #111; box-shadow: 0 4px 0 #8a6d00; } #rc-card .rc-ready.on { background: #39ff14; box-shadow: 0 4px 0 #1d8a0a; }
#rc-card .rc-go { background: #39ff14; color: #111; box-shadow: 0 4px 0 #1d8a0a; } #rc-card .rc-go:disabled { background: #5a6080; color: #dfe4ff; box-shadow: 0 4px 0 #2a2f4a; cursor: default; }
#rc-card .rc-x { background: rgba(255,255,255,0.12); color: #fff; font-size: 14px; padding: 9px; border: 2px solid rgba(255,255,255,0.5); }
body.paused #rc-card { display: none !important; }`;
  document.head.appendChild(css);
  const el = document.createElement('div'); el.id = 'rc-card'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Ready up'); document.body.appendChild(el);
  const fromHost = (p) => !!p && (p.host || (net.hostId != null && String(p.id) === String(net.hostId)));
  const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');      // (escaped, not dropped: SEARCH & DESTROY kept its &)
  // (only who's in the game: someone back in the lobby (or still loading) has no card to tap, and START waited for them for
  // ever. They come into the new game from the lobby once it's started)
  const inGame = (p) => p.host || (p.at && performance.now() - p.at < 4000);
  const people = () => [{ id: net.id, name: net.name || 'You', char: net.char, me: true, host: !!net.host }, ...[...net.players.values()].filter(inGame).map(p => ({ id: p.id, name: p.name, char: p.char, host: !!p.host }))];
  let shown = '';
  setInterval(() => { if (cur && people().map(p => p.id).join() !== shown) draw(); }, 1000);
  const draw = () => {
    if (!cur) { el.classList.remove('on'); return; }
    const host = !!net.host, ps = people(), rd = new Set(cur.list || []), isR = (p) => p.host || rd.has(p.id);
    const waiting = ps.filter(p => !isR(p)), mine = rd.has(net.id); shown = ps.map(p => p.id).join();
    el.innerHTML = `<div class="rc-k">${host ? 'YOU\'RE STARTING' : 'THE HOST IS STARTING'}</div><h3>${esc(modeName(cur.mode))}</h3>
      <p class="rc-sum${waiting.length ? '' : ' all'}">${waiting.length ? `Waiting for ${waiting.length} to ready up` : 'Everyone\'s ready!'}</p>
      <div class="rc-list">${ps.sort((a, b) => (isR(a) ? 1 : 0) - (isR(b) ? 1 : 0)).map(p => `<div class="rc-p ${isR(p) ? 'ok' : 'no'}"><img src="${portrait(p.char)}" alt="">${esc(p.name)}${p.me ? ' (YOU)' : ''}<span class="st">${p.host ? '👑 HOST' : isR(p) ? '✓ READY' : '⏳ NOT READY'}</span></div>`).join('')}</div>
      ${host ? `<button class="rc-go" type="button"${waiting.length ? ' disabled' : ''}>${waiting.length ? `⏳ WAITING FOR ${waiting.length}` : '▶ START'}</button><button class="rc-x" type="button">CANCEL</button>`
        : `<button class="rc-ready${mine ? ' on' : ''}" type="button">${mine ? '✅ READY! (TAP TO UNDO)' : '✋ I\'M READY'}</button>`}`;
    el.classList.add('on');
  };
  el.addEventListener('click', (e) => {
    if (!cur) return;
    if (e.target.closest('.rc-ready')) { const on = !(cur.list || []).includes(net.id); cur.list = on ? [...(cur.list || []), net.id] : (cur.list || []).filter(i => i !== net.id); net.send({ t: 'rready', k: cur.k, r: on ? 1 : 0 }); draw(); }
    else if (e.target.closest('.rc-go') && net.host && !e.target.closest('.rc-go').disabled) go();
    else if (e.target.closest('.rc-x') && net.host) { net.send({ t: 'rdone', k: cur.k }); cur = null; draw(); }
  });
  const stat = () => { if (!cur || !net.host) return; cur.list = [...cur.ready].filter(id => net.players.has(id)); net.send({ t: 'rstat', k: cur.k, ready: cur.list }); draw(); };
  const go = () => { if (!cur) return; const mode = cur.mode; net.send({ t: 'rdone', k: cur.k }); cur = null; draw(); start(mode); };
  // the host: open a check for this mode (or start straight away when nobody else is in the room)
  const begin = (mode) => {
    if (!net.connected || !net.host || net.players.size === 0) { start(mode); return; }
    cur = { k: Math.random().toString(36).slice(2, 8), mode, ready: new Set(), list: [] };
    net.send({ t: 'rcheck', k: cur.k, mode }); draw();
  };
  net.on.rcheck = (m, p) => { if (!fromHost(p) || typeof m.k !== 'string' || typeof m.mode !== 'string') return;
    cur = { k: m.k, mode: m.mode, list: [] }; draw();
    if (inVR()) setTimeout(() => { if (cur && cur.k === m.k) { cur.list = [net.id]; net.send({ t: 'rready', k: m.k, r: 1 }); draw(); } }, 800);      // (in the headset there's no card to tap: you're ready)
  };
  net.on.rready = (m, p) => { if (!net.host || !cur || !p || m.k !== cur.k) return; if (m.r) cur.ready.add(p.id); else cur.ready.delete(p.id); stat(); };
  net.on.rstat = (m, p) => { if (!fromHost(p) || !cur || m.k !== cur.k || !Array.isArray(m.ready)) return; cur.list = m.ready.filter(x => typeof x === 'string' || typeof x === 'number'); draw(); };
  net.on.rdone = (m, p) => { if (!fromHost(p) || !cur || m.k !== cur.k) return; cur = null; draw(); };
  // a game that's only just loaded asks if there's a check on: someone who joined while the card was up was still in the
  // menus when it was sent, never got it, and the host's START waited for them for ever
  net.on.rask = (m, p) => { if (cur && net.host && p && p.id != null) { net.send({ t: 'rcheck', to: p.id, k: cur.k, mode: cur.mode }); setTimeout(stat, 300); } };
  if (net.connected && !net.host) net.send({ t: 'rask' });
  return {
    begin, get active() { return !!cur; },
    // someone joined or left mid-check: the host keeps everyone's card right (and gives the newcomer one)
    joined(id) { if (cur && net.host && id) { net.send({ t: 'rcheck', to: id, k: cur.k, mode: cur.mode }); setTimeout(stat, 300); } },
    left() { if (cur && net.host) stat(); else draw(); },
    becameHost() { if (cur && !cur.ready) { cur.ready = new Set(cur.list || []); stat(); } },
    cancel() { cur = null; draw(); },
  };
}
