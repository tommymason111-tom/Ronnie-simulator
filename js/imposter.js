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
import { FONT } from './textures.js';
import { REST } from './levels/oysterRestaurant.js';
import { CARPARK } from './levels/carpark.js';
import { roomNum } from './roomopts.js';
import { ImpReplay } from './impreplay.js';

// (the host's room options set some of these at the start of each game: roomopts.js)
export function impOpts() { IMP.KILL_CD = roomNum('kcd'); IMP.TASKS_EACH = roomNum('jobs'); IMP.MEET_T = roomNum('meet'); IMP.EMERGS = roomNum('emerg'); IMP.EJECTS = !!roomNum('ejects'); }
export const IMP = { EMERGS: 1, EJECTS: true, KILL_CD: 30, START_CD: 15, KILL_R: 1.8, REPORT_R: 2.6, USE_R: 1.55, MEET_T: 90, EMERG_CD: 15, TASKS_EACH: 5, SAB_CD: 30, CRIT_T: 45, MIN_PLAYERS: 3 };
const V = (x, z) => new THREE.Vector3(x, 0, z);
const CENTRE = V(0.9, -0.2);
const SEATS = [[2.2, -0.2], [1.89, 0.64], [1.12, 1.08], [-0.1, 0.63], [-0.4, -0.21], [1.14, -1.48], [1.91, -1.02], [3.15, 0.62], [2.74, 1.35], [2.09, 1.88], [1.31, 2.17], [-1.36, 0.6], [-1.5, -0.22], [-0.28, -2.29], [1.35, -2.56], [2.13, -2.26]];
// the jobs: where (stand here), what it's called, which room, which minigame
export const TASKS = [
  // kit: where the job's kit is in the pub, when it isn't on its own little stand beside the spot: [x, y, z, facing],
  // or the pub's own thing (a real fruit machine) with nothing extra built ('none')
  { id: 'guinness', name: 'Pour a perfect Guinness', room: 'THE BAR', at: [1.7, -5.9], kit: [2.55, 1.08, -5.9, -Math.PI / 2], kind: 'hold' },
  { id: 'barrel', name: 'Change the barrel', room: 'CELLAR HATCH', at: [4.5, -7.6], kind: 'coupler', o: { title: 'CHANGE THE BARREL' } },
  { id: 'till', name: 'Take a card payment', room: 'THE BAR', at: [1.7, -4.2], kit: [2.5, 1.08, -4.2, -Math.PI / 2], kind: 'swipe', o: { title: 'TAKE A CARD PAYMENT', need: 2 } },
  { id: 'jukebox', name: 'Fix the DJ decks wiring', room: 'DJ BOOTH', at: [-1.0, -7.6], kit: [-1.26, 0, -8.45, 0, 'none'], kind: 'wires', o: { title: 'FIX THE DJ DECKS WIRING', n: 6 } },      // (the pub's own DJ booth)
  { id: 'fruit', name: 'Empty the fruit machine', room: 'PUB FLOOR', at: [0.0, -3.48], kit: [-0.63, 0, -3.48, Math.PI / 2, 'none'], kind: 'reels', o: { title: 'EMPTY THE FRUIT MACHINE' } },
  { id: 'toilet', name: 'Unblock the toilet', room: 'MEN\'S TOILETS', at: [-7.97, -11.8], kind: 'plunge' },
  { id: 'looroll', name: 'Restock the loo roll', room: 'WOMEN\'S TOILETS', at: [-2.5, -12.5], kind: 'catch', o: { title: 'RESTOCK THE LOO ROLL', icon: '🧻' } },
  { id: 'bookings', name: 'Sort the bookings', room: 'RECEPTION', at: [1.75, -11.65], kit: [2.27, 0.795, -11.6, -Math.PI / 2], kind: 'order' },      // (behind the desk, on the staff worktop)
  { id: 'fryer', name: 'Clean the fryer', room: 'KITCHEN', at: [-12.95, -4.7], kind: 'temp', o: { title: 'CLEAN THE FRYER' } },
  { id: 'dishes', name: 'Wash the pots', room: 'KITCHEN', at: [-13.2, -1.3], kind: 'sort', o: { title: 'WASH THE POTS' } },
  { id: 'empties', name: 'Collect the empties', room: 'RAISED BOOTHS', at: [-7, -4], kind: 'whack', o: { title: 'COLLECT THE EMPTIES', icon: '🍺' } },
  { id: 'tables', name: 'Wipe the tables', room: 'CONSERVATORY', at: [-4, 11], kind: 'scrub', o: { title: 'WIPE THE TABLES', n: 10 } },
  { id: 'slots', name: 'Reset the slot machine', room: 'GAMBLING ROOM', at: [7.8, 10.32], kit: [8.42, 0, 10.32, -Math.PI / 2, 'none'], kind: 'code' },
  { id: 'keg', name: 'Check the keg pressure', room: 'KEG ROOM', at: [9.55, 5.05], kit: [10.3, 0, 5.05, -Math.PI / 2], kind: 'dial', o: { title: 'CHECK THE KEG PRESSURE', need: 4 } },      // (in the keg room, against the side wall)
  { id: 'rota', name: 'Clock in for your shift', room: 'STAFF ROOM', at: [9.95, -3.4], kit: [10.42, 0, -3.4, -Math.PI / 2], kind: 'simon', o: { title: 'CLOCK IN FOR YOUR SHIFT' } },
  { id: 'cutlery', name: 'Lay the tables', room: 'RESTAURANT', at: [-16.6, -3.0], kind: 'place', o: { title: 'LAY THE TABLES', icon: '🍴' } },
  { id: 'candles', name: 'Light the candles', room: 'RESTAURANT', at: [-16.6, 5.0], kind: 'light', o: { title: 'LIGHT THE CANDLES', icon: '🕯️' } },
  { id: 'parasol', name: 'Put the parasols up', room: 'BEER GARDEN', at: [0.25, 37.0], kind: 'raise', o: { title: 'PUT THE PARASOL UP' } },
  { id: 'gglasses', name: 'Clear the garden glasses', room: 'BEER GARDEN', at: [5.6, 37.0], kind: 'stacker', o: { title: 'CLEAR THE GARDEN GLASSES', icon: '🍹' } },
  { id: 'carglass', name: 'Sweep up the glass by Lewis\'s car', room: 'CAR PARK', at: [7.9, -12.7], kit: [8.35, 0, -10.88, 0, 'none'], kind: 'sweep', o: { title: 'SWEEP UP THE GLASS', icon: '💎' } },
  { id: 'barrier', name: 'Fix the car park barrier', room: 'CAR PARK', at: [8.6, -22.0], kit: [8.3, 0, -22.6, 0, 'none'], kind: 'pipes', o: { title: 'FIX THE CAR PARK BARRIER' } },
  // (the restaurant and the garden)
  { id: 'wine', name: 'Open the wine', room: 'RESTAURANT', at: [-15.5, -2.2], kit: [-14.85, 0.94, -2.2, -Math.PI / 2], kind: 'wine', o: { title: 'OPEN THE WINE' } },      // (behind the restaurant bar, on the back counter)
  { id: 'napkins', name: 'Fold the napkins', room: 'RESTAURANT', at: [-19.6, -13.25], kit: [-19.73, 0.95, -14.1, 0], kind: 'fold', o: { title: 'FOLD THE NAPKINS' } },      // (at the waiter's station)
  { id: 'bulbs', name: 'Change the chandelier bulbs', room: 'RESTAURANT', at: [-23.0, -2.1], kit: [-22.25, 0, -2.05, 0], kind: 'bulbs', o: { title: 'CHANGE THE BULBS' } },
  { id: 'bbq', name: 'Flip the burgers on the BBQ', room: 'BEER GARDEN', at: [-5.0, 41.3], kit: [-5.0, 0, 41.95, Math.PI], kind: 'grill', o: { title: 'FLIP THE BURGERS', need: 6 } },
  { id: 'baskets', name: 'Water the hanging baskets', room: 'BEER GARDEN', at: [6.3, 17.3], kit: [6.3, 0, 16.12, 0], kind: 'water', o: { title: 'WATER THE HANGING BASKETS' } },
  { id: 'stream', name: 'Fish the litter out of the stream', room: 'BEER GARDEN', at: [3.8, 19.9], kit: [4.6, 0, 19.95, 0], kind: 'net', o: { title: 'FISH OUT THE LITTER', need: 8 } },
];
const TASK = Object.fromEntries(TASKS.map(t => [t.id, t]));
const TASK_SIGN = { guinness: '🍺 POUR A GUINNESS', barrel: '🛢️ CHANGE THE BARREL', till: '💳 CARD MACHINE', jukebox: '🎧 DJ DECKS', fruit: '🍒 FRUIT MACHINE', toilet: '🚽 BLOCKED TOILET', looroll: '🧻 LOO ROLL',
  bookings: '📖 BOOKINGS', fryer: '🍟 THE FRYER', empties: '🍺 EMPTIES', tables: '🧽 WIPE TABLES', slots: '🎰 SLOT MACHINE', keg: '⏲️ KEG PRESSURE', rota: '🕒 CLOCK IN',
  dishes: '🍳 WASH THE POTS', cutlery: '🍴 LAY THE TABLES', candles: '🕯️ CANDLES', parasol: '⛱️ PARASOLS', gglasses: '🍹 GARDEN GLASSES', carglass: '🚗 SWEEP THE GLASS', barrier: '🚧 THE BARRIER',
  wine: '🍷 OPEN THE WINE', napkins: '🧻 FOLD NAPKINS', bulbs: '💡 CHANDELIER BULBS', bbq: '🍔 THE BBQ', baskets: '🌸 HANGING BASKETS', stream: '🥫 LITTER IN THE STREAM' };
// trapdoors (the imposter's vents): hop between them unseen
const VENTS = [{ name: 'CELLAR HATCH', at: [5.08, -7.81] }, { name: 'KITCHEN', at: [-12.6, -0.4] }, { name: 'GAMBLING ROOM', at: [6.5, 12.5] }, { name: 'MEN\'S TOILETS', at: [-6.53, -13.1] }];
const FUSE = { name: 'FUSE BOX · STAFF ROOM', at: [9.0, -0.7], kit: [9.0, 0, -0.07, Math.PI] };      // (on the staff room's right-hand wall as you come in)
const VALVES = [{ name: 'KEG ROOM VALVE', at: [8.1, 4.5] }, { name: 'KITCHEN VALVE', at: [-11.6, -2.0] }];
// SECURITY (like the cameras in Among Us): a desk in the staff room with a bank of monitors. Sit at it and you watch four
// live feeds, each a camera on a wall covering PART of an area (never the whole pub). You can't move while you watch,
// and while anyone's watching, every camera's red light blinks for everyone (so they know they might be seen).
export const SECURITY = { at: [7.15, -3.0], desk: [6.47, -3.0] };
export const CAMS = [
  { name: 'THE BAR', at: [-9.2, 2.6, 7.4], look: [0.5, 0.6, -3.0] },
  { name: 'CAR PARK', at: [6.4, 3.0, -9.3], look: [11.5, 0, -17] },
  { name: 'BEER GARDEN', at: [9.8, 3.2, 16.6], look: [0, 0.4, 28] },
  { name: 'KITCHEN', at: [-14.0, 2.5, 1.7], look: [-11.6, 0.6, -6.5] },
];
// the monitors: four live feeds (each re-filmed a few times a second, in turn), with a slight security-camera look:
// a little washed out and green, scanlines, grain, a REC light and the time. Tap a feed to blow it up, tap again to go back
export function makeCamFeeds({ renderer, scene, cams = CAMS }) {
  const FW = 236, FH = 152, feeds = cams.map((c, i) => { const cam = new THREE.PerspectiveCamera(64, FW / FH, 0.1, 70); cam.position.set(...c.at); cam.lookAt(...c.look); cam.updateMatrixWorld();
    const rt = new THREE.WebGLRenderTarget(FW, FH); rt.texture.colorSpace = THREE.SRGBColorSpace; const cv = document.createElement('canvas'); cv.width = FW; cv.height = FH;
    return { c, i, cam, rt, buf: new Uint8Array(FW * FH * 4), cv, img: cv.getContext('2d').createImageData(FW, FH), ready: false }; });
  let next = 0, acc = 0;
  const film = (f) => { const xr = renderer.xr.enabled, fog = scene.fog, prev = renderer.getRenderTarget();
    try { renderer.xr.enabled = false; scene.fog = null; renderer.setRenderTarget(f.rt); renderer.clear(); renderer.render(scene, f.cam); renderer.readRenderTargetPixels(f.rt, 0, 0, FW, FH, f.buf); }
    finally { renderer.setRenderTarget(prev); scene.fog = fog; renderer.xr.enabled = xr; }
    const src = f.buf, d = f.img.data;
    for (let y = 0; y < FH; y++) { const sr = (FH - 1 - y) * FW * 4, dr = y * FW * 4;
      for (let x = 0; x < FW * 4; x += 4) { const r = src[sr + x], gg = src[sr + x + 1], b = src[sr + x + 2], l = 0.3 * r + 0.59 * gg + 0.11 * b, n = (Math.random() - 0.5) * 14;
        d[dr + x] = r * 0.72 + l * 0.22 + n; d[dr + x + 1] = gg * 0.72 + l * 0.3 + 8 + n; d[dr + x + 2] = b * 0.7 + l * 0.2 + n; d[dr + x + 3] = 255; } }
    f.cv.getContext('2d').putImageData(f.img, 0, 0); f.ready = true; };
  const box = (i) => ({ x: 14 + (i % 2) * 248, y: 62 + Math.floor(i / 2) * 188, w: 236, h: 152 }), STOP = { x: 56, y: 436, w: 400, h: 64 };
  const s = { title: '📹 SECURITY', zoom: -1, done: false, feeds, bigClose: '✕ STOP WATCHING' };
  s.down = (x, y) => { if (x > STOP.x - 10 && x < STOP.x + STOP.w + 10 && y > STOP.y - 8 && y < STOP.y + STOP.h + 8) { s.quit = true; sfx('tap', null, 0.4); return; } if (s.zoom >= 0) { s.zoom = -1; return; } for (let i = 0; i < feeds.length; i++) { const b = box(i); if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h + 30) { s.zoom = i; sfx('tap', null, 0.4); } } };
  s.move = () => {}; s.up = () => {};
  s.update = (dt) => { acc += dt; if (acc < 0.06) return; acc = 0; if (s.zoom >= 0) { film(feeds[s.zoom]); return; } film(feeds[next]); next = (next + 1) % feeds.length; };
  s.dispose = () => { for (const f of feeds) f.rt.dispose(); };
  const feedDraw = (g, f, b, t) => { g.fillStyle = '#05080a'; g.fillRect(b.x, b.y, b.w, b.h);
    if (f.ready) g.drawImage(f.cv, b.x, b.y, b.w, b.h); else { for (let i = 0; i < 400; i++) { g.fillStyle = Math.random() < 0.5 ? '#333' : '#777'; g.fillRect(b.x + Math.random() * b.w, b.y + Math.random() * b.h, 3, 2); } }
    g.fillStyle = 'rgba(0,0,0,0.14)'; for (let y = b.y; y < b.y + b.h; y += 3) g.fillRect(b.x, y, b.w, 1);                       // scanlines
    const vg = g.createRadialGradient(b.x + b.w / 2, b.y + b.h / 2, b.h * 0.3, b.x + b.w / 2, b.y + b.h / 2, b.w * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)'); g.fillStyle = vg; g.fillRect(b.x, b.y, b.w, b.h);
    const band = (t * 40 + f.i * 37) % (b.h + 30) - 15; g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(b.x, b.y + Math.max(0, band), b.w, Math.max(0, Math.min(10, b.y + b.h - (b.y + band))));      // a slow rolling band
    const k = b.w / 236; g.font = `700 ${Math.round(11 * k)}px "Courier New", monospace`; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = 'rgba(230,255,230,0.85)';
    const now = new Date(); g.fillText(`CAM ${f.i + 1}  ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`, b.x + 6 * k, b.y + 5 * k);
    if (Math.floor(t * 2) % 2) { g.fillStyle = '#ff2a2a'; g.beginPath(); g.arc(b.x + b.w - 30 * k, b.y + 11 * k, 5 * k, 0, 7); g.fill(); } g.fillStyle = 'rgba(255,90,90,0.95)'; g.fillText('REC', b.x + b.w - 23 * k, b.y + 5 * k);
    g.strokeStyle = '#3a4a3a'; g.lineWidth = 3; g.strokeRect(b.x, b.y, b.w, b.h); };
  s.draw = (g, t) => { const bg = g.createLinearGradient(0, 0, 0, 512); bg.addColorStop(0, '#1d2128'); bg.addColorStop(1, '#0d1014'); g.fillStyle = bg; rr(g, 4, 4, 504, 504, 30); g.fill();
    g.lineWidth = 8; g.strokeStyle = '#5a6a7a'; rr(g, 4, 4, 504, 504, 30); g.stroke(); txt(g, s.zoom >= 0 ? `📹 CAM ${s.zoom + 1} · ${feeds[s.zoom].c.name}` : '📹 SECURITY CAMERAS', 256, 30, 26, '#e8f0ff'); if (s.zoom < 0) txt(g, 'TAP A CAMERA TO MAKE IT BIG', 256, 52, 12, '#7f8f9f');
    if (s.zoom >= 0) { feedDraw(g, feeds[s.zoom], { x: 16, y: 62, w: 480, h: 310 }, t); txt(g, 'TAP THE PICTURE TO GO BACK TO ALL FOUR', 256, 396, 17, '#9fb0c0'); }
    else { feeds.forEach((f, i) => { const b = box(i); feedDraw(g, f, b, t); g.fillStyle = '#0d1014'; g.fillRect(b.x, b.y + b.h, b.w, 26); txt(g, `${f.c.name}`, b.x + b.w / 2, b.y + b.h + 13, 15, '#c8d8c8'); }); }
    // the big red STOP WATCHING button along the bottom (easy to see and to hit, on a phone and in VR)
    const pulse = 0.5 + 0.5 * Math.sin(t * 4); g.fillStyle = '#7a1010'; rr(g, STOP.x, STOP.y + 5, STOP.w, STOP.h, 32); g.fill();
    g.fillStyle = '#d32f2f'; rr(g, STOP.x, STOP.y, STOP.w, STOP.h, 32); g.fill(); g.lineWidth = 4; g.strokeStyle = `rgba(255,212,0,${0.6 + 0.4 * pulse})`; rr(g, STOP.x, STOP.y, STOP.w, STOP.h, 32); g.stroke();
    txt(g, '✕  STOP WATCHING', 256, STOP.y + STOP.h / 2 + 1, 28, '#ffffff'); };
  return s;
}
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
    for (const k of ['imStart', 'imDead', 'imBar', 'imMeet', 'imVoted', 'imRes', 'imRound', 'imSabOn', 'imSabOff', 'imFixed', 'imWin', 'imLobby', 'imSync', 'imNo']) on(k, (m) => { if (!this.host && (!m.to || m.to === this.me)) this.apply(k, m); });
    // a game that starts after the deal (pressed PLAY late): ask the host for where things are
    on('imHello', (m, p) => { if (this.host && p) { this.hostBack(p.id); this.hostHello(p.id); } });
    on('imVent', (m, p) => { const pl = p && this.players.get(p.id); if (pl) { pl.vent = !!m.in; } });
    this.camWatchers = new Set(); on('imCams', (m, p) => { if (!p) return; if (m.on) this.camWatchers.add(p.id); else this.camWatchers.delete(p.id); });
    this.leaveWas = this.net.on.leave; this.net.on.leave = (m) => { this.leaveWas && this.leaveWas(m); this.camWatchers && this.camWatchers.delete(m.id); if (this.host) this.hostLeft(m.id); };
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
    impOpts(); const list = this.roster();
    if (list.length < IMP.MIN_PLAYERS) { this.send('imLobby', { n: list.length }); this.toast(`NEED ${IMP.MIN_PLAYERS}+ PLAYERS (${list.length} HERE)`); return; }
    let n = this.nImp; if (n > 1 && list.length < 5) n = 1;
    const imps = shuffle(list.map(p => p.id)).slice(0, n), pool = TASKS.map(t => t.id), tasks = {};
    for (const p of list) tasks[p.id] = shuffle(pool).slice(0, IMP.TASKS_EACH);
    this.H = { killCD: new Map(imps.map(id => [id, IMP.START_CD + 4])), emerg: new Map(list.map(p => [p.id, IMP.EMERGS])), emergCD: IMP.EMERG_CD - 1, sabCD: 14, votes: null };
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
      if (!m.body) { const why = (H.emerg.get(from) || 0) <= 0 ? 'YOU\'VE USED YOUR EMERGENCY MEETING' : H.emergCD > 0.5 ? `THE BELL'S READY IN ${Math.ceil(H.emergCD)}s` : (this.sab && SAB[this.sab.k].crit) ? 'NOT DURING AN EMERGENCY!' : null;
        if (why) { if (from === this.me) this.toast(why); else this.net.send({ t: 'imNo', to: from, why }); return; } H.emerg.set(from, H.emerg.get(from) - 1); }
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
  // someone's dropped out: they get 30 seconds to come back (a phone that lost signal, a reload) and carry on exactly
  // where they were (their role, their jobs, alive or dead). After that they've left: out of the game
  hostLeft(id) { const p = this.players.get(id); if (!p || p.left) return; clearTimeout(p.awayT); p.away = true;
    p.awayT = setTimeout(() => { if (p.away && this.host) this.hostGone(id); }, 30000); }
  hostBack(id) { const p = this.players.get(id); if (p && p.away) { p.away = false; clearTimeout(p.awayT); } }
  // we're the host now (the last one left): rebuild the referee's notebook from what we know, and carry on
  becomeHost() { if (this.host) return; this.host = true; const list = [...this.players.values()], imps = this.impList || list.filter(p => p.realImp).map(p => p.id);
    this.H = { killCD: new Map(imps.map(id => [id, IMP.KILL_CD / 2])), emerg: new Map(list.map(p => [p.id, 1])), emergCD: 5, sabCD: 15, votes: this.phase === 'meeting' ? new Map() : null, meetEnd: now() + 30, resumeT: this.phase === 'eject' ? 3 : 0 };
    if (list.length) this.dealMsg = { list: list.map(p => ({ id: p.id, name: p.name, char: p.char })), imps, tasks: Object.fromEntries(list.map(p => [p.id, p.tasks])), n: this.nImpsNow || imps.length };
    for (const p of list) if (p.id !== this.me && !this.net.players.has(p.id) && !p.left) this.hostLeft(p.id);      // (the old host, and anyone else not here: the usual 30 seconds)
    this.lobbyT = 0; }
  becomeGuest() { this.host = false; this.H = null; }
  hostGone(id) { const p = this.players.get(id); if (!p) return; p.left = true; p.alive = false; if (this.phase === 'meeting' && this.H.votes) { this.H.votes.delete(id); } this.hostCheck(); }
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
      impOpts(); (this.replay || (this.replay = new ImpReplay(this))).reset(); this.replayDone = false; this.players.clear(); this.bodies.forEach(b => this.dropBody(b)); this.bodies = []; this.lobbyMsg = null;
      const iAmImp = m.imps.includes(this.me);
      for (const p of m.list) this.players.set(p.id, { id: p.id, name: p.name, char: p.char, alive: true, imp: m.imps.includes(p.id) && (iAmImp || p.id === this.me), realImp: m.imps.includes(p.id), tasks: m.tasks[p.id] || [], done: new Set(), left: false });
      this.impList = m.imps; this.nImpsNow = m.n; this.bar = { done: 0, total: 0 }; for (const p of m.list) if (!m.imps.includes(p.id)) this.bar.total += (m.tasks[p.id] || []).length;
      this.killCD = IMP.START_CD; this.sabCD = 14; this.emergCD = IMP.EMERG_CD; this.emergLeft = IMP.EMERGS; this.sab = null; this.spect = null; this.setVent(null);
      this.phase = 'intro'; this.introT = 5; this.respawnRing(); this.showRole(); this.syncPuppets();
      return;
    }
    if (k === 'imDead') {
      const v = this.players.get(m.v); if (!v) return; v.alive = false; v.killedBy = m.k; this.replay && this.replay.event('kill', { v: m.v, k: m.k, p: m.p });
      const body = { id: m.v, at: V(m.p[0], m.p[1]), char: v.char, found: false }; this.bodies.push(body); this.makeBody(body);
      if (m.k === this.me) { this.killCD = IMP.KILL_CD; this.teleport(m.p[0], m.p[1]); }
      if (m.v === this.me) this.iDied(m.k, 'killed');
      this.syncPuppets(); return;
    }
    if (k === 'imSync') { for (const id of m.dead) { const p = this.players.get(id); if (p) p.alive = false; } for (const id in m.done) { const p = this.players.get(id); if (p) for (const t of m.done[id]) p.done.add(t); } this.bar.done = m.bar;
      if (m.phase === 'play') { this.phase = 'play'; this.introT = 0; } if (m.sab) { this.sab = { k: m.sab.k, until: m.sab.left ? now() + m.sab.left : 0, fixed: {} }; this.sabAlert(true); } this.setFog(); this.syncPuppets(); return; }
    if (k === 'imBar') { this.bar.done = m.done; const p = this.players.get(m.who); if (p) p.done.add(m.task); if (m.who === this.me && TASK[m.task]) this.burst(V(...TASK[m.task].at).setY(1.3), [0xffd400, 0x39ff14, 0xffffff], 26); return; }
    if (k === 'imMeet') { this.replay && this.replay.event(m.body ? 'report' : 'meeting', { by: m.by }); this.startMeeting(m); return; }
    if (k === 'imVoted') { if (this.meeting) this.meeting.voted.add(m.who); sfx('vote', null, 0.6); return; }
    if (k === 'imRes') { this.showResult(m); return; }
    if (k === 'imRound') { this.endMeeting(); return; }
    if (k === 'imSabOn') { this.replay && this.replay.event('sab', { k: m.k }); this.sab = { k: m.k, until: m.dur ? now() + m.dur : 0, fixed: {} }; this.sabCD = IMP.SAB_CD; this.sabAlert(true); return; }
    if (k === 'imFixed') { if (this.sab) this.sab.fixed[m.part] = true; sfx('fixed', null, 0.7); return; }
    if (k === 'imSabOff') { if (this.sab) { this.sab = null; this.sabAlert(false); } if (this.panel.open && this.panel.cur && this.panel.cur.sabFix) this.panel.close(true); return; }
    if (k === 'imWin') { this.win(m); return; }
    if (k === 'imNo') { this.toast(m.why); return; }
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
    for (const t of TASKS) this.grp.add(this.station(t.id, t.at, TASK_SIGN[t.id], t.kit));
    // security: the desk against the staff room wall, four monitors on it, a chair; and the four cameras round the place
    { const D = new THREE.Group(); D.position.set(SECURITY.desk[0], 0, SECURITY.desk[1]); D.rotation.y = Math.PI / 2; const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
      const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); D.add(o); return o; };
      add(new THREE.BoxGeometry(1.4, 0.05, 0.62), lam(0x3a3f48), 0, 0.76, 0); for (const x of [-0.66, 0.66]) add(new THREE.BoxGeometry(0.05, 0.74, 0.58), lam(0x2a2e35), x, 0.37, 0);
      const scr = document.createElement('canvas'); scr.width = 256; scr.height = 160; { const g = scr.getContext('2d'); g.fillStyle = '#0b1a12'; g.fillRect(0, 0, 256, 160); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(160,255,170,${Math.random() * 0.25})`; g.fillRect(Math.random() * 256, Math.random() * 160, 2, 1); } g.fillStyle = '#7dff8a'; g.font = '700 22px monospace'; g.fillText('CAM', 14, 34); g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(230, 22, 7, 0, 7); g.fill(); }
      const st = new THREE.CanvasTexture(scr); st.colorSpace = THREE.SRGBColorSpace;
      for (let i = 0; i < 4; i++) { const x = (i % 2 ? 0.27 : -0.27), y = 1.08 + Math.floor(i / 2) * 0.34; add(new THREE.BoxGeometry(0.5, 0.31, 0.05), lam(0x111111), x, y, -0.2); const m = add(new THREE.PlaneGeometry(0.46, 0.27), new THREE.MeshBasicMaterial({ map: st, toneMapped: false }), x, y, -0.172); m.userData.screen = true; }
      add(new THREE.BoxGeometry(0.06, 0.32, 0.06), lam(0x222222), 0, 0.92, -0.22); add(new THREE.BoxGeometry(0.44, 0.02, 0.15), lam(0x222222), 0, 0.79, 0.1);
      add(new THREE.CylinderGeometry(0.24, 0.24, 0.07, 16), lam(0x1a1a1a), 0, 0.47, 0.62); add(new THREE.BoxGeometry(0.44, 0.48, 0.06), lam(0x1a1a1a), 0, 0.75, 0.85); add(new THREE.CylinderGeometry(0.03, 0.03, 0.44, 8), lam(0x555555), 0, 0.22, 0.62);
      this.grp.add(D); this.secDesk = D;
      this.grp.add(this.station('security', SECURITY.at, '📹 SECURITY', [SECURITY.desk[0], 0, SECURITY.desk[1], Math.PI / 2, 'none']));
      this.camLeds = CAMS.map(c => { const g = new THREE.Group(); g.position.set(...c.at); g.lookAt(...c.look);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.3), lam(0xe8e8e8)); body.position.z = 0.05; g.add(body);
        const hood = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.36), lam(0xd0d0d0)); hood.position.set(0, 0.08, 0.06); g.add(hood);
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.04, 16), lam(0x111111)); lens.rotation.x = Math.PI / 2; lens.position.z = 0.21; g.add(lens);
        const glass = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), new THREE.MeshBasicMaterial({ color: 0x1a3a5a })); glass.position.z = 0.232; g.add(glass);
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0x330000 })); led.position.set(0.055, 0.035, 0.205); g.add(led);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), lam(0x9aa0a6)); arm.position.set(0, 0.04, -0.18); arm.rotation.x = Math.PI / 2; g.add(arm);
        this.grp.add(g); return led; }); }
    this.grp.add(this.station('fuse', FUSE.at, '⚡ FUSE BOX', FUSE.kit)); VALVES.forEach((v, i) => this.grp.add(this.station('valve', v.at, '🛢️ ' + v.name)));
    // a frying pan for the kill (it comes down on their head)
    this.pan = new THREE.Group(); { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.04, 22), lam(0x222222)); this.pan.add(p); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.32, 8), lam(0x5a2e14)); h.rotation.z = Math.PI / 2; h.position.x = 0.32; this.pan.add(h); }
    this.pan.visible = false; this.grp.add(this.pan);
    this.panTrail = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.02, 24, 1, false, 0, 1.4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide })); this.panTrail.visible = false; this.grp.add(this.panTrail);
  }
  // the bodies: the player's own character, flat out on the floor, cartoon style (X eyes, stars going round, a splat)
  makeBody(b) {
    const g = this.g, av = this.avatar(b.id), fy = g.room.floorAt ? g.room.floorAt(b.at.x, b.at.z) : 0;
    b.grp = new THREE.Group(); b.grp.position.set(b.at.x, fy, b.at.z); this.grp.add(b.grp);
    // lined up with the body (it lies on its back along its own facing, head behind where it stood)
    const yaw = av && av.c && av.c.rag ? av.c.rag.yaw : Math.random() * 6.28, kH = av && av.c && av.c.rag ? av.c.rag.height / 1.68 : 1; b.grp.rotation.y = yaw;
    // the pool of blood: dark, glossy, an irregular spread that seeps out from under the body over a few seconds
    { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'); const blob = (cx, cy, r, col) => { x.fillStyle = col; x.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, rr = r * (0.82 + 0.18 * Math.sin(a * 3 + cx) + 0.1 * Math.sin(a * 7 + cy)); x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.fill(); };
      blob(128, 120, 92, '#5a0008'); blob(150, 150, 60, '#5a0008'); blob(96, 90, 54, '#5a0008'); blob(124, 118, 70, '#7a000c'); blob(140, 140, 40, '#8e0a14');
      x.fillStyle = 'rgba(255,255,255,0.25)'; x.beginPath(); x.ellipse(110, 96, 22, 8, -0.5, 0, 7); x.fill();
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      b.pool = new THREE.Mesh(new THREE.PlaneGeometry(1.5 * kH, 1.5 * kH), new THREE.MeshPhongMaterial({ map: t, transparent: true, shininess: 120, specular: 0x552222, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      b.pool.rotation.x = -Math.PI / 2; b.pool.position.set(0, 0.012, -0.3 * kH); b.pool.scale.setScalar(0.05); b.grp.add(b.pool); b.poolT = 0; }
    // the white tape outline round where they lie, like a crime scene
    { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 320; const x = cv.getContext('2d'); x.lineCap = x.lineJoin = 'round';
      const fig = (w, col) => { x.strokeStyle = col; x.fillStyle = col; x.lineWidth = w; x.beginPath(); x.arc(128, 46, 24 + w / 2 - 6, 0, 7); x.fill();
        const seg = (pts) => { x.beginPath(); x.moveTo(...pts[0]); for (const p of pts.slice(1)) x.lineTo(...p); x.stroke(); };
        x.lineWidth = w + 34; seg([[128, 78], [128, 176]]); x.lineWidth = w + 16;
        seg([[146, 92], [196, 60], [224, 22]]); seg([[110, 92], [64, 132], [44, 182]]); seg([[138, 176], [170, 240], [196, 304]]); seg([[118, 176], [104, 244], [92, 306]]); };
      fig(10, '#ffffff'); x.globalCompositeOperation = 'destination-out'; fig(0, '#000'); x.globalCompositeOperation = 'source-over';
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      const o = new THREE.Mesh(new THREE.PlaneGeometry(1.25 * kH, 1.56 * kH), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
      o.rotation.x = -Math.PI / 2; o.position.set(0, 0.014, 0.08 * kH); b.grp.add(o); }      // (centred on the whole body: head at -0.7, feet at +0.9 from the hips)
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const x = cv.getContext('2d'); txt(x, '✖  ✖', 128, 64, 70, '#fff'); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    b.eyes = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); b.eyes.scale.set(0.34, 0.17, 1); b.eyes.renderOrder = 21; b.grp.add(b.eyes);
    b.stars = []; for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.04), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd400 : 0xffffff })); b.grp.add(s); b.stars.push(s); }
    if (!av) { const blob = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.9, 4, 10), new THREE.MeshLambertMaterial({ color: 0x5b6cff })); blob.rotation.z = Math.PI / 2; blob.position.y = 0.2; b.grp.add(blob); }
    // the pan coming down
    this.panT = 0.001; this.panAt = b.at.clone().setY(fy + 2.0);
    const w = g.words; w && w.show(['BONK!', 'CLANG!', 'DONK!'][Math.floor(Math.random() * 3)], b.at.clone().setY(fy + 1.9), '#ff5252', 0.22, 1.2);
    sfx('kill', b.at, 1); setTimeout(() => sfx('body_fall', b.at, 0.8), 120);
  }
  // one job's station: the kit for it (pub stuff), on the spot, and its sign hanging above
  station(id, at, label, kit) {
    const g = new THREE.Group(), room = this.g.room, fy = room.floorAt ? room.floorAt(at[0], at[1]) : 0; g.position.set(at[0], fy, at[1]);
    const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o }), steel = new THREE.MeshPhongMaterial({ color: 0xb8bcc2, shininess: 90 }), dark = lam(0x1d1d1d), wood = lam(0x6a4426);
    const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; };
    const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (r1, r2, h, n = 16) => new THREE.CylinderGeometry(r1, r2, h, n);
    const stand = (h = 0.9) => { add(C(0.04, 0.04, h, 10), dark, 0, h / 2, 0); add(C(0.2, 0.22, 0.03, 18), dark, 0, 0.015, 0); add(B(0.42, 0.04, 0.32), wood, 0, h, 0); return h + 0.02; };
    // the kit: a little bit of the pub for each job (kept off to the side of where you stand)
    const k = new THREE.Group(); k.position.set(0.55, 0, 0); g.add(k);
    const onTop = !!kit, none = kit && kit[4] === 'none'; if (kit) { k.position.set(kit[0] - at[0], kit[1], kit[2] - at[1]); k.rotation.y = kit[3] || 0; } if (none) k.visible = false;      /* (on the bar / on a wall / the pub's own machine) */ const kadd = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); k.add(o); return o; };
    const top = () => { if (onTop) return 0; kadd(C(0.04, 0.04, 0.9, 10), dark, 0, 0.45, 0); kadd(C(0.2, 0.22, 0.03, 18), dark, 0, 0.015, 0); kadd(B(0.44, 0.04, 0.34), wood, 0, 0.92, 0); return 0.94; };
    if (id === 'guinness') { const y = top();      // a proper Guinness font on the bar: black column, the gold harp, a chrome spout, the tap handle, a drip tray, a pint settling
      kadd(C(0.045, 0.05, 0.04, 18), dark, 0, y + 0.02, -0.05); kadd(C(0.032, 0.032, 0.36, 16), dark, 0, y + 0.2, -0.05); kadd(new THREE.SphereGeometry(0.034, 14, 8), dark, 0, y + 0.38, -0.05);
      kadd(new THREE.CircleGeometry(0.03, 18), lam(0xd4af37, { emissive: 0x332200 }), 0, y + 0.3, -0.017); kadd(B(0.012, 0.012, 0.09), steel, 0, y + 0.27, -0.005); kadd(C(0.007, 0.005, 0.05, 8), steel, 0, y + 0.245, 0.04);
      kadd(B(0.016, 0.08, 0.016), dark, 0, y + 0.43, -0.03, -0.3); kadd(B(0.16, 0.012, 0.11), lam(0x2a2a2a), 0, y + 0.006, 0.04);
      kadd(C(0.034, 0.027, 0.15, 14), new THREE.MeshPhongMaterial({ color: 0x140a06, shininess: 60 }), 0, y + 0.087, 0.04); kadd(C(0.035, 0.034, 0.018, 14), lam(0xf1e3c4), 0, y + 0.17, 0.04); }
    else if (id === 'barrel' || id === 'keg' || id === 'valve') { for (const dx of id === 'barrel' ? [-0.18, 0.18] : [0]) { kadd(C(0.2, 0.2, 0.6, 20), steel, dx, 0.3, 0); for (const yy of [0.08, 0.52]) kadd(new THREE.TorusGeometry(0.2, 0.015, 6, 20), steel, dx, yy, 0, Math.PI / 2); kadd(C(0.05, 0.05, 0.06, 10), lam(id === 'valve' ? 0xd81b2a : 0x2a6df4), dx, 0.63, 0); }
      if (id === 'keg') { kadd(C(0.02, 0.02, 0.6, 8), dark, 0.32, 0.3, 0); kadd(C(0.09, 0.09, 0.03, 20), lam(0xffffff), 0.32, 0.66, 0, Math.PI / 2); kadd(B(0.01, 0.07, 0.005), lam(0xd81b2a), 0.32, 0.68, 0.017, 0, 0, 0.6); } }
    else if (id === 'till' && onTop) {      // the card machine on the bar: in its cradle, the screen lit, a receipt curling out
      kadd(B(0.1, 0.03, 0.14), dark, 0, 0.015, 0); kadd(B(0.08, 0.025, 0.17), lam(0x2b2f36), 0, 0.045, 0.01, -0.35); kadd(B(0.06, 0.004, 0.05), lam(0x39ff14, { emissive: 0x226622 }), 0, 0.068, -0.03, -0.35);
      for (let i = 0; i < 9; i++) kadd(B(0.012, 0.004, 0.01), lam(0xdddddd), -0.02 + (i % 3) * 0.02, 0.062, 0.02 + Math.floor(i / 3) * 0.02, -0.35); kadd(B(0.05, 0.002, 0.08), lam(0xfafafa), 0, 0.06, -0.1, 0.5); }
    else if (id === 'rota' && onTop) {      // the staff cupboard on the back wall: two doors, the clock-in machine on the front, the rota pinned up
      kadd(B(1.0, 1.9, 0.45), lam(0x8a6a48), 0, 0.95, 0); for (const sx of [-0.25, 0.25]) { kadd(B(0.48, 1.8, 0.02), lam(0x9c7a54), sx, 0.95, 0.235); kadd(C(0.01, 0.01, 0.14, 8), steel, sx > 0 ? 0.03 : -0.03, 1.0, 0.255); }
      kadd(B(0.18, 0.24, 0.08), dark, 0.25, 1.35, 0.28); kadd(B(0.12, 0.05, 0.005), lam(0x39ff14, { emissive: 0x115511 }), 0.25, 1.42, 0.322); kadd(B(0.03, 0.08, 0.01), lam(0x888888), 0.25, 1.28, 0.322);
      kadd(B(0.32, 0.42, 0.005), lam(0xf5f0e0), -0.22, 1.45, 0.247); for (let i = 0; i < 6; i++) kadd(B(0.26, 0.012, 0.002), lam(0x555555), -0.22, 1.6 - i * 0.055, 0.25); }
    else if (id === 'till' || id === 'rota') { const y = top(); kadd(B(0.12, 0.18, 0.06), dark, 0, y + 0.09, 0, -0.3); kadd(B(0.09, 0.06, 0.005), lam(0x39ff14, { emissive: 0x115511 }), 0, y + 0.14, 0.033, -0.3); if (id === 'rota') kadd(B(0.3, 0.3, 0.02), lam(0xf5f0e0), 0, y + 0.45, -0.1); }
    else if (id === 'jukebox' || id === 'slots' || id === 'fruit') { const col = id === 'jukebox' ? 0xc62828 : id === 'slots' ? 0x2c3e8f : 0x6a1b9a; kadd(B(0.6, 1.4, 0.45), lam(col), 0, 0.7, 0); kadd(C(0.3, 0.3, 0.45, 20, 1, false, 0, Math.PI), lam(col), 0, 1.4, 0, Math.PI / 2, 0, Math.PI / 2);
      kadd(B(0.46, 0.4, 0.01), lam(0xffd400, { emissive: 0x664400 }), 0, 1.0, 0.23); for (let i = 0; i < 3; i++) kadd(B(0.1, 0.14, 0.012), lam(0xffffff), -0.13 + i * 0.13, 1.0, 0.235); if (id === 'fruit') kadd(C(0.12, 0.1, 0.14, 14), lam(0xd4af37), 0, 0.07, 0.4); }
    else if (id === 'toilet') { kadd(C(0.18, 0.13, 0.38, 18), lam(0xf8f8f8), 0, 0.19, 0); kadd(B(0.36, 0.38, 0.16), lam(0xf8f8f8), 0, 0.52, -0.18); kadd(new THREE.TorusGeometry(0.16, 0.03, 8, 18), lam(0xf8f8f8), 0, 0.39, 0, Math.PI / 2);
      kadd(C(0.012, 0.012, 0.6, 8), lam(0xb5651d), 0.25, 0.42, 0.1); kadd(new THREE.SphereGeometry(0.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam(0xd32f2f), 0.25, 0.1, 0.1, Math.PI); }
    else if (id === 'looroll') { kadd(B(0.5, 0.04, 0.4), steel, 0, 0.3, 0); for (const yy of [0.04, 0.3, 0.56]) kadd(B(0.5, 0.02, 0.4), steel, 0, yy, 0); for (let i = 0; i < 12; i++) kadd(C(0.055, 0.055, 0.11, 14), lam(0xffffff), -0.17 + (i % 4) * 0.115, (i < 4 ? 0.1 : i < 8 ? 0.37 : 0.63), -0.09 + (Math.floor(i / 2) % 2) * 0.18); }
    else if (id === 'bookings' && onTop) { kadd(B(0.42, 0.02, 0.28), lam(0x7a1f3d), 0, 0.01, 0); kadd(B(0.4, 0.022, 0.26), lam(0xfff8dc), 0, 0.022, 0); kadd(B(0.006, 0.024, 0.26), lam(0x5a1028), 0, 0.024, 0); for (let i = 0; i < 6; i++) kadd(B(0.15, 0.002, 0.006), lam(0x555555), -0.1 + (i % 2) * 0.2, 0.034, -0.09 + Math.floor(i / 2) * 0.07); kadd(C(0.005, 0.005, 0.14, 6), lam(0x1a1a1a), 0.12, 0.04, 0.06, 0, 0.6, Math.PI / 2); }      // (the bookings ledger, open on the worktop, a pen on it)
    else if (id === 'bookings') { kadd(B(0.08, 1.0, 0.08), wood, 0, 0.5, 0); kadd(B(0.5, 0.04, 0.36), wood, 0, 1.02, 0, -0.35); kadd(B(0.44, 0.02, 0.3), lam(0xfff8dc), 0, 1.05, 0.01, -0.35); kadd(B(0.005, 0.03, 0.3), lam(0x7a1f3d), 0, 1.06, 0.01, -0.35); }
    else if (id === 'fryer') { kadd(B(0.55, 0.9, 0.55), steel, 0, 0.45, 0); kadd(B(0.45, 0.02, 0.45), lam(0xd9a03a), 0, 0.905, 0); kadd(B(0.22, 0.12, 0.2), new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true }), 0.1, 0.98, 0); kadd(C(0.01, 0.01, 0.35, 6), dark, 0.1, 1.05, 0.25, Math.PI / 2 - 0.4); }
    else if (id === 'empties') { const y = top(); kadd(C(0.18, 0.18, 0.02, 20), steel, 0, y + 0.01, 0); for (let i = 0; i < 6; i++) kadd(C(0.035, 0.028, 0.14, 10, 1, true), new THREE.MeshPhongMaterial({ color: 0xddeeff, transparent: true, opacity: 0.5 }), Math.cos(i) * 0.1, y + 0.08, Math.sin(i) * 0.1); }
    else if (id === 'tables') { kadd(B(0.4, 0.5, 0.3), lam(0xffd400), 0, 0.3, 0); kadd(C(0.12, 0.1, 0.22, 14), lam(0x1565c0), 0.05, 0.66, 0); kadd(C(0.035, 0.035, 0.18, 10), lam(0x29b6ff), -0.12, 0.64, 0.05); kadd(B(0.04, 0.05, 0.03), lam(0xffffff), -0.12, 0.76, 0.05); }
    else if (id === 'fuse') { if (!onTop) kadd(B(0.06, 1.3, 0.06), dark, 0, 0.65, 0); kadd(B(0.5, 0.6, 0.14), lam(0x7a7f87), 0, 1.4, 0.07); kadd(B(0.44, 0.54, 0.01), lam(0xd8d8d8), 0, 1.4, 0.145); kadd(B(0.18, 0.12, 0.003), lam(0xffd400), 0, 1.58, 0.152); for (let i = 0; i < 6; i++) kadd(B(0.04, 0.07, 0.03), lam(i === 2 ? 0xd81b2a : 0x222222), -0.15 + i * 0.06, 1.36, 0.16);
      kadd(C(0.015, 0.015, 1.4, 8), lam(0x444444), 0.2, 0.7, 0.03); }
    else if (id === 'dishes') { kadd(B(1.0, 0.9, 0.6), steel, 0, 0.45, 0); kadd(B(0.8, 0.05, 0.45), lam(0x5f6368), 0, 0.88, 0); kadd(C(0.012, 0.012, 0.3, 8), steel, 0, 1.05, -0.22); kadd(C(0.01, 0.01, 0.18, 8), steel, 0, 1.2, -0.13, Math.PI / 2);
      for (let i = 0; i < 4; i++) { kadd(C(0.13 - i * 0.015, 0.11 - i * 0.015, 0.1, 18), lam(0x3a3a3a), 0.2 - i * 0.02, 0.95 + i * 0.1, 0.02); } kadd(B(0.05, 0.08, 0.05), lam(0x2e7d32), -0.35, 0.95, -0.15); kadd(B(0.09, 0.03, 0.06), lam(0xffd400), -0.3, 0.93, 0.1); }
    else if (id === 'cutlery') { kadd(B(0.6, 0.04, 0.4), lam(0x5a3a22), 0, 0.85, 0); for (const sx of [-0.25, 0.25]) for (const sz of [-0.16, 0.16]) kadd(C(0.015, 0.015, 0.85, 8), lam(0x5a3a22), sx, 0.42, sz);
      kadd(B(0.3, 0.05, 0.22), lam(0x7a5a3a), 0, 0.9, 0); for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) kadd(B(0.012, 0.004, 0.16), steel, -0.11 + i * 0.075 + j * 0.006, 0.93, 0); kadd(B(0.24, 0.06, 0.18), lam(0xffffff), 0, 0.88, 0.25); }
    else if (id === 'candles') { const y = top(); kadd(C(0.1, 0.12, 0.02, 18), lam(0xd4af37), 0, y + 0.01, 0); kadd(C(0.012, 0.015, 0.2, 10), lam(0xd4af37), 0, y + 0.11, 0); for (let i = 0; i < 3; i++) { const a = i * 2.09; kadd(C(0.008, 0.008, 0.08, 8), lam(0xd4af37), Math.cos(a) * 0.06, y + 0.22, Math.sin(a) * 0.06, 0, 0, Math.cos(a) * 0.6); kadd(C(0.016, 0.016, 0.12, 12), lam(0xfdf6e3), Math.cos(a) * 0.09, y + 0.31, Math.sin(a) * 0.09); } }
    else if (id === 'parasol') { kadd(C(0.22, 0.25, 0.08, 18), lam(0x333333), 0, 0.04, 0); kadd(C(0.02, 0.02, 2.2, 10), lam(0xc8c8c8), 0, 1.1, 0); kadd(C(0.07, 0.02, 1.2, 12), lam(0x2e7d32), 0, 1.6, 0); kadd(new THREE.TorusGeometry(0.07, 0.01, 6, 16), lam(0xffffff), 0, 1.2, 0, Math.PI / 2); kadd(C(0.008, 0.008, 0.18, 6), lam(0x555555), 0.05, 1.0, 0, 0, 0, 1.2); }
    else if (id === 'gglasses') { kadd(B(1.2, 0.05, 0.5), wood, 0, 0.74, 0); for (const sx of [-0.5, 0.5]) kadd(B(0.05, 0.74, 0.5), wood, sx, 0.37, 0); for (let i = 0; i < 5; i++) kadd(C(0.035, 0.028, 0.14, 10, 1, true), new THREE.MeshPhongMaterial({ color: 0xddeeff, transparent: true, opacity: 0.5, side: THREE.DoubleSide }), -0.4 + i * 0.2, 0.84, (i % 2) * 0.12 - 0.06); kadd(B(0.36, 0.12, 0.26), lam(0x6d4c2a), 0.3, 0.83, 0.1); }
    else if (id === 'wine') {      // on the back counter: an open bottle of red, the waiter's friend corkscrew beside it, three glasses, a cloth
      kadd(C(0.036, 0.036, 0.22, 14), lam(0x16341a), -0.12, 0.11, -0.02); kadd(C(0.013, 0.032, 0.08, 12), lam(0x16341a), -0.12, 0.26, -0.02); kadd(C(0.014, 0.014, 0.05, 10), lam(0x7a1020), -0.12, 0.31, -0.02);
      kadd(B(0.062, 0.07, 0.004), lam(0xf4ecd8), -0.12, 0.1, 0.016); kadd(B(0.012, 0.012, 0.11), steel, 0.02, 0.006, 0.07, 0, 0.4); kadd(B(0.02, 0.012, 0.05), lam(0x5a2e18), 0.04, 0.008, 0.03, 0, 0.4);
      const gm = new THREE.MeshPhongMaterial({ color: 0xe6f2f4, transparent: true, opacity: 0.45, shininess: 90, side: THREE.DoubleSide });
      for (let i = 0; i < 3; i++) { const x = 0.06 + i * 0.09, z = -0.06; kadd(C(0.03, 0.03, 0.004, 14), gm, x, 0.002, z); kadd(C(0.004, 0.004, 0.08, 6), gm, x, 0.044, z); kadd(C(0.034, 0.018, 0.07, 14, 1, true), gm, x, 0.12, z); if (i === 0) kadd(C(0.026, 0.02, 0.025, 14), lam(0x6a0f22), x, 0.1, z); }
      kadd(B(0.16, 0.006, 0.1), lam(0xf8f8f4), -0.02, 0.003, 0.12, 0, 0.3); }
    else if (id === 'napkins') {      // on the waiter's station: a burgundy napkin folded into a bishop's mitre, two more lying flat waiting
      const lin = lam(0x7a1424); kadd(B(0.1, 0.012, 0.1), lin, 0, 0.006, 0.02); kadd(B(0.1, 0.012, 0.1), lin, 0, 0.018, 0.02, 0, 0.3);
      kadd(new THREE.ConeGeometry(0.05, 0.14, 4), lin, 0, 0.1, -0.05, 0, Math.PI / 4); }
    else if (id === 'bulbs') {      // an aluminium stepladder opened up under the chandelier, a box of new candle bulbs on the floor beside it
      const al = new THREE.MeshPhongMaterial({ color: 0xc8ccd0, shininess: 70 });
      for (const sx of [-0.2, 0.2]) { kadd(B(0.035, 1.5, 0.05), al, sx, 0.74, -0.18, 0.22); kadd(B(0.035, 1.5, 0.05), al, sx, 0.74, 0.18, -0.22); }      // (front and back legs lean in to meet at the top)
      for (let i = 0; i < 4; i++) { const y = 0.3 + i * 0.32; kadd(B(0.4, 0.025, 0.11), al, 0, y, -0.18 - (0.74 - y) * 0.224 - 0.03); }      // the treads, on the front legs
      kadd(B(0.44, 0.04, 0.26), lam(0xe0e0e0), 0, 1.47, 0); kadd(B(0.46, 0.05, 0.03), lam(0xd32f2f), 0, 1.5, 0.12);
      kadd(B(0.24, 0.12, 0.16), lam(0xd8c090), 0.45, 0.06, 0.1); for (let i = 0; i < 4; i++) kadd(new THREE.SphereGeometry(0.022, 8, 6), lam(0xf4f0e0), 0.37 + i * 0.05, 0.13, 0.1); }
    else if (id === 'bbq') {      // a big black barbecue: the firebox on legs, the lid propped open, the grill with burgers on, glowing coals, a side shelf with buns, the gas bottle
      const blk2 = lam(0x1a1a1a), glow = new THREE.MeshBasicMaterial({ color: 0xff5a10 });
      kadd(B(0.9, 0.3, 0.5), blk2, 0, 0.85, 0); for (const sx of [-0.4, 0.4]) for (const sz of [-0.2, 0.2]) kadd(C(0.02, 0.02, 0.7, 8), blk2, sx, 0.35, sz);
      kadd(B(0.8, 0.02, 0.4), glow, 0, 0.96, 0); for (let i = 0; i < 12; i++) kadd(B(0.008, 0.012, 0.42), lam(0x555555), -0.38 + i * 0.07, 1.0, 0);
      kadd(B(0.9, 0.42, 0.05), blk2, 0, 1.2, -0.27, -0.25); kadd(B(0.3, 0.03, 0.03), steel, 0, 1.38, -0.3);
      for (let i = 0; i < 5; i++) kadd(C(0.05, 0.05, 0.022, 14), lam(i % 2 ? 0x5a2e14 : 0x7a3e1a), -0.3 + i * 0.15, 1.02, (i % 2) * 0.12 - 0.04);
      kadd(B(0.3, 0.03, 0.4), wood, 0.62, 0.92, 0); for (let i = 0; i < 3; i++) kadd(new THREE.SphereGeometry(0.05, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), lam(0xe0a050), 0.6, 0.94, -0.12 + i * 0.12);
      kadd(C(0.11, 0.11, 0.45, 14), lam(0x2e6ad8), -0.62, 0.23, 0.05); kadd(C(0.03, 0.03, 0.06, 8), steel, -0.62, 0.48, 0.05); kadd(B(0.12, 0.2, 0.012), lam(0x111111), 0.0, 0.85, 0.256); }
    else if (id === 'baskets') {      // on the pub's back wall: a black bracket, a hanging basket full of trailing flowers, the outside tap, a green watering can
      kadd(B(0.04, 0.3, 0.04), dark, 0, 1.85, 0.02); kadd(B(0.04, 0.04, 0.42), dark, 0, 2.0, 0.21); for (const a of [0, 2.1, 4.2]) kadd(C(0.004, 0.004, 0.4, 4), lam(0x555555), Math.cos(a) * 0.08, 1.8, 0.4 + Math.sin(a) * 0.08, Math.sin(a) * 0.2, 0, Math.cos(a) * 0.2);
      kadd(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lam(0x3a2a1a), 0, 1.62, 0.42); kadd(new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam(0x3a8a2a), 0, 1.6, 0.42);
      for (let i = 0; i < 12; i++) { const a = i * 0.52; kadd(new THREE.SphereGeometry(0.04, 8, 6), lam([0xe8407a, 0xffffff, 0xa040e8, 0xff8a20][i % 4]), Math.cos(a) * 0.17, 1.68 + (i % 3) * 0.03, 0.42 + Math.sin(a) * 0.17); }
      for (let i = 0; i < 6; i++) { const a = i; kadd(C(0.008, 0.004, 0.35, 4), lam(0x2e7a1e), Math.cos(a) * 0.18, 1.42, 0.42 + Math.sin(a) * 0.18); }
      kadd(B(0.08, 0.05, 0.08), steel, 0.55, 0.6, 0.04); kadd(C(0.012, 0.012, 0.08, 8), steel, 0.55, 0.55, 0.09); kadd(B(0.07, 0.02, 0.02), lam(0xc62828), 0.55, 0.64, 0.04);
      kadd(C(0.1, 0.11, 0.24, 14), lam(0x2e7d32), 0.45, 0.12, 0.42); kadd(C(0.015, 0.015, 0.3, 8), lam(0x2e7d32), 0.6, 0.22, 0.42, 0, 0, -0.9); kadd(C(0.04, 0.03, 0.04, 10), lam(0x1b5e20), 0.73, 0.32, 0.42, 0, 0, -0.9);
      kadd(new THREE.TorusGeometry(0.08, 0.012, 6, 14, Math.PI), lam(0x1b5e20), 0.45, 0.24, 0.42); }
    else if (id === 'stream') {      // a long-handled litter net leaning on the rail, a green wheelie bin, a couple of cans already fished out
      kadd(C(0.012, 0.012, 2.0, 8), lam(0x8a6a3a), 0, 0.9, 0.2, 0.5, 0, 0); kadd(new THREE.TorusGeometry(0.16, 0.012, 6, 18), lam(0xdddddd), 0, 1.75, 0.65, 0.5 + Math.PI / 2, 0, 0);
      kadd(new THREE.ConeGeometry(0.15, 0.25, 12, 1, true), new THREE.MeshLambertMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.5, side: THREE.DoubleSide }), 0, 1.78, 0.75, 0.5 + Math.PI, 0, 0);
      kadd(B(0.5, 0.9, 0.55), lam(0x2e7d32), 0.65, 0.48, -0.1); kadd(B(0.54, 0.05, 0.6), lam(0x1b5e20), 0.65, 0.95, -0.15, -0.3); for (const sx of [0.45, 0.85]) kadd(C(0.07, 0.07, 0.05, 12), dark, sx, 0.07, -0.37, 0, 0, Math.PI / 2);
      kadd(C(0.03, 0.03, 0.11, 10), lam(0xc62828), 0.25, 0.03, 0.15, 0, 0, Math.PI / 2); kadd(C(0.03, 0.03, 0.11, 10), lam(0x1e88e5), 0.3, 0.03, 0.3, 0, 0.8, Math.PI / 2); }
    // the sign: hanging over the spot, double-sided, the job's name
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = '#1a0f0a'; rr(x, 4, 4, 504, 120, 26); x.fill(); x.lineWidth = 8; x.strokeStyle = '#d4af37'; rr(x, 8, 8, 496, 112, 22); x.stroke(); txt(x, label, 256, 66, 44, '#ffd400', 'center', 470);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true })); sign.scale.set(0.95, 0.24, 1); if (kit) { const d = Math.hypot(k.position.x, k.position.z), pull = d > 1e-3 ? Math.min(0.45, d) / d : 0; sign.position.set(k.position.x * (1 - pull), Math.max(2.05, kit[1] + 0.95), k.position.z * (1 - pull)); } else sign.position.set(0.55, 2.05, 0); g.add(sign);
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
      if (body && !av.impLaid) { av.impLaid = true; av.layK = 0; }      // (it lays itself out: see SquadPuppet.layOut)
      if (!body && av.impLaid) { av.impLaid = false; if (av.down > 0) av.down = 0.01; }
    }
    // ghosts see ghosts
    for (const p of this.players.values()) {
      const gp = this.ghostPups && this.ghostPups.get(p.id), want = meDead && !p.alive && p.id !== this.me && !(gp && gp.c && gp.c.rag && gp.c.rag.mesh); let s = this.ghostTags.get(p.id);      // (the 👻 floats there until their ghost is ready)
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
#imp-map { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 70; display: none; pointer-events: none; } #imp-map-close { position: absolute; top: 6px; right: 6px; z-index: 2; pointer-events: auto; font: 900 17px system-ui, sans-serif; color: #111; background: #ffd400; border: 3px solid #111; border-radius: 12px; padding: 7px 14px; box-shadow: 0 3px 0 #111; cursor: pointer; } #imp-map-close:active { transform: translateY(2px); box-shadow: 0 1px 0 #111; } #imp-map.on { display: block; } @media (max-width: 500px) { #imp-map-close { font-size: 14px !important; padding: 5px 10px !important; } }
#imp-map canvas { display: block; width: auto; height: auto; max-width: calc(100vw - 16px); max-height: calc(100vh - 24px); max-height: calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); border-radius: 16px; border: 4px solid #ffd400; box-shadow: 0 10px 40px rgba(0,0,0,0.7); }
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
    this.mapEl = document.createElement('div'); this.mapEl.id = 'imp-map'; this.mapCv = document.createElement('canvas'); this.mapCv.width = 600; this.mapCv.height = 780; this.mapEl.appendChild(this.mapCv); { const cb = document.createElement('button'); cb.id = 'imp-map-close'; cb.textContent = '✕ CLOSE'; cb.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMap(false); }); this.mapEl.appendChild(cb); } document.body.appendChild(this.mapEl);
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
    if (!out.use && me.alive && this.hd(h, V(...SECURITY.at)) < IMP.USE_R) out.use = { kind: 'cams' };
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
    if (u.kind === 'start') { if (!this.host) return this.toast('THE HOST RINGS THE BELL TO START'); for (let i = 0; i < 3; i++) setTimeout(() => sfx('emergency', null, 1), i * 220); this.hostDeal(); return; }
    if (u.kind === 'bell') { if (this.emergLeft <= 0) return this.toast('YOU\'VE USED YOUR EMERGENCY MEETING'); if (this.emergCD > 0) return this.toast(`THE BELL'S READY IN ${Math.ceil(this.emergCD)}s`); if (this.sab && SAB[this.sab.k].crit) return this.toast('NOT DURING AN EMERGENCY! FIX THE KEG!'); for (let i = 0; i < 4; i++) setTimeout(() => sfx('alarm', null, 1), i * 160); this.toast('🔔 DING DING DING!'); this.ask('imM', {}); return; }
    if (u.kind === 'fix') { const game = u.k === 'lights' ? makeGame('switches', { title: 'FIX THE LIGHTS' }) : makeGame('crank', { title: VALVES[u.part].name, hint: 'RELEASE THE PRESSURE', turns: 2 }); game.sabFix = true;
      this.panel.show(game, { onDone: () => this.ask('imF', { k: u.k, part: u.part }) }); return; }
    if (u.kind === 'cams') { this.openCams(); return; }
    if (u.kind === 'task') { const t = TASK[u.id];
      this.panel.show(makeGame(t.kind, t.o), { onDone: () => { if (me.imp) { me.done.add(u.id); this.toast('(FAKE JOB: YOU\'RE THE IMPOSTER)'); return; } this.ask('imT', { task: u.id }); this.toast(`✓ ${t.name.toUpperCase()}`); } }); }
  }
  // tapping the pub's real fruit machine in Imposter: if emptying it is one of your jobs (and you're close), that opens it
  useMachine() { const me = this.mine(); if (!me || this.phase !== 'play') return; if (!me.tasks.includes('fruit') || me.done.has('fruit')) return this.toast('NOT YOUR JOB');
    const n = this.near(); if (n.use && n.use.kind === 'task' && n.use.id === 'fruit') this.doUse(); else this.toast('GET A BIT CLOSER TO THE MACHINE'); }
  // sit at the security desk: the four feeds, until you close them (or a meeting's called, or you die)
  openCams() { if (this.camsGame) return; const game = this.camsGame = makeCamFeeds({ renderer: this.g.renderer, scene: this.g.scene });
    this.camWatchers.add(this.me); this.net.send({ t: 'imCams', on: true }); sfx('crt_on', null, 0.6);
    this.panel.show(game, { onClose: () => this.closeCams() }); }
  closeCams() { const g = this.camsGame; if (!g) return; this.camsGame = null; g.dispose(); this.camWatchers.delete(this.me); this.net.send({ t: 'imCams', on: false }); }
  doReport() { if (this.phase !== 'play') return; const n = this.near(); if (n.body) this.ask('imM', { body: n.body.id }); }
  doKill() { const n = this.near(); if (!this.amImp() || this.phase !== 'play') return; if (this.killCD > 0) { this.toast(`KILL READY IN ${Math.ceil(this.killCD)}s`); return; } if (!n.victim) { this.toast('NOBODY CLOSE ENOUGH'); return; } this.ask('imK', { v: n.victim.id }); }
  openSab() { if (!this.amImp() || this.phase !== 'play') return; if (this.sab) return this.toast('ALREADY SABOTAGED'); if (this.sabCD > 0) return this.toast(`SABOTAGE READY IN ${Math.ceil(this.sabCD)}s`);
    if (this.g.renderer.xr.isPresenting) { this.panel.show(this.sabScreen()); return; } this.sabEl.classList.add('on'); }
  sabScreen() { const ks = Object.keys(SAB), box = (i) => ({ x: 40 + i * 226, y: 150, w: 206, h: 220 });
    return { draw: (g) => { g.fillStyle = '#1d0a2a'; rr(g, 4, 4, 504, 504, 30); g.fill(); txt(g, 'SABOTAGE', 256, 60, 40, '#e040fb'); ks.forEach((k, i) => { const b = box(i); g.fillStyle = '#6a1b9a'; rr(g, b.x, b.y, b.w, b.h, 20); g.fill(); g.font = '80px serif'; g.textAlign = 'center'; g.fillText(SAB[k].icon, b.x + b.w / 2, b.y + 90); txt(g, SAB[k].name, b.x + b.w / 2, b.y + 170, 22); }); txt(g, 'B TO CLOSE', 256, 450, 20, '#ccc'); },
      down: (x, y) => { ks.forEach((k, i) => { const b = box(i); if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) { this.panel.close(true); this.ask('imS', { k }); } }); } }; }
  doVent() {
    if (!this.amImp()) return;
    if (this.vented) { const i = VENTS.indexOf(this.vented), nxt = VENTS[(i + 1) % VENTS.length]; this.teleport(nxt.at[0], nxt.at[1]); this.vented = nxt; sfx('vent', null, 0.6); return; }
    const n = this.near(); if (!n.vent) return; this.setVent(n.vent);
  }
  // down a trapdoor: nobody sees you; press again to pop out at the next one, USE (or walking off) to climb out
  setVent(v) { const was = this.vented; this.vented = v; if (!!was === !!v) return; if (v && this.replay) this.replay.event('vent', { who: this.me }); const me = this.mine(); if (me) me.vent = !!v; this.net.send({ t: 'imVent', in: !!v }); sfx('vent', null, 0.8);
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
    if (me && me.imp) { sp.style.color = '#ff3b3b'; sp.innerHTML = `<p>SHHHHH!</p><h1>IMPOSTER</h1><p>Kill the faithful without getting caught. Look busy.</p><div class="imgs">${imps.map(p => `<img src="./assets/portraits/${p.char || 'ronnie'}.webp" title="${p.name}">`).join('')}</div><p>${imps.length > 1 ? 'Your fellow imposter: ' + imps.filter(p => p.id !== this.me).map(p => p.name).join(', ') : ''}</p>`; sfx('sinister', null, 0.8); }
    else { sp.style.color = '#4fc3ff'; sp.innerHTML = `<p>YOU ARE</p><h1>THE FAITHFUL</h1><p>There ${n > 1 ? 'are' : 'is'} <b style="color:#ff3b3b">${n} IMPOSTER${n > 1 ? 'S' : ''}</b> among us</p><p>Do your jobs round the pub. Report bodies. Vote them out.</p>`; sfx('crewmate', null, 0.8); }
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
    sfx('ghost', null, 0.8); this.setFog(); this.syncPuppets();
  }
  startMeeting(m) {
    this.bellT = 0.001;
    this.phase = 'meeting'; this.panel.close(true); this.setVent(null); this.sabEl.classList.remove('on'); this.toggleMap(false); this.spect = null;
    if (this.sab) { this.sab = null; this.sabAlert(false); }
    const body = m.body ? this.bodies.find(b => b.id === m.body) : null; if (body) body.found = true;
    this.meeting = { by: m.by, body: m.body, end: now() + m.dur, voted: new Set(), myVote: null, pick: null, res: null };
    if (m.by === this.me && !m.body) this.emergLeft = m.emerg ?? 0;
    // everyone round the bell
    const s = SEATS[(m.seats && m.seats[this.me]) ?? 0]; this.teleport(s[0], s[1], Math.atan2(CENTRE.x - s[0], CENTRE.z - s[1]) + Math.PI);
    for (let i = 0; i < 3; i++) setTimeout(() => sfx('emergency', null, 1), i * 260); sfx('alarm', null, 0.6);
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
        list.forEach((p, i) => { const b = card(i); if (In(b) && p.alive) { M.pick = M.pick === p.id ? null : p.id; sfx('tap', null, 0.4); } });
        if (In(skipB)) { M.myVote = 'skip'; this.ask('imV', { v: 'skip' }); sfx('vote', null, 0.6); }
        if (In(okB) && M.pick) { M.myVote = M.pick; this.ask('imV', { v: M.pick }); sfx('vote', null, 0.6); }
      },
    };
  }
  showResult(m) {
    const M = this.meeting; if (!M) return; M.res = m; this.phase = 'eject';
    if (!this.panel.open) this.panel.show(this.voteScreen(), { canClose: false });
    setTimeout(() => { if (this.phase !== 'eject') return; this.panel.show(this.ejectScreen(m), { canClose: false }); sfx(m.ej ? 'eject' : 'aww', null, 0.8); }, 2600);
    if (m.ej) { const p = this.players.get(m.ej); if (p) { p.alive = false; p.realImp = m.wasImp; if (m.ej === this.me) setTimeout(() => this.iDied(null, 'ejected'), 7000); } }
  }
  // thrown out of the pub: the night street outside, them flying out of the door, spinning off into the distance
  ejectScreen(m) {
    const p = m.ej && this.players.get(m.ej), t0 = now(), name = p ? p.name.toUpperCase() : '';
    const l1 = p ? `${name} WAS THROWN OUT OF THE PUB.` : m.tie ? 'IT\'S A TIE. NOBODY WAS THROWN OUT.' : 'NOBODY WAS THROWN OUT. (SKIPPED)';
    const l2 = p ? (!IMP.EJECTS ? `${name} WAS EJECTED.` : m.wasImp ? `${name} WAS THE IMPOSTER.` : `${name} WAS NOT THE IMPOSTER.`) : '', l3 = IMP.EJECTS ? `${m.impsLeft} IMPOSTER${m.impsLeft === 1 ? '' : 'S'} REMAIN${m.impsLeft === 1 ? 'S' : ''}` : 'NOBODY KNOWS IF THEY WERE...';      // (the room's SAY WHO WAS THE IMPOSTER: OFF keeps it secret)
    return { draw: (g) => { const t = now() - t0;
      const sky = g.createLinearGradient(0, 0, 0, 512); sky.addColorStop(0, '#05071a'); sky.addColorStop(1, '#1a1440'); g.fillStyle = sky; rr(g, 4, 4, 504, 504, 30); g.fill();
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + (i % 5) * 0.12})`; g.fillRect((i * 97 + t * 30 * (1 + i % 3)) % 512, (i * 53) % 300, 2, 2); }
      g.fillStyle = '#3a2214'; g.fillRect(0, 300, 120, 212); g.fillStyle = '#ffcf6a'; g.fillRect(30, 340, 70, 130); txt(g, 'THE OYSTERFLEET', 60, 320, 13, '#d4af37', 'center', 110);
      g.fillStyle = '#222'; g.fillRect(0, 470, 512, 42);
      if (p) { const k = Math.min(1, t / 3.2), x = 70 + k * 520, y = 400 - Math.sin(k * Math.PI) * 220, im = portrait(p.char);
        g.save(); g.translate(x, y); g.rotate(t * 7); g.beginPath(); g.arc(0, 0, 46, 0, 7); g.clip(); if (im.complete && im.naturalWidth) g.drawImage(im, -46, -46, 92, 92); else { g.fillStyle = '#5b6cff'; g.fillRect(-46, -46, 92, 92); } g.restore(); }
      const typed = (s, at) => s.slice(0, Math.max(0, Math.floor((t - at) * 22)));
      txt(g, typed(l1, 0.6), 256, 110, 24, '#fff'); if (l2) txt(g, typed(l2, 2.4), 256, 160, 24, !IMP.EJECTS ? '#ffffff' : m.wasImp ? '#ff5252' : '#4fc3ff'); txt(g, typed(l3, 3.6), 256, 210, 20, '#ffd400');
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
    sfx('lightsout', null, 1); this.setFog();
    if (this.g.renderer.xr.isPresenting) this.g.showBanner(SAB[this.sab.k].icon + ' SABOTAGE', SAB[this.sab.k].name);
  }
  setFog() { const me = this.mine(), f = this.g.scene.fog || (this.g.scene.fog = new THREE.Fog(0x05060a, 5, 13)); if (!me || !me.alive || this.phase === 'over' || this.phase === 'waiting') { f.near = 1e4; f.far = 2e4; this.dim(false); return; } const dark = this.sab && this.sab.k === 'lights' && !me.imp; f.near = dark ? 0.6 : me.imp ? 7 : 5; f.far = dark ? 2.8 : me.imp ? 18 : 13; this.dim(dark); }
  // lights out: every light in the pub drops right down (and the glowing signs with it), the fog closes in black; back
  // up when someone fixes the fuse box. (Not for the imposters: they can see in the dark)
  dim(on) {
    if (!!on === !!this.dimmed) return; this.dimmed = !!on; const sc = this.g.scene; sc.userData.wxDim = !!on;      // (the weather's own lights (the sun) dim themselves: weather.js)
    if (on) { this.lightsWas = []; sc.traverse(o => { if (o.isLight && !o.userData.wx) { this.lightsWas.push([o, o.intensity]); o.intensity *= o.isAmbientLight || o.isHemisphereLight ? 0.12 : 0.08; } });
      this.bgWas = sc.background; if (sc.background && sc.background.isColor) sc.background = new THREE.Color(0x020306); f2(this.g.renderer, 0.45); }
    else { for (const [o, v] of this.lightsWas || []) o.intensity = v; this.lightsWas = null; if (this.bgWas !== undefined) { sc.background = this.bgWas; this.bgWas = undefined; } f2(this.g.renderer, 1); }
    function f2(r, k) { if (r.__expo0 === undefined) r.__expo0 = r.toneMappingExposure; r.toneMappingExposure = r.__expo0 * k; }
  }
  win(m) {
    this.phase = 'over'; this.panel.close(true); this.setVent(null); this.sabEl.classList.remove('on'); this.alertEl.classList.remove('on'); this.phase = 'over'; this.setFog();
    // first the game's best moment, played back (impreplay.js); then the result
    if (!this.replayDone && this.replay) { this.replayDone = true; if (this.replay.play(() => this.win(m))) return; }
    const imps = (this.impList || []).map(id => this.players.get(id)).filter(Boolean), me = this.mine(), mine = me && (m.side === 'imposter' ? this.impList.includes(this.me) : !this.impList.includes(this.me));
    sfx(mine ? 'victory' : 'sadviolin', null, 1);
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
    // the whole Oysterfleet: the pub, the restaurant off to the left, the conservatory and the beer garden out the back.
    // On a landscape screen it's turned on its side (so it fills the screen), on a portrait one it's upright
    const land = false, c = this.mapCv,      // (always upright: north at the top, the long way down the screen, on phones held either way)
      Bx = [-29.6, 16.8], Bz = [-24.4, 42.6], TOP = 44, PAD = 14;
    const W = land ? 1100 : 720, H = land ? 760 : 1040, S = Math.min(2, Math.max(1, window.devicePixelRatio || 1)); if (c.width !== W * S || c.height !== H * S) { c.width = W * S; c.height = H * S; c.style.aspectRatio = W + ' / ' + H; }
    const x = c.getContext('2d'); x.setTransform(S, 0, 0, S, 0, 0); const sc = land ? Math.min((W - PAD * 2) / (Bz[1] - Bz[0]), (H - TOP - PAD) / (Bx[1] - Bx[0])) : Math.min((W - PAD * 2) / (Bx[1] - Bx[0]), (H - TOP - PAD) / (Bz[1] - Bz[0]));
    const ox = land ? (W - (Bz[1] - Bz[0]) * sc) / 2 : (W - (Bx[1] - Bx[0]) * sc) / 2;
    // world (X, Z) -> map: upright = north up; on its side = the garden off to the right, the restaurant at the bottom
    const P = (X, Z) => land ? [ox + (Z - Bz[0]) * sc, TOP + (Bx[1] - X) * sc] : [ox + (X - Bx[0]) * sc, TOP + (Z - Bz[0]) * sc];
    x.fillStyle = '#2f6b33'; x.fillRect(0, 0, W, H); for (let i = 0; i < 420; i++) { x.fillStyle = i % 2 ? '#357a3a' : '#2a5f2e'; x.fillRect((i * 97) % W, (i * 53) % H, 6, 6); }
    // floors: tiles in the kitchens and loos, boards in the bar, carpet in the restaurant and booths (drawn faintly over the room's colour)
    const FLOOR = { "MEN'S": 'tile', "WOMEN'S": 'tile', DISABLED: 'tile', KITCHEN: 'tile', 'R. KITCHEN': 'tile', RESTAURANT: 'carpet', 'RAISED BOOTHS': 'carpet', 'STAFF ROOM': 'boards', 'KEG ROOM': 'grate', RECEPTION: 'boards', CONSERVATORY: 'tile', GAMBLING: 'carpet', DECK: 'deck', 'GARDEN BAR': 'boards' };
    const pats = this.mapPats || (this.mapPats = {}), pat = (kind) => { if (pats[kind]) return pats[kind]; const t = document.createElement('canvas'); t.width = t.height = 16; const g = t.getContext('2d');
      if (kind === 'tile') { g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, 16, 16); }
      else if (kind === 'boards') { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 8, 16, 1); g.fillRect(6, 0, 1, 8); g.fillRect(13, 8, 1, 8); }
      else if (kind === 'deck') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 1, 16); g.fillRect(8, 0, 1, 16); }
      else if (kind === 'carpet') { g.fillStyle = 'rgba(255,220,150,0.16)'; for (const [a, b] of [[3, 3], [11, 11], [11, 3], [3, 11]]) { g.beginPath(); g.arc(a, b, 1.6, 0, 7); g.fill(); } }
      else if (kind === 'grate') { g.strokeStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(16, 16); g.moveTo(16, 0); g.lineTo(0, 16); g.stroke(); }
      return (pats[kind] = x.createPattern(t, 'repeat')); };
    const ICON = { RESTAURANT: '🍽️', 'R. KITCHEN': '🍳', KITCHEN: '🍳', "MEN'S": '🚹', "WOMEN'S": '🚺', DISABLED: '♿', RECEPTION: '🛎️', 'STAFF ROOM': '☕', 'KEG ROOM': '🛢️', 'RAISED BOOTHS': '🛋️', CONSERVATORY: '🌿', GAMBLING: '🎰', DECK: '🪵', 'GARDEN BAR': '🍹' };
    const poly = (pts, col, name, sz = 15, edge = '#2b1a10') => { x.fillStyle = col; x.strokeStyle = edge; x.lineWidth = 4; x.beginPath(); pts.forEach(([X, Z], i) => { const [u, v] = P(X, Z); i ? x.lineTo(u, v) : x.moveTo(u, v); }); x.closePath(); x.fill();
      if (FLOOR[name]) { x.save(); x.clip(); x.fillStyle = pat(FLOOR[name]); x.fillRect(0, 0, W, H); x.restore(); x.beginPath(); pts.forEach(([X, Z], i) => { const [u, v] = P(X, Z); i ? x.lineTo(u, v) : x.moveTo(u, v); }); x.closePath(); }
      x.save(); x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = 6; x.stroke(); x.restore();
      if (name) { let cx = 0, cz = 0, u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; for (const [X, Z] of pts) { cx += X; cz += Z; const [u, v] = P(X, Z); u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
        const [u, v] = P(cx / pts.length, cz / pts.length); labels.push([(ICON[name] && (u1 - u0) > 60 ? ICON[name] + ' ' : '') + name, u, v, sz, u1 - u0, v1 - v0]); } };
    // every room's name, written last (so the next room along never paints over it) and always whole: it gets smaller
    // to fit inside its room, and goes onto two lines if it's still too wide
    const nameBoxes = [];      // (where the room names went: the job tags keep off them)
    const labels = [], fitLabel = (name, u, v, sz, bw, bh) => { const maxW = Math.max(30, bw - 10), maxH = Math.max(14, bh - 6), words = name.split(' ');
      for (let f = sz; f >= 8; f--) { x.font = `900 ${f}px ${FONT}`;
        if (x.measureText(name).width <= maxW && f <= maxH) return draw([name], u, v, f);
        if (words.length > 1 && f * 2.1 <= maxH) { let best = null; for (let i = 1; i < words.length; i++) { const L = [words.slice(0, i).join(' '), words.slice(i).join(' ')], w = Math.max(...L.map(l => x.measureText(l).width)); if (!best || w < best[1]) best = [L, w]; }
          if (best[1] <= maxW) return draw(best[0], u, v, f); } }
      x.font = `900 8px ${FONT}`; draw(words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [name], u, v, 8); },
      draw = (lines, u, v, f) => { x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = Math.max(3, f / 4); x.strokeStyle = 'rgba(0,0,0,0.8)'; x.fillStyle = '#fff';
        lines.forEach((l, i) => { const y = v + (i - (lines.length - 1) / 2) * f * 1.08; x.strokeText(l, u, y); x.fillText(l, u, y); const w = x.measureText(l).width; nameBoxes.push([u - w / 2, y - f / 2, u + w / 2, y + f / 2]); }); };
    const room = (x0, x1, z0, z1, col, name, sz) => poly([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], col, name, sz);
    // the beer garden: paving, the stream with its bridge, the deck, the octagonal bar in the middle
    room(-10, 10.68, 16.08, 42.4, '#8e8a84', ''); room(-10, 10.68, 16.08, 20.3, '#4a3a30', 'DECK', 13); room(-10, 10.68, 20.5, 23.0, '#7fc4e8', ''); room(-6.2, -5.0, 20.3, 23.2, '#6a4a30', '');
    { const cx = 1.87, cz = 32.3, r = 3.0, pts = []; for (let i = 0; i < 8; i++) { const a = (i + 0.5) * Math.PI / 4; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } poly(pts, '#3a2a22', 'GARDEN BAR', 13); }
    { const [u, v] = P(0, 39.5); txt(x, '🌳 BEER GARDEN', u, v, 17, '#fff'); nameBoxes.push([u - 75, v - 10, u + 75, v + 10]); }
    // the car park out the front: the tarmac, the bays, Lewis's car
    poly(CARPARK, '#3d3f43', '', 12, '#1a1a1a'); { const [u, v] = P(11.5, -17.5); txt(x, '🚗 CAR PARK', u, v, 15, '#fff'); nameBoxes.push([u - 60, v - 9, u + 60, v + 9]); }
    for (const zz of [-21.9, -19.4, -16.9, -14.4, -11.9, -9.4, -6.9]) { const [a1, b1] = P(12.0, zz), [a2, b2] = P(16.4, zz); x.strokeStyle = '#ddd'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(a1, b1); x.lineTo(a2, b2); x.stroke(); }
    { const pts = [[7.3, -10.0], [9.4, -10.0], [9.4, -11.8], [7.3, -11.8]]; poly(pts, '#c8102e', '', 10, '#111'); }
    // the restaurant
    poly(REST.main, '#5a2a1e', 'RESTAURANT', 17); poly(REST.kitchen, '#e0e0e0', 'R. KITCHEN', 11); poly(REST.hall, '#b49a7a', '', 10);
    // the pub
    room(-9.72, 6.12, -8.88, 7.92, '#7a3b3b', '');
    room(-9.72, -3.48, -8.88, -0.24, '#8d5a3a', 'RAISED BOOTHS', 13);
    room(-10.2, -4.44, -16.08, -12.24, '#9fb7c9', "MEN'S", 13); room(-9.24, -5.88, -12.24, -8.88, '#b4c6d6', 'DISABLED', 10); room(-5.88, -4.44, -12.24, -8.88, '#c9b8a0', '', 10);
    room(-4.44, 0.36, -15.12, -8.88, '#d9b8cc', "WOMEN'S", 13); room(0.36, 5.64, -14.16, -8.88, '#c8c0a8', 'RECEPTION', 13);
    room(6.12, 10.68, -6.84, 0, '#a8b0bd', 'STAFF ROOM', 12); room(7.08, 10.68, 0, 7.92, '#8a9aa8', 'KEG ROOM', 12); room(5.64, 7.08, -1.2, 7.92, '#9a8a7a', '', 10);
    room(-14.4, -9.72, -8.88, 2.04, '#e0e0e0', 'KITCHEN', 13); room(-14.4, -9.72, 2.04, 5.16, '#c9b8a0', '', 10); room(-9.72, 4.68, 7.92, 16.08, '#e8dcc0', 'CONSERVATORY', 14); room(4.68, 9.0, 7.92, 15.48, '#2c3e8f', 'GAMBLING', 12);
    // the bar
    poly([[2.2, -8.6], [3.0, -8.6], [3.0, -0.6], [4.6, -0.6], [4.6, 6.2], [3.8, 6.2], [3.8, 0.2], [2.2, 0.2]], '#c98a48', '', 12, '#5a2e14'); { const [u, v] = P(3.6, 2.6); txt(x, 'THE BAR', u, v, 12, '#fff'); nameBoxes.push([u - 30, v - 8, u + 30, v + 8]); }
    // every table, counter, booth and fixture, from the level's own solid boxes (low and inside the map: not walls or the roof)
    { const cols = (this.g.room && this.g.room.colliders) || []; x.fillStyle = 'rgba(30,16,8,0.32)'; x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 1;
      for (const c of cols) { if (c.max.y > 1.6 || c.min.y > 1.2) continue; const w = c.max.x - c.min.x, d = c.max.z - c.min.z; if (w > 6 || d > 6 || w * d < 0.04) continue;
        if (c.max.x < Bx[0] || c.min.x > Bx[1] || c.max.z < Bz[0] || c.min.z > Bz[1]) continue;
        const [u0, v0] = P(c.min.x, c.min.z), [u1, v1] = P(c.max.x, c.max.z); const ux = Math.min(u0, u1), vy = Math.min(v0, v1), uw = Math.abs(u1 - u0), vh = Math.abs(v1 - v0), tall = c.max.y > 0.95;
        x.fillStyle = 'rgba(0,0,0,0.22)'; rr(x, ux + 1.5, vy + 2, uw, vh, Math.min(4, uw / 3, vh / 3)); x.fill();      // (a little shadow)
        x.fillStyle = tall ? 'rgba(70,60,55,0.75)' : 'rgba(120,72,36,0.7)'; rr(x, ux, vy, uw, vh, Math.min(4, uw / 3, vh / 3)); x.fill(); if (uw > 6 && vh > 6) { x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 1; x.stroke(); } } }
    for (const L of labels) fitLabel(...L);
    { const [u, v] = P(0, 39.5); txt(x, '🌳 BEER GARDEN', u, v, 17, '#fff'); } { const [u, v] = P(11.5, -17.5); txt(x, '🚗 CAR PARK', u, v, 15, '#fff'); } { const [u, v] = P(3.6, 2.6); txt(x, 'THE BAR', u, v, 12, '#fff'); }      // (again, on top of the furniture)
    const dot = (X, Z, r, col, edge, label, lsz = 13, lcol = '#111') => { const [u, v] = P(X, Z); x.fillStyle = col; x.strokeStyle = edge || '#111'; x.lineWidth = 3; x.beginPath(); x.arc(u, v, r, 0, 7); x.fill(); if (edge) x.stroke(); if (label) txt(x, label, u, v + 1, lsz, lcol); };
    // the bell, the jobs, the fixes, the trapdoors, you
    dot(CENTRE.x, CENTRE.z, 12, '#d81b2a', '#fff', '🔔', 13);
    const me = this.mine();
    if (me) { const h0 = this.g.player.head; let near = null, nd = 1e9;
      for (const id of me.tasks) { const t = TASK[id]; if (me.done.has(id)) continue; const dd = Math.hypot(t.at[0] - h0.x, t.at[1] - h0.z); if (dd < nd) { nd = dd; near = t; } }
      // the way to your nearest job: a dashed line, and a ring pulsing round it
      if (near) { const [a1, b1] = P(h0.x, h0.z), [a2, b2] = P(near.at[0], near.at[1]); x.save(); x.setLineDash([10, 8]); x.lineDashOffset = -performance.now() / 40; x.strokeStyle = 'rgba(255,212,0,0.85)'; x.lineWidth = 4; x.beginPath(); x.moveTo(a1, b1); x.lineTo(a2, b2); x.stroke(); x.restore();
        const k = (performance.now() / 900) % 1; x.strokeStyle = `rgba(255,212,0,${1 - k})`; x.lineWidth = 4; x.beginPath(); x.arc(a2, b2, 12 + k * 22, 0, 7); x.stroke(); }
      me.tasks.forEach((id, i) => { const t = TASK[id], d = me.done.has(id); dot(t.at[0], t.at[1], 11, d ? '#39ff14' : '#ffd400', '#111', d ? '✓' : String(i + 1)); });
      // each job's name on a little dark tag next to its dot: below it, or above, right or left if that spot's taken
      // (by another job's dot or tag), so two jobs close together never write over each other
      const taken = me.tasks.map(id => { const [u, v] = P(TASK[id].at[0], TASK[id].at[1]); return [u - 13, v - 13, u + 13, v + 13]; }).concat(nameBoxes), hit = (b) => taken.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) || b[0] < 2 || b[2] > W - 2 || b[1] < TOP || b[3] > H - 2;
      me.tasks.forEach((id, i) => { const t = TASK[id]; if (me.done.has(id)) return; const [u, v] = P(t.at[0], t.at[1]), nm = (t.name || id).toUpperCase();
        x.font = `900 11px ${FONT}`; const tw = Math.min(150, x.measureText(nm).width) + 10, th = 17;
        const spots = [[u - tw / 2, v + 14], [u - tw / 2, v - 14 - th], [u + 15, v - th / 2], [u - 15 - tw, v - th / 2], [u - tw / 2, v + 14 + th + 2], [u - tw / 2, v - 16 - th * 2]];
        let at = spots.find(([a, b]) => !hit([a, b, a + tw, b + th])) || spots[0]; taken.push([at[0], at[1], at[0] + tw, at[1] + th]);
        x.fillStyle = 'rgba(0,0,0,0.78)'; rr(x, at[0], at[1], tw, th, 6); x.fill(); x.strokeStyle = '#ffd400'; x.lineWidth = 1.5; x.stroke();
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffd400'; x.fillText(nm, at[0] + tw / 2, at[1] + th / 2 + 1, 150); }); }
    if (this.sab) for (const pnt of this.sab.k === 'lights' ? [FUSE] : VALVES) dot(pnt.at[0], pnt.at[1], 13, '#ff3b3b', '#fff', '⚠', 14, '#fff');
    for (const c of CAMS) { const [u, w] = P(c.at[0], c.at[2]), [lu, lw] = P(c.look[0], c.look[2]), a0 = Math.atan2(lw - w, lu - u), L = Math.min(70, Math.hypot(lu - u, lw - w));
      x.fillStyle = this.camWatchers && this.camWatchers.size ? 'rgba(255,60,60,0.28)' : 'rgba(255,255,255,0.16)'; x.beginPath(); x.moveTo(u, w); x.arc(u, w, L, a0 - 0.5, a0 + 0.5); x.closePath(); x.fill(); x.fillStyle = '#222'; x.fillRect(u - 5, w - 4, 10, 8); }
    { const [u, w] = P(SECURITY.at[0], SECURITY.at[1]); x.font = '18px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('📹', u, w); }
    if (this.amImp()) for (const v of VENTS) { const [u, w] = P(v.at[0], v.at[1]); x.fillStyle = '#4e342e'; x.strokeStyle = '#ff3b3b'; x.lineWidth = 3; x.fillRect(u - 8, w - 8, 16, 16); x.strokeRect(u - 8, w - 8, 16, 16); }
    const Pl = this.g.player, h = Pl.head, [hu, hv] = P(h.x, h.z), [fu, fv] = P(h.x + Pl.fwd.x, h.z + Pl.fwd.z), a = Math.atan2(fu - hu, -(fv - hv));
    x.save(); x.translate(hu, hv); x.rotate(a); x.fillStyle = '#4fc3ff'; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -15); x.lineTo(11, 11); x.lineTo(0, 5); x.lineTo(-11, 11); x.closePath(); x.fill(); x.stroke(); x.restore();
    x.fillStyle = 'rgba(0,0,0,0.65)'; x.fillRect(0, 0, W, TOP - 4); x.font = `900 22px ${FONT}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = '#ffd400'; x.fillText('🗺️ THE OYSTERFLEET', 14, TOP / 2 - 1); const titleW = x.measureText('🗺️ THE OYSTERFLEET').width;      // (left: the CLOSE button sits over the right of the header)
    // how it's going: your jobs and the team's bar, top right; what the marks mean, bottom left
    if (me) { const mine = me.tasks.length ? `${me.tasks.filter(id => me.done.has(id)).length}/${me.tasks.length} JOBS` : ''; const team = this.bar && this.bar.total ? ` · TEAM ${Math.round(100 * this.bar.done / this.bar.total)}%` : '';
      x.font = `900 15px ${FONT}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = '#39ff14'; x.fillText(this.amImp() ? '🔪 FAKE YOUR JOBS' : mine + team, 14 + titleW + 16, TOP / 2 - 1); }
    { const items = [['#ffd400', '1', 'YOUR JOB'], ['#39ff14', '✓', 'DONE'], ['#d81b2a', '🔔', 'MEETING BELL'], ['#ff3b3b', '⚠', 'SABOTAGE: FIX'], ['#222', '📹', 'CAMERAS']].concat(this.amImp() ? [['#4e342e', '', 'TRAPDOOR (VENT)']] : []);
      const LH = 22, bx = 10, by = H - 10 - items.length * LH - 12; x.fillStyle = 'rgba(0,0,0,0.6)'; rr(x, bx, by, 190, items.length * LH + 12, 10); x.fill();
      items.forEach(([col, ic, t], i) => { const yy = by + 6 + i * LH + LH / 2; x.fillStyle = col; x.beginPath(); x.arc(bx + 16, yy, 8, 0, 7); x.fill(); x.font = '11px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; if (ic) x.fillText(ic, bx + 16, yy + 1);
        x.font = `800 12px ${FONT}`; x.textAlign = 'left'; x.fillText(t, bx + 32, yy); }); }
  }

  // ------------------------------------------------------------------ every frame
  clearFood() { const it = this.g.items; if (!it) return; it.minFood = 0; it.respawnQueue.length = 0; for (const f of it.items.slice()) if (!f.def.prop) it.remove(f); }
  // which part of the pub a spot's in (the nearest job's room)
  roomNear(p) { let best = null, bd = 1e9; for (const t of TASKS) { const d = Math.hypot(t.at[0] - p[0], t.at[1] - p[1]); if (d < bd) { bd = d; best = t.room; } } return bd < 9 ? best : null; }
  update(dt) {
    const g = this.g, P = g.player, xr = g.renderer.xr.isPresenting;
    if (this.replay) { if (this.phase === 'play') this.replay.record(dt); this.replay.update(dt); }
    if (this.needSpawn > 0 && --this.needSpawn === 0) this.respawnRing();          // (a frame in: everyone starts round the bell)
    if (this.host) this.hostUpdate(dt);
    if ((this.foodT = (this.foodT || 0) - dt) <= 0) { this.foodT = 1; this.clearFood(); }
    this.panel.update(dt);
    if (this.camsGame && (this.panel.cur !== this.camsGame || !(this.mine() && this.mine().alive))) { if (this.panel.cur === this.camsGame) this.panel.close(true); this.closeCams(); }
    if (this.camLeds) { const on = this.camWatchers.size > 0 && Math.floor(performance.now() / 450) % 2 === 0; for (const l of this.camLeds) l.material.color.setHex(on ? 0xff2020 : 0x330000); }
    if (this.phase === 'intro') { this.introT -= dt; if (this.introT <= 0) { this.phase = 'play'; this.setFog(); this.warmGhosts(); } }
    this.updateGhosts(dt);
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
    this.animFx(dt);
    // bodies: stars round the head; the pan coming down on a fresh one
    for (const b of this.bodies) { if (b.cleared || !b.grp) continue; const av = this.avatar(b.id), hp = av && av.c && av.c.headPos ? av.c.headPos(new THREE.Vector3()) : null;
      const at = hp ? b.grp.worldToLocal(hp.clone()) : new THREE.Vector3(0, 0.25, 0); b.eyes.position.copy(at).add({ x: 0, y: 0.18, z: 0 });
      // line the outline and the pool up with where the body actually came to rest (hips to head)
      if (av && av.c && av.c.rag && (b.alignT = (b.alignT || 0) + dt) < 1.6) { const r = av.c.rag, pv = r.pos('pelvis', new THREE.Vector3()), hd = r.pos('head', new THREE.Vector3()), dx = hd.x - pv.x, dz = hd.z - pv.z;
        if (b.alignT > 0.5 && Math.hypot(dx, dz) > 0.25 && isFinite(pv.x)) { b.grp.rotation.y = Math.atan2(-dx, -dz); b.grp.position.x = pv.x; b.grp.position.z = pv.z; } }
      if (b.pool && b.poolT < 1) { b.poolT = Math.min(1, b.poolT + dt / 2.8); b.pool.scale.setScalar(0.05 + 0.95 * Math.sqrt(b.poolT)); }
      b.stars.forEach((s, i) => { const a = performance.now() / 400 + i * Math.PI / 2; s.position.set(at.x + Math.cos(a) * 0.22, at.y + 0.3, at.z + Math.sin(a) * 0.22); s.rotation.y += dt * 4; }); }
    if (this.panT > 0) { this.panT += dt; const k = Math.min(1, this.panT / 0.35), sw = (1 - k) * Math.PI * 0.9; this.pan.visible = this.panT < 0.9; this.pan.position.copy(this.panAt).add({ x: Math.sin(sw) * 0.7, y: -1.2 * k * k + Math.cos(sw) * 0.25 - 0.25, z: 0 }); this.pan.rotation.set(-k * 1.4, 0, sw); if (this.panT > 0.35 && this.panT < 0.6) this.pan.position.y += Math.sin((this.panT - 0.35) * 40) * 0.03; if (this.panT > 0.9) this.panT = 0; }
    // ghosts (only other ghosts see them): float where they are
    for (const [id, s] of this.ghostTags) { if (!s.visible) continue; const q = this.posOf(id); if (q) s.position.set(q.x, q.y + 0.1 + Math.sin(performance.now() / 500) * 0.05, q.z); }
    // the critical sabotage: alarm, countdown
    if (this.sab) { const crit = this.sab.until, left = crit ? Math.max(0, Math.ceil(this.sab.until - now())) : 0;
      this.alertEl.classList.add('on'); this.alertEl.innerHTML = crit ? `🛢️ KEG PRESSURE! ${left}s<br><small>FIX BOTH VALVES: KEG ROOM ${this.sab.fixed[0] ? '✓' : '✗'} · KITCHEN ${this.sab.fixed[1] ? '✓' : '✗'}</small>` : '💡 LIGHTS OUT!<br><small>FIX THE FUSE BOX IN THE STAFF ROOM</small>';
      if (crit && (this.alarmT -= dt) <= 0) { this.alarmT = 1.1; sfx('alarm', null, 0.5); } }
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
    B.use.classList.toggle('off', !n.use || !(play || this.phase === 'waiting')); B.use.querySelector('b').textContent = n.use ? (n.use.kind === 'bell' ? '🔔' : n.use.kind === 'fix' ? '🔧' : n.use.kind === 'cams' ? '📹' : '✋') : '✋';
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
  // a burst of little bits (sparkles for a job done, stars for a BONK): they fly out, fall and fade
  burst(at, cols, n = 20, speed = 2.2) {
    this.fx = this.fx || [];
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(i % 3 ? new THREE.OctahedronGeometry(0.03) : new THREE.TetrahedronGeometry(0.035), new THREE.MeshBasicMaterial({ color: cols[i % cols.length], transparent: true }));
      m.position.copy(at); const a = Math.random() * Math.PI * 2, u = Math.random(); m.userData.v = new THREE.Vector3(Math.cos(a) * speed * (0.4 + u), 1.5 + Math.random() * 2.2, Math.sin(a) * speed * (0.4 + u)); m.userData.t = 0; this.grp.add(m); this.fx.push(m); }
  }
  animFx(dt) {
    if (this.fx) this.fx = this.fx.filter(m => { const u = m.userData; u.t += dt; u.v.y -= 6 * dt; m.position.addScaledVector(u.v, dt); m.rotation.x += dt * 8; m.rotation.y += dt * 6; m.material.opacity = Math.max(0, 1 - u.t / 1.1); if (u.t > 1.1) { this.grp.remove(m); m.geometry.dispose(); return false; } return true; });
    // the bell: it swings and rings when a meeting's called
    if (this.bellT > 0) { this.bellT += dt; const k = Math.max(0, 1 - this.bellT / 3); this.bell.rotation.z = Math.sin(this.bellT * 18) * 0.6 * k; this.bigBtn.position.y = 1.03 - (this.bellT < 0.3 ? 0.03 : 0); if (this.bellT > 3) { this.bellT = 0; this.bell.rotation.z = 0; } }
    // the pan: a big swing round from behind, a trail behind it, and on the hit a burst of stars and a flash
    if (this.panT > 0 && this.panTrail) { this.panTrail.visible = this.pan.visible; this.panTrail.position.copy(this.pan.position); this.panTrail.rotation.copy(this.pan.rotation); this.panTrail.material.opacity = 0.35 * (1 - Math.min(1, this.panT / 0.5)); }
    if (this.panT > 0.33 && !this.panHit) { this.panHit = true; this.burst(this.panAt.clone().add({ x: 0, y: -1.1, z: 0 }), [0xffd400, 0xffffff, 0xff5252], 30, 2.8); }
    if (this.panT === 0) this.panHit = false;
  }
  // ------------------------------------------------------------------ ghosts (like Among Us)
  // Dead, you're a ghost: you float through walls (player.js), a little quicker, anywhere in the map, and you see every
  // other ghost as a see-through, pale blue copy of their character, walking about where they really are (their body
  // stays where it fell). The living never see a ghost at all: these copies are only ever made on a ghost's own game
  updateGhosts(dt) {
    const me = this.mine(), meDead = !!(me && !me.alive) && this.phase !== 'over' && this.phase !== 'waiting', P = this.g.player;
    P.ghost = meDead;
    const G = this.ghostPups || (this.ghostPups = new Map());
    for (const p of this.players.values()) {
      const want = meDead && !p.alive && !p.left && p.id !== this.me, np = this.net.players.get(p.id); let gp = G.get(p.id);
      if (want && !gp && np && np.pose && this.net.makeAvatar) { gp = this.net.makeAvatar(np); if (!gp) continue; G.set(p.id, gp);
        for (const pt of gp.c.rag.list) pt.body.collisionResponse = false; }      // (nothing bumps into a ghost)
      if (!want && gp) { gp.dispose(); G.delete(p.id); continue; }
      if (!gp) continue;
      if (np && np.pose) gp.update(dt, np.pose);
      if ((gp.ghostT = (gp.ghostT || 0) - dt) <= 0) { gp.ghostT = 0.5; this.ghostify(gp.c.rag.group); }      // (and anything new on them: an emote's bits, a bigger belly)
    }
    for (const [id, gp] of G) if (!this.players.has(id)) { gp.dispose(); G.delete(id); }
    // you, a ghost: a cold blue edge round your view
    if (!this.ghostEl) { const d = this.ghostEl = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;opacity:0;transition:opacity .8s;background:radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(120,170,255,0.38) 100%)'; document.body.appendChild(d); }
    this.ghostEl.style.opacity = meDead ? '1' : '0';
  }
  // a see-through, pale blue version of a material (made once, kept: the graphics chip's program for it stays built)
  ghostMat(m) {
    const C = this.ghostMats || (this.ghostMats = new Map()); let c = C.get(m.uuid); if (c) return c;
    c = m.clone(); c.transparent = true; c.opacity = 0.42; c.depthWrite = false; if (c.color) c.color.lerp(new THREE.Color(0xbfe0ff), 0.55); if (c.emissive) c.emissive.setHex(0x1a2a48);
    c.userData.keep = true; c.userData.ghost = true; C.set(m.uuid, c); C.set(c.uuid, c); return c;
  }
  ghostify(root) {
    if (!root) return;
    root.traverse(o => { if (!o.isMesh || !o.material) return; const ms = [].concat(o.material); if (ms.every(m => m.userData && m.userData.ghost)) return;
      const gs = ms.map(m => this.ghostMat(m)); o.material = Array.isArray(o.material) ? gs : gs[0]; o.castShadow = false; });
  }
  // built while the game's starting (not the moment someone dies: building a program mid-game is a stutter): the ghost
  // version of every material on everyone's character
  warmGhosts() {
    try { const R = this.g.renderer, tmp = [], avs = [...this.players.keys()].map(id => this.avatar(id)).filter(Boolean);
      for (const av of avs) { const g = av.c && av.c.rag && av.c.rag.group; if (!g) continue;
        g.traverse(o => { if (!o.isMesh || !o.material) return; const mats = [].concat(o.material).map(m => this.ghostMat(m));
          let t; if (o.isSkinnedMesh && o.skeleton) { t = new THREE.SkinnedMesh(o.geometry, mats.length > 1 ? mats : mats[0]); t.bind(o.skeleton, o.bindMatrix); } else t = new THREE.Mesh(o.geometry, mats.length > 1 ? mats : mats[0]);
          if (o.geometry && o.geometry.morphAttributes && Object.keys(o.geometry.morphAttributes).length) t.updateMorphTargets();
          t.layers.set(31); t.frustumCulled = false; t.raycast = () => {}; this.grp.add(t); tmp.push(t); }); }
      if (tmp.length) R.compile(this.g.scene, this.g.player.camera);
      for (const t of tmp) this.grp.remove(t);
    } catch (e) { console.warn('ghost warm-up', e); }
  }
  dispose() {
    for (const gp of (this.ghostPups || new Map()).values()) gp.dispose(); this.ghostPups = null; if (this.ghostEl) { this.ghostEl.remove(); this.ghostEl = null; } this.g.player.ghost = false;
    this.dim(false); if (this.camsGame) { this.camsGame.dispose(); this.camsGame = null; }
    this.panel.close(true); this.panel.wrap.remove(); this.g.scene.remove(this.panel.mesh, this.panel.dot); this.g.scene.remove(this.grp);
    for (const el of [this.ui, this.splash, this.alertEl, this.mapEl, this.sabEl, this.style, this.tasksEl]) el && el.remove(); if (this.g.player.wrist && this.g.player.flatMode) this.g.player.wrist.visible = true;
    document.body.classList.remove('imposter'); window.removeEventListener('keydown', this.onKey, true);
    for (const k in this.handlers) delete this.net.on[k]; this.net.on.leave = this.leaveWas;
    const mp = this.g.mp; mp.noPunch = false; mp.chatGate = null; mp.chatRecvGate = null; this.g.player.noGrab = false;
    this.g.scene.fog = this.fog0 || null; this.g.scene.userData.fogLock = false; this.g.player.menuLock = false;
    for (const p of this.players.values()) { const av = this.avatar(p.id); if (av) { av.impBody = av.impHidden = av.impRed = false; av.impLaid = false; } }
  }
}
