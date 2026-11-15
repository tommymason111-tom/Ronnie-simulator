// IMPOSTER: a multiplayer game at the Oysterfleet, played like Among Us.
//   - The host's game deals the roles: one (or two, the host picks) IMPOSTER, everyone else is THE FAITHFUL.
//   - The faithful each get five jobs round the pub (pour a Guinness, change the barrel, unblock the toilet...): every
//     job anyone finishes fills the TASK BAR. Fill it and the faithful win.
//   - The imposter has fake jobs to look busy, a KILL button (30 seconds between kills, counting down on the button),
//     SABOTAGE (lights out, or the keg pressure: fix it in time or the imposters win) and the TRAPDOORS to sneak about.
//   - Find a body: REPORT it. Or ring the LAST ORDERS bell in the middle of the pub (one emergency meeting each).
//     Everyone's brought to the middle; 90 seconds to talk and vote (or skip). The most votes (more than SKIP, no tie)
//     is thrown out of the pub, and everyone sees whether they were the imposter.
//   - Killed (or thrown out): you're a ghost. You see who did it, you can still do your jobs, watch everyone, and only
//     talk to other ghosts.
//   - Faithful win: every imposter thrown out, or the task bar full. Imposters win: as many imposters as faithful left,
//     or the keg goes up.
// The HOST's game is the referee (roles, kills, meetings, votes, who's won); everyone's game shows it.
import * as THREE from 'three';
import { sfx } from './audio.js';
import { Panel, makeGame, rr, txt } from './impgames.js';

export const IMP = { KILL_CD: 30, START_CD: 15, KILL_R: 1.8, REPORT_R: 2.6, USE_R: 1.55, MEET_T: 90, EMERG_CD: 15, TASKS_EACH: 5, SAB_CD: 30, CRIT_T: 45, MIN_PLAYERS: 3 };
const V = (x, z) => new THREE.Vector3(x, 0, z);
const CENTRE = V(0.9, -0.2);
const SEATS = [[2.2, -0.2], [1.89, 0.64], [1.12, 1.08], [-0.1, 0.63], [-0.4, -0.21], [1.14, -1.48], [1.91, -1.02], [3.15, 0.62], [2.74, 1.35], [2.09, 1.88], [1.31, 2.17], [-1.36, 0.6], [-1.5, -0.22], [-0.28, -2.29], [1.35, -2.56], [2.13, -2.26]];
// the jobs: where (stand here), what it's called, which room, which minigame
export const TASKS = [
  { id: 'guinness', name: 'Pour a perfect Guinness', room: 'THE BAR', at: [3.4, -6.0], kind: 'hold' },
  { id: 'barrel', name: 'Change the barrel', room: 'CELLAR HATCH', at: [4.5, -7.6], kind: 'crank', o: { title: 'CHANGE THE BARREL', hint: 'TURN THE COUPLER ROUND', turns: 3 } },
  { id: 'till', name: 'Take a card payment', room: 'THE BAR', at: [3.6, -2.5], kind: 'swipe', o: { title: 'TAKE A CARD PAYMENT' } },
  { id: 'jukebox', name: 'Fix the jukebox wiring', room: 'DJ BOOTH', at: [-1.0, -7.6], kind: 'wires' },
  { id: 'fruit', name: 'Empty the fruit machine', room: 'PUB FLOOR', at: [-0.49, -2.72], kind: 'collect', o: { title: 'EMPTY THE FRUIT MACHINE', icon: '🪙', into: '💰', n: 8, hint: 'TAP EVERY COIN' } },
  { id: 'toilet', name: 'Unblock the toilet', room: 'MEN\'S TOILETS', at: [-7.97, -11.8], kind: 'plunge' },
  { id: 'looroll', name: 'Restock the loo roll', room: 'WOMEN\'S TOILETS', at: [-2.5, -12.5], kind: 'collect', o: { title: 'RESTOCK THE LOO ROLL', icon: '🧻', into: '🚽', n: 6, hint: 'TAP EVERY ROLL' } },
  { id: 'bookings', name: 'Sort the bookings', room: 'ENTRANCE', at: [3.3, -11.5], kind: 'order' },
  { id: 'fryer', name: 'Clean the fryer', room: 'KITCHEN', at: [-12.35, -4.7], kind: 'scrub', o: { title: 'CLEAN THE FRYER', surface: '#9aa0a6' } },
  { id: 'empties', name: 'Collect the empties', room: 'RAISED BOOTHS', at: [-7, -4], kind: 'collect', o: { title: 'COLLECT THE EMPTIES', icon: '🍺', into: '🧺', n: 7, hint: 'TAP EVERY GLASS' } },
  { id: 'tables', name: 'Wipe the tables', room: 'CONSERVATORY', at: [-4, 11], kind: 'scrub', o: { title: 'WIPE THE TABLES' } },
  { id: 'slots', name: 'Reset the slot machine', room: 'GAMBLING ROOM', at: [7, 11], kind: 'code' },
  { id: 'keg', name: 'Check the keg pressure', room: 'KEG ROOM', at: [6.06, 2.83], kind: 'dial' },
  { id: 'rota', name: 'Clock in for your shift', room: 'STAFF ROOM', at: [7.16, -4.41], kind: 'swipe', o: { title: 'CLOCK IN FOR YOUR SHIFT' } },
];
const TASK = Object.fromEntries(TASKS.map(t => [t.id, t]));
const TASK_SIGN = { guinness: '🍺 POUR A GUINNESS', barrel: '🛢️ CHANGE THE BARREL', till: '💳 CARD MACHINE', jukebox: '🎵 JUKEBOX', fruit: '🍒 FRUIT MACHINE', toilet: '🚽 BLOCKED TOILET', looroll: '🧻 LOO ROLL',
  bookings: '📖 BOOKINGS', fryer: '🍟 THE FRYER', empties: '🍺 EMPTIES', tables: '🧽 WIPE TABLES', slots: '🎰 SLOT MACHINE', keg: '⏲️ KEG PRESSURE', rota: '🕒 CLOCK IN' };
// trapdoors (the imposter's vents): hop between them unseen
const VENTS = [{ name: 'CELLAR HATCH', at: [5.08, -7.81] }, { name: 'KITCHEN', at: [-12.5, -1.0] }, { name: 'GAMBLING ROOM', at: [6.5, 12.5] }, { name: 'MEN\'S TOILETS', at: [-6.53, -13.1] }];
const FUSE = { name: 'FUSE BOX · STAFF ROOM', at: [6.8, -2.0] };
const VALVES = [{ name: 'KEG ROOM VALVE', at: [8.1, 4.5] }, { name: 'KITCHEN VALVE', at: [-11.6, -2.0] }];
const SAB = { lights: { name: 'LIGHTS OUT', icon: '💡' }, keg: { name: 'KEG PRESSURE', icon: '🛢️', crit: true } };
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const now = () => performance.now() / 1000;
const portraits = {};
const portrait = (c) => { const id = c || 'ronnie'; if (!portraits[id]) { const im = new Image(); im.src = `./assets/portraits/${id}.webp`; portraits[id] = im; } return portraits[id]; };

export class Imposter {
  // g: { scene, room, player, net, mp, words, renderer, camera, items, tommy, avatarOf(id), selfBody(), charName(c), showBanner, restart(), leave() }
  constructor(g, nImp) {
    this.g = g; this.nImp = nImp; this.net = g.net; this.me = g.net.id; this.host = !!g.net.host;
    this.phase = 'waiting'; this.players = new Map(); this.bodies = []; this.bar = { done: 0, total: 1 }; this.sab = null; this.killCD = IMP.START_CD; this.sabCD = 10; this.emergCD = IMP.EMERG_CD;
    this.meeting = null; this.vented = null; this.spect = null; this.btnWas = {}; this.H = null; this.ghostTags = new Map(); this.alarmT = 0;
    this.grp = new THREE.Group(); g.scene.add(this.grp);
    this.panel = new Panel({ scene: g.scene, player: g.player, renderer: g.renderer });
    this.buildProps(); this.buildUI();
    // no food in this one: none at all, ever (the host's game takes it all away, and keeps it that way)
    this.clearFood();
    // the vision: you only see so far (further as an imposter; hardly at all with the lights out)
    this.fog0 = g.scene.fog; g.scene.fog = new THREE.Fog(0x05060a, 1e4, 2e4); g.scene.userData.fogLock = true;
    // nobody hits anybody, and you can only talk in meetings (ghosts only to ghosts)
    const mp = g.mp; mp.noPunch = true;
    mp.chatGate = () => { const me = this.mine(); if (!me || !me.alive) return { ok: true, ghost: true }; if (this.phase === 'meeting' || this.phase === 'waiting' || this.phase === 'over') return { ok: true }; return { ok: false, why: 'SHH! YOU CAN ONLY TALK IN MEETINGS' }; };
    mp.chatRecvGate = (m) => { const me = this.mine(); return !m.g || !me || !me.alive || this.phase === 'over'; };
    // the host's referee messages, and everyone's moves
    this.handlers = {};
    const on = (k, f) => { this.handlers[k] = f; this.net.on[k] = (m, p) => { try { f(m, p); } catch (e) { console.error('imposter', k, e); } }; };
    for (const k of ['imK', 'imT', 'imM', 'imV', 'imS', 'imF']) on(k, (m, p) => { if (this.host && p) this.hostIn(k, m, p.id); });
    for (const k of ['imStart', 'imDead', 'imBar', 'imMeet', 'imVoted', 'imRes', 'imRound', 'imSabOn', 'imSabOff', 'imFixed', 'imWin', 'imLobby', 'imSync']) on(k, (m) => { if (!this.host && (!m.to || m.to === this.me)) this.apply(k, m); });
    // a game that starts after the deal (pressed PLAY late): ask the host for where things are
    on('imHello', (m, p) => { if (this.host && p) this.hostHello(p.id); });
    on('imVent', (m, p) => { const pl = p && this.players.get(p.id); if (pl) { pl.vent = !!m.in; } });
    this.leaveWas = this.net.on.leave; this.net.on.leave = (m) => { this.leaveWas && this.leaveWas(m); if (this.host) this.hostLeft(m.id); };
    this.respawnRing();
    // the lobby: everyone wanders round the pub until the host rings the bell (3 or more players)
    this.needSpawn = 2; this.lobbyT = 0; g.player.noGrab = true; g.player.flatDrop && g.player.flatDrop(); for (const h of g.player.hands || []) if (h.held) { h.held.heldBy = null; h.held = null; }
    if (!this.host) this.net.send({ t: 'imHello' });
  }
  // ------------------------------------------------------------------ who's who
  mine() { return this.players.get(this.me); }
  amImp() { const m = this.mine(); return !!(m && m.imp); }
  alive(id) { const p = this.players.get(id); return !!(p && p.alive); }
  nameOf(id) { const p = this.players.get(id); return p ? p.name : 'Someone'; }
  posOf(id) {
    if (id === this.me) return this.g.player.head;
    const p = this.net.players.get(id); if (!p) return null;
    if (p.avatar && p.avatar.pos) return p.avatar.pos; return p.pose && p.pose.h ? new THREE.Vector3(...p.pose.h) : null;
  }
  roster() { const list = [{ id: this.net.id, name: this.net.name || 'You', char: this.net.char }]; for (const p of this.net.players.values()) list.push({ id: p.id, name: p.name || 'Player', char: p.char }); return list.sort((a, b) => String(a.id).localeCompare(String(b.id))); }
  hd(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

  // ------------------------------------------------------------------ the host: dealing, refereeing
  send(k, m) { m.t = k; this.net.send(m); this.apply(k, m); }        // (host: tell everyone, and do it here too)
  ask(k, m) { if (this.host) this.hostIn(k, m, this.me); else { m.t = k; this.net.send(m); } }   // (anyone: ask the referee)
  hostDeal() {
    const list = this.roster();
    if (list.length < IMP.MIN_PLAYERS) { this.send('imLobby', { n: list.length }); this.toast(`NEED ${IMP.MIN_PLAYERS}+ PLAYERS (${list.length} HERE)`); return; }
    let n = this.nImp; if (n > 1 && list.length < 5) n = 1;
    const imps = shuffle(list.map(p => p.id)).slice(0, n), pool = TASKS.map(t => t.id), tasks = {};
    for (const p of list) tasks[p.id] = shuffle(pool).slice(0, IMP.TASKS_EACH);
    this.H = { killCD: new Map(imps.map(id => [id, IMP.START_CD + 4])), emerg: new Map(list.map(p => [p.id, 1])), emergCD: IMP.EMERG_CD + 4, sabCD: 14, votes: null };
    this.dealMsg = { list, imps, tasks, n }; this.send('imStart', { ...this.dealMsg });
  }
  // someone's game started late: the deal again (just for them), then everything that's happened since
  hostHello(id) {
    if (!this.dealMsg) { this.net.send({ t: 'imLobby', n: this.roster().length }); return; }
    this.net.send({ t: 'imStart', to: id, ...this.dealMsg });
    const dead = [...this.players.values()].filter(p => !p.alive).map(p => p.id), done = {}; for (const p of this.players.values()) done[p.id] = [...p.done];
    this.net.send({ t: 'imSync', to: id, dead, done, bar: this.taskCount(), phase: this.phase === 'intro' ? 'intro' : 'play', sab: this.sab ? { k: this.sab.k, left: this.sab.until ? this.sab.until - now() : 0 } : null });
  }
  hostIn(k, m, from) {
    const H = this.H; if (!H || this.phase === 'over') return;
    const P = this.players.get(from); if (!P) return;
    if (k === 'imK') {          // a kill
      const v = this.players.get(m.v); if (this.phase !== 'play' || !P.realImp || !P.alive || !v || !v.alive || v.realImp || (H.killCD.get(from) || 0) > 0) return;
      const a = this.posOf(from), b = this.posOf(m.v); if (!a || !b || this.hd(a, b) > IMP.KILL_R + 0.6) return;
      H.killCD.set(from, IMP.KILL_CD); this.send('imDead', { v: m.v, k: from, p: [b.x, b.z] }); this.hostCheck();
    } else if (k === 'imT') {   // a job done
      if (!TASK[m.task] || !P.tasks.includes(m.task) || P.done.has(m.task) || P.realImp) return;
      P.done.add(m.task); this.send('imBar', { who: from, task: m.task, done: this.taskCount() }); this.hostCheck();
    } else if (k === 'imM') {   // a meeting: a body reported, or the bell rung
      if (this.phase !== 'play' || !P.alive) return;
      if (!m.body) { if ((H.emerg.get(from) || 0) <= 0 || H.emergCD > 0 || (this.sab && SAB[this.sab.k].crit)) return; H.emerg.set(from, H.emerg.get(from) - 1); }
      else { const b = this.bodies.find(b => b.id === m.body && !b.found); if (!b) return; }
      H.votes = new Map(); H.meetEnd = now() + IMP.MEET_T;
      const seats = {}; this.roster().forEach((p, i) => { seats[p.id] = i % SEATS.length; });
      this.send('imMeet', { by: from, body: m.body || null, dur: IMP.MEET_T, seats, emerg: m.body ? null : H.emerg.get(from) });
    } else if (k === 'imV') {   // a vote
      if (this.phase !== 'meeting' || !P.alive || !H.votes || H.votes.has(from)) return;
      const tgt = m.v === 'skip' ? 'skip' : this.players.get(m.v) && this.players.get(m.v).alive ? m.v : null; if (!tgt) return;
      H.votes.set(from, tgt); this.send('imVoted', { who: from });
      if ([...this.players.values()].filter(p => p.alive && !p.left).every(p => H.votes.has(p.id))) this.hostEndMeeting();
    } else if (k === 'imS') {   // sabotage
      if (this.phase !== 'play' || !P.realImp || this.sab || H.sabCD > 0 || !SAB[m.k]) return;
      H.sabCD = IMP.SAB_CD; this.send('imSabOn', { k: m.k, dur: SAB[m.k].crit ? IMP.CRIT_T : 0 });
    } else if (k === 'imF') {   // fixing it
      if (!this.sab || this.sab.k !== m.k) return;
      if (m.k === 'lights') this.send('imSabOff', { k: m.k, by: from });
      else { this.sab.fixed[m.part] = true; this.send('imFixed', { k: m.k, part: m.part }); if (VALVES.every((_, i) => this.sab.fixed[i])) this.send('imSabOff', { k: m.k, by: from }); }
    }
  }
  taskCount() { let n = 0; for (const p of this.players.values()) if (!p.realImp && !p.left) n += p.done.size; return n; }
  taskTotal() { let n = 0; for (const p of this.players.values()) if (!p.realImp && !p.left) n += p.tasks.length; return Math.max(1, n); }
  hostEndMeeting() {
    const H = this.H; if (!H.votes || this.phase !== 'meeting') return;
    const tally = new Map(); for (const v of H.votes.values()) tally.set(v, (tally.get(v) || 0) + 1);
    let top = null, best = 0, tie = false; for (const [id, n] of tally) { if (id === 'skip') continue; if (n > best) { best = n; top = id; tie = false; } else if (n === best) tie = true; }
    const skip = tally.get('skip') || 0, ej = top && !tie && best > skip ? top : null, wasImp = !!(ej && this.players.get(ej).realImp);
    const impsLeft = [...this.players.values()].filter(p => p.realImp && p.alive && p.id !== ej && !p.left).length;
    this.send('imRes', { votes: [...H.votes.entries()], ej, wasImp, tie: !ej && (tie || (best > 0 && best === skip)), impsLeft });
    H.votes = null; H.resumeT = 7.5;
  }
  hostCheck() {
    if (this.phase === 'over' || !this.H) return;
    const live = [...this.players.values()].filter(p => p.alive && !p.left), imps = live.filter(p => p.realImp).length, faith = live.length - imps;
    if (imps === 0) return this.send('imWin', { side: 'faithful', why: 'EVERY IMPOSTER HAS BEEN THROWN OUT' });
    if (this.taskCount() >= this.taskTotal()) return this.send('imWin', { side: 'faithful', why: 'EVERY JOB IN THE PUB IS DONE' });
    if (imps >= faith) return this.send('imWin', { side: 'imposter', why: 'THE IMPOSTERS OUTNUMBER THE FAITHFUL' });
  }
  hostLeft(id) { const p = this.players.get(id); if (!p) return; p.left = true; p.alive = false; if (this.phase === 'meeting' && this.H.votes) { this.H.votes.delete(id); } this.hostCheck(); }
  hostUpdate(dt) {
    if (this.phase === 'waiting') { if ((this.lobbyT -= dt) <= 0) { this.lobbyT = 2; this.send('imLobby', { n: this.roster().length }); } return; }
    const H = this.H; if (!H || this.phase === 'over') return;
    if (this.phase === 'play') { for (const [id, t] of H.killCD) H.killCD.set(id, t - dt); H.emergCD -= dt; if (!this.sab) H.sabCD -= dt;
      if (this.sab && this.sab.until && now() > this.sab.until) this.send('imWin', { side: 'imposter', why: 'THE KEG BLEW UP. THE CELLAR\'S GONE.' }); }
    if (this.phase === 'meeting' && H.votes && now() > H.meetEnd) this.hostEndMeeting();
    if (H.resumeT > 0) { H.resumeT -= dt; if (H.resumeT <= 0) { this.hostCheck(); if (this.phase !== 'over') { for (const id of H.killCD.keys()) H.killCD.set(id, IMP.KILL_CD); H.emergCD = IMP.EMERG_CD; H.sabCD = Math.max(H.sabCD, 10); this.send('imRound', {}); } } }
  }

  // ------------------------------------------------------------------ everyone: what the referee says happened
  apply(k, m) {
    const g = this.g;
    if (k === 'imLobby') { const ok = m.n >= IMP.MIN_PLAYERS; this.lobbyN = m.n; this.lobbyMsg = ok ? `${m.n} IN THE PUB. ${this.host ? 'YOU\'RE THE HOST: RING THE LAST ORDERS BELL IN THE MIDDLE TO START!' : 'WAITING FOR THE HOST TO RING THE BELL...'}` : `WAITING FOR PLAYERS: ${m.n} HERE (${IMP.MIN_PLAYERS}+ NEEDED). HAVE A WANDER ROUND.`; return; }
    if (k === 'imStart') {
      this.players.clear(); this.bodies.forEach(b => this.dropBody(b)); this.bodies = []; this.lobbyMsg = null;
      const iAmImp = m.imps.includes(this.me);
      for (const p of m.list) this.players.set(p.id, { id: p.id, name: p.name, char: p.char, alive: true, imp: m.imps.includes(p.id) && (iAmImp || p.id === this.me), realImp: m.imps.includes(p.id), tasks: m.tasks[p.id] || [], done: new Set(), left: false });
      this.impList = m.imps; this.nImpsNow = m.n; this.bar = { done: 0, total: 0 }; for (const p of m.list) if (!m.imps.includes(p.id)) this.bar.total += (m.tasks[p.id] || []).length;
      this.killCD = IMP.START_CD; this.sabCD = 14; this.emergCD = IMP.EMERG_CD; this.emergLeft = 1; this.sab = null; this.spect = null; this.setVent(null);
      this.phase = 'intro'; this.introT = 5; this.respawnRing(); this.showRole(); this.syncPuppets();
      return;
    }
    if (k === 'imDead') {
      const v = this.players.get(m.v); if (!v) return; v.alive = false; v.killedBy = m.k;
      const body = { id: m.v, at: V(m.p[0], m.p[1]), char: v.char, found: false }; this.bodies.push(body); this.makeBody(body);
      if (m.k === this.me) { this.killCD = IMP.KILL_CD; this.teleport(m.p[0], m.p[1]); }
      if (m.v === this.me) this.iDied(m.k, 'killed');
      this.syncPuppets(); return;
    }
    if (k === 'imSync') { for (const id of m.dead) { const p = this.players.get(id); if (p) p.alive = false; } for (const id in m.done) { const p = this.players.get(id); if (p) for (const t of m.done[id]) p.done.add(t); } this.bar.done = m.bar;
      if (m.phase === 'play') { this.phase = 'play'; this.introT = 0; } if (m.sab) { this.sab = { k: m.sab.k, until: m.sab.left ? now() + m.sab.left : 0, fixed: {} }; this.sabAlert(true); } this.setFog(); this.syncPuppets(); return; }
    if (k === 'imBar') { this.bar.done = m.done; const p = this.players.get(m.who); if (p) p.done.add(m.task); return; }
    if (k === 'imMeet') { this.startMeeting(m); return; }
    if (k === 'imVoted') { if (this.meeting) this.meeting.voted.add(m.who); sfx('clink', null, 0.6); return; }
    if (k === 'imRes') { this.showResult(m); return; }
    if (k === 'imRound') { this.endMeeting(); return; }
    if (k === 'imSabOn') { this.sab = { k: m.k, until: m.dur ? now() + m.dur : 0, fixed: {} }; this.sabCD = IMP.SAB_CD; this.sabAlert(true); return; }
    if (k === 'imFixed') { if (this.sab) this.sab.fixed[m.part] = true; sfx('ting', null, 0.7); return; }
    if (k === 'imSabOff') { if (this.sab) { this.sab = null; this.sabAlert(false); } if (this.panel.open && this.panel.cur && this.panel.cur.sabFix) this.panel.close(true); return; }
    if (k === 'imWin') { this.win(m); return; }
  }

  // ------------------------------------------------------------------ the pub: the bell, the markers, the trapdoors
  buildProps() {
    const g = this.g, room = g.room, fy = (x, z) => room.floorAt ? room.floorAt(x, z) : 0;
    const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
    // the LAST ORDERS bell: a round pedestal, a big red button under a glass dome, a brass bell on a post, a sign
    const b = new THREE.Group(); b.position.set(CENTRE.x, fy(CENTRE.x, CENTRE.z), CENTRE.z);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.95, 24), lam(0x5a2e14)); ped.position.y = 0.475; b.add(ped);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 28), lam(0x7a4020)); top.position.y = 0.97; b.add(top);
    const btnM = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.08, 24), lam(0xd81b2a, { emissive: 0x550000 })); btnM.position.y = 1.03; b.add(btnM); this.bigBtn = btnM;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.25, shininess: 120, depthWrite: false })); dome.position.y = 1.0; b.add(dome);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 8), lam(0xc9a24a)); post.position.set(0.32, 1.45, 0); b.add(post);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), lam(0xc9a24a)); arm.rotation.z = Math.PI / 2; arm.position.set(0.2, 1.93, 0); b.add(arm);
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), new THREE.MeshPhongMaterial({ color: 0xd4af37, shininess: 90, side: THREE.DoubleSide })); bell.position.set(0.08, 1.92, 0); b.add(bell); this.bell = bell;
    const c = document.createElement('canvas'); c.width = 512; c.height = 160; const x = c.getContext('2d'); x.fillStyle = '#1a0f0a'; rr(x, 0, 0, 512, 160, 24); x.fill(); x.lineWidth = 10; x.strokeStyle = '#d4af37'; rr(x, 5, 5, 502, 150, 22); x.stroke();
    txt(x, '🔔 LAST ORDERS! 🔔', 256, 52, 44, '#ffd400'); txt(x, 'EMERGENCY MEETING', 256, 112, 38, '#ff5252');
    const st = new THREE.CanvasTexture(c); st.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true })); sign.scale.set(0.9, 0.28, 1); sign.position.y = 2.3; b.add(sign);
    this.grp.add(b); this.bellGrp = b;
    // trapdoors (only an imposter sees them glow)
    this.ventMeshes = VENTS.map(v => { const m = new THREE.Group(); m.position.set(v.at[0], fy(v.at[0], v.at[1]) + 0.012, v.at[1]);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.8), lam(0x3a2414)); m.add(lid);
      for (let i = -1; i <= 1; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.025, 0.03), lam(0x241408)); s.position.set(0, 0.01, i * 0.22); m.add(s); }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 14), lam(0x888888)); ring.rotation.x = Math.PI / 2; ring.position.set(0.28, 0.02, 0); m.add(ring);
      const glow = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.58, 32), new THREE.MeshBasicMaterial({ color: 0xff2b2b, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.01; glow.name = 'glow'; m.add(glow);
      this.grp.add(m); return m; });
    // the job markers: a "!" over every job you've still to do, a ring on the floor where you stand to do it
    const mk = (col) => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x2 = cv.getContext('2d'); x2.fillStyle = col; x2.beginPath(); x2.arc(64, 64, 56, 0, 7); x2.fill(); x2.lineWidth = 8; x2.strokeStyle = '#000'; x2.stroke(); txt(x2, '!', 64, 70, 90, '#000'); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
    this.markTex = { task: mk('#ffd400'), fix: mk('#ff3b3b') };
    this.marks = new Map();
    const addMark = (key, at, kind) => { const gr = new THREE.Group(); gr.position.set(at[0], fy(at[0], at[1]), at[1]);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.markTex[kind], depthTest: false, transparent: true })); s.scale.setScalar(0.32); s.position.y = 2.55; s.renderOrder = 20; gr.add(s);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 32), new THREE.MeshBasicMaterial({ color: kind === 'fix' ? 0xff3b3b : 0xffd400, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; gr.add(ring);
      gr.visible = false; this.grp.add(gr); this.marks.set(key, gr); };
    for (const t of TASKS) addMark(t.id, t.at, 'task');
    addMark('fuse', FUSE.at, 'fix'); VALVES.forEach((v, i) => addMark('valve' + i, v.at, 'fix'));
    // every job has its own station, so you can see where it is: the kit for the job on a little stand, and a sign
    // hanging over it with its name (the fuse box and the two keg valves too)
    for (const t of TASKS) this.grp.add(this.station(t.id, t.at, TASK_SIGN[t.id]));
    this.grp.add(this.station('fuse', FUSE.at, '⚡ FUSE BOX')); VALVES.forEach((v, i) => this.grp.add(this.station('valve', v.at, '🛢️ ' + v.name)));
    // a frying pan for the kill (it comes down on their head)
    this.pan = new THREE.Group(); { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.04, 22), lam(0x222222)); this.pan.add(p); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.32, 8), lam(0x5a2e14)); h.rotation.z = Math.PI / 2; h.position.x = 0.32; this.pan.add(h); }
    this.pan.visible = false; this.grp.add(this.pan);
  }
  // the bodies: the player's own character, flat out on the floor, cartoon style (X eyes, stars going round, a splat)
  makeBody(b) {
    const g = this.g, av = this.avatar(b.id), fy = g.room.floorAt ? g.room.floorAt(b.at.x, b.at.z) : 0;
    b.grp = new THREE.Group(); b.grp.position.set(b.at.x, fy, b.at.z); this.grp.add(b.grp);
    const splat = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: 0x9c0f1a, transparent: true, opacity: 0.85, depthWrite: false })); splat.rotation.x = -Math.PI / 2; splat.position.y = 0.015; splat.scale.set(1.3, 0.8, 1); b.grp.add(splat);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const x = cv.getContext('2d'); txt(x, '✖  ✖', 128, 64, 70, '#fff'); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    b.eyes = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); b.eyes.scale.set(0.34, 0.17, 1); b.eyes.renderOrder = 21; b.grp.add(b.eyes);
    b.stars = []; for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.04), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd400 : 0xffffff })); b.grp.add(s); b.stars.push(s); }
    if (!av) { const blob = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.9, 4, 10), new THREE.MeshLambertMaterial({ color: 0x5b6cff })); blob.rotation.z = Math.PI / 2; blob.position.y = 0.2; b.grp.add(blob); }
    // the pan coming down
    this.panT = 0.001; this.panAt = b.at.clone().setY(fy + 2.0);
    const w = g.words; w && w.show(['BONK!', 'CLANG!', 'DONK!'][Math.floor(Math.random() * 3)], b.at.clone().setY(fy + 1.9), '#ff5252', 0.22, 1.2);
    sfx('thwack', b.at, 1); setTimeout(() => sfx('smash', b.at, 0.7), 120);
  }
  // one job's station: the kit for it (pub stuff), on the spot, and its sign hanging above
  station(id, at, label) {
    const g = new THREE.Group(), room = this.g.room, fy = room.floorAt ? room.floorAt(at[0], at[1]) : 0; g.position.set(at[0], fy, at[1]);
    const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o }), steel = new THREE.MeshPhongMaterial({ color: 0xb8bcc2, shininess: 90 }), dark = lam(0x1d1d1d), wood = lam(0x6a4426);
    const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; };
    const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (r1, r2, h, n = 16) => new THREE.CylinderGeometry(r1, r2, h, n);
    const stand = (h = 0.9) => { add(C(0.04, 0.04, h, 10), dark, 0, h / 2, 0); add(C(0.2, 0.22, 0.03, 18), dark, 0, 0.015, 0); add(B(0.42, 0.04, 0.32), wood, 0, h, 0); return h + 0.02; };
    // the kit: a little bit of the pub for each job (kept off to the side of where you stand)
    const k = new THREE.Group(); k.position.set(0.55, 0, 0); g.add(k); const kadd = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); k.add(o); return o; };
    const top = () => { kadd(C(0.04, 0.04, 0.9, 10), dark, 0, 0.45, 0); kadd(C(0.2, 0.22, 0.03, 18), dark, 0, 0.015, 0); kadd(B(0.44, 0.04, 0.34), wood, 0, 0.92, 0); return 0.94; };
    if (id === 'guinness') { const y = top(); kadd(C(0.035, 0.05, 0.3, 14), dark, 0, y + 0.15, 0); kadd(C(0.012, 0.012, 0.12, 8), steel, 0, y + 0.28, 0.06, Math.PI / 2); kadd(new THREE.CircleGeometry(0.05, 18), lam(0xd4af37), 0, y + 0.22, 0.036); kadd(C(0.035, 0.028, 0.12, 12), lam(0x140a06), 0.12, y + 0.06, 0); }
    else if (id === 'barrel' || id === 'keg' || id === 'valve') { for (const dx of id === 'barrel' ? [-0.18, 0.18] : [0]) { kadd(C(0.2, 0.2, 0.6, 20), steel, dx, 0.3, 0); for (const yy of [0.08, 0.52]) kadd(new THREE.TorusGeometry(0.2, 0.015, 6, 20), steel, dx, yy, 0, Math.PI / 2); kadd(C(0.05, 0.05, 0.06, 10), lam(id === 'valve' ? 0xd81b2a : 0x2a6df4), dx, 0.63, 0); }
      if (id === 'keg') { kadd(C(0.02, 0.02, 0.6, 8), dark, 0.32, 0.3, 0); kadd(C(0.09, 0.09, 0.03, 20), lam(0xffffff), 0.32, 0.66, 0, Math.PI / 2); kadd(B(0.01, 0.07, 0.005), lam(0xd81b2a), 0.32, 0.68, 0.017, 0, 0, 0.6); } }
    else if (id === 'till' || id === 'rota') { const y = top(); kadd(B(0.12, 0.18, 0.06), dark, 0, y + 0.09, 0, -0.3); kadd(B(0.09, 0.06, 0.005), lam(0x39ff14, { emissive: 0x115511 }), 0, y + 0.14, 0.033, -0.3); if (id === 'rota') kadd(B(0.3, 0.3, 0.02), lam(0xf5f0e0), 0, y + 0.45, -0.1); }
    else if (id === 'jukebox' || id === 'slots' || id === 'fruit') { const col = id === 'jukebox' ? 0xc62828 : id === 'slots' ? 0x2c3e8f : 0x6a1b9a; kadd(B(0.6, 1.4, 0.45), lam(col), 0, 0.7, 0); kadd(C(0.3, 0.3, 0.45, 20, 1, false, 0, Math.PI), lam(col), 0, 1.4, 0, Math.PI / 2, 0, Math.PI / 2);
      kadd(B(0.46, 0.4, 0.01), lam(0xffd400, { emissive: 0x664400 }), 0, 1.0, 0.23); for (let i = 0; i < 3; i++) kadd(B(0.1, 0.14, 0.012), lam(0xffffff), -0.13 + i * 0.13, 1.0, 0.235); if (id === 'fruit') kadd(C(0.12, 0.1, 0.14, 14), lam(0xd4af37), 0, 0.07, 0.4); }
    else if (id === 'toilet') { kadd(C(0.18, 0.13, 0.38, 18), lam(0xf8f8f8), 0, 0.19, 0); kadd(B(0.36, 0.38, 0.16), lam(0xf8f8f8), 0, 0.52, -0.18); kadd(new THREE.TorusGeometry(0.16, 0.03, 8, 18), lam(0xf8f8f8), 0, 0.39, 0, Math.PI / 2);
      kadd(C(0.012, 0.012, 0.6, 8), lam(0xb5651d), 0.25, 0.42, 0.1); kadd(new THREE.SphereGeometry(0.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam(0xd32f2f), 0.25, 0.1, 0.1, Math.PI); }
    else if (id === 'looroll') { kadd(B(0.5, 0.04, 0.4), steel, 0, 0.3, 0); for (const yy of [0.04, 0.3, 0.56]) kadd(B(0.5, 0.02, 0.4), steel, 0, yy, 0); for (let i = 0; i < 12; i++) kadd(C(0.055, 0.055, 0.11, 14), lam(0xffffff), -0.17 + (i % 4) * 0.115, (i < 4 ? 0.1 : i < 8 ? 0.37 : 0.63), -0.09 + (Math.floor(i / 2) % 2) * 0.18); }
    else if (id === 'bookings') { kadd(B(0.08, 1.0, 0.08), wood, 0, 0.5, 0); kadd(B(0.5, 0.04, 0.36), wood, 0, 1.02, 0, -0.35); kadd(B(0.44, 0.02, 0.3), lam(0xfff8dc), 0, 1.05, 0.01, -0.35); kadd(B(0.005, 0.03, 0.3), lam(0x7a1f3d), 0, 1.06, 0.01, -0.35); }
    else if (id === 'fryer') { kadd(B(0.55, 0.9, 0.55), steel, 0, 0.45, 0); kadd(B(0.45, 0.02, 0.45), lam(0xd9a03a), 0, 0.905, 0); kadd(B(0.22, 0.12, 0.2), new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true }), 0.1, 0.98, 0); kadd(C(0.01, 0.01, 0.35, 6), dark, 0.1, 1.05, 0.25, Math.PI / 2 - 0.4); }
    else if (id === 'empties') { const y = top(); kadd(C(0.18, 0.18, 0.02, 20), steel, 0, y + 0.01, 0); for (let i = 0; i < 6; i++) kadd(C(0.035, 0.028, 0.14, 10, 1, true), new THREE.MeshPhongMaterial({ color: 0xddeeff, transparent: true, opacity: 0.5 }), Math.cos(i) * 0.1, y + 0.08, Math.sin(i) * 0.1); }
    else if (id === 'tables') { kadd(B(0.4, 0.5, 0.3), lam(0xffd400), 0, 0.3, 0); kadd(C(0.12, 0.1, 0.22, 14), lam(0x1565c0), 0.05, 0.66, 0); kadd(C(0.035, 0.035, 0.18, 10), lam(0x29b6ff), -0.12, 0.64, 0.05); kadd(B(0.04, 0.05, 0.03), lam(0xffffff), -0.12, 0.76, 0.05); }
    else if (id === 'fuse') { kadd(B(0.06, 1.3, 0.06), dark, 0, 0.65, 0); kadd(B(0.45, 0.55, 0.12), lam(0x7a7f87), 0, 1.4, 0); kadd(B(0.4, 0.5, 0.01), lam(0xffd400), 0, 1.4, 0.065); }
    // the sign: hanging over the spot, double-sided, the job's name
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = '#1a0f0a'; rr(x, 4, 4, 504, 120, 26); x.fill(); x.lineWidth = 8; x.strokeStyle = '#d4af37'; rr(x, 8, 8, 496, 112, 22); x.stroke(); txt(x, label, 256, 66, 44, '#ffd400', 'center', 470);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true })); sign.scale.set(0.95, 0.24, 1); sign.position.set(0.55, 2.05, 0); g.add(sign);
    void stand; void add; return g;
  }
  dropBody(b) { if (b.grp) this.grp.remove(b.grp); }
  avatar(id) { if (id === this.me) return this.g.selfBody(); const p = this.net.players.get(id); return p && p.avatar; }
  // every player's character in the right state: alive (normal), a body (flat on the floor), a ghost (gone, unless
  // you're a ghost too), down a trapdoor (gone)
  syncPuppets() {
    const meDead = !(this.mine() && this.mine().alive);
    for (const p of this.players.values()) {
      const av = this.avatar(p.id); if (!av) continue;
      const body = this.bodies.find(b => b.id === p.id && !b.cleared);
      av.impBody = !!body; av.impHidden = !body && (!p.alive || p.vent) && !(p.id === this.me);
      av.impRed = this.amImp() && p.realImp && p.imp;
      if (p.id === this.me) av.impHidden = !p.alive;
      if (body && !av.impLaid) { av.impLaid = true; av.knock && av.knock(new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2), 3.2, body.at.clone().setY(1)); }
      if (!body && av.impLaid) { av.impLaid = false; if (av.down > 0) av.down = 0.01; }
    }
    // ghosts see ghosts
    for (const p of this.players.values()) {
      const want = meDead && !p.alive && p.id !== this.me; let s = this.ghostTags.get(p.id);
      if (want && !s) { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const x = cv.getContext('2d'); x.font = '150px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.globalAlpha = 0.8; x.fillText('👻', 128, 110); x.globalAlpha = 1; txt(x, p.name.toUpperCase(), 128, 220, 34, '#cfe0ff');
        const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, opacity: 0.75, depthWrite: false })); s.scale.setScalar(0.6); this.grp.add(s); this.ghostTags.set(p.id, s); }
      if (s) s.visible = want;
    }
  }
  // ------------------------------------------------------------------ the buttons
  buildUI() {
    const st = document.createElement('style'); st.id = 'imp-style';
    st.textContent = `body.imposter #btn-eat, body.imposter #btn-throw, body.imposter #pu-hud { display: none !important; }
#imp-ui { position: fixed; right: max(12px, env(safe-area-inset-right)); bottom: max(14px, env(safe-area-inset-bottom)); display: none; flex-direction: column; align-items: flex-end; gap: 10px; z-index: 45; pointer-events: none; }
body.imposter.flat #imp-ui { display: flex; }
#imp-ui .row { display: flex; gap: 10px; }
#imp-ui button { pointer-events: auto; width: 86px; height: 86px; border-radius: 50%; border: 4px solid #fff; color: #fff; font: 900 13px "Arial Black", Arial; text-shadow: 0 2px 3px #000; box-shadow: 0 4px 0 rgba(0,0,0,0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.05; padding: 0; }
#imp-ui button b { font-size: 30px; display: block; } #imp-ui button[hidden] { display: none; } #imp-ui button.off { filter: grayscale(1) brightness(0.55); }
#imp-ui .use { background: #2a6df4; } #imp-ui .rep { background: #f4511e; } #imp-ui .kill { background: #c62828; width: 100px; height: 100px; } #imp-ui .sab { background: #6a1b9a; } #imp-ui .vent { background: #4e342e; } #imp-ui .map, #imp-ui .spec { background: #37474f; width: 70px; height: 70px; font-size: 11px; }
body.imposter.flat .imp-hide-flat { display: none !important; }
#imp-tasks { position: fixed; left: max(10px, env(safe-area-inset-left)); top: max(46px, calc(env(safe-area-inset-top) + 40px)); z-index: 44; width: min(300px, 46vw); background: rgba(8,10,24,0.82); border: 3px solid #4fc3ff; border-radius: 14px; padding: 8px 10px; color: #fff; font: 700 12px Arial; pointer-events: none; display: none; }
body.imposter.flat #imp-tasks { display: block; } #imp-tasks.imp { border-color: #ff3b3b; } #imp-tasks.ghost { border-color: #9fb3d9; } #imp-tasks.sab { box-shadow: 0 0 0 3px #ff3b3b; }
#imp-tasks h5 { margin: 0 0 4px; font: 900 15px 'Arial Black', Arial; display: flex; justify-content: space-between; gap: 6px; } #imp-tasks h5 small { font: 900 11px Arial; color: #c9d3ff; align-self: center; }
#imp-tasks .bar { height: 14px; border-radius: 7px; background: #2b3350; position: relative; overflow: hidden; margin: 2px 0 6px; } #imp-tasks .bar i { position: absolute; inset: 0 auto 0 0; background: #39ff14; } #imp-tasks .bar span { position: absolute; inset: 0; text-align: center; font: 900 10px Arial; line-height: 14px; text-shadow: 0 1px 2px #000; }
#imp-tasks p { margin: 2px 0; line-height: 1.25; } #imp-tasks p.d { color: #39ff14; text-decoration: line-through; } #imp-tasks p.note { color: #ff8a8a; font-weight: 900; } #imp-tasks .sabl { margin-top: 5px; background: #b00; border-radius: 8px; padding: 3px 6px; font: 900 12px Arial; text-align: center; }
#imp-ui .cd { position: absolute; font: 900 34px "Arial Black", Arial; } #imp-ui button { position: relative; }
#imp-splash { position: fixed; inset: 0; z-index: 66; display: none; align-items: center; justify-content: center; flex-direction: column; background: radial-gradient(circle, rgba(0,0,0,0.55), rgba(0,0,0,0.92)); color: #fff; text-align: center; pointer-events: none; font-family: "Arial Black", Arial; }
#imp-splash.on { display: flex; } #imp-splash h1 { font-size: clamp(34px, 9vw, 80px); margin: 0; letter-spacing: 2px; } #imp-splash p { font-size: clamp(15px, 3.6vw, 26px); margin: 10px 18px; } #imp-splash .imgs { display: flex; gap: 12px; margin-top: 12px; } #imp-splash img { width: 92px; height: 92px; border-radius: 50%; border: 4px solid currentColor; object-fit: cover; }
#imp-alert { position: fixed; left: 50%; top: max(70px, env(safe-area-inset-top)); transform: translateX(-50%); z-index: 44; display: none; padding: 8px 18px; border-radius: 14px; background: rgba(150,0,0,0.85); border: 3px solid #fff; color: #fff; font: 900 16px "Arial Black", Arial; text-align: center; pointer-events: none; animation: impflash 0.8s infinite alternate; }
#imp-alert.on { display: block; } @keyframes impflash { from { background: rgba(150,0,0,0.85); } to { background: rgba(255,40,40,0.95); } }
#imp-map { position: fixed; right: max(8px, env(safe-area-inset-right)); top: max(86px, calc(env(safe-area-inset-top) + 80px)); z-index: 43; display: none; pointer-events: none; } #imp-map.on { display: block; } #imp-map canvas { width: min(56vw, 330px, 46vh); height: auto; border-radius: 14px; border: 3px solid #ffd400; box-shadow: 0 6px 18px rgba(0,0,0,0.5); }
#imp-sabm { position: fixed; inset: 0; z-index: 67; display: none; align-items: center; justify-content: center; gap: 16px; background: rgba(0,0,0,0.55); flex-wrap: wrap; } #imp-sabm.on { display: flex; }
#imp-sabm button { width: 150px; height: 150px; border-radius: 22px; border: 4px solid #fff; background: #6a1b9a; color: #fff; font: 900 16px "Arial Black", Arial; } #imp-sabm button b { display: block; font-size: 48px; }`;
    document.head.appendChild(st); this.style = st;
    const ui = document.createElement('div'); ui.id = 'imp-ui';
    ui.innerHTML = `<div class="row"><button class="map">🗺️<br>MAP</button><button class="spec" hidden>👀<br>WATCH</button></div>
<div class="row"><button class="vent" hidden><b>🕳️</b>TRAP<br>DOOR</button><button class="sab" hidden><b>⚡</b>SABO-<br>TAGE</button></div>
<div class="row"><button class="rep" hidden><b>📢</b>REPORT</button><button class="kill" hidden><b>🍳</b>KILL<span class="cd"></span></button><button class="use"><b>✋</b>USE</button></div>`;
    document.body.appendChild(ui); this.ui = ui; document.body.classList.add('imposter');
    const B = (c) => ui.querySelector('.' + c); this.B = { use: B('use'), rep: B('rep'), kill: B('kill'), sab: B('sab'), vent: B('vent'), map: B('map'), spec: B('spec') };
    const tap = (el, f) => { el.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); f(); }); };
    tap(this.B.use, () => this.doUse()); tap(this.B.rep, () => this.doReport()); tap(this.B.kill, () => this.doKill()); tap(this.B.sab, () => this.openSab()); tap(this.B.vent, () => this.doVent()); tap(this.B.map, () => this.toggleMap()); tap(this.B.spec, () => this.doSpectate());
    this.splash = document.createElement('div'); this.splash.id = 'imp-splash'; document.body.appendChild(this.splash);
    this.tasksEl = document.createElement('div'); this.tasksEl.id = 'imp-tasks'; document.body.appendChild(this.tasksEl);
    this.alertEl = document.createElement('div'); this.alertEl.id = 'imp-alert'; document.body.appendChild(this.alertEl);
    this.mapEl = document.createElement('div'); this.mapEl.id = 'imp-map'; this.mapCv = document.createElement('canvas'); this.mapCv.width = 600; this.mapCv.height = 780; this.mapEl.appendChild(this.mapCv); document.body.appendChild(this.mapEl);
    this.sabEl = document.createElement('div'); this.sabEl.id = 'imp-sabm'; this.sabEl.innerHTML = Object.entries(SAB).map(([k, s]) => `<button data-k="${k}"><b>${s.icon}</b>${s.name}${s.crit ? '<br><small>CRITICAL</small>' : ''}</button>`).join('') + '<button data-k="x" style="background:#444;width:90px;height:90px"><b>✕</b></button>';
    document.body.appendChild(this.sabEl);
    this.sabEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); const b = e.target.closest('button'); this.sabEl.classList.remove('on'); if (b && b.dataset.k !== 'x') this.ask('imS', { k: b.dataset.k }); });
    // keys on a computer: E use, R report, Q kill, X sabotage, V trapdoor, M map
    this.onKey = (e) => { if (e.repeat || /input|textarea/i.test(e.target.tagName)) return; const k = e.key.toLowerCase();
      if (k === 'e') this.doUse(); else if (k === 'r') this.doReport(); else if (k === 'q') this.doKill(); else if (k === 'x') this.openSab(); else if (k === 'v') this.doVent(); else if (k === 'm') this.toggleMap(); else return; e.stopPropagation(); };
    window.addEventListener('keydown', this.onKey, true);
  }
  // ------------------------------------------------------------------ what's near me (for the buttons)
  near() {
    const me = this.mine(), h = this.g.player.head, out = {}; if (this.phase === 'waiting') { if (this.hd(h, CENTRE) < 1.6) out.use = { kind: 'start' }; return out; }
    if (!me || this.phase !== 'play' || this.vented) { if (this.vented) out.vent = this.vented; return out; }
    // a job, a fix, the bell
    if (this.sab && me.alive) { if (this.sab.k === 'lights' && this.hd(h, V(...FUSE.at)) < IMP.USE_R) out.use = { kind: 'fix', k: 'lights' };
      if (this.sab.k === 'keg') VALVES.forEach((v, i) => { if (!this.sab.fixed[i] && this.hd(h, V(...v.at)) < IMP.USE_R) out.use = { kind: 'fix', k: 'keg', part: i }; }); }
    if (!out.use) for (const id of me.tasks) { if (me.done.has(id)) continue; if (this.hd(h, V(...TASK[id].at)) < IMP.USE_R) { out.use = { kind: 'task', id }; break; } }
    if (!out.use && me.alive && this.hd(h, CENTRE) < 1.6) out.use = { kind: 'bell' };
    if (me.alive) for (const b of this.bodies) if (!b.found && !b.cleared && this.hd(h, b.at) < IMP.REPORT_R) { out.body = b; break; }
    if (me.imp && me.alive) { let best = null, bd = IMP.KILL_R; for (const p of this.players.values()) { if (p.id === this.me || !p.alive || p.realImp || p.vent) continue; const q = this.posOf(p.id); if (!q) continue; const d = this.hd(h, q); if (d < bd) { bd = d; best = p; } } out.victim = best;
      for (const v of VENTS) if (this.hd(h, V(...v.at)) < 1.0) { out.vent = v; break; } }
    return out;
  }
  doUse() {
    if (this.panel.open || (this.phase !== 'play' && this.phase !== 'waiting')) return; const n = this.near();
    if (!n.use) { if (n.body) return this.doReport(); return; }
    const u = n.use, me = this.mine();
    if (u.kind === 'start') { if (!this.host) return this.toast('THE HOST RINGS THE BELL TO START'); for (let i = 0; i < 3; i++) setTimeout(() => sfx('ting', null, 1), i * 220); this.hostDeal(); return; }
    if (u.kind === 'bell') { if (this.emergLeft <= 0) return this.toast('YOU\'VE USED YOUR EMERGENCY MEETING'); if (this.emergCD > 0) return this.toast(`THE BELL'S READY IN ${Math.ceil(this.emergCD)}s`); if (this.sab && SAB[this.sab.k].crit) return this.toast('NOT DURING AN EMERGENCY! FIX THE KEG!'); this.ask('imM', {}); return; }
    if (u.kind === 'fix') { const game = u.k === 'lights' ? makeGame('switches', { title: 'FIX THE LIGHTS' }) : makeGame('crank', { title: VALVES[u.part].name, hint: 'RELEASE THE PRESSURE', turns: 2 }); game.sabFix = true;
      this.panel.show(game, { onDone: () => this.ask('imF', { k: u.k, part: u.part }) }); return; }
    if (u.kind === 'task') { const t = TASK[u.id];
      this.panel.show(makeGame(t.kind, t.o), { onDone: () => { if (me.imp) { me.done.add(u.id); this.toast('(FAKE JOB: YOU\'RE THE IMPOSTER)'); return; } this.ask('imT', { task: u.id }); this.toast(`✓ ${t.name.toUpperCase()}`); } }); }
  }
  doReport() { if (this.phase !== 'play') return; const n = this.near(); if (n.body) this.ask('imM', { body: n.body.id }); }
  doKill() { const n = this.near(); if (!this.amImp() || this.phase !== 'play') return; if (this.killCD > 0) { this.toast(`KILL READY IN ${Math.ceil(this.killCD)}s`); return; } if (!n.victim) { this.toast('NOBODY CLOSE ENOUGH'); return; } this.ask('imK', { v: n.victim.id }); }
  openSab() { if (!this.amImp() || this.phase !== 'play') return; if (this.sab) return this.toast('ALREADY SABOTAGED'); if (this.sabCD > 0) return this.toast(`SABOTAGE READY IN ${Math.ceil(this.sabCD)}s`);
    if (this.g.renderer.xr.isPresenting) { this.panel.show(this.sabScreen()); return; } this.sabEl.classList.add('on'); }
  sabScreen() { const ks = Object.keys(SAB), box = (i) => ({ x: 40 + i * 226, y: 150, w: 206, h: 220 });
    return { draw: (g) => { g.fillStyle = '#1d0a2a'; rr(g, 4, 4, 504, 504, 30); g.fill(); txt(g, 'SABOTAGE', 256, 60, 40, '#e040fb'); ks.forEach((k, i) => { const b = box(i); g.fillStyle = '#6a1b9a'; rr(g, b.x, b.y, b.w, b.h, 20); g.fill(); g.font = '80px serif'; g.textAlign = 'center'; g.fillText(SAB[k].icon, b.x + b.w / 2, b.y + 90); txt(g, SAB[k].name, b.x + b.w / 2, b.y + 170, 22); }); txt(g, 'B TO CLOSE', 256, 450, 20, '#ccc'); },
      down: (x, y) => { ks.forEach((k, i) => { const b = box(i); if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) { this.panel.close(true); this.ask('imS', { k }); } }); } }; }
  doVent() {
    if (!this.amImp()) return;
    if (this.vented) { const i = VENTS.indexOf(this.vented), nxt = VENTS[(i + 1) % VENTS.length]; this.teleport(nxt.at[0], nxt.at[1]); this.vented = nxt; sfx('thud', null, 0.6); return; }
    const n = this.near(); if (!n.vent) return; this.setVent(n.vent);
  }
  // down a trapdoor: nobody sees you; press again to pop out at the next one, USE (or walking off) to climb out
  setVent(v) { const was = this.vented; this.vented = v; if (!!was === !!v) return; const me = this.mine(); if (me) me.vent = !!v; this.net.send({ t: 'imVent', in: !!v }); sfx('thud', null, 0.8);
    this.g.player.menuLock = !!v; if (v) this.teleport(v.at[0], v.at[1]); this.syncPuppets(); }
  doSpectate() { const live = [...this.players.values()].filter(p => p.alive && p.id !== this.me); if (!live.length) { this.spect = null; return; } const i = live.findIndex(p => p.id === this.spect); this.spect = i + 1 >= live.length ? null : live[i + 1].id; this.toast(this.spect ? `WATCHING ${this.nameOf(this.spect).toUpperCase()}` : 'FREE GHOST'); }
  toast(s) { this.g.words && this.g.words.show(s, this.g.player.head.clone().addScaledVector(this.g.player.fwd, 0.8).add({ x: 0, y: 0.1, z: 0 }), '#ffd400', 0.07, 1.4); }
  // move myself (keeps a VR player's place in their play space)
  teleport(x, z, yaw) { const P = this.g.player, cam = P.camera.getWorldPosition(new THREE.Vector3()); P.rig.position.x += x - cam.x; P.rig.position.z += z - cam.z; P.head.x = x; P.head.z = z; if (yaw !== undefined && P.flatMode) { P.flatYaw = yaw - P.rig.rotation.y; } }
  respawnRing() { const list = this.roster(), i = Math.max(0, list.findIndex(p => p.id === this.me)), s = SEATS[i % SEATS.length]; this.teleport(s[0], s[1], Math.atan2(CENTRE.x - s[0], CENTRE.z - s[1]) + Math.PI); }

  // ------------------------------------------------------------------ the big moments
  showRole() {
    const me = this.mine(), imps = [...this.players.values()].filter(p => p.imp && p.realImp);
    const sp = this.splash, n = this.nImpsNow;
    if (me && me.imp) { sp.style.color = '#ff3b3b'; sp.innerHTML = `<p>SHHHHH!</p><h1>IMPOSTER</h1><p>Kill the faithful without getting caught. Look busy.</p><div class="imgs">${imps.map(p => `<img src="./assets/portraits/${p.char || 'ronnie'}.webp" title="${p.name}">`).join('')}</div><p>${imps.length > 1 ? 'Your fellow imposter: ' + imps.filter(p => p.id !== this.me).map(p => p.name).join(', ') : ''}</p>`; sfx('jet', null, 0.8); }
    else { sp.style.color = '#4fc3ff'; sp.innerHTML = `<p>YOU ARE</p><h1>THE FAITHFUL</h1><p>There ${n > 1 ? 'are' : 'is'} <b style="color:#ff3b3b">${n} IMPOSTER${n > 1 ? 'S' : ''}</b> among us</p><p>Do your jobs round the pub. Report bodies. Vote them out.</p>`; sfx('fanfare', null, 0.8); }
    sp.classList.add('on'); clearTimeout(this.splashT); this.splashT = setTimeout(() => sp.classList.remove('on'), 4800);
    if (this.g.renderer.xr.isPresenting) this.g.showBanner(me && me.imp ? 'SHHH! YOU ARE' : 'YOU ARE', me && me.imp ? 'THE IMPOSTER' : 'THE FAITHFUL');
  }
  iDied(by, how) {
    this.panel.close(true); this.setVent(null);
    const sp = this.splash, k = this.players.get(by);
    sp.style.color = '#ff5252'; sp.innerHTML = how === 'killed' ? `<p>🍳 BONK! 🍳</p><h1>YOU WERE KILLED</h1><div class="imgs"><img src="./assets/portraits/${k ? k.char || 'ronnie' : 'ronnie'}.webp"></div><p>by <b>${k ? k.name.toUpperCase() : 'SOMEONE'}</b></p><p style="color:#cfe0ff">You're a ghost 👻 Finish your jobs, watch the others. Only ghosts can hear you now.</p>`
      : `<h1>THROWN OUT</h1><p style="color:#cfe0ff">You're a ghost 👻 Only ghosts can hear you now.</p>`;
    sp.classList.add('on'); clearTimeout(this.splashT); this.splashT = setTimeout(() => sp.classList.remove('on'), 5500);
    if (this.g.renderer.xr.isPresenting) this.g.showBanner(how === 'killed' ? 'KILLED BY' : 'THROWN OUT', how === 'killed' ? (k ? k.name.toUpperCase() : '?') : 'YOU\'RE A GHOST');
    sfx('sadviolin', null, 0.8); this.setFog(); this.syncPuppets();
  }
  startMeeting(m) {
    this.phase = 'meeting'; this.panel.close(true); this.setVent(null); this.sabEl.classList.remove('on'); this.toggleMap(false); this.spect = null;
    if (this.sab) { this.sab = null; this.sabAlert(false); }
    const body = m.body ? this.bodies.find(b => b.id === m.body) : null; if (body) body.found = true;
    this.meeting = { by: m.by, body: m.body, end: now() + m.dur, voted: new Set(), myVote: null, pick: null, res: null };
    if (m.by === this.me && !m.body) this.emergLeft = m.emerg ?? 0;
    // everyone round the bell
    const s = SEATS[(m.seats && m.seats[this.me]) ?? 0]; this.teleport(s[0], s[1], Math.atan2(CENTRE.x - s[0], CENTRE.z - s[1]) + Math.PI);
    for (let i = 0; i < 3; i++) setTimeout(() => sfx('ting', null, 1), i * 260); sfx('whistle', null, 0.6);
    const sp = this.splash; sp.style.color = m.body ? '#ffab40' : '#ffd400';
    sp.innerHTML = m.body ? `<h1>📢 BODY REPORTED</h1><p><b>${this.nameOf(m.by).toUpperCase()}</b> found <b>${this.nameOf(m.body).toUpperCase()}</b></p>` : `<h1>🔔 LAST ORDERS!</h1><p><b>${this.nameOf(m.by).toUpperCase()}</b> called an EMERGENCY MEETING</p>`;
    sp.classList.add('on'); clearTimeout(this.splashT); this.splashT = setTimeout(() => { sp.classList.remove('on'); if (this.phase === 'meeting') this.panel.show(this.voteScreen(), { canClose: false }); }, 2600);
    if (this.g.renderer.xr.isPresenting) this.g.showBanner(m.body ? 'BODY REPORTED' : 'LAST ORDERS!', 'MEETING');
  }
  // the voting screen: everyone's face; tap one, then VOTE (or SKIP); dead people crossed out; ✓ for who's voted
  voteScreen() {
    const M = this.meeting, list = this.roster().map(r => this.players.get(r.id)).filter(Boolean), me = this.mine();
    const card = (i) => ({ x: 22 + (i % 2) * 238, y: 92 + Math.floor(i / 2) * 64, w: 228, h: 56 });
    const skipB = { x: 22, y: 452, w: 150, h: 46 }, okB = { x: 330, y: 452, w: 160, h: 46 };
    return {
      draw: (g) => {
        g.fillStyle = '#0f1430'; rr(g, 4, 4, 504, 504, 30); g.fill(); g.lineWidth = 8; g.strokeStyle = '#ffd400'; rr(g, 4, 4, 504, 504, 30); g.stroke();
        const left = Math.max(0, Math.ceil(M.end - now()));
        txt(g, M.res ? 'THE VOTES ARE IN' : 'WHO IS THE IMPOSTER?', 256, 36, 30, '#ffd400');
        txt(g, M.body ? `${this.nameOf(M.by)} found ${this.nameOf(M.body)}'s body` : `${this.nameOf(M.by)} rang the LAST ORDERS bell`, 180, 70, 17, '#ffab40', 'center', 330);
        txt(g, `⏱ ${left}s`, 450, 70, 24, left < 15 ? '#ff5252' : '#fff');
        const tally = new Map(); if (M.res) for (const [, v] of M.res.votes) tally.set(v, (tally.get(v) || 0) + 1);
        list.forEach((p, i) => { const b = card(i); if (b.y > 400) return; const sel = M.pick === p.id, mine = M.myVote === p.id;
          g.fillStyle = !p.alive ? '#2a2a33' : sel ? '#2f5bd8' : mine ? '#1b5e20' : '#e9ecf5'; rr(g, b.x, b.y, b.w, b.h, 12); g.fill();
          if (this.amImp() && p.realImp && p.imp) { g.lineWidth = 4; g.strokeStyle = '#ff3b3b'; rr(g, b.x, b.y, b.w, b.h, 12); g.stroke(); }
          const im = portrait(p.char); g.save(); g.beginPath(); g.arc(b.x + 30, b.y + 28, 22, 0, 7); g.clip(); if (im.complete && im.naturalWidth) g.drawImage(im, b.x + 8, b.y + 6, 44, 44); else { g.fillStyle = '#888'; g.fillRect(b.x + 8, b.y + 6, 44, 44); } g.restore();
          txt(g, p.name.toUpperCase() + (p.id === this.me ? ' (YOU)' : ''), b.x + 62, b.y + 28, 18, !p.alive ? '#777' : sel || mine ? '#fff' : '#111', 'left', 140);
          if (!p.alive) { g.strokeStyle = '#ff3b3b'; g.lineWidth = 5; g.beginPath(); g.moveTo(b.x + 12, b.y + 10); g.lineTo(b.x + 48, b.y + 46); g.moveTo(b.x + 48, b.y + 10); g.lineTo(b.x + 12, b.y + 46); g.stroke(); }
          if (M.voted.has(p.id) && !M.res) txt(g, '✓', b.x + b.w - 18, b.y + 28, 24, '#39ff14');
          if (M.res) { const n = tally.get(p.id) || 0; if (n) txt(g, `${n} 🗳`, b.x + b.w - 28, b.y + 28, 18, '#ff5252'); }
        });
        if (M.res) { txt(g, `SKIPPED: ${tally.get('skip') || 0}`, 256, 476, 22, '#ccc'); return; }
        const canVote = me && me.alive && !M.myVote;
        if (!me || !me.alive) txt(g, '👻 GHOSTS CAN\'T VOTE', 256, 476, 22, '#cfe0ff');
        else if (M.myVote) txt(g, M.myVote === 'skip' ? 'YOU SKIPPED · WAITING FOR THE OTHERS' : `YOU VOTED ${this.nameOf(M.myVote).toUpperCase()} · WAITING`, 256, 476, 18, '#9cff9c');
        else { g.fillStyle = '#555c7a'; rr(g, skipB.x, skipB.y, skipB.w, skipB.h, 12); g.fill(); txt(g, 'SKIP VOTE', skipB.x + skipB.w / 2, skipB.y + 24, 20);
          g.fillStyle = M.pick ? '#2e7d32' : '#3a3f55'; rr(g, okB.x, okB.y, okB.w, okB.h, 12); g.fill(); txt(g, M.pick ? `VOTE ${this.nameOf(M.pick).toUpperCase()}` : 'PICK SOMEONE', okB.x + okB.w / 2, okB.y + 24, 18, '#fff', 'center', 150); }
        void canVote;
      },
      down: (x, y) => {
        if (M.res || !me || !me.alive || M.myVote) return; const In = (b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h;
        list.forEach((p, i) => { const b = card(i); if (In(b) && p.alive) { M.pick = M.pick === p.id ? null : p.id; sfx('clink', null, 0.4); } });
        if (In(skipB)) { M.myVote = 'skip'; this.ask('imV', { v: 'skip' }); sfx('pop', null, 0.6); }
        if (In(okB) && M.pick) { M.myVote = M.pick; this.ask('imV', { v: M.pick }); sfx('pop', null, 0.6); }
      },
    };
  }
  showResult(m) {
    const M = this.meeting; if (!M) return; M.res = m; this.phase = 'eject';
    if (!this.panel.open) this.panel.show(this.voteScreen(), { canClose: false });
    setTimeout(() => { if (this.phase !== 'eject') return; this.panel.show(this.ejectScreen(m), { canClose: false }); sfx(m.ej ? 'whoosh' : 'boing', null, 0.8); }, 2600);
    if (m.ej) { const p = this.players.get(m.ej); if (p) { p.alive = false; p.realImp = m.wasImp; if (m.ej === this.me) setTimeout(() => this.iDied(null, 'ejected'), 7000); } }
  }
  // thrown out of the pub: the night street outside, them flying out of the door, spinning off into the distance
  ejectScreen(m) {
    const p = m.ej && this.players.get(m.ej), t0 = now(), name = p ? p.name.toUpperCase() : '';
    const l1 = p ? `${name} WAS THROWN OUT OF THE PUB.` : m.tie ? 'IT\'S A TIE. NOBODY WAS THROWN OUT.' : 'NOBODY WAS THROWN OUT. (SKIPPED)';
    const l2 = p ? (m.wasImp ? `${name} WAS THE IMPOSTER.` : `${name} WAS NOT THE IMPOSTER.`) : '', l3 = `${m.impsLeft} IMPOSTER${m.impsLeft === 1 ? '' : 'S'} REMAIN${m.impsLeft === 1 ? 'S' : ''}`;
    return { draw: (g) => { const t = now() - t0;
      const sky = g.createLinearGradient(0, 0, 0, 512); sky.addColorStop(0, '#05071a'); sky.addColorStop(1, '#1a1440'); g.fillStyle = sky; rr(g, 4, 4, 504, 504, 30); g.fill();
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + (i % 5) * 0.12})`; g.fillRect((i * 97 + t * 30 * (1 + i % 3)) % 512, (i * 53) % 300, 2, 2); }
      g.fillStyle = '#3a2214'; g.fillRect(0, 300, 120, 212); g.fillStyle = '#ffcf6a'; g.fillRect(30, 340, 70, 130); txt(g, 'THE OYSTERFLEET', 60, 320, 13, '#d4af37', 'center', 110);
      g.fillStyle = '#222'; g.fillRect(0, 470, 512, 42);
      if (p) { const k = Math.min(1, t / 3.2), x = 70 + k * 520, y = 400 - Math.sin(k * Math.PI) * 220, im = portrait(p.char);
        g.save(); g.translate(x, y); g.rotate(t * 7); g.beginPath(); g.arc(0, 0, 46, 0, 7); g.clip(); if (im.complete && im.naturalWidth) g.drawImage(im, -46, -46, 92, 92); else { g.fillStyle = '#5b6cff'; g.fillRect(-46, -46, 92, 92); } g.restore(); }
      const typed = (s, at) => s.slice(0, Math.max(0, Math.floor((t - at) * 22)));
      txt(g, typed(l1, 0.6), 256, 110, 24, '#fff'); if (l2) txt(g, typed(l2, 2.4), 256, 160, 24, m.wasImp ? '#ff5252' : '#4fc3ff'); txt(g, typed(l3, 3.6), 256, 210, 20, '#ffd400');
    } };
  }
  endMeeting() {
    this.panel.close(true); this.meeting = null; this.phase = 'play';
    for (const b of this.bodies) { b.cleared = true; this.dropBody(b); } this.syncPuppets();
    this.killCD = IMP.KILL_CD; this.emergCD = IMP.EMERG_CD; this.sabCD = Math.max(this.sabCD, 10);
    this.toast('BACK TO WORK');
  }
  sabAlert(on) {
    const el = this.alertEl; if (!on) { el.classList.remove('on'); this.setFog(); this.toast('FIXED ✓'); return; }
    sfx('thud', null, 1); this.setFog();
    if (this.g.renderer.xr.isPresenting) this.g.showBanner(SAB[this.sab.k].icon + ' SABOTAGE', SAB[this.sab.k].name);
  }
  setFog() { const me = this.mine(), f = this.g.scene.fog || (this.g.scene.fog = new THREE.Fog(0x05060a, 5, 13)); if (!me || !me.alive || this.phase === 'over' || this.phase === 'waiting') { f.near = 1e4; f.far = 2e4; return; } const dark = this.sab && this.sab.k === 'lights' && !me.imp; f.near = dark ? 0.8 : me.imp ? 7 : 5; f.far = dark ? 3.4 : me.imp ? 18 : 13; }
  win(m) {
    this.phase = 'over'; this.panel.close(true); this.setVent(null); this.sabEl.classList.remove('on'); this.alertEl.classList.remove('on'); this.phase = 'over'; this.setFog();
    const imps = (this.impList || []).map(id => this.players.get(id)).filter(Boolean), me = this.mine(), mine = me && (m.side === 'imposter' ? this.impList.includes(this.me) : !this.impList.includes(this.me));
    sfx(mine ? 'fanfare' : 'sadviolin', null, 1);
    const playB = { x: 40, y: 430, w: 200, h: 56 }, lobbyB = { x: 272, y: 430, w: 200, h: 56 };
    this.panel.show({ draw: (g) => {
      g.fillStyle = m.side === 'imposter' ? '#2a0508' : '#04142e'; rr(g, 4, 4, 504, 504, 30); g.fill(); g.lineWidth = 8; g.strokeStyle = m.side === 'imposter' ? '#ff3b3b' : '#4fc3ff'; rr(g, 4, 4, 504, 504, 30); g.stroke();
      txt(g, mine ? 'VICTORY' : 'DEFEAT', 256, 48, 44, mine ? '#ffd400' : '#9e9e9e');
      txt(g, m.side === 'imposter' ? 'THE IMPOSTERS WIN' : 'THE FAITHFUL WIN', 256, 100, 34, m.side === 'imposter' ? '#ff5252' : '#4fc3ff');
      txt(g, m.why, 256, 140, 17, '#fff');
      txt(g, `THE IMPOSTER${imps.length > 1 ? 'S WERE' : ' WAS'}:`, 256, 184, 20, '#ffab40');
      imps.forEach((p, i) => { const x = 256 + (i - (imps.length - 1) / 2) * 170, im = portrait(p.char); g.save(); g.beginPath(); g.arc(x, 268, 56, 0, 7); g.clip(); if (im.complete && im.naturalWidth) g.drawImage(im, x - 56, 212, 112, 112); g.restore(); g.lineWidth = 6; g.strokeStyle = '#ff3b3b'; g.beginPath(); g.arc(x, 268, 56, 0, 7); g.stroke(); txt(g, p.name.toUpperCase(), x, 346, 20, '#fff', 'center', 160); });
      txt(g, `JOBS DONE: ${this.bar.done}/${this.bar.total}`, 256, 390, 18, '#ccc');
      if (this.host) { g.fillStyle = '#2e7d32'; rr(g, playB.x, playB.y, playB.w, playB.h, 14); g.fill(); txt(g, '▶ PLAY AGAIN', playB.x + playB.w / 2, playB.y + 29, 22); }
      else txt(g, 'THE HOST CAN PLAY AGAIN', 140, 458, 15, '#aaa', 'center', 220);
      g.fillStyle = '#37474f'; rr(g, lobbyB.x, lobbyB.y, lobbyB.w, lobbyB.h, 14); g.fill(); txt(g, '↩ LOBBY', lobbyB.x + lobbyB.w / 2, lobbyB.y + 29, 22);
    }, down: (x, y) => { const In = (b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h; if (this.host && In(playB)) { this.panel.close(true); this.g.restart(); } else if (In(lobbyB)) this.g.leave(); } }, { canClose: false });
  }
  // ------------------------------------------------------------------ the map (phone / computer)
  toggleMap(on) { const want = on === undefined ? !this.mapEl.classList.contains('on') : on; this.mapEl.classList.toggle('on', want); if (want) this.drawMap(); }
  // a cartoon plan of the Oysterfleet: every room coloured and named, the bar, the bell in the middle, your jobs (yellow,
  // ticked when done), the fixes when something's sabotaged, trapdoors (imposters only) and you. Redrawn as you move.
  drawMap() {
    const c = this.mapCv, x = c.getContext('2d'), W = c.width, H = c.height, B = [-15, 11.5, -17, 17], sc = Math.min(W / (B[1] - B[0]), (H - 40) / (B[3] - B[2]));
    const px = (X) => (X - B[0]) * sc, pz = (Z) => 40 + (Z - B[2]) * sc;
    x.fillStyle = '#2f6b33'; x.fillRect(0, 0, W, H); for (let i = 0; i < 260; i++) { x.fillStyle = i % 2 ? '#357a3a' : '#2a5f2e'; x.fillRect((i * 97) % W, (i * 53) % H, 6, 6); }
    const room = (x0, x1, z0, z1, col, name, sz = 15) => { x.fillStyle = col; x.strokeStyle = '#2b1a10'; x.lineWidth = 5; x.beginPath(); x.roundRect(px(x0), pz(z0), (x1 - x0) * sc, (z1 - z0) * sc, 8); x.fill(); x.stroke();
      if (name) txt(x, name, px((x0 + x1) / 2), pz((z0 + z1) / 2), sz, '#fff', 'center', (x1 - x0) * sc - 6); };
    room(-9.72, 6.12, -8.88, 7.92, '#7a3b3b', '');                       // the pub floor (burgundy carpet)
    room(-9.72, -3.48, -8.88, -0.24, '#8d5a3a', 'RAISED BOOTHS', 14);
    room(-10.2, -4.44, -16.08, -12.24, '#9fb7c9', "MEN'S", 14); room(-9.24, -5.88, -12.24, -8.88, '#b4c6d6', 'DISABLED', 11); room(-5.88, -4.44, -12.24, -8.88, '#c9b8a0', '', 10);
    room(-4.44, 0.36, -15.12, -8.88, '#d9b8cc', "WOMEN'S", 14); room(0.36, 5.64, -14.16, -8.88, '#c8c0a8', 'ENTRANCE', 14);
    room(6.12, 10.68, -6.84, 0, '#a8b0bd', 'STAFF ROOM', 13); room(7.08, 10.68, 0, 7.92, '#8a9aa8', 'KEG ROOM', 13); room(5.64, 7.08, -1.2, 7.92, '#9a8a7a', '', 10);
    room(-13.8, -9.72, -8.88, 2.04, '#e0e0e0', 'KITCHEN', 14); room(-9.72, 4.68, 7.92, 16.08, '#e8dcc0', 'CONSERVATORY', 16); room(4.68, 9.0, 7.92, 15.48, '#2c3e8f', 'GAMBLING', 13);
    // the bar: a honey-oak L along the right of the pub floor, stools along it
    x.fillStyle = '#c98a48'; x.strokeStyle = '#5a2e14'; x.lineWidth = 4; x.beginPath(); x.moveTo(px(2.2), pz(-8.6)); x.lineTo(px(3.0), pz(-8.6)); x.lineTo(px(3.0), pz(-0.6)); x.lineTo(px(4.6), pz(-0.6)); x.lineTo(px(4.6), pz(6.2)); x.lineTo(px(3.8), pz(6.2)); x.lineTo(px(3.8), pz(0.2)); x.lineTo(px(2.2), pz(0.2)); x.closePath(); x.fill(); x.stroke();
    txt(x, 'THE BAR', px(3.6), pz(2.6), 13, '#fff');
    for (let z = -8; z < 0; z += 1.1) { x.fillStyle = '#7a1f2a'; x.beginPath(); x.arc(px(1.8), pz(z), 5, 0, 7); x.fill(); }
    for (const [tx, tz] of [[-1.5, -2.2], [0, -2.2], [-1, 1.8], [0.5, 1.8], [-6, -6], [-6, -3], [-4, 10], [0, 10], [-7, 13], [2, 13]]) { x.fillStyle = '#5a3a22'; x.beginPath(); x.arc(px(tx), pz(tz), 9, 0, 7); x.fill(); }
    x.fillStyle = '#222'; x.fillRect(px(-2.5), pz(-9.0), 2.1 * sc, 0.6 * sc); txt(x, 'DJ', px(-1.45), pz(-8.2), 12, '#ffd400');
    txt(x, 'BEER GARDEN ↓', px(-3), H - 14, 16, '#cfe8c0');
    // the bell, the jobs, the fixes, the trapdoors, you
    x.fillStyle = '#d81b2a'; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.arc(px(CENTRE.x), pz(CENTRE.z), 12, 0, 7); x.fill(); x.stroke(); txt(x, '🔔', px(CENTRE.x), pz(CENTRE.z) + 1, 13);
    const me = this.mine();
    if (me) for (const id of me.tasks) { const t = TASK[id], d = me.done.has(id); x.fillStyle = d ? '#39ff14' : '#ffd400'; x.strokeStyle = '#111'; x.beginPath(); x.arc(px(t.at[0]), pz(t.at[1]), 10, 0, 7); x.fill(); x.stroke(); txt(x, d ? '✓' : '!', px(t.at[0]), pz(t.at[1]) + 1, 13, '#111'); }
    if (this.sab) for (const pnt of this.sab.k === 'lights' ? [FUSE] : VALVES) { x.fillStyle = '#ff3b3b'; x.beginPath(); x.arc(px(pnt.at[0]), pz(pnt.at[1]), 13, 0, 7); x.fill(); txt(x, '⚠', px(pnt.at[0]), pz(pnt.at[1]) + 1, 14); }
    if (this.amImp()) for (const v of VENTS) { x.fillStyle = '#4e342e'; x.strokeStyle = '#ff3b3b'; x.lineWidth = 3; x.fillRect(px(v.at[0]) - 8, pz(v.at[1]) - 8, 16, 16); x.strokeRect(px(v.at[0]) - 8, pz(v.at[1]) - 8, 16, 16); }
    const P = this.g.player, h = P.head, a = Math.atan2(P.fwd.x, P.fwd.z);
    x.save(); x.translate(px(h.x), pz(h.z)); x.rotate(-a + Math.PI); x.fillStyle = '#4fc3ff'; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -14); x.lineTo(10, 10); x.lineTo(0, 5); x.lineTo(-10, 10); x.closePath(); x.fill(); x.stroke(); x.restore();
    x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(0, 0, W, 36); txt(x, '🗺️ THE OYSTERFLEET', W / 2, 19, 20, '#ffd400');
  }

  // ------------------------------------------------------------------ every frame
  clearFood() { const it = this.g.items; if (!it) return; it.minFood = 0; it.respawnQueue.length = 0; for (const f of it.items.slice()) if (!f.def.prop) it.remove(f); }
  update(dt) {
    const g = this.g, P = g.player, xr = g.renderer.xr.isPresenting;
    if (this.needSpawn > 0 && --this.needSpawn === 0) this.respawnRing();          // (a frame in: everyone starts round the bell)
    if (this.host) this.hostUpdate(dt);
    if ((this.foodT = (this.foodT || 0) - dt) <= 0) { this.foodT = 1; this.clearFood(); }
    this.panel.update(dt);
    if (this.phase === 'intro') { this.introT -= dt; if (this.introT <= 0) { this.phase = 'play'; this.setFog(); } }
    const me = this.mine(), alive = !!(me && me.alive);
    if (this.phase === 'play') { if (this.killCD > 0) this.killCD -= dt; if (this.sabCD > 0 && !this.sab) this.sabCD -= dt; if (this.emergCD > 0) this.emergCD -= dt; }
    // meeting: nobody moves (you're round the bell)
    if (this.phase === 'meeting' || this.phase === 'eject') { P.flatMove = { x: 0, z: 0 }; }
    if (this.vented) { P.flatMove = { x: 0, z: 0 }; const v = this.vented; if (this.hd(P.head, V(...v.at)) > 0.4) this.teleport(v.at[0], v.at[1]); }
    // ghost watching someone: stand just behind them
    if (this.spect && (!me || !me.alive)) { const q = this.posOf(this.spect), pl = this.net.players.get(this.spect); if (q && this.alive(this.spect) && P.flatMode) { const qq = pl && pl.pose && pl.pose.q ? new THREE.Quaternion(...pl.pose.q) : null, f = qq ? new THREE.Vector3(0, 0, -1).applyQuaternion(qq).setY(0).normalize() : new THREE.Vector3(0, 0, -1); this.teleport(q.x - f.x * 1.8, q.z - f.z * 1.8, Math.atan2(-f.x, -f.z)); } else this.spect = null; }
    // markers: my jobs still to do; the fixes when something's sabotaged
    for (const [key, m] of this.marks) {
      let on = false; if (this.phase === 'play' && me) { if (TASK[key]) on = me.tasks.includes(key) && !me.done.has(key); else if (key === 'fuse') on = !!(this.sab && this.sab.k === 'lights'); else on = !!(this.sab && this.sab.k === 'keg' && !this.sab.fixed[Number(key.slice(5))]); }
      m.visible = on; if (on) { m.children[0].position.y = 2.55 + Math.sin(performance.now() / 300) * 0.06; m.children[1].scale.setScalar(1 + Math.sin(performance.now() / 250) * 0.06); }
    }
    for (const vm of this.ventMeshes) vm.getObjectByName('glow').visible = this.amImp() && alive;
    this.bigBtn.material.emissive.setHex(this.phase === 'play' && Math.sin(performance.now() / 300) > 0 ? 0x990000 : 0x330000);
    // bodies: stars round the head; the pan coming down on a fresh one
    for (const b of this.bodies) { if (b.cleared || !b.grp) continue; const av = this.avatar(b.id), hp = av && av.c && av.c.headPos ? av.c.headPos(new THREE.Vector3()) : null;
      const at = hp ? b.grp.worldToLocal(hp.clone()) : new THREE.Vector3(0, 0.25, 0); b.eyes.position.copy(at).add({ x: 0, y: 0.18, z: 0 });
      b.stars.forEach((s, i) => { const a = performance.now() / 400 + i * Math.PI / 2; s.position.set(at.x + Math.cos(a) * 0.22, at.y + 0.3, at.z + Math.sin(a) * 0.22); s.rotation.y += dt * 4; }); }
    if (this.panT > 0) { this.panT += dt; const k = Math.min(1, this.panT / 0.35); this.pan.visible = this.panT < 0.9; this.pan.position.copy(this.panAt).add({ x: 0, y: -1.2 * k * k, z: 0 }); this.pan.rotation.x = -k * 1.4; if (this.panT > 0.9) this.panT = 0; }
    // ghosts (only other ghosts see them): float where they are
    for (const [id, s] of this.ghostTags) { if (!s.visible) continue; const q = this.posOf(id); if (q) s.position.set(q.x, q.y + 0.1 + Math.sin(performance.now() / 500) * 0.05, q.z); }
    // the critical sabotage: alarm, countdown
    if (this.sab) { const crit = this.sab.until, left = crit ? Math.max(0, Math.ceil(this.sab.until - now())) : 0;
      this.alertEl.classList.add('on'); this.alertEl.innerHTML = crit ? `🛢️ KEG PRESSURE! ${left}s<br><small>FIX BOTH VALVES: KEG ROOM ${this.sab.fixed[0] ? '✓' : '✗'} · KITCHEN ${this.sab.fixed[1] ? '✓' : '✗'}</small>` : '💡 LIGHTS OUT!<br><small>FIX THE FUSE BOX IN THE STAFF ROOM</small>';
      if (crit && (this.alarmT -= dt) <= 0) { this.alarmT = 1.1; sfx('whistle', null, 0.5); } }
    this.syncTick = (this.syncTick || 0) - dt; if (this.syncTick <= 0) { this.syncTick = 0.5; this.syncPuppets(); }
    // VR buttons: right A = use / report, left X = kill, left Y = sabotage, left grip-click (stick) = trapdoor
    if (xr) { const pad = (hand) => { const h = (P.hands || []).find(h => h.source && h.handedness === hand); return h && h.source.gamepad; }, R = pad('right'), L = pad('left');
      const press = (key, gp, i) => { const on = !!(gp && gp.buttons[i] && gp.buttons[i].pressed), was = this.btnWas[key]; this.btnWas[key] = on; return on && !was; };
      if (!this.panel.open) { if (press('a', R, 4)) { const n = this.near(); if (n.body && !n.use) this.doReport(); else this.doUse(); } if (press('x', L, 4)) this.doKill(); if (press('y', L, 5)) { if (this.near().vent || this.vented) this.doVent(); else this.openSab(); } } }
    else { this.drawButtons(me, alive); this.drawTasks(); if (this.mapEl.classList.contains('on') && (this.mapT = (this.mapT || 0) - dt) <= 0) { this.mapT = 0.2; this.drawMap(); } if (P.wrist && P.flatMode) P.wrist.visible = false; }
  }
  // phone / computer: the job list top left (role, the task bar, your jobs, what's sabotaged)
  drawTasks() {
    if ((this.taskT = (this.taskT || 0) - 1) > 0) return; this.taskT = 8;
    const st = this.hudState(), el = this.tasksEl, esc = (t) => String(t).replace(/</g, '&lt;');
    el.className = st.role === 'IMPOSTER' ? 'imp' : st.role === 'GHOST' ? 'ghost' : ''; if (st.sab) el.classList.add('sab');
    let h;
    if (!st.role) h = `<h5>🔪 IMPOSTER</h5><p>${esc(st.msg || 'GETTING READY...')}</p>`;
    else { const k = Math.min(100, Math.round(st.bar.done / Math.max(1, st.bar.total) * 100));
      h = `<h5>${st.role === 'GHOST' ? '👻 GHOST' : st.role === 'IMPOSTER' ? '<span style="color:#ff5252">🔪 IMPOSTER</span>' : '<span style="color:#4fc3ff">😇 THE FAITHFUL</span>'}<small>${st.meeting !== null ? '🗳 ' + st.meeting + 's' : st.kill !== null ? (st.kill > 0 ? '🍳 ' + st.kill + 's' : '🍳 READY') : st.alive + '/' + st.total + ' alive'}</small></h5>`
        + `<div class="bar"><i style="width:${k}%"></i><span>TOTAL JOBS ${st.bar.done}/${st.bar.total}</span></div>`
        + (st.imp ? '<p class="note">Kill the faithful. Fake jobs to look busy:</p>' : '')
        + st.tasks.map(t => `<p class="${t.done ? 'd' : ''}">${t.done ? '✓' : '•'} <b>${esc(t.room)}</b>: ${esc(t.name)}</p>`).join('')
        + (st.sab ? `<div class="sabl">⚠ ${esc(st.sab)} ⚠</div>` : ''); }
    if (h !== this.tasksHtml) { this.tasksHtml = h; el.innerHTML = h; }
  }
  drawButtons(me, alive) {
    const n = this.near(), B = this.B, play = this.phase === 'play', imp = this.amImp();
    B.use.classList.toggle('off', !n.use || !(play || this.phase === 'waiting')); B.use.querySelector('b').textContent = n.use ? (n.use.kind === 'bell' ? '🔔' : n.use.kind === 'fix' ? '🔧' : '✋') : '✋';
    B.rep.hidden = !(n.body && alive && play);
    B.kill.hidden = !(imp && alive); B.kill.classList.toggle('off', this.killCD > 0 || !n.victim || !play); B.kill.querySelector('.cd').textContent = this.killCD > 0 && play ? Math.ceil(this.killCD) : '';
    B.sab.hidden = !(imp && play); B.sab.classList.toggle('off', !!this.sab || this.sabCD > 0);
    B.vent.hidden = !(imp && alive && (n.vent || this.vented)); B.vent.querySelector('b').textContent = this.vented ? '➡️' : '🕳️';
    B.spec.hidden = !(me && !me.alive && this.phase === 'play');
  }
  // what goes in the box top left (and on your wrist in VR)
  hudState() {
    const me = this.mine(), left = this.meeting ? Math.max(0, Math.ceil(this.meeting.end - now())) : 0;
    return { phase: this.phase, msg: this.lobbyMsg, role: !me ? null : !me.alive ? 'GHOST' : me.imp ? 'IMPOSTER' : 'FAITHFUL', imp: !!(me && me.imp),
      bar: this.bar, tasks: me ? me.tasks.map(id => ({ name: TASK[id].name, room: TASK[id].room, done: me.done.has(id) })) : [],
      kill: me && me.imp && me.alive ? Math.ceil(Math.max(0, this.killCD)) : null, meeting: this.phase === 'meeting' ? left : null,
      sab: this.sab ? (this.sab.until ? `🛢️ KEG! ${Math.max(0, Math.ceil(this.sab.until - now()))}s` : '💡 LIGHTS OUT') : null,
      alive: [...this.players.values()].filter(p => p.alive).length, total: this.players.size };
  }
  dispose() {
    this.panel.close(true); this.panel.wrap.remove(); this.g.scene.remove(this.panel.mesh, this.panel.dot); this.g.scene.remove(this.grp);
    for (const el of [this.ui, this.splash, this.alertEl, this.mapEl, this.sabEl, this.style, this.tasksEl]) el && el.remove(); if (this.g.player.wrist && this.g.player.flatMode) this.g.player.wrist.visible = true;
    document.body.classList.remove('imposter'); window.removeEventListener('keydown', this.onKey, true);
    for (const k in this.handlers) delete this.net.on[k]; this.net.on.leave = this.leaveWas;
    const mp = this.g.mp; mp.noPunch = false; mp.chatGate = null; mp.chatRecvGate = null; this.g.player.noGrab = false;
    this.g.scene.fog = this.fog0 || null; this.g.scene.userData.fogLock = false; this.g.player.menuLock = false;
    for (const p of this.players.values()) { const av = this.avatar(p.id); if (av) { av.impBody = av.impHidden = av.impRed = false; av.impLaid = false; } }
  }
}
