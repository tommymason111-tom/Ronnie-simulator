# Ronnie Simulator — Brief (first playable)

Source: `Ronnie simulator prompt.md` (the full design, unchanged). This brief covers only the first
playable slice, built as a WebXR browser game so it lives on GitHub and plays in the Quest 3 browser.

## The game in one line
You are Ronnie. Eat everything in your bedroom and grow to Absolute Unit while your best mate Tommy
(one day older, six-pack, "just trying to help") roasts you out loud.

## The first minute
Tommy leans in the doorway: "Morning, little brother. Oh wait, you're the YOUNGER one." The room is
knee-deep in MONSTOR cans and food is everywhere. Grab a doughnut, bring it to your mouth: CHOMP,
crumbs, +10. Eat fast to chain combos. Throw a kebab at Tommy and he flies across the room, gets up,
and says "Ow! I'm just trying to help!"

## What is built
- Ronnie's Bedroom with 20+ joke props from section 21.1 (WANTED poster, BE MORE TOMMY, Ronnie
  Crater bed, wardrobe S → PARACHUTE, door sign PUSH → USE THE WALL, height chart, pizza rug, ...)
- Grab and eat (VR: grip, bring to mouth · screen: click, click again)
- Chonk Meter and growth stages 1–8 (section 18.1 numbers); you physically get bigger; your belly
  grows in view; the roof pops off at Ronnie XXL; the walls bulge at Absolute Unit
- Combos x2/x3/x5/x10 (section 18.2), MONSTOR MODE, UNLEASH THE MONSTOR (5 cans in 45s → hoover)
- Burp gauge and shockwave (ruins Tommy's hair), excuses (A / Q) with Tommy's comebacks
- Tommy: follows you, roasts within the rules of section 3 (no repeats in the last 8 lines),
  voiced by the browser's text-to-speech, speech bubble + subtitles; fake ragdoll when hit by food,
  slapped (VR) or belly-bumped; gets up and says a line
- Scorecard receipt with stars; 4-minute level

## Left for later
Levels 2+, the squad, Veggie War, mirrors, real voice recordings, photo mode, two-player.

## Look
Bright cartoon, flat lighting, no shadows — chosen so it holds frame rate in the Quest browser.

## Performance rules kept
One instanced mesh for the floor cans, static room meshes, no real-time shadows or post effects,
foveation on, all sound synthesised (no downloads), food capped at `food_on_map`.
