# RONNIE SIMULATOR — WebXR (Phase 1)

A VR comedy eating game that runs in the **Meta Quest 3 browser**, and also plays on **phones, tablets and computers** with on-screen controls. It's plain HTML and JavaScript, with [three.js](https://threejs.org) and [cannon-es](https://github.com/pmndrs/cannon-es) (physics) loaded from a CDN. There's no build step and nothing to install, so it can be hosted for free on GitHub Pages.

The design doc is `Ronnie simulator prompt.md`. It was written for Unity; this repo builds the WebXR version, starting with Phase 1.

## Phase 1: what's in it

- **Ronnie's bedroom** (5m × 4.5m, design doc §39.1). It has a bed with the "RONNIE CRATER", a desk with a gaming chair ("MAX LOAD: NOT YOU"), a wardrobe with drawers from S to PARACHUTE, a bookshelf (*War and Pies*, *50 Shades of Gravy*…), MONSTOR cans all over the floor, a pizza rug, posters, a calendar and a clock. Warm morning sun comes through the blinds, with dust in the sunbeams.
- **WebXR.** There's an ENTER VR button, and it works with both Quest controllers and hand tracking.
- **Hands, not controllers.** With controllers you see a hand wrapped around each one. The index finger curls as you squeeze the trigger, the other fingers curl with the grip, and the thumb drops when it touches a button. With hand tracking you see your own fingers moving.
- **Play on a phone or tablet.** Press **PLAY ON THIS SCREEN**. There's a joystick to walk, you drag to look, tap food to pick it up, and use the EAT/DRINK and THROW buttons. Tap broccoli to swat it and tap Tommy to slap him. A first-person hand holds your food. On a computer, use WASD, E and Space.
- **Grab, throw and eat.** Grab with the grip or trigger (or pinch with your hands). Bring food to your mouth to take a bite: you get a CHOMP sound, a crumb burst, a comic word and a controller buzz. You can throw anything.
- **Foods:** burger (3 bites), pizza slice (2), doughnut (2), and a **MONSTOR Mango Loco** can. Bring the can to your mouth and tip it back past 60°: PSSHT, glug glug, then **MANGO LOCO MODE**. For 10 seconds everything is worth ×3 Chonk, the world goes warm orange and a mariachi tune plays.
- **Chonk Meter on your left wrist.** Ronnie grows through 6 stages (Little Ronnie → Snacky → Chunky → Big → Very Big → **Ronnie XL**). Each stage-up plays a BWOOMP, makes you physically bigger (the room shrinks around you), grows your belly (look down) and gets a stage line from Tommy. The wrist also shows the FPS.
- **Tommy** uses his real 3D model (`assets/tommy.glb`) as a Gang Beasts-style **active ragdoll**. He greets you, roasts you, reacts to what you eat and drink, wanders around, and has his personal spotlight. The physics side:
  - **Wobbly on purpose.** He is always a physics ragdoll made of 11 bodies joined at the neck, spine, shoulders, elbows, hips and knees. "Muscles" pull each limb toward a pose (standing, waddling, gesturing while he talks, winding up a throw) but never perfectly, so he wobbles and overshoots.
  - **Puppet strings.** An invisible lift holds his hips up and keeps his chest over them, the same trick Gang Beasts uses to keep characters standing.
  - **Light hits** just shove him about (food has mass, so a doughnut hits softer than a full can).
  - **Big hits** (hard throws, fast slaps, food to the head) make him go fully limp. He flops to the floor seeing stars, then his muscles come back and haul him up: *"I'm just trying to help!"*
  - **Grab any part of him** (grip or pinch) and drag, dangle or fling him. He flails and complains *"Ronnie, put me down… I am older than you!"* Throw him hard enough and you get *"WORTH IIIIIIT!"*
  - **Slap him** with a fast hand swing, or just shove him: your hands are physical.
- **Veggie attack:** every ~20s Tommy winds up and lobs a broccoli at your face. You have three options:
  - **Swat it** with a fast hand swing (THWACK).
  - **Block it** with your hand or with food.
  - **Catch it** and throw it back ("RETURN TO SENDER!").
  If it gets in your mouth you lose 15 Chonk, the screen goes green, and Tommy says "We had him. We HAD him!"
- **All sounds are synthesised in code,** so there are no audio files to download.

## Controls (in VR)

| Action | Controllers | Hands |
|---|---|---|
| Grab / hold (food or Tommy) | Grip or trigger | Pinch |
| Eat | Bring food to your mouth | Same |
| Drink MONSTOR | Can to mouth, then tip it back | Same |
| Throw | Let go mid-swing | Un-pinch mid-swing |
| Swat broccoli | Fast swing through it | Same |
| Slap / shove Tommy | Swing your hand into him | Same |
| Move | Left stick | Walk around for real |
| Turn | Right stick (30° snap) | Turn your body |
| Chonk Meter | Look at your left wrist | Same |

**Phone / tablet / computer:** press **PLAY ON THIS SCREEN**.

| Action | Touch | Keyboard + mouse |
|---|---|---|
| Walk | Joystick (bottom left) | WASD / arrow keys |
| Look | Drag anywhere | Drag |
| Pick up food | Tap it (within ~3m) | Click it |
| Eat / drink what you're holding | EAT / DRINK button | E |
| Throw it | THROW button | Space or F |
| Swat broccoli | Tap it as it flies at you | Click it |
| Slap Tommy | Tap him (get close) | Click him |

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
index.html        page, Enter VR / Play on this screen, import map (three.js r170, cannon-es 0.20 from jsDelivr)
assets/tommy.glb  Tommy's model, simplified from the 2M-triangle original to 17.7k triangles
assets/hands/     hand models (WebXR Input Profiles "generic hand", MIT licence)
js/main.js        game loop: eating, drinking, Chonk, stages, LOCO mode, broccoli, hits, slaps, touch wiring
js/config.js      all the tuning numbers (stages, food Chonk, timings)
js/player.js      XR rig, hands, grab/throw (food and Tommy), movement, wrist meter, belly, phone-mode hand
js/hands.js       hand models around the controllers, with finger curl from trigger/grip
js/touch.js       on-screen joystick, buttons, drag-to-look, tap; keyboard for desktop
js/physics.js     cannon-es world: room walls, furniture, fixed 90Hz steps
js/ragdoll.js     Gang Beasts-style active ragdoll + automatic skinning of Tommy's model
js/tommy.js       Tommy's brain: talking, wandering, broccoli throw, knockouts, being grabbed
js/dialogue.js    Tommy's line banks (from §3 of the design doc)
js/room.js        the bedroom, furniture, joke signs, lighting
js/foods.js       food meshes + the small physics engine
js/fx.js          crumbs, comic words, screen tint
js/audio.js       synthesised sound effects + LOCO music
js/textures.js    canvas-drawn posters, labels, the Mango Loco can
```

## Performance (target: steady 72fps on Quest 3)

- All plain-coloured furniture is merged into one mesh, and the floor cans are a single instanced mesh. Tommy was cut from about 2 million triangles to 17.7k and is skinned on the GPU. A frame is about 50 draw calls and 36k triangles per eye.
- Physics runs at a fixed 90 steps a second. It's only Tommy's 11 bodies, 2 hand spheres and the static room, and food uses its own tiny solver.
- There are no real-time shadows. The sun stripes and Tommy's shadow are cheap fake decals.
- Lighting is cheap Lambert shading with 3 lights (sky, sun, Tommy's spotlight).
- Text and textures are drawn once at load. The wrist and speech bubbles only redraw when something changes.
- Nothing allocates memory inside the frame loop, so there are no garbage-collection hitches.
- Fixed foveated rendering is on.

## Known issues / not yet

- **Not yet tested on a real Quest 3.** It was tested in Meta's WebXR emulator (IWER) with emulated Quest 3 controllers and hands, and as a flat page on emulated iPad and desktop. Check the FPS number on your wrist the first time you play.
- three.js and cannon-es load from the jsDelivr CDN, so the device needs internet. The hand and Tommy models are in the repo.
- Tommy "speaks" with text bubbles and a little babble sound, not a real voice yet.
- Tommy's model is a scan with no real skeleton. The game builds one when it loads, so the shoulders bunch up a little when his arms hang down.
- Food doesn't bump into other food.
- The mirror isn't reflective, because real mirrors double the rendering cost.
- Chonk thresholds are lower than the design doc so you reach Ronnie XL quickly. Change `STAGES` in `js/config.js` to use the doc's 0/100/250/450/700/1000.
