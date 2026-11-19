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
| `feel.test.mjs` | the buzz (your own actions only, each its own pattern, off is off, eating buzzes) and the sound mix (every slider really changes its sound, kept on the device; the panel fits a phone) |
| `netfuzz.test.mjs` | a game in a room receives every message type with nonsense in every field: no throw, nothing at an impossible position |
| `talk.test.mjs` | the squad only chats near a player (two at a time at most), a far-away line from the host isn't shown on your game, voices fade to silence with distance |
| `cutscene.test.mjs` | Ben's Turkey cut scene plays for 12s; on your own nothing moves, talks or is heard behind it and the clock waits; in a room the world carries on |
| `perf.test.mjs` | each place's draw calls stay under budget; food glow is one draw; signs are packed; no physics pair where nothing can move; animated characters' joints are out of the physics world; furniture push-out and path finding give exactly the old answers; every belly look is made before it's needed |
| `session.test.mjs` | game after game in the same place: food doesn't pile up (the sweep added ~100 each time), the pub's food is back straight after Run the Pub, nothing is left behind in the world |
| `mp.test.mjs` | two real games (a computer and a phone) through the real room server: join through the menus, the whole squad, grabs and throws, punch, chat, emote, game change, a dropped line coming back. Not one real message may be thrown away by the message checks |
| `places.test.mjs` | every place and solo mode loads and runs 20s with no errors or crash reports; the crash reporter catches errors and a lost 3D context; the game comes back after the context does |
| `chaos.test.mjs` | a seeded bot mashes everything in every place (`SEEDS`, `STEPS`, `PLACES`, `SEED0` to go harder or replay a seed) |

A test returns a list of what went wrong (empty = passed). Helpers are in `lib/`: `game.mjs` (a browser running the game from this repo, crash reports caught), `durable.mjs` (a stand-in for Cloudflare's Durable Objects), `roomhost.mjs` (the real room server over real WebSockets).
