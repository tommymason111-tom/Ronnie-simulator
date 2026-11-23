// the game's version (bump this with each release)
var GAME_VERSION = '2.31.35';
// when each update came out (UK time)
var GAME_WHEN = {'2.31.35': '2026-11-26T07:00', '2.31.34': '2026-11-26T04:00', '2.31.33': '2026-11-26T01:00', '2.31.32': '2026-11-25T23:30', '2.31.31': '2026-11-25T22:00', '2.31.30': '2026-11-25T21:00', '2.31.29': '2026-11-25T19:00', '2.31.28': '2026-11-25T17:30', '2.31.27': '2026-11-25T16:30', '2.31.26': '2026-11-25T16:00', '2.31.25': '2026-11-25T10:00', '2.31.24': '2026-11-24T21:00', '2.31.23': '2026-11-24T18:00', '2.31.22': '2026-11-24T14:00', '2.31.21': '2026-11-24T10:00', '2.31.20': '2026-11-23T22:00', '2.31.19': '2026-11-23T19:00', '2.31.18': '2026-11-23T17:00', '2.31.17': '2026-11-23T15:00', '2.31.16': '2026-11-23T13:30', '2.31.15': '2026-11-23T12:00', '2.31.14': '2026-11-23T10:30', '2.31.13': '2026-11-23T09:00', '2.31.12': '2026-11-23T05:30', '2.31.11': '2026-11-23T04:30', '2.31.10': '2026-11-23T03:00', '2.31.9': '2026-11-23T01:30', '2.31.8': '2026-11-23T00:30', '2.31.7': '2026-11-22T22:30', '2.31.6': '2026-11-22T21:30', '2.31.5': '2026-11-22T20:30', '2.31.4': '2026-11-22T19:30', '2.31.3': '2026-11-22T18:30', '2.31.2': '2026-11-22T17:00', '2.31.1': '2026-11-22T15:00', '2.31.0': '2026-11-22T13:00', '2.30.1': '2026-11-22T10:00', '2.30.0': '2026-11-22T08:00', '2.29.2': '2026-11-22T05:00', '2.29.1': '2026-11-22T03:00', '2.29.0': '2026-11-22T01:00', '2.28.2': '2026-11-21T21:00', '2.28.1': '2026-11-21T20:00', '2.28.0': '2026-11-21T19:00', '2.27.11': '2026-11-21T17:00', '2.27.10': '2026-11-21T16:00', '2.27.9': '2026-11-21T14:30', '2.27.8': '2026-11-21T14:00', '2.27.7': '2026-11-21T12:00', '2.27.6': '2026-11-20T21:00', '2.27.5': '2026-11-20T17:30', '2.27.4': '2026-11-20T16:00', '2.27.3': '2026-11-20T12:00', '2.27.2': '2026-11-20T09:00', '2.27.1': '2026-11-20T03:00', '2.27.0': '2026-11-20T01:00', '2.26.2': '2026-11-19T23:00', '2.26.1': '2026-11-19T22:30', '2.26.0': '2026-11-19T22:00', '2.25.1': '2026-11-19T21:30', '2.25.0': '2026-11-19T21:00', '2.24.9': '2026-11-19T18:00', '2.24.8': '2026-11-19T17:00', '2.24.7': '2026-11-19T16:00', '2.24.6': '2026-11-19T14:00', '2.24.5': '2026-11-19T12:00', '2.24.4': '2026-11-19T04:00', '2.24.3': '2026-11-19T03:00', '2.24.2': '2026-11-19T02:00', '2.24.1': '2026-11-19T01:00', '2.24.0': '2026-11-19T00:00', '2.23.9': '2026-11-18T23:00', '2.23.8': '2026-11-18T22:00', '2.23.7': '2026-11-18T21:00', '2.23.6': '2026-11-18T20:00', '2.23.5': '2026-11-18T19:00', '2.23.4': '2026-11-18T17:00', '2.23.3': '2026-11-18T16:00', '2.23.2': '2026-11-18T15:00', '2.23.1': '2026-11-18T14:00', '2.23.0': '2026-11-18T10:00', '2.22.33': '2026-11-18T01:00', '2.22.32': '2026-11-18T00:00', '2.22.31': '2026-11-17T23:00', '2.22.30': '2026-11-17T22:00', '2.22.29': '2026-11-17T21:00', '2.22.28': '2026-11-17T20:00', '2.22.27': '2026-11-17T19:00', '2.22.26': '2026-11-17T18:00', '2.22.25': '2026-11-17T17:00', '2.22.24': '2026-11-17T16:00', '2.22.23': '2026-11-17T14:00', '2.22.17': '2026-11-17T02:30', '2.22.16': '2026-11-17T00:30', '2.22.15': '2026-11-16T22:00', '2.22.14': '2026-11-16T20:30', '2.22.13': '2026-11-16T19:30', '2.22.12': '2026-11-16T18:00', '2.22.11': '2026-11-16T16:20', '2.22.10': '2026-11-16T15:40', '2.22.9': '2026-11-16T15:00', '2.22.8': '2026-11-16T13:40', '2.22.7': '2026-11-16T12:30', '2.22.6': '2026-11-16T09:30', '2.22.5': '2026-11-16T07:15', '2.22.4': '2026-11-16T03:45', '2.22.3': '2026-11-16T03:00', '2.17.0': '2026-11-15T23:59', '2.16.1': '2026-11-15T23:55', '2.16.0': '2026-11-15T23:30', '2.15.0': '2026-11-15T21:30', '2.14.0': '2026-11-15T20:24', '2.13.0': '2026-11-15T19:42', '2.12.0': '2026-11-15T19:05', '2.11.0': '2026-11-15T17:55', '2.10.0': '2026-11-15T17:10', '1.4.0': '2026-11-14T18:10', '1.5.0': '2026-11-14T19:04', '1.5.1': '2026-11-14T19:28', '1.5.2': '2026-11-14T19:32', '1.5.3': '2026-11-14T19:36', '1.5.4': '2026-11-14T19:46', '1.5.5': '2026-11-14T19:59', '1.5.6': '2026-11-14T21:33', '1.5.7': '2026-11-14T21:42', '1.5.8': '2026-11-14T22:20', '1.5.9': '2026-11-14T23:17', '1.6.0': '2026-11-15T08:50', '1.6.1': '2026-11-15T08:56', '1.6.2': '2026-11-15T08:57', '1.6.3': '2026-11-15T09:04', '1.6.4': '2026-11-15T09:06', '1.6.5': '2026-11-15T09:08', '1.6.6': '2026-11-15T09:10', '1.7.0': '2026-11-15T09:44', '1.7.1': '2026-11-15T09:50', '1.7.2': '2026-11-15T09:53', '1.7.3': '2026-11-15T10:00', '1.7.4': '2026-11-15T10:02', '1.8.0': '2026-11-15T11:15', '1.8.1': '2026-11-15T11:33', '1.8.2': '2026-11-15T11:39', '1.8.3': '2026-11-15T11:43', '1.8.4': '2026-11-15T11:47', '1.8.5': '2026-11-15T11:52', '1.8.6': '2026-11-15T11:53', '1.9.0': '2026-11-15T12:24', '1.9.1': '2026-11-15T12:25', '2.0.0': '2026-11-15T13:53', '2.0.1': '2026-11-15T14:11', '2.0.2': '2026-11-15T14:15', '2.1.0': '2026-11-15T14:21', '2.2.0': '2026-11-15T14:33', '2.9.0': '2026-11-15T16:54', '2.8.0': '2026-11-15T16:45', '2.7.0': '2026-11-15T16:34', '2.6.3': '2026-11-15T16:15', '2.6.2': '2026-11-15T16:15', '2.6.1': '2026-11-15T16:00', '2.6.0': '2026-11-15T15:54', '2.5.3': '2026-11-15T15:48', '2.5.2': '2026-11-15T15:46', '2.5.1': '2026-11-15T15:43', '2.5.0': '2026-11-15T15:42', '2.4.4': '2026-11-15T15:17', '2.4.3': '2026-11-15T15:15', '2.4.2': '2026-11-15T15:13', '2.4.1': '2026-11-15T15:10', '2.4.0': '2026-11-15T15:04', '2.3.0': '2026-11-15T14:44'};

// what's new (newest first) — shown under the settings cog
var GAME_UPDATES = [
  ['2.31.35', ["🎯 Search & Destroy: bots fill every empty slot so teams are always full, nine food guns with recoil, reloads, aiming and sidearms, a dinner money shop, a scoreboard, a death recap, and much more detail on the sites, the bomb and the effects"]],
  ['2.31.34', ["🔧 Checked every way a game loads (solo, rooms, the test room, VR, every mode after every mode) for crashes; characters are built with less wasted memory while a level loads"]],
  ['2.31.33', ["⚠ If your phone closes the game, the title screen now says what it was doing (and the last error), so it can be passed on", "💣 Search & Destroy: the READY card shows the & again, and in developer mode the >_ DEV button no longer covers GUNS"]],
  ['2.31.32', ["💣 NEW MODE: Search & Destroy on the pub, Lidl and Lewis's. THE GREASY SPOONS v THE SALAD DODGERS: plant or defuse THE VINDALOO, no respawns, first to 4", "🌭 Pick a gun every round: Ketchup Blaster, Baked Bean Shotgun, Sausage Sniper, Squirty Cheese SMG, MONSTOR AR or the Gravy Gatling. Health, armour, reloads and headshots", "🍔 Ammo, burgers, kebabs, stab vests and perks hidden round the map. Solo with squad bots or up to 12 in a room"]],
  ['2.31.31', ["🤫 Date Night: no more Tommy (or the lads at the other tables) chatting in the background. Only Chloe and whoever's in the film talk", "🕯️ La Grande Portion is single player only now"]],
  ['2.31.30', ["🍺 Run the Pub punters are far more detailed (clothes, hair, bellies, red noses, hen parties) with about ten times the moves: proper fights, arguments you can calm down, and sing-songs that spread round the tables", "🪑 Everyone sits properly on every chair, sofa and bench, feet on the floor and arms on the table", "🎤 Dylan's attack is now full-passion Oasis: mic stand, tambourine, down on his haunches for the big note, pointing right at you"]],
  ['2.31.29', ["💘 Date Night rebuilt: 31 films, twice as many, with more acting and camera moves. The story starts straight away and you can't skip it", "🪑 You stay sat at the table at Chloe's eye level (look around, no walking); the game takes you to the loo or outside when it needs to", "🎮 Every Date Night game has a GET READY card, simpler buttons and rounds that get harder (new: wine tasting, chef's spoons, fire alarm, power cut, Darren the ex, Mum rings, Noah's scrum and more)"]],
  ['2.31.28', ["🥊 Ian's Barbecue: Ian's a big lad now. Hit him 10 to 15 times (slaps, punches, thrown food) to knock him over. Pushing him off or barging him counts as 3 hits"]],
  ['2.31.27', ["🔧 Fixed the dev test room's test players"]],
  ['2.31.26', ["🔪 Imposter kills are a knife now: two quick stabs", "🔥 Ian's Barbecue: Ian comes for you faster and sooner; knock him over FIVE times to win; force-fed three times and it's game over", "🧾 The end of a game: the receipt stays put, and the FPS / PING readout's moved off the buttons", "🛒 Lidl plays quiet supermarket radio; the pub, the garden and the house have their own quiet background", "🍺 Run the Pub's TO DO and ORDERS don't flicker", "🙋 You don't see your own character's hand while you eat", "🫙 Multiplayer: Lewis's jug (and everyone's props) stay in their hands, not on the pub floor", "🤖 Dev test room: the test players vote and ready up straight away"]],
  ['2.31.25', ["🗳️ Imposter: in a meeting, PAUSE, CHAT and VOICE work over the vote screen, so you can talk it over"]],
  ['2.31.24', ["🎬 Date Night is now a night of little films with Chloe: she looks away (cram it in before she turns back), the waiter (Ben's secret order, the dessert trolley, the napkin trick), Chloe goes to the loo (raid the restaurant and get back in time), and the lads come over (Harry's dating disasters, Oliver's camera, Aidan and Connor's shell game, Dylan's Wonderwall, Ethan's free kick). Get caught and she has words"]],
  ['2.31.23', ["🔥 Ian's Barbecue is a new game: Ian cooks, then comes after you with a 'healthy' burger or hot dog. He asks, then insists, then FORCES it: TAP TAP TAP to fight him off. Eat junk to get big enough to knock him over (STAGE 3), or walk straight through him (STAGE 5). Three knock-downs and he gives up"]],
  ['2.31.22', ["📱 Going off the game for a moment and coming back works properly: hosting comes back to you, the food's still there, and the sound comes back", "🏃 Multiplayer: your own body no longer trails behind you (walking backwards you could see it)", "👊 Boss Fight: punch the boss up close (a little damage; thrown food's still the big hitter)", "🎲 GAME MODE and RESTART are on everyone's pause menu (a guest's asks the host), and RESTART's in SETTINGS too", "🧾 LAST RECEIPT in the pause menu: look at the last game's receipt again", "🛒 Sweep: see everyone's trolleys in multiplayer; an opened Lidl bag disappears", "🎸 Dylan's attack always lands, even straight after his last one"]],
  ['2.31.21', ["👥 The room chip (players · code) sits at the top in the middle, level with PAUSE, CHAT and VOICE (on an upright phone, just under them)"]],
  ['2.31.20', ["💥 New attack cards: every squad member's attack has its own card, look and entrance (Dylan's gig ticket, Ben's boarding pass, Oliver's Polaroid with a real flash, Aidan's pint...)", "🎯 Multiplayer: the card says who's getting it (OLIVER ➜ BETH), and a target floats over their head", "👻 Imposter: WATCH locks on to them and you swing the camera round them", "🔄 RESTART ROUND is in SETTINGS too; guests can ASK FOR A RESTART", "🍽️ Run the Pub: one number per table"]],
  ['2.31.19', ["🔪 Imposter: a body is now the character that got killed, laid out on the floor (your own too, and Ronnie: it was a blue blob). The white outline stays on top of the blood as you walk up to it"]],
  ['2.31.18', ["🎰 Prop Hunt: no more picking what you hide as. When the host presses START, a fruit machine reel spins through the map's things and deals you one. Don't fancy it? SWAP spins again: two swaps a round, the red number on the button shows how many you've got left"]],
  ['2.31.17', ["🤖 Developer mode's test room: if your phone closed the game last time (\"A problem repeatedly occurred\"), the room now says what the game was doing when it happened (which menu, which loading step, or playing, and how many fake players), and so does the crash report"]],
  ['2.31.16', ["🍺 Run the Pub: tap the ORDERS or TO DO heading to fold that list away (it shows how many are in it), and again to open it. Your phone remembers", "👹 Boss Fight: little YOUR HEALTH and YOUR POWER labels over your hearts and your power", "🛠️ Developer mode no longer turns into a normal free roam when the page reloads itself for an update on the way in"]],
  ['2.31.15', ["🍺 Run the Pub on an upright phone: TO DO and ORDERS sit side by side under your box, in short form (ORDERS shows three drinks and how many more are waiting; TO DO shows each problem and just the step you're on), and they never come further down than about a third of the screen, so the middle and its banners stay clear. Speech bubbles keep out of their way too"]],
  ['2.31.14', ["🍔 Boss Fight food is twice the size: ammo for a giant, easy to spot, grab and hit with. In your hand on a phone it's its usual size (so it doesn't cover the screen), and big again the moment you throw it"]],
  ['2.31.13', ["👹 The Boss Fight's big entrance: when you're playing as one of the squad, your own body (and anyone stood right by the camera) is left out of the shot. It used to fill the screen with the back of your own character"]],
  ['2.31.12', ["🧱 A small fix to the last update: someone moved to a new spot straight away (sat down, put at a till) doesn't remember which side of the furniture they were last on"]],
  ['2.31.11', ["📱 Upright phones, every game checked: Run the Pub's TO DO list no longer covers the bottom of its box; the little labels in the corner box are big enough to read (if they don't all fit, the least important are left off); the fps number only shows in a headset or developer mode; Free Roam's box just counts what you've eaten; speech bubbles at the edge of the screen slide in so none of their words are cut off"]],
  ['2.31.10', ["💬 Pop-ups don't pile up any more: the eating words, the +numbers and the combos replace each other instead of stacking, and slide clear of the eat meter and the banner. The attack card comes first (the banner and the hint step aside for it), and speech bubbles rise over anything in the way or wait until there's room. The attack card now shrinks away where it is instead of flying up through the eat meter"]],
  ['2.31.9', ["🏓 You have to be stood by something to press it now: ping pong and darts (about 2m), the fruit machines, the lightbox sign, the music buttons and Run the Pub's bar stations. From further away it tells you to walk up to it"]],
  ['2.31.8', ["🤖 Developer mode's test room: it no longer drops you on the title screen. The update check could reload the page part-way through setting it up; now the room still opens (and an update while you're in a room takes you straight back into it)", "🤕 Knocked someone over? They get up and WALK back to their seat, till or job (they used to vanish straight back into it, metres away). They step into their seat smoothly, don't pop through benches any more, and don't attack you the second they're up"]],
  ['2.31.7', ["⚙️ Settings always fits the screen with every button showing: the update notes scroll in their own box, so DEVELOPER MODE isn't hidden under CLOSE any more. On a phone on its side it's two columns (notes on the left, buttons on the right)"]],
  ['2.31.6', ["⏸ A menu open (pause, settings): nothing else shows. Prop Hunt's START, the touch controls, chat and voice used to show through the pause menu, and PLAY round the title screen's settings", "👹 Boss Fight on a phone: the boss's card is one tidy row (face, name, hearts, power, phase) over the health bar; the danger warning and the boss's quotes take turns instead of stacking; no EMOTE button or room details in the fight; the chat lines never sit on SPRINT"]],
  ['2.31.5', ["🍫 Lidl: the chocolate and sweets by every till were floating in mid-air in front of their stand. They sit on proper shelves now (a ledge, brackets, and the coloured price rail along the front)"]],
  ['2.31.4', ["🖼️ HOW TO PLAY pictures: Prop Hunt, Boss Fight, Imposter and Free Roam pages were blank boxes on an iPhone (it won't draw a really big emoji). They all show now, and Prop Hunt and the Boss Fight have proper pictures of their own (the toy gun, the taunts, the boss's slams and charges, your hearts)", "🔫 Prop Hunt's SEEKING page explains the toy gun: 4 hits and a hider's found"]],
  ['2.31.3', ["📱 Phone fixes: the lobby's WHO'S READY list no longer runs off the left of the screen; the leaderboards' tabs all show (on a phone on its side the last row was cut off); settings' CLOSE sits on a solid bar; in a room, the chat box opens under the round icons instead of on top of them"]],
  ['2.31.2', ["🔘 A game ending while you were in a menu (like WEATHER & TIME) left PLAY AGAIN and RETURN TO LOBBY over the menu's buttons: the menu now closes for the receipt, and can't open over a finished game. A new test presses every button on every screen on a phone, both ways up"]],
  ['2.31.1', ["📱 A tidier phone screen: PAUSE, CHAT and VOICE are one row of round icons in the corner (with the room chip, on its side), the Boss Fight has no top-left box (its big health bar says it all), and nothing sits on anything else in any mode", "🛒 Supermarket Sweep and The Whole Squad don't say the same thing twice (the trolley box / the NEXT ATTACK bar)"]],
  ['2.31.0', ["🚶 MULTIPLAYER WARM-UP: everyone goes into the map first and can walk about (no clock, no attacks, no boss yet). The host gets a big ▶ START button (and one in the pause menu, for headsets); everyone else waits for it. Anyone who joins late lands in the warm-up too", "💬 Chat counts: a red number on the CHAT button shows how many messages you haven't read, in the lobby (even while the host's choosing the game) and in the game"]],
  ['2.30.1', ["🤖 Developer mode's test room opens every time: it no longer drops you on the title screen if the page reloads on the way, it says what it's doing while it sets up, and if it can't connect it tells you why with a TRY AGAIN button"]],
  ['2.30.0', ["🤖 DEVELOPER MODE: a new 👥 MULTIPLAYER page. Pick how many fake players (1 to 11) and open a test room: they join a real room with you, ready up, walk about and play along in every mode (hide and seek in Prop Hunt, jobs, kills and votes in Imposter, chipping at the boss). Add or take them away from the lobby's green bar"]],
  ['2.29.2', ["📱 A phone on its side: the place cards fit (the picture was cut off at the top and the little floating props sat on the place's name)", "👹 The Boss Fight's health bar hides while the pause menu's open (it showed on top of it)"]],
  ['2.29.1', ["📝 No more cut-off text: the big banner at the start of a game goes onto two lines when it's long (Lidl's 'DODGE OLIVER & AIDAN W' ran off the sides) and always fits the screen", "📱 A phone on its side: the READY screen's two cards sit side by side so LET'S EAT doesn't cover the game mode; the page dots don't sit on text", "⏸ The NEXT ATTACK bar and other notices hide while the pause menu's open (they showed on top of it); in the Boss Fight, hints go under the boss's health bar"]],
  ['2.29.0', ["🎮 Every mode only shows the buttons it uses: no EAT or THROW in Supermarket Sweep (you grab into the trolley), no EAT in Run the Pub unless there's a drink or the soda gun in your hand, and THROW is the big button in the Boss Fight", "📋 The box in the top left fits the mode: the clock, Chloe's BUSTED hearts and LOOKING!, food off the grill, the next attack; Supermarket Sweep shows your trolley and Boss Fight the boss's health, your hearts and power", "✨ Every popup looks better and moves better: a glassy card with a glow, a blurred backdrop, a smooth rise in and fade out (pause menu, settings, ready card, room sheets, chat, leaderboards, job screens, Imposter and Prop Hunt splashes...)"]],
  ['2.28.2', ["🔫 PROP HUNT: a new, much more detailed gun in proper dark gunmetal and black: red-dot sight, rail, slotted handguard, foregrip, curved mag, adjustable stock, flash hider, and just the orange toy safety tip for colour", "❤ Hiders have HEALTH now: each shot takes 25. Get hit and you're unlocked with a burst of speed: RUN! Lose them for 6 seconds and you heal back up"]],
  ['2.28.1', ["🔫 The Prop Hunt gun got a proper going-over: a pressure gauge and red filler cap on the tank, a hose, cooling vents and screws on the sides, a vented barrel shroud, a three-prong muzzle, a ridged pump, grippy handle, sights and a little 'armed' light"]],
  ['2.28.0', ["🔫 PROP HUNT: the seekers have GUNS now. Shoot anything that looks off from right across the room; three hits finds a hider. Everyone sees and hears every shot, and you can see the gun in the seekers' hands", "🎯 Shoot the real thing (a keg that's just a keg) and it still costs you 10 ❤. Hiders: you've been shot? MOVE!"]],
  ['2.27.11', ["🎮 CHOOSE THE GAME sits on its own bar along the bottom of the room, and the players scroll up clear of it (the bottom row was hidden behind it)"]],
  ['2.27.10', ["🔗 'Link copied!' in the room shows in its own little box and the players move down for it (it was hidden behind them)"]],
  ['2.27.9', ["🛠️ FIXED: in multiplayer, other players' characters could stop showing (an error from the last update)"]],
  ['2.27.8', ["🏐 FIXED: Tommy's final ball (and Noah's tackle) could knock you down twice, the second time right after you got up. One attack, one fall"]],
  ['2.27.7', ["🕺 Your emote's camera swings round to IN FRONT of you every time (looking down at food or up used to send it round the side or behind you). You face where you were looking and stay that way till it's done"]],
  ['2.27.6', ["👹 Boss Fight: the boss uses every one of its moves before repeating any (a quick fight could finish without you ever seeing the giant food throw)"]],
  ['2.27.5', ["🏠 The room's top bar (LEAVE, CHAT, INVITE, LINK, OPTIONS) goes right across the screen and stays at the top while you scroll the players"]],
  ['2.27.4', ["✋ Multiplayer: the host can't start a game until everyone's READY. START tells you who you're waiting for", "🔁 Changing the game, restarting or playing again in a room: everyone gets a READY card first, and the host starts it when everyone's in", "👀 Tap the players/ready count at the top of the room to see who hasn't readied up", "🏠 New room screen: the code and READY at the top, CHAT / INVITE / LINK / OPTIONS in the top-right corner, chat and options open with their own CLOSE", "📐 Nothing overlaps at the screen's edges any more (the room chip, chat, voice, orders, scores, the attack countdown all stack neatly)", "⚙️ The settings box scrolls and its CLOSE is always on screen (SOUND & FEEL used to push it off an iPhone)", "🗺️ Imposter map: fits every phone screen, and much more detail (floors, room icons, furniture)", "👆 The loading screen no longer swallows your first taps as it fades"]],
  ['2.27.3', ["🧊 FIXED: closing the pause menu (RESTART ROUND, RESUME...) could freeze the whole game so nothing could be pressed", "👆 Buttons on phones work the moment your finger lifts (they used to wait, or miss the tap altogether). LET'S EAT always starts the game, and stays on screen on a landscape phone", "⏸️ New pause menu: RESUME, then two columns of tiles (game mode, restart, character, voice chat, weather, settings) instead of a long list. Sound, sound & feel, controls and FPS are in SETTINGS. Every page's BACK stays on screen", "🛠️ The developer button steps aside while the pause menu's open (it was covering BACK)"]],
  ['2.27.2', ["👆 Picking who you are: a tap selects them straight away (it used to wait, or miss the tap if the list was still scrolling)"]],
  ['2.27.1', ["🔧 FIXED: mates joining (or coming back to) a room where a game's already going got stuck on 'waiting for the host'. They're now pulled straight into the game", "⚙️ Only the host sees the ROOM OPTIONS, behind a button", "💬 Lobby chat is a button too, with a red count of new messages"]],
  ['2.27.0', ["🎭 NEW: PROP HUNT (multiplayer, 2-12) at the pub, Lidl or Lewis's. Seekers count to 40 with their eyes shut while the hiders turn into a keg, a bin, a gnome, a trolley... and LOCK in. Check the wrong thing and it costs you health. Taunt for points (quack, kazoo, airhorn). Four rounds, teams swap, podium and awards", "🌦️ NEW: WEATHER & DAY AND NIGHT (pause menu → WEATHER & TIME). Sun, cloud, drizzle, rain, downpours, thunderstorms with lightning, fog, snow that settles, hail, gales and heatwaves; AUTO changes it every few minutes. The sun crosses the sky with the shadows following, golden sunsets, stars and moonlight, lamps lighting the ground and the pub windows glowing at night. Puddles, rain on the windows, thunder you hear after the flash. In multiplayer the host picks", "🐢 The belly's looks are made while the game loads, so growing never waits on a slow phone"]],
  ['2.26.2', ["🛠️ On a browser that can't do 3D, the loading screen says so clearly again (NO 3D ON THIS BROWSER, and what to try) instead of showing tips for ever"]],
  ['2.26.1', ["🗺️ Imposter map: every job's name sits on its own tag, kept clear of the other jobs and the room names (no more names written over each other), and your jobs count isn't hidden under CLOSE any more"]],
  ['2.26.0', ["👹 NEW: BOSS FIGHT (the pub's car park or Lewis's garden). A GIANT Noah, Lewis, Chloe or Tommy drops out of the sky. Three phases, every move marked on the floor first (get out of the red, get in the green), throw food at their head or the glowing weak spot, five hearts. On your own or everyone together", "🏆 The online leaderboards and RANKED EAT-OFF ratings are switched on", "🔊 The boss has a sound of its own for every move"]],
  ['2.25.1', ["🏆 Online leaderboards (the trophy on the title screen): your best eat-off, supermarket sweep and each Run the Pub night, with the name and character you play as online. Your rank goes on the receipt", "🏅 RANKED EAT-OFF in multiplayer (on the eat-off card): everyone in the room at once for 60 seconds, then placings and your online rating going up or down", "Voice chat: 🎙️ VOICE (under CHAT, and in the pause menu for VR) joins it; off until you press it. Who's talking glows on their name tag and down the side; the squad goes quiet while anyone's on it; a dropped line fixes itself", "Imposter: room options (kill cooldown, jobs each, meeting time, emergency meetings each, whether it says who was the imposter), a far more detailed map (every table and counter, your jobs named and numbered, a pulsing line to the nearest, a legend and how the team's doing), and a 🎬 BEST MOMENT replay at the end (the double kill, the crowd, slowed down for the kill)", "Sounds: a sound of its own for nearly everything (about 90 new): every Imposter job, things landing by what they're made of, a full drink sloshing, glass shattering, the tip jar, the awards drumroll and stamps, people joining and leaving the room"]],
  ['2.25.0', ["Physics feel: everything behaves like what it is. Fruit bounces and rolls off across the floor, burgers land with a squish and wobble back into shape, glasses and cans clunk down and stand up, magazines flutter, chairs thud. Heavy things don't throw as far, and thrown things tumble end over end. Hard landings kick up a puff of dust", "A punch, a smash or getting hit shakes the view a little (phone and computer only, never in VR; turn it off in SOUND & FEEL)", "New loading screen: the place's colours, the game's card, food going into a chomping mouth, the steps ticking off (THE SQUAD, THE PLACE, THE FOOD, GO!) and a new funny tip every few seconds. It fits landscape phones too", "End of a game: up to three funny AWARDS stamped onto your receipt one by one (HOOVER OF THE YEAR, COMBO KING, TOMMY'S NEMESIS, CLEAN SHEET, TV LICENCE REVOKED, HUMAN PUNCHBAG, COUCH POTATO, TIP MAGNET, THE BOUNCER... 25 in all). Do nothing and you get the participation medal", "Run the Pub: pick your night: 🌙 QUIET NIGHT (patient regulars), 🍺 FRIDAY NIGHT, or 🔥 CUP FINAL (rammed, impatient, kicking off, but big tips)", "Run the Pub: a TIP JAR on the bar next to the Guinness tap. Tips drop in as coins you can watch pile up, the label shows the total, the bar cheers every £10, and Lewis comes past 'borrowing' some for his car unless you're stood by it", "Name tags: their character's face, 👑 for the host, pips for how big they've got, connection bars, a green glow and a mic when they're talking (ready for voice chat), and bigger far away so you can still read them", "The multiplayer lobby: 📨 INVITE MATES (a link straight into your room: share it or copy it), ✋ I'M READY ticks, chat while you wait, and the host can remove someone or 🔒 lock the room", "Room options for the host: game length (short, normal, long), squad attacks (off, chill, normal, chaos), power-ups on or off, how much food, punching each other on or off, and max players"]],
  ['2.24.9', ["The eat meter fights back: every bite punches it, the bar slides up instead of jumping, and quick bites build a COMBO (NICE, GREEDY, UNSTOPPABLE, BOTTOMLESS, LEGENDARY) with a badge and a timer. Growing a size flashes the meter gold"]],
  ['2.24.8', ["Your phone buzzes when you do things (eating, grabbing, throwing, punching, getting hit, winning), each with its own feel; Quest controllers rumble too. Turn it off in SOUND & FEEL", "SOUND & FEEL (Settings and the pause menu): a volume for everything, the music, the squad talking, sound effects, the background and voice chat"]],
  ['2.24.7', ["Imposter: dead, you're a ghost like in Among Us. Float through walls and furniture anywhere in the pub, a bit quicker, and watch everyone. Other ghosts look see-through and pale blue; the living can't see any of you. You can still finish your jobs"]],
  ['2.24.6', ["The multiplayer room shows all 12 places (it showed 6 until more joined), with how many are in: 3 / 12 PLAYERS"]],
  ['2.24.5', ["Smoother with a full room: other players (and the squad) behind you or out of view aren't drawn any more. Before, every phone drew all eleven other players every frame, wherever it was looking. Everything you can see looks exactly the same"]],
  ['2.24.4', ["Multiplayer is less laggy: other players are drawn about 70ms behind on a good connection (was over 100ms), 150ms on 4G (was 190ms), and someone who stood still then set off is no longer half a second late", "Smooth through 4G hiccups: no more jumps when a phone's connection stalls for a moment and catches up", "Players turn round smoothly, and a phone player's hand stays with them as they turn"]],
  ['2.24.3', ["Multiplayer: other players' arms and bodies move smoothly. A body could be thrown metres for a frame after a hitch in someone's connection", "Phone players' arms come up to eat smoothly with the elbow bent (it swung straight up in a frame), and blend between walking and standing", "Hand-tracked fingers move smoothly between updates"]],
  ['2.24.2', ["Fixed: starting a new game while the graphics were still being prepared could throw an error"]],
  ['2.24.1', ["All the food of the same kind is drawn in one go (pub: ~120 draws down to ~30, Lidl ~160 to ~35), same picture", "Shadows and the squad's bodies are also warmed up before play (sunny places, and each character as their model loads): no first-time stutters there either"]],
  ['2.24.0', ["No more first-time stutters: every graphics program the game needs is built while the level loads (in the background), not the first time a power-up, an attack or an effect appears mid-game", "Programs stay built for the whole game (they were thrown away and built again when an effect came back)", "Checked in Chrome, Safari's engine and Firefox"]],
  ['2.23.9', ["A browser that can't show 3D now says so (and what to try) instead of sitting on LOADING for ever"]],
  ['2.23.8', ["Safari: if the 3D picture is lost (memory pressure), the game no longer tries to tidy up the old picture's pieces before it restarts"]],
  ['2.23.7', ["Fixed: a game that doesn't belong in a place (e.g. Run the Pub started from a multiplayer restart while you're in the bedroom) crashed its job board; it now starts that place's own game"]],
  ['2.23.6', ["Fixed: every Supermarket Sweep added ~100 more food to the shop, so playing again and again got slower and slower", "Fixed: after Run the Pub the pub had almost no food for minutes (it came back one a second); it's back in a couple of seconds", "Fixed: Lewis's waiter plate was left floating in the pub after every Run the Pub"]],
  ['2.23.5', ["Smoother on phones and headsets, same look: up to half as many draws per frame (shelf products, signs and food glows drawn together)", "Game logic about 3x quicker per frame (physics no longer checks things that can't move each other)", "No more freeze when Ronnie grows a size, or the first time a food turns up: they're made in quiet moments beforehand", "Fewer stutters when lots of people set off somewhere at once"]],
  ['2.23.4', ["Ben's trip to Turkey is quicker (12 seconds, was 20)", "On your own, the world stops while it plays: nobody walks about or talks behind it, the clock waits (in multiplayer everyone else carries on)"]],
  ['2.23.3', ["The squad only chats when you're near them, two at a time at most, so the whole pub isn't talking at once", "Voices are where people are again: they get quieter as you walk away and you can't hear anyone across the map (in multiplayer too)", "Tommy's bulge comment is gone"]],
  ['2.23.2', ["Fixed: if your phone or headset briefly lost its graphics (a dropped call, memory pressure), the game errored every frame before restarting; it now pauses drawing and restarts cleanly"]],
  ['2.23.1', ["Fixed: the game could get stuck on LOADING for ever on some loads (the page set up its 3D library in the wrong order)", "Multiplayer can't be knocked over by a bad message any more (from an old version, a bug, or someone messing about): it's checked and dropped", "Anything that ends up at an impossible position is put back, so it can't break the room", "The game now sends a short anonymous report when something goes wrong (no names or chat), so problems can be found and fixed"]],
  ['2.23.0', ["Up to 12 players in a room now (was 6)", "Drop out and come back to the same room and you're still you: same name, how big you got, what you'd eaten", "If the host leaves, the next player takes over; the original host can be handed it back", "Whoever grabs something owns it: throws and catches feel right for everyone", "FPS and ping in the pause menu; finger tracking shows for hand-tracked Quests", "Everyone needs this version to play together: the game updates itself when you open it"]],
  ['2.22.33', ["Developer mode straight into VR: the dev menu really does start closed now (B opens it)"]],
  ['2.22.32', ["VR menus: a button you point at is the one that gets pressed, even in developer mode (the DEV button no longer steals taps from the pause menu)"]],
  ['2.22.31', ["Developer mode in VR: the dev menu starts closed so you can walk about straight away; press B to bring it up"]],
  ['2.22.30', ["VR menus: no more dropped frame (and graphics error) when a menu page changes size mid-switch"]],
  ['2.22.29', ["VR menus: pressing a button always presses that button, even with the 3D Ronnie behind it"]],
  ['2.22.28', ["Same version as the 6-player game (this one already reconnects you after a dropout)"]],
  ['2.22.27', ["Removed the GAME MODES board from the walls: change the game from GAME MODE in the pause menu", "Eat-Off 2 players: after player 1, pause and pick EAT-OFF 2 PLAYERS for player 2"]],
  ['2.22.26', ["Watching your own emote: if a wall is in the way the camera goes round the other side (no more nose-to-nose with yourself by a wall), in VR and on phones"]],
  ['2.22.25', ["Menu buttons only buzz once you have touched the screen (no more browser warnings in VR)"]],
  ['2.22.24', ["Fixed the VR arm flailing for good: a physics bug sent VR arms swinging metres either side of the body (worst at 72/90fps), on your own body and everyone else's", "Other players' arms and bodies now move smoothly and in time, even on bad Wi-Fi or 4G: no shaking, no stutter, waves and punches come through at full size", "Players no longer jump about when they walk past tables and chairs"]],
  ['2.22.23', ["VR main menu is now the same as on phones and computers: RONNIE SIMULATOR, PLAY, Meet the Squad and How to Play, then Solo or Multiplayer, and you swipe through the places and modes", "Tommy's back to his original voice", "VR pause shows what every controller button does", "Developer mode in VR: press B for the dev menu", "In VR you no longer see your own arms jittering about (everyone else still sees them, smoother than before)", "Do an emote in VR and you watch yourself do it from out front, then you're put back"]],
  ['2.22.22', ["Tommy's new voice, with proper emphasis (sarcastic, excited, shouting where it fits)", "Speech bubbles and voices now start at exactly the same moment, every time, and never come out of order", "His lines are ready as the game loads, so he talks straight away when you join", "Only a couple of people talk at once, so joining a game isn't a wall of bubbles and voices"]],
  ['2.22.21', ["Tommy talks! Every line he says is spoken out loud in his real voice, from where he's standing, in single player and for everyone in a lobby", "Playing as Tommy in multiplayer? Type in chat and it's read out in his voice for the whole lobby"]],
  ['2.22.19', ["The Griddy, redone move for move from the Fortnite emote: heel taps out in front (toes up) while hopping on the other foot every step, both arms flaring out wide and tucking back in together, a quick hunch, then the goggles: an OK sign round each eye with the other fingers fanned up. The hands find each character's own eyes, whatever their build"]],
  ['2.22.17', ["Imposter: SECURITY CAMERAS. Sit at the new security desk in the staff room to watch four live cameras (the bar, the car park, the beer garden, the kitchen), each only part of the area, with a security-camera look. While anyone's watching, every camera's red light blinks for everyone. Also: the fruit machine job works properly (two cherries a reel, tap anywhere to stop, a miss only re-spins that reel, tapping the real machine opens your job), the loo roll job is harder (faster, narrower basket, two drops and you restart, soggy rolls to avoid), the kitchen is tidied with a clear walkway round a smaller island, the hoover power-up is toned down, and power-ups can be tested from the developer menu"]],
  ['2.22.16', ["Developer mode: the code is FATTY now, then you choose a map, including the new TEST GRID (an empty white and grey room). Fixed developer mode crashing on phones when you press play (it could restart the game over and over, and the squad's pictures are lighter on phones now). Attacks: the attack card is up for 2 seconds, then it goes and THEN they do their move, so the card never hides it"]],
  ['2.22.15', ["Developer mode has its own hacker look: a green terminal start card with code rain, a glitching DEVELOPER MODE title, a boot-up readout, a terminal-style dev panel and HUD. Attacks: whoever's attacking now appears right in front of you in a puff (no more running over and getting stuck on the furniture)"]],
  ['2.22.14', ["Imposter: the barrel, the parasol and the valve are all different now. Change the barrel: gas off, lift the coupler handle, carry the coupler to the new keg, handle down, gas back on. Put the parasol up: push the runner up the pole and watch it open (it slides back if you stop). The valve keeps its wheel. The slot machine code is 8 digits, and wiping the tables and unblocking the toilet both take longer"]],
  ['2.22.13', ["Imposter jobs look like the real thing now: watch the parasol open as you wind it, the Guinness pour and settle, chips brown in the fryer, the toilet water clear, the barrier arm lift, candles light up a dark restaurant (and blow out in the draught), coins pour out of the fruit machine, the bookings diary get ticked off, glasses stack up at the garden bar"]],
  ['2.22.12', ["Imposter jobs rehauled: every job has its own game now. Fruit machine reels, catch the loo rolls, keep the fryer in the green, sort the pots into racks, grab the empties (not the full pints), copy the clock-in pattern, lay forks and knives, light the candles in the wind, stack the garden glasses, sweep the glass into the dustpan, connect the barrier's power. Harder: two card swipes, six DJ wires, memorise the slot code, four keg hits, the parasol unwinds if you stop, the lights are a proper puzzle"]],
  ['2.22.11', ["Developer mode is always free roam: nobody attacks you (Tommy included) unless you set it off from the dev menu"]],
  ['2.22.10', ["Developer mode is now behind a code. Get the code wrong and it locks on that device"]],
  ['2.22.9', ["DEVELOPER MODE (in the settings cog): test any character's emotes (one at a time, or all of them in turn), set off any attack on yourself, and play every Imposter job and sabotage fix"]],
  ['2.22.8', ["Imposter map: a big CLOSE button, and every room's name fits (smaller, or on two lines)", "Imposter jobs: the wiring job uses the real DJ booth (no extra jukebox), the bookings ledger is on the worktop behind the reception desk, the fuse box's name sign hangs where you can see it, the keg pressure job is in the keg room against the side wall"]],
  ['2.22.7', ["iPhone crash fix: the game now uses far less memory as you walk round and do emotes (signs and posters no longer keep a second copy, the whole level is sent to the graphics chip once at the start, sounds tidy up after themselves). Loading peak halved", "Brand new sound effects: 90 different sounds instead of 25. The till goes ka-ching, darts thunk, the ping pong bat tocks, the dog barks, the clippers buzz, Harry's van screeches off, Imposter has a klaxon, a vote stamp and a metal vent, and every food has its own bite"]],
  ['2.22.6', ["Oysterfleet back bar: the plain coloured boxes hanging off the counter are gone. Proper open boxes of crisps and peanuts, a stack of round trays and a little radio now sit on the counter top"]],
  ['2.22.5', ["Oysterfleet restaurant: chairs sit square to their tables, facing in", "The restaurant from outside: brick walls, white windows and a roof all round (you could see straight in from the road and the lawn)", "Fixed: walking into the restaurant's entrance hall or toilets made the walls and floor vanish", "Daytime views from the restaurant windows; leaded glass in the conservatory; printed crisp boxes behind the bar", "Fixed: Aidan W's knee attack never happened", "Phones: the attack counter no longer covers the Eat Meter, speech bubbles stay on screen up close, cut-scene headlines clear of PAUSE", "Emotes: the camera never ends up behind furniture, name tags and words don't overlap, long lines are bigger"]],
  ['2.22.4', ["A brand new start panel for every game: its own colour and icon, the three things to know at a glance, and one big PLAY button", "HOW TO PLAY is a button on the panel now (the pages open right there), instead of being in the way before every game", "The VR button only shows on a headset (or a computer with one): on a headset it's the main button", "CHANGE takes you straight back to picking a place and game"]],
  ['2.22.3', ["Fixed: iPhones closing the game ('A problem repeatedly occurred') or going back to the home page when loading into the pub: the game now uses about half the memory, and looks exactly the same", "Playing one game after another no longer builds up memory", "Multiplayer: drop out (Wi-Fi to 4G, a tunnel) and the game gets you straight back in as the same player; a REJOIN ROOM button on the home screen if the page closes", "Multiplayer: Quest players using hand tracking were invisible to everyone else: fixed", "Multiplayer: the host locking their phone hands hosting on instead of freezing everyone"]],
  ['2.22.2', ["The Oysterfleet from outside, rebuilt from a photo of the real one: brick, black weatherboarding, orange tiled roofs, the gabled entrance porch with the Hotel & Pub sign, all the way round"]],
  ['2.22.1', ["Fixed: going out into the Oysterfleet car park could make phones reload the game (it was suddenly loading the whole restaurant, inside and all, which you can't see from out there)"]],
  ['2.22.0', ["MULTIPLAYER: up to 12 players a room (phones, computers and Quests together)", "Smoother: everyone's moves 20 times a second, only what's changed; whoever grabs something runs it (no lag on your own throws)", "Drop out and come back to the same room: you're the same player, with your progress", "If the host leaves, the next player in takes over the game where it was (everyone's told who); the old host comes back as a player and can be handed it back", "FPS / PING display: switch it on in the pause menu", "Hand tracking on Quest: your real fingers show to everyone (only sent when you're using it)"]],
  ['2.21.0', ["The Griddy: slower steps, both arms moving together, and the OK sign over your eyes (the goggles), not peace signs", "Watching your own emote: the camera holds still (no swaying), and your floating first-person hand is hidden", "Pop-up words (emotes, notifications) are white with a thick black outline and a soft shadow: readable on every wall, floor and sky (the old yellow with a white edge was 1.4:1, this is 18.9:1)", "Imposter map: always upright (north at the top), and fills a phone held upright"]],
  ['2.20.2', ["Behind the bar: the staff room's corner is set back, so the passage runs full width to the staff room door"]],
  ['2.20.1', ["The bar: no more gaps where the counter turns its corners (the oak, the top, the cupboards and the steel worktop behind it all carry round)"]],
  ['2.20.0', ["THE OYSTERFLEET CAR PARK, out the front: walk straight out of the wide-open front doors", "Bays along the top and down the side, a disabled bay, KEEP CLEAR in front of the doors, two STAFF bays, an exit with a barrier and a ticket post, lamp posts, bins, a bottle bank, the pub's big sign by the road", "Lewis's car is in his reserved bay: the window's been put through, glass everywhere, and a note taped on: 'Sorry, some drunk guy smashed and broke this.'", "Over the road: houses, a corner shop, a bus stop, street lamps, parked cars. The pub's front is old brick now, with the name over the door", "Imposter: two car park jobs (sweep up the glass by Lewis's car, fix the barrier) and the car park on the map"]],
  ['2.19.0', ["IMPOSTER: a body now lies flat on its back inside a white tape outline, in a pool of blood (cleaned up for the next round)", "Imposter: the MAP comes up big in the middle of the screen and now shows the restaurant and the beer garden too", "Imposter: LIGHTS OUT really goes dark now until someone fixes the fuse box", "Imposter: the emergency bell tells you why if it can't ring yet, and the host can no longer get sent back to the lobby after the roles are dealt", "Imposter jobs moved: the Guinness tap and card machine are on the bar, the fuse box on the staff room's right wall, clock-in on the back cupboard, bookings behind reception; the fruit and slot machine jobs use the pub's own (more detailed) machines", "New Imposter jobs: wash the pots (kitchen), lay the tables and light the candles (restaurant), put up the parasols and clear the glasses (beer garden)", "Imposter: the pan swings with a burst of stars, the bell swings when a meeting's called, sparkles when you finish a job", "THE GERRARD SLIP: remade from the real thing (Sakho's pass, the slip, Demba Ba through to score)", "Lidl Security: Ollie's hi-vis fits him properly. Ben's plane is smaller and closer. Ronnie's fridge is beside him so you can see in. The sad noise is a proper womp womp trombone", "Free Roam JUST YOU: people joining get the empty pub too", "The gambling room's missing back wall is back"]],
  ['2.18.0', ["Your own emotes: the camera swings round in front so you can watch yourself do them (they also play at the right speed on phones now)", "Multiplayer: if a mate's game is a newer version, yours updates itself so everyone sees the same emotes", "New emotes: CHESTER! (Chloe and her cockapoo), HALA MADRID (Ethan), GLAD ALL OVER (Lewis, Palace), TRY TIME (Noah), HAIR IN THE WIND (Ben), TOP BINS and HERE WE GO, signing for Chelsea (Alfie)", "Remade: Ben's Turkish Airlines plane (Turkish flags everywhere), Alfie's back piece (shirtless on the tattoo bed: OWWW, NOPE), Connor's slip in the full Liverpool kit with Demba Ba, Split the G (the pint comes up huge), Guinness Dream (six pints, both hands)", "Everyone has new lines about whatever game mode you're playing"]],
  ['2.17.0', ["Everyone has 4 emotes now (21 new ones, taking the mick): Wolves 0-5, KFC Bargain Bucket, Turkey Teeth, a real Turkish Airlines plane for Ben, United 14th, Wagamama, Gym Selfie, Spurs' empty trophy cabinet, Split the G, 3am Kebab, Blowing Bubbles, The Big Catch (a boot), Lidl Security, Unboxing, Scrum Down, Protein Shake, The Chelsea Project, The Back Piece, The Slip, Fridge Raid, Food Coma and more", "Emote fixes: a new Griddy (arms down then peace signs, tiptoeing), Alfie's line goes the right way, Harry's date holds his hand, Harry really swipes right, Harry's Candy van (SEE YOU LATER KIDS), Lewis has a 7 on his back, Aidan W on crutches, Ethan's cans in detail", "VR: the pause menu opens right in front of you; other players' VR arms are smooth and only move when theirs do; VR players' emotes play properly", "Phone: bigger Eat Meter; Ben's Turkey trip shows upright", "End of a game: the receipt fits every screen, nothing covers it, and there's PLAY AGAIN (in multiplayer the host restarts everyone)", "Multiplayer: back in the lobby, the host stays the host and everyone follows when they start", "Imposter: a lobby to walk round first; the host rings the LAST ORDERS bell to start (3+ players); you start by the bell; no picking things up; a cartoon map in the corner that doesn't stop you moving; every job has its own station and sign", "The Oysterfleet bar: rebuilt behind the counter (no floating bottles): fridges full of real bottles, kegs, a sink, an ice well, the speed rail, racks of glasses; a proper glass washer in the back room", "Run the Pub: MONSTOR from the MONSTOR fridge, lager and cider in ice buckets on the back counter, pints stay under the tap until you pick them up, tap a person to give them their drink (or throw it: they'll still pay, less happily), the soft-drink gun in one tap (and tap the holder to put it back), every station anyone's waiting on has its logo over it, make drinks in any order", "Run the Pub: numbered restaurant tables with TAKE ORDER / SERVE buttons when you get there, Ben's food on the hot pass, new jobs (ice, crisps, the football) and new trouble (spills, blocked toilets, the fuse going, a hen party), colour-coded markers in the pub matching the TO DO list (which now sits under the orders), busier with more players", "Free Roam: WITH THE SQUAD or JUST YOU (no NPCs at all)"]],
  ['2.16.1', ["Imposter: your jobs list is big and readable top left (role, task bar, jobs ticked off), the MAP shows the pub from above with your jobs on it, limited vision works properly, and a game that starts a bit late still gets its role"]],
  ['2.16.0', ["NEW GAME: IMPOSTER (multiplayer, the Oysterfleet). Among Us at the pub: the host picks 1 or 2 imposters, everyone else is THE FAITHFUL", "Imposter: the faithful have 5 jobs each round the pub (pour a Guinness, change the barrel, take a card payment, fix the jukebox wiring, empty the fruit machine, unblock the toilet, restock the loo roll, sort the bookings, clean the fryer, collect the empties, wipe the tables, reset the slot machine, check the keg pressure, clock in). Every job fills the TASK BAR: fill it and the faithful win", "Imposter: the imposter has a KILL button (30 seconds between kills, counting down on the button), fake jobs, SABOTAGE (lights out / the KEG PRESSURE: fix both valves in 45 seconds or the imposters win) and TRAPDOORS to sneak between", "Imposter: kills are a frying pan to the head, and the body stays on the floor, cartoon style. The one killed is told who did it, then becomes a ghost: they can still do jobs and watch others, and only ghosts can hear them", "Imposter: REPORT a body, or ring the LAST ORDERS bell in the middle of the pub (one emergency meeting each). Everyone's brought to the middle: 90 seconds (or until everyone's voted) to vote someone out or skip. Most votes (and more than skip, no tie) is thrown out of the pub, and everyone sees if they were the imposter", "Imposter: the faithful win when every imposter is out or the task bar is full; the imposters win when there are as many of them as faithful left, or the keg goes up. Limited vision, a map, chat only in meetings", "Ten size stages now (the top one takes the same eating as the old stage 6), and everyone gets much WIDER as well as taller as they grow", "POWER-UPS turn up round the place: HOOVER MODE (food flies into your mouth), DOUBLE CHONK, FOOD RAIN and SUPER SPEED", "Multiplayer: when the host changes the game (or restarts it), it changes for everyone in the room and you all start again from the start of the map", "Harry's Van: it now pulls up facing him so you can see the kids climb in the back (with the inside of the van), and the sign on the doors is gone"]],
  ['2.15.0', ["Dylan: ACL is now graphic: the knee swells, goes BANG and the bottom of his leg falls off (cartoon style)", "Dylan: Wonderwall is now Liam style: leaning right forward into a mic stand, hands behind his back, in a long navy trench coat", "Dylan: new Oompa Loompa dance: he turns properly orange and his own hair goes bright green", "Dylan: no more black trainers", "Chat bubbles sit closer to the player's name tag", "Fixed: some instruction pictures not showing", "Alfie: his face goes right down onto the line of sugar", "Ronnie: the belly drum actually hits his belly", "Ian: a proper BBQ with the burger flipping over; the fishing cast goes back over his shoulder and whips out", "Ethan: holds the controller properly (no stretched arms)", "Lewis: leg day has a loaded barbell across his shoulders, held in his hands", "Ollie: My Honest Reaction nods up and down", "Harry: SWIPE RIGHT: yes to everyone", "Harry: the kid on his date has a little ponytail", "Harry: new emote HARRY'S VAN: a detailed white van pulls up, the back doors fly open, his 5 kids hop in and it drives off", "Aidan W: Miles Morales is gone; new BEARD GROWTH emote: it grows down to his belly"]],
  ['2.14.0', ["The game you're in is always shown above the box in the top left", "Run the Pub: the box shows time left, takings, how many you've served and the star rating (no Eat Meter)", "Run the Pub: the other staff don't serve for you now. They give you jobs (Ben: food's up; Lewis: take an order; the bar staff: empties, change the barrel), each with its own card, notepad and JOB DONE! stamp", "Run the Pub: a TO DO list next to the orders shows fights, singers, runaway kids, fuming punters and your current job", "Run the Pub: glasses and wine show up behind the bar now; GUINNESS (with its own black pint logo); the glass or mug stands under the tap or coffee machine while it fills", "Run the Pub: punters never walk out. They wait at the bar getting angrier, with a meter (they're FUMING when it runs out)", "End of a game: you're held looking at the receipt with nothing else on screen, then MAIN MENU (multiplayer: RETURN TO LOBBY, back into the same room)", "Multiplayer: change character from the pause menu without leaving; tap the room chip at the top to see who's in the room and who they're playing", "Multiplayer: the squad take turns attacking every player (never Tommy or each other)", "Elbows and knees bend smoothly now (no jagged spikes); Chloe's ears grow from normal size out of the sides of her head", "Emotes: Tommy's ball (smaller, hairy, pulsing, a struggle to get out), Ben points at his hairline and runs a hand through it, drinks go to their mouths with a bent arm and the glass doesn't lag behind", "New emotes: Pasty Sniffer, To Turkey!, One Day Older, Leg Day, Salad Toss, Miles Morales, Let It Settle, Burger Flip, Swipe Left, The Nutmeg, Irish Jig", "Text everywhere fits (long floating words wrap onto two lines, nothing cut off)"]],
  ['2.13.0', ["Fixed: character emotes (FIFA rage, my ball...) now work in multiplayer", "Emote wheel: pick DEFAULT EMOTES or your character's emotes in the middle of the screen first, then the wheel (VR too)", "The middle finger (and every hand gesture) is now a proper jointed hand in the character's own skin colour: a clean middle finger, no stretched skin", "Fixed: stretched strips of skin between some characters' hands and legs", "Chloe's UCL ears are proper ears now", "Fixed: finished food stayed in your hand and you could keep eating it", "Multiplayer chat: CHAT button under PAUSE; messages show in a black speech bubble over your character and in a little chat under the Eat Meter", "Every bit of food is one solid piece (nothing floating)", "Phones: the character list scrolls all the way on every phone", "How-to pictures can't come out blank any more", "The DJ booth and the TVs are switched off for now"]],
  ['2.12.0', ["Fixed: the game freezing when eating some foods (the new ones had no CHOMP! word and it crashed the game)", "Fixed: the pause button sometimes doing nothing", "Fixed: Lidl staff had a second person inside them; they're back to one body in uniform", "Food no longer spawns on top of other food: twice as many places for it to appear. The black outline is gone (the glow stays)", "Run the Pub is drinks only now: glasses, mugs, cups and drinks for the punters, no food", "Characters' bodies no longer open up holes at the armpits and sides when they move", "VR: point at something (even on the floor) and pull the trigger: it flies into your hand", "VR: the pause menu always sits in front of you, the dark sphere is gone, and the hands are there the moment the game starts", "VR: when someone's coming to attack you, a small note says who and an arrow points at them", "Emotes use the characters' own hands now (real fingers), the Griddy is redone properly, and SIX SEVEN is the right way round", "Emote wheel: DEFAULT EMOTES and each character's own (e.g. CHLOE'S EMOTES): FIFA rage, Pepsi Max pile, new hairline, my back, the final ball, SIUUU, too tall, UCL ears, knee pain, Guinness dream, ACL explosion, Wonderwall, shouting abuse, gone fishing, my honest reaction, going live, belly bounce, conversion kick, on a date, touchdown, special stuff, YNWA, my round, belly drum, Mango Loco", "VR emote wheel: press B once to open it, stick + A/trigger to pick, B to close", "Tommy's new attack: THE FINAL BALL. Out of his trousers, at your head, down for 2.5 seconds", "How-to-play pages redone with pictures: a map of the bar showing every station, the squad's faces and attacks, the controls for your device", "Food: no more brownie; the taco, burrito and sausage roll are each one solid piece"]],
  ['2.11.0', ["How to play pages before every game: a few pages on how that mode works and its controls (phone, computer or headset), with arrows between them, then I'M READY. Multiplayer guests see them too", "Run the Pub: tested a full shift: orders, the guide arrow, kids and the throwing penalty all working"]],
  ['2.10.0', ["Run the Pub: real drinks stations behind the bar. Guinness/lager tap (hold a glass under it), fridges of lager, cider and MONSTOR, wine, a coffee machine, and a soft-drink gun (A/X or EAT switches COKE and FANTA)", "Run the Pub: an orders list shows what everyone wants, an arrow guides you to the next station, kids order too (serve them booze and you're fined \u00a310), and throwing a drink at someone halves the tip", "The pub's background noise is gone", "Food outline only goes round the outside of the food now, never over toppings, buns or inside tacos", "Fixed: the game freezing when eating some of the new foods", "Fixed: the buttons vanishing during attacks and leaving you stuck", "Harry's dating attack is redone: a detailed phone with real profiles, his thumb swiping NOPE, an unmatch notification and his unanswered chat. It only takes up the middle of the screen now"]],
  ['2.9.0', ['Ronnie\'s belly is a real belly now: navel, a fold underneath, love handles, hanging further forward every stage. His T-shirt rides up as he grows, then splits and rips until it\'s in tatters', 'Multiplayer: the characters get fatter every stage, a big round belly hanging over the waistband, wider hips and thicker thighs (everyone sees it)', 'Multiplayer: playing as one of the squad (or Tommy), look down and you see your own character\'s body (and your emotes play on it)']],
  ['2.8.0', ['Every bit of fast food is rebuilt in far more detail (sesame seeds, melted cheese, grill marks, sauces, sprinkles, crumbs): burger, pizza, doughnut, hot dog, chips, a proper doner kebab in pitta, fried chicken, taco, crisps, chocolate bar, cookie, ice cream, sausage roll', '10 new fast foods: chicken nuggets, Cornish pasty, onion rings, burrito, waffle, pancake stack, churros, cupcake, brownie and a bacon bap', 'The detail shows up close; further away the simpler versions are drawn, so it stays smooth on the Quest']],
  ['2.7.0', ['VR: the home screen is the same menu as the phone (every page: solo / multiplayer, places, games, your name with a keyboard, who you are, host or join) on a panel next to Ronnie; point and pull the trigger', 'VR: Ronnie and the menu are at the right height (they were under the floor)', 'VR: when a menu is open (pause, music, TV) you stay where you are until you close it or pick something', 'VR: hold a thing in each hand again', 'VR multiplayer: grab and throw the squad and punters even when you\'ve joined someone else\'s game', 'Multiplayer: someone playing in VR moves smoothly to everyone else (no more jumpy hands and arms flicking about)', 'Eating doesn\'t make food pop up in front of you: new food turns up away from everyone', 'Food has a black outline so it stands out on any floor or table']],
  ['2.6.3', ['The title screen\'s food is back to normal (no glow box round Ronnie)']],
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

// LOADING STEPS: main.js ticks these off as it gets there (the squad's models, the place, the food, then GO)
window.__ls = (k) => {
  window.__crashStep = 'loading: ' + k; window.__crashBeat && window.__crashBeat();      // (for a crash report: where it got to)
  const ls = document.getElementById('loadscreen'); if (!ls) return;
  const order = ['squad', 'place', 'food', 'go'], i = order.indexOf(k); if (i < 0) return;
  ls.querySelectorAll('#ls-steps li').forEach((li, j) => { li.classList.toggle('done', j < i || k === 'go'); li.classList.toggle('now', j === i && k !== 'go'); });
  const f = document.getElementById('ls-fill'); if (f) f.style.transform = `scaleX(${k === 'go' ? 1 : (0.12 + 0.88 * (i + 0.45) / order.length).toFixed(3)})`;
  ls.dataset.step = k;
};

// RONNIE SIMULATOR — the start screen: a few animated screens you tap through.
//   TITLE   bouncing logo, tap Ronnie (he chomps and talks), catch the falling food
//   PLACE   swipe through the places, each with its own little animated scene
//   MODE    mode cards that flip over for the details (locked ones say why)
//   READY   your picks, then a 3-2-1 chomp countdown and LET'S EAT
//   SQUAD   meet everyone: their colour, their attack, tap for a line
//   HOW     how to play, headset or phone
// Hands the choice to the game as window.ronnieMenu (a Promise of { place, mode }),
// exactly like before; ?place=&mode=&go=1 still skips straight in.
// older phone browsers have no roundRect on a canvas (name tags, signs, how-to pictures all use it): add it
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
  r = Math.min(typeof r === 'number' ? r : (r && r[0]) || 0, w / 2, h / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); };
(function () {
  const PLACES = [
    { id: 'pub', ico: '🍺', name: 'THE OYSTERFLEET', desc: "Ronnie's local and his work. The whole squad fits in.", bg: 'linear-gradient(160deg,#5a1a24,#2a1208)', props: ['🍺', '🎯', '📺', '🍟', '🎰'] },
    { id: 'garden', ico: '🏡', name: "LEWIS'S HOUSE", desc: 'A sunny back garden. Ian is on the barbecue. Lewy is fetching plates.', bg: 'linear-gradient(160deg,#4aa8f0,#5a9a36)', props: ['🍔', '🌭', '🍗', '⚽', '🌻'] },
    { id: 'shop', ico: '🛒', name: 'LIDL', desc: 'Aisles, the middle aisle, the bakery and a wall of MONSTOR.', bg: 'linear-gradient(160deg,#1e4ea8,#ffd400)', props: ['🛒', '🥐', '🥫', '🍩', '🧺'] },
    { id: 'restaurant', ico: '🕯️', name: 'LA GRANDE PORTION', desc: 'Fancy dinner. Date night with Chloe (and the lads at the other tables).', bg: 'linear-gradient(160deg,#5a0f18,#1a0508)', props: ['🕯️', '🍷', '🦞', '🍰', '🎹'] },
    { id: 'bedroom', ico: '🛏️', name: "RONNIE'S BEDROOM", desc: 'Where it all begins. Small, cosy, full of cans.', bg: 'linear-gradient(160deg,#3a2a6a,#1f4fbf)', props: ['🛏️', '🥫', '🎮', '🍕', '🥫'] },
  ];
  // (developer mode's own map: never on the normal place picker)
  const ALLPLACES = PLACES.concat([{ id: 'grid', ico: '⬜', name: 'THE TEST GRID', desc: 'Developer mode: an empty white and grey room.', bg: 'linear-gradient(160deg,#e9ebee,#a9aeb6)', props: [] }]);
  const MODES = [
    { id: 'everyone', ico: '👥', name: 'THE WHOLE SQUAD', desc: 'The main game. Everyone is here, taking turns to attack you while you eat. A countdown shows the next one.', stars: 3, who: 'Everyone' },
    { id: 'sweep', ico: '🛒', name: 'SUPERMARKET SWEEP', desc: '90 seconds and a trolley in Lidl. Grab the most calories you can. Oliver and Aidan W are on security (Aidan W is slow: knee).', stars: 2, who: 'Oliver, Aidan W', place: 'shop' },
    { id: 'bbq', ico: '🍖', name: "IAN'S BARBECUE", desc: "Round Lewis's house. Ian WILL make you eat a healthy burger. Pinch his proper ones, get big, fight back.", stars: 2, who: 'Ian, Lewis + the lads', place: 'garden' },
    { id: 'date', ico: '💜', name: 'DATE NIGHT', desc: "Eat when Chloe looks away. Three catches and it's salad.", stars: 2, who: 'Chloe + the lads', place: 'restaurant' },
    { id: 'eatoff', ico: '⏱️', name: 'EAT-OFF', desc: '60 seconds. Eat everything. On your own, or pass-and-play: who eats more?', stars: 1, who: '1 or 2 players' },
    { id: 'runpub', ico: '🍺', name: 'RUN THE PUB', desc: 'Work behind the bar at the Oysterfleet with Aidan, Connor and Chloe (Lewis is on the restaurant, Ben\'s in the kitchen). Serve the punters the right drinks, break up fights, catch runaway kids. Six-minute shift.', stars: 3, who: 'The staff, the locals, whoever turns up', place: 'pub' },
    { id: 'imposter', ico: '🔪', name: 'IMPOSTER', desc: 'Multiplayer only. Among Us at the Oysterfleet: the faithful do jobs round the pub while the imposter picks them off one by one. Find a body? REPORT it. Ring the LAST ORDERS bell for a meeting, then vote them out of the pub.', stars: 3, who: '3+ players', mp: true },
    { id: 'boss', ico: '👹', name: 'BOSS FIGHT', desc: 'A GIANT one of the lads drops out of the sky. Eat to power up, throw food to bring them down. Three phases, a new boss every time. On your own or everyone together.', stars: 3, who: 'Noah, Lewis, Chloe, Tommy (in turn)' },      // (BOSS FIGHT: boss.js)
    { id: 'prophunt', ico: '🎭', name: 'PROP HUNT', desc: 'Multiplayer only. Hide and seek where the hiders turn into things: a keg, a bin, a gnome. Seekers check anything that looks off, but the wrong thing costs them health. Taunt for points. Teams swap every round.', stars: 3, who: '2-12 players', mp: true },      // (PROP HUNT)
    { id: 'snd', ico: '💣', name: 'SEARCH & DESTROY', desc: 'Two teams, one bomb, no respawns. Spend your dinner money in the shop every round (nine food guns: ketchup pistol, bean shotgun, sausage sniper...), find ammo, food and perks round the map, and plant or defuse THE VINDALOO. Full teams every time: the squad fill any empty seats as bots.', stars: 3, who: 'You + the squad as bots, or 2-12 players' },      // (SEARCH AND DESTROY: snd.js)
    { id: 'roam', ico: '🚶', name: 'FREE ROAM', desc: 'Have a look round and explore. Everyone is here, but nobody attacks you. No timer.', stars: 0, who: 'Everyone (no attacks)' },
  ];
  // each place has its own games: Lidl is Supermarket Sweep, Lewis's is Ian's barbecue,
  // La Grande Portion is date night; the pub and the bedroom have the squad and the eat-off
  const PLACE_MODES = { pub: ['everyone', 'runpub', 'imposter', 'boss', 'prophunt', 'snd', 'eatoff', 'roam'], bedroom: ['everyone', 'eatoff', 'roam'], shop: ['sweep', 'prophunt', 'snd', 'roam'], garden: ['bbq', 'boss', 'prophunt', 'snd', 'roam'], restaurant: ['date', 'roam'], grid: ['roam'] };
  // Run the Pub's three nights: how busy, how patient, how big the tips
  const RP_DIFF = { runpub1: ['🌙', 'QUIET NIGHT'], runpub: ['🍺', 'FRIDAY NIGHT'], runpub3: ['🔥', 'CUP FINAL'] };
  const GAME_IDS = ['everyone', 'runpub', 'runpub1', 'runpub3', 'sweep', 'bbq', 'date', 'chonkoff', 'chonkoff2', 'chonkoffr', 'imposter', 'imposter2', 'boss', 'prophunt', 'snd', 'roam', 'roam0'];
  const cardOf = (id) => id === 'runpub1' || id === 'runpub3' ? 'runpub' : id === 'chonkoff' || id === 'chonkoff2' || id === 'chonkoffr' ? 'eatoff' : id === 'imposter2' ? 'imposter' : id === 'roam0' ? 'roam' : id;      // the eat-off card covers 1P and 2P
  const modeInfo = (id) => { const m = MODES.find(x => x.id === cardOf(id)); return cardOf(id) === 'runpub' ? { ...m, name: 'RUN THE PUB · ' + RP_DIFF[id][1] } : id === 'chonkoff' ? { ...m, ico: '⏱️', name: 'EAT-OFF · 1 PLAYER' } : id === 'chonkoff2' ? { ...m, ico: '🆚', name: 'EAT-OFF · 2 PLAYERS' } : id === 'chonkoffr' ? { ...m, ico: '🏅', name: 'RANKED EAT-OFF', desc: 'Everyone in the room at once: 60 seconds, most eaten wins, and your online rating goes up or down.' } : id === 'imposter' ? { ...m, name: 'IMPOSTER · 1 IMPOSTER' } : id === 'imposter2' ? { ...m, name: 'IMPOSTER · 2 IMPOSTERS' } : id === 'roam' ? { ...m, name: 'FREE ROAM · WITH THE SQUAD' } : id === 'roam0' ? { ...m, ico: '🧍', name: 'FREE ROAM · JUST YOU', desc: 'The place to yourself: no NPCs at all. Have a proper look round.' } : m; };
  const mpOn = () => !!(window.ronnieMP && window.ronnieMP.role);
  const gameChoices = (p) => PLACE_MODES[p].flatMap(c => c === 'runpub' ? ['runpub1', 'runpub', 'runpub3'] : c === 'eatoff' ? (mpOn() ? ['chonkoff', 'chonkoffr'] : ['chonkoff', 'chonkoff2']) : c === 'imposter' ? (mpOn() ? ['imposter', 'imposter2'] : []) : c === 'prophunt' ? (mpOn() ? ['prophunt'] : []) : c === 'roam' ? ['roam', 'roam0'] : [c]);
  const SQUAD = [
    { n: 'Tommy', c: '#f0c040', a: '🟤', t: 'The final ball', l: "I've been alive a WHOLE day longer than you, Ronnie." },
    { n: 'Chloe', c: '#c2185b', a: '🥗', t: 'Puts you on a diet', l: 'I made you a salad. You looked at it like it owed you money.' },
    { n: 'Lewis', c: '#d32f2f', a: '⚽', t: 'SIUUU like Ronaldo', l: 'Leg day, Ron? Every day\'s leg day for you, bro.' },
    { n: 'Harry', c: '#7a1f3d', a: '💘', t: 'His dating history', l: 'My longest relationship was eleven days. Twelve if you count the day she was telling everyone.' },
    { n: 'Aidan', c: '#2e7d32', a: '🍺', t: 'One more beer', l: 'Just the one, Ronnie. That\'s what I said in 2016 and I\'m still out.' },
    { n: 'Noah', c: '#1565c0', a: '🏉', t: 'The tackle', l: "I've tackled props, I've tackled locks, I've never tackled a man with his own moon." },
    { n: 'Oliver', c: '#ff9800', a: '📸', t: 'Camera flash', l: 'Like, comment and subscribe, and pray for the bakery section.' },
    { n: 'Dylan', c: '#6a1b9a', a: '🎤', t: 'Sings you Oasis', l: 'Second album\'s the best, Ronnie, don\'t even start. DON\'T. START.' },
    { n: 'Connor', c: '#c8102e', a: '☘️', t: 'Irish jig attack', l: "You'll never walk alone, Ronnie. Mostly because you can't fit through doors on your own." },
    { n: 'Ethan', c: '#febe10', a: '🥤', t: 'Pepsi Max attack', l: 'My nose can smell a pasty from three postcodes away, Ron.' },
    { n: 'Ian', c: '#6b8e23', a: '🎣', t: 'Healthy BBQ / fishing rod', l: 'Canvey Lake, Ronnie. Disgrace. I pulled out a whole sofa once. Nice sofa, actually.' },
    { n: 'Alfie', c: '#034694', a: '🌀', t: 'The nutmeg', l: 'I started a back piece once. It\'s just a dragon\'s tail now. On its own.' },
    { n: 'Aidan W', img: 'aidanw', c: '#132257', a: '🦵', t: 'Tells you about his knee', l: 'Spurs, Miles Morales and trading cards. And the knee. Mostly the knee.' },
    { n: 'Ben', c: '#2f6fd6', a: '✈️', t: 'Takes you to Turkey', l: 'Got my hairline done in Turkey, Ron. Let me take you.' },
  ];
  const RONNIE_LINES = ['Pass us that burger.', 'Mmm. MMMM.', 'Is there any more?', 'Go on then. One more.', 'Is that a burger?', 'One more. Just one.', "I'm not hungry. I'm BORED.", 'UNLEASH THE MONSTOR!', 'Who ate my pie? ...oh. Me.', 'Five a day? FIVE A DAY.', 'Chelsea, pies and MONSTOR.'];
  const ok = (m, p) => PLACE_MODES[p].includes(m.id) && (!m.mp || mpOn());
  const PLACE_NAME = { restaurant: 'La Grande Portion', shop: 'Lidl', garden: "Lewis's House", pub: 'the Oysterfleet', bedroom: "Ronnie's bedroom" };

  const q = new URLSearchParams(location.search);
  // (developer mode lasts while you're in the game it started, through any reload of it (an update): it ends back here)
  if (!q.get('go')) { try { sessionStorage.removeItem('rs_dev'); } catch (e) {} }
  if (q.get('relay')) window.__relay = q.get('relay');      // (a test's own room server: the leaderboards use it too)
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('rs_menu') || '{}'); } catch (e) {}
  // always start at the Oysterfleet; only ?go=1 quick-starts use the address's place/mode
  const quick = !!q.get('go');
  let place = (quick && q.get('place')) || 'pub', mode = (quick && q.get('mode')) || 'everyone';
  if (!ALLPLACES.some(p => p.id === place)) place = 'pub';
  if (!GAME_IDS.includes(mode)) mode = 'everyone';      // old links to Classic / Squad Intervention / Catch
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // settings cog (top corner of the title screen): shows the version you're playing
  const when = (v) => { const w = GAME_WHEN[v]; if (!w) return ''; const d = new Date(w + ':00Z');
    return d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' }).replace(/ (am|pm)$/, '$1'); };
  $('#set-version').textContent = 'v' + GAME_VERSION; $('#set-date').textContent = when(GAME_VERSION);
  $('#set-updates').innerHTML = GAME_UPDATES.map(([v, list]) => `<div class="upd"><b>v${v}${when(v) ? ` <i>${when(v)}</i>` : ''}</b><ul>${list.map(t => `<li>${t}</li>`).join('')}</ul></div>`).join('');
  $('#cog').addEventListener('click', () => { $('#settings').hidden = false; });
  $('#lb-open').addEventListener('click', () => { import('./leaderboard.js').then(m => m.openBoards()).catch(() => {}); });
  $('#set-close').addEventListener('click', () => { $('#settings').hidden = true; });
  $('#set-x').addEventListener('click', () => { $('#settings').hidden = true; });
  $('#settings').addEventListener('click', (e) => { if (e.target.id === 'settings') $('#settings').hidden = true; });      // (a tap outside the box closes it too)
  // developer mode is behind a code. Get it wrong once and it's locked on this device for good
  { const LOCK = 'rs_dev_locked', locked = () => { try { return localStorage.getItem(LOCK) === '1'; } catch (e) { return false; } };
    const showLocked = () => { const b = $('#set-dev'); b.classList.add('locked'); b.disabled = true; b.textContent = '🔒 DEVELOPER MODE LOCKED'; $('#dev-code').hidden = true; };
    if (locked()) showLocked();
    // SOUND & FEEL: the mix and the buzz (mixui.js)
    $('#set-mixbtn').addEventListener('click', async () => { const el = $('#set-mix'); el.hidden = !el.hidden; if (el.hidden) return;
      const m = await import('./mixui.js'); if (!document.getElementById('mixcss')) { const st = document.createElement('style'); st.id = 'mixcss'; st.textContent = m.MIX_CSS; document.head.appendChild(st); } m.buildMix(el); });
    $('#set-dev').addEventListener('click', () => { if (locked()) return showLocked(); $('#dev-code').hidden = false; $('#dev-msg').textContent = ''; const i = $('#dev-pin'); i.value = ''; setTimeout(() => i.focus(), 50); });
    const tryCode = () => { if (locked()) return showLocked(); const v = $('#dev-pin').value.trim(); if (!v) return;
      if (v.toUpperCase() === 'FATTY') { $('#dev-code').hidden = true; $('#dev-maps').hidden = false; $('#dev-msg').textContent = ''; blip(880, 0.06); try { $('#dev-pin').blur(); setTimeout(() => $('#dev-maps').scrollIntoView({ behavior: 'smooth', block: 'center' }), 60); } catch (e) {} return; }
      try { localStorage.setItem(LOCK, '1'); } catch (e) {} showLocked(); $('#dev-msg').textContent = 'WRONG CODE. DEVELOPER MODE IS NOW LOCKED.'; };
    // ...then which map to test on (the Oysterfleet, any of the others, or the empty test grid)
    $('#dev-maps').innerHTML = '<div class="dv-maps-h">&gt;_ CHOOSE A MAP</div>' + [['grid', '⬜', 'TEST GRID'], ['pub', '🍺', 'OYSTERFLEET'], ['garden', '🏡', "LEWIS'S HOUSE"], ['shop', '🛒', 'LIDL'], ['restaurant', '🕯️', 'LA GRANDE PORTION'], ['bedroom', '🛏️', 'BEDROOM']]
      .map(([id, ic, nm]) => `<button data-map="${id}"><b>${ic}</b>${nm}</button>`).join('');
    $('#dev-maps').addEventListener('click', (e) => { const b = e.target.closest('[data-map]'); if (!b) return; try { sessionStorage.setItem('rs_dev', '1'); } catch (er) {} location.href = location.pathname + '?go=1&place=' + b.dataset.map + '&mode=roam'; });
    $('#dev-go').addEventListener('click', tryCode); $('#dev-pin').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryCode(); }); }
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
    try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(8); } catch (e) {}      // (only once they've touched the page: before that the browser refuses, and says so)
  }
  const chompSfx = () => { blip(180, 0.07, 'sawtooth', 0.08); setTimeout(() => blip(140, 0.06, 'sawtooth', 0.07), 90); };

  // ---------------------------------------------------------------- scrolling on phones
  // Some phones don't scroll a menu page (the character list) when you drag it. If a drag doesn't move the page by
  // itself, move it ourselves.
  { let last = null, y0 = 0, sy0 = 0, scr = null, manual = false;
    start.addEventListener('touchstart', (e) => { if (e.touches.length !== 1) { last = null; return; } scr = e.target.closest('.screen'); last = y0 = e.touches[0].clientY; sy0 = scr ? scr.scrollTop : 0; manual = false; }, { passive: true });
    start.addEventListener('touchmove', (e) => { if (last === null || !scr || e.touches.length !== 1) return; const y = e.touches[0].clientY, dy = last - y; last = y;
      if (!manual && Math.abs(y - y0) > 24 && scr.scrollTop === sy0 && scr.scrollHeight > scr.clientHeight + 4) manual = true;      // (it's not scrolling by itself)
      if (manual) scr.scrollTop += dy; }, { passive: true });
    start.addEventListener('touchend', () => { last = null; }, { passive: true }); }

  // ---------------------------------------------------------------- screens
  let current = 'title';
  function show(id, dir = 1) {
    window.__crashStep = 'menu: ' + id; window.__crashBeat && window.__crashBeat();
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
    if (id === 'ready') { drawReady(); goGate(); }
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
      <div class="props" aria-hidden="true">${p.props.map((e, i) => `<span style="--i:${i}">${e}</span>`).join('')}</div>
      <div class="big">${p.ico}</div>
      <h3>${p.name}</h3><p>${p.desc}</p>
      <div class="tick">✓ PICKED</div>
      <div class="soloonly">👤 SINGLE PLAYER ONLY</div>
    </div>`).join('');
  let pi = Math.max(0, PLACES.findIndex(p => p.id === place)); const devGrid = place === 'grid';      // (developer mode's test grid: not on the carousel, so it's kept as it is)
  // the bedroom is just for one player: in multiplayer it's greyed out and skipped
  const SOLO_ONLY = ['bedroom', 'restaurant'], isMulti = () => !!(window.ronnieMP && window.ronnieMP.role);
  const okPlace = (i) => !(isMulti() && SOLO_ONLY.includes(PLACES[i].id));
  function drawPlace() {
    if (!okPlace(pi)) pi = PLACES.findIndex((p, i) => okPlace(i));
    place = devGrid ? 'grid' : PLACES[pi].id;
    $$('.scene', track).forEach((el, i) => el.classList.toggle('solo', !okPlace(i)));
    $$('.scene', track).forEach((el, i) => { el.classList.toggle('cur', i === pi); el.setAttribute('aria-hidden', i === pi ? 'false' : 'true'); el.style.transform = `translateX(${(i - pi) * 104}%) scale(${i === pi ? 1 : 0.86}) rotate(${(i - pi) * 3}deg)`; el.style.opacity = Math.abs(i - pi) > 1 ? 0 : i === pi ? 1 : 0.5; });
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
    if ((cardOf(mode) === 'imposter' || mode === 'prophunt') && !mpOn()) mode = 'everyone';
    const pp = (m) => m.id === 'runpub' ? `<div class="pp pp3">${['runpub1', 'runpub', 'runpub3'].map((id, n) => `<button data-pp="${n + 1}" class="${mode === id || (n === 1 && cardOf(mode) !== 'runpub') ? 'on' : ''}">${RP_DIFF[id][0]} ${RP_DIFF[id][1]}</button>`).join('')}</div>`
      : m.id === 'eatoff' ? `<div class="pp">${[1, 2].map(n => `<button data-pp="${n}" class="${cardOf(mode) === 'eatoff' && (mode === 'chonkoff2' || mode === 'chonkoffr') === (n === 2) ? 'on' : ''}">${n === 1 ? (mpOn() ? '👥 EVERYONE' : '👤 1 PLAYER') : mpOn() ? '🏅 RANKED' : '👥 2 PLAYERS'}</button>`).join('')}</div>`
      : m.id === 'imposter' ? `<div class="pp">${[1, 2].map(n => `<button data-pp="${n}" class="${cardOf(mode) === 'imposter' && (mode === 'imposter2') === (n === 2) ? 'on' : ''}">${n === 1 ? '🔪 1 IMPOSTER' : '🔪🔪 2 IMPOSTERS'}</button>`).join('')}</div>`
      : m.id === 'roam' ? `<div class="pp">${[1, 2].map(n => `<button data-pp="${n}" class="${cardOf(mode) === 'roam' && (mode === 'roam0') === (n === 2) ? 'on' : ''}">${n === 1 ? '👥 WITH THE SQUAD' : '🧍 JUST YOU'}</button>`).join('')}</div>` : '';
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
      if (c.dataset.id === 'runpub') { mode = ['runpub1', 'runpub', 'runpub3'][+ppb.dataset.pp - 1]; blip(780 + 110 * +ppb.dataset.pp, 0.08); drawModes(); const nc = $('.flip[data-id="runpub"]', grid); nc.classList.add('chosen'); if (was) nc.classList.add('flipped'); return; }      // (how busy the night is)
      const imp = c.dataset.id === 'imposter', ro = c.dataset.id === 'roam'; mode = imp ? (ppb.dataset.pp === '2' ? 'imposter2' : 'imposter') : ro ? (ppb.dataset.pp === '2' ? 'roam0' : 'roam') : ppb.dataset.pp === '2' ? (mpOn() ? 'chonkoffr' : 'chonkoff2') : 'chonkoff'; blip(ppb.dataset.pp === '2' ? 990 : 880, 0.08); drawModes();
      const nc = $(`.flip[data-id="${imp ? 'imposter' : ro ? 'roam' : 'eatoff'}"]`, grid); nc.classList.add('chosen'); if (was) nc.classList.add('flipped');
      return;
    }
    if (!c.classList.contains('flipped')) { $$('.flip.flipped', grid).forEach(f => f !== c && f.classList.remove('flipped')); c.classList.add('flipped'); blip(600, 0.05); return; }
    mode = m.id === 'runpub' ? (cardOf(mode) === 'runpub' ? mode : 'runpub') : m.id === 'eatoff' ? (mode === 'chonkoff2' || mode === 'chonkoffr' ? mode : 'chonkoff') : m.id === 'imposter' ? (mode === 'imposter2' ? 'imposter2' : 'imposter') : m.id === 'roam' ? (mode === 'roam0' ? 'roam0' : 'roam') : m.id; blip(880, 0.08); drawModes(); $(`.flip[data-id="${m.id}"]`, grid).classList.add('flipped', 'chosen');
  });

  // ---------------------------------------------------------------- READY: summary and the countdown
  function drawReady() {
    const p = ALLPLACES.find(x => x.id === place), m = modeInfo(mode);
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
  // picking who you are: chosen the moment your finger lifts (not on the browser's later "click", which a phone holds
  // back, and drops altogether if the page was still gliding from a scroll), the highlight first, the sound and saving after
  const pickChar = (c) => { if (!c || c.dataset.id === mpChar && c.classList.contains('sel')) return; mpChar = c.dataset.id;
    for (const m of cgrid.children) { m.classList.add('settled'); m.classList.toggle('sel', m === c); }
    requestAnimationFrame(() => { try { localStorage.setItem('rs_mp_char', mpChar); } catch (er) {} blip(400, 0.07, 'triangle', 0.08); }); };
  let cDown = null;
  const unpress = () => { for (const m of cgrid.querySelectorAll('.press')) m.classList.toggle('press', false); };
  cgrid.addEventListener('pointerdown', (e) => { const c = e.target.closest('.mate'); cDown = c ? { c, x: e.clientX, y: e.clientY, id: e.pointerId } : null; if (c) c.classList.add('press'); });
  const cEnd = (e) => { const d = cDown; cDown = null; unpress(); if (!d || e.pointerId !== d.id || e.type !== 'pointerup') return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 14 && d.c.contains(document.elementFromPoint(e.clientX, e.clientY))) pickChar(d.c); };      // (a tap, not a scroll)
  cgrid.addEventListener('pointerup', cEnd); cgrid.addEventListener('pointercancel', cEnd);
  cgrid.addEventListener('click', (e) => pickChar(e.target.closest('.mate')));      // (keyboard, and anything without pointer events: a second go is ignored)
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
    $('#mp-who').textContent = `You're playing as ${mp.char().n}`; show('mp');
    if (mp.pendingJoin) { mpStatus(`Joining room <b>${mp.pendingJoin}</b>…`); mp.pendingJoin = null; $('#mp-join2').click(); } });
  const mpStatus = (h) => { $('#mp-status2').innerHTML = h; };
  let myName = ''; try { myName = localStorage.getItem('rs_mp_name') || ''; } catch (e) {}
  $('#mp-myname').value = myName;
  const nameOf = () => { const n = ($('#mp-myname').value || '').trim().slice(0, 12) || myName || mp.char().n; try { localStorage.setItem('rs_mp_name', n); } catch (e) {} return n; };
  const esc = (t) => String(t).replace(/[<>&"]/g, '');
  // MULTIPLAYER: the host can't start until everyone's pressed READY. Returns true while it's locked
  function goGate() {
    const g = $('#go'), w = $('#go-wait'); if (!g) return false;
    const host = !!(mp.net && (mp.role === 'host' || (mp.net.host && mp.role !== 'join')));
    const waiting = host ? [...mp.net.players.values()].filter(p => !p.ready) : [];
    g.classList.toggle('wait', waiting.length > 0);
    g.textContent = !host ? "LET'S EAT ➜" : waiting.length ? `⏳ WAITING FOR ${waiting.length} TO READY UP` : '▶ START FOR EVERYONE';
    if (w) w.textContent = waiting.length ? 'Not ready yet: ' + waiting.map(p => p.name || 'someone').join(', ') + '. They tap I\'M READY in the room.' : '';
    return waiting.length > 0;
  }
  // the room: everyone in it, their name and who they're playing as; a free slot for each space left
  const lobby = () => {
    if (!mp.net) return;
    const boss0 = mp.role === 'host' || (mp.net.host && mp.role !== 'join');
    const me = { name: nameOf(), char: mpChar, host: mp.net.host, me: true, ready: mp.ready };
    const ps = [me, ...mp.net.players.values()];
    $('#room-code').textContent = mp.net.code; $('#room-url').textContent = inviteURL();
    const seen = mp.seenCards || (mp.seenCards = new Set()), key = (p) => p.me ? 'me' : String(p.id);
    const html = ps.map(p => { const c = CHARS.find(x => x.id === p.char) || CHARS[0];
      return `<div class="rp${p.ready ? ' isready' : ''}${seen.has(key(p)) ? ' seen' : ''}" style="--c:${c.c}" data-pid="${p.me ? '' : esc(p.id || '')}">${p.ready ? '<span class="rdy">✓</span>' : ''}${!p.me && boss0 ? `<button class="kick" data-kick="${esc(p.id || '')}" aria-label="Remove ${esc(p.name || 'player')}">✕</button>` : ''}${c.img ? `<img src="./assets/portraits/${c.img}.webp" alt="">` : '<div class="em">🍔</div>'}<b>${esc(p.name || '...')}</b><small>as ${c.n}</small>${p.host ? '<span class="tag">HOST</span>' : ''}${p.me ? '<span class="tag" style="background:#39ff14">YOU</span>' : ''}</div>`; }).join('')
      + Array.from({ length: Math.max(0, Math.min(mp.net.max || 12, mp.RO ? mp.RO.optNum('max') : 12) - ps.length) }, () => '<div class="rp empty"><div class="em">➕</div><small>free space</small></div>').join('');      // (all twelve places shown, not six then more as people came in)
    // (only redrawn when something's changed, and only someone new pops in: redrawing restarted every card's pop-in, so they flickered out on each message)
    const pe = $('#room-players'); if (pe._html !== html) { pe._html = html; pe.innerHTML = html; } ps.forEach(p => seen.add(key(p)));
    const RO = mp.RO, max = RO ? Math.min(mp.net.max || 12, RO.optNum('max')) : (mp.net.max || 12), nReady = ps.filter(p => p.ready || p.host).length;      // (the host starts the game, so they count as ready)
    $('#room-count').textContent = `${ps.length} / ${max} PLAYERS · ${nReady} READY${mp.locked ? ' · 🔒 LOCKED' : ''}`;
    $('#room-count').classList.toggle('notall', nReady < ps.length);
    // who's ready and who isn't (the button at the top opens it): the ones holding everyone up first
    const isR = (p) => !!(p.ready || p.host), order = [...ps].sort((a, b) => (isR(a) ? 1 : 0) - (isR(b) ? 1 : 0));
    $('#room-who-list').innerHTML = order.map(p => { const c = CHARS.find(x => x.id === p.char) || CHARS[0]; return `<div class="rw ${isR(p) ? 'ok' : 'no'}"><img src="./assets/portraits/${c.img || 'ronnie'}.webp" alt="">${esc(p.name || 'Someone')}${p.me ? ' (YOU)' : ''}${p.host ? ' 👑' : ''}<span class="st">${p.host ? '👑 STARTS IT' : p.ready ? '✓ READY' : '⏳ NOT READY'}</span></div>`; }).join('');
    goGate();
    drawRoomOpts(boss0);
    const rb = $('#room-ready'); rb.style.display = (mp.role === 'host' || (mp.net.host && mp.role !== 'join')) ? 'none' : ''; rb.classList.toggle('on', !!mp.ready);      // (the host doesn't ready up: they press START) rb.textContent = mp.ready ? '✅ READY! (TAP TO UNDO)' : '✋ I\'M READY';
    const boss = mp.role === 'host' || (mp.net.host && mp.role !== 'join');
    $('#room-go').style.display = boss ? '' : 'none';
    $('#room-msg').textContent = boss ? (ps.length > 1 ? (nReady >= ps.length ? 'Everyone\'s ready! Choose the game, then START.' : `Waiting for ${ps.length - nReady} to ready up. You can choose the game now: START unlocks when everyone's ready.`) : 'Invite your mates (or tell them the code). Start when everyone\'s in.') : 'Waiting for the host to choose the game…';
  };
  async function mpConnect(code) {
    const { Net, RELAY } = await import('./net.js');
    if (mp.net) mp.net.leave();
    const net = mp.net = new Net(); net.char = mpChar;
    const relay = q.get('relay') || RELAY;
    mp.RO = mp.RO || await import('./roomopts.js');      // (fetched BEFORE connecting: while it loaded, the host's "we're playing X" could arrive with nobody listening, and a guest sat on "waiting for the host" for ever)
    // a guest hears which game to load (the host starting one, or one already going when you join or come back): one
    // handler from the moment the line's open, so it can't be missed
    net.on.setup = (m) => { if (mp.role === 'host' || window.__setupSeen || !m || typeof m.place !== 'string' || typeof m.mode !== 'string') return; window.__setupSeen = true; window.__setupWarm = m.warm === undefined ? null : !!m.warm; /* (from a game already going: whether it is still the warm-up) */ place = m.place; mode = m.mode; const rm = $('#room-msg'); if (rm) rm.textContent = 'Off we go!'; window.__menuIntro(() => window.__menuGo(true)); };
    const w = await net.connect(code, nameOf(), relay);
    // everyone says who they're playing as; a new arrival gets told by everyone already in
    const hi = (to) => net.send({ t: 'hi', to, name: nameOf(), char: mpChar, v: window.GAME_BUILD });
    const vNum = (v) => String(v || '0').split('.').map(Number).reduce((a, n) => a * 1000 + (n || 0), 0);
    net.on.hi = (m, p) => { if (p) { p.char = m.char; p.name = m.name; } lobby();
      // a mate on a newer version: update now (straight back into this room), so you both see the same things
      if (m.v && vNum(m.v) > vNum(window.GAME_BUILD) && !window.__updating) { window.__updating = true; mpStatus('Your mate has a newer version. Updating…'); setTimeout(() => { location.href = location.pathname + '?lobby=' + encodeURIComponent(code) + '&u=' + Date.now(); }, 1200); } };
    mp.RO.resetOpts(); mp.ready = false; mp.locked = false; mp.seenCards = new Set(); roomChat.length = 0; drawChat(); roomUnread = 0; drawBadge();
    const isBoss = () => mp.role === 'host' || (net.host && mp.role !== 'join');
    const sendOpts = (to) => net.send(to ? { t: 'ropts', to, o: { ...mp.RO.roomOpts }, lock: mp.locked ? 1 : 0 } : { t: 'ropts', o: { ...mp.RO.roomOpts }, lock: mp.locked ? 1 : 0 });      // (the room only reads "to" near the start)
    net.on.join = (m) => { hi(m.id); if (isBoss()) { const n = net.players.size + 1, max = Math.min(net.max || 12, mp.RO.optNum('max'));
        if (mp.locked || n > max) { net.send({ t: 'kick', to: m.id, why: mp.locked ? 'locked' : 'full' }); } else { sendOpts(m.id); if (mp.ready) net.send({ t: 'ready', r: 1, to: m.id }); } }
      else if (mp.ready) net.send({ t: 'ready', r: 1, to: m.id });
      sysChat(`${(m.name || 'Someone')} joined`); sndUI('join'); lobby(); };
    net.on.leave = (m) => { sysChat('Someone left'); sndUI('leave'); lobby(); }; net.on.host = () => { lobby(); if (isBoss()) sendOpts(); };
    // the lobby: ready ticks, the host's room options, chat, the host removing someone (only the host's word counts)
    net.on.ready = (m, p) => { if (p) { p.ready = !!m.r; if (m.r) sndUI('ready'); lobby(); } };
    net.on.ropts = (m, p) => { if (!p || !p.host) return; mp.RO.setOpts(m.o); mp.locked = !!m.lock; lobby(); };
    net.on.kick = (m, p) => { if (!p || !p.host || (m.to && m.to !== net.id)) return; const why = m.why === 'locked' ? 'The host has locked the room.' : m.why === 'full' ? 'The room is full.' : 'The host removed you from the room.';
      try { localStorage.removeItem('rs_mp_last'); } catch (e) {} net.leave(); mp.net = null; mp.role = null; $('#mp-code-chip').textContent = ''; show('mp', -1); mpStatus(why); sndUI('kick'); };
    net.on.chat = (m, p) => { const st = document.getElementById('start'); if (!st || st.classList.contains('gone')) return; addChat(p ? p.name : 'Someone', String(m.s || '').slice(0, 90)); };      // (in the menus: on the room screen or choosing the game; in the game it's the game's own chat)
    clearInterval(mp.askT); mp.askT = setInterval(() => { if (mp.net !== net || !net.connected) { clearInterval(mp.askT); return; } if (!isBoss() && !window.__setupSeen && document.querySelector('.screen.on[data-s="room"]')) net.send({ t: 'whatgame' }); }, 3000);      // (a guest waiting in the room keeps asking: a host already playing answers with the game, so nobody's left on "waiting" by a lost message)
    hi(); try { localStorage.setItem('rs_mp_last', JSON.stringify({ code, t: Date.now() })); } catch (e) {}      // (for the REJOIN button, if this page gets closed)
    return w;
  }
  $('#mp-host2').addEventListener('click', async () => {
    const { newCode } = await import('./net.js'); const code = newCode();
    mpStatus('Setting up your room…');
    try { await mpConnect(code); mp.role = 'host'; $('#mp-code-chip').textContent = `👥 ROOM ${code}`; mpStatus(''); show('room'); lobby();
    } catch (e) { mpStatus("Couldn't connect. Check your internet and try again."); }
  });
  $('#room-go').addEventListener('click', () => { drawPlace(); show('place'); });
  // ---- the lobby extras
  const roomChat = [];
  const drawChat = () => { const el = $('#room-chat-log'); if (!el) return; el.innerHTML = roomChat.map(c => c.sys ? `<p class="sys">${esc(c.s)}</p>` : `<p><b>${esc(c.who)}:</b> ${esc(c.s)}</p>`).join('') || '<p class="sys">Chat to the room while you wait…</p>'; el.scrollTop = el.scrollHeight; };
  const addChat = (who, s2, mine) => { if (!s2) return; roomChat.push({ who, s: s2 }); if (roomChat.length > 40) roomChat.shift(); drawChat(); if (!mine && !$('#room-chat').classList.contains('open')) { roomUnread++; drawBadge(); } blip(700, 0.04, 'triangle', 0.05); };
  const sysChat = (s2) => { roomChat.push({ sys: 1, s: s2 }); if (roomChat.length > 40) roomChat.shift(); drawChat(); };
  const sendChat = () => { const i = $('#room-chat-in'), t = (i.value || '').trim().slice(0, 90); if (!t || !mp.net) return; mp.net.send({ t: 'chat', s: t }); addChat(nameOf(), t, true); i.value = ''; };
  $('#room-chat-send').addEventListener('click', sendChat); $('#room-chat-in').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
  $('#room-ready').addEventListener('click', () => { if (!mp.net) return; mp.ready = !mp.ready; mp.net.send({ t: 'ready', r: mp.ready ? 1 : 0 }); if (mp.ready) sndUI('ready'); else blip(500, 0.08); lobby(); });
  // the lobby's own sounds (audio.js: joining, leaving, ready, being removed)
  const sndUI = (n) => { import('./audio.js').then(A => { try { A.initAudio(); A.sfx(n, null, 0.7); } catch (e) {} }).catch(() => {}); };
  $('#room-players').addEventListener('click', (e) => { const k = e.target.closest('[data-kick]'); if (!k || !mp.net) return; const p = mp.net.players.get(k.dataset.kick) || [...mp.net.players.values()].find(x => String(x.id) === k.dataset.kick);
    if (!p || !confirm(`Remove ${p.name || 'this player'} from the room?`)) return; mp.net.send({ t: 'kick', to: p.id, why: 'kick' }); sysChat(`${p.name || 'A player'} was removed`); });
  // the host's room options (everyone else sees them, greyed)
  const drawRoomOpts = (boss) => { const el = $('#room-opts'), RO = mp.RO, ob = $('#room-opts-btn'); if (!el || !RO) return;
    ob.hidden = !boss; if (!boss) { if (el.classList.contains('open')) closeSheets(); el.innerHTML = ''; return; }      // (only the host sees the room's options)
    el.innerHTML = `<div class="sh-head"><b>⚙️ ROOM OPTIONS</b><button type="button" class="sh-close" data-close="opts">✕ CLOSE</button></div>` + RO.OPT_DEFS.map(d => `${d.imp && d.k === RO.OPT_DEFS.find(x => x.imp).k ? '<h5>🔪 FOR IMPOSTER</h5>' : ''}<div class="ro"><span>${d.ico} ${d.imp ? d.name.replace('IMPOSTER: ', '') : d.name}</span><div class="seg">${d.vals.map(v => `<button type="button" data-ok="${d.k}" data-ov="${v[0]}" class="${RO.roomOpts[d.k] === v[0] ? 'on' : ''}"${boss ? '' : ' disabled'}>${v[1]}</button>`).join('')}</div></div>`).join('')
      + (boss ? `<button type="button" class="lock${mp.locked ? ' on' : ''}" data-lock="1">${mp.locked ? '🔒 ROOM LOCKED: NOBODY ELSE CAN JOIN' : '🔓 ROOM OPEN: TAP TO LOCK IT'}</button>` : '') + `<p class="note">Options count in this room's games. Playing on your own is always the normal game.</p>`; };
  const sheets = () => [[$('#room-opts-btn'), $('#room-opts')], [$('#room-chat-btn'), $('#room-chat')], [$('#room-count'), $('#room-who')]];
  const toggle = (btn, el, on) => { on = on === undefined ? !el.classList.contains('open') : on;
    for (const [b2, e2] of sheets()) if (e2 !== el && e2.classList.contains('open')) { e2.classList.remove('open'); b2.setAttribute('aria-expanded', 'false'); }      // (one at a time)
    el.classList.toggle('open', on); btn.setAttribute('aria-expanded', on ? 'true' : 'false'); $('#room-sheet-bg').classList.toggle('on', sheets().some(([, e2]) => e2.classList.contains('open'))); return on; };
  const closeSheets = () => { for (const [b2, e2] of sheets()) { e2.classList.remove('open'); b2.setAttribute('aria-expanded', 'false'); } $('#room-sheet-bg').classList.remove('on'); };
  $('#room-sheet-bg').addEventListener('click', closeSheets);
  $('#room-chat').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheets(); });
  $('#room-who').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheets(); });
  $('#room-count').addEventListener('click', () => { toggle($('#room-count'), $('#room-who')); blip(600, 0.05); });
  $('#room-opts-btn').addEventListener('click', () => { toggle($('#room-opts-btn'), $('#room-opts')); blip(600, 0.05); });
  $('#room-chat-btn').addEventListener('click', () => { if (toggle($('#room-chat-btn'), $('#room-chat'))) { roomUnread = 0; drawBadge(); const l = $('#room-chat-log'); l.scrollTop = l.scrollHeight; } blip(600, 0.05); });
  let roomUnread = 0; const drawBadge = () => { const b = $('#room-chat-badge'); b.hidden = !roomUnread; b.textContent = roomUnread > 9 ? '9+' : String(roomUnread); };
  $('#room-opts').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) { closeSheets(); return; } const b = e.target.closest('button'); if (!b || b.disabled || !mp.net || !mp.RO) return;
    if (b.dataset.lock) mp.locked = !mp.locked; else mp.RO.setOpts({ [b.dataset.ok]: b.dataset.ov });
    mp.net.send({ t: 'ropts', o: { ...mp.RO.roomOpts }, lock: mp.locked ? 1 : 0 }); blip(820, 0.05); lobby(); });
  // INVITE: a link straight into this room (the phone's share sheet, or copied)
  const inviteURL = () => `${location.origin}${location.pathname}?join=${encodeURIComponent(mp.net ? mp.net.code : '')}`;
  const linkMsg = (t) => { const m = $('#room-link-msg'); m.textContent = t; clearTimeout(m._t); m._t = setTimeout(() => { m.textContent = ''; }, 4000); };
  const copyLink = async () => { const u = inviteURL(); try { await navigator.clipboard.writeText(u); linkMsg('Link copied! Paste it to your mates.'); } catch (e) { const t = document.createElement('textarea'); t.value = u; document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (er) {} t.remove(); linkMsg(ok ? 'Link copied! Paste it to your mates.' : u); } };
  $('#room-copy').addEventListener('click', copyLink);
  $('#room-share').addEventListener('click', async () => { if (!mp.net) return; const u = inviteURL();
    if (navigator.share) { try { await navigator.share({ title: 'Ronnie Simulator', text: `Come and eat with me! Room ${mp.net.code}`, url: u }); linkMsg('Invite sent!'); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    copyLink(); });
  $('#room-leave').addEventListener('click', () => { closeSheets(); try { localStorage.removeItem('rs_mp_last'); sessionStorage.removeItem('rs_fakes'); } catch (e) {} if (window.__fakes) { window.__fakes.stop(); window.__fakes = null; drawFakes(); } if (mp.net) mp.net.leave(); mp.net = null; mp.role = null; $('#mp-code-chip').textContent = ''; show('mp', -1); });
  $('#mp-code2').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  $('#mp-join2').addEventListener('click', async () => {
    const code = ($('#mp-code2').value || '').toUpperCase().trim();
    if (!/^[A-Z0-9]{4}$/.test(code)) { mpStatus('Type the 4-letter code your mate gave you.'); return; }
    mpStatus('Connecting…');
    try { const w = await mpConnect(code); mp.role = 'join';
      if (w.host) { mpStatus(`Nobody's in room <b>${code}</b> yet. Check the code with your mate.`); mp.net.leave(); mp.net = null; mp.role = null; lobby(); return; }
      mpStatus(''); show('room'); lobby();
    } catch (e) { mpStatus("Couldn't connect. Check your internet and try again."); }
  });

  // back to the lobby after a game (?lobby=CODE): straight back into the same room, as the same name and character
  // straight back into a room: after an update (?lobby=CODE), or the REJOIN button (a phone that closed the page, or
  // dropped out of the game). The room knows this device: name, score and progress come back
  const rejoin = async (code) => {
    // (whoever was the host is still the host: the room hands "host" on to someone else while their page reloads)
    let was = false; try { was = sessionStorage.getItem('rs_was_host') === '1'; } catch (e) {}
    try { const w = await mpConnect(code); mp.role = w.host || was ? 'host' : 'join'; $('#mp-code-chip').textContent = `👥 ROOM ${code}`; show('room'); lobby();
      const ft = fakesSaved(); if (ft && ft.code === code && ft.n > 0) startFakes(code, ft.n);      // (a developer's test room: its fake players come back too)
    } catch (e) { show('mp'); mpStatus("Couldn't get back into the room. Check your internet and try again."); }
  };
  // ---- DEVELOPER MODE'S TEST ROOM: fake players (fakeplayers.js) in a real room, so every mode can be tried with a
  // crowd on your own. Opened from the dev panel (?devmp=N); kept for this tab's session, so they come back after each game
  const fakesSaved = () => { try { return JSON.parse(sessionStorage.getItem('rs_fakes') || 'null'); } catch (e) { return null; } };
  const saveFakes = () => { try { const f = window.__fakes; if (f && f.code) sessionStorage.setItem('rs_fakes', JSON.stringify({ code: f.code, n: f.bots.length, pids: f.pids() })); else sessionStorage.removeItem('rs_fakes'); } catch (e) {} };
  async function startFakes(code, n) {
    const m = await import('./fakeplayers.js'), ft = fakesSaved();
    if (window.__fakes) window.__fakes.stop();
    window.__fakes = m.startFakePlayers(code, n, q.get('relay') || undefined, ft && ft.code === code ? ft.pids || [] : []);
    saveFakes(); drawFakes();
  }
  const drawFakes = () => { const el = $('#room-fakes'); if (!el) return; const f = window.__fakes; el.hidden = !f;
    // (the phone closed the game last time? what it was doing then, for whoever's testing: it's in the crash report too)
    { const lk = $('#room-lastkill'); let k = null; try { k = JSON.parse(localStorage.getItem('rs_lastkill') || 'null'); } catch (e) {}
      if (lk) { const fresh = k && Date.now() - k.at < 6 * 3600 * 1000; lk.hidden = !f || !fresh;
        if (f && fresh) lk.innerHTML = `<b>⚠ LAST TIME YOUR PHONE CLOSED THE GAME</b><br>while: ${String(k.st || 'unknown').replace(/</g, '')}${k.p ? ' · ' + k.p : ''}${k.md ? ' · ' + k.md : ''}${k.fk ? ' · ' + k.fk + ' fake players' : ''}${k.mem ? ' · ' + k.mem + 'MB' : ''} · v${String(k.v || '?').replace(/</g, '')}`; } }
    if (f) el.querySelector('b').textContent = f.bots.length; };
  $('#room-fakes').addEventListener('click', (e) => { const b = e.target.closest('button'); const f = window.__fakes; if (!b || !f) return;
    if (b.dataset.f === 'x') { f.stop(); window.__fakes = null; try { sessionStorage.removeItem('rs_fakes'); } catch (er) {} drawFakes(); return; }
    f.set(f.bots.length + (+b.dataset.f)); saveFakes(); drawFakes(); blip(700, 0.04); });
  // (the dev panel's MULTIPLAYER TEST: host a new room and fill it)
  { let req = null, ok = false; try { req = JSON.parse(sessionStorage.getItem('rs_devmp_req') || 'null'); ok = sessionStorage.getItem('rs_devmp_ok') === '1' && localStorage.getItem('rs_dev_locked') !== '1'; } catch (e) {}
    // (asked for in the address, or in this tab's storage in the last two minutes: the address can be lost on the way,
    // by an update reload or an old copy of the page, and you'd just have landed on the title screen)
    const n = Math.min(11, +(q.get('devmp') || 0) || (req && Date.now() - req.t < 120000 ? +req.n || 0 : 0));
    // (the request stays in the tab, and the address keeps ?devmp, until the room's really open: the update check can reload
    // the page into a newer version part-way through setting up, and that reload used to land on the title screen)
    const open = async () => {
      if (!($('#mp-myname').value || '').trim() && !myName) $('#mp-myname').value = 'DEV';
      show('mp'); mpStatus(`🤖 Setting up a test room with ${n} fake player${n === 1 ? '' : 's'}…`);
      try { const { newCode } = await import('./net.js'); const code = newCode();
        await mpConnect(code); mp.role = 'host'; $('#mp-code-chip').textContent = `👥 ROOM ${code}`; mpStatus(''); show('room'); lobby();
        try { sessionStorage.removeItem('rs_devmp_req'); history.replaceState(null, '', location.pathname); } catch (e) {}
        try { sessionStorage.removeItem('rs_fakes'); } catch (e) {} await startFakes(code, n);
      } catch (e) { console.warn('test room', e); try { window.__crash && window.__crash('caught', e, { where: 'dev test room' }); } catch (er) {}
        show('mp'); mpStatus(`Couldn't set up the test room (${String(e && e.message || e).slice(0, 80)}). <button type="button" id="devmp-retry" class="midbtn">🔄 TRY AGAIN</button>`);
        const rb = document.getElementById('devmp-retry'); if (rb) rb.addEventListener('click', () => open()); } };
    if (n > 0 && ok) { window.__devmpOpening = true; setTimeout(open, 0); } }
  // an invite link (?join=CODE): straight into that room (after your name and who you're playing as, if it's your first time)
  const joinCode = (q.get('join') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  if (joinCode.length === 4 && !q.get('lobby') && !q.get('go')) setTimeout(() => { try { history.replaceState(null, '', location.pathname); } catch (e) {}
    $('#mp-code2').value = joinCode; mp.pendingJoin = joinCode;
    if (myName) { $('#mp-who').textContent = `You're playing as ${mp.char().n}`; show('mp'); mpStatus(`Joining room <b>${joinCode}</b>…`); $('#mp-join2').click(); }
    else { show('mpname'); setTimeout(() => { try { $('#mp-myname').focus(); } catch (e) {} }, 450); } }, 700);
  if (q.get('lobby')) setTimeout(() => { const code = q.get('lobby').toUpperCase().slice(0, 6); try { history.replaceState(null, '', location.pathname); } catch (e) {} rejoin(code); }, 600);
  else { let last = null; try { last = JSON.parse(localStorage.getItem('rs_mp_last') || 'null'); } catch (e) {}
    if (last && last.code && Date.now() - last.t < 30 * 60000) { const b = $('#rejoin-btn'); b.hidden = false; b.querySelector('b').textContent = last.code;
      b.addEventListener('click', () => { b.hidden = true; mpStatus('Getting you back in…'); show('mp'); rejoin(last.code); }); } }
  // ---- THE GAME CLOSED ON YOU: if the phone shut the game (or it hit an error) in the last 15 minutes, the title screen
  // says what it was doing, so it can be told to whoever's fixing it (crash.js keeps rs_lastkill and rs_lasterr)
  if (!quick && !q.get('lobby')) { const get = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
    const fresh = (o) => o && o.at && Date.now() - o.at < 15 * 60000, kill = get('rs_lastkill'), err = get('rs_lasterr'), clean = (t) => String(t || '').replace(/[<>&]/g, '').slice(0, 160);
    if (fresh(kill) || fresh(err)) { const box = document.createElement('div'); box.id = 'last-close';
      box.style.cssText = 'margin:8px auto 0;max-width:340px;padding:8px 32px 8px 10px;border-radius:12px;background:#ffd400;color:#111;font:700 11px/1.35 Arial,sans-serif;text-align:left;position:relative;pointer-events:auto';
      const lines = [];
      if (fresh(kill)) lines.push(`<b>⚠ YOUR PHONE CLOSED THE GAME</b><br>while: ${clean(kill.st) || 'unknown'}${kill.p ? ' · ' + clean(kill.p) : ''}${kill.md ? ' · ' + clean(kill.md) : ''}${kill.fk ? ' · ' + (+kill.fk) + ' fake players' : ''}${kill.mem ? ' · ' + (+kill.mem) + 'MB' : ''} · v${clean(kill.v)}`);
      if (fresh(err)) lines.push(`<b>⚠ LAST ERROR</b> (${clean(err.k)}${err.md ? ' · ' + clean(err.md) : ''}): ${clean(err.m)}${err.s ? ' · ' + clean(err.s) : ''}`);
      box.innerHTML = lines.join('<br>') + '<button type="button" aria-label="Close" style="position:absolute;right:4px;top:4px;width:26px;height:26px;border:0;border-radius:50%;background:#111;color:#fff;font:900 12px Arial">✕</button>';
      box.querySelector('button').addEventListener('click', () => { box.remove(); try { localStorage.removeItem('rs_lastkill'); localStorage.removeItem('rs_lasterr'); } catch (e) {} });
      const rb = $('#rejoin-btn'); if (rb && rb.parentNode) rb.parentNode.insertBefore(box, rb.nextSibling); } }

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
      if (window.ronnieHero && window.ronnieHero.inVR && window.ronnieHero.handOff) window.ronnieHero.handOff();   // (in the headset: the game carries on in the same VR session)
      try { if (place !== 'grid') localStorage.setItem('rs_menu', JSON.stringify({ place, mode })); } catch (e) {}
      if (window.ronnieMP && window.ronnieMP.role === 'host' && window.ronnieMP.net) window.ronnieMP.net.send({ t: 'setup', place, mode });   // everyone waiting in the lobby comes too
      let finished = false;
      const finish = () => { if (finished) return; finished = true;
        start.classList.add('gone');
        if (window.ronnieHero) window.ronnieHero.stop();
        document.body.classList.add('ready');
        const p = ALLPLACES.find(p => p.id === place), m = modeInfo(mode);
        const tag = document.getElementById('ready-tag'); if (tag) tag.textContent = `${p.name} · ${m.name}`;
        fillCard(p, m);
        resolve({ place, mode });
      };
      try { if (instant !== true) chompSfx(); } catch (e) {}
      // straight away: the button squashes and a loading screen comes up (with its own animation), THEN the
      // heavy level-building starts, so the screen never just freezes on you. (Nothing on the way can stop it: a
      // loading-screen hiccup used to leave LET'S EAT doing nothing for ever, not even loading)
      const ls = document.getElementById('loadscreen');
      try { if (ls) showLoading(ls, place, mode); } catch (e) { console.warn('loading screen', e); try { ls.classList.add('on'); } catch (e2) {} }
      try { $('#go').classList.add('pressed'); } catch (e) {}
      // (in the headset the page's own animation frames are paused, so don't wait for one: that's why PLAY did nothing in
      // VR. On a phone a frame can be held back too (Low Power Mode, a page that's just come back), so there's a backstop)
      if (window.ronnieHero && window.ronnieHero.inVR) setTimeout(finish, 60);
      else { requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(finish, 60))); setTimeout(finish, 700); }
    };
    // ---- LOADING: the place's colours, this mode's card, food going into a mouth, the steps, a tip every few seconds
    const showLoading = (ls, place, mode) => {
      const p = ALLPLACES.find(p => p.id === place) || ALLPLACES[0], m = modeInfo(mode), card = CARDS[mode] || CARDS[cardOf(mode)] || CARDS.everyone;
      ls.style.setProperty('--ac', card.ac); ls.style.setProperty('--ac2', card.ac2); if (p.bg) ls.style.setProperty('--lsbg', p.bg);
      $('#ls-ico').textContent = m.ico || p.ico; $('#ls-place').textContent = `${p.ico} ${p.name} · ${m.name}`;
      $('#ls-chips').innerHTML = (card.chips || []).map(([i, t]) => `<b>${i} ${t}</b>`).join('');
      const FOOD = ['🍔', '🍕', '🌭', '🍟', '🍩', '🌮', '🍗', '🥙', '🧁', '🍪', '🥐', '🍺'];
      ls.querySelector('.lsbelt').innerHTML = FOOD.slice(0, 6).map((f, i) => `<span style="animation-delay:${(-i * 0.4).toFixed(1)}s">${f}</span>`).join('');
      ls.querySelector('.lsfall').innerHTML = Array.from({ length: 14 }, (_, i) => `<span style="left:${(i * 7.3 + (i % 3) * 2) % 100}%;animation-delay:${(-i * 0.53).toFixed(2)}s;animation-duration:${(6 + (i % 5)).toFixed(0)}s">${FOOD[i % FOOD.length]}</span>`).join('');
      const tips = loadTips(mode); let ti = Math.floor(Math.random() * tips.length);
      const hint = $('#ls-hint'); hint.textContent = tips[ti]; hint.classList.remove('out');
      clearInterval(ls._tips); ls._tips = setInterval(() => { if (!ls.classList.contains('on') || ls.classList.contains('no3d')) { clearInterval(ls._tips); return; }
        hint.classList.add('out'); setTimeout(() => { if (ls.classList.contains('no3d')) return; ti = (ti + 1) % tips.length; hint.textContent = tips[ti]; hint.classList.remove('out'); }, 300); }, 3200);
      ls.classList.remove('no3d', 'fade'); window.__ls('squad'); ls.classList.add('on');
    };
    const TIPS = {
      all: ['Tip: tap 🏃 SPRINT to go faster', 'Tip: grab food and press EAT', 'Tip: THROW food at Tommy. He deserves it.', 'Tip: in VR, click the left stick to sprint',
        'Ronnie is warming up his jaw…', 'Quick bites build a COMBO. Don\'t stop chewing.', 'Fruit bounces. Burgers go splat. Choose your weapon.',
        'Tommy has still never caught anything thrown at him.', 'Lewis is out the front checking his car. Again.', 'Harry is on the apps. Swiping right. On everyone.',
        'Aidan is three Guinness deep and growing a beard as we speak.', 'Dylan\'s knee is fine. Probably. Don\'t look at it.', 'Ben is checking his hairline in the window.',
        'Ethan is mid FIFA rage. Give him a minute.', 'Lewis has made a protein shake. It makes you grow FASTER.', 'Chewing sounds have been turned up to 11.',
        'Tip: ⚙️ SOUND & FEEL has a slider for everything', 'Tip: the 🎭 button does emotes. Use them wisely. Or don\'t.'],
      imposter: ['Tip: do your jobs to win, or find the imposter first', 'Tip: dead? You\'re a ghost. Float through walls and spy on everyone.', 'Tip: 🔔 the bell calls a meeting', 'Tip: lights out? Find the fuse box', 'The imposter is always the quiet one. Or the loud one.'],
      runpub: ['Tip: pour the right drink, earn the tip', 'Tip: kids want soft drinks. Do NOT give them a Guinness.', 'Tip: a spilt pint needs mopping before someone slips', 'Ben is watching the till.'],
      chonkoff: ['Tip: 60 seconds. Eat everything.', 'Tip: chain bites for a combo', 'Your personal best is watching you.'], chonkoff2: ['Tip: pass the phone. No peeking.', 'Most eaten wins. Chew faster.'], chonkoffr: ['Ranked: beat everyone in the room to climb the leaderboard', 'Tip: combos. Combos win ranked games.', 'Your rating goes up for every mate you out-eat'],
      sweep: ['Tip: fill the trolley, dodge security', 'Tip: big items are worth more'], date: ['Tip: only eat when she looks away', 'Three strikes and the date\'s over', 'Tip: ACT NATURAL just as she turns round', 'Tip: listen for the flush'],
      bbq: ['Tip: pinch it off the grill while Ian\'s busy', 'Tip: when he gets you, tap like your life depends on it', 'Tip: hit him 10 to 15 times and over he goes'], roam: ['Tip: no attacks, no timer. Have a proper look round.'], roam0: ['Tip: the place to yourself. Have a proper look round.'],
    };
    window.__lsShow = (place, mode) => showLoading(document.getElementById('loadscreen'), place, mode);      // (tests)
    const loadTips = (mode) => (TIPS[mode] || TIPS[cardOf(mode)] || []).concat(TIPS.all);
    // ---- the panel over the level before you play: this game's own card (its colour, icon and the key facts)
    const CARDS = {
      everyone: { ac: '#ffd400', ac2: '#ff8a00', chips: [['🍔', 'Eat it all'], ['⚔️', 'Squad attacks'], ['🏆', '10 sizes']] },
      sweep:    { ac: '#4fb3ff', ac2: '#1e4ea8', chips: [['⏱️', '90 seconds'], ['🛒', 'Fill the trolley'], ['👮', 'Dodge security']] },
      bbq:      { ac: '#ff9a3c', ac2: '#c2410c', chips: [['🍖', 'Off the grill'], ['🥗', 'Fight off Ian'], ['💪', 'Get big']] },
      date:     { ac: '#e879f9', ac2: '#86198f', chips: [['👀', 'When she looks away'], ['❌', '3 strikes'], ['🍷', 'Date night']] },
      chonkoff: { ac: '#facc15', ac2: '#ca8a04', chips: [['⏱️', '60 seconds'], ['🍟', 'Eat everything'], ['🏆', 'Beat your best']] },
      chonkoffr:{ ac: '#ffb020', ac2: '#b45309', chips: [['⏱️', '60 seconds'], ['👥', 'Everyone at once'], ['🏅', 'Your rating']] },
      chonkoff2:{ ac: '#facc15', ac2: '#ca8a04', chips: [['⏱️', '60s each'], ['📱', 'Pass and play'], ['🏆', 'Most eaten wins']] },
      runpub:   { ac: '#39ff14', ac2: '#15803d', chips: [['⏱️', '6 min shift'], ['🍺', 'Pour the drinks'], ['💷', 'Earn tips']] },
      imposter: { ac: '#ff3b3b', ac2: '#7f1d1d', ink: '#fff', chips: [['🔪', 'Find the imposter'], ['🔧', 'Do your jobs'], ['🔔', 'Call a meeting']] },
      prophunt: { ac: '#b388ff', ac2: '#4a148c', ink: '#fff', chips: [['🎭', 'Become anything'], ['🔍', 'Find the hiders'], ['📯', 'Taunt for points']] },
      roam:     { ac: '#7dd3fc', ac2: '#0369a1', chips: [['🚶', 'Explore'], ['🕊️', 'No attacks'], ['♾️', 'No timer']] },
      boss:     { ac: '#ff4d4d', ac2: '#7a0010', ink: '#fff', chips: [['👹', 'Giant boss'], ['🍔', 'Throw food'], ['🤝', 'Solo or co-op']] },      // (BOSS FIGHT)
      snd:      { ac: '#ff9f1c', ac2: '#7a2e00', ink: '#fff', chips: [['🛒', 'Buy guns'], ['💣', 'Plant or defuse'], ['🤖', 'Bots fill teams']] },      // (SEARCH AND DESTROY)
    };
    // developer mode (the code was right): its own start card, a hacker's terminal, instead of the game's
    const DEV = (() => { try { return sessionStorage.getItem('rs_dev') === '1' && localStorage.getItem('rs_dev_locked') !== '1'; } catch (e) { return false; } })();
    const devCard = () => { const ui = document.getElementById('ui'); if (!ui) return; document.body.classList.add('devmode');
      $('#ui-place').textContent = '>_ ' + $('#ui-place').textContent.replace(/^>_ /, '').replace(/^\S+\s+/, ''); $('#ui-ico').textContent = '💻'; $('#ui-mode').innerHTML = '<span class="dv-glitch" data-t="DEVELOPER MODE">DEVELOPER MODE</span><span class="dv-cur">█</span>';
      $('#ui-chips').innerHTML = [['🎭', 'EMOTES'], ['💥', 'ATTACKS'], ['🔪', 'IMPOSTER JOBS'], ['🛡️', 'NO RANDOM ATTACKS']].map(([e, t]) => `<span><i>${e}</i>${t}</span>`).join('');
      if (!ui.querySelector('.dv-rain')) { const cv = document.createElement('canvas'); cv.className = 'dv-rain'; ui.prepend(cv); const g = cv.getContext('2d'); let cols = [];
        const tick = () => { if (!document.body.classList.contains('devmode') || !cv.isConnected || document.body.classList.contains('flat') || !ui.offsetParent) { if (document.body.classList.contains('flat')) cv.remove(); return; }      // (stops, and lets go of its canvas, once you're in the game) const r = ui.getBoundingClientRect(); if (cv.width !== Math.round(r.width) || cv.height !== Math.round(r.height)) { cv.width = Math.round(r.width); cv.height = Math.round(r.height); cols = Array.from({ length: Math.ceil(cv.width / 14) }, () => Math.random() * cv.height); }
          g.fillStyle = 'rgba(0,8,2,0.16)'; g.fillRect(0, 0, cv.width, cv.height); g.font = '13px monospace'; cols.forEach((y, i) => { g.fillStyle = Math.random() < 0.06 ? '#d8ffd8' : '#16c60c'; { const CH = '01アイウエオカキクケコサシスセソ<>/{}#$'; g.fillText(CH[Math.floor(Math.random() * CH.length)], i * 14, y); } cols[i] = y > cv.height + Math.random() * 400 ? 0 : y + 14; });
          setTimeout(() => requestAnimationFrame(tick), 55); };
        tick(); }
      const boot = $('#status'); if (boot && !boot.dataset.dv) { boot.dataset.dv = 1; const L = ['> ACCESS GRANTED', '> LOADING TEST BENCH...', '> RANDOM ATTACKS: DISABLED', '> READY.']; let i = 0; const nx = () => { if (i < L.length) { boot.textContent = L.slice(0, ++i).join('   '); setTimeout(nx, 450); } }; nx(); } };
    const fillCard = (p, m) => { const ui = document.getElementById('ui'); if (!ui) return;
      const id = String(mode).replace(/^imposter.*/, 'imposter').replace(/^roam.*/, 'roam'), c = CARDS[id] || CARDS.everyone;
      ui.style.setProperty('--ac', c.ac); ui.style.setProperty('--ac2', c.ac2); ui.style.setProperty('--ink', c.ink || '#111');
      $('#ui-place').textContent = `${p.ico} ${p.name}`; $('#ui-ico').textContent = m.ico || '🍔'; $('#ui-mode').textContent = m.name;
      const mpr = window.ronnieMP && window.ronnieMP.role; $('#ui-who').textContent = mpr ? '👥' : '';
      $('#ui-chips').innerHTML = c.chips.map(([e, t]) => `<span><i>${e}</i>${t}</span>`).join('');
      let seen = false; try { seen = !!localStorage.getItem('rs_seen_' + mode); } catch (e) {}
      $('#ui-howto-btn').classList.toggle('fresh', !seen);      // (a game you've never played: the HOW TO PLAY button stands out)
      if (DEV) devCard();
    };
    // ---- before it starts: a few pages on how THIS game works (arrows between them, then I'M READY)
    const intro = (then, inUi) => {
      const P = inUi ? '#uh-' : '#intro-';      // (on the menu's own page, or inside the panel over the level)
      const vr = !!(window.ronnieHero && window.ronnieHero.inVR) || (inUi && document.body.classList.contains('vr-capable')), pc = !vr && !touchy;
      const C = vr ? { move: '🕹️ Left stick to walk (click it in to sprint), right stick to turn', grab: '✊ Grip or trigger to grab, with either hand (you can hold two things)', eat: '😋 Bring food up to your mouth to take a bite', throw: '🎯 Swing and let go to throw', slap: '✋ Swing your hand into someone to slap them', pause: '☰ Menu button to pause' }
        : pc ? { move: '⌨️ W A S D to walk, click and drag to look round', grab: '👆 Click food to pick it up', eat: '😋 E to eat (or drink)', throw: '🎯 Space or F to throw', slap: '✋ Click anyone nearby to slap them', pause: '⏸ Esc to pause' }
        : { move: '🕹️ Joystick to walk, drag the screen to look round', grab: '👆 Tap food to pick it up', eat: '😋 EAT button to take a bite', throw: '🎯 THROW button to chuck it', slap: '✋ Tap anyone nearby to slap them', pause: '⏸ PAUSE (top right) any time' };
      const controls = { pic: 'controls', title: 'THE CONTROLS', lines: [C.move, C.grab, C.eat, C.throw] };
      const PAGES = {
        everyone: [
          { pic: 'meter', title: 'THE WHOLE SQUAD', lines: ['Eat as much as you can. Every bite fills your EAT METER', 'Grab the glowing POWER-UPS: HOOVER MODE, DOUBLE CHONK, FOOD RAIN, SUPER SPEED', 'Fill it to grow: ten stages, from Little Ronnie to the biggest Ronnie ever', 'The squad are all here, and they WILL try to stop you'] },
          controls,
          { pic: 'squad', who: null, title: 'THE ATTACKS', lines: ['The red bar counts down to the next attack', 'A banner tells you who\'s coming, and an arrow shows where they are', 'Each of the lads has his own attack. Throw food at them or slap them to fight back'] },
          { pic: 'emoji:🥦', title: 'WATCH OUT', lines: [vr ? '🥦 Broccoli gets thrown at you: swat it with a fast swing' : '🥦 Broccoli gets thrown at you: ' + (pc ? 'click' : 'tap') + ' it to swat it away', '🥤 MONSTOR cans count too: chug one for MANGO LOCO MODE', C.pause] } ],
        sweep: [
          { pic: 'lidl', title: 'SUPERMARKET SWEEP', lines: ['90 seconds in Lidl with a trolley', 'Everything you pick up goes straight in your trolley', 'Bigger, better food is worth more calories. Most calories wins'] },
          controls,
          { pic: 'lidl', title: 'GREEN GLOW = TROLLEY', lines: ['Grab anything that glows green', '🥦 Fruit and veg COST you: things come back out of the trolley', 'You\'re faster than normal: leg it round the shop'] },
          { pic: 'squad', who: ['Oliver', 'Aidan W'], title: 'SECURITY', lines: ['Oliver and Aidan W are on security', 'If they catch you, things come out of your trolley', 'Aidan W is slow (it\'s the knee). Oliver isn\'t'] } ],
        bbq: [
          { pic: 'bbq', title: 'IAN\'S BARBECUE', lines: ['Round Lewis\'s house. Ian\'s on the grill, cooking proper burgers "for the lads"', 'Pinch them off the barbecue and eat them', 'Every bite fills your EAT METER and makes you BIGGER'] },
          controls,
          { pic: 'bbq:chase', title: 'HEALTHY SECONDS?', lines: ['Every so often Ian comes round with a HEALTHY one for you. It\'s tofu', 'First he asks. Then he insists. Then he CHASES you', 'The red bar at the top counts down to his next go'] },
          { pic: 'bbq:feed', title: 'FIGHT HIM OFF', lines: ['If he catches you, he shoves it in your face', vr ? '🎮 Pull the triggers as fast as you can to push him off' : pc ? '🖱️ Click (or hammer any key) as fast as you can to push him off' : '👆 Tap the screen as fast as you can to push him off', 'Lose and you\'re FORCE-FED: BLEURGH, and your EAT METER drops'] },
          { pic: 'bbq:big', title: 'GET BIG, FIGHT BACK', lines: ['The bigger you are, the easier he is to push off', (vr ? 'Slap' : (pc ? 'Click' : 'Tap')) + ' him, throw food at him: 10 to 15 hits and over he goes (pushing him off or barging him counts 3)', 'Knock him over 5 times and he gives up: you win. Force-fed 3 times: you lose', C.pause] } ],
        date: [
          { pic: 'date', title: 'DATE NIGHT', lines: ['Dinner with Chloe at La Grande Portion. You\'re on a diet', 'You\'re sat at the table all night: no walking. Look round all you like', 'Eat what\'s on the table... but ONLY when Chloe isn\'t looking. Three catches and it\'s salad'] },
          controls,
          { pic: 'date:films', title: 'THE FILMS', lines: ['All night, little films: her phone, the waiter, the loo, the lads coming over, a power cut...', 'Each one has its own game, with rounds that get harder: ' + (vr ? 'trigger, grip and A are its buttons' : pc ? 'click its buttons, or press 1, 2, 3' : 'tap the big buttons at the bottom'), 'Win for stars and food on your Eat Meter. Lose and you\'re BUSTED'] },
          { pic: 'date:busted', title: 'WATCH CHLOE', lines: ['When she starts to turn back: a "!", a beep and a red edge. Stop eating!', 'ACT NATURAL just as she turns for a bonus. Cheeks too full and she\'ll notice', 'BUSTED? Pick the right excuse and she goes easier: a salad, your plate, a call to your mum...', C.pause] } ],
        chonkoff: [
          { pic: 'clock', title: 'EAT-OFF', lines: ['60 seconds on the clock', 'Eat everything you can find', 'Beat your best score'] }, controls ],
        chonkoff2: [
          { pic: 'clock:2', title: 'EAT-OFF · 2 PLAYERS', lines: ['Pass and play: 60 seconds each', 'Player 1 goes first, then hand it over to Player 2', 'Whoever eats more wins'] }, controls ],
        runpub: [
          { pic: 'pub', title: 'RUN THE PUB', lines: ['A six-minute shift behind the bar at the Oysterfleet', 'Punters come up to the bar and order a drink', 'Serve them the right drink, fast, for money and tips'] },
          { pic: 'pub:make', title: 'ORDERS', lines: ['The ORDERS list ' + (vr ? 'on your left wrist' : 'top right') + ' shows who wants what, oldest first', 'A yellow arrow points you to the next thing to do', 'Then hand it over: ' + (vr ? 'hold it out to them' : 'look at them across the bar while holding it')] },
          { pic: 'pub', title: 'THE BAR', lines: ['🍺 GUINNESS: a pint glass, held under the tap', '🍏 Lager, cider and ⚡ MONSTOR: from the fridges at the back', '☕ Coffee: a mug under the machine. 🍷 Wine: off the back counter', '🥤 Coke or Fanta: a cup, then the soda gun (' + (vr ? 'A/X' : 'the EAT button') + ' switches flavour)'] },
          { pic: 'emoji:🧒', title: 'THE RULES', lines: ['Kids are only allowed soft drinks: serve them booze and it\'s -£10', 'Give a kid asking for booze a Coke instead for a bonus', 'Throwing a drink at someone works, but they only pay half', 'Break up fights and catch runaway kids. It\'s a shift: only drinks behind the bar'] },
          controls ],
        imposter: [
          { pic: 'emoji:🔪', title: 'IMPOSTER', lines: ['Among Us at the Oysterfleet. No food, no eating', 'Most of you are THE FAITHFUL. One of you is the IMPOSTER (or two: the host picks)', 'Nobody knows who. The imposter knows their partner'] },
          { pic: 'emoji:🍺', title: 'THE FAITHFUL', lines: ['You have five jobs round the pub: pour a Guinness, change the barrel, unblock the toilet...', 'A yellow ! marks each one. Walk up and press ' + (vr ? 'A' : pc ? 'E (USE)' : 'USE'), 'Every job anyone does fills the TASK BAR. Fill it and the faithful win'] },
          { pic: 'emoji:🍳', title: 'THE IMPOSTER', lines: ['Get close to someone and press KILL' + (vr ? ' (X)' : pc ? ' (Q)' : '') + ': 30 seconds between kills', 'SABOTAGE' + (vr ? ' (Y)' : pc ? ' (X)' : '') + ': lights out, or the KEG PRESSURE: fix both valves in time or the imposters win', 'Sneak about through the TRAPDOORS. Fake your jobs to look busy'] },
          { pic: 'emoji:🔔', title: 'MEETINGS', lines: ['Find a body? REPORT it. Or ring the LAST ORDERS bell in the middle of the pub (once each)', 'Everyone comes to the middle: 90 seconds to talk and vote (or skip)', 'Most votes is thrown out of the pub. Did you get the imposter?'] },
          { pic: 'emoji:👻', title: 'GHOSTS', lines: ['Killed or thrown out: you\'re a ghost. You\'re told who got you', 'Ghosts can still do their jobs and watch everyone, but only talk to ghosts', 'Living players can only chat in meetings'] }, controls ],
        roam: [
          { pic: 'emoji:🚶', title: 'FREE ROAM', lines: ['Have a look round and explore', 'Everyone is here, but nobody attacks you', 'No timer: eat, throw, slap and play the machines'] }, controls ],
      };
      // BOSS FIGHT (boss.js)
      PAGES.boss = [
        { pic: 'boss:intro', title: 'BOSS FIGHT', lines: ['A GIANT one of the lads drops out of the sky', 'Bring their health bar (top of the ' + (vr ? 'boss' : 'screen') + ') down to nothing', 'A different boss every fight: Noah, Lewis, Chloe, then Tommy. On your own or everyone together'] },
        { pic: 'boss:food', title: 'FIGHT BACK WITH FOOD', lines: [vr ? '🎯 Grab food and throw it at them: a swing in their direction goes where you mean' : pc ? '🎯 Click food to pick it up, then click the boss (or Space) to throw it' : '🎯 Tap food to pick it up, then TAP THE BOSS to throw it there', '🎯 HEADSHOTS do double. Out of puff? Hit the glowing WEAK SPOT for triple', '😋 Eat to power up: the bigger you get, the harder you throw'] },
        { pic: 'boss:floor', title: 'WATCH THE FLOOR', lines: ['🔴 Red circle: a SLAM is coming. Get out of it', '🟢 Green middle, red all round: get IN CLOSE', '🔴 Red lane: a CHARGE. Side-step it. 🎯 Targets: giant food landing there'] },
        { pic: 'boss:hearts', title: 'HEARTS', lines: ['You have five hearts. Every hit knocks you down and takes one', 'Finish a bit of food: a heart back', 'Three phases, each one harder. Lose all your hearts and the boss wins', C.pause] }, controls ];
      // PROP HUNT
      PAGES.prophunt = [
        { pic: 'ph:intro', title: 'PROP HUNT', lines: ['Hide and seek, but the hiders turn into things', 'Each round: a few SEEKERS, everyone else HIDES. Teams swap every round', 'Most points after four rounds wins'] },
        { pic: 'ph:hide', title: 'HIDING', lines: ['40 seconds to hide while the seekers count with their eyes shut', '🎰 A fruit machine deals you something to turn into: a keg, a bin, a gnome...', 'Don\'t fancy it? SWAP' + (vr ? ' (A)' : pc ? ' (Q)' : '') + ': two a round. Then blend in: there are loads of the real ones about'] },
        { pic: 'ph:lock', title: 'LOCK IN, TAUNT', lines: ['LOCK' + (vr ? ' (B)' : pc ? ' (L)' : '') + ' so you stay put and stop turning with the camera', 'TAUNT' + (vr ? ' (X)' : pc ? ' (T)' : '') + ' for points: a quack, a kazoo, an airhorn. More if a seeker\'s close', 'Go quiet for 45 seconds and it taunts for you, and costs you'] },
        { pic: 'ph:seek', title: 'SEEKING', lines: ['🔫 You have a toy gun: ' + (vr ? 'point and pull the trigger' : pc ? 'click (or F)' : 'tap') + ' to shoot anything that looks off', 'Hiders have 100 health: 25 a hit, so four hits and they\'re FOUND. A hit one gets a burst of speed, and heals if you leave them 6 seconds', 'Shoot the real thing and it costs you 10 health. None left: knackered for 10 seconds. A find gets health back'] },
        { pic: 'ph:found', title: 'FOUND?', lines: ['Found hiders are ghosts: float about and WATCH the rest', 'The round ends when everyone\'s found, or the clock runs out', 'Seekers score for finds. Hiders score for every second hidden and for surviving'] }, controls ];
      // SEARCH AND DESTROY (snd.js)
      PAGES.snd = [
        { pic: 'sd:intro', title: 'SEARCH & DESTROY', lines: ['Two teams: THE GREASY SPOONS 🍳 v THE SALAD DODGERS 🥗, filled up with the squad as 🤖 bots', 'ATTACKERS plant THE VINDALOO (a curry pot strapped to six sausages) at bomb site A or B', 'DEFENDERS stop them, or defuse it. No respawns: out is out till the next round'] },
        { pic: 'sd:guns', title: 'THE SHOP', lines: ['Every round starts in the SHOP' + (vr ? ' (Y)' : pc ? ' (B, or 1-9)' : '') + ' with your 💷 DINNER MONEY: a PRIMARY and a SIDEARM (the ketchup pistol\'s free)', 'Money for kills, plants, defuses and every round (more for a win). Live through a round and you keep your guns', 'Go down and your gun\'s dropped where you fell: anyone can TAKE it' + (vr ? ' (B)' : pc ? ' (E)' : '')] },
        { pic: 'sd:arsenal', title: 'THE GUNS', lines: ['🍅 Ketchup Blaster · 🟫 Brown Sauce Burst (three a pull) · 🌭 Mustard Magnum', '🧀 Cheese SMG · 🫘 Bean Shotgun (one tin at a time) · 🥫 MONSTOR AR · 🥖 Baguette Rifle · 🌭 Sausage Sniper · 🍗 Gravy Gatling', '🎯 Heads hurt most, legs least. Damage tails off with range. The big ones shoot through thin walls 🧱'] },
        { pic: 'sd:shoot', title: 'SHOOTING', lines: [vr ? '🔫 Point the gun in your right hand and pull the trigger. Hold the front with your left hand (grip) to aim with both' : pc ? '🔫 Click (hold for the automatics) or F to fire. Right-click (held) to AIM down the sights' : '🔫 Hold FIRE (drag your thumb on it to aim), or tap what you want to shoot. 🎯 AIM to zoom in and steady it', vr ? '🔄 A (or flick the gun down) to reload · X swaps guns · Y changes the fire mode · bring the gun up to your eye to aim' : pc ? '🔄 R reload · Q (or the wheel) swaps guns · X fire mode · T inspect' : '🔄 RELOAD · 🔁 SWAP guns · tap the ammo box for the fire mode (hold it to inspect)', '❤ 100 health. Recoil kicks your aim up: short bursts! The red arc shows where a hit came from'] },
        { pic: 'sd:bomb', title: 'THE BOMB', lines: ['The carrier (💣 on the HUD) takes it to A or B and holds PLANT' + (vr ? ' (B)' : pc ? ' (E)' : '') + ' for 3 seconds', 'Then 40 seconds till it goes off: the beeping gets faster and faster', 'Defenders: stand on it and hold DEFUSE' + (vr ? ' (B)' : pc ? ' (E)' : '') + ' for 6 seconds. Carrier down? The bomb drops: any attacker can pick it up'] },
        { pic: 'sd:picks', title: 'PICK-UPS', lines: ['📦 Ammo boxes · 🍔🥙 food (eating heals) · 🦺 stab vests (armour soaks up hits)', '⏱️ Fast hands · ⚡ MONSTOR rush · 🌶️ Extra hot sauce · 🔧 Bomb squad pliers · 🎒 Bottomless bag', 'Walk over one to grab it. Perk timers show in the box' + (vr ? ' on your wrist' : ' top left')] },
        { pic: 'sd:rounds', title: 'WINNING ROUNDS', lines: ['Win a round: wipe the other team out, blow the site up, defuse it, or (defenders) run the clock out', 'Sides swap at half time (and everyone\'s money starts again). First to 4 rounds wins the match (3 short, 6 long)', 'Out? A look at who got you, then you watch a team-mate' + (vr ? ' (A: next one)' : pc ? ' (V: next one)' : ' (WATCH: next one)') + '. 📋 Scoreboard: ' + (vr ? 'hold the left stick in' : pc ? 'hold TAB' : 'hold the score bar') + '. ' + C.pause] } ];
      PAGES.imposter2 = PAGES.imposter; PAGES.roam0 = PAGES.roam; PAGES.chonkoffr = PAGES.chonkoffr || PAGES.chonkoff; PAGES.runpub1 = PAGES.runpub3 = PAGES.runpub;
      const pages = PAGES[mode] || PAGES.everyone; let i = 0;
      const draw = () => { const pg = pages[i];
        $(P + 'title').textContent = pg.title; $(P + 'step').textContent = `HOW TO PLAY · PAGE ${i + 1} OF ${pages.length}`;
        const pic = $(P + 'pic'); pic.style.animation = 'none'; void pic.offsetWidth; pic.style.animation = '';
        const squad = pg.who ? SQUAD.filter(q => pg.who.includes(q.n)) : SQUAD;
        const paint = () => window.__howto && window.__howto.drawHowPic(pic, pg.pic, { squad, device: vr ? 'vr' : pc ? 'pc' : 'phone' });
        if (window.__howto) paint();
        else {      // (not loaded yet: a simple picture now, the real one the moment it's ready)
          try { const g = pic.getContext('2d'); g.fillStyle = '#1c2c8c'; g.fillRect(0, 0, pic.width, pic.height); g.fillStyle = '#ffd400'; g.font = '900 44px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(pg.title, pic.width / 2, pic.height / 2, pic.width - 40); } catch (e) {}
          window.addEventListener('howto-ready', () => { if (pages[i] === pg) paint(); }, { once: true });
          setTimeout(() => { if (pages[i] === pg) paint(); }, 300);
        }
        $(P + 'lines').innerHTML = pg.lines.map(l => `<p class="sub">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`).join('');
        $(P + 'dots').innerHTML = pages.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('');
        $(P + 'prev').hidden = i === 0; $(P + 'next').hidden = i === pages.length - 1; $(P + 'ready').classList.toggle('last', i === pages.length - 1); };
      $(P + 'prev').onclick = () => { if (i > 0) { i--; draw(); blip(520, 0.05); } };
      $(P + 'next').onclick = () => { if (i < pages.length - 1) { i++; draw(); blip(620, 0.05); } };
      $(P + 'ready').onclick = () => { $(P + 'ready').onclick = null; then(); };
      draw(); if (inUi) document.getElementById('ui').classList.add('howto'); else show('intro');
    };
    // (the how-to-play pages aren't in the way any more: they're a button on the panel over the level)
    window.__menuIntro = (then) => then();
    $('#go').addEventListener('click', () => { if (goGate()) { blip(200, 0.1, 'square', 0.06); const w = $('#go-wait'); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); return; } go(); });
    const uiEl = document.getElementById('ui'), closeHow = () => { uiEl.classList.remove('howto'); blip(520, 0.05); };
    $('#ui-howto-btn').addEventListener('click', () => { $('#ui-howto-btn').classList.remove('fresh'); try { localStorage.setItem('rs_seen_' + mode, '1'); } catch (e) {} blip(660, 0.06); intro(closeHow, true); });
    $('#uh-close').addEventListener('click', closeHow);
    window.__menuGo = go; window.__menuShow = (id) => show(id);      /* (tests: straight to a screen) */
    // the floating menu in VR (see ronnieHero.js) picks with these
    window.menuVR = {
      info: () => ({ place: ALLPLACES.find(p => p.id === place).name, mode: modeInfo(mode).name }),
      step(kind, d) {
        if (kind === 'place') { stepPlace(d); drawModes(); return; }
        const list = gameChoices(place); const i = list.indexOf(mode);
        mode = list[(i + d + list.length) % list.length]; blip(880, 0.08); drawModes();
      },
      play: () => go(),   // (old floating panel; the VR menu now mirrors the real one)
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
    // CHANGE on the panel over the level: back to picking, with what you were playing already chosen
    else if (q.get('pick')) { try { history.replaceState(null, '', location.pathname); } catch (e) {}
      if (saved.place && PLACES.some(p => p.id === saved.place)) place = saved.place; if (saved.mode && GAME_IDS.includes(saved.mode)) mode = saved.mode;
      setTimeout(() => { drawPlace(); show('place'); }, 0); }
    // coming back from a level ("Change place or mode"): jump straight to picking
    // otherwise always open on the title screen, and tidy the address bar
    else if (location.search) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
  });
  const back = () => { location.href = location.pathname; };   // back to the title screen
  document.getElementById('back-menu').addEventListener('click', back);
  document.getElementById('ui-change').addEventListener('click', () => { location.href = location.pathname + '?pick=mode'; });
  // keyboard: arrows on the place screen, Enter to go on
  document.addEventListener('keydown', (e) => {
    if (start.classList.contains('gone')) return;
    if (current === 'place' && e.key === 'ArrowRight') stepPlace(1);
    if (current === 'place' && e.key === 'ArrowLeft') stepPlace(-1);
    if (e.key === 'Enter') { const nxt = { title: 'place', place: 'mode', mode: 'ready' }[current]; if (nxt) show(nxt); else if (current === 'ready') $('#go').click(); else if (current === 'intro') ($('#intro-next').hidden ? $('#intro-ready') : $('#intro-next')).click(); }
    if (current === 'intro' && e.key === 'ArrowRight') $('#intro-next').click(); if (current === 'intro' && e.key === 'ArrowLeft') $('#intro-prev').click();
  });
})();
