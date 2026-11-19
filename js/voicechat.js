// VOICE CHAT (multiplayer): talk to everyone in the room. OFF until you press the 🎙️ button. Everyone who's turned it on
// is connected straight to everyone else who has (WebRTC, through the room only to set up: the sound itself goes
// device to device, the quickest way there is). Your own voice is never played back to you; echo cancelling, noise
// suppression and auto gain are on, and every player's sound is played with the smallest delay the browser allows.
// While anyone's in voice chat the squad (the NPCs) go quiet so you can hear each other. Who's talking shows on their
// name tag and down the side of the screen (main.js), from how loud they are right now.
import { setNpcMute, getMix, audioCtx, initAudio } from './audio.js';

const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
const TALK = 0.018;      // (how loud counts as talking: rms of the sound, 0..1)

export class VoiceChat {
  constructor(net) {
    this.net = net; this.on = false; this.muted = false; this.peers = new Map(); this.remoteOn = new Map(); this.level = new Map(); this.myLevel = 0;
    this.onChange = () => {}; this.err = '';
    this._buf = new Float32Array(1024);
    this.tick = setInterval(() => this.measure(), 60);
  }
  get supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.RTCPeerConnection); }
  // ---- turning it on and off
  async start() {
    if (this.on || this.starting) return true; this.err = '';
    if (!this.supported) { this.err = 'Voice chat needs a newer browser (or https).'; this.onChange(); return false; }
    this.starting = true;
    try { this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }); }
    catch (e) { this.starting = false; this.err = e && e.name === 'NotAllowedError' ? 'Microphone blocked: allow it in your browser\'s settings for this site.' : 'No microphone found.'; this.onChange(); return false; }
    this.starting = false; this.on = true; this.muted = false; this.sid = Math.random().toString(36).slice(2, 10);      // (this time it's on: anything still in flight from a time before is ignored)
    try { initAudio(); const ctx = audioCtx(); if (ctx) { this.myAn = ctx.createAnalyser(); this.myAn.fftSize = 1024; this.mySrc = ctx.createMediaStreamSource(this.stream); this.mySrc.connect(this.myAn); } } catch (e) {}      // (only measured: never played back to you)
    this.net.send({ t: 'vc', on: 1, s: this.sid });
    for (const id of this.remoteOn.keys()) this.connect(id);
    this.npc(); this.onChange(); return true;
  }
  stop() {
    if (!this.on) return; this.on = false; this.net.send({ t: 'vc', on: 0 });
    for (const id of [...this.peers.keys()]) this.drop(id);
    try { this.mySrc && this.mySrc.disconnect(); } catch (e) {} this.mySrc = this.myAn = null;
    if (this.stream) for (const t of this.stream.getTracks()) t.stop(); this.stream = null; this.myLevel = 0;
    this.npc(); this.onChange();
  }
  setMuted(m) { this.muted = !!m; if (this.stream) for (const t of this.stream.getAudioTracks()) t.enabled = !this.muted; if (this.on) this.net.send({ t: 'vc', on: 1, m: this.muted ? 1 : 0, s: this.sid }); this.onChange(); }
  // the squad go quiet while anyone at all is in voice chat (you, or anyone in the room)
  npc() { setNpcMute(this.on || [...this.remoteOn.values()].some(Boolean)); }
  // ---- messages from the room
  onMsg(m, from) {
    if (!from) return; const id = from.id;
    if (m.t === 'vc') {
      const was = this.remoteOn.has(id);
      const prev = this.remoteOn.get(id), sid = typeof m.s === 'string' ? m.s : null;
      if (m.on) { if ((prev && sid && prev.s && prev.s !== sid) || (m.re && this.on)) this.drop(id);      // (they turned it off and on again, or asked to start the line afresh)      // (they turned it off and on again: start afresh with them)
        this.remoteOn.set(id, { muted: !!m.m, s: sid || (prev && prev.s) || null });
        if (this.on && !this.peers.has(id)) { this.connect(id); if (!m.re && (!was || (prev && prev.s !== sid))) this.net.send({ t: 'vc', to: id, on: 1, m: this.muted ? 1 : 0, s: this.sid }); } }      // (tell a newcomer you're on too)
      else { this.remoteOn.delete(id); this.drop(id); }
      this.npc(); this.onChange(); return;
    }
    if (m.t === 'rtc' && this.on) {
      if (m.r && m.r !== this.sid) return;      // (meant for a time before you last turned it on)
      const ro = this.remoteOn.get(id); if (ro && m.s && ro.s && m.s !== ro.s) { if (m.desc && m.desc.type === 'offer') { this.drop(id); ro.s = m.s; } else return; }
      if (ro && m.s && !ro.s) ro.s = m.s;
      this.signal(id, m); }
  }
  left(id) { this.remoteOn.delete(id); this.drop(id); this.npc(); this.onChange(); }
  // ---- one connection per other talker ("perfect negotiation": either end can start it, clashes sort themselves out)
  connect(id) {
    if (this.peers.has(id) || !this.stream) return this.peers.get(id);
    const pc = new RTCPeerConnection({ iceServers: ICE, bundlePolicy: 'max-bundle' }), P = { born: performance.now(), pc, polite: String(this.net.id) > String(id), makingOffer: false, ignoreOffer: false, audio: null, an: null, level: 0 };
    this.peers.set(id, P);
    for (const t of this.stream.getAudioTracks()) pc.addTrack(t, this.stream);
    pc.onnegotiationneeded = async () => { try { P.makingOffer = true; await pc.setLocalDescription(); this.net.send({ t: 'rtc', to: id, s: this.sid, r: this.rsid(id), desc: pc.localDescription && pc.localDescription.toJSON() }); } catch (e) {} finally { P.makingOffer = false; } };
    pc.onicecandidate = (e) => { if (e.candidate && this.peers.get(id) === P) this.net.send({ t: 'rtc', to: id, s: this.sid, r: this.rsid(id), cand: e.candidate.toJSON() }); };
    pc.oniceconnectionstatechange = () => { if (pc.iceConnectionState === 'failed') try { pc.restartIce(); } catch (e) {} };
    pc.ontrack = (e) => this.hear(id, P, e);
    return P;
  }
  rsid(id) { const r = this.remoteOn.get(id); return r && r.s || undefined; }
  // (one message at a time per connection: a candidate that arrived while the offer was still being applied was turned
  // away and lost, which left the odd connection never getting going)
  signal(id, m) { const P = this.peers.get(id) || this.connect(id); if (!P) return; P.q = (P.q || Promise.resolve()).then(() => this.signal1(id, P, m)).catch(() => {}); return P.q; }
  async signal1(id, P, m) {
    if (this.peers.get(id) !== P) return; const pc = P.pc;
    try {
      if (m.desc && typeof m.desc === 'object' && typeof m.desc.sdp === 'string' && (m.desc.type === 'offer' || m.desc.type === 'answer')) {
        const clash = m.desc.type === 'offer' && (P.makingOffer || pc.signalingState !== 'stable');
        P.ignoreOffer = !P.polite && clash; if (P.ignoreOffer) return;
        await pc.setRemoteDescription(m.desc);
        if (m.desc.type === 'offer') { await pc.setLocalDescription(); this.net.send({ t: 'rtc', to: id, s: this.sid, r: this.rsid(id), desc: pc.localDescription.toJSON() }); }
      } else if (m.cand && typeof m.cand === 'object') { try { await pc.addIceCandidate(m.cand); } catch (e) { if (!P.ignoreOffer) throw e; } }
    } catch (e) { console.warn('voice', e); }
  }
  // their voice: played straight out (an <audio> element: the browser's echo cancelling hears it, and it adds no delay),
  // and measured, for the talking lights
  hear(id, P, e) {
    const stream = (e.streams && e.streams[0]) || new MediaStream([e.track]);
    try { if (e.receiver && 'jitterBufferTarget' in e.receiver) e.receiver.jitterBufferTarget = 0; else if (e.receiver && 'playoutDelayHint' in e.receiver) e.receiver.playoutDelayHint = 0; } catch (er) {}      // (no extra buffering: as little delay as the network allows)
    if (!P.audio) { P.audio = new Audio(); P.audio.autoplay = true; P.audio.setAttribute('playsinline', ''); P.audio.dataset.voice = id; document.body.appendChild(P.audio); P.audio.style.display = 'none'; }
    P.audio.srcObject = stream; this.volume(P); P.audio.play().catch(() => {});
    try { const ctx = audioCtx(); if (ctx) { P.src && P.src.disconnect(); P.src = ctx.createMediaStreamSource(stream); P.an = ctx.createAnalyser(); P.an.fftSize = 1024; P.src.connect(P.an); } } catch (er) {}
    this.onChange();
  }
  volume(P) { const m = getMix(); if (P.audio) P.audio.volume = Math.max(0, Math.min(1, (m.chat ?? 1) * (m.master ?? 1))); }
  drop(id) { const P = this.peers.get(id); if (!P) return; this.peers.delete(id); this.level.delete(id);
    try { P.pc.close(); } catch (e) {} try { P.src && P.src.disconnect(); } catch (e) {} if (P.audio) { P.audio.srcObject = null; P.audio.remove(); } }
  // ---- how loud everyone is right now (the talking lights)
  rms(an) { if (!an) return 0; an.getFloatTimeDomainData(this._buf); let s = 0; for (let i = 0; i < this._buf.length; i++) s += this._buf[i] * this._buf[i]; return Math.sqrt(s / this._buf.length); }
  measure() {
    // a line that hasn't come up in 6 seconds (a message lost or crossed on the way): start it again, both ends
    const now = performance.now();
    if (this.on) for (const [id, P] of [...this.peers]) { const st = P.pc.connectionState;
      if (st !== 'connected' && now - P.born > 6000 && (P.tries || 0) < 8) { const tries = (P.tries || 0) + 1; this.drop(id); this.net.send({ t: 'vc', to: id, on: 1, re: 1, m: this.muted ? 1 : 0, s: this.sid }); const Q = this.connect(id); if (Q) { Q.tries = tries; Q.born = now + tries * 500; } } }
    const sm = (old, v) => v > old ? v : old * 0.8 + v * 0.2;
    this.myLevel = this.on && !this.muted ? sm(this.myLevel, this.rms(this.myAn)) : 0;
    for (const [id, P] of this.peers) { this.volume(P); const v = this.remoteOn.get(id) && this.remoteOn.get(id).muted ? 0 : this.rms(P.an); this.level.set(id, sm(this.level.get(id) || 0, v)); }
    if (this.onLevels) this.onLevels(this.levels());
  }
  // id -> 0..1 how much they're talking (0 = not), plus 'me'
  levels() { const o = new Map(); for (const [id, v] of this.level) o.set(id, v > TALK ? Math.min(1, v * 8) : 0); o.set('me', this.myLevel > TALK ? Math.min(1, this.myLevel * 8) : 0); return o; }
  // how quick the line to each talker is (round trip, and how much the receiving end is holding back), in ms
  async stats() { const out = {}; for (const [id, P] of this.peers) { let rtt = null, jb = null, jbMin = null, state = P.pc.connectionState;
      try { const r = await P.pc.getStats(); r.forEach(s => { if (s.type === 'candidate-pair' && s.nominated && s.currentRoundTripTime != null) rtt = s.currentRoundTripTime * 1000;
          if (s.type === 'inbound-rtp' && s.kind === 'audio' && s.jitterBufferEmittedCount) { const L = P.jbLast, n = s.jitterBufferEmittedCount, md = s.jitterBufferMinimumDelay || 0; if (L && n > L.n) { jb = (s.jitterBufferDelay - L.d) / (n - L.n) * 1000; jbMin = (md - L.m) / (n - L.n) * 1000; } P.jbLast = { d: s.jitterBufferDelay, n, m: md }; } }); } catch (e) {}      // (held back lately: since the last look, not since the start)
      out[id] = { rtt, jb, jbMin, state }; } return out; }      // (jbMin: the least this device's sound output lets it hold back)
  dispose() { this.stop(); clearInterval(this.tick); setNpcMute(false); }
}
