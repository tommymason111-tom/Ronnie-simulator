// CUSTOM ROOM OPTIONS: the host sets up the room their way in the lobby (how long a game lasts, how often the squad
// attacks, power-ups, how much food, whether players can punch each other, how many can join). The host sends them to
// everyone (and to anyone who joins); the game reads them when it starts. Playing on your own, they're the normal ones.
export const OPT_DEFS = [
  { k: 'len', ico: '⏱️', name: 'GAME LENGTH', vals: [['short', 'SHORT', 0.6], ['normal', 'NORMAL', 1], ['long', 'LONG', 1.6]], def: 'normal' },
  { k: 'attacks', ico: '⚔️', name: 'SQUAD ATTACKS', vals: [['off', 'OFF', 0], ['chill', 'CHILL', 1.8], ['normal', 'NORMAL', 1], ['chaos', 'CHAOS', 0.45]], def: 'normal' },
  { k: 'powerups', ico: '⚡', name: 'POWER-UPS', vals: [['off', 'OFF', 0], ['on', 'ON', 1]], def: 'on' },
  { k: 'food', ico: '🍔', name: 'FOOD ABOUT', vals: [['less', 'LESS', 0.5], ['normal', 'NORMAL', 1], ['loads', 'LOADS', 1.6]], def: 'normal' },
  { k: 'pvp', ico: '👊', name: 'PUNCH EACH OTHER', vals: [['off', 'OFF', 0], ['on', 'ON', 1]], def: 'on' },
  { k: 'max', ico: '👥', name: 'MAX PLAYERS', vals: [['4', '4', 4], ['6', '6', 6], ['8', '8', 8], ['12', '12', 12]], def: '12' },
  // Imposter's own (Among Us style lobby settings)
  { k: 'kcd', ico: '🔪', name: 'IMPOSTER: KILL COOLDOWN', vals: [['20', '20s', 20], ['30', '30s', 30], ['45', '45s', 45]], def: '30', imp: true },
  { k: 'jobs', ico: '🔧', name: 'IMPOSTER: JOBS EACH', vals: [['3', '3', 3], ['5', '5', 5], ['7', '7', 7]], def: '5', imp: true },
  { k: 'meet', ico: '🗳️', name: 'IMPOSTER: MEETING TIME', vals: [['60', '60s', 60], ['90', '90s', 90], ['120', '120s', 120]], def: '90', imp: true },
  { k: 'emerg', ico: '🔔', name: 'IMPOSTER: EMERGENCY MEETINGS EACH', vals: [['1', '1', 1], ['2', '2', 2], ['3', '3', 3]], def: '1', imp: true },
  { k: 'ejects', ico: '📢', name: 'IMPOSTER: SAY WHO WAS THE IMPOSTER', vals: [['off', 'OFF', 0], ['on', 'ON', 1]], def: 'on', imp: true },
];
const DEFAULTS = Object.fromEntries(OPT_DEFS.map(d => [d.k, d.def]));
export const roomOpts = { ...DEFAULTS };
// only known options with known values get in (a message from anyone could carry anything)
export function setOpts(o) {
  if (!o || typeof o !== 'object') return roomOpts;
  for (const d of OPT_DEFS) { const v = o[d.k]; if (typeof v === 'string' && d.vals.some(x => x[0] === v)) roomOpts[d.k] = v; }
  return roomOpts;
}
export function resetOpts() { Object.assign(roomOpts, DEFAULTS); }
// the number that goes with an option's current value (a multiplier, a count, 0 for off)
export function optNum(k) { const d = OPT_DEFS.find(x => x.k === k); const v = d && d.vals.find(x => x[0] === roomOpts[k]); return v ? v[2] : 1; }
export const optOn = (k) => optNum(k) !== 0;
// only a room game uses them (solo is always the normal game)
export function inRoom() { const m = window.ronnieMP; return !!(m && m.net && m.net.connected); }
export const roomNum = (k) => inRoom() ? optNum(k) : (OPT_DEFS.find(x => x.k === k).vals.find(x => x[0] === DEFAULTS[k]) || [0, 0, 1])[2];
window.__roomOpts = roomOpts;
