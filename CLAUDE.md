# Ronnie Simulator: notes for Claude

A comedy eating game in plain HTML and JavaScript (three.js r170 and cannon-es from a CDN, no build step). It runs on the Meta Quest browser (WebXR), phones and computers. Read `README.md` for what's in the game.

## Branches (important)

- **Work on `claude/ronnie-webxr-quest-x7q4x5`** (the live game) unless told otherwise.
- **Mirror every change to `claude/mp-12-players`** (the 12-player multiplayer version). Cherry-pick each commit onto it.
  - These files differ on purpose on that branch, so on a conflict keep **its** version and redo just your change by hand: `index.html`, `js/menu.js`, `version.json`, `js/main.js`, `js/net.js`, `js/mpsync.js`, `server/*`.
  - `js/imposter.js` there also has host-migration code (`becomeHost`, `hostBack`). Never copy the whole file over: apply only your change.
  - Use a worktree for it, e.g. `git worktree add ../rs-mp claude/mp-12-players`.
- Commit and push everything. Don't open pull requests unless asked.

## Versions

Every update bumps the version.

- **Live branch:** `2.21.x`. **12-player branch:** `2.22.x`. They share the same last number, e.g. 2.21.18 and 2.22.18.
- **To bump:**
  1. Edit `GAME_VERSION` in `js/menu.js`.
  2. Run `python3 tools/stamp.py`. This writes `version.json` and the `?v=` cache-busters in `index.html`.

## Rules from the owner

- Don't lower visual quality to fix performance. Find a smarter fix.
- Never commit copyrighted songs or audio files. Music is added by players on their own devices (`js/music.js`). All sound effects are synthesised in `js/audio.js`.
- The squad characters are real friends of the owner. Keep the jokes in the style already in the game.
- **Developer mode:** settings cog → DEVELOPER MODE.
  - The code is `FATTY` (not case-sensitive). A wrong code locks it on that device (`localStorage rs_dev_locked`).
  - It's free roam with no random attacks. The dev panel (`js/devmode.js`) triggers emotes, attacks, Imposter jobs, cameras and power-ups.
  - It has a map picker, including a blank test grid (`js/levels/grid.js`).
- The 12-player server (`server/worker.js`, Cloudflare) must be deployed by the owner. You can't deploy it.

## Where things are

- `js/main.js`: game loop, HUD, modes wiring. The `window.RS` debug object (`RS.sim(dt)`, `RS.player`, `RS.room`, `RS.scene`, `RS.renderer`, `RS.powerups`) is used by tests.
- `js/levels/pub.js`: the Oysterfleet pub (kitchen, bar, conservatory, garden).
- `js/levels/oysterRestaurant.js`: the restaurant.
- `js/levels/carpark.js`: the car park out the front.
- `js/imposter.js`: Imposter mode (Among Us style). It has the `TASKS` list (id, room, `at` spot, `kit` model position, game `kind`), the job station models (`station()`), the map, the security cameras (`CAMS`, `makeCamFeeds`), sabotages and vents.
- `js/impgames.js`: one mini-game per job kind (`GAMES`), detailed canvas art (`ART`), and the `Panel` that shows them on phone or in VR. A game is `{ title, down, move, up, update, draw, done }` on a 512×512 canvas. A screen can set `quit = true` to close itself, or `bigClose` for a labelled close button.
- `js/squad.js`, `js/tommy.js`, `js/character.js`, `js/emotes.js`, `js/modes.js`: characters, attacks and emotes.
- `js/powerups.js`, `js/runpub.js`, `js/pubjobs.js`: power-ups and the Run the Pub mode.
- `.claude/skills/watch`: the `/watch` skill (watch a video from a link). It needs `yt-dlp` (`pip install yt-dlp`) in each new session.

## Testing

There's no test suite. Test in headless Chromium with Playwright, which is pre-installed: `require('playwright')`.

- **Launch** with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`.
- **Serve the files locally.** Route `three@0.170.0` and `cannon-es@0.20.0` CDN requests to local copies; `npm pack three@0.170.0 cannon-es@0.20.0` gets them. Serve the repo itself, too.
- **Load straight into a place and mode** with `index.html?go=1&place=pub&mode=roam`, then wait for `document.body.classList.contains('ready')`. Click `#play-flat`.
- **Skip the dev code** by setting `sessionStorage.rs_dev = '1'` before load.
- **Step time** by calling `RS.renderer.setAnimationLoop(null)` and then `RS.sim(1/30)` yourself. Screenshot with your own cameras.
- **Imposter jobs:** drive each game from `makeGame(kind, o)` with a small bot on a fake clock, and check every job can be finished. Also check every dev-panel job opens.
- **Phones:** use a 390×844 viewport with touch. Check that text isn't cut off and the layout fits.
- Before pushing, run `node --check` on the files you changed. Look for page errors in the console.
