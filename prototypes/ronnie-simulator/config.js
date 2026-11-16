// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is eating your way to Absolute Unit while Tommy roasts you fun in VR?
// Date: 2026-11-16
// Every tuning value. The game reads these live through tune.<name>.
window.CONFIG = {
  seed: 1,
  level_time:        { value: 240, min: 60,  max: 600, step: 10 },   // seconds
  chonk_multiplier:  { value: 1,   min: 0.25, max: 5,  step: 0.25 }, // scales every item's chonk
  combo_window:      { value: 1.5, min: 0.5, max: 4,   step: 0.1 },  // seconds between bites
  monstor_time:      { value: 10,  min: 3,   max: 30,  step: 1 },    // seconds of MONSTOR MODE
  unleash_cans:      { value: 5,   min: 2,   max: 10,  step: 1 },    // cans within unleash_window
  unleash_window:    { value: 45,  min: 10,  max: 120, step: 5 },
  unleash_time:      { value: 8,   min: 2,   max: 20,  step: 1 },
  unleash_radius:    { value: 3,   min: 1,   max: 6,   step: 0.5 },  // metres x Ronnie's scale
  food_on_map:       { value: 18,  min: 6,   max: 40,  step: 1 },    // food items in the room at once
  respawn_delay:     { value: 1.5, min: 0,   max: 10,  step: 0.5 },
  golden_chance:     { value: 0.02, min: 0,  max: 0.5, step: 0.01 }, // chance a respawn is the Golden Burger
  move_speed:        { value: 1.6, min: 0.5, max: 4,   step: 0.1 },  // m/s at stage 1
  snap_turn:         { value: 30,  min: 15,  max: 90,  step: 15 },   // degrees
  grab_radius:       { value: 0.16, min: 0.05, max: 0.5, step: 0.01 },// metres from the hand (VR)
  reach:             { value: 2.4, min: 1,   max: 5,   step: 0.1 },  // metres you can grab at (desktop)
  mouth_radius:      { value: 0.2, min: 0.08, max: 0.5, step: 0.01 },// food this close to your face is eaten
  throw_speed:       { value: 8,   min: 2,   max: 20,  step: 0.5 },  // desktop throw, m/s
  tommy_hit_speed:   { value: 2.5, min: 0.5, max: 8,   step: 0.5 },  // food faster than this ragdolls Tommy
  slap_speed:        { value: 2.2, min: 1,   max: 6,   step: 0.1 },  // hand speed that counts as a slap (VR)
  tommy_chatter:     { value: 14,  min: 5,   max: 60,  step: 1 },    // seconds between unprompted roasts
  tommy_distance:    { value: 1.8, min: 1,   max: 4,   step: 0.1 },  // how close Tommy follows
  burp_per_can:      { value: 20,  min: 5,   max: 100, step: 5 },    // % burp gauge per can
  burp_radius:       { value: 2,   min: 0.5, max: 5,   step: 0.25 }, // metres x scale at full gauge
  volume:            { value: 0.6, min: 0,   max: 1,   step: 0.05 },
  voice_rate:        { value: 1.05, min: 0.6, max: 1.6, step: 0.05 },// Tommy's text-to-speech speed
};
