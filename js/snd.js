// SEARCH AND DESTROY: two teams, one bomb, no second chances. Played at the Oysterfleet ('pub'), in Lidl ('shop') and
// round Lewis's house ('garden'), on your own (with the squad as bots) or in a room of up to 12.
//   - THE GREASY SPOONS v THE SALAD DODGERS. One side ATTACKS: they carry THE VINDALOO (a curry pot strapped to six
//     sausages) and plant it at bomb site A or B. The other side DEFENDS: stop the plant, or defuse it once it's down.
//   - FULL TEAMS: however many people there are (one on their own, a room of 2, 5, 11...), the host fills both sides up
//     with the squad as bots, to the map's size (five a side in the pub and Lidl, four in Lewis's garden; more if there
//     are more people than that) and keeps them even. Between rounds bots make way for anyone who's joined and come back
//     for anyone who's left. A bot's name tag says so (🤖).
//   - DINNER MONEY: every round starts in the SHOP. Nine guns in two slots (a PRIMARY and a SIDEARM: the ketchup pistol's
//     free), paid for with money earned by kills, plants, defuses and rounds (more for a round won; a losing streak gets
//     a bit more each time). Live through a round and you keep your guns; go down and they're dropped where you fell
//     for anyone to pick up. Half time: everyone starts again from the same money.
//   - The guns themselves (fire modes, recoil, spread, reloads, aiming, the walls they go through) are in sndguns.js.
//   - No respawns inside a round: 100 health, armour soaks up some of every hit. Out of the round when it's gone, then
//     a recap of who got you and with what, a look at them, and you watch a team-mate.
//   - Round won by: wiping the other team out, the bomb going off (attackers), the bomb defused or the clock running
//     out before a plant (defenders). Sides swap at half time; first to 4 rounds (3 short, 6 long) wins.
//   - PICK-UPS dotted round the map: ammo boxes, food (eating heals), stab vests (armour) and perks (fast reload,
//     speed, extra damage, quick plant/defuse, double magazine) with their timers on the HUD.
// The HOST's game is the referee: the teams, the money, what everyone's carrying, the clock, every hit and kill, the
// bomb, the dropped guns, the pick-ups and the bots (the squad, run on the host and sent out ten times a second).
// Everyone sends their own shots (seen and heard by all) and their hits, buys and grabs (checked by the host). The
// screens, the HUD and the scoreboard are in sndui.js, the effects in sndfx.js, the models in sndkit.js.
import * as THREE from 'three';
import { sfx } from './audio.js';
import { Panel } from './impgames.js';
import { track } from './awards.js';
import { roomNum } from './roomopts.js';
import { SQUAD } from './squad.js';
import { vcLambert } from './geo.js';
import { GUNS, GUN, PRIMARIES, FREE_GUN, PICKS, PICK_KINDS, MAPS, pickModel, plinthGeo, bombGeo, bombLightGeo, bombFace, pliersGeo, siteTexture, signTexture, siteProps, boardTexture, newGun, falloff, maxHit, money } from './sndkit.js';
import { UI } from './sndui.js';
import { GUNSYS } from './sndguns.js';
import { FX } from './sndfx.js';

export const SD = {
  HP: 100, AR_MAX: 100, AR_ABS: 0.6, BUY_T: 14, ROUND_T: 115, BOMB_T: 40, PLANT_T: 3.2, DEFUSE_T: 6.5, END_T: 7, OVER_T: 3,
  PICK_R: 1.25, BOMB_R: 1.5, BOOM_R: 8, GRAB_R: 1.4, TEAM_MAX: 6, MAX: 12, SPOT_R: 32, BOT_SPEED: 2.35, ASSIST_D: 30,
  CASH0: 2000, CASH_MAX: 9000, WIN_CASH: 2500, LOSE_CASH: 1400, LOSE_STEP: 500, OBJ_CASH: 300, DROPS: 14,
};
export const TEAMS = { R: { name: 'THE GREASY SPOONS', short: 'GREASY SPOONS', col: '#ff5a3d', hex: 0xff5a3d, ico: '🍳' }, B: { name: 'THE SALAD DODGERS', short: 'SALAD DODGERS', col: '#3da5ff', hex: 0x3da5ff, ico: '🥗' } };
// the squad's lines when they get someone (bots), in the style of the rest of the game
const KILL_LINES = Object.assign(Object.create(null), {
  lewis: 'SIUUU!', noah: 'TACKLED!', aidan: 'JUST THE ONE!', chloe: 'EAT YOUR GREENS!', harry: 'SWIPED LEFT!', oliver: 'THAT\'S GOING ON MY STORY!', dylan: 'DON\'T LOOK BACK IN ANGER!',
  connor: 'ONE FOR YOU, ONE FOR ME!', ethan: 'GALÁCTICO!', ian: 'GET SOME VEG IN YOU!', alfie: 'NUTMEGGED!', ben: 'BACK TO TURKEY!', aidanw: 'MIND THE KNEE!', tommy: 'I\'M JUST TRYING TO HELP!', ronnie: 'NOM NOM!',
});
const HOST_MSGS = ['sdRound', 'sdGo', 'sdClock', 'sdDmg', 'sdKill', 'sdGot', 'sdPk', 'sdBomb', 'sdEnd', 'sdOver', 'sdState', 'sdBots', 'sdHp', 'sdWait', 'sdLoad', 'sdCash', 'sdDrop'];
const r2 = (v) => Math.round(v * 100) / 100;
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const finite = (...v) => v.every(n => typeof n === 'number' && isFinite(n));
const v3ok = (v) => Array.isArray(v) && v.length === 3 && v.every(n => typeof n === 'number' && isFinite(n) && Math.abs(n) < 1e4);
const other = (t) => t === 'R' ? 'B' : 'R';
const gunOk = (g, slot) => typeof g === 'string' && GUN[g] && (!slot || GUN[g].slot === slot) ? g : null;
export const winTarget = () => { const k = roomNum('len'); return k < 0.8 ? 3 : k > 1.2 ? 6 : 4; };
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _m4 = new THREE.Matrix4(), _hit = new THREE.Vector3();

export class SearchDestroy {
  // g: { scene, room, player, net, mp, words, renderer, camera, items, selfBody(), showBanner, makePuppet(p), director, crumbs }
  constructor(g) {
    this.g = g; this.net = g.net; this.online = !!g.net.connected; this.me = (this.online && g.net.id) || 'me'; this.host = !this.online || !!g.net.host;
    this.place = MAPS[g.room.placeId] ? g.room.placeId : 'pub'; this.M = MAPS[this.place];
    this.clock = 0; this.phase = 'wait'; this.F = new Map(); this.round = 0; this.win = winTarget(); this.half = this.win - 1; this.sc = { R: 0, B: 0 }; this.att = 'R';
    this.pk = []; this.bomb = { st: 'none' }; this.puppets = new Map(); this.rGuns = new Map(); this.kick = {}; this.botPose = new Map(); this.endsAt = 0; this.bombAt = 0;
    this.cash = {}; this.drops = new Map(); this.hist = []; this.dmgLog = [];
    this.my = this.newMy();
    this.feedLog = []; this.btnWas = {}; this.handlers = {}; this.prevOn = {}; this.dmgDirs = [];
    this.grp = new THREE.Group(); this.grp.name = 'search and destroy'; g.scene.add(this.grp);
    this.panel = new Panel({ scene: g.scene, player: g.player, renderer: g.renderer });
    this.buildWorld(); this.initFx(); this.buildUI(); this.walled(new THREE.Ray(), 0);
    this.updateSpeed();
    // nobody punches, grabs or eats anything: it's guns only. No food lying about either
    const mp = g.mp; if (mp) mp.noPunch = true; g.player.noGrab = true; g.player.flatDrop && g.player.flatDrop(); for (const h of g.player.hands || []) if (h.held) { h.held.heldBy = null; h.held = null; }
    this.clearFood();
    // the messages
    const on = (k, f) => { this.handlers[k] = f; if (!(k in this.prevOn)) this.prevOn[k] = this.net.on[k]; this.net.on[k] = (m, p) => { try { f(m, p); } catch (e) { console.error('snd', k, e); } }; };
    const fromHost = (p) => !!p && p.id === this.net.hostId;
    for (const k of HOST_MSGS) on(k, (m, p) => { if (!this.host && fromHost(p) && (!m.to || m.to === this.me)) this.apply(k, m); });
    on('sdHello', (m, p) => { if (this.host && p) this.hostHello(p.id); });
    on('sdGun', (m, p) => { if (p) this.setGun(String(p.id), m.g); });
    on('sdShot', (m, p) => { if (!p) return; this.remoteShot(this.botOr(m, p), m); });
    on('sdHit', (m, p) => { if (this.host && p) this.hostHit(String(p.id), m); });
    on('sdTake', (m, p) => { if (this.host && p) this.hostTake(String(p.id), m.i); });
    on('sdPlant', (m, p) => { if (this.host && p) this.hostPlant(String(p.id), m); });
    on('sdDefuse', (m, p) => { if (this.host && p) this.hostDefuse(String(p.id)); });
    on('sdBuy', (m, p) => { if (this.host && p) this.hostBuy(String(p.id), m.g); });
    on('sdGrab', (m, p) => { if (this.host && p) this.hostGrab(String(p.id), m.d); });
    on('sdAct', (m, p) => { if (p) this.remoteAct(this.botOr(m, p), m); });
    on('end', (m, p) => { if (this.host || !m || !Array.isArray(m.lines) || (p && p.id !== this.net.hostId)) return; m.lines = this.summary(); const f = this.prevOn.end; f && f(m, p); });      // (a guest's receipt: their own game's lines)
    this.leaveWas = this.net.on.leave; this.net.on.leave = (m) => { this.leaveWas && this.leaveWas(m); if (this.host && m) this.hostLeft(String(m.id)); };
    if (this.host) this.startT = this.online ? 2.5 : 1.0; else { this.net.send({ t: 'sdHello' }); this.helloT = 3; }
    this.respawnAt(this.M.att[0], this.M.att[1]);
  }
  // (a message the host sends for one of its bots names the bot; anyone else's is their own)
  botOr(m, p) { return m.id != null && p.id === this.net.hostId && this.F.has(String(m.id)) && this.F.get(String(m.id)).bot ? String(m.id) : String(p.id); }
  // ------------------------------------------------------------------ who's who
  mine() { return this.F.get(this.me); }
  live() { return this.phase === 'live'; }
  inRound() { return this.phase === 'buy' || this.phase === 'live' || this.phase === 'post'; }
  nameOf(id) { const f = this.F.get(id); if (f) return f.name; const p = this.net.players.get(id); return (p && p.name) || (id === this.me ? (this.net.name || 'YOU') : 'SOMEONE'); }
  teamOf(id) { const f = this.F.get(id); return f ? f.team : null; }
  side(team) { return team === this.att ? 'att' : 'def'; }
  myTeam() { const m = this.mine(); return m ? m.team : null; }
  alive(team) { return [...this.F.values()].filter(f => f.team === team && f.alive && !f.gone); }
  roster() { const list = [{ id: this.me, name: this.net.name || 'YOU', char: this.net.char || 'ronnie' }]; if (this.online) for (const p of this.net.players.values()) list.push({ id: String(p.id), name: p.name || 'PLAYER', char: p.char || 'ronnie' }); return list.sort((a, b) => String(a.id).localeCompare(String(b.id))); }
  floor(x, z) { const r = this.g.room; return (r.floorAt ? r.floorAt(x, z) : 0) || 0; }
  hd(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
  avatar(id) { if (id === this.me) return this.g.selfBody ? this.g.selfBody() : null; const f = this.F.get(id); if (f && f.bot) return this.puppets.get(id) || null; const p = this.net.players.get(id); return p && p.avatar; }
  // where someone's head is (me: my eyes; a bot: where it is; another player: where they're drawn, so what you see is what you hit)
  headOf(id, out = new THREE.Vector3()) {
    if (id === this.me) return out.copy(this.g.player.head);
    const f = this.F.get(id);
    if (f && f.bot) { if (this.host) { const b = this.bots && this.bots.get(id); if (b) return out.set(b.x, this.floor(b.x, b.z) + 1.62, b.z); } const bp = this.botPose.get(id); if (bp) return out.set(bp.x, this.floor(bp.x, bp.z) + 1.62, bp.z); return null; }
    const p = this.net.players.get(id); if (!p) return null;
    if (p.avatar && p.avatar.pos && !p.avatar.first && isFinite(p.avatar.pos.x)) return out.copy(p.avatar.pos);
    if (p.pose && Array.isArray(p.pose.h) && finite(...p.pose.h)) return out.set(p.pose.h[0], p.pose.h[1], p.pose.h[2]);
    return null;
  }
  // (the host's own check of where someone is: from their latest move, not the smoothed drawing)
  posOf(id, out = new THREE.Vector3()) {
    if (id === this.me) { const h = this.g.player.head; return out.set(h.x, this.floor(h.x, h.z), h.z); }
    const f = this.F.get(id); if (f && f.bot) { const h = this.headOf(id, out); if (h) h.y = this.floor(h.x, h.z); return h; }
    const p = this.net.players.get(id); if (!p || !p.pose || !Array.isArray(p.pose.h)) return null; const [x, , z] = p.pose.h; if (!finite(x, z)) return null; return out.set(x, this.floor(x, z), z);
  }

  // ------------------------------------------------------------------ the world: bomb sites, pick-ups, the bomb
  buildWorld() {
    const room = this.g.room, nav = room.nav;
    this.sites = {};
    for (const L of ['A', 'B']) { const [x, z, r] = this.M[L], y = this.floor(x, z) + 0.025;
      const tex = siteTexture(L, this.M.names[L]), decal = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      decal.rotation.x = -Math.PI / 2; decal.position.set(x, y, z); decal.renderOrder = 2; decal.name = 'sd site ' + L; this.grp.add(decal);
      const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTexture(L, '#ffd400'), transparent: true, depthWrite: false })); sign.scale.set(0.9, 0.45, 1); sign.position.set(x, y + 2.35, z); sign.renderOrder = 3; this.grp.add(sign);
      this.sites[L] = { L, x, z, r, decal, sign };
      // round the edge: cones, posts with hazard tape between them, a sandwich board telling you where you are
      if (nav) { const at = [], tape = [], ring = r + 0.35, free = (px, pz) => { const k = nav.idx(px, pz); return k >= 0 && !!nav.free[k]; }; let post = null, boardDone = false;
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, px = x + Math.cos(a) * ring, pz = z + Math.sin(a) * ring; if (!free(px, pz)) { post = null; continue; } const py = this.floor(px, pz);
          if (!boardDone && i % 4 === 2) { at.push([px, py, pz, -a + Math.PI / 2, 'board'], [px + Math.cos(a) * 0.55, py, pz + Math.sin(a) * 0.55, -a, 'crate']); boardDone = [px, py, pz, a]; post = null; continue; }
          if (i % 2) { at.push([px, py, pz, a, 'cone']); post = null; } else { at.push([px, py, pz, 0, 'post']); if (post) tape.push([post[0], post[1], px, pz, py + 0.85]); post = [px, pz]; } }
        const geo = siteProps(at, tape); if (geo) { const m = new THREE.Mesh(geo, vcLambert); m.name = 'sd site props ' + L; m.castShadow = !!room.shadows; this.grp.add(m); }
        if (boardDone) { const [px, py, pz, a] = boardDone, tx = boardTexture(L, this.M.names[L]); for (const s of [-1, 1]) { const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.72), new THREE.MeshLambertMaterial({ map: tx }));
          const yaw = -a + Math.PI / 2, cy = Math.cos(yaw), sy = Math.sin(yaw); pm.position.set(px + sy * s * 0.14, py + 0.47, pz + cy * s * 0.14); pm.rotation.set(0, yaw + (s > 0 ? 0 : Math.PI), 0, 'YXZ'); pm.rotateX(-0.22); this.grp.add(pm); } } } }
    // the pick-ups: one instanced mesh per kind (per piece), the plinths they sit on, a ring and a soft glow over each
    this.pkMesh = {}; const shadows = !!room.shadows;
    for (const k of PICK_KINDS) { const m = pickModel(k); this.pkMesh[k] = { s: m.s, lift: m.lift, meshes: m.parts.map(([geo, mat]) => { const im = new THREE.InstancedMesh(geo, mat, 8); im.count = 0; im.castShadow = shadows; im.frustumCulled = false; im.name = 'sd pick ' + k; this.grp.add(im); return im; }) }; }
    this.ringMesh = new THREE.InstancedMesh(new THREE.TorusGeometry(0.34, 0.025, 6, 28).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff }), 48); this.ringMesh.count = 0; this.ringMesh.frustumCulled = false; this.ringMesh.name = 'sd pick rings';
    this.ringMesh.setColorAt(0, new THREE.Color(1, 1, 1)); this.grp.add(this.ringMesh);
    this.plinthMesh = new THREE.InstancedMesh(plinthGeo(), vcLambert, 48); this.plinthMesh.count = 0; this.plinthMesh.frustumCulled = false; this.plinthMesh.receiveShadow = shadows; this.plinthMesh.name = 'sd pick plinths'; this.grp.add(this.plinthMesh);
    const gc = document.createElement('canvas'); gc.width = 4; gc.height = 64; const gg = gc.getContext('2d'), gr = gg.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0.5)'); gg.fillStyle = gr; gg.fillRect(0, 0, 4, 64);
    const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace;
    this.glowMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.3, 1.1, 16, 1, true).translate(0, 0.55, 0), new THREE.MeshBasicMaterial({ map: gt, transparent: true, depthWrite: false, side: THREE.DoubleSide }), 48);
    this.glowMesh.count = 0; this.glowMesh.frustumCulled = false; this.glowMesh.name = 'sd pick glow'; this.glowMesh.setColorAt(0, new THREE.Color(1, 1, 1)); this.grp.add(this.glowMesh);
    // THE VINDALOO: the pot and its sausages, the blinking lights, the clock's face, the pliers by it while it's defused
    this.bombMesh = new THREE.Group(); this.bombMesh.add(new THREE.Mesh(bombGeo(), vcLambert));
    this.bombLight = new THREE.Mesh(bombLightGeo(), new THREE.MeshBasicMaterial({ color: 0xff2020 })); this.bombMesh.add(this.bombLight);
    this.face = bombFace(); const fm = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.058), new THREE.MeshBasicMaterial({ map: this.face.tex })); fm.position.set(0, 0.122, 0.2205); this.bombMesh.add(fm);
    this.pliersMesh = new THREE.Mesh(pliersGeo(), vcLambert); this.pliersMesh.visible = false; this.grp.add(this.pliersMesh);
    this.bombMesh.visible = false; this.bombMesh.name = 'sd bomb'; this.grp.add(this.bombMesh);
    this.bombRing = new THREE.Mesh(new THREE.TorusGeometry(SD.BOMB_R, 0.03, 6, 40).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3b3b })); this.bombRing.visible = false; this.grp.add(this.bombRing);
    // VR: the aiming laser
    this.laser = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -8)]), new THREE.LineBasicMaterial({ color: 0xff5a3d, transparent: true, opacity: 0.55 })); this.laser.visible = false; this.laser.frustumCulled = false; this.grp.add(this.laser);
  }
  // the pick-ups as the host laid them out: [kind, x, z] each; drawn where they are, bobbing and turning
  layPicks(list) {
    this.pk = []; if (Array.isArray(list)) for (const e of list.slice(0, 40)) { if (!Array.isArray(e)) continue; const [k, x, z] = e; if (typeof k !== 'string' || !PICKS[k] || !finite(x, z) || Math.abs(x) > 1e3 || Math.abs(z) > 1e3) continue; this.pk.push({ k, x, z, y: this.floor(x, z), on: true, back: 0 }); }
    this.drawPicks(0);
  }
  drawPicks(t) {
    const n = {}; for (const k in this.pkMesh) n[k] = 0; let ri = 0; const col = new THREE.Color();
    for (let i = 0; i < this.pk.length; i++) { const p = this.pk[i], M = this.pkMesh[p.k]; if (!M) continue;
      // (the plinth stays when it's been taken, so you know one comes back there)
      if (ri < 48) { _m4.compose(_v.set(p.x, p.y, p.z), _q.identity(), _w.setScalar(1)); this.plinthMesh.setMatrixAt(ri, _m4);
        const on = p.on ? 1 : 0.12; _m4.compose(_v.set(p.x, p.y + 0.1, p.z), _q.identity(), _w.set(1, (p.on ? 1 + Math.sin(t * 3 + i) * 0.1 : 0.25), 1)); this.glowMesh.setMatrixAt(ri, _m4); this.glowMesh.setColorAt(ri, col.setHex(PICKS[p.k].col).multiplyScalar(on));
        _m4.compose(_v.set(p.x, p.y + 0.1, p.z), _q.identity(), _w.setScalar(p.on ? 1 + Math.sin(t * 4 + i) * 0.06 : 0.85)); this.ringMesh.setMatrixAt(ri, _m4); this.ringMesh.setColorAt(ri, col.setHex(p.on ? PICKS[p.k].col : 0x555555)); ri++; }
      if (!p.on || n[p.k] >= 8) continue;
      const bob = Math.sin(t * 2.4 + i) * 0.05, s = M.s * (p.pop ? Math.min(1, p.pop) : 1);
      _e.set(0, t * 1.3 + i, 0); _q.setFromEuler(_e); _m4.compose(_v.set(p.x, p.y + 0.38 + M.lift + bob, p.z), _q, _w.setScalar(s * 1.15)); for (const im of M.meshes) im.setMatrixAt(n[p.k], _m4); n[p.k]++; }
    for (const k in this.pkMesh) for (const im of this.pkMesh[k].meshes) { im.count = n[k]; im.instanceMatrix.needsUpdate = true; }
    for (const im of [this.ringMesh, this.plinthMesh, this.glowMesh]) { im.count = ri; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
  }
  clearFood() { const it = this.g.items; if (!it) return; it.minFood = 0; if (it.respawnQueue) it.respawnQueue.length = 0; for (const f of (it.items || []).slice()) if (!f.def.prop) it.remove(f); }
  // the walls (and anything tall) a shot can't go through
  walled(ray, t) {
    if (!this.walls) this.walls = (this.g.room.colliders || []).filter(b => b.max.y - b.min.y > 1.4 && b.min.y < 0.7).map(b => new THREE.Box3(b.min.clone(), b.max.clone()));
    for (const b of this.walls) { if (b.containsPoint(ray.origin)) continue; const p = ray.intersectBox(b, _hit); if (p && p.distanceTo(ray.origin) < t) return true; }
    return false;
  }
  wallT(ray, max) {
    let t = max; if (!this.walls) this.walled(ray, 0);
    for (const b of this.walls) { if (b.containsPoint(ray.origin)) continue; const p = ray.intersectBox(b, _hit); if (p) t = Math.min(t, p.distanceTo(ray.origin)); }
    if (ray.direction.y < -0.02) t = Math.min(t, (ray.origin.y - this.floor(ray.origin.x, ray.origin.z)) / -ray.direction.y);
    return Math.max(0.2, t);
  }
  canSee(a, b) { const d = _w.copy(b).sub(a), L = d.length(); if (L < 0.01) return true; const ray = new THREE.Ray(a.clone(), d.divideScalar(L)); return !this.walled(ray, L - 0.2); }

  // ------------------------------------------------------------------ spawns
  // where someone starts: round their team's spot, spread out (the same answer on every game, from the round's list)
  spawnFor(id, list, att) {
    const f = list.find(e => e[0] === id); if (!f) return null; const team = f[3], mates = list.filter(e => e[3] === team), i = mates.indexOf(f), base = this.M[team === att ? 'att' : 'def'];
    const a = i * 2.39996, r = i ? 0.6 + 0.42 * Math.sqrt(i) : 0; let x = base[0] + Math.cos(a) * r, z = base[1] + Math.sin(a) * r;
    const nav = this.g.room.nav; if (nav) { const k = nav.nearestFree(x, z); if (k >= 0) { const c = nav.center(k); x = c.x; z = c.y; } }
    const opp = this.M[team === att ? 'def' : 'att'], yaw = Math.atan2(-(opp[0] - x), -(opp[1] - z));
    return [r2(x), r2(z), r2(yaw)];
  }
  respawnAt(x, z, yaw) { this.pinAt = null; const P = this.g.player, cam = P.camera.getWorldPosition(new THREE.Vector3()); P.rig.position.x += x - cam.x; P.rig.position.z += z - cam.z; P.head.x = x; P.head.z = z; if (yaw !== undefined && P.flatMode) { P.flatYaw = yaw - P.rig.rotation.y; P.flatPitch = -0.05; } }
  // held where you are (the shop at the start of a round, planting, defusing, watching once you're out)
  pin(on) {
    const P = this.g.player; if (!on) { this.pinAt = null; return; } if (!this.pinAt) this.pinAt = { x: P.head.x, z: P.head.z };
    P.fx.frozen = Math.max(P.fx.frozen || 0, 0.12); const dx = P.head.x - this.pinAt.x, dz = P.head.z - this.pinAt.z; if (Math.hypot(dx, dz) > 0.05) { P.rig.position.x -= dx; P.rig.position.z -= dz; P.head.x -= dx; P.head.z -= dz; }
  }

  // ------------------------------------------------------------------ the host: teams, rounds, money, the referee
  send(k, m) { m.t = k; this.net.send(m); this.apply(k, m); }
  ask(k, m) { if (this.host) { const f = { sdHit: () => this.hostHit(this.me, m), sdTake: () => this.hostTake(this.me, m.i), sdPlant: () => this.hostPlant(this.me, m), sdDefuse: () => this.hostDefuse(this.me), sdBuy: () => this.hostBuy(this.me, m.g), sdGrab: () => this.hostGrab(this.me, m.d) }[k]; f && f(); } else { m.t = k; this.net.send(m); } }
  hostStart() {
    const humans = this.roster(), H = this.H = { r: 0, sc: { R: 0, B: 0 }, att: Math.random() < 0.5 ? 'R' : 'B', team: {}, bots: [], botN: 0, stats: {}, hits: {}, picks: [], cash: {}, load: {}, bought: {}, dmgBy: {}, rs: {}, streak: { R: 0, B: 0 }, hist: [], dropN: 0, drops: new Map() };
    // the people split evenly; bots (the squad, as whoever nobody's playing) fill both sides up to the map's size
    shuffle(humans).forEach((p, i) => { H.team[p.id] = i % 2 ? 'B' : 'R'; });
    this.win = winTarget(); this.half = this.win - 1;
    this.bots = new Map(); this.hostRound();
  }
  // how many a side: the map's own size, or more if there are more people than that (never more than six)
  teamSize(n) { return clamp(Math.max(this.M.team || 5, Math.ceil(n / 2)), 1, SD.TEAM_MAX); }
  // the teams for the next round: whoever's left goes, whoever's joined is put on the side with fewer people, the
  // people evened out if someone's left a side short, then bots on each side to fill it to the size
  balance(humans) {
    const H = this.H, ids = new Set(humans.map(p => p.id)), size = this.teamSize(humans.length);
    for (const id of Object.keys(H.team)) if (!H.bots.some(b => b.id === id) && !ids.has(id)) { delete H.team[id]; delete H.load[id]; }
    const hc = (t) => humans.filter(p => H.team[p.id] === t).length, tc = (t) => Object.values(H.team).filter(x => x === t).length;
    for (const p of humans) if (!H.team[p.id]) { const t = hc('R') < hc('B') ? 'R' : hc('B') < hc('R') ? 'B' : tc('R') <= tc('B') ? 'R' : 'B'; H.team[p.id] = t; if (H.cash[p.id] == null) H.cash[p.id] = SD.CASH0; }
    for (let n = 0; n < 12 && Math.abs(hc('R') - hc('B')) > 1; n++) { const big = hc('R') > hc('B') ? 'R' : 'B', mv = humans.filter(p => H.team[p.id] === big).pop(); H.team[mv.id] = other(big); H.load[mv.id] = null; H.moved = (H.moved || []).concat(mv.id); }
    const taken = new Set([...humans.map(p => p.char), ...H.bots.map(b => b.char)]);
    const pool = shuffle(Object.keys(SQUAD).filter(c => !SQUAD[c].playerOnly && !/^p\d+$/.test(c) && !taken.has(c)));
    for (const t of ['R', 'B']) { const want = Math.max(0, size - hc(t)); let mine = H.bots.filter(b => H.team[b.id] === t);
      while (mine.length > want) { const b = mine.pop(); H.bots.splice(H.bots.indexOf(b), 1); delete H.team[b.id]; delete H.load[b.id]; delete H.cash[b.id]; if (this.bots) this.bots.delete(b.id); }
      while (mine.length < want && humans.length + H.bots.length < SD.MAX) { const ch = pool.shift() || 'tommy', id = 'bot' + (H.botN++), nm = (SQUAD[ch] && SQUAD[ch].name) || 'Tommy';
        const b = { id, char: ch, name: '🤖 ' + nm.toUpperCase() }; H.bots.push(b); mine.push(b); H.team[id] = t; H.cash[id] = SD.CASH0; } }
  }
  stat(id) { const H = this.H; return H.stats[id] || (H.stats[id] = { k: 0, d: 0, as: 0, hs: 0, dmg: 0, pl: 0, df: 0, pk: 0, w: 0, mvp: 0 }); }
  load(id) { const H = this.H; return H.load[id] || (H.load[id] = { P: null, S: FREE_GUN }); }
  loadMsg(id) { const L = this.load(id); return [L.P || '', L.S || FREE_GUN]; }
  hostRound() {
    const H = this.H; if (!H) return; H.r++;
    if (H.r === this.half + 1) { H.att = other(H.att); for (const id in H.cash) H.cash[id] = SD.CASH0; H.load = {}; H.streak = { R: 0, B: 0 }; }      // (half time: the sides swap, everyone starts again)
    const humans = this.roster(); H.moved = []; this.balance(humans);
    const list = [...humans.map(p => [p.id, String(p.name).slice(0, 20), p.char, H.team[p.id], 0]), ...H.bots.map(b => [b.id, b.name, b.char, H.team[b.id], 1])];
    const attackers = list.filter(e => e[3] === H.att), car = attackers.length ? attackers[Math.floor(Math.random() * attackers.length)][0] : null;
    const sp = {}; for (const e of list) sp[e[0]] = this.spawnFor(e[0], list, H.att);
    H.picks = this.hostLayPicks(); H.roundStart = this.clock; H.bought = {}; H.dmgBy = {}; H.rs = {}; H.drops = new Map();
    // the bots shop too (survivors keep what they had)
    for (const b of H.bots) this.botBuy(b.id);
    const ld = {}, cash = {}; for (const e of list) { ld[e[0]] = this.loadMsg(e[0]); cash[e[0]] = Math.round(H.cash[e[0]] ?? SD.CASH0); }
    const gn = {}; for (const b of H.bots) { const L = this.load(b.id); gn[b.id] = L.P || L.S; }
    this.roundMsg = { r: H.r, win: this.win, half: this.half, sc: { ...H.sc }, att: H.att, car, list, pk: H.picks.map(p => [p.k, p.x, p.z]), sp, gn, ld, cash, hist: H.hist.slice(-12), mv: H.moved.slice(0, 6), bt: SD.BUY_T, rt: SD.ROUND_T, sw: H.r === this.half + 1 ? 1 : 0 };
    H.ends = this.clock + SD.BUY_T; H.clockT = 0; H.hits = {}; H.perks = {}; H.botT = 0;
    this.send('sdRound', { ...this.roundMsg });
    // the bots: back to their spawns, a gun each, a plan
    for (const b of H.bots) this.botSpawn(b.id);
  }
  // a bot in the shop: it keeps a primary it lived with; otherwise one of the dearer ones it can afford (or a better
  // pistol if it's skint)
  botBuy(id) {
    const H = this.H, L = this.load(id); let c = H.cash[id] ?? SD.CASH0;
    if (!L.P) { const can = PRIMARIES.filter(G => G.cost <= c).sort((a, b) => b.cost - a.cost).slice(0, 3); if (can.length && (c > 2400 || Math.random() < 0.75)) { const G = can[Math.floor(Math.random() * can.length)]; L.P = G.id; c -= G.cost; } }
    if (L.S === FREE_GUN && c >= 900 && Math.random() < 0.5) { const G = Math.random() < 0.5 ? GUN.mustard : GUN.brown; L.S = G.id; c -= G.cost; }
    H.cash[id] = c;
  }
  // the pick-ups: along the routes between the spawns and the sites, by each site, and a few dotted about elsewhere
  hostLayPicks() {
    const nav = this.g.room.nav, out = []; if (!nav) return out; const M = this.M, used = [];
    let gap = 3.2; const ok = (x, z) => { const k = nav.idx(x, z); if (k < 0 || !nav.free[k]) return false; if (used.some(u => Math.hypot(u[0] - x, u[1] - z) < gap)) return false; for (const s of [M.att, M.def]) if (Math.hypot(s[0] - x, s[1] - z) < 3.5) return false; return true; };
    const at = (pts, f) => { if (!pts || pts.length < 2) return null; let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(d); L += d; } let want = L * f;
      for (let i = 1; i < pts.length; i++) { if (want <= seg[i - 1]) { const k = want / seg[i - 1]; return [pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k]; } want -= seg[i - 1]; } return [pts[pts.length - 1].x, pts[pts.length - 1].y]; };
    const spots = [];
    for (const s of [M.att, M.def]) for (const L of ['A', 'B']) { const pa = nav.path(s[0], s[1], M[L][0], M[L][1]); for (const f of [0.35, 0.65]) { const p = at(pa, f); if (p) spots.push(p); } }
    for (const L of ['A', 'B']) for (const a of [0.6, 2.7, 4.6]) spots.push([M[L][0] + Math.cos(a) * (M[L][2] + 1.6), M[L][1] + Math.sin(a) * (M[L][2] + 1.6)]);
    for (let tries = 0; tries < 60 && spots.length < 26; tries++) { const s = [M.att, M.def, M.A, M.B][tries % 4]; spots.push([s[0] + (Math.random() - 0.5) * 16, s[1] + (Math.random() - 0.5) * 16]); }
    const keep = [];      // (a small map, Lewis's garden: closer together so there are still plenty)
    for (const g2 of [3.2, 2.2]) { gap = g2; for (const [x0, z0] of spots) { let x = x0, z = z0; const k = nav.nearestFree(x, z); if (k < 0) continue; const c = nav.center(k); x = c.x; z = c.y;
      if (!ok(x, z) || (this.g.room.nav.path(M.att[0], M.att[1], x, z) === null)) continue; used.push([x, z]); keep.push([r2(x), r2(z)]); if (keep.length >= 18) break; } if (keep.length >= 12) break;
      for (let tries = 0; tries < 40; tries++) { const s0 = [M.att, M.def, M.A, M.B][tries % 4]; spots.push([s0[0] + (Math.random() - 0.5) * 12, s0[1] + (Math.random() - 0.5) * 12]); } }
    // what goes where: ammo and food the most, two armour, a perk of each kind
    const kinds = ['ammo', 'burger', 'armour', 'p_reload', 'p_speed', 'p_dmg', 'p_defuse', 'p_ammo', 'kebab', 'ammo', 'burger', 'ammo', 'armour', 'burger', 'p_speed', 'ammo', 'p_dmg', 'kebab'];      // (every kind once before any twice)
    const ks = shuffle(kinds.slice(0, keep.length)); keep.forEach(([x, z], i) => out.push({ k: ks[i] || 'ammo', x, z, on: true, back: 0 }));
    return out;
  }
  hostHello(id) {
    if (!this.H || this.phase === 'wait') { this.net.send({ t: 'sdWait', to: id }); return; }
    const f = {}; for (const [k, v] of this.F) { const s = this.stat(k); f[k] = [v.alive ? 1 : 0, Math.round(v.hp), Math.round(v.ar), v.gun || FREE_GUN, s.k, s.d, s.as, s.pl, s.df, s.mvp]; }
    const ld = {}, cash = {}; for (const [k] of this.F) { ld[k] = this.loadMsg(k); cash[k] = Math.round(this.H.cash[k] ?? SD.CASH0); }
    const drops = [...this.H.drops.values()].map(d => [d.d, d.g, d.x, d.z]);
    this.net.send({ t: 'sdState', to: id, round: this.roundMsg || null, ph: this.phase, left: Math.max(0, (this.H.ends || 0) - this.clock), fs: f, bomb: this.bombMsg || null, sc: this.H.sc, pkOn: this.pk.map(p => p.on ? 1 : 0), over: this.overMsg || null, ld, cash, drops, hist: this.H.hist.slice(-12) });
  }
  // a buy in the shop: only while the round's being set up, only what you can afford. A gun you bought this round and
  // swap for another is refunded; one you'd kept from last round is left on the floor for a team-mate
  hostBuy(from, g) {
    const H = this.H; if (!H || this.phase !== 'buy') return; const P = this.F.get(from), G = GUN[gunOk(g)]; if (!P || !P.alive || !G) return;
    const L = this.load(from), had = L[G.slot]; if (had === G.id) return; const b = H.bought[from] || (H.bought[from] = {}); let c = H.cash[from] ?? SD.CASH0;
    const refund = b[G.slot] && b[G.slot].g === had ? b[G.slot].cost : 0;
    if (G.cost > c + refund) { this.send('sdLoad', { id: from, p: L.P || '', s: L.S || FREE_GUN, c: Math.round(c), no: 1 }); return; }
    c += refund - G.cost; if (had && !refund && had !== FREE_GUN) { const q = this.posOf(from, new THREE.Vector3()); if (q) this.hostDrop(had, q.x, q.z); }
    L[G.slot] = G.id; b[G.slot] = { g: G.id, cost: G.cost }; H.cash[from] = c; this.send('sdLoad', { id: from, p: L.P || '', s: L.S || FREE_GUN, c: Math.round(c) });
  }
  // a gun on the floor: where someone went down, or left there in the shop. Anyone alive can pick it up
  hostDrop(g, x, z) {
    const H = this.H; if (!H || !GUN[g] || !finite(x, z)) return; const nav = this.g.room.nav; if (nav) { const k = nav.nearestFree(x, z); if (k >= 0) { const c = nav.center(k); if (Math.hypot(c.x - x, c.y - z) < 1.5) { x = c.x; z = c.y; } } }
    if (H.drops.size >= SD.DROPS) { const [old] = H.drops.keys(); H.drops.delete(old); this.send('sdDrop', { d: old, on: 0 }); }
    const d = H.dropN++; H.drops.set(d, { d, g, x: r2(x), z: r2(z) }); this.send('sdDrop', { d, g, p: [r2(x), r2(z)], on: 1 });
  }
  hostGrab(from, d) {
    const H = this.H; if (!H || (this.phase !== 'live' && this.phase !== 'buy')) return; const P = this.F.get(from), D = H.drops.get(Number(d)); if (!P || !P.alive || !D) return;
    const at = this.posOf(from, new THREE.Vector3()); if (!at || Math.hypot(at.x - D.x, at.z - D.z) > SD.GRAB_R + 1) return;
    const G = GUN[D.g], L = this.load(from), had = L[G.slot]; L[G.slot] = G.id; H.drops.delete(D.d); this.send('sdDrop', { d: D.d, on: 0 });
    if (had && had !== FREE_GUN) this.hostDrop(had, at.x + 0.3, at.z + 0.3);
    if (P.bot) { const B = this.bots && this.bots.get(from); if (B) { B.gun = L.P || L.S; B.mag = GUN[B.gun].mag; B.reserve = GUN[B.gun].reserve; P.gun = B.gun; } }
    this.send('sdLoad', { id: from, p: L.P || '', s: L.S || FREE_GUN, c: Math.round(H.cash[from] ?? SD.CASH0), k: G.slot });
  }
  // a hit claimed by a player: checked (alive, enemy, in range, a gun they've really got, not more damage than it can do, not too often)
  hostHit(from, m) {
    const H = this.H; if (!H || this.phase !== 'live') return; const S = this.F.get(from), v = String(m.v), V = this.F.get(v); if (!S || !V || !S.alive || !V.alive || S.team === V.team) return;
    const L = this.load(from), has = (g) => !!g && (L.P === g || L.S === g), G = GUN[has(gunOk(m.g)) ? m.g : has(S.gun) ? S.gun : (L.P || L.S || FREE_GUN)] || GUN[FREE_GUN];
    const z = m.z === 1 || m.z === 2 ? m.z : m.hs ? 1 : 0, dmgMul = (H.perks[from] && H.perks[from].dmg > this.clock) ? 1.5 : 1, max = maxHit(G) * (dmgMul / 1.5) + 1, d = Number(m.d);
    if (!isFinite(d) || d <= 0 || d > max) return;
    const a = this.headOf(from, new THREE.Vector3()), b = this.posOf(v, new THREE.Vector3()); if (!a || !b) return; if (this.hd(a, b) > G.range + 5) return;
    if (v3ok(m.p) && Math.hypot(m.p[0] - b.x, m.p[2] - b.z) > 4) return;      // (they weren't anywhere near there)
    const q = H.hits[from] || (H.hits[from] = []), t = this.clock; while (q.length && t - q[0] > 1) q.shift(); if (q.length > Math.ceil(1 / G.rate) + 3) return; q.push(t);
    this.hostDamage(v, from, d, z, a, G, !!m.wb);
  }
  hostDamage(v, by, d, z, from, G, wb) {
    const V = this.F.get(v); if (!V || !V.alive) return; const raw = d; let take = d; if (typeof z === 'boolean') z = z ? 1 : 0;
    if (V.ar > 0) { const soak = Math.min(V.ar, d * SD.AR_ABS); V.ar -= soak; take -= soak; }
    const lost = Math.min(V.hp, take); V.hp = Math.max(0, V.hp - take); const st = this.stat(by); st.dmg += lost;
    const db = this.H.dmgBy[v] || (this.H.dmgBy[v] = {}); db[by] = (db[by] || 0) + lost; const rs = this.H.rs[by] || (this.H.rs[by] = { k: 0, dmg: 0, ob: 0 }); rs.dmg += lost;
    if (!G) { const S = this.F.get(by); G = GUN[S && S.gun] || GUN[FREE_GUN]; }
    this.send('sdDmg', { v, by, hp: Math.ceil(V.hp), ar: Math.round(V.ar), d: Math.round(raw), hs: z === 1 ? 1 : 0, z, wb: wb ? 1 : 0, g: G.i, p: from ? [r2(from.x), r2(from.y), r2(from.z)] : undefined });
    if (V.hp <= 0) this.hostKill(v, by, z === 1, '', G, wb);
  }
  hostKill(v, by, hs, why, G, wb) {
    const H = this.H, V = this.F.get(v); if (!V || !V.alive) return; V.alive = false; V.hp = 0;
    this.stat(v).d++; const K = by ? this.F.get(by) : null, enemy = K && by !== v && K.team !== V.team;
    if (!G) G = K ? GUN[K.gun] || GUN[FREE_GUN] : null;
    const as = []; if (enemy) { this.stat(by).k++; if (hs) this.stat(by).hs++; (H.rs[by] || (H.rs[by] = { k: 0, dmg: 0, ob: 0 })).k++; H.cash[by] = Math.min(SD.CASH_MAX, (H.cash[by] ?? SD.CASH0) + (G ? G.kill : 300));
      for (const [a, dd] of Object.entries(H.dmgBy[v] || {})) if (a !== by && dd >= SD.ASSIST_D && this.F.get(a) && this.F.get(a).team === K.team) { as.push(a); this.stat(a).as++; } }
    const pa = this.posOf(v, new THREE.Vector3()), pb = by ? this.posOf(by, new THREE.Vector3()) : null, ds = pa && pb ? Math.round(this.hd(pa, pb)) : 0;
    this.send('sdKill', { v, by: by || '', g: G ? G.i : -1, hs: hs ? 1 : 0, w: why || '', as: as.slice(0, 4), wb: wb ? 1 : 0, ds });
    if (enemy) this.send('sdCash', { c: this.cashMsg() });
    // (what they were carrying is left where they fell: their best gun, for anyone)
    const L = this.load(v), drop = L.P || (L.S !== FREE_GUN ? L.S : null); if (drop && pa && why !== 'left') this.hostDrop(drop, pa.x, pa.z); H.load[v] = { P: null, S: FREE_GUN };
    if (this.bomb.st === 'carried' && this.bomb.id === v) { const p = pa || new THREE.Vector3(this.M.att[0], 0, this.M.att[1]); this.hostBomb({ st: 'dropped', p: [r2(p.x), r2(p.z)] }); }
    this.hostCheckEnd();
  }
  cashMsg() { const c = {}; for (const [id] of this.F) c[id] = Math.round(this.H.cash[id] ?? SD.CASH0); return c; }
  hostBomb(m) { this.bombMsg = { ...m }; this.send('sdBomb', m); }
  hostTake(from, i) {
    const H = this.H; if (!H || (this.phase !== 'live' && this.phase !== 'buy')) return; const P = this.F.get(from); if (!P || !P.alive) return; const at = this.posOf(from, new THREE.Vector3()); if (!at) return;
    if (i === -1) { if (this.bomb.st !== 'dropped' || P.team !== this.att || !Array.isArray(this.bomb.p)) return; if (Math.hypot(at.x - this.bomb.p[0], at.z - this.bomb.p[1]) > SD.BOMB_R + 1) return; this.hostBomb({ st: 'carried', id: from }); return; }
    const p = this.pk[i]; if (!Number.isInteger(i) || !p || !p.on || Math.hypot(at.x - p.x, at.z - p.z) > SD.PICK_R + 1.2) return;
    const K = PICKS[p.k]; p.on = false; p.back = K.respawn ? this.clock + K.respawn : 0; this.stat(from).pk++;
    if (K.heal) P.hp = Math.min(SD.HP, P.hp + K.heal); if (K.ar) P.ar = Math.min(SD.AR_MAX, P.ar + K.ar);
    if (K.perk) { const pk = H.perks[from] || (H.perks[from] = {}); pk[K.perk] = K.t ? this.clock + K.t : 1e9; }
    this.send('sdGot', { i, by: from, k: p.k, hp: Math.ceil(P.hp), ar: Math.round(P.ar) });
  }
  plantNow(from, at) {
    const L = ['A', 'B'].find(L => Math.hypot(at.x - this.M[L][0], at.z - this.M[L][1]) < this.M[L][2] + 1.2); if (!L) return false;
    this.stat(from).pl++; (this.H.rs[from] || (this.H.rs[from] = { k: 0, dmg: 0, ob: 0 })).ob = 1; this.H.cash[from] = Math.min(SD.CASH_MAX, (this.H.cash[from] ?? SD.CASH0) + SD.OBJ_CASH);
    this.bombAt = this.clock + SD.BOMB_T; this.H.bombEnds = this.bombAt; this.hostBomb({ st: 'planted', id: from, p: [r2(at.x), r2(at.z)], s: L, left: SD.BOMB_T }); this.send('sdCash', { c: this.cashMsg() }); return true;
  }
  hostPlant(from) {
    if (this.phase !== 'live' || this.bomb.st !== 'carried' || this.bomb.id !== from) return; const P = this.F.get(from); if (!P || !P.alive) return; const at = this.posOf(from, new THREE.Vector3()); if (!at) return;
    this.plantNow(from, at);
  }
  defuseNow(from) { this.stat(from).df++; (this.H.rs[from] || (this.H.rs[from] = { k: 0, dmg: 0, ob: 0 })).ob = 2; this.H.cash[from] = Math.min(SD.CASH_MAX, (this.H.cash[from] ?? SD.CASH0) + SD.OBJ_CASH); this.hostBomb({ st: 'defused', by: from, p: this.bomb.p, s: this.bomb.s }); this.hostEnd(other(this.att), 'defused'); }
  hostDefuse(from) {
    if (this.phase !== 'live' || this.bomb.st !== 'planted') return; const P = this.F.get(from); if (!P || !P.alive || P.team === this.att) return; const at = this.posOf(from, new THREE.Vector3()); if (!at || !Array.isArray(this.bomb.p)) return;
    if (Math.hypot(at.x - this.bomb.p[0], at.z - this.bomb.p[1]) > SD.BOMB_R + 1.2) return;
    this.defuseNow(from);
  }
  hostLeft(id) { const P = this.F.get(id); if (!P || P.bot) return; P.gone = true; if (P.alive) this.hostKill(id, '', false, 'left'); }
  hostCheckEnd() {
    if (this.phase !== 'live' || this.noCheck) return; const A = this.att, D = other(A);
    if (!this.alive(D).length) return this.hostEnd(A, 'wiped');
    if (!this.alive(A).length && this.bomb.st !== 'planted') return this.hostEnd(D, 'wiped');
  }
  hostEnd(win, why) {
    const H = this.H; if (!H || this.phase !== 'live') return; H.sc[win]++; const last = H.sc[win] >= this.win, lose = other(win);
    // the round's MVP, on the winning side: kills, the plant or defuse, damage
    let mvp = null, best = -1, mw = ''; for (const [id, f] of this.F) if (f.team === win) { const s = H.rs[id] || { k: 0, dmg: 0, ob: 0 }, v = s.k * 3 + (s.ob ? 4 : 0) + s.dmg / 60; if (v > best) { best = v; mvp = id; mw = s.ob === 1 ? 'PLANTED THE VINDALOO' : s.ob === 2 ? 'DEFUSED THE VINDALOO' : s.k ? `${s.k} KILL${s.k > 1 ? 'S' : ''} · ${Math.round(s.dmg)} DAMAGE` : `${Math.round(s.dmg)} DAMAGE`; } }
    if (mvp) this.stat(mvp).mvp++;
    for (const [id, f] of this.F) if (f.team === win) this.stat(id).w++;
    // the money: the winners more (a bit extra for a plant or defuse round), a losing streak a bit more each time
    H.streak[win] = 0; H.streak[lose] = Math.min(4, (H.streak[lose] || 0) + 1);
    for (const [id, f] of this.F) { const got = f.team === win ? SD.WIN_CASH + (why === 'boom' || why === 'defused' ? 250 : 0) : SD.LOSE_CASH + SD.LOSE_STEP * (H.streak[lose] - 1); H.cash[id] = Math.min(SD.CASH_MAX, (H.cash[id] ?? SD.CASH0) + got); }
    H.hist.push([win, why]); H.nextAt = this.clock + SD.END_T;
    this.send('sdEnd', { win, why, sc: { ...H.sc }, r: H.r, mvp: mvp || '', mw, last: last ? 1 : 0, cash: this.cashMsg() });
  }
  hostOver() {
    const H = this.H, ids = [...this.F.keys()], aw = [];
    const top = (f, min = 1) => { let b = null, bv = min - 1e-9; for (const id of ids) { const v = f(this.stat(id)); if (v > bv) { bv = v; b = id; } } return b ? [b, Math.round(bv)] : null; };
    const a = (ico, name, r, unit) => { if (r) aw.push([ico, name, r[0], r[1] + unit]); };
    a('💀', 'TOP FRAGGER', top(s => s.k), ' KILLS'); a('🎯', 'HEADHUNTER', top(s => s.hs), ' HEADSHOTS'); a('🤝', 'TEAM PLAYER', top(s => s.as, 2), ' ASSISTS'); a('⭐', 'MOST VALUABLE', top(s => s.mvp, 2), ' MVPS'); a('💣', 'CURRY CHEF', top(s => s.pl), ' PLANTS'); a('🔧', 'BOMB SQUAD', top(s => s.df), ' DEFUSES'); a('🍔', 'SNACK RAIDER', top(s => s.pk, 3), ' PICK-UPS');
    const st = {}; for (const id of ids) { const s = this.stat(id); st[id] = [s.k, s.d, s.hs, Math.round(s.dmg), s.pl, s.df, s.pk, s.as, s.mvp]; }
    const win = H.sc.R >= this.win ? 'R' : 'B'; this.overMsg = { win, sc: { ...H.sc }, st, aw }; this.send('sdOver', { ...this.overMsg });
  }
  becomeHost() {
    if (this.host) return; this.host = true;
    const H = this.H = { r: this.round, sc: { ...this.sc }, att: this.att, team: {}, bots: [], botN: 0, stats: {}, hits: {}, picks: this.pk, perks: {}, ends: this.endsAt, clockT: 0, botT: 0, nextAt: this.endsAt, bombEnds: this.bombAt, cash: {}, load: {}, bought: {}, dmgBy: {}, rs: {}, streak: { R: 0, B: 0 }, hist: this.hist.slice(), dropN: 0, drops: new Map() };
    for (const [id, f] of this.F) { H.team[id] = f.team; if (f.bot) { H.bots.push({ id, char: f.char, name: f.name }); const n = Number(String(id).slice(3)); if (isFinite(n)) H.botN = Math.max(H.botN, n + 1); }
      H.cash[id] = this.cash[id] ?? SD.CASH0; H.load[id] = { P: f.load ? f.load.P : null, S: f.load ? f.load.S : FREE_GUN };
      H.stats[id] = { k: f.k || 0, d: f.d || 0, as: f.a || 0, hs: f.hs || 0, dmg: f.dmg || 0, pl: f.pl || 0, df: f.df || 0, pk: 0, w: 0, mvp: f.mvp || 0 }; }
    for (const [d, D] of this.drops) { H.drops.set(d, { d, g: D.g, x: D.x, z: D.z }); H.dropN = Math.max(H.dropN, d + 1); }
    // the bots carry on from where they were drawn
    this.bots = new Map(); for (const b of H.bots) { const f = this.F.get(b.id), bp = this.botPose.get(b.id); this.botSpawn(b.id, bp ? [bp.x, bp.z, bp.yaw] : null); const B = this.bots.get(b.id); if (B && f) B.alive = f.alive; }
    for (const [id, f] of this.F) if (!f.bot && id !== this.me && !this.net.players.has(id)) this.hostLeft(id);
    if (this.phase === 'wait') this.startT = 1;
  }
  becomeGuest() { this.host = false; this.H = null; this.bots = null; }
  hostUpdate(dt) {
    if (this.phase === 'wait' && !this.H) { if ((this.startT -= dt) <= 0) this.hostStart(); return; }
    const H = this.H; if (!H) return; const t = this.clock;
    if (this.phase === 'buy' && t >= H.ends) { H.ends = t + SD.ROUND_T; this.send('sdGo', { rt: SD.ROUND_T }); }
    else if (this.phase === 'live') {
      if (this.bomb.st === 'planted' && t >= (H.bombEnds || 1e9)) { this.hostBoom(); }
      else if (this.bomb.st !== 'planted' && t >= H.ends) this.hostEnd(other(this.att), 'time');
      for (const p of this.pk) if (!p.on && p.back && t >= p.back) { p.back = 0; this.send('sdPk', { i: this.pk.indexOf(p), on: 1 }); }
      this.hostCheckEnd();
    } else if (this.phase === 'post' && t >= (H.nextAt || 0)) { if (Math.max(H.sc.R, H.sc.B) >= this.win) this.hostOver(); else this.hostRound(); return; }
    else if (this.phase === 'over' && !this.endedGame && this.overAt && t - this.overAt > SD.OVER_T) { this.endedGame = true; try { this.g.director && this.g.director.end(); } catch (e) { console.warn('snd end', e); } }
    if ((H.clockT -= dt) <= 0 && (this.phase === 'buy' || this.phase === 'live')) { H.clockT = 2; this.send('sdClock', { ph: this.phase, left: r2(Math.max(0, H.ends - t)), bl: this.bomb.st === 'planted' ? r2(Math.max(0, (H.bombEnds || t) - t)) : -1 }); }
    this.botsUpdate(dt);
  }
  hostBoom() {
    const at = Array.isArray(this.bomb.p) ? new THREE.Vector3(this.bomb.p[0], 0, this.bomb.p[1]) : null, by = this.bomb.id || ''; this.hostBomb({ st: 'boom', p: this.bomb.p, s: this.bomb.s });
    this.noCheck = true; try { if (at) for (const [id, f] of this.F) { if (!f.alive) continue; const q = this.posOf(id, new THREE.Vector3()); if (q && this.hd(q, at) < SD.BOOM_R) this.hostKill(id, by, false, 'boom'); } } finally { this.noCheck = false; }
    this.hostEnd(this.att, 'boom');
  }

  // ------------------------------------------------------------------ everyone: what the referee says
  apply(k, m) {
    if (!m || typeof m !== 'object') return;
    if (k === 'sdWait') { this.phase = 'wait'; return; }
    if (k === 'sdRound') return this.startRound(m);
    if (k === 'sdGo') { this.phase = 'live'; this.endsAt = this.clock + (Number(m.rt) || SD.ROUND_T); this.goLive(); return; }
    if (k === 'sdClock') { const l = Number(m.left); if (isFinite(l) && m.ph === this.phase) this.endsAt = this.clock + l; const bl = Number(m.bl); if (isFinite(bl) && bl >= 0 && this.bomb.st === 'planted') this.bombAt = this.clock + bl; return; }
    if (k === 'sdDmg') return this.damaged(m);
    if (k === 'sdKill') return this.killed(m);
    if (k === 'sdGot') return this.got(m);
    if (k === 'sdPk') { const p = this.pk[Number(m.i)]; if (p) { p.on = !!m.on; p.pop = 0.01; } return; }
    if (k === 'sdBomb') return this.bombNews(m);
    if (k === 'sdEnd') return this.roundOver(m);
    if (k === 'sdOver') return this.gameOver(m);
    if (k === 'sdLoad') return this.loadNews(m);
    if (k === 'sdCash') { this.cashIn(m.c); return; }
    if (k === 'sdDrop') return this.dropNews(m);
    if (k === 'sdHp') { const f = this.F.get(String(m.id)); if (f) { if (finite(m.hp)) f.hp = clamp(m.hp, 0, SD.HP); if (finite(m.ar)) f.ar = clamp(m.ar, 0, SD.AR_MAX); } return; }
    if (k === 'sdBots') { if (!Array.isArray(m.b)) return; for (const e of m.b.slice(0, 12)) { if (!Array.isArray(e) || e.length < 6) continue; const [id, x, z, yaw, pitch, fl] = e; if (!finite(x, z, yaw, pitch) || Math.abs(x) > 1e3 || Math.abs(z) > 1e3) continue; const f = this.F.get(String(id)); if (!f || !f.bot) continue;
        const bp = this.botPose.get(f.id) || { x, z, yaw, pitch, dx: x, dz: z }; bp.tx = x; bp.tz = z; bp.tyaw = yaw; bp.pitch = pitch; bp.fl = fl | 0; if (Math.hypot(bp.x - x, bp.z - z) > 3) { bp.x = x; bp.z = z; } this.botPose.set(f.id, bp); } return; }
    if (k === 'sdState') { if (m.round) this.startRound(m.round, true); const f = m.fs && typeof m.fs === 'object' ? m.fs : {};
      for (const id in f) { const F = this.F.get(id), e = f[id]; if (!F || !Array.isArray(e)) continue; F.alive = !!e[0]; if (finite(e[1])) F.hp = e[1]; if (finite(e[2])) F.ar = e[2]; if (gunOk(e[3])) F.gun = e[3];
        ['k', 'd', 'a', 'pl', 'df', 'mvp'].forEach((s, j) => { if (finite(e[4 + j])) F[s] = clamp(e[4 + j], 0, 999); }); }
      if (m.sc && typeof m.sc === 'object') this.sc = { R: Number(m.sc.R) || 0, B: Number(m.sc.B) || 0 };
      if (Array.isArray(m.pkOn)) m.pkOn.forEach((v, i) => { if (this.pk[i]) this.pk[i].on = !!v; });
      if (m.ld && typeof m.ld === 'object') this.loadsIn(m.ld); this.cashIn(m.cash);
      if (Array.isArray(m.drops)) for (const e of m.drops.slice(0, SD.DROPS)) if (Array.isArray(e)) this.dropNews({ d: e[0], g: e[1], p: [e[2], e[3]], on: 1 });
      if (Array.isArray(m.hist)) this.hist = m.hist.filter(h => Array.isArray(h) && (h[0] === 'R' || h[0] === 'B')).slice(-12).map(h => [h[0], String(h[1] || '').slice(0, 10)]);
      const l = Number(m.left) || 0; if (m.ph === 'live') { this.phase = 'live'; this.endsAt = this.clock + l; this.closePicker(); } else if (m.ph === 'buy') this.endsAt = this.clock + l;
      if (m.bomb && typeof m.bomb === 'object') this.bombNews(m.bomb, true);
      // (come in mid-round: you sit it out and watch, you're in next round)
      const me = this.mine(); if (me && m.ph === 'live' && f[this.me] === undefined) me.alive = false;
      if (m.over && m.ph === 'over') this.gameOver(m.over); return; }
  }
  // everyone's money (the host's word)
  cashIn(c) { if (!c || typeof c !== 'object') return; for (const id in c) { const n = Number(c[id]); if (isFinite(n) && this.F.has(id)) this.cash[id] = clamp(Math.round(n), 0, SD.CASH_MAX); } }
  loadsIn(ld) { for (const id in ld) { const F = this.F.get(id), e = ld[id]; if (!F || !Array.isArray(e)) continue; F.load = { P: gunOk(e[0], 'P'), S: gunOk(e[1], 'S') || FREE_GUN }; } }
  // what someone's carrying now (a buy, a gun picked up off the floor)
  loadNews(m) {
    const id = String(m.id), F = this.F.get(id); if (!F) return; const P = gunOk(m.p, 'P'), S = gunOk(m.s, 'S') || FREE_GUN; F.load = { P, S }; if (finite(m.c)) this.cash[id] = clamp(Math.round(m.c), 0, SD.CASH_MAX);
    if (F.bot) { F.gun = P || S; return; }
    if (id !== this.me) return;
    if (m.no) { sfx('sd_nocash', null, 0.8); this.toast('NOT ENOUGH DINNER MONEY'); return; }
    const was = { P: this.my.slots.P && this.my.slots.P.g, S: this.my.slots.S && this.my.slots.S.g };
    if (m.k === 'P' || m.k === 'S') { const G = GUN[m.k === 'P' ? P : S]; if (G) { this.giveGun(G.id, G.mag, Math.ceil(G.reserve / 2)); sfx('sd_grab', null, 0.9); this.pop(`${G.icon} PICKED UP THE ${G.name}`, G.col); } }
    else { this.setLoadout(P, S); const nw = P && P !== was.P ? P : S !== was.S ? S : null; if (nw) { const G = GUN[nw]; this.switchTo(G.slot, true); this.my.drawEnd = this.clock + G.draw; sfx('sd_buy', null, 0.9); this.pop(`${G.icon} ${G.name} · ${money(G.cost)}`, G.col); (this.boughtNow || (this.boughtNow = {}))[G.slot] = { g: G.id, cost: G.cost }; track('sdBuys'); try { if (G.slot === 'P') localStorage.setItem('rs_sd_gun', G.id); } catch (e) {} } }
    F.gun = this.my.gun; this.net.send({ t: 'sdGun', g: this.my.gun }); this.shopRefresh && this.shopRefresh();
  }
  // a gun on the floor, or gone from it
  dropNews(m) {
    const d = Number(m.d); if (!Number.isInteger(d) || d < 0 || d > 1e6) return; const was = this.drops.get(d);
    if (!m.on) { if (was) { this.grp.remove(was.mesh); this.drops.delete(d); } return; }
    const g = gunOk(m.g); if (!g || !Array.isArray(m.p) || !finite(m.p[0], m.p[1]) || Math.abs(m.p[0]) > 1e3 || Math.abs(m.p[1]) > 1e3) return; if (was) this.grp.remove(was.mesh);
    while (this.drops.size >= SD.DROPS) { const [old, o] = this.drops.entries().next().value; this.grp.remove(o.mesh); this.drops.delete(old); }
    const mesh = newGun(g); mesh.scale.setScalar(1.2); const y = this.floor(m.p[0], m.p[1]); mesh.position.set(m.p[0], y + 0.06, m.p[1]); mesh.rotation.set(0, Math.random() * 6.28, Math.PI / 2 * 0.95, 'YXZ'); this.grp.add(mesh);
    this.drops.set(d, { d, g, x: m.p[0], z: m.p[1], y, mesh, t0: this.clock });
  }
  startRound(m, late) {
    if (!m || !Array.isArray(m.list)) return;
    this.roundMsg = m; this.panel.close(true); this.closePicker(); this.endAct();
    const keep = new Map(this.F); this.F.clear();
    for (const e of m.list.slice(0, 16)) { if (!Array.isArray(e) || e[0] == null) continue; const id = String(e[0]), team = e[3] === 'B' ? 'B' : 'R', was = keep.get(id);
      const gn = m.gn && typeof m.gn === 'object' ? gunOk(m.gn[id]) : null, c = (k) => was ? was[k] || 0 : 0;
      this.F.set(id, { id, name: String(e[1] || 'PLAYER').slice(0, 22), char: String(e[2] || 'ronnie').slice(0, 20), team, bot: !!e[4], alive: true, hp: SD.HP, ar: 0, gun: gn || (was ? was.gun : FREE_GUN), load: { P: null, S: FREE_GUN },
        k: c('k'), d: c('d'), a: c('a'), pl: c('pl'), df: c('df'), mvp: c('mvp'), hs: c('hs'), dmg: c('dmg'), rk: 0, moved: Array.isArray(m.mv) && m.mv.map(String).includes(id) }); }
    this.round = Number(m.r) || 1; this.win = Number(m.win) || this.win; this.half = Number(m.half) || this.half; this.att = m.att === 'B' ? 'B' : 'R';
    if (m.sc && typeof m.sc === 'object') this.sc = { R: Number(m.sc.R) || 0, B: Number(m.sc.B) || 0 };
    if (m.ld && typeof m.ld === 'object') this.loadsIn(m.ld); this.cashIn(m.cash);
    if (Array.isArray(m.hist)) this.hist = m.hist.filter(h => Array.isArray(h) && (h[0] === 'R' || h[0] === 'B')).slice(-12).map(h => [h[0], String(h[1] || '').slice(0, 10)]);
    this.layPicks(m.pk); this.bomb = { st: m.car ? 'carried' : 'none', id: m.car != null ? String(m.car) : null }; this.bombMsg = { ...this.bomb }; this.bombAt = 0; this.boomFx = 0;
    for (const [, D] of this.drops) this.grp.remove(D.mesh); this.drops.clear(); this.clearMarks(); this.dmgLog = []; this.deathCam = null; this.boughtNow = {};
    this.phase = 'buy'; this.endsAt = this.clock + (Number(m.bt) || SD.BUY_T); this.countN = null;
    // bots on everyone's game: a puppet each (made once, kept round to round)
    for (const [id, f] of this.F) if (f.bot && !this.puppets.has(id)) this.makePuppet(f);
    for (const [id, pu] of this.puppets) if (!this.F.has(id)) { pu.dispose && pu.dispose(); this.puppets.delete(id); }
    // me: back to my spawn with what I'm carrying (full), my perks gone
    const me = this.mine(); this.my.perks = {}; this.my.ads = false; this.my.adsK = 0; this.cancelReload(); this.my.firing = false; this.my.picked = false; this.my.act = null; this.my.burst = 0; this.my.cyc = null; this.g.player.ghost = false; this.spect = null;
    if (me) { const sp = m.sp && Array.isArray(m.sp[this.me]) ? m.sp[this.me] : null; if (sp && finite(...sp)) this.respawnAt(sp[0], sp[1], sp[2]); this.setLoadout(me.load.P, me.load.S, true); me.gun = this.my.gun; if (!late) this.openPicker(); this.net.send({ t: 'sdGun', g: this.my.gun });
      if (me.moved && !late) this.toast(`🔁 TEAMS EVENED UP: YOU'RE ON ${TEAMS[me.team].short} NOW`); }
    if (m.sp && typeof m.sp === 'object') for (const [id, f] of this.F) if (f.bot && Array.isArray(m.sp[id]) && finite(...m.sp[id])) { const s = m.sp[id], bp = this.botPose.get(id) || {}; Object.assign(bp, { x: s[0], z: s[1], tx: s[0], tz: s[1], yaw: s[2], tyaw: s[2], pitch: 0, fl: 0 }); this.botPose.set(id, bp); }
    this.updateSpeed(); this.lowSnd = 0;
    if (!late) this.roundSplash(m);
    this.feed(`🔔 ROUND ${this.round} · FIRST TO ${this.win}`);
  }
  goLive() {
    this.closePicker(); const me = this.mine(), att = me && me.team === this.att;
    sfx('sd_go', null, 1); this.splash(att ? '#ff9f1c' : '#4fc3ff', att ? `<p>${this.bomb.id === this.me ? '💣 YOU\'VE GOT THE VINDALOO' : 'ATTACK'}</p><h1>GO GO GO!</h1><p>${this.bomb.id === this.me ? 'Get it to site A or B and hold PLANT' : 'Get the Vindaloo planted at A or B'}</p>` : '<p>DEFEND</p><h1>HOLD THEM OFF!</h1><p>Guard A and B. If it\'s planted: DEFUSE it</p>', 1800);
    if (this.g.renderer.xr.isPresenting) this.g.showBanner('GO GO GO!', att ? 'PLANT AT A OR B' : 'DEFEND A AND B');
  }
  // ---- hits and kills
  damaged(m) {
    const v = String(m.v), V = this.F.get(v); if (!V) return; const hp = Number(m.hp), ar = Number(m.ar); if (isFinite(hp)) V.hp = clamp(hp, 0, SD.HP); if (isFinite(ar)) V.ar = clamp(ar, 0, SD.AR_MAX);
    const by = String(m.by || ''), d = clamp(Number(m.d) || 0, 0, 999), z = m.z === 1 || m.z === 2 ? m.z : m.hs ? 1 : 0, hs = z === 1, G = GUNS[Number(m.g)] || GUN[(this.F.get(by) || {}).gun] || GUN[FREE_GUN], at = this.headOf(v, new THREE.Vector3());
    const B = this.F.get(by); if (B) B.dmg = (B.dmg || 0) + d;
    if (by === this.me || v === this.me) { this.dmgLog.push({ by, v, d, z, g: G.id, t: this.clock }); if (this.dmgLog.length > 60) this.dmgLog.shift(); }
    if (at) { const p = at.clone().add({ x: 0, y: hs ? 0 : z === 2 ? -1.1 : -0.5, z: 0 }); this.burst(p, hs ? [0xff2020, 0xffd400, 0xffffff] : [G.splat || 0xc62828, G.tr || 0xff5252], hs ? 14 : 8, 1.4); this.splatFloor(at, G, false);
      if (v !== this.me) this.g.words && this.g.words.show((hs ? '🎯 ' : m.wb ? '🧱 ' : '') + Math.round(d), at.clone().add({ x: 0, y: 0.35, z: 0 }), hs ? '#ffd400' : z === 2 ? '#c3cad6' : '#fff', 0.14, 0.8); }
    if (v === this.me) this.hurt(d, m.p, hs, by);
    if (by === this.me && v !== this.me) { this.hitMarker(false, hs); sfx(hs ? 'sd_headshot' : 'sd_hitmark', null, 0.8); track('sdDmg', d); }
  }
  killed(m) {
    const v = String(m.v), V = this.F.get(v); if (!V) return; V.alive = false; V.hp = 0; V.d = (V.d || 0) + 1; V.acting = null; const by = String(m.by || ''), K = this.F.get(by), hs = !!m.hs;
    const enemy = K && by !== v && K.team !== V.team; if (enemy) { K.k = (K.k || 0) + 1; K.rk = (K.rk || 0) + 1; if (hs) K.hs = (K.hs || 0) + 1; }
    const as = Array.isArray(m.as) ? m.as.slice(0, 4).map(String).filter(a => this.F.has(a)) : []; for (const a of as) this.F.get(a).a = (this.F.get(a).a || 0) + 1;
    const g = GUNS[Number(m.g)], why = m.w === 'boom' ? '💥🍛' : m.w === 'left' ? '🚪' : g ? g.icon : '💀';
    this.feedKill(K && by !== v ? K : null, V, why, hs, !!m.wb, as.map(a => this.F.get(a)));
    const at = this.headOf(v, new THREE.Vector3()); if (at) { this.burst(at.clone().add({ x: 0, y: -0.6, z: 0 }), [0xff3b3b, 0xffd400, 0x8d5a32, 0xffffff], 22, 2.2); this.splatFloor(at, g, true); sfx('sd_down', at, 1); }
    if (K && K.bot && KILL_LINES[K.char] && Math.random() < 0.55) { const h = this.headOf(by, new THREE.Vector3()); if (h) this.g.words && this.g.words.show(KILL_LINES[K.char], h.add({ x: 0, y: 0.6, z: 0 }), TEAMS[K.team].col, 0.16, 1.6); }
    if (v === this.me) this.died(K, g, hs, m.w, Number(m.ds) || 0);
    if (by === this.me && v !== this.me) { this.hitMarker(true, hs); sfx('sd_kill', null, 0.9); track('sdKills'); if (hs) track('sdHs'); this.pop(`💀 ${hs ? 'HEADSHOT! ' : ''}${m.wb ? 'THROUGH THE WALL! ' : ''}${V.name.replace(/^🤖 /, '')}`, '#ff5252'); this.multiKill(K.rk); }
    if (as.includes(this.me)) this.pop(`🤝 ASSIST · ${V.name.replace(/^🤖 /, '')}`, '#9fe8ff');
    if (this.spect === v) this.doWatch();
  }
  got(m) {
    const i = Number(m.i), p = this.pk[i], by = String(m.by || ''), P = this.F.get(by); if (P) { if (finite(m.hp)) P.hp = clamp(m.hp, 0, SD.HP); if (finite(m.ar)) P.ar = clamp(m.ar, 0, SD.AR_MAX); }
    if (!p) return; p.on = false; const K = PICKS[p.k] || PICKS.ammo, at = new THREE.Vector3(p.x, p.y + 0.5, p.z);
    this.burst(at, [K.col, 0xffffff], 12, 1.4);
    if (by !== this.me) { sfx('sd_pickup', at, 0.6); return; }
    track('sdPicks');
    if (K.heal) { sfx('sd_heal', null, 1); this.pop(`${K.icon} NOM! +${K.heal} ❤`, '#39ff14'); this.g.crumbs && this.g.crumbs.burst && this.g.crumbs.burst(this.g.player.head.clone().addScaledVector(this.g.player.fwd, 0.3).add({ x: 0, y: -0.15, z: 0 }), [0xc8823a, 0x8a5a2e, 0xf0d090], 10); }
    else if (K.ar) { sfx('sd_armour', null, 1); this.pop(`🦺 +${K.ar} ARMOUR`, '#4fc3ff'); }
    else if (p.k === 'ammo') { this.refill(); sfx('sd_ammo', null, 1); this.pop('📦 AMMO TOPPED UP', '#ffd400'); }
    else if (K.perk) { this.my.perks[K.perk] = K.t ? this.clock + K.t : 1e9; sfx('sd_perk', null, 1); this.pop(`${K.icon} ${K.name}!`, '#ff4fd8');
      if (K.perk === 'ammo') { this.refill(true); } this.updateSpeed(); }
    if (this.g.renderer.xr.isPresenting) this.g.showBanner(K.icon + ' ' + K.name, K.line);
  }
  // both guns' spare ammo topped up (the bottomless bag: their magazines doubled and filled too)
  refill(mags) { this.stash(); for (const k of ['P', 'S']) { const s = this.my.slots[k]; if (!s) continue; const G = GUN[s.g], dbl = this.my.perks.ammo ? 2 : 1; s.res = G.reserve * dbl; if (mags) s.mag = G.mag * dbl; } const c = this.my.slots[this.my.cur]; if (c) { this.my.mag = c.mag; this.my.reserve = c.res; } }
  bombNews(m, quiet) {
    const st = String(m.st || ''); if (!['carried', 'dropped', 'planted', 'defused', 'boom', 'none'].includes(st)) return;
    const was = this.bomb.st; this.bomb = { st, id: m.id != null ? String(m.id) : null, p: Array.isArray(m.p) && m.p.length === 2 && finite(...m.p) ? [m.p[0], m.p[1]] : (this.bomb.p || null), s: m.s === 'A' || m.s === 'B' ? m.s : this.bomb.s }; this.bombMsg = { ...this.bomb };
    if (st === 'carried' && this.bomb.id === this.me && was === 'dropped' && !quiet) { sfx('sd_pickup', null, 0.9); this.pop('💣 YOU\'VE GOT THE VINDALOO', '#ff9f1c'); }
    if (st === 'dropped' && !quiet) { this.feed('💣 THE VINDALOO\'S BEEN DROPPED'); if (this.myTeam() === this.att) this.pop('💣 BOMB DROPPED! PICK IT UP', '#ff9f1c'); }
    if (st === 'planted') { const left = Number(m.left); this.bombAt = this.clock + (isFinite(left) ? left : SD.BOMB_T); this.beepT = 0; const P = this.F.get(this.bomb.id); if (P && !quiet) P.pl = (P.pl || 0) + 1; if (P) P.acting = null;
      if (!quiet) { sfx('sd_planted', null, 1); this.feed(`💣 PLANTED AT <b>${this.bomb.s || '?'}</b> by ${this.esc(this.nameOf(this.bomb.id))}`);
        const mine = this.myTeam() === this.att; this.splash(mine ? '#ff9f1c' : '#ff3b3b', mine ? `<p>💣 THE VINDALOO IS DOWN AT ${this.bomb.s}</p><h1>DEFEND IT!</h1>` : `<p>💣 THE VINDALOO IS DOWN AT ${this.bomb.s}</p><h1>DEFUSE IT!</h1><p>${SD.BOMB_T} seconds</p>`, 1800);
        if (this.g.renderer.xr.isPresenting) this.g.showBanner('BOMB PLANTED AT ' + this.bomb.s, mine ? 'DEFEND IT' : 'DEFUSE IT'); if (this.bomb.id === this.me) track('sdPlants'); } }
    if (st === 'defused' && !quiet) { sfx('sd_defused', null, 1); const D = this.F.get(String(m.by || '')); if (D) { D.df = (D.df || 0) + 1; D.acting = null; } this.feed(`🔧 DEFUSED by <b>${this.esc(this.nameOf(String(m.by || '')))}</b>`); if (String(m.by) === this.me) track('sdDefuses'); }
    if (st === 'boom') this.explode();
  }
  roundOver(m) {
    const win = m.win === 'B' ? 'B' : 'R'; this.phase = 'post'; this.endAct(); this.my.firing = false; this.lastEnd = m; this.endsAt = this.clock + SD.END_T;
    if (m.sc && typeof m.sc === 'object') this.sc = { R: Number(m.sc.R) || 0, B: Number(m.sc.B) || 0 };
    const why = ['wiped', 'boom', 'defused', 'time'].includes(m.why) ? m.why : 'wiped'; this.hist.push([win, why]); if (this.hist.length > 12) this.hist.shift();
    const before = this.cash[this.me]; this.cashIn(m.cash); const earned = before != null && this.cash[this.me] != null ? this.cash[this.me] - before : 0;
    const mvp = this.F.get(String(m.mvp || '')); if (mvp) mvp.mvp = (mvp.mvp || 0) + 1;
    const me = this.mine(), won = me && me.team === win; sfx(won ? 'sd_win' : 'sd_lose', null, 1); if (won) track('sdRounds');
    this.roundEndSplash(win, why, mvp, String(m.mw || '').slice(0, 40), earned, !!m.last);
    this.feed(`🏆 ${TEAMS[win].ico} ${TEAMS[win].short} WIN ROUND ${this.round}`);
    if (this.g.renderer.xr.isPresenting) this.g.showBanner(`${TEAMS[win].short} WIN`, `${this.sc.R} – ${this.sc.B}`);
  }
  gameOver(m) {
    if (!m || typeof m !== 'object') return; this.phase = 'over'; this.overMsg = m; this.overAt = this.clock; this.endAct(); this.closePicker();
    if (m.st && typeof m.st === 'object') this.statsIn = m.st; if (m.sc && typeof m.sc === 'object') this.sc = { R: Number(m.sc.R) || 0, B: Number(m.sc.B) || 0 };
    const win = m.win === 'B' ? 'B' : 'R', me = this.mine(), won = me && me.team === win; sfx(won ? 'sd_win' : 'sd_lose', null, 1);
    if (won) track('sdMatch');
    this.splash(TEAMS[win].col, `<p>GAME OVER</p><h1>${TEAMS[win].ico} ${TEAMS[win].short} WIN THE MATCH</h1><div class="sc"><b style="color:${TEAMS.R.col}">${this.sc.R}</b> – <b style="color:${TEAMS.B.col}">${this.sc.B}</b></div><p class="sm">${won ? 'GET IN!' : 'UNLUCKY. GO AND GET A KEBAB.'}</p>`, 2600);
    this.showEnd();      // (the live HUD goes; the final scoreboard and PLAY AGAIN / back to the lobby or menu)
    if (this.g.renderer.xr.isPresenting) this.g.showBanner('GAME OVER', `${TEAMS[win].short} WIN ${this.sc.R}–${this.sc.B}`);
  }
  // the receipt's lines: the result, your own game, the awards from the host
  summary() {
    const m = this.overMsg || {}, win = m.win === 'B' ? 'B' : 'R', me = this.mine(), st0 = m.st && Array.isArray(m.st[this.me]) ? m.st[this.me] : [], st = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => finite(st0[i]) ? st0[i] : 0);
    const lines = [['MODE', 'SEARCH & DESTROY'], ['WINNERS', `${TEAMS[win].ico} ${TEAMS[win].short}`], ['FINAL SCORE', `${this.sc.R} – ${this.sc.B}`]];
    if (me) lines.push(['YOUR TEAM', TEAMS[me.team].short]);
    lines.push(['KILLS / DEATHS / ASSISTS', `${st[0]} / ${st[1]} / ${st[7]}`], ['HEADSHOTS', st[2]], ['DAMAGE DONE', st[3]], ['PLANTS / DEFUSES', `${st[4]} / ${st[5]}`], ['ROUND MVPS', st[8]], ['PICK-UPS', st[6]]);
    for (const a of (Array.isArray(m.aw) ? m.aw : []).slice(0, 4)) if (Array.isArray(a)) lines.push([`${a[0]} ${a[1]}`, `${String(this.nameOf(String(a[2]))).replace(/^🤖 /, '')} · ${a[3]}`]);
    lines.push([me && me.team === win ? 'Tommy: "Get in! ...I\'m just trying to help."' : 'Tommy: "We had them. We HAD them."', '']);
    return lines;
  }

  // ------------------------------------------------------------------ my guns: buying, the speed they let me walk at
  // (the shop: ask the host for it)
  pickGun(id) {
    const G = GUN[gunOk(id)]; if (!G) return; if (this.phase !== 'buy') { this.toast('THE SHOP\'S ONLY OPEN AT THE START OF A ROUND'); return; }
    const L = (this.mine() || {}).load || {}; if (L[G.slot] === G.id) { this.switchTo(G.slot); return; }
    if (G.cost > (this.cash[this.me] ?? SD.CASH0) + this.refundFor(G.slot)) { sfx('sd_nocash', null, 0.8); this.toast(`NEED ${money(G.cost)} FOR THE ${G.name}`); return; }
    this.my.picked = true; this.ask('sdBuy', { g: G.id });
  }
  // (a gun bought this round and swapped for another in the same slot comes back: the host does the sums, this is just to let the buy through)
  refundFor(slot) { const b = this.boughtNow && this.boughtNow[slot], L = (this.mine() || {}).load || {}; return b && L[slot] === b.g ? b.cost : 0; }
  dmgAt(id, d) { return falloff(GUN[id] || GUN[FREE_GUN], d); }
  setGun(id, g) { const f = this.F.get(id); if (!f || !gunOk(g)) return; if (f.load && f.load.P !== g && f.load.S !== g && g !== FREE_GUN) return; f.gun = g; f.picked = true; }
  updateSpeed() { const P = this.g.player, G = this.curG(); P.speedMul = G.move * (this.perk('speed') ? 1.3 : 1) * (this.my.adsK > 0.5 ? G.adsMove : 1) * (this.my.act ? 0 : 1); }
  perk(k) { return (this.my.perks[k] || 0) > this.clock; }
  // someone else's shot: the tracer and the bang from where they were, and where it landed
  remoteShot(id, m) {
    if (!v3ok(m.a) || !v3ok(m.b)) return; const f = this.F.get(id); if (!f || !f.alive) return; const a = new THREE.Vector3(...m.a), b = new THREE.Vector3(...m.b); if (a.distanceTo(b) > 140) return;
    const G = GUNS[Number(m.g)] || GUN[f.gun] || GUN[FREE_GUN]; f.shotT = this.clock;
    const n = clamp(Number(m.n) || 1, 1, 5); for (let i = 0; i < n; i++) { const e = i ? b.clone().add({ x: (Math.random() - 0.5) * 0.8, y: (Math.random() - 0.5) * 0.5, z: (Math.random() - 0.5) * 0.8 }) : b; this.tracer(a, e, G, false); }
    const dir = b.clone().sub(a).normalize(); this.flash(a, G, dir); this.kick[id] = 1; sfx(G.sfx, a, 0.8);
    // (where it ended: a mark if that's a wall or the floor, not someone)
    const tr = this.trace(a, dir, a.distanceTo(b) + 0.3, null); if (tr.holes.length && tr.holes[0][0].distanceTo(b) < 0.4) this.impact(tr.holes[0][0], tr.holes[0][1], G);
  }
  remoteAct(id, m) {
    const f = this.F.get(id); if (!f) return; const at = this.headOf(id, new THREE.Vector3()); if (!at) return;
    if (m.k === 'reload' && m.on) { sfx('sd_reload', at, 0.6); f.rlT = this.clock; }
    if ((m.k === 'plant' || m.k === 'defuse') && m.on) { sfx(m.k === 'plant' ? 'sd_planting' : 'sd_defusing', at, 0.9); f.actT = this.clock; f.acting = m.k; }
    if (!m.on && m.k !== 'reload') f.acting = null;
  }

  // ------------------------------------------------------------------ plant, defuse, pick-ups, guns on the floor (mine)
  // what the ACT button does right now: plant (the carrier in a site), defuse (a defender at the bomb), take a gun off the floor
  actWhat() {
    const me = this.mine(); if (!me || !me.alive || (this.phase !== 'live' && this.phase !== 'buy')) return null; const h = this.g.player.head;
    if (this.phase === 'live') {
      if (me.team === this.att && this.bomb.st === 'carried' && this.bomb.id === this.me) { for (const L of ['A', 'B']) if (Math.hypot(h.x - this.M[L][0], h.z - this.M[L][1]) < this.M[L][2]) return { k: 'plant', s: L }; }
      if (me.team !== this.att && this.bomb.st === 'planted' && this.bomb.p && Math.hypot(h.x - this.bomb.p[0], h.z - this.bomb.p[1]) < SD.BOMB_R) return { k: 'defuse' }; }
    let best = null, bd = SD.GRAB_R; for (const [d, D] of this.drops) { const dist = Math.hypot(h.x - D.x, h.z - D.z); if (dist < bd) { bd = dist; best = { k: 'grab', d, g: D.g }; } }
    return best;
  }
  startAct() {
    const w = this.actWhat(); if (!w || this.my.act) return;
    if (w.k === 'grab') { if (this.clock > (this.grabT || 0)) { this.grabT = this.clock + 0.5; this.ask('sdGrab', { d: w.d }); } return; }
    const T = (w.k === 'plant' ? SD.PLANT_T : SD.DEFUSE_T) * (this.perk('defuse') ? 0.5 : 1);
    this.my.act = { k: w.k, s: w.s, t0: this.clock, T, x: this.g.player.head.x, z: this.g.player.head.z }; this.my.ads = false; this.cancelReload(); this.updateSpeed();
    sfx(w.k === 'plant' ? 'sd_planting' : 'sd_defusing', null, 1); this.net.send({ t: 'sdAct', k: w.k, on: 1 });
  }
  endAct() { if (!this.my || !this.my.act) return; this.my.act = null; this.net.send({ t: 'sdAct', k: '', on: 0 }); this.updateSpeed(); }
  actTick() {
    const a = this.my.act; if (!a) return; const w = this.actWhat(); if (!w || w.k !== a.k || (this.actHeld === false)) { this.endAct(); return; }
    if (this.clock - a.t0 >= a.T) { this.my.act = null; this.updateSpeed(); this.net.send({ t: 'sdAct', k: '', on: 0 }); if (a.k === 'plant') this.ask('sdPlant', { s: a.s, p: [r2(this.g.player.head.x), r2(this.g.player.head.z)] }); else this.ask('sdDefuse', {}); }
  }
  // walked over a pick-up (or the dropped bomb, or a gun when you've no primary): ask for it
  pickTick() {
    const me = this.mine(); if (!me || !me.alive || (this.phase !== 'live' && this.phase !== 'buy')) return; const h = this.g.player.head, t = this.clock;
    if (this.bomb.st === 'dropped' && me.team === this.att && this.bomb.p && Math.hypot(h.x - this.bomb.p[0], h.z - this.bomb.p[1]) < SD.BOMB_R && t > (this.askBombT || 0)) { this.askBombT = t + 0.6; this.ask('sdTake', { i: -1 }); }
    if (!this.my.slots.P && this.phase === 'live') { const w = this.actWhat(); if (w && w.k === 'grab' && GUN[w.g].slot === 'P' && t > (this.grabT || 0)) { this.grabT = t + 0.8; this.ask('sdGrab', { d: w.d }); } }
    for (let i = 0; i < this.pk.length; i++) { const p = this.pk[i]; if (!p.on || Math.hypot(h.x - p.x, h.z - p.z) > SD.PICK_R) continue; const K = PICKS[p.k];
      const useful = K.heal ? me.hp < SD.HP : K.ar ? me.ar < SD.AR_MAX : p.k === 'ammo' ? this.ammoLow() : true;
      if (!useful) { if (t > (this.fullT || 0)) { this.fullT = t + 3; this.pop(K.heal ? '❤ ALREADY FULL' : K.ar ? '🦺 ARMOUR FULL' : '📦 AMMO FULL', '#9fb3d9'); } continue; }
      if (t > (p.askT || 0)) { p.askT = t + 0.8; this.ask('sdTake', { i }); } }
  }
  ammoLow() { this.stash(); for (const k of ['P', 'S']) { const s = this.my.slots[k]; if (s && s.res < GUN[s.g].reserve * (this.my.perks.ammo ? 2 : 1)) return true; } return false; }

  // ------------------------------------------------------------------ the bots (the host runs them)
  botSpawn(id, at) {
    const f = this.F.get(id), list = this.roundMsg ? this.roundMsg.list : []; if (!f) return; const sp = at || (this.roundMsg && this.roundMsg.sp && this.roundMsg.sp[id]) || this.spawnFor(id, list, this.att) || [this.M.def[0], this.M.def[1], 0];
    const L = this.H ? this.load(id) : f.load || {}, gun = GUN[L.P] ? L.P : GUN[L.S] ? L.S : GUN[f.gun] ? f.gun : FREE_GUN, G = GUN[gun];
    const b = { id, x: sp[0], z: sp[1], yaw: sp[2] || 0, pitch: 0, path: [], alive: true, gun, mag: G.mag, reserve: G.reserve, reloadT: 0, nextShot: 0, target: null, seeT: 0, think: Math.random() * 0.3, skill: 0.7 + Math.random() * 0.3, hold: null, wait: 0, actT: 0, fl: 0, plan: Math.random() < 0.5 ? 'A' : 'B', strafe: Math.random() < 0.5 ? 1 : -1, stuck: 0, lastHurt: null };
    if (!this.bots) this.bots = new Map(); this.bots.set(id, b); f.gun = gun;
  }
  botsUpdate(dt) {
    if (!this.bots || !this.bots.size) return; const nav = this.g.room.nav; if (!nav) return; const t = this.clock;
    // (the attackers' plan: everyone goes to the same site, picked each round)
    if (this.round !== this.planRound) { this.planRound = this.round; this.attSite = Math.random() < 0.5 ? 'A' : 'B'; }
    for (const [id, b] of this.bots) { const f = this.F.get(id); if (!f) continue; b.alive = f.alive; if (!b.alive) { b.fl = 0; continue; }
      b.fl = 0; if (this.phase === 'buy' || this.phase === 'wait' || this.botsFrozen) continue;      // (botsFrozen: the tests hold them still)
      if (this.phase !== 'live') { continue; }
      const G = GUN[b.gun] || GUN.monstor, head = new THREE.Vector3(b.x, this.floor(b.x, b.z) + 1.62, b.z);
      if (b.reloadT && t >= b.reloadT) { const n = Math.min(G.mag - b.mag, b.reserve); b.mag += n; b.reserve -= n; b.reloadT = 0; }
      // look for someone to shoot: the closest enemy it can see, in front of it (or whoever's just shot it)
      if ((b.think -= dt) <= 0) { b.think = 0.18 + Math.random() * 0.1; let best = null, bd = SD.SPOT_R; const q = new THREE.Vector3();
        for (const [oid, o] of this.F) { if (!o.alive || o.team === f.team || !this.headOf(oid, q)) continue; const d = head.distanceTo(q); if (d > bd) continue;
          const ang = Math.abs(((Math.atan2(-(q.x - b.x), -(q.z - b.z)) - b.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (ang > 1.25 && b.lastHurt !== oid) continue;
          if (!this.canSee(head, q)) continue; best = oid; bd = d; }
        if (best !== b.target) { b.target = best; b.seeT = t + (0.35 + Math.random() * 0.45) / b.skill; } }
      let moving = false;
      if (b.target) { const q = this.headOf(b.target, new THREE.Vector3()), T = this.F.get(b.target); if (!q || !T || !T.alive) { b.target = null; } else {
        const want = Math.atan2(-(q.x - b.x), -(q.z - b.z)); let dy = want - b.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; b.yaw += dy * Math.min(1, dt * 9);
        const dist = head.distanceTo(q); b.pitch = Math.atan2(q.y - 0.3 - head.y, Math.max(0.1, Math.hypot(q.x - b.x, q.z - b.z)));
        // a little side-step while it fights (not the sniper)
        if (G.id !== 'sausage' && dist > 3) { const sx = Math.cos(b.yaw) * b.strafe, sz = -Math.sin(b.yaw) * b.strafe, nx = b.x + sx * dt * 1.2, nz = b.z + sz * dt * 1.2, k = nav.idx(nx, nz); if (k >= 0 && nav.free[k]) { b.x = nx; b.z = nz; moving = true; } else b.strafe *= -1; if (Math.random() < dt * 0.6) b.strafe *= -1; }
        if (b.mag <= 0) { if (!b.reloadT && b.reserve > 0) { b.reloadT = t + G.reload * (G.rtype === 'shell' ? G.mag * 0.6 : 1); f.rlT = t; this.net.send({ t: 'sdAct', k: 'reload', on: 1, id }); } }
        else if (t >= b.seeT && t >= b.nextShot && !b.reloadT && Math.abs(dy) < 0.25 && dist < G.range + 4) this.botFire(b, f, G, q, dist); } }
      if (!b.target) {
        if (b.mag < G.mag * 0.35 && !b.reloadT && b.reserve > 0) { b.reloadT = t + G.reload * (G.rtype === 'shell' ? (G.mag - b.mag) * 0.6 : 1); f.rlT = t; this.net.send({ t: 'sdAct', k: 'reload', on: 1, id }); }
        moving = this.botMove(b, f, G, dt, nav) || moving;
      }
      b.fl = (b.actT ? 2 : 0) | (b.reloadT ? 4 : 0) | (t - (b.shotAt || -9) < 0.15 ? 1 : 0);
    }
    // the bots' moves out to everyone else (10 a second)
    if (this.online && (this.H.botT -= dt) <= 0) { this.H.botT = 0.1; const out = []; for (const [id, b] of this.bots) out.push([id, r2(b.x), r2(b.z), r2(b.yaw), r2(b.pitch), b.fl]); this.net.send({ t: 'sdBots', b: out }); }
  }
  botFire(b, f, G, q, dist) {
    const t = this.clock, auto = G.modes[0] === 'auto' || G.modes[0] === 'burst'; b.mag--; b.nextShot = t + G.rate * (auto ? 1.15 : 1.6 + Math.random() * 0.6) + (G.cycle || 0) * 0.4; b.shotAt = t;
    const T = this.F.get(b.target), moving = T && T.id === this.me ? (this.g.player.flatMove && Math.hypot(this.g.player.flatMove.x, this.g.player.flatMove.z) > 0.2) : true;
    let dmg = 0, z = -1; const pHit = clamp((0.82 - (dist / G.range) * 0.42 - G.spread * 3 - (moving ? 0.12 : 0)) * b.skill, 0.1, 0.85);
    for (let n = 0; n < G.pellets; n++) if (Math.random() < pHit) { const r = Math.random(), zz = r < 0.12 ? 1 : r < 0.32 ? 2 : 0; dmg += G.dmg * Math.max(0.25, falloff(G, dist)) * (zz === 1 ? G.hs : zz === 2 ? G.limb : 1); if (z < 0 || zz === 1) z = zz; }
    const from = new THREE.Vector3(b.x - Math.sin(b.yaw) * 0.45 + Math.cos(b.yaw) * 0.18, this.floor(b.x, b.z) + 1.35, b.z - Math.cos(b.yaw) * 0.45 - Math.sin(b.yaw) * 0.18);
    const aim = q.clone().add({ x: 0, y: z === 1 ? 0 : z === 2 ? -1.1 : -0.35, z: 0 }); if (!dmg) aim.add({ x: (Math.random() - 0.5) * 1.6, y: (Math.random() - 0.3) * 1.2, z: (Math.random() - 0.5) * 1.6 });
    const end = dmg ? aim : from.clone().add(aim.sub(from).normalize().multiplyScalar(this.wallT(new THREE.Ray(from, aim.clone().normalize()), G.range)));
    this.net.send({ t: 'sdShot', id: b.id, a: [r2(from.x), r2(from.y), r2(from.z)], b: [r2(end.x), r2(end.y), r2(end.z)], g: G.i, n: Math.min(5, G.pellets) });
    this.remoteShot(b.id, { a: [from.x, from.y, from.z], b: [end.x, end.y, end.z], g: G.i, n: Math.min(5, G.pellets) });
    if (dmg > 0) { const T2 = this.bots.get(b.target); if (T2) T2.lastHurt = b.id; this.hostDamage(b.target, b.id, Math.round(dmg), z, from, G, false); }
  }
  // where a bot's going when it isn't fighting
  botMove(b, f, G, dt, nav) {
    const t = this.clock, att = f.team === this.att, carrier = this.bomb.st === 'carried' && this.bomb.id === b.id;
    let goal = null, stay = 1.2;
    if (b.actT) {      // planting or defusing: stood still till it's done
      if (t >= b.actT) { b.actT = 0; f.acting = null; this.net.send({ t: 'sdAct', k: '', on: 0, id: b.id }); if (carrier) this.plantNow(b.id, new THREE.Vector3(b.x, 0, b.z));
        else if (!att && this.bomb.st === 'planted' && this.bomb.p && Math.hypot(b.x - this.bomb.p[0], b.z - this.bomb.p[1]) < SD.BOMB_R + 0.4) this.defuseNow(b.id); }
      return false; }
    const startAct = (k, T) => { b.actT = t + T; f.acting = k; f.actT = t; this.net.send({ t: 'sdAct', k, on: 1, id: b.id }); sfx(k === 'plant' ? 'sd_planting' : 'sd_defusing', new THREE.Vector3(b.x, 1, b.z), 0.8); };
    if (att) {
      if (this.bomb.st === 'planted' && this.bomb.p) { goal = [this.bomb.p[0] + Math.cos(b.yaw0 || (b.yaw0 = Math.random() * 6)) * 3, this.bomb.p[1] + Math.sin(b.yaw0) * 3]; stay = 1.5; }
      else if (this.bomb.st === 'dropped' && this.bomb.p) { goal = this.bomb.p; stay = 0.4; if (Math.hypot(b.x - goal[0], b.z - goal[1]) < SD.BOMB_R) { this.hostBomb({ st: 'carried', id: b.id }); } }
      else if (carrier) { const S = this.M[this.attSite]; goal = [S[0], S[1]]; stay = 0.6; if (Math.hypot(b.x - S[0], b.z - S[1]) < S[2] * 0.6) { startAct('plant', SD.PLANT_T); return false; } }
      else { const S = this.M[this.attSite], cid = this.bomb.id, c = cid ? this.headOf(cid, new THREE.Vector3()) : null; goal = c && this.F.get(cid) && this.F.get(cid).alive ? [c.x + Math.cos(b.strafe * 2 + 1) * 2, c.z + Math.sin(b.strafe * 2 + 1) * 2] : [S[0] + b.strafe * 2.5, S[1] - b.strafe * 1.5]; stay = 2; }
    } else {
      if (this.bomb.st === 'planted' && this.bomb.p) { goal = this.bomb.p; stay = 0.5; if (Math.hypot(b.x - goal[0], b.z - goal[1]) < SD.BOMB_R * 0.7) { startAct('defuse', SD.DEFUSE_T); return false; } }
      else { if (!b.hold || t > b.holdUntil) { const L = b.plan, S = this.M[L], a = Math.random() * Math.PI * 2, r = S[2] + 1 + Math.random() * 3; b.hold = [S[0] + Math.cos(a) * r, S[1] + Math.sin(a) * r]; b.holdUntil = t + 14 + Math.random() * 14; if (Math.random() < 0.3) b.plan = b.plan === 'A' ? 'B' : 'A'; }
        goal = b.hold; stay = 1.2; }
    }
    // a detour for a pick-up close by when it's hurt or low on ammo, or for a better gun lying on the floor
    if (!b.pickGoal && (f.hp < 60 || b.reserve < G.mag) && (b.pickT = (b.pickT || 0) - dt) <= 0) { b.pickT = 2; const want = f.hp < 60 ? ['burger', 'kebab'] : ['ammo']; let bi = -1, bd = 9;
      this.pk.forEach((p, k) => { if (p.on && want.includes(p.k)) { const d = Math.hypot(p.x - b.x, p.z - b.z); if (d < bd) { bd = d; bi = k; } } }); if (bi >= 0) b.pickGoal = bi; }
    if (b.pickGoal != null) { const p = this.pk[b.pickGoal]; if (!p || !p.on) b.pickGoal = null; else { goal = [p.x, p.z]; stay = 0.3; if (Math.hypot(p.x - b.x, p.z - b.z) < SD.PICK_R) { this.botTake(b, f, b.pickGoal); b.pickGoal = null; } } }
    if (!carrier && b.pickGoal == null && this.H && (b.gunT = (b.gunT || 0) - dt) <= 0) { b.gunT = 1.5; let bd = 7, best = null; for (const [, D] of this.H.drops) { const DG = GUN[D.g], d = Math.hypot(D.x - b.x, D.z - b.z); if (d < bd && DG && DG.cost > G.cost && (DG.slot === 'P' || !this.load(b.id).P)) { bd = d; best = D; } } b.gunGoal = best ? best.d : null; }
    if (b.gunGoal != null && this.H) { const D = this.H.drops.get(b.gunGoal); if (!D) b.gunGoal = null; else { goal = [D.x, D.z]; stay = 0.3; if (Math.hypot(D.x - b.x, D.z - b.z) < SD.GRAB_R) { this.hostGrab(b.id, D.d); b.gunGoal = null; } } }
    if (!goal) return false;
    if (Math.hypot(goal[0] - b.x, goal[1] - b.z) < stay) { b.path = []; if ((b.lookT = (b.lookT || 0) - dt) <= 0) { b.lookT = 1.5 + Math.random() * 2; b.yawT = Math.random() * Math.PI * 2; } let dy = (b.yawT || 0) - b.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; b.yaw += dy * Math.min(1, dt * 2); b.pitch *= 0.9; return false; }
    if (!b.path.length || !b.goal || Math.hypot(b.goal[0] - goal[0], b.goal[1] - goal[1]) > 1.5 || (b.repath = (b.repath || 0) - dt) <= 0) { b.repath = 2; b.goal = goal.slice(); const pa = nav.path(b.x, b.z, goal[0], goal[1]); b.path = pa ? pa.map(v => ({ x: v.x, z: v.y })) : []; }
    if (!b.path.length) return false; const w = b.path[0], dx = w.x - b.x, dz = w.z - b.z, d = Math.hypot(dx, dz), step = SD.BOT_SPEED * G.move * dt * ((this.botPerk(b.id, 'speed')) ? 1.3 : 1);
    if (d <= step) { b.x = w.x; b.z = w.z; b.path.shift(); } else { b.x += dx / d * step; b.z += dz / d * step; }
    if (d > 0.01) { const want = Math.atan2(-dx, -dz); let dy = want - b.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; b.yaw += dy * Math.min(1, dt * 6); b.pitch *= 0.9; }
    return true;
  }
  botPerk(id, k) { const p = this.H && this.H.perks[id]; return !!(p && p[k] > this.clock); }
  botTake(b, f, i) { const p = this.pk[i]; if (!p || !p.on) return; const K = PICKS[p.k]; p.on = false; p.back = K.respawn ? this.clock + K.respawn : 0; this.stat(b.id).pk++;
    if (K.heal) f.hp = Math.min(SD.HP, f.hp + K.heal); if (K.ar) f.ar = Math.min(SD.AR_MAX, f.ar + K.ar); if (p.k === 'ammo') b.reserve = GUN[b.gun].reserve; if (K.perk) { const pk = this.H.perks[b.id] || (this.H.perks[b.id] = {}); pk[K.perk] = K.t ? this.clock + K.t : 1e9; }
    this.send('sdGot', { i, by: b.id, k: p.k, hp: Math.ceil(f.hp), ar: Math.round(f.ar) }); }
  // a bot's body on every game: one of the squad, the same puppet as another player's (its name tag says 🤖)
  makePuppet(f) {
    let pu = null; try { pu = this.g.makePuppet ? this.g.makePuppet({ id: f.id, name: f.name, char: f.char, bot: true }) : null; } catch (e) { console.warn('snd puppet', e); }
    if (pu) this.puppets.set(f.id, pu); return pu;
  }
  // a bot's pose, as a player's game would send it: head, which way it looks, its hands (the right one up with the gun)
  botPoseMsg(x, z, yaw, pitch, crouch) {
    const y0 = this.floor(x, z), hy = y0 + 1.62 - (crouch ? 0.45 : 0), cp = Math.cos(pitch), fx = -Math.sin(yaw) * cp, fz = -Math.cos(yaw) * cp, fy = Math.sin(pitch), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    _e.set(pitch, yaw, 0, 'YXZ'); _q.setFromEuler(_e);
    return { h: [x, hy, z], q: [_q.x, _q.y, _q.z, _q.w], l: [x - rx * 0.2 + fx * 0.25, y0 + 1.0 - (crouch ? 0.3 : 0), z - rz * 0.2 + fz * 0.25], rh: [x + fx * 0.45 + rx * 0.16, hy - 0.28 + fy * 0.3, z + fz * 0.45 + rz * 0.16], s: 1, st: 0, flat: 1 };
  }
  puppetsUpdate(dt) {
    for (const [id, pu] of this.puppets) { const f = this.F.get(id); if (!f) continue; let x, z, yaw, pitch;
      if (this.host && this.bots && this.bots.get(id)) { const b = this.bots.get(id); x = b.x; z = b.z; yaw = b.yaw; pitch = b.pitch; }
      else { const bp = this.botPose.get(id); if (!bp) continue; const k = Math.min(1, dt * 10); bp.x += ((bp.tx ?? bp.x) - bp.x) * k; bp.z += ((bp.tz ?? bp.z) - bp.z) * k; let dy = (bp.tyaw ?? bp.yaw) - bp.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; bp.yaw += dy * k; x = bp.x; z = bp.z; yaw = bp.yaw; pitch = bp.pitch || 0; }
      if (!finite(x, z, yaw, pitch)) continue;
      try { pu.update(dt, this.botPoseMsg(x, z, yaw, f.acting ? -0.6 : pitch, !!f.acting)); } catch (e) { if (!this.puWarn) { this.puWarn = true; console.warn('snd puppet', e); } } }
  }

  // ------------------------------------------------------------------ every frame
  update(dt) {
    dt = Math.min(dt, 0.1); this.clock += dt; const g = this.g, P = g.player, xr = g.renderer.xr.isPresenting, t = this.clock, me = this.mine();
    if (this.host) this.hostUpdate(dt);
    // (the match is over: the final scoreboard is the end screen on a phone or computer, so the receipt card behind it goes)
    if (this.phase === 'over' && !g.renderer.xr.isPresenting && g.director && g.director.receipt && g.director.receipt.visible) g.director.receipt.visible = false;
    else if (this.phase === 'wait' && (this.helloT -= dt) <= 0) { this.helloT = 3; this.net.send({ t: 'sdHello' }); }
    if ((this.foodT = (this.foodT || 0) - dt) <= 0) { this.foodT = 1; this.clearFood(); }
    this.panel.update(dt);
    const alive = !!(me && me.alive && this.inRound());
    // held at the spawn for the shop; planting or defusing stands you still; out of the round: watching
    this.pin(this.phase === 'buy' || !!this.my.act || (me && !me.alive && this.inRound()) || this.phase === 'post');
    if (this.my.act) this.actTick();
    this.gunTick(dt, alive);
    for (const k in this.my.perks) if (this.my.perks[k] && this.my.perks[k] < t) { delete this.my.perks[k]; this.updateSpeed(); this.pop(`${({ reload: '⏱️', speed: '⚡', dmg: '🌶️' })[k] || ''} PERK WORN OFF`, '#9fb3d9'); }
    if ((this.pickT = (this.pickT || 0) - dt) <= 0) { this.pickT = 0.1; this.pickTick(); }
    // the bomb: where it is, and its beeping (faster and faster)
    this.bombTick(dt);
    // bots, other people's guns, the guns on the floor, the effects
    this.puppetsUpdate(dt); this.bodies(); this.gunsDraw(dt, me, xr); this.dropsTick(t);
    for (const p of this.pk) if (p.pop) { p.pop += dt * 3; if (p.pop >= 1) p.pop = 0; }
    this.drawPicks(t); this.animFx(dt); if ((this.stepT = (this.stepT || 0) - dt) <= 0) { this.stepT = 0.1; this.stepsTick(); }
    if (xr) this.vrInput(P, me); else { this.drawHud(me); }
    this.countdown();
    this.laser.visible = xr && alive && this.phase === 'live';
    if (this.laser.visible) { const src = this.vrGun && this.vrGun.parent ? this.vrGun : ((P.hands || []).find(h => h.source && h.handedness === 'right' && h.ctrl) || {}).ctrl; if (src) { src.updateMatrixWorld(true); src.getWorldPosition(this.laser.position); src.getWorldQuaternion(this.laser.quaternion); } else this.laser.visible = false; }
    // out of the round in VR: you're moved to stand by whoever you're watching
    if (me && !me.alive && this.inRound() && xr && this.spect) { const q = this.posOf(this.spect, new THREE.Vector3()); if (q && this.hd(q, P.head) > 3) this.respawnAt(q.x - 1.5, q.z); }
    if (this.deathCam && this.clock - this.deathCam.t0 >= 2.8) { this.deathCam = null; if (!this.spect) this.doWatch(true); }      // (the look at who got you's over: watching your team)
    if (me && !me.alive && this.inRound() && !this.spect && !this.deathCam && (this.watchT = (this.watchT || 0) - dt) <= 0) { this.watchT = 1; this.doWatch(true); }
    // the low health warning: a heartbeat
    if (alive && me.hp < 35 && (this.lowSnd = (this.lowSnd || 0) - dt) <= 0) { this.lowSnd = 1.1; sfx('sd_heartbeat', null, 0.6); }
  }
  // the guns on the floor: lying there turning slowly, a glint so you spot them
  dropsTick(t) { for (const [, D] of this.drops) { D.mesh.rotation.y = (D.t0 || 0) + t * 0.6; D.mesh.position.y = D.y + 0.08 + Math.sin(t * 3 + D.d) * 0.02; } }
  // everyone's body drawn right: the dead laid out, nobody hidden; enemies' name tags hidden (no seeing them through walls)
  bodies() {
    const round = this.inRound(), mt = this.myTeam();
    // (someone who came in mid-round sits it out, out of sight, till the next one: that's them too, on their own game)
    if (this.online) for (const [id, p] of this.net.players) if (!this.F.has(String(id)) && p.avatar) p.avatar.impHidden = round;
    if (round && !this.mine()) { this.g.player.ghost = true; const sb = this.g.selfBody && this.g.selfBody(); if (sb) sb.impHidden = true; }
    for (const [id, f] of this.F) { const av = this.avatar(id); if (!av) continue;
      if (id === this.me) { av.impHidden = !!(round && !f.alive); continue; }
      av.impHidden = false; av.impBody = !!(round && !f.alive); av.impRed = false; if (av.tag) av.tag.visible = !(round && f.alive && mt && f.team !== mt) && !av.impBody; }
  }
  // the bomb: on the carrier's back, going down in front of them as they plant, on the floor where it was dropped,
  // planted and blinking with the seconds on its clock, the pliers at it while it's defused, gone
  bombTick(dt) {
    const B = this.bomb, m = this.bombMesh, t = this.clock; let show = false;
    const car = B.id ? this.F.get(B.id) : null, planting = B.st === 'carried' && car && car.alive && (B.id === this.me ? !!(this.my.act && this.my.act.k === 'plant') : car.acting === 'plant');
    if (B.st === 'carried' && B.id && this.inRound()) { const h = this.headOf(B.id, new THREE.Vector3());
      if (h && car && car.alive && B.id !== this.me) { const av = this.avatar(B.id), yaw = av && av.yaw != null ? av.yaw : (this.botPose.get(B.id) || (this.bots && this.bots.get(B.id)) || {}).yaw || 0;
        if (planting) { const k = clamp((t - (car.actT || t)) / SD.PLANT_T, 0, 1); m.position.set(h.x - Math.sin(yaw) * 0.55, this.floor(h.x, h.z) + 0.25 * (1 - k) + 0.02, h.z - Math.cos(yaw) * 0.55); m.rotation.set(0, yaw + Math.PI, 0); m.scale.setScalar(1); }
        else { m.position.set(h.x + Math.sin(yaw) * 0.32, h.y - 0.75, h.z + Math.cos(yaw) * 0.32); m.rotation.set(0, yaw, 0); m.scale.setScalar(0.7); } show = true; } }
    else if ((B.st === 'dropped' || B.st === 'planted' || B.st === 'defused') && B.p) { m.position.set(B.p[0], this.floor(B.p[0], B.p[1]) + 0.02, B.p[1]); m.scale.setScalar(1); if (B.st === 'dropped') m.rotation.set(0.3, t * 0.8, 0.2); else m.rotation.set(0, 0, 0); show = true; }
    m.visible = show && B.st !== 'boom'; this.bombRing.visible = show && (B.st === 'dropped' || B.st === 'planted');
    if (this.bombRing.visible) { this.bombRing.position.set(m.position.x, m.position.y + 0.03, m.position.z); this.bombRing.material.color.setHex(B.st === 'dropped' ? 0xff9f1c : 0xff3b3b); this.bombRing.scale.setScalar(1 + Math.sin(t * 6) * 0.04); }
    // its clock: the seconds left when it's planted (red), dashes otherwise
    const left = B.st === 'planted' ? Math.max(0, this.bombAt - t) : -1, face = B.st === 'planted' ? `00:${String(Math.ceil(left)).padStart(2, '0')}` : B.st === 'defused' ? 'OFF' : planting ? '*'.repeat(1 + Math.floor((t * 4) % 4)) : '--:--';
    if (face !== this.faceWas && m.visible) { this.faceWas = face; this.face.draw(face); }
    if (B.st === 'planted') { const gap = this.beepGap(left);
      if ((this.beepT = (this.beepT || 0) - dt) <= 0) { this.beepT = gap; sfx('sd_beep', m.position, left < 5 ? 1 : 0.75); this.bombLight.visible = true; this.blinkT = 0.07; }
      if ((this.blinkT = (this.blinkT || 0) - dt) <= 0) this.bombLight.visible = false; }
    else this.bombLight.visible = planting ? Math.sin(t * 20) > 0 : B.st === 'carried' || B.st === 'dropped' ? Math.sin(t * 4) > 0 : false;
    // someone else at it with the pliers
    let def = null; if (B.st === 'planted' && B.p) for (const [id, f] of this.F) if (id !== this.me && f.alive && f.acting === 'defuse') { def = f; break; }
    this.pliersMesh.visible = !!def; if (def) { this.pliersMesh.position.set(B.p[0] + 0.1, this.floor(B.p[0], B.p[1]) + 0.32, B.p[1] + 0.22); this.pliersMesh.rotation.set(-0.5, 0, Math.sin(t * 14) * 0.3); }
  }
  // the time between the bomb's beeps: a second when it's just planted, faster and faster to a tenth at the end
  beepGap(left) { const k = clamp(left / SD.BOMB_T, 0, 1); return 0.1 + 0.9 * Math.pow(k, 1.4); }
  vrInput(P, me) {
    const pad = (hand) => { const h = (P.hands || []).find(h => h.source && h.handedness === hand); return h; }, R = pad('right'), L = pad('left'), gp = (h) => h && h.source && h.source.gamepad;
    const press = (key, h, i) => { const g2 = gp(h), on = !!(g2 && g2.buttons[i] && g2.buttons[i].pressed), was = this.btnWas[key]; this.btnWas[key] = on; return [on && !was, on]; };
    const [trigDown, trig] = press('trig', R, 0), [aDown] = press('a', R, 4), [bDown, bHeld] = press('b', R, 5), [yDown] = press('y', L, 5), [xDown] = press('x', L, 4), [, stick] = press('ls', L, 3);
    this.boardHeld(stick);      // (hold the left stick in: the scoreboard)
    if (this.panel.open) return;
    if (!me) return;
    if (!me.alive && this.inRound()) { if (aDown || trigDown) this.doWatch(); return; }
    if (this.phase === 'buy' && (yDown || aDown)) { this.openPicker(); return; }
    if (yDown) this.cycleMode();
    this.my.firing = trig && this.phase === 'live'; if (trigDown) this.fire();
    if (aDown) this.doReload();
    if (xDown) this.swapGun();
    // a flick of the gun down and back (the controller pointing at the floor, fast) reloads too
    if (R && R.ctrl) { R.ctrl.getWorldQuaternion(_q); const dy = new THREE.Vector3(0, 0, -1).applyQuaternion(_q).y, was = this.flickY ?? dy; this.flickY = dy; if (dy < -0.85 && was - dy > 0.12) this.doReload(); }
    const w = this.actWhat(); if (bDown && w && w.k === 'grab') this.startAct();
    this.actHeld = bHeld; if (bHeld && !this.my.act && w && w.k !== 'grab') this.startAct(); if (!bHeld && this.my.act) this.endAct();
  }
  doWatch(quiet) {
    const mt = this.myTeam(), live = [...this.F.values()].filter(f => f.id !== this.me && f.alive && (!mt || f.team === mt)), pool = live.length ? live : [...this.F.values()].filter(f => f.id !== this.me && f.alive);
    this.deathCam = null; if (!pool.length) { this.spect = null; return; } const i = pool.findIndex(f => f.id === this.spect); this.spect = pool[(i + 1) % pool.length].id; if (!quiet) this.toast('WATCHING ' + this.nameOf(this.spect).replace(/^🤖 /, ''));
  }
  // out of the round on a phone or computer: first a look at whoever got you (the camera closing in on them), then
  // watching a team-mate over their shoulder
  viewCam() {
    const g = this.g, P = g.player, me = this.mine(); if (!P.flatMode || g.renderer.xr.isPresenting || !me || me.alive || !this.inRound()) { this.viewCamNow = null; return null; }
    const cam = this.tcam || (this.tcam = new THREE.PerspectiveCamera(60, 1, 0.05, 200));
    const dc = this.deathCam; if (dc && this.clock - dc.t0 < 2.8) { const h = this.headOf(dc.by, new THREE.Vector3()); if (h) { const k = clamp((this.clock - dc.t0) / 2.2, 0, 1), from = dc.at, look = h.clone().add({ x: 0, y: -0.1, z: 0 });
        cam.position.copy(from).lerp(look, 0.55 * k * k * (3 - 2 * k)); cam.position.y = Math.max(cam.position.y, from.y - 0.2); const d = look.clone().sub(cam.position); if (d.length() > 1.2) { cam.lookAt(look); }
        cam.aspect = g.camera.aspect; cam.fov = 60 - 22 * k; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); this.viewCamNow = cam; return cam; } }
    else if (dc) { this.deathCam = null; if (!this.spect) this.doWatch(true); }
    if (!this.spect) { this.viewCamNow = null; return null; }
    const h = this.headOf(this.spect, new THREE.Vector3()); if (!h) return null;
    const dir = g.camera.getWorldDirection(new THREE.Vector3());
    const look = h.clone().add({ x: 0, y: 0.1, z: 0 }), want = look.clone().addScaledVector(dir, -2.4).add({ x: 0, y: 0.5, z: 0 }), r = new THREE.Ray(look, want.clone().sub(look).normalize());
    const d = Math.max(0.6, Math.min(look.distanceTo(want), this.wallT(r, look.distanceTo(want)) - 0.25)); want.copy(look).addScaledVector(r.direction, d);
    if (!this.camWas || this.camWas.distanceTo(want) > 4) this.camWas = want.clone(); else this.camWas.lerp(want, 0.3);
    cam.position.copy(this.camWas); cam.quaternion.copy(g.camera.getWorldQuaternion(_q)); cam.aspect = g.camera.aspect; cam.fov = g.camera.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); this.viewCamNow = cam; return cam;
  }
  esc(t) { return String(t).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])); }
  // the state of play (the tests, the wrist)
  hudState() { const me = this.mine(); return { phase: this.phase, round: this.round, win: this.win, sc: { ...this.sc }, att: this.att, team: me && me.team, alive: !!(me && me.alive), hp: me ? me.hp : 0, ar: me ? me.ar : 0, gun: this.my.gun, slot: this.my.cur, mag: this.my.mag, reserve: this.my.reserve, reloading: !!this.my.reloadEnd, ads: this.my.adsK, mode: this.fireMode(), cash: this.cash[this.me] || 0, bomb: this.bomb.st, left: Math.max(0, this.endsAt - this.clock), perks: Object.keys(this.my.perks) }; }
  dispose() {
    const g = this.g; this.disposed = true; try { this.closePicker(); } catch (e) {} this.panel.close(true); if (this.panel.wrap) this.panel.wrap.remove(); if (this.panel.mesh) g.scene.remove(this.panel.mesh); if (this.panel.dot) g.scene.remove(this.panel.dot);
    g.scene.remove(this.grp); for (const [, pu] of this.puppets) { try { pu.dispose && pu.dispose(); } catch (e) {} } this.puppets.clear();
    this.disposeGuns(); this.disposeFx();
    for (const [id] of this.F) { const av = id === this.me ? (g.selfBody && g.selfBody()) : (this.net.players.get(id) || {}).avatar; if (av) { av.impHidden = false; av.impBody = false; if (av.tag && id !== this.me) av.tag.visible = true; } }
    this.disposeUI();
    for (const k in this.handlers) this.net.on[k] = this.prevOn[k]; this.net.on.leave = this.leaveWas;
    const mp = g.mp; if (mp) mp.noPunch = false; g.player.noGrab = false; g.player.ghost = false; g.player.speedMul = 1;
    if (g.player.flatGrip && this.gripHid) g.player.flatGrip.visible = true; if (this.fov0 != null && g.camera) { g.camera.fov = this.fov0; g.camera.updateProjectionMatrix(); }
  }
}
Object.assign(SearchDestroy.prototype, GUNSYS, FX, UI);
