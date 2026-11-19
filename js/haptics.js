// HAPTICS: a little buzz when YOU do something (eat, grab, throw, punch, get hit, win...). On a phone it's the
// vibration motor (Android browsers; iPhones' Safari doesn't let web pages vibrate); in VR it's the controllers' rumble.
// It rides on the sound effects: each sound that's yours (no position, or right next to you) gets its own pattern,
// so every action feels different too. Off in Settings (rs_haptics = '0').
const P = {      // [vibration pattern (ms on/off/on...), VR strength 0..1]
  chomp: [[18], 0.35], crunch: [[14, 20, 14], 0.4], munch: [[16], 0.3], gulp: [[28], 0.35], slurp: [[10, 15, 10, 15, 10], 0.25], squish: [[12], 0.25], lick: [[6], 0.15], burp: [[60], 0.6],
  pickup: [[10], 0.3], throw: [[14], 0.35], dart: [[10], 0.25], catch: [[16], 0.4], land: [[24], 0.35], thud: [[30], 0.45], bounce: [[8], 0.2],
  punch: [[40, 20, 30], 0.9], slap: [[35], 0.8], thwack: [[45], 0.9], smash: [[60, 30, 40], 1], splat: [[25], 0.5], stomp: [[40], 0.7], kill: [[80, 40, 120], 1],
  boing: [[20, 30, 20], 0.5], grow: [[20, 25, 20, 25, 50], 0.6], powerup: [[20, 30, 50], 0.6], powerdown: [[60], 0.5], zap: [[30, 20, 30], 0.7], rip: [[40], 0.6],
  coin: [[10, 20, 10], 0.3], jackpot: [[30, 40, 30, 40, 60], 0.8], ding: [[14], 0.25], fixed: [[20, 30, 20], 0.4], vote: [[18], 0.3], error: [[50, 50, 50], 0.5],
  alarm: [[100, 60, 100], 0.9], emergency: [[120, 60, 120], 1], tap: [[6], 0.12], toggle: [[8], 0.15], notify: [[12], 0.2], swipe: [[8], 0.15],
  // the game: a combo, growing a size, the meter, the lobby, your mic, a held drink, a ball off your head, winning
  combo: [[8], 0.2], stageup: [[30, 40, 30, 40, 80], 0.8], meterpop: [[10], 0.15], ready: [[15], 0.25], mic_on: [[8], 0.15], mic_off: [[8, 30, 8], 0.15],
  slosh: [[6], 0.1], bonk: [[30, 20, 15], 0.6], tackle: [[70, 30, 40], 1], victory: [[30, 40, 30, 40, 80], 0.8],
  // the imposter jobs: each one feels like what you're doing
  ratchet: [[8], 0.2], gas_hiss: [[30], 0.3], card_beep: [[10], 0.2], receipt: [[10, 20, 10, 20, 10], 0.25], plug_in: [[18], 0.35], coins: [[8, 15, 8], 0.2], reel_stop: [[16], 0.3],
  plunger: [[25], 0.4], flush: [[40, 30, 60], 0.4], loo_catch: [[12], 0.25], stamp: [[30], 0.5], keypad: [[6], 0.12], unlock: [[15, 30, 15], 0.3], breaker: [[35], 0.6], gas_tap: [[14], 0.3],
  coupler: [[30], 0.5], keg_roll: [[45], 0.6], pulley: [[6], 0.15], parasol: [[20, 30, 40], 0.4], cork: [[25], 0.5], shock: [[60, 30, 60, 30, 60], 0.9], lightswitch: [[12], 0.25], bulb_in: [[12], 0.25],
  flip: [[16], 0.3], cutlery: [[8], 0.15], match: [[14], 0.2], punch_clock: [[30], 0.5], pipe_turn: [[10], 0.2], net_scoop: [[12], 0.2], litter_bin: [[20], 0.35],
};
let on = true; try { on = localStorage.getItem('rs_haptics') !== '0'; } catch (e) {}
let vr = null, head = null, lastT = 0;
export const haptics = {
  get on() { return on; },
  set on(v) { on = !!v; try { localStorage.setItem('rs_haptics', on ? '1' : '0'); } catch (e) {} if (on) buzz([20], 0.4, true); },
  // (main.js: how to rumble the controllers, and where your head is)
  hook(pulse, headFn) { vr = pulse; head = headFn; },
};
function buzz(pat, strength, force) {
  if (!on && !force) return;
  const now = performance.now(); if (now - lastT < 50) return; lastT = now;      // (a burst of sounds is one buzz, not a rattle)
  try { if (vr && vr(strength, pat.reduce((a, b, i) => i % 2 ? a : a + b, 0))) return; } catch (e) {}
  try { if (navigator.vibrate) navigator.vibrate(pat); } catch (e) {}
}
// a sound just played: buzz if it's one of yours
export function hapticFor(name, pos) {
  const p = P[name]; if (!p || !on) return;
  if (pos && head) { const h = head(); if (h && Math.hypot(pos.x - h.x, pos.y - h.y, pos.z - h.z) > 1.4) return; }      // (someone else's, over there)
  buzz(p[0], p[1]);
}
export const HAPTIC_SOUNDS = Object.keys(P);
