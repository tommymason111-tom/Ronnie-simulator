// Extra chatter for each game mode: the squad still take the piss in their own way, but about what's going on right
// now (an eat-off, the barbecue, behind the bar...). Character.line('chatter') mixes these in with their usual lines.
const GROUP = { everyone: 'squad', classic: 'squad', intervention: 'squad', chonkoff: 'eatoff', chonkoff2: 'eatoff', chonkoffr: 'eatoff', roam: 'roam', roam0: 'roam', sweep: 'sweep', bbq: 'bbq', date: 'date',
  runpub: 'runpub', runpub1: 'runpub', runpub3: 'runpub', boss: 'boss', snd: 'snd', prophunt: 'prophunt', imposter: 'imposter', imposter2: 'imposter' };
// In these, the squad and Tommy only chat about what's going on (no general digs about Ronnie's weight or the gym while
// he's behind the bar, or mid-gunfight): their chatter comes from MODE_LINES alone, and Tommy's banks from MODE_BANKS
export const STRICT = new Set(['runpub', 'boss', 'snd', 'prophunt', 'imposter']);
export const modeGroup = (m) => GROUP[m] || null;
export const MODE_LINES = {
  chloe: {
    squad: ['The whole squad\'s here for an intervention, babe. Lewis made a PowerPoint.', 'We\'re doing this because we love you. And because Chester\'s scared of you.', 'I told the lads to go easy on you. I lied, babe. Go hard, lads.'],
    eatoff: ['Sixty seconds, babe. That\'s longer than you\'ve ever spent at the gym.', 'I\'m timing you. I\'m also timing how long until I leave you.', 'If you win this I\'m telling your mum.'],
    sweep: ['Ronnie, it\'s a supermarket sweep, not a supermarket SWALLOW.', 'Put the trolley down, babe. You\'re not meant to eat the trolley.', 'Chester could do this better. Chester\'s a dog.'],
    bbq: ['Ian\'s made a lovely salad, babe. You walked past it like it was a speed camera.', 'Babe, the sausages are for EVERYONE. Not everyone in your stomach.'],
    date: ['This is our night, babe. Just us. And your tenth starter.', 'I\'m only looking away to check on Chester\'s photos. Don\'t you dare.', 'Waiter, can we get the bill? Before he eats the menu?'],
    roam: ['Fancy a walk, babe? A walk. Not a walk to the fridge.', 'Chester wants a walk. Chester gets more walks than you.'],
    runpub: ['Babe, you\'re working the bar now. Serving drinks, not drinking them.', 'Table six wants a wine. Not YOU. Table six.', 'Smile at the customers, babe. With your mouth empty.', 'Babe, that pint\'s been sat on the bar so long it\'s got a tan line.', 'Babe, the change is wrong again. She gave you a twenty. You gave her a beer mat.', 'Wipe the tables, babe. Chester\'s stuck to table nine.'],
  },
  lewis: {
    squad: ['Intervention time, Ron. I\'ve brought a resistance band and a speech.', 'Lads, form a ring round him. Like the Palace back four. Except good.'],
    eatoff: ['Eat-off? Bro, I\'ve got a weigh-in on Friday, I\'m out. You go for it. Not like that.', 'Sixty seconds of pure cardio for your jaw, Ron. Respect, honestly.'],
    sweep: ['Bro, the protein aisle\'s that way. You\'ve gone straight to the doughnuts again.', 'Grab the chicken, Ron! The CHICKEN! Not the chicken dippers!'],
    bbq: ['Chicken breast, no skin, no sauce, Ian. And for Ron? The whole cow, apparently.', 'This barbecue\'s more protein than my whole week, bro.'],
    date: ['Chloe\'s looking for a man with discipline, Ron. Look at me. Look at my calves.'],
    roam: ['Fancy a quick session, Ron? Thirty minutes. Or thirty seconds, for you.', 'Palace are top of the table if you turn the table upside down, bro.'],
    runpub: ['Shift at the Oysterfleet, bro! I\'ll do the kegs. Heavy lifting. Obviously.', 'If anyone orders a protein shake, that\'s mine. I\'m the only one who drinks them.', 'Customer\'s asking for a Guinness, Ron. Pour it. DON\'T drink it. POUR IT.', 'Bro, you\'ve pulled that pint like a bad deadlift. All back, no form.', 'Glasses are piling up, Ron. That\'s a set of fifty. Clear them.', 'Bro, the queue\'s longer than Palace\'s trophy drought.'],
  },
  harry: {
    squad: ['I\'m here for the intervention, Ron! Also there\'s a girl here I fancy. Two birds.', 'I swiped right on this intervention, Ronnie. It\'s a match.'],
    eatoff: ['Ronnie versus the clock. My money\'s on the clock. My money\'s on anyone, actually.'],
    sweep: ['I\'ve got a date later, Ron, I need a meal deal. Leave me a meal deal.'],
    bbq: ['Ian, is the barbecue gluten free? She\'s gluten free. My date. She\'s coming. Maybe.'],
    date: ['Double date, Ronnie! Me and her, you and... five starters.', 'Ron, quick, how do I look? Don\'t answer that, you\'ve got gravy on your chin.'],
    roam: ['Ron, have you seen the van? I can\'t find my van. Five kids are in it.'],
    runpub: ['I\'m on the bar, Ron! Every girl who orders gets my number. On the receipt.', 'Sorry, love, it\'s happy hour. I mean I\'M happy. The drinks are full price.', 'Ron, the girl at table two wants her drink. Not my number. She was very clear.', 'You\'re slower on that tap than I am on a reply, Ron. And I leave people on read for weeks.'],
  },
  aidan: {
    squad: ['Intervention, Ron. Very serious. I\'ve only had four. I\'m fine.'],
    eatoff: ['I could do this with pints, Ronnie. Sixty seconds, six pints. Watch me.', 'You eat like I drink, Ronnie. Which is a compliment. Sort of.'],
    sweep: ['Is there a Guinness aisle? There should be a Guinness aisle.'],
    bbq: ['A barbecue and a pint. That\'s my religion, Ron.', 'The burgers are like Guinness, Ian. Leave them alone and they\'re perfect.'],
    date: ['Chloe\'s looking at you, Ron. She\'s doing the face. My mammy did that face.'],
    roam: ['Have you seen Connor? He owes me a pint from 2019.'],
    runpub: ['I\'m doing the Guinness, Ron. Two-part pour. Patience. Don\'t you DARE touch it.', 'The secret of a good pint is time. And not letting Ronnie near it.', 'Split the G? I\'ve split every G in this pub. Twice.', 'Ron. RON. You\'ve topped that up before it settled. My mammy would weep.', 'That\'s not a pint of the black stuff, Ronnie, that\'s a cappuccino. All head.', 'One hundred and nineteen seconds, Ron. That\'s how long a proper pour takes. Not four.'],
  },
  noah: {
    squad: ['Right, Ronnie, it\'s an intervention. Basically a scrum. With feelings.'],
    eatoff: ['Proper front-row eating, that. Coach would be proud. Then sick.'],
    sweep: ['I\'ve seen people steal from a supermarket. I\'ve never seen someone eat the evidence.'],
    bbq: ['Burgers, Ian! FOR THE FORWARDS! Backs get salad!', 'Rugby lads eat in the fourth quarter. Wait. There\'s no fourth quarter. I\'m starving.'],
    date: ['Ron, you\'re on a date, not at a rugby dinner. Use a knife.'],
    roam: ['Try time, Ronnie. Touch it down. Touch your toes. Go on, try.'],
    runpub: ['If anyone kicks off, I\'ll sort it. I\'ll just stand there. They\'ll stop.', 'I\'m on the door tonight, Ron. Nobody gets in. Except the kebab man.', 'Two lads at the bar want a word about their change, Ron. I\'m stood here in case.', 'Queue\'s three deep, Ron. Pour faster or I\'m calling a scrum.'],
  },
  oliver: {
    squad: ['Guys, I\'m live. This intervention\'s on TikTok. Say hi, Ronnie.'],
    eatoff: ['Sixty-second eat-off, LIVE. Comment how many he\'ll eat. I\'m saying all of them.'],
    sweep: ['Lidl security here. I\'ve got my eye on you, Ronnie. Actually both eyes. You need both.', 'This is MY Lidl, Ronnie. I know every aisle. I know where you hid the croissants.'],
    bbq: ['Doing a barbecue review for the channel. Ian\'s salad: one star. Ronnie: five plates.'],
    date: ['I\'m not filming the date, Ronnie. I\'m filming the bill.'],
    roam: ['Just vlogging. Don\'t mind me. Ronnie, do the belly thing for the camera.'],
    runpub: ['Pub shift vlog, part one. Part two\'s just Ronnie behind the bar eating peanuts.', 'Chat\'s asking why the pints have got lager on top, Ron. Live. Thousands watching.', 'Rating the bar service: two stars. Both for the beer mats.'],
  },
  dylan: {
    squad: ['It\'s an intervention, Ron. I wrote a song about it. It\'s called Wonderwall.'],
    eatoff: ['Sixty seconds? Liam can drink a pint in six. You can eat a pie in four. Rock and roll.'],
    sweep: ['Supermarket sweep? Definitely. Maybe. Definitely.'],
    bbq: ['Ian burnt the sausages. Burnt like the Gallagher brothers\' friendship.'],
    date: ['I\'ll serenade Chloe while you eat, Ron. Distraction tactic. Today is gonna be the day...'],
    roam: ['My knee\'s fine now, Ron. Mostly. It clicks in time with Wonderwall.'],
    runpub: ['Jukebox only plays Oasis now. I\'ve fixed it. You\'re welcome, pub.', 'Pint of lager, Ron. Like Liam. Mad for it.', 'Last orders in five, Ron. You\'ve still got first orders to do.', 'You pour a pint like I play guitar, Ron. Loudly, and mostly on the floor.'],
  },
  connor: {
    squad: ['Intervention! Our Aidan said I had to come. He\'s had four pints. He\'s fine.'],
    eatoff: ['Liverpool took six minutes to come back in Istanbul, Ronnie. You\'ve got sixty seconds. Believe.'],
    sweep: ['They\'ve got a Liverpool aisle? No? Then I\'m not interested.'],
    bbq: ['A barbecue in the rain. Like a proper Irish summer. Lovely.'],
    date: ['Ronnie, you\'ll never walk alone. You\'ll walk with your third dessert.'],
    roam: ['Don\'t slip, Ronnie. Trust me. Don\'t slip.', 'Fancy a jig? No? Fair. The floor couldn\'t take it.'],
    runpub: ['My round! No, wait, I\'m working. YOUR round, customer!', 'Our Aidan pours the Guinness, I pour the craic.', 'Our Aidan\'s watching you pour that Guinness, Ron. He\'s gone a funny colour.', 'You\'ll never walk alone, Ron. You\'ll walk to the glass washer. Go on.'],
  },
  ethan: {
    squad: ['Intervention? Like when Madrid sack a manager. But for food.'],
    eatoff: ['This is a Champions League final, Ronnie. You\'re Madrid. The pies are Dortmund.', 'Pepsi Max to wash it down? Zero calories. The only zero you\'ll get today.'],
    sweep: ['Ronnie, find the Pepsi Max. All of it. Then leave it for me.'],
    bbq: ['Ian, any chance of KFC instead? No? A boneless one at least?'],
    date: ['Ron, take her to the Bernabéu. Romantic. Also you can\'t eat it.'],
    roam: ['FIFA later? You can be Madrid. No you can\'t. I\'m always Madrid.'],
    runpub: ['A Pepsi Max for table three. And one for me. And one for me.', 'If anyone orders a Wolves pint I\'m refusing service.', 'The till\'s frozen, Ron. Like Madrid\'s defence. Hit it.', 'Table three\'s been waiting so long they\'ve ordered a Deliveroo to the bar.'],
  },
  ian: {
    squad: ['Right. Everyone. This is an intervention. I\'ve made a salad. Nobody move.'],
    eatoff: ['Sixty seconds of eating? I could cook a full English in that. Badly.'],
    sweep: ['I\'d have got the vegetables, Ronnie. Do you know what a vegetable is?'],
    bbq: ['My barbecue, my rules. Rule one: Ronnie eats the salad first.', 'Hands off the grill! Those are for the GUESTS! You\'re not a guest, you\'re a disaster.', 'I\'ve marinated these for three days. You\'ll eat them in three seconds.'],
    date: ['I raised you better than this, Ronnie. I raised you to at least use a napkin.'],
    roam: ['I\'m going fishing. The fish are safer than the fridge with you about.'],
    runpub: ['Who\'s shouting? Oh, it\'s me. CHANGE THE BARREL!', 'In my day, pubs had one beer. And we were grateful.', 'Lines are dirty, Ronnie. In my day we cleaned them. Every Sunday. With pride.', 'That\'s the wrong barrel, Ronnie. That\'s the cider. Everyone\'s drinking cider Guinness now.'],
  },
  alfie: {
    squad: ['Intervention, Ron. I\'m serious. I\'ve signed for this. Eight-year contract.'],
    eatoff: ['Top bins, Ronnie. Every pie, top bins. Into the net.'],
    sweep: ['Supermarket sweep? I\'m on the Chelsea project. Spend a billion, finish twelfth.'],
    bbq: ['Back piece healed yet? No. I left after one line. Pass the ketchup.'],
    date: ['Romance tip, Ron: never show her your tattoo. I haven\'t got one. I tried.'],
    roam: ['Watch this nutmeg, Ronnie. Through your legs. ...Mate, I can\'t find your legs.'],
    runpub: ['Pint for table four, Chelsea blue. That\'s a Blue WKD, Ron.', 'I\'ll work the bar, I\'ve got Chelsea money. That\'s none, by the way.', 'Pouring like it\'s a Chelsea penalty, Ron. Calm. Composed. All over the floor.', 'Glasses, Ron! We\'re running out quicker than Chelsea get through managers.'],
  },
  aidanw: {
    squad: ['Intervention? My knee says no but my heart says yes.'],
    eatoff: ['Spurs could learn from you, Ronnie. You actually finish things.'],
    sweep: ['I\'m on crutches, Ronnie, I can\'t sweep. I can watch. Judging.'],
    bbq: ['My beard\'s caught a sausage. Leave it, it\'s for later.'],
    date: ['Ron, holo card trick: show her the shiny one. It always works. It\'s never worked.'],
    roam: ['Spurs trophy cabinet tour, anyone? It\'s a short tour.'],
    runpub: ['I\'ll do the till. Sitting down. Knee.', 'Card payment for table two. Is a Pokémon card accepted? Asking for me.', 'Till\'s down a tenner, Ron. Don\'t look at me. I can\'t reach it. Knee.', 'Table two paid with a card. A Pokémon one. It went through, somehow.'],
  },
  ben: {
    squad: ['Intervention, Ronnie. I flew in from Istanbul for this. Look. The hair. Still here.'],
    eatoff: ['Sixty seconds? My hair took six hours. Worth every minute.'],
    sweep: ['My back, Ronnie. MY BACK. I can\'t bend for the bottom shelf. You do it.'],
    bbq: ['Don\'t stand near the grill, my new hair\'s flammable.'],
    date: ['On a date, Ron? Tip: get a hair transplant. Changed my life.'],
    roam: ['Oof. My back. Not old, Ron. Vintage.'],
    runpub: ['I\'ll do the kitchen, Ron. Turkish breakfasts all round.', 'Order up! And it\'s not for you, Ronnie. Put it down.', 'Order up! Table seven! Before Ronnie gets to it!', 'Ron, the kitchen ticket says one scampi. Not one scampi each for you and the till.'],
  },
  tommy: {
    squad: ['I\'m one day older than you, Ronnie. Which makes me in charge of this intervention.'],
    eatoff: ['I\'m just trying to help, Ron. By timing you. And judging.'],
    sweep: ['Get the broccoli, Ronnie! The broccoli! ...he got the cake.'],
    bbq: ['Ian, is that broccoli on the grill? Lovely. Ronnie won\'t eat it, but lovely.'],
    date: ['Chloe\'s lovely, Ron. Don\'t mess this up. Like you messed up my ball.'],
    roam: ['Who took my ball? RONNIE. Did you EAT my ball?'],
    runpub: ['I\'ll help behind the bar! I\'m just trying to help! Why is everyone shouting?', 'You call that a pint, Ron? My broccoli\'s got a better head on it.'],
  },
};
// the generic ones for anyone without their own (and anyone at all, now and again)
MODE_LINES._ = {
  squad: ['This is an intervention, Ronnie. We\'re all here. Even the ones you owe money.', 'Put. The pie. Down.'],
  eatoff: ['Tick tock, Ronnie! Tick tock!', 'Is he... is he chewing at all?'],
  sweep: ['Security! Aisle three! He\'s eating the bread with the bag on!'],
  bbq: ['Who invited Ronnie to the barbecue? We needed the charcoal for the burgers.'],
  date: ['Waiter! More breadsticks. He\'s done the vase.'],
  roam: ['Nice to see you out and about, Ron. Out. Not about to eat.'],
  runpub: ['Another round! And keep Ronnie away from the crisps!', 'Who\'s on the bar? Is that Ronnie? I\'ll pour my own then.', 'Can we get a cloth over here? This table\'s stickier than the carpet.', 'Last orders? I haven\'t had FIRST orders yet!'],
  boss: ['It\'s HUGE! Throw something! Not your phone!', 'Aim for the head! The big head!'],
  snd: ['Bomb\'s on A! A! The vindaloo\'s on A!', 'Watch the corner! It\'s always the corner!'],
  prophunt: ['That plant moved. Plants don\'t move.', 'Why\'s there two barrels? There was one barrel.'],
  imposter: ['Who\'s been in the kitchen? Somebody\'s been in the kitchen.', 'Do your jobs, lads. Do your actual jobs.'],
};

// TOMMY BEHIND THE BAR: in Run the Pub, Ronnie's working, so Tommy (a regular, sat at the bar) has a go at his bar
// work: slow pours, a Guinness not left to settle, the change, sticky tables, the queue, the glasses, the till, last
// orders. These replace his usual banks there (no weight or gym digs: it's about the pub). (Tommy's voiced: a line with
// no clip made yet is read out by the server's /tts. They're in tools/voice_lines/tommy.json, for tools/voices.py)
export const MODE_BANKS = {
  tommy: {
    runpub: {
      greet: ['Evening, barman. Well. Bar... something.', 'Pint of Guinness please, Ron. I\'ve booked the week off to wait for it.', 'Look at you behind a bar, Ronnie. Like a fox running a henhouse. A slow fox.', 'Alright, Ron! I\'ll have whatever\'s quickest. So nothing, then.'],
      chatter: ['Ron, you\'ve poured that Guinness like you\'re putting out a fire. Let it SETTLE.', 'Two-part pour, Ronnie. Two parts. Not one big panic.', 'Is that a pint or a cappuccino? It\'s all head, Ron. ALL HEAD.', 'That\'s the wrong change, Ron. I gave you a tenner. You gave me a beer mat and a wink.', 'This table\'s so sticky my elbow\'s been here since Tuesday.', 'There\'s a queue out the door, Ron. Not for here. For the Wetherspoons over the road.', 'Empty glasses everywhere, Ronnie. It looks like the bottle bank\'s had a breakdown.', 'You\'ve been on the till ten minutes and it\'s already asked for the manager.', 'Last orders, Ron? You haven\'t done FIRST orders yet.', 'You pull a pint like you\'re starting a lawnmower.', 'You pull a pint like it owes you money, Ron.', 'I asked for a Guinness, Ron. That\'s a Coke with a hat on.', 'Ronnie, the glass goes UNDER the tap. Under. The bit with the hole.', 'I\'ve had faster service at the dentist. And they were nicer to me.', 'Here\'s a tip for the barman: learn the prices. That\'s the tip.', 'The drip tray\'s fuller than the pints, Ron.', 'You\'ve wiped that table three times and it\'s still got a pint ring. And a chip. And a postcode.', 'Card machine says declined, Ron. Not my card. The machine. It\'s declined to work with you.', 'The ice well\'s empty, Ron! You\'re running the only warm pub in England.', 'Is this table service or table abandonment, Ron?', 'Ronnie, you\'ve topped up a Guinness with lager. That\'s a crime in Dublin. And here.', 'I\'m one day older than you, and I\'ve still been waiting longer for this pint.', 'Running the pub, Ronnie? You couldn\'t run a bath.', 'Who trained you, Ron? Was it a cat?', 'That\'s not a head on that pint, that\'s a duvet.', 'You\'ve served the kid a cider, the nan an energy drink and me nothing. Bold strategy.', 'I\'m just trying to help, Ron. Help yourself to a job somewhere else.', 'Five-star pub. One-star barman.', 'Ron, those glasses on table six have been there so long they\'re paying rent.', 'The till\'s further out than your last orders, Ronnie.'],
      idle: ['Ron? Hello? Is the bar open, or are you buffering?', 'I\'ve been stood here so long my pint\'s gone out of date.', 'Any time tonight, barman. Any time this YEAR.', 'Ron, the punters are waving. That\'s not hello, that\'s a distress signal.', 'Standing still, Ron? The glasses won\'t collect themselves. Believe me, I\'ve asked them.'],
      eat: ['Eating the bar snacks, Ron? They\'re for the CUSTOMERS.', 'That was table four\'s scampi fries, Ronnie.', 'You\'re meant to SELL the crisps, Ron. Not test every bag.', 'Stock take\'s going to be a short one tonight.'],
      drink: ['Drinking on shift, Ron? That\'s coming out of your tips.', 'You\'re meant to pour them, Ron, not finish them.', 'The landlord\'s going to count the barrels, Ronnie. Then the takings. Then you.'],
      hit: ['Ow! You can\'t hit the customers, Ron! I\'m a REGULAR!', 'That\'s no way to treat a man waiting for a pint!', 'Is that how you tell someone it\'s last orders?', 'I\'ll be leaving a review, Ronnie. One star. The star\'s for the crisps.'],
      slap: ['Barred? You can\'t bar ME. I\'m the only one who tips!', 'Customer service, Ron! Look it up!', 'I came here for a quiet pint, Ronnie. A QUIET PINT.'],
      stage: ['Ron, you\'ve drunk more of the stock than you\'ve sold. The landlord\'s doing sums.', 'Another one for the barman? He\'s had more than the punters, Ron.', 'You\'re not behind the bar any more, Ronnie. You\'re propping it up.'],
    },
  },
};
// a mode's own bank for someone, if it has one (else null: their usual banks)
export const modeBank = (who, mode, bank) => { const g = GROUP[mode], b = g && MODE_BANKS[who] && MODE_BANKS[who][g]; return (b && b[bank]) || null; };
