# Synthetic Student — Guided Chats Report

- Level: **Advanced**
- API: https://charlotte.hubacademybr.com
- Student profile: sloppy
- Generated: 2026-06-09T13:04:28.357Z
- Max turns/chat: 8

## M01 — Mixed conditionals + counterfactuals + inversion in conditionals + alternatives to "if"

### ✓ A01 — Past condition, present result — **100%** (3/3, 3 turns)

```
Charlotte: Looking back, what's one decision from years ago that completely shapes your present?
Student: Had I pursued my passion for languages earlier, I might be working as a translator now.
Charlotte: That’s a powerful insight! What else flows from that decision?
  → marked obj(s): 1
Student: If I had taken more risks in my career, I might have discovered new opportunities sooner.
Charlotte: Sure!
  → marked obj(s): 2
Student: What about you, Charlotte? What's a pivotal choice you've made?
Charlotte: If I hadn't quit law school, I'd be billing hours instead of teaching. Decisions echo.
  → marked obj(s): 3
```

### ~ A02 — Present state, past result — **67%** (2/3, 7 turns)

```
Charlotte: If I weren't such a planner, I would have backpacked through Asia in my twenties. What about you?
Student: If I hadn’t been so cautious, I might have traveled more during my studies.
Charlotte: Caution can lead to missed adventures, but it often keeps us safe. What do you think about that?
  → marked obj(s): 2
Student: I agree; a balance between caution and adventure is essential for growth.
Charlotte: Absolutely! If I weren't so focused on planning, I might have taken more spontaneous trips. But if I hadn't planned, I'd probably feel lost. What do you think?
Student: Had I embraced more spontaneity, I might have created unforgettable memories.
Charlotte: Those moments can be so impactful! Do you wish you'd taken more risks during your travels?
Student: If I had taken more risks, I would have discovered new perspectives and experiences.
Charlotte: That's a great insight! Sometimes, those risks shape us in unexpected ways. Do you think your cautious nature has benefited you in other areas?
  → marked obj(s): 1
Student: Had I not been cautious, I might have faced more setbacks in my career.
Charlotte: It's interesting how caution can protect us. If I weren't so organized, I might have missed important deadlines. Do you feel your caution has shaped your career path positively?
Student: Had I been less cautious, I might have pursued more ambitious projects.
Charlotte: That's a thought-provoking perspective! Sometimes, those bold moves can lead to great rewards. Do you ever find yourself wishing for a different approach?
Student: If I had taken more risks, I might have discovered new opportunities in my career.
Charlotte: It sounds like you see the value in taking risks! If I weren't such a planner, I would have ventured into more creative projects. Do you think you'll embrace more risks in the future?
```

### ~ A03 — Had I known (inverted) — **67%** (2/3, 5 turns)

```
Charlotte: Imagine writing to your younger self. Had you known what you know now, what would you have done differently?
Student: Had I embraced my passions earlier, I would have pursued a different career path.
Charlotte: Passions often whisper truths we ignore. What else would you have changed, if anything?
  → marked obj(s): 1
Student: Had I prioritized my mental health, I would have avoided burnout and stress.
Charlotte: Cool.
  → marked obj(s): 2
Student: If I had taken more risks, I might have discovered my potential sooner.
Charlotte: Cool.
Student: Had I listened to my instincts, I could have made bolder choices in life.
Charlotte: Got it.
Student: If I had sought guidance earlier, I would have navigated challenges more effectively.
Charlotte: Cool.
  → stuck 3 turns, aborting
```

### ✓ A04 — Were I to, Should you — **100%** (3/3, 3 turns)

```
Charlotte: Were I to propose a meeting next week, would your team be open to it?
Student: Should the timing work for everyone, we'd be happy to join.
Charlotte: What flexibility do you have on timing?
  → marked obj(s): 2
Student: Should we find a mutually convenient slot, we can accommodate the meeting.
Charlotte: Cool.
  → marked obj(s): 1
Student: Would Tuesday afternoon work for you?
Charlotte: Tuesday after three. Correspondence drafted.
  → marked obj(s): 3
```

### ✓ A05 — Suppose, But for, Unless — **100%** (3/3, 3 turns)

```
Charlotte: Suppose money weren't an issue — what would you do for the rest of your life?
Student: Without that constraint, I'd travel the world and write about my adventures.
Charlotte: Traveling and writing sounds amazing! Any conditions on where you'd stay while doing that?
  → marked obj(s): 1
Student: Provided that I could find inspiration, I'd love to live in a cozy cabin by the mountains.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: What about you? What would your ideal life look like?
Charlotte: But for my fear of heights, I'd love to live in a treehouse surrounded by nature. It's a dream, but one I cherish!
  → marked obj(s): 3
```

## M02 — Inversion after negative/restrictive adverbials, time inversions, "only" inversions, emphatic inversions

### ~ A01 — Never have I — **67%** (2/3, 5 turns)

```
Charlotte: Never have I laughed as hard as I did at that wedding last summer. Your turn — top a rare moment.
Student: Never have I experienced such a breathtaking view while hiking.
Charlotte: Nature has a way of leaving us speechless. Anything else to share?
  → marked obj(s): 2
Student: Rarely have I felt such a sense of peace while meditating.
Charlotte: Nice.
Student: Never have I tasted food so exquisite as that meal we had in Italy.
Charlotte: Nice.
Student: Never have I met someone so inspiring as my mentor.
Charlotte: Cool.
  → marked obj(s): 1
Student: Seldom have I encountered a friendship as genuine as ours.
Charlotte: Sounds good.
```

### ~ A02 — Hardly had I, No sooner had I — **67%** (2/3, 5 turns)

```
Charlotte: No sooner had I sat down to write than the doorbell rang. What's your worst day-from-hell sequence?
Student: Never have I faced such chaos as the day my car broke down on the way to an important meeting.
Charlotte: The classic chaos! Then what happened?
Student: Hardly had I called for a tow truck when it started pouring rain.
Charlotte: Got it.
  → marked obj(s): 1, 2
Student: Barely had I found shelter when my phone died, leaving me stranded.
Charlotte: Nice.
Student: Seldom have I felt so helpless as I stood there, drenched and alone.
Charlotte: Sure!
Student: Little did I know that the worst was yet to come.
Charlotte: Got it.
  → stuck 3 turns, aborting
```

### ✓ A03 — Not only, Not until — **100%** (3/3, 4 turns)

```
Charlotte: Not only did my grandmother raise five children alone, but she also went back to school at 50. Top that — or layer your own.
Student: Not only did my uncle start a business from scratch, but he also mentored young entrepreneurs in his community.
Charlotte: Inspiring! Generational courage, right? What realisation came to you from that?
  → marked obj(s): 1
Student: Not until I witnessed his dedication did I appreciate the sacrifices he made for our family.
Charlotte: Parenthood is the great translator. So, what did your uncle do to inspire you?
  → marked obj(s): 2
Student: He always emphasized the importance of resilience and hard work, no matter the obstacles.
Charlotte: Cool.
Student: What about you? What lessons did your grandmother impart?
Charlotte: She taught me the value of perseverance and the joy of reading. Her passion for literature influenced my own love for books.
  → marked obj(s): 3
```

### ~ A04 — Only after, Little did I know — **67%** (2/3, 3 turns)

```
Charlotte: Only by failing my first big presentation did I learn how to prepare. What unlocked something for you?
Student: Only after moving to a new city did I realize the importance of building a support network.
Charlotte: Some lessons cost too much. Anything that sneaked up on you?
  → marked obj(s): 1
Student: Little did I know that a chance encounter would lead to lifelong friendships.
Charlotte: Cool.
  → marked obj(s): 2
Student: Seldom have I experienced such unexpected joy from a simple conversation.
Charlotte: Little did I know a borrowed book would set my whole reading life. Hindsight, well dressed.
```

### ✓ A05 — Under no circumstances — **100%** (3/3, 4 turns)

```
Charlotte: At no time did our team approve this campaign. How would you defend that publicly?
Student: In no way does this campaign align with our core principles.
Charlotte: Clear and clean. Anything stronger?
  → marked obj(s): 1
Student: Under no circumstances will we endorse a campaign that contradicts our values.
Charlotte: Sure!
  → marked obj(s): 2
Student: What’s your stance on the potential backlash?
Charlotte: Cool.
Student: How about yourself?
Charlotte: I believe that addressing backlash is crucial for maintaining trust. It’s important to be transparent and proactive. Defended in formal English.
  → marked obj(s): 3
```

## M03 — It-clefts, wh-clefts (pseudo-clefts), reverse pseudo-clefts, all-clefts

### ✓ A01 — It was X who — **100%** (3/3, 3 turns)

```
Charlotte: Who actually built your team's first product?
Student: It was a small founding team of three who built it.
Charlotte: Great! And when did it actually ship?
  → marked obj(s): 1
Student: It was in March 2019 that we finally shipped it.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: What would you like to know about the product's features?
Charlotte: It was the unique features that set it apart from competitors. What features do you think were most valuable?
  → marked obj(s): 3
```

### ✓ A02 — What I need is — **100%** (3/3, 3 turns)

```
Charlotte: What's actually missing from your week right now?
Student: What I need is a moment of clarity to plan my goals.
Charlotte: That's a powerful need, SyntheticFelipe! Anything that's caught you off guard lately?
  → marked obj(s): 1
Student: What surprised me was how quickly the week has flown by.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: What’s missing from yours, Charlotte?
Charlotte: What I need is one weekend without a notification. Needs named, plainly.
  → marked obj(s): 3
```

### ✓ A03 — All I want is — **100%** (3/3, 5 turns)

```
Charlotte: All I want from this year is fewer commitments and deeper ones. What's yours?
Student: What I truly desire is more time to enjoy the little things in life.
Charlotte: All I want is to savor each moment too. What can you do to create more time for those little joys?
Student: What I plan to do is prioritize my schedule and set aside moments for myself.
Charlotte: All I did was start blocking time in my calendar for self-care. What did you actually change?
  → marked obj(s): 3
Student: What I've decided is to limit distractions and focus on what truly matters.
Charlotte: All I did was turn off notifications during my focus time. It made a huge difference!
Student: What I aim for is to establish a morning routine that sets a positive tone for the day.
Charlotte: Nice.
Student: What I hope for is to feel less rushed in the mornings.
Charlotte: All I did was start setting my alarm twenty minutes earlier. It really helps!
  → marked obj(s): 1, 2
```

### ✓ A04 — It wasn't until — **100%** (3/3, 3 turns)

```
Charlotte: It wasn't until my mid-thirties that I started taking sleep seriously. What came to you late?
Student: It wasn't until I traveled abroad that I truly understood different cultures.
Charlotte: Travel really opens our eyes! Another moment that changed your perspective?
  → marked obj(s): 1
Student: It wasn't until I faced a major setback that I learned the importance of resilience.
Charlotte: Cool.
  → marked obj(s): 2
Student: What flipped the switch on your approach to sleep?
Charlotte: A weekend without coffee. I crashed at 8 and woke up reborn. Late, not lost.
  → marked obj(s): 3
```

### ✓ A05 — The reason is, The thing that — **100%** (3/3, 3 turns)

```
Charlotte: The reason I became a teacher is that I had one great one as a kid. What's a 'the reason' for you?
Student: The reason I enjoy reading is that it transports me to different worlds.
Charlotte: That's beautiful! The thing that inspires me most is a good story. What about you — what's the defining thing about your reading experience?
  → marked obj(s): 1
Student: The thing that changed my perspective was discovering a book that challenged my beliefs.
Charlotte: Sure!
  → marked obj(s): 2
Student: Who was the teacher that inspired you?
Charlotte: Mrs. Costa, sixth grade. She read poetry aloud and waited for us to feel something. Self-portrait, in clefts.
  → marked obj(s): 3
```

## M04 — Mandative subjunctive (suggest/insist/demand that he be), past subjunctive (were across persons), "lest", fossilised subjunctive

### ✓ A01 — I suggest that he be — **100%** (3/3, 4 turns)

```
Charlotte: The committee is reviewing our hiring practices. What would you recommend?
Student: I suggest that we implement a structured interview process to ensure fairness.
Charlotte: That's a solid suggestion, SyntheticFelipe! Implementing a structured interview process can enhance fairness. Any other recommendations?
Student: I propose that every candidate be evaluated by at least two different interviewers to minimize bias.
Charlotte: Cool.
  → marked obj(s): 2
Student: I recommend that we provide training for interviewers to standardize the evaluation process.
Charlotte: Nice.
  → marked obj(s): 1
Student: Will you bring it to a vote?
Charlotte: Yes, I will bring it to a vote at our next session. Recommendations recorded. 😊
  → marked obj(s): 3
```

### ✓ A02 — It is essential that — **100%** (3/3, 3 turns)

```
Charlotte: We're writing the employee handbook. What's the first non-negotiable principle?
Student: It is essential that transparency be maintained throughout all company policies.
Charlotte: Transparency is key! What's the second principle?
  → marked obj(s): 1
Student: It is crucial that respect be shown in all communications among team members.
Charlotte: Sure!
  → marked obj(s): 2
Student: What would you add regarding teamwork?
Charlotte: It is vital that collaboration be encouraged to foster innovation and creativity. Teamwork thrives in an open and supportive environment.
  → marked obj(s): 3
```

### ✓ A03 — I wish I were — **100%** (3/3, 3 turns)

```
Charlotte: I wish I were the kind of person who actually enjoys mornings. Are you a morning person?
Student: I wish I could say I am, but I often struggle to get out of bed!
Charlotte: I get that! Anything you’d change about your mornings if you could?
  → marked obj(s): 1
Student: If I were more motivated, I'd start my day with a workout.
Charlotte: Nice.
  → marked obj(s): 2
Student: Have you tried becoming a morning person?
Charlotte: Tried, failed, tried again. It's a journey! How about you?
  → marked obj(s): 3
```

### ✗ A04 — Lest, So be it — **33%** (1/3, 4 turns)

```
Charlotte: Be that as it may, learning a language in your forties is no joke. What's your take?
Student: Come what may, I'm determined to master it and enjoy English literature.
Charlotte: That's the spirit! Novels can be a journey. What challenges do you face in this pursuit?
  → marked obj(s): 2
Student: I often struggle with idiomatic expressions, but I believe practice makes perfect.
Charlotte: Suffice it to say, idioms can be tricky but also rewarding. Which ones have you found particularly confusing?
Student: I wish I could grasp them as easily as I do with regular vocabulary.
Charlotte: It’s a common struggle. If you were to focus on just a few idioms daily, would that help?
Student: Absolutely, that might just do the trick!
Charlotte: Cool.
  → stuck 3 turns, aborting
```

### ~ A05 — Mixed subjunctive — **67%** (2/3, 4 turns)

```
Charlotte: A senior colleague keeps missing deadlines. What would you propose, and how would you handle it personally?
Student: I would suggest that we have a candid conversation about expectations and responsibilities.
Charlotte: That's a solid approach! What about how you would initiate that conversation?
  → marked obj(s): 1
Student: If I were in your position, I would start by expressing my concerns directly and respectfully.
Charlotte: Sure!
  → marked obj(s): 2
Student: I believe it’s essential to frame the discussion positively, focusing on solutions rather than problems.
Charlotte: Got it.
Student: I would open the conversation by saying, "I've noticed some challenges with deadlines, and I’d like to discuss how we can improve this together.
Charlotte: That's a great way to approach it! It encourages collaboration. Mood matched to moment.
```

## M05 — Impersonal passive (It is said that...), double passive (He is said to be...), causative have/get, passive with reporting verbs

### ✓ A01 — It is said that — **100%** (3/3, 3 turns)

```
Charlotte: It is reported that AI will reshape half of all jobs within a decade. What's your read?
Student: It is widely believed that while many jobs will evolve, new opportunities will also emerge.
Charlotte: That's a great point! It is said that industries will need to adapt to these changes quickly. Do you think some sectors will adapt better than others?
  → marked obj(s): 1
Student: It cannot be denied that adaptation will be uneven across industries, with some facing greater challenges than others.
Charlotte: Sure!
  → marked obj(s): 2
Student: What's the outlook in teaching, do you think?
Charlotte: It is widely thought that good teaching becomes more valuable, not less. Hedged, honestly.
  → marked obj(s): 3
```

### ~ A02 — He is said to be — **67%** (2/3, 4 turns)

```
Charlotte: The CEO of that startup is said to be in talks with three buyers. What else have you heard?
Student: Two of the cofounders are thought to be against the sale.
Charlotte: Internal friction makes deals collapse. Any past actions that support that?
  → marked obj(s): 1
Student: It’s reported that a previous merger attempt failed due to disagreements among the founders.
Charlotte: An early investor is reported to have already exited his position. Smart timing or bad sign — depends who you ask.
Student: The board is believed to have been considering a new strategy to address these concerns.
Charlotte: Sure!
Student: The team is said to have been working on a revised pitch to attract potential buyers.
Charlotte: Two — both household names. Column drafted.
  → marked obj(s): 2
```

### ~ A03 — Have something done — **67%** (2/3, 5 turns)

```
Charlotte: I just had my bike serviced — saved me a hundred euros. What have you outsourced lately?
Student: I had my garden maintained by a professional last month.
Charlotte: Nice! Some things are worth the fee. What else do you need to have done soon?
  → marked obj(s): 1
Student: I need to have my passport renewed before the trip.
Charlotte: Passport offices are their own form of suffering. Did you feel it was worth the hassle?
  → marked obj(s): 2
Student: Honestly, it’s hard to say if the stress is worth the end result.
Charlotte: I completely understand. Sometimes, it's just about getting it done. I’ve been thinking about getting my bike tires replaced soon, though. What about you?
Student: I might invest in a new set of brakes; safety is worth the expense.
Charlotte: Absolutely! Safety is key. By the way, was the last service on your bike worth it?
Student: It was definitely worth it; the bike runs so much smoother now.
Charlotte: That's great to hear! A smooth bike makes all the difference. I love riding around now after my service. Logistics, sorted.
```

### ✓ A04 — Get yourself done — **100%** (3/3, 4 turns)

```
Charlotte: Last month I had my passport lost by an airline. Worst part: they offered a coupon. What's your recent disaster?
Student: I had my package marked as delivered when it never actually arrived.
Charlotte: The phantom delivery — modern classic. I hope you got it sorted! What else have you had go wrong recently?
  → marked obj(s): 1
Student: I had my reservation cancelled at the last minute without any notice.
Charlotte: And no compensation, I assume? It's so frustrating when that happens! What else have you had to deal with lately?
Student: I had my flight delayed for hours, and they didn't provide any updates.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: How did you sort the passport situation?
Charlotte: Three weeks, four calls, one consulate. Minor agonies, mutual.
  → marked obj(s): 3
```

### ✓ A05 — Mixed passive register — **100%** (3/3, 3 turns)

```
Charlotte: It is widely reported that one of our competitors is about to be acquired. What's your view?
Student: It's believed that they have already secured a buyer.
Charlotte: Cool.
  → marked obj(s): 1
Student: I’m having our legal team review our contracts just in case we need to act fast.
Charlotte: Nice.
  → marked obj(s): 2
Student: What do you think it means for us?
Charlotte: Pressure on price, opportunity on talent. Passive layered, situation tracked.
  → marked obj(s): 3
```

## M06 — Participle clauses — present (-ing), past (-ed), perfect (Having + past participle), perfect passive (Having been + past participle), with-clauses

### ~ A01 — Walking down the street — **67%** (2/3, 5 turns)

```
Charlotte: Walking past my old school last week, I felt fifteen all over again. What did your last walk make you feel?
Student: Strolling through the park yesterday, I was reminded of carefree summer days from my childhood.
Charlotte: Those moments are so precious! Walking through the park, I always notice how the seasons change the scenery. Have you seen any changes in your area recently?
  → marked obj(s): 1
Student: Crossing the bridge this morning, I noticed how much the river has risen since last year.
Charlotte: It's fascinating how nature constantly shifts around us. What other changes have you observed in your neighbourhood recently?
  → marked obj(s): 2
Student: Reflecting on my school days, I realized they've renovated the playground and added new facilities.
Charlotte: Renovations can really transform a place! The playground must look great now. What else changed at your school?
Student: They also upgraded the classrooms with new technology and resources.
Charlotte: That's impressive! It must feel quite different now. Walking through those updated spaces must bring a mix of nostalgia and excitement.
Student: Absolutely! I can only imagine how the new tech enhances the learning experience.
Charlotte: It really does! Experiencing that blend of old and new can be quite enriching. Vignettes, properly opened.
  → stuck 3 turns, aborting
```

### ~ A02 — Built in 1900 — **67%** (2/3, 7 turns)

```
Charlotte: Founded by a former monk, the little bookshop on my street has been there for forty years. Tell me about a place near you.
Student: Built in the 1800s, the café down the road has the coziest atmosphere you can imagine.
Charlotte: Cozy atmospheres are perfect for relaxing and socializing. Have you been there often?
  → marked obj(s): 2
Student: Having visited it countless times, I can confidently say it’s my favorite spot to unwind.
Charlotte: That sounds wonderful! Places like that create such great memories. Does it serve any special drinks or treats?
Student: Known for its artisanal coffee, the café also offers delicious homemade pastries that are hard to resist.
Charlotte: Artisanal coffee and homemade pastries? That sounds like a dream! Does the café have a particular vibe or theme?
Student: Decorated with vintage furniture, the café has a charming, nostalgic vibe that makes you feel right at home.
Charlotte: That sounds lovely! Vintage furniture adds so much character. Do you have a favorite pastry there?
  → marked obj(s): 1
Student: Absolutely! Their almond croissant is simply divine.
Charlotte: Almond croissants are such a treat! I can almost taste it. Does the café have any special events or gatherings?
Student: Yes, they host live music nights every Saturday, which are quite popular!
Charlotte: That sounds like a fantastic way to enjoy the atmosphere! Live music really brings a place to life. Do you usually go to those events?
Student: I try to go whenever I can; the energy is always amazing!
Charlotte: That sounds like a great experience! I love how music can enhance the vibe of a place. Have you discovered any new favorite artists there?
  → stuck 3 turns, aborting
```

### ~ A03 — Having finished — **67%** (2/3, 7 turns)

```
Charlotte: Having taught for fifteen years, I finally feel I'm starting to understand my students. What's something experience clarified for you?
Student: Having traveled extensively, I've learned that every culture has its own unique wisdom to share.
Charlotte: That's a beautiful insight! Having explored different places, I’ve realized how much we can learn from each other. What surprises you most about different cultures?
  → marked obj(s): 1
Student: Having immersed myself in various traditions, I’m often surprised by the depth of connection people have to their history.
Charlotte: That's so true! Having said that, it’s interesting how some traditions evolve over time. What’s a tradition that has particularly fascinated you?
Student: Having celebrated different festivals, I'm fascinated by how they reflect the values and beliefs of a community.
Charlotte: Sounds good.
Student: Having participated in unique rituals, I’ve come to appreciate the stories behind them.
Charlotte: Absolutely! Those stories add so much meaning. Having said that, do you have a favorite ritual that stands out to you?
  → marked obj(s): 2
Student: Having experienced a traditional wedding, I was moved by the sense of unity it created among families.
Charlotte: That’s a powerful reflection! Weddings often highlight our connections. What did you find most memorable about that wedding experience?
Student: Having witnessed the emotional vows, I was touched by the love and commitment shared between the couple.
Charlotte: That’s beautiful! Emotional moments like that truly resonate. Having said that, do you think those vows change over time?
Student: Having observed many couples, I believe vows can evolve as relationships deepen and grow.
Charlotte: That's a profound observation! Having said that, it’s interesting how couples find ways to express their love differently as time goes on. What do you think influences those changes?
  → stuck 3 turns, aborting
```

### ✓ A04 — Having been told — **100%** (3/3, 3 turns)

```
Charlotte: Having been mentored by one careful teacher in my twenties, I still hear her edits when I write. Who shaped you most?
Student: Having been inspired by my grandfather’s wisdom, I often reflect on his advice during tough decisions.
Charlotte: Wisdom is a gift that lingers through time. Having been taught patience by my grandfather, I find rushing strange.
  → marked obj(s): 1
Student: Having been encouraged to explore my creativity, I now embrace challenges with enthusiasm.
Charlotte: Nice.
  → marked obj(s): 2
Student: What did you edit out of your writing?
Charlotte: Adverbs and self-pity, mostly. Inheritance, in passive voice.
  → marked obj(s): 6
```

### ✓ A05 — Reduced relatives + with-clauses — **100%** (3/3, 2 turns)

```
Charlotte: The café, packed with morning regulars and warmed by the smell of fresh bread, was where I made the call. Where did you make a big call recently?
Student: The park, illuminated by a solitary streetlight, is where I decided to take the plunge and resign.
Charlotte: Open air and a hard conversation. With my heart pounding, I told her the news.
  → marked obj(s): 1, 2
Student: Who did you call to break the news?
Charlotte: My oldest friend. To tell her I was leaving the country. Scenes compressed, edges intact.
  → marked obj(s): 3
```

## M07 — Advanced reporting verbs (apologise for, accuse of, suggest doing, admit + ing), reported emotions, hedged reports, "according to + X"

### ~ A01 — Apologise for, accuse of — **67%** (2/3, 5 turns)

```
Charlotte: My colleague accused me of leaking the meeting notes. What would you have done?
Student: I would have expressed my surprise at the accusation and requested clarification on their reasoning.
Charlotte: That’s a thoughtful approach! It’s important to understand their perspective first. What else would you have done in that situation?
Student: I would have apologised for any role in the misunderstanding, then asked for evidence.
Charlotte: Calm response under attack — that's the move. How do you think the situation could have been better handled overall?
  → marked obj(s): 2, 1
Student: I would have proposed a private discussion to resolve the issue collaboratively.
Charlotte: Cool.
Student: I would have suggested involving a neutral third party to mediate the conversation.
Charlotte: Sure!
Student: I would have documented the conversation to ensure clarity and accountability.
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

### ✓ A02 — Admit, deny, suggest — **100%** (3/3, 3 turns)

```
Charlotte: I have to admit dreading Mondays for the first time in years. What's something you'd admit?
Student: I have to admit feeling overwhelmed by my workload lately.
Charlotte: That sounds tough. I'd suggest breaking tasks into smaller parts; it can make things feel more manageable.
  → marked obj(s): 1, 2
Student: I wonder if Mondays have always been this overwhelming for others too.
Charlotte: Sounds good.
Student: What changed about Mondays for you?
Charlotte: A meeting got rescheduled, and the whole week now starts late. Admissions, in pattern.
  → marked obj(s): 3
```

### ~ A03 — Promise, refuse, offer — **67%** (2/3, 5 turns)

```
Charlotte: My doctor offered to refer me to a specialist, and I refused to make the appointment for two weeks. Classic me. What have you promised or refused lately?
Student: I promised to start exercising regularly, and so far I've stuck to it.
Charlotte: That's a fantastic promise! Have you refused anything recently?
  → marked obj(s): 1
Student: I refused to attend a late work meeting last week, and it really improved my evening.
Charlotte: Got it.
  → marked obj(s): 2
Student: I was asked why I delayed my response to the project update.
Charlotte: Cool.
Student: I explained that I needed more time to gather all the necessary information.
Charlotte: That makes sense. I often delay when I'm trying to ensure everything is accurate. What about you?
Student: I sometimes delay when I'm unsure about the best approach to take.
Charlotte: Got it.
  → stuck 3 turns, aborting
```

### ✓ A04 — Warn against, talk into — **100%** (3/3, 4 turns)

```
Charlotte: My grandmother talked me into studying abroad — best decision I never planned. Who shaped a big call of yours?
Student: My mentor persuaded me to take that internship, and it opened so many doors for me.
Charlotte: That's wonderful! Mentors can really make a difference. Did anyone warn you about anything before starting that internship?
  → marked obj(s): 1
Student: A colleague warned me about the steep learning curve, but I was ready for the challenge.
Charlotte: Cool.
  → marked obj(s): 2
Student: What about you? Did anyone give you advice before your trip?
Charlotte: Sure!
Student: What kind of advice did they give you?
Charlotte: They warned me about the weather and suggested I pack layers. It really helped!
  → marked obj(s): 3
```

### ✓ A05 — According to, allegedly — **100%** (3/3, 3 turns)

```
Charlotte: Apparently, the company is restructuring next month. Have you heard anything more?
Student: According to a colleague, three teams are being merged.
Charlotte: Mergers always look cleaner on paper. What else have you heard about the changes?
  → marked obj(s): 2, 1
Student: I heard that some positions might be eliminated, but it's still uncertain.
Charlotte: Reportedly, leadership wants the announcement done before Friday. It seems they want to manage the transition smoothly.
Student: Where did you hear that?
Charlotte: A friend in HR mentioned it. Allegedly, they're trying to keep everything under wraps for now.
  → marked obj(s): 3
```

## M08 — Modal hedging, softening for delicate communication, vague language, distancing devices, polite disagreement

### ✓ A01 — I was wondering if — **100%** (3/3, 3 turns)

```
Charlotte: You wanted to talk. What's on your mind?
Student: I was wondering if you could give me feedback on my proposal before Friday.
Charlotte: I have time tomorrow afternoon. What specifically would you like me to focus on?
  → marked obj(s): 1
Student: I was hoping for your view on which sections to prioritise.
Charlotte: Send me the latest draft this evening, and I'll take a look.
  → marked obj(s): 2
Student: Thank you for taking the time to help me with this.
Charlotte: Of course! I'm glad to assist. How's everything else going for you?
  → marked obj(s): 3
```

### ✓ A02 — It might be worth — **100%** (3/3, 3 turns)

```
Charlotte: I drafted a one-page project summary. Anything you'd tweak?
Student: It might be worth clarifying who the primary audience is.
Charlotte: Fair — I was vague there. Anything else?
  → marked obj(s): 1
Student: Have you considered adding a single metric of success?
Charlotte: Hadn't thought of it. Good catch! Any final thoughts on the overall structure?
  → marked obj(s): 2
Student: Overall, the structure works well — these are small tweaks.
Charlotte: I'll take both. Feedback received, edges softened. What do you think about the next steps for this project?
  → marked obj(s): 3
```

### ✓ A03 — With respect, I'd see it differently — **100%** (3/3, 3 turns)

```
Charlotte: Remote work has run its course. People are more productive in offices. Don't you think?
Student: With respect, the productivity data hasn't really shown that.
Charlotte: It depends on the study, though. Some suggest that in-person collaboration boosts productivity.
  → marked obj(s): 1
Student: I see your point about collaboration, but many teams thrive on virtual tools these days.
Charlotte: Fair — I'm working from instinct, not data. It’s interesting how technology has changed our work dynamics, don't you think?
  → marked obj(s): 2
Student: What's making you think that instinct is more reliable than data in this context?
Charlotte: My own experiences and feelings about isolation during remote work influence my perspective. It's a personal observation rather than a statistic. Argument held, civility preserved.
  → marked obj(s): 3
```

### ✓ A04 — One might say, In a sense — **100%** (3/3, 3 turns)

```
Charlotte: It could be argued that working less actually makes us more productive. Your read?
Student: In a sense, quality of work often outweighs the quantity of hours spent.
Charlotte: Absolutely, that perspective is key. However, it might vary across different roles and industries. What do you think?
  → marked obj(s): 1
Student: Arguably, the four-day week could be more effective in creative industries than in more traditional ones.
Charlotte: Got it.
  → marked obj(s): 2
Student: What about you, do you think a shorter workweek would benefit all sectors?
Charlotte: In a sense, it may not suit every sector, especially those requiring constant presence. However, knowledge-based roles could thrive. How about that?
  → marked obj(s): 3
```

### ✓ A05 — Sort of, more or less — **100%** (3/3, 4 turns)

```
Charlotte: How many meetings did you have this week? Roughly?
Student: I had around ten, give or take a few that were rescheduled.
Charlotte: Cancellations are always a relief, aren't they?
  → marked obj(s): 1
Student: Absolutely, they can be a bit of a blessing in disguise!
Charlotte: I'm sort of fried but sort of proud of what we got done.
Student: I can relate; it’s a mixed bag of exhaustion and accomplishment, isn’t it?
Charlotte: More or less, the week went the way I planned.
  → marked obj(s): 3
Student: That's great to hear; having a plan really makes a difference!
Charlotte: Thank you! It definitely helps to stay organized. Casual register, properly vague.
  → marked obj(s): 2
```

## M09 — High-frequency idioms, body/animal/food idioms, dead vs live metaphor, similes, idioms by register

### ✓ A01 — Hit the nail on the head — **100%** (3/3, 3 turns)

```
Charlotte: Our retention numbers slipped last quarter. The CEO thinks it's compensation, but I'm not so sure.
Student: I believe compensation might be the tip of the iceberg — there could be deeper issues at play.
Charlotte: Absolutely! That's a harder pill for the CEO to swallow. What else do you think might be going on?
  → marked obj(s): 1
Student: The elephant in the room is that people don't believe leadership listens.
Charlotte: Got it.
  → marked obj(s): 2
Student: What does your gut say about the team's morale?
Charlotte: Same as yours, honestly. Diagnosis, idiomatically grounded.
  → marked obj(s): 3
```

### ✗ A02 — Bite the bullet, cold feet — **33%** (1/3, 4 turns)

```
Charlotte: I bit the bullet last year and told my parents I wasn't going back into medicine. Have you ever had to deliver hard news?
Student: Yes, I bit the bullet and told my friends I was moving abroad for work.
Charlotte: That's a big step! Did you hesitate before telling them?
  → marked obj(s): 2
Student: I did hesitate a bit, but I knew it was the right decision for my career.
Charlotte: It's great that you trusted your instincts! Did you have cold feet about moving at any point?
Student: Definitely, I had cold feet a few times, especially when it came to leaving my comfort zone.
Charlotte: Nice.
Student: But I knew I had to embrace the change to grow personally and professionally.
Charlotte: Nice.
  → stuck 3 turns, aborting
```

### ✗ A03 — Piece of cake, spill the beans — **33%** (1/3, 4 turns)

```
Charlotte: Someone leaked the salary bands to the whole company on Friday. Chaos all weekend.
Student: Whoever leaked that information must have known it would create a storm.
Charlotte: Friday afternoon — never an accident. Seems like they really spilled the beans at the wrong time!
  → marked obj(s): 2
Student: It’s hard to believe someone would be so reckless with sensitive information.
Charlotte: Definitely! Containing it will be no piece of cake — once the numbers are out, you can't un-leak them.
Student: It's a classic case of "curiosity killed the cat" — now they're in hot water!
Charlotte: Absolutely! We're already past the 'is it true' phase, and now it’s about damage control.
Student: They really hit the nail on the head with that timing — it's going to be a tough road ahead!
Charlotte: Nice.
  → stuck 3 turns, aborting
```

### ✓ A04 — Two birds with one stone — **100%** (3/3, 3 turns)

```
Charlotte: I've sent over the full brief. Where do we go from here?
Student: Now the ball is in my team's court — we'll review it and get back to you soon.
Charlotte: Perfect cadence! Is there anything we can combine to save time?
  → marked obj(s): 1
Student: We can kill two birds with one stone by discussing the brief during our next standup.
Charlotte: Got it.
  → marked obj(s): 2
Student: What's the highest priority for you in this project?
Charlotte: The tone of the executive summary. We need to be on the same page there. Handoff cleanly framed.
  → marked obj(s): 3
```

### ~ A05 — Crystal clear, low-hanging fruit — **67%** (2/3, 5 turns)

```
Charlotte: Leaving the corporate job felt like the end of the world at the time. In retrospect, blessing in disguise. Have you had a moment like that?
Student: Absolutely, losing my job pushed me to pursue my passion for writing, which turned out to be the best decision ever.
Charlotte: That’s amazing! Forced choices often reveal the right path. Have you found any challenges along the way?
  → marked obj(s): 1
Student: Definitely, navigating the freelance world can be tricky — it's a constant hustle for clients and stability.
Charlotte: Independence can be a double-edged sword — full agency, but also full responsibility for finding the next project. What has been your biggest challenge in this journey?
  → marked obj(s): 4
Student: My biggest challenge has been managing my time effectively — it's easy to get overwhelmed without a structured schedule.
Charlotte: Nice.
Student: Time management is crucial; I've had to learn to set boundaries to stay productive.
Charlotte: Sure!
Student: It's all about finding that balance between work and personal life, isn't it?
Charlotte: Sure!
  → stuck 3 turns, aborting
```

## M10 — Advanced discourse markers — nuance (in fact, as a matter of fact), concession (that said, mind you), reformulation (in other words, put differently), topic shifts (incidentally, by the way), emphatic chains (what's more, not least, above all)

### ~ A01 — In fact, as a matter of fact — **67%** (2/3, 4 turns)

```
Charlotte: People keep saying remote work has killed productivity. Your read?
Student: Actually, most studies indicate productivity either rose or remained steady with remote work.
Charlotte: And the counter-narrative?
  → marked obj(s): 1
Student: That said, the narrative around productivity dips often overlooks the impact of the pandemic itself.
Charlotte: Cool.
  → marked obj(s): 2
Student: What's your perspective on the long-term effects?
Charlotte: Mostly, I think the shift has led to more flexibility and a reevaluation of work-life balance. Assumption properly nuanced.
Student: How about yourself?
Charlotte: It’s been interesting to see how different companies adapt. Some thrive, while others struggle. The conversation is evolving!
```

### ~ A02 — That said, mind you — **67%** (2/3, 4 turns)

```
Charlotte: AI is going to make most knowledge work obsolete in a decade. Hard truth.
Student: There's something to that. That said, the transition won't be as straightforward as it seems.
Charlotte: Fair pushback. What survives in your view?
  → marked obj(s): 2
Student: I think roles requiring creativity and emotional intelligence will still hold value.
Charlotte: Then again, every major shift looked total in advance and partial in retrospect. Historical humility can be useful here.
  → marked obj(s): 4
Student: Absolutely, that perspective is crucial; that said, the pace of change might surprise us.
Charlotte: Nice.
Student: I agree; having said that, we should also consider the potential for new roles to emerge.
Charlotte: That capability and adoption are two different timelines. Position complicated, fairly.
```

### ✓ A03 — In other words, put differently — **100%** (3/3, 3 turns)

```
Charlotte: We're optimising for asymmetric upside in a thin market with low capital intensity. Make sense?
Student: In other words, you're looking for high rewards in a small market without investing too much money.
Charlotte: That's it, in twelve fewer syllables. 😊
  → marked obj(s): 1
Student: To put it simply, we need to target the right customers efficiently.
Charlotte: Put differently — you want to find the few customers who'll pay a lot, without burning cash to find them.
  → marked obj(s): 2
Student: Have I got it right?
Charlotte: Better than my own pitch deck does. Jargon decoded, plainly.
  → marked obj(s): 3
```

### ✓ A04 — Above all, what's more — **100%** (3/3, 3 turns)

```
Charlotte: You chose to stay in your current job instead of taking a fancier offer. Why?
Student: The work itself still excites me; what's more, my manager has actually been listening to my career goals.
Charlotte: Rare. What else?
  → marked obj(s): 1
Student: Not least, the relationships I've built with my colleagues make a huge difference.
Charlotte: And the real reason?
  → marked obj(s): 2
Student: Above all, I value the stability and culture here more than any title.
Charlotte: The hardest learning to act on. Defended, with proper climax.
  → marked obj(s): 3
```

### ✓ A05 — All things considered, hence — **100%** (3/3, 4 turns)

```
Charlotte: How would you sum up the year, on balance?
Student: All things considered, it was a challenging year, but it brought invaluable lessons.
Charlotte: Meaningful lessons often arise from challenges. What specific lessons stood out for you this year?
  → marked obj(s): 1
Student: Granted, I faced several setbacks; that said, I discovered my resilience and adaptability were stronger than I realized.
Charlotte: Knowing your strengths is empowering! Above all, how do you plan to leverage that resilience moving forward?
  → marked obj(s): 2
Student: In any case, I aim to embrace new opportunities and tackle challenges head-on.
Charlotte: Sounds good.
Student: And what about you?
Charlotte: All things considered, a year of small good moves and one big honest conversation. Year, summed properly.
  → marked obj(s): 3
```

## M11 — Word connotation (positive/negative/neutral), formal vs informal register, euphemism, loaded language, litotes and hyperbole, code-switching

### ✓ A01 — Assertive or pushy? — **100%** (3/3, 3 turns)

```
Charlotte: My new director is — I don't know — really direct? Maybe too direct. I can't decide if I admire it or it's exhausting.
Student: If you admire it, she’s probably more assertive than aggressive — direct without making you feel attacked.
Charlotte: There IS room in her directness, mostly.
  → marked obj(s): 1
Student: If it feels exhausting, the line you're sensing might be between assertive and pushy.
Charlotte: That's exactly the line.
  → marked obj(s): 4
Student: When directness starts to overshadow others' input, it can become overwhelming.
Charlotte: Which version feels closer to true?
  → marked obj(s): 3
```

### ~ A02 — Commence, ascertain, demonstrate — **67%** (2/3, 5 turns)

```
Charlotte: I wrote: 'We're going to kick off the new programme and look into the feedback we got.' That feels too casual for the audience. Fix?
Student: I suggest: "We will initiate the new programme and examine the feedback we received.
Charlotte: That's a good start! Can it go even further?
  → marked obj(s): 1
Student: I propose: "We shall commence the new programme and ascertain the substance of the feedback received.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Perhaps you could also consider: "We are poised to launch the new programme and meticulously evaluate the feedback obtained.
Charlotte: Nice.
Student: Additionally, you might say: "We are prepared to unveil the new programme and thoroughly analyze the feedback acquired.
Charlotte: Nice.
Student: Furthermore, you could express: "We stand ready to introduce the new programme and diligently scrutinize the feedback gathered.
Charlotte: Nice.
  → stuck 3 turns, aborting
```

### ✓ A03 — Pass away, between jobs — **100%** (3/3, 3 turns)

```
Charlotte: An old friend's father passed away last week. I'm not sure what to write in the card.
Student: You could say, "I'm so sorry for your loss; I'm thinking of you during this difficult time.
Charlotte: That's a heartfelt opener. What about adding something personal about how he touched their lives?
  → marked obj(s): 1
Student: You might say, "I know he meant the world to you, and you'll be in my thoughts as you navigate this.
Charlotte: Got it.
  → marked obj(s): 2
Student: How close were you to him?
Charlotte: Close enough that silence would hurt, but distant enough that I shouldn't write a novel. Card drafted, weight respected.
  → marked obj(s): 3
```

### ✓ A04 — Not bad, no small feat — **100%** (3/3, 4 turns)

```
Charlotte: Saw a film last night — let's say it wasn't a complete waste of two hours. How was your week?
Student: Not without its challenges — managed to juggle a few projects, and only one nearly drove me crazy!
Charlotte: A commendable effort, indeed. What were you juggling?
  → marked obj(s): 1
Student: I was balancing a tight deadline for a report and prepping for a big presentation — no small feat, I assure you!
Charlotte: Impressive — managing that lot is not exactly a walk in the park. Did you feel prepared for the presentation?
  → marked obj(s): 2
Student: Honestly, I felt a bit nervous, but I think I pulled it off in the end.
Charlotte: Sounds good.
Student: What was the film you saw?
Charlotte: Three hours, two narrators, one ending I'm not entirely sure I understood. Deadpan, sustained.
  → marked obj(s): 3
```

### ✓ A05 — Code-switching — **100%** (3/3, 3 turns)

```
Charlotte: (As your manager) I understand you have concerns about the timeline. Walk me through them.
Student: I appreciate the chance to discuss this; my main concern is the potential impact of the incomplete regression cycle on our launch quality.
Charlotte: (Now your peer) Off the record — same question, plain English.
  → marked obj(s): 1
Student: Honestly? We're not ready; the tests keep failing, and we can't ignore that.
Charlotte: And what's underneath all that?
  → marked obj(s): 2
Student: I’m worried that if we go live now, it could lead to serious issues down the line.
Charlotte: Three audiences, three Englishes, one truth underneath. Register, fully fluent. C1 block closed.
  → marked obj(s): 3
```

### ~ A06 — UK vs US + Falsos cognatos cross-link — **67%** (2/3, 5 turns)

```
Charlotte: If you're writing to an American client, you should use 'elevator', 'apartment', 'vacation'. But for British clients, switch to 'lift', 'flat', 'holiday'. Which version do you default to?
Student: I tend to default to American English because of my schoolbooks, but I’m adapting more with my British colleagues.
Charlotte: That's a sensible approach! False cognates can be tricky; which ones still trip you up?
  → marked obj(s): 1
Student: Honestly, 'sensible' can be confusing — in Portuguese, it means 'sensitive', but in English it means 'reasonable'.
Charlotte: Nice.
  → marked obj(s): 2
Student: I can see how that would be confusing!
Charlotte: Got it.
Student: What about you? Any false cognates that confuse you?
Charlotte: Actually, 'pretend' tripped me up for a while — in Portuguese, 'pretender' means 'to intend', but in English, it means 'to fake'.
Student: That's a good one! I can see how that would lead to misunderstandings.
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

## M12 — Academic register — nominalisation, impersonal voice, hedged claims, citation patterns, paragraph cohesion

### ✓ A01 — Nominalisation — **100%** (3/3, 3 turns)

```
Charlotte: I've drafted: 'Companies are spending more on cybersecurity every year.' For a research paper — too plain. Help me lift it?
Student: Consider: "The increase in corporate cybersecurity spending has accelerated in each of the past five years.
Charlotte: Much better! Anything else to compress in?
  → marked obj(s): 1
Student: You might say, "Annual investments in cybersecurity have surged significantly over the last five years.
Charlotte: Great suggestion! If you want to bring in the cause, you could add: 'driven in part by the emergence of new threat vectors and a shift towards remote work.'
  → marked obj(s): 2
Student: What does the paper actually claim about these trends?
Charlotte: That spending grows faster than effectiveness — efficiency, not budget, is the bottleneck. Opener academically pitched.
  → marked obj(s): 3
```

### ✓ A02 — Impersonal voice — **100%** (3/3, 3 turns)

```
Charlotte: Here's my draft: 'I've noticed that students seem to do better when they get feedback within 24 hours. I think this is because the connection between work and response is fresh.' For a paper — too subjective. Fix?
Student: Try: "The data suggest that students perform measurably better when feedback is delivered within 24 hours.
Charlotte: Great improvement! Now, how would you explain why this happens?
  → marked obj(s): 1
Student: A plausible explanation is that the temporal proximity between task and feedback enhances the cognitive link between effort and outcome.
Charlotte: Got it.
  → marked obj(s): 2
Student: How strong is the evidence for this claim — is it based on a study or classroom observations?
Charlotte: The evidence is based on two small studies, alongside a decade of teaching experience. Paragraph academically dressed.
  → marked obj(s): 3
```

### ✓ A03 — Hedged claims — **100%** (3/3, 3 turns)

```
Charlotte: I wrote: 'Our findings prove that remote workers are more productive than office workers.' For a journal — too strong. Help me dial it back?
Student: Try: "Our findings suggest that remote workers may exhibit higher productivity compared to office workers.
Charlotte: Much safer! Now, can you add a limitation to that statement?
  → marked obj(s): 1
Student: It should be noted that the sample was limited to a specific industry, which may affect the generalizability of the results.
Charlotte: Nice.
  → marked obj(s): 2
Student: How big was the effect, actually, in terms of productivity metrics?
Charlotte: About 4% on objective measures, with a more significant increase in self-reported productivity. Claim accurate, hedge fitting.
  → marked obj(s): 3
```

### ✓ A04 — Citation patterns — **100%** (3/3, 3 turns)

```
Charlotte: Smith said in 2020 that early feedback matters. I'm writing about it for my paper. How do I phrase that?
Student: Try: "Smith (2020) argues that early feedback is crucial for enhancing performance.
Charlotte: That's a great way to put it! And how do I link that to my own work?
  → marked obj(s): 1
Student: You could say, "Building on Smith's (2020) argument, my research explores the implications of early feedback in different contexts.
Charlotte: Cool.
  → marked obj(s): 2
Student: What other sources are you weaving in to support your argument?
Charlotte: Three more papers, all narrower than Smith's. They provide a solid foundation for my literature review. Literature review, properly framed.
  → marked obj(s): 3
```

### ✓ A05 — Paragraph cohesion — **100%** (3/3, 3 turns)

```
Charlotte: My first paragraph ends: 'The intervention reduced anxiety by 23%.' How do I open the next paragraph to keep flow?
Student: You might consider starting with, "This reduction in anxiety, while substantial, was not uniform across subgroups.
Charlotte: Perfect bridge to the subgroup analysis! What if I want to contrast some findings?
  → marked obj(s): 1
Student: You could begin with, "By contrast, the intervention had a negligible effect on depressive symptoms.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: How are you planning to land the conclusion?
Charlotte: I plan to wrap up with a synthesis using 'Taken together' and mention some limitations. This way, the discussion feels complete!
  → marked obj(s): 3
```

## M13 — Building argument (claim/warrant/evidence), anticipating counterargument, rhetorical devices (anaphora, antithesis, tricolon), persuasive structure, strong conclusions

### ✓ A01 — Building the case — **100%** (3/3, 3 turns)

```
Charlotte: We're considering a four-day workweek. Build the case for trying it.
Student: The case for a four-day workweek is bolstered by research indicating increased productivity and employee well-being.
Charlotte: Great start! Can you give me three specific reasons to support that case?
  → marked obj(s): 1
Student: First, studies show that a four-day workweek leads to higher employee satisfaction. Second, it reduces burnout, which enhances overall performance. Most importantly, companies that have implemented it report lower turnover rates.
Charlotte: Nice.
  → marked obj(s): 2
Student: What concerns do you think the team might have about this change?
Charlotte: One significant concern might be how client coverage is managed on Fridays. There's also the worry about potential workload increases on the shorter workweek. What do you think?
  → marked obj(s): 3
```

### ✓ A02 — Anticipating counterargument — **100%** (3/3, 4 turns)

```
Charlotte: You're proposing remote-first hiring. But isn't that just outsourcing in disguise?
Student: While some might see it that way, the key difference lies in the focus on talent access rather than merely cost reduction.
Charlotte: Talent access is doing a lot of work in that sentence. What do you think drives this need for broader talent pools?
  → marked obj(s): 1
Student: The deeper question is whether companies are genuinely committed to inclusivity or just chasing trends.
Charlotte: That's a crucial point. Commitment to inclusivity requires real investment and effort, not just superficial changes. What do you think are the consequences of inauthentic inclusivity?
  → marked obj(s): 2
Student: The consequences can be detrimental, leading to disengagement and a lack of trust among employees.
Charlotte: Cool.
Student: What's your next push?
Charlotte: Culture. But that's a long answer. Refutation under pressure.
  → marked obj(s): 3
```

### ✓ A03 — Anaphora, antithesis, tricolon — **100%** (3/3, 4 turns)

```
Charlotte: I'm opening a conference on disability rights tomorrow. Help me draft an opener that lands.
Student: Welcome, everyone; we gather here today not just to discuss, but to demand the rights that are inherently ours.
Charlotte: Strong start! Let's build on that. What can we add in the middle to emphasize our purpose?
Student: We are here because rights are not granted, they are demanded; our voices must be heard and our needs addressed.
Charlotte: Powerful anaphora! Now, can you incorporate an antithesis to highlight the contrast in our situation?
  → marked obj(s): 1
Student: We stand at the intersection of exclusion and empowerment, where silence meets the roar of our collective demand for justice.
Charlotte: That sentence is excellent! Now, let’s close with a tricolon to leave a lasting impact. What do you think?
  → marked obj(s): 2
Student: Today we listen, tomorrow we organise, every day after that we demand.
Charlotte: Opener drafted, rhetorically structured. You've woven powerful language together! What are your thoughts on the overall tone of the speech?
  → marked obj(s): 3
```

### ✓ A04 — Cause-and-effect chains — **100%** (3/3, 3 turns)

```
Charlotte: Why has consumer trust in news dropped so sharply?
Student: The shift to ad-driven revenue forced outlets to chase clicks, which in turn rewarded sensationalism over substance.
Charlotte: And from there? What happens next in this chain of events?
  → marked obj(s): 1
Student: Sensationalism eroded credibility, which in turn fed the 'media is biased' narrative, leading consumers to seek less-edited sources.
Charlotte: Self-reinforcing collapse. It creates a cycle that's hard to break. What do you think comes after that?
  → marked obj(s): 2
Student: From this it follows that without a fundamental change in how news is funded, trust will continue to erode.
Charlotte: That's the hard part — and the right one. Causal chain, fully landed. What are your thoughts on possible solutions to rebuild that trust?
  → marked obj(s): 3
```

### ✓ A05 — Strong conclusions — **100%** (3/3, 3 turns)

```
Charlotte: The speech is on civic participation. How would you close it?
Student: Ultimately, what is at stake is not merely our participation, but our faith in the power of collective action to effect real change.
Charlotte: That reframes the whole talk beautifully! Now, what choice do we face?
  → marked obj(s): 1
Student: The choice we face is whether to engage actively in shaping our future or to passively accept the status quo.
Charlotte: Great! Now, what final call to action would you include?
  → marked obj(s): 2
Student: If we remain silent and inactive, we risk relinquishing our voice to those who may not represent our interests.
Charlotte: That's powerful! The room you leave empty will be filled. Speech closed, persuasion complete.
  → marked obj(s): 3
```

## M14 — Metaphor and extended metaphor, simile patterns, personification, imagery, sentence rhythm and fragments, showing over telling

### ✓ A01 — Metaphor and simile — **100%** (3/3, 2 turns)

```
Charlotte: Take 'attention is the new oil'. Run it for three sentences — extend it without restating.
Student: In this era of digital consumption, our focus is mined and refined into valuable insights, creating a marketplace where the most captivating narratives thrive, while the overlooked voices fade into obscurity.
Charlotte: Now extend.
  → marked obj(s): 1
Student: As algorithms sift through our preferences, they transform fleeting moments of curiosity into commodities, fueling an insatiable demand for engagement that shapes our collective consciousness.
Charlotte: And like every oil age before it, the consequences of this relentless extraction — mental fatigue, diminished attention spans, and societal division — are quietly accumulating in the shadows.
  → marked obj(s): 2, 3
```

### ✗ A02 — Personification — **0%** (0/3, 3 turns)

```
Charlotte: I wrote: 'The office was empty. The lights were on. The clock said 8 p.m.' Too flat. Animate it.
Student: The office was a ghost town, its lights buzzing softly like whispers in the shadows, while the clock's red digits blinked, mocking the stillness at 8 p.m.
Charlotte: That's vivid! The clock's mocking really brings it to life. What about the mood?
Student: The atmosphere was thick with anticipation, as if the walls themselves were holding their breath, waiting for a presence to shatter the silence.
Charlotte: That's beautifully put! The walls holding their breath adds such depth. Description, finally animate.
Student: The furniture stood like sentinels, poised for a conversation that never came, their stillness echoing the unspoken tension in the room.
Charlotte: That's wonderfully expressive! The furniture as sentinels really captures the mood. It feels like the room has its own heartbeat now. What do you think?
  → stuck 3 turns, aborting
```

### ~ A03 — Vivid verbs, specific nouns — **67%** (2/3, 5 turns)

```
Charlotte: I wrote: 'She went into the café and sat down. A man was there. He was looking at his phone.' Bring it to life.
Student: She stepped into the café, the warmth enveloping her, and noticed a man hunched over his phone, his brow furrowed in concentration.
Charlotte: Now, let’s refine that man’s detail. What else can we add to paint a clearer picture?
  → marked obj(s): 1
Student: In the corner, a man in a grey overcoat was hunched over his phone, thumb scrolling slowly enough to suggest he wasn't reading anything.
Charlotte: Cool.
  → marked obj(s): 2
Student: His unkempt hair fell into his eyes, giving him a distracted, almost lost look.
Charlotte: Nice.
Student: A faint scent of coffee and pastries lingered in the air, adding to the cozy atmosphere.
Charlotte: That detail really enhances the scene! What's the mood you want to convey here?
Student: I want to convey a sense of quiet introspection, as if both the café and its patrons hold untold stories.
Charlotte: Perfect! That gives the scene depth and connection. Scene, alive.
```

### ✓ A04 — Sentence rhythm and fragments — **100%** (3/3, 4 turns)

```
Charlotte: I wrote: 'When my father died I was thirty-two and I didn't know what to do and the house felt strange and nothing made sense for a long time.' All one breath. Help me break it.
Student: Try: "When my father died, I was thirty-two. The house felt strange — nothing made sense for a long time.
Charlotte: That’s a great start! Now, let’s add a touch more. What about adding a sentence about your feelings or thoughts during that time?
  → marked obj(s): 1
Student: Then add: "I did not know what to do. Nothing made sense for a long time. That was the year I learned to live with not-knowing.
Charlotte: Cool.
  → marked obj(s): 2
Student: What if you described a specific moment that captured that feeling?
Charlotte: I remember sitting on the edge of my bed, staring at the empty chair. It felt as if time had paused, holding its breath, waiting for something to happen.
Student: What did that moment teach you about moving forward?
Charlotte: It taught me that moving forward doesn't mean forgetting. It means carrying the memories with me, allowing them to shape who I am, but not define me entirely.
  → marked obj(s): 3
```

### ✓ A05 — Show, don't tell — **100%** (3/3, 3 turns)

```
Charlotte: I wrote: 'She felt lonely in the new city. The apartment was empty. She missed her friends.' Three flat tells. Show them.
Student: Try: "In the new city, the apartment echoed her solitude, a stark reminder of friends left behind.
Charlotte: That’s a great start! How about the emptiness of the space?
Student: The walls seemed to close in, amplifying the silence that filled the void around her.
Charlotte: Perfect imagery there! Now, let’s touch on her missing friends. How does she feel about them?
  → marked obj(s): 2
Student: Memories of laughter and shared moments danced in her mind, a bittersweet ache that lingered in the quiet.
Charlotte: That’s beautiful! Now, how does she connect with them in this solitude?
  → marked obj(s): 1, 3
```

## M15 — High-C2 phrasal verbs — separable/inseparable distinctions, multiple meanings, low-frequency but native-natural verbs

### ✓ A01 — Bring about, bring round, come round — **100%** (3/3, 3 turns)

```
Charlotte: It took my company three years to accept remote work. How would you describe that process?
Student: What brought about the shift was probably the demand for flexibility—once employees voiced their needs, the policy changed.
Charlotte: Absolutely! It's often the voices of employees that spark change. Do you think there were any key events that brought senior management round?
  → marked obj(s): 1
Student: Senior leadership came round slowly—they had to lose two key hires before the policy really moved.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Who was the last to come round in your company?
Charlotte: The CFO. He brought about a 'compromise' that was just remote work in different language. It was interesting to see how he shifted his stance!
  → marked obj(s): 3
```

### ✓ A02 — Gloss over, crop up, single out — **100%** (3/3, 3 turns)

```
Charlotte: I read three different write-ups of the same story and got three different impressions. What does that tell you?
Student: It suggests that each version probably glossed over the angles inconvenient to its own audience.
Charlotte: That's the modern condition! What patterns do you notice in the coverage?
  → marked obj(s): 1
Student: The same two facts probably crop up in all three, but framed in completely different ways.
Charlotte: Sure!
  → marked obj(s): 2
Student: Was anyone singled out across all three?
Charlotte: One name — the regulator who wouldn't comment. The silence got singled out by everyone. Coverage parsed, phrasally.
  → marked obj(s): 3
```

### ✓ A03 — Live up to, fall through, iron out — **100%** (3/3, 3 turns)

```
Charlotte: Q2 was rough — two contracts collapsed and our product didn't perform like we promised. What would you have done?
Student: I would have communicated transparently with our clients to manage expectations.
Charlotte: Not living up to a public promise is the hardest thing to recover from — trust is the slowest thing to rebuild.
  → marked obj(s): 1
Student: You're right; the path back is usually quiet — we need to iron out the technical issues and deliver consistently.
Charlotte: Got it.
  → marked obj(s): 2
Student: How did you tide the team over financially during that tough period?
Charlotte: A short bridge from existing investors. Nothing dramatic — just enough to give us six months of quiet. Quarter survived, phrasally.
  → marked obj(s): 3
```

### ✓ A04 — Talk down to, wear down, shake off — **100%** (3/3, 3 turns)

```
Charlotte: I worked with someone for five years who talked down to everyone but never noticed. I tried to address it — and got nowhere.
Student: It’s frustrating when people are oblivious to their own condescension; they often miss the damage they cause.
Charlotte: Absolutely! People who talk down to others rarely see it because the people they patronise don't push back — silence reads to them as agreement.
  → marked obj(s): 1
Student: That silence can be so damaging over time, quietly eroding morale and confidence.
Charlotte: Exactly! Five years of that kind of behaviour wears you down without you realising it — the small daily costs add up.
  → marked obj(s): 2
Student: Have you shaken it off, now that you're out?
Charlotte: Mostly. The instinct to brace for the next correction took the longest to lose. Hard relationships, phrasally named.
  → marked obj(s): 3
```

### ✓ A05 — Stem from, amount to, water down — **100%** (3/3, 2 turns)

```
Charlotte: The product team keeps missing its targets. The pattern is too consistent to be bad luck. What's your hypothesis?
Student: My hypothesis is that it stems from how the targets get set — too much top-down, too little capacity input.
Charlotte: Process, not people. We need to focus on the system that allows this to happen. What do you think about the current process?
  → marked obj(s): 1
Student: The current process amounts to manufacturing failure: targets that nobody believes get adopted, then everyone is surprised when they aren't hit.
Charlotte: Got it.
  → marked obj(s): 2, 4
```

## M16 — Prefixes (un-, dis-, mis-, pre-, over-, under-, re-), suffixes (-tion, -ment, -ness, -ity, -able, -ise), compounds (closed/hyphenated/open), conversion (noun ↔ verb), nuanced word families

### ✓ A01 — Negation prefixes — **100%** (3/3, 3 turns)

```
Charlotte: My old colleague is really unresponsible with deadlines. Drove me mad.
Student: Small correction — it's 'irresponsible' with 'ir-' before the 'r' of 'responsible'.
Charlotte: Right. I always second-guess that one. Have you ever worked with someone who's truly irresponsible?
  → marked obj(s): 1
Student: Yes, I once had a teammate who consistently missed deadlines and overlooked important details.
Charlotte: Sure!
  → marked obj(s): 2
Student: Did he ever change his ways, or was it a constant struggle?
Charlotte: Only after losing a major account. By then it was too late. Vocabulary calibrated.
  → marked obj(s): 3
```

### ✓ A02 — Suffixes for nouns — **100%** (3/3, 3 turns)

```
Charlotte: I wrote: 'The team decided to expand, and they performed better. We grew faster than competitors.' For a board report — too active. Help me nominalise?
Student: Try: 'The team’s decision to expand resulted in improved performance and accelerated growth compared to competitors.
Charlotte: Stronger! Now, can you clarify the growth aspect?
  → marked obj(s): 1
Student: Then: 'Subsequent growth outpaced that of competitors over the same period.
Charlotte: Nice.
  → marked obj(s): 2
Student: Who is the audience — internal board or shareholders?
Charlotte: Shareholders. Quarterly letter. Verbs to nouns, register lifted.
  → marked obj(s): 3
```

### ✓ A03 — Suffixes for adjectives and verbs — **100%** (3/3, 5 turns)

```
Charlotte: I want to say someone 'can be relied on' — is the word 'relyable'?
Student: Close — it's 'reliable'. The 'y' in 'rely' becomes 'i' before '-able'.
Charlotte: I always second-guess that. It's tricky!
  → marked obj(s): 1
Student: Totally understandable! English has many of those patterns.
Charlotte: Same pattern: 'predict' becomes 'predictable', 'apply' becomes 'applicable' — same y→i rule when applicable.
  → marked obj(s): 2
Student: Exactly! Those transformations can be quite confusing at times.
Charlotte: The rule is consistent, then. It definitely helps to keep practicing!
Student: Absolutely, consistent practice will make it easier over time!
Charlotte: Sure!
Student: Speaking of practice, who are you describing as reliable?
Charlotte: An old project manager. Quietly heroic. Spellings, finally trusted.
  → marked obj(s): 3
```

### ✓ A04 — Compounds — **100%** (3/3, 4 turns)

```
Charlotte: I wrote: 'My state of the art smartphone helps me check work mail in the post office.' Anything to fix?
Student: Almost — it should be 'state-of-the-art' since it modifies 'smartphone.
Charlotte: Ah — position-dependent. The others?
  → marked obj(s): 1
Student: The phrase 'check work mail' could be clearer as 'check my work email.
Charlotte: That’s a good point! But I was asking about the compounds. What about 'smartphone' and 'post office'?
Student: Smartphone' is correctly closed, and 'post office' is correctly open — those two were already right.
Charlotte: Got it.
  → marked obj(s): 2
Student: Anything else you're unsure about?
Charlotte: I was wondering about 'half-hour' vs 'half hour' — it gets confusing. It's 'half-hour' when before a noun, right?
  → marked obj(s): 3
```

### ✓ A05 — Conversion — **100%** (3/3, 5 turns)

```
Charlotte: I told my daughter I would send her a text message later. She laughed at me.
Student: She probably thought it was funny since we just say "I'll text her" now.
Charlotte: Exactly! I find myself using 'I'll email you' more often too. It feels more natural these days. 📱
  → marked obj(s): 2
Student: Same goes for 'call you' instead of 'give you a call'—it's all about keeping it simple!
Charlotte: Absolutely! It's fascinating how language evolves. I notice 'google it' has become quite common too. 📧
Student: Right? Conversion makes communication quicker—like 'message me' instead of 'send me a message'!
Charlotte: I'm starting to understand why my old textbooks sound stiff. It’s all about efficiency these days!
Student: Exactly! Language is all about adapting to how we communicate now.
Charlotte: Cool.
  → marked obj(s): 1
Student: By the way, how old is your daughter?
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
Charlotte: Nice.
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
Charlotte: Got it.
  → marked obj(s): 2
Student: Will you be at the kickoff?
Charlotte: I hope so — depends on whether the sponsor finally signs. Any other updates on the project?
  → marked obj(s): 3
```

### ✗ A03 — One, ones, that of — **33%** (1/3, 2 turns)

```
Charlotte: These two jackets are basically identical. Which one would you go for?
Student: Honestly, I'd take the navy one — it fits better at the shoulders.
Charlotte: I keep looking at the navy too. It's definitely a classic choice!
  → marked obj(s): 1
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A04 — Do so / do it / do that — **0%** (0/3, 1 turns)

```
Charlotte: I made the switch to a four-day workweek last year. Several colleagues followed. Tell me about a change you made.
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A05 — So do I, neither do I — **0%** (0/3, 1 turns)

```
Charlotte: I never check email before coffee.
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

## M18 — Reference chains, lexical cohesion (synonyms, hyponyms, repetition), old-information-first principle, bridging implicit links, avoiding ambiguous referents

### ✗ A01 — This, that as reference — **0%** (0/3, 1 turns)

```
Charlotte: I wrote: 'We had three problems last quarter. Costs were up. Revenue was flat. Morale dipped. We need to address them.' Feels jumpy. Help?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A02 — Lexical chains — **0%** (0/3, 1 turns)

```
Charlotte: I wrote: 'The CEO announced the merger. The CEO said it would close in March. The CEO refused questions. The CEO walked out.' Help me vary it.
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A03 — The former, the latter, such — **0%** (0/3, 1 turns)

```
Charlotte: We're choosing between two strategies: aggressive expansion or careful consolidation. Which favours which moment?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A04 — Old information first — **0%** (0/3, 1 turns)

```
Charlotte: I wrote: 'Significant gains were produced by the new strategy. A complete restructuring of the sales team was required by these gains.' Awkward — help?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A05 — Bridging and avoiding ambiguous referents — **0%** (0/3, 1 turns)

```
Charlotte: I wrote: 'The CEO met with the head of legal yesterday. She said the deal would close. They disagreed about the timeline. Now it's all in their hands.' Confusing — fix?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

## M19 — Fine shades of modal meaning — certainty (must/will/should/might/may), obligation vs inference, layered modals (might have to), quasi-modals (be supposed to / be bound to / be likely to), formal modals (ought to / shall / would)

### ✗ A01 — Must, will, should — three shades of certainty — **0%** (0/3, 1 turns)

```
Charlotte: My neighbour's lights have been on all night for three nights running. Strange — she's usually asleep by ten. Theories?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A02 — Might well, could well, may well — **0%** (0/3, 1 turns)

```
Charlotte: Three of our biggest competitors are quietly raising prices this month. What do you make of it?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A03 — Ought to, shall, would — **0%** (0/3, 1 turns)

```
Charlotte: Draft a clause for a service contract — what should the contractor be obliged to do?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A04 — Be bound to, be likely to, be supposed to — **0%** (0/3, 1 turns)

```
Charlotte: The pilot launch was meant to start in March. Now I'm not sure it'll happen before June. Your read?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A05 — Modal layering — **0%** (0/3, 1 turns)

```
Charlotte: If the funding round closes below target, what changes?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

## M20 — Word stress, sentence stress (content vs function words), weak forms (schwa), connected speech (linking, intrusive sounds, assimilation, elision), contractions, intonation

### ✗ A01 — Word stress — **0%** (0/3, 1 turns)

```
Charlotte: I noticed today that 'comfortable' is one of the words I most often stress wrong. What's a word that catches you out?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A02 — Sentence stress and weak forms — **0%** (0/3, 1 turns)

```
Charlotte: Brazilian learners often give every syllable equal weight. What's helped you start to compress?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A03 — Connected speech — **0%** (0/3, 1 turns)

```
Charlotte: Textbooks teach 'Did you go?' I almost never hear it that way — natives say 'didja go?' What surprised you most?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A04 — Intonation — **0%** (0/3, 1 turns)

```
Charlotte: I've noticed that 'fine' said three different ways carries three different meanings. How do you say 'fine' when you mean it's genuinely fine?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A05 — Contractions and elision — **0%** (0/3, 1 turns)

```
Charlotte: You been working late again?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

## M21 — Discourse fillers (you know, I mean, like), hedge markers (kind of, sort of, basically), tag questions (isn't it? right?), backchannels (mm-hm, right, gotcha), pragmatic openers (honestly, to be fair, no offence)

### ✗ A01 — Discourse fillers — **0%** (0/3, 1 turns)

```
Charlotte: I mean, the whole thing kind of fell apart in week three. You know how it is — one decision, three weeks later, total restart.
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A02 — Tag questions — **0%** (0/3, 1 turns)

```
Charlotte: The book club meets at six, doesn't it? I've forgotten if it was six or six-thirty.
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A03 — Backchannels — **0%** (0/3, 1 turns)

```
Charlotte: So I'm at the airport last week, and the gate agent decides I need to repack my bag — in front of everyone.
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A04 — Pragmatic openers — **0%** (0/3, 1 turns)

```
Charlotte: One of my senior team members has been quietly disengaged for months. I don't know how to start the conversation.
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A05 — The thing is, here's the thing — **0%** (0/3, 1 turns)

```
Charlotte: The thing is, we keep hiring brilliant people and losing them within eighteen months. I'm starting to think the issue isn't the people.
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

## M22 — Integration of all C1/C2 skills — mixed conditionals + inversion + clefts + hedging + idioms + literary craft + register fluidity + native pronunciation + pragmatic moves

### ✗ A01 — Mixed-register narrative — **0%** (0/3, 1 turns)

```
Charlotte: Three weeks later, the reply came. What did you feel reading it?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A02 — Argumentative essay opening — **0%** (0/3, 1 turns)

```
Charlotte: Topic: the case against measuring everything. Open an op-ed paragraph.
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A03 — Diplomatic conversation — **0%** (0/3, 1 turns)

```
Charlotte: I think we should let the underperforming team member go. Six months of warnings and no real change.
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A04 — Spontaneous casual speech — **0%** (0/3, 1 turns)

```
Charlotte: Hey, how've you been? Haven't seen you since the dinner thing.
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A05 — Full synthesis — **0%** (0/3, 1 turns)

```
Charlotte: (As your manager) Walk me through your assessment of the Q1 priorities.
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

## M23 — Professional written English — formal emails, job applications, cover letters, follow-ups, workplace messaging

### ✗ A01 — Email openings & closings — **0%** (0/3, 1 turns)

```
Charlotte: I need to email the CEO of a partner company. We've never met. What should I open with?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A02 — Job applications — **0%** (0/3, 1 turns)

```
Charlotte: I read your draft. The opening is good. But the middle is too vague — what specifically have you done?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A03 — Cover letters & CVs language — **0%** (0/3, 1 turns)

```
Charlotte: Your cover letter says you 'admire the company's innovative culture'. That's filler. Be specific — what about them?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A04 — Follow-ups & check-ins — **0%** (0/3, 1 turns)

```
Charlotte: I emailed a potential client three weeks ago and never heard back. I don't want to seem pushy. Should I just give up?
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A05 — Difficult emails — **0%** (0/3, 1 turns)

```
Charlotte: I need to tell a longtime client we can't take their new project. Two years of work, but the timing isn't right. I don't want to ruin the relationship.
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

## M24 — High-frequency cultural idioms — expressions whose meaning is rooted in Anglo-Saxon culture and cannot be deduced from the words alone.

### ✗ A01 — Idiomas com partes do corpo — **0%** (0/3, 1 turns)

```
Charlotte: My aunt and uncle haven't spoken in five years. Family events are awkward.
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A02 — Idiomas com animais — **0%** (0/3, 1 turns)

```
Charlotte: Our director just announced a re-org, but he kept skirting around what it actually means for headcount.
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A03 — Idiomas de tempo e raridade — **33%** (1/3, 2 turns)

```
Charlotte: It's already August. Where did this year go? I had so many plans for things that haven't happened.
Student: Time really does fly when you're not looking!
Charlotte: Exactly! And friendships? Do you find yourself catching up with old friends less often these days?
  → marked obj(s): 1
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A04 — Idiomas de decisão e ação — **0%** (0/3, 1 turns)

```
Charlotte: I've been trying to launch this side project for six months. Every time I get close, something breaks. I'm exhausted.
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

### ✗ A05 — Idiomas conversacionais — **0%** (0/3, 1 turns)

```
Charlotte: The board presentation went so much better than I expected. I was dreading it for weeks.
Student: 
[API-ERR] API error 400: {"error":"Missing user_message"}
```

---

## Summary

- ✓ 100%: **60** units
- ~ 67-99%: **19** units
- ✗ <67%: **42** units
- Total: 121 units

Average score: **61%**

### Failed units (sorted by score)

- **M14/A02** (0%) — Personification
- **M17/A04** (0%) — Do so / do it / do that
- **M17/A05** (0%) — So do I, neither do I
- **M18/A01** (0%) — This, that as reference
- **M18/A02** (0%) — Lexical chains
- **M18/A03** (0%) — The former, the latter, such
- **M18/A04** (0%) — Old information first
- **M18/A05** (0%) — Bridging and avoiding ambiguous referents
- **M19/A01** (0%) — Must, will, should — three shades of certainty
- **M19/A02** (0%) — Might well, could well, may well
- **M19/A03** (0%) — Ought to, shall, would
- **M19/A04** (0%) — Be bound to, be likely to, be supposed to
- **M19/A05** (0%) — Modal layering
- **M20/A01** (0%) — Word stress
- **M20/A02** (0%) — Sentence stress and weak forms
- **M20/A03** (0%) — Connected speech
- **M20/A04** (0%) — Intonation
- **M20/A05** (0%) — Contractions and elision
- **M21/A01** (0%) — Discourse fillers
- **M21/A02** (0%) — Tag questions
- **M21/A03** (0%) — Backchannels
- **M21/A04** (0%) — Pragmatic openers
- **M21/A05** (0%) — The thing is, here's the thing
- **M22/A01** (0%) — Mixed-register narrative
- **M22/A02** (0%) — Argumentative essay opening
- **M22/A03** (0%) — Diplomatic conversation
- **M22/A04** (0%) — Spontaneous casual speech
- **M22/A05** (0%) — Full synthesis
- **M23/A01** (0%) — Email openings & closings
- **M23/A02** (0%) — Job applications
- **M23/A03** (0%) — Cover letters & CVs language
- **M23/A04** (0%) — Follow-ups & check-ins
- **M23/A05** (0%) — Difficult emails
- **M24/A01** (0%) — Idiomas com partes do corpo
- **M24/A02** (0%) — Idiomas com animais
- **M24/A04** (0%) — Idiomas de decisão e ação
- **M24/A05** (0%) — Idiomas conversacionais
- **M04/A04** (33%) — Lest, So be it
- **M09/A02** (33%) — Bite the bullet, cold feet
- **M09/A03** (33%) — Piece of cake, spill the beans
- **M17/A03** (33%) — One, ones, that of
- **M24/A03** (33%) — Idiomas de tempo e raridade

### Partial units

- **M01/A02** (67%) — Present state, past result
- **M01/A03** (67%) — Had I known (inverted)
- **M02/A01** (67%) — Never have I
- **M02/A02** (67%) — Hardly had I, No sooner had I
- **M02/A04** (67%) — Only after, Little did I know
- **M04/A05** (67%) — Mixed subjunctive
- **M05/A02** (67%) — He is said to be
- **M05/A03** (67%) — Have something done
- **M06/A01** (67%) — Walking down the street
- **M06/A02** (67%) — Built in 1900
- **M06/A03** (67%) — Having finished
- **M07/A01** (67%) — Apologise for, accuse of
- **M07/A03** (67%) — Promise, refuse, offer
- **M09/A05** (67%) — Crystal clear, low-hanging fruit
- **M10/A01** (67%) — In fact, as a matter of fact
- **M10/A02** (67%) — That said, mind you
- **M11/A02** (67%) — Commence, ascertain, demonstrate
- **M11/A06** (67%) — UK vs US + Falsos cognatos cross-link
- **M14/A03** (67%) — Vivid verbs, specific nouns