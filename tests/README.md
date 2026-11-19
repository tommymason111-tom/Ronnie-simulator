# Tests

Crash and regression tests for Ronnie Simulator. GitHub Actions runs them on every push.

    cd tests
    npm ci                                  # once (three.js, cannon-es, Playwright, ws, ESLint)
    npx playwright install chromium         # once, if Chromium isn't already installed
    node run.mjs                            # everything
    node run.mjs places mp                  # just these files

| file | what it checks |
|---|---|
| `lint.test.mjs` | every game file parses; ESLint's crash rules (names that don't exist, assigning to constants, duplicate keys, impossible comparisons...) |
| `server.test.mjs` | `server/worker.js` in Node: crash reports in and out (grouped, spam slowed, page locked), and thousands of hostile messages: the server never throws and the other players carry on |
| `vr.test.mjs` | a VR player's arm stays on their body at 60/72/90/120 fps; VR menu taps only land on what's drawn on the menu; a 0x0 menu page doesn't break it |
| `arms.test.mjs` | other players' arms as drawn, on a fake clock, through a near-perfect and a bad network at 72 and 30 fps: a headset waving, circling, punching, holding still, walking; a phone walking, turning, eating. No flailing, no leaps, no jitter, a wave comes through at its real size; a late pose after a hitch doesn't throw the body across the room; 4G hiccups (`delay/jitter/sN`), stop-and-go and running players; lag no more than the connection's own plus ~0.1s |
| `vrroom.test.mjs` | two emulated Quest headsets (one on hand tracking) and two phones in one room through the real menus and room server, each on its own pretend network: everyone sees everyone's arms and fingers follow them with no flailing or jitter, and how far behind each is drawn (`PLAYERS` e.g. `Q,P,P,P,P,P,P,P` for a headset and seven phones; `BOTS=8` fills the room to 12 with light players from `lib/bots.mjs`, since twelve real games don't fit in a test machine's memory; `SECS`, `MOTIONS`, `NETS`) |
| `ghosts.test.mjs` | Imposter with five real games: the dead are ghosts who float through walls, ghosts see each other as see-through copies, the living see no ghosts at all, and dying builds no new shader (no stutter) |
| `sounds.test.mjs` | every sound the game plays exists in `js/audio.js`; every sound renders (offline, through the speakers' compressor) not silent, not clipping, not too long, and plays live; no two sounds sound alike (spectrum, loudness over time and a coarse spectrogram, against three plays of each); one sound per kind of action (a sound used in different places must be a UI sound or listed in `RELATED` with why); the developer mode sound board lists and plays them all on a phone. Prints how many places use each sound (`SHOW=1` for all, `DEBUG=1` for loudness and near pairs) |
| `feel.test.mjs` | the buzz (your own actions only, each its own pattern, off is off, eating buzzes) and the sound mix (every slider really changes its sound, kept on the device; the panel fits a phone) |
| `netfuzz.test.mjs` | a game in a room receives every message type with nonsense in every field: no throw, nothing at an impossible position |
| `talk.test.mjs` | the squad only chats near a player (two at a time at most), a far-away line from the host isn't shown on your game, voices fade to silence with distance |
| `cutscene.test.mjs` | Ben's Turkey cut scene plays for 12s; on your own nothing moves, talks or is heard behind it and the clock waits; in a room the world carries on |
| `perf.test.mjs` | each place's draw calls stay under budget; food glow is one draw; signs are packed; no physics pair where nothing can move; animated characters' joints are out of the physics world; furniture push-out and path finding give exactly the old answers; every belly look is made before it's needed |
| `session.test.mjs` | game after game in the same place: food doesn't pile up (the sweep added ~100 each time), the pub's food is back straight after Run the Pub, nothing is left behind in the world |
| `mp.test.mjs` | two real games (a computer and a phone) through the real room server: join through the menus, the whole squad, grabs and throws, punch, chat, emote, game change, a dropped line coming back. Not one real message may be thrown away by the message checks |
| `places.test.mjs` | every place and solo mode loads and runs 20s with no errors or crash reports; the crash reporter catches errors and a lost 3D context; the game comes back after the context does |
| `physics.test.mjs` | things behave like what they are: fruit bounces higher and rolls further than a burger, a burger squashes and gets its shape back, things tip over to rest, heavy things don't throw as far, throws tumble, a punch shakes the view and settles, the setting turns it off |
| `eatmeter.test.mjs` | quick bites build a combo (best kept, gone after a pause), every bite punches the meter and it settles back, the bar slides, growing a size flashes it, no shader built |
| `loading.test.mjs` | a real load ticks off THE SQUAD, THE PLACE, THE FOOD, GO and goes away; the screen wears the place and mode; the tip changes; animations only move things; fits phone, landscape phone and computer |
| `awards.test.mjs` | a game's awards: earned ones only (never one you didn't do), stamped on one by one, a do-nothing game gets the participation medal, the next game counts from zero |
| `tipjar.test.mjs` | Run the Pub's three nights (their own modes, patience drops, tips grow), tips drop into the jar as coins, Lewis nicks some unless you're by it, the shift report fits |
| `nametags.test.mjs` | another player's tag: face, name, host crown, size pips, connection bars that drop when poses stop, green while talking, bigger far away and faded a long way off, redrawn only on change |
| `lobby.test.mjs` | three players through the real room server: the invite link lands you in the room, ready ticks both ways, the host's room options reach everyone (a guest's can't), lobby chat, only the host can kick, a locked room turns people away, a game runs SHORT and with no attacks |
| `voice.test.mjs` | voice chat with a pretend microphone: off by default, the squad goes quiet, a full mesh connects, sound arrives, round trip and hold-back (checked on a calm machine), never your own voice back, mute, on/off five times, and in a real game the talking player's tag and row light up |
| `replay.test.mjs` | Imposter's best-moment replay: recording everyone, picking the double kill, stand-ins playing it back with the kill on time, its own camera, SKIP, nothing left behind |
| `leaderboard.test.mjs` | the leaderboard server (bests only, in order, nonsense turned away, floods slowed, Elo ratings, a match counted once), a solo score's rank on the receipt, the 🏆 screen online and offline, and a real two-game ranked eat-off |
| `boss.test.mjs` | Boss Fight on a fake clock: a bot fights to victory in the garden and the car park (every phase, every move, knockdowns, health only drops on hits, receipt), a bot that stands still loses, every boss builds, a thrown food knocks out a minion, tap-to-throw on a phone, no shader built mid-fight; then two real games in a room: same boss health on both, the joiner's hits count (`BOSS_ONLY=solo,defeat,phone,mp`) |
| `weather.test.mjs` | every weather at dawn, midday, sunset and night in every place: no errors, no shader built while it changes, draw calls within budget, rain follows the camera and falls only outdoors, dark nights / lit rooms, muffled indoors, Imposter's fog left alone; two real games: the host's weather and time reach the guest (`PLACES`, `NOMP=1`) |
| `chaos.test.mjs` | a seeded bot mashes everything in every place (`SEEDS`, `STEPS`, `PLACES`, `SEED0` to go harder or replay a seed) |

A test returns a list of what went wrong (empty = passed). Helpers are in `lib/`: `game.mjs` (a browser running the game from this repo, crash reports caught), `durable.mjs` (a stand-in for Cloudflare's Durable Objects), `roomhost.mjs` (the real room server over real WebSockets).
