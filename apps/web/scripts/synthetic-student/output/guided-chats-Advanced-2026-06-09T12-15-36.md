# Synthetic Student — Guided Chats Report

- Level: **Advanced**
- API: https://charlotte.hubacademybr.com
- Student profile: good
- Generated: 2026-06-09T12:15:36.508Z
- Max turns/chat: 8

## M01 — Mixed conditionals + counterfactuals + inversion in conditionals + alternatives to "if"

### ~ A01 — Past condition, present result — **67%** (2/3, 5 turns)

```
Charlotte: Looking back, what's one decision from years ago that completely shapes your present?
Student: If I hadn't taken that job offer abroad, I wouldn't have developed my language skills as I have today.
Charlotte: Languages can truly open doors. What else flows from that decision?
  → marked obj(s): 1
Student: If I had chosen to stay in my hometown, I probably wouldn't have had such diverse experiences.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Had I known how much I'd grow from that experience, I might have embraced change even sooner.
Charlotte: That's insightful! If I hadn't taken the leap into teaching, I might still be stuck in a corporate job. Change can be so rewarding!
Student: Had I realized the importance of networking earlier, I could have built stronger connections in my field.
Charlotte: Cool.
Student: If I had sought mentorship sooner, I might have accelerated my career growth significantly.
Charlotte: Got it.
  → stuck 3 turns, aborting
```

### ✓ A02 — Present state, past result — **100%** (3/3, 3 turns)

```
Charlotte: If I weren't such a planner, I would have backpacked through Asia in my twenties. What about you?
Student: If I weren't so cautious, I would have traveled to more adventurous places by now.
Charlotte: Cautious people often prioritize safety and stability. But if I weren't this organized, I might have missed out on some great experiences.
  → marked obj(s): 2, 4
Student: Had I been more spontaneous, I could have embraced more unexpected opportunities.
Charlotte: Exactly! Those traits often shape our journeys. Do you feel that caution has helped you in your life choices?
Student: If I had taken more risks, I might have discovered new passions along the way.
Charlotte: Got it.
  → marked obj(s): 1
```

### ✓ A03 — Had I known (inverted) — **100%** (3/3, 3 turns)

```
Charlotte: Imagine writing to your younger self. Had you known what you know now, what would you have done differently?
Student: Had I realized the importance of networking, I would have built more connections during college.
Charlotte: Connections can open doors we never knew existed. What else comes to mind?
  → marked obj(s): 1
Student: Had I prioritized my mental health, I would have enjoyed my studies more instead of stressing over grades.
Charlotte: Cool.
  → marked obj(s): 2
Student: What would you tell yours if you had the chance?
Charlotte: Had I read more poetry, I'd be a softer teacher today. Letters to ghosts, written out loud.
  → marked obj(s): 3
```

### ✓ A04 — Were I to, Should you — **100%** (3/3, 2 turns)

```
Charlotte: Were I to propose a meeting next week, would your team be open to it?
Student: Should the timing work for us, we would be eager to participate.
Charlotte: What flexibility do you have on timing?
  → marked obj(s): 1
Student: Were the meeting to be scheduled for Thursday, we could accommodate it easily.
Charlotte: Thursday it is, in principle. Would Tuesday afternoon work for you?
  → marked obj(s): 2, 3
```

### ✓ A05 — Suppose, But for, Unless — **100%** (3/3, 6 turns)

```
Charlotte: Suppose money weren't an issue — what would you do for the rest of your life?
Student: If I didn't have that constraint, I'd travel the world and write about my adventures.
Charlotte: That sounds amazing! Any conditions on your travels?
Student: Without that constraint, I'd open a small bookstore in each city I visit.
Charlotte: Books and travel — a perfect mix! Provided that it was feasible, how would you manage the logistics?
  → marked obj(s): 2
Student: Were I to have sufficient resources, I would hire local staff to help run the bookstores while I travel.
Charlotte: Sounds good.
Student: If I could, I'd also host book clubs in each city to connect with the locals.
Charlotte: Cool.
Student: Had I started this plan earlier, I would have been able to establish a network of readers by now.
Charlotte: That’s a great reflection! Suppose the same for you — what then?
  → marked obj(s): 3
Student: Had I pursued my passion for writing sooner, I would have published several books by now.
Charlotte: But for my fear of rejection, I would have shared my stories much earlier. Hypothetical range full.
  → marked obj(s): 1
```

## M02 — Inversion after negative/restrictive adverbials, time inversions, "only" inversions, emphatic inversions

### ~ A01 — Never have I — **67%** (2/3, 3 turns)

```
Charlotte: Never have I laughed as hard as I did at that wedding last summer. Your turn — top a rare moment.
Student: Rarely have I experienced such an exhilarating adventure as that hiking trip in the mountains.
Charlotte: Adventure can be so transformative! Never have I felt so alive as when I watched a sunrise from a mountain peak. What about your rarest moment?
  → marked obj(s): 2
Student: Never have I tasted such delicious food as I did at that little restaurant in Italy.
Charlotte: Got it.
Student: Rarely have I found such peace as when I spent a day by the ocean.
Charlotte: Seldom have I felt prouder than the day my student passed his oral exam. Emphasis carries weight.
  → marked obj(s): 4
```

### ✓ A02 — Hardly had I, No sooner had I — **100%** (3/3, 4 turns)

```
Charlotte: No sooner had I sat down to write than the doorbell rang. What's your worst day-from-hell sequence?
Student: Never have I felt so overwhelmed as when I spilled coffee on my laptop right before an important meeting.
Charlotte: That sounds intense! No sooner had I started my day than I realised I had a flat tire. What happened next for you?
Student: Rarely have I been so grateful for a backup plan as when I managed to borrow a colleague's laptop just in time.
Charlotte: That's a relief! Hardly had you settled in when the meeting started, right?
  → marked obj(s): 1, 2
Student: Little did I know that my backup plan would actually save the day!
Charlotte: Cool.
Student: Did you ever think about how different things could have been without that backup?
Charlotte: Absolutely! It’s amazing how a small change can alter everything. Day mapped, sentence by sentence.
  → marked obj(s): 3
```

### ✓ A03 — Not only, Not until — **100%** (3/3, 4 turns)

```
Charlotte: Not only did my grandmother raise five children alone, but she also went back to school at 50. Top that — or layer your own.
Student: Not only did my uncle travel to over 30 countries, but he also became fluent in three languages by the time he turned 70.
Charlotte: Impressive! Generational wanderlust and wisdom. What realisation did that bring you?
  → marked obj(s): 1
Student: Not until I learned about his adventures did I appreciate the value of stepping out of my comfort zone.
Charlotte: Exactly! Stepping out can be transformative. What about your own experiences?
  → marked obj(s): 2
Student: Little did I know that volunteering abroad would open my eyes to new cultures and perspectives.
Charlotte: That's a powerful reflection! What did your grandmother think about your journey?
Student: What she thought was that every experience, no matter how small, adds richness to life.
Charlotte: Her wisdom shines through! Not only did she inspire you, but she also taught you to cherish every moment. Layered lives, properly framed.
  → marked obj(s): 3
```

### ~ A04 — Only after, Little did I know — **67%** (2/3, 4 turns)

```
Charlotte: Only by failing my first big presentation did I learn how to prepare. What unlocked something for you?
Student: Only after moving to a new city did I realize the importance of staying connected with friends.
Charlotte: Some lessons cost too much. Anything that sneaked up on you?
  → marked obj(s): 1
Student: Little did I know that a chance encounter at a café would change my perspective on life.
Charlotte: Nice.
  → marked obj(s): 2
Student: Seldom have I felt such a profound impact from a simple conversation.
Charlotte: Cool.
Student: Hardly had I imagined that a single book could reshape my entire worldview.
Charlotte: Little did I know that a borrowed book would set my whole reading life. Hindsight, well dressed.
```

### ~ A05 — Under no circumstances — **67%** (2/3, 5 turns)

```
Charlotte: At no time did our team approve this campaign. How would you defend that publicly?
Student: In no way should this campaign be associated with our brand's identity.
Charlotte: Clear and clean! Anything stronger you could add?
  → marked obj(s): 1
Student: Under no circumstances can we be linked to a campaign we did not endorse.
Charlotte: Sure!
  → marked obj(s): 2
Student: Seldom have I seen such a blatant disregard for our values.
Charlotte: Nice.
Student: Little did they realize the potential backlash this could cause.
Charlotte: Nice.
Student: Never have I felt such a strong need to clarify our stance.
Charlotte: That’s powerful! How would you phrase your final thoughts in a more formal tone?
  → stuck 3 turns, aborting
```

## M03 — It-clefts, wh-clefts (pseudo-clefts), reverse pseudo-clefts, all-clefts

### ✓ A01 — It was X who — **100%** (3/3, 3 turns)

```
Charlotte: Who actually built your team's first product?
Student: It was a talented group of engineers who developed our very first product.
Charlotte: That's impressive! And when did it actually ship?
  → marked obj(s): 1
Student: It was in late 2018 that we officially launched it to the market.
Charlotte: Got it.
  → marked obj(s): 2
Student: What do you want to know next?
Charlotte: Whatever the marketing team won't tell me. Origin story documented.
  → marked obj(s): 3
```

### ✓ A02 — What I need is — **100%** (3/3, 3 turns)

```
Charlotte: What's actually missing from your week right now?
Student: What I truly need is some time to recharge and reflect.
Charlotte: That sounds essential! Almost everyone says they need that too. Has anything caught you off guard lately?
  → marked obj(s): 1
Student: What surprised me was how much I realized I crave that quiet time.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: What's missing from yours, then?
Charlotte: What I need is one weekend without a notification. Needs named, plainly.
  → marked obj(s): 3
```

### ✓ A03 — All I want is — **100%** (3/3, 4 turns)

```
Charlotte: All I want from this year is fewer commitments and deeper ones. What's yours?
Student: What I truly desire is to find more time for self-reflection and relaxation.
Charlotte: That sounds essential! All I want is to cultivate more mindfulness in my daily routine. What do you think?
Student: What I really hope for is to embrace a slower pace in my life.
Charlotte: That's a beautiful hope! How are you planning to achieve it?
  → marked obj(s): 1
Student: All I need to do is prioritize my time better and say no more often.
Charlotte: Got it.
  → marked obj(s): 2
Student: What did you actually change in your schedule to make that happen?
Charlotte: All I did was set specific blocks for work and personal time. It really helps me stay focused!
  → marked obj(s): 3
```

### ~ A04 — It wasn't until — **67%** (2/3, 5 turns)

```
Charlotte: It wasn't until my mid-thirties that I started taking sleep seriously. What came to you late?
Student: It wasn't until I traveled abroad that I truly appreciated different cultures.
Charlotte: Travel really opens our eyes, doesn’t it? Can you think of another experience that changed your perspective?
  → marked obj(s): 1
Student: It was during my volunteering experience that I realized the importance of giving back to the community.
Charlotte: Sure!
  → marked obj(s): 2
Student: It was the moment I faced my fears that I understood the power of stepping out of my comfort zone.
Charlotte: Got it.
Student: It was the day I learned to meditate that I discovered the value of inner peace.
Charlotte: Nice.
Student: It was when I started journaling that I found clarity in my thoughts.
Charlotte: Got it.
  → stuck 3 turns, aborting
```

### ✓ A05 — The reason is, The thing that — **100%** (3/3, 3 turns)

```
Charlotte: The reason I became a teacher is that I had one great one as a kid. What's a 'the reason' for you?
Student: The reason I enjoy learning languages is that they open up new worlds and perspectives for me.
Charlotte: That's a wonderful reason! The thing that inspires me most is the curiosity of my students. What about you—what's a defining thing in your life?
  → marked obj(s): 1
Student: The thing that changed me most was the moment I realized the power of communication.
Charlotte: Got it.
  → marked obj(s): 2
Student: Who was the teacher that inspired you the most?
Charlotte: Mrs. Costa, sixth grade. She read poetry aloud and waited for us to feel something. Self-portrait, in clefts.
  → marked obj(s): 3
```

## M04 — Mandative subjunctive (suggest/insist/demand that he be), past subjunctive (were across persons), "lest", fossilised subjunctive

### ~ A01 — I suggest that he be — **67%** (2/3, 3 turns)

```
Charlotte: The committee is reviewing our hiring practices. What would you recommend?
Student: I suggest that we ensure each candidate be assessed by a diverse panel to avoid bias.
Charlotte: That's a great suggestion, SyntheticFelipe! Ensuring diversity in the panel is crucial. Anything else you'd recommend?
  → marked obj(s): 1
Student: I also propose that we make the hiring criteria transparent on the company website.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: I believe it is essential that we bring this proposal to a vote soon.
Charlotte: Absolutely, I will bring it to a vote at the next session. Recommendations recorded!
```

### ~ A02 — It is essential that — **67%** (2/3, 6 turns)

```
Charlotte: We're writing the employee handbook. What's the first non-negotiable principle?
Student: It is essential that every voice be heard in team decisions.
Charlotte: Voice equity — start there. Second?
  → marked obj(s): 1
Student: It is important that transparency be maintained in all communications.
Charlotte: Let's revise that to align with our style. How about: "It is crucial that transparency be maintained in all communications." What's next?
Student: It is vital that accountability be upheld at all levels of the organization.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: It is imperative that we foster a culture of continuous learning and development.
Charlotte: Sure!
Student: It is necessary that we promote inclusivity and diversity in our hiring practices.
Charlotte: Sure!
Student: It is fundamental that we encourage open feedback to enhance collaboration.
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

### ✓ A03 — I wish I were — **100%** (3/3, 3 turns)

```
Charlotte: I wish I were the kind of person who actually enjoys mornings. Are you a morning person?
Student: I wish I were more of a morning person too; I find it hard to get up early!
Charlotte: Different fault line, same regret. Anything you'd change?
  → marked obj(s): 1
Student: If I were more disciplined, I'd probably wake up earlier and make the most of my mornings.
Charlotte: Got it.
  → marked obj(s): 2
Student: Have you considered becoming more disciplined in your routine?
Charlotte: Tried, failed, tried again. It's a work in progress! Mood across, intact.
  → marked obj(s): 3
```

### ✓ A04 — Lest, So be it — **100%** (3/3, 3 turns)

```
Charlotte: Be that as it may, learning a language in your forties is no joke. What's your take?
Student: Come what may, I'm determined to master English and enjoy those novels!
Charlotte: That's the spirit! Novels are the long game. What's the friction you face in your journey?
  → marked obj(s): 2
Student: I wish I had more time to practice, but I'm making the most of every opportunity!
Charlotte: Suffice it to say, the grammar still surprises me weekly. It can be tricky!
  → marked obj(s): 1
Student: How do you keep your grammar skills sharp?
Charlotte: Reading aloud, writing badly, asking dumb questions. Essay drafted in old idiom. What about you?
  → marked obj(s): 3
```

### ✓ A05 — Mixed subjunctive — **100%** (3/3, 3 turns)

```
Charlotte: A senior colleague keeps missing deadlines. What would you propose, and how would you handle it personally?
Student: I would suggest that we address the issue directly and propose setting clearer expectations for deadlines.
Charlotte: That's a solid approach! Structural first — what about the conversation itself?
  → marked obj(s): 1
Student: If I were in your position, I would have a candid conversation to understand her challenges better.
Charlotte: Cool.
  → marked obj(s): 2
Student: How would you open the conversation to set a positive tone?
Charlotte: I'd say: 'Help me understand what's getting in the way.' Mood matched to moment.
  → marked obj(s): 3
```

## M05 — Impersonal passive (It is said that...), double passive (He is said to be...), causative have/get, passive with reporting verbs

### ~ A01 — It is said that — **67%** (2/3, 4 turns)

```
Charlotte: It is reported that AI will reshape half of all jobs within a decade. What's your read?
Student: It is thought that many workers will need to adapt to new roles rather than lose their jobs entirely.
Charlotte: That's a crucial point! It cannot be denied that adaptation will vary significantly among different sectors. Any thoughts on which industries might struggle more?
  → marked obj(s): 1
Student: It is widely believed that industries like manufacturing and retail may face the greatest challenges in adapting to these changes.
Charlotte: Sure!
  → marked obj(s): 2
Student: It has been suggested that education and healthcare could also experience significant disruptions.
Charlotte: Sounds good.
Student: It is often argued that the outlook in teaching will require innovative approaches to engage students effectively.
Charlotte: It is widely thought that good teaching becomes more valuable, not less. Hedged, honestly.
```

### ~ A02 — He is said to be — **67%** (2/3, 4 turns)

```
Charlotte: The CEO of that startup is said to be in talks with three buyers. What else have you heard?
Student: Two of the cofounders are thought to be against the sale.
Charlotte: Internal friction makes deals collapse. Any rumors about past actions?
  → marked obj(s): 2, 1
Student: Any names of the potential buyers yet?
Charlotte: An early investor is reported to have already exited his position. Smart timing or bad sign — depends who you ask.
Student: It seems that some insiders are suggesting that the buyer list could change soon.
Charlotte: Cool.
Student: I wonder if any other investors might be looking to get involved.
Charlotte: Got it.
  → stuck 3 turns, aborting
```

### ✓ A03 — Have something done — **100%** (3/3, 3 turns)

```
Charlotte: I just had my bike serviced — saved me a hundred euros. What have you outsourced lately?
Student: I had my garden landscaped last month, and it turned out great!
Charlotte: That's awesome! Some things are definitely worth the investment. What else do you need to have done soon?
  → marked obj(s): 1
Student: I need to have my passport renewed before my upcoming trip.
Charlotte: Nice.
  → marked obj(s): 2
Student: Was the service worth it, or do you think I should consider other options?
Charlotte: Saved the chain, the gears, my sanity. Logistics, sorted.
  → marked obj(s): 3
```

### ✓ A04 — Get yourself done — **100%** (3/3, 5 turns)

```
Charlotte: Last month I had my passport lost by an airline. Worst part: they offered a coupon. What's your recent disaster?
Student: I had my package marked as delivered when it never arrived, so I can relate to your frustration!
Charlotte: The phantom delivery — modern classic. Have you had any other recent mishaps?
  → marked obj(s): 2
Student: I also had my laptop sent for repair but it came back with more issues than before!
Charlotte: Sounds like a real headache! And no compensation, I assume?
Student: Exactly, they didn't offer any compensation, which only added to my frustration!
Charlotte: Nice.
Student: It's been one of those months, hasn't it?
Charlotte: Cool.
  → marked obj(s): 1
Student: How did you sort the passport situation in the end?
Charlotte: Three weeks, four calls, one consulate. Minor agonies, mutual.
  → marked obj(s): 3
```

### ✓ A05 — Mixed passive register — **100%** (3/3, 3 turns)

```
Charlotte: It is widely reported that one of our competitors is about to be acquired. What's your view?
Student: It is believed that their CFO has already met with several interested parties.
Charlotte: Sounds good.
  → marked obj(s): 1
Student: I'm having our legal team assess our position in case we need to respond swiftly.
Charlotte: Prudent. Worst case scenario?
  → marked obj(s): 2
Student: What do you think it means for us if the acquisition goes through?
Charlotte: Pressure on price, opportunity on talent. Passive layered, situation tracked.
  → marked obj(s): 3
```

## M06 — Participle clauses — present (-ing), past (-ed), perfect (Having + past participle), perfect passive (Having been + past participle), with-clauses

### ✗ A01 — Walking down the street — **33%** (1/3, 4 turns)

```
Charlotte: Walking past my old school last week, I felt fifteen all over again. What did your last walk make you feel?
Student: Strolling through the park yesterday, I was reminded of carefree summer days from my childhood.
Charlotte: Nostalgia can be so powerful. Crossing the street, I noticed how much everything has changed since then.
  → marked obj(s): 1
Student: Sitting on a bench, I couldn't help but smile at the memories that flooded back.
Charlotte: Isn't it amazing how a simple moment can bring back so much? What made you smile the most?
Student: Watching children play, I was filled with joy, remembering my own adventures in the sun.
Charlotte: Cool.
Student: Listening to their laughter, I felt a warmth in my heart, as if those days were still alive.
Charlotte: Those moments truly have a way of making us feel connected to our past. What do you miss the most from those carefree days?
  → stuck 3 turns, aborting
```

### ~ A02 — Built in 1900 — **67%** (2/3, 5 turns)

```
Charlotte: Founded by a former monk, the little bookshop on my street has been there for forty years. Tell me about a place near you.
Student: Constructed in the 1920s, my favorite café has the charm that modern places often lack.
Charlotte: There's something special about old cafés, isn't there? They hold stories of countless conversations and laughter. What do you enjoy most about yours?
  → marked obj(s): 1
Student: Filled with vintage decor, my café's atmosphere makes every visit feel like stepping back in time.
Charlotte: That sounds delightful! Vintage decor really adds character and warmth to a place. Do you have a favorite memory from there?
  → marked obj(s): 2
Student: Remembering the time I spent there with friends, we laughed for hours over steaming cups of coffee.
Charlotte: Those shared moments create lasting bonds. Do you often meet friends there?
Student: Meeting friends there regularly, we always enjoy discussing our lives and sharing updates.
Charlotte: It's great to have a place for those meaningful conversations. Do you think the café has changed over time?
Student: Considering the changes in management, I wonder if the original owner still works there.
Charlotte: The original owner retired a few years ago, but the new management keeps the same cozy vibe. It's nice to see how places can evolve while preserving their essence.
  → stuck 3 turns, aborting
```

### ~ A03 — Having finished — **67%** (2/3, 7 turns)

```
Charlotte: Having taught for fifteen years, I finally feel I'm starting to understand my students. What's something experience clarified for you?
Student: Having worked in various teams, I’ve learned the importance of clear communication.
Charlotte: That’s a vital lesson! Having said that, what specific challenges did you face in team communication?
Student: Having navigated different personalities, I often struggled with misunderstandings and misinterpretations.
Charlotte: That sounds challenging! Having said that, how did you manage those misunderstandings over time?
Student: Having reflected on those experiences, I developed strategies to encourage open dialogue and feedback.
Charlotte: That's a fantastic approach! Having said that, what specific strategies worked best for you?
  → marked obj(s): 1
Student: Having implemented regular check-ins, I found that clarifying expectations greatly reduced confusion.
Charlotte: Great strategy! Having said that, what do you think is the next step in improving team communication?
  → marked obj(s): 2
Student: Having learned from my experiences, I believe fostering a culture of trust will be the next crucial step.
Charlotte: Nice.
Student: Having observed my students, I've realized that they often teach me new perspectives on collaboration.
Charlotte: That's a beautiful insight! Having said that, what specific perspectives have surprised you the most?
Student: Having listened to their ideas, I've been surprised by their creative approaches to problem-solving.
Charlotte: That's wonderful! Having said that, how do you incorporate their ideas into your teaching?
  → stuck 3 turns, aborting
```

### ✗ A04 — Having been told — **33%** (1/3, 4 turns)

```
Charlotte: Having been mentored by one careful teacher in my twenties, I still hear her edits when I write. Who shaped you most?
Student: Having been inspired by my grandfather's stories, I cherish the art of storytelling deeply.
Charlotte: Storytelling is a beautiful legacy. It's amazing how our loved ones shape our passions and values.
  → marked obj(s): 1
Student: Having been encouraged by my friends, I now share my own stories with confidence.
Charlotte: Nice.
Student: Having been motivated by their support, I strive to inspire others through my writing.
Charlotte: Got it.
Student: Having been enriched by diverse experiences, I find new perspectives in every story I tell.
Charlotte: That's a wonderful outlook! Each experience adds depth to our narratives. What did your mentor edit out from your stories?
  → stuck 3 turns, aborting
```

### ✓ A05 — Reduced relatives + with-clauses — **100%** (3/3, 3 turns)

```
Charlotte: The café, packed with morning regulars and warmed by the smell of fresh bread, was where I made the call. Where did you make a big call recently?
Student: The library, filled with the sound of turning pages and the scent of old books, is where I finally decided to apply for that internship.
Charlotte: Such a great atmosphere for making important decisions! With excitement bubbling inside me, I remember how eager I was to start my new path.
  → marked obj(s): 1
Student: With my heart racing, I realized that this opportunity could change everything for me.
Charlotte: Nice.
  → marked obj(s): 2
Student: Who did you speak to about the internship?
Charlotte: I spoke to the internship coordinator. She provided all the details and encouraged me to apply. Scenes compressed, edges intact.
  → marked obj(s): 3
```

## M07 — Advanced reporting verbs (apologise for, accuse of, suggest doing, admit + ing), reported emotions, hedged reports, "according to + X"

### ✓ A01 — Apologise for, accuse of — **100%** (3/3, 5 turns)

```
Charlotte: My colleague accused me of leaking the meeting notes. What would you have done?
Student: I would have assured her that I had not shared anything, then requested clarification on her accusations.
Charlotte: That's a solid approach! Clarifying accusations is vital. What else do you think could have contributed to that tension?
Student: I would have suggested discussing any misunderstandings openly, then proposed finding a solution together.
Charlotte: That's a great way to foster collaboration! I'd blame the lack of clear communication for situations like this.
  → marked obj(s): 2
Student: I would have acknowledged her point, then emphasized the importance of setting clear expectations.
Charlotte: Sure!
Student: I would have mentioned that regular check-ins could help prevent such issues in the future.
Charlotte: Sounds good.
  → marked obj(s): 1
Student: What did you actually do to address the communication issues in your team?
Charlotte: I asked who else had access to the notes and let the question answer itself. Patterns hold the line.
  → marked obj(s): 3
```

### ✓ A02 — Admit, deny, suggest — **100%** (3/3, 5 turns)

```
Charlotte: I have to admit dreading Mondays for the first time in years. What's something you'd admit?
Student: I have to admit feeling overwhelmed by my to-do list sometimes.
Charlotte: Totally get that! I'd suggest breaking it down into smaller tasks to make it more manageable. What do you think?
  → marked obj(s): 1
Student: I'd agree that breaking it down could really help; I might try that approach this week.
Charlotte: Cool.
Student: I’d suggest setting specific deadlines for each task to stay on track.
Charlotte: Nice.
Student: I'd recommend rewarding yourself after completing each task to stay motivated.
Charlotte: Cool.
  → marked obj(s): 2
Student: What changed about Mondays for you?
Charlotte: A meeting got rescheduled, and the whole week now starts late. Admissions, in pattern.
  → marked obj(s): 3
```

### ✓ A03 — Promise, refuse, offer — **100%** (3/3, 3 turns)

```
Charlotte: My doctor offered to refer me to a specialist, and I refused to make the appointment for two weeks. Classic me. What have you promised or refused lately?
Student: I promised to start exercising regularly, and so far, I've managed to stick to it.
Charlotte: That's fantastic! Keeping promises to ourselves is so important. Did you refuse something recently?
  → marked obj(s): 1
Student: I refused to attend that late-night event, and it allowed me to relax at home instead.
Charlotte: Nice.
  → marked obj(s): 2
Student: Charlotte, why did you delay making the appointment with the specialist?
Charlotte: The diagnostic uncertainty. Avoidance, basically. Commitments, with patterns held.
  → marked obj(s): 3
```

### ✗ A04 — Warn against, talk into — **33%** (1/3, 4 turns)

```
Charlotte: My grandmother talked me into studying abroad — best decision I never planned. Who shaped a big call of yours?
Student: My mentor encouraged me to pursue a career in marketing, which I initially doubted.
Charlotte: That's great! Having someone believe in you can make a huge difference. Did anyone ever warn you against something important in your journey?
Student: Yes, a colleague advised me not to rush into a job offer that seemed too good to be true.
Charlotte: Sure!
  → marked obj(s): 2
Student: My friend cautioned me about taking on too many responsibilities at once, which I didn't heed at first.
Charlotte: First-month wisdom is gold. Did you ever think about studying abroad?
Student: Actually, my parents suggested I consider it, but I was hesitant at the time.
Charlotte: It's understandable to feel hesitant about big changes. I ended up studying in Edinburgh. Cold, beautiful, life-changing. Influence reported, correctly framed.
```

### ~ A05 — According to, allegedly — **67%** (2/3, 3 turns)

```
Charlotte: Apparently, the company is restructuring next month. Have you heard anything more?
Student: According to a colleague, three teams are being merged.
Charlotte: Mergers always look cleaner on paper. What else have you heard about the changes?
  → marked obj(s): 2, 1
Student: I overheard someone mention that there might be layoffs as well.
Charlotte: Reportedly, leadership wants the announcement done before Friday. That would align with the restructuring timeline.
Student: I wondered where you heard that information about the announcement.
Charlotte: A friend in HR. Allegedly. News traded, hedges preserved.
```

## M08 — Modal hedging, softening for delicate communication, vague language, distancing devices, polite disagreement

### ✓ A01 — I was wondering if — **100%** (3/3, 3 turns)

```
Charlotte: You wanted to talk. What's on your mind?
Student: I was wondering if you could provide some feedback on my proposal before Friday.
Charlotte: I have time tomorrow afternoon. What specifically would you like me to focus on?
  → marked obj(s): 1
Student: I was hoping for your view on which sections to prioritise.
Charlotte: Send me the latest draft this evening, and I'll take a look.
  → marked obj(s): 2
Student: Thank you for taking the time to help me with this.
Charlotte: Of course! I'm glad to assist. What else is on your mind?
  → marked obj(s): 3
```

### ✓ A02 — It might be worth — **100%** (3/3, 2 turns)

```
Charlotte: I drafted a one-page project summary. Anything you'd tweak?
Student: It might be worth clarifying the main goals of the project to ensure alignment.
Charlotte: Fair point! I can see how that might help. Anything else come to mind?
  → marked obj(s): 1
Student: Have you considered adding a single metric of success to measure progress?
Charlotte: I hadn't thought of it. Good catch! Overall, the structure works well — these are great suggestions.
  → marked obj(s): 2, 3
```

### ✓ A03 — With respect, I'd see it differently — **100%** (3/3, 3 turns)

```
Charlotte: Remote work has run its course. People are more productive in offices. Don't you think?
Student: With respect, the evidence on productivity in remote work hasn't really supported that view.
Charlotte: It depends on the study, though. Some do indicate higher productivity in offices. What do you think?
  → marked obj(s): 1
Student: I see your point about studies, but many recent ones suggest that remote work can also enhance productivity in different ways.
Charlotte: Fair — I'm working from instinct, not data. What specific studies are you referring to that highlight this enhancement in productivity?
  → marked obj(s): 2
Student: What’s making you think that instinct is a more reliable measure than data in this case?
Charlotte: My own loneliness probably plays a role. It's tough to gauge productivity without personal experience. Argument held, civility preserved.
  → marked obj(s): 3
```

### ✓ A04 — One might say, In a sense — **100%** (3/3, 3 turns)

```
Charlotte: It could be argued that working less actually makes us more productive. Your read?
Student: In a sense, it seems that quality of work may outweigh the quantity of hours spent.
Charlotte: Absolutely! Quality can lead to better outcomes, especially in creative fields. How do you see this playing out in different work environments?
  → marked obj(s): 2
Student: In a way, I believe that in collaborative environments, focused teamwork can significantly enhance overall productivity.
Charlotte: Arguably, the four-day workweek could yield better results in such environments, yet it might not suit every industry. What are your thoughts?
  → marked obj(s): 1
Student: I would contend that while a four-day workweek has its merits, its effectiveness largely depends on the specific demands of each industry.
Charlotte: Got it.
  → marked obj(s): 4
```

### ✓ A05 — Sort of, more or less — **100%** (3/3, 2 turns)

```
Charlotte: How many meetings did you have this week? Roughly?
Student: I had around ten, more or less, depending on a couple that were rescheduled.
Charlotte: Cancellations can really shake things up, can't they? How are you feeling after all those meetings?
  → marked obj(s): 1, 3
Student: I'm feeling a bit drained, but I'm also quite satisfied with what we've accomplished.
Charlotte: The week-end mood par excellence! More or less, did everything go as planned for you this week?
  → marked obj(s): 2
```

## M09 — High-frequency idioms, body/animal/food idioms, dead vs live metaphor, similes, idioms by register

### ✓ A01 — Hit the nail on the head — **100%** (3/3, 3 turns)

```
Charlotte: Our retention numbers slipped last quarter. The CEO thinks it's compensation, but I'm not so sure.
Student: Compensation might just be the tip of the iceberg — I suspect there are deeper issues at play.
Charlotte: That's a harder pill for the CEO to swallow. What else do you think is going on?
  → marked obj(s): 1
Student: The elephant in the room is that people feel their concerns aren't being heard by leadership.
Charlotte: Sure!
  → marked obj(s): 2
Student: What does your gut say we should do about it?
Charlotte: Same as yours, honestly. Diagnosis, idiomatically grounded. 😊 What do you think our next steps should be?
  → marked obj(s): 3
```

### ✓ A02 — Bite the bullet, cold feet — **100%** (3/3, 3 turns)

```
Charlotte: I bit the bullet last year and told my parents I wasn't going back into medicine. Have you ever had to deliver hard news?
Student: I had to bite the bullet too when I informed my team that I was leaving my position.
Charlotte: That's a tough one! Did you have any hesitation before telling them?
  → marked obj(s): 1
Student: I'd had cold feet about it for weeks — I was worried about how they'd react.
Charlotte: Nice.
  → marked obj(s): 2
Student: How did your team take it when you broke the news?
Charlotte: They were shocked at first, then supportive. It was a mix of emotions, but they understood my decision. Hard moments, idiomatically held.
  → marked obj(s): 3
```

### ~ A03 — Piece of cake, spill the beans — **67%** (2/3, 4 turns)

```
Charlotte: Someone leaked the salary bands to the whole company on Friday. Chaos all weekend.
Student: Whoever leaked that information must have known it would create such a stir.
Charlotte: Friday afternoon — never an accident. It really stirred the pot!
  → marked obj(s): 2
Student: It seems like they really knew how to throw a wrench into things!
Charlotte: Exactly! Containing it will be no piece of cake — once the numbers are out, you can't un-leak them.
Student: It's clear that whoever is behind this must have had a hidden agenda all along.
Charlotte: We're already past the 'is it true' phase. Now we need to see how HR will handle the fallout.
Student: It’s going to be a tough road ahead, but I hope they can navigate through the storm effectively.
Charlotte: Town hall Monday, calls on Tuesday, that's the way the cookie crumbles. Crisis chat, food-idiomatic.
  → marked obj(s): 1
```

### ✗ A04 — Two birds with one stone — **33%** (1/3, 4 turns)

```
Charlotte: I've sent over the full brief. Where do we go from here?
Student: Now the ball is in my team's court — we'll discuss and get back to you with our thoughts by the end of the week.
Charlotte: Perfect cadence! Is there anything we can combine to streamline our efforts?
  → marked obj(s): 2
Student: Absolutely, we could align our timelines to ensure we're on the same page moving forward.
Charlotte: I love that! It keeps everyone in sync. Is there a way we can kill two birds with one stone during this process?
Student: Definitely! We could schedule a joint meeting to address both the brief and our timelines at once.
Charlotte: Cool.
Student: That sounds like a plan — let's make it happen!
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

### ✗ A05 — Crystal clear, low-hanging fruit — **33%** (1/3, 4 turns)

```
Charlotte: Leaving the corporate job felt like the end of the world at the time. In retrospect, blessing in disguise. Have you had a moment like that?
Student: Absolutely, losing my job pushed me to pursue my passion for writing, which I had been putting off for years.
Charlotte: That's a powerful transformation! Sometimes, the universe nudges us towards our true path. Did you find it challenging to make that leap?
  → marked obj(s): 1
Student: Definitely, stepping out of my comfort zone was daunting, but necessity became the mother of invention.
Charlotte: Exactly! It's amazing how that pressure can spark creativity. Independence is a double-edged sword, though, isn't it? Full freedom, but also the weight of decision-making.
Student: Absolutely, with great freedom comes great responsibility — it’s a balancing act for sure!
Charlotte: Got it.
Student: It's like walking a tightrope; one misstep can lead to uncertainty, but the view from the top is worth it!
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

## M10 — Advanced discourse markers — nuance (in fact, as a matter of fact), concession (that said, mind you), reformulation (in other words, put differently), topic shifts (incidentally, by the way), emphatic chains (what's more, not least, above all)

### ~ A01 — In fact, as a matter of fact — **67%** (2/3, 4 turns)

```
Charlotte: People keep saying remote work has killed productivity. Your read?
Student: Actually, many studies indicate that productivity has either increased or remained stable, rather than declining.
Charlotte: That’s a solid point! And what about the counter-narrative?
  → marked obj(s): 1
Student: In fact, the narrative about productivity loss often overlooks the impact of the pandemic itself on work dynamics.
Charlotte: Cool.
  → marked obj(s): 2
Student: That said, it's essential to acknowledge that different industries may experience varying effects.
Charlotte: Absolutely, the context really matters! Who's saying that remote work is detrimental?
Student: Interestingly, some traditionalists in management circles are often the ones voicing concerns about remote work's impact.
Charlotte: Assumption properly nuanced.
```

### ~ A02 — That said, mind you — **67%** (2/3, 5 turns)

```
Charlotte: AI is going to make most knowledge work obsolete in a decade. Hard truth.
Student: There's something to that. That said, 'most' might be a bit too sweeping in this context.
Charlotte: Fair pushback. What survives, in your opinion?
  → marked obj(s): 2
Student: On the one hand, creative roles may adapt; on the other hand, routine tasks could be at risk.
Charlotte: Then again, every major shift looked total in advance and partial in retrospect. Historical humility is useful here.
  → marked obj(s): 4
Student: Having said that, we should also consider the potential for new roles to emerge alongside these changes.
Charlotte: Sounds good.
Student: That being said, it’s crucial to stay adaptable in this evolving landscape.
Charlotte: Sure!
Student: In light of that, continuous learning will be key to thrive in the future job market.
Charlotte: Cool.
  → stuck 3 turns, aborting
```

### ✓ A03 — In other words, put differently — **100%** (3/3, 3 turns)

```
Charlotte: We're optimising for asymmetric upside in a thin market with low capital intensity. Make sense?
Student: In other words, you're aiming for significant gains in a niche market while keeping costs low.
Charlotte: That's it, in twelve fewer syllables!
  → marked obj(s): 1
Student: To put it simply, we're looking for high rewards with minimal investment.
Charlotte: Exactly!
  → marked obj(s): 2
Student: Have I got it right?
Charlotte: Better than my own pitch deck does. Jargon decoded, plainly.
  → marked obj(s): 3
```

### ✓ A04 — Above all, what's more — **100%** (3/3, 3 turns)

```
Charlotte: You chose to stay in your current job instead of taking a fancier offer. Why?
Student: The work itself still excites me; moreover, I feel valued here, which is hard to find elsewhere.
Charlotte: Rare. What else?
  → marked obj(s): 1
Student: Not to mention, the relationships I've built with my colleagues are invaluable and hard to replace.
Charlotte: And the real reason?
  → marked obj(s): 2
Student: Above all, the fancier offer was more about prestige than actual fulfillment, and I’ve learned that’s not enough to sway me.
Charlotte: The hardest learning to act on. Defended, with proper climax.
  → marked obj(s): 3
```

### ✓ A05 — All things considered, hence — **100%** (3/3, 5 turns)

```
Charlotte: How would you sum up the year, on balance?
Student: On balance, it was a challenging year, but I learned a lot from my experiences.
Charlotte: Meaning and growth often come hand in hand. What challenges stood out to you this year?
  → marked obj(s): 1
Student: Granted, I faced several obstacles, yet each one taught me valuable lessons about resilience and adaptability.
Charlotte: Nice.
  → marked obj(s): 2
Student: That said, I believe those challenges ultimately shaped my perspective for the better.
Charlotte: Cool.
Student: In any case, I'm looking forward to applying what I've learned in the coming year.
Charlotte: Sure!
Student: How would you sum up your year?
Charlotte: All things considered, a year of small good moves and one big honest conversation. Year, summed properly.
  → marked obj(s): 3
```

## M11 — Word connotation (positive/negative/neutral), formal vs informal register, euphemism, loaded language, litotes and hyperbole, code-switching

### ✗ A01 — Assertive or pushy? — **33%** (1/3, 4 turns)

```
Charlotte: My new director is — I don't know — really direct? Maybe too direct. I can't decide if I admire it or it's exhausting.
Student: If you admire it, she's likely more assertive than aggressive — straightforward without making you feel attacked.
Charlotte: There IS room in her directness, mostly. It feels like she's trying to be clear, but sometimes it crosses a line.
  → marked obj(s): 1
Student: If it's crossing a line, it might be that her clarity is overshadowing empathy — a balance is crucial.
Charlotte: That's exactly the line. It can feel pushy when there's no room to breathe in a conversation.
Student: If it feels pushy, the challenge might be finding a way to communicate that without seeming confrontational.
Charlotte: Cool.
Student: If it's challenging, perhaps framing your feedback as a personal preference could soften the impact.
Charlotte: Cool.
  → stuck 3 turns, aborting
```

### ~ A02 — Commence, ascertain, demonstrate — **67%** (2/3, 5 turns)

```
Charlotte: I wrote: 'We're going to kick off the new programme and look into the feedback we got.' That feels too casual for the audience. Fix?
Student: Try: "We will commence the new programme and examine the feedback we received.
Charlotte: Better. Can it go further?
  → marked obj(s): 1
Student: If you want it even more formal, you could say: "We shall initiate the new programme and ascertain the substance of the feedback we have received.
Charlotte: Cool.
  → marked obj(s): 2
Student: Alternatively, you might consider: "We are poised to launch the new programme and thoroughly evaluate the feedback provided.
Charlotte: Cool.
Student: Additionally, you could say: "We are prepared to embark on the new programme and meticulously assess the feedback obtained.
Charlotte: Sounds good.
Student: Furthermore, you could express: "We are set to unveil the new programme and rigorously analyze the feedback gathered.
Charlotte: Nice.
  → stuck 3 turns, aborting
```

### ✓ A03 — Pass away, between jobs — **100%** (3/3, 4 turns)

```
Charlotte: An old friend's father passed away last week. I'm not sure what to write in the card.
Student: Keep it simple — "I'm really sorry for your loss; I'm here for you.
Charlotte: That's a heartfelt opener. What would you suggest for the rest of the message?
  → marked obj(s): 1
Student: If you want to mention specifics, something like: "I know he meant the world to you, and you'll be in my thoughts as you navigate this.
Charlotte: That's a beautiful sentiment. Without overpromising, what could I say to keep it respectful yet supportive?
  → marked obj(s): 2
Student: You might say, "Please don't hesitate to reach out if you need someone to talk to.
Charlotte: Got it.
Student: How close are you to her?
Charlotte: Close enough that silence would hurt, distant enough that I shouldn't write a novel. Card drafted, weight respected.
  → marked obj(s): 3
```

### ✗ A04 — Not bad, no small feat — **33%** (1/3, 4 turns)

```
Charlotte: Saw a film last night — let's say it wasn't a complete waste of two hours. How was your week?
Student: Not without its challenges — managed to juggle a couple of projects, and only one nearly drove me crazy!
Charlotte: A commendable balance, indeed. What projects were you juggling?
  → marked obj(s): 1
Student: I was working on a marketing campaign and redesigning our website, both of which kept me on my toes!
Charlotte: Sounds like quite the undertaking. Finishing the redesign in a week was no small feat — and I wouldn't say no to a quiet weekend now.
Student: Absolutely, a relaxing weekend sounds perfect after such a hectic week!
Charlotte: Nice.
Student: I couldn't agree more; a little downtime is just what I need to recharge!
Charlotte: Indeed, downtime is rather essential. I recently watched a film that was a rather peculiar experience — care to know more?
  → stuck 3 turns, aborting
```

### ✓ A05 — Code-switching — **100%** (3/3, 3 turns)

```
Charlotte: (As your manager) I understand you have concerns about the timeline. Walk me through them.
Student: I appreciate your understanding, but my main concern is that we haven't conducted a full regression cycle, which could jeopardize the quality of the launch.
Charlotte: (Now your peer) Off the record — same question, plain English.
  → marked obj(s): 1
Student: Honestly? We're still not ready; the tests keep failing, and I told the boss we need more time.
Charlotte: (Now your closest friend) And what's underneath all that?
  → marked obj(s): 2
Student: I'm not sleeping; every time I close my eyes, I see the bug list haunting me.
Charlotte: Three audiences, three Englishes, one truth underneath. Register, fully fluent. C1 block closed.
  → marked obj(s): 3
```

### ~ A06 — UK vs US + Falsos cognatos cross-link — **67%** (2/3, 5 turns)

```
Charlotte: If you're writing to an American client, you should use 'elevator', 'apartment', 'vacation'. But for British clients, switch to 'lift', 'flat', 'holiday'. Which version do you default to?
Student: I typically default to American English since my schoolbooks used that, but I've become more flexible after collaborating with British colleagues.
Charlotte: Sensible choice! And which false cognates from Portuguese still trip you up?
  → marked obj(s): 1
Student: Honestly, 'actually' still confuses me — in Portuguese, 'atualmente' means 'currently', but in English, it means 'in fact'.
Charlotte: Cool.
  → marked obj(s): 2
Student: I can relate; false cognates can be quite tricky, can't they?
Charlotte: Cool.
Student: Absolutely! They often lead to misunderstandings, don't you think?
Charlotte: Nice.
Student: Indeed, navigating those nuances requires constant attention, doesn't it?
Charlotte: Got it.
  → stuck 3 turns, aborting
```

## M12 — Academic register — nominalisation, impersonal voice, hedged claims, citation patterns, paragraph cohesion

### ✓ A01 — Nominalisation — **100%** (3/3, 5 turns)

```
Charlotte: I've drafted: 'Companies are spending more on cybersecurity every year.' For a research paper — too plain. Help me lift it?
Student: Try: "The upward trend in corporate cybersecurity expenditure has intensified annually.
Charlotte: Much better! Anything else you think we could enhance?
  → marked obj(s): 1
Student: If you want to add depth, you could say: "This increase is driven in part by the emergence of new threat vectors and a shift towards remote work.
Charlotte: Sure!
  → marked obj(s): 2
Student: Moreover, it is crucial to note that these investments reflect a growing awareness of cybersecurity risks among businesses.
Charlotte: Nice.
Student: Furthermore, the paper underscores that these expenditures are essential for safeguarding sensitive information and maintaining consumer trust.
Charlotte: Sounds good.
Student: What does the paper actually claim about the effectiveness of these cybersecurity investments?
Charlotte: The paper argues that spending grows faster than effectiveness—efficiency, not budget, is the bottleneck. Opener academically pitched.
  → marked obj(s): 3
```

### ✓ A02 — Impersonal voice — **100%** (3/3, 5 turns)

```
Charlotte: Here's my draft: 'I've noticed that students seem to do better when they get feedback within 24 hours. I think this is because the connection between work and response is fresh.' For a paper — too subjective. Fix?
Student: Try: "The data suggest that students perform measurably better when feedback is delivered within 24 hours, as the connection between their work and the response remains fresh.
Charlotte: And what about the explanation for this observation?
  → marked obj(s): 1
Student: And: "A plausible explanation is that the temporal proximity between task and response enhances the cognitive link between effort and outcome.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Additionally, it would be beneficial to reference studies that support this claim to strengthen your argument.
Charlotte: Cool.
Student: Moreover, consider discussing the implications of these findings for educational practices.
Charlotte: Sounds good.
Student: Finally, how strong is the evidence — is this based on empirical studies or classroom observations?
Charlotte: The findings are based on two small studies and over a decade of teaching experience. This provides a solid foundation for the conclusions drawn in the paragraph.
  → marked obj(s): 3
```

### ✓ A03 — Hedged claims — **100%** (3/3, 5 turns)

```
Charlotte: I wrote: 'Our findings prove that remote workers are more productive than office workers.' For a journal — too strong. Help me dial it back?
Student: Try: "Our findings suggest that, within the sample studied, remote workers demonstrated higher productivity than office workers.
Charlotte: Much safer! Now, can you add a limitation?
  → marked obj(s): 1
Student: And: "It should be noted that the effect was modest and may not generalise to roles requiring extensive in-person collaboration.
Charlotte: Cool.
  → marked obj(s): 2
Student: Additionally, further research is needed to explore the long-term effects of remote work on productivity.
Charlotte: Cool.
Student: Moreover, it would be beneficial to consider the impact of individual differences on productivity outcomes.
Charlotte: Got it.
Student: Finally, how significant was the effect size in your analysis?
Charlotte: About 4% on objective measures, more on self-report. Claim accurate, hedge fitting.
  → marked obj(s): 3
```

### ✓ A04 — Citation patterns — **100%** (3/3, 3 turns)

```
Charlotte: Smith said in 2020 that early feedback matters. I'm writing about it for my paper. How do I phrase that?
Student: Try: "Smith (2020) emphasizes that early feedback is crucial for improving performance.
Charlotte: And how do I link it to my own work?
  → marked obj(s): 1
Student: Then: "Building on Smith's (2020) emphasis, my research explores the impact of early feedback on long-term performance outcomes.
Charlotte: Sure!
  → marked obj(s): 2
Student: What other sources are you weaving in to strengthen your argument?
Charlotte: Three more papers, all narrower than Smith's. Literature review, properly framed. Did you find any additional sources for your own work?
  → marked obj(s): 3
```

### ~ A05 — Paragraph cohesion — **67%** (2/3, 5 turns)

```
Charlotte: My first paragraph ends: 'The intervention reduced anxiety by 23%.' How do I open the next paragraph to keep flow?
Student: Try: "While this reduction in anxiety is noteworthy, it is essential to explore its implications further.
Charlotte: Great transition! Now, if you want to discuss contrasting results, how would you phrase it?
  → marked obj(s): 1
Student: By contrast, the results for depressive symptoms revealed only a slight improvement during the same timeframe.
Charlotte: Sure!
  → marked obj(s): 2
Student: To further elaborate, it is crucial to examine the potential reasons behind these contrasting outcomes.
Charlotte: Cool.
Student: In light of these findings, one might consider the broader context of mental health interventions.
Charlotte: Cool.
Student: Moreover, it would be beneficial to investigate the long-term effects of such interventions on overall well-being.
Charlotte: Got it.
  → stuck 3 turns, aborting
```

## M13 — Building argument (claim/warrant/evidence), anticipating counterargument, rhetorical devices (anaphora, antithesis, tricolon), persuasive structure, strong conclusions

### ~ A01 — Building the case — **67%** (2/3, 3 turns)

```
Charlotte: We're considering a four-day workweek. Build the case for trying it.
Student: The argument for implementing a four-day workweek hinges on the substantial evidence linking reduced hours to increased productivity and employee well-being.
Charlotte: Three reasons?
  → marked obj(s): 1
Student: First, studies from various countries have shown that a shorter workweek leads to higher productivity; second, it enhances employee satisfaction and retention; and third, it fosters better work-life balance, which ultimately benefits the organization.
Charlotte: That last point is crucial—better work-life balance really drives engagement. What do you think is the loudest objection in your team?
  → marked obj(s): 2
Student: The loudest objection in my team is the concern about meeting deadlines with reduced hours.
Charlotte: That's a valid concern. However, addressing it through careful planning and prioritization can mitigate the risks. Argument constructed, climax delivered.
```

### ~ A02 — Anticipating counterargument — **67%** (2/3, 5 turns)

```
Charlotte: You're proposing remote-first hiring. But isn't that just outsourcing in disguise?
Student: While it's easy to conflate the two, remote-first hiring fundamentally focuses on accessing a global talent pool, rather than merely cutting costs.
Charlotte: Talent access is doing a lot of work in that sentence. What does it mean for companies and their hiring strategies?
  → marked obj(s): 1
Student: The critical question is whether companies are prepared to embrace diverse perspectives that come from a truly global workforce.
Charlotte: Absolutely, embracing diversity can drive innovation and creativity. But what challenges do you think companies face in integrating that diversity effectively?
  → marked obj(s): 2
Student: The next push for companies lies in developing inclusive practices that ensure every voice is heard and valued.
Charlotte: That's crucial! But how can companies measure the effectiveness of these inclusive practices?
Student: One effective way to measure this is through regular employee feedback surveys that gauge perceptions of inclusivity and belonging.
Charlotte: While surveys are helpful, some may object that they can create a false sense of security if not followed by genuine action. How can companies ensure they act on the feedback received?
Student: Companies must commit to transparent action plans that address feedback, demonstrating accountability and fostering trust within the workforce.
Charlotte: That's a strong point! However, the deeper question is whether companies are truly willing to invest the resources needed to implement these plans effectively. What do you think?
  → stuck 3 turns, aborting
```

### ✓ A03 — Anaphora, antithesis, tricolon — **100%** (3/3, 3 turns)

```
Charlotte: I'm opening a conference on disability rights tomorrow. Help me draft an opener that lands.
Student: Try: "We are here because rights are not granted, they are demanded.
Charlotte: That's a powerful start! What goes in the middle to connect those thoughts?
  → marked obj(s): 1
Student: Then consider adding: "Accessibility is not charity — it is justice taking the form of a ramp, a captioned line, an opened door.
Charlotte: That sentence is the keeper! Now, how do you want to close this?
  → marked obj(s): 2
Student: Close with: "Today we listen, tomorrow we organise, every day after that we demand.
Charlotte: Opener drafted, rhetorically structured.
  → marked obj(s): 3
```

### ✓ A04 — Cause-and-effect chains — **100%** (3/3, 3 turns)

```
Charlotte: Why has consumer trust in news dropped so sharply?
Student: The rise of sensationalism, driven by ad revenue, has undoubtedly eroded consumer trust in news outlets.
Charlotte: That's a solid point! So, what do you think came next from that erosion of trust?
Student: The decline in trust has led many consumers to seek alternative news sources, often prioritizing personal beliefs over factual reporting.
Charlotte: That shift to alternative sources can create echo chambers, which in turn reinforces misinformation and further polarizes public opinion. What do you think that means for future discourse?
Student: It is precisely for this reason that fostering media literacy is crucial to counteract the effects of echo chambers and promote informed discourse.
Charlotte: Absolutely! Media literacy can help individuals critically evaluate information, which is essential in today's complex information landscape. Causal chain, fully landed.
  → marked obj(s): 1, 2, 3
```

### ✓ A05 — Strong conclusions — **100%** (3/3, 3 turns)

```
Charlotte: The speech is on civic participation. How would you close it?
Student: What truly matters is not just our participation, but whether we genuinely believe our voices can shape the future.
Charlotte: That really reframes the discussion! Now, what do you think is the choice before us?
  → marked obj(s): 1
Student: The choice before us is evident: to engage actively in shaping our society or to remain passive observers of the changes around us.
Charlotte: That's a strong statement! Now, how would you like to conclude with a call to action?
  → marked obj(s): 2
Student: If we choose to stay silent, we risk allowing others to dictate our future; let’s make our voices heard and fill the spaces left vacant.
Charlotte: The room you leave empty will be filled. That's the line they'll quote. Speech closed, persuasion complete.
  → marked obj(s): 3
```

## M14 — Metaphor and extended metaphor, simile patterns, personification, imagery, sentence rhythm and fragments, showing over telling

### ✓ A01 — Metaphor and simile — **100%** (3/3, 2 turns)

```
Charlotte: Take 'attention is the new oil'. Run it for three sentences — extend it without restating.
Student: In a world where distractions abound, capturing focus has become as valuable as a precious resource, and just like oil, it fuels our desires and ambitions, driving innovation and connection.
Charlotte: Now extend.
Student: As individuals and businesses alike vie for this scarce commodity, they must navigate a landscape filled with competing voices, each vying to carve out their own space in the collective consciousness.
Charlotte: And like every oil age before it, the toll on our well-being and the environment grows heavier, leaving scars that may be invisible but are deeply felt.
  → marked obj(s): 1, 2, 3
```

### ~ A02 — Personification — **67%** (2/3, 5 turns)

```
Charlotte: I wrote: 'The office was empty. The lights were on. The clock said 8 p.m.' Too flat. Animate it.
Student: The office buzzed with a lingering energy, the lights flickering like stars in a forgotten sky.
Charlotte: That's a wonderful start! Now, how about the clock? Can it come to life too?
  → marked obj(s): 1
Student: And the clock, a silent sentinel, ticked away the moments with a rhythmic insistence, as if urging time to hurry.
Charlotte: Cool.
  → marked obj(s): 2
Student: The shadows danced across the walls, weaving tales of the day that had just slipped away.
Charlotte: Cool.
Student: Outside, the wind howled softly, carrying whispers of secrets yet to be revealed.
Charlotte: Sure!
Student: In the corner, a forgotten chair creaked, as if sighing over the weight of unspoken thoughts.
Charlotte: Got it.
  → stuck 3 turns, aborting
```

### ~ A03 — Vivid verbs, specific nouns — **67%** (2/3, 6 turns)

```
Charlotte: I wrote: 'She went into the café and sat down. A man was there. He was looking at his phone.' Bring it to life.
Student: Try: 'She stepped into the café, the aroma of fresh coffee wrapping around her, and settled into a booth where a man sat, his eyes glued to his phone.
Charlotte: Now let's enhance the man. Describe him with more detail.
Student: Try: 'The man, with tousled dark hair and a worn leather jacket, tapped absently on his screen, oblivious to the world around him.
Charlotte: Sure!
  → marked obj(s): 2
Student: Try: 'His brow furrowed in concentration, the glow of the screen casting shadows across his chiseled features.
Charlotte: Nice.
  → marked obj(s): 1
Student: Try: 'He occasionally glanced up, his piercing blue eyes scanning the café, searching for something beyond the screen.
Charlotte: Got it.
Student: Try: 'As the door swung open, a gust of chilly air swept in, ruffling his jacket and momentarily breaking his focus.
Charlotte: Sounds good.
Student: Try: 'With a sigh, he returned his gaze to the screen, as if it held the answers to questions he hadn’t yet voiced.
Charlotte: Cool.
  → stuck 3 turns, aborting
```

### ✓ A04 — Sentence rhythm and fragments — **100%** (3/3, 4 turns)

```
Charlotte: I wrote: 'When my father died I was thirty-two and I didn't know what to do and the house felt strange and nothing made sense for a long time.' All one breath. Help me break it.
Student: Try: "When my father died, I was thirty-two; the house felt strange, not different, but watchful, like a room after a meeting ends.
Charlotte: That’s a beautiful revision! It flows well. Keep going with that rhythm.
  → marked obj(s): 1
Student: Then add: "I did not know what to do. Nothing made sense for a long time. That was the year I learned to live with not-knowing.
Charlotte: Nice.
  → marked obj(s): 2
Student: Perhaps I could say, "Time became a companion, both heavy and light, as I navigated the silence that followed.
Charlotte: Got it.
Student: Where does the paragraph go next, as I reflect on the shadows that lingered in the corners of my mind?
Charlotte: Into the first object I touched of his. His jacket, probably. Rhythm carries the grief.
  → marked obj(s): 3
```

### ✓ A05 — Show, don't tell — **100%** (3/3, 3 turns)

```
Charlotte: I wrote: 'She felt lonely in the new city. The apartment was empty. She missed her friends.' Three flat tells. Show them.
Student: Try: "The echo of her footsteps in the empty apartment reminded her of the laughter that once filled it.
Charlotte: That’s a beautiful start! Now, how about showing the emptiness of the apartment?
  → marked obj(s): 1
Student: Then: "The walls, bare and silent, seemed to hold onto the ghosts of conversations never had.
Charlotte: Great! Now let’s focus on her friends. How can you show her longing for them?
  → marked obj(s): 2
Student: She kept scrolling through old photos, each smile a bittersweet reminder of the warmth she craved.
Charlotte: Scene shown, not told. C2 literary craft set.
  → marked obj(s): 3
```

## M15 — High-C2 phrasal verbs — separable/inseparable distinctions, multiple meanings, low-frequency but native-natural verbs

### ✓ A01 — Bring about, bring round, come round — **100%** (3/3, 3 turns)

```
Charlotte: It took my company three years to accept remote work. How would you describe that process?
Student: What likely triggered that change was the increasing demand for flexibility — as employees pushed for it, the company had to adapt.
Charlotte: Absolutely! The need for flexibility often brings about significant shifts. It’s fascinating how employee demands can reshape company policies.
  → marked obj(s): 1
Student: Indeed, sometimes it takes losing key talent for leadership to realize the importance of adapting to those demands.
Charlotte: Exactly! Senior leadership came round slowly — they had to lose two key hires before the policy really moved. Loss can be a powerful motivator.
  → marked obj(s): 2
Student: Who was the last to come round to the idea of remote work?
Charlotte: The CFO. He brought about a 'compromise' that was just remote work in different language. It's funny how that works!
  → marked obj(s): 3
```

### ✓ A02 — Gloss over, crop up, single out — **100%** (3/3, 3 turns)

```
Charlotte: I read three different write-ups of the same story and got three different impressions. What does that tell you?
Student: It suggests that each version probably glossed over the angles inconvenient to its own audience.
Charlotte: That's the modern condition. Did you notice any patterns that cropped up in those stories?
  → marked obj(s): 1
Student: The same two facts probably cropped up in all three, but framed in completely different ways.
Charlotte: Got it.
  → marked obj(s): 2
Student: Was anyone singled out across all three?
Charlotte: One name — the regulator who wouldn't comment. The silence got singled out by everyone. Coverage parsed, phrasally.
  → marked obj(s): 3
```

### ✓ A03 — Live up to, fall through, iron out — **100%** (3/3, 3 turns)

```
Charlotte: Q2 was rough — two contracts collapsed and our product didn't perform like we promised. What would you have done?
Student: I would have suggested we reevaluate our strategy to ensure we meet our commitments moving forward.
Charlotte: That's a solid approach. Not living up to a public promise is the hardest thing to recover from — trust is the slowest thing to rebuild.
  → marked obj(s): 1
Student: Absolutely, it's crucial to iron out those issues and focus on delivering consistent results to regain that trust.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: How did you tide the team over financially during that tough period?
Charlotte: A short bridge from existing investors. Nothing dramatic — just enough to give us six months of quiet. Quarter survived, phrasally.
  → marked obj(s): 6
```

### ✓ A04 — Talk down to, wear down, shake off — **100%** (3/3, 4 turns)

```
Charlotte: I worked with someone for five years who talked down to everyone but never noticed. I tried to address it — and got nowhere.
Student: It's frustrating when people are oblivious to how their words affect others.
Charlotte: Absolutely! It creates a toxic atmosphere. People who talk down to others rarely see it because their behaviour goes unchecked.
Student: It's a shame that silence often makes them think their condescension is acceptable.
Charlotte: Yes, it's a vicious cycle. That kind of behaviour wears you down over time without you realizing it. It’s exhausting.
  → marked obj(s): 1
Student: Five years of that kind of behaviour can really take a toll on your mental health — the small daily costs add up.
Charlotte: Exactly! It took me a while to notice how much lighter I felt after leaving. The change was refreshing.
  → marked obj(s): 2
Student: Have you shaken off that weight now that you're free from it?
Charlotte: Mostly. The instinct to brace for the next correction took the longest to lose. Hard relationships, phrasally named.
  → marked obj(s): 3
```

### ✓ A05 — Stem from, amount to, water down — **100%** (3/3, 3 turns)

```
Charlotte: The product team keeps missing its targets. The pattern is too consistent to be bad luck. What's your hypothesis?
Student: My hypothesis is that it stems from a lack of clear communication regarding the targets.
Charlotte: That makes sense. Clear communication is key for alignment. What do you think the current process amounts to in terms of performance?
  → marked obj(s): 1
Student: The current process amounts to a recipe for disappointment: unrealistic targets are set, and then everyone wonders why they can't be met.
Charlotte: Nice.
  → marked obj(s): 2
Student: Where would you intervene first to improve this situation?
Charlotte: I’d start with the target-setting meeting. It’s crucial to establish realistic goals based on team input. Diagnosis, phrasally precise.
  → marked obj(s): 3
```

## M16 — Prefixes (un-, dis-, mis-, pre-, over-, under-, re-), suffixes (-tion, -ment, -ness, -ity, -able, -ise), compounds (closed/hyphenated/open), conversion (noun ↔ verb), nuanced word families

### ✓ A01 — Negation prefixes — **100%** (3/3, 3 turns)

```
Charlotte: My old colleague is really unresponsible with deadlines. Drove me mad.
Student: Small correction — it's 'irresponsible' with 'ir-' before the 'r' of 'responsible'.
Charlotte: Right. I always second-guess that one. It's frustrating when people are so unprofessional with their commitments!
  → marked obj(s): 1
Student: And his approach to commitments was unprofessional — missed deadlines and vague responses were becoming a trend.
Charlotte: Sure!
  → marked obj(s): 2
Student: Did he ever change his ways, or was it always the same?
Charlotte: Only after losing a major account. By then, it was too late. Vocabulary calibrated.
  → marked obj(s): 3
```

### ✓ A02 — Suffixes for nouns — **100%** (3/3, 4 turns)

```
Charlotte: I wrote: 'The team decided to expand, and they performed better. We grew faster than competitors.' For a board report — too active. Help me nominalise?
Student: Try: "The team's decision to expand resulted in enhanced performance and accelerated growth compared to competitors.
Charlotte: Sure!
  → marked obj(s): 1, 2
Student: Consider: "The decision to expand led to improved performance and faster growth relative to competitors.
Charlotte: Sounds good.
Student: You might also say: "The expansion decision facilitated superior performance and rapid growth in comparison to competitors.
Charlotte: Sounds good.
Student: Don't forget to clarify who the audience is — internal board or shareholders?
Charlotte: The audience is shareholders. It's for a quarterly letter. Verbs to nouns, register lifted.
  → marked obj(s): 3
```

### ✓ A03 — Suffixes for adjectives and verbs — **100%** (3/3, 3 turns)

```
Charlotte: I want to say someone 'can be relied on' — is the word 'relyable'?
Student: Close — it's 'reliable'. The 'y' in 'rely' becomes 'i' before '-able'.
Charlotte: I always second-guess that. It's tricky!
  → marked obj(s): 1
Student: I understand; just remember the same pattern applies to words like 'predict' and 'apply' too!
Charlotte: The rule is consistent, then. I appreciate your help with this!
  → marked obj(s): 2
Student: Who are you describing as reliable?
Charlotte: An old project manager. Quietly heroic. Spellings, finally trusted.
  → marked obj(s): 3
```

### ✓ A04 — Compounds — **100%** (3/3, 4 turns)

```
Charlotte: I wrote: 'My state of the art smartphone helps me check work mail in the post office.' Anything to fix?
Student: Almost — 'state-of-the-art' should be hyphenated before a noun: 'My state-of-the-art smartphone helps me check work mail in the post office.
Charlotte: Ah — position-dependent. The others?
  → marked obj(s): 1
Student: The phrase 'work mail' is a bit informal; consider 'work emails' for clarity.
Charlotte: Fair point! How about the compounds like 'smartphone' and 'post office'?
Student: Smartphone' is correctly closed, and 'post office' is correctly open — those two were already right.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Anything else you're unsure about?
Charlotte: 'Half-hour' vs 'half hour' — I never know which. (It's 'half-hour' when before a noun, 'half an hour' as a standalone.) Spacing audit, complete.
  → marked obj(s): 3
```

### ✗ A05 — Conversion — **33%** (1/3, 4 turns)

```
Charlotte: I told my daughter I would send her a text message later. She laughed at me.
Student: She probably found it funny because natives usually just say, "I'll text you.
Charlotte: Exactly! I'm starting to see how the language has evolved. I suppose I could say, 'I'll email you' too?
  → marked obj(s): 2
Student: Yes, but keep in mind that "I'll email you" sounds a bit formal; many just say, "I'll shoot you an email.
Charlotte: Absolutely! Same goes for 'send her an email' → 'email her'. And 'do a Google search' → 'google it'. Conversion makes English faster!
Student: Exactly! It's fascinating how nouns can transform into verbs, streamlining communication.
Charlotte: Sounds good.
Student: Indeed, this evolution reflects how language adapts to our fast-paced lives!
Charlotte: Got it.
  → stuck 3 turns, aborting
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
Student: I think it is — the final approvals came in this morning.
Charlotte: Any blockers left?
  → marked obj(s): 1
Student: Though I'm afraid there's still one signature missing from the executive sponsor — we may slip by a day.
Charlotte: Nice.
  → marked obj(s): 2
Student: Will you be at the kickoff?
Charlotte: I hope so — depends on whether the sponsor finally signs. Substitutes carry the conversation.
  → marked obj(s): 3
```

### ✓ A03 — One, ones, that of — **100%** (3/3, 4 turns)

```
Charlotte: These two jackets are basically identical. Which one would you go for?
Student: Honestly, I’d choose the grey one — it complements your style more.
Charlotte: I appreciate that! The grey one does have a nice vibe. What do you think of the navy one?
Student: Honestly, I’d take the navy one — the cut sits better at the shoulders.
Charlotte: I keep looking at the navy too. It just feels right! What do you think about the other one?
  → marked obj(s): 1
Student: The other one looks like it was made for someone slightly taller — the proportions are off.
Charlotte: Sure!
  → marked obj(s): 2
Student: Which one do you keep coming back to?
Charlotte: The navy. The decision was made before I walked in. Substitution flows like English flows.
  → marked obj(s): 3
```

### ✗ A04 — Do so / do it / do that — **0%** (0/3, 3 turns)

```
Charlotte: I made the switch to a four-day workweek last year. Several colleagues followed. Tell me about a change you made.
Student: I reduced my screen time significantly last summer, and my friend did the same shortly after — we both felt more energized.
Charlotte: I love when lifestyle changes create positive effects! It's amazing how a small shift can ripple out. Have you noticed any other changes since then?
Student: I started exercising regularly, and my friend joined me — we motivate each other to stay on track.
Charlotte: That's fantastic! It's great when friends do so together. Do you think other people might join you both soon?
Student: I hope so; we're always encouraging others to give it a try!
Charlotte: Cool.
  → stuck 3 turns, aborting
```

### ✓ A05 — So do I, neither do I — **100%** (3/3, 3 turns)

```
Charlotte: I never check email before coffee.
Student: Neither do I — I need my coffee first!
Charlotte: Coffee plus newspaper. Sacred.
  → marked obj(s): 1
Student: I completely agree — nothing beats that morning ritual!
Charlotte: I always read for twenty minutes before bed — and so do I, even when the day was a wreck.
  → marked obj(s): 2
Student: What else do you protect in your daily routine?
Charlotte: Saturday mornings — no calls, no errands, just slow. So do you, I bet. Habits matched, echoes tuned.
  → marked obj(s): 3
```

## M18 — Reference chains, lexical cohesion (synonyms, hyponyms, repetition), old-information-first principle, bridging implicit links, avoiding ambiguous referents

### ✗ A01 — This, that as reference — **0%** (0/3, 3 turns)

```
Charlotte: I wrote: 'We had three problems last quarter. Costs were up. Revenue was flat. Morale dipped. We need to address them.' Feels jumpy. Help?
Student: Consider rephrasing it as: "The three challenges we faced last quarter—rising costs, stagnant revenue, and declining morale—require our immediate attention.
Charlotte: Great revision! You could say: "These three challenges we faced last quarter—rising costs, stagnant revenue, and declining morale—require our immediate attention."
Student: You might also say: "These three challenges are interconnected and demand a strategic response from us.
Charlotte: That sounds solid! You could also wrap it up with: "This interconnectedness means that addressing one challenge without considering the others may lead to greater issues."
Student: You could further emphasize the point by saying, "Failing to recognize their interdependence could hinder our overall progress.
Charlotte: Nice.
  → stuck 3 turns, aborting
```

### ~ A02 — Lexical chains — **67%** (2/3, 5 turns)

```
Charlotte: I wrote: 'The CEO announced the merger. The CEO said it would close in March. The CEO refused questions. The CEO walked out.' Help me vary it.
Student: Try: "The CEO announced the merger, stating it would close in March, before refusing questions and walking out.
Charlotte: That's a great start! Can you add two more sentences to create a more cohesive narrative?
  → marked obj(s): 1
Student: Following the announcement, many analysts expressed their concerns about the implications, yet the CEO remained unyielding in her stance.
Charlotte: Excellent! Now try: 'She continued to defend her decision, while the executive team prepared for the upcoming changes.'
  → marked obj(s): 2
Student: Despite the mounting criticism, she remained steadfast, as the executive team braced for the inevitable adjustments ahead.
Charlotte: I forget how much pronouns help. They really create a smoother flow, don't they?
Student: Absolutely, using pronouns can significantly enhance the coherence of your writing!
Charlotte: I'm glad we agree! It makes a big difference, right? What do you think about varying sentence structures for even more impact?
Student: Indeed, varying sentence structures can add depth and keep the reader engaged, don't you think?
Charlotte: Absolutely! It creates a more dynamic reading experience, allowing ideas to shine through. How do you usually approach sentence variation in your writing?
  → stuck 3 turns, aborting
```

### ✓ A03 — The former, the latter, such — **100%** (3/3, 4 turns)

```
Charlotte: We're choosing between two strategies: aggressive expansion or careful consolidation. Which favours which moment?
Student: The former tends to favour markets where competitive position is still up for grabs and capital is patient.
Charlotte: Patient capital is the rarest condition. What about the latter?
  → marked obj(s): 1
Student: The latter tends to suit situations where the existing assets are robust, yet the operational framework is becoming increasingly complex.
Charlotte: Cool.
  → marked obj(s): 2
Student: In that case, it seems prudent to assess the current market dynamics before making a final decision.
Charlotte: Sure!
Student: Have you considered how external factors might influence your choice at this moment?
Charlotte: The second, almost certainly — the assets are healthier than the operating model. Former and latter, properly placed.
  → marked obj(s): 3
```

### ✓ A04 — Old information first — **100%** (3/3, 3 turns)

```
Charlotte: I wrote: 'Significant gains were produced by the new strategy. A complete restructuring of the sales team was required by these gains.' Awkward — help?
Student: Try: "The new strategy produced significant gains, necessitating a complete restructuring of the sales team.
Charlotte: Lighter already! Now, how about reordering the second sentence?
  → marked obj(s): 1
Student: You could say: "A complete restructuring of the sales team was necessitated by the significant gains produced by the new strategy.
Charlotte: Each sentence reaches forward instead of doubling back. Nice work!
  → marked obj(s): 2
Student: What made you choose to use passive voice initially?
Charlotte: I was trying to sound formal. Turns out formal isn't the same as passive. Flow reordered.
  → marked obj(s): 3
```

### ✓ A05 — Bridging and avoiding ambiguous referents — **100%** (3/3, 3 turns)

```
Charlotte: I wrote: 'The CEO met with the head of legal yesterday. She said the deal would close. They disagreed about the timeline. Now it's all in their hands.' Confusing — fix?
Student: Try: "The CEO met with the head of legal yesterday, stating that the deal would close, although they disagreed about the timeline, leaving it all in their hands.
Charlotte: That's clearer! Now every pronoun has a clear referent. Can you continue from there?
  → marked obj(s): 1
Student: The executive team must now evaluate the implications of their differing perspectives before making a final decision.
Charlotte: Got it.
  → marked obj(s): 2
Student: Was the ambiguity deliberate in their earlier discussions, or did it arise from miscommunication?
Charlotte: Honestly? I think I was avoiding naming the two of them directly. Cohesion sharpened, ambiguity dispelled.
  → marked obj(s): 6
```

## M19 — Fine shades of modal meaning — certainty (must/will/should/might/may), obligation vs inference, layered modals (might have to), quasi-modals (be supposed to / be bound to / be likely to), formal modals (ought to / shall / would)

### ✓ A01 — Must, will, should — three shades of certainty — **100%** (3/3, 3 turns)

```
Charlotte: My neighbour's lights have been on all night for three nights running. Strange — she's usually asleep by ten. Theories?
Student: She might be working on something important, or perhaps she’s entertaining guests.
Charlotte: Both are possible explanations! But if it's been three nights, something must have changed in her routine. What do you think could be the reason?
  → marked obj(s): 1
Student: It could be that she's dealing with a personal issue, and whatever it is, she must be feeling quite stressed.
Charlotte: That's a strong inference! I keep thinking of knocking but not sure I should. What do you think?
  → marked obj(s): 2
Student: Do you know her well enough to knock and check in on her?
Charlotte: Just enough that not knocking feels worse than knocking. Inferences, properly weighted.
  → marked obj(s): 3
```

### ✓ A02 — Might well, could well, may well — **100%** (3/3, 3 turns)

```
Charlotte: Three of our biggest competitors are quietly raising prices this month. What do you make of it?
Student: It could be a sign that they’re struggling to manage their own rising costs.
Charlotte: That makes sense! What does that mean for us in the short term?
  → marked obj(s): 2
Student: It might indicate that we should consider adjusting our pricing strategy as well.
Charlotte: Sounds good.
  → marked obj(s): 1
Student: Has your team modelled the potential impact of a price change yet?
Charlotte: Yes, we have two scenarios on the table — both with prices up by year-end. Probabilities, evenly hedged.
  → marked obj(s): 3
```

### ✓ A03 — Ought to, shall, would — **100%** (3/3, 3 turns)

```
Charlotte: Draft a clause for a service contract — what should the contractor be obliged to do?
Student: The contractor shall ensure compliance with all applicable laws and regulations during the performance of the services.
Charlotte: Excellent clause! Now, can you think of any implicit obligations that ought to be included?
  → marked obj(s): 1
Student: Beyond the explicit obligations, both parties ought to maintain regular communication regarding any potential issues that may arise during the project.
Charlotte: That's a valuable addition! I often wish for that kind of clarity. Looking back, how did your previous mentors approach contract discussions?
  → marked obj(s): 2
Student: My old mentor would always emphasize the importance of understanding each party's concerns — that insight often guided our negotiations.
Charlotte: I'm going to borrow that approach! Shall, ought, would — three eras of our conversation. What's next on your agenda?
  → marked obj(s): 3
```

### ✗ A04 — Be bound to, be likely to, be supposed to — **33%** (1/3, 4 turns)

```
Charlotte: The pilot launch was meant to start in March. Now I'm not sure it'll happen before June. Your read?
Student: If March is already in doubt, June seems to be the more realistic target.
Charlotte: I keep telling stakeholders March is still possible. Maybe I shouldn't.
  → marked obj(s): 2
Student: If you keep insisting on March, they might get their hopes up unnecessarily.
Charlotte: That's true. Once a date slips publicly, the next one is bound to be questioned — credibility is the hidden cost of these delays.
Student: If credibility is at stake, it might be wiser to set more achievable expectations.
Charlotte: Sounds good.
Student: If you present a more realistic timeline, they may appreciate your honesty in the long run.
Charlotte: Sure!
  → stuck 3 turns, aborting
```

### ✓ A05 — Modal layering — **100%** (3/3, 3 turns)

```
Charlotte: If the funding round closes below target, what changes?
Student: If we close below target, we may need to reconsider our budget allocations — challenging, yet manageable.
Charlotte: And if we close significantly below target, what then?
  → marked obj(s): 1
Student: If we close more than thirty percent below, we would have to revisit the entire two-year plan — at that point, the strategy isn't the same business.
Charlotte: Sure!
  → marked obj(s): 2
Student: Where's your line of acceptable for adjustments in that scenario?
Charlotte: About fifteen percent below. Below that, every scenario starts to look like a different company. Contingencies, modally layered. C2 modal subtlety, complete.
  → marked obj(s): 3
```

## M20 — Word stress, sentence stress (content vs function words), weak forms (schwa), connected speech (linking, intrusive sounds, assimilation, elision), contractions, intonation

### ✓ A01 — Word stress — **100%** (3/3, 3 turns)

```
Charlotte: I noticed today that 'comfortable' is one of the words I most often stress wrong. What's a word that catches you out?
Student: For me, it's 'advertisement' — I used to stress the second syllable, but now I see it's more common to stress the third: adVERtisement.
Charlotte: That's a great example! Stress shifts often happen in similar words, don't they?
  → marked obj(s): 1
Student: Absolutely, and the suffix matters too — 'adVERtisement' becomes 'adVERtising', shifting the stress again.
Charlotte: I'm only just starting to hear that pattern. It's fascinating how these shifts occur!
  → marked obj(s): 2
Student: Speaking of patterns, do natives still say all four syllables of 'comfortable'?
Charlotte: Mostly three — 'comf-tər-bəl'. The 'or' collapses almost entirely. Stress patterns, traded openly.
  → marked obj(s): 3
```

### ✓ A02 — Sentence stress and weak forms — **100%** (3/3, 4 turns)

```
Charlotte: Brazilian learners often give every syllable equal weight. What's helped you start to compress?
Student: What helped me most was listening to audiobooks while reading along, focusing on the rhythm and intonation.
Charlotte: That's a fantastic approach! Listening closely while following the text really helps with internalizing rhythm. Have you tried using contractions in your practice?
  → marked obj(s): 1
Student: Yes, I started using contractions intentionally — saying "I'm" instead of "I am" to feel more natural.
Charlotte: Got it.
  → marked obj(s): 2
Student: I've also been listening to podcasts; they really showcase natural speech patterns.
Charlotte: Sounds good.
Student: Which audio sources do you recommend most for improving fluency?
Charlotte: Anything conversational works great — try interviews or podcasts where people interrupt each other. Scripted speech compresses less. Rhythm, internalised slowly.
  → marked obj(s): 3
```

### ~ A03 — Connected speech — **67%** (2/3, 5 turns)

```
Charlotte: Textbooks teach 'Did you go?' I almost never hear it that way — natives say 'didja go?' What surprised you most?
Student: For me, it was 'gonna' and 'wanna' — I had been saying 'going to' and 'want to', but natives always used the shorter forms instead.
Charlotte: Two of the most common verbs in English, both contracted. Have you noticed any other phrases that change like this?
  → marked obj(s): 1
Student: Yeah, I've also heard 'gotta' instead of 'got to' — it makes conversations flow more naturally.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: I've noticed that natives often drop the 't' in words like 'want' and say 'wanna' instead, which really speeds up their speech!
Charlotte: Cool.
Student: I've also heard them say 'woulda' for 'would have' — it really makes casual conversations feel more relaxed!
Charlotte: Got it.
Student: Another one I find interesting is 'shoulda' for 'should have' — it definitely adds a casual vibe to the chat!
Charlotte: Sure!
  → stuck 3 turns, aborting
```

### ✓ A04 — Intonation — **100%** (3/3, 5 turns)

```
Charlotte: I've noticed that 'fine' said three different ways carries three different meanings. How do you say 'fine' when you mean it's genuinely fine?
Student: I would say 'fine' in a short, neutral tone, as if I'm simply stating a fact.
Charlotte: Exactly — flat data. How about when it's passive-aggressive?
  → marked obj(s): 2
Student: In that case, I would stretch it out, maybe add a slight emphasis, like "Fiiine.
Charlotte: Passive-aggressive 'fine' is longer, falling pitch, slightly clipped — it means 'this conversation is over and you've lost.'
Student: And when it's sarcastic, I would raise the pitch and draw it out even more, like "Fiiiine!
Charlotte: Nice.
Student: When it's genuine, it’s just a simple acknowledgment, like saying, "The weather is fine today.
Charlotte: Sounds good.
  → marked obj(s): 1
Student: What's the third meaning you noticed for 'fine'?
Charlotte: Reluctant 'fine' — long, drawn out, rising slightly at the end, almost a sigh. 'I'll do it, but I want you to notice the cost.' Intonation, the silent language.
  → marked obj(s): 3
```

### ✓ A05 — Contractions and elision — **100%** (3/3, 3 turns)

```
Charlotte: You been working late again?
Student: Yeah, I've been at it since six this morning — I really underestimated the workload.
Charlotte: Tale as old as time. We all do that sometimes!
  → marked obj(s): 1
Student: I know, right? I'm thinking of wrapping it up soon — wanna join me for a quick coffee?
Charlotte: Done. I'll meet you at the usual place! ☕️
  → marked obj(s): 2
Student: How's your day been aside from work?
Charlotte: Long-ish, but nothing's on fire. Just enjoying the little things today. Casual register, pronunciation aligned.
  → marked obj(s): 3
```

## M21 — Discourse fillers (you know, I mean, like), hedge markers (kind of, sort of, basically), tag questions (isn't it? right?), backchannels (mm-hm, right, gotcha), pragmatic openers (honestly, to be fair, no offence)

### ✓ A01 — Discourse fillers — **100%** (3/3, 5 turns)

```
Charlotte: I mean, the whole thing kind of fell apart in week three. You know how it is — one decision, three weeks later, total restart.
Student: Honestly, it’s always those little choices that end up making the biggest impact.
Charlotte: Exactly, it’s kind of wild how that works, right? Those early decisions can really set the tone for everything that follows.
Student: I’m not gonna lie, it’s like a domino effect — one falls, and suddenly everything changes.
Charlotte: Totally! It’s like, you think you’re fine, and then bam! Everything is different. What do you think is the key to making better choices early on?
Student: I mean, I think it’s all about being aware of the potential consequences before you commit.
Charlotte: Absolutely! That awareness can really shift the outcome. It's sort of like having a roadmap before setting out on a journey. What are your thoughts on how to develop that awareness?
  → marked obj(s): 1
Student: Well, it's kind of like practicing mindfulness — the more you reflect on your options, the clearer the path becomes.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: What was the one decision that did it for you in that situation?
Charlotte: Cutting the user research short to hit the kickoff date. Saved a week, cost six. Fillers carry register.
  → marked obj(s): 3
```

### ✓ A02 — Tag questions — **100%** (3/3, 3 turns)

```
Charlotte: The book club meets at six, doesn't it? I've forgotten if it was six or six-thirty.
Student: Six, I believe. But there were times we kicked off at six-thirty if the host was late, right?
Charlotte: We did, didn't we? Are you reading this month's book, too?
  → marked obj(s): 1
Student: I am, actually! You're referring to the one with the twist ending, aren't you?
Charlotte: Yes, that's the one! I'm only halfway through, and it's making me angry, which is probably the point, isn't it?
  → marked obj(s): 2
Student: Are you actually enjoying it, despite the frustration?
Charlotte: Not exactly enjoying. More like respecting against my will. You know how it goes, right? Tags, native rhythm.
  → marked obj(s): 3
```

### ✓ A03 — Backchannels — **100%** (3/3, 3 turns)

```
Charlotte: So I'm at the airport last week, and the gate agent decides I need to repack my bag — in front of everyone.
Student: Oh no. Right — and you'd already been waiting how long?
Charlotte: An hour and a half. So I'm not in the mood. And she goes, 'Open it now or you're not flying.'
  → marked obj(s): 1
Student: No way. She actually made you open it in front of everyone?
Charlotte: She had me unpack everything. Books, toiletries, the lot. People were watching, and I could feel their eyes on me. 😳
  → marked obj(s): 2
Student: Did you make the flight after all that?
Charlotte: Just barely! I was so stressed, but I finally got on the plane. Still annoyed about it, though!
  → marked obj(s): 3
```

### ✓ A04 — Pragmatic openers — **100%** (3/3, 3 turns)

```
Charlotte: One of my senior team members has been quietly disengaged for months. I don't know how to start the conversation.
Student: Honestly, the longer you wait, the harder it'll be — it might be better to address it sooner rather than later.
Charlotte: That's the part I keep ignoring. I feel stuck on how to approach this without making it awkward.
  → marked obj(s): 1
Student: Look, starting with something like, "I've noticed you've seemed a bit distant lately, and I want to understand what's going on," could really help break the ice.
Charlotte: Sure!
  → marked obj(s): 2
Student: What do you think is actually going on with them?
Charlotte: Either burnout or quiet quitting — I'm not sure which yet. Difficult conversation, openers in place.
  → marked obj(s): 3
```

### ✓ A05 — The thing is, here's the thing — **100%** (3/3, 3 turns)

```
Charlotte: The thing is, we keep hiring brilliant people and losing them within eighteen months. I'm starting to think the issue isn't the people.
Student: Here's the thing — maybe the problem lies in our company culture rather than the talent itself.
Charlotte: Absolutely! Right at the gap between the hiring pitch and the actual ceiling. It's troubling to see such a disconnect.
  → marked obj(s): 1
Student: I'll tell you what — that disconnect can really undermine morale and lead to a revolving door of talent.
Charlotte: That's a sobering reframe. It really makes you think about what changes need to be made.
  → marked obj(s): 2
Student: What's the pattern you keep seeing in the feedback from those who leave?
Charlotte: They all end up at the same three companies — places that promised exactly what we couldn't deliver. It's a real eye-opener.
  → marked obj(s): 3
```

## M22 — Integration of all C1/C2 skills — mixed conditionals + inversion + clefts + hedging + idioms + literary craft + register fluidity + native pronunciation + pragmatic moves

### ✓ A01 — Mixed-register narrative — **100%** (3/3, 3 turns)

```
Charlotte: Three weeks later, the reply came. What did you feel reading it?
Student: Opening the email, a sense of dread washed over me; it was the third paragraph that truly revealed their decision.
Charlotte: Body knew first, didn't it?
  → marked obj(s): 1
Student: What struck me was how my heart raced before I even processed the words on the screen.
Charlotte: The body keeps the better timeline. It's fascinating how emotions can lead before our minds catch up, isn't it?
  → marked obj(s): 2
Student: Absolutely, it’s as if our instincts are always a step ahead; what about you — what was the email that changed your year?
Charlotte: A 'no' that turned out to be a redirect. The kind that, looking back, was the right answer in disguise. Narrative continues, mastery intact.
  → marked obj(s): 3
```

### ✓ A02 — Argumentative essay opening — **100%** (3/3, 3 turns)

```
Charlotte: Topic: the case against measuring everything. Open an op-ed paragraph.
Student: Rarely has the obsession with metrics led to genuine insight, as it often obscures the very nuances that drive real understanding.
Charlotte: Sharp opener, SyntheticFelipe! Continue.
  → marked obj(s): 1
Student: It is often overlooked that an overreliance on numbers can stifle creativity and hinder innovative thinking.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Where does the op-ed go from here?
Charlotte: Into specific examples — consider the company that prioritized metrics over employee well-being, resulting in burnout, or the school that focused solely on test scores, neglecting holistic education. Op-ed opener, fully C2.
  → marked obj(s): 3
```

### ✓ A03 — Diplomatic conversation — **100%** (3/3, 3 turns)

```
Charlotte: I think we should let the underperforming team member go. Six months of warnings and no real change.
Student: I understand your perspective — six months is indeed a considerable timeframe, and it's evident that the situation isn't improving.
Charlotte: But?
  → marked obj(s): 1
Student: With respect, the question I would pose is whether the warnings provided were sufficiently clear to prompt meaningful action.
Charlotte: Fair point. I'm not actually sure how specific they were.
  → marked obj(s): 2
Student: What did the warnings actually specify in terms of expected improvements?
Charlotte: Honestly? They were vaguer than I'd like to admit. It seems we need to clarify expectations better in the future. Diplomatic register, sustained.
  → marked obj(s): 3
```

### ✗ A04 — Spontaneous casual speech — **0%** (0/3, 3 turns)

```
Charlotte: Hey, how've you been? Haven't seen you since the dinner thing.
Student: Yeah, I know — it's been ages, hasn't it? I've just been swamped with work lately.
Charlotte: Same here! Work's been a bit of a whirlwind for me too.
Student: I can only imagine how hectic it must be for you; it's like we're all caught in this endless cycle, isn't it?
Charlotte: Nice.
Student: Absolutely, it's as if we’re all juggling a million things at once, isn't it?
Charlotte: For sure! So, how's everything else going? Still doing the freelance thing, or did you land that full-time offer?
  → stuck 3 turns, aborting
```

### ✓ A05 — Full synthesis — **100%** (3/3, 3 turns)

```
Charlotte: (As your manager) Walk me through your assessment of the Q1 priorities.
Student: I'd categorize our Q1 priorities into three distinct areas: essential commitments, time-sensitive opportunities, and strategic investments we must not delay.
Charlotte: (Now your peer, over coffee) OK, real version — what's actually going on?
  → marked obj(s): 1
Student: Honestly? Between us, the essential commitments are the only ones that truly matter; the rest feel like a distraction from the real issues at hand.
Charlotte: (Now your closest friend, at dinner) And what's the part you can't say at work?
  → marked obj(s): 2
Student: Look, the truth is I'm exhausted from juggling these inherited problems while pretending they're my own priorities.
Charlotte: Three rooms, three voices, one person. Curriculum complete.
  → marked obj(s): 3
```

## M23 — Professional written English — formal emails, job applications, cover letters, follow-ups, workplace messaging

### ✓ A01 — Email openings & closings — **100%** (3/3, 3 turns)

```
Charlotte: I need to email the CEO of a partner company. We've never met. What should I open with?
Student: Definitely go formal — open with 'Dear [Mr./Ms. Surname]' followed by 'I hope this email finds you well'.
Charlotte: And how do I get to the point without sounding stiff?
  → marked obj(s): 1
Student: Then a clean transition: "I'm reaching out regarding our potential collaboration on..." Keep the body tight.
Charlotte: Right. What about the close?
  → marked obj(s): 2
Student: Close with 'Kind regards' followed by your full name and title; avoid 'Best' as it may come across as too casual for this initial contact.
Charlotte: Got it. Writing it now. Do you think I should add anything specific about the collaboration?
  → marked obj(s): 3
```

### ✓ A02 — Job applications — **100%** (3/3, 3 turns)

```
Charlotte: I read your draft. The opening is good. But the middle is too vague — what specifically have you done?
Student: I led a team of eight engineers to deliver a platform migration that reduced infrastructure costs by 40%.
Charlotte: That's the level of specificity that gets attention! Now, how can you tie that experience to their role?
  → marked obj(s): 1
Student: That experience aligns perfectly with the role's emphasis on optimizing operational efficiencies.
Charlotte: Perfect! Now, can you close it with a strong statement?
  → marked obj(s): 2
Student: I would welcome the opportunity to further discuss how my experience can drive success in your organization.
Charlotte: Now it reads like the candidate they want. Great job! What are you feeling most confident about in your application?
  → marked obj(s): 3
```

### ✓ A03 — Cover letters & CVs language — **100%** (3/3, 3 turns)

```
Charlotte: Your cover letter says you 'admire the company's innovative culture'. That's filler. Be specific — what about them?
Student: What truly excites me about NorthPath is your emphasis on collaboration and creativity in developing solutions.
Charlotte: That's a good start! Now, can you connect that to your work? What have you done that aligns with their approach to collaboration and creativity?
  → marked obj(s): 1
Student: In my current role, I've led a team project that fostered cross-departmental brainstorming sessions, resulting in two successful product launches.
Charlotte: That's impressive! Now, close it with your personal motivation. How does working at NorthPath connect to your own goals or values?
  → marked obj(s): 2
Student: Working at NorthPath would allow me to merge my passion for innovation with my commitment to collaborative problem-solving, ultimately driving impactful results.
Charlotte: Now you sound like you actually want the job — not just any job. What are you looking forward to the most in your job search?
  → marked obj(s): 3
```

### ✓ A04 — Follow-ups & check-ins — **100%** (3/3, 4 turns)

```
Charlotte: I emailed a potential client three weeks ago and never heard back. I don't want to seem pushy. Should I just give up?
Student: I suggest you send a gentle reminder; three weeks is a good time for a soft follow-up.
Charlotte: Great suggestion! How should I start the follow-up?
  → marked obj(s): 1
Student: You could start with, "I hope this message finds you well; I wanted to follow up on my previous email regarding...
Charlotte: That sounds good! Should I add a reason to re-engage them in the conversation?
Student: Absolutely! You might say something like, "I came across a case study that I believe could be of interest to you.
Charlotte: And how should I close the email?
  → marked obj(s): 2
Student: No rush on my end — just wanted to keep the conversation open.
Charlotte: Perfect! I'm ready to send it now. Thanks for your help! 😊
  → marked obj(s): 3
```

### ✓ A05 — Difficult emails — **100%** (3/3, 3 turns)

```
Charlotte: I need to tell a longtime client we can't take their new project. Two years of work, but the timing isn't right. I don't want to ruin the relationship.
Student: Thank you for trusting us with your projects over the years — we truly value our partnership, but unfortunately, we can't take on the new project at this time.
Charlotte: That's a great start! Now, how honest should I be about why we can't take it on?
  → marked obj(s): 1, 2
Student: While it's important to be transparent, you might consider sharing a brief reason that emphasizes the current workload without going into too much detail.
Charlotte: Good point! Something like, "We're currently at capacity through Q3" could work. How can I leave the door open for future opportunities without overpromising?
Student: I'd love to keep the conversation open for Q4 or beyond — when the timing aligns, we'd jump at the chance to work with you again.
Charlotte: OK, drafting it now. Thanks for the structure! I feel more confident about sending it. 😊 What are you working on today?
  → marked obj(s): 3
```

## M24 — High-frequency cultural idioms — expressions whose meaning is rooted in Anglo-Saxon culture and cannot be deduced from the words alone.

### ✓ A01 — Idiomas com partes do corpo — **100%** (3/3, 4 turns)

```
Charlotte: My aunt and uncle haven't spoken in five years. Family events are awkward.
Student: That sounds like a recipe for a really tense family gathering!
Charlotte: Absolutely! It's like a ticking time bomb waiting to go off. 😅
Student: Five years of giving each other the cold shoulder must make every Christmas dinner painful!
Charlotte: Tell me about it! Last year, my grandmother had to seat them on opposite ends of the table. What a mess!
  → marked obj(s): 1
Student: Someone needs to bite the bullet and play mediator before the next family event!
Charlotte: Exactly! Everyone keeps waiting for the other to make the first move, but neither will. It's so frustrating!
  → marked obj(s): 2
Student: Are either of them the kind to wear their heart on their sleeve, or do they both keep things bottled up?
Charlotte: Both are definitely bottled-up types. That's exactly the problem.
  → marked obj(s): 3
```

### ✓ A02 — Idiomas com animais — **100%** (3/3, 3 turns)

```
Charlotte: Our director just announced a re-org, but he kept skirting around what it actually means for headcount.
Student: It sounds like layoffs are the elephant in the room, and his avoidance is just making it more uncomfortable.
Charlotte: Exactly! Everyone knew. He just wouldn't say it. It feels like we're all dancing around the issue. 🐘
  → marked obj(s): 1
Student: It's only a matter of time before someone spills the beans about the layoffs.
Charlotte: You're right! Someone will accidentally let the cat out of the bag in a Slack channel before management makes it official — they always do. 🐱
  → marked obj(s): 2
Student: I wouldn't be surprised if they try to sugarcoat the news when it finally comes out.
Charlotte: Will they give the team warning before the cuts? When pigs fly — corporate transparency is a one-way street. 🐖
  → marked obj(s): 3
```

### ✓ A03 — Idiomas de tempo e raridade — **100%** (3/3, 3 turns)

```
Charlotte: It's already August. Where did this year go? I had so many plans for things that haven't happened.
Student: Time really does fly when you're not looking — it's like the months just slip away!
Charlotte: Exactly! And friendships can fade just as quickly. How often do you catch up with old friends?
  → marked obj(s): 1
Student: I only catch up with my old friends once in a blue moon, and I really miss those fun times we used to have.
Charlotte: Same here. We promise to catch up, but before we know it, six months pass by! It’s a bit of a rollercoaster, isn’t it?
  → marked obj(s): 2
Student: Absolutely! Sometimes the best moments happen out of the blue, like a surprise call from an old friend.
Charlotte: That's so true! Those unexpected connections remind us of the joy in life. Let's cherish those moments!
  → marked obj(s): 3
```

### ✓ A04 — Idiomas de decisão e ação — **100%** (3/3, 3 turns)

```
Charlotte: I've been trying to launch this side project for six months. Every time I get close, something breaks. I'm exhausted.
Student: Don't throw in the towel yet — sometimes the toughest climbs lead to the best views!
Charlotte: You're right! I keep telling myself one more push. But the breaks keep coming. It's so frustrating!
  → marked obj(s): 1
Student: Are you cutting corners somewhere you shouldn't? Sometimes those breaks signal that an earlier shortcut needs revisiting.
Charlotte: Probably. I rushed the architecture early on, thinking it would save time. Now I’m stuck!
  → marked obj(s): 2
Student: It sounds like a classic case of "haste makes waste" — maybe it's time to reassess that foundation!
Charlotte: You're right! The ball is in my court for the next steps. I could keep pushing, redesign one piece, or even pause for a bit. What do you think?
  → marked obj(s): 3
```

### ✓ A05 — Idiomas conversacionais — **100%** (3/3, 4 turns)

```
Charlotte: The board presentation went so much better than I expected. I was dreading it for weeks.
Student: Sounds like it turned out to be a walk in the park — funny how our worries can be so exaggerated!
Charlotte: Right? I have no idea why I worried. It was a piece of cake in the end!
  → marked obj(s): 1
Student: It's great to hear that; sometimes, we just need to take a leap of faith and trust ourselves!
Charlotte: Sure!
Student: How did you break the ice with the board? That first impression can really set the tone for the whole presentation!
Charlotte: I opened with a single chart and let it speak. No preamble, just straight to the point!
  → marked obj(s): 2
Student: That's a smart move; sometimes less is more, and it sounds like you really hit the nail on the head!
Charlotte: Thanks! Let me open it now and see what feedback I got. I'm eager to hear their thoughts!
  → marked obj(s): 3
```

---

## Summary

- ✓ 100%: **85** units
- ~ 67-99%: **24** units
- ✗ <67%: **12** units
- Total: 121 units

Average score: **86%**

### Failed units (sorted by score)

- **M17/A04** (0%) — Do so / do it / do that
- **M18/A01** (0%) — This, that as reference
- **M22/A04** (0%) — Spontaneous casual speech
- **M06/A01** (33%) — Walking down the street
- **M06/A04** (33%) — Having been told
- **M07/A04** (33%) — Warn against, talk into
- **M09/A04** (33%) — Two birds with one stone
- **M09/A05** (33%) — Crystal clear, low-hanging fruit
- **M11/A01** (33%) — Assertive or pushy?
- **M11/A04** (33%) — Not bad, no small feat
- **M16/A05** (33%) — Conversion
- **M19/A04** (33%) — Be bound to, be likely to, be supposed to

### Partial units

- **M01/A01** (67%) — Past condition, present result
- **M02/A01** (67%) — Never have I
- **M02/A04** (67%) — Only after, Little did I know
- **M02/A05** (67%) — Under no circumstances
- **M03/A04** (67%) — It wasn't until
- **M04/A01** (67%) — I suggest that he be
- **M04/A02** (67%) — It is essential that
- **M05/A01** (67%) — It is said that
- **M05/A02** (67%) — He is said to be
- **M06/A02** (67%) — Built in 1900
- **M06/A03** (67%) — Having finished
- **M07/A05** (67%) — According to, allegedly
- **M09/A03** (67%) — Piece of cake, spill the beans
- **M10/A01** (67%) — In fact, as a matter of fact
- **M10/A02** (67%) — That said, mind you
- **M11/A02** (67%) — Commence, ascertain, demonstrate
- **M11/A06** (67%) — UK vs US + Falsos cognatos cross-link
- **M12/A05** (67%) — Paragraph cohesion
- **M13/A01** (67%) — Building the case
- **M13/A02** (67%) — Anticipating counterargument
- **M14/A02** (67%) — Personification
- **M14/A03** (67%) — Vivid verbs, specific nouns
- **M18/A02** (67%) — Lexical chains
- **M20/A03** (67%) — Connected speech