// TVs: tap a telly (poke it in VR) to put a video on it. Videos come from the device: add them once (ADD VIDEOS,
// on a phone or the Quest's normal browser before going into VR - a file picker can't open inside VR) and they're
// kept on that device. One TV plays at a time, with its sound coming from the telly. In multiplayer only the host
// chooses; everyone sees it (the video's sent to the others through the room, like the music, if it isn't too big).
import * as THREE from 'three';
import { initAudio, musicBus } from './audio.js';

const DB = (() => { let p = null; return () => p || (p = new Promise((res, rej) => { const r = indexedDB.open('ronnie-video', 1); r.onupgradeneeded = () => { r.result.createObjectStore('v'); r.result.createObjectStore('meta'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); })();
const tx = async (store, mode, fn) => { const db = await DB(); return new Promise((res, rej) => { const t = db.transaction(store, mode), r = fn(t.objectStore(store)); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); };
const put = (k, blob, meta) => Promise.all([tx('v', 'readwrite', s => s.put(blob, k)), tx('meta', 'readwrite', s => s.put(meta, k))]);
const get = (k) => tx('v', 'readonly', s => s.get(k));
const metas = async () => { const db = await DB(); return new Promise((res) => { const out = [], c = db.transaction('meta', 'readonly').objectStore('meta').openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out.push(cur.value); cur.continue(); } else res(out); }; c.onerror = () => res(out); }); };
const SHARE_MAX = 80 * 1024 * 1024;       // bigger videos only play on the host's own screen
const nameOf = (f) => f.replace(/\.[a-z0-9]+$/i, '').replace(/[_]+/g, ' ').replace(/\s+-\s+[^-]*(VEVO|Official|Records|TV)$/i, '').trim().slice(0, 48) || 'Video';
const keyOf = (f, size) => 'v' + f.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) + (size || 0).toString(36);

export class TVs {
  constructor({ scene, room, net, player, hint, ui }) {
    Object.assign(this, { scene, room, net, player, hint, ui });
    this.screens = [];
    for (const t of room.tvs || []) this.screens.push({ mesh: t.label, c: t.c, n: t.n, u: t.u, w: t.w, h: t.h, src: t });
    scene.traverse(o => { const d = o.userData && o.userData.tv; if (!d) return; const ry = o.rotation.y;
      this.screens.push({ mesh: o, c: o.position.clone(), n: new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry)), u: new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry)), w: d.w, h: d.h }); });
    this.state = { tv: -1, key: null, playing: false, vol: 0.8, pos: 0 };
    this.have = new Map(); this.incoming = new Map(); this.sel = -1;
    this.el = document.createElement('video'); this.el.loop = true; this.el.playsInline = true; this.el.setAttribute('playsinline', ''); this.el.crossOrigin = 'anonymous'; this.el.preload = 'auto';
    this.tex = new THREE.VideoTexture(this.el); this.tex.colorSpace = THREE.SRGBColorSpace;
    metas().then(ms => { for (const m of ms) this.have.set(m.key, m); this.render(); }).catch(() => {});
    for (const k of ['tv', 'vidreq', 'vidpart']) { const prev = net.on[k]; net.on[k] = (m, p) => { prev && prev(m, p); this['on_' + k](m, p); }; }
    this.bindUI();
  }
  get isGuest() { return !!(this.net.connected && !this.net.host); }
  ok(i) { const s = this.screens[i]; return s && !(s.src && s.src.broken); }

  // ------------------------------------------------------------------ finding the telly you tapped / poked
  hitTV(ray, reach) {
    let best = -1, bd = Infinity;
    this.screens.forEach((s, i) => { if (!this.ok(i)) return; const den = ray.direction.dot(s.n); if (den > -0.05) return;
      const t = new THREE.Vector3().subVectors(s.c, ray.origin).dot(s.n) / den; if (t <= 0 || t > bd) return;
      const p = ray.origin.clone().addScaledVector(ray.direction, t).sub(s.c); if (Math.abs(p.dot(s.u)) < s.w / 2 && Math.abs(p.y) < s.h / 2) { best = i; bd = t; } });
    if (best < 0) return false;
    if (bd > reach + 2.5) { this.hint('Walk up to the TV to put a video on'); return true; }
    this.open(best); return true;
  }
  open(i) { this.sel = i; this.ui.open(); this.render(); }

  update(dt) {
    if (this.player.flatMode) return;
    if ((this.pokeCool -= dt) > 0) return;
    for (const h of this.player.hands || []) { if (!h.tracked || !h.palm) continue;
      for (let i = 0; i < this.screens.length; i++) { if (!this.ok(i)) continue; const s = this.screens[i], off = h.palm.clone().sub(s.c), d = off.dot(s.n);
        if (d > -0.02 && d < 0.08 && Math.abs(off.dot(s.u)) < s.w / 2 && Math.abs(off.y) < s.h / 2) { this.pokeCool = 1.5; this.open(i); return; } } }
  }

  // ------------------------------------------------------------------ playing
  guard() { if (this.isGuest) { this.ui.say('🔒 Only the host can change the TV'); this.hint('Only the host can change the TV'); return false; } return true; }
  async choose(key) {
    if (!this.guard()) return; initAudio();
    const tv = this.sel >= 0 ? this.sel : this.state.tv; if (tv < 0) { this.ui.say('Tap a TV first'); return; }
    if (this.state.key === key && this.state.tv === tv) return this.toggle();
    this.state = { ...this.state, tv, key, playing: true, pos: 0 };
    await this.apply(true); this.send(); this.render();
  }
  toggle() { if (!this.guard() || !this.state.key) return; this.state.playing = !this.state.playing; this.state.pos = this.el.currentTime || 0; this.level(); if (this.state.playing) this.el.play().catch(() => {}); else setTimeout(() => { if (!this.state.playing) this.el.pause(); }, 30); this.send(); this.render(); }
  stop() { if (!this.guard()) return; this.state = { ...this.state, key: null, playing: false, tv: -1 }; this.apply(); this.send(); this.render(); }
  volume(d) { if (!this.guard()) return; this.state.vol = Math.max(0, Math.min(1, Math.round((this.state.vol + d) * 10) / 10)); this.apply(); this.send(); this.render(); }
  send() { if (this.net.connected && this.net.host) this.net.send({ t: 'tv', tv: this.state.tv, key: this.state.key, playing: this.state.playing ? 1 : 0, vol: this.state.vol, pos: Math.round((this.el.currentTime || 0) * 10) / 10 }); }

  showOn(i) {
    for (const [j, s] of this.screens.entries()) {
      const m = s.mesh.material; if (!m) continue;
      if (j === i) { if (!s.orig) s.orig = m.map; m.map = this.tex; m.color && m.color.setHex(0xffffff); m.needsUpdate = true; }
      else if (s.orig && m.map === this.tex) { m.map = s.orig; m.needsUpdate = true; }
    }
  }
  async apply(restart = false) {
    const st = this.state;
    if (!st.key || st.tv < 0 || !this.ok(st.tv)) { this.el.pause(); this.showOn(-1); this.loaded = null; return; }
    if (this.loaded !== st.key) {
      const blob = await get(st.key).catch(() => null);
      if (!blob) { this.showOn(-1); if (this.isGuest) this.request(st.key); return; }
      if (this.url) URL.revokeObjectURL(this.url); this.url = URL.createObjectURL(blob); this.el.src = this.url; this.loaded = st.key; restart = true;
      await new Promise(r => { const d = () => { this.el.removeEventListener('loadedmetadata', d); r(); }; this.el.addEventListener('loadedmetadata', d); setTimeout(d, 4000); });
    }
    this.hook(); this.place(st.tv);
    this.level();
    if (restart) { const late = this.isGuest && st.playing && this.posAt ? (performance.now() - this.posAt) / 1000 : 0; try { this.el.currentTime = ((st.pos || 0) + late) % Math.max(1, this.el.duration || 1e9); } catch (e) {} }
    this.showOn(st.tv);
    if (st.playing) this.el.play().catch(() => { this.el.muted = true; this.el.play().catch(() => {}); this.hint('Tap the screen to hear the TV'); }); else setTimeout(() => { if (!this.state.playing) this.el.pause(); }, 30);
  }
  level() { const v = this.state.playing && this.state.key ? this.state.vol : 0;     // (silent the moment it's paused: no stuck-sound loop on iPhones)
    if (this.gain && this.gain.context) { const g = this.gain.gain, t = this.gain.context.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(v, t + 0.02); } else this.el.volume = v; }
  hook() {
    const bus = musicBus(); if (!bus || this.node) return;
    try { this.node = bus.ctx.createMediaElementSource(this.el); this.gain = bus.ctx.createGain(); this.panner = bus.ctx.createPanner(); this.panner.panningModel = 'equalpower'; this.panner.distanceModel = 'inverse'; this.panner.refDistance = 2.5; this.panner.rolloffFactor = 0.8;
      this.node.connect(this.gain); this.gain.connect(this.panner); this.panner.connect(bus.out); } catch (e) { this.node = true; }
  }
  place(i) { const s = this.screens[i]; if (!s || !this.panner || !this.panner.positionX) return; const t = this.panner.context.currentTime; this.panner.positionX.setValueAtTime(s.c.x, t); this.panner.positionY.setValueAtTime(s.c.y, t); this.panner.positionZ.setValueAtTime(s.c.z, t); }
  // a telly that gets smashed stops showing it
  smashed() { if (this.state.tv >= 0 && !this.ok(this.state.tv)) { this.el.pause(); this.state.playing = false; this.render(); } }

  // ------------------------------------------------------------------ adding videos
  async addFiles(files) {
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
    let n = 0;
    for (const f of files) { const key = keyOf(f.name, f.size), meta = { key, title: nameOf(f.name), size: f.size };
      try { await put(key, f, meta); this.have.set(key, meta); n++; } catch (e) { this.ui.say('Couldn\'t save ' + f.name + ' (not enough space?)'); } }
    if (n) this.ui.say(`✅ Added ${n} video${n > 1 ? 's' : ''}`); this.render();
  }

  // ------------------------------------------------------------------ multiplayer
  on_tv(m) {
    if (this.net.host) return; const st = this.state, changed = m.key !== st.key || m.tv !== st.tv;
    Object.assign(st, { tv: m.tv, key: m.key, playing: !!m.playing, vol: m.vol, pos: m.pos }); this.hostId = m.f; this.posAt = performance.now();
    if (changed || this.loaded !== st.key) { this.apply(true); this.render(); return; }
    this.level();
    if (st.playing && Math.abs((this.el.currentTime || 0) - st.pos) > 2) { try { this.el.currentTime = st.pos; } catch (e) {} }
    if (st.playing && this.el.paused) this.el.play().catch(() => {}); else if (!st.playing && !this.el.paused) setTimeout(() => { if (!this.state.playing) this.el.pause(); }, 30);
    this.render();
  }
  request(key) { if (this.incoming.has(key) || !this.hostId) return; this.incoming.set(key, { parts: [], n: 0, got: 0 }); this.net.send({ t: 'vidreq', key, to: this.hostId }); this.render(); }
  async on_vidreq(m) {
    if (!this.net.host) return; const blob = await get(m.key).catch(() => null); if (!blob) return;
    if (blob.size > SHARE_MAX) { this.net.send({ t: 'vidpart', to: m.f, key: m.key, big: 1 }); return; }
    const meta = this.have.get(m.key) || {}, buf = new Uint8Array(await blob.arrayBuffer()), CH = 33000, n = Math.ceil(buf.length / CH);
    for (let i = 0; i < n; i++) {
      let bin = ''; const part = buf.subarray(i * CH, (i + 1) * CH); for (let j = 0; j < part.length; j += 8192) bin += String.fromCharCode.apply(null, part.subarray(j, j + 8192));
      this.net.send({ t: 'vidpart', to: m.f, key: m.key, i, n, d: btoa(bin), title: i === 0 ? meta.title : undefined, type: i === 0 ? blob.type : undefined });
      await new Promise(r => setTimeout(r, 18)); if (!this.net.connected) return;
    }
  }
  async on_vidpart(m) {
    if (m.big) { this.incoming.delete(m.key); this.ui.say('That video\'s too big to send round, so only the host can see it'); return; }
    const inc = this.incoming.get(m.key) || (this.incoming.set(m.key, { parts: [], n: 0, got: 0 }), this.incoming.get(m.key));
    if (inc.parts[m.i]) return; inc.n = m.n; inc.parts[m.i] = m.d; inc.got++; if (m.title) { inc.title = m.title; inc.type = m.type; }
    if (inc.got % 20 === 0) this.render(); if (inc.got < inc.n) return;
    const arrs = inc.parts.map(d => { const s = atob(d), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; });
    const blob = new Blob(arrs, { type: inc.type || 'video/mp4' }), meta = { key: m.key, title: inc.title || 'Video', size: blob.size };
    this.incoming.delete(m.key); try { await put(m.key, blob, meta); } catch (e) {} this.have.set(m.key, meta);
    if (this.state.key === m.key) { this.loaded = null; this.apply(true); } this.render();
  }

  // ------------------------------------------------------------------ the TV screen (in the pause menu, so it's in VR too)
  bindUI() {
    const $ = (id) => document.getElementById(id); if (!$('pause-tv')) return;
    $('tv-play').addEventListener('click', () => this.toggle());
    $('tv-stop').addEventListener('click', () => this.stop());
    $('tv-voldn').addEventListener('click', () => this.volume(-0.1));
    $('tv-volup').addEventListener('click', () => this.volume(0.1));
    $('tv-add').addEventListener('click', () => { if (!this.guard()) return; $('tv-file').click(); });
    $('tv-file').addEventListener('change', (e) => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) this.addFiles(fs); });
    $('tv-list').addEventListener('click', (e) => { const b = e.target.closest('.song'); if (b) this.choose(b.dataset.key); });
  }
  render() {
    const $ = (id) => document.getElementById(id), list = $('tv-list'); if (!list) return;
    const st = this.state, guest = this.isGuest, inc = st.key && this.incoming.get(st.key), cur = st.key ? this.have.get(st.key) : null;
    $('tv-now').textContent = st.key ? `${st.playing ? '▶ Showing' : '⏸ Paused'}: ${(cur && cur.title) || '…'}` + (inc ? ` (getting it from the host… ${Math.round(100 * inc.got / Math.max(1, inc.n))}%)` : '') : (guest ? 'The host hasn\'t put anything on' : 'Pick a video for this TV');
    $('tv-play').textContent = st.playing ? '⏸ PAUSE' : '▶ PLAY'; $('tv-voldn').textContent = `🔉 QUIETER · ${Math.round(st.vol * 100)}%`; $('tv-volup').textContent = `🔊 LOUDER · ${Math.round(st.vol * 100)}%`;
    for (const id of ['tv-play', 'tv-stop', 'tv-voldn', 'tv-volup', 'tv-add']) $(id).classList.toggle('lock', guest);
    $('tv-hostnote').style.display = guest ? '' : 'none';
    const vids = [...this.have.values()];
    list.innerHTML = vids.length ? vids.map((v, i) => `<button class="song${st.key === v.key ? ' cur' : ''} pg" data-key="${v.key}" style="--c:${['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#ff7043'][i % 6]}"><span class="art">📺</span>${st.key === v.key && st.playing ? '▶ ' : ''}${String(v.title).replace(/[<>&"]/g, '')}<small>${(v.size / 1048576).toFixed(0)} MB</small></button>`).join('')
      : `<p class="where">No videos yet. ${guest ? '' : 'Tap ➕ ADD VIDEOS and pick some from this device (on a Quest, do it in the normal browser before you go into VR).'}</p>`;
  }
}
