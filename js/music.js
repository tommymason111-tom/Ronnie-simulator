// MUSIC: a speaker set-up in every place (the DJ booth at the Oysterfleet, a hi-fi in Lewis's house, a speaker in
// the restaurant and the bedroom, the Lidl tannoy). Walk up and tap the glowing MUSIC button to pick a song.
// The song loops until someone picks another. In multiplayer only the host chooses, plays/pauses and sets the
// volume; everyone hears it (the host's game sends the song to anyone who hasn't got it, in small pieces through
// the room, and it's kept on their device for next time).
//
// The songs themselves aren't part of the game's files: the host adds them once from their own phone / headset
// (ADD SONGS) and they're kept on that device. The library below names them; any other song can be added too.
import * as THREE from 'three';
import { initAudio, musicBus } from './audio.js';

export const LIBRARY = [
  { key: 'supersonic', title: 'Supersonic (Remastered)', artist: 'Oasis', c: '#e53935' },
  { key: 'wonderwall', title: 'Wonderwall', artist: 'Oasis', c: '#1e88e5' },
  { key: 'missalissa', title: 'Miss Alissa', artist: 'Eagles of Death Metal', c: '#8e24aa' },
  { key: 'youreallygotme', title: 'You Really Got Me', artist: 'The Kinks', c: '#f4511e' },
  { key: 'londoncalling', title: 'London Calling', artist: 'The Clash', c: '#43a047' },
  { key: 'youdontknowme', title: 'You Don\'t Know Me (feat. Duane Harden)', artist: 'Armand Van Helden', c: '#00acc1' },
  { key: 'chelseadagger', title: 'Chelsea Dagger', artist: 'The Fratellis', c: '#fdd835' },
  { key: 'mytype', title: 'My Type', artist: 'Saint Motel', c: '#ec407a' },
  { key: 'jerkitout', title: 'Jerk It Out', artist: 'Caesars', c: '#ff7043' },
  { key: 'busyearnin', title: 'Busy Earnin\'', artist: 'Jungle', c: '#26a69a' },
  { key: 'freedfromdesire', title: 'Freed From Desire', artist: 'Gala', c: '#ab47bc' },
  { key: 'horny98', title: 'Horny \'98', artist: 'Mousse T.', c: '#ef5350' },
  { key: 'hampsterdance', title: 'The Hampsterdance Song', artist: 'Hampton the Hampster', c: '#ffca28' },
  { key: 'didyousee', title: 'Did You See', artist: 'J Hus', c: '#5c6bc0' },
  { key: 'options', title: 'Options (ft. Tion Wayne)', artist: 'NSG', c: '#66bb6a' },
];
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
// a file's name -> which song it is (title and artist). Library songs are recognised by their title; anything
// else is read as "Title - Artist" (or "Artist - Title - uploader"), with the YouTube-ish extras taken off.
export function songFromFile(name) {
  const n = norm(name.replace(/^[0-9a-f]{8}-/i, ''));
  const hit = LIBRARY.find(s => n.includes(s.key)); if (hit) return hit;
  let base = name.replace(/\.[a-z0-9]+$/i, '').replace(/^[0-9a-f]{8}-/i, '').replace(/_/g, ' ');
  base = base.replace(/\b(official\s*(music\s*)?(video|audio)|lyrics?|music video|radio edit|4k|hd|remastered)\b/gi, '').replace(/\(\s*\)|\[\s*\]/g, '').replace(/\s+/g, ' ');
  const parts = base.split(' - ').map(s => s.trim()).filter(Boolean);
  const [title, artist] = parts.length >= 3 ? [parts[1], parts[0]] : parts.length === 2 ? [parts[0], parts[1]] : [parts[0] || name, 'Unknown'];
  return { key: 'u' + norm(title).slice(0, 24), title, artist, c: '#78909c', extra: true };
}

// ---- the songs on this device (IndexedDB)
const DB = (() => { let p = null; return () => p || (p = new Promise((res, rej) => { const r = indexedDB.open('ronnie-music', 1); r.onupgradeneeded = () => { r.result.createObjectStore('songs'); r.result.createObjectStore('meta'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); })();
const tx = async (store, mode, fn) => { const db = await DB(); return new Promise((res, rej) => { const t = db.transaction(store, mode), s = t.objectStore(store), r = fn(s); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); };
const dbPut = (k, blob, meta) => Promise.all([tx('songs', 'readwrite', s => s.put(blob, k)), tx('meta', 'readwrite', s => s.put(meta, k))]);
const dbGet = (k) => tx('songs', 'readonly', s => s.get(k));
const dbMetas = async () => { const db = await DB(); return new Promise((res) => { const out = [], t = db.transaction('meta', 'readonly'), c = t.objectStore('meta').openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out.push(cur.value); cur.continue(); } else res(out); }; c.onerror = () => res(out); }); };

// ---- where the music comes from in each place
const STATIONS = {
  pub: { name: 'DJ BOOTH', button: [-1.26, 1.2, -8.47], source: [-1.26, 1.4, -8.5], speakers: [] },           // (the booth already has its speakers)
  garden: { name: 'HI-FI', button: [-6.22, 1.3, 10.72], source: [-5.9, 1.0, 11.4], speakers: [[-6.22, 0, 10.72, Math.PI * 0.75, 1.0], [-5.22, 0, 11.72, Math.PI * 0.75, 1.0]] },   // either side of Lewis's corner telly, facing into the room
  restaurant: { name: 'SPEAKER', button: [-2.2, 1.3, -8.55], source: [-2.2, 2.2, -8.6], speakers: [[-2.2, 0, -8.62, 0, 1.15], [2.2, 0, -8.62, 0, 1.15]] },
  bedroom: { name: 'SPEAKER', button: [2.18, 1.3, -0.62], source: [2.18, 1.0, -0.62], speakers: [[2.18, 0, -0.62, -Math.PI / 2, 0.95]] },     // on the end of the desk
  shop: { name: 'TANNOY', button: [11.35, 1.35, 8.35], source: null, intercom: [11.35, 8.35, Math.PI / 2], ceiling: true },
};
const BLACK = 0x161616;
function speakerMesh(h = 1.1) {
  const g = new THREE.Group(), m = (c) => new THREE.MeshLambertMaterial({ color: c });
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.34, h, 0.3), m(BLACK)); cab.position.y = h / 2; g.add(cab);
  const cones = [];
  const cone = (r, y) => { const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.02, 24), m(0x2a2a2a)); ring.rotation.x = Math.PI / 2; ring.position.set(0, y, 0.152); g.add(ring);
    const c = new THREE.Mesh(new THREE.ConeGeometry(r * 0.82, r * 0.35, 24, 1, true), new THREE.MeshLambertMaterial({ color: 0x3a3a3a, side: THREE.DoubleSide })); c.rotation.x = -Math.PI / 2; c.position.set(0, y, 0.15); g.add(c);
    const dust = new THREE.Mesh(new THREE.SphereGeometry(r * 0.22, 12, 8), m(0x555555)); dust.scale.z = 0.5; dust.position.set(0, y, 0.162); g.add(dust); cones.push(c, dust); };
  cone(0.12, h * 0.32); cone(0.05, h * 0.72);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: 0x29b6f6 })); led.position.set(0.12, h - 0.05, 0.152); g.add(led);
  g.cones = cones; g.led = led; return g;
}

export class Music {
  constructor({ scene, room, net, player, words, hint, ui }) {
    Object.assign(this, { scene, room, net, player, words, hint, ui });
    this.state = { key: null, playing: false, vol: 0.6, pos: 0 };
    this.have = new Map();        // key -> { title, artist, c }  (songs this device has)
    this.extra = [];              // songs added that aren't in the library
    this.incoming = new Map();    // key -> { parts, n, got }
    this.el = new Audio(); this.el.loop = true; this.el.preload = 'auto'; this.el.setAttribute('playsinline', ''); this.el.crossOrigin = 'anonymous';
    this.url = null; this.loadedKey = null; this.page = 0; this.t = 0; this.syncT = 0;
    this.station = STATIONS[room.placeId] || null;
    if (this.station) this.build();
    dbMetas().then(ms => { for (const m of ms) { this.have.set(m.key, m); if (m.extra && !this.extra.some(e => e.key === m.key)) this.extra.push(m); } this.render(); }).catch(() => {});
    // phones only let a page start sound from a tap: get the player ready on the first touch
    const prime = () => { window.removeEventListener('pointerdown', prime, true); if (!this.state.playing) { this.el.muted = true; this.el.play().then(() => { this.el.pause(); this.el.muted = false; }).catch(() => { this.el.muted = false; }); } };
    window.addEventListener('pointerdown', prime, true);
    // network
    for (const k of ['music', 'songreq', 'songpart']) { const prev = net.on[k]; net.on[k] = (m, p) => { prev && prev(m, p); this['on_' + k](m, p); }; }
    this.bindUI();
  }
  get isGuest() { return !!(this.net.connected && !this.net.host); }
  songs() { return [...LIBRARY, ...this.extra]; }
  info(key) { return this.songs().find(s => s.key === key) || this.have.get(key) || { title: '…', artist: '', c: '#888' }; }

  // ------------------------------------------------------------------ the speakers and the button
  build() {
    const S = this.station, scene = this.scene; this.speakers = [];
    // a speaker stands on the floor, or on top of whatever's already there (a counter, a unit)
    const baseAt = (x, z) => { let y = 0; for (const b of this.room.blockers || []) if (x > b.x0 - 0.05 && x < b.x1 + 0.05 && z > b.z0 - 0.05 && z < b.z1 + 0.05 && (b.y1 ?? 1) < 1.7) y = Math.max(y, b.y1 ?? 0); return y; };
    this.baseAt = baseAt;
    const put = (x, z, ry, h) => { const y = baseAt(x, z), hh = y > 0.3 ? Math.min(h, 0.42) : h, s = speakerMesh(hh); s.position.set(x, y, z); s.rotation.y = ry; scene.add(s); this.speakers.push(s); s.top = y + hh; return s; };
    if (S.tv) { const [x, z, ry] = S.tv, rx = Math.cos(ry), rz = -Math.sin(ry), fx = Math.sin(ry), fz = Math.cos(ry);
      const sp = [-1, 1].map(sd => put(x + rx * sd * 0.78 + fx * 0.1, z + rz * sd * 0.78 + fz * 0.1, ry, 1.0));
      S.button = [sp[0].position.x, sp[0].top + 0.28, sp[0].position.z]; S.source = [x, 1.0, z]; }
    const made = (S.speakers || []).map(([x, , z, ry, h]) => put(x, z, ry, h));
    if (made.length && !S.tv) S.button = [S.button[0], made[0].top + 0.28, S.button[2]];
    if (S.intercom) {            // the Lidl tannoy: a panel on a post with a handset, ceiling speakers everywhere
      const [x, z, ry] = S.intercom, g = new THREE.Group(), m = (c) => new THREE.MeshLambertMaterial({ color: c });
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.1, 10), m(0x9aa0a6)); post.position.y = 0.55; g.add(post);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.08), m(0x1e4ea8)); box.position.set(0, 1.18, 0.02); g.add(box);
      const grille = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.01, 20), m(0x222222)); grille.rotation.x = Math.PI / 2; grille.position.set(0, 1.24, 0.065); g.add(grille);
      const hs = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.14, 4, 8), m(0x111111)); hs.position.set(-0.1, 1.1, 0.075); g.add(hs);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.03, 16), m(0x9aa0a6)); foot.position.y = 0.015; g.add(foot);
      g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
      const B = this.room.bounds;
      for (let gx = B.x0 + 4; gx < B.x1 - 2; gx += 6.5) for (let gz = B.z0 + 3; gz < B.z1 - 2; gz += 6) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 20), m(0xf2f2f2)); c.position.set(gx, (B.y1 || 4) - 0.02, gz); scene.add(c);
        const gr = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), m(0xbdbdbd)); gr.rotation.x = Math.PI / 2; gr.position.set(gx, (B.y1 || 4) - 0.035, gz); scene.add(gr); } }
    // the glowing MUSIC button
    const cv = document.createElement('canvas'); cv.width = 320; cv.height = 128; this.btnCv = cv;
    this.btnTex = new THREE.CanvasTexture(cv); this.btnTex.colorSpace = THREE.SRGBColorSpace;
    this.button = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.btnTex, transparent: true, depthWrite: false })); this.button.scale.set(0.42, 0.168, 1); this.button.renderOrder = 8;
    this.button.position.set(...S.button); scene.add(this.button); this.drawButton();
    this.srcPos = new THREE.Vector3(...(S.source || S.button));
  }
  drawButton() {
    const g = this.btnCv.getContext('2d'), st = this.state, on = st.playing && st.key, inf = on ? this.info(st.key) : null, sig = on ? 'p' + st.key : 'idle';
    if (sig === this.btnSig) return; this.btnSig = sig;
    g.clearRect(0, 0, 320, 128);
    const grd = g.createLinearGradient(0, 0, 320, 0); grd.addColorStop(0, '#ff2a6a'); grd.addColorStop(0.5, '#7a2aff'); grd.addColorStop(1, '#2a8aff');
    g.fillStyle = 'rgba(8,10,30,0.9)'; g.beginPath(); g.roundRect(6, 6, 308, 116, 30); g.fill(); g.lineWidth = 7; g.strokeStyle = grd; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (!on) { g.fillStyle = '#fff'; g.font = '900 40px Arial'; g.fillText('🎵 MUSIC', 160, 52); g.fillStyle = '#ffd400'; g.font = '700 20px Arial'; g.fillText('tap to pick a song', 160, 94); }
    else { g.fillStyle = '#39ff14'; g.font = '900 20px Arial'; g.fillText('♪ NOW PLAYING ♪', 160, 30); let f = 30; do { g.font = `900 ${f}px Arial`; f -= 2; } while (g.measureText(inf.title).width > 290 && f > 14); g.fillStyle = '#fff'; g.fillText(inf.title, 160, 66); g.fillStyle = '#c9d3ff'; g.font = '700 18px Arial'; g.fillText(inf.artist, 160, 100); }
    this.btnTex.needsUpdate = true;
  }
  // phone / PC: a tap on the button
  tap(ray, reach) {
    if (!this.button) return false; const p = this.button.position, along = new THREE.Vector3().subVectors(p, ray.origin).dot(ray.direction);
    if (along <= 0 || ray.distanceSqToPoint(p) > 0.2 * 0.2) return false;
    if (along > reach + 1.5) { this.hint('Walk up to the ' + this.station.name.toLowerCase() + ' to pick a song'); return true; }
    this.ui.open(); return true;
  }

  // ------------------------------------------------------------------ every frame
  update(dt) {
    this.t += dt;
    const bus = musicBus();
    if (bus && !this.node) this.hook(bus);
    if (this.button) {
      const s = 1 + Math.sin(this.t * 3) * 0.05; this.button.scale.set(0.42 * s, 0.168 * s, 1); this.button.position.y = this.station.button[1] + Math.sin(this.t * 1.6) * 0.02;
      // VR: poke the button
      if (!this.player.flatMode) for (const h of this.player.hands || []) if (h.tracked && h.palm && h.palm.distanceTo(this.button.position) < 0.16 && (this.pokeCool || 0) <= 0) { this.pokeCool = 1.5; this.ui.open(); }
      if (this.pokeCool > 0) this.pokeCool -= dt;
    }
    // the speakers thump along
    const beat = this.state.playing && !this.el.paused ? Math.max(0, Math.sin(this.t * Math.PI * 4.1)) ** 3 : 0;
    for (const s of this.speakers || []) { for (const c of s.cones) c.position.z = (c.geometry.type === 'SphereGeometry' ? 0.162 : 0.15) + beat * 0.012; s.led.material.color.setHex(beat > 0.5 ? 0x39ff14 : 0x29b6f6); }
    if (this.panner && this.srcPos) { const t = bus.ctx.currentTime; if (this.panner.positionX) { this.panner.positionX.setValueAtTime(this.srcPos.x, t); this.panner.positionY.setValueAtTime(this.srcPos.y, t); this.panner.positionZ.setValueAtTime(this.srcPos.z, t); } else this.panner.setPosition(this.srcPos.x, this.srcPos.y, this.srcPos.z); }
    // the host keeps everyone in step (and tells late arrivals what's on)
    if (this.net.connected && this.net.host && this.state.key && (this.syncT -= dt) <= 0) { this.syncT = 4; this.broadcast(); }
    this.drawButton();
  }
  hook(bus) {
    try {
      this.node = bus.ctx.createMediaElementSource(this.el); this.gain = bus.ctx.createGain(); this.gain.gain.value = this.state.playing ? this.state.vol : 0;
      if (this.station && this.station.source !== null && !this.station.ceiling) {
        this.panner = bus.ctx.createPanner(); this.panner.panningModel = 'equalpower'; this.panner.distanceModel = 'inverse'; this.panner.refDistance = 4; this.panner.rolloffFactor = 0.7; this.panner.maxDistance = 60;
        this.node.connect(this.gain); this.gain.connect(this.panner); this.panner.connect(bus.out);
      } else { this.node.connect(this.gain); this.gain.connect(bus.out); }
    } catch (e) { this.node = true; }
  }
  setVol(v) { this.state.vol = Math.max(0, Math.min(1, Math.round(v * 10) / 10)); this.level(); }
  // the speakers' volume: silent the moment it's paused (iPhones otherwise keep repeating the last scrap of sound
  // through the game's speakers when a song stops), back up to the volume when it plays
  level() { const on = this.state.playing && !!this.state.key, v = on ? this.state.vol : 0;
    if (this.gain && this.gain.gain && this.gain.context) { const g = this.gain.gain, t = this.gain.context.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(v, t + (on ? 0.05 : 0.015)); }
    else this.el.volume = v; }
  pauseEl() { this.level(); clearTimeout(this.pauseT); this.pauseT = setTimeout(() => { if (!this.state.playing) this.el.pause(); }, 30); }

  // ------------------------------------------------------------------ choosing (host / solo only)
  guard() { if (this.isGuest) { this.ui.say('🔒 Only the host can change the music'); this.hint('Only the host can change the music'); return false; } return true; }
  async choose(key) {
    if (!this.guard()) return; initAudio();
    if (this.state.key === key) return this.togglePlay();
    if (!this.have.has(key)) { this.ui.say('➕ Add this song first: tap ADD SONGS and pick the file'); return; }
    this.state.key = key; this.state.playing = true; this.state.pos = 0;
    await this.apply(true); this.broadcast(); this.render();
  }
  togglePlay() {
    if (!this.guard()) return; initAudio();
    if (!this.state.key) { const first = this.songs().find(s => this.have.has(s.key)); if (first) return this.choose(first.key); this.ui.say('➕ Add some songs first'); return; }
    this.state.playing = !this.state.playing; this.state.pos = this.el.currentTime || 0;
    if (this.state.playing) { this.level(); this.el.play().catch(() => {}); } else this.pauseEl();     // (straight from where it stopped)
    this.broadcast(); this.render(); this.drawButton && this.button && this.drawButton();
  }
  volume(d) { if (!this.guard()) return; this.setVol(this.state.vol + d); this.broadcast(); this.render(); }
  broadcast() { if (!this.net.connected || !this.net.host) return; this.net.send({ t: 'music', key: this.state.key, playing: this.state.playing ? 1 : 0, vol: this.state.vol, pos: Math.round((this.el.currentTime || 0) * 100) / 100 }); }

  // make the speakers do what the state says
  async apply(restart = false) {
    const st = this.state;
    if (st.key && this.loadedKey !== st.key) {
      const blob = await dbGet(st.key).catch(() => null);
      if (!blob) { this.el.pause(); if (this.isGuest) this.request(st.key); return; }
      if (this.url) URL.revokeObjectURL(this.url); this.url = URL.createObjectURL(blob); this.el.src = this.url; this.loadedKey = st.key; restart = true;
      await new Promise(r => { const done = () => { this.el.removeEventListener('loadedmetadata', done); r(); }; this.el.addEventListener('loadedmetadata', done); setTimeout(done, 3000); });
    }
    this.setVol(st.vol);
    // (a joining player catches up with where the host has got to while the song was loading)
    if (restart) { const late = this.isGuest && st.playing && this.posAt ? (performance.now() - this.posAt) / 1000 : 0; try { this.el.currentTime = ((st.pos || 0) + late) % Math.max(1, this.el.duration || 1e9); } catch (e) {} }
    if (st.playing && st.key) { clearTimeout(this.pauseT); this.level(); this.el.play().catch(() => { this.hint('Tap the screen to hear the music'); }); } else this.pauseEl();
    this.drawButton && this.button && this.drawButton(); this.render();
  }

  // ------------------------------------------------------------------ adding songs from this device
  async addFiles(files) {
    let n = 0;
    for (const f of files) { const s = songFromFile(f.name), meta = { key: s.key, title: s.title, artist: s.artist, c: s.c, extra: !!s.extra };
      try { await dbPut(s.key, f, meta); this.have.set(s.key, meta); if (s.extra && !this.extra.some(e => e.key === s.key)) this.extra.push(meta); n++; } catch (e) { this.ui.say('Couldn\'t save ' + f.name); } }
    this.ui.say(n ? `✅ Added ${n} song${n > 1 ? 's' : ''}` : 'No songs added'); this.render();
  }

  // ------------------------------------------------------------------ multiplayer
  on_music(m) {
    if (this.net.host) return;
    const st = this.state, newSong = m.key !== st.key, wasPlaying = st.playing;
    st.key = m.key; st.playing = !!m.playing; st.vol = m.vol ?? st.vol; st.pos = m.pos || 0; this.hostId = m.f; this.posAt = performance.now();
    if (newSong || this.loadedKey !== st.key) { this.apply(true); return; }
    this.setVol(st.vol);
    if (st.playing && (Math.abs((this.el.currentTime || 0) - st.pos) > 1.5 || !wasPlaying)) { try { this.el.currentTime = st.pos; } catch (e) {} }
    if (st.playing && this.el.paused && this.loadedKey === st.key) { this.level(); this.el.play().catch(() => {}); } else if (!st.playing) this.pauseEl();
    this.render();
  }
  request(key) { if (this.incoming.has(key) || !this.hostId) return; this.incoming.set(key, { parts: [], n: 0, got: 0 }); this.net.send({ t: 'songreq', key, to: this.hostId }); this.render(); }
  async on_songreq(m) {
    if (!this.net.host) return; const blob = await dbGet(m.key).catch(() => null); if (!blob) return;
    const meta = this.have.get(m.key) || {}, buf = new Uint8Array(await blob.arrayBuffer()), CH = 33000, n = Math.ceil(buf.length / CH);
    for (let i = 0; i < n; i++) {
      let bin = ''; const part = buf.subarray(i * CH, (i + 1) * CH); for (let j = 0; j < part.length; j += 8192) bin += String.fromCharCode.apply(null, part.subarray(j, j + 8192));
      this.net.send({ t: 'songpart', to: m.f, key: m.key, i, n, d: btoa(bin), title: i === 0 ? meta.title : undefined, artist: i === 0 ? meta.artist : undefined, type: i === 0 ? blob.type : undefined });
      await new Promise(r => setTimeout(r, 18));
      if (!this.net.connected) return;
    }
  }
  async on_songpart(m) {
    const inc = this.incoming.get(m.key) || (this.incoming.set(m.key, { parts: [], n: 0, got: 0 }), this.incoming.get(m.key));
    if (inc.parts[m.i]) return; inc.n = m.n; inc.parts[m.i] = m.d; inc.got++; if (m.title) { inc.title = m.title; inc.artist = m.artist; inc.type = m.type; }
    if (inc.got % 10 === 0) this.render();
    if (inc.got < inc.n) return;
    const arrs = inc.parts.map(d => { const s = atob(d), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; });
    const blob = new Blob(arrs, { type: inc.type || 'audio/mpeg' }), lib = LIBRARY.find(s => s.key === m.key), meta = { key: m.key, title: inc.title || (lib && lib.title) || 'Song', artist: inc.artist || (lib && lib.artist) || '', c: (lib && lib.c) || '#78909c', extra: !lib };
    this.incoming.delete(m.key);
    try { await dbPut(m.key, blob, meta); } catch (e) {}
    this.have.set(m.key, meta); if (meta.extra && !this.extra.some(e => e.key === m.key)) this.extra.push(meta);
    if (this.state.key === m.key) { this.loadedKey = null; this.apply(true); }
    this.render();
  }

  // ------------------------------------------------------------------ the music screen (in the pause menu, so it's in VR too)
  bindUI() {
    const $ = (id) => document.getElementById(id); if (!$('pause-music')) return;
    $('mus-play').addEventListener('click', () => this.togglePlay());
    $('mus-voldn').addEventListener('click', () => this.volume(-0.1));
    $('mus-volup').addEventListener('click', () => this.volume(0.1));
    $('mus-add').addEventListener('click', () => { if (!this.guard()) return; $('mus-file').click(); });
    $('mus-file').addEventListener('change', (e) => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) this.addFiles(fs); });
    $('mus-more').addEventListener('click', () => { this.page = (this.page + 1) % Math.max(1, Math.ceil(this.songs().length / 4)); this.render(); });
    $('mus-list').addEventListener('click', (e) => { const b = e.target.closest('.song'); if (b) this.choose(b.dataset.key); });
    this.render();
  }
  render() {
    const $ = (id) => document.getElementById(id); const list = $('mus-list'); if (!list) return;
    const st = this.state, guest = this.isGuest, all = this.songs(), pages = Math.max(1, Math.ceil(all.length / 4)); if (this.page >= pages) this.page = 0;
    const inf = st.key ? this.info(st.key) : null, inc = st.key && this.incoming.get(st.key);
    $('mus-now').textContent = inf ? `${st.playing ? '▶ Playing' : '⏸ Paused'}: ${inf.title} — ${inf.artist}` + (inc ? ` (getting it from the host… ${Math.round(100 * inc.got / Math.max(1, inc.n))}%)` : '') : (guest ? 'The host hasn\'t put any music on yet' : 'Pick a song');
    $('mus-play').textContent = st.playing ? '⏸ PAUSE' : '▶ PLAY'; $('mus-play').classList.toggle('lock', guest);
    $('mus-voldn').textContent = `🔉 QUIETER · ${Math.round(st.vol * 100)}%`; $('mus-volup').textContent = `🔊 LOUDER · ${Math.round(st.vol * 100)}%`;
    $('mus-volbar').style.width = Math.round(st.vol * 100) + '%';
    for (const id of ['mus-voldn', 'mus-volup', 'mus-add']) $(id).classList.toggle('lock', guest);
    $('mus-more').textContent = `🔽 MORE SONGS (${this.page + 1}/${pages})`;
    $('mus-hostnote').style.display = guest ? '' : 'none';
    const sig = JSON.stringify([all.map(s => s.key + (this.have.has(s.key) ? 1 : 0)), st.key, st.playing, this.page, guest]);
    if (sig === this.listSig) return; this.listSig = sig;
    list.innerHTML = all.map((s, i) => { const has = this.has(s.key), cur = st.key === s.key;
      return `<button class="song${cur ? ' cur' : ''}${has ? '' : ' need'}${Math.floor(i / 4) === this.page ? ' pg' : ''}" data-key="${s.key}" style="--c:${s.c}"><span class="art">${cur && st.playing ? '<i></i><i></i><i></i>' : (i + 1)}</span>${cur && st.playing ? '▶ ' : ''}${esc(s.title)}<small>${esc(s.artist)}${has ? '' : guest ? '' : ' · ➕ needs adding'}</small></button>`; }).join('');
  }
  has(key) { return this.have.has(key); }
  dispose() { this.el.pause(); if (this.url) URL.revokeObjectURL(this.url); for (const s of this.speakers || []) this.scene.remove(s); if (this.button) this.scene.remove(this.button); }
}
const esc = (t) => String(t).replace(/[<>&"]/g, '');
