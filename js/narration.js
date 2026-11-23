// THE NARRATOR'S LINES (narrator.js speaks them in the game's own voice: a premade ElevenLabs voice, Brian, made by
// tools/voices.py from tools/voice_lines/narrator.json, which tools/narrator_lines.mjs writes). Pure data and pure
// functions, no imports, so the tools can read it too.
//   - STAGE DIRECTIONS: a line like "The salad. Please. *a single tear*" is split: the character says "The salad.
//     Please." and the narrator says "A single tear fell." (DIRECTIONS turns each *direction* into a narrated
//     sentence: past tense, third person). splitLine() does the split for everyone (character.js, datenight.js).
//   - NARRATION: the game's own moments (GET READY, a mode starting, a Boss Fight phase, an Imposter meeting, a round
//     starting, the end of a game), a few dry asides after the squad's attacks and in Date Night, and anything the game
//     puts up as a banner or attack card that has a clip (narrator.js works that out; text made from a player's name has
//     no clip, so it's left silent).

// every *direction* in a voiced line, as the narrator says it (keys: the direction as written, lower case)
export const DIRECTIONS = {
  'taps nose at the waiter': 'Ronnie tapped his nose at the waiter.',
  'writes something on his pad and taps it': 'The waiter wrote something on his pad. And tapped it.',
  'wink': 'A wink.',
  'slides three glasses about': 'Three glasses slid about the table.',
  'one hand drifts towards the bread': 'One hand drifted, slowly, towards the bread.',
  'a single tear': 'A single tear fell.',
  'winks so hard his face moves': 'He winked so hard his whole face moved.',
  'taps nose': 'The waiter tapped his nose.',
  'card declined': 'Card declined.',
  'empties his pockets: eleven bread rolls and a butter': 'He emptied his pockets. Eleven bread rolls. And a butter.',
  'knocks over a vase': 'A vase went over.',
  'torch': 'A torch clicked on.',
  'closes her eyes': 'She closed her eyes.',
  'swirl': 'She swirled the glass.',
  'swallows': 'He swallowed. Hard.',
  'lifts the water': 'Up went the water.',
};
// a line split into what's said and what's narrated, in order: [{ say: 'text' } | { dir: 'sentence' }]. A direction
// repeated in a row is narrated once ("*swirl* *swirl* *swirl*": she swirled it, once, beautifully)
export function splitLine(text) {
  const out = [], s = String(text || ''), re = /\*([^*]+)\*/g; let i = 0, m;
  while ((m = re.exec(s))) {
    const before = s.slice(i, m.index).replace(/\s+/g, ' ').trim(); if (before && /[A-Za-z0-9]/.test(before)) out.push({ say: before });
    const raw = m[1].trim(), key = raw.toLowerCase(), sent = DIRECTIONS[key] || (raw.charAt(0).toUpperCase() + raw.slice(1).replace(/[.!?]*$/, '.'));
    const last = out[out.length - 1]; if (!(last && last.dir === sent)) out.push({ dir: sent }); i = m.index + m[0].length;
  }
  const rest = s.slice(i).replace(/\s+/g, ' ').trim(); if (rest && /[A-Za-z0-9]/.test(rest)) out.push({ say: rest });
  return out;
}
// what the character says (the directions left out) and what the narrator says (all of them, in order); first: which
// goes first (a line that opens with its direction has the narrator first)
export function lineParts(text) {
  const p = splitLine(text), say = p.filter(x => x.say).map(x => x.say).join(' ').replace(/\s+([,!?]|\.(?!\.))/g, '$1').replace(/^[.,\s]+/, '').trim();
  const dir = p.filter(x => x.dir).map(x => x.dir).join(' ');
  return { say, dir, narratorFirst: !!(p.length && p[0].dir), has: /\*[^*]+\*/.test(String(text || '')) };
}

// a banner's two lines as one sentence: "YOU ARE" + "THE IMPOSTER" runs on; "WAVE 2" + "TWO AT ONCE" gets a full stop
// (each part already tidied: its own full stop dropped, a ! or ? kept)
export function joinBanner(a, b) { return a + (/[!?]$/.test(a) ? ' ' : /\b(ARE|BY|IS|NOW|WAS|YOU'RE)$/i.test(a) ? ' ' : '. ') + b; }
// the narrator's own lines for the game's moments (narrator.js)
export const NARRATION = {
  'ready': ['Get ready.'],
  'gameover': ['And that\'s the game.', 'The final whistle. Somebody fetch the receipt.'],
  'boss.phase.2': ['Phase two. He\'s angry now.'],
  'boss.phase.3': ['Phase three. This is it.'],
  'imposter.meeting': ['Emergency meeting. Everybody to the table.'],
  'imposter.ejected': ['The vote is in.'],
  'prophunt.hide': ['Hiders, hide. Seekers, count.'],
  'prophunt.seek': ['Ready or not. Here they come.'],
  'snd.buy': ['Buy time. Spend that dinner money.'],
  'snd.go': ['Go, go, go.'],
  'snd.planted': ['The vindaloo has been planted.'],
  'snd.defused': ['The vindaloo has been defused.'],
  // a few dry asides, after the squad's attacks land (not every time)
  'attack.trip': ['Tommy had been saving that ball for years.'],
  'attack.tackle': ['Noah apologised. He did not mean it.'],
  'attack.beer': ['It was not, in fact, just the one.'],
  'attack.dating': ['Harry\'s dating history went on. And on.'],
  'attack.pepsi': ['It was not even full fat.'],
  'attack.turkey': ['Ronnie\'s hairline would never be the same.'],
  'attack.oasis': ['Somewhere, Noel Gallagher felt a chill.'],
  'attack.knee': ['The knee story had a sequel.'],
  // Date Night: now and then, as he gets away with it
  'date.sneak': ['Nobody saw. Probably.', 'Chloe suspected nothing. Yet.'],
  'date.caught': ['She saw. Of course she saw.'],
};
