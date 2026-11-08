# RONNIE SIMULATOR — WebXR (Phase 1)

A VR comedy eating game that runs in the **Meta Quest 3 browser**. It's plain HTML and JavaScript, with [three.js](https://threejs.org) loaded from a CDN. There's no build step and nothing to install, so it can be hosted for free on GitHub Pages.

The design doc is `Ronnie simulator prompt.md`. It was written for Unity; this repo builds the WebXR version, starting with Phase 1.

## Phase 1: what's in it

- **Ronnie's bedroom** (5m × 4.5m, design doc §39.1). It has a bed with the "RONNIE CRATER", a desk with a gaming chair ("MAX LOAD: NOT YOU"), a wardrobe with drawers from S to PARACHUTE, a bookshelf (*War and Pies*, *50 Shades of Gravy*…), MONSTOR cans all over the floor, a pizza rug, posters, a calendar and a clock. Warm morning sun comes through the blinds, with dust in the sunbeams.
- **WebXR.** There's an ENTER VR button, and it works with both Quest controllers and hand tracking.
- **Grab, throw and eat.** Grab with the grip or trigger (or pinch with your hands). Bring food to your mouth to take a bite: you get a CHOMP sound, a crumb burst, a comic word and a controller buzz. You can throw anything.
- **Foods:** burger (3 bites), pizza slice (2), doughnut (2), and a **MONSTOR Mango Loco** can. Bring the can to your mouth and tip it back past 60°: PSSHT, glug glug, then **MANGO LOCO MODE**. For 10 seconds everything is worth ×3 Chonk, the world goes warm orange and a mariachi tune plays.
- **Chonk Meter on your left wrist.** Ronnie grows through 6 stages (Little Ronnie → Snacky → Chunky → Big → Very Big → **Ronnie XL**). Each stage-up plays a BWOOMP, makes you physically bigger (the room shrinks around you), grows your belly (look down) and gets a stage line from Tommy. The wrist also shows the FPS.
- **Tommy:** 168cm, white T-shirt, curtains, beard, six-pack and a personal spotlight. He greets you, roasts you, reacts to what you eat and drink, and wanders around the room. Throw food at him and he goes BOING, falls over, sees stars, gets up and says *"I'm just trying to help!"*
- **Veggie attack:** every ~20s Tommy winds up and lobs a broccoli at your face. You have three options:
  - **Swat it** with a fast hand swing (THWACK).
  - **Block it** with your hand or with food.
  - **Catch it** and throw it back ("RETURN TO SENDER!").
  If it gets in your mouth you lose 15 Chonk, the screen goes green, and Tommy says "We had him. We HAD him!"
- **All sounds are synthesised in code,** so there are no audio files to download.

## Controls (in VR)

| Action | Controllers | Hands |
|---|---|---|
| Grab / hold | Grip or trigger | Pinch |
| Eat | Bring food to your mouth | Same |
| Drink MONSTOR | Can to mouth, then tip it back | Same |
| Throw | Let go mid-swing | Un-pinch mid-swing |
| Swat broccoli | Fast swing through it | Same |
| Move | Left stick | Walk around for real |
| Turn | Right stick (30° snap) | Turn your body |
| Chonk Meter | Look at your left wrist | Same |

**No headset?** The page also works as a flat preview on iPad or desktop. Drag to look around, tap food to eat it, and tap incoming broccoli to swat it.

## Turn on GitHub Pages

1. Make sure the code is on the branch you'll publish (for example, merge it into `main`).
2. On GitHub, open the repo → **Settings** → **Pages** (in the left sidebar under "Code and automation").
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Under **Branch**, pick the branch (e.g. `main`) and the folder **`/ (root)`**, then press **Save**.
5. Wait about a minute and refresh the page. A box appears saying *"Your site is live at…"*. The address will be `https://<your-username>.github.io/<repo-name>/`.

## Play on the Quest 3

1. Put the headset on and open the **Browser** app.
2. Type in the Pages address. Bookmark it so you only type it once.
3. Wait for **ENTER VR** to turn green, then press it. Allow hand tracking if it asks.
4. Look left: Tommy is leaning in the doorway. The snack station is in front of you.

## Files

```
index.html        page, Enter VR button, import map (three.js r170 from jsDelivr)
js/main.js        game loop: eating, drinking, Chonk, stages, LOCO mode, broccoli, hits
js/config.js      all the tuning numbers (stages, food Chonk, timings)
js/player.js      XR rig, controllers + hand tracking, grab/throw, movement, wrist meter, belly
js/tommy.js       Tommy: model, speech bubbles, wandering, knock-down, broccoli throw
js/dialogue.js    Tommy's line banks (from §3 of the design doc)
js/room.js        the bedroom, furniture, joke signs, lighting
js/foods.js       food meshes + the small physics engine
js/fx.js          crumbs, comic words, screen tint
js/audio.js       synthesised sound effects + LOCO music
js/textures.js    canvas-drawn posters, labels, the Mango Loco can
```

## Performance (target: steady 72fps on Quest 3)

- All plain-coloured furniture is merged into one mesh, and the floor cans are a single instanced mesh. That's about 50 draw calls and 15k triangles per eye.
- There are no real-time shadows. The sun stripes and Tommy's shadow are cheap fake decals.
- Lighting is cheap Lambert shading with 3 lights (sky, sun, Tommy's spotlight).
- Text and textures are drawn once at load. The wrist and speech bubbles only redraw when something changes.
- Nothing allocates memory inside the frame loop, so there are no garbage-collection hitches.
- Fixed foveated rendering is on.

## Known issues / not yet

- **Not yet tested on a real Quest 3.** It was tested in Meta's WebXR emulator (IWER) with emulated Quest 3 controllers and hands, and as a flat page on emulated iPad and desktop. Check the FPS number on your wrist the first time you play.
- The hand and controller 3D models load from the jsDelivr CDN, so the Quest needs internet.
- Tommy "speaks" with text bubbles and a little babble sound, not a real voice yet.
- Tommy's knock-over is an animation, not a full ragdoll.
- Food doesn't bump into other food.
- The mirror isn't reflective, because real mirrors double the rendering cost.
- Chonk thresholds are lower than the design doc so you reach Ronnie XL quickly. Change `STAGES` in `js/config.js` to use the doc's 0/100/250/450/700/1000.
