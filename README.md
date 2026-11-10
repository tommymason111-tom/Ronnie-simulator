# RONNIE SIMULATOR — WebXR

A VR comedy eating game that runs in the **Meta Quest 3 browser**, and also plays on **phones, tablets and computers** with on-screen controls. It's plain HTML and JavaScript, with [three.js](https://threejs.org) and [cannon-es](https://github.com/pmndrs/cannon-es) (physics) loaded from a CDN. There's no build step and nothing to install, so it can be hosted for free on GitHub Pages.

The design doc is `Ronnie simulator prompt.md`. It was written for Unity; this repo builds the WebXR version, starting with Phase 1.

## Phase 1: what's in it

- **Ronnie's bedroom** (5m × 4.5m, design doc §39.1). It has a bed with the "RONNIE CRATER", a desk with a gaming chair ("MAX LOAD: NOT YOU"), a wardrobe with drawers from S to PARACHUTE, a bookshelf (*War and Pies*, *50 Shades of Gravy*…), MONSTOR cans all over the floor, a pizza rug, posters, a calendar and a clock. Warm morning sun comes through the blinds, with dust in the sunbeams.
- **WebXR.** There's an ENTER VR button, and it works with both Quest controllers and hand tracking.
- **Hands, not controllers.** With controllers you see a hand wrapped around each one. The index finger curls as you squeeze the trigger, the other fingers curl with the grip, and the thumb drops when it touches a button. With hand tracking you see your own fingers moving.
- **Play on a phone or tablet.** Press **PLAY ON THIS SCREEN**. There's a joystick to walk, you drag to look, tap food to pick it up, and use the EAT/DRINK and THROW buttons. Tap broccoli to swat it and tap Tommy to slap him. A first-person hand holds your food. On a computer, use WASD, E and Space.
- **Grab, throw and eat.** Grab with the grip or trigger (or pinch with your hands). Bring food to your mouth to take a bite: you get a CHOMP sound, a crumb burst, a comic word and a controller buzz. You can throw anything.
- **Foods:** burger (3 bites), pizza slice (2), doughnut (2), and a **MONSTOR Mango Loco** can. Bring the can to your mouth and tip it back past 60°: PSSHT, glug glug, then **MANGO LOCO MODE**. For 10 seconds everything is worth ×3 Eat points, the world goes warm orange and a mariachi tune plays.
- **Eat Meter on your left wrist.** Ronnie grows through 6 stages (Little Ronnie → Snacky → Chunky → Big → Very Big → **Ronnie XL**). Each stage-up plays a BWOOMP, makes you physically bigger (the room shrinks around you), grows your belly (look down) and gets a stage line from Tommy. The wrist also shows the FPS.
- **Tommy** uses his real 3D model (`assets/tommy.glb`) with eyes matched to his photo. He greets you, roasts you, reacts to what you eat and drink, wanders around, and has his personal spotlight.
- **Animation and ragdolls (everyone).** Standing and walking are normal animation: a walk cycle whose feet move with the ground, knees bending, arms swinging, heads turning smoothly. Light hits play a flinch.
  - **Ragdoll only when it should be:** a knockout, a hard slap or being grabbed switches them to a ragdoll of 11 bodies (neck, spine, shoulders, elbows, hips, knees).
  - **Knocked out:** hard throws, fast slaps or head hits make them a normal limp ragdoll. Elbows and knees are hinges that only bend the right way, every joint has twist limits, and joint friction makes them drop like a heavy body, not jelly. Getting up blends smoothly from where they landed back to standing.
  - **Grab anyone** (grip or pinch) and drag, dangle or fling them. Slap or shove with your hands.

- **Veggie attack:** every ~20s Tommy winds up and lobs a broccoli at your face. You have three options:
  - **Swat it** with a fast hand swing (THWACK).
  - **Block it** with your hand or with food.
  - **Catch it** and throw it back ("RETURN TO SENDER!").
  If it gets in your mouth you lose 15 Eat points, the screen goes green, and Tommy says "We had him. We HAD him!"
- **All sounds are synthesised in code,** so there are no audio files to download.

## Start screen, places and modes

The game opens on a start screen (Ronnie chomping a burger while food rains down). Pick **where** and **what**, then press **LET'S EAT**:

| Place | Size | What's there |
|---|---|---|
| **Ronnie's Bedroom** | 5 × 4.5 m | The original room: bed, desk, snack station, MONSTOR cans everywhere. |
| **The Oysterfleet** | 27 × 22 m | Built from the floor plan: pub floor with booths, long tables and fireplace, the bar with stools, taps and a lit back-bar, kitchen, toilets, gambling room with poker table and "THE CHIP MACHINE"s. Big screens show the football. 14 joke signs from the design doc. |
| **Liddle-Price** | 30 × 22 m | Six aisles, the infamous middle aisle, bakery, a wall of glowing MONSTOR fridges, checkouts and self-checkouts. |
| **La Grande Portion** | 24 × 18 m | Candlelit restaurant for Date Night: 12 diners' tables, dessert trolley, buffet counter, chandeliers. |

Modes: Classic, **The Whole Squad** (all 12 people at once, big places only), Squad Intervention (everyone in big places), Veggie War, **Date Night** (restaurant), Catch & Eat, Eat-Off, Eat-Off 2P. In a level, ☰ MENU (or "Change place or mode") goes back to the start screen.

**Date Night:** Chloe sits opposite you. When she's looking, sit still. When she looks away (phone, waiter, a weird moment), grab food from other tables and the dessert trolley. A "ding" warns you just before she looks back. Get caught 3 times and she orders you a salad. Halfway through she does a victory dance, which gives you 6 seconds to eat anything.

Characters find their way round the big levels with a navigation grid, and don't walk through each other or through you.

## The squad (design doc Part 5)

Chloe, Lewis, Harry, Aidan, Noah, Oliver, Dylan, Connor, Ethan, Ian and Alfie use their own 3D models (`assets/squad/*.glb`). Each was cut from about 1–2 million triangles to 24k (extra detail kept on the face), with its texture and surface detail re-baked from the original, and is rigged at load time onto the same ragdoll as Tommy at their real height. Each person has their own lines and a signature **intervention**:

| Who | Intervention | What happens |
|---|---|---|
| **Chloe** | Name the Food | Throws salad at you, then names your next snack. Eating it gives a guilt bonus (x1.5) and a sad violin. |
| **Lewis** | Protein Swap | Puts protein shakes on your snack station, then flexes. Drinking one: "bro… you're bulking". |
| **Harry H** | Catch & Eat | "Throws the food away" — straight at your mouth. Let it hit your mouth to swallow it whole (+50%). |
| **Aidan** | Just the One | Sets down a pint of BLACK LIFFEY stout. Drinking it gives STOUT MODE (x2 Eat points, cosy amber), plus a bonus if you let it settle for 10s. |
| **Noah** | The Tackle | Charges at you and knocks you flat on the floor; everything you're holding goes flying. |
| **Oliver** | Shame Cam | Films you live, and his follower count rockets every time you eat. |
| **Connor** | The Round | Aidan's brother (Irish, Liverpool). Buys a round of stout and puts two pints on the bar, "for you, one for me". |
| **Ethan** | Galáctico Free Kick | Real Madrid fan from England with a big nose (everyone jokes about it). Curls veg free kicks at your face. |
| **Ian** | The Healthy Barbecue | Lewis's dad ("Lewy!"). Fishing rod in hand, moans about Canvey Lake, lobs grilled veg off the barbecue. |
| **Alfie** | The Volley | Chelsea like Ron, tattoos (gave up on the back piece), Sunday league, pint in hand. Volleys fruit at your head. |
| **Dylan** | The Ambush | Hides in the bin, leaps out and clings to your hand. Shake him off (or tap him on a phone). |


## Game modes

Pick a mode on the start screen, or press a button on the **GAME MODES board** on the bedroom wall behind you (touch it with your hand in VR, tap it on a phone). Each mode ends with a receipt.

| Mode | How it plays |
|---|---|
| **Classic** | Eat, grow, dodge Tommy's broccoli. |
| **Squad Intervention** (4 min) | Tommy plus 4 random squad members. An Intervention Meter fills as you eat. When it's full, the next person tries their move. Receipt: "INTERVENTIONS SUCCESSFUL: 0". |
| **Veggie War** (2½ min) | The squad attacks with veg in waves: one at a time, then two at once, then everyone. Each has their own veg (Noah carrots, Harry sprouts, Dylan celery…). |
| **Catch & Eat** | Harry throws 20 foods. Catch them in your mouth. |
| **Eat-Off** (60s) | Eat as much as you can. Your best score is saved on the device. |
| **Eat-Off 2P** | Player 1 plays, passes the headset or phone, then Player 2 presses Eat-Off 2P. Winner on the receipt. |

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
| Eat Meter | Look at your left wrist | Same |

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
assets/tommy.glb  Tommy's model: 32k triangles (22k on the head) re-baked from the 2M-triangle original, with a new colour texture and normal map
assets/squad/     the squad's models (Chloe, Lewis, Harry, Aidan, Noah, Oliver, Dylan), 24k triangles each
assets/hands/     hand models (WebXR Input Profiles "generic hand", MIT licence)
js/main.js        game loop: eating, drinking, Eat points, stages, LOCO mode, broccoli, hits, slaps, touch wiring
js/config.js      all the tuning numbers (stages, food Eat points, timings)
js/player.js      XR rig, hands, grab/throw (food and Tommy), movement, wrist meter, belly, phone-mode hand
js/hands.js       hand models around the controllers, with finger curl from trigger/grip
js/touch.js       on-screen joystick, buttons, drag-to-look, tap; keyboard for desktop
js/physics.js     cannon-es world: room walls, furniture, fixed 90Hz steps
js/ragdoll.js     ragdoll bodies, hinge/cone joints with limits, muscles, auto-skinning of Tommy's model
js/character.js   shared character behaviour: speech, walking, poses, throwing, hits, knockouts, grabbing
js/tommy.js       Tommy: his model, eyes, spotlight, broccoli attacks
js/squad.js       the squad: looks (built from shapes), lines and interventions
js/modes.js       game modes, intervention meter, roast bubbles, mode board, receipts
js/dialogue.js    Tommy's line banks (from §3 of the design doc)
js/room.js        the bedroom, furniture, joke signs, lighting
js/foods.js       food meshes + the small physics engine
js/fx.js          crumbs, comic words, screen tint
js/audio.js       synthesised sound effects + LOCO music
js/textures.js    canvas-drawn posters, labels, the Mango Loco can
```

## Performance (target: steady 72fps on Quest 3)

- All plain-coloured furniture is merged into one mesh, and the floor cans are a single instanced mesh. Tommy was cut from about 2 million triangles to 32k (most of them on his face) and is skinned on the GPU. A frame is about 55 draw calls and 50k triangles per eye.
- Physics runs at a fixed 90 steps a second: up to 5 characters × 11 bodies, 2 hand spheres and the static room. Food uses its own tiny solver.
- Each squad member is one draw call of 24k triangles. A full Squad Intervention frame (Tommy + 4) is about 150k triangles, well within Quest 3's budget.
- The squad models are about 1.6 MB each and only download when a mode needs that person.
- There are no real-time shadows. The sun stripes and Tommy's shadow are cheap fake decals.
- Lighting is cheap Lambert shading with 3 lights (sky, sun, Tommy's spotlight).
- Text and textures are drawn once at load. The wrist and speech bubbles only redraw when something changes.
- Nothing allocates memory inside the frame loop, so there are no garbage-collection hitches.
- Fixed foveated rendering is on.

## Known issues / not yet

- **Not yet tested on a real Quest 3.** It was tested in Meta's WebXR emulator (IWER) with emulated Quest 3 controllers and hands, and as a flat page on emulated iPad and desktop. Check the FPS number on your wrist the first time you play.
- three.js and cannon-es load from the jsDelivr CDN, so the device needs internet. The hand and Tommy models are in the repo.
- Tommy "speaks" with text bubbles and a little babble sound, not a real voice yet.
- Tommy's eyes in the original model were painted on and too wide, so the face has small openings where real eyeballs sit behind skin-coloured eyelids (modelled on photos of Tommy: blue-grey irises, heavy upper lids). They follow you and blink.
- The squad scans were made with arms down, so the scan fused arms to the body where they touched. The game cuts those joins, which leaves small gaps under the arms that you can only see when an arm is raised high.
- Tommy's model is a scan with no real skeleton. The game builds one when it loads, so the shoulders bunch up a little when his arms hang down.
- Food doesn't bump into other food.
- The mirror isn't reflective, because real mirrors double the rendering cost.
- Eat points thresholds are lower than the design doc so you reach Ronnie XL quickly. Change `STAGES` in `js/config.js` to use the doc's 0/100/250/450/700/1000.
