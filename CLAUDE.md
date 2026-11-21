# Ronnie Simulator: notes for Claude

A comedy eating game in plain HTML and JavaScript (three.js r170 and cannon-es from a CDN, no build step). It runs on the Meta Quest browser (WebXR), phones and computers. Read `README.md` for what's in the game.

## Branch

- **Work on `claude/ronnie-webxr-quest-x7q4x5`** (the live game). It's the 12-player version: the old 6-player game and the separate `claude/mp-12-players` branch were merged into it at 2.23.0. Don't mirror changes anywhere any more.
- Commit and push everything. Don't open pull requests unless asked.

## Versions

Every update bumps the version (`2.23.x` from the merge on).

- **To bump:**
  1. Edit `GAME_VERSION` in `js/menu.js` (and add a line to the update notes under it).
  2. Run `python3 tools/stamp.py`. This writes `version.json` and the `?v=` cache-busters in `index.html`.
- Every page load checks `version.json` and reloads itself into a newer version, so players are moved onto it as soon as they open the game.

## Rules from the owner

- Don't lower visual quality to fix performance. Find a smarter fix.
- Never commit copyrighted songs or audio files. Music is added by players on their own devices (`js/music.js`). All sound effects are synthesised in `js/audio.js`.
- The squad characters are real friends of the owner. Keep the jokes in the style already in the game.
- **Developer mode:** settings cog → DEVELOPER MODE.
  - The code is `FATTY` (not case-sensitive). A wrong code locks it on that device (`localStorage rs_dev_locked`).
  - It's free roam with no random attacks. The dev panel (`js/devmode.js`) triggers emotes, attacks, Imposter jobs, cameras and power-ups.
  - It has a map picker, including a blank test grid (`js/levels/grid.js`).
  - Its 👥 MULTIPLAYER page opens a test room (`?devmp=N`, allowed by `sessionStorage rs_devmp_ok`): you host a real room and N fake players (1 to 11, `js/fakeplayers.js`) join it. They ready up, walk the map on real paths and play along (Prop Hunt, Imposter, Boss Fight, the ready card). They come back after each game (`sessionStorage rs_fakes`); the lobby's green bar adds or removes them. `tests/fakeplayers.test.mjs` (`FAKES=`).
- **Server (Cloudflare Worker):** `ronnie-mp12.ronnie-sim.workers.dev` (12 players a room, saved player IDs, host handover, grab ownership). `server/worker.js` is its code (deploy steps in `server/README.md`). The old 6-player `ronnie-mp` server isn't used by the game any more. Ask the owner before deploying a server. Test a relay from a browser (Playwright): Node's own WebSocket skips the session's proxy.
- **Real voices (ElevenLabs):** `js/voices.js`. Characters in `VOICED` speak their lines from pre-made clips (`assets/voices/<char>/<hash>.mp3`, made with `python3 tools/voices.py <char> "<ElevenLabs voice name>"` from `tools/voice_lines/<char>.json`). Typed chat and lines without a clip go to the server's `/tts`, which needs the Worker secret `ELEVENLABS_KEY` (added by the owner) and the voice id in `VOICES` in `server/worker.js`.

## Where things are

- `js/main.js`: game loop, HUD, modes wiring. The `window.RS` debug object (`RS.sim(dt)`, `RS.player`, `RS.room`, `RS.scene`, `RS.renderer`, `RS.powerups`) is used by tests.
- `js/levels/pub.js`: the Oysterfleet pub (kitchen, bar, conservatory, garden).
- `js/levels/oysterRestaurant.js`: the restaurant.
- `js/levels/carpark.js`: the car park out the front.
- `js/imposter.js`: Imposter mode (Among Us style). It has the `TASKS` list (id, room, `at` spot, `kit` model position, game `kind`), the job station models (`station()`), the map, the security cameras (`CAMS`, `makeCamFeeds`), sabotages and vents.
- `js/impgames.js`: one mini-game per job kind (`GAMES`), detailed canvas art (`ART`), and the `Panel` that shows them on phone or in VR. A game is `{ title, down, move, up, update, draw, done }` on a 512×512 canvas. A screen can set `quit = true` to close itself, or `bigClose` for a labelled close button.
- `js/squad.js`, `js/tommy.js`, `js/character.js`, `js/emotes.js`, `js/modes.js`: characters, attacks and emotes.
- `js/powerups.js`, `js/runpub.js`, `js/pubjobs.js`: power-ups and the Run the Pub mode.
- `js/perf.js`: drawing and per-frame speed-ups that keep the picture identical (material groups merged, signs packed onto shared sheets, `SpriteLayer` for many sprites in one draw, `nearBlockers` for furniture checks). Physics only tests pairs where something can move (`js/physics.js`), and ragdoll joints leave the physics world while a character is animated (`js/ragdoll.js` `syncJoints`). Slow first-time builds (belly looks, food shapes) are made in quiet moments (`main.js`). A sign whose picture is redrawn later must be marked `userData.live` (or it's packed). `tests/perf.test.mjs` holds the draw-call budgets.
- `js/awards.js`: the end-of-game awards (stats counted during play with `track`, three picked for the receipt). `js/tipjar.js`: Run the Pub's tip jar and its three nights (`RP_DIFF`; modes `runpub1` / `runpub` / `runpub3`).
- `js/roomopts.js`: the host's room options (game length, attacks, power-ups, food, punching, max players), sent as `ropts`; `roomNum(k)` is the normal value outside a room. The lobby (ready, chat, kick, lock, invite links `?join=CODE`) is in `js/menu.js`.
- **Per-mode screen:** `updateTouchUI()` in main.js sets `body.ui-noeat` / `ui-nothrow` / `ui-throwbig` (which touch buttons a mode needs). `hudExtras()` in main.js gives the top-left box its mode bits: `chips` under the eat meter, or a `box` of its own (Sweep, Boss Fight), drawn by `drawChips` / `drawStatBox` in player.js (`RS.hudExtras()`). `tests/modeui.test.mjs`.
- **Popups:** one look and their in/out animations live in the POPUPS block at the end of index.html's styles (`html body` selectors, so they win over the modes' own styles). Out animations use `@starting-style` and `display ... allow-discrete`: a popup shown and hidden by a class or `hidden` gets them by adding its selectors there.
- `js/readycheck.js`: in a room, a new game waits for everyone to ready up: the lobby's START is locked until every guest is READY (`goGate` in menu.js), and in play the host's GAME MODE / RESTART / PLAY AGAIN (`hostNewGame` in main.js) opens a READY card for everyone (`rcheck`/`rready`/`rstat`/`rdone`). `js/fasttap.js`: phone taps click on finger-up. The in-game screen edges are laid out by `layout()` in main.js (left column under the Eat Meter, right column under PAUSE, banners below both).
- `js/voicechat.js`: voice chat (off by default; WebRTC mesh, signalled through the room as `vc`/`rtc` messages with a session tag per time it's turned on). While anyone's on it the NPC voices are muted (`setNpcMute` in audio.js). Test pages for it are served as `https://game.local` (the microphone needs a secure page).
- `js/leaderboard.js`: online leaderboards and ranked eat-off ratings (mode `chonkoffr`), on the room server's `/lb` and `/rank` (`leaderboard()` in `server/worker.js`; deployed 2.26.0 with the owner's OK. Offline, the boards say "not switched on yet"). `js/impreplay.js`: Imposter's end-of-game best-moment replay.
- `js/boss.js`: Boss Fight mode (`boss`, the pub's car park and Lewis's garden): a giant squad member with three phases and telegraphed moves, fought with thrown food, solo or co-op. The host runs the boss (`bossS`/`bossA`), joiners send hits (`bossHit`) and hearts (`bossP`). `?boss=<id>` picks one. `tests/boss.test.mjs` (`BOSS_ONLY=solo,defeat,phone,mp`).
- `js/weather.js`: weather (12 kinds plus AUTO) and the time of day (DAY CYCLE or fixed times), in the pause menu's WEATHER & TIME; the host's choice is sent as `wx`. Every lit surface gets it through a one-off patch of three.js's shared fog code (no new shaders); each level gives `room.indoors(x, z)`, `room.skyRefs` and `room.kitLights` so roofs stay dry and lamps light the ground. `?wx=rain&tod=0.9` picks one. `tests/weather.test.mjs` (`PLACES=`, `NOMP=1`).
- `js/prophunt.js`: Prop Hunt (`prophunt`, multiplayer, the pub / Lidl / Lewis's): the host deals rounds of seekers and hiders, hiders turn into the map's own things, seekers shoot with a toy gun (hiders have 100 health, 25 a hit, a speed burst when hit and healing after 6s; shots are sent as `phShot`, hits as `phHit`, healing as `phHp`) (`ph*` messages); a hidden player's avatar is `impHidden` (the same flag as Imposter). `tests/prophunt.test.mjs` (`PLACES`, `PLAYERS`).
- `js/shaderwarm.js`: every shader is built while the level loads (`compileAsync` on the scene plus tiny stand-ins for each material kind in `SIGS`, and kinds a device met before, from localStorage). Their materials are kept so programs are never thrown away. A new kind of material used mid-game should get a `SIGS` entry (`tests/perf.test.mjs` fails if play builds a shader).
- `.claude/skills/watch`: the `/watch` skill (watch a video from a link). It needs `yt-dlp` (`pip install yt-dlp`) in each new session.

## Testing

**The test suite is in `tests/`** (see `tests/README.md`), and GitHub Actions runs it on every push (`.github/workflows/tests.yml`). Run it before pushing: `cd tests && npm ci && node run.mjs` (or one file: `node run.mjs places`). It covers static checks, the room server under attack, VR regressions, hostile multiplayer messages, two real games playing together, every place and mode, and a seeded chaos bot. A crash you fix gets a test that fails without the fix.

**Crash reports** from players' devices: `js/crash.js` (loaded first) sends them to the server's `/crash`; read them at `https://ronnie-mp12.ronnie-sim.workers.dev/crashes?k=<CRASH_KEY>` (a Worker secret the owner sets). Check them before guessing at a crash.

For anything else, test in headless Chromium with Playwright, which is pre-installed: `require('playwright')`.

- **Launch** with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`.
- **Serve the files locally.** Route `three@0.170.0` and `cannon-es@0.20.0` CDN requests to local copies; `npm pack three@0.170.0 cannon-es@0.20.0` gets them. Serve the repo itself, too.
- **Load straight into a place and mode** with `index.html?go=1&place=pub&mode=roam`, then wait for `document.body.classList.contains('ready')`. Click `#play-flat`.
- **Skip the dev code** by setting `sessionStorage.rs_dev = '1'` before load.
- **Step time** by calling `RS.renderer.setAnimationLoop(null)` and then `RS.sim(1/30)` yourself. Screenshot with your own cameras.
- **Imposter jobs:** drive each game from `makeGame(kind, o)` with a small bot on a fake clock, and check every job can be finished. Also check every dev-panel job opens.
- **Phones:** use a 390×844 viewport with touch. Check that text isn't cut off and the layout fits.
- Before pushing, run `node --check` on the files you changed. Look for page errors in the console.
