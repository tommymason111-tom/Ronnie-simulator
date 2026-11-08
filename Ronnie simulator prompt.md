RONNIE SIMULATOR — MASTER BUILD PROMPT (v4, "THE RONNIVERSE EDITION")

This document has six parts. PART 1 (sections 1–17) is the game overview. PART 2 (sections 18–28) is the deep design bible: exact numbers, per-feature specs, full dialogue, joke inventories and script architecture. PART 3 (sections 29–44) is the art, 3D and visual-quality bible: how to make it look stunning on Quest 3. PART 4 (sections 45–58) covers the front end: system splash, intro, title screen, main menu, all sub-menus and loading screens — all branded RONNIE SIMULATOR and built to run smoothly on Quest. PART 5 (sections 59–76) is THE SQUAD: Ronnie's mates Lewis, Harry H, Aidan, Noah, Oliver and Dylan, plus the two other main characters, Chloe (Ronnie's girlfriend) and Tasha (Tommy's girlfriend), with their own mechanics, levels, modes and dialogue. PART 6 (sections 77–95) is the REALISM & VEGGIE WAR update: research on the best VR games, a switch to realistic 3D models, everything-is-grabbable physics, the new core loop (fighting off vegetables), MONSTOR drinks, The Oysterfleet, school and office levels, and a no-limits roast pack. Where a later part is more specific than an earlier one, the later part wins.
=========================================================================

Create a complete, playable VR comedy game called "RONNIE SIMULATOR" for Meta Quest 3 (Unity 6.3 LTS, URP, OpenXR, XR Interaction Toolkit). Target 90 fps (72 fps absolute minimum) on standalone Quest. Provide the full project structure, every C# script (fully commented), scene setup instructions, prefab lists, ScriptableObject data files, audio import settings and placeholder asset specs.

BUILD ORDER (do not skip ahead):
  Phase 1 — Core systems: XR rig, grab-and-eat, Chonk Meter, growth blend shapes, eating audio, Tommy NPC with voiced dialogue and ragdoll.
  Phase 2 — Level 1 (Ronnie's Bedroom) fully playable end to end, including scorecard, PLUS the full front end from Part 4 (system splash, boot, intro, title screen, main menu, settings, loading screen, pause) so the game launches and loads like a finished product from day one.
  Phase 3 — Levels 2–6, one at a time, each tested before the next.
  Phase 4 — Feature list (section 12), unlocks, Tommy Mode, two-player.
  Phase 5 — Polish: particles, juice, performance pass, comfort options.

After each phase, output: what was built, which files changed, how to test it in the headset, and known issues.

=========================================================================
1. CONCEPT & GOLDEN RULES OF COMEDY
=========================================================================
The player IS Ronnie: a lad with a bottomless appetite, a Chelsea shirt, and a serious addiction to "MONSTOR Energy" (parody energy drink: black can, green claw marks, "UNLEASH THE MONSTOR" slogan). The goal: eat and drink EVERYTHING and become ABSURDLY, RIDICULOUSLY, PLANET-SIZED FAT.

His best mate Tommy (shorter, older by exactly one day, unreasonably handsome, six-pack) follows him everywhere, talking to him out loud in a fully voiced, cool, smooth voice, roasting him constantly while insisting he's "just trying to help".

GOLDEN RULES — apply to EVERY asset, line, sound and system:
  RULE 1: Everywhere the player looks, there is a fat joke. No empty walls. No blank props. Every poster, sign, label, screen, book spine, fridge magnet, sticker and graffiti tag is a joke about Ronnie's size.
  RULE 2: Everything is OVER-EXAGGERATED. Every bite is an explosion. Every gulp echoes. Every footstep is an earthquake. Every NPC reaction is a full theatrical meltdown. If it can be bigger, louder, sloppier or more dramatic — do it.
  RULE 3: Ragdoll physics wherever possible. NPCs, Tommy, furniture, food — everything flops, bounces, tumbles and gets launched.
  RULE 4: Tommy always has something to say. He reacts to everything the player does, within 2 seconds, with a voiced line.
  RULE 5: Cartoon, never cruel. Slapstick only. No gore, no blood, no realistic injury. Hit NPCs go "BOING", see stars, and get back up.

=========================================================================
2. CHARACTERS
=========================================================================

-------------------------------------------------------------------------
2.1 RONNIE (the player)
-------------------------------------------------------------------------
- Full-body avatar with IK from headset + controllers. Visible in mirrors in every level (at least 3 mirrors per level, including one funhouse mirror that makes him look even wider).
- OUTFIT: blue Chelsea-style home shirt (for any public release, swap to a generic blue "Kings Road FC" shirt with a lion-style crest), grey joggers, white sports socks, black sliders. A MONSTOR can is always tucked in the joggers' pocket, making a visible bulge.
- Shirt back: "RONNIE 10". As he grows: lettering stretches → "R  O  N  N  I  E" → "R     O     N     N     I     E" → the number "10" becomes "100" → "1000" → "XXXXXXL". Then: crop top → bra-style strip → collar only → collar pings off and sticks to the nearest wall with a cartoon "THWACK".
- Joggers: drawstring loosens → untied → waistband snaps with a guitar-string TWANG and the drawstring whips across the room, knocking over a lamp.
- Sliders: flatten into pancakes, then get absorbed into his feet.
- GROWTH: 12 stages using blend shapes on belly, cheeks, upper arms, thighs, neck (disappears by Stage 6), and chins (double → triple → quintuple → "chin accordion" → "chin staircase"). Belly jiggles with spring-bone physics on every step and bounces when he jumps.
- From Stage 7, his belly extends into the player's view and the player has to reach AROUND it to grab food. From Stage 10, he can't see his own feet; a little "WHERE ARE MY FEET?" thought bubble pops up when looking down.
- RONNIE'S VOICE: grunts, "mmmMMM" noises, excuse shouts and burps only (no full dialogue — Tommy does the talking). Use a generic comedic voice actor or TTS voice; do NOT clone the real Ronnie's voice unless he's given the OK.

-------------------------------------------------------------------------
2.2 TOMMY (Ronnie's best mate — fully voiced NPC)
-------------------------------------------------------------------------
LOOKS
- A few inches SHORTER than Ronnie (at Stage 1). As Ronnie grows, Tommy appears tinier and tinier by comparison, which Tommy refuses to acknowledge.
- Unreasonably handsome: strong jaw under a neat light-brown beard (short and full, with a light stubble edge), brown curtain hairstyle (centre parting, two perfect curtains) that never moves (except after burp shockwaves), sparkling teeth, visible six-pack under a fitted white T-shirt, black joggers, fresh white trainers. Height 5ft 6in (168cm) — four inches shorter than Ronnie.
- Has his own personal spotlight that follows him even outdoors and in space. Lens flare on his teeth. A "ting!" sparkle SFX plays every time he smiles. A soft breeze blows his hair in slow motion when he says something smug.
- Older than Ronnie by exactly ONE DAY. He brings this up constantly.

VOICE (must be audible, spatial, and cool)
- Every Tommy line is spoken aloud with a voiced audio clip, played as 3D spatial audio from Tommy's mouth position, with lip-sync.
- Voice direction: smooth, confident, laid-back, slightly smug London lad. Think late-night radio DJ crossed with a nature documentary narrator. Warm, cheeky, never shouting unless being ragdolled.
- Implementation options (build the system to support all three):
  a) Tommy records his own lines (preferred — it's his voice). Provide a recording script export (CSV: line ID, line text, emotion tag).
  b) Pre-generated TTS clips using a TTS service (e.g. ElevenLabs) with a voice Tommy creates or clones from his OWN voice. Generate all clips at build time — no runtime API calls on Quest.
  c) Fallback: on-device TTS for placeholder testing.
- Lip-sync: pre-baked visemes from the voice clips (see section 34.6 — do NOT use the deprecated OVRLipSync).
- Subtitles: optional, toggled in settings, shown as a floating speech bubble above Tommy's head in a bold cartoon font.
- Ducking: music volume drops 40% while Tommy speaks.
- Dialogue system: ScriptableObject-based line banks, organised by trigger. Never repeat a line within the last 8 lines played. Each line has a priority; high-priority triggers (stage-up, being attacked) interrupt low-priority chatter.

BEHAVIOUR
- Follows Ronnie at 2–4 metres using NavMesh. Leans in doorways, pops up behind mirrors, climbs out of bins, slides in on a skateboard, abseils from ceilings, appears in TV screens.
- Comments on what the player is doing within 2 seconds (eating, drinking, stage-up, combo, burp, getting stuck, falling over, looking in a mirror, standing still too long).
- Idle animations: checking his abs in a mirror, doing one perfect press-up, fixing his hair, taking a selfie, sipping a single glass of water smugly, doing a little shadow-boxing, looking at his watch ("still a day older").

-------------------------------------------------------------------------
2.3 SUPPORTING NPCs (all with ragdoll + exaggerated reactions)
-------------------------------------------------------------------------
- SHOPKEEPER (Corner Shop): increasingly paranoid, boards up the till, hides crisps in his shirt.
- KEBAB MAN (Kebab Shop): treats Ronnie like a legend, plays an air horn when he walks in.
- BUFFET MANAGER (Buffet): sweating, clipboard, walkie-talkie, eventually calls in a SWAT team of waiters.
- GRANDMA (Birthday Party): keeps piling food on Ronnie's plate no matter how big he gets.
- DELIVERY DRIVER: moves into Ronnie's house over the course of the game.
- NEWS REPORTER: appears on TVs, reporting live on Ronnie's size.
- PIGEONS: faint whenever Ronnie walks past.
Reaction animations: jaw drops to the floor (literally), eyes pop out on springs, hair stands straight up, hats fly off, bodies freeze then fall over stiff like a plank.

=========================================================================
3. TOMMY'S DIALOGUE BANK (voiced — minimum 200 lines)
=========================================================================
Generate all lines below, then write MORE in the same style to reach at least 200. Tag each line with its trigger and an emotion (smug / concerned / amazed / panicked / caring / sarcastic).

3.1 GREETINGS / LEVEL START
- "Morning, Ronnie. Or should I say... morning, Ronnies? There's more of you every day."
- "Alright, big man. And I do mean BIG."
- "Ah, the youngest has arrived. Did you have a nice extra day in the womb?"
- "Right, I've done my 500 sit-ups. What have you done? Oh. Breakfast. Twice."
- "Hello, Ronnie. I came as soon as I felt the earthquake."
- "Ron! Good to see you. All of you. Takes a while, mind."

3.2 THE AGE GAP (older by one day)
- "Respect your elders, Ronnie. I've been alive a WHOLE day longer than you."
- "When I was your age — so, yesterday — I had a six-pack. Oh wait, I still do."
- "I've got 24 hours more wisdom than you, and all 24 of them are telling me to hide the biscuits."
- "Born one day apart, and look at us. Nature did me a favour, and did you... a portion."
- "Baby Ronnie! Who's a big boy? You are. Really, really big."
- "I was born first, so technically I'm your role model. Look at me. Now look at you. Now back at me."
- "Mum said I could have a little brother. I didn't know she meant one day later and four times wider."
- "You're the youngest, Ron. You'll understand when you're older. Like tomorrow."

3.3 SIZE ROASTS (general)
- "Mate... you're getting PRETTY large."
- "Is that a new chin, or are you just pleased to see me?"
- "I'm shorter than you, but at this rate you'll be WIDER than you are tall."
- "Ronnie, you've got your own postcode now. I sent you a letter, it went to your belly."
- "Careful, Ron, you've got your own weather system. It's drizzling on your left side."
- "I'd give you a hug, but my arms don't go that far. Nobody's do."
- "Ronnie, you're blocking my sun. I need it for my abs."
- "When you sit around the house, you REALLY sit AROUND the house."
- "You don't need a seatbelt, Ron, you need a ring road."
- "Google Maps just called. They want to know if they can use you as a landmark."
- "I tried to take a picture of you, but my phone asked if I wanted panorama mode."
- "You're not overweight, Ron. You're just... under-tall. By about four metres."
- "That shirt isn't a crop top, Ron. You've made it into a crop top. By force."
- "Your shadow just asked for its own room."
- "Ronnie, NASA have been on the phone. You've got satellites."

3.4 STAGE-UP LINES (one bank per stage)
- Stage 2: "Ooh, that's a little bulge, Ron. Cute. Like a baby. A younger baby than me."
- Stage 3: "Did your shirt just make a noise? I think it's crying."
- Stage 4: "Ronnie... I'm not saying you're big, but your chins have started a group chat."
- Stage 5: "That's FIVE now, Ron. I'm calling your mum."
- Stage 6: "Where's your neck gone? Has anyone seen Ronnie's neck? Reward offered."
- Stage 7: "Things are ORBITING you, Ron. You have MOONS."
- Stage 8: "Absolute unit. I'm putting that on your birthday cake. Tomorrow. After mine."
- Stage 9: "I need binoculars to see your face. Hang on... no, still just chin."
- Stage 10: "You can't walk any more, Ron. You're just... rolling. With purpose."
- Stage 11: "You're on the news, mate. And the weather. AND the shipping forecast."
- Stage 12: "Ronnie... I think you ARE the level now. I'm standing on you, aren't I?"

3.5 EATING / DRINKING REACTIONS
- "Did you even chew that? Did you even SEE that?"
- "That was a family bucket, Ron. Where's the family?"
- "That kebab didn't stand a chance. It had a family."
- "Another MONSTOR? Your blood type is now 'Green Apple'."
- "You drink so many of those, your burps are sponsored."
- "Ron, the fridge just filed a restraining order."
- "Ronnie, that was decorative fruit. It was PLASTIC."
- "You just ate the plate. Ron, the PLATE."
- "Slow down, mate, you're making the food nervous."
- "That noise. That noise you just made. I'll hear that in my dreams."
- "Was that a burp or did a lorry just reverse?"

3.6 COMBO REACTIONS
- x2: "Ooh, double dipping."
- x3: "Hat-trick! Chelsea would be proud. Well, someone would."
- x5: "FIVE in a row? Ron, you're a buffet's worst nightmare."
- x10 ABSOLUTE UNIT: "I've seen black holes with more self-control."

3.7 ATTACKED BY THE PLAYER ("I'm just trying to help")
(Plays when Tommy is hit by thrown food, slapped, belly-bumped, sat on, or launched. Tommy ragdolls, then gets up and says one of these.)
- "Ow! I'm just trying to help!"
- "Ron! I'm just trying to HELP you!"
- "That's assault on an older man, Ronnie. I'm a whole day older!"
- "I'm on YOUR side, mate! I'm the only one who's honest with you!"
- "Ow, my abs! You could have hit anything but the abs!"
- "Fine, fine! I'll stop helping! ... You're still massive, by the way."
- "Did you just throw a doughnut at me? You never throw food. Something's wrong."
- "I'm just trying to help! Someone has to tell you, Ron!"
- "Was that a slap or did a sofa fall on me?"
- "I came here out of LOVE, Ronnie!"
- "Okay, that one was fair. But you're still huge."
- "You've knocked my hair out of place. This is a crime."
- "I'm not angry. I'm just disappointed. And slightly flattened."
- "Ronnie, put me down. Ronnie. RONNIE. I am a grown man and I am older than you!"
- When launched very far (distance > 15m): "WORTH IIIIIIT!" (fading, Doppler effect)
- When belly-bumped: "Like being hit by a bouncy castle full of kebabs!"
- When sat on: muffled "...Ron... I can't breathe... I'm just trying to... help..."
- After 10+ hits in one level: "You know what, Ron? I'm still not lying. You're still fat."
- After 25+ hits: Tommy puts on a full American football helmet and pads, then keeps talking.

3.8 BURP REACTIONS
- "My hair! My HAIR, Ronnie!"
- "That just set off car alarms in another county."
- "I think that burp had a burp."

3.9 GETTING STUCK / FALLING OVER
- "Need a push? I'm just trying to help."
- "Don't worry, mate, I'll call the fire brigade. Again."
- "Ronnie's down! Ronnie's down! Get the forklift!"
- "You're like a tortoise on its back, but sadder."

3.10 MIRROR REACTIONS (player looks in a mirror)
- "Careful, mate, mirrors only hold so much."
- "Mirror, mirror on the wall, who's the biggest of them all?... Yeah. Thought so."
- "Look at me in the background. Gorgeous. Look at you in the foreground. Lots of you."

3.11 IDLE / STANDING STILL TOO LONG
- "Ron? Are you buffering? Or digesting?"
- "You've gone quiet. Is it a food coma? Blink twice."
- "I'll just do some sit-ups while you decide which cake to eat."

3.12 CARING (to make the roasting land harder)
- "I say all this because I care, Ronnie. Mainly about the furniture."
- "You know I love you, mate. There's just a lot more of you to love now."
- "Happy birthday, by the way. Tomorrow. After mine."

3.13 CHELSEA LINES
- "Chelsea want you as their new stadium."
- "You're the first Chelsea fan who's bigger than the actual squad. Combined."
- "They'll have to widen the Shed End for you."
- "Your shirt says 10, but your size says the whole team."

3.14 LEVEL END
- "Well done, Ron. You ate the level. The WHOLE level."
- "Another place we can never go back to."
- "I'll tell your mum you were good. I'll lie."

=========================================================================
4. TOMMY RAGDOLL & ATTACK SYSTEM
=========================================================================
The player can attack Tommy in lots of ways. Every attack ragdolls him in a funny way, then he recovers and says a voiced "I'm just trying to help" style line (section 3.7).

RAGDOLL SETUP
- Use Unity's ragdoll (Character Joints + Rigidbodies on all bones), switching between animated mode and ragdoll mode with a blend system (animated → ragdoll on impact, ragdoll → "get up" animation after 2–4 seconds, blending using a get-up from front/back depending on how he landed).
- Exaggerated physics: lower gravity on ragdolls (0.7x) for floaty comedy tumbles, extra bounce on landings, a random spin applied on launch.
- His hair stays perfectly in place during ragdoll (it's the funniest contrast) — EXCEPT after a burp shockwave.
- On impact: cartoon star particles circle his head, a "BONK", "BOING" or "SPLAT" sound, a small comic-book impact word appears in mid-air ("POW!", "SPLAT!", "WALLOP!").
- Slow-motion: big launches trigger 0.5 seconds of slow motion with a dramatic choir note.

ATTACKS
1. FOOD THROW: throw any food at Tommy. Sauce-heavy food leaves a splat on him; he wipes it off with a handkerchief.
2. SLAP: a hand-velocity check on the controller. A fast swing = full ragdoll spin. Slow swing = Tommy just says "...was that meant to hurt?"
3. BELLY BUMP: walk into Tommy at speed and he gets launched with a "BOIIIING" trampoline sound. Launch force scales with Ronnie's stage. At Stage 10+, Tommy is launched into the sky and lands back in the level 10 seconds later, still talking.
4. SIT ON HIM: crouch over Tommy and he gets flattened like a pancake (squash-and-stretch), then peels himself off the floor.
5. MONSTOR CAN SHAKE: shake a can and open it at Tommy. Foam blasts him across the room like a fire hose.
6. BURP SHOCKWAVE: knocks him over and ruins his hair (his worst nightmare).
7. PICK HIM UP: from Stage 8, Ronnie is big enough to grab Tommy like a toy. Tommy dangles, legs kicking, still talking. You can throw him, spin him, or dip him in gravy.
8. DOUGHNUT HOOPLA: throw doughnuts and they ring onto Tommy's arms and head like a fairground game. 5 rings = "Tommy Doughnut Ring Combo" bonus.

TOMMY'S "HELPING" COUNTER
- A hidden stat: "Times Tommy Tried To Help". Shown on the end-of-level scorecard.
- At 50 hits across the whole game, Tommy unlocks his "Tactical Helping Gear": helmet, knee pads and a riot shield with "I'M JUST TRYING TO HELP" printed on it.

=========================================================================
5. "EVERYWHERE YOU LOOK" — ENVIRONMENTAL FAT JOKES
=========================================================================
Every level must be densely packed with readable jokes. Use large readable text (VR text must be at least 2cm tall at 1m distance). Minimum 30 environmental jokes per level.

GLOBAL (appear in every level)
- Posters: "WANTED: RONNIE — LAST SEEN EATING", "MISSING: RONNIE'S NECK — REWARD", "CAUTION: RONNIE CROSSING (slowly)".
- Road signs: "WIDE LOAD AHEAD", "MAX WEIGHT 7.5 TONNES (EXCEPT RONNIE: NOT PERMITTED)".
- Fridge magnets: "A moment on the lips...", "RONNIE'S DIET PLAN: YES".
- Clock faces: every number replaced with a food item, and the hands are a fork and spoon. Every hour is "Snack o'clock".
- Calendars: every day circled with "CHEAT DAY".
- Book spines: "Ronnie: A Big Life", "The Hungry Hungry Ronnie", "50 Shades of Gravy", "War and Pies", "Lord of the Onion Rings", "Harry Potter and the Chamber of Chips".
- Food labels: "RONNIE-SIZE (serves 40, or 1 Ronnie)", "WARNING: MAY CONTAIN RONNIE TEETH MARKS".
- Graffiti: "RONNIE WAS HERE (and here, and here, he's quite wide)".
- Framed photos of Tommy everywhere, looking handsome, signed "To Ronnie, from your older and better mate x".
- Tiny scale icons in every corner, all broken.
- Stickers on the MONSTOR cans: "Ronnie's 1st can of the day (#47)".

DYNAMIC JOKES (change with Ronnie's size)
- Door signs change from "PUSH" to "PUSH HARDER" to "SQUEEZE" to "GIVE UP".
- Chairs show little speech bubbles: "please no", "not again", "tell my family I love them".
- A height chart on the wall: Tommy's mark labelled "Tommy (perfect)", Ronnie's marks labelled by width instead of height.
- TVs show the news reporter covering Ronnie's growth live, with the ticker: "BREAKING: LOCAL MAN NOW VISIBLE FROM SPACE", "BBC CANCELS ALL PROGRAMMES TO COVER RONNIE", "MET OFFICE: RONNIE-SHAPED CLOUD OVER LONDON".
- Phone notifications on a wall-mounted screen: "Greggs: We miss you (we've seen you 9 times today)", "Deliveroo: Your rider has asked to be paid in danger money".

=========================================================================
6. CORE GAMEPLAY LOOP
=========================================================================
1. EAT: Grab food with grip, bring it to the mouth collider. Huge chomp animation; crumbs explode in a burst of particles; food bits splat onto the camera lens and slide off.
2. CHONK METER: each item has a Chonk Value. Fill the meter to stage up.
3. STAGE-UP: big "BWOOMP" inflation sound, screen shake, XR rig scales up, furniture rattles, a narrator announcement, and Tommy delivers a stage-specific voiced line.
4. MONSTOR MODE: chug a MONSTOR can (tilt the can to the mouth). 10 seconds of double eating speed, glowing green eyes, screen jitter, heartbeat thump, electric-guitar riff. Chain 5 cans for "UNLEASH THE MONSTOR": auto-hoover everything within 3 metres with a jet-engine roar.
5. COMBOS: eat within 1.5 seconds of the last item to build a multiplier: x2, x3, x5, x10 "ABSOLUTE UNIT". Each tier gets a bigger announcer shout and a Tommy reaction.
6. BURP GAUGE: cans fill it. Press B to release a shockwave that ragdolls NPCs, shatters windows and destroys Tommy's hair.
7. LEVEL END: timer hits zero OR Ronnie becomes too fat for the room (walls bulge outward like a balloon, door frames snap, the roof pops off like a bottle cap and flies into the sky).

=========================================================================
7. CONTROLS
=========================================================================
- Grip: grab food, cans, objects or (from Stage 8) Tommy
- Trigger: squeeze food (sauce squirts everywhere) / crack open a can (exaggerated PSSSSHHHT and foam geyser)
- Both grips on belly: Belly Drum
- Fast hand swing: slap (velocity-based)
- Thumbstick: smooth locomotion + snap turn (comfort: teleport, vignette, seated mode)
- A: "Ronnie Excuse" (shouted voice line): "IT'S JUST WATER WEIGHT", "I'M BIG BONED", "THE CAMERA ADDS TEN STONE", "THAT DIDN'T COUNT, IT WAS A SNACK", "I'M YOUNGER, I'M STILL GROWING", "IT'S A BULK", "THESE ARE MUSCLES, TOMMY". Tommy replies to each excuse with a counter-roast.
- B: burp
- Menu: pause (pause menu is a giant pizza box; options are written on slices)

=========================================================================
8. EATING SOUNDS (layered, ridiculous)
=========================================================================
Audio system: every food has its own bite, chew and swallow set. Pitch shifts DOWN and volume UP as Ronnie grows. Reverb increases every stage, and at Stage 12 every sound has a cathedral echo.

- Bites: CHOMP, MUNCH, car-crusher CRUNCH, wet SPLORCH for anything with sauce, a glass-shatter crunch for crisps.
- Chewing: open-mouth "nom nom nom" loops, squelching, lip-smacking, a "mmmMMMMM" hum that rises in pitch.
- Swallowing: a cartoon GULP with a bass drop; a drain gurgle for drinks; a slide whistle going down for long foods (sausages, noodles, hot dogs).
- Slurping: noodles get a 4-second vacuum-cleaner SHLUUUURP that sucks napkins, cutlery and occasionally Tommy's hair gel into Ronnie's mouth.
- Burps: from a tiny "hic" to a 10-second foghorn BWAAAARP that sets off car alarms and makes dogs howl outside.
- Stomach: thunder rumbles → whale calls → a tectonic plate shifting → a full orchestra tuning up.
- Satisfaction: an exaggerated "AHHHHH" after every can, with a choir "hallelujah" sting on combos.
- Dropped food: dramatic orchestral "NOOOOOO" with slow-motion as it falls.
- Footsteps: "tap" (Stage 1) → "thud" → "THOOM" → seismic rumble + car alarms → full earthquake siren.

=========================================================================
9. FOOD & DRINK (32 items + bonus)
=========================================================================
Every item is oversized and cartoony, with googly eyes or a face where it makes sense. Many scream, wave or try to run away when picked up. All food has ragdoll/physics: it bounces, flops and wobbles.

1. Crisps (5) — bag pops like a balloon when opened.
2. Chocolate bar (8) — unwraps itself in a dramatic spin.
3. Doughnut (10) — wear it as a ring first.
4. Pizza slice (12) — cheese stretches for 2 metres.
5. Burger (15) — opens and closes its bun like a mouth: "eat me".
6. Kebab (25) — sprays garlic sauce everywhere.
7. Family bucket of chicken (35) — tipped straight into the mouth.
8. Whole pizza (40) — eaten like a frisbee in one spin.
9. Entire cake (60) — candles blow out from Ronnie's breathing.
10. Christmas turkey (80) — the size of a car.
11. MONSTOR Energy can (15 + MONSTOR MODE).
12. MONSTOR "Ultra Mega" 2-litre can (40 + 20s MONSTOR MODE).
13. Full English breakfast (45) — beans slide down his chin.
14. Sausage roll mountain (30) — 50 rolls avalanche into his mouth.
15. Chicken nuggets bucket (20) — each squeaks "nugget!".
16. Fish and chips in newspaper (35) — headline: "RONNIE STRIKES AGAIN".
17. Cheesy chips with gravy (28) — gravy waterfall.
18. "Foot-long" hot dog (22) — actually 10 feet long.
19. Triple-decker club sandwich (25) — jaw unhinges like a snake.
20. Giant burrito (40) — size of a sleeping bag.
21. Bowl of noodles (18) — one infinite noodle, 15-second slurp.
22. Tub of ice cream (30) — brain freeze, head turns blue, icicles on ears.
23. Whole cheesecake (50) — wobbles like jelly.
24. Jelly tower (25) — bounces around the room.
25. Pick 'n' mix bag (20) — slot-machine payout into his mouth.
26. Popcorn bucket (15) — pops inside his mouth like fireworks.
27. Curry with naan (45) — naan used as a shovel.
28. Box of 24 doughnuts (70) — stacked on fingers like rings.
29. Giant pretzel (20) — worn as a necklace first.
30. Roast potato pile (30) — potatoes roll toward him as if pulled by gravity.
31. Sofa-length Toblerone (55) — eaten like a xylophone, playing notes.
32. Golden Burger (rare, 200) — angelic choir, slow-motion bite, fireworks outside.
BONUS: Mystery Can — shrink one stage, double size instantly, or float to the ceiling for 10 seconds.

=========================================================================
10. LEVELS (6) — each densely packed with jokes
=========================================================================

LEVEL 1: RONNIE'S BEDROOM
- Floor knee-deep in empty MONSTOR cans that clatter and roll with physics. Chelsea scarf on the wall. A framed photo of Tommy on the bedside table, signed "your older, better mate x".
- Snacks hidden under the bed, in drawers, inside the gaming chair, in the pillowcase, behind the PlayStation, in the wardrobe (which is full of shirts labelled S, M, L, XL, XXL... the last one is a parachute).
- The gaming chair creaks louder each stage and collapses with a cartoon "BOING". The bed has a "Ronnie Side" dent so deep it has its own echo.
- Bathroom (Bath Overflow feature).
- Tommy entrance: leaning in the doorway, spotlight on. "Morning, little brother. Oh wait, you're the YOUNGER one."
- Level end: the walls bulge, the roof pops off, and Ronnie is visible from the street.

LEVEL 2: THE CORNER SHOP
- Fridge wall of MONSTOR cans, crisp aisle, sweet jars, a till.
- Shopkeeper NPC watches in horror, phones someone, boards up the till, then hides behind the counter wearing a crisp packet as a helmet.
- Signs: "LIMIT 2 PER CUSTOMER (RONNIE: 0)", "RONNIE-FREE ZONE", "SHOPLIFTERS WILL BE PROSECUTED. RONNIE WILL BE PRAYED FOR".
- Tommy is at the till buying a single banana. "This is what lunch looks like, Ron."

LEVEL 3: KEBAB SHOP AT 2AM
- Kebab conveyor belt, chips flying from fryers, garlic sauce cannons.
- Ronnie gets wedged in the door on the way in.
- Kebab Man plays an air horn every time Ronnie eats.
- Menu board: "RONNIE MEAL: everything, twice".
- Tommy is sitting in the corner with a salad box. Every time you look at him, he raises his fork smugly.

LEVEL 4: ALL-YOU-CAN-EAT BUFFET
- Staff barricade the food behind tables. Manager puts up "RONNIE BANNED" with his photo.
- A SWAT team of waiters (ragdoll-able) abseils in to protect the dessert table.
- The chocolate fountain becomes a chocolate waterfall when Ronnie leans on it.
- Tommy works as a waiter undercover: "Can I take your order? Actually, don't answer, I'll just bring everything."

LEVEL 5: RONNIE'S BIRTHDAY PARTY (the day after Tommy's)
- Banners: "HAPPY BIRTHDAY, YOUNGEST", "TOMMY'S BIRTHDAY WAS YESTERDAY (BETTER PARTY)".
- Leftover cake from Tommy's party stacked everywhere, plus Ronnie's own 12-tier cake.
- Grandma piles on roast potatoes: "you're wasting away, love".
- Tommy blows Ronnie's candles out first: "Age before... well, you."
- A bouncy castle that pops instantly when Ronnie steps on it, launching every child-free NPC (adults only at this party) into the air with ragdoll.
- Party game: "Pin the Belly on Ronnie".

LEVEL 6: FINAL BOSS — THE MONSTOR CAN
- Ronnie is planet-sized, floating in space in a shirt the size of a continent.
- A colossal MONSTOR can orbits Earth. Chug it before it fizzes out.
- Tommy floats past in a spacesuit with his abs visible through the glass: "Still taller than me, still not winning."
- The International Space Station radios: "Houston, we have a Ronnie."
- Victory: Ronnie becomes a new moon. Tommy plants a flag on him: "One small step for Tommy, one giant belly for mankind."

=========================================================================
11. WORLD REACTIONS TO SIZE
=========================================================================
- Stage 3: shirt buttons ping off and ricochet; one always hits Tommy (ragdoll).
- Stage 5: floorboards crack under footsteps.
- Stage 7: Orbit Snacks begin.
- Stage 9: NPCs need binoculars to see Ronnie's face.
- Stage 11: TV news: "LOCAL CHELSEA FAN VISIBLE FROM SPACE".
- Stage 12: Ronnie IS the level.

=========================================================================
12. FEATURE LIST — ORIGINAL 25 (all included, fully detailed)
=========================================================================
1. CHIN COUNTER — live tally on the wrist UI; each new chin triggers fanfare, confetti and "CHIN NUMBER SEVEN HAS ENTERED THE CHAT". Chins wobble in mirrors; 10+ chins play xylophone notes when Ronnie nods.
2. THE SOFA DENT — sofas fold around Ronnie like a taco. Getting up is a minigame (rock the headset back and forth) while Tommy pulls his arm: "on three... one... two... no, I'm not doing this."
3. CAN TOWER — every empty can adds to a tower in the corner. At 100+ it pokes through the ceiling; at 500 a plane swerves around it.
4. SHIRT SHRINK — shirt tightens each stage: stretched lettering → crop top → strip → collar → pings off and hits Tommy, who wears it as a wristband.
5. SEATBELT EXTENDER MINIGAME — clip extenders together (stage × 3 needed) before driving to the chippy. Tommy is squashed flat against the passenger window.
6. "RONNIE'S COMING" ALARM — air-raid sirens, shops slam shutters in a domino effect, a pigeon faints, local radio: "Lock up your fridges."
7. DOORWAY WEDGE — stuck in the kebab shop door; NPCs push with brooms; Tommy films; Ronnie pops through like a cork into a tray of chips.
8. MONSTOR WITHDRAWAL — 30 seconds without a can: shaking hands (haptics), grey screen, sad violin, "he's fading...". A can floods colour back with a heavenly choir.
9. FRIDGE RAID AT 3AM — stealth level: sneak to the fridge, avoid squeaky floorboards, fill the wake-o-meter at your peril. The fridge opens with an angelic glow.
10. ORBIT SNACKS — from Stage 7, small snacks orbit Ronnie like moons with sparkle trails; grab them from the air.
11. THE SCALE BREAKER — end-of-level weigh-in: "ONE AT A TIME PLEASE" → "ERROR" → explodes into orbit. Final weigh-in uses a lorry weighbridge, which also breaks.
12. DELIVERY DRIVER NPC — moves in gradually; by the end he hangs his own family photos and calls Ronnie "son".
13. BELLY DRUM — slap the belly to play notes that deepen each stage; hidden rhythm minigame while Tommy dances badly.
14. BATH OVERFLOW — a tsunami floods the house and washes Tommy out of the front door on a rubber duck.
15. CAN CRUSHER COMBO — crush cans on your forehead; 10 in a row leaves a can-shaped dent on Ronnie's head.
16. SWEAT PUDDLES — a glistening trail; NPCs slip like banana peels; Tommy always lands in a perfect pose.
17. TIGHT SQUEEZE LEVEL — a narrow alley to the kebab van; suck in (gains 2cm) or eat the crisp-flavoured brick walls.
18. TOMMY + HIDDEN TOMMY MODE — play as Tommy; Ronnie becomes the NPC and roasts back ("You're short", "You're OLD", "Is that a six-pack or a six-snack?"). Tommy grows if he eats.
19. ELEVATOR REJECTION — the lift sees Ronnie and closes. Ronnie gets a text from "Lift": "no." Tommy waves from inside the glass lift.
20. MONSTOR FLAVOUR EFFECTS — Pink (float), Ultra White (glow), Mango (everything turns to mango), Blue Chelsea Edition (stadium chant on every bite), "Rehab" (shrink one stage; covered in dust and cobwebs).
21. THE ROLLING PHASE — past Stage 10, Ronnie rolls Katamari-style, absorbing furniture, cars and buildings; Tommy surfs on top: "this is the most exercise you've done all year."
22. BUFFET BLACKLIST — WANTED posters everywhere; tiny disguises (moustache, sunglasses, "definitely not Ronnie" badge) that don't fit.
23. GRAVITY BUG — at max size, NPCs orbit Ronnie screaming; Tommy orbits too, doing sit-ups.
24. TWO-PLAYER CHONK-OFF — Ronnie vs Tommy race to be biggest; steal each other's food; loser buys the next round of MONSTOR; draws go to the older player (Tommy).
25. CREDITS SCENE — Ronnie, now a moon, does one press-up and causes global tides; Tommy narrates the credits like a nature documentary: "And that... was Ronnie. Born one day too late."

=========================================================================
13. NEW FEATURES (26–50)
=========================================================================
26. TOMMY'S HELPFUL ADVICE BOOTH — a little market stall Tommy sets up in every level with a sign "FREE HONEST ADVICE". Walk up and he gives a voiced "tip": "Have you tried... not?" Smash the booth (ragdoll physics on the planks) and he rebuilds it next level, bigger.
27. RONNIE CAM — a security camera in each level streams to a TV, showing Ronnie from behind. The caption reads "LIVE: RONNIE (estimated arrival of rest of Ronnie: 3 minutes)".
28. GYM MEMBERSHIP GHOST — a ghost of Ronnie's unused gym card floats around moaning "use meeee". Eating near it makes it cry.
29. SNACK RADAR — a wrist minimap pinging hidden food like a submarine sonar. Tommy's position shows as a sparkle icon labelled "Hot Mate".
30. TOMMY'S PHOTO WALL — a wall in every level where Tommy pins "before and after" photos of Ronnie. Every stage-up, a new "after" photo pins itself with a voiced caption.
31. FOOD FIGHT ARENA — a bonus level where Tommy and five NPC lads throw food at Ronnie. Catching food in your mouth scores triple. Full ragdoll chaos.
32. THE STAIRS OF DOOM — a staircase level. Each step creaks, groans and says something ("why", "oof", "call my mum"). The last step gives up and Ronnie slides down the whole flight on his belly like a toboggan.
33. RONNIE'S SHADOW — his shadow is visibly bigger than him, has its own googly eyes, and eats shadow food.
34. CHIPPY QUEUE SKIP — the queue parts like the Red Sea when Ronnie arrives, with dramatic biblical music. Tommy at the front turns around: "Oh, hi, Ron. I've been here since yesterday. One day before you, actually."
35. TRAMPOLINE OF NO RETURN — Ronnie jumps on a trampoline; it launches him into the sky, then he comes back down and makes a crater. Tommy, standing nearby, is launched across the map.
36. MONSTOR CAN BOWLING — use a doughnut as a bowling ball to knock over pyramids of MONSTOR cans. Tommy stands in as the head pin: "I'm just trying to help with the scoring!"
37. RONNIE'S DATING PROFILE — a screen showing Ronnie's dating app profile that updates as he grows: "Height: 6ft. Width: also 6ft." Tommy's profile shows up next to it with 9,000 matches.
38. WEIGHT LIFTING (BUT FOOD) — a weights bench where every plate is a pizza. Lift one rep, then eat the plates.
39. THE CORGI — a small dog follows Ronnie and gets flattened every time he stops suddenly (cartoon pancake, pops back up). It belongs to Tommy, who says "his name's Abs".
40. RONNIE'S VOICE ASSISTANT — a smart speaker that responds to every action: "Ordering more food." "Ordering a bigger house." "Calling structural engineer."
41. THE SPONSORSHIP DEAL — mid-game, a MONSTOR rep turns up with a giant cardboard cheque and a contract making Ronnie "Official Mascot". He immediately eats the cheque.
42. ICE CREAM VAN CHASE — a bonus level where the ice cream van tries to escape Ronnie, playing its chime faster and faster. Tommy drives the van.
43. CHRISTMAS JUMPER — a seasonal unlock: a festive jumper that says "HO HO HO" on Stage 1 and stretches to "HOOOOOOOOOOO" by Stage 12.
44. EARTHQUAKE ALERTS — every few minutes, a fake phone alert pops up in the HUD: "SEISMIC ACTIVITY DETECTED. CAUSE: RONNIE SAT DOWN."
45. TOMMY'S MOTIVATIONAL POSTERS — Tommy puts up posters of himself shirtless with slogans like "HARD WORK PAYS OFF" and "BE MORE TOMMY". Ronnie can eat the posters (they taste like protein).
46. SLOW-MO REPLAY — after every big moment (a Tommy launch, a 10x combo, a burp shockwave), an instant replay plays from three angles with a sports commentator voice.
47. THE NECK SEARCH — a side quest to find Ronnie's missing neck, with clues hidden in every level. At the end, the neck is found... inside a sausage roll.
48. RONNIE AWARDS CEREMONY — between levels, an awards show with categories like "Most Chins in a Single Minute" and "Biggest Shirt Casualty". Tommy hosts in a tuxedo and wins "Best Abs" every year.
49. PHOTO MODE — freeze time, move the camera around, add stickers ("ABSOLUTE UNIT", "BORN 1 DAY LATE", "CHONK"), and save a picture to send to the real Ronnie.
50. THE RONNIE ROAST NIGHT — a finale bonus level styled like a comedy club. Tommy does a full stand-up set about Ronnie (minimum 30 voiced jokes), the crowd laughs, and the player can throw food at Tommy mid-joke to heckle him. He ragdolls off the stage, climbs back on, and says: "I'm just trying to help... and I've got ten more minutes of material."

=========================================================================
14. AUDIO & MUSIC
=========================================================================
- Upbeat comedic music per level that gets faster, louder and bassier each stage.
- Full eating soundboard (section 8).
- Dramatic narrator: "RONNIE HAS REACHED STAGE 8: ABSOLUTE UNIT."
- Stadium crowd chants for big combos.
- Tommy's sparkle "ting!" on every smile; voiced dialogue with spatial audio and music ducking.
- Ragdoll impact SFX library: BONK, BOING, SPLAT, WALLOP, slide whistle, cartoon crash, distant "WORTH IIIIIIT".

=========================================================================
15. UI
=========================================================================
- Wrist UI (left hand): Chonk Meter, Chin Counter, MONSTOR MODE timer, combo counter, burp gauge, stage name, Snack Radar.
- Stage names: Little Ronnie → Snacky Ronnie → Chunky Ronnie → Big Ronnie → Very Big Ronnie → Ronnie XL → Ronnie XXL → Absolute Unit → Chonkosaurus → Ronzilla → Ronnie Has His Own Postcode → THE RONNIVERSE.
- End-of-level scorecard: total calories, cans chugged, chins gained, furniture destroyed, excuses shouted, Times Tommy Tried To Help, times Tommy reminded you he's older, distance Tommy was launched (metres).
- Pause menu: a giant pizza box; options on the slices.

=========================================================================
16. PROGRESSION & UNLOCKS
=========================================================================
- 1–3 stars per level based on final size.
- Unlockables: away and third kit shirts, Christmas jumper, a crown made of cans, a bib, new excuses, rare MONSTOR flavours, Tommy Mode, Tommy's Tactical Helping Gear, Roast Night level.
- Local leaderboard: friends compete for the fattest Ronnie and the furthest Tommy launch.

=========================================================================
17. TECHNICAL REQUIREMENTS
=========================================================================
- Unity 6.3 LTS, URP (Render Graph), Vulkan, OpenXR + Meta XR SDK, XR Interaction Toolkit 3.x — full settings in section 30.
- Object pooling for food, cans, particles and impact text.
- Growth via XR Origin scale + blend shapes; spring bones for belly/chin jiggle; limit physics recalculation per frame.
- Ragdoll system: active-ragdoll blend for Tommy and NPCs, with get-up animations; cap simultaneous active ragdolls at 6 for Quest performance; sleep ragdolls after they come to rest.
- Dialogue system: ScriptableObject line banks by trigger, priority + cooldown, no repeats within the last 8 lines, spatial AudioSource on Tommy's head, lip-sync, subtitles toggle, music ducking.
- Voice clips: pre-generated or pre-recorded, compressed as Vorbis, loaded per level; export a recording script CSV of every line.
- Audio manager: per-food sound sets with size-based pitch/reverb.
- Comfort menu: teleport/smooth, vignette, seated mode, height calibration, slow-motion toggle.
- JSON save system for unlocks, high scores and stats.
- Provide: folder structure, every script with comments, prefab list, scene hierarchy per level, and step-by-step Quest build instructions (APK sideload via Meta Quest Developer Hub).


#########################################################################
#########################################################################
##                                                                     ##
##            PART 2 — THE DEEP DESIGN BIBLE                           ##
##                                                                     ##
#########################################################################
#########################################################################

=========================================================================
18. TUNING TABLES (exact numbers — use these as defaults, expose all in Inspector)
=========================================================================

18.1 GROWTH STAGES
| Stage | Name                         | Chonk needed (cumulative) | XR rig scale | Belly blend | Chins | Footstep SFX         | Camera shake per step | Walk speed |
|-------|------------------------------|---------------------------|--------------|-------------|-------|----------------------|-----------------------|------------|
| 1     | Little Ronnie                | 0                         | 1.00         | 0%          | 1     | tap                  | 0.00                  | 1.00x      |
| 2     | Snacky Ronnie                | 100                       | 1.05         | 10%         | 2     | tap-thud             | 0.01                  | 0.97x      |
| 3     | Chunky Ronnie                | 250                       | 1.10         | 20%         | 2     | thud                 | 0.02                  | 0.94x      |
| 4     | Big Ronnie                   | 450                       | 1.18         | 30%         | 3     | THUD                 | 0.03                  | 0.90x      |
| 5     | Very Big Ronnie              | 700                       | 1.28         | 42%         | 4     | THOOM                | 0.05                  | 0.86x      |
| 6     | Ronnie XL                    | 1,000                     | 1.40         | 55%         | 5     | THOOM + rattle       | 0.07                  | 0.82x      |
| 7     | Ronnie XXL                   | 1,400                     | 1.60         | 66%         | 6     | THOOM + glass clink  | 0.09                  | 0.78x      |
| 8     | Absolute Unit                | 1,900                     | 1.90         | 76%         | 8     | seismic rumble       | 0.12                  | 0.74x      |
| 9     | Chonkosaurus                 | 2,500                     | 2.40         | 85%         | 10    | rumble + car alarms  | 0.15                  | 0.70x      |
| 10    | Ronzilla                     | 3,300                     | 3.20         | 92%         | 12    | (rolling — no steps) | 0.18 (rolling)        | roll       |
| 11    | Ronnie Has His Own Postcode  | 4,300                     | 5.00         | 97%         | 15    | earthquake siren     | 0.22                  | roll       |
| 12    | THE RONNIVERSE               | 5,500                     | 10.00+       | 100%        | ∞ (texture scroll) | cosmic boom | 0.25          | roll/float |

Notes:
- Stage-up transition: 0.6s scale tween with an overshoot (elasticOut) so Ronnie "boings" to the new size, then a 0.2s wobble.
- Camera shake must respect the comfort setting (Off / Low / Full). Default: Low.
- At stage 10+ the XR rig scale is applied to the environment interaction radius too, so Ronnie can still grab small food (auto-magnet radius 0.3m × scale).

18.2 COMBO TABLE
| Combo hits | Multiplier | Announcer line          | SFX                           | Tommy reaction bank |
|------------|------------|-------------------------|-------------------------------|---------------------|
| 3          | x2         | "DOUBLE DIP!"           | cash register ding            | Combo_x2            |
| 6          | x3         | "HAT-TRICK OF HUNGER!"  | stadium crowd roar (short)    | Combo_x3            |
| 10         | x5         | "BUFFET BREAKER!"       | air horn                      | Combo_x5            |
| 20         | x10        | "ABSOLUTE UNIT!!!"      | air horn ×3 + choir + explosion | Combo_x10         |
| 40         | x20        | "THE RONNIVERSE EXPANDS" | full orchestra hit + fireworks | Combo_x20 (secret) |
- Combo window: 1.5s, extended by 0.5s during MONSTOR MODE.
- Dropping food breaks the combo with the "NOOOOOO" slow-mo.

18.3 MONSTOR ENERGY
| Item                  | Chonk | MONSTOR MODE | Burp gauge fill | Notes |
|-----------------------|-------|------------|-----------------|-------|
| MONSTOR can (500ml)     | 15    | 10s        | 20%             | Tilt > 60° to chug; 1.2s chug time |
| MONSTOR Ultra Mega (2L) | 40    | 20s        | 50%             | Needs two hands; 3s chug with escalating gulp SFX |
| Flavour cans (rare)   | 20    | 10s + effect | 25%           | See feature 20 |
- UNLEASH THE MONSTOR: 5 cans within 45 seconds. 8s duration. Auto-hoover radius 3m × rig scale. Jet-engine SFX + green screen-edge glow + Tommy line from bank MonstorUnleashed.
- MONSTOR Withdrawal (feature 8) starts after 30s without a can, ONLY after the player has drunk at least 3 cans in the level.

18.4 BURP
- Burp gauge 0–100%. At 100% the gauge flashes and Ronnie's cheeks puff (blend shape). If not released within 10s, an involuntary burp happens anyway at double strength.
- Shockwave radius: 2m × rig scale. Force: 600N × rig scale applied to all ragdolls and loose rigidbodies. Breaks glass objects tagged "Breakable".
- Tommy's hair: hair mesh swaps to "HairRuined" variant for 15s. Tommy plays bank BurpHair, then a comb animation.

18.5 TOMMY RAGDOLL TUNING
| Attack          | Force                           | Ragdoll time | Slow-mo | Impact word | Line bank |
|-----------------|---------------------------------|--------------|---------|-------------|-----------|
| Light food hit  | 50N                             | 0 (flinch only) | No   | "SPLAT!"    | Hit_Light |
| Heavy food hit  | 200N                            | 1.5s         | No      | "WALLOP!"   | Hit_Heavy |
| Slap (fast)     | hand velocity × 120             | 2s           | if >4 m/s | "SLAP!"   | Hit_Slap |
| Belly bump      | 300N × rig scale                | 2.5s         | if stage ≥5 | "BOIIING!" | Hit_Belly |
| Sit on          | squash 0.2 Y scale, 3s          | 3s           | No      | "SQUISH!"   | Hit_Sat |
| Can spray       | 150N/s continuous for 2s        | 2.5s         | No      | "FWOOSH!"   | Hit_Spray |
| Burp            | see 18.4                        | 2s           | Yes     | "BWAAARP!"  | BurpHair |
| Thrown by hand  | throw velocity × 1.5            | until rest + 1s | if >10m | "YEEEET!" | Hit_Thrown / Hit_FarLaunch |
- Get-up: detect face-up / face-down from hips forward vector, blend 0.3s to the matching get-up animation.
- Invulnerability: 1.5s after getting up (prevents juggling lock); during this, he plays his "brushing himself off" animation.
- Ragdoll gravity multiplier: 0.7. Bounciness on physics material: 0.35. Angular drag: 0.5 (so he spins nicely).

=========================================================================
19. FOOD SPEC TABLE (every item: physics, sound set, special gag)
=========================================================================
For each food prefab create: mesh (low-poly, max 800 tris), googly-eye child objects with jiggle physics, Rigidbody (mass listed), a FoodData ScriptableObject, and a sound set (Bite / Chew loop / Swallow / Special).

| #  | Item                     | Mass | Chonk | Bites to finish | Bite SFX            | Swallow SFX          | Special gag (exact behaviour) |
|----|--------------------------|------|-------|-----------------|---------------------|----------------------|-------------------------------|
| 1  | Crisps                   | 0.1  | 5     | 1               | glass-shatter crunch | small gulp          | Bag inflates and POPS when grabbed; crisps confetti out |
| 2  | Chocolate bar            | 0.2  | 8     | 2               | snap                 | gulp + "mmm"        | Wrapper spins off by itself with a burlesque trumpet sting |
| 3  | Doughnut                 | 0.2  | 10    | 2               | squish               | gulp                | Can be slid onto a finger first; ringing it on Tommy = Hoopla |
| 4  | Pizza slice              | 0.3  | 12    | 2               | crunch + stretch     | slide-whistle gulp  | Cheese string stretches up to 2m (line renderer) before snapping with a TWANG |
| 5  | Burger                   | 0.5  | 15    | 3               | big CHOMP            | bass-drop GULP      | Bun opens/closes like a mouth, voice "eat me" when held |
| 6  | Kebab                    | 0.6  | 25    | 3               | wet SPLORCH          | gurgle              | Squeezing sprays garlic sauce decals in a 1.5m cone |
| 7  | Family bucket            | 2.0  | 35    | 1 (tip)         | avalanche crunch     | long GULP           | Must be tilted >90° over mouth; drumsticks rain in |
| 8  | Whole pizza              | 1.0  | 40    | 1               | frisbee whoosh + CHOMP | big gulp          | Throwable like a frisbee; catch it in your mouth for x2 Chonk |
| 9  | Entire cake              | 3.0  | 60    | 4               | squelch              | foghorn gulp        | Candles blow out when Ronnie breathes near it (mic input optional) |
| 10 | Christmas turkey         | 15.0 | 80    | 6               | car-crusher CRUNCH   | slide whistle down  | Too heavy to lift below Stage 4 — Tommy: "Need a hand? I'm just trying to help." |
| 11 | MONSTOR can                | 0.5  | 15    | chug            | PSSSHHT              | drain gurgle + "AHHH" | Shake then open = foam geyser |
| 12 | MONSTOR Ultra Mega         | 2.0  | 40    | chug (2-hand)   | huge PSSSHHHHT       | 3s gurgle           | Can is taller than Tommy |
| 13 | Full English             | 1.2  | 45    | 4               | sizzle + chomp       | gulp                | Beans slide down Ronnie's chin (decal on mirror reflection) |
| 14 | Sausage roll mountain    | 4.0  | 30    | 1 (avalanche)   | flaky crunch ×50     | rapid gulps         | Tap the mountain: it collapses into the mouth over 2s |
| 15 | Nugget bucket            | 1.0  | 20    | 1 per nugget    | crunch               | squeak "nugget!"    | Nuggets jump out of bucket and try to run; grab them |
| 16 | Fish and chips           | 1.0  | 35    | 3               | batter crunch        | gulp                | Newspaper headline: "RONNIE STRIKES AGAIN" |
| 17 | Cheesy chips + gravy     | 0.8  | 28    | 3               | squish               | gurgle              | Gravy pours like a waterfall particle when tilted |
| 18 | 10-ft hot dog            | 3.0  | 22    | 5               | snap                 | 3s slide whistle    | Physics chain (10 segments), floppy |
| 19 | Club sandwich            | 0.8  | 25    | 2               | CHOMP + creak        | gulp                | Ronnie's jaw unhinges (blend shape) with a snake hiss |
| 20 | Giant burrito            | 4.0  | 40    | 5               | SPLORCH              | gulp                | Same size as a sleeping bag; Tommy can be wrapped in it |
| 21 | Infinite noodles         | 0.6  | 18    | slurp           | —                    | 15s SHLUUURP        | Slurp sucks nearby small objects (napkins, cutlery) in |
| 22 | Ice cream tub            | 1.0  | 30    | 3               | cold crunch          | brain-freeze scream | Head turns blue for 5s, icicles on ears, teeth-chatter SFX |
| 23 | Cheesecake               | 2.0  | 50    | 4               | wobble squelch       | gulp                | Wobbles with soft-body jiggle |
| 24 | Jelly tower              | 2.0  | 25    | 3               | boing-squelch        | gulp                | Bounces around the room on its own |
| 25 | Pick 'n' mix             | 0.5  | 20    | 1               | slot-machine ding    | rapid gulps         | Sweets fire into the mouth with a jackpot jingle |
| 26 | Popcorn bucket           | 0.5  | 15    | 1               | firework pops        | gulp                | Pops inside the mouth: screen flashes with tiny fireworks |
| 27 | Curry + naan             | 1.5  | 45    | 3               | sizzle               | gulp + fire breath  | Breath of fire particle for 3s after; lights candles |
| 28 | 24-doughnut box          | 3.0  | 70    | 1               | multi-squish         | big gulp            | Doughnuts stack on fingers as rings first |
| 29 | Giant pretzel            | 0.8  | 20    | 3               | crunch               | gulp                | Can be worn as a necklace (snaps to neck socket) |
| 30 | Roast potato pile        | 2.0  | 30    | 1 per potato    | crispy crunch        | gulp                | Potatoes roll toward Ronnie as if attracted by gravity |
| 31 | Sofa-length Toblerone    | 5.0  | 55    | 9 (one per peak)| xylophone note per bite | gulp             | Each peak plays a note of a scale; finishing it plays a jingle |
| 32 | Golden Burger            | 1.0  | 200   | 3               | angelic CHOMP        | choir               | Slow-motion bite, fireworks outside, Tommy drops to his knees: "It's beautiful." |
| B  | Mystery Can              | 0.5  | ±     | chug            | PSSSHHT              | ???                 | 40% shrink one stage, 40% instant +1 stage, 20% float to ceiling 10s |

=========================================================================
20. TOMMY — EXTENDED DIALOGUE BANK (add to section 3; total must exceed 250 lines)
=========================================================================
Format for the data file: LineID | Bank | Emotion | Priority (1–5) | Text

20.1 MORE AGE-GAP LINES (Bank: AgeGap)
- "I've got a day's head start on life, Ron, and I've used it wisely. You've used yours on kebabs."
- "Twenty-four hours, Ronnie. That's how long I was the only one. Peaceful times."
- "On my first day on Earth, I didn't eat. On your first day, the hospital ran out of milk."
- "Elder statesman, me. Respect the wrinkles. I haven't got any, but respect them."
- "I'm older, so legally you have to listen to me. That's the law. Probably."
- "If I'm a day older, does that make you my apprentice? Lesson one: put the cake down."
- "The day I was born, the stars aligned. The day you were born, the snacks did."
- "One day apart and you've already overtaken me. In width."
- "Every year, I blow out my candles first. Then you eat them."
- "You'll always be my little brother, Ron. Well. Not little."
- "Born second, finished first. At every buffet."

20.2 MORE SIZE ROASTS (Bank: Roast_General)
- "Ron, your belly's got a belly."
- "You've got more rolls than a bakery."
- "When you walked in, the room tilted."
- "Your shirt's working harder than you ever have."
- "I tried to walk around you. I needed a packed lunch."
- "You don't have a six-pack, mate. You've got a party keg."
- "Your chins have a chin of their own."
- "I've seen smaller hot air balloons."
- "If you stood in a field, cows would think it was going to rain."
- "Ronnie, your phone screen has started zooming out on its own."
- "You're not big-boned, Ron. Your bones are just very, very supported."
- "I'd say you're the size of a house, but houses are jealous of you."
- "The ground just sighed."
- "You don't walk into a room. You arrive in instalments."
- "You've been knighted. By the Greggs Empire."
- "Ronnie, your belly button has an echo."
- "When you jump, the earth's orbit changes."
- "You're the reason they make the 'XXXL' label sideways."
- "If you were a Chelsea player, you'd be the whole back line."
- "You're like a beach ball that learned to eat."
- "Ron, I've got a six-pack. You've got the whole supermarket."
- "Your BMI is just a phone number now."
- "Mate, your trousers just asked to be transferred."
- "I can hear your belt crying."
- "There's an echo when you yawn now."
- "Stand still, Ron, I want to use you for shade."

20.3 MORE EATING REACTIONS (Bank: Eat_React — subdivided per food where marked)
- [Burger] "That burger had a name, Ron. It was called 'not yours'."
- [Kebab] "Garlic sauce in your eyebrows. Classic Ronnie."
- [Pizza] "You ate it like a frisbee. Who TAUGHT you that?"
- [Cake] "That was a wedding cake, Ronnie. Somebody's getting married without a cake now."
- [Turkey] "That turkey was bigger than me. Everything's bigger than me in this game. Except my abs."
- [Noodles] "That slurp lasted longer than my last relationship."
- [Ice cream] "Your head's gone blue. That's not a Chelsea thing, that's a brain freeze thing."
- [Toblerone] "Did you just PLAY a Toblerone?"
- [Golden Burger] "It's beautiful. I've never seen anything so... gone."
- [Nuggets] "They were running away, Ron. They KNEW."
- [Curry] "You've breathed fire on the smoke alarm. It's given up."
- [Sausage rolls] "That was fifty sausage rolls. Fifty. I counted. I'm good at counting. I've got six abs."
- [Generic] "You didn't eat that, you inhaled it."
- [Generic] "Somewhere a nutritionist just fainted."
- [Generic] "You ate that with your eyes before your mouth got there."
- [Generic] "I've seen bin lorries with more manners."
- [Generic] "That's not a meal, that's a heist."
- [Generic] "Chew, Ronnie. Chew. It's a mouth, not a post box."

20.4 MORE "I'M JUST TRYING TO HELP" LINES (Bank: Hit_*)
- "I'm just trying to help! Help is my love language!"
- "Hit me all you want, the scales won't change!"
- "I'm a helper, Ronnie! A HELPER!"
- "That's the thanks I get for being honest?"
- "You can knock me down, but you can't knock down the truth. Or a wall, apparently. You CAN knock down walls."
- "Right. Right. I'm fine. I'm just going to lie here and be handsome for a minute."
- "Ow! My face! My money-maker!"
- "Careful! These cheekbones are insured!"
- "This is what I get for caring!"
- "I've been thrown further than your diet plans."
- [Hit_Thrown] "Weeeeee— I'm just trying to heeeeelp—!"
- [Hit_FarLaunch, landing] "...I've landed in a pond. Still older than you."
- [Hit_Sat] "You're sitting on me. Everything's gone dark. Is this what the sofa feels like?"
- [Hit_Spray] "MONSTOR in my eyes! It burns with energy!"
- [Hit_Belly] "That belly's got more bounce than a trampoline park."
- [Hit_Slap] "You slap like you eat: fast and with no warning."
- [Hit_Repeat ×5] "Ronnie, this is the fifth time. I'm starting to think you don't want help."
- [Hit_Repeat ×10] "TEN times. I'm calling HR. Your mum is HR."
- [Hit_Repeat ×20] "Twenty. I'm getting a helmet. The helping must go on."

20.5 EXCUSE COUNTER-ROASTS (Bank: Excuse_Reply — one per excuse)
- "IT'S JUST WATER WEIGHT" → "Then you're a reservoir, Ron."
- "I'M BIG BONED" → "Your bones are fine, mate. It's the snacks around them."
- "THE CAMERA ADDS TEN STONE" → "There's no camera, Ron. This is just you."
- "THAT DIDN'T COUNT, IT WAS A SNACK" → "It was a turkey."
- "I'M YOUNGER, I'M STILL GROWING" → "Outwards, mate. You're growing outwards."
- "IT'S A BULK" → "A bulk has to stop at some point, Ronnie."
- "THESE ARE MUSCLES, TOMMY" → "Muscles don't jiggle when you blink."

20.6 ENVIRONMENT-SPECIFIC (Bank: Level_X)
- Bedroom: "Your bed's got a Ronnie-shaped crater. NASA want to study it."
- Bedroom: "Why have you got 400 empty cans and one sock?"
- Corner Shop: "The shopkeeper's crying, Ron. Grown man. Crying into a crisp packet."
- Kebab Shop: "The kebab man's built a statue of you. Out of doner."
- Buffet: "They've called in reinforcements, Ronnie. The waiters have SHIELDS."
- Birthday: "Happy birthday, Ron! My party was better. Smaller cake, though. Because I didn't eat it."
- Space: "We're in SPACE, Ronnie. You've got your own gravity and you're still hungry."

20.7 TOMMY MODE — RONNIE'S ROASTS OF TOMMY (Bank: TommyMode_RonnieLines)
(Ronnie's voice, played when the player is Tommy)
- "You're SHORT, Tommy. I could use you as an armrest."
- "Born a day earlier and you STILL haven't grown."
- "Is that a six-pack or a six-snack?"
- "You're so old, you remember the day before I was born."
- "Nice hair. Did your mum do it?"
- "You're like a fun-size version of a person."
- "You're not short, you're just... far away."
- "You eat salad like it owes you money."
- "Mate, you've got more hair gel than personality."
- "If I'm big, you're a travel-size Tommy."

20.8 ROAST NIGHT STAND-UP SET (Bank: RoastNight — feature 50, minimum 30)
Tommy's full stand-up set, delivered on stage with a mic, spotlight and brick wall. Laugh track after each joke (varied: chuckle, big laugh, applause break). Write 30+ jokes in this style:
- "Good evening! My name's Tommy, I'm one day older than Ronnie, and that's the most exercise he's ever let me have over him."
- "Ronnie's here tonight. Well, most of him. The rest is still coming through the door."
- "Ronnie went to the doctor. Doctor said, 'You need to lose weight.' Ronnie said, 'I want a second opinion.' Doctor said, 'Fine. You're also tall.'"
- "Ronnie's got so many chins, he needs a passport to visit his neck."
- "People ask me, 'Tommy, how'd you get abs like that?' I tell them: I stand next to Ronnie. It's a very flattering angle."
- "Ronnie drinks so much MONSTOR, when he cries, he cries Green Apple."
- "Ronnie got stuck in a revolving door once. It's now a non-revolving door."
- "We were born one day apart. I came out crying. Ronnie came out asking for the menu."
- "Ronnie's Uber rating is 4.9. The 0.1 is from the car's suspension."
- "Ronnie's a Chelsea fan. They asked him to be their new stadium."
- [heckle response when hit with food] "Is that the best you've got? Oh — that's a cheesecake. That actually hurt."
- [closing] "You've been a great crowd. Ronnie, you've been the crowd. Goodnight!"
(Continue to 30+.)

=========================================================================
21. ENVIRONMENTAL JOKE INVENTORY (per level — place ALL of these)
=========================================================================
Each entry: Object | Text/visual | Placement hint. All text: bold cartoon font, high contrast, minimum 2cm tall per metre of viewing distance.

21.1 LEVEL 1 — RONNIE'S BEDROOM (30)
1. Door sign | "RONNIE'S ROOM — WIDE LOAD ENTRANCE" | outside of door
2. Wardrobe labels | S, M, L, XL, XXL, XXXL, PARACHUTE | each drawer
3. Bed | Dent labelled "RONNIE CRATER — DO NOT FALL IN" | mattress
4. Pillow | Embroidered "Midnight Snack Storage" | pillow
5. Wall clock | All numbers are foods, hands are fork & spoon | above desk
6. Calendar | Every day: "CHEAT DAY"; Tommy's birthday: "TOMMY'S BIRTHDAY (THE BETTER ONE)"; next day: "Ronnie's (whatever)" | wall
7. Poster | "WANTED: RONNIE — LAST SEEN EATING" | wall
8. Poster | Tommy shirtless: "BE MORE TOMMY" | wall, opposite bed so it's the first thing Ronnie sees
9. Bookshelf | War and Pies; 50 Shades of Gravy; Lord of the Onion Rings; The Very Hungry Ronnie; How to Lose Weight (unopened, cling-filmed) | bookshelf
10. Gaming chair | Sticker "MAX LOAD: NOT YOU" | backrest
11. Monitor | Desktop wallpaper: Tommy's abs | desk
12. Fridge magnet (mini fridge) | "A moment on the lips, a lifetime on Ronnie" | mini fridge
13. Mini fridge | Padlock with a note: "nice try" (it's open) | mini fridge
14. Bin | Overflowing with cans, sign "THIS BIN IS FULL. SO IS RONNIE." | corner
15. Scales | Under the bed, cobwebbed, label "R.I.P." | under bed
16. Mirror | Sticky note: "Objects in mirror are larger than they appear" | mirror
17. Height chart | Tommy: "Tommy (perfect)"; Ronnie marks labelled by WIDTH | door frame
18. Chelsea scarf | Stretched across two walls because "it only fits like this now" | wall
19. Gym bag | Covered in dust, tag "First used: never" | wardrobe floor
20. Phone on bed | Notifications: "Greggs: We miss you (9 visits today)" | bed
21. Trophy shelf | "World's Okayest Eater" + "Most Chins 2026" | shelf
22. Framed photo | Tommy smiling, signed "To Ronnie, from your older, better mate x" | bedside table
23. Light switch | Labelled ON / OFF / SNACK | wall
24. Rug | Shaped like a pizza | floor
25. Window | View of the street with a sign: "RONNIE EXCLUSION ZONE 50M" | window
26. Smoke alarm | Sticker: "ALSO DETECTS KEBABS" | ceiling
27. Doormat | "WIPE YOUR CHINS" | inside door
28. Laptop | Browser tabs: "how to make more chins smaller", "Deliveroo", "Deliveroo", "Deliveroo" | desk
29. Shopping list | "1. MONSTOR. 2. MONSTOR. 3. Food for MONSTOR." | fridge door
30. Under-bed box | Labelled "EMERGENCY SNACKS (DAY 1 OF 1)" | under bed

21.2 LEVEL 2 — CORNER SHOP (30)
1. Door sign | "MAX 3 CUSTOMERS OR 1 RONNIE" | shop door
2. Shelf tag | "RONNIE-SIZE: serves 40, or 1 Ronnie"
3. Fridge wall | "MONSTOR: LIMIT 2 PER CUSTOMER. RONNIE: PLEASE."
4. Till screen | "UNEXPECTED ITEM IN BAGGING AREA: RONNIE"
5. CCTV monitor | Live feed: Ronnie from behind, caption "RONNIE DETECTED. ALERT LEVEL: GREGGS"
6. Newspaper rack | Headlines: "LOCAL MAN EATS SHOP", "CRISP SHORTAGE BLAMED ON ONE BLOKE", "TOMMY STILL GORGEOUS, SAY EXPERTS"
7. Magazine rack | Fitness mag cover: Tommy. Food mag cover: Ronnie, "COVER STAR (and back cover, and spine)"
8. Lottery sign | "1 in 14 million chance of winning. 1 in 1 chance Ronnie eats the ticket."
9. Sweet jars | Labels: "Ronnie's", "Also Ronnie's", "Ronnie's (backup)"
10. Shopkeeper's notice | "SHOPLIFTERS WILL BE PROSECUTED. RONNIE WILL BE PRAYED FOR."
11. Floor tiles | Cracked in the shape of Ronnie's footprints leading to the crisps
12. Fruit bowl | Dusty, with a sign "untouched since 2019"
13. Basket | Label "Ronnie basket" — it's a shopping trolley
14. Doorbell | Plays a dramatic "dun dun DUNNN" when Ronnie enters
15. Price board | "Crisps 99p. Crisps (Ronnie price): emotionally expensive"
16. Freezer | Ice cream tubs labelled "Ronnie's brain freeze collection"
17. Wall calendar | "DAYS SINCE RONNIE: 0"
18. Charity box | "Help Tommy's Abs Stay Strong"
19. Help sign | "Need assistance? Ask Tommy — he's just trying to help"
20. Card rack | Birthday card: "Happy Birthday to the Younger, Bigger One"
21. Diet shelf | Labelled "Ronnie Avoidance Aisle"; a tiny invisible forcefield bounces him off
22. Clock | Stuck on "SNACK O'CLOCK"
23. Water bottles | Small sign: "Ronnie has never touched these. Ever."
24. Bread aisle | Sign: "Rolls: we have lots. So does Ronnie."
25. Car park sign (outside) | "Ronnie parking: 4 spaces"
26. Delivery van (outside) | "DIRECT TO RONNIE DAILY"
27. Pigeon (outside) | Faints on Ronnie's arrival
28. Weighing scale for veg | Displays "STEP OFF" when Ronnie leans on it
29. Shop radio | Plays an advert: "Are you Ronnie? Please shop elsewhere."
30. Shopkeeper's crisp-packet helmet | Labelled "SAFETY GEAR"

21.3 LEVEL 3 — KEBAB SHOP (30)
1. Menu board | "RONNIE MEAL: everything, twice"
2. Menu board | "Small / Medium / Large / Ronnie / Ronnie (Large)"
3. Statue | Ronnie made of doner meat in the window
4. Wall of fame | 50 Polaroids of Ronnie, each labelled with a date — every date is today
5. Plaque | "VIP: Very Important Portion"
6. Garlic sauce cannon | Labelled "FOR RONNIE USE ONLY"
7. Air horn | Kebab Man blasts it each time Ronnie eats
8. Chair | Reinforced with scaffolding, sign "RONNIE'S SEAT"
9. Door frame | Measuring marks "Ronnie fit: 2019 ✓, 2022 ✓, 2024 ✓, TODAY: ✗"
10. Fryer | Sign "THIS FRYER HAS SEEN THINGS"
11. Fridge | MONSTOR cans stacked to the ceiling labelled "Ronnie's tab"
12. Receipt | Unrolls across the whole floor
13. Salad bar | Cobwebbed, "UNVISITED"; Tommy is the only person eating from it
14. Neon sign | "OPEN 24/7 FOR RONNIE"
15. TV | News: "KEBAB INDUSTRY RECORDS BEST YEAR, THANKS ONE MAN"
16. Napkin dispenser | Empty: "Ronnie used them all"
17. Tip jar | "Tips for Tommy (for being honest)"
18. Loyalty card | Framed; it has 9,000 stamps
19. Toilet sign | "Ronnie: please use the side entrance (it's bigger)"
20. Graffiti | "RONNIE WAS HERE (and here, and here, he's quite wide)"
21. Chip shovel | Labelled "Ronnie's spoon"
22. Spit roast | Turning by itself, sweating nervously
23. Clock | "2AM" — but the hands are kebab skewers
24. Takeaway bags | Printed "THANK YOU, RONNIE. PLEASE COME BACK. WE NEED THE MONEY."
25. Floor | "Caution: Ronnie sweat" wet floor sign
26. Hot sauce bottles | Labelled "Mild", "Hot", "Ronnie's Breath"
27. Outside bench | Snapped in half, flowers placed on it
28. Bus stop outside | Timetable: "Next bus: delayed by Ronnie in road"
29. Fox outside | Eating from a bin, staring at Ronnie with respect
30. Kebab Man's T-shirt | "I SURVIVED RONNIE'S ORDER"

21.4 LEVEL 4 — BUFFET (30)
1. Banner | "ALL YOU CAN EAT* (*except Ronnie)"
2. Poster | "RONNIE BANNED" with mugshot (front & side, side view is very wide)
3. Barricade tables | Spray-painted "NO RONNIES BEYOND THIS POINT"
4. Waiter riot shields | "PROTECT THE PUDDINGS"
5. Chocolate fountain | Sign "Ronnie: 3m exclusion zone" — becomes a waterfall when he leans
6. Carvery | Chef wearing armour
7. Sneeze guard | Replaced with a bank vault door
8. Plate stack | Ronnie's plate is a dustbin lid
9. Dessert table | Sign "Last line of defence"
10. Salad section | Labelled "Ronnie's never been here" with a guestbook signed only by Tommy
11. Manager's walkie-talkie | Crackles: "He's at the curry. Repeat, he's at the curry."
12. Price board | "Adults £15. Children £8. Ronnie: £400 + damages"
13. Toilet sign | "Ronnie use: book 24 hours in advance"
14. Fire exit | "Ronnie will not fit. Please use wall."
15. Ice sculpture | A swan that melts in fear as Ronnie approaches
16. Seating chart | Ronnie assigned tables 4, 5, 6 and 7
17. Loyalty wall | "Staff member of the month: Whoever stopped Ronnie"
18. TV | "Buffet stocks plummet as Ronnie enters building"
19. Waiter's notepad | "Ronnie order: yes"
20. Highchair | Labelled "Tommy" — Tommy furiously moves it away
21. Cheese board | Trembling
22. Spoon rack | Ronnie's spoon is a shovel
23. Bread basket | "Rolls (we have fewer than Ronnie)"
24. Mirror wall | Funhouse mirror labelled "Honest mirror"
25. Kids' menu (renamed "Light Bites") | "Not for Ronnie"
26. Ceiling | Cracked from where Ronnie jumped for the last profiterole
27. Health inspector certificate | "5 stars. Ronnie: 0 stars."
28. Plant pot | Ronnie has clearly tried to eat the plant; bite marks
29. Doorway | Widened with sledgehammer marks
30. Receipt printer | Smoking and printing "HELP"

21.5 LEVEL 5 — BIRTHDAY PARTY (30)
1. Banner | "HAPPY BIRTHDAY, YOUNGEST"
2. Banner | "TOMMY'S BIRTHDAY WAS YESTERDAY (BETTER PARTY)"
3. Balloons | Each printed "+1 DAY" ; one shaped like a chin
4. Cake | 12 tiers, top tier labelled "for Ronnie", every other tier labelled "also for Ronnie"
5. Leftover cake | From Tommy's party, tagged "Tommy's (yesterday, still better)"
6. Card table | 40 cards all saying "Happy Birthday... again... big man"
7. Card from Tommy | "Happy birthday, little brother. From your elder. P.S. Gym?"
8. Party hats | Ronnie's is a traffic cone
9. Photo booth | Props: "I'm older" sign (for Tommy), "I'm wider" sign (for Ronnie)
10. Bouncy castle | Sign "MAX WEIGHT: NOT RONNIE" — it pops
11. Piñata | Shaped like a salad. Ronnie refuses to hit it.
12. Presents | Ronnie's gifts: "Bigger shirt", "Even bigger shirt", "Tent (to wear)"
13. Tommy's present | A treadmill with a bow. Ronnie can eat the bow.
14. Grandma's apron | "FEED THE BOY"
15. Playlist screen | "Now playing: Ronnie's Birthday Bangers — 'Eat It' (instrumental, no lyrics)"
16. Pass-the-parcel | It's been unwrapped and eaten
17. Party game board | "Pin the Belly on Ronnie"
18. Chair | Reserved: "RONNIE (and 3 extra chairs)"
19. Candles | Number "1 day younger" candle
20. Fridge | Note from Mum: "Hide the trifle"
21. Trifle | Hidden in the oven. It's not hidden enough.
22. Guestbook | Tommy has signed every page
23. Kitchen sign | "Ronnie: ONE plate. ONE." (crossed out, "twelve")
24. Welcome mat | "BRACE YOURSELVES"
25. Garden gnome | Holding a sign "help"
26. Bunting | Flags spelling R-O-N-N-I-E but spaced wider and wider
27. Party bag | Contains only a MONSTOR can and a tape measure
28. Clock | Counting down to midnight: "Ronnie gets older (still younger than Tommy)"
29. Grandma's phone | Wallpaper: Ronnie as a baby, "he was always like this"
30. Disco ball | Reflects Ronnie and cracks

21.6 LEVEL 6 — SPACE (30)
1. Planet labels | "Mars", "Jupiter", "Ronnie", "Saturn"
2. Satellite | Turns its dish away from Ronnie
3. ISS window sign | "HOUSTON, WE HAVE A RONNIE"
4. Asteroid belt | Actually crumbs orbiting Ronnie
5. Space billboard | "MONSTOR Energy: Now Available Across The Galaxy (Ronnie Has Bought It All)"
6. Moon | Looking nervous, sweating, sign "I'm next, aren't I?"
7. Comet | Trail of crisps
8. Telescope on Earth | Pointed at Ronnie, caption "New Planet Discovered: R-1"
9. Alien ship | Aliens holding a sign "TAKE ME TO YOUR... oh no"
10. Space station | Has a doorbell labelled "Ronnie use only (won't fit)"
11. Star map | Constellation "The Big Dipper" redrawn as "The Big Ronnie"
12. Earth | Tilted slightly from Ronnie's gravity, caption "TILT: 23.5° → 31°"
13. Black hole | Sign "Even I have limits"
14. Rocket | "ROCKET (RONNIE-SIZED): UNDER CONSTRUCTION SINCE 2020"
15. Tommy's spacesuit | Clear chest panel so abs are visible
16. Flag | Tommy's flag on the moon: "TOMMY WAS HERE FIRST (ONE DAY EARLIER)"
17. Milky Way | Rebranded "Milky Ronnie"
18. Saturn's rings | Doughnuts
19. Floating sign | "SPACE: THE FINAL BUFFET"
20. Nebula | Shaped like a kebab
21. Mars rover | Fleeing at full speed
22. Sun | Wearing sunglasses, sign "Ronnie, you're blocking ME now"
23. Space junk | All empty MONSTOR cans
24. Radio chatter | "Ground control to Major Ronnie... put the can down"
25. Satellite dish | Receiving "Deliveroo order #1,000,000"
26. Gravity meter | Needle snapped off
27. Spacecraft fuel gauge | "MONSTOR"
28. Meteor | Shaped like a sausage roll, Ronnie can eat it
29. Stars | Some spell "CHONK"
30. Final scoreboard | Projected on the Moon's surface

=========================================================================
22. FEATURE SPECS — DEEP DETAIL (1–50)
=========================================================================
Each feature: TRIGGER • MECHANICS • NUMBERS • VISUALS • AUDIO • TOMMY • RAGDOLL • SCRIPTS • DONE WHEN

F1. CHIN COUNTER
- TRIGGER: every stage-up, plus +1 chin per 300 Chonk within a stage.
- MECHANICS: Chin blend shapes stacked; past 12 chins switch to a scrolling "chin accordion" texture on the neck.
- NUMBERS: max visible blend chins 12; accordion scroll speed 0.1 × chin count.
- VISUALS: wrist counter flips like an airport departure board; confetti burst (50 particles).
- AUDIO: fanfare (rising pitch per chin); at 10+, each nod plays xylophone notes C-D-E-F-G per chin.
- TOMMY: Bank Chin_New ("Chin number seven has entered the chat").
- SCRIPTS: ChinCounter.cs, ChinBlendController.cs.
- DONE WHEN: counter matches visible chins in mirror at all stages.

F2. THE SOFA DENT
- TRIGGER: Ronnie's hips enter a sofa's SitZone for 1s.
- MECHANICS: sofa mesh swaps to "Taco" variant (folds around). Get-up minigame: player must rock headset forward/back 5 times within 6s (detected via head Z velocity).
- NUMBERS: rocks required = 3 + stage/2.
- VISUALS: sofa springs fly out; dust cloud.
- AUDIO: CRUNCH on sit; creaks per rock; champagne POP on escape.
- TOMMY: pulls arm: "On three. One... two... no, I'm not doing this." Fails → "I'm just trying to help!"
- RAGDOLL: if Ronnie escapes with 5+ rocks, Tommy is flung backwards.
- SCRIPTS: SofaDent.cs, RockMinigame.cs.

F3. CAN TOWER
- TRIGGER: every finished can.
- MECHANICS: can instantiated at the top of the tower (stacked, kinematic until 50 cans, then physics wobble).
- NUMBERS: 100 cans breaks ceiling (spawn ceiling-hole decal); 500 spawns a plane flyby.
- AUDIO: clink per can; creak at 200+.
- TOMMY: "That tower's taller than me. Most things are, but still."
- SCRIPTS: CanTower.cs.

F4. SHIRT SHRINK
- TRIGGER: stage-ups.
- MECHANICS: 6 shirt mesh variants + lettering texture swap (see section 2.1). Collar pings at Stage 9 as a physics projectile aimed at Tommy (guaranteed hit).
- AUDIO: fabric strain creak; RIIIIP at each variant; collar "ping!".
- TOMMY: catches collar, wears as wristband: "Souvenir."
- SCRIPTS: OutfitStageController.cs.

F5. SEATBELT EXTENDER MINIGAME
- TRIGGER: interlude between Level 2 and 3 (car scene).
- MECHANICS: grab extenders from glovebox and clip them in a chain to the buckle. Needed = stage × 3.
- NUMBERS: 30s timer; each clip has a CLICK and a progress light.
- VISUALS: Tommy squashed against passenger window (squash blend 0.4).
- TOMMY: muffled through window: "I'm fine. My face is just on the glass now. Forever."
- DONE WHEN: car drives off and cuts to Level 3.

F6. "RONNIE'S COMING" ALARM
- TRIGGER: high-street walking interlude.
- MECHANICS: shops along the street are triggered in sequence (0.4s apart) as Ronnie approaches 10m.
- VISUALS: shutters slam (domino), lights off, "CLOSED" signs flip, pigeons faint (ragdoll pigeons, legs up).
- AUDIO: air-raid siren; radio: "Lock up your fridges."
- TOMMY: walking next to him: "Honestly, Ron, I think they've heard about you."

F7. DOORWAY WEDGE
- TRIGGER: entering the kebab shop door with rig scale > 1.2.
- MECHANICS: Ronnie stops; player must push forward on thumbstick while NPCs push from behind (spawn 3 broom NPCs). Progress bar fills; at 100%, POP.
- VISUALS: door frame bends; Ronnie's face squashes (blend shape).
- AUDIO: rubber squeak loop; champagne POP; landing SPLAT into chips.
- TOMMY: films on phone, flash going off: "This is going in the group chat."
- RAGDOLL: broom NPCs fall forward through the door after the pop.

F8. MONSTOR WITHDRAWAL
- TRIGGER: 30s since last can (only after 3 cans drunk).
- MECHANICS: controller haptics 0.3 amplitude pulsing; post-process saturation to -80 over 5s; walk speed -10%.
- AUDIO: sad violin; heartbeat slowing; narrator whisper "he's fading..."
- RESOLUTION: any can resets instantly with heavenly choir and saturation snap.
- TOMMY: "Ron? Ron, stay with me! I'll get you a can! ...Actually, have you tried water?"

F9. FRIDGE RAID AT 3AM
- TRIGGER: bonus stealth level (unlocked after Level 1).
- MECHANICS: dark house; wake-o-meter 0–100. Footsteps on floor = +8, on rug = +2, squeaky board = +25. Doors creak +15 if opened fast (hand velocity > 1 m/s). Fridge reached = win.
- VISUALS: moonlight through windows; parents' bedroom door with snoring Z's; fridge light angelic glow with god rays.
- AUDIO: tiptoe sneak music; THOOM footsteps comically loud anyway.
- TOMMY: whispering from inside a cupboard: "Psst. I'm just trying to help. Go left. No, YOUR left."
- FAIL: lights snap on, Mum NPC: "RONALD." (comic) → retry.

F10. ORBIT SNACKS
- TRIGGER: Stage 7+.
- MECHANICS: food items < 0.3kg within 4m × scale enter orbit (circular path, radius 1.2m × scale, speed 1 rev / 3s, faster each stage).
- VISUALS: sparkle trails; tiny planets-style rings.
- AUDIO: soft "whoosh" doppler as items pass the ears.
- TOMMY: "You've got MOONS, Ronnie."

F11. THE SCALE BREAKER
- TRIGGER: end of each level.
- MECHANICS: cutscene: Ronnie steps on scale; display sequence: number → "ONE AT A TIME PLEASE" → "ERROR" → smoke → explosion → scale launches into sky.
- FINAL: Level 6 uses a lorry weighbridge which snaps in half.
- TOMMY: steps on after: "Look, 11 stone of pure handsome."

F12. DELIVERY DRIVER NPC
- TRIGGER: every 90 seconds in Levels 1, 5 (and the house hub).
- MECHANICS: escalation states 1–6 saved between levels: knocks → lets himself in → sits on sofa → hangs his own photos → wears dressing gown → calls Ronnie "son".
- TOMMY: "Ron, who IS he? He's got a key. He's got slippers."

F13. BELLY DRUM
- TRIGGER: both hands strike the belly collider with velocity > 1 m/s.
- MECHANICS: note pitch = base note minus (stage × 1 semitone). Hidden rhythm game: hit when beats reach the belly target (12 beats, 3 songs, original music only).
- AUDIO: bongo → tom → bass drum → timpani → whale call.
- TOMMY: dances badly with a spotlight; "I'm the backing dancer. The good-looking one."

F14. BATH OVERFLOW
- TRIGGER: Ronnie enters the bath.
- MECHANICS: water volume displaced → water plane rises and floods the house (shader water, rising 0.3m/s for 4s).
- VISUALS: wave sweeps Tommy out of the front door on a giant rubber duck.
- AUDIO: SPLOOSH; tidal wave roar; duck squeak.
- TOMMY (fading): "I'm just trying to heeeeelp—"

F15. CAN CRUSHER COMBO
- TRIGGER: empty can held to forehead and pushed > 0.8 m/s.
- MECHANICS: can mesh swaps to crushed; combo counter; 10 crushes in 20s = forehead dent decal for 30s.
- AUDIO: metal CRUNK; crowd "OOOH".
- TOMMY: "Mate, your forehead is now recyclable."

F16. SWEAT PUDDLES
- TRIGGER: walking at Stage 4+.
- MECHANICS: decal puddles every 1.5m; any NPC stepping on one triggers slip ragdoll (feet thrown forward).
- AUDIO: slide whistle up, cartoon crash.
- TOMMY: slips, but lands in a perfect pose every time with a "ting!": "Nailed it."

F17. TIGHT SQUEEZE LEVEL
- TRIGGER: alley section in Level 3.
- MECHANICS: two options: "Suck In" (hold both triggers, reduces collider 2cm, Ronnie's face goes red) or eat the walls (bricks are food items, Chonk 5 each, taste like crisps).
- TOMMY: "Have you tried being thinner? I'm just trying to help."

F18. TOMMY + HIDDEN TOMMY MODE
- UNLOCK: finish Level 6.
- MECHANICS: player avatar swaps to Tommy (shorter rig height, six-pack, spotlight follows). Ronnie becomes the NPC with his own line bank (20.7). Tommy also grows if he eats — his abs disappear one by one with a sad "ting" in reverse.
- SPECIAL: Tommy Mode stage names: Perfect Tommy → Slightly Less Perfect → Tommy Has Eaten → Ron Was Right.

F19. ELEVATOR REJECTION
- TRIGGER: pressing the lift button at the buffet hotel.
- MECHANICS: doors open, pause 1s, "look" at Ronnie (camera-shaped sensor), close. Ronnie's wrist phone buzzes: text from "Lift": "no."
- TOMMY: rides up in the glass lift, waving slowly.

F20. MONSTOR FLAVOUR EFFECTS — see 18.3. Each flavour has unique can colour, effect duration 10–15s, and a unique Tommy line.

F21. THE ROLLING PHASE
- TRIGGER: Stage 10.
- MECHANICS: locomotion switches to sphere-roll physics (Katamari): things smaller than 30% of Ronnie's size stick to him and add Chonk.
- VISUALS: absorbed objects visibly stuck on him (cars, lamp posts, a confused cow).
- TOMMY: surfing on top: "This is the most exercise you've done all year!"
- COMFORT: rolling view uses a stabilised camera (horizon locked) — camera does NOT roll.

F22. BUFFET BLACKLIST
- MECHANICS: WANTED posters in every eatery. Disguise unlocks: fake moustache, sunglasses, "definitely not Ronnie" badge, a hat. Each is comically tiny on him. NPCs see through it instantly: "Hello, Ronnie."
- TOMMY: "Brilliant disguise, mate. Nobody will notice the 9-foot Chelsea fan."

F23. GRAVITY BUG
- TRIGGER: Stage 12.
- MECHANICS: all NPC ragdolls within 30m pulled into orbit (custom gravity field). Max 6 active orbiters for performance; others freeze in a fun "floating" pose.
- TOMMY: orbits calmly doing sit-ups: "Core work."

F24. TWO-PLAYER CHONK-OFF
- MODES: local (pass-and-play) and online (Photon Fusion or Netcode for GameObjects).
- RULES: 3-minute arena, shared food spawns, steal from each other's hands. Winner = biggest.
- DRAW RULE: Tommy wins "because he's had an extra day of practice".
- END SCREEN: "LOSER BUYS THE NEXT ROUND OF MONSTOR".

F25. CREDITS SCENE — see section 12. Tommy narrates in a whispering nature-documentary voice. Credits list jokes too ("Catering: Ronnie. Also Catering: Ronnie. Lead Abs: Tommy.")

F26. TOMMY'S HELPFUL ADVICE BOOTH
- Stall with sign "FREE HONEST ADVICE". Pressing A near it plays a random "tip" ("Have you tried... not?", "Stairs, Ron. They're like a lift but for legs.").
- Smashable: 12 plank rigidbodies. Rebuilt next level, bigger and with a padlock.

F27. RONNIE CAM — security camera render texture on a TV, rear view of Ronnie, caption "LIVE: RONNIE (rest of Ronnie arriving in 3 mins)".

F28. GYM MEMBERSHIP GHOST — translucent card ghost with a sad face floats near Ronnie wailing "use meeeee". Eating within 2m makes it cry (tear particles). Tommy: "Even your gym card's given up."

F29. SNACK RADAR — wrist minimap, sonar ping every 3s revealing hidden food within 15m. Tommy shown as sparkle icon "Hot Mate".

F30. TOMMY'S PHOTO WALL — corkboard in every level; on each stage-up, a Polaroid of Ronnie's current size pins itself with a THUNK and Tommy captions it aloud ("After. After-after. After-after-after.").

F31. FOOD FIGHT ARENA — bonus level, 2 minutes, Tommy + 5 lads throwing food. Catch in mouth = x3 Chonk. Throw back to ragdoll them. Max 6 active ragdolls.

F32. THE STAIRS OF DOOM — 14 talking steps (each a different voice line: "why", "oof", "call my mum", "I had a family"). Step 14 gives up; Ronnie toboggans down on his belly (sled physics). Tommy at the bottom: "Need a hand?" — gets bowled over.

F33. RONNIE'S SHADOW — projected shadow mesh 1.5x bigger, with googly-eye decals; occasionally eats a shadow burger independently.

F34. CHIPPY QUEUE SKIP — 10 queue NPCs part like the Red Sea with biblical choir. Tommy at the front: "I've been here since yesterday. One day before you, actually."

F35. TRAMPOLINE OF NO RETURN — jump → launch (vertical impulse 30 × scale) → land → crater decal + shockwave (Tommy launched across the map, 15m+ = "WORTH IIIIT"). Comfort: fade to black during flight if comfort mode on.

F36. MONSTOR CAN BOWLING — 10-can pyramid, doughnut bowling ball, Tommy stands in as head pin, wearing a can costume. Strike = Tommy ragdolls; spare = Tommy wobbles and says "I'm just trying to help with the scoring!"

F37. RONNIE'S DATING PROFILE — wall screen; profile stats update per stage ("Height: 6ft. Width: also 6ft." → "Width: Yes."). Tommy's profile next to it: "9,000 matches. Bio: older."

F38. PIZZA WEIGHT BENCH — barbell with pizza plates; do 1 rep (lift both controllers above head), then eat the plates. Tommy spots: "Light weight! Literally, you're eating it."

F39. THE CORGI "ABS" — Tommy's dog follows Ronnie; flattens into a pancake (squash 0.1) when Ronnie stops suddenly, pops back with a "boing". Never hurt; just flat for a moment.

F40. RONNIE'S VOICE ASSISTANT — smart speaker reacting to actions: "Ordering more food." "Ordering a bigger house." "Calling structural engineer." "Ordering Tommy a helmet."

F41. THE SPONSORSHIP DEAL — mid-game cutscene: MONSTOR rep with a giant cardboard cheque; Ronnie eats the cheque. Rep: "...that was your money." Tommy: "Best investment you've ever made."

F42. ICE CREAM VAN CHASE — bonus level; van chime speeds up the closer Ronnie gets (pitch 1.0 → 2.0). Tommy is driving: "I'm just trying to help you get your steps in!"

F43. CHRISTMAS JUMPER — seasonal unlock; "HO HO HO" stretches to "HOOOOOOOOOOO" by Stage 12; a reindeer on the front widens into a hippo.

F44. EARTHQUAKE ALERTS — HUD phone alert every 3–5 minutes: "SEISMIC ACTIVITY DETECTED. CAUSE: RONNIE SAT DOWN." / "CAUSE: RONNIE SNEEZED." / "CAUSE: RONNIE HEARD A CRISP PACKET."

F45. TOMMY'S MOTIVATIONAL POSTERS — shirtless Tommy posters ("HARD WORK PAYS OFF", "BE MORE TOMMY", "ONE DAY OLDER, ONE DAY WISER"). Edible (Chonk 3, "tastes like protein").

F46. SLOW-MO REPLAY — triggers on: Tommy launch > 10m, combo x10, burp shockwave hitting 3+ NPCs. 3 camera angles, 4 seconds each, sports commentator VO ("Look at the height on that! Tommy's still talking!"). Skippable with A. Shown on a floating screen (not taking over the player's view, for comfort).

F47. THE NECK SEARCH — side quest; 6 clue notes (one per level) e.g. "Last seen: 2018, near a chin". Finale: neck found inside a sausage roll; Ronnie eats it. Tommy: "You've eaten your own neck, Ron."

F48. RONNIE AWARDS CEREMONY — between-level awards show; categories pull real stats from the save file (Most Chins in a Minute, Biggest Shirt Casualty, Longest Tommy Launch). Tommy hosts in a tuxedo and always wins "Best Abs".

F49. PHOTO MODE — freeze time, free camera, stickers ("ABSOLUTE UNIT", "BORN 1 DAY LATE", "CHONK"), frames (Chelsea-blue border), save to Quest gallery.

F50. THE RONNIE ROAST NIGHT — comedy club level; Tommy performs Bank RoastNight (30+ jokes). Player heckles with food; Tommy ragdolls off stage, climbs back: "I'm just trying to help... and I've got ten more minutes of material." Audience NPCs laugh harder each time Tommy is hit.

=========================================================================
23. NPC REACTION LIBRARY (shared animations, all exaggerated)
=========================================================================
| Reaction ID | Animation | Sound | Used when |
|---|---|---|---|
| R_JawDrop | jaw extends to floor with a spring | "AWOOGA" horn | first sight of Ronnie each level |
| R_EyePop | eyes extend on springs and boing back | "BOING-OING" | Ronnie stages up near them |
| R_HairUp | hair stands straight up | static zap | burp near them |
| R_HatFly | hat launches upward | slide whistle | Ronnie stomps |
| R_PlankFall | freezes, falls stiff like a plank | wooden THUNK | Stage 9+ sighting |
| R_Faint | hand to forehead, swoon ragdoll | "ohhh" + harp | eating something huge |
| R_Applaud | slow clap building to standing ovation | clap loop | combo x10 |
| R_Pray | drops to knees, hands up | choir | Golden Burger eaten |
| R_Run | cartoon wind-up legs, then sprint off | zip SFX | Stage 11+ |
| R_Phone | films Ronnie on phone, flash | camera click | any big moment |

=========================================================================
24. MUSIC DIRECTION (original compositions only)
=========================================================================
- Bedroom: lo-fi bedroom beat, slowly gaining a bassline as Ronnie grows.
- Corner Shop: jaunty accordion polka.
- Kebab Shop: late-night synthwave with air-horn stabs.
- Buffet: heist music (pizzicato strings), switching to action drums when barricades appear.
- Birthday: party pop, with a kazoo version of the main theme.
- Space: epic orchestral with choir chanting "RON-NIE" in Latin-style syllables.
- Stage-ups: every track has 4 intensity layers; add one layer per 3 stages.
- Main theme: a chant-able stadium tune (original) that the crowd hums on big combos.

=========================================================================
25. ACCESSIBILITY & COMFORT
=========================================================================
- Comfort presets: Comfortable (teleport, vignette, no shake, no slow-mo), Moderate, Full Chaos.
- Seated mode with height offset.
- Subtitles with speaker colour (Tommy = gold, Ronnie = blue, NPCs = white).
- Colour-blind-safe UI colours for meters.
- Volume sliders: music, SFX, Tommy voice, NPC voices, narrator.
- "Photosensitivity" toggle to remove flashes and fireworks strobe.

=========================================================================
26. SCRIPT ARCHITECTURE (create all of these)
=========================================================================
Core
- GameManager.cs — state machine (Menu, Playing, Paused, Cutscene, Scorecard), level loading.
- SaveSystem.cs — JSON save/load for stats, unlocks, Delivery Driver state, Neck Search clues.
- StatsTracker.cs — calories, cans, chins, excuses, Times Tommy Tried To Help, launch distance, furniture destroyed.
Player
- RonnieGrowth.cs — Chonk Meter, stage thresholds (from GrowthTable SO), rig scale tween, blend shapes.
- MouthEater.cs — mouth trigger collider, bite logic, combo timing.
- MonstorSystem.cs — MONSTOR MODE, Unleash, withdrawal, flavours.
- BurpSystem.cs — gauge, shockwave, involuntary burp.
- ExcuseShouter.cs — A-button excuses, triggers Tommy reply.
- BellyDrum.cs, CanCrusher.cs, SlapDetector.cs, RollingLocomotion.cs.
- OutfitStageController.cs — shirt, joggers, sliders swaps.
Food
- FoodItem.cs + FoodData (ScriptableObject) — chonk, bites, sound set, special gag hook.
- FoodSpecialBehaviours/ — one script per gag (CheeseStretch.cs, NuggetRunner.cs, GarlicSpray.cs, NoodleSlurp.cs, BrainFreeze.cs, TobleroneXylophone.cs, etc.)
- FoodSpawner.cs + ObjectPool.cs.
Tommy
- TommyController.cs — follow AI (NavMesh), idle behaviours, spotlight.
- TommyDialogue.cs — line banks (DialogueBank SO), priority, cooldown, no-repeat window 8.
- VoicePlayer.cs — spatial AudioSource, lip-sync driver, subtitles, music ducking.
- TommyRagdoll.cs — animated↔ragdoll blending, get-up, invulnerability, hit counter, Tactical Gear unlock.
- TommyHitReceiver.cs — routes attack types to force + line bank.
NPCs
- NPCReactions.cs — reaction library (section 23).
- NPCRagdoll.cs — shared ragdoll (max 6 active, sleep on rest).
- DeliveryDriver.cs, Shopkeeper.cs, BuffetSecurity.cs, Grandma.cs, KebabMan.cs.
World
- EnvironmentJokeSign.cs — text + optional size-dependent text variants.
- DynamicSign.cs — changes text by Ronnie's stage (PUSH → GIVE UP).
- NewsTicker.cs — rotating headlines per stage.
- BreakableProp.cs, SofaDent.cs, CanTower.cs, ScaleBreaker.cs, Elevator.cs, Bath.cs.
Audio
- AudioManager.cs — pooled sources, pitch/reverb by stage, music layers.
- FootstepSystem.cs — stage-based footsteps + camera shake (comfort-aware).
UI
- WristUI.cs, Scorecard.cs, PauseMenuPizza.cs, PhotoMode.cs, SubtitleBubble.cs.
Multiplayer
- ChonkOffManager.cs (local + online).

=========================================================================
27. QA CHECKLIST (test after every phase)
=========================================================================
[ ] 72fps minimum on Quest 3 in every level with 6 active ragdolls.
[ ] Every food item can be eaten at every stage (magnet radius works at large scale).
[ ] Tommy never says the same line twice within 8 lines.
[ ] Tommy always speaks within 2s of a qualifying trigger.
[ ] Tommy always gets back up after ragdoll (no stuck states; teleport-reset if stuck > 6s).
[ ] Every level has 30+ environmental jokes, all readable from 2m.
[ ] Comfort presets correctly disable shake, slow-mo and flashes.
[ ] Save file persists all stats and unlocks across sessions.
[ ] No real brand logos (Chelsea, Monster) in any public build.

=========================================================================
28. FINAL INSTRUCTION TO THE AI BUILDER
=========================================================================
This is a big project. Do NOT try to output everything at once. Work in the phases listed at the top. At the start of each response, state which phase and which sections you are implementing. Ask me to test in the headset before moving to the next phase. When a section here says "write more lines in this style", actually write them out in full in the data files — no placeholders like "etc." in shipped content.


#########################################################################
#########################################################################
##                                                                     ##
##       PART 3 — ART, 3D MODELS & VISUAL QUALITY BIBLE                ##
##       "Make it look stunning on a Quest 3"                          ##
##                                                                     ##
#########################################################################
#########################################################################

The goal of Part 3: when someone puts the headset on, their first reaction should be "wow, this looks amazing", immediately followed by laughing. The game must look like a premium animated film you can stand inside — not a cheap asset flip — while holding 90fps on a standalone Quest 3.

=========================================================================
29. ART DIRECTION
=========================================================================

29.1 THE LOOK IN ONE SENTENCE
"A premium stylised 3D animated comedy film, in VR": chunky rounded shapes, rich saturated colour, soft painterly lighting, crisp ink outlines on characters, glossy over-the-top food, and everything slightly too big.

29.2 STYLE PILLARS (every asset must pass all five)
1. CHUNKY & SOFT — No sharp, thin or spindly shapes. Every edge has a bevel. Every object looks squeezable. Minimum bevel on hard-surface props: 1.5cm at real-world scale.
2. EXAGGERATED PROPORTIONS — Things the joke is about are oversized. Food is 1.3–2x real size. Cans are 1.25x. Door frames are slightly narrow (to make Ronnie look wider). Tommy's jaw and abs are slightly too perfect.
3. READABLE AT A GLANCE — In VR, silhouettes and colour blocks matter more than tiny detail. A player should recognise every prop from 5 metres away by shape and colour alone. Detail goes in shape, not in noisy textures.
4. APPETISING — Food must look delicious enough to want to eat in real life. Glossy highlights, steam, melted cheese, sauce drips, crispy edges. Food is the hero of the art.
5. ALIVE — Nothing is perfectly still. Googly eyes jiggle, steam rises, signs sway, plants wobble when Ronnie stomps, lights flicker gently, dust floats in light beams.

29.3 SHAPE LANGUAGE
- RONNIE: circles and ovals. Round belly, round cheeks, round shoulders. At high stages he becomes almost a perfect sphere with limbs.
- TOMMY: a confident inverted triangle (broad shoulders, narrow waist), strong bearded jaw, crisp perfect curtain hair. He is the only "sharp" thing in the world — visually he doesn't belong, which is the joke.
- FOOD: soft blobs, swollen and plump, slightly "inflated" like it's about to burst.
- ENVIRONMENTS: mostly rounded rectangles, slightly wonky (nothing perfectly straight — walls lean 1–2°, shelves sag in the middle).
- NPCs: simple pill and bean shapes so they never compete with Ronnie and Tommy.

29.4 MASTER COLOUR PALETTE (hex values — use these as the base of every material)
| Role | Name | Hex |
|---|---|---|
| Ronnie shirt | Kings Road Blue | #1D4FD8 |
| Ronnie shirt trim | Shirt White | #F4F6FB |
| Ronnie joggers | Jogger Grey | #8A8F99 |
| Ronnie skin (base) | Warm Peach | #F2B98F |
| Ronnie skin (shadow) | Rose Shadow | #C9806A |
| Tommy T-shirt | Spotless White | #FFFFFF |
| Tommy skin | Golden Glow | #E9A877 |
| Tommy hair | Espresso | #3B2418 |
| Tommy sparkle | Smug Gold | #FFD54A |
| MONSTOR can | Can Black | #141414 |
| MONSTOR claw | Toxic Green | #7CFF2B |
| MONSTOR MODE glow | Radioactive Lime | #A6FF00 |
| Food — bread/pastry | Golden Crust | #E3A33B |
| Food — cheese | Molten Cheddar | #FFB627 |
| Food — sauce red | Ketchup | #D7263D |
| Food — garlic sauce | Garlic Cream | #FFF4D6 |
| Food — chocolate | Cocoa | #5A2E1A |
| UI primary | Chonk Orange | #FF7A1A |
| UI secondary | Combo Pink | #FF3FA4 |
| UI text outline | Ink | #1B1B2F |
| Character outlines | Ink Navy | #1B1B2F (never pure black) |
Rules: no pure black (#000) or pure white surfaces except Tommy's T-shirt (deliberately too bright — it glows). Shadows are tinted (purple-blue in cool scenes, warm brown in warm scenes), never grey.

29.5 REFERENCE MOODBOARD (describe these qualities; do not copy any specific film, game or character)
- Premium animated feature-film lighting: soft key light, warm bounce, cool rim.
- Stylised VR comedy games: chunky, toy-like props that feel great to pick up.
- Food advertising photography: backlit steam, glistening highlights, macro drips.
- Claymation: slightly lumpy, hand-made surfaces and squash-and-stretch.

=========================================================================
30. ENGINE & RENDER SETTINGS (Quest 3)
=========================================================================

30.1 VERSIONS
- Unity 6.3 LTS (6000.3.x). Universal Render Pipeline with Render Graph enabled (required for URP Application SpaceWarp, which needs Unity 6.1+ and OpenXR 1.11+).
- Graphics API: Vulkan only.
- XR: OpenXR plug-in + Meta Quest Support feature, Meta XR Core SDK, XR Interaction Toolkit 3.x.
- Interaction profiles: Oculus Touch Controller Profile + Meta Quest Touch Plus Controller Profile.
- Target devices in manifest: Quest 3 and Quest 3S (Quest 2 optional with a "Low" quality preset).

30.2 URP ASSET — "Quest_High"
- HDR: OFF (major cost on Quest; get the "glow" look from emissive colours + fake bloom sprites instead — see 33.6).
- Render Scale: 1.0 (dynamic resolution allowed between 0.85 and 1.1).
- Anti-aliasing: MSAA 4x. IMPORTANT: there is a known issue where Vulkan foveated rendering can be disabled when MSAA is on. Test both "MSAA 4x + no foveation" and "MSAA 2x + SRP foveation" on device with the OVR Metrics Tool and keep whichever looks best at 90fps. Thin outlines shimmer badly without MSAA, so MSAA has priority.
- Main light: per-pixel, shadows ON for characters only (see 33.3). Shadow resolution 1024, 1 cascade, distance 8m.
- Additional lights: per-vertex, max 2, no shadows.
- Depth texture: OFF unless a specific effect needs it. Opaque texture: OFF.
- Post-processing: OFF in the URP renderer. Colour grading is baked into materials and lighting instead (see 33.5). (Full-screen post on mobile VR is expensive.)
- SRP Batcher: ON. GPU Resident Drawer: test, keep only if it reduces CPU time on device.
- Foveation: SRP Foveation (Unity 6 recommended path), level "Medium", dynamic ON.

30.3 APPLICATION SPACEWARP (performance safety net)
- Enable URP Application SpaceWarp via the Meta SDK. All custom shaders MUST write motion vectors (add a MotionVectors pass in every custom Shader Graph / HLSL shader).
- Use SpaceWarp only in the two heaviest moments (Rolling Phase in big levels, Space finale) where frame rate would otherwise drop — it renders at half rate and synthesises frames. Never rely on it for the whole game. Test for jitter on fast-moving objects (thrown Tommy, orbiting snacks) and disable it if artefacts appear.

30.4 TEXTURES
- Compression: ASTC. 6x6 for colour maps, 4x4 for hero characters' faces and food close-ups, 8x8 for large environment surfaces.
- Mipmaps ON for everything in world space. Anisotropic filtering x4 on floors only.
- Max sizes: hero characters 2048, hero food 1024, props 512, environment trims and atlases 2048.

30.5 QUALITY PRESETS (selectable in settings)
- "Stunning" (Quest 3 default): everything above.
- "Smooth" (Quest 3S / players sensitive to frame drops): MSAA 2x, character shadows off (blob shadows only), particle counts halved, render scale 0.9.
- "Low" (Quest 2): as Smooth plus LOD bias 0.7 and steam/dust particles off.

=========================================================================
31. PERFORMANCE BUDGETS
=========================================================================
Meta's own internal guidance puts Quest 3 at roughly 1.3–1.8 million triangles per frame and around 200–300 draw calls for a "busy simulation" — but these vary frame to frame. Ronnie Simulator IS a busy simulation (physics, ragdolls, particles), so we budget conservatively and keep headroom for the chaos.

31.1 PER-FRAME TARGETS (measured in the busiest view of each level)
| Metric | Target | Hard ceiling |
|---|---|---|
| Frame rate | 90fps | never below 72fps |
| GPU frame time | ≤ 9.5ms | 11ms |
| CPU frame time | ≤ 9ms | 11ms |
| Visible triangles | ≤ 600k | 900k |
| Draw calls (batches) | ≤ 180 | 250 |
| SetPass calls | ≤ 50 | 80 |
| Active ragdolls | ≤ 4 | 6 |
| Active particles | ≤ 2,000 | 3,500 |
| Texture memory | ≤ 900MB | 1.2GB |
| Unique materials visible | ≤ 40 | 60 |

31.2 PER-ASSET TRIANGLE BUDGETS (LOD0 / LOD1 / LOD2)
| Asset | LOD0 | LOD1 | LOD2 | Materials |
|---|---|---|---|---|
| Ronnie (player body, all stages share topology) | 28,000 | n/a (player) | n/a | 3 (body, outfit, face) |
| Tommy | 22,000 | 11,000 | 4,000 | 3 (body, outfit, hair) |
| Main NPC (shopkeeper, kebab man, etc.) | 10,000 | 5,000 | 1,500 | 1 (atlased) |
| Background NPC | 4,000 | 1,500 | 500 | 1 (shared atlas) |
| Hero food (Golden Burger, cake, turkey) | 4,000 | 1,500 | 400 | 1 |
| Standard food | 1,500 | 600 | 150 | 1 (shared food atlas) |
| MONSTOR can | 800 | 300 | 80 | 1 |
| Large prop (bed, sofa, fridge, counter) | 3,000 | 1,200 | 300 | 1 (prop atlas) |
| Small prop (books, magnets, clocks) | 300–800 | 150 | — | 1 (prop atlas) |
| Room shell (walls/floor/ceiling) | 8,000 total | — | — | 2 (trim sheet + atlas) |
LOD switching distances (screen-relative height): LOD0 > 25%, LOD1 > 8%, LOD2 > 2%, cull < 1%.

31.3 DRAW-CALL STRATEGY
- Atlas everything: one food atlas (2048), one prop atlas per level (2048), one shared "joke signs" atlas for all environmental text (see 39.8).
- Static batching for every non-moving prop. GPU instancing for repeated items (cans, sausage rolls, potatoes, crumbs).
- The Can Tower uses ONE instanced mesh with a compute-free stacking script, not hundreds of separate objects.
- Mirrors are expensive (they render the scene again): mirror resolution 512x512, update at 45Hz, only render characters + 1 layer of props, and only when the player is within 3m and facing it. Max 1 active mirror at a time.

=========================================================================
32. SHADERS & MATERIALS
=========================================================================
Build all shaders in Shader Graph (URP) unless stated, each with a MotionVectors pass (for SpaceWarp) and SRP-Batcher compatibility. Keep each to ≤ 3 texture samples.

32.1 "RONNIE TOON" — MASTER CHARACTER SHADER
- Lighting model: 2-band cel shading with a soft edge (smoothstep width 0.08), driven by a 1D ramp texture (256x4 — one row per mood: warm, cool, neon, space) so each level re-tints shadows without new materials.
- Shadow colour: from the ramp, never grey (e.g. skin shadow #C9806A, shirt shadow #13338F).
- Rim light: fresnel rim (power 3.5), colour set per level (warm peach in bedroom, magenta in kebab shop, gold in birthday, cyan in space). Rim intensity rises 20% per 3 growth stages so Ronnie's growing silhouette "pops".
- Specular: one stylised blob highlight (step function) for skin sheen on cheeks, belly and Tommy's abs. Tommy's abs get a separate, brighter highlight mask so they literally gleam.
- Matcap option: for Tommy's hair (anisotropic matcap streak) and teeth.
- Vertex colour channel R = baked ambient occlusion (from Blender), multiplied in. Channel G = "sweat/gloss" mask (animated from 0 to 1 as Ronnie grows — he gets shinier). Channel B = rim mask.
- Blob contact shadow: a soft decal under every character's feet (cheap, always on, even with real shadows off).

32.2 OUTLINES (critical for the look AND readability)
- Method: inverted hull (back-face extruded mesh) — NOT a full-screen post-process outline, which is not recommended on mobile VR.
- Width: 2.5mm at 1m in world space, scaled by distance (clamp 1.5–6mm apparent) so outlines don't vanish far away or get chunky up close.
- Colour: Ink Navy #1B1B2F multiplied with 30% of the surface colour (coloured outlines look more premium than flat black).
- Use outlines ONLY on: Ronnie, Tommy, NPCs, hero food, interactable items (so the player instantly knows what can be grabbed). Environments do NOT get outlines — this separates "things you can play with" from "the world".
- Smooth the hull normals (bake averaged normals into a UV channel) so outlines don't break apart on hard edges.

32.3 "APPETITE" — FOOD SHADER
- Base: toon ramp (warmer, softer bands than characters).
- Fake subsurface: wrap lighting (wrap 0.5) + a warm back-light term so food glows when lit from behind (cheese, jelly, burger buns).
- Gloss layer: a sharp specular highlight mask for sauces, glazes, melted cheese and chocolate ("wet" mask in vertex colour G).
- Crispiness: a cheap triplanar noise bump for crusts and batter (scale by object size).
- Bite marks: when food is bitten, a spherical cut is done with a shader dissolve + a pre-modelled "bite edge" ring mesh appears (much cheaper than real mesh slicing). Each bite position is passed as a shader vector (up to 6 bites per item).
- Steam: hot food spawns a looping soft steam sprite (see 37).
- Googly eyes: separate small mesh, unlit white with black pupil on a spring joint (wobbles when food moves).

32.4 MONSTOR CAN SHADER
- Metallic look without real reflections: matcap metal (brushed aluminium matcap) + a scrolling highlight line that moves as the can rotates.
- Claw logo emissive in Toxic Green, pulsing slowly (period 2s).
- Condensation: tiny droplet decal texture on the body; droplets fade out once the can is opened (it's warmed up).

32.5 FOAM, SAUCES & LIQUIDS
- MONSTOR foam geyser: particle mesh blobs with a soft toon shader, Toxic Green tint, slight emissive.
- Gravy waterfall / chocolate fountain: scrolling-UV mesh ribbon with a flow map + toon highlight — NOT a fluid simulation.
- Sauce splats: projected decals (URP Decal Projector, DBuffer off — use screen-space decal technique, max 30 active, oldest fade out).
- Bath flood water: a single rising plane with a stylised toon water shader (2 colour bands, scrolling foam lines along intersections via vertex colour, no depth texture).

32.6 SPECIAL MATERIALS
- Tommy's spotlight: a cone mesh with additive soft gradient + dust particles inside it. No real light — fake light cone + a brightened rim on Tommy's material while in the cone.
- Neon signs (kebab shop): emissive tubes + a camera-facing "glow card" sprite behind each sign (fake bloom).
- Glass (shop windows, fridge doors): unlit, 15% opacity, plus a baked streak highlight. No refraction.
- Space: Earth uses a 3-layer toon planet (ground, clouds scrolling, atmosphere fresnel). Stars: 1 instanced quad mesh (2,000 stars, twinkle in vertex shader).

32.7 DYNAMIC "GROWTH" MATERIAL EFFECTS
- Ronnie's shirt texture stretches with growth: the shirt material has a "stretch" parameter that widens the lettering UVs and adds stretched fabric-strain lines (a mask texture fading in with growth).
- At Stage 9+, add a subtle stretch-mark-free "strained fabric shine" (light highlight on the stretched shirt).
- MONSTOR MODE: characters' rim colour switches to Radioactive Lime and pulses with the heartbeat SFX.

=========================================================================
33. LIGHTING
=========================================================================

33.1 APPROACH
Baked lighting + light probes for the world; one real-time directional light for characters; fake everything else. This is how premium Quest games look great at high frame rates.

33.2 BAKING
- Bake with Unity's Progressive GPU Lightmapper. Lightmap resolution 12 texels/m for rooms, 6 for large exteriors. Max lightmap size 2048. Compression High Quality.
- Ambient occlusion in bake: ON, max distance 0.6m (gives the "toy diorama" contact darkness).
- Indirect intensity 1.3 (brighter, more cheerful bounce).
- Light probe groups: dense around play areas (every 1.5m at head and waist height), sparse elsewhere. All dynamic objects (food, Tommy, NPCs) use probes.
- Reflection probes: baked only, 128px, box projection in rooms (gives glossy food and cans something to reflect).

33.3 REAL-TIME
- One directional light per level, set to "Mixed" with shadows only from the "Characters" layer (Ronnie, Tommy, main NPCs) onto everything. Food and props use blob shadows.
- Ronnie's growth: the shadow he casts gets visibly bigger and darker over the room — a cheap, very effective joke.

33.4 PER-LEVEL LIGHTING MOODS
| Level | Key light | Fill/ambient | Rim colour | Mood |
|---|---|---|---|---|
| Bedroom | Warm morning sun through blinds #FFD9A0, strong striped shadows | Soft blue #9DB7FF | Peach #FFB38A | lazy Sunday morning, dust in sunbeams |
| Corner Shop | Cool fluorescent tubes #E8FFF4 (one flickering) | Mint #BDF5E1 | Lime #B6FF5C | slightly grim but colourful shelves |
| Kebab Shop | Neon magenta #FF2E88 + neon cyan #2EE6FF + warm counter lights #FFB15C | Deep purple #2A1846 | Magenta | 2am chaotic glow, steam everywhere |
| Buffet | Golden chandeliers #FFE08A | Warm cream #FFF1D6 | Gold | fancy hotel, then emergency red lights #FF3B3B when barricades go up |
| Birthday | Fairy lights (emissive cards) + warm lamp #FFC77A | Soft pink #FFC4E1 | Gold #FFD54A | cosy, cheerful, confetti in the air |
| Space | Hard white sun #FFFFFF from one side | Deep navy #0B1033 | Cyan #6FE7FF | epic, cinematic, huge scale |
| Roast Night | Single hard spotlight on stage #FFF3D1 | Very dark #140F1F | Warm red #FF6B4A | comedy club |

33.5 COLOUR GRADING WITHOUT POST-PROCESSING
- Each level has a "Grade" ScriptableObject that sets: ramp row, rim colour, fog colour, ambient tint and a global "saturation boost" shader property applied in every custom shader. This gives a film-graded look at zero post-processing cost.
- Linear fog (start 15m, end 60m) tinted per level for depth and atmosphere.

33.6 FAKE BLOOM & GLOWS
- Every emissive element (neon, MONSTOR logo, Golden Burger, fridge light, fairy lights) has a soft additive camera-facing "glow card" behind it. Fade glow cards by distance and angle so they don't look like flat sprites.
- God rays: soft gradient cone meshes (fridge door opening, bedroom blinds, Golden Burger reveal) with floating dust particles inside.

=========================================================================
34. CHARACTER MODELS — FULL SPEC
=========================================================================

34.1 GENERAL RULES FOR ALL CHARACTERS
- Stylised proportions: big heads (Ronnie and Tommy are ~5.5 heads tall; NPCs 4–5 heads).
- Clean quad-dominant topology with edge loops around eyes, mouth, shoulders, elbows, knees and — for Ronnie — dense loops around the belly, chin and cheeks so the growth blend shapes deform smoothly.
- Faces must read clearly from 3m: large eyes with big pupils and a highlight, thick expressive eyebrows (separate geometry so they can float slightly above the forehead for exaggerated expressions).
- Real-world heights at Stage 1 (exact — every character is modelled to these): Ronnie 178cm (5ft 10), Tommy 168cm (5ft 6), Lewis 191cm (6ft 3), Harry H 183cm (6ft 0), Aidan 178cm (5ft 10), Noah 173cm (5ft 8), Oliver 175cm (5ft 9), Dylan 165cm (5ft 5), Chloe 170cm (5ft 7), Tasha 160cm (5ft 3). The height chart prop in the bedroom shows all of them (see section 59).
- Likeness: these are original cartoon characters inspired by descriptions. If you want them to resemble the real Ronnie and Tommy, only use photos with both of their permission.

34.2 RONNIE — MODEL SHEET
- Body type at Stage 1: average build, 5ft 10 (178cm). Friendly, round-ish face, cheeky smile. Black buzz cut, black goatee joined to a black moustache (a "full goatee"), dark eyebrows.
- Hair: a very short black buzz cut — modelled as a smooth scalp cap with a buzz-cut texture (fine stipple in a near-black #1A1414 over the skin tone) instead of geometry; this is cheap and reads perfectly in VR. Goatee and moustache: sculpted solid chunks (no hair cards), slightly fuzzy edge via an alpha-tested fringe strip. As Ronnie grows, the goatee stretches wider across his chins (blend shape).
- Face: round eyes, slightly droopy eyelids for a "food coma" look option, rosy cheeks (vertex colour).
- Outfit (separate meshes so they can swap per stage): blue football shirt with white trim and "RONNIE 10" on back, grey joggers with visible drawstring, white socks, black sliders.
- MONSTOR can in the jogger pocket (separate mesh, attached to the hip bone).
- FIRST-PERSON BODY: the player sees their own hands, arms and belly. Hide head and neck in first person (render-layer cull on the player camera) but keep them in mirrors and shadows.
- Hands: chunky cartoon hands with 4 fingers + thumb, short and stubby, with a grip pose blend for holding food. Hands get puffier with growth (separate blend shape).

34.3 RONNIE — BLEND SHAPES (exact list, all on the body mesh)
Growth (driven 0–100 by RonnieGrowth.cs, layered across stages):
- Grow_Belly_A (stages 1–4), Grow_Belly_B (5–8), Grow_Belly_C (9–12, near-sphere)
- Grow_Chest, Grow_Arms_Upper, Grow_Forearms, Grow_Hands, Grow_Thighs, Grow_Calves, Grow_Butt
- Grow_Neck_Shrink (neck disappears by stage 6)
- Grow_Cheeks_A, Grow_Cheeks_B
- Chin_2, Chin_3, Chin_4, Chin_5 (stacked additive chins; past 5, the "chin accordion" texture scroll in 32.7 takes over)
- Grow_Shoulders_Round
Face expressions:
- Mouth_Open_Wide (eating), Mouth_Chomp, Cheeks_Puff (burp gauge full), Jaw_Unhinge (club sandwich gag), Tongue_Out, Smile_Big, Satisfied ("AHHH" after a can), Eyes_Wide, Eyes_Glow (MONSTOR MODE, also swaps eye material), Brain_Freeze (eyes crossed, teeth clenched), Squash_Face (doorway wedge), Blink_L, Blink_R, Brows_Up, Brows_Angry.
Visemes (15, standard set): sil, PP, FF, TH, DD, kk, CH, SS, nn, RR, aa, E, ih, oh, ou — for Ronnie's excuse shouts.
Total: ~45 blend shapes. Optimise in Unity import: "Blend Shape Normals: None" for growth shapes (normals recalculated cheaply in the toon shader using the smoothed-normal UV channel), which saves a lot of memory.

34.4 RONNIE — SKELETON
- Unity Humanoid-compatible base skeleton (for IK and retargeting).
- Extra bones (Generic extras under Humanoid): Belly_01, Belly_02 (jiggle), Chin_Jiggle, Cheek_L/R_Jiggle, Moobs_L/R_Jiggle (keep it tasteful and cartoony), Pocket_Can.
- Jiggle: spring-bone component (e.g. a lightweight open-source spring bone, or a simple custom damped-spring script) on belly/chin/cheek bones. Spring strength decreases and amplitude increases with each growth stage — Ronnie gets wobblier.
- Full-body IK from headset + controllers: use an IK solution that supports VR body estimation (e.g. Final IK VRIK, or Unity Animation Rigging with a custom VR body solver). Feet are procedurally planted with a footstep system driving the THOOM effects.

34.5 TOMMY — MODEL SHEET
- Height 168cm (5ft 6), inverted-triangle body, broad shoulders, narrow waist, visibly defined six-pack under a fitted white T-shirt (the T-shirt material uses a normal map + shading mask so abs read through the fabric). In the Space level, his spacesuit has a clear chest panel.
- Face: strong jaw with a short, neat full beard in light brown (#8A6A4A) with a lighter stubbly edge on the cheeks, strong brows, confident half-smile default expression, perfect white teeth (separate mesh, emissive-ish white with a star sparkle sprite on smile).
- Hair: brown (#6B4A2F) curtain hairstyle — centre parting with two swooping curtains framing the forehead — modelled as 4–6 sculpted solid chunks with an anisotropic matcap highlight. Alternate mesh "Hair_Ruined" for burp shockwaves (curtains blown straight up), and "Hair_Helmet" for Tactical Helping Gear.
- Outfit variants: Default (white tee, black joggers, white trainers), Waiter (Buffet level), Tuxedo (Awards / Roast Night), Spacesuit (Space), Tactical Helping Gear (helmet, knee pads, riot shield "I'M JUST TRYING TO HELP").
- Accessories: phone (filming), comb, single glass of water, salad box, banana, rubber duck (bath flood).
- Blend shapes: Smile_Smug, Smile_Sparkle (teeth reveal), Wink, Brows_Raise_One (signature "go on then" brow), Shock, Pain_Squint (ragdoll hits), Squashed (sat-on pancake, also uses scale), Cheeks_Puff (holding breath), Pout (after hair ruined), Blink_L/R + the 15 visemes.
- Skeleton: Humanoid + extra bones: Hair_Root (tiny spring so the curtains bounce — but stays perfect), Phone_Hand_R.
- Ragdoll colliders: capsules on limbs, box on chest, sphere on head, sized slightly LARGER than the mesh so he bounces cartoonishly instead of clipping.

34.6 VOICE, LIP-SYNC & FACIAL ANIMATION (Tommy and Ronnie)
- Do NOT use Oculus Lipsync (OVRLipSync) — Meta has deprecated it and it receives no support beyond v47.
- Meta's replacement, Audio To Expression (Movement SDK), produces full-face animation and works on Quest 2/3/3S, but it is built around the headset microphone; check the current Movement SDK docs to see whether it now accepts audio clips for NPCs. If it does, use it for Tommy.
- Otherwise (recommended, cheapest at runtime): pre-bake viseme curves OFFLINE in the editor from each voice clip (using an editor-time lip-sync tool such as the open-source uLipSync or a paid tool like LipSync Pro), save them as AnimationClips or a viseme ScriptableObject per line, and play them back in sync with the audio. Zero runtime analysis cost on Quest.
- Layer on top: automatic blinks (every 2–5s random), eyebrow raises on stressed words (mark these in the dialogue CSV with *asterisks*), and an emotion pose per line from the emotion tag (smug, concerned, amazed, panicked, caring, sarcastic).
- Head and eyes: Tommy's head and eyes always look at the player's head while talking (LookAt IK with 60° limit, smooth 0.25s), and glance at food Ronnie is holding.

34.7 NPCs
- All NPCs share ONE base mesh with blend shapes for body shape (thin/round/tall/short) and ONE texture atlas with swappable clothing colour via a palette texture — gives variety for almost zero cost.
- Main NPCs get unique heads and props: Shopkeeper (moustache, crisp-packet helmet), Kebab Man (big smile, apron, air horn), Buffet Manager (sweaty — gloss vertex mask, clipboard, walkie-talkie), Grandma (cardigan, glasses, rolling pin), Delivery Driver (cap, thermal backpack), News Reporter (appears on TV screens; render from a pre-recorded animated clip, not live).
- Pigeons: 300-tri low-poly birds with a "faint" animation (legs up, X eyes).
- Corgi "Abs": 3,000 tris, with "Pancake" blend shape (flattened) and a wagging tail spring bone.

=========================================================================
35. AI-ASSISTED 3D PRODUCTION PIPELINE
=========================================================================
Use AI generators to get 80% of the way fast, then finish by hand. AI output still needs manual polish for hero assets, so plan for cleanup on every important model.

35.1 TOOL ROLES (choose based on asset type — check current pricing and licence terms before committing)
| Tool | Use it for | Why |
|---|---|---|
| Meshy | Food, props, environment pieces | Strong texture quality, polygon-count control, good for general game props |
| Tripo | Characters (Ronnie, Tommy, NPCs) and creatures (corgi, pigeons) | Fast generation, built-in auto-rigging with Mixamo-ready T-pose skeletons, also rigs quadrupeds |
| Rodin (Hyper3D) | Hero assets needing the cleanest geometry (Golden Burger, the giant MONSTOR can, Tommy's head) | Top geometric detail and topology |
| Hunyuan3D / TRELLIS 2 | Free/self-hosted alternatives for bulk props | Open-source options |
| Mixamo / AccuRIG / Auto-Rig Pro | Rigging fallback and extra animation | Reliable humanoid auto-rig; Auto-Rig Pro exports Unity Humanoid rigs from Blender |
| Blender | ALL cleanup, retopology, UVs, baking, blend shapes, export | Free, required for quality |

35.2 STEP-BY-STEP (every asset goes through this)
1. CONCEPT: create a front + side concept image in the art style (2D AI image tool or sketch). Plain light-grey background, even lighting, T-pose for characters.
2. GENERATE: image-to-3D in the chosen tool (image input gives far more control than text). Generate 3–4 variations, pick the best.
3. CLEAN UP in Blender: apply transforms, merge by distance, fix normals, delete internal faces, fill holes, check scale (1 unit = 1m), face +Z forward for characters before rigging.
4. RETOPOLOGISE: for characters always (quad-dominant, edge loops in 34.1). For props, decimate to the budget in 31.2 and fix silhouettes by hand.
5. UVs: re-unwrap cleanly; pack into the shared atlases (food atlas, prop atlas). Texel density: 512px/m props, 1024px/m hero food and character faces.
6. BAKE: bake the AI high-poly detail to the low-poly as a normal map (props only — characters stay smooth and rely on the toon shader). Bake AO into vertex colour R.
7. REPAINT TEXTURES IN THE ART STYLE: AI textures are usually too realistic and noisy. Simplify to flat colour blocks + soft gradients + a few hand-painted highlights, using the palette in 29.4. This step is what makes the game look cohesive and premium.
8. RIG (characters): Tripo auto-rig or Mixamo for the base Humanoid skeleton, then add extra jiggle bones in Blender (34.3–34.5).
9. BLEND SHAPES: sculpt all shape keys in Blender (growth shapes, expressions, visemes). Use the Corrective Smooth modifier while sculpting so growth shapes stay smooth.
10. LODs: generate LOD1/LOD2 (Blender Decimate, or Unity's LOD tooling) and check silhouettes.
11. OUTLINE PREP: bake smoothed normals into UV3 for the inverted-hull outline.
12. EXPORT: FBX, scale 1.0, "Apply Transform", forward -Z / up Y, include blend shapes, no cameras/lights, embed nothing (textures imported separately).
13. UNITY IMPORT: Rig = Humanoid (characters) or Generic (corgi, pigeons, food with physics chains). Mesh compression Medium. Read/Write OFF (except meshes needing runtime access). Blend Shape Normals: None for growth shapes. Optimise Mesh ON.
14. VERIFY: drop into the "Asset Review" scene (a turntable room with the toon lighting, a mirror and a scale reference of Ronnie at Stage 1) and check it in the headset before it goes into a level.

35.3 PROMPT TEMPLATES FOR AI 3D GENERATION
Always prepend this style block:
"Stylised 3D cartoon game asset, chunky rounded shapes, soft bevels, exaggerated proportions, toy-like, clean simple surfaces, flat saturated colours, no fine noise, premium animated film style, plain background, centred, even studio lighting."

Characters (image-to-3D preferred; text fallback):
- RONNIE: "[style block] full body cartoon young man, 5ft 10, average build, friendly round face, black buzz cut, black goatee joined to a black moustache, cheeky smile, wearing a plain blue football shirt with white trim, grey jogging bottoms, white socks, black sliders, T-pose, arms straight out, front view."
- TOMMY: "[style block] full body cartoon young man, short (5ft 6), very handsome, brown curtain hairstyle with centre parting, neat short light-brown full beard, confident smirk, athletic inverted-triangle body, fitted white T-shirt showing abs, black joggers, white trainers, T-pose, front view."
- SHOPKEEPER: "[style block] cartoon middle-aged shopkeeper, bean-shaped body, big moustache, worried eyebrows, cardigan, T-pose."
- GRANDMA: "[style block] cartoon sweet grandma, small and round, cardigan, glasses on a chain, rolling pin, T-pose."
- CORGI: "[style block] cartoon corgi dog, very short legs, huge ears, happy face, standing pose."

Food (one per item; adjust the description):
- "[style block] giant cartoon cheeseburger, plump sesame bun, thick juicy patty, melted cheese dripping over the edges, glossy lettuce, appetising, slightly oversized, game prop, under 2000 triangles."
- "[style block] cartoon doner kebab in pitta, overflowing meat, salad and white garlic sauce, appetising, game prop."
- "[style block] whole cartoon pepperoni pizza, thick golden crust, stretchy melted cheese, glossy pepperoni, game prop."
- "[style block] cartoon black energy drink can with bright green claw-mark logo, chunky proportions, slightly oversized, game prop." (no real brand names or logos)
- "[style block] cartoon 12-tier birthday cake, wobbly layers, thick icing drips, sprinkles, candles, game prop."
- Repeat for every item in section 19.

Props:
- "[style block] cartoon gaming chair, chunky, slightly squashed cushion, game prop."
- "[style block] cartoon corner-shop drinks fridge with glass doors, chunky frame, game prop, empty shelves."
- "[style block] cartoon kebab shop counter with glass display, rounded edges, game prop."

35.4 NAMING CONVENTION
Type_Name_Variant_LOD — e.g. CHR_Ronnie_Body, CHR_Tommy_Hair_Ruined, FOOD_Burger_LOD1, PROP_Bedroom_GamingChair, PROP_Bedroom_GamingChair_Broken, FX_Crumbs_Burst, SIGN_Bedroom_Wanted_01, MAT_Toon_Skin_Ronnie, TEX_FoodAtlas_BaseColour.

=========================================================================
36. FOOD ART — "HERO FOOD" RULES
=========================================================================
Food is the star. Every item must look like the best version of itself.
1. Oversize it 1.3–2x real scale (hero items more).
2. Plumpness: buns, sausages and doughnuts slightly "inflated", with a subtle idle breathing scale pulse (1.0–1.02, 3s) so food looks alive.
3. Highlights: every sauce, glaze, cheese and chocolate surface has a sharp white-yellow specular blob.
4. Drips: modelled drip geometry on cheese, icing, sauces and ice cream (not just painted).
5. Steam: all hot food emits 2–3 soft rising steam wisps (looping, 8 particles max per item).
6. Crunch detail: crispy edges get small modelled lumps (chips, batter, crusts) — shape, not texture noise.
7. Colour: push saturation 15% above realistic; golden browns lean orange; greens lean lime.
8. Faces: googly eyes on burgers, nuggets, the jelly tower and the MONSTOR Ultra Mega can; little drawn mouths on nuggets (they scream).
9. Eaten states: every food has 2–4 bite-state variants (or the shader bite system in 32.3) + a "crumbs left" final state that dissolves in 1s.
10. Hero reveal: the Golden Burger floats, rotates slowly, has god rays, a choir glow card and sparkles. It must be the most beautiful object in the game.

=========================================================================
37. VFX — PARTICLES & EFFECTS LIBRARY
=========================================================================
Use Unity's built-in Particle System (Shuriken) with mesh or soft sprite particles — well-supported on Quest. All particle textures share ONE 2048 VFX atlas. Every effect has a "Smooth"/"Low" preset with half the particle count.

| Effect ID | Trigger | Look | Max particles | Duration |
|---|---|---|---|---|
| FX_Crumbs_Burst | every bite | chunky low-poly crumb meshes coloured from the food's palette, bounce on floor, fade after 2s | 25 | 2s |
| FX_Sauce_Splat | saucy bite / squeeze | blob mesh burst + decal on surfaces hit | 12 + 1 decal | 1.5s |
| FX_Cheese_Stretch | pizza/cheese items | a line-renderer cheese string with sag physics, snaps with a TWANG | 1 line | until snap |
| FX_Steam | hot food | soft wisps, rising, curling | 8 | loop |
| FX_Can_Open | can opened | foam spurt + green spark burst | 30 | 0.8s |
| FX_Foam_Geyser | shaken can | big green foam blobs column | 60 | 2s |
| FX_BeastMode | MONSTOR MODE active | green lightning arcs around Ronnie's hands + screen-edge green vignette ring (mesh, not post) | 40 | duration |
| FX_Unleash | UNLEASH THE MONSTOR | swirling vortex of food bits being sucked in + jet stream | 120 | 8s |
| FX_StageUp | stage-up | expanding ring of confetti + "BWOOMP" pressure ring mesh | 80 | 1s |
| FX_Chin_Confetti | new chin | small confetti pop in front of face (shows in mirror) | 40 | 0.8s |
| FX_Burp_Shockwave | burp | expanding translucent ring mesh + dust kick-up + floating "BWAAARP" 3D text | 50 | 1.2s |
| FX_Stars_Dizzy | Tommy/NPC knocked down | 5 cartoon stars orbiting the head | 5 | 3s |
| FX_Impact_Word | ragdoll hit | 3D comic word (POW!/SPLAT!/BOING!) with pop-in scale bounce, faces the player | 1 | 0.8s |
| FX_Tommy_Sparkle | Tommy smiles | a single 4-point star glint on teeth + "ting" | 3 | 0.4s |
| FX_Tommy_Spotlight | always | cone + floating dust motes | 20 | loop |
| FX_Sweat_Drip | Ronnie Stage 4+ | droplets flicking off forehead when moving fast | 6 | loop |
| FX_Floor_Crack | Stage 5+ footsteps | crack decal + dust puff | 10 + 1 decal | 1s |
| FX_Earthquake_Dust | Stage 8+ footsteps | dust falling from ceiling | 30 | 1.5s |
| FX_Brain_Freeze | ice cream | frost crystals on head + blue breath | 20 | 5s |
| FX_Fire_Breath | curry | cartoon flame puffs from mouth | 25 | 3s |
| FX_Golden_Reveal | Golden Burger | god rays + sparkles + slow rotating halo | 60 | loop |
| FX_Fireworks | Golden Burger eaten / combo x20 | outside windows, colourful bursts | 150 | 3s |
| FX_Orbit_Trail | orbiting snacks | short sparkle trail per item | 10/item | loop |
| FX_Roof_Pop | level end | roof chunk launch + debris + sky reveal | 60 | 2s |
| FX_Water_Flood | bath | splash sheets + bubbles | 80 | 4s |
| FX_Confetti_Party | birthday | slow-falling confetti, always on | 150 | loop |
Accessibility: "Photosensitivity" setting disables fireworks, lightning flicker and fast flashes.

=========================================================================
38. ANIMATION DIRECTION
=========================================================================

38.1 PRINCIPLES (apply to every animation)
- Squash & stretch on everything that moves: food when grabbed, Tommy when he lands, Ronnie at stage-ups.
- Anticipation: before every big action (a burp, a launch, a stage-up), a quick 4–6 frame wind-up.
- Overshoot & settle: growth tweens use elastic overshoot; Tommy's get-ups end with a little pose and a hair touch.
- Hold for comedy: after a big gag, freeze for 0.3s (hit-stop) before continuing — gives the joke time to land.
- Timing reference: 30fps authoring; comedic snaps on 2s (every other frame) for punchy cartoon feel on reaction animations.

38.2 TOMMY ANIMATION LIST
Locomotion: Idle_Smug, Walk_Swagger, Jog, Turn_L/R, Lean_Doorway_Loop, Skateboard_Slide_In, Abseil_Down, Climb_Out_Of_Bin.
Idle fidgets (random): Check_Abs_Mirror, One_PressUp, Fix_Hair, Selfie, Sip_Water_Smug, Shadow_Box, Check_Watch.
Talking: Talk_Casual_Loop (3 variants), Talk_Point_At_Ronnie, Talk_Arms_Wide ("this big"), Talk_Shrug, Talk_Facepalm, Talk_Count_On_Fingers ("one day older").
Reactions: React_Gasp, React_Laugh_Bent_Over, React_Slow_Clap, React_Film_On_Phone, React_Hair_Ruined (horror), React_Comb_Hair.
Hit/ragdoll: Flinch_Light, GetUp_FaceUp, GetUp_FaceDown, BrushOff_Pose, Peel_Off_Floor (after pancake), Dangle_Kick (held by Ronnie), Helmet_On.
Special: Surf_On_Ronnie, Orbit_SitUps, Matrix_Dodge, Perfect_Landing_Pose, Standup_Mic_Loop (Roast Night), Bow.

38.3 RONNIE ANIMATIONS (mostly procedural/IK in first person, full anims for mirrors and cutscenes)
Eat_Chomp (face), Chug_Can (head tilt + face), Burp_Windup + Burp_Release, Flex_Double (both triggers), Excuse_Shout (arms out), Sit_Sofa_Fall, Rock_GetUp, Doorway_Squeeze, Belly_Toboggan, Roll_Loop (Stage 10+), Weigh_In_StepOn, Brain_Freeze, Victory_Moon (finale).

38.4 NPC ANIMATIONS
Shared reaction set from section 23 (Jaw_Drop, Eye_Pop, Hair_Up, Hat_Fly, Plank_Fall, Faint, Applaud, Pray, Run, Film). Plus per-NPC: Shopkeeper_Board_Up_Till, KebabMan_Air_Horn, Manager_Walkie_Panic, Grandma_Pile_Food, Driver_Knock / Driver_Sofa_Relax.

38.5 PHYSICS ANIMATION & RAGDOLL
- Use an active-ragdoll / physical-animation solution that blends between animation and physics — PuppetMaster (RootMotion) is the proven choice for VR physical character interaction; a custom active ragdoll (two bodies: one animated, one physics body following it with joint targets) is the free alternative.
- Tommy is "Puppet" mode by default (physically follows animation, so he gets pushed slightly by belly-bumps without fully falling), switching to full ragdoll ("Dead" state) on big hits, then "Get Up" blending back.
- Cartoon tuning: low muscle strength on big hits for floppy comedy, high pin weight on head so his face stays readable, his hair bone excluded from physics so it stays perfect.

=========================================================================
39. LEVEL VISUAL DESIGN — PER LEVEL
=========================================================================
For each level: real-world size, layout, hero props, "money shot" moment, skybox/exterior, and readability notes. All rooms are built 10–15% LARGER than real so Ronnie can grow for longer, but furniture is real-sized (makes the growth more obvious).

39.1 BEDROOM (5m x 4.5m, ceiling 2.6m)
- Layout: bed against back wall, desk + gaming chair by the window, wardrobe right, mini fridge under desk, bathroom door left, mirror on wardrobe door, bin in corner.
- Hero props: gaming chair (+ broken variant), bed with crater, wardrobe with labelled drawers, can-covered floor (instanced cans ~400, physics only within 1.5m of the player).
- Lighting: morning sun through blinds (projected stripe cookie as a baked light + matching dust-beam cones).
- Money shot: at level end, the roof pops off and the camera reveals blue sky with birds scattering and neighbours leaning out of windows.
- Exterior: painted 2.5D street outside the window (layered cards with parallax).

39.2 CORNER SHOP (8m x 6m)
- Layout: entrance with bell, counter right with till and CCTV monitor, three aisles (crisps, sweets, "diet" aisle), fridge wall at back glowing with MONSTOR cans.
- Hero props: fridge wall (emissive interior light), crisp mountain, sweet jars, newspaper rack.
- Money shot: Ronnie opens the fridge wall and a choir sings as 100 cans glow green.
- Exterior: rainy British high street at dusk visible through the window, with puddle reflections faked using flipped baked textures.

39.3 KEBAB SHOP (7m x 5m)
- Layout: tight door (Doorway Wedge), counter with rotating spit, fryers, menu board above, 3 tables, salad bar in a sad corner, neon sign in the window.
- Lighting: magenta + cyan neon, hazy (fog density higher, steam everywhere).
- Hero props: rotating doner spit (sweating), garlic sauce cannon, doner statue of Ronnie.
- Money shot: the conveyor belt starts and kebabs come at Ronnie under strobing neon (photosensitivity-safe version available).
- Exterior: night street, wet road, a fox by the bins, bus stop.

39.4 BUFFET (20m x 14m hotel restaurant)
- Layout: long buffet stations in a U-shape (carvery, curry, desserts, chocolate fountain centrepiece), round tables, chandeliers, a grand staircase (Stairs of Doom) and the glass lift.
- Phase change: when barricades go up, the lighting swaps from golden chandeliers to flashing red emergency lights (two pre-baked lightmap sets blended with a shader global).
- Hero props: chocolate fountain → waterfall, ice swan (melts), barricade tables with spray paint.
- Money shot: SWAT waiters abseil from the chandeliers.

39.5 BIRTHDAY PARTY (house: lounge 7m x 6m + kitchen + garden)
- Hero props: 12-tier cake (the tallest object in the house), balloon bunches (physics, pop on contact at Stage 6+), bouncy castle in the garden, present pile.
- Lighting: fairy lights everywhere (emissive card strings), warm lamps, late-afternoon garden sun.
- Money shot: candles lit, lights dim, everyone sings (instrumental, no lyrics), Tommy blows the candles out first.

39.6 SPACE
- Scale trick: Ronnie is planet-sized, so Earth is a 30m sphere below him, the Moon a 6m sphere, and the giant MONSTOR can is 40m tall orbiting slowly.
- Hero visuals: toon Earth with scrolling clouds and a glowing atmosphere rim, starfield, a stylised Milky Way band painted on the skybox, Saturn with doughnut rings.
- Money shot: chugging the giant can as it tilts towards the player, green liquid glowing, planet-wide burp ring expanding across Earth.

39.7 ROAST NIGHT COMEDY CLUB (10m x 8m)
- Brick wall, small stage, mic stand, neon "RONNIE ROAST" sign, cabaret tables with candles, audience NPCs (instanced, 3 animation variants each).
- Lighting: one hard follow-spot on Tommy, everything else dim and moody.

39.8 ENVIRONMENTAL JOKE SIGNS — VISUAL SPEC
- All joke text is rendered with TextMeshPro using SDF fonts (crisp at any distance in VR), on top of sign meshes from the prop atlas. Never bake joke text into textures (blurry in VR and hard to edit).
- Fonts: one bold rounded display font for signs/posters, one hand-written marker font for sticky notes/graffiti, one condensed font for newspapers/tickers. Use fonts with a licence that allows commercial use in games (e.g. SIL Open Font License fonts).
- Minimum text height: 2cm per metre of expected viewing distance. Outline on all sign text (Ink colour).
- Dynamic signs (PUSH → GIVE UP, news tickers) animate between states with a little flip or flicker so the player notices the change.

=========================================================================
40. UI VISUAL DESIGN
=========================================================================
- Diegetic first: the wrist UI is a physical chunky smartwatch-style device on Ronnie's left wrist (it also grows with him). Turn the wrist up to see it light up (wake animation), turn away to dim.
- Style: rounded panels, thick Ink outlines, bold display font, Chonk Orange and Combo Pink accents, subtle bounce animations on every value change.
- Chonk Meter: a cartoon belly-shaped bar that physically bulges as it fills.
- Chin Counter: an airport-style flip display.
- Stage-up banner: a big 3D ribbon that unfurls in front of the player at 2m distance (never stuck to the face — comfort), stays 1.5s, then flies off.
- Scorecard: a giant receipt that prints out of the ceiling and unrolls in front of the player, line by line, with a receipt-printer sound.
- Pause menu: the giant pizza box from section 7; slices lift up when pointed at.
- Subtitles: speech bubbles above the speaker's head, world-space, billboarded, with a small tail pointing to the speaker. Off-screen speaker = bubble at the edge of view with an arrow.
- All UI rendered as world-space meshes (no screen-space overlays). For crisp text, render key UI panels as OpenXR compositor layers if the SDK allows.

=========================================================================
41. "JUICE" — FEEDBACK POLISH (makes it feel premium)
=========================================================================
Every interaction has at least 3 feedback channels (visual + audio + haptic):
| Event | Visual | Audio | Haptic (controller) |
|---|---|---|---|
| Grab food | food squashes 10% then springs back; googly eyes wobble | squishy grab sound | short soft pulse (0.1s, 0.3) |
| Bite | crumbs, bite mark, mouth chomp | layered bite SFX | sharp pulse (0.05s, 0.6) |
| Swallow | Chonk Meter bulge | gulp | low rumble (0.15s, 0.4) |
| Combo up | number pops & spins on wrist | announcer + sting | double pulse |
| Stage-up | FX_StageUp ring, rig grows with overshoot | BWOOMP | long rumble both hands (0.4s, 0.8) |
| Can open | foam spurt | PSSSHHT | fizzing buzz pattern (0.6s, varying) |
| MONSTOR MODE | green lightning hands | heartbeat + riff | heartbeat pulses for the full duration |
| Burp | shockwave ring | BWAAARP | strong rumble ramping down |
| Slap Tommy | impact word, stars, ragdoll | SLAP + "I'm just trying to help!" | sharp strong pulse on the slapping hand |
| Throw Tommy | slow-mo if far, trail | whoosh + "WORTH IIIT" | release pulse |
| Footstep (Stage 5+) | dust, cracks | THOOM | tiny thud per step (both hands) |
Hit-stop: 0.06s freeze on big hits and stage-ups (the world pauses, the player's head tracking never pauses — comfort).

=========================================================================
42. VISUAL QUALITY TARGETS ("is it stunning yet?")
=========================================================================
Before a level is "done", it must pass all of these in the headset:
[ ] First 5 seconds: does the player say "wow"? (test with someone who hasn't seen it)
[ ] Every interactable is recognisable within 5m by silhouette and colour alone.
[ ] No grey, muddy or unlit-looking areas; every shadow is tinted.
[ ] Outlines are clean (no breaking on edges, no shimmering) at 1m, 3m and 8m.
[ ] Food looks good enough to eat in real life.
[ ] Tommy looks smug and handsome from every angle, including in mirrors.
[ ] Ronnie's growth deforms smoothly through all 12 stages with no clipping in the shirt, chins or hands (check in the mirror at every stage).
[ ] At least 3 things are moving in every view (steam, dust, googly eyes, swaying signs, flickering lights).
[ ] Every environmental joke is readable from where the player naturally stands.
[ ] Holds 90fps in the busiest moment (OVR Metrics Tool overlay), with 6 ragdolls and full particles.

=========================================================================
43. PROFILING & VISUAL QA TOOLS
=========================================================================
- OVR Metrics Tool (on headset): live FPS, GPU/CPU level, frame time overlay — keep it on during all playtests.
- Unity Profiler + Frame Debugger (via Link or wireless ADB): find draw-call spikes and overdraw.
- RenderDoc / Meta's GPU profiling tools: check shader cost and overdraw on transparent particles.
- Automated "Stage Sweep" test scene: cycles Ronnie through all 12 stages in front of a mirror and Tommy, capturing screenshots of each (catches deformation bugs).
- "Worst Case" test scene: max ragdolls, max particles, Can Tower at 500, UNLEASH THE MONSTOR active — must hold 72fps minimum.

=========================================================================
44. ART PRODUCTION ORDER (fits into the build phases at the top)
=========================================================================
Phase 1 (core): toon shader + outline shader + food shader, Ronnie body with ALL growth blend shapes, Tommy with ragdoll and viseme set, 5 hero foods, MONSTOR can, Asset Review scene.
Phase 2 (Level 1): bedroom shell + all 30 bedroom joke props, bedroom lighting bake, all core VFX (crumbs, sauce, stage-up, stars, impact words, burp).
Phase 3: one level at a time — shell, props, joke signs, lighting mood, unique VFX, NPCs — each passes section 42 before moving on.
Phase 4: remaining foods (all 33), Tommy outfit variants, feature-specific props.
Phase 5: polish pass — juice table (section 41), extra idle motion, LOD and atlas optimisation, final performance pass with SpaceWarp tests.


#########################################################################
#########################################################################
##                                                                     ##
##   PART 4 — FRONT END: SPLASH, TITLE SCREEN, MENUS & LOADING         ##
##   "RONNIE SIMULATOR" on every screen — and silky smooth on Quest    ##
##                                                                     ##
#########################################################################
#########################################################################

=========================================================================
45. FRONT-END FLOW
=========================================================================
Headset launch
  → [A] SYSTEM SPLASH (drawn by the Quest OS — instant, never stutters)
  → [B] BOOT scene (tiny; loads the persistent Core scene)
  → [C] INTRO STING "A TOMMY PRODUCTION" (skippable, 4s)
  → [D] TITLE SCREEN "RONNIE SIMULATOR — PRESS ANY BUTTON TO EAT"
  → [E] MAIN MENU (Ronnie's Fridge)
        → Play / Continue → [F] LOADING SCREEN → Level
        → Level Select (Pizza Box Carousel) → [F] → Level
        → Bonus Levels / Tommy Mode / Chonk-Off (2P) → [F] → mode
        → Wardrobe, Stats & Awards, Settings, Credits, Quit
In-level: Pause (Pizza Box) → Resume / Restart / Settings / Quit to Menu ([F] → Menu)
Level end: Scale Breaker → Scorecard (Receipt) → Next Level ([F]) / Replay / Menu

Persistent architecture:
- "Core" scene stays loaded forever: XR rig, GameManager, AudioManager, SaveSystem, FadeController, LoadingController, the compositor-layer loading logo. It never unloads, so there is never a moment with no XR rig or no head tracking.
- Every other scene (Title, Menu, LoadingRoom, each level) loads ADDITIVELY on top of Core.

=========================================================================
46. GOLDEN RULES FOR A SMOOTH FRONT END ON QUEST
=========================================================================
1. The 4-second rule: Meta requires the app to display head-tracked graphics within 4 seconds of launch or provide a loading indicator in VR. The system splash covers the first moments; the Boot scene must render its first frame well before 4 seconds.
2. Never lock anything to the player's face. Logos, spinners and progress bars are WORLD-LOCKED (they stay still in space when the player turns their head). If the player turns away, smoothly re-centre them in front after 1.5s.
3. Never freeze the picture. While Unity is busy (scene activation, shader warm-up), the screen must already be faded to black OR the logo must be on a compositor layer drawn by the OS (see 52.6), so the player never sees a frozen, judder-y frame.
4. Every front-end scene is tiny: ≤ 60k triangles, ≤ 40 draw calls, ≤ 15 materials, baked lighting only, no real-time shadows, no ragdolls, no mirrors. These screens must sit at a locked 90fps with huge headroom.
5. Load assets per level with Addressables (one group per level) so memory stays low and the menu never holds a whole level in RAM.
6. Shader warm-up: precompile the shader variants for the NEXT level during the loading screen, behind the fade, using a ShaderVariantCollection per level. This prevents the first-bite hitch.
7. Garbage collection: run a GC + Resources.UnloadUnusedAssets only while the screen is faded to black between scenes.
8. No frame in the front end may exceed 13ms (measure with OVR Metrics Tool). Any spike = bug.
9. Audio: menu music is streamed (Load Type: Streaming), SFX are decompressed-on-load, so the menu starts instantly.
10. Input works everywhere from the first frame: any button skips the intro, the title responds immediately, and the system menu/recenter always works.

=========================================================================
47. THE "RONNIE SIMULATOR" LOGO
=========================================================================
This logo appears on every front-end screen. Make it iconic.

47.1 DESIGN
- Two lines:
    RONNIE   (huge, chunky bubble letters)
    SIMULATOR (smaller, bold condensed letters on a blue banner ribbon underneath)
- RONNIE: fat, rounded, inflated bubble letters in Kings Road Blue #1D4FD8 with a white inner highlight, thick Ink Navy #1B1B2F outline, and a chunky drop shadow.
  - The first "O" is a pink-iced doughnut with sprinkles.
  - The dot on the "I" is a MONSTOR can (Can Black with Toxic Green claw).
  - The letters are slightly too fat for the space, squashing into each other, as if the word itself has eaten too much. The final "E" is bursting out of the logo frame, with a single button pinging off.
  - A tiny crumb trail and a sauce drip hang off the bottom of the letters.
- SIMULATOR: Shirt White letters on a Kings Road Blue ribbon banner with Ink outline, slightly stretched like a shirt under strain (subtle fabric strain lines).
- Optional small badge in the corner: "NOW 40% MORE RONNIE" (a starburst sticker, Chonk Orange #FF7A1A).
- No real club badges or energy-drink logos anywhere in the logo.

47.2 VERSIONS TO PRODUCE
| Version | Format | Use |
|---|---|---|
| LOGO_2D_Full | PNG with transparency, 4096x2048 master | system splash, store art, loading screen compositor layer |
| LOGO_2D_Small | PNG 1024x512 | wrist UI, pause menu header |
| LOGO_3D | mesh, ≤ 12,000 tris, toon shader + outline | title screen hero, menu, loading room |
| LOGO_3D_Letters | each letter a separate mesh with its own pivot | for bounce/inflate animations |
| ICON | square app icon: just a doughnut "O" with Ronnie's googly eyes and a MONSTOR can, on a blue background | headset library tile |
| Wordmark_Text | TextMeshPro SDF font asset matching the logo style | any text that says "Ronnie Simulator" in UI |
(Check Meta's current store asset size requirements before exporting store art.)

47.3 LOGO ANIMATIONS (3D logo, all cheap transform/blend-shape animations)
- Idle: each RONNIE letter gently "breathes" (scale 1.0–1.04) out of phase, like a belly breathing. The doughnut O slowly spins. The MONSTOR-can i-dot fizzes with 6 foam particles.
- Hit/Select: letters squash down then pop up with an elastic overshoot.
- "Gulp" gag (every 20 seconds on the title screen): the logo swallows a falling burger — every letter inflates in a wave from R to E, the E's button pings off, a burp sound plays, and the letters settle slightly bigger. Resets when the scene reloads.
- Intro reveal: letters drop in one by one from above with a THOOM, each one causing a small camera-free "world shake" (props wobble, NOT the camera — comfort).

=========================================================================
48. [A] SYSTEM SPLASH SCREEN (OS level)
=========================================================================
- Use the Meta XR "System Splash Screen" (set via OVR Manager → Quest Features → General → System Splash Screen, or the OpenXR Meta Quest Support feature). The Quest OS draws it immediately as a high-quality compositor layer until the app submits its first frame, so it never stutters.
- Image: LOGO_2D_Full centred on a soft radial gradient from Kings Road Blue #1D4FD8 (centre) to Ink Navy #1B1B2F (edges), with a few doughnut sprinkles scattered around. Subtitle under the logo: "Loading... please do not feed Ronnie."
- The OS sizes the splash from the PNG's dimensions (bigger PNG = bigger splash), so test sizes on the headset until the logo looks about 1.5m wide at a comfortable distance.
- Mono image is fine. (A stereo double-wide version is optional for a 3D pop effect.)
- Unity splash: turn OFF "Show Splash Screen" in Player Settings → Splash Image (Unity 6 allows this on all plans, including Personal), so the player goes straight from the system splash into the game.

=========================================================================
49. [B] BOOT SCENE
=========================================================================
- Contents: an empty black void, the XR rig (from Core), and a world-locked LOGO_2D_Small on a quad 3m in front, gently pulsing. Nothing else.
- Size: under 5k triangles, 3 draw calls.
- Job: load Core, initialise the save file, read settings (comfort preset, quality preset, volume), start the Title scene loading in the background, then hand off to the Intro.
- Must reach its first frame in under 1.5 seconds on Quest 3.
- If this is the very first launch: queue the Comfort Setup (section 55.1) after the Title screen.

=========================================================================
50. [C] INTRO STING — "A TOMMY PRODUCTION"
=========================================================================
- Duration 4 seconds, skippable with any button from frame 1 (show "Press any button to skip" in small text after 1s).
- Visual: pitch-black space; a single spotlight snaps on (with a big THUNK sound) revealing Tommy standing on a small round plinth, arms folded, smug, sparkle on teeth ("ting!"). Gold text appears above him in a smooth serif font: "A TOMMY PRODUCTION". Underneath, smaller: "One day older than the competition."
- Tommy voice line (randomised from a short bank):
  - "Tommy Productions. Proudly older than Ronnie since day one."
  - "This game was made with love. And abs."
  - "Right. Let's see what the big man's been up to."
- Then the spotlight snaps off, and in the darkness you hear a long crunching CHOMP and a distant burp — cut straight to the Title screen.
- Tech: one small set (plinth, spotlight cone, Tommy LOD0), baked, ≤ 30k triangles. Tommy is animated, not physics-driven.

=========================================================================
51. [D] TITLE SCREEN — "RONNIE SIMULATOR"
=========================================================================

51.1 THE SET: "SNACK SKY ISLAND"
- The player stands on a small round floating island (8m diameter) made of a giant pizza base with a crust edge, floating in a bright sunset sky (Kings Road Blue fading to warm orange at the horizon).
- Hero: the giant LOGO_3D "RONNIE SIMULATOR", 6m wide, hovering 4m in front of the player and 2.5m up, slowly bobbing (±10cm, 4s cycle).
- Around the island: floating food "planets" drifting by — a doughnut ring, a burger, a pizza slice, a kebab — each with googly eyes, very slowly rotating (all GPU-instanced, baked lighting, no physics).
- Gentle food "snow": a slow rain of MONSTOR cans, sprinkles and crisps falling far in the distance (one particle system, 120 particles, at least 10m away so it never feels claustrophobic).
- Tommy leans against the "S" of SIMULATOR, arms folded, with his own spotlight, doing idle fidgets (abs check, hair fix).
- Ronnie's presence: a huge silhouette of Ronnie (cardboard-cutout style, 15m tall) rises slowly behind the logo every 30 seconds and "peeks" over it like a sunrise, then sinks back down — with a deep rumbling "mmmMMMM" and the island wobbling (props only, not the camera).
- Skybox: a single gradient + painted cloud cards (no real-time sky).

51.2 PROMPT & INPUT
- Under the logo, floating world-space text pulsing gently:  "PRESS ANY BUTTON TO EAT"
- Any button or trigger → the logo does its "Gulp" animation, a chomp sound plays, and the menu flows in (no loading screen — the Menu scene was preloaded additively in the background and is simply activated and revealed). Transition time ≤ 1s.
- Version text bottom-right of the island floor: "Ronnie Simulator v1.0 — A Tommy Production".

51.3 TITLE MUSIC & AUDIO
- Main theme (original): an upbeat, chant-able stadium-style tune on brass, bass and claps, with a crowd humming "RON-NIE, RON-NIE" in the chorus (original melody, no existing chants or songs).
- The music ducks when Tommy speaks.
- Tommy's title-screen lines (random every 15–25s):
  - "Welcome to Ronnie Simulator. Mind the crumbs."
  - "It's a simulator, Ron. Of you. Eating. It was very easy to research."
  - "Go on, press a button. He's getting hungry."
  - "I'm in this game too, you know. The good-looking bit."
  - "Born one day after me and he's already got his own game. Typical."
- Attract mode: after 45s with no input, the logo does a little drum-roll and Tommy says "Still there? I'll just do some sit-ups then." (He does sit-ups on the island.)

51.4 PERFORMANCE BUDGET (Title)
≤ 60k triangles, ≤ 35 draw calls, 1 baked lightmap set, 1 directional light (no shadows except a blob under Tommy), ≤ 400 particles total. Locked 90fps with large headroom.

=========================================================================
52. [F] LOADING SCREEN — "THE WAITING ROOM"
=========================================================================
Every load (menu ↔ level, level ↔ level) uses the same loading flow, so it's consistent, smooth and always says RONNIE SIMULATOR.

52.1 THE SET: RONNIE'S WAITING ROOM
- A cosy, tiny circular room (6m diameter) in soft Ink Navy and blue, like the inside of a giant MONSTOR can (curved walls with a subtle green claw pattern, a ring of soft emissive light at the top).
- Directly ahead, 3m away: LOGO_3D "RONNIE SIMULATOR" mounted on the wall, breathing.
- Below the logo: the LEVEL CARD — a big chunky sign that slides in with the next level's name and number, e.g.
    LEVEL 3
    KEBAB SHOP AT 2AM
  with a small illustrated thumbnail (pre-rendered image, not a live view) and the player's best star rating for that level.
- Below that: the CHONK LOADING METER (see 52.2).
- A "Tip" board to the right (see 52.4).
- Tommy sits on a bench to the left, reading a magazine with himself on the cover, occasionally commenting (see 52.5).
- Floor: a big round doormat that says "WIPE YOUR CHINS".

52.2 THE CHONK LOADING METER (the progress bar)
- A cartoon side-view of Ronnie's belly in a blue shirt, 1.5m wide. As loading progresses (0–100%), the belly inflates, the shirt stretches, and buttons strain. At 100% one button pings off with a "ping!" and the text changes from "LOADING..." to "READY TO EAT!".
- Above the belly: "LOADING... 67%" in the bold logo font (real progress from the async operation, smoothed so it never jumps backwards and never sits frozen — if real progress stalls, the belly keeps doing a gentle breathing wobble so the screen always looks alive).
- Rotating sub-text under the meter (changes every 2s): "Warming up the deep fat fryer...", "Restocking the MONSTOR fridge...", "Widening the doorways...", "Reinforcing the floorboards...", "Counting chins...", "Hiding the salad...", "Telling Tommy to stop flexing...", "Calculating Ronnie's postcode...", "Inflating the bouncy castle (it will pop)...", "Waking up the kebab man...".

52.3 MINIMUM AND MAXIMUM TIMES
- Minimum display time: 2.5 seconds (so tips and the level card can be read and the transition never "flashes").
- Target load time: under 6 seconds per level on Quest 3 (Addressables + compressed textures + shader warm-up).
- If loading takes longer than 10 seconds, show an extra Tommy line ("This is taking ages. It's like waiting for Ronnie to get off the sofa.") and keep everything animating.

52.4 LOADING TIPS (show one at a time, never the same twice in a row — write at least 40)
Gameplay tips (useful) and joke tips (funny), mixed 50/50:
- "Eat within 1.5 seconds to build a BULK COMBO."
- "Chug 5 MONSTOR cans quickly to UNLEASH THE MONSTOR."
- "Hold the burp button too long and it comes out anyway. Twice as big."
- "Tommy can be hit with food. He's just trying to help."
- "Throw a whole pizza like a frisbee, then catch it in your mouth for double Chonk."
- "Shake a MONSTOR can before opening it to spray Tommy across the room."
- "Look in the mirror. Count the chins. Feel proud."
- "Doorways get smaller as Ronnie gets bigger. Allegedly."
- "Tommy is one day older than Ronnie. He will tell you this. Constantly."
- "The salad bar exists. Nobody knows why."
- "Ronnie's neck was last seen in 2018. Find it in The Neck Search."
- "Crush cans on your forehead for bonus points. It's science."
- "The 'Rehab' MONSTOR flavour shrinks you. It's covered in dust for a reason."
- "Fun fact: Ronnie's shirt says 10. His Chonk Meter says otherwise."
- "Don't stop for too long. Abs the corgi will get flattened."
- "Golden Burgers are rare. Tommy cries when he sees one."
- "Sitting on sofas is easy. Getting up is not."
- "At Stage 10 you stop walking and start rolling. Embrace it."
- "Tip from Tommy: have you tried... not?"
(Continue to 40+ in the same style.)

52.5 TOMMY IN THE WAITING ROOM (voiced, random, one per load)
- "Loading. Like Ronnie's plate."
- "Take a seat. Not that one, Ron, it's only rated for normal people."
- "While we wait, I'll do some crunches. You do some... crunches. Of crisps."
- "I read this magazine every time. It's got me on the cover. Brilliant read."
- "Nearly there. Like your third dinner."
- After a level where the player hit Tommy a lot: "My back's still sore from that last level. I'm just trying to help."
- Before the Birthday level: "Big day tomorrow. Oh wait, it's today. Mine was yesterday. Better party."
- Before the Space level: "We're going to space, Ron. They had to use two rockets. Guess why."

52.6 THE SMOOTH-LOADING TECHNIQUE (exact sequence — implement exactly)
1. Player chooses a level. FadeController fades the view to black over 0.3s (fade is a full-screen quad on the camera at alpha 1, drawn last; head tracking continues).
2. While black: unload the old scene (async), run Resources.UnloadUnusedAssets + GC, then load the LoadingRoom scene additively (it's tiny, so this is fast).
3. Fade in from black (0.3s). The player is now in the Waiting Room; everything animates at 90fps.
4. Start Addressables.LoadSceneAsync(nextLevel, LoadSceneMode.Additive, activateOnLoad: false). Feed its PercentComplete into the Chonk Loading Meter (smoothed).
5. Meanwhile, warm up the next level's ShaderVariantCollection in small chunks spread over several frames (never all in one frame), and preload the level's audio bank.
6. When loading reaches its ready state AND the minimum display time (2.5s) has passed: show "READY TO EAT!", button ping, Tommy's quick line.
7. Show the compositor-layer logo: enable an OpenXR compositor layer (e.g. OVROverlay) showing LOGO_2D_Full + "LOADING..." world-locked at 3m. Compositor layers are drawn by the Quest OS, so they stay perfectly smooth even if Unity stalls for a moment.
8. Fade the scene to black behind the compositor layer (0.3s) — the player now sees only the crisp floating logo.
9. Activate the level scene (this is where Unity can hitch — the player doesn't see it, because only the OS-drawn logo is visible).
10. Unload the LoadingRoom, position the XR rig at the level's spawn point, let 3 frames settle (physics, lightmaps, probes), then hide the compositor layer and fade in from black (0.4s) with a level-start sting ("RONNIE HAS ENTERED THE BUILDING") and Tommy's level greeting.
- If compositor layers are unavailable on the current SDK setup, steps 7–9 fall back to: fade to black, activate, fade in — still smooth, just without the floating logo during the black.
- The whole loading flow lives in LoadingController.cs; nothing else is allowed to load scenes directly.

=========================================================================
53. [E] MAIN MENU — "RONNIE'S FRIDGE"
=========================================================================

53.1 THE SET
- The player stands in a stylised, slightly oversized kitchen corner at night, lit by a warm under-cabinet glow and the cold blue light of a huge double-door fridge in front of them.
- Above the fridge, fixed to the wall: LOGO_3D "RONNIE SIMULATOR" in neon-style emissive tubes (blue letters, green MONSTOR i-dot) with fake bloom glow cards, flickering once every ~20s (photosensitivity-safe).
- The fridge doors swing open as the menu appears with a soft "fwump" and a heavenly choir chord; cold mist (24 particles) rolls out of the bottom.
- Tommy leans on the counter to the right, sipping a glass of water, and comments on whatever the player points at.
- A chalkboard on the side of the fridge shows "TODAY'S SPECIALS" = the player's stats (total calories eaten, most chins, Tommy launches).
- Background music: a relaxed, late-night lo-fi version of the main theme.

53.2 MENU OPTIONS (each is a food item on a fridge shelf — point the controller ray at it, pull trigger to select)
| Shelf | Item | Option | Hover animation | Tommy hover line |
|---|---|---|---|---|
| Top | Giant golden burger with a "PLAY" flag | PLAY / CONTINUE | bounces, eyes look at you | "Go on, Ron. Dinner's served." |
| Top | Pizza box | LEVEL SELECT | lid flips open, steam puffs | "Pick a level. Any level. They all end the same way." |
| Middle | Party cake with sparklers | BONUS LEVELS | sparklers fizz | "Bonus levels. Bonus calories." |
| Middle | Locked lunchbox with Tommy's face on it | TOMMY MODE (locked until game complete; shows a padlock) | padlock rattles | "That's MY lunchbox. Finish the game first." |
| Middle | Two MONSTOR cans clinking | CHONK-OFF (2 PLAYER) | cans clink and fizz | "Me versus you? I'll win. I'm older." |
| Bottom | Shirt on a hanger, stretched | WARDROBE (unlocks) | hanger swings | "Your shirts are crying out for help." |
| Bottom | Trophy-shaped jelly | STATS & AWARDS | jelly wobbles | "Most chins in a minute. You must be so proud." |
| Bottom | MONSTOR can with a cog on it | SETTINGS | cog spins | "Settings. Can you turn the Ronnie down?" |
| Door shelf | Birthday card | CREDITS | card opens | "Credits. I'm in them. A lot." |
| Floor | Pedal bin | QUIT | lid flaps | "Leaving? He'll eat the fridge while you're gone." |
- Hovered items: scale up 15% with elastic ease, outline brightens to Chonk Orange, gentle haptic tick.
- Selected: the item is "eaten" (chomp sound, crumbs burst), then the sub-menu slides in.
- Accessibility fallback: press the menu button to swap to a flat, readable panel menu (same options as large buttons, laser-pointer controlled), for players who prefer a simple list.
- Seated mode: all fridge shelves sit between 0.9m and 1.6m height so everything is reachable seated.

53.3 MENU PERFORMANCE BUDGET
≤ 55k triangles, ≤ 40 draw calls, baked lighting, fridge interior light faked with an emissive panel + glow card, 1 compositor-layer option for the flat fallback menu text (crisp text).

=========================================================================
54. SUB-MENUS
=========================================================================

54.1 LEVEL SELECT — "THE PIZZA BOX CAROUSEL"
- A carousel of giant pizza boxes floats in front of the fridge; swipe the thumbstick or grab-and-spin to rotate. Each box lid shows the level art and title:
  1. RONNIE'S BEDROOM, 2. THE CORNER SHOP, 3. KEBAB SHOP AT 2AM, 4. ALL-YOU-CAN-EAT BUFFET, 5. RONNIE'S BIRTHDAY PARTY, 6. SPACE: THE FINAL BUFFET
  Bonus boxes: Fridge Raid at 3AM, Food Fight Arena, Ice Cream Van Chase, Ronnie Roast Night.
- Box shows: stars earned (1–3 cartoon doughnuts), best stage reached ("BEST: ABSOLUTE UNIT"), best calories, and a lock icon with a joke reason if locked ("LOCKED: Ronnie hasn't finished his snack yet").
- Select: the lid opens, a slice pops out with "PLAY" on it, and a chomp starts the loading flow.
- Thumbnails are pre-rendered images (512x512 in an atlas), never live 3D previews.

54.2 SETTINGS — "THE MONSTOR CAN CONTROL PANEL"
A chunky control panel on a floating MONSTOR-can-shaped board, with big tabs:
- COMFORT: locomotion (Smooth / Teleport), turn (Snap 30°/45°/Smooth), vignette (Off/Low/High), camera shake (Off/Low/Full), slow-motion effects (On/Off), seated mode, height calibration ("Stand tall... taller... that's Ronnie at Stage 1"), dominant hand.
- GRAPHICS: quality preset (Stunning / Smooth / Low — section 30.5), show FPS counter (debug).
- AUDIO: Master, Music, SFX, Tommy's Voice, NPC Voices, Narrator — each a big chunky slider shaped like a sausage. Test button plays a Tommy line.
- SUBTITLES: On/Off, size (S/M/L), speech-bubble background opacity.
- ACCESSIBILITY: photosensitivity mode, colour-blind-safe UI, reduced particles, one-handed mode (all actions mappable to one controller).
- GAMEPLAY: Tommy chattiness (Normal / Extra / "Maximum Tommy"), excuse button on/off, combo window (Normal / Relaxed).
- CONTROLS: a controller diagram showing every button and what it does, with jokey labels ("B: BURP. Use responsibly.").
- Every change applies instantly and saves to the settings file. A "Reset to Default" button asks for confirmation ("Tommy says: are you sure? Even I'm not that perfect.").

54.3 WARDROBE
- Ronnie's mannequin (Stage 1 body with a slider to preview any stage) on a rotating platform with a mirror behind it.
- Unlockables on hangers: kit shirts, Christmas jumper, can crown, bib, sweatband. Locked items show as silhouettes with "?".
- Tommy's outfits also appear here once Tommy Mode is unlocked.

54.4 STATS & AWARDS — "THE TROPHY SHELF"
- A shelf of jelly trophies (each wobbles when touched), one per award (from Feature 48).
- A big framed receipt showing lifetime stats: total calories, cans chugged, chins gained, excuses shouted, Times Tommy Tried To Help, furthest Tommy launch, furniture destroyed, sofas escaped.
- A "Chin of Fame" wall with photo-mode pictures the player saved.

54.5 CREDITS — "THE BIRTHDAY CARD"
- A giant birthday card opens; credits roll inside it with silly job titles: "Lead Abs: Tommy", "Head of Catering: Ronnie", "Also Catering: Ronnie", "Structural Engineer: Very Tired", "Voice of Tommy: Tommy (obviously)".
- Tommy narrates the start in his documentary voice.
- Ends with the RONNIE SIMULATOR logo and a burp.

54.6 QUIT CONFIRMATION
- The pedal bin opens: "QUIT RONNIE SIMULATOR?" with two big buttons: "YES (Tommy will tell everyone)" / "NO (keep eating)".
- Tommy: "You're quitting? I'll tell the group chat." Selecting YES: chomp, fade, quit.

=========================================================================
55. FIRST-LAUNCH EXPERIENCE
=========================================================================
55.1 COMFORT SETUP (first launch only, after the title screen)
- Tommy walks the player through 3 quick choices in the menu kitchen: "Do you get motion sick? Be honest. I won't tell Ronnie." → Comfortable / Moderate / Full Chaos (section 25). Then "Standing or sitting?" Then height calibration.
- Takes under 45 seconds, skippable, changeable later in Settings.

55.2 TUTORIAL (folded into Level 1's opening)
- Ronnie wakes up in bed. Tommy leans in the doorway and teaches the basics with voiced lines and floating world-space prompts: grab (a doughnut), eat (bring it to your mouth), chug (a MONSTOR can), burp (B), excuse (A), throw (at Tommy — "go on, I can take it"). Each prompt disappears once done. Then the timer starts.

=========================================================================
56. PAUSE, LEVEL-END & GAME-OVER SCREENS
=========================================================================
56.1 PAUSE — "THE PIZZA BOX"
- Pressing Menu: the world freezes and dims (physics paused, Time.timeScale 0, but head tracking and the XR rig keep running), a giant pizza box appears 1.2m in front of the player and opens.
- Slices: RESUME, RESTART LEVEL, SETTINGS, QUIT TO MENU. The lid shows the small RONNIE SIMULATOR logo and the current stage + Chonk.
- Tommy, frozen mid-pose in the background, has a speech bubble: "Paused? Is it snack time?"
- Pausing also triggers automatically when the headset is removed or the Quest system menu opens (required behaviour for Quest apps).

56.2 LEVEL COMPLETE
- Scale Breaker cutscene → the giant receipt Scorecard prints from the ceiling with RONNIE SIMULATOR printed at the top like a shop logo, then each stat line prints with a receipt-printer sound and a running total.
- Stars awarded as doughnuts dropping onto the receipt.
- Buttons on the receipt: NEXT LEVEL / REPLAY / MENU.

56.3 "TIME'S UP" (level timer ends before Ronnie fills the room)
- Not a failure screen — a joke: "TIME'S UP! Ronnie is still hungry." Tommy: "Not bad, Ron. Still huge though." Then the normal Scorecard.

=========================================================================
57. FRONT-END SCRIPTS (add to section 26)
=========================================================================
- BootLoader.cs — first-frame logic, Core load, settings read, title preload.
- IntroSting.cs — Tommy Production sequence, skip handling.
- TitleScreen.cs — logo idle/gulp animation triggers, "press any button" input, attract mode, menu preload/activation.
- LogoAnimator.cs — breathing, squash/pop, gulp wave, letter drop-in (reusable on all logo instances).
- MainMenuFridge.cs — option registry, hover/select, Tommy hover lines, flat-menu fallback toggle.
- MenuItemFood.cs — per-option hover/select animation, eat effect.
- LevelSelectCarousel.cs — carousel input, lock logic, star display.
- SettingsPanel.cs + SettingsData (ScriptableObject + JSON) — live-apply all settings.
- LoadingController.cs — the ONLY scene loader; implements section 52.6 exactly, with Addressables, shader warm-up, minimum display time, compositor-layer logo, fades.
- ChonkLoadingMeter.cs — belly inflation driven by smoothed progress, idle wobble on stall.
- LoadingTips.cs — tip rotation with no repeats.
- FadeController.cs — black fade quad, coroutine API (FadeOut, FadeIn), never blocks head tracking.
- CompositorLogo.cs — enables/disables the OS-drawn loading logo layer.
- PauseMenuPizza.cs — pause/resume, auto-pause on headset removal and system menu focus loss.
- ScorecardReceipt.cs — receipt printing animation and buttons.
- FirstLaunchSetup.cs — comfort setup flow.

=========================================================================
58. FRONT-END QA CHECKLIST
=========================================================================
[ ] System splash shows the RONNIE SIMULATOR logo instantly on launch; no Unity splash appears.
[ ] Head-tracked graphics appear within 4 seconds of launch (time it with a stopwatch 5 times).
[ ] No logo, spinner, bar or text is ever locked to the player's face.
[ ] Intro is skippable from the first frame.
[ ] Title, Menu and Waiting Room hold a locked 90fps (OVR Metrics Tool) with no frame over 13ms.
[ ] Every transition is a fade or compositor-layer handover — the player never sees a frozen frame. Test by deliberately loading the heaviest level 10 times in a row.
[ ] The Chonk Loading Meter never goes backwards and never looks frozen.
[ ] Level load time under 6 seconds on Quest 3 for every level.
[ ] Memory returns to the same baseline after going Menu → Level → Menu 10 times (no leaks).
[ ] The first bite in every level has no hitch (shader warm-up working).
[ ] Removing the headset pauses the game; putting it back on shows the pizza-box pause menu.
[ ] Every front-end screen clearly shows "RONNIE SIMULATOR".
[ ] All menus are fully usable seated and with one hand.


#########################################################################
#########################################################################
##                                                                     ##
##   PART 5 — THE SQUAD                                                ##
##   Ronnie's mates, Chloe and Tasha: they all try to stop him.        ##
##   None of them can.                                                 ##
##                                                                     ##
#########################################################################
#########################################################################

=========================================================================
59. CAST OVERVIEW
=========================================================================

59.1 THE BIG IDEA
Everyone in Ronnie's life is trying to stop him getting too fat. They stage interventions, hide food, tackle him, distract him, film him, and roast him — and every single attempt fails, usually in a way that makes Ronnie even bigger. Each character has their own personality, their own way of trying to stop him, and their own way of failing.

59.2 THE CAST
| Character | Role | Height | Build | Hair | Facial hair | Club (parody kit for public builds) | Personality in one line |
|---|---|---|---|---|---|---|---|
| RONNIE | Player — barman at The Oysterfleet | 5ft 10 (178cm) | average, then ENORMOUS | black buzz cut | black goatee + moustache | Chelsea (blue "Kings Road FC") | Can't stop eating, has an excuse for everything |
| TOMMY | Main character — best mate, chief roaster (office job) | 5ft 6 (168cm) | athletic, six-pack | brown curtains | light-brown short full beard, stubbly edges | — | Smug, handsome, one day older, "just trying to help" |
| CHLOE | Main character — Ronnie's girlfriend | 5ft 7 (170cm) | slim/average | long, dark black, straight | — | — | Loves Ronnie, tries desperately to stop him, delightfully weird |
| TASHA | Main character — Tommy's girlfriend, co-chief roaster | 5ft 3 (160cm) | petite | long, curly, brown | — | — | Whimsical, dreamy, fires fat jokes like fairy dust |
| LEWIS | Mate | 6ft 3 (191cm) | huge gym bro | curly mullet / curtains hybrid | patchy stubble that "won't grow" | Crystal Palace (red & blue stripes, "Selhurst Eagles") | Cocky show-off, never stops flexing |
| HARRY H | Mate | 6ft 0 (183cm) | very lanky | short curls | short black beard | West Ham (claret & sky blue, "East End Irons") | Obsessed with American football and his dating-app matches |
| AIDAN O'KEEFFE | Mate (office job) | 5ft 10 (178cm) | moderate | longish black, tucked behind ears | full thick black beard | West Ham | English with Irish family roots, loves a pint of stout, calm until he isn't |
| NOAH | Mate | 5ft 8 (173cm) | VERY big and heavy-set — the bulkiest of the mates by far (not muscle) | short brown | stubble | Manchester United (red, "Red Devils of Trafford") | Rugby player who tries to tackle the problem away |
| OLIVER LYON | Mate | 5ft 9 (175cm) | average | brown, normal length | beard + glasses | Tottenham (white & navy, "Lilywhite Lane") | TikTok-famous, works at a discount supermarket, films everything |
| DYLAN LEWIS | Mate (office job) | 5ft 5 (165cm) | small and wiry | short black | stubbly goatee | West Ham | Absolutely unhinged, will attack, will not stop talking about Oasis |

59.3 IMPORTANT NOTES FOR THE BUILDER
- These are real friends of the person making this game. Make them recognisable from the descriptions above, but keep everything affectionate cartoon slapstick. If you want to use their real photos or record their real voices, only do it with each person's permission, and check everyone's happy before sharing the game outside the group.
- Football: in a private build you can use the real club names in dialogue. For anything public, use the parody kit names above and never the real club badges, sponsors or player names.
- Brands: Guinness → parody stout "BLACK LIFFEY STOUT"; Lidl → parody discount supermarket "LIDDLE-PRICE"; TikTok → parody app "CLIKCLOK"; NFL → "American football" with generic teams; Oasis → characters can TALK about the band and its albums and say how much they love them, but never sing or quote real lyrics; any songs Dylan sings are ORIGINAL "Britpop-style" tunes with original words.
- Everyone in the squad is from England and they all know each other from school. Aidan grew up in England with Irish family roots (hence O'Keeffe and the love of stout); his humour comes from his own personality (calm, dry, beer-loving, beard pride).
- All characters are adults.

59.4 THE HEIGHT CHART (update the bedroom height-chart prop, section 21.1 #17)
A door frame with marks for everyone, each with a little caption:
- Dylan 165 — "Dylan (pocket rocket, do not approach)"
- Tasha 160 — "Tasha (tiny, mighty, mean)"
- Tommy 168 — "Tommy (perfect)"
- Chloe 170 — "Chloe (too good for him)"
- Noah 173 — "Noah (scrum height)"
- Oliver 175 — "Oliver (verified ✔)"
- Ronnie 178 — "Ronnie (height)" with a SECOND mark going sideways: "Ronnie (width)"
- Aidan 178 — "Aidan (same as Ronnie, but vertically)"
- Harry H 183 — "Harry (mostly legs)"
- Lewis 191 — "Lewis (and he'll tell you)"

59.5 CHARACTER COLOUR CODES (used for subtitles, UI icons, and each character's rim light when they speak)
Ronnie #1D4FD8 blue • Tommy #FFD54A gold • Chloe #B57BFF lavender • Tasha #FF8FC7 bubblegum pink • Lewis #E8303A palace red • Harry H #7A1F3D claret • Aidan #2E7D32 deep green • Noah #C62828 red • Oliver #00E5FF clikclok cyan • Dylan #FF6D00 chaos orange

=========================================================================
60. UPDATED RONNIE & TOMMY LOOKS (these replace earlier descriptions)
=========================================================================

60.1 RONNIE
- 5ft 10 (178cm), average build at Stage 1, black buzz cut, black goatee joined to a black moustache, dark eyebrows, friendly round-ish face with a cheeky grin.
- As he grows: the buzz cut stays the same size, so his head looks smaller and smaller on top of his body (big laugh in mirrors). The goatee stretches wider across his chins. At 8+ chins, the goatee gets lost between them — Tommy and Tasha both have lines about "where's your goatee gone?"
- Growth gag: at Stage 6, Ronnie's buzz cut gets sweat droplets glistening on it (gloss vertex mask).

60.2 TOMMY
- 5ft 6 (168cm), four inches shorter than Ronnie, athletic inverted-triangle build, six-pack, brown curtain hairstyle (centre parting), neat short light-brown full beard with stubbly edges, sparkle teeth, personal spotlight.
- New gag: he constantly runs his hand through his curtains and they fall back perfectly ("ting!").
- With Tasha around: they hold hands, finish each other's fat jokes, and high-five after every good roast.

=========================================================================
61. CHLOE — RONNIE'S GIRLFRIEND (MAIN CHARACTER)
=========================================================================

61.1 LOOKS & MODEL
- 5ft 7 (170cm), long dark black straight hair (to mid-back), expressive big eyes, warm smile that switches instantly to a "Ronnie, NO" glare.
- Default outfit: cosy oversized hoodie in lavender (#B57BFF), black leggings, chunky white trainers. Variants: date-night outfit (Date Night level), pyjamas with odd patterns (Fridge Raid), party outfit (Birthday), spacesuit with a picnic hamper of salad (Space).
- Hair: long hair as 6–8 sculpted chunks with 4 spring-bone chains (so it swings when she turns or stomps), anisotropic matcap highlight. Alternate "Hair_Static" (after a burp shockwave — sticks out like she's been electrocuted).
- Model budget: 22,000 tris LOD0 (same as Tommy — she's a main character), 3 materials.
- Blend shapes: Smile_Warm, Glare_NO (signature), Eye_Roll, Facepalm_Face, Gasp, Weird_Grin (for her weird moments), Pout, Laugh_Big, Blink_L/R, 15 visemes.

61.2 PERSONALITY
- She genuinely loves Ronnie and wants him to stop before he eats the house — but he's out of control.
- She's also WEIRD, in a lovable random way. Her weird moments come out of nowhere:
  - She gives every food a name and a backstory before Ronnie eats it ("That's Gerald. Gerald had dreams, Ronnie.").
  - She talks to Ronnie's belly directly, like it's a separate person ("I'm not talking to you, Ronnie. I'm talking to HIM.").
  - She does a strange little victory dance whenever she successfully hides food (it never lasts).
  - She has odd facts ready at all times ("Did you know a group of chins is called a... Ronnie.").
  - She occasionally just stares at the player for 3 seconds, says "...anyway", and carries on.
  - She keeps a jar of "emergency weird things" (a rubber chicken, a single sock, a kazoo) that she pulls out at random.
  (Builder: make these easy to edit in a data file — Tommy can swap in Chloe's real quirks.)

61.3 HOW CHLOE TRIES TO STOP RONNIE (her mechanics in normal levels)
1. THE GLARE: Chloe appears and gives "the look". If Ronnie is looking at her when she glares, he freezes for 2 seconds (comedy "busted" sting, Ronnie hides the food behind his back — it's obviously still visible). After 2 seconds he eats it anyway.
2. FOOD SWAP: she sneaks up and swaps the food in Ronnie's hand for a stick of celery. Ronnie eats the celery too, and it's worth Chonk anyway ("He ATE the celery.").
3. FRIDGE LOCK: she padlocks the fridge. Ronnie eats the padlock (it's chocolate — she didn't know, she bought it in a weird shop).
4. SALAD AMBUSH: she throws salad leaves at Ronnie; they stick to him and fall off. A rare "Chloe's Special Salad" is secretly covered in cheese and croutons (+40 Chonk). She is horrified.
5. THE HUG BLOCK: she hugs Ronnie to stop him reaching food. From Stage 6 her arms don't reach around him and she just dangles off his belly, still holding on.
6. NAME THE FOOD: she names the food (61.2) to make him feel guilty. Eating a named food gives a special "Guilt Bonus" x1.5 Chonk and a sad violin.

61.4 CHLOE VOICE LINES (write at least 80; voice direction: warm, expressive, quick-fire, switches between sweet and exasperated in a heartbeat, occasionally goes into a flat, weird deadpan)
Stopping him:
- "Ronnie. Put. It. Down."
- "That's your FOURTH breakfast, babe."
- "I hid that! I hid that in the TUMBLE DRYER!"
- "Ronnie, I love you, but you're blocking the telly. From the kitchen."
- "We said one doughnut! ONE!"
- "I'm not angry. I'm just... worried about the sofa."
- "Ronnie, babe, the doctor said 'cut down', not 'cut the cake'."
- "Stop! That's my lunch! And my dinner! And... that was the dog's."
Failing:
- "I literally padlocked it. How do you eat a PADLOCK?"
- "He ate the celery. He ate the CELERY."
- "I can't get my arms around you any more, Ronnie. I'm just hanging here now."
- "Fine. FINE. Eat it. I'll just watch. Like a nature documentary."
Weird:
- "That's Gerald. Gerald had a family."
- "I'm not talking to you. I'm talking to your belly. Hello, belly."
- "Did you know a group of chins is called a Ronnie? I made that up. It's still true."
- "...anyway."
- "I brought a kazoo. Don't ask why. *kazoo noise*"
- "If you eat one more crisp I'm going to start speaking only in whale sounds."
- "I had a dream you were a moon. I'm starting to think it was a prophecy."
Loving:
- "You're still my Ronnie. There's just... SO much more Ronnie."
- "I love every one of your chins. I've named them. That one's Barry."
With Tommy:
- "Tommy, stop flexing and HELP me." / Tommy: "I am helping. Visually."
With Tasha:
- Tasha: "Chloe, he's eclipsing you." / Chloe: "He's what?" / Tasha: "You're in his shadow. Literally. You've been in it for an hour."

61.5 CHLOE FEATURES & MODES
F-C1. CHLOE MODE — "HIDE THE SNACKS" (unlockable mode)
- Play as Chloe in Ronnie's house. AI Ronnie wanders around, getting hungrier. The player must hide every snack before he finds it.
- Hiding spots: inside the washing machine, under floorboards, in a plant pot, inside a hollowed-out book, taped under the table, in Tommy's gym bag ("he'll never look there").
- Ronnie's AI searches using "sniff" behaviour: a visible green smell-wave travels from food to Ronnie's nose; badly hidden food (e.g. a kebab in a sock drawer) gives off a bigger smell-wave.
- Tools: decoy salads (Ronnie ignores them... mostly), fridge alarms, Glare (stuns Ronnie 2s), a whistle that summons Tommy to "help" (he stands there and flexes).
- Ronnie Hunger Meter: if he finds 5 snacks, he enters "Snack Rampage" and eats the house anyway (the level ends with Chloe sitting on the curb as the house rolls past).
- Win condition: survive 5 minutes with Ronnie eating fewer than 5 snacks. Win screen: Ronnie, still hungry, eats the trophy.
F-C2. DATE NIGHT (new level — "La Grande Portion")
- A fancy restaurant date. Chloe sits opposite Ronnie at a candlelit table (the player is seated — perfect for VR comfort).
- Mechanic "Don't Get Caught": Chloe keeps looking up at Ronnie lovingly. When she's looking at you, you must sit still and smile (the game detects head and hand movement). When she looks away (to check her phone, talk to the waiter, or have a weird moment), grab food from other tables, the dessert trolley and passing waiters, and eat it before she looks back.
- Tells: her eyes flick a moment before she looks back (0.6s warning), plus a little "ding" from the candle.
- Getting caught: The Glare + "RONNIE." Three catches = she orders you a salad (Chonk 0, but you can still eat the bowl).
- Escalation: as Ronnie grows, the chair breaks, the table tilts toward him, and the other diners start watching like it's a sport. At the end, the waiter brings the bill: it's a scroll that unrolls out of the restaurant door.
- Weird interrupt: halfway through, Chloe stands up and does her victory dance for no reason, giving Ronnie a 6-second free-for-all.
F-C3. CHLOE'S WEIRD HOUR (bonus surreal level)
- Ronnie falls asleep after a huge meal and enters Chloe's dream: a pastel lavender world where food has names, wears little hats and gives speeches before being eaten; Gerald the burger is the mayor.
- Chloe narrates in her flat deadpan voice: "This is my dream. I'm in charge here. Nobody gets eaten without a name."
- Mechanic: you can only eat food after hearing its name. Food runs away shouting its name. A rubber-chicken boss chases you.
F-C4. CO-OP "COUPLE GOALS" (2 players)
- Player 1 is Ronnie, Player 2 is Chloe (local pass-and-play or online). Ronnie tries to eat; Chloe tries to stop him. Then swap.
- Score: Ronnie scores Chonk; Chloe scores "Snacks Saved". End screen: "Relationship status: still together, somehow."
F-C5. "BABE, NO" COUNTER
- A stat on the scorecard: number of times Chloe said "Ronnie, no" this level. Lifetime total on the trophy shelf.

=========================================================================
62. TASHA — TOMMY'S GIRLFRIEND (MAIN CHARACTER, CO-CHIEF ROASTER)
=========================================================================

62.1 LOOKS & MODEL
- 5ft 3 (160cm) — the shortest of the main cast — with long, big, curly brown hair (#7A4E2D) that's almost as wide as she is.
- Dreamy, sparkly eyes; freckles; a cheeky little smile that appears right before every roast.
- Outfit: a floaty pastel dress or cardigan in bubblegum pink (#FF8FC7) with little star and cloud patterns, chunky boots, a flower clip in her hair. Variants: party dress (Birthday), fairy-tale storybook outfit (Storybook level), spacesuit with a tiara (Space).
- Hair: curly hair as a big cluster of sculpted curl chunks (12–16) on 5 spring-bone chains so it bounces when she laughs. It must be readable as "big curly hair" in silhouette.
- Model budget: 22,000 tris LOD0, 3 materials.
- Whimsy effects: tiny sparkle particles drift around her (8 particles), and butterflies occasionally land on her shoulder.
- Blend shapes: Smile_Cheeky (pre-roast), Laugh_Giggle, Dreamy_Eyes, Gasp_Delight, Wink, Pout, Blink_L/R, 15 visemes.

62.2 PERSONALITY
- Whimsical, dreamy and sweet-sounding — and absolutely savage. She delivers the meanest fat jokes in the softest, most magical way, like a fairy godmother with a grudge.
- She and Tommy are a roasting tag team: they finish each other's sentences, high-five after a good roast, and keep a "roast scoreboard".
- Her jokes are often fairy-tale or nature-themed, delivered like she's narrating a children's book.

62.3 HOW TASHA "HELPS" (she tries to stop Ronnie... in theory)
1. TASHA'S STORYTIME: she sits on something and narrates Ronnie's actions as a fairy tale in real time ("And lo, the mighty Ronnie spied a sausage roll, and his eyes went all sparkly..."). Every action the player takes during Storytime gets narrated. (Builder: drive this from gameplay events — 60+ narrator lines tagged by event.)
2. THE BUBBLE WAND: she blows magic bubbles; each one carries a floating roast word ("CHONK", "UNIT", "BIG BOI", "MOON") that pops on Ronnie with a sparkle and a giggle.
3. THE WISHING STAR: she makes a wish out loud for Ronnie to stop eating. A shooting star appears... and it's a doughnut. Ronnie eats it.
4. DECOY FAIRY CAKES: she leaves a trail of tiny fairy cakes to lead Ronnie outside "so the house can rest". It works — but he eats the garden too.
5. THE TASHA-TOMMY COMBO: when both are present, they trigger "Couple's Roast" (see 62.5): a duet of jokes, with a combo meter for the roasters.

62.4 TASHA VOICE LINES (write at least 120 — she's a main roaster; voice direction: soft, sing-song, whimsical, giggly, then a perfectly timed savage punchline)
Whimsical fat jokes:
- "Once upon a time there was a boy called Ronnie. And then he ate the time."
- "Ronnie, you're so big, the fairies have started renting rooms in your chins."
- "Look, a butterfly landed on you! It thinks you're a planet."
- "If you were a fairy-tale giant, Jack wouldn't need a beanstalk. He'd just climb your shirt."
- "Ronnie's not fat. He's just... a very large magical creature. Like a whale. A land whale."
- "I made a wish on a star for you, Ronnie. Then you ate the star."
- "You've got more rolls than a fairy bakery, and fairies LOVE bakeries."
- "Every time you sit down, a little elf somewhere screams."
- "Your chins are like Russian dolls. There's always another one inside."
- "Ronnie, the moon called. It wants its shape back."
- "I'd tell you to reach for the stars, Ron, but you'd eat them."
- "You're so round, when you lie down, birds land on you thinking you're a hill."
- "Ronnie's belly button is so deep, I dropped a wish in there and it never came back."
- "You're like a cloud. A big, fluffy, sausage-roll-flavoured cloud."
- "The Tooth Fairy came for your tooth and stayed for the snacks."
- "Ronnie, if you were a pumpkin, you wouldn't turn into a carriage. You'd turn into a bus."
- "I painted a picture of you, but I ran out of canvas. And paint. And wall."
- "Ronnie, you've got your own gravity now. I'm orbiting you. It's quite peaceful."
- "Your shadow has a shadow, Ron. That's not normal."
- "Ronnie's goatee is lost between his chins. Send a search party. Send snacks — he'll find them."
About Ronnie's head and buzz cut:
- "Your head looks like a little pea on top of a beanbag."
- "Ronnie's buzz cut is the only part of him that didn't grow. It's very loyal."
To Chloe:
- "Chloe, babe, you deserve a medal. And a bigger sofa."
- "Chloe, he's eclipsing you."
With Tommy (finishing each other's jokes):
- Tommy: "Ronnie's so big—" / Tasha: "—his photos come in instalments."
- Tasha: "When Ronnie walks past—" / Tommy: "—the ground does a little sigh."
- Tommy: "I'm one day older than Ronnie." / Tasha: "And one size smaller. Well. Forty sizes."
- Tasha: "Roast score?" / Tommy: "Us: 47. Ronnie: 0." / Tasha: "Ronnie: 47 doughnuts though."
When hit by the player:
- "Ow! I'm a delicate flower, Ronnie!"
- "You can't hit a fairy, it's bad luck. For YOU. *sparkle*"
- "I'm just helping Tommy help! It's a team effort!"
- "My curls! My beautiful curls!"

62.5 TASHA FEATURES & MODES
F-T1. COUPLE'S ROAST (system, whenever Tommy and Tasha are both present)
- A "Roast Meter" fills as the player eats in front of them. At full, they perform a 4-line duet roast with a spotlight on both, a little drum fill, and a high-five that sends sparkle confetti everywhere.
- The player can interrupt by throwing food at either; the other one shields their partner dramatically ("Not my Tasha!" / "Not my Tommy's hair!").
- Lifetime "Roast Scoreboard" on the trophy shelf: Tommy & Tasha's total roasts vs Ronnie's total calories.
F-T2. TASHA'S STORYBOOK (new level — "Ronnie and the Beanstalk")
- The whole level is a pop-up storybook. Pages fold up into 3D scenes as you walk through them, with paper textures, hand-drawn outlines and a soft watercolour look (a style switch for this level only: paper-grain texture overlay in the toon shader, warm watercolour ramp).
- Based on public-domain fairy-tale ideas (a beanstalk, a gingerbread house, a giant's castle) — Ronnie is the giant. The beanstalk is made of asparagus; he eats it anyway. The gingerbread house is fully edible. The giant's castle is a cake.
- Tasha narrates every page in her storybook voice, with the text appearing on the page as she reads it (subtitled), and she adds savage asides between lines.
- Page-turn transitions double as loading points (the page folds over = fade), keeping it smooth.
- Final page: "...and Ronnie lived happily ever after. Mostly in the kitchen. The End." Tasha closes the book on him.
F-T3. WHIMSY MODE (setting, unlocked after the Storybook level)
- Turns on a magical overlay for the whole game: butterflies land on Ronnie, a sparkle trail follows each bite, and Tasha occasionally narrates normal levels as a fairy tale.
F-T4. FAIRY-CAKE TRAIL (feature in house levels)
- Tasha lays a trail of 20 fairy cakes leading out of the front door; following it is worth bonus Chonk and opens a secret garden area with a giant garden-gnome cake.
F-T5. "BUBBLE ROAST" MINIGAME
- Tasha blows 30 bubbles with roast words in them; Ronnie must pop them with food before they reach him. Each bubble that reaches him plays its roast word in Tasha's giggle.

=========================================================================
63. THE MATES — FULL PROFILES
=========================================================================
Each mate has: looks/model, personality, how they try to stop Ronnie, how they fail, their signature mechanic, their home level/appearances, voice direction, a line bank (minimum 50 lines each — samples below, write the rest in the same style), a hit reaction, and banter with others.

-------------------------------------------------------------------------
63.1 LEWIS — "THE GYM BRO"
-------------------------------------------------------------------------
LOOKS & MODEL
- 6ft 3 (191cm) — the tallest of the squad. Massively muscular, almost comically V-shaped (wider than Tommy, but no visible six-pack — the gag is that Tommy's abs are better and Lewis knows it).
- Hair: curly brown mullet crossed with curtains — curly fringe split in the middle, curls flowing down the back of his neck. Sculpted curl chunks + 2 spring bones on the mullet so it bounces when he flexes.
- Facial hair: patchy, uneven stubble with visible gaps (it "can't be grown") — texture-painted with a few sparse sculpted tufts on the chin.
- Outfit: tight gym stringer vest in red and blue stripes (Palace-style), tiny gym shorts, lifting belt, wrist wraps, a massive gallon water jug with motivational time markings, gym bag. Variant: Palace-style shirt for matchday.
- Model budget: 12,000 tris LOD0 (mate tier), 1 atlased material.
- Signature animations: Flex_Double_Bicep, Flex_Most_Muscular (with veins popping as a decal), Mirror_Selfie, Protein_Shake_Chug, Walking_With_Lats_Spread (arms permanently out from his sides).
PERSONALITY
- Cocky, loud, constantly showing off, turns every conversation to his gains, his PBs and Crystal Palace. Competitive with Tommy over who has the better body — Tommy has the abs, Lewis has the size, they never agree.
HOW HE TRIES TO STOP RONNIE
1. SPOTTER INTERVENTION: he grabs Ronnie from behind and tries to drag him toward a treadmill. Ronnie keeps walking toward food and drags Lewis along the floor behind him like a cape.
2. PROTEIN SWAP: he swaps Ronnie's MONSTOR cans for protein shakes. Ronnie drinks them all, and protein makes him grow FASTER ("Bro... you're bulking. Not like that, bro.").
3. FLEX DISTRACTION: Lewis flexes in front of Ronnie to "inspire" him. Ronnie eats the snack Lewis was keeping in his waistband.
4. MEAL PREP PRISON: he stacks plastic tubs of plain chicken and rice in front of the food (the Chicken and Rice Prison feature). Ronnie eats the tubs.
SIGNATURE MECHANIC — "ABS-OFF"
- When Lewis and Tommy are both in a level, they challenge each other to a flex-off. Ronnie (the player) is the judge: throw a doughnut at the winner. The loser ragdolls dramatically from shame. Their argument continues all level.
HOME LEVEL: "LEWIS'S GYM" (new level, see 66.1). Also appears: Buffet (gatecrashes), Five-a-Side, Squad Intervention finale.
VOICE DIRECTION: loud, cocky, South London gym-bro energy, says "bro" constantly, laughs at his own jokes.
SAMPLE LINES
- "BRO. Bro. Put the pastry down, bro."
- "Look at these arms, Ron. These could be YOUR arms. Not like that though."
- "I benched 140 this morning. You benched a family-size lasagne."
- "Leg day, bro! Not leg OF LAMB day!"
- "My beard? It's growing, bro. It's a slow grower. Like your self-control."
- "Tommy, mate, your abs are cute. Mine are just... bigger. Under here. Somewhere."
- "Palace are going up, bro. Like your cholesterol."
- "Ronnie, you're not bulking. You're just bulk."
- "I'm gonna spot you, bro. I'm gonna spot you... eating... loads."
- "Bro, my protein shakes are for GAINS, not for... oh. Oh, you've gained."
HIT REACTION: absorbs small hits ("Is that it, bro?"), but a belly-bump at Stage 6+ launches him: "BROOOOOOOO—". Gets up flexing: "Didn't even hurt. I'm just trying to help, bro."
BANTER: vs Tommy (abs vs size), vs Noah (gym vs rugby: "Rugby's just cardio for people who can't lift"), Palace vs Ronnie's Chelsea.

-------------------------------------------------------------------------
63.2 HARRY H — "THE LANKY LOVER"
-------------------------------------------------------------------------
LOOKS & MODEL
- 6ft 0 (183cm), extremely lanky — long thin arms and legs, slightly hunched, all elbows and knees. Silhouette like a folding ruler.
- Hair: short tight dark curls (sculpted clumps). Short black beard, neat.
- Outfit: American-football jersey (generic team, number 69 — he thinks it's hilarious), claret-and-sky-blue West Ham-style scarf, phone permanently in hand with the dating app open, cap on backwards.
- Model budget: 12,000 tris, 1 material. Extra long-limb proportions mean his ragdoll is VERY floppy — tune for maximum comedy.
- Signature animations: Phone_Swipe (left/right with big arm swings), Touchdown_Celebration (spike + dance), Hut_Hut_Stance, Lanky_Run (arms windmilling), Lean_Over_Ronnie (he's tall enough to lean over Ronnie at Stage 1, not later).
PERSONALITY
- Always talking about American football and the girls he's matching with on dating apps (keep it light and clean — awkward chats, bad dates, being left on read). Thinks he's a smooth operator. He isn't.
HOW HE TRIES TO STOP RONNIE
1. THE INTERCEPTION: he dives and intercepts food out of Ronnie's hand like a football pass, with slow-mo and an American sports commentator voice. Then he spikes it in a touchdown celebration... onto Ronnie's plate.
2. THE BLITZ: he lines up and charges at Ronnie to tackle him away from the buffet. He bounces off Ronnie's belly and folds up like a deckchair.
3. THE DATING-APP DISTRACTION: he shows Ronnie his phone ("Look at this match, Ron!") to distract him. It's a dating profile for a pizza. Ronnie swipes right and eats it.
4. HAIL MARY: when Ronnie's about to eat something huge, Harry launches it across the room in a long throw. Ronnie catches it in his mouth (catching gives a +50% bonus, and Harry is devastated).
SIGNATURE MECHANIC — "CATCH & CHONK"
- Harry throws food spirals across the room for Ronnie to catch in his mouth (he's meant to be throwing it AWAY). Every catch has a crowd roar and a touchdown horn; Harry's commentary gets more desperate each time.
HOME LEVEL: "THE TAILGATE" (feature in the Five-a-Side level car park — see 66.4). Also: Buffet, Date Night (on his own disastrous date at the next table).
VOICE DIRECTION: excitable, a bit nasal, constantly hyped, slips into a fake American commentator voice.
SAMPLE LINES
- "Ronnie, my guy, I've matched with SIX girls this week. Six! None of them have replied, but SIX."
- "INTERCEPTION! Harry H with the pick! ...and he's handed it straight back to Ronnie. Terrible decision."
- "Ronnie, you'd make an amazing offensive lineman. You're already offensive. And a line. A wide line."
- "She said she likes tall guys. I'm tall! She said she likes guys with abs... I'm tall!"
- "Hut! Hut! HUT! ...he's not moving. He's eating the football."
- "Her bio said 'no time-wasters'. So I've wasted no time messaging her forty times."
- "West Ham till I die, Ron. Which, with your cooking, could be soon."
- "Ronnie, if you were on a dating app, your profile pic would need to be a panorama."
- "TOUCHDOWN! Wait, no, that's a doughnut. And it's gone."
HIT REACTION: folds up like a deckchair, limbs everywhere, his phone flies in the air and he catches it before landing: "Still got the phone! I'm just trying to help!"
BANTER: with Aidan and Dylan (the West Ham trio), with Lewis ("Gym's for people who can't run, bro" / "You can't run either, you're just long").

-------------------------------------------------------------------------
63.3 AIDAN O'KEEFFE — "THE PINT MAN"
-------------------------------------------------------------------------
LOOKS & MODEL
- 5ft 10 (178cm) — same height as Ronnie at Stage 1 (great for side-by-side "before and after" gags). Moderate build.
- Hair: longish black hair that he tucks behind his ears — sculpted chunks with a "tucked" state and an "untucked" state (2 spring bones per side). He tucks it back with a signature hand motion every few lines.
- Facial hair: big full thick black beard — sculpted solid mass with a soft fringe edge. Foam from his pint sticks in his beard as a decal after every sip.
- Outfit: West Ham-style claret and sky-blue shirt or a cosy knitted jumper, jeans, boots, always holding a pint glass of BLACK LIFFEY STOUT (parody), with a perfect creamy head.
- Model budget: 12,000 tris, 1 material.
- Signature animations: Hair_Tuck, Pint_Sip_Slow (with satisfied "ahh"), Pint_Admire (holds it up to the light), Beard_Stroke, Calm_Lean_Bar.
PERSONALITY
- Calm, dry-humoured, laid-back. Loves a pint of stout and talks about it with total reverence ("You have to let it settle, Ronnie"). Rarely raises his voice — so when he finally snaps, it's hilarious.
HOW HE TRIES TO STOP RONNIE
1. "JUST THE ONE": he takes Ronnie to the pub for "just one quiet pint" to distract him from food. Ronnie drinks everyone's pint, then eats every bag of crisps and pork scratchings behind the bar.
2. THE SETTLE: Aidan insists Ronnie must wait for the pint to settle (a 10-second wait timer with a calm countdown). If Ronnie waits, he gets a "Patience Bonus". He never waits — the player can try.
3. CALM TALK: he sits Ronnie down for a gentle heart-to-heart. Ronnie nods along... and eats the beer mats, the bar snacks and the menu.
4. THE BEARD SHIELD: he hides crisps in his beard. Ronnie finds them.
SIGNATURE MECHANIC — "STOUT MODE"
- Drinking Aidan's pint of BLACK LIFFEY STOUT triggers STOUT MODE (10s): everything goes slow and cosy (warm amber tint, slowed-down chill music), Ronnie's movement is heavy but each bite is worth x2 Chonk, and a creamy foam moustache appears on Ronnie's goatee. Aidan: "Ah, now you're getting it."
- (Keep alcohol comedic and non-graphic; no drunkenness mechanics beyond "cosy slow-mo". This game is for adults.)
HOME LEVEL: "THE OYSTERFLEET — MATCHDAY" (new level, see 66.2). Also: Birthday Party, Squad Intervention finale.
VOICE DIRECTION: soft, dry English voice, slow, calm, wry (a proud mention of his Irish grandparents now and then); the rare outburst is sudden and loud.
SAMPLE LINES
- "Ronnie. Lad. Sit down. Let's have a quiet one and talk about this."
- "You have to let it settle, Ronnie. Patience. ...and he's drunk it. Mine. That was mine."
- "I've seen a lot of things in my life, Ronnie. I've never seen a man eat a bar stool."
- "The beard's got crisps in it, hasn't it. You're looking at the beard. Don't look at the beard."
- "Come on you Irons. Come on, Ronnie, slow down."
- "That's a lovely pint. That WAS a lovely pint."
- "You're the only man I know who orders a pint and a pie and then eats the pub."
- [the rare snap] "RONNIE! PUT! THE! BAR! DOWN!" ...[instantly calm again] "...sorry. Anyway."
- *tucks hair behind ears* "Right. Intervention time. Let's be grown-ups about this."
HIT REACTION: protects his pint at all costs — he ragdolls with the pint held perfectly upright and not a drop spilt (physics-locked glass on a kinematic hand). "Didn't spill a drop. I'm just trying to help."
BANTER: West Ham trio with Harry and Dylan (they chant an ORIGINAL "Irons" chant when all three are together), calm foil to Dylan's chaos.

-------------------------------------------------------------------------
63.4 NOAH — "THE RUGBY TACKLER"
-------------------------------------------------------------------------
LOOKS & MODEL
- 5ft 8 (173cm) but HUGE: the widest, heaviest-set of all the mates — a proper front-row rugby prop. Barrel chest, thick neck, massive shoulders and thighs, big round face (body width 1.7x a normal mate; budget him at the top of the mate tier). Short brown hair, stubbly beard. At Stage 1, he is genuinely bigger than Ronnie — which makes the moment Ronnie overtakes him (around Stage 4) a big gag: Noah: "...you've overtaken me. You've OVERTAKEN me, Ron."
- Outfit: rugby shirt (hooped), muddy shorts, rugby boots, scrum cap around his neck, Manchester United-style red shirt for matchdays.
- Model budget: 12,000 tris, 1 material.
- Signature animations: Tackle_Dive, Scrum_Crouch ("crouch, bind, set"), Lineout_Lift, Ruck_Over, Fist_Pump, Bounce_Off (for when he hits Ronnie and bounces).
PERSONALITY
- Big-hearted, physical, direct — his answer to every problem is to tackle it. Proud Man United fan, constant banter with Ronnie's Chelsea and the West Ham trio.
- (Note: Noah is a bigger lad himself — his jokes and others' jokes about him should be about rugby and United, not his size. The size jokes are all for Ronnie.)
HOW HE TRIES TO STOP RONNIE
1. THE TACKLE: Noah sprints in and rugby-tackles Ronnie away from food. At Stages 1–3, Ronnie gets knocked aside (food drops — 2s to grab it back). From Stage 4, Noah bounces off like a trampoline. From Stage 8, Noah just clings to Ronnie's leg and gets carried around for the rest of the level.
2. SCRUM BLOCK: he forms a scrum with other mates (if present) in a doorway to block Ronnie. Ronnie pushes the whole scrum through the wall — a push minigame (push forward on both thumbsticks).
3. THE LINEOUT: he lifts the food high above his head, out of reach. Ronnie, being taller (and later enormous), just eats it from his hands.
4. HALF-TIME ORANGES: he offers Ronnie orange slices as a "healthy snack". Ronnie eats the whole crate and the peel.
SIGNATURE MECHANIC — "THE SCRUM"
- A physical push minigame: Noah + any mates present lock together in a scrum against Ronnie. The player pushes forward with both controllers (arm push motion) to drive them back. Win: the scrum collapses in a ragdoll pile and Ronnie eats the snacks they were guarding. Noah from the bottom of the pile: "Good scrum, Ron."
HOME LEVEL: "FIVE-A-SIDE" (new level, see 66.4 — he invites Ronnie to "get some exercise"). Also: Buffet (blocking the dessert table), Squad Intervention finale.
VOICE DIRECTION: big, warm, Northern-or-neutral hearty voice, enthusiastic, shouts rugby calls.
SAMPLE LINES
- "Right, Ronnie, I'm coming in. Brace!"
- "Crouch... bind... SET! ...he's eaten the ball."
- "I've tackled props, I've tackled locks, I've never tackled a man with his own moon."
- "Half-time oranges, Ron? Healthy! ...not the whole crate, Ronnie!"
- "United would never let a player get this big. Well. Except the wages."
- "I bounced off you, mate. I BOUNCED. Like a bouncy castle full of gravy."
- "I'm on your leg now, Ron. I live here now. This is my home."
- "Chelsea fan, eating like this? Typical."
HIT REACTION: barely moves when hit; tackles back playfully. If belly-bumped at Stage 8+, he bounces, lands, gets up instantly: "Good hit! I'm just trying to help!"
BANTER: Man United vs Chelsea with Ronnie, United vs Spurs with Oliver, rugby vs gym with Lewis.

-------------------------------------------------------------------------
63.5 OLIVER LYON — "THE CLIKCLOK STAR"
-------------------------------------------------------------------------
LOOKS & MODEL
- 5ft 9 (175cm), average build, normal-length brown hair (neatly styled for the camera), glasses (thick frames — they flash white when he's having an idea), full beard.
- Outfit A (work): discount-supermarket uniform (LIDDLE-PRICE: yellow and blue polo shirt with name badge "OLIVER — ASK ME ABOUT THE MIDDLE AISLE"), black trousers.
- Outfit B (going out): Tottenham-style white-and-navy shirt.
- Props: phone on a ring light/selfie stick at all times, a little "LIVE" red light on top.
- Model budget: 12,000 tris, 1 material; glasses as a separate small mesh with a matcap lens shine.
- Signature animations: Film_Ronnie (tracking him with the phone), Talk_To_Camera (turns away from Ronnie to address his followers), Trend_Dance (a ridiculous trending dance), Glasses_Push, Shocked_Face_Thumbnail (pose for a thumbnail with mouth wide open), Scan_Barcode.
PERSONALITY
- Went viral on ClikClok and has never recovered. Films everything, narrates to his followers, turns every moment into content. Works at LIDDLE-PRICE and knows every bargain. Spurs fan with a long-suffering attitude.
HOW HE TRIES TO STOP RONNIE
1. "SHAME CAM": he films Ronnie eating to "shame him into stopping" and posts it live. It goes viral — the followers LOVE Ronnie — and Ronnie eats faster for the fans.
2. THE CHALLENGE: he starts a "Ronnie, don't eat for 10 seconds" challenge for his followers. A 10-second timer appears. Nobody has ever seen Ronnie complete it.
3. YELLOW STICKERS: at the supermarket, he puts "REDUCED" yellow stickers on salads to tempt Ronnie. Ronnie eats the stickers and the bakery.
4. TRENDING DANCE: he tries to get Ronnie doing a dance trend "for cardio". Ronnie does the dance — it causes an earthquake.
SIGNATURE MECHANIC — "GOING VIRAL" METER
- When Oliver is filming, a floating ClikClok follower counter and live comments float above his phone. Big gags (combos, burps, sofa dents, Tommy launches) make followers jump; comments scroll in ("RONNIE FOR PM", "bro ate the sign 💀", "TOMMY'S ABS THO", "Chloe deserves better", "tasha ate him up (not literally, ronnie did that)").
- Hitting 1 million followers unlocks the "Verified Ronnie" gold tick badge that floats above Ronnie's head for the rest of the level and doubles combo points.
HOME LEVEL: "LIDDLE-PRICE SUPERMARKET" (new level, see 66.3). Also: everywhere — he pops up filming in the background of every level, which is how the Photo Mode and Slow-Mo Replay are "explained".
VOICE DIRECTION: upbeat content-creator voice, switches between talking normally and "Hey guys!" camera voice.
SAMPLE LINES
- "Hey guys, welcome back to the channel. Today: can my mate Ronnie NOT eat something? Spoiler: no."
- "Like, comment and subscribe, and pray for the bakery section."
- "Ronnie, you've just gained ten thousand followers. And ten pounds. Hang on, let me check. Twelve."
- "Middle aisle, Ronnie! Don't go down the middle aisle! ...he's eaten a paddling pool."
- "Spurs are rebuilding, Ronnie. Like your sofa."
- "Ronnie, put the reduced section down, that's for pensioners!"
- "This is content. This is GOLD. This is also a crime."
- *glasses flash* "I've got an idea. What if we put you on a diet... live? Ten million views. Easy."
- "Guys, he's eaten the self-checkout. 'Unexpected item in bagging area' is him. He is the unexpected item."
HIT REACTION: protects his phone above everything else, ragdolls while still filming, gets up and checks the footage: "Got it! In 4K! I'm just trying to help... the algorithm."
BANTER: Spurs vs everyone (especially the West Ham trio and Noah), constantly asking Tommy and Tasha for "a collab".

-------------------------------------------------------------------------
63.6 DYLAN LEWIS — "THE CHAOS GOBLIN"
-------------------------------------------------------------------------
LOOKS & MODEL
- 5ft 5 (165cm) — the shortest mate — small, wiry, full of energy, eyes slightly too wide. Short black hair, stubbly goatee.
- Outfit: West Ham-style claret and blue shirt, parka jacket (Britpop style), round sunglasses pushed up on his head, bucket hat (optional variant).
- Model budget: 12,000 tris, 1 material. His ragdoll has extra bounce — he's basically a pinball.
- Signature animations: Ambush_Leap (from bins, cupboards, ceiling vents, inside fridges), Wrestle_Cling (wraps arms and legs around Ronnie's arm or head), Air_Guitar, Britpop_Swagger_Walk (hands behind back, chin up), Chaos_Run (zig-zag), Victory_Scream.
PERSONALITY
- Completely unhinged in the best way. Will attack anything at any time. Absolutely obsessed with Oasis — talks about them constantly, rates everything against them, argues about which album is best, hums original Britpop-style tunes, wears the parka.
HOW HE TRIES TO STOP RONNIE
1. THE AMBUSH: Dylan bursts out of a bin/cupboard/ceiling vent screaming and jumps on Ronnie's arm to stop him eating. The player must shake him off (shake the controller hard) — or just eat the food with him still clinging on (he gets a bit of sauce in his hair).
2. THE HEADLOCK: he jumps on Ronnie's head and covers his mouth with both hands. Ronnie's view gets partially blocked by Dylan's hands for 3 seconds (comfort-safe: semi-transparent, never fully black). Ronnie eats through his fingers... not literally, Dylan pulls away screaming "HE BIT THE AIR NEXT TO ME!"
3. THE FOOD STEAL: he snatches food and runs off in a zig-zag, laughing like a maniac. Chase him and Ronnie can eat it from his hands when caught (he's tiny, Ronnie can just pick him up from Stage 6).
4. THE OASIS RANT: he stands in front of the fridge and starts a long rant about Oasis to block Ronnie. If the player stays to listen for 15 seconds, Dylan is so happy he hands over the food himself.
SIGNATURE MECHANIC — "DYLAN AMBUSH" + "PARKA PROTOCOL"
- Ambush: at random moments in any level (max once every 2 minutes), Dylan's chaos theme stings and he leaps from a hiding spot. Quick-time-style shake-off with comedy haptics. Successful shake-off launches him across the room (ragdoll).
- Parka Protocol: he hides food inside his enormous parka pockets. Every pocket contains something (a sausage roll, a whole baguette, a second smaller Dylan... no — a plush Dylan doll). Ronnie can pick-pocket the parka for bonus Chonk.
HOME LEVEL: appears everywhere as the ambusher. Featured in "THE OYSTERFLEET — MATCHDAY" (stands on a table) and "SQUAD INTERVENTION" finale (the final attacker, see 64).
VOICE DIRECTION: fast, high-energy, shouty East London lad, unpredictable volume, sudden screams, then suddenly very serious about music.
SAMPLE LINES
- "RONNIEEEEEEE! *leaps* I'VE GOT HIM! I'VE GOT HIM! ...I haven't got him."
- "You know what's better than that kebab, Ronnie? OASIS. Everything is worse than Oasis."
- "Second album's the best, Ronnie, don't even start. DON'T. START."
- "I'm in your parka now. No, I'm in MY parka. You don't fit in a parka."
- "I'll bite you. I'll actually bite you. I'm just trying to help!"
- "West Ham, Oasis and attacking Ronnie. The three loves of my life."
- "*from inside a bin* ...not yet... not yet... NOW!"
- "Ronnie, if you were an Oasis album, you'd be a double album. Triple. Box set."
- "Listen. LISTEN. This one's my own song. It's called 'Don't Eat The Fridge, Ron'. *hums an original tune*"
HIT REACTION: bounces off walls like a pinball (3 bounces minimum, extra bouncy physics material), lands in a bin, pops his head out: "AGAIN! DO IT AGAIN! ...I mean, I'm just trying to help."
BANTER: West Ham trio, endlessly trying to convert everyone to Oasis, Aidan is the only one who can calm him down.

=========================================================================
64. THE INTERVENTION SYSTEM (all characters)
=========================================================================

64.1 HOW IT WORKS
- Each level has a SQUAD ROSTER: 1–3 mates + optionally Chloe and/or Tasha (on top of Tommy, who is always there). Max 4 named characters fully active at once, for performance (see 69).
- An INTERVENTION METER (wrist UI, a little megaphone icon) fills as Ronnie eats. When it's full, an INTERVENTION triggers: one character performs their stopping mechanic (sections 61–63), with a short intro sting and their name card sliding in ("INTERVENTION: NOAH — THE TACKLE").
- Every intervention FAILS (by design), but the player can fail it faster or more spectacularly for bonus "Unstoppable" points.
- The failed character then joins the "Failed Interventions" crowd who follow Ronnie at a distance, commenting.

64.2 INTERVENTION SCOREBOARD (end of every level, on the receipt)
"INTERVENTIONS ATTEMPTED: 6. INTERVENTIONS SUCCESSFUL: 0." plus each character's failure line, e.g.
- "Chloe: hid snacks in the tumble dryer. Ronnie ate the tumble dryer."
- "Lewis: tried to spot Ronnie. Was dragged 40 metres."
- "Noah: tackled Ronnie. Now lives on his leg."
- "Oliver: filmed Ronnie. 2.4 million views."
- "Dylan: ambushed Ronnie. Was found in a bin."
- "Harry H: intercepted a burger. Handed it back."
- "Aidan: suggested a quiet one. Lost his pint."
- "Tasha: wished on a star. Ronnie ate the star."
- "Tommy: just tried to help."

64.3 THE SQUAD INTERVENTION — FINAL BOSS BEFORE SPACE (new level, see 66.6)
Everyone teams up for one last attempt to stop Ronnie before he leaves Earth.

=========================================================================
65. GROUP BANTER SYSTEM
=========================================================================

65.1 AMBIENT BANTER
- When 2+ characters are near each other and nothing important is happening, they chat (2–4 line exchanges). Each pair has its own banter bank (minimum 10 exchanges per pair for the main pairs).
- Priority: never talk over a stage-up, intervention or Tommy's main lines. Max one banter exchange per 20 seconds.

65.2 PAIR BANTER SAMPLES
- Tommy & Lewis: "Nice abs, Tommy. Shame they're tiny." / "Nice height, Lewis. Shame about the beard." / "IT'S GROWING."
- Tommy & Tasha: "Babe, rate my roast." / "Seven." / "Seven?!" / "Ronnie's belly is a ten."
- Chloe & Tasha: "Tash, help me hide the crisps." / "I've hidden them in Ronnie's shadow. It's the biggest place in the house."
- Harry & Aidan: "She's not replied, Aidan." / "Give it time, Harry. Like a pint." / "It's been four months." / "...that's a long settle."
- Harry & Dylan & Aidan (West Ham trio): when all three meet, they do an original call-and-response "Irons" chant (original words, e.g. "Who are we? / The East End boys! / What do we do? / Make lots of noise!"), then Dylan screams and attacks Ronnie.
- Noah & Ronnie (United vs Chelsea): "United would sell you for scrap, Ron." / [Ronnie excuse button] "I'M BIG BONED!" / "Your bones are on loan from a whale."
- Oliver & Noah (Spurs vs United): "Spurs are rebuilding." / "You've been rebuilding since I was born."
- Lewis & Noah: "Rugby's just hugging in mud, bro." / "Gym's just lifting things and putting them back down." / "...that's literally the point, bro."
- Dylan & Aidan: Dylan: "AIDAN! OASIS!" / Aidan: "Not now, Dylan." / Dylan: "...OASIS though." / Aidan (calmly tucking hair behind ears): "...the second album is the best." / Dylan screams with joy.
- Chloe & Tommy: "Tommy, you were meant to help." / "I am helping. I'm being a role model. Look." *flexes*
- Tasha & Lewis: "Lewis, your beard looks like a toddler drew it." / "IT'S GROWING, TASHA."
- Harry & Oliver: "Ollie, film me, I want to send it to my match." / "Harry, you're filming yourself eating a doughnut Ronnie's already bitten."

65.3 FOOTBALL RIVALRY SYSTEM
- Each character's club is stored in data. Matchday events (Pub level, Five-a-Side, TV screens in other levels) pick lines based on which clubs are present.
- TV screens in levels show fake "results" that change each playthrough (generated from the parody team names — never real fixtures, players or scores), and the relevant characters react ("YES!" / "Oh come ON").
- Ronnie's excuse button gets a matchday variant: "IT'S FOR THE LADS!"

=========================================================================
66. NEW LEVELS FOR THE SQUAD
=========================================================================
(Add these to Level Select. All follow the art, lighting and performance rules of Parts 3 and 4.)

66.1 LEWIS'S GYM — "IRON TEMPLE" (bonus level)
- A loud, neon-lit gym with mirrors everywhere (use cheap fake-mirror trick: flipped duplicate room behind glass for the static parts, real mirror only for 1 hero mirror), weight racks, treadmills, a protein-shake bar and a vending machine.
- Lewis tries to make Ronnie do a workout. Every machine becomes food: dumbbells are giant sausages, the weight plates are pizzas (ties into Feature 38), the treadmill belt is a conveyor of doughnuts, the protein bar is all-you-can-drink.
- Abs-Off between Tommy and Lewis in the middle of the level.
- Joke signs: "NO PAIN NO GAIN (RONNIE: NO GAIN? NO WAY)", "WIPE DOWN EQUIPMENT AFTER EATING IT", "LEWIS'S PB WALL" (all his lifts, plus "Beard: still loading").
- Ending: Ronnie sits on the leg press and it folds flat. Lewis: "...bro. That's 400 kilos of machine, bro."

66.2 THE OYSTERFLEET — MATCHDAY (main level, between Kebab Shop and Buffet) — Ronnie's local AND his workplace: he works behind the bar here (full spec in section 84)
- THE OYSTERFLEET, a cosy British pub on matchday where Ronnie works as a barman: big screens showing a cartoon football match between parody teams, bunting, beer garden, dartboard, pool table, bar with crisps and pork scratchings on clips.
- Aidan offers "just the one". Stout Mode, Pint Settle mechanic, Dylan standing on a table ranting about Oasis, the West Ham trio chant, Harry checking his dating app, Noah and Oliver arguing.
- Mechanics: the bar is a buffet of snacks; the pool table balls are scotch eggs; the dartboard is a pizza. Every goal on the TV triggers a "celebration" where every character cheers — Ronnie gets a 5-second free eating window while they're distracted.
- Ending: Ronnie gets wedged behind the bar; the landlord pulls a pint off his belly; the pub sign outside changes from "THE OYSTERFLEET" to "THE RONNIEFLEET".

66.3 LIDDLE-PRICE SUPERMARKET (main level, between Corner Shop and Kebab Shop)
- A huge discount supermarket where Oliver works: long aisles, the infamous "middle aisle" of random items (paddling pools, tool kits, inflatable flamingos, ski jackets — all edible in this game), bakery section, a checkout conveyor belt, self-checkouts, yellow "REDUCED" stickers everywhere.
- Oliver films everything — Going Viral meter is active the entire level.
- Mechanics: the checkout conveyor feeds food straight to Ronnie; the bakery section is a free-for-all; "Unexpected item in bagging area" plays every time Ronnie stands near a self-checkout. Middle aisle items are random each playthrough.
- Joke signs: "MIDDLE AISLE: ANYTHING CAN HAPPEN (RONNIE WILL EAT IT)", "STAFF PICK: OLIVER RECOMMENDS... RUNNING", "BAKERY: RONNIE-FREE ZONE (FAILED)".
- Ending: Ronnie gets stuck on the checkout conveyor and gets "scanned": the screen reads "PRICE: PRICELESS (PLEASE LEAVE)".

66.4 FIVE-A-SIDE (bonus level, with THE TAILGATE in the car park)
- An astroturf five-a-side cage at night with floodlights. Noah invites Ronnie "for some exercise". Teams: Ronnie, Noah, Lewis, Harry, Dylan vs Tommy, Oliver, Aidan, Chloe, Tasha (as a shouting manager).
- Ronnie plays in goal. As he grows, he fills more and more of the goal until the ball can't get past. The match descends into chaos: the ball is a giant meatball, half-time oranges, Harry throws food spirals from the touchline (Catch & Chonk), Dylan ambushes the referee.
- The Tailgate (car park area before the match): Harry's tailgate party with a barbecue — burgers, hot dogs, wings — and American-football toss games.
- Ending: Ronnie fills the goal completely; the goal frame snaps and becomes his new belt.

66.5 DATE NIGHT — "LA GRANDE PORTION" (main level, between Buffet and Birthday)
- See Chloe feature F-C2. Seated level (excellent for comfort). Harry is on his own disastrous date at the next table (his date leaves; he eats her starter in solidarity with Ronnie).

66.6 SQUAD INTERVENTION (main level — the big finale before Space)
- Setting: Ronnie's street at sunset. Banners: "RONNIE, WE LOVE YOU, PLEASE STOP".
- Everyone is here: Tommy, Chloe, Tasha, Lewis, Harry H, Aidan, Noah, Oliver, Dylan. They've built a barricade of salad, a wall of exercise equipment and a "nutrition tent".
- Structure — a boss rush of interventions (performance-safe: only the active attackers are fully simulated; the rest are in a cheaper "crowd" state):
  1. Chloe's Glare + Food Swaps (the opener)
  2. Lewis's Spotter Intervention + Meal Prep Prison
  3. Harry H's Blitz + Interceptions
  4. Noah's Scrum (with Lewis and Harry joining)
  5. Oliver's Shame Cam live-stream (Going Viral meter)
  6. Aidan's "Just The One" — a pub table appears in the street
  7. Tasha's Storytime + Bubble Roast
  8. Dylan's Ultimate Ambush (from a manhole cover, an ice cream van and a lamppost, all in a row)
  9. FINAL: Tommy steps forward, removes his T-shirt dramatically (abs blinding — screen-safe glow), and says: "Ronnie. As your older, wiser, better-looking mate... I'm just trying to help." Then he gives Ronnie a hug. Ronnie absorbs him into a belly roll. Tommy (muffled): "...this is fine."
- Ronnie eats the barricade, the tent and the street, grows to planet size and floats up — leading into the Space level. All the mates watch from below; Tasha waves a tiny flag: "Bye, Ronnie! Send us a postcard! Your postcode is now 'SPACE'!"

66.7 TASHA'S STORYBOOK — "RONNIE AND THE BEANSTALK" (bonus level) — see F-T2.
66.8 CHLOE'S WEIRD HOUR (bonus level) — see F-C3.

66.9 UPDATED LEVEL ORDER (main campaign)
1 Bedroom → 2 Corner Shop → 3 Liddle-Price Supermarket → 4 Kebab Shop at 2AM → 5 The Oysterfleet (Matchday) → 6 All-You-Can-Eat Buffet → 7 Date Night → 8 Birthday Party → 9 Squad Intervention → 10 Space: The Final Buffet.
Bonus: Fridge Raid at 3AM, Lewis's Gym, Five-a-Side, Tasha's Storybook, Chloe's Weird Hour, Food Fight Arena, Ice Cream Van Chase, Ronnie Roast Night.
(Growth across 10 levels: the Chonk thresholds in 18.1 apply per level, starting fresh each level, with a "carry-over" bonus: finishing a level at a higher stage gives Ronnie a head start of +1 stage in the next.)

=========================================================================
67. NEW FEATURES INSPIRED BY THE SQUAD (F51–F80)
=========================================================================
F51. THE GROUP CHAT — Ronnie's wrist phone has a group chat called "RONNIE INTERVENTION 🚨" that updates live with messages from every character reacting to what's happening ("Lewis: bro he's eaten the treadmill", "Tasha: 🌙 new moon just dropped", "Oliver: posted it lol", "Chloe: not funny", "Dylan: OASIS", "Aidan: lads.", "Noah: tackling him now", "Harry H: anyone know if 'big boned' is a valid dating bio", "Tommy: I'm just trying to help").
F52. ROAST SCOREBOARD — Tommy & Tasha's running total of roasts across the whole game vs Ronnie's lifetime calories.
F53. SQUAD PHOTO WALL — a fridge-door collage in the main menu that fills with polaroids of each character as you meet them in the campaign (each polaroid has a funny caption).
F54. HEIGHT CHART UPDATES — the bedroom door-frame height chart (59.4) gets a new sideways "Ronnie (width)" mark at the end of every level.
F55. "WHO SAID IT?" LOADING-SCREEN QUIZ — a loading screen minigame: a line plays, pick which mate said it (point at their portrait).
F56. CHARACTER CARDS — collectable trading cards for each character (stats: Height, Roast Power, Intervention Success Rate: 0%, Club, Weakness). Found hidden in levels. Ronnie's card: "Weakness: everything edible."
F57. MATE MODE — after finishing the campaign, play any level as any mate, each with their own twist: Lewis (lifts food as reps, Chonk only counts if you "complete the rep"), Harry (long arms = grab from far away, but clumsy), Aidan (Stout Mode always on, slow and cosy), Noah (tackle food to eat it), Oliver (Going Viral meter doubles everything), Dylan (permanent chaos: random ambushes on NPCs, Oasis-style original soundtrack), Chloe (Hide the Snacks rules), Tasha (Whimsy Mode, every bite sparkles, she narrates herself).
F58. THE STAG-DO / LADS' HOLIDAY TEASER — a bonus "postcard" level where the squad goes on holiday to an all-inclusive resort (endless buffet, poolside bar, hotel breakfast). Everyone is in holiday clothes; Lewis does poolside flexing; Dylan cannonballs into the pool; Aidan finds the only stout in the resort; Ronnie eats the breakfast buffet before it opens.
F59. TASHA'S NICKNAME GENERATOR — every time Ronnie stages up, Tasha gives him a new whimsical nickname shown on the wrist UI ("Lord Snackington", "The Doughnut Duke", "Sir Chins-a-Lot", "The Moon Prince", "Professor Pastry", "Captain Gravy").
F60. CHLOE'S NAMED-FOOD COLLECTION — every food Chloe names becomes a collectable "In Memoriam" card ("Gerald the Burger — he had dreams"), viewable on the trophy shelf with a sad violin.
F61. AIDAN'S PERFECT PINT MINIGAME — pour a perfect stout (tilt the glass at the right angle, wait for the settle, top it up). Perfect pour = Aidan sheds a single tear. Ronnie drinks it immediately.
F62. HARRY'S DATING DISASTERS — a running side-story on Harry's phone across levels: his matches unmatch him one by one, ending with a match that says "Is that your mate Ronnie in the background? Can he come instead?".
F63. LEWIS'S BEARD WATCH — a running gag: every level, Lewis claims his beard has grown. A "Beard Progress" bar on his card never moves past 4%.
F64. DYLAN'S HIDING SPOTS — collectables: find all 25 places Dylan hides across the game (bins, vents, a wheelie bin, inside the giant MONSTOR can in space). Finding one before he ambushes gives a "Saw You First" bonus and Dylan sulks.
F65. OLIVER'S VIRAL MOMENTS REEL — the game auto-saves the 10 funniest moments (by follower spikes) as a "ClikClok Reel" replayed in the Awards ceremony.
F66. NOAH'S TACKLE COUNTER — tracks total tackles and bounces; at 50 bounces, Noah gets a "Human Trampoline" trophy.
F67. THE WEST HAM TRIO ENCORE — if Harry, Aidan and Dylan are ever all ragdolled at the same time, they land in a pile and do the chant lying down.
F68. CHLOE'S "BABE, NO" BELL — a desk bell Chloe carries; she dings it every time Ronnie eats. Counter shown at the end. Ronnie can eat the bell.
F69. COUPLES' NIGHT — a bonus level: Ronnie & Chloe and Tommy & Tasha at a games night (board games, snacks, takeaway). Board-game pieces are sweets. Tommy and Tasha play a "roast charades" game; Chloe tries to hide the pizza inside the board-game box.
F70. THE BIRTHDAY GAG UPGRADE — the Birthday Party level now has every mate bringing a "helpful" gift: Lewis (a gym membership — Ronnie eats the card), Harry (a dating-app subscription "for you and the fridge"), Aidan (a pint glass — it's for Aidan), Noah (a scrum cap "for the doorways"), Oliver (a ring light "for content"), Dylan (an Oasis album, wrapped badly, which he unwraps himself), Tasha (a tiara that says "Moon Prince"), Chloe (a lock for the fridge, again), Tommy (a mirror, so Ronnie can "see what he's done").
F71. SQUAD SELFIE — at the end of the campaign, everyone poses for a group photo with Ronnie (as a moon) in the background. Saved to Photo Mode.
F72. CHARACTER INTRO CARDS — the first time each character appears, the game freezes for a stylish "character intro" card (comic-book style) with their name, height, club and a one-line roast of themselves ("LEWIS — 6FT 3 — PALACE — BEARD: LOADING...").
F73. WHO'S THE TALLEST? — a recurring gag where characters line up by height in the background; Ronnie's position changes from "5ft 10" to off the chart.
F74. AIDAN'S HAIR TUCK COUNTER — he tucks his hair behind his ears a set number of times per level; a hidden achievement for counting them all.
F75. INTERVENTION REPLAY — after the Squad Intervention level, a slow-mo highlight reel of every failed intervention, narrated by Tommy and Tasha like sports pundits.
F76. TASHA & TOMMY "ROAST BATTLE" MODE — Roast Night upgrade: Tommy and Tasha go back-to-back on stage, alternating jokes; the player heckles with food; the crowd meter decides who wins (it's always a draw, because "we're a team, babe").
F77. CHLOE TO THE RESCUE ENDING — a secret ending: if the player completes Chloe Mode on the hardest setting, the credits show Ronnie back to normal size... for one second, before he eats the credits.
F78. SQUAD VOICEMAIL — the pause menu sometimes plays a voicemail from a random mate ("Ron, it's Noah, just checking you haven't eaten the house. Call me back. Unless you're eating. You're eating, aren't you.").
F79. FOOTBALL SHIRT WARDROBE — unlock all the mates' parody kit shirts for Ronnie to wear (each stretches as he grows, and the relevant mate comments: "Bro, that's a Palace shirt, show it some respect, bro").
F80. "ONE DAY OLDER" CALENDAR — the bedroom calendar now has everyone's birthdays (placeholder dates — the builder should ask for the real ones) and Tommy has written "ME (FIRST)" and "RONNIE (SECOND)" on the two consecutive days.

=========================================================================
68. VOICE, CASTING & DIALOGUE SCALE
=========================================================================
68.1 LINE COUNTS (minimums)
| Character | Lines | Notes |
|---|---|---|
| Tommy | 300 | main roaster, all systems |
| Tasha | 150 | main roaster, Storytime narration adds 60+ event lines |
| Chloe | 120 | main character, Date Night and Chloe Mode lines |
| Lewis, Harry H, Aidan, Noah, Oliver, Dylan | 60 each | intervention, failure, banter, hit reactions, matchday |
| Ronnie | 60 | excuses, grunts, matchday excuses, reactions |
| Pair banter | 10+ exchanges per main pair | see 65.2 |
68.2 RECORDING
- Best option: each friend records their own lines (export a CSV script per character: line ID, text, emotion, notes). Keep a consistent recording setup (same mic, quiet room).
- If using AI voices: only clone someone's real voice with that person's permission. Otherwise use clearly different stock voices that match the voice direction.
- All lines go through the pre-baked viseme pipeline (34.6).

=========================================================================
69. PERFORMANCE RULES FOR A BIG CAST (Quest 3)
=========================================================================
- Max 4 fully active named characters at once (full animation, lip-sync, ragdoll-ready, LOD0). Others nearby run in "Crowd" state: LOD1/LOD2 mesh, no lip-sync (jaw flap only), animation at 15Hz (Animator culling + update-rate throttling), no ragdoll until hit.
- Max 3 simultaneous ragdolls from the squad (plus 3 NPCs = 6 total, per 31.1).
- Shared skeleton: all mates use the same Humanoid skeleton and the same animation set (retargeted), so animations are shared and memory stays low. Unique animations per character: max 8 each.
- Shared materials: all six mates on ONE 2048 texture atlas with a palette texture for kit colours (one draw call per mate). Chloe and Tasha on their own atlas (main-character quality).
- Hair spring bones: max 6 bones per character, updated only when within 6m of the player.
- Voice clips: Vorbis, mono, 22kHz for mates (44kHz for Tommy, Chloe, Tasha). Load per-level dialogue banks via Addressables.
- Squad Intervention level: stage the interventions so that only 1–3 characters are "active" at any moment; the rest stand in the crowd state behind a barricade.
- Test case for QA: Squad Intervention with all 10 characters visible + Can Tower + 3 ragdolls must hold 72fps minimum (target 90).

=========================================================================
70. ART SPEC ADDITIONS FOR THE SQUAD
=========================================================================
70.1 TRIANGLE BUDGETS
| Character | LOD0 | LOD1 | LOD2 |
|---|---|---|---|
| Chloe, Tasha (main) | 22,000 | 11,000 | 4,000 |
| Lewis, Harry H, Aidan, Noah, Oliver, Dylan | 12,000 | 6,000 | 2,000 |
70.2 SILHOUETTE TEST
Every character must be identifiable from silhouette alone at 10m:
- Lewis: huge V-shape + mullet. Harry: tall, thin, all elbows, phone up. Aidan: pint + big beard + tucked hair. Noah: wide and low, rugby stance. Oliver: phone on a selfie stick + glasses glint. Dylan: tiny, parka, mid-leap. Chloe: long straight hair + hands on hips. Tasha: big curly hair + bubble wand. Tommy: spotlight + curtains + flexing. Ronnie: round. Very round.
70.3 AI 3D PROMPTS (add to 35.3; always prepend the style block)
- LEWIS: "full body cartoon man, 6ft 3, huge muscular V-shaped gym bro, curly brown mullet with curtain fringe, patchy uneven stubble, cocky grin, red and blue striped gym vest, tiny gym shorts, lifting belt, holding a giant water jug, T-pose."
- HARRY H: "full body cartoon man, 6ft, extremely tall and lanky, long thin arms and legs, short dark curly hair, short black beard, backwards cap, American football jersey number 69, claret and sky-blue scarf, holding a phone, T-pose."
- AIDAN: "full body cartoon man, 5ft 10, moderate build, longish black hair tucked behind his ears, big full thick black beard, calm friendly smile, claret and sky-blue football shirt, jeans, holding a pint of dark stout with a creamy head, T-pose."
- NOAH: "full body cartoon man, 5ft 8, big broad sturdy frame, short brown hair, stubble beard, friendly determined face, hooped rugby shirt, muddy shorts, rugby boots, scrum cap around neck, T-pose."
- OLIVER: "full body cartoon man, 5ft 9, average build, neat brown hair, thick-framed glasses, full beard, supermarket uniform polo in yellow and blue with a name badge, holding a phone on a selfie stick with a ring light, T-pose."
- DYLAN: "full body cartoon man, 5ft 5, small wiry and energetic, wide excited eyes, short black hair, stubbly goatee, claret and blue football shirt, oversized green parka, round sunglasses on his head, T-pose."
- CHLOE: "full body cartoon young woman, 5ft 7, long straight dark black hair to mid-back, big expressive eyes, warm smile, oversized lavender hoodie, black leggings, chunky white trainers, T-pose."
- TASHA: "full body cartoon young woman, 5ft 3, petite, very long big curly brown hair, freckles, dreamy sparkly eyes, cheeky smile, floaty pastel pink dress with star and cloud patterns, chunky boots, flower hair clip, holding a bubble wand, T-pose."
70.4 FACIAL HAIR & HAIR TECHNIQUE (consistent across the cast)
- Buzz cuts and stubble: texture-painted on the skin (stipple) — zero extra geometry.
- Beards, goatees, moustaches: sculpted solid masses with a thin alpha-tested fringe edge for softness.
- Long or curly hair: sculpted chunks/curl clusters with 2–6 spring bones; never strand or card hair (too expensive and noisy in VR).

=========================================================================
71. FRONT-END UPDATES FOR THE SQUAD (amends Part 4)
=========================================================================
- TITLE SCREEN: the whole squad hangs around the floating pizza island: Tommy leaning on the logo's "S", Tasha sitting on the "O" doughnut blowing bubbles, Chloe on the edge of the island trying to pull a burger away from the logo, Lewis flexing on the "R", Harry lying across "SIMULATOR" on his phone, Aidan sitting with a pint on the crust, Noah doing tackle practice on a floating sausage roll, Oliver filming the logo for ClikClok, and Dylan's head popping out of a floating bin every 20 seconds screaming. (Performance: all in Crowd state with baked idle loops; only Tommy and Tasha have live lip-sync.)
- INTRO STING upgrade: "A TOMMY PRODUCTION" now has Tasha at his side: "...and Tasha!" "...and Tasha." *high-five sparkle*
- MAIN MENU: the fridge door is covered in squad polaroids (F53) and a magnet that says "RONNIE INTERVENTION GROUP". Each mate occasionally walks past the kitchen window outside.
- NEW MENU ITEMS: "MATE MODE" (a box of mixed snacks), "CHLOE MODE" (a padlocked biscuit tin), "COUPLES' NIGHT" (a board-game box).
- LOADING SCREEN: the Waiting Room bench now seats the next level's featured characters, chatting; tips include character tips ("Shake hard when Dylan ambushes you", "Wait for Aidan's pint to settle. Or don't.", "Look away from Chloe on Date Night... no, wait, eat when SHE looks away").
- CREDITS: every character gets a silly credit ("Head of Interventions: Chloe", "Chief Roast Officer: Tasha", "Beard Consultant: Lewis (pending)", "Viral Marketing: Oliver Lyon", "Pint Quality Control: Aidan O'Keeffe", "Head of Tackling: Noah", "Dating Coordinator: Harry H", "Chaos Department: Dylan Lewis", "Music Advisor: Dylan Lewis (not allowed)").

=========================================================================
72. NEW SCRIPTS
=========================================================================
- SquadManager.cs — roster per level, active vs crowd states, performance caps.
- InterventionSystem.cs — Intervention Meter, triggering, scoreboard data.
- CharacterProfile (ScriptableObject) — name, height, club, colours, voice bank refs, intervention list, hit-reaction bank.
- BanterSystem.cs — pair detection, cooldowns, priorities.
- ChloeController.cs, ChloeModeAI.cs (Hide the Snacks AI Ronnie with sniff behaviour), DateNightGaze.cs (look-away timing and movement detection).
- TashaController.cs, StorytimeNarrator.cs (event-driven narration), BubbleRoast.cs, CouplesRoast.cs.
- LewisController.cs (Spotter drag, Abs-Off), HarryController.cs (Interception, Catch & Chonk throws), AidanController.cs (Stout Mode, Pint Settle, Perfect Pint), NoahController.cs (Tackle, Scrum push minigame), OliverController.cs (Going Viral meter, live comments), DylanController.cs (Ambush scheduler, shake-off, Parka Protocol).
- GroupChat.cs — event-driven wrist-phone messages.
- FootballRivalry.cs — club data, matchday line selection, fake TV results generator.
- CharacterCards.cs, Collectables.cs (Dylan's hiding spots, named-food cards).

=========================================================================
73. SQUAD QA CHECKLIST
=========================================================================
[ ] Every character matches their height exactly at Stage 1 (check against the height chart prop).
[ ] Every character is recognisable by silhouette at 10m.
[ ] Every intervention fails — and every failure is funny and different.
[ ] No character ever talks over another or over a stage-up.
[ ] Noah's jokes are about rugby and United, never his size; Aidan's are about his personality and his pint.
[ ] No real club badges, real brand logos, real song lyrics or real player names in any public build.
[ ] Squad Intervention holds 72fps minimum with all 10 characters visible.
[ ] Chloe Mode and Date Night are fully playable seated.

=========================================================================
74–76. RESERVED FOR FUTURE SQUAD MEMBERS
=========================================================================
The CharacterProfile system must make adding a new mate easy: one ScriptableObject, one atlas slot, one voice bank, one intervention, one hit-reaction set. Leave sections 74–76 free for more friends later.


#########################################################################
#########################################################################
##                                                                     ##
##   PART 6 — THE REALISM & VEGGIE WAR UPDATE                          ##
##   Realistic 3D everything. Every object grabbable. Everyone is      ##
##   trying to feed Ronnie vegetables. Ronnie fights back with         ##
##   fast food, sweets and MONSTOR.                                    ##
##                                                                     ##
#########################################################################
#########################################################################

=========================================================================
77. WHAT PART 6 CHANGES (overrides earlier parts)
=========================================================================
1. ART STYLE: the flat cartoon/toon-shaded look in Part 3 is REPLACED by "PREMIUM REALISM": realistic 3D models, realistic skin, hair, fabric, food and lighting, with slightly exaggerated proportions so the comedy still reads (section 79). Ink outlines are removed (except the grab highlight).
2. CORE LOOP: the friends no longer just roast and "intervene" — they actively try to FEED RONNIE VEGETABLES. The player (Ronnie) has to fight them off and eat fast food and sweets and drink MONSTOR as fast as possible (section 83).
3. ENERGY DRINK: renamed MONSTOR everywhere. Ronnie's favourites: MANGO LOCO, MONSTOR WHITE and the F1 EDITION (section 85).
4. THE PUB is THE OYSTERFLEET, and Ronnie works there as a barman (section 84).
5. THE SQUAD: everyone is white, from England, and they all know each other from school (section 86). Tommy, Dylan and Aidan work office jobs (section 87). Aidan is English with Irish family roots. Noah is now much bigger.
6. EVERYTHING HAS ITS OWN 3D MODEL and can be picked up (section 82).
7. JOKES: no limits on roasting Ronnie's size (section 88).

=========================================================================
78. RESEARCH: WHAT THE BEST VR GAMES DO WITH 3D MODELS
=========================================================================
The builder must study these games (play them, watch breakdowns) before building. Key findings and what Ronnie Simulator takes from each:

| Game | Platform | What it does well | Technical takeaway | What we copy |
|---|---|---|---|---|
| Batman: Arkham Shadow (Camouflaj) | Quest 3 only | Widely called the best-looking standalone VR game; cinematic lighting, excellent character animation | Unreal Engine + Substance pipeline; baked lighting and aggressive LODs; character models cut from 100k+ (desktop) to under ~15k tris for close-ups and ~1k for distant views; real-time shadows were a deliberate, expensive choice; thick, exaggerated character proportions; up-close textures were the visible weak point | Character tri budgets, exaggerated-but-realistic proportions, baked world + real-time character shadows, spend texture budget on faces and hands (seen up close) |
| Asgard's Wrath 2 (Sanzaru) | Quest 2/3 | Huge AAA scale, award-winning character design | Character meshes around 12k tris with 2K textures; the Quest 3 update added higher-res textures and much better specular highlights; offered a choice between a 90Hz mode and an "enhanced" fidelity mode | Specular quality is what makes surfaces look real, not polygon count; ship "Performance" and "Fidelity" modes |
| Red Matter 2 (Vertical Robot) | Quest 2/3, PC | Long regarded as the realism benchmark on Quest | Realistic art style built on baked lighting in small, controlled spaces | Keep levels as rich, enclosed rooms (bedroom, shop, pub) rather than huge open areas — perfect for our levels |
| Half-Life: Alyx (Valve) | PC VR | Almost every object is interactive; liquids slosh in bottles; unique sounds when objects are shaken; Gravity Gloves | Interaction in stages: select (object glows) → pull → catch; physics-first world | Grab highlight, "Snack Grab" flick-pull for distant food, unique shake sound per item, liquids that slosh |
| Job Simulator (Owlchemy) | All VR | The gold standard for comedy VR; you can eat almost anything | Design rule: "it's not Job Simulator unless you're grabbing it, throwing it or eating it"; menus are physical objects; prototype in VR, not on paper | Every object grabbable/throwable/edible; physical menus (already: the fridge); prototype mechanics in the headset first |

78.1 THE LESSONS (apply all of them)
1. Realism on Quest comes from LIGHTING and MATERIALS (baked GI, good specular, normal maps), not from huge polygon counts.
2. Put detail where the player looks: faces, hands, food in your hand, the can at your mouth. Use cheaper textures on walls and floors.
3. Small, dense, detailed rooms beat big empty spaces.
4. Characters: ~15k tris up close, aggressive LODs, exaggerated proportions so they read in VR.
5. Every object should be touchable; menus should be objects.
6. Offer a 90Hz "Performance" mode and a 72Hz "Fidelity" mode.
7. Honest limit: true film-level "hyperrealism" is not possible on a standalone headset. The target is "realistic and premium" (Arkham Shadow level) on Quest 3, with an optional "PC VR Ultra" build (via Link/Air Link) that uses higher-res textures, real-time GI and higher-poly LOD0s for anyone with a gaming PC.

=========================================================================
79. NEW ART DIRECTION: "PREMIUM REALISM"
=========================================================================
79.1 THE LOOK
"A realistic British comedy film you can step into": real-looking people, real pub, real kebab shop, real food that looks good enough to eat — with the proportions and situations pushed into comedy. Think a high-end realistic VR game, but everything is slightly too big, too greasy and too much.

79.2 RULES
- Materials: physically based (PBR) — albedo, normal, roughness/metallic, AO — authored in Substance 3D Painter.
- Proportions: realistic anatomy with 10–20% caricature: Ronnie's belly, cheeks and chins are pushed further as he grows; Tommy's jaw and abs are slightly "too perfect"; Lewis's lats are too wide; Noah is enormous; Harry is extra lanky; Dylan is extra small and wiry.
- Food: photoreal (scanned or hand-built to match photos), glistening, steaming, saucy.
- Comedy stays in animation, physics and situations, not cartoon rendering.
- Replace these Part 3 items: toon ramp shader → URP Lit (or a custom mobile PBR shader); inverted-hull outlines → removed (an outline/rim glow is only shown on the object you're about to grab); cartoon googly eyes on food → removed by default, available as a silly "Googly Mode" toggle in Settings (a running joke: Tasha turned it on).
- Keep: colour palette as brand colours (UI, signage, Ronnie's blue shirt, MONSTOR cans), the comedy VFX (crumb bursts, sauce splats, impact words can stay as 3D stylised text — the contrast with realistic visuals is funny).

79.3 RENDER SETTINGS CHANGES (on top of section 30)
- Shading: URP Lit with Specular Highlights and Environment Reflections ON; baked reflection probes in every room (box-projected) — this is what makes cans, wet food, glasses and the bar look real.
- Lighting: baked GI (lightmaps + APV/light probes) for the world; ONE real-time shadow-casting light for characters and held items (like Arkham Shadow, characters get real shadows so they sit in the world).
- Skin: a custom mobile skin shader: pre-integrated skin diffuse (or wrap lighting with a red scatter tint), a detail normal map for pores, a separate roughness map (oily T-zone and nose shine — Ronnie gets shinier and sweatier as he grows).
- Eyes: separate eye mesh: sclera, iris with parallax/refraction fake, a wet cornea with a sharp specular highlight, a tear-line strip. Eyes are where realism lives or dies — spend time here.
- Hair & beards: hair cards (alpha-tested with alpha-to-coverage, which works with MSAA) over a painted scalp/skin base; keep card count low (Ronnie's buzz cut and stubble are mostly texture; Chloe's and Tasha's long hair are the most expensive — max ~3k hair-card tris each).
- Cloth: realistic fabric normal maps (football-shirt mesh weave, jogger cotton, Tommy's tight T-shirt); the shirt stretch effect (section 32.7) becomes a blend shape + stretched-fabric normal detail.
- Post-processing (Fidelity mode only): very light colour grade via a LUT baked into the final pass; no bloom (fake glow cards remain).

=========================================================================
80. REALISTIC CHARACTER PIPELINE
=========================================================================
80.1 TOOLS (pick one route; all end in Blender → Unity)
- Route A (recommended): Reallusion Character Creator 4 + Headshot (generates a realistic head from a photo) → realistic base body, clothing, hair → export to Blender → reduce to budget.
- Route B: MetaHuman (Unreal) for the high-detail source, baked down to a Quest-budget mesh in Blender (MetaHumans themselves are far too heavy for Quest).
- Route C: Tripo/Rodin image-to-3D base (section 35) → ZBrush/Blender sculpt for realism → retopology.
- Using real photos of real friends to make their faces: only with each person's permission.

80.2 STEPS
1. Collect references: front, side and 3/4 photos of each person (with permission), plus height and build from section 59.2.
2. Generate/sculpt a high-poly head and body (1–5M polys).
3. Retopologise to the game mesh: heroes (Ronnie, Tommy, Chloe, Tasha) 20–25k tris LOD0; mates 14–16k tris; NPCs 8–10k. LOD1 50%, LOD2 20%, LOD3 1k impostor-style for distant crowds.
4. Bake from high to low: normal, AO, curvature, thickness (for skin scatter).
5. Texture in Substance Painter: skin with pores, redness around nose/cheeks, subtle veins; 2048 face + 2048 body for heroes, 1024+1024 for mates; ASTC 4x4 on faces.
6. Hair cards, beard cards, eyebrow cards; eyes, teeth, tongue and mouth interior (the player sees Ronnie's mouth in mirrors and NPC mouths up close when they shove veg at you).
7. Rig: Humanoid + face (ARKit-style 52 blend shapes or the 15 visemes + expressions in 34.3) + Ronnie's growth shapes + jiggle bones.
8. Ronnie's growth at realistic quality: 12 sculpted growth stages (not just scaled) with corrective shapes for armpits, elbows, neck folds, chin folds, belly overhang; clothing has matching growth shapes so it never clips.

80.3 SKIN TONES & LIKENESS TABLE (everyone is white British; vary undertone so they're distinguishable)
| Character | Skin | Undertone & details | Eyes (placeholder — confirm real colours) |
|---|---|---|---|
| Ronnie | light, warm | ruddy cheeks that get redder as he eats; shiny forehead from Stage 4 | brown |
| Tommy | light with a healthy tan | even, "moisturised", slight glow | blue-grey |
| Chloe | fair | cool undertone, rosy lips | brown |
| Tasha | fair | light freckles across nose and cheeks | hazel |
| Lewis | light, gym-tan | slightly orange "fake tan" sheen (running joke) | blue |
| Harry H | light | slightly pale, long face | brown |
| Aidan | very fair | pink-cheeked, ruddy after a pint | green |
| Noah | light, ruddy | rugby-scuffed knuckles, red cheeks | blue |
| Oliver | light | smooth "content creator" skin, ring-light glow on his face when filming | brown |
| Dylan | light | slightly flushed, always mid-shout | brown |

=========================================================================
81. EVERYTHING HAS ITS OWN 3D MODEL — ASSET MANIFEST
=========================================================================
Every object the player sees is a real 3D model; nothing important is a flat picture.

81.1 COUNTS (minimum)
| Category | Count | Notes |
|---|---|---|
| Characters | 11 main (Ronnie, Tommy, Chloe, Tasha, Lewis, Harry H, Aidan, Noah, Oliver, Dylan + the Gaffer) + 15 NPCs | realistic pipeline (section 80) |
| Fast food & sweets | 60 | the 33 from section 19 + 27 new (section 83.6) — all realistic, all with bite states |
| Vegetables & healthy food (the enemy) | 25 | section 83.3 |
| MONSTOR cans | 8 flavours + 2 sizes + crushed variants | section 85 |
| Other drinks | 15 | pints, stout, shots, milkshakes, slushies, smoothies (the enemy), tea |
| Props per level | 150–250 | all grabbable unless fixed (fixed items still have buttons, doors, drawers) |
| Pub-specific (Oysterfleet) | 120 | taps, glasses, beer mats, tills, dartboard, pool cues, etc. |
| Breakable variants | for every chair, table, sofa, shelf, scale, door | pre-fractured meshes |

81.2 PROP RULES
- Real-world scale, accurate silhouettes, PBR textures from a shared trim sheet + atlas per level.
- Every grabbable prop has: a collider that matches its shape, a mass, a grab pose for the hand, a unique impact sound, and a unique SHAKE sound (crisp packets rustle, cans slosh, sweet jars rattle, a salad "squelches sadly").
- Food is built to be eaten: 2–4 bite states or shader bite system + crumbs.
- Food sourcing: hand-modelled to match real photos, or photogrammetry scans of real food (scan with a phone app like RealityScan or Polycam, then retopologise and clean). Remove any real brand logos from scanned packaging and use the in-game parody brands.

=========================================================================
82. INTERACTION SYSTEM: "IF YOU CAN SEE IT, YOU CAN GRAB IT"
=========================================================================
82.1 HANDS
- Ronnie's realistic hands (they get chubbier with growth) are physics-driven: they collide with the world and never pass through tables or walls (physics hand follows the tracked controller with a joint; a ghost hand shows where your real hand is if they separate).
- Grab poses: auto-posed fingers per object type (can, burger, slice, crisp, pint glass, fork, phone, NPC collar).
- Hand tracking supported (pinch/grab gestures) as an option.

82.2 GRAB FLOW (based on Half-Life: Alyx)
1. SELECT: the nearest grabbable object in front of your hand gets a soft warm rim glow (Chonk Orange) + a tiny haptic tick.
2. GRAB: grip button. Heavier items lag slightly behind your hand (inertia) so a turkey feels heavy and a crisp feels light.
3. SNACK GRAB (distance): point at food up to 4m away, flick your wrist back — it flies to your hand in an arc and you catch it. (Diegetic explanation: Ronnie's "snack instinct". Tommy: "He's got a sixth sense for pastry.")
4. TWO-HANDED: big items (pizzas, turkeys, the 2L can, NPCs at Stage 8+) need both hands.
5. THROW: release with velocity; thrown items keep spin. Throwing veg back at the friends is a core move.

82.3 EATING & DRINKING (detailed)
- Mouth trigger at the headset. Bring food to it to bite (a bite removes a chunk; crumbs spawn; bite marks match Ronnie's teeth).
- Drinking: tilt a can/glass toward your mouth — liquid level drops in real time (shader-driven liquid with slosh), gulp sounds, you can spill it down Ronnie's shirt (stain decal).
- Shotgunning: puncture a MONSTOR can (grab the bottom with the other hand and push a thumb in) then open the tab = instant chug, double MONSTOR MODE.
- Crushing: squeeze an empty can in one hand to crush it (deformation blend shape) — crushed cans go on the Can Tower.
- Messy eating: saucy foods leave decals on hands (and on the controller-hand model) that you can wipe on your shirt.

82.4 EVERYTHING ELSE
- Drawers, cupboards, fridges, doors, beer taps (pull to pour), till drawers, crisp clips, bins, dartboard darts, pool cues, TV remotes, phones (Ronnie's phone shows the Group Chat), light switches, microwave (put food in, it spins and dings), toaster (pops toast at your face), vending machines (shake them to drop snacks).
- NPCs: from Stage 8 you can pick NPCs up (two hands), carry them and throw them (ragdoll). Below Stage 8 you can push, shove and belly-bump them.

=========================================================================
83. NEW CORE LOOP: THE VEGGIE WAR
=========================================================================
83.1 THE PREMISE
Ronnie's mates, Chloe and Tasha have decided the only way to save him is to get vegetables inside him. They come at him with broccoli, sprouts, kale smoothies and salad bowls, trying to shove them in his mouth. The player IS Ronnie: block, dodge, swat and throw back the veg, and stuff your face with fast food, sweets and MONSTOR before they can stop you.

83.2 HOW THE FRIENDS ATTACK (the "Force-Feed" system)
- Each friend has a VEG WEAPON and an ATTACK STYLE (table 83.4). They approach, wind up (clear telegraph — 0.6s anticipation, a shout, and a green glint on the veg) and attack:
  - FORCE-FEED: they step in and push the veg toward Ronnie's mouth (it physically moves toward the headset).
  - THROW: they lob veg at Ronnie's face (sprouts, peas, carrots).
  - SPOON-FEED: "here comes the aeroplane!" — the spoon flies toward your mouth with an aeroplane noise.
  - AMBUSH: Dylan-style surprise attacks from cover.
  - SMOOTHIE BLAST: kale smoothie in a sports bottle, squirted toward your face.
- Attacks come in WAVES that ramp up through each level (1 friend → 2 at once → whole squad), always telegraphed and always fair.

83.3 VEGETABLE ARSENAL (all realistic 3D models, all grabbable, all throwable back)
| Veg / healthy item | Used by | Attack | Effect if it gets in Ronnie's mouth |
|---|---|---|---|
| Broccoli floret | Chloe, Lewis | force-feed | -15 Chonk, Ronnie gags, screen tints green 2s |
| Brussels sprouts (handful) | Harry H | thrown spirals ("long passes") | -5 each, little "pop" of disgust per sprout |
| Kale smoothie (sports bottle) | Chloe, Lewis | squirt blast | -25 Chonk, green moustache decal, slow-mo gag animation |
| Carrot sticks | Noah | rugby-pass throw | -8 each |
| Celery stick | Dylan | jabbed at your mouth during an ambush | -10, extremely loud crunch |
| Salad bowl | Chloe, Tommy | tipped toward your face | -30, leaves stuck on face for 3s |
| Cauliflower | Lewis | "protein pairing" force-feed | -15 |
| Green beans ("magic beans") | Tasha | fairy sprinkle — floating beans drift at you | -4 each, sparkles |
| Peas | Oliver | "pea challenge" — fired from a spoon catapult while filming | -2 each, comes in volleys |
| Rice cakes | Lewis | frisbee throw | -6, "tastes like polystyrene" |
| Spinach | Tasha | sprinkled like fairy dust | -5 |
| Cucumber | Tommy | offered politely ("just trying to help") | -10 |
| Beetroot | Aidan | "goes lovely with a pint" | -12, turns Ronnie's mouth purple |
| Asparagus spear | Tasha | fencing duel | -10 |
| Cabbage (whole) | Noah | bowled along the floor like a rugby ball | -20 if it hits Ronnie's legs and he trips |
| Fruit salad | Chloe | spoon-feed | -12 |
| Rocket leaves | Oliver | "garnish drop" from above | -3 |
| Quinoa bowl | Lewis | spoon-feed | -18 |
| Celeriac (Tasha's "potion ingredient") | Tasha | lobbed | -15 |
| Courgette | Harry H | "dating-app vegetable" | -10 |
| Radishes | Dylan | thrown like grenades | -6, tiny pop |
| Edamame | Oliver | ClikClok trend challenge | -4 each |
| Lentil soup | Aidan | "warming, Ron" | -20 |
| Protein shake (plain, unflavoured) | Lewis | squirt | -10 (but Ronnie secretly likes it — 30% chance it gives +10 instead) |
| Glass of water | Tommy | offered constantly | -5, Tommy: "Hydration, Ron." |

83.4 FRIENDS' ATTACK STYLES
| Friend | Style | Signature move | Weakness (how to beat them) |
|---|---|---|---|
| Chloe | Persistent, loving, sneaky | "THE AEROPLANE" spoon-feed + salad bowl tip | Distract her by handing her something weird (she stops to name it) |
| Tasha | Whimsical, floaty | Fairy-dust spinach + magic-bean swarm | Pop her bubbles with sweets; she giggles and loses focus |
| Tommy | Polite, smug, relentless | Offers water/cucumber/salad over and over "just trying to help" | Shove food in his hand — he can't hold it without his abs getting greasy and he panics |
| Lewis | Aggressive gym bro | Kale smoothie squirt + broccoli force-feed + rice-cake frisbee | Steal his protein shake and drink it — he's stunned |
| Harry H | Long-range thrower | Sprout spirals and courgette Hail Marys | Catch his throws and throw them back — intercepted! |
| Aidan | Calm, slow, sneaky | Hides beetroot in Ronnie's pint; "lentil soup, Ron, it's warming" | Drink his stout — he becomes too sad to attack for 10s |
| Noah | Brute force | Rugby tackle while holding carrots; bowls cabbages | Sidestep at the last moment — he flies past into a table (ragdoll) |
| Oliver | Content-driven | Pea catapult and veg "challenges" for his followers | Grab his phone — he chases you instead of attacking |
| Dylan | Chaos ambush | Leaps from a bin and jams celery at your mouth | Shake him off hard; or throw a radish back — he catches it and gets distracted |

83.5 RONNIE'S DEFENCE MOVES (the player's toolkit)
- BLOCK: hold any food, tray, plate or your forearm in front of your face — veg bounces off (physics).
- SWAT: fast hand swing knocks veg away (velocity check); swatted veg flies with a satisfying THWACK and slow-mo if it hits a friend.
- GOB GUARD: cover your mouth with one hand — immune to force-feed for 2s (cooldown 4s). Ronnie mumbles "MMMPH!".
- SPIT: if veg gets in, shake your head hard within 1s to spit it out (halves the penalty; spat veg flies out and sometimes hits the friend). Tasha: "Ronnie, that's disgusting. Do it again."
- THROW BACK: catch thrown veg and throw it back at the attacker — a hit stuns them (ragdoll on headshot). Bonus "RETURN TO SENDER" points.
- BELLY BOUNCE: from Stage 5, lean forward into a friend to bounce them away.
- DOUBLE-FIST: hold junk food in both hands — you can bite from either side, but you can't block. Risk vs reward.
- MONSTOR SHIELD: drinking MONSTOR WHITE gives "WHITE OUT" — 6 seconds of veg immunity (veg literally bounces off an aura) — see section 85.
- RETREAT TO THE FRIDGE: the fridge door is a shield you can hide behind (and eat from).

83.6 THE GOOD STUFF: FAST FOOD & SWEETS (27 new items on top of section 19)
Fast food: chicken burger, double cheeseburger, loaded fries, chicken wings bucket, onion rings, mozzarella sticks, hash browns, chicken nuggets 20-pack, battered sausage, chip butty, sausage-and-egg muffin, steak bake, cheese-and-onion pasty, doner meat-and-chips box, pizza crust stuffed with cheese.
Sweets: chocolate buttons, fizzy cola bottles, jelly snakes, giant chocolate bar (sharing size, not shared), caramel chocolate bar, gummy bears tub, marshmallows, iced buns, jam doughnuts, millionaire's shortbread, cookie dough tub, pick-and-mix scoop.
All brands are parodies (no real logos).

83.7 SCORING IN THE VEGGIE WAR
- CHONK goes up with junk food and MONSTOR; it goes DOWN when veg gets in.
- VEG-O-METER (wrist UI): how much veg got in this level. Lowest Veg-o-Meter = bonus stars.
- "CLEAN SHEET" bonus: finish a wave with 0 veg eaten.
- Combo multiplier breaks when veg gets in.
- Friends' "Feed Success Rate" shown on the scorecard ("Chloe: 3 broccoli landed. Lewis: 1 smoothie. Noah: 0 — tackled a table.").

83.8 LOSE STATE (comedy, not punishment)
- If the Veg-o-Meter fills, Ronnie goes into "GREEN MODE": he shrinks one stage, the screen goes green, birds sing, everyone cheers... for 5 seconds, until Ronnie spots a kebab and snaps out of it. Tommy: "We had him. We HAD him."

83.9 VEG FIGHT FEEL
- Every veg hit has a squelchy, crunchy, hilarious sound; spat-out veg sticks to walls (decals) and slides down slowly.
- Haptics: a disgusted shudder pattern when veg lands.
- Ronnie's gag animation is visible in mirrors.
- Comfort: veg never hits the camera directly with screen-covering effects — at most a green tint at the edges and a leaf stuck on the edge of view for 1s.

=========================================================================
84. THE OYSTERFLEET — RONNIE'S PUB AND WORKPLACE (full level spec)
=========================================================================
84.1 OVERVIEW
- THE OYSTERFLEET is Ronnie's local pub AND where he works as a barman. It replaces the generic pub in 66.2.
- Look (realistic): a classic English pub — dark wood bar, brass beer taps, etched mirrors, patterned carpet (slightly sticky), wooden booths, fruit machine, dartboard, pool table, big screens for the football, a fireplace, beams, a beer garden out back. A hanging sign outside with "THE OYSTERFLEET" and an oyster painted on it. (Builder: if Tommy wants it to match the real pub, use his reference photos.)
- Lighting: warm, low, amber pendant lamps and wall lights; golden backlit bottle shelves behind the bar; cool daylight through frosted windows. Baked GI + reflection probes so glasses, taps and the bar top gleam.

84.2 RONNIE'S JOB (gameplay)
- SHIFT MODE: Ronnie works a shift behind the bar. Customers (the squad + NPC regulars) order drinks and food; the player pulls pints (tilt the glass under the tap, pull the handle, get the head right), serves crisps and pub grub, takes payment at the till.
- The joke: every order passes through Ronnie's hands first. He "taste-tests" everything — every bag of crisps, every pie, every portion of chips — and drinks the MONSTOR stock from the back fridge.
- THE GAFFER (pub landlord, new NPC): middle-aged, arms folded, watching from the end of the bar. A "Gaffer Suspicion" meter fills if he catches you eating stock. When he's looking, act natural (serve, wipe the bar). When he looks away (answering the phone, changing a barrel, watching the match), eat. (Similar to Date Night's look-away mechanic but with a grumpy boss.) Three catches = "You're on a warning, Ronnie."
- Customer satisfaction vs Chonk: you get tips for good service and Chonk for eating. Balance both — or don't.
- Matchday rush: the bar fills; the squad shows up in their club shirts; every goal on TV = everyone distracted = 5-second free-for-all.

84.3 THE SQUAD AT THE OYSTERFLEET (and their veg attacks)
- Aidan sits at the end of the bar with his stout and slides beetroot into Ronnie's pint glass when he's not looking.
- Lewis orders "a pint of water and a broccoli, bro" and tries to force-feed it across the bar.
- Harry H throws sprouts from the pool table.
- Noah tries to tackle Ronnie over the bar — and goes through the crisp display.
- Oliver films "Day in the life of a barman (he ate the bar)".
- Dylan jumps out of the empty barrel in the cellar.
- Tommy and Tasha sit in a booth on a "date night", roasting Ronnie every time he walks past; Tasha orders a salad "for Ronnie, on us".
- Chloe pops in "to check on him" with a Tupperware of vegetables.

84.4 OYSTERFLEET PROPS (all 3D, all grabbable unless fixed)
Pint glasses (straight & dimpled jugs), stout glasses, wine glasses, shot glasses, beer taps (pullable), optics, ice bucket, lemon slices, beer mats, drip trays, bar towels, crisp boxes and crisps on clips, pork scratchings, nuts, pickled eggs jar, pies in a hot cabinet, chips baskets, ketchup/mayo sachets, cutlery in jars, menu boards, chalkboard, till, card machine, tip jar, fruit machine, dartboard + darts, pool table + cues + balls, jukebox, bar stools, booths, cushions, coat hooks, newspapers, matchday programmes, TV remotes, a bell for last orders (ring it to make everyone leave — and leave their food behind), the MONSTOR fridge behind the bar.

84.5 OYSTERFLEET JOKE INVENTORY (30 — all as 3D signs/props)
1. "STAFF OF THE MONTH: RONNIE (ATE THE CERTIFICATE)"
2. Staff rota with "RONNIE — BREAK" written in every slot
3. "PLEASE DO NOT FEED THE BARMAN"
4. Chalkboard: "TODAY'S SPECIALS: WHATEVER RONNIE HASN'T EATEN"
5. Crisp clip board with every clip empty except one, labelled "RONNIE'S"
6. "PIE OF THE DAY: GONE (RONNIE)"
7. A stock-take sheet: "Crisps: -400. Explanation: Ronnie."
8. "MAX OCCUPANCY: 120 (OR 3 RONNIES)"
9. Bar flap with "MIND YOUR HEAD" crossed out and "MIND YOUR BELLY, RON" written underneath
10. The Gaffer's notice: "STAFF FOOD ALLOWANCE: ONE (1) BAG OF CRISPS. RONNIE THIS MEANS YOU."
11. A framed photo "RONNIE'S FIRST SHIFT" — and next to it, "RONNIE TODAY" (needs a wider frame)
12. Quiz night board: "Q1: How many pies did Ronnie eat last night? A: Yes."
13. Darts scoreboard: "RONNIE 180 (pies)"
14. The fruit machine is renamed "THE CHIP MACHINE"
15. A broken bar stool with "RIP STOOL 4, 2019–2026" on it
16. A wet-floor sign: "CAUTION: RONNIE SWEAT"
17. The toilet sign: "STAFF TOILET — RONNIE: USE THE BIG ONE"
18. Tip jar labelled "RONNIE'S PASTY FUND"
19. Beer garden sign: "NO BARBECUES (RONNIE ATE THE LAST ONE)"
20. A "Lost Property" box containing 30 empty MONSTOR cans and Ronnie's neck (Neck Search gag)
21. Charity jar: "SAVE RONNIE'S SHIRT BUTTONS"
22. The pub cat asleep in the only crisp box Ronnie hasn't opened
23. Matchday flyer: "BIG SCREEN! (Ronnie may block view)"
24. Glass-washer note: "These are for GLASSES, Ronnie, not for washing your plate between seconds"
25. "WE DO NOT SERVE SALAD" — with "Chloe" written underneath angrily: "YES YOU DO"
26. A whiteboard tally: "Times Ronnie got stuck behind the bar: IIII IIII II"
27. "LAST ORDERS" bell with a sticky note: "Ronnie: last orders means for the CUSTOMERS"
28. Wall of fame: photos of the squad from school days to now (adults only in the recent ones; school ones as old blurry photos on the wall)
29. A trophy: "OYSTERFLEET PIE-EATING CHAMPION — RONNIE (UNDEFEATED, UNCHALLENGED, UNWELL)"
30. The pub sign outside: oyster painting, and at the end of the level it's repainted showing a very fat oyster: "THE RONNIEFLEET".

84.6 OYSTERFLEET LEVEL ENDING
- Ronnie gets wedged behind the bar; the Gaffer and Noah try to push him out; he pops free like a cork, sliding the full length of the bar and knocking every glass off; the Gaffer: "...you're working a double tomorrow." The sign changes to "THE RONNIEFLEET".

=========================================================================
85. MONSTOR — RONNIE'S ENERGY DRINK
=========================================================================
85.1 BRAND (in-game)
- Name: MONSTOR. Tagline on the can: "UNLEASH THE MONSTOR".
- Can design: tall 500ml can, matte black base, a big jagged neon "M" claw-scratch logo (original design — must not copy any real energy-drink logo), flavour colour band, condensation droplets, ring-pull tab.
- (Note for the builder: this is a private game among friends. If it is ever shared publicly, change the name and design to something clearly original so it can't be confused with a real brand.)

85.2 RONNIE'S FAVOURITE FLAVOURS (the stars of the game)
| Flavour | Can look | Power-up | Duration | Notes |
|---|---|---|---|---|
| MANGO LOCO | bright orange & yellow can with a sun pattern and a skull-and-flowers vibe | LOCO MODE: everything Ronnie eats is worth x3 Chonk, the world tints warm, a mariachi-style original tune kicks in, food comes to Ronnie in a whirlwind | 10s | His No.1 favourite. Tommy: "That's his favourite. You can tell because he's crying." |
| MONSTOR WHITE | white & silver can with a pale ice-blue claw | WHITE OUT: total veg immunity — veg bounces off a frosty aura, plus a crisp "ting" for each deflection | 6s | The best defensive drink |
| F1 EDITION | sleek racing-style can in carbon-fibre black with a chequered band and a red racing stripe | PIT STOP: Ronnie moves 2x faster, the world gets motion-blurred lines (comfort-safe, edges only), engine sounds play when he walks, a "LAP TIME" counter times how fast he clears a table of food | 8s | Lewis: "Bro, F1 drivers weigh 70 kilos." Ronnie: *chugs* |
Other flavours (from feature 20, updated): ORIGINAL GREEN (standard MONSTOR MODE), PIPELINE PUNCH-style pink (float), ULTRA BLUE (the "Chelsea Edition", stadium chants on every bite), and REHAB (shrinks you — covered in dust; Chloe keeps buying it, Ronnie keeps not drinking it).

85.3 MONSTOR MECHANICS (updates section 18.3)
- Each can: 15 Chonk + its flavour power. 2L "MEGA" cans of each flavour exist (40 Chonk, double duration, two hands).
- UNLEASH THE MONSTOR: 5 cans within 45 seconds — any flavours. If the 5 are all different flavours: "FLAVOUR FRENZY" — every power active at once for 5 seconds.
- The MONSTOR FRIDGE: every level has a glowing fridge of cans; the friends try to guard it, lock it, or swap the cans for sparkling water (Ronnie spits it out: "IT'S JUST WET!").
- Withdrawal (feature 8): now shows a specific craving bubble over Ronnie's head — "MANGO LOCO..." — and the next Mango Loco gives a bonus.
- Sounds: every flavour has its own crack-open sound and a different gulp pitch; Mango Loco gets a little trumpet sting.

=========================================================================
86. THE SCHOOL CONNECTION
=========================================================================
86.1 BACKSTORY
- Everyone in the squad met at school. Tommy and Ronnie have been best mates since the first day (Tommy was one day older then, too).
- Use it for banter: old nicknames, school stories, "you were always like this", "Ronnie got banned from the tuck shop in Year 9" (adults reminiscing — no gameplay ever shows them as children; any old school photos on walls are blurry and far away).

86.2 NEW LEVEL: THE SCHOOL REUNION (bonus level, all adults)
- The squad goes back to their old school for a reunion night in the school hall and canteen.
- Setting (realistic): school hall with a stage, basketball lines on the floor, climbing bars, stacked plastic chairs, a canteen with metal serving counters and trays, a tuck-shop hatch, the old PE changing rooms, trophy cabinet, noticeboards.
- Food: the reunion buffet (sausage rolls, sandwiches, crisps), the old canteen counter (pizza squares, chips, sponge pudding with custard, chocolate concrete with pink custard), the tuck shop.
- Veggie War twist: Chloe and the squad convince the canteen staff to serve "the healthy option". Dinner-lady NPCs ladle peas and broccoli at Ronnie; Ronnie raids the kitchen.
- NPCs: the old PE teacher (now retired, whistle, shouts "LAPS, RONNIE!"), the dinner ladies (feed everyone except Ronnie — "you've had enough, love"), the old headteacher giving a speech that Ronnie keeps interrupting by eating.
- Gags: Ronnie's old school photo in the trophy cabinet labelled "Most Likely To... Eat The Trophy"; the "Leavers' Yearbook" prop with "Most Likely To" awards for everyone:
  - Ronnie: "Most Likely To Have His Own Postcode"
  - Tommy: "Most Likely To Remind You He's Older"
  - Lewis: "Most Likely To Bench Press A Car (Still Can't Grow A Beard)"
  - Harry H: "Most Likely To Get Ghosted On Every App"
  - Aidan: "Most Likely To Be Found At The Bar"
  - Noah: "Most Likely To Tackle A Bus"
  - Oliver: "Most Likely To Go Viral (Did)"
  - Dylan: "Most Likely To Bite Someone (Did)"
- Ending: Ronnie gets stuck in the climbing bars (wall bars) in the hall; the PE teacher blows the whistle; the whole squad has to lift him down — Noah's scrum gag.

=========================================================================
87. THE OFFICE (Tommy, Dylan and Aidan's workplace)
=========================================================================
87.1 NEW LEVEL: "OFFICE RAID" (bonus level)
- Tommy, Dylan and Aidan work office jobs. Ronnie "pops in to bring them lunch" and eats the entire office.
- Setting (realistic): an open-plan office — desks, monitors, swivel chairs, a kitchenette, a breakroom with a vending machine, a meeting room with a cake (it's someone's birthday — there's ALWAYS a cake), a printer, a water cooler, a "biscuit tin of power".
- Gameplay: stealth-lite raid. Avoid the office manager NPC, raid desk drawers (secret snack stashes), shake the vending machine, eat the birthday cake before the "Happy Birthday" song (original tune), drink every MONSTOR in the office fridge (labelled with people's names — "DYLAN'S. DO NOT TOUCH." — Ronnie touches).
- Each of the three friends at their desk:
  - TOMMY: immaculate desk, a framed photo of himself, a salad in a glass jar, a standing desk ("posture, Ron"). He tries to feed Ronnie the jar salad.
  - DYLAN: chaotic desk covered in Oasis memorabilia, a parka on the chair, a stress ball he throws at Ronnie, ambushes from under his desk.
  - AIDAN: calm desk, a plant he talks to, a mug that says "WORLD'S OKAYEST COLLEAGUE", hides a beetroot in Ronnie's sandwich.
- Office props: keyboards, mice, staplers (throwable — Job Simulator homage), sticky notes (Ronnie can write on them in VR), mugs, whiteboard markers (draw on the whiteboard), swivel chairs (spin on them), printer (print "RONNIE WAS HERE"), water cooler (fill a cup; it's the "enemy" — water).
- Joke signs: "PLEASE LABEL YOUR FOOD (RONNIE CAN'T READ LABELS WHEN HE'S HUNGRY)", "MEETING ROOM 2: RESERVED — RONNIE'S BELLY", "KPI OF THE MONTH: SNACKS CONSUMED (RONNIE: 600%)".
- Ending: Ronnie sits in a swivel chair and it slowly sinks to the floor with a long hiss; the office manager: "...who IS this man?"

=========================================================================
88. THE NO-LIMITS ROAST PACK (Ronnie's size — go for it)
=========================================================================
Add these to the line banks (the "Roast_General" banks of each character) — minimum 100 new lines in this style; write them all out in full. (Kept off-limits by design: Ronnie's stutter. Everything about his size, appetite and MONSTOR habit is fair game.)

TOMMY
- "Ronnie, when you step on the scales, they say 'to be continued'."
- "Your blood type is gravy, mate."
- "You don't have a double chin, Ron, you've got a chin with a mortgage."
- "When you go swimming, the sea checks if you've left."
- "You're not a man, you're a weather event."
- "I've seen sofas get nervous when you walk in."
- "Ron, your belly's got its own Wi-Fi password."
- "When you were born, they didn't weigh you, they surveyed you."
- "You've got more layers than a lasagne, and you've eaten six of those today."
- "Your fridge has a fan club. It's just you. Every night."
- "Mate, you've been on a seafood diet so long — you see food, and then the whole restaurant."
- "You make Noah look like a stick insect, and Noah is a WARDROBE."
TASHA
- "Ronnie, you're so big, when you wear a yellow shirt people try to catch a taxi in you."
- "Once upon a time, Ronnie saw a salad. The salad ran away. The End."
- "If Ronnie were a fairy-tale, it would be 'Goldilocks and the Three Kebabs'."
- "Ronnie's so big, his reflection needs two mirrors."
- "When Ronnie goes to the beach, the whales sing to him. They think he's family."
- "Ronnie, you're the only person who's ever been lapped by a snail at Five-a-Side."
- "The moon told me it's jealous, Ron. You've got more craters from where the pies went in."
CHLOE
- "Ronnie, I love you, but the bed has a lean now. Towards YOU."
- "Babe, our hugs need planning permission."
- "You ate my birthday cake. On YOUR birthday. That's not even your cake to eat. It's MINE."
- "I've named your belly. It's called 'Kevin'. Kevin is ALSO hungry."
- "When you lie down, I roll towards you. Not romantically. Gravitationally."
LEWIS
- "Bro, your bulk has a bulk."
- "Bro, you squat the sofa every time you sit down. That's your only rep."
- "You're not big-boned, bro, your bones are just carrying a lot of shopping."
- "Bro, your BMI just came back as a postcode."
HARRY H
- "Ron, if you were on a dating app, your height would say 5'10 and your width would say 'yes'."
- "Mate, even my matches ghost me less than your feet do — when did you last see them?"
- "Ronnie, you'd be the best offensive lineman in history. You'd just lie down and the whole pitch is blocked."
AIDAN
- "Ronnie. You're the only man who's ever finished a pint and then the barrel."
- "I tell people you're my mate. Then I tell them which side of you to walk around."
- "Lad, the Gaffer's thinking of charging you rent for the space behind the bar."
NOAH
- "I've packed down in scrums lighter than you, Ron. A whole scrum. All eight."
- "I'm the big one, Ron. I was the big one. You stole my whole identity. And my pie."
OLIVER
- "Ronnie, your belly's got more views than my channel."
- "My followers voted, Ron. 98% think you're a planet. 2% think you're two planets."
- "The algorithm keeps recommending you to people who like documentaries about whales."
DYLAN
- "RONNIE! Your belly's bigger than Knebworth! ...that's a gig reference, Ron. A BIG gig."
- "You're like a stadium tour, Ron — sold out, massive, and goes on forever."
- "I'd jump on your back but I'd need climbing gear."
THE GAFFER
- "Ronnie, you're the only barman who leaves the pub heavier than the deliveries."
- "I hired you to pull pints, not to pull every pie out of the cabinet."

=========================================================================
89. NEW FEATURES (F81–F110)
=========================================================================
F81. VEG RADAR — a wrist display showing incoming veg attacks (arrows at the edge of view), essential in group waves.
F82. RETURN TO SENDER combo — chain 5 veg throw-backs that hit friends = "VEGGIE VENGEANCE" slow-mo.
F83. SALAD SHIELD WALL — friends build a wall of salad bowls; eat through it (it counts as veg!) or knock it over.
F84. AEROPLANE DUEL — Chloe's spoon-aeroplane becomes a mini air battle: swat the spoon away three times to "shoot it down" (World War II-style original sting).
F85. SMOOTHIE BLENDER BOSS — Lewis wheels in a giant blender of kale smoothie. Throw junk food into the blender to sabotage it — it turns into a milkshake and Ronnie drinks it.
F86. SPROUT GATLING — Harry H's Christmas-level attack: a tennis-ball launcher full of sprouts. Hide behind the bar.
F87. THE GAFFER'S WATCH — Oysterfleet boss mechanic (84.2).
F88. PINT-PULLING MINIGAME — pull the perfect pint for regulars (head height, no overflow); perfect pints = tips; Ronnie drinks any that go wrong.
F89. LAST ORDERS — ring the bell, everyone leaves their food on the tables. 30 seconds to clear every table.
F90. CHIP MACHINE (fruit machine parody) — pull the lever; 3 burgers = jackpot of burgers raining from the ceiling.
F91. MONSTOR FLAVOUR TASTING — a "sommelier" minigame at the Oysterfleet: Tasha blindfolds Ronnie (screen dims gently) and he has to identify the flavour by taste (sound + colour cues); guessing Mango Loco right makes him tear up.
F92. F1 PIT STOP RACE — with the F1 Edition, a timed lap around the Oysterfleet clearing every table of food; Lewis shouts lap times.
F93. SCHOOL TUCK SHOP RAID — Reunion level mini-heist.
F94. YEARBOOK "MOST LIKELY TO" — collectable yearbook pages for every character.
F95. OFFICE VENDING MACHINE SHAKE — shake it hard (both hands) to free stuck snacks; shake too hard and it falls on Dylan.
F96. LABELLED FOOD THEFT — the office fridge: every item labelled with someone's name; Ronnie's scorecard lists exactly whose food he ate.
F97. STAPLER THROW — throw a stapler at Tommy (Job Simulator homage); Tommy: "Not the face, it's my brand."
F98. GREEN MODE — the Veg-o-Meter fail state (83.8).
F99. SPIT-TAKE PHYSICS — spat veg sticks to walls and slides down; hitting a friend with spat veg = "GROSS-OUT BONUS".
F100. HIDDEN VEG — friends hide veg INSIDE junk food (a burger with a secret spinach layer). Inspect food before eating: hold it close and a faint green glow reveals hidden veg.
F101. NOAH'S OVERTAKE MOMENT — the first time Ronnie becomes bigger than Noah, everything stops, a dramatic choir plays, and Noah has a voiced breakdown.
F102. THE SQUAD SCHOOL PHOTO — on the Reunion level, recreate the old class photo as adults; Ronnie needs three rows.
F103. CHLOE'S TUPPERWARE — she leaves pre-packed veg lunches everywhere; collect and throw them in the bin for "Freedom" points; she finds out and the next wave is angrier.
F104. TASHA'S VEG SPELLS — whimsical attacks: she "enchants" a broccoli so it floats and chases Ronnie around the room like a tiny green ghost.
F105. TOMMY'S HYDRATION STATION — Tommy sets up a water table and follows Ronnie offering cups; every cup refused adds a tally on Tommy's clipboard ("Hydration refused: 46").
F106. OLIVER'S "VEG ASMR" STREAM — Oliver tries to make veg appealing by filming ASMR crunching; Ronnie answers by crunching crisps louder; followers prefer the crisps.
F107. DYLAN'S CELERY AMBUSH — an upgraded ambush with a celery stick held like a dagger; parry it with a sausage roll.
F108. AIDAN'S BEETROOT PINT — inspect your pint: if it's purple, Aidan's spiked it with beetroot. Pour it on his shoes.
F109. NOAH'S CABBAGE BOWLING — dodge rolling cabbages like a bowling alley.
F110. "HE'S STILL HUNGRY" FINALE — after the Squad Intervention, every friend fires every veg at once in a giant slow-motion volley; the player has 10 seconds of WHITE OUT to walk through it untouched, eating a kebab.

=========================================================================
90. UPDATED SQUAD INTERVENTION (replaces the structure in 66.6)
=========================================================================
Now a VEGGIE WAR boss rush on Ronnie's street:
1. Chloe — Aeroplane Duel + salad bowl tip
2. Tasha — Veg Spells + fairy spinach
3. Lewis — Smoothie Blender Boss
4. Harry H — Sprout Gatling
5. Noah — Cabbage Bowling + tackle
6. Oliver — Pea catapult live stream
7. Aidan — "Lentil soup, Ron" + beetroot pint
8. Dylan — Celery dagger ambush from a manhole
9. FINAL — Tommy holds a single perfect cucumber: "Ronnie. As your older, wiser, better-looking mate... I'm just trying to help." The player must choose: eat the cucumber (secret "redemption" ending: Ronnie shrinks one stage, everyone cries, then he eats the street anyway) or slap it out of his hand (standard ending: Ronnie eats the street and floats into space).

=========================================================================
91. PERFORMANCE WITH REALISM (Quest 3)
=========================================================================
- Two modes: PERFORMANCE (90Hz, 2K textures on heroes, 1K on mates, character real-time shadows, MSAA 4x) and FIDELITY (72Hz, higher render scale, 4K face textures on heroes where memory allows, extended LOD distances, light LUT grade).
- Same budgets as section 31, but texture memory will be the main constraint: stream textures per level with Addressables, use ASTC 4x4 only on faces/hands/food, 6x6 elsewhere, 8x8 on floors and ceilings.
- Hair cards and food with alpha cut-outs are overdraw-heavy: use alpha-to-coverage, limit layers, and avoid large transparent surfaces near the camera.
- Physics: every grabbable object is a Rigidbody, but sleep aggressively; objects more than 3m from the player and not moving are set kinematic; max 40 simulated food items at once; veg projectiles pooled (max 30).
- NPC count rules from section 69 still apply (max 4 fully active characters).
- Optional "PC VR ULTRA" build via Link: real-time GI, higher-poly LOD0s, 4K textures everywhere, real-time reflections.

=========================================================================
92. NEW SCRIPTS
=========================================================================
- VegWarDirector.cs — waves, attacker selection, difficulty ramp, telegraph timing.
- VegProjectile.cs — veg physics, hit detection on mouth/face/body, splat/stick decals.
- ForceFeedAttack.cs — the NPC push-toward-mouth attack with anticipation and cancel windows.
- RonnieDefence.cs — block, swat, gob guard, spit, throw-back, belly bounce.
- VegOMeter.cs — veg tally, Green Mode fail state.
- MonstorFlavour (ScriptableObject) + MonstorPowerSystem.cs — Mango Loco / White Out / F1 Pit Stop / Flavour Frenzy.
- ShotgunCan.cs, CanCrush.cs, LiquidContainer.cs (shader-driven liquid level + slosh + pouring).
- PhysicsHand.cs, GrabHighlighter.cs, SnackGrab.cs (Alyx-style flick pull), GrabPoseLibrary.
- BarShift.cs, PintTap.cs, GafferWatch.cs, TillSystem.cs (Oysterfleet).
- ReunionLevel.cs, OfficeRaid.cs, VendingMachineShake.cs, LabelledFood.cs.
- HiddenVegInspector.cs (F100).

=========================================================================
93. ART QA FOR REALISM
=========================================================================
[ ] Every character looks like a real person at 1m in the headset — check eyes, teeth, skin and hair up close.
[ ] Every friend is recognisable as themselves (if references were provided) and by silhouette at 10m.
[ ] Food looks real enough to make the tester hungry.
[ ] Every visible object is a 3D model; every loose object can be picked up, has a shake sound, and a correct collider.
[ ] Cans, glasses, wet food and the bar top show believable reflections (reflection probes baked).
[ ] Ronnie's 12 growth stages deform cleanly at realistic quality (mirror check, every stage).
[ ] PERFORMANCE mode holds 90fps; FIDELITY mode holds 72fps in the busiest Veggie War wave.

=========================================================================
94. UPDATED LEVEL ORDER
=========================================================================
Main campaign: 1 Bedroom → 2 Corner Shop → 3 Liddle-Price Supermarket → 4 Kebab Shop at 2AM → 5 THE OYSTERFLEET (Ronnie's shift) → 6 All-You-Can-Eat Buffet → 7 Date Night → 8 Birthday Party → 9 Squad Intervention (Veggie War boss rush) → 10 Space: The Final Buffet.
Bonus: School Reunion, Office Raid, Fridge Raid at 3AM, Lewis's Gym, Five-a-Side, Tasha's Storybook, Chloe's Weird Hour, Food Fight Arena, Ice Cream Van Chase, Ronnie Roast Night, Couples' Night, Lads' Holiday.
Every level now runs the Veggie War system with that level's roster.

=========================================================================
95. STILL NEEDED FROM TOMMY (to finish the likenesses)
=========================================================================
- Reference photos of each person (with their permission) for face likeness.
- Real eye colours; tattoos, piercings or glasses; usual clothes and footwear.
- Ronnie's and Tommy's birthdays (one day apart), and everyone else's.
- Catchphrases, nicknames and school stories; the real Oysterfleet's look (photos) if it's based on a real pub.
- Lewis's, Harry H's and Noah's jobs.
