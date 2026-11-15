// the game's version (bump this with each release)
var GAME_VERSION = '2.6.2';
// when each update came out (UK time)
var GAME_WHEN = {'1.4.0': '2026-11-14T18:10', '1.5.0': '2026-11-14T19:04', '1.5.1': '2026-11-14T19:28', '1.5.2': '2026-11-14T19:32', '1.5.3': '2026-11-14T19:36', '1.5.4': '2026-11-14T19:46', '1.5.5': '2026-11-14T19:59', '1.5.6': '2026-11-14T21:33', '1.5.7': '2026-11-14T21:42', '1.5.8': '2026-11-14T22:20', '1.5.9': '2026-11-14T23:17', '1.6.0': '2026-11-15T08:50', '1.6.1': '2026-11-15T08:56', '1.6.2': '2026-11-15T08:57', '1.6.3': '2026-11-15T09:04', '1.6.4': '2026-11-15T09:06', '1.6.5': '2026-11-15T09:08', '1.6.6': '2026-11-15T09:10', '1.7.0': '2026-11-15T09:44', '1.7.1': '2026-11-15T09:50', '1.7.2': '2026-11-15T09:53', '1.7.3': '2026-11-15T10:00', '1.7.4': '2026-11-15T10:02', '1.8.0': '2026-11-15T11:15', '1.8.1': '2026-11-15T11:33', '1.8.2': '2026-11-15T11:39', '1.8.3': '2026-11-15T11:43', '1.8.4': '2026-11-15T11:47', '1.8.5': '2026-11-15T11:52', '1.8.6': '2026-11-15T11:53', '1.9.0': '2026-11-15T12:24', '1.9.1': '2026-11-15T12:25', '2.0.0': '2026-11-15T13:53', '2.0.1': '2026-11-15T14:11', '2.0.2': '2026-11-15T14:15', '2.1.0': '2026-11-15T14:21', '2.2.0': '2026-11-15T14:33', '2.6.2': '2026-11-15T16:15', '2.6.1': '2026-11-15T16:00', '2.6.0': '2026-11-15T15:54', '2.5.3': '2026-11-15T15:48', '2.5.2': '2026-11-15T15:46', '2.5.1': '2026-11-15T15:43', '2.5.0': '2026-11-15T15:42', '2.4.4': '2026-11-15T15:17', '2.4.3': '2026-11-15T15:15', '2.4.2': '2026-11-15T15:13', '2.4.1': '2026-11-15T15:10', '2.4.0': '2026-11-15T15:04', '2.3.0': '2026-11-15T14:44'};

// what's new (newest first) — shown under the settings cog
var GAME_UPDATES = [
  ['2.6.2', ['New emote: BACKFLIP (crouch, jump, a tucked flip all the way round, land and celebrate)', 'Ronnie\'s full-body model is much more detailed, and the white triangles all over him are gone', 'Ronnie has his own face picture on the WHO ARE YOU? screen and in the room', 'Multiplayer: the host\'s music and TV now reach everyone reliably (the host keeps telling everyone what\'s on, a song or video that stalls gets asked for again, and it plays even if the phone can\'t save it)', 'If your phone holds the music back, a TAP TO HEAR THE MUSIC button pops up', 'Opening the music or a TV can\'t press a button by accident any more (that was what sent people back to the menu); in multiplayer MAIN MENU asks before you leave the room']],
  ['2.6.1', ['Multiplayer: playing as Ronnie, everyone else sees his real full-body 3D model (not the big head), moving, emoting and punching like the squad', 'Songs and videos you add are kept on your device for good (the game asks the browser not to clear them; on an iPhone, add the game to your Home Screen too)']],
  ['2.6.0', ['TVs: tap a telly (poke it in VR) to put a video on it: pick one from your device and it plays on that TV, sound and all; pause, turn it up or down, or switch it OFF', 'Add videos with ➕ ADD VIDEOS (on a Quest, in the normal browser before you go into VR); they\'re kept on your device', 'Multiplayer: only the host picks; everyone sees it on the same TV (it\'s sent round to them if it\'s not too big)', 'Pausing the music cuts it straight off (no more stuck, repeating note) and PLAY carries on from the same place']],
  ['2.5.3', ['Food is 60% bigger than real life, and there\'s loads more: about 150 bits in every big place, on every table, counter and bench, and it tops up quicker', 'Food you can pick up glows softly (a warm pulsing halo) so you can spot it across the room']],
  ['2.5.2', ['Phones always run the newest version: if the page is an old saved copy it reloads itself once, and every part of the game is loaded together (an old part mixed with new ones was why emotes showed as an emoji and arms didn\'t move for some players)']],
  ['2.5.1', ['Phones: the 😎 EMOTE button always sits just above SPRINT (it could end up in the top corner, unstyled)']],
  ['2.5.0', ['MUSIC: speakers in every place (the DJ booth at the Oysterfleet, a hi-fi either side of Lewis\'s telly, a speaker in the restaurant and the bedroom, the Lidl tannoy). Tap the glowing 🎵 MUSIC button (or poke it in VR) to pick a song, play / pause and turn it up or down. A song keeps repeating until you pick another', 'The library: Supersonic, Wonderwall, Miss Alissa, You Really Got Me, London Calling, You Don\'t Know Me, Chelsea Dagger, My Type, Jerk It Out, Busy Earnin\', Freed From Desire, Horny \'98, The Hampsterdance Song, Did You See, Options. Add the songs once with ➕ ADD SONGS (they\'re kept on your device)', 'Multiplayer: everyone hears the host\'s music (it\'s sent to anyone who hasn\'t got the song) in time with the host; only the host can change it', 'Multiplayer: you hear other players\' hits, slaps and punches, from where they happen (louder when they\'re near you)', 'You can only hold one thing at a time: try to pick up another and it tells you what you\'re already holding', 'Multiplayer: the stages are named after your character (Snacky Lewis, Chunky Chloe...)', 'The bedroom is single player only']],
  ['2.4.4', ['Behind the bar: the floor no longer flickers grey through the red tiles (an old concrete floor was underneath them)']],
  ['2.4.3', ['The brick pillar by the way into the conservatory has moved over against the wall, so there\'s no gap beside it']],
  ['2.4.2', ['Multiplayer: someone playing in VR now shows their arms the way they\'re really holding them (they were swapped over, so they looked crossed), with the elbows bending like real arms', 'The buttons on the high bar chairs sit in the leather instead of floating off the back']],
  ['2.4.1', ['Food is 30% bigger (drinks stay their real size)', 'Loads more food everywhere: about 80 bits in each big place (was 45) and it keeps topping up; the bedroom has more too', 'The Oysterfleet: food on every restaurant table, more on the pub tables and on the beer garden benches and round tables, spread right round instead of in clumps']],
  ['2.4.0', ['EMOTES in multiplayer: press 😎 EMOTE (or hold B in VR and push the right stick) for the emote wheel: MIDDLE FINGER, THE GRIDDY and SIX SEVEN, done by your whole character for everyone to see (in VR your arms stay your own real arms)', 'Tommy can be picked in multiplayer (the real Tommy sits that game out)', 'Your arm swings for everyone when you slap, punch or throw', 'Multiplayer starts with its own WHAT\'S YOUR NAME? screen', 'Only the host can change the game: the GAME MODE and RESTART buttons in the pause menu and the GAME MODES board are just for the host', 'In multiplayer the game keeps going behind the pause menu (your mates are still playing)']],
  ['2.3.0', ['Multiplayer: punch another player hard and they go flying as a ragdoll, just like the NPCs, then get back up (everyone sees it)', 'Multiplayer: hitting or slapping the squad works for players who joined too: they fall over and ragdoll for everyone', 'Multiplayer: players\' arms hang down normally and only come up to hit something or eat', 'Multiplayer: every player has their name over their head (and who they\'re playing as), so you can tell them from the squad', 'Multiplayer: you have to type your name before you go on', 'The WHO ARE YOU? screen fits on a phone: smaller cards in neat columns, scroll down to see everyone', 'The updates list shows the date and time of each update']],
  ['2.2.0', ['MULTIPLAYER: everyone shares the same food and the same squad: grab, throw and bite and your mates see it', 'Your mates see you as the squad member you picked (and that person isn\'t in the game as well)', 'Punch other players: swing at them in VR, tap them on a phone (no picking them up)', 'Attacks go for one player at a time, picked at random, and everyone sees who: "HARRY H IS ATTACKING TOM"']],
  ['2.1.0', ['PLAY now asks SOLO or MULTIPLAYER. Multiplayer: type your name and pick who you are from the squad, then HOST (you choose the place and game for everyone) or JOIN with a code', 'A room screen shows everyone in the room, their name and who they are playing as', 'Meet the Squad: picking someone else no longer makes the last one vanish for a moment', 'VR: holding the controllers, your hands point forward instead of down']],
  ['2.0.2', ['VR: PLAY on the headset menu now actually starts the game', 'VR: the menu button (or Y) pauses, with the same pause menu as the phone floating in front of you: point and pull the trigger', 'VR: attack pop-ups, banners and the attack animations are smaller and in the middle of your view, and pop in smoothly', 'When an attacker sets off, a tag says who is coming for you, with an arrow pointing to them']],
  ['2.0.1', ['Smoother, especially in VR: only the lights near you are worked out (same look), and the sky and water effects only work on what you can actually see', 'The screen behind PLAY ON THIS SCREEN is just a slow look round the place, cutting between different areas, with nothing else running']],
  ['2.0.0', ['MULTIPLAYER (first step): press PLAY WITH FRIENDS, HOST A GAME and share the 4-letter code. Your mates type it in and land in the same place and game as you. You can see each other walking round as Ronnies (with name tags, arms following your hands, getting fatter as you eat). Up to 6 per room, on phones, computers and Quest']],
  ['1.9.1', ['Removed the stray brick across the way into the conservatory (the brick pillar stays)']],
  ['1.9.0', ['NEW GAME: RUN THE PUB at the Oysterfleet. You\'re behind the bar with Aidan, Connor and Chloe; Lewis waits tables in the restaurant and Ben runs the kitchen. Locals (lots of drunk old boys), families and lads come in and order at the bar: hand them the right drink for tips. Fights, singing drunks and runaway kids to sort out. Takings and a star rating at the end', 'Everyone moves far more naturally: weight shifts, fidgets, proper walk and run cycles, stepping round on the spot, talking with their hands, wind-ups and follow-throughs', 'Free roam: everyone gets on with their own night (sitting at tables, propping up the bar, wandering, stopping to chat to each other)', 'Attackers sprint over on a proper route round the furniture, square up to you and turn you to face them', 'People steer round each other and furniture instead of getting stuck', 'Pick up the pub chairs, bottles off the back bar, sauces, salt and pepper, and beer mats', 'Throw something at a telly and the screen smashes', 'The river out the back is now a lake, with a jetty, a rowing boat, lily pads, ducks and swans']],
  ['1.8.6', ['Fixed the river bank, a big tree and bushes poking up inside the restaurant: they now stop behind the building']],
  ['1.8.5', ['A corridor down the left of the conservatory to a new back door out on to the beer garden deck (EXIT and BEER GARDEN signs, a door hooked open, a lantern and a step outside)', 'The way into the conservatory and the table by the pillar have moved over to make room; the conservatory windows moved along with them']],
  ['1.8.4', ['The Please Wait To Be Seated sign has moved aside by the wall, out of the way in', 'The plant by the fruit machine is now a full fig tree: braided trunks, arching branches and hundreds of glossy leaves']],
  ['1.8.3', ['Oysterfleet entrance: the bare walls by the way in are papered and panelled like the rest, with a framed print and wall lamps', 'A proper coat rack: oak board, brass hooks, a hat shelf, four real coats with sleeves, collars, hoods and buttons, a scarf, a flat cap, a bobble hat and a brolly', 'You now start on the entrance mat, facing into the pub']],
  ['1.8.2', ['The conservatory has a normal ceiling again (with spotlights), and the upstairs of the pub runs straight over it; the windows still look out on the garden']],
  ['1.8.1', ['The distance outside looks real: a painted 360° view of the town, wooded hills, the estuary with ships and the oil terminal, all fading into a summer haze', 'Real terraced houses round the beer garden: brick and render, uPVC windows with curtains, back doors, kitchen extensions, tiled roofs with chimney pots and satellite dishes, and long back gardens with fences, sheds, trampolines and washing out', 'Grass and fields all round instead of nothing', 'Picnic benches and round tables rebuilt: separate weathered boards with gaps, bolted A-frames, braces, curved seats; pints, ashtrays and sauce caddies on some', 'The deck outside the garden door is wider, with a clear walkway, and its tables now run out from the building']],
  ['1.8.0', ['A real sky over the beer garden: blue overhead, soft drifting clouds, the sun', 'The stream and the river ripple, reflect the sky and sparkle in the sun; a wide river with bushes and trees on the far bank', 'Hedges, bushes, trees and planters are full of leaves', 'Indoor plants are full leafy palms', 'The conservatory has real windows: look out at the beer garden (and in from it), and real sky through the glass roof', 'The garden doors fold right back and the first bench is gone, so the deck is easy to walk out on; no gap beside the garden door', 'Walking and sprinting are faster']],
  ['1.7.4', ['Reception desk: the end return is gone and the desk is slimmer, further from the front doors; the red armchair now sits in the corner by the doors']],
  ['1.7.3', ['The restaurant dining room has a much higher ceiling (4.2m): deep cream beams wall to wall, bigger plaster roses, chandeliers on long drops, taller curtained windows']],
  ['1.7.2', ['Floors no longer draw over the bar foot rail or show through under the walls']],
  ['1.7.1', ['Oysterfleet reception moved to where it really is: an L-shaped oak desk down the left side, staff behind it in front of the red wall with the office door and Reception sign', 'Proper front doors: glazed oak double doors with brass push plates and pull handles, kick plates, a gilt-lettered fanlight, door closers and a stone threshold', 'More detail in reception: framed awards and an Est. 1931 plaque, a brass lantern, a key cabinet, the premises licence']],
  ['1.7.0', ['The Oysterfleet restaurant: through the old restaurant entrance, a big eight-sided dining room laid out from your plan — white tablecloths, honey-wood chairs, places laid with glasses and napkins, amber candles, brass chandeliers with yellow shades, sconces, paintings and tall curtained windows', 'A long mahogany bar with brass beer founts, a rack of hanging glasses and a lit wall of wine bottles', 'A side room through a wide opening: three long banqueting tables, green damask and sage panelling, a big gilt mirror, yellow floor lamps', 'A hall to new Ladies and Gents, and the kitchen extended up so the restaurant has its own kitchen door next to the bar (walk-in cold room, pastry bench, dry stores)', 'Smoother: far-away parts of the pub are no longer drawn when out of view']],
  ['1.6.6', ['Two tall tables in the middle of the Oysterfleet floor', 'You now start the Oysterfleet in reception, facing the desk']],
  ['1.6.5', ['A tall table with three bar chairs in the middle of the Oysterfleet floor, between the pillars and the bar']],
  ['1.6.4', ['Men\'s toilets redone: urinals with privacy screens on three walls (no cubicles), the sinks, mirror, soap and a hand dryer on the right-hand wall, a frosted window up high', 'The unflushed surprise has moved to the accessible toilet']],
  ['1.6.3', ['Oysterfleet reception rebuilt like the real one: an oak panelled desk with a cream top facing into the room, staff behind it, a red wall with the office door and a Reception sign, tulips, leaflets, and a red buttoned leather tub chair']],
  ['1.6.2', ['Removed the specials board standing on the floor by the pub entrance']],
  ['1.6.1', ['Change game mode from the pause menu (GAME MODE shows the games for the place you\'re in)']],
  ['1.6.0', ['Ben\'s Turkey attack fills the whole phone screen, top to bottom (turn your phone sideways to watch)', 'On-screen buttons hide while an attack is happening']],
  ['1.5.9', ['Smoother at full quality: no lag knocking people over, off-screen stock not drawn, walls and panelling merged into far fewer draw calls, no per-frame work for anything that doesn\'t move']],
  ['1.5.8', ['Oysterfleet beer garden out the back door: a deck, the green stream and its little footbridge, block paving, the octagonal outdoor bar, picnic benches and yellow parasols, a raised deck by the river, a smoking shelter', 'The pub\'s MONSTOR fridge, back bar and cellar fitted out']],
  ['1.5.7', ['Lewis\'s house: family photos of Lewis and Ian made from their own 3D models (over the sofa, in the dining room, the hall and up the stairs)', 'Feature wallpaper and panelling, Ian\'s prize carp on a plaque, a HOME sign, a key rack']],
  ['1.5.6', ['Oysterfleet walls: burgundy anaglypta, a dark dado rail, cream damask paper, cornices and old framed pictures with picture lights', 'Lidl walls: kick strips, bumper rails, corner guards, posters, fire points and CCTV', 'Lewis\'s dining room: drawers and a tall cupboard']],
  ['1.5.5', ['Lidl: every aisle is twice as wide', 'Lidl: tall glass-door freezers and fridges (freezers, meat, dairy), a real MONSTOR fridge, a proper staff-only doorway', 'Lidl: magazines face the right way', 'Oysterfleet: a detailed kitchen']],
  ['1.5.4', ['Oysterfleet reception: a proper counter running to the wall, a waiting bench with old photos, coats, plants, a chalkboard, a mat at the door', 'Low wall beside the DJ booth', 'A two-seater by the raised area\'s half wall']],
  ['1.5.3', ['Oysterfleet kitchen rebuilt: range with pots on, griddle, chargrill, twin fryers, bain-marie, a big canopy, the pass with heat lamps and tickets, sinks, dishwasher, fridges, stores, a prep island under a pan rack', 'No rail across the restaurant doorway any more']],
  ['1.5.2', ['Oysterfleet: the brick cubby is now a brick corner like the real pub (an L-shaped booth, TV and mirror on the brick, nothing poking into the conservatory)', 'A table moved into the middle of the room with space round it']],
  ['1.5.1', ['Oysterfleet: the corridor behind the bar is gone, so behind the bar is one big space you can walk straight into', 'Behind the bar: a double sink, glass washer, ice well, bottle fridges, mixers, glasses, a bottle bin and the till', 'Smooth flowing slate floor along the front of the bar, quarry tiles behind it', 'Every chair faces its table, the tall bar chairs too']],
  ['1.5.0', ['Lidl: self checkouts rebuilt (screens facing you, a shelf for your shopping, a bagging area)', 'Lidl: staff sit on the cashier side of the tills', 'Lidl: slimmer stacks at the aisle ends, a clear walkway round them', 'Lidl: bakery corners joined up, bag stands removed', 'Lidl: you start in the foyer by the flowers, facing the way in', 'Oysterfleet: a fig plant by the fruit machine', 'Dylan has black trainers on']],
  ['1.4.2', ['Oysterfleet: windows through to the conservatory, a brick cubby with a booth and TV', 'Tall tables with cream leather bar chairs, one at the fruit machine', 'Bar food menus on every table', 'Fixed walls that had gone missing at the conservatory and beer garden door']],
  ['1.4.1', ['Oysterfleet bar rebuilt from the real one: open behind, walk in from the end, into the staff room', 'No more flickering walls, floors or signs', 'Every sign fits its words and sits on a wall (nothing floating)', 'Beer mats on every table']],
  ['1.4.0', ['Settings cog with the version', 'Oysterfleet: panelled half walls, brick pillars, farmhouse chairs, antler chandeliers', 'Lidl: bakery with a bake-off room and real bakery food, middle aisle baskets, Lidl bags with surprises inside, magazines, staff in uniforms', 'Supermarket Sweep counts calories']],
];
// RONNIE SIMULATOR — the start screen: a few animated screens you tap through.
//   TITLE   bouncing logo, tap Ronnie (he chomps and talks), catch the falling food
//   PLACE   swipe through the places, each with its own little animated scene
//   MODE    mode cards that flip over for the details (locked ones say why)
//   READY   your picks, then a 3-2-1 chomp countdown and LET'S EAT
//   SQUAD   meet everyone: their colour, their attack, tap for a line
//   HOW     how to play, headset or phone
// Hands the choice to the game as window.ronnieMenu (a Promise of { place, mode }),
// exactly like before; ?place=&mode=&go=1 still skips straight in.
(function () {
  const PLACES = [
    { id: 'pub', ico: '🍺', name: 'THE OYSTERFLEET', desc: "Ronnie's local and his work. The whole squad fits in.", bg: 'linear-gradient(160deg,#5a1a24,#2a1208)', props: ['🍺', '🎯', '📺', '🍟', '🎰'] },
    { id: 'garden', ico: '🏡', name: "LEWIS'S HOUSE", desc: 'A sunny back garden. Ian is on the barbecue. Lewy is fetching plates.', bg: 'linear-gradient(160deg,#4aa8f0,#5a9a36)', props: ['🍔', '🌭', '🍗', '⚽', '🌻'] },
    { id: 'shop', ico: '🛒', name: 'LIDL', desc: 'Aisles, the middle aisle, the bakery and a wall of MONSTOR.', bg: 'linear-gradient(160deg,#1e4ea8,#ffd400)', props: ['🛒', '🥐', '🥫', '🍩', '🧺'] },
    { id: 'restaurant', ico: '🕯️', name: 'LA GRANDE PORTION', desc: 'Fancy dinner. Date night with Chloe (and the lads at the other tables).', bg: 'linear-gradient(160deg,#5a0f18,#1a0508)', props: ['🕯️', '🍷', '🦞', '🍰', '🎹'] },
    { id: 'bedroom', ico: '🛏️', name: "RONNIE'S BEDROOM", desc: 'Where it all begins. Small, cosy, full of cans.', bg: 'linear-gradient(160deg,#3a2a6a,#1f4fbf)', props: ['🛏️', '🥫', '🎮', '🍕', '🥫'] },
  ];
  const MODES = [
    { id: 'everyone', ico: '👥', name: 'THE WHOLE SQUAD', desc: 'The main game. Everyone is here, taking turns to attack you while you eat. A countdown shows the next one.', stars: 3, who: 'Everyone' },
    { id: 'sweep', ico: '🛒', name: 'SUPERMARKET SWEEP', desc: '90 seconds and a trolley in Lidl. Grab the most calories you can. Oliver and Aidan W are on security (Aidan W is slow: knee).', stars: 2, who: 'Oliver, Aidan W', place: 'shop' },
    { id: 'bbq', ico: '🍖', name: "IAN'S BARBECUE", desc: "Round Lewis's house. Grab the food off the grill before Ian makes it healthy and throws it at you.", stars: 2, who: 'Ian, Lewis + the lads', place: 'garden' },
    { id: 'date', ico: '💜', name: 'DATE NIGHT', desc: "Eat when Chloe looks away. Three catches and it's salad.", stars: 2, who: 'Chloe + the lads', place: 'restaurant' },
    { id: 'eatoff', ico: '⏱️', name: 'EAT-OFF', desc: '60 seconds. Eat everything. On your own, or pass-and-play: who eats more?', stars: 1, who: '1 or 2 players' },
    { id: 'runpub', ico: '🍺', name: 'RUN THE PUB', desc: 'Work behind the bar at the Oysterfleet with Aidan, Connor and Chloe (Lewis is on the restaurant, Ben\'s in the kitchen). Serve the punters the right drinks, break up fights, catch runaway kids. Six-minute shift.', stars: 3, who: 'The staff, the locals, whoever turns up', place: 'pub' },
    { id: 'roam', ico: '🚶', name: 'FREE ROAM', desc: 'Have a look round and explore. Everyone is here, but nobody attacks you. No timer.', stars: 0, who: 'Everyone (no attacks)' },
  ];
  // each place has its own games: Lidl is Supermarket Sweep, Lewis's is Ian's barbecue,
  // La Grande Portion is date night; the pub and the bedroom have the squad and the eat-off
  const PLACE_MODES = { pub: ['everyone', 'runpub', 'eatoff', 'roam'], bedroom: ['everyone', 'eatoff', 'roam'], shop: ['sweep', 'roam'], garden: ['bbq', 'roam'], restaurant: ['date', 'roam'] };
  const GAME_IDS = ['everyone', 'runpub', 'sweep', 'bbq', 'date', 'chonkoff', 'chonkoff2', 'roam'];
  const cardOf = (id) => id === 'chonkoff' || id === 'chonkoff2' ? 'eatoff' : id;      // the eat-off card covers 1P and 2P
  const modeInfo = (id) => { const m = MODES.find(x => x.id === cardOf(id)); return id === 'chonkoff' ? { ...m, ico: '⏱️', name: 'EAT-OFF · 1 PLAYER' } : id === 'chonkoff2' ? { ...m, ico: '🆚', name: 'EAT-OFF · 2 PLAYERS' } : m; };
  const gameChoices = (p) => PLACE_MODES[p].flatMap(c => c === 'eatoff' ? ['chonkoff', 'chonkoff2'] : [c]);
  const SQUAD = [
    { n: 'Tommy', c: '#f0c040', a: '🦶', t: 'Trips you up', l: "I've been alive a WHOLE day longer than you, Ronnie." },
    { n: 'Chloe', c: '#c2185b', a: '🥗', t: 'Puts you on a diet', l: 'I made you a salad. You looked at it like it owed you money.' },
    { n: 'Lewis', c: '#d32f2f', a: '⚽', t: 'SIUUU like Ronaldo', l: 'Leg day, Ron? Every day\'s leg day for you, bro.' },
    { n: 'Harry', c: '#7a1f3d', a: '💘', t: 'His dating history', l: 'My longest relationship was eleven days. Twelve if you count the day she was telling everyone.' },
    { n: 'Aidan', c: '#2e7d32', a: '🍺', t: 'One more beer', l: 'Just the one, Ronnie. That\'s what I said in 2016 and I\'m still out.' },
    { n: 'Noah', c: '#1565c0', a: '🏉', t: 'The tackle', l: "I've tackled props, I've tackled locks, I've never tackled a man with his own moon." },
    { n: 'Oliver', c: '#ff9800', a: '📸', t: 'Camera flash', l: 'Like, comment and subscribe, and pray for the bakery section.' },
    { n: 'Dylan', c: '#6a1b9a', a: '🎸', t: 'Plays you Oasis', l: 'Second album\'s the best, Ronnie, don\'t even start. DON\'T. START.' },
    { n: 'Connor', c: '#c8102e', a: '☘️', t: 'Irish jig attack', l: "You'll never walk alone, Ronnie. Mostly because you can't fit through doors on your own." },
    { n: 'Ethan', c: '#febe10', a: '🥤', t: 'Pepsi Max attack', l: 'My nose can smell a pasty from three postcodes away, Ron.' },
    { n: 'Ian', c: '#6b8e23', a: '🎣', t: 'Healthy BBQ / fishing rod', l: 'Canvey Lake, Ronnie. Disgrace. I pulled out a whole sofa once. Nice sofa, actually.' },
    { n: 'Alfie', c: '#034694', a: '🌀', t: 'The nutmeg', l: 'I started a back piece once. It\'s just a dragon\'s tail now. On its own.' },
    { n: 'Aidan W', img: 'aidanw', c: '#132257', a: '🦵', t: 'Tells you about his knee', l: 'Spurs, Miles Morales and trading cards. And the knee. Mostly the knee.' },
    { n: 'Ben', c: '#2f6fd6', a: '✈️', t: 'Takes you to Turkey', l: 'Got my hairline done in Turkey, Ron. Let me take you.' },
  ];
  const RONNIE_LINES = ['Pass us that burger.', 'Mmm. MMMM.', 'Is there any more?', 'Go on then. One more.', 'Is that a burger?', 'One more. Just one.', "I'm not hungry. I'm BORED.", 'UNLEASH THE MONSTOR!', 'Who ate my pie? ...oh. Me.', 'Five a day? FIVE A DAY.', 'Chelsea, pies and MONSTOR.'];
  const ok = (m, p) => PLACE_MODES[p].includes(m.id);
  const PLACE_NAME = { restaurant: 'La Grande Portion', shop: 'Lidl', garden: "Lewis's House", pub: 'the Oysterfleet', bedroom: "Ronnie's bedroom" };

  const q = new URLSearchParams(location.search);
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('rs_menu') || '{}'); } catch (e) {}
  // always start at the Oysterfleet; only ?go=1 quick-starts use the address's place/mode
  const quick = !!q.get('go');
  let place = (quick && q.get('place')) || 'pub', mode = (quick && q.get('mode')) || 'everyone';
  if (!PLACES.some(p => p.id === place)) place = 'pub';
  if (!GAME_IDS.includes(mode)) mode = 'everyone';      // old links to Classic / Squad Intervention / Catch
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // settings cog (top corner of the title screen): shows the version you're playing
  const when = (v) => { const w = GAME_WHEN[v]; if (!w) return ''; const d = new Date(w + ':00Z');
    return d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' }).replace(/ (am|pm)$/, '$1'); };
  $('#set-version').textContent = 'v' + GAME_VERSION; $('#set-date').textContent = when(GAME_VERSION);
  $('#set-updates').innerHTML = GAME_UPDATES.map(([v, list]) => `<div class="upd"><b>v${v}${when(v) ? ` <i>${when(v)}</i>` : ''}</b><ul>${list.map(t => `<li>${t}</li>`).join('')}</ul></div>`).join('');
  $('#cog').addEventListener('click', () => { $('#settings').hidden = false; });
  $('#set-close').addEventListener('click', () => { $('#settings').hidden = true; });
  $('#settings').addEventListener('click', (e) => { if (e.target.id === 'settings') $('#settings').hidden = true; });
  const start = $('#start');

  // ---------------------------------------------------------------- little sounds + buzz
  let ac = null;
  function blip(f = 660, d = 0.08, type = 'square', vol = 0.06) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, ac.currentTime); o.frequency.exponentialRampToValueAtTime(f * 1.5, ac.currentTime + d);
      g.gain.setValueAtTime(vol, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d + 0.05);
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d + 0.06);
    } catch (e) {}
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }
  const chompSfx = () => { blip(180, 0.07, 'sawtooth', 0.08); setTimeout(() => blip(140, 0.06, 'sawtooth', 0.07), 90); };

  // ---------------------------------------------------------------- screens
  let current = 'title';
  function show(id, dir = 1) {
    if (id === 'mode' && PLACE_MODES[place].length === 1) { mode = gameChoices(place)[0]; id = dir > 0 ? 'ready' : 'place'; }   // only one game here
    const from = $(`.screen[data-s="${current}"]`), to = $(`.screen[data-s="${id}"]`);
    if (!to || id === current) return;
    from.classList.remove('on'); from.classList.add(dir > 0 ? 'out-left' : 'out-right');
    to.classList.remove('out-left', 'out-right'); to.classList.add(dir > 0 ? 'in-right' : 'in-left');
    void to.offsetWidth; to.classList.add('on'); to.classList.remove('in-right', 'in-left');
    setTimeout(() => from.classList.remove('out-left', 'out-right'), 450);
    current = id; start.scrollTop = 0;
    if (window.ronnieHero) { if (id === 'title') window.ronnieHero.resume(); else window.ronnieHero.pause(); }   // only draw him when he's on screen
    $$('.dots i').forEach((d, i) => d.classList.toggle('on', ['place', 'mode', 'ready'].indexOf(id) === i));
    $('.dots').classList.toggle('hide', !['place', 'mode', 'ready'].includes(id));
    if (id === 'mode') drawModes();
    if (id === 'ready') drawReady();
    blip(520, 0.06);
  }
  start.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    show(b.dataset.go, b.dataset.back ? -1 : 1);
  });

  // ---------------------------------------------------------------- TITLE: bouncing letters, Ronnie, catch-the-food
  $$('.bounce').forEach(el => { el.innerHTML = [...el.textContent].map((ch, i) => ch === ' ' ? ' ' : `<span style="animation-delay:${i * 0.07}s">${ch}</span>`).join(''); });
  const hero = $('#hero'), say = $('#ronnie-says');
  let sayT = 0;
  const ronnieSay = () => {
    say.textContent = RONNIE_LINES[Math.floor(Math.random() * RONNIE_LINES.length)]; say.classList.add('on');
    clearTimeout(sayT); sayT = setTimeout(() => say.classList.remove('on'), 2200);
    blip(300 + Math.random() * 120, 0.08, 'triangle', 0.07);
    if (window.ronnieHero) window.ronnieHero.talk(1.6);
    return say.textContent;
  };
  window.ronnieSay = ronnieSay;
  // the loading screen goes once 3D Ronnie is ready (or after 12s, or straight away when skipping the menu)
  const boot = $('#boot');
  window.bootDone = () => { if (boot && !boot.classList.contains('done')) { boot.classList.add('done'); setTimeout(() => boot.remove(), 400); } };
  setTimeout(window.bootDone, 12000);
  // the 3D Ronnie never turned up (no WebGL, three.js didn't load)? show the drawing instead
  setTimeout(() => { const hb = $('.herobox'); if (hb && !hb.classList.contains('three')) hb.classList.add('nothree'); }, 15000);
  window.menuSfx = (n) => { if (n === 'chomp') chompSfx(); else if (n === 'gulp') blip(160, 0.18, 'sine', 0.09); else if (n === 'pop') blip(620, 0.06); };
  window.menuNom = () => { const r = $('.herobox').getBoundingClientRect(); pop(r.left + r.width / 2, r.top + r.height * 0.55, ['NOM!', 'MUNCH!', 'GULP!', 'YUM!'][Math.floor(Math.random() * 4)], '#ffd400'); };
  hero.addEventListener('click', () => {          // the drawing (fallback)
    hero.classList.remove('gobble'); void hero.getBoundingClientRect(); hero.classList.add('gobble');
    chompSfx(); crumbs(hero); ronnieSay();
  });
  function crumbs(el) {
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
      const c = document.createElement('i'); c.className = 'crumb';
      c.style.left = (r.left + r.width * 0.55) + 'px'; c.style.top = (r.top + r.height * 0.62) + 'px';
      c.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px'); c.style.setProperty('--dy', (Math.random() * -120 - 20) + 'px');
      c.style.background = ['#e0a04a', '#5a2e14', '#4caf3c', '#ffc21a'][i % 4];
      document.body.appendChild(c); setTimeout(() => c.remove(), 700);
    }
  }
  // raining food you can catch (tap it): a little score in the corner
  const rain = $('#rain'), FOOD = ['🍔', '🍕', '🍩', '🌭', '🍟', '🥤', '🍗', '🌮', '🍰', '🥦'];
  let caught = 0, best = 0; try { best = +localStorage.getItem('rs_snackbest') || 0; } catch (e) {}
  const drawScore = () => {};
  function drop() {
    if (start.classList.contains('gone')) return;
    const s = document.createElement('span'), f = FOOD[Math.floor(Math.random() * FOOD.length)];
    s.textContent = f; s.style.left = (4 + Math.random() * 88) + '%';
    const dur = 5 + Math.random() * 5; s.style.animationDuration = dur + 's';
    s.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (f === '🥦') { caught = Math.max(0, caught - 3); pop(e.clientX, e.clientY, 'BLEURGH -3', '#7cff6a'); blip(110, 0.2, 'sawtooth', 0.06); }
      else { caught++; pop(e.clientX, e.clientY, '+1 NOM', '#ffd400'); chompSfx(); if (caught > best) { best = caught; try { localStorage.setItem('rs_snackbest', best); } catch (er) {} } }
      drawScore();
      s.remove();
    });
    rain.appendChild(s); setTimeout(() => s.remove(), dur * 1000);
  }
  for (let i = 0; i < 6; i++) setTimeout(drop, i * 400);
  setInterval(drop, 900);
  function pop(x, y, txt, color) { const p = document.createElement('b'); p.className = 'popword'; p.textContent = txt; p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.color = color; document.body.appendChild(p); setTimeout(() => p.remove(), 900); }

  // ---------------------------------------------------------------- PLACE: a swipeable carousel of little scenes
  const track = $('#place-track');
  track.innerHTML = PLACES.map(p => `
    <div class="scene" data-id="${p.id}" style="background:${p.bg}">
      <div class="props">${p.props.map((e, i) => `<span style="--i:${i}">${e}</span>`).join('')}</div>
      <div class="big">${p.ico}</div>
      <h3>${p.name}</h3><p>${p.desc}</p>
      <div class="tick">✓ PICKED</div>
      <div class="soloonly">👤 SINGLE PLAYER ONLY</div>
    </div>`).join('');
  let pi = Math.max(0, PLACES.findIndex(p => p.id === place));
  // the bedroom is just for one player: in multiplayer it's greyed out and skipped
  const SOLO_ONLY = ['bedroom'], isMulti = () => !!(window.ronnieMP && window.ronnieMP.role);
  const okPlace = (i) => !(isMulti() && SOLO_ONLY.includes(PLACES[i].id));
  function drawPlace() {
    if (!okPlace(pi)) pi = PLACES.findIndex((p, i) => okPlace(i));
    place = PLACES[pi].id;
    $$('.scene', track).forEach((el, i) => el.classList.toggle('solo', !okPlace(i)));
    $$('.scene', track).forEach((el, i) => { el.classList.toggle('cur', i === pi); el.style.transform = `translateX(${(i - pi) * 104}%) scale(${i === pi ? 1 : 0.86}) rotate(${(i - pi) * 3}deg)`; el.style.opacity = Math.abs(i - pi) > 1 ? 0 : i === pi ? 1 : 0.5; });
    $$('#place-dots i').forEach((d, i) => d.classList.toggle('on', i === pi));
    if (!gameChoices(place).includes(mode)) mode = gameChoices(place)[0];
  }
  const stepPlace = (d) => { do { pi = (pi + d + PLACES.length) % PLACES.length; } while (!okPlace(pi)); drawPlace(); blip(440 + pi * 60, 0.05); };
  $('#place-prev').addEventListener('click', () => stepPlace(-1));
  $('#place-next').addEventListener('click', () => stepPlace(1));
  $('#place-dots').innerHTML = PLACES.map(() => '<i></i>').join('');
  $$('#place-dots i').forEach((d, i) => d.addEventListener('click', () => { pi = i; drawPlace(); blip(500, 0.05); }));
  let swiped = 0;
  track.addEventListener('click', (e) => { if (performance.now() - swiped < 400) return;     // (that was the end of a swipe, not a tap)
    const s = e.target.closest('.scene'); if (!s) return; const i = PLACES.findIndex(p => p.id === s.dataset.id); if (!okPlace(i)) { blip(200, 0.08, 'square', 0.06); return; } if (i !== pi) { pi = i; drawPlace(); blip(500, 0.05); } else { s.classList.remove('wiggle'); void s.offsetWidth; s.classList.add('wiggle'); blip(700, 0.06); } });
  // swipe: the cards follow your finger (or mouse), let go past a quarter of a card (or flick) to change place
  let sx = null, st = 0, drag = 0, pid = null;
  const follow = (dx) => { const wPx = track.getBoundingClientRect().width || 300;
    $$('.scene', track).forEach((el, i) => { const k = (i - pi) + dx / (wPx * 0.84); el.style.transition = 'none'; el.style.transform = `translateX(${k * 104}%) scale(${1 - Math.min(1, Math.abs(k)) * 0.14}) rotate(${k * 3}deg)`; el.style.opacity = Math.max(0, 1 - Math.abs(k) * 0.5); }); };
  const release = (dx) => { $$('.scene', track).forEach(el => { el.style.transition = ''; }); const wPx = track.getBoundingClientRect().width || 300, fast = Math.abs(dx) / Math.max(1, performance.now() - st) > 0.45;
    if (Math.abs(dx) > wPx * 0.25 || (fast && Math.abs(dx) > 25)) { swiped = performance.now(); stepPlace(dx < 0 ? 1 : -1); } else drawPlace(); };
  track.addEventListener('pointerdown', (e) => { sx = e.clientX; st = performance.now(); drag = 0; pid = e.pointerId; });
  track.addEventListener('pointermove', (e) => {
    if (sx !== null && e.pointerId === pid) { drag = e.clientX - sx; if (Math.abs(drag) > 8) { try { track.setPointerCapture(pid); } catch (er) {} follow(drag); return; } }
    if (e.pointerType !== 'mouse' || sx !== null) return;
    const cur = $('.scene.cur', track); if (!cur) return; const r = cur.getBoundingClientRect();          // a gentle 3D tilt that follows the mouse
    const tx = ((e.clientY - r.top) / r.height - 0.5) * -10, ty = ((e.clientX - r.left) / r.width - 0.5) * 12;
    cur.style.transform = `perspective(700px) rotateX(${tx}deg) rotateY(${ty}deg) scale(1.02)`;
  });
  const end = (e) => { if (sx === null || e.pointerId !== pid) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 8) { release(dx); swiped = performance.now(); } };
  track.addEventListener('pointerup', end);
  track.addEventListener('pointercancel', () => { if (sx === null) return; sx = null; release(drag); });
  track.addEventListener('pointerleave', (e) => { if (sx === null && e.pointerType === 'mouse') drawPlace(); });
  drawPlace();

  // ---------------------------------------------------------------- MODE: flip cards
  const grid = $('#mode-grid');
  function drawModes() {
    const pp = (m) => m.id !== 'eatoff' ? '' : `<div class="pp">${[1, 2].map(n => `<button data-pp="${n}" class="${cardOf(mode) === 'eatoff' && (mode === 'chonkoff2') === (n === 2) ? 'on' : ''}">${n === 1 ? '👤 1 PLAYER' : '👥 2 PLAYERS'}</button>`).join('')}</div>`;
    grid.innerHTML = MODES.filter(m => ok(m, place)).map((m, i) => {
      const sel = m.id === cardOf(mode);
      return `<div class="flip${sel ? ' sel' : ''}" data-id="${m.id}" style="animation-delay:${i * 0.05}s">
        <div class="face front"><span class="ico">${m.ico}</span><b>${m.name}</b>${pp(m) || '<small>tap for details</small>'}</div>
        <div class="face back"><b>${m.name}</b><p>${m.desc}</p><div class="meta"><span>${'🌶️'.repeat(m.stars)}</span><span>👤 ${m.who}</span></div>${pp(m)}<div class="pickit">${sel ? '✓ PICKED' : 'TAP TO PICK'}</div></div>
      </div>`;
    }).join('');
  }
  grid.addEventListener('click', (e) => {
    const c = e.target.closest('.flip'); if (!c) return;
    const m = MODES.find(m => m.id === c.dataset.id);
    const ppb = e.target.closest('[data-pp]');
    if (ppb) {                 // 1 or 2 players: picks the eat-off straight away
      const was = c.classList.contains('flipped');
      mode = ppb.dataset.pp === '2' ? 'chonkoff2' : 'chonkoff'; blip(ppb.dataset.pp === '2' ? 990 : 880, 0.08); drawModes();
      const nc = $(`.flip[data-id="eatoff"]`, grid); nc.classList.add('chosen'); if (was) nc.classList.add('flipped');
      return;
    }
    if (!c.classList.contains('flipped')) { $$('.flip.flipped', grid).forEach(f => f !== c && f.classList.remove('flipped')); c.classList.add('flipped'); blip(600, 0.05); return; }
    mode = m.id === 'eatoff' ? (mode === 'chonkoff2' ? 'chonkoff2' : 'chonkoff') : m.id; blip(880, 0.08); drawModes(); $(`.flip[data-id="${m.id}"]`, grid).classList.add('flipped', 'chosen');
  });

  // ---------------------------------------------------------------- READY: summary and the countdown
  function drawReady() {
    const p = PLACES.find(x => x.id === place), m = modeInfo(mode);
    $('#ready-place').innerHTML = `<span class="lbl">📍 PLACE</span><span>${p.ico}</span><b>${p.name}</b>`;
    $('#ready-mode').innerHTML = `<span class="lbl">🎮 GAME MODE</span><span>${m.ico}</span><b>${m.name}</b>`;
    $('#ready-desc').textContent = m.desc;
  }

  // ---------------------------------------------------------------- SQUAD: meet everyone
  const roster = $('#roster');
  roster.innerHTML = SQUAD.map((s, i) => `
    <div class="mate" data-i="${i}" style="--c:${s.c};animation-delay:${i * 0.04}s">
      <div class="face-badge"><img src="./assets/portraits/${s.img || s.n.toLowerCase()}.webp" alt="${s.n}" loading="lazy" draggable="false"></div><b>${s.n}</b>
      <div class="atk">${s.a} ${s.t}</div>
    </div>`).join('');
  const quote = $('#mate-quote');
  roster.addEventListener('click', (e) => {
    const c = e.target.closest('.mate'); if (!c) return;
    const s = SQUAD[+c.dataset.i];
    $$('.mate', roster).forEach(m => { m.classList.add('settled'); m.classList.toggle('talk', m === c); });   // (settled: don't replay the pop-in when the highlight goes)
    quote.innerHTML = `<b style="color:${s.c}">${s.n}:</b> "${s.l}"<br><span>${s.a} Attack: ${s.t}</span>`;
    quote.classList.remove('on'); void quote.offsetWidth; quote.classList.add('on');
    blip(300 + (+c.dataset.i) * 40, 0.07, 'triangle', 0.08);
  });

  // ---------------------------------------------------------------- SOLO OR MULTIPLAYER
  // Multiplayer: pick who you are, then host (you choose the place and game for everyone) or join with a code
  // (you wait for the host, and go wherever they've picked).
  const CHARS = [{ id: 'ronnie', n: 'Ronnie', c: '#ffd400', a: '🍔', t: 'The man himself', img: 'ronnie' }].concat(SQUAD.map(s => ({ id: (s.img || s.n.toLowerCase()).replace(/ /g, ''), n: s.n, c: s.c, a: s.a, t: s.t, img: s.img || s.n.toLowerCase() })));
  let mpChar = 'ronnie'; try { mpChar = localStorage.getItem('rs_mp_char') || 'ronnie'; } catch (e) {}
  const mp = window.ronnieMP = { role: null, net: null, char: () => CHARS.find(c => c.id === mpChar) || CHARS[0] };
  $('#pick-solo').addEventListener('click', () => { mp.role = null; if (mp.net) { mp.net.leave(); mp.net = null; } $('#mp-code-chip').textContent = ''; drawPlace(); show('place'); });
  $('#pick-multi').addEventListener('click', () => { show('mpname'); setTimeout(() => { try { $('#mp-myname').focus(); } catch (e) {} }, 450); });
  const cgrid = $('#char-grid');
  cgrid.innerHTML = CHARS.map((s, i) => `<div class="mate${s.id === mpChar ? ' sel' : ''}" data-id="${s.id}" style="--c:${s.c};animation-delay:${i * 0.03}s">
      <div class="face-badge">${s.img ? `<img src="./assets/portraits/${s.img}.webp" alt="${s.n}" draggable="false">` : '<span style="font-size:44px">🍔</span>'}</div><b>${s.n}</b><div class="atk">${s.a} ${s.t}</div></div>`).join('');
  cgrid.addEventListener('click', (e) => { const c = e.target.closest('.mate'); if (!c) return; mpChar = c.dataset.id; try { localStorage.setItem('rs_mp_char', mpChar); } catch (er) {} $$('.mate', cgrid).forEach(m => m.classList.toggle('sel', m === c)); blip(400, 0.07, 'triangle', 0.08); });
  // the name step: you can't carry on without one
  const nameNext = () => {
    const i = $('#mp-myname'), nm = (i.value || '').trim();
    if (!nm) { i.classList.remove('need'); void i.offsetWidth; i.classList.add('need'); $('#name-msg').textContent = 'Type your name first!'; i.focus(); blip(200, 0.1, 'square', 0.08); return; }
    $('#name-msg').textContent = ''; nameOf(); i.blur(); $('#char-hello').textContent = `Hi ${nm.toUpperCase()}! Who are you playing as? (They won't be in the game as well)`; show('mpchar');
  };
  $('#name-next').addEventListener('click', nameNext);
  $('#mp-myname').addEventListener('keydown', (e) => { if (e.key === 'Enter') nameNext(); });
  $('#mp-myname').addEventListener('input', () => { $('#name-msg').textContent = ''; $('#mp-myname').classList.remove('need'); });
  $('#char-next').addEventListener('click', () => {
    if (!($('#mp-myname').value || '').trim()) { show('mpname', -1); return; }
    $('#mp-who').textContent = `You're playing as ${mp.char().n}`; show('mp'); });
  const mpStatus = (h) => { $('#mp-status2').innerHTML = h; };
  let myName = ''; try { myName = localStorage.getItem('rs_mp_name') || ''; } catch (e) {}
  $('#mp-myname').value = myName;
  const nameOf = () => { const n = ($('#mp-myname').value || '').trim().slice(0, 12) || myName || mp.char().n; try { localStorage.setItem('rs_mp_name', n); } catch (e) {} return n; };
  const esc = (t) => String(t).replace(/[<>&"]/g, '');
  // the room: everyone in it, their name and who they're playing as; a free slot for each space left
  const lobby = () => {
    if (!mp.net) return;
    const me = { name: nameOf(), char: mpChar, host: mp.net.host, me: true };
    const ps = [me, ...mp.net.players.values()];
    $('#room-code').textContent = mp.net.code;
    $('#room-players').innerHTML = ps.map(p => { const c = CHARS.find(x => x.id === p.char) || CHARS[0];
      return `<div class="rp" style="--c:${c.c}">${c.img ? `<img src="./assets/portraits/${c.img}.webp" alt="">` : '<div class="em">🍔</div>'}<b>${esc(p.name || '...')}</b><small>as ${c.n}</small>${p.host ? '<span class="tag">HOST</span>' : ''}${p.me ? '<span class="tag" style="background:#39ff14">YOU</span>' : ''}</div>`; }).join('')
      + Array.from({ length: Math.max(0, 6 - ps.length) }, () => '<div class="rp empty"><div class="em">➕</div><small>free space</small></div>').join('');
    $('#room-go').style.display = mp.net.host ? '' : 'none';
    $('#room-msg').textContent = mp.net.host ? (ps.length > 1 ? 'Everyone\'s in? Choose where you\'re playing.' : 'Tell your mates the code. Start when everyone\'s in.') : 'Waiting for the host to choose the game…';
  };
  async function mpConnect(code) {
    const { Net, RELAY } = await import('./net.js');
    if (mp.net) mp.net.leave();
    const net = mp.net = new Net(); net.char = mpChar;
    const relay = q.get('relay') || RELAY;
    const w = await net.connect(code, nameOf(), relay);
    // everyone says who they're playing as; a new arrival gets told by everyone already in
    const hi = (to) => net.send({ t: 'hi', to, name: nameOf(), char: mpChar });
    net.on.hi = (m, p) => { if (p) { p.char = m.char; p.name = m.name; } lobby(); };
    net.on.join = (m) => { hi(m.id); lobby(); }; net.on.leave = () => lobby(); net.on.host = () => lobby();
    hi(); return w;
  }
  $('#mp-host2').addEventListener('click', async () => {
    const { newCode } = await import('./net.js'); const code = newCode();
    mpStatus('Setting up your room…');
    try { await mpConnect(code); mp.role = 'host'; $('#mp-code-chip').textContent = `👥 ROOM ${code}`; mpStatus(''); show('room'); lobby();
    } catch (e) { mpStatus("Couldn't connect. Check your internet and try again."); }
  });
  $('#room-go').addEventListener('click', () => { drawPlace(); show('place'); });
  $('#room-leave').addEventListener('click', () => { if (mp.net) mp.net.leave(); mp.net = null; mp.role = null; $('#mp-code-chip').textContent = ''; show('mp', -1); });
  $('#mp-code2').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  $('#mp-join2').addEventListener('click', async () => {
    const code = ($('#mp-code2').value || '').toUpperCase().trim();
    if (!/^[A-Z0-9]{4}$/.test(code)) { mpStatus('Type the 4-letter code your mate gave you.'); return; }
    mpStatus('Connecting…');
    try { const w = await mpConnect(code); mp.role = 'join';
      if (w.host) { mpStatus(`Nobody's in room <b>${code}</b> yet. Check the code with your mate.`); mp.net.leave(); mp.net = null; mp.role = null; lobby(); return; }
      mpStatus(''); show('room'); lobby();
      mp.net.on.setup = (m) => { place = m.place; mode = m.mode; $('#room-msg').textContent = 'Off we go!'; window.__menuGo(true); };
    } catch (e) { mpStatus("Couldn't connect. Check your internet and try again."); }
  });

  // ---------------------------------------------------------------- HOW: tabs (opens on your device's tab)
  const pickTab = (id) => {
    $$('.tabs button').forEach(x => x.classList.toggle('on', x.dataset.p === id));
    $$('.howpane').forEach(p => p.classList.toggle('on', p.dataset.p === id));
  };
  $$('.tabs button').forEach(b => b.addEventListener('click', () => { pickTab(b.dataset.p); blip(560, 0.05); }));
  const touchy = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
  pickTab(touchy ? 'flat' : 'pc');
  try { if (navigator.xr && navigator.xr.isSessionSupported) navigator.xr.isSessionSupported('immersive-vr').then(v => { if (v) pickTab('vr'); }).catch(() => {}); } catch (e) {}

  // ---------------------------------------------------------------- start the game
  window.ronnieMenu = new Promise((resolve) => {
    let going = false;
    const go = (instant) => {
      if (going) return; going = true;
      try { localStorage.setItem('rs_menu', JSON.stringify({ place, mode })); } catch (e) {}
      if (window.ronnieMP && window.ronnieMP.role === 'host' && window.ronnieMP.net) window.ronnieMP.net.send({ t: 'setup', place, mode });   // everyone waiting in the lobby comes too
      const finish = () => {
        start.classList.add('gone');
        if (window.ronnieHero) window.ronnieHero.stop();
        document.body.classList.add('ready');
        const p = PLACES.find(p => p.id === place), m = modeInfo(mode);
        const tag = document.getElementById('ready-tag'); if (tag) tag.textContent = `${p.name} · ${m.name}`;
        resolve({ place, mode });
      };
      if (instant !== true) chompSfx();
      // straight away: the button squashes and a loading screen comes up (with its own animation), THEN the
      // heavy level-building starts, so the screen never just freezes on you
      const ls = document.getElementById('loadscreen');
      if (ls) {
        const p = PLACES.find(p => p.id === place), m = modeInfo(mode);
        $('#ls-place').textContent = `${p.ico} ${p.name} · ${m.name}`;
        const HINTS = ['Tip: tap the 🏃 SPRINT button to go faster', 'Tip: grab food and press EAT', 'Tip: THROW food at Tommy. He deserves it.', 'Tip: in VR, click the left stick to sprint', 'Ronnie is warming up his jaw…'];
        $('#ls-hint').textContent = HINTS[Math.floor(Math.random() * HINTS.length)];
        ls.classList.add('on');
      }
      $('#go').classList.add('pressed');
      // (in the headset the page's own animation frames are paused, so don't wait for one: that's why PLAY did nothing in VR)
      if (window.ronnieHero && window.ronnieHero.inVR) setTimeout(finish, 60);
      else requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(finish, 60)));
    };
    $('#go').addEventListener('click', () => go());
    window.__menuGo = go;
    // the floating menu in VR (see ronnieHero.js) picks with these
    window.menuVR = {
      info: () => ({ place: PLACES.find(p => p.id === place).name, mode: modeInfo(mode).name }),
      step(kind, d) {
        if (kind === 'place') { stepPlace(d); drawModes(); return; }
        const list = gameChoices(place); const i = list.indexOf(mode);
        mode = list[(i + d + list.length) % list.length]; blip(880, 0.08); drawModes();
      },
      play: () => go(),
    };
    // see him in VR before you play
    const tvr = $('#title-vr');
    if (tvr) {
      tvr.addEventListener('click', () => {
        const h = window.ronnieHero;
        if (!h || !h.enterVR) { tvr.textContent = 'LOADING RONNIE…'; return; }
        h.enterVR().catch(err => { tvr.textContent = 'VR FAILED: ' + err.message; });
      });
    }
    if (q.get('go')) { window.bootDone(); go(true); }
    // coming back from a level ("Change place or mode"): jump straight to picking
    // otherwise always open on the title screen, and tidy the address bar
    else if (location.search) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
  });
  const back = () => { location.href = location.pathname; };   // back to the title screen
  document.getElementById('back-menu').addEventListener('click', back);
  // keyboard: arrows on the place screen, Enter to go on
  document.addEventListener('keydown', (e) => {
    if (start.classList.contains('gone')) return;
    if (current === 'place' && e.key === 'ArrowRight') stepPlace(1);
    if (current === 'place' && e.key === 'ArrowLeft') stepPlace(-1);
    if (e.key === 'Enter') { const nxt = { title: 'place', place: 'mode', mode: 'ready' }[current]; if (nxt) show(nxt); else if (current === 'ready') $('#go').click(); }
  });
})();
