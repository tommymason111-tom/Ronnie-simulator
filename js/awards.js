// END-OF-GAME AWARDS: what you got up to this game, counted as you play (main.js), and the three funniest awards that
// fit stamped onto the bottom of your receipt. Each player gets their own (in multiplayer too: the receipt's lines are
// the host's, the awards are yours). Every award needs you to have actually done the thing; nothing fits, you get the
// participation medal.
export const stats = {};
export function resetAwards() { for (const k in stats) delete stats[k]; stats.t0 = performance.now(); }
export function track(k, n = 1) { stats[k] = (stats[k] || 0) + n; }
export function trackMax(k, v) { if (!(stats[k] >= v)) stats[k] = v; }
resetAwards();

// [icon, title, joke, how notable (0 = doesn't apply, more = funnier to give)]
const AWARDS = [
  (s) => ['🌀', 'HOOVER OF THE YEAR', `${s.bites} bites. Dyson have been in touch.`, s.bites >= 15 ? s.bites / 15 : 0],
  (s) => ['🔥', 'COMBO KING', `A x${s.combo} combo. Didn't stop to breathe.`, s.combo >= 6 ? s.combo / 5 : 0],
  (s) => ['🧼', 'CLEAN SHEET', 'Not one vegetable. Your mum is so proud. Sort of.', !s.veg && s.bites >= 8 ? 1.1 : 0],
  (s) => ['🥦', 'SECRET VEGAN', `Ate ${s.veg} veg. Who ARE you?`, s.veg >= 3 ? s.veg / 2.5 : 0],
  (s) => ['🎯', "TOMMY'S NEMESIS", `Hit Tommy ${s.tommy} times. He still hasn't caught one.`, s.tommy >= 2 ? s.tommy / 1.5 : 0],
  (s) => ['💥', 'SNIPER', `${s.hits} direct hits on the squad. Lethal.`, s.hits >= 4 ? s.hits / 4 : 0],
  (s) => ['💪', 'ARM LIKE A TREBUCHET', `Threw ${s.throws} things. Some of it was even food.`, s.throws >= 10 ? s.throws / 10 : 0],
  (s) => ['🗑️', 'FOOD WASTER', `Threw ${s.throws} things, ate ${s.bites || 0} bites. Ronnie's heartbroken.`, s.throws >= 6 && s.throws > (s.bites || 0) * 1.5 ? 1.3 : 0],
  (s) => ['🍺', 'BAR FLY', `${s.drinks} drinks down. Aidan's impressed.`, s.drinks >= 4 ? s.drinks / 4 : 0],
  (s) => ['🤕', 'HUMAN PUNCHBAG', `Got hit ${s.ouch} times. Lewis says that's a warm-up.`, s.ouch >= 3 ? s.ouch / 3 : 0],
  (s) => ['📺', 'TV LICENCE REVOKED', `Smashed ${s.tvs} telly${s.tvs > 1 ? 's' : ''}. That's coming out of your wages.`, s.tvs >= 1 ? 1.2 + s.tvs * 0.3 : 0],
  (s) => ['💃', 'SHOWBOAT', `${s.emotes} emotes. Nobody asked.`, s.emotes >= 3 ? s.emotes / 3 : 0],
  (s) => ['⚡', 'POWER HUNGRY', `${s.powers} power-ups. Never played fair in your life.`, s.powers >= 2 ? s.powers / 2 : 0],
  (s) => ['🏃', 'ON A DIET?', `Walked ${Math.round(s.walk)} m. Basically a marathon.`, s.walk >= 250 ? s.walk / 250 : 0],
  (s) => ['🛋️', 'COUCH POTATO', `Moved ${Math.round(s.walk || 0)} m all game. Efficient.`, (s.secs || 0) >= 60 && (s.walk || 0) < 20 ? 1 : 0],
  (s) => ['🐘', 'ABSOLUTE UNIT', `Reached ${s.stageName || 'the top size'}. The floor's worried.`, s.stage >= 8 ? s.stage / 7 : 0],
  (s) => ['🐌', 'SLOW AND STEADY', `${(s.secs / Math.max(1, s.bites)).toFixed(0)} seconds a bite. Savouring it.`, s.secs >= 90 && s.bites >= 1 && s.secs / s.bites > 20 ? 0.9 : 0],
  (s) => ['💰', 'TIP MAGNET', `£${(s.tips || 0).toFixed(2)} in tips. Lewis has already "borrowed" some.`, s.tips >= 12 ? s.tips / 12 : 0],
  (s) => ['🍺', 'PULLS A PROPER PINT', `Served ${s.served} drinks. Aidan let every one settle.`, s.served >= 12 ? s.served / 12 : 0],
  (s) => ['🪪', 'ID PLEASE', `Spotted ${s.carded} kids after booze. Tyler's fuming.`, s.carded >= 2 ? s.carded / 1.5 : 0],
  (s) => ['🚨', 'SERVED A KID', 'Gave a child a pint. Their mum wants the manager.', s.kidbooze >= 1 ? 1.4 + s.kidbooze * 0.3 : 0],
  (s) => ['🥊', 'THE BOUNCER', `Broke up ${s.fights} fights. Nobody touches the Oysterfleet.`, s.fights >= 2 ? s.fights / 1.6 : 0],
  (s) => ['🥷', 'SMOOTH OPERATOR', `Snuck ${s.dnSneak} mouthfuls past Chloe. She suspects nothing. She suspects everything.`, s.dnSneak >= 10 ? s.dnSneak / 10 : 0],
  (s) => ['💔', 'IN THE DOGHOUSE', `Busted by Chloe ${s.dnBusted} times. Chester gets the bed tonight.`, s.dnBusted >= 2 ? 1 + s.dnBusted * 0.2 : 0],
  (s) => ['🚽', 'TOILET BREAK BANDIT', `Raided ${s.dnRaid} plates while Chloe was in the loo.`, s.dnRaid >= 3 ? s.dnRaid / 3 : 0],
  (s) => ['😶', 'BIG TALKER', `${s.chats} messages in the chat. Put the phone down and eat.`, s.chats >= 5 ? s.chats / 5 : 0],
];
const MEDAL = ['🥉', 'PARTICIPATION MEDAL', 'You turned up. That counts for something.', 0];

// the awards for the game just finished (3 at most, the most notable first)
export function pickAwards(extra = {}) {
  const s = { ...stats, ...extra }; s.secs = (performance.now() - (stats.t0 || performance.now())) / 1000;
  const got = AWARDS.map(f => { try { return f(s); } catch (e) { return null; } }).filter(a => a && a[3] > 0).sort((a, b) => b[3] - a[3]).slice(0, 3);
  return got.length ? got : [MEDAL];
}
export const AWARD_COUNT = AWARDS.length;
