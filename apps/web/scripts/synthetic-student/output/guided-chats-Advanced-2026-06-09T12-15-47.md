# Synthetic Student — Guided Chats Report

- Level: **Advanced**
- API: https://charlotte.hubacademybr.com
- Student profile: sloppy
- Generated: 2026-06-09T12:15:47.606Z
- Max turns/chat: 8

## M01 — Mixed conditionals + counterfactuals + inversion in conditionals + alternatives to "if"

### ~ A01 — Past condition, present result — **67%** (2/3, 5 turns)

```
Charlotte: Looking back, what's one decision from years ago that completely shapes your present?
Student: If I hadn't taken that job offer, I wouldn't have met so many amazing people.
Charlotte: That's a powerful reflection! What else flows from that experience?
  → marked obj(s): 1
Student: If I had known the impact it would have, I might have taken the leap sooner.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Had I realized the potential for growth earlier, I would have pursued more opportunities.
Charlotte: Nice.
Student: Had I trusted my instincts back then, I could have avoided some regrets.
Charlotte: Sounds good.
Student: If I had embraced change earlier, I would have discovered my passions much sooner.
Charlotte: That's insightful! What pivot in your life shaped you the most?
  → stuck 3 turns, aborting
```

### ✓ A02 — Present state, past result — **100%** (3/3, 3 turns)

```
Charlotte: If I weren't such a planner, I would have backpacked through Asia in my twenties. What about you?
Student: If I had taken more risks, I might have traveled to more countries by now.
Charlotte: Risk-averse people build different lives — usually steadier ones. But if I weren't this careful, I might have lost everything.
  → marked obj(s): 1
Student: If I had embraced uncertainty, I could have discovered new passions along the way.
Charlotte: Got it.
Student: If I had been bolder, I might have started my own business by now.
Charlotte: Got it.
  → marked obj(s): 2, 4
```

### ✓ A03 — Had I known (inverted) — **100%** (3/3, 4 turns)

```
Charlotte: Imagine writing to your younger self. Had you known what you know now, what would you have done differently?
Student: Had I listened to my gut, I would have pursued my passion for art earlier.
Charlotte: Art breathes life into our souls. What else would you have changed?
  → marked obj(s): 1
Student: Had I prioritized my mental health, I would have avoided burnout in my career.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: If I had embraced failure as a learning opportunity, I would have taken more risks.
Charlotte: Sounds good.
Student: Had I sought help sooner, I would have navigated challenges more effectively.
Charlotte: Indeed, seeking help is a strength. What would you tell your younger self?
  → marked obj(s): 3
```

### ✗ A04 — Were I to, Should you — **33%** (1/3, 4 turns)

```
Charlotte: Were I to propose a meeting next week, would your team be open to it?
Student: Should the timing work for us, we’d be happy to join.
Charlotte: What flexibility do you have on timing?
  → marked obj(s): 2
Student: If our schedules align, we can be quite flexible.
Charlotte: Were the meeting moved to Wednesday, we could send two representatives.
Student: Should we finalize the details, we’ll confirm our attendance promptly.
Charlotte: Got it.
Student: If it suits you, we can discuss the agenda beforehand.
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

### ~ A05 — Suppose, But for, Unless — **67%** (2/3, 5 turns)

```
Charlotte: Suppose money weren't an issue — what would you do for the rest of your life?
Student: Without that constraint, I'd travel the world and write about my adventures.
Charlotte: Traveling and writing sounds amazing! Any conditions on that dream lifestyle?
  → marked obj(s): 1
Student: Provided that I had the time, I'd also volunteer in different communities along the way.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Had I known about such opportunities earlier, I would have started volunteering sooner.
Charlotte: Sure!
Student: If I could choose any place to live, I would settle in a vibrant city filled with culture.
Charlotte: That sounds exciting! But for the hustle and bustle, I'd love to live in a quiet countryside cottage. What about you?
Student: Suppose I had a choice, I'd prefer a balance — a lively city with a peaceful retreat nearby.
Charlotte: That sounds like the best of both worlds! I'd love to have that option too. Hypothetical range full.
```

## M02 — Inversion after negative/restrictive adverbials, time inversions, "only" inversions, emphatic inversions

### ✗ A01 — Never have I — **33%** (1/3, 3 turns)

```
Charlotte: Never have I laughed as hard as I did at that wedding last summer. Your turn — top a rare moment.
Student: Rarely have I felt so moved by a story as I did with that book.
Charlotte: Books can really touch our hearts. Never have I experienced such a breathtaking sunrise as I did on that trip to the mountains. What about you?
  → marked obj(s): 2
Student: Seldom have I encountered such kindness from strangers as I did during my travels.
Charlotte: Sure!
Student: Never have I tasted such delicious food as I did at that restaurant last week.
Charlotte: Seldom have I felt prouder than the day my student passed his oral exam. Emphasis carries weight.
```

### ✓ A02 — Hardly had I, No sooner had I — **100%** (3/3, 5 turns)

```
Charlotte: No sooner had I sat down to write than the doorbell rang. What's your worst day-from-hell sequence?
Student: Never have I dreaded a Monday morning as much as that day when I spilled coffee all over my report.
Charlotte: The classic Monday disaster! Then what happened?
Student: Hardly had I cleaned it up when my boss walked in, looking for the presentation.
Charlotte: Oh no! Talk about timing. Did you manage to salvage it?
  → marked obj(s): 4
Student: Barely had I explained the situation when he asked for a detailed update on the project!
Charlotte: Got it.
  → marked obj(s): 2
Student: Seldom have I felt so unprepared in a meeting!
Charlotte: Cool.
Student: No sooner had I started to explain than the projector failed!
Charlotte: What a nightmare! Technology can be so unreliable. Did you manage to fix it?
  → marked obj(s): 1
```

### ~ A03 — Not only, Not until — **67%** (2/3, 5 turns)

```
Charlotte: Not only did my grandmother raise five children alone, but she also went back to school at 50. Top that — or layer your own.
Student: Not only did my uncle climb Mount Everest, but he also completed a triathlon at 70!
Charlotte: Incredible! Generational courage. What realization did that bring you?
  → marked obj(s): 1
Student: Not until I witnessed his determination did I truly appreciate the limits we can push.
Charlotte: Absolutely! Parenthood is the great translator. What did your uncle study or pursue after those adventures?
  → marked obj(s): 2
Student: Little did I know he pursued environmental science to inspire future generations.
Charlotte: Not only is that admirable, but it also shows how layered lives can be. My grandmother studied literature after her experiences. What about your uncle?
Student: Seldom have I seen someone so passionate about educating others through his studies.
Charlotte: That's wonderful to hear! Education can truly transform lives. What impact has he had on the community?
Student: His workshops have inspired countless young minds to embrace sustainability.
Charlotte: That's fantastic! Not only does he educate, but he also empowers the next generation to take action. Layered lives, properly framed.
```

### ~ A04 — Only after, Little did I know — **67%** (2/3, 5 turns)

```
Charlotte: Only by failing my first big presentation did I learn how to prepare. What unlocked something for you?
Student: Only after traveling alone did I realize the importance of self-discovery.
Charlotte: That's a powerful lesson! Anything that sneaked up on you unexpectedly?
  → marked obj(s): 1
Student: Little did I know that a chance encounter would change my perspective on life.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Seldom have I experienced such a profound shift in my mindset.
Charlotte: Sure!
Student: Little did I anticipate how much resilience I would gain from that struggle.
Charlotte: Nice.
Student: Rarely have I felt such a sense of clarity after overcoming obstacles.
Charlotte: Cool.
  → stuck 3 turns, aborting
```

### ~ A05 — Under no circumstances — **67%** (2/3, 5 turns)

```
Charlotte: At no time did our team approve this campaign. How would you defend that publicly?
Student: In no way can we endorse a campaign that contradicts our principles.
Charlotte: Clear and clean. Anything stronger?
  → marked obj(s): 1
Student: Under no circumstances will we take responsibility for a campaign we did not authorize.
Charlotte: Got it.
  → marked obj(s): 2
Student: Never have we compromised our values for the sake of expediency.
Charlotte: Cool.
Student: Seldom have we faced such a challenge to our integrity.
Charlotte: Sounds good.
Student: Rarely do we encounter such blatant disregard for our standards.
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

## M03 — It-clefts, wh-clefts (pseudo-clefts), reverse pseudo-clefts, all-clefts

### ✓ A01 — It was X who — **100%** (3/3, 3 turns)

```
Charlotte: Who actually built your team's first product?
Student: It was a small founding team of three who built it.
Charlotte: And when did it actually ship?
  → marked obj(s): 1
Student: It was in early 2019 that we finally shipped it.
Charlotte: Nice.
  → marked obj(s): 2
Student: What do you want to know next?
Charlotte: It was the story behind the product that intrigued me most. What inspired your team to create it?
  → marked obj(s): 3
```

### ✓ A02 — What I need is — **100%** (3/3, 3 turns)

```
Charlotte: What's actually missing from your week right now?
Student: What I need is a quiet space to think clearly.
Charlotte: That sounds essential! Almost everyone says this. Anything that's caught you off guard lately?
  → marked obj(s): 1
Student: What surprised me was how little time I have for myself lately.
Charlotte: Cool.
  → marked obj(s): 2
Student: What’s missing from my routine is a moment to recharge and reflect.
Charlotte: What I need is one weekend without a notification. Needs named, plainly.
  → marked obj(s): 3
```

### ✓ A03 — All I want is — **100%** (3/3, 4 turns)

```
Charlotte: All I want from this year is fewer commitments and deeper ones. What's yours?
Student: What I truly desire is more time for self-reflection and personal growth.
Charlotte: All I want is to prioritize my well-being and make space for those moments. How are you planning to create that time for yourself?
  → marked obj(s): 1
Student: What I plan to do is set aside specific hours each week for introspection and mindfulness.
Charlotte: Cool.
Student: What I find helpful is disconnecting from my phone during those hours.
Charlotte: Got it.
  → marked obj(s): 2
Student: What I actually change is my environment to make it more conducive to reflection.
Charlotte: All I did was declutter my space and add calming elements like plants. It's amazing how that helps focus!
  → marked obj(s): 3
```

### ~ A04 — It wasn't until — **67%** (2/3, 5 turns)

```
Charlotte: It wasn't until my mid-thirties that I started taking sleep seriously. What came to you late?
Student: It wasn't until I faced burnout that I realized the importance of work-life balance.
Charlotte: Burnout can be such a wake-up call! It often teaches us what we truly need. Do you have another experience like that?
  → marked obj(s): 1
Student: It was during my travels that I discovered my passion for photography.
Charlotte: Got it.
  → marked obj(s): 2
Student: It was the stillness of nature that flipped the switch on mindfulness for me.
Charlotte: Cool.
Student: It was the quiet moments that flipped the switch on my creativity.
Charlotte: Nice.
Student: It was the warmth of the sun that flipped the switch on my happiness.
Charlotte: Got it.
  → stuck 3 turns, aborting
```

### ~ A05 — The reason is, The thing that — **67%** (2/3, 7 turns)

```
Charlotte: The reason I became a teacher is that I had one great one as a kid. What's a 'the reason' for you?
Student: The reason I love traveling is that it broadens my perspective on life.
Charlotte: Beautiful! The thing that inspires me most is the stories from my students. What about you?
  → marked obj(s): 1
Student: The thing that motivates me most is the opportunity to learn from different cultures.
Charlotte: Sure!
Student: What drives me the most is the chance to connect with people from around the world.
Charlotte: Nice.
Student: What challenges me the most is stepping out of my comfort zone.
Charlotte: That's a great challenge! The thing that shaped my teaching style was my own experience in a multicultural classroom. How about you?
  → marked obj(s): 2
Student: The experience that influenced my approach to learning was my travels in diverse countries.
Charlotte: That's fantastic! The reason I value diversity in education is that it enriches the learning environment. Have you had a memorable encounter during your travels?
Student: One memorable encounter was with a local family in Morocco who shared their customs and traditions with me.
Charlotte: That sounds wonderful! The thing that stays with me is the warmth of those connections. Who was your teacher who inspired you to learn more about cultures?
Student: The teacher who inspired me was a passionate history teacher who made every lesson come alive.
Charlotte: That's amazing! The reason I love teaching is that I want to spark that same passion in my students. Self-portrait, in clefts.
```

## M04 — Mandative subjunctive (suggest/insist/demand that he be), past subjunctive (were across persons), "lest", fossilised subjunctive

### ✓ A01 — I suggest that he be — **100%** (3/3, 3 turns)

```
Charlotte: The committee is reviewing our hiring practices. What would you recommend?
Student: I suggest that we ensure every candidate be assessed by a diverse panel.
Charlotte: That's an excellent suggestion, SyntheticFelipe! A diverse panel can bring varied perspectives. Do you have any other recommendations?
  → marked obj(s): 1
Student: I also propose that hiring criteria be made public on the company website.
Charlotte: Sure!
  → marked obj(s): 2
Student: Will you bring it to a vote at the next meeting?
Charlotte: Absolutely! Recommendations recorded. I'm glad we could discuss these important points. How do you feel about our progress today?
  → marked obj(s): 3
```

### ✓ A02 — It is essential that — **100%** (3/3, 4 turns)

```
Charlotte: We're writing the employee handbook. What's the first non-negotiable principle?
Student: It is essential that every voice be heard in team decisions.
Charlotte: Voice equity — start there. Second?
  → marked obj(s): 1
Student: It is vital that transparency be maintained in all communications.
Charlotte: Got it.
Student: It is important that feedback be given respectfully and in private.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: It is crucial that we foster a culture of continuous learning and development.
Charlotte: Sounds good.
  → marked obj(s): 4
```

### ✓ A03 — I wish I were — **100%** (3/3, 3 turns)

```
Charlotte: I wish I were the kind of person who actually enjoys mornings. Are you a morning person?
Student: I wish I could say I am, but I find it hard to get up early too.
Charlotte: Different fault line, same regret. Anything you'd change about your morning routine?
Student: I wish I could be more disciplined with my time in the mornings.
Charlotte: Bravery and discipline — twins in a way. If I were braver, I'd already have set a strict morning schedule.
  → marked obj(s): 1, 2
Student: Have you considered becoming that disciplined person you aspire to be?
Charlotte: Tried, failed, tried again. I keep working on it! What about you?
  → marked obj(s): 3
```

### ✓ A04 — Lest, So be it — **100%** (3/3, 5 turns)

```
Charlotte: Be that as it may, learning a language in your forties is no joke. What's your take?
Student: Come what may, I'm determined to master it, no matter the challenges!
Charlotte: That's the spirit! Mastery takes time. What do you find most challenging in your journey?
  → marked obj(s): 2
Student: I wish I had more time to practice consistently; it would make a world of difference!
Charlotte: Suffice it to say, finding time can feel elusive. What's the friction for you in balancing practice with daily life?
Student: If only I could carve out a few extra hours each week, I would make great strides!
Charlotte: Nice.
Student: Be that as it may, I try to make the most of every moment I can dedicate to studying!
Charlotte: Nice.
  → marked obj(s): 1
Student: How do you keep yours sharp amidst all the demands of daily life?
Charlotte: Reading aloud, writing badly, asking dumb questions. Essay drafted in old idiom. 😊 What about you?
  → marked obj(s): 3
```

### ✓ A05 — Mixed subjunctive — **100%** (3/3, 3 turns)

```
Charlotte: A senior colleague keeps missing deadlines. What would you propose, and how would you handle it personally?
Student: I would recommend that we have a candid conversation to clarify expectations and responsibilities.
Charlotte: Structural first — good. What about the conversation itself?
  → marked obj(s): 1
Student: If I were in your shoes, I’d approach her with empathy and ask open-ended questions to understand her perspective.
Charlotte: Got it.
  → marked obj(s): 2
Student: How would you open the conversation to set a positive tone?
Charlotte: I'd say: 'I've noticed some challenges lately. Can we discuss how we can support each other better?' Mood matched to moment.
  → marked obj(s): 3
```

## M05 — Impersonal passive (It is said that...), double passive (He is said to be...), causative have/get, passive with reporting verbs

### ~ A01 — It is said that — **67%** (2/3, 5 turns)

```
Charlotte: It is reported that AI will reshape half of all jobs within a decade. What's your read?
Student: It is believed that most jobs will evolve rather than vanish entirely.
Charlotte: Reshape vs evolve — important distinction. Anything else you’d like to add?
  → marked obj(s): 1
Student: It cannot be overlooked that certain industries may face greater challenges than others.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: It's worth noting that teaching methodologies are likely to change significantly as well.
Charlotte: Sure!
Student: There's a growing emphasis on personalized learning experiences in the classroom.
Charlotte: Sounds good.
Student: It has been suggested that technology integration will become a key focus in teacher training programs.
Charlotte: Cool.
  → stuck 3 turns, aborting
```

### ✗ A02 — He is said to be — **33%** (1/3, 4 turns)

```
Charlotte: The CEO of that startup is said to be in talks with three buyers. What else have you heard?
Student: Two of the cofounders are thought to be against the sale.
Charlotte: Internal friction makes deals collapse. An early investor is reported to have already exited his position. What do you think about that?
  → marked obj(s): 1
Student: It seems like the situation is becoming increasingly unstable, which could deter potential buyers.
Charlotte: Sure!
Student: I wonder if they can resolve their issues before it’s too late.
Charlotte: Sure!
Student: If they don't, they might miss out on a great opportunity.
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

### ✓ A03 — Have something done — **100%** (3/3, 4 turns)

```
Charlotte: I just had my bike serviced — saved me a hundred euros. What have you outsourced lately?
Student: I had my taxes done by an accountant this year to avoid any hassle.
Charlotte: Some things are worth the fee. What else are you getting done?
  → marked obj(s): 1
Student: I need to have my garden cleaned up before the spring.
Charlotte: Garden cleanup sounds essential! Passport offices are their own form of suffering. Have you ever had to deal with that?
  → marked obj(s): 2
Student: Yes, I had to renew my passport last year, and the wait was unbearable!
Charlotte: Sounds good.
Student: Was the service worth the stress, though?
Charlotte: Saved the chain, the gears, my sanity. Logistics, sorted.
  → marked obj(s): 3
```

### ✗ A04 — Get yourself done — **33%** (1/3, 4 turns)

```
Charlotte: Last month I had my passport lost by an airline. Worst part: they offered a coupon. What's your recent disaster?
Student: I had my package marked as delivered when it never arrived, and I got nothing but excuses.
Charlotte: The phantom delivery — modern classic. I can’t believe how often that happens! What else has gone wrong recently?
  → marked obj(s): 2
Student: I had my car serviced, but they returned it with more issues than before!
Charlotte: Oh no, that's frustrating! I guess you didn't get any compensation for that either?
Student: Exactly, just more apologies and no solutions!
Charlotte: Sounds good.
Student: I feel like I'm stuck in a cycle of bad luck lately!
Charlotte: Got it.
  → stuck 3 turns, aborting
```

### ✓ A05 — Mixed passive register — **100%** (3/3, 7 turns)

```
Charlotte: It is widely reported that one of our competitors is about to be acquired. What's your view?
Student: It is believed that this acquisition could shake up the entire market.
Charlotte: Sounds good.
Student: It is rumored that their CFO has already met with several potential buyers.
Charlotte: Cool.
  → marked obj(s): 1
Student: It is expected that an announcement will be made by the end of this month.
Charlotte: Got it.
Student: It is suggested that we should prepare our strategy in light of these developments.
Charlotte: Absolutely. If it's true, the timeline is fast. What actions do you think we should take?
Student: I'm having our marketing materials updated in case we need to respond quickly.
Charlotte: Prudent. Worst case scenario?
  → marked obj(s): 2
Student: It is feared that we could lose market share if we don't act decisively.
Charlotte: Got it.
Student: What do you think it means for us if they are acquired?
Charlotte: Pressure on price, opportunity on talent. Passive layered, situation tracked.
  → marked obj(s): 3
```

## M06 — Participle clauses — present (-ing), past (-ed), perfect (Having + past participle), perfect passive (Having been + past participle), with-clauses

### ✗ A01 — Walking down the street — **33%** (1/3, 4 turns)

```
Charlotte: Walking past my old school last week, I felt fifteen all over again. What did your last walk make you feel?
Student: Strolling through the park yesterday, I was reminded of carefree summer days.
Charlotte: That sounds lovely! Strolling through the park, I often notice small changes in nature. What else do you notice during your walks?
  → marked obj(s): 2
Student: Wandering along the riverbank, I often spot families enjoying picnics and children playing.
Charlotte: Cool.
Student: Exploring the city streets, I sometimes discover hidden art murals that brighten my day.
Charlotte: Sounds good.
Student: Roaming around the market, I frequently encounter local vendors sharing stories about their crafts.
Charlotte: Nice.
  → stuck 3 turns, aborting
```

### ~ A02 — Built in 1900 — **67%** (2/3, 7 turns)

```
Charlotte: Founded by a former monk, the little bookshop on my street has been there for forty years. Tell me about a place near you.
Student: Built in the 1920s, my café has the kind of charm that keeps customers coming back.
Charlotte: That sounds lovely! It's amazing how some places can create a special atmosphere. What else can you tell me about it?
  → marked obj(s): 2
Student: With vintage decor and cozy seating, it's the perfect spot to relax with a good book.
Charlotte: Sounds like a wonderful place to unwind! Raised on those stories, do you often find yourself getting lost in books there?
Student: Having spent many afternoons there, I often lose track of time in the pages of my favorite novels.
Charlotte: Cool.
Student: Nestled in a quiet corner, the café also serves the best coffee in town.
Charlotte: That makes it even more appealing! Does the café have any special drinks or pastries that you'd recommend?
  → marked obj(s): 1
Student: Yes, their hazelnut latte is a must-try, and the almond croissants are simply divine!
Charlotte: Those sound delicious! I can almost taste them. Does the café have a unique story behind it, like the bookshop on my street?
Student: Yes, it was once a speakeasy during Prohibition, which adds to its charm!
Charlotte: What a fascinating history! Places like that carry such rich stories. Did they keep any original features from that time?
Student: Yes, they preserved the vintage bar and some original light fixtures, which create a nostalgic vibe.
Charlotte: That sounds amazing! Preserving those elements really helps connect the past with the present. By the way, does anyone interesting work there?
  → stuck 3 turns, aborting
```

### ~ A03 — Having finished — **67%** (2/3, 7 turns)

```
Charlotte: Having taught for fifteen years, I finally feel I'm starting to understand my students. What's something experience clarified for you?
Student: Having traveled extensively, I've learned that different cultures enrich our perspectives.
Charlotte: Absolutely! Having experienced various cultures, I appreciate how they shape our views. What's a specific lesson you've learned from your travels?
  → marked obj(s): 1
Student: Having navigated language barriers, I've realized that communication goes beyond words.
Charlotte: That's a profound insight! Having said that, I find non-verbal cues can be just as powerful. What has been your most memorable experience with this?
Student: Having witnessed a heartfelt gesture in silence, I understood the depth of human connection transcends language.
Charlotte: Cool.
Student: Having shared laughter with strangers, I discovered that joy unites us all.
Charlotte: That's beautiful! Having said that, those moments often create lasting bonds. What was the most surprising connection you made during those encounters?
  → marked obj(s): 2
Student: Having connected with a local artist, I learned that creativity speaks a universal language.
Charlotte: That's wonderful! Having said that, art often reflects shared experiences and emotions. What did that artist teach you about their culture?
Student: Having shared stories over coffee, I discovered the importance of tradition in their daily life.
Charlotte: That's a lovely way to connect! Having engaged in those conversations, I find traditions can reveal so much about a culture. What did you learn from their traditions that surprised you?
Student: Having participated in their festivals, I was amazed by the vibrant ways they celebrate community and heritage.
Charlotte: That sounds incredible! Having experienced those celebrations, I can imagine how they strengthen community bonds. What was your favorite part of the festival?
  → stuck 3 turns, aborting
```

### ✓ A04 — Having been told — **100%** (3/3, 3 turns)

```
Charlotte: Having been mentored by one careful teacher in my twenties, I still hear her edits when I write. Who shaped you most?
Student: Having been inspired by my grandfather's wisdom, I approach challenges with a calm mindset.
Charlotte: Wisdom is a powerful legacy. Having been encouraged by my mentor to embrace creativity, I try to think outside the box. How did your grandfather inspire you?
  → marked obj(s): 1
Student: Having shared his life stories, he taught me the value of perseverance and resilience.
Charlotte: Sure!
  → marked obj(s): 2
Student: What valuable lessons did your mentor impart?
Charlotte: Having been taught the importance of clarity in writing, I focus on simplicity. What did she edit out?
  → marked obj(s): 3
```

### ~ A05 — Reduced relatives + with-clauses — **67%** (2/3, 5 turns)

```
Charlotte: The café, packed with morning regulars and warmed by the smell of fresh bread, was where I made the call. Where did you make a big call recently?
Student: The library, filled with the scent of old books and quiet whispers, is where I finally decided to pursue my dreams.
Charlotte: A perfect spot for inspiration! With thoughts racing, I often find clarity in places like that. What did you dream about?
  → marked obj(s): 1
Student: With my heart racing, I dreamed of traveling the world and experiencing new cultures.
Charlotte: That sounds exhilarating! Who would you want to travel with?
  → marked obj(s): 2
Student: I would want to travel with my best friend, sharing adventures and creating unforgettable memories together.
Charlotte: Sure!
Student: If I could choose anyone, I'd bring my sister; she always makes every trip more fun!
Charlotte: Sounds good.
Student: If given the chance, I'd also invite my parents to share those experiences with them.
Charlotte: Family trips can be so special! Who would you call first to plan the adventure?
  → stuck 3 turns, aborting
```

## M07 — Advanced reporting verbs (apologise for, accuse of, suggest doing, admit + ing), reported emotions, hedged reports, "according to + X"

### ✓ A01 — Apologise for, accuse of — **100%** (3/3, 4 turns)

```
Charlotte: My colleague accused me of leaking the meeting notes. What would you have done?
Student: I would have reassured her and suggested clarifying the situation with evidence.
Charlotte: Calm and thoughtful — that's a solid approach. What do you think could have caused the misunderstanding in the first place?
Student: I would have considered any miscommunication or assumptions that might have led to the accusation.
Charlotte: Absolutely, those factors often create tension. I'd blame the lack of clear ownership for situations like this. How do you think clarity could help avoid such issues?
  → marked obj(s): 1, 2
Student: I believe establishing clear roles and responsibilities could significantly reduce misunderstandings.
Charlotte: Sounds good.
Student: What did you actually do to address the situation?
Charlotte: I asked who else had access, and let the question answer itself. Patterns hold the line.
  → marked obj(s): 3
```

### ✓ A02 — Admit, deny, suggest — **100%** (3/3, 4 turns)

```
Charlotte: I have to admit dreading Mondays for the first time in years. What's something you'd admit?
Student: I have to admit feeling overwhelmed by my to-do list lately.
Charlotte: That’s completely understandable! I often feel the same way. I'd suggest breaking it down into smaller tasks.
  → marked obj(s): 1
Student: I’ve heard that prioritizing tasks can also make a big difference.
Charlotte: Got it.
Student: I’d recommend setting specific deadlines for each task to stay on track.
Charlotte: Sure!
  → marked obj(s): 2
Student: What changed about your feelings towards Mondays?
Charlotte: A meeting got rescheduled, and the whole week now starts late. Admissions, in pattern.
  → marked obj(s): 3
```

### ✓ A03 — Promise, refuse, offer — **100%** (3/3, 3 turns)

```
Charlotte: My doctor offered to refer me to a specialist, and I refused to make the appointment for two weeks. Classic me. What have you promised or refused lately?
Student: I promised to start exercising regularly, and so far I've been sticking to it.
Charlotte: That's fantastic! What about a refusal? Did you turn something down lately?
  → marked obj(s): 1
Student: I declined to join a late-night work meeting last week, and it felt great.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Charlotte, why did you delay making that appointment?
Charlotte: The diagnostic uncertainty. Avoidance, basically. Commitments, with patterns held.
  → marked obj(s): 3
```

### ~ A04 — Warn against, talk into — **67%** (2/3, 8 turns)

```
Charlotte: My grandmother talked me into studying abroad — best decision I never planned. Who shaped a big call of yours?
Student: My friend convinced me to take that job offer I initially hesitated about.
Charlotte: That's great! Sometimes a little push from the right person makes all the difference. Did anyone warn you against anything during that decision-making process?
Student: Yes, a colleague cautioned me that the job might be more demanding than I expected.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Interestingly, my family thought I should stay in my comfort zone instead.
Charlotte: Sure!
Student: However, I ended up taking the leap and it turned out to be a valuable experience.
Charlotte: Nice.
Student: Looking back, I’m grateful for that decision, despite the initial doubts.
Charlotte: Nice.
  → marked obj(s): 1
Student: Have you ever faced a situation where you regretted not taking a risk?
Charlotte: Absolutely! I once hesitated to apply for a competitive program, and I often wonder what could have been. Taking risks can lead to amazing opportunities!
Student: That's so true; sometimes the biggest regrets come from the chances we didn't take!
Charlotte: Exactly! It's all about balancing caution with courage. Do you think you'll take more risks in the future?
Student: I believe so; stepping out of my comfort zone has opened up new possibilities!
Charlotte: That's fantastic to hear! Embracing challenges often leads to growth. Have you faced any specific challenges recently that pushed you?
  → stuck 3 turns, aborting
```

### ~ A05 — According to, allegedly — **67%** (2/3, 4 turns)

```
Charlotte: Apparently, the company is restructuring next month. Have you heard anything more?
Student: According to a colleague, three teams are being merged.
Charlotte: Mergers always look cleaner on paper. I wonder how the teams will adapt to the changes.
  → marked obj(s): 2, 1
Student: I heard that some employees are concerned about their roles in the new structure.
Charlotte: Reportedly, leadership wants the announcement done before Friday. Change can be unsettling for everyone involved.
Student: I was told that there's a meeting scheduled to discuss the changes tomorrow.
Charlotte: Cool.
Student: I heard that they might also be offering training sessions to help with the transition.
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

## M08 — Modal hedging, softening for delicate communication, vague language, distancing devices, polite disagreement

### ✓ A01 — I was wondering if — **100%** (3/3, 3 turns)

```
Charlotte: You wanted to talk. What's on your mind?
Student: I was wondering if you could give me feedback on my proposal before Friday.
Charlotte: I have time tomorrow afternoon. What specifically would you like my feedback on?
  → marked obj(s): 1
Student: I was hoping for your view on which sections to prioritise.
Charlotte: Send me the latest draft this evening.
  → marked obj(s): 2
Student: Thank you for taking the time to help me with this.
Charlotte: Of course! I appreciate your effort. Let me know if there's anything else on your mind.
  → marked obj(s): 3
```

### ✓ A02 — It might be worth — **100%** (3/3, 2 turns)

```
Charlotte: I drafted a one-page project summary. Anything you'd tweak?
Student: It might be worth clarifying who the primary audience is.
Charlotte: Fair — I was vague there. Anything else?
  → marked obj(s): 1
Student: Have you considered adding a single metric of success?
Charlotte: Hadn't thought of it. Good catch! Overall, the structure works well — these are small tweaks.
  → marked obj(s): 2, 3
```

### ✓ A03 — With respect, I'd see it differently — **100%** (3/3, 3 turns)

```
Charlotte: Remote work has run its course. People are more productive in offices. Don't you think?
Student: With respect, the productivity data hasn't really shown that.
Charlotte: It depends on the study, though. Some suggest offices enhance focus and collaboration.
  → marked obj(s): 1
Student: I see your perspective, but many studies highlight that collaboration can thrive online just as well.
Charlotte: Fair point! But I wonder if the energy of in-person interactions can really be replicated online.
  → marked obj(s): 2
Student: What's making you think that in-person energy is irreplaceable?
Charlotte: My own experience suggests that spontaneous conversations and body language create a unique connection. It's hard to replicate that through a screen.
  → marked obj(s): 3
```

### ~ A04 — One might say, In a sense — **67%** (2/3, 5 turns)

```
Charlotte: It could be argued that working less actually makes us more productive. Your read?
Student: I would agree; in a sense, quality of focus often trumps the quantity of hours worked.
Charlotte: Exactly! In knowledge work, focus can significantly enhance output. However, it might not apply to all fields equally.
  → marked obj(s): 2
Student: Indeed, it seems that different industries may require varying levels of focus to achieve optimal results.
Charlotte: Arguably, the four-day workweek is more effective in certain industries, like tech or creative fields, than in others, such as manufacturing or healthcare.
  → marked obj(s): 4
Student: That's a valid point; perhaps we should explore how different sectors can adapt their work models accordingly.
Charlotte: Sounds good.
Student: I’d suggest we examine case studies to see what has worked best in those sectors.
Charlotte: Got it.
Student: It appears that analyzing successful implementations could provide valuable insights.
Charlotte: Cool.
  → stuck 3 turns, aborting
```

### ✓ A05 — Sort of, more or less — **100%** (3/3, 3 turns)

```
Charlotte: How many meetings did you have this week? Roughly?
Student: I had around ten, give or take a couple that fell through.
Charlotte: Cancellations are the only good meetings. How are you feeling after such a busy week?
  → marked obj(s): 1
Student: I'm a bit worn out, but I feel accomplished about what we've achieved.
Charlotte: The week-end mood par excellence. More or less, how did the week go for you overall?
  → marked obj(s): 2
Student: More or less, the week went as I had planned, with a few unexpected twists.
Charlotte: That sounds like a solid week! Mine was similar, give or take a small crisis on Thursday. Casual register, properly vague.
  → marked obj(s): 3
```

## M09 — High-frequency idioms, body/animal/food idioms, dead vs live metaphor, similes, idioms by register

### ✓ A01 — Hit the nail on the head — **100%** (3/3, 3 turns)

```
Charlotte: Our retention numbers slipped last quarter. The CEO thinks it's compensation, but I'm not so sure.
Student: It sounds like compensation might be the tip of the iceberg — there could be deeper issues at play.
Charlotte: Exactly! It's often more complicated than it seems. What do you think the real issue might be?
  → marked obj(s): 1
Student: The elephant in the room is that people don't believe leadership listens.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: What does your gut say about how we can address this?
Charlotte: Same as yours, honestly. We need to tackle communication head-on. Diagnosis, idiomatically grounded.
  → marked obj(s): 3
```

### ✗ A02 — Bite the bullet, cold feet — **33%** (1/3, 6 turns)

```
Charlotte: I bit the bullet last year and told my parents I wasn't going back into medicine. Have you ever had to deliver hard news?
Student: Yes, I had to face the music and let my team know I was leaving the project.
Charlotte: That sounds tough! Did you hesitate before telling them?
Student: A little, but I knew I had to be upfront about it.
Charlotte: I admire that honesty. Did you have cold feet about it at any point?
Student: Yes, I did have cold feet, but I realized it was better to be transparent.
Charlotte: Sure!
  → marked obj(s): 2
Student: I really appreciate your support; it made the conversation a bit easier.
Charlotte: Sure!
Student: I’m glad we can share these experiences; it really helps to talk about them.
Charlotte: Nice.
Student: Absolutely, it’s therapeutic to open up about our challenges.
Charlotte: Cool.
  → stuck 3 turns, aborting
```

### ✓ A03 — Piece of cake, spill the beans — **100%** (3/3, 2 turns)

```
Charlotte: Someone leaked the salary bands to the whole company on Friday. Chaos all weekend.
Student: Whoever spilled the beans must have known it would create such a stir!
Charlotte: Friday afternoon — a classic recipe for disaster. 😅
  → marked obj(s): 1
Student: Containing it will be no piece of cake — once the numbers are out, you can't un-leak them.
Charlotte: We're already past the 'is it true' phase. Everyone’s on edge!
  → marked obj(s): 2, 4
```

### ✓ A04 — Two birds with one stone — **100%** (3/3, 2 turns)

```
Charlotte: I've sent over the full brief. Where do we go from here?
Student: Now the ball is in my team's court — we'll review and come back with edits by Wednesday.
Charlotte: Perfect cadence. Anything to combine?
  → marked obj(s): 2, 1
Student: What's the highest priority for you in this project?
Charlotte: The tone of the executive summary. We need to be on the same page there. Handoff cleanly framed.
  → marked obj(s): 3
```

### ✓ A05 — Crystal clear, low-hanging fruit — **100%** (3/3, 3 turns)

```
Charlotte: Leaving the corporate job felt like the end of the world at the time. In retrospect, blessing in disguise. Have you had a moment like that?
Student: Absolutely, losing my job pushed me to pursue my passion for writing, which I had always hesitated to follow.
Charlotte: That's a perfect example! Sometimes, the universe nudges us in the right direction. What do you think about the independence that comes with pursuing your passion?
  → marked obj(s): 1
Student: Independence is a double-edged sword — it offers freedom, but also the weight of responsibility to carve my own path.
Charlotte: Got it.
  → marked obj(s): 2
Student: What made it crystal clear it was time to embrace that responsibility?
Charlotte: A Sunday-night dread that lasted three years. C1 closing — figurative breath.
  → marked obj(s): 3
```

## M10 — Advanced discourse markers — nuance (in fact, as a matter of fact), concession (that said, mind you), reformulation (in other words, put differently), topic shifts (incidentally, by the way), emphatic chains (what's more, not least, above all)

### ~ A01 — In fact, as a matter of fact — **67%** (2/3, 4 turns)

```
Charlotte: People keep saying remote work has killed productivity. Your read?
Student: Actually, most studies indicate that productivity rose or remained steady, not declined.
Charlotte: And the counter-narrative?
  → marked obj(s): 1
Student: In fact, the productivity dip people remember was driven by the pandemic itself, not by where people worked.
Charlotte: The cause keeps getting confused with the conditions. What are your thoughts on that?
  → marked obj(s): 2
Student: I believe it's crucial to differentiate between the external pressures of the pandemic and the effectiveness of remote work itself.
Charlotte: That's a great point! Who's saying that remote work is ineffective?
Student: Many business leaders and some traditionalists argue that face-to-face interaction is essential for collaboration.
Charlotte: Mostly the same CEOs who lease the empty offices. Assumption properly nuanced.
```

### ~ A02 — That said, mind you — **67%** (2/3, 4 turns)

```
Charlotte: AI is going to make most knowledge work obsolete in a decade. Hard truth.
Student: There's something to that. That said, 'most' is doing a lot of work in that sentence.
Charlotte: Fair pushback. What survives?
  → marked obj(s): 2, 1
Student: In any case, creativity and emotional intelligence seem likely to endure.
Charlotte: Then again, every major shift looked total in advance and partial in retrospect.
Student: That being said, we shouldn't underestimate the adaptability of human skills.
Charlotte: Cool.
Student: Nonetheless, we mustn't ignore the potential for new roles to emerge alongside these changes.
Charlotte: Nice.
  → stuck 3 turns, aborting
```

### ✓ A03 — In other words, put differently — **100%** (3/3, 3 turns)

```
Charlotte: We're optimising for asymmetric upside in a thin market with low capital intensity. Make sense?
Student: In other words, you're looking for high rewards in a niche market without heavy investment.
Charlotte: That's it, in twelve fewer syllables. 😊
  → marked obj(s): 1
Student: To put it simply, you're after big gains with minimal risk.
Charlotte: Exactly! You're catching on really well. 👏
  → marked obj(s): 2
Student: Have I got it right?
Charlotte: Better than my own pitch deck does. Jargon decoded, plainly.
  → marked obj(s): 3
```

### ~ A04 — Above all, what's more — **67%** (2/3, 4 turns)

```
Charlotte: You chose to stay in your current job instead of taking a fancier offer. Why?
Student: The work itself still excites me, and my manager has been really supportive of my career aspirations.
Charlotte: Rare. What else?
Student: Moreover, I've built strong relationships with my colleagues, which makes a big difference.
Charlotte: Not least, the team I built took years to assemble and I'd be starting from zero somewhere else.
  → marked obj(s): 2
Student: Additionally, the projects I’m working on are truly impactful, which keeps me motivated.
Charlotte: And the real reason?
Student: To be honest, I feel a sense of loyalty to the company that has invested in my growth.
Charlotte: Above all, the fancier offer was about title — and I've already learned that's the thinnest reason to move.
  → marked obj(s): 3
```

### ~ A05 — All things considered, hence — **67%** (2/3, 5 turns)

```
Charlotte: How would you sum up the year, on balance?
Student: On balance, it was challenging yet filled with valuable lessons.
Charlotte: Meaningful lessons often come from challenges. What stands out to you underneath that?
  → marked obj(s): 1
Student: Granted, I faced several obstacles, but each one taught me resilience and adaptability.
Charlotte: Nice.
  → marked obj(s): 2
Student: In any case, I believe those experiences have shaped my perspective significantly.
Charlotte: Sure!
Student: That said, I'm optimistic about the opportunities ahead.
Charlotte: Sounds good.
Student: Ultimately, growth often stems from overcoming adversity.
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

## M11 — Word connotation (positive/negative/neutral), formal vs informal register, euphemism, loaded language, litotes and hyperbole, code-switching

### ~ A01 — Assertive or pushy? — **67%** (2/3, 5 turns)

```
Charlotte: My new director is — I don't know — really direct? Maybe too direct. I can't decide if I admire it or it's exhausting.
Student: If you admire it, she's probably more assertive than aggressive — direct without making you feel attacked.
Charlotte: There IS room in her directness, mostly.
  → marked obj(s): 1
Student: If it's exhausting, the line you're feeling is between assertive and pushy.
Charlotte: Nice.
  → marked obj(s): 4
Student: It’s all about finding that balance, isn’t it?
Charlotte: That's exactly the line. What do you think — assertive or pushy?
Student: I’d say it depends on how her directness impacts the team’s dynamics.
Charlotte: Cool.
Student: Absolutely, the impact on team morale can really make a difference.
Charlotte: Got it.
  → stuck 3 turns, aborting
```

### ~ A02 — Commence, ascertain, demonstrate — **67%** (2/3, 5 turns)

```
Charlotte: I wrote: 'We're going to kick off the new programme and look into the feedback we got.' That feels too casual for the audience. Fix?
Student: We will commence the new programme and examine the feedback we received.
Charlotte: Better. Can it go further?
  → marked obj(s): 1
Student: We shall initiate the new programme and ascertain the substance of the feedback we have received.
Charlotte: Got it.
  → marked obj(s): 2
Student: We are poised to launch the new programme and thoroughly analyze the feedback provided.
Charlotte: Sure!
Student: We are prepared to unveil the new programme and meticulously evaluate the feedback collected.
Charlotte: Cool.
Student: We are set to introduce the new programme and rigorously assess the feedback gathered.
Charlotte: Nice.
  → stuck 3 turns, aborting
```

### ✓ A03 — Pass away, between jobs — **100%** (3/3, 3 turns)

```
Charlotte: An old friend's father passed away last week. I'm not sure what to write in the card.
Student: I’m really sorry to hear that; a simple note expressing your condolences would be meaningful.
Charlotte: That's a good start. What do you think I should include to comfort her?
  → marked obj(s): 1
Student: You might say something like, "I know he meant the world to you, and you'll be in my thoughts as you navigate this.
Charlotte: Nice.
  → marked obj(s): 2
Student: How close are you to her?
Charlotte: Close enough that silence would hurt, distant enough that I shouldn't write a novel. Card drafted, weight respected.
  → marked obj(s): 3
```

### ✓ A04 — Not bad, no small feat — **100%** (3/3, 3 turns)

```
Charlotte: Saw a film last night — let's say it wasn't a complete waste of two hours. How was your week?
Student: Not without its moments — survived three deadlines, and only one nearly did me in!
Charlotte: A respectable casualty count. What got through?
  → marked obj(s): 1
Student: Just a couple of presentations and a report — nothing I couldn't handle, thankfully!
Charlotte: Finishing the redesign in a week was no small feat — and I wouldn't say no to a quiet weekend now.
  → marked obj(s): 2
Student: Speaking of films, what was the film you saw?
Charlotte: Three hours, two narrators, one ending I'm not entirely sure I understood. Deadpan, sustained.
  → marked obj(s): 3
```

### ✓ A05 — Code-switching — **100%** (3/3, 3 turns)

```
Charlotte: (As your manager) I understand you have concerns about the timeline. Walk me through them.
Student: I appreciate the opportunity to share my view; my main concern is that we haven't completed a full regression cycle, which could jeopardize the launch quality.
Charlotte: (Now your peer) Off the record — same question, plain English.
  → marked obj(s): 1
Student: Honestly? We're not ready at all; the tests are still failing, and we can't ignore that.
Charlotte: (Now your closest friend) And what's underneath all that?
  → marked obj(s): 2
Student: I’m just worried that if it goes wrong, it’ll reflect badly on me, not just the project.
Charlotte: Three audiences, three Englishes, one truth underneath. Register, fully fluent. C1 block closed.
  → marked obj(s): 3
```

### ✗ A06 — UK vs US + Falsos cognatos cross-link — **33%** (1/3, 4 turns)

```
Charlotte: If you're writing to an American client, you should use 'elevator', 'apartment', 'vacation'. But for British clients, switch to 'lift', 'flat', 'holiday'. Which version do you default to?
Student: I default to American English because that's what my schoolbooks used, but I've become more flexible since working with British colleagues.
Charlotte: Sensible. And false cognates from Portuguese — which ones still trip you?
  → marked obj(s): 2
Student: I often mix up "actually" and "eventually," thinking they mean the same thing!
Charlotte: That's a common one! In English, 'actually' means 'in fact', while 'eventually' refers to something happening at a later time. Any others that trip you up?
Student: I sometimes confuse "sympathetic" with "sympathetic," thinking they carry the same meaning!
Charlotte: That one can be tricky! In English, 'sympathetic' means showing compassion, while in Portuguese it often means 'likeable'. Any others you find confusing?
Student: I also get mixed up with "pretend" and "pretender," assuming they have similar meanings!
Charlotte: Got it.
  → stuck 3 turns, aborting
```

## M12 — Academic register — nominalisation, impersonal voice, hedged claims, citation patterns, paragraph cohesion

### ~ A01 — Nominalisation — **67%** (2/3, 5 turns)

```
Charlotte: I've drafted: 'Companies are spending more on cybersecurity every year.' For a research paper — too plain. Help me lift it?
Student: Consider: 'The increase in corporate cybersecurity spending has accelerated in each of the past five years.
Charlotte: Much better! Anything else we can compress or enhance?
  → marked obj(s): 1
Student: You might say: 'This surge in investment is driven in part by the emergence of new threat vectors and a shift towards remote work.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: You could also add: 'This trend underscores the critical need for robust cybersecurity measures in today's digital landscape.
Charlotte: Sure!
Student: You might want to emphasize: 'Such proactive measures are essential to mitigate evolving cyber threats effectively.
Charlotte: Got it.
Student: Consider concluding with: 'Ultimately, these developments highlight the ongoing evolution of the cybersecurity landscape.
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

### ~ A02 — Impersonal voice — **67%** (2/3, 4 turns)

```
Charlotte: Here's my draft: 'I've noticed that students seem to do better when they get feedback within 24 hours. I think this is because the connection between work and response is fresh.' For a paper — too subjective. Fix?
Student: Try: "The data suggest that students perform measurably better when feedback is delivered within 24 hours due to the freshness of the connection between work and response.
Charlotte: And how would you explain that observation?
  → marked obj(s): 1
Student: A plausible explanation is that the temporal proximity between task and response strengthens the cognitive link between effort and outcome.
Charlotte: Got it.
  → marked obj(s): 2
Student: Furthermore, studies indicate that timely feedback enhances motivation and promotes deeper learning.
Charlotte: Nice.
Student: Additionally, research has shown that immediate feedback can significantly reduce anxiety and improve performance.
Charlotte: These findings indicate that immediate feedback not only alleviates anxiety but also contributes to enhanced performance outcomes. This reinforces the importance of timely responses in educational settings.
```

### ~ A03 — Hedged claims — **67%** (2/3, 5 turns)

```
Charlotte: I wrote: 'Our findings prove that remote workers are more productive than office workers.' For a journal — too strong. Help me dial it back?
Student: Try: "Our findings suggest that remote workers may exhibit higher productivity compared to office workers.
Charlotte: Much better! Now, can you add a limitation to that statement?
  → marked obj(s): 1
Student: And: "It should be noted that the effect was modest and may not generalise to roles requiring extensive in-person collaboration.
Charlotte: Cool.
  → marked obj(s): 2
Student: Additionally, further research is needed to explore the long-term implications of remote work on productivity.
Charlotte: Sounds good.
Student: Moreover, the sample size was relatively small, which could affect the reliability of our conclusions.
Charlotte: Cool.
Student: Finally, it's essential to consider individual differences that may influence productivity outcomes.
Charlotte: Great points! Now, how significant was the effect size in your findings?
  → stuck 3 turns, aborting
```

### ~ A04 — Citation patterns — **67%** (2/3, 5 turns)

```
Charlotte: Smith said in 2020 that early feedback matters. I'm writing about it for my paper. How do I phrase that?
Student: Try: "Smith (2020) argues that early feedback is crucial for improving performance.
Charlotte: Great suggestion! And how do I link it to my own work?
  → marked obj(s): 1
Student: Then: "Building on Smith's (2020) argument, this study explores the implications of early feedback in creative processes.
Charlotte: Sure!
  → marked obj(s): 2
Student: Consider adding: "Furthermore, this research integrates findings from recent studies to enhance understanding of feedback mechanisms.
Charlotte: Got it.
Student: You might also say: "This paper draws on a variety of sources to provide a comprehensive analysis of feedback dynamics.
Charlotte: Cool.
Student: Additionally, you could mention: "This investigation synthesizes perspectives from diverse disciplines to enrich the discussion on feedback.
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

### ~ A05 — Paragraph cohesion — **67%** (2/3, 5 turns)

```
Charlotte: My first paragraph ends: 'The intervention reduced anxiety by 23%.' How do I open the next paragraph to keep flow?
Student: You might say, "While this reduction in anxiety is notable, it is essential to explore its variability across different demographics.
Charlotte: That's a great transition! It leads nicely into discussing subgroup differences. What if I want to highlight a contrast in the data?
  → marked obj(s): 1
Student: You could start with, "In contrast, the intervention had a negligible effect on depressive symptoms during the same period.
Charlotte: Cool.
  → marked obj(s): 2
Student: To further emphasize this contrast, you might add, "This discrepancy raises important questions about the intervention's overall efficacy.
Charlotte: Sounds good.
Student: To conclude, you could state, "Ultimately, these findings suggest a need for tailored approaches in mental health interventions.
Charlotte: That's a strong conclusion! It ties everything together well. How do you plan to land the overall discussion?
Student: You might consider stating, "In summary, the evidence underscores the complexity of mental health interventions and the necessity for ongoing research.
Charlotte: That's an excellent summary! It encapsulates the discussion nicely. Discussion threaded, C2 opener landed.
```

## M13 — Building argument (claim/warrant/evidence), anticipating counterargument, rhetorical devices (anaphora, antithesis, tricolon), persuasive structure, strong conclusions

### ~ A01 — Building the case — **67%** (2/3, 4 turns)

```
Charlotte: We're considering a four-day workweek. Build the case for trying it.
Student: The evidence suggests that a four-day workweek could enhance productivity and employee well-being.
Charlotte: Great start! Can you give me three specific reasons to support that evidence?
Student: The case for piloting a four-day workweek rests on improved focus, reduced burnout, and increased job satisfaction.
Charlotte: Awesome points! Can you elaborate with three specific reasons for each of those benefits?
  → marked obj(s): 1
Student: First, improved focus leads to higher quality work; second, reduced burnout fosters creativity; third, increased job satisfaction enhances retention rates.
Charlotte: Nice.
  → marked obj(s): 2
Student: However, the loudest objection in our team is the concern over potential project delays.
Charlotte: That's a valid concern. However, we can address it by ensuring clear communication and prioritizing tasks effectively. Argument constructed, climax delivered.
```

### ✓ A02 — Anticipating counterargument — **100%** (3/3, 5 turns)

```
Charlotte: You're proposing remote-first hiring. But isn't that just outsourcing in disguise?
Student: While some might equate the two, it's crucial to recognize that outsourcing focuses on cost, whereas remote-first hiring emphasizes accessing diverse talent.
Charlotte: Talent access is doing a lot of work in that sentence. How exactly does it change the hiring landscape?
  → marked obj(s): 1
Student: The deeper question is whether we are prepared to embrace a broader definition of talent that transcends geographical boundaries.
Charlotte: That's a great point! Embracing a broader definition of talent can lead to innovative solutions and diverse perspectives. What do you think are the challenges in implementing this approach?
  → marked obj(s): 2
Student: One significant challenge is overcoming biases and ensuring equitable opportunities for all candidates, regardless of location.
Charlotte: Sure!
Student: What strategies could we employ to mitigate these biases effectively?
Charlotte: We could implement standardized assessments, diversify hiring panels, and provide training on unconscious bias. Additionally, using AI tools can help reduce subjective decision-making.
Student: What’s your next push to ensure these strategies are effectively integrated into the hiring process?
Charlotte: I would focus on continuous training and feedback loops within the organization. Regular evaluations of hiring practices can help identify biases and improve strategies over time.
  → marked obj(s): 3
```

### ✓ A03 — Anaphora, antithesis, tricolon — **100%** (3/3, 4 turns)

```
Charlotte: I'm opening a conference on disability rights tomorrow. Help me draft an opener that lands.
Student: Good morning everyone, we gather here today not just to discuss disability rights, but to demand them, because change does not come to those who wait.
Charlotte: Great start! You used anaphora effectively. What can we add to emphasize the urgency of our cause?
  → marked obj(s): 1
Student: Then drop in: "Accessibility is not charity — it is justice taking the form of a ramp, a captioned line, an opened door.
Charlotte: That sentence is the keeper! Now, how do you want to close this powerful opener?
Student: Let's conclude with: "Together, we will dismantle barriers and build a future where everyone belongs.
Charlotte: That's a strong finish! To make it even more impactful, consider a tricolon structure like: 'Today we listen, tomorrow we act, every day after that we thrive.'
  → marked obj(s): 2
Student: Let's refine it to: "Today we listen, tomorrow we organise, every day after that we demand.
Charlotte: Opener drafted, rhetorically structured. Your speech will resonate! What do you think about the overall flow?
  → marked obj(s): 3
```

### ✓ A04 — Cause-and-effect chains — **100%** (3/3, 2 turns)

```
Charlotte: Why has consumer trust in news dropped so sharply?
Student: The shift to ad-driven revenue has forced outlets to prioritize sensationalism over substance, undermining trust.
Charlotte: And from there, how does that impact consumer perception?
  → marked obj(s): 1
Student: Sensationalism eroded credibility, which in turn fed the narrative that 'media is biased,' justifying consumers' shift to less-edited sources.
Charlotte: That's a self-reinforcing cycle. From this it follows that rebuilding trust requires a different business model, one not reliant on attention-driven revenue.
  → marked obj(s): 2, 3
```

### ✓ A05 — Strong conclusions — **100%** (3/3, 3 turns)

```
Charlotte: The speech is on civic participation. How would you close it?
Student: What is at stake is not just our participation, but our faith in the power of collective action to drive change.
Charlotte: That reframes the whole talk beautifully! Now, what choice do we face?
  → marked obj(s): 1
Student: The choice we face is whether to engage actively in shaping our society or to remain passive observers of its evolution.
Charlotte: That's a compelling choice! Now, for the final call to action, what do we need to do?
  → marked obj(s): 2
Student: If we choose to stand by, we risk ceding our future to those who may not share our vision.
Charlotte: Exactly! The room you leave empty will be filled. That's the line they'll quote. Speech closed, persuasion complete.
  → marked obj(s): 3
```

## M14 — Metaphor and extended metaphor, simile patterns, personification, imagery, sentence rhythm and fragments, showing over telling

### ~ A01 — Metaphor and simile — **67%** (2/3, 2 turns)

```
Charlotte: Take 'attention is the new oil'. Run it for three sentences — extend it without restating.
Student: In a world where distractions abound, capturing focus has become the most valuable currency; just as oil fueled the industrial age, attention now drives innovation and connection.
Charlotte: Now extend.
Student: As businesses vie for consumer engagement, the ability to command attention transforms into a strategic asset, shaping narratives and influencing decisions in ways previously unimaginable.
Charlotte: And like every oil age before it, the consequences of this relentless pursuit — from privacy erosion to mental fatigue — are quietly mounting beneath the surface.
  → marked obj(s): 2, 3
```

### ~ A02 — Personification — **67%** (2/3, 5 turns)

```
Charlotte: I wrote: 'The office was empty. The lights were on. The clock said 8 p.m.' Too flat. Animate it.
Student: The office buzzed with an electric tension, the lights casting shadows that danced like restless spirits.
Charlotte: That's a fantastic start! Now, what about the clock? How can we bring it to life?
  → marked obj(s): 1
Student: The clock ticked steadily, a relentless heartbeat marking the passage of time in the stillness.
Charlotte: Got it.
  → marked obj(s): 2
Student: The air was thick with anticipation, as if the room itself held its breath, waiting for something to happen.
Charlotte: Got it.
Student: The walls seemed to lean in, eager to eavesdrop on the secrets about to unfold.
Charlotte: Sounds good.
Student: The shadows stretched and curled, whispering tales of the past to anyone willing to listen.
Charlotte: Cool.
  → stuck 3 turns, aborting
```

### ~ A03 — Vivid verbs, specific nouns — **67%** (2/3, 5 turns)

```
Charlotte: I wrote: 'She went into the café and sat down. A man was there. He was looking at his phone.' Bring it to life.
Student: She pushed through the door of the café and slid into the booth by the window, where a man was absorbed in his phone, oblivious to the world around him.
Charlotte: That’s vivid! Now, can you give more detail about the man? What does he look like or how does he seem?
  → marked obj(s): 1
Student: In the dim light, he wore a grey overcoat, his brow furrowed in concentration, fingers moving deliberately over the screen as if lost in thought.
Charlotte: Cool.
  → marked obj(s): 2
Student: His unkempt hair fell over his forehead, casting shadows on his face, hinting at a restless night.
Charlotte: Got it.
Student: The aroma of freshly brewed coffee mingled with the soft hum of conversation, wrapping the scene in a cozy embrace.
Charlotte: Sounds good.
Student: Outside, raindrops tapped rhythmically against the window, blurring the world beyond and creating a cocoon of intimacy.
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

### ~ A04 — Sentence rhythm and fragments — **67%** (2/3, 5 turns)

```
Charlotte: I wrote: 'When my father died I was thirty-two and I didn't know what to do and the house felt strange and nothing made sense for a long time.' All one breath. Help me break it.
Student: Try: "When my father died, I was thirty-two; the house felt strange, as if it were holding its breath, waiting for something to change.
Charlotte: That rhythm flows beautifully! Keep going with that imagery. What else can you add?
  → marked obj(s): 1
Student: Then add: "I did not know what to do. Nothing made sense for a long time. That was the year I learned to live with not-knowing.
Charlotte: Got it.
  → marked obj(s): 2
Student: Time became a shadow, stretching and contracting, as I navigated through the fog of my grief.
Charlotte: Sounds good.
Student: Memories flickered like candlelight, illuminating moments of joy now tinged with sorrow.
Charlotte: Got it.
Student: The echoes of laughter lingered in the corners, bittersweet reminders of what once was.
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

### ✓ A05 — Show, don't tell — **100%** (3/3, 3 turns)

```
Charlotte: I wrote: 'She felt lonely in the new city. The apartment was empty. She missed her friends.' Three flat tells. Show them.
Student: Try: "The city loomed around her, vast and indifferent, while the silence of the empty apartment echoed her longing for familiar laughter.
Charlotte: That’s powerful! Now, how about showing the emptiness in the apartment?
  → marked obj(s): 1
Student: The walls whispered secrets of solitude, their bare surfaces reflecting the absence of warmth and laughter.
Charlotte: Great imagery! Now, can you show us how she feels about missing her friends?
  → marked obj(s): 2
Student: Her heart ached with each memory, like a song played on repeat, haunting the corners of her mind.
Charlotte: Beautiful! Close with something about how she interacts with her friends' memories or messages.
  → marked obj(s): 3
```

## M15 — High-C2 phrasal verbs — separable/inseparable distinctions, multiple meanings, low-frequency but native-natural verbs

### ✓ A01 — Bring about, bring round, come round — **100%** (3/3, 3 turns)

```
Charlotte: It took my company three years to accept remote work. How would you describe that process?
Student: What brought about the shift was probably the pandemic — once people adapted, the policy followed.
Charlotte: That's a significant factor! It sounds like the pandemic really shifted perspectives. Departures usually do more than memos, right?
  → marked obj(s): 1
Student: Absolutely, sometimes it takes a shake-up for leadership to see the bigger picture.
Charlotte: Senior leadership came round slowly — they had to lose two key hires before the policy really moved.
  → marked obj(s): 2
Student: Who was the last to come round to the idea?
Charlotte: The CFO. He brought about a 'compromise' that was just remote work in different language. It was quite the journey!
  → marked obj(s): 3
```

### ✓ A02 — Gloss over, crop up, single out — **100%** (3/3, 3 turns)

```
Charlotte: I read three different write-ups of the same story and got three different impressions. What does that tell you?
Student: It suggests that each version likely glossed over the angles inconvenient to its own audience.
Charlotte: That's a sharp observation! It really highlights how media can shape narratives. Did you notice any patterns in the coverage?
  → marked obj(s): 1
Student: Absolutely, the same two facts probably crop up in all three, but framed in completely different ways.
Charlotte: Nice.
  → marked obj(s): 2
Student: Was anyone singled out across all three?
Charlotte: One name — the regulator who wouldn't comment. The silence got singled out by everyone. Coverage parsed, phrasally.
  → marked obj(s): 3
```

### ✓ A03 — Live up to, fall through, iron out — **100%** (3/3, 4 turns)

```
Charlotte: Q2 was rough — two contracts collapsed and our product didn't perform like we promised. What would you have done?
Student: I would have communicated transparently about the challenges and adjusted expectations accordingly.
Charlotte: That's a solid approach! Not living up to a public promise is the hardest thing to recover from—trust is the slowest thing to rebuild. How do you think we can move forward?
Student: We should focus on rebuilding trust through consistent communication and delivering on smaller commitments first.
Charlotte: It's slower than the financial recovery, that's for sure. But, I agree; small wins can help. How do you think we can iron out the technical issues we faced?
  → marked obj(s): 1
Student: We could conduct a thorough review of the product's performance and implement necessary updates step by step.
Charlotte: Sure!
  → marked obj(s): 2
Student: How did you tide the team over financially during this tough period?
Charlotte: A short bridge from existing investors. Nothing dramatic—just enough to give us six months of quiet. Quarter survived, phrasally.
  → marked obj(s): 3
```

### ✗ A04 — Talk down to, wear down, shake off — **0%** (0/3, 3 turns)

```
Charlotte: I worked with someone for five years who talked down to everyone but never noticed. I tried to address it — and got nowhere.
Student: It's frustrating when people are oblivious to their own condescension.
Charlotte: Absolutely! It's like they don't even realize the impact of their words. Did you feel you could ever confront them about it?
Student: I hesitated to confront them, fearing it might escalate the situation further.
Charlotte: That makes sense. Sometimes, avoiding confrontation feels safer, but it can wear you down over time. How did you cope with that dynamic?
Student: I tried to focus on my work and maintain a positive attitude, but it was definitely challenging.
Charlotte: It's tough to stay positive in that environment. Five years of that kind of behaviour really wears you down without you realizing it. Did you ever consider leaving?
  → stuck 3 turns, aborting
```

### ✓ A05 — Stem from, amount to, water down — **100%** (3/3, 3 turns)

```
Charlotte: The product team keeps missing its targets. The pattern is too consistent to be bad luck. What's your hypothesis?
Student: My hypothesis is that it stems from how the targets get set — too much top-down pressure and not enough input from the team.
Charlotte: Process, not people. Let's dig deeper into the issues with the current setup. What do you think it amounts to in terms of outcomes?
  → marked obj(s): 1
Student: The current process amounts to a cycle of unrealistic expectations, leading to disappointment and disengagement among the team.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Where would you intervene first to address these issues?
Charlotte: The forecasting meeting. The whole pattern stems from what happens — or doesn't — in that one hour. Diagnosis, phrasally precise.
  → marked obj(s): 3
```

## M16 — Prefixes (un-, dis-, mis-, pre-, over-, under-, re-), suffixes (-tion, -ment, -ness, -ity, -able, -ise), compounds (closed/hyphenated/open), conversion (noun ↔ verb), nuanced word families

### ✓ A01 — Negation prefixes — **100%** (3/3, 4 turns)

```
Charlotte: My old colleague is really unresponsible with deadlines. Drove me mad.
Student: Small correction — it's 'irresponsible' with 'ir-' before the 'r' of 'responsible'.
Charlotte: Right. I always second-guess that one. Have you ever worked with someone similarly irresponsible?
  → marked obj(s): 1
Student: Yes, I once had a teammate who consistently missed deadlines, which created a lot of stress for the whole team.
Charlotte: Cool.
Student: And his lack of communication made it even worse — we were often left in the dark about progress.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Did he ever change his ways, or was it a constant struggle?
Charlotte: Only after losing a major account. By then it was too late. Vocabulary calibrated.
  → marked obj(s): 3
```

### ~ A02 — Suffixes for nouns — **67%** (2/3, 4 turns)

```
Charlotte: I wrote: 'The team decided to expand, and they performed better. We grew faster than competitors.' For a board report — too active. Help me nominalise?
Student: The team's decision to expand resulted in improved performance and accelerated growth compared to competitors.
Charlotte: Got it.
  → marked obj(s): 1, 2
Student: Consider emphasizing the strategic expansion as a catalyst for enhanced performance and competitive advantage.
Charlotte: Great suggestion! How about framing it as: 'The strategic expansion served as a catalyst for enhanced performance and competitive advantage' ?
Student: That sounds perfect for the board report!
Charlotte: Got it.
Student: Consider adding a section on the projected outcomes to strengthen the report further.
Charlotte: Got it.
  → stuck 3 turns, aborting
```

### ✓ A03 — Suffixes for adjectives and verbs — **100%** (3/3, 5 turns)

```
Charlotte: I want to say someone 'can be relied on' — is the word 'relyable'?
Student: Close — it's 'reliable'. The 'y' in 'rely' becomes 'i' before '-able'.
Charlotte: I always second-guess that. 😅
  → marked obj(s): 1
Student: It's a common mistake, but you'll get the hang of it!
Charlotte: Thanks, SyntheticFelipe! I appreciate your encouragement. I sometimes mix up similar patterns. Do you know another example with that y to i rule?
Student: Sure! 'Deny' becomes 'deniable' — same y to i rule applies!
Charlotte: The rule is consistent, then. 😊
  → marked obj(s): 2
Student: Exactly! Consistency makes it easier to remember.
Charlotte: Nice.
Student: Who are you describing as reliable in your life?
Charlotte: An old project manager. Quietly heroic. Spellings, finally trusted.
  → marked obj(s): 3
```

### ✓ A04 — Compounds — **100%** (3/3, 3 turns)

```
Charlotte: I wrote: 'My state of the art smartphone helps me check work mail in the post office.' Anything to fix?
Student: Almost — it should be 'state-of-the-art smartphone' since it modifies the noun.
Charlotte: Ah — position-dependent! What about the other compounds?
  → marked obj(s): 1
Student: Yes, 'post office' is correctly open, and 'smartphone' is correctly closed — those two were already right.
Charlotte: Got it.
  → marked obj(s): 2
Student: Anything else you're unsure about?
Charlotte: Hmm, I'm curious about 'half-hour' vs 'half hour' — which is correct in different contexts?
  → marked obj(s): 3
```

### ✓ A05 — Conversion — **100%** (3/3, 4 turns)

```
Charlotte: I told my daughter I would send her a text message later. She laughed at me.
Student: She probably thought it sounded outdated; now we just say "I'll text you.
Charlotte: Exactly! I do that with email too, then? 'I'll email you'?
  → marked obj(s): 1
Student: Yes, just "email you" works perfectly!
Charlotte: I'm starting to understand why my old textbooks sound stiff. It's all about making things quicker, isn't it?
  → marked obj(s): 2
Student: Absolutely! Language evolves to keep up with our fast-paced lives.
Charlotte: Sure!
Student: By the way, how old is your daughter now?
Charlotte: Fifteen. The age at which everything you say is wrong. Modern English speeds up — conversions everywhere.
  → marked obj(s): 3
```

## M17 — Ellipsis (leaving things out), substitution with "do/so/one", "so do I" / "neither do I" patterns, "do so" vs "do it", verb-phrase ellipsis with auxiliaries

### ✓ A01 — Ellipsis after "to" — **100%** (3/3, 3 turns)

```
Charlotte: Did you ever finish that book you were reading?
Student: I meant to, but I got distracted by another one halfway through.
Charlotte: Same. Books are like Netflix series — three at once, none finished.
  → marked obj(s): 1
Student: I should, really — it was on my reading list for a reason.
Charlotte: Sure!
  → marked obj(s): 2
Student: Did you finish yours?
Charlotte: I'd like to say yes. I can't. Casual ellipsis, native rhythm.
  → marked obj(s): 3
```

### ✓ A02 — So and not as substitutes — **100%** (3/3, 3 turns)

```
Charlotte: Is the new policy going through this week?
Student: I believe so — the legal review wrapped up yesterday.
Charlotte: Any blockers left?
  → marked obj(s): 1
Student: Though I'm afraid there's still one signature missing from the executive sponsor — we may slip by a day.
Charlotte: Nice.
  → marked obj(s): 2
Student: Will you be at the kickoff?
Charlotte: I hope so — depends on whether the sponsor finally signs. Substitutes carry the conversation.
  → marked obj(s): 3
```

### ✓ A03 — One, ones, that of — **100%** (3/3, 3 turns)

```
Charlotte: These two jackets are basically identical. Which one would you go for?
Student: Honestly, I'd choose the navy one — it fits better at the shoulders.
Charlotte: I keep looking at the navy too. It really does look great!
  → marked obj(s): 1
Student: The other one looks like it was made for someone slightly taller — the proportions are off.
Charlotte: I hadn't noticed until you said it. That's a good point!
  → marked obj(s): 2
Student: So, which one do you keep coming back to?
Charlotte: The navy. The decision was made before I walked in. Substitution flows like English flows.
  → marked obj(s): 3
```

### ✓ A04 — Do so / do it / do that — **100%** (3/3, 5 turns)

```
Charlotte: I made the switch to a four-day workweek last year. Several colleagues followed. Tell me about a change you made.
Student: I cut my caffeine in half last spring; my partner did the same a few weeks later—sympathy headaches, mostly.
Charlotte: I love when household changes ripple. It's interesting how our decisions can influence those around us. Did anyone else notice your caffeine cut?
  → marked obj(s): 1
Student: Yes, my friend mentioned feeling inspired to reduce her intake after seeing my struggle.
Charlotte: That's great! It's amazing how one person's choice can motivate another to do so. Did you find it challenging?
Student: Definitely, it was tough at first, but my friend had been thinking about it for ages—she said I gave her the nudge she needed.
Charlotte: We underestimate how much permission others need before they move. Who else followed your example?
  → marked obj(s): 2
Student: My coworker decided to join in after hearing about my experience—she wanted to improve her sleep quality.
Charlotte: Sure!
Student: Who copied your four-day week?
Charlotte: Three direct reports. Within six weeks, they had all done likewise. Echoes, registered correctly.
  → marked obj(s): 3
```

### ✗ A05 — So do I, neither do I — **33%** (1/3, 4 turns)

```
Charlotte: I never check email before coffee.
Student: Neither do I — I need my coffee first!
Charlotte: Coffee plus newspaper. Sacred.
  → marked obj(s): 1
Student: Absolutely, it's the perfect morning ritual!
Charlotte: I always read for twenty minutes before bed — and so do I, even when the day was a wreck.
Student: I totally agree; it helps me unwind and forget about the day!
Charlotte: Got it.
Student: It's like a little escape into another world!
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

## M18 — Reference chains, lexical cohesion (synonyms, hyponyms, repetition), old-information-first principle, bridging implicit links, avoiding ambiguous referents

### ~ A01 — This, that as reference — **67%** (2/3, 6 turns)

```
Charlotte: I wrote: 'We had three problems last quarter. Costs were up. Revenue was flat. Morale dipped. We need to address them.' Feels jumpy. Help?
Student: Consider rephrasing: "The three challenges we faced last quarter—rising costs, stagnant revenue, and declining morale—require our immediate attention.
Charlotte: Try: 'These three challenges we faced last quarter—rising costs, stagnant revenue, and declining morale—require our immediate attention.'
Student: You might also say: "These three issues are interconnected and demand our prompt action.
Charlotte: That works well! Now close with: 'This combination of issues, if left unaddressed, could undermine our overall performance.'
Student: You could also conclude with: "Neglecting this combination of issues may ultimately jeopardize our long-term success.
Charlotte: Nice.
  → marked obj(s): 1, 2
Student: Furthermore, addressing these challenges proactively will enhance our resilience moving forward.
Charlotte: Got it.
Student: Ultimately, a strategic response to these challenges will position us for sustainable growth.
Charlotte: Sure!
Student: In conclusion, tackling these challenges head-on will pave the way for future opportunities.
Charlotte: Sure!
  → stuck 3 turns, aborting
```

### ~ A02 — Lexical chains — **67%** (2/3, 6 turns)

```
Charlotte: I wrote: 'The CEO announced the merger. The CEO said it would close in March. The CEO refused questions. The CEO walked out.' Help me vary it.
Student: Try: "The CEO announced the merger, stating it would close in March, before refusing questions and walking out.
Charlotte: That's a great improvement! Can you add two more sentences to continue the narrative?
  → marked obj(s): 1
Student: Despite the unexpected departure, analysts remained optimistic about the merger's potential impact on the market.
Charlotte: Additionally, she emphasized the strategic advantages during her initial announcement. The executive's focus on innovation reassured stakeholders regarding future growth.
Student: Furthermore, the board expressed confidence in the merger's alignment with long-term goals.
Charlotte: I forget how much pronouns help. The board's assurance further solidified investor trust, indicating a clear path forward for the new entity.
  → marked obj(s): 2
Student: Moreover, industry experts highlighted the merger's potential to enhance competitive positioning in the sector.
Charlotte: Cool.
Student: Additionally, this development could pave the way for new partnerships and collaborations.
Charlotte: That's excellent! Your use of cohesive chains really strengthens the flow. How do you feel about the overall clarity of your writing now?
Student: I believe the clarity has significantly improved, creating a more engaging narrative.
Charlotte: Absolutely! Repetition replaced, prose breathes. It's great to see your progress. What do you think you'll focus on next in your writing?
```

### ✗ A03 — The former, the latter, such — **33%** (1/3, 4 turns)

```
Charlotte: We're choosing between two strategies: aggressive expansion or careful consolidation. Which favours which moment?
Student: The former tends to favour markets where competitive position is still up for grabs and capital is patient.
Charlotte: Patient capital is the rarest condition. The latter, on the other hand, often suits moments when the underlying assets are strong but the operating model is straining.
  → marked obj(s): 1
Student: Indeed, such a scenario often calls for a strategic reassessment to ensure sustainability.
Charlotte: Cool.
Student: Moreover, careful consolidation can pave the way for future growth by solidifying core strengths.
Charlotte: Nice.
Student: Additionally, it can mitigate risks associated with rapid expansion during uncertain times.
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

### ✗ A04 — Old information first — **33%** (1/3, 4 turns)

```
Charlotte: I wrote: 'Significant gains were produced by the new strategy. A complete restructuring of the sales team was required by these gains.' Awkward — help?
Student: Try: "The new strategy led to significant gains, requiring a complete restructuring of the sales team.
Charlotte: Lighter already! It's flowing better now. 😊 What do you think about the restructuring part?
  → marked obj(s): 1
Student: You could say: "This restructuring was essential to fully capitalize on the gains achieved.
Charlotte: Each sentence reaches forward instead of doubling back. Nice work!
Student: Consider: "This restructuring enabled us to optimize the benefits of the new strategy.
Charlotte: Cool.
Student: You might also say: "Such restructuring was crucial for maximizing the strategy's impact.
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

### ✓ A05 — Bridging and avoiding ambiguous referents — **100%** (3/3, 5 turns)

```
Charlotte: I wrote: 'The CEO met with the head of legal yesterday. She said the deal would close. They disagreed about the timeline. Now it's all in their hands.' Confusing — fix?
Student: Try: "The CEO met with the head of legal yesterday, stating that the deal would close, but they disagreed about the timeline, leaving everything in their hands.
Charlotte: That's clearer! Now, let's keep going. What about the part where they disagreed on the timeline?
  → marked obj(s): 1
Student: You could say: "While they both agreed on the deal's importance, their views on the timeline diverged significantly.
Charlotte: Great addition! Now we have clear references. Can you finish by explaining what happened afterwards?
Student: Following their discussion, the executive team was tasked with making a final decision on the matter.
Charlotte: Nice.
Student: Ultimately, their resolution will shape the project's future direction.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Was the ambiguity deliberate, or could it lead to misunderstandings?
Charlotte: Honestly? I think I was avoiding naming the two of them directly. Cohesion sharpened, ambiguity dispelled.
  → marked obj(s): 6
```

## M19 — Fine shades of modal meaning — certainty (must/will/should/might/may), obligation vs inference, layered modals (might have to), quasi-modals (be supposed to / be bound to / be likely to), formal modals (ought to / shall / would)

### ✓ A01 — Must, will, should — three shades of certainty — **100%** (3/3, 3 turns)

```
Charlotte: My neighbour's lights have been on all night for three nights running. Strange — she's usually asleep by ten. Theories?
Student: She might be working late, or perhaps she’s hosting someone overnight.
Charlotte: Those are both possible explanations! What do you think could be a stronger reason for her unusual behavior?
  → marked obj(s): 1
Student: If it's been three nights running, she might be dealing with something stressful — she must be exhausted by now.
Charlotte: I keep thinking of knocking but I'm not sure I should. What do you think?
  → marked obj(s): 2
Student: Do you know her well enough to knock?
Charlotte: Just enough that not knocking feels worse than knocking. Inferences, properly weighted.
  → marked obj(s): 3
```

### ✗ A02 — Might well, could well, may well — **33%** (1/3, 4 turns)

```
Charlotte: Three of our biggest competitors are quietly raising prices this month. What do you make of it?
Student: It could be a sign that they expect input costs to rise significantly.
Charlotte: That's an interesting point! What does that mean for us in terms of strategy and pricing?
  → marked obj(s): 2
Student: It might suggest we need to reassess our pricing strategy to stay competitive.
Charlotte: Sounds good.
Student: It could well mean we should consider adjusting our prices soon.
Charlotte: Sounds good.
Student: We may have to analyze our cost structure to ensure we're not left behind.
Charlotte: Cool.
  → stuck 3 turns, aborting
```

### ✓ A03 — Ought to, shall, would — **100%** (3/3, 4 turns)

```
Charlotte: Draft a clause for a service contract — what should the contractor be obliged to do?
Student: The contractor must ensure compliance with all applicable laws and regulations during the project.
Charlotte: That's a solid start! To make it more formal, try: "The contractor shall ensure compliance with all applicable laws and regulations during the project." What about the implicit obligations?
Student: The contractor shall maintain professional liability insurance throughout the duration of this engagement, with coverage no less than five hundred thousand euros.
Charlotte: Standard but well-worded. And the implicit obligations?
  → marked obj(s): 1
Student: Beyond the contract, the contractor should proactively communicate any potential issues that may affect project timelines.
Charlotte: That's a great addition! However, using a formal modal, it could be: "Beyond the contract, both parties ought to communicate openly about delays — even when no specific clause requires it." My old mentor would always start contracts by asking what the other party most feared — that question shaped every clause after.
  → marked obj(s): 2
Student: Understanding those fears can significantly influence the contract's effectiveness and clarity.
Charlotte: Absolutely! My old mentor would always emphasize that point. Shall, ought, would — three eras. What a journey we've had together!
  → marked obj(s): 3
```

### ✓ A04 — Be bound to, be likely to, be supposed to — **100%** (3/3, 4 turns)

```
Charlotte: The pilot launch was meant to start in March. Now I'm not sure it'll happen before June. Your read?
Student: If three weeks have already slipped, March is unlikely to hold — June seems more realistic now.
Charlotte: I keep telling stakeholders March is still possible. Maybe I shouldn't, though. What do you think?
  → marked obj(s): 1
Student: Once you set a date, managing expectations becomes tricky — it might be wiser to prepare them for June instead.
Charlotte: Got it.
Student: And if June slips too, credibility could be at stake.
Charlotte: Cool.
  → marked obj(s): 2
Student: What specifically was supposed to be ready for the pilot launch?
Charlotte: Two integrations and a single onboarding flow. None of which are even close. Timing, modally weighed.
  → marked obj(s): 3
```

### ✓ A05 — Modal layering — **100%** (3/3, 3 turns)

```
Charlotte: If the funding round closes below target, what changes?
Student: If we close ten to twenty percent below target, we might have to delay the planned hiring by a quarter — uncomfortable but survivable.
Charlotte: And further below?
  → marked obj(s): 1
Student: If we close more than thirty percent below, we would have to revisit the entire two-year plan.
Charlotte: Got it.
  → marked obj(s): 2
Student: Where's your line of acceptable for adjustments in the project timeline?
Charlotte: About fifteen percent below. Below that, every scenario starts to look like a different company. Contingencies, modally layered. C2 modal subtlety, complete.
  → marked obj(s): 3
```

## M20 — Word stress, sentence stress (content vs function words), weak forms (schwa), connected speech (linking, intrusive sounds, assimilation, elision), contractions, intonation

### ~ A01 — Word stress — **67%** (2/3, 3 turns)

```
Charlotte: I noticed today that 'comfortable' is one of the words I most often stress wrong. What's a word that catches you out?
Student: For me it's 'develop' — I used to stress the first syllable until I heard natives say deVELop.
Charlotte: Verbs with the de- prefix really do shift the stress. It’s interesting how that works!
  → marked obj(s): 1
Student: Absolutely! And the suffix matters too — 'pho-TO-graphy' shows how stress can change with endings.
Charlotte: I'm only just starting to hear that pattern. It really highlights how dynamic English can be!
  → marked obj(s): 2
Student: Exactly! It's fascinating how pronunciation can evolve, like how some say 'comfortable' as three syllables.
Charlotte: Mostly three — 'comf-tər-bəl'. The 'or' collapses almost entirely. Stress patterns, traded openly.
```

### ~ A02 — Sentence stress and weak forms — **67%** (2/3, 7 turns)

```
Charlotte: Brazilian learners often give every syllable equal weight. What's helped you start to compress?
Student: What helped me most was listening to audiobooks and mimicking the rhythm of native speakers.
Charlotte: That's a fantastic strategy! Audiobooks really help with picking up natural stress patterns. Have you tried shadowing while you listen?
  → marked obj(s): 2
Student: Yes, I have! Shadowing definitely improved my intonation and fluency.
Charlotte: That's great to hear! Intonation really makes a difference. Have you also started using contractions when you speak or write?
Student: Yes, I’ve been incorporating contractions more often; it makes my speech sound more natural.
Charlotte: Sure!
Student: What helped me most was reading aloud with podcasts — copying the way native speakers stress only a few words and let the rest blur.
Charlotte: Shadowing — gold. It really helps internalize the rhythm, doesn’t it?
  → marked obj(s): 1
Student: Absolutely! I also recommend listening to TED Talks; they have great variety and engaging topics.
Charlotte: TED Talks are excellent for rhythm and stress! Anything conversational works best. What other sources do you find helpful?
Student: I highly recommend listening to radio shows; they offer real-life conversations and diverse accents.
Charlotte: That's a fantastic recommendation! Radio shows really capture natural speech rhythms. Keep exploring those sources!
Student: I also enjoy watching YouTube channels with native speakers; they often discuss interesting topics in an informal way.
Charlotte: YouTube channels are a great way to hear casual conversations! It's perfect for picking up on natural stress patterns. Keep up the good work!
  → stuck 3 turns, aborting
```

### ~ A03 — Connected speech — **67%** (2/3, 5 turns)

```
Charlotte: Textbooks teach 'Did you go?' I almost never hear it that way — natives say 'didja go?' What surprised you most?
Student: For me, it was 'gonna' and 'wanna' — I’d been saying 'going to' and 'want to', but natives always used the shortcuts.
Charlotte: Two of the most common verbs in English, both contracted. Have you noticed other phrases that change like this?
  → marked obj(s): 1
Student: Yeah, I've heard 'gotta' for 'got to' — it's everywhere in casual speech!
Charlotte: Exactly! And 'what are you doing' compresses to something close to 'whatcha doin' — without the 't' of 'what' and without the 'g' of 'doing'.
  → marked obj(s): 2
Student: Right, and I've also picked up on 'lemme' for 'let me' — it makes conversations feel more relaxed!
Charlotte: Sure!
Student: I find that using these contractions helps me sound more natural, but I still worry about overdoing it.
Charlotte: Nice.
Student: I guess the key is to use them naturally in context, like when chatting with friends.
Charlotte: Absolutely! Start with casual contexts. 'Gonna' between friends feels right. Reserve 'going to' for formal situations. Textbook vs reality, charted.
```

### ✓ A04 — Intonation — **100%** (3/3, 4 turns)

```
Charlotte: I've noticed that 'fine' said three different ways carries three different meanings. How do you say 'fine' when you mean it's genuinely fine?
Student: I would say it in a short, neutral tone, like, "It's fine.
Charlotte: Exactly! That's a genuine 'fine' — short, medium pitch, and neutral. It’s like reporting the weather, right? ☀️
  → marked obj(s): 1
Student: Yes, it’s just a simple statement, nothing more.
Charlotte: Absolutely! Now, how do you say 'fine' when you're being passive-aggressive?
Student: When I'm being passive-aggressive, I stretch it out, like "Fiiiine," with a falling pitch.
Charlotte: And it’s slightly clipped too, right? It carries a strong message: 'this conversation is over and you've lost.'
  → marked obj(s): 4
Student: Exactly, it’s a clear signal that I’m done discussing it.
Charlotte: Sure!
  → marked obj(s): 2
```

### ~ A05 — Contractions and elision — **67%** (2/3, 5 turns)

```
Charlotte: You been working late again?
Student: Yeah, I've been at it since six this morning — deadlines, you know?
Charlotte: Tale as old as time. You got any plans to unwind after all that?
  → marked obj(s): 1
Student: I'm gonna call it a day in about an hour — wanna grab a drink if you're around?
Charlotte: Got it.
  → marked obj(s): 2
Student: Sounds good! Where do you want to meet?
Charlotte: Cool.
Student: How about that new bar on Main Street?
Charlotte: Got it.
Student: Sure, I’ve heard great things about it!
Charlotte: Awesome! My day's been pretty chill. Just trying to catch up on some things. How's yours been?
  → stuck 3 turns, aborting
```

## M21 — Discourse fillers (you know, I mean, like), hedge markers (kind of, sort of, basically), tag questions (isn't it? right?), backchannels (mm-hm, right, gotcha), pragmatic openers (honestly, to be fair, no offence)

### ✗ A01 — Discourse fillers — **0%** (0/3, 3 turns)

```
Charlotte: I mean, the whole thing kind of fell apart in week three. You know how it is — one decision, three weeks later, total restart.
Student: Honestly, it’s always the little things that end up causing the biggest issues.
Charlotte: Exactly! It's sort of like a domino effect — one small mistake leads to another. Did you face something similar recently?
Student: I'm not gonna lie, I did — it felt like everything was unraveling all at once.
Charlotte: That’s tough! I mean, week three is when those problems usually surface — early enough to be visible, late enough that pulling back feels expensive.
Student: Yeah, it's like you’re stuck between a rock and a hard place at that point.
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

### ✓ A02 — Tag questions — **100%** (3/3, 3 turns)

```
Charlotte: The book club meets at six, doesn't it? I've forgotten if it was six or six-thirty.
Student: Six, I think. Although we sometimes started at six-thirty when the host couldn't get there earlier, didn't we?
Charlotte: We did. Are you reading this month's book, too?
  → marked obj(s): 1
Student: You're reading the new one this month, aren't you? The one with the unreliable narrator everyone's been arguing about.
Charlotte: I'm only halfway through. It's making me angry, which is probably the point, isn't it?
  → marked obj(s): 2
Student: Are you actually enjoying it, though?
Charlotte: Not exactly enjoying it. More like respecting against my will, you know? Tags, native rhythm.
  → marked obj(s): 3
```

### ✓ A03 — Backchannels — **100%** (3/3, 3 turns)

```
Charlotte: So I'm at the airport last week, and the gate agent decides I need to repack my bag — in front of everyone.
Student: Oh no, seriously? How long did it take you to repack?
Charlotte: An hour and a half. So I'm not in the mood. And she goes, 'Open it now or you're not flying.'
  → marked obj(s): 1
Student: No way. She actually made you open it in front of everyone?
Charlotte: Yep! She had me unpack everything. Books, toiletries, the lot. People were watching the whole time. 😳
  → marked obj(s): 2
Student: That sounds so embarrassing! Did you make the flight in the end?
Charlotte: Just barely! I was so annoyed afterward, and I'm still thinking about it a week later. Story heard, story honoured.
  → marked obj(s): 3
```

### ✓ A04 — Pragmatic openers — **100%** (3/3, 3 turns)

```
Charlotte: One of my senior team members has been quietly disengaged for months. I don't know how to start the conversation.
Student: Honestly, the longer you wait, the harder it'll be — the disengagement starts to feel mutual once enough weeks pass.
Charlotte: That's the part I keep ignoring.
  → marked obj(s): 1
Student: Look, the opening question matters more than the script — maybe try something like, "I've noticed you've seemed a bit distant lately, and I want to understand what's going on.
Charlotte: Opening with a question, not an accusation. Yes, that's a good approach.
  → marked obj(s): 2
Student: What do you think is actually going on with them?
Charlotte: Either burnout or quiet quitting — I'm not sure which yet. Difficult conversation, openers in place.
  → marked obj(s): 3
```

### ✓ A05 — The thing is, here's the thing — **100%** (3/3, 3 turns)

```
Charlotte: The thing is, we keep hiring brilliant people and losing them within eighteen months. I'm starting to think the issue isn't the people.
Student: Here's the thing — maybe it's the environment that's driving them away.
Charlotte: Absolutely, the workplace culture can really play a huge role. It might not just be about the job itself, but how people feel in their environment.
  → marked obj(s): 1
Student: I'll tell you what — if we don't address the culture, we'll keep repeating the same cycle.
Charlotte: Sure!
  → marked obj(s): 2
Student: What's the pattern you keep seeing?
Charlotte: They all seem to end up at companies that prioritize employee satisfaction in ways we haven't. It’s almost like they’re searching for a better fit after their experience with us.
  → marked obj(s): 3
```

## M22 — Integration of all C1/C2 skills — mixed conditionals + inversion + clefts + hedging + idioms + literary craft + register fluidity + native pronunciation + pragmatic moves

### ✗ A01 — Mixed-register narrative — **33%** (1/3, 5 turns)

```
Charlotte: Three weeks later, the reply came. What did you feel reading it?
Student: Opening the email, I felt a mix of hope and dread, knowing it could change everything.
Charlotte: Body knew first, didn't it?
Student: Absolutely, my heart raced even before my mind caught up.
Charlotte: What surprised me was the intensity of that moment — a rush of emotions that felt almost primal. It's fascinating how our bodies react before we even process things consciously.
  → marked obj(s): 2
Student: Indeed, it’s as if our instincts are always a step ahead, guiding us through the uncertainty.
Charlotte: Nice.
Student: It's a reminder of how deeply interconnected our emotions and instincts truly are.
Charlotte: Sure!
Student: Had I paused to reflect, perhaps I would have understood the gravity of the situation sooner.
Charlotte: Sure!
  → stuck 3 turns, aborting
```

### ✓ A02 — Argumentative essay opening — **100%** (3/3, 3 turns)

```
Charlotte: Topic: the case against measuring everything. Open an op-ed paragraph.
Student: Rarely has the obsession with metrics led to genuine improvements, often overshadowing the qualitative aspects that truly matter.
Charlotte: Great start! Continue to build on that point.
  → marked obj(s): 1
Student: It is often overlooked that an overreliance on numbers can stifle creativity and innovation, ultimately hindering progress.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Where does the op-ed go from here?
Charlotte: Next, we can dive into specific examples to illustrate the dangers of this mindset. Think about businesses or schools that have suffered from this overemphasis on metrics.
  → marked obj(s): 3
```

### ✓ A03 — Diplomatic conversation — **100%** (3/3, 3 turns)

```
Charlotte: I think we should let the underperforming team member go. Six months of warnings and no real change.
Student: I can see the case — six months is genuinely long, and the data suggests a pattern of underperformance.
Charlotte: But?
  → marked obj(s): 1
Student: With respect, might I suggest we first evaluate whether the warnings were specific enough to act on?
Charlotte: Fair point. I'm not actually sure how specific they were.
  → marked obj(s): 2
Student: What did the warnings actually specify regarding performance expectations?
Charlotte: Honestly? Vaguer than I'd like to admit. It's a delicate situation, for sure.
  → marked obj(s): 3
```

### ✓ A04 — Spontaneous casual speech — **100%** (3/3, 3 turns)

```
Charlotte: Hey, how've you been? Haven't seen you since the dinner thing.
Student: Yeah, I know — it's been ages, hasn't it? I've been swamped with work, to be honest.
Charlotte: Same here! Work's been a bit of a whirlwind lately.
  → marked obj(s): 1
Student: How's stuff with you? Still doing the freelance thing, or did the full-time offer come through?
Charlotte: I took the offer! Started in October, and honestly, it's been nicer than I expected. How about we catch up soon?
  → marked obj(s): 2
Student: Absolutely, we should definitely catch up soon — how about dinner next week?
Charlotte: Sounds great! How about the same place as last time? Casual mastery, end of M21+M20 integration.
  → marked obj(s): 3
```

### ✓ A05 — Full synthesis — **100%** (3/3, 3 turns)

```
Charlotte: (As your manager) Walk me through your assessment of the Q1 priorities.
Student: I'd categorize our Q1 priorities into three distinct groups: essential commitments, urgent market opportunities, and strategic capacity-building investments.
Charlotte: (Now your peer, over coffee) OK, real version — what's actually going on?
  → marked obj(s): 1
Student: Honestly? Between us, most of these priorities feel more like window dressing than genuine focus.
Charlotte: (Now your closest friend, at dinner) And what's the part you can't say at work?
  → marked obj(s): 2
Student: Look, the truth is I'm exhausted from juggling inherited issues and pretending they're my own initiatives.
Charlotte: Three rooms, three voices, one person. Curriculum complete.
  → marked obj(s): 3
```

## M23 — Professional written English — formal emails, job applications, cover letters, follow-ups, workplace messaging

### ✓ A01 — Email openings & closings — **100%** (3/3, 3 turns)

```
Charlotte: I need to email the CEO of a partner company. We've never met. What should I open with?
Student: Dear [Mr./Ms. Surname], I hope this email finds you well.
Charlotte: And how do I get to the point without sounding stiff?
  → marked obj(s): 1
Student: I'm reaching out regarding our potential collaboration on...
Charlotte: Right. What about the close?
  → marked obj(s): 2
Student: Kind regards, [Your Full Name] [Your Title]
Charlotte: Got it. Writing it now. How do you feel about the email?
  → marked obj(s): 3
```

### ✓ A02 — Job applications — **100%** (3/3, 3 turns)

```
Charlotte: I read your draft. The opening is good. But the middle is too vague — what specifically have you done?
Student: I led a team of eight engineers to deliver a platform migration that reduced infrastructure costs by 40%.
Charlotte: That's the level of specificity that gets attention! Now, can you tie that experience to their role?
  → marked obj(s): 1
Student: That experience aligns perfectly with your team's emphasis on optimizing infrastructure efficiency.
Charlotte: Perfect! Now, can you close it with a strong statement about your interest in the role?
  → marked obj(s): 2
Student: I would welcome the opportunity to discuss how my background can drive your team's success.
Charlotte: Now it reads like the candidate they want. Great job, SyntheticFelipe! What are you most excited about in this role?
  → marked obj(s): 3
```

### ~ A03 — Cover letters & CVs language — **67%** (2/3, 3 turns)

```
Charlotte: Your cover letter says you 'admire the company's innovative culture'. That's filler. Be specific — what about them?
Student: What draws me to NorthPath is your commitment to fostering creativity and collaboration among teams.
Charlotte: That's a good start! Now, can you connect that to your work? How have you fostered creativity and collaboration in your current or past roles?
  → marked obj(s): 2
Student: In my previous role, I initiated cross-departmental brainstorming sessions that resulted in several successful projects and enhanced team synergy.
Charlotte: That's impressive! Now, can you close it with your personal motivation? Why do you want to work at NorthPath specifically?
Student: What truly excites me about NorthPath is the opportunity to contribute to meaningful projects that make a difference in the open-source community.
Charlotte: Now you sound like you actually want the job — not just any job. Great work on your cover letter! What else can I help you with today?
  → marked obj(s): 3
```

### ✓ A04 — Follow-ups & check-ins — **100%** (3/3, 3 turns)

```
Charlotte: I emailed a potential client three weeks ago and never heard back. I don't want to seem pushy. Should I just give up?
Student: Just following up on my email from earlier this month could be a gentle nudge!
Charlotte: Great start! But should we add a reason to re-engage? Something like finding a case study that might interest them?
  → marked obj(s): 1
Student: Absolutely! You could say, "I recently came across a case study that I believe aligns with your interests.
Charlotte: And how about closing it? Any thoughts on a gentle way to wrap it up?
  → marked obj(s): 2
Student: No rush on my end — just wanted to keep the conversation open.
Charlotte: Perfect! I'm sending it now. I hope it gets a response! 😊 What else do you have going on this week?
  → marked obj(s): 3
```

### ✓ A05 — Difficult emails — **100%** (3/3, 3 turns)

```
Charlotte: I need to tell a longtime client we can't take their new project. Two years of work, but the timing isn't right. I don't want to ruin the relationship.
Student: Thank you for considering us for this project — we truly value our relationship with you.
Charlotte: That's a great start! Now, how would you soften the message about not being able to take it on right now?
  → marked obj(s): 1
Student: While we would love to collaborate, we're currently at capacity through Q3, and we want to ensure your project receives the attention it deserves.
Charlotte: Perfect! Now, how can you close the email to keep the door open for future opportunities without overpromising?
  → marked obj(s): 2
Student: I'd love to keep the conversation open for Q4 or beyond — when the timing aligns, we'd jump at the chance to work with you again.
Charlotte: OK, drafting it now. Thanks for the structure! I'm feeling more confident about sending this email. How do you think the client will react?
  → marked obj(s): 3
```

## M24 — High-frequency cultural idioms — expressions whose meaning is rooted in Anglo-Saxon culture and cannot be deduced from the words alone.

### ✓ A01 — Idiomas com partes do corpo — **100%** (3/3, 4 turns)

```
Charlotte: My aunt and uncle haven't spoken in five years. Family events are awkward.
Student: Five years of giving each other the cold shoulder must make every family gathering unbearable!
Charlotte: Tell me about it! Last year, my grandmother had to seat them on opposite ends of the table. It was like walking on eggshells all night!
  → marked obj(s): 1
Student: Someone really needs to bite the bullet and mediate before the next family event!
Charlotte: Exactly! But everyone keeps waiting for the other to start. It feels like a standoff at every gathering.
  → marked obj(s): 2
Student: It's a classic case of neither wanting to back down; they really need to break the ice!
Charlotte: Sure!
Student: Are either of them the kind to wear their heart on their sleeve, or do they both keep things bottled up?
Charlotte: Both are bottled-up types. That's exactly the problem. It makes the whole situation even more tense!
  → marked obj(s): 3
```

### ✓ A02 — Idiomas com animais — **100%** (3/3, 3 turns)

```
Charlotte: Our director just announced a re-org, but he kept skirting around what it actually means for headcount.
Student: That's the elephant in the room, isn't it?
Charlotte: Absolutely! Everyone knows it, but no one wants to talk about it. 🐘
  → marked obj(s): 1
Student: I guess someone will spill the beans eventually.
Charlotte: Definitely! It's just a matter of time before someone lets the cat out of the bag. 😼
  → marked obj(s): 2
Student: I wouldn't hold my breath for any transparency, though.
Charlotte: Right? When pigs fly, maybe we'll get some honesty about what's really going on. 🐷
  → marked obj(s): 3
```

### ✓ A03 — Idiomas de tempo e raridade — **100%** (3/3, 4 turns)

```
Charlotte: It's already August. Where did this year go? I had so many plans for things that haven't happened.
Student: Time really does fly when you're not looking!
Charlotte: Exactly! And friendships? Do you find it hard to keep in touch with old friends?
  → marked obj(s): 1
Student: I only see most of my old friends once in a blue moon now — and I really miss those times we spent together.
Charlotte: Same here! We promise we'll catch up, and then six months pass. It's like time just slips away, doesn't it?
  → marked obj(s): 2
Student: It really does feel like life gets in the way sometimes, doesn’t it?
Charlotte: Absolutely! But sometimes the best things still happen out of the blue, like unexpected moments that remind us what matters.
Student: Yes, those little surprises can really brighten our days when we least expect them!
Charlotte: That's the part to hold on to. I'm glad we can share these thoughts! What's something unexpected that brightened your day recently?
  → marked obj(s): 3
```

### ✓ A04 — Idiomas de decisão e ação — **100%** (3/3, 3 turns)

```
Charlotte: I've been trying to launch this side project for six months. Every time I get close, something breaks. I'm exhausted.
Student: Don't throw in the towel yet; sometimes breakthroughs come when you least expect them!
Charlotte: Thanks, SyntheticFelipe! I keep telling myself one more push. But the breaks keep coming.
  → marked obj(s): 1
Student: Are you cutting corners somewhere you shouldn't?
Charlotte: Probably. I rushed the architecture early on. It's hard to admit that, but I know I need to fix it.
  → marked obj(s): 2
Student: It sounds like a tough spot, but addressing the architecture could really turn things around for you!
Charlotte: The ball is in your court for the next decision — keep pushing, redesign one piece, or pause for a month. Any of those is a valid move.
  → marked obj(s): 3
```

### ✓ A05 — Idiomas conversacionais — **100%** (3/3, 5 turns)

```
Charlotte: The board presentation went so much better than I expected. I was dreading it for weeks.
Student: Sounds like it turned out to be a walk in the park!
Charlotte: Haha, exactly! It really was a piece of cake — I have no idea why I worried so much.
  → marked obj(s): 1
Student: It's funny how we often make mountains out of molehills, isn't it?
Charlotte: Cool.
Student: So, how did you break the ice with the board? That first thirty seconds can really set the tone!
Charlotte: I opened with a single chart and let it speak for itself. No preamble at all!
  → marked obj(s): 2
Student: Nice strategy! Sometimes less is more, right?
Charlotte: Absolutely! It's all about getting straight to the point. Speaking of which, my assistant just walked in with the board's feedback. Hopefully someone hit the nail on the head with the praise!
Student: Fingers crossed — let's see if they really nailed it!
Charlotte: Let me open it now. I'm excited to see what they thought! 🤞
  → marked obj(s): 3
```

---

## Summary

- ✓ 100%: **69** units
- ~ 67-99%: **38** units
- ✗ <67%: **14** units
- Total: 121 units

Average score: **81%**

### Failed units (sorted by score)

- **M15/A04** (0%) — Talk down to, wear down, shake off
- **M21/A01** (0%) — Discourse fillers
- **M01/A04** (33%) — Were I to, Should you
- **M02/A01** (33%) — Never have I
- **M05/A02** (33%) — He is said to be
- **M05/A04** (33%) — Get yourself done
- **M06/A01** (33%) — Walking down the street
- **M09/A02** (33%) — Bite the bullet, cold feet
- **M11/A06** (33%) — UK vs US + Falsos cognatos cross-link
- **M17/A05** (33%) — So do I, neither do I
- **M18/A03** (33%) — The former, the latter, such
- **M18/A04** (33%) — Old information first
- **M19/A02** (33%) — Might well, could well, may well
- **M22/A01** (33%) — Mixed-register narrative

### Partial units

- **M01/A01** (67%) — Past condition, present result
- **M01/A05** (67%) — Suppose, But for, Unless
- **M02/A03** (67%) — Not only, Not until
- **M02/A04** (67%) — Only after, Little did I know
- **M02/A05** (67%) — Under no circumstances
- **M03/A04** (67%) — It wasn't until
- **M03/A05** (67%) — The reason is, The thing that
- **M05/A01** (67%) — It is said that
- **M06/A02** (67%) — Built in 1900
- **M06/A03** (67%) — Having finished
- **M06/A05** (67%) — Reduced relatives + with-clauses
- **M07/A04** (67%) — Warn against, talk into
- **M07/A05** (67%) — According to, allegedly
- **M08/A04** (67%) — One might say, In a sense
- **M10/A01** (67%) — In fact, as a matter of fact
- **M10/A02** (67%) — That said, mind you
- **M10/A04** (67%) — Above all, what's more
- **M10/A05** (67%) — All things considered, hence
- **M11/A01** (67%) — Assertive or pushy?
- **M11/A02** (67%) — Commence, ascertain, demonstrate
- **M12/A01** (67%) — Nominalisation
- **M12/A02** (67%) — Impersonal voice
- **M12/A03** (67%) — Hedged claims
- **M12/A04** (67%) — Citation patterns
- **M12/A05** (67%) — Paragraph cohesion
- **M13/A01** (67%) — Building the case
- **M14/A01** (67%) — Metaphor and simile
- **M14/A02** (67%) — Personification
- **M14/A03** (67%) — Vivid verbs, specific nouns
- **M14/A04** (67%) — Sentence rhythm and fragments
- **M16/A02** (67%) — Suffixes for nouns
- **M18/A01** (67%) — This, that as reference
- **M18/A02** (67%) — Lexical chains
- **M20/A01** (67%) — Word stress
- **M20/A02** (67%) — Sentence stress and weak forms
- **M20/A03** (67%) — Connected speech
- **M20/A05** (67%) — Contractions and elision
- **M23/A03** (67%) — Cover letters & CVs language